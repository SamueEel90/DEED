// ============================================================
// REŤAZ DOBRA (karta 14) — tvorca pošle z každého daru časť zbierke.
// Zbierky idú V RADE, nie naraz: beží vždy len jedna, ďalšia začne, až keď sa
// predošlá naplní alebo skončí. Po zapečatení sa nedá meniť nič; dá sa len
// vytvoriť nová reťaz. Koniec radu → 100 % tvorcovi.
// Prihlásený: rad je v účte (moja_retaz, 0080b), localStorage je cache; inak len lokálne.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { ZBIERKY, najdiZbierku } from "./zbierky";
import { darcoviaPre } from "./darcovia";

export const RETAZ_PCT_MIN = 5, RETAZ_PCT_KROK = 5;
/** percento vždy 5–100 po 5 (27 → 25, 28 → 30) */
export const zaokruhliPct = (v: number) => Math.min(100, Math.max(RETAZ_PCT_MIN, Math.round(v / RETAZ_PCT_KROK) * RETAZ_PCT_KROK));

export type StavVRetazi = "caka" | "bezi" | "naplnena" | "skoncila" | "preskocena";
export interface PolozkaRetaze { zbierkaId: string; pct: number; stav: StavVRetazi; poslane: number; snap?: Znama }
export interface Retaz { id: string; zapecatene: number; polozky: PolozkaRetaze[]; dostal: number; poslane: number; vlastnik?: string;
  /** OPRAVY 290: kto reťaz robí (karta ako na profile, štít z jeho profilu) */ robi?: Strana;
  /** balík 8 B: reťaz robí stránka (Konáš ako) — peniaze tvorcu idú na jej účet */ stranka?: string;
  /** balík 8 B: zapečatená na serveri (0093) — organizátori dostali oznámenie, rad a podiely vedie server */ naServeri?: boolean }

/** OPRAVY 290 · balík 8 — strana zmluvy: kto reťaz robí alebo kto zbierku organizuje. Štít sa ťahá z profilu:
 *  osoba / Help / tvorca / farnosť = hlavný štít DEED, charita = DEED Care, firma = DEED Partner. */
export type DruhStrany = "osoba" | "help" | "tvorca" | "charita" | "firma" | "farnost";
export interface Strana { druh: DruhStrany; meno: string; iniciala: string; foto?: string; mesto?: string; overeny?: boolean; stit: string; /** riadok pod menom (napr. „farár · Farnosť Trenčín“) */ pod?: string }
export const inicialy = (meno: string) => meno.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toLocaleUpperCase("sk-SK")).join("") || "?";

/** zbierka, ako ju vidí tvorca pri výbere a v rade */
export interface ZbierkaVRetazi { id: string; nazov: string; org: string; ciel: number | null; vyzbierane: number; aktivna: boolean; /** organizátor so štítom */ strana: Strana }

/** zbierka mimo katalógu (napr. karta z feedu) — appka ju ohlási, keď z nej otvára reťaz */
export type Znama = { nazov: string; org: string; ciel: number | null; zaklad: number; strana?: Strana };
const ZNAME = new Map<string, Znama>();
export const ohlasZbierku = (id: string, z: Znama) => { ZNAME.set(id, z); };

export function zbierkaVRetazi(id: string): ZbierkaVRetazi | null {
  const zive = darcoviaPre(id).reduce((a, r) => a + r.suma, 0);
  const z = najdiZbierku(id);
  if (!z) {
    const x = ZNAME.get(id);
    return x ? { id, nazov: x.nazov, org: x.org, ciel: x.ciel, vyzbierane: x.zaklad + zive, aktivna: true,
      strana: x.strana ?? { druh: "charita", meno: x.org || x.nazov, iniciala: inicialy(x.org || x.nazov), stit: "Bronze" } } : null;
  }
  const zi = z.ziadatel, org = zi.typ === "org";
  return { id, nazov: z.nazov, org: org ? zi.meno : `Pomoc · ${z.lok}`, ciel: z.ciel > 0 ? z.ciel : null, vyzbierane: z.vyzbierane + zive, aktivna: z.stav === "aktivna",
    strana: { druh: org ? "charita" : "help", meno: zi.meno, iniciala: inicialy(zi.meno), foto: zi.foto || undefined, mesto: zi.lok, overeny: zi.overeny, stit: zi.level } };
}
/** výber: len verejné bežiace zbierky (súkromnú len cez odkaz — nie tu) */
export const verejneBeziace = (): ZbierkaVRetazi[] =>
  [...ZBIERKY.filter((z) => z.stav === "aktivna").map((z) => z.id), ...ZNAME.keys()]
    .filter((id, i, a) => a.indexOf(id) === i).map(zbierkaVRetazi).filter((z): z is ZbierkaVRetazi => !!z);

