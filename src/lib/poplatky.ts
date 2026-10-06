// ============================================================
// DEED · Poplatky — Zadanie 3 · 3.4: JEDEN zdroj pravdy je databáza (migrácia 0043).
// Sadzby sú config v tabuľke poplatok_sadzba, výpočet je public.poplatok() — ten istý, ktorý
// použije platba_create. Appka si poplatok pred platbou PÝTA (rpc poplatok_nahlad) → zobrazené = strhnuté.
// Darca platí poplatok NAVRCH, príjemca dostane celú sumu daru.
// Bez databázy (demo) appka len prehráva statické demo sadzby nižšie (rovnaké ako seed v 0043).
// ============================================================
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

/** rúra platby v DB: fiat = karta */
export type Kanal = "deed" | "fiat" | "sms" | "sepa";

export interface PoplatokNahlad {
  /** poplatok, ktorý darca zaplatí navrch */
  poplatok: number;
  /** text sadzby do appky („1,4 % + 0,15 €") */
  popis: string;
  /** suma je pod minimom rúry a pod. — hláška zo servera */
  chyba?: string;
}

// DEMO dáta pre režim bez databázy — kópia seedu z 0043 (o sadzbe rozhoduje DB, nie toto)
const DEMO: Record<Kanal, { percento: number; fix: number; split?: number; min: number; popis: string }> = {
  fiat: { percento: 1.4, fix: 0.15, min: 3, popis: "1,4 % + 0,15 €" },
  sepa: { percento: 0, fix: 0, split: 0.35, min: 1, popis: "bez poplatku" },
  deed: { percento: 0, fix: 0, min: 0.0001, popis: "bez poplatku" },
  sms: { percento: 10, fix: 0, min: 1, popis: "10 %" },
};
const r2 = (n: number) => Math.round(n * 100) / 100;
function demo(kanal: Kanal, suma: number, split: boolean): PoplatokNahlad {
  const s = DEMO[kanal];
  if (suma < s.min) return { poplatok: 0, popis: s.popis, chyba: `Najmenší dar týmto spôsobom je ${String(s.min).replace(".", ",")} €.` };
  if (split && s.split != null) return { poplatok: s.split, popis: `${s.split.toFixed(2).replace(".", ",")} € (split)` };
  return { poplatok: r2((suma * s.percento) / 100 + s.fix), popis: s.popis };
}

/** poplatok pred platbou — zo servera (rovnaký výpočet ako pri platbe) */
export async function poplatokNahlad(kanal: Kanal, suma: number, split = false): Promise<PoplatokNahlad> {
  if (!supabase) return demo(kanal, suma, split);
  const { data, error } = await supabase.rpc("poplatok_nahlad", { p_kanal: kanal, p_suma: suma, p_split: split });
  if (error) return { poplatok: 0, popis: "", chyba: error.message };
  const d = (data ?? {}) as { poplatok?: number; popis?: string };
  return { poplatok: Number(d.poplatok ?? 0), popis: d.popis ?? "" };
}

/** živý náhľad poplatku pre obrazovky platby (kanal null = poplatok sa netýka, napr. DEED/EURC) */
export function usePoplatok(kanal: Kanal | null, suma: number, split = false): PoplatokNahlad & { nacitava: boolean } {
  const zapnute = !!kanal && suma > 0;
  const q = useQuery({
    queryKey: ["poplatok", kanal, suma, split],
    queryFn: () => poplatokNahlad(kanal as Kanal, suma, split),
    enabled: zapnute,
    staleTime: 5 * 60_000,
    placeholderData: (pred) => pred,
  });
  if (!zapnute) return { poplatok: 0, popis: "", nacitava: false };
  return { ...(q.data ?? { poplatok: 0, popis: "" }), nacitava: q.isFetching };
}

/** text sadzby rúry (pred výberom spôsobu platby) — z configu v DB, bez DB z demo dát */
export function usePopisSadzby(kanal: Kanal): string {
  const q = useQuery({
    queryKey: ["sadzby"],
    queryFn: async (): Promise<Record<string, string>> => {
      if (!supabase) return Object.fromEntries(Object.entries(DEMO).map(([k, v]) => [k, v.popis]));
      const { data, error } = await supabase.from("poplatok_sadzba").select("kanal, popis, split_fix");
      if (error) throw error;
      const out: Record<string, string> = {};
      for (const r of data ?? []) {
        out[r.kanal] = r.popis;
        if (r.split_fix != null) out[`${r.kanal}:split`] = `${Number(r.split_fix).toFixed(2).replace(".", ",")} € (split)`;
      }
      return out;
    },
    staleTime: 30 * 60_000,
  });
  return q.data?.[kanal] ?? DEMO[kanal].popis;
}
/** SEPA dobrovoľný tip podľa pásma (Zeffy model). NIKDY predzaškrtnutý. */
export function navrhniTip(suma: number): number {
  if (suma <= 10) return 0;
  if (suma <= 100) return 3;
  if (suma <= 1000) return 5;
  if (suma <= 10000) return 10;
  return 50;
}
