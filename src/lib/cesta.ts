// CESTA SPÄŤ (karta 03) — zásobník krokov v rámci JEDNÉHO modulu.
// · feed → zbierka → stránka charity → iná zbierka → …; Späť ide o krok, Krížik zavrie celú cestu.
// · Každý krok má vlastný kľúč obrazovky → useScrollPamat(kluc) mu pamätá scroll,
//   takže Späť vráti presne na miesto (aj vo feede, kde si vstúpil).
// · Rozbalené časti (pole charity, „… viac", darcovia…) sa ukladajú do `stav` kroku.
// · Platobné kroky sa do cesty NEzapisujú (platba je hárok nad stránkou).
// · Cesta žije v module → prepnutie modulu ju zruší (modul sa odmontuje).
import { useCallback, useRef, useState } from "react";

export type StavKroku = Record<string, unknown>;
export type Krok<T> = { id: number; nazov: string; data: T; stav: StavKroku };

export function useCesta<T>() {
  const [kroky, setKroky] = useState<Krok<T>[]>([]);
  const seq = useRef(0);
  const otvor = useCallback((nazov: string, data: T) => setKroky((k) => [...k, { id: ++seq.current, nazov, data, stav: {} }]), []);
  const spat = useCallback(() => setKroky((k) => k.slice(0, -1)), []);
  const zavri = useCallback(() => setKroky([]), []);
  const ulozStav = useCallback((id: number, zmena: StavKroku) =>
    setKroky((k) => k.map((x) => (x.id === id ? { ...x, stav: { ...x.stav, ...zmena } } : x))), []);
  const aktualny = kroky.length ? kroky[kroky.length - 1] : null;
  const predosly = kroky.length > 1 ? kroky[kroky.length - 2] : null;
  return {
    kroky, aktualny, predosly, otvor, spat, zavri, ulozStav,
    /** kľúč obrazovky pre useScrollPamat / ScreenSwitch */
    kluc: aktualny ? `cesta-${aktualny.id}` : null,
  };
}
