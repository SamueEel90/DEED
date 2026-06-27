// Demo dáta pre Modul Mapa (§15) — placeholdery, nie reálne dotazy do DB

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
