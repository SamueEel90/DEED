// ============================================================
// DEED · ZBIERKY — jeden zoznam, jedna pravda.
// Zbierka žije TU. Feed, adresár aj profily entít z nej len čítajú,
// takže názov, fotka aj suma sú všade rovnaké a klik vedie na to isté.
// Položka na profile nesie ID zbierky, nikdy vlastnú kópiu textu.
// ============================================================

export type ZbierkaStav = "aktivna" | "ukoncena";

/** Žiadateľ = kto zbiera. Kto pýta peniaze, má verejný profil — vždy sa dá overiť. */
export interface Ziadatel {
  meno: string;
  typ: "osoba" | "org";
  overeny: boolean;
  /** štít hlavnej karmy — Bronze…Legend */
  level: string;
  lok: string;
  foto: string;
  /** krátko o sebe — 2–3 vety */
  onas: string;
  /** tri čísla ako na každom profile */
  vyzbierane: string;
  skutky: string;
  snami: string;
}

export interface Zbierka {
  id: string;
  /** názov zbierky — jediný zdroj pre kartu, feed aj profil */
  nazov: string;
  /** komu peniaze idú (príjemca), nie kto zbiera */
  komu: string;
  popis: string;
  /** úvodná fotka — tá istá v zbierke aj na profile entity */
  foto: string;
  emoji: string;
  ciel: number;
  vyzbierane: number;
  darcovia: number;
  lok: string;
  stav: ZbierkaStav;
  ziadatel: Ziadatel;
  /** krypto dary podľa voľby príjemcu pri registrácii: charita a Viera → EURC,
   *  všetci ostatní → DEED, „nie" = krypto neprijíma (sekcia sa neukáže) */
  krypto?: Krypto;
  /** dôkaz pomoci po ukončení — fotky pred/po a doklady, za čo išli peniaze */
  dokaz?: Dokaz;
}

/** Dôkaz, že sme pomohli: fotky (pred/po) a doklady s sumami. */
export interface Doklad { druh: "Faktúra" | "Bloček" | "Výpis"; nazov: string; dodavatel: string; cislo: string; datum: string; suma: number }
export interface Dokaz { text: string; fotky: { src: string; popis: string }[]; doklady: Doklad[] }

export type Krypto = "EURC" | "DEED" | "nie";
/** predvoľba, kým nemáme registráciu: organizácia (charita) EURC, osoba DEED */
export const kryptoZbierky = (z: Zbierka): Krypto => z.krypto ?? (z.ziadatel.typ === "org" ? "EURC" : "DEED");

const AV = (n: number) => `https://i.pravatar.cc/200?img=${n}`;

