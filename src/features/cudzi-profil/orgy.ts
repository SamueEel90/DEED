// ============================================================
// REGISTER ORGANIZÁCIÍ — produkčne vyzerajúce profily subjektov.
// Každá organizácia v appke (feed, adresár, rebríčky) má cover,
// logo, „o nás", štatistiky a kampane s fotkami. Kampane sú tie
// isté zbierky, čo žijú vo feede — klik na kampaň otvára reálny
// detail so skutočným darovaním (žiadne slepé toasty).
// `najdiOrg` má deterministický fallback: aj nekurátorovaná
// organizácia dostane cover + logo z tematického poolu.
// ============================================================
import { U, AV } from "@/theme";
import { klucEntity, nacitajFotky } from "@/lib/fotoentity";
import type { Akcia } from "@/types";

export interface OrgKampan {
  id: string;
  nazov: string;
  vyzbierane: number;
  ciel: number;
  foto: string;
  emoji: string;
  popis: string;
  lok?: string;
  ludia?: number;
}

export interface OrgData {
  meno: string;
  lok: string;
  level: "Bronze" | "Silver" | "Gold" | "Legend";
  emoji: string;
  cover: string;
  logo: string;
  onas: string;
  stat: { vyzbierane: string; podporovatelia: string; skutky: string; snami: string };
  kampane: OrgKampan[];
  akcie: Akcia[];
}

// ---- tematické fotky (Unsplash cez U() — už používané inde v appke) ----
const F = {
  nemocnica: U("photo-1560306580-9e204fe45f3e"),
  zdravotnici: U("photo-1576091160399-112ba8d25d1d"),
  lieky: U("photo-1584308666744-24d5c474f2ae"),
  utulok: U("photo-1450778869180-41d0601e046e"),
  jedalen: U("photo-1628428799437-d886d7d2e9b2"),
  vydajObedov: U("photo-1593113598332-cd288d649433"),
  les: U("photo-1441974231531-c6227db76b6e"),
  hory: U("photo-1470071459604-3b5ec3a7fe05"),
  eko: U("photo-1542601906990-b4d3fb778b09"),
  kvety: U("photo-1490750967868-88aa4486c946"),
  deti: U("photo-1513151233558-d860c5398176"),
  ucenie: U("photo-1509228468518-180dd4864904"),
  art: U("photo-1513364776144-60967b0f800f"),
  dobrovolnici: U("photo-1416879595882-3373a0480b5b"),
  mladez: U("photo-1529156069898-49953e39b3ac"),
  seniori: U("photo-1603129473525-4cd6f36fe057"),
  seniori2: U("photo-1551559347-b2df2a690bd5"),
  srdce: U("photo-1518199266791-5375a83190b7"),
  ruky: U("photo-1516585427167-9f4af9627e6c"),
  voda: U("photo-1544843776-7c98a52e08a4"),
  pecivo: U("photo-1578985545062-69928b1d9587"),
  cyklo: U("photo-1517649763962-0c623066013b"),
};

