// KARTA 43 — spoločné testovacie dáta pre tri verejné profily (charita · firma · tvorca).
// Jediný zdroj pre všetky tri návrhy: Kronika (charita), Výklad (firma), Pirát (tvorca).
// Každý profil má presne: 1 centrálnu zbierku + 3 sektory + 7 zbierok + 7 skutkov + 4 oznamy + 2 ponuky práce.
// Každá položka má mesto (Trenčín · Prešov · Bratislava), profil sa otvára v meste človeka.
// Nič z toho nejde do DB — je to test „aký vznikne chaos", v produkcii dáta prídu zo servera.
import { U } from "@/theme";
import type { StitUroven } from "@/features/zbierka/Pole";

export type Mesto = "Trenčín" | "Prešov" | "Bratislava";
export const MESTA: Mesto[] = ["Trenčín", "Prešov", "Bratislava"];
/** lokalita hore na profile: mesto človeka alebo celé Slovensko */
export type Lokalita = Mesto | "Celé Slovensko";
export const LOKALITY: Lokalita[] = [...MESTA, "Celé Slovensko"];

export type TypProfilu = "charita" | "firma" | "tvorca";

/** dlaždica centrálnej zbierky alebo sektora — texty sú podľa mesta človeka */
export interface TestSektor {
  id: string;
  nazov: string;
  druh: "centralna" | "sektor";
  foto: string;
  vyzbierane: number;
  darcovia: number;
  /** čo sa ukáže na dlaždici a po zväčšení */
  mesta: Record<Mesto, {
    /** jeden riadok na dlaždici, napr. „Prešov: obedy pre 20" */
    dlazdica: string;
    /** na čo išli peniaze minulý mesiac v tomto meste */
    minulyMesiac: string;
    /** „Uvidíš …" — čo darca dostane späť */
    uvidis: string;
    /** rozpis minulého mesiaca: [na čo, percentá] */
    rozpis: [string, number][];
  }>;
  /** OPRAVY 139 (Kronika v6): dlaždica „X € tento mesiac", veta pod Reťazou dobra ({m} = mesto),
   *  tipy na pravidelný dar (suma / mes. + čo za ňu) a počet ľudí, ktorí podporujú mesačne — zadá charita v Správe */
  mesiac?: number;
  kam?: string;
  tipy?: [number, string][];
  mesacne?: number;
}

export interface TestZbierka {
  id: string;
  nazov: string;
  popis: string;
  mesto: Mesto;
  cast?: string;              // mestská časť pod mestom
  foto: string;
  vyzbierane: number;
  ciel?: number;              // bez cieľa → dlhodobá
  ludia: number;
  stav: "bezi" | "dlhodoba" | "ukoncena";
  konciDni?: number;          // „Končí o 9 dní"
  dorovnanie?: string;        // veta o dorovnaní firmy
  doklady?: number;           // ukončená a doložená
  spravaDarcom?: string;      // „Splnili sme" — citát pre darcov
  skoncila?: string;          // dátum ukončenia
  zodpoveda?: string;         // tvorca: charita, ktorá za zbierku zodpovedá
  /** KARTA 45 · dlhý príbeh zbierky (na profile 6 riadkov + „Čítať celý príbeh ›") */
  pribeh?: string;
  /** ukončená zbierka v kronike: „22." · „SEP" · 2026 */
  d?: string; m?: string; rok?: number;
}

export interface TestSkutok {
  id: string;
  nazov: string;
  popis: string;
  mesto: Mesto;
  kedy: string;               // „Včera", „29. 9."
  foto: string;
  dobrovolnici?: number;
  /** dátum v kronike: „29." · „SEP" · 2026 */
  d?: string; m?: string; rok?: number;
}

export interface TestOznam {
  id: string;
  druh: "vyzva" | "akcia" | "oznam";
  nadpis: string;             // „Hľadáme deky do nocľahárne"
  stitok: string;             // „VÝZVA NA SÚRNU POMOC" · „AKCIA · SOBOTA 10:00"
  text: string;               // kde a kedy
  mesto: Mesto;
  den: string;                // „8."
  mesiac: string;             // „OKT"
  tlacidlo: string;           // „Prihlásiť sa"
  pod: string;                // „23 ľudí už pomáha"
}

export interface TestPraca {
  id: string;
  nazov: string;
  druh: "brigadnik" | "zamestnanec";
  text: string;
  mesto: Mesto;
  den: string;
  mesiac: string;
  pod: string;                // „prihlásiť sa do 15. 10."
  /** KARTA 45 · plagát „Hľadáme ľudí": štítok druhu, opis, Kde / Kedy / Odmena, počet záujemcov */
  stitok?: string;            // „BRIGÁDA" · „POLOVIČNÝ ÚVÄZOK"
  opis?: string;
  kde?: string;
  kedy?: string;
  odmena?: string;
  zaujem?: string;            // „3 ľudia už majú záujem"
}

export interface TestDarca {
  id: string;
  meno: string;               // „Mária V." · „Anonymný darca"
  iniciala: string;
  mesto: Mesto;
  naCo: string;
  suma?: number;              // bez sumy = darca ju nezverejnil
  pred: string;               // „pred 2 h"
}

/** ďalší záznam kroniky (história pred testovacími položkami) */
export interface KronikaPolozka {
  id: string;
  typ: "zb" | "sk" | "is" | "oz";
  d: string; m: string; rok: number;
  mesto: Mesto;
  nazov: string;
  s: string;                  // „380 € · od 27 darcov" · „prvá etapa · 9 dobrovoľníkov"
  q?: string;                 // SPLNILI SME — správa darcom (doložená zbierka)
  dok?: string;               // „6 DOKLADOV" alebo stav „SPRÁVA DARCOM DO 22. 10."
  foto: string;
}
/** súhrn roka v kronike */
export interface KronikaRok { rok: number; nZaz: number; sum: [string, string][] }

export interface TestProfil {
  k: string;
  typ: TypProfilu;
  meno: string;
  iniciala: string;
  veta: string;
  mesto: Mesto;               // sídlo
  stit: StitUroven;
  odRoku: number;
  stitky: string[];           // „Trenčín" · „od 2023" · „Overená organizácia · IČO"
  ico: string;
  ucet: string;
  sidlo: string;
  kontakt: string;
  cisla: [string, string][];  // [hodnota, popis] — od začiatku
  stitCisla: [string, string][]; // okno štítu: 99 % doložené · skutky · sledujúci
  centralna: TestSektor;
  sektory: TestSektor[];      // presne 3
  zbierky: TestZbierka[];     // presne 7
  skutky: TestSkutok[];       // presne 7
  oznamy: TestOznam[];        // presne 4
  praca: TestPraca[];         // presne 2
  darcovia: TestDarca[];
  /** titulná fotka profilu */
  titulka: string;
  /** 2. pád mena („Všetky Iskry Svetla pomoci") */
  menoGen?: string;
  /** 3. pád mena („Darovať Svetlu pomoci") */
  menoDat?: string;
  /** „Podporiť …" v module (4. pád, ak sa líši od mena) */
  podporit?: string;
  /** O nás (návrh v2): nadpis, text a oblasti */
  onas?: { nadpis: string; text: string; oblasti: string[] };
  /** pás dorovnania pod Naživo (firma, ktorá dar zdvojnásobí) */
  dorovnaniePas?: { ini: string; nadpis: string; text: string };
  /** kronika: súhrny rokov a záznamy z minulosti (k skutkom a ukončeným zbierkam s dátumom) */
  roky?: KronikaRok[];
  kronika?: KronikaPolozka[];
}

