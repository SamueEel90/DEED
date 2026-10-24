// ============================================================
// POST /api/platba-webhook — potvrdenie platby rúrou (Kontrola 24. 10. · R1 + N9, migrácia 0176)
// ------------------------------------------------------------
// Dar kartou / SEPA / SMS vzniká v DB ako 'pending' bez pohybov. Peniaze sa v ledgeri objavia až keď
// rúra (procesor karty, párovanie výpisu podľa VS, SMS brána) zavolá tento endpoint.
//   hlavička  x-webhook-secret: <PLATBA_WEBHOOK_SECRET>          (kým nie je vybraný PSP: zdieľané tajomstvo;
//                                                                  pri napojení PSP sa overí jeho podpis — mení sa LEN táto kontrola)
//   telo      { platba_id } alebo { vs }                           (VS = variabilný symbol pridelený pri vzniku platby)
//             + vysledok: "ok" | "zlyhanie", dovod?               ("ok" → platba_potvrd, "zlyhanie" → platba_zlyhala)
//   odpoveď   { stav: "settled" | "failed" | "nenajdene" }
// Idempotentné: opakované potvrdenie tej istej platby nič nepridá (platba_potvrd vráti existujúci stav).
// Env: PLATBA_WEBHOOK_SECRET, SUPABASE_URL (alebo VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY — len vo Verceli.
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { dbSluzba } from "./_lib/server.js";

const hlavicka = (req: VercelRequest, k: string) => { const v = req.headers[k]; return (Array.isArray(v) ? v[0] : v) ?? ""; };

function tajomstvoSedi(req: VercelRequest): boolean {
  const ocakavane = process.env.PLATBA_WEBHOOK_SECRET || "";
  const dostal = hlavicka(req, "x-webhook-secret");
  if (!ocakavane || !dostal || ocakavane.length !== dostal.length) return false;
  return timingSafeEqual(Buffer.from(ocakavane), Buffer.from(dostal));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ chyba: "zla_metoda" }); return; }
  if (!process.env.PLATBA_WEBHOOK_SECRET) { res.status(503).json({ chyba: "vypnute", sprava: "PLATBA_WEBHOOK_SECRET nie je nastavený." }); return; }
  if (!tajomstvoSedi(req)) { res.status(401).json({ chyba: "zly_podpis" }); return; }
  const db = dbSluzba();
  if (!db) { res.status(503).json({ chyba: "vypnute", sprava: "Chýba SUPABASE_SERVICE_ROLE_KEY." }); return; }

  const b = (req.body ?? {}) as { platba_id?: string; vs?: string; vysledok?: string; dovod?: string };
  const vysledok = b.vysledok === "zlyhanie" ? "zlyhanie" : b.vysledok === "ok" ? "ok" : null;
  if (!vysledok) { res.status(400).json({ chyba: "zly_vstup", sprava: "vysledok musí byť ok alebo zlyhanie." }); return; }

  // platba podľa id alebo VS (len VS pridelený serverom: 10 číslic)
  let platbaId = typeof b.platba_id === "string" && /^[0-9a-f-]{36}$/i.test(b.platba_id) ? b.platba_id : null;
  if (!platbaId && typeof b.vs === "string" && /^\d{10}$/.test(b.vs)) {
    const { data } = await db.from("platba").select("id").eq("ext_vs", b.vs).maybeSingle();
    platbaId = data?.id ? String(data.id) : null;
  }
  if (!platbaId) { res.status(404).json({ stav: "nenajdene" }); return; }

  const { data, error } = vysledok === "ok"
    ? await db.rpc("platba_potvrd", { p_platba: platbaId, p_kto: "rura" })
    : await db.rpc("platba_zlyhala", { p_platba: platbaId, p_dovod: String(b.dovod ?? "rura").slice(0, 200) });
  if (error) {
    const d = (error as { details?: string }).details ?? "";
    if (/platba_neexistuje/.test(error.message)) { res.status(404).json({ stav: "nenajdene" }); return; }
    if (/zly_stav/.test(d) || /zly_stav/.test(error.message)) { res.status(409).json({ chyba: "zly_stav", sprava: error.message }); return; }
    console.error("[platba-webhook]", error.message);
    res.status(500).json({ chyba: "db" });
    return;
  }
  const stav = (data as { stav?: string } | null)?.stav ?? (vysledok === "ok" ? "settled" : "failed");
  res.status(200).json({ stav });
}
