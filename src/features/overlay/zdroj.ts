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
//   3. server    — JEDINÉ miesto, kde to bude naozaj živé; zatiaľ nie je
//
// Až bude backend, dopĺňa sa to na jednom mieste: `zoServera` nižšie.
// Nič iné v tomto priečinku sa meniť nemusí.
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

export const KLUC_OVERLAY = (splitId: string) => `deed.overlay.${splitId}`;

/** Appka si sem odkladá snímku pre náhľad (a neskôr aj pre offline stav). */
export function zapisStavOverlay(splitId: string, stav: Omit<StavOverlay, "pecat" | "naposledy">): void {
  try {
    const teraz = Date.now();
    localStorage.setItem(KLUC_OVERLAY(splitId), JSON.stringify({ ...stav, pecat: teraz, naposledy: teraz }));
  } catch { /* LS nedostupné */ }
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

/** TODO(backend): Supabase Realtime na tabuľke darov, filter na aktuálnu zbierku
 *  tohto splitu; čítať cez view/RPC, ktoré vracia LEN verejné polia
 *  (suma, cieľ, názov, zobrazované meno posledného darcu). Žiadny zápis.
 *  Záloha: polling každých 10 s. Pri výpadku ostáva posledný stav. */
async function zoServera(_splitId: string): Promise<StavOverlay | null> {
  return null;
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
  return (await zoServera(splitId)) ?? zoSnimky(splitId);
}
