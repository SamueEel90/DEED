// KARTA 55 · E — Príbeh zbierky: celá stránka prípadu (dobrovoľné, môže ho mať každá zbierka).
// Správa zbierky → záložka Príbeh ukladá KONCEPT samo; na stránke sa ukáže až po „Zverejniť príbeh".
// Príbeh týždňa = jeden príbeh navrchu profilu organizácie (zapnutie vypne iný).
// Tabuľka pribeh_zbierky (zbierka, stranka, koncept, zverejneny, tyzdna) — migrácia 0047. Koncept číta len správca
// (RLS), verejnosť číta pohľad pribeh_zbierky_verejny. Nič do prehliadača;
// bez DB spojenia appka drží príbehy v pamäti relácie.
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import type { MediumZbierky } from "./novaZbierka";

export interface ZapisPriebehu { id: string; datum: string; nadpis: string; text: string; /** OPRAVY 455 (3): nepovinné fotky zápisu */ media?: MediumZbierky[] }
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
  /** OPRAVY 474: kedy bol príbeh naposledy zverejnený (ISO) — hlavička v Správe, nadpis na stránke */
  zverejnene?: string;
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
// OPRAVY 455 (0): príčina straty dát — Správa príbeh zo servera nikdy nenačítala (nacitajPribeh nikto nevolal) a pri ukladaní
// posielala prázdnu stránku (org ""), takže server zápis odmietol a príbeh žil len v pamäti prehliadača do prvého
// obnovenia (prepnutie programu). Teraz: Správa najprv načíta, ukladá so stránkou zbierky a ukáže, či sa uložilo.
const nacitane = new Set<string>();
export const jeNacitany = (id: string) => nacitane.has(kluc(id));
/** Správa: koncept aj zverejnený príbeh zo servera; vráti chybu alebo null */
export async function nacitajPribeh(id: string): Promise<string | null> {
  if (!supabase) { nacitane.add(kluc(id)); zmena(); return null; }
  const k = kluc(id);
  const [ver, sprava] = await Promise.all([
    supabase.from("pribeh_zbierky_verejny").select("zverejneny, stranka, tyzdna").eq("zbierka", k).maybeSingle(),
    supabase.from("pribeh_zbierky").select("koncept, zverejneny, stranka, tyzdna").eq("zbierka", k).maybeSingle(), // len správca (RLS)
  ]);
  if (ver.error && sprava.error) return "Príbeh sa nepodarilo načítať. Skontrolujte pripojenie a skúste znova.";
  const data = sprava.data ?? (ver.data ? { ...ver.data, koncept: null } : null);
  nacitane.add(k);
  if (data) {
    const org = String(data.stranka ?? "");
    pamat.set(k, { koncept: (data.koncept as Pribeh | null) ?? null, zverejneny: (data.zverejneny as Pribeh | null) ?? null, org });
    if (data.tyzdna && org) tyzdna = { ...tyzdna, [org]: k };
  }
  zmena();
  return null;
}
/** verejnosť (stránka, feed): zverejnené príbehy viacerých zbierok naraz */
export async function nacitajPribehy(ids: string[]): Promise<void> {
  const l = [...new Set(ids.map(kluc))].filter((k) => !pamat.get(k)?.zverejneny);
  if (!supabase || !l.length) return;
  const { data, error } = await supabase.from("pribeh_zbierky_verejny").select("zbierka, zverejneny, stranka, tyzdna").in("zbierka", l);
  if (error || !data?.length) return;
  for (const r of data as { zbierka: string; zverejneny: Pribeh | null; stranka: string; tyzdna: boolean }[]) {
    const z = pamat.get(r.zbierka);
    pamat.set(r.zbierka, { koncept: z?.koncept ?? null, zverejneny: r.zverejneny, org: r.stranka });
    if (r.tyzdna) tyzdna = { ...tyzdna, [r.stranka]: r.zbierka };
  }
  zmena();
}
const CHYBA_ULOZ = "Neuložilo sa. Skontrolujte pripojenie, appka to skúsi znova.";
/** ukladá sa samo (koncept); vráti chybu alebo null */
export async function ulozKonceptPribehu(id: string, org: string, p: Pribeh): Promise<string | null> {
  const k = kluc(id), z = pamat.get(k);
  pamat.set(k, { koncept: p, zverejneny: z?.zverejneny ?? null, org }); zmena();
  if (!supabase) return null;
  if (!org) return CHYBA_ULOZ;
  const { error } = await supabase.from("pribeh_zbierky").upsert({ zbierka: k, stranka: org, koncept: p }, { onConflict: "zbierka" });
  return error ? CHYBA_ULOZ : null;
}
/** Zverejniť príbeh — koncept ide na stránku; vráti chybu alebo null */
export async function zverejniPribeh(id: string, org: string): Promise<string | null> {
  const k = kluc(id), z = pamat.get(k); const p0 = z?.koncept ?? z?.zverejneny; if (!p0) return "Najprv napíšte príbeh.";
  const p: Pribeh = { ...p0, zverejnene: new Date().toISOString() };
  if (supabase) {
    if (!org) return CHYBA_ULOZ;
    const { error } = await supabase.from("pribeh_zbierky").upsert({ zbierka: k, stranka: org, koncept: null, zverejneny: p }, { onConflict: "zbierka" });
    if (error) return "Príbeh sa nepodarilo zverejniť. Skúste znova.";
  }
  pamat.set(k, { koncept: null, zverejneny: p, org }); zmena();
  return null;
}
/** 5 · Priebeh: zmena zápisov (pridanie, úprava, zmazanie) ide do konceptu aj na stránku, ak je príbeh zverejnený.
 *  Nikdy neprepíše zverejnený príbeh prázdnym (pošle len to, čo existuje). Vráti { naStranke } alebo chybu. */
