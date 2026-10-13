// ============================================================
// OPRAVY 222 — farnosť prispeje na cudziu zbierku (charita, pohrebná, zbierka človeka, pripnutá).
// Platba normálne SEPA prevodom alebo kartou farnosti (žiadna peňaženka) → rpc zbierka_dar_farnosti (0080) = pohyb v ledgeri.
// OPRAVY 222 (1): len farár — server (0081 stranka_farar, som_farar) aj appka. Farára zapíše Ľudia pri „Som farár“.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { idZbierkyDB } from "./darZbierky";
import { UKAZKOVE_STRANKY } from "./mojeStranky";
import { TESTOVACIA } from "./testovacia";

export interface MojaFarnost { id: string; meno: string }
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
const useZmena = () => useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
const farar = new Map<string, boolean>();
const nacitavaFarar = new Set<string>();
async function nacitajFarara(stranka: string) {
  if (!supabase || nacitavaFarar.has(stranka)) return;
  nacitavaFarar.add(stranka);
  const { data, error } = await supabase.rpc("som_farar", { p_stranka: stranka });
  if (!error) { farar.set(stranka, data === true); zmena(); }
  nacitavaFarar.delete(stranka);
}
/** Ľudia: „Som farár“ (true) / „Vypĺňam za farára“ (false) — zapíše rolu na serveri */
export async function nastavFarara(stranka: string, som: boolean): Promise<void> {
  if (!supabase) { farar.set(stranka, som); zmena(); return; }
  const { data, error } = await supabase.rpc("nastav_farara", { p_stranka: stranka, p_som: som });
  if (error) throw new Error(error.message);
  farar.set(stranka, data === true); zmena();
}
/** farnosť, za ktorú môžem prispieť — len keď som jej farár (nie správca, kaplán ani nikto iný); overí server */
export function useFarnostFarara(): MojaFarnost | null {
  useZmena();
  const s = UKAZKOVE_STRANKY.find((x) => x.typ === "farnost");
  useEffect(() => { if (s) void nacitajFarara(s.k); }, [s]);
  if (!s) return null;
  const som = supabase ? farar.get(s.k) === true : TESTOVACIA || farar.get(s.k) === true; // bez databázy (mock) len testovacia
  return som ? { id: s.k, meno: s.n } : null;
}

export interface Prispevok { zbierka: string; nazov: string; kto: string; suma: number; cas: number; vs?: number; rodina: boolean }
export interface Prispievatel { stranka: string; meno: string; suma: number | null }

const prispela = new Map<string, Prispevok[]>(), prispievatelia = new Map<string, Prispievatel[]>();


async function nacitajPrispela(stranka: string) {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("stranka_prispela", { p_stranka: stranka, p_limit: 50 });
  if (error || !Array.isArray(data)) return;
  prispela.set(stranka, (data as { zbierka: string; nazov: string; kto: string; suma: number; cas: string; vs?: number; rodina: boolean }[])
    .map((r) => ({ zbierka: r.zbierka, nazov: r.nazov, kto: r.kto, suma: Number(r.suma), cas: new Date(r.cas).getTime(), vs: r.vs, rodina: !!r.rodina })));
  zmena();
}
async function nacitajPrispievatelov(zbierka: string) {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("zbierka_prispievatelia", { p_zbierka: zbierka });
  if (error || !Array.isArray(data)) return;
  prispievatelia.set(zbierka, (data as { stranka: string; meno: string; suma: number | null }[]).map((r) => ({ stranka: r.stranka, meno: r.meno, suma: r.suma == null ? null : Number(r.suma) })));
  zmena();
}
/** čím farnosť prispela (Zbierky farnosti „Prispeli sme“, Peňaženka → Výpisy) */
export function usePrispela(stranka: string): Prispevok[] {
  useZmena();
  useEffect(() => { void nacitajPrispela(stranka); }, [stranka]);
  return prispela.get(stranka) ?? [];
}
/** ktoré stránky (farnosti) prispeli na zbierku */
export function usePrispievatelia(refId: string): Prispievatel[] {
  useZmena();
  const id = idZbierkyDB(refId);
  useEffect(() => { if (id) void nacitajPrispievatelov(id); }, [id]);
  return id ? prispievatelia.get(id) ?? [] : [];
}

/** dar farnosti (SEPA alebo karta) — vznikne ako pohyb v ledgeri; bez databázy sa nič nezapíše */
export async function darFarnosti(refId: string, suma: number, sepa: boolean, f: MojaFarnost): Promise<void> {
  const id = idZbierkyDB(refId);
  if (!supabase) throw new Error("Bez spojenia so serverom sa dar farnosti nedá zapísať.");
  if (!id) throw new Error("Na túto zbierku sa za farnosť zatiaľ prispieť nedá.");
  let idem: string;
  try { idem = crypto.randomUUID(); } catch { idem = `farnost-${Date.now()}-${Math.round(Math.random() * 1e9)}`; }
  const { error } = await supabase.rpc("zbierka_dar_farnosti", { p_zbierka: id, p_idem: idem, p_suma: suma, p_mena: "EUR", p_kanal: sepa ? "sepa" : "fiat", p_farnost: f.id });
  if (error) throw new Error(error.message);
  await Promise.all([nacitajPrispela(f.id), nacitajPrispievatelov(id)]);
}
