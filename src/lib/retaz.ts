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
import { darcoviaPre, pridajDar } from "./darcovia";
import { idZbierkyDB, objektZbierky } from "./darZbierky";
import { najdiTestProfil } from "./testProfily";
import { sumaEur } from "@/lib/suma";

export const RETAZ_PCT_MIN = 5, RETAZ_PCT_KROK = 5;
/** percento vždy 5–100 po 5 (27 → 25, 28 → 30) */
export const zaokruhliPct = (v: number) => Math.min(100, Math.max(RETAZ_PCT_MIN, Math.round(v / RETAZ_PCT_KROK) * RETAZ_PCT_KROK));

export type StavVRetazi = "caka" | "bezi" | "naplnena" | "skoncila" | "preskocena";
export interface PolozkaRetaze { zbierkaId: string; pct: number; stav: StavVRetazi; poslane: number; snap?: Znama }
export interface Retaz { id: string; zapecatene: number; polozky: PolozkaRetaze[]; dostal: number; poslane: number; vlastnik?: string;
  /** OPRAVY 290: kto reťaz robí (karta ako na profile, štít z jeho profilu) */ robi?: Strana;
  /** balík 8 B: reťaz robí stránka (Konáš ako) — peniaze tvorcu idú na jej účet */ stranka?: string;
  /** balík 8 B: zapečatená na serveri (0093) — organizátori dostali oznámenie, rad a podiely vedie server */ naServeri?: boolean;
  /** balík 8 C · bez servera: dary cez QR reťaze a oznámenia organizátorom (so serverom ich vedie server, 0094) */
  dary?: DarCezRetaz[]; oznamy?: OznamOrganizatorovi[] }
export interface DarCezRetaz { meno: string | null; suma: number; cas: number; zbierkaId: string | null }
export interface OznamOrganizatorovi { komu: string; zbierka: string; titul: string; text: string; cas: number }

/** OPRAVY 290 · balík 8 — strana zmluvy: kto reťaz robí alebo kto zbierku organizuje. Štít sa ťahá z profilu:
 *  osoba / Help / tvorca / farnosť = hlavný štít DEED, charita = DEED Care, firma = DEED Partner. */
export type DruhStrany = "osoba" | "help" | "tvorca" | "charita" | "firma" | "farnost";
export interface Strana { druh: DruhStrany; meno: string; iniciala: string; foto?: string; mesto?: string; overeny?: boolean; stit: string; /** riadok pod menom (napr. „farár · Farnosť Trenčín“) */ pod?: string }
export const inicialy = (meno: string) => meno.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toLocaleUpperCase("sk-SK")).join("") || "?";

/** zbierka, ako ju vidí tvorca pri výbere a v rade */
export interface ZbierkaVRetazi { id: string; nazov: string; org: string; ciel: number | null; vyzbierane: number; aktivna: boolean; /** organizátor so štítom */ strana: Strana;
  /** OPRAVY 295: titulná fotka (aj pri zbierke z Domova) */ foto?: string }

/** zbierka mimo katalógu (napr. karta z Domova) — appka ju ohlási, keď z nej otvára reťaz */
export type Znama = { nazov: string; org: string; ciel: number | null; zaklad: number; strana?: Strana; foto?: string };
const ZNAME = new Map<string, Znama>();
export const ohlasZbierku = (id: string, z: Znama) => { ZNAME.set(id, z); };

export function zbierkaVRetazi(id: string): ZbierkaVRetazi | null {
  const zDb = vyberDb?.get(id) ?? vyberDb?.get(idZbierkyDB(id) ?? "");
  if (zDb) { const x = ZNAME.get(id); return x?.foto && !zDb.foto ? { ...zDb, foto: x.foto } : zDb; }
  const zive = darcoviaPre(id).reduce((a, r) => a + r.suma, 0);
  const z = najdiZbierku(id);
  if (!z) {
    const x = ZNAME.get(id);
    return x ? { id, nazov: x.nazov, org: x.org, ciel: x.ciel, vyzbierane: x.zaklad + zive, aktivna: true, foto: x.foto,
      strana: x.strana ?? { druh: "charita", meno: x.org || x.nazov, iniciala: inicialy(x.org || x.nazov), stit: "Bronze" } } : null;
  }
  const zi = z.ziadatel, org = zi.typ === "org";
  return { id, nazov: z.nazov, org: org ? zi.meno : `Pomoc · ${z.lok}`, ciel: z.ciel > 0 ? z.ciel : null, vyzbierane: z.vyzbierane + zive, aktivna: z.stav === "aktivna", foto: z.foto || undefined,
    strana: { druh: org ? "charita" : "help", meno: zi.meno, iniciala: inicialy(zi.meno), foto: zi.foto || undefined, mesto: zi.lok, overeny: zi.overeny, stit: zi.level } };
}
/** výber: len verejné bežiace zbierky (súkromnú len cez odkaz — nie tu).
 *  OPRAVY 295: so serverom len skutočné zbierky z databázy, ktoré do reťaze smú (0095) — ukážkové z katalógu nie. */
