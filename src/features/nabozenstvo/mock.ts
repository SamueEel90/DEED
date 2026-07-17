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
import type { SplitVariant } from "@/shared";
import { nacitajStav, ulozStav } from "./stav";

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
  reakciaTyp?: ReakciaTyp; // kontext srdiečka (§ delta bod 2): kondolencia / modlím sa / blahoželáme
  smutocny?: SmutocnyData; // smútočný oznam (úmrtie) — šablóna/parte + štruktúrované polia (DEV podklad)
  vytvorene?: number;      // timestamp publikovania (TTL oznamov §8b)
  platnostDni?: number;    // TTL — default 7 dní, nastaviteľné; pri úmrtí min. do rozlúčky + 3 dni
  spoplatnene?: boolean;   // user oznam v platenom self-add režime (nikdy prosba/smútočné — simónia)
  autorTvar?: boolean;     // farárov oznam s tvárou v hlavičke (delta bod 20 — „akože hovorí on")
  linkedZbierka?: boolean; // parte režim 2 — pripojená pohrebná zbierka (samostatná entita; tu len flag + ciel)
};

// ============================================================
// OZNÁMENIE O ÚMRTÍ (parte) — DEED_Oznamenie_o_Umrti_DEV.md
// (nahrádza predošlý „Smútočný oznam"). Je to LEN OZNAM — žiadne pole
// zbierky (§0); zbierka je samostatná entita v sekcii zbierok farára.
// Režim A = šablóna (1/2/3) · režim B = vlastné parte (obrázok).
// V OBOCH režimoch povinné štruktúrované polia — zobrazené POD oznamom
// (obrázok je pre oko, polia pre systém: kalendár, notifikácie, hľadanie).
// ============================================================
export interface SmutocnyData {
  mode: "template" | "image";
  templateId?: 1 | 2 | 3;        // A klasická · B teplá (sviečka) · C minimalistická
  imageUrl?: string;             // režim B — nahrané parte
  meno: string;                  // koho spomíname (povinné)
  datumNar: string;              // ISO (povinné)
  datumUmr: string;              // ISO (povinné)
  vers?: string;                 // výber z prednastavených alebo vlastný
  rozluckaMiesto: string;        // povinné
  rozluckaDatum: string;         // ISO deň (povinné)
  rozluckaCas: string;           // HH:MM (povinné)
  foto?: string;                 // režim A — voliteľná fotka do šablóny
  text?: string;                 // voliteľný formátovateľný text (rich — §5, zachovať formát)
}

// vek sa dopočíta z dátumov (spec §4.2)
export function vekZDatumov(nar: string, umr: string): number | null {
  const n = new Date(nar), u = new Date(umr);
  if (isNaN(n.getTime()) || isNaN(u.getTime())) return null;
  let v = u.getFullYear() - n.getFullYear();
  if (u.getMonth() < n.getMonth() || (u.getMonth() === n.getMonth() && u.getDate() < n.getDate())) v--;
  return v >= 0 ? v : null;
}

// TTL oznamu (§8b): default 7 dní; pri úmrtí platí min. do rozlúčky + 3 dni — čo je neskôr.
// „Preč z feedu" ≠ hard delete — expirovaný sa len nefiltruje do feedu (záznam ostáva v localStorage).
const DEN_MS = 86400000;
export function oznamAktivny(it: NabozFeedItem): boolean {
  if (it.ntyp !== "oznam" || !it.vytvorene) return true; // TTL zatiaľ len pre oznamy s časom vzniku
  const zaklad = it.vytvorene + (it.platnostDni ?? 7) * DEN_MS;
  const rozlucka = it.smutocny?.rozluckaDatum ? Date.parse(it.smutocny.rozluckaDatum) + 3 * DEN_MS : 0;
  return Date.now() < Math.max(zaklad, rozlucka); // nikdy nezmizne pred udalosťou, ktorú ohlasuje
}

