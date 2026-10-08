// ============================================================
// OZNAMY SUBJEKTU — spoločný engine pre charitu, faru, firmu, spolok, tvorcu.
// Vedomé rozhodnutie: subjekt je len kľúč („charita", „fara:123"), takže ten
// istý kód obslúži každú entitu — kategórie a limity si určuje modul.
// Platnosť: oznam po X dňoch zmizne z profilu, záznam ostáva (mäkká expirácia).
// Perzistencia: DB (migrácia 0073) — oznam_subjektu (obsah, číta každý, píše správca stránky)
// a zaujemca_inzeratu (kontakt „Mám záujem", vidí len záujemca a správca). Rozhranie ostáva
// synchrónne: cache v pamäti + localStorage, DB sa načíta na pozadí (useZmenyOznamov prekreslí).
// Entita bez stránky v DB (napr. fara:<id>) a mock/offline = len localStorage.
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { bezDataUrl } from "./uploadFoto";
import { pripojTestovaciuStranku } from "./stranka";
import { toast } from "@/components/toast";

export type KategoriaOznamu = "oznam" | "akcia" | "inzerat";

export const OZNAM_CFG = {
  maxNadpis: 70,
  maxText: 600,
  /** pracovná ponuka je dlhšia — reálne výberové konania majú 2–4 tisíc znakov */
  maxTextPonuky: 4000,
  maxFotiek: 3,
  /** predvolená platnosť v dňoch — koľko oznam visí na profile */
  platnostDni: 14,
  /** ponuka platností vo formulári */
  platnosti: [7, 14, 30, 60],
  /** koľko oznamov môže byť naraz pripnutých navrch */
  maxPripnutych: 1,
};

/** limity inzerátov podľa programu — počítajú sa BEŽIACE (neobsadené, nevypršané) */
export const INZERAT_CFG = {
  limity: { 0: 0, 1: 1, 2: 5, 3: 9999, 4: 9999 } as Record<number, number>,
  platnostDni: 30,
  platnosti: [14, 30, 60],
  /** po zavretí inzerátu sa kontakty záujemcov po toľkých dňoch zmažú */
  dniDoZmazaniaKontaktov: 30,
};

/** podrobnosti pracovnej ponuky — to, čo človek hľadá očami skôr, než začne čítať */
export interface PonukaDetail {
  miesto?: string;
  uvazok?: string;
  nastup?: string;
  /** uzávierka prihlášok (ms) — po nej ponuka sama zíde z profilu */
  uzavierka?: number;
  mzda?: string;
  // ---- ako sa prihlásiť ----
  /** cez DEED tlačidlom „Mám záujem" */
  cezDeed?: boolean;
  /** žiadosť e-mailom */
  email?: string;
  /** žiadosť poštou / osobne */
  adresa?: string;
  /** čo treba priložiť (životopis, doklad o vzdelaní…) */
  doklady?: string;
  /** hotový dokument výberového konania (odkaz „idb:…", lib/prilohy.ts) */
  priloha?: string;
  prilohaNazov?: string;
}

/** človek, čo klikol „Mám záujem" — vypĺňa si údaje sám a vyberá, čo dá k dispozícii */
export interface Zaujemca {
  id: string;
  meno: string;
  telefon?: string;
  email?: string;
  poznamka?: string;
  /** dobrovoľne priložený štít a karma z profilu */
  stit?: string;
  karma?: number;
  kedy: number;
}

export interface Oznam {
  id: string;
  /** kľúč subjektu — „charita", „tvorca", „b2b", „fara:<id>" */
  entita: string;
  kategoria: KategoriaOznamu;
  nadpis: string;
  text: string;
  fotky?: string[];
  platnostDni: number;
  vytvorene: number;    // ms
  upravene?: number;    // ms
  pripnute?: boolean;
  // ---- len inzerát ----
  /** miesto je obsadené — inzerát prestáva bežať, ostatným sa poďakuje */
  obsadene?: number;      // ms, kedy sa zavrel
  zaujemcovia?: Zaujemca[];
  ponuka?: PonukaDetail;
}

const KLUC = (entita: string) => `deed.oznamy.${entita}`;
let verzia = 0;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
export function useZmenyOznamov(): number { return useSyncExternalStore(subscribe, () => verzia); }

// entita → testovacia stránka v DB (lib/mojeStranky UKAZKOVE_STRANKY); iná entita ostáva lokálne
const STRANKA_ENTITY: Record<string, string> = { charita: "svetlo", b2b: "pekaren", tvorca: "tvorca", svetlo: "svetlo", pekaren: "pekaren", farnost: "farnost" };
const strankaEntity = (entita: string): string | null => (supabase ? STRANKA_ENTITY[entita] ?? null : null);

const pamat = new Map<string, Oznam[]>();
const zDb = new Set<string>();       // entity, ktoré už prišli z DB
const nacitava = new Set<string>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
const lokalne = (entita: string): Oznam[] => { try { return JSON.parse(localStorage.getItem(KLUC(entita)) ?? "[]") as Oznam[]; } catch { return []; } };
const ulozLokalne = (entita: string, v: Oznam[]) => { try { localStorage.setItem(KLUC(entita), JSON.stringify(v)); } catch { /* LS nedostupné */ } };

