// OPRAVY 75 · Moje stránky (stránky, ktoré user spravuje), Konáš ako a Režim prezentácie.
// Stránky sú zatiaľ ukážkové (demo účet), v produkcii prídu z overených rolí účtu.
// Konáš ako určuje, pod kým ide dar, príspevok a skutok. Režim prezentácie skryje správu, role a DEV
// a pamätá sa do ukončenia. Uložené lokálne (useSyncExternalStore + localStorage).
import { useSyncExternalStore } from "react";
import { zaregistrujKluc, zmenene } from "@/lib/mojeData";
import type { Pozicia } from "@/features/rola/stav";
import { nastavDarcuFirmu } from "@/lib/devDarca";
import { supabase } from "@/lib/supabase";

export type Stranka = { k: string; i: string; n: string; typ: "charita" | "firma" | "tvorca" | "farnost"; /** kľúč prekladu */ rola: string; pozicia: Pozicia; bg: string; c: string; /** [kľúč prekladu, počet] */ info: [string, number?][] };
export const UKAZKOVE_STRANKY: Stranka[] = [
  { k: "pekaren", i: "PD", n: "Pekáreň Dobrota", typ: "firma", rola: "stranky.rola.majitel", pozicia: "b2b", bg: "var(--goldBg)", c: "var(--gold)", info: [["stranky.info.zamestnanci", 12], ["stranky.info.dorovnanie"]] },
  { k: "tvorca", i: "MK", n: "Martin Konaľ", typ: "tvorca", rola: "stranky.rola.vlastnik", pozicia: "tvorca", bg: "var(--bSoft)", c: "var(--blue)", info: [["stranky.info.retaz", 1], ["stranky.info.qr"]] },
  // KARTA 50 · §1: farnosť = ďalšia stránka (rovnako pribudnú ďalšie segmenty: stránka + voľba v Konáš ako + Spravovať › jeho Správa)
  { k: "farnost", i: "FT", n: "Farnosť Trenčín — mesto", typ: "farnost", rola: "stranky.rola.farar", pozicia: "charita", bg: "var(--btn)", c: "var(--ink)", info: [["stranky.info.zbierky", 2], ["stranky.info.oznamyFarnikov", 2]] },
];

