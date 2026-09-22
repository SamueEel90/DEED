// ============================================================
// ROLOVÉ PANELY — dátové feedy (mock). Jeden skelet UI (§0 bod 4):
// nekódujú sa 3 obrazovky, jedna s rolovým data-feedom. Tu žijú dáta
// panelov („Môj DEED" navrch userovho základu) a položiek SPRÁVY pre
// Charita · Tvorca · B2B per DEED_Role_Panely_Sprava_v0_1 §1–§3.
// ============================================================
import { U, AV } from "@/theme";
import type { Pozicia, Tier } from "./stav";
import type { Dokaz } from "@/lib/zbierky";

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
  /** len informácia — riadok sa neklikne (napr. počet sledujúcich) */
  info?: boolean;
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
  /** čísla v programe ZADARMO, ak sa líšia (firma zadarmo nerobí skutky → počet darov) */
  cislaZadarmo?: [string, string][];
  onas: string;
  kontakt: { adresa: string; email: string; tel: string; web?: string };
  /** taby verejného obsahu per rola (fixné poradie §3 bod 4).
   *  Položka viazaná na zbierku nesie `zbierkaId` — názov, fotka a suma sa ťahajú
   *  zo /lib/zbierky, takže na profile je to isté, čo v zbierke. */
  taby: { key: string; label: string; odTieru?: Tier; polozky: { emoji: string; titul: string; popis: string; zbierkaId?: string; split?: number; odTieru?: Tier; dokaz?: Dokaz; dokazZbierky?: string; video?: { nahlad: string; dlzka: string; zbierkaId?: string; src?: string } }[] }[];
}

/** segmenty (témy), ktoré si charita nastavila v správe — darca ich vidí pri pravidelnej podpore (program AKCIA) */
// Svetlo pomoci — simulácia výberu z registrácie (číselník: sektor → pod-segment)
export const SEGMENTY_CHARITY = [
  "Sociálne · chudoba a núdza",
  "Sociálne · osamelí seniori",
  "Sociálne · ľudia bez domova",
  "Deti · ohrozené rodiny",
];

