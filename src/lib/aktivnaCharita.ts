// ============================================================
// OPRAVY 402 · aktívna charita — každá registrácia je samostatná stránka s vlastným id.
// Správa charity (a všetko, čo doteraz čítalo napevno „svetlo“) berie id odtiaľto. Nastaví ho otvorená Správa charity.
// Lokálne charity: bez databázy (testovacia verzia) si appka pamätá založené charity v tomto prehliadači.
// ============================================================
let id = "";
export const aktivnaCharita = (): string => id;
export function nastavAktivnuCharitu(stranka: string) { if (stranka) id = stranka; }
/** kľúč úložiska pre údaje charity — každá charita má svoj (OPRAVY 403: testovacia „svetlo“ zmazaná) */
export const klucCharity = (k: string): string => `${k}@${id}`;

export type LokalnaStranka = { k: string; n: string; typ: "charita" };
const KLUC = "deed.lokalneStranky";
export function lokalneStranky(): LokalnaStranka[] {
  try { return JSON.parse(localStorage.getItem(KLUC) ?? "[]") as LokalnaStranka[]; } catch { return []; }
}
export function pridajLokalnuStranku(s: LokalnaStranka) {
  try { localStorage.setItem(KLUC, JSON.stringify([...lokalneStranky().filter((x) => x.k !== s.k), s])); } catch { /* bez úložiska */ }
}
/** OPRAVY 402: testovacie „+ Založiť charitu (test)“ na feede Charity → App otvorí registráciu organizácie */
export const UDALOST_ZALOZ_CHARITU = "deed:zaloz-charitu";
/** nové id stránky charity (bez databázy); s databázou ho dá server */
export const noveIdCharity = () => `ch-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
