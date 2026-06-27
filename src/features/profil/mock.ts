// ============================================================
// MODUL PROFIL — MOCK dáta (prevody, moje skutky, karma, štatistiky, témy)
// Čisté dátové polia vyňaté z Profil.tsx. Bez JSX.
// ============================================================
import type { PrevodTuple, MojSkutokTuple } from "@/types";

/** Posledné prevody v peňaženke. */
export const PREVODY: PrevodTuple[] = [
  ["Podpora · Jana N.", "-50", "#F2706F"],
  ["Odmena za skutok", "+177", "#3DD68C"],
  ["Reťaz dobra → Rodina po povodni", "-39", "#2BD49B"],
  ["Kúpa kartou", "+500", "#3DD68C"],
  ["Podpora · Jozef M.", "-100", "#F2706F"],
  ["Odmena za skutok · seniori", "+38", "#3DD68C"],
  ["Podpora · Útulok Túlavá labka", "-25", "#F2706F"],
  ["Odmena za darovanie krvi", "+50", "#3DD68C"],
  ["Reťaz dobra → Pani Oľga", "-20", "#2BD49B"],
  ["SMS dar · Deň narcisov", "-2", "#F2706F"],
  ["Bonus za 30 dní aktivity", "+60", "#E7C766"],
];

/** Podstránka „Moje skutky". */
export const MOJE_SKUTKY: MojSkutokTuple[] = [
  ["Celú noc sme hľadali nezvestného dôch…", "+177", "#5BA8F0"],
  ["Vyčistili sme čiernu skládku pri potoku…", "+84", "#3DD68C"],
  ["Odviezol som suseda na dialýzu", "+30", "#3DD6CE"],
  ["Naučil som babičku volať cez videohovor", "+20", "#5BA8F0"],
  ["Mesiac do práce na bicykli — 240 km", "+62", "#3DD68C"],
  ["Popoludnie pre osamelých seniorov", "+38", "#5BA8F0"],
  ["Bezplatná poradňa o cukrovke pre seniorov", "+26", "#3DD6CE"],
  ["Predčítam deťom na detskom oddelení", "+24", "#A98BF0"],
  ["Opravil som lavičky a hojdačku na ihrisku", "+20", "#5BA8F0"],
  ["Daroval som plazmu — už 20. raz", "+40", "#3DD6CE"],
];

/** Podstránka „Karma a úrovne". */
export const KARMA: MojSkutokTuple[] = [
  ["Celková karma", "Gold · L7", "#E7C766"],
  ["Generosity Score (reťaz dobra)", "+142 ♻", "#2BD49B"],
  ["Komunita", "Silver", "#5BA8F0"],
  ["Príroda", "Gold", "#3DD68C"],
  ["Zdravie", "Bronze", "#3DD6CE"],
  ["Učenie", "Bronze", "#A98BF0"],
  ["Pomoc", "Silver", "#F2706F"],
  ["Séria dní v rade", "21 🔥", "#E7C766"],
];

/** Podstránka „Štatistiky a umiestnenie". */
export const STATISTIKY: MojSkutokTuple[] = [
  ["Celkové umiestnenie", "#412 v meste", "#E7C766"],
  ["Príroda", "#28 v štvrti", "#3DD68C"],
  ["Tento mesiac", "+9 skutkov", "#5BA8F0"],
  ["Celkovo darované", "840 €", "#3DD68C"],
  ["Komunita", "#54 v meste", "#5BA8F0"],
  ["Najlepšia séria", "21 dní v rade", "#E7C766"],
  ["Sledujúci", "128 ľudí", "#A98BF0"],
  ["Podporených ľudí", "37", "#2BD49B"],
];

/** Témy / záujmy v nastaveniach. */
export const TEMY: string[] = ["Šport", "Eko", "Zdravie", "Art", "Učenie", "Komunita", "Zvieratá", "Senior"];
