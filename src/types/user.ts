// ============================================================
// DEED · Doménové TS typy (dátová vrstva + MOCK dáta)
// Zdroje: lib/db, lib/pouzivatel, lib/session, Profil, CudziProfil,
//         Notifikacie, RetazDobra, FunZona
// Pozn.: stĺpce v DB sú snake_case, odvodené appkové objekty camelCase.
// ============================================================

export type Uuid = string;
export type IsoDateTime = string; // "2026-06-25T10:00:00.000Z"
export type IsoDate = string; // "2015-03-12"
export type HexFarba = string; // "#3A8DD6"

/** Typ účtu/subjektu (DB ucet.typ + demo identita).
 *  „pasivny" = prihlásený divák-darca: prezerá a prispieva (FIAT/karta)
 *  všade, ale NEsmie nič vytvárať/pridávať (gating cez Pouzivatel.mozeTvorit). */
export type TypUctu = "aktivny" | "pasivny" | "charita" | "demo";

/** Stav registrácie (§11 priebežné ukladanie). */
export type StavRegistracie = "zabezpecenie" | "udaje" | "hotovo" | string;

/** Režim zobrazenia profilu (zobrazenie.rezim). */
export type RezimZobrazenia = "cele" | "nick" | "anonym";

/** Plán balíka charity (ulozBalik, default "free"). */
export type PlanBalika = "free" | string;

/* DÁTOVÁ VRSTVA — lib/db (DB tvary, snake_case) */

/** Účet (tabuľka "ucet") — univerzálny základ (§4), osoba aj charita. */
export interface Ucet {
  id: Uuid;
  typ: TypUctu;
  auth_id?: Uuid | null; // väzba na Supabase Auth (auth.users.id); null pre staré telefón-účty
  telefon?: string;
  telefon_overeny?: boolean;
  email?: string | null;
  email_overeny?: boolean;
  poradove_cislo?: number | null;
  pin_hash?: string | null;
  biometria?: boolean;
  stav_registracie?: StavRegistracie;
  aktualizovane?: IsoDateTime;
  obnovene?: boolean;
}

/** Profil fyzickej osoby (tabuľka "profil"). */
export interface Profil {
  ucet_id: Uuid;
  meno?: string;
  druhe_meno?: string | null;
  priezvisko?: string;
  titul?: string | null;
  mesto?: string | null;
  profilovka_url?: string | null;
  aktualizovane?: IsoDateTime;
}

/** Zobrazenie / viditeľnosť (tabuľka "zobrazenie"). */
export interface Zobrazenie {
  ucet_id: Uuid;
  rezim: RezimZobrazenia;
  nick?: string | null;
}

/** Lokalita (tabuľka "lokalita"). */
export interface Lokalita {
  ucet_id: Uuid;
  mesto?: string | null;
  region?: string | null;
  stvrt?: string | null;
}

/** Organizácia / charita (tabuľka "organizacia"). */
export interface Organizacia {
  ucet_id: Uuid;
  nazov: string;
  sidlo?: string | null;
  ico?: string | null;
  [extra: string]: unknown;
}

/** Rozšírený profil charity (tabuľka "profil_charity"). */
export interface ProfilCharity {
  org_ucet_id: Uuid;
  [pole: string]: unknown;
}

/** Dar / pasívny dar (§2) — host bez účtu: ucet_id = null. */
export interface Dar {
  ucet_id?: Uuid | null;
  suma_eur: number;
  kanal: string;
  prijemca?: string | null;
  zobrazenie?: RezimZobrazenia;
}

/** KYC osoby (tabuľka "kyc") — Didit mock. */
export interface Kyc {
  ucet_id: Uuid;
  vendor: "mock" | string;
  vysledok: "sedi" | string;
  sposob: "nove" | string;
}

/** KYB charity (tabuľka "kyb") — register mock. */
export interface Kyb {
  org_ucet_id: Uuid;
  vendor: "mock" | string;
  vysledok: "overena" | string;
  stanovy_ref?: string | null;
  aml: "clean" | string;
}

