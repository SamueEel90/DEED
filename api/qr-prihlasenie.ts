// ============================================================
// POST /api/qr-prihlasenie — OPRAVY 466 · prihlásenie na PC cez QR z mobilu (migrácia 0149)
// ------------------------------------------------------------
//   { akcia: "zaloz", zariadenie }           → { token, tajomstvo, platiDo }   (PC, bez prihlásenia)
//        token ide do QR, tajomstvo ostane len v tom PC; IP a mesto podľa IP (hlavičky Vercelu) vidí mobil
//   { akcia: "stav", token, tajomstvo }      → { stav: "caka" | "vyprsal" | "zrusene" | "pouzite" | "nenajdene" }
//                                             alebo { stav: "potvrdene", tokenHash, mesto } — raz, potom „pouzite“
//        tokenHash = jednorazový odkaz na prihlásenie (admin generateLink, e-mail sa NEposiela);
//        PC ho vymení za reláciu cez supabase.auth.verifyOtp({ token_hash, type: "email" })
// Env: SUPABASE_URL (alebo VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY — kľúč len vo Verceli.
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, randomBytes } from "node:crypto";
import { dbSluzba } from "./_lib/server.js";

const PLATI_MIN = 2;
/** najviac QR z jednej IP za 10 minút (každý sa sám obnovuje po 2 min) */
const LIMIT_IP = 40;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const nahodne = (n: number) => randomBytes(n).toString("base64url");
const hlavicka = (req: VercelRequest, k: string) => { const v = req.headers[k]; return (Array.isArray(v) ? v[0] : v) ?? ""; };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ chyba: "zla_metoda" }); return; }
  const db = dbSluzba();
  if (!db) { res.status(503).json({ chyba: "vypnute", sprava: "Prihlásenie mobilom teraz nefunguje. Prihláste sa e-mailom a heslom." }); return; }
  const b = (req.body ?? {}) as { akcia?: string; zariadenie?: string; token?: string; tajomstvo?: string };

  if (b.akcia === "zaloz") {
    const ip = hlavicka(req, "x-forwarded-for").split(",")[0].trim() || hlavicka(req, "x-real-ip") || null;
    const mesto = (() => { try { return decodeURIComponent(hlavicka(req, "x-vercel-ip-city")) || null; } catch { return null; } })();
    if (ip) {
      const { count } = await db.from("qr_prihlasenie").select("token", { count: "exact", head: true })
        .eq("ip", ip).gte("vytvorene", new Date(Date.now() - 10 * 60000).toISOString());
      if ((count ?? 0) >= LIMIT_IP) { res.status(429).json({ chyba: "limit", sprava: "Priveľa pokusov. Skúste o pár minút." }); return; }
    }
    // staré záznamy preč (deň)
    await db.from("qr_prihlasenie").delete().lt("vytvorene", new Date(Date.now() - 864e5).toISOString());
    const token = nahodne(24), tajomstvo = nahodne(32);
    const platiDo = new Date(Date.now() + PLATI_MIN * 60000).toISOString();
    const zariadenie = String(b.zariadenie ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || "Počítač";
    const { error } = await db.from("qr_prihlasenie").insert({ token, tajomstvo_hash: hash(tajomstvo), zariadenie, ip, mesto, plati_do: platiDo });
    if (error) { res.status(500).json({ chyba: "db", sprava: "QR sa nepodarilo pripraviť. Skúste znova." }); return; }
    res.status(200).json({ token, tajomstvo, platiDo });
    return;
  }

  if (b.akcia === "stav") {
    if (!b.token || !b.tajomstvo) { res.status(400).json({ chyba: "zle_udaje" }); return; }
    const { data, error } = await db.rpc("qr_prihlasenie_pouzi", { p_token: b.token, p_tajomstvo_hash: hash(b.tajomstvo) });
    if (error) { res.status(500).json({ chyba: "db" }); return; }
    const d = (data ?? {}) as { stav?: string; email?: string | null; mesto?: string | null };
    if (d.stav !== "potvrdene") { res.status(200).json({ stav: d.stav ?? "nenajdene" }); return; }
    if (!d.email) { res.status(200).json({ stav: "bez_emailu" }); return; }
    const { data: link, error: e2 } = await db.auth.admin.generateLink({ type: "magiclink", email: d.email });
    const tokenHash = link?.properties?.hashed_token;
    if (e2 || !tokenHash) { res.status(500).json({ chyba: "relacia", sprava: "Prihlásenie sa nepodarilo. Naskenujte nový QR." }); return; }
    res.status(200).json({ stav: "potvrdene", tokenHash, mesto: d.mesto ?? null });
    return;
  }

  res.status(400).json({ chyba: "zla_akcia" });
}
