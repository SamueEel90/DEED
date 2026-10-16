// ============================================================
// KARTA 56I — veriaci pridáva sám (zelené + Pridať na verejnej stránke farnosti).
// Nastavenie farára: „Veriaci môžu pridávať oznamy" + poplatok = selfadd (viera/UserOznamy),
// „Čo smú veriaci pridať sami" = 8 prepínačov (predvolene všetky zapnuté) = oblasť farniksmie.
// Pridané položky = oblasť odfarnikov (KV stav farnosti, zrkadlo naboz_stav). Zverejní sa hneď, farár môže zmazať.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { nacitajStav, ulozStav, ulozStavIsto, obnovOblast } from "@/features/viera/stav";
import { zaregistrujKluc, zmenene } from "./mojeData";
import { supabase } from "./supabase";

export type DruhFarnika = "parte" | "svadba" | "ine" | "oznam" | "udalost" | "umysel" | "fotky" | "modlitba";
/** k · názov · popis v Správe · popis vo výbere veriaceho · vždy zadarmo */
export const DRUHY_FARNIKA: { k: DruhFarnika; t: string; s: string; sv: string; zadarmo: boolean }[] = [
  { k: "parte", t: "Parte", s: "smútočné oznámenie · vždy zadarmo", sv: "smútočné oznámenie", zadarmo: true },
  { k: "svadba", t: "Svadobné oznámenie", s: "sobáš, pozvanie", sv: "sobáš, pozvanie", zadarmo: false },
  { k: "ine", t: "Jubileum a iné oznámenie", s: "výročie, poďakovanie, narodenie", sv: "výročie, poďakovanie, narodenie", zadarmo: false },
  { k: "oznam", t: "Krátky oznam", s: "len text", sv: "len text · napr. stratené kľúče", zadarmo: false },
  { k: "udalost", t: "Udalosť", s: "púť, stretnutie · dátum, čas, miesto", sv: "púť, stretnutie · dátum, čas, miesto", zadarmo: false },
  { k: "umysel", t: "Úmysel na omšu", s: "vy potom potvrdíte čas omše", sv: "za koho sa má slúžiť omša", zadarmo: false },
  { k: "fotky", t: "Fotky z akcie", s: "do galérie farnosti", sv: "do galérie farnosti", zadarmo: false },
  { k: "modlitba", t: "Prosba o modlitbu", s: "aj bez mena · vždy zadarmo", sv: "aj bez mena", zadarmo: true },
];
/** Parte, Svadba, Jubileum idú cez Editor oznámení — zatiaľ nenapojený (PLACEBO — karta 56I) */
export const CEZ_EDITOR: DruhFarnika[] = ["parte", "svadba", "ine"];
/** KARTA 57C: blok živej stránky, kde sa príspevok ukáže — [data-blok, názov bloku] (úmysel nikam) */
export const BLOK_DRUHU: Partial<Record<DruhFarnika, [string, string]>> = { modlitba: ["mod", "Modli sa s nami"], oznam: ["ver", "Od veriacich"], udalost: ["prid", "Príď a zaži s nami"], fotky: ["prid", "Príď a zaži s nami"], parte: ["spom", "Spomíname"], svadba: ["tes", "Teš sa s nami"], ine: ["tes", "Teš sa s nami"] };

/** OPRAVY 310: každá kategória má 3 stupne — Povolené (zverejní sa hneď) · Po schválení (farár zverejní) · Zakázané (+ Pridať sa neukáže).
 *  Staršie uloženie: true = Povolené, false = Zakázané. Úmysel na omšu len Povolené · Zakázané. Ukladá sa pri farnosti na serveri (naboz_stav). */
