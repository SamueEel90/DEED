// ============================================================
// KARTA 57C §1 — živá verejná stránka farnosti (prototyp „Farnost nastenka - zivo“).
// Číta všetko z uloženého: Upraviť profil, hlavná zbierka, zvončeková (omšové okno), zbierky farnosti,
// omše a online omše, príhovor, oznamy farára (Oznamy v Správe) a príspevky veriacich (odFarnikov).
// Mapa blok ← úložisko: MAPA-NASTENKY.md. Prázdny blok sa nezobrazí; prázdna farnosť = titulka + jedna veta.
// Žiadne ukážkové dáta. Úmysel na omšu nikdy. Pomôž, Videá a Farár spravuje aj zatiaľ nemajú úložisko → skryté.
// Darcovia hlavnej zbierky: z ledgera, vždy „Bohu známy veriaci“ (voľba mena sa ešte nezapisuje), suma jedného
// darcu nikdy; zvončeková = jeden súhrnný riadok za nedeľu.
// ============================================================
import { useZamokVrstvy } from "@/lib/zamokVrstvy";
import { useFarbaLinie, useVolbaLinie } from "@/lib/liniaStranky";
import { useRozlozenie } from "@/lib/rozlozenieFarnosti";
import { SERIF_KRONIKY, KNadpis, KDatum, ZbierkaStvorec, PomozKarta, SvateOmse, Zapis, SpomZapis, ArchivRokov, KronikaHladat, KronikaLista, useSerifKroniky, type RokArchivu, type ZapisArchivu, type NajdenePolozka } from "./KronikaFarnosti";
import { useStretnutia, skoncilo } from "@/lib/detiMladez";
import { useMiesta, nazovDruhu, type Miesto } from "@/lib/miestaFarnosti";
import { ZbalenyBlok, useZbaleneBloky } from "./ZbalenyBlok";
import { Lupa } from "@/components/icons";
import { MDlazdica, MIkona, MLista, MNadpis, PasX, Sipky, sirkaKarty, useAspon, usePas, type MBlokId } from "./ModerneFarnosti";
import { KartaMiesta, najblizsiaOmsa, NaseKostolyBlok, PodstrankaMiesta, otvorKostolPoPrichode, vezmiCakajuciKostol } from "./NaseKostoly";
import { uradneUdaje } from "@/lib/uradneUdaje";
import { OknoUpozorneni, type CielUpozorneni } from "./OknoUpozorneni";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { ProfilStranky } from "@/lib/profilStranky";
import { cistyText } from "@/lib/richtext";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useMojeStranky } from "@/lib/mojeStranky";
import { CIRKVI, useMojeFarnosti, useSlovaFarnosti, pridajSledovanu, odstranSledovanu, nazovFarnosti, otvorAdresar, sledujemKostol, sledujKostol, prestanKostol, nastavMojKostol, type SledovanyKostol } from "@/lib/mojeFarnosti";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";
import { otvorVerejnyProfil, odkazQrStranky } from "./otvor";
import { centralnaZPamate, nacitajCentralnuZbierku, nazovHlavnej, useZmenyCentralnej } from "@/lib/centralnaZbierka";
import { naviazObjekt } from "@/lib/darZbierky";
import { usePripnute, useCezStranku, dalsiMilnik, type ZbierkaNaPripnutie } from "@/lib/pripnuteZbierky";
import { nastavZdrojDaru } from "@/lib/darZbierky";
import { chipPripnutej, farbaPripnutej } from "@/features/rola/PripnuteZbierky";
import { useBrigady, skoncila } from "@/lib/brigady";
import { ModulPlatby } from "./ModulProfilu";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { ZmensenyModul } from "@/features/zbierka/ZmensenyModul";
import type { TestProfil, TestSektor } from "@/lib/testProfily";
import { kedyBrigady } from "@/features/rola/BrigadyFarnosti";
import { useDarcovia, sucetDarov, relCas, nastavCiste, SumyDarcovKontext, SektorDarcuKontext, type DarRiadok } from "@/lib/darcovia";
import { useOmsoveOkno, suhrnHlavnej, menaOkna } from "@/lib/omsoveOkno";
import { nacitajZbierkyStranky, zbierkyStrankyZPamate, useZmenyZbierok, cielCislo, type SpustenaZbierka } from "@/lib/novaZbierka";
import { useKalendar, kostolKal, omseDna, polozkyDna, druhPolozky, minuty, iso, dvt, nazovOmse, nedelneOmse, rozsahTyzdna } from "@/lib/kalendarFarnosti";
import { prihovor, useZmenyPrihovoru, naZivo, onlineOmse, onlineVDen } from "@/lib/prihovor";
import { odFarnikov, useOdFarnikov, useCerstveOdFarnikov, prepniVPolozke, vyprsal, pocetSus, type PolozkaFarnika, type PoleReakcie } from "@/lib/odFarnikov";
import { reakcieF, prepniReakciuF, useReakcieF, useCerstveReakcieF, type PoleReakcieF } from "@/lib/reakcieFarnosti";
import { vlastnePrispevky, vlastnePrispevkyVsetky, type VieraFeedItem } from "@/features/viera/mock";
import { usePrispevkySync } from "@/features/viera/prispevkyDB";
import { Plagat } from "@/features/viera/Sablony";
import { useVzhlad } from "@/lib/vzhladStranky";
import { stitokOznamu, plagatTyzdna } from "@/features/rola/OmseKalendar";
import { druhDna, farbyDna, prikazanySviatok } from "@/lib/liturgia";
import { DetiAMladezBlok } from "./DetiAMladez";
import { usePrispela } from "@/lib/farnostPrispela";
import { klucJa, MenuPrispevku, CelaObrazovka, ProhliadacAlbumu, nastavFabRezim, otvorPridanie } from "./FarnikPridava";
import { ZbierkaModul, type ZbierkaData } from "@/features/zbierka/ZbierkaModul";
import type { StitLevel } from "@/components/stit";
import { toast } from "@/shared";
import { SADY_EUR, SADY_EURC } from "@/lib/sadyDarov";
import { useLayout } from "@/components/context";

import "@/styles/nastenka.css";
import { useVerejnyObrazok, type PayloadEditora } from "@/components/EditorOznameni";
import { ParteMedailon, TvarOznamu, PARTE, SVADBA, JUBILEUM, BLAHOZELANIE, ZAKLAD, BORDOVA, symbolCirkvi, kickerTvaru, SERIF_TVARU, type Paleta } from "./Medailony";
import { Darcovia } from "@/features/zbierka/Riadky";
import { useQrObrazok } from "@/lib/qrObrazok";
import type { AutorF } from "@/lib/autorFarnosti";
import { DNI_UH, casyUH, maUH, textCasu } from "@/lib/uradneHodiny";
import { useSumyDarcov } from "@/lib/sumyDarcov";
import { odkazZbierky } from "@/features/zbierka/Zdielat";
// ---- farby Nástenky: premenné podľa témy appky (OPRAVY 203, styles/nastenka.css) ----
const BG = "var(--nf-bg)", KARTA = "var(--nf-karta)", INK = "var(--nf-ink)", INK2 = "var(--nf-ink2)", INK3 = "var(--nf-ink3)", LINKA = "var(--nf-linka)", PAPIER = "var(--nf-papier)";
const TEAL = "var(--nf-teal)", ZELENA = "var(--nf-zelena)", FIALOVA = "var(--nf-fialova)", CERVENA = "var(--nf-cervena)", ZLATA = "var(--nf-zlata)";
/** pozadie tlačidiel s bielym textom — v oboch témach tmavé */
const ZELENA_TL = "#4B7A35", TEAL_TL = "#2F7A78";
/** svetlé premenné pre spoločné kúsky (··· Nahlásiť, celé obrazovky) — nástenka je zatiaľ len svetlá */
const PREMENNE = { "--ink": INK, "--ink2": INK2, "--ink3": INK3, "--card": PAPIER, "--cardBd": LINKA, "--field": PAPIER, "--btn": KARTA, "--gSoft": "var(--nf-gSoft)", "--gBd": "var(--nf-gBd)", "--gInk": "var(--nf-gInk)", "--goldBg": "var(--nf-zlBg)", "--bg": BG } as CSSProperties;
const PAD_X = "clamp(20px,5vw,72px)";
const MES = ["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"];
const DNW = ["pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota", "nedeľa"];
const DNW_V = ["PONDELOK", "UTOROK", "STREDA", "ŠTVRTOK", "PIATOK", "SOBOTA", "NEDEĽA"];
const ludi = (n: number) => `${n} ${n === 1 ? "človek" : n >= 2 && n <= 4 ? "ľudia" : "ľudí"}`;
const fotiek = (n: number) => `${n} ${n === 1 ? "fotka" : n >= 2 && n <= 4 ? "fotky" : "fotiek"}`;
const eur = (n: number) => `${Math.round(n).toLocaleString("sk-SK")} €`;
const dd = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const zIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const terazMs = () => Date.now();
const terazD = () => new Date();
const vcera = () => { const d = terazD(); d.setDate(d.getDate() - 1); return iso(d); };
const ziveObr = (u?: string | null) => !!u && !/^blob:/.test(u);
const bezPredpony = (s: string) => s.replace(/^[^·]*·\s*/, "");
const iniciy = (m: string) => m.split(/\s+/).filter((w) => w.length > 1 && w !== "Farnosť").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "F";

// OPRAVY 243: nad každým blokom farebná čiara 3 px (farba línií stránky, --nf-linia)
const blokStyl = (pozadie?: string): CSSProperties => ({ display: "flex", flexWrap: "wrap", gap: "20px 40px", padding: `48px ${PAD_X}`, borderTop: "3px solid var(--nf-linia)", background: pozadie, scrollMarginTop: 16 });
const nadpisBloku: CSSProperties = { fontSize: "clamp(32px,3.2vw,44px)", lineHeight: 1.02, letterSpacing: "-.035em" };
const kicker = (c = INK3): CSSProperties => ({ fontSize: 14, fontWeight: 800, letterSpacing: ".12em", color: c });
/** tlačidlo reakcie podľa prototypu (tmavé = hlavné, svetlé = sústrasť) */
const tlacR = (ja: boolean, tmave: boolean, plne = false): CSSProperties => ({
  minHeight: 48, padding: "0 18px", borderRadius: 13, cursor: plne ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap",
  border: ja ? `2px solid ${ZELENA}` : tmave ? "2px solid var(--nf-plne)" : `1.5px solid ${LINKA}`,
  background: plne ? "var(--nf-vyp)" : ja ? "var(--nf-gSoft)" : tmave ? "var(--nf-plne)" : PAPIER,
  color: plne ? INK2 : ja ? "var(--nf-gInk)" : tmave ? "var(--nf-plneInk)" : INK,
});