// kontext reakcie-srdiečka (§ delta bod 2 · matica Univerzálne pravidlá): srdiečko má
// kontextový význam — pri úmrtí/pohrebe „kondolencia", pri prosbe o modlitbu „modlím sa".
export type ReakciaTyp = "kondolencia" | "modlitba" | "blahozelanie" | "srdce";

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
    vyzbierane: 4200, ciel: 12000, fotky: [U("photo-1611859732483-07bd0d5e3c50")] },

  { id: "pozar", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", ntyp: "zbierka",
    skore: 7.5, typSituacie: "normal", lat: 48.905, lng: 18.030, dni: 1, podpora: 44, overitelne: true,
    cirkev: "Gréckokatolícka cirkev na Slovensku", komunita: "Farnosť Trenčín",
    nazov: "Pomoc rodine po požiari", lok: "Trenčín · Sihoť", overena: true,
    badgeL: "💶 ZBIERKA", tag: "Zbierka", emoji: "🤍",
    popis: "Rodine z našej farnosti zhorel byt. Skladáme sa na najnutnejšie veci.",
    pribeh: "Rodina z farnosti prišla pri požiari o bývanie. Zbierka je zrkadlená z Charity — transparentný účet a overenie zabezpečuje charitatívny engine.",
    vyzbierane: 1830, ciel: 3000, fotky: [U("photo-1516567832553-66232148f74c")] },

  { id: "synagoga", comp: "data", typ: "charita", modul: "charity", kat: "Komunita", ntyp: "zbierka",
    skore: 7, typSituacie: "normal", narodne: true, lat: 48.148, lng: 17.107, dni: 2, podpora: 128,
    cirkev: "Ústredný zväz židovských náboženských obcí v SR", komunita: "Židovská obec Bratislava",
    nazov: "Obnova poškodenej synagógy", lok: "Bratislava · celé SR", overena: true,
    badgeL: "🕎 ZBIERKA", tag: "Zbierka", emoji: "🕎",
    popis: "Vandalmi poškodenú synagógu obnovujeme spoločne — naprieč vierami.",
    pribeh: "Medzináboženská solidarita: na obnovu sa skladajú aj kresťanské farnosti. Default modul skrýva iné vierovyznania, ale cez hľadanie podporíš čokoľvek.",
    vyzbierane: 9400, ciel: 18000, fotky: [U("photo-1573233228413-920d74dd6564")] },

  { id: "koncert", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 6, typSituacie: "normal", lat: 48.890, lng: 18.038, dni: 0, podpora: 31,
    cirkev: "Evanjelická cirkev augsburského vyznania na Slovensku", komunita: "CZ ECAV Trenčín",
    nazov: "Adventný koncert v kostole", lok: "Trenčín · ev. kostol", overena: true,
    badgeL: "🎶 UDALOSŤ", tag: "Udalosť", emoji: "🎶",
    popis: "Nedeľa 18:00 · spevokol a komorný orchester. Vstup voľný, dobrovoľný dar.",
    pribeh: "Adventný koncert spevokolu a komorného orchestra. Vstup voľný, dobrovoľný dar podporí opravu organu.",
    fotky: [U("photo-1465847899084-d164df4dedc6")] },

  { id: "mladez", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 5.2, typSituacie: "normal", lat: 48.876, lng: 18.041, dni: 1, podpora: 18,
    cirkev: "Bratská jednota baptistov v SR", komunita: "Zbor BJB Trenčín",
    nazov: "Stretnutie mládeže zboru", lok: "Trenčín · zborový dom", overena: true,
    badgeL: "🎪 UDALOSŤ", tag: "Udalosť", emoji: "🎪",
    popis: "Piatok 18:30 · téma, hudba, spoločenstvo. Príď medzi nás.",
    pribeh: "Týždenné stretnutie mládeže — téma, chvály a spoločenstvo. Otvorené pre nových.",
    fotky: [U("photo-1529156069898-49953e39b3ac")] },

  { id: "bohosluzby", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.5, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 0,
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Zmena času bohoslužieb (advent)", lok: "Trenčín · centrum", overena: true,
    badgeL: "📢 OZNAM", tag: "Oznam", emoji: "📢",
    popis: "Počas adventu sú ranné sväté omše o 6:00. Rorátne omne pri sviecach.",
    pribeh: "Oznam farnosti: počas adventu sú ranné sväté omše (roráty) o 6:00 pri sviecach. Ostatné časy zostávajú.",
    fotky: [U("photo-1705864821171-63fc75ee6c0e")] },

  { id: "slovo", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.2, typSituacie: "normal", narodne: true, lat: 48.720, lng: 21.258, dni: 1, podpora: 0,
    cirkev: "Pravoslávna cirkev na Slovensku", komunita: "Pravoslávna eparchia",
    nazov: "Duchovné slovo na týždeň", lok: "celé SR", overena: true,
    badgeL: "📖 OZNAM", tag: "Oznam", emoji: "📖",
    popis: "Krátke zamyslenie k nedeľnému čítaniu pre komunitu.",
    pribeh: "Týždenné duchovné zamyslenie k nedeľnému evanjeliu — obsah patrí do modulu, nie do verejného feedu (§3 obsahová hranica).",
    fotky: [U("photo-1504052434569-70ad5836ab65")] },

  { id: "cintorin", comp: "data", typ: "skutok", modul: "charity", kat: "Priroda", ntyp: "dobrovolnictvo",
    skore: 5, typSituacie: "normal", lat: 48.900, lng: 18.028, dni: 0, podpora: 12,
    cirkev: "Reformovaná kresťanská cirkev na Slovensku", komunita: "CZ Trenčín",
    nazov: "Brigáda na cintoríne", lok: "Trenčín · starý cintorín", overena: true,
    badgeL: "🙌 DOBROVOĽNÍCTVO", tag: "Dobrovoľníctvo", emoji: "🍂",
    popis: "Sobota 9:00 · hrabanie lístia a údržba. Náradie zabezpečíme.",
    pribeh: "Jesenná brigáda — hrabanie lístia a drobná údržba historického cintorína. Náradie a občerstvenie zabezpečíme.",
    fotky: [U("photo-1729105427057-b999db728bab")] },

  { id: "obed", comp: "data", typ: "skutok", modul: "charity", kat: "Pomoc", ntyp: "dobrovolnictvo",
    skore: 5.5, typSituacie: "normal", narodne: true, lat: 48.150, lng: 17.110, dni: 0, podpora: 24,
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Slovenská katolícka charita",
    nazov: "Pomoc pri charitatívnom obede", lok: "Bratislava · celé SR", overena: true,
    badgeL: "🍲 DOBROVOĽNÍCTVO", tag: "Dobrovoľníctvo", emoji: "🍲",
    popis: "Hľadáme dobrovoľníkov na výdaj teplých obedov ľuďom bez domova.",
    pribeh: "Nábor dobrovoľníkov na výdaj teplých obedov. Praktická pomoc — presne to, čo patrí aj do verejného feedu (§3).",
    fotky: [U("photo-1593113598332-cd288d649433")] },

  // ---- bohatší obsah demo farnosti (Farnosť Trenčín — mesto) pre taby profilu ----
  { id: "kurenie", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", ntyp: "zbierka",
    skore: 6.8, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 38, farnostId: "tn-mesto",
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Nové kúrenie do kostola", lok: "Trenčín · centrum", overena: true,
    badgeL: "🔥 ZBIERKA", tag: "Zbierka", emoji: "🔥",
    popis: "Staré kúrenie dosluhuje. Zbierame na tepelné čerpadlo pred zimou.",
    pribeh: "Samostatná kampaň popri streche — teplo v kostole cez zimu. Každá kampaň má vlastné darovanie, nech darca vie, kam dar padol (§57).",
    vyzbierane: 2600, ciel: 9000, fotky: [U("photo-1608569569089-5d2e3e644ea6")] },

  { id: "omsa-ne", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 6.2, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 0, farnostId: "tn-mesto",
    ukat: "omsa", cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Nedeľná svätá omša 10:30", lok: "Trenčín · farský kostol", overena: true,
    badgeL: "⛪ OMŠA", tag: "Udalosť", emoji: "⛪",
    popis: "Nedeľa 10:30 · veľká omša. Dobrovoľná omšová zbierka.",
    pribeh: "Pravidelná nedeľná veľká omša z rozvrhu. K omši sa automaticky generuje omšová zbierka (settlement € na farský účet, close 23:59). Omša nemá RSVP — chodí sa bez prihlásenia, má len pripomienku (§8).",
    fotky: [U("photo-1438032005730-c779502df39b")] },

  { id: "put-levoca", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 6.5, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 5, podpora: 41, farnostId: "tn-mesto",
    ukat: "put", rsvp: true, cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Farská púť do Levoče", lok: "Trenčín → Levoča", overena: true,
    badgeL: "🚌 PÚŤ", tag: "Udalosť", emoji: "⛰",
    popis: "Sobota · spoločná púť autobusom. Prihlás sa a rezervuj miesto.",
    pribeh: "Spoločná púť do Levoče. Voliteľná zbierka na dopravu, kapacita autobusu obmedzená → prihlás sa (RSVP + počet).",
    vyzbierane: 480, ciel: 1200, fotky: [U("photo-1551632811-561732d1e306")] },

  { id: "ohlasky", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.4, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 1, podpora: 0, farnostId: "tn-mesto",
    ukat: "oznam", cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Ohlášky — Peter a Mária", lok: "Trenčín · centrum", overena: true,
    badgeL: "💍 OHLÁŠKY", tag: "Oznam", emoji: "💍",
    popis: "Sviatosť manželstva si vyslúžia Peter N. a Mária K. dňa 2. augusta.",
    pribeh: "Ohlášky pred sobášom — mená snúbencov a dátum sobáša. Bez zbierky, len oznam (Like + Zdieľať).",
    fotky: [U("photo-1606800052052-a08af7148866")] },

  { id: "jubileum", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.1, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 0, farnostId: "tn-mesto",
    ukat: "oznam", reakciaTyp: "blahozelanie", cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "90 rokov pani Heleny", lok: "Trenčín · centrum", overena: true,
    badgeL: "🎂 JUBILEUM", tag: "Oznam", emoji: "🎂",
    popis: "Naša farníčka Helena sa dožíva 90 rokov. Vyprosujeme jej hojnosť Božích milostí.",
    pribeh: "Jubilejný oznam — tvorí ho user (auto-publish, hlavička = meno usera z registrácie). Farár môže zmazať.",
    fotky: [U("photo-1551559347-b2df2a690bd5")] },

  { id: "modlitba", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.0, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 0, farnostId: "tn-mesto",
    ukat: "oznam", reakciaTyp: "modlitba", cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Prosba o modlitbu za chorých", lok: "Trenčín · centrum", overena: true,
    badgeL: "🕊 PROSBA O MODLITBU", tag: "Oznam", emoji: "🕊",
    popis: "Prosíme o modlitbu za našich chorých a trpiacich vo farnosti.",
    pribeh: "Prosba o modlitbu — tvorí ju user (auto-publish, hlavička = meno usera). Bez zbierky, len srdiečko a zdieľať. Reakcia = modlím sa (nie palec, nie Prispieť).",
    fotky: [U("photo-1478476868527-002ae3f3e159")] },

  { id: "pohreb", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", ntyp: "udalost",
    skore: 6.0, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 2, podpora: 27, farnostId: "tn-mesto",
    ukat: "pohreb", split: true, cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Rozlúčka — Ján Novák (†)", lok: "Trenčín · dom smútku", overena: true,
    badgeL: "🕯 POHREB", tag: "Udalosť", emoji: "🕯",
    popis: "S vďakou za jeho život. Pohrebná zbierka pre pozostalú rodinu.",
    pribeh: "Meno zosnulého + súhlas rodiny (nie zoznam účastníkov). Pohrebná zbierka so Split QR: väčšina rodine (pozostalí), malý dobrovoľný dar kostolu na sviečky a výzdobu. Predĺžené okno ~týždeň. Reakcia = kondolencia.",
    vyzbierane: 1340, ciel: 2500, fotky: [U("photo-1476900164809-ff19b8ae5968")] },

  { id: "brigada-fara", comp: "data", typ: "skutok", modul: "charity", kat: "Priroda", ntyp: "dobrovolnictvo",
    skore: 5.3, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 3, podpora: 9, farnostId: "tn-mesto",
    ukat: "brigada", rsvp: true, cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Trenčín — mesto",
    nazov: "Brigáda okolo fary", lok: "Trenčín · farská záhrada", overena: true,
    badgeL: "🙌 BRIGÁDA", tag: "Dobrovoľníctvo", emoji: "🧹",
    popis: "Sobota 9:00 · hľadáme 8 rúk na úpravu záhrady. Event QR = karma za účasť.",
    pribeh: "Organizované dobrovoľníctvo — event QR (proof-of-presence) → účastník dostane karmu za účasť. Karma ide človeku, nie farnosti (tá je mimo karmy).",
    fotky: [U("photo-1416879595882-3373a0480b5b")] },

  // ---- obsah ďalších farností (aby viac profilov malo reálne príspevky) ----
  { id: "organ-blumental", comp: "data", typ: "charita", modul: "charity", kat: "Komunita", ntyp: "zbierka",
    skore: 7.2, typSituacie: "normal", narodne: true, lat: 48.156, lng: 17.110, dni: 0, podpora: 156, farnostId: "ba-blumental",
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Bratislava — Blumentál",
    nazov: "Obnova historického organu", lok: "Bratislava · Blumentál", overena: true,
    badgeL: "🎹 ZBIERKA", tag: "Zbierka", emoji: "🎹",
    popis: "Náš organ z roku 1890 potrebuje generálnu opravu. Zbierame na reštaurovanie píšťal.",
    pribeh: "Historický organ je srdcom liturgickej hudby v Blumentáli. Reštaurovanie zahŕňa čistenie a ladenie píšťal, opravu mechaniky a mecha. Zbierka žije v engine Charita — transparentný účet, settlement € na farský účet.",
    vyzbierane: 7300, ciel: 24000, fotky: [U("photo-1673372316742-57c84d7e63c4")] },

  { id: "advent-blumental", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 6.1, typSituacie: "normal", lat: 48.156, lng: 17.110, dni: 4, podpora: 47, farnostId: "ba-blumental",
    ukat: "akcia", rsvp: true, cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Bratislava — Blumentál",
    nazov: "Adventný organový koncert", lok: "Bratislava · Blumentál", overena: true,
    badgeL: "🎶 UDALOSŤ", tag: "Udalosť", emoji: "🎶",
    popis: "Nedeľa 19:00 · koncert na obnovenom organe. Vstup voľný, dobrovoľný dar na obnovu.",
    pribeh: "Adventný koncert na historickom organe. Vstup voľný, dobrovoľný dar podporí reštaurovanie. Kapacita obmedzená — prihlás sa.",
    vyzbierane: 320, ciel: 1500, fotky: [U("photo-1673372316742-57c84d7e63c4")] },

  { id: "veza-zilina", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", ntyp: "zbierka",
    skore: 6.9, typSituacie: "normal", lat: 49.223, lng: 18.740, dni: 0, podpora: 98, farnostId: "za-mesto",
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Žilina — mesto",
    nazov: "Oprava Burianovej veže", lok: "Žilina · Mariánske nám.", overena: true,
    badgeL: "🏛 ZBIERKA", tag: "Zbierka", emoji: "🕰",
    popis: "Renesančná veža potrebuje statické zabezpečenie a nový ciferník hodín.",
    pribeh: "Burianova veža je dominantou Mariánskeho námestia. Zbierka pokrýva statické zabezpečenie muriva a reštaurovanie vežových hodín. Doklady o použití zverejňujeme.",
    vyzbierane: 4100, ciel: 16000, fotky: [U("photo-1608569569089-5d2e3e644ea6")] },

  { id: "omsa-zilina", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam",
    skore: 4.3, typSituacie: "normal", lat: 49.223, lng: 18.740, dni: 1, podpora: 0, farnostId: "za-mesto",
    ukat: "oznam", cirkev: "Rímskokatolícka cirkev v SR", komunita: "Farnosť Žilina — mesto",
    nazov: "Zmena času večerných omší", lok: "Žilina · centrum", overena: true,
    badgeL: "📢 OZNAM", tag: "Oznam", emoji: "📢",
    popis: "Od pondelka sú večerné sväté omše o 18:00 (predtým 17:30).",
    pribeh: "Oznam farnosti: od pondelka sa večerné sväté omše presúvajú na 18:00. Ranné a nedeľné časy zostávajú bez zmeny.",
    fotky: [U("photo-1477672680933-0287a151330e")] },

  { id: "koncert-dom", comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "udalost",
    skore: 6.4, typSituacie: "normal", lat: 48.720, lng: 21.258, dni: 6, podpora: 73, farnostId: "ke-dom",
    ukat: "akcia", rsvp: true, cirkev: "Rímskokatolícka cirkev v SR", komunita: "Dóm sv. Alžbety Košice",
    nazov: "Nočná prehliadka Dómu", lok: "Košice · Dóm sv. Alžbety", overena: true,
    badgeL: "🕯 UDALOSŤ", tag: "Udalosť", emoji: "🕯",
    popis: "Sobota 20:00 · komentovaná prehliadka katedrály pri sviečkach.",
    pribeh: "Komentovaná večerná prehliadka najväčšieho chrámu na Slovensku — krypta, kráľovské oratórium, oltár sv. Alžbety. Dobrovoľný dar na údržbu. Kapacita obmedzená.",
    vyzbierane: 610, ciel: 2000, fotky: [U("photo-1705686824412-af5d904d4d96")] },

  { id: "restaur-dom", comp: "data", typ: "charita", modul: "charity", kat: "Komunita", ntyp: "zbierka",
    skore: 7.4, typSituacie: "normal", narodne: true, lat: 48.720, lng: 21.258, dni: 0, podpora: 289, farnostId: "ke-dom",
    cirkev: "Rímskokatolícka cirkev v SR", komunita: "Dóm sv. Alžbety Košice",
    nazov: "Reštaurovanie hlavného oltára", lok: "Košice · celé SR", overena: true,
    badgeL: "🏛 ZBIERKA", tag: "Zbierka", emoji: "🖼",
    popis: "Neskorogotický oltár sv. Alžbety je unikát Európy. Zbierame na reštaurovanie tabúľ.",
    pribeh: "Krídlový oltár sv. Alžbety patrí medzi najvzácnejšie na svete. Zbierka pokrýva odborné reštaurovanie maľovaných tabúľ pod dohľadom pamiatkarov. Národná zbierka — prispieva celé Slovensko.",
    vyzbierane: 26800, ciel: 60000, fotky: [U("photo-1617955032003-2d9853c31b39")] },
];

