// ============================================================
// DEED AI Hodnotenie — kalibračný log (doplnok v1.1 §4)
// Append-only zárodok referenčnej DB — NIKDY nemazať.
// Vercel serverless nemá trvalý disk → píšeme do Supabase:
//  · tabuľka scoring_log (JSONL ekvivalent, 1 riadok = 1 beh)
//  · fotky do Storage bucketu scoring-dokazy/{runId}/ (NIE base64 v logu)
//  · denný strop volaní = COUNT riadkov za dnešok (netreba KV)
// Prístup LEN cez SUPABASE_SERVICE_ROLE_KEY (env) — tabuľka má RLS bez
// policies, frontend sa k nej nedostane.
// ============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DokazVstup, LogZaznam } from "./typy";

const BUCKET = "scoring-dokazy";

// Dev fallback bez Supabase: behy sa držia v pamäti procesu (vite dev server),
// aby kalibračná tabuľka aj denný strop fungovali aj lokálne. V produkcii
// (serverless) sa vždy používa DB — pamäť by sa strácala medzi inštanciami.
const pamatovyLog: LogZaznam[] = [];
const PAMAT_MAX = 500;

let klient: SupabaseClient | null | undefined;

function db(): SupabaseClient | null {
  if (klient !== undefined) return klient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const kluc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kluc) {
    console.warn("[scoring] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY chýba — log a denný strop sú VYPNUTÉ (len dev).");
    klient = null;
    return klient;
  }
  klient = createClient(url, kluc, { auth: { persistSession: false } });
  return klient;
}

/** Počet behov od polnoci UTC — denný strop (doplnok §5, config api.denny_strop_volani). */
export async function pocetBehovDnes(): Promise<number> {
  const s = db();
  if (!s) {
    const dnes = new Date().toISOString().slice(0, 10);
    return pamatovyLog.filter((z) => z.ts.startsWith(dnes)).length;
  }
  const zaciatokDna = new Date();
  zaciatokDna.setUTCHours(0, 0, 0, 0);
  const { count, error } = await s
    .from("scoring_log")
    .select("id", { count: "exact", head: true })
    .gte("ts", zaciatokDna.toISOString());
  if (error) {
    console.error("[scoring] počítanie denného stropu zlyhalo:", error.message);
    return 0; // strop je poistka kreditu, nie tvrdá bezpečnosť — pri výpadku DB nepadaj
  }
  return count ?? 0;
}

/** Zapíše jeden beh do logu. Chyba logu NIKDY nezhodí odpoveď userovi. */
export async function zapisBeh(z: LogZaznam): Promise<void> {
  const s = db();
  if (!s) {
    pamatovyLog.unshift(z);
    if (pamatovyLog.length > PAMAT_MAX) pamatovyLog.pop();
    console.log("[scoring] beh (in-memory log):", z.runId, z.verdikt ?? "parseError", z.dopocitane ?? "");
    return;
  }
  const { error } = await s.from("scoring_log").insert({
    run_id: z.runId,
    ts: z.ts,
    user_id: z.userId ?? null,
    config_version: z.configVersion,
    kolo: z.kolo,
    verdikt: z.verdikt ?? null,
    vstup: z.vstup,
    surovy_vystup: z.surovyVystup ?? null,
    dopocitane: z.dopocitane ?? null,
    trvanie_ms: z.trvanieMs,
    parse_error: z.parseError ?? false,
    injection_flag: z.injectionFlag ?? false,
  });
  if (error) console.error("[scoring] zápis logu zlyhal:", error.message);
}

/** Uloží fotky behu vedľa logu (bucket scoring-dokazy/{runId}/{i}.jpg|png|webp). */
export async function ulozDokazy(runId: string, dokazy: DokazVstup[]): Promise<void> {
  const s = db();
  if (!s || dokazy.length === 0) return;
  await Promise.all(
    dokazy.map(async (d, i) => {
      const pripona = d.typ === "image/png" ? "png" : d.typ === "image/webp" ? "webp" : "jpg";
      const { error } = await s.storage
        .from(BUCKET)
        .upload(`${runId}/${i + 1}.${pripona}`, Buffer.from(d.dataBase64, "base64"), {
          contentType: d.typ,
          upsert: false,
        });
      if (error) console.error(`[scoring] upload dôkazu ${i + 1} zlyhal:`, error.message);
    }),
  );
}

/** Admin čítanie logu (spec v1 §6 — tabuľka behov + CSV export). */
export async function nacitajBehy(limit = 500): Promise<Record<string, unknown>[]> {
  const s = db();
  if (!s) {
    // in-memory riadky v rovnakom tvare ako DB (snake_case), nech admin endpoint nerozlišuje
    return pamatovyLog.slice(0, limit).map((z) => ({
      run_id: z.runId, ts: z.ts, user_id: z.userId ?? null, config_version: z.configVersion,
      kolo: z.kolo, verdikt: z.verdikt ?? null, vstup: z.vstup, surovy_vystup: z.surovyVystup ?? null,
      dopocitane: z.dopocitane ?? null, trvanie_ms: z.trvanieMs,
      parse_error: z.parseError ?? false, injection_flag: z.injectionFlag ?? false,
    }));
  }
  const { data, error } = await s
    .from("scoring_log")
    .select("run_id, ts, user_id, config_version, kolo, verdikt, vstup, surovy_vystup, dopocitane, trvanie_ms, parse_error, injection_flag")
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
