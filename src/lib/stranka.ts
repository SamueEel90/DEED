// ============================================================
// STRÁNKA → ÚČET (Zadanie 1 · Blok 1, migrácia 0035). Stránka (svetlo, farnost…) patrí účtu
// organizácie; zapisovať do nej smie len jej správca (DB: spravujem_stranku). Testovacie stránky
// z appky (lib/mojeStranky) majú v DB príznak testovacia — v testovacom zostavení sa prihlásený
// tester pri otvorení Správy pridá ako správca (testovaci_spravca). Mimo testu sa nevolá nič.
// ============================================================
import { supabase } from "./supabase";
import { TESTOVACIE_ZOSTAVENIE } from "./testovacia";

const pripojene = new Set<string>();

/** Správa testovacej stránky: prihlásený tester = správca (raz za reláciu). Chyby ticho — bez DB appka beží z pamäte. */
export async function pripojTestovaciuStranku(stranka: string): Promise<void> {
  if (!TESTOVACIE_ZOSTAVENIE || !supabase || pripojene.has(stranka)) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const { error } = await supabase.rpc("testovaci_spravca", { p_stranka: stranka });
  if (!error) pripojene.add(stranka);
}