// ---- kurátorované organizácie (kampane = reálne zbierky z feedov) ----
const ORGY: OrgData[] = [
  {
    meno: "OZ Otvorené dvere Trenčín", lok: "Trenčín · centrum", level: "Gold", emoji: "🍲",
    cover: F.vydajObedov, logo: F.jedalen,
    onas: "Nízkoprahová jedáleň a nocľaháreň pre ľudí bez domova v Trenčíne. Denne vydáme 120 teplých obedov a pred zimou dopĺňame zásoby. Doklady o použití prostriedkov zverejňujeme.",
    stat: { vyzbierane: "18 400 €", podporovatelia: "612", skutky: "64", snami: "4 roky" },
    kampane: [
      { id: "charitatn", nazov: "Zásoby pre jedáleň pred zimou", vyzbierane: 940, ciel: 2500, foto: F.jedalen, emoji: "🍲", lok: "Trenčín · centrum", ludia: 41,
        popis: "Nízkoprahová jedáleň vydáva denne 120 teplých obedov ľuďom bez domova. Pred zimou chýbajú zásoby." },
      { id: "charitatn-noclah", nazov: "Zimná nocľaháreň — vybavenie", vyzbierane: 1650, ciel: 4000, foto: F.ruky, emoji: "🛏", lok: "Trenčín", ludia: 96,
        popis: "Deky, matrace a hygienické potreby pre zimnú nocľaháreň. Každý dar znamená teplú noc pre človeka bez domova." },
    ],
    akcie: [{ kedy: "ŠT 17:00", nazov: "Výdaj obedov — dobrovoľníci", kde: "Jedáleň · Trenčín centrum" }],
  },
  {
    meno: "OZ Túlavá labka", lok: "Trenčín · okraj", level: "Silver", emoji: "🐾",
    cover: F.utulok, logo: F.utulok,
    onas: "Zachraňujeme opustené psy a mačky v okolí Trenčína. Staráme sa o 40 zvierat, hľadáme im nové domovy a pokrývame veterinárnu starostlivosť.",
    stat: { vyzbierane: "6 850 €", podporovatelia: "294", skutky: "31", snami: "2 roky" },
    kampane: [
      { id: "labka", nazov: "Krmivo a deky na zimu", vyzbierane: 540, ciel: 1200, foto: F.utulok, emoji: "🐾", lok: "Trenčín · okraj", ludia: 28,
        popis: "Krmivo a deky pre 40 psov a mačiek na zimu. Pomôže aj materiálny dar." },
      { id: "labka-vet", nazov: "Veterinárne ošetrenia a očkovanie", vyzbierane: 1280, ciel: 2000, foto: F.zdravotnici, emoji: "💉", lok: "Trenčín", ludia: 63,
        popis: "Očkovanie, čipovanie a kastrácie pre zvieratá pred adopciou. Zdravé zviera si rýchlejšie nájde domov." },
    ],
    akcie: [{ kedy: "SO 10:00", nazov: "Venčenie psov z útulku", kde: "Útulok · Trenčín okraj" }],
  },
  {
    meno: "Hospic Pod Brezinou", lok: "Trenčín · centrum", level: "Gold", emoji: "🕊",
    cover: F.zdravotnici, logo: F.zdravotnici,
    onas: "Paliatívna starostlivosť s dôstojnosťou do poslednej chvíle. Sprevádzame pacientov aj ich rodiny — doma aj na lôžkovom oddelení.",
    stat: { vyzbierane: "31 200 €", podporovatelia: "857", skutky: "71", snami: "3 roky" },
    kampane: [
      { id: "hospic", nazov: "Polohovacie lôžka pre paliatívne oddelenie", vyzbierane: 2380, ciel: 6000, foto: F.zdravotnici, emoji: "🛏", lok: "Trenčín · centrum", ludia: 34,
        popis: "Zbierka na polohovacie lôžka pre paliatívne oddelenie. Dôstojnosť do poslednej chvíle." },
      { id: "hospic-auto", nazov: "Auto pre mobilný hospic", vyzbierane: 8600, ciel: 12000, foto: F.cyklo, emoji: "🚗", lok: "Trenčiansky kraj", ludia: 214,
        popis: "Mobilný hospic dochádza za pacientmi domov. Staré auto dosluhuje — nové zvládne 3 rodiny denne navyše." },
    ],
    akcie: [{ kedy: "NE 15:00", nazov: "Benefičný koncert pre hospic", kde: "Kostol · Trenčín" }],
  },
  {
    meno: "Detská nemocnica — nadácia", lok: "nadácia · Bratislava", level: "Gold", emoji: "🏥",
    cover: F.nemocnica, logo: F.nemocnica,
    onas: "Pomáhame detským oddeleniam nemocníc na Slovensku. Overená nezisková organizácia. Doklady o použití prostriedkov zverejňujeme.",
    stat: { vyzbierane: "64 300 €", podporovatelia: "2 118", skutky: "176", snami: "5 rokov" },
    kampane: [
      { id: "nadacia-inkubator", nazov: "Nový inkubátor pre novorodencov", vyzbierane: 11200, ciel: 18000, foto: F.nemocnica, emoji: "👶", lok: "Bratislava", ludia: 204,
        popis: "Neonatologické oddelenie potrebuje nový inkubátor pre predčasne narodené deti. Každé euro pomáha najmenším." },
      { id: "nadacia-hracky", nazov: "Hračky pre detské oddelenie", vyzbierane: 3200, ciel: 5000, foto: F.deti, emoji: "🧸", lok: "Bratislava", ludia: 148,
        popis: "Herňa na detskom oddelení robí z nemocnice znesiteľnejšie miesto. Hračky, knihy a výtvarné potreby pre malých pacientov." },
    ],
    akcie: [{ kedy: "SO 09:00", nazov: "Benefičný beh pre oddelenie", kde: "Mesto Trenčín · 300 bežcov" }],
  },
  {
    meno: "Motýlik", lok: "Detský hospic · Bratislava", level: "Gold", emoji: "🕊",
    cover: F.srdce, logo: F.srdce,
    onas: "Detský hospic — mobilná paliatívna starostlivosť pre nevyliečiteľne choré deti a ich rodiny. Sprevádzame doma, kde je deťom najlepšie.",
    stat: { vyzbierane: "128 500 €", podporovatelia: "4 902", skutky: "408", snami: "5 rokov" },
    kampane: [
      { id: "motylik-mobil", nazov: "Mobilná paliatívna starostlivosť", vyzbierane: 42300, ciel: 60000, foto: F.zdravotnici, emoji: "🚑", lok: "celá SR", ludia: 1240,
        popis: "Tím lekárov a sestier dochádza za deťmi domov po celom Slovensku. Ročné náklady na jednu rodinu sú 4 800 €." },
    ],
    akcie: [{ kedy: "NE 14:00", nazov: "Spomienkové stretnutie rodín", kde: "Bratislava · Motýlik" }],
  },
  {
    meno: "Nádej pacientom", lok: "Onkopacienti · celé SR", level: "Legend", emoji: "🎗",
    cover: F.lieky, logo: F.lieky,
    onas: "Už 30 rokov pomáhame onkologickým pacientom a ich rodinám — poradenstvo, ubytovanie pri liečbe, rekondičné pobyty a prevencia.",
    stat: { vyzbierane: "212 000 €", podporovatelia: "9 340", skutky: "778", snami: "5 rokov" },
    kampane: [
      { id: "nadej-den-stuzky", nazov: "Deň žltej stužky — podpora pacientov", vyzbierane: 86000, ciel: 120000, foto: F.kvety, emoji: "🌼", lok: "celá SR", ludia: 5120,
        popis: "Výnos Dňa žltej stužky financuje bezplatné poradenstvo, ubytovanie rodín pri liečbe a rekondičné pobyty pacientov." },
    ],
    akcie: [{ kedy: "ŠT 10:00", nazov: "Deň žltej stužky — dobrovoľníci v uliciach", kde: "celá SR" }],
  },
  {
    meno: "Tichý pomocník", lok: "Rodiny s vážnou chorobou · SR", level: "Gold", emoji: "😇",
    cover: F.srdce, logo: F.kvety,
    onas: "Pravidelné mesačné príspevky rodinám, kde choroba dieťaťa alebo rodiča spôsobila finančnú núdzu. Každé euro od darcov ide rodinám do posledného centu.",
    stat: { vyzbierane: "540 000 €", podporovatelia: "18 250", skutky: "1520", snami: "5 rokov" },
    kampane: [
      { id: "pomocnik-rodiny", nazov: "Mesačná pomoc 3 200 rodinám", vyzbierane: 265000, ciel: 400000, foto: F.srdce, emoji: "💛", lok: "celá SR", ludia: 18250,
        popis: "Pravidelný mesačný príspevok drží rodiny s chorým dieťaťom nad vodou. Systém Dobrého anjela posiela darcom presné vyúčtovanie." },
    ],
    akcie: [],
  },
  {
    meno: "Náruč deťom", lok: "Deti v náhradnej starostlivosti · SR", level: "Gold", emoji: "🧒",
    cover: F.deti, logo: F.deti,
    onas: "Aby každé dieťa malo rodinu. Podporujeme deti v centrách pre deti a rodiny, sprevádzame náhradné rodiny a pomáhame súrodencom ostať spolu.",
    stat: { vyzbierane: "98 700 €", podporovatelia: "3 605", skutky: "300", snami: "5 rokov" },
    kampane: [
      { id: "naruc-tabory", nazov: "Letné tábory pre deti z centier", vyzbierane: 7400, ciel: 15000, foto: F.mladez, emoji: "⛺", lok: "celá SR", ludia: 411,
        popis: "Týždeň tábora pre dieťa z centra znamená kamarátov, zážitky a pocit normálneho detstva. Jeden pobyt = 180 €." },
    ],
    akcie: [{ kedy: "SO 13:00", nazov: "Deň rodiny — komunitné podujatie", kde: "Bratislava · Sad Janka Kráľa" }],
  },
  {
    meno: "Zvieracia archa", lok: "Útulky · celá SR", level: "Gold", emoji: "🐾",
    cover: F.utulok, logo: F.utulok,
    onas: "Najväčšia sieť útulkov na Slovensku. Ročne zachránime tisíce zvierat — veterinárna starostlivosť, adopcie a terénne zásahy proti týraniu.",
    stat: { vyzbierane: "156 000 €", podporovatelia: "7 812", skutky: "651", snami: "5 rokov" },
    kampane: [
      { id: "archa-utulky", nazov: "Prevádzka útulkov a krmivo", vyzbierane: 34500, ciel: 50000, foto: F.utulok, emoji: "🐕", lok: "celá SR", ludia: 2140,
        popis: "Denná prevádzka útulkov: krmivo, energie a veterinárna starostlivosť pre stovky zvierat čakajúcich na domov." },
    ],
    akcie: [{ kedy: "SO 10:00", nazov: "Adopčný deň", kde: "Útulok Polianky · Bratislava" }],
  },
  {
    meno: "Prístrešie SK", lok: "Ľudia bez domova · Bratislava", level: "Silver", emoji: "🏠",
    cover: F.vydajObedov, logo: F.ruky,
    onas: "Nocľahárne a útulky s najnižším prahom — prijmeme každého. Nocľah, jedlo, ošetrenie a cesta späť do života pre ľudí bez domova.",
    stat: { vyzbierane: "72 400 €", podporovatelia: "2 511", skutky: "209", snami: "5 rokov" },
    kampane: [
      { id: "pristresie-nocl", nazov: "Nocľaháreň sv. Vincenta — zima", vyzbierane: 18200, ciel: 30000, foto: F.vydajObedov, emoji: "🛏", lok: "Bratislava", ludia: 903,
        popis: "V mrazoch je nocľaháreň otázka života. Jedna noc s večerou a ošetrením pre jedného človeka = 9 €." },
    ],
    akcie: [{ kedy: "PO–NE", nazov: "Výdaj polievky — dobrovoľníci", kde: "Bratislava · Mýtna" }],
  },
  {
    meno: "Stromosvet", lok: "Výsadba stromov · SR", level: "Bronze", emoji: "🌳",
    cover: F.les, logo: F.les,
    onas: "Sadíme stromy tam, kde chýbajú — mestské aleje, vetrolamy aj obnova lesov po kalamitách. Každý strom má svojho darcu.",
    stat: { vyzbierane: "12 300 €", podporovatelia: "740", skutky: "61", snami: "3 roky" },
    kampane: [
      { id: "stromosvet-brezina", nazov: "1 000 stromov pre Brezinu", vyzbierane: 4100, ciel: 8000, foto: F.les, emoji: "🌳", lok: "Trenčín · Brezina", ludia: 312,
        popis: "Obnova lesoparku Brezina po kalamite. Jeden strom so sadením a starostlivosťou = 8 €." },
    ],
    akcie: [{ kedy: "SO 09:00", nazov: "Výsadba stromov — 10 dobrovoľníkov", kde: "Trenčín · Brezina" }],
  },
  {
    meno: "Klub seniorov Sihoť", lok: "Komunita · Sihoť", level: "Silver", emoji: "☕",
    cover: F.seniori, logo: F.seniori2,
    onas: "Komunitný klub pre osamelých seniorov na Sihoti — pravidelné stretnutia, výlety, tvorivé dielne a medzigeneračné akcie so školami.",
    stat: { vyzbierane: "3 900 €", podporovatelia: "186", skutky: "15", snami: "2 roky" },
    kampane: [
      { id: "seniori-dielne", nazov: "Tvorivé dielne a výlety pre seniorov", vyzbierane: 820, ciel: 2000, foto: F.seniori, emoji: "🎨", lok: "Trenčín · Sihoť", ludia: 74,
        popis: "Program na celý polrok: dielne, prednášky a dva výlety. Účasť pre seniorov zostáva zadarmo." },
    ],
    akcie: [{ kedy: "UT 15:00", nazov: "Stretnutie klubu — otvorené", kde: "KC Sihoť" }],
  },
  {
    meno: "Dobrovoľní hasiči TN", lok: "Komunita · Trenčín", level: "Gold", emoji: "🚒",
    cover: F.dobrovolnici, logo: F.dobrovolnici,
    onas: "Dobrovoľný hasičský zbor Trenčín — zásahy pri povodniach a požiaroch, ukážky pre školy a výcvik mladých hasičov.",
    stat: { vyzbierane: "9 100 €", podporovatelia: "402", skutky: "33", snami: "2 roky" },
    kampane: [
      { id: "hasici-vybava", nazov: "Zásahová výbava pre mladých hasičov", vyzbierane: 2900, ciel: 6000, foto: F.dobrovolnici, emoji: "🧯", lok: "Trenčín", ludia: 168,
        popis: "Prilby, rukavice a výstroj pre dorast. Mladí hasiči trénujú s výbavou po starších — potrebujú vlastnú." },
    ],
    akcie: [{ kedy: "SO 14:00", nazov: "Deň otvorených dverí zbrojnice", kde: "Trenčín · zbrojnica" }],
  },
];

