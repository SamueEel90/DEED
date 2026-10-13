// ============================================================
// Martin 13. 10. (Blok A) — sumy pri darcoch v zbierkach farnosti zapína a vypína farár pri zbierke
// („Ukázať sumy pri darcoch: Áno · Nie“). Hlavná, zvončeková aj Ďalšie zbierky. Predvolené Nie.
// Aj pri Áno sa dary pod 2 € ukážu bez sumy (len meno). Súkromné zbierky (pohreb, svadba, rodina, človek) nikdy.
// Úložisko: verejné nastavenia stránky (0070b), kľúč „sumyDarcov“ = { hlavna, zvoncek, <id zbierky> }.
// ============================================================
import { useVerejneNastavenia, verejneZPamate, zapisVerejne } from "./verejneNastavenia";

const mapa = (stranka: string) => ((verejneZPamate(stranka)?.sumyDarcov ?? {}) as Record<string, boolean>);
/** kľúč zbierky farnosti: „hlavna“, „zvoncek“ (všetky zvončekové okná) alebo id spustenej zbierky */
export function useSumyDarcov(stranka: string | undefined, kluc: string | null): boolean {
  useVerejneNastavenia(stranka);
  return !!stranka && !!kluc && mapa(stranka)[kluc] === true;
}
export function nastavSumyDarcov(stranka: string, kluc: string, ano: boolean): Promise<void> {
  return zapisVerejne(stranka, "sumyDarcov", { ...mapa(stranka), [kluc]: ano });
}
