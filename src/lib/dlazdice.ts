// OPRAVY 62 · dlaždice profilu — poradie, skryté a rozbalené sekcie. Ukladá sa k účtu (zatiaľ lokálne, server neskôr);
// menu profilu na PC/tablete ide v rovnakom poradí. Nastavenia sa skryť nedajú. Rozbalené sekcie vidí len vlastník.
import { useSyncExternalStore } from "react";

export type DlazdicaId = "wallet" | "nastavenia" | "skutky" | "priatelia" | "karma" | "stat" | "firma" | "zaujmy" | "sukromne";
export const POVODNE: DlazdicaId[] = ["wallet", "nastavenia", "skutky", "priatelia", "karma", "stat", "firma", "zaujmy", "sukromne"];
/** dlaždice, ktoré majú sekciu na rozbalenie pod mriežkou (hodnota = kľúč prekladu) */
export const MA_ROZBALENIE: Partial<Record<DlazdicaId, string>> = {
  zaujmy: "dlazdice.rozb.zaujmy", stat: "dlazdice.rozb.stat", wallet: "dlazdice.rozb.wallet",
};
export type NastavenieDlazdic = { poradie: DlazdicaId[]; skryte: DlazdicaId[]; rozbalene: DlazdicaId[] };
const ZAKLAD: NastavenieDlazdic = { poradie: POVODNE, skryte: [], rozbalene: ["zaujmy"] };
const KLUC = "deed.profil.dlazdice";
const posl = new Set<() => void>();
let ver = 0;

export function nacitajDlazdice(): NastavenieDlazdic {
  try {
    const s = JSON.parse(localStorage.getItem(KLUC) ?? "null") as NastavenieDlazdic | null;
    if (!s) return ZAKLAD;
    // nové dlaždice z ďalšej verzie sa pridajú na koniec
    const poradie = [...s.poradie.filter((x) => POVODNE.includes(x)), ...POVODNE.filter((x) => !s.poradie.includes(x))];
    return { poradie, skryte: s.skryte.filter((x) => x !== "nastavenia"), rozbalene: s.rozbalene };
  } catch { return ZAKLAD; }
}
export function ulozDlazdice(n: NastavenieDlazdic) {
  try { localStorage.setItem(KLUC, JSON.stringify(n)); } catch { /* LS */ }
  ver++; posl.forEach((f) => f());
}
export const obnovPovodne = () => { try { localStorage.removeItem(KLUC); } catch { /* LS */ } ver++; posl.forEach((f) => f()); };
export function useDlazdice(): NastavenieDlazdic {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  return nacitajDlazdice();
}