/** Výsledok mock registra IČO (najdiIco) — KYB lookup. */
export interface RegistrIcoVysledok {
  ico: string;
  nazov: string;
  sidlo: string;
  datum_vzniku: IsoDate;
  pravna_forma: string;
}

/** Výsledok OTP (posliOtp) — DEMO SMS. */
export interface OtpVysledok {
  kod: string;
  demo: true;
}

/** Štatutár organizácie (tabuľka "statutar"). */
export interface Statutar {
  org_ucet_id: Uuid;
  osoba_ucet_id: Uuid | null;
  opravnenie: string;
}

/** Pobočka organizácie (tabuľka "pobocka"). */
export interface Pobocka {
  centrala_ucet_id: Uuid;
  mesto: string;
  rezim: RezimZobrazenia;
  ico?: string | null;
  bankovy_ucet?: string | null;
}

/** Balík / plán charity (tabuľka "balik"). */
export interface Balik {
  org_ucet_id: Uuid;
  plan: PlanBalika;
}

/** Položka záujmu osoby (tabuľka "zaujmy"). */
export interface Zaujem {
  ucet_id?: Uuid;
  oblast: string;
  pod_polozka: string;
  vlastny?: boolean;
}

/* PERSONALIZÁCIA — osobné signály (záujmy + sledovanie + podpora).
   Jeden zdroj pravdy pre prehľad „Môj DEED" a pre feed afinitu (lib/feed).
   Dnes localStorage (deed.me.*), neskôr Supabase (tabuľka "zaujmy" už existuje). */

/** Sledovaný subjekt. `meno` = stabilný kľúč (zhoduje sa s `autor` položiek feedu). */
export interface Sledovanie {
  meno: string;
  typ: "osoba" | "org";
  emoji?: string;
  tint?: string;
  od?: IsoDateTime;
}

/** Záznam podpory — snapshot progresu k momentu podpory (pre sekciu „Čo podporujem"). */
export interface Podpora {
  refId: number | string;
  typ: string;   // engine typ (skutok/ziadost/charita/udalost…)
  modul: string; // good/help/charity/workshop
  suma?: number; // kumulovaná podpora (v jednotke `kanal`)
  kanal?: string; // "DEED" | "EUR" — jednotka sumy (bez neho sa zobrazí ako DEED)
  komu?: string;
  vyzbierane?: number;
  ciel?: number;
  cas?: IsoDateTime;
}

/** Obľúbený príspevok (bookmark). Uložený lokálne (deed.me.oblubene) —
 *  zobrazí sa v „Môj DEED → Sledované"; klik otvorí detail príslušného modulu. */
export interface Oblubeny {
  refId: number | string;
  typ: string;   // engine typ (skutok/ziadost/charita/ponuka/udalost…)
  modul: string; // good/help/charity/workshop
  nazov: string;
  emoji?: string;
  lok?: string;
  vyzbierane?: number;
  ciel?: number;
}

/** Vyúčtovací doklad priložený k mojej zbierke. `url` = verejná Storage URL
 *  (keď je nahraný do bucketu `prispevky`); bez DB ostáva len názov súboru. */
export interface MojDoklad {
  nazov: string;
  url?: string;
  suma?: number;
  cas: IsoDateTime;
}

/** Zbierka, ktorú SOM vytvoril — spravuje sa v „Môj DEED" (ukončiť, vyúčtovať,
 *  poďakovať). Mock: žije lokálne (deed.me.zbierky). */
export interface MojaZbierka {
  id: string;
  nazov: string;
  modul: "good" | "help" | "charity" | "nabozenstvo";
  typ?: string;        // ziadost | charita | zbierka
  emoji?: string;
  lok?: string;
  ciel?: number;
  vyzbierane?: number;
  vytvorene: IsoDateTime;
  stav: "aktivna" | "ukoncena" | "vyuctovana";
  doklady?: MojDoklad[];
  dakovnaSprava?: string;
  dakovneVideo?: boolean;     // flag: video priložené
  dakovneVideoUrl?: string;   // verejná Storage URL videa (keď je DB)
}

