/* =============================================================================
 * DEED — doménové TypeScript typy odvodené z MOCK dátových polí
 * Zdroje: Good, Help, Charita, Aktivity, Top, Mapa, lib/feed, lib/cardSize,
 *         shared (SUBJEKTY/QR_TYPY/HL_FILTRE/OKRUH_POPIS)
 *
 * Pozn.: polia s `?` sú voliteľné. Moduly majú vlastný „slovník" (Good = SK
 * titul/popis/velkost, Aktivity = EN title/desc/size) — preto ich NEzjednocujeme
 * do jedného tvaru, ale do entít so spoločným feed-engine základom.
 * ========================================================================== */

/* 0) ZÁKLADNÉ DOMÉNOVÉ UNION LITERÁLY */

/** Kategória skutku/feedu (KAT v Good; Charita pridáva "Zdravie2"). */
export type Kategoria = "Komunita" | "Priroda" | "Zdravie" | "Ucenie" | "Pomoc" | "Zdravie2";

/** Doména modulu Aktivity (DOM v Aktivity). */
export type Domena = "mix" | "sport" | "art" | "learn" | "eko" | "zdravie";

/** Typ situácie — krízový režim (SOS) prebíja prah aj veľkosť karty. */
export type TypSituacie = "normal" | "kriza";

/** Engine typ položky (rozhoduje o triedení a frekvenčnom strope). */
export type EngineTyp = "skutok" | "ziadost" | "charita";

/** Typ položky v Good feede. */
export type GoodTyp = "skutok" | "ziadost" | "charita";

/** Typ položky v Help feede. */
export type HelpTyp = "ziadost" | "ponuka" | "charity";

/** Typ položky v Aktivity feede (SEED_ITEMS.type). */
export type AktivitaTyp = "skutok" | "talent" | "workshop" | "help" | "case";

/** Modul, z ktorého položka pochádza (pre frekvenčný strop + štatistiky). */
export type Modul = "good" | "help" | "charity" | "workshop";

/** Druh média na karte. */
export type Media = "video" | "foto" | "kreslene";

/** Menný rozmer karty (UI). `req` = žiadosť; `velka/stredna/riadok` = Help slovník. */
export type Velkost = "big" | "med" | "small" | "req" | "velka" | "stredna" | "riadok";

/** Rozmer karty v module Aktivity (SEED_ITEMS.size). */
export type VelkostAktivita = "big" | "med" | "small" | "req";

/** Karma / level používateľa. */
export type Karma = "Novacik" | "Bronze" | "Silver" | "Gold" | "Legend";

/** Úroveň charity v adresári (lvlFarba v Charita). */
export type CharitaLevel = "Legend" | "Gold" | "Silver" | "Bronze";

/** Kód okruhu / rádiusu feedu (kľúče FEED_CFG.radiusy). */
export type OkruhKod = "stvrt" | "mesto" | "okres" | "kraj" | "krajina";

/** Úroveň okruhu na mape (UROVNE v Mapa) — zhodná s OkruhKod. */
export type MapaUroven = OkruhKod;

/** Platobný / podporný kanál. */
export type Kanal = "EUR" | "DEED" | "SMS";

/** Cena workshopu. */
export type CenaTyp = "free" | "paid";

/** Typ subjektu (cudzí profil §6). */
export type SubjektTyp = "osoba" | "org";

/** Zdroj feed karty (Good rozlišuje pôvod žiadosti/charity). */
export type Zdroj = "Help" | "Charity";

/* 1) GEO + FEED ENGINE (lib/feed, lib/cardSize) */

/** Geografický bod (lat/lng). */
export interface GeoBod {
  lat: number;
  lng: number;
}

/** Používateľ pre feed algoritmus — poloha + zvolený rádius (+ voliteľná personalizácia). */
export interface FeedPouzivatel extends GeoBod {
  radius: OkruhKod;
  /** kľúče záujmov (Good `kat` + Aktivity `dom`) — afinitná váha. */
  zaujmy?: Set<string>;
  /** mená sledovaných autorov — afinitná váha. */
  sledovani?: Set<string>;
}

