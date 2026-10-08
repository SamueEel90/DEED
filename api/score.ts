// ============================================================
// POST /api/score — REÁLNE AI hodnotenie skutku (Opus, žiadny mock)
// DEED_AI_Hodnotenie_Backend_DEV.md v1 + Doplnok v1.1 + SCORING_PROMPT.md
//
// Frontend (test modul) → tento endpoint → zloží SYSTEM prompt
// (pravidlá + kotvy z configu) → Anthropic API → JSON výstup →
// backend dopočíta skóre a pásmo → log → odpoveď frontendu.
//
// Prompt aj config žijú LEN tu na backende (Kerckhoff: mechanika
// verejná, parametre nie). API kľúč LEN v env — nikdy v odpovedi.
// ============================================================
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import config from "./_lib/scoring-config.json" with { type: "json" };
import type { DokazVstup, OpusVystup, ScoreRequest, ScoreResponse, ScoringConfig, Verdikt } from "./_lib/typy.js";
import { zlozSystemPrompt } from "./_lib/prompt.js";
import { dopocitaj, NevalidnyVystup } from "./_lib/vypocet.js";
import { ApiNedostupne, ohodnotSkutok } from "./_lib/opus.js";
import { mockOhodnot } from "./_lib/mock.js";
import { koloPodlaServera, ktoVola, pocetBehovDnes, pocetBehovDnesPre, ulozDokazy, zapisBeh, zapisSkoreDoPrispevku } from "./_lib/log.js";

const cfg = config as unknown as ScoringConfig;

const MAX_DOKAZOV = 3;                       // doplnok §1
// Zadanie 5 · 5.3: Vercel prijme telo najviac 4,5 MB (base64 = +33 %) → fotka najviac 3 MB, všetky spolu 3 MB.
// Appka fotky pred odoslaním zmenší (1024 px, JPEG 0,7) a väčšie telo vôbec nepošle (zrozumiteľná chyba).
const MAX_DOKAZ_B = 3 * 1024 * 1024;
const MAX_DOKAZY_SPOLU_B = 3 * 1024 * 1024;
const POVOLENE_TYPY = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_OPIS = 8000;                       // poistka proti gigantickému vstupu

function chyba(res: VercelResponse, status: number, kod: string, sprava: string) {
  res.status(status).json({ chyba: kod, sprava });
}

/** Validácia requestu — vráti očistený vstup alebo null (odpoveď už poslaná). */
function overRequest(req: VercelRequest, res: VercelResponse): (ScoreRequest & { dokazy: DokazVstup[] }) | null {
  const b = (req.body ?? {}) as Partial<ScoreRequest>;
  if (typeof b.opis !== "string" || !b.opis.trim()) { chyba(res, 400, "zly_vstup", "Chýba opis skutku."); return null; }
  if (b.opis.length > MAX_OPIS) { chyba(res, 400, "zly_vstup", "Opis je príliš dlhý."); return null; }
  if (typeof b.miesto !== "string") { chyba(res, 400, "zly_vstup", "Chýba miesto."); return null; }

  const dokazy: DokazVstup[] = [];
  if (b.dokazy !== undefined) {
    if (!Array.isArray(b.dokazy)) { chyba(res, 400, "zly_vstup", "Pole dokazy má zlý tvar."); return null; }
    if (b.dokazy.length > MAX_DOKAZOV) { chyba(res, 400, "vela_dokazov", `Max ${MAX_DOKAZOV} súbory na jeden skutok.`); return null; }
    for (const d of b.dokazy) {
      if (!d || typeof d.dataBase64 !== "string" || !POVOLENE_TYPY.has(d.typ)) {
        chyba(res, 400, "zly_dokaz", "Dôkaz musí byť JPEG/PNG/WebP v base64.");
        return null;
      }
      // veľkosť z base64 (~3/4 dĺžky) — väčšie = „zmenši fotku“
      const velkost = Math.floor(d.dataBase64.length * 0.75);
      if (velkost > MAX_DOKAZ_B) { chyba(res, 413, "velky_dokaz", "Fotka je príliš veľká — zmenši ju (najviac 3 MB)."); return null; }
      dokazy.push({ typ: d.typ, dataBase64: d.dataBase64.replace(/^data:[^,]+,/, ""), nazov: d.nazov });
    }
    if (dokazy.reduce((s, d) => s + Math.floor(d.dataBase64.length * 0.75), 0) > MAX_DOKAZY_SPOLU_B) {
      chyba(res, 413, "velky_dokaz", "Fotky sú spolu príliš veľké — najviac 3 MB."); return null;
    }
  }

  return {
    opis: b.opis.trim(),
    miesto: b.miesto.trim(),
    dokazy,
    maVideo: b.maVideo === true,
    anonymne: b.anonymne === true,
    predchRunId: typeof b.predchRunId === "string" && /^[0-9a-f-]{36}$/i.test(b.predchRunId) ? b.predchRunId : undefined,
  };
}

