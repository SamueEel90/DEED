// ============================================================
// CESTA MÔJHO DARU (karta 28) — reťaz ĽUDÍ, nie konkrétnych peňazí.
// Zastávka = príjemca daru, ktorý kedykoľvek neskôr (bez časového limitu) sám daruje ďalej;
// pripojí sa jeho PRVÝ ďalší dar po prijatí (MVP, bez rozvetvenia). Eurá idú priamo príjemcovi,
// reťaz pokračuje len keď príjemca daruje ďalej v appke; charita s bankovým účtom = koniec vetvy.
// Ukladá sa len poradie, mesto, krajina, dátum, typ. NIKDY meno, suma ani presná poloha.
// Mapa ukazuje len mesto (obec pod 5 000 obyv. → okres), nová zastávka až o 24 h. (Server; tu mock.)
// ============================================================
import { geoDistance } from "d3-geo";

export type Zastavka = { mesto: string; krajina: string; lonlat: [number, number]; typ: string; datum: string };
export type Retaz = { od: string; kam: string; zastavok: number; krajin: number; km: number };

/** moja najdlhšia reťaz (mock z prototypu) */
export const MOJA_CESTA: { zaciatok: string; zastavky: Zastavka[] } = {
  zaciatok: "12. 6.",
  zastavky: [
    { mesto: "Trenčín", krajina: "Slovensko", lonlat: [18.04, 48.89], typ: "tvoj dar za skutok", datum: "12. 6." },
    { mesto: "Žilina", krajina: "Slovensko", lonlat: [18.74, 49.22], typ: "dar na zbierku", datum: "19. 6." },
    { mesto: "Bratislava", krajina: "Slovensko", lonlat: [17.11, 48.15], typ: "dar za skutok", datum: "2. 7." },
    { mesto: "Viedeň", krajina: "Rakúsko", lonlat: [16.37, 48.21], typ: "dar na zbierku", datum: "20. 7." },
    { mesto: "Brno", krajina: "Česko", lonlat: [16.61, 49.2], typ: "dar za skutok", datum: "4. 8." },
    { mesto: "Krakov", krajina: "Poľsko", lonlat: [19.94, 50.06], typ: "dar za skutok", datum: "21. 8." },
    { mesto: "Berlín", krajina: "Nemecko", lonlat: [13.4, 52.52], typ: "dar na zbierku", datum: "5. 9." },
    { mesto: "Lisabon", krajina: "Portugalsko", lonlat: [-9.14, 38.72], typ: "dar za skutok", datum: "17. 9." },
    { mesto: "Nairobi", krajina: "Keňa", lonlat: [36.82, -1.29], typ: "dar na zbierku", datum: "26. 9." },
  ],
};

/** vzdušná vzdialenosť v km */
export const km = (a: [number, number], b: [number, number]) => geoDistance(a, b) * 6371;
export function suhrn(z: Zastavka[]): { zastavok: number; krajin: number; km: number } {
  let d = 0; for (let i = 1; i < z.length; i++) d += km(z[i - 1].lonlat, z[i].lonlat);
  return { zastavok: z.length, krajin: new Set(z.map((x) => x.krajina)).size, km: Math.round(d) };
}
export const krajinTvar = (n: number) => (n === 1 ? "krajina" : n < 5 ? "krajiny" : "krajín");
export const zastavokTvar = (n: number) => (n === 1 ? "zastávka" : n < 5 ? "zastávky" : "zastávok");

/** najdlhšie reťaze dobra — celkovo, bez obdobia; podľa km, pri rovnosti zastávky (mock) */
export const NAJDLHSIE: Retaz[] = [
  { od: "Prešov", kam: "Kapské Mesto", zastavok: 14, krajin: 9, km: 16480 },
  { od: "Nitra", kam: "Toronto", zastavok: 11, krajin: 6, km: 11240 },
];
export function rebricek(moja: Retaz): { r: Retaz; poradie: number; moja: boolean }[] {
  const vsetky = [...NAJDLHSIE, moja].sort((a, b) => b.km - a.km || b.zastavok - a.zastavok);
  const top = vsetky.slice(0, 3).map((r) => ({ r, poradie: vsetky.indexOf(r) + 1, moja: r === moja }));
  if (!top.some((x) => x.moja)) top.push({ r: moja, poradie: vsetky.indexOf(moja) + 1, moja: true });
  return top;
}
