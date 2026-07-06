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
// `farnostId` = väzba na konkrétnu komunitu (FARNOSTI) → profil ju filtruje do tabov.
// `ukat` = jemná pod-kategória Udalosti/Oznamu (omša/svadba/pohreb… — farba v kalendári).
// `datum` = ISO deň (udalosti s dátumom → kalendár + pripomienka).
export type NabozFeedItem = CharitaFeedItem & {
  ntyp: NabozTyp; cirkev: string; komunita?: string; pribeh?: string;
  farnostId?: string; ukat?: UdalostKat; datum?: string; rsvp?: boolean; split?: boolean;
  overitelne?: boolean; // pravosť rieši komunitné Overujem/Namietam (§78) — zbierka pre iného/pohreb/svadba
};

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
    skore: 8, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 62, farnostId: "tn-mesto",
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Oprava strechy farského kostola", lok: "Trenčín · centrum", overena: true,
    badgeL: "🏛 ZBIERKA", tag: "Zbierka", emoji: "⛪",
    popis: "Do strechy nášho kostola zateká. Zbierame na výmenu krytiny pred zimou.",
    pribeh: "Strecha farského kostola prepúšťa vodu a hrozí poškodenie klenby. Zbierka pokrýva krytinu a klampiarske práce. Zbierka žije v module Charita — darovať môžeš aj bez zapnutého modulu, cez QR.",
    vyzbierane: 4200, ciel: 12000, fotky: [U("photo-1548407260-da850faa41e3")] },

  { id: "pozar", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", ntyp: "zbierka",
    skore: 7.5, typSituacie: "normal", lat: 48.905, lng: 18.030, dni: 1, podpora: 44, overitelne: true,
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

  // ---- bohatší obsah demo farnosti (Farnosť Trenčín — mesto) pre taby profilu ----
  { id: "kurenie", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", ntyp: "zbierka",
    skore: 6.8, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 38, farnostId: "tn-mesto",
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Nové kúrenie do kostola", lok: "Trenčín · centrum", overena: true,
    badgeL: "🔥 ZBIERKA", tag: "Zbierka", emoji: "🔥",
    popis: "Staré kúrenie dosluhuje. Zbierame na tepelné čerpadlo pred zimou.",
    pribeh: "Samostatná kampaň popri streche — teplo v kostole cez zimu. Každá kampaň má vlastné darovanie, nech darca vie, kam dar padol (§57).",
    vyzbierane: 2600, ciel: 9000, fotky: [U("photo-1506126613408-eca07ce68773")] },

  { id: "omsa-ne", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 6.2, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 0, farnostId: "tn-mesto",
    ukat: "omsa", cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Nedeľná svätá omša 10:30", lok: "Trenčín · farský kostol", overena: true,
    badgeL: "⛪ OMŠA", tag: "Udalosť", emoji: "⛪",
    popis: "Nedeľa 10:30 · veľká omša. Dobrovoľná omšová zbierka.",
    pribeh: "Pravidelná nedeľná veľká omša z rozvrhu. K omši sa automaticky generuje omšová zbierka (settlement € na farský účet, close 23:59). Omša nemá RSVP — chodí sa bez prihlásenia, má len pripomienku (§8)." },

  { id: "put-levoca", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 6.5, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 5, podpora: 41, farnostId: "tn-mesto",
    ukat: "put", rsvp: true, cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Farská púť do Levoče", lok: "Trenčín → Levoča", overena: true,
    badgeL: "🚌 PÚŤ", tag: "Udalosť", emoji: "⛰",
    popis: "Sobota · spoločná púť autobusom. Prihlás sa a rezervuj miesto.",
    pribeh: "Spoločná púť do Levoče. Voliteľná zbierka na dopravu, kapacita autobusu obmedzená → prihlás sa (RSVP + počet).",
    vyzbierane: 480, ciel: 1200 },

  { id: "ohlasky", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.4, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 1, podpora: 0, farnostId: "tn-mesto",
    ukat: "oznam", cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Ohlášky — Peter a Mária", lok: "Trenčín · centrum", overena: true,
    badgeL: "💍 OHLÁŠKY", tag: "Oznam", emoji: "💍",
    popis: "Sviatosť manželstva si vyslúžia Peter N. a Mária K. dňa 2. augusta.",
    pribeh: "Ohlášky pred sobášom — mená snúbencov a dátum sobáša. Bez zbierky, len oznam (Like + Zdieľať)." },

  { id: "jubileum", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.1, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 0, farnostId: "tn-mesto",
    ukat: "oznam", cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "90 rokov pani Heleny", lok: "Trenčín · centrum", overena: true,
    badgeL: "🎂 JUBILEUM", tag: "Oznam", emoji: "🎂",
    popis: "Naša farníčka Helena sa dožíva 90 rokov. Vyprosujeme jej hojnosť Božích milostí.",
    pribeh: "Jubilejný oznam — tvorí ho user (auto-publish, hlavička = meno usera z registrácie). Farár môže zmazať." },

  { id: "pohreb", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", ntyp: "udalost",
    skore: 6.0, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 2, podpora: 27, farnostId: "tn-mesto",
    ukat: "pohreb", split: true, cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Rozlúčka — Ján Novák (†)", lok: "Trenčín · dom smútku", overena: true,
    badgeL: "🕯 POHREB", tag: "Udalosť", emoji: "🕯",
    popis: "S vďakou za jeho život. Pohrebná zbierka pre pozostalú rodinu.",
    pribeh: "Meno zosnulého + súhlas rodiny (nie zoznam účastníkov). Pohrebná zbierka so Split QR: väčšina rodine (pozostalí), malý dobrovoľný dar kostolu na sviečky a výzdobu. Predĺžené okno ~týždeň. Reakcia = kondolencia.",
    vyzbierane: 1340, ciel: 2500 },

  { id: "brigada-fara", comp: "data", typ: "skutok", modul: "charity", kat: "Priroda", ntyp: "dobrovolnictvo",
    skore: 5.3, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 3, podpora: 9, farnostId: "tn-mesto",
    ukat: "brigada", rsvp: true, cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Brigáda okolo fary", lok: "Trenčín · farská záhrada", overena: true,
    badgeL: "🙌 BRIGÁDA", tag: "Dobrovoľníctvo", emoji: "🧹",
    popis: "Sobota 9:00 · hľadáme 8 rúk na úpravu záhrady. Event QR = karma za účasť.",
    pribeh: "Organizované dobrovoľníctvo — event QR (proof-of-presence) → účastník dostane karmu za účasť. Karma ide človeku, nie farnosti (tá je mimo karmy)." },
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

// ============================================================
// FARNOSTI / KOMUNITY (lokálne jednotky) — donation-first (§L: modul = cirkev
// dostáva dary, nie nástenka). Karta v štýle Charita/Help + QR priradený k farnosti.
// Cirkev = vyznanie (RKC…), KOMUNITA/FARNOSŤ = lokálna jednotka (Farnosť Trenčín).
// ============================================================
export interface Farnost {
  id: string;
  nazov: string;          // "Farnosť Trenčín — mesto"
  cirkev: string;         // vyznanie (jedna z 18)
  skratka: string;        // "RKC"
  obec: string;
  kostol?: string;
  farar?: string;         // meno hlavného farára
  zalozena?: string;
  lat: number; lng: number;
  vzdial: string;         // orientačná vzdialenosť (geo na úrovni farností, nie cirkví)
  foto: string;
  popis: string;          // história, založenie, výnimočnosti
  vyzbierane: number; ciel: number; podpora: number;  // VŠEOBECNÁ podpora farnosti (horný modul)
}

export const FARNOSTI: Farnost[] = [
  { id: "tn-mesto", nazov: "Farnosť Trenčín — mesto", cirkev: "Rímskokatolícka cirkev v SR", skratka: "RKC",
    obec: "Trenčín", kostol: "Kostol Narodenia Panny Márie", farar: "Mgr. Jozef Halčin", zalozena: "1069",
    lat: 48.894, lng: 18.046, vzdial: "0,4 km", foto: U("photo-1548407260-da850faa41e3"),
    popis: "Najstaršia trenčianska farnosť pri farskom kostole nad mestom. Spravuje historický kostol, kaplnky a cintorín. Doklady o použití prostriedkov zverejňujeme — systém je tvoj svedok.",
    vyzbierane: 5100, ciel: 20000, podpora: 214 },
  { id: "tn-gkc", nazov: "Gréckokatolícka farnosť Trenčín", cirkev: "Gréckokatolícka cirkev na Slovensku", skratka: "GKC",
    obec: "Trenčín", farar: "o. Peter Micheľ", lat: 48.905, lng: 18.030, vzdial: "1,1 km", foto: U("photo-1519892300165-cb5542fb47c7"),
    popis: "Malá živá komunita východného obradu. Pravidelné sväté liturgie a spoločenstvo rodín.",
    vyzbierane: 820, ciel: 4000, podpora: 44 },
  { id: "ecav-tn", nazov: "CZ ECAV Trenčín", cirkev: "Evanjelická cirkev augsburského vyznania na Slovensku", skratka: "ECAV",
    obec: "Trenčín", farar: "Mgr. Eva Juríková", lat: 48.890, lng: 18.038, vzdial: "0,9 km", foto: U("photo-1438032005730-c779502df39b"),
    popis: "Evanjelický cirkevný zbor s bohatou hudobnou tradíciou — spevokol a komorný orchester.",
    vyzbierane: 1450, ciel: 6000, podpora: 73 },
  { id: "bjb-tn", nazov: "Zbor BJB Trenčín", cirkev: "Bratská jednota baptistov v SR", skratka: "BJB",
    obec: "Trenčín", farar: "kazateľ Martin Uhrík", lat: 48.876, lng: 18.041, vzdial: "1,8 km", foto: U("photo-1507692049790-de58290a4334"),
    popis: "Kongregačný zbor s dôrazom na prácu s mládežou a rodinami.",
    vyzbierane: 640, ciel: 3000, podpora: 31 },
  { id: "zob-ba", nazov: "Židovská náboženská obec Bratislava", cirkev: "Ústredný zväz židovských náboženských obcí v SR", skratka: "ÚZŽNO",
    obec: "Bratislava", lat: 48.148, lng: 17.107, vzdial: "126 km", foto: U("photo-1544427920-c49ccfb85579"),
    popis: "Komunita spravujúca synagógu a pamiatky. Medzináboženská solidarita — na obnovu prispievajú aj kresťanské farnosti.",
    vyzbierane: 9400, ciel: 18000, podpora: 128 },
];

export const FARNOST_PODLA_ID = (id?: string): Farnost | undefined => FARNOSTI.find((f) => f.id === id);

// komunita (text vo feede) → farnostId (fallback, ak položka nemá vlastný farnostId)
export const KOMUNITA_FARNOST: Record<string, string> = {
  "Farnosť Trenčín — mesto": "tn-mesto",
  "Farnosť Trenčín": "tn-gkc",
  "CZ ECAV Trenčín": "ecav-tn",
  "Zbor BJB Trenčín": "bjb-tn",
  "Židovská obec Bratislava": "zob-ba",
};
export const farnostIdOf = (it: NabozFeedItem): string => it.farnostId ?? KOMUNITA_FARNOST[it.komunita ?? ""] ?? "";
export const obsahFarnosti = (fid: string): NabozFeedItem[] => FEED_ITEMS.filter((it) => farnostIdOf(it) === fid);

// ============================================================
// UDALOSTI — pod-kategórie (farba v kalendári §4.1): omša/sviatok = zelená,
// svadba/pohreb = coral (clay), púť/akcia/brigáda = fialová (plum), oznam = info.
// ============================================================
export type UdalostKat = "omsa" | "sviatok" | "svadba" | "pohreb" | "put" | "akcia" | "brigada" | "oznam";
export const KAT_FARBA: Record<UdalostKat, string> = {
  omsa: "var(--a-green)", sviatok: "var(--a-gold)", svadba: "var(--a-clay)", pohreb: "var(--a-clay)",
  put: "var(--a-plum)", akcia: "var(--a-plum)", brigada: "var(--a-plum)", oznam: "var(--a-info)",
};
export const KAT_LABEL: Record<UdalostKat, string> = {
  omsa: "Omša", sviatok: "Sviatok", svadba: "Svadba", pohreb: "Pohreb",
  put: "Púť", akcia: "Akcia", brigada: "Brigáda", oznam: "Oznam",
};

// ============================================================
// ROZVRH OMŠÍ + KALENDÁR (§ Kalendár/Rozvrh) — farár nastaví raz,
// systém auto-generuje omše a ich zbierky na celý mesiac dopredu.
// ============================================================
export type OmsaTyp = "ranna" | "vecerna" | "velka" | "mimoriadna";
export const OMSA_LABEL: Record<OmsaTyp, string> = {
  ranna: "Ranná", vecerna: "Večerná", velka: "Veľká (nedeľná)", mimoriadna: "Mimoriadna",
};
export interface DennaOmsa { type: OmsaTyp; time: string; }
export interface RozvrhDen { dayOfWeek: number; masses: DennaOmsa[]; } // dayOfWeek: 0=nedeľa … 6=sobota (JS getDay)
export interface RozvrhOmsi {
  defaultTimes: Record<"ranna" | "vecerna" | "velka", string>;
  weeklyPattern: RozvrhDen[];
  generateCollectionPerMass: boolean;       // true = zbierka ku každej omši; false = jedna denná
  viditelnostSumy: "zobrazit" | "skryt" | "len-farar"; // §72 prepínač na farnosť
}

// predvyplnený „bežný rozvrh" (rýchly štart) — farár si ho upraví
export const PREDVYPLNENY_ROZVRH: RozvrhOmsi = {
  defaultTimes: { ranna: "06:30", vecerna: "18:00", velka: "10:30" },
  weeklyPattern: [
    { dayOfWeek: 0, masses: [{ type: "ranna", time: "07:30" }, { type: "velka", time: "10:30" }] }, // nedeľa
    { dayOfWeek: 1, masses: [] },
    { dayOfWeek: 2, masses: [] },
    { dayOfWeek: 3, masses: [{ type: "vecerna", time: "18:00" }] }, // streda
    { dayOfWeek: 4, masses: [] },
    { dayOfWeek: 5, masses: [{ type: "vecerna", time: "18:00" }] }, // piatok
    { dayOfWeek: 6, masses: [{ type: "vecerna", time: "18:00" }] }, // sobota (vigília)
  ],
  generateCollectionPerMass: true,
  viditelnostSumy: "zobrazit",
};
export const PRAZDNY_ROZVRH: RozvrhOmsi = {
  defaultTimes: { ranna: "06:30", vecerna: "18:00", velka: "10:30" },
  weeklyPattern: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, masses: [] })),
  generateCollectionPerMass: true, viditelnostSumy: "zobrazit",
};
export const CASY: Record<"ranna" | "vecerna" | "velka", string[]> = {
  ranna: ["06:00", "06:30", "07:00", "07:30"], vecerna: ["17:30", "18:00", "18:30"], velka: ["09:00", "10:00", "10:30", "11:00"],
};

