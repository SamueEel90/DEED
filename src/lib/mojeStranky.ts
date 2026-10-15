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
  { k: "svetlo", i: "SP", n: "Svetlo pomoci o.z.", typ: "charita", rola: "stranky.rola.spravca", pozicia: "charita", bg: "var(--gSoft)", c: "var(--gInk)", info: [["stranky.info.zbierky", 3], ["stranky.info.ziadosti", 2]] },
  { k: "pekaren", i: "PD", n: "Pekáreň Dobrota", typ: "firma", rola: "stranky.rola.majitel", pozicia: "b2b", bg: "var(--goldBg)", c: "var(--gold)", info: [["stranky.info.zamestnanci", 12], ["stranky.info.dorovnanie"]] },
  { k: "tvorca", i: "MK", n: "Martin Konaľ", typ: "tvorca", rola: "stranky.rola.vlastnik", pozicia: "tvorca", bg: "var(--bSoft)", c: "var(--blue)", info: [["stranky.info.retaz", 1], ["stranky.info.qr"]] },
  // KARTA 50 · §1: farnosť = ďalšia stránka (rovnako pribudnú ďalšie segmenty: stránka + voľba v Konáš ako + Spravovať › jeho Správa)
  { k: "farnost", i: "FT", n: "Farnosť Trenčín — mesto", typ: "farnost", rola: "stranky.rola.farar", pozicia: "charita", bg: "var(--btn)", c: "var(--ink)", info: [["stranky.info.zbierky", 2], ["stranky.info.oznamyFarnikov", 2]] },
];

// ---- stránky, ktoré účet naozaj spravuje (rpc moje_stranky, 0085b) ----
// Správa je zatiaľ napojená na 4 testovacie stránky (rola/stav STRANKA_POZICIE) → ukážu sa len tie z nich,
// ku ktorým má účet v DB rolu. Iná stránka by otvorila cudzie (testovacie) dáta, preto ju zatiaľ vynecháme.
let zUctu: string[] | null = null;
let nacitavam = false;
export async function nacitajStrankyUctu(): Promise<void> {
  if (!supabase || nacitavam) return;
  nacitavam = true;
  const { data, error } = await supabase.rpc("moje_stranky");
  nacitavam = false;
  if (error) return; // neprihlásený alebo funkcia ešte nebeží (0085b)
  zUctu = ((data ?? []) as { id: string }[]).map((x) => x.id);
  ver++; posl.forEach((f) => f());
}
/** stránky účtu z DB (null = ešte nenačítané / bez DB) */
export function useStrankyUctu(prihlaseny: boolean): Stranka[] | null {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  if (prihlaseny && zUctu == null) void nacitajStrankyUctu();
  return zUctu == null ? null : UKAZKOVE_STRANKY.filter((s) => zUctu!.includes(s.k));
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
export function cakaRegistraciaOrg(): boolean { try { return sessionStorage.getItem(KLUC_ORG) === "1"; } catch { return false; } }
/** OPRAVY 315: ťuk na upozornenie → Profil → Správa stránky na danom mieste (napr. Od veriacich, príspevok zvýraznený) */
export interface CielSpravy { stranka: string; sub: string; zvyrazni?: string }
let cielSpravy: CielSpravy | null = null;
export const UDALOST_SPRAVA = "deed:otvor-spravu";
export function otvorSpravuNa(c: CielSpravy) { cielSpravy = c; try { window.dispatchEvent(new Event(UDALOST_SPRAVA)); } catch { /* SSR */ } }
/** čítanie bez mazania (StrictMode volá inicializáciu dvakrát) */
export const cielSpravyPre = (stranka?: string): CielSpravy | null => (cielSpravy && (!stranka || cielSpravy.stranka === stranka) ? cielSpravy : null);
export function zrusCielSpravy() { cielSpravy = null; }
export function zrusOtvorenieSpravy() { try { sessionStorage.removeItem(KLUC_SPRAVA); } catch { /* SS */ } }
