// ============================================================
// KARTA 36 · Správa stránky — jedna správa pre všetky typy (charita, spolok, … firma, tvorca). Typ len vypína
// položky, pridáva nástroje a mení slová — tabuľky sú v stav.ts (POVOLENIA_TYPU, NASTROJE_TYPU, SLOVA_TYPU …).
// KARTA 34 · Správa charity — KOSTRA (fáza A).
// Prototyp: „Sprava charity PC.dc.html" (Pult charity PC) + „Sprava charity mobil.dc.html".
// Len rozloženie, farby podľa štítu a témy, Späť všade, povolenia z jedného miesta (stav.ts).
// Funkcie za tlačidlami NIE SÚ — každé tlačidlo otvorí obrazovku „Pripravujeme".
// ============================================================
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { DeedZnacka } from "@/components/DeedZnacka";
import { UpravitProfilCharity, VerejnyProfilOkno, zakladnyProfil } from "./UpravitProfilCharity";
import { nacitajProfil, profilZPamate, uplnostProfilu, type ProfilStranky } from "@/lib/profilStranky";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@/styles/sprava.css";
import { useLayout, useMotiv } from "@/components/context";
import { toast } from "@/components/toast";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { potvrditTuknutim, nastavPotvrditTuknutim } from "@/features/zbierka/Platba";
import { TESTOVACIA } from "@/lib/testovacia";
import { nacitajPiny, ulozPiny, pinyZPamate, nacitajZbalenie, ulozZbalenie, zbalenieZPamate, type Zbalenie } from "@/lib/spravaPiny";
import { nastavStitSpravy } from "@/lib/stitAppky";
import { ObrOznamenia, ObrEur, ObrEurc, ObrUcty, ObrSpravcovia, ObrUdaje, ObrProgram, ObrZariadenia, ObrSuhlasy, ObrStiahnut, ObrFaq, ObrPodpora, ObrZrusit, PROG, pocetSpravcov, pocetZariadeni, eurcText, eurText } from "./NastaveniaCharity";
import {
  FLAGS, nacitajTiery, ulozTiery, maPovolenie, vidnoPolozku, smieSkutokZaCharitu, type RolaStranky, odProgramu, PROGRAM_NAZOV, PIN_MAX,
  nacitajStitCharity, ulozStitCharity, nacitajCharituNovu, ulozCharituNovu,
  type PolozkaSpravy, type StitCharity, type Tier, type Pozicia,
  type TypStranky, TYP_NAZOV, TYPY_STRANOK, TYP_SKRYTY, NASTROJE_TYPU, typPovoli, STIT_SADA_TYPU, type StitSada,
} from "./stav";

