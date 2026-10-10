// ============================================================
// DEED · Upload fotiek do Supabase Storage (bucket `prispevky`, migrácia 0020).
// FotoVyber dáva data URL náhľady; pri VYTVORENÍ príspevku ich tu nahráme do
// Storage a vrátime verejné URL. Návrh je „nikdy nezablokuj tvorbu":
//   · bez DB / session / pri chybe → vráti vstup nezmenený (data URL ostane).
// Takže v mock režime je to passthrough (žiadna zmena správania).
// ============================================================
import { supabase } from "./supabase";

const BUCKET = "prispevky";

// data URL → Blob (bez fetch, funguje aj offline)
function dataUrlNaBlob(dataUrl: string): Blob | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return null;
  const mime = m[1];
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

function pripona(mime: string): string {
  return (mime.split("/")[1] || "jpg").replace("jpeg", "jpg").replace("svg+xml", "svg");
}

/**
 * Nahrá fotky (data URL) do Storage a vráti verejné URL. Vstupy, ktoré už sú
 * URL (nie data:), prejdú nezmenené. Bez DB/session/pri chybe → vráti pôvodné.
 */
export async function nahrajFotky(fotky: string[]): Promise<string[]> {
  if (!supabase || fotky.length === 0) return fotky;
  const { data: ses } = await supabase.auth.getSession();
  const uid = ses.session?.user?.id;
  if (!uid) return fotky; // bez session → nechaj data URL (owner sa nedá určiť)

  const out: string[] = [];
  for (const f of fotky) {
    if (!f.startsWith("data:")) { out.push(f); continue; } // už je to URL
    const blob = dataUrlNaBlob(f);
    if (!blob) { out.push(f); continue; }
    let nazov: string;
    try { nazov = `${uid}/${crypto.randomUUID()}.${pripona(blob.type)}`; }
    catch { nazov = `${uid}/${Date.now()}-${out.length}.${pripona(blob.type)}`; }
    const { error } = await supabase.storage.from(BUCKET).upload(nazov, blob, { contentType: blob.type, upsert: false });
    if (error) { out.push(f); continue; } // upload zlyhal → nechaj data URL (nezablokuj tvorbu)
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(nazov);
    out.push(data.publicUrl || f);
  }
  return out;
}

/**
 * Nahrá súbory (doklady/video) do Storage a vráti { nazov, url } pre každý.
 * Bez DB / session / pri chybe → vráti len názov súboru (url ostane prázdne),
 * takže mock režim funguje ako doteraz (nezablokuje tvorbu).
 *   `priecinok` = podpriečinok pod {uid}/ (napr. "doklady" / "video").
 */
export async function nahrajSubory(files: File[], priecinok = "doklady"): Promise<{ nazov: string; url?: string }[]> {
  const zoznam = Array.from(files);
  const uid = supabase ? (await supabase.auth.getSession()).data.session?.user?.id : undefined;
  if (!supabase || !uid) return zoznam.map((f) => ({ nazov: f.name })); // mock/bez session → len názov

  const out: { nazov: string; url?: string }[] = [];
  for (const f of zoznam) {
    const ext = (f.name.split(".").pop() || "bin").toLowerCase();
    let cesta: string;
    try { cesta = `${uid}/${priecinok}/${crypto.randomUUID()}.${ext}`; }
    catch { cesta = `${uid}/${priecinok}/${Date.now()}-${out.length}.${ext}`; }
    const { error } = await supabase.storage.from(BUCKET).upload(cesta, f, { contentType: f.type || undefined, upsert: false });
    if (error) { out.push({ nazov: f.name }); continue; } // upload zlyhal → aspoň názov
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(cesta);
    out.push({ nazov: f.name, url: data.publicUrl || undefined });
  }
  return out;
}

// ============================================================
// Zadanie 5 · 5.5 — fotky a plagáty nikdy ako data URL v jsonb (profil_stranky, oznam_charity,
// zbierka.nastavenie). Pred zápisom sa každé „data:…;base64," v objekte nahrá do Storage
// a nahradí verejnou URL. DB to stráži triggrom (0064) — data URL by zápis odmietla.
// Rovnaký obrázok sa nahrá raz (koncepty sa ukladajú každých 600 ms).
// ============================================================
const nahrane = new Map<string, string>();

async function nahrajJeden(dataUrl: string, uid: string, priecinok: string): Promise<string> {
  const hotove = nahrane.get(dataUrl);
  if (hotove) return hotove;
  const blob = dataUrlNaBlob(dataUrl);
  if (!blob) throw new Error("Fotku sa nepodarilo spracovať.");
  let nazov: string;
  try { nazov = `${uid}/${priecinok}/${crypto.randomUUID()}.${pripona(blob.type)}`; }
  catch { nazov = `${uid}/${priecinok}/${Date.now()}-${nahrane.size}.${pripona(blob.type)}`; }
  const { error } = await supabase!.storage.from(BUCKET).upload(nazov, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error("Fotku sa nepodarilo nahrať. Skúste to znova.");
  const url = supabase!.storage.from(BUCKET).getPublicUrl(nazov).data.publicUrl;
  nahrane.set(dataUrl, url);
  return url;
}

/** Vráti kópiu objektu, v ktorej sú všetky data URL nahradené URL zo Storage. Bez DB = nezmenené (ukážka). */
export async function bezDataUrl<T>(obj: T, priecinok: string): Promise<T> {
  if (!supabase || obj == null) return obj;
  const text = JSON.stringify(obj);
  if (!text.includes(";base64,")) return obj;
  const uid = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!uid) throw new Error("Fotky sa dajú uložiť len po prihlásení.");
  const prejdi = async (v: unknown): Promise<unknown> => {
    if (typeof v === "string") return /^data:[^;]+;base64,/.test(v) ? nahrajJeden(v, uid, priecinok) : v;
    if (Array.isArray(v)) return Promise.all(v.map(prejdi));
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = await prejdi(x);
      return out;
    }
    return v;
  };
  return (await prejdi(obj)) as T;
}

/** Jeden súbor (video / PDF) do Storage → verejná URL; bez DB / session / pri chybe null (volajúci si ho nechá lokálne). */
export async function nahrajSuborUrl(f: Blob, priecinok: string, ext: string): Promise<string | null> {
  if (!supabase) return null;
  const uid = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!uid) return null;
  let cesta: string;
  try { cesta = `${uid}/${priecinok}/${crypto.randomUUID()}.${ext}`; }
  catch { cesta = `${uid}/${priecinok}/${Date.now()}.${ext}`; }
  const { error } = await supabase.storage.from(BUCKET).upload(cesta, f, { contentType: f.type || undefined, upsert: false });
  if (error) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(cesta).data.publicUrl || null;
}

/** je to URL súboru zo Storage v danom priečinku (napr. „video", „prilohy")? */
export const jeVStorage = (src: string | undefined, priecinok: string) =>
  !!src && /\/storage\/v1\/object\/public\/prispevky\//.test(src) && src.includes(`/${priecinok}/`);
