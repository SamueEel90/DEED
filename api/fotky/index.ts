// ============================================================
// GET /api/fotky?q=…&kategoria=…&strana=1 — hľadanie vo fotobankách (bod 254)
// ------------------------------------------------------------
// Len prihlásený správca stránky (Bearer token Supabase). Najprv Pexels, keď je málo, doplní Pixabay,
// Unsplash (ak je kľúč) a Openverse. Výsledky sa hodinu pamätajú (pamäť funkcie), denný strop na účet.
// Odpoveď: { fotky: [{ id, zdroj, maly, velky, sirka, vyska, autor, odkazAutora, licencia }] }
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { hladaj, KATEGORIE, type FotkaBanky } from "../_lib/fotobanky.js";
import { dbSluzba, spravcaStranky, tokenZ } from "../_lib/server.js";

const HODINA = 3600e3;
const STROP = Number(process.env.FOTKY_DENNY_STROP) || 300;
const pamat = new Map<string, { t: number; fotky: FotkaBanky[] }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") { res.status(405).json({ chyba: "zla_metoda" }); return; }
  const ucet = await spravcaStranky(tokenZ(req.headers.authorization));
  if (!ucet) { res.status(401).json({ chyba: "len_spravca", sprava: "Verejné fotky môže hľadať len prihlásený správca stránky." }); return; }

  const kat = String(req.query.kategoria ?? "");
  const q = (String(req.query.q ?? "").trim().slice(0, 80) || KATEGORIE[kat] || "").trim();
  const strana = Math.min(20, Math.max(1, parseInt(String(req.query.strana ?? "1"), 10) || 1));
  if (!q) { res.status(400).json({ chyba: "zly_vstup", sprava: "Zadajte, čo hľadáte, alebo vyberte kategóriu." }); return; }

  const kluc = `${q.toLocaleLowerCase("sk-SK")}|${strana}`;
  const v = pamat.get(kluc);
  if (v && Date.now() - v.t < HODINA) { res.setHeader("Cache-Control", "private, max-age=3600"); res.status(200).json({ fotky: v.fotky }); return; }

  const db = dbSluzba();
  if (db) {
    const { data: pocet } = await db.rpc("fotky_pocitaj", { p_ucet: ucet });
    if (typeof pocet === "number" && pocet > STROP) { res.status(429).json({ chyba: "strop", sprava: "Dnes ste hľadali už veľa. Skúste zajtra alebo vyberte z nášho výberu." }); return; }
  }
  const fotky = (await hladaj(q, strana)).map(({ stiahnutie: _s, ...f }) => f);
  if (fotky.length) pamat.set(kluc, { t: Date.now(), fotky });
  if (pamat.size > 500) pamat.delete(pamat.keys().next().value as string);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.status(200).json({ fotky });
}
