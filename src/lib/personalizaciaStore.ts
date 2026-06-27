// ============================================================
// DEED · Personalizačný store — perzistenčný šev (mock localStorage).
// Jeden zdroj pravdy pre osobné signály: záujmy + sledovanie + podpora.
// Dnes localStorage (deed.me.*); zajtra Supabase (tabuľka "zaujmy" už
// existuje v lib/db — výmena = TENTO jeden súbor). Číta usePersonalizacia().
// ============================================================
import type { Zaujem, Sledovanie, Podpora, PersonalizaciaStav } from "@/types";

// ---- localStorage kľúče (namespace deed.me.* — oddelené od deed.aktivity.*) ----
export const ME = {
  zaujmy: "deed.me.zaujmy.v1",
  sledovani: "deed.me.sledovani.v1",
  podpory: "deed.me.podpory.v1",
};
const LEGACY_FOLLOWS = "deed.aktivity.follows.v1"; // { [meno]: true } — staré sledovanie z Aktivít
const LEGACY_MIGROVANE = "deed.me.sledovani.migrated.v1"; // flag: legacy import už prebehol (jednorazový)

function load<T>(key: string, fallback: T): T {
  try { const v = JSON.parse(localStorage.getItem(key) as string); return v == null ? fallback : v; }
  catch { return fallback; }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* napr. private mode */ }
}

// ---- KATALÓG ZÁUJMOV — jediná „vocabulary" (label + emoji + kľúče do feedu) ----
// `oblast` = kanonický kľúč ukladaný do Zaujem.oblast.
//   (Pozn.: DB číselník `cis_zaujmy` má diakritiku „Šport/Eko…"; zjednotenie slovníka
//    a DB↔store most pre reálne účty je úloha Fázy 4 — dnes beží na mock/demo.)
// `kluce`  = hodnoty, ktoré nesú položky feedu (Good `kat` + Aktivity `dom`) → afinita.
export interface ZaujemKategoria { oblast: string; label: string; emoji: string; kluce: string[]; }
export const ZAUJMY_KATALOG: ZaujemKategoria[] = [
  { oblast: "Priroda",  label: "Príroda",  emoji: "🌿", kluce: ["Priroda", "eko"] },
  { oblast: "Komunita", label: "Komunita", emoji: "🤝", kluce: ["Komunita"] },
  { oblast: "Zdravie",  label: "Zdravie",  emoji: "❤️", kluce: ["Zdravie", "zdravie"] },
  { oblast: "Ucenie",   label: "Učenie",   emoji: "📚", kluce: ["Ucenie", "learn"] },
  { oblast: "Sport",    label: "Šport",    emoji: "🏃", kluce: ["sport"] },
  { oblast: "Art",      label: "Umenie",   emoji: "🎨", kluce: ["art"] },
  { oblast: "Pomoc",    label: "Pomoc",    emoji: "🆘", kluce: ["Pomoc"] },
];
const KLUCE_OBLASTI: Record<string, string[]> = Object.fromEntries(ZAUJMY_KATALOG.map((z) => [z.oblast, z.kluce]));

/** Záujmy → množina kľúčov pre feed afinitu (Good `kat` + Aktivity `dom`). */
export function zaujmyNaKluce(zaujmy: Zaujem[]): Set<string> {
  const s = new Set<string>();
  for (const z of zaujmy) for (const k of (KLUCE_OBLASTI[z.oblast] || [])) s.add(k);
  return s;
}

/** Top-level záujem (celá oblasť → pod_polozka = "*"). */
export const zaujemZOblasti = (oblast: string): Zaujem => ({ oblast, pod_polozka: "*" });

// ---- načítanie / uloženie (mock vrstva — zajtra Supabase) ----
export function nacitajLokalne(): Omit<PersonalizaciaStav, "nacitavam"> {
  return {
    zaujmy: load<Zaujem[]>(ME.zaujmy, []),
    sledovani: load<Sledovanie[]>(ME.sledovani, []),
    podpory: load<Podpora[]>(ME.podpory, []),
  };
}
export const ulozZaujmy = (z: Zaujem[]) => save(ME.zaujmy, z);
export const ulozSledovani = (s: Sledovanie[]) => save(ME.sledovani, s);
export const ulozPodpory = (p: Podpora[]) => save(ME.podpory, p);

/** Má legacy import ešte prebehnúť? Len kým nie je nastavený flag a legacy kľúč existuje. */
export function legacyNaImport(): boolean {
  try {
    return localStorage.getItem(LEGACY_MIGROVANE) == null && localStorage.getItem(LEGACY_FOLLOWS) != null;
  } catch { return false; }
}

/** Jednorazový import starých Aktivity follow-ov — po importe nastaví flag, aby sa už
 *  „nevzkriesili" potom, čo používateľ všetkých prestane sledovať. */
export function importLegacyFollows(): Sledovanie[] {
  const raw = load<Record<string, boolean>>(LEGACY_FOLLOWS, {});
  const out = Object.keys(raw).filter((m) => raw[m]).map((meno) => ({ meno, typ: "osoba" as const }));
  save(LEGACY_MIGROVANE, true); // migrácia dokončená (aj pri prázdnom importe)
  return out;
}

/** Demo seed — aby „Môj DEED" nebol prázdny pri prvom otvorení (len demo identita).
 *  Mená/refId zodpovedajú mock feedu Domov (Good/mock.ts), nech sekcie reálne ožijú. */
export function demoSeed(): Omit<PersonalizaciaStav, "nacitavam"> {
  return {
    zaujmy: [zaujemZOblasti("Priroda"), zaujemZOblasti("Komunita"), zaujemZOblasti("Zdravie")],
    sledovani: [
      { meno: "Mária H.", typ: "osoba" },
      { meno: "EkoTím Juh", typ: "osoba" },
    ],
    podpory: [
      { refId: 3, typ: "ziadost", modul: "help", suma: 50, kanal: "DEED", komu: "Rodina Kováčová", vyzbierane: 1450, ciel: 2400 },
    ],
  };
}
