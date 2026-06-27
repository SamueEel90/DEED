// ============================================================
// DEED · Generátor SEED SQL z mocku (Vite SSR načíta TS + @/ aliasy)
// Spustenie:  node scripts/seed-content.mjs
// Výstup:     supabase/migrations/0004_good_seed.sql  (INSERTy z POLOZKY+EVENTS)
// Migráciu potom aplikujeme na DB cez Supabase MCP (service role).
// ============================================================
import { createServer } from "vite";
import { writeFileSync } from "node:fs";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "warn" });

// --- SQL helpery ---
const s = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);     // string literal
const n = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? "NULL" : String(Number(v))); // number
const b = (v) => (v ? "true" : "false");                                          // boolean
const jb = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;            // jsonb literal
const dni = (d) => `now() - interval '${Math.max(0, Number(d) || 0)} days'`;       // vytvorene z veku

try {
  const good = await vite.ssrLoadModule("/src/features/good/mock.ts");
  const { POLOZKY, EVENTS } = good;

  // ---- PRISPEVOK (z POLOZKY) ----
  const pCols = "(cislo, autor_nazov, autor_ini, autor_pfp, autor_karma, modul, typ, kat, titul, popis, emoji, media, lat, lng, lok, narodne, typ_situacie, skore, overene, topovane, vyznam, ciel, vyzbierane, pomocnici, lajky, podpora_count, data, vytvorene)";
  const pRows = POLOZKY.map((it) => {
    const media = { druh: it.media ?? null, fotky: it.fotky ?? [], video: it.video ?? null };
    const data = {};
    for (const k of ["zdroj", "charLevel", "otvorenaPodpora", "velkost", "suma"]) if (it[k] !== undefined) data[k] = it[k];
    return `(${[
      n(it.num), s(it.autor), s(it.ini), s(it.pfp), s(it.karma),
      s(it.modul || "good"), s(it.typ), s(it.kat), s(it.titul), s(it.popis), s(it.emoji),
      jb(media), n(it.lat), n(it.lng), s(it.lok), b(it.narodne),
      s(it.typSituacie || "normal"), n(it.skore), b(it.overene), b(it.topovane), s(it.vyznam),
      n(it.ciel), n(it.vyzbierane), n(it.pomocnici), n(it.lajky ?? 0), n(it.podpora ?? 0),
      jb(data), dni(it.dni),
    ].join(", ")})`;
  });

  // ---- UDALOST (z EVENTS) ----
  const uCols = "(modul, kedy_text, titul, kto, zdroj, kat, popis, miesto, kapacita, top)";
  const uRows = EVENTS.map((e) => `(${[
    s("good"), s(e.when), s(e.title), s(e.who), s(e.src), s(e.kat), s(e.desc), s(e.place), s(e.cap), b(e.top),
  ].join(", ")})`);

  const sql = `-- DEED · SEED obsahu (Good) — vygenerované z features/good/mock.ts
-- Idempotentné: najprv vyčistí Good obsah, potom vloží. (Spustené cez MCP / service role.)

truncate table public.prispevok restart identity cascade;
delete from public.udalost where modul = 'good';

insert into public.prispevok ${pCols} values
${pRows.join(",\n")};

insert into public.udalost ${uCols} values
${uRows.join(",\n")};
`;

  writeFileSync("supabase/migrations/0004_good_seed.sql", sql, "utf8");
  console.log(`OK — prispevok: ${pRows.length} riadkov, udalost: ${uRows.length} riadkov → supabase/migrations/0004_good_seed.sql`);
} catch (e) {
  console.error("CHYBA:", e);
  process.exitCode = 1;
} finally {
  await vite.close();
}
