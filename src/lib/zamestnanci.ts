// ============================================================
// ZAMESTNANCI FIRMY — väzba človek ↔ firma. Vždy OBOJSTRANNÁ a dobrovoľná:
// buď firma pošle pozvánku a človek ju prijme, alebo človek požiada a firma
// ho potvrdí. Jednostranne sa nikto k nikomu nepripojí.
//
// Načo to je: firma dorovnáva dary SVOJICH ľudí a potrebuje vedieť, kto to je.
// Zamestnanec nedáva firme nič iné — firma nevidí, komu daroval mimo jej zbierok.
//
// Odpojiť sa dá kedykoľvek z oboch strán; väzba sa nemaže, len sa uzavrie
// (dovtedajšie dorovnané dary ostávajú platné, spätne sa nič neprepisuje).
//
// Zadanie 3 (Martin 6. 10.): väzba je IDENTITA → žije v DB (migrácia 0045, tabuľka firma_zamestnanec).
// Všetky kroky a pravidlá (kto smie pozvať, potvrdiť, odpojiť) rozhoduje server (rpc zamestnanec_akcia).
// Appka drží len kópiu toho, čo jej server vráti (vazby_zamestnancov). Bez databázy nič nerozhoduje —
// ukážka je prázdna a kroky hlásia, že bez databázy nejdú.
// Kľúče: firma aj osoba = verejné číslo účtu „U-…" (lib/firma, lib/identita), nikdy meno.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { rovnakaFirma, nazovFirmy } from "./firma";
import { mojeCisloUctu, rovnakeCislo } from "./identita";
import { toast } from "@/components/toast";

export type StavVazby =
  | "pozvany"     // firma pozvala, čaká sa na človeka
  | "ziadost"     // človek požiadal, čaká sa na firmu
  | "potvrdeny"   // obe strany súhlasili — väzba platí
  | "odmietnuty"  // jedna strana odmietla
  | "odpojeny";   // väzba bola ukončená

export interface Vazba {
  /** kľúč firmy = číslo jej účtu (U-…, lib/firma), NIKDY názov */
  firmaUcet: string;
  /** názov firmy len na zobrazenie */
  firma: string;
  /** kľúč človeka = verejné číslo jeho účtu (U-…), NIKDY meno */
  osoba: string;
  /** meno len na zobrazenie (doplní ho človek pri žiadosti alebo prijatí pozvánky) */
  meno?: string;
  stav: StavVazby;
  /** kto to začal — kvôli textom („pozvali ste" vs „požiadal vás") */
  zaciatok: "firma" | "osoba";
  kedy: number;
  potvrdene?: number;
  ukoncene?: number;
}

const posluchaci = new Set<() => void>();
let verzia = 0;
let kopia: Vazba[] = [];          // posledný stav zo servera (nie zdroj pravdy)
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
const emit = () => { verzia++; posluchaci.forEach((f) => f()); };
export function useZmenyVazieb() {
  useSyncExternalStore(subscribe, () => verzia, () => 0);
  useEffect(() => { void obnovVazby(); }, []);   // čerstvý stav zo servera pri otvorení obrazovky
}

type Riadok = { firma: string; osoba: string; meno: string | null; stav: StavVazby; zaciatok: "firma" | "osoba"; kedy: string; potvrdene: string | null; ukoncene: string | null };
const cas = (t: string | null) => (t ? Date.parse(t) : undefined);

/** načíta väzby, ktoré smiem vidieť (ja ako osoba + firmy, za ktoré konám) */
export async function obnovVazby(): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("vazby_zamestnancov");
  if (error) return;
  kopia = ((data ?? []) as Riadok[]).map((r) => ({
    firmaUcet: r.firma, firma: nazovFirmy(r.firma), osoba: r.osoba, meno: r.meno ?? undefined,
    stav: r.stav, zaciatok: r.zaciatok, kedy: cas(r.kedy) ?? 0, potvrdene: cas(r.potvrdene), ukoncene: cas(r.ukoncene),
  }));
  emit();
}

export function nacitaj(): Vazba[] { return kopia; }

const rovnakaOsoba = (a: string, b: string) => rovnakeCislo(a, b);
/** živá väzba = tá, ktorá ešte nie je uzavretá */
const ziva = (x: Vazba) => x.stav === "pozvany" || x.stav === "ziadost" || x.stav === "potvrdeny";

