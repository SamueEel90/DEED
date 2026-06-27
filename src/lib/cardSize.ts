/*
  ============================================================
  ČASŤ A — Algoritmus veľkosti karty  (podľa ALGORITM_FEED.pdf)
  ============================================================
  Z finálneho skóre skutku (číslo ~0–11) určí veľkosť karty vo
  feede: 1, 2 alebo 3 riadky. 4 riadky = osobitný krízový režim
  (nie zo skóre — prebíja ho).

  Beží RAZ, pri zápise skutku. Deterministické, žiadne AI.
  Hodnotenie ≠ zobrazenie — táto funkcia NIKDY nemení skóre,
  len z neho odvodí rozmer karty.
  ============================================================
*/
import type { CardSizeKonfig, TypSituacie } from "@/types";

// ---- PRAHY (ŠTARTOVACIE — placeholder, ladí sa na dátach) ----
// Drž ich na jednom mieste; neskôr pôjdu do serverovej konfigurácie
// (skrytá logika = anti-fraud).
export const FEED_CONFIG: CardSizeKonfig = {
  prahFeed: 1.0, // pod tým do feedu nejde (len karma)
  prah2: 3.0, // 1 → 2 riadky
  prah3: 6.0, // 2 → 3 riadky
};

/** Minimum, ktoré veľkosť karty potrebuje vedieť o skutku. */
export interface KartaVstup {
  skore?: number;
  typSituacie?: TypSituacie | string;
  typ?: string;
  velkost?: string;
}

// ---- VEĽKOSŤ KARTY ----
// výstup: 0 = do feedu nejde · 1/2/3 = počet riadkov · 4 = krízový režim
export function velkostKarty(skutok: KartaVstup, config: CardSizeKonfig = FEED_CONFIG): 0 | 1 | 2 | 3 | 4 {
  if (skutok.typSituacie === "kriza") return 4; // krízový režim prebíja skóre
  const s = skutok.skore ?? 0;
  if (s < config.prahFeed) return 0; // 0 = nezobrazí sa vo feede
  if (s < config.prah2) return 1;
  if (s < config.prah3) return 2;
  return 3;
}

// ---- ADAPTÉR pre existujúce UI ----
// Karty v appke používajú menné rozmery ("small/med/big"). Žiadosti a
// charity majú vlastný typ obsahu (nie zo skóre) → ponechávame ich rozmer.
const RIADKY_NA_VELKOST: Record<0 | 1 | 2 | 3 | 4, string | null> = {
  0: null,
  1: "small",
  2: "med",
  3: "big",
  4: "big",
};

// finálny rozmer karty pre render: skutky podľa skóre, ostatné podľa typu
export function zobrazVelkost(it: KartaVstup, config: CardSizeKonfig = FEED_CONFIG): string {
  if (it.typ === "ziadost") return "req"; // žiadosť o pomoc — vlastný layout
  if (it.typ === "charita") return it.velkost ?? "med"; // charita — kurátorský rozmer (MoniBar)
  return RIADKY_NA_VELKOST[velkostKarty(it, config)] ?? "small";
}

// ---- POMER STRÁN MÉDIÍ (karty + hero) na TABLETE/DESKTOPE (wide) ----
// Na tablete/desktope dostane kontajner média `aspectRatio: MEDIA_AR` (16:9).
// Na MOBILE ostávajú pôvodné fixné px výšky (bez zmeny) — preto sa MEDIA_AR
// používa iba vo `wide` vetve.
export const MEDIA_AR = "16 / 9";
