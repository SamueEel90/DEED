// ============================================================
// MODUL NÁBOŽENSTVO — mock dáta (v1, port špecifikácie DEED_Modul_Nabozenstvo_v1)
// „Šošovka" nad enginom — kópia modulu Charita s iným obsahom.
//   · adresár registrovaných cirkví SR (register MK SR, zákon 308/1991)
//   · feed: obsah komunít (Zbierky / Udalosti / Oznamy / Dobrovoľníctvo)
//   · zbierky sa tu len ZRKADLIA — žijú v Help/Charita engine
//   · žiadna karma/levely pre cirkevné subjekty — len badge „overená"
// ============================================================
import { U } from "@/theme";
import type { CharitaFeedItem, HladanieZaznam } from "@/types";

// ---- typ obsahu (chips = TYP obsahu, NIE porovnávanie cirkví) ----
export type NabozTyp = "zbierka" | "udalost" | "oznam" | "dobrovolnictvo";
export const TYP_CHIP: Record<NabozTyp, string> = {
  zbierka: "Zbierky", udalost: "Udalosti", oznam: "Oznamy", dobrovolnictvo: "Dobrovoľníctvo",
};

// položka feedu = Charita engine meta + náboženský obsah (typ + komunita/cirkev)
export type NabozFeedItem = CharitaFeedItem & { ntyp: NabozTyp; cirkev: string; komunita?: string; pribeh?: string };

// ---- ADRESÁR: všetkých 18 registrovaných cirkví SR (abecedne v rámci rodín) ----
// Kritérium = registrácia štátom (register MK SR). Radenie podľa rodín, badge „overená" pre všetky.
export interface CirkevPolozka { skratka: string; meno: string; rodina: string; }
export interface CirkevSekcia { rodina: string; polozky: CirkevPolozka[]; }

export const CIRKVI: CirkevSekcia[] = [
  { rodina: "Katolícke a východné", polozky: [
    { skratka: "RKC", meno: "Rímskokatolícka cirkev v SR", rodina: "kresťanská — katolícka" },
    { skratka: "GKC", meno: "Gréckokatolícka cirkev na Slovensku", rodina: "kresťanská — katolícka (vých. obrad)" },
    { skratka: "PC", meno: "Pravoslávna cirkev na Slovensku", rodina: "kresťanská — pravoslávna" },
  ]},
  { rodina: "Evanjelické a protestantské", polozky: [
    { skratka: "ECAV", meno: "Evanjelická cirkev augsburského vyznania na Slovensku", rodina: "kresťanská — luteránska" },
    { skratka: "RKC-r", meno: "Reformovaná kresťanská cirkev na Slovensku", rodina: "kresťanská — reformovaná" },
    { skratka: "ECM", meno: "Evanjelická cirkev metodistická, Slovenská oblasť", rodina: "kresťanská — protestantská" },
    { skratka: "BJB", meno: "Bratská jednota baptistov v SR", rodina: "kresťanská — protestantská" },
    { skratka: "CB", meno: "Cirkev bratská v SR", rodina: "kresťanská — protestantská" },
    { skratka: "ACS", meno: "Apoštolská cirkev na Slovensku", rodina: "kresťanská — letničná" },
    { skratka: "KZ", meno: "Kresťanské zbory na Slovensku", rodina: "kresťanská — protestantská" },
  ]},
  { rodina: "Ostatné kresťanské", polozky: [
    { skratka: "CASD", meno: "Cirkev adventistov siedmeho dňa", rodina: "kresťanská — protestantská" },
    { skratka: "CČSH", meno: "Cirkev československá husitská na Slovensku", rodina: "kresťanská" },
    { skratka: "LDS", meno: "Cirkev Ježiša Krista Svätých neskorších dní v SR", rodina: "kresťanská — LDS" },
    { skratka: "JS", meno: "Náboženská spoločnosť Jehovovi svedkovia v SR", rodina: "kresťanská — reštauracionistická" },
    { skratka: "NAC", meno: "Novoapoštolská cirkev v SR", rodina: "kresťanská" },
    { skratka: "SKC", meno: "Starokatolícka cirkev na Slovensku", rodina: "kresťanská" },
  ]},
  { rodina: "Nekresťanské", polozky: [
    { skratka: "ÚZŽNO", meno: "Ústredný zväz židovských náboženských obcí v SR", rodina: "židovská" },
    { skratka: "BS", meno: "Bahájske spoločenstvo v SR", rodina: "bahájska" },
  ]},
];

