import type { RetazZiadost } from "@/types";

// žiadosti, na ktoré možno poslať reťazovú časť (Help/Charita).
// MVP: priradenie 1 žiadosti; viac = fáza 2/3.
export const ZIADOSTI: RetazZiadost[] = [
  { id: "z1", nazov: "Rodina po povodni", zdroj: "Help", lok: "tvoja štvrť · Trenčín", odpor: true, emoji: "⚠", col: "#F2706F" },
  { id: "z2", nazov: "Detská nemocnica — inkubátor", zdroj: "Charita", lok: "Gold · Bratislava", overena: true, emoji: "🏥", col: "#5BA8F0" },
  { id: "z3", nazov: "Po úraze — odvoz na rehabilitácie", zdroj: "Help", lok: "Zámostie · Trenčín", emoji: "🦽", col: "#F2706F" },
  { id: "z4", nazov: "Liga proti rakovine", zdroj: "Charita", lok: "Gold · celá SR", overena: true, emoji: "🎗", col: "#5BA8F0" },
];
