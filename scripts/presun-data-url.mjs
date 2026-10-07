// ============================================================
// DEED · Jednorazový presun starých data-URL fotiek do Storage (Zadanie 5 · 5.5, migrácia 0064)
//
// Prejde profil_stranky, oznam_charity a zbierka, každú fotku uloženú ako „data:…;base64,…"
// nahrá do bucketu `prispevky` (priečinok presun/<tabuľka>/) a v DB nechá len verejnú URL.
//
// Spustenie (len na stroji správcu DB — kľúč service_role nikdy neopúšťa jeho stroj):
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/presun-data-url.mjs            ← skúšobný režim
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/presun-data-url.mjs --naozaj   ← ostrý beh
//
// · Skúšobný režim (predvolený) nič nenahrá ani nezapíše — len vypíše, čo by urobil, a koľko fotiek našiel.
// · Opakované spustenie je bezpečné: názov súboru = hash obsahu, takže čo už v Storage je, sa znova
//   nenahrá; riadky, ktoré už data URL nemajú, sa preskočia.
// · Riadok, ktorý sa medzi čítaním a zápisom zmenil (appka ho práve uložila), sa nezapíše —
//   ráta sa medzi zlyhané a chytí ho ďalší beh.
// · Zapečatená zbierka: fotky mimo voľných polí (0041) sa zmeniť nedajú — riadok sa ráta medzi zlyhané.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const BUCKET = "prispevky";
const STRANA = 50;
const DATA_URL = /data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/gi;

/** Tabuľky: primárny kľúč a stĺpce času, ktorými sa stráži súbežná zmena (stĺpec → jeho čas). */
export const TABULKY = [
  { nazov: "profil_stranky", kluc: "stranka",
    cas: { koncept: "koncept_cas", ulozeny: "ulozeny_cas", koncept_zbierky: "koncept_zbierky_cas", centralna: "centralna_cas" } },
  { nazov: "oznam_charity", kluc: "id", cas: {} },
  { nazov: "zbierka", kluc: "id", cas: { "*": "upravene" } },
];

function pripona(mime) {
  return (mime.split("/")[1] || "jpg").toLowerCase().replace("jpeg", "jpg").replace("svg+xml", "svg");
}

/** Popis jednej fotky v data URL: cesta v Storage je odvodená z obsahu (hash), takže je stále rovnaká. */
export function fotka(dataUrl, tabulka) {
  const m = /^data:([^;]+);base64,(.*)$/is.exec(dataUrl);
  if (!m) return null;
  const obsah = Buffer.from(m[2], "base64");
  const hash = createHash("sha256").update(obsah).digest("hex").slice(0, 40);
  return { mime: m[1].toLowerCase(), obsah, cesta: `presun/${tabulka}/${hash}.${pripona(m[1])}` };
}

/** Všetky data URL v hodnote (reťazce aj vnorené objekty/polia, aj vnútri HTML). */
export function najdi(v, out = []) {
  if (typeof v === "string") { for (const m of v.matchAll(DATA_URL)) out.push(m[0]); }
  else if (Array.isArray(v)) v.forEach((x) => najdi(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => najdi(x, out));
  return out;
}

/** Kópia hodnoty, v ktorej je každá data URL nahradená podľa mapy (data URL → URL). */
export function nahrad(v, mapa) {
  if (typeof v === "string") return v.includes(";base64,") ? v.replace(DATA_URL, (d) => mapa.get(d) ?? d) : v;
  if (Array.isArray(v)) return v.map((x) => nahrad(x, mapa));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, nahrad(x, mapa)]));
  return v;
}

/** Nahrá fotku; ak už v Storage je (predošlý beh), použije ju. Vráti verejnú URL. */
async function nahraj(db, f) {
  const { error } = await db.storage.from(BUCKET).upload(f.cesta, f.obsah, { contentType: f.mime, upsert: false });
  if (error && !/exist|duplicate/i.test(`${error.message} ${error.statusCode ?? ""} ${error.error ?? ""}`) && String(error.statusCode) !== "409") {
    throw new Error(error.message);
  }
  return db.storage.from(BUCKET).getPublicUrl(f.cesta).data.publicUrl;
}