export const SUBJEKTY: Record<Pozicia, SubjektMeta> = {
  charita: {
    nazov: "Svetlo pomoci o.z.", emoji: "💛", iniciacky: "SP", lok: "Trenčín", overena: true,
    cover: U("photo-1416879595882-3373a0480b5b"), foto: U("photo-1518199266791-5375a83190b7"),
    cisla: [["24 600 €", "Vyzbierané"], ["48", "Skutky"], ["3 roky", "S nami"]],
    onas: "Občianske združenie Svetlo pomoci pomáha rodinám v núdzi v Trenčianskom kraji od roku 2014. Každé euro dokladujeme — transparentnosť per prípad je naša podstata.",
    kontakt: { adresa: "Mierové námestie 4, Trenčín", email: "info@svetlopomoci.sk", tel: "+421 901 234 567", web: "svetlopomoci.sk" },
    taby: [
      // `odTieru` = od ktorého programu sa to na verejnom profile ukáže (bez neho = ZADARMO).
      // ZADARMO: jedna aktívna zbierka PRE NIEKOHO. T1: viac súbežných + centrálna. T2: akcie.
      { key: "zbierky", label: "Zbierky", polozky: [
        { emoji: "🧺", titul: "", popis: "", zbierkaId: "z-anna" },
        { emoji: "🎒", titul: "", popis: "", zbierkaId: "z-skola", odTieru: 1 },
        { emoji: "📦", titul: "", popis: "", zbierkaId: "z-potraviny", odTieru: 1 },
      ] },
      { key: "skutky", label: "Skutky", polozky: [
        { emoji: "🍲", titul: "120 teplých jedál", popis: "vydaných tento mesiac v teréne", dokaz: {
          text: "Každý štvrtok varíme na Mierovom námestí. V septembri sme vydali 120 teplých jedál.",
          fotky: [
            { src: U("photo-1593113598332-cd288d649433"), popis: "VÝDAJ" },
            { src: U("photo-1488459716781-31db52582fe9"), popis: "NÁKUP" },
          ],
          doklady: [
            { druh: "Bloček", nazov: "Suroviny — 4 nákupy", dodavatel: "Kaufland Trenčín", cislo: "4 bločky", datum: "sept. 2026", suma: 386.2 },
            { druh: "Faktúra", nazov: "Jednorazové obaly a príbory", dodavatel: "Obaly Slovakia s.r.o.", cislo: "FA 26-0931", datum: "3. 9. 2026", suma: 74.9 },
          ],
        } },
        // ukončená a doložená zbierka = jeden skutok (žiadna duplicita so Zbierkami)
        { emoji: "🏠", titul: "", popis: "doložené faktúrami", zbierkaId: "z-horvathova" },
      ] },
      // Video: krátke videá — k zbierke, k tomu, čo chystáme, alebo šťastní obdarovaní.
      // ZADARMO: verejne sa zobrazuje JEDNO video; ďalšie ostávajú v správe, ukážu sa až v platenom programe.
      { key: "video", label: "Video", polozky: [
        { emoji: "🎬", titul: "Pani Anna — prečo zbierame", popis: "september · k zbierke", video: { nahlad: U("photo-1581578731548-c64695cc6952"), dlzka: "0:48", zbierkaId: "z-anna" } },
        { emoji: "🎬", titul: "Horváthovci ďakujú — prvá noc v suchu", popis: "august · po odovzdaní daru", video: { nahlad: U("photo-1635424710928-0544e8512eae"), dlzka: "1:12", zbierkaId: "z-horvathova" }, odTieru: 1 },
      ] },
      { key: "akcie", label: "Akcie", odTieru: 2, polozky: [
        { emoji: "🏃", titul: "Beh pre Svetlo — benefičný beh", popis: "ne 12. 10. · Trenčín, Ostrov · 64 prihlásených" },
        { emoji: "🍲", titul: "Varíme pre ulicu — dobrovoľníci", popis: "každý štvrtok · Mierové námestie" },
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
    cislaZadarmo: [["2 400 €", "Darované"], ["2", "Dary"], ["2 roky", "S nami"]],
    onas: "Rodinná pekáreň z Trenčína. Podporujeme miestne zbierky a naši ľudia chodia na dobrovoľnícke akcie — každé euro je dohľadateľné.",
    kontakt: { adresa: "Bratislavská 12, Trenčín", email: "dobrota@pekaren.sk", tel: "+421 903 333 444", web: "pekarendobrota.sk" },
    // program ZADARMO: firma smie darovať a mať z toho karmu.
    // Vytváranie skutkov a akcií je nástroj — otvára sa až od T1.
    taby: [
      { key: "darovali", label: "Darovali sme", polozky: [
        { emoji: "🔥", titul: "", popis: "500 € · overená podpora", zbierkaId: "z-kovacova" },
        { emoji: "⭐", titul: "", popis: "pravidelná mesačná podpora", zbierkaId: "z-motylik" },
      ] },
      // T1 (živnostník): vlastné skutky a ponuky
      { key: "skutky", label: "Skutky", odTieru: 1, polozky: [
        { emoji: "🥖", titul: "Chlieb pre nocľaháreň", popis: "každý piatok 30 bochníkov · Otvorené dvere Trenčín" },
        { emoji: "🎂", titul: "Torta pre detský domov", popis: "k Mikulášovi · DeD Trenčín" },
      ] },
      { key: "ponuky", label: "Ponuky", odTieru: 1, polozky: [
        { emoji: "🧺", titul: "Včerajšie pečivo zadarmo", popis: "pre charity a OZ · denne po 18:00" },
      ] },
      // T2 (firma s prevádzkou): akcie pre zákazníkov
      { key: "akcie", label: "Akcie", odTieru: 2, polozky: [
        { emoji: "👩‍🍳", titul: "Pečieme s deťmi", popis: "so 18. 10. · výťažok pre Motýlik · 14/20 miest" },
      ] },
      // T3 (so zamestnancami): skutky tímu a oznamy do mesta
      { key: "tim", label: "Náš tím", odTieru: 3, polozky: [
        { emoji: "🙋", titul: "Dobrovoľnícky deň v útulku", popis: "6 zamestnancov · 24 hodín · Túlavá labka" },
        { emoji: "📣", titul: "Zbierame zimné bundy", popis: "oznam do mesta · zberné miesto v predajni" },
      ] },
      // T4: ESG výkaz a rozšírené štatistiky
      { key: "dopad", label: "Dopad", odTieru: 4, polozky: [
        { emoji: "📊", titul: "ESG výkaz 2026", popis: "8 400 € · 312 hodín dobrovoľníctva · 14 prijímateľov" },
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
  { id: "sledujuci", emoji: "👥", nazov: "Sledujúci", popis: "+38 za posledný mesiac", hodnota: "1 204", tierMin: 0, info: true },
  // T1: zbierka pre seba (Centrálna zbierka organizácie)
  { id: "centralna", emoji: "💛", nazov: "Centrálna zbierka organizácie", popis: "8 600 € z 12 000 € · 214 darcov", tierMin: 1, akcia: "Otvoriť" },
  // T1 (ZBIERKA): akcie na nástenku mesta · T2 (AKCIA): dobrovoľníctvo
  { id: "nastenka", emoji: "📅", nazov: "Moja nástenka", popis: "2 zverejnené udalosti · 1 koncept", tierMin: 1, akcia: "Otvoriť" },
  { id: "dobrovolnici", emoji: "🙋", nazov: "Moji dobrovoľníci", popis: "12 prihlásených na sobotňajšiu brigádu", tierMin: 2, akcia: "Otvoriť" },
];

// podľa cenníka „Cennik_urovne_charita_spolky" — ZADARMO · ZBIERKA (T1) · AKCIA (T2) · KAMPAŇ (T3)
export const SPRAVA_CHARITA: SpravaItem[] = [
  // ZADARMO
  { id: "zbierky", emoji: "🎯", nazov: "Zbierky — vytvoriť a spravovať", popis: "Zbierka na 30 dní · predĺžiť, topovať, ukončiť · dokladovanie použitia", tierMin: 0 },
  { id: "skutok", emoji: "✨", nazov: "Pridať skutok", popis: "Do feedu mesta — takto sme pomohli, fotky pred/po a doklady", tierMin: 0 },
  { id: "video", emoji: "🎬", nazov: "Mám talent — video", popis: "Video do 45 s s platobným modulom · 1 / mesiac, ďalšie 10 €", tierMin: 0 },
  { id: "darcovia", emoji: "💌", nazov: "Prehľad darcov a vyzbieraných súm", popis: "Zoznam darcov a hromadné poďakovanie", tierMin: 0 },
  { id: "vypis", emoji: "📄", nazov: "Ročný výpis činnosti", popis: "Podklad na výročnú schôdzu", tierMin: 0 },
  { id: "qr", emoji: "▦", nazov: "QR nástroje", popis: "QR overenej organizácie a QR zbierok — plagát, pokladnička", tierMin: 0 },
  // ZBIERKA (T1)
  { id: "centralna", emoji: "💛", nazov: "Centrálna zbierka organizácie", popis: "Pridať a spravovať — pravidelná podpora na sektor činnosti alebo celú organizáciu", tierMin: 1 },
  { id: "segment", emoji: "🧩", nazov: "Sektory činnosti", popis: "Z registrácie — darca podporí sektor alebo celú organizáciu", tierMin: 1 },
  { id: "dlhodobe", emoji: "📆", nazov: "Dlhodobé zbierky", popis: "Zbierka bez pevného konca · predĺženie nad 30 dní · až 3 súbežné", tierMin: 1 },
  { id: "sponzoring", emoji: "🤝", nazov: "Sponzoring", popis: "Hľadáme sponzora s protiplnením · predvyplnená zmluva · logo sponzora na profile · oznam v meste · doklad o protiplnení · sponzorské zbierky bez limitu", tierMin: 1 },
  { id: "prezentacia", emoji: "📣", nazov: "Prezentácia, oznamy a inzeráty", popis: "Prezentácia činnosti a služieb · oznamy na profile · akcie na nástenku mesta · 1 inzerát (zamestnanec, brigádnik, člen)", tierMin: 1 },
  { id: "embed", emoji: "🔗", nazov: "Štít dôvery na vlastný web", popis: "Odznak s odkazom na profil (embed)", tierMin: 1 },
  // AKCIA (T2)
  { id: "podujatia", emoji: "🎟", nazov: "Benefičné podujatia a predaj", popis: "Podujatie s QR a potvrdením účasti · predaj lístkov, merchu a služieb · školenia (provízia 10 %)", tierMin: 2 },
  { id: "dobrovolnici", emoji: "🙋", nazov: "Dobrovoľníctvo", popis: "Výzva pre verejnosť · QR dochádzka (prah 60 %) · náhradníci a chat · upozornenie v okolí · výkaz hodín", tierMin: 2 },

  { id: "upoutavky", emoji: "▶️", nazov: "Upútavky na zbierky v Talente", popis: "2 videá / mesiac · až 10 súbežných zbierok · 5 inzerátov", tierMin: 2 },
  // KAMPAŇ (T3)
  { id: "sektorove-qr", emoji: "🔳", nazov: "Sektorové QR", popis: "QR pre celý sektor organizácie", tierMin: 3 },
  { id: "materialne", emoji: "📦", nazov: "Materiálne zbierky", popis: "Zbierka vecí namiesto peňazí (fáza 2)", tierMin: 3 },
  { id: "prednost", emoji: "⭐", nazov: "Prednosť vo vyhľadávaní a v adresári", popis: "Bez limitu zbierok, pobočiek a inzerátov · 4 videá / mesiac", tierMin: 3 },
  { id: "export", emoji: "📊", nazov: "Export pre grantové správy a výkazy", popis: "Podklady pre granty a výročnú správu", tierMin: 3 },
  // na spodku: nastavenie, nie nástroj
  { id: "sumy", emoji: "👁", nazov: "Viditeľnosť súm", popis: "Čo vidia návštevníci profilu", tierMin: 0 },
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
  charita: "SPRÁVA PROFILU A NÁSTROJE", tvorca: "SPRÁVA TVORCU", b2b: "SPRÁVA FIRMY",
};
