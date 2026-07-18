// ============================================================
// ROLOVÉ PANELY — dátové feedy (mock). Jeden skelet UI (§0 bod 4):
// nekódujú sa 3 obrazovky, jedna s rolovým data-feedom. Tu žijú dáta
// panelov („Môj DEED" navrch userovho základu) a položiek SPRÁVY pre
// Charita · Tvorca · B2B per DEED_Role_Panely_Sprava_v0_1 §1–§3.
// ============================================================
import type { Pozicia, Tier } from "./stav";

// blok rolového panela — rovnaká anatómia ako karty userovho „Môj DEED"
export interface PanelBlok {
  id: string;
  emoji: string;
  nazov: string;
  popis: string;                 // druhý riadok (obsah bloku)
  hodnota?: string;              // zvýraznená hodnota vpravo
  progress?: { vyzbierane: number; ciel: number };
  tierMin: Tier;                 // gate na úrovni AKCIE — blok vidno vždy (§4.3)
  /** zaslúžená os (karma/badge/level) — číta výlučne aktivitu, NIKDY tier (§4.5) */
  zasluzena?: boolean;
  akcia?: string;                // label CTA (default „Spravovať")
}

// položka podstránky SPRÁVA — viditeľná len držiteľovi roly (+ delegovaní)
export interface SpravaItem {
  id: string;
  emoji: string;
  nazov: string;
  popis: string;
  tierMin: Tier;
  /** POVINNÁ ZÁKLADNÁ funkcia — mimo tier gatingu ÚPLNE (§1.4/§4.4) */
  povinne?: boolean;
  /** poznámka k tierom (napr. „T0: statický QR · T2: TOTP") */
  tierPozn?: string;
}

// zbierka entity (charita org) — iný zdroj než userove „Moje zbierky"
export interface OrgZbierka {
  id: string;
  nazov: string;
  emoji: string;
  ciel: number;
  vyzbierane: number;
  stav: "aktivna" | "ukoncena";
  darcovia: number;
  /** ISO ukončenia — pre lehotu dokladovania (§1.4) */
  ukoncena?: string;
}

// ---- zaslúžená os (mock) — konštanty NEZÁVISLÉ od tieru; test §4.5:
// zmena tieru nesmie zmeniť karmu/badge ani o bod ----
export const ZASLUZENA: Record<Pozicia, { badge: string; level: number; progres: number; dalsi: string }> = {
  charita: { badge: "Gold", level: 7, progres: 72, dalsi: "Legend" },
  tvorca: { badge: "Silver", level: 4, progres: 45, dalsi: "Gold" },
  b2b: { badge: "Bronze", level: 2, progres: 58, dalsi: "Silver" },
};

// ---- CHARITA (§1) ----
export const ORG_ZBIERKY: OrgZbierka[] = [
  { id: "org-hospic", nazov: "Auto pre mobilný hospic", emoji: "🚗", ciel: 12000, vyzbierane: 8600, stav: "aktivna", darcovia: 214 },
  { id: "org-noclah", nazov: "Zimná nocľaháreň — vybavenie", emoji: "🛏", ciel: 4000, vyzbierane: 4000, stav: "ukoncena", darcovia: 96, ukoncena: "2026-06-10T18:00:00.000Z" },
];

export const PANEL_CHARITA: PanelBlok[] = [
  { id: "zbierky", emoji: "🎯", nazov: "Moje zbierky (org)", popis: "1 aktívna · 1 ukončená · stav dokladovania", tierMin: 0 },
  { id: "dnes", emoji: "💶", nazov: "Dnes prišlo", popis: "live tok darov · noví darcovia", tierMin: 0 },
  { id: "dobrovolnici", emoji: "🙋", nazov: "Moji dobrovoľníci", popis: "12 prihlásených na sobotňajšiu brigádu · dochádzka po akcii", tierMin: 2, akcia: "Otvoriť" },
  { id: "karma", emoji: "⬢", nazov: "Badge & karma", popis: "zaslúžená os — beží naplno aj na T0", tierMin: 0, zasluzena: true, akcia: "Detail" },
  { id: "sledujuci", emoji: "👥", nazov: "Sledujúci", popis: "za posledný mesiac +38", hodnota: "1 204", tierMin: 0, akcia: "Detail" },
  { id: "nastenka", emoji: "📅", nazov: "Moja nástenka", popis: "2 zverejnené udalosti · 1 koncept", tierMin: 0, akcia: "Otvoriť" },
];

