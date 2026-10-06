// ============================================================
// IDENTITA FIRMY — Zadanie 1 · Blok 1 (6. 10. 2026): firma = ÚČET typu „firma"
// (migrácia 0035: ucet.typ 'firma' + stranka.ucet_id). Kľúč firmy v appke je
// verejné číslo jej účtu „U-…" (Číslovanie v1.3), presne ako pri človeku.
// Názov firmy je LEN na zobrazenie — firma sa môže premenovať, dve firmy môžu mať
// rovnaký názov a väzby (zamestnanci, podpory, dorovnania) sa tým nerozbijú.
//
// Prototyp: účty firiem sú tu ako testovací register (id = ucet.id). V produkcii
// je to tabuľka ucet (typ 'firma') a kľúč = cisloObjektu("U", ucet.id).
// ============================================================
import { cisloObjektu } from "./cisloObjektu";
import { rovnakeCislo } from "./identita";

export interface UcetFirmy {
  /** ucet.id firmy (prototyp: stabilné testovacie id) */
  id: string;
  nazov: string;
  ico?: string;
  odvetvie?: string;
  mesto?: string;
  /** stránka firmy (0035: stranka.id → stranka.ucet_id = tento účet) */
  stranka?: string;
  /** prefix pracovného kódu „PEKA-2931" (pilot; v produkcii overí server) */
  kodPrefix?: string;
}

/** TESTOVACÍ register účtov firiem */
export const UCTY_FIRIEM: UcetFirmy[] = [
  { id: "firma-pekaren", nazov: "Pekáreň Dobrota s.r.o.", ico: "47 123 456", odvetvie: "Gastro", mesto: "Trenčín", stranka: "pekaren", kodPrefix: "PEKA" },
  { id: "firma-nordika", nazov: "Nordika SK", ico: "35 811 204", odvetvie: "Retail", mesto: "celé SR", kodPrefix: "NORD" },
  { id: "firma-itech", nazov: "ITech Solutions", ico: "50 234 118", odvetvie: "IT", mesto: "Bratislava", kodPrefix: "ITEC" },
  { id: "firma-zelena-stavba", nazov: "Zelená stavba", ico: "36 555 201", odvetvie: "Stavebníctvo", mesto: "Žilina", kodPrefix: "ZELE" },
  { id: "firma-kaviaren", nazov: "Kaviareň Pod Hradom", ico: "54 210 339", odvetvie: "Gastro", mesto: "Trenčín", kodPrefix: "KAVI" },
  { id: "firma-kvety", nazov: "Kvety Viola", ico: "53 901 772", odvetvie: "Služby", mesto: "Trenčín", kodPrefix: "KVET" },
  { id: "firma-herna", nazov: "Herňa Eldorádo s.r.o.", odvetvie: "Kasína a herne", mesto: "Košice" },
  { id: "firma-stavky", nazov: "Stávky Plus a.s.", odvetvie: "Stávkové kancelárie", mesto: "Bratislava" },
  { id: "firma-autoservis", nazov: "Autoservis Kováč s.r.o.", odvetvie: "Služby", mesto: "Trenčín" },
  { id: "firma-elektro", nazov: "Elektro Mráz s.r.o.", odvetvie: "Obchod", mesto: "Trenčín" },
  { id: "firma-stavebniny", nazov: "Stavebniny Opatová s.r.o.", odvetvie: "Stavebníctvo", mesto: "Trenčín" },
];

/** verejné číslo účtu firmy — kľúč vo všetkých väzbách */
export const cisloFirmy = (ucetId: string): string => cisloObjektu("U", ucetId);
/** číslo účtu firmy podľa id z registra (seed dáta, mock) */
export const firma = (id: string): string => cisloFirmy(id);
/** účet firmy podľa čísla */
export const ucetFirmy = (cislo: string | null | undefined): UcetFirmy | undefined =>
  cislo ? UCTY_FIRIEM.find((f) => rovnakeCislo(cisloFirmy(f.id), cislo)) : undefined;
/** názov firmy na zobrazenie (z účtu; inak záložný text) */
export const nazovFirmy = (cislo: string | null | undefined, zaloha = "Firma"): string => ucetFirmy(cislo)?.nazov ?? zaloha;
/** porovnanie firiem — VÝHRADNE podľa čísla účtu, nikdy podľa názvu */
export const rovnakaFirma = (a: string | null | undefined, b: string | null | undefined): boolean => !!a && !!b && rovnakeCislo(a, b);

/** firma, ktorú v DEV spravuje prepnutá rola „b2b" (stránka „pekaren" z 0035) */
export const DEV_FIRMA = firma("firma-pekaren");
