// Sady rýchlych súm — príjemca si vyberá z pripravených sád (jednotný vzhľad, žiadne 7 € či 999 €).
// Drobné eurové sumy do 5 € idú len cez SEPA (pevný poplatok karty by ich zožral); vyššie aj kartou.
export type SadaEur = "drobne" | "stredne" | "vyssie";
export type SadaEurc = "mikro" | "drobne" | "stredne" | "vacsie";

export const SADY_EUR: Record<SadaEur, { label: string; sumy: number[] }> = {
  drobne: { label: "Drobné", sumy: [1, 3, 5] },
  stredne: { label: "Stredné", sumy: [5, 10, 20] },
  vyssie: { label: "Vyššie", sumy: [10, 25, 50] },
};
export const SADY_EURC: Record<SadaEurc, { label: string; sumy: number[] }> = {
  mikro: { label: "Mikro", sumy: [0.1, 0.5, 1] },
  drobne: { label: "Drobné", sumy: [1, 3, 5] },
  stredne: { label: "Stredné", sumy: [5, 10, 20] },
  vacsie: { label: "Väčšie", sumy: [20, 35, 45] }, // KARTA 35 · Dary v EURC
};
/** do tejto sumy len SEPA */
export const LEN_SEPA_DO = 5;
