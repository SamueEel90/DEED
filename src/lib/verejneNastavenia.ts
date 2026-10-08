// Verejné nastavenia stránky (migrácia 0070): rýchle sumy, krypto, viditeľnosť súm, centrálna zbierka.
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

/** načíta verejné nastavenia stránky (raz; ďalšie volania čakajú na ten istý dotaz) */
export function nacitajVerejne(stranka: string): Promise<void> {
  if (!supabase) return Promise.resolve();
  const bezi = nacitava.get(stranka);
  if (bezi) return bezi;
  const p = (async () => {
    const { data, error } = await supabase!.from("nastavenia_stranky_verejne").select("verejne").eq("stranka", stranka).maybeSingle();
    if (error) { nacitava.delete(stranka); return; } // pohľad ešte nebeží (0070) → ostáva localStorage
    pamat.set(stranka, { ...((data?.verejne as Verejne | null) ?? {}), ...(pamat.get(stranka) ?? {}) }); // lokálna zmena počas načítania má prednosť
    zmena();
  })();
  nacitava.set(stranka, p);
  return p;
}

/** komponent sa prekreslí, keď prídu (alebo sa zmenia) verejné nastavenia stránky */
export function useVerejneNastavenia(stranka: string | undefined): void {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  useEffect(() => { if (stranka) void nacitajVerejne(stranka); }, [stranka]);
}

/** zapíše jednu hodnotu; do DB ide celý objekt `verejne` stránky (súkromné `data` ostáva) */
export async function zapisVerejne(stranka: string, kluc: string, hodnota: unknown): Promise<void> {
  await nacitajVerejne(stranka); // nech sa neprepíšu hodnoty, ktoré v DB už sú
  const n = { ...(pamat.get(stranka) ?? {}), [kluc]: hodnota };
  pamat.set(stranka, n);
  zmena();
  if (!supabase) return;
  await pripojTestovaciuStranku(stranka); // testovacia stránka: tester = správca (aj zo starého panela Môj DEED+ firemný)
  const { error } = await supabase.from("nastavenia_stranky").upsert({ stranka, verejne: n }, { onConflict: "stranka" });
  if (error) toast("Nastavenie sa nepodarilo uložiť — platí len na tomto zariadení.");
}