// ---- stránky, ktoré účet naozaj spravuje (rpc moje_stranky, 0085b; od 0124 aj z Ľudí a s úrovňou) ----
// Testovacie stránky (UKAZKOVE_STRANKY) podľa DB roly. OPRAVY 393: skutočné farnosti, kde je človek farár alebo pomocník
// (Správa farnosti beží nad id stránky). Ostatné skutočné stránky zatiaľ nie — ich Správa je ešte napojená na testovacie dáta.
export type UrovenStranky = "farar" | "pomocnik";
type RiadokUctu = { id: string; nazov: string; typ: string; uroven?: UrovenStranky | null };
let zUctu: RiadokUctu[] | null = null;
let nacitavam = false;
export async function nacitajStrankyUctu(): Promise<void> {
  if (!supabase || nacitavam) return;
  nacitavam = true;
  const { data, error } = await supabase.rpc("moje_stranky");
  nacitavam = false;
  if (error) return; // neprihlásený alebo funkcia ešte nebeží (0085b)
  zUctu = (data ?? []) as RiadokUctu[];
  ver++; posl.forEach((f) => f());
}
const inicialy = (n: string) => n.replace(/^(Farnosť|Rímskokatolícka farnosť|Gréckokatolícka farnosť)\s+/i, "").split(/[\s—-]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
/** stránka farnosti pre Moje stránky a Správu (aj práve založená v registrácii) */
export const strankaFarnosti = (k: string, nazov: string, pomocnik = false): Stranka => ({ k, i: inicialy(nazov), n: nazov, typ: "farnost", rola: pomocnik ? "stranky.rola.pomocnik" : "stranky.rola.farar", pozicia: "charita", bg: "var(--btn)", c: "var(--ink)", info: [] });
function naStranku(r: RiadokUctu): Stranka | null {
  const vzor = UKAZKOVE_STRANKY.find((s) => s.k === r.id);
  const pomocnik = r.uroven === "pomocnik";
  if (vzor) return { ...vzor, rola: pomocnik ? "stranky.rola.pomocnik" : vzor.rola };
  // OPRAVY 402: aj skutočné charity (každá registrácia je nová stránka)
  if (r.typ === "charita") return strankaCharity(r.id, r.nazov, pomocnik);
  if (r.typ !== "farnost") return null;
  return strankaFarnosti(r.id, r.nazov, pomocnik);
}
/** OPRAVY 402: stránka charity pre Moje stránky a Správu (bez ukážkových čísel) */
export const strankaCharity = (k: string, n: string, pomocnik = false): Stranka => ({ k, i: inicialyOrg(n), n, typ: "charita", rola: pomocnik ? "stranky.rola.pomocnik" : "stranky.rola.spravca", pozicia: "charita", bg: "var(--gSoft)", c: "var(--gInk)", info: [] });
export const inicialyOrg = (n: string) => n.replace(/,?\s*(o\.\s?z\.|n\.\s?o\.|s\.\s?r\.\s?o\.|o\.\s?p\.\s?s\.)\s*$/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
/** OPRAVY 402: po registrácii charity — ktorú stránku má Profil otvoriť v Správe (raz) */
const KLUC_NOVA = "deed.novaStranka";
export function ulozNovuStranku(s: Stranka) { try { sessionStorage.setItem(KLUC_NOVA, JSON.stringify(s)); } catch { /* SS */ } }
export function novaStranka(): Stranka | null { try { return JSON.parse(sessionStorage.getItem(KLUC_NOVA) ?? "null") as Stranka | null; } catch { return null; } }
export function zabudniNovuStranku() { try { sessionStorage.removeItem(KLUC_NOVA); } catch { /* SS */ } }
/** stránky účtu z DB (null = ešte nenačítané / bez DB) */
export function useStrankyUctu(prihlaseny: boolean): Stranka[] | null {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  if (prihlaseny && zUctu == null) void nacitajStrankyUctu();
  return zUctu == null ? null : zUctu.map(naStranku).filter((x): x is Stranka => !!x);
}
/** OPRAVY 393: Farár (všetko) alebo Pomocník (Správa bez Nastavení a ľudí). Bez DB a pri demo vždy farár. */
/** OPRAVY 414 (3): nový názov stránky (zo „upraviť (test)“ v údajoch registra) — server 0131, zoznam stránok sa obnoví */
export async function premenujStranku(k: string, nazov: string): Promise<void> {
  if (zUctu) { zUctu = zUctu.map((x) => (x.id === k ? { ...x, nazov } : x)); ver++; posl.forEach((f) => f()); }
  if (!supabase) return;
  const { error } = await supabase.rpc("premenuj_stranku", { p_stranka: k, p_nazov: nazov });
  if (error && !/premenuj_stranku|PGRST202|42883/.test(`${error.code ?? ""} ${error.message ?? ""}`)) throw new Error(error.message);
}
/** OPRAVY 420: charita, za ktorú sa koná — ukážková alebo skutočná (účtu / novo založená ch-…), inak null */
export function strankaCharityPre(k: string, nazov?: string): Stranka | null {
  const vzor = UKAZKOVE_STRANKY.find((x) => x.k === k && x.typ === "charita");
  if (vzor) return vzor;
  const r = zUctu?.find((x) => x.id === k && x.typ === "charita");
  if (!r && !/^ch-/.test(k)) return null;
  return strankaCharity(k, nazov?.trim() || r?.nazov || "Charita");
}
/** OPRAVY 414: stránka účtu je charita (aj staršie id bez „ch-“) */
export const jeCharitaUctu = (k: string): boolean => !!zUctu?.some((x) => x.id === k && x.typ === "charita");
export const urovenStranky = (k: string): UrovenStranky => (zUctu?.find((x) => x.id === k)?.uroven === "pomocnik" ? "pomocnik" : "farar");
export function useUrovenStranky(k: string): UrovenStranky {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  return urovenStranky(k);
}

type Stav = { ako: string; prezentacia: boolean };
const KLUC = "deed.mojeStranky";
const ZAKLAD: Stav = { ako: "ja", prezentacia: false };
const posl = new Set<() => void>();
let ver = 0;
function nacitaj(): Stav { try { return { ...ZAKLAD, ...(JSON.parse(localStorage.getItem(KLUC) ?? "null") ?? {}) }; } catch { return ZAKLAD; } }
function uloz(s: Stav) { try { localStorage.setItem(KLUC, JSON.stringify(s)); } catch { /* LS */ } zmenene(KLUC); ver++; posl.forEach((f) => f()); }
zaregistrujKluc(KLUC, () => { ver++; posl.forEach((f) => f()); }); // Konáš ako + Režim prezentácie → účet (moje_data, 0084b)
export function useMojeStranky(): Stav {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  return nacitaj();
}
/** konáš ako: „ja" alebo kľúč stránky; firma → dar ide ako firemný */
export function nastavAko(k: string) {
  uloz({ ...nacitaj(), ako: k, prezentacia: false });
  nastavDarcuFirmu(UKAZKOVE_STRANKY.find((s) => s.k === k)?.typ === "firma");
}
export function prepniPrezentaciu() {
  const s = nacitaj(), p = !s.prezentacia;
  uloz({ ako: p ? "ja" : s.ako, prezentacia: p });
  if (p) nastavDarcuFirmu(false);
}
/** testovacia verzia (npm run dev, VITE_TEST=1 alebo ?dev) — OPRAVY 81 */
export { TESTOVACIA } from "@/lib/testovacia";

/** KARTA 34: koniec registrácie charity → appka otvorí Profil a v ňom Správu charity (jednorazový príznak) */
const KLUC_SPRAVA = "deed.otvorSpravuCharity";
/** KARTA 44: ciel „program" = Správa rovno na Program a predplatné */
export function otvorSpravuPoRegistracii(ciel: "prehlad" | "program" = "prehlad") { try { sessionStorage.setItem(KLUC_SPRAVA, ciel === "program" ? "program" : "1"); } catch { /* SS */ } }
export function cakaOtvorenieSpravy(): boolean { try { return !!sessionStorage.getItem(KLUC_SPRAVA); } catch { return false; } }
export function cakaProgramPoRegistracii(): boolean { try { return sessionStorage.getItem(KLUC_SPRAVA) === "program"; } catch { return false; } }

/** KARTA 44: koniec registrácie osoby → appka otvorí Profil (jednorazový príznak) */
const KLUC_PROFIL = "deed.otvorProfil";
export function otvorProfilPoRegistracii() { try { sessionStorage.setItem(KLUC_PROFIL, "1"); } catch { /* SS */ } }
export function vezmiOtvorenieProfilu(): boolean { try { const a = sessionStorage.getItem(KLUC_PROFIL) === "1"; sessionStorage.removeItem(KLUC_PROFIL); return a; } catch { return false; } }

/** KARTA 44: organizácia sa pridáva z osobného účtu — po prihlásení / registrácii osoby pokračuj registráciou organizácie */
const KLUC_ORG = "deed.reg.org";
export function cakajRegistraciuOrg(a: boolean) { try { if (a) sessionStorage.setItem(KLUC_ORG, "1"); else sessionStorage.removeItem(KLUC_ORG); } catch { /* SS */ } }
/** Moje stránky → „+ Pridať organizáciu“: App otvorí registráciu organizácie (charita alebo farnosť) z prihláseného účtu */
export const UDALOST_PRIDAT_ORG = "deed:pridat-organizaciu";
export const pridatOrganizaciu = () => window.dispatchEvent(new Event(UDALOST_PRIDAT_ORG));
export function cakaRegistraciaOrg(): boolean { try { return sessionStorage.getItem(KLUC_ORG) === "1"; } catch { return false; } }
/** OPRAVY 315: ťuk na upozornenie → Profil → Správa stránky na danom mieste (napr. Od veriacich, príspevok zvýraznený) */
export interface CielSpravy { stranka: string; sub: string; zvyrazni?: string }
let cielSpravy: CielSpravy | null = null;
export const UDALOST_SPRAVA = "deed:otvor-spravu";
export function otvorSpravuNa(c: CielSpravy) { cielSpravy = c; try { window.dispatchEvent(new Event(UDALOST_SPRAVA)); } catch { /* SSR */ } }
/** čítanie bez mazania (StrictMode volá inicializáciu dvakrát) */
export const cielSpravyPre = (stranka?: string): CielSpravy | null => (cielSpravy && (!stranka || cielSpravy.stranka === stranka) ? cielSpravy : null);
export function zrusCielSpravy() { cielSpravy = null; }
/** OPRAVY 316: môj profil (modul Profil, hlavná obrazovka) — napr. ťuk na kartu tvorcu vo vlastnej Reťazi dobra */
export function otvorMojProfil() { cielSpravy = null; try { window.dispatchEvent(new Event(UDALOST_SPRAVA)); } catch { /* SSR */ } }
export function zrusOtvorenieSpravy() { try { sessionStorage.removeItem(KLUC_SPRAVA); } catch { /* SS */ } }
