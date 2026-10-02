// ============================================================
// OPRAVY 125 · Diktovanie — JEDNO miesto pre celú appku (lišta textového poľa, richtext.tsx).
// Na iPhone v appke pridanej na plochu (standalone) zamŕzalo celé okno → tam sa tlačidlo neukáže,
// namiesto neho veta o mikrofóne na klávesnici. Inde: try/catch, poistka 8 s s abort(),
// pri vypnutí, zatvorení, odchode zo stránky aj Späť hneď abort(). Naraz beží najviac jedno diktovanie.
// ============================================================
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Rec = {
  lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
};
type RecTrieda = new () => Rec;

export const DIKTOVANIE_POISTKA_MS = 8000;
export const VETA_MIKROFON = "Diktovať môžete mikrofónom na klávesnici.";

/** iPhone / iPad (aj iPadOS, ktorý sa hlási ako Mac) */
const jeIos = () => { try { const n = navigator; return /iPhone|iPad|iPod/.test(n.userAgent) || (n.platform === "MacIntel" && n.maxTouchPoints > 1); } catch { return false; } };
/** appka spustená z plochy (nie v Safari) */
const zPlochy = () => { try { return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches; } catch { return false; } };
const trieda = (): RecTrieda | null => { try { const w = window as unknown as { SpeechRecognition?: RecTrieda; webkitSpeechRecognition?: RecTrieda }; return w.SpeechRecognition || w.webkitSpeechRecognition || null; } catch { return null; } };

/** tlačidlo Diktovať sa ukáže len tam, kde diktovanie v appke bezpečne funguje */
export const diktovanieDostupne = (): boolean => !(jeIos() && zPlochy()) && !!trieda();

// ---- jediné bežiace diktovanie ----
let aktivne: { rec: Rec | null; poistka: number; koniec: () => void; id: number } | null = null;
let verzia = 0, dalsieId = 1;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };

/** okamžite ukončí diktovanie (abort, nie stop — stop na iOS čaká na výsledok a drží okno) */
export function zastavDiktovanie() {
  const a = aktivne; if (!a) return;
  aktivne = null;
  window.clearTimeout(a.poistka);
  try { if (a.rec) { a.rec.onresult = null; a.rec.onend = null; a.rec.onerror = null; a.rec.abort(); } } catch { /* už neexistuje */ }
  try { a.koniec(); } catch { /* volajúci už nežije */ }
  zmena();
}

/** spustí diktovanie; vráti id alebo 0, keď sa nedá */
export function spustiDiktovanie(onText: (t: string) => void, onKoniec: () => void): number {
  zastavDiktovanie();
  if (!diktovanieDostupne()) return 0;
  const R = trieda(); if (!R) return 0;
  const id = dalsieId++;
  try {
    const rec = new R();
    rec.lang = "sk-SK"; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (e) => { try { const t = Array.from(e.results).map((x) => x[0].transcript).join(" ").trim(); if (t) onText(t); } catch { /* zlý výsledok */ } zastavDiktovanie(); };
    rec.onend = () => { if (aktivne?.id === id) zastavDiktovanie(); };
    rec.onerror = () => { if (aktivne?.id === id) zastavDiktovanie(); };
    // poistka: po 8 s sa diktovanie vždy ukončí, nech okno nikdy neostane zamrznuté
    aktivne = { rec, id, koniec: onKoniec, poistka: window.setTimeout(() => { if (aktivne?.id === id) zastavDiktovanie(); }, DIKTOVANIE_POISTKA_MS) };
    zmena();
    rec.start();
    return id;
  } catch {
    zastavDiktovanie();
    return 0;
  }
}

// odchod zo stránky, appka do pozadia, Späť v prehliadači → hneď abort
if (typeof window !== "undefined") {
  const stop = () => zastavDiktovanie();
  window.addEventListener("pagehide", stop);
  window.addEventListener("popstate", stop);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") stop(); });
}

/** pre tlačidlo Diktovať: či počúva práve toto pole, prepnutie, a abort pri zatvorení poľa */
export function useDiktovanie(onText: (t: string) => void) {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  const [moje, setMoje] = useState(0);
  const text = useRef(onText); text.current = onText;
  const mic = moje !== 0 && aktivne?.id === moje;
  const mojeRef = useRef(0); mojeRef.current = moje;
  // pole sa zatvorilo (Späť, Zavrieť, iný krok) → hneď abort
  useEffect(() => () => { if (aktivne && aktivne.id === mojeRef.current) zastavDiktovanie(); }, []);
  const prepni = () => {
    if (mic) { zastavDiktovanie(); return; }
    const id = spustiDiktovanie((t) => text.current(t), () => setMoje(0));
    setMoje(id);
  };
  return { mic, prepni, dostupne: diktovanieDostupne() };
}
