// ============================================================
// KARTA 34 · Správa charity — KOSTRA (fáza A).
// Prototyp: „Sprava charity PC.dc.html" (Pult charity PC) + „Sprava charity mobil.dc.html".
// Len rozloženie, farby podľa štítu a témy, Späť všade, povolenia z jedného miesta (stav.ts).
// Funkcie za tlačidlami NIE SÚ — každé tlačidlo otvorí obrazovku „Pripravujeme".
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@/styles/sprava.css";
import { useLayout, useMotiv } from "@/components/context";
import { toast } from "@/components/toast";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { potvrditTuknutim, nastavPotvrditTuknutim } from "@/features/zbierka/Platba";
import { TESTOVACIA } from "@/lib/testovacia";
import { nacitajPiny, ulozPiny, pinyZPamate } from "@/lib/spravaPiny";
import {
  FLAGS, nacitajTiery, ulozTiery, maPovolenie, odProgramu, PROGRAM_NAZOV, PIN_MAX,
  nacitajStitCharity, ulozStitCharity, nacitajCharituNovu, ulozCharituNovu,
  type PolozkaSpravy, type StitCharity, type Tier,
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
type Skupina = "g_zbierky" | "g_obsah" | "g_ludia" | "g_nastroje";
type Karta = { id: PolozkaSpravy; t: string; s: string; d: string };
const P = (d: string, t: string, s: string, id: PolozkaSpravy): Karta => ({ d, t, s, id });
const G: Record<Exclude<Skupina, "g_zbierky">, Karta[]> = {
  g_obsah: [
    P("M12 3l2.5 5.5L20 9l-4.5 4 1.5 6-5-3-5 3 1.5-6L4 9l5.5-.5z", "Skutky", "Takto sme pomohli · fotky pred a po, doklady", "skutky"),
    P("M4 6h16v12H4zM10 9l5 3-5 3z", "Mám talent — video", "Video do 45 s s platobným modulom", "video"),
    P("M4 10v4h3l6 4V6L7 10z", "Oznamy", "Krátka správa pre tých, čo vás sledujú", "oznamy"),
    P("M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", "Moja nástenka", "Udalosti na nástenke mesta", "nastenka"),
    P("M5 4h14v16H5zM9 9l6 3-6 3z", "Upútavky v Talente", "Upútavka na zbierku medzi videami", "upoutavky"),
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
const NAZOV_POLOZKY = Object.fromEntries(VSE.map((v) => [v.id, v.id === "zbierky" ? "Moje zbierky" : v.t])) as Record<PolozkaSpravy, string>;
const SKUPINA_POLOZKY = (id: PolozkaSpravy): Skupina | null => (id === "zbierky" || DRUHY.some((k) => k.id === id) ? "g_zbierky" : (Object.keys(G) as (keyof typeof G)[]).find((g) => G[g].some((k) => k.id === id)) ?? null);

// ---------- obrazovky ----------
/** null = Prehľad · skupina · penazenka · nast · položka (PolozkaSpravy) · "x:Názov" = obrazovka Pripravujeme */
type Sub = null | Skupina | "penazenka" | "nast" | PolozkaSpravy | `x:${string}`;
const NAZVY: Record<string, string> = { g_zbierky: "Zbierky", g_obsah: "Obsah", g_ludia: "Ľudia", g_nastroje: "Nástroje a výkazy", penazenka: "Peňaženka", nast: "Nastavenia" };
const titulok = (s: Sub) => (s === null ? "Prehľad" : s.startsWith("x:") ? s.slice(2) : NAZVY[s] ?? NAZOV_POLOZKY[s as PolozkaSpravy] ?? "Správa stránky");

// ---------- štít ----------
const STITY: Record<StitCharity, [string, string, string, string]> = {
  bronze: ["Bronzový", "Ale to Striebro má iný lesk.", "Bronze", "Bronz"],
  silver: ["Strieborný", "Ale to Zlato má iný lesk.", "Silver", "Striebro"],
  gold: ["Zlatý", "Ale tá Platina má iný lesk.", "Gold", "Zlato"],
  platinum: ["Platinový", "Ale Legenda má iný lesk.", "Platinum", "Platina"],
  legend: ["Legendárny", "Najvyšší štít, aký charita môže mať.", "Legend", "Legenda"],
};
const stitImg = (k: StitCharity, maly = false) => `/stity/care/${k}${maly ? "-200" : ""}.webp`;

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
  <span style={{ display: "block", height: h, borderRadius: h / 2, background: bg, overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: h / 2, background: c, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, sc)})` }} /></span>
);

export interface SpravaCharityProps {
  onBack: () => void;
  /** stránka charity (kľúč pre pripnuté v účte) */
  strankaId?: string;
  /** názov a iniciály charity (Moje stránky / registrácia) */
  nazov?: string;
  inicialy?: string;
}

export function SpravaCharity({ onBack, strankaId = "svetlo", nazov = "Svetlo pomoci o.z.", inicialy = "SP" }: SpravaCharityProps) {
  const { desktop } = useLayout();
  const [sub, setSub] = useState<Sub>(null);
  const hist = useRef<Sub[]>([]);
  const [tier, setTier] = useState<Tier>(() => nacitajTiery().charita);
  const [stit, setStit] = useState<StitCharity>(nacitajStitCharity);
  const [nova, setNova] = useState<boolean>(nacitajCharituNovu);
  const [piny, setPiny] = useState<PolozkaSpravy[]>(() => pinyZPamate(strankaId));
  useEffect(() => { let ziva = true; void nacitajPiny(strankaId).then((p) => { if (ziva) setPiny(p); }); return () => { ziva = false; }; }, [strankaId]);
  const [zoom, setZoom] = useState(false);
  const korenRef = useRef<HTMLDivElement>(null);

  const otvor = (s: Sub) => { if (s === sub) return; hist.current = [...hist.current, sub].slice(-30); setSub(s); };
  const spat = () => {
    if (hist.current.length) { const h = [...hist.current]; const p = h.pop()!; hist.current = h; setSub(p); }
    else if (sub !== null) setSub(null);
    else onBack();
  };
  // pri prepnutí obrazovky hore
  useEffect(() => { korenRef.current?.scrollIntoView?.({ block: "start" }); }, [sub]);

  const otvorPolozku = (id: PolozkaSpravy) => otvor(id === "zbierky" ? "g_zbierky" : id);
  const prepniPin = (id: PolozkaSpravy) => {
    if (piny.includes(id)) { const n = piny.filter((x) => x !== id); setPiny(n); void ulozPiny(strankaId, n); }
    else if (piny.length < PIN_MAX) { const n = [...piny, id]; setPiny(n); void ulozPiny(strankaId, n); }
    else toast("Najviac 6 pripnutých položiek.");
  };

  const spolocne = { tier, piny, prepniPin, otvorPolozku, otvor, nova, stit, mobil: !desktop };
  let obsah: React.ReactNode;
  if (sub === null) obsah = <Prehlad {...spolocne} onZoom={() => setZoom(true)} />;
  else if (sub === "g_zbierky") obsah = <ObrZbierky {...spolocne} />;
  else if (sub === "g_obsah" || sub === "g_ludia" || sub === "g_nastroje") obsah = <Mriezka karty={G[sub]} {...spolocne} />;
  else if (sub === "penazenka") obsah = <ObrPenazenka otvor={otvor} mobil={!desktop} />;
  else if (sub === "nast") obsah = <ObrNastavenia tier={tier} otvor={otvor} mobil={!desktop} />;
  else if (sub.startsWith("x:")) obsah = <Pripravujeme />;
  else obsah = maPovolenie(sub as PolozkaSpravy, tier) ? <Pripravujeme /> : <Zamknute program={odProgramu(sub as PolozkaSpravy)} />;

  const aktivnaSkupina: string | null = sub === null ? null : sub === "nast" || sub === "penazenka" || (sub as string).startsWith("g_") ? sub : (sub as string).startsWith("x:") ? null : SKUPINA_POLOZKY(sub as PolozkaSpravy);

  const dev = TESTOVACIA && FLAGS.dev_tier_switcher && (
    <DevSprava tier={tier} stit={stit} nova={nova}
      onTier={(t) => { setTier(t); ulozTiery({ ...nacitajTiery(), charita: t }); }}
      onStit={(s) => { setStit(s); ulozStitCharity(s); }}
      onNova={() => { const n = !nova; setNova(n); ulozCharituNovu(n); }} />
  );
  const zoomEl = zoom && <StitZoom stit={stit} onClose={() => setZoom(false)} />;

  const hlavicka = <Hlavicka titul={titulok(sub)} onSpat={spat} otvor={otvor} mobil={!desktop} />;

  if (desktop) return (
    <div ref={korenRef} className="sprava-charity" data-stit={stit} style={{ minHeight: "100dvh", boxSizing: "border-box", padding: "20px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>
      <aside style={{ width: 244, flex: "none", display: "flex", flexDirection: "column", gap: 12, paddingRight: 16, borderRight: "2px solid", borderImage: "var(--metal) 1", position: "sticky", top: 20, alignSelf: "flex-start" }}>
        <KartaCharity nazov={nazov} inicialy={inicialy} otvor={otvor} />
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
          {NAV.map((n) => { const on = aktivnaSkupina === n.k; return (
            <button key={n.k} onClick={() => otvor(n.k)} aria-current={on ? "page" : undefined} className={on ? undefined : "sc-hov"} style={{ height: 48, padding: "0 14px", border: "none", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: on ? "var(--accSoft)" : "transparent", color: on ? "var(--acc)" : "var(--ink)" }}>
              <Ik d={n.d} /><span style={{ flex: 1, fontSize: 15, fontWeight: on ? 800 : 600, whiteSpace: "nowrap" }}>{n.t}</span>
              {n.n ? <span aria-label={`${n.n} čaká na potvrdenie`} style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: "#4B7A35", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n.n}</span> : null}
            </button>); })}
        </nav>
        <div style={{ flex: "none", marginTop: 8 }}>
          <TlacidloNastavenia on={sub === "nast"} onClick={() => otvor("nast")} />
        </div>
        {dev}
      </aside>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {hlavicka}
        <div key={String(sub)} style={{ display: "flex", flexDirection: "column", gap: 14, animation: "spravaFade .2s ease both" }}>{obsah}</div>
      </main>
      {zoomEl}
    </div>
  );

  // ---------- MOBIL ----------
  return (
    <div ref={korenRef} className="sprava-charity" data-stit={stit} style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {hlavicka}
      <div key={String(sub)} style={{ padding: "14px 14px 28px", display: "flex", flexDirection: "column", gap: 14, animation: "spravaFade .2s ease both" }}>
        {sub === null && <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0 }}><KartaCharity nazov={nazov} inicialy={inicialy} otvor={otvor} mobil /></div>
          <KartaStitu stit={stit} onZoom={() => setZoom(true)} mobil />
        </div>}
        {obsah}
        {sub === null && <MenuDlazdice otvor={otvor} />}
        {dev}
      </div>
      {zoomEl}
    </div>
  );
}

// ============================================================
// HLAVIČKA — na každej obrazovke
// ============================================================
function Hlavicka({ titul, onSpat, otvor, mobil }: { titul: string; onSpat: () => void; otvor: (s: Sub) => void; mobil: boolean }) {
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
      <button onClick={() => otvor("x:Nová zbierka")} aria-label="Nová zbierka" style={{ flex: "none", width: 44, height: 44, border: "none", borderRadius: 13, background: "#4B7A35", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d="M12 5v14M5 12h14" s={20} c="#fff" w={2.6} /></button>
    </header>);
  return (
    <header style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat" }}>
      {spatEl}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titul}</h1>{datum}
      </span>
      {kalEl}
      <button onClick={() => otvor("x:Nová zbierka")} style={{ ...zeleneTl, background: "#4B7A35", display: "flex", alignItems: "center", gap: 8 }}><Ik d="M12 5v14M5 12h14" s={17} c="currentColor" w={2.6} />Nová zbierka</button>
    </header>);
}

// ============================================================
// PANEL — karta charity, Nastavenia
// ============================================================
function KartaCharity({ nazov, inicialy, otvor, mobil }: { nazov: string; inicialy: string; otvor: (s: Sub) => void; mobil?: boolean }) {
  const [otv, setOtv] = useState(true);
  const pct = 50;
  if (mobil) return (
    <div style={{ height: "100%", boxSizing: "border-box", borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--white)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gInk)", flex: "none" }}>{inicialy}</span>
        <span style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nazov}</b><span style={{ display: "block", fontSize: 12, color: "var(--cuInk2)" }}>profil hotový na {pct} %</span></span>
      </span>
      <Pruh sc={pct / 100} h={6} bg="rgba(168,116,80,.25)" />
      <span style={{ flex: 1 }} />
      <button onClick={() => otvor("x:Upraviť profil")} style={{ ...zeleneTl, width: "100%", padding: 0 }}>Upraviť profil</button>
    </div>);
  return (
    <div style={{ flex: "none", borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)", overflow: "hidden" }}>
      <button onClick={() => setOtv((o) => !o)} aria-expanded={otv} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 12, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
        <span style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", background: "var(--white)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gInk)", flex: "none" }}>{inicialy}</span>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 800, lineHeight: 1.25, overflowWrap: "anywhere" }}>{nazov}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--cuInk2)" }}>Verejný profil · hotový na {pct} %</span></span>
        <Ik d={IK.dole} s={18} w={2.4} style={{ transform: `rotate(${otv ? 180 : 0}deg)`, transition: "transform .2s ease" }} />
      </button>
      {otv && <div style={{ padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--accLine)" }}>
        <span style={{ marginTop: 8 }}><Pruh sc={pct / 100} h={6} bg="rgba(168,116,80,.25)" /></span>
        <span style={{ fontSize: 13, color: "var(--cuInk)" }}>Chýba logo a titulná fotka.</span>
        <button onClick={() => otvor("x:Upraviť profil")} style={{ height: 44, borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 800 }}>Upraviť</button>
      </div>}
    </div>);
}

function TlacidloNastavenia({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={on ? undefined : "sc-hov"} style={{ width: "100%", minHeight: 56, padding: "6px 14px", border: `1px solid ${on ? "var(--cuBd)" : "var(--cardBd)"}`, borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: on ? "var(--accSoft)" : "var(--card)", color: on ? "var(--acc)" : "var(--ink)" }}>
      <Ik d={IK.nast} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: on ? 800 : 600 }}>Nastavenia</span><span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink3)" }}>aplikácie a účtu</span></span>
    </button>);
}

/** mobil: menu ako 6 dlaždíc + Nastavenia */
function MenuDlazdice({ otvor }: { otvor: (s: Sub) => void }) {
  const dl: { k: Sub; t: string; d?: string; n?: number; teal?: boolean }[] = [
    { k: "x:Verejný profil", t: "Verejný profil", teal: true },
    ...NAV.map((n) => ({ k: n.k as Sub, t: n.t, d: n.d, n: n.n })),
  ];
  return (<>
    <span style={{ ...nadpisSekcie, color: "var(--ink3)" }}>SPRÁVA STRÁNKY</span>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {dl.map((x) => (
        <button key={String(x.k)} onClick={() => otvor(x.k)} style={{ position: "relative", minHeight: 84, padding: "10px 6px", borderRadius: 16, background: x.teal ? "var(--tBg)" : "var(--card)", border: `1px solid ${x.teal ? "var(--tBd)" : "var(--cardBd)"}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13.5, fontWeight: 800, color: x.teal ? "var(--tInk)" : "var(--ink)", lineHeight: 1.25, textAlign: "center" }}>
          {x.teal ? <OkoIk /> : <Ik d={x.d!} />}{x.t}
          {x.n ? <span style={{ position: "absolute", top: 6, right: 6, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 11, background: "#4B7A35", color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{x.n}</span> : null}
        </button>))}
    </div>
    <TlacidloNastavenia on={false} onClick={() => otvor("nast")} />
  </>);
}