const KLUC = "deed.retaz.moja";
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyRetaze = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);

export function nacitajRetaz(): Retaz | null {
  try {
    const s = localStorage.getItem(KLUC);
    if (!s) return null;
    const r = JSON.parse(s) as Retaz;
    r.polozky.forEach((x) => { if (x.snap && !ZNAME.has(x.zbierkaId)) ZNAME.set(x.zbierkaId, x.snap); });
    return r.naServeri ? r : posun(r); // balík 8 B: zapečatenú na serveri posúva len server
  } catch { return null; }
}
function ulozLokalne(r: Retaz | null) {
  try { if (r) localStorage.setItem(KLUC, JSON.stringify(r)); else localStorage.removeItem(KLUC); } catch { /* LS */ }
  zmena();
}
function uloz(r: Retaz | null) {
  const s = r && vUcte ? { ...r, vlastnik: vUcte } : r;
  ulozLokalne(s);
  void zapisDoUctu(s);
}
/** TESTOVACIE (balík 8 · C): „Vypnúť sieť pri zapečatení“ — ďalšie zapečatenie zlyhá ako bez internetu */
let vypadokTest = false;
export const nastavVypadokTest = (on: boolean) => { vypadokTest = on; zmena(); };
export const vypadokTestZapnuty = () => vypadokTest;

// ---- účet (0080b) ----
let vUcte: string | null = null;
/** zápis do účtu; vráti chybu (nikdy ticho) — bez účtu / databázy null */
async function zapisDoUctu(r: Retaz | null): Promise<string | null> {
  if (!supabase || !vUcte) return null;
  const { error } = r
    ? await supabase.from("moja_retaz").upsert({ data: r }, { onConflict: "ucet_id" })
    : await supabase.from("moja_retaz").delete().eq("ucet_id", vUcte);
  return error ? "Server reťaz neprijal." : null;
}
/** po prihlásení: rad z účtu má prednosť; keď v účte nie je, doplní sa lokálny (ak nie je cudzí) */
async function synchronizujRetaz(ucetId: string) {
  if (!supabase || vUcte === ucetId) return;
  const { data, error } = await supabase.from("moja_retaz").select("data").maybeSingle();
  if (error) return; // tabuľka ešte nebeží (0080b) → ostáva lokálne
  vUcte = ucetId;
  const db = (data?.data ?? null) as Retaz | null;
  if (db) { ulozLokalne({ ...db, vlastnik: ucetId }); void obnovRetaz(); return; }
  let lok: Retaz | null = null;
  try { lok = JSON.parse(localStorage.getItem(KLUC) || "null") as Retaz | null; } catch { /* LS */ }
  if (lok && lok.vlastnik && lok.vlastnik !== ucetId) { ulozLokalne(null); return; } // cudzí rad z tohto prehliadača nepreberaj
  if (lok) uloz(lok);
}
/** hook pre provider: reálny účet → synchronizuj; odhlásenie / demo → len lokálne */
export function useSynchronizaciaRetaze(ucetId: string | null) {
  useEffect(() => { if (ucetId) void synchronizujRetaz(ucetId); else vUcte = null; }, [ucetId]);
}

/** posunie rad: bežiaca naplnená / skončená → ďalšia; uzavreté skôr sa preskočia */
function posun(r: Retaz): Retaz {
  const p = r.polozky.map((x) => ({ ...x }));
  let i = p.findIndex((x) => x.stav === "bezi" || x.stav === "caka");
  while (i >= 0 && i < p.length) {
    const z = zbierkaVRetazi(p[i].zbierkaId);
    if (!z || !z.aktivna) { p[i].stav = p[i].stav === "bezi" ? "skoncila" : "preskocena"; i++; continue; }
    if (z.ciel && z.vyzbierane >= z.ciel) { p[i].stav = "naplnena"; i++; continue; }
    p[i].stav = "bezi"; break;
  }
  return { ...r, polozky: p };
}

export const beziaca = (r: Retaz) => r.polozky.find((x) => x.stav === "bezi") ?? null;

