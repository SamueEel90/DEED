// KARTA 55 · F — jednotný znak druhu (2a): farby v styles/druhy.css (svetlá aj tmavá téma).
import "@/styles/druhy.css";
export type Druh = "zbierka" | "ziadost" | "skutok" | "ponuka" | "akcia" | "hladame";
export const DRUH_NAZOV: Record<Druh, string> = { zbierka: "Zbierka", ziadost: "Žiadosť", skutok: "Skutok", ponuka: "Ponuka", akcia: "Akcia", hladame: "Hľadáme" };
/** farba štítku a ľavého okraja */
export const druhF = (d: Druh) => `var(--dr-${d})`;
/** farba textu druhu (bez podkladu) */
export const druhT = (d: Druh) => `var(--dr-${d}-t)`;
