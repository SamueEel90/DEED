// ============================================================
// KARTA 37 · OPRAVY 114 — Nová zbierka charity: koncept (rozpísané sa ukladá samo) a spustené zbierky.
// Ukladá sa do účtu (DB): koncept → profil_stranky.koncept_zbierky, spustená → tabuľka zbierka
// (stĺpce stranka, nastavenie, zapecatena — migrácia 0030). Nič do prehliadača (localStorage).
// Bez DB spojenia (mock/offline) drží appka všetko v pamäti relácie.
// ============================================================
import { bezDataUrl } from "./uploadFoto";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import type { Vyrez } from "@/components/orezfotky";

/** 5. 10. · popis = nepovinný popis fotky (najviac 80 znakov), darca ho vidí pod fotkou na celej obrazovke, čítačka ako alt */
export type MediumZbierky = { id: number; typ: "foto" | "video"; src: string; sek?: number; w?: number; vyrez?: Vyrez; popis?: string };
export const POPIS_FOTKY_MAX = 80;
export type TypZbierky = "kratka" | "dlha";
/** lehoty dokladovania (karta 37 · bod 5) — žiadny „mesačný update" */
export type LehotaKluc = "30" | "60" | "priebezne" | "stvrtrocne";

export interface NovaZbierkaData {
  nazov: string;
  /** hlavný text (HTML z editora), najviac 12 riadkov */
  popis: string;
  /** pokračovanie príbehu — za „… viac" */
  popis2: string;
  media: MediumZbierky[];
  typ: TypZbierky;
  mesiace: 3 | 6 | 12;
  cielTyp: "ciel" | "otv";
  /** cieľová suma v € (len číslice) */
  ciel: string;
  /** transparentný účet zbierky (od P1) — v Zadarmo ide na hlavný účet organizácie */
  iban: string;
  sada: number;
  eurc: boolean;
  sadaE: number;
  prav: boolean;
  ucel: number | null;
  ineT: string;
  ineL: number | null;
  /** súhlas ľudí na fotkách a videách (karta 37 · bod 8) */
  suhlas?: boolean;
  /** posledný otvorený krok (rozpísaná zbierka pokračuje tam, kde skončila) */
  krok: number;
  /** KARTA 56D §6 · OPRAVY 161: zbierka farnosti (na účet hlavnej) alebo zbierka pre veriacich (pohreb, svadba, iné) */
  farnost?: ZbierkaFarnosti;
}
/** KARTA 56D §6 · OPRAVY 161 — druh zbierky vo farnosti. Pre veriacich: príjemca (overený skenom), oznámenie a rozdelenie. */
export interface ZbierkaFarnosti {
  druh: "farnost" | "pohreb" | "svadba" | "ine";
  /** zbierka pre veriacich: podiel farnosti v % (0 – 3, po 0,5) a najviac 100 € */
  podiel?: number;
  /** príjemca peňazí (pozostalý, snúbenec …) — účet z jeho overeného profilu */
  prijemca?: { meno: string; overeny: string };
  /** oznámenie na stránke farnosti (parte / svadobné oznámenie / oznámenie), ku ktorému je zbierka pripojená */
  oznamenie?: { meno: string; rodena?: string; roky?: string; kedy?: string; kde?: string; kto?: string; vlastne?: string; prispevok?: string };
  /** KARTA 56E §2b: zvyšok rozhoduje príjemca — s kým sa podelí (len registrovaní v DEED, najviac 2, každý aspoň 5 %) */
  podelit?: { id: string; nazov: string; pct: number }[];
}
export const PODELIT_MAX = 2, PODELIT_MIN = 5, PODELIT_KROK = 5;
/** podiel farnosti pri zbierke pre veriacich: najviac 3 % a najviac 100 € (OPRAVY 161) */
export const PODIEL_MAX = 3, PODIEL_KROK = 0.5, PODIEL_STROP_EUR = 100;
export const prazdnaZbierka = (): NovaZbierkaData => ({
  nazov: "", popis: "", popis2: "", media: [], typ: "kratka", mesiace: 6, cielTyp: "ciel", ciel: "", iban: "",
  sada: 1, eurc: true, sadaE: 0, prav: false, ucel: null, ineT: "", ineL: null, suhlas: false, krok: 1,
});

