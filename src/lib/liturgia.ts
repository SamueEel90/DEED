// OPRAVY 210 · prikázané sviatky zo slovenského liturgického kalendára (nie ručne).
// Pevné: 1. 1. · 6. 1. · 29. 6. · 15. 8. · 1. 11. · 8. 12. · 25. 12.; pohyblivé od Veľkej noci:
// Nanebovstúpenie Pána (+39) a Najsvätejšie Kristovo telo a krv (+60).

/** Veľkonočná nedeľa (gregoriánsky kalendár, Meeus/Jones/Butcher) */
export function velkaNoc(rok: number): Date {
  const a = rok % 19, b = Math.floor(rok / 100), c = rok % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), den = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(rok, mes - 1, den);
}

const PEVNE: Record<string, string> = {
  "1-1": "Panny Márie Bohorodičky", "1-6": "Zjavenie Pána", "6-29": "Sv. Petra a Pavla", "8-15": "Nanebovzatie Panny Márie",
  "11-1": "Všetkých svätých", "12-8": "Nepoškvrnené počatie Panny Márie", "12-25": "Narodenie Pána",
};

/** názov prikázaného sviatku v daný deň, inak null */
export function prikazanySviatok(d: Date): string | null {
  const p = PEVNE[`${d.getMonth() + 1}-${d.getDate()}`];
  if (p) return p;
  const vn = velkaNoc(d.getFullYear()), dni = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - vn.getTime()) / 864e5);
  if (dni === 39) return "Nanebovstúpenie Pána";
  if (dni === 60) return "Najsvätejšie Kristovo telo a krv";
  return null;
}

export type DruhDna = "bezny" | "sobota" | "nedela" | "sviatok" | "viacdnova";
export function druhDna(d: Date): DruhDna {
  if (prikazanySviatok(d)) return "sviatok";
  return d.getDay() === 6 ? "sobota" : d.getDay() === 0 ? "nedela" : "bezny";
}
/** farby dátumového štvorca (OPRAVY 210) — napevno ako štítok na fotke: biely podklad */
export function farbyDna(dr: DruhDna): { bg: string; ink: string; tien: string } {
  if (dr === "sviatok") return { bg: "#C9A24A", ink: "#1D211B", tien: "none" };
  if (dr === "viacdnova") return { bg: "#2F5A7A", ink: "#fff", tien: "none" };
  if (dr === "sobota") return { bg: "#fff", ink: "#2F5A7A", tien: "inset 0 0 0 3px #2F5A7A" };
  if (dr === "nedela") return { bg: "#fff", ink: "#A33A2E", tien: "inset 0 0 0 3px #A33A2E" };
  return { bg: "#fff", ink: "#1D211B", tien: "0 0 0 1px #D9D3C7" };
}
