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