export async function zmenPriebeh(id: string, org: string, priebeh: ZapisPriebehu[]): Promise<{ naStranke: boolean } | { chyba: string }> {
  const k = kluc(id), z = pamat.get(k);
  const koncept = z?.koncept ? { ...z.koncept, priebeh } : z?.zverejneny ? null : { ...prazdnyPribeh(), priebeh };
  const zverejneny = z?.zverejneny ? { ...z.zverejneny, priebeh } : null;
  if (supabase) {
    if (!org) return { chyba: CHYBA_ULOZ };
    const riadok: Record<string, unknown> = { zbierka: k, stranka: org };
    if (koncept) riadok.koncept = koncept;
    if (zverejneny) riadok.zverejneny = zverejneny;
    const { error } = await supabase.from("pribeh_zbierky").upsert(riadok, { onConflict: "zbierka" });
    if (error) return { chyba: CHYBA_ULOZ };
  }
  pamat.set(k, { koncept: koncept ?? z?.koncept ?? null, zverejneny: zverejneny ?? z?.zverejneny ?? null, org }); zmena();
  return { naStranke: !!zverejneny };
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

// OPRAVY 461: Príbeh týždňa automaticky — hore je zbierka s najnovším zápisom v Priebehu (bez zápisu najnovšia zbierka)
/** dátum najnovšieho zverejneného zápisu v Priebehu (ISO) alebo null */
export function novePribehu(id: string): string | null {
  const l = pamat.get(kluc(id))?.zverejneny?.priebeh ?? [];
  return l.reduce<string | null>((m, r) => (!m || r.datum > m ? r.datum : m), null);
}
/** štítok „Nové v príbehu · 20. 10.“ */
export function stitokNoveho(id: string): string | null {
  const d = novePribehu(id); if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d); return m ? `Nové v príbehu · ${+m[3]}. ${+m[2]}.` : null;
}
/** poradie bežiacich zbierok: najnovší zápis v Priebehu navrchu, ostatné v pôvodnom poradí (najnovšia zbierka prvá) */
export function podlaPribehu<T extends { id: string }>(l: T[]): T[] {
  return l.map((z, i) => ({ z, i, d: novePribehu(z.id) })).sort((a, b) => (a.d && b.d ? (a.d < b.d ? 1 : a.d > b.d ? -1 : a.i - b.i) : a.d ? -1 : b.d ? 1 : a.i - b.i)).map((x) => x.z);
}
