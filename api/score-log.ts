// ============================================================
// GET /api/score-log — admin pohľad na kalibračný log (spec v1 §6)
// Tabuľka behov (opis skrátený, D, N, kredibilita, skóre, pásmo)
// + export CSV (?format=csv). Chránené tokenom SCORING_ADMIN_TOKEN
// (hlavička x-admin-token) — log obsahuje opisy userov.
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { nacitajBehy } from "./_lib/log.js";

type Riadok = {
  runId: string; ts: string; userId: string; configVersion: string; kolo: number;
  verdikt: string; opis: string; typ: string; dopad: number | ""; narocnost: number | "";
  nezistnost: number | ""; kredibilita: number | ""; skore: number | ""; pasmo: number | "";
  krizovyRezim: boolean; injectionFlag: boolean; parseError: boolean; trvanieMs: number | "";
};

function naRiadok(r: Record<string, any>): Riadok {
  const json = r.surovy_vystup?.json ?? {};
  return {
    runId: r.run_id, ts: r.ts, userId: r.user_id ?? "", configVersion: r.config_version, kolo: r.kolo,
    verdikt: r.verdikt ?? "", opis: String(r.vstup?.opis ?? "").slice(0, 120),
    typ: json.typ ?? "", dopad: json.dopad ?? "", narocnost: json.narocnost ?? "",
    nezistnost: json.nezistnost ?? "", kredibilita: json.kredibilita ?? "",
    skore: r.dopocitane?.skore ?? "", pasmo: r.dopocitane?.pasmo ?? "",
    krizovyRezim: json.krizovyRezim === true, injectionFlag: r.injection_flag === true,
    parseError: r.parse_error === true, trvanieMs: r.trvanie_ms ?? "",
  };
}

function csvBunka(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") { res.status(405).json({ chyba: "zla_metoda" }); return; }

  const token = process.env.SCORING_ADMIN_TOKEN;
  if (!token) { res.status(503).json({ chyba: "admin_vypnuty", sprava: "SCORING_ADMIN_TOKEN nie je nastavený." }); return; }
  if (req.headers["x-admin-token"] !== token) { res.status(401).json({ chyba: "zly_token" }); return; }

  let behy: Record<string, unknown>[];
  try { behy = await nacitajBehy(500); }
  catch (e) { res.status(500).json({ chyba: "log_nedostupny", sprava: String((e as Error).message) }); return; }

  const riadky = behy.map(naRiadok);

  if (req.query.format === "csv") {
    const stlpce = Object.keys(riadky[0] ?? { runId: "" }) as (keyof Riadok)[];
    const csv = [
      stlpce.join(","),
      ...riadky.map((r) => stlpce.map((s) => csvBunka(r[s])).join(",")),
    ].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="scoring-log.csv"`);
    res.status(200).send("﻿" + csv); // BOM kvôli diakritike v Exceli
    return;
  }

  res.status(200).json({ pocet: riadky.length, behy: riadky });
}