/** USER message podľa SCORING_PROMPT poznámky 2 (+ video info z doplnku §1). */
function zlozUserText(v: ScoreRequest & { dokazy: DokazVstup[] }): string {
  const riadky = [
    v.opis,
    `Miesto: ${v.miesto || "neuvedené"}`,
    `Anonymne: ${v.anonymne ? "áno" : "nie"}`,
    `Priložené dôkazy: ${v.dokazy.length ? `${v.dokazy.length}× fotka (nižšie)` : "žiadne fotky"}`,
  ];
  if (v.maVideo) riadky.push("User priložil video (v teste sa neanalyzuje — posudzuje sa ručne pri kalibrácii).");
  return riadky.join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { chyba(res, 405, "zla_metoda", "Použi POST."); return; }

  // MOCK režim (bez API kľúča): SCORING_MOCK=1, alebo chýbajúci kľúč MIMO ostrej produkcie.
  // Na Verceli je NODE_ENV vždy „production" — testovacie nasadenie (vetva platby-modul a každý preview,
  // rovnako ako VITE_TEST vo vite.config.ts) bez kľúča preto tiež beží na simulátore.
  // V ostrej produkcii bez kľúča NIKDY nemockuje — falošné skóre nesmie ujsť do ostrého behu.
  const testNasadenie = process.env.VERCEL_ENV === "preview" || ["platby-modul"].includes(process.env.VERCEL_GIT_COMMIT_REF ?? "");
  const mockRezim =
    process.env.SCORING_MOCK === "1" ||
    (!process.env.ANTHROPIC_API_KEY && (process.env.NODE_ENV !== "production" || testNasadenie));
  if (!mockRezim && !process.env.ANTHROPIC_API_KEY) {
    chyba(res, 503, "nedostupne", "Hodnotenie je momentálne nedostupné, skús o chvíľu.");
    return;
  }

  const vstup = overRequest(req, res);
  if (!vstup) return;

  // Zadanie 5 · 5.3: kto volá = účet zo session (bez prihlásenia hash IP); userId od klienta sa ignoruje
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket?.remoteAddress ?? "").split(",")[0].trim();
  const volajuci = await ktoVola(typeof req.headers.authorization === "string" ? req.headers.authorization : undefined, ip);
  // limit per účet: jeden človek nevyčerpá deň ostatným (mock nič nestojí → nepočíta sa)
  const limit = volajuci.prihlaseny ? cfg.api.limit_na_ucet_den : cfg.api.limit_bez_uctu_den;
  if (!mockRezim && (await pocetBehovDnesPre(volajuci.kluc)) >= limit) {
    chyba(res, 429, "limit_uctu", volajuci.prihlaseny ? "Dnešný limit hodnotení je vyčerpaný — pokračuj zajtra." : "Dnešný limit bez prihlásenia je vyčerpaný — prihlás sa alebo pokračuj zajtra.");
    return;
  }
  // spoločný denný strop ostáva ako poistka kreditu (doplnok §5)
  if (!mockRezim && (await pocetBehovDnes()) >= cfg.api.denny_strop_volani) {
    chyba(res, 429, "denny_limit", "Denný limit testu vyčerpaný — pokračuj zajtra.");
    return;
  }
  // kolo počíta server: 2 len po platnom prvom kole tohto volajúceho
  const kolo = await koloPodlaServera(volajuci.kluc, vstup.predchRunId);

  const runId = randomUUID();
  const start = Date.now();
  // configVersion s +MOCK: mock behy sú v logu jasne oddelené od kalibračných (DB musí ostať čistá)
  const configVersion = mockRezim ? `${cfg._meta.configVersion}+MOCK` : cfg._meta.configVersion;
  const dokazyMeta = {
    pocet: vstup.dokazy.length,
    typy: vstup.dokazy.map((d) => d.typ),
    velkostiB: vstup.dokazy.map((d) => Math.floor(d.dataBase64.length * 0.75)),
    maVideo: vstup.maVideo === true,
  };
  const zakladLogu = {
    runId,
    ts: new Date().toISOString(),
    userId: volajuci.kluc,
    configVersion,
    kolo,
    vstup: { opis: vstup.opis, miesto: vstup.miesto, anonymne: vstup.anonymne, dokazyMeta, ...(kolo === 2 ? { predchRunId: vstup.predchRunId } : {}) },
  };

  let beh;
  try {
    beh = mockRezim
      ? mockOhodnot(cfg, {
          opis: vstup.opis,
          miesto: vstup.miesto,
          anonymne: vstup.anonymne,
          pocetFotiek: vstup.dokazy.length,
          maVideo: vstup.maVideo === true,
          kolo,
        })
      : await ohodnotSkutok(cfg, zlozSystemPrompt(cfg), zlozUserText(vstup), vstup.dokazy);
  } catch (e) {
    const trvanieMs = Date.now() - start;
    if (e instanceof NevalidnyVystup || e instanceof SyntaxError) {
      // nevalidný JSON aj po opravnom kole → chyba usera + log s flagom (doplnok §2)
      await zapisBeh({ ...zakladLogu, trvanieMs, parseError: true, surovyVystup: { chyba: String(e.message) } });
      chyba(res, 502, "hodnotenie_zlyhalo", "Hodnotenie sa nepodarilo, skús znova.");
      return;
    }
    if (e instanceof ApiNedostupne) {
      // po retry stále nedostupné → skutok sa NEULOŽÍ ako ohodnotený (doplnok §5)
      chyba(res, 503, "nedostupne", "Hodnotenie je momentálne nedostupné, skús o chvíľu.");
      return;
    }
    console.error("[scoring] neočakávaná chyba:", e);
    chyba(res, 500, "chyba", "Hodnotenie sa nepodarilo, skús znova.");
    return;
  }

  let vystup: OpusVystup = beh.vystup;

  // max jedno druhé kolo: „doplnit“ v 2. kole → „zamietnut: nedoplnené“ (doplnok §6)
  if (vystup.verdikt === "doplnit" && kolo > cfg.otazky.max_kola) {
    vystup = { ...vystup, verdikt: "zamietnut" as Verdikt, otazky: null, zamietnutieDovod: "nedoplnené (vyčerpané kolá otázok)" };
  }

  // Zadanie 5 · 5.3: nezištnosť má hornú hranicu z configu (anonymita = najviac malý bonus)
  if (vystup.verdikt === "ok" && typeof vystup.nezistnost === "number") {
    vystup = { ...vystup, nezistnost: Math.min(vystup.nezistnost, cfg.nezistnost.anonymne) };
  }
  const dopocitane = vystup.verdikt === "ok" ? dopocitaj(vystup, cfg) : null;
  const trvanieMs = Date.now() - start;

  // log + fotky vedľa logu — zlyhanie logu nezhodí odpoveď userovi
  await Promise.all([
    zapisBeh({
      ...zakladLogu,
      verdikt: vystup.verdikt,
      surovyVystup: { text: beh.surovyText, json: vystup, parseRetry: beh.parseRetry },
      dopocitane,
      trvanieMs,
      injectionFlag: vystup.injectionFlag === true,
    }),
    ulozDokazy(runId, vstup.dokazy),
  ]);
  // Zadanie 3 · 3.1: skóre do príspevku zapisuje server (log musí byť zapísaný skôr — trigger 0039 z neho číta)
  if (dopocitane) await zapisSkoreDoPrispevku(runId, dopocitane);

  // odpoveď frontendu — bez interných polí (zamietnutieDovod ostáva v logu,
  // userovi ide neutrálna hláška bez návodu čo opraviť; spec v1 §5)
  const odpoved: ScoreResponse = {
    verdikt: vystup.verdikt,
    ...(vystup.verdikt === "doplnit"
      ? { otazky: (vystup.otazky ?? []).slice(0, cfg.otazky.max_pocet) }
      : {}),
    ...(vystup.verdikt === "ok"
      ? {
          typ: vystup.typ ?? null,
          dopad: vystup.dopad ?? null,
          dopadZdovodnenie: vystup.dopadZdovodnenie ?? null,
          narocnost: vystup.narocnost ?? null,
          narocnostZdovodnenie: vystup.narocnostZdovodnenie ?? null,
          nezistnost: vystup.nezistnost ?? null,
          kredibilita: vystup.kredibilita ?? null,
          kredibilitaSignaly: vystup.kredibilitaSignaly ?? [],
          krizovyRezim: vystup.krizovyRezim === true,
          ucesanyText: vystup.ucesanyText ?? null,
          skore: dopocitane?.skore ?? null,
          pasmo: dopocitane?.pasmo ?? null,
        }
      : {}),
    injectionFlag: vystup.injectionFlag === true,
    configVersion,
    runId,
    kolo,
    ...(mockRezim ? { mock: true } : {}),
  };
  res.status(200).json(odpoved);
}
