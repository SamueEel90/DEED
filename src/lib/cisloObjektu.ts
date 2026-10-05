// KARTA 48 · bod 4 · verejné číslo objektu = variabilný symbol (podklad „Číslovanie" v1.1).
// 9 číslic sekvencia + 1 kontrolná (Luhn) = 10 číslic. Pre ľudí s prefixom podľa typu: Z-123 456 789 0.
// Číslo prideľuje server (atomická sekvencia, nikdy sa nerecykluje). Kým ho objekt nemá,
// appka zobrazí TESTOVACIE číslo odvodené z id (rovnaké id = rovnaké číslo).

export type TypObjektu = "Z" | "I" | "U" | "P" | "C"; // zbierka · iskra · user vizitka · prevádzka/stôl · stránka subjektu

/** kontrolná číslica Luhn k 9 číslicam */
export function luhn(cislice: string): number {
  let s = 0;
  for (let i = 0; i < cislice.length; i++) {
    let d = cislice.charCodeAt(cislice.length - 1 - i) - 48;
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    s += d;
  }
  return (10 - (s % 10)) % 10;
}
/** platný VS (10 číslic, sedí Luhn) */
export const platnyVs = (vs: string) => /^\d{10}$/.test(vs) && luhn(vs.slice(0, 9)) === Number(vs[9]);

/** testovacie číslo z id objektu (9 číslic z hashu, prvá nie 0) + Luhn */
export function testovacieVs(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const n = String(100000000 + (h % 900000000));
  return n + luhn(n);
}
/** zobrazenie pre ľudí: „Z-123 456 789 0" */
export function verejneCislo(typ: TypObjektu, vs: string): string {
  return `${typ}-${vs.slice(0, 3)} ${vs.slice(3, 6)} ${vs.slice(6, 9)} ${vs.slice(9)}`;
}
/** číslo objektu podľa id (server ho raz pošle v objekte; dovtedy testovacie) */
export const cisloObjektu = (typ: TypObjektu, id: string, vs?: string | null) => verejneCislo(typ, vs && platnyVs(vs) ? vs : testovacieVs(id));