// ---------- ikony (cesty z prototypu) ----------
const IK = {
  zbierky: "M12 21s-7-4.5-9-9.5C1.6 7.9 4 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.4 2.9 4 6.5-2 5-9 9.5-9 9.5z",
  obsah: "M4 10v4h3l6 4V6L7 10zM17 9a4 4 0 0 1 0 6",
  ludia: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M16 5.5a3 3 0 0 1 0 5.5M18 15c1.6.6 2.6 2.4 3 5",
  penazenka: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4 2 4M16 13.5h.01",
  nastroje: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 17v3h-3",
  prehlad: "M3 13h4v7H3zM10 8h4v12h-4zM17 4h4v16h-4z",
  nast: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  sipkaP: "M9 6l6 6-6 6", sipkaL: "M15 18l-6-6 6-6", dole: "M6 9l6 6 6-6",
  pin: "M9 4h6l-1 6 3 3H7l3-3zM12 13v7",
  kal: "M4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2",
  retaz: "M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1",
  budova: "M4 21V7l8-4 8 4v14M9 21v-5h6v5",
  fajka: "M5 12l5 5 9-10",
  svet: "M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",
};
function Ik({ d, s = 20, c = "var(--acc)", w = 1.9, fill = "none", style }: { d: string; s?: number; c?: string; w?: number; fill?: string; style?: React.CSSProperties }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", ...style }}><path d={d} /></svg>;
}
const OkoIk = ({ c = "var(--tInk)" }: { c?: string }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
const KalIk = ({ s = 20, w = 1.9 }: { s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><rect x="4" y="5" width="16" height="15" rx="2" /><path d={s > 16 ? IK.kal : "M4 10h16M8 3v4M16 3v4"} /></svg>;

// ---------- položky menu (texty z prototypu) ----------
type Skupina = "g_zbierky" | "g_obsah" | "g_ludia" | "g_nastroje" | "g_typ";
type Karta = { id: PolozkaSpravy; t: string; s: string; d: string };
const P = (d: string, t: string, s: string, id: PolozkaSpravy): Karta => ({ d, t, s, id });
const G: Record<Exclude<Skupina, "g_zbierky" | "g_typ">, Karta[]> = {
  g_obsah: [
    P("M12 3l2.5 5.5L20 9l-4.5 4 1.5 6-5-3-5 3 1.5-6L4 9l5.5-.5z", "Skutky", "Takto sme pomohli · fotky pred a po, doklady", "skutky"),
    P("M4 6h16v12H4zM10 9l5 3-5 3z", "Iskra", "Video do 45 s s platobným modulom", "video"),
    P("M4 10v4h3l6 4V6L7 10z", "Oznamy", "Krátka správa pre tých, čo vás sledujú", "oznamy"),
    P("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", "Moja nástenka", "Udalosti na nástenke mesta", "nastenka"),
    P("M5 4h14v16H5zM9 9l6 3-6 3z", "Upútavky v Iskre", "Upútavka na zbierku medzi Iskrami", "upoutavky"),
  ],
  g_ludia: [
    P("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6", "Darcovia a sumy", "Zoznam darcov a hromadné poďakovanie", "darcovia"),
    P("M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5", "Sledujúci", "1 204 ľudí · +38 za mesiac", "sledujuci"),
    P("M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M16 5.5a3 3 0 0 1 0 5.5", "Dobrovoľníctvo", "Výzva pre verejnosť, dochádzka cez QR, výkaz hodín", "dobrovolnici"),
    P("M4 6h16v14H4zM4 10h16", "Akcie a podujatia", "Podujatie s QR, predaj lístkov a merchu", "podujatia"),
    P("M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z", "Sponzoring", "Hľadáme sponzora · zmluva, logo na profile", "sponzoring"),
    P("M9 7V4h6v3M4 7h16v13H4z", "Pracovné ponuky", "Hľadáme brigádnika, zamestnanca, pomoc", "inzeraty"),
  ],
  g_nastroje: [
    P("M12 5v14M5 12h14", "Pridať skutok", "Fotky a pár viet o tom, komu ste pomohli", "pridatSkutok"),
    P("M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z", "QR nástroje", "QR organizácie a zbierok · plagát, pokladnička", "qr"),
    P("M4 4h16v16H4z", "Sektorové QR", "QR pre celý sektor organizácie", "sektorqr"),
    P(IK.retaz, "Štít dôvery na web", "Odznak s odkazom na váš profil", "embed"),
    P("M12 3l2.5 5.5L20 9l-4.5 4 1.5 6-5-3-5 3 1.5-6L4 9l5.5-.5z", "Prednosť vo vyhľadávaní", "Vyššie v adresári a vo vyhľadávaní", "prednost"),
    P(IK.prehlad, "Štatistiky", "Vyzbierané, darcovia, doklady načas", "statistiky"),
    P("M6 3h9l4 4v14H6zM14 3v5h5", "Ročný výpis činnosti", "Podklad na výročnú schôdzu", "vypis"),
    P("M4 20V10M10 20V4M16 20v-7M22 20H2", "Export pre granty", "Podklady pre grantové správy a výkazy", "export"),
  ],
};
const DRUHY: Karta[] = [
  P(IK.zbierky, "Centrálna zbierka", "Pravidelná podpora celej organizácie alebo sektora", "centralna"),
  P(IK.budova, "Dorovnanie daru", "Firma pridá k daru ľudí svoj diel", "dorovnanie"),
  P("M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", "Sektorové zbierky", "Vlastná zbierka, účet a QR pre každý sektor", "segment"),
  P("M4 7l8-4 8 4v10l-8 4-8-4zM4 7l8 4 8-4M12 11v10", "Materiálne zbierky", "Zbierka vecí namiesto peňazí", "materialne"),
];
/** KARTA 36: nástroje, ktoré pridáva typ (popisy dodá dizajn) */
const KARTY_TYPU: Partial<Record<PolozkaSpravy, Karta>> = {
  dorovnavanie: P(IK.budova, "Dorovnávanie", "", "dorovnavanie"),
  zamestnanci: P(IK.ludia, "Zamestnanci", "", "zamestnanci"),
  esg: P(IK.prehlad, "ESG výkaz", "", "esg"),
  firemnyqr: P("M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z", "Firemný QR", "", "firemnyqr"),
};
const NAV: { k: Skupina | "penazenka"; t: string; d: string; n?: number }[] = [
  { k: "g_zbierky", t: "Zbierky", d: IK.zbierky },
  { k: "g_obsah", t: "Obsah", d: IK.obsah },
  { k: "g_ludia", t: "Ľudia", d: IK.ludia, n: 6 },
  { k: "penazenka", t: "Peňaženka", d: IK.penazenka },
  { k: "g_nastroje", t: "Nástroje a výkazy", d: IK.nastroje },
];
/** všetky položky na pripnutie: názov, skupina, ikona skupiny */
const VSE: { id: PolozkaSpravy; t: string; g: string; d: string }[] = [
  { id: "zbierky", t: "Moje zbierky", g: "Zbierky", d: IK.zbierky },
  ...DRUHY.map((k) => ({ id: k.id, t: k.t, g: "Zbierky", d: IK.zbierky })),
  ...G.g_obsah.map((k) => ({ id: k.id, t: k.t, g: "Obsah", d: IK.obsah })),
  ...G.g_ludia.map((k) => ({ id: k.id, t: k.t, g: "Ľudia", d: IK.ludia })),
  ...G.g_nastroje.map((k) => ({ id: k.id, t: k.t, g: "Nástroje a výkazy", d: IK.nastroje })),
];
const NAZOV_POLOZKY = Object.fromEntries([...VSE.map((v) => [v.id, v.id === "zbierky" ? "Moje zbierky" : v.t]), ...Object.values(KARTY_TYPU).map((k) => [k!.id, k!.t])]) as Record<PolozkaSpravy, string>;

/** KARTA 36: menu podľa typu — čo typ vypína, zmizne; nástroje typu idú navrch do vlastnej skupiny */
type Menu = { typ: TypStranky; nav: { k: Skupina | "penazenka"; t: string; d: string; n?: number }[]; skupiny: Partial<Record<Skupina, Karta[]>>; mojeZbierky: boolean; druhy: Karta[]; vse: typeof VSE };
function menuTypu(typ: TypStranky, tier: Tier): Menu {
  const navrch = NASTROJE_TYPU[typ].filter((id) => vidnoPolozku(id, tier));
  const ok = (id: PolozkaSpravy) => typPovoli(id, typ) && !navrch.includes(id) && vidnoPolozku(id, tier); // OPRAVY 118
  const kartaNavrch = (id: PolozkaSpravy): Karta | undefined => KARTY_TYPU[id] ?? [...DRUHY, ...G.g_obsah, ...G.g_ludia, ...G.g_nastroje].find((k) => k.id === id);
  const skupiny: Partial<Record<Skupina, Karta[]>> = {
    g_typ: navrch.map(kartaNavrch).filter((k): k is Karta => !!k),
    g_obsah: G.g_obsah.filter((k) => ok(k.id)), g_ludia: G.g_ludia.filter((k) => ok(k.id)), g_nastroje: G.g_nastroje.filter((k) => ok(k.id)),
  };
  const druhy = DRUHY.filter((k) => ok(k.id)), mojeZbierky = ok("zbierky");
  const d: Record<string, string> = { g_typ: navrch.length && KARTY_TYPU[navrch[0]] ? IK.nastroje : navrch.length ? G.g_obsah.find((k) => k.id === navrch[0])?.d ?? IK.obsah : IK.obsah };
  const nav = [
    ...(navrch.length ? [{ k: "g_typ" as const, t: TYP_NAZOV[typ], d: d.g_typ }] : []),
    ...NAV.filter((n) => n.k === "penazenka" || (n.k === "g_zbierky" ? mojeZbierky || druhy.length > 0 : (skupiny[n.k]?.length ?? 0) > 0)),
  ];
  const vse = [
    ...skupiny.g_typ!.map((k) => ({ id: k.id, t: k.t, g: TYP_NAZOV[typ], d: d.g_typ })),
    ...VSE.filter((v) => ok(v.id)),
  ];
  return { typ, nav, skupiny, mojeZbierky, druhy, vse };
}
const SKUPINA_POLOZKY = (id: PolozkaSpravy, typ: TypStranky = "charita"): Skupina | null => NASTROJE_TYPU[typ].includes(id) ? "g_typ" : (id === "zbierky" || DRUHY.some((k) => k.id === id) ? "g_zbierky" : (Object.keys(G) as (keyof typeof G)[]).find((g) => G[g].some((k) => k.id === id)) ?? null);

// ---------- obrazovky ----------
/** null = Prehľad · skupina · penazenka · nast · položka (PolozkaSpravy) · "x:Názov" = obrazovka Pripravujeme */
type Sub = null | Skupina | "penazenka" | "nast" | "profil" | "vsetko" | PolozkaSpravy | `x:${string}` | `n:${string}`;
const NAZVY: Record<string, string> = { g_zbierky: "Zbierky", g_obsah: "Obsah", g_ludia: "Ľudia", g_nastroje: "Nástroje a výkazy", penazenka: "Peňaženka", nast: "Nastavenia", profil: "Upraviť profil", vsetko: "Všetko, čo DEED+ vie" };
/** KARTA 35: obrazovky Nastavení */
const NAST_OBR: Record<string, string> = { notif: "Čo chcete dostávať", eur: "Dary v eurách", krypto: "Dary v EURC", ucty: "Správa účtov", spravcovia: "Správcovia a prístupy", udaje: "Údaje organizácie", program: "Program a platba", zariadenia: "Prihlásené zariadenia", suhlasy: "Súhlasy", stiahnut: "Stiahnuť údaje charity", faq: "Časté otázky", podpora: "Napísať podpore", zrusit: "Zrušiť stránku charity" };
const titulok = (s: Sub, typ: TypStranky) => (s === null ? "Prehľad" : s.startsWith("x:") ? s.slice(2) : s.startsWith("n:") ? NAST_OBR[s.slice(2)] ?? "Nastavenia" : s === "g_typ" ? TYP_NAZOV[typ] : NAZVY[s] ?? NAZOV_POLOZKY[s as PolozkaSpravy] ?? "Správa stránky");

// ---------- štít ----------
const STITY: Record<StitCharity, [string, string, string, string]> = {
  bronze: ["Bronzový", "Ale to Striebro má iný lesk.", "Bronze", "Bronz"],
  silver: ["Strieborný", "Ale to Zlato má iný lesk.", "Silver", "Striebro"],
  gold: ["Zlatý", "Ale tá Platina má iný lesk.", "Gold", "Zlato"],
  platinum: ["Platinový", "Ale Legenda má iný lesk.", "Platinum", "Platina"],
  legend: ["Legenda", "Najvyšší štít, aký charita môže mať.", "Legend", "Legenda"],
};
/** sada štítov podľa typu (STIT_SADA_TYPU) — firemný štít zatiaľ nemá obrázky, používa CARE */
const SADA_PRIECINOK: Record<StitSada, string> = { care: "care", firma: "care" };
const SADA_NAZOV: Record<StitSada, string> = { care: "CARE", firma: "CARE" };
const stitImg = (k: StitCharity, maly = false, sada: StitSada = "care") => `/stity/${SADA_PRIECINOK[sada]}/${k}${maly ? "-200" : ""}.webp`;

// ---------- dáta ukážky (z prototypu) ----------
const OBD = ["Dnes", "7 dní", "30 dní", "Rok"];
const K8 = ["Vyzbierané", "Počet darov", "Priemerný dar", "Noví darcovia", "Pravidelná podpora", "Dorovnané partnermi", "Sledujúci", "Darcovia spolu"];
const D8: [string, string][][] = [
  [["146 €", "+18 % oproti včera"], ["9", "+2"], ["16,22 €", ""], ["3", ""], ["19 ľudí", ""], ["40 €", "1 partner"], ["1 204", "+2 dnes"], ["312", "od začiatku"]],
  [["460 €", "+12 % oproti min. týždňu"], ["23", "+8 %"], ["20,00 €", ""], ["7", "+3"], ["19 ľudí", "+1 nový"], ["120 €", "1 partner"], ["1 204", "+9 za týždeň"], ["312", "od začiatku"]],
  [["1 940 €", "+9 % oproti min. mesiacu"], ["64", "+6 %"], ["30,31 €", ""], ["21", "+5"], ["19 ľudí", "+3 noví"], ["620 €", "1 partner"], ["1 204", "+38 za mesiac"], ["312", "od začiatku"]],
  [["18 420 €", "od januára"], ["642", ""], ["28,69 €", ""], ["248", ""], ["19 ľudí", ""], ["2 140 €", "3 partneri"], ["1 204", "+410 za rok"], ["312", "od začiatku"]],
];
const N8 = ["0 €", "0", "—", "0", "0 ľudí", "0 €", "0", "0"];
const ULOHY: [string, string, string, string][] = [
  ["#C9A24A", "Strecha pre rodinu Horváthovú končí o 9 dní", "Chýba 3 580 €. Pripomeňte ju sledujúcim.", "Pripomenúť"],
  ["#A34A2A", "Doklady k zbierke Teplé jedlo na zimu", "Nahrajte do 12. 10. 2026.", "Nahrať"],
  ["var(--green)", "6 dobrovoľníkov na sobotu", "Prihlásili sa na brigádu vo výdajni. Potvrďte im účasť.", "Potvrdiť"],
];
const PRUHY = "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)";
const PH_ZBIERKY: { t: string; v: number; c: number; d: string; bg: string; dn: number }[] = [
  { t: "Strecha pre rodinu Horváthovú", v: 8420, c: 12000, d: "končí o 9 dní", bg: "url('/img/sprava/dom.jpg') center/cover no-repeat var(--track)", dn: 46 },
  { t: "Centrálna zbierka Svetla pomoci", v: 2180, c: 0, d: "otvorená", bg: PRUHY, dn: 0 },
  // OPRAVY 99: ukážka (DEV) — 4 bežiace zbierky, aby bolo vidno bod 93 na širokom monitore
  { t: "Invalidný vozík pre Ninu", v: 2960, c: 4000, d: "končí o 18 dní", bg: "url('/img/sprava/chrbtica.jpg') center/cover no-repeat var(--track)", dn: 25 },
  { t: "Teplé jedlo na zimu", v: 4310, c: 5000, d: "končí o 4 dni", bg: PRUHY, dn: 75 },
];
const ZB_LIST: { t: string; v: number; c: number; bg: string; s: string; konc: boolean }[] = [
  { t: "Strecha pre rodinu Horváthovú", v: 8420, c: 12000, bg: "url('/img/sprava/dom.jpg') center/cover no-repeat var(--track)", s: "186 darcov · končí o 9 dní", konc: false },
  { t: "Invalidný vozík pre Ninu", v: 2960, c: 4000, bg: "url('/img/sprava/chrbtica.jpg') center/cover no-repeat var(--track)", s: "94 darcov · končí o 18 dní", konc: false },
  { t: "Teplé jedlo na zimu", v: 5400, c: 5000, bg: PRUHY, s: "ukončená 20. 9. 2026 · čaká na doklady", konc: true },
];
const RETAZ: [string, string, string, string][] = [["MK", "Martin K.", "pripojil sa k Strecha pre rodinu Horváthovú", "420 €"], ["ZŠ", "ZŠ Hodžova", "pripojila sa k Centrálnej zbierke", "160 €"], ["LS", "Lucia S.", "pripojila sa k Centrálnej zbierke", "60 €"]];
const eur = (n: number) => n.toLocaleString("sk-SK") + " €";
const dnes = () => { const s = new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long" }).format(new Date()); return s.charAt(0).toUpperCase() + s.slice(1); };

// ---------- spoločné štýly ----------
const nadpisSekcie: React.CSSProperties = { flex: "none", fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)", padding: "4px 4px 0" };
const karta: React.CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const zeleneTl: React.CSSProperties = { flex: "none", height: 44, padding: "0 18px", border: "none", borderRadius: 13, background: "var(--green)", cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" };
const Pruh = ({ sc, h = 8, bg = "var(--track)", c = "var(--green)" }: { sc: number; h?: number; bg?: string; c?: string }) => (
  <span style={{ display: "block", height: h, borderRadius: h / 2, background: bg, overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: h / 2, background: c, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, sc)})`, transition: "transform .5s ease" }} /></span>
);

export interface SpravaStrankyProps {
  onBack: () => void;
  /** typ stránky (KARTA 36) — predvolene charita */
  typ?: TypStranky;
  /** stránka charity (kľúč pre pripnuté v účte) */
  strankaId?: string;
  /** názov a iniciály charity (Moje stránky / registrácia) */
  nazov?: string;
  inicialy?: string;
}

/** typ → rola s tierom (program): firma = B2B, tvorca = tvorca, ostatní = charita */
const POZICIA_TYPU = (t: TypStranky): Pozicia => (t === "firma" ? "b2b" : t === "tvorca" ? "tvorca" : "charita");

export function SpravaStranky({ onBack, typ: typStranky = "charita", strankaId = "svetlo", nazov = "Svetlo pomoci o.z.", inicialy = "SP" }: SpravaStrankyProps) {
  const { desktop, wide } = useLayout();
  const tablet = wide && !desktop; // OPRAVY 96: tablet 760–1179 px má vlastné rozloženie
  const [sub, setSub] = useState<Sub>(null);
  // OPRAVY 95: zbalené sekcie Prehľadu (mobil + tablet), pamätá sa v účte správcu ako Pripnuté
  const [zbal, setZbal] = useState<Zbalenie>(() => zbalenieZPamate(strankaId));
  useEffect(() => { let ziva = true; void nacitajZbalenie(strankaId).then((z) => { if (ziva) setZbal(z); }); return () => { ziva = false; }; }, [strankaId]);
  const prepniZbal = (id: string, otv?: boolean) => setZbal((z) => { const n = { ...z, [id]: otv ?? !jeOtv(z, id) }; void ulozZbalenie(strankaId, n); return n; });
  const hist = useRef<Sub[]>([]);
  const [typ, setTyp] = useState<TypStranky>(typStranky); // DEV lišta ho vie prepnúť
  const poz = POZICIA_TYPU(typ);
  const sada = STIT_SADA_TYPU[typ];
  const [tiery, setTiery] = useState(nacitajTiery);
  const tier = tiery[poz];
  const menu = menuTypu(typ, tier);
  const setTier = (t: Tier) => { const n = { ...nacitajTiery(), [poz]: t }; setTiery(n); ulozTiery(n); };
  const [stit, setStit] = useState<StitCharity>(nacitajStitCharity);
  const [nova, setNova] = useState<boolean>(nacitajCharituNovu);
  // OPRAVY 109: testovacia lišta — Nová · pozvaná (prvých 50, P3 zadarmo) / Nová · zadarmo / Bežná
  const [pozvana, setPozvana] = useState<boolean>(() => { try { return localStorage.getItem("deed.dev.pozvana") === "1"; } catch { return false; } });
  const [piny, setPiny] = useState<PolozkaSpravy[]>(() => pinyZPamate(strankaId));
  useEffect(() => { let ziva = true; void nacitajPiny(strankaId).then((p) => { if (ziva) setPiny(p); }); return () => { ziva = false; }; }, [strankaId]);
  const [zoom, setZoom] = useState(false);
  // KARTA 33: uložený profil stránky (percento v karte charity sa počíta z neho, nie z konceptu)
  const [profil, setProfil] = useState<ProfilStranky | null>(() => profilZPamate(strankaId).ulozeny);
  // OPRAVY 112: koncept (aj práve rozpracovaná úprava) — percento rastie naživo, nie až po Uložiť
  const [koncept, setKoncept] = useState<ProfilStranky | null>(() => profilZPamate(strankaId).koncept);
  useEffect(() => { let ziva = true; void nacitajProfil(strankaId).then((z) => { if (ziva) { setProfil(z.ulozeny); setKoncept(z.koncept); } }); return () => { ziva = false; }; }, [strankaId]);
  const uplnost = uplnostProfilu(koncept ?? profil ?? zakladnyProfil(poz));
  // OPRAVY 91: bočný panel appky berie farbu štítu otvorenej stránky
  useEffect(() => { nastavStitSpravy(stit); }, [stit]);
  useEffect(() => () => nastavStitSpravy(null), []);
  const korenRef = useRef<HTMLDivElement>(null);

  // OPRAVY 121 · bod 9: rola prihláseného v tejto stránke (zatiaľ vždy hlavný správca — rolu doplní server zo správcov stránky)
  const rola: RolaStranky = "hlavny";
  const [verejny, setVerejny] = useState(false); // OPRAVY 107: tlačidlo Verejný profil = skutočný verejný profil
  const otvor = (s: Sub) => { if (s === "x:Verejný profil") { setVerejny(true); return; }
    // OPRAVY 118/121: Pridať skutok = ten istý PridatSkutok, za charitu (organizacia: true)
    if (s === "pridatSkutok") { if (!smieSkutokZaCharitu(rola)) { toast("Skutok za charitu pridá len správca alebo Organizátor."); return; } otvorPridatSkutok({ autor: nazov, organizacia: true, strankaId }); return; } if (s === sub) return; hist.current = [...hist.current, sub].slice(-30); setSub(s); };
  const spat = () => {
    if (hist.current.length) { const h = [...hist.current]; const p = h.pop()!; hist.current = h; setSub(p); }
    else if (sub !== null) setSub(null);
    else onBack();
  };
  // pri prepnutí obrazovky hore
  useEffect(() => { korenRef.current?.scrollIntoView?.({ block: "start" }); }, [sub]);

  const otvorPolozku = (id: PolozkaSpravy) => otvor(id === "zbierky" ? "g_zbierky" : id);
  // pri zmene typu (DEV) späť na Prehľad, nech nezostane otvorená vypnutá položka
  useEffect(() => { hist.current = []; setSub(null); }, [typ]);
  const prepniPin = (id: PolozkaSpravy) => {
    if (piny.includes(id)) { const n = piny.filter((x) => x !== id); setPiny(n); void ulozPiny(strankaId, n); }
    else if (piny.length < PIN_MAX) { const n = [...piny, id]; setPiny(n); void ulozPiny(strankaId, n); }
    else toast(`Najviac ${PIN_MAX} pripnutých položiek.`);
  };

  const pinyTypu = piny.filter((id) => menu.vse.some((v) => v.id === id));
  // OPRAVY 109: úvod novej charity (kým nemá prvú zbierku); krok 1 = prvé Uložiť profil
  const uvod = nova;
  const krok1 = !!profil;
  const glowUp = uvod && !krok1 && sub !== "profil";
  const glowZb = uvod && krok1 && sub !== "profil" && sub !== "g_zbierky" && sub !== "x:Nová zbierka" && sub !== "x:Správa zbierky";
  const navZobr = menu.nav.map((n) => ({ ...n, n: nova ? undefined : n.n })); // nová charita: Ľudia bez čísla
  const spolocne = { tier, piny: pinyTypu, prepniPin, otvorPolozku, otvor, nova, stit, sada, menu, mobil: !desktop, tablet, zbal, prepniZbal, uvod, krok1, pozvana };
  let obsah: React.ReactNode;
  if (sub === null) obsah = <Prehlad {...spolocne} onZoom={() => setZoom(true)} />;
  else if (sub === "g_zbierky") obsah = <ObrZbierky {...spolocne} />;
  else if (sub === "g_obsah" || sub === "g_ludia" || sub === "g_nastroje" || sub === "g_typ") obsah = <Mriezka karty={menu.skupiny[sub] ?? []} {...spolocne} />;
  else if (sub === "vsetko") obsah = <ObrVsetko typ={typ} tier={tier} otvor={otvor} stlpce={desktop || tablet ? 2 : 1} />;
  else if (sub === "penazenka") obsah = <ObrPenazenka otvor={otvor} mobil={!desktop} />;
  else if (sub === "nast") obsah = <ObrNastavenia tier={tier} otvor={otvor} mobil={!wide} />;
  else if (sub.startsWith("n:")) {
    const m = !wide, id = sub.slice(2), o = otvor as (s: string) => void; // tablet: Nastavenia v 2 stĺpcoch ako PC
    obsah = id === "notif" ? <ObrOznamenia mobil={m} /> : id === "eur" ? <ObrEur mobil={m} /> : id === "krypto" ? <ObrEurc mobil={m} /> : id === "ucty" ? <ObrUcty mobil={m} otvor={o} />
      : id === "spravcovia" ? <ObrSpravcovia mobil={m} /> : id === "udaje" ? <ObrUdaje mobil={m} />
      : id === "program" ? <ObrProgram mobil={m} typ={typ} tier={tier} otvor={o} onTier={setTier} />
      : id === "zariadenia" ? <ObrZariadenia mobil={m} /> : id === "suhlasy" ? <ObrSuhlasy mobil={m} otvor={o} /> : id === "stiahnut" ? <ObrStiahnut mobil={m} />
      : id === "faq" ? <ObrFaq otvor={o} /> : id === "podpora" ? <ObrPodpora mobil={m} otvor={o} /> : id === "zrusit" ? <ObrZrusit mobil={m} otvor={o} tier={tier} nova={nova} /> : <Pripravujeme />;
  }
  else if (sub === "profil") obsah = <UpravitProfilCharity strankaId={strankaId} pozicia={poz} tier={tier} nazov={nazov} inicialy={inicialy} mobil={!desktop} tablet={tablet}
    stit={stit} onUlozene={(pr) => { setProfil(pr); setKoncept(null); }}
    onZmena={setKoncept} onZrusit={() => { hist.current = []; setSub(null); }} onHotovo={() => { hist.current = []; setSub(null); }} />;
  else if (sub.startsWith("x:")) obsah = <Pripravujeme />;
  else obsah = !typPovoli(sub as PolozkaSpravy, typ) ? <Pripravujeme /> : maPovolenie(sub as PolozkaSpravy, tier) ? <Pripravujeme /> : <Zamknute program={odProgramu(sub as PolozkaSpravy)} />;

  const aktivnaSkupina: string | null = sub === null ? null : sub === "nast" || (sub as string).startsWith("n:") ? "nast" : sub === "penazenka" || (sub as string).startsWith("g_") ? sub : (sub as string).startsWith("x:") || sub === "profil" || sub === "vsetko" ? null : SKUPINA_POLOZKY(sub as PolozkaSpravy, typ);

  const dev = TESTOVACIA && FLAGS.dev_tier_switcher && (
    <DevSprava tier={tier} stit={stit} stav={!nova ? "bezna" : pozvana ? "pozv" : "free"} typ={typ} onTyp={setTyp}
      onTier={setTier}
      onStit={(s) => { setStit(s); ulozStitCharity(s); }}
      onStav={(k) => {
        const n = k !== "bezna", pz = k === "pozv";
        setNova(n); ulozCharituNovu(n); setPozvana(pz);
        try { localStorage.setItem("deed.dev.pozvana", pz ? "1" : "0"); } catch { /* LS nedostupné */ }
        setTier(k === "pozv" ? 3 : k === "free" ? 0 : 1);
      }} />
  );
  const zoomEl = <>{zoom && <StitZoom stit={stit} sada={sada} onClose={() => setZoom(false)} />}
    {verejny && <VerejnyProfilOkno pozicia={poz} tier={tier} strankaId={strankaId} stit={stit} mobil={!desktop} onZavri={() => setVerejny(false)}
      lista={<><span style={{ flex: !desktop ? "1 1 100%" : 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>Takto vidí váš profil každý návštevník</span>
        <button type="button" onClick={() => setVerejny(false)} style={{ height: 42, padding: "0 16px", border: "none", borderRadius: 13, background: "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>Zavrieť</button>
        <button type="button" onClick={() => { setVerejny(false); otvor("profil"); }} style={{ height: 42, padding: "0 16px", border: "none", borderRadius: 13, background: "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>Upraviť</button></>} />}</>;

  const hlavicka = <Hlavicka titul={sub === "vsetko" ? <>Všetko, čo <DeedZnacka /> vie</> : titulok(sub, typ)} onSpat={spat} otvor={otvor} mobil={!desktop} glowNova={glowZb} />;

  if (desktop) return (
    <div ref={korenRef} className="sprava-charity" data-stit={stit} style={{ minHeight: "100dvh", boxSizing: "border-box", padding: "20px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>
      <aside style={{ width: 244, flex: "none", display: "flex", flexDirection: "column", gap: 12, paddingRight: 16, borderRight: "2px solid", borderImage: "var(--metal) 1", position: "sticky", top: 20, alignSelf: "flex-start" }}>
        <KartaCharity nazov={nazov} inicialy={inicialy} typ={typ} otvor={otvor} uplnost={uplnost} profil={profil} glow={glowUp} />
        <button onClick={() => otvor("x:Verejný profil")} className="sc-bdh" style={{ flex: "none", height: 56, padding: "0 14px", borderRadius: 18, background: "var(--tBg)", border: "1px solid var(--tBd)", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, textAlign: "left" }}>
          <OkoIk />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 800, color: "var(--tInk)" }}>Verejný profil</span><span style={{ fontSize: 12, color: "var(--tInk2)" }}>ako ho vidia darcovia</span></span>
          <Ik d={IK.sipkaP} s={18} c="var(--tInk)" w={2.4} />
        </button>
        <button onClick={() => { hist.current = [...hist.current, sub]; setSub(null); }} style={{ flex: "none", height: 56, padding: "0 14px", borderRadius: 18, background: sub === null ? "var(--accSoft)" : "var(--card)", border: `1px solid ${sub === null ? "var(--cuBd)" : "var(--cardBd)"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 11, textAlign: "left" }}>
          <Ik d={IK.prehlad} />
          <span style={{ flex: 1, fontSize: 15, fontWeight: sub === null ? 800 : 700, color: sub === null ? "var(--acc)" : "var(--ink)" }}>Prehľad</span>
          <Ik d={IK.sipkaP} s={18} w={2.4} />
        </button>
        <nav aria-label="Správa stránky" style={{ flex: "none", display: "flex", flexDirection: "column", gap: 2, padding: "4px 0" }}>
          {navZobr.map((n) => { const on = aktivnaSkupina === n.k; const sv = glowZb && n.k === "g_zbierky"; return (
            <button key={n.k} onClick={() => otvor(n.k)} aria-current={on ? "page" : undefined} className={on ? undefined : "sc-hov"} style={{ height: 48, padding: "0 14px", border: "none", borderRadius: 14, boxShadow: sv ? "0 0 0 3px var(--green), 0 0 18px rgba(78,125,55,.55)" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: on ? "var(--accSoft)" : "transparent", color: on ? "var(--acc)" : "var(--ink)" }}>
              <Ik d={n.d} /><span style={{ flex: 1, fontSize: 15, fontWeight: on ? 800 : 600, whiteSpace: "nowrap" }}>{n.t}</span>
              {n.n ? <span aria-label={`${n.n} čaká na potvrdenie`} style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: "#4B7A35", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n.n}</span> : null}
            </button>); })}
        </nav>
        {tier < 4 && sub !== "vsetko" && <KartaVsetko onClick={() => otvor("vsetko")} />}
        <div style={{ flex: "none", marginTop: 8 }}>
          <TlacidloNastavenia on={aktivnaSkupina === "nast"} onClick={() => otvor("nast")} />
        </div>
        {dev}
      </aside>
      {/* OPRAVY 93: obsah max 1600 px, na širšom monitore vycentrovaný (panel ostáva vľavo) */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <main style={{ maxWidth: 1600, margin: "0 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {hlavicka}
        <div key={String(sub)} style={{ display: "flex", flexDirection: "column", gap: 14, animation: "spravaFade .2s ease both" }}>{obsah}</div>
      </main>
      </div>
      {zoomEl}
    </div>
  );

  // ---------- MOBIL ----------
  return (
    <div ref={korenRef} className="sprava-charity" data-stit={stit} style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {hlavicka}
      <div key={String(sub)} style={{ padding: "14px 14px 28px", display: "flex", flexDirection: "column", gap: 14, animation: "spravaFade .2s ease both", width: "100%", maxWidth: tablet ? 880 : undefined, margin: tablet ? "0 auto" : undefined, boxSizing: "border-box" }}>
        {/* OPRAVY 115: tablet — karta charity sa natiahne, štít vpravo rovno s Číslami, medzera 16 (mobil 10) */}
        {sub === null && <div style={{ display: "flex", gap: tablet ? 16 : 10, alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0 }}><KartaCharity nazov={nazov} inicialy={inicialy} typ={typ} otvor={otvor} mobil tablet={tablet} uplnost={uplnost} profil={profil} glow={glowUp} /></div>
          <KartaStitu stit={stit} sada={sada} onZoom={() => setZoom(true)} mobil={!tablet} />{/* OPRAVY 102: tablet má štít ako PC (230 px, štít vľavo) */}
        </div>}
        {obsah}
        {sub === null && <MenuDlazdice vsetko={tier < 4} otvor={otvor} nav={navZobr} tablet={tablet} zbal={zbal} prepniZbal={prepniZbal} glowZb={glowZb} />}
        {dev}
      </div>
      {zoomEl}
    </div>
  );
}

// ============================================================
// HLAVIČKA — na každej obrazovke
// ============================================================
function Hlavicka({ titul, onSpat, otvor, mobil, glowNova }: { titul: React.ReactNode; onSpat: () => void; otvor: (s: Sub) => void; mobil: boolean; glowNova?: boolean }) {
  const nzSh = glowNova ? "0 0 0 3px var(--bg), 0 0 0 5px var(--green), 0 0 20px rgba(78,125,55,.6)" : "none"; // OPRAVY 109
  const spatEl = (
    <button onClick={onSpat} aria-label="Späť" className="sc-bdh" style={{ flex: "none", height: 44, padding: "0 14px 0 8px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>
      <Ik d={IK.sipkaL} w={2.4} />Späť
    </button>);
  const kalEl = (
    <button onClick={() => otvor("x:Kalendár")} aria-label="Kalendár" title="Kalendár" className="sc-bdh" style={{ flex: "none", width: 44, height: 44, borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><KalIk /></button>);
  const datum = <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: mobil ? 12 : 13, color: "var(--ink3)", justifyContent: mobil ? "center" : undefined }}>{!mobil && <KalIk s={15} w={2} />}{dnes()}</span>;
  if (mobil) return (
    <header style={{ position: "sticky", top: 0, zIndex: 5, flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 12px", background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat, var(--bg)" }}>
      {spatEl}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, textAlign: "center" }}>
        <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{titul}</span>{datum}
      </span>
      {kalEl}
      <button onClick={() => otvor("x:Nová zbierka")} aria-label="Nová zbierka" style={{ flex: "none", width: 44, height: 44, border: "none", borderRadius: 13, boxShadow: nzSh, background: "#4B7A35", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d="M12 5v14M5 12h14" s={20} c="#fff" w={2.6} /></button>
    </header>);
  return (
    <header style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat" }}>
      {spatEl}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titul}</h1>{datum}
      </span>
      {kalEl}
      <button onClick={() => otvor("x:Nová zbierka")} style={{ ...zeleneTl, boxShadow: nzSh, background: "#4B7A35", display: "flex", alignItems: "center", gap: 8 }}><Ik d="M12 5v14M5 12h14" s={17} c="currentColor" w={2.6} />Nová zbierka</button>
    </header>);
}

// ============================================================
// PANEL — karta charity, Nastavenia
// ============================================================
/** OPRAVY 113: logo v karte charity z uloženého profilu (tvar + pozadie), inak iniciály */
function LogoKarty({ profil, inicialy, size }: { profil: ProfilStranky | null; inicialy: string; size: number }) {
  const logo = profil?.logo;
  const bg = !logo ? "var(--white)" : profil!.logoPozadie === "tmave" ? "#15171c" : profil!.logoPozadie === "priehladne" ? "transparent" : "#fff";
  return (
    <span style={{ width: size, height: size, borderRadius: profil?.tvar === "kruh" ? "50%" : Math.round(size / 4), overflow: "hidden", background: bg, border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size / 3.1), fontWeight: 800, color: "var(--gInk)", flex: "none" }}>
      {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : inicialy}
    </span>);
}
/** OPRAVY 109/113: Upraviť svieti len pred krokom 1 úvodu, inak sivé */
const upravitTl = (glow: boolean): React.CSSProperties => glow
  ? { background: "var(--green)", color: "#fff", boxShadow: "0 0 0 3px var(--green), 0 0 18px rgba(78,125,55,.55)" }
  : { background: "var(--btn)", color: "var(--ink)", boxShadow: "none" };

function KartaCharity({ nazov, inicialy, typ, otvor, mobil, tablet, uplnost, profil, glow }: { nazov: string; inicialy: string; typ: TypStranky; otvor: (s: Sub) => void; mobil?: boolean; tablet?: boolean; uplnost: { pct: number; chyba: string }; profil: ProfilStranky | null; glow: boolean }) {
  const [otv, setOtv] = useState(true);
  const pct = uplnost.pct; // OPRAVY 112: počas úpravy z konceptu, inak z konceptu alebo uloženého profilu
  // OPRAVY 111: „Charita / OZ · 50 %" — jeden riadok, nikdy sa nezalamuje (PC aj tablet)
  const riadok = <span style={{ display: "block", fontSize: 12.5, color: "var(--cuInk2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TYP_NAZOV[typ]} · {pct} %</span>;
  // OPRAVY 100: tablet — 1 riadok (logo 44 · názov + percento + pruh pod textom · Upraviť vpravo), výšku určuje karta štítu
  if (tablet) return (
    <div style={{ height: "100%", boxSizing: "border-box", borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <LogoKarty profil={profil} inicialy={inicialy} size={44} />
      <span style={{ flex: "0 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <span><b style={{ display: "block", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nazov}</b>{riadok}</span>
        <Pruh sc={pct / 100} h={6} bg="rgba(168,116,80,.25)" />
      </span>
      <span style={{ flex: 1 }} />
      <button onClick={() => otvor("profil")} style={{ ...zeleneTl, ...upravitTl(glow) }}>Upraviť</button>
    </div>);
  if (mobil) return (
    <div style={{ height: "100%", boxSizing: "border-box", borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <LogoKarty profil={profil} inicialy={inicialy} size={40} />
        <span style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nazov}</b><span style={{ display: "block", fontSize: 12, color: "var(--cuInk2)" }}>{TYP_NAZOV[typ]} · profil hotový na {pct} %</span></span>
      </span>
      <Pruh sc={pct / 100} h={6} bg="rgba(168,116,80,.25)" />
      <span style={{ flex: 1 }} />
      <button onClick={() => otvor("profil")} style={{ ...zeleneTl, width: "100%", padding: 0, ...upravitTl(glow) }}>Upraviť profil</button>
    </div>);
  return (
    <div style={{ flex: "none", borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)" }}>
      <button onClick={() => setOtv((o) => !o)} aria-expanded={otv} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 12, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
        <LogoKarty profil={profil} inicialy={inicialy} size={40} />
        {/* OPRAVY 111: názov najviac 2 riadky, pod ním 1 riadok „Charita / OZ · 50 %" */}
        <span style={{ flex: 1, minWidth: 0 }}><span title={nazov} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 14.5, fontWeight: 800, lineHeight: 1.25 }}>{nazov}</span>{riadok}</span>
        <Ik d={IK.dole} s={18} w={2.4} style={{ flex: "none", transform: `rotate(${otv ? 180 : 0}deg)`, transition: "transform .2s ease" }} />
      </button>
      {otv && <div style={{ padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--accLine)" }}>
        <span style={{ marginTop: 8 }}><Pruh sc={pct / 100} h={6} bg="rgba(168,116,80,.25)" /></span>
        <span style={{ fontSize: 13, color: "var(--cuInk)" }}>{uplnost.chyba}</span>
        <button onClick={() => otvor("profil")} style={{ height: 44, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, ...upravitTl(glow) }}>Upraviť</button>
      </div>}
    </div>);
}

// ============================================================
// OPRAVY 119 · Všetko, čo DEED+ vie — karta v menu a obrazovka na pozretie (aj P3 a P4, nič sa nezapína)
// ============================================================
function KartaVsetko({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="sc-vsetko" style={{ flex: 1, width: "100%", padding: "14px 16px", borderRadius: 16, border: "1.5px solid var(--gBd)", background: "var(--gSoft)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>Všetko, čo <DeedZnacka /> vie</span>
      <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>Pozrite si všetky nástroje až po P4 a čo by vám pomohlo.</span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>Pozrieť ›</span>
    </button>);
}
const MOJE_ZBIERKY: Karta = P(IK.zbierky, "Moje zbierky", "Zbierka pre konkrétneho človeka alebo rodinu", "zbierky");
function ObrVsetko({ typ, tier, otvor, stlpce }: { typ: TypStranky; tier: Tier; otvor: (s: Sub) => void; stlpce: 1 | 2 }) {
  const skupiny: [string, Karta[]][] = ([["Zbierky", [MOJE_ZBIERKY, ...DRUHY]], ["Obsah", G.g_obsah], ["Ľudia", G.g_ludia], ["Nástroje a výkazy", G.g_nastroje]] as [string, Karta[]][])
    .map(([t, k]): [string, Karta[]] => [t, k.filter((x) => typPovoli(x.id, typ))]).filter(([, k]) => k.length > 0);
  return (<>
    <span style={{ flex: "none", fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", maxWidth: 760 }}>Všetky nástroje DEED+ pre charity, od programu Zadarmo po P4. Je to len na pozretie, nič sa tu nezapína. Program zmeníte v Program a platba.</span>
    {skupiny.map(([t, k]) => (
      <div key={t} style={{ flex: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)", padding: "6px 4px 0", textTransform: "uppercase" }}>{t}</span>
        <div style={{ display: "grid", gridTemplateColumns: stlpce === 2 ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)", gap: stlpce === 2 ? 12 : 10 }}>
          {k.map((p) => { const ma = maPovolenie(p.id, tier); return (
            <div key={p.id} style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={p.d} /></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 15, color: "var(--ink)" }}>{p.t}</b>{p.s && <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{p.s}</span>}</span>
              <span style={{ flex: "none", whiteSpace: "nowrap", height: 24, padding: "0 10px", borderRadius: 12, border: `1px solid ${ma ? "var(--gBd)" : "var(--cardBd)"}`, background: ma ? "var(--gSoft)" : "transparent", fontSize: 12, fontWeight: 800, color: ma ? "var(--gInk)" : "var(--ink3)", display: "flex", alignItems: "center" }}>{ma ? "Máte" : `od ${odProgramu(p.id)}`}</span>
            </div>); })}
        </div>
      </div>))}
    <div style={{ flex: "none", display: "flex", gap: 10 }}>
      <button onClick={() => otvor("n:program")} style={{ height: 48, padding: "0 22px", border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff" }}>Program a platba</button>
    </div>
  </>);
}

function TlacidloNastavenia({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={on ? undefined : "sc-hov"} style={{ width: "100%", minHeight: 56, padding: "6px 14px", border: `1px solid ${on ? "var(--cuBd)" : "var(--cardBd)"}`, borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: on ? "var(--accSoft)" : "var(--card)", color: on ? "var(--acc)" : "var(--ink)" }}>
      <Ik d={IK.nast} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: on ? 800 : 600 }}>Nastavenia</span><span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink3)" }}>aplikácie a účtu</span></span>
    </button>);
}

/** mobil: menu ako 6 dlaždíc + Nastavenia */
function MenuDlazdice({ vsetko, otvor, nav, tablet, zbal, prepniZbal, glowZb }: { vsetko: boolean; otvor: (s: Sub) => void; nav: Menu["nav"]; tablet: boolean; zbal: Zbalenie; prepniZbal: (id: string) => void; glowZb?: boolean }) {
  const dl: { k: Sub; t: string; d?: string; n?: number; teal?: boolean }[] = [
    { k: "x:Verejný profil", t: "Verejný profil", teal: true },
    ...nav.map((n) => ({ k: n.k as Sub, t: n.t, d: n.d, n: n.n })),
  ];
  return (<Sekcia id="menu" nazov="Správa stránky" suhrn={pocet(dl.length, ["položka", "položky", "položiek"])} zbal={zbal} prepni={prepniZbal}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {dl.map((x) => (
        <button key={String(x.k)} onClick={() => otvor(x.k)} style={{ position: "relative", boxShadow: glowZb && x.k === "g_zbierky" ? "0 0 0 3px var(--green), 0 0 18px rgba(78,125,55,.55)" : "none", minHeight: tablet ? 72 : 84, padding: "10px 6px", borderRadius: 16, background: x.teal ? "var(--tBg)" : "var(--card)", border: `1px solid ${x.teal ? "var(--tBd)" : "var(--cardBd)"}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13.5, fontWeight: 800, color: x.teal ? "var(--tInk)" : "var(--ink)", lineHeight: 1.25, textAlign: "center" }}>
          {x.teal ? <OkoIk /> : <Ik d={x.d!} />}{x.t}
          {x.n ? <span style={{ position: "absolute", top: 6, right: 6, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 11, background: "#4B7A35", color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{x.n}</span> : null}
        </button>))}
      {vsetko && <div style={{ gridColumn: "1 / -1", display: "flex" }}><KartaVsetko onClick={() => otvor("vsetko")} /></div>}{/* OPRAVY 119: posledná dlaždica, celá šírka */}
    </div>
    <TlacidloNastavenia on={false} onClick={() => otvor("nast")} />
  </Sekcia>);
}

// ============================================================
// OPRAVY 95 · zbaliteľná sekcia (mobil + tablet). Zbalená = 1 riadok min. 52 px: nadpis + súhrn vpravo + šípka.
// ============================================================
const ZBAL_PREDVOLENE: Record<string, boolean> = { cisla: true, zbierky: true }; // ostatné zbalené
const jeOtv = (z: Zbalenie, id: string) => z[id] ?? ZBAL_PREDVOLENE[id] ?? false;
const pocet = (n: number, [a, b, c]: [string, string, string]) => `${n} ${n === 1 ? a : n >= 2 && n <= 4 ? b : c}`;
function Sekcia({ id, nazov, suhrn, akcia, zbal, prepni, children }: { id: string; nazov: string; suhrn?: React.ReactNode; /** OPRAVY 100: ovládanie v riadku nadpisu (rozbalená sekcia) */ akcia?: React.ReactNode; zbal: Zbalenie; prepni: (id: string) => void; children: React.ReactNode }) {
  const otv = jeOtv(zbal, id);
  const sipka = <Ik d={IK.dole} s={18} w={2.4} style={{ transform: `rotate(${otv ? 180 : 0}deg)`, transition: "transform .2s ease" }} />;
  if (!otv) return (
    <button onClick={() => prepni(id)} aria-expanded={false} style={{ ...karta, borderRadius: 18, minHeight: 52, padding: "0 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", width: "100%" }}>
      <b style={{ flex: 1, minWidth: 0, fontSize: 15, color: "var(--ink)" }}>{nazov}</b>
      {suhrn && <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{suhrn}</span>}
      {sipka}
    </button>);
  if (akcia) return (<>
    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", marginBottom: -6 }}>
      <button onClick={() => prepni(id)} aria-expanded style={{ flex: 1, minWidth: "fit-content", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", display: "flex", alignItems: "center", cursor: "pointer", textAlign: "left" }}>
        <span style={{ ...nadpisSekcie, padding: 0 }}>{nazov.toUpperCase()}</span>
      </button>
      {akcia}
      <button onClick={() => prepni(id)} tabIndex={-1} aria-hidden="true" style={{ flex: "none", width: 26, minHeight: 44, padding: 0, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{sipka}</button>
    </div>
    {children}
  </>);
  return (<>
    <button onClick={() => prepni(id)} aria-expanded style={{ minHeight: 44, padding: "0 4px", border: "none", background: "transparent", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left", width: "100%", marginBottom: -6 }}>
      <span style={{ ...nadpisSekcie, padding: 0, flex: 1 }}>{nazov.toUpperCase()}</span>{sipka}
    </button>
    {children}
  </>);
}

// ============================================================
// PREHĽAD
// ============================================================
type Spolocne = { uvod: boolean; krok1: boolean; pozvana: boolean; tier: Tier; piny: PolozkaSpravy[]; prepniPin: (id: PolozkaSpravy) => void; otvorPolozku: (id: PolozkaSpravy) => void; otvor: (s: Sub) => void; nova: boolean; stit: StitCharity; sada: StitSada; menu: Menu; mobil: boolean; tablet: boolean; zbal: Zbalenie; prepniZbal: (id: string, otv?: boolean) => void };

function KartaStitu({ stit, sada = "care", onZoom, mobil, vyska }: { stit: StitCharity; sada?: StitSada; onZoom: () => void; mobil?: boolean; vyska?: number }) {
  const [n, alt, en] = STITY[stit];
  // odlesk: raz pri príchode, potom raz za 30 min (Obmedziť animácie → .sc-lesk skryté v CSS)
  const [lesk, setLesk] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setLesk((x) => x + 1), 30 * 60 * 1000); return () => window.clearInterval(id); }, []);
  return (
    <div style={{ order: 2, flex: "none", width: mobil ? 112 : 230, height: vyska, minHeight: mobil ? undefined : 180, boxSizing: "border-box", position: "relative", overflow: "hidden", borderRadius: 18, background: "var(--stBg)", border: "1.5px solid var(--cuBd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5),0 6px 18px rgba(30,28,20,.12)", padding: mobil ? "10px 8px" : "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <span key={`${stit}-${lesk}`} className="sc-lesk" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit", background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,.6) 50%,transparent 65%)", transform: "translateX(-130%)", animation: "leskStit 1.6s ease-in-out 1.2s 1 both" }} />
      <button onClick={onZoom} aria-label="Zväčšiť štít" style={{ display: "flex", flexDirection: mobil ? "column" : "row", alignItems: "center", gap: mobil ? 4 : 10, padding: 0, border: "none", background: "transparent", cursor: "zoom-in", textAlign: mobil ? "center" : "left", minHeight: 44 }}>
        <img src={stitImg(stit, true, sada)} alt={`Štít DEED+ ${SADA_NAZOV[sada]} ${en}`} width={mobil ? 62 : 78} height={mobil ? 76 : 96} style={{ display: "block", flex: "none", objectFit: "contain", filter: "drop-shadow(0 5px 10px rgba(90,50,20,.3))" }} />
        <span style={{ display: "flex", flexDirection: "column", gap: mobil ? 2 : 4 }}>
          {!mobil && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".07em", color: "var(--stInk2)" }}>ŠTÍT</span>}
          <span style={{ fontSize: mobil ? 14.5 : 20, fontWeight: 800, lineHeight: 1.1, color: "var(--stInk)" }}>{n}</span>
          <span style={{ fontSize: mobil ? 11.5 : 12.5, lineHeight: 1.35, color: "var(--stInk2)" }}>{alt}</span>
        </span>
      </button>
    </div>);
}

function StitZoom({ stit, sada, onClose }: { stit: StitCharity; sada: StitSada; onClose: () => void }) {
  const [n, veta, en] = STITY[stit];
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return createPortal(
    <div className="sprava-charity" data-stit={stit} role="dialog" aria-modal="true" aria-label={`${n} štít`} onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(29,33,27,.6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: 16, animation: "spravaFade .2s ease both" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 40px", maxWidth: "100%", borderRadius: 28, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", textAlign: "center", cursor: "default" }}>
        <img src={stitImg(stit, false, sada)} alt={`Štít DEED+ ${SADA_NAZOV[sada]} ${en}`} style={{ display: "block", width: 300, maxWidth: "70vw", height: "auto", maxHeight: "50vh", objectFit: "contain", filter: "drop-shadow(0 12px 22px rgba(90,50,20,.35))" }} />
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--ink)" }}>{n} štít</span>
        <span style={{ fontSize: 16, color: "var(--cuInk)" }}>{veta}</span>
        <button onClick={onClose} style={{ ...zeleneTl, height: 48, padding: "0 26px", fontSize: 15.5, background: "#4B7A35" }}>Zavrieť</button>
      </div>
    </div>, document.body);
}

function Prehlad({ tier: _tier, piny, prepniPin, otvorPolozku, otvor, nova, stit, sada, menu, mobil, tablet, zbal, prepniZbal, onZoom, uvod, krok1, pozvana }: Spolocne & { onZoom: () => void }) {
  const VSE = menu.vse; // KARTA 36: na pripnutie len položky, ktoré typ má
  const ph = mobil && !tablet; // telefón (OPRAVY 96: tablet má časti ako PC)
  const [obd, setObd] = useState(0);
  const [grafPc, setGrafPc] = useState(false); // OPRAVY 92: graf darov pod číslami
  const graf = mobil ? jeOtv(zbal, "graf") : grafPc;
  const setGraf = (f: (g: boolean) => boolean) => (mobil ? prepniZbal("graf", f(graf)) : setGrafPc(f));
  // OPRAVY 93: šírka mriežky zbierok → koľko kariet sa zmestí do riadku
  const zbRef = useRef<HTMLDivElement>(null);
  const [zbSirka, setZbSirka] = useState(800);
  useLayoutEffect(() => {
    const el = zbRef.current; if (!el || mobil) return;
    const ro = new ResizeObserver(() => setZbSirka(el.clientWidth)); ro.observe(el); return () => ro.disconnect();
  }, [mobil, nova]);
  const [pinOtv, setPinOtv] = useState(false);
  const trebaRef = useRef<HTMLSpanElement>(null);
  // karta štítu a Čísla = výška karty charity v paneli, min. 180 px
  const [vyska, setVyska] = useState(180);
  useLayoutEffect(() => {
    if (mobil) return;
    const el = document.querySelector<HTMLElement>(".sprava-charity aside > div:first-child");
    if (!el) return;
    const ro = new ResizeObserver(() => setVyska(Math.max(180, Math.round(el.getBoundingClientRect().height))));
    ro.observe(el); return () => ro.disconnect();
  }, [mobil]);
  const ulohy = nova ? [] : ULOHY;

  // OPRAVY 100: na mobile a tablete je prepínač období + ikona grafu v riadku nadpisu sekcie „ČÍSLA"
  const obdPrepinac = (
    <div role="tablist" aria-label="Obdobie" style={{ flex: "none", display: "flex", gap: 2, padding: 3, borderRadius: 12, background: "var(--btn)" }}>
      {OBD.map((t, i) => { const on = i === obd; return (
        <button key={t} role="tab" aria-selected={on} onClick={() => setObd(i)} style={{ height: mobil ? 44 : 28, minWidth: mobil ? 44 : undefined, padding: ph ? "0 6px" : "0 12px", border: "none", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap", fontSize: ph ? 12.5 : 13, fontWeight: on ? 800 : 700, background: on ? "var(--seg)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", boxShadow: on ? "0 1px 3px rgba(30,28,20,.14)" : "none" }}>{t}</button>); })}
    </div>);
  const grafTl = (
    <button onClick={() => setGraf((g) => !g)} aria-label="Graf darov" aria-expanded={graf} title="Graf darov" style={{ flex: "none", width: mobil ? 44 : 34, height: mobil ? 44 : 34, borderRadius: 10, border: `1.5px solid ${graf ? "var(--cuBd)" : "var(--cardBd)"}`, background: graf ? "var(--accSoft)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Ik d="M4 20V10M10 20V4M16 20v-7M22 20H2" s={18} w={2} />
    </button>);
  const cislaAkcia = <>{obdPrepinac}{grafTl}</>;
  const cisla = (
    <section aria-label="Čísla" style={{ flex: 1, minWidth: 0, height: mobil ? undefined : vyska, boxSizing: "border-box", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? 12 : "10px 16px", display: "flex", flexDirection: "column", gap: mobil ? 10 : 4 }}>
      {!mobil && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ flex: 1, fontSize: 15 }}>Čísla</b>
        {obdPrepinac}{grafTl}
      </div>}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: ph ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gridAutoRows: mobil ? "auto" : "1fr", columnGap: 16 }}>
        {K8.map((k, i) => {
          const [v, d] = nova ? [N8[i], ""] : D8[obd][i];
          const bt = ph ? i > 1 : i > 3;
          return (
            <div key={k} style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: mobil ? "8px 0" : "2px 0", borderTop: bt ? "1px solid var(--cardBd)" : "none" }}>
              <span style={{ fontSize: 11.5, lineHeight: 1.3, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k}</span>
              <b style={{ fontSize: 18, lineHeight: 1.15, color: i === 0 ? "var(--gInk)" : i === 5 ? "var(--gold)" : "var(--ink)", whiteSpace: "nowrap" }}>{v}</b>
              <span style={{ fontSize: 11, lineHeight: 1.3, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minHeight: 14 }}>{d}</span>
            </div>);
        })}
      </div>
    </section>);

  const pinyV = piny.map((id) => VSE.find((x) => x.id === id)).filter((v): v is (typeof VSE)[number] => !!v);
  const pinBar = (
    <section aria-label="Pripnuté" style={{ flex: "none", position: "relative", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: 8 }}>
      <div className="sc-lista" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", overflowX: mobil ? "auto" : undefined }}>
        <span style={{ flex: "none", padding: "0 8px 0 6px", fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)" }}>PRIPNUTÉ</span>
        <button onClick={() => trebaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 12px 0 14px", borderRadius: 13, border: `1.5px solid ${ulohy.length ? "#C9A24A" : "var(--cardBd)"}`, background: ulohy.length ? "var(--warnBg)" : "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>
          Treba vybaviť<span style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: ulohy.length ? "#A34A2A" : "#85867B", color: "#fff", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{ulohy.length}</span>
        </button>
        {mobil
          ? pinyV.map((v) => <PinTlacidlo key={v.id} v={v} onClick={() => otvorPolozku(v.id)} />)
          : <PinyRiadok polozky={pinyV} otvor={otvorPolozku} />}
        {mobil && <span style={{ flex: 1 }} />}
        <button onClick={() => setPinOtv((o) => !o)} aria-expanded={pinOtv} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 14px", border: "none", borderRadius: 13, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "var(--green)" }}>
          <Ik d={IK.pin} s={17} c="currentColor" w={2.2} />Upraviť pripnuté
        </button>
      </div>
      {pinOtv && <div style={{ position: "absolute", right: 8, left: mobil ? 8 : undefined, top: 58, zIndex: 20, width: mobil ? undefined : 340, maxHeight: 420, overflowY: "auto", overscrollBehavior: "contain", padding: 8, borderRadius: 18, background: "var(--bg)", border: "1px solid var(--cardBd)", boxShadow: "0 16px 40px rgba(30,28,20,.2)", display: "flex", flexDirection: "column", gap: 2, animation: "spravaFade .15s ease both" }}>
        <span style={{ padding: "8px 10px 6px", fontSize: 13, color: "var(--ink3)" }}>Pripnite si, čo používate najčastejšie. Najviac {PIN_MAX}.</span>
        {VSE.map((v) => { const on = piny.includes(v.id); return (
          <button key={v.id} role="checkbox" aria-checked={on} onClick={() => prepniPin(v.id)} style={{ minHeight: 46, padding: "0 10px", border: "none", borderRadius: 12, background: on ? "var(--gSoft)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{v.t}</span><span style={{ fontSize: 12, color: "var(--ink3)" }}>{v.g}</span></span>
            <span style={{ width: 24, height: 24, flex: "none", borderRadius: 7, border: `1.5px solid ${on ? "var(--green)" : "#A8A396"}`, background: on ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.fajka} s={14} c="#fff" w={3} style={{ opacity: on ? 1 : 0 }} /></span>
          </button>); })}
        <button onClick={() => setPinOtv(false)} style={{ height: 46, marginTop: 6, border: "none", borderRadius: 13, background: "var(--green)", cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "#fff", flex: "none" }}>Hotovo</button>
      </div>}
    </section>);

  // ============ OPRAVY 109 · úvod novej charity (kým nemá prvú zbierku) ============
  const [uP, setUP] = useState(false), [uR, setUR] = useState(false), [uD, setUD] = useState(false);
  const uvodPanel = (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15, textWrap: "balance" } as React.CSSProperties}>{krok1 ? "Profil je pripravený" : "Vitajte v DEEDGOOD"}</span>
        <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink2)" }}>{krok1 ? "Zostáva posledný krok — prvá zbierka." : "Dva kroky a váš profil je pripravený pre darcov."}</span>
      </div>
      <section style={{ flex: "none", borderRadius: 20, background: pozvana ? "var(--gSoft)" : "var(--card)", border: pozvana ? "1.5px solid var(--gBd)" : "1px solid var(--cardBd)", padding: "16px 20px", display: "flex", flexDirection: ph ? "column" : "row", alignItems: ph ? "flex-start" : "center", gap: ph ? 8 : 16 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block", fontSize: 16, color: pozvana ? "var(--gInk)" : "var(--ink)" }}>{pozvana ? "Ste medzi prvými 50. Program P3 máte zadarmo do 31. 10. 2026." : "Máte program Zadarmo."}</b>
          <span style={{ display: "block", marginTop: 4, fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{pozvana ? "Potom si vyberiete program. Ak žiadny nevyberiete, zbierky pre ľudí dobehnú do konca. Centrálna a sektorové zbierky sa z profilu stiahnu." : "Jedna zbierka naraz, QR a prehľad darcov. Čo pridajú vyššie programy, vidíte v menu so štítkom."}</span>
        </span>
        <button onClick={() => otvor("n:program")} style={{ flex: "none", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: pozvana ? "var(--gInk)" : "var(--green)", whiteSpace: "nowrap" }}>{pozvana ? "Čo je v P3 ›" : "Porovnať programy ›"}</button>
      </section>
    </div>);
  const kroky: [string, string, string][] = krok1
    ? [["2", "Vytvorte prvú zbierku", "Pre koho zbierate, koľko a na čo."]]
    : [["1", "Doplňte profil", "Logo, titulná fotka, pár viet o vás a kontakt. Podľa toho vás darcovia spoznajú."], ["2", "Vytvorte prvú zbierku", "Pre koho zbierate, koľko a na čo."]];
  const krokyEl = (<>
    <section aria-label="Kroky" style={{ flex: "none", ...karta, padding: ph ? "4px 16px" : "6px 22px" }}>
      {kroky.map(([n, t, d], i) => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: ph ? 14 : 18, minHeight: ph ? 80 : 96, padding: "14px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ width: 44, height: 44, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, background: "var(--field)", color: "var(--ink)" }}>{n}</span>
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 17 }}>{t}</b><span style={{ display: "block", marginTop: 3, fontSize: 13.5, lineHeight: 1.45, color: "var(--ink3)" }}>{d}</span></span>
        </div>))}
    </section>
    <span style={{ flex: "none", fontSize: 12.5, fontWeight: 700, color: "var(--ink2)", padding: "0 4px", marginTop: -4 }}>{mobil ? "Všetko ostatné nájdete nižšie v Správe stránky." : "Všetko ostatné nájdete v menu vľavo."} Táto obrazovka zmizne po prvej zbierke.</span>
  </>);
  const sipka = (otv: boolean, c = "var(--acc)") => <Ik d={IK.dole} s={18} c={c} w={2.4} style={{ flex: "none", transform: `rotate(${otv ? 180 : 0}deg)`, transition: "transform .2s ease" }} />;
  const pinUvod = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => setUP((o) => !o)} aria-expanded={uP} style={{ ...karta, borderRadius: 18, minHeight: 52, padding: "0 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", width: "100%" }}>
        <span style={{ flex: "none", fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)" }}>PRIPNUTÉ</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>skratky na to, čo používate najčastejšie</span>
        {sipka(uP)}
      </button>
      {uP && pinBar}
    </div>);
  const uvodPc = uvod && !mobil; // na mobile/tablete sú Reťaz a Dorovnávané zbaliteľné sekcie (bod 95)
  const rOtv = !uvodPc || uR, dOtv = !uvodPc || uD;

  const treba = (<>
    <span ref={trebaRef} style={{ ...nadpisSekcie, scrollMarginTop: 80 }}>TREBA VYBAVIŤ</span>
    {ulohy.length === 0
      ? <section style={{ ...karta, padding: "18px 20px", fontSize: 14.5, color: "var(--ink2)" }}>Všetko je vybavené.</section>
      : <section style={{ ...karta, padding: ph ? "0 14px" : "0 20px" }}>
        {ulohy.map(([dot, t, s, b], i) => (
          ph
            ? <div key={t} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <span style={{ display: "flex", alignItems: "flex-start", gap: 10 }}><span style={{ width: 10, height: 10, flex: "none", borderRadius: "50%", background: dot, marginTop: 6 }} /><span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span></span>
              <button onClick={() => otvor(`x:${b}`)} style={{ ...zeleneTl, alignSelf: "flex-end" }}>{b}</button>
            </div>
            : <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 72, padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", maxWidth: 1100 }}>
              <span style={{ width: 10, height: 10, flex: "none", borderRadius: "50%", background: dot }} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
              <button onClick={() => otvor(`x:${b}`)} style={zeleneTl}>{b}</button>
            </div>))}
      </section>}
  </>);

  // OPRAVY 93: karty 300–420 px, toľko, koľko sa zmestí do jedného riadku (max 4), potom „Všetky zbierky ›"
  const naRiadok = ph || tablet ? 2 : Math.max(1, Math.min(4, Math.floor((zbSirka + 14) / (300 + 14))));
  const zbMriezka = (
    <div ref={zbRef} className="sc-lista" style={ph ? { display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", scrollPaddingLeft: 14, margin: "0 -14px", padding: "0 14px" } : tablet ? { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 } : { display: "grid", gridTemplateColumns: `repeat(${naRiadok}, minmax(0, 420px))`, gap: 14 }}>
      {PH_ZBIERKY.map((z) => ( // OPRAVY 103: všetky bežiace zbierky, limit určuje program (stav.ts), nie Prehľad
        <button key={z.t} onClick={() => otvor("g_zbierky")} style={{ flex: "none", width: ph ? 290 : undefined, scrollSnapAlign: "start", ...karta, borderRadius: mobil ? 18 : 22, padding: 0, overflow: "hidden", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column" }}>
          <span style={{ display: "block", width: "100%", aspectRatio: "16/9", background: z.bg }} />
          <span style={{ padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 8, width: "100%", boxSizing: "border-box" }}>
            <b style={{ fontSize: 16, color: "var(--ink)" }}>{z.t}</b>
            <Pruh sc={z.c ? z.v / z.c : 1} />
            <span style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, color: "var(--ink3)" }}><span><b style={{ color: "var(--ink)" }}>{eur(z.v)}</b>{z.c ? ` z ${eur(z.c)}` : ""}</span><span>{z.d}</span></span>
            <span style={{ alignSelf: "flex-start", height: 26, padding: "0 10px", borderRadius: 13, background: z.dn ? "var(--gSoft)" : "var(--btn)", color: z.dn ? "var(--gInk)" : "var(--ink3)", display: "flex", alignItems: "center", fontSize: 12.5, fontWeight: 800 }}>{z.dn ? `dnes +${z.dn} €` : "dnes zatiaľ nič"}</span>
          </span>
        </button>))}
    </div>);
  const zbierky = !nova && (mobil
    ? <Sekcia id="zbierky" nazov="Bežiace zbierky" suhrn={pocet(PH_ZBIERKY.length, ["zbierka", "zbierky", "zbierok"])} zbal={zbal} prepni={prepniZbal}>{zbMriezka}</Sekcia>
    : <>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...nadpisSekcie, flex: 1 }}>BEŽIACE ZBIERKY</span>
        <button onClick={() => otvor("g_zbierky")} style={{ flex: "none", minHeight: 44, padding: "0 6px", border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "var(--green)" }}>Všetky zbierky ›</button>
      </div>
      {zbMriezka}
    </>);

  const retazEl = (
      <section style={{ ...karta, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div onClick={uvodPc ? () => setUR((o) => !o) : undefined} role={uvodPc ? "button" : undefined} aria-expanded={uvodPc ? rOtv : undefined} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: uvodPc ? 24 : undefined, cursor: uvodPc ? "pointer" : "default" }}><Ik d={IK.retaz} c="#4E7D37" w={2} /><b style={{ flex: 1, fontSize: 16 }}>Reťaz dobra</b><span style={{ fontSize: 13, fontWeight: 800, color: "var(--gInk)" }}>{nova ? "0 €" : "640 €"}</span>{uvodPc && sipka(rOtv)}</div>
        {rOtv && <span style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: -4 }}>ľudia, ktorí sa pripojili k vašim zbierkam</span>}
        {!rOtv ? null : nova
          ? <span style={{ paddingTop: 10, borderTop: "1px solid var(--cardBd)", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>Zatiaľ sa nikto nepripojil. Keď niekto spustí zbierku pre vás, uvidíte ho tu.</span>
          : RETAZ.map(([i, n, z, v]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: "1px solid var(--cardBd)" }}>
              <span style={{ width: 32, height: 32, flex: "none", borderRadius: "50%", background: "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "var(--gInk)" }}>{i}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14 }}>{n}</b><span style={{ fontSize: 12, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z}</span></span>
              <b style={{ flex: "none", fontSize: 14 }}>{v}</b>
            </div>))}
      </section>);
  const dorEl = (
      <section style={{ borderRadius: 22, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div onClick={uvodPc ? () => setUD((o) => !o) : undefined} role={uvodPc ? "button" : undefined} aria-expanded={uvodPc ? dOtv : undefined} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: uvodPc ? 24 : undefined, cursor: uvodPc ? "pointer" : "default" }}><Ik d={IK.budova} c="var(--gold)" w={2} /><b style={{ flex: 1, fontSize: 16 }}>Dorovnávané zbierky</b><span style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)" }}>{nova ? "" : "1 beží"}</span>{uvodPc && sipka(dOtv, "var(--gold)")}</div>
        {dOtv && <span style={{ fontSize: 12.5, color: "var(--cuInk2)", marginTop: -4 }}>partneri, ktorí pridávajú k darom ľudí</span>}
        {!dOtv ? null : nova
          ? <span style={{ paddingTop: 10, borderTop: "1px solid rgba(135,103,18,.25)", fontSize: 13.5, lineHeight: 1.45, color: "var(--cuInk2)" }}>Zatiaľ žiadna firma nedorovnáva. Keď sa partner zapojí, uvidíte tu jeho rozpočet.</span>
          : <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "1px solid rgba(135,103,18,.25)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b style={{ flex: 1, fontSize: 14 }}>Pekáreň Dobrota s.r.o.</b><span style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)" }}>1 : 1</span></div>
            <span style={{ fontSize: 12, color: "var(--cuInk2)" }}>Strecha pre rodinu Horváthovú · do 300 € na dar</span>
            <Pruh sc={620 / 1000} h={6} bg="rgba(135,103,18,.2)" c="var(--gold)" />
            <span style={{ fontSize: 12, color: "var(--cuInk2)" }}>dorovnané 620 € z 1 000 €</span>
          </div>}
      </section>);
  const pravy = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: mobil ? 0 : 28 }}>{retazEl}{dorEl}</div>);

  const grafEl = graf && <GrafDarov obd={obd} nova={nova} mobil={ph} onZavri={() => setGraf(() => false)} />;
  if (mobil) {
    // OPRAVY 95: zbaliteľné sekcie; Treba vybaviť vždy rozbalené. OPRAVY 96: tablet — Reťaz a Dorovnávané vedľa seba
    const obdTxt = ["dnes", "za 7 dní", "za 30 dní", "za rok"][obd];
    const vyz = nova ? N8[0] : D8[obd][0][0];
    const retazS = <Sekcia id="retaz" nazov="Reťaz dobra" suhrn={nova ? "0 €" : "640 €"} zbal={zbal} prepni={prepniZbal}>{retazEl}</Sekcia>;
    const dorS = <Sekcia id="dorovnanie" nazov="Dorovnávané zbierky" suhrn={nova ? undefined : "1 beží"} zbal={zbal} prepni={prepniZbal}>{dorEl}</Sekcia>;
    if (uvod) return (<>
      {uvodPanel}{krokyEl}{pinUvod}{treba}
      {tablet ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, alignItems: "start" }}><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{retazS}</div><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{dorS}</div></div> : <>{retazS}{dorS}</>}
    </>);
    return (<>
      <Sekcia id="cisla" nazov="Čísla" suhrn={`Vyzbierané ${vyz} ${obdTxt}`} akcia={cislaAkcia} zbal={zbal} prepni={prepniZbal}>{cisla}</Sekcia>
      <Sekcia id="graf" nazov="Graf darov" suhrn={`${(nova ? 0 : GRAF_CIEL[obd]).toLocaleString("sk-SK")} € ${obdTxt}`} zbal={zbal} prepni={prepniZbal}>{grafEl}</Sekcia>
      <Sekcia id="piny" nazov="Pripnuté" suhrn={pocet(pinyV.length, ["položka", "položky", "položiek"])} zbal={zbal} prepni={prepniZbal}>{pinBar}</Sekcia>
      {treba}{zbierky}
      {tablet ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, alignItems: "start" }}><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{retazS}</div><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{dorS}</div></div> : <>{retazS}{dorS}</>}
    </>);
  }
  return (<>
    <div style={{ flex: "none", display: "flex", alignItems: "flex-start", gap: 14 }}>
      <KartaStitu stit={stit} sada={sada} onZoom={onZoom} vyska={vyska} />
      {uvod ? uvodPanel : cisla}
    </div>
    {uvod && krokyEl}
    {!uvod && grafEl}
    {uvod ? pinUvod : pinBar}
    <div style={{ flex: "none", display: "grid", gridTemplateColumns: "minmax(0,1fr) 264px", gap: 20, alignItems: "start" }}>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{treba}{zbierky}</div>
      {pravy}
    </div>
  </>);
}

// ============================================================
// OPRAVY 94 · Pripnuté — v lište toľko, koľko sa zmestí do riadku, zvyšok pod „+N ďalšie ›"
// ============================================================
type PinV = { id: PolozkaSpravy; t: string; d: string };
function PinTlacidlo({ v, onClick, merat }: { v: PinV; onClick?: () => void; merat?: boolean }) {
  return (
    <button onClick={onClick} tabIndex={merat ? -1 : undefined} aria-hidden={merat || undefined} className="sc-bdh" style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 16px 0 12px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>
      <Ik d={v.d} s={18} />{v.t}
    </button>);
}
function PinyRiadok({ polozky, otvor }: { polozky: PinV[]; otvor: (id: PolozkaSpravy) => void }) {
  const wrap = useRef<HTMLDivElement>(null), meraj = useRef<HTMLDivElement>(null), viacRef = useRef<HTMLButtonElement>(null);
  const [n, setN] = useState(polozky.length);
  const [otv, setOtv] = useState(false);
  const kluc = polozky.map((p) => p.id).join(",");
  useLayoutEffect(() => {
    const w = wrap.current, m = meraj.current; if (!w || !m) return;
    const spocitaj = () => {
      const sirky = Array.from(m.children).map((c) => (c as HTMLElement).offsetWidth);
      const k = 6, dost = w.clientWidth, viac = 130; // šírka „+N ďalšie ›"
      const vsetky = sirky.reduce((s, x) => s + x + k, 0);
      if (vsetky <= dost) { setN(sirky.length); return; }
      let sum = 0, c = 0; for (const x of sirky) { if (sum + x + k + viac > dost) break; sum += x + k; c++; }
      setN(c);
    };
    spocitaj(); const ro = new ResizeObserver(spocitaj); ro.observe(w); return () => ro.disconnect();
  }, [kluc]);
  const skryte = polozky.slice(n);
  return (
    <div ref={wrap} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
      <div ref={meraj} aria-hidden="true" style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", display: "flex", gap: 6, left: 0, top: 0 }}>
        {polozky.map((v) => <PinTlacidlo key={v.id} v={v} merat />)}
      </div>
      {polozky.slice(0, n).map((v) => <PinTlacidlo key={v.id} v={v} onClick={() => otvor(v.id)} />)}
      {skryte.length > 0 && <button ref={viacRef} onClick={() => setOtv((o) => !o)} aria-expanded={otv} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 14px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "var(--ink2)" }}>+{skryte.length} ďalšie ›</button>}
      {otv && skryte.length > 0 && <div style={{ position: "absolute", top: 52, left: Math.max(0, (viacRef.current?.offsetLeft ?? 0) - 120), zIndex: 21, width: 280, padding: 8, borderRadius: 18, background: "var(--bg)", border: "1px solid var(--cardBd)", boxShadow: "0 16px 40px rgba(30,28,20,.2)", display: "flex", flexDirection: "column", gap: 2, animation: "spravaFade .15s ease both" }}>
        {skryte.map((v) => (
          <button key={v.id} onClick={() => { setOtv(false); otvor(v.id); }} style={{ minHeight: 46, padding: "0 10px", border: "none", borderRadius: 12, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }} className="sc-hov">
            <Ik d={v.d} s={18} />{v.t}
          </button>))}
      </div>}
    </div>);
}

// ============================================================
// OPRAVY 92 · Graf darov (jednorazové + pravidelná podpora), súčet = Vyzbierané za obdobie
// ============================================================
const GRAF_NAD = ["Dary dnes po hodinách", "Dary za 7 dní", "Dary za 30 dní", "Dary za rok po mesiacoch"];
const GRAF_X: string[][] = [["8", "10", "12", "14", "16", "18", "20", "22"], ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"], Array.from({ length: 30 }, (_, i) => (i % 5 === 0 ? `${i + 1}.` : "")), ["jan", "feb", "mar", "apr", "máj", "jún", "júl", "aug", "sep", "okt", "nov", "dec"]];
const GRAF_A0 = [[0, 12, 0, 30, 20, 46, 38, 0], [38, 52, 44, 70, 61, 88, 107], [40, 55, 48, 62, 58, 71, 66, 80, 74, 69, 85, 78, 92, 88, 70, 95, 84, 99, 90, 104, 97, 110, 101, 96, 115, 108, 120, 112, 118, 126], [820, 1040, 1210, 1380, 1290, 1560, 1440, 1720, 1940, 2210, 0, 0]];
const GRAF_B0 = [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 19, 0, 0, 0, 0], Array.from({ length: 30 }, (_, i) => (i === 0 || i === 14 ? 240 : 0)), [380, 380, 395, 410, 410, 430, 445, 460, 470, 480, 0, 0]];
const GRAF_CIEL = [146, 460, 1940, 18420]; // = Vyzbierané v paneli Čísla
function grafData(ob: number, nova: boolean) {
  const A0 = GRAF_A0[ob], B0 = GRAF_B0[ob];
  const sum0 = A0.reduce((s, v) => s + v, 0) + B0.reduce((s, v) => s + v, 0), kf = GRAF_CIEL[ob] / sum0;
  const A = A0.map((v) => (nova ? 0 : Math.round(v * kf))), B = B0.map((v) => (nova ? 0 : Math.round(v * kf)));
  if (!nova) { const d = GRAF_CIEL[ob] - A.reduce((s, v) => s + v, 0) - B.reduce((s, v) => s + v, 0); A[A.indexOf(Math.max(...A))] += d; }
  const mx = Math.max(4, ...A.map((v, i) => v + B[i])); // bez darov os 0 – 4 €
  const r = mx / 4, p = Math.pow(10, Math.floor(Math.log10(r))), n = r / p;
  const krok = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  return { A, B, krok, top: krok * 4, spolu: A.reduce((s, v) => s + v, 0) + B.reduce((s, v) => s + v, 0) };
}
function GrafDarov({ obd, nova, mobil, onZavri }: { obd: number; nova: boolean; mobil: boolean; onZavri: () => void }) {
  const { A, B, krok, top, spolu } = grafData(obd, nova);
  const X = GRAF_X[obd], gap = obd === 2 ? 3 : mobil ? 6 : 10;
  const fmt = (v: number) => `${Math.round(v).toLocaleString("sk-SK")} €`;
  const tip = (i: number) => `${X[i] || `${i + 1}.`} · ${fmt(A[i] + B[i])}${B[i] ? ` (z toho pravidelná ${fmt(B[i])})` : ""}`;
  const [aktiv, setAktiv] = useState<number | null>(null);
  return (
    <section aria-label="Graf darov" style={{ flex: "none", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "16px 18px 12px", display: "flex", flexDirection: "column", gap: 12, animation: "spravaFade .2s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <b style={{ fontSize: 15 }}>{GRAF_NAD[obd]}</b>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink3)" }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--chA)" }} />jednorazové</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink3)" }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--chB)" }} />pravidelná podpora</span>
        <span style={{ flex: 1 }} />
        <b style={{ fontSize: 15, color: "var(--gInk)" }}>{fmt(spolu)}</b>
        <button onClick={onZavri} aria-label="Zavrieť graf" style={{ flex: "none", width: 44, height: 44, margin: -5, border: "none", borderRadius: 10, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ik d="M6 6l12 12M18 6L6 18" s={16} c="var(--ink3)" w={2.4} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", columnGap: 10 }}>
        <div aria-hidden="true" style={{ height: 180, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", fontSize: 11.5, fontWeight: 700, color: "var(--ink3)" }}>
          {[4, 3, 2, 1, 0].map((k) => <span key={k} style={{ lineHeight: 0 }}>{fmt(krok * k)}</span>)}
        </div>
        <div style={{ position: "relative", height: 180, borderLeft: "1px solid var(--cardBd)", borderBottom: "1px solid var(--cardBd)" }}>
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
            {[0, 1, 2, 3, 4].map((k) => <span key={k} style={{ display: "block", borderTop: `1px dashed ${k === 4 ? "transparent" : "var(--cardBd)"}` }} />)}
          </div>
          <div role="list" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap, padding: "0 4px" }} onPointerLeave={() => setAktiv(null)}>
            {A.map((a, i) => { const b = B[i] || 0, s2 = a + b; return (
              <div key={i} role="listitem" aria-label={tip(i)} title={tip(i)} onPointerEnter={() => setAktiv(i)} onPointerDown={() => setAktiv(i)}
                style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: "default", opacity: aktiv == null || aktiv === i ? 1 : 0.55 }}>
                <span style={{ display: "flex", flexDirection: "column", height: "100%", borderRadius: "4px 4px 0 0", overflow: "hidden", transformOrigin: "50% 100%", transform: `scaleY(${(s2 / top).toFixed(3)})`, transition: "transform .35s ease" }}>
                  <span style={{ display: "block", flexGrow: a || (s2 ? 0 : 1), flexBasis: 0, background: "var(--chA)" }} />
                  <span style={{ display: "block", flexGrow: b, flexBasis: 0, background: "var(--chB)" }} />
                </span>
              </div>); })}
          </div>
        </div>
        <span />
        <div aria-hidden="true" style={{ display: "flex", gap, padding: "6px 4px 0", fontSize: 11.5, fontWeight: 700, color: "var(--ink3)" }}>
          {X.map((x, i) => <span key={i} style={{ flex: 1, minWidth: 0, textAlign: "center", whiteSpace: "nowrap", overflow: "visible" }}>{x}</span>)}
        </div>
      </div>
      <span aria-live="polite" style={{ fontSize: 12, color: aktiv != null ? "var(--ink)" : "var(--ink3)", fontWeight: aktiv != null ? 700 : 400, minHeight: 16 }}>{aktiv != null ? tip(aktiv) : "Podržte myš na stĺpci a uvidíte sumu. Os sa prispôsobí najvyššej hodnote."}</span>
    </section>);
}

// ============================================================
// MENU OBRAZOVKY
// ============================================================
function KartaPolozky({ k, tier, piny, prepniPin, otvorPolozku }: { k: Karta } & Pick<Spolocne, "tier" | "piny" | "prepniPin" | "otvorPolozku">) {
  const zamok = !maPovolenie(k.id, tier);
  const pn = piny.includes(k.id);
  return (
    <div role="button" tabIndex={0} onClick={() => otvorPolozku(k.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); otvorPolozku(k.id); } }} className="sc-bdh"
      style={{ borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", minWidth: 0 }}>
      <span style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={k.d} /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 15.5, color: "var(--ink)" }}>{k.t}</b>
          {zamok && <span style={{ flex: "none", whiteSpace: "nowrap", height: 22, padding: "0 8px", borderRadius: 11, border: "1px solid var(--cardBd)", fontSize: 11.5, fontWeight: 800, color: "var(--ink3)", display: "flex", alignItems: "center" }}>od {odProgramu(k.id)}</span>}
        </span>
        <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{k.s}</span>
      </span>
      <button onClick={(e) => { e.stopPropagation(); prepniPin(k.id); }} aria-label={pn ? "Odopnúť z lišty" : "Pripnúť na lištu"} aria-pressed={pn} title={pn ? "Odopnúť z lišty" : "Pripnúť na lištu"}
        style={{ flex: "none", width: 44, height: 44, borderRadius: 12, border: `1px solid ${pn ? "var(--cuBd)" : "transparent"}`, background: pn ? "var(--accSoft)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ik d={IK.pin} s={17} w={2} fill={pn ? "var(--acc)" : "none"} />
      </button>
      <Ik d={IK.sipkaP} s={16} w={2.4} />
    </div>);
}

function Mriezka({ karty, mobil, ...s }: { karty: Karta[] } & Spolocne) {
  return <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: mobil ? 10 : 14 }}>{karty.map((k) => <KartaPolozky key={k.id} k={k} {...s} />)}</div>;
}

function ObrZbierky(s: Spolocne) {
  const [zt, setZt] = useState(0);
  const { mobil, otvor, menu, nova } = s;
  return (<>
    {menu.mojeZbierky && nova && <>{/* OPRAVY 109: nová charita — žiadne ukážkové zbierky */}
      <div role="tablist" style={{ flex: "none", display: "flex", gap: 2, padding: 4, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", alignSelf: mobil ? "stretch" : "flex-start" }}>
        {["Bežiace · 0", "Ukončené · 0"].map((t, i) => { const on = i === zt; return (
          <button key={t} role="tab" aria-selected={on} onClick={() => setZt(i)} style={{ flex: mobil ? 1 : "none", height: 40, minHeight: 40, padding: "0 18px", border: "none", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap", fontSize: 14.5, fontWeight: on ? 800 : 700, background: on ? "var(--seg)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", boxShadow: on ? "0 1px 3px rgba(30,28,20,.14)" : "none" }}>{t}</button>); })}
      </div>
      <section style={{ ...karta, padding: mobil ? "26px 18px" : "34px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
        <b style={{ fontSize: 16.5 }}>Zatiaľ nemáte žiadnu zbierku</b>
        <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>Keď ju vytvoríte, uvidíte ju tu aj s tým, koľko prišlo a čo treba doložiť.</span>
        <button onClick={() => otvor("x:Nová zbierka")} style={{ ...zeleneTl, marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}><Ik d="M12 5v14M5 12h14" s={17} c="currentColor" w={2.6} />Nová zbierka</button>
      </section></>}
    {menu.mojeZbierky && !nova && <><div role="tablist" style={{ flex: "none", display: "flex", gap: 2, padding: 4, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", alignSelf: mobil ? "stretch" : "flex-start" }}>
      {["Bežiace · 2", "Ukončené · 1"].map((t, i) => { const on = i === zt; return (
        <button key={t} role="tab" aria-selected={on} onClick={() => setZt(i)} style={{ flex: mobil ? 1 : "none", height: 40, minHeight: 40, padding: "0 18px", border: "none", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap", fontSize: 14.5, fontWeight: on ? 800 : 700, background: on ? "var(--seg)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", boxShadow: on ? "0 1px 3px rgba(30,28,20,.14)" : "none" }}>{t}</button>); })}
    </div>
    <section style={{ borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "0 14px" : "0 20px" }}>
      {ZB_LIST.filter((z) => z.konc === (zt === 1)).map((z, i) => (
        <div key={z.t} style={mobil
          ? { display: "grid", gridTemplateColumns: "84px minmax(0,1fr)", gap: 12, alignItems: "center", padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }
          : { display: "grid", gridTemplateColumns: "112px minmax(0,1fr) 200px auto", gap: 18, alignItems: "center", minHeight: 96, padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ aspectRatio: "16/10", borderRadius: 12, background: z.bg }} />
          <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 16 }}>{z.t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{z.s}</span></span>
          <span style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: mobil ? "1 / -1" : undefined }}><Pruh sc={z.v / z.c} /><span style={{ fontSize: 13, color: "var(--ink3)" }}><b style={{ color: "var(--ink)" }}>{eur(z.v)}</b> z {eur(z.c)}</span></span>
          <button onClick={() => otvor("x:Správa zbierky")} style={{ minHeight: 44, border: "none", background: "transparent", cursor: "pointer", whiteSpace: "nowrap", fontSize: 14.5, fontWeight: 800, color: "var(--green)", gridColumn: mobil ? "1 / -1" : undefined, justifySelf: mobil ? "end" : undefined }}>Spravovať zbierku ›</button>
        </div>))}
    </section></>}
    {menu.druhy.length > 0 && <>
      {menu.mojeZbierky && <span style={{ flex: "none", fontSize: 17, fontWeight: 800 }}>Ďalšie druhy zbierok</span>}
      <Mriezka karty={menu.druhy} {...s} />
    </>}
  </>);
}

function ObrPenazenka({ otvor, mobil }: { otvor: (s: Sub) => void; mobil: boolean }) {
  const dlazdice: [string, string, string][] = [["Prišlo tento mesiac", "0 €", "0 darov"], ["Čaká na výplatu", "0 €", ""], ["Vyplatené spolu", "0 €", "od začiatku"]];
  return (<>
    <span style={{ flex: "none", fontSize: 14, color: "var(--ink3)" }}>Peniaze z darov a výplaty na účet charity.</span>
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
      {dlazdice.map(([k, v, s]) => (
        <section key={k} style={{ ...karta, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{k}</span><span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.01em" }}>{v}</span><span style={{ fontSize: 12.5, color: "var(--ink3)", minHeight: 17 }}>{s}</span>
        </section>))}
    </div>
    <section style={{ ...karta, padding: "6px 20px" }}>
      <div style={{ padding: "12px 0 8px", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>VÝPLATY NA ÚČET</div>
      <div style={{ padding: "14px 0 16px", borderTop: "1px solid var(--cardBd)", fontSize: 14, color: "var(--ink2)" }}>Zatiaľ žiadna výplata. Prvá príde po prvom dare.</div>
    </section>
    <button onClick={() => otvor("x:Dary v EURC")} style={{ ...karta, minHeight: 64, padding: "0 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "10px 0" }}><b style={{ fontSize: 15, color: "var(--ink)" }}>Dary v EURC</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>zapnúť alebo vypnúť, pre všetky zbierky alebo podľa zbierky</span></span>
      <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--green)", whiteSpace: "nowrap" }}>Nastaviť ›</span>
    </button>
  </>);
}

// ---------- Nastavenia: vľavo Vzhľad + Prístupnosť (ako u usera), vpravo sekcie charity ----------
function Prepinac({ on }: { on: boolean }) {
  return <span aria-hidden="true" style={{ width: 48, height: 28, borderRadius: 14, background: on ? "var(--green)" : "#C9C4B8", display: "block", position: "relative", transition: "background .2s ease", flex: "none" }}><span style={{ position: "absolute", top: 3, left: 3, width: 22, height: 22, borderRadius: "50%", background: "var(--white)", transform: on ? "translateX(20px)" : "none", transition: "transform .2s ease" }} /></span>;
}
const sekNadpis: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" };
type Riadok = { t: string; s?: string; v?: string; prep?: [boolean, () => void]; red?: boolean; tap?: () => void };

function ObrNastavenia({ tier, otvor, mobil }: { tier: Tier; otvor: (s: Sub) => void; mobil: boolean }) {
  const n = useNastaveniaAppky();
  const { tema, nastavTemu } = useMotiv();
  const [tuk, setTuk] = useState(potvrditTuknutim);
  const [tichy, setTichy] = useState(true);
  const fz = Math.round((n.pismo - 90) / 10); // 0–6
  const pr = (t: string) => () => otvor(`x:${t}`);
  const nn = (id: string) => () => otvor(`n:${id}`);
  const pristup: [string, string, boolean, () => void][] = [
    ["Obmedziť animácie", "bez letov, iskier a pulzovania", n.obmedzAnim, () => zmenNastavenia({ obmedzAnim: !n.obmedzAnim })],
    ["Vibrácie", "pri potvrdení a po dare", n.vibracie, () => zmenNastavenia({ vibracie: !n.vibracie })],
    ["Titulky vo videách", "vždy zapnuté", n.titulky, () => zmenNastavenia({ titulky: !n.titulky })],
    ["Potvrdzovať ťuknutím", "namiesto podržania, pri platbe dvakrát ťukni", tuk, () => { nastavPotvrditTuknutim(!tuk); setTuk(!tuk); }],
  ];
  const sekcie: [string, Riadok[]][] = [
    ["OZNÁMENIA", [{ t: "Čo chcete dostávať", s: "dary, zbierky, doklady, ľudia, správy", tap: nn("notif") }, { t: "Tichý čas", s: "22:00 – 7:00", prep: [tichy, () => setTichy((x) => !x)] }]],
    ["PRÍJEM DAROV", [{ t: "Dary v eurách", v: eurText(), tap: nn("eur") }, { t: "Dary v EURC", v: eurcText(), tap: nn("krypto") }, { t: "Správa účtov", s: "hlavný účet a účty zbierok", tap: nn("ucty") }]],
    ["SPRÁVCOVIA", [{ t: "Správcovia a prístupy", s: "kto spravuje stránku, pozvať ďalšieho", v: String(pocetSpravcov()), tap: nn("spravcovia") }]],
    ["ORGANIZÁCIA", [{ t: "Údaje organizácie", s: "IČO, sídlo, fakturačné údaje", tap: nn("udaje") }, { t: "Program a platba", v: PROG[Math.min(3, tier)][0], tap: nn("program") }]],
    ["BEZPEČNOSŤ A ÚDAJE", [{ t: "Prihlásené zariadenia", v: String(pocetZariadeni()), tap: nn("zariadenia") }, { t: "Súhlasy", s: "čo organizácia odsúhlasila", tap: nn("suhlasy") }, { t: "Stiahnuť údaje charity", s: "zbierky, darcovia a doklady v jednom súbore", tap: nn("stiahnut") }]],
    ["POMOC", [{ t: "Časté otázky", tap: nn("faq") }, { t: "Napísať podpore", tap: nn("podpora") }]],
    ["STRÁNKA", [{ t: "Zrušiť stránku charity", red: true, tap: nn("zrusit") }]],
  ];
  const riadok = (r: Riadok, i: number) => (
    <button key={r.t} onClick={r.prep ? r.prep[1] : r.tap} role={r.prep ? "switch" : undefined} aria-checked={r.prep ? r.prep[0] : undefined}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 58, border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", padding: "6px 0" }}>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700, color: r.red ? "#A34A2A" : "var(--ink)" }}>{r.t}</span>{r.s && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{r.s}</span>}</span>
      {r.v && <span style={{ fontSize: 14, color: "var(--ink3)", flex: "none" }}>{r.v}</span>}
      {r.prep ? <Prepinac on={r.prep[0]} /> : <Ik d={IK.sipkaP} s={16} c="var(--ink3)" w={2.4} />}
    </button>);
  const lavy = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={sekNadpis}>VZHĽAD</div>
        <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div id="sc-tema" style={{ fontSize: 15, fontWeight: 700 }}>Téma</div>
          <div role="radiogroup" aria-labelledby="sc-tema" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, padding: 4, borderRadius: 14, background: "var(--btn)" }}>
            {([["svetla", "Svetlá"], ["tmava", "Tmavá"], ["system", "Podľa telefónu"]] as const).map(([k, l]) => { const on = tema === k; return (
              <button key={k} role="radio" aria-checked={on} onClick={() => nastavTemu(k)} style={{ height: 42, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, background: on ? "var(--white)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", padding: "0 4px", lineHeight: 1.15 }}>{l}</button>); })}
          </div>
          <button onClick={pr("Jazyk")} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, border: "none", borderTop: "1px solid var(--cardBd)", paddingTop: 10, background: "transparent", cursor: "pointer", textAlign: "left" }}>
            <Ik d={"M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" + IK.svet} s={18} c="#3D6B8E" w={2} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Jazyk <span lang="en" style={{ fontWeight: 600, color: "var(--ink3)" }}>· Language</span></span>
            <span style={{ fontSize: 14, color: "var(--ink3)" }}>{n.jazyk}</span>
            <Ik d={IK.sipkaP} s={16} c="var(--ink3)" w={2.4} />
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={sekNadpis}>PRÍSTUPNOSŤ</div>
        <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 14px 4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 15, fontWeight: 700 }}>Veľkosť písma</span><span aria-live="polite" style={{ fontSize: 14, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{n.pismo} %</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 6px" }}>
            <button onClick={() => zmenNastavenia({ pismo: Math.max(90, n.pismo - 10) })} disabled={n.pismo <= 90} aria-label="Zmenšiť písmo" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 14, fontWeight: 800, cursor: "pointer", color: "var(--ink)", opacity: n.pismo <= 90 ? .4 : 1 }}>A</button>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} style={{ height: 6, borderRadius: 3, background: i <= fz ? "var(--green)" : "#C9C4B8" }} />)}</div>
            <button onClick={() => zmenNastavenia({ pismo: Math.min(150, n.pismo + 10) })} disabled={n.pismo >= 150} aria-label="Zväčšiť písmo" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 21, fontWeight: 800, cursor: "pointer", color: "var(--ink)", opacity: n.pismo >= 150 ? .4 : 1 }}>A</button>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)", paddingBottom: 10 }}>Pridáva sa k veľkosti písma v telefóne.</div>
          {pristup.map(([t, s, on, f]) => (
            <button key={t} role="switch" aria-checked={on} onClick={f} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 58, border: "none", borderTop: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", textAlign: "left", padding: "6px 0" }}>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
              <Prepinac on={on} />
            </button>))}
        </div>
      </div>
    </div>);
  const pravy = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {sekcie.map(([nz, rows]) => (
        <div key={nz} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={sekNadpis}>{nz}</div>
          <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "0 14px" }}>{rows.map(riadok)}</div>
        </div>))}
    </div>);
  return <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 18, alignItems: "start" }}>{lavy}{pravy}</div>;
}

// ---------- prázdne obrazovky ----------
function Pripravujeme() {
  return <section style={{ ...karta, padding: "28px 24px", fontSize: 15, color: "var(--ink2)" }}>Pripravujeme</section>;
}
function Zamknute({ program }: { program: string }) {
  return (
    <section style={{ ...karta, padding: "24px", display: "flex", flexDirection: "column", gap: 6 }}>
      <b style={{ fontSize: 17 }}>Túto funkciu máte v programe {program}.</b>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Tu bude krátko, čo prináša.</span>
    </section>);
}

// ---------- DEV (len testovacia verzia) ----------
type StavDev = "pozv" | "free" | "bezna";
function DevSprava({ tier, stit, stav, typ, onTyp, onTier, onStit, onStav }: { tier: Tier; stit: StitCharity; stav: StavDev; typ: TypStranky; onTyp: (t: TypStranky) => void; onTier: (t: Tier) => void; onStit: (s: StitCharity) => void; onStav: (s: StavDev) => void }) {
  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, minHeight: 32, padding: "0 4px", borderRadius: 8, border: `1px solid ${on ? "var(--ink)" : "transparent"}`, background: on ? "var(--ink)" : "transparent", color: on ? "var(--bg)" : "var(--ink2)", fontSize: 11.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" });
  return (
    <div aria-label="DEV" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 14, border: "1px dashed var(--ink4)", fontSize: 11.5, color: "var(--ink3)" }}>
      <b style={{ fontSize: 11, letterSpacing: ".07em" }}>DEV · len testovacia verzia</b>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}><span>Typ stránky</span>
        <select value={typ} onChange={(e) => onTyp(e.target.value as TypStranky)} style={{ minHeight: 36, borderRadius: 8, border: "1px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "0 6px" }}>
          {TYPY_STRANOK.filter((t) => !TYP_SKRYTY[t]).map((t) => <option key={t} value={t}>{TYP_NAZOV[t]}</option>)}
        </select></label>
      <span>Program</span>
      <div style={{ display: "flex", gap: 2 }}>{([0, 1, 2, 3, 4] as Tier[]).map((t) => <button key={t} onClick={() => onTier(t)} style={seg(t === tier)}>{PROGRAM_NAZOV[t]}</button>)}</div>
      <span>Štít</span>
      <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>{(Object.keys(STITY) as StitCharity[]).map((k) => <button key={k} onClick={() => onStit(k)} style={seg(k === stit)}>{STITY[k][3]}</button>)}</div>
      <span>Stav</span>
      <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>{([["pozv", "Nová · pozvaná"], ["free", "Nová · zadarmo"], ["bezna", "Bežná"]] as [StavDev, string][]).map(([k, t]) => <button key={k} onClick={() => onStav(k)} style={seg(k === stav)}>{t}</button>)}</div>
    </div>);
}
