// ============================================================
// GET /odznak/{stránka} → /api/odznak?id={stránka} — OPRAVY 412 · Štít dôvery na web
// ------------------------------------------------------------
// Obrázok štítu DEED+ CARE podľa aktuálnej úrovne charity. Kód na webe charity má stále tú istú adresu,
// takže keď charita postúpi na vyšší štít, odznak na jej webe sa zmení sám.
// Úroveň: verejné nastavenia stránky (nastavenia_stranky_verejne → verejne.stit), číta sa anon kľúčom.
// Bez úrovne (alebo bez DB) → Bronz. Odpoveď = presmerovanie na /stity/care/{úroveň}.webp (priehľadné pozadie).
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const UROVNE = new Set(["bronze", "silver", "gold", "platinum", "legend"]);

function konfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const kluc = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  return url && kluc ? { url, kluc } : null;
}

async function uroven(id: string): Promise<string> {
  const k = konfig();
  if (!k) return "bronze";
  const r = await fetch(`${k.url}/rest/v1/nastavenia_stranky_verejne?stranka=eq.${encodeURIComponent(id)}&select=verejne`, {
    headers: { apikey: k.kluc, Authorization: `Bearer ${k.kluc}`, Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  }).catch(() => null);
  if (!r || !r.ok) return "bronze";
  const riadky = (await r.json().catch(() => [])) as { verejne?: { stit?: unknown } }[];
  const s = String(riadky[0]?.verejne?.stit ?? "").toLowerCase();
  return UROVNE.has(s) ? s : "bronze";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id ?? "");
  const s = ID.test(id) ? await uroven(id) : "bronze";
  res.setHeader("Location", `/stity/care/${s}.webp`);
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(302).send("");
}
