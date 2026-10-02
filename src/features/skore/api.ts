// ============================================================
// AI Skóre (test modul) — klient pre POST /api/score a /api/score-log
// Frontend NIKDY nevidí prompt ani čísla configu — len response JSON
// (spec v1 §2: Kerckhoff — mechanika verejná, parametre nie).
// ============================================================

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
const NEDOSTUPNE = "Hodnotenie je momentálne nedostupné, skúste o chvíľu.";

export async function ohodnot(vstup: {
  opis: string;
  miesto: string;
  fotky: string[]; // dataURL-y — pred odoslaním sa zmenšia na 1024 px, JPEG 0,7
  maVideo: boolean;
  anonymne: boolean;
  userId?: string;
  kolo: 1 | 2;
}): Promise<ScoreOdpoved> {
  let r: Response;
  const fotky = await Promise.all(vstup.fotky.map(preAi));
  try {
    r = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opis: vstup.opis,
        miesto: vstup.miesto,
        dokazy: fotky.map(zDataUrl),
        maVideo: vstup.maVideo,
        anonymne: vstup.anonymne,
        userId: vstup.userId,
        kolo: vstup.kolo,
      }),
    });
  } catch {
    throw new ScoreChyba("nedostupne", NEDOSTUPNE);
  }
  const data = await r.json().catch(() => ({}));
  // OPRAVY 127: hláška podľa kódu — 503/504 (aj odpoveď, ktorá nie je JSON) = nedostupné, nie „nepodarilo sa"
  if (!r.ok) {
    if (r.status === 503 || r.status === 504 || r.status === 529) throw new ScoreChyba(data.chyba ?? "nedostupne", NEDOSTUPNE);
    throw new ScoreChyba(data.chyba ?? `http_${r.status}`, data.sprava ?? "Hodnotenie sa nepodarilo, skús znova.");
  }
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