const U = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=70&auto=format&fit=crop`;

export const ZBIERKY: Zbierka[] = [
  {
    id: "z-kovacova",
    nazov: "Rodina Kováčová — strecha po požiari",
    komu: "Rodina Kováčová",
    popis: "V noci nám zhorel dom, ostali sme bez strechy s dvomi deťmi. Potrebujeme pomoc.",
    foto: U("photo-1518709766631-a6a7f45921c3"),
    emoji: "🔥",
    ciel: 2200, vyzbierane: 0, darcovia: 0,
    lok: "Trenčín · Zámostie", stav: "aktivna",
    ziadatel: { meno: "Rodina Kováčová", typ: "osoba", overeny: true, level: "Silver", lok: "Trenčín · Zámostie", foto: AV(45), onas: "Mama dvoch detí, pracuje v miestnej škôlke. Dom vyhorel v noci 3. septembra, rodina býva dočasne u príbuzných.", vyzbierane: "1 430 €", skutky: "9", snami: "2 roky" },
  },
  {
    id: "z-motylik",
    nazov: "Motýlik — rehabilitácia pre Sárku",
    komu: "OZ Motýlik",
    popis: "Pravidelná rehabilitácia pre Sárku. Každý mesiac, celý rok.",
    foto: U("photo-1559027615-cd4628902d4a"),
    emoji: "⭐",
    ciel: 4800, vyzbierane: 0, darcovia: 0,
    lok: "Trenčín", stav: "aktivna",
    ziadatel: { meno: "OZ Motýlik", typ: "org", overeny: true, level: "Gold", lok: "Trenčín", foto: U("photo-1488521787991-ed7bbaae773c"), onas: "Pomáhame rodinám detí so zdravotným znevýhodnením. Rehabilitácie, pomôcky, sprevádzanie.", vyzbierane: "31 200 €", skutky: "71", snami: "3 roky" },
  },
  {
    id: "z-hospic",
    nazov: "Polohovacie lôžka pre paliatívne oddelenie",
    komu: "Hospic Pod Brezinou",
    popis: "Staré lôžka dosluhujú. Zbierame na šesť polohovacích pre paliatívne oddelenie.",
    foto: U("photo-1586773860418-d37222d8fce3"),
    emoji: "🕊",
    ciel: 6000, vyzbierane: 2380, darcovia: 133,
    lok: "Trenčín · centrum", stav: "aktivna",
    ziadatel: { meno: "Hospic Pod Brezinou", typ: "org", overeny: true, level: "Gold", lok: "Trenčín · centrum", foto: U("photo-1576765608535-5f04d1e3f289"), onas: "Paliatívna starostlivosť pre ľudí na konci života a podpora ich rodín.", vyzbierane: "64 300 €", skutky: "176", snami: "5 rokov" },
  },
  {
    id: "z-labka",
    nazov: "Krmivo a deky pre útulok na zimu",
    komu: "OZ Túlavá labka",
    popis: "Krmivo a deky pre 40 psov a mačiek na zimu. Pomôže aj materiálny dar.",
    foto: U("photo-1450778869180-41d0601e046e"),
    emoji: "🐾",
    ciel: 1200, vyzbierane: 0, darcovia: 0,
    lok: "Trenčín · okraj", stav: "aktivna",
    ziadatel: { meno: "OZ Túlavá labka", typ: "org", overeny: true, level: "Silver", lok: "Trenčín · okraj", foto: U("photo-1543466835-00a7907e9de1"), onas: "Útulok pre opustené psy a mačky. Kastrácie, adopcie, dočasky.", vyzbierane: "6 850 €", skutky: "31", snami: "2 roky" },
  },
  {
    id: "z-hospic-auto",
    nazov: "Auto pre mobilný hospic",
    komu: "Svetlo pomoci o.z.",
    popis: "Sestry chodia za pacientmi domov. Bez auta to nejde.",
    foto: U("photo-1494976388531-d1058494cdd8"),
    emoji: "🚗",
    ciel: 12000, vyzbierane: 0, darcovia: 0,
    lok: "Trenčianský kraj", stav: "aktivna",
    ziadatel: { meno: "Svetlo pomoci o.z.", typ: "org", overeny: true, level: "Gold", lok: "Trenčín", foto: U("photo-1518199266791-5375a83190b7"), onas: "Pomáhame rodinám v núdzi v Trenčianskom kraji. Každé euro dokladujeme.", vyzbierane: "24 600 €", skutky: "48", snami: "3 roky" },
  },
  {
    id: "z-noclaharen",
    nazov: "Zimná nocľaháreň — vybavenie",
    komu: "OZ Otvorené dvere Trenčín",
    popis: "Postele, deky a práčka do zimnej nocľahárne.",
    foto: U("photo-1528747045269-390fe33c19f2"),
    emoji: "🛏",
    ciel: 4000, vyzbierane: 4000, darcovia: 178,
    lok: "Trenčín · centrum", stav: "ukoncena",
    ziadatel: { meno: "OZ Otvorené dvere Trenčín", typ: "org", overeny: true, level: "Silver", lok: "Trenčín · centrum", foto: U("photo-1509099836639-18ba1795216d"), onas: "Nízkoprahová jedáleň a zimná nocľaháreň pre ľudí bez domova.", vyzbierane: "18 400 €", skutky: "64", snami: "4 roky" },
  },
  {
    id: "z-anna",
    nazov: "Práčka a chladnička pre pani Annu (81)",
    komu: "pani Anna, Trenčín · Sihoť",
    popis: "Pani Anna žije sama, práčka aj chladnička jej dosluhujú. Nové spotrebiče jej kúpime a dovezieme.",
    foto: U("photo-1581578731548-c64695cc6952"),
    emoji: "🧺",
    ciel: 900, vyzbierane: 0, darcovia: 0,
    lok: "Trenčín · Sihoť", stav: "aktivna",
    ziadatel: { meno: "Svetlo pomoci o.z.", typ: "org", overeny: true, level: "Gold", lok: "Trenčín", foto: U("photo-1518199266791-5375a83190b7"), onas: "Pomáhame rodinám v núdzi v Trenčianskom kraji. Každé euro dokladujeme.", vyzbierane: "24 600 €", skutky: "48", snami: "3 roky" },
  },
  {
    id: "z-horvathova",
    nazov: "Strecha pre rodinu Horváthovú",
    komu: "Rodina Horváthová, Nemšová",
    popis: "Po búrke zatekalo do detskej izby. Strecha je hotová, faktúry sú priložené.",
    foto: U("photo-1632759145351-1d592919f522"),
    emoji: "🏠",
    ciel: 3500, vyzbierane: 3500, darcovia: 142,
    lok: "Nemšová", stav: "ukoncena",
    dokaz: {
      text: "Strecha je hotová od 14. 6. Rodina býva v suchu, detská izba je znova obývateľná.",
      fotky: [
        { src: U("photo-1632759145351-1d592919f522"), popis: "PRED" },
        { src: U("photo-1635424710928-0544e8512eae"), popis: "PO" },
      ],
      doklady: [
        { druh: "Faktúra", nazov: "Strešná krytina a materiál", dodavatel: "Stavebniny Váh s.r.o.", cislo: "FA 2026/0412", datum: "2. 6. 2026", suma: 2180 },
        { druh: "Faktúra", nazov: "Práca pokrývača", dodavatel: "Pokrývačstvo Kubík", cislo: "FA 118/2026", datum: "14. 6. 2026", suma: 1320 },
      ],
    },
    ziadatel: { meno: "Svetlo pomoci o.z.", typ: "org", overeny: true, level: "Gold", lok: "Trenčín", foto: U("photo-1518199266791-5375a83190b7"), onas: "Pomáhame rodinám v núdzi v Trenčianskom kraji. Každé euro dokladujeme.", vyzbierane: "24 600 €", skutky: "48", snami: "3 roky" },
  },
  {
    id: "z-skola",
    nazov: "Školské potreby pre troch súrodencov",
    komu: "Súrodenci Baloghovci, Dubnica",
    popis: "Mama je na troch deťoch sama. Taška, zošity a prezuvky pre všetkých troch do septembra.",
    foto: U("photo-1503676260728-1c00da094a0b"),
    emoji: "🎒",
    ciel: 450, vyzbierane: 0, darcovia: 0,
    lok: "Dubnica nad Váhom", stav: "aktivna",
    ziadatel: { meno: "Svetlo pomoci o.z.", typ: "org", overeny: true, level: "Gold", lok: "Trenčín", foto: U("photo-1518199266791-5375a83190b7"), onas: "Pomáhame rodinám v núdzi v Trenčianskom kraji. Každé euro dokladujeme.", vyzbierane: "24 600 €", skutky: "48", snami: "3 roky" },
  },
  {
    id: "z-potraviny",
    nazov: "Potravinové balíčky na zimu",
    komu: "12 rodín v núdzi, Trenčiansky kraj",
    popis: "Trvanlivé potraviny a hygiena pre dvanásť rodín, ktoré sme v zime prevzali do starostlivosti.",
    foto: U("photo-1488521787991-ed7bbaae773c"),
    emoji: "📦",
    ciel: 1800, vyzbierane: 0, darcovia: 0,
    lok: "Trenčiansky kraj", stav: "aktivna",
    ziadatel: { meno: "Svetlo pomoci o.z.", typ: "org", overeny: true, level: "Gold", lok: "Trenčín", foto: U("photo-1518199266791-5375a83190b7"), onas: "Pomáhame rodinám v núdzi v Trenčianskom kraji. Každé euro dokladujeme.", vyzbierane: "24 600 €", skutky: "48", snami: "3 roky" },
  },
];

/** dolná hranica splitu tvorcu — pod 5 % sa reťaz nastaviť nedá. Hore strop nie je. */
export const SPLIT_MIN = 5;

export const najdiZbierku = (id: string): Zbierka | undefined => ZBIERKY.find((z) => z.id === id);

/** Odkaz na zbierku z profilu entity. Text sa neduplikuje — ťahá sa zo ZBIERKY.
 *  `split` = percento, ktoré tvorca posiela zo svojho honoráru do tejto zbierky. */
export interface OdkazNaZbierku {
  zbierkaId: string;
  /** čo o tom hovorí profil entity — napr. „500 € · overená podpora" */
  poznamka?: string;
  /** tvorca: jeho fixné % do tejto zbierky. Dole hranica 5 %, hore žiadny strop —
   *  bežne 50 aj 70 %, pokojne aj celý honorár. Zdieľanie sa odmeňuje. */
  split?: number;
}

/** DEED QR odznak zbierky: D+ = zbiera pre seba · D++ = zbiera pre niekoho iného
 *  (napr. charita pre pani Annu). Neznáma zbierka → D+. */
export function odznakZbierky(id?: string | null): "D+" | "D++" {
  const z = id ? ZBIERKY.find((x) => x.id === id) : undefined;
  return z && z.komu.trim() !== z.ziadatel.meno.trim() ? "D++" : "D+";
}