export type Stupen = "povolene" | "schvalenie" | "zakazane";
export type SmieFarnika = Partial<Record<DruhFarnika, boolean | Stupen>>;
const PREDVOLENE: Record<DruhFarnika, Stupen> = { parte: "povolene", svadba: "povolene", ine: "povolene", umysel: "povolene", modlitba: "schvalenie", oznam: "schvalenie", udalost: "schvalenie", fotky: "schvalenie" };
export const nacitajSmie = (id: string): SmieFarnika => nacitajStav<SmieFarnika>("farniksmie", id, {});
export function stupen(s: SmieFarnika, k: DruhFarnika): Stupen {
  const v = s[k];
  const st: Stupen = v === true ? "povolene" : v === false ? "zakazane" : v ?? PREDVOLENE[k];
  return k === "umysel" && st === "schvalenie" ? "povolene" : st;
}
export const smie = (s: SmieFarnika, k: DruhFarnika) => stupen(s, k) !== "zakazane";
/** OPRAVY 310: kam sa príspevok ukáže (nastavenie farára) */
export const KAM_DRUHU: Record<DruhFarnika, string> = {
  parte: "ukáže sa v Spomíname · zo šablóny", svadba: "ukáže sa v Teš sa s nami · zo šablóny", ine: "ukáže sa v Teš sa s nami · výročie, poďakovanie",
  modlitba: "ukáže sa v Modli sa s nami · môže byť ako „Bohu známy veriaci“, vy autora vidíte", oznam: "ukáže sa dole v bloku Od veriacich (nie medzi oznamami farnosti)",
  udalost: "ukáže sa v Príď a zaži s nami · dátum, čas, miesto", fotky: "pribudnú k akcii v Príď a zaži s nami", umysel: "ide len vám, nikde sa nezverejní · potvrdíte čas omše",
};
/** príspevok je na stránke (nečaká na schválenie a nebol zamietnutý) */
export const naStranke = (x: PolozkaFarnika) => !x.stav;

export interface PolozkaFarnika {
  id: string; k: DruhFarnika; t: string; s: string;
  /** meno z registrácie alebo „Bohu známy veriaci" */
  kto: string; cas: number; fotky?: string[];
  /** KARTA 57 D.2: farár opravil nadpis alebo text (veriaci dostane správu) */ upravil?: boolean;
  /** KARTA 57 D.4: koľkokrát to ľudia nahlásili (··· Nahlásiť, karta E.8) */ nahl?: number;
  /** KARTA 57 D.4: pri parte počet „Úprimnú sústrasť" (karta E.8) */ sus?: number;
  // ---- KARTA 57 E (verejná stránka) ----
  /** autor (účet) — „Upraviť · moje" vidí len on */ autor?: string; mesto?: string;
  /** OPRAVY 196: fotka z profilu autora (pri pridaní) */ autorFoto?: string;
  /** prosba bez mena (sviečka namiesto krúžku) */ anon?: boolean;
  /** formulár veriaceho (úprava ho naplní) */ f?: FormularVeriaceho;
  /** Pozvať ľudí: 1 = Zúčastním sa, 2 = Prihlásiť sa (záväzne, limit) */ pozv?: 0 | 1 | 2; limit?: number;
  /** kto sa zúčastní / prihlásil, kto sa modlí, kto prejavil sústrasť, kto nahlásil (kľúče účtov) */
  ucast?: string[]; modl?: string[]; sustrast?: string[]; nahlasili?: string[];
  /** KARTA 57C §1: Blahoželám (svadba, jubileum) · mená prihlásených pre „Kto sa prihlásil“ (kľúč účtu → meno) */
  blaho?: string[]; mena?: Record<string, string>;
  /** fotky z akcie: popisy fotiek, pár slov o akcii, kedy je ďalšia */ popisy?: string[]; text?: string; dalsia?: string;
  /** parte, svadba, jubileum z Editora oznámení: návrh a obrázok hotovej šablóny */
  editor?: import("@/components/EditorOznameni").PayloadEditora; obr?: string;
  /** autor to upravil */ upravene?: boolean;
  // ---- OPRAVY 176: úmysel na omšu (len farár) ----
  /** zapísaný na omšu z rozpisu: dátum, kód omše, čas pri zápise */ zapis?: { d: string; kod: number; t: string };
  /** odslúžené (čas) */ odsluzene?: number;
  /** posledná správa veriacemu */ sprava?: { text: string; cas: number };
  /** zapísal farár (osobne alebo telefonicky) — veriaci nemá účet v appke */ osobne?: boolean;
  /** OPRAVY 310: čaká na schválenie farára / farár ho nezverejnil; bez stavu = na stránke */ stav?: "caka" | "zamietnute";
  /** kedy farár rozhodol (zverejnil alebo zamietol) */ rozhodnute?: number;
}
export interface FormularVeriaceho { nad: string; txt: string; datum: string; cas: string; kde: string; umK: number; pozv: number; limit: string; anon: boolean;
  /** OPRAVY 179: krátky oznam · Platí do (index do PLATI_VERIACI) */ plat?: number }