// plochý zoznam (výber „mojej cirkvi" + hľadanie)
export const CIRKVI_FLAT: CirkevPolozka[] = CIRKVI.flatMap((s) => s.polozky);

// ---- FEED: obsah komunít ----
// engine typ: zbierka → "charita" (stĺpec Zbierky) · ostatné → "skutok" (stĺpec Komunita).
// Súradnice pri Trenčíne; celoslovenské = narodne:true (zobrazia sa pri okruhu „celá SR").
export const FEED_ITEMS: NabozFeedItem[] = [
  { id: "strecha", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", ntyp: "zbierka",
    skore: 8, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 62,
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Oprava strechy farského kostola", lok: "Trenčín · centrum", overena: true,
    badgeL: "🏛 ZBIERKA", tag: "Zbierka", emoji: "⛪",
    popis: "Do strechy nášho kostola zateká. Zbierame na výmenu krytiny pred zimou.",
    pribeh: "Strecha farského kostola prepúšťa vodu a hrozí poškodenie klenby. Zbierka pokrýva krytinu a klampiarske práce. Zbierka žije v module Charita — darovať môžeš aj bez zapnutého modulu, cez QR.",
    vyzbierane: 4200, ciel: 12000, fotky: [U("photo-1548407260-da850faa41e3")] },

  { id: "pozar", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", ntyp: "zbierka",
    skore: 7.5, typSituacie: "normal", lat: 48.905, lng: 18.030, dni: 1, podpora: 44,
    cirkev: "Gréckokatolícka cirkev na Slovensku", komunita: "Farnosť Trenčín",
    nazov: "Pomoc rodine po požiari", lok: "Trenčín · Sihoť", overena: true,
    badgeL: "💶 ZBIERKA", tag: "Zbierka", emoji: "🤍",
    popis: "Rodine z našej farnosti zhorel byt. Skladáme sa na najnutnejšie veci.",
    pribeh: "Rodina z farnosti prišla pri požiari o bývanie. Zbierka je zrkadlená z Charity — transparentný účet a overenie zabezpečuje charitatívny engine.",
    vyzbierane: 1830, ciel: 3000, fotky: [U("photo-1518481612222-68bbe828ecd1")] },

  { id: "synagoga", comp: "data", typ: "charita", modul: "charity", kat: "Komunita", ntyp: "zbierka",
    skore: 7, typSituacie: "normal", narodne: true, lat: 48.148, lng: 17.107, dni: 2, podpora: 128,
    cirkev: "Ústredný zväz židovských náboženských obcí v SR", komunita: "Židovská obec Bratislava",
    nazov: "Obnova poškodenej synagógy", lok: "Bratislava · celé SR", overena: true,
    badgeL: "🕎 ZBIERKA", tag: "Zbierka", emoji: "🕎",
    popis: "Vandalmi poškodenú synagógu obnovujeme spoločne — naprieč vierami.",
    pribeh: "Medzináboženská solidarita: na obnovu sa skladajú aj kresťanské farnosti. Default modul skrýva iné vierovyznania, ale cez hľadanie podporíš čokoľvek.",
    vyzbierane: 9400, ciel: 18000, fotky: [U("photo-1544427920-c49ccfb85579")] },

  { id: "koncert", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 6, typSituacie: "normal", lat: 48.890, lng: 18.038, dni: 0, podpora: 31,
    cirkev: "Evanjelická cirkev augsburského vyznania na Slovensku", komunita: "CZ ECAV Trenčín",
    nazov: "Adventný koncert v kostole", lok: "Trenčín · ev. kostol", overena: true,
    badgeL: "🎶 UDALOSŤ", tag: "Udalosť", emoji: "🎶",
    popis: "Nedeľa 18:00 · spevokol a komorný orchester. Vstup voľný, dobrovoľný dar.",
    pribeh: "Adventný koncert spevokolu a komorného orchestra. Vstup voľný, dobrovoľný dar podporí opravu organu." },

  { id: "mladez", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 5.2, typSituacie: "normal", lat: 48.876, lng: 18.041, dni: 1, podpora: 18,
    cirkev: "Bratská jednota baptistov v SR", komunita: "Zbor BJB Trenčín",
    nazov: "Stretnutie mládeže zboru", lok: "Trenčín · zborový dom", overena: true,
    badgeL: "🎪 UDALOSŤ", tag: "Udalosť", emoji: "🎪",
    popis: "Piatok 18:30 · téma, hudba, spoločenstvo. Príď medzi nás.",
    pribeh: "Týždenné stretnutie mládeže — téma, chvály a spoločenstvo. Otvorené pre nových." },

  { id: "bohosluzby", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.5, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 0,
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Zmena času bohoslužieb (advent)", lok: "Trenčín · centrum", overena: true,
    badgeL: "📢 OZNAM", tag: "Oznam", emoji: "📢",
    popis: "Počas adventu sú ranné sväté omše o 6:00. Rorátne omne pri sviecach.",
    pribeh: "Oznam farnosti: počas adventu sú ranné sväté omše (roráty) o 6:00 pri sviecach. Ostatné časy zostávajú." },

  { id: "slovo", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.2, typSituacie: "normal", narodne: true, lat: 48.720, lng: 21.258, dni: 1, podpora: 0,
    cirkev: "Pravoslávna cirkev na Slovensku", komunita: "Pravoslávna eparchia",
    nazov: "Duchovné slovo na týždeň", lok: "celé SR", overena: true,
    badgeL: "📖 OZNAM", tag: "Oznam", emoji: "📖",
    popis: "Krátke zamyslenie k nedeľnému čítaniu pre komunitu.",
    pribeh: "Týždenné duchovné zamyslenie k nedeľnému evanjeliu — obsah patrí do modulu, nie do verejného feedu (§3 obsahová hranica)." },

  { id: "cintorin", comp: "data", typ: "skutok", modul: "charity", kat: "Priroda", ntyp: "dobrovolnictvo",
    skore: 5, typSituacie: "normal", lat: 48.900, lng: 18.028, dni: 0, podpora: 12,
    cirkev: "Reformovaná kresťanská cirkev na Slovensku", komunita: "CZ Trenčín",
    nazov: "Brigáda na cintoríne", lok: "Trenčín · starý cintorín", overena: true,
    badgeL: "🙌 DOBROVOĽNÍCTVO", tag: "Dobrovoľníctvo", emoji: "🍂",
    popis: "Sobota 9:00 · hrabanie lístia a údržba. Náradie zabezpečíme.",
    pribeh: "Jesenná brigáda — hrabanie lístia a drobná údržba historického cintorína. Náradie a občerstvenie zabezpečíme." },

  { id: "obed", comp: "data", typ: "skutok", modul: "charity", kat: "Pomoc", ntyp: "dobrovolnictvo",
    skore: 5.5, typSituacie: "normal", narodne: true, lat: 48.150, lng: 17.110, dni: 0, podpora: 24,
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Slovenská katolícka charita",
    nazov: "Pomoc pri charitatívnom obede", lok: "Bratislava · celé SR", overena: true,
    badgeL: "🍲 DOBROVOĽNÍCTVO", tag: "Dobrovoľníctvo", emoji: "🍲",
    popis: "Hľadáme dobrovoľníkov na výdaj teplých obedov ľuďom bez domova.",
    pribeh: "Nábor dobrovoľníkov na výdaj teplých obedov. Praktická pomoc — presne to, čo patrí aj do verejného feedu (§3)." },
];

// ---- index pre vyhľadávanie (obsah feedu + celý adresár cirkví) ----
// Hľadanie NÁJDE čokoľvek naprieč vierami (§5 mäkká stena: default skrýva, hľadanie nájde).
export const HLADAJ_DATA: HladanieZaznam[] = [
  ...FEED_ITEMS.map((it) => ({
    id: it.id, titul: it.nazov || "", podtitul: `${it.komunita || it.cirkev} · ${it.lok || ""}`,
    kat: TYP_CHIP[it.ntyp], emoji: it.emoji || "⛪", tag: it.tag || "",
  })),
  ...CIRKVI_FLAT.map((c) => ({
    id: "cirkev-" + c.skratka, titul: c.meno, podtitul: c.rodina, kat: "Cirkvi", emoji: "⛪", tag: "overená",
  })),
];