// ---- fotky (tie isté ukážkové ako inde v appke) ----
const F = {
  poziar: U("photo-1486946255434-2466348c2166"),
  vozik: U("photo-1559839734-2b71ea197ec2"),
  strecha: U("photo-1632759145351-1d592919f522"),
  ucenie: U("photo-1509228468518-180dd4864904"),
  polievka: U("photo-1628428799437-d886d7d2e9b2"),
  bundy: U("photo-1513151233558-d860c5398176"),
  ovocie: U("photo-1490818387583-1baba5e638af"),
  jedlo: U("photo-1593113598332-cd288d649433"),
  seniori: U("photo-1603129473525-4cd6f36fe057"),
  dobrovolnici: U("photo-1416879595882-3373a0480b5b"),
  tasky: U("photo-1503676260728-1c00da094a0b"),
  vianoce: U("photo-1512389142860-9c449e58a543"),
  pecivo: U("photo-1578985545062-69928b1d9587"),
  pekaren: U("photo-1509440159596-0249088772ff"),
  sport: U("photo-1517649763962-0c623066013b"),
  komunita: U("photo-1529156069898-49953e39b3ac"),
  koncert: U("photo-1511671782779-c97d3d27a1d4"),
  husle: U("photo-1465821185615-20b3c2fbf41b"),
  zvierata: U("photo-1450778869180-41d0601e046e"),
  nemocnica: U("photo-1576091160399-112ba8d25d1d"),
  bezdomovci: U("photo-1516585427167-9f4af9627e6c"),
};

const sektor = (
  id: string, nazov: string, druh: "centralna" | "sektor", foto: string,
  vyzbierane: number, darcovia: number,
  mesta: Record<Mesto, { dlazdica: string; minulyMesiac: string; uvidis: string; rozpis: [string, number][] }>,
  v6?: Pick<TestSektor, "mesiac" | "kam" | "tipy" | "mesacne">,
): TestSektor => ({ id, nazov, druh, foto, vyzbierane, darcovia, mesta, ...v6 });