/** Minimálne polia, ktoré feed algoritmus (pripravFeed) od každej položky očakáva. */
export interface FeedEngineMeta extends Partial<GeoBod> {
  /** engine typ — Good/Charita používa EngineTyp, Help pridáva "ponuka"/"charity" */
  typ: EngineTyp | "ponuka" | "charity";
  /** finálne skóre ~0–11; dominuje pri zoradení */
  skore: number;
  typSituacie: TypSituacie;
  modul?: Modul;
  kat?: Kategoria | Domena | string;
  /** národná kampaň — nie je viazaná na okruh */
  narodne?: boolean;
  /** vek skutku v dňoch */
  dni?: number;
  /** počet podporovateľov */
  podpora?: number;
  /** overené komunitou */
  overene?: boolean;
  /** explicitný kľúč skupiny pre frekvenčný strop */
  skupina?: string;
}

/** Polia pridané orchestrátorom pripravFeed/zoradFeed (interné, prefix `_`). */
export interface FeedEngineVystup {
  _riadky?: 0 | 1 | 2 | 3 | 4;
  _poradie?: number;
  _kriza?: boolean;
}

/** Konfigurácia jedného rádiusu (FEED_CFG.radiusy[*]). */
export interface RadiusKonfig {
  km: number;
  prah: number;
  label: string;
  krat: string;
}

/** Adaptívny prah podľa hustoty (FEED_CFG.hustota). */
export interface HustotaKonfig {
  veaPrah: number;
  maloPrah: number;
  krok: number;
  minPrah: number;
}

/** Váhy zoradenia feedu (FEED_CFG.vahy). */
export interface FeedVahy {
  skore: number;
  cerstvost: number;
  blizkost: number;
  podpora: number;
  /** personalizácia — afinita k záujmom/sledovaným (<< skore; len re-rank). */
  afinita?: number;
}

/** Celá konfigurácia feed algoritmu (FEED_CFG). */
export interface FeedKonfig {
  radiusy: Record<OkruhKod, RadiusKonfig>;
  hustota: HustotaKonfig;
  vahy: FeedVahy;
  podporaStrop: number;
  zivotnostDni: number;
  frekvencaMax: number;
}

/** Prahy veľkosti karty (FEED_CONFIG v cardSize). */
export interface CardSizeKonfig {
  prahFeed: number;
  prah2: number;
  prah3: number;
}

/* 2) SPOLOČNÝ ZÁKLAD FEED KARIET */

/** Spoločné autorské/identifikačné polia naprieč feedmi (SK varianta — Good). */
export interface FeedKartaZaklad extends FeedEngineMeta, FeedEngineVystup {
  id: number | string;
  autor?: string;
  lok?: string;
  cas?: string;
  num?: number;
  emoji?: string;
  fotky?: string[];
}

/* 3) MODUL GOOD (POLOZKY, KAT, EVENTS) */

/** Konfigurácia farieb jednej kategórie (KAT v Good). */
export interface KategoriaKonfig {
  c: string;
  bg: string;
  bg2: string;
  bd: string;
  label?: string;
}

/** Položka feedu v module Good (POLOZKY). */
export interface GoodPolozka extends FeedKartaZaklad {
  id: number;
  typ: GoodTyp;
  velkost: Velkost;
  kat: Kategoria;
  autor: string;
  num: number;
  emoji: string;
  media?: Media;
  overene?: boolean;
  zdroj?: Zdroj;
  topovane?: boolean;
  narodne?: boolean;
  charLevel?: CharitaLevel;
  pfp?: string;
  ini?: string;
  karma?: Karma;
  titul: string;
  popis: string;
  vyznam?: string;
  video?: string;
  suma?: number;
  lajky?: number;
  ciel?: number;
  vyzbierane?: number;
  pomocnici?: number;
  otvorenaPodpora?: boolean;
}

/** Zdroj udalosti na nástenke (SRC_COL v Good). */
export type UdalostZdroj = "Komunita" | "Mesto" | "Partner";