// HLADAJ_DATA (index vyhľadávania) je definovaný nižšie — potrebuje FARNOSTI (farnost-* záznamy).

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
  sledovatelia?: number;  // počet sledujúcich (stat riadok / správcovský prehľad)
  kontakt?: { adresa?: string; tel?: string; email?: string; web?: string };  // editovateľné v správe
  omseSuhrn?: string;     // krátky súhrn časov omší (rozvrh žije v Kalendári) — editovateľné
}

export const FARNOSTI: Farnost[] = [
  { id: "tn-mesto", nazov: "Farnosť Trenčín — mesto", cirkev: "Rímskokatolícka cirkev v SR", skratka: "RKC",
    obec: "Trenčín", kostol: "Kostol Narodenia Panny Márie", farar: "Mgr. Jozef Halčin", zalozena: "1069",
    lat: 48.894, lng: 18.046, vzdial: "0,4 km", foto: U("photo-1611859732483-07bd0d5e3c50"),
    popis: "Najstaršia trenčianska farnosť pri farskom kostole nad mestom. Spravuje historický kostol, kaplnky a cintorín. Doklady o použití prostriedkov zverejňujeme — systém je tvoj svedok.",
    vyzbierane: 5100, ciel: 20000, podpora: 214, sledovatelia: 1240,
    kontakt: { adresa: "Marka Aurela 6, 911 01 Trenčín", tel: "+421 32 743 12 34", email: "fara@trencin-mesto.sk", web: "trencin-mesto.fara.sk" },
    omseSuhrn: "Ne 7:30 · 10:30 · Št 18:00 · Pi 18:00" },
  { id: "tn-juh", nazov: "Farnosť Trenčín — Juh", cirkev: "Rímskokatolícka cirkev v SR", skratka: "RKC",
    obec: "Trenčín", kostol: "Kostol Svätej rodiny", farar: "Mgr. Peter Kováč", zalozena: "1994",
    lat: 48.876, lng: 18.030, vzdial: "2,3 km", foto: U("photo-1609064982451-a423f691061b"),
    popis: "Sídlisková farnosť na juhu mesta. Živé spoločenstvo rodín, mládeže a birmovancov.",
    vyzbierane: 2100, ciel: 8000, podpora: 96, sledovatelia: 540,
    kontakt: { adresa: "Východná 14, 911 08 Trenčín", email: "juh@fara.sk" }, omseSuhrn: "Ne 8:00 · 10:00 · So 18:00" },
  { id: "tn-opatova", nazov: "Farnosť Opatová nad Váhom", cirkev: "Rímskokatolícka cirkev v SR", skratka: "RKC",
    obec: "Trenčín — Opatová", kostol: "Kostol sv. Gorazda", farar: "Mgr. Ján Bielik", zalozena: "1332",
    lat: 48.918, lng: 18.066, vzdial: "4,1 km", foto: U("photo-1608569569089-5d2e3e644ea6"),
    popis: "Prímestská farnosť s históriou od stredoveku. Malá komunita, veľká súdržnosť.",
    vyzbierane: 740, ciel: 5000, podpora: 38, sledovatelia: 190, omseSuhrn: "Ne 9:00 · St 17:30" },
  { id: "tn-gkc", nazov: "Gréckokatolícka farnosť Trenčín", cirkev: "Gréckokatolícka cirkev na Slovensku", skratka: "GKC",
    obec: "Trenčín", farar: "o. Peter Micheľ", lat: 48.905, lng: 18.030, vzdial: "1,1 km", foto: U("photo-1690406615784-38ca7a2000fa"),
    popis: "Malá živá komunita východného obradu. Pravidelné sväté liturgie a spoločenstvo rodín.",
    vyzbierane: 820, ciel: 4000, podpora: 44, sledovatelia: 210, omseSuhrn: "Ne 9:30 (sv. liturgia)" },
  { id: "ecav-tn", nazov: "CZ ECAV Trenčín", cirkev: "Evanjelická cirkev augsburského vyznania na Slovensku", skratka: "ECAV",
    obec: "Trenčín", farar: "Mgr. Eva Juríková", lat: 48.890, lng: 18.038, vzdial: "0,9 km", foto: U("photo-1609064982451-a423f691061b"),
    popis: "Evanjelický cirkevný zbor s bohatou hudobnou tradíciou — spevokol a komorný orchester.",
    vyzbierane: 1450, ciel: 6000, podpora: 73, sledovatelia: 360,
    kontakt: { email: "trencin@ecav.sk", web: "trencin.ecav.sk" }, omseSuhrn: "Ne 9:00 (služby Božie)" },
  { id: "bjb-tn", nazov: "Zbor BJB Trenčín", cirkev: "Bratská jednota baptistov v SR", skratka: "BJB",
    obec: "Trenčín", farar: "kazateľ Martin Uhrík", lat: 48.876, lng: 18.041, vzdial: "1,8 km", foto: U("photo-1630553229660-df21d9aaea7a"),
    popis: "Kongregačný zbor s dôrazom na prácu s mládežou a rodinami.",
    vyzbierane: 640, ciel: 3000, podpora: 31, sledovatelia: 140, omseSuhrn: "Ne 10:00 (bohoslužba)" },
  { id: "zob-ba", nazov: "Židovská náboženská obec Bratislava", cirkev: "Ústredný zväz židovských náboženských obcí v SR", skratka: "ÚZŽNO",
    obec: "Bratislava", lat: 48.148, lng: 17.107, vzdial: "126 km", foto: U("photo-1573233228413-920d74dd6564"),
    popis: "Komunita spravujúca synagógu a pamiatky. Medzináboženská solidarita — na obnovu prispievajú aj kresťanské farnosti.",
    vyzbierane: 9400, ciel: 18000, podpora: 128, sledovatelia: 820,
    kontakt: { adresa: "Kozia 18, 811 03 Bratislava", web: "uzzno.sk" } },

  // ---- ďalšie mestá a vyznania (adresár pôsobí plnohodnotne) ----
  { id: "ba-blumental", nazov: "Farnosť Bratislava — Blumentál", cirkev: "Rímskokatolícka cirkev v SR", skratka: "RKC",
    obec: "Bratislava", kostol: "Kostol Nanebovzatia Panny Márie", farar: "Mgr. Ľuboš Tvrdý", zalozena: "1885",
    lat: 48.156, lng: 17.110, vzdial: "121 km", foto: U("photo-1677181901045-fd614f10e60e"),
    popis: "Rušná mestská farnosť v centre Bratislavy. Denne viac omší, bohatá pastorácia a charitatívna práca.",
    vyzbierane: 12400, ciel: 30000, podpora: 512, sledovatelia: 2980,
    kontakt: { adresa: "Vazovova 8, 811 07 Bratislava", tel: "+421 2 5729 51 11", email: "info@blumental.sk", web: "blumental.sk" },
    omseSuhrn: "Ne 6:00 · 7:30 · 9:00 · 10:30 · 18:00 · denne 6:00 a 18:00" },
  { id: "ba-gkc", nazov: "Gréckokatolícka farnosť Bratislava", cirkev: "Gréckokatolícka cirkev na Slovensku", skratka: "GKC",
    obec: "Bratislava", kostol: "Katedrálny chrám Povýšenia sv. Kríža", farar: "o. Rastislav Čižik", zalozena: "2008",
    lat: 48.145, lng: 17.128, vzdial: "124 km", foto: U("photo-1690406615784-38ca7a2000fa"),
    popis: "Sídlo bratislavskej eparchie. Spoločenstvo východného obradu naprieč generáciami.",
    vyzbierane: 3100, ciel: 12000, podpora: 143, sledovatelia: 470, omseSuhrn: "Ne 8:00 · 10:00 · 17:00 (sv. liturgia)" },
  { id: "po-pravoslav", nazov: "Pravoslávna katedrála Prešov", cirkev: "Pravoslávna cirkev na Slovensku", skratka: "PC",
    obec: "Prešov", kostol: "Katedrálny chrám sv. Alexandra Nevského", farar: "prot. Michal Švajko", zalozena: "1950",
    lat: 49.000, lng: 21.239, vzdial: "298 km", foto: U("photo-1611859732483-07bd0d5e3c50"),
    popis: "Katedrálny chrám prešovskej pravoslávnej eparchie. Centrum východnej duchovnej tradície na Slovensku.",
    vyzbierane: 2400, ciel: 15000, podpora: 88, sledovatelia: 300, omseSuhrn: "Ne 9:00 (sv. liturgia) · So 17:00 (večiereň)" },
  { id: "za-mesto", nazov: "Farnosť Žilina — mesto", cirkev: "Rímskokatolícka cirkev v SR", skratka: "RKC",
    obec: "Žilina", kostol: "Kostol Najsvätejšej Trojice", farar: "Mgr. Marián Dobeš", zalozena: "1400",
    lat: 49.223, lng: 18.740, vzdial: "82 km", foto: U("photo-1608569569089-5d2e3e644ea6"),
    popis: "Farnosť pri renesančnej katedrále na Mariánskom námestí. Historická Burianova veža a živé mestské spoločenstvo.",
    vyzbierane: 6800, ciel: 22000, podpora: 267, sledovatelia: 1120,
    kontakt: { adresa: "Farská 6, 010 01 Žilina", email: "zilina.mesto@fara.sk", web: "farazilina.sk" },
    omseSuhrn: "Ne 7:00 · 9:00 · 10:30 · 18:00 · denne 6:30 a 18:00" },
  { id: "ke-dom", nazov: "Dóm sv. Alžbety Košice", cirkev: "Rímskokatolícka cirkev v SR", skratka: "RKC",
    obec: "Košice", kostol: "Katedrála sv. Alžbety", farar: "Mgr. Allan Tomáš", zalozena: "1230",
    lat: 48.720, lng: 21.258, vzdial: "312 km", foto: U("photo-1677181901045-fd614f10e60e"),
    popis: "Najväčší chrám na Slovensku a najvýchodnejšia gotická katedrála Európy. Farnosť pri Dóme sv. Alžbety.",
    vyzbierane: 18200, ciel: 45000, podpora: 640, sledovatelia: 3540,
    kontakt: { adresa: "Hlavná 26, 040 01 Košice", tel: "+421 55 622 15 55", web: "dom.rimkat.sk" },
    omseSuhrn: "Ne 8:00 · 10:00 · 11:30 · 18:00 · denne 7:00 a 18:00" },
  { id: "nr-katedrala", nazov: "Nitrianska katedrála", cirkev: "Rímskokatolícka cirkev v SR", skratka: "RKC",
    obec: "Nitra", kostol: "Bazilika sv. Emeráma", farar: "Mgr. Ondrej Borsík", zalozena: "880",
    lat: 48.317, lng: 18.088, vzdial: "58 km", foto: U("photo-1611859732483-07bd0d5e3c50"),
    popis: "Katedrála na Nitrianskom hrade — kolíska kresťanstva na Slovensku. Miesto s viac než tisícročnou tradíciou.",
    vyzbierane: 9600, ciel: 28000, podpora: 384, sledovatelia: 1460, omseSuhrn: "Ne 9:00 · 10:30 · 18:00" },
  { id: "bb-ecav", nazov: "CZ ECAV Banská Bystrica", cirkev: "Evanjelická cirkev augsburského vyznania na Slovensku", skratka: "ECAV",
    obec: "Banská Bystrica", kostol: "Evanjelický kostol", farar: "Mgr. Samuel Linkesch", zalozena: "1807",
    lat: 48.736, lng: 19.146, vzdial: "118 km", foto: U("photo-1609064982451-a423f691061b"),
    popis: "Klasicistický evanjelický kostol v centre mesta. Zbor s dlhou tradíciou vzdelávania a hudby.",
    vyzbierane: 2900, ciel: 10000, podpora: 121, sledovatelia: 430,
    kontakt: { email: "bystrica@ecav.sk" }, omseSuhrn: "Ne 9:00 · 10:30 (služby Božie)" },
  { id: "za-cb", nazov: "Cirkev bratská Žilina", cirkev: "Cirkev bratská v SR", skratka: "CB",
    obec: "Žilina", farar: "kazateľ Daniel Jurčo", zalozena: "1992",
    lat: 49.216, lng: 18.734, vzdial: "83 km", foto: U("photo-1630553229660-df21d9aaea7a"),
    popis: "Otvorené spoločenstvo s dôrazom na štúdium Biblie, mládež a rodiny. Moderné bohoslužby s hudbou.",
    vyzbierane: 1180, ciel: 5000, podpora: 64, sledovatelia: 260, omseSuhrn: "Ne 10:00 (bohoslužba)" },
  { id: "ke-refo", nazov: "Reformovaný zbor Košice", cirkev: "Reformovaná kresťanská cirkev na Slovensku", skratka: "RKC-r",
    obec: "Košice", kostol: "Kalvínsky kostol", farar: "Mgr. Ladislav Orémus", zalozena: "1891",
    lat: 48.724, lng: 21.261, vzdial: "313 km", foto: U("photo-1690406615784-38ca7a2000fa"),
    popis: "Reformovaný (kalvínsky) cirkevný zbor s maďarsky aj slovensky hovoriacim spoločenstvom.",
    vyzbierane: 940, ciel: 6000, podpora: 47, sledovatelia: 180, omseSuhrn: "Ne 10:00 (bohoslužba)" },

  // ---- po jednej farnosti/zbore pre zvyšné registrované cirkvi (adresár = reálne prepínateľný) ----
  { id: "ba-ecm", nazov: "Zbor ECM Bratislava — Staré Mesto", cirkev: "Evanjelická cirkev metodistická, Slovenská oblasť", skratka: "ECM",
    obec: "Bratislava", farar: "kazateľ Pavel Procházka", zalozena: "1924",
    lat: 48.147, lng: 17.112, vzdial: "122 km", foto: U("photo-1609064982451-a423f691061b"),
    popis: "Metodistický zbor v centre Bratislavy. Dôraz na praktickú vieru, sociálnu prácu a otvorené spoločenstvo.",
    vyzbierane: 520, ciel: 3000, podpora: 27, sledovatelia: 110, omseSuhrn: "Ne 10:30 (bohoslužba)" },
  { id: "tn-acs", nazov: "Zbor ACS Trenčín", cirkev: "Apoštolská cirkev na Slovensku", skratka: "ACS",
    obec: "Trenčín", farar: "pastor Marek Gajdoš", zalozena: "1998",
    lat: 48.882, lng: 18.052, vzdial: "2,9 km", foto: U("photo-1630553229660-df21d9aaea7a"),
    popis: "Letničný zbor s modernými chválami a prácou s mládežou. Stretnutia v komunitnom centre.",
    vyzbierane: 380, ciel: 2500, podpora: 19, sledovatelia: 95, omseSuhrn: "Ne 10:00 (zhromaždenie)" },
  { id: "tn-kz", nazov: "Kresťanský zbor Trenčín", cirkev: "Kresťanské zbory na Slovensku", skratka: "KZ",
    obec: "Trenčín", zalozena: "1921",
    lat: 48.885, lng: 18.035, vzdial: "3,4 km", foto: U("photo-1608569569089-5d2e3e644ea6"),
    popis: "Bratské zhromaždenie s dôrazom na spoločné štúdium Písma a vzájomnú službu.",
    vyzbierane: 240, ciel: 2000, podpora: 14, sledovatelia: 60, omseSuhrn: "Ne 9:30 (pamiatka Pánova)" },
  { id: "tn-casd", nazov: "Zbor CASD Trenčín", cirkev: "Cirkev adventistov siedmeho dňa", skratka: "CASD",
    obec: "Trenčín", farar: "kazateľ Daniel Márföldi", zalozena: "1950",
    lat: 48.892, lng: 18.055, vzdial: "2,1 km", foto: U("photo-1611859732483-07bd0d5e3c50"),
    popis: "Adventistický zbor — sobotné bohoslužby, zdravotná osveta a klub Pathfinder pre deti.",
    vyzbierane: 460, ciel: 3000, podpora: 22, sledovatelia: 105, omseSuhrn: "So 9:30 (sobotná škola) · 11:00" },
  { id: "ba-ccsh", nazov: "Náboženská obec CČSH Bratislava", cirkev: "Cirkev československá husitská na Slovensku", skratka: "CČSH",
    obec: "Bratislava", farar: "far. Jana Šmardová", zalozena: "1923",
    lat: 48.150, lng: 17.115, vzdial: "123 km", foto: U("photo-1677181901045-fd614f10e60e"),
    popis: "Husitská náboženská obec nadväzujúca na českú reformáciu. Liturgia v zrozumiteľnom jazyku.",
    vyzbierane: 180, ciel: 1500, podpora: 9, sledovatelia: 45, omseSuhrn: "Ne 9:00 (liturgia)" },
  { id: "ba-lds", nazov: "Zbor LDS Bratislava", cirkev: "Cirkev Ježiša Krista Svätých neskorších dní v SR", skratka: "LDS",
    obec: "Bratislava", zalozena: "2006",
    lat: 48.160, lng: 17.120, vzdial: "125 km", foto: U("photo-1609064982451-a423f691061b"),
    popis: "Zbor Cirkvi Ježiša Krista Svätých neskorších dní — nedeľné zhromaždenia a rodinné programy.",
    vyzbierane: 150, ciel: 1200, podpora: 8, sledovatelia: 40, omseSuhrn: "Ne 10:00 (zhromaždenie)" },
  { id: "tn-js", nazov: "Zbor Jehovových svedkov Trenčín", cirkev: "Náboženská spoločnosť Jehovovi svedkovia v SR", skratka: "JS",
    obec: "Trenčín", zalozena: "1993",
    lat: 48.870, lng: 18.045, vzdial: "3,8 km", foto: U("photo-1630553229660-df21d9aaea7a"),
    popis: "Zbor so stretnutiami v sále Kráľovstva — biblické prednášky a spoločné štúdium.",
    vyzbierane: 90, ciel: 1000, podpora: 6, sledovatelia: 35, omseSuhrn: "Ne 10:00 · St 18:30" },
  { id: "ba-nac", nazov: "Novoapoštolský zbor Bratislava", cirkev: "Novoapoštolská cirkev v SR", skratka: "NAC",
    obec: "Bratislava", zalozena: "1991",
    lat: 48.152, lng: 17.108, vzdial: "124 km", foto: U("photo-1690406615784-38ca7a2000fa"),
    popis: "Novoapoštolské spoločenstvo s pravidelnou nedeľnou bohoslužbou a hudobnou službou.",
    vyzbierane: 120, ciel: 1000, podpora: 7, sledovatelia: 30, omseSuhrn: "Ne 9:30 (bohoslužba)" },
  { id: "ba-skc", nazov: "Farnosť SKC Bratislava", cirkev: "Starokatolícka cirkev na Slovensku", skratka: "SKC",
    obec: "Bratislava", farar: "far. Augustín Bačinský", zalozena: "1995",
    lat: 48.144, lng: 17.104, vzdial: "122 km", foto: U("photo-1611859732483-07bd0d5e3c50"),
    popis: "Starokatolícka farnosť — katolícka tradícia so synodálnou správou a otvoreným prístupom.",
    vyzbierane: 210, ciel: 1800, podpora: 11, sledovatelia: 50, omseSuhrn: "Ne 10:00 (sv. omša)" },
  { id: "ba-bs", nazov: "Bahájske spoločenstvo Bratislava", cirkev: "Bahájske spoločenstvo v SR", skratka: "BS",
    obec: "Bratislava", zalozena: "2007",
    lat: 48.149, lng: 17.113, vzdial: "121 km", foto: U("photo-1573233228413-920d74dd6564"),
    popis: "Bahájske spoločenstvo — modlitebné stretnutia, štúdium a medzináboženský dialóg.",
    vyzbierane: 80, ciel: 800, podpora: 5, sledovatelia: 25 },
];