// ---- texty a voľby z prototypu (Nova zbierka PC) ----
export const SADY: [string, number[]][] = [["Drobné", [1, 3, 5]], ["Stredné", [5, 10, 20]], ["Vyššie", [10, 25, 45]]];
export const SADY_EURC: [string, number[]][] = [["Mikro", [0.1, 0.5, 1]], ["Drobné", [1, 3, 5]], ["Stredné", [5, 10, 20]]];
export const KROKY_ZBIERKY = ["Obsah", "Fotky a video", "Suma a účet", "Platby", "Dokladovanie", "Kontrola"];
/** účel · lehota · popis · kľúč lehoty (null = text lehoty nie je zo 4 lehôt karty 37 — čaká na dizajn) */
export const UCELY: [string, string, string, LehotaKluc | null][] = [
  ["Materiálna pomoc", "30 dní od skončenia", "jedlo, oblečenie, pomôcky, vybavenie", "30"],
  ["Operácia / akútna liečba", "60 dní od zákroku", "zákrok, lieky, pobyt v nemocnici", "60"],
  ["Dlhodobá liečba a rehabilitácia", "priebežne + záverečná", "terapie, rehabilitácie, pravidelné lieky", "priebezne"],
  ["Vzdelávanie", "po semestri", "školné, kurzy, pomôcky do školy", null],
  ["Stavba / rekonštrukcia", "priebežne + záverečná", "strecha, bezbariérovosť, oprava bytu", "priebezne"],
  ["Krízová pomoc", "60 dní od vyplatenia", "požiar, povodeň, náhla strata príjmu", "60"],
  ["Operatívny fond", "štvrťročne", "priebežné výdavky projektu", "stvrtrocne"],
  ["Iné", "vyberiete nižšie", "napíšete, na čo zbierate", null],
];
export const LEHOTY: [string, LehotaKluc][] = [["30 dní od skončenia", "30"], ["60 dní od skončenia", "60"], ["priebežne + záverečná", "priebezne"], ["štvrťročne", "stvrtrocne"]];
export const MAX_FOTIEK_ZB = 8, VIDEO_S_ZB = 45, NAZOV_ZB = 80, RIADKY_ZB = 12, ZNAKY_ZB = 1500;

export const cielCislo = (d: NovaZbierkaData) => parseInt(d.ciel.replace(/\D/g, ""), 10) || 0;
export const jeIne = (d: NovaZbierkaData) => d.ucel === UCELY.length - 1;
export function lehotaZbierky(d: NovaZbierkaData, dlha = d.typ === "dlha"): { text: string; kluc: LehotaKluc | null } {
  if (d.ucel == null) return { text: "", kluc: null };
  const zakl = jeIne(d) ? (d.ineL != null ? { text: LEHOTY[d.ineL][0], kluc: LEHOTY[d.ineL][1] } : { text: "", kluc: null }) : { text: UCELY[d.ucel][1], kluc: UCELY[d.ucel][3] };
  // karta 37 · bod 7: dlhodobá zbierka má len záverečnú lehotu — 60 dní pri účeloch so 60, inak 30 (žiadne štvrťročne ani priebežne ako povinnosť)
  if (dlha && zakl.text) return zakl.text.includes("60") ? { text: "záverečné do 60 dní od skončenia", kluc: "60" } : { text: "záverečné do 30 dní od skončenia", kluc: "30" };
  return zakl;
}
/** karta 37 · bod 7 — texty dlhodobej zbierky */
export const DLHA_FEED_TEXT = "Prvých 30 dní bude zbierka vo feede veľká. Potom tam ostane, kým chodia dary. Keď dary prestanú, ľudia ju nájdu na vašom profile. Pomôže priebežné doloženie, skutok, pri ktorom pôjdu peniaze na túto zbierku, alebo topovanie.";
export const DLHA_PRIEBEZNE_TEXT = "Priebežne môžete dokladovať, kedy chcete. Zbierka sa tým dostane na 24 hodín hore, najviac raz za mesiac.";

// ---- spustená zbierka ----
export interface SpustenaZbierka extends NovaZbierkaData {
  id: string; stranka: string; spustena: string;
  /** účet, kam prídu peniaze (Zadarmo: hlavný účet organizácie z registrácie) */
  ucet: string; lehota: string; lehotaKluc: LehotaKluc | null;
  /** verejné číslo zbierky = VS (10 číslic s Luhnom) — prideľuje server (zbierka.vs, migrácia 0049); v nastavenie sa neukladá */
  vs?: string;
  /** životný cyklus zo stĺpca zbierka.stav (nie z nastavenia) — KARTA 56D: ukončená = ZRUŠENÁ */
  stav?: "aktivna" | "ukoncena" | "vyuctovana";
}

// ---- pamäť relácie + odber zmien ----
const koncepty = new Map<string, NovaZbierkaData | null>();
const spustene = new Map<string, SpustenaZbierka[]>();
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyZbierok = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);

export const konceptZbierkyZPamate = (stranka: string): NovaZbierkaData | null => koncepty.get(stranka) ?? null;
export const zbierkyStrankyZPamate = (stranka: string): SpustenaZbierka[] => spustene.get(stranka) ?? [];

