// ============================================================
// ROLOVÉ PANELY — dátové feedy (mock). Jeden skelet UI (§0 bod 4):
// nekódujú sa 3 obrazovky, jedna s rolovým data-feedom. Tu žijú dáta
// panelov („Môj DEED" navrch userovho základu) a položiek SPRÁVY pre
// Charita · Tvorca · B2B per DEED_Role_Panely_Sprava_v0_1 §1–§3.
// ============================================================
import { U, AV } from "@/theme";
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
  /** titulná (cover) fotka profilu */
  cover?: string;
  /** profilová fotka / logo subjektu (užívateľské logo z nastavení má prednosť) */
  foto?: string;
  lok: string;
  overena: boolean;
  /** 3 čísla — jednotné: prijímateľ Vyzbierané · Skutky · S nami | firma Darované · Skutky · S nami */
  cisla: [string, string][];
  onas: string;
  kontakt: { adresa: string; email: string; tel: string; web?: string };
  /** taby verejného obsahu per rola (fixné poradie §3 bod 4).
   *  Položka viazaná na zbierku nesie `zbierkaId` — názov, fotka a suma sa ťahajú
   *  zo /lib/zbierky, takže na profile je to isté, čo v zbierke. */
  taby: { key: string; label: string; polozky: { emoji: string; titul: string; popis: string; zbierkaId?: string; split?: number }[] }[];
}

export const SUBJEKTY: Record<Pozicia, SubjektMeta> = {
  charita: {
    nazov: "Svetlo pomoci o.z.", emoji: "💛", iniciacky: "SP", lok: "Trenčín", overena: true,
    cover: U("photo-1416879595882-3373a0480b5b"), foto: U("photo-1518199266791-5375a83190b7"),
    cisla: [["24 600 €", "Vyzbierané"], ["48", "Skutky"], ["3 roky", "S nami"]],
    onas: "Občianske združenie Svetlo pomoci pomáha rodinám v núdzi v Trenčianskom kraji od roku 2014. Každé euro dokladujeme — transparentnosť per prípad je naša podstata.",
    kontakt: { adresa: "Mierové námestie 4, Trenčín", email: "info@svetlopomoci.sk", tel: "+421 901 234 567", web: "svetlopomoci.sk" },
    taby: [
      { key: "zbierky", label: "Zbierky", polozky: [
        { emoji: "🚗", titul: "", popis: "", zbierkaId: "z-hospic-auto" },
        { emoji: "🛏", titul: "", popis: "dokladovanie beží", zbierkaId: "z-noclaharen" },
      ] },
      { key: "skutky", label: "Skutky", polozky: [
        { emoji: "🍲", titul: "120 teplých jedál", popis: "vydaných tento mesiac v teréne" },
        { emoji: "🏠", titul: "Rodina Horváthová má strechu", popis: "uzavretý prípad · takto sme pomohli" },
      ] },
    ],
  },
  tvorca: {
    nazov: "Marek Tvorí", emoji: "🎬", iniciacky: "MT", lok: "Bratislava", overena: true,
    cover: U("photo-1513364776144-60967b0f800f"), foto: AV(33),
    cisla: [["4 320 €", "Vyzbierané"], ["12", "Skutky"], ["1 rok", "S nami"]],
    onas: "Točím videá o ľuďoch, ktorí pomáhajú. Cez moju reťaz ide časť z každého honoráru na zbierku, ktorú práve podporujem.",
    kontakt: { adresa: "Bratislava", email: "marek@marektvori.sk", tel: "+421 902 111 222", web: "marektvori.sk" },
    taby: [
      { key: "retaz", label: "Reťaz", polozky: [
        { emoji: "⛓", titul: "", popis: "", zbierkaId: "z-hospic-auto", split: 5 },
        { emoji: "⛓", titul: "", popis: "", zbierkaId: "z-motylik", split: 50 },
        { emoji: "⛓", titul: "", popis: "", zbierkaId: "z-labka", split: 70 },
      ] },
      { key: "skutky", label: "Skutky", polozky: [
        { emoji: "🎥", titul: "Video pre Motýlik", popis: "kampaň dosiahla cieľ za 9 dní" },
      ] },
      { key: "akcie", label: "Akcie", polozky: [
        { emoji: "🎟", titul: "Workshop „Kamera v teréne“", popis: "so 14. 8. · 12/20 prihlásených" },
      ] },
    ],
  },
  b2b: {
    nazov: "Pekáreň Dobrota s.r.o.", emoji: "🥖", iniciacky: "PD", lok: "Trenčín", overena: true,
    cover: U("photo-1578985545062-69928b1d9587"), foto: U("photo-1628428799437-d886d7d2e9b2"),
    cisla: [["2 400 €", "Darované"], ["5", "Skutky"], ["2 roky", "S nami"]],
    onas: "Rodinná pekáreň z Trenčína. Podporujeme miestne zbierky a naši ľudia chodia na dobrovoľnícke akcie — každé euro je dohľadateľné.",
    kontakt: { adresa: "Bratislavská 12, Trenčín", email: "dobrota@pekaren.sk", tel: "+421 903 333 444", web: "pekarendobrota.sk" },
    // program ZADARMO: firma smie darovať a mať z toho karmu.
    // Vytváranie skutkov a akcií je nástroj — otvára sa až od T1.
    taby: [
      { key: "darovali", label: "Darovali sme", polozky: [
        { emoji: "🔥", titul: "", popis: "500 € · overená podpora", zbierkaId: "z-kovacova" },
        { emoji: "⭐", titul: "", popis: "pravidelná mesačná podpora", zbierkaId: "z-motylik" },
      ] },
    ],
  },
};