// cirkevný kalendár — predplnený číselník sviatkov (§6)
export interface Sviatok { md: string; nazov: string; kind: "prikazany" | "neviazany"; }
export const SVIATKY: Sviatok[] = [
  { md: "01-01", nazov: "Panny Márie Bohorodičky", kind: "prikazany" },
  { md: "01-06", nazov: "Zjavenie Pána (Traja králi)", kind: "prikazany" },
  { md: "06-29", nazov: "Sv. Petra a Pavla", kind: "neviazany" },
  { md: "08-15", nazov: "Nanebovzatie Panny Márie", kind: "prikazany" },
  { md: "09-15", nazov: "Sedembolestná Panna Mária", kind: "prikazany" },
  { md: "11-01", nazov: "Všetkých svätých", kind: "prikazany" },
  { md: "11-02", nazov: "Spomienka na zosnulých", kind: "neviazany" },
  { md: "12-08", nazov: "Nepoškvrnené počatie", kind: "prikazany" },
  { md: "12-24", nazov: "Štedrý deň (vigília)", kind: "neviazany" },
  { md: "12-25", nazov: "Narodenie Pána", kind: "prikazany" },
  { md: "12-26", nazov: "Sv. Štefana", kind: "prikazany" },
];

// vygenerovaná konkrétna omša (§2.3 MassInstance)
export interface MassInstance {
  id: string;
  dateISO: string;
  time: string;
  type: OmsaTyp;
  source: "auto" | "manual" | "feast";
  status: "active" | "cancelled";
  sviatok?: string;
}
export const isoDatum = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// generátor: z rozvrhu vyrobí omše na daný mesiac + prekryje sviatkami (source=feast)
export function generujOmse(rok: number, mesiac: number, rozvrh: RozvrhOmsi): MassInstance[] {
  const res: MassInstance[] = [];
  const pocet = new Date(rok, mesiac + 1, 0).getDate();
  for (let d = 1; d <= pocet; d++) {
    const den = new Date(rok, mesiac, d);
    const iso = isoDatum(den);
    const md = iso.slice(5);
    const sv = SVIATKY.find((s) => s.md === md);
    const pat = rozvrh.weeklyPattern.find((p) => p.dayOfWeek === den.getDay());
    const base = pat?.masses ?? [];
    if (sv) {
      // sviatok = predškrtnutý, ak deň nemá omšu, navrhne veľkú (farár doladí časy §6)
      const zoznam = base.length ? base : [{ type: "velka" as OmsaTyp, time: rozvrh.defaultTimes.velka }];
      zoznam.forEach((m, i) => res.push({ id: `${iso}-f${i}`, dateISO: iso, time: m.time, type: m.type, source: "feast", status: "active", sviatok: sv.nazov }));
    } else {
      base.forEach((m, i) => res.push({ id: `${iso}-${i}`, dateISO: iso, time: m.time, type: m.type, source: "auto", status: "active" }));
    }
  }
  return res;
}

