// ============================================================
// ZDROJ DÁT PRE POČÍTADLO DO STREAMU
//
// Počítadlo beží v OBS, čo je CUDZÍ prehliadač — nevidí nič, čo má appka
// v pamäti ani v localStorage tohto prehliadača. Preto má tri zdroje
// a berie prvý, ktorý niečo vráti:
//
//   1. ?demo=1   — stránka si dary vymýšľa sama (na odskúšanie vzhľadu v OBS)
//   2. snímka v localStorage (deed.overlay.<splitId>) — funguje v tom istom
//      prehliadači, čiže náhľad priamo v appke
//   3. server    — overlay_stav (0085b): appka tvorcu sem pri každej zmene zapíše snímku,
//                  OBS ju číta bez prihlásenia (polling stránky Overlay). Len verejné polia.
//
// Poradie: demo → server → snímka v tomto prehliadači.
// ============================================================

export interface StavOverlay {
  /** aktuálna zbierka (pri kaskáde sa po naplnení sama prepne na ďalšiu) */
  nazov: string;
  vyzbierane: number;
  ciel: number;
  /** posledný dar cez tohto tvorcu — v podobe, ktorú si darca sám zvolil */
  poslednyDarca?: string;
  poslednaSuma?: number;
  /** rastie pri každom novom dare — podľa toho sa spúšťa zvýraznenie */
  pecat: number;
  /** čas posledného ÚSPEŠNÉHO načítania — podľa neho svieti bodka „naživo".
   *  Bez neho by sa výpadok nedal odlíšiť od zbierky, do ktorej nikto nedal. */
  naposledy: number;
}

import { vymazMilniky } from "./Overlay";
import { supabase } from "@/lib/supabase";

export const KLUC_OVERLAY = (splitId: string) => `deed.overlay.${splitId}`;

/** Appka si sem odkladá snímku pre náhľad (a neskôr aj pre offline stav). */
export function zapisStavOverlay(splitId: string, stav: Omit<StavOverlay, "pecat" | "naposledy">): void {
  try {
    const teraz = Date.now();
    localStorage.setItem(KLUC_OVERLAY(splitId), JSON.stringify({ ...stav, pecat: teraz, naposledy: teraz }));
  } catch { /* LS nedostupné */ }
  void doServera(splitId, stav);
}

/** snímka na server (0085b) — len prihlásený tvorca; OBS ju potom vidí z akéhokoľvek prehliadača */
async function doServera(splitId: string, stav: Omit<StavOverlay, "pecat" | "naposledy">) {
  if (!supabase || !(await supabase.auth.getSession()).data.session) return;
  const verejne = { nazov: stav.nazov, vyzbierane: stav.vyzbierane, ciel: stav.ciel, poslednyDarca: stav.poslednyDarca ?? null, poslednaSuma: stav.poslednaSuma ?? null, pecat: Date.now() };
  const { error } = await supabase.from("overlay_stav").upsert({ split_id: splitId, stav: verejne }, { onConflict: "split_id" });
  if (error) console.warn("Počítadlo do streamu ostalo len v tomto prehliadači", error.message);
}

function zoSnimky(splitId: string): StavOverlay | null {
  try {
    const s = localStorage.getItem(KLUC_OVERLAY(splitId));
    if (!s) return null;
    const v = JSON.parse(s) as StavOverlay;
    // snímku sme práve úspešne prečítali → spojenie žije
    return { ...v, naposledy: Date.now() };
  } catch { return null; }
}

/** posledná snímka zo servera (overlay_stav, číta aj anon). Pri výpadku null → snímka z tohto prehliadača. */
async function zoServera(splitId: string): Promise<StavOverlay | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("overlay_stav").select("stav").eq("split_id", splitId).maybeSingle();
  if (error || !data) return null;
  const v = data.stav as { nazov: string; vyzbierane: number; ciel: number; poslednyDarca?: string | null; poslednaSuma?: number | null; pecat?: number };
  return {
    nazov: v.nazov, vyzbierane: Number(v.vyzbierane) || 0, ciel: Number(v.ciel) || 0,
    ...(v.poslednyDarca ? { poslednyDarca: v.poslednyDarca } : {}), ...(v.poslednaSuma != null ? { poslednaSuma: Number(v.poslednaSuma) } : {}),
    pecat: v.pecat ?? 0, naposledy: Date.now(),
  };
}