export const FARNOST_PODLA_ID = (id?: string): Farnost | undefined => FARNOSTI.find((f) => f.id === id);

// farnosti scopnuté podľa zvolenej cirkvi/vyznania (§10: nie všetky vyznania v jednom zozname)
export const farnostiCirkvi = (cirkevMeno: string): Farnost[] => FARNOSTI.filter((f) => f.cirkev === cirkevMeno);

// komunita (text vo feede) → farnostId (fallback, ak položka nemá vlastný farnostId)
export const KOMUNITA_FARNOST: Record<string, string> = {
  "Farnosť Trenčín — mesto": "tn-mesto",
  "Farnosť Trenčín": "tn-gkc",
  "CZ ECAV Trenčín": "ecav-tn",
  "Zbor BJB Trenčín": "bjb-tn",
  "Židovská obec Bratislava": "zob-ba",
};
export const farnostIdOf = (it: NabozFeedItem): string => it.farnostId ?? KOMUNITA_FARNOST[it.komunita ?? ""] ?? "";

// ---- vlastné (publikované) príspevky — perzistované v localStorage per farnosť ----
// PridatSheet po „Publikovať" uloží reálnu položku; feedy/taby/kalendár ju čítajú
// cez obsahFarnosti (vlastné navrchu — najnovšie prvé). Mock bez backendu.
export const vlastnePrispevky = (fid: string): NabozFeedItem[] =>
  nacitajStav<NabozFeedItem[]>("prispevky", fid, []).filter(oznamAktivny); // TTL §8b — expirované z feedu von, záznam ostáva
