// KARTA 01 · Kostra modulu — jeden komponent <ZbierkaModul>, nastavenie podľa miesta.
// Zdroj: PLATBY-CELOK.md v2.2 (bod 1, 2) + karta 01 + rozhodnutia Martina 28. 9. 2026.
// Nové miesto = nový riadok v POLOZKY, nie nový komponent ani nový vzhľad.

export type Miesto = "charita" | "deed" | "tvorca" | "sukromna" | "podporitDeed";

export const MIESTA: { kluc: Miesto; nazov: string }[] = [
  { kluc: "charita", nazov: "Charita · Viera" },
  { kluc: "deed", nazov: "Help · Good · Aktivity" },
  { kluc: "tvorca", nazov: "Cez tvorcu" },
  { kluc: "sukromna", nazov: "Súkromná" },
  { kluc: "podporitDeed", nazov: "Podporiť DEED+" },
];

export type Hodnota = boolean | string;
export type Polozky = {
  poleZodpoveda: Hodnota; kamIdeDar: Hodnota; kartaStavu: Hodnota; milniky: Hodnota; tempo: Hodnota;
  dorovnanie: Hodnota; zdielat: Hodnota; rychleSumy: Hodnota; vlastnaEur: Hodnota; krypto: Hodnota;
  pravidelna: Hodnota; oblubene: Hodnota; zapojitFirmu: Hodnota; retazNastavit: Hodnota; darcovia: Hodnota;
};
export type Kluc = keyof Polozky;

// true = pripojené, false = odpojené. Poradie kľúčov = poradie na obrazovke.
export const POLOZKY: Record<Miesto, Polozky> = {
  charita:      { poleZodpoveda: "Za zbierku zodpovedá", kamIdeDar: false, kartaStavu: "cela", milniky: true, tempo: "auto", dorovnanie: true, zdielat: true, rychleSumy: "eur", vlastnaEur: true, krypto: true, pravidelna: true, oblubene: true, zapojitFirmu: true, retazNastavit: true, darcovia: "vsetci" },
  deed:         { poleZodpoveda: false, kamIdeDar: false, kartaStavu: "cela", milniky: true, tempo: "auto", dorovnanie: false, zdielat: true, rychleSumy: "deed", vlastnaEur: false, krypto: false, pravidelna: false, oblubene: true, zapojitFirmu: false, retazNastavit: true, darcovia: "vsetci" },
  tvorca:       { poleZodpoveda: "Za zbierku zodpovedá", kamIdeDar: true, kartaStavu: "tvorca", milniky: true, tempo: "vzdy", dorovnanie: true, zdielat: true, rychleSumy: "eur", vlastnaEur: true, krypto: true, pravidelna: false, oblubene: true, zapojitFirmu: false, retazNastavit: false, darcovia: "tvorca" },
  sukromna:     { poleZodpoveda: "Zbierku overil", kamIdeDar: "lenSplit", kartaStavu: "cela", milniky: true, tempo: false, dorovnanie: false, zdielat: true, rychleSumy: "eur", vlastnaEur: true, krypto: true, pravidelna: false, oblubene: true, zapojitFirmu: false, retazNastavit: false, darcovia: "vsetci" },
  podporitDeed: { poleZodpoveda: false, kamIdeDar: false, kartaStavu: false, milniky: false, tempo: false, dorovnanie: false, zdielat: false, rychleSumy: "podporitDeed", vlastnaEur: true, krypto: false, pravidelna: false, oblubene: false, zapojitFirmu: false, retazNastavit: false, darcovia: false },
};

export const NAZVY: Record<Kluc, string> = {
  poleZodpoveda: "Pole zodpovedá / overil", kamIdeDar: "Kam ide tvoj dar", kartaStavu: "Karta stavu", milniky: "Míľniky",
  tempo: "Tempo darov", dorovnanie: "Dorovnanie firmy", zdielat: "Zdieľať · QR + páči sa mi", rychleSumy: "Rýchle sumy",
  vlastnaEur: "Vlastná suma v €", krypto: "Dary v krypte", pravidelna: "Pravidelná podpora", oblubene: "Obľúbené + Podporiť DEED+",
  zapojitFirmu: "Zapojiť firmu do dorovnania", retazNastavit: "Reťaz dobra · nastaviť", darcovia: "Darcovia",
};

// Hranice platieb (Martin 28. 9. 2026): pod 1 € len krypto · 1 € až pod 3 € len SEPA · od 3 € aj karta.
export const MIN_DAR_EUR = 1;
export const KARTA_OD_EUR = 3;

/** stav používateľa a zbierky, ktorý filtruje tabuľku */
export type Kontext = {
  registrovany: boolean;
  ico: boolean;            // user s IČO (firma, organizácia, živnostník)
  maCiel: boolean;
  dorovnanieAktivne: boolean; // na zbierke beží dorovnanie a platí pre tohto darcu
  split: boolean;          // súkromnú zbierku tvorca splitol
  tempoSilna: boolean;     // tempo dosiahlo aspoň Silnú (výpočet zatiaľ nie je — len vzhľad)
};

/** Pripojené položky v poradí obrazovky, už prefiltrované podľa kontextu. Odpojené tu vôbec nie sú. */
export function pripojene(miesto: Miesto, k: Kontext): { kluc: Kluc; hodnota: Hodnota }[] {
  const p: Polozky = { ...POLOZKY[miesto] };

  // súkromná so splitom sa správa ako tvorca, len bez tempa
  if (miesto === "sukromna") {
    if (k.split) { p.kamIdeDar = true; p.kartaStavu = "tvorca"; p.darcovia = "tvorca"; }
    else p.kamIdeDar = false;
  }
  // míľniky len pri zbierke bez cieľa
  if (k.maCiel) p.milniky = false;
  // tempo „auto" sa ukáže, až keď zbierka prejde na Silnú
  if (p.tempo === "auto" && !k.tempoSilna) p.tempo = false;
  // dorovnanie len keď beží a platí pre darcu
  if (!k.dorovnanieAktivne) p.dorovnanie = false;
  // reťaz dobra sa nedá nastaviť na zbierke, ktorú už niekto dorovnáva (opačne sa nič neblokuje)
  if (k.dorovnanieAktivne) p.retazNastavit = false;
  // krypto (EURC/DEED) a vlastná suma v krypte len registrovaný
  if (!k.registrovany) p.krypto = false;
  // neregistrovaný na mieste DEED: namiesto DEED dlaždíc eurá (Drobné 1 · 3 · 5 €) + vlastná suma v €
  if (!k.registrovany && p.rychleSumy === "deed") { p.rychleSumy = "eurDrobne"; p.vlastnaEur = true; }
  // „Zapojiť firmu" len user s IČO
  if (!k.ico) p.zapojitFirmu = false;

  return (Object.keys(p) as Kluc[]).filter((x) => p[x] !== false).map((x) => ({ kluc: x, hodnota: p[x] }));
}
