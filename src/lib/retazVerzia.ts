// ============================================================
// OPRAVY 492 · Reťaz = verzia zbierky u toho, kto reťazí (Martin 22. 10., odpoveď 499)
// QR / odkaz reťaze `/r/{reťaz}/{zbierka}` a ťuk na riadok reťaze v hlavnej zbierke otvorí platobný modul tejto verzie:
// „Kam ide tvoj dar“ (zapečatený podiel), „Vyzbierané cez reťaz …“ + celá zbierka, darcovia cez reťaz, Reťaz dobra v module nie je.
// Dar ide cez retaz_dar (server rozdelí podľa zapečateného podielu) a pripíše sa aj v hlavnej zbierke (fialový úsek).
// Pod modulom je stránka toho, kto reťazí (keď ju má). Reťaziť môže ktokoľvek registrovaný, nie len tvorca.
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { nacitajZbierkyStranky, cielCislo, doplneniaHtml } from "./novaZbierka";
import type { Strana } from "./retaz";
import type { ZbierkaData } from "@/features/zbierka/ZbierkaModul";
import type { TvorcaData } from "@/features/zbierka/Tvorca";
import type { StitUroven } from "@/features/zbierka/Pole";

/** zQr = prišiel z QR / odkazu (pod vrstvu sa otvorí stránka toho, kto reťazí); ťuk v hlavnej zbierke = nie */
export interface CielVerzie { retaz: string; zbierka: string; zQr?: boolean }
let ciel: CielVerzie | null = null;
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };

export function otvorVerziuRetaze(retaz: string, zbierka: string) { ciel = { retaz, zbierka }; zmena(); }
export function zavriVerziuRetaze() { ciel = null; zmena(); }
export function useVerziaRetaze(): CielVerzie | null {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return ciel;
}

/** adresa z QR reťaze: /r/{rt-…}/{zbierka} (zbierka nepovinná = tá, na ktorú reťaz práve posiela) */
export const cestaRetaze = (cesta: string): CielVerzie | null => {
  const m = cesta.match(/^\/r\/(rt-[^/?#]+)(?:\/([^/?#]+))?\/?$/);
  return m ? { retaz: decodeURIComponent(m[1]), zbierka: m[2] ? decodeURIComponent(m[2]) : "", zQr: true } : null;
};
if (typeof window !== "undefined") ciel = cestaRetaze(window.location.pathname);

type PolozkaStavu = { zbierka: string; pct: number; stav: string; nazov: string; org: string; org_stranka?: string | null; ciel?: number | null };
type StavRetaze = { id: string; meno: string; robi?: Strana | null; stranka?: string | null; ukoncena?: string | null; polozky: PolozkaStavu[] };

export type Verzia =
  | { druh: "ok"; zbierka: ZbierkaData; stranka: string | null }
  /** reťaz skončila alebo práve neposiela na žiadnu zbierku */
  | { druh: "nebezi"; meno: string; stranka: string | null }
  | { druh: "chyba" };

const STITY: StitUroven[] = ["Bronze", "Silver", "Gold", "Platinum", "Legend"];
const stitZ = (s?: string): StitUroven => (STITY.find((x) => x.toLowerCase() === (s ?? "").toLowerCase()) ?? "Bronze");

export async function nacitajVerziu(c: CielVerzie, otvorStranku: (stranka: string) => void): Promise<Verzia> {
  if (!supabase) return { druh: "chyba" };
  const { data, error } = await supabase.rpc("retaz_stav", { p_retaz: c.retaz });
  if (error || !data) return { druh: "chyba" };
  const r = data as StavRetaze;
  const stranka = r.stranka ?? null;
  // dar ide vždy na zbierku, ktorá v reťazi práve beží — keď už je to iná než na QR, ukáže sa tá
  const p = r.ukoncena ? undefined : (r.polozky ?? []).find((x) => x.stav === "bezi");
  if (!p) return { druh: "nebezi", meno: r.meno, stranka };
  let z = null as Awaited<ReturnType<typeof nacitajZbierkyStranky>>[number] | null;
  if (p.org_stranka) z = (await nacitajZbierkyStranky(p.org_stranka)).find((x) => x.id === p.zbierka) ?? null;
  const tvorca: TvorcaData = {
    id: r.id, meno: r.meno, menoAkuzativ: `reťaz ${r.meno}`, menoDativ: "autorovi reťaze", rola: "Reťaz dobra",
    foto: r.robi?.foto, platformy: [], podielZbierke: Number(p.pct), veta: r.robi?.pod, stit: stitZ(r.robi?.stit),
    ...(stranka ? { onStranka: () => otvorStranku(stranka) } : {}),
  };
  const org = { meno: p.org, typ: "charita" as const, mesto: "", cisla: [] as [string, string][], stit: "Bronze" as StitUroven };
  const zbierka: ZbierkaData = z
    ? { id: z.id, vs: z.vs, nazov: z.nazov || p.nazov, overena: true,
        popis: [z.popis, z.popis2].filter(Boolean).join("") + doplneniaHtml(z.doplnenia) || undefined,
        media: (z.media ?? []).map((m) => ({ typ: m.typ, src: m.src, popis: m.popis })) as ZbierkaData["media"],
        vyzbierane: 0, ludia: 0, ciel: cielCislo(z) || undefined, pravidelna: !!z.prav, eurc: !!z.eurc, organizacia: org, tvorca }
    : { id: p.zbierka, nazov: p.nazov, overena: true, vyzbierane: 0, ludia: 0, ciel: p.ciel ?? undefined, organizacia: org, tvorca };
  return { druh: "ok", zbierka, stranka };
}
