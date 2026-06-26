/*
  ============================================================
  ČASŤ B — Feed algoritmus (výber + poradie)  (podľa ALGORITM_FEED.pdf)
  ============================================================
  Rozhoduje, KTORÉ skutky a v akom PORADÍ uvidí user — podľa
  zvoleného rádiusu, prahu významnosti a hustoty obsahu v lokalite.

  Beží STÁLE (každý scroll, zmena rádiusu) → musí byť LACNÝ:
  obyčajný filter + zoradenie nad UŽ uloženým skóre. NIKDY nevolá AI.
  (Pri backende sa 1:1 presunie do DB dotazu s geo/skore/cas indexmi.)

  Zlaté pravidlo: hodnotenie ≠ zobrazenie. Feed nikdy nemení
  skóre/karmu/DEED — mení len, ČI a KOMU sa skutok ukáže.
  ============================================================
*/
import { FEED_CONFIG, velkostKarty } from "./cardSize";
import type { FeedKonfig, OkruhKod } from "@/types";

// ---- KONFIGURÁCIA (placeholder — všetky čísla na jednom mieste) ----
// Neskôr pôjde na server (ladenie bez deploymentu + skrytá = anti-gaming).
export const FEED_CFG: FeedKonfig = {
  // rádius → dosah v km + ZÁKLADNÝ prah významnosti (B.3):
  radiusy: {
    stvrt: { km: 5, prah: 1, label: "Moja štvrť", krat: "5 km" },
    mesto: { km: 15, prah: 3, label: "Mesto", krat: "mesto" },
    okres: { km: 40, prah: 6, label: "Okres", krat: "okres" },
    kraj: { km: 90, prah: 6, label: "Kraj", krat: "kraj" },
    krajina: { km: 9000, prah: 9, label: "Celá SR", krat: "SR" },
  },

  // adaptívny prah podľa hustoty (B.4) — mení len ZOBRAZENIE, nie skóre
  hustota: {
    veaPrah: 12, // > toľko skutkov v okruhu = husto → prah ZDVIHNI
    maloPrah: 4, // < toľko = riedko (dedina/štart) → prah ZNÍŽ
    krok: 1, // o koľko hýbeme prahom
    minPrah: FEED_CONFIG.prahFeed, // dno = prah feedu z Časti A (konzistencia A↔B)
  },

  // váhy zoradenia (B.5) — SKÓRE musí DOMINOVAŤ (B.10)
  vahy: { skore: 1.4, cerstvost: 0.25, blizkost: 0.35, podpora: 0.18 },
  podporaStrop: 50, // strop podpory proti manipulácii (B.10)

  zivotnostDni: 30, // B.7 — po 30 dňoch skutok zmizne zo ZOBRAZENIA
  frekvencaMax: 3, // B.6 — max N rovnakého typu+skupiny vo feede (anti-šum)
};

/** Položka, ktorú feed algoritmus konzumuje (modulové karty sa naň obohacujú). */
export interface FeedItem {
  typ?: string;
  skore?: number;
  typSituacie?: string;
  modul?: string;
  kat?: string;
  narodne?: boolean;
  dni?: number;
  podpora?: number;
  overene?: boolean;
  skupina?: string;
  author?: string;
  autor?: string;
  nazov?: string;
  lat?: number;
  lng?: number;
  velkost?: string;
  [extra: string]: unknown;
}

/** Používateľ pre feed — poloha + zvolený rádius. */
export interface FeedUser {
  lat?: number;
  lng?: number;
  radius: OkruhKod;
}

type Bod = { lat?: number; lng?: number } | null | undefined;

// 0..1 normalizácia s poistkou proti deleniu nulou
const norm = (x: number, max: number) => (max > 0 ? Math.min(1, Math.max(0, x) / max) : 0);

// ---- GEO: vzdialenosť dvoch bodov (haversine, km) ----
export function vzdialenostKm(a: Bod, b: Bod): number {
  if (a?.lat == null || b?.lat == null) return 0;
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad((b.lat as number) - a.lat);
  const dLng = rad((b.lng ?? 0) - (a.lng ?? 0));
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat as number)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---- B.4 Adaptívny prah podľa hustoty ----
export function vypocitajPrah(pocetVOkruhu: number, radius: OkruhKod, cfg: FeedKonfig = FEED_CFG): number {
  const zaklad = (cfg.radiusy[radius] || cfg.radiusy.stvrt).prah;
  const h = cfg.hustota;
  let prah = zaklad;
  if (pocetVOkruhu > h.veaPrah) prah += h.krok; // husto → zdvihni
  else if (pocetVOkruhu < h.maloPrah) prah -= h.krok; // riedko → zníž
  return Math.max(h.minPrah, prah);
}