export const SPRAVA_CHARITA: SpravaItem[] = [
  { id: "profil", emoji: "✏️", nazov: "Upraviť profil", popis: "Foto, popis, video, kontakt, web, IBAN (VoP)", tierMin: 0 },
  { id: "zbierky", emoji: "🎯", nazov: "Zbierky — vytvoriť a spravovať", popis: "Limit súbežných zbierok podľa tieru", tierMin: 0, tierPozn: "T0: 1 zbierka · T1/T2: viac (placeholder)" },
  { id: "dokladovanie", emoji: "🧾", nazov: "Správa zbierky vrátane DOKLADOVANIA", popis: "Doklady použitia financií — priebežne aj po ukončení", tierMin: 0, povinne: true },
  { id: "darcovia", emoji: "💌", nazov: "Zoznam darcov + poďakovanie", popis: "Zoznam per zbierka (4 režimy — rozhoduje darca) · hromadné poďakovanie", tierMin: 0 },
  { id: "kalendar", emoji: "📅", nazov: "Kalendár & udalosti", popis: "Dobrovoľnícke akcie, brigády, termíny", tierMin: 1, tierPozn: "tvorba od T1" },
  { id: "qr", emoji: "▦", nazov: "QR nástroje", popis: "Statický QR na tlač (plagát, pokladnička)", tierMin: 0, tierPozn: "T0: statický QR · T2: event QR + rotujúca TOTP dochádzka" },
  { id: "qr2", emoji: "🔄", nazov: "Event QR + TOTP dochádzka", popis: "Rotujúci QR pre dochádzku dobrovoľníkov na akciách", tierMin: 2 },
  { id: "dobrovolnici", emoji: "🙋", nazov: "Dobrovoľníci — správa", popis: "Prihlášky, dochádzka (QR), symetrické hodnotenie 6★", tierMin: 2, tierPozn: "default 5★ · ≤3 = povinný dôvod" },
  { id: "firmy", emoji: "🤝", nazov: "Spolupráca s firmami", popis: "Strana charity pre VTO / sponzoring (viditeľnosť pre B2B)", tierMin: 2 },
  { id: "embed", emoji: "🔗", nazov: "Badge embed", popis: "HTML embed badge na vlastný web (klik → DEED profil, backlink)", tierMin: 0 },
  { id: "sumy", emoji: "👁", nazov: "Viditeľnosť súm", popis: "Čo vidia návštevníci profilu (per zbierka)", tierMin: 0 },
  { id: "reporty", emoji: "📊", nazov: "Reporty / exporty", popis: "Prehľad pre výročnú správu, export dát", tierMin: 2 },
];

// ---- TVORCA (§2) ----
export const PANEL_TVORCA: PanelBlok[] = [
  { id: "retaz", emoji: "⛓", nazov: "Moja reťaz", popis: "Aktívna zbierka vo fronte · moje fixné 5 % · 2 ďalšie v poradí", tierMin: 0, akcia: "Detail" },
  { id: "vplyv", emoji: "🌊", nazov: "Môj vplyv", popis: "6 uzavretých prípadov · mostová váha 1,8×", hodnota: "4 320 €", tierMin: 0, akcia: "Detail" },
  { id: "podporovatelia", emoji: "💚", nazov: "Podporovatelia", popis: "Príspevky cez môj terminál (podstránka)", tierMin: 1, akcia: "Otvoriť" },
  { id: "akcie", emoji: "🎟", nazov: "Moje akcie", popis: "Workshop „Kamera v teréne“ · so 14. 8. · 12/20 prihlásených", tierMin: 2, akcia: "Otvoriť" },
  { id: "karma", emoji: "⬢", nazov: "Karma & tituly", popis: "zaslúžená os — beží naplno aj na T0", tierMin: 0, zasluzena: true, akcia: "Detail" },
  { id: "oznamy", emoji: "📣", nazov: "Moje oznamy", popis: "3 zverejnené · 1 koncept", tierMin: 1, akcia: "Otvoriť" },
];

