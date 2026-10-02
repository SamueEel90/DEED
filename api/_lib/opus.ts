// ============================================================
// DEED AI Hodnotenie — volanie Anthropic API (doplnok v1.1 §2)
// Model PINOVANÝ v configu (Frozen Intelligence). Kľúč LEN v env
// ANTHROPIC_API_KEY — nikdy v repe, nikdy vo frontende, nikdy v logu.
// ============================================================
import Anthropic from "@anthropic-ai/sdk";
import type { DokazVstup, OpusVystup, ScoringConfig } from "./typy";
import { NevalidnyVystup, overVystup, vytiahniJson } from "./vypocet";

/** API po retry nedostupné → user dostane „skús o chvíľu“ (doplnok §5). */
export class ApiNedostupne extends Error {}

const pauza = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sampling parametre (temperature/top_p/top_k) sú na Opus 4.7+, Sonnet 5
 * a Fable 5 ODSTRÁNENÉ — request s nimi vráti HTTP 400. Config hodnotu
 * `api.temperature: 0` preto posielame len modelom, ktoré ju ešte berú
 * (Opus ≤4.6, Sonnet ≤4.6, Haiku). Determinizmus na nových modeloch:
 * thinking vypnuté (neposielame) + zamknutý prompt — akceptačné kritérium 1
 * sa overuje opakovanými behmi, tolerancia ±1 platí ďalej.
 */
function modelBerieTemperature(model: string): boolean {
  return !/opus-4-[78]|sonnet-5|fable/.test(model);
}

type UserBlok =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: DokazVstup["typ"]; data: string } };

export interface OpusBeh {
  vystup: OpusVystup;
  surovyText: string;
  /** true = prvý pokus vrátil nevalidný JSON a pomohol až opravný dovetok */
  parseRetry: boolean;
}

/**
 * Zavolá model podľa configu a vráti zvalidovaný JSON výstup.
 * - retry LEN pri sieťovej chybe / timeout / HTTP 529 — `retry.pocet`×, pauza `retry.pauza_ms`
 *   (NIKDY pri platnej obsahovej odpovedi — aj zamietnutie je odpoveď)
 * - nevalidný JSON → 1 opravné volanie s dovetkom „vráť VÝHRADNE platný JSON“
 *   → ak zlé aj potom, vyhodí NevalidnyVystup (handler loguje parseError)
 */
/** OPRAVY 127: časový rozpočet celého hodnotenia (maxDuration 60 s − rezerva na log) a najkratšie zmysluplné volanie */
const ROZPOCET_MS = 50_000;
const MIN_VOLANIE_MS = 8_000;

export async function ohodnotSkutok(
  cfg: ScoringConfig,
  systemPrompt: string,
  userText: string,
  dokazy: DokazVstup[],
): Promise<OpusBeh> {
  const klient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 0, // retry riadime sami podľa configu (doplnok §2)
    timeout: cfg.api.timeout_ms,
  });

  const obsah: UserBlok[] = [
    { type: "text", text: userText },
    ...dokazy.map((d): UserBlok => ({
      type: "image",
      source: { type: "base64", media_type: d.typ, data: d.dataBase64 },
    })),
  ];

  // OPRAVY 127: celé hodnotenie (pokusy + opravné kolo) musí skončiť pred maxDuration funkcie vo vercel.json (60 s),
  // inak Vercel vráti 504 bez JSON a appka ukáže „nepodarilo sa". Rezerva na zápis logu a fotiek.
  const koniec = Date.now() + ROZPOCET_MS;
  const zavolaj = async (spravy: Anthropic.MessageParam[]): Promise<string> => {
    const pokusy = 1 + cfg.api.retry.pocet;
    let poslednaChyba: unknown;
    for (let i = 0; i < pokusy; i++) {
      const zostava = koniec - Date.now();
      if (zostava < MIN_VOLANIE_MS) throw new ApiNedostupne(`čas na hodnotenie vypršal${poslednaChyba ? `: ${String((poslednaChyba as Error).message ?? poslednaChyba)}` : ""}`);
      try {
        const odpoved = await klient.messages.create({
          model: cfg.api.model,
          max_tokens: cfg.api.max_tokens,
          ...(modelBerieTemperature(cfg.api.model) ? { temperature: cfg.api.temperature } : {}),
          system: systemPrompt,
          messages: spravy,
        }, { timeout: Math.min(cfg.api.timeout_ms, zostava) });
        const text = odpoved.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        if (!text.trim()) throw new NevalidnyVystup("model vrátil prázdnu odpoveď");
        return text;
      } catch (e) {
        // retry LEN: sieťová chyba / timeout / 529 overloaded
        const retryovatelne =
          e instanceof Anthropic.APIConnectionError ||
          (e instanceof Anthropic.APIError && (e as { status?: number }).status === 529);
        if (retryovatelne && i < pokusy - 1) {
          poslednaChyba = e;
          await pauza(cfg.api.retry.pauza_ms);
          continue;
        }
        if (retryovatelne) throw new ApiNedostupne(String((e as Error).message ?? poslednaChyba));
        throw e; // 400/401/413... = chyba konfigurácie/vstupu, nie na retry
      }
    }
    throw new ApiNedostupne("vyčerpané pokusy");
  };

  const spravy: Anthropic.MessageParam[] = [{ role: "user", content: obsah }];
  const prvyText = await zavolaj(spravy);

  try {
    return { vystup: overVystup(vytiahniJson(prvyText)), surovyText: prvyText, parseRetry: false };
  } catch (e) {
    if (!(e instanceof NevalidnyVystup) && !(e instanceof SyntaxError)) throw e;
  }

  // 1 opravné kolo: modelu ukážeme jeho výstup + dovetok (doplnok §2)
  const opravneSpravy: Anthropic.MessageParam[] = [
    { role: "user", content: obsah },
    { role: "assistant", content: prvyText },
    { role: "user", content: "Tvoja odpoveď nebola platný JSON podľa schémy. Vráť VÝHRADNE platný JSON — žiadny text pred ani za ním." },
  ];
  const druhyText = await zavolaj(opravneSpravy);
  return { vystup: overVystup(vytiahniJson(druhyText)), surovyText: druhyText, parseRetry: true };
}
