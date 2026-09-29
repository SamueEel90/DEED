// Typy slovníka (KARTA 31). Hodnota = text alebo tvary množného čísla podľa Intl.PluralRules.
// Parametre v texte: {n}, {meno}… — čísla sa formátujú podľa jazyka.
export type Tvary = { one?: string; few?: string; many?: string; other: string };
export type Hodnota = string | Tvary;
export type Slovnik = Record<string, Hodnota>;
