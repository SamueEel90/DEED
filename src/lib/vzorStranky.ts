// ============================================================
// OPRAVY 467 · Vzory v Ateliéri: stránka „Farnosť vzorová“ s pevnými ukážkovými dátami.
// Dáta žijú len v pamäti (features/rola/vzorFarnosti.ts ich sem zaregistruje). Pre id vzoru sa nič nezapisuje
// do prehliadača ani do databázy a nič sa nesťahuje zo servera — zápisy a sťahovania pre jeVzor(id) nič nerobia.
// Bez importov, aby ho mohli použiť aj najnižšie vrstvy (stav.ts).
// ============================================================
export const VZOR_FARNOST = "vzor-farnost";
/** id vzorovej stránky (aj odvodené kľúče ako „vzor-farnost-centralna“) */
export const jeVzor = (id: string | null | undefined): boolean => !!id && id.startsWith("vzor-");

const oblasti = new Map<string, Record<string, unknown>>();
const ine = new Map<string, unknown>();
/** zaregistruje ukážkové dáta stránky: oblasti KV stavu (kalendar, prispevky, …) */
export function registrujVzor(id: string, data: Record<string, unknown>) { oblasti.set(id, data); }
/** oblasť KV stavu vzoru; undefined = vzor ju nemá */
export const vzorOblast = (id: string, oblast: string): unknown => oblasti.get(id)?.[oblast];
/** ostatné ukážkové dáta podľa kľúča (centrálna zbierka, zbierky, dary …) */
export function registrujVzorData(kluc: string, data: unknown) { ine.set(kluc, data); }
export const vzorData = <T>(kluc: string): T | undefined => ine.get(kluc) as T | undefined;