export function pridajPrispevok(fid: string, it: NabozFeedItem) { ulozStav("prispevky", fid, [it, ...nacitajStav<NabozFeedItem[]>("prispevky", fid, [])]); }
// mazanie cez farára („farár môže zmazať" — auto-publish poistka): REÁLNE odstráni
// záznam z úložiska (aj expirovaný — preto raw zoznam bez TTL filtra).
export const vlastnePrispevkyVsetky = (fid: string): NabozFeedItem[] =>
  nacitajStav<NabozFeedItem[]>("prispevky", fid, []);
export function zmazPrispevok(fid: string, id: string) {
  ulozStav("prispevky", fid, vlastnePrispevkyVsetky(fid).filter((it) => it.id !== id));
}
// úprava publikovaného príspevku (farár: „Upraviť" v moderácii · „Pridať zbierku" na parte)
export function upravPrispevok(fid: string, id: string, patch: Partial<NabozFeedItem>) {
  ulozStav("prispevky", fid, vlastnePrispevkyVsetky(fid).map((it) => (it.id === id ? { ...it, ...patch } : it)));
}
/** Vlastný (publikovaný cez appku) príspevok = jediný, ktorý sa dá reálne zmazať — demo obsah z mocku nie. */
export const jeVlastnyPrispevok = (fid: string, id: string): boolean =>
  vlastnePrispevkyVsetky(fid).some((it) => it.id === id);