// ============================================================
// PREHĽAD
// ============================================================
type Spolocne = { tier: Tier; piny: PolozkaSpravy[]; prepniPin: (id: PolozkaSpravy) => void; otvorPolozku: (id: PolozkaSpravy) => void; otvor: (s: Sub) => void; nova: boolean; stit: StitCharity; mobil: boolean };

function KartaStitu({ stit, onZoom, mobil, vyska }: { stit: StitCharity; onZoom: () => void; mobil?: boolean; vyska?: number }) {
  const [n, alt, en] = STITY[stit];
  // odlesk: raz pri príchode, potom raz za 30 min (Obmedziť animácie → .sc-lesk skryté v CSS)
  const [lesk, setLesk] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setLesk((x) => x + 1), 30 * 60 * 1000); return () => window.clearInterval(id); }, []);
  return (
    <div style={{ order: 2, flex: "none", width: mobil ? 112 : 230, height: vyska, boxSizing: "border-box", position: "relative", overflow: "hidden", borderRadius: 18, background: "var(--stBg)", border: "1.5px solid var(--cuBd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5),0 6px 18px rgba(30,28,20,.12)", padding: mobil ? "10px 8px" : "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <span key={`${stit}-${lesk}`} className="sc-lesk" aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: "inherit", background: "linear-gradient(105deg,transparent 35%,rgba(255,255,255,.6) 50%,transparent 65%)", transform: "translateX(-130%)", animation: "leskStit 1.6s ease-in-out 1.2s 1 both" }} />
      <button onClick={onZoom} aria-label="Zväčšiť štít" style={{ display: "flex", flexDirection: mobil ? "column" : "row", alignItems: "center", gap: mobil ? 4 : 10, padding: 0, border: "none", background: "transparent", cursor: "zoom-in", textAlign: mobil ? "center" : "left", minHeight: 44 }}>
        <img src={stitImg(stit, true)} alt={`Štít DEED+ CARE ${en}`} width={mobil ? 62 : 78} height={mobil ? 76 : 96} style={{ display: "block", flex: "none", objectFit: "contain", filter: "drop-shadow(0 5px 10px rgba(90,50,20,.3))" }} />
        <span style={{ display: "flex", flexDirection: "column", gap: mobil ? 2 : 4 }}>
          {!mobil && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".07em", color: "var(--stInk2)" }}>ŠTÍT</span>}
          <span style={{ fontSize: mobil ? 14.5 : 20, fontWeight: 800, lineHeight: 1.1, color: "var(--stInk)" }}>{n}</span>
          <span style={{ fontSize: mobil ? 11.5 : 12.5, lineHeight: 1.35, color: "var(--stInk2)" }}>{alt}</span>
        </span>
      </button>
    </div>);
}

