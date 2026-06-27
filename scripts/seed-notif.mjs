// ============================================================
// DEED · Generátor SEED SQL pre Notifikácie (Vite SSR načíta TS + @/ aliasy)
// Spustenie:  node scripts/seed-notif.mjs
// Výstup:     supabase/migrations/0008_notif_seed.sql
//
// Broadcast notifikácie (ucet_id = NULL → vidí každý). `cas` (display string
// "teraz"/"8 min"/"2 h"/"1 d") sa pri seede prevedie na timestamptz cez interval;
// mapper v notifikacie.supabase.ts ho späť prepočíta na relatívny čas.
// ============================================================
import { createServer } from "vite";
import { writeFileSync } from "node:fs";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "warn" });

const s = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v ? "true" : "false");

// "teraz" → now(); "8 min"/"2 h"/"1 d" → now() - interval
function casVyraz(cas) {
  if (!cas || cas === "teraz") return "now()";
  const m = String(cas).match(/^(\d+)\s*(min|h|d)$/);
  if (!m) return "now()";
  const unit = { min: "minutes", h: "hours", d: "days" }[m[2]];
  return `now() - interval '${Number(m[1])} ${unit}'`;
}

try {
  const mod = await vite.ssrLoadModule("/src/features/notifikacie/mock.ts");
  const { NOTIFY } = mod;

  const cols = "(kat, ikona, col, titul, text, nove, agg, cas)";
  const rows = NOTIFY.map((n) => `(${[
    s(n.kat), s(n.ic), s(n.col), s(n.titul), s(n.text), b(n.nove), b(n.agg), casVyraz(n.cas),
  ].join(", ")})`);

  const sql = `-- DEED · SEED Notifikácie — vygenerované z features/notifikacie/mock.ts
-- Broadcast (ucet_id NULL). Idempotentné: zmaž broadcast seed, vlož.
-- Realtime: tabuľka je v publikácii supabase_realtime (viď migrácia 0008 hlavička).

delete from public.notifikacia where ucet_id is null;

insert into public.notifikacia ${cols} values
${rows.join(",\n")};
`;

  writeFileSync("supabase/migrations/0008_notif_seed.sql", sql, "utf8");
  console.log(`OK — notifikacia: ${rows.length} riadkov → supabase/migrations/0008_notif_seed.sql`);
} catch (e) {
  console.error("CHYBA:", e);
  process.exitCode = 1;
} finally {
  await vite.close();
}
