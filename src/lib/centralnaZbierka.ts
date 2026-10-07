// ============================================================
// KARTA 39 · bod 3 — Centrálna zbierka charity (od P1).
// Na celú činnosť · nikdy vo verejnom feede · stále hore na stránke charity · nie je zapečatená.
// DB: profil_stranky.centralna (migrácia 0032). Bez DB drží appka údaje v pamäti relácie.
// ============================================================
import { bezDataUrl } from "./uploadFoto";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import type { MediumZbierky } from "./novaZbierka";

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

export const centralnaZPamate = (stranka: string): CentralnaZbierka | null => pamat.get(stranka) ?? null;

export async function nacitajCentralnuZbierku(stranka: string): Promise<CentralnaZbierka | null> {
  if (supabase) {
    const { data, error } = await supabase.from("profil_stranky").select("centralna").eq("stranka", stranka).maybeSingle();
    if (!error) { const c = (data?.centralna as CentralnaZbierka | null) ?? null; if (c) { pamat.set(stranka, c); zmena(); } return c ?? centralnaZPamate(stranka); }
  }
  return centralnaZPamate(stranka);
}
export async function ulozCentralnuZbierku(stranka: string, c: CentralnaZbierka): Promise<void> {
  pamat.set(stranka, c); zmena();
  if (supabase) await supabase.from("profil_stranky").upsert({ stranka, centralna: await bezDataUrl(c, "stranky"), centralna_cas: new Date().toISOString() }, { onConflict: "stranka" });
}

/** KARTA 56B · hlavná zbierka farnosti beží (spustená). Bez záznamu alebo pred Spustiť = nebeží. */
export const hlavnaBezi = (stranka: string): boolean => !!centralnaZPamate(stranka)?.spustena;
/** KARTA 56B · zmazanie hlavnej zbierky farnosti — dlaždica „+ Pridať hlavnú zbierku farnosti" sa vráti. */
export async function zmazCentralnuZbierku(stranka: string): Promise<void> {
  pamat.delete(stranka); zmena();
  if (supabase) await supabase.from("profil_stranky").upsert({ stranka, centralna: null, centralna_cas: new Date().toISOString() }, { onConflict: "stranka" });
}
