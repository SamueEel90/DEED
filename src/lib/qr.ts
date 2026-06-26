// ============================================================
// QR SYSTÉM (§10) — utility bez Reactu
// deterministický pattern z reťazca (vyzerá QR-ovo; rovnaký odkaz = rovnaký vzor)
// ============================================================

export function qrHash(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function qrPrng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// finder (rohové štvorce) klasického QR — 7×7 v troch rohoch mriežky N×N
export function qrFinder(r: number, c: number, N: number): "dark" | "light" | null {
  const rohy = [[0, 0], [0, N - 7], [N - 7, 0]];
  for (const [or, oc] of rohy) {
    const rr = r - or, cc = c - oc;
    if (rr >= 0 && rr < 7 && cc >= 0 && cc < 7) {
      const ramik = rr === 0 || rr === 6 || cc === 0 || cc === 6;
      const jadro = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
      return ramik || jadro ? "dark" : "light";
    }
  }
  return null;
}

export const QR_TYPY: Record<string, { rot: number; tag: string; popis: string; col: string }> = {
  identita: { rot: 30, tag: "Identity Card", popis: "Overenie identity člena — rotujúci kód", col: "#8B7CFF" },
  platba:   { rot: 0,  tag: "Platobný QR",   popis: "Pošli DEED / prepitné — statický kód",  col: "#43E0C8" },
  akcia:    { rot: 15, tag: "Akčný QR",      popis: "Overenie účasti (proof-of-presence)",    col: "#F0A85E" },
  skutok:   { rot: 0,  tag: "QR skutku",     popis: "Odkaz na skutok / reťaz dobra",          col: "#5BA8F0" },
};