export async function nacitajKonceptZbierky(stranka: string): Promise<NovaZbierkaData | null> {
  if (supabase) {
    const { data, error } = await supabase.from("profil_stranky").select("koncept_zbierky").eq("stranka", stranka).maybeSingle();
    if (!error) { const k = (data?.koncept_zbierky as NovaZbierkaData | null) ?? null; koncepty.set(stranka, k); return k; }
  }
  return konceptZbierkyZPamate(stranka);
}
/** volá sa automaticky 600 ms po poslednej zmene */
export async function ulozKonceptZbierky(stranka: string, d: NovaZbierkaData | null): Promise<void> {
  koncepty.set(stranka, d); zmena();
  if (supabase) await supabase.from("profil_stranky").upsert({ stranka, koncept_zbierky: await bezDataUrl(d, "zbierky"), koncept_zbierky_cas: d ? new Date().toISOString() : null }, { onConflict: "stranka" });
}

export async function nacitajZbierkyStranky(stranka: string): Promise<SpustenaZbierka[]> {
  if (supabase) {
    const { data, error } = await supabase.from("zbierka").select("id, vs, nastavenie, zapecatena, stav").eq("stranka", stranka).order("vytvorene", { ascending: false });
    if (!error && data) {
      const l = data.filter((r) => r.nastavenie).map((r) => ({ ...(r.nastavenie as SpustenaZbierka), vs: (r.vs as string | null) ?? undefined, stav: (r.stav as SpustenaZbierka["stav"]) ?? "aktivna" }));
      spustene.set(stranka, l); zmena(); return l;
    }
  }
  return zbierkyStrankyZPamate(stranka);
}

/** KARTA 48 · úprava spustenej zbierky v Správe (Ukladá sa samo): len text pre darcov, galéria a rýchle sumy.
 *  Cieľ, účel, účet a lehota ostávajú zapečatené. */
export async function upravZbierku(stranka: string, id: string, p: Pick<NovaZbierkaData, "popis" | "popis2" | "media" | "sada" | "eurc" | "sadaE">): Promise<void> {
  const l = zbierkyStrankyZPamate(stranka);
  const z = l.find((x) => x.id === id); if (!z) return;
  const n = { ...z, ...p };
  spustene.set(stranka, l.map((x) => (x.id === id ? n : x))); zmena();
  // vs a stav sú stĺpce zbierky, nie súčasť zapečateného nastavenia — inak by ich zámok 0041 bral ako zmenu
  const { vs: _vs, stav: _stav, ...nastavenie } = n;
  if (supabase) await supabase.from("zbierka").update({ nastavenie: await bezDataUrl(nastavenie, "zbierky") }).eq("id", id);
}

/** Zapečatiť a spustiť — po spustení sa názov, text, dĺžka, suma, účet, účel a lehota nedajú meniť (karta 37 · bod 4) */
export async function spustiZbierku(stranka: string, d: NovaZbierkaData, ucet: string, modul = "charity"): Promise<SpustenaZbierka> {
  const teraz = new Date().toISOString();
  const leh = lehotaZbierky(d);
  let z: SpustenaZbierka = { ...d, id: `zb-${Date.now().toString(36)}`, stranka, spustena: teraz, ucet, lehota: leh.text, lehotaKluc: leh.kluc };
  if (supabase) {
    z = await bezDataUrl(z, "zbierky");   // 5.5: fotky do Storage, v zbierka.nastavenie len URL
    // Zadanie 3 · 3.6: DB pustí zapečatenie len s účtom overeným pre túto stránku (0044) — inak chyba, nič sa nespustí
    const { data, error } = await supabase.from("zbierka").insert({
      id: z.id, nazov: d.nazov, modul, typ: "zbierka", ciel: d.cielTyp === "ciel" ? cielCislo(d) : null,
      stav: "aktivna", stranka, nastavenie: z, zapecatena: teraz,
    }).select("vs").single();
    if (error) throw new Error(error.message);
    if (data?.vs) z.vs = data.vs as string; // číslo zbierky pridelil server (0049)
    await supabase.from("profil_stranky").upsert({ stranka, koncept_zbierky: null, koncept_zbierky_cas: null }, { onConflict: "stranka" });
  }
  spustene.set(stranka, [z, ...zbierkyStrankyZPamate(stranka)]);
  koncepty.set(stranka, null);
  zmena();
  return z;
}

/** KARTA 56D §6: ukončiť zbierku — dary sa zastavia, počítadlo ostáva na profile. Stav je životný cyklus (zámok 0041 ho dovoľuje). */
export async function ukonciZbierku(stranka: string, id: string): Promise<void> {
  spustene.set(stranka, zbierkyStrankyZPamate(stranka).map((x) => (x.id === id ? { ...x, stav: "ukoncena" as const } : x))); zmena();
  if (supabase) { const { error } = await supabase.from("zbierka").update({ stav: "ukoncena" }).eq("id", id); if (error) throw new Error(error.message); }
}