export const SPRAVA_TVORCA: SpravaItem[] = [
  { id: "podstranka", emoji: "✏️", nazov: "Upraviť podstránku", popis: "Bio, portfólio, odkazy · poradie: skutky+reťaze hore · oznamy stred · terminál dole", tierMin: 0, tierPozn: "T0: základ · T1: plná podstránka" },
  { id: "terminal", emoji: "💳", nazov: "Terminál (Transak)", popis: "Priame príspevky tvorcovi — DEED je prostredie, nie strana transakcie", tierMin: 1 },
  { id: "oznamy", emoji: "📣", nazov: "Oznamy", popis: "Publikovanie oznamov komunite", tierMin: 1 },
  { id: "akcie", emoji: "🎟", nazov: "Akcie", popis: "Vytvoriť workshop/školenie — kapacita, vstupný QR, prihlášky", tierMin: 2 },
  { id: "smena", emoji: "⏱", nazov: "Overená smena", popis: "Check-in/out inštitúcie, live počítadlo (verejný link)", tierMin: 2, tierPozn: "per DEED_Tvorcovia v0.1 §3" },
  { id: "statistiky", emoji: "📊", nazov: "Štatistiky", popis: "Návštevy podstránky, konverzia klik→dar", tierMin: 1, tierPozn: "T1: základ · T2: plné" },
];

// ---- B2B FIRMA (§3) ----
export const PANEL_B2B: PanelBlok[] = [
  { id: "karma", emoji: "⬢", nazov: "Firemná karma & badge", popis: "zaslúžená os · rebríček odvetvia v meste: #3 (súťažná vrstva)", tierMin: 0, zasluzena: true, akcia: "Detail" },
  { id: "ludia", emoji: "👥", nazov: "Naši ľudia", popis: "AGREGÁTY: 46 zapojených (opt-in) · 312 h · k-anonymita, žiadny detail osôb", tierMin: 1, akcia: "Otvoriť" },
  { id: "sponzoring", emoji: "🛡", nazov: "Sponzorujeme", popis: "3 podporené prípady · každé euro dohľadateľné (D++ stopa)", hodnota: "2 400 €", tierMin: 0, akcia: "Detail" },
  { id: "ucet", emoji: "🏅", nazov: "Stav účtu", popis: "Founding Member badge · trial Premium — odpočet 21 dní", tierMin: 0, akcia: "Detail" },
  { id: "nastenka", emoji: "📅", nazov: "Firemná nástenka", popis: "1 zverejnená akcia · 2 koncepty", tierMin: 0, akcia: "Otvoriť" },
];

export const SPRAVA_B2B: SpravaItem[] = [
  { id: "profil", emoji: "✏️", nazov: "Profil firmy", popis: "Vizitka podľa tieru (Free → Premium per Profi vizitka doc)", tierMin: 0 },
  { id: "sponzoring", emoji: "🛡", nazov: "Sponzoring", popis: "Overený prípad/charita · príspevok pod menom firmy · logo pri kampani (D++)", tierMin: 0, tierPozn: "prispieť: Free · kampane: Premium verifikácia" },
  { id: "zamestnanci", emoji: "👥", nazov: "Zamestnanci", popis: "Pripojenie QR/invite kód — VŽDY opt-in · tri stavy súkromia (Core v3 §15)", tierMin: 1 },
  { id: "akcia", emoji: "🎟", nazov: "Firemná akcia", popis: "Vytvoriť akciu (event engine)", tierMin: 2 },
  { id: "vto", emoji: "⏱", nazov: "VTO", popis: "QR proof-of-presence dochádzka, audit-grade hodiny", tierMin: 2 },
  { id: "esg", emoji: "📊", nazov: "ESG dashboard + export", popis: "Agregované S1+S3, k-anonymita, PDF + dáta pre audítora", tierMin: 2 },
  { id: "odmeny", emoji: "🎁", nazov: "Odmeňovací program", popis: "Režim A (gaming DEED, default) / B (reálny token)", tierMin: 1, tierPozn: "per Gaming DEED Benefit v0.1" },
];

export const PANELY: Record<Pozicia, PanelBlok[]> = { charita: PANEL_CHARITA, tvorca: PANEL_TVORCA, b2b: PANEL_B2B };
export const SPRAVY: Record<Pozicia, SpravaItem[]> = { charita: SPRAVA_CHARITA, tvorca: SPRAVA_TVORCA, b2b: SPRAVA_B2B };

// nadpis podstránky správy per rola (§1.3/§2.4/§3.3)
export const SPRAVA_NADPIS: Record<Pozicia, string> = {
  charita: "SPRÁVA CHARITY", tvorca: "SPRÁVA TVORCU", b2b: "SPRÁVA FIRMY",
};