/** OPRAVY 179: rovnaké voľby ako u farára — Bez konca · 7 · 14 · 30 dní */
export const PLATI_VERIACI: [string, number][] = [["Bez konca", 0], ["7 dní", 7], ["14 dní", 14], ["30 dní", 30]];
/** krátky oznam po termíne zo stránky zmizne (u farára ostane) */
export const vyprsal = (x: PolozkaFarnika, teraz: number) => { const d = x.k === "oznam" ? PLATI_VERIACI[x.f?.plat ?? 0]?.[1] ?? 0 : 0; return d > 0 && x.cas + d * 864e5 < teraz; };
/** počty pre farára aj stránku (staršie položky mali len číslo) */
export const pocetNahl = (x: PolozkaFarnika) => x.nahlasili?.length ?? x.nahl ?? 0;
export const pocetSus = (x: PolozkaFarnika) => x.sustrast?.length ?? x.sus ?? 0;
/** prepne kľúč účtu v zozname (Zúčastním sa, Modlím sa, Sústrasť, Nahlásiť) */
export type PoleReakcie = "ucast" | "modl" | "sustrast" | "nahlasili" | "blaho";
export function prepniVPolozke(id: string, pid: string, pole: PoleReakcie, kto: string, len?: "pridat", meno?: string) {
  const x = odFarnikov(id).find((y) => y.id === pid);
  if (!x) return;
  const ma = (x[pole] ?? []).includes(kto);
  if (ma && len === "pridat") return;
  const chce = !ma; // OPRAVY 178: želaný stav, nie prepínač — na čerstvom zozname sa nastaví rovnako
  zmenZoznam(id, (l) => l.map((y) => {
    if (y.id !== pid) return y;
    const z = (y[pole] ?? []).filter((k) => k !== kto);
    return { ...y, [pole]: chce ? [...z, kto] : z, ...(meno && chce ? { mena: { ...y.mena, [kto]: meno } } : {}) };
  }));
}