export function verejneBeziace(): ZbierkaVRetazi[] {
  if (supabase) {
    if (!vyberDb) void nacitajVyber();
    const db = [...(vyberDb?.values() ?? [])].filter((z) => !vyberMoje.has(z.id));
    const otvorene = [...ZNAME.keys()].filter((id) => smieDoRetaze(id) && !db.some((z) => z.id === (idZbierkyDB(id) ?? id))).map(zbierkaVRetazi).filter((z): z is ZbierkaVRetazi => !!z);
    return [...otvorene, ...db];
  }
  return [...ZBIERKY.filter((z) => z.stav === "aktivna").map((z) => z.id), ...ZNAME.keys()]
    .filter((id, i, a) => a.indexOf(id) === i).map(zbierkaVRetazi).filter((z): z is ZbierkaVRetazi => !!z);
}
/** smie zbierka do reťaze? so serverom len zbierka z databázy (zb-…) alebo zbierka stránky v module, nikdy zvončeková omša */
export function smieDoRetaze(id: string): boolean {
  if (!supabase) return !!zbierkaVRetazi(id)?.aktivna;
  if (/-zv-/.test(id) || vyberMoje.has(idZbierkyDB(id) ?? id)) return false;
  return /^zb-/.test(id) || !!vyberDb?.has(id) || !!objektZbierky(id);
}
// ---- OPRAVY 295: výber zo servera (0095) ----
let vyberDb: Map<string, ZbierkaVRetazi> | null = null;
const vyberMoje = new Set<string>();
let vyberNacitava = false;
type ZbierkaServera = { id: string; nazov: string; ciel: number | null; vyzbierane: number; stranka: string | null; typ: string | null; org: string; moja: boolean };
async function nacitajVyber() {
  if (!supabase || vyberNacitava) return;
  vyberNacitava = true;
  const { data, error } = await supabase.rpc("retaz_zbierky", { p_limit: 200 }).then((x) => x, () => ({ data: null, error: true }));
  vyberNacitava = false;
  if (error || !Array.isArray(data)) return;
  const m = new Map<string, ZbierkaVRetazi>();
  vyberMoje.clear();
  for (const x of data as ZbierkaServera[]) {
    if (x.moja) vyberMoje.add(x.id);
    const tp = x.stranka ? najdiTestProfil(x.stranka) : undefined; // štít z profilu organizátora
    const druh: DruhStrany = x.typ === "firma" || x.typ === "tvorca" || x.typ === "farnost" ? x.typ : x.typ ? "charita" : "help";
    m.set(x.id, { id: x.id, nazov: x.nazov, org: x.org, ciel: x.ciel != null && Number(x.ciel) > 0 ? Number(x.ciel) : null, vyzbierane: Number(x.vyzbierane) || 0, aktivna: true,
      strana: { druh, meno: tp?.meno ?? x.org, iniciala: tp?.iniciala ?? inicialy(x.org), mesto: typeof tp?.mesto === "string" ? tp.mesto : undefined, overeny: true, stit: tp?.stit ?? "Bronze" } });
  }
  vyberDb = m; zmena();
}

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
    const { data, error } = await supabase.rpc("retaz_zapecat", { p_id: r.id, p_polozky: r.polozky.map((x) => polozkaPreServer(x.zbierkaId, x.pct)),
      p_stranka: r.stranka ?? null, p_robi: r.robi ?? null }).then((x) => x, () => ({ data: null, error: { message: "" } }));
    if (error) return `${chybaServera(error.message)} Reťaz zatiaľ nie je zapečatená.`;
    s = zoServera({ ...s, naServeri: true }, data as StavServera);
  }
  else s = { ...s, oznamy: s.polozky.map((x, i) => oznam(x.zbierkaId, "Nová reťaz dobra", `${menoRetaze(s)} posiela ${x.pct} % z každého daru na vašu zbierku ${zbierkaVRetazi(x.zbierkaId)?.nazov ?? ""}. Ste ${i + 1}. v rade.`)) };
  const chyba = await zapisDoUctu(s).catch(() => "Server reťaz neprijal.");
  if (chyba) return `${chyba} Reťaz zatiaľ nie je zapečatená.`;
  ulozLokalne(s);
  obnovStranky();
  return null;
}
/** „Vytvoriť novú reťaz" — stará sa uzavrie (na serveri skončí), nová sa nastavuje od nuly */
export const zrusRetaz = () => {
  const r = nacitajRetaz();
  if (supabase && vUcte && r?.naServeri) void supabase.rpc("retaz_ukonci", { p_stranka: r.stranka ?? null }).then(() => undefined, () => undefined);
  uloz(null);
};

