// ============================================================
// AI Skóre (test modul) — klient pre POST /api/score a /api/score-log
// Frontend NIKDY nevidí prompt ani čísla configu — len response JSON
// (spec v1 §2: Kerckhoff — mechanika verejná, parametre nie).
// ============================================================

import { supabase } from "@/lib/supabase";

export type Verdikt = "ok" | "doplnit" | "zamietnut";

export interface ScoreOdpoved {
  verdikt: Verdikt;
  otazky?: string[];
  typ?: string | null;
  dopad?: number | null;
  dopadZdovodnenie?: string | null;
  narocnost?: number | null;
  narocnostZdovodnenie?: string | null;
  nezistnost?: number | null;
  kredibilita?: number | null;
  kredibilitaSignaly?: string[];
  krizovyRezim?: boolean;
  ucesanyText?: string | null;
  skore?: number | null;
  pasmo?: 0 | 1 | 2 | 3 | 4 | null;
  injectionFlag?: boolean;
  configVersion: string;
  runId: string;
  /** kolo, ktoré určil server */
  kolo?: 1 | 2;
  /** true = simulátor bez API kľúča (backend v mock režime) */
  mock?: boolean;
}

export class ScoreChyba extends Error {
  kod: string;
  constructor(kod: string, sprava: string) { super(sprava); this.kod = kod; }
}

/** dataURL (canvas JPEG) → { typ, dataBase64 } pre request. */
function zDataUrl(dataUrl: string): { typ: "image/jpeg" | "image/png" | "image/webp"; dataBase64: string } {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);
  if (!m) throw new ScoreChyba("zly_dokaz", "Fotka má neplatný formát.");
  return { typ: m[1] as "image/jpeg" | "image/png" | "image/webp", dataBase64: m[2] };
}

/** OPRAVY 127: fotky pre AI zmenšiť na 1024 px, JPEG 0,7 — 3 fotky spolu pod 2 MB (Vercel berie telo najviac ~4,5 MB, inak 413) */
const AI_FOTKA_PX = 1024, AI_FOTKA_KVALITA = 0.7;
function preAi(dataUrl: string): Promise<string> {
  return new Promise((ok) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const k = Math.min(1, AI_FOTKA_PX / Math.max(img.naturalWidth, img.naturalHeight));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
          c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL("image/jpeg", AI_FOTKA_KVALITA));
        } catch { ok(dataUrl); }
      };
      img.onerror = () => ok(dataUrl);
      img.src = dataUrl;
    } catch { ok(dataUrl); }
  });
}
/** Chyby, ktoré opraví používateľ (zlý vstup, veľké fotky) — všetko ostatné = AI je teraz nedostupná. */
const CHYBY_VSTUPU = new Set(["zly_vstup", "velky_dokaz", "vela_dokazov", "zly_dokaz"]);
/** AI je prísada, nie zámka: true = výpadok, limit, bez kľúča — skutok sa uloží a ohodnotí neskôr. */
export function jeVypadokAi(e: unknown): boolean {
  return !(e instanceof ScoreChyba && CHYBY_VSTUPU.has(e.kod));
}
const NEDOSTUPNE = "Hodnotenie je momentálne nedostupné, skúste o chvíľu.";
const VELKE_FOTKY = "Fotky sú príliš veľké — zmenšite ich (spolu najviac 3 MB).";
// Zadanie 5 · 5.3: Vercel prijme telo najviac 4,5 MB — väčšie sa vôbec neposiela (inak padne pred serverom)
const MAX_TELO_B = 4 * 1024 * 1024;

export async function ohodnot(vstup: {
  opis: string;
  miesto: string;
  fotky: string[]; // dataURL-y — pred odoslaním sa zmenšia na 1024 px, JPEG 0,7
  maVideo: boolean;
  anonymne: boolean;
  /** druhé kolo: runId prvého kola s verdiktom „doplnit" (kolo aj limit určí server zo session) */
  predchRunId?: string;
}): Promise<ScoreOdpoved> {
  let r: Response;
  const fotky = await Promise.all(vstup.fotky.map(preAi));
  const telo = JSON.stringify({
    opis: vstup.opis,
    miesto: vstup.miesto,
    dokazy: fotky.map(zDataUrl),
    maVideo: vstup.maVideo,
    anonymne: vstup.anonymne,
    ...(vstup.predchRunId ? { predchRunId: vstup.predchRunId } : {}),
  });
  if (telo.length > MAX_TELO_B) throw new ScoreChyba("velky_dokaz", VELKE_FOTKY);
  // kto volá, zistí server zo session (Bearer token), nie z poľa v požiadavke
  const hlavicky: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const t = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
    if (t) hlavicky.Authorization = `Bearer ${t}`;
  } catch { /* bez session = limit bez prihlásenia */ }
  try {
    r = await fetch("/api/score", { method: "POST", headers: hlavicky, body: telo });
  } catch {
    throw new ScoreChyba("nedostupne", NEDOSTUPNE);
  }
  const data = await r.json().catch(() => ({}));
  // OPRAVY 127: hláška podľa kódu — 503/504 (aj odpoveď, ktorá nie je JSON) = nedostupné, nie „nepodarilo sa"
  if (!r.ok) {
    if (r.status === 413) throw new ScoreChyba("velky_dokaz", VELKE_FOTKY);
    if (r.status === 503 || r.status === 504 || r.status === 529) throw new ScoreChyba(data.chyba ?? "nedostupne", NEDOSTUPNE);
    throw new ScoreChyba(data.chyba ?? `http_${r.status}`, data.sprava ?? "Hodnotenie sa nepodarilo, skús znova.");
  }
  // 200 bez verdiktu (napr. SPA fallback namiesto funkcie) = hodnotenie nebeží
  if (!data || typeof data.verdikt !== "string") throw new ScoreChyba("nedostupne", NEDOSTUPNE);
  return data as ScoreOdpoved;
}

// ---- kalibračný (admin) pohľad — spec v1 §6 ----

export interface LogRiadok {
  runId: string; ts: string; userId: string; configVersion: string; kolo: number;
  verdikt: string; opis: string; typ: string; dopad: number | ""; narocnost: number | "";
  nezistnost: number | ""; kredibilita: number | ""; skore: number | ""; pasmo: number | "";
  krizovyRezim: boolean; injectionFlag: boolean; parseError: boolean; trvanieMs: number | "";
}

export async function nacitajLog(token: string): Promise<LogRiadok[]> {
  const r = await fetch("/api/score-log", { headers: { "x-admin-token": token } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ScoreChyba(data.chyba ?? "chyba", data.sprava ?? "Log sa nepodarilo načítať.");
  return (data.behy ?? []) as LogRiadok[];
}

export async function stiahniCsv(token: string): Promise<void> {
  const r = await fetch("/api/score-log?format=csv", { headers: { "x-admin-token": token } });
  if (!r.ok) throw new ScoreChyba("csv", "Export CSV zlyhal.");
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scoring-log.csv";
  a.click();
  URL.revokeObjectURL(url);
}