export function nacitajOznamy(entita: string): Oznam[] {
  void nacitajZDb(entita);
  return pamat.get(entita) ?? lokalne(entita);
}

type Riadok = { id: string; data: Oznam };
type RiadokZaujemcu = { id: string; oznam_id: string; meno: string; telefon: string | null; email: string | null; poznamka: string | null; stit: string | null; karma: number | null; kedy: string };
/** DB → cache. Oznamy z DB sú autoritatívne; čo je len v tomto prehliadači (pred napojením), sa raz zapíše. */
async function nacitajZDb(entita: string): Promise<void> {
  const stranka = strankaEntity(entita);
  if (!stranka || zDb.has(entita) || nacitava.has(entita)) return;
  nacitava.add(entita);
  try {
    const { data, error } = await supabase!.from("oznam_subjektu").select("id, data").eq("stranka", stranka);
    if (error) return; // tabuľka ešte nebeží (0073) → ostáva localStorage
    const z = await supabase!.from("zaujemca_inzeratu").select("id, oznam_id, meno, telefon, email, poznamka, stit, karma, kedy").eq("stranka", stranka);
    const zaujem = new Map<string, Zaujemca[]>();
    for (const r of (z.data ?? []) as RiadokZaujemcu[]) {
      const l = zaujem.get(r.oznam_id) ?? [];
      l.push({ id: r.id, meno: r.meno, telefon: r.telefon ?? undefined, email: r.email ?? undefined, poznamka: r.poznamka ?? undefined, stit: r.stit ?? undefined, karma: r.karma ?? undefined, kedy: Date.parse(r.kedy) });
      zaujem.set(r.oznam_id, l);
    }
    const db = ((data ?? []) as Riadok[]).map((r) => ({ ...r.data, id: r.id, entita, zaujemcovia: (zaujem.get(r.id) ?? []).sort((a, b) => a.kedy - b.kedy) }));
    const ids = new Set(db.map((o) => o.id));
    const lenLokal = lokalne(entita).filter((o) => !ids.has(o.id));
    const v = [...lenLokal, ...db];
    pamat.set(entita, v); zDb.add(entita);
    ulozLokalne(entita, v); zmena();
    if (lenLokal.length) void zapisDoDb(entita, [], lenLokal);
  } finally { nacitava.delete(entita); }
}

const bezZaujemcov = ({ zaujemcovia: _z, ...o }: Oznam) => o;
/** zapíše rozdiel (nové / zmenené / zmazané) — záujemcovia idú zvlášť (pridajZaujemcu) */
async function zapisDoDb(entita: string, predtym: Oznam[], teraz: Oznam[]): Promise<void> {
  const stranka = strankaEntity(entita);
  if (!stranka) return;
  const stare = new Map(predtym.map((o) => [o.id, JSON.stringify(bezZaujemcov(o))]));
  const zmenene = teraz.filter((o) => stare.get(o.id) !== JSON.stringify(bezZaujemcov(o)));
  const prec = predtym.filter((o) => !teraz.some((x) => x.id === o.id)).map((o) => o.id);
  if (!zmenene.length && !prec.length) return;
  try {
    await pripojTestovaciuStranku(stranka); // testovacia stránka: tester = správca
    if (zmenene.length) {
      const riadky = await Promise.all(zmenene.map(async (o) => ({
        id: o.id, stranka, kategoria: o.kategoria, data: await bezDataUrl(bezZaujemcov(o), "oznamy"),
        vytvorene: new Date(o.vytvorene).toISOString(), upravene: new Date(o.upravene ?? o.vytvorene).toISOString(),
      })));
      const { error } = await supabase!.from("oznam_subjektu").upsert(riadky, { onConflict: "id" });
      if (error) throw error;
    }
    if (prec.length) {
      const { error } = await supabase!.from("oznam_subjektu").delete().in("id", prec);
      if (error) throw error;
    }
  } catch {
    toast("Oznam sa nepodarilo uložiť — vidíte ho len na tomto zariadení.");
  }
}

function uloz(entita: string, v: Oznam[]) {
  const predtym = nacitajOznamy(entita);
  pamat.set(entita, v);
  ulozLokalne(entita, v);
  zmena();
  void zapisDoDb(entita, predtym, v);
}

const DEN = 86400000;
/** oznam je na profile, kým nevyprší platnosť — potom ostáva len v správe */
export const oznamAktivny = (o: Oznam, teraz = Date.now()) =>
  teraz < o.vytvorene + o.platnostDni * DEN && !poUzavierke(o, teraz);
/** ponuka s uzávierkou prihlášok zíde z profilu sama, nech nikto neposiela žiadosť zbytočne */
export const poUzavierke = (o: Oznam, teraz = Date.now()) =>
  !!o.ponuka?.uzavierka && teraz > o.ponuka.uzavierka + DEN;   // do konca dňa uzávierky
/** koľko dní ešte visí (záporné = skončil) */
export const dniDoKonca = (o: Oznam, teraz = Date.now()) =>
  Math.max(0, Math.round((o.vytvorene + o.platnostDni * DEN - teraz) / DEN));