// ---- fallback pool — deterministicky podľa mena (aj nekurátorovaná org má fotky) ----
const POOL: { cover: string; logo: string }[] = [
  { cover: F.dobrovolnici, logo: F.ruky },
  { cover: F.hory, logo: F.les },
  { cover: F.mladez, logo: F.deti },
  { cover: F.ucenie, logo: F.art },
  { cover: F.voda, logo: F.eko },
  { cover: F.seniori2, logo: F.seniori },
  { cover: F.kvety, logo: F.srdce },
  { cover: F.pecivo, logo: F.jedalen },
];

const hashMena = (m: string) => { let h = 0; for (let i = 0; i < m.length; i++) h = (h * 31 + m.charCodeAt(i)) >>> 0; return h; };

/** Nájde profil organizácie podľa mena — kurátorovaný, alebo deterministický fallback. */
// Fotky nahraté v appke (profilová/titulná) prebijú fotky z registra —
// vďaka tomu ich vidno všade, kde sa organizácia kreslí (adresár, feed,
// detail zbierky), nielen na jej profile. Kurátorovaný objekt sa NEmutuje.
function sVlastnymiFotkami(o: OrgData): OrgData {
  const f = nacitajFotky(klucEntity("org", o.meno));
  if (!f.avatar && !f.cover) return o;
  return { ...o, logo: f.avatar ?? o.logo, cover: f.cover ?? o.cover };
}

