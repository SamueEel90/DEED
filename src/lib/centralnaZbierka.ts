// ============================================================
// KARTA 39 · bod 3 — Centrálna zbierka charity (od P1).
// Na celú činnosť · nikdy na Domove · stále hore na stránke charity · nie je zapečatená.
// DB: profil_stranky.centralna (migrácia 0032). Bez DB drží appka údaje v pamäti relácie.
// ============================================================
import { bezDataUrl } from "./uploadFoto";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import type { MediumZbierky } from "./novaZbierka";
import { jeVzor, vzorData } from "@/lib/vzorStranky";

export interface CentralnaZbierka {
  /** textové polia: hlavný text + pokračovanie po „… viac" */
  popis: string; popis2: string;
  /** galéria; kým je prázdna, ukáže sa titulná fotka profilu s logom */
  media: MediumZbierky[];
  /** rýchle sumy EUR (index sady) */
  sada: number;
  /** dary v EURC áno / nie + sada */
  eurc: boolean; sadaE: number;
  /** iný ako hlavný účet — len po overovacej platbe; null = hlavný účet z registrácie */
  ucet: string | null;
  /** KARTA 56B · hlavná zbierka farnosti: kedy bola spustená (ISO). Charita: nepoužíva sa (centrálna beží od P1). */
  spustena?: string | null;
  /** OPRAVY 160/2 · názov hlavnej zbierky (najviac 40 znakov) — všade, aj na profile; prázdny = „Hlavná zbierka" */
  nazov?: string;
  /** Martin 13:11 · hlavná zbierka farnosti sa počíta po kalendárnych rokoch: 1. januára začne ukazovateľ od nuly.
   *  Dary sa nemažú (čo sa počíta, existuje ako pohyb) — mení sa len, odkedy sa sčítavajú. */
  rocne?: boolean;
}
export const HLAVNA_NAZOV_MAX = 40;
export const nazovHlavnej = (c?: Pick<CentralnaZbierka, "nazov"> | null) => c?.nazov?.trim() || "Hlavná zbierka";
export const CENTRALNA_TEXT = "<p>Podporte našu činnosť ako celok. Peniaze idú tam, kde sú práve najviac potrebné.</p>";
export const prazdnaCentralna = (): CentralnaZbierka => ({ popis: CENTRALNA_TEXT, popis2: "", media: [], sada: 1, eurc: true, sadaE: 0, ucet: null });
/** OPRAVY 160/3 · hlavná zbierka (Viera) začína prázdna — bez predvyplneného textu charity */
export const prazdnaHlavna = (): CentralnaZbierka => ({ ...prazdnaCentralna(), popis: "", nazov: "" });

const pamat = new Map<string, CentralnaZbierka>();
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyCentralnej = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);

export const centralnaZPamate = (stranka: string): CentralnaZbierka | null => (jeVzor(stranka) ? vzorData<CentralnaZbierka>(`${stranka}:centralna`) ?? null : pamat.get(stranka) ?? null);

/** OPRAVY 307: profil_stranky číta len správca (RLS) — iný účet aj neprihlásený čítajú pohľad profil_stranky_verejny (bez IBAN).
 *  Predtým iný účet dostal prázdny riadok bez chyby → Hlavná (a s ňou zvončeková) u neho nebola. Zlyhanie = centralnaChyba(). */
const chyby = new Set<string>();
export const centralnaChyba = (stranka: string) => chyby.has(stranka);
export async function nacitajCentralnuZbierku(stranka: string): Promise<CentralnaZbierka | null> {
  if (jeVzor(stranka)) return centralnaZPamate(stranka);
  if (supabase) {
    const vlastna = await supabase.from("profil_stranky").select("centralna").eq("stranka", stranka).maybeSingle().then((x) => x, () => ({ data: null, error: { message: "siet" } }));
    let c: CentralnaZbierka | null = !vlastna.error && vlastna.data ? (vlastna.data.centralna as CentralnaZbierka | null) ?? null : null;
    let chyba = !!vlastna.error;
    if (!vlastna.data) { // nie som správca (alebo riadok nie je) → verejný pohľad
      const v = await supabase.from("profil_stranky_verejny").select("centralna").eq("stranka", stranka).maybeSingle().then((x) => x, () => ({ data: null, error: { message: "siet" } }));
      chyba = !!v.error;
      if (!v.error) c = (v.data?.centralna as CentralnaZbierka | null) ?? null;
    }
    const mal = chyby.has(stranka);
    if (chyba) chyby.add(stranka); else chyby.delete(stranka);
    // OPRAVY 481: server centrálnu nemá (zmazaná) → preč aj z pamäte, inak by v Správe ostala do obnovenia stránky
    const bola = pamat.has(stranka);
    if (c) pamat.set(stranka, c); else if (!chyba) pamat.delete(stranka);
    if (c || chyba !== mal || (bola && !c && !chyba)) zmena();
    return c ?? centralnaZPamate(stranka);
  }
  return centralnaZPamate(stranka);
}
/** OPRAVY 313: vráti chybu ako text (Správa ju ukáže pri poli), inak null */
export async function ulozCentralnuZbierku(stranka: string, c: CentralnaZbierka): Promise<string | null> {
  pamat.set(stranka, c); zmena();
  if (!supabase) return null;
  let cista: CentralnaZbierka;
  try { cista = await bezDataUrl(c, "stranky"); } catch { return "Fotku sa nepodarilo nahrať. Skúste znova."; }
  const { error } = await supabase.from("profil_stranky").upsert({ stranka, centralna: cista, centralna_cas: new Date().toISOString() }, { onConflict: "stranka" }).then((x) => x, () => ({ error: { message: "" } }));
  if (error && /zadarmo_jedna_zbierka/.test(error.message ?? "")) return "V programe Zadarmo beží jedna zbierka naraz. Centrálnu spustíte, keď skončí zbierka pre niekoho, alebo s vyšším programom.";
  if (error && /limit_zbierok/.test(error.message ?? "")) return "Máte plný počet zbierok vo vašom programe. Centrálnu spustíte, keď niektorú zbierku ukončíte.";
  return error ? "Nepodarilo sa uložiť na server. Skontrolujte pripojenie." : null;
}

/** KARTA 56B · hlavná zbierka farnosti beží (spustená). Bez záznamu alebo pred Spustiť = nebeží. */
export const hlavnaBezi = (stranka: string): boolean => !!centralnaZPamate(stranka)?.spustena;
/** KARTA 56B · zmazanie hlavnej zbierky farnosti — dlaždica „+ Pridať hlavnú zbierku farnosti" sa vráti. */
export async function zmazCentralnuZbierku(stranka: string): Promise<void> {
  pamat.delete(stranka); zmena();
  if (supabase) await supabase.from("profil_stranky").upsert({ stranka, centralna: null, centralna_cas: new Date().toISOString() }, { onConflict: "stranka" });
}

/** od kedy sa sčítava hlavná zbierka: pri ročnom prepínači 1. január tohto roka (ms), inak od začiatku (0) */
export function odKedyHlavna(stranka: string, teraz = new Date()): number {
  return centralnaZPamate(stranka)?.rocne ? new Date(teraz.getFullYear(), 0, 1).getTime() : 0;
}