// ---- balík 8 B: stav radu a podiely vedie server (0093), appka ho len zobrazí ----
/** zbierka stránky v module (napr. oprava strechy farnosti) má v DB id „<stránka>:<ref>“ — riadok vznikne pri zapečatení */
function polozkaPreServer(zbierkaId: string, pct: number) {
  const o = objektZbierky(zbierkaId), id = idZbierkyDB(zbierkaId) ?? zbierkaId;
  return o ? { zbierka: id, pct, stranka: o.stranka, nazov: o.nazov } : { zbierka: id, pct };
}
type StavServera = { dostal: number; polozky: { zbierka: string; stav: StavVRetazi; poslane: number }[] } | null;
const chybaServera = (m: string) => {
  const x = /Zbierka (.+) nie je v DEED/.exec(m)?.[1] ?? /Zbierka (.+) nie je verejná/.exec(m)?.[1];
  if (x) return `Zbierka ${zbierkaVRetazi(x)?.nazov ?? x} sa do reťaze dať nedá.`;
  if (/Vlastnú zbierku/.test(m)) return "Vlastnú zbierku do reťaze dať nejde.";
  return m && !/fetch|network/i.test(m) ? "Server reťaz neprijal." : "Nie ste pripojený na internet.";
};
function zoServera(r: Retaz, st: StavServera): Retaz {
  if (!st || !Array.isArray(st.polozky)) return r;
  const polozky = r.polozky.map((x, i) => { const y = st.polozky[i]; return y ? { ...x, stav: y.stav, poslane: Number(y.poslane) || 0 } : x; }); // poradie = poradie na serveri
  return { ...r, polozky, dostal: Number(st.dostal) || 0, poslane: polozky.reduce((a, x) => a + x.poslane, 0) };
}
/** obnoví rad zo servera (posun radu vyhodnotí server); bez servera nič */
export async function obnovRetaz(): Promise<void> {
  const r = nacitajRetaz();
  if (!supabase || !r?.naServeri) return;
  const { data, error } = await supabase.rpc("retaz_obnov", { p_retaz: r.id }).then((x) => x, () => ({ data: null, error: true }));
  if (error || !data) return;
  ulozLokalne(zoServera(r, data as StavServera));
  obnovStranky();
}
// balík 8 B: rozdelenie daru na QR reťaze robí server (retaz_dar, 0093) — appka ho nepočíta

// ============================================================
// balík 8 C — stránka zbierky (kto ju podporuje reťazou, podiel v páse), stránka tvorcu a Testovanie.
// So serverom (0094) číta server; bez servera (ukážka) to isté z reťaze na zariadení.
// ============================================================
const menoRetaze = (r: Retaz) => r.robi?.meno ?? "Tvorca";
const oznam = (zbierkaId: string, titul: string, text: string): OznamOrganizatorovi => {
  const z = zbierkaVRetazi(zbierkaId);
  return { komu: z?.strana.meno ?? z?.org ?? "Organizátor", zbierka: z?.nazov ?? zbierkaId, titul, text, cas: Date.now() };
};
/** bez servera: posun radu ako na serveri + oznámenie „Ste na rade“ */
function posunSOznamom(r: Retaz): Retaz {
  const p = posun(r);
  const nove = p.polozky.filter((x, i) => x.stav === "bezi" && r.polozky[i].stav === "caka")
    .map((x) => oznam(x.zbierkaId, "Ste na rade", `${menoRetaze(r)} teraz posiela ${x.pct} % z každého daru na vašu zbierku ${zbierkaVRetazi(x.zbierkaId)?.nazov ?? ""}.`));
  return nove.length ? { ...p, oznamy: [...(p.oznamy ?? []), ...nove] } : p;
}

