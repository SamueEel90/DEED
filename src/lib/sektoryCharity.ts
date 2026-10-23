// KARTA 48 · centrálna zbierka a sektory charity (Správa → Zbierky).
// Centrálna = položka 0 (od P1, nezakladá sa). Sektory len z činností v stanovách.
// Farba podľa poradia: 0 zelená, 1 petrolejová, 2 modrá, 3 terakota, ďalšie svetlejšie (data-hier) — OPRAVY 500: fialová patrí reťazi.
// Balík 48 bod −1 · 0169: sektory na serveri (sektor_stranky) ku konkrétnej stránke. Bez DB (vývoj) v pamäti relácie.
// Dary na sektor idú cez zbierka_dar s id „<stránka>:<sektor.id>“ (darZbierky.idZbierkyDB).
import { useEffect, useSyncExternalStore } from "react";
import type { CentralnaZbierka } from "./centralnaZbierka";
import { supabase } from "./supabase";
import { bezDataUrl } from "./uploadFoto";
import { SEKCIE_CHARITY, type SekciaCharity } from "./sekcieCharity";

export interface SektorCharity {
  id: string;
  nazov: string;
  /** činnosť zo stanov, z ktorej sektor vznikol (0169: stĺpec oblast) */
  stanovy: string;
  foto: string;
  /** odkaz na plagát deedgood.eu/z/{slug} */
  slug: string;
  /** kedy bol spustený (ISO), null = koncept */
  spusteny: string | null;
}
/** čísla položky: tento mesiac, ľudí dáva mesačne, od začiatku */
export interface CislaPolozky { mesiac: number; mesacne: number; spolu: number }

export const SEKTORY_MAX = 3;
export const SEKTORY_OD_TIERU = 1; // OPRAVY 486: sektorové zbierky od P1

// ---- oblasti zo stanov (0170): podskupiny, ktoré charita vybrala v registrácii; bez nich celý číselník ----
const oblastiPamat = new Map<string, string[]>();
async function nacitajOblasti(stranka: string) {
  if (!supabase || !stranka || oblastiPamat.has(stranka)) return;
  oblastiPamat.set(stranka, []);
  const s = await supabase.from("stranka").select("ucet_id").eq("id", stranka).maybeSingle().then((x) => x, () => ({ data: null }));
  const ucet = (s.data as { ucet_id?: string } | null)?.ucet_id;
  if (!ucet) return;
  const g = await supabase.from("segmenty").select("pod_segment").eq("org_ucet_id", ucet).then((x) => x, () => ({ data: null }));
  oblastiPamat.set(stranka, ((g.data ?? []) as { pod_segment: string | null }[]).map((r) => r.pod_segment).filter((p): p is string => !!p));
  zmena();
}
/** ponuka oblastí pre nový sektor po sekciách: vybrané podskupiny charity, inak celý číselník (charita bez nich, napr. registrovaná skôr) */
export function useOblastiCharity(stranka: string): SekciaCharity[] {
  useZmenySektorov();
  useEffect(() => { if (stranka) void nacitajOblasti(stranka); }, [stranka]);
  const moje = oblastiPamat.get(stranka) ?? [];
  if (!moje.length) return SEKCIE_CHARITY;
  const m = moje.map((x) => x.toLowerCase());
  return SEKCIE_CHARITY.map((s) => ({ nazov: s.nazov, podskupiny: s.podskupiny.filter((p) => m.includes(p.toLowerCase())) })).filter((s) => s.podskupiny.length > 0);
}
export const NULA: CislaPolozky = { mesiac: 0, mesacne: 0, spolu: 0 };

