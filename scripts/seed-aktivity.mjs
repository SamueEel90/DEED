// ============================================================
// DEED · Generátor SEED SQL pre Aktivity (Vite SSR načíta TS + @/ aliasy)
// Spustenie:  node scripts/seed-aktivity.mjs
// Výstup:     supabase/migrations/0009_aktivity_seed.sql
//
// Aktivity má EN slovník (title/desc/type/dom). Engine polia (typ/skore/geo/dni)
// dopočítava KLIENT cez obohatit() — preto seed ukladá EN polia do stĺpcov/JSONB
// a mapper ich vráti späť bez prekladu. DISKRIMINÁTOR data.akt=true odlišuje
// Aktivity od Domov/Charita (good.feed + top-hrdinovia ich vylúčia). EN `type`
// ide do data.type (round-trip karty); stĺpec typ nesie engine typ (help→ziadost).
// id (1–34) sa zachová v data.id (žiadne zmeny typov v komponente).
// ============================================================
import { createServer } from "vite";
import { writeFileSync } from "node:fs";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "warn" });

const s = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? "NULL" : String(Number(v)));
const b = (v) => (v ? "true" : "false");
const jb = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;

const SKORE_VELKOST = { big: 7.5, med: 4.5, small: 2.0, req: 4.0 };
const MODUL_ENGINE = { help: "help", workshop: "workshop", case: "charity" };

try {
  const mod = await vite.ssrLoadModule("/src/features/aktivity/mock.ts");
  const { SEED_ITEMS, GEO_LOK } = mod;

  // geoZLok — 1:1 logika z utils.ts (prvý kľúč, ktorého podreťazec je v loc)
  const geoZLok = (loc = "") => {
    for (const k in GEO_LOK) if (loc.includes(k)) return GEO_LOK[k];
    return { lat: 48.894, lng: 18.044 }; // default Trenčín centrum
  };

  const cols =
    "(cislo, autor_nazov, autor_ini, autor_pfp, autor_karma, modul, typ, kat, titul, popis, emoji, media, lat, lng, lok, narodne, typ_situacie, skore, overene, vyznam, ciel, vyzbierane, pomocnici, lajky, podpora_count, data)";

  const rows = SEED_ITEMS.map((it) => {
    const g = geoZLok(it.loc || "");
    const modul = MODUL_ENGINE[it.type] || "good";
    const typ = it.type === "help" ? "ziadost" : it.type; // CHECK typ nepozná 'help'
    const skore = it.skore ?? SKORE_VELKOST[it.size] ?? 3;
    const podpora = it.likes ? Math.round(it.likes / 3) : (it.helpers || 0);
    const media = { druh: it.media ?? null, fotky: it.fotky ?? [], video: it.video ?? null };
    const data = { akt: true, id: it.id, type: it.type };
    for (const k of ["size", "time", "drr", "source", "mine", "seats", "price", "priceTxt", "rating", "profi", "b2b", "skore"]) {
      if (it[k] !== undefined) data[k] = it[k];
    }
    return `(${[
      n(it.num), s(it.author), s(it.ini), s(it.pfp), s(it.karma),
      s(modul), s(typ), s(it.dom), s(it.title), s(it.desc), s(it.emoji),
      jb(media), n(g.lat), n(g.lng), s(it.loc), b(/online/i.test(it.loc || "")),
      s("normal"), n(skore), b(it.verified), s(it.importance),
      n(it.goal), n(it.raised), n(it.helpers), n(it.likes ?? 0), n(podpora),
      jb(data),
    ].join(", ")})`;
  });

  const sql = `-- DEED · SEED Aktivity — vygenerované z features/aktivity/mock.ts
-- Diskriminátor data.akt=true (good.feed + top-hrdinovia ich vylúčia, aby Aktivity
-- nepresiakli do Domova/Top). EN type v data.type; engine typ v stĺpci (help→ziadost).
-- Idempotentné: zmaž len Aktivity riadky (data ? 'akt'), potom vlož. (NIKDY truncate.)

delete from public.prispevok where data ? 'akt';

insert into public.prispevok ${cols} values
${rows.join(",\n")};
`;

  writeFileSync("supabase/migrations/0009_aktivity_seed.sql", sql, "utf8");
  console.log(`OK — prispevok(aktivity): ${rows.length} riadkov → supabase/migrations/0009_aktivity_seed.sql`);
} catch (e) {
  console.error("CHYBA:", e);
  process.exitCode = 1;
} finally {
  await vite.close();
}
