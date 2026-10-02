// ============================================================
// KARTA 39 · bod 2 (a centrálna, bod 3) — overenie účtu overovacou platbou.
// Charita zadá IBAN → ukážeme kód → z toho účtu pošle 0,01 € s kódom. Server spozná platbu
// a overí, že majiteľ účtu je organizácia (názov / IČO). Kým nie je overený, zbierka sa nespustí.
// DB: overenie_uctu (migrácia 0031). Stav mení len server; v appke len čítame.
// Bez DB (mock) drží appka žiadosti v pamäti relácie; overenie sa dá nasimulovať v DEV.
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export const OVERENIE_CFG = {
  suma: "0,01 €",
  /** účet DEED+, kam ide overovacia platba — placeholder, čaká na skutočný účet */
  ucetDeed: "SK00 0000 0000 0000 0000 0000",
};
export type StavOverenia = "caka" | "overeny" | "zamietnuty";
export interface OverenieUctu { stranka: string; iban: string; kod: string; stav: StavOverenia; vytvorene: string; overene?: string }

const cisty = (iban: string) => iban.replace(/\s/g, "").toUpperCase();
const kluc = (stranka: string, iban: string) => `${stranka}|${cisty(iban)}`;
const pamat = new Map<string, OverenieUctu>();
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyOverenia = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);

/** kód do správy pre prijímateľa — 6 znakov bez zameniteľných (0/O, 1/I) */
const novyKod = () => { const z = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let k = ""; for (let i = 0; i < 6; i++) k += z[Math.floor(Math.random() * z.length)]; return `DEED ${k}`; };

export const overenieZPamate = (stranka: string, iban: string): OverenieUctu | null => pamat.get(kluc(stranka, iban)) ?? null;

export async function nacitajOverenie(stranka: string, iban: string): Promise<OverenieUctu | null> {
  if (supabase) {
    const { data, error } = await supabase.from("overenie_uctu").select("stranka, iban, kod, stav, vytvorene, overene").eq("stranka", stranka).eq("iban", cisty(iban)).maybeSingle();
    if (!error) { if (data) { pamat.set(kluc(stranka, iban), data as OverenieUctu); zmena(); } return (data as OverenieUctu | null) ?? overenieZPamate(stranka, iban); }
  }
  return overenieZPamate(stranka, iban);
}

/** požiadať o overenie (vráti existujúcu žiadosť, ak už je) */
export async function poziadajOverenie(stranka: string, iban: string): Promise<OverenieUctu> {
  const je = overenieZPamate(stranka, iban);
  if (je) return je;
  const o: OverenieUctu = { stranka, iban: cisty(iban), kod: novyKod(), stav: "caka", vytvorene: new Date().toISOString() };
  pamat.set(kluc(stranka, iban), o); zmena();
  if (supabase) await supabase.from("overenie_uctu").insert({ stranka, iban: o.iban, kod: o.kod, stav: "caka" });
  return o;
}

/** DEV — simulácia prijatej overovacej platby (v produkcii to robí server) */
export function simulujOverenie(stranka: string, iban: string) {
  const o = overenieZPamate(stranka, iban); if (!o) return;
  pamat.set(kluc(stranka, iban), { ...o, stav: "overeny", overene: new Date().toISOString() }); zmena();
}