// jednorazové udalosti mesiaca (svadba/pohreb/púť/brigáda) — relatívne k dnešku,
// nech padnú do viditeľného mesiaca. Doplnia sa v kalendári popri omšiach.
export interface KalUdalost { den: number; kat: UdalostKat; nazov: string; cas?: string; }
export const KAL_UDALOSTI: KalUdalost[] = [
  { den: 6, kat: "brigada", nazov: "Brigáda okolo fary", cas: "09:00" },
  { den: 12, kat: "svadba", nazov: "Sobáš — Peter a Mária", cas: "14:00" },
  { den: 18, kat: "pohreb", nazov: "Rozlúčka — Ján Novák (†)", cas: "11:00" },
  { den: 23, kat: "put", nazov: "Farská púť do Levoče", cas: "07:00" },
  { den: 27, kat: "akcia", nazov: "Farský deň", cas: "15:00" },
];

// ---- farársky Split QR (§ Rozdeliť dar) — labely vo farskom jazyku, nie „cico/zvyšok" ----
export const SPLIT_LABELY = {
  pohreb: { rodina: "Rodine (pozostalí)", kostol: "Kostolu — na sviečky a výzdobu (dobrovoľné)" },
  svadba: { rodina: "Novomanželom", kostol: "Kostolu — dar (dobrovoľné)" },
};
