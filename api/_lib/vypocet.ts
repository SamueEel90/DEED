// ============================================================
// DEED AI Hodnotenie — validácia výstupu Opusa + dopočet skóre a pásma
// Opus skóre NIKDY nepočíta — jedna pravda = scoring-config.json
// (SCORING_PROMPT poznámka 5, spec v1 §3.2).
// ============================================================
import type { OpusVystup, Pasmo, ScoringConfig, Stupen } from "./typy";

const STUPNE: Stupen[] = [1, 3, 6, 10];

export class NevalidnyVystup extends Error {}

/**
 * Skontroluje surový JSON od modelu. Vyhodí NevalidnyVystup pri zlom tvare —
 * volajúci to rieši ako parseError (1 retry, potom chyba usera).
 */
export function overVystup(raw: unknown): OpusVystup {
  if (typeof raw !== "object" || raw === null) throw new NevalidnyVystup("výstup nie je objekt");
  const v = raw as Record<string, unknown>;

  if (v.verdikt !== "ok" && v.verdikt !== "doplnit" && v.verdikt !== "zamietnut") {
    throw new NevalidnyVystup(`neznámy verdikt: ${String(v.verdikt)}`);
  }

  if (v.verdikt === "ok") {
    if (!STUPNE.includes(v.dopad as Stupen)) throw new NevalidnyVystup(`dopad mimo kotiev: ${String(v.dopad)}`);
    if (!STUPNE.includes(v.narocnost as Stupen)) throw new NevalidnyVystup(`narocnost mimo kotiev: ${String(v.narocnost)}`);
    if (typeof v.nezistnost !== "number" || v.nezistnost <= 0) throw new NevalidnyVystup("nezistnost nie je kladné číslo");
    if (typeof v.kredibilita !== "number" || v.kredibilita <= 0 || v.kredibilita > 1) {
      throw new NevalidnyVystup(`kredibilita mimo (0,1]: ${String(v.kredibilita)}`);
    }
    if (typeof v.ucesanyText !== "string" || !v.ucesanyText.trim()) throw new NevalidnyVystup("chýba ucesanyText");
  }
  if (v.verdikt === "doplnit" && (!Array.isArray(v.otazky) || v.otazky.length === 0)) {
    throw new NevalidnyVystup("verdikt doplnit bez otázok");
  }

  return v as unknown as OpusVystup;
}

/**
 * Skóre = (Dopad × vahaDopad + Náročnosť × vahaNarocnost) × Nezištnosť × Kredibilita.
 * Pásmo 0–3 zo skóre; pásmo 4 LEN z krizovyRezim (NIKDY zo skóre) — config.pasma.
 */
export function dopocitaj(v: OpusVystup, cfg: ScoringConfig): { skore: number; pasmo: Pasmo } {
  const skoreRaw =
    ((v.dopad as number) * cfg.vzorec.vahaDopad + (v.narocnost as number) * cfg.vzorec.vahaNarocnost) *
    (v.nezistnost as number) *
    (v.kredibilita as number);
  const skore = Math.round(skoreRaw * 100) / 100;

  let pasmo: Pasmo;
  if (v.krizovyRezim === true) pasmo = 4;
  else if (skore < cfg.pasma.prah_feed) pasmo = 0;
  else if (skore < cfg.pasma.prah_2_riadky) pasmo = 1;
  else if (skore < cfg.pasma.prah_3_riadky) pasmo = 2;
  else pasmo = 3;

  return { skore, pasmo };
}

/**
 * Vytiahne JSON z textu modelu: strip ```json fence-ov, orezanie na prvý { .. posledný }.
 * (Doplnok §2 — parsovanie.)
 */
export function vytiahniJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const zac = t.indexOf("{");
  const kon = t.lastIndexOf("}");
  if (zac === -1 || kon === -1 || kon <= zac) throw new NevalidnyVystup("v odpovedi nie je JSON objekt");
  return JSON.parse(t.slice(zac, kon + 1));
}