// ---- obnova serverových údajov po akcii (zapečatenie, dar, Testovanie) ----
let obnova = 0;
const obnovStranky = () => { obnova++; zmena(); };
const useObnova = () => { useZmenyRetaze(); return obnova; };

/** Prehľad stránky (0188): reťaze, ktoré majú v rade zbierku tejto stránky */
export interface RetazNaStranke extends PodporaRetazou { zbierka: string; zbierkaNazov: string; stav: string }
const naStranke = new Map<string, RetazNaStranke[]>();
export function useRetazeNaStranke(stranka: string): RetazNaStranke[] {
  const o = useObnova();
  useEffect(() => {
    if (!supabase || !stranka) return;
    let zive = true;
    void supabase.rpc("retaz_na_stranke", { p_stranka: stranka }).then(({ data, error }) => {
      if (!zive || error || !Array.isArray(data)) return;
      naStranke.set(stranka, (data as { retaz: string; meno: string; robi?: Strana | null; stranka?: string | null; zbierka: string; zbierkaNazov: string; pct: number; stav: string; bezi: boolean; poslane: number }[])
        .map((x) => ({ retaz: x.retaz, meno: x.meno, robi: x.robi ?? undefined, stranka: x.stranka ?? undefined, zbierka: x.zbierka, zbierkaNazov: x.zbierkaNazov, pct: Number(x.pct), stav: x.stav, bezi: !!x.bezi, poslane: Number(x.poslane) || 0 })));
      zmena();
    }, () => undefined);
    return () => { zive = false; };
  }, [stranka, o]);
  return naStranke.get(stranka) ?? [];
}

/** kto podporuje zbierku reťazou (bezi = blok „Podporujú reťazou“; poslane = podiel v páse) */
export interface PodporaRetazou { retaz: string; meno: string; robi?: Strana; stranka?: string; pct: number; bezi: boolean; poslane: number }
const podpora = new Map<string, PodporaRetazou[]>();
export function usePodporaRetazou(zbierkaId: string): PodporaRetazou[] {
  const o = useObnova();
  const id = idZbierkyDB(zbierkaId) ?? zbierkaId;
  useEffect(() => {
    if (!supabase) return;
    let zive = true;
    void supabase.rpc("retaz_podporuju", { p_zbierka: id }).then(({ data, error }) => {
      if (!zive || error || !Array.isArray(data)) return;
      podpora.set(id, (data as { retaz: string; meno: string; robi?: Strana | null; stranka?: string | null; pct: number; bezi: boolean; poslane: number }[])
        .map((x) => ({ retaz: x.retaz, meno: x.meno, robi: x.robi ?? undefined, stranka: x.stranka ?? undefined, pct: Number(x.pct), bezi: !!x.bezi, poslane: Number(x.poslane) || 0 })));
      zmena();
    }, () => undefined);
    return () => { zive = false; };
  }, [id, o]);
  if (supabase && podpora.has(id)) return podpora.get(id)!;
  if (supabase && vUcte) return [];
  const r = nacitajRetaz();
  const x = r?.polozky.find((y) => y.zbierkaId === zbierkaId);
  return r && x && (x.stav === "bezi" || x.poslane > 0)
    ? [{ retaz: r.id, meno: menoRetaze(r), robi: r.robi, stranka: r.stranka, pct: x.pct, bezi: x.stav === "bezi", poslane: x.poslane }] : [];
}