export const obsahFarnosti = (fid: string): NabozFeedItem[] =>
  [...vlastnePrispevky(fid), ...FEED_ITEMS.filter((it) => farnostIdOf(it) === fid)];

// odvodené počty obsahu farnosti — stat riadok karty · počty v taboch profilu · správcovský prehľad
export interface FarnostStat { zbierky: number; udalosti: number; oznamy: number; dobro: number; spolu: number; }
export const farnostStat = (fid: string): FarnostStat => {
  const o = obsahFarnosti(fid);
  const poc = (t: NabozTyp) => o.filter((it) => it.ntyp === t).length;
  return { zbierky: poc("zbierka"), udalosti: poc("udalost"), oznamy: poc("oznam"), dobro: poc("dobrovolnictvo"), spolu: o.length };
};

// parser orientačnej vzdialenosti "X,Y km" → číslo (zoradenie adresára „najbližšie ku mne")
export const kmNum = (v: string): number => parseFloat(v.replace(",", ".")) || 0;

// vyznanie (skratka jednej z 18 cirkví) → rodina/faseta v adresári (mapovanie z CIRKVI)
export const rodinaCirkvi = (cirkevMeno: string): string =>
  CIRKVI.find((s) => s.polozky.some((p) => p.meno === cirkevMeno))?.rodina ?? "Ostatné";
