// ============================================================
// STRÁNKA → ÚČET (Zadanie 1 · Blok 1, migrácia 0035). Stránka (svetlo, farnost…) patrí účtu
// organizácie; zapisovať do nej smie len jej správca (DB: spravujem_stranku). Testovacie stránky
// z appky (lib/mojeStranky) majú v DB príznak testovacia — prihlásený tester sa pri otvorení Správy
// pridá ako správca (testovaci_spravca). Volá sa v každom zostavení: ostrú stránku (testovacia = false)
// DB odmietne, takže mimo testovacích stránok sa nič nezmení.
// ============================================================
import { supabase } from "./supabase";

const pripojene = new Set<string>();

/** Správa testovacej stránky: prihlásený tester = správca (raz za reláciu). Chyby ticho — bez DB appka beží z pamäte. */
export async function pripojTestovaciuStranku(stranka: string): Promise<void> {
  if (!supabase || pripojene.has(stranka)) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const { error } = await supabase.rpc("testovaci_spravca", { p_stranka: stranka });
  if (!error) pripojene.add(stranka);
}
