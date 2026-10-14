// ============================================================
// OPRAVY 244 · Rozloženie verejnej stránky farnosti: Nástenka (predvolená) · Kronika (Karta 64) · Moderné (Karta 65).
// Ukladá sa do verejných nastavení stránky (kľúč „rozlozenie“), nie do vzhľadu profilu:
// vzhľad profilu určuje aj farby šablón parte a oznámení a tie sa výberom rozloženia meniť nemajú.
// ============================================================
import { useVerejneNastavenia, verejneZPamate, zapisVerejne } from "./verejneNastavenia";

export type Rozlozenie = "nastenka" | "kronika" | "moderne";
/** KARTA 64: Kronika je hotová */
export const KRONIKA_HOTOVA = true;
/** KARTA 65: Moderné je hotové */
export const MODERNE_HOTOVA = true;
export const ROZLOZENIA: { k: Rozlozenie; t: string; s: string; bg: string; zamknute: boolean }[] = [
  { k: "nastenka", t: "Nástenka", s: "bloky pod sebou", bg: "linear-gradient(160deg,#876712,#14110B)", zamknute: false },
  { k: "kronika", t: "Kronika", s: "profil vľavo · roky a archív", bg: "linear-gradient(160deg,#2F5E3A,#14110B)", zamknute: !KRONIKA_HOTOVA },
  { k: "moderne", t: "Moderné", s: "titulka cez celú šírku · dlaždice", bg: "linear-gradient(160deg,#3D6B8E,#14110B)", zamknute: !MODERNE_HOTOVA },
];
export const rozlozenieZPamate = (stranka: string): Rozlozenie => {
  const v = verejneZPamate(stranka)?.rozlozenie;
  return v === "kronika" && KRONIKA_HOTOVA ? "kronika" : v === "moderne" && MODERNE_HOTOVA ? "moderne" : "nastenka";
};
export function useRozlozenie(stranka: string): Rozlozenie {
  useVerejneNastavenia(stranka);
  return rozlozenieZPamate(stranka);
}
export const nastavRozlozenie = (stranka: string, v: Rozlozenie) => zapisVerejne(stranka, "rozlozenie", v);
