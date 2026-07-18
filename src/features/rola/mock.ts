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
  tierMin: Tier;                 // gate na úrovni AKCIE — blok vidno vždy (§4.3); zamknutý blok = blur dát (PATCH 1 §3)
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
// zmena tieru nesmie zmeniť karmu/badge ani o bod. PATCH 1: badge sa
// zobrazuje VÝLUČNE ako štít + text — žiadny progres/percentá/odpočty. ----
export const ZASLUZENA: Record<Pozicia, { badge: "Bronze" | "Silver" | "Gold" | "Platinum" | "Legend" }> = {
  charita: { badge: "Gold" },
  tvorca: { badge: "Silver" },
  b2b: { badge: "Bronze" },
};

// ---- karta subjektu + verejná podstránka (PATCH 2 §1/§3) — jednotná
// štruktúra pre všetky subjekty; 3 čísla per rola sú fixné zo špecifikácie ----
export interface SubjektMeta {
  nazov: string;
  emoji: string;          // fallback identity bez loga
  iniciacky: string;      // fallback do krúžku (adresár, avatar)
  lok: string;
  overena: boolean;
  /** 3 čísla — charita: vyzbierané/podporovatelia/úroveň · tvorca: mobilizované/prípady/úroveň · firma: podporené €/prípady/úroveň */
  cisla: [string, string][];
  onas: string;
  kontakt: { adresa: string; email: string; tel: string; web?: string };
  /** taby verejného obsahu per rola (fixné poradie §3 bod 4) */
  taby: { key: string; label: string; polozky: { emoji: string; titul: string; popis: string }[] }[];
}

export const SUBJEKTY: Record<Pozicia, SubjektMeta> = {
  charita: {
    nazov: "Svetlo pomoci o.z.", emoji: "💛", iniciacky: "SP", lok: "Trenčín", overena: true,
    cisla: [["24 600 €", "vyzbierané"], ["1 204", "podporovateľov"], ["Gold", "úroveň"]],
    onas: "Občianske združenie Svetlo pomoci pomáha rodinám v núdzi v Trenčianskom kraji od roku 2014. Každé euro dokladujeme — transparentnosť per prípad je naša podstata.",
    kontakt: { adresa: "Mierové námestie 4, Trenčín", email: "info@svetlopomoci.sk", tel: "+421 901 234 567", web: "svetlopomoci.sk" },
    taby: [
      { key: "kampane", label: "Kampane", polozky: [
        { emoji: "🚗", titul: "Auto pre mobilný hospic", popis: "8 600 € z 12 000 € · 214 darcov" },
        { emoji: "🛏", titul: "Zimná nocľaháreň — vybavenie", popis: "ukončená · 4 000 € · dokladovanie beží" },
      ] },
      { key: "skutky", label: "Skutky", polozky: [
        { emoji: "🍲", titul: "120 teplých jedál", popis: "vydaných tento mesiac v teréne" },
        { emoji: "🏠", titul: "Rodina Horváthová má strechu", popis: "uzavretý prípad · takto sme pomohli" },
      ] },
      { key: "talent", label: "Talent", polozky: [
        { emoji: "🎨", titul: "Deti maľujú pre útulok", popis: "výtvarná akcia s komunitou" },
      ] },
    ],
  },
  tvorca: {
    nazov: "Marek Tvorí", emoji: "🎬", iniciacky: "MT", lok: "Bratislava", overena: true,
    cisla: [["4 320 €", "mobilizované"], ["6", "uzavretých prípadov"], ["Silver", "úroveň"]],
    onas: "Točím videá o ľuďoch, ktorí pomáhajú. Cez moju reťaz ide časť z každého honoráru na zbierku, ktorú práve podporujem.",
    kontakt: { adresa: "Bratislava", email: "marek@marektvori.sk", tel: "+421 902 111 222", web: "marektvori.sk" },
    taby: [
      { key: "retaz", label: "Reťaz", polozky: [
        { emoji: "⛓", titul: "Aktívna: Auto pre mobilný hospic", popis: "moje fixné 5 % · 2 ďalšie vo fronte" },
      ] },
      { key: "skutky", label: "Skutky", polozky: [
        { emoji: "🎥", titul: "Video pre Plamienok", popis: "kampaň dosiahla cieľ za 9 dní" },
      ] },
      { key: "akcie", label: "Akcie", polozky: [
        { emoji: "🎟", titul: "Workshop „Kamera v teréne“", popis: "so 14. 8. · 12/20 prihlásených" },
      ] },
      { key: "oznamy", label: "Oznamy", polozky: [
        { emoji: "📣", titul: "Nový diel v stredu", popis: "séria Skutoční hrdinovia pokračuje" },
      ] },
    ],
  },
  b2b: {
    nazov: "Pekáreň Dobrota s.r.o.", emoji: "🥖", iniciacky: "PD", lok: "Trenčín", overena: true,
    cisla: [["2 400 €", "podporené"], ["3", "prípady"], ["Bronze", "úroveň"]],
    onas: "Rodinná pekáreň z Trenčína. Podporujeme miestne zbierky a naši ľudia chodia na dobrovoľnícke akcie — každé euro je dohľadateľné (D++ stopa).",
    kontakt: { adresa: "Bratislavská 12, Trenčín", email: "dobrota@pekaren.sk", tel: "+421 903 333 444", web: "pekarendobrota.sk" },
    taby: [
      { key: "podporujeme", label: "Podporujeme", polozky: [
        { emoji: "🔥", titul: "Rodina Kováčová", popis: "500 € · záruka Lidl · D++ stopa" },
        { emoji: "⭐", titul: "Plamienok", popis: "pravidelná mesačná podpora" },
      ] },
      { key: "skutky", label: "Skutky", polozky: [
        { emoji: "🍞", titul: "Pečivo pre nocľaháreň", popis: "každý piatok · 40 kusov" },
      ] },
      { key: "akcie", label: "Akcie", polozky: [
        { emoji: "🙋", titul: "Firemná brigáda — Brezina", popis: "výsadba stromov · 12 zamestnancov" },
      ] },
    ],
  },
};