let verzia = 0;
const posl = new Set<() => void>();
const zmena = () => { verzia++; posl.forEach((f) => f()); };
export function ulozSmie(id: string, s: SmieFarnika) { ulozStav("farniksmie", id, s); zmena(); }
// ---- OPRAVY 330 (0099): čakajúce a zamietnuté nie sú vo verejnom poli na serveri — číta ich len autor a farár (odfarnikov_caka).
// Lokálne: verejné pole (naboz_stav) + vlastná kópia čakajúcich (len toto zariadenie, nikdy do naboz_stav). Bez DB všetko ostáva v poli.
const klucCaka = (id: string) => `deed.odfcaka.${id}`;
const cakaLok = (id: string): PolozkaFarnika[] => { try { return JSON.parse(localStorage.getItem(klucCaka(id)) || "[]") as PolozkaFarnika[]; } catch { return []; } };
const ulozCakaLok = (id: string, l: PolozkaFarnika[]) => { try { localStorage.setItem(klucCaka(id), JSON.stringify(l)); } catch { /* LS */ } };
const maStav = (x: PolozkaFarnika) => x.stav === "caka" || x.stav === "zamietnute";
/** stiahne moje čakajúce (autor) alebo všetky čakajúce stránky (farár); server pustí len tieto */
export async function obnovCakajuce(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.from("odfarnikov_caka").select("id,data,stav,rozhodnute").eq("stranka", id);
  if (error || !data) return false;
  ulozCakaLok(id, (data as { id: string; data: PolozkaFarnika; stav: string; rozhodnute: string | null }[])
    .filter((r) => r.stav === "caka" || r.stav === "zamietnute")
    .map((r) => ({ ...r.data, id: r.id, stav: r.stav as "caka" | "zamietnute", ...(r.rozhodnute ? { rozhodnute: Date.parse(r.rozhodnute) } : {}) })));
  return true;
}
export const odFarnikov = (id: string): PolozkaFarnika[] => {
  const pub = nacitajStav<PolozkaFarnika[]>("odfarnikov", id, []);
  if (!supabase) return pub;
  const ids = new Set(pub.map((x) => x.id));
  return [...cakaLok(id).filter((x) => !ids.has(x.id)), ...pub];
};
/** OPRAVY 178: každá zmena zoznamu hneď lokálne a potom znova na čerstvom stave z DB (iní ľudia medzitým mohli pridať alebo reagovať) */
function zmenZoznam(id: string, f: (l: PolozkaFarnika[]) => PolozkaFarnika[]) {
  zapisLok(id, f(odFarnikov(id))); zmena();
  void obnovOblast("odfarnikov", id).then((ok) => { if (ok) { zapisLok(id, f(odFarnikov(id))); zmena(); void obnovCakajuce(id).then((o) => { if (o) zmena(); }, () => undefined); } }, () => undefined);
}
/** OPRAVY 330: zápis poľa — s DB server čakajúce z poľa vyberie (0099), lokálne ostanú v kópii čakajúcich */
function zapisLok(id: string, l: PolozkaFarnika[]) {
  if (supabase) { const ids = new Set(l.map((x) => x.id)); ulozCakaLok(id, [...l.filter(maStav), ...cakaLok(id).filter((x) => !ids.has(x.id))].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)); }
  ulozStav("odfarnikov", id, l);
}
/** OPRAVY 273: pridanie / úprava, na ktoré sa čaká — hláška „Zverejnené“ až po naozajstnom uložení. Vráti chybu alebo null. */
export async function zapisOdFarnikaIsto(id: string, p: PolozkaFarnika, uprava = false): Promise<string | null> {
  await obnovOblast("odfarnikov", id).catch(() => false); // čerstvý zoznam (iní medzitým mohli pridať)
  const l = odFarnikov(id);
  const nove = uprava ? l.map((x) => (x.id === p.id ? { ...x, ...p } : x)) : [p, ...l.filter((x) => x.id !== p.id)];
  if (supabase) ulozCakaLok(id, [...nove.filter(maStav), ...cakaLok(id).filter((x) => !nove.some((y) => y.id === x.id))]); // OPRAVY 330
  const e = await ulozStavIsto("odfarnikov", id, nove);
  zmena();
  if (!e) void obnovCakajuce(id).then((o) => { if (o) zmena(); }, () => undefined);
  return e;
}
export function pridajOdFarnika(id: string, p: PolozkaFarnika) { zmenZoznam(id, (l) => [p, ...l.filter((x) => x.id !== p.id)]); }
export function zmazOdFarnika(id: string, pid: string) { zmazOdFarnikov(id, [pid]); }
/** KARTA 57 D.3: zmazať viac naraz · OPRAVY 330: čakajúce a zamietnuté zmaže server (zmaz_cakajuci) */
export function zmazOdFarnikov(id: string, pids: string[]) {
  const z = new Set(pids);
  if (supabase) {
    const caka = cakaLok(id).filter((x) => z.has(x.id));
    if (caka.length) { ulozCakaLok(id, cakaLok(id).filter((x) => !z.has(x.id))); caka.forEach((x) => { void supabase!.rpc("zmaz_cakajuci", { p_stranka: id, p_id: x.id }).then(() => undefined, () => undefined); }); }
  }
  zmenZoznam(id, (l) => l.filter((x) => !z.has(x.id)));
}
/** OPRAVY 310: farár zverejní / nezverejní príspevky, ktoré čakajú na schválenie */
export function rozhodniOdFarnikov(id: string, pids: string[], zverejnit: boolean) {
  const z = new Set(pids), t = Date.now();
  if (supabase) { // OPRAVY 330: rozhodne server (0099) — zverejnený prvok pribudne do verejného poľa
    const caka = cakaLok(id);
    ulozCakaLok(id, zverejnit ? caka.filter((x) => !z.has(x.id)) : caka.map((x) => (z.has(x.id) ? { ...x, stav: "zamietnute" as const, rozhodnute: t } : x)));
    if (zverejnit) ulozStav("odfarnikov", id, [...caka.filter((x) => z.has(x.id)).map((x) => ({ ...x, stav: undefined, rozhodnute: t })), ...nacitajStav<PolozkaFarnika[]>("odfarnikov", id, [])]);
    zmena();
    void supabase.rpc("rozhodni_od_veriacich", { p_stranka: id, p_ids: pids, p_zverejnit: zverejnit }).then(async () => {
      await obnovOblast("odfarnikov", id).catch(() => false); await obnovCakajuce(id).catch(() => false); zmena();
    }, () => undefined);
    return;
  }
  zmenZoznam(id, (l) => l.map((x) => (z.has(x.id) ? { ...x, stav: zverejnit ? undefined : "zamietnute", rozhodnute: t } : x)));
}
/** KARTA 57 D.2: oprava farára (nadpis, text) */
export function upravOdFarnika(id: string, pid: string, patch: Partial<PolozkaFarnika>) { zmenZoznam(id, (l) => l.map((x) => (x.id === pid ? { ...x, ...patch } : x))); }