/** Stav personalizačného store (usePersonalizacia). */
export interface PersonalizaciaStav {
  zaujmy: Zaujem[];
  sledovani: Sledovanie[];
  podpory: Podpora[];
  oblubene: Oblubeny[];
  mojeZbierky: MojaZbierka[];
  nacitavam: boolean;
}

/** Položka segmentu charity (tabuľka "segmenty"). */
export interface Segment {
  org_ucet_id?: Uuid;
  sektor: string;
  pod_segment?: string | null;
  vlastny?: boolean;
}

/** Dobrovoľníctvo charity (tabuľka "dobrovolnictvo"). */
export interface Dobrovolnictvo {
  org_ucet_id: Uuid;
  zaujem: boolean;
  typ: string[];
}

/** Súhlas (GDPR a pod.) (tabuľka "suhlasy"). */
export interface Suhlas {
  ucet_id: Uuid;
  druh: string;
  hodnota: boolean;
  detail?: string | null;
}

/** Položka číselníka po zoskupení (zoskup výstup). */
export interface CiselnikPolozka {
  hodnota: string;
  poradie?: number;
  od_balika?: PlanBalika;
  [extra: string]: unknown;
}

/** Skupina číselníka (nacitajCiselnikZaujmov / nacitajCiselnikSektorov). */
export interface Ciselnik {
  nazov: string;
  polozky: CiselnikPolozka[];
}

/** Agregovaný výsledok načítania účtu (nacitajUcetData). */
export interface UcetData {
  ucet: Pick<Ucet, "id" | "typ" | "poradove_cislo" | "email"> | null;
  profil: Pick<Profil, "meno" | "druhe_meno" | "priezvisko" | "titul" | "mesto" | "profilovka_url"> | null;
  zobrazenie: Pick<Zobrazenie, "rezim" | "nick"> | null;
  lokalita: Pick<Lokalita, "mesto" | "region" | "stvrt"> | null;
  organizacia: Pick<Organizacia, "nazov" | "sidlo"> | null;
}

/* SESSION — lib/session (localStorage "deed.session") */

export interface SessionRegistrovany {
  ucet_id?: Uuid; // pasívny divák-darca nemusí mať DB účet (anonym)
  typ: TypUctu;
  poradove_cislo?: number | null;
  meno?: string;
  demo?: false;
}

export interface SessionDemo {
  demo: true;
}

/** Session = registrovaný | demo | žiadna (null → registrácia §1). */
export type Session = SessionRegistrovany | SessionDemo | null;

/* POUŽÍVATEĽ — lib/pouzivatel (odvodený jeden zdroj pravdy) */

export interface Pouzivatel {
  demo: boolean;
  ucetId: Uuid | null;
  /** verejné číslo účtu U-… = kľúč osoby vo väzbách (lib/identita); bez účtu číslo zariadenia, nikdy meno */
  cisloUctu: string;
  typ: TypUctu;
  /** Smie vytvárať/pridávať obsah? Pasívny divák-darca = false (len prezerá + prispieva). */
  mozeTvorit: boolean;
  /** Smie platiť/prispievať v DEED (peňaženka)? Pasívny = false (len EUR; DEED vyžaduje účet). */
  mozeDeed: boolean;
  meno: string;
  priezvisko: string;
  celeMeno: string;
  iniciala: string;
  /** Profilová fotka (data-URL alebo URL); null = zobrazí sa iniciála. */
  foto: string | null;
  mesto: string;
  /** rod z profilu — len na tvar vety („Urobil / Urobila som"); bez neho mužský rod. TODO server: pole v profile */
  rod?: "muz" | "zena";
  poradoveCislo: number | null;
  rezim: RezimZobrazenia;
  nick: string | null;
  tier: string;
  tint: HexFarba;
  nacitavam: boolean;
  refresh?: () => Promise<void>;
  /** Nastaví/zmaže profilovú fotku (uloží lokálne + best-effort do DB). */
  nastavFoto?: (dataUrl: string | null) => void;
}

/* PROFIL (modul) — Profil.jsx */

export type PrevodTuple = [popis: string, suma: string, farba: HexFarba];

