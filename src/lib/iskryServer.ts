// ============================================================
// KARTA 41 · Iskry na serveri (migrácia 0034) — nahratie videa, zverejnenie, prúd, kvóta.
// Vzor ako uploadFoto / osobne.ts: bez DB alebo session vráti null a appka beží na mocku
// (iskry.ts drží Iskry v relácii). Zverejnenie ide LEN cez RPC iskra_zverejni — server
// overí, že video leží v Storage, a pri charite stráži mesačnú kvótu.
// ============================================================
import { supabase } from "./supabase";
import type { DruhIskry, Iskra } from "./iskry";

const BUCKET = "iskry";
/** strop súboru v buckete (Supabase free tier) — rovnaké číslo ako file_size_limit v 0034 */
export const ISKRA_MAX_MB = 50;
export const ISKRA_TYPY = ["video/mp4", "video/quicktime", "video/webm"];

/** riadok tabuľky iskra (0034) */
interface IskraRiadok {
  id: string; stranka: string | null; druh: number; autor: string; kto: string; ini: string; popis: string;
  video: string; plagat: string | null; zbierka: Iskra["zbierka"] | null; bez_darov: boolean;
  retaz_pct: number | null; len_stranka: boolean; iskry: number; zverejnene: string; autor_uid: string;
}

export interface KvotaIskier { tier: number; limit: number; pouzite: number; ostava: number; cenaNad: number }

const verejnaUrl = (cesta: string) => supabase!.storage.from(BUCKET).getPublicUrl(cesta).data.publicUrl;

export function naIskru(r: IskraRiadok): Iskra {
  return {
    id: r.id, druh: r.druh as DruhIskry, autor: r.autor, kto: r.kto, ini: r.ini, org: !!r.stranka, popis: r.popis,
    src: verejnaUrl(r.video), bg: r.plagat ? `url('${verejnaUrl(r.plagat)}') center/cover no-repeat #1D211B` : "#1D211B",
    zbierka: r.zbierka ?? undefined, iskry: r.iskry, bezDarov: r.bez_darov || undefined,
    retazPct: r.retaz_pct ?? undefined, lenStranka: r.len_stranka || undefined, zverejnene: r.zverejnene,
  };
}

async function uid(): Promise<string | null> {
  if (!supabase) return null;
  return (await supabase.auth.getSession()).data.session?.user?.id ?? null;
}

/** je kam ukladať? (živá DB + session, aj anonymná) */
export const serverIskier = async (): Promise<boolean> => (await uid()) !== null;

/** prvý snímok videa ako JPEG (plagát pre prúd a web stránku /i/{id}); pri chybe null */
export function plagatZVidea(url: string, sirka = 540): Promise<Blob | null> {
  return new Promise((ok) => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    const koniec = (b: Blob | null) => { v.removeAttribute("src"); v.load(); ok(b); };
    const t = window.setTimeout(() => koniec(null), 8000);
    v.onerror = () => { window.clearTimeout(t); koniec(null); };
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = () => {
      window.clearTimeout(t);
      const k = sirka / (v.videoWidth || sirka);
      const c = document.createElement("canvas");
      c.width = Math.round((v.videoWidth || sirka) * k); c.height = Math.round((v.videoHeight || sirka * 16 / 9) * k);
      const g = c.getContext("2d");
      if (!g) return koniec(null);
      g.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => koniec(b), "image/jpeg", 0.8);
    };
  });
}

export type ZverejnenieIskry = Omit<Iskra, "id" | "iskry" | "zverejnene" | "src" | "bg" | "org"> & { stranka: string | null; dlzkaS: number | null };

/**
 * Nahrá video (+ plagát) do Storage a zverejní Iskru. Vráti hotovú Iskru a či išla nad kvótu.
 * Bez DB/session vráti null (volajúci ostane na mocku). Chyby servera vyhodí ako Error s kódom
 * (video_chyba · nie_spravca · neprihlaseny · velke_video · zly_typ · upload).
 */
export async function zverejniIskruNaServeri(subor: File, d: ZverejnenieIskry): Promise<{ iskra: Iskra; nadKvotu: boolean } | null> {
  const ja = await uid();
  if (!supabase || !ja) return null;
  if (subor.size > ISKRA_MAX_MB * 1024 * 1024) throw new Error("velke_video");
  const typ = subor.type || "video/mp4";
  if (!ISKRA_TYPY.includes(typ)) throw new Error("zly_typ");

  const meno = crypto.randomUUID();
  const ext = typ === "video/quicktime" ? "mov" : typ === "video/webm" ? "webm" : "mp4";
  const video = `${ja}/${meno}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(video, subor, { contentType: typ, upsert: false });
  if (up.error) throw new Error("upload");

  let plagat: string | null = null;
  const url = URL.createObjectURL(subor);
  try {
    const b = await plagatZVidea(url);
    if (b) {
      const cesta = `${ja}/${meno}.jpg`;
      const r = await supabase.storage.from(BUCKET).upload(cesta, b, { contentType: "image/jpeg", upsert: false });
      if (!r.error) plagat = cesta;
    }
  } finally { URL.revokeObjectURL(url); }

  const { data, error } = await supabase.rpc("iskra_zverejni", { p: {
    video, plagat, dlzka_s: d.dlzkaS, stranka: d.stranka, druh: d.druh, autor: d.autor, kto: d.kto, ini: d.ini,
    popis: d.popis, zbierka: d.zbierka ?? null, bez_darov: !!d.bezDarov, retaz_pct: d.retazPct ?? null, len_stranka: !!d.lenStranka,
  } });
  if (error || !data) {
    // zverejnenie neprešlo → nahraté súbory nenechávaj v Storage
    await supabase.storage.from(BUCKET).remove(plagat ? [video, plagat] : [video]);
    throw new Error(/nie_spravca|video_chyba|neprihlaseny/.exec(error?.message ?? "")?.[0] ?? "server");
  }
  const r = data as IskraRiadok & { nad_kvotu: boolean };
  return { iskra: naIskru(r), nadKvotu: r.nad_kvotu };
}

/** prúd zo servera (najnovšie hore). Iskry „len na stránke" vidí v prúde len autor. Bez DB null. */
export async function nacitajIskryZoServera(limit = 60): Promise<Iskra[] | null> {
  if (!supabase) return null;
  const ja = await uid();
  const { data, error } = await supabase.from("iskra").select("*").is("zmazane", null)
    .order("zverejnene", { ascending: false }).limit(limit);
  if (error || !data) return null;
  return (data as IskraRiadok[]).filter((r) => !r.len_stranka || r.autor_uid === ja).map(naIskru);
}

/** mesačná kvóta stránky zo servera; bez DB/session alebo pri chybe null (appka použije lokálny odhad) */
export async function nacitajKvotuIskier(stranka: string): Promise<KvotaIskier | null> {
  if (!supabase || !(await uid())) return null;
  const { data, error } = await supabase.rpc("iskra_kvota", { p_stranka: stranka });
  if (error || !data) return null;
  const k = data as { tier: number; limit: number; pouzite: number; ostava: number; cena_nad: number };
  return { tier: k.tier, limit: k.limit, pouzite: k.pouzite, ostava: k.ostava, cenaNad: k.cena_nad };
}