// ---- B.7 Životnosť — odfiltruj skutky staršie ako 30 dní zo zobrazenia ----
export function odfiltrujStare<T extends FeedItem>(skutky: T[], cfg: FeedKonfig = FEED_CFG): T[] {
  return skutky.filter((s) => s.typ !== "skutok" || (s.dni ?? 0) <= cfg.zivotnostDni);
}

// ---- B.3 + B.4 Filter podľa rádiusu (geo + adaptívny prah) ----
export function filtrujPodlaRadiusu<T extends FeedItem>(skutky: T[], user: FeedUser, cfg: FeedKonfig = FEED_CFG): T[] {
  const r = cfg.radiusy[user.radius] || cfg.radiusy.stvrt;

  // 1) v okruhu (geo). Národné kampane nie sú viazané na lokalitu.
  const vOkruhu = skutky.filter((s) => s.narodne || vzdialenostKm(user, s) <= r.km);

  // 2) hustota = počet LOKÁLNYCH OVERENÝCH skutkov (B.10)
  const lokalne = vOkruhu.filter((s) => !s.narodne && s.typ === "skutok");
  const hustota = lokalne.filter((s) => s.overene).length;
  const prah = vypocitajPrah(hustota, user.radius, cfg);

  // 3) nad prahom významnosti. Kríza (SOS) prah PREBÍJA — vždy prejde.
  return vOkruhu.filter((s) => s.typSituacie === "kriza" || (s.skore ?? 0) >= prah);
}

// ---- B.6 Frekvenčný strop (anti-šum) ----
export function frekvencnyStrop<T extends FeedItem>(skutky: T[], cfg: FeedKonfig = FEED_CFG): T[] {
  const pocet: Record<string, number> = {};
  const out: T[] = [];
  // najprv najsilnejšie skóre, nech v skupine prežijú tie najdôležitejšie
  const podlaSkore = [...skutky].sort((a, b) => (b.skore ?? 0) - (a.skore ?? 0));
  for (const s of podlaSkore) {
    if (s.typSituacie === "kriza") {
      out.push(s);
      continue;
    } // krízu nestláčame
    const skupina = s.skupina ?? s.author ?? s.autor ?? s.nazov ?? "";
    const k = `${s.modul || s.typ}|${s.kat}|${skupina}`;
    pocet[k] = (pocet[k] || 0) + 1;
    if (pocet[k] <= cfg.frekvencaMax) out.push(s);
  }
  return out;
}

// ---- B.5 Zoradenie (poradie vo feede) ----
export function zoradFeed<T extends FeedItem>(skutky: T[], user: FeedUser, cfg: FeedKonfig = FEED_CFG): (T & { _poradie: number; _kriza: boolean })[] {
  const w = cfg.vahy;
  const skoreMax = 11;
  const maxKm = (cfg.radiusy[user.radius] || cfg.radiusy.stvrt).km || 1;

  const ohodnotene = skutky.map((s) => {
    const cerstvost = 1 - norm(s.dni ?? 0, cfg.zivotnostDni); // novšie vyššie
    const blizkost = 1 - norm(vzdialenostKm(user, s), maxKm); // bližšie vyššie
    const podpora = norm(Math.min(s.podpora ?? 0, cfg.podporaStrop), cfg.podporaStrop);
    const poradie =
      w.skore * norm(s.skore ?? 0, skoreMax) +
      w.cerstvost * cerstvost +
      w.blizkost * blizkost +
      w.podpora * podpora;
    return { ...s, _poradie: poradie, _kriza: s.typSituacie === "kriza" };
  });

  // kríza vždy navrch; inak zostupne podľa poradia
  return ohodnotene.sort((a, b) => (Number(b._kriza) - Number(a._kriza)) || (b._poradie - a._poradie));
}

// ---- ORCHESTRÁTOR — celý feed v správnom poradí krokov (B.8) ----
// životnosť → rádius+prah → frekvenčný strop → zoradenie.
export function pripravFeed<T extends FeedItem>(skutky: T[], user: FeedUser, cfg: FeedKonfig = FEED_CFG): (T & { _poradie: number; _kriza: boolean; _riadky: number })[] {
  const ziju = odfiltrujStare(skutky, cfg); // B.7
  const vRadiuse = filtrujPodlaRadiusu(ziju, user, cfg); // B.3 + B.4
  const stlacene = frekvencnyStrop(vRadiuse, cfg); // B.6
  const zoradene = zoradFeed(stlacene, user, cfg); // B.5
  return zoradene.map((s) => ({ ...s, _riadky: velkostKarty(s) }));
}