/** Udalosť na nástenke (EVENTS v Good). */
export interface Udalost {
  id: string;
  top?: boolean;
  when: string;
  title: string;
  who: string;
  src: UdalostZdroj;
  kat: Kategoria;
  desc: string;
  place: string;
  cap: string;
}

/* 4) MODUL HELP (MOCK_FEED, ZIVE_DARY) */

/** Sponzor (D++) žiadosti v Help. */
export interface Sponzor {
  meno: string;
  suma: number;
}

/** Položka Help feedu (MOCK_FEED). */
export interface HelpFeedItem extends FeedEngineMeta, Partial<GeoBod> {
  id: number;
  typ: HelpTyp;
  nazov: string;
  pribeh: string;
  ikona: string;
  velkost?: Extract<Velkost, "velka" | "stredna" | "riadok">;
  lok?: string;
  karma?: Karma;
  overeny?: boolean;
  odbornik?: boolean;
  sponzor?: boolean | Sponzor;
  suma?: number;
  ciel?: number;
  ludia?: number;
  fotky?: string[];
  avatar?: string;
}

/** Riadok živého tickera darov (ZIVE_DARY v Help). */
export interface ZivyDar {
  kto: string;
  co: string;
  komu: string;
}

/* 5) MODUL CHARITA (ZBIERKA, FEED_ITEMS, ADRESAR) */

/** Hlavná zbierka v detaile (ZBIERKA v Charita). */
export interface Zbierka {
  nazov: string;
  lok: string;
  karma: Karma;
  pribeh: string;
  suma: number;
  ciel: number;
  ludia: number;
  avatar: string;
  fotky: string[];
}

/** Ktorý komponent karty sa má vyrenderovať (FEED_ITEMS[*].comp). `data` = dátovo riadená karta. */
export type CharitaComp = "urgent" | "top" | "mala" | "zapoj" | "material" | "data";

/** Metadáta karty Charita feedu (FEED_ITEMS). */
export interface CharitaFeedItem extends FeedEngineMeta, Partial<GeoBod> {
  id: string;
  comp: CharitaComp;
  typ: EngineTyp;
  modul: Modul;
  kat: Kategoria;
  // voliteľný obsah pre dátovo riadenú kartu (comp: "data") — bez vlastného komponentu
  nazov?: string;
  popis?: string;
  emoji?: string;
  fotky?: string[];
  vyzbierane?: number;
  ciel?: number;
  overena?: boolean;
  tag?: string;
  badgeL?: string;
  lok?: string;
}

/** Položka adresára charít & OZ ako tuple: [skratka, názov, popis, level, ponuky]. */
export type AdresarPolozkaTuple = [
  skratka: string,
  nazov: string,
  popis: string,
  level: CharitaLevel,
  ponuky: string,
];

/** Objektová varianta adresárovej položky. */
export interface AdresarPolozka {
  skratka: string;
  nazov: string;
  popis: string;
  level: CharitaLevel;
  ponuky: string;
}

/** Sekcia adresára charít (ADRESAR[*]). */
export interface AdresarSekcia {
  sekcia: string;
  chipy: string[];
  polozky: AdresarPolozkaTuple[];
}

/* 6) MODUL AKTIVITY (SEED_ITEMS, BIOS, DOM, EVENTS) */

/** Konfigurácia jednej domény Aktivít (DOM v Aktivity). */
export interface DomenaKonfig {
  label: string;
  ic: string;
  c: string;
  bg: string;
  bd: string;
  tint: string;
}

/** Položka modulu Aktivity (SEED_ITEMS). EN slovník. */
export interface AktivitaItem {
  id: number;
  dom: Domena;
  type: AktivitaTyp;
  size: VelkostAktivita;
  title: string;
  desc: string;
  emoji: string;
  media?: Media;
  verified?: boolean;
  importance?: string;
  author?: string;
  ini?: string;
  pfp?: string;
  karma?: Karma;
  loc?: string;
  time?: string;
  num?: number;
  likes?: number;
  helpers?: number;
  price?: CenaTyp;
  priceTxt?: string;
  seats?: number;
  rating?: string;
  profi?: boolean;
  b2b?: boolean;
  source?: Zdroj;
  goal?: number;
  raised?: number;
  drr?: number;
  /** používateľský príspevok (lokálny, navrchu feedu) */
  mine?: boolean;
}