// ============================================================
// 1 · CHARITA — Svetlo pomoci o.z. (sídlo Trenčín)
// ============================================================
const CHARITA: TestProfil = {
  k: "svetlo", typ: "charita", meno: "Svetlo pomoci o.z.", iniciala: "SP", menoGen: "Svetla pomoci", menoDat: "Svetlu pomoci",
  veta: "Varíme, opravujeme, sprevádzame. Rodiny, seniori a ľudia bez domova v Trenčíne, Prešove a Bratislave.",
  mesto: "Trenčín", stit: "Gold", odRoku: 2023,
  stitky: ["Trenčín", "od 2023", "Overená organizácia · IČO"],
  ico: "12 345 678", ucet: "SK12 0900 0000 0051 2345 4521",
  sidlo: "Mierové nám. 1, Trenčín", kontakt: "info@svetlopomoci.sk",
  cisla: [["42 550 €", "vyzbierané"], ["15", "zbierok"], ["108", "skutkov"]],
  stitCisla: [["99 %", "doložené"], ["108", "skutkov"], ["1 204", "sledujúcich"]],
  centralna: sektor("c-svetlo", "Celá činnosť", "centralna", F.jedlo, 24600, 214, {
    "Trenčín": { dlazdica: "Trenčín: 940 € v septembri", minulyMesiac: "V Trenčíne v septembri: 520 € jedlo · 280 € opravy · 140 € doprava", uvidis: "Uvidíš rozpis každý mesiac", rozpis: [["jedlo", 55], ["opravy", 30], ["doprava", 15]] },
    "Prešov": { dlazdica: "Prešov: 680 € v septembri", minulyMesiac: "V Prešove v septembri: 410 € jedlo · 180 € opravy · 90 € doprava", uvidis: "Uvidíš rozpis každý mesiac", rozpis: [["jedlo", 62], ["opravy", 25], ["doprava", 13]] },
    "Bratislava": { dlazdica: "Bratislava: 1 120 € v septembri", minulyMesiac: "V Bratislave v septembri: 600 € jedlo · 320 € oblečenie · 200 € doprava", uvidis: "Uvidíš rozpis každý mesiac", rozpis: [["jedlo", 54], ["oblečenie", 28], ["doprava", 18]] },
  }, { mesiac: 3120, mesacne: 143, kam: "Kam treba najviac. Minulý mesiac v {m}: 1 200 teplých jedál, 2 opravy striech, 40 diek do nocľahárne.", tipy: [[5, "2 teplé obedy každý týždeň"], [10, "nákup pre seniora"], [20, "noc v teple 4× do mesiaca"]] }),
  sektory: [
    sektor("s-seniori", "Seniori", "sektor", F.seniori, 8400, 96, {
      "Trenčín": { dlazdica: "Trenčín: nákup pre 12", minulyMesiac: "V Trenčíne sme každý piatok nakúpili 12 seniorom zo Sihote.", uvidis: "Uvidíš mená ulíc a počet seniorov", rozpis: [["nákupy", 70], ["doprava", 30]] },
      "Prešov": { dlazdica: "Prešov: obedy pre 20", minulyMesiac: "V Prešove sme rozviezli obed 20 seniorom zo Sekčova, každý deň.", uvidis: "Uvidíš, koľko obedov sme rozviezli", rozpis: [["jedlo", 75], ["doprava", 25]] },
      "Bratislava": { dlazdica: "Bratislava: 8 seniorov", minulyMesiac: "V Bratislave sme sprevádzali 8 seniorov k lekárovi.", uvidis: "Uvidíš, kam sme seniorov odviezli", rozpis: [["doprava", 60], ["lieky", 40]] },
    }, { mesiac: 1480, mesacne: 61, kam: "Nákupy, lieky a obedy pre seniorov. Minulý mesiac v {m}: 312 obedov a 48 nákupov pre 22 seniorov.", tipy: [[5, "obed pre seniora každý týždeň"], [10, "lieky na mesiac"], [20, "2 nákupy domov"]] }),
    sektor("s-deti", "Deti", "sektor", F.bundy, 6100, 142, {
      "Trenčín": { dlazdica: "Trenčín: 14 detí", minulyMesiac: "V Trenčíne chodí 14 detí na doučovanie dvakrát týždenne.", uvidis: "Uvidíš, koľko detí doučujeme", rozpis: [["doučovanie", 65], ["pomôcky", 35]] },
      "Prešov": { dlazdica: "Prešov: 9 detí", minulyMesiac: "V Prešove sme doučovali 9 detí z Tábora.", uvidis: "Uvidíš, koľko detí doučujeme", rozpis: [["doučovanie", 60], ["pomôcky", 40]] },
      "Bratislava": { dlazdica: "Bratislava: 31 tašiek", minulyMesiac: "V Bratislave dostalo 31 detí školskú tašku s pomôckami.", uvidis: "Uvidíš fotky z rozdávania", rozpis: [["pomôcky", 80], ["doprava", 20]] },
    }, { mesiac: 940, mesacne: 38, kam: "Doučovanie, školské potreby a krúžky. Minulý mesiac v {m}: 31 tašiek a 64 hodín doučovania.", tipy: [[5, "zošity a perá na mesiac"], [10, "4 hodiny doučovania"], [20, "krúžok na mesiac"]] }),
    sektor("s-bezdomovci", "Ľudia bez domova", "sektor", F.bezdomovci, 9800, 203, {
      "Trenčín": { dlazdica: "Trenčín: 120 obedov denne", minulyMesiac: "V Trenčíne sme vydali 120 teplých obedov denne na Mierovom námestí.", uvidis: "Uvidíš, koľko porcií sme vydali", rozpis: [["jedlo", 70], ["hygiena", 20], ["deky", 10]] },
      "Prešov": { dlazdica: "Prešov: 40 ľudí", minulyMesiac: "V Prešove prišlo po polievku na Hlavnú 40 ľudí denne.", uvidis: "Uvidíš, koľko ľudí prišlo", rozpis: [["jedlo", 75], ["hygiena", 25]] },
      "Bratislava": { dlazdica: "Bratislava: nová výdajňa", minulyMesiac: "V Bratislave sme otvorili výdajňu a vydali prvých 600 porcií.", uvidis: "Uvidíš, ako výdajňa funguje", rozpis: [["jedlo", 60], ["vybavenie", 40]] },
    }, { mesiac: 1210, mesacne: 54, kam: "Nocľaháreň, polievka a sprchy. Minulý mesiac v {m}: 620 nocí pod strechou a 900 polievok.", tipy: [[5, "10 teplých polievok"], [10, "2 noci v nocľahárni"], [20, "sprcha a čisté veci 8×"]] }),
  ],
  zbierky: [
    { id: "z-strecha-horvath", nazov: "Strecha pre rodinu Horváthovú", popis: "V noci im zhorela strecha nad hlavou. Dve deti, babka a zima pred dverami. Prvú etapu sme už opravili, chýba krytina.", mesto: "Trenčín", cast: "Zlatovce", foto: F.poziar, vyzbierane: 8420, ciel: 12000, ludia: 148, stav: "bezi", konciDni: 9, dorovnanie: "Pekáreň Dobrota pridá k daru rovnakú sumu",
      pribeh: "V noci z 2. na 3. októbra im od komína chytila strecha. Pani Horváthová stihla vyniesť deti, Tomáša (7) a Emu (4), aj babku, ktorá chodí o barle. Hasiči dom zachránili, strecha nie. Rodina teraz spí u susedov v jednej izbe. Prvú etapu sme už spravili: dobrovoľníci z Opatovej odpratali zhorené trámy a pokrývač Jozef zadarmo postavil nový krov. Chýba krytina, laty a odkvapy, spolu 3 580 €. Ak ich vyzbierame do 13. októbra, Horváthovci budú spať doma ešte pred prvým mrazom. Každý doklad tu zverejníme do 30 dní." },
    { id: "z-vozik-nina", nazov: "Invalidný vozík pre Ninu", popis: "Nina má 7 rokov a starý vozík jej je malý. Nový zvládne aj školský dvor.", mesto: "Trenčín", foto: F.vozik, vyzbierane: 2960, ciel: 4000, ludia: 61, stav: "dlhodoba" },
    { id: "z-strecha-maria", nazov: "Strecha pre pani Máriu", popis: "Pani Mária má 81 rokov a býva sama. Cez strechu jej tečie do kuchyne a zima je za dverami.", mesto: "Prešov", cast: "Sekčov", foto: F.strecha, vyzbierane: 1260, ciel: 3400, ludia: 38, stav: "bezi", konciDni: 12 },
    { id: "z-doucovanie-tabor", nazov: "Doučovanie v Tábori", popis: "Deväť detí z Tábora chodí na doučovanie dvakrát týždenne. Platíme učiteľky a pomôcky.", mesto: "Prešov", cast: "Tábor", foto: F.ucenie, vyzbierane: 740, ciel: 2000, ludia: 24, stav: "bezi" },
    { id: "z-polievka-hlavna", nazov: "Polievka na Hlavnej", popis: "Každý večer uvaríme polievku pre 40 ľudí bez domova na Hlavnej ulici.", mesto: "Prešov", foto: F.polievka, vyzbierane: 1890, ludia: 72, stav: "dlhodoba" },
    { id: "z-bundy-deti", nazov: "Zimné bundy pre deti", popis: "Bundy, čiapky a rukavice pre deti z rodín v núdzi pred zimou.", mesto: "Bratislava", foto: F.bundy, vyzbierane: 1870, ciel: 2600, ludia: 77, stav: "bezi", konciDni: 21 },
    { id: "z-ovocie-vydajna", nazov: "Ovocie do výdajne", popis: "Čerstvé ovocie do výdajne potravín, každý týždeň.", mesto: "Trenčín", foto: F.ovocie, vyzbierane: 380, ciel: 380, ludia: 27, stav: "ukoncena", doklady: 4, skoncila: "22. 9.", spravaDarcom: "Ovocie sme rozdelili 27 rodinám. Posledný týždeň ostalo aj na výdajňu v Opatovej.", d: "22.", m: "SEP", rok: 2026 },
  ],
  skutky: [
    { id: "sk-300jedal", nazov: "300 teplých jedál za 2 hodiny", popis: "Mierové námestie · dobrovoľníci z mesta", mesto: "Trenčín", kedy: "Včera", foto: F.jedlo, dobrovolnici: 14, d: "2.", m: "OKT", rok: 2026 },
    { id: "sk-strecha", nazov: "Opravili sme strechu Horváthovcom", popis: "prvá etapa · krov a laty", mesto: "Trenčín", kedy: "29. 9.", foto: F.strecha, dobrovolnici: 9, d: "29.", m: "SEP", rok: 2026 },
    { id: "sk-nakup-sihot", nazov: "Nákup pre 12 seniorov zo Sihote", popis: "každý piatok · nákup a odvoz domov", mesto: "Trenčín", kedy: "20. 9.", foto: F.seniori, dobrovolnici: 6, d: "20.", m: "SEP", rok: 2026 },
    { id: "sk-obedy-sekcov", nazov: "Obedy pre 20 seniorov zo Sekčova", popis: "každý deň o 11:00", mesto: "Prešov", kedy: "18. 9.", foto: F.jedlo, dobrovolnici: 5, d: "18.", m: "SEP", rok: 2026 },
    { id: "sk-dvor", nazov: "Upratali sme dvor jedálne", popis: "Hlavná 12 · celé sobotné doobedie", mesto: "Prešov", kedy: "14. 9.", foto: F.dobrovolnici, dobrovolnici: 11, d: "14.", m: "SEP", rok: 2026 },
    { id: "sk-tasky", nazov: "31 školských tašiek", popis: "rozdávali sme priamo v škole", mesto: "Bratislava", kedy: "2. 9.", foto: F.tasky, dobrovolnici: 8, d: "2.", m: "SEP", rok: 2026 },
    { id: "sk-vecera", nazov: "Vianočná večera pre 60 ľudí", popis: "naše prvé Vianoce", mesto: "Bratislava", kedy: "24. 12. 2023", foto: F.vianoce, dobrovolnici: 17, d: "24.", m: "DEC", rok: 2023 },
  ],
  oznamy: [
    { id: "o-deky", druh: "vyzva", nadpis: "Hľadáme deky do nocľahárne", stitok: "VÝZVA NA SÚRNU POMOC", text: "Do 8. 10. · Mierové nám. 1, každý deň 9 – 17", mesto: "Trenčín", den: "8.", mesiac: "OKT", tlacidlo: "Prihlásiť sa", pod: "23 ľudí už pomáha" },
    { id: "o-beh", druh: "akcia", nadpis: "Beh pre Svetlo", stitok: "AKCIA · SOBOTA 10:00", text: "Ostrov, Trenčín · 5 km, aj pre rodiny s deťmi", mesto: "Trenčín", den: "12.", mesiac: "OKT", tlacidlo: "Zúčastním sa", pod: "zúčastní sa 64 ľudí" },
    { id: "o-upratovanie", druh: "akcia", nadpis: "Upratovanie dvora pri jedálni", stitok: "AKCIA · SOBOTA 9:00", text: "Hlavná 12, Prešov · rukavice dáme", mesto: "Prešov", den: "18.", mesiac: "OKT", tlacidlo: "Zúčastním sa", pod: "zúčastní sa 11 ľudí" },
    { id: "o-vydajna", druh: "oznam", nadpis: "Nová výdajňa otvorená", stitok: "OZNAM", text: "Račianska 4, Bratislava · pondelok až piatok 13 – 17", mesto: "Bratislava", den: "1.", mesiac: "OKT", tlacidlo: "Pozrieť", pod: "prvý týždeň prišlo 180 ľudí" },
  ],
  praca: [
    { id: "p-vodic", nazov: "Vodič na rozvoz jedál", druh: "brigadnik", text: "Piatky 10 – 14 · dohoda · 6 € na hodinu", mesto: "Trenčín", den: "15.", mesiac: "OKT", pod: "prihlásiť sa do 15. 10.",
      stitok: "BRIGÁDA", opis: "Rozvezieš obedy seniorom zo Sihote a Opatovej. Auto máme, stačí vodičák B a dobrá nálada.", kde: "Trenčín · Mierové nám. 1", kedy: "piatky 10 – 14", odmena: "6 € na hodinu · dohoda", zaujem: "3 ľudia už majú záujem" },
    { id: "p-koordinator", nazov: "Koordinátorka dobrovoľníkov", druh: "zamestnanec", text: "Prešov · polovičný úväzok · od 1. 11. · 680 € mesačne", mesto: "Prešov", den: "25.", mesiac: "OKT", pod: "prihlásiť sa do 25. 10.",
      stitok: "POLOVIČNÝ ÚVÄZOK", opis: "Dáš dokopy 40 dobrovoľníkov v Prešove: rozpisy, nábor a starostlivosť, aby sa k nám radi vracali.", kde: "Prešov · Hlavná 12", kedy: "od 1. 11. · 20 h týždenne", odmena: "680 € mesačne", zaujem: "1 človek už má záujem" },
  ],
  darcovia: [
    { id: "d1", meno: "Peter K.", iniciala: "PK", mesto: "Prešov", naCo: "Strecha pre pani Máriu", suma: 10, pred: "pred 3 min" },
    { id: "d2", meno: "Anonymný darca", iniciala: "A", mesto: "Prešov", naCo: "Seniori v Prešove", suma: 25, pred: "pred 9 min" },
    { id: "d3", meno: "Lenka M.", iniciala: "LM", mesto: "Prešov", naCo: "Celá činnosť", suma: 5, pred: "pred 21 min" },
    { id: "d4", meno: "Jozef T.", iniciala: "JT", mesto: "Prešov", naCo: "Strecha pre pani Máriu", pred: "pred 40 min" },
    { id: "d5", meno: "Mária V.", iniciala: "MV", mesto: "Prešov", naCo: "Seniori v Prešove", suma: 1, pred: "pred 2 h" },
    { id: "d6", meno: "ZŠ Šmeralova", iniciala: "ZŠ", mesto: "Prešov", naCo: "Deti v Prešove", suma: 45, pred: "pred 1 h" },
    { id: "d7", meno: "Anonymný darca", iniciala: "A", mesto: "Trenčín", naCo: "Invalidný vozík pre Ninu", suma: 25, pred: "pred 11 min" },
    { id: "d8", meno: "Zuzana H.", iniciala: "ZH", mesto: "Trenčín", naCo: "Strecha pre rodinu Horváthovú", suma: 50, pred: "pred 35 min" },
    { id: "d9", meno: "Martin B.", iniciala: "MB", mesto: "Bratislava", naCo: "Zimné bundy pre deti", suma: 10, pred: "pred 12 min" },
    { id: "d10", meno: "Anonymný darca", iniciala: "A", mesto: "Bratislava", naCo: "Celá činnosť", suma: 5, pred: "pred 48 min" },
  ],
  titulka: U("photo-1542601906990-b4d3fb778b09", 1200),
  onas: { nadpis: "O nás", text: "Začali sme v novembri 2023 jedným hrncom polievky na Mierovom námestí. Dnes varíme, opravujeme strechy a sprevádzame seniorov v Trenčíne, Prešove a Bratislave. Každé euro dokladujeme.", oblasti: [] },
  dorovnaniePas: { ini: "PD", nadpis: "Pekáreň Dobrota zdvojnásobí tvoj dar", text: "1 : 1 · najviac 300 € · ešte 4 380 €" },
  // kronika z prototypu „Verejny profil charity PC v3 Kronika" (tá istá charita, sídlo Trenčín)
  roky: [
    { rok: 2026, nZaz: 37, sum: [["18 940 €", "vyzbierané"], ["5 z 6", "zbierok doložených"], ["31", "skutkov"], ["486", "darcov"]] },
    { rok: 2025, nZaz: 47, sum: [["14 210 €", "vyzbierané"], ["5 z 5", "zbierok doložených"], ["42", "skutkov"], ["612", "darcov"]] },
    { rok: 2024, nZaz: 29, sum: [["7 480 €", "vyzbierané"], ["3 z 3", "zbierok doložených"], ["26", "skutkov"], ["233", "darcov"]] },
    { rok: 2023, nZaz: 10, sum: [["1 920 €", "vyzbierané"], ["1 z 1", "zbierka doložená"], ["9", "skutkov"], ["52", "darcov"]] },
  ],
  kronika: [
    { id: "k-skolske", typ: "zb", d: "25.", m: "AUG", rok: 2026, mesto: "Trenčín", nazov: "Školské potreby", s: "450 € · od 31 darcov", q: "31 detí prišlo prvý deň do školy s novou taškou. Zvyšných 38 € sme dali na desiaty na celý september.", dok: "6 DOKLADOV", foto: U("photo-1507842217343-583bb7270b66") },
    { id: "k-sarka", typ: "is", d: "14.", m: "JÚL", rok: 2026, mesto: "Trenčín", nazov: "Sárka vstala", s: "1 204 iskier · 0:38", foto: U("photo-1576091160399-112ba8d25d1d") },
    { id: "k-noclah", typ: "zb", d: "28.", m: "FEB", rok: 2026, mesto: "Trenčín", nazov: "Zimná nocľaháreň", s: "4 000 € · od 96 darcov", q: "Kúpili sme 40 postelí, perie a 80 diek. Nocľaháreň bola celú zimu plná a nikto nemusel spať vonku.", dok: "14 DOKLADOV", foto: U("photo-1519681393784-d120267933ba") },
    { id: "k-piatky", typ: "sk", d: "9.", m: "JAN", rok: 2026, mesto: "Trenčín", nazov: "Prvých 150 piatkov varenia", s: "Mierové námestie · 14 dobrovoľníkov", foto: U("photo-1542838132-92c53300491e") },
    { id: "k-bundy25", typ: "zb", d: "20.", m: "DEC", rok: 2025, mesto: "Trenčín", nazov: "Zimné bundy pre deti", s: "1 870 € · od 77 darcov", q: "77 detí dostalo pred Vianocami teplú bundu. Rozdávali sme ich priamo v škole, spolu s rodičmi.", dok: "8 DOKLADOV", foto: U("photo-1519681393784-d120267933ba") },
    { id: "k-beh25", typ: "oz", d: "14.", m: "OKT", rok: 2025, mesto: "Trenčín", nazov: "Beh pre Svetlo 2025: 412 bežcov", s: "Ostrov, Trenčín · vyzbierali 3 140 €", foto: U("photo-1517649763962-0c623066013b") },
    { id: "k-opatova", typ: "zb", d: "30.", m: "SEP", rok: 2025, mesto: "Trenčín", nazov: "Strecha pre pani Máriu z Opatovej", s: "5 600 € · od 130 darcov", q: "Pani Mária má pred zimou novú strechu. Pokrývači z Opatovej prácu darovali, platili sme len materiál.", dok: "11 DOKLADOV", foto: U("photo-1632759145351-1d592919f522") },
    { id: "k-emka", typ: "is", d: "3.", m: "MÁJ", rok: 2025, mesto: "Trenčín", nazov: "Emka a husle", s: "2 310 iskier · 0:42", foto: U("photo-1501386761578-eac5c94b800a") },
    { id: "k-kuchyna", typ: "zb", d: "15.", m: "APR", rok: 2025, mesto: "Trenčín", nazov: "Kuchyňa pre výdajňu", s: "2 900 € · od 64 darcov", q: "Výdajňa má profesionálnu kuchyňu. Varíme 300 porcií namiesto 120.", dok: "9 DOKLADOV", foto: U("photo-1556909114-f6e7ad7d3136") },
    { id: "k-balicky", typ: "zb", d: "22.", m: "DEC", rok: 2024, mesto: "Trenčín", nazov: "Vianočné balíčky", s: "2 480 € · od 91 darcov", q: "140 balíčkov pre seniorov a rodiny. Každý sme odniesli osobne.", dok: "5 DOKLADOV", foto: U("photo-1542601906990-b4d3fb778b09") },
    { id: "k-dodavka", typ: "zb", d: "30.", m: "AUG", rok: 2024, mesto: "Trenčín", nazov: "Dodávka na rozvoz jedla", s: "3 900 € · od 104 darcov", q: "Kúpili sme ojazdenú dodávku. Jedlo vozíme aj do Opatovej a Zlatoviec.", dok: "4 DOKLADY", foto: U("photo-1542838132-92c53300491e") },
    { id: "k-sporak", typ: "sk", d: "10.", m: "MAR", rok: 2024, mesto: "Trenčín", nazov: "Varíme na novom sporáku", s: "zbierka Hrnce a sporák · 1 100 €", foto: U("photo-1556909114-f6e7ad7d3136") },
    { id: "k-polievka23", typ: "zb", d: "30.", m: "NOV", rok: 2023, mesto: "Trenčín", nazov: "Polievka pre Mierové námestie", s: "1 920 € · od 52 darcov", q: "Naša prvá zbierka. Kúpili sme dva veľké hrnce, varič a suroviny na celú zimu.", dok: "3 DOKLADY", foto: U("photo-1542601906990-b4d3fb778b09") },
    { id: "k-zaciatok", typ: "sk", d: "18.", m: "NOV", rok: 2023, mesto: "Trenčín", nazov: "Tu sme začali", s: "jeden hrniec polievky na Mierovom námestí", foto: U("photo-1542601906990-b4d3fb778b09") },
  ],
};