/** reťaz na stránke tvorcu: bežiaca zbierka a ukončené (naplnená / skončila) */
export interface ZbierkaTvorcu { zbierkaId: string; nazov: string; org: string; orgStranka?: string; strana?: Strana; pct: number; stav: StavVRetazi; poslane: number; ciel: number | null; vyzbierane: number; kedy: number }
export interface RetazTvorcu { id: string; zbierky: ZbierkaTvorcu[] }
const strany = new Map<string, RetazTvorcu | null>();
type PolozkaServera = { zbierka: string; nazov: string; org?: string | null; org_stranka?: string | null; pct: number; stav: StavVRetazi; poslane: number; ciel?: number | null; vyzbierane?: number; zmena?: string };
/** stranka = kľúč stránky tvorcu (null = moja reťaz); meno = meno na stránke (bez servera sa podľa neho spozná vlastná reťaz) */
export function useRetazTvorcu(stranka: string | null, meno: string): RetazTvorcu | null {
  const o = useObnova();
  const k = stranka ?? "";
  useEffect(() => {
    if (!supabase) return;
    let zive = true;
    void supabase.rpc("retaz_strany", { p_stranka: stranka }).then(({ data, error }) => {
      if (!zive || error) return;
      const st = data as { id: string; polozky: PolozkaServera[] } | null;
      strany.set(k, st?.id ? { id: st.id, zbierky: st.polozky.map((x) => {
        const zn = zbierkaVRetazi(x.zbierka.includes(":") ? x.zbierka.split(":").slice(1).join(":") : x.zbierka);
        return { zbierkaId: x.zbierka, nazov: x.nazov, org: x.org ?? zn?.strana.meno ?? "", orgStranka: x.org_stranka ?? undefined, strana: zn?.strana,
          pct: Number(x.pct), stav: x.stav, poslane: Number(x.poslane) || 0, ciel: x.ciel ?? null, vyzbierane: Number(x.vyzbierane) || 0, kedy: x.zmena ? Date.parse(x.zmena) : 0 };
      }) } : null);
      zmena();
    }, () => undefined);
    return () => { zive = false; };
  }, [k, o, stranka]);
  if (supabase && strany.has(k)) return strany.get(k)!;
  if (supabase && vUcte) return null;
  const r = nacitajRetaz();
  if (!r || !(r.stranka ? r.stranka === stranka : r.robi?.meno === meno)) return null;
  return { id: r.id, zbierky: r.polozky.map((x) => {
    const z = zbierkaVRetazi(x.zbierkaId);
    return { zbierkaId: x.zbierkaId, nazov: z?.nazov ?? x.zbierkaId, org: z?.strana.meno ?? z?.org ?? "", strana: z?.strana, pct: x.pct, stav: x.stav, poslane: x.poslane,
      ciel: z?.ciel ?? null, vyzbierane: z?.vyzbierane ?? 0, kedy: r.zapecatene };
  }) };
}

/** darcovia cez QR tvorcu pri jednej zbierke (meno len keď ho darca dovolil) */
export interface DarcaCezQr { meno: string | null; suma: number; cas: number }
const darcoviaQr = new Map<string, { pocet: number; dary: DarcaCezQr[] }>();
export function useDarcoviaCezQr(retaz: string, zbierkaId: string): { pocet: number; dary: DarcaCezQr[] } {
  const o = useObnova();
  const k = `${retaz}|${zbierkaId}`;
  useEffect(() => {
    if (!supabase) return;
    let zive = true;
    void supabase.rpc("retaz_darcovia", { p_retaz: retaz, p_zbierka: zbierkaId, p_limit: 50 }).then(({ data, error }) => {
      if (!zive || error || !data) return;
      const d = data as { pocet: number; dary: { meno: string | null; suma: number; cas: string }[] };
      darcoviaQr.set(k, { pocet: Number(d.pocet) || 0, dary: d.dary.map((x) => ({ meno: x.meno, suma: Number(x.suma) || 0, cas: Date.parse(x.cas) })) });
      zmena();
    }, () => undefined);
    return () => { zive = false; };
  }, [k, o, retaz, zbierkaId]);
  if (supabase && darcoviaQr.has(k)) return darcoviaQr.get(k)!;
  const r = nacitajRetaz();
  const dary = (r?.id === retaz ? r.dary ?? [] : []).filter((x) => x.zbierkaId === zbierkaId).sort((a, b) => b.cas - a.cas);
  return { pocet: dary.length, dary: dary.map((x) => ({ meno: x.meno, suma: x.suma, cas: x.cas })) };
}