export function najdiOrg(meno?: string): OrgData {
  const m = (meno || "").trim().toLowerCase();
  const kur = ORGY.find((o) => o.meno.toLowerCase() === m || (m && (o.meno.toLowerCase().includes(m) || m.includes(o.meno.toLowerCase()))));
  if (kur) return sVlastnymiFotkami(kur);
  const p = POOL[hashMena(m || "org") % POOL.length];
  const n = hashMena(m || "org");
  return sVlastnymiFotkami({
    meno: meno || "Organizácia", lok: "Slovensko", level: "Silver", emoji: "🏛",
    cover: p.cover, logo: p.logo,
    onas: `${meno || "Organizácia"} je overená organizácia na platforme DEED. Doklady o použití prostriedkov zverejňuje pri každej zbierke.`,
    stat: { vyzbierane: `${(2 + (n % 38)).toLocaleString("sk")} ${(100 + (n % 900)).toString().padStart(3, "0")} €`, podporovatelia: (120 + (n % 4200)).toLocaleString("sk"), skutky: String(8 + (n % 140)), snami: `${1 + (n % 5)} rok${(1 + (n % 5)) === 1 ? "" : (1 + (n % 5)) < 5 ? "y" : "ov"}` },
    kampane: [
      { id: `gen-${n % 9999}`, nazov: "Všeobecná podpora organizácie", vyzbierane: 800 + (n % 4000), ciel: 6000, foto: p.cover, emoji: "💛", lok: "Slovensko", ludia: 40 + (n % 300),
        popis: "Podpora dlhodobej činnosti organizácie — každé euro je dohľadateľné a vyúčtované." },
    ],
    akcie: [],
  });
}

/** Avatar osoby (pravatar) — deterministicky podľa mena, pre feedy/adresáre. */
export const avatarOsoby = (meno: string) => AV(1 + (hashMena(meno) % 60));