// ============================================================
// 2 · FIRMA — Pekáreň Dobrota s.r.o. (sídlo Bratislava, pomáha v TN, PO, BA)
// ============================================================
const DOROVNA = "Pekáreň Dobrota dorovnáva 1 : 1";
const FIRMA: TestProfil = {
  k: "pekaren", typ: "firma", meno: "Pekáreň Dobrota s.r.o.", iniciala: "PD",
  veta: "Pečieme od roku 2009. Časť z každého bochníka ide tam, kde je najbližšie treba.",
  mesto: "Bratislava", stit: "Gold", odRoku: 2024,
  stitky: ["Bratislava", "od 2024", "Overená firma · IČO"],
  ico: "36 987 654", ucet: "SK70 1100 0000 0029 1234 5678",
  sidlo: "Račianska 4, Bratislava", kontakt: "dobro@pekarendobrota.sk",
  cisla: [["61 300 €", "darované"], ["12", "podporených zbierok"], ["24", "skutky zamestnancov"]],
  stitCisla: [["100 %", "doložené"], ["24", "skutkov"], ["842", "sledujúcich"]],
  centralna: sektor("c-pekaren", "Fond Dobroty", "centralna", F.pecivo, 18200, 310, {
    "Trenčín": { dlazdica: "Trenčín: 1 400 € v septembri", minulyMesiac: "V Trenčíne v septembri: 800 € jedlo · 600 € opravy", uvidis: "Uvidíš, ktoré zbierky sme dorovnali", rozpis: [["jedlo", 57], ["opravy", 43]] },
    "Prešov": { dlazdica: "Prešov: 1 100 € v septembri", minulyMesiac: "V Prešove v septembri: 700 € jedlo · 400 € doučovanie", uvidis: "Uvidíš, ktoré zbierky sme dorovnali", rozpis: [["jedlo", 64], ["doučovanie", 36]] },
    "Bratislava": { dlazdica: "Bratislava: 2 300 € v septembri", minulyMesiac: "V Bratislave v septembri: 1 200 € pečivo do výdajní · 700 € oblečenie · 400 € šport", uvidis: "Uvidíš, ktoré zbierky sme dorovnali", rozpis: [["pečivo", 52], ["oblečenie", 30], ["šport", 18]] },
  }),
  sektory: [
    sektor("f-sport", "Deti a šport", "sektor", F.sport, 7200, 118, {
      "Trenčín": { dlazdica: "Trenčín: 2 kluby", minulyMesiac: "V Trenčíne sme platili dres a štartovné dvom detským klubom.", uvidis: "Uvidíš, ktoré kluby sme podporili", rozpis: [["dresy", 55], ["štartovné", 45]] },
      "Prešov": { dlazdica: "Prešov: 18 detí", minulyMesiac: "V Prešove chodí 18 detí na florbal zadarmo.", uvidis: "Uvidíš, koľko detí hrá", rozpis: [["tréningy", 70], ["výstroj", 30]] },
      "Bratislava": { dlazdica: "Bratislava: nové ihrisko", minulyMesiac: "V Bratislave sme doplatili povrch ihriska na Račianskej.", uvidis: "Uvidíš fotky z ihriska", rozpis: [["stavba", 85], ["vybavenie", 15]] },
    }),
    sektor("f-seniori", "Seniori", "sektor", F.seniori, 5400, 87, {
      "Trenčín": { dlazdica: "Trenčín: 40 raňajok denne", minulyMesiac: "V Trenčíne sme vozili pečivo do jedálne, 40 raňajok denne.", uvidis: "Uvidíš, koľko pečiva sme odviezli", rozpis: [["pečivo", 80], ["doprava", 20]] },
      "Prešov": { dlazdica: "Prešov: obedy pre 20", minulyMesiac: "V Prešove sme dorovnali rozvoz obedov pre 20 seniorov.", uvidis: "Uvidíš, koľko obedov sme dorovnali", rozpis: [["jedlo", 75], ["doprava", 25]] },
      "Bratislava": { dlazdica: "Bratislava: 400 vianočiek", minulyMesiac: "V Bratislave sme napiekli 400 vianočiek pre domovy seniorov.", uvidis: "Uvidíš, kam sme ich odviezli", rozpis: [["pečenie", 70], ["doprava", 30]] },
    }),
    sektor("f-komunita", "Komunita v regióne", "sektor", F.komunita, 4800, 64, {
      "Trenčín": { dlazdica: "Trenčín: 3 akcie", minulyMesiac: "V Trenčíne sme pečivom zasponzorovali tri mestské akcie.", uvidis: "Uvidíš, na akých akciách sme boli", rozpis: [["pečivo", 65], ["réžia", 35]] },
      "Prešov": { dlazdica: "Prešov: nová pec v jedálni", minulyMesiac: "V Prešove sme kúpili pec do jedálne na Hlavnej.", uvidis: "Uvidíš, čo sme kúpili", rozpis: [["vybavenie", 90], ["montáž", 10]] },
      "Bratislava": { dlazdica: "Bratislava: 12 zamestnancov", minulyMesiac: "V Bratislave odpracovali naši ľudia 96 hodín vo výdajni.", uvidis: "Uvidíš, koľko hodín sme odpracovali", rozpis: [["dobrovoľníctvo", 100]] },
    }),
  ],
  zbierky: [
    { id: "fz-strecha-horvath", nazov: "Strecha pre rodinu Horváthovú", popis: "Zbierka Svetla pomoci. Dorovnávame každé euro až do 300 € na darcu.", mesto: "Trenčín", foto: F.poziar, vyzbierane: 8420, ciel: 12000, ludia: 148, stav: "bezi", konciDni: 9, dorovnanie: `${DOROVNA} · ešte 1 380 €` },
    { id: "fz-vozik-nina", nazov: "Invalidný vozík pre Ninu", popis: "Nový vozík pre sedemročnú Ninu. Dorovnávame do konca mesiaca.", mesto: "Trenčín", foto: F.vozik, vyzbierane: 2960, ciel: 4000, ludia: 61, stav: "bezi", dorovnanie: `${DOROVNA} · ešte 520 €` },
    { id: "fz-strecha-maria", nazov: "Strecha pre pani Máriu", popis: "Pani Mária má 81 rokov a býva sama. Zbierka Svetla pomoci v Prešove.", mesto: "Prešov", foto: F.strecha, vyzbierane: 1260, ciel: 3400, ludia: 38, stav: "bezi", konciDni: 12, dorovnanie: `${DOROVNA} · ešte 940 €` },
    { id: "fz-doucovanie", nazov: "Doučovanie v Tábori", popis: "Deväť detí, dvakrát týždenne. Platíme učiteľky.", mesto: "Prešov", foto: F.ucenie, vyzbierane: 740, ciel: 2000, ludia: 24, stav: "bezi", dorovnanie: `${DOROVNA} · ešte 1 260 €` },
    { id: "fz-polievka", nazov: "Polievka na Hlavnej", popis: "Večerná polievka pre 40 ľudí bez domova. Pečivo dávame my.", mesto: "Prešov", foto: F.polievka, vyzbierane: 1890, ludia: 72, stav: "dlhodoba", dorovnanie: `${DOROVNA} · pečivo každý deň` },
    { id: "fz-bundy", nazov: "Zimné bundy pre deti", popis: "Bundy pre deti z rodín v núdzi. Dorovnávame do výšky 2 000 €.", mesto: "Bratislava", foto: F.bundy, vyzbierane: 1870, ciel: 2600, ludia: 77, stav: "bezi", konciDni: 21, dorovnanie: `${DOROVNA} · ešte 130 €` },
    { id: "fz-ihrisko", nazov: "Ihrisko na Račianskej", popis: "Nový povrch ihriska pre deti zo sídliska. Doplatili sme zvyšok.", mesto: "Bratislava", foto: F.sport, vyzbierane: 6400, ciel: 6400, ludia: 112, stav: "ukoncena", doklady: 7, skoncila: "30. 6.", spravaDarcom: "Ihrisko je hotové od júla. Chodí tam denne vyše 50 detí, povrch má záruku 10 rokov.", d: "30.", m: "JÚN", rok: 2026 },
  ],
  skutky: [
    { id: "fs-vianocky", nazov: "Napiekli sme 400 vianočiek pre seniorov", popis: "nočná zmena · celý tím pekárne", mesto: "Bratislava", kedy: "Včera", foto: F.pecivo, dobrovolnici: 12, d: "2.", m: "OKT", rok: 2026 },
    { id: "fs-vydajna", nazov: "96 hodín vo výdajni potravín", popis: "zamestnanci namiesto zmeny", mesto: "Bratislava", kedy: "28. 9.", foto: F.dobrovolnici, dobrovolnici: 12, d: "28.", m: "SEP", rok: 2026 },
    { id: "fs-pecivo-jedalen", nazov: "Pečivo do jedálne každé ráno", popis: "40 raňajok denne · celý september", mesto: "Trenčín", kedy: "30. 9.", foto: F.pekaren, dobrovolnici: 3, d: "30.", m: "SEP", rok: 2026 },
    { id: "fs-strecha", nazov: "Doplatili sme krytinu Horváthovcom", popis: "dorovnanie zbierky 1 : 1", mesto: "Trenčín", kedy: "29. 9.", foto: F.strecha, d: "29.", m: "SEP", rok: 2026 },
    { id: "fs-pec", nazov: "Kúpili sme pec do jedálne na Hlavnej", popis: "montáž aj zaškolenie", mesto: "Prešov", kedy: "12. 9.", foto: F.polievka, dobrovolnici: 4, d: "12.", m: "SEP", rok: 2026 },
    { id: "fs-florbal", nazov: "18 detí hrá florbal zadarmo", popis: "celá sezóna · tréningy aj výstroj", mesto: "Prešov", kedy: "5. 9.", foto: F.sport, d: "5.", m: "SEP", rok: 2026 },
    { id: "fs-ihrisko", nazov: "Otvorili sme ihrisko na Račianskej", popis: "s deťmi zo sídliska", mesto: "Bratislava", kedy: "1. 7.", foto: F.komunita, dobrovolnici: 9, d: "1.", m: "JÚL", rok: 2026 },
  ],
  oznamy: [
    { id: "fo-pecivo", druh: "vyzva", nadpis: "Hľadáme vodiča na rozvoz pečiva do výdajní", stitok: "VÝZVA NA SÚRNU POMOC", text: "Do 10. 10. · Račianska 4, ráno 5 – 8", mesto: "Bratislava", den: "10.", mesiac: "OKT", tlacidlo: "Prihlásiť sa", pod: "4 ľudia už pomáhajú" },
    { id: "fo-den", druh: "akcia", nadpis: "Deň otvorenej pekárne", stitok: "AKCIA · SOBOTA 9:00", text: "Račianska 4, Bratislava · pečieme s deťmi", mesto: "Bratislava", den: "19.", mesiac: "OKT", tlacidlo: "Zúčastním sa", pod: "zúčastní sa 86 ľudí" },
    { id: "fo-dorovnanie", druh: "oznam", nadpis: "V októbri dorovnávame dvojnásobne", stitok: "OZNAM", text: "Všetky zbierky v Trenčíne a Prešove · do 31. 10.", mesto: "Trenčín", den: "1.", mesiac: "OKT", tlacidlo: "Pozrieť zbierky", pod: "zapojených 6 zbierok" },
    { id: "fo-zbierka-presov", druh: "akcia", nadpis: "Pečieme na Hlavnej pre jedáleň", stitok: "AKCIA · PIATOK 14:00", text: "Hlavná 12, Prešov · pečivo zadarmo", mesto: "Prešov", den: "24.", mesiac: "OKT", tlacidlo: "Zúčastním sa", pod: "zúčastní sa 23 ľudí" },
  ],
  praca: [
    { id: "fp-pekar", nazov: "Pekár / pekárka na nočnú zmenu", druh: "zamestnanec", text: "Bratislava · plný úväzok · od 1. 11. · 1 420 € mesačne", mesto: "Bratislava", den: "20.", mesiac: "OKT", pod: "prihlásiť sa do 20. 10." },
    { id: "fp-vodic", nazov: "Vodič rozvozu", druh: "brigadnik", text: "Trenčín · ráno 5 – 9 · dohoda · 8 € na hodinu", mesto: "Trenčín", den: "28.", mesiac: "OKT", pod: "prihlásiť sa do 28. 10." },
  ],
  darcovia: [
    { id: "fd1", meno: "Pekáreň Dobrota", iniciala: "PD", mesto: "Trenčín", naCo: "Strecha pre rodinu Horváthovú", suma: 150, pred: "pred 8 min" },
    { id: "fd2", meno: "Jana S.", iniciala: "JS", mesto: "Bratislava", naCo: "Fond Dobroty", suma: 10, pred: "pred 19 min" },
    { id: "fd3", meno: "Anonymný darca", iniciala: "A", mesto: "Bratislava", naCo: "Deti a šport", suma: 25, pred: "pred 32 min" },
    { id: "fd4", meno: "Tomáš R.", iniciala: "TR", mesto: "Prešov", naCo: "Doučovanie v Tábori", suma: 5, pred: "pred 1 h" },
    { id: "fd5", meno: "Katarína D.", iniciala: "KD", mesto: "Trenčín", naCo: "Seniori", pred: "pred 2 h" },
    { id: "fd6", meno: "Anonymný darca", iniciala: "A", mesto: "Prešov", naCo: "Fond Dobroty", suma: 50, pred: "pred 3 h" },
  ],
  titulka: U("photo-1509440159596-0249088772ff", 1200),
  onas: { nadpis: "Pečieme od roku 2009", text: "Pečieme od roku 2009. Časť z každého bochníka ide tam, kde je najbližšie treba: dorovnávame zbierky charít, vozíme pečivo do jedální a naši ľudia pomáhajú namiesto zmeny.", oblasti: ["Deti a šport", "Seniori", "Komunita v regióne"] },
};

