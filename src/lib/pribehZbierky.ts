// KARTA 55 · E — Príbeh zbierky: celá stránka prípadu (dobrovoľné, môže ho mať každá zbierka).
// Správa zbierky → záložka Príbeh ukladá KONCEPT samo; na stránke sa ukáže až po „Zverejniť príbeh".
// Príbeh týždňa = jeden príbeh navrchu profilu organizácie (zapnutie vypne iný).
// Tabuľka pribeh_zbierky (zbierka, stranka, koncept, zverejneny, tyzdna) — migrácia 0047. Koncept číta len správca
// (RLS), verejnosť číta pohľad pribeh_zbierky_verejny. Nič do prehliadača;
// bez DB spojenia appka drží príbehy v pamäti relácie.
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import type { MediumZbierky } from "./novaZbierka";

export interface ZapisPriebehu { id: string; datum: string; nadpis: string; text: string }
export interface Pribeh {
  /** 1 · krátky text do feedu (max 3 riadky), hore v príbehu tučne */
  kratky: string;
  /** 2 · celý príbeh (HTML, najviac 6 000 znakov) */
  text: string;
  /** 3 · fotky a video s popisom */
  media: MediumZbierky[];
  /** 4 · citát (nepovinné) — súhlas osoby je povinný, ak je citát */
  citat: { text: string; meno: string; vztah: string; suhlas: boolean };
  /** 5 · priebeh (najnovší navrchu) */
  priebeh: ZapisPriebehu[];
}
export const PRIBEH_ZNAKOV = 6000;
export const PRIBEH_RIADKOV = 3;
export const prazdnyPribeh = (): Pribeh => ({ kratky: "", text: "", media: [], citat: { text: "", meno: "", vztah: "", suhlas: false }, priebeh: [] });

interface Zaznam { koncept: Pribeh | null; zverejneny: Pribeh | null; org: string }
// Správa používa ukážkové id zbierky („ukazka-strecha-…"), verejný profil „z-strecha-horvath" — je to tá istá zbierka
const kluc = (id: string) => (id.startsWith("ukazka-strecha") ? "z-strecha-horvath" : id);
const pamat = new Map<string, Zaznam>();
let tyzdna: Record<string, string> = {}; // organizácia → id zbierky s Príbehom týždňa
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
export const useZmenyPribehov = () => useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);

// OPRAVY 403: ukážkový príbeh Svetla pomoci (Strecha pre Horváthovcov) zmazaný — príbehy len zo Správy / databázy

/** zverejnený príbeh (verejná stránka, odkaz z feedu) */
export function pribehZbierky(id: string): Pribeh | null { return pamat.get(kluc(id))?.zverejneny ?? null; }
/** koncept alebo zverejnený (Správa) */
export function pribehNaUpravu(id: string): { pribeh: Pribeh; koncept: boolean; zverejneny: boolean } {
  const z = pamat.get(kluc(id));
  return { pribeh: z?.koncept ?? z?.zverejneny ?? prazdnyPribeh(), koncept: !!z?.koncept, zverejneny: !!z?.zverejneny };
}
export async function nacitajPribeh(id: string): Promise<void> {
  if (!supabase) return;
  const k = kluc(id);
  const [ver, sprava] = await Promise.all([
    supabase.from("pribeh_zbierky_verejny").select("zverejneny, stranka, tyzdna").eq("zbierka", k).maybeSingle(),
    supabase.from("pribeh_zbierky").select("koncept, zverejneny, stranka, tyzdna").eq("zbierka", k).maybeSingle(), // len správca (RLS)
  ]);
  const data = sprava.data ?? (ver.data ? { ...ver.data, koncept: null } : null);
  if (!data) return;
  const org = String(data.stranka ?? "");
  pamat.set(k, { koncept: (data.koncept as Pribeh | null) ?? null, zverejneny: (data.zverejneny as Pribeh | null) ?? null, org });
  if (data.tyzdna && org) tyzdna = { ...tyzdna, [org]: k };
  zmena();
}
/** ukladá sa samo (koncept) */
export function ulozKonceptPribehu(id: string, org: string, p: Pribeh) {
  const k = kluc(id), z = pamat.get(k);
  pamat.set(k, { koncept: p, zverejneny: z?.zverejneny ?? null, org }); zmena();
  if (supabase) void supabase.from("pribeh_zbierky").upsert({ zbierka: k, stranka: org, koncept: p }, { onConflict: "zbierka" });
}
/** Zverejniť príbeh — koncept ide na stránku */
export function zverejniPribeh(id: string, org: string) {
  const k = kluc(id), z = pamat.get(k); const p = z?.koncept ?? z?.zverejneny; if (!p) return;
  pamat.set(k, { koncept: null, zverejneny: p, org }); zmena();
  if (supabase) void supabase.from("pribeh_zbierky").upsert({ zbierka: k, stranka: org, koncept: null, zverejneny: p }, { onConflict: "zbierka" });
}
/** 5 · Priebeh: nový zápis ide do konceptu; ak je príbeh zverejnený, ukáže sa hneď aj na stránke (vráti true = darcom ide upozornenie) */
export function pridajZapisPriebehu(id: string, org: string, zapis: ZapisPriebehu): boolean {
  const k = kluc(id), z = pamat.get(k);
  const pridaj = (p: Pribeh | null | undefined) => (p ? { ...p, priebeh: [zapis, ...p.priebeh] } : null);
  const koncept = z?.koncept ? pridaj(z.koncept) : z?.zverejneny ? null : { ...prazdnyPribeh(), priebeh: [zapis] };
  const zverejneny = pridaj(z?.zverejneny);
  pamat.set(k, { koncept, zverejneny, org }); zmena();
  if (supabase) void supabase.from("pribeh_zbierky").upsert({ zbierka: k, stranka: org, koncept, zverejneny }, { onConflict: "zbierka" });
  return !!zverejneny;
}
/** Príbeh týždňa organizácie (len jeden naraz) */
export const pribehTyzdna = (org: string): string | null => tyzdna[org] ?? null;
export const jePribehTyzdna = (id: string, org: string) => tyzdna[org] === kluc(id);
/** zapnutie vypne iný; vráti id zbierky, pri ktorej sa vyplo */
export function nastavPribehTyzdna(id: string, org: string, zap: boolean): string | null {
  const pred = tyzdna[org] ?? null;
  const n = { ...tyzdna }; if (zap) n[org] = kluc(id); else if (pred === kluc(id)) delete n[org];
  tyzdna = n; zmena();
  if (supabase) void supabase.from("pribeh_zbierky").upsert({ zbierka: kluc(id), stranka: org, tyzdna: zap }, { onConflict: "zbierka" });
  return zap && pred && pred !== kluc(id) ? pred : null;
}
/** testovací profil, pri ktorom príbeh vznikol (verejný odkaz /p/{org}) */
export const orgPribehu = (id: string) => pamat.get(kluc(id))?.org ?? "";
