// ============================================================
// IDENTITA — Zadanie 1 · Blok 1 (6. 10. 2026): všetko sa viaže na účet, nikdy na meno.
// Kľúč osoby v appke = verejné číslo účtu „U-…" (Číslovanie v1.3, typ U = vizitka),
// odvodené z ucet.id. Bez účtu (demo session) má každé zariadenie vlastné náhodné
// id, takže dvaja „Jozef Novák" nikdy nezdieľajú dáta. Meno je len na zobrazenie.
// ============================================================
import { cisloObjektu } from "./cisloObjektu";

const KLUC_LOKALNE = "deed.ja.lokalneId";
const KLUC_CISLO = "deed.ja.cisloUctu";

/** stabilné id zariadenia pre demo session bez účtu (nikdy nie meno) */
export function lokalneIdUctu(): string {
  try {
    const ex = localStorage.getItem(KLUC_LOKALNE);
    if (ex) return ex;
    const nove = (() => { try { return crypto.randomUUID(); } catch { return `lok-${Date.now()}-${Math.round(Math.random() * 1e9)}`; } })();
    localStorage.setItem(KLUC_LOKALNE, nove);
    return nove;
  } catch { return "lokalny-ucet"; }
}

/** verejné číslo účtu (U-123 456 789 0) — kľúč osoby vo väzbách (zamestnanec, dorovnanie) */
export const cisloUctu = (ucetId: string | null | undefined): string => cisloObjektu("U", ucetId || lokalneIdUctu());

/** porovnanie čísel účtu bez medzier a pomlčiek (ručne zadané „U-123 456 789 0" = „U1234567890") */
export const normCislo = (c: string) => c.replace(/[\s-]/g, "").toUpperCase();
export const rovnakeCislo = (a: string, b: string) => !!a && !!b && normCislo(a) === normCislo(b);

/** číslo účtu prihláseného — odkladá ho lib/pouzivatel (engine dorovnaní nemá React kontext) */
export function ulozMojeCislo(c: string) { try { localStorage.setItem(KLUC_CISLO, c); } catch { /* bez úložiska */ } }
export function mojeCisloUctu(): string { try { return localStorage.getItem(KLUC_CISLO) ?? ""; } catch { return ""; } }
