// ============================================================
// IDENTITA FIRMY — v prototype je ňou názov z QR, v produkcii IČO.
// Žije vo vlastnom module, aby sa naň mohli odvolávať dorovnania,
// podpory aj väzby zamestnancov bez krúženia importov.
// ============================================================
/** porovnanie názvov firiem — „Pekáreň Dobrota" a „Pekáreň Dobrota s.r.o." je tá istá
 *  firma (v prototype je identitou názov z QR; v produkcii to bude IČO) */
const kluceFirmy = (n: string) => n
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\b(s\.?\s?r\.?\s?o\.?|a\.?\s?s\.?|o\.?\s?z\.?|spol\.?|k\.?\s?s\.?|n\.?\s?o\.?)\b/g, "")
  .replace(/[^a-z0-9]+/g, "")
  .trim();
export const rovnakaFirma = (a: string, b: string) => kluceFirmy(a) === kluceFirmy(b);
