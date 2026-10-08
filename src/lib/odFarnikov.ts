// ============================================================
// KARTA 56I — veriaci pridáva sám (zelené + Pridať na verejnej stránke farnosti).
// Nastavenie farára: „Veriaci môžu pridávať oznamy" + poplatok = selfadd (viera/UserOznamy),
// „Čo smú veriaci pridať sami" = 8 prepínačov (predvolene všetky zapnuté) = oblasť farniksmie.
// Pridané položky = oblasť odfarnikov (KV stav farnosti, zrkadlo naboz_stav). Zverejní sa hneď, farár môže zmazať.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { nacitajStav, ulozStav, obnovOblast } from "@/features/viera/stav";

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

export type SmieFarnika = Partial<Record<DruhFarnika, boolean>>;
export const nacitajSmie = (id: string): SmieFarnika => nacitajStav<SmieFarnika>("farniksmie", id, {});
export const smie = (s: SmieFarnika, k: DruhFarnika) => s[k] !== false;

export interface PolozkaFarnika {
  id: string; k: DruhFarnika; t: string; s: string;
  /** meno z registrácie alebo „Bohu známy veriaci" */
  kto: string; cas: number; fotky?: string[];
  /** KARTA 57 D.2: farár opravil nadpis alebo text (veriaci dostane správu) */ upravil?: boolean;
  /** KARTA 57 D.4: koľkokrát to ľudia nahlásili (··· Nahlásiť, karta E.8) */ nahl?: number;
  /** KARTA 57 D.4: pri parte počet „Úprimnú sústrasť" (karta E.8) */ sus?: number;
  // ---- KARTA 57 E (verejná stránka) ----
  /** autor (účet) — „Upraviť · moje" vidí len on */ autor?: string; mesto?: string;
  /** prosba bez mena (sviečka namiesto krúžku) */ anon?: boolean;
  /** formulár veriaceho (úprava ho naplní) */ f?: FormularVeriaceho;
  /** Pozvať ľudí: 1 = Zúčastním sa, 2 = Prihlásiť sa (záväzne, limit) */ pozv?: 0 | 1 | 2; limit?: number;
  /** kto sa zúčastní / prihlásil, kto sa modlí, kto prejavil sústrasť, kto nahlásil (kľúče účtov) */
  ucast?: string[]; modl?: string[]; sustrast?: string[]; nahlasili?: string[];
  /** fotky z akcie: popisy fotiek, pár slov o akcii, kedy je ďalšia */ popisy?: string[]; text?: string; dalsia?: string;
  /** parte, svadba, jubileum z Editora oznámení: návrh a obrázok hotovej šablóny */
  editor?: import("@/components/EditorOznameni").PayloadEditora; obr?: string;
  /** autor to upravil */ upravene?: boolean;
}
export interface FormularVeriaceho { nad: string; txt: string; datum: string; cas: string; kde: string; umK: number; pozv: number; limit: string; anon: boolean }
/** počty pre farára aj stránku (staršie položky mali len číslo) */
export const pocetNahl = (x: PolozkaFarnika) => x.nahlasili?.length ?? x.nahl ?? 0;
export const pocetSus = (x: PolozkaFarnika) => x.sustrast?.length ?? x.sus ?? 0;
/** prepne kľúč účtu v zozname (Zúčastním sa, Modlím sa, Sústrasť, Nahlásiť) */
export function prepniVPolozke(id: string, pid: string, pole: "ucast" | "modl" | "sustrast" | "nahlasili", kto: string, len?: "pridat") {
  const x = odFarnikov(id).find((y) => y.id === pid);
  if (!x) return;
  const ma = (x[pole] ?? []).includes(kto);
  if (ma && len === "pridat") return;
  const chce = !ma; // OPRAVY 178: želaný stav, nie prepínač — na čerstvom zozname sa nastaví rovnako
  zmenZoznam(id, (l) => l.map((y) => {
    if (y.id !== pid) return y;
    const z = (y[pole] ?? []).filter((k) => k !== kto);
    return { ...y, [pole]: chce ? [...z, kto] : z };
  }));
}

let verzia = 0;
const posl = new Set<() => void>();
const zmena = () => { verzia++; posl.forEach((f) => f()); };
export function ulozSmie(id: string, s: SmieFarnika) { ulozStav("farniksmie", id, s); zmena(); }
export const odFarnikov = (id: string): PolozkaFarnika[] => nacitajStav<PolozkaFarnika[]>("odfarnikov", id, []);
/** OPRAVY 178: každá zmena zoznamu hneď lokálne a potom znova na čerstvom stave z DB (iní ľudia medzitým mohli pridať alebo reagovať) */
function zmenZoznam(id: string, f: (l: PolozkaFarnika[]) => PolozkaFarnika[]) {
  ulozStav("odfarnikov", id, f(odFarnikov(id))); zmena();
  void obnovOblast("odfarnikov", id).then((ok) => { if (ok) { ulozStav("odfarnikov", id, f(odFarnikov(id))); zmena(); } }, () => undefined);
}
export function pridajOdFarnika(id: string, p: PolozkaFarnika) { zmenZoznam(id, (l) => [p, ...l.filter((x) => x.id !== p.id)]); }
export function zmazOdFarnika(id: string, pid: string) { zmenZoznam(id, (l) => l.filter((x) => x.id !== pid)); }
/** KARTA 57 D.3: zmazať viac naraz */
export function zmazOdFarnikov(id: string, pids: string[]) { const z = new Set(pids); zmenZoznam(id, (l) => l.filter((x) => !z.has(x.id))); }
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
    nahlasene: l.filter((x) => pocetNahl(x) > 0).length,
    umysly: l.filter((x) => x.k === "umysel" && x.cas > v).length,
  };
}
/** prekreslenie pri zmene nastavenia alebo zoznamu */
export function useOdFarnikov(): number {
  return useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => verzia);
}
/** OPRAVY 178: pri otvorení stránky / Správy stiahni čerstvé príspevky a reakcie (aj od iných ľudí) */
export function useCerstveOdFarnikov(id: string) {
  useEffect(() => { let ziva = true; void obnovOblast("odfarnikov", id).then((ok) => { if (ok && ziva) zmena(); }, () => undefined); return () => { ziva = false; }; }, [id]);
}