/** oznamy subjektu pre verejný profil — pripnuté navrch, potom najnovšie */
export function verejneOznamy(entita: string, kategoria: KategoriaOznamu = "oznam", teraz = Date.now()): Oznam[] {
  return nacitajOznamy(entita)
    .filter((o) => o.kategoria === kategoria && !o.obsadene && oznamAktivny(o, teraz))
    .sort((a, b) => Number(!!b.pripnute) - Number(!!a.pripnute) || b.vytvorene - a.vytvorene);
}
/** všetky oznamy subjektu pre správu — aj skončené, najnovšie hore */
export function vsetkyOznamy(entita: string, kategoria: KategoriaOznamu = "oznam"): Oznam[] {
  return nacitajOznamy(entita).filter((o) => o.kategoria === kategoria).sort((a, b) => b.vytvorene - a.vytvorene);
}
export function useOznamy(entita: string, kategoria: KategoriaOznamu = "oznam"): Oznam[] {
  useZmenyOznamov();
  return vsetkyOznamy(entita, kategoria);
}

// ---- INZERÁTY ----
/** beží = neobsadený a nevypršaný; limit sa počíta z týchto */
export const beziaceInzeraty = (entita: string, teraz = Date.now()) =>
  nacitajOznamy(entita).filter((o) => o.kategoria === "inzerat" && !o.obsadene && oznamAktivny(o, teraz));
export const limitInzeratov = (tier: number) => INZERAT_CFG.limity[tier] ?? 0;
/** miesto obsadené — inzerát zmizne z profilu, záujemcovia ostávajú v správe */
export function obsadInzerat(entita: string, id: string) {
  upravOznam(entita, id, { obsadene: Date.now() });
}
export function otvorInzeratZnova(entita: string, id: string, dni: number) {
  upravOznam(entita, id, { obsadene: undefined, vytvorene: Date.now(), platnostDni: dni });
}
/** záujemca zapíše len svoj kontakt (zaujemca_inzeratu) — inzerát samotný mení len správca. Vráti id alebo null. */
export async function pridajZaujemcu(entita: string, id: string, z: Omit<Zaujemca, "id" | "kedy">): Promise<string | null> {
  const inz = nacitajOznamy(entita).find((o) => o.id === id);
  if (!inz) return null;
  const novy: Zaujemca = { ...z, id: crypto.randomUUID(), kedy: Date.now() };
  const stranka = strankaEntity(entita);
  if (stranka) {
    const { error } = await supabase!.from("zaujemca_inzeratu").insert({
      id: novy.id, oznam_id: id, stranka, meno: novy.meno, telefon: novy.telefon ?? null, email: novy.email ?? null,
      poznamka: novy.poznamka ?? null, stit: novy.stit ?? null, karma: novy.karma ?? null,
    });
    if (error) return null;
  }
  zmenZaujemcov(entita, id, (l) => [...l, novy]);
  return novy.id;
}
export async function zrusZaujem(entita: string, id: string, zaujemcaId: string): Promise<void> {
  if (strankaEntity(entita)) await supabase!.from("zaujemca_inzeratu").delete().eq("id", zaujemcaId);
  zmenZaujemcov(entita, id, (l) => l.filter((z) => z.id !== zaujemcaId));
}
/** záujemcovia sú v cache pri inzeráte (správca ich vidí v Inzerátoch); do oznam_subjektu sa nezapisujú */
function zmenZaujemcov(entita: string, id: string, f: (l: Zaujemca[]) => Zaujemca[]) {
  const v = nacitajOznamy(entita).map((o) => (o.id === id ? { ...o, zaujemcovia: f(o.zaujemcovia ?? []) } : o));
  pamat.set(entita, v); ulozLokalne(entita, v); zmena();
}

export function pridajOznam(o: Omit<Oznam, "id" | "vytvorene">): Oznam {
  const novy: Oznam = { ...o, id: `oz-${Date.now()}`, vytvorene: Date.now() };
  uloz(o.entita, [novy, ...nacitajOznamy(o.entita)]);
  return novy;
}
export function upravOznam(entita: string, id: string, patch: Partial<Oznam>) {
  uloz(entita, nacitajOznamy(entita).map((o) => (o.id === id ? { ...o, ...patch, upravene: Date.now() } : o)));
}
export function zmazOznam(entita: string, id: string) {
  uloz(entita, nacitajOznamy(entita).filter((o) => o.id !== id));
}
/** pripnutie navrch — naraz len OZNAM_CFG.maxPripnutych, ostatné sa odopnú */
export function pripniOznam(entita: string, id: string, pripnut: boolean) {
  uloz(entita, nacitajOznamy(entita).map((o) =>
    o.id === id ? { ...o, pripnute: pripnut } : pripnut ? { ...o, pripnute: false } : o));
}
/** predĺženie platnosti bežiaceho oznamu — posunie začiatok, nie dĺžku */
export function predlzOznam(entita: string, id: string, dni: number) {
  upravOznam(entita, id, { vytvorene: Date.now(), platnostDni: dni });
}