/** krok na serveri; true = prešiel. Chybu ukáže sám (hláška servera). */
async function akcia(a: "pozvi" | "poziadaj" | "potvrd" | "odmietni" | "odpoj", firma: string, osoba?: string, meno?: string): Promise<boolean> {
  if (!supabase) { toast("Väzbu so zamestnávateľom drží server — bez databázy sa v ukážke nedá."); return false; }
  const { error } = await supabase.rpc("zamestnanec_akcia", { p_akcia: a, p_firma: firma, p_osoba: osoba ?? null, p_meno: meno ?? null });
  if (error) { toast(error.message); return false; }
  await obnovVazby();
  return true;
}

/** firma (číslo jej účtu) pozýva človeka podľa čísla jeho účtu (z vizitky / QR).
 *  Vo všetkých funkciách nižšie je `firma` = číslo účtu firmy, nie názov. */
export const pozvi = (firma: string, osoba: string) => akcia("pozvi", firma, osoba);
/** človek žiada o pripojenie k firme (osoba = jeho číslo účtu, meno len na zobrazenie) */
export const poziadaj = (firma: string, _osoba: string, meno?: string) => akcia("poziadaj", firma, undefined, meno);
/** druhá strana súhlasí — až tým väzba platí (človek pri prijatí doplní svoje meno na zobrazenie) */
export const potvrd = (firma: string, osoba: string, meno?: string) => akcia("potvrd", firma, osoba, meno);
export const odmietni = (firma: string, osoba: string) => akcia("odmietni", firma, osoba);
/** ukončenie platnej väzby — z oboch strán, kedykoľvek */
export const odpoj = (firma: string, osoba: string) => akcia("odpoj", firma, osoba);

/** väzby firmy — čakajúce hore, potvrdení pod nimi */
export function vazbyFirmy(firma: string): Vazba[] {
  const poradie: Record<StavVazby, number> = { ziadost: 0, pozvany: 1, potvrdeny: 2, odmietnuty: 3, odpojeny: 4 };
  return kopia.filter((x) => rovnakaFirma(x.firmaUcet, firma)).sort((a, b) => poradie[a.stav] - poradie[b.stav] || b.kedy - a.kedy);
}
/** potvrdení zamestnanci — nad nimi beží zamestnanecké dorovnanie */
export const zamestnanci = (firma: string): Vazba[] =>
  kopia.filter((x) => rovnakaFirma(x.firmaUcet, firma) && x.stav === "potvrdeny");

/** väzba človeka — jedna živá naraz (kto robí u dvoch firiem, rieši sa neskôr) */
export const vazbaOsoby = (osoba: string): Vazba | null =>
  kopia.find((x) => rovnakaOsoba(x.osoba, osoba) && ziva(x)) ?? null;

/** všetky živé väzby človeka — karta 24 · 2i doplnok: viac firiem naraz (brigádnik v 2 firmách) */
export const vazbyOsoby = (osoba: string): Vazba[] =>
  kopia.filter((x) => rovnakaOsoba(x.osoba, osoba) && ziva(x)).sort((a, b) => a.kedy - b.kedy);
export function useVazbyOsoby(osoba: string): Vazba[] {
  useZmenyVazieb();
  return vazbyOsoby(osoba);
}

/** je tento človek potvrdeným zamestnancom firmy? (zobrazenie; dorovnanie to overuje na serveri) */
export const jeZamestnanec = (firma: string, osoba: string): boolean =>
  kopia.some((x) => rovnakaFirma(x.firmaUcet, firma) && rovnakaOsoba(x.osoba, osoba) && x.stav === "potvrdeny");

export function useVazbyFirmy(firma: string): Vazba[] {
  useZmenyVazieb();
  return vazbyFirmy(firma);
}
export function useVazbaOsoby(osoba: string): Vazba | null {
  useZmenyVazieb();
  return vazbaOsoby(osoba);
}

/** meno prihláseného človeka — LEN na zobrazenie v zázname dorovnania, nikdy na väzbu */
export function menoDarcu(): string {
  try { return localStorage.getItem("deed.ja.meno") ?? ""; } catch { return ""; }
}
/** je práve prihlásený človek potvrdeným zamestnancom tejto firmy? — podľa čísla účtu, nie mena */
export const somZamestnanec = (firma: string): boolean => {
  const ja = mojeCisloUctu();
  return !!ja && jeZamestnanec(firma, ja);
};
