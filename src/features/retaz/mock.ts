import type { RetazZiadost } from "@/types";
import type { ChainQueueItem, CreatorChain } from "./fronta";
import { prečísluj } from "./fronta";

// žiadosti, na ktoré možno poslať reťazovú časť (Help/Charita).
// MVP: priradenie 1 žiadosti; viac = fáza 2/3.
export const ZIADOSTI: RetazZiadost[] = [
  { id: "z1", nazov: "Rodina po povodni", zdroj: "Help", lok: "tvoja štvrť · Trenčín", odpor: true, emoji: "⚠", col: "#F2706F" },
  { id: "z2", nazov: "Detská nemocnica — inkubátor", zdroj: "Charita", lok: "Gold · Bratislava", overena: true, emoji: "🏥", col: "#5BA8F0" },
  { id: "z3", nazov: "Po úraze — odvoz na rehabilitácie", zdroj: "Help", lok: "Zámostie · Trenčín", emoji: "🦽", col: "#F2706F" },
  { id: "z4", nazov: "Liga proti rakovine", zdroj: "Charita", lok: "Gold · celá SR", overena: true, emoji: "🎗", col: "#5BA8F0" },
  { id: "z5", nazov: "Útulok Túlavá labka — krmivo na zimu", zdroj: "Help", lok: "okraj · Trenčín", emoji: "🐾", col: "#3DD68C" },
  { id: "z6", nazov: "Mladá rodina — predčasné dvojičky", zdroj: "Help", lok: "Noviny · Trenčín", odpor: true, emoji: "👶", col: "#F2706F" },
  { id: "z7", nazov: "Deň narcisov — onkopacienti", zdroj: "Charita", lok: "Gold · celá SR", overena: true, emoji: "🌼", col: "#5BA8F0" },
];

// ---- REŤAZ TVORCU (FRONTA) — mock ----
// kategórie pre systémové doparovanie (§4.4)
const KAT: Record<string, string> = { z1: "Pomoc", z2: "Zdravie", z3: "Pomoc", z4: "Zdravie", z5: "Priroda", z6: "Pomoc", z7: "Zdravie" };
// cieľové sumy zbierok (DEED) — nízke, nech je demo prehodenia hmatateľné
const CIEL: Record<string, number> = { z1: 3000, z2: 8000, z3: 1500, z4: 5000, z5: 900, z6: 4000, z7: 6000 };

/** Zbierka (ZIADOSTI) → prázdna položka fronty s daným % (default 10). */
export function ziadostNaPolozku(z: RetazZiadost, percent = 10, vyzbierane = 0): ChainQueueItem {
  return {
    id: `q-${z.id}-${Math.round(percent)}`,
    collectionId: z.id,
    nazov: z.nazov,
    emoji: z.emoji,
    lok: z.lok,
    zdroj: z.zdroj,
    overena: z.overena,
    kat: KAT[z.id],
    col: z.col,
    ciel: CIEL[z.id] ?? 3000,
    vyzbierane,
    position: 0,
    percent,
    status: "waiting",
    addedBy: "creator",
  };
}

/** Predvyplnený DRAFT reťaze pre demo (tvorca ešte edituje). */
export function mockDraftChain(creatorId: string): CreatorChain {
  const it = (id: string, pct: number, vyz = 0) =>
    ziadostNaPolozku(ZIADOSTI.find((z) => z.id === id)!, pct, vyz);
  return {
    id: "chain-demo",
    creatorId,
    chainStatus: "draft",
    systemFallbackEnabled: true,
    queue: prečísluj([it("z5", 20), it("z1", 15), it("z2", 5)]),
  };
}

/** Publikovaná reťaz pre verejnú podstránku (prvá už z časti naplnená). */
export function mockPublishedChain(creatorId = "tvorca-demo"): CreatorChain {
  const it = (id: string, pct: number, vyz = 0) =>
    ziadostNaPolozku(ZIADOSTI.find((z) => z.id === id)!, pct, vyz);
  return {
    id: "chain-verejna",
    creatorId,
    chainStatus: "published",
    systemFallbackEnabled: true,
    publishedAt: "2026-06-20T10:00:00.000Z",
    // z5 skoro naplnená → jeden dar zavrie cieľ a podiel pretečie ďalšej (živý prehod)
    queue: prečísluj([it("z5", 20, 860), it("z1", 15), it("z6", 10)]),
  };
}

/** §4.4 — pool overených otvorených zbierok na systémové doparovanie. */
export const FALLBACK_KANDIDATI: ChainQueueItem[] = ZIADOSTI
  .filter((z) => z.overena)
  .map((z) => ziadostNaPolozku(z, 10));