// ============================================================
// 3 · TVORCA — Martin Konaľ · hudobník (Trenčín, koncerty aj v PO a BA)
// ============================================================
const TVORCA: TestProfil = {
  k: "tvorca", typ: "tvorca", meno: "Martin Konaľ", iniciala: "MK",
  veta: "Hrám na husliach. Na každom koncerte vyberám na jednu konkrétnu vec.",
  mesto: "Trenčín", stit: "Silver", odRoku: 2025,
  stitky: ["Trenčín", "od 2025", "Overený tvorca"],
  ico: "52 147 963", ucet: "SK31 0200 0000 0012 3456 7890",
  sidlo: "Trenčín", kontakt: "martin@konal.sk",
  cisla: [["18 700 €", "vyzbierané"], ["7", "zbierok"], ["41", "koncertov"]],
  stitCisla: [["96 %", "doložené"], ["41", "skutkov"], ["6 480", "sledujúcich"]],
  centralna: sektor("c-marek", "Martin pomáha", "centralna", F.husle, 9400, 512, {
    "Trenčín": { dlazdica: "Trenčín: 620 € v septembri", minulyMesiac: "V Trenčíne v septembri: 400 € deti · 220 € zvieratá", uvidis: "Uvidíš, komu peniaze z koncertov išli", rozpis: [["deti", 65], ["zvieratá", 35]] },
    "Prešov": { dlazdica: "Prešov: 380 € v septembri", minulyMesiac: "V Prešove v septembri: 380 € hudba do nemocnice", uvidis: "Uvidíš, komu peniaze z koncertov išli", rozpis: [["nemocnice", 100]] },
    "Bratislava": { dlazdica: "Bratislava: 840 € v septembri", minulyMesiac: "V Bratislave v septembri: 500 € deti · 340 € zvieratá", uvidis: "Uvidíš, komu peniaze z koncertov išli", rozpis: [["deti", 60], ["zvieratá", 40]] },
  }),
  sektory: [
    sektor("t-deti", "Deti", "sektor", F.ucenie, 4200, 198, {
      "Trenčín": { dlazdica: "Trenčín: 11 detí na husle", minulyMesiac: "V Trenčíne chodí 11 detí na husle zadarmo.", uvidis: "Uvidíš, koľko detí hrá", rozpis: [["lekcie", 60], ["nástroje", 40]] },
      "Prešov": { dlazdica: "Prešov: 6 detí", minulyMesiac: "V Prešove sme kúpili 6 detí nástroj do školy.", uvidis: "Uvidíš, čo sme kúpili", rozpis: [["nástroje", 100]] },
      "Bratislava": { dlazdica: "Bratislava: 20 detí na koncerte", minulyMesiac: "V Bratislave bolo 20 detí z detského domova na koncerte.", uvidis: "Uvidíš fotky z koncertu", rozpis: [["vstupenky", 70], ["doprava", 30]] },
    }),
    sektor("t-zvierata", "Zvieratá", "sektor", F.zvierata, 3100, 164, {
      "Trenčín": { dlazdica: "Trenčín: 40 zvierat", minulyMesiac: "V Trenčíne sme platili krmivo pre útulok so 40 zvieratami.", uvidis: "Uvidíš, koľko krmiva sme kúpili", rozpis: [["krmivo", 75], ["veterinár", 25]] },
      "Prešov": { dlazdica: "Prešov: 12 psov", minulyMesiac: "V Prešove sme zaplatili očkovanie pre 12 psov.", uvidis: "Uvidíš doklady od veterinára", rozpis: [["veterinár", 100]] },
      "Bratislava": { dlazdica: "Bratislava: útulok Žabí majer", minulyMesiac: "V Bratislave sme kúpili búdy a deky do útulku.", uvidis: "Uvidíš, čo sme kúpili", rozpis: [["vybavenie", 80], ["krmivo", 20]] },
    }),
    sektor("t-nemocnice", "Hudba do nemocníc", "sektor", F.nemocnica, 2400, 150, {
      "Trenčín": { dlazdica: "Trenčín: 4 koncerty", minulyMesiac: "V Trenčíne som hral štyrikrát na detskom oddelení.", uvidis: "Uvidíš, kde som hral", rozpis: [["koncerty", 100]] },
      "Prešov": { dlazdica: "Prešov: 3 koncerty", minulyMesiac: "V Prešove som hral trikrát na onkológii a v hospici.", uvidis: "Uvidíš, kde som hral", rozpis: [["koncerty", 100]] },
      "Bratislava": { dlazdica: "Bratislava: 5 koncertov", minulyMesiac: "V Bratislave som hral päťkrát na detskej klinike.", uvidis: "Uvidíš, kde som hral", rozpis: [["koncerty", 100]] },
    }),
  ],
  zbierky: [
    { id: "tz-husle-deti", nazov: "Husle pre jedenásť detí", popis: "Jedenásť detí z Trenčína chodí na husle. Chýbajú im vlastné nástroje.", mesto: "Trenčín", foto: F.husle, vyzbierane: 2340, ciel: 3600, ludia: 118, stav: "bezi", konciDni: 14, zodpoveda: "Svetlo pomoci o.z." },
    { id: "tz-utulok-tn", nazov: "Krmivo pre útulok v Trenčíne", popis: "Štyridsať psov a mačiek. Krmivo na celú zimu.", mesto: "Trenčín", foto: F.zvierata, vyzbierane: 1480, ciel: 2200, ludia: 96, stav: "bezi", zodpoveda: "OZ Túlavá labka" },
    { id: "tz-oddelenie-tn", nazov: "Koncerty na detskom oddelení", popis: "Hrám raz týždenne deťom v nemocnici. Zbierka platí nástroje a dopravu.", mesto: "Trenčín", foto: F.nemocnica, vyzbierane: 860, ludia: 54, stav: "dlhodoba", zodpoveda: "Svetlo pomoci o.z." },
    { id: "tz-hospic-po", nazov: "Hudba do hospicu v Prešove", popis: "Po koncerte v Prešove hrám v hospici. Zbierka ide hospicu.", mesto: "Prešov", foto: F.koncert, vyzbierane: 1120, ciel: 2000, ludia: 73, stav: "bezi", konciDni: 6, zodpoveda: "Hospic Prešov" },
    { id: "tz-nastroje-po", nazov: "Nástroje do školy v Prešove", popis: "Šesť detí z Tábora chce hrať. Škola nemá ani jeden nástroj.", mesto: "Prešov", foto: F.ucenie, vyzbierane: 640, ciel: 1500, ludia: 41, stav: "bezi", zodpoveda: "Svetlo pomoci o.z." },
    { id: "tz-domov-ba", nazov: "Deti z domova na koncert", popis: "Dvadsať detí z detského domova na môj koncert v Bratislave, aj s dopravou.", mesto: "Bratislava", foto: F.koncert, vyzbierane: 980, ciel: 1200, ludia: 88, stav: "bezi", konciDni: 18, zodpoveda: "OZ Motýlik" },
    { id: "tz-utulok-ba", nazov: "Búdy do útulku Žabí majer", popis: "Zateplené búdy a deky pred zimou.", mesto: "Bratislava", foto: F.zvierata, vyzbierane: 1900, ciel: 1900, ludia: 134, stav: "ukoncena", doklady: 5, skoncila: "15. 9.", spravaDarcom: "Kúpili sme 14 zateplených búd a 40 diek. Útulok ich má pred prvými mrazmi.", zodpoveda: "OZ Túlavá labka" },
  ],
  skutky: [
    { id: "ts-koncert-tn", nazov: "Benefičný koncert na Mierovom námestí", popis: "480 ľudí · vyzbierali sme 1 240 €", mesto: "Trenčín", kedy: "Včera", foto: F.koncert },
    { id: "ts-oddelenie", nazov: "Hral som deťom na oddelení", popis: "štvrtý týždeň po sebe", mesto: "Trenčín", kedy: "27. 9.", foto: F.nemocnica },
    { id: "ts-husle-odovzdanie", nazov: "Odovzdali sme päť huslí deťom", popis: "prvé vlastné nástroje", mesto: "Trenčín", kedy: "18. 9.", foto: F.husle, dobrovolnici: 4 },
    { id: "ts-hospic", nazov: "Koncert v hospici v Prešove", popis: "pre pacientov aj rodiny", mesto: "Prešov", kedy: "14. 9.", foto: F.koncert },
    { id: "ts-skola-po", nazov: "Hodina huslí v škole v Tábori", popis: "šesť detí si prvýkrát zahralo", mesto: "Prešov", kedy: "9. 9.", foto: F.ucenie, dobrovolnici: 2 },
    { id: "ts-domov-ba", nazov: "Dvadsať detí z domova na koncerte", popis: "aj s dopravou a večerou", mesto: "Bratislava", kedy: "3. 9.", foto: F.komunita, dobrovolnici: 6 },
    { id: "ts-utulok-ba", nazov: "Postavili sme búdy v útulku", popis: "14 búd za jednu sobotu", mesto: "Bratislava", kedy: "15. 9.", foto: F.zvierata, dobrovolnici: 11 },
  ],
  oznamy: [
    { id: "to-koncert-tn", druh: "akcia", nadpis: "Koncert pre husle deťom", stitok: "AKCIA · PIATOK 19:00", text: "Posádkový klub, Trenčín · vstup dobrovoľný", mesto: "Trenčín", den: "11.", mesiac: "OKT", tlacidlo: "Zúčastním sa", pod: "zúčastní sa 212 ľudí" },
    { id: "to-utulok", druh: "vyzva", nadpis: "Hľadám ľudí na odvoz krmiva do útulku", stitok: "VÝZVA NA SÚRNU POMOC", text: "Do 9. 10. · Trenčín · stačí dodávka a dve hodiny", mesto: "Trenčín", den: "9.", mesiac: "OKT", tlacidlo: "Prihlásiť sa", pod: "6 ľudí už pomáha" },
    { id: "to-koncert-po", druh: "akcia", nadpis: "Koncert v Prešove pre hospic", stitok: "AKCIA · SOBOTA 18:00", text: "PKO Čierny orol, Prešov · celý výťažok hospicu", mesto: "Prešov", den: "17.", mesiac: "OKT", tlacidlo: "Zúčastním sa", pod: "zúčastní sa 148 ľudí" },
    { id: "to-koncert-ba", druh: "akcia", nadpis: "Koncert v Bratislave s deťmi z domova", stitok: "AKCIA · NEDEĽA 17:00", text: "Nová Cvernovka, Bratislava · 20 miest pre deti z domova", mesto: "Bratislava", den: "26.", mesiac: "OKT", tlacidlo: "Zúčastním sa", pod: "zúčastní sa 304 ľudí" },
  ],
  praca: [
    { id: "tp-zvukar", nazov: "Zvukár na turné", druh: "brigadnik", text: "Trenčín · Prešov · Bratislava · 6 koncertov · dohoda", mesto: "Trenčín", den: "14.", mesiac: "OKT", pod: "prihlásiť sa do 14. 10." },
    { id: "tp-stanok", nazov: "Pomocník na stánok", druh: "brigadnik", text: "Bratislava · nedeľa 15 – 21 · 7 € na hodinu", mesto: "Bratislava", den: "24.", mesiac: "OKT", pod: "prihlásiť sa do 24. 10." },
  ],
  darcovia: [
    { id: "td1", meno: "Simona P.", iniciala: "SP", mesto: "Trenčín", naCo: "Husle pre jedenásť detí", suma: 10, pred: "pred 6 min" },
    { id: "td2", meno: "Anonymný darca", iniciala: "A", mesto: "Trenčín", naCo: "Martin pomáha", suma: 5, pred: "pred 24 min" },
    { id: "td3", meno: "Richard K.", iniciala: "RK", mesto: "Prešov", naCo: "Hudba do hospicu v Prešove", suma: 25, pred: "pred 41 min" },
    { id: "td4", meno: "Eva M.", iniciala: "EM", mesto: "Bratislava", naCo: "Deti z domova na koncert", suma: 50, pred: "pred 1 h" },
    { id: "td5", meno: "Anonymný darca", iniciala: "A", mesto: "Bratislava", naCo: "Zvieratá", pred: "pred 2 h" },
    { id: "td6", meno: "Ján H.", iniciala: "JH", mesto: "Trenčín", naCo: "Krmivo pre útulok v Trenčíne", suma: 10, pred: "pred 3 h" },
  ],
  titulka: U("photo-1511671782779-c97d3d27a1d4", 1200),
  podporit: "Martina Konaľa",
};

