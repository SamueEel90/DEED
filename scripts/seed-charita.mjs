// ============================================================
// DEED · Generátor SEED SQL pre Charitu (Vite SSR načíta TS + @/ aliasy)
// Spustenie:  node scripts/seed-charita.mjs
// Výstup:     supabase/migrations/0005_charita_seed.sql
//
// Charita má vlastný kurátorský feed (FEED_ITEMS) — mix bespoke „comp" kariet
// (urgent/top/mala/zapoj/material; obsah je v komponente) a dátových kariet
// (comp:"data"; reálny obsah). Aby Domov (good.feed) tieto NEpreberal, každý
// charita-page riadok nesie `data.comp` ⇒ DISKRIMINÁTOR:
//   • Domov   = prispevok WHERE data->>'comp' IS NULL
//   • Charita = prispevok WHERE data->>'comp' IS NOT NULL
// ZBIERKA (detail Rodina Kováčová) sa uloží do urgent riadku (`data.zbierka`).
// ADRESAR → adresar_charita (+ chipy text[] na sekcii, denormalizovane na riadok).
// ============================================================
import { createServer } from "vite";
import { writeFileSync } from "node:fs";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "warn" });

// --- SQL helpery (zhodné so seed-content.mjs) ---
const s = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? "NULL" : String(Number(v)));
const b = (v) => (v ? "true" : "false");
const jb = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const dni = (d) => `now() - interval '${Math.max(0, Number(d) || 0)} days'`;
const arr = (a) => (a && a.length ? `array[${a.map((x) => s(x)).join(", ")}]::text[]` : "NULL");

try {
  const mod = await vite.ssrLoadModule("/src/features/charita/mock.ts");
  const { FEED_ITEMS, ADRESAR, ZBIERKA } = mod;

  // ---- PRISPEVOK (z FEED_ITEMS) — každý nesie data.comp ----
  const pCols =
    "(autor_nazov, modul, typ, kat, titul, popis, emoji, media, lat, lng, lok, narodne, typ_situacie, skore, overene, ciel, vyzbierane, podpora_count, data, vytvorene)";
  const pRows = FEED_ITEMS.map((it) => {
    const media = { fotky: it.fotky ?? [] };
    const data = { comp: it.comp };
    if (it.badgeL !== undefined) data.badgeL = it.badgeL;
    if (it.tag !== undefined) data.tag = it.tag;
    // ZBIERKA (detail hero) viažeme na urgent kartu — odtiaľ ju číta zbierka()
    if (it.comp === "urgent") data.zbierka = ZBIERKA;
    return `(${[
      s(it.nazov), s(it.modul || "charity"), s(it.typ), s(it.kat),
      s(it.nazov), s(it.popis), s(it.emoji),
      jb(media), n(it.lat), n(it.lng), s(it.lok), b(it.narodne),
      s(it.typSituacie || "normal"), n(it.skore), b(it.overena),
      n(it.ciel), n(it.vyzbierane), n(it.podpora ?? 0),
      jb(data), dni(it.dni),
    ].join(", ")})`;
  });

  // ---- ADRESAR_CHARITA (z ADRESAR) — sploštené riadky + sekciový chipy + poradie ----
  const aCols = "(sekcia, skratka, nazov, popis, level, ponuky, chipy, poradie)";
  let poradie = 0;
  const aRows = [];
  for (const sek of ADRESAR) {
    for (const p of sek.polozky) {
      // p = [skratka, nazov, popis, level, ponuky]
      aRows.push(`(${[
        s(sek.sekcia), s(p[0]), s(p[1]), s(p[2]), s(p[3]), s(p[4]), arr(sek.chipy), n(poradie++),
      ].join(", ")})`);
    }
  }

  const sql = `-- DEED · SEED Charita — vygenerované z features/charita/mock.ts
-- Idempotentné: zmaže LEN charita-page riadky (data->>'comp' not null) + adresár.
-- (Spúšťa sa cez Supabase MCP / service role; beží PO 0004_good_seed.)

alter table public.adresar_charita add column if not exists chipy text[];

delete from public.prispevok where data ? 'comp';
delete from public.adresar_charita;

insert into public.prispevok ${pCols} values
${pRows.join(",\n")};

insert into public.adresar_charita ${aCols} values
${aRows.join(",\n")};
`;

  writeFileSync("supabase/migrations/0005_charita_seed.sql", sql, "utf8");
  console.log(`OK — prispevok(charita): ${pRows.length} riadkov, adresar_charita: ${aRows.length} riadkov → supabase/migrations/0005_charita_seed.sql`);
} catch (e) {
  console.error("CHYBA:", e);
  process.exitCode = 1;
} finally {
  await vite.close();
}
