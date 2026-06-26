// Demo dáta pre Modul Mapa (§15) — placeholdery, nie reálne dotazy do DB

export const UROVNE: [string, string][] = [
  ["stvrt", "Štvrť"],
  ["mesto", "Mesto"],
  ["okres", "Okres"],
  ["kraj", "Kraj"],
  ["krajina", "Krajina"],
];

// demo počty v okruhu — rastú s rádiusom (placeholder, nie reálny dotaz do DB)
export const POCTY_KM: Record<number, [number, number]> = {
  1: [58, 9],
  2: [142, 23],
  3: [260, 38],
  4: [410, 60],
  5: [560, 82],
};

export const POCTY_UROVEN: Record<string, [number, number]> = {
  mesto: [1480, 210],
  okres: [5200, 640],
  kraj: [12800, 1500],
  krajina: [48000, 5200],
};