export const rodinaZoSkratky = (skratka: string): string =>
  CIRKVI.find((s) => s.polozky.some((p) => p.skratka === skratka))?.rodina ?? "";

// ---- index pre vyhľadávanie (obsah feedu + konkrétne kostoly/farnosti + adresár vyznaní) ----
// Hľadanie NÁJDE čokoľvek naprieč vierami (§5 mäkká stena: default skrýva, hľadanie nájde).
//  · farnost-* → otvorí profil konkrétneho kostola   · cirkev-* → fasetuje adresár podľa vyznania
export const HLADAJ_DATA: HladanieZaznam[] = [
  ...FEED_ITEMS.map((it) => ({
    id: it.id, titul: it.nazov || "", podtitul: `${it.komunita || it.cirkev} · ${it.lok || ""}`,
    kat: TYP_CHIP[it.ntyp], emoji: it.emoji || "⛪", tag: it.tag || "",
  })),
  ...FARNOSTI.map((f) => ({
    id: "farnost-" + f.id, titul: f.nazov, podtitul: `${f.cirkev} · ${f.obec}`, kat: "Kostoly", emoji: "⛪", tag: "overená",
  })),
  ...CIRKVI_FLAT.map((c) => ({
    id: "cirkev-" + c.skratka, titul: c.meno, podtitul: c.rodina, kat: "Cirkvi", emoji: "⛪", tag: "overená",
  })),
];

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

