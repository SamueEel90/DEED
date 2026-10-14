// ============================================================
// Bod 254 · Verejné fotky (fotobanka) — dáta pre okno Moje fotky / Verejné fotky.
//   vyberFotiek(kategoria?) → náš ručný výber (verejne_fotky_vyber, 0089b), ukazuje sa prvý, beží aj bez hľadania
//   hladajFotky(q, kategoria?, strana) → /api/fotky (Pexels → Pixabay → Unsplash → Openverse), len správca stránky
//   ulozFotku(f) → /api/fotky/uloz: server ju stiahne k nám (Unsplash nie) a vráti našu adresu + autora
// Pri fotke vždy ukázať autora (f.autor, odkaz f.odkazAutora) a zdroj.
// ============================================================
import { supabase } from "./supabase";

export type KategoriaFotiek = "kostol" | "priroda" | "ludia" | "deti" | "sviecky" | "svadba" | "jedlo" | "praca";
export const KATEGORIE_FOTIEK: [KategoriaFotiek, string][] = [
  ["kostol", "Kostol"], ["priroda", "Príroda"], ["ludia", "Ľudia"], ["deti", "Deti"],
  ["sviecky", "Sviečky a smútok"], ["svadba", "Svadba"], ["jedlo", "Jedlo"], ["praca", "Práca"],
];
export const ZDROJ_NAZOV: Record<string, string> = { pexels: "Pexels", pixabay: "Pixabay", unsplash: "Unsplash", openverse: "Openverse", cathopic: "Cathopic", vlastna: "DEED+" };

/** fotka v mriežke (z výberu alebo z hľadania) */
export interface VerejnaFotka {
  id: string; zdroj: string; maly: string; velky: string; sirka: number | null; vyska: number | null;
  autor: string | null; odkazAutora: string | null; licencia: string | null;
  /** true = z nášho výberu, už je u nás (ulozFotku netreba) */ nasa?: boolean;
}
/** uložená fotka — adresa, ktorú appka použije */
export interface UlozenaFotka { url: string; maly: string; sirka: number | null; vyska: number | null; autor: string | null; odkazAutora: string | null; licencia: string | null; zdroj: string }

async function token(): Promise<string | undefined> {
  return supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
}

export async function vyberFotiek(kategoria?: KategoriaFotiek): Promise<VerejnaFotka[]> {
  if (!supabase) return [];
  let q = supabase.from("verejne_fotky_vyber").select("id, kategoria, url, maly, sirka, vyska, autor, odkaz_autora, zdroj, licencia").order("poradie").limit(200);
  if (kategoria) q = q.eq("kategoria", kategoria);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r) => ({ id: `v${r.id}`, zdroj: r.zdroj, maly: r.maly ?? r.url, velky: r.url, sirka: r.sirka, vyska: r.vyska, autor: r.autor, odkazAutora: r.odkaz_autora, licencia: r.licencia, nasa: true }));
}

export class ChybaFotiek extends Error { constructor(public kod: string, sprava: string) { super(sprava); } }

export async function hladajFotky(q: string, kategoria?: KategoriaFotiek, strana = 1): Promise<VerejnaFotka[]> {
  const t = await token();
  if (!t) throw new ChybaFotiek("len_spravca", "Verejné fotky môže hľadať len prihlásený správca stránky.");
  const p = new URLSearchParams({ q: q.trim(), strana: String(strana), ...(kategoria ? { kategoria } : {}) });
  const r = await fetch(`/api/fotky?${p}`, { headers: { Authorization: `Bearer ${t}` } });
  const d = (await r.json().catch(() => ({}))) as { fotky?: VerejnaFotka[]; chyba?: string; sprava?: string };
  if (!r.ok) throw new ChybaFotiek(d.chyba ?? "chyba", d.sprava ?? "Hľadanie fotiek teraz nejde. Skúste neskôr.");
  return d.fotky ?? [];
}

export async function ulozFotku(f: VerejnaFotka): Promise<UlozenaFotka> {
  if (f.nasa) return { url: f.velky, maly: f.maly, sirka: f.sirka, vyska: f.vyska, autor: f.autor, odkazAutora: f.odkazAutora, licencia: f.licencia, zdroj: f.zdroj };
  const t = await token();
  if (!t) throw new ChybaFotiek("len_spravca", "Fotku môže uložiť len prihlásený správca stránky.");
  const r = await fetch("/api/fotky/uloz", { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ zdroj: f.zdroj, id: f.id }) });
  const d = (await r.json().catch(() => ({}))) as UlozenaFotka & { chyba?: string; sprava?: string };
  if (!r.ok) throw new ChybaFotiek(d.chyba ?? "chyba", d.sprava ?? "Fotku sa nepodarilo uložiť.");
  return d;
}
