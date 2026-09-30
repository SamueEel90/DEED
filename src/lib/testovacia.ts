// OPRAVY 81 · testovacie prepínače (DEV simulácia rolí a tierov, ukážkové tlačidlá).
// Zapnuté: pri `npm run dev`, na nasadenej verzii s VITE_TEST=1 (Vercel → Environment Variables),
// alebo pridaním ?dev na koniec adresy (ostane zapnuté aj po zavretí, vypne sa cez ?dev=0).
// Pravidlo: testovacie prepínače sa nesmú skryť ani presunúť bez dohody s Martinom.
const KLUC = "deed.dev";
function zAdresy(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.has("dev")) {
      if (q.get("dev") === "0") localStorage.removeItem(KLUC); else localStorage.setItem(KLUC, "1");
    }
    return localStorage.getItem(KLUC) === "1";
  } catch { return false; }
}
export const TESTOVACIA: boolean = import.meta.env.DEV || import.meta.env.VITE_TEST === "1" || zAdresy();