export type Talent = AktivitaItem & { type: "talent" };
export type Workshop = AktivitaItem & { type: "workshop" };
export type CharitaCase = AktivitaItem & { type: "case" };

/** Krátke bio známeho autora (BIOS). Kľúč = meno, hodnota = bio. */
export type BiosMapa = Record<string, string>;

/** Udalosť na nástenke Aktivít (EVENTS) — tuple [deň, čas, názov, miesto]. */
export type AktivitaUdalostTuple = [den: string, cas: string, nazov: string, miesto: string];

/** Mapa udalostí podľa domény (EVENTS; "mix" agreguje). */
export type AktivitaEvents = Record<Domena, AktivitaUdalostTuple[]>;

/** Odvodený profil osoby (osoba() v Aktivity). */
export interface OsobaProfilData {
  name: string;
  isMe: boolean;
  ini: string;
  pfp: string;
  karma: Karma;
  domains: Domena[];
  verified: boolean;
  profi: boolean;
  loc: string;
  bio: string;
  followers: number;
  following: number;
  skutky: number;
  items: AktivitaItem[];
}

/* 7) MODUL TOP (KATEGORIE) */

/** Subjekt cudzieho profilu (§6) — používa Top aj Good (autorSubjekt). */
export interface Subjekt {
  typ: SubjektTyp;
  meno: string;
  level: Karma | CharitaLevel;
  emoji?: string;
  lok?: string;
  stav?: string;
}

/** Položka rebríčka (KATEGORIE[*].polozky[*] v Top). */
export interface RebricekPolozka {
  meno: string;
  info: string;
  subjekt: Subjekt;
}

/** Kategória rebríčka (KATEGORIE v Top). */
export interface RebricekKategoria {
  hl: string;
  ic: unknown;
  col: string;
  polozky: RebricekPolozka[];
}

/** Rozsah rebríčka (ROZSAHY v Top). */
export type RebricekRozsah = "Štvrť" | "Mesto" | "Celá SR";

/* 8) MODUL MAPA (UROVNE, POCTY_KM, POCTY_UROVEN) */

export type UrovenTuple = [kod: MapaUroven, label: string];
export type Pocty = [skutky: number, udalosti: number];
export type PoctyKm = Record<1 | 2 | 3 | 4 | 5, Pocty>;
export type PoctyUroven = Record<Exclude<MapaUroven, "stvrt">, Pocty>;

/* 9) SHARED (SUBJEKTY, QR_TYPY, HL_FILTRE, OKRUH_POPIS) */

/** Filter vyhľadávacieho enginu (HL_FILTRE v shared). */
export type HladanieFilter =
  | "Všetko"
  | "Osoby"
  | "Firmy"
  | "Školitelia"
  | "Charity"
  | "Žiadosti Help"
  | "Žiadosti Charita"
  | "Udalosti";

/** Verejný dohľadateľný subjekt (SUBJEKTY v shared). */
export interface VerejnySubjekt {
  id: string;
  typ: Extract<HladanieFilter, "Firmy" | "Školitelia" | "Charity" | "Osoby">;
  titul: string;
  podtitul: string;
  emoji: string;
  tag: string;
}

/** Normalizovaný záznam pre HladanieModal (data prop). */
export interface HladanieZaznam {
  id: number | string;
  titul: string;
  podtitul: string;
  kat: string;
  emoji: string;
  tag: string;
}

/** Typ QR kódu (kľúče QR_TYPY v shared). */
export type QrTyp = "identita" | "platba" | "akcia" | "skutok";

/** Metadáta jedného typu QR (QR_TYPY[*]). */
export interface QrTypKonfig {
  rot: number;
  tag: string;
  popis: string;
  col: string;
}

/** Popisy okruhov pre OkruhVyber (OKRUH_POPIS v shared). */
export type OkruhPopis = Record<OkruhKod, string>;