export interface ZiadostPriatelstvo {
  id: string;
  meno: string;
  ini: string;
  info: string;
}

export type MojSkutokTuple = [nazov: string, body: string, farba: HexFarba];

export type CestaPriatelstva = [
  emoji: string,
  titul: string,
  popis: string,
  poznamka: string,
  onClick: () => void,
];

export type ProfilScreen = "profil" | "wallet" | "sub" | "nastavenia" | "notif" | "priatelia";

export type RezimNastavenia = "verejny" | "anonym";

/* CUDZÍ PROFIL — CudziProfil.jsx (§6) */

export type TypSubjektu = "org" | "osoba";

export type StavOsoby = "bezna" | "priatel" | "tvorca";

export interface Kampan {
  nazov: string;
  vyzbierane: number;
  ciel: number;
  emoji: string;
}

export interface Akcia {
  kedy: string;
  nazov: string;
  kde: string;
}

export interface CudziSubjektOrg {
  typ: "org";
  meno?: string;
  level?: string;
  emoji?: string;
  lok?: string;
  kampane?: Kampan[];
  akcie?: Akcia[];
}

export interface CudziSubjektOsoba {
  typ?: "osoba";
  meno?: string;
  level?: string;
  stav?: StavOsoby;
}

export type CudziSubjekt = CudziSubjektOrg | CudziSubjektOsoba;

export type OrgTab = "Kampane" | "Skutky" | "Talent";

/* NOTIFIKÁCIE — Notifikacie.jsx (§8) */

export type NotifKat = "skutky" | "skupina" | "penaze" | "zbierky" | "ludia" | "deed" | "firma";
/** čiarová ikona oznamu (bez emoji) */
export type NotifIkona = "ok" | "srd" | "otaz" | "stit" | "ret" | "lud" | "kal" | "dok" | "ciel" | "sum" | "deed" | "namiet";
/** farba podľa typu: g = hotové/dobré · b = potrebuje akciu/info · gold = peniaze/zbierka/pozor */
export type NotifTon = "g" | "b" | "gold";
/** akcia priamo v ozname (bez otvárania) */
export type NotifAkciaKod = "odpovedat" | "bol" | "nebol" | "prijat" | "neskor" | "otvorit";
export interface Notifikacia {
  id: number;
  kat: NotifKat;
  ikona: NotifIkona;
  ton: NotifTon;
  titul: string;
  text: string;
  /** deň skupiny: Dnes · Včera · 27. 9. */
  den: string;
  cas: string;
  nove?: boolean;
  agg?: boolean;
  akcie?: NotifAkciaKod[];
  /** kontext akcie (AI sa pýta: skutok a otázky) */
  skutok?: { nazov: string; popis: string; otazky?: string[] };
}

export interface NotifKategoria {
  hl: string;
  polozky: string[];
}

export type VypnuteMapa = Record<string, boolean>;

export type NotifView = "zoznam" | "nastavenia";

/* REŤAZ DOBRA (D+R) — RetazDobra.jsx (§9) */

export type ZiadostZdroj = "Help" | "Charita";

export interface RetazZiadost {
  id: string;
  nazov: string;
  zdroj: ZiadostZdroj;
  lok: string;
  emoji: string;
  col: HexFarba;
  odpor?: boolean;
  overena?: boolean;
}

export type RetazMode = "skutok" | "honorar";

export type RetazKrok = "nastav" | "hotovo";

export interface RetazVysledok {
  pct: number;
  reazSuma: number;
  ziadost?: RetazZiadost;
}

/* FUN ZÓNA — FunZona.jsx (§13.2) */

export interface FunItem {
  emoji: string;
  trik: string;
  verdikt: string;
  odmena: string;
  riadky: number;
  fix: string;
  lol: number;
}

/* SPOLOČNÉ UI typy (opakujú sa naprieč modulmi) */

/** Funkcia na zobrazenie toastu (snackbar). */
export type Toast = (sprava: string) => void;

/** Props podľa šírky obrazovky (tablet/desktop = viacstĺpcové feedy). */
export interface WideProps {
  wide?: boolean;
}