function StitZoom({ stit, onClose }: { stit: StitCharity; onClose: () => void }) {
  const [n, veta, en] = STITY[stit];
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return createPortal(
    <div className="sprava-charity" data-stit={stit} role="dialog" aria-modal="true" aria-label={`${n} štít`} onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(29,33,27,.6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: 16, animation: "spravaFade .2s ease both" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 40px", maxWidth: "100%", borderRadius: 28, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", textAlign: "center", cursor: "default" }}>
        <img src={stitImg(stit)} alt={`Štít DEED+ CARE ${en}`} style={{ display: "block", width: 300, maxWidth: "70vw", height: "auto", maxHeight: "50vh", objectFit: "contain", filter: "drop-shadow(0 12px 22px rgba(90,50,20,.35))" }} />
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--ink)" }}>{n} štít</span>
        <span style={{ fontSize: 16, color: "var(--cuInk)" }}>{veta}</span>
        <button onClick={onClose} style={{ ...zeleneTl, height: 48, padding: "0 26px", fontSize: 15.5, background: "#4B7A35" }}>Zavrieť</button>
      </div>
    </div>, document.body);
}

function Prehlad({ tier: _tier, piny, prepniPin, otvorPolozku, otvor, nova, stit, mobil, onZoom }: Spolocne & { onZoom: () => void }) {
  const [obd, setObd] = useState(0);
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

  const cisla = (
    <section aria-label="Čísla" style={{ flex: 1, minWidth: 0, height: mobil ? undefined : vyska, boxSizing: "border-box", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? 12 : "10px 16px", display: "flex", flexDirection: "column", gap: mobil ? 10 : 4 }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
        {!mobil && <b style={{ flex: 1, fontSize: 15 }}>Čísla</b>}
        <div role="tablist" aria-label="Obdobie" style={{ flex: mobil ? 1 : "none", display: mobil ? "grid" : "flex", gridTemplateColumns: "repeat(4,1fr)", gap: 2, padding: 3, borderRadius: 12, background: "var(--btn)" }}>
          {OBD.map((t, i) => { const on = i === obd; return (
            <button key={t} role="tab" aria-selected={on} onClick={() => setObd(i)} style={{ height: mobil ? 44 : 28, padding: "0 12px", border: "none", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13, fontWeight: on ? 800 : 700, background: on ? "var(--seg)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", boxShadow: on ? "0 1px 3px rgba(30,28,20,.14)" : "none" }}>{t}</button>); })}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: mobil ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gridAutoRows: mobil ? "auto" : "1fr", columnGap: 16 }}>
        {K8.map((k, i) => {
          const [v, d] = nova ? [N8[i], ""] : D8[obd][i];
          const bt = mobil ? i > 1 : i > 3;
          return (
            <div key={k} style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: mobil ? "8px 0" : "2px 0", borderTop: bt ? "1px solid var(--cardBd)" : "none" }}>
              <span style={{ fontSize: 11.5, lineHeight: 1.3, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k}</span>
              <b style={{ fontSize: 18, lineHeight: 1.15, color: i === 0 ? "var(--gInk)" : i === 5 ? "var(--gold)" : "var(--ink)", whiteSpace: "nowrap" }}>{v}</b>
              <span style={{ fontSize: 11, lineHeight: 1.3, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minHeight: 14 }}>{d}</span>
            </div>);
        })}
      </div>
    </section>);

  const pinBar = (
    <section aria-label="Pripnuté" style={{ flex: "none", position: "relative", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: 8 }}>
      <div className="sc-lista" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: mobil ? "nowrap" : "wrap", overflowX: mobil ? "auto" : undefined }}>
        <span style={{ flex: "none", padding: "0 8px 0 6px", fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)" }}>PRIPNUTÉ</span>
        <button onClick={() => trebaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 12px 0 14px", borderRadius: 13, border: `1.5px solid ${ulohy.length ? "#C9A24A" : "var(--cardBd)"}`, background: ulohy.length ? "var(--warnBg)" : "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>
          Treba vybaviť<span style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: ulohy.length ? "#A34A2A" : "#85867B", color: "#fff", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{ulohy.length}</span>
        </button>
        {piny.map((id) => { const v = VSE.find((x) => x.id === id); if (!v) return null; return (
          <button key={id} onClick={() => otvorPolozku(id)} className="sc-bdh" style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 16px 0 12px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>
            <Ik d={v.d} s={18} />{v.t}
          </button>); })}
        <span style={{ flex: 1 }} />
        <button onClick={() => setPinOtv((o) => !o)} aria-expanded={pinOtv} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 14px", border: "none", borderRadius: 13, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "var(--green)" }}>
          <Ik d={IK.pin} s={17} c="currentColor" w={2.2} />Upraviť pripnuté
        </button>
      </div>
      {pinOtv && <div style={{ position: "absolute", right: 8, left: mobil ? 8 : undefined, top: 58, zIndex: 20, width: mobil ? undefined : 340, maxHeight: 420, overflowY: "auto", overscrollBehavior: "contain", padding: 8, borderRadius: 18, background: "var(--bg)", border: "1px solid var(--cardBd)", boxShadow: "0 16px 40px rgba(30,28,20,.2)", display: "flex", flexDirection: "column", gap: 2, animation: "spravaFade .15s ease both" }}>
        <span style={{ padding: "8px 10px 6px", fontSize: 13, color: "var(--ink3)" }}>Pripnite si, čo používate najčastejšie. Najviac 6.</span>
        {VSE.map((v) => { const on = piny.includes(v.id); return (
          <button key={v.id} role="checkbox" aria-checked={on} onClick={() => prepniPin(v.id)} style={{ minHeight: 46, padding: "0 10px", border: "none", borderRadius: 12, background: on ? "var(--gSoft)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{v.t}</span><span style={{ fontSize: 12, color: "var(--ink3)" }}>{v.g}</span></span>
            <span style={{ width: 24, height: 24, flex: "none", borderRadius: 7, border: `1.5px solid ${on ? "var(--green)" : "#A8A396"}`, background: on ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.fajka} s={14} c="#fff" w={3} style={{ opacity: on ? 1 : 0 }} /></span>
          </button>); })}
        <button onClick={() => setPinOtv(false)} style={{ height: 46, marginTop: 6, border: "none", borderRadius: 13, background: "var(--green)", cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "#fff", flex: "none" }}>Hotovo</button>
      </div>}
    </section>);

  const treba = (<>
    <span ref={trebaRef} style={{ ...nadpisSekcie, scrollMarginTop: 80 }}>TREBA VYBAVIŤ</span>
    {ulohy.length === 0
      ? <section style={{ ...karta, padding: "18px 20px", fontSize: 14.5, color: "var(--ink2)" }}>Všetko je vybavené.</section>
      : <section style={{ ...karta, padding: mobil ? "0 14px" : "0 20px" }}>
        {ulohy.map(([dot, t, s, b], i) => (
          mobil
            ? <div key={t} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <span style={{ display: "flex", alignItems: "flex-start", gap: 10 }}><span style={{ width: 10, height: 10, flex: "none", borderRadius: "50%", background: dot, marginTop: 6 }} /><span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span></span>
              <button onClick={() => otvor(`x:${b}`)} style={{ ...zeleneTl, alignSelf: "flex-end" }}>{b}</button>
            </div>
            : <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 72, padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <span style={{ width: 10, height: 10, flex: "none", borderRadius: "50%", background: dot }} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
              <button onClick={() => otvor(`x:${b}`)} style={zeleneTl}>{b}</button>
            </div>))}
      </section>}
  </>);

  const zbierky = !nova && (<>
    <span style={nadpisSekcie}>BEŽIACE ZBIERKY</span>
    <div className="sc-lista" style={mobil ? { display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", scrollPaddingLeft: 14, margin: "0 -14px", padding: "0 14px" } : { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
      {PH_ZBIERKY.map((z) => (
        <button key={z.t} onClick={() => otvor("g_zbierky")} style={{ flex: "none", width: mobil ? 290 : undefined, scrollSnapAlign: "start", ...karta, borderRadius: mobil ? 18 : 22, padding: 0, overflow: "hidden", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column" }}>
          <span style={{ display: "block", width: "100%", aspectRatio: mobil ? undefined : "16/6", height: mobil ? 110 : undefined, background: z.bg }} />
          <span style={{ padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 8, width: "100%", boxSizing: "border-box" }}>
            <b style={{ fontSize: 16, color: "var(--ink)" }}>{z.t}</b>
            <Pruh sc={z.c ? z.v / z.c : 1} />
            <span style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, color: "var(--ink3)" }}><span><b style={{ color: "var(--ink)" }}>{eur(z.v)}</b>{z.c ? ` z ${eur(z.c)}` : ""}</span><span>{z.d}</span></span>
            <span style={{ alignSelf: "flex-start", height: 26, padding: "0 10px", borderRadius: 13, background: z.dn ? "var(--gSoft)" : "var(--btn)", color: z.dn ? "var(--gInk)" : "var(--ink3)", display: "flex", alignItems: "center", fontSize: 12.5, fontWeight: 800 }}>{z.dn ? `dnes +${z.dn} €` : "dnes zatiaľ nič"}</span>
          </span>
        </button>))}
    </div>
  </>);

  const pravy = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: mobil ? 0 : 28 }}>
      <section style={{ ...karta, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Ik d={IK.retaz} c="#4E7D37" w={2} /><b style={{ flex: 1, fontSize: 16 }}>Reťaz dobra</b><span style={{ fontSize: 13, fontWeight: 800, color: "var(--gInk)" }}>{nova ? "0 €" : "640 €"}</span></div>
        <span style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: -4 }}>ľudia, ktorí sa pripojili k vašim zbierkam</span>
        {nova
          ? <span style={{ paddingTop: 10, borderTop: "1px solid var(--cardBd)", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>Zatiaľ sa nikto nepripojil. Keď niekto spustí zbierku pre vás, uvidíte ho tu.</span>
          : RETAZ.map(([i, n, z, v]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: "1px solid var(--cardBd)" }}>
              <span style={{ width: 32, height: 32, flex: "none", borderRadius: "50%", background: "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "var(--gInk)" }}>{i}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14 }}>{n}</b><span style={{ fontSize: 12, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z}</span></span>
              <b style={{ flex: "none", fontSize: 14 }}>{v}</b>
            </div>))}
      </section>
      <section style={{ borderRadius: 22, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Ik d={IK.budova} c="var(--gold)" w={2} /><b style={{ flex: 1, fontSize: 16 }}>Dorovnávané zbierky</b><span style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)" }}>{nova ? "" : "1 beží"}</span></div>
        <span style={{ fontSize: 12.5, color: "var(--cuInk2)", marginTop: -4 }}>partneri, ktorí pridávajú k darom ľudí</span>
        {nova
          ? <span style={{ paddingTop: 10, borderTop: "1px solid rgba(135,103,18,.25)", fontSize: 13.5, lineHeight: 1.45, color: "var(--cuInk2)" }}>Zatiaľ žiadna firma nedorovnáva. Keď sa partner zapojí, uvidíte tu jeho rozpočet.</span>
          : <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "1px solid rgba(135,103,18,.25)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b style={{ flex: 1, fontSize: 14 }}>Pekáreň Dobrota s.r.o.</b><span style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)" }}>1 : 1</span></div>
            <span style={{ fontSize: 12, color: "var(--cuInk2)" }}>Strecha pre rodinu Horváthovú · do 300 € na dar</span>
            <Pruh sc={620 / 1000} h={6} bg="rgba(135,103,18,.2)" c="var(--gold)" />
            <span style={{ fontSize: 12, color: "var(--cuInk2)" }}>dorovnané 620 € z 1 000 €</span>
          </div>}
      </section>
    </div>);

  if (mobil) return (<>{cisla}{pinBar}{treba}{zbierky}{pravy}</>);
  return (<>
    <div style={{ flex: "none", display: "flex", alignItems: "flex-start", gap: 14 }}>
      <KartaStitu stit={stit} onZoom={onZoom} vyska={vyska} />
      {cisla}
    </div>
    {pinBar}
    <div style={{ flex: "none", display: "grid", gridTemplateColumns: "minmax(0,1fr) 264px", gap: 20, alignItems: "start" }}>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{treba}{zbierky}</div>
      {pravy}
    </div>
  </>);
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
  const { mobil, otvor } = s;
  return (<>
    <div role="tablist" style={{ flex: "none", display: "flex", gap: 2, padding: 4, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", alignSelf: mobil ? "stretch" : "flex-start" }}>
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
          <button onClick={() => otvor("x:Správa zbierky")} style={{ minHeight: 44, border: "none", background: "transparent", cursor: "pointer", whiteSpace: "nowrap", fontSize: 14.5, fontWeight: 800, color: "var(--green)", gridColumn: mobil ? "1 / -1" : undefined, justifySelf: mobil ? "end" : undefined }}>Spravovať ›</button>
        </div>))}
    </section>
    <span style={{ flex: "none", fontSize: 17, fontWeight: 800 }}>Ďalšie druhy zbierok</span>
    <Mriezka karty={DRUHY} {...s} />
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
  const pristup: [string, string, boolean, () => void][] = [
    ["Obmedziť animácie", "bez letov, iskier a pulzovania", n.obmedzAnim, () => zmenNastavenia({ obmedzAnim: !n.obmedzAnim })],
    ["Vibrácie", "pri potvrdení a po dare", n.vibracie, () => zmenNastavenia({ vibracie: !n.vibracie })],
    ["Titulky vo videách", "vždy zapnuté", n.titulky, () => zmenNastavenia({ titulky: !n.titulky })],
    ["Potvrdzovať ťuknutím", "namiesto podržania, pri platbe dvakrát ťukni", tuk, () => { nastavPotvrditTuknutim(!tuk); setTuk(!tuk); }],
  ];
  const sekcie: [string, Riadok[]][] = [
    ["OZNÁMENIA", [{ t: "Čo chcete dostávať", s: "nový dar, nový darca, lehota na doklady, správy", tap: pr("Čo chcete dostávať") }, { t: "Tichý čas", s: "22:00 – 7:00", prep: [tichy, () => setTichy((x) => !x)] }]],
    ["PRÍJEM DAROV", [{ t: "Dary v EURC", v: "podľa zbierky", tap: pr("Dary v EURC") }, { t: "Transparentný účet", v: "SK31 … 4417", tap: pr("Transparentný účet") }]],
    ["SPRÁVCOVIA", [{ t: "Správcovia a prístupy", s: "kto spravuje stránku, pozvať ďalšieho", v: "1", tap: pr("Správcovia a prístupy") }]],
    ["ORGANIZÁCIA", [{ t: "Údaje organizácie", s: "IČO, sídlo, fakturačné údaje", tap: pr("Údaje organizácie") }, { t: "Program a platba", v: PROGRAM_NAZOV[tier], tap: pr("Program a platba") }]],
    ["BEZPEČNOSŤ A ÚDAJE", [{ t: "Prihlásené zariadenia", v: "2", tap: pr("Prihlásené zariadenia") }, { t: "Súhlasy", tap: pr("Súhlasy") }, { t: "Stiahnuť údaje charity", s: "zbierky, darcovia a doklady v jednom súbore", tap: pr("Stiahnuť údaje charity") }]],
    ["POMOC", [{ t: "Časté otázky", tap: pr("Časté otázky") }, { t: "Napísať podpore", tap: pr("Napísať podpore") }]],
    ["STRÁNKA", [{ t: "Zrušiť stránku charity", red: true, tap: pr("Zrušiť stránku charity") }]],
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
function DevSprava({ tier, stit, nova, onTier, onStit, onNova }: { tier: Tier; stit: StitCharity; nova: boolean; onTier: (t: Tier) => void; onStit: (s: StitCharity) => void; onNova: () => void }) {
  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, minHeight: 32, padding: "0 4px", borderRadius: 8, border: `1px solid ${on ? "var(--ink)" : "transparent"}`, background: on ? "var(--ink)" : "transparent", color: on ? "var(--bg)" : "var(--ink2)", fontSize: 11.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" });
  return (
    <div aria-label="DEV" style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 14, border: "1px dashed var(--ink4)", fontSize: 11.5, color: "var(--ink3)" }}>
      <b style={{ fontSize: 11, letterSpacing: ".07em" }}>DEV · len testovacia verzia</b>
      <span>Program</span>
      <div style={{ display: "flex", gap: 2 }}>{([0, 1, 2, 3, 4] as Tier[]).map((t) => <button key={t} onClick={() => onTier(t)} style={seg(t === tier)}>{PROGRAM_NAZOV[t]}</button>)}</div>
      <span>Štít</span>
      <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>{(Object.keys(STITY) as StitCharity[]).map((k) => <button key={k} onClick={() => onStit(k)} style={seg(k === stit)}>{STITY[k][3]}</button>)}</div>
      <span>Stav</span>
      <div style={{ display: "flex", gap: 2 }}><button onClick={() => nova && onNova()} style={seg(!nova)}>Bežná</button><button onClick={() => !nova && onNova()} style={seg(nova)}>Nová charita</button></div>
    </div>);
}
