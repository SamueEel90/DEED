// ============================================================
// DEED · Aktívna lokalita (mesto) — jeden zdroj pravdy pre stred feedu/mapy.
// Nahrádza statické USER_LOK: feedy/mapa čítajú aktívne mesto cez useLokalita()
// a pri prepnutí mesta sa prerátajú okolo neho. Perzistuje v localStorage.
// Žiadne GPS — kurátorský zoznam SK miest so súradnicami (stred mesta).
// ============================================================
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface Mesto {
  nazov: string;
  lat: number;
  lng: number;
  kraj: string;
}

// Kurátorský zoznam najväčších SK miest (stred mesta, lat/lng). Trenčín = default.
export const MESTA: Mesto[] = [
  { nazov: "Trenčín", lat: 48.8945, lng: 18.0447, kraj: "Trenčiansky" },
  { nazov: "Bratislava", lat: 48.1486, lng: 17.1077, kraj: "Bratislavský" },
  { nazov: "Košice", lat: 48.7164, lng: 21.2611, kraj: "Košický" },
  { nazov: "Prešov", lat: 48.9984, lng: 21.2339, kraj: "Prešovský" },
  { nazov: "Žilina", lat: 49.2231, lng: 18.7394, kraj: "Žilinský" },
  { nazov: "Nitra", lat: 48.3061, lng: 18.0764, kraj: "Nitriansky" },
  { nazov: "Banská Bystrica", lat: 48.7395, lng: 19.1535, kraj: "Banskobystrický" },
  { nazov: "Trnava", lat: 48.3774, lng: 17.5883, kraj: "Trnavský" },
  { nazov: "Martin", lat: 49.0664, lng: 18.9216, kraj: "Žilinský" },
  { nazov: "Poprad", lat: 49.0594, lng: 20.2975, kraj: "Prešovský" },
  { nazov: "Prievidza", lat: 48.7747, lng: 18.6286, kraj: "Trenčiansky" },
  { nazov: "Zvolen", lat: 48.5746, lng: 19.1256, kraj: "Banskobystrický" },
  { nazov: "Považská Bystrica", lat: 49.1199, lng: 18.4256, kraj: "Trenčiansky" },
  { nazov: "Nové Zámky", lat: 47.9856, lng: 18.1612, kraj: "Nitriansky" },
  { nazov: "Michalovce", lat: 48.7544, lng: 21.9193, kraj: "Košický" },
  { nazov: "Spišská Nová Ves", lat: 48.9446, lng: 20.5639, kraj: "Košický" },
  { nazov: "Komárno", lat: 47.7625, lng: 18.1296, kraj: "Nitriansky" },
  { nazov: "Levice", lat: 48.2169, lng: 18.6066, kraj: "Nitriansky" },
  { nazov: "Humenné", lat: 48.9286, lng: 21.9078, kraj: "Prešovský" },
  { nazov: "Liptovský Mikuláš", lat: 49.0809, lng: 19.6116, kraj: "Žilinský" },
  { nazov: "Ružomberok", lat: 49.0786, lng: 19.3045, kraj: "Žilinský" },
  { nazov: "Piešťany", lat: 48.5919, lng: 17.8265, kraj: "Trnavský" },
  { nazov: "Lučenec", lat: 48.3315, lng: 19.6675, kraj: "Banskobystrický" },
  { nazov: "Topoľčany", lat: 48.5605, lng: 18.1773, kraj: "Nitriansky" },
  { nazov: "Trebišov", lat: 48.6299, lng: 21.7197, kraj: "Košický" },
  { nazov: "Dubnica nad Váhom", lat: 48.9596, lng: 18.1656, kraj: "Trenčiansky" },
  { nazov: "Senica", lat: 48.6803, lng: 17.3666, kraj: "Trnavský" },
  { nazov: "Bardejov", lat: 49.2948, lng: 21.2756, kraj: "Prešovský" },
];

const DEFAULT = MESTA[0]; // Trenčín
const KEY = "deed:mesto";

// jednoduché hľadanie (bez diakritiky, case-insensitive)
const bezDiakritiky = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function hladajMesta(q: string): Mesto[] {
  const x = bezDiakritiky(q.trim());
  if (!x) return MESTA;
  return MESTA.filter((m) => bezDiakritiky(m.nazov).includes(x) || bezDiakritiky(m.kraj).includes(x));
}

export interface LokalitaStav {
  mesto: string;
  lat: number;
  lng: number;
  kraj: string;
  nastavMesto: (nazov: string) => void;
}

const Ctx = createContext<LokalitaStav>({
  mesto: DEFAULT.nazov, lat: DEFAULT.lat, lng: DEFAULT.lng, kraj: DEFAULT.kraj, nastavMesto: () => {},
});

export const useLokalita = () => useContext(Ctx);

export function LokalitaProvider({ children }: { children: ReactNode }) {
  const [nazov, setNazov] = useState<string>(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v && MESTA.some((m) => m.nazov === v)) return v;
    } catch { /* SSR / private mode */ }
    return DEFAULT.nazov;
  });

  const nastavMesto = useCallback((meno: string) => {
    if (!MESTA.some((m) => m.nazov === meno)) return;
    setNazov(meno);
    try { localStorage.setItem(KEY, meno); } catch { /* ignore */ }
  }, []);

  const m = MESTA.find((x) => x.nazov === nazov) || DEFAULT;
  const value = useMemo<LokalitaStav>(
    () => ({ mesto: m.nazov, lat: m.lat, lng: m.lng, kraj: m.kraj, nastavMesto }),
    [m, nastavMesto]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
