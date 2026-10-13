// ============================================================
// OPRAVY 223 (Martin 13. 10.) — Úradné hodiny farského úradu.
// Profil → Kontakt: po dňoch Po–Ne, pri dni čas od–do (aj viac časov), nepovinná poznámka. Uložené v profile stránky (kontakt.uradne).
// Výnimka na deň (Omše a kalendár): „dnes nie sú“ alebo „zmenené na …“ — v kalendári hlavného kostola (KalKostol.uradne).
// Stránka farnosti: päta pod Farským úradom, „Pondelok 17.00 – 18.00“, dni bez hodín sa nevypisujú.
// ============================================================
export interface CasUH { od: string; do: string }
/** d[0] = pondelok … d[6] = nedeľa */
export interface UradneHodiny { d: CasUH[][]; poz: string }
export type VynimkaUH = { zrus: true } | { zrus?: false; od: string; do: string };

export const DNI_UH = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
export const prazdneUH = (): UradneHodiny => ({ d: [[], [], [], [], [], [], []], poz: "" });
/** „17:00“ → „17.00“ (slovenský formát s bodkou) */
export const bodka = (t: string) => t.trim().replace(":", ".");
export const plneUH = (c: CasUH) => !!c.od.trim() && !!c.do.trim();
export const casyUH = (u: UradneHodiny | undefined, den: number): CasUH[] => (u?.d?.[den] ?? []).filter(plneUH);
export const maUH = (u: UradneHodiny | undefined) => !!u && u.d?.some((x) => x.some(plneUH));
export const textCasu = (c: CasUH) => `${bodka(c.od)} – ${bodka(c.do)}`;
