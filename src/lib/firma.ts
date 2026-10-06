// ============================================================
// IDENTITA FIRMY — Zadanie 1 · Blok 1 (6. 10. 2026): firma = ÚČET typu „firma"
// (migrácia 0035: ucet.typ 'firma' + stranka.ucet_id). Kľúč firmy v appke je
// verejné číslo jej účtu „U-…" (Číslovanie v1.3), presne ako pri človeku.
// Názov firmy je LEN na zobrazenie — firma sa môže premenovať, dve firmy môžu mať
// rovnaký názov a väzby (zamestnanci, podpory, dorovnania) sa tým nerozbijú.
//
// Prototyp: testovací register firiem; id = ucet.id testovacieho účtu firmy v DB (0045).
// V produkcii je to tabuľka ucet (typ 'firma') a kľúč = cisloObjektu("U", ucet.id) = ucet.cislo.
// ============================================================
import { cisloObjektu } from "./cisloObjektu";
import { rovnakeCislo } from "./identita";

export interface UcetFirmy {
  /** ucet.id firmy — testovacie firmy majú v DB účty s týmito pevnými id (migrácia 0045) */
  id: string;
  /** krátky kľúč pre kód (firma("firma-pekaren")) */
  kluc: string;
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
  { id: "f1000000-0000-4000-8000-000000000001", kluc: "firma-pekaren", nazov: "Pekáreň Dobrota s.r.o.", ico: "47 123 456", odvetvie: "Gastro", mesto: "Trenčín", stranka: "pekaren", kodPrefix: "PEKA" },
  { id: "f1000000-0000-4000-8000-000000000002", kluc: "firma-nordika", nazov: "Nordika SK", ico: "35 811 204", odvetvie: "Retail", mesto: "celé SR", kodPrefix: "NORD" },
  { id: "f1000000-0000-4000-8000-000000000003", kluc: "firma-itech", nazov: "ITech Solutions", ico: "50 234 118", odvetvie: "IT", mesto: "Bratislava", kodPrefix: "ITEC" },
  { id: "f1000000-0000-4000-8000-000000000004", kluc: "firma-zelena-stavba", nazov: "Zelená stavba", ico: "36 555 201", odvetvie: "Stavebníctvo", mesto: "Žilina", kodPrefix: "ZELE" },
  { id: "f1000000-0000-4000-8000-000000000005", kluc: "firma-kaviaren", nazov: "Kaviareň Pod Hradom", ico: "54 210 339", odvetvie: "Gastro", mesto: "Trenčín", kodPrefix: "KAVI" },
  { id: "f1000000-0000-4000-8000-000000000006", kluc: "firma-kvety", nazov: "Kvety Viola", ico: "53 901 772", odvetvie: "Služby", mesto: "Trenčín", kodPrefix: "KVET" },
  { id: "f1000000-0000-4000-8000-000000000007", kluc: "firma-herna", nazov: "Herňa Eldorádo s.r.o.", odvetvie: "Kasína a herne", mesto: "Košice" },
  { id: "f1000000-0000-4000-8000-000000000008", kluc: "firma-stavky", nazov: "Stávky Plus a.s.", odvetvie: "Stávkové kancelárie", mesto: "Bratislava" },
  { id: "f1000000-0000-4000-8000-000000000009", kluc: "firma-autoservis", nazov: "Autoservis Kováč s.r.o.", odvetvie: "Služby", mesto: "Trenčín" },
  { id: "f1000000-0000-4000-8000-00000000000a", kluc: "firma-elektro", nazov: "Elektro Mráz s.r.o.", odvetvie: "Obchod", mesto: "Trenčín" },
  { id: "f1000000-0000-4000-8000-00000000000b", kluc: "firma-stavebniny", nazov: "Stavebniny Opatová s.r.o.", odvetvie: "Stavebníctvo", mesto: "Trenčín" },
];

/** verejné číslo účtu firmy — kľúč vo všetkých väzbách */
export const cisloFirmy = (ucetId: string): string => cisloObjektu("U", ucetId);
/** číslo účtu testovacej firmy podľa kľúča z registra („firma-pekaren") */
export const firma = (kluc: string): string => cisloFirmy(UCTY_FIRIEM.find((f) => f.kluc === kluc)?.id ?? kluc);
/** účet firmy podľa čísla */
export const ucetFirmy = (cislo: string | null | undefined): UcetFirmy | undefined =>
  cislo ? UCTY_FIRIEM.find((f) => rovnakeCislo(cisloFirmy(f.id), cislo)) : undefined;
/** názov firmy na zobrazenie (z účtu; inak záložný text) */
export const nazovFirmy = (cislo: string | null | undefined, zaloha = "Firma"): string => ucetFirmy(cislo)?.nazov ?? zaloha;
/** porovnanie firiem — VÝHRADNE podľa čísla účtu, nikdy podľa názvu */
export const rovnakaFirma = (a: string | null | undefined, b: string | null | undefined): boolean => !!a && !!b && rovnakeCislo(a, b);

/** firma, ktorú v DEV spravuje prepnutá rola „b2b" (stránka „pekaren" z 0035) */
export const DEV_FIRMA = firma("firma-pekaren");
