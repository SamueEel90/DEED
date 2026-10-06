// ============================================================
// DEED AI Hodnotenie — zdieľané typy backendu
// (DEED_AI_Hodnotenie_Backend_DEV.md v1 §3 + Doplnok v1.1)
// ============================================================

/** Tvar scoring-config.json — všetky čísla ladí Martin TU, nie v kóde. */
export interface ScoringConfig {
  _meta: { configVersion: string; [k: string]: unknown };
  changelog: unknown[];
  vzorec: { popis: string; vahaDopad: number; vahaNarocnost: number };
  dopad: {
    pravidlo: string;
    hranica_1_3: string;
    kotvy: Record<"1" | "3" | "6" | "10", { popis: string; priklady: string[] }>;
  };
  narocnost: {
    pravidlo: string;
    naklad_poznamka: string;
    kotvy: Record<"1" | "3" | "6" | "10", { popis: string; priklady: string[] }>;
  };
  nezistnost: { pravidlo: string; zverejnene: number; anonymne: number };
  kredibilita: {
    pravidlo: string;
    sila_dokazu: {
      len_text: number;
      nejasna_fotka: number;
      jasne_fotky: { min: number; max: number; poznamka?: string };
      video_skutku: number;
    };
    faktor_suladu: { default: number; rozpor: number; poznamka?: string };
    qr_organizovana_akcia: { hodnota: number; poznamka?: string };
  };
  pasma: {
    pravidlo: string;
    prah_feed: number;
    prah_2_riadky: number;
    prah_3_riadky: number;
    popis: Record<string, string>;
  };
  api: {
    model: string;
    model_poznamka?: string;
    temperature: number;
    max_tokens: number;
    timeout_ms: number;
    retry: { pocet: number; pauza_ms: number; poznamka?: string };
    denny_strop_volani: number;
    denny_strop_poznamka?: string;
    limit_na_ucet_den: number;
    limit_bez_uctu_den: number;
    limit_poznamka?: string;
  };
  otazky: { max_pocet: number; max_kola: number; ton?: string };
}

export type Verdikt = "ok" | "doplnit" | "zamietnut";
export type Stupen = 1 | 3 | 6 | 10;
export type Pasmo = 0 | 1 | 2 | 3 | 4;

/** Surový JSON, ktorý vracia Opus (SCORING_PROMPT §VÝSTUP). */
export interface OpusVystup {
  verdikt: Verdikt;
  otazky?: string[] | null;
  zamietnutieDovod?: string | null;
  typ?: "OSOB" | "OSOB_D" | "KOM" | "ORGANIZOVANE" | "DAR" | null;
  dopad?: Stupen | null;
  dopadZdovodnenie?: string | null;
  narocnost?: Stupen | null;
  narocnostZdovodnenie?: string | null;
  nezistnost?: number | null;
  kredibilita?: number | null;
  kredibilitaSignaly?: string[] | null;
  krizovyRezim?: boolean | null;
  ucesanyText?: string | null;
  injectionFlag?: boolean | null;
}

/** Jeden dôkaz (fotka) v requeste — base64 bez data-URL prefixu. */
export interface DokazVstup {
  typ: "image/jpeg" | "image/png" | "image/webp";
  dataBase64: string;
  nazov?: string;
}

/** POST /api/score request (spec v1 §3.1 + doplnok §1, §6). */
export interface ScoreRequest {
  opis: string;
  miesto: string;
  dokazy?: DokazVstup[];
  /** user priložil video — do API sa NEposiela, len informácia do promptu (doplnok §1) */
  maVideo?: boolean;
  anonymne: boolean;
  /** Zadanie 5 · 5.3: druhé kolo = runId prvého kola s verdiktom „doplnit"; kolo určí server, nie klient */
  predchRunId?: string;
}

/** POST /api/score response (spec v1 §3.2). */
export interface ScoreResponse {
  verdikt: Verdikt;
  otazky?: string[];
  typ?: string | null;
  dopad?: Stupen | null;
  dopadZdovodnenie?: string | null;
  narocnost?: Stupen | null;
  narocnostZdovodnenie?: string | null;
  nezistnost?: number | null;
  kredibilita?: number | null;
  kredibilitaSignaly?: string[];
  krizovyRezim?: boolean;
  ucesanyText?: string | null;
  skore?: number | null;
  pasmo?: Pasmo | null;
  injectionFlag?: boolean;
  configVersion: string;
  runId: string;
  /** kolo, ktoré určil server (1, alebo 2 po platnom doplnení) */
  kolo: 1 | 2;
  /** true = odpoveď zo simulátora (bez API kľúča) — NIE reálne hodnotenie Opusom */
  mock?: boolean;
}

/** Metadáta dôkazov do logu — NIE base64 (doplnok §4). */
export interface DokazMeta {
  pocet: number;
  typy: string[];
  velkostiB: number[];
  maVideo: boolean;
}

/** Jeden riadok kalibračného logu (doplnok §4 — JSONL ekvivalent v DB). */
export interface LogZaznam {
  runId: string;
  ts: string;
  userId?: string;
  configVersion: string;
  kolo: number;
  verdikt?: Verdikt | null;
  vstup: { opis: string; miesto: string; anonymne: boolean; dokazyMeta: DokazMeta; predchRunId?: string };
  surovyVystup?: unknown;
  dopocitane?: { skore: number; pasmo: Pasmo } | null;
  trvanieMs: number;
  parseError?: boolean;
  injectionFlag?: boolean;
}