// ---- B2B adresár (PATCH 2 §5) — výkladná skriňa + anti-greenwashing.
// Riadok = logo/iniciálky, štít, odvetvie, mesto, súčet podpory. Radenie
// dôvera+blízkosť; poradie sa NIKDY nepredáva. Tvorca adresár nemá. ----
export interface FirmaAdresar { iniciacky: string; nazov: string; odvetvie: string; mesto: string; stit: "Bronze" | "Silver" | "Gold" | "Platinum" | "Legend"; podpora: string; logo?: string }
export const FIRMY_ADRESAR: FirmaAdresar[] = [
  { iniciacky: "ND", nazov: "Nordika SK", odvetvie: "Retail", mesto: "celé SR", stit: "Gold", podpora: "12 400 €" },
  { iniciacky: "PD", nazov: "Pekáreň Dobrota", odvetvie: "Gastro", mesto: "Trenčín", stit: "Bronze", podpora: "2 400 €", logo: U("photo-1628428799437-d886d7d2e9b2") },
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
  { id: "zbierky", emoji: "🎯", nazov: "Moje zbierky (org)", popis: "1 aktívna · 1 ukončená", tierMin: 0 },
  { id: "dnes", emoji: "💶", nazov: "Dnes prišlo", popis: "Živý prehľad dnešných darov", tierMin: 0 },
  { id: "dobrovolnici", emoji: "🙋", nazov: "Moji dobrovoľníci", popis: "12 prihlásených na sobotňajšiu brigádu", tierMin: 2, akcia: "Otvoriť" },
  { id: "sledujuci", emoji: "👥", nazov: "Sledujúci", popis: "+38 za posledný mesiac", hodnota: "1 204", tierMin: 0, akcia: "Detail" },
  { id: "nastenka", emoji: "📅", nazov: "Moja nástenka", popis: "2 zverejnené udalosti · 1 koncept", tierMin: 0, akcia: "Otvoriť" },
];

export const SPRAVA_CHARITA: SpravaItem[] = [
  { id: "profil", emoji: "✏️", nazov: "Upraviť profil", popis: "Foto, popis, video, kontakt, web, IBAN", tierMin: 0 },
  { id: "zbierky", emoji: "🎯", nazov: "Zbierky — vytvoriť a spravovať", popis: "Nová zbierka, úpravy a stav priebehu", tierMin: 0 },
  { id: "dokladovanie", emoji: "🧾", nazov: "Dokladovanie zbierok", popis: "Doklady použitia financií — priebežne aj po ukončení", tierMin: 0, povinne: true },
  { id: "darcovia", emoji: "💌", nazov: "Zoznam darcov + poďakovanie", popis: "Zoznam darcov a hromadné poďakovanie", tierMin: 0 },
  { id: "kalendar", emoji: "📅", nazov: "Kalendár & udalosti", popis: "Dobrovoľnícke akcie, brigády, termíny", tierMin: 1 },
  { id: "qr", emoji: "▦", nazov: "QR nástroje", popis: "QR na tlač — plagát, pokladnička, nástenka", tierMin: 0 },
  { id: "qr2", emoji: "🔄", nazov: "QR dochádzka na akciách", popis: "Rotujúci QR pre dochádzku dobrovoľníkov", tierMin: 2 },
  { id: "dobrovolnici", emoji: "🙋", nazov: "Dobrovoľníci — správa", popis: "Prihlášky, dochádzka a vzájomné hodnotenie", tierMin: 2 },
  { id: "firmy", emoji: "🤝", nazov: "Spolupráca s firmami", popis: "Sponzoring a firemné dobrovoľníctvo", tierMin: 2 },
  { id: "embed", emoji: "🔗", nazov: "Badge embed", popis: "Odznak s odkazom na profil pre vlastný web", tierMin: 0 },
  { id: "sumy", emoji: "👁", nazov: "Viditeľnosť súm", popis: "Čo vidia návštevníci profilu", tierMin: 0 },
  { id: "reporty", emoji: "📊", nazov: "Reporty / exporty", popis: "Podklady pre výročnú správu a export dát", tierMin: 2 },
];