export const TEST_PROFILY: TestProfil[] = [CHARITA, FIRMA, TVORCA];
export const najdiTestProfil = (k: string): TestProfil | undefined => TEST_PROFILY.find((p) => p.k === k);
/** verejný odkaz na zdieľanie: /p/svetlo · /p/pekaren · /p/martin → kľúč profilu */
const SLUG_KLUC: Record<string, string> = { svetlo: "svetlo", pekaren: "pekaren", martin: "tvorca" };
export const slugNaKluc = (slug: string): string | undefined => SLUG_KLUC[slug];
export const klucNaSlug = (k: string): string => (k === "tvorca" ? "martin" : k);
/** stránka/organizácia (feed, adresár, „Stránka organizácie") podľa mena → testovací profil.
 *  Voľnejšie párovanie: bez právnych prípon (o.z. · s.r.o. · n.o. · o.p.s.), zhoda aj keď jedno obsahuje druhé. */
const holeMeno = (m: string) => m.toLowerCase().replace(/\./g, " ").replace(/\s+/g, " ").trim()
  .replace(/\b(o\s?z|s\s?r\s?o|n\s?o|o\s?p\s?s|a\s?s)\b/g, "").replace(/\s+/g, " ").trim();
export function testProfilPreMeno(meno?: string | null): TestProfil | undefined {
  if (!meno) return undefined;
  const m = holeMeno(meno);
  if (!m) return undefined;
  return TEST_PROFILY.find((p) => holeMeno(p.meno) === m);
}
export const testProfilPodlaTypu = (t: TypProfilu): TestProfil => TEST_PROFILY.find((p) => p.typ === t) ?? CHARITA;

