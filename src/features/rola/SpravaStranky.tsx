// ============================================================
// KARTA 36 · Správa stránky — jedna správa pre všetky typy (charita, spolok, … firma, tvorca). Typ len vypína
// položky, pridáva nástroje a mení slová — tabuľky sú v stav.ts (POVOLENIA_TYPU, NASTROJE_TYPU, SLOVA_TYPU …).
// KARTA 34 · Správa charity — KOSTRA (fáza A).
// Prototyp: „Sprava charity PC.dc.html" (Pult charity PC) + „Sprava charity mobil.dc.html".
// Len rozloženie, farby podľa štítu a témy, Späť všade, povolenia z jedného miesta (stav.ts).
// Funkcie za tlačidlami NIE SÚ — každé tlačidlo otvorí obrazovku „Pripravujeme".
// ============================================================
import { darcoviaZDarov } from "@/lib/nazivoCharity";
import { useZmenyPribehov, nacitajPribehy, novePribehu, stitokNoveho } from "@/lib/pribehZbierky";
import { useZmenyDarov, darcoviaPre, sucetDarov } from "@/lib/darcovia";
import { skutkyOrgSpravy, useZmenySkutkov } from "@/lib/mojeSkutky";
import { nacitajSkutkyStranky, useZmenySkutkovStranky } from "@/lib/skutkyStranky";
import { naviazObjekt } from "@/lib/darZbierky";
import { UKAZKOVE_STRANKY } from "@/lib/mojeStranky";
import { TlZbalit } from "@/features/verejny-profil/zbalit";
import { pripojTestovaciuStranku } from "@/lib/stranka";
import { nacitajNastavenia } from "@/lib/nastaveniaStranky";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { otvorPridatIskru } from "@/features/iskry/otvor";
import { DeedZnacka } from "@/components/DeedZnacka";
import { NovaZbierka } from "./NovaZbierka";
import { zastavDiktovanie } from "@/lib/diktovanie";
import { SpravaZbierky, type ZbierkaNaSpravu } from "./SpravaZbierky";
import { SpravaCentralnej } from "./SpravaCentralnej";
import { QrNastroje } from "./QrNastroje";
import { SpravaDorovnania } from "./SpravaDorovnania";
import { SkutkyCharity } from "./SkutkyCharity";
import { OznamySprava, AkcieCharity } from "./NovyOznam";
import { aktivnychOznamov, aktivneOznamyText, nacitajOznamyStranky, useZmenyOznamovCharity, type DruhOznamu } from "@/lib/oznamyNove";
import { centralnaZPamate, useZmenyCentralnej, prazdnaCentralna, nacitajCentralnuZbierku } from "@/lib/centralnaZbierka";
import { useVecneZbierky } from "@/lib/vecnaZbierka";
import { MaterialneCharita } from "./MaterialneCharita";
import { useSektory, cislaSektora, nastavVyberCentralnej, chcemNovySektor, CENTRALNA_CISLA, NULA, SEKTORY_OD_TIERU } from "@/lib/sektoryCharity";
import { cistyText } from "@/lib/richtext";
import { cisloObjektu } from "@/lib/cisloObjektu";
import { useDorovnania, stavCharity } from "@/lib/dorovnanie";
import { nacitajStav, pridajDni, SPRAVA_ZBIERKY_CFG } from "@/lib/zbierkaSprava";
import { SUBJEKTY } from "./mock";
import { upravZbierku, autoUzavrietZbierky, useZmenyZbierok, zbierkyStrankyZPamate, nacitajZbierkyStranky, konceptZbierkyZPamate, nacitajKonceptZbierky, cielCislo, jeIne, UCELY, KROKY_ZBIERKY, type SpustenaZbierka, type NovaZbierkaData } from "@/lib/novaZbierka";
import { UpravitProfilCharity, VerejnyProfilOkno, zakladnyProfil } from "./UpravitProfilCharity";
import { VerejnyProfilVSprave } from "@/features/verejny-profil/VerejnyProfil";
import { PonukyPrace } from "./PonukyPrace";
import { StitNaWeb } from "./StitNaWeb";
import { KalendarCharity } from "./KalendarCharity";
import { StatistikyFarnosti } from "./StatistikyFarnosti";
import { najdiTestProfil } from "@/lib/testProfily";
import { nacitajProfil, profilZPamate, uplnostProfilu, type ProfilStranky } from "@/lib/profilStranky";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cakaProgramPoRegistracii } from "@/lib/mojeStranky";
import { createPortal } from "react-dom";
import "@/styles/sprava.css";
import { useLayout, useMotiv } from "@/components/context";
import { toast } from "@/components/toast";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { potvrditTuknutim, nastavPotvrditTuknutim } from "@/features/zbierka/Platba";
import { TESTOVACIA } from "@/lib/testovacia";
import { VzhladStranky } from "./VzhladStranky";
import { useRegistra } from "@/lib/udajeRegistra";
import { mestoZoSidla } from "@/data/charita.supabase";
import { nastavAktivnuCharitu, casRegistracieLokalne } from "@/lib/aktivnaCharita";
import { supabase } from "@/lib/supabase";
import { useProgramStranky } from "@/lib/programStranky";
import { useMojePrava, smie, NEMATE_POVOLENE, type Pravo } from "@/lib/pravaPracovnika";
import { LudiaCharity, pocetLudiCharity } from "./LudiaCharity";
import { AtelierCharity } from "./AtelierCharity";
import { ListaNeverejna, KartyZverejnenia, OknoZverejnit } from "./ZverejnenieStranky";
import { useNeverejna } from "@/lib/zverejnenieStranky";
import { DarcoviaCharity, SledujuciCharity } from "./DarcoviaCharity";
import { BrigadyFarnosti } from "./BrigadyFarnosti";
import { IskryCharity } from "./IskryCharity";
import { SpravaFarnosti } from "./SpravaFarnosti";
import { useTestStav, zmenTestStav, otvorenaRealnaStranka } from "@/lib/testStav";
import { PrepinacPodania, TestVolba } from "@/features/verejny-profil/casti";
import { nacitajPiny, ulozPiny, pinyZPamate, nacitajZbalenie, ulozZbalenie, zbalenieZPamate, type Zbalenie } from "@/lib/spravaPiny";
import { nastavStitSpravy } from "@/lib/stitAppky";
import { ObrOznamenia, ObrEur, ObrEurc, ObrUcty, ObrSpravcovia, ObrUdaje, ObrProgram, ObrFaktury, ObrZariadenia, ObrSuhlasy, ObrStiahnut, ObrFaq, ObrPodpora, ObrZrusit, PROG, pocetSpravcov, pocetZariadeni, eurcText, eurText } from "./NastaveniaCharity";
import { TlacidloNastavenia, LogoKarty } from "./spravaCasti";
import { sumaEur } from "@/lib/suma";
import {
  FLAGS, KONFIG, nacitajTiery, ulozTiery, slovo, maPovolenie, vidnoPolozku, smieSkutokZaCharitu, type RolaStranky, odProgramu, PROGRAM_NAZOV, PIN_MAX,
  nacitajStitCharity, ulozStitCharity, nacitajCharituNovu,
  type PolozkaSpravy, type StitCharity, type Tier, type Pozicia,
  type TypStranky, TYP_NAZOV, TYPY_STRANOK, TYP_SKRYTY, NASTROJE_TYPU, typPovoli, STIT_SADA_TYPU, type StitSada,
  nacitajIbanOrg, STRANKA_POZICIE,
} from "./stav";
import { useVerejneNastavenia, verejneZPamate } from "@/lib/verejneNastavenia";
import { useRezimStranky, type RezimStranky } from "@/lib/pristupoveKody";

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
    P("M4 6h16v12H4zM10 9l5 3-5 3z", "Iskry", "Video do 45 s", "video"),
    P("M4 10v4h3l6 4V6L7 10z", "Oznamy", "Krátka správa pre tých, čo vás sledujú", "oznamy"),
    P("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", "Moja nástenka", "Udalosti na nástenke mesta", "nastenka"),
    P("M5 4h14v16H5zM9 9l6 3-6 3z", "Upútavky v Iskrách", "Upútavka na zbierku medzi videami", "upoutavky"),
  ],
  g_ludia: [
    P("M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6M19 8v6M16 11h6", "Štatutár a pracovníci", "Kto spravuje stránku · pridať človeka", "spravcovia"),
    P("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6", "Darcovia", "Kto daroval, koľkokrát a koľko", "darcovia"),
    P("M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5", "Sledujúci", "Kto sleduje vašu stránku", "sledujuci"),
    P("M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M16 5.5a3 3 0 0 1 0 5.5", "Dobrovoľníctvo", "Brigády a pomoc · blok Pomôž na stránke", "dobrovolnici"),
    P("M4 6h16v14H4zM4 10h16", "Akcie a podujatia", "Podujatie s QR, predaj lístkov a merchu", "podujatia"),
    P("M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z", "Sponzoring", "Hľadáme sponzora · zmluva, logo na profile", "sponzoring"),
    P("M9 7V4h6v3M4 7h16v13H4z", "Pracovné ponuky", "Hľadáme brigádnika, zamestnanca, pomoc", "inzeraty"),
  ],
  g_nastroje: [
    P("M12 5v14M5 12h14", "Pridať skutok", "Fotky a pár viet o tom, komu ste pomohli", "pridatSkutok"),
    P("M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z", "QR nástroje", "QR organizácie a zbierok · plagát, pokladnička", "qr"),
    P("M4 5h16v15H4zM4 10h16M8 3v4M16 3v4", "Kalendár", "Akcie, lehoty, smeny", "kalendar"), // KARTA 42: len telefón (PC a tablet majú kalendár v hlavičke)
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
    g_obsah: G.g_obsah.filter((k) => ok(k.id)), g_ludia: G.g_ludia.filter((k) => ok(k.id)).map((k) => (k.id === "spravcovia" && typ !== "charita" ? { ...k, t: "Správcovia a prístupy", s: "Kto spravuje stránku · pozvať ďalšieho" } : k)), g_nastroje: G.g_nastroje.filter((k) => ok(k.id)),
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
const NAST_OBR: Record<string, string> = { notif: "Čo chcete dostávať", eur: "Dary v eurách", krypto: "Dary v EURC", ucty: "Správa účtov", spravcovia: "Správcovia a prístupy", udaje: "Údaje organizácie", program: "Program a predplatné", faktury: "Faktúry", zariadenia: "Prihlásené zariadenia", suhlasy: "Súhlasy", stiahnut: "Stiahnuť údaje charity", faq: "Časté otázky", podpora: "Napísať podpore", zrusit: "Zrušiť stránku charity" };
const titulok = (s: Sub, typ: TypStranky) => (s === null ? "Prehľad" : s === "n:spravcovia" && typ === "charita" ? "Ľudia v správe" : s.startsWith("x:") ? s.slice(2) : s.startsWith("n:") ? NAST_OBR[s.slice(2)] ?? "Nastavenia" : s === "g_typ" ? TYP_NAZOV[typ] : NAZVY[s] ?? NAZOV_POLOZKY[s as PolozkaSpravy] ?? "Správa stránky");

/** OPRAVY 397: jedno tlačidlo „Štít: Bronz ›“ — ťuk otvorí výber, po výbere sa zavrie a ukáže nový */
function StitVolba({ pas, stit, onStit }: { pas: boolean; stit: StitCharity; onStit: (s: StitCharity) => void }) {
  const [otv, setOtv] = useState(false);
  const chip = (on: boolean): React.CSSProperties => ({ height: 44, padding: `0 ${pas ? 16 : 14}px`, borderRadius: 22, border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--green)" : "var(--card)", color: on ? "#fff" : "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" });
  return (
    <div role="group" aria-label="Štít" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <button type="button" aria-expanded={otv} onClick={() => setOtv((x) => !x)} style={chip(false)}>Štít: {STITY[stit][3]} {otv ? "‹" : "›"}</button>
      {otv && (Object.keys(STITY) as StitCharity[]).map((k) => (
        <button key={k} type="button" aria-pressed={k === stit} onClick={() => { onStit(k); setOtv(false); }} style={chip(k === stit)}>{STITY[k][3]}</button>))}
    </div>);
}
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
const N8 = ["0 €", "0", "—", "—", "—", "0 €", "—", "—"];
// OPRAVY 440 (2) · 445 (2): skutočná stránka — čísla z ledgera (tie isté dary ako detail zbierky, profil a feed).
// Čo ledger nevie bez účtov darcov (noví darcovia, sledujúci, darcovia spolu), je „—“, nie vymyslené číslo.
const DEN_MS = 86_400_000;
/** refId centrálnej v Správe → naviazané na ledger (stranka:hlavna), ten istý ako na profile */
export function refCentralnej(strankaId: string): string { const r = `${strankaId}-centralna`; naviazObjekt(r, { stranka: strankaId, hlavna: true, nazov: "Celá činnosť" }); return r; }
function cislaZLedgera(refs: string[], obd: number): [string, string][] {
  const dnes = new Date(); dnes.setHours(0, 0, 0, 0);
  const od = obd === 0 ? dnes.getTime() : Date.now() - [7, 30, 365][obd - 1] * DEN_MS;
  const vsetky = refs.flatMap((r) => darcoviaPre(r)), v = vsetky.filter((r) => r.cas >= od);
  const ludia = v.filter((r) => !r.firma), suma = ludia.reduce((a, r) => a + r.suma, 0), firmy = v.filter((r) => r.firma).reduce((a, r) => a + r.suma, 0);
  const dc = darcoviaZDarov(vsetky, od); // OPRAVY 478 doplnok: noví a všetci darcovia zo skutočných darov
  return [[eur(suma), ""], [String(ludia.length), ""], [ludia.length ? eur(suma / ludia.length) : "—", ""], [String(dc.novi), ""], ["—", ""], [eur(firmy), ""], ["—", ""], [String(dc.spolu), "od začiatku"]]; // OPRAVY 442 doplnok 3: pravidelnú podporu appka zatiaľ nepočíta → „—“, nie „0 ľudí“
}
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
type PhZbierka = { t: string; v: number; c: number; d: string; bg: string; dn: number };
type ZbRiadok = { t: string; v: number; c: number; bg: string; s: string; konc: boolean; id?: string; lehotaText?: string; lehota?: "30" | "60" | "priebezne" | "stvrtrocne"; bezPredlzenia?: boolean; dlha?: boolean; zaciatok?: string; mesiace?: number; ucel?: string; mesto?: string; darcovia?: number; zostava?: number; overene?: boolean; skoncila?: string; zdroj?: SpustenaZbierka };
/** KARTA 38: riadok Moje zbierky → zbierka na správu (počet darcov a dni z textu riadku pri ukážkových zbierkach) */
const naSpravu = (z: ZbRiadok): ZbierkaNaSpravu => {
  const darc = z.darcovia ?? Number(/(\d[\d\s]*) darcov/.exec(z.s)?.[1].replace(/\s/g, "") ?? 0), dni = z.zostava ?? Number(/končí o (\d+)/.exec(z.s)?.[1] ?? 30);
  // OPRAVY 442 doplnok: skutočná zbierka (zdroj) — súčet a darcov dopočíta Správa zbierky z ledgera, riadok ich nesmie pridať druhýkrát
  const real = !!z.zdroj;
  return { id: z.id ?? `ukazka-${z.t.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}`, nazov: z.t, bg: z.bg, ciel: z.c, vyzbierane: real ? 0 : z.v, darcovia: real ? 0 : darc, zostavaDni: dni, ukoncena: z.konc, lehotaText: z.lehotaText, lehota: z.lehota, bezPredlzenia: z.bezPredlzenia || /^Centrálna/.test(z.t), dlha: z.dlha, zaciatok: z.zaciatok, mesiace: z.mesiace, ucel: z.ucel, mesto: z.mesto, ...(z.zdroj ? { popis: z.zdroj.popis, popis2: z.zdroj.popis2, media: z.zdroj.media, sada: z.zdroj.sada, eurc: z.zdroj.eurc, sadaE: z.zdroj.sadaE, ucet: z.zdroj.ucet, vs: z.zdroj.vs, autoUzavriet: autoUzavrietZbierky(z.zdroj) } : {}) };
};
/** OPRAVY 114: spustená zbierka charity → karta v Prehľade a riadok v Moje zbierky */
const fotoBg = (z: SpustenaZbierka) => { const f = z.media.find((m) => m.typ === "foto"); return f ? `url('${f.src}') center/cover no-repeat var(--track)` : "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)"; };
// OPRAVY 442 doplnok 3: skutočný koniec (zo servera, inak spustenie + 30 dní / + mesiace) a skutočné dary dnes — nič napevno
const koniecZb = (z: SpustenaZbierka): number => { if (z.koniec) return new Date(z.koniec).getTime(); const d = new Date(z.spustena); if (z.typ === "dlha") d.setMonth(d.getMonth() + (z.mesiace || 0)); else d.setDate(d.getDate() + 30); return d.getTime(); };
const kedyKonci = (z: SpustenaZbierka): string => { const dni = Math.max(0, Math.ceil((koniecZb(z) - Date.now()) / 86400000)); return dni === 0 ? "končí dnes" : `končí o ${dni} ${dni === 1 ? "deň" : dni <= 4 ? "dni" : "dní"}`; };
const dnesEur = (id: string) => { const d = new Date(); d.setHours(0, 0, 0, 0); return darcoviaPre(id).filter((r) => r.cas >= d.getTime()).reduce((a, r) => a + r.suma, 0); };
const naPh = (z: SpustenaZbierka): PhZbierka => ({ t: z.nazov, v: sucetDarov(z.id).suma, c: z.cielTyp === "ciel" ? cielCislo(z) : 0, d: kedyKonci(z), bg: fotoBg(z), dn: dnesEur(z.id) });
const naRiadok = (z: SpustenaZbierka): ZbRiadok => ({ id: z.id, zdroj: z, lehotaText: z.lehota ? (/^\d/.test(z.lehota) ? `do ${z.lehota}` : z.lehota) : undefined, lehota: z.lehotaKluc ?? "30", bezPredlzenia: z.typ === "dlha", dlha: z.typ === "dlha", zaciatok: z.spustena, mesiace: z.mesiace, ucel: z.ucel != null ? (jeIne(z) ? z.ineT : UCELY[z.ucel][0]) : undefined, t: z.nazov, v: sucetDarov(z.id).suma, c: z.cielTyp === "ciel" ? cielCislo(z) : 0, bg: fotoBg(z), s: `${darcovT(sucetDarov(z.id).pocet)} · ${kedyKonci(z)}`, konc: z.stav === "ukoncena" }); // OPRAVY 526: server mohol zbierku uzavrieť sám // OPRAVY 445 (2): z ledgera
const darcovT = (n: number) => `${n} ${n === 1 ? "darca" : n >= 2 && n <= 4 ? "darcovia" : "darcov"}`;
// KARTA 48 · testovacie zbierky 1 : 1 podľa prototypu „Zbierky zoznam"
const ZB_LIST: ZbRiadok[] = [
  { t: "Strecha pre rodinu Horváthovú", mesto: "Trenčín", v: 8420, c: 12000, darcovia: 148, zostava: 9, bg: "url('/img/sprava/dom.jpg') center/cover no-repeat var(--track)", s: "končí o 9 dní · 148 darcov", konc: false },
  { t: "Invalidný vozík pre Ninu", mesto: "Trenčín", v: 2960, c: 4000, darcovia: 94, zostava: 18, dlha: true, bezPredlzenia: true, mesiace: 6, bg: "url('/img/sprava/chrbtica.jpg') center/cover no-repeat var(--track)", s: "2 960 € z 4 000 €", konc: false },
  { t: "Ovocie do výdajne", mesto: "Trenčín", v: 380, c: 400, darcovia: 31, bg: "url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=70') center/cover no-repeat var(--track)", s: "skončila 22. 9.", konc: true, skoncila: "2026-09-22T18:00:00.000Z" },
  { t: "Školské potreby", mesto: "Prešov", v: 450, c: 450, darcovia: 27, bg: "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)", s: "skončila 25. 8.", konc: true, skoncila: "2026-08-25T18:00:00.000Z", overene: true },
];
const RETAZ: [string, string, string, string][] = [["MK", "Martin K.", "pripojil sa k Strecha pre rodinu Horváthovú", "420 €"], ["ZŠ", "ZŠ Hodžova", "pripojila sa k Centrálnej zbierke", "160 €"], ["LS", "Lucia S.", "pripojila sa k Centrálnej zbierke", "60 €"]];
const eur = (n: number) => sumaEur(n);
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

export function SpravaStranky(props: SpravaStrankyProps) {
  const [typ, setTyp] = useState<TypStranky>(props.typ ?? "charita"); // DEV lišta ho vie prepnúť
  // KARTA 50 · §2: farnosť má vlastnú Správu (rovnaká kostra, položky farnosti) — bez štítu, programov, dokladov a dorovnania
  // OPRAVY 326: stránka farnosti je vždy Správa farnosti — žiadny prepínač ju neotvorí pod inou rolou (charita by čítala a zapisovala jej zbierky)
  const farnostStranka = props.typ === "farnost" || UKAZKOVE_STRANKY.some((x) => x.k === props.strankaId && x.typ === "farnost");
  if (typ === "farnost" || farnostStranka) return <SpravaFarnosti onBack={props.onBack} strankaId={props.strankaId ?? "farnost"} nazov={props.nazov}
    /* OPRAVY 367: testovací pás (Pozrieť profil · Profil: Vyplnený · Prázdny) v Správe farnosti preč */ />;
  return <SpravaStrankyTypu {...props} typ={typ} onTyp={setTyp} />;
}

function SpravaStrankyTypu({ onBack, typ, onTyp: setTyp, strankaId = "", nazov: nazov0 = "", inicialy: inicialy0 = "" }: SpravaStrankyProps & { typ: TypStranky; onTyp: (t: TypStranky) => void }) {
  // OPRAVY 402: každá charita má svoju stránku — Správa a všetko pod ňou číta údaje tejto charity (musí byť pred čítaním stavu)
  if (typ === "charita") nastavAktivnuCharitu(strankaId);
  const mojePrava = useMojePrava(); // OPRAVY 404: pracovník charity — len to, čo povolil štatutár (null = plné práva)
  // OPRAVY 400: charita sa volá podľa registra (keď je vyplnený), nie napevno
  const regV = useRegistra(strankaId), regNazov = regV.nazov.trim();
  /** OPRAVY 431: mesto charity zo sídla v registri (výzva ide na Domov Domov v tomto meste) */
  const mestoCh = mestoZoSidla(regV.sidlo) ?? "";
  const nazov = (typ === "charita" && regNazov) || nazov0;
  const inicialy = typ === "charita" && regNazov ? regNazov.replace(/,?\s*(o\.\s?z\.|n\.\s?o\.|s\.\s?r\.\s?o\.)$/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") : inicialy0;
  const { desktop, wide } = useLayout();
  // 0035: tester = správca testovacej stránky; potom nastavenia stránky z účtu (0050)
  useEffect(() => { void pripojTestovaciuStranku(strankaId).then(() => nacitajNastavenia(strankaId)); }, [strankaId]);
  const tablet = wide && !desktop; // OPRAVY 96: tablet 760–1179 px má vlastné rozloženie
  const telefon = !desktop && !tablet; // KARTA 42: telefón pod 760 px — nové rozloženie
  const [pridat, setPridat] = useState(false); // KARTA 42: + → hárok Pridať
  const [sub, setSub] = useState<Sub>(() => (cakaProgramPoRegistracii() ? "n:program" : null)); // KARTA 44: koniec registrácie → Program a predplatné
  // OPRAVY 95: zbalené sekcie Prehľadu (mobil + tablet), pamätá sa v účte správcu ako Pripnuté
  const [zbal, setZbal] = useState<Zbalenie>(() => zbalenieZPamate(strankaId));
  useEffect(() => { let ziva = true; void nacitajZbalenie(strankaId).then((z) => { if (ziva) setZbal(z); }); return () => { ziva = false; }; }, [strankaId]);
  const prepniZbal = (id: string, otv?: boolean) => setZbal((z) => { const n = { ...z, [id]: otv ?? !jeOtv(z, id) }; void ulozZbalenie(strankaId, n); return n; });
  const hist = useRef<Sub[]>([]);
  const poz = POZICIA_TYPU(typ);
  useVerejneNastavenia(STRANKA_POZICIE[poz]); // rýchle sumy, krypto, viditeľnosť súm z DB (0070b)
  const sada = STIT_SADA_TYPU[typ];
  const [tiery, setTiery] = useState(nacitajTiery);
  // OPRAVY 529 (Martin 23. 10.): charita má program zo servera (program_stranky) — testovací prepínač Program pri charite nie je
  const programServer = useProgramStranky(typ === "charita" && supabase ? strankaId : null) as Tier;
  const tier = typ === "charita" && supabase ? programServer : tiery[poz];
  const menu = menuTypu(typ, tier);
  const setTier = (t: Tier) => { const n = { ...nacitajTiery(), [poz]: t }; setTiery(n); ulozTiery(n); };
  const [stit, setStit] = useState<StitCharity>(nacitajStitCharity);
  // OPRAVY 433: testovací prepínač Stav je preč — charita je vždy bez ukážkových dát, úvod riadia skutočné dáta.
  // Pozvaná (prvých 50, P3 zadarmo 2 mesiace) = registrácia cez pozvánku uložená pri stránke (verejné nastavenia „pozvana“), nie prepínač.
  const nova = typ === "charita" || nacitajCharituNovu();
  useVerejneNastavenia(strankaId);
  const pozvana = verejneZPamate(strankaId)?.["pozvana"] === true;
  const [piny, setPiny] = useState<PolozkaSpravy[]>(() => pinyZPamate(strankaId));
  useEffect(() => { let ziva = true; void nacitajPiny(strankaId).then((p) => { if (ziva) setPiny(p); }); return () => { ziva = false; }; }, [strankaId]);
  const [zoom, setZoom] = useState(false);
  // KARTA 33: uložený profil stránky (percento v karte charity sa počíta z neho, nie z konceptu)
  const [profil, setProfil] = useState<ProfilStranky | null>(() => profilZPamate(strankaId).ulozeny);
  // OPRAVY 112: koncept (aj práve rozpracovaná úprava) — percento rastie naživo, nie až po Uložiť
  const [koncept, setKoncept] = useState<ProfilStranky | null>(() => profilZPamate(strankaId).koncept);
  // OPRAVY 414 (6): po návrate z Upraviť profil (aj po Uložiť) sa percento a pás prepočítajú z uloženého profilu
  useEffect(() => { const z0 = profilZPamate(strankaId); setProfil(z0.ulozeny); setKoncept(z0.koncept); let ziva = true; void nacitajProfil(strankaId).then((z) => { if (ziva) { setProfil(z.ulozeny); setKoncept(z.koncept); } }); return () => { ziva = false; }; }, [strankaId, sub]);
  const uplnost = uplnostProfilu(koncept ?? profil ?? zakladnyProfil(poz));
  // OPRAVY 91: bočný panel appky berie farbu štítu otvorenej stránky
  useEffect(() => { nastavStitSpravy(stit); }, [stit]);
  useEffect(() => () => nastavStitSpravy(null), []);
  const korenRef = useRef<HTMLDivElement>(null);

  // OPRAVY 121 · bod 9: rola prihláseného v tejto stránke (zatiaľ vždy hlavný správca — rolu doplní server zo správcov stránky)
  const ts = useTestStav(); // OPRAVY 147: rola sa dá prepnúť v testovacom páse
  const rola: RolaStranky = TESTOVACIA && typ !== "charita" ? ts.rola : "hlavny"; // OPRAVY 529: pri charite bez testovacej roly
  // OPRAVY 122 (2): centrálna zbierka charity — zatiaľ z ukážkových bežiacich zbierok (nová charita ju nemá); doplní server
  // OPRAVY 397: testovacia charita sa vždy tvorí od nuly — Správa bez ukážok (prepínač Profil: Vyplnený · Prázdny zmizol)
  // OPRAVY 403: charita nikdy neukazuje vymyslené dáta (ukážky ostávajú len testovacím stránkam Pekáreň a tvorca)
  const bezUkazok = nova || TESTOVACIA; // nova = vždy pri charite (OPRAVY 433)
  // OPRAVY 445 (1): skutočná stránka — žiadne ukážkové dáta (sektory, čísla, darcovia) nikde v Správe
  useEffect(() => (najdiTestProfil(strankaId) ? undefined : otvorenaRealnaStranka()), [strankaId]);
  const centralnaZbierka = !bezUkazok ? PH_ZBIERKY.filter((z) => /^Centrálna zbierka/.test(z.t)).map((z) => ({ id: `${strankaId}-centralna`, nazov: z.t, org: nazov, cislo: "" }))[0] ?? null : null;
  // OPRAVY 114: spustené a rozpísaná zbierka stránky (z účtu)
  useZmenyZbierok();
  const vlastne = zbierkyStrankyZPamate(strankaId);
  const rozpisana = konceptZbierkyZPamate(strankaId);
  useEffect(() => { void nacitajZbierkyStranky(strankaId); void nacitajKonceptZbierky(strankaId); void nacitajCentralnuZbierku(strankaId); }, [strankaId]);
  // OPRAVY 482: „Vytvorte prvú zbierku“ len keď charita nemá žiadnu — ani centrálnu, sektor, bežnú či vecnú
  useZmenyCentralnej();
  const sektoryVsetky = useSektory();
  const vecneVsetky = useVecneZbierky(strankaId);
  const centralnaBezi = !!centralnaZPamate(strankaId)?.spustena;
  // limit je mimo centrálnej · OPRAVY 516: v programe Zadarmo sa centrálna počíta (jedna zbierka naraz: centrálna alebo pre niekoho)
  const beziacich = vlastne.filter(bezi).length + (bezUkazok ? 0 : PH_ZBIERKY.filter((z) => !/^Centrálna zbierka/.test(z.t)).length) + (tier === 0 && centralnaBezi ? 1 : 0);
  const [limitOkno, setLimitOkno] = useState(false);
  // OPRAVY 486: „+ Nová zbierka“ pri charite = výber typu „Akú zbierku pridávate?“ (ako Viera); Bežná zbierka ide rovno do tvorby
  const [vyberZb, setVyberZb] = useState(false);
  const novaPriamo = useRef(false);
  const [materialnaNova, setMaterialnaNova] = useState(false); // OPRAVY 486: z výberu rovno formulár materiálnej
  const [spravZb, setSpravZb] = useState<ZbierkaNaSpravu | null>(null); // KARTA 38: ktorú zbierku spravujem
  // OPRAVY 453: Tlačiť › zo záložky QR → QR nástroje so zvýraznenou zbierkou; ‹ Späť na zbierku otvorí znova záložku QR
  const [qrZ, setQrZ] = useState<string | null>(null);
  const [zbTab, setZbTab] = useState<number | undefined>(undefined);
  const [verejny, setVerejny] = useState(false); // OPRAVY 107: tlačidlo Verejný profil = skutočný verejný profil
  const [verejnyTest, setVerejnyTest] = useState(false); // OPRAVY 154: testovací profil (Kronika/Výklad/Pirát) v okne nad Správou
  // KARTA 42: Zadarmo → z hárku Pridať sa Oznamy otvoria rovno na výzve na súrnu pomoc
  const [oznamStart, setOznamStart] = useState<DruhOznamu | undefined>(undefined);
  const [oznamUprav, setOznamUprav] = useState<string | undefined>(undefined); // OPRAVY 407
  const [poslSkupina, setPoslSkupina] = useState<string | null>(null);
  const [atelierCh, setAtelierCh] = useState(false); // OPRAVY 510: Ateliér stránky v charite
  const [oknoZv, setOknoZv] = useState(false); // OPRAVY 511: Zverejniť stránku?
  const neverejnaS = useNeverejna(strankaId); // OPRAVY 495 (502: Nastavenia → Ľudia)
  const otvor = (s: Sub, oznamDruh?: DruhOznamu, upravId?: string) => {
    if (s === "x:Nová zbierka" && typ === "charita" && !novaPriamo.current) { setVyberZb(true); if (sub !== "g_zbierky") { hist.current = [...hist.current, sub].slice(-30); setSub("g_zbierky"); } window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    zastavDiktovanie(); setOznamStart(oznamDruh); setOznamUprav(upravId); if (s === "x:Verejný profil") { if (najdiTestProfil(strankaId) || /^ch-/.test(strankaId) || typ === "charita") setVerejnyTest(true); else setVerejny(true); return; } // OPRAVY 414 (2): charita vždy vo vzhľade z Nastavení
    // KARTA 37 · bod 3: v programe Zadarmo beží jedna zbierka naraz (limit z stav.ts)
    if (s === "x:Nová zbierka" && sub !== s && beziacich >= KONFIG.limitZbierok[tier]) { setLimitOkno(true); return; }
    // OPRAVY 516: Zadarmo — centrálnu nezaloží, kým beží zbierka pre niekoho
    if (s === "centralna" && tier === 0 && !centralnaBezi && beziacich >= KONFIG.limitZbierok[0]) { setLimitOkno(true); return; }
    // OPRAVY 118/121: Pridať skutok = ten istý PridatSkutok, za charitu (organizacia: true)
    if (s === "pridatSkutok" && typ === "charita" && !smie(mojePrava, "obsah")) { toast(NEMATE_POVOLENE); return; }
    if (s === "pridatSkutok") { if (!smieSkutokZaCharitu(rola)) { toast("Skutok za charitu pridá len správca alebo Organizátor."); return; } otvorPridatSkutok({ autor: nazov, organizacia: true, strankaId, centralna: centralnaZbierka }); return; } if (s === sub) return; hist.current = [...hist.current, sub].slice(-30); setSub(s); };
  const spat = () => {
    zastavDiktovanie(); // OPRAVY 125: Späť funguje vždy, diktovanie hneď abort
    if (sub === null) { hist.current = []; onBack(); return; } // OPRAVY 185: z Prehľadu „Domov"
    if (hist.current.length) { const h = [...hist.current]; const p = h.pop()!; hist.current = h; setSub(p); }
    else setSub(null);
  };
  // pri prepnutí obrazovky hore
  useEffect(() => { korenRef.current?.scrollIntoView?.({ block: "start" }); }, [sub]);

  const tlacQr = (id: string) => { setQrZ(id); setZbTab(undefined); otvor("qr"); };
  useEffect(() => { if (sub !== "g_zbierky") setVyberZb(false); if (sub !== "materialne") setMaterialnaNova(false); }, [sub]); // OPRAVY 486
  useEffect(() => { if (sub !== "qr" && sub !== "x:Správa zbierky" && sub !== "centralna") { setQrZ(null); setZbTab(undefined); } }, [sub]);
  const otvorPolozku = (id: PolozkaSpravy) => otvor(id === "zbierky" ? "g_zbierky" : id === "spravcovia" ? "n:spravcovia" : id);
  // pri zmene typu (DEV) späť na Prehľad, nech nezostane otvorená vypnutá položka
  const typPred = useRef(typ);
  useEffect(() => { if (typPred.current === typ) return; typPred.current = typ; hist.current = []; setSub(null); }, [typ]);
  const prepniPin = (id: PolozkaSpravy) => {
    if (piny.includes(id)) { const n = piny.filter((x) => x !== id); setPiny(n); void ulozPiny(strankaId, n); }
    else if (piny.length < PIN_MAX) { const n = [...piny, id]; setPiny(n); void ulozPiny(strankaId, n); }
    else toast(`Najviac ${PIN_MAX} pripnutých položiek.`);
  };

  // OPRAVY 450: zamknutá položka (od P1/P2…) sa nedá pripnúť; už pripnuté zamknuté sa odopnú
  const odomknuta = (id: PolozkaSpravy) => maPovolenie(id, tier) || id === "oznamy";
  const pinyTypu = piny.filter((id) => menu.vse.some((v) => v.id === id) && odomknuta(id));
  useEffect(() => {
    const n = piny.filter((id) => !menu.vse.some((v) => v.id === id) || odomknuta(id));
    if (n.length !== piny.length) { setPiny(n); void ulozPiny(strankaId, n); }
  }, [tier, piny.join(","), strankaId]); // eslint-disable-line react-hooks/exhaustive-deps
  // OPRAVY 109: úvod novej charity (kým nemá prvú zbierku); krok 1 = prvé Uložiť profil
  // OPRAVY 433: úvod len podľa skutočných dát — nemá uložený profil → krok 1, nemá spustenú zbierku → krok 2, má → úvod preč
  // (spustená = bežiaca, ukončená aj zrušená, z tých istých dát ako BEŽIACE ZBIERKY; rozpísaná sa nepočíta)
  const maZbierku = vlastne.length > 0 || centralnaBezi || sektoryVsetky.length > 0 || vecneVsetky.length > 0;
  const uvod = typ === "charita" && !maZbierku;
  const krok1 = !!profil;
  const glowUp = uvod && !krok1 && sub !== "profil";
  const glowZb = uvod && krok1 && sub !== "profil" && sub !== "g_zbierky" && sub !== "x:Nová zbierka" && sub !== "x:Správa zbierky";
  const navZobr = menu.nav.map((n) => ({ ...n, n: bezUkazok ? undefined : n.n })); // nová charita: Ľudia bez čísla
  const spolocne = { strankaId, entita: poz as string, tier, piny: pinyTypu, prepniPin, otvorPolozku, otvor, nova: bezUkazok, stit, sada, menu, mobil: !desktop, tablet, zbal, prepniZbal, uvod, krok1, pozvana, vlastne, rozpisana, spravuj: (z: ZbierkaNaSpravu) => { setSpravZb(z); otvor("x:Správa zbierky"); },
    vyberZb: typ === "charita" && vyberZb, zavriVyberZb: () => setVyberZb(false),
    novaMaterialna: () => { setVyberZb(false); setMaterialnaNova(true); otvor("materialne"); },
    novaBezna: () => { setVyberZb(false); novaPriamo.current = true; try { otvor("x:Nová zbierka"); } finally { novaPriamo.current = false; } } };
  // KARTA 42 · telefón: karta charity v jednom riadku + 6 dlaždíc správy hneď pod ňou (bez nadpisu, nezbaľuje sa)
  const hornaCast = telefon ? <>
    <KartaRiadok nazov={nazov} inicialy={inicialy} profil={profil} pct={uplnost.pct} chyba={uplnost.chyba} stit={stit} sada={sada} glow={glowUp} onClick={() => otvor("profil")} />
    <DlazdiceSpravy otvor={otvor} nav={navZobr} glowZb={glowZb} />
  </> : null;
  let obsah: React.ReactNode;
  if (sub === null) obsah = <Prehlad {...spolocne} onZoom={() => setZoom(true)} hornaCast={hornaCast} />;
  else if (sub === "g_zbierky") obsah = <ObrZbierky {...spolocne} />;
  else if (sub === "g_obsah" || sub === "g_ludia" || sub === "g_nastroje" || sub === "g_typ") obsah = <Mriezka karty={menu.skupiny[sub] ?? []} {...spolocne} />;
  else if (sub === "vsetko") obsah = <ObrVsetko typ={typ} tier={tier} otvor={otvor} stlpce={desktop || tablet ? 2 : 1} />;
  else if (sub === "penazenka") obsah = <ObrPenazenka otvor={otvor} mobil={!desktop} refs={[...zbierkyStrankyZPamate(strankaId).map((z) => z.id), refCentralnej(strankaId)]} />;
  // OPRAVY 396: Vzhľad stránky (Kronika · Výklad · Pirát) je v Nastaveniach pod Témou, ako vo Viere — nie v Upraviť profil
  else if (sub === "nast") obsah = <ObrNastavenia tier={tier} otvor={otvor} mobil={!wide} charita={typ === "charita"} naLudi={() => { setPoslSkupina("g_ludia"); otvor("n:spravcovia"); }}
    vzhlad={<VzhladStranky strankaId={strankaId} sektor={typ === "tvorca" ? "tvorca" : undefined} zadarmo={tier === 0} kto={slovo(typ, "darcovia", "darcovia")} onPozriet={() => otvor("x:Verejný profil")}
      onAtelier={typ === "charita" && tier > 0 ? () => setAtelierCh(true) : undefined} />} />;
  else if (sub.startsWith("n:")) {
    const m = !wide, id = sub.slice(2), o = otvor as (s: string) => void; // tablet: Nastavenia v 2 stĺpcoch ako PC
    obsah = id === "notif" ? <ObrOznamenia mobil={m} /> : id === "eur" ? <ObrEur mobil={m} /> : id === "krypto" ? <ObrEurc mobil={m} /> : id === "ucty" ? <ObrUcty mobil={m} otvor={o} />
      : id === "spravcovia" ? (typ === "charita" ? <LudiaCharity mobil={m} strankaId={strankaId} meno={nazov} /> : <ObrSpravcovia mobil={m} />) : id === "udaje" ? <ObrUdaje mobil={m} />
      : id === "faktury" ? <ObrFaktury mobil={m} tier={tier} otvor={o} />
      : id === "program" ? <ObrProgram mobil={m} typ={typ} tier={tier} otvor={o} onTier={setTier} />
      : id === "zariadenia" ? <ObrZariadenia mobil={m} /> : id === "suhlasy" ? <ObrSuhlasy mobil={m} otvor={o} /> : id === "stiahnut" ? <ObrStiahnut mobil={m} />
      : id === "faq" ? <ObrFaq otvor={o} /> : id === "podpora" ? <ObrPodpora mobil={m} otvor={o} /> : id === "zrusit" ? <ObrZrusit mobil={m} otvor={o} tier={tier} nova={nova} /> : <Pripravujeme />;
  }
  else if (sub === "profil") obsah = <UpravitProfilCharity charita={!!najdiTestProfil(strankaId) || /^ch-/.test(strankaId) || typ === "charita"} strankaId={strankaId} pozicia={poz} tier={tier} nazov={nazov} inicialy={inicialy} mobil={!desktop} tablet={tablet}
    stit={stit} onUlozene={(pr) => { setProfil(pr); setKoncept(null); }}
    onZmena={setKoncept} onZrusit={() => { hist.current = []; setSub(null); }} onHotovo={() => { hist.current = []; setSub(null); }} />;
  else if (sub === "x:Nová zbierka") obsah = <NovaZbierka strankaId={strankaId} pozicia={poz} tier={tier} nazov={nazov} inicialy={inicialy} mobil={!desktop} tablet={tablet} stit={stit}
    onMojeZbierky={() => { hist.current = []; setSub("g_zbierky"); }} onUcet={() => otvor("n:ucty")}
    onQr={typ === "charita" ? (id) => { const z = zbierkyStrankyZPamate(strankaId).find((x) => x.id === id); if (!z) { hist.current = []; setSub("g_zbierky"); return; } hist.current = ["g_zbierky"]; setSpravZb(naSpravu(naRiadok(z))); setZbTab(5); setSub("x:Správa zbierky"); } : undefined} />;
  // OPRAVY 473 (3): Zrušiť a opraviť — kópia spustenej zbierky v Novej zbierke; po zapečatení späť do Správy zbierky
  else if (sub === "x:Oprava zbierky" && spravZb && vlastne.some((x) => x.id === spravZb.id)) obsah = <NovaZbierka key={`oprava-${spravZb.id}`} oprava={vlastne.find((x) => x.id === spravZb.id)} strankaId={strankaId} pozicia={poz} tier={tier} nazov={nazov} inicialy={inicialy} mobil={!desktop} tablet={tablet} stit={stit}
    onMojeZbierky={spat} onUcet={() => otvor("n:ucty")}
    onOpravena={() => { const z = zbierkyStrankyZPamate(strankaId).find((x) => x.id === spravZb.id); if (z) setSpravZb(naSpravu(naRiadok(z))); hist.current = ["g_zbierky"]; setSub("x:Správa zbierky"); toast("Opravená zbierka je zapečatená ✓"); }} />;
  else if (sub === "x:Správa zbierky" && spravZb) obsah = <SpravaZbierky key={spravZb.id} tier={tier} startTab={zbTab} onTlacQr={typ === "charita" ? tlacQr : undefined} onDorovnanie={() => otvor("dorovnanie")}
    onOpravit={vlastne.some((x) => x.id === spravZb.id) ? () => otvor("x:Oprava zbierky") : undefined}
    z={{ ...spravZb, organizacia: nazov, stranka: strankaId, onObsah: vlastne.some((x) => x.id === spravZb.id) ? (o) => void upravZbierku(strankaId, spravZb.id, { sada: o.sada, eurc: o.eurc, sadaE: o.sadaE }) : undefined }} mobil={!wide} toast={toast} onZbierky={() => { hist.current = []; setSub("g_zbierky"); }} onUdaje={() => otvor("n:udaje")} />;
  // OPRAVY 411: charita · Kalendár (dlaždica na telefóne aj ikona v hlavičke) — plní sa sám, ťuk otvorí správu položky
  else if ((sub === "kalendar" || sub === "x:Kalendár") && typ === "charita") obsah = <KalendarCharity strankaId={strankaId} mobil={!desktop}
    onAkcia={(id) => otvor("oznamy", undefined, id)} onBrigady={() => otvor("dobrovolnici")} onPonuky={() => otvor("inzeraty")}
    onZbierka={(z) => { setSpravZb(naSpravu(naRiadok(z))); otvor("x:Správa zbierky"); }} />;
  else if (sub.startsWith("x:")) obsah = <Pripravujeme />;
  // KARTA 40: Oznamy — v Zadarmo výzva na súrnu pomoc a dva zamknuté druhy (nie „Pripravujeme" ani zámok celej položky)
  else if (sub === "oznamy" && typPovoli("oznamy", typ)) obsah = <OznamySprava strankaId={strankaId} tier={tier} nazov={nazov} inicialy={inicialy} mesto={typ === "charita" ? mestoCh : SUBJEKTY[poz]?.lok ?? "Trenčín"} logo={profil?.logo ?? null} mobil={!desktop} tablet={tablet} toast={toast} onProfil={() => otvor("x:Verejný profil")} start={oznamStart} upravitId={oznamUprav} />;
  // Obsah → Skutky: zoznam skutkov charity + Pridať skutok (ten istý ako v Nástrojoch)
  else if (sub === "skutky" && typPovoli("skutky", typ) && maPovolenie("skutky", tier)) obsah = <SkutkyCharity strankaId={strankaId} mobil={!desktop} onPridat={() => otvor("pridatSkutok")} />;
  // KARTA 49: Dorovnanie daru (pohľad charity)
  else if (sub === "dorovnanie" && typPovoli("dorovnanie", typ) && maPovolenie("dorovnanie", tier)) obsah = <SpravaDorovnania nadpis={false} entita={poz} hlavnyUcet={nacitajIbanOrg(poz)} mobil={!wide} toast={toast} onZbierky={() => { hist.current = []; setSub("g_zbierky"); }} onOznamy={() => otvor("oznamy")}
    testCiele={{ strecha: naSpravu(ZB_LIST[0]).id, vozik: naSpravu(ZB_LIST[1]).id, ovocie: naSpravu(ZB_LIST[2]).id, skolske: naSpravu(ZB_LIST[3]).id, seniori: `${strankaId}-sek-seniori`, deti: `${strankaId}-sek-deti` }} />;
  // KARTA 39 · bod 3: centrálna zbierka (od P1)
  // OPRAVY 405: charita · Darcovia a sumy + Sledujúci (ako Viera), Zadarmo
  else if (sub === "darcovia" && typ === "charita") obsah = <DarcoviaCharity strankaId={strankaId} mobil={!desktop} />;
  else if (sub === "sledujuci" && typ === "charita") obsah = <SledujuciCharity strankaId={strankaId} mobil={!desktop} />;
  // OPRAVY 420: charita · Obsah → Iskry = zoznam Iskier + Pridať Iskru
  else if (sub === "video" && typ === "charita") obsah = maPovolenie("video", tier) ? <IskryCharity strankaId={strankaId} nazov={nazov} mobil={!desktop} /> : <Zamknute program={odProgramu("video")} />;
  // OPRAVY 407: charita · Akcie a podujatia (od P2) = akcie z Oznamov
  else if (sub === "podujatia" && typ === "charita") obsah = maPovolenie("podujatia", tier) ? <div style={{ maxWidth: 1100 }}><AkcieCharity strankaId={strankaId} mobil={!desktop} tablet={tablet} toast={toast} onPridat={() => otvor("oznamy", "verejny")} onUpravit={(id) => otvor("oznamy", undefined, id)} /></div> : <Zamknute program={odProgramu("podujatia")} />;
  // OPRAVY 423: charita · Štatistiky = Štatistiky z Viery (Zadarmo)
  else if (sub === "statistiky" && typ === "charita") obsah = <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}><StatistikyFarnosti strankaId={strankaId} mobil={!desktop} charita /></div>;
  // OPRAVY 412: charita · Štít dôvery na web (od P1)
  else if (sub === "embed" && typ === "charita") obsah = maPovolenie("embed", tier) ? <StitNaWeb strankaId={strankaId} nazov={nazov} stit={stit} mobil={!desktop} /> : <Zamknute program={odProgramu("embed")} />;
  // OPRAVY 408: charita · Pracovné ponuky (od P1) — engine Inzeraty, vzhľad Brigády
  else if (sub === "inzeraty" && typ === "charita") obsah = maPovolenie("inzeraty", tier) ? <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}><PonukyPrace strankaId={strankaId} tier={tier} mobil={!desktop} /></div> : <Zamknute program={odProgramu("inzeraty")} />;
  // OPRAVY 406: charita · Dobrovoľníctvo = Brigády z Viery (od P2)
  else if (sub === "dobrovolnici" && typ === "charita") obsah = maPovolenie("dobrovolnici", tier) ? <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}><BrigadyFarnosti strankaId={strankaId} mobil={!desktop} charita /></div> : <Zamknute program={odProgramu("dobrovolnici")} />;
  // OPRAVY 453: charita · Nástroje → QR nástroje (1 : 1 ako vo Viere), Tlačiť › zo záložky QR sem so zvýraznenou zbierkou
  else if (sub === "qr" && typ === "charita") obsah = <>
    {qrZ && <button type="button" onClick={() => { setZbTab(5); spat(); }} style={{ alignSelf: "flex-start", flex: "none", minHeight: 44, padding: 0, border: "none", background: "transparent", color: "var(--green)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>‹ Späť na zbierku</button>}
    {neverejnaS ? <section style={{ ...karta, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 18 }}>QR plagát</b>
      <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Bude k dispozícii po zverejnení stránky. Ľudia by inak naskenovali stránku, ktorá sa ešte pripravuje.</span>
      <button type="button" disabled aria-disabled="true" style={{ alignSelf: "flex-start", minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1.5px dashed var(--cardBd)", background: "transparent", color: "var(--ink3)", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>Stiahnuť QR plagát · po zverejnení</button>
    </section> : <QrNastroje strankaId={strankaId} meno={nazov} mobil={!desktop} zvyraznit={qrZ} charita />}
  </>;
  else if (sub === "centralna" && typPovoli("centralna", typ) && maPovolenie("centralna", tier)) obsah = <SpravaCentralnej key={zbTab === 5 ? "qr" : "z"} startQr={zbTab === 5} onTlacQr={typ === "charita" ? tlacQr : undefined} strankaId={strankaId} nazov={nazov} hlavnyUcet={nacitajIbanOrg(poz)} tier={tier} mobil={!wide} toast={toast} onZbierky={() => { hist.current = []; setSub("g_zbierky"); }} onDorovnanie={() => otvor("dorovnanie")} onDarcovia={() => otvor("darcovia")} />;
  // OPRAVY 486: materiálna zbierka charity = vecná zbierka z Viery (od P1)
  else if (sub === "materialne" && typ === "charita" && maPovolenie("materialne", tier)) obsah = <MaterialneCharita key={materialnaNova ? "nova" : "zoznam"} strankaId={strankaId} meno={nazov} mobil={!desktop} nova={materialnaNova} onTlacQr={tlacQr} />;
  else obsah = !typPovoli(sub as PolozkaSpravy, typ) ? <Pripravujeme /> : maPovolenie(sub as PolozkaSpravy, tier) ? <Pripravujeme /> : <Zamknute program={odProgramu(sub as PolozkaSpravy)} />;
  // OPRAVY 404: pracovník charity vidí len zapnuté časti, zvyšok je zamknutý
  { const treba = typ === "charita" ? pravoPreSub(sub) : null; if (treba && !smie(mojePrava, treba)) obsah = <NematePovolene />; }

  const podNast = sub !== null && (sub as string).startsWith("n:"); // obrazovka Nastavení — otvoriť sa dá aj zo sekcie (Ľudia → Štatutár a pracovníci)
  const vlastnaSkupina: string | null = sub === null || podNast ? null : sub === "nast" ? "nast" : sub === "penazenka" || (sub as string).startsWith("g_") ? sub : (sub as string).startsWith("x:") || sub === "profil" || sub === "vsetko" ? null : SKUPINA_POLOZKY(sub as PolozkaSpravy, typ);
  // OPRAVY 495: podstránka (napr. Ľudia → Štatutár a pracovníci) nechá zvýraznenú sekciu, z ktorej sa otvorila
  const zPoslednej = sub !== null && sub !== "profil" && sub !== "vsetko";
  if (vlastnaSkupina !== null && vlastnaSkupina !== poslSkupina) setPoslSkupina(vlastnaSkupina);
  else if (sub === null && poslSkupina !== null) setPoslSkupina(null);
  const aktivnaSkupina: string | null = vlastnaSkupina ?? (zPoslednej ? poslSkupina : null) ?? (podNast ? "nast" : null);

  // OPRAVY 147: jeden testovací prepínač (PrepinacPodania) — PC v hlavičke, mobil a tablet sivý pás úplne dole
  const dev = TESTOVACIA && FLAGS.dev_tier_switcher && (
    // OPRAVY 397: bez Vzhľad (je v Nastaveniach), Pozrieť profil (Verejný profil v menu) a Profil: Vyplnený · Prázdny (charita je vždy od nuly)
    <PrepinacPodania pas={!desktop} sektor={typ} style={desktop ? { padding: "2px 2px 4px" } : { marginTop: 14 }} bezProfilu
      dalsie={typ === "charita" ? undefined : <>
        <TestVolba pas={!desktop} nazov="Typ" volby={TYPY_STRANOK.filter((t) => !TYP_SKRYTY[t]).map((t) => [t, TYP_NAZOV[t]] as [TypStranky, string])} hodnota={typ} onVolba={setTyp} />
        <TestVolba pas={!desktop} nazov="Rola" volby={[["hlavny", "Hlavný správca"], ["spravca", "Správca"], ["pomocnik", "Pomocník"], ["organizator", "Organizátor"]] as [RolaStranky, string][]} hodnota={rola} onVolba={(r) => zmenTestStav({ rola: r })} />
      </>}>
      <DevSprava pas={!desktop} tier={tier} stit={stit} charita={typ === "charita"}
        onTier={setTier}
        onStit={(s) => { setStit(s); ulozStitCharity(s); }} />
    </PrepinacPodania>
  );
  const zoomEl = <>{zoom && <StitZoom stit={stit} sada={sada} onClose={() => setZoom(false)} />}
    {limitOkno && createPortal(<div className="sprava-charity" data-stit={stit} onClick={() => setLimitOkno(false)} style={{ position: "fixed", inset: 0, zIndex: 160, background: "rgba(29,33,27,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Jedna zbierka naraz" style={{ width: 480, maxWidth: "100%", boxSizing: "border-box", padding: "24px 26px", borderRadius: 22, background: "var(--bg)", border: "1px solid var(--cardBd)", boxShadow: "0 30px 70px rgba(0,0,0,.3)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 21, fontWeight: 800, color: "var(--ink)" }}>V programe Zadarmo beží jedna zbierka naraz</span><span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Centrálna alebo zbierka pre niekoho. Ďalšiu zbierku spustíte s vyšším programom.</span></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button onClick={() => setLimitOkno(false)} style={{ height: 48, padding: "0 20px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)" }}>Zavrieť</button>
          <button onClick={() => { setLimitOkno(false); otvor("n:program"); }} style={{ height: 48, padding: "0 22px", border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff" }}>Porovnať programy</button>
        </div>
      </div>
    </div>, document.body)}
    {verejnyTest && <VerejnyProfilVSprave kluc={strankaId} onZavri={() => setVerejnyTest(false)} />}
    {atelierCh && <AtelierCharity strankaId={strankaId} onZavri={() => setAtelierCh(false)} />}
    {oknoZv && <OknoZverejnit strankaId={strankaId} farnost={false} onZavri={() => setOknoZv(false)} polozky={[
      { t: "Názov", ok: !!nazov.trim(), onDoplnit: () => otvor("profil") },
      { t: "Titulná fotka", ok: !!profil?.cover?.src, onDoplnit: () => otvor("profil") },
      { t: "O nás", ok: !!cistyText(profil?.onas ?? "").trim(), onDoplnit: () => otvor("profil") },
    ]} />}
    {verejny && <VerejnyProfilOkno pozicia={poz} sektor={typ} tier={tier} strankaId={strankaId} stit={stit} mobil={!desktop} onZavri={() => setVerejny(false)}
      lista={<><span style={{ flex: !desktop ? "1 1 100%" : 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>Takto vidí váš profil každý návštevník</span>
        <button type="button" onClick={() => setVerejny(false)} style={{ height: 42, padding: "0 16px", border: "none", borderRadius: 13, background: "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>Zavrieť</button>
        <button type="button" onClick={() => { setVerejny(false); otvor("profil"); }} style={{ height: 42, padding: "0 16px", border: "none", borderRadius: 13, background: "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>Upraviť profil</button></>} />}</>;

  // 0158: štítok PILOT / TESTOVACIA len správcovi, len na Prehľade (verejný profil nič)
  const rezim = useRezimStranky(strankaId);
  const stitokRezimu = sub === null && rezim ? <StitokRezimu rezim={rezim} /> : null;
  const hlavicka = <Hlavicka titul={sub === "vsetko" ? <>Všetko, čo <DeedZnacka /> vie</> : titulok(sub, typ)} onSpat={spat} spatT={sub === null ? "Domov" : "Späť"} otvor={otvor} mobil={!desktop} glowNova={glowZb} telefon={telefon} onPridat={() => setPridat(true)} bezNovej={sub === "skutky" || sub === "darcovia"} />;

  if (desktop) return (
    <div ref={korenRef} className="sprava-charity" data-stit={stit} style={{ minHeight: "100dvh", boxSizing: "border-box", padding: "20px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>
      <aside style={{ width: 244, flex: "none", display: "flex", flexDirection: "column", gap: 12, paddingRight: 16, borderRight: "2px solid", borderImage: "var(--metal) 1", position: "sticky", top: 20, alignSelf: "flex-start" }}>
        <KartaCharity nazov={nazov} inicialy={inicialy} typ={typ} otvor={otvor} uplnost={uplnost} profil={profil} glow={glowUp} />
        {/* OPRAVY 399: Verejný profil a Nastavenia ako vo Viere — farby nezávislé od štítu */}
        <button type="button" data-stit="silver" onClick={() => otvor("x:Verejný profil")} style={{ flex: "none", height: 56, padding: "0 14px", borderRadius: 18, background: "var(--tBg)", border: "1px solid var(--tBd)", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
          <Ik d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" c="var(--tInk)" />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 800, color: "var(--tInk)" }}>Verejný profil</span><span style={{ fontSize: 12, color: "var(--tInk2)" }}>ako ho vidia darcovia</span></span>
          <span aria-hidden="true" style={{ fontSize: 18, color: "var(--tInk)" }}>›</span>
        </button>
        <TlacidloNastavenia modre on={aktivnaSkupina === "nast"} onClick={() => otvor("nast")} />
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
      </aside>
      {/* OPRAVY 93: obsah max 1600 px, na širšom monitore vycentrovaný (panel ostáva vľavo) */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <main style={{ maxWidth: 1600, margin: "0 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {hlavicka}
        {dev}
        {stitokRezimu}
        <ListaNeverejna strankaId={strankaId} mobil={false} onZverejnit={() => setOknoZv(true)} />
        {sub === null && <KartyZverejnenia strankaId={strankaId} farnost={false} onQrPlagat={() => otvor("qr")} />}
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
        {stitokRezimu}
        <ListaNeverejna strankaId={strankaId} mobil onZverejnit={() => setOknoZv(true)} />
        {sub === null && <KartyZverejnenia strankaId={strankaId} farnost={false} onQrPlagat={() => otvor("qr")} />}
        {/* OPRAVY 115: tablet — karta charity sa natiahne, štít vpravo rovno s Číslami, medzera 16 (mobil 10) */}
        {sub === null && !telefon && <div style={{ display: "flex", gap: tablet ? 16 : 10, alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0 }}><KartaCharity nazov={nazov} inicialy={inicialy} typ={typ} otvor={otvor} mobil tablet={tablet} uplnost={uplnost} profil={profil} glow={glowUp} /></div>
          <KartaStitu stit={stit} sada={sada} onZoom={() => setZoom(true)} mobil={!tablet} />{/* OPRAVY 102: tablet má štít ako PC (230 px, štít vľavo) */}
        </div>}
        {obsah}
        {sub === null && !telefon && <MenuDlazdice vsetko={tier < 4} otvor={otvor} nav={navZobr} tablet={tablet} zbal={zbal} prepniZbal={prepniZbal} glowZb={glowZb} />}
        {sub === null && telefon && tier < 4 && <KartaVsetko onClick={() => otvor("vsetko")} />}
        {dev}
      </div>
      {zoomEl}
      {pridat && <HarokPridat stit={stit} tier={tier} typ={typ} onClose={() => setPridat(false)}
        onVolba={(k) => { setPridat(false); if (k === "zbierka") otvor("x:Nová zbierka"); else if (k === "skutok") otvor("pridatSkutok"); else if (k === "iskra") otvorPridatIskru(strankaId); else otvor("oznamy", tier < 1 ? "vyzva" : undefined); }} />}
    </div>
  );
}

// ============================================================
// HLAVIČKA — na každej obrazovke
// ============================================================
function Hlavicka({ titul, onSpat, spatT = "Späť", otvor, mobil, glowNova, telefon, onPridat, bezNovej }: { /** OPRAVY 439 doplnok: na obrazovke Skutky len „Pridať skutok“ */ bezNovej?: boolean; titul: React.ReactNode; onSpat: () => void; /** OPRAVY 185: z Prehľadu vedie na Domov */ spatT?: string; otvor: (s: Sub) => void; mobil: boolean; glowNova?: boolean; telefon?: boolean; onPridat?: () => void }) {
  const nzSh = glowNova ? "0 0 0 3px var(--bg), 0 0 0 5px var(--green), 0 0 20px rgba(78,125,55,.6)" : "none"; // OPRAVY 109
  const spatEl = (
    <button onClick={onSpat} className="sc-bdh" style={{ flex: "none", height: 44, padding: "0 14px 0 8px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>
      <Ik d={IK.sipkaL} w={2.4} />{spatT}
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
      {/* KARTA 42: telefón — Nastavenia (koliesko) namiesto kalendára, + otvorí hárok Pridať */}
      {telefon
        ? <button onClick={() => otvor("nast")} aria-label="Nastavenia" title="Nastavenia" className="sc-bdh" style={{ flex: "none", width: 44, height: 44, borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--btn)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.nast} /></button>
        : kalEl}
      {(telefon || !bezNovej) && <button onClick={telefon ? onPridat : () => otvor("x:Nová zbierka")} aria-label={telefon ? "Pridať" : "Nová zbierka"} style={{ flex: "none", width: 44, height: 44, border: "none", borderRadius: 13, boxShadow: nzSh, background: "#4B7A35", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d="M12 5v14M5 12h14" s={20} c="#fff" w={2.6} /></button>}
    </header>);
  return (
    <header style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat" }}>
      {spatEl}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titul}</h1>{datum}
      </span>
      {kalEl}
      {!bezNovej && <button onClick={() => otvor("x:Nová zbierka")} style={{ ...zeleneTl, boxShadow: nzSh, background: "#4B7A35", display: "flex", alignItems: "center", gap: 8 }}><Ik d="M12 5v14M5 12h14" s={17} c="currentColor" w={2.6} />Nová zbierka</button>}
    </header>);
}

/** 0158: testovacia verzia — čo sa so stránkou stane po skončení testu */
function StitokRezimu({ rezim }: { rezim: RezimStranky }) {
  const pilot = rezim === "pilot";
  return (
    <div role="note" style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", padding: "10px 14px", borderRadius: 14,
      background: pilot ? "var(--gSoft)" : "var(--goldBg)", border: `1.5px solid ${pilot ? "var(--gBd)" : "var(--goldBd)"}` }}>
      <b style={{ flex: "none", fontSize: 12.5, letterSpacing: ".08em", color: pilot ? "var(--gInk)" : "var(--gold)" }}>{pilot ? "PILOT" : "TESTOVACIA"}</b>
      <span style={{ flex: "1 1 220px", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>
        {pilot ? "Po teste ostane vzhľad stránky, profil, texty, fotky, nástenka a príspevky. Zbierky, platby a reťaze sa zmažú." : "Po skončení testu sa stránka zmaže celá."}</span>
    </div>);
}

// ============================================================
// PANEL — karta charity, Nastavenia
// ============================================================
/** OPRAVY 113: logo v karte charity z uloženého profilu (tvar + pozadie), inak iniciály */
/** OPRAVY 109/113: Upraviť svieti len pred krokom 1 úvodu, inak sivé */
const upravitTl = (glow: boolean): React.CSSProperties => glow
  ? { background: "var(--green)", color: "#fff", boxShadow: "0 0 0 3px var(--green), 0 0 18px rgba(78,125,55,.55)" }
  : { background: "var(--btn)", color: "var(--ink)", boxShadow: "none" };

/** OPRAVY 414 (1): prázdny profil (0 %) — Vytvoriť profil, nie Dokončiť */
const PRAZDNY_PROFIL = "Pridajte logo, titulnú fotku, pár viet o vás a kontakt.";
// OPRAVY 399: karta charity = ako karta profilu vo Viere (SpravaFarnosti kartaProfilu), pozadie a rám ostávajú bronzové (štít).
// Hotový profil: logo · názov · „Upraviť profil ›", celá karta je jeden ťuk. Nehotový: percento, pás, čo chýba, Dokončiť profil. Bez zbaľovania.
function KartaCharity({ nazov, inicialy, otvor, mobil, tablet, uplnost, profil, glow }: { nazov: string; inicialy: string; typ: TypStranky; otvor: (s: Sub) => void; mobil?: boolean; tablet?: boolean; uplnost: { pct: number; chyba: string }; profil: ProfilStranky | null; glow: boolean }) {
  const m = !!(mobil || tablet), ls = m ? 56 : 44, fs = m ? 17 : 14.5;
  const ram: React.CSSProperties = { flex: "none", boxSizing: "border-box", width: "100%", height: m ? "100%" : undefined, borderRadius: m ? 20 : 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)", padding: m ? "14px 16px" : 12 };
  const hlava = (sub2: React.ReactNode) => <>
    <LogoKarty profil={profil} inicialy={inicialy} size={ls} />
    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: fs, lineHeight: 1.25, color: "var(--ink)", overflowWrap: "anywhere" }}>{nazov}</b>{sub2}</span>
  </>;
  if (uplnost.pct >= 100) return (
    <button type="button" onClick={() => otvor("profil")} style={{ ...ram, display: "flex", alignItems: "center", gap: m ? 14 : 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
      {hlava(<span style={{ fontSize: m ? 14.5 : 13, fontWeight: 800, color: "var(--cuInk)" }}>Upraviť profil ›</span>)}
    </button>);
  return (
    <div style={{ ...ram, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: m ? 14 : 10 }}>{hlava(<span style={{ fontSize: m ? 14 : 12.5, color: "var(--cuInk2)" }}>Profil · {uplnost.pct} %</span>)}</div>
      <Pruh sc={uplnost.pct / 100} h={6} bg="rgba(168,116,80,.25)" />
      {uplnost.chyba && <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--cuInk)" }}>{uplnost.pct === 0 ? PRAZDNY_PROFIL : uplnost.chyba}</span>}
      <button type="button" onClick={() => otvor("profil")} style={{ minHeight: 44, border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, ...(glow ? upravitTl(true) : { background: "#4B7A35", color: "#fff", boxShadow: "none" }) }}>{uplnost.pct === 0 ? "Vytvoriť profil" : "Dokončiť profil"}</button>
    </div>);
}

// ============================================================
// OPRAVY 119 · Všetko, čo DEED+ vie — karta v menu a obrazovka na pozretie (aj P3 a P4, nič sa nezapína)
// ============================================================
function KartaVsetko({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="sc-vsetko" style={{ flex: 1, width: "100%", padding: "14px 16px", borderRadius: 16, border: "1.5px solid var(--gBd)", background: "var(--gSoft)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>Všetko, čo <DeedZnacka /> vie</span>
      <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>Pozrite si všetky nástroje až po P3 a čo by vám pomohlo.</span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>Pozrieť ›</span>
    </button>);
}
const MOJE_ZBIERKY: Karta = P(IK.zbierky, "Moje zbierky", "Zbierka pre konkrétneho človeka alebo rodinu", "zbierky");
function ObrVsetko({ typ, tier, otvor, stlpce }: { typ: TypStranky; tier: Tier; otvor: (s: Sub) => void; stlpce: 1 | 2 }) {
  const skupiny: [string, Karta[]][] = ([["Zbierky", [MOJE_ZBIERKY, ...DRUHY]], ["Obsah", G.g_obsah], ["Ľudia", G.g_ludia], ["Nástroje a výkazy", G.g_nastroje]] as [string, Karta[]][])
    .map(([t, k]): [string, Karta[]] => [t, k.filter((x) => typPovoli(x.id, typ))]).filter(([, k]) => k.length > 0);
  return (<>
    <span style={{ flex: "none", fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", maxWidth: 760 }}>Všetky nástroje DEED+ pre charity, od programu Zadarmo po P4. Je to len na pozretie, nič sa tu nezapína. Program zmeníte v Program a predplatné.</span>
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
      <button onClick={() => otvor("n:program")} style={{ height: 48, padding: "0 22px", border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff" }}>Program a predplatné</button>
    </div>
  </>);
}

/** mobil: menu ako 6 dlaždíc + Nastavenia */
function MenuDlazdice({ vsetko, otvor, nav, tablet, zbal, prepniZbal, glowZb }: { vsetko: boolean; otvor: (s: Sub) => void; nav: Menu["nav"]; tablet: boolean; zbal: Zbalenie; prepniZbal: (id: string) => void; glowZb?: boolean }) {
  const dl: { k: Sub; t: string; d?: string; n?: number; teal?: boolean }[] = [
    { k: "x:Verejný profil", t: "Verejný profil", teal: true },
    ...nav.map((n) => ({ k: n.k as Sub, t: n.t, d: n.d, n: n.n })),
  ];
  return (<Sekcia id="menu" nazov="Správa stránky" suhrn={pocet(dl.length, ["položka", "položky", "položiek"])} zbal={zbal} prepni={prepniZbal}>
    <TlacidloNastavenia modre on={false} onClick={() => otvor("nast")} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {dl.map((x) => (
        <button key={String(x.k)} onClick={() => otvor(x.k)} style={{ position: "relative", boxShadow: glowZb && x.k === "g_zbierky" ? "0 0 0 3px var(--green), 0 0 18px rgba(78,125,55,.55)" : "none", minHeight: tablet ? 72 : 84, padding: "10px 6px", borderRadius: 16, background: x.teal ? "var(--tBg)" : "var(--card)", border: `1px solid ${x.teal ? "var(--tBd)" : "var(--cardBd)"}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13.5, fontWeight: 800, color: x.teal ? "var(--tInk)" : "var(--ink)", lineHeight: 1.25, textAlign: "center" }}>
          {x.teal ? <OkoIk /> : <Ik d={x.d!} />}{x.t}
          {x.n ? <span style={{ position: "absolute", top: 6, right: 6, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 11, background: "#4B7A35", color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{x.n}</span> : null}
        </button>))}
      {vsetko && <div style={{ gridColumn: "1 / -1", display: "flex" }}><KartaVsetko onClick={() => otvor("vsetko")} /></div>}{/* OPRAVY 119: posledná dlaždica, celá šírka */}
    </div>
  </Sekcia>);
}

// ============================================================
// KARTA 42 · Správa charity — TELEFÓN (pod 760 px). Prototyp „Sprava charity mobil v3". PC a tablet bez zmeny.
// ============================================================
/** hárok zdola (telefón) — tokeny správy podľa štítu */
function SpodnyHarok({ stit, nadpis, onClose, children, bezHlavicky }: { stit: StitCharity; nadpis: React.ReactNode; onClose: () => void; children: React.ReactNode; /** obsah má vlastnú hlavičku so zatvorením (graf) */ bezHlavicky?: boolean }) {
  const [otv, setOtv] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setOtv(true)); return () => cancelAnimationFrame(r); }, []);
  const zavri = () => { setOtv(false); window.setTimeout(onClose, 230); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  return createPortal(
    <div className="sprava-charity" data-stit={stit} role="dialog" aria-modal="true" aria-label={typeof nadpis === "string" ? nadpis : undefined} style={{ position: "fixed", inset: 0, zIndex: 150, background: "transparent" }}>
      <div onClick={zavri} style={{ position: "absolute", inset: 0, background: "rgba(20,17,11,.45)", opacity: otv ? 1 : 0, transition: "opacity .2s ease" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%", overflowY: "auto", overscrollBehavior: "contain", borderRadius: "24px 24px 0 0", background: "var(--panel)", padding: "10px 14px max(24px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 8, transform: otv ? "translateY(0)" : "translateY(105%)", transition: "transform .26s ease" }}>
        <span aria-hidden="true" style={{ flex: "none", alignSelf: "center", width: 40, height: 5, borderRadius: 3, background: "var(--fieldBd)" }} />
        {!bezHlavicky && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <b style={{ flex: 1, fontSize: 17, padding: "4px 2px" }}>{nadpis}</b>
          <button onClick={zavri} aria-label="Zavrieť" style={{ flex: "none", width: 44, height: 44, borderRadius: "50%", border: "none", background: "var(--btn)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d="M6 6l12 12M18 6L6 18" s={16} c="var(--ink)" w={2.4} /></button>
        </div>}
        {children}
      </div>
    </div>, document.body);
}

/** + → Pridať: Nová zbierka · Skutok · Iskra · Oznam (štítok podľa programu) */
const PRIDAT_VOLBY: { k: "zbierka" | "skutok" | "iskra" | "oznam"; t: string; s: string; /** text v Zadarmo (položka sa otvorí, štítok „od Px" sa neukáže) */ sZadarmo?: string; d: string; id: PolozkaSpravy }[] = [
  { k: "zbierka", t: "Nová zbierka", s: "Krátkodobá 30 dní alebo dlhodobá", d: IK.zbierky, id: "zbierky" },
  { k: "skutok", t: "Skutok", s: "Takto sme pomohli · aj s dobrovoľníkmi", d: "M12 3l2.5 5.5L20 9l-4.5 4 1.5 6-5-3-5 3 1.5-6L4 9l5.5-.5z", id: "pridatSkutok" },
  { k: "iskra", t: "Iskra", s: "Video do 45 s", d: "M4 6h16v12H4zM10 9l5 3-5 3z", id: "video" },
  { k: "oznam", t: "Oznam", s: "Krátka správa pre sledujúcich", sZadarmo: "Len výzva na súrnu pomoc", d: "M4 10v4h3l6 4V6L7 10z", id: "oznamy" },
];
function HarokPridat({ stit, tier, typ, onClose, onVolba }: { stit: StitCharity; tier: Tier; typ: TypStranky; onClose: () => void; onVolba: (k: (typeof PRIDAT_VOLBY)[number]["k"]) => void }) {
  return (
    <SpodnyHarok stit={stit} nadpis="Pridať" onClose={onClose}>
      {PRIDAT_VOLBY.filter((v) => typPovoli(v.id, typ) && vidnoPolozku(v.id, tier)).map((v) => {
        // Oznam v Zadarmo: bez štítku „od P1" — otvorí sa rovno výzva na súrnu pomoc (karta 40), inak by štítok protirečil
        const zamok = !maPovolenie(v.id, tier) && !v.sZadarmo;
        const popis = v.sZadarmo && !maPovolenie(v.id, tier) ? v.sZadarmo : v.s;
        return (
          <button key={v.k} onClick={() => onVolba(v.k)} style={{ flex: "none", minHeight: 60, padding: "8px 12px", borderRadius: 15, border: "1px solid var(--cardBd)", background: "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
            <span style={{ width: 40, height: 40, flex: "none", borderRadius: 11, background: zamok ? "var(--btn)" : "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={v.d} c={zamok ? "var(--acc)" : "var(--gInk)"} /></span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><b style={{ fontSize: 15, color: "var(--ink)" }}>{v.t}</b>
                {zamok && <span style={{ height: 20, padding: "0 7px", borderRadius: 10, border: "1px solid var(--cardBd)", fontSize: 11, fontWeight: 800, color: "var(--ink3)", display: "flex", alignItems: "center" }}>od {odProgramu(v.id)}</span>}</span>
              <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{popis}</span>
            </span>
          </button>); })}
    </SpodnyHarok>);
}

/** karta charity v jednom riadku: logo 44 · meno · štít 42 × 52 (odlesk).
 *  OPRAVY 399 (ako Viera): hotový profil = „Upraviť profil ›", celá karta jeden ťuk; nehotový = percento, pás, čo chýba, Dokončiť profil. */
function KartaRiadok({ nazov, inicialy, profil, pct, chyba, stit, sada, glow, onClick }: { nazov: string; inicialy: string; profil: ProfilStranky | null; pct: number; chyba: string; stit: StitCharity; sada: StitSada; glow: boolean; onClick: () => void }) {
  const [, , en] = STITY[stit];
  const hotovy = pct >= 100;
  const vnutro = <>
    <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
      <LogoKarty profil={profil} inicialy={inicialy} size={44} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <b style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nazov}</b>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cuInk2)" }}>{hotovy ? "Upraviť profil ›" : `Profil · ${pct} %`}</span>
        {!hotovy && <Pruh sc={pct / 100} h={6} bg="rgba(168,116,80,.25)" />}
      </span>
      <img src={stitImg(stit, true, sada)} alt={`Štít DEED+ ${SADA_NAZOV[sada]} ${en}`} width={42} height={52} style={{ flex: "none", objectFit: "contain", filter: "drop-shadow(0 3px 5px rgba(90,50,20,.3))" }} />
    </span>
    <span key={stit} className="sc-lesk" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit", background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,.6) 50%,transparent 65%)", transform: "translateX(-130%)", animation: "leskStit 1.6s ease-in-out 1.2s 1 both" }} />
  </>;
  const st: React.CSSProperties = { flex: "none", position: "relative", overflow: "hidden", minHeight: 64, borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: glow ? "0 0 0 3px var(--green), 0 0 18px rgba(78,125,55,.55)" : "inset 0 1px 0 rgba(255,255,255,.45)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
  if (hotovy) return <button onClick={onClick} aria-label={`${nazov} · Upraviť profil`} style={{ ...st, boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)", flexDirection: "column", alignItems: "stretch" }}>{vnutro}</button>;
  return (
    <div style={{ ...st, boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)", cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      {vnutro}
      {chyba && <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--cuInk)" }}>{pct === 0 ? PRAZDNY_PROFIL : chyba}</span>}
      <button type="button" onClick={onClick} style={{ position: "relative", minHeight: 44, border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, ...(glow ? upravitTl(true) : { background: "#4B7A35", color: "#fff", boxShadow: "none" }) }}>{pct === 0 ? "Vytvoriť profil" : "Dokončiť profil"}</button>
    </div>);
}

/** 6 dlaždíc správy 3 × 2 (výška 76, ikona 22, text 12,5/800, medzera 8) — bez nadpisu, nezbaľuje sa */
function DlazdiceSpravy({ otvor, nav, glowZb }: { otvor: (s: Sub) => void; nav: Menu["nav"]; glowZb?: boolean }) {
  const dl: { k: Sub; t: string; d?: string; n?: number; teal?: boolean }[] = [{ k: "x:Verejný profil", t: "Verejný profil", teal: true }, ...nav.map((n) => ({ k: n.k as Sub, t: n.t, d: n.d, n: n.n }))];
  return (
    <div style={{ flex: "none", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {dl.map((x) => (
        <button key={String(x.k)} onClick={() => otvor(x.k)} aria-label={x.n ? `${x.t}, ${x.n} čaká na potvrdenie` : x.t} style={{ position: "relative", minHeight: 76, padding: "8px 4px", borderRadius: 16, background: x.teal ? "var(--tBg)" : "var(--card)", border: `1px solid ${x.teal ? "var(--tBd)" : "var(--cardBd)"}`, boxShadow: glowZb && x.k === "g_zbierky" ? "0 0 0 3px var(--green), 0 0 18px rgba(78,125,55,.55)" : "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
          {x.teal ? <Ik d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" s={22} c="var(--tInk)" /> : <Ik d={x.d!} s={22} />}
          <span style={{ fontSize: 12.5, lineHeight: 1.2, fontWeight: 800, textAlign: "center", color: x.teal ? "var(--tInk)" : "var(--ink)" }}>{x.t}</span>
          {x.n ? <span style={{ position: "absolute", top: 6, right: 6, minWidth: 20, height: 20, padding: "0 5px", borderRadius: 10, background: "#4B7A35", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{x.n}</span> : null}
        </button>))}
    </div>);
}

/** Pripnuté — jeden riadok čipov, posúva sa do strany (flex: none), štítok vľavo, úprava na konci */
function PinyTelefon({ polozky, otvor, onUpravit, upravitOtv }: { polozky: PinV[]; otvor: (id: PolozkaSpravy) => void; onUpravit: () => void; upravitOtv: boolean }) {
  return (
    <div className="sc-lista" style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, overflowX: "auto", margin: "0 -14px", padding: "0 14px" }}>
      <span style={{ flex: "none", fontSize: 11.5, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)", paddingRight: 2 }}>PRIPNUTÉ</span>
      {polozky.map((v) => (
        <button key={v.id} onClick={() => otvor(v.id)} style={{ flex: "none", height: 44, padding: "0 12px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--panel)", cursor: "pointer", whiteSpace: "nowrap", fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>{v.t}</button>))}
      <button onClick={onUpravit} aria-expanded={upravitOtv} aria-label="Upraviť pripnuté" title="Upraviť pripnuté" style={{ flex: "none", width: 44, height: 44, borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.pin} s={18} c="var(--green)" w={2.2} /></button>
    </div>);
}

/** Čísla — prepínač obdobia + len 4 (2 × 2), „Všetky čísla ›" rozbalí 8, „Graf ›" otvorí graf v hárku */
const K4 = [0, 1, 3, 6]; // Vyzbierané · Počet darov · Noví darcovia · Sledujúci (indexy v K8)
function CislaTelefon({ obd, setObd, nova, stit, realne, refs }: { obd: number; setObd: (i: number) => void; nova: boolean; stit: StitCharity; /** OPRAVY 445 (2): čísla z ledgera */ realne?: [string, string][]; /** OPRAVY 442 doplnok 3: graf zo skutočných darov */ refs?: string[] }) {
  const [vsetky, setVsetky] = useState(false);
  const [graf, setGraf] = useState(false);
  const idx = vsetky ? K8.map((_, i) => i) : K4;
  return (
    <section aria-label="Čísla" style={{ flex: "none", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div role="tablist" aria-label="Obdobie" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 2, padding: 3, borderRadius: 12, background: "var(--btn)" }}>
        {OBD.map((t, i) => { const on = i === obd; return (
          <button key={t} role="tab" aria-selected={on} onClick={() => setObd(i)} style={{ height: 44, border: "none", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13, fontWeight: 800, background: on ? "var(--green)" : "transparent", color: on ? "#fff" : "var(--ink2)", boxShadow: on ? "0 1px 3px rgba(30,28,20,.14)" : "none" }}>{t}</button>); })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: 14 }}>
        {idx.map((i, j) => { const [v, d] = realne ? realne[i] : nova ? [N8[i], ""] : D8[obd][i]; return (
          <div key={K8[i]} style={{ minWidth: 0, display: "flex", flexDirection: "column", padding: "8px 0", borderTop: j > 1 ? "1px solid var(--cardBd)" : "none" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{K8[i]}</span>
            <b style={{ fontSize: 19, lineHeight: 1.2, fontVariantNumeric: "tabular-nums", color: i === 0 ? "var(--gInk)" : i === 5 ? "var(--gold)" : "var(--ink)", whiteSpace: "nowrap" }}>{v}</b>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)", minHeight: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d}</span>
          </div>); })}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <button onClick={() => setVsetky((x) => !x)} aria-expanded={vsetky} style={{ minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "var(--green)" }}>{vsetky ? "Menej čísel ‹" : "Všetky čísla ›"}</button>
        <button onClick={() => setGraf(true)} style={{ minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "var(--green)" }}>Graf ›</button>
      </div>
      {graf && <SpodnyHarok stit={stit} nadpis="Graf darov" bezHlavicky onClose={() => setGraf(false)}><GrafDarov obd={obd} nova={nova} refs={refs} mobil onZavri={() => setGraf(false)} /></SpodnyHarok>}
    </section>);
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
    <TlZbalit onZbal={() => prepni(id)} />{/* OPRAVY 321 */}
  </>);
  return (<>
    <button onClick={() => prepni(id)} aria-expanded style={{ minHeight: 44, padding: "0 4px", border: "none", background: "transparent", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left", width: "100%", marginBottom: -6 }}>
      <span style={{ ...nadpisSekcie, padding: 0, flex: 1 }}>{nazov.toUpperCase()}</span>{sipka}
    </button>
    {children}
    <TlZbalit onZbal={() => prepni(id)} />{/* OPRAVY 321 */}
  </>);
}

// ============================================================
// PREHĽAD
// ============================================================
/** OPRAVY 326: Bežiace = len aktívne; ukončené (aj „zmazané“, bod 264) medzi bežiacimi nikdy */
const bezi = (z: SpustenaZbierka) => (z.stav ?? "aktivna") === "aktivna";
type Spolocne = { strankaId: string; entita: string; spravuj: (z: ZbierkaNaSpravu) => void; vlastne: SpustenaZbierka[]; rozpisana: NovaZbierkaData | null; uvod: boolean; krok1: boolean; pozvana: boolean; tier: Tier; piny: PolozkaSpravy[]; prepniPin: (id: PolozkaSpravy) => void; otvorPolozku: (id: PolozkaSpravy) => void; otvor: (s: Sub) => void; nova: boolean; stit: StitCharity; sada: StitSada; menu: Menu; mobil: boolean; tablet: boolean; zbal: Zbalenie; prepniZbal: (id: string, otv?: boolean) => void;
  /** OPRAVY 486 */ vyberZb?: boolean; zavriVyberZb?: () => void; novaBezna?: () => void; novaMaterialna?: () => void };

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

function Prehlad({ strankaId, tier, piny, prepniPin, otvorPolozku, otvor, nova, stit, sada, menu, mobil, tablet, zbal, prepniZbal, onZoom, uvod, krok1, pozvana, vlastne, hornaCast }: Spolocne & { onZoom: () => void; hornaCast?: React.ReactNode }) {
  const p3Do = usePozvanaDo(strankaId); // OPRAVY 398: dátum registrácie + 2 mesiace (nie napevno)
  const PHZ: PhZbierka[] = [...vlastne.filter(bezi).map(naPh), ...(nova ? [] : PH_ZBIERKY)]; // OPRAVY 114: spustené zbierky navrchu
  const VSE = menu.vse; // KARTA 36: na pripnutie len položky, ktoré typ má
  const ph = mobil && !tablet; // telefón (OPRAVY 96: tablet má časti ako PC)
  const [obd, setObd] = useState(0);
  // OPRAVY 445 (2): skutočná stránka (bez ukážok) → čísla z ledgera všetkých jej zbierok a centrálnej
  useZmenyDarov();
  const refsCisel = [...vlastne.map((z) => z.id), refCentralnej(strankaId)];
  const realne = nova ? cislaZLedgera(refsCisel, obd) : undefined;
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
        <button key={t} role="tab" aria-selected={on} onClick={() => setObd(i)} style={{ height: mobil ? 44 : 28, minWidth: mobil ? 44 : undefined, padding: ph ? "0 6px" : "0 12px", border: "none", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap", fontSize: ph ? 12.5 : 13, fontWeight: 800, background: on ? "var(--green)" : "transparent", color: on ? "#fff" : "var(--ink2)", boxShadow: on ? "0 1px 3px rgba(30,28,20,.14)" : "none" }}>{t}</button>); })}
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
          const [v, d] = realne ? realne[i] : nova ? [N8[i], ""] : D8[obd][i];
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
        {VSE.map((v) => { const on = piny.includes(v.id); const zam = !maPovolenie(v.id, tier) && v.id !== "oznamy"; return (
          <button key={v.id} role="checkbox" aria-checked={on} aria-disabled={zam || undefined} onClick={() => { if (!zam) prepniPin(v.id); }} style={{ minHeight: 46, padding: "0 10px", border: "none", borderRadius: 12, background: on ? "var(--gSoft)" : "transparent", cursor: zam ? "default" : "pointer", opacity: zam ? 0.5 : 1, display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{v.t}</span><span style={{ fontSize: 12, color: "var(--ink3)" }}>{zam ? `Pripnúť môžete od ${odProgramu(v.id)}` : v.g}</span></span>
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
          <b style={{ display: "block", fontSize: 16, color: pozvana ? "var(--gInk)" : "var(--ink)" }}>{pozvana ? `Ste medzi prvými 50. Program P3 máte zadarmo 2 mesiace od registrácie, do ${p3Do}.` : "Máte program Zadarmo."}</b>
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
    <span style={{ flex: "none", fontSize: 12.5, fontWeight: 700, color: "var(--ink2)", padding: "0 4px", marginTop: -4 }}>{ph ? "Všetko ostatné nájdete v dlaždiciach vyššie." : mobil ? "Všetko ostatné nájdete nižšie v Správe stránky." : "Všetko ostatné nájdete v menu vľavo."} Táto obrazovka zmizne po prvej zbierke.</span>
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
    <div ref={zbRef} className="sc-lista" style={ph ? { display: "flex", gap: 10, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x proximity", touchAction: "pan-x pan-y", overscrollBehaviorX: "contain", scrollPaddingLeft: 14, margin: "0 -14px", padding: "0 14px" } : tablet ? { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 } : { display: "grid", gridTemplateColumns: `repeat(${naRiadok}, minmax(0, 420px))`, gap: 14 }}>
      {PHZ.map((z) => ( // OPRAVY 103: všetky bežiace zbierky, limit určuje program (stav.ts), nie Prehľad
        <button key={z.t} onClick={() => otvor("g_zbierky")} style={{ flex: "none", width: ph ? 290 : undefined, scrollSnapAlign: "start", ...karta, borderRadius: mobil ? 18 : 22, padding: 0, overflow: "hidden", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column" }}>
          <span style={{ display: "block", width: "100%", aspectRatio: "16/9", background: z.bg }} />
          <span style={{ padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 8, width: "100%", boxSizing: "border-box" }}>
            <b style={{ fontSize: 16, color: "var(--ink)" }}>{z.t}</b>
            <Pruh sc={z.c ? z.v / z.c : 1} />
            <span style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, color: "var(--ink3)" }}><span><b style={{ color: "var(--ink)" }}>{eur(z.v)}</b>{z.c ? ` z ${eur(z.c)}` : ""}</span><span>{z.d}</span></span>
            <span style={{ alignSelf: "flex-start", height: 26, padding: "0 10px", borderRadius: 13, background: z.dn ? "var(--gSoft)" : "var(--btn)", color: z.dn ? "var(--gInk)" : "var(--ink3)", display: "flex", alignItems: "center", fontSize: 12.5, fontWeight: 800 }}>{z.dn ? `dnes +${eur(z.dn)}` : "dnes zatiaľ nič"}</span>
          </span>
        </button>))}
    </div>);
  const zbierky = PHZ.length > 0 && (mobil
    ? <Sekcia id="zbierky" nazov="Bežiace zbierky" suhrn={pocet(PHZ.length, ["zbierka", "zbierky", "zbierok"])} zbal={zbal} prepni={prepniZbal}>{zbMriezka}</Sekcia>
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

  const grafEl = graf && <GrafDarov obd={obd} nova={nova} refs={nova ? refsCisel : undefined} mobil={ph} onZavri={() => setGraf(() => false)} />;
  if (mobil) {
    // OPRAVY 95: zbaliteľné sekcie; Treba vybaviť vždy rozbalené. OPRAVY 96: tablet — Reťaz a Dorovnávané vedľa seba
    const obdTxt = ["dnes", "za 7 dní", "za 30 dní", "za rok"][obd];
    const vyz = realne ? realne[0][0] : nova ? N8[0] : D8[obd][0][0];
    const retazS = <Sekcia id="retaz" nazov="Reťaz dobra" suhrn={nova ? undefined : "640 €"} zbal={zbal} prepni={prepniZbal}>{retazEl}</Sekcia>;
    const dorS = <Sekcia id="dorovnanie" nazov="Dorovnávané zbierky" suhrn={nova ? undefined : "1 beží"} zbal={zbal} prepni={prepniZbal}>{dorEl}</Sekcia>;
    // KARTA 42 · telefón: najprv konať, potom čísla
    if (ph) {
      if (uvod) return (<>{hornaCast}{uvodPanel}{krokyEl}{pinUvod}{treba}{retazS}{dorS}</>);
      return (<>
        {hornaCast}
        <PinyTelefon polozky={pinyV} otvor={otvorPolozku} onUpravit={() => setPinOtv((o) => !o)} upravitOtv={pinOtv} />
        {pinOtv && <SpodnyHarok stit={stit} nadpis="Pripnuté" onClose={() => setPinOtv(false)}>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>Pripnite si, čo používate najčastejšie. Najviac {PIN_MAX}.</span>
          {VSE.map((v) => { const on = piny.includes(v.id); const zam = !maPovolenie(v.id, tier) && v.id !== "oznamy"; return (
            <button key={v.id} role="checkbox" aria-checked={on} aria-disabled={zam || undefined} onClick={() => { if (!zam) prepniPin(v.id); }} style={{ flex: "none", minHeight: 48, padding: "0 10px", border: "none", borderRadius: 12, background: on ? "var(--gSoft)" : "transparent", cursor: zam ? "default" : "pointer", opacity: zam ? 0.5 : 1, display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{v.t}</span><span style={{ fontSize: 12, color: "var(--ink3)" }}>{zam ? `Pripnúť môžete od ${odProgramu(v.id)}` : v.g}</span></span>
              <span style={{ width: 24, height: 24, flex: "none", borderRadius: 7, border: `1.5px solid ${on ? "var(--green)" : "#A8A396"}`, background: on ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.fajka} s={14} c="#fff" w={3} style={{ opacity: on ? 1 : 0 }} /></span>
            </button>); })}
          <button onClick={() => setPinOtv(false)} style={{ flex: "none", height: 48, marginTop: 6, border: "none", borderRadius: 13, background: "var(--green)", cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "#fff" }}>Hotovo</button>
        </SpodnyHarok>}
        <span ref={trebaRef} style={{ ...nadpisSekcie, scrollMarginTop: 80 }}>TREBA VYBAVIŤ{ulohy.length ? ` · ${ulohy.length}` : ""}</span>
        {ulohy.length === 0
          ? <section style={{ ...karta, borderRadius: 18, padding: "16px 14px", fontSize: 14.5, color: "var(--ink2)" }}>Všetko je vybavené.</section>
          : <section style={{ ...karta, borderRadius: 18, padding: "0 12px" }}>
            {ulohy.map(([dot, t, s2, b], i) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 62, padding: "9px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
                <span style={{ width: 9, height: 9, flex: "none", borderRadius: "50%", background: dot }} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14, lineHeight: 1.3 }}>{t}</b><span style={{ fontSize: 12, lineHeight: 1.35, color: "var(--ink3)" }}>{s2}</span></span>
                <button onClick={() => otvor(`x:${b}`)} style={{ ...zeleneTl, height: 44, padding: "0 13px", borderRadius: 12, fontSize: 13 }}>{b}</button>
              </div>))}
          </section>}
        <CislaTelefon obd={obd} setObd={setObd} nova={nova} stit={stit} realne={realne} refs={nova ? refsCisel : undefined} />
        {PHZ.length > 0 && <><span style={nadpisSekcie}>BEŽIACE ZBIERKY</span>{zbMriezka}</>}
        {retazS}{dorS}
      </>);
    }
    if (uvod) return (<>
      {uvodPanel}{krokyEl}{pinUvod}{treba}
      {tablet ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, alignItems: "start" }}><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{retazS}</div><div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{dorS}</div></div> : <>{retazS}{dorS}</>}
    </>);
    return (<>
      <Sekcia id="cisla" nazov="Čísla" suhrn={`Vyzbierané ${vyz} ${obdTxt}`} akcia={cislaAkcia} zbal={zbal} prepni={prepniZbal}>{cisla}</Sekcia>
      <Sekcia id="graf" nazov="Graf darov" suhrn={`${sumaEur(nova ? grafData(obd, true, refsCisel).spolu : GRAF_CIEL[obd])} ${obdTxt}`} zbal={zbal} prepni={prepniZbal}>{grafEl}</Sekcia>
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
/** OPRAVY 442 doplnok 3: skutočná stránka — dary zo skutočných darov (ledger) po hodinách / dňoch / mesiacoch; pravidelnú appka zatiaľ nerozlišuje */
function grafSkutocny(ob: number, refs: string[]): number[] {
  const n = GRAF_X[ob].length, A = Array.from({ length: n }, () => 0), d = new Date(); d.setHours(0, 0, 0, 0);
  const zac = ob === 0 ? d.getTime() : ob === 1 ? d.getTime() - ((d.getDay() + 6) % 7) * DEN_MS : ob === 2 ? d.getTime() - 29 * DEN_MS : new Date(d.getFullYear(), 0, 1).getTime();
  for (const r of refs.flatMap((x) => darcoviaPre(x))) {
    if (r.cas < zac) continue;
    const t = new Date(r.cas);
    const i = ob === 0 ? Math.min(n - 1, Math.max(0, Math.floor((t.getHours() - 8) / 2))) : ob === 3 ? t.getMonth() : Math.floor((r.cas - zac) / DEN_MS);
    if (i >= 0 && i < n) A[i] += r.suma;
  }
  return A;
}
function grafData(ob: number, nova: boolean, refs?: string[]) {
  if (nova && refs) {
    const A = grafSkutocny(ob, refs), B = A.map(() => 0);
    const mx = Math.max(4, ...A), r = mx / 4, p = Math.pow(10, Math.floor(Math.log10(r))), n = r / p;
    const krok = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
    return { A, B, krok, top: krok * 4, spolu: A.reduce((s, v) => s + v, 0) };
  }
  const A0 = GRAF_A0[ob], B0 = GRAF_B0[ob];
  const sum0 = A0.reduce((s, v) => s + v, 0) + B0.reduce((s, v) => s + v, 0), kf = GRAF_CIEL[ob] / sum0;
  const A = A0.map((v) => (nova ? 0 : Math.round(v * kf))), B = B0.map((v) => (nova ? 0 : Math.round(v * kf)));
  if (!nova) { const d = GRAF_CIEL[ob] - A.reduce((s, v) => s + v, 0) - B.reduce((s, v) => s + v, 0); A[A.indexOf(Math.max(...A))] += d; }
  const mx = Math.max(4, ...A.map((v, i) => v + B[i])); // bez darov os 0 – 4 €
  const r = mx / 4, p = Math.pow(10, Math.floor(Math.log10(r))), n = r / p;
  const krok = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  return { A, B, krok, top: krok * 4, spolu: A.reduce((s, v) => s + v, 0) + B.reduce((s, v) => s + v, 0) };
}
function GrafDarov({ obd, nova, refs, mobil, onZavri }: { obd: number; nova: boolean; refs?: string[]; mobil: boolean; onZavri: () => void }) {
  const { A, B, krok, top, spolu } = grafData(obd, nova, refs);
  const X = GRAF_X[obd], gap = obd === 2 ? 3 : mobil ? 6 : 10;
  const fmt = (v: number) => `${sumaEur(Math.round(v))}`;
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
/** OPRAVY 434: dlaždica Oznamy ukáže, čo beží („1 aktívny oznam“); keď nič, popis ako doteraz */
function PopisOznamov({ strankaId, popis }: { strankaId: string; popis: string }) {
  useZmenyOznamovCharity();
  useEffect(() => { void nacitajOznamyStranky(strankaId); }, [strankaId]);
  const n = aktivnychOznamov(strankaId);
  return <>{n > 0 ? aktivneOznamyText(n) : popis}</>;
}
/** OPRAVY 436: dlaždica Skutky — „1 zverejnený skutok“ · „3 zverejnené skutky“ · „5 zverejnených skutkov“; keď nič, popis */
function PopisSkutkov({ strankaId, popis }: { strankaId: string; popis: string }) {
  useZmenySkutkov();
  useZmenySkutkovStranky(); useEffect(() => { void nacitajSkutkyStranky(strankaId); }, [strankaId]);
  const n = skutkyOrgSpravy(strankaId).length; // OPRAVY 443 (1): ten istý počet ako na stránke
  return <>{n === 1 ? "1 zverejnený skutok" : n >= 2 && n <= 4 ? `${n} zverejnené skutky` : n > 4 ? `${n} zverejnených skutkov` : popis}</>;
}
function KartaPolozky({ k, tier, piny, prepniPin, otvorPolozku, strankaId }: { k: Karta } & Pick<Spolocne, "tier" | "piny" | "prepniPin" | "otvorPolozku" | "strankaId">) {
  // KARTA 40: Oznamy majú v Zadarmo výzvu na súrnu pomoc — karta bez štítka „od P1"
  const zamok = !maPovolenie(k.id, tier) && k.id !== "oznamy";
  const pn = piny.includes(k.id);
  const [pinHl, setPinHl] = useState(false); // OPRAVY 450: ťuk na pin zamknutej = veta na mieste
  useEffect(() => { if (!pinHl) return; const t = window.setTimeout(() => setPinHl(false), 3500); return () => window.clearTimeout(t); }, [pinHl]);
  return (
    <div role="button" tabIndex={0} onClick={() => otvorPolozku(k.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); otvorPolozku(k.id); } }} className="sc-bdh"
      style={{ borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", minWidth: 0 }}>
      <span style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={k.d} /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 15.5, color: "var(--ink)" }}>{k.t}</b>
          {zamok && <span style={{ flex: "none", whiteSpace: "nowrap", height: 22, padding: "0 8px", borderRadius: 11, border: "1px solid var(--cardBd)", fontSize: 11.5, fontWeight: 800, color: "var(--ink3)", display: "flex", alignItems: "center" }}>od {odProgramu(k.id)}</span>}
        </span>
        {pinHl && <span role="status" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{`Pripnúť môžete od ${odProgramu(k.id)}`}</span>}
        <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{k.id === "oznamy" ? <PopisOznamov strankaId={strankaId} popis={k.s} /> : k.id === "skutky" ? <PopisSkutkov strankaId={strankaId} popis={k.s} /> : k.s}</span>
      </span>
      {zamok
        ? <button onClick={(e) => { e.stopPropagation(); setPinHl(true); }} aria-label={`Pripnúť môžete od ${odProgramu(k.id)}`} title={`Pripnúť môžete od ${odProgramu(k.id)}`}
            style={{ flex: "none", width: 44, height: 44, borderRadius: 12, border: "1px solid transparent", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.35 }}>
            <Ik d={IK.pin} s={17} w={2} fill="none" />
          </button>
        : <button onClick={(e) => { e.stopPropagation(); prepniPin(k.id); }} aria-label={pn ? "Odopnúť z lišty" : "Pripnúť na lištu"} aria-pressed={pn} title={pn ? "Odopnúť z lišty" : "Pripnúť na lištu"}
            style={{ flex: "none", width: 44, height: 44, borderRadius: 12, border: `1px solid ${pn ? "var(--cuBd)" : "transparent"}`, background: pn ? "var(--accSoft)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ik d={IK.pin} s={17} w={2} fill={pn ? "var(--acc)" : "none"} />
          </button>}
      <Ik d={IK.sipkaP} s={16} w={2.4} />
    </div>);
}

function Mriezka({ karty, mobil, ...s }: { karty: Karta[] } & Spolocne) {
  const tel = mobil && !s.tablet;
  return <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: mobil ? 10 : 14 }}>{karty.filter((k) => k.id !== "kalendar" || tel).map((k) => <KartaPolozky key={k.id} k={k} {...s} />)}</div>;
}

// KARTA 48 · zoznam zbierok: hore centrálna a sektory (stále), pod tým bežné zbierky; ťuk na riadok = jeho Správa
let poslednyRiadok: string | null = null; // „‹ Zbierky" vráti na to isté miesto v zozname
/** KARTA 48 · stav zbierky v zozname: BEŽÍ → DOLOŽTE DO {dátum} → PO LEHOTE → ČAKÁ NA OVERENIE → OVERENÉ DEED+ */
type StavZb = [string, string];
const BEZI_ZB: StavZb = ["BEŽÍ", "#4B7A35"];
function stavZbierky(z: ZbRiadok, id: string, neverejna = false): StavZb {
  if (neverejna && !z.konc) return ["SPUSTÍ SA PO ZVEREJNENÍ STRÁNKY", "#8A6A1C"]; // OPRAVY 511
  const st = nacitajStav(id);
  // OPRAVY 456 (5): štítok „Doklady čakajú na overenie“ (aj pri bežiacej zbierke)
  const cakaju = !!st && st.doklady.some((d) => (d.odoslane ?? (st.odoslaneNaOverenie && d.datum <= st.odoslaneNaOverenie)) && !d.overene && !d.vratene && !d.zamietnute);
  if (cakaju) return ["DOKLADY ČAKAJÚ NA OVERENIE", "#8A6A1C"];
  if (!z.konc) return BEZI_ZB;
  if (z.overene || (st && st.doklady.length > 0 && st.doklady.every((d) => d.overene))) return ["OVERENÉ DEED+", "#2F5E3A"];
  const kon = Date.parse(st?.ukoncena ?? z.skoncila ?? new Date().toISOString());
  const lehota = Date.parse(pridajDni(new Date(kon).toISOString(), SPRAVA_ZBIERKY_CFG.lehoty[st?.lehota ?? z.lehota ?? "30"]));
  if (Date.now() > lehota) return ["PO LEHOTE", "var(--red)"];
  const d = new Date(lehota);
  return [`DOLOŽTE DO ${d.getDate()}. ${d.getMonth() + 1}.`, "#8A6A1C"];
}
function RiadokZb({ id, foto, hier, stit, nazov, pod, cislo, suma, stav, novinka, onClick }: { id: string; foto: string; hier?: number; stit: string; nazov: string; pod: string; cislo?: string; suma: string; stav?: StavZb; /** OPRAVY 461 */ novinka?: string; onClick: () => void }) {
  return (
    <button type="button" data-riadok={id} onClick={() => { poslednyRiadok = id; onClick(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
      <span style={{ position: "relative", flex: "none", width: 64, height: 64, borderRadius: 14, background: foto || "#3a3530", overflow: "hidden" }}>{hier != null && <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 5, background: `var(--h${hier})` }} />}</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{stit}</span>
        <b style={{ fontSize: 16, lineHeight: 1.25 }}>{nazov}</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{pod}</span>
        {cislo && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{cislo}</span>}
        {novinka && <span style={{ alignSelf: "flex-start", minHeight: 22, padding: "2px 9px", borderRadius: 11, background: "var(--goldBg)", border: "1px solid var(--goldBd)", color: "var(--gold)", fontSize: 11.5, fontWeight: 800, display: "inline-flex", alignItems: "center" }}>{novinka}</span>}
      </span>
      <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <b style={{ fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{suma}</b>
        {stav && <span style={{ height: 24, padding: "0 9px", borderRadius: 12, background: stav[1], color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{stav[0]}</span>}
      </span>
      <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>
    </button>);
}
/** KARTA 48 · bod 146: dlaždica-tlačidlo (Dorovnanie daru, Materiálne zbierky) */
function DlazdicaZb({ d, t, sub, stitok, onClick }: { d: string; t: string; sub: string; stitok?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ flex: "1 1 220px", minWidth: 0, display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "10px 14px", borderRadius: 18, background: "var(--btn)", border: "1.5px solid var(--acc)", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
      <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <b style={{ fontSize: 15, lineHeight: 1.25 }}>{t}</b>
        <span style={{ fontSize: 12.5, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>
      </span>
      {stitok && <span style={{ flex: "none", height: 24, padding: "0 9px", borderRadius: 12, background: "#8A6A1C", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{stitok}</span>}
      <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>
    </button>);
}
const IK_ZAMOK = "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4";
const IK_CENTRALNA = "M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z";
const IK_SEKTOR = "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z";
const IK_BEZNA = "M12 5v14M5 12h14";
const nadpisZb: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" };
function ObrZbierky(s: Spolocne) {
  const { otvor, menu, nova, vlastne, rozpisana, spravuj, tier, strankaId, entita, zbal, prepniZbal } = s;
  const neverejna = useNeverejna(strankaId); // OPRAVY 511: zbierka sa spustí až po zverejnení stránky
  const dor = useDorovnania(entita);
  const stavyDor = dor.map(stavCharity);
  const dorCaka = stavyDor.filter((x) => x === "cakaMimo" || x === "cakaDeed" || x === "potvrdene" || x === "vratit").length;
  const dorBezi = stavyDor.filter((x) => x === "bezi").length;
  const ph = s.mobil && !s.tablet;
  const cenOtv = zbal["cen-sektory"] ?? !ph; // bod 145: mobil predvolene zbalené, PC a tablet rozbalené; pamätá sa ako Pripnuté
  const sektory = useSektory();
  useZmenyCentralnej(); useZmenyDarov(); // OPRAVY 445 (2): sumy zbierok z ledgera
  const list: ZbRiadok[] = [...vlastne.map(naRiadok), ...(nova ? [] : ZB_LIST)];
  // OPRAVY 461: štítok „Nové v príbehu · …“ pri zbierke s najnovším zápisom v Priebehu
  useZmenyPribehov();
  const idList = vlastne.map((z) => z.id).join(",");
  useEffect(() => { if (idList) void nacitajPribehy(idList.split(",")); }, [idList]);
  const najnovsia = list.map((z) => naSpravu(z).id).filter((id) => novePribehu(id)).sort((a, b) => (novePribehu(a)! < novePribehu(b)! ? 1 : -1))[0];
  const centralna = typPovoli("centralna", menu.typ) && maPovolenie("centralna", tier);
  const sek = centralna && tier >= SEKTORY_OD_TIERU ? sektory : [];
  const cen = centralnaZPamate(strankaId) ?? prazdnaCentralna();
  const centralnaVidno = cistyText(cen.popis).length > 0 && cen.media.length > 0;
  const cenFoto = cen.media.find((m) => m.typ === "foto")?.src;
  const cisla = (c: { mesiac: number; mesacne: number }) => [`${c.mesacne} ${c.mesacne === 1 ? "človek dáva" : c.mesacne < 5 && c.mesacne > 1 ? "ľudia dávajú" : "ľudí dáva"} mesačne`, `${eur(c.mesiac)} / mes.`];
  const otvorCen = (i: number) => { nastavVyberCentralnej(i); otvor("centralna"); };
  const dlazdice = menu.druhy.filter((k) => k.id === "dorovnanie" || k.id === "materialne"); // bod 146: dve dlaždice pod hlavičkou, „Ďalšie druhy zbierok" dole zmizli
  useEffect(() => {
    if (!poslednyRiadok) return;
    const el = document.querySelector(`[data-riadok="${CSS.escape(poslednyRiadok)}"]`);
    if (el) el.scrollIntoView({ block: "center" });
    poslednyRiadok = null;
  }, []);
  // OPRAVY 445 (2): centrálna skutočnej stránky — tento mesiac z ledgera (ten istý refId ako detail centrálnej)
  const cC = nova ? (() => { const z = new Date(); z.setDate(1); z.setHours(0, 0, 0, 0); return { ...NULA, mesiac: darcoviaPre(refCentralnej(strankaId)).filter((r) => r.cas >= z.getTime()).reduce((a, r) => a + r.suma, 0) }; })() : CENTRALNA_CISLA;
  // ---- OPRAVY 486 · „Akú zbierku pridávate?“ (charita, ako Viera) ----
  const [vysvetli, setVysvetli] = useState<null | "centralna" | "segment" | "materialne">(null);
  const zamok = (id: "centralna" | "segment" | "materialne") => !maPovolenie(id, tier);
  const volba = (ik: string, t: string, veta: string, tap: () => void, o: { id?: "centralna" | "segment" | "materialne"; siva?: boolean } = {}) => {
    const zam = o.id ? zamok(o.id) : false;
    return (
      <button type="button" onClick={tap} aria-disabled={zam || o.siva || undefined} style={{ minHeight: 84, padding: "14px 18px", borderRadius: 18, border: "1.5px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
        <span style={{ flex: "none", width: 52, height: 52, borderRadius: 15, background: zam || o.siva ? "var(--btn)" : "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={ik} s={24} c={zam || o.siva ? "var(--ink3)" : "var(--gInk)"} /></span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 17, color: zam || o.siva ? "var(--ink2)" : "var(--ink)" }}>{t}</b>
            {zam && o.id && <span style={{ height: 22, padding: "0 8px", borderRadius: 11, background: "var(--goldBg)", color: "#8A5A2B", fontSize: 11.5, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}><Ik d={IK_ZAMOK} s={12} c="currentColor" w={2.4} />od {odProgramu(o.id)}</span>}</span>
          <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink3)" }}>{veta}</span>
        </span>
        <span aria-hidden="true" style={{ fontSize: 22, color: "var(--ink3)" }}>›</span>
      </button>);
  };
  const vysvetlenie = vysvetli && <div role="status" style={{ borderRadius: 16, background: "var(--goldBg)", border: "1.5px solid #C9A24A", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
    <b style={{ fontSize: 15.5 }}>{vysvetli === "segment" ? "Sektorová zbierka" : vysvetli === "centralna" ? "Centrálna zbierka" : "Materiálna zbierka"} je od programu {odProgramu(vysvetli)}</b>
    <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{vysvetli === "segment" ? "Jedna téma zo stanov, napríklad Seniori, s vlastným transparentným účtom a QR. Beží popri centrálnej zbierke, len na vašej stránke." : vysvetli === "centralna" ? "Pravidelná podpora celej vašej činnosti. Je len na vašej stránke, nie na Domove." : "Ľudia prinesú veci namiesto peňazí a zapíšu sa cez QR pri krabici."} Máte program {PROGRAM_NAZOV[tier]}.</span>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => otvor("n:program")} style={{ ...zeleneTl, height: 48 }}>Porovnať programy ›</button>
      <button type="button" onClick={() => setVysvetli(null)} style={{ height: 48, padding: "0 16px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" }}>Zavrieť</button>
    </div>
  </div>;
  const cenBezi = !!cen.spustena;
  const vyberEl = s.vyberZb && <section style={{ width: "100%", maxWidth: 900, borderRadius: 22, background: "var(--card)", border: "2px solid var(--green)", padding: ph ? "16px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ flex: 1, fontSize: 19 }}>Akú zbierku pridávate?</b>
      <button type="button" onClick={() => { setVysvetli(null); s.zavriVyberZb?.(); }} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontSize: 18, color: "var(--ink2)", boxShadow: "none" }}>×</button></div>
    {!cenBezi && vidnoPolozku("centralna", tier) && volba(IK_CENTRALNA, "Centrálna zbierka", "na celú činnosť · len na vašej stránke, nie na Domove",
      () => { if (zamok("centralna")) { setVysvetli("centralna"); return; } s.zavriVyberZb?.(); otvorCen(0); }, { id: "centralna" })}
    {vidnoPolozku("segment", tier) && volba(IK_SEKTOR, "Sektorová zbierka", !zamok("segment") && !cenBezi ? "najprv založte centrálnu zbierku" : "jedna téma zo stanov · vlastný transparentný účet",
      () => { if (zamok("segment")) { setVysvetli("segment"); return; } if (!cenBezi) { s.zavriVyberZb?.(); otvorCen(0); return; } s.zavriVyberZb?.(); chcemNovySektor(); otvorCen(0); }, { id: "segment", siva: !cenBezi })}
    {volba(IK_BEZNA, "Bežná zbierka", "pre niekoho, s cieľom · ide na Domov", () => s.novaBezna?.())}
    {vidnoPolozku("materialne", tier) && volba("M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5", "Materiálna zbierka", "veci namiesto peňazí",
      () => { if (zamok("materialne")) { setVysvetli("materialne"); return; } s.novaMaterialna?.(); }, { id: "materialne" })}
    {vysvetlenie}
  </section>;
  if (vyberEl) return vyberEl;
  return (<>
    {menu.mojeZbierky && <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 10 }}>
      {dlazdice.length > 0 && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {dlazdice.map((k) => k.id === "dorovnanie"
          ? <DlazdicaZb key={k.id} d="M4 21V7l8-4 8 4v14M9 21v-5h6v5" t="Dorovnanie daru" sub={dor.length ? `${dorBezi} ${dorBezi === 1 ? "beží" : dorBezi >= 2 && dorBezi <= 4 ? "bežia" : "beží"} · firmy pridávajú k darom` : "Firma pridá k daru ľudí svoj diel"} stitok={dorCaka ? `${dorCaka} ${dorCaka === 1 ? "ČAKÁ" : dorCaka <= 4 ? "ČAKAJÚ" : "ČAKÁ"}` : undefined} onClick={() => otvor("dorovnanie")} />
          : <DlazdicaZb key={k.id} d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5" t="Materiálne zbierky" sub="Zbierka vecí namiesto peňazí" onClick={() => otvor("materialne")} />)}
      </div>}
      {/* OPRAVY 414 (8): žiadna zbierka nevznikne sama — centrálna len po ťuku Založiť centrálnu zbierku (od P1) */}
      {centralna && !cen.spustena && <DlazdicaZb d="M12 5v14M5 12h14" t="Založiť centrálnu zbierku" sub={`${tier >= 1 ? "Pravidelná podpora" : "Podpora"} celej organizácie · nič nie je predvyplnené`} onClick={() => otvorCen(0)} />}
      {centralna && cen.spustena && <>
        <button type="button" onClick={() => prepniZbal("cen-sektory", !cenOtv)} aria-expanded={cenOtv} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "0 14px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", color: "var(--ink)", textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
          <span style={{ flex: 1, minWidth: 0, ...nadpisZb }}>CENTRÁLNA A SEKTORY · STÁLE</span>
          <span style={{ flex: "none", fontSize: 13, fontWeight: 700, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{1 + sek.length} · {eur(cC.mesiac + sek.reduce((a, x) => a + (nova ? 0 : cislaSektora(x.id).mesiac), 0))} / mes.</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", transform: `rotate(${cenOtv ? 180 : 0}deg)`, transition: "transform .2s ease" }}><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {cenOtv && <>        <RiadokZb id="cen-0" hier={0} foto={cenFoto ? `url('${cenFoto}') center/cover no-repeat #3a3530` : ""} stit="CENTRÁLNA" nazov="Celá činnosť"
          pod={centralnaVidno ? cisla(cC)[0] : "Doplňte text a fotku, potom ju uvidia darcovia"} cislo={cisloObjektu("Z", `${strankaId}-centralna`)} suma={cisla(cC)[1]} onClick={() => otvorCen(0)} />
        {sek.map((x, i) => { const c = nova ? NULA : cislaSektora(x.id); return (
          <RiadokZb key={x.id} id={`cen-${x.id}`} hier={i + 1} foto={x.foto ? `url('${x.foto}') center/cover no-repeat #3a3530` : ""} stit={`SEKTOR ${i + 1}`} nazov={x.nazov} pod={cisla(c)[0]} cislo={cisloObjektu("Z", `${strankaId}-${x.id}`)} suma={cisla(c)[1]} onClick={() => otvorCen(i + 1)} />); })}
        <TlZbalit onZbal={() => prepniZbal("cen-sektory", false)} />{/* OPRAVY 321 */}
        </>}
      </>}
      {(list.length > 0 || rozpisana) && <span style={{ ...nadpisZb, paddingTop: centralna && cen.spustena ? 8 : 0 }}>ZBIERKY</span>}
      {rozpisana && <section style={{ ...karta, borderRadius: 18, padding: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ flex: "1 1 240px", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#8A5A2B" }}>ROZPÍSANÁ ZBIERKA</span><b style={{ fontSize: 16 }}>{rozpisana.nazov || "Bez názvu"}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>Krok {rozpisana.krok} z 6 · {KROKY_ZBIERKY[Math.min(5, Math.max(0, rozpisana.krok - 1))]} · uložené automaticky</span></span>
        <button onClick={() => (s.novaBezna ?? (() => otvor("x:Nová zbierka")))()} style={{ ...zeleneTl, flex: "none" }}>Dokončiť</button>
      </section>}
      {list.map((z) => (
        <RiadokZb key={z.id ?? z.t} id={z.id ?? z.t} foto={z.bg} stit={[z.mesto?.toLocaleUpperCase("sk-SK"), z.dlha ? "DLHODOBÁ" : ""].filter(Boolean).join(" · ") || "ZBIERKA"} nazov={z.t} pod={z.s} suma={eur(z.v)}
          cislo={cisloObjektu("Z", naSpravu(z).id, naSpravu(z).vs)} stav={stavZbierky(z, naSpravu(z).id, neverejna)} novinka={naSpravu(z).id === najnovsia ? stitokNoveho(najnovsia) ?? undefined : undefined} onClick={() => spravuj(naSpravu(z))} />))}
      {list.length === 0 && !rozpisana && <section style={{ ...karta, padding: "26px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
        <b style={{ fontSize: 16.5 }}>Zatiaľ nemáte žiadnu zbierku</b>
        <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>Keď ju vytvoríte, uvidíte ju tu aj s tým, koľko prišlo a čo treba doložiť.</span>
        <button onClick={() => otvor("x:Nová zbierka")} style={{ ...zeleneTl, marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}><Ik d="M12 5v14M5 12h14" s={17} c="currentColor" w={2.6} />Nová zbierka</button>
      </section>}
    </div>}
  </>);
}

function ObrPenazenka({ otvor, mobil, refs }: { otvor: (s: Sub) => void; mobil: boolean; refs: string[] }) {
  // OPRAVY 442 doplnok 3: prišlo tento mesiac zo skutočných darov (ledger); výplaty appka zatiaľ nevie → „—“
  useZmenyDarov();
  const zac = new Date(); zac.setDate(1); zac.setHours(0, 0, 0, 0);
  const mes = refs.flatMap((r) => darcoviaPre(r)).filter((r) => r.cas >= zac.getTime());
  const dlazdice: [string, string, string][] = [["Prišlo tento mesiac", eur(mes.reduce((a, r) => a + r.suma, 0)), mes.length ? `${mes.length} ${mes.length === 1 ? "dar" : mes.length <= 4 ? "dary" : "darov"}` : "zatiaľ žiadne dary"], ["Čaká na výplatu", "—", ""], ["Vyplatené spolu", "—", ""]];
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

/** OPRAVY 186: Nastavenia farnosti = tie isté Nastavenia ako charita; farnosť mení len riadky Príjem darov, Ľudia, Údaje a Predplatné */
export interface NastFarnosti { ludia: () => void; predplatne: () => void; hlavna: () => void; n: (id: string) => void; /** OPRAVY 243: Vzhľad stránky · Farba línií */ vzhlad?: React.ReactNode }
export function ObrNastavenia({ tier, otvor, mobil, farnost, vzhlad, charita, naLudi }: { /** OPRAVY 404: Ľudia v správe charity */ charita?: boolean; /** OPRAVY 502: Správcovia a prístupy → Ľudia → Štatutár a pracovníci */ naLudi?: () => void; tier: Tier; otvor: (s: Sub) => void; mobil: boolean; farnost?: NastFarnosti; /** OPRAVY 396: Vzhľad stránky charity pod Témou */ vzhlad?: React.ReactNode }) {
  const n = useNastaveniaAppky();
  const { tema, nastavTemu } = useMotiv();
  const [tuk, setTuk] = useState(potvrditTuknutim);
  const [tichy, setTichy] = useState(true);
  const fz = Math.round((n.pismo - 90) / 10); // 0–6
  const pr = (t: string) => () => otvor(`x:${t}`);
  const nn = (id: string) => () => (farnost ? farnost.n(id) : otvor(`n:${id}`));
  const pristup: [string, string, boolean, () => void][] = [
    ["Obmedziť animácie", "bez letov, iskier a pulzovania", n.obmedzAnim, () => zmenNastavenia({ obmedzAnim: !n.obmedzAnim })],
    ["Vibrácie", "pri potvrdení a po dare", n.vibracie, () => zmenNastavenia({ vibracie: !n.vibracie })],
    ["Titulky vo videách", "vždy zapnuté", n.titulky, () => zmenNastavenia({ titulky: !n.titulky })],
    ["Potvrdzovať ťuknutím", "namiesto podržania, pri platbe dvakrát ťukni", tuk, () => { nastavPotvrditTuknutim(!tuk); setTuk(!tuk); }],
  ];
  const sekcie: [string, Riadok[]][] = [
    ["OZNÁMENIA", [{ t: "Čo chcete dostávať", s: "dary, zbierky, doklady, ľudia, správy", tap: nn("notif") }, { t: "Tichý čas", s: "22:00 – 7:00", prep: [tichy, () => setTichy((x) => !x)] }]],
    ["PRÍJEM DAROV", [{ t: "Dary v eurách", v: eurText(), tap: nn("eur") }, { t: "Dary v EURC", v: eurcText(), tap: nn("krypto") }, { t: "Správa účtov", s: "hlavný účet a účty zbierok", tap: nn("ucty") }]],
    // OPRAVY 502 (3): charita pridáva ľudí len v Ľuďoch — tu len odkaz tam
    ["SPRÁVCOVIA", [charita ? { t: "Správcovia a prístupy", s: `štatutár a pracovníci · ${pocetLudiCharity()}`, v: "v Ľuďoch", tap: naLudi ?? nn("spravcovia") }
      : { t: "Správcovia a prístupy", s: "kto spravuje stránku, pozvať ďalšieho", v: String(pocetSpravcov()), tap: nn("spravcovia") }]],
    ["ORGANIZÁCIA", [{ t: "Údaje organizácie", s: "IČO, sídlo, fakturačné údaje", tap: nn("udaje") }, { t: "Program a predplatné", v: PROG[Math.min(3, tier)][0], tap: nn("program") }]],
    ["BEZPEČNOSŤ A ÚDAJE", [{ t: "Prihlásené zariadenia", v: String(pocetZariadeni()), tap: nn("zariadenia") }, { t: "Súhlasy", s: "čo organizácia odsúhlasila", tap: nn("suhlasy") }, { t: "Stiahnuť údaje charity", s: "zbierky, darcovia a doklady v jednom súbore", tap: nn("stiahnut") }]],
    ["POMOC", [{ t: "Časté otázky", tap: nn("faq") }, { t: "Napísať podpore", tap: nn("podpora") }]],
    ["STRÁNKA", [{ t: "Zrušiť stránku charity", red: true, tap: nn("zrusit") }]],
  ];
  if (farnost) sekcie.splice(1, sekcie.length - 1,
    ["PRÍJEM DAROV", [{ t: "Sumy pri daroch", s: "eurá a EURC · nastavujú sa pri hlavnej zbierke", tap: farnost.hlavna }, { t: "Účet farnosti", s: "IBAN, overenie a zmena účtu", tap: nn("ucty") }]],
    ["ĽUDIA", [{ t: "Ľudia farnosti", s: "kto spravuje stránku, pozvať ďalšieho", tap: farnost.ludia }]],
    ["FARNOSŤ", [{ t: "Údaje farnosti", s: "cirkev, patrí pod, kontakt a fakturačné údaje", tap: nn("udaje") }, { t: "Program a platba", s: "predplatné farnosti, filiálky, faktúry", tap: farnost.predplatne }]],
    ["BEZPEČNOSŤ A ÚDAJE", [{ t: "Prihlásené zariadenia", v: String(pocetZariadeni()), tap: nn("zariadenia") }, { t: "Súhlasy", s: "čo farnosť odsúhlasila", tap: nn("suhlasy") }]],
    ["POMOC", [{ t: "Časté otázky", tap: nn("faq") }, { t: "Napísať podpore", tap: nn("podpora") }]]);
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
              <button key={k} role="radio" aria-checked={on} onClick={() => nastavTemu(k)} style={{ minHeight: 44, borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, background: on ? "var(--green)" : "transparent", color: on ? "#fff" : "var(--ink2)", padding: "0 4px", lineHeight: 1.15 }}>{l}</button>); })}
          </div>
          <button onClick={pr("Jazyk")} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, border: "none", borderTop: "1px solid var(--cardBd)", paddingTop: 10, background: "transparent", cursor: "pointer", textAlign: "left" }}>
            <Ik d={"M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" + IK.svet} s={18} c="#3D6B8E" w={2} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Jazyk <span lang="en" style={{ fontWeight: 600, color: "var(--ink3)" }}>· Language</span></span>
            <span style={{ fontSize: 14, color: "var(--ink3)" }}>{n.jazyk}</span>
            <Ik d={IK.sipkaP} s={16} c="var(--ink3)" w={2.4} />
          </button>
        </div>
        {vzhlad}
      </div>
      {farnost?.vzhlad}
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
/** OPRAVY 404: ktoré právo pracovníka treba na časť Správy charity (null = smie každý v Správe) */
const PRAVO_SUB: Record<string, Pravo> = {
  g_zbierky: "zbierky", centralna: "zbierky", dorovnanie: "zbierky", segment: "zbierky", materialne: "zbierky", "x:Nová zbierka": "zbierky", "x:Správa zbierky": "zbierky", "x:Oprava zbierky": "zbierky",
  doklady: "doklady",
  g_obsah: "obsah", skutky: "obsah", video: "obsah", oznamy: "obsah", nastenka: "obsah", upoutavky: "obsah",
  g_ludia: "ludia", darcovia: "ludia", sledujuci: "ludia", dobrovolnici: "ludia", podujatia: "ludia", sponzoring: "ludia", inzeraty: "ludia",
  penazenka: "penazenka_vidiet", "n:ucty": "penazenka_vyplaty", "n:spravcovia": "pridavat",
};
function pravoPreSub(s: Sub): Pravo | null {
  if (!s) return null;
  if (PRAVO_SUB[s]) return PRAVO_SUB[s];
  return s.startsWith("n:") ? "nastavenia" : null;
}
function NematePovolene() {
  return (
    <section style={{ ...karta, padding: "24px", display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      <b style={{ fontSize: 16, color: "var(--ink2)" }}>{NEMATE_POVOLENE}</b>
    </section>);
}
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
/** OPRAVY 398: koniec P3 zadarmo pre pozvané charity = registrácia + 2 mesiace */
function usePozvanaDo(strankaId: string): string {
  const [od, setOd] = useState<string | null>(() => casRegistracieLokalne(strankaId));
  useEffect(() => {
    let ziva = true;
    if (supabase && strankaId) void supabase.from("stranka").select("vytvorene").eq("id", strankaId).maybeSingle()
      .then(({ data }) => { if (ziva && data?.vytvorene) setOd(data.vytvorene as string); }, () => { /* sieť: ostane lokálny čas */ });
    return () => { ziva = false; };
  }, [strankaId]);
  const d = od ? new Date(od) : new Date();
  const den = d.getDate();
  d.setMonth(d.getMonth() + 2);
  if (d.getDate() !== den) d.setDate(0); // 31. 12. + 2 mesiace → posledný deň februára
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}
function DevSprava({ pas, tier, stit, onTier, onStit, charita }: { charita: boolean; pas: boolean; tier: Tier; stit: StitCharity; onTier: (t: Tier) => void; onStit: (s: StitCharity) => void }) {
  return (<>
    {/* OPRAVY 153: Typ a Rola sú pod „Ďalšie testovacie ›" */}
    {/* OPRAVY 529: pri charite len Štít (vzhľad), program je zo servera */}
    {!charita && <TestVolba pas={pas} nazov="Program" volby={([0, 1, 2, 3, 4] as Tier[]).map((t) => [t, PROGRAM_NAZOV[t]] as [Tier, string])} hodnota={tier} onVolba={onTier} />}
    <StitVolba pas={pas} stit={stit} onStit={onStit} />
    {/* OPRAVY 433: prepínač Stav (Nová · pozvaná / Nová · zadarmo) zmazaný — úvod riadia skutočné dáta */}
  </>);
}
