// ============================================================
// OPRAVY 347 — jediná verejná adresa appky pre odkazy a QR (plagát, parte, nálepka, zdieľanie).
// Doména sa mení len tu (alebo VITE_VEREJNA_URL vo Verceli). Nikdy vercel.app — na papier ide len táto adresa.
// ============================================================
export const ADRESA = String(import.meta.env.VITE_VEREJNA_URL || "https://deedgood.eu").replace(/\/$/, "");
/** adresa bez https:// (krátky text pod QR) */
export const DOMENA = ADRESA.replace(/^https?:\/\//, "");