export function posunNaBlok(blok: string) {
  document.querySelector(`[data-blok="${blok}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export interface NastenkaProps {
  strankaId: string; meno: string; profil: ProfilStranky | null;
  /** zelené + je zapnuté (miesto dole, nech ho nič neprekryje) */
  fab?: boolean;
  /** „‹ Späť“ vľavo hore (stránka otvorená v appke) */
  onBack?: () => void;
  /** OPRAVY 225: náhľad vlastnej stránky zo Správy — „‹ Späť do Správy“ a štítok namiesto Sledovať */
  nahlad?: boolean;
  /** štít stránky (riadok „kto za zbierku zodpovedá“ v module) */
  stit: StitLevel;
}

/** OPRAVY 205: položka Spomíname — parte (farár, veriaci) a k nemu zbierka rodiny */
interface Spom { id: string; it?: VieraFeedItem; x?: PolozkaFarnika; zb?: SpustenaZbierka; obr: string; pal: Paleta; foto?: string;
  d: { meno: string; nar: string; umr: string; rd: string; rc: string; rm: string; head: string } }
/** OPRAVY 205: položka Teš sa s nami */
interface Tes { af?: AutorF; id: string; druh: "svadba" | "jubileum" | "blaho"; pal: Paleta; meno: string; datum: string; vek: string; nadpis: string; x?: PolozkaFarnika; zb?: SpustenaZbierka;
  /** BLOK C 235: Blahoželanie z Editora — meno pod nadpisom šablóny */ pod?: string;
  /** OPRAVY 228: oznam Správy (celé oznámenie po ťuknutí) */ it?: VieraFeedItem;
  /** OPRAVY 229: štvorec poďakovania (Ďakujem) — inak Blahoželám */ dakuje?: boolean;
  /** Martin 13. 10.: „Iné“ (vysviacka, primície…) = OZNÁMENIE, nikdy nie vymyslené Poďakovanie */ ine?: boolean;
  /** OPRAVY 241: prvá fotka alebo plagát Iné — v štvorci orezaná, štítok a nadpis pod ním */ foto?: string;
  r: { zoznam: string[]; prepni: () => void }; mena: Record<string, string> }
const rok = (s?: string) => s?.match(/\d{4}/)?.[0] ?? "";
const rokyParte = (nar: string, umr: string) => { const a = rok(nar), b = rok(umr); return a || b ? [a && `* ${a}`, b && `† ${b}`].filter(Boolean).join(" ") : nar; };
const DNI_V = ["v nedeľu", "v pondelok", "v utorok", "v stredu", "vo štvrtok", "v piatok", "v sobotu"];
const rozluckaT = (rd: string, rc: string) => { const m = rd.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return ""; const d = new Date(+m[1], +m[2] - 1, +m[3]); return `rozlúčka ${DNI_V[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.${rc ? ` o ${rc.replace(":", ".")}` : ""}`; };
const datumT = (s: string) => { const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[3]}. ${+m[2]}. ${m[1]}` : s; };
const vekJubilea = (nar?: string, kedy?: string) => { const a = rok(nar), b = rok(kedy) || String(new Date().getFullYear()); return a ? String(+b - +a) : ""; };
/** OPRAVY 241: text nikdy nepretečie z tvaru — najviac n riadkov, potom „…“ */
const riadkyMax = (n: number): CSSProperties => ({ maxWidth: "100%", display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" });
/** OPRAVY 229: 1 rok · 2–4 roky · 5+ rokov */
const rokyT = (n: number) => (n === 1 ? "ROK" : n >= 2 && n <= 4 ? "ROKY" : "ROKOV");
const sestSlov = (t: string) => { const w = t.trim().split(/\s+/).filter(Boolean); return w.length > 6 ? `${w.slice(0, 6).join(" ")} …` : t.trim(); };
const reakT = (dakuje: boolean, n: number) => n === 1 ? `${dakuje ? "Ďakuje" : "Blahoželá"} 1 človek` : n < 5 ? `${dakuje ? "Ďakujú" : "Blahoželajú"} ${n} ľudia` : `${dakuje ? "Ďakuje" : "Blahoželá"} ${n} ľudí`;

/** BLOK C 235: Blahoželanie z Editora oznámení — miniatúra podľa šablóny b1–b16 (podklad = pozadie, rám = farba ozdôb);
 *  s rokmi kosoštvorec (2c), inak štvorec s nadpisom šablóny a menom (2d) */
function tesBlaho(ed: PayloadEditora, z: Pick<Tes, "id" | "nadpis" | "r" | "mena"> & Partial<Pick<Tes, "x" | "af">>): Tes {
  const P0 = (ed.polia ?? {}) as Record<string, unknown>, pole = (k: string) => String(P0[k] ?? "").trim();
  const m = ed.miniatura ?? {}, zak = (ed.sablona && BLAHOZELANIE[ed.sablona]) || ZAKLAD.blaho;
  const pal: Paleta = { ...zak, bg: m.podklad || zak.bg, ac: m.ram || zak.ac };
  const roky = m.roky ? String(m.roky) : (pole("bVek").match(/\d+/)?.[0] ?? ""), meno = pole("bMeno") || z.nadpis;
  return roky ? { ...z, druh: "jubileum", pal, meno, datum: pole("bD"), vek: roky }
    : { ...z, druh: "blaho", pal, meno, datum: pole("bD"), vek: "", nadpis: zak.head || z.nadpis, pod: pole("bMeno") || undefined };
}

/** OPRAVY 205: obsah tvaru — svadba mená a dátum, jubileum roky a meno, blahoželanie nadpis */
function ObsahTvaru({ t, velky }: { t: Tes; velky?: boolean }) {
  const k = velky ? 1.35 : 1;
  if (t.druh === "svadba") { const [a, b] = t.meno.split(/\s*(?:&| a )\s*/); return <>
    <span style={kickerTvaru(t.pal.ac)}>SVADBA</span>
    <i style={{ fontSize: (a.length > 14 ? 19 : 26) * k, lineHeight: 1.05, marginTop: 4, ...riadkyMax(2) }}>{a}</i>
    {b && <><i style={{ fontSize: 18 * k, color: t.pal.ac }}>&amp;</i><i style={{ fontSize: (b.length > 14 ? 19 : 26) * k, lineHeight: 1.05, ...riadkyMax(2) }}>{b}</i></>}
    {t.datum && <span style={{ fontSize: 14 * k, marginTop: 6 }}>{datumT(t.datum)}</span>}
  </>; }
  if (t.druh === "jubileum") { const n = +t.vek, dlzka = t.meno.length; return <>
    <span style={kickerTvaru(t.pal.fg)}>JUBILEUM</span>
    {t.vek ? <><b style={{ fontSize: 52 * k, fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em" }}>{t.vek}</b><span style={{ ...kickerTvaru(t.pal.fg), letterSpacing: ".16em" }}>{rokyT(n)}</span></> : null}
    {/* OPRAVY 229: dlhé meno menším písmom, najviac 2 riadky, inak „…" */}
    <i style={{ fontFamily: SERIF_TVARU, fontSize: (dlzka > 22 ? 13 : dlzka > 14 ? 15 : 18) * k, marginTop: 2, lineHeight: 1.15, maxWidth: "100%", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>{t.meno}</i>
  </>; }
  // OPRAVY 241: Iné s fotkou alebo plagátom = obrázok orezaný na štvorec (štítok a nadpis sú pod tvarom)
  if (t.ine && t.foto) return <span style={{ alignSelf: "stretch", margin: "0 -14px", height: "100%", borderRadius: 20, overflow: "hidden", display: "block" }}><img src={t.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></span>;
  return <>
    <span style={kickerTvaru(t.pal.ac)}>{t.ine ? "OZNÁMENIE" : t.dakuje ? "POĎAKOVANIE" : "BLAHOŽELANIE"}</span>
    {/* OPRAVY 229 · 241: v tvare len nadpis, najviac 3 riadky a „…“, text až po ťuknutí */}
    <i style={{ fontFamily: SERIF_TVARU, fontSize: 22 * k, lineHeight: 1.15, maxWidth: "100%", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sestSlov(t.nadpis)}</i>
    {t.pod && <span style={{ fontFamily: SERIF_TVARU, fontSize: 16 * k, lineHeight: 1.2, marginTop: 4, maxWidth: "100%", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.pod}</span>}
  </>;
}

/** kľúč na zväčšenie: obrázok alebo šablóna farára */
type Velke = { src: string } | { it: VieraFeedItem };

export function NastenkaFarnosti({ strankaId, meno, profil, fab, onBack, nahlad, stit: stitStranky }: NastenkaProps) {
  const kal = useKalendar(strankaId);
  useZmenyPrihovoru(); useZmenyCentralnej(); useZmenyZbierok(); useOdFarnikov(); useReakcieF();
  useCerstveOdFarnikov(strankaId); useCerstveReakcieF(strankaId); usePrispevkySync(strankaId);
  useEffect(() => { void nacitajCentralnuZbierku(strankaId); void nacitajZbierkyStranky(strankaId); }, [strankaId]);
  const vz = useVzhlad(strankaId, false);
  const ja = usePouzivatel();
  useMojeStranky(); // OPRAVY 256: zmena roly v Konáš ako → stránka sa hneď prepočíta
  const kto = klucJa(ja), reg = ja.typ !== "pasivny", mojeMeno = ja.celeMeno?.trim() || "veriaci";
  const MF = useMojeFarnosti();
  const [mfOn, setMfOn] = useState(false);
  const [mfNove, setMfNove] = useState(false);
  const [sledChyba, setSledChyba] = useState(""); // OPRAVY 256: zlyhanie priamo na tlačidle, nikdy ticho
  const [mfHl, setMfHl] = useState<string | null>(null);
  const [upoz, setUpoz] = useState<CielUpozorneni | null>(null); // KARTA 63 1a
  const [cas, setCas] = useState(terazD);
  useEffect(() => { const t = window.setInterval(() => setCas(terazD()), 60000); return () => window.clearInterval(t); }, []);
  const [prihOn, setPrihOn] = useState(false);
  const [onasOtv, setOnasOtv] = useState(false); // OPRAVY 221: príhovor jedna veta + viac
  const { okno: zvOkno } = useOmsoveOkno(strankaId), zvNedela = zvOkno.nedela;
  const [velke, setVelke] = useState<Velke | null>(null);
  const [album, setAlbum] = useState<PolozkaFarnika | null>(null);
  const [osoba, setOsoba] = useState<string | null>(null); // OPRAVY 196: profil autora
  const { wide: siroka, desktop: pc } = useLayout();
  /** OPRAVY 205: na mobile medailóny a tvary menšie, dva vedľa seba */
  const mriezkaTvarov: CSSProperties = siroka ? { display: "flex", flexWrap: "wrap", gap: "28px 36px", alignItems: "flex-start" } : { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 8px", justifyItems: "center", alignItems: "start" };
  const zmensi: CSSProperties = siroka ? {} : { zoom: 0.72 } as CSSProperties;
  const [parte, setParte] = useState<Spom | null>(null); // OPRAVY 204: parte + zbierka rodiny
  const [tes, setTes] = useState<Tes | null>(null); // OPRAVY 205: Blahoželám a zoznam
  const [zoz, setZoz] = useState<string | null>(null);
  const [det, setDet] = useState<DetailF | null>(null);
  // OPRAVY 240: kým je otvorená plná vrstva, stránka pod ňou sa neposúva ani nepruží
  useZamokVrstvy(!!(prihOn || tes || osoba || parte || det || album));
  const onDetail = (data: ZbierkaData, o: Omit<DetailF, "data">) => setDet({ data, ...o });

  const VJ = kal.verejne, kk = kostolKal(strankaId);
  const vc = vcera();
  const orgPole = { meno, typ: "charita" as const, mesto: "", cisla: [] as [string, string][], obrazok: profil?.logo ?? undefined, stit: stitStranky };

  // ---------- titulka ----------
  const cover = profil?.cover?.src && ziveObr(profil.cover.src) ? profil.cover.src : "";
  const logo = !profil?.bezLoga && profil?.logo ? profil.logo : null;
  const inic = (profil?.bezLoga && profil.inicialy?.trim().toUpperCase()) || iniciy(meno);
  const p = prihovor(strankaId);
  const zivoT = VJ.omse ? naZivo(strankaId, cas) : null, zivoUrl = onlineOmse(strankaId).url.trim();
  // KARTA 60 §3: vzťah k tejto farnosti — domovská · sledovaná · cudzia
  const jeHl = MF.domovska === strankaId, jeSl = !jeHl && MF.sled.includes(strankaId);
  const sledT = sledChyba ? sledChyba : jeHl ? "Moja farnosť" : jeSl ? (mfNove ? "Sledovaná farnosť ✓" : "Sledovaná farnosť") : "Sledovať farnosť";
  const sledTap = () => {
    if (jeHl || jeSl) { setMfOn(true); return; }
    setSledChyba("");
    void pridajSledovanu(strankaId).catch((e: Error) => { setSledChyba(e?.message || "Nepodarilo sa · skúsiť znova"); setUpoz(null); window.setTimeout(() => setSledChyba(""), 5000); });
    setUpoz({ stranka: strankaId, nazovFarnosti: meno }); // KARTA 63 1a: po ťuknutí Sledovať „O čom vám dáme vedieť?“
    setMfNove(true); window.setTimeout(() => setMfNove(false), 2500);
  };

  // ---------- O nás + hlavná ----------
  const onas = cistyText([profil?.onas, profil?.onas2].filter(Boolean).join("\n")).trim();
  const hl = centralnaZPamate(strankaId);
  const hlOn = !!hl?.spustena;
  const hlRef = `${strankaId}-centralna`;
  nastavCiste([hlRef]); // bod 0: žiadni ukážkoví darcovia
  if (hlOn) naviazObjekt(hlRef, { stranka: strankaId, hlavna: true, nazov: nazovHlavnej(hl) });
  const hlTxt = hl ? cistyText(hl.popis).trim() : "";

  // ---------- zbierky ----------
  const zb = zbierkyStrankyZPamate(strankaId).filter((z) => (z.stav ?? "aktivna") === "aktivna");
  const druh = (z: SpustenaZbierka) => z.farnost?.druh ?? "farnost";
  const zbFar = zb.filter((z) => druh(z) === "farnost"), zbIne = zb.filter((z) => druh(z) === "ine");
  const zbPohreb = zb.filter((z) => druh(z) === "pohreb"), zbSvadba = zb.filter((z) => druh(z) === "svadba");
  const zvOn = hlOn && nedelneOmse(strankaId).length > 0;
  const piny = usePripnute(strankaId); // OPRAVY 187: zbierky iných subjektov pripnuté farnosťou
  const brigadyF = useBrigady(strankaId); // KARTA 61 §2
  const detailZbierky = (z: SpustenaZbierka): ZbierkaData => ({
    id: z.id, nazov: z.nazov, popis: cistyText(z.popis), overena: true, ciel: cielCislo(z) || undefined, ...sadyZbierky(z),
    media: z.media.filter((m) => ziveObr(m.src)).map((m) => (m.typ === "video" ? { typ: "video" as const, src: m.src } : { typ: "foto" as const, src: m.src })),
    organizacia: orgPole,
  });

  const otvorZbierku = (z: SpustenaZbierka) => {
    const d = druh(z), rod = d !== "farnost", t = rod ? bezPredpony(z.nazov) || "Zbierka" : z.nazov || "Zbierka";
    onDetail({ ...detailZbierky(z), nazov: rod ? `Zbierka rodiny · ${t}` : t }, { typ: rod ? "rodina" : "far", chip: d === "pohreb" ? "ZBIERKA RODINY · ROZLÚČKA" : d === "svadba" ? "SVADBA · ZBIERKA RODINY" : rod ? "ZBIERKA RODINY" : "ZBIERKA", t, txt: cistyText(z.popis),
      obr: z.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src, parte: d === "pohreb" });
  };
  // ---------- omše ----------
  const omseD = (d: Date) => VJ.omse ? [...omseDna(kk, d).filter((o) => !o.zrusena).map((o) => ({ t: o.t, n: nazovOmse(o.kod) })), ...polozkyDna(kk, d).filter((x) => druhPolozky(x.typ).kat === "omse").map((x) => ({ t: x.t, n: "omša" }))].sort((a, b) => minuty(a.t) - minuty(b.t)) : [];
  const dni = Array.from({ length: 7 }, (_, i) => { const d = new Date(cas.getFullYear(), cas.getMonth(), cas.getDate() + i); return { d, i, om: omseD(d), ol: VJ.omse ? onlineVDen(strankaId, d) : [] }; });
  const maOmse = dni.some((d) => d.om.length);

  // ---------- zdroje oznamov ----------
  const OZ = vlastnePrispevky(strankaId);
  const OD = odFarnikov(strankaId).filter((x) => x.k !== "umysel" && !vyprsal(x, terazMs()) && !(x.k === "udalost" && x.f?.datum && x.f.datum < vc));
  // OPRAVY 196: hore pri všetkom od veriaceho kruh (fotka alebo začiatočné písmeno) a meno z profilu; ťuk otvorí jeho profil
  const hlavickaAutora = (x: PolozkaFarnika) => {
    const anon = !!x.anon || /Bohu známy/.test(x.kto), meno = anon ? "Bohu známy veriaci" : x.kto || "Veriaci";
    const kruh = <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: x.autorFoto && !anon ? `url("${x.autorFoto}") center/cover no-repeat` : "#4E7D37", color: "#fff", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{x.autorFoto && !anon ? "" : (meno.trim()[0] ?? "V").toLocaleUpperCase("sk-SK")}</span>;
    const obsah = <>{kruh}<span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", textAlign: "left" }}><b style={{ fontSize: 15.5, color: INK }}>{meno}</b><span style={{ fontSize: 13, color: INK3 }}>{anon ? "meno pozná len farár" : "veriaci"}</span></span></>;
    return anon ? <span style={{ display: "flex", alignItems: "center", gap: 10 }}>{obsah}</span>
      : <button type="button" onClick={() => setOsoba(meno)} aria-label={`Profil · ${meno}`} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>{obsah}</button>;
  };
  // OPRAVY 206: čo pridá Správa, má ten istý riadok autora — duchovný z Ľudia (fotka, meno s titulmi, titul podľa cirkvi)
  const SLF = useSlovaFarnosti(strankaId);
  const farbaLinie = useFarbaLinie(strankaId, SLF.cirkev); // OPRAVY 243
  // KARTA 64 · OPRAVY 244: rozloženie stránky (Nástenka · Kronika) a voľba línií (Bordová je v Kronike matná)
  const rozlozenie = useRozlozenie(strankaId);
  const volbaLinie = useVolbaLinie(strankaId, SLF.cirkev);
  const stretnutiaF = useStretnutia(strankaId);
  useSerifKroniky(rozlozenie === "kronika");
  const fotoFary = profil?.fotoFary && ziveObr(profil.fotoFary) ? profil.fotoFary : undefined;
  // KARTA 62: miesta farnosti (blok Naše kostoly len pri 2+ miestach, podstránka miesta)
  const miestaF = useMiesta(strankaId);
  const [miestoId, setMiestoId] = useState<string | null>(() => vezmiCakajuciKostol(strankaId));
  const miesto = miestoId ? miestaF.find((m) => m.id === miestoId) ?? null : null;
  const setMiesto = (m: Miesto | null) => setMiestoId(m?.id ?? null);
  // KARTA 62/63: Sledovať tento kostol → sleduje a otvorí „O čom vám dáme vedieť?“; Sledujem ✓ otvorí to isté okno (tam Prestať sledovať)
  const sledKostol = (m: Miesto) => { const on = sledujemKostol(strankaId, m.id); return (
    <button type="button" aria-pressed={on} onClick={() => { if (!on) void sledujKostol(strankaId, m.id).catch((e: Error) => toast(e.message)); setUpoz({ stranka: strankaId, nazovFarnosti: meno, miesto: { id: m.id, nazov: m.nazov } }); }}
      style={{ alignSelf: "flex-start", marginTop: 8, minHeight: 48, padding: "0 20px", borderRadius: 14, border: on ? "none" : `1.5px solid ${LINKA}`, background: on ? "var(--nf-gSoft)" : PAPIER, color: on ? "var(--nf-gInk)" : INK, fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, cursor: "pointer" }}>
      {on ? "Sledujem ✓" : "Sledovať tento kostol"}</button>); };
  // Martin 13. 10.: riadok autora = kto príspevok naozaj pridal (meno, fotka, rola); bez profilu logo a názov farnosti. Duchovný nikdy namiesto iného autora.
  const hlavickaFar = (af?: AutorF) => {
    const m = af?.meno.trim() || meno, f = af?.meno.trim() ? af.foto ?? "" : logo ?? "";
    const pod = af?.meno.trim() ? af.rola : "farnosť";
    const kruh = <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: f ? `url("${f}") center/cover no-repeat` : "#4E7D37", color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{f ? "" : iniciy(m)}</span>;
    const obsah = <>{kruh}<span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", textAlign: "left" }}><b style={{ fontSize: 15.5, color: INK }}>{m}</b><span style={{ fontSize: 13, color: INK3 }}>{pod}</span></span></>;
    return af?.meno.trim() ? <button type="button" onClick={() => setOsoba(m)} aria-label={`Profil · ${m}`} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>{obsah}</button>
      : <span style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48 }}>{obsah}</span>;
  };
  const autor = (x: PolozkaFarnika) => (x.anon || /Bohu známy/.test(x.kto) ? "Pridal veriaci" : `Pridal veriaci · ${x.kto}`);
  const moje = (x: PolozkaFarnika) => !!x.autor && x.autor === kto;
  const reakF = (ref: string, pole: PoleReakcieF) => ({ zoznam: reakcieF(strankaId, ref)[pole] ?? [], prepni: () => prepniReakciuF(strankaId, ref, pole, kto, mojeMeno) });
  const reakV = (x: PolozkaFarnika, pole: PoleReakcie) => ({ zoznam: (x[pole] as string[] | undefined) ?? [], prepni: () => prepniVPolozke(strankaId, x.id, pole, kto, undefined, mojeMeno) });
  const obrVer = (x: PolozkaFarnika) => { const o = x.obr ?? (x.editor ? x.fotky?.[0] : undefined); return ziveObr(o) ? o! : ""; };
  const obrFar = (x: VieraFeedItem) => { const o = x.smutocny?.imageUrl ?? (x.plagat ? x.fotky?.[0] : undefined); return ziveObr(o) ? o! : ""; };
  const sablonaFar = (x: VieraFeedItem) => (!obrFar(x) && x.oz?.u && x.oz.volba ? x.oz : null);
  // OPRAVY 216: oznam Správy ide do bloku podľa druhu z formulára (parte · svadba · jubileum · iné = blahoželanie), do Oznamov len krátky oznam
  // OPRAVY 229 (216): krátky oznam farára (dr 0) nikdy nie je Blahoželanie — ide do Oznamov farnosti
  const stit = (x: VieraFeedItem) => (x.oz?.dr === 2 && x.ntyp !== "udalost" ? (["PARTE", "SVADBA", "JUBILEUM", "BLAHOŽELANIE"][x.oz.odr] ?? "BLAHOŽELANIE") : x.tag === "Oznámenie" && !x.oz ? "BLAHOŽELANIE" : stitokOznamu(x));

  // ---------- Príď a zaži s nami ----------
  type Ud = { id: string; ms: number; dat: string; t: string; txt: string; kedy: string; od: string; foto: string; plag: boolean; pz: 0 | 1 | 2; limit: number; zoznam: string[]; mena: Record<string, string>; prepni: () => void; mojeX?: PolozkaFarnika; /** KARTA 61 §2: brigáda (Prídem pomôcť) */ pomoc?: boolean; af?: AutorF };
  const udFar: Ud[] = OZ.filter((x) => x.ntyp === "udalost" && (!x.datum || x.datum >= vc)).map((x) => {
    const r = reakcieF(strankaId, x.id), pz: 0 | 1 | 2 = x.pozvanie ? (x.pozvanie.zavazne ? 2 : 1) : x.rsvp ? (x.udalost?.zavazne ? 2 : 1) : 0;
    const d = x.datum ? zIso(x.datum) : null;
    return { id: x.id, ms: d?.getTime() ?? 9e15, dat: x.datum ?? "", t: x.nazov ?? "", txt: x.udalost?.text ?? "", od: "Farnosť",
      kedy: [d ? `${DNW_V[dvt(d)]} ${d.getDate()}. ${d.getMonth() + 1}.` : "", x.udalost?.cas, x.udalost?.miesto?.toLocaleUpperCase("sk-SK")].filter(Boolean).join(" · "),
      foto: ziveObr(x.fotky?.[0]) ? x.fotky![0] : "", plag: !!x.plagat, pz, limit: x.pozvanie?.limit ?? 0, zoznam: r.ucast ?? [], mena: r.mena ?? {},
      prepni: () => prepniReakciuF(strankaId, x.id, "ucast", kto, mojeMeno), af: x.af };
  });
  const udVer: Ud[] = OD.filter((x) => x.k === "udalost").map((x) => {
    const d = x.f?.datum ? zIso(x.f.datum) : null;
    return { id: x.id, ms: d?.getTime() ?? 9e15, dat: x.f?.datum ?? "", t: x.t, txt: x.s, od: autor(x),
      kedy: [d ? `${DNW_V[dvt(d)]} ${d.getDate()}. ${d.getMonth() + 1}.` : "", x.f?.cas, x.f?.kde?.toLocaleUpperCase("sk-SK")].filter(Boolean).join(" · "),
      foto: ziveObr(x.fotky?.[0]) ? x.fotky![0] : "", plag: false, pz: x.pozv ?? 0, limit: x.limit ?? 0, zoznam: x.ucast ?? [], mena: x.mena ?? {},
      prepni: () => prepniVPolozke(strankaId, x.id, "ucast", kto, undefined, mojeMeno), mojeX: x };
  });
  const udalosti = [...udFar, ...udVer].sort((a, b) => a.ms - b.ms);
  const alba = OD.filter((x) => x.k === "fotky" && x.fotky?.some(ziveObr));
  const maPrid = udalosti.length > 0 || alba.length > 0;

  // ---------- Modli sa s nami ----------
  const prosby = OD.filter((x) => x.k === "modlitba");
  // ---------- Spomíname (OPRAVY 205: medailóny; zbierka rodiny sa pripojí k svojmu parte) ----------
  const symbol = symbolCirkvi(SLF.cirkev);
  const zbPreParte = new Map(zbPohreb.filter((z) => z.farnost?.oznamenie?.prispevok).map((z) => [z.farnost!.oznamenie!.prispevok!, z]));
  // Martin 14. 10.: parte bez zbierky ide zo stránky preč 3 dni po pohrebe; parte so zbierkou rodiny ostane 7 dní po pohrebe
  // (zbierka a parte sú jeden celok). Bez dátumu rozlúčky: 7 dní od zverejnenia, so zbierkou kým zbierka beží.
  const zbParte = new Set(zbierkyStrankyZPamate(strankaId).map((z) => z.farnost?.oznamenie?.prispevok).filter((x): x is string => !!x));
  const parteZije = (id: string, rd: string, vznik: number) => {
    const t = /^\d{4}-\d{2}-\d{2}/.test(rd) ? zIso(rd.slice(0, 10)).getTime() : 0, so = zbParte.has(id), teraz = terazMs();
    if (t) return teraz < t + (so ? 8 : 4) * 864e5; // do konca 7. (3.) dňa po pohrebe
    return (so && zbPreParte.has(id)) || teraz < vznik + 7 * 864e5;
  };
  const spomFar: Spom[] = vlastnePrispevkyVsetky(strankaId).filter((x) => stit(x) === "PARTE" && parteZije(x.id, x.smutocny?.rozluckaDatum || String((x.smutocny?.editor?.polia as Record<string, unknown> | undefined)?.rd ?? ""), x.vytvorene ?? 0)).map((x) => {
    const sm = x.smutocny, ed = sm?.editor, P0 = (ed?.polia ?? {}) as Record<string, unknown>, pole = (k: string) => String(P0[k] ?? "").trim();
    const vlastne = !ed && !sm?.sablona && (sm?.mode === "image" || !!x.plagat);
    const pal = ed?.sablona && PARTE[ed.sablona] ? PARTE[ed.sablona] : vlastne ? BORDOVA : sm?.sablona ? PARTE[`${sm.sablona.u.zena ? "z" : "m"}${(sm.sablona.volba.v % 8) + 1}`] ?? PARTE.m4 : PARTE.m4;
    return { id: x.id, it: x, zb: zbPreParte.get(x.id), obr: obrFar(x), pal, foto: ziveObr(sm?.foto ?? ed?.foto) ? (sm?.foto ?? ed?.foto)! : undefined,
      d: { meno: sm?.meno || pole("meno") || bezPredpony(x.nazov ?? ""), nar: sm?.datumNar || pole("nar"), umr: sm?.datumUmr || pole("umr"), rd: sm?.rozluckaDatum || pole("rd"), rc: sm?.rozluckaCas || pole("rc"), rm: sm?.rozluckaMiesto || pole("rm"), head: pal.head } };
  });
  const spomVer: Spom[] = OD.filter((x) => x.k === "parte" && parteZije(x.id, String((x.editor?.polia as Record<string, unknown> | undefined)?.rd ?? ""), x.cas)).map((x) => {
    const ed = x.editor, P0 = (ed?.polia ?? {}) as Record<string, unknown>, pole = (k: string) => String(P0[k] ?? "").trim();
    const pal = ed?.sablona && PARTE[ed.sablona] ? PARTE[ed.sablona] : ed ? PARTE.m4 : BORDOVA;
    return { id: x.id, x, obr: obrVer(x), pal, foto: ziveObr(ed?.foto) ? ed!.foto! : undefined,
      d: { meno: pole("meno") || x.t, nar: pole("nar"), umr: pole("umr"), rd: pole("rd"), rc: pole("rc"), rm: pole("rm"), head: pal.head } };
  });
  const spomZb: Spom[] = zbPohreb.filter((z) => !spomFar.some((s) => s.zb?.id === z.id)).map((z) => {
    const o = z.farnost?.oznamenie, [rd, rc] = (o?.kedy ?? "").split(" ");
    return { id: z.id, zb: z, obr: "", pal: o?.vlastne ? BORDOVA : PARTE.m4, foto: z.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src,
      d: { meno: o?.meno || bezPredpony(z.nazov) || "Rozlúčka", nar: o?.roky ?? "", umr: "", rd: rd ?? "", rc: rc ?? "", rm: o?.kde ?? "", head: "" } };
  });
  const spomienky = [...spomFar, ...spomVer, ...spomZb];
  const maSpom = spomienky.length > 0;
  // ---------- Teš sa s nami ----------
  // OPRAVY 205: tvar podľa druhu (svadba kruh · jubileum kosoštvorec · blahoželanie štvorec), pozvánka (miesto, čas) sa neukazuje
  const tesFar: Tes[] = OZ.filter((x) => ["SVADBA", "JUBILEUM", "BLAHOŽELANIE"].includes(stit(x))).map((x) => {
    // BLOK C 235: jubileum zo Správy = Blahoželanie z Editora
    if (x.oz?.ed?.typ === "blahozelanie") return { ...tesBlaho(x.oz.ed, { id: x.id, nadpis: x.nazov ?? "", r: reakF(x.id, "blaho"), mena: reakcieF(strankaId, x.id).mena ?? {}, af: x.af }), it: x };
    const st = stit(x), u = x.oz?.u, druhT: Tes["druh"] = st === "SVADBA" ? "svadba" : st === "JUBILEUM" ? "jubileum" : "blaho";
    // OPRAVY 229: iné oznámenie a poďakovanie nikdy do kosoštvorca — štvorec s nadpisom, Ďakujem
    return { id: x.id, druh: druhT, pal: druhT === "svadba" ? ZAKLAD.svadba : druhT === "jubileum" ? ZAKLAD.jubileum : ZAKLAD.blaho,
      meno: u?.meno?.trim() || bezPredpony(x.nazov ?? "") || x.nazov || "", datum: u?.kedyD ?? "", vek: vekJubilea(u?.nar, u?.kedyD), nadpis: x.nazov ?? "",
      r: reakF(x.id, "blaho"), mena: reakcieF(strankaId, x.id).mena ?? {}, af: x.af, it: x, ine: druhT === "blaho", foto: druhT === "blaho" ? x.fotky?.find(ziveObr) : undefined };
  });
  const tesVer: Tes[] = OD.filter((x) => x.k === "svadba" || x.k === "ine").map((x) => {
    const ed = x.editor, P0 = (ed?.polia ?? {}) as Record<string, unknown>, pole = (k: string) => String(P0[k] ?? "").trim(), sv = x.k === "svadba";
    // BLOK C 235: vo Viere je „Jubileum a iné oznámenie“ Blahoželanie z Editora
    if (ed?.typ === "blahozelanie") return tesBlaho(ed, { id: x.id, x, nadpis: x.t, r: reakV(x, "blaho"), mena: x.mena ?? {} });
    // OPRAVY 229: kosoštvorec len jubileum (pozvánka z Editora); iné oznámenie veriaceho = štvorec s nadpisom
    if (!sv && ed?.typ !== "jubileum") return { id: x.id, druh: "blaho", pal: ZAKLAD.blaho, x, meno: x.t, datum: "", vek: "", nadpis: x.t, r: reakV(x, "blaho"), mena: x.mena ?? {}, ine: true, foto: x.fotky?.find(ziveObr) ?? (ziveObr(x.obr) ? x.obr : undefined) };
    const pal = (ed?.sablona && (sv ? SVADBA : JUBILEUM)[ed.sablona]) || (sv ? ZAKLAD.svadba : ZAKLAD.jubileum);
    return { id: x.id, druh: sv ? "svadba" : "jubileum", pal, x, meno: sv ? [pole("sNev"), pole("sZen")].filter(Boolean).join(" & ") || x.t : pole("jMeno") || x.t,
      datum: sv ? pole("sD") : pole("jD"), vek: sv ? "" : (pole("jVekTxt").match(/\d+/)?.[0] ?? vekJubilea(pole("jNar"), pole("jD"))), nadpis: x.t, r: reakV(x, "blaho"), mena: x.mena ?? {} };
  });
  const tesZb: Tes[] = zbSvadba.map((z) => ({ id: z.id, druh: "svadba", pal: ZAKLAD.svadba, zb: z, meno: bezPredpony(z.nazov) || "Svadba", datum: "", vek: "", nadpis: z.nazov, r: reakF(z.id, "blaho"), mena: reakcieF(strankaId, z.id).mena ?? {} }));
  const tesy = [...tesFar, ...tesVer, ...tesZb];
  const maTes = tesy.length > 0;

  // ---------- Pomôž (KARTA 61 §2: brigády farnosti; deň po termíne zo stránky zmiznú) ----------
  const pomoz = brigadyF.filter((b) => !skoncila(b, cas.getTime())).sort((a, b) => a.dat.localeCompare(b.dat)).map((b) => {
    const r = reakcieF(strankaId, b.id);
    const u: Ud = { id: b.id, ms: 0, dat: b.dat, t: b.t, txt: cistyText(b.txt).trim(), kedy: `${b.druh}${b.dat ? ` · ${kedyBrigady(b.dat, b.cas)}` : ""}`.toLocaleUpperCase("sk-SK"), od: b.kde, foto: b.foto && ziveObr(b.foto) ? b.foto : "", plag: false,
      pz: b.pz, limit: b.limit, zoznam: r.ucast ?? [], mena: r.mena ?? {}, prepni: () => prepniReakciuF(strankaId, b.id, "ucast", kto, mojeMeno), pomoc: true, af: b.af };
    return u;
  });
  // ---------- Oznamy farnosti ----------
  type Oz = { id: string; ms: number; chip: string; t: string; txt: string; zm: boolean; g: "far" | "ver"; x?: PolozkaFarnika; foto?: string; af?: AutorF; /** KARTA 62: zaškrtnuté kostoly (bez = celá farnosť) */ mi?: string[] };
  const ozAll: Oz[] = [
    ...OZ.filter((x) => ["OZNAM", "ZMENA OMŠE"].includes(stit(x)) && (stit(x) !== "ZMENA OMŠE" || VJ.zmeny)).map((x): Oz => ({ id: x.id, ms: x.vytvorene ?? 0, chip: stit(x) === "ZMENA OMŠE" ? "ZMENA PROGRAMU" : stit(x), t: x.nazov ?? "", txt: x.popis ?? "", zm: stit(x) === "ZMENA OMŠE", g: "far", foto: ziveObr(x.fotky?.[0]) ? x.fotky![0] : undefined , af: x.af, mi: x.oz?.dr === 0 && x.oz.mi?.length ? x.oz.mi : undefined })),
  ].sort((a, b) => b.ms - a.ms);
  // OPRAVY 197: krátke oznamy veriacich nepatria medzi oznamy farnosti — majú vlastný blok Od veriacich
  const oznVer = OD.filter((x) => x.k === "oznam").sort((a, b) => b.cas - a.cas);
  const oznamy = ozAll;
  // KARTA 62: karta oznamu (hlavná stránka aj podstránka kostola); pri oznamoch pre konkrétne kostoly štítok kostola
  const kartaOznamu = (x: Oz) => {
    const kde = miestaF.length > 1 && x.mi ? x.mi.map((id) => miestaF.find((m) => m.id === id)?.nazov).filter(Boolean).join(" · ") : "";
    return (
      <div key={x.id} style={{ borderRadius: 22, overflow: "hidden", background: KARTA, display: "flex", flexDirection: "column" }}>
              {x.foto && <button type="button" onClick={() => setVelke({ src: x.foto! })} aria-label="Fotka na celú obrazovku" style={{ border: "none", padding: 0, cursor: "zoom-in", display: "block" }}><img src={x.foto} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} /></button>}
              <div style={{ padding: "16px 20px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Datum d={new Date(x.ms || cas.getTime())} /><span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}><span style={kicker(x.zm ? CERVENA : INK3)}>{x.chip}</span>{kde && <span style={{ alignSelf: "flex-start", padding: "3px 10px", borderRadius: 8, background: "var(--nf-gSoft)", color: "var(--nf-gInk)", fontSize: 13, fontWeight: 800 }}>{kde}</span>}</span></span>
                <b style={{ fontSize: 19, lineHeight: 1.3 }}>{x.t}</b>
                {x.txt && <Viac text={x.txt} />}
                {hlavickaFar(x.af)}
              </div>
            </div>);
  };
  const k = profil?.kontakt;
  const urad = k ? [k.adresaVerejna.trim() || k.sidlo.trim(), ...k.telefony.map((t) => t.cislo.trim()), ...k.emaily.map((e) => e.adresa.trim())].filter(Boolean) : [];
  // OPRAVY 223: úradné hodiny pod Farským úradom (dni bez hodín sa nevypisujú, prázdne = blok sa neukáže)
  // KARTA 62: správca farnosti, IČO · DIČ, IBAN (z registrácie, farár ich mení v Upraviť profil)
  const ud = uradneUdaje(strankaId, k?.udaje);
  const udajeR = [ud.ico.trim() && `IČO ${ud.ico.trim()}`, ud.dic.trim() && `DIČ ${ud.dic.trim()}`].filter(Boolean).join(" · ");
  const maUdaje = !!(ud.spravca.trim() || udajeR || ud.iban.trim());
  const uh = k?.uradne, maUrad = urad.length > 0 || maUH(uh) || maUdaje;
  // OPRAVY 220/221: kalendár Tento týždeň — všetko zaškrtnuté v Čo uvidia ľudia
  const maKal = maOmse || [0, 1].some((o) => miestaF.some((m) => plagatTyzdna(kostolKal(strankaId, m.id), VJ, o, SLF.omsa).some((d) => d.o.length > 0)));
  const prispela = usePrispela(strankaId);
  const maZbierky = hlOn || zvOn || zbFar.length + zbIne.length + piny.length + prispela.length > 0;
  const prazdna = !(!!onas || maZbierky || maPrid || !!p || prosby.length || maSpom || maTes || pomoz.length || oznVer.length || ozAll.length || maKal || maUrad);
  // ---------- titulka: tlačidlo Moja farnosť / Sledovať ----------
  // Martin (odpovede 13. 10.): mobil a tablet — dlaždica „Omše a kalendár“ s dnešnými časmi vedľa Moja farnosť; PC nie
  const dniKal = maKal && !pc ? [...plagatTyzdna(kk, VJ, 0, SLF.omsa), ...plagatTyzdna(kk, VJ, 1, SLF.omsa)] : [];
  const iDnesK = dniKal.findIndex((d) => d.key === iso(cas));
  const najblizsi = iDnesK < 0 ? undefined : dniKal.slice(iDnesK).find((d) => d.o.some((o) => !o.z));
  const dnesKal = najblizsi ? `${najblizsi.key === iso(cas) ? "dnes" : dniKal.indexOf(najblizsi) === iDnesK + 1 ? "zajtra" : najblizsi.w.toLocaleLowerCase("sk-SK")} ${najblizsi.o.filter((o) => !o.z).slice(0, 2).map((o) => `${o.t} ${o.s}`).join(" · ")}` : "";
  const sledBtn = <button type="button" aria-pressed={jeHl || jeSl} aria-expanded={jeHl || jeSl ? mfOn : undefined} onClick={sledTap} style={{ flex: "none", minHeight: pc ? 54 : 52, padding: "0 20px", borderRadius: pc ? 15 : 14, border: pc || jeHl || jeSl ? "none" : `1.5px solid ${LINKA}`, background: jeHl || jeSl ? (pc ? "var(--nf-gSoft)" : ZELENA_TL) : pc ? "#fff" : PAPIER, color: jeHl || jeSl ? (pc ? "var(--nf-gInk)" : "#fff") : pc ? "#14110B" : INK, fontFamily: "inherit", fontSize: pc ? 17 : 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
    <span role={sledChyba ? "alert" : undefined}>{sledT}</span>{(jeHl || jeSl) && !sledChyba && <span aria-hidden="true" style={{ fontSize: 15 }}>⌄</span>}
  </button>;
  // ---------- otvorenie zbierok (karta aj malý riadok) ----------
  const otvorHlavnu = () => { if (!hl) return; onDetail({ id: hlRef, nazov: nazovHlavnej(hl), popis: hlTxt, overena: true, organizacia: orgPole, ...sadyZbierky(hl),
    media: hl.media.filter((m) => ziveObr(m.src)).map((m) => (m.typ === "video" ? { typ: "video" as const, src: m.src } : { typ: "foto" as const, src: m.src })) },
  { typ: "hl", chip: "HLAVNÁ ZBIERKA", t: nazovHlavnej(hl), txt: hlTxt, obr: hl.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src }); };
  const otvorZvoncek = (id: string, t: string) => onDetail({ id, nazov: t, popis: "Ako do zvončeka pri omši. Dar ide farnosti.", overena: true, organizacia: orgPole }, { typ: "zv", chip: "ZVONČEKOVÁ ZBIERKA", t, txt: "Ako do zvončeka pri omši. Dar ide farnosti." });
  const otvorPin = (z: ZbierkaNaPripnutie) => onDetail({ id: z.id, nazov: z.nazov, popis: "", overena: true, ciel: z.ciel ?? undefined, media: [], organizacia: { ...orgPole, meno: z.kto, obrazok: undefined } },
    { typ: "pin", chip: chipPripnutej(z), t: z.nazov, txt: "", pin: z, obr: z.foto });
  // OPRAVY 222 (4): čím farnosť prispela na cudzie zbierky
  const prispeliSme: ReactNode = prispela.length > 0 ? <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4, padding: "10px 14px", borderRadius: 14, background: "var(--nf-zlBg)" }}>
    {prispela.slice(0, 5).map((x, i) => <span key={i} style={{ fontSize: 15, color: INK }}><b>Prispeli sme:</b> {x.kto}{x.rodina ? "" : ` · ${eur(x.suma)}`}</span>)}
  </div> : null;

  // ---------- spoločné kúsky ----------
  const pozvat = (u: Ud) => {
    const jaV = u.zoznam.includes(kto), n = u.zoznam.length, zav = u.pz === 2;
    const plne = !jaV && zav && u.limit > 0 && n >= u.limit;
    const t = plne ? "Plné · ďakujeme" : jaV ? (zav ? "Prihlásený ✓ · zrušiť" : u.pomoc ? "Prídem pomôcť ✓ · zrušiť" : "Prídem ✓ · zrušiť") : zav ? "Prihlásiť sa" : u.pomoc ? "Prídem pomôcť" : "Prídem";
    const poc = n ? (zav ? `prihlásení ${n}${u.limit ? ` z ${u.limit}` : ""}` : `${ludi(n)} príde`) : u.limit ? `miesta: ${u.limit}` : "";
    const zozOn = zoz === u.id;
    const mena = u.zoznam.map((x) => `${u.mena[x] ?? "veriaci"}${x === kto ? " (vy)" : ""}`);
    return <>
      <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 6 }}>
        <button type="button" aria-pressed={jaV} disabled={plne} onClick={() => { if (zav && !jaV && !reg) { toast("Prihlásiť sa menom môžu len registrovaní v DEED+."); return; } u.prepni(); }} style={tlacR(jaV, true, plne)}>{t}</button>
        {poc && <span style={{ fontSize: 16, fontWeight: 700 }}>{poc}</span>}
      </span>
      {zav && mena.length > 0 && <>
        <button type="button" aria-expanded={zozOn} onClick={() => setZoz(zozOn ? null : u.id)} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", color: INK, fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4 }}>{zozOn ? "Skryť zoznam ⌃" : `Kto sa prihlásil · ${mena.length} ⌄`}</button>
        {zozOn && <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${LINKA}` }}>{mena.map((m, i) => <span key={i} style={{ padding: "9px 0", borderBottom: `1px solid ${LINKA}`, fontSize: 16 }}>{m}</span>)}</div>}
      </>}
    </>;
  };
  const reakcia = ({ zoznam, prepni, t, tJa, tmave = true, poc }: { zoznam: string[]; prepni: () => void; t: string; tJa: string; tmave?: boolean; poc: (n: number) => string }) => {
    const jaV = zoznam.includes(kto);
    return <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button type="button" aria-pressed={jaV} onClick={prepni} style={tlacR(jaV, tmave)}>{jaV ? tJa : t}</button>
      {zoznam.length > 0 && <span style={{ fontSize: 16, fontWeight: 700 }}>{poc(zoznam.length)}</span>}
    </span>;
  };
  const lavyStlpec = (nadpis: string, popis: string) => <div style={{ flex: "1 1 220px", maxWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}><b style={nadpisBloku}>{nadpis}</b><span style={{ fontSize: 17, lineHeight: 1.5, color: INK3 }}>{popis}</span></div>;

  // ============================================================
  // KARTA 64 · Kronika — tie isté dáta a ťuky ako Nástenka, iná podoba (PC 3 stĺpce, mobil a tablet na výšku pod sebou)
  // ============================================================
  // --- KARTA 64: archív rokov (aktuálny rok - 1 a staršie): ukončené zbierky, akcie, oznámenia; súhrn vyzbierané · akcie · svadby · krsty ---
  const rokTeraz = cas.getFullYear();
  const pad = (n: number, a: string, b: string, c: string) => `${n === 1 ? a : n < 5 ? b : c}`;
  const zapisyArch: (ZapisArchivu & { r: number; suma?: number; akcia?: boolean })[] = [];
  for (const z of zbierkyStrankyZPamate(strankaId)) {
    if ((z.stav ?? "aktivna") === "aktivna" || !z.koniec) continue;
    const d = new Date(z.koniec);
    if (Number.isNaN(d.getTime()) || d.getFullYear() >= rokTeraz) continue;
    const s = sucetDarov(z.id);
    zapisyArch.push({ id: `z${z.id}`, r: d.getFullYear(), d, stitok: "UKONČENÁ ZBIERKA", farba: INK3, t: z.nazov || "Zbierka", suma: s.suma,
      pod: s.suma ? `${eur(s.suma)} od ${ludi(s.pocet)}` : undefined, foto: z.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src });
  }
  for (const x of OZ) {
    if (x.ntyp === "udalost" && x.datum && /^\d{4}-\d{2}-\d{2}/.test(x.datum)) {
      const d = zIso(x.datum.slice(0, 10));
      if (d.getFullYear() >= rokTeraz) continue;
      const n = (reakcieF(strankaId, x.id).ucast ?? []).length;
      zapisyArch.push({ id: `u${x.id}`, r: d.getFullYear(), d, stitok: "AKCIA", farba: "#7FA8C8", t: x.nazov ?? "Akcia", akcia: true, pod: n ? `${n} ${pad(n, "prihlásený", "prihlásení", "prihlásených")}` : undefined, foto: ziveObr(x.fotky?.[0]) ? x.fotky![0] : undefined });
    } else if (x.tag === "Oznámenie" && x.vytvorene) {
      const d = new Date(x.vytvorene);
      if (d.getFullYear() >= rokTeraz) continue;
      zapisyArch.push({ id: `i${x.id}`, r: d.getFullYear(), d, stitok: "OZNÁMENIE", farba: ZLATA, t: x.nazov ?? "Oznámenie", veta: cistyText(x.popis ?? "").trim().split(/(?<=[.!?])\s/)[0] || undefined, foto: ziveObr(x.fotky?.[0]) ? x.fotky![0] : undefined });
    }
  }
  const svadbyR = new Map<number, number>();
  for (const x of OZ) if (stit(x) === "SVADBA") { const v = x.oz?.u?.kedyD && /^\d{4}/.test(x.oz.u.kedyD) ? Number(x.oz.u.kedyD.slice(0, 4)) : x.vytvorene ? new Date(x.vytvorene).getFullYear() : 0; if (v && v < rokTeraz) svadbyR.set(v, (svadbyR.get(v) ?? 0) + 1); }
  const krstyR = new Map<number, number>();
  for (const m of miestaF.length ? miestaF : [{ id: "0" } as Miesto]) for (const [den, l] of Object.entries(kostolKal(strankaId, m.id).extra)) { const v = Number(den.slice(0, 4)); if (v && v < rokTeraz) { const n = l.filter((q) => q.typ === "krst").length; if (n) krstyR.set(v, (krstyR.get(v) ?? 0) + n); } }
  const rokyA = [...new Set([...zapisyArch.map((z) => z.r), ...svadbyR.keys(), ...krstyR.keys()])].sort((a, b) => b - a);
  const archiv: RokArchivu[] = rokyA.map((r) => {
    const z = zapisyArch.filter((x) => x.r === r).sort((a, b) => b.d.getTime() - a.d.getTime());
    const suma = z.reduce((a, x) => a + (x.suma ?? 0), 0), ak = z.filter((x) => x.akcia).length, sv = svadbyR.get(r) ?? 0, kr = krstyR.get(r) ?? 0;
    const suhrn: [string, string][] = [...(suma ? [[eur(suma), "vyzbierané"] as [string, string]] : []), ...(ak ? [[String(ak), pad(ak, "akcia", "akcie", "akcií")] as [string, string]] : []),
      ...(sv ? [[String(sv), pad(sv, "svadba", "svadby", "svadieb")] as [string, string]] : []), ...(kr ? [[String(kr), pad(kr, "krst", "krsty", "krstov")] as [string, string]] : [])];
    return { rok: r, suhrn, zapisy: z };
  });
  const maDeti = stretnutiaF.some((x) => !skoncilo(x));
  const kronika = rozlozenie === "kronika";
  const k3 = pc; // PC a tablet na šírku (≥ 1180 px): profil vľavo · stred · lišta
  const matna = volbaLinie === "Bordová";
  const KN = (t: string, velky?: boolean) => <KNadpis t={t} maly={!k3} matna={matna} velky={velky} />;
  const cirkevT = (CIRKVI.find((c) => c[0] === SLF.cirkev)?.[1] ?? "").split(" ")[0];
  const obecT = (k?.adresaVerejna.trim() || k?.sidlo.trim() || "").split(",")[0];
  const podMeno = [cirkevT, obecT].filter(Boolean).join(" · ");
  /** OPRAVY 245: Kronika na mobile a tablete na výšku — blok zbalený na jeden riadok */
  const zbK = (blok: string, nadpis: string, suhrnT: string, deti: ReactNode, o?: { pozadie?: string; hrubo?: boolean }): ReactNode => (
    <ZbalenyBlok key={blok} blok={blok} nadpis={KN(nadpis)} suhrn={suhrnT} otvoreny={otv.has(blok)} onPrepni={() => prepni(blok)} kronika
      styl={{ padding: "16px 18px", borderTop: o?.hrubo ? "4px solid var(--nf-linia)" : `1px solid ${LINKA}`, background: o?.pozadie, gap: 12 }}>{deti}</ZbalenyBlok>);
  const sekcia = (blok: string, nadpis: string, suhrnT: string, deti: ReactNode, o?: { pozadie?: string; bez?: boolean }): ReactNode => (!k3 ? zbK(blok, nadpis, suhrnT, deti, o) :
    <section data-blok={blok} style={{ padding: "36px 40px", borderTop: o?.bez ? "none" : `1px solid ${LINKA}`, background: o?.pozadie, display: "flex", flexDirection: "column", gap: 14, scrollMarginTop: 16, minWidth: 0 }}>{KN(nadpis)}{deti}</section>);
  const dnesD = new Date(cas.getFullYear(), cas.getMonth(), cas.getDate());
  const casyDna = (d: Date) => omseD(d).map((o) => o.t).join(" · ");
  const zmenaT = ozAll.find((o) => o.zm)?.t;
  const pocty = [[ozAll.length, "oznam", "oznamy", "oznamov"], [udalosti.length, "akcia", "akcie", "akcií"], [prosby.length, "prosba", "prosby", "prosieb"]] as const;
  const poctyT = pocty.filter(([n]) => n > 0).map(([n, a, b, c]) => `${n} ${n === 1 ? a : n < 5 ? b : c}`).join(" · ");
  const [kalOtv, setKalOtv] = useState(false);
  const [zbVsetky, setZbVsetky] = useState(false);
  const [pridV, setPridV] = useState<string | null>(null);
  const [ozOtv, setOzOtv] = useState<string | null>(null);
  const oz = onlineOmse(strankaId);
  const dalsiaOnline = (() => {
    if (!zivoUrl) return null;
    for (let i = 0; i < 7; i++) { const d = new Date(dnesD.getFullYear(), dnesD.getMonth(), dnesD.getDate() + i); const l = onlineVDen(strankaId, d); if (l.length) return `${["Ne", "Po", "Ut", "St", "Št", "Pi", "So"][d.getDay()]} ${l[0]}`; }
    return null;
  })();
  // --- OPRAVY 245: mobil a tablet na výšku — bloky zbalené, riadok súhrnu (počet + najbližšia vec) ---
  const { otv, prepni, otvor } = useZbaleneBloky();
  const zbalene = !pc;
  /** otvorí zbalený blok a posunie naň (tlačidlá a návraty zo zatvorených okien) */
  const naBlok = (id: string) => { if (rozlozenie !== "nastenka" && id === "kal") { setKalOtv(true); return; } otvor(id); window.setTimeout(() => posunNaBlok(id), 30); };
  const poc = (n: number, a: string, b: string, c: string) => `${n} ${pad(n, a, b, c)}`;
  const dm = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;
  const den = (d: Date) => DNW_V[dvt(d)].toLocaleLowerCase("sk-SK");
  const suhrn = (...x: (string | false | undefined | null)[]) => x.filter(Boolean).join(" · ");
  const modliN = prosby.reduce((a, x) => a + reakV(x, "modl").zoznam.length, 0);
  const deti1 = stretnutiaF.filter((x) => !skoncilo(x)).sort((a, b) => a.dat.localeCompare(b.dat));
  const tes1 = tesy[0], ud1 = udalosti[0], pom1 = pomoz[0];
  const omseSuhrn = (() => { for (let i = 0; i < 7; i++) { const d = new Date(dnesD.getFullYear(), dnesD.getMonth(), dnesD.getDate() + i), c = casyDna(d); if (c) return `${i === 0 ? "dnes" : i === 1 ? "zajtra" : den(d)} ${c}`; } return ""; })();
  const telS = k?.telefony.map((t) => t.cislo.trim()).find(Boolean) || k?.emaily.map((e) => e.adresa.trim()).find(Boolean) || "";
  const uhS = maUH(uh) ? DNI_UH.map((dn, i) => { const c = casyUH(uh, i); return c.length ? `${dn} ${c.map(textCasu).join(", ")}` : ""; }).find(Boolean) : "";
  const S = {
    ozn: suhrn(poc(ozAll.length, "oznam", "oznamy", "oznamov"), (ozAll.find((o) => o.zm) ?? ozAll[0])?.t),
    vypN: p ? suhrn("Príhovor farára", `pridaný ${dd(p.cas)}`) : "",
    vypK: suhrn(p && "Príhovor farára", zivoT ? "naživo" : dalsiaOnline && `${p ? "aj online" : "Online"} omša ${dalsiaOnline}`),
    mod: suhrn(poc(prosby.length, "prosba", "prosby", "prosieb"), modliN > 0 && `${modliN} sa modlí`),
    pom: suhrn(poc(pomoz.length, "prosba o pomoc", "prosby o pomoc", "prosieb o pomoc"), pom1?.dat && `${den(zIso(pom1.dat))} ${dm(zIso(pom1.dat))}`),
    prid: suhrn(udalosti.length > 0 && poc(udalosti.length, "akcia", "akcie", "akcií"), ud1 && `najbližšie ${ud1.t}${ud1.dat ? ` ${dm(zIso(ud1.dat))}` : ""}`, alba.length > 0 && poc(alba.length, "album fotiek", "albumy fotiek", "albumov fotiek")),
    tes: suhrn(poc(tesy.length, "radosť", "radosti", "radostí"), tes1 && `${tes1.ine ? tes1.nadpis : tes1.meno}${tes1.druh === "jubileum" && tes1.vek ? `, ${tes1.vek} ${rokyT(Number(tes1.vek)).toLocaleLowerCase("sk-SK")}` : ""}`),
    spom: suhrn(poc(spomienky.length, "spomienka", "spomienky", "spomienok"), spomienky.slice(0, 3).map((x) => x.d.meno).filter(Boolean).join(", ")),
    ver: suhrn(poc(oznVer.length, "oznam", "oznamy", "oznamov"), oznVer[0]?.t),
    deti: suhrn(poc(deti1.length, "akcia", "akcie", "akcií"), deti1[0] && `${deti1[0].dat ? `${den(zIso(deti1[0].dat))} ` : ""}${deti1[0].t}`),
    kostoly: suhrn(poc(miestaF.length, "kostol", "kostoly", "kostolov"), miestaF.map((m) => m.nazov).join(", ")),
    omse: omseSuhrn,
    urad: suhrn(telS || (k ? (k.adresaVerejna.trim() || k.sidlo.trim()) : ""), uhS) || ud.spravca.trim(),
  };
  // --- zbierky ako štvorce ---
  const stvorce: ReactNode[] = [
    ...(hlOn && hl ? [<ZbierkaStvorec key="hl" stitok="HLAVNÁ ZBIERKA" nazov={nazovHlavnej(hl)} foto={hl.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src} farba={ZELENA} onTap={otvorHlavnu} />] : []),
    ...(zvOn ? [<ZbierkaStvorec key="zv" stitok="ZVONČEKOVÁ" nazov={`Nedeľa ${zvNedela}`} farba={ZLATA} onTap={() => otvorZvoncek(zvOkno.id, `Zvončeková zbierka · Nedeľa ${zvNedela}`)} />] : []),
    ...zbFar.map((z) => <ZbierkaStvorec key={z.id} stitok="ZBIERKA" nazov={z.nazov || "Zbierka"} foto={z.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src} farba={TEAL} pod={cielCislo(z) ? `cieľ ${eur(cielCislo(z))}` : undefined} onTap={() => otvorZbierku(z)} />),
    ...piny.map((z) => <ZbierkaStvorec key={z.id} stitok={chipPripnutej(z)} nazov={z.nazov} foto={z.foto} farba={farbaPripnutej(z)} onTap={() => otvorPin(z)} />),
    ...zbIne.map((z) => <ZbierkaStvorec key={z.id} stitok="ZBIERKA RODINY" nazov={bezPredpony(z.nazov) || "Zbierka"} foto={z.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src} farba={FIALOVA} onTap={() => otvorZbierku(z)} />),
  ];
  const vMriezke = k3 || !siroka ? 4 : 8;
  const ineNazvy = [...zbFar.map((z) => z.nazov), ...piny.map((z) => z.nazov), ...zbIne.map((z) => bezPredpony(z.nazov))].slice(Math.max(0, vMriezke - stvorce.length + (zbFar.length + piny.length + zbIne.length)));
  const zbNazvy = [hlOn && hl ? nazovHlavnej(hl) : "", zvOn ? `Zvončeková · Nedeľa ${zvNedela}` : "", ...zbFar.map((z) => z.nazov), ...piny.map((z) => z.nazov), ...zbIne.map((z) => bezPredpony(z.nazov))].filter(Boolean);
  const zbS = stvorce.length ? suhrn(poc(stvorce.length, "zbierka", "zbierky", "zbierok"), zbNazvy[0]) : prispela.length ? `Prispeli sme · ${prispela[0].kto}` : "";
  const zbObsah = <>
    {stvorce.length > 0 && <div style={{ display: "grid", gridTemplateColumns: `repeat(${k3 || !siroka ? 2 : 4},minmax(0,1fr))`, gap: 12 }}>{zbVsetky ? stvorce : stvorce.slice(0, vMriezke)}</div>}
    {!zbVsetky && stvorce.length > vMriezke && <button type="button" onClick={() => setZbVsetky(true)} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>+ {ineNazvy.length ? ineNazvy.slice(-Math.max(1, stvorce.length - vMriezke)).slice(0, 1)[0] : `${stvorce.length - vMriezke} ďalšie`} · všetky zbierky ›</button>}
    {prispeliSme}
  </>;
  const kZbierky = maZbierky && <div data-blok="zbierky" style={{ display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 16 }}>{KN("Zbierky farnosti")}{zbObsah}</div>;
  // --- Sväté omše ---
  const omseDni = Array.from({ length: 7 }, (_, i) => { const d = new Date(dnesD.getFullYear(), dnesD.getMonth(), dnesD.getDate() - ((dnesD.getDay() + 6) % 7) + i); const ol = VJ.omse ? onlineVDen(strankaId, d) : []; return { d, dnes: d.getTime() === dnesD.getTime(), casy: casyDna(d), pozn: ol.length ? `aj online ${ol.join(", ")}` : undefined }; }).filter((x) => x.casy);
  const kOmse = maOmse && omseDni.length > 0 && <SvateOmse matna={matna} maly={!k3} onCely={() => setKalOtv(true)} dni={omseDni} />;
  // --- Pomôž ---
  const pomObsah = pomoz.map((u) => { const b = brigadyF.find((x) => x.id === u.id); return <PomozKarta key={u.id} stitok={(b?.druh ?? "Brigáda").toLocaleUpperCase("sk-SK")} kedy={b?.dat ? kedyBrigady(b.dat, "") : undefined} t={u.t} txt={u.txt ? <Viac text={u.txt} velkost={15.5} /> : undefined} kde={u.od || undefined} cas={b?.cas || undefined} akcia={u.pz > 0 ? <div className="kronika-pomoz" style={{ display: "flex", flexDirection: "column", gap: 6 }}>{pozvat(u)}</div> : undefined} />; });
  const kPomoz = pomoz.length > 0 && <div data-blok="pom" style={{ display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 16 }}>{KN("Pomôž")}{pomObsah}</div>;
  // --- Naše kostoly ---
  const kKostoly = miestaF.length > 1 && (k3
    ? <NaseKostolyBlok strankaId={strankaId} miesta={miestaF} siroka pc={false} stlpec onMiesto={setMiesto} styl={{ display: "flex", flexDirection: "column", gap: 14, scrollMarginTop: 16 }} nadpis={(n) => KN(n)} />
    : zbK("kostoly", "Naše kostoly", S.kostoly, <NaseKostolyBlok strankaId={strankaId} miesta={miestaF} siroka={siroka} pc={false} onMiesto={setMiesto} styl={{ display: "flex", flexDirection: "column", gap: 12 }} nadpis={() => null} />));
  // --- Tento týždeň + DNES ---
  const dnesBox = (casyDna(dnesD) || zmenaT) ? <div style={{ padding: "16px 20px", borderRadius: 18, background: PAPIER, border: `1px solid ${LINKA}`, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".12em", color: "var(--nf-gInk)" }}>● DNES · {DNW_V[dvt(dnesD)]}</span>
    {casyDna(dnesD) && <b style={{ fontSize: 20 }}>{casyDna(dnesD)}</b>}
    {zmenaT && <span style={{ fontSize: 15, color: CERVENA }}>{zmenaT}</span>}
  </div> : null;
  const maTyzden = !!dnesBox || (k3 && !!poctyT);
  const kTyzden = maTyzden && <section data-blok="tyzden" style={{ padding: k3 ? "40px 40px 0" : "22px 18px 18px", display: "flex", alignItems: k3 ? "flex-end" : "stretch", flexDirection: k3 ? "row" : "column", justifyContent: "space-between", gap: k3 ? 24 : 12, flexWrap: "wrap", scrollMarginTop: 16 }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{KN("Tento týždeň", true)}{poctyT && k3 && <span style={{ fontSize: 17, color: INK3 }}>{poctyT}</span>}</div>
    {dnesBox}
  </section>;
  // --- Oznamy farnosti ---
  const kOznamy = ozAll.length > 0 && sekcia("ozn", "Oznamy farnosti", S.ozn, <>
    <div style={{ display: "flex", flexDirection: "column", borderTop: k3 ? "1.5px solid var(--nf-linia)" : `1px solid ${LINKA}` }}>
      {ozAll.map((x) => { const d = new Date(x.ms || cas.getTime()), o = ozOtv === x.id, kde = miestaF.length > 1 && x.mi ? x.mi.map((id) => miestaF.find((m) => m.id === id)?.nazov).filter(Boolean).join(" · ") : ""; return (
        <div key={x.id} style={{ display: "flex", gap: k3 ? 20 : 14, padding: "16px 0", borderBottom: `1px solid ${LINKA}` }}>
          <span style={{ flex: "none", width: 58, height: 58, borderRadius: 12, background: KARTA, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><b style={{ fontSize: 20, lineHeight: 1 }}>{d.getDate()}</b><span style={{ fontSize: 11.5, fontWeight: 800, color: INK3 }}>{["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"][d.getMonth()]}</span></span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: x.zm ? CERVENA : INK3 }}>{x.chip}</span>{kde && <span style={{ padding: "2px 8px", borderRadius: 7, background: "var(--nf-gSoft)", color: "var(--nf-gInk)", fontSize: 12.5, fontWeight: 800 }}>{kde}</span>}</span>
            <b style={{ fontSize: 19, lineHeight: 1.3, overflowWrap: "anywhere" }}>{x.t}</b>
            {x.txt && (o ? <Viac text={x.txt} velkost={16} riadkov={40} /> : <button type="button" onClick={() => setOzOtv(x.id)} style={{ padding: 0, border: "none", background: "transparent", color: INK2, fontFamily: "inherit", fontSize: 16, textAlign: "left", cursor: "pointer", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{x.txt}</button>)}
            {x.foto && <button type="button" onClick={() => setVelke({ src: x.foto! })} aria-label="Fotka na celú obrazovku" style={{ alignSelf: "flex-start", border: "none", padding: 0, borderRadius: 12, overflow: "hidden", cursor: "zoom-in", marginTop: 4 }}><img src={x.foto} alt="" style={{ width: 220, maxWidth: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} /></button>}
            {o && hlavickaFar(x.af)}
          </span>
        </div>); })}
    </div>
  </>);
  // --- Vypočuj si (príhovor + online omša); mobil zbalené na jeden riadok ---
  const vypObsah = <>
    {p && <button type="button" onClick={() => setPrihOn(true)} style={{ display: "flex", gap: k3 ? 24 : 14, alignItems: "center", flexWrap: k3 ? "nowrap" : "wrap", padding: 16, borderRadius: 22, background: KARTA, border: "none", cursor: "pointer", color: INK, fontFamily: "inherit", textAlign: "left" }}>
      <span style={{ flex: "none", width: k3 ? 260 : "100%", aspectRatio: "16 / 9", borderRadius: 14, background: "#14110B", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 0, height: 0, borderLeft: "18px solid #14110B", borderTop: "11px solid transparent", borderBottom: "11px solid transparent", marginLeft: 5 }} /></span></span>
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".12em", color: INK3 }}>PRÍHOVOR FARÁRA · PRIDANÝ {dd(p.cas)}</span><b style={{ fontSize: k3 ? 26 : 21, letterSpacing: "-.02em" }}>Príhovor farára</b><span style={{ fontSize: 16, color: INK3 }}>Ťuknite a prehrá sa na celú obrazovku.</span></span>
    </button>}
    {zivoUrl && (dalsiaOnline || zivoT) && <a href={zivoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", gap: k3 ? 20 : 12, alignItems: "center", flexWrap: "wrap", padding: "16px 18px", borderRadius: 20, background: "color-mix(in srgb,#B3261E 10%,var(--nf-karta))", border: "1px solid color-mix(in srgb,#B3261E 35%,transparent)", color: INK, textDecoration: "none" }}>
      <span style={{ flex: "none", minHeight: 40, padding: "0 14px", borderRadius: 20, background: "#B3261E", color: "#fff", fontSize: 14.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />{zivoT ? "NAŽIVO" : "ONLINE"}</span>
      <span style={{ flex: "1 1 200px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 18 }}>{zivoT ?? "Omša online"}{!zivoT && dalsiaOnline ? ` · ${dalsiaOnline}` : ""}</b><span style={{ fontSize: 14.5, color: INK3 }}>{oz.url ? "Keď beží, ukáže sa NAŽIVO aj hore na titulke." : ""}</span></span>
      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--nf-gInk)" }}>Pozrieť ›</span>
    </a>}
  </>;
  const maVyp = !!p || !!(zivoUrl && (dalsiaOnline || zivoT));
  const kVyp = maVyp && sekcia("vyp", "Vypočuj si", S.vypK, vypObsah);
  // --- Modli sa s nami ---
  const kModli = prosby.length > 0 && sekcia("mod", "Modli sa s nami", S.mod, <>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${k3 ? 3 : siroka ? 2 : 1},minmax(0,1fr))`, gap: 14 }}>
      {prosby.map((x) => (
        <div key={x.id} style={{ padding: 20, borderRadius: 20, background: KARTA, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          {x.anon || /Bohu známy/.test(x.kto) ? <span style={{ fontSize: 14.5, color: INK3 }}>bez mena</span> : hlavickaAutora(x)}
          <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>{x.t && <b style={{ fontSize: 18, lineHeight: 1.4 }}>{x.t}</b>}{x.s && <span style={{ fontSize: 16, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line" }}>{x.s}</span>}</span>
          {reakcia({ ...reakV(x, "modl"), t: "Modlím sa s vami", tJa: "Modlíte sa s nami ✓", poc: (n) => `${n} sa modlí` })}
          <MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={moje(x)} />
        </div>))}
    </div>
  </>);
  // --- Príď a zaži s nami: najbližšia (alebo vybraná) akcia veľká, ďalšie malé, albumy ---
  const velkaU = udalosti.find((u) => u.id === pridV) ?? udalosti[0];
  const kPrid = maPrid && sekcia("prid", "Príď a zaži s nami", S.prid, <>
    {velkaU && (() => { const u = velkaU, d = u.dat ? zIso(u.dat) : null; return (
      <div style={{ display: "flex", flexDirection: k3 ? "row" : "column", borderRadius: 22, overflow: "hidden", background: KARTA }}>
        {(u.foto || d) && <div style={{ position: "relative", flex: "none", width: k3 ? "44%" : "100%", minHeight: k3 ? 300 : undefined, aspectRatio: k3 ? undefined : u.foto ? (u.plag ? "3 / 4" : "16 / 9") : "4 / 1", background: u.foto ? `center/${u.plag ? "contain" : "cover"} no-repeat url('${u.foto}') var(--nf-pas)` : "var(--nf-pas)" }}>
          {u.foto && u.plag && <button type="button" onClick={() => setVelke({ src: u.foto })} aria-label="Plagát na celú obrazovku" style={{ position: "absolute", inset: 0, border: "none", background: "transparent", cursor: "zoom-in" }} />}
          {d && <span style={{ position: "absolute", left: 16, top: 16 }}><KDatum d={d} /></span>}
        </div>}
        <div style={{ flex: 1, minWidth: 0, padding: k3 ? "24px 26px" : "18px 18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {u.mojeX ? hlavickaAutora(u.mojeX) : hlavickaFar(u.af)}
          {u.kedy && <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".1em", color: ZLATA }}>{u.kedy}</span>}
          <b style={{ fontSize: k3 ? 30 : 23, lineHeight: 1.15, letterSpacing: "-.02em" }}>{u.t}</b>
          {u.txt && <Viac text={u.txt} />}
          {u.pz > 0 && pozvat(u)}
          {u.mojeX && <MenuPrispevku x={u.mojeX} strankaId={strankaId} kto={kto} moje={moje(u.mojeX)} />}
        </div>
      </div>); })()}
    {(udalosti.length > 1 || alba.length > 0) && <div style={{ display: "grid", gridTemplateColumns: `repeat(${k3 || siroka ? 2 : 1},minmax(0,1fr))`, gap: 14 }}>
      {udalosti.filter((u) => u.id !== velkaU?.id).map((u) => { const d = u.dat ? zIso(u.dat) : null, n = u.zoznam.length; return (
        <button key={u.id} type="button" onClick={() => setPridV(u.id)} style={{ display: "flex", gap: 14, alignItems: "center", padding: 14, borderRadius: 18, background: KARTA, border: "none", color: INK, fontFamily: "inherit", textAlign: "left", cursor: "pointer", minWidth: 0 }}>
          {/* OPRAVY 250: akcia s fotkou má náhľad ako albumy, dátum ako odznak na fotke; bez fotky dátumový štvorec */}
          {u.foto ? <span style={{ position: "relative", flex: "none", width: 140, height: 104, borderRadius: 12, background: `center/cover no-repeat url('${u.foto}')` }}>{d && <span style={{ position: "absolute", left: 6, top: 6 }}><KDatum d={d} odznak /></span>}</span>
            : d ? <KDatum d={d} /> : null}
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 16.5, lineHeight: 1.25 }}>{u.t}</b><span style={{ fontSize: 14.5, color: INK3 }}>{[u.kedy.split(" · ").slice(1).join(" · ").toLocaleLowerCase("sk-SK"), u.mojeX ? autor(u.mojeX).replace("Pridal veriaci", "pridal veriaci") : "", n ? `${n} príde` : ""].filter(Boolean).join(" · ")}</span></span>
        </button>); })}
      {alba.map((a) => { const f = a.fotky!.find(ziveObr)!; return (
        <button key={a.id} type="button" onClick={() => setAlbum(a)} style={{ display: "flex", gap: 14, alignItems: "center", padding: 14, borderRadius: 18, background: KARTA, border: "none", color: INK, fontFamily: "inherit", textAlign: "left", cursor: "pointer", minWidth: 0 }}>
          <span style={{ flex: "none", width: 140, height: 104, borderRadius: 12, background: `center/cover no-repeat url('${f}')` }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 16.5 }}>{a.t || "Fotky z akcie"}</b><span style={{ fontSize: 14.5, color: INK3 }}>{[`${a.fotky!.filter(ziveObr).length} fotiek`, a.anon ? "" : `pridal ${a.kto}`].filter(Boolean).join(" · ")}</span></span>
        </button>); })}
    </div>}
  </>);
  // --- Teš sa s nami = zápis v kronike ---
  const kTes = maTes && sekcia("tes", "Teš sa s nami", S.tes, <>
    <div style={{ display: "flex", flexDirection: "column", borderTop: k3 ? "1.5px solid var(--nf-linia)" : `1px solid ${LINKA}` }}>
      {tesy.map((t) => { const d = t.datum && /^\d{4}-\d{2}-\d{2}/.test(t.datum) ? zIso(t.datum.slice(0, 10)) : t.it?.vytvorene ? new Date(t.it.vytvorene) : t.x?.cas ? new Date(t.x.cas) : undefined;
        const st = t.ine ? "OZNÁMENIE" : t.druh === "svadba" ? "SVADBA" : t.druh === "jubileum" ? "JUBILEUM" : t.dakuje ? "POĎAKOVANIE" : "BLAHOŽELANIE";
        const obr = t.foto ?? t.it?.fotky?.find(ziveObr) ?? (t.it ? obrFar(t.it) || undefined : undefined) ?? (t.x ? obrVer(t.x) || undefined : undefined);
        const veta = t.ine ? "" : [t.druh === "jubileum" && t.vek ? `${t.vek} ${rokyT(Number(t.vek)).toLocaleLowerCase("sk-SK")}` : "", t.pod ?? ""].filter(Boolean).join(" · ") || (t.nadpis !== t.meno ? t.nadpis : "");
        return <Zapis key={t.id} d={d} obr={obr ?? ""} stitok={st} farbaStitku={t.druh === "svadba" ? "var(--nf-teal)" : ZLATA} t={t.ine ? t.nadpis : t.meno} veta={veta || (t.r.zoznam.length ? reakT(!!t.dakuje, t.r.zoznam.length) : undefined)} serif onTap={() => setTes(t)} />; })}
    </div>
  </>);
  // --- Spomíname = zápis na tmavšom pozadí ---
  const kSpom = maSpom && sekcia("spom", "Spomíname", S.spom, <>
    <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid color-mix(in srgb,var(--nf-linka) 70%,transparent)" }}>
      {spomienky.map((sp) => { const n = sp.x ? pocetSus(sp.x) : (reakcieF(strankaId, sp.zb?.id ?? sp.id).sustrast ?? []).length; return (
        <SpomZapis key={sp.id} foto={sp.foto} symbol={symbol} meno={sp.d.meno} roky={rokyParte(sp.d.nar, sp.d.umr)} rozlucka={[rozluckaT(sp.d.rd, sp.d.rc), sp.d.rm].filter(Boolean).join(" · ")} zbierka={!!sp.zb} sustrast={n} onTap={() => setParte(sp)} />); })}
    </div>
  </>, { pozadie: "var(--nf-spom)" });
  // --- Od veriacich ---
  const kVer = oznVer.length > 0 && sekcia("ver", "Od veriacich", S.ver, <>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${k3 || siroka ? 2 : 1},minmax(0,1fr))`, gap: 14 }}>
      {oznVer.map((x) => (
        <div key={x.id} style={{ padding: "18px 20px", borderRadius: 20, background: KARTA, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          {hlavickaAutora(x)}
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", color: INK3 }}>OZNAM · {dd(x.cas)}</span>
          <b style={{ fontSize: 19 }}>{x.t}</b>
          {x.s && <Viac text={x.s} velkost={16} />}
          {x.fotky?.some(ziveObr) && <button type="button" onClick={() => setAlbum(x)} aria-label="Fotky na celú obrazovku" style={{ border: "none", padding: 0, borderRadius: 14, overflow: "hidden", cursor: "zoom-in" }}><img src={x.fotky.find(ziveObr)} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} /></button>}
          <MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={moje(x)} />
        </div>))}
    </div>
  </>);
  // --- Deti a mládež (ten istý blok ako na Nástenke) ---
  const kDeti = k3 ? <DetiAMladezBlok strankaId={strankaId} blokStyl={{ padding: "36px 40px", borderTop: `1px solid ${LINKA}`, display: "flex", flexDirection: "column", gap: 14, scrollMarginTop: 16 }} lavy={<>{KN("Deti a mládež")}<span aria-hidden="true" style={{ height: 1.5, background: "var(--nf-linia)" }} /></>} kto={kto} mojeMeno={mojeMeno} reg={reg} />
    : maDeti && zbK("deti", "Deti a mládež", S.deti, <DetiAMladezBlok strankaId={strankaId} blokStyl={{}} lavy={null} kto={kto} mojeMeno={mojeMeno} reg={reg} />);
  // --- Farský úrad ---
  const pole = (n: string, v: ReactNode) => <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: INK3 }}>{n}</span><span style={{ fontSize: 16.5, lineHeight: 1.5, color: INK, overflowWrap: "anywhere" }}>{v}</span></span>;
  const adresa = k ? (k.adresaVerejna.trim() || k.sidlo.trim()) : "";
  const tel = k?.telefony.map((t) => t.cislo.trim()).filter(Boolean) ?? [], mail = k?.emaily.map((e) => e.adresa.trim()).filter(Boolean) ?? [];
  const hodiny = maUH(uh) ? DNI_UH.map((dn, i) => { const c = casyUH(uh, i); return c.length ? `${dn} ${c.map(textCasu).join(", ")}` : ""; }).filter(Boolean).join(" · ") : "";
  const filialky = miestaF.slice(1).map((m) => m.nazov);
  const fotoFaryEl = fotoFary && <img src={fotoFary} alt="Fara" style={{ width: "100%", aspectRatio: k3 ? "3 / 2" : "16 / 9", objectFit: "cover", borderRadius: k3 ? 20 : 16, display: "block" }} />;
  const uradPolia = <>
      {adresa && pole("ADRESA", <>{meno}<br />{adresa}</>)}
      {(tel.length > 0 || mail.length > 0) && pole("KONTAKT", <>{[...tel.map((t) => <a key={t} href={`tel:${t.replace(/\s/g, "")}`} style={{ color: "var(--nf-gInk)", fontWeight: 800, textDecoration: "none" }}>{t}</a>), ...mail.map((m) => <a key={m} href={`mailto:${m}`} style={{ color: "var(--nf-gInk)", fontWeight: 800, textDecoration: "none" }}>{m}</a>)].flatMap((e, i) => (i ? [<span key={`s${i}`}> · </span>, e] : [e]))}</>)}
      {hodiny && pole("ÚRADNÉ HODINY", <>{hodiny}{uh?.poz.trim() && <span style={{ display: "block", fontSize: 14.5, color: INK3 }}>{uh.poz.trim()}</span>}</>)}
      {ud.spravca.trim() && pole("SPRÁVCA FARNOSTI", ud.spravca.trim())}
      {(ud.ico.trim() || ud.dic.trim()) && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, paddingTop: 12, borderTop: `1px solid ${LINKA}` }}>
        {ud.ico.trim() && pole("IČO", ud.ico.trim())}{ud.dic.trim() && pole("DIČ", ud.dic.trim())}
      </div>}
      {ud.iban.trim() && pole("BANKOVÉ SPOJENIE", <b>{ud.iban.trim()}</b>)}
      {filialky.length > 0 && <span style={{ fontSize: 15, color: INK3 }}>Filiálky: {filialky.join(" · ")}</span>}
  </>;
  const kUrad = maUrad && (k3 ? <section data-blok="urad" style={{ marginTop: 12, padding: "40px 40px 56px", borderTop: "4px solid var(--nf-linia)", display: "grid", gridTemplateColumns: fotoFary ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 36, alignItems: "start", scrollMarginTop: 16 }}>
    {fotoFaryEl}
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{KN("Farský úrad")}{uradPolia}</div>
  </section> : zbK("urad", "Farský úrad", S.urad, <>{fotoFaryEl}<div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{uradPolia}</div></>));
  // --- archív rokov ---
  const kArchiv = archiv.length > 0 && <section aria-label="Archív rokov" style={{ padding: k3 ? "12px 40px 56px" : "8px 18px 36px", display: "flex", flexDirection: "column", gap: 16 }}><ArchivRokov roky={archiv} maly={!k3} matna={matna} /></section>;
  // --- hľadanie (oznamy, akcie, prosby, staršie roky) ---
  const hladat: NajdenePolozka[] = [
    ...ozAll.map((x) => ({ id: `o${x.id}`, t: x.t, s: x.txt, druh: "OZNAM", blok: "ozn" })),
    ...udalosti.map((u) => ({ id: `u${u.id}`, t: u.t, s: u.txt, druh: "AKCIA", blok: "prid", onTap: () => { setPridV(u.id); naBlok("prid"); } })),
    ...prosby.map((x) => ({ id: `m${x.id}`, t: x.t || x.s || "Prosba", s: x.s, druh: "PROSBA", blok: "mod" })),
    ...tesy.map((t) => ({ id: `t${t.id}`, t: t.ine ? t.nadpis : t.meno, druh: "TEŠ SA S NAMI", blok: "tes", onTap: () => setTes(t) })),
    ...spomienky.map((sp) => ({ id: `s${sp.id}`, t: sp.d.meno, druh: "SPOMÍNAME", blok: "spom", onTap: () => setParte(sp) })),
    ...pomoz.map((u) => ({ id: `p${u.id}`, t: u.t, s: u.txt, druh: "POMÔŽ", blok: "pom" })),
    ...archiv.flatMap((r) => r.zapisy.map((z) => ({ id: `a${z.id}`, t: z.t, s: z.pod, druh: `${r.rok} · ${z.stitok}`, blok: `rok${r.rok}`, onTap: z.onTap }))),
  ];
  const lista = [["tyzden", "Týždeň"], ["ozn", "Oznamy"], ["vyp", "Vypočuj si"], ["mod", "Modli sa"], ["pom", "Pomôž"], ["prid", "Príď"], ["tes", "Teš sa"], ["spom", "Spomíname"], ["ver", "Od veriacich"], ["deti", "Deti"], ["kostoly", "Kostoly"], ["urad", "Úrad"]] as const;
  const maBlok: Record<string, boolean> = { tyzden: maTyzden, ozn: ozAll.length > 0, vyp: maVyp, mod: prosby.length > 0, pom: pomoz.length > 0, prid: maPrid, tes: maTes, spom: maSpom, ver: oznVer.length > 0, deti: maDeti, kostoly: miestaF.length > 1, urad: maUrad };
  const listaBloky = [...lista.filter(([id]) => maBlok[id]).map(([id, t]) => ({ id, t })), ...archiv.map((r) => ({ id: `rok${r.rok}`, t: String(r.rok) }))];
  const profilKronika = (
    <>
      <div style={{ position: "relative", height: k3 ? 250 : 190, background: cover ? `linear-gradient(180deg,rgba(10,8,5,.35),rgba(10,8,5,.05) 40%,rgba(10,8,5,.75)),url('${cover}') center/cover` : "linear-gradient(180deg,#2A2E26,#14110B)" }}>
        {onBack && <button type="button" onClick={onBack} style={{ position: "absolute", top: k3 ? 18 : "calc(10px + env(safe-area-inset-top, 0px))", left: k3 ? 20 : 12, minHeight: k3 ? 44 : 40, padding: k3 ? "0 16px" : "0 12px", border: "none", borderRadius: 13, background: "rgba(255,255,255,.92)", color: "#14110B", fontFamily: "inherit", fontSize: k3 ? 15 : 14, fontWeight: 800, cursor: "pointer" }}>{nahlad ? "‹ Späť do Správy" : "‹ Späť"}</button>}
        {zivoT && zivoUrl && <a href={zivoUrl} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", top: k3 ? 18 : 12, right: k3 ? 20 : 12, minHeight: 44, padding: "0 16px", borderRadius: 22, background: "#B3261E", color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />NAŽIVO</a>}
        {logo ? <img src={logo} alt="Logo" style={{ position: "absolute", left: k3 ? 24 : 18, bottom: k3 ? -44 : -36, width: k3 ? 96 : 72, height: k3 ? 96 : 72, borderRadius: profil?.tvar === "kruh" ? "50%" : k3 ? 26 : 20, objectFit: "cover", background: "#fff", border: "3px solid var(--nf-papier)", boxShadow: "0 6px 20px rgba(0,0,0,.35)" }} />
          : <span role="img" aria-label="Logo farnosti" style={{ position: "absolute", left: k3 ? 24 : 18, bottom: k3 ? -44 : -36, width: k3 ? 96 : 72, height: k3 ? 96 : 72, borderRadius: k3 ? 26 : 20, background: "#fff", color: "#14110B", border: "3px solid var(--nf-papier)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: k3 ? 34 : 26, fontWeight: 800, boxShadow: "0 6px 20px rgba(0,0,0,.35)" }}>{inic}</span>}
      </div>
      <div style={{ padding: k3 ? "60px 28px 0" : "48px 18px 0", display: "flex", flexDirection: "column", gap: k3 ? 20 : 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><b style={{ fontSize: k3 ? 38 : 30, lineHeight: 1.05, letterSpacing: "-.035em" }}>{meno}</b>{podMeno && <span style={{ fontSize: 16, color: INK3 }}>{podMeno}</span>}</div>
        {onas && <span style={{ fontSize: 16.5, lineHeight: 1.6, color: INK2 }}>{onasOtv ? <span style={{ whiteSpace: "pre-line" }}>{onas}</span> : <>{onas.split(/(?<=[.!?])\s|\n/)[0]} <button type="button" onClick={() => setOnasOtv(true)} style={{ border: "none", background: "transparent", padding: 0, color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: "inherit", fontWeight: 800, cursor: "pointer" }}>viac ›</button></>}</span>}
        <div style={{ display: "grid", gridTemplateColumns: maOmse ? "1fr 1fr" : "1fr", gap: 8 }}>
          {sledBtn}
          {maOmse && <button type="button" onClick={() => setKalOtv(true)} style={{ minHeight: 52, minWidth: 0, padding: "6px 10px", borderRadius: 14, border: `1.5px solid ${LINKA}`, background: KARTA, color: INK, fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", textAlign: "left" }}>
            <b style={{ maxWidth: "100%", fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Omše a kalendár</b>
            {casyDna(dnesD) && <span style={{ maxWidth: "100%", fontSize: 12.5, fontWeight: 700, color: INK3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>dnes {casyDna(dnesD)}</span>}
          </button>}
        </div>
      </div>
    </>);
  const kalOkno = kalOtv && <CelaObrazovka label="Omše a kalendár" onZavri={() => setKalOtv(false)}>
    <div className="nastenka-farnosti" style={{ ...PREMENNE, ["--nf-linia" as string]: farbaLinie, flex: 1, minHeight: 0, overflowY: "auto", background: BG, color: INK, padding: "16px clamp(16px,4vw,40px) 32px" } as CSSProperties}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}><TyzdenFarnosti strankaId={strankaId} slovo={SLF.omsa} siroka cas={cas} miestaF={miestaF} mojKostol={jeHl ? MF.mojKostol : null} /></div>
    </div>
  </CelaObrazovka>;
  const kronikaTelo = kronika && (prazdna
    ? <div style={{ display: "flex", flexDirection: "column", background: PAPIER }}>{profilKronika}<div style={{ padding: k3 ? "28px 28px 64px" : "20px 18px 48px" }}><span style={{ fontSize: 17, color: INK3 }}>Farnosť tu zatiaľ nič nezverejnila.</span></div></div>
    : k3
      ? <div className="kronika" style={{ display: "flex", alignItems: "stretch", minHeight: "100%" }}>
        <aside style={{ flex: "none", width: "clamp(320px,30vw,440px)", borderRight: "2px solid var(--nf-linia)", background: PAPIER, display: "flex", flexDirection: "column" }}>
          {profilKronika}
          <div style={{ padding: "20px 28px 48px", display: "flex", flexDirection: "column", gap: 0 }}>
            {[kZbierky, kKostoly, kOmse, kPomoz].filter(Boolean).map((x, i) => <div key={i} style={{ paddingTop: 20, marginTop: i ? 20 : 0, borderTop: "2px solid var(--nf-linia)" }}>{x}</div>)}
          </div>
        </aside>
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "22px 40px 18px", borderBottom: "2px solid var(--nf-linia)" }}><KronikaHladat polozky={hladat} onBlok={posunNaBlok} /></div>
          {kTyzden}{kOznamy}{kVyp}{kModli}{kPrid}{kTes}{kSpom}{kVer}{kDeti}{kUrad}{kArchiv}
        </main>
        <KronikaLista bloky={listaBloky} />
      </div>
      : <div className="kronika" style={{ display: "flex", flexDirection: "column" }}>
        {profilKronika}
        {kTyzden}
        {maZbierky && zbK("zbierky", "Zbierky farnosti", zbS, zbObsah)}
        {kOznamy}{kVyp}{kModli}
        {pomoz.length > 0 && zbK("pom", "Pomôž", S.pom, pomObsah)}
        {kPrid}{kTes}{kSpom}{kVer}
        {kKostoly}
        {kDeti}
        {maOmse && omseDni.length > 0 && zbK("omse", "Sväté omše", S.omse, <SvateOmse matna={matna} maly onCely={() => setKalOtv(true)} dni={omseDni} bezNadpisu />, { hrubo: true })}
        {kUrad}{kArchiv}
      </div>);
  // päta Nástenky: kancelária, správca, údaje, úradné hodiny
  const uradBox = <div style={{ flex: "0 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
    {urad.length > 0 && <><span style={kicker()}>{miestaF.length > 1 ? "KANCELÁRIA FARSKÉHO ÚRADU" : "FARSKÝ ÚRAD"}</span>
    <span style={{ fontSize: 16.5, lineHeight: 1.6, color: INK2, whiteSpace: "pre-line" }}>{urad.join("\n")}</span></>}
    {ud.spravca.trim() && <span style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: urad.length ? 4 : 0 }}><span style={{ ...kicker(), fontSize: 12.5 }}>SPRÁVCA FARNOSTI</span><span style={{ fontSize: 16.5, lineHeight: 1.5, color: INK }}>{ud.spravca.trim()}</span></span>}
    {(udajeR || ud.iban.trim()) && <span style={{ fontSize: 14.5, lineHeight: 1.6, color: INK3, whiteSpace: "pre-line" }}>{[udajeR, ud.iban.trim() && `IBAN ${ud.iban.trim()}`].filter(Boolean).join("\n")}</span>}
    {maUH(uh) && <>
      <span style={{ ...kicker(), paddingTop: urad.length ? 8 : 0 }}>ÚRADNÉ HODINY</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 16.5, lineHeight: 1.6, color: INK2 }}>
        {DNI_UH.map((dn, i) => { const c = casyUH(uh, i); return c.length ? <span key={dn}>{dn} <b style={{ color: INK }}>{c.map(textCasu).join(", ")}</b></span> : null; })}
      </span>
      {uh?.poz.trim() && <span style={{ fontSize: 14, lineHeight: 1.5, color: INK3 }}>{(() => { const t = uh.poz.trim(), i = t.toLocaleLowerCase("sk-SK").indexOf("farské oznamy");
        return i < 0 || !ozAll.length ? t : <>{t.slice(0, i)}<button type="button" onClick={() => naBlok("ozn")} style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", color: "var(--nf-gInk)", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>{t.slice(i, i + 13)}</button>{t.slice(i + 13)}</>; })()}</span>}
    </>}
  </div>;
  // ============================================================
  // KARTA 65 · Moderné — titulka cez celú šírku, lišta blokov (PC), dlaždice v nerovnom rytme; mobil a tablet na výšku zbalené
  // ============================================================
  const moderne = rozlozenie === "moderne";
  const pcVelke = useAspon(1366); // PC 1440 vs. tablet na šírku
  useEffect(() => { if (!moderne) return; nastavFabRezim(pc && pcVelke ? "lista" : pc ? "" : "maly"); return () => nastavFabRezim(""); }, [moderne, pc, pcVelke]);
  const [pasMod, posMod] = usePas(), [pasTes, posTes] = usePas(), [pasPrid, posPrid] = usePas(), [pasKos, posKos] = usePas();
  const [pasOzn, posOzn] = usePas(true), [pasSpom, posSpom] = usePas(true);
  const [mHladat, setMHladat] = useState(false);
  const mob = !pc, mt = siroka && !pc;
  /** koľko kariet je na šírku v pase (mobil 86 %, tablet 48 %) */
  const nPas = (pcN: number) => (mob ? (mt ? 2.08 : 1.163) : pcN);
  const naBiele = { ["--nf-ink" as string]: "#fff", ["--nf-ink2" as string]: "#E8E1D3", ["--nf-ink3" as string]: "#E8E1D3", ["--nf-plne" as string]: "#F1ECE1", ["--nf-plneInk" as string]: "#14110B", ["--nf-linka" as string]: "rgba(255,255,255,.3)", color: "#fff" } as CSSProperties;
  // --- titulka ---
  const dnesCasy = casyDna(dnesD);
  const dnesOkno = (dnesCasy || zmenaT || poctyT) ? (
    <div style={pc
      ? { flex: "none", width: 340, padding: "22px 24px", borderRadius: 24, background: "rgba(22,25,20,.72)", border: "1px solid rgba(255,255,255,.16)", display: "flex", flexDirection: "column", gap: 12, color: "#fff" }
      : { padding: "12px 14px", borderRadius: 18, background: PAPIER, border: `1px solid ${LINKA}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      {(dnesCasy || zmenaT) && <span style={{ display: "flex", flexDirection: "column", gap: pc ? 12 : 2, minWidth: 0 }}>
        <span style={{ fontSize: pc ? 13 : 12, fontWeight: 800, letterSpacing: ".12em", color: pc ? "#A9D18A" : "var(--nf-gInk)" }}>● DNES · {DNW_V[dvt(dnesD)]}</span>
        {dnesCasy && <b style={{ fontSize: pc ? 34 : 20, lineHeight: pc ? 1 : 1.2, letterSpacing: pc ? "-.03em" : undefined }}>{dnesCasy}</b>}
        {zmenaT && <span style={{ fontSize: pc ? 15.5 : 13.5, color: pc ? "#E08A7A" : CERVENA }}>{zmenaT}</span>}
      </span>}
      {poctyT && <span style={pc ? { paddingTop: dnesCasy || zmenaT ? 12 : 0, borderTop: dnesCasy || zmenaT ? "1px solid rgba(255,255,255,.16)" : "none", display: "flex", flexDirection: "column", gap: 2 } : { textAlign: "right", display: "flex", flexDirection: "column", gap: 2, marginLeft: "auto" }}>
        <b style={{ fontSize: pc ? 17 : 14.5 }}>Tento týždeň</b><span style={{ fontSize: pc ? 15 : 12.5, color: pc ? "#E8E1D3" : INK3 }}>{poctyT}</span></span>}
    </div>) : null;
  const omseTl = maOmse && <button type="button" onClick={() => setKalOtv(true)} style={pc
    ? { minHeight: 54, padding: "6px 20px", borderRadius: 15, background: "rgba(22,25,20,.6)", border: "1px solid rgba(255,255,255,.22)", color: "#fff", fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", textAlign: "left" }
    : { minHeight: 50, minWidth: 0, padding: "4px 12px", borderRadius: 14, background: PAPIER, border: `1px solid ${LINKA}`, color: INK, fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
    <b style={{ maxWidth: "100%", fontSize: pc ? 15.5 : 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Omše a kalendár</b>
    {S.omse && <span style={{ maxWidth: "100%", fontSize: pc ? 13 : 12.5, fontWeight: 700, color: pc ? "#E8E1D3" : INK3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{S.omse}</span>}
  </button>;
  const onasVeta = onas.split(/(?<=[.!?])\s|\n/)[0];
  const viacOnas = !onasOtv && onasVeta !== onas && <> <button type="button" onClick={() => setOnasOtv(true)} style={{ border: "none", background: "transparent", padding: 0, color: pc ? "#A9D18A" : "var(--nf-gInk)", fontFamily: "inherit", fontSize: "inherit", fontWeight: 800, cursor: "pointer" }}>viac ›</button></>;
  /** celý text O nás vždy na podklade --nf-papier */
  const onasCely = onasOtv && onas && <div style={{ padding: pc ? "22px 26px" : "16px 18px", borderRadius: pc ? 24 : 18, background: PAPIER, border: `1px solid ${LINKA}`, display: "flex", flexDirection: "column", gap: 10 }}>
    <span style={{ fontSize: pc ? 17 : 15.5, lineHeight: 1.6, color: INK2, whiteSpace: "pre-line" }}>{onas}</span>
    <button type="button" onClick={() => setOnasOtv(false)} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Zbaliť ⌃</button>
  </div>;
  const logoEl = (s: number, r: number) => logo ? <img src={logo} alt="Logo" style={{ width: s, height: s, borderRadius: profil?.tvar === "kruh" ? "50%" : r, objectFit: "cover", background: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,.4)", display: "block" }} />
    : <span role="img" aria-label="Logo farnosti" style={{ width: s, height: s, borderRadius: r, background: "#fff", color: "#14110B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(s * 0.36), fontWeight: 800, boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>{inic}</span>;
  const spatTl = onBack && <button type="button" onClick={onBack} style={{ flex: "none", whiteSpace: "nowrap", minHeight: pc ? 46 : 44, padding: pc ? "0 18px" : "0 14px", border: "none", borderRadius: 14, background: "rgba(255,255,255,.92)", color: "#14110B", fontFamily: "inherit", fontSize: pc ? 15 : 14, fontWeight: 800, cursor: "pointer" }}>{nahlad ? "‹ Späť do Správy" : "‹ Späť"}</button>;
  const zivoTl = zivoT && zivoUrl && <a href={zivoUrl} target="_blank" rel="noopener noreferrer" style={{ flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 22, background: "#B3261E", color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />NAŽIVO</a>;
  const fotoTitulky = (stm: string) => cover ? `${stm},url('${cover}') center 40%/cover` : "linear-gradient(160deg,#3A372E,#14110B)";
  const mTitulka = pc ? <>
    <header style={{ position: "relative", minHeight: pcVelke ? 600 : 480, boxSizing: "border-box", background: fotoTitulky("linear-gradient(180deg,rgba(10,8,5,.45),rgba(10,8,5,0) 30%,rgba(10,8,5,.2) 55%,rgba(14,16,12,.96))"), display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 24, padding: pcVelke ? "24px 48px 44px" : "20px 32px 32px", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {spatTl}<span style={{ flex: 1 }} />{zivoTl}
        <div style={{ width: pcVelke ? 420 : 340, maxWidth: "45%" }}><KronikaHladat polozky={hladat} onBlok={naBlok} /></div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 780, minWidth: 0 }}>
          {logoEl(104, 28)}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><b style={{ fontSize: pcVelke ? 84 : 62, lineHeight: .98, letterSpacing: "-.045em", textWrap: "balance" } as CSSProperties}>{meno}</b>{podMeno && <span style={{ fontSize: 18, color: "#E8E1D3" }}>{podMeno}</span>}</div>
          {onas && !onasOtv && <span style={{ fontSize: 18, lineHeight: 1.55, color: "#E8E1D3", maxWidth: 620, textWrap: "pretty" } as CSSProperties}>{onasVeta}{viacOnas}</span>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{sledBtn}{omseTl}</div>
        </div>
        {dnesOkno}
      </div>
    </header>
    {onasCely && <div style={{ padding: pcVelke ? "24px 48px 0" : "20px 32px 0" }}>{onasCely}</div>}
  </> : <>
    <div style={{ position: "relative", height: mt ? 280 : 200, background: fotoTitulky("linear-gradient(180deg,rgba(10,8,5,.4),rgba(10,8,5,0) 45%,rgba(10,8,5,.35))") }}>
      <div style={{ position: "absolute", left: 12, right: 12, top: "calc(10px + env(safe-area-inset-top, 0px))", display: "flex", alignItems: "center", gap: 10 }}>
        {spatTl}<span style={{ flex: 1 }} />{zivoTl}
        <button type="button" aria-label="Hľadať vo farnosti" aria-expanded={mHladat} onClick={() => setMHladat(!mHladat)} style={{ flex: "none", width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,.25)", background: "rgba(22,25,20,.6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}><Lupa size={20} /></button>
      </div>
      <span style={{ position: "absolute", left: 18, bottom: -31 }}>{logoEl(62, 18)}</span>
    </div>
    <div style={{ padding: `${mHladat ? 44 : 42}px ${mt ? 24 : 18}px 0`, display: "flex", flexDirection: "column", gap: 12 }}>
      {mHladat && <KronikaHladat polozky={hladat} onBlok={(b) => { setMHladat(false); naBlok(b); }} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 31, lineHeight: 1.08, letterSpacing: "-.035em" }}>{meno}</b>{podMeno && <span style={{ fontSize: 15, color: INK3 }}>{podMeno}</span>}</div>
      {onas && !onasOtv && <span style={{ fontSize: 15.5, lineHeight: 1.5, color: INK2 }}>{onasVeta}{viacOnas}</span>}
      {onasCely}
      <div style={{ display: "grid", gridTemplateColumns: maOmse ? "1fr 1fr" : "1fr", gap: 8 }}>{sledBtn}{omseTl}</div>
      {dnesOkno}
    </div>
  </>;
  // --- obsah blokov (spoločný pre PC a mobil) ---
  const mOznRiadok = (x: Oz) => { const o = ozOtv === x.id, kde = miestaF.length > 1 && x.mi ? x.mi.map((id) => miestaF.find((m) => m.id === id)?.nazov).filter(Boolean).join(" · ") : ""; return (
    <div key={x.id} style={{ flex: "none", scrollSnapAlign: "start", display: "flex", gap: mob ? 14 : 18, alignItems: "center", padding: "13px 16px", borderRadius: 20, background: KARTA }}>
      <KDatum d={new Date(x.ms || cas.getTime())} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: x.zm ? CERVENA : INK3 }}>{x.chip}</span>{kde && <span style={{ padding: "2px 8px", borderRadius: 7, background: "var(--nf-gSoft)", color: "var(--nf-gInk)", fontSize: 12.5, fontWeight: 800 }}>{kde}</span>}</span>
        <b style={{ fontSize: 19, lineHeight: 1.3, overflowWrap: "anywhere" }}>{x.t}</b>
        {x.txt && (o ? <Viac text={x.txt} velkost={16} riadkov={40} /> : <button type="button" onClick={() => setOzOtv(x.id)} style={{ padding: 0, border: "none", background: "transparent", color: INK2, fontFamily: "inherit", fontSize: 16, textAlign: "left", cursor: "pointer", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{x.txt}</button>)}
        {x.foto && <button type="button" onClick={() => setVelke({ src: x.foto! })} aria-label="Fotka na celú obrazovku" style={{ alignSelf: "flex-start", border: "none", padding: 0, borderRadius: 12, overflow: "hidden", cursor: "zoom-in", marginTop: 4 }}><img src={x.foto} alt="" style={{ width: 220, maxWidth: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} /></button>}
        {o && hlavickaFar(x.af)}
      </span>
    </div>); };
  /** zoznam dole v bloku: vo dvojici vyplní výšku suseda, inak najviac 460 (mobil 340) px */
  const zoznamY = (ref: RefObject<HTMLDivElement>, deti: ReactNode, vo2: boolean) => (
    <div ref={ref} className="md-pas" style={{ ...(vo2 && !mob ? { flex: "1 1 0", minHeight: 220 } : { maxHeight: mob ? 340 : 460 }), display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", scrollSnapType: "y mandatory", scrollbarWidth: "none", overscrollBehaviorY: "contain" }}>{deti}</div>);
  const mVyp = <>
    {p && <button type="button" onClick={() => setPrihOn(true)} style={{ border: "none", padding: 0, background: "transparent", color: INK, fontFamily: "inherit", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: mob ? 14 : 20, background: "#0E100C", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 0, height: 0, borderLeft: "20px solid #14110B", borderTop: "12px solid transparent", borderBottom: "12px solid transparent", marginLeft: 6 }} /></span></span>
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".12em", color: INK3 }}>PRÍHOVOR FARÁRA · PRIDANÝ {dd(p.cas)}</span><b style={{ fontSize: mob ? 18 : 22, letterSpacing: "-.015em" }}>Príhovor farára</b></span>
    </button>}
    {zivoUrl && (dalsiaOnline || zivoT) && <a href={zivoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", padding: "14px 16px", borderRadius: 18, background: KARTA, border: "1.5px solid color-mix(in srgb,#B3261E 45%,transparent)", color: INK, textDecoration: "none" }}>
      <span style={{ flex: "none", minHeight: 36, padding: "0 12px", borderRadius: 18, background: "#B3261E", color: "#fff", fontSize: 13.5, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", gap: 7 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />{zivoT ? "NAŽIVO" : "ONLINE"}</span>
      <b style={{ flex: "1 1 160px", minWidth: 0, fontSize: 16.5 }}>{zivoT ?? `Omša online${dalsiaOnline ? ` · ${dalsiaOnline}` : ""}`}</b>
      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--nf-gInk)" }}>Pozrieť ›</span>
    </a>}
  </>;
  const mModli = <PasX pasRef={pasMod}>{prosby.map((x) => (
    <div key={x.id} style={{ ...sirkaKarty(nPas(3.25)), padding: mob ? 18 : 24, borderRadius: 24, background: KARTA, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16 }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>{x.anon || /Bohu známy/.test(x.kto) ? <span style={{ fontSize: 14.5, color: INK3 }}>bez mena</span> : hlavickaAutora(x)}{x.t && <b style={{ fontSize: mob ? 18 : 20, lineHeight: 1.4 }}>{x.t}</b>}{x.s && <span style={{ fontSize: 16, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line" }}>{x.s}</span>}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>{reakcia({ ...reakV(x, "modl"), t: "Modlím sa s vami", tJa: "Modlíte sa s nami ✓", poc: (n) => `${n} sa modlí` })}<MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={moje(x)} /></span>
    </div>))}</PasX>;
  const mPomoz = <div style={{ display: "grid", gridTemplateColumns: `repeat(${mob && !mt ? 1 : 2},minmax(0,1fr))`, gap: 16 }}>{pomoz.map((u) => { const b = brigadyF.find((x) => x.id === u.id), d = u.dat ? zIso(u.dat) : null; return (
    <div key={u.id} style={{ padding: mob ? 18 : 24, borderRadius: 24, background: KARTA, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      {u.foto && <img src={u.foto} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 16, display: "block" }} />}
      <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={{ padding: "5px 12px", borderRadius: 14, background: "var(--nf-linia)", color: "var(--md-naLinii)", fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em" }}>{(b?.druh ?? "Brigáda").toLocaleUpperCase("sk-SK")}</span>{d && <span style={{ fontSize: 14.5, fontWeight: 700, color: INK3 }}>{den(d)} {dm(d)}</span>}</span>
      <b style={{ fontSize: mob ? 20 : 23, lineHeight: 1.2 }}>{u.t}</b>
      {u.txt && <Viac text={u.txt} velkost={16} />}
      {(u.od || b?.cas) && <span style={{ display: "flex", gap: 28, flexWrap: "wrap", padding: "10px 0", borderTop: `1px solid ${LINKA}`, borderBottom: `1px solid ${LINKA}`, fontSize: 15 }}>{u.od && <span><span style={{ color: INK3 }}>Kde </span><b>{u.od}</b></span>}{b?.cas && <span><span style={{ color: INK3 }}>Kedy </span><b>{b.cas}</b></span>}</span>}
      {u.pz > 0 && pozvat(u)}
    </div>); })}</div>;
  const pridKarta = (u: Ud, velka: boolean) => { const d = u.dat ? zIso(u.dat) : null; return (
    <div key={u.id} style={{ ...sirkaKarty(velka ? nPas(1.55) : nPas(3.1)), position: "relative", minHeight: mob ? 380 : 420, borderRadius: mob ? 22 : 28, overflow: "hidden", background: u.foto ? `center/${u.plag ? "contain" : "cover"} no-repeat url('${u.foto}') #14110B` : "linear-gradient(160deg,#3A372E,#14110B)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: velka && !mob ? 30 : 22, paddingTop: d ? 100 : undefined }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.1) 20%,rgba(10,8,5,.92))" }} />
      {u.foto && u.plag && <button type="button" onClick={() => setVelke({ src: u.foto })} aria-label="Plagát na celú obrazovku" style={{ position: "absolute", inset: 0, border: "none", background: "transparent", cursor: "zoom-in" }} />}
      {d && <span style={{ position: "absolute", left: 20, top: 20 }}><KDatum d={d} /></span>}
      <span style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, maxWidth: 640, ...naBiele }}>
        {u.mojeX ? hlavickaAutora(u.mojeX) : null}
        {u.kedy && <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".1em", color: "#D9B65A" }}>{u.kedy}</span>}
        <b style={{ fontSize: velka && !mob ? 40 : 22, lineHeight: 1.1, letterSpacing: "-.02em" }}>{u.t}</b>
        {u.txt && (velka ? <Viac text={u.txt} velkost={mob ? 15.5 : 17} /> : <span style={{ fontSize: 15, color: "#E8E1D3", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{u.txt}</span>)}
        {u.pz > 0 && pozvat(u)}
        {u.mojeX && <MenuPrispevku x={u.mojeX} strankaId={strankaId} kto={kto} moje={moje(u.mojeX)} />}
      </span>
    </div>); };
  const mPrid = <PasX pasRef={pasPrid}>
    {udalosti.map((u, i) => pridKarta(u, i === 0))}
    {alba.map((a) => { const f = a.fotky!.find(ziveObr)!; return (
      <div key={a.id} style={{ ...sirkaKarty(nPas(3.1)), position: "relative", minHeight: mob ? 380 : 420, borderRadius: mob ? 22 : 28, overflow: "hidden", background: `center/cover no-repeat url('${f}') #14110B`, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 22 }}>
        <button type="button" onClick={() => setAlbum(a)} aria-label={`${a.t || "Fotky z akcie"} · otvoriť`} style={{ position: "absolute", inset: 0, border: "none", background: "linear-gradient(180deg,rgba(10,8,5,0) 30%,rgba(10,8,5,.9))", cursor: "pointer" }} />
        <span style={{ position: "relative", display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none", ...naBiele }}><span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".1em", color: "#D9B65A" }}>FOTKY · {fotiek(a.fotky!.filter(ziveObr).length)}</span><b style={{ fontSize: 22, lineHeight: 1.15 }}>{a.t || "Fotky z akcie"}</b>{!a.anon && <span style={{ fontSize: 15, color: "#E8E1D3" }}>pridal {a.kto}</span>}</span>
        <span style={{ position: "relative", ...naBiele }}><MenuPrispevku x={a} strankaId={strankaId} kto={kto} moje={moje(a)} /></span>
      </div>); })}
  </PasX>;
  const mTes = <PasX pasRef={pasTes} gap={14}>{tesy.map((t) => {
    const d = t.datum && /^\d{4}-\d{2}-\d{2}/.test(t.datum) ? zIso(t.datum.slice(0, 10)) : t.it?.vytvorene ? new Date(t.it.vytvorene) : t.x?.cas ? new Date(t.x.cas) : undefined;
    const st = t.ine ? "OZNÁMENIE" : t.druh === "svadba" ? "SVADBA" : t.druh === "jubileum" ? "JUBILEUM" : t.dakuje ? "POĎAKOVANIE" : "BLAHOŽELANIE";
    const obr = t.foto ?? t.it?.fotky?.find(ziveObr) ?? (t.it ? obrFar(t.it) || undefined : undefined) ?? (t.x ? obrVer(t.x) || undefined : undefined);
    const veta = t.ine ? "" : [t.druh === "jubileum" && t.vek ? `${t.vek} ${rokyT(Number(t.vek)).toLocaleLowerCase("sk-SK")}` : "", t.pod ?? ""].filter(Boolean).join(" · ") || (t.nadpis !== t.meno ? t.nadpis : "");
    const pod = veta || (t.r.zoznam.length ? reakT(!!t.dakuje, t.r.zoznam.length) : "");
    return (
      <button key={t.id} type="button" onClick={() => setTes(t)} style={{ ...sirkaKarty(nPas(2.2), 14), border: "none", padding: 0, borderRadius: 22, overflow: "hidden", background: KARTA, color: INK, fontFamily: "inherit", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column" }}>
        <span style={{ display: "block", width: "100%", aspectRatio: "16 / 10", background: obr ? `center/cover no-repeat url('${obr}')` : "linear-gradient(150deg,#5A4A22,#2E2715)" }} />
        <span style={{ padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: t.druh === "svadba" ? "var(--nf-teal)" : ZLATA }}>{st}{d ? ` · ${dm(d)}` : ""}</span>
          <b style={{ fontFamily: SERIF_KRONIKY, fontSize: 22, lineHeight: 1.25, fontWeight: 600 }}>{t.ine ? t.nadpis : t.meno}</b>
          {pod && <span style={{ fontSize: 15.5, color: INK3 }}>{pod}</span>}
        </span>
      </button>); })}</PasX>;
  const spomZoznam = (vo2: boolean) => zoznamY(pasSpom, spomienky.map((sp) => { const n = sp.x ? pocetSus(sp.x) : (reakcieF(strankaId, sp.zb?.id ?? sp.id).sustrast ?? []).length; return (
    <div key={sp.id} style={{ flex: "none", scrollSnapAlign: "start", padding: "0 16px", borderRadius: 20, background: KARTA }}>
      <SpomZapis foto={sp.foto} symbol={symbol} meno={sp.d.meno} roky={rokyParte(sp.d.nar, sp.d.umr)} rozlucka={[rozluckaT(sp.d.rd, sp.d.rc), sp.d.rm].filter(Boolean).join(" · ")} zbierka={!!sp.zb} sustrast={n} onTap={() => setParte(sp)} />
    </div>); }), vo2);
  const mVer = <div style={{ display: "grid", gridTemplateColumns: mt ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)", gap: 14 }}>{oznVer.map((x) => (
    <div key={x.id} style={{ padding: 20, borderRadius: 20, background: KARTA, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      {hlavickaAutora(x)}
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", color: INK3 }}>OZNAM · {dd(x.cas)}</span>
      <b style={{ fontSize: 19 }}>{x.t}</b>
      {x.s && <Viac text={x.s} velkost={16} />}
      {x.fotky?.some(ziveObr) && <button type="button" onClick={() => setAlbum(x)} aria-label="Fotky na celú obrazovku" style={{ border: "none", padding: 0, borderRadius: 14, overflow: "hidden", cursor: "zoom-in" }}><img src={x.fotky.find(ziveObr)} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} /></button>}
      <MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={moje(x)} />
    </div>))}</div>;
  const mDeti = <div style={{ minWidth: 0 }}><DetiAMladezBlok strankaId={strankaId} blokStyl={{}} lavy={null} kto={kto} mojeMeno={mojeMeno} reg={reg} /></div>;
  const mKostoly = mob
    ? <PasX pasRef={pasKos}>{miestaF.map((m) => <div key={m.id} style={{ ...sirkaKarty(nPas(3)), display: "grid" }}><KartaMiesta m={m} k={kostolKal(strankaId, m.id)} siroka onTap={() => setMiesto(m)} /></div>)}</PasX>
    : <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16 }}>{miestaF.map((m) => <KartaMiesta key={m.id} m={m} k={kostolKal(strankaId, m.id)} siroka onTap={() => setMiesto(m)} />)}</div>;
  // zbierky: PC 5 v rade, mobil 2 × 2 (tablet 4); posledný prerušovaný „+ … · všetky zbierky ›“
  const zbNaRad = mob ? (mt ? 4 : 4) : 5;
  const zbUkaz = zbVsetky || stvorce.length <= zbNaRad ? stvorce : stvorce.slice(0, mob ? zbNaRad : zbNaRad - 1);
  const zbDalsie = stvorce.length - zbUkaz.length, zbDalsiNazov = zbNazvy[zbUkaz.length] ?? "";
  const vsetkyZb = (t: string) => <button type="button" onClick={() => setZbVsetky(true)} style={{ border: "none", background: "transparent", padding: 0, color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>{t}</button>;
  const mZbierky = <>
    {stvorce.length > 0 && <div style={{ display: "grid", gridTemplateColumns: `repeat(${mob ? (mt ? 4 : 2) : 5},minmax(0,1fr))`, gap: mob ? 10 : 16 }}>
      {zbUkaz}
      {!mob && zbDalsie > 0 && <button type="button" onClick={() => setZbVsetky(true)} style={{ aspectRatio: "1 / 1", borderRadius: 22, border: "1.5px dashed var(--nf-linka)", background: PAPIER, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 8, textAlign: "center", padding: 16, color: INK, fontFamily: "inherit", cursor: "pointer" }}><b style={{ fontSize: 19 }}>+ {zbDalsie > 1 ? `${zbDalsiNazov} a ďalšie` : zbDalsiNazov}</b><span style={{ fontSize: 15, fontWeight: 800, color: "var(--nf-gInk)" }}>všetky zbierky ›</span></button>}
    </div>}
    {mob && zbDalsie > 0 && <button type="button" onClick={() => setZbVsetky(true)} style={{ minHeight: 48, borderRadius: 14, border: "1.5px dashed var(--nf-linka)", background: "transparent", color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer", padding: "0 14px", textAlign: "left" }}>+ {zbDalsiNazov} · všetky zbierky ›</button>}
    {prispeliSme}
  </>;
  // --- päta: Sväté omše · Farský úrad · fotka fary + IČO, DIČ, IBAN ---
  const uradZakl = <>
    {adresa && pole("ADRESA", <>{meno}<br />{adresa}</>)}
    {(tel.length > 0 || mail.length > 0) && pole("KONTAKT", <>{[...tel.map((t) => <a key={t} href={`tel:${t.replace(/\s/g, "")}`} style={{ color: "var(--nf-gInk)", fontWeight: 800, textDecoration: "none" }}>{t}</a>), ...mail.map((m) => <a key={m} href={`mailto:${m}`} style={{ color: "var(--nf-gInk)", fontWeight: 800, textDecoration: "none" }}>{m}</a>)].flatMap((e, i) => (i ? [<span key={`s${i}`}> · </span>, e] : [e]))}</>)}
    {hodiny && pole("ÚRADNÉ HODINY", <>{hodiny}{uh?.poz.trim() && <span style={{ display: "block", fontSize: 14.5, color: INK3 }}>{uh.poz.trim()}</span>}</>)}
    {ud.spravca.trim() && pole("SPRÁVCA FARNOSTI", ud.spravca.trim())}
    {filialky.length > 0 && <span style={{ fontSize: 15, color: INK3 }}>Filiálky: {filialky.join(" · ")}</span>}
  </>;
  const maUradZakl = !!(adresa || tel.length || mail.length || hodiny || ud.spravca.trim() || filialky.length);
  const maUdajeM = !!(ud.ico.trim() || ud.dic.trim() || ud.iban.trim());
  const udajeEl = maUdajeM && <>
    {(ud.ico.trim() || ud.dic.trim()) && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>{ud.ico.trim() && pole("IČO", ud.ico.trim())}{ud.dic.trim() && pole("DIČ", ud.dic.trim())}</div>}
    {ud.iban.trim() && pole("BANKOVÉ SPOJENIE", <b>{ud.iban.trim()}</b>)}
  </>;
  // --- bloky: PC dvojice v nerovnom rytme, mobil pod sebou zbalené ---
  type MB = { id: MBlokId; t: string; popis: string; suhrn: string; ma: boolean; obsah: (vo2: boolean) => ReactNode; sipky?: { text: string; zvisle?: boolean; posun: (s: 1 | -1) => void; ukaz: boolean }; pozadie?: string };
  const MBL: Record<string, MB> = {
    zbierky: { id: "zbierky", t: "Zbierky farnosti", popis: "", suhrn: stvorce.length ? poc(stvorce.length, "zbierka", "zbierky", "zbierok") : zbS, ma: maZbierky, obsah: () => mZbierky },
    ozn: { id: "ozn", t: "Oznamy farnosti", popis: "Čo farnosť oznamuje tento týždeň.", suhrn: poc(ozAll.length, "oznam", "oznamy", "oznamov"), ma: ozAll.length > 0, obsah: (vo2) => zoznamY(pasOzn, ozAll.map(mOznRiadok), vo2), sipky: { text: "Ďalšie oznamy", zvisle: true, posun: posOzn, ukaz: ozAll.length > 3 } },
    vyp: { id: "vyp", t: "Vypočuj si", popis: "Krátky príhovor farára.", suhrn: S.vypK, ma: maVyp, obsah: () => mVyp },
    mod: { id: "mod", t: "Modli sa s nami", popis: "Prosby veriacich. Ťuknite Modlím sa s vami, človek uvidí, že nie je sám.", suhrn: poc(prosby.length, "prosba", "prosby", "prosieb"), ma: prosby.length > 0, obsah: () => mModli, sipky: { text: "Ďalšie prosby", posun: posMod, ukaz: prosby.length > Math.floor(nPas(3.25)) } },
    pom: { id: "pom", t: "Pomôž", popis: "Priložte ruku k dielu. Brigáda a služba pri omši.", suhrn: poc(pomoz.length, "prosba o pomoc", "prosby o pomoc", "prosieb o pomoc"), ma: pomoz.length > 0, obsah: () => mPomoz },
    prid: { id: "prid", t: "Príď a zaži s nami", popis: "Pozývame vás. Ťuknite Prídem, nech vieme, s koľkými rátať. Fotky z akcií sú tu tiež.", suhrn: S.prid.split(" · ")[0], ma: maPrid, obsah: () => mPrid, sipky: { text: "Ďalšie akcie", posun: posPrid, ukaz: udalosti.length + alba.length > 1 } },
    tes: { id: "tes", t: "Teš sa s nami", popis: "Svadby, jubileá a poďakovania. Ťuknite a zablahoželajte.", suhrn: poc(tesy.length, "radosť", "radosti", "radostí"), ma: maTes, obsah: () => mTes, sipky: { text: "Ďalšie", posun: posTes, ukaz: tesy.length > Math.floor(nPas(2.2)) } },
    spom: { id: "spom", t: "Spomíname", popis: "Parte a spomienky. Ťuknite na medailón, otvorí sa parte a zbierka rodiny.", suhrn: poc(spomienky.length, "spomienka", "spomienky", "spomienok"), ma: maSpom, obsah: (vo2) => spomZoznam(vo2), sipky: { text: "Ďalšie", zvisle: true, posun: posSpom, ukaz: spomienky.length > 3 }, pozadie: "var(--nf-spom)" },
    ver: { id: "ver", t: "Od veriacich", popis: "Krátke oznamy, ktoré pridali veriaci.", suhrn: poc(oznVer.length, "oznam", "oznamy", "oznamov"), ma: oznVer.length > 0, obsah: () => mVer },
    deti: { id: "deti", t: "Deti a mládež", popis: "Stretká, miništranti, spevokol a tábory.", suhrn: poc(deti1.length, "akcia", "akcie", "akcií"), ma: maDeti, obsah: () => mDeti },
    kostoly: { id: "kostoly", t: "Naše kostoly", popis: "", suhrn: poc(miestaF.length, "kostol", "kostoly", "kostolov"), ma: miestaF.length > 1, obsah: () => mKostoly, sipky: { text: "", posun: posKos, ukaz: mob && miestaF.length > 1 } },
    omse: { id: "omse", t: "Sväté omše", popis: "", suhrn: S.omse, ma: maOmse && omseDni.length > 0, obsah: () => <SvateOmse matna={matna} maly onCely={() => setKalOtv(true)} dni={omseDni} bezNadpisu /> },
    urad: { id: "urad", t: "Farský úrad", popis: "", suhrn: S.urad, ma: maUrad, obsah: () => <>{fotoFaryEl}<div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{uradPolia}</div></> },
  };
  const RYTMUS: [string, number][][] = [[["zbierky", 12]], [["ozn", 7], ["vyp", 5]], [["mod", 12]], [["pom", 12]], [["prid", 12]], [["tes", 7], ["spom", 5]], [["ver", 5], ["deti", 7]], [["kostoly", 12]]];
  const mPcBlok = (b: MB, span: number, vo2: boolean) => b.id === "zbierky"
    ? <section key={b.id} data-blok="zbierky" style={{ gridColumn: "span 12", display: "flex", flexDirection: "column", gap: 18, scrollMarginTop: 84, minWidth: 0 }}>
      <MNadpis id="zbierky" t={b.t} vpravo={!zbVsetky && zbDalsie > 0 ? vsetkyZb("všetky zbierky ›") : undefined} />{b.obsah(false)}</section>
    : <MDlazdica key={b.id} blok={b.id} span={span} pozadie={b.pozadie}>
      <MNadpis id={b.id} t={b.t} popis={b.popis || undefined} vpravo={b.sipky?.ukaz ? <Sipky text={b.sipky.text || "Ďalšie"} zvisle={b.sipky.zvisle} onPosun={b.sipky.posun} /> : undefined} />
      {b.obsah(vo2)}
    </MDlazdica>;
  const mMobBlok = (b: MB) => (
    <ZbalenyBlok key={b.id} blok={b.id} ikona={<MIkona id={b.id} maly />} sipkaBg="var(--md-ikona)" kronika
      nadpis={<b style={{ fontSize: 20, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-.02em", color: INK }}>{b.t}</b>} suhrn={b.suhrn} otvoreny={otv.has(b.id)} onPrepni={() => prepni(b.id)}
      styl={{ padding: "18px 16px", borderRadius: 22, background: b.pozadie ?? PAPIER, borderTop: "3px solid var(--nf-linia)", gap: 16 }}>
      {(b.popis || b.sipky?.ukaz) && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        {b.popis ? <span style={{ fontSize: 15, lineHeight: 1.45, color: INK3 }}>{b.popis}</span> : <span />}
        {b.sipky?.ukaz && <Sipky zvisle={b.sipky.zvisle} onPosun={b.sipky.posun} maly />}
      </div>}
      {b.obsah(false)}
    </ZbalenyBlok>);
  const listaM = [["zbierky", "Zbierky"], ["ozn", "Oznamy"], ["vyp", "Vypočuj si"], ["mod", "Modli sa"], ["pom", "Pomôž"], ["prid", "Príď"], ["tes", "Teš sa"], ["spom", "Spomíname"], ["ver", "Od veriacich"], ["deti", "Deti"], ["kostoly", "Kostoly"], ["urad", "Úrad"]].filter(([id]) => MBL[id].ma).map(([id, t]) => ({ id, t }));
  const pataPc = [
    MBL.omse.ma && <MDlazdica key="omse" blok="omse" span={0} styl={{ flex: 1 }}><MNadpis id="omse" t="Sväté omše" />{MBL.omse.obsah(false)}</MDlazdica>,
    maUradZakl && <MDlazdica key="urad" blok="urad" span={0} styl={{ flex: 1 }}><MNadpis id="urad" t="Farský úrad" /><div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{uradZakl}</div></MDlazdica>,
    (fotoFary || maUdajeM) && <div key="fara" data-blok={maUradZakl ? undefined : "urad"} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, scrollMarginTop: 84 }}>
      {fotoFary && <img src={fotoFary} alt="Fara" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 28, display: "block" }} />}
      {maUdajeM && <div style={{ padding: "18px 20px", borderRadius: 22, background: PAPIER, borderTop: "3px solid var(--nf-linia)", display: "flex", flexDirection: "column", gap: 12 }}>{udajeEl}</div>}
    </div>,
  ].filter(Boolean);
  const moderneTelo = moderne && (
    <div className="moderne" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      {mTitulka}
      {prazdna
        ? <div style={{ padding: pc ? "40px 48px 72px" : "28px 18px 48px" }}><span style={{ fontSize: 17, color: INK3 }}>Farnosť tu zatiaľ nič nezverejnila.</span></div>
        : pc ? <>
          {listaM.length > 0 && <MLista bloky={listaM} onBlok={posunNaBlok} plus={fab && pcVelke ? <button type="button" onClick={otvorPridanie} aria-label="Pridať na stránku farnosti" style={{ flex: "none", width: 60, height: 60, borderRadius: "50%", border: "none", background: ZELENA_TL, color: "#fff", fontSize: 34, fontWeight: 500, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,.4)" }}>+</button> : undefined} />}
          <main style={{ padding: pcVelke ? "44px 48px 64px" : "32px 32px 56px", display: "grid", gridTemplateColumns: "repeat(12,minmax(0,1fr))", gap: 24 }}>
            {RYTMUS.flatMap((rad) => { const r = rad.filter(([id]) => MBL[id].ma); return r.map(([id, s]) => mPcBlok(MBL[id], r.length === 1 ? 12 : s, r.length === 2)); })}
            {pataPc.length > 0 && <>
              <div aria-hidden="true" style={{ gridColumn: "1 / -1", height: 4, borderRadius: 2, background: "var(--nf-linia)", margin: "16px 0 8px" }} />
              {pataPc.map((x, i) => <div key={i} style={{ gridColumn: `span ${12 / pataPc.length}`, display: "flex", flexDirection: "column", minWidth: 0 }}>{x}</div>)}
            </>}
          </main>
        </> : <main style={{ padding: mt ? "20px 24px 24px" : "20px 14px 24px", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 14 }}>
          {RYTMUS.flat().filter(([id]) => MBL[id].ma).map(([id]) => mMobBlok(MBL[id]))}
          {MBL.omse.ma && mMobBlok(MBL.omse)}
          {MBL.urad.ma && mMobBlok(MBL.urad)}
        </main>}
    </div>);
  // ============================================================
  // KARTA 66 · Konzervatívny — pre farára, ktorý nefotí: bez titulnej fotky a bez fotiek v blokoch, riadky, veľké písmo.
  // PC: obsah vľavo, vpravo pevný stĺpec (Sväté omše · Zbierky · Farský úrad). Mobil: Zbierky rozbalené, ostatné zbalené.
  // OPRAVY 255: fotky farára len na ťuk („N fotiek ›“ pri položke), titulná fotka nikdy.
  // ============================================================
  const konz = rozlozenie === "konzervativny";
  const kVelke = pcVelke;
  const dLbl = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;
  const farbaDna = (d: Date) => (d.getDay() === 6 ? "var(--kr-so)" : d.getDay() === 0 ? "var(--kr-ne)" : INK);
  /** galéria na celú obrazovku z fotiek položky (jedna fotka = veľký obrázok) */
  const galeria = (t: string, f: (string | undefined)[]) => { const l = f.filter((x): x is string => !!x && ziveObr(x)); if (l.length === 1) setVelke({ src: l[0] }); else if (l.length) setAlbum({ id: `g-${t}`, k: "fotky", t, s: "", kto: "", cas: 0, fotky: l } as PolozkaFarnika); };
  const fotkyOdkaz = (t: string, f: (string | undefined)[]) => { const n = f.filter((x) => !!x && ziveObr(x)).length; return n > 0 ? <button type="button" onClick={() => galeria(t, f)} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>{n === 1 ? "Fotka ›" : `${fotiek(n)} ›`}</button> : null; };
  const KRIZ = <span aria-hidden="true" style={{ flex: "none", display: "block", position: "relative", width: 16, height: 24 }}><span style={{ position: "absolute", left: 6, top: 0, width: 4, height: 24, background: "#C9A24A" }} /><span style={{ position: "absolute", left: 0, top: 6, width: 16, height: 4, background: "#C9A24A" }} /></span>;
  type KR = { key: string; d?: Date; dTxt?: string; pod?: string; podFarba?: string; kicker?: string; kickerFarba?: string; t: string; serif?: boolean; txt?: string; akcia?: ReactNode; extra?: ReactNode; onTap?: () => void; kriz?: boolean };
  const kRiadok = (r: KR) => {
    const datum = r.d ? dLbl(r.d) : r.dTxt;
    const nadpis = <b style={{ fontFamily: r.serif ? SERIF_KRONIKY : undefined, fontSize: r.serif ? (pc ? 22 : 20) : pc ? 21 : 18.5, fontWeight: r.serif ? 600 : 800, lineHeight: 1.3, overflowWrap: "anywhere" }}>{r.t}</b>;
    const stred = <>
      {r.kicker && <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: r.kickerFarba ?? INK3 }}>{r.kicker}</span>}
      {r.onTap ? <button type="button" onClick={r.onTap} style={{ padding: 0, border: "none", background: "transparent", color: INK, fontFamily: "inherit", textAlign: "left", cursor: "pointer" }}>{nadpis}</button> : nadpis}
      {r.txt && <span style={{ fontSize: pc ? 17 : 16, lineHeight: 1.55, color: INK2, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>{r.txt}</span>}
      {r.extra}
    </>;
    if (!pc) return (
      <div key={r.key} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: `1px solid ${LINKA}` }}>
        {r.kriz && <span style={{ flex: "none", paddingTop: 2 }}>{KRIZ}</span>}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {(datum || r.pod) && <span style={{ fontSize: 14, fontWeight: 800, color: r.d ? farbaDna(r.d) : INK3 }}>{[datum, r.pod].filter(Boolean).join(" · ")}</span>}
          {stred}
          {r.akcia && <span style={{ alignSelf: "flex-start", marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>{r.akcia}</span>}
        </span>
      </div>);
    const stl = [datum || r.pod ? "110px" : "", "minmax(0,1fr)", r.akcia ? "auto" : ""].filter(Boolean).join(" ");
    return (
      <div key={r.key} style={{ display: "grid", gridTemplateColumns: r.kriz ? "16px minmax(0,1fr)" : stl, gap: r.kriz ? 16 : 24, alignItems: "center", padding: r.kicker || r.kriz ? "16px 0" : "18px 0", borderBottom: `1px solid ${LINKA}` }}>
        {r.kriz ? KRIZ : (datum || r.pod) && <span style={{ display: "flex", flexDirection: "column" }}>{datum && <b style={{ fontSize: 22, color: r.d ? farbaDna(r.d) : INK }}>{datum}</b>}{r.pod && <span style={{ fontSize: r.podFarba ? 13 : 14, fontWeight: r.podFarba ? 800 : 400, letterSpacing: r.podFarba ? ".1em" : undefined, color: r.podFarba ?? INK3 }}>{r.pod}</span>}</span>}
        <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>{stred}</span>
        {r.akcia && !r.kriz && <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>{r.akcia}</span>}
      </div>);
  };
  const kasCas = (kedy: string) => kedy.split(" · ").slice(1, 2).join("");
  const kBloky: { id: string; t: string; suhrn: string; ma: boolean; riadky: () => ReactNode }[] = [
    { id: "ozn", t: "Oznamy farnosti", suhrn: S.ozn, ma: ozAll.length > 0, riadky: () => ozAll.map((x) => { const kde = miestaF.length > 1 && x.mi ? x.mi.map((id) => miestaF.find((m) => m.id === id)?.nazov).filter(Boolean).join(" · ") : ""; return kRiadok({ key: x.id, d: new Date(x.ms || cas.getTime()), pod: x.zm ? "ZMENA" : x.chip, podFarba: x.zm ? CERVENA : INK3, t: x.t, txt: x.txt,
      extra: <>{kde && <span style={{ alignSelf: "flex-start", padding: "3px 10px", borderRadius: 8, background: "var(--nf-gSoft)", color: "var(--nf-gInk)", fontSize: 14.5, fontWeight: 800 }}>{kde}</span>}{fotkyOdkaz(x.t, [x.foto])}</> }); }) },
    { id: "vyp", t: "Vypočuj si", suhrn: S.vypK, ma: maVyp, riadky: () => <>
      {p && kRiadok({ key: "prih", t: "Príhovor farára", txt: `Pridaný ${dd(p.cas)}`, akcia: <button type="button" onClick={() => setPrihOn(true)} style={tlacR(false, true)}>Prehrať</button> })}
      {zivoUrl && (dalsiaOnline || zivoT) && kRiadok({ key: "online", t: zivoT ? `Naživo · omša ${zivoT}` : `Omša online · ${dalsiaOnline}`, akcia: <a href={zivoUrl} target="_blank" rel="noopener noreferrer" style={{ ...tlacR(false, false), textDecoration: "none", display: "flex", alignItems: "center" }}>Pozrieť ›</a> })}
    </> },
    { id: "prid", t: "Príď a zaži s nami", suhrn: S.prid, ma: maPrid, riadky: () => <>
      {udalosti.map((u) => { const d = u.dat ? zIso(u.dat) : undefined; return kRiadok({ key: u.id, d, pod: [d ? den(d) : "", kasCas(u.kedy)].filter(Boolean).join(" "), t: u.t, txt: [u.txt, u.mojeX ? autor(u.mojeX).replace("Pridal veriaci", "pridal veriaci") : ""].filter(Boolean).join(" · "),
        akcia: u.pz > 0 ? pozvat(u) : undefined, extra: <>{fotkyOdkaz(u.t, [u.foto])}{u.mojeX && <MenuPrispevku x={u.mojeX} strankaId={strankaId} kto={kto} moje={moje(u.mojeX)} />}</> }); })}
      {alba.map((a) => kRiadok({ key: a.id, kicker: "FOTKY Z AKCIE", t: a.t || "Fotky z akcie", txt: a.anon ? "" : `pridal ${a.kto}`, extra: <>{fotkyOdkaz(a.t || "Fotky z akcie", a.fotky ?? [])}<MenuPrispevku x={a} strankaId={strankaId} kto={kto} moje={moje(a)} /></> }))}
    </> },
    { id: "pom", t: "Pomôž", suhrn: S.pom, ma: pomoz.length > 0, riadky: () => pomoz.map((u) => { const b = brigadyF.find((x) => x.id === u.id), d = u.dat ? zIso(u.dat) : undefined; return kRiadok({ key: u.id, d, pod: [d ? den(d) : "", b?.cas ?? ""].filter(Boolean).join(" "),
      t: `${b?.druh ?? "Brigáda"} · ${u.t}`, txt: [u.txt, u.od && `Kde: ${u.od}`].filter(Boolean).join(" · "), akcia: u.pz > 0 ? pozvat(u) : undefined, extra: fotkyOdkaz(u.t, [u.foto]) }); }) },
    { id: "mod", t: "Modli sa s nami", suhrn: S.mod, ma: prosby.length > 0, riadky: () => prosby.map((x) => kRiadok({ key: x.id, t: x.t || x.s || "Prosba", txt: [x.t ? x.s : "", x.anon || /Bohu známy/.test(x.kto) ? "bez mena" : x.kto].filter(Boolean).join(" · "),
      akcia: reakcia({ ...reakV(x, "modl"), t: "Modlím sa s vami", tJa: "Modlíte sa s nami ✓", poc: (n) => `${n} sa modlí` }), extra: <MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={moje(x)} /> })) },
    { id: "tes", t: "Teš sa s nami", suhrn: S.tes, ma: maTes, riadky: () => tesy.map((t) => {
      const d = t.datum && /^\d{4}-\d{2}-\d{2}/.test(t.datum) ? zIso(t.datum.slice(0, 10)) : t.it?.vytvorene ? new Date(t.it.vytvorene) : t.x?.cas ? new Date(t.x.cas) : undefined;
      const st = t.ine ? "OZNÁMENIE" : t.druh === "svadba" ? "SVADBA" : t.druh === "jubileum" ? "JUBILEUM" : t.dakuje ? "POĎAKOVANIE" : "BLAHOŽELANIE";
      const veta = t.ine ? "" : [t.druh === "jubileum" && t.vek ? `${t.vek} ${rokyT(Number(t.vek)).toLocaleLowerCase("sk-SK")}` : "", t.pod ?? ""].filter(Boolean).join(" · ");
      return kRiadok({ key: t.id, kicker: `${st}${d ? ` · ${dLbl(d)}` : ""}`, kickerFarba: t.druh === "svadba" ? "var(--nf-teal)" : ZLATA, t: t.ine ? t.nadpis : t.meno, serif: true, txt: veta || undefined, onTap: () => setTes(t),
        extra: fotkyOdkaz(t.ine ? t.nadpis : t.meno, [t.foto, ...(t.it?.fotky ?? []), ...(t.x?.fotky ?? [])].filter((v, i, l) => l.indexOf(v) === i)) }); }) },
    { id: "spom", t: "Spomíname", suhrn: S.spom, ma: maSpom, riadky: () => spomienky.map((sp) => kRiadok({ key: sp.id, kriz: true, t: sp.d.meno, serif: true, onTap: () => setParte(sp),
      txt: [rokyParte(sp.d.nar, sp.d.umr), rozluckaT(sp.d.rd, sp.d.rc), sp.d.rm, sp.zb ? "zbierka rodiny" : ""].filter(Boolean).join(" · ") })) },
    { id: "deti", t: "Deti a mládež", suhrn: S.deti, ma: maDeti, riadky: () => <DetiAMladezBlok strankaId={strankaId} blokStyl={{}} lavy={null} kto={kto} mojeMeno={mojeMeno} reg={reg}
      riadok={(r) => kRiadok({ key: r.id, d: r.dat, pod: r.kedy.toLocaleLowerCase("sk-SK"), t: r.t, txt: [r.txt, r.poc].filter(Boolean).join(" · "), akcia: r.tlac ?? undefined, extra: fotkyOdkaz(r.t, r.fotky) })} /> },
    { id: "ver", t: "Od veriacich", suhrn: S.ver, ma: oznVer.length > 0, riadky: () => oznVer.map((x) => kRiadok({ key: x.id, kicker: `${autor(x).replace(/^Pridal veriaci · /, "")} · ${dd(x.cas)}`, t: x.t, txt: x.s,
      extra: <>{fotkyOdkaz(x.t, x.fotky ?? [])}<MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={moje(x)} /></> })) },
    { id: "kostoly", t: "Naše kostoly", suhrn: S.kostoly, ma: miestaF.length > 1, riadky: () => miestaF.map((m) => { const om = najblizsiaOmsa(kostolKal(strankaId, m.id)); return kRiadok({ key: m.id, kicker: nazovDruhu(m.druh).toLocaleUpperCase("sk-SK"), t: m.nazov, txt: [m.popis, om && `Najbližšia omša: ${om}`].filter(Boolean).join(" · "),
      akcia: <button type="button" onClick={() => setMiesto(m)} style={tlacR(false, false)}>Viac o kostole ›</button> }); }) },
  ];
  const kNadpis = (t: string) => <b style={{ fontSize: 30, letterSpacing: "-.02em", paddingBottom: 6, borderBottom: "2px solid var(--nf-linia)" }}>{t}</b>;
  const kSek = (id: string, t: string, deti: ReactNode) => <section key={id} data-blok={id} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, scrollMarginTop: 16 }}>{kNadpis(t)}<div style={{ display: "flex", flexDirection: "column" }}>{deti}</div></section>;
  const kB = (id: string) => kBloky.find((b) => b.id === id)!;
  // pravý stĺpec (PC) a spoločné kúsky
  const kKarta = (t: string, deti: ReactNode, blok?: string) => <section data-blok={blok} style={{ padding: 24, borderRadius: 18, background: PAPIER, border: `1px solid ${LINKA}`, borderTop: "4px solid var(--nf-linia)", display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 16 }}><b style={{ fontSize: 24, paddingBottom: 4 }}>{t}</b>{deti}</section>;
  const kOmseZoznam = <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {omseDni.map(({ d, dnes, casy, pozn }) => { const w = d.getDay(); return (
      <div key={d.toDateString()} style={{ display: "flex", gap: 14, padding: dnes ? "9px 12px" : "9px 0", margin: dnes ? "0 -12px" : 0, borderRadius: dnes ? 10 : 0, background: dnes ? "var(--nf-gSoft)" : "transparent", borderBottom: dnes ? "none" : `1px solid ${LINKA}`, color: dnes ? "var(--nf-gInk)" : INK, fontSize: 17, fontWeight: dnes ? 800 : 400 }}>
        <b style={{ width: 44, flex: "none", color: dnes ? undefined : w === 6 ? "var(--kr-so)" : w === 0 ? "var(--kr-ne)" : INK }}>{["Ne", "Po", "Ut", "St", "Št", "Pi", "So"][w]}</b>
        <span style={{ minWidth: 0 }}>{casy}{dnes ? " · dnes" : ""}{pozn && <span style={{ color: INK3, fontWeight: 400 }}> · {pozn}</span>}</span>
      </div>); })}
    <button type="button" onClick={() => setKalOtv(true)} style={{ alignSelf: "flex-start", minHeight: 44, padding: "8px 0 0", border: "none", background: "transparent", color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Celý kalendár ›</button>
  </div>;
  const zbRiadok = (key: string, stitok: string, farba: string, nazov: string, onTap: () => void, ram?: boolean) => (
    <button key={key} type="button" onClick={onTap} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: pc ? 60 : 64, padding: "10px 14px", borderRadius: 12, border: ram ? "1.5px solid var(--nf-zelena)" : "none", background: ram ? "transparent" : KARTA, color: INK, fontFamily: "inherit", textAlign: "left", cursor: "pointer", boxShadow: "none" }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: farba }}>{stitok}</span><b style={{ fontSize: 18, overflowWrap: "anywhere" }}>{nazov}</b></span>
      <span aria-hidden="true" style={{ fontSize: 20, color: INK3 }}>›</span>
    </button>);
  const kZbierkyRiadky = <>
    {hlOn && hl && zbRiadok("hl", "HLAVNÁ ZBIERKA", "var(--nf-gInk)", nazovHlavnej(hl), otvorHlavnu, true)}
    {zvOn && zbRiadok("zv", "ZVONČEKOVÁ", ZLATA, `Nedeľa ${zvNedela}`, () => otvorZvoncek(zvOkno.id, `Zvončeková zbierka · Nedeľa ${zvNedela}`))}
    {zbFar.map((z) => zbRiadok(z.id, "ZBIERKA", TEAL, z.nazov || "Zbierka", () => otvorZbierku(z)))}
    {piny.map((z) => zbRiadok(z.id, chipPripnutej(z), farbaPripnutej(z), z.nazov, () => otvorPin(z)))}
    {zbIne.map((z) => zbRiadok(z.id, "ZBIERKA RODINY", FIALOVA, bezPredpony(z.nazov) || "Zbierka", () => otvorZbierku(z)))}
    {prispeliSme}
  </>;
  const kUradObsah = <>
    {adresa && <span style={{ fontSize: 17, lineHeight: 1.6, color: INK2, whiteSpace: "pre-line" }}>{adresa.replace(/,\s*/, "\n")}</span>}
    {tel.map((t) => <a key={t} href={`tel:${t.replace(/\s/g, "")}`} style={{ fontSize: 20, fontWeight: 800, color: "var(--nf-gInk)", textDecoration: "none" }}>{t}</a>)}
    {mail.map((m) => <a key={m} href={`mailto:${m}`} style={{ fontSize: 17, fontWeight: 800, color: "var(--nf-gInk)", textDecoration: "none", overflowWrap: "anywhere" }}>{m}</a>)}
    {hodiny && <span style={{ fontSize: 17, lineHeight: 1.6, color: INK2 }}>{hodiny}{uh?.poz.trim() && <span style={{ display: "block", fontSize: 16, color: INK3 }}>{uh.poz.trim()}</span>}</span>}
    {ud.spravca.trim() && <span style={{ fontSize: 16, color: INK3 }}>{ud.spravca.trim()}</span>}
    {(udajeR || ud.iban.trim()) && <span style={{ fontSize: 16, lineHeight: 1.6, color: INK3, whiteSpace: "pre-line" }}>{[udajeR, ud.iban.trim() && `IBAN ${ud.iban.trim()}`].filter(Boolean).join("\n")}</span>}
    {filialky.length > 0 && <span style={{ fontSize: 16, color: INK3 }}>Filiálky: {filialky.join(" · ")}</span>}
  </>;
  // hlavička bez fotky
  const kErb = (s: number) => logo ? <img src={logo} alt="Logo" style={{ flex: "none", width: s, height: s, borderRadius: "50%", objectFit: "cover", background: "#F1ECE1", border: "4px solid var(--nf-linia)", boxSizing: "border-box" }} />
    : <span role="img" aria-label="Erb farnosti" style={{ flex: "none", width: s, height: s, boxSizing: "border-box", borderRadius: "50%", background: "#F1ECE1", color: "#14110B", border: `${s > 100 ? 4 : 3}px solid var(--nf-linia)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(s / 3), fontWeight: 800 }}>{inic}</span>;
  const kTl = (pc ? 56 : 54);
  const kMojaOmse = <>
    {<button type="button" aria-pressed={jeHl || jeSl} aria-expanded={jeHl || jeSl ? mfOn : undefined} onClick={sledTap} style={{ minHeight: kTl, minWidth: 0, padding: "0 16px", borderRadius: 14, border: "none", background: ZELENA_TL, color: "#fff", fontFamily: "inherit", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>{sledT}{(jeHl || jeSl) && !sledChyba ? " ⌄" : ""}</button>}
    {maOmse && <button type="button" onClick={() => setKalOtv(true)} style={{ minHeight: kTl, minWidth: 0, padding: "0 14px", borderRadius: 14, border: `1.5px solid ${LINKA}`, background: PAPIER, color: INK, fontFamily: "inherit", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>Omše a kalendár</button>}
  </>;
  const kOnas = onas && (onasOtv ? <span style={{ fontSize: pc ? 18 : 16.5, lineHeight: 1.55, color: INK2, whiteSpace: "pre-line" }}>{onas}</span>
    : <span style={{ fontSize: pc ? 18 : 16.5, lineHeight: 1.55, color: INK2, maxWidth: 760 }}>{onasVeta}{onasVeta !== onas && <> <button type="button" onClick={() => setOnasOtv(true)} style={{ border: "none", background: "transparent", padding: 0, color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: "inherit", fontWeight: 800, cursor: "pointer" }}>viac ›</button></>}</span>);
  const kDnes = (dnesCasy || zmenaT || (pc && poctyT)) ? <div style={{ display: "flex", alignItems: pc ? "center" : "flex-start", flexDirection: pc ? "row" : "column", flexWrap: "wrap", gap: pc ? 28 : 4, padding: pc ? "18px 24px" : "14px 16px", borderRadius: 16, background: PAPIER, border: `1px solid ${LINKA}` }}>
    {(dnesCasy || zmenaT) && <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".12em", color: "var(--nf-gInk)" }}>● DNES · {DNW_V[dvt(dnesD)]} {dLbl(dnesD)}</span>}
    {dnesCasy && <b style={{ fontSize: pc ? 24 : 20 }}>Sv. omše {dnesCasy}</b>}
    {zmenaT && <span style={{ fontSize: pc ? 17 : 15.5, color: CERVENA }}>{zmenaT}</span>}
    {pc && poctyT && <span style={{ marginLeft: "auto", fontSize: 16, color: INK3 }}>{poctyT}</span>}
  </div> : null;
  const kHladat = <KronikaHladat polozky={hladat} onBlok={naBlok} />;
  const kHlavicka = pc
    ? <header style={{ padding: kVelke ? "28px 64px 32px" : "24px 40px 28px", borderBottom: "4px solid var(--nf-linia)", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>{onBack && <button type="button" onClick={onBack} style={{ flex: "none", minHeight: 46, padding: "0 18px", borderRadius: 12, border: `1.5px solid ${LINKA}`, background: "transparent", color: INK, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{nahlad ? "‹ Späť do Správy" : "‹ Späť"}</button>}<span style={{ flex: 1 }} />{zivoTl}<div style={{ width: 380, maxWidth: "45%" }}>{kHladat}</div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {kErb(120)}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}><b style={{ fontFamily: SERIF_KRONIKY, fontSize: kVelke ? 58 : 46, lineHeight: 1.02, fontWeight: 600, letterSpacing: "-.02em" }}>{meno}</b>{podMeno && <span style={{ fontSize: 19, color: INK2 }}>{podMeno}</span>}{kOnas}</div>
        <div style={{ flex: "none", width: 300, display: "flex", flexDirection: "column", gap: 10 }}>{kMojaOmse}</div>
      </div>
      {kDnes}
    </header>
    : <header style={{ padding: `calc(12px + env(safe-area-inset-top, 0px)) ${mt ? 24 : 18}px 22px`, borderBottom: "3px solid var(--nf-linia)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{onBack && <button type="button" onClick={onBack} style={{ flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${LINKA}`, background: "transparent", color: INK, fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>{nahlad ? "‹ Späť do Správy" : "‹ Späť"}</button>}<span style={{ flex: 1 }} />{zivoTl}
        <button type="button" aria-label="Hľadať vo farnosti" aria-expanded={mHladat} onClick={() => setMHladat(!mHladat)} style={{ flex: "none", width: 44, height: 44, borderRadius: 12, border: `1.5px solid ${LINKA}`, background: "transparent", color: INK, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}><Lupa size={20} /></button></div>
      {mHladat && <KronikaHladat polozky={hladat} onBlok={(b) => { setMHladat(false); naBlok(b); }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>{kErb(76)}<div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontFamily: SERIF_KRONIKY, fontSize: 32, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-.02em" }}>{meno}</b>{podMeno && <span style={{ fontSize: 15, color: INK2 }}>{podMeno}</span>}</div></div>
      {kOnas}
      <div style={{ display: "grid", gridTemplateColumns: maOmse ? "1fr 1fr" : "1fr", gap: 8 }}>{kMojaOmse}</div>
      {kDnes}
    </header>;
  const kMaPravy = maOmse && omseDni.length > 0 || maZbierky || maUrad;
  const konzTelo = konz && (
    <div className="konzervativny" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      {kHlavicka}
      {prazdna
        ? <div style={{ padding: pc ? "40px 64px 72px" : "28px 18px 48px" }}><span style={{ fontSize: 18, color: INK3 }}>Farnosť tu zatiaľ nič nezverejnila.</span></div>
        : pc ? <div style={{ display: "grid", gridTemplateColumns: kMaPravy ? `minmax(0,1fr) ${kVelke ? 400 : 340}px` : "minmax(0,1fr)", gap: kVelke ? 56 : 36, padding: kVelke ? "40px 64px 72px" : "32px 40px 56px", alignItems: "start" }}>
          <main style={{ display: "flex", flexDirection: "column", gap: 44, minWidth: 0 }}>
            {["ozn", "vyp", "prid", "pom", "mod"].map(kB).filter((b) => b.ma).map((b) => kSek(b.id, b.t, b.riadky()))}
            {[["tes", "spom"], ["deti", "ver"]].map((par) => { const l = par.map(kB).filter((b) => b.ma); return l.length ? <div key={par[0]} style={{ display: "grid", gridTemplateColumns: l.length === 2 ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)", gap: 40 }}>{l.map((b) => kSek(b.id, b.t, b.riadky()))}</div> : null; })}
            {kB("kostoly").ma && kSek("kostoly", "Naše kostoly", kB("kostoly").riadky())}
          </main>
          {kMaPravy && <aside style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            {maOmse && omseDni.length > 0 && kKarta("Sväté omše", kOmseZoznam, "omse")}
            {maZbierky && kKarta("Zbierky farnosti", kZbierkyRiadky, "zbierky")}
            {maUrad && kKarta("Farský úrad", kUradObsah, "urad")}
          </aside>}
        </div>
        : <main style={{ display: "flex", flexDirection: "column" }}>
          {maZbierky && <section data-blok="zbierky" style={{ padding: `18px ${mt ? 24 : 18}px`, display: "flex", flexDirection: "column", gap: 10 }}><b style={{ fontSize: 21, paddingBottom: 6, borderBottom: "2px solid var(--nf-linia)" }}>Zbierky farnosti</b>{kZbierkyRiadky}</section>}
          {[...["ozn", "vyp", "prid", "pom", "mod", "tes", "spom", "deti", "ver", "kostoly"].map(kB).filter((b) => b.ma).map((b) => ({ id: b.id, t: b.t, suhrn: b.suhrn, obsah: b.riadky() })),
            ...(maOmse && omseDni.length > 0 ? [{ id: "omse", t: "Sväté omše", suhrn: S.omse, obsah: <div style={{ paddingTop: 10 }}>{kOmseZoznam}</div> }] : []),
            ...(maUrad ? [{ id: "urad", t: "Farský úrad", suhrn: S.urad, obsah: <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>{kUradObsah}</div> }] : []),
          ].map((b) => (
            <ZbalenyBlok key={b.id} blok={b.id} kronika nadpis={<b style={{ fontSize: 21, letterSpacing: "-.015em", color: INK }}>{b.t}</b>} suhrn={b.suhrn} otvoreny={otv.has(b.id)} onPrepni={() => prepni(b.id)}
              styl={{ padding: `4px ${mt ? 24 : 18}px 14px`, borderTop: `1px solid ${LINKA}`, gap: 6 }}>
              <div style={{ display: "flex", flexDirection: "column", borderTop: "2px solid var(--nf-linia)" }}>{b.obsah}</div>
            </ZbalenyBlok>))}
        </main>}
    </div>);
  /** Nástenka: PC blok s ľavým stĺpcom; OPRAVY 245 mobil a tablet na výšku zbalený riadok, po rozbalení najprv popis, potom obsah */
  const blokN = (id: string, nadpis: string, popis: string, suhrnT: string, obsah: ReactNode, pozadie?: string): ReactNode => zbalene
    ? <ZbalenyBlok key={id} blok={id} nadpis={<b style={{ fontSize: 28, lineHeight: 1.05, letterSpacing: "-.03em" }}>{nadpis}</b>} suhrn={suhrnT} otvoreny={otv.has(id)} onPrepni={() => prepni(id)}
      styl={{ padding: `20px ${PAD_X}`, borderTop: "3px solid var(--nf-linia)", background: pozadie, gap: 14 }}>
      {popis && <span style={{ fontSize: 17, lineHeight: 1.5, color: INK3 }}>{popis}</span>}<div style={{ minWidth: 0 }}>{obsah}</div></ZbalenyBlok>
    : <div data-blok={id} style={blokStyl(pozadie)}>{lavyStlpec(nadpis, popis)}{obsah}</div>;
  return (
    <div className="nastenka-farnosti" style={{ ...PREMENNE, ["--nf-linia" as string]: farbaLinie, position: "relative", width: "100%", maxWidth: 1440, margin: "0 auto", background: BG, color: INK, display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom: fab ? 110 : 0 }}>
      {kronikaTelo}
      {moderneTelo}
      {konzTelo}
      {kalOkno}
      {!kronika && !moderne && !konz && <>
      {/* ---------- (1) titulka · OPRAVY 221: príhovor jedna veta + viac, dve tlačidlá vedľa seba ---------- */}
      <div style={{ position: "relative", minHeight: siroka ? "clamp(300px,34vw,480px)" : 260, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: `${onBack ? 92 : 24}px ${PAD_X} clamp(20px,3vw,40px)`, background: cover ? `linear-gradient(180deg,rgba(10,8,5,.3) 0%,rgba(10,8,5,0) 35%,rgba(10,8,5,.88) 100%), url("${cover}") center/cover no-repeat #D9D3C7` : "linear-gradient(160deg,#3A372E 0%,#14110B 100%)" }}>
        {/* OPRAVY 240 (5): na mobile malé tlačidlo hore v rohu, nie veľká biela dlaždica */}
        {onBack && <button type="button" onClick={onBack} style={!siroka
          ? { position: "absolute", top: "calc(10px + env(safe-area-inset-top, 0px))", left: 12, minHeight: 40, padding: "0 12px", border: "none", borderRadius: 20, background: "rgba(20,17,11,.55)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }
          : { position: "absolute", top: 24, left: PAD_X, minHeight: 48, padding: "0 18px", border: "none", borderRadius: 14, background: "rgba(255,255,255,.92)", color: "#14110B", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>{nahlad ? "‹ Späť do Správy" : "‹ Späť"}</button>}
        {zivoT && zivoUrl && <a href={zivoUrl} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", top: 24, right: PAD_X, minHeight: 48, padding: "0 18px", borderRadius: 24, background: "#B3261E", color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 10, fontSize: 15.5, fontWeight: 800, letterSpacing: ".04em" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff" }} />NAŽIVO · omša {zivoT} · Pozrieť ›</a>}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(14px,2vw,24px)", flexWrap: "wrap" }}>
          {p ? <button type="button" onClick={() => setPrihOn(true)} aria-label="Príhovor farára · prehrať" style={{ flex: "none", width: "clamp(76px,7vw,100px)", height: "clamp(76px,7vw,100px)", borderRadius: "50%", padding: 4, border: "none", background: "conic-gradient(#C9A24A,#4B7A35,#C9A24A)", cursor: "pointer" }}>
            <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#14110B", border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}><span style={{ width: 0, height: 0, borderLeft: "18px solid #fff", borderTop: "11px solid transparent", borderBottom: "11px solid transparent", marginLeft: 5 }} /></span>
          </button>
            : logo ? <img src={logo} alt="Logo" style={{ flex: "none", width: "clamp(76px,7vw,100px)", height: "clamp(76px,7vw,100px)", borderRadius: profil?.tvar === "kruh" ? "50%" : 26, objectFit: "cover", background: "#fff" }} />
            : <span style={{ flex: "none", width: "clamp(76px,7vw,100px)", height: "clamp(76px,7vw,100px)", borderRadius: 26, background: "#fff", color: "#14110B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(26px,2.6vw,34px)", fontWeight: 800 }}>{inic}</span>}
          <span style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}><b style={{ fontSize: "clamp(30px,4.4vw,60px)", lineHeight: 1, letterSpacing: "-.04em", color: "#fff", textWrap: "balance" } as CSSProperties}>{meno}</b><span style={{ fontSize: "clamp(15px,1.4vw,19px)", color: "#E8E1D3" }}>Farnosť</span></span>
          {pc && sledBtn}
        </div>
      </div>
      {/* OPRAVY 243: hrubá farebná línia pod titulkou s jemným tieňom */}
      <div aria-hidden="true" style={{ height: 12, background: "var(--nf-linia)", boxShadow: "0 4px 14px rgba(0,0,0,.18)", position: "relative", zIndex: 1 }} />
      <div style={{ padding: `${siroka ? 28 : 18}px ${PAD_X} ${siroka ? 12 : 4}px`, display: "flex", flexDirection: "column", gap: 14 }}>
        {onas && <span style={{ fontSize: "clamp(16px,1.4vw,19px)", lineHeight: 1.6, color: INK2, ...(onasOtv ? { whiteSpace: "pre-line" } : { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }) } as CSSProperties}>
          {onasOtv ? onas : onas.split(/(?<=[.!?])\s|\n/)[0]}{" "}
          {!onasOtv && <button type="button" onClick={() => setOnasOtv(true)} style={{ border: "none", background: "transparent", padding: 0, color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: "inherit", fontWeight: 800, cursor: "pointer" }}>viac ›</button>}
        </span>}
        {!pc && <div style={{ display: "grid", gridTemplateColumns: maKal ? "1fr 1fr" : "1fr", gap: 8, maxWidth: siroka ? 720 : undefined }}>
          {sledBtn}
          {maKal && <button type="button" onClick={() => naBlok("kal")} style={{ minHeight: 52, minWidth: 0, padding: "6px 10px", borderRadius: 14, border: `1.5px solid ${LINKA}`, background: PAPIER, color: INK, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flex: "none" }}><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" /></svg>
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
              <b style={{ maxWidth: "100%", fontSize: siroka ? 15 : 14.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Omše a kalendár</b>
              {dnesKal && <span style={{ maxWidth: "100%", fontSize: 12.5, fontWeight: 700, color: INK3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dnesKal}</span>}
            </span></button>}
        </div>}
      </div>

      {/* ---------- (2) Zbierky farnosti · mobil malé riadky ---------- */}
      {maZbierky && <div data-blok="zbierky" style={{ padding: `${siroka ? 28 : 18}px ${PAD_X} ${siroka ? 40 : 26}px`, display: "flex", flexDirection: "column", gap: siroka ? 14 : 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}><b style={{ fontSize: siroka ? 30 : 22, letterSpacing: "-.02em" }}>Zbierky farnosti</b>{siroka && <span style={{ fontSize: 17, color: INK3 }}>ťuknite na zbierku a prispejte</span>}</div>
        {siroka ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14, alignItems: "stretch" }}>
          {hlOn && hl && <div style={{ gridColumn: "span 2", display: "flex", minWidth: 0 }}><HlavnaKarta strankaId={strankaId} hlRef={hlRef} nazov={nazovHlavnej(hl)} txt={hlTxt} onTap={otvorHlavnu} /></div>}
          {zvOn && <ZvoncekKarta strankaId={strankaId} onTap={otvorZvoncek} />}
          {zbFar.map((z) => <ZbierkaKarta key={z.id} z={z} onTap={() => otvorZbierku(z)} />)}
          {piny.map((z) => <PripnutaKarta key={z.id} z={z} onTap={() => otvorPin(z)} />)}
          {zbIne.map((z) => <button key={z.id} type="button" onClick={() => otvorZbierku(z)} style={{ textAlign: "left", border: "none", borderRadius: 22, background: KARTA, borderLeft: `5px solid ${FIALOVA}`, padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 8, color: INK, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={kicker(FIALOVA)}>ZBIERKA RODINY</span><b style={{ fontSize: 20, lineHeight: 1.25 }}>{bezPredpony(z.nazov) || "Zbierka"}</b><span style={{ fontSize: 16, color: INK2 }}>Peniaze idú: rodine · Prispieť ›</span>
          </button>)}
          {prispeliSme}
        </div> : <>
          {hlOn && hl && <RiadokZbierky stitok="HLAVNÁ ZBIERKA" farba="var(--nf-gInk)" nazov={nazovHlavnej(hl)} obr={hl.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src} refId={hlRef} ram onTap={otvorHlavnu} />}
          {zvOn && <RiadokZbierky stitok="ZVONČEKOVÁ ZBIERKA" farba={INK3} nazov={`Nedeľa ${zvNedela}`} datum={zvNedela} onTap={() => otvorZvoncek(zvOkno.id, `Zvončeková zbierka · Nedeľa ${zvNedela}`)} />}
          {zbFar.map((z) => <RiadokZbierky key={z.id} stitok="ZBIERKA" farba={TEAL} nazov={z.nazov || "Zbierka"} obr={z.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src} refId={z.id} ciel={cielCislo(z)} onTap={() => otvorZbierku(z)} />)}
          {piny.map((z) => <RiadokZbierky key={z.id} stitok={chipPripnutej(z)} farba={farbaPripnutej(z)} nazov={z.nazov} obr={z.foto} pct={z.ciel ? Math.min(100, Math.round((z.vyzbierane / z.ciel) * 100)) : undefined} onTap={() => otvorPin(z)} />)}
          {zbIne.map((z) => <RiadokZbierky key={z.id} stitok="ZBIERKA RODINY" farba={FIALOVA} nazov={bezPredpony(z.nazov) || "Zbierka"} onTap={() => otvorZbierku(z)} />)}
          {prispeliSme}
        </>}
      </div>}

      {/* ---------- (3) Oznamy farnosti · OPRAVY 215: hore, nad Príď a zaži ---------- */}
      {oznamy.length > 0 && blokN("ozn", "Oznamy farnosti", "Čo farnosť oznamuje tento týždeň.", S.ozn, <>
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,420px))", gap: 16, alignItems: "start", overflowWrap: "anywhere" }}>
          {oznamy.map(kartaOznamu)}
        </div>
      </>)}

      {/* ---------- Vypočuj si ---------- */}
      {p && blokN("vyp", "Vypočuj si", "Krátky príhovor farára.", S.vypN, <>
        <div style={{ flex: "999 1 520px", minWidth: 0 }}>
          <button type="button" onClick={() => setPrihOn(true)} style={{ width: "100%", textAlign: "left", display: "flex", flexWrap: "wrap", gap: "20px 24px", alignItems: "center", padding: 16, borderRadius: 24, background: KARTA, border: "none", cursor: "pointer", color: INK, fontFamily: "inherit" }}>
            <span style={{ position: "relative", flex: "0 1 360px", minWidth: 220, aspectRatio: "16 / 9", borderRadius: 16, background: INK, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 0, height: 0, borderLeft: "20px solid #14110B", borderTop: "13px solid transparent", borderBottom: "13px solid transparent", marginLeft: 6 }} /></span></span>
            <span style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 8 }}><span style={kicker()}>PRÍHOVOR FARÁRA · PRIDANÝ {dd(p.cas)}</span><b style={{ fontSize: "clamp(22px,2.2vw,30px)", lineHeight: 1.15, letterSpacing: "-.02em" }}>Príhovor farára</b><span style={{ fontSize: 16, color: INK3 }}>Ťuknite a prehrá sa na celú obrazovku.</span></span>
          </button>
        </div>
      </>)}

      {/* ---------- Modli sa s nami ---------- */}
      {prosby.length > 0 && blokN("mod", "Modli sa s nami", "Prosby veriacich. Ťuknite Modlím sa s vami, človek uvidí, že nie je sám.", S.mod, <>
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {prosby.map((x) => (
            <div key={x.id} style={{ padding: 22, borderRadius: 22, background: KARTA, display: "flex", flexDirection: "column", gap: 14 }}>
              {x.anon || /Bohu známy/.test(x.kto) ? <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Sviecka /><span style={{ fontSize: 15, color: INK3 }}>bez mena</span></span> : hlavickaAutora(x)}
              <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>{x.t && <b style={{ fontSize: 19, lineHeight: 1.4 }}>{x.t}</b>}{x.s && <span style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 600, color: INK2, whiteSpace: "pre-line" }}>{x.s}</span>}</span>
              {reakcia({ ...reakV(x, "modl"), t: "Modlím sa s vami", tJa: "Modlíte sa s nami ✓", poc: (n) => `${n} sa modlí` })}
              <MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={moje(x)} />
            </div>))}
        </div>
      </>)}

      {/* ---------- Pomôž (KARTA 61 §2) ---------- */}
      {pomoz.length > 0 && blokN("pom", "Pomôž", "Priložte ruku k dielu. Brigáda a služba pri omši.", S.pom, <>
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 16 }}>
          {pomoz.map((u) => (
            <div key={u.id} style={{ borderRadius: 22, overflow: "hidden", background: KARTA, display: "flex", flexDirection: "column" }}>
              {u.foto ? <div style={{ position: "relative" }}><img src={u.foto} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />{u.dat && <span style={{ position: "absolute", left: 16, top: 16 }}><Datum d={zIso(u.dat)} velky /></span>}</div>
                : u.dat ? <div style={{ padding: "18px 22px 0" }}><Datum d={zIso(u.dat)} /></div> : null}
              <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                {hlavickaFar(u.af)}
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".12em", color: INK3 }}>{u.kedy}</span>
                <b style={{ fontSize: 21, lineHeight: 1.25 }}>{u.t}</b>
                {u.txt && <Viac text={u.txt} />}
                {u.od && <span style={{ fontSize: 15.5, color: INK3 }}>{u.od}</span>}
                {u.pz > 0 && pozvat(u)}
              </div>
            </div>))}
        </div>
      </>)}

      {/* ---------- Príď a zaži s nami ---------- */}
      {maPrid && blokN("prid", "Príď a zaži s nami", "Pozývame vás. Ťuknite Prídem, nech vieme, s koľkými rátať. Fotky z akcií sú tu tiež.", S.prid, <>
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* OPRAVY 193: karta najviac 420 px, fotky z akcií v tej istej mriežke */}
          {(udalosti.length > 0 || alba.length > 0) && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,420px))", gap: 16, alignItems: "start", overflowWrap: "anywhere" }}>
            {udalosti.map((u) => { const d = u.dat ? zIso(u.dat) : null; return (
              <div key={u.id} style={{ borderRadius: 24, overflow: "hidden", background: KARTA, display: "flex", flexDirection: "column" }}>
                {u.foto && u.plag ? <button type="button" onClick={() => setVelke({ src: u.foto })} aria-label="Plagát na celú obrazovku" style={{ width: "100%", aspectRatio: "3 / 4", border: "none", padding: 0, background: "var(--nf-pas)", cursor: "zoom-in", display: "block" }}><img src={u.foto} alt="Plagát" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /></button>
                  : <div style={{ position: "relative", aspectRatio: u.foto ? "16 / 9" : "4 / 1", minHeight: 110, background: "var(--nf-pas)", overflow: "hidden" }}>
                    {u.foto && <img src={u.foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                    {d && <span style={{ position: "absolute", left: 16, top: 16 }}><Datum d={d} velky /></span>}
                  </div>}
                <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {u.mojeX ? hlavickaAutora(u.mojeX) : hlavickaFar(u.af)}
                  {u.kedy && <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".1em", color: ZLATA }}>{u.kedy}</span>}
                  <b style={{ fontSize: 22, lineHeight: 1.2, letterSpacing: "-.01em" }}>{u.t}</b>
                  {u.txt && <Viac text={u.txt} />}
                  {u.pz > 0 && pozvat(u)}
                  {u.mojeX && <MenuPrispevku x={u.mojeX} strankaId={strankaId} kto={kto} moje={moje(u.mojeX)} />}
                </div>
              </div>); })}
            {alba.map((a) => { const f = a.fotky!.find(ziveObr)!; return (
                <div key={a.id} style={{ borderRadius: 18, overflow: "hidden", background: KARTA, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px 14px 6px" }}>{hlavickaAutora(a)}</div>
                <button type="button" onClick={() => setAlbum(a)} style={{ textAlign: "left", border: "none", padding: 0, background: KARTA, display: "flex", flexDirection: "column", cursor: "pointer", color: INK, fontFamily: "inherit" }}>
                  <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "16 / 9", background: "var(--nf-pas)", overflow: "hidden" }}><img src={f} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /><span style={{ position: "absolute", right: 10, bottom: 10, padding: "3px 9px", borderRadius: 7, background: "rgba(20,17,11,.78)", color: "#fff", fontSize: 14, fontWeight: 700 }}>{fotiek(a.fotky!.length)}</span></span>
                  <span style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 17, lineHeight: 1.25 }}>{a.t || "Fotky z akcie"}</b></span>
                </button>
                {/* OPRAVY 194: autor fotky upraví a zmaže */}
                <div style={{ padding: "0 14px 14px" }}><MenuPrispevku x={a} strankaId={strankaId} kto={kto} moje={moje(a)} /></div>
                </div>); })}
          </div>}
        </div>
      </>)}

      {/* ---------- Teš sa s nami (OPRAVY 205: tvar podľa druhu, bez tlačidiel; Blahoželám a zoznam po ťuknutí) ---------- */}
      {maTes && blokN("tes", "Teš sa s nami", "Svadby, jubileá a poďakovania. Ťuknite a zablahoželajte.", S.tes, <>
        <div style={{ flex: "999 1 520px", minWidth: 0, ...mriezkaTvarov }}>
          {tesy.map((t) => <div key={t.id} style={zmensi}><TvarOznamu tvar={t.druh === "svadba" ? "kruh" : t.druh === "jubileum" ? "kosostvorec" : "stvorec"} pal={t.pal} label={`${t.meno} · otvoriť`}
            onTap={() => setTes(t)} pod={<>
              {t.ine && t.foto && <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center", maxWidth: 220 }}>
                <span style={kickerTvaru(t.pal.ac)}>OZNÁMENIE</span>
                <i style={{ fontFamily: SERIF_TVARU, fontSize: 19, lineHeight: 1.2, ...riadkyMax(3) }}>{sestSlov(t.nadpis)}</i>
              </span>}
              {t.x ? hlavickaAutora(t.x) : t.zb ? null : hlavickaFar(t.af)}
              {!t.ine && t.r.zoznam.length > 0 && <span style={{ fontSize: 14, color: INK2 }}>{reakT(!!t.dakuje, t.r.zoznam.length)}</span>}
            </>}><ObsahTvaru t={t} /></TvarOznamu></div>)}
        </div>
      </>)}

      {/* ---------- Spomíname (OPRAVY 205: medailóny bez tlačidiel, ťuk = parte a zbierka rodiny) ---------- */}
      {maSpom && blokN("spom", "Spomíname", "Parte a spomienky. Ťuknite na medailón, otvorí sa parte a zbierka rodiny.", S.spom, <>
        <div style={{ flex: "999 1 520px", minWidth: 0, ...mriezkaTvarov }}>
          {spomienky.map((sp) => <div key={sp.id} style={zmensi}><ParteMedailon pal={sp.pal} foto={sp.foto} symbol={symbol} meno={sp.d.meno}
            roky={rokyParte(sp.d.nar, sp.d.umr)} rozlucka={rozluckaT(sp.d.rd, sp.d.rc)} zbierka={!!sp.zb} onTap={() => setParte(sp)} /></div>)}
        </div>
      </>, "var(--nf-spom)")}

      {/* ---------- Od veriacich (OPRAVY 197: krátke oznamy veriacich) ---------- */}
      {oznVer.length > 0 && blokN("ver", "Od veriacich", "Krátke oznamy, ktoré pridali veriaci.", S.ver, <>
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,420px))", gap: 16, alignItems: "start" }}>
          {oznVer.map((x) => (
            <div key={x.id} style={{ padding: "16px 20px 18px", borderRadius: 22, background: KARTA, display: "flex", flexDirection: "column", gap: 8 }}>
              {hlavickaAutora(x)}
              <span style={kicker(INK3)}>OZNAM · {dd(x.cas)}</span>
              <b style={{ fontSize: 19, lineHeight: 1.3 }}>{x.t}</b>
              {x.s && <Viac text={x.s} />}
              {x.fotky?.some(ziveObr) && <button type="button" onClick={() => setAlbum(x)} aria-label="Fotky na celú obrazovku" style={{ border: "none", padding: 0, borderRadius: 14, overflow: "hidden", cursor: "zoom-in", position: "relative" }}><img src={x.fotky.find(ziveObr)} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />{x.fotky.length > 1 && <span style={{ position: "absolute", right: 10, bottom: 10, padding: "3px 9px", borderRadius: 7, background: "rgba(20,17,11,.78)", color: "#fff", fontSize: 14, fontWeight: 700 }}>{fotiek(x.fotky.length)}</span>}</button>}
              <MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={moje(x)} />
            </div>))}
        </div>
      </>)}

      {/* ---------- (11) Deti a mládež (OPRAVY 211) ---------- */}
      {zbalene ? maDeti && blokN("deti", "Deti a mládež", "Stretká, miništranti, spevokol a tábory.", S.deti, <DetiAMladezBlok strankaId={strankaId} blokStyl={{}} lavy={null} kto={kto} mojeMeno={mojeMeno} reg={reg} />)
        : <DetiAMladezBlok strankaId={strankaId} blokStyl={blokStyl()} lavy={lavyStlpec("Deti a mládež", "Stretká, miništranti, spevokol a tábory.")} kto={kto} mojeMeno={mojeMeno} reg={reg} />}

      {/* ---------- KARTA 62: Naše kostoly — posledný blok pred pätou (len pri 2+ miestach) ---------- */}
      {miestaF.length > 1 && (zbalene
        ? blokN("kostoly", "Naše kostoly", siroka ? `${miestaF.length === 2 ? "Dve miesta" : miestaF.length === 3 ? "Tri miesta" : `${miestaF.length} miest`}, jedna farnosť. Ťuknite na kostol a uvidíte omše a akcie len v ňom.` : "Ťuknite na kostol, uvidíte omše len v ňom.", S.kostoly, <NaseKostolyBlok strankaId={strankaId} miesta={miestaF} siroka={siroka} pc={pc} onMiesto={setMiesto} styl={{ display: "flex" }} nadpis={() => null} />)
        : <NaseKostolyBlok strankaId={strankaId} miesta={miestaF} siroka={siroka} pc={pc} onMiesto={setMiesto} styl={blokStyl()} nadpis={lavyStlpec} />)}

      {/* ---------- (12) päta: Tento týždeň vo farnosti + Farský úrad (OPRAVY 220, 221) ---------- */}
      {zbalene ? <>
        {maKal && blokN("kal", "Tento týždeň vo farnosti", "", S.omse, <TyzdenFarnosti key={`t${jeHl ? MF.mojKostol ?? "" : ""}`} strankaId={strankaId} slovo={SLF.omsa} siroka={siroka} cas={cas} miestaF={miestaF} mojKostol={jeHl ? MF.mojKostol : null} bezNadpisu />)}
        {maUrad && blokN("urad", "Farský úrad", "", S.urad, uradBox)}
      </> : (maKal || maUrad) && <div data-blok="kal" style={{ padding: `40px ${PAD_X} 56px`, borderTop: "4px solid var(--nf-linia)", display: "flex", flexWrap: "wrap", gap: "36px 48px", alignItems: "flex-start", scrollMarginTop: 16 }}>
        {maKal && <TyzdenFarnosti key={`t${jeHl ? MF.mojKostol ?? "" : ""}`} strankaId={strankaId} slovo={SLF.omsa} siroka={siroka} cas={cas} miestaF={miestaF} mojKostol={jeHl ? MF.mojKostol : null} />}
        {maUrad && uradBox}
      </div>}

      {/* ---------- prázdna farnosť ---------- */}
      {prazdna && <div style={{ padding: `56px ${PAD_X} 80px`, display: "flex", flexDirection: "column", gap: 8 }}>
        <b style={{ fontSize: 24 }}>Farnosť tu zatiaľ nič nezverejnila.</b>
        <span style={{ fontSize: 17, color: INK3 }}>Sledujte ju a dáme vám vedieť, keď pribudne oznam, omša alebo zbierka.</span>
      </div>}

      </>}

      {/* ---------- celé obrazovky ---------- */}
      {prihOn && p && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Príhovor farára" style={{ position: "fixed", inset: 0, zIndex: 1100, background: "#000", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: "none", padding: "calc(14px + env(safe-area-inset-top, 0px)) 16px 10px", display: "flex", alignItems: "center", gap: 12 }}>
            <b style={{ flex: 1, fontSize: 17, color: "#fff" }}>Príhovor farára</b>
            <button type="button" onClick={() => setPrihOn(false)} autoFocus style={{ minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#111" }}>× Zavrieť</button>
          </div>
          <video src={p.src} controls playsInline autoPlay style={{ flex: 1, minHeight: 0, width: "100%", background: "#000", objectFit: "contain" }} />
        </div>, document.body)}
      {velke && <CelaObrazovka label="Na celú obrazovku" onZavri={() => setVelke(null)}>
        <VelkyObrazok v={velke} vz={vz} />
      </CelaObrazovka>}
      {osoba && createPortal(<div role="dialog" aria-modal="true" aria-label={`Profil · ${osoba}`} style={{ position: "fixed", inset: 0, zIndex: 1100, overflowY: "auto", overscrollBehavior: "contain", background: "var(--c-bg)", color: "var(--c-text)" }}>
        <CudziProfil subjekt={{ typ: "osoba", meno: osoba }} toast={toast} onBack={() => setOsoba(null)} />
      </div>, document.body)}
      {album && <ProhliadacAlbumu a={album} onZavri={() => setAlbum(null)} />}
      {det && <DetailZbierky d={det} strankaId={strankaId} onZavri={() => setDet(null)} />}
      {miesto && <PodstrankaMiesta m={miesto} strankaId={strankaId} menoFarnosti={meno} siroka={siroka} zbierky={zb.filter((z) => druh(z) === "farnost" && z.farnost?.miesto === miesto.id).map((z) => ({ id: z.id, nazov: z.nazov || "Zbierka", onTap: () => { setMiesto(null); otvorZbierku(z); } }))} linia={farbaLinie}
        onKalendar={() => { setMiesto(null); naBlok("kal"); }} onZavri={() => setMiesto(null)} sledovat={sledKostol(miesto)}
        oznamy={(() => { const l = ozAll.filter((o) => o.mi?.includes(miesto.id)); return l.length ? l.map(kartaOznamu) : null; })()} onOznamy={() => { setMiesto(null); naBlok("ozn"); }} />}
      {parte && <DetailParte sp={parte} strankaId={strankaId} symbol={symbol} orgMeno={meno} sablona={parte.it && !obrFar(parte.it) ? sablonaFar(parte.it) : null} vz={vz}
        onOsoba={(m) => setOsoba(m)} onZavri={() => { setParte(null); naBlok("spom"); }} />}
      {tes && createPortal(<div role="dialog" aria-modal="true" aria-label={tes.meno} onClick={() => setTes(null)} style={{ ...PREMENNE, position: "fixed", inset: 0, zIndex: 1000, background: "var(--c-bg)", overflowY: "auto", overscrollBehavior: "contain", padding: 16, boxSizing: "border-box", display: "flex", justifyContent: "center", alignItems: "flex-start", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, marginTop: 24, borderRadius: 24, background: PAPIER, color: INK, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, boxSizing: "border-box" }}>
          <button type="button" onClick={() => setTes(null)} autoFocus style={{ alignSelf: "flex-start", minHeight: 48, padding: "0 18px", border: "none", borderRadius: 14, background: ZELENA_TL, color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>‹ Späť na stránku farnosti</button>
          <CeleOznamenie t={tes} vz={vz} />
          {/* OPRAVY 229: pri inom oznámení celý nadpis a text až po ťuknutí */}
          {tes.ine && <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 6 }}>
            <b style={{ fontSize: 19, lineHeight: 1.3 }}>{tes.it?.nazov ?? tes.x?.t ?? tes.nadpis}</b>
            {(tes.it?.popis ?? tes.x?.s) && (tes.it?.popis ?? tes.x?.s) !== (tes.it?.nazov ?? tes.x?.t) && <span style={{ fontSize: 16, lineHeight: 1.5, whiteSpace: "pre-line" }}>{tes.it?.popis ?? tes.x?.s}</span>}
          </div>}
          {tes.x ? hlavickaAutora(tes.x) : tes.zb ? null : hlavickaFar(tes.af)}
          {/* re-render po ťuknutí: čerstvý stav reakcií z tesy */}
          {(() => { const t = tesy.find((y) => y.id === tes.id) ?? tes; const jaV = t.r.zoznam.includes(kto); const mena = t.r.zoznam.map((k2) => `${t.mena[k2] ?? "veriaci"}${k2 === kto ? " (vy)" : ""}`); return <>
            {/* OPRAVY 241: pri Iné žiadne tlačidlo — len plagát, nadpis, text a autor */}
            {!t.ine && <button type="button" aria-pressed={jaV} onClick={t.r.prepni} style={{ ...tlacR(jaV, true), alignSelf: "stretch" }}>{jaV ? (t.dakuje ? "Ďakujete ✓" : "Blahoželáte ✓") : t.dakuje ? "Ďakujem" : "Blahoželám"}</button>}
            {!t.ine && mena.length > 0 && <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
              <span style={{ ...kicker(), paddingBottom: 6 }}>{reakT(!!t.dakuje, mena.length).toLocaleUpperCase("sk-SK")}</span>
              {mena.map((m, i) => <span key={i} style={{ padding: "9px 0", borderTop: `1px solid ${LINKA}`, fontSize: 16 }}>{m}</span>)}
            </div>}
            {t.zb && <button type="button" onClick={() => { const z = t.zb!; setTes(null); otvorZbierku(z); }} style={{ alignSelf: "stretch", minHeight: 52, borderRadius: 14, border: `2px solid ${FIALOVA}`, background: "var(--nf-fSoft)", color: INK, fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Darček pre snúbencov · Prispieť ›</button>}
            {/* OPRAVY 212: fotky z galérie (svadba, jubileum od veriaceho) */}
            {t.x?.fotky?.some(ziveObr) && <div style={{ alignSelf: "stretch", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 6 }}>
              {t.x.fotky.filter(ziveObr).map((f, i) => <button key={i} type="button" onClick={() => setAlbum(t.x!)} aria-label="Fotky na celú obrazovku" style={{ border: "none", padding: 0, borderRadius: 10, overflow: "hidden", cursor: "zoom-in", aspectRatio: "1" }}><img src={f} alt={t.x!.popisy?.[i] ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></button>)}
            </div>}
            {t.x && <div style={{ alignSelf: "stretch" }}><MenuPrispevku x={t.x} strankaId={strankaId} kto={kto} moje={moje(t.x)} vMenu /></div>}
          </>; })()}
        </div>
      </div>, document.body)}
      {upoz && <OknoUpozorneni ciel={upoz} onZavri={() => setUpoz(null)} />}
      {mfOn && <MojeFarnostiOkno strankaId={strankaId} domovska={MF.domovska} sled={MF.sled} kostoly={MF.kostoly} mojKostol={MF.mojKostol} onKostol={setMiestoId} hlaska={mfHl}
        onHlaska={(t) => { setMfHl(t); window.setTimeout(() => setMfHl(null), 3000); }} onZavri={() => setMfOn(false)} />}
    </div>);
}

/** KARTA 57C §5: vybraná sada zbierky (index v SADY_EUR / SADY_EURC) → rýchle sumy v module */
function sadyZbierky(z: { sada: number; eurc: boolean; sadaE: number }): Pick<ZbierkaData, "rychleSumy" | "eurc" | "rychleSumyE"> {
  return { rychleSumy: Object.values(SADY_EUR)[z.sada]?.sumy, eurc: z.eurc, rychleSumyE: Object.values(SADY_EURC)[z.sadaE]?.sumy };
}

/** OPRAVY 204: parte + zbierka rodiny. PC a tablet na šírku: parte vľavo (A5, najviac 560 px), modul vpravo, darcovia pod parte.
 *  Mobil a tablet na výšku: výrez parte (nadpis až vek) + pás „Ťuknite · posledná rozlúčka a celé parte", modul pod ním.
 *  Pod parte žiadny text zbierky. Dary v krypte vždy zbalené. Zbaliť a späť = späť na Spomíname. */
function DetailParte({ sp, strankaId, symbol, orgMeno, sablona, vz, onOsoba, onZavri }: { sp: Spom; strankaId: string; symbol: string; orgMeno: string; sablona: VieraFeedItem["oz"] | null; vz: Parameters<typeof Plagat>[0]["vz"]; onOsoba: (m: string) => void; onZavri: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  const [sirka, setSirka] = useState(() => window.innerWidth);
  const [vyska, setVyska] = useState(() => window.innerHeight);
  useEffect(() => { const f = () => { setSirka(window.innerWidth); setVyska(window.innerHeight); }; window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const vedla = sirka >= 900 && sirka > vyska; // PC a tablet na šírku
  const [cele, setCele] = useState(false);
  const zb = sp.zb;
  // OPRAVY 204: QR na parte farára — beží zbierka → zbierka, inak stránka farnosti
  const qr = useQrObrazok(zb ? odkazZbierky(zb.id) : odkazQrStranky(strankaId));
  const org = zb?.farnost?.prijemca?.meno?.trim() || "";
  const data: ZbierkaData | null = zb ? { id: zb.id, nazov: `Zbierka rodiny · ${sp.d.meno}`, popis: "", overena: true, ciel: cielCislo(zb) || undefined, ...sadyZbierky(zb), media: [],
    organizacia: { meno: orgMeno, typ: "charita", mesto: "", cisla: [], stit: "Silver" } } : null;
  // OPRAVY 230 (204): šablóna farára sa zmestí do rámu celá aj s pásom QR (šírka podľa rámu, nie pevných 480 px)
  const qp = sablona?.volba && sablona.volba.qr !== false && qr ? 76 : 0;
  const sirkaRamu = (cele: boolean) => cele ? Math.min(sirka - 16, (vyska - 90) / 1.4189) : vedla ? 560 : Math.min(560, sirka - 32);
  const sirkaPlagatu = (cele: boolean) => { const w = sirkaRamu(cele); return Math.floor(Math.min(w, (w * 210 / 148) * 360 / (510 + qp))); };
  const parteEl = (vyrez: boolean, cele = false) => sp.obr
    ? <img src={sp.obr} alt={`Parte · ${sp.d.meno}`} style={vyrez ? { width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" } : { width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#fff" }} />
    : sablona?.u && sablona.volba ? <div style={{ display: "flex", justifyContent: "center", background: "#fff", height: "100%", overflow: "hidden" }}><Plagat u={sablona.u} volba={sablona.volba} vz={vz} sirka={vyrez ? Math.min(560, sirka - 32) : sirkaPlagatu(cele)} qr={qr} qrText={zb ? "Prispieť rodine" : "Naša farnosť"} hotove /></div>
    : <ParteKarta sp={sp} symbol={symbol} qr={qr} />;
  const organizuje = org ? <div className="zb-pol" style={{ padding: "4px 16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
    <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{iniciy(org)}</span>
    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>ZBIERKU ORGANIZUJE</span><b style={{ fontSize: 16 }}>{org}</b></span>
    <button type="button" onClick={() => onOsoba(org)} style={{ flex: "none", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", color: "var(--green)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Pozri profil ›</button>
  </div> : null;
  const modul = <div style={{ borderRadius: 24, overflow: "hidden", border: zb ? `3px solid ${FIALOVA}` : "1px solid var(--cardBd)", background: "rgb(var(--panel-rgb))", padding: "14px 0" }}>
    {data ? <ZbierkaModul zbierka={data} miesto="charita" pohreb hore={organizuje} bezDarcov={vedla} pietne={<PietneAkcie strankaId={strankaId} zbierka={zb!.id} />} bocny zoStrankyOrg onBack={onZavri} ktoVoli="farnosť" bez={["zapojitFirmu", "pravidelna", "dorovnanie"]} />
      : <div style={{ padding: "0 16px" }}><PietneAkcie strankaId={strankaId} zbierka={sp.id} /></div>}
  </div>;
  // Martin 13. 10.: pohrebná zbierka cez faru — bez mena „Bohu známy darca“
  return createPortal(<SektorDarcuKontext.Provider value="pohreb">
    <div role="dialog" aria-modal="true" aria-label={`Parte · ${sp.d.meno}`} style={{ ...PREMENNE, position: "fixed", inset: 0, zIndex: 1000, background: "var(--c-bg)", overflowY: "auto", overscrollBehavior: "contain", padding: 16, boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" } as CSSProperties}>
      <div style={{ maxWidth: 1140, margin: "0 auto", paddingBottom: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div><button type="button" onClick={onZavri} autoFocus style={{ minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: ZELENA_TL, color: "#fff", fontFamily: "inherit", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>‹ Späť na stránku farnosti</button></div>
        {vedla ? <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 560px", maxWidth: 560, minWidth: 0, display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 0 }}>
            <button type="button" onClick={() => setCele(true)} aria-label="Parte na celú obrazovku" style={{ width: "100%", aspectRatio: "148 / 210", border: "none", padding: 0, background: "#fff", cursor: "zoom-in", overflow: "hidden" }}>{parteEl(false)}</button>
            {zb && <div className="sc-tokeny" style={{ borderRadius: 20, background: "rgb(var(--panel-rgb))", padding: "14px 16px", color: "var(--ink)" }}><Darcovia refId={zb.id} /></div>}
          </div>
          <div style={{ flex: "1 1 420px", maxWidth: 520, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{modul}</div>
        </div> : <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560, width: "100%", margin: "0 auto" }}>
          {/* výrez parte od nadpisu po vek + pás */}
          <button type="button" onClick={() => setCele(true)} aria-label="Ťuknite · posledná rozlúčka a celé parte" style={{ width: "100%", border: "none", padding: 0, background: "#fff", cursor: "zoom-in", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 4 }}>
            <span style={{ display: "block", width: "100%", height: Math.round(Math.min(560, sirka - 32) * 0.82), overflow: "hidden" }}>{parteEl(true)}</span>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, padding: "0 14px", background: "#1D211B", color: "#fff", fontSize: 15, fontWeight: 800 }}>Ťuknite · posledná rozlúčka a celé parte</span>
          </button>
          {modul}
        </div>}
        <button type="button" onClick={onZavri} style={{ alignSelf: "center", minHeight: 52, padding: "0 26px", borderRadius: 14, border: `1.5px solid ${LINKA}`, background: PAPIER, color: INK, fontFamily: "inherit", fontSize: 16.5, fontWeight: 800, cursor: "pointer" }}>Zbaliť a späť ⌃</button>
      </div>
      {cele && <CelaObrazovka label="Parte na celú obrazovku" onZavri={() => setCele(false)}>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "0 8px 8px" }}>
          <div style={{ width: "min(100%, calc((100vh - 90px) / 1.4189))", aspectRatio: "148 / 210", background: "#fff" }}>{parteEl(false, true)}</div>
        </div>
      </CelaObrazovka>}
    </div></SektorDarcuKontext.Provider>, document.body);
}

/** OPRAVY 204: parte bez obrázka — A5, kríž, meno, roky, rozlúčka (nevyplnené riadky vynechané), QR vľavo dole „Prispieť rodine" */
function ParteKarta({ sp, symbol, qr }: { sp: Spom; symbol: string; qr?: string }) {
  const p = sp.pal, d = sp.d, roz = rozluckaT(d.rd, d.rc);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 360, boxSizing: "border-box", background: p.bg, color: p.fg, fontFamily: SERIF_TVARU, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8% 8% 6%", gap: 10, outline: `1px solid ${p.ac}`, outlineOffset: -14 }}>
      <span style={{ fontSize: 34, lineHeight: 1 }}>{symbol}</span>
      <i style={{ fontSize: 18 }}>{d.head || "Smútočné oznámenie"}</i>
      <span style={{ fontSize: 15, opacity: .85 }}>S hlbokým zármutkom oznamujeme</span>
      <b style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>{d.meno}</b>
      {rokyParte(d.nar, d.umr) && <span style={{ fontSize: 16 }}>{rokyParte(d.nar, d.umr)}</span>}
      {roz && <span style={{ fontSize: 16, lineHeight: 1.5 }}>Posledná {roz.replace(/^rozlúčka /, "rozlúčka bude ")}{d.rm ? <><br />{d.rm}</> : null}</span>}
      <span style={{ flex: 1 }} />
      {sp.zb && qr && <span style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <span style={{ position: "relative", width: 104, height: 104, padding: 4, background: "#fff", boxSizing: "border-box" }}><img src={qr} alt="QR kód zbierky" style={{ width: "100%", height: "100%", display: "block" }} />
          <span style={{ position: "absolute", left: -6, top: -6, padding: "1px 5px", borderRadius: 5, background: "#14110B", color: "#fff", fontSize: 10, fontWeight: 800 }}>D+</span></span>
        <span style={{ fontSize: 12.5, lineHeight: 1.4 }}><b>Prispieť rodine</b><br />Naskenujte QR kód</span>
      </span>}
    </div>);
}

/** OPRAVY 207: text najviac 4 riadky, potom „… viac“ (rozbalí na mieste); dlhé slová sa zalomia */
export function Viac({ text, riadkov = 4, velkost = 16.5 }: { text: string; riadkov?: number; velkost?: number }) {
  const [otv, setOtv] = useState(false);
  const [dlhy, setDlhy] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => { const e = ref.current; if (e && !otv) setDlhy(e.scrollHeight > e.clientHeight + 2); }, [text, otv]);
  return <>
    <span ref={ref} style={{ fontSize: velkost, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line", overflowWrap: "anywhere", ...(otv ? {} : { display: "-webkit-box", WebkitLineClamp: riadkov, WebkitBoxOrient: "vertical", overflow: "hidden" }) } as CSSProperties}>{text}</span>
    {dlhy && !otv && <button type="button" onClick={() => setOtv(true)} style={{ alignSelf: "flex-start", minHeight: 40, padding: 0, border: "none", background: "transparent", color: INK, fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, cursor: "pointer" }}>… viac</button>}
  </>;
}

/** sviečka (prosba o modlitbu) */
function Sviecka() {
  return <span aria-hidden="true" style={{ position: "relative", width: 12, height: 30, flex: "none" }}><span style={{ position: "absolute", left: 3.5, top: 0, width: 5, height: 8, borderRadius: "50%", background: "#C9A24A" }} /><span style={{ position: "absolute", left: 1, top: 9, width: 10, height: 21, borderRadius: 2, background: PAPIER, border: `1px solid ${LINKA}`, boxSizing: "border-box" }} /></span>;
}

/** obrázok na celú obrazovku: vyplní výšku, čierna len po bokoch */
/** OPRAVY 228: ťuk na svadbu / jubileum / blahoželanie = celé oznámenie (ako pri parte), ale bez súkromných údajov:
 *  bez času, miesta obradu, hostiny, reštaurácie a adresy oslavy — ostáva meno, roky alebo mená a dátum.
 *  Z Editora: obrázok bez týchto riadkov · šablóna farnosti: bez času a miesta · inak tvar ako na stránke. */
function CeleOznamenie({ t, vz }: { t: Tes; vz: Parameters<typeof Plagat>[0]["vz"] }) {
  const navrh = t.x?.editor ?? t.it?.oz?.ed ?? null;
  const src = useVerejnyObrazok(navrh, t.id);
  const tvar = <TvarOznamu tvar={t.druh === "svadba" ? "kruh" : t.druh === "jubileum" ? "kosostvorec" : "stvorec"} pal={t.pal} label={t.meno} onTap={() => undefined}><ObsahTvaru t={t} /></TvarOznamu>;
  if (navrh) return src
    ? <img src={src} alt={`${t.meno} · oznámenie`} style={{ display: "block", width: "100%", maxWidth: 420, height: "auto", borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,.18)" }} />
    : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>{tvar}<span style={{ fontSize: 13.5, color: "var(--nf-ink2)" }}>Načítavam oznámenie…</span></div>;
  const oz = t.it?.oz;
  if (oz?.u && oz.volba && !t.it?.plagat) return <div style={{ display: "flex", justifyContent: "center", background: "#fff", borderRadius: 8, overflow: "hidden" }}><Plagat u={{ ...oz.u, kedyC: "", kde: "" }} volba={oz.volba} vz={vz} sirka={360} /></div>;
  const f = t.it?.plagat ? t.it.fotky?.find(ziveObr) : t.ine ? t.foto : undefined;
  if (f) return <img src={f} alt={t.meno} style={{ display: "block", width: "100%", maxWidth: 420, height: "auto", borderRadius: 8 }} />;
  return tvar;
}

function VelkyObrazok({ v, vz }: { v: Velke; vz: Parameters<typeof Plagat>[0]["vz"] }) {
  if ("src" in v) return <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px 8px" }}><img src={v.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>;
  const oz = v.it.oz;
  if (!oz?.u || !oz.volba) return null;
  const sirka = Math.max(240, Math.min(window.innerWidth - 16, Math.round((window.innerHeight - 90) / 1.414)));
  return <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", justifyContent: "center", padding: "0 8px 8px" }}><Plagat u={oz.u} volba={oz.volba} vz={vz} sirka={sirka} /></div>;
}

/** HLAVNÁ ZBIERKA — suma z ledgera (+ zvončekové nedele), darcovia „Bohu známy veriaci“ bez súm, zvonček jeden riadok za nedeľu */
function HlavnaKarta({ strankaId, hlRef, nazov, txt, onTap }: { strankaId: string; hlRef: string; nazov: string; txt: string; onTap: () => void }) {
  const dary = useDarcovia(hlRef);
  const { uzavrete } = useOmsoveOkno(strankaId);
  const s = suhrnHlavnej(strankaId, hlRef);
  const riadky: { cas: number; k: string; s: string }[] = [
    ...dary.map((r: DarRiadok) => ({ cas: r.cas, k: "Bohu známy veriaci", s: relCas(r.cas) })),
    ...uzavrete.filter((o) => o.suma > 0).map((o) => ({ cas: o.do, k: `Zvončeková zbierka · nedeľa ${o.nedela}`, s: eur(o.suma) })),
  ].sort((a, b) => b.cas - a.cas).slice(0, 4);
  return (
    <button type="button" onClick={onTap} style={{ flex: "1 1 360px", minWidth: 0, textAlign: "left", padding: "26px 28px", borderRadius: 24, background: KARTA, border: "none", borderLeft: `6px solid ${TEAL}`, display: "flex", flexDirection: "column", gap: 12, cursor: "pointer", color: INK, fontFamily: "inherit" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><span style={{ height: 30, padding: "0 12px", borderRadius: 9, background: TEAL_TL, color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center" }}>HLAVNÁ ZBIERKA</span><span style={{ fontSize: 15.5, color: INK3 }}>stále · aj pravidelne mesačne</span></span>
      <b style={{ fontSize: "clamp(24px,2.2vw,30px)", letterSpacing: "-.02em" }}>{nazov} ›</b>
      {txt && <span style={{ fontSize: 17, lineHeight: 1.5, color: INK2 }}>{txt}</span>}
      {s.suma > 0 ? <span style={{ fontSize: 18, color: INK2 }}><b style={{ fontSize: 42, letterSpacing: "-.03em", color: INK }}>{eur(s.suma)}</b> {centralnaZPamate(strankaId)?.rocne ? `v roku ${new Date().getFullYear()}` : "spolu"} · {ludi(s.darcov)}</span>
        : null /* OPRAVY 247: prázdne pole sa vynechá */}
      {riadky.length > 0 && <span style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${LINKA}` }}>
        {riadky.map((r, i) => <span key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: `1px solid ${LINKA}`, fontSize: 15.5 }}><span style={{ color: INK2 }}>{r.k}</span><b style={{ flex: "none" }}>{r.s}</b></span>)}
      </span>}
    </button>);
}

/** ZVONČEKOVÁ ZBIERKA — omšové okno tohto týždňa (nedeľa) */
function ZvoncekKarta({ strankaId, onTap }: { strankaId: string; onTap: (id: string, t: string) => void }) {
  const { okno, dary } = useOmsoveOkno(strankaId);
  const ja = usePouzivatel();
  const suma = dary.reduce((a, r) => a + r.suma, 0);
  const mena = suma > 0 ? menaOkna(dary, ja) : "";
  const casy = nedelneOmse(strankaId);
  const t = `Nedeľa ${okno.nedela}`;
  return (
    <button type="button" onClick={() => onTap(okno.id, `Zvončeková zbierka · ${t}`)} style={{ textAlign: "left", border: "none", borderRadius: 22, background: KARTA, borderLeft: `5px solid ${TEAL}`, padding: 18, display: "flex", flexDirection: "column", gap: 10, color: INK, cursor: "pointer", fontFamily: "inherit" }}>
      <span style={kicker(TEAL)}>ZVONČEKOVÁ ZBIERKA ›</span>
      <b style={{ fontSize: 24, lineHeight: 1.2 }}>{t}</b>
      <span style={{ fontSize: 16, color: INK3 }}>{casy.length === 1 ? `omša ${casy[0]}` : `omše ${casy.join(" · ")}`}</span>
      {suma > 0 ? <>
        <span style={{ fontSize: 16.5 }}><b style={{ fontSize: 30, letterSpacing: "-.02em" }}>{eur(suma)}</b> <span style={{ color: INK3 }}>od {ludi(dary.length)}</span></span>
        {mena && <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{mena.split(/, | a (?=ďalší)/).map((m, i) => <span key={i} style={{ height: 36, padding: "0 12px", borderRadius: 18, background: BG, display: "flex", alignItems: "center", fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>{m}</span>)}</span>}
      </> : null /* OPRAVY 247 */}
      <span style={{ fontSize: 14.5, lineHeight: 1.45, color: INK3 }}>ako do zvončeka pri omši</span>
    </button>);
}

/** zbierka farnosti (lavice, organ …) — suma a ľudia z ledgera */
/** OPRAVY 187: zbierka iného subjektu pripnutá na stránke farnosti */
function PripnutaKarta({ z, onTap }: { z: ZbierkaNaPripnutie; onTap: () => void }) {
  const c = farbaPripnutej(z);
  return (
    <button type="button" onClick={onTap} style={{ textAlign: "left", border: "none", borderRadius: 22, overflow: "hidden", background: KARTA, borderLeft: `5px solid ${c}`, padding: 0, display: "flex", flexDirection: "column", color: INK, cursor: "pointer", fontFamily: "inherit" }}>
      {z.foto && <img src={z.foto} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />}
      <span style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ ...kicker(c), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{chipPripnutej(z)}</span>
      <b style={{ fontSize: 20, lineHeight: 1.25 }}>{z.nazov}</b>
      <span style={{ fontSize: 16, color: INK2 }}>{z.darov ? `${eur(z.vyzbierane)}${z.ciel ? ` z ${eur(z.ciel)}` : ""} · ` : ""}Peniaze idú: {z.kto}</span>
      </span>
    </button>);
}

/** OPRAVY 187: pásy pripnutej zbierky — celá zbierka (skutočný stav) a Cez našu farnosť (len míľniky) */
function PasyPripnutej({ z: z0, strankaId }: { z: ZbierkaNaPripnutie; strankaId: string }) {
  useDarcovia(z0.id); // rastie naživo zo skutočného stavu zbierky
  const sd = sucetDarov(z0.id), z = { ...z0, vyzbierane: Math.max(sd.suma, z0.vyzbierane), darov: Math.max(sd.pocet, z0.darov) };
  const c = useCezStranku(z.id, strankaId);
  const pct = z.ciel ? Math.min(100, Math.round((z.vyzbierane / z.ciel) * 100)) : 0;
  const m = dalsiMilnik(c.suma);
  const pom = (n: number) => (n === 1 ? "pomohol" : n < 5 ? "pomohli" : "pomohlo");
  const pas = (w: number, f: string) => <span style={{ display: "block", height: 10, borderRadius: 5, background: "rgba(20,17,11,.1)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${w}%`, borderRadius: 5, background: f, transition: "width .5s ease" }} /></span>;
  return (<>
    <div style={{ margin: "0 16px", padding: "14px 16px", borderRadius: 14, background: PAPIER, border: `1px solid ${LINKA}`, display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 17 }}><b style={{ fontSize: 26, letterSpacing: "-.02em" }}>{eur(z.vyzbierane)}</b>{z.ciel ? ` z ${eur(z.ciel)} · ${pct} %` : ""}</span>
      {z.ciel ? pas(pct, ZELENA) : null}
      {z.darov > 0 && <span style={{ fontSize: 15, color: INK2 }}>{`${ludi(z.darov)} ${pom(z.darov)}`}</span>}
    </div>
    <div style={{ margin: "0 16px", padding: "14px 16px", borderRadius: 14, background: "var(--nf-gSoft)", border: `1.5px solid ${ZELENA}`, display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".1em", color: ZELENA }}>CEZ NAŠU FARNOSŤ</span>
      <span style={{ fontSize: 17 }}><b style={{ fontSize: 24 }}>{eur(c.suma)}</b> · ďalší míľnik {eur(m)}</span>
      {pas(Math.min(100, (c.suma / m) * 100), ZELENA)}
      <span style={{ fontSize: 15, color: INK2 }}>{c.pocet ? `${ludi(c.pocet)} z farnosti ${pom(c.pocet)}` : "Buďte prvý z farnosti"}</span>
    </div>
    {c.dary.length > 0 && <div style={{ margin: "0 16px 16px", display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".1em", color: INK3, paddingBottom: 4 }}>DAROVALI CEZ NAŠU FARNOSŤ</span>
      {c.dary.slice(0, 8).map((r) => <span key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: `1px solid ${LINKA}`, fontSize: 15.5 }}><span style={{ color: INK2 }}>{r.meno || "Bohu známy veriaci"} · {relCas(r.cas)}</span><b style={{ flex: "none" }}>{eur(r.suma)}</b></span>)}
    </div>}
  </>);
}

function ZbierkaKarta({ z, onTap }: { z: SpustenaZbierka; onTap: () => void }) {
  useDarcovia(z.id);
  const s = sucetDarov(z.id), ciel = cielCislo(z);
  const foto = z.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src;
  const pod: ReactNode = s.pocet ? `${eur(s.suma)}${ciel ? ` z ${eur(ciel)}` : ""} · ${ludi(s.pocet)}` : ciel ? `cieľ ${eur(ciel)}` : null; // OPRAVY 247
  return (
    <button type="button" onClick={onTap} style={{ textAlign: "left", border: "none", borderRadius: 22, overflow: "hidden", background: KARTA, borderLeft: `5px solid ${TEAL}`, padding: 0, display: "flex", flexDirection: "column", color: INK, cursor: "pointer", fontFamily: "inherit" }}>
      {foto && <img src={foto} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block", background: "var(--nf-pas)" }} />}
      <span style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={kicker(TEAL)}>ZBIERKA</span>
        <b style={{ fontSize: 20, lineHeight: 1.25 }}>{z.nazov || "Zbierka"}</b>
        {pod && <span style={{ fontSize: 16, color: INK2 }}>{pod}</span>}
      </span>
    </button>);
}

/** KARTA 57C §3 — detail zbierky: vľavo zbierka alebo parte (ostáva na mieste), vpravo platobný modul; mobil pod sebou */
export interface DetailF { data: ZbierkaData; typ: "hl" | "zv" | "far" | "rodina" | "pin"; chip: string; t: string; txt: string; obr?: string; parte?: boolean; /** OPRAVY 187 */ pin?: ZbierkaNaPripnutie }
function DetailZbierky({ d, strankaId, onZavri }: { d: DetailF; strankaId: string; onZavri: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  const rod = d.typ === "rodina", ram = d.pin ? farbaPripnutej(d.pin) : rod ? FIALOVA : TEAL, hc = rod ? FIALOVA : ZELENA;
  // OPRAVY 187: dar z detailu pripnutej zbierky nesie zdroj = táto farnosť
  useEffect(() => { if (!d.pin || d.pin.ukazkova) return; nastavZdrojDaru(d.data.id, strankaId); return () => nastavZdrojDaru(d.data.id, null); }, [d.pin, d.data.id, strankaId]);
  const { wide } = useLayout(); // PC: zbierka vľavo ostáva na mieste; mobil: pod sebou
  // Martin 13. 10.: sumy pri darcoch zbierok farnosti podľa farára; zbierka rodiny nikdy; pripnutá cudzia podľa Viery (bez súm)
  const farska = d.typ === "hl" || d.typ === "zv" || d.typ === "far";
  const sumyFar = useSumyDarcov(strankaId, d.typ === "hl" ? "hlavna" : d.typ === "zv" ? "zvoncek" : d.typ === "far" ? d.data.id : null);
  return createPortal(<SumyDarcovKontext.Provider value={d.typ === "rodina" ? false : farska ? sumyFar : null}>
    <div role="dialog" aria-modal="true" aria-label="Zbierka" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--c-bg)", overflowY: "auto", overscrollBehavior: "contain", padding: wide ? 16 : 12, boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <div><button type="button" onClick={onZavri} autoFocus style={{ minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: ZELENA_TL, color: "#fff", fontFamily: "inherit", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>‹ Späť na stránku farnosti</button></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
          <div style={{ ...PREMENNE, flex: "1.1 1 380px", minWidth: 0, position: wide ? "sticky" : "static", top: 0, display: "flex", flexDirection: "column", gap: 14 } as CSSProperties}>
            <div style={{ border: `3px solid ${ram}`, background: PAPIER, color: INK, display: "flex", flexDirection: "column", borderRadius: d.parte || rod ? 0 : 22, overflow: "hidden" }}>
              {d.obr && <img src={d.obr} alt="" style={{ width: "100%", maxHeight: "72vh", objectFit: "contain", display: "block", background: BG }} />}
              {d.parte && !d.obr ? <div style={{ padding: "32px 28px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
                <span aria-hidden="true" style={{ position: "relative", width: 22, height: 34, flex: "none" }}><span style={{ position: "absolute", left: 8, top: 0, width: 5, height: 34, background: INK }} /><span style={{ position: "absolute", left: 0, top: 8, width: 22, height: 5, background: INK }} /></span>
                <span style={{ fontSize: 17, color: INK2 }}>S bolesťou v srdci oznamujeme</span>
                <b style={{ fontSize: 38, letterSpacing: "-.02em", lineHeight: 1.1 }}>{d.t}</b>
                {d.txt && <span style={{ fontSize: 18, lineHeight: 1.55, color: INK2, whiteSpace: "pre-line" }}>{d.txt}</span>}
              </div> : <div style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={kicker(ram)}>{d.chip}</span>
                <b style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: "-.02em" }}>{d.t}</b>
                {d.txt && <span style={{ fontSize: 17.5, lineHeight: 1.55, color: INK2, whiteSpace: "pre-line" }}>{d.txt}</span>}
              </div>}
              {d.pin && <>
                <div style={{ margin: "0 16px 12px", fontSize: 16, color: INK2 }}>Peniaze idú: <b style={{ color: INK }}>{d.pin.kto}</b></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}><PasyPripnutej z={d.pin} strankaId={strankaId} /></div>
              </>}
              {rod && <div style={{ margin: "0 16px 16px", padding: "12px 16px", borderRadius: 14, background: "var(--nf-fSoft)", border: `2px solid ${FIALOVA}`, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".1em", color: FIALOVA }}>ZBIERKA RODINY</span>
                <b style={{ fontSize: 17 }}>Peniaze idú: rodine</b>
                {d.parte && <span style={{ fontSize: 14.5, color: INK2 }}>Sumu uvidíte po vašom dare.</span>}
              </div>}
            </div>
          </div>
          <div style={{ flex: "1 1 380px", minWidth: 0, maxWidth: 520, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ borderRadius: wide ? 24 : rod ? 18 : 0, overflow: "hidden", border: rod ? `3px solid ${FIALOVA}` : wide ? "1px solid var(--cardBd)" : "none", background: wide ? "rgb(var(--panel-rgb))" : "transparent", padding: wide ? "14px 0" : rod ? "10px 0" : 0, /* OPRAVY 257: mobil bez dvojitého rámu, modul na celú šírku */ ["--hcPruh" as string]: hc, ["--hcF" as string]: hc } as CSSProperties}>
              {d.typ === "hl" || d.typ === "zv" || d.typ === "far"
                // OPRAVY 189: klasické zbierky farnosti = ten istý platobný modul ako na profile charity
                // OPRAVY 251: bez data-hier — hierarchia farbí len rám karty, vnútro modulu ostáva ako modul charita a viera
                ? <div className="vp sc-tokeny" data-stit="silver" style={{ background: "transparent", padding: wide ? "0 14px" : rod ? "0 10px" : 0 }}><div><ZmensenyModul><ModulPlatby profil={{ k: strankaId, meno: d.data.organizacia?.meno ?? "Farnosť" } as TestProfil}
                    sektor={{ id: d.data.id, nazov: d.t, druh: d.typ === "hl" ? "centralna" : "sektor", foto: d.obr ?? "", vyzbierane: 0, darcovia: 0, mesta: {} } as unknown as TestSektor}
                    nazov={`${d.t} · ${d.data.organizacia?.meno ?? "Farnosť"}`} dorovnanie={false} ktoVoli="farnosť" bezObjektu={d.typ === "zv"} sumy={d.data.rychleSumy} sumyE={d.data.rychleSumyE} bezEurc={d.data.eurc === false} ciel={d.data.ciel} /></ZmensenyModul></div></div>
                : d.pin?.ukazkova ? <div style={{ margin: "0 14px", padding: "16px 18px", borderRadius: 16, background: "var(--goldBg)", border: "2px solid #C9A24A", display: "flex", flexDirection: "column", gap: 6, color: "var(--ink)" }}>
                    <b style={{ fontSize: 16.5 }}>Ukážková zbierka</b>
                    <span style={{ fontSize: 14.5, lineHeight: 1.5 }}>Je len v testovacej verzii, aby ste videli, ako vyzerá pripnutá zbierka inej charity. Darovať sa na ňu nedá.</span>
                  </div>
                : <ZbierkaModul zbierka={d.data} miesto="charita" pohreb={!!d.parte} pietne={<PietneAkcie strankaId={strankaId} zbierka={d.data.id} />} bocny zoStrankyOrg onBack={onZavri} ktoVoli={d.pin ? (d.pin.zdroj === "help" ? "príjemca" : "charita") : rod ? "rodina" : "farnosť"} bez={["zapojitFirmu", "pravidelna", "dorovnanie"]} />}
            </div>
            <button type="button" onClick={onZavri} style={{ alignSelf: "center", minHeight: 52, padding: "0 26px", borderRadius: 14, border: `1.5px solid ${LINKA}`, background: PAPIER, color: INK, fontFamily: "inherit", fontSize: 16.5, fontWeight: 800, cursor: "pointer" }}>Zbaliť ⌃</button>
          </div>
        </div>
      </div>
    </div></SumyDarcovKontext.Provider>, document.body);
}

/** KARTA 60 §3 — okno Moje farnosti (tlačidlo Moja farnosť ⌄ / Sledovaná farnosť ⌄ na stránke farnosti) */
function MojeFarnostiOkno({ strankaId, domovska, sled, kostoly, mojKostol, onKostol, hlaska, onHlaska, onZavri }: { strankaId: string; domovska: string | null; sled: string[];
  /** KARTA 62 */ kostoly: SledovanyKostol[]; mojKostol: string | null; onKostol: (miesto: string) => void; hlaska: string | null; onHlaska: (t: string) => void; onZavri: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  const riadky: [string, boolean][] = [...(domovska ? [[domovska, true] as [string, boolean]] : []), ...sled.map((id) => [id, false] as [string, boolean])];
  return createPortal(
    <div onClick={onZavri} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,17,11,.45)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 20, boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif", ...PREMENNE }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Moje farnosti" style={{ width: "100%", maxWidth: 420, maxHeight: "calc(100vh - 40px)", overflowY: "auto", borderRadius: 24, background: PAPIER, color: INK, padding: 20, display: "flex", flexDirection: "column", gap: 8, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 4 }}>
          <b style={{ flex: 1, fontSize: 22 }}>Moje farnosti</b>
          <button type="button" onClick={onZavri} autoFocus style={{ minHeight: 48, padding: "0 16px", borderRadius: 12, border: `1px solid ${LINKA}`, background: PAPIER, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", color: INK }}>× Zavrieť</button>
        </div>
        {riadky.map(([id, hl]) => { const tu = id === strankaId; return (
          <div key={id} style={{ padding: "10px 12px", borderRadius: 14, border: tu ? `2px solid ${ZELENA}` : `1px solid ${LINKA}`, background: tu ? "var(--nf-gSoft)" : PAPIER, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { onZavri(); if (!tu) otvorVerejnyProfil(id); }} style={{ flex: "1 1 180px", minWidth: 0, minHeight: 48, textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, color: INK, fontFamily: "inherit" }}>
              <b style={{ fontSize: 17 }}>{nazovFarnosti(id)}</b>
              <span style={{ fontSize: 14, color: hl ? "var(--nf-gInk)" : INK3 }}>{hl ? "hlavná farnosť" : "sledovaná"}{tu ? " · práve ste tu" : ""}</span>
            </button>
            {!hl && <DrzTlacidlo ms={1200} styl={{ flex: "none", minHeight: 48, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${CERVENA}`, background: PAPIER, color: CERVENA, fontSize: 14.5, fontWeight: 800 }}
              onHotovo={() => { const n = nazovFarnosti(id); void odstranSledovanu(id).catch((e: Error) => toast(e.message)); onHlaska(`Odstránené zo sledovaných ✓ ${n}`); }}>Podržte · odstrániť</DrzTlacidlo>}
            {hl && <MojKostolVolba stranka={id} mojKostol={mojKostol} />}
          </div>); })}
        {kostoly.map((k) => <KostolRiadok key={`${k.stranka}|${k.miesto}`} k={k} tu={k.stranka === strankaId} onHlaska={onHlaska}
          onOtvor={() => { onZavri(); if (k.stranka === strankaId) onKostol(k.miesto); else { otvorKostolPoPrichode(k.stranka, k.miesto); otvorVerejnyProfil(k.stranka); } }} />)}
        {hlaska && <span role="status" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--nf-gSoft)", border: `2px solid ${ZELENA}`, fontSize: 15.5, fontWeight: 800, color: "var(--nf-gInk)" }}>{hlaska}</span>}
        <span style={{ fontSize: 14, lineHeight: 1.5, color: INK3 }}>Domovskú zmeníte v Adresári cirkví.</span>
        <button type="button" onClick={() => { onZavri(); otvorAdresar("‹ Späť na moju farnosť"); }} style={{ minHeight: 60, marginTop: 6, padding: "10px 16px", borderRadius: 14, border: "none", background: ZELENA_TL, color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 2, textAlign: "left", fontFamily: "inherit" }}>
          <b style={{ fontSize: 16.5 }}>Adresár cirkví SR ›</b>
          <span style={{ fontSize: 14, color: "var(--nf-gSoft)" }}>pridať ďalšiu farnosť alebo zmeniť domovskú</span>
        </button>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: INK3, paddingTop: 4 }}>Ťuknite na farnosť a otvorí sa jej stránka.</span>
      </div>
    </div>, document.body);
}

/** KARTA 62: riadok sledovaného kostola v okne Moje farnosti („Notre Dame · Farnosť Trenčín“) */
function KostolRiadok({ k, tu, onOtvor, onHlaska }: { k: SledovanyKostol; tu: boolean; onOtvor: () => void; onHlaska: (t: string) => void }) {
  const m = useMiesta(k.stranka, true).find((x) => x.id === k.miesto);
  const n = `${m?.nazov ?? "Kostol"} · ${nazovFarnosti(k.stranka)}`;
  return (
    <div style={{ padding: "10px 12px", borderRadius: 14, border: `1px solid ${LINKA}`, background: PAPIER, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <button type="button" onClick={onOtvor} style={{ flex: "1 1 180px", minWidth: 0, minHeight: 48, textAlign: "left", border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", gap: 2, fontFamily: "inherit", color: INK }}>
        <b style={{ fontSize: 17 }}>{n}</b>
        <span style={{ fontSize: 14, color: INK3 }}>sledovaný kostol{tu ? " · farnosť, kde práve ste" : ""}</span>
      </button>
      <DrzTlacidlo ms={1200} styl={{ flex: "none", minHeight: 48, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${CERVENA}`, background: PAPIER, color: CERVENA, fontSize: 14.5, fontWeight: 800 }}
        onHotovo={() => { void prestanKostol(k.stranka, k.miesto).catch((e: Error) => toast(e.message)); onHlaska(`Odstránené zo sledovaných ✓ ${n}`); }}>Podržte · odstrániť</DrzTlacidlo>
    </div>);
}
/** KARTA 62: Môj kostol pri domovskej farnosti (nepovinné) — kalendár na stránke farnosti sa otvorí s jeho čipom */
function MojKostolVolba({ stranka, mojKostol }: { stranka: string; mojKostol: string | null }) {
  const l = useMiesta(stranka);
  if (l.length < 2) return null;
  return (
    <label style={{ flex: "1 1 100%", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 14.5, fontWeight: 800 }}>Môj kostol</span>
      <select value={l.some((m) => m.id === mojKostol) ? mojKostol ?? "" : ""} onChange={(e) => { void nastavMojKostol(e.target.value || null).catch((er: Error) => toast(er.message)); }} aria-label="Môj kostol"
        style={{ flex: "1 1 160px", minWidth: 0, minHeight: 44, padding: "0 12px", borderRadius: 12, border: `1.5px solid ${LINKA}`, background: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: INK }}>
        <option value="">Nevybraný · všetky kostoly</option>{l.map((m) => <option key={m.id} value={m.id}>{m.nazov}</option>)}</select>
    </label>);
}

/** OPRAVY 209 (prototyp Platobny modul pohrebna zbierka): pod kryptom jedno tlačidlo Kondolovať · počet (= Úprimnú sústrasť pri parte) */
function PietneAkcie({ strankaId, zbierka }: { strankaId: string; zbierka: string }) {
  useReakcieF();
  const ja = usePouzivatel();
  const kto = klucJa(ja), meno = ja.celeMeno?.trim() || "veriaci";
  const l = reakcieF(strankaId, zbierka).sustrast ?? [], on = l.includes(kto);
  return <div style={{ display: "flex", marginTop: 10 }}>
    <button type="button" aria-pressed={on} onClick={() => prepniReakciuF(strankaId, zbierka, "sustrast", kto, meno)} className="zb-karta"
      style={{ flex: 1, minHeight: 48, borderRadius: 14, border: `1px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--card)", color: on ? "var(--gInk)" : "var(--ink)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z" /></svg>
      <span>{on ? "Kondolovali ste" : "Kondolovať"} · {l.length}</span>
    </button>
  </div>;
}

/** OPRAVY 210: dátumový štvorec — bežný deň biely, sobota modrý rám, nedeľa červený rám, prikázaný sviatok zlatý s názvom, viacdňová akcia modrá */
export function Datum({ d, velky, viacdnova, bezSviatku }: { d: Date; velky?: boolean; viacdnova?: boolean; bezSviatku?: boolean }) {
  const dr = viacdnova ? "viacdnova" : druhDna(d), f = farbyDna(dr), sv = !bezSviatku && dr === "sviatok" ? prikazanySviatok(d) : null;
  const w = velky ? 72 : 52, h = velky ? 78 : 56;
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "none", maxWidth: velky ? 120 : 96 }}>
      <span style={{ width: w, height: h, borderRadius: velky ? 16 : 12, background: f.bg, color: f.ink, boxShadow: f.tien, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <b style={{ fontSize: velky ? 28 : 19, lineHeight: 1 }}>{d.getDate()}.</b>
        <span style={{ fontSize: velky ? 13 : 10, fontWeight: 800, letterSpacing: ".06em" }}>{MES[d.getMonth()]}</span>
        {velky && <span style={{ fontSize: 12, fontWeight: 600 }}>{DNW[dvt(d)]}</span>}
      </span>
      {sv && <span style={{ padding: "2px 6px", borderRadius: 6, background: "#C9A24A", color: "#1D211B", fontSize: 10.5, fontWeight: 800, lineHeight: 1.25, textAlign: "center" }}>{sv}</span>}
    </span>);
}

/** OPRAVY 221: mobil · malý riadok zbierky (obrázok 44 px, štítok, názov 1 riadok, tenký pás) */
function RiadokZbierky({ stitok, farba, nazov, obr, refId, ciel, pct: pct0, datum, ram, onTap }: { stitok: string; farba: string; nazov: string; obr?: string; refId?: string; ciel?: number; pct?: number; datum?: string; ram?: boolean; onTap: () => void }) {
  useDarcovia(refId ?? "");
  const s = refId ? sucetDarov(refId) : null;
  const pct = pct0 ?? (s && ciel ? Math.min(100, Math.round((s.suma / ciel) * 100)) : undefined);
  return (
    <button type="button" onClick={onTap} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, background: KARTA, border: ram ? `1.5px solid ${ZELENA}` : "none", textAlign: "left", cursor: "pointer", color: INK, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}>
      {obr ? <img src={obr} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flex: "none" }} />
        : <span style={{ width: 44, height: 44, borderRadius: 10, background: "#fff", boxShadow: "0 0 0 1px #D9D3C7", color: "#8A6A1F", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 11, fontWeight: 800, textAlign: "center", lineHeight: 1.1 }}>{datum ? `NE ${datum.split(" ")[0]}` : "€"}</span>}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: farba, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stitok}</span>
        <b style={{ fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nazov}</b>
        {pct != null && <span style={{ height: 5, borderRadius: 3, background: "var(--nf-linka)", overflow: "hidden" }}><span style={{ display: "block", width: `${pct}%`, height: "100%", background: ZELENA }} /></span>}
      </span>
      <span aria-hidden="true" style={{ fontSize: 18, color: INK3 }}>›</span>
    </button>);
}

/** OPRAVY 220/221: päta „Tento týždeň vo farnosti" — všetko zaškrtnuté v Čo uvidia ľudia, podľa času, dnešok čierny, zrušená prečiarknutá.
 *  PC celý týždeň otvorený; mobil a tablet zbalené na dnes a zajtra + „Celý týždeň ⌄". Celý mesiac › · Vytlačiť ›. */
function TyzdenFarnosti({ strankaId, slovo, siroka, cas, miestaF, mojKostol, bezNadpisu }: { strankaId: string; slovo: string; siroka: boolean; cas: Date; /** OPRAVY 245: v zbalenom bloku nadpis nesie riadok */ bezNadpisu?: boolean;
  /** KARTA 62: miesta farnosti — pri 2+ miestach „· názov miesta“ a čipy Všetky · miesta */ miestaF: Miesto[]; /** „Môj kostol“ — kalendár sa otvorí s jeho čipom */ mojKostol?: string | null }) {
  const kal = useKalendar(strankaId);
  const k = kostolKal(strankaId), VJ = kal.verejne;
  const viac = miestaF.length > 1;
  const [vyb, setVyb] = useState<string | null>(() => (mojKostol && miestaF.some((m) => m.id === mojKostol) ? mojKostol : null));
  const [cely, setCely] = useState(false);
  const [mesiac, setMesiac] = useState(false);
  const dnes = iso(cas);
  const tyzden = (off: number) => {
    if (!viac) return plagatTyzdna(k, VJ, off, slovo);
    const ms = vyb ? miestaF.filter((m) => m.id === vyb) : miestaF;
    const po = ms.map((m) => ({ m, t: plagatTyzdna(kostolKal(strankaId, m.id), VJ, off, slovo) }));
    return po[0].t.map((d, i) => ({ ...d, o: po.flatMap(({ m, t }) => t[i].o.map((o) => ({ ...o, k: vyb ? "" : m.nazov }))).sort((a, b) => minuty(a.t) - minuty(b.t)) }));
  };
  const t0 = tyzden(0), t1 = tyzden(1);
  const iDnes = t0.findIndex((d) => d.key === dnes);
  // OPRAVY 247: deň bez omše, udalosti a zmeny úradných hodín sa neukáže
  const plny = (d: (typeof t0)[number]) => { const v = k.uradne?.[d.key] as { zrus?: boolean; od?: string; do?: string } | undefined; return d.o.length > 0 || !!(v && (v.zrus || (v.od && v.do))); };
  const dni = (siroka || cely ? t0 : [...t0, ...t1].slice(Math.max(0, iDnes)).filter(plny).slice(0, 2)).filter(plny);
  const riadok = (d: (typeof t0)[number], pozn?: string) => {
    const dt = zIso(d.key), dn = d.key === dnes;
    return (
      <div key={d.key} style={{ display: "grid", gridTemplateColumns: siroka ? "150px minmax(0,1fr)" : "auto minmax(0,1fr)", gap: siroka ? 20 : 12, alignItems: siroka ? "center" : "flex-start", padding: siroka ? "12px 16px" : "10px 12px", borderRadius: 14, background: dn ? "var(--nf-plne)" : KARTA, color: dn ? "var(--nf-plneInk)" : INK }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Datum d={dt} />{siroka && <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{dn ? "dnes" : d.w}</span>}</span>
        <span style={{ display: "flex", flexDirection: siroka ? "row" : "column", flexWrap: "wrap", gap: siroka ? "8px 18px" : 4, alignItems: siroka ? "center" : "flex-start", paddingTop: siroka ? 0 : 2 }}>
          {!siroka && <span style={{ fontSize: 12, fontWeight: 800 }}>{pozn ?? d.w}</span>}
          {d.o.length === 0 ? <span style={{ fontSize: 15, opacity: .6 }}>bez {slovo.replace(/^sv\. /, "")}</span>
            : d.o.map((o, i) => <span key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: siroka ? 16 : 15.5, textDecoration: o.z ? "line-through" : "none", opacity: o.z ? 0.6 : 1 }}><b style={{ flex: "none", fontVariantNumeric: "tabular-nums", minWidth: siroka ? undefined : 44 }}>{o.t}</b><span style={{ minWidth: 0 }}>{o.s}{(o as { k?: string }).k ? <span style={{ color: INK3 }}> · {(o as { k?: string }).k}</span> : null}</span></span>)}
          {(() => { const v = k.uradne?.[d.key]; return v && (v.zrus || (v.od && v.do)) ? <span style={{ fontSize: 14, fontWeight: 700, color: dn ? "inherit" : "var(--nf-cervena, #A3341F)" }}>{v.zrus ? "úradné hodiny zrušené" : `úradné hodiny zmenené na ${textCasu(v)}`}</span> : null; })()}
        </span>
      </div>);
  };
  const tlac = () => {
    const f = document.createElement("iframe"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0"; document.body.appendChild(f);
    const doc = f.contentDocument; if (!doc) return;
    const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const riadky = t0.map((d) => `<tr><td style="padding:3mm 4mm 3mm 0;vertical-align:top;white-space:nowrap"><b>${esc(d.w)}</b><br>${esc(d.dt)}</td><td style="padding:3mm 0">${d.o.length ? d.o.map((o) => `<div style="${o.z ? "text-decoration:line-through;opacity:.6" : ""}"><b>${esc(o.t)}</b> ${esc(o.s)}</div>`).join("") : "—"}</td></tr>`).join("");
    doc.open(); doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Tento týždeň vo farnosti</title><style>@page{size:A4;margin:14mm}body{font-family:"Plus Jakarta Sans",-apple-system,"Segoe UI",sans-serif;font-size:12pt;color:#111}table{width:100%;border-collapse:collapse}tr{border-top:0.3mm solid #ccc}</style></head><body><h2 style="margin:0 0 2mm">Tento týždeň vo farnosti</h2><div style="margin-bottom:6mm;color:#444">${esc(rozsahTyzdna(0, true))}</div><table>${riadky}</table></body></html>`); doc.close();
    window.setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); window.setTimeout(() => f.remove(), 1500); }, 400);
  };
  const tl: CSSProperties = { flex: siroka ? "none" : 1, minHeight: 46, padding: "0 18px", borderRadius: 12, border: `1.5px solid ${LINKA}`, background: PAPIER, color: INK, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };
  return (
    <div style={{ flex: "1 1 600px", minWidth: 0, display: "flex", flexDirection: "column", gap: siroka ? 6 : 8 }}>
      {!bezNadpisu && <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", paddingBottom: 8 }}><span style={kicker()}>TENTO TÝŽDEŇ VO FARNOSTI</span><span style={{ fontSize: 14, color: INK3 }}>{rozsahTyzdna(0)}</span></div>}
      {/* KARTA 62: čipy Všetky · miesta (len pri 2+ miestach) */}
      {viac && <div role="radiogroup" aria-label="Kostol" style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 6 }}>
        {[null, ...miestaF.map((m) => m.id)].map((id) => { const on = vyb === id, n = id ? miestaF.find((m) => m.id === id)!.nazov : "Všetky"; return (
          <button key={id ?? "vsetky"} type="button" role="radio" aria-checked={on} onClick={() => setVyb(id)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 20, border: `1.5px solid ${on ? "var(--nf-plne)" : LINKA}`, background: on ? "var(--nf-plne)" : PAPIER, color: on ? "var(--nf-plneInk)" : INK, fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>{n}</button>); })}
      </div>}
      {dni.map((d) => riadok(d, siroka || cely ? undefined : d.key === dnes ? "dnes" : d.key === iso(new Date(zIso(dnes).getTime() + 864e5)) ? "zajtra" : undefined))}
      {!siroka && <button type="button" onClick={() => setCely(!cely)} aria-expanded={cely} style={{ minHeight: 48, borderRadius: 12, border: `1.5px solid ${ZELENA}`, background: "transparent", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "var(--nf-gInk)", cursor: "pointer" }}>{cely ? "Zbaliť ⌃" : "Celý týždeň ⌄"}</button>}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button type="button" onClick={() => setMesiac(true)} style={tl}>Celý mesiac ›</button>
        <button type="button" onClick={tlac} style={tl}>Vytlačiť ›</button>
      </div>
      {mesiac && <CelaObrazovka label="Celý mesiac vo farnosti" onZavri={() => setMesiac(false)}>
        <div className="nastenka-farnosti" style={{ ...PREMENNE, flex: 1, minHeight: 0, overflowY: "auto", background: BG, color: INK, padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 6 } as CSSProperties}>
          {[0, 1, 2, 3, 4].map((off) => <div key={off} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 900, width: "100%", margin: "0 auto" }}>
            <span style={{ ...kicker(), padding: "10px 0 4px" }}>{rozsahTyzdna(off).toLocaleUpperCase("sk-SK")}</span>
            {tyzden(off).filter((d) => d.key >= dnes).map((d) => riadok(d))}
          </div>)}
        </div>
      </CelaObrazovka>}
    </div>);
}
