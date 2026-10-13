// ============================================================
// OPRAVY 244 · Rozloženie verejnej stránky farnosti: Nástenka (predvolená) · Kronika (Karta 64) · Moderné (pripravujeme).
// Ukladá sa do verejných nastavení stránky (kľúč „rozlozenie“), nie do vzhľadu profilu:
// vzhľad profilu určuje aj farby šablón parte a oznámení a tie sa výberom rozloženia meniť nemajú.
// ============================================================
import { useVerejneNastavenia, verejneZPamate, zapisVerejne } from "./verejneNastavenia";

export type Rozlozenie = "nastenka" | "kronika" | "moderne";
/** Kronika sa dá vybrať až po Karte 64 */
export const KRONIKA_HOTOVA = false;
export const ROZLOZENIA: { k: Rozlozenie; t: string; s: string; bg: string; zamknute: boolean }[] = [
  { k: "nastenka", t: "Nástenka", s: "bloky pod sebou", bg: "linear-gradient(160deg,#876712,#14110B)", zamknute: false },
  { k: "kronika", t: "Kronika", s: "profil vľavo · roky a archív", bg: "linear-gradient(160deg,#2F5E3A,#14110B)", zamknute: !KRONIKA_HOTOVA },
  { k: "moderne", t: "Moderné", s: "pripravujeme", bg: "linear-gradient(160deg,#3D6B8E,#14110B)", zamknute: true },
];
export const rozlozenieZPamate = (stranka: string): Rozlozenie => {
  const v = verejneZPamate(stranka)?.rozlozenie;
  return v === "kronika" && KRONIKA_HOTOVA ? "kronika" : "nastenka";
};
export function useRozlozenie(stranka: string): Rozlozenie {
  useVerejneNastavenia(stranka);
  return rozlozenieZPamate(stranka);
}
export const nastavRozlozenie = (stranka: string, v: Rozlozenie) => zapisVerejne(stranka, "rozlozenie", v);