// ---- TVORCA (§2) ----
export const PANEL_TVORCA: PanelBlok[] = [
  { id: "retaz", emoji: "⛓", nazov: "Moja reťaz", popis: "Aktívna zbierka · moje fixné 5 % · 2 vo fronte", tierMin: 0, akcia: "Detail" },
  { id: "vplyv", emoji: "🌊", nazov: "Môj vplyv", popis: "6 uzavretých prípadov", hodnota: "4 320 €", tierMin: 0, akcia: "Detail" },
  { id: "podporovatelia", emoji: "💚", nazov: "Podporovatelia", popis: "Priame príspevky cez môj profil", tierMin: 1, akcia: "Otvoriť" },
  { id: "akcie", emoji: "🎟", nazov: "Moje akcie", popis: "Workshop Kamera v teréne · so 14. 8. · 12/20 prihlásených", tierMin: 2, akcia: "Otvoriť" },
  { id: "oznamy", emoji: "📣", nazov: "Moje oznamy", popis: "3 zverejnené · 1 koncept", tierMin: 1, akcia: "Otvoriť" },
];

export const SPRAVA_TVORCA: SpravaItem[] = [
  { id: "podstranka", emoji: "✏️", nazov: "Upraviť podstránku", popis: "Bio, portfólio a odkazy na verejnom profile", tierMin: 0 },
  { id: "terminal", emoji: "💳", nazov: "Príspevky od podporovateľov", popis: "Priame príspevky na tvojom verejnom profile", tierMin: 1 },
  { id: "oznamy", emoji: "📣", nazov: "Oznamy", popis: "Publikovanie oznamov komunite", tierMin: 1 },
  { id: "akcie", emoji: "🎟", nazov: "Akcie", popis: "Workshopy a školenia — kapacita, vstupné QR, prihlášky", tierMin: 2 },
  { id: "smena", emoji: "⏱", nazov: "Overená smena", popis: "Overené dobrovoľnícke hodiny so živým počítadlom", tierMin: 2 },
  { id: "statistiky", emoji: "📊", nazov: "Štatistiky", popis: "Návštevy profilu a konverzie na dary", tierMin: 1 },
];

// ---- B2B FIRMA (§3) ----
export const PANEL_B2B: PanelBlok[] = [
  // PATCH 1: karta badge/karma preč (štít žije na karte subjektu); rebríček
  // odvetvia ZOSTÁVA — porovnanie s inými = súťaž, nie postup
  { id: "rebricek", emoji: "🏆", nazov: "Rebríček odvetvia", popis: "#3 v odvetví Gastro · Trenčín", tierMin: 0, akcia: "Detail" },
  { id: "ludia", emoji: "👥", nazov: "Naši ľudia", popis: "46 zapojených · 312 dobrovoľníckych hodín", tierMin: 1, akcia: "Otvoriť" },
  { id: "sponzoring", emoji: "🛡", nazov: "Sponzorujeme", popis: "3 podporené prípady · každé euro dohľadateľné", hodnota: "2 400 €", tierMin: 0, akcia: "Detail" },
  { id: "ucet", emoji: "🏅", nazov: "Stav účtu", popis: "Founding Member · skúšobné Premium ešte 21 dní", tierMin: 0, akcia: "Detail" },
  { id: "nastenka", emoji: "📅", nazov: "Firemná nástenka", popis: "1 zverejnená akcia · 2 koncepty", tierMin: 0, akcia: "Otvoriť" },
];

export const SPRAVA_B2B: SpravaItem[] = [
  { id: "profil", emoji: "✏️", nazov: "Profil firmy", popis: "Vizitka, logo a popis firmy", tierMin: 0 },
  { id: "sponzoring", emoji: "🛡", nazov: "Sponzoring", popis: "Podpora overených prípadov pod menom firmy", tierMin: 0 },
  { id: "zamestnanci", emoji: "👥", nazov: "Zamestnanci", popis: "Pripojenie cez QR alebo pozvánku — vždy dobrovoľné", tierMin: 1 },
  { id: "akcia", emoji: "🎟", nazov: "Firemná akcia", popis: "Firemné dobrovoľnícke akcie a udalosti", tierMin: 2 },
  { id: "vto", emoji: "⏱", nazov: "Firemné dobrovoľníctvo", popis: "Dochádzka cez QR a overené hodiny", tierMin: 2 },
  { id: "esg", emoji: "📊", nazov: "ESG prehľad + export", popis: "Agregované reporty a podklady pre audit", tierMin: 2 },
  { id: "odmeny", emoji: "🎁", nazov: "Odmeňovací program", popis: "Benefity za zapojenie zamestnancov", tierMin: 1 },
];

export const PANELY: Record<Pozicia, PanelBlok[]> = { charita: PANEL_CHARITA, tvorca: PANEL_TVORCA, b2b: PANEL_B2B };
export const SPRAVY: Record<Pozicia, SpravaItem[]> = { charita: SPRAVA_CHARITA, tvorca: SPRAVA_TVORCA, b2b: SPRAVA_B2B };

// nadpis podstránky správy per rola (§1.3/§2.4/§3.3)
export const SPRAVA_NADPIS: Record<Pozicia, string> = {
  charita: "SPRÁVA CHARITY", tvorca: "SPRÁVA TVORCU", b2b: "SPRÁVA FIRMY",
};
