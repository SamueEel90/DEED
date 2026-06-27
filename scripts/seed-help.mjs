// ============================================================
// DEED · Generátor SEED SQL pre Help (Vite SSR načíta TS + @/ aliasy)
// Spustenie:  node scripts/seed-help.mjs
// Výstup:     supabase/migrations/0010_help_seed.sql
//
// Help má vlastný SK slovník (nazov/pribeh/ikona/velkost) podobný Good — engine
// polia (skore/geo/typSituacie/narodne/podpora) idú do STĹPCOV, modulové extra
// (velkost/odbornik/sponzor/avatar + pôvodné numerické id a EN-ish typ) do `data`.
// DISKRIMINÁTOR data.help=true odlišuje Help od Domov/Charita/Aktivity (good.feed
// + top-hrdinovia ich vylúčia, aby Help nepresiakol do Domova/Top).
// POZN. typ: CHECK nepozná 'charity' (len SK 'charita') → do stĺpca ide 'charita',
//       pôvodný Help typ ('ziadost'|'ponuka'|'charity') ostáva v data.typ (round-trip
//       karty + feed engine). suma→vyzbierane, ciel→ciel, ludia→pomocnici.
//       vytvorene = now() - dni (dniZ ho v mapperi vráti späť → čerstvosť feedu).
// ============================================================
import { createServer } from "vite";
import { writeFileSync } from "node:fs";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "warn" });

const s = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? "NULL" : String(Number(v)));
const b = (v) => (v ? "true" : "false");
const jb = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const dni = (d) => `now() - interval '${Math.max(0, Number(d) || 0)} days'`;

try {
  const mod = await vite.ssrLoadModule("/src/features/help/mock.ts");
  const { MOCK_FEED } = mod;

  const cols =
    "(cislo, autor_nazov, autor_karma, modul, typ, kat, popis, emoji, media, lat, lng, lok, narodne, typ_situacie, skore, overene, ciel, vyzbierane, pomocnici, lajky, podpora_count, data, vytvorene)";

  const rows = MOCK_FEED.map((it) => {
    const media = { druh: null, fotky: it.fotky ?? [], video: null };
    const typCol = it.typ === "charity" ? "charita" : it.typ; // CHECK nepozná 'charity'
    const data = { help: true, id: it.id, typ: it.typ };       // pôvodný typ pre round-trip
    for (const k of ["velkost", "odbornik", "sponzor", "avatar"]) {
      if (it[k] !== undefined) data[k] = it[k];
    }
    return `(${[
      n(it.id), s(it.nazov), s(it.karma),
      s(it.modul || "help"), s(typCol), s(it.kat), s(it.pribeh), s(it.ikona),
      jb(media), n(it.lat), n(it.lng), s(it.lok), b(it.narodne),
      s(it.typSituacie || "normal"), n(it.skore), b(it.overeny),
      n(it.ciel), n(it.suma), n(it.ludia), n(0), n(it.podpora ?? 0),
      jb(data), dni(it.dni),
    ].join(", ")})`;
  });

  const sql = `-- DEED · SEED Help — vygenerované z features/help/mock.ts
-- Diskriminátor data.help=true (good.feed + top-hrdinovia ich vylúčia, aby Help
-- nepresiakol do Domova/Top). Pôvodný typ v data.typ ('charity' round-trip);
-- stĺpec typ je CHECK-safe ('charity'→'charita'). suma→vyzbierane, ludia→pomocnici.
-- Idempotentné: zmaž len Help riadky (data ? 'help'), potom vlož. (NIKDY truncate.)

delete from public.prispevok where data ? 'help';

insert into public.prispevok ${cols} values
${rows.join(",\n")};
`;

  writeFileSync("supabase/migrations/0010_help_seed.sql", sql, "utf8");
  console.log(`OK — prispevok(help): ${rows.length} riadkov → supabase/migrations/0010_help_seed.sql`);
} catch (e) {
  console.error("CHYBA:", e);
  process.exitCode = 1;
} finally {
  await vite.close();
}