// ---- Testovanie (len v testovacom režime; testovacie dary sú v ledgeri označené, do ostrých súm nejdú) ----
const e2 = (n: number) => `${sumaEur(n)}`;
const vysledok = (r: Retaz | null) => {
  const b = r ? beziaca(r) : null;
  return b ? `Teraz beží ${zbierkaVRetazi(b.zbierkaId)?.nazov ?? "zbierka"} · ${b.pct} %` : "Rad skončil · ďalšie dary 100 % vám";
};
async function testServer(fn: string, args: Record<string, unknown>): Promise<string | null> {
  const { error } = await supabase!.rpc(fn, args).then((x) => x, () => ({ error: { message: "Nie ste pripojený na internet." } }));
  return error ? error.message || "Server akciu neprijal." : null;
}
/** „Simulovať dar 10 € na QR reťaze“ (od iného testovacieho darcu) — vráti, čo sa stalo */
export async function testDar(eur = 10): Promise<string> {
  const r = nacitajRetaz();
  if (!r) return "Najprv zapečaťte reťaz.";
  if (supabase && r.naServeri) {
    let idem: string; try { idem = crypto.randomUUID(); } catch { idem = `rt-test-${Date.now()}`; }
    const e = await testServer("retaz_dar", { p_retaz: r.id, p_idem: idem, p_suma: eur, p_mena: "EUR", p_kanal: "fiat", p_meno_darcu: "Testovací darca", p_test: true });
    if (e) return e;
    const pred = beziaca(r);
    await obnovRetaz();
    return pred ? `Dar ${e2(eur)}: ${e2(eur * pred.pct / 100)} zbierke, ${e2(eur - eur * pred.pct / 100)} vám. ${vysledok(nacitajRetaz())}` : `Dar ${e2(eur)}: 100 % vám.`;
  }
  const p0 = posunSOznamom(r), b = beziaca(p0);
  const doZbierky = b ? Math.round(eur * b.pct) / 100 : 0;
  if (b && doZbierky > 0) pridajDar({ refId: b.zbierkaId, suma: doZbierky, kanal: "psp", registrovany: false });
  const po = posunSOznamom({ ...p0, dostal: p0.dostal + eur, poslane: p0.poslane + doZbierky,
    polozky: p0.polozky.map((x) => (b && x.zbierkaId === b.zbierkaId ? { ...x, poslane: x.poslane + doZbierky } : x)),
    dary: [...(p0.dary ?? []), { meno: "Testovací darca", suma: eur, cas: Date.now(), zbierkaId: b?.zbierkaId ?? null }] });
  uloz(po); obnovStranky();
  return b ? `Dar ${e2(eur)}: ${e2(doZbierky)} zbierke, ${e2(eur - doZbierky)} vám. ${vysledok(po)}` : `Dar ${e2(eur)}: 100 % vám.`;
}
/** „Bežiaca zbierka sa naplnila“ / „Ďalšiu v rade uzavreli“ */
export async function testRad(akcia: "naplnena" | "uzavreli"): Promise<string> {
  const r = nacitajRetaz();
  if (!r) return "Najprv zapečaťte reťaz.";
  if (supabase && r.naServeri) {
    const e = await testServer("retaz_test", { p_retaz: r.id, p_akcia: akcia });
    if (e) return e;
    await obnovRetaz();
    return vysledok(nacitajRetaz());
  }
  const i = akcia === "naplnena" ? r.polozky.findIndex((x) => x.stav === "bezi") : r.polozky.findIndex((x) => x.stav === "caka");
  if (i < 0) return akcia === "naplnena" ? "Žiadna zbierka nebeží." : "V rade nič nečaká.";
  const po = posunSOznamom({ ...r, polozky: r.polozky.map((x, j) => (j === i ? { ...x, stav: akcia === "naplnena" ? "naplnena" as const : "preskocena" as const } : x)) });
  uloz(po); obnovStranky();
  return vysledok(po);
}
/** „Ukázať oznámenia organizátorov“ */
export async function testOznamy(): Promise<OznamOrganizatorovi[] | string> {
  const r = nacitajRetaz();
  if (!r) return "Najprv zapečaťte reťaz.";
  if (supabase && r.naServeri) {
    const { data, error } = await supabase.rpc("retaz_oznamy", { p_retaz: r.id }).then((x) => x, () => ({ data: null, error: { message: "Nie ste pripojený na internet." } }));
    if (error) return error.message || "Server akciu neprijal.";
    return ((data ?? []) as { komu: string; zbierka: string; titul: string; text: string; cas: string }[]).map((x) => ({ ...x, cas: Date.parse(x.cas) }));
  }
  return r.oznamy ?? [];
}
/** „Začať odznova“ — reťaz skončí, sieť sa zapne, nastavuje sa od nuly */
export function testOdznova() { nastavVypadokTest(false); zrusRetaz(); obnovStranky(); }