// ---- B2B adresár (PATCH 2 §5) — výkladná skriňa + anti-greenwashing.
// Riadok = logo/iniciálky, štít, odvetvie, mesto, súčet podpory. Radenie
// dôvera+blízkosť; poradie sa NIKDY nepredáva. Tvorca adresár nemá. ----
export interface FirmaAdresar { iniciacky: string; nazov: string; odvetvie: string; mesto: string; stit: "Bronze" | "Silver" | "Gold" | "Platinum" | "Legend"; podpora: string }
export const FIRMY_ADRESAR: FirmaAdresar[] = [
  { iniciacky: "LD", nazov: "Lidl SK", odvetvie: "Retail", mesto: "celé SR", stit: "Gold", podpora: "12 400 €" },
  { iniciacky: "PD", nazov: "Pekáreň Dobrota", odvetvie: "Gastro", mesto: "Trenčín", stit: "Bronze", podpora: "2 400 €" },
  { iniciacky: "IT", nazov: "ITech Solutions", odvetvie: "IT", mesto: "Bratislava", stit: "Silver", podpora: "5 100 €" },
  { iniciacky: "ZS", nazov: "Zelená stavba", odvetvie: "Stavebníctvo", mesto: "Žilina", stit: "Silver", podpora: "3 750 €" },
  { iniciacky: "KV", nazov: "Kvety Viola", odvetvie: "Služby", mesto: "Trenčín", stit: "Bronze", podpora: "640 €" },
];

// ---- CHARITA (§1) ----
export const ORG_ZBIERKY: OrgZbierka[] = [
  { id: "org-hospic", nazov: "Auto pre mobilný hospic", emoji: "🚗", ciel: 12000, vyzbierane: 8600, stav: "aktivna", darcovia: 214 },
  { id: "org-noclah", nazov: "Zimná nocľaháreň — vybavenie", emoji: "🛏", ciel: 4000, vyzbierane: 4000, stav: "ukoncena", darcovia: 96, ukoncena: "2026-06-10T18:00:00.000Z" },
];

export const PANEL_CHARITA: PanelBlok[] = [
  { id: "zbierky", emoji: "🎯", nazov: "Moje zbierky (org)", popis: "1 aktívna · 1 ukončená · stav dokladovania", tierMin: 0 },
  { id: "dnes", emoji: "💶", nazov: "Dnes prišlo", popis: "live tok darov · noví darcovia", tierMin: 0 },
  { id: "dobrovolnici", emoji: "🙋", nazov: "Moji dobrovoľníci", popis: "12 prihlásených na sobotňajšiu brigádu · dochádzka po akcii", tierMin: 2, akcia: "Otvoriť" },
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
  // PATCH 1: karta badge/karma preč (štít žije na karte subjektu); rebríček
  // odvetvia ZOSTÁVA — porovnanie s inými = súťaž, nie postup
  { id: "rebricek", emoji: "🏆", nazov: "Rebríček odvetvia", popis: "#3 v odvetví Gastro · Trenčín — súťažná vrstva", tierMin: 0, akcia: "Detail" },
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
