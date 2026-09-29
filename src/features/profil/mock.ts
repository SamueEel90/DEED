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
  ["Dar · Deň žltej stužky", "-2", "#F2706F"],
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

/** karma (repo.profil.karma) — len celkové číslo; séria dní zrušená (karta 26) */
export const KARMA: MojSkutokTuple[] = [
  ["Celková karma", "2 480", "var(--a-gold)"],
];

/** karma vlastníka (vidí ju len on) a počet jeho skutkov — mock do Supabase */
export const MOJA_KARMA = 2480;
export const MOJE_SKUTKY_POCET = 48;

/** Štatistiky (karta 27) — vidí len vlastník; žiadne umiestnenia ani porovnanie s inými. Mock do Supabase. */
export type StatObdobie = {
  skutkov: number; hodin: number; darovaneEur: number; ludi: number; zbierok: number; oblasti: number;
  /** skutky po mesiacoch (len Tento rok), index 0 = január */
  mesiace?: number[];
  /** kde pomáhaš — oblasti štítov a počet skutkov */
  kde: [string, number][];
  /** tvoj dosah: overili · darov cez skutky a reťaz · pridali sa na pozvánku */
  dosah: [number, number, number];
};
export type StatistikyData = { rok: StatObdobie; vsetko: StatObdobie; seria: { najdlhsia: number; teraz: number } };
export const STATISTIKY: StatistikyData = {
  rok: { skutkov: 48, hodin: 126, darovaneEur: 840, ludi: 37, zbierok: 12, oblasti: 6, mesiace: [2, 3, 5, 4, 6, 3, 7, 4, 9],
    kde: [["EKO", 16], ["HELP", 11], ["LEARN", 9], ["ART", 6], ["HEALTH", 4], ["SPORT", 2]], dosah: [214, 63, 5] },
  vsetko: { skutkov: 131, hodin: 342, darovaneEur: 2310, ludi: 94, zbierok: 27, oblasti: 7,
    kde: [["EKO", 41], ["HELP", 33], ["LEARN", 22], ["ART", 15], ["HEALTH", 11], ["SPORT", 6], ["CARE", 3]], dosah: [580, 171, 12] },
  seria: { najdlhsia: 21, teraz: 3 },
};

/** Témy / záujmy v nastaveniach. */
export const TEMY: string[] = ["Šport", "Eko", "Zdravie", "Art", "Učenie", "Komunita", "Zvieratá", "Senior"];

/** Peňaženka (karta 18 bod 5) — posledné pohyby: [deň, názov, popis, suma, príjem?, mena] — mock do Supabase */
export const POHYBY: [string, string, string, string, boolean, "DEED" | "EURC"][] = [
  ["Dnes", "Odmena za skutok", "Vyčistili sme skládku pri potoku", "+84 DeeD", true, "DEED"],
  ["Dnes", "Mikrodar · Zbierka pre Sárku", "cez Mareka Tvorí", "−1,00 EURC", false, "EURC"],
  ["Včera", "Mikrodar · Útulok Túlavá labka", "EURC", "−0,50 EURC", false, "EURC"],
  ["Včera", "Dobitie kartou", "20 € → 400 DeeD", "+400 DeeD", true, "DEED"],
  ["23. 9.", "Poslané · Jana N.", "poďakovanie za pomoc", "−50 DeeD", false, "DEED"],
  ["23. 9.", "Reťaz dobra · Rodina po povodni", "časť odmeny ďalej", "−39 DeeD", false, "DEED"],
  ["22. 9.", "Dobitie SEPA", "10 € → 10 EURC", "+10,00 EURC", true, "EURC"],
  ["18. 9.", "Odmena za skutok", "Odviezol som suseda na dialýzu", "+30 DeeD", true, "DEED"],
  ["18. 9.", "Mikrodar · Deň žltej stužky", "EURC", "−0,20 EURC", false, "EURC"],
  ["12. 9.", "Podpora · Jozef M.", "poďakovanie", "−100 DeeD", false, "DEED"],
  ["12. 9.", "Mikrodar · Rodina po požiari", "EURC", "−2,00 EURC", false, "EURC"],
  ["5. 9.", "Odmena za darovanie krvi", "Daroval som plazmu", "+50 DeeD", true, "DEED"],
  ["5. 9.", "Dobitie kartou", "10 € → 10 EURC", "+10,00 EURC", true, "EURC"],
];
/** výpisy v PDF po mesiacoch */
export const VYPISY: [string, string][] = [["September 2026", "priebežný · do dnes"], ["August 2026", "14 pohybov"], ["Júl 2026", "9 pohybov"], ["Jún 2026", "11 pohybov"]];