// ---- lokalita ----
/** nechá len položky z vybraného mesta; „Celé Slovensko" nechá všetko (mesto človeka prvé) */
export function vLokalite<T extends { mesto: Mesto }>(zoznam: T[], lok: Lokalita, domace?: Mesto): T[] {
  if (lok !== "Celé Slovensko") return zoznam.filter((p) => p.mesto === lok);
  if (!domace) return zoznam;
  return [...zoznam.filter((p) => p.mesto === domace), ...zoznam.filter((p) => p.mesto !== domace)];
}
/** mesto, ktoré sa použije v texte modulu — pri „Celé Slovensko" sa mesto nepíše */
export const mestoTextu = (lok: Lokalita, domace: Mesto): Mesto => (lok === "Celé Slovensko" ? domace : lok);

// ---- čísla ----
export const eur = (n: number) => `${n.toLocaleString("sk-SK")} €`;
export const pct = (vyzbierane: number, ciel?: number) => (ciel && ciel > 0 ? Math.min(100, Math.round((vyzbierane / ciel) * 100)) : 0);

/** slovenský tvar podľa počtu: tvar(3, ["zbierka", "zbierky", "zbierok"]) → „3 zbierky" */
export const tvar = (n: number, [jeden, dva, pat]: [string, string, string]) => `${n.toLocaleString("sk-SK")} ${n === 1 ? jeden : n >= 2 && n <= 4 ? dva : pat}`;
