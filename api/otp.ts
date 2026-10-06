// ============================================================
// POST /api/otp — SMS kód (Zadanie 3 · 3.2), LEN pre režim bez databázy
// ------------------------------------------------------------
// S databázou kód generuje a overuje server v DB (rpc otp_posli / otp_over, migrácia 0040).
// Bez databázy (lokálne demo) by kód vznikal v prehliadači — preto ho vracia tento endpoint.
// Mock: pevný testovací kód 123456, limit 3 kódy / 10 min na číslo (pamäť procesu).
//   { telefon }        → { demo: true, kod: "123456" }
//   { telefon, kod }   → { ok: boolean }
// Pri napojení vendora sa mení len vendor, nie logika.
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";

const KOD = "123456";
const posielania = new Map<string, number[]>();
const norm = (t: unknown) => String(t ?? "").replace(/[^0-9+]/g, "");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).json({ chyba: "zla_metoda" }); return; }
  const b = (req.body ?? {}) as { telefon?: string; kod?: string };
  const tel = norm(b.telefon);
  if (!/^\+?\d{9,15}$/.test(tel)) { res.status(400).json({ chyba: "zly_telefon", sprava: "Zlé telefónne číslo." }); return; }
  if (typeof b.kod === "string") { res.status(200).json({ ok: b.kod === KOD }); return; }
  const teraz = Date.now();
  const t = (posielania.get(tel) ?? []).filter((x) => teraz - x < 10 * 60000);
  if (t.length >= 3) { res.status(429).json({ chyba: "otp_limit", sprava: "Poslali sme už 3 kódy. Ďalší pošleme o pár minút." }); return; }
  posielania.set(tel, [...t, teraz]);
  res.status(200).json({ demo: true, kod: KOD });
}
