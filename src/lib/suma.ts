// ============================================================
// OPRAVY 295 (Martin 15. 10.) — suma v eurách v slovenskom formáte, jedna funkcia pre celú appku.
// Celé euro „8 536 €“, inak vždy dve desatinné „8 536,50 €“ (nikdy „8 536,5 €“). Pred € nezalomiteľná medzera.
// ============================================================
export function sumaEur(n: number): string {
  const c = Math.round((Number(n) || 0) * 100) / 100;
  const cele = Number.isInteger(c);
  return `${c.toLocaleString("sk-SK", { minimumFractionDigits: cele ? 0 : 2, maximumFractionDigits: cele ? 0 : 2 })}\u00A0€`;
}