/** KARTA 57 D.4–D.5: nastavenie farára (upozornenia) a čas, keď naposledy otvoril Od veriacich */
export interface NastavenieOdVeriacich { upozornit: boolean; videne: number }
export const nastavenieOdVeriacich = (id: string): NastavenieOdVeriacich => ({ upozornit: true, videne: 0, ...nacitajStav<Partial<NastavenieOdVeriacich>>("odfnast", id, {}) });
export function ulozNastavenieOdVeriacich(id: string, n: Partial<NastavenieOdVeriacich>) { ulozStav("odfnast", id, { ...nastavenieOdVeriacich(id), ...n }); zmena(); }
/** Treba vybaviť: nové príspevky, nahlásené, nové úmysly */
export function pocetyOdVeriacich(id: string) {
  const l = odFarnikov(id), v = nastavenieOdVeriacich(id).videne;
  return {
    nove: l.filter((x) => x.k !== "umysel" && x.cas > v).length,
    caka: l.filter((x) => x.stav === "caka").length, // OPRAVY 310
    nahlasene: l.filter((x) => pocetNahl(x) > 0).length,
    // OPRAVY 176: úmysly, ktoré ešte nie sú zapísané na omšu
    umysly: l.filter((x) => x.k === "umysel" && !x.zapis && !x.odsluzene).length,
  };
}
/** prekreslenie pri zmene nastavenia alebo zoznamu */
export function useOdFarnikov(): number {
  return useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => verzia);
}
/** OPRAVY 178: pri otvorení stránky / Správy stiahni čerstvé príspevky a reakcie (aj od iných ľudí) */
export function useCerstveOdFarnikov(id: string) {
  useEffect(() => { let ziva = true; void Promise.all([obnovOblast("odfarnikov", id), obnovCakajuce(id)]).then(([a, b]) => { if ((a || b) && ziva) zmena(); }, () => undefined); return () => { ziva = false; }; }, [id]);
}

// ---- OPRAVY 310: veriaci — moje príspevky, ktoré čakali na schválenie (upozornenie „Farár zverejnil váš príspevok“) ----
// Osobné → do účtu (moje_data, 0084b): [{ stranka, id, t, cas }]. Rozhodnutie sa číta z príspevku farnosti (stav, rozhodnute).
export interface MojeCakajuce { stranka: string; id: string; t: string; cas: number }
const KLUC_CAKA = "deed.odfarnikov.cakajuce";
export const mojeCakajuce = (): MojeCakajuce[] => { try { return JSON.parse(localStorage.getItem(KLUC_CAKA) || "[]") as MojeCakajuce[]; } catch { return []; } };
export function pridajMojeCakajuce(c: MojeCakajuce) {
  try { localStorage.setItem(KLUC_CAKA, JSON.stringify([c, ...mojeCakajuce().filter((x) => x.id !== c.id)].slice(0, 50))); } catch { /* LS */ }
  zmenene(KLUC_CAKA); zmena();
}
zaregistrujKluc(KLUC_CAKA, () => zmena());
/** stiahne čerstvé príspevky farností, kde niečo čaká (zvonček) */
export function obnovMojeCakajuce() { [...new Set(mojeCakajuce().map((c) => c.stranka))].forEach((st) => { void Promise.all([obnovOblast("odfarnikov", st), obnovCakajuce(st)]).then(([a, b]) => { if (a || b) zmena(); }, () => undefined); }); }