/** pripraví zapečatenú reťaz (id vznikne raz — opakované zapečatenie po výpadku ju uloží len raz) */
export function pripravRetaz(polozky: { zbierkaId: string; pct: number }[], robi: Strana, stranka?: string): Retaz {
  return posun({ id: `rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, zapecatene: Date.now(), dostal: 0, poslane: 0, robi, ...(stranka ? { stranka } : {}),
    polozky: polozky.map((x) => ({ zbierkaId: x.zbierkaId, pct: zaokruhliPct(x.pct), stav: "caka" as const, poslane: 0,
      ...(ZNAME.has(x.zbierkaId) ? { snap: ZNAME.get(x.zbierkaId) } : {}) })) });
}
/** zapečatí rad — odvtedy sa nemení. Najprv účet (pravda je v DB), až potom zariadenie.
 *  Zlyhanie vráti text chyby a reťaz ostane nezapečatená (appka ukáže Neuložilo sa · Skúsiť znova). */
export async function zapecatRetaz(r: Retaz): Promise<string | null> {
  const nedostupne = "Nie ste pripojený na internet. Reťaz zatiaľ nie je zapečatená.";
  if (vypadokTest || (typeof navigator !== "undefined" && navigator.onLine === false)) return nedostupne;
  let s: Retaz = vUcte ? { ...r, vlastnik: vUcte } : r;
  if (supabase && vUcte) {
    // balík 8 B: split-config na serveri (0093) — rovnaké id = tá istá reťaz, oznámenia organizátorom posiela server
    const { data, error } = await supabase.rpc("retaz_zapecat", { p_id: r.id, p_polozky: r.polozky.map((x) => ({ zbierka: x.zbierkaId, pct: x.pct })),
      p_stranka: r.stranka ?? null, p_robi: r.robi ?? null }).then((x) => x, () => ({ data: null, error: { message: "" } }));
    if (error) return `${chybaServera(error.message)} Reťaz zatiaľ nie je zapečatená.`;
    s = zoServera({ ...s, naServeri: true }, data as StavServera);
  }
  const chyba = await zapisDoUctu(s).catch(() => "Server reťaz neprijal.");
  if (chyba) return `${chyba} Reťaz zatiaľ nie je zapečatená.`;
  ulozLokalne(s);
  return null;
}
/** „Vytvoriť novú reťaz" — stará sa uzavrie (na serveri skončí), nová sa nastavuje od nuly */
export const zrusRetaz = () => {
  const r = nacitajRetaz();
  if (supabase && vUcte && r?.naServeri) void supabase.rpc("retaz_ukonci", { p_stranka: r.stranka ?? null }).then(() => undefined, () => undefined);
  uloz(null);
};

// ---- balík 8 B: stav radu a podiely vedie server (0093), appka ho len zobrazí ----
type StavServera = { dostal: number; polozky: { zbierka: string; stav: StavVRetazi; poslane: number }[] } | null;
const chybaServera = (m: string) => {
  const x = /Zbierka (.+) nie je v DEED/.exec(m)?.[1] ?? /Zbierka (.+) nie je verejná/.exec(m)?.[1];
  if (x) return `Zbierka ${zbierkaVRetazi(x)?.nazov ?? x} sa do reťaze dať nedá.`;
  if (/Vlastnú zbierku/.test(m)) return "Vlastnú zbierku do reťaze dať nejde.";
  return m && !/fetch|network/i.test(m) ? "Server reťaz neprijal." : "Nie ste pripojený na internet.";
};
function zoServera(r: Retaz, st: StavServera): Retaz {
  if (!st || !Array.isArray(st.polozky)) return r;
  const m = new Map(st.polozky.map((x) => [x.zbierka, x]));
  const polozky = r.polozky.map((x) => { const y = m.get(x.zbierkaId); return y ? { ...x, stav: y.stav, poslane: Number(y.poslane) || 0 } : x; });
  return { ...r, polozky, dostal: Number(st.dostal) || 0, poslane: polozky.reduce((a, x) => a + x.poslane, 0) };
}
/** obnoví rad zo servera (posun radu vyhodnotí server); bez servera nič */
export async function obnovRetaz(): Promise<void> {
  const r = nacitajRetaz();
  if (!supabase || !r?.naServeri) return;
  const { data, error } = await supabase.rpc("retaz_obnov", { p_retaz: r.id }).then((x) => x, () => ({ data: null, error: true }));
  if (error || !data) return;
  ulozLokalne(zoServera(r, data as StavServera));
}
// balík 8 B: rozdelenie daru na QR reťaze robí server (retaz_dar, 0093) — appka ho nepočíta
