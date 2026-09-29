// Hlášky po dare — vyberá sa JEDNA, prvá, ktorá platí. Bez výkričníkov, len reálne dáta.
export type Zbierka = { vyzbierane: number; ciel?: number | null; pocetDarov: number; darovDnes: number; odkazPrijemcu?: { text: string; od: string } | null };
export type Dar = { eur: number; dorovnanie: number; registrovany: boolean };

const eur = (n: number) => Math.round(n).toLocaleString('sk-SK') + ' €';
const HRANICE = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

export function hlaskaPoDare(z: Zbierka, d: Dar): string {
  const R = d.registrovany, pred = z.vyzbierane, po = pred + d.eur + d.dorovnanie, G = z.ciel ?? null;
  if (z.pocetDarov === 0) return R ? 'Si prvý. Niekto musel začať.' : 'Tento dar zbierku otvoril.';
  if (G && po >= G) return R ? 'Zbierka je plná. Dotiahol si ju ty.' : 'Týmto darom je zbierka plná.';
  if (G && pred < G / 2 && po >= G / 2) return R ? 'Tvojím darom zbierka prešla polovicu.' : 'Týmto darom zbierka prešla polovicu.';
  const h = HRANICE.filter((t) => pred < t && po >= t).pop();
  if (h) return R ? `S tebou zbierka prekročila ${eur(h)}.` : `Zbierka práve prekročila ${eur(h)}.`;
  if (z.darovDnes === 0) return R ? 'Dnes si prvý.' : 'Dnešný prvý dar.';
  const n = z.darovDnes + 1;
  if (n % 10 === 0) return R ? `Dnes si ${n}. v rade.` : `Dnes je to ${n}. dar.`;
  if (z.odkazPrijemcu) return `„${z.odkazPrijemcu.text}“ — ${z.odkazPrijemcu.od}`;
  // bez cieľa NIKDY „chýba“, „polovica“, „plná“ ani percentá
  return G ? `Do cieľa chýba ${eur(G - po)}.` : `Spolu už ${eur(po)} od ${z.pocetDarov + 1} ľudí.`;
}

// Neregistrovaný: pod hláškou vždy jedna ponuka (nikdy neblokuje)
export const PONUKA_REGISTRACIE = { titul: 'Chceš, aby sa ti tento dar pripísal?', text: 'Zaregistruj sa a tento dar sa ti pripíše. V zozname potom môže byť tvoje meno a pribudne ti karma.', tlacidlo: 'Zaregistrovať sa' };

// Pravidelná podpora
export const hlaskaPravidelna = (prvy: boolean, reg: boolean, pocet: number, centralna: boolean) => {
  const obj = centralna ? 'organizáciu' : 'túto zbierku', Obj = centralna ? 'Organizáciu' : 'Túto zbierku';
  if (prvy) return reg ? `Si prvý, kto ${obj} podporuje pravidelne.` : `Toto je prvý pravidelný dar pre ${obj}.`;
  return reg ? `S tebou ${obj} pravidelne podporuje ${pocet} ľudí.` : `${Obj} teraz pravidelne podporuje ${pocet} ľudí.`;
};

// Firma — vykanie / množné číslo. Mix: vážne pri peniazoch, humor pri míľnikoch.
export const HLASKY_FIRMA = {
  zapecatene: 'Zapečatené. Podmienky sa už nedajú zmeniť, ani vami, ani nami.',
  spustene: (zbierka: string) => `Dorovnanie pre ${zbierka} je aktívne.`,
  prveDorovnanie: 'Prvých 20 € je vonku. Účtovníčka zatiaľ dýcha pokojne.',
  polovica: 'Polovica je preč. Tak rýchlo sa nemíňa ani vianočný bonus.',
  vycerpane: (suma: number, darov: number) => `Rozpočet je vyčerpaný. Dorovnali ste ${eur(suma)} v ${darov} daroch.`,
  koniec: 'Koniec. Zvyšok ostal tam, kde je ho treba najviac.',
  podakovanie: 'Ďakujeme v mene rodiny, ktorej pomáhate.',
  podakovanieSepa: 'Ďakujeme, že sa pridávate.',
};

// Skloňovanie: 1 človek pomohol · 2–4 ľudia pomohli · 5+ ľudí pomohlo
export const ludiaPomohli = (n: number) => n === 1 ? '1 človek pomohol' : n >= 2 && n <= 4 ? `${n} ľudia pomohli` : `${n} ľudí pomohlo`;

// Dorovnanie: strop na jeden dar zadá firma (pole), najviac 300 €
export const dorovnanie = (dar: number, pomer: number, stropFirmy: number, zostatokRozpoctu: number) =>
  Math.max(0, Math.min(dar * pomer, Math.min(300, stropFirmy), zostatokRozpoctu));

// Zoznam darcov: suma do 2 € sa NIKDY nezobrazí — ani riadok firmy (prezradil by ju)
export const zobrazSumu = (eurDar: number, darcaChce: boolean) => darcaChce && eurDar > 2;

// ===== Vety pri štíte (karta 18 bod 2.3) — len pre vlastníka, striedajú sa raz za deň.
// Prvých 14 dní na novom štíte len 1. veta; posledná jemne láka na ďalší stupeň (Legenda bez lákania).
export type StitKluc = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Legend';
export const STIT_VETY: Record<StitKluc, string[]> = {
  Bronze: ['Tvoj prvý štít. Dobrý začiatok.', 'Skutky sa počítajú, aj tie malé.', 'Striebro už nie je ďaleko.'],
  Silver: ['Striebro sa len tak nedostane.', 'Ľudia okolo teba to cítia.', 'Zlato sa blyští inak.'],
  Gold: ['Tento štít nemá hocikto. Si dobrý človek.', 'Zlatý ti pristane.', 'Ale tá Platina má iný lesk.'],
  Platinum: ['Platina. To je už iná liga.', 'Takých ľudí je málo.', 'Legendy sa rodia zo skutkov.'],
  Legend: ['Legenda. Viac nie je čo dodať.', 'Ďakujeme, že si.'],
};
/** profil firmy (vykanie) */
export const STIT_VETY_FIRMA: Record<StitKluc, string[]> = {
  Bronze: ['Prvý štít vašej firmy. Dobrý začiatok.', 'Každý skutok vašich ľudí sa počíta.', 'Striebro už nie je ďaleko.'],
  Silver: ['Striebro sa len tak nedostane.', 'Vaše okolie to cíti.', 'Zlato sa blyští inak.'],
  Gold: ['Tento štít nemá hocijaká firma. Za ním sú skutky vašich ľudí.', 'Zlatý vám pristane.', 'Ale tá Platina má iný lesk.'],
  Platinum: ['Platina. To je už iná liga.', 'Takých firiem je málo.', 'Legendy sa rodia zo skutkov.'],
  Legend: ['Legenda. Viac nie je čo dodať.', 'Ďakujeme, že ste.'],
};
/** veta na dnešný deň: dniNaStite < 14 → vždy 1. veta, inak sa strieda podľa dňa */
export function vetaStitu(stit: StitKluc, dniNaStite: number, firma = false, dnes = new Date()): string {
  const vety = (firma ? STIT_VETY_FIRMA : STIT_VETY)[stit];
  if (dniNaStite < 14) return vety[0];
  const den = Math.floor((dnes.getTime() - dnes.getTimezoneOffset() * 60000) / 86400000);
  return vety[den % vety.length];
}