// farársky variant pre zdieľaný SplitQrSheet (Split bežec, 6.7.2026): nadpis „Rozdeliť dar",
// vlastník = rodina (dostane zvyšok), predvyplnený kostol na 5 % (odstrániteľný). V Náboženstve
// minPct=0 → 0 % povolené (kostolný podiel je dobrovoľný dar — 0 % = nepridá sa, žiadna hláška).
// Žiadna fronta — delí sa výnos JEDNEJ zbierky. Krok 5 %, % sa po vytvorení zafixujú.
export function farskySplitVariant(kind: "pohreb" | "svadba" = "pohreb"): SplitVariant {
  const lab = SPLIT_LABELY[kind];
  return {
    nadpis: "Rozdeliť dar",
    emoji: kind === "pohreb" ? "🕯" : "💍",
    podnadpis: "Rodina nastaví lištou · kostolný podiel je dobrovoľný dar (0 % ok)",
    ownerLabel: lab.rodina,
    minPct: 0, // Náboženstvo: 0 % povolené, žiadna hláška o minime
    preset: [{ id: "kostol", komu: lab.kostol, pct: 5 }], // odstrániteľný (bez pinned)
    qrPopis: "Rozdelenie daru medzi príjemcov (farársky Split QR)",
    labely: {
      // §delta bod 1: preč „cico / zvyšok / ide ďalej" — rodina je hlavný príjemca, nie „zvyšok"
      ownerHead: `${lab.rodina.toUpperCase()} — HLAVNÝ PRÍJEMCA`,
      ownerIcon: kind === "pohreb" ? "🕯" : "💍",
      targetHead: "KOSTOLU / ĎALŠÍ PRÍJEMCA — KOMU KOĽKO",
      emptyText: "Rodina nechce dať kostolu — v poriadku, kostol nepridá. Prípadne pridaj charitu/žiadosť nižšie.",
      addPlaceholder: "Pridať charitu / žiadosť…",
      pinnedBadge: "KOSTOL",
    },
  };
}

// ---- kontextový text reakcie-srdiečka (§ delta bod 2) ----
// Srdiečko je jediná reakcia modulu (NIE palec — ten ostáva v Core). Význam sa mení
// podľa typu príspevku: pohreb/úmrtie/smútočné = kondolencia, prosba o modlitbu = „modlím sa".
export function reakciaToast(z: NabozFeedItem): string {
  const typ: ReakciaTyp = z.reakciaTyp ?? (z.ukat === "pohreb" ? "kondolencia" : "srdce");
  switch (typ) {
    case "kondolencia": return "🕯 Kondolencia odoslaná";
    case "modlitba": return "🙏 Modlím sa";
    case "blahozelanie": return "❤ Blahoželáme";
    default: return "❤";
  }
}
