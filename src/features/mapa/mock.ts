// Demo dáta pre Modul Mapa (§15) — placeholdery, nie reálne dotazy do DB
import type { MapaBod } from "@/types";

// Fallback body na mape (bez DB) — reálne polohy v Trenčíne, aby mapa nebola
// prázdna ani v mock režime. So Supabase ich nahradia živé body (mapa.supabase).
export const MAPA_UDALOSTI: MapaBod[] = [
  { lat: 48.8945, lng: 18.0445, druh: "udalost" },
  { lat: 48.8930, lng: 18.0490, druh: "udalost" },
  { lat: 48.9002, lng: 18.0381, druh: "udalost" },
  { lat: 48.8862, lng: 18.0533, druh: "udalost" },
  { lat: 48.8770, lng: 18.0300, druh: "udalost" },
  { lat: 48.9010, lng: 18.0390, druh: "udalost" },
];

export const UROVNE: [string, string][] = [
  ["stvrt", "Štvrť"],
  ["mesto", "Mesto"],
  ["okres", "Okres"],
  ["kraj", "Kraj"],
  ["krajina", "Krajina"],
];

// demo počty v okruhu — rastú s rádiusom (placeholder, nie reálny dotaz do DB).
// Škálované na reálne počty obyvateľstva: Trenčín ~55 tis., okres ~110 tis.,
// kraj (TSK) ~580 tis., SR ~5,4 mil. — pri rastúcej aktivnej komunite DEED.
export const POCTY_KM: Record<number, [number, number]> = {
  1: [64, 11],
  2: [150, 26],
  3: [290, 44],
  4: [470, 70],
  5: [640, 96],
};

export const POCTY_UROVEN: Record<string, [number, number]> = {
  mesto: [1850, 260],
  okres: [6400, 820],
  kraj: [15200, 1900],
  krajina: [52000, 6100],
};
