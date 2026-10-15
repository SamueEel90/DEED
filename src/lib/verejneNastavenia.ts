// Verejné nastavenia stránky (migrácia 0070b): rýchle sumy, krypto, viditeľnosť súm, centrálna zbierka.
// Ukladajú sa do nastavenia_stranky.verejne (píše správca), čítajú sa z pohľadu
// nastavenia_stranky_verejne (aj návštevník). Bez DB (mock/offline) appka beží z rola/stav (localStorage).
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { toast } from "@/components/toast";
import { pripojTestovaciuStranku } from "./stranka";

type Verejne = Record<string, unknown>;
const pamat = new Map<string, Verejne>();
const nacitava = new Map<string, Promise<void>>();
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };

export const verejneZPamate = (stranka: string): Verejne | undefined => pamat.get(stranka);

/** OPRAVY 308: nastavenia farára (vzhľad Kronika …) sa čítajú zo servera pri každom otvorení stránky — pamäť len na prvé
 *  vykreslenie. Predtým sa načítali raz za beh appky a stará pamäť mala prednosť pred serverom (nové až po reštarte). */
const nacitane = new Map<string, number>(); // kedy prišla odpoveď servera
const lokalne = new Map<string, Set<string>>(); // kľúče zapísané tu, kým beží načítanie (tie majú prednosť)
const CERSTVE_MS = 15_000;
/** načíta verejné nastavenia stránky; súbežné volania čakajú na ten istý dotaz, čerstvé (15 s) sa nečítajú znova */
export function nacitajVerejne(stranka: string, nanovo = false): Promise<void> {
  if (!supabase) return Promise.resolve();
  const bezi = nacitava.get(stranka);
  if (bezi) return bezi;
  if (!nanovo && Date.now() - (nacitane.get(stranka) ?? 0) < CERSTVE_MS) return Promise.resolve();
  lokalne.set(stranka, new Set());
  const p = (async () => {
    const { data, error } = await supabase!.from("nastavenia_stranky_verejne").select("verejne").eq("stranka", stranka).maybeSingle().then((x) => x, () => ({ data: null, error: { message: "siet" } }));
    nacitava.delete(stranka);
    if (error) return; // bez spojenia / pohľad ešte nebeží (0070b) → ostáva posledné známe
    const tu = lokalne.get(stranka) ?? new Set<string>(), stare = pamat.get(stranka) ?? {}, server = (data?.verejne as Verejne | null) ?? {};
    const n: Verejne = { ...server };
    tu.forEach((k) => { n[k] = stare[k]; });
    lokalne.delete(stranka);
    nacitane.set(stranka, Date.now());
    if (JSON.stringify(n) !== JSON.stringify(stare)) { pamat.set(stranka, n); zmena(); } else pamat.set(stranka, n);
  })();
  nacitava.set(stranka, p);
  return p;
}

/** komponent sa prekreslí, keď prídu (alebo sa zmenia) verejné nastavenia stránky; pri otvorení načíta aktuálne zo servera */
export function useVerejneNastavenia(stranka: string | undefined): void {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  useEffect(() => { if (stranka) void nacitajVerejne(stranka); }, [stranka]);
}

/** zapíše jednu hodnotu; do DB ide celý objekt `verejne` stránky (súkromné `data` ostáva) */
export async function zapisVerejne(stranka: string, kluc: string, hodnota: unknown): Promise<void> {
  await nacitajVerejne(stranka); // nech sa neprepíšu hodnoty, ktoré v DB už sú
  lokalne.get(stranka)?.add(kluc);
  const n = { ...(pamat.get(stranka) ?? {}), [kluc]: hodnota };
  pamat.set(stranka, n);
  zmena();
  if (!supabase) return;
  await pripojTestovaciuStranku(stranka); // testovacia stránka: tester = správca (aj zo starého panela Môj DEED+ firemný)
  const { error } = await supabase.from("nastavenia_stranky").upsert({ stranka, verejne: n }, { onConflict: "stranka" });
  if (error) toast("Nastavenie sa nepodarilo uložiť — platí len na tomto zariadení.");
}

/** OPRAVY 292: zápis, ktorého zlyhanie má tvár (Správa ukáže chybu na mieste) — vráti chybu ako text alebo null */
export async function zapisVerejneIsto(stranka: string, kluc: string, hodnota: unknown): Promise<string | null> {
  await nacitajVerejne(stranka);
  lokalne.get(stranka)?.add(kluc);
  const stare = pamat.get(stranka) ?? {};
  const n = { ...stare, [kluc]: hodnota };
  pamat.set(stranka, n);
  zmena();
  if (!supabase) return null;
  await pripojTestovaciuStranku(stranka);
  const { error } = await supabase.from("nastavenia_stranky").upsert({ stranka, verejne: n }, { onConflict: "stranka" }).then((x) => x, () => ({ error: { message: "" } }));
  if (error) { pamat.set(stranka, { ...(pamat.get(stranka) ?? {}), [kluc]: stare[kluc] }); zmena(); return "Neuložilo sa na server. Skontrolujte pripojenie a skúste znova."; }
  return null;
}