// ---- demo: stránka sa kŕmi sama, aby sa dal vzhľad odskúšať priamo v OBS ----
const DEMO_MENA = [
  "Jana K.", "Anonymný darca", "Peter Baláž, Trenčín", "zuzka", "Anonym",
  "Mária U.", "tomi_h", "Ondrej V., Snina",
];
let demoStav: StavOverlay | null = null;
/** dokedy demo po splnení cieľa stojí, aby oslava dohrala (ms) */
const DEMO_OSLAVA_MS = 7_500;
let demoOslavaOd = 0;

const demoZaciatok = (): StavOverlay => ({
  nazov: "Školské potreby pre troch súrodencov", vyzbierane: 1240, ciel: 3000,
  pecat: Date.now(), naposledy: Date.now(),
});

function demo(splitId: string): StavOverlay {
  const teraz = Date.now();
  if (!demoStav) { demoStav = demoZaciatok(); return demoStav; }

  // cieľ je splnený — necháme dohrať oslavu, potom začneme odznova
  if (demoOslavaOd) {
    if (teraz - demoOslavaOd < DEMO_OSLAVA_MS) return { ...demoStav, naposledy: teraz };
    demoOslavaOd = 0;
    vymazMilniky(splitId, demoStav.nazov);
    demoStav = { nazov: "Krmivo a deky na zimu", vyzbierane: 0, ciel: 1800, pecat: teraz, naposledy: teraz };
    vymazMilniky(splitId, demoStav.nazov);
    return demoStav;
  }

  const suma = [2, 5, 5, 10, 10, 20, 50][Math.floor(Math.random() * 7)];
  demoStav = {
    ...demoStav,
    vyzbierane: demoStav.vyzbierane + suma,
    poslednyDarca: DEMO_MENA[Math.floor(Math.random() * DEMO_MENA.length)],
    poslednaSuma: suma,
    pecat: teraz,
    naposledy: teraz,
  };
  if (demoStav.vyzbierane >= demoStav.ciel) demoOslavaOd = teraz;
  return demoStav;
}

/** Jedno načítanie stavu. `jeDemo` rozhoduje, či sa dáta vymýšľajú. */
export async function nacitajStav(splitId: string, jeDemo: boolean): Promise<StavOverlay | null> {
  if (jeDemo) return demo(splitId);
  if (splitId.startsWith("rt-")) return (await zRetaze(splitId)) ?? zoSnimky(splitId);
  return (await zoServera(splitId)) ?? zoSnimky(splitId);
}

/** balík 43 (501) · reťaz dobra (rt-…): stav priamo zo servera (retaz_stav, retaz_darcovia — čítajú aj bez prihlásenia),
 *  appka toho, kto reťazí, nemusí byť otvorená. Suma = koľko zbierka dostala cez reťaz (ako „Vyzbierané cez reťaz …“ vo verzii). */
async function zRetaze(id: string): Promise<StavOverlay | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("retaz_stav", { p_retaz: id });
  if (error || !data) return null;
  const r = data as { polozky?: { zbierka: string; nazov: string; stav: string; poslane: number; ciel: number | null }[] };
  const p = (r.polozky ?? []).find((x) => x.stav === "bezi");
  if (!p) return null; // nič nebeží → ostáva posledný stav
  const d = await supabase.rpc("retaz_darcovia", { p_retaz: id, p_zbierka: p.zbierka, p_limit: 1 });
  const dd = (d.data ?? {}) as { pocet?: number; dary?: { meno: string | null; suma: number }[] };
  const posl = dd.dary?.[0];
  return {
    nazov: p.nazov, vyzbierane: Number(p.poslane) || 0, ciel: Number(p.ciel) || Math.max(1, Number(p.poslane) || 0), // zbierka bez cieľa: pás plný, číslo platí
    ...(posl ? { poslednyDarca: posl.meno || "Anonymný darca", poslednaSuma: Number(posl.suma) } : {}),
    pecat: Number(dd.pocet) || 0, naposledy: Date.now(),
  };
}