/** Prejde jednu tabuľku. naozaj = false → nič nemení, len ráta. */
export async function spracujTabulku(db, t, naozaj, log = console.log) {
  const s = { riadky: 0, fotky: 0, bajty: 0, prenesene: 0, zlyhane: 0, zlyhaneRiadky: 0 };
  for (let od = 0; ; od += STRANA) {
    const { data, error } = await db.from(t.nazov).select("*").order(t.kluc).range(od, od + STRANA - 1);
    if (error) throw new Error(`${t.nazov}: ${error.message}`);
    if (!data?.length) break;
    for (const r of data) {
      const stlpce = Object.keys(r).filter((k) => najdi(r[k]).length);
      if (!stlpce.length) continue;
      const vsetky = [...new Set(stlpce.flatMap((k) => najdi(r[k])))];
      const fotky = vsetky.map((d) => [d, fotka(d, t.nazov)]).filter(([, f]) => f);
      s.riadky++; s.fotky += fotky.length; s.bajty += fotky.reduce((a, [, f]) => a + f.obsah.length, 0);
      log(`  ${t.nazov} ${r[t.kluc]}: ${fotky.length} fotiek v ${stlpce.join(", ")}`);
      if (!naozaj) continue;

      const mapa = new Map(); let chyba = 0;
      for (const [d, f] of fotky) {
        try { mapa.set(d, await nahraj(db, f)); }
        catch (e) { chyba++; log(`    nahratie zlyhalo (${f.cesta}): ${e.message}`); }
      }
      if (!mapa.size) { s.zlyhane += fotky.length; s.zlyhaneRiadky++; continue; }

      const zmena = Object.fromEntries(stlpce.map((k) => [k, nahrad(r[k], mapa)]));
      let q = db.from(t.nazov).update(zmena).eq(t.kluc, r[t.kluc]);
      // stráž súbežnej zmeny: čas stĺpca (alebo celého riadku) musí byť taký, ako pri čítaní
      const casy = new Set(stlpce.map((k) => t.cas[k] ?? t.cas["*"]).filter(Boolean));
      for (const c of casy) q = r[c] == null ? q.is(c, null) : q.eq(c, r[c]);
      const { data: hotovo, error: e2 } = await q.select(t.kluc);
      if (e2 || !hotovo?.length) {
        s.zlyhane += fotky.length; s.zlyhaneRiadky++;
        log(`    zápis zlyhal: ${e2 ? e2.message : "riadok sa medzitým zmenil — chytí ho ďalší beh"}`);
        continue;
      }
      s.prenesene += mapa.size; s.zlyhane += chyba;
      if (chyba) s.zlyhaneRiadky++;
    }
    if (data.length < STRANA) break;
  }
  return s;
}

async function main() {
  const naozaj = process.argv.includes("--naozaj");
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const kluc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kluc) {
    console.error("Chýba SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY (nastav len v termináli, nikam ho neukladaj).");
    process.exit(2);
  }
  const db = createClient(url, kluc, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(naozaj ? "OSTRÝ BEH — fotky sa nahrajú do Storage a v DB sa nahradia URL.\n"
                     : "SKÚŠOBNÝ REŽIM — nič sa nenahrá ani nezapíše. Ostrý beh: --naozaj\n");
  const spolu = { riadky: 0, fotky: 0, bajty: 0, prenesene: 0, zlyhane: 0, zlyhaneRiadky: 0 };
  for (const t of TABULKY) {
    console.log(`${t.nazov}:`);
    const s = await spracujTabulku(db, t, naozaj);
    for (const k of Object.keys(spolu)) spolu[k] += s[k];
    console.log(`  → ${s.riadky} riadkov, ${s.fotky} fotiek` + (naozaj ? `, prenesené ${s.prenesene}, zlyhané ${s.zlyhane}` : "") + "\n");
  }
  console.log(`Spolu: ${spolu.riadky} riadkov, ${spolu.fotky} fotiek (${(spolu.bajty / 1048576).toFixed(1)} MB).`);
  if (naozaj) {
    console.log(`Prenesené: ${spolu.prenesene} · Zlyhané: ${spolu.zlyhane} (v ${spolu.zlyhaneRiadky} riadkoch).`);
    if (spolu.zlyhane) { console.log("Zlyhané skús znova tým istým príkazom; čo už je hotové, sa preskočí."); process.exitCode = 1; }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