const prazdnyObsah = (): CentralnaZbierka => ({ popis: "", popis2: "", media: [], sada: 1, eurc: true, sadaE: 0, ucet: null });
const slugZ = (nazov: string) => `sektor-${nazov.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
const fotoZ = (c: CentralnaZbierka | null) => { const m = c?.media?.find((x) => x.typ === "foto"); return m?.src ?? ""; };

// pamäť: stránka → sektory (bez ukončených), id sektora → obsah, id sektora → stránka
const zoznam = new Map<string, SektorCharity[]>();
const obsah = new Map<string, CentralnaZbierka>();
const strankaSektora = new Map<string, string>();
const nacitava = new Set<string>();
let verzia = 0;
const pocuvaj = new Set<() => void>();
const zmena = () => { verzia++; pocuvaj.forEach((f) => f()); };
export const useZmenySektorov = () => useSyncExternalStore((f) => { pocuvaj.add(f); return () => pocuvaj.delete(f); }, () => verzia);

type Riadok = { id: string; stranka: string; oblast: string; nazov: string; obsah: CentralnaZbierka | null; poradie: number; spusteny: string | null };
function zRiadku(r: Riadok): SektorCharity {
  const o = { ...prazdnyObsah(), ...(r.obsah ?? {}) };
  obsah.set(r.id, o); strankaSektora.set(r.id, r.stranka);
  return { id: r.id, nazov: r.nazov, stanovy: r.oblast, foto: fotoZ(o), slug: slugZ(r.nazov), spusteny: r.spusteny };
}
/** sektory stránky zo servera (správca: aj koncepty; neukončené, podľa poradia) */
export async function nacitajSektory(stranka: string): Promise<void> {
  if (!supabase || !stranka || nacitava.has(stranka)) return;
  nacitava.add(stranka);
  const { data, error } = await supabase.from("sektor_stranky").select("id, stranka, oblast, nazov, obsah, poradie, spusteny")
    .eq("stranka", stranka).is("ukonceny", null).order("poradie").order("vytvorene").then((x) => x, () => ({ data: null, error: { message: "siet" } }));
  nacitava.delete(stranka);
  if (error) return;
  zoznam.set(stranka, ((data ?? []) as Riadok[]).map(zRiadku));
  zmena();
}
export function useSektory(stranka: string): SektorCharity[] {
  useZmenySektorov();
  useEffect(() => { if (stranka) void nacitajSektory(stranka); }, [stranka]);
  return zoznam.get(stranka) ?? [];
}
/** čísla sektora — z ledgera ich počíta volajúci (darcoviaPre), tu nič vymyslené */
export const cislaSektora = (_id: string): CislaPolozky => NULA;
export const obsahSektora = (id: string): CentralnaZbierka | null => obsah.get(id) ?? null;

const chybaTextu = (m: string) => (/sektor_od_p1/.test(m) ? "Sektorové zbierky máte od programu P1."
  : /sektor_stranky_oblast_uq|duplicate/.test(m) ? "Na túto oblasť už zbierka beží."
  : /oblast_mimo_stanov/.test(m) ? "Túto oblasť nemáte v stanovách."
  : "Nepodarilo sa uložiť na server. Skontrolujte pripojenie.");

/** uloží text, fotky a sumy sektora; vráti chybu ako text, inak null */
export async function ulozObsahSektora(id: string, c: CentralnaZbierka): Promise<string | null> {
  obsah.set(id, c);
  const st = strankaSektora.get(id);
  if (st) zoznam.set(st, (zoznam.get(st) ?? []).map((s) => (s.id === id ? { ...s, foto: fotoZ(c) } : s)));
  zmena();
  if (!supabase) return null;
  let cista: CentralnaZbierka;
  try { cista = await bezDataUrl(c, "stranky"); } catch { return "Fotku sa nepodarilo nahrať. Skúste znova."; }
  const { error } = await supabase.from("sektor_stranky").update({ obsah: cista }).eq("id", id).then((x) => x, () => ({ error: { message: "" } }));
  return error ? chybaTextu(error.message ?? "") : null;
}

/** nový sektor stránky (zatiaľ hneď spustený — tok konceptu a spustenia je bod 515); chyba servera → onChyba a sektor zmizne */
export function pridajSektor(stranka: string, c: { nazov: string; stanovy: string }, onChyba?: (t: string) => void): SektorCharity | null {
  const v = zoznam.get(stranka) ?? [];
  if (v.length >= SEKTORY_MAX || v.some((s) => s.stanovy === c.stanovy)) return null;
  const id = `sek-${Math.random().toString(36).slice(2, 12)}`;
  const s: SektorCharity = { id, nazov: c.nazov, stanovy: c.stanovy, foto: "", slug: slugZ(c.nazov), spusteny: new Date().toISOString() };
  obsah.set(id, prazdnyObsah()); strankaSektora.set(id, stranka);
  zoznam.set(stranka, [...v, s]); zmena();
  if (supabase) void supabase.from("sektor_stranky").insert({ id, stranka, oblast: c.stanovy, nazov: c.nazov, obsah: prazdnyObsah(), poradie: v.length + 1, spusteny: s.spusteny })
    .then(({ error }) => { if (error) { zoznam.set(stranka, (zoznam.get(stranka) ?? []).filter((x) => x.id !== id)); zmena(); onChyba?.(chybaTextu(error.message ?? "")); } },
      () => { zoznam.set(stranka, (zoznam.get(stranka) ?? []).filter((x) => x.id !== id)); zmena(); onChyba?.(chybaTextu("")); });
  return s;
}
/** zmazanie sektora vracia funkciu na vrátenie (pás Vrátiť) — vrátenie ho na serveri založí znova s tým istým id */
export function zmazSektor(id: string): () => void {
  const st = strankaSektora.get(id);
  if (!st) return () => {};
  const pred = zoznam.get(st) ?? [];
  const s = pred.find((x) => x.id === id);
  const o = obsah.get(id) ?? prazdnyObsah();
  const poradie = pred.findIndex((x) => x.id === id) + 1;
  zoznam.set(st, pred.filter((x) => x.id !== id)); zmena();
  if (supabase) void supabase.from("sektor_stranky").delete().eq("id", id).then(() => {}, () => {});
  return () => {
    if (!s) return;
    zoznam.set(st, [...(zoznam.get(st) ?? []).filter((x) => x.id !== id), s]); zmena();
    if (supabase) void supabase.from("sektor_stranky").insert({ id, stranka: st, oblast: s.stanovy, nazov: s.nazov, obsah: o, poradie, spusteny: s.spusteny }).then(() => {}, () => {});
  };
}

const casovace = new Map<string, number>();
/** premenovanie — naživo v appke, na server o 600 ms po poslednom písmene */
export function premenujSektor(id: string, nazov: string) {
  const st = strankaSektora.get(id);
  if (!st) return;
  zoznam.set(st, (zoznam.get(st) ?? []).map((s) => (s.id === id ? { ...s, nazov, slug: slugZ(nazov) } : s))); zmena();
  if (!supabase || !nazov.trim()) return;
  window.clearTimeout(casovace.get(id));
  casovace.set(id, window.setTimeout(() => { void supabase?.from("sektor_stranky").update({ nazov: nazov.trim().slice(0, 30) }).eq("id", id).then(() => {}, () => {}); }, 600));
}

/** žiadosť o zmenu účtu centrálnej / sektora — ide DEED+ na schválenie (do 2 pracovných dní) */
export interface ZiadostUcet { dovod: string; iban: string; podana: string }
const ziadosti = new Map<string, ZiadostUcet>();
export const ziadostUctu = (kluc: string) => ziadosti.get(kluc) ?? null;
export function poziadajOZmenuUctu(kluc: string, z: Omit<ZiadostUcet, "podana">) { ziadosti.set(kluc, { ...z, podana: new Date().toISOString() }); zmena(); }

/** zavretá centrálna (Ukončenie) — 15 minút sa dá vrátiť, potom správa pravidelným darcom (server) */
let centralnaZavreta: { kedy: string; vratitDo: string; dovod: string } | null = null;
export const zavretaCentralna = () => centralnaZavreta;
export function zavriCentralnu(dovod: string) { centralnaZavreta = { kedy: new Date().toISOString(), vratitDo: new Date(Date.now() + 15 * 60000).toISOString(), dovod }; zmena(); }
export function otvorCentralnu() { centralnaZavreta = null; zmena(); }

/** ktorú položku otvoriť v Správe centrálnej a sektorov (0 = centrálna, 1… = sektor podľa poradia) */
let vyber = 0;
export const vyberCentralnej = () => vyber;
export const nastavVyberCentralnej = (i: number) => { vyber = i; };
/** OPRAVY 486: „Akú zbierku pridávate?“ → Sektorová zbierka otvorí Správu centrálnej rovno s „+ Pridať sektor“ */
let novySektor = false;
export const chcemNovySektor = () => { novySektor = true; };
export const jeNovySektor = () => novySektor;
export const vezmiNovySektor = () => { novySektor = false; };
