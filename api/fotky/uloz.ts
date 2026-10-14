// ============================================================
// POST /api/fotky/uloz { zdroj, id } — správca si vybral fotku z fotobanky (bod 254)
// ------------------------------------------------------------
// Server si fotku znova načíta z banky podľa id (adrese od klienta neverí), stiahne veľkú (≈1600 px)
// aj malú (≈400 px) a uloží ich do Supabase Storage (bucket verejne-fotky), do tabuľky verejne_fotky
// zapíše autora, zdroj a licenciu. Rovnakú fotku druhý raz nesťahuje.
// Výnimka Unsplash (ich podmienka): neukladá sa, ostane ich adresa a zavolá sa ich download adresa.
// Odpoveď: { url, maly, sirka, vyska, autor, odkazAutora, licencia, zdroj }
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fotkaPodlaId, unsplashStiahnutie, type Zdroj } from "../_lib/fotobanky.js";
import { dbSluzba, spravcaStranky, tokenZ } from "../_lib/server.js";

const BUCKET = "verejne-fotky";
const ZDROJE: Zdroj[] = ["pexels", "pixabay", "unsplash", "openverse"];
const TYPY: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_B = 8 * 1024 * 1024;

type Riadok = { url: string; maly: string | null; sirka: number | null; vyska: number | null; autor: string | null; odkaz_autora: string | null; licencia: string | null; zdroj: string };
const von = (r: Riadok) => ({ url: r.url, maly: r.maly ?? r.url, sirka: r.sirka, vyska: r.vyska, autor: r.autor, odkazAutora: r.odkaz_autora, licencia: r.licencia, zdroj: r.zdroj });

async function stiahni(url: string): Promise<{ telo: Buffer; typ: string } | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "DEED+ (deed-help.vercel.app)" } });
    const typ = (r.headers.get("content-type") || "").split(";")[0].trim();
    if (!r.ok || !TYPY[typ]) return null;
    const telo = Buffer.from(await r.arrayBuffer());
    return telo.length > 0 && telo.length <= MAX_B ? { telo, typ } : null;
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.status(405).json({ chyba: "zla_metoda" }); return; }
  const ucet = await spravcaStranky(tokenZ(req.headers.authorization));
  if (!ucet) { res.status(401).json({ chyba: "len_spravca", sprava: "Fotku môže uložiť len prihlásený správca stránky." }); return; }
  const db = dbSluzba();
  if (!db) { res.status(503).json({ chyba: "nedostupne", sprava: "Ukladanie fotiek ešte nie je zapnuté." }); return; }

  const b = (req.body ?? {}) as { zdroj?: string; id?: string };
  const zdroj = ZDROJE.find((z) => z === b.zdroj);
  const id = typeof b.id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(b.id) ? b.id : null;
  if (!zdroj || !id) { res.status(400).json({ chyba: "zly_vstup", sprava: "Chýba zdroj alebo id fotky." }); return; }

  const { data: uz } = await db.from("verejne_fotky").select("*").eq("zdroj", zdroj).eq("zdroj_id", id).maybeSingle();
  if (uz) {
    if (zdroj === "unsplash") { const f = await fotkaPodlaId(zdroj, id); if (f?.stiahnutie) await unsplashStiahnutie(f.stiahnutie); }
    res.status(200).json(von(uz as Riadok)); return;
  }

  const f = await fotkaPodlaId(zdroj, id);
  if (!f) { res.status(404).json({ chyba: "nenajdena", sprava: "Fotku sa nepodarilo načítať z fotobanky." }); return; }

  let url = f.velky, maly = f.maly;
  if (zdroj === "unsplash") {
    if (f.stiahnutie) await unsplashStiahnutie(f.stiahnutie);
  } else {
    const [v, m] = await Promise.all([stiahni(f.velky), stiahni(f.maly)]);
    if (!v) { res.status(502).json({ chyba: "stiahnutie", sprava: "Fotku sa nepodarilo stiahnuť. Skúste inú." }); return; }
    const nahraj = async (d: { telo: Buffer; typ: string }, nazov: string) => {
      const cesta = `${zdroj}/${id}${nazov}.${TYPY[d.typ]}`;
      const { error } = await db.storage.from(BUCKET).upload(cesta, d.telo, { contentType: d.typ, upsert: true, cacheControl: "31536000" });
      if (error) throw error;
      return db.storage.from(BUCKET).getPublicUrl(cesta).data.publicUrl;
    };
    try {
      url = await nahraj(v, "");
      maly = m ? await nahraj(m, "-maly") : url;
    } catch (e) {
      console.error("[fotky/uloz] storage:", (e as Error).message);
      res.status(500).json({ chyba: "storage", sprava: "Fotku sa nepodarilo uložiť." }); return;
    }
  }

  const riadok = { zdroj, zdroj_id: id, url, maly, sirka: f.sirka || null, vyska: f.vyska || null, autor: f.autor, odkaz_autora: f.odkazAutora || null, odkaz_zdroja: f.odkazZdroja ?? null, licencia: f.licencia, ulozil: ucet };
  const { data, error } = await db.from("verejne_fotky").upsert(riadok, { onConflict: "zdroj,zdroj_id" }).select("*").single();
  if (error) { console.error("[fotky/uloz] db:", error.message); res.status(500).json({ chyba: "db", sprava: "Fotku sa nepodarilo zapísať." }); return; }
  res.status(200).json(von(data as Riadok));
}
