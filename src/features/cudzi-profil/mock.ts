import type { Kampan, Akcia } from "@/types";

// Fallback mock dáta pre OrgProfil keď subjekt nedodá vlastné.
export const KAMPANE_FALLBACK: Kampan[] = [
  { nazov: "Nový inkubátor pre novorodencov", vyzbierane: 11200, ciel: 18000, emoji: "🏥" },
  { nazov: "Hračky pre detské oddelenie", vyzbierane: 3200, ciel: 5000, emoji: "🧸" },
];

export const AKCIE_FALLBACK: Akcia[] = [
  { kedy: "SO 09:00", nazov: "Benefičný beh pre oddelenie", kde: "Mesto Trenčín · 300 bežcov" },
];

// §6.2 — stavy profilu osoby (kľúč + popisok)
export const STAVY: [string, string][] = [
  ["bezna", "Bežná"],
  ["priatel", "Priateľ"],
  ["tvorca", "Tvorca"],
];
