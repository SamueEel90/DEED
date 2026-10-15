// ============================================================
// KARTA 56G §4–5 · OPRAVY 167 — Správa farnosti → Oznamy (prototyp „Sprava farnosti - prvy prichod", PC).
// Čo chcete oznámiť: Krátky oznam · Udalosť · Oznámenie (parte, svadba, jubileum). Bez „Kde sa ukáže",
// bez „Pri akcii zbierame na", bez výzvy na súrnu pomoc — oznam je len na profile pre sledujúcich.
// Zverejnenie podržaním, živý náhľad vpravo, zoznam zverejnených s červeným ×.
// 56H §1: ohlášky sa tu netlačia — tlač len v Omše → Vytlačiť na nástenku (plagát má hore OZNAMY).
// Oznamy = príspevky farnosti (viera/mock pridajPrispevok — tie isté, ktoré ukazuje profil farnosti).
// KARTA 57 C: hore Príhovor farára, + Pridať oznam, formulár až po ťuku; Správa oznamov a udalostí v skupinách
// (ťuk na riadok: text, Upraviť, Ako to vidia ľudia, Podržte a zmažte). Upraviť naplní formulár z `oz`.
// Pozvať ľudí aj pri krátkom ozname (+ limit pri záväznom), Oznámenie: Parte · Svadba · Jubileum · Iné.
// ============================================================
import { CasPole } from "@/components/CasPole";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RichTextInput } from "@/components/richtext";
import { spracujFotku } from "@/lib/obrazok";
import { useVzhlad } from "@/lib/vzhladStranky";
import type { MediumZbierky } from "@/lib/novaZbierka";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { GaleriaEditor, cistyText, NASTROJE } from "./obsahZbierky";
import { vlastnePrispevky, zmazPrispevok, type VieraFeedItem } from "@/features/viera/mock";
import { zapisPrispevokIsto } from "@/features/viera/prispevkyDB";
import { Plagat, prazdneUdaje, prvaVolba, chybaOznamu, popisOznamu, type DruhOznamu, type UdajeOznamu, type VolbaSablony } from "@/features/viera/Sablony";
import { zmenKostol, CAS_OK, pekny, type KalKostol } from "@/lib/kalendarFarnosti";
import { stitokOznamu } from "./OmseKalendar";
import { NahladNastenky } from "./NahladNastenky";
import { VyberKostola, platnyKostol, idKostola, INE_MIESTO } from "./VyberKostola";
import { PrihovorKarta, OnlineOmseKarta } from "./PrihovorKarta";
import type { ProfilStranky } from "@/lib/profilStranky";
import { useQrObrazok } from "@/lib/qrObrazok";
import { useAutorZaMna } from "@/lib/autorFarnosti";
import { odkazQrStranky } from "@/features/verejny-profil/otvor";
import { EditorOznameni, type EditorApi, type PayloadEditora, type TypEditora } from "@/components/EditorOznameni";
import { RamPisania, MateRozpisane, ZahoditRozpisane } from "@/components/RamPisania";
import { nacitajKoncept, ulozKoncept, zmazKoncept, useUkladajKoncept } from "@/lib/koncept";
import { PodrzZmaz, useHromadnyVyber, TlacidloVyberu, ListaVyberu, OznacitSkupinu, PolickoVyberu, PasVyberu } from "@/components/HromadnyVyber";
export { PodrzZmaz };
import { zapisEditora, zapisZPayloadu } from "@/lib/editorStat";
import { useMiesta } from "@/lib/miestaFarnosti";
import { UpozornitSledujucich, NastavenieUpozorneni } from "./UpozornitSledujucich";
import { useNastavenieUpoz } from "@/lib/upozorneniaFarnosti";
import { Volby, kartaVolby, FajkaVolby } from "@/components/Volby";

type Druh = 0 | 1 | 2; // Krátky oznam · Udalosť · Oznámenie
const DRUHY: [string, string][] = [
  ["Krátky oznam", "len text, bez fotky · napr. V piatok nebude spovedanie"],
  ["Udalosť", "dátum, čas, fotky · sama sa zapíše do kalendára"],
  ["Oznámenie", "parte, svadba, jubileum · šablóna alebo vlastný plagát"],
];
const PLATI: [string, number][] = [["Bez konca", 36500], ["7 dní", 7], ["14 dní", 14], ["30 dní", 30]];
// KARTA 57 C.4: Pozvať ľudí ako pri charite (NovyOznam POZVANIA), text farnosti z prototypu
const POZVANIA: [string, string][] = [
  ["Bez prihlásenia", "len informácia"],
  ["Nezáväzne · Zúčastním sa", "ľudia ťuknú, vy viete, koľko ich asi príde. Napr. kultúrna akcia zadarmo."],
  ["Záväzne · Prihlásiť sa", "prihlásia sa menom, napr. na púť do autobusu alebo ako miništranti. Viete presne kto, môžete dať limit."],
];
// KARTA 57 C.5: Iné = bez šablóny, vlastný plagát + nadpis + krátky popis
const ODRUHY: [string, DruhOznamu, string][] = [["Parte", "parte", "PARTE"], ["Svadba", "svadba", "SVADBA"], ["Jubileum", "ine", "JUBILEUM"], ["Iné", "ine", "OZNÁMENIE"]];
const INE = 3;
// JUB = 2 (Jubileum) — OPRAVY 272: v Editore oznámení ako Blahoželanie
const NADPIS_PH = ["napr. Rozlúčka s pánom …", "napr. Ohlášky · Ján a Mária", "napr. 50 rokov spolu · manželia Novákovci", "napr. Primície Jána Nováka"];

/** KARTA 57 C.3: nastavenie formulára uložené pri ozname — Upraviť ho naplní 1:1 (fotky a plagát sú v `fotky`) */
export interface NastavenieOznamu {
  dr: 0 | 1 | 2; n: string; txt: string; plati: number; usp: 0 | 1; dat: string; cas: string; miesto: string;
  pozv: number; limit: string; odr: number; osp: 0 | 1; u?: UdajeOznamu; volba?: VolbaSablony;
  /** id záznamu udalosti v kalendári (pri úprave sa presunie) */ kal?: string;
  /** BLOK C 235: jubileum z Editora oznámení (Blahoželanie) — Upraviť ho otvorí v editore */ ed?: PayloadEditora;
  /** KARTA 62: Kde platí — id miest; bez poľa = všetky miesta */ mi?: string[];
  /** KARTA 62: kostol (miesto), v ktorého kalendári je udalosť; bez poľa = hlavný „0“ */ kk?: string;
  /** OPRAVY 287: Celá farnosť „*“ alebo Iné miesto „~“ (pri Inom mieste je miesto v `miesto`) */ kdeV?: "*" | "~";
  /** KARTA 63: farár zvolil Upozorniť sledujúcich (server pošle do zvončeka a push) */ upoz?: boolean;
}
const RIADKY = 12;
const ZLATA = "#C9A24A";

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const lbl: CSSProperties = { fontSize: 15, fontWeight: 800, color: "var(--ink)" };
const pole: CSSProperties = { height: 50, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const volbaKarta = (on: boolean): CSSProperties => ({ display: "flex", alignItems: "center", gap: 14, minHeight: 58, padding: "10px 36px 10px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", ...kartaVolby(on) });
const iniciy = (m: string) => m.split(/\s+/).filter((w) => w.length > 1).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "F";
const DEN_MS = 864e5;
const terazMs = () => Date.now();

/** OPRAVY 288: jeden prepínač s voľbami pre celú appku */
function Segment<T extends string | number>({ vol, cur, set, label }: { vol: [T, string][]; cur: T; set: (v: T) => void; label: string }) {
  return <Volby value={cur} onChange={set} moznosti={vol} label={label} />;
}

/** text oznamu — jedno pole, najviac 12 riadkov (rovnaké textové pole ako všade) */
export function TextOznamu({ value, onChange, popis = "Najviac 12 riadkov.", label = "Text", max = RIADKY, chybaRam }: { value: string; onChange: (h: string) => void; popis?: string; label?: string; /** KARTA 56I: najviac riadkov */ max?: number; /** KARTA 56I: zlatý rám, keď text chýba */ chybaRam?: boolean }) {
  const [riadky, setRiadky] = useState(0);
  const RIADKY = max;
  const dlhy = riadky > RIADKY, f = dlhy ? "#A34A2A" : riadky > RIADKY - 3 ? "#8A5A2B" : "var(--green)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={lbl}>{label}</span>
      <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>{popis}</span>
      <div style={{ borderRadius: 14, boxShadow: chybaRam && !dlhy ? "0 0 0 2px #C9A24A" : "none" }}><RichTextInput vzhlad="sprava" value={value} onChange={onChange} nastroje={NASTROJE} minH={120} chybaRam={dlhy} ariaLabel={label} tvrdyLimit={1200} onRiadky={setRiadky} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", borderRadius: 3, background: f, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, riadky / RIADKY)})`, transition: "transform .3s ease" }} /></span>
        <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: f }}>{riadky} / {RIADKY} riadkov</span>
      </div>
      {dlhy && <span style={{ fontSize: 13, fontWeight: 700, color: "#A34A2A" }}>Text je dlhší ako {RIADKY} riadkov. Skráťte ho.</span>}
    </div>);
}

/** vlastný plagát — jeden obrázok, ťuk alebo pretiahnutie */
function PlagatPole({ src, onSrc, toast, popis }: { src?: string; onSrc: (s: string) => void; toast: (m: string) => void; popis: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [nad, setNad] = useState(false);
  const nacitaj = async (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast("Plagát môže byť JPG alebo PNG."); return; }
    try { onSrc(await spracujFotku(f, { pomer: null, maxSirka: 1600 })); } catch (e) { toast(e instanceof Error ? e.message : "Plagát sa nepodarilo načítať."); }
  };
  return (
    <div role="button" tabIndex={0} onClick={() => ref.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setNad(true); }} onDragLeave={() => setNad(false)} onDrop={(e) => { e.preventDefault(); setNad(false); void nacitaj(e.dataTransfer.files?.[0]); }}
      style={{ minHeight: 96, padding: "12px 16px", borderRadius: 16, border: `1.5px dashed ${nad ? "var(--green)" : "var(--gBd)"}`, background: nad ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
      {src && <span style={{ flex: "none", width: 60, height: 76, borderRadius: 8, background: `url('${src}') center/contain no-repeat var(--card)`, border: "1px solid var(--cardBd)" }} />}
      <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <b style={{ fontSize: 15.5, color: "var(--green)" }}>{src ? "Nahraté ✓ · ťuknite a vymeňte" : "+ Nahrať plagát"}</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{popis}</span>
      </span>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { void nacitaj(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </div>);
}

/** KARTA 56H §4: vlastný plagát celý, bez orezu (contain, aj na výšku) */
export function ObrazokPlagatu({ src, bg = "#2F3A2A" }: { src: string; bg?: string }) {
  return <img src={src} alt="Plagát" style={{ display: "block", width: "100%", height: "auto", maxHeight: 640, objectFit: "contain", background: bg }} />;
}
/** fotky 16 : 9 (cover); bez fotky iniciály farnosti */
export function ObrazokOznamu({ src, inic, bg = "#2F3A2A" }: { src?: string; inic: string; bg?: string }) {
  return <span role={src ? "img" : undefined} aria-label={src ? "Fotka" : undefined} style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "16 / 9", background: src ? `url('${src}') center/cover no-repeat ${bg}` : bg }}>
    {!src && <span style={{ width: 72, height: 72, borderRadius: 18, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#4B7A35" }}>{inic}</span>}
  </span>;
}
const fmtDatum = (iso: string) => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); return `${["Ne", "Po", "Ut", "St", "Št", "Pi", "So"][dt.getDay()]} ${d}. ${m}.`; };
const pocetLudi = (n: number) => `${n} ${n === 1 ? "človek" : n >= 2 && n <= 4 ? "ľudia" : "ľudí"}`;

/** KARTA 57 C.1: mazanie len podržaním (1,5 s) */

/** OPRAVY 284 (4): oznámenie zo zrušeného formulára farnosti → návrh pre Editor oznámení (meno, rod, dátumy, rozlúčka, fotka, text).
 *  Čo sa nedá preniesť, ostane prázdne — editor sa nikdy neotvorí celý prázdny. */
function navrhZoStarych(x: VieraFeedItem): PayloadEditora | undefined {
  const st = stitokOznamu(x), sm = x.smutocny, u = x.oz?.u, volba = x.oz?.volba;
  const bez = (t?: string) => (t ?? "").replace(/^[^·]*·\s*/, "").trim();
  const meno = u?.meno || sm?.meno || bez(x.nazov);
  if (st === "PARTE" || u?.druh === "parte" || sm) {
    const z = u ? u.zena === true : false;
    return { verzia: 1, stav: "koncept", typ: "parte", sablona: `${z ? "z" : "m"}${((volba?.v ?? 0) % 8) + 1}`, pohlavie: z ? "z" : "m", foto: u?.foto ?? sm?.foto ?? null,
      polia: { meno, rod: u?.rod || sm?.rodena || "", nar: u?.nar || sm?.datumNar || "", umr: u?.umr || sm?.datumUmr || "", rd: u?.kedyD || sm?.rozluckaDatum || "", rc: u?.kedyC || sm?.rozluckaCas || "", rm: u?.kde || sm?.rozluckaMiesto || "", pod: u?.kto || "" } } as unknown as PayloadEditora;
  }
  if (st === "SVADBA" || u?.druh === "svadba") { const [a, b] = meno.split(/\s*(?:&| a )\s*/); return { verzia: 1, stav: "koncept", typ: "svadba", foto: u?.foto ?? null,
    polia: { sNev: a ?? "", sZen: b ?? "", sD: u?.kedyD || x.datum || "", sC: u?.kedyC || "", sM: u?.kde || "" } } as unknown as PayloadEditora; }
  if (st === "JUBILEUM" || st === "BLAHOŽELANIE" || u) return { verzia: 1, stav: "koncept", typ: "blahozelanie", foto: u?.foto ?? null, polia: { bMeno: meno, bD: u?.kedyD || "", bText: u?.text || "" } } as unknown as PayloadEditora;
  return undefined;
}

export function OznamyFarnosti({ strankaId, meno, profil, mobil, tel = mobil, toast, hore }: { strankaId: string; meno: string; /** uložený profil (Farský úrad, logo) — náhľad verejnej stránky */ profil: ProfilStranky | null; mobil: boolean;
  /** KARTA 57 C.6: telefón — po výbere druhu ponuka zmizne, náhľad prilepený hore */ tel?: boolean; toast: (m: string) => void;
  /** + Pridať oznam (hlavička PC, zelené + na mobile) — otvorí formulár */ hore?: number }) {
  const vz = useVzhlad(strankaId, false);
  // OPRAVY 204: parte zo šablóny má QR; v náhľade QR stránky farnosti (zbierka rodiny ho na Nástenke prepne na seba)
  const qrFar = useQrObrazok(odkazQrStranky(strankaId));
  const autorJa = useAutorZaMna(strankaId);
  const [formOn, setFormOn] = useState(() => !!hore);
  const [edit, setEdit] = useState<string | null>(null); // KARTA 57 C.3: upravujete zverejnené
  const [vyb, setVyb] = useState(false); // KARTA 57 C.6: telefón — druh vybraný
  const [dr, setDr] = useState<Druh>(0);
  const [n, setN] = useState("");
  const [txt, setTxt] = useState("");
  const [txtKey, setTxtKey] = useState(0); // nové naplnenie textového poľa (Upraviť)
  const [plati, setPlati] = useState(0);
  const [usp, setUsp] = useState<0 | 1>(0); // Text a fotky · Vlastný plagát
  const [dat, setDat] = useState("");
  const [cas, setCas] = useState("");
  const [miesto, setMiesto] = useState("");
  const [media, setMedia] = useState<MediumZbierky[]>([]);
  const [plagat, setPlagat] = useState<string | undefined>();
  const [pozv, setPozv] = useState(0);
  const [limit, setLimit] = useState("");
  const [odr, setOdr] = useState(0);
  const [osp, setOsp] = useState<0 | 1>(0); // Zo šablóny · Vlastný plagát
  const [u, setU] = useState<UdajeOznamu>(() => prazdneUdaje("parte"));
  const [volba, setVolba] = useState<VolbaSablony>(() => prvaVolba("parte"));
  const [hotovo, setHotovo] = useState<string | null>(null);
  // OPRAVY 273: chyba pri ukladaní (červená hláška + Skúsiť znova) a práve sa ukladá
  const [chybaUl, setChybaUl] = useState<string | null>(null);
  const [uklada, setUklada] = useState(false);
  const [posledne, setPosledne] = useState<string | null>(null); // OPRAVY 275: náhľad práve zverejneného
  const opakuj = useRef<(() => void) | null>(null);
  const ulozIsto = async (it: VieraFeedItem, uprava: boolean, znova?: () => void): Promise<boolean> => {
    setUklada(true); setChybaUl(null);
    const e = await zapisPrispevokIsto(strankaId, it, uprava);
    setUklada(false);
    if (e) { setChybaUl(e); opakuj.current = znova ?? (() => { void ulozIsto(it, uprava).then((ok) => { if (ok) { setHotovo(uprava ? "Zmeny sú uložené ✓" : "Zverejnené ✓"); setEdit(null); setJubKon(null); zmazKoncept(`oznam.${strankaId}`); obnov((x) => x + 1); } }); }); return false; }
    return true;
  };
  // OPRAVY 258: jubileum na mobile — Editor oznámení v ráme na celú obrazovku; rozpísané ostane (koncept) aj po Späť
  const [jubOtv, setJubOtv] = useState(false);
  // OPRAVY 271: rozpísané blahoželanie ostane na zariadení natrvalo
  const [jubKon, setJubKon0] = useState<PayloadEditora | null>(() => nacitajKoncept<PayloadEditora>(`jub.${strankaId}`)?.d ?? null);
  const setJubKon = (p: PayloadEditora | null) => { setJubKon0(p); if (p) ulozKoncept(`jub.${strankaId}`, p); else zmazKoncept(`jub.${strankaId}`); };
  const [nahlOtv, setNahlOtv] = useState(false);
  const ramTelo = useRef<HTMLDivElement>(null);
  const [otv, setOtv] = useState<string | null>(null); // rozbalený riadok v Správe oznamov
  const [pozri, setPozri] = useState<string | null>(null); // Ako to vidia ľudia (náhľad pod riadkom)
  const [vpOn, setVpOn] = useState(false); // 56H §6: celá verejná stránka
  const pozrietTl = <button type="button" onClick={() => setVpOn(true)} style={{ alignSelf: "stretch", minHeight: 48, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Pozrieť na stránke ›</button>;
  const [, obnov] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  // + Pridať oznam (hlavička / zelené +) — otvorí formulár; zmena propu = odvodený stav počas renderu
  const [horePrev, setHorePrev] = useState(hore);
  if (hore !== horePrev) { setHorePrev(hore); if (hore) { setFormOn(true); setHotovo(null); } }
  useEffect(() => { if (hore) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [hore]);

  // OPRAVY 271: jubileum sa na mobile otvára rovno v editore na celú obrazovku
  // OPRAVY 272: oznámenie (parte, svadba, jubileum, iné) = Editor oznámení na celú obrazovku, PC aj mobil
  const zmenOdr = (i: number) => { setOdr(i); const d = ODRUHY[i][1]; setU(prazdneUdaje(d)); setVolba(prvaVolba(d)); if (osp === 0) setJubOtv(true); };
  const vycisti = () => { setJubOtv(false); setN(""); setTxt(""); setTxtKey((k) => k + 1); setPlati(0); setUsp(0); setDat(""); setCas(""); setMiesto(""); setMedia([]); setPlagat(undefined); setPozv(0); setLimit(""); setOsp(0); zmenOdr(0); setKde(null); setOzIne(false); setKdeU(""); setUpozV(null); setEdit(null); };
  const novy = () => { vycisti(); setHotovo(null); setVyb(false); };
  const zavriForm = () => { vycisti(); setHotovo(null); setVyb(false); setFormOn(false); setKonRozh(false); };
  const vyberDruh = (i: Druh) => { setDr(i); setHotovo(null); setVyb(true); };

  // ---- čo chýba ----
  const ine = dr === 2 && odr === INE;
  // BLOK C 235: Jubileum = Editor oznámení, typ Blahoželanie (16 šablón, podpis „Blahoželá farnosť“); šablóna farnosti pri jubileu nie je
  // OPRAVY 272: oznámenie = celý Editor oznámení (ten istý ako má veriaci), druhá voľba Vlastný plagát; vlastný formulár farnosti je zrušený
  const jub = dr === 2 && osp === 0;
  const sablona = false as boolean;
  const [casZly, setCasZly] = useState(false);
  // KARTA 62 1c: oznam raz, zaškrtnuté miesta (null = všetky); udalosť v jednom kostole. Pri jednom mieste sa nepýta.
  const miestaF = useMiesta(strankaId);
  const viacMiest = miestaF.length > 1;
  const [kde, setKde] = useState<string[] | null>(null);
  const [kdeU, setKdeU] = useState("");
  // OPRAVY 287: udalosť — Celá farnosť · kostol · Iné miesto; oznam — Celá farnosť · kostoly · Iné miesto
  const kdeV = platnyKostol(kdeU, miestaF), kdeK = idKostola(kdeV), kdeId = kdeK ?? "0";
  const [ozIne, setOzIne] = useState(false);
  // KARTA 63 1c: Upozorniť sledujúcich — predvolené podľa Nastavenia upozornení (1d), pri úprave „Úpravy už zverejneného“
  const predvUpoz = useNastavenieUpoz(strankaId);
  const [upozV, setUpozV] = useState<boolean | null>(null);
  const ch: string[] = [];
  if (sablona) {
    if (!u.meno.trim()) ch.push("meno");
    if (ODRUHY[odr][1] === "parte" && u.zena == null) ch.push("Muž alebo Žena");
  } else if (!n.trim()) ch.push("nadpis");
  if (dr === 1) { if (!dat) ch.push("dátum"); if (!CAS_OK(cas)) ch.push("čas"); }
  if (dr === 0 && viacMiest && !ozIne && kde && !kde.length) ch.push("kde platí");
  if (((dr === 1 && kdeV === INE_MIESTO) || (dr === 0 && ozIne)) && !miesto.trim()) ch.push("miesto");
  // OPRAVY 212: pri vlastnom oznámení (parte, svadba, jubileum, iné) je prvá fotka z galérie titulná
  const fotkyG = media.filter((m) => m.typ === "foto");
  if (dr === 2 && osp === 1 && !fotkyG.length) ch.push(ine ? "plagát alebo fotka" : "plagát");
  if (dr === 1 && usp === 1 && !plagat) ch.push("plagát");
  const chybaSab = sablona && !ch.length ? chybaOznamu(u) : null;
  const limitN = pozv === 2 ? parseInt(limit, 10) || undefined : undefined;
  const pozvanieO = dr !== 2 && pozv > 0 ? { zavazne: pozv === 2, limit: limitN } : undefined;

  // ---- náhľad ----
  const chip = dr === 1 ? "UDALOSŤ" : dr === 2 ? ODRUHY[odr][2] : "OZNAM";
  const nadpisN = n.trim() || (sablona ? u.meno.trim() || "Meno" : dr === 1 ? "Nadpis udalosti" : dr === 2 ? "Nadpis oznámenia" : "Nadpis oznamu");
  const kedyT = dr === 1 ? [fmtDatum(dat), CAS_OK(cas) ? pekny(cas) : "", miesto.trim()].filter(Boolean).join(" · ") : sablona ? popisOznamu(u).split(" · ").slice(1).join(" · ") : "";
  const jePlagat = (dr === 1 && usp === 1) || (dr === 2 && osp === 1);
  const obrazok = dr === 2 && jePlagat ? fotkyG[0]?.src : jePlagat ? plagat : dr === 1 || dr === 0 ? fotkyG[0]?.src : undefined; // prvá fotka z galérie
  const pozvT = (p?: { zavazne: boolean; limit?: number }) => (p ? (p.zavazne ? `Prihlásiť sa${p.limit ? ` · 0 z ${p.limit}` : ""}` : "Zúčastním sa") : undefined);
  const kartaNahladu = (o: { chip: string; nadpis: string; obraz: ReactNode; text: string; kedy: string; pozvT?: string }) => (
    <section aria-label="Náhľad oznamu" style={{ ...karta, overflow: "hidden", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <span style={{ width: 38, height: 38, flex: "none", borderRadius: "50%", background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gInk)" }}>{iniciy(meno)}</span>
        <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{meno}</b><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>na profile · pre sledujúcich</span></span>
        <span style={{ flex: "none", padding: "4px 10px", borderRadius: 9, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 12, fontWeight: 800, color: "var(--gInk)" }}>{o.chip}</span>
      </div>
      {o.obraz}
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <b style={{ fontSize: 16.5, lineHeight: 1.3 }}>{o.nadpis}</b>
        {o.text && <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)", whiteSpace: "pre-line", display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.text}</div>}
        {o.kedy && <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink2)" }}>{o.kedy}</span>}
        {o.pozvT && <span style={{ alignSelf: "flex-start", marginTop: 6, minHeight: 44, padding: "0 18px", borderRadius: 13, background: "#4B7A35", color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center" }}>{o.pozvT}</span>}
      </div>
    </section>);
  const nahladPisania = kartaNahladu({ chip, nadpis: nadpisN, text: dr !== 2 || ine ? cistyText(txt) : "", kedy: kedyT, pozvT: pozvT(pozvanieO),
    obraz: sablona && u.meno.trim() && (u.zena != null || u.druh !== "parte")
      ? <div style={{ display: "flex", justifyContent: "center", padding: 12, background: "var(--field)" }}><Plagat u={u} volba={volba} vz={vz} sirka={280} qr={qrFar} qrText="Naša farnosť" /></div>
      : (dr !== 0 || !!obrazok) && (obrazok && jePlagat ? <ObrazokPlagatu src={obrazok} /> : <ObrazokOznamu src={obrazok} inic={iniciy(meno)} />) });

  // ---- zverejniť / uložiť zmeny ----
  const zoznam = vlastnePrispevky(strankaId);
  const odruh = ODRUHY[odr]?.[1];
  const blokUpoz = dr === 0 ? "oz" as const : dr === 1 ? "pr" as const : odruh === "parte" ? "sp" as const : "te" as const;
  const upoz = upozV ?? predvUpoz(edit ? "upravy" : dr === 1 ? "udalost" : dr === 2 && odruh === "parte" ? "parte" : "oznam");
  // ---- OPRAVY 271: rozpísaný oznam / udalosť / oznámenie ostane na zariadení, kým sa nezverejní alebo nezahodí ----
  const KON = `oznam.${strankaId}`;
  type KonOz = { dr: Druh; n: string; txt: string; plati: number; usp: 0 | 1; dat: string; cas: string; miesto: string; media: MediumZbierky[]; plagat?: string; pozv: number; limit: string; odr: number; osp: 0 | 1; u: UdajeOznamu; volba: VolbaSablony; kde: string[] | null; ozIne?: boolean; kdeU: string };
  const [konRozh, setKonRozh] = useState(false); // „Máte rozpísané“ už rozhodnuté (Pokračovať / Zahodiť)
  const kon = formOn && !edit && !hotovo && !konRozh ? nacitajKoncept<KonOz>(KON) : null;
  const maObsah = !!(n.trim() || cistyText(txt).trim() || media.length || dat || cas || miesto.trim() || plagat || u.meno.trim());
  useUkladajKoncept<KonOz>(KON, { dr, n, txt, plati, usp, dat, cas, miesto, media, plagat, pozv, limit, odr, osp, u, volba, kde, kdeU, ozIne }, formOn && !edit && !hotovo && !kon && maObsah && !jub);
  const pokracuj = (k: KonOz) => {
    setDr(k.dr); setN(k.n); setTxt(k.txt); setTxtKey((x) => x + 1); setPlati(k.plati); setUsp(k.usp); setDat(k.dat); setCas(k.cas); setMiesto(k.miesto); setMedia(k.media ?? []); setPlagat(k.plagat);
    setPozv(k.pozv); setLimit(k.limit); setOdr(k.odr); setOsp(k.osp); setU(k.u); setVolba(k.volba); setKde(k.kde); setKdeU(k.kdeU); setOzIne(!!k.ozIne); setVyb(true); setKonRozh(true);
  };
  const zahod = () => { zmazKoncept(KON); if (jub) setJubKon(null); vycisti(); setVyb(false); setKonRozh(true); };
  const zverejni = async () => {
    if (ch.length || chybaSab || uklada) return;
    const povodny = edit ? zoznam.find((x) => x.id === edit) : undefined;
    const teraz = terazMs(), id = povodny?.id ?? `naboz-${teraz}`;
    const oz: NastavenieOznamu = { dr, n: n.trim(), txt, plati, usp, dat, cas, miesto, pozv: dr !== 2 ? pozv : 0, limit: pozv === 2 ? limit : "", odr, osp, u: sablona ? u : undefined, volba: sablona ? volba : undefined, kal: povodny?.oz?.kal,
      mi: dr === 0 && viacMiest && !ozIne && kde && kde.length < miestaF.length ? kde : dr === 1 && viacMiest && kdeK ? [kdeK] : undefined, kk: dr === 1 && kdeK ? kdeK : undefined,
      kdeV: dr === 1 && !kdeK ? kdeV as "*" | "~" : dr === 0 && ozIne ? "~" : undefined, upoz };
    const zaklad = { id, comp: "data" as const, typ: "skutok" as const, modul: "charity" as const, kat: "Komunita" as const, skore: 6, typSituacie: "normal" as const, dni: 0, podpora: 0, farnostId: strankaId, cirkev: "", komunita: meno, overena: true, vytvorene: povodny?.vytvorene ?? teraz, af: povodny ? povodny.af : autorJa };
    let it: VieraFeedItem;
    let kalendar = false;
    if (dr === 0) {
      it = { ...zaklad, ntyp: "oznam", tag: "Oznam", nazov: n.trim(), popis: cistyText(txt), platnostDni: PLATI[plati][1], pozvanie: pozvanieO, rsvp: !!pozvanieO || undefined, oz,
        fotky: fotkyG.length ? fotkyG.map((m) => m.src) : undefined, popisy: fotkyG.some((m) => m.popis) ? fotkyG.map((m) => m.popis ?? "") : undefined };
    } else if (dr === 1) {
      const kal = oz.kal ?? `u${teraz}`;
      oz.kal = kal;
      it = { ...zaklad, ntyp: "udalost", tag: "Udalosť", nazov: n.trim(), popis: cistyText(txt), datum: dat /* OPRAVY 207: dátum · čas · miesto nie do textu, je v riadku nad nadpisom */, rsvp: !!pozvanieO || undefined, pozvanie: pozvanieO, plagat: usp === 1 || undefined,
        udalost: { cas: pekny(cas), miesto: miesto.trim() || undefined, text: cistyText(txt) || undefined, zavazne: pozv === 2 || undefined },
        fotky: usp === 1 ? (plagat ? [plagat] : undefined) : fotkyG.map((m) => m.src), popisy: usp !== 1 && fotkyG.some((m) => m.popis) ? fotkyG.map((m) => m.popis ?? "") : undefined,
        /* OPRAVY 270: video z galérie udalosti sa uloží (na stránke prvé v prehliadači) */ video: usp !== 1 ? media.find((m) => m.typ === "video")?.src : undefined, oz };
      // kalendár: pri úprave sa starý záznam presunie (ten istý id)
      const bez = (k: KalKostol): KalKostol => ({ ...k, extra: Object.fromEntries(Object.entries(k.extra).map(([d, l]) => [d, l.filter((x) => x.id !== kal)]).filter(([, l]) => l.length)) });
      const stary = povodny?.oz?.kk ?? "0";
      if (povodny && stary !== kdeId) zmenKostol(strankaId, stary, bez); // udalosť sa presunula do iného kostola
      zmenKostol(strankaId, kdeId, (k0) => {
        const k = bez(k0);
        return { ...k, extra: { ...k.extra, [dat]: [...(k.extra[dat] ?? []), { id: kal, typ: "udalost", t: pekny(cas), m: n.trim() }] } };
      });
      kalendar = true;
    } else {
      const d = ODRUHY[odr][1], vl = true; // OPRAVY 272: zo Správy už len Vlastný plagát, šablóny sú v Editore oznámení
      const plagat = vl ? fotkyG[0]?.src : undefined;
      it = { ...zaklad, ntyp: "oznam", tag: ine ? "Oznámenie" : d === "ine" ? "Jubileum" : "Oznam", ukat: ine ? undefined : d === "parte" ? "pohreb" : d === "svadba" ? "svadba" : undefined,
        nazov: vl ? n.trim() : `${ODRUHY[odr][0]} · ${u.meno.trim()}`, popis: ine ? cistyText(txt) : vl ? n.trim() : popisOznamu(u), datum: vl ? undefined : u.kedyD || undefined,
        fotky: vl ? (fotkyG.length ? fotkyG.map((m) => m.src) : undefined) : u.foto ? [u.foto] : undefined, plagat: vl || undefined, popisy: vl && fotkyG.some((m) => m.popis) ? fotkyG.map((m) => m.popis ?? "") : undefined,
        reakciaTyp: ine ? undefined : d === "parte" ? "kondolencia" : d === "svadba" ? "blahozelanie" : undefined,
        smutocny: !ine && d === "parte" ? { mode: vl ? "image" : "template", imageUrl: vl ? plagat : undefined, meno: vl ? n.trim() : u.meno.trim(), rodena: !vl && u.zena && u.rod.trim() ? u.rod.trim() : undefined,
          datumNar: vl ? "" : u.nar, datumUmr: vl ? "" : u.umr, rozluckaMiesto: vl ? "" : u.kde.trim(), rozluckaDatum: vl ? "" : u.kedyD, rozluckaCas: vl ? "" : u.kedyC, foto: vl ? undefined : u.foto,
          text: vl ? undefined : u.text.trim() || undefined, sablona: vl ? undefined : { u, volba, vz } } : undefined,
        platnostDni: 7, oz };
    }
    // KARTA 57 C.3: oznam ostane na mieste (to isté id aj čas vzniku); polia, ktoré nový tvar nemá, sa vymažú
    const prazdne: Partial<VieraFeedItem> = { udalost: undefined, datum: undefined, fotky: undefined, video: undefined, plagat: undefined, ukat: undefined, smutocny: undefined, reakciaTyp: undefined, pozvanie: undefined, rsvp: undefined };
    // OPRAVY 273: zelená hláška až keď je naozaj uložené; pri chybe červená na tom istom mieste, rozpísané ostáva
    if (!(await ulozIsto(povodny ? { ...povodny, ...prazdne, ...it } : it, !!povodny))) return;
    setPosledne(it.id);
    zmazKoncept(KON);
    if (povodny) { setHotovo(`Zmeny sú uložené ✓${kalendar ? " · kalendár je upravený" : ""}`); setEdit(null); }
    else setHotovo(`${dr === 2 ? "Oznámenie je zverejnené ✓" : dr === 1 ? "Udalosť je zverejnená ✓" : "Oznam je zverejnený ✓"}${kalendar ? " · zapísané aj do kalendára" : ""}`);
    obnov((x) => x + 1);
  };

  // ---- BLOK C 235: jubileum z Editora (Blahoželanie) — zverejní sa po „Áno, uložiť“ v editore ----
  const edRef = useRef<EditorApi>(null);
  const naEditor = async (p: PayloadEditora) => {
    zapisZPayloadu(p, { kto: "farar", stranka_typ: "farnost", stranka: strankaId, pri_zbierke: false });
    if (p.stav === "koncept" && !edit) setJubKon(p);
    if (p.stav !== "hotovo") return;
    const P = p.polia ?? {}, str = (k: string) => String(P[k] ?? "").trim();
    const obr = (await edRef.current?.nahlad(p.typ === "parte" ? undefined : { verejny: true })) || ""; // OPRAVY 275: na stránku verejný hárok (bez času a miesta hostiny)
    const povodny = edit ? zoznam.find((x) => x.id === edit) : undefined;
    const teraz = terazMs(), id = povodny?.id ?? `naboz-${teraz}`;
    // OPRAVY 273: návrh editora sa ukladá raz — pri parte v smutocny.editor (Spomíname), inak v oz.ed · KARTA 63: upoz aj z Editora (Samuel)
    const oz: NastavenieOznamu = { dr: 2, n: "", txt: "", plati: 0, usp: 0, dat: "", cas: "", miesto: "", pozv: 0, limit: "", odr, osp: 0, ed: p.typ === "parte" ? undefined : p, upoz };
    const zaklad = { id, comp: "data" as const, typ: "skutok" as const, modul: "charity" as const, kat: "Komunita" as const, skore: 6, typSituacie: "normal" as const, dni: 0, podpora: 0, farnostId: strankaId, cirkev: "", komunita: meno, overena: true,
      vytvorene: povodny?.vytvorene ?? teraz, af: povodny ? povodny.af : autorJa, ntyp: "oznam" as const, fotky: obr ? [obr] : undefined, plagat: obr ? true : undefined, platnostDni: 7, oz };
    let it: VieraFeedItem;
    if (p.typ === "parte") {
      // ako parte z Pohrebnej zbierky (ZbierkaPreVeriacich): štruktúrované polia + návrh editora
      const m = str("meno") || "Parte", kk = [str("rd"), str("rc"), str("rm")].filter(Boolean).join(" · ");
      it = { ...zaklad, tag: "Oznam", nazov: `Parte · ${m}`, popis: [m, kk ? `rozlúčka ${kk}` : "termín rozlúčky oznámime"].join(" · "), datum: str("rd") || undefined, ukat: "pohreb", reakciaTyp: "kondolencia",
        smutocny: { mode: "template", imageUrl: obr || undefined, meno: m, rodena: str("rod") || undefined, datumNar: str("nar"), datumUmr: str("umr"), rozluckaMiesto: str("rm"), rozluckaDatum: str("rd"), rozluckaCas: str("rc"), foto: p.foto ?? undefined, editor: p } };
    } else if (p.typ === "svadba") {
      const m = [str("sNev"), str("sZen")].filter(Boolean).join(" a ");
      it = { ...zaklad, tag: "Oznam", nazov: `Svadba · ${m || "snúbenci"}`, popis: [m, [str("sD"), str("sC"), str("sM")].filter(Boolean).join(" · ")].filter(Boolean).join(" · "), datum: str("sD") || undefined, ukat: "svadba", reakciaTyp: "blahozelanie" };
    } else {
      const menoB = str("bMeno") || str("jMeno");
      it = { ...zaklad, tag: odr === INE ? "Oznámenie" : "Jubileum", nazov: `Blahoželanie · ${menoB || "jubilant"}`, popis: menoB, reakciaTyp: "blahozelanie" };
    }
    const prazdne: Partial<VieraFeedItem> = { udalost: undefined, datum: undefined, fotky: undefined, video: undefined, plagat: undefined, ukat: undefined, smutocny: undefined, reakciaTyp: undefined, pozvanie: undefined, rsvp: undefined };
    if (!(await ulozIsto(povodny ? { ...povodny, ...prazdne, ...it } : it, !!povodny))) { setJubOtv(false); return; }
    setPosledne(it.id);
    setJubKon(null); setJubOtv(false); zmazKoncept(KON);
    if (povodny) { setHotovo("Zmeny sú uložené ✓"); setEdit(null); } else setHotovo("Oznámenie je zverejnené ✓");
    obnov((x) => x + 1);
  };

  // ---- KARTA 57 C.3: Upraviť zverejnené — formulár sa naplní z `oz` (staršie oznamy bez `oz` sa odvodia) ----
  const upravit = (x: VieraFeedItem) => {
    const st = stitokOznamu(x);
    const o: NastavenieOznamu = x.oz ?? {
      dr: x.ntyp === "udalost" ? 1 : st === "OZNAM" || st === "ZMENA OMŠE" ? 0 : 2, n: x.nazov ?? "", txt: x.ntyp === "udalost" ? x.udalost?.text ?? "" : x.popis ?? "",
      plati: Math.max(0, PLATI.findIndex(([, d]) => d === (x.platnostDni ?? 36500))), usp: x.plagat ? 1 : 0, dat: x.datum ?? "", cas: x.udalost?.cas ?? "", miesto: x.udalost?.miesto ?? "",
      pozv: x.pozvanie ? (x.pozvanie.zavazne ? 2 : 1) : x.rsvp ? (x.udalost?.zavazne ? 2 : 1) : 0, limit: x.pozvanie?.limit ? String(x.pozvanie.limit) : "",
      odr: st === "SVADBA" ? 1 : st === "JUBILEUM" ? 2 : st === "PARTE" ? 0 : INE, osp: x.plagat ? 1 : 0, u: x.smutocny?.sablona?.u, volba: x.smutocny?.sablona?.volba };
    setDr(o.dr); setN(o.n); setTxt(/<[a-z]/i.test(o.txt) ? o.txt : o.txt.split("\n").map((r) => `<p>${r.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("")); setTxtKey((k) => k + 1);
    setPlati(o.plati); setUsp(o.usp); setDat(o.dat); setCas(o.cas); setMiesto(o.miesto); setPozv(o.pozv); setLimit(o.limit); setOdr(o.odr); setOsp(o.osp); setKde(o.dr === 0 ? o.mi ?? null : null); setKdeU(o.kdeV ?? o.kk ?? "0"); setOzIne(o.dr === 0 && o.kdeV === "~"); setUpozV(null);
    const d = ODRUHY[o.odr]?.[1] ?? "parte";
    setU(o.u ?? prazdneUdaje(d)); setVolba(o.volba ?? prvaVolba(d));
    const f = x.fotky ?? [];
    setPlagat(x.plagat && o.dr === 1 ? f[0] : undefined);
    setMedia((!x.plagat && o.dr !== 2) || (x.plagat && o.dr === 2) ? [...(o.dr === 1 && x.video ? [{ id: terazMs() - 1, typ: "video" as const, src: x.video }] : []), ...f.map((src, i) => ({ id: terazMs() + i, typ: "foto" as const, src, ...(x.popisy?.[i] ? { popis: x.popisy[i] } : {}) }))] : []);
    setEdit(x.id); setHotovo(null); setVyb(true); setFormOn(true); setOtv(null); setPozri(null);
    if (o.dr === 2 && o.osp === 0) setJubOtv(true); // OPRAVY 271 · 272: oznámenie z Editora sa upravuje rovno v ňom
    window.setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };
  const upravovany = edit ? zoznam.find((x) => x.id === edit) : undefined;
  const upravovanyEd = upravovany?.oz?.ed ?? (upravovany?.oz ? upravovany.smutocny?.editor : undefined) // OPRAVY 273: parte má návrh v smutocny.editor
    ?? (upravovany && !upravovany.plagat ? navrhZoStarych(upravovany) : undefined); // OPRAVY 284 (4): starý formulár → údaje do Editora
  const ED_TYP: TypEditora[] = ["parte", "svadba", "blahozelanie", "blahozelanie"];
  const edTyp = ED_TYP[odr] ?? "blahozelanie";
  const jubCfg = { typ: edTyp, sektor: "viera" as const, rezim: "plny" as const, podpis: edTyp === "blahozelanie" ? "Blahoželá farnosť" : undefined,
    qrObrazok: edTyp === "parte" ? qrFar : undefined, miesta: edTyp === "parte" ? ["v Dome smútku", "vo farskom kostole", "na miestnom cintoríne"] : undefined,
    kontext: { stranka: strankaId, farnost: true }, navrh: (edit ? upravovanyEd : jubKon?.typ === edTyp ? jubKon : null) ?? null };
  // OPRAVY 258 · 271: všetko, čo sa v Správe oznamov píše na telefóne (krátky oznam, udalosť, oznámenie) = rám na celú obrazovku, náhľad na ťuk
  const ramSprava = tel && formOn && (vyb || !!edit) && !hotovo;

  // ---- formulár ----
  const druhyEl = (
    <div role="radiogroup" aria-label="Čo chcete oznámiť" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {DRUHY.map(([t, s], i) => { const on = dr === i; return (
        <button key={t} type="button" role="radio" aria-checked={on} onClick={() => vyberDruh(i as Druh)} style={volbaKarta(on)}>
          <FajkaVolby on={on} /><span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 15.5, color: on ? "var(--gInk)" : "var(--ink)" }}>{t}</b><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
        </button>); })}
    </div>);
  const zmenitEl = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 14, background: "var(--gSoft)", border: "1.5px solid var(--green)" }}>
      {!edit && <button type="button" onClick={() => setVyb(false)} style={{ flex: "none", minHeight: 44, padding: "0 12px", borderRadius: 11, border: "none", background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, boxShadow: "none" }}>‹ Zmeniť</button>}
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--gInk)" }}>PÍŠETE</span><b style={{ fontSize: 15.5, color: "var(--gInk)" }}>{DRUHY[dr][0]}</b></span>
    </div>);
  const editEl = upravovany && (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: `1.5px solid ${ZLATA}` }}>
      <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink2)" }}>UPRAVUJETE ZVEREJNENÉ</span>
        <b style={{ fontSize: 15.5 }}>{upravovany.nazov}</b>
        <span style={{ fontSize: 13, color: "var(--ink2)" }}>Opravte, čo treba. Na stránke ostane na tom istom mieste.</span>
      </span>
      <button type="button" onClick={() => { vycisti(); setVyb(false); }} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>Zrušiť úpravu</button>
    </div>);
  const telNahlad = tel && (vyb || edit) && !hotovo && !jub && !ramSprava && (
    <div style={{ position: "sticky", top: 68, zIndex: 3, maxHeight: 330, overflowY: "auto", borderRadius: 22, boxShadow: "0 10px 24px rgba(30,28,20,.18)" }}>{nahladPisania}</div>);
  const potvrdenie = jub ? null : ch.length || chybaSab
      ? <div role="status" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--goldBg)", border: `1.5px solid ${ZLATA}`, fontSize: 14.5, fontWeight: 800 }}>{ch.length ? `Ešte chýba: ${ch.join(", ")}` : chybaSab}</div>
      : <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo key={edit ?? "novy"} label={edit ? "Podržte a uložte zmeny" : "Podržte a zverejnite"} trvanie={1500} onConfirm={zverejni} /></div>;
  const chybaEl = chybaUl && (
    <div role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--errBg, #F2E3DC)", border: "2px solid var(--cRed, #A34A2A)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5, color: "var(--cRed, #A34A2A)" }}>Neuložilo sa</b><span style={{ fontSize: 14, color: "var(--ink2)" }}>{chybaUl} Rozpísané ostáva.</span></span>
      <button type="button" disabled={uklada} onClick={() => opakuj.current?.()} style={{ minHeight: 48, padding: "0 18px", borderRadius: 12, border: "none", background: "var(--cRed, #A34A2A)", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>{uklada ? "Ukladá sa…" : "Skúsiť znova"}</button>
    </div>);
  const polia = <>
    {chybaEl}
    {dr === 1 && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Ako ho chcete ukázať</span><Segment label="Ako ho chcete ukázať" vol={[[0, "Text a fotky"], [1, "Vlastný plagát"]]} cur={usp} set={(v) => setUsp(v as 0 | 1)} />
      <span style={{ fontSize: 13, color: "var(--ink3)" }}>{usp === 1 ? "Plagát sa ukáže celý, nič sa neoreže. Hodí sa na pozvánku, oznámenie alebo plagát." : "Fotky sa ukážu na šírku (16 : 9). Pozvánku alebo plagát dajte radšej ako Vlastný plagát."}</span></div>}
    {dr === 2 && <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Druh oznámenia</span><Segment label="Druh oznámenia" vol={ODRUHY.map(([t], i) => [i, t] as [number, string])} cur={odr} set={zmenOdr} /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Ako ho chcete ukázať</span><Segment label="Ako ho chcete ukázať" vol={[[0, "Editor oznámení"], [1, "Vlastný plagát"]]} cur={osp} set={(v) => setOsp(v as 0 | 1)} />
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{osp === 0 ? "Všetky šablóny, motívy, vlastné texty a QR. Otvorí sa na celú obrazovku." : "Nahráte hotový plagát. QR na parte pridáte v Pohrebnej zbierke."}</span></div>
    </>}
    {dr === 2 && osp === 1 && <GaleriaEditor media={media} onMedia={setMedia} ph={mobil} bezVidea nadpis={ine ? "Plagát alebo fotky" : "Plagát a fotky"} dovetok=" Prvá je titulná na karte, ostatné sa ukážu po ťuknutí. Pod fotku môžete napísať popis." />}
    {!sablona && !jub && <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Nadpis</span>
      <input value={n} onChange={(e) => setN(e.target.value.slice(0, 80))} placeholder={dr === 1 ? "napr. Púť do Šaštína" : dr === 2 ? NADPIS_PH[odr] : "napr. V piatok nebude spovedanie"} style={pole} /></label>}
    {ine && osp === 1 && <TextOznamu key={`ine${txtKey}`} value={txt} onChange={setTxt} label="Krátky popis" popis="Nepovinné." />}
    {dr === 1 && <div style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 10 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ ...lbl, fontSize: 14 }}>Dátum</span><input type="date" value={dat} onChange={(e) => setDat(e.target.value)} aria-label="Dátum" style={pole} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ ...lbl, fontSize: 14 }}>Čas</span><CasPole value={cas} onCommit={setCas} onChyba={setCasZly} placeholder="napr. 15:00" label="Čas" style={pole} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ ...lbl, fontSize: 14 }}>Miesto{kdeV === INE_MIESTO ? " *" : ""}</span><input value={miesto} onChange={(e) => setMiesto(e.target.value.slice(0, 60))} placeholder={kdeV === INE_MIESTO ? "napr. refektár gymnázia" : "napr. pred kostolom"} aria-label="Miesto" style={pole} /></label>
      {casZly && <span role="alert" style={{ gridColumn: "1 / -1", fontSize: 12.5, fontWeight: 700, color: "var(--cRed)" }}>Takýto čas neexistuje. Píšte hodiny:minúty, napríklad 15:00.</span>}
    </div>}
    {dr === 1 && <VyberKostola miesta={miestaF} value={kdeV} onChange={setKdeU} style={pole} lblStyl={{ ...lbl, fontSize: 14 }} />}
    {dr === 1 && kdeV === INE_MIESTO && <span style={{ fontSize: 13, color: "var(--ink3)", marginTop: -6 }}>Miesto je povinné. Na stránke sa ukáže namiesto kostola.</span>}
    {dr === 0 && <><TextOznamu key={`t${txtKey}`} value={txt} onChange={setTxt} />
      <GaleriaEditor media={media} onMedia={setMedia} ph={mobil} bezVidea nadpis="Fotky · nepovinné" dovetok=" Prvá fotka je titulná, ostatné sa ukážu po ťuknutí." /></>}
    {dr === 1 && usp === 0 && <><TextOznamu key={`u${txtKey}`} value={txt} onChange={setTxt} />
      <GaleriaEditor media={media} onMedia={setMedia} ph={mobil} nadpis="Fotky a video · nepovinné" dovetok=" Prvá fotka je hlavná. Bez fotky sa ukážu iniciály farnosti." /></>}
    {dr === 1 && usp === 1 && <><PlagatPole src={plagat} onSrc={setPlagat} toast={toast} popis="ťuknite a vyberte obrázok, alebo ho sem pretiahnite · na výšku, JPG alebo PNG" />
      <TextOznamu key={`p${txtKey}`} value={txt} onChange={setTxt} label="Krátky popis" popis="Nepovinné. Napríklad čo si vziať so sebou." /></>}
    {jub && !ramSprava && <button type="button" onClick={() => setJubOtv(true)} style={{ minHeight: 56, border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 16.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>{jubKon?.typ === edTyp || edit ? "Pokračovať v Editore oznámení ›" : "Otvoriť Editor oznámení ›"}</button>}
    {dr === 0 && <div role="group" aria-label="Kde platí" style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Kde platí</span>
      {/* OPRAVY 287: Celá farnosť · kostoly · Iné miesto */}
      {(() => { const on = !ozIne && (!kde || !viacMiest); return <button type="button" role="checkbox" aria-checked={on} onClick={() => { setOzIne(false); setKde(null); }} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 50, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: "var(--card)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", textAlign: "left", boxShadow: "none" }}><span aria-hidden style={{ width: 24, height: 24, flex: "none", borderRadius: 7, background: on ? "#4B7A35" : "transparent", border: on ? "none" : "1.5px solid var(--cardBd)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{on ? "✓" : ""}</span>Celá farnosť</button>; })()}
      {viacMiest && miestaF.map((m) => { const on = !ozIne && !!kde && kde.includes(m.id); return (
        <button key={m.id} type="button" role="checkbox" aria-checked={on} onClick={() => { setOzIne(false); setKde((k) => { const l = k ?? []; const n2 = on ? l.filter((y) => y !== m.id) : [...l, m.id]; return n2.length === 0 || n2.length === miestaF.length ? null : n2; }); }}
          style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 50, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: "var(--card)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", textAlign: "left", boxShadow: "none" }}><span aria-hidden style={{ width: 24, height: 24, flex: "none", borderRadius: 7, background: on ? "#4B7A35" : "transparent", border: on ? "none" : "1.5px solid var(--cardBd)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{on ? "✓" : ""}</span>{m.nazov}</button>); })}
      {(() => { const on = ozIne; return <button type="button" role="checkbox" aria-checked={on} onClick={() => { setOzIne(true); setKde(null); }} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 50, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: "var(--card)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", textAlign: "left", boxShadow: "none" }}><span aria-hidden style={{ width: 24, height: 24, flex: "none", borderRadius: 7, background: on ? "#4B7A35" : "transparent", border: on ? "none" : "1.5px solid var(--cardBd)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{on ? "✓" : ""}</span>Iné miesto</button>; })()}
      {ozIne && <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ ...lbl, fontSize: 14 }}>Miesto *</span><input value={miesto} onChange={(e) => setMiesto(e.target.value.slice(0, 60))} placeholder="napr. refektár gymnázia" aria-label="Miesto" style={pole} /></label>}
      <span style={{ fontSize: 13, color: "var(--ink3)" }}>{ozIne ? "Na stránke sa ukáže miesto namiesto kostola." : viacMiest ? "Celá farnosť: ukáže sa všetkým. Kostol: aj na jeho podstránke." : "Celá farnosť: ukáže sa všetkým."}</span></div>}
    {dr === 0 && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Platí do</span>
      <Segment label="Platí do" vol={PLATI.map(([t], i) => [i, t] as [number, string])} cur={plati} set={setPlati} />
      <span style={{ fontSize: 13, color: "var(--ink3)" }}>Potom oznam sám zmizne. Zmazať ho môžete aj skôr.</span></div>}
    {dr !== 2 && <div role="radiogroup" aria-label="Pozvať ľudí" style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Pozvať ľudí</span>
      {POZVANIA.map(([t, s], i) => { const on = pozv === i; return (
        <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setPozv(i)} style={volbaKarta(on)}><FajkaVolby on={on} /><span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{t}</b><span style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{s}</span></span></button>); })}
      {pozv === 2 && <label style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 14, fontWeight: 800 }}>Koľko ľudí najviac</span>
        <input inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="bez limitu" aria-label="Koľko ľudí najviac" style={{ ...pole, width: 140, height: 46 }} /></label>}
    </div>}
    {/* KARTA 63: aj pri oznámení z Editora (parte, svadba, jubileum) */}
    {<UpozornitSledujucich strankaId={strankaId} blok={blokUpoz} miesta={dr === 0 && viacMiest && !ozIne && kde && kde.length < miestaF.length ? kde : dr === 1 && viacMiest && kdeK ? [kdeK] : undefined} value={upoz} onChange={setUpozV} />}
    {!edit && (jub ? !!jubKon : maObsah) && <ZahoditRozpisane onZahodit={zahod} />}
    {!ramSprava && potvrdenie}
  </>;
  const lavy = (
    <section style={{ ...karta, padding: mobil ? "14px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ flex: 1, fontSize: 17 }}>{edit ? "Úprava oznamu" : "Nový oznam"}</b>
        <button type="button" onClick={zavriForm} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" }}>Zavrieť</button>
      </div>
      {editEl}
      {hotovo ? <div role="status" style={{ padding: "14px 16px", borderRadius: 14, background: "var(--gSoft)", border: "2px solid var(--green)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16, color: "var(--gInk)" }}>{hotovo}</b><span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Nájdete ho nižšie v zozname. Zmazať ho môžete kedykoľvek.</span></span>
        <button type="button" onClick={novy} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Napísať ďalší</button>
        {tel && posledne && pozrietTl}
      </div> : <>
        {kon && <MateRozpisane cas={kon.cas} co={DRUHY[kon.d.dr]?.[0]} onPokracovat={() => pokracuj(kon.d)} onZahodit={() => { zmazKoncept(KON); setKonRozh(true); }} />}
        {tel && (vyb || edit) ? zmenitEl : <><b style={{ fontSize: 16 }}>Čo chcete oznámiť</b>{druhyEl}</>}
        {telNahlad}
        {(!tel || vyb || edit) && !ramSprava && polia}
      </>}
    </section>);

  // ---- KARTA 57 C.1: Správa oznamov a udalostí ----
  const meta = (x: VieraFeedItem) => x.tag === "Zmena omše" ? x.popis ?? ""
    : x.ntyp === "udalost" ? [fmtDatum(x.datum ?? ""), x.udalost ? [x.udalost.cas, x.udalost.miesto].filter(Boolean).join(" · ") : x.popis].filter(Boolean).join(" · ")
    : x.ntyp === "oznam" && !x.ukat && x.tag === "Oznam" ? ((x.platnostDni ?? 7) >= 36500 ? "bez konca" : `platí ${Math.round(x.platnostDni ?? 7)} dní · do ${new Date((x.vytvorene ?? 0) + (x.platnostDni ?? 7) * DEN_MS).toLocaleDateString("sk-SK")}`)
    : x.popis ?? "";
  const textRiadku = (x: VieraFeedItem) => x.ntyp === "udalost" ? x.udalost?.text ?? "" : x.tag === "Oznam" && !x.ukat ? x.popis ?? "" : x.tag === "Oznámenie" ? x.popis ?? "" : "";
  const nahladZverejneneho = (x: VieraFeedItem) => {
    const st = stitokOznamu(x), f = x.fotky?.[0], sab = x.smutocny?.sablona;
    const kratky = x.ntyp === "oznam" && !x.ukat && x.tag === "Oznam";
    return kartaNahladu({ chip: st, nadpis: x.nazov ?? "", text: kratky || x.tag === "Oznámenie" ? x.popis ?? "" : x.ntyp === "udalost" ? x.udalost?.text ?? "" : "", kedy: x.ntyp === "udalost" ? meta(x) : kratky ? "" : meta(x), pozvT: pozvT(x.pozvanie),
      obraz: sab ? <div style={{ display: "flex", justifyContent: "center", padding: 12, background: "var(--field)" }}><Plagat u={sab.u} volba={sab.volba} vz={sab.vz} sirka={280} qr={qrFar} qrText="Naša farnosť" /></div>
        : f && x.plagat ? <ObrazokPlagatu src={f} />
        : f || (st !== "OZNAM" && st !== "ZMENA OMŠE") ? <ObrazokOznamu src={f} inic={iniciy(meno)} /> : null });
  };
  const SKUPINY: [string, (x: VieraFeedItem) => boolean][] = [
    ["KRÁTKE OZNAMY", (x) => ["OZNAM", "ZMENA OMŠE"].includes(stitokOznamu(x))],
    ["UDALOSTI", (x) => stitokOznamu(x) === "UDALOSŤ"],
    ["OZNÁMENIA", (x) => !["OZNAM", "ZMENA OMŠE", "UDALOSŤ"].includes(stitokOznamu(x))],
  ];
  // OPRAVY 263: zmazanie jedného aj hromadne (kalendár udalosti sa vyčistí)
  const zmazOznam = (x: VieraFeedItem) => {
    zmazPrispevok(strankaId, x.id);
    if (x.oz?.kal) { const kal = x.oz.kal; zmenKostol(strankaId, x.oz.kk ?? "0", (k) => ({ ...k, extra: Object.fromEntries(Object.entries(k.extra).map(([d, l]) => [d, l.filter((y) => y.id !== kal)]).filter(([, l]) => l.length)) })); }
    if (edit === x.id) vycisti();
  };
  const hv = useHromadnyVyber();
  const riadok = (x: VieraFeedItem, i: number) => {
    const st = stitokOznamu(x), zm = st === "ZMENA OMŠE", o = otv === x.id && !hv.zap, tx = textRiadku(x), on = hv.vyb.has(x.id);
    const editor = !!x.smutocny?.editor && !x.oz; // parte z Pohrebnej zbierky (bez oz) sa upravuje v Pohrebe, tu len maže
    return (
      <div key={x.id} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
        <button type="button" onClick={() => { if (hv.zap) { hv.prepni(x.id); return; } setOtv(o ? null : x.id); setPozri(null); }} aria-expanded={hv.zap ? undefined : o} aria-pressed={hv.zap ? on : undefined} style={{ width: "100%", minHeight: 60, padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
          {hv.zap && <PolickoVyberu on={on} />}
          <span style={{ flex: "none", padding: "3px 9px", borderRadius: 8, background: zm ? "var(--goldBg)" : "var(--gSoft)", border: `1px solid ${zm ? ZLATA : "var(--gBd)"}`, fontSize: 11.5, fontWeight: 800, color: zm ? "var(--ink)" : "var(--gInk)", whiteSpace: "nowrap" }}>{st}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{x.nazov}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{meta(x)}</span></span>
          {!hv.zap && <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>{o ? "⌃" : "⌄"}</span>}
        </button>
        {o && <div style={{ padding: "0 0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {tx && <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", whiteSpace: "pre-line" }}>{tx}</span>}
          {x.pozvanie && <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>{x.pozvanie.zavazne ? `Prihlásení: 0${x.pozvanie.limit ? ` z ${x.pozvanie.limit}` : ""} · záväzne` : `Zúčastní sa: ${pocetLudi(0)} · nezáväzne`}</span>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!zm && !editor && <button type="button" onClick={() => upravit(x)} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>Upraviť</button>}
            <button type="button" onClick={() => setPozri(pozri === x.id ? null : x.id)} aria-expanded={pozri === x.id} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: pozri === x.id ? "var(--gSoft)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Ako to vidia ľudia ›</button>
            <PodrzZmaz onZmaz={() => { zmazOznam(x); setOtv(null); setPozri(null); obnov((y) => y + 1); toast(`„${x.nazov ?? ""}“ je zmazané.`); }} />
          </div>
          {pozri === x.id && <div style={{ maxWidth: 460 }}>{nahladZverejneneho(x)}</div>}
        </div>}
      </div>);
  };
  const sprava = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><b style={{ fontSize: 18 }}>Správa oznamov a udalostí</b>{zoznam.length > 0 && <span style={{ flex: 1, fontSize: 13, color: "var(--ink3)" }}>{zoznam.length} zverejnené · ťuknite na riadok</span>}{zoznam.length > 1 && <TlacidloVyberu v={hv} />}</div>
      <ListaVyberu v={hv} polozky={zoznam.map((x) => ({ id: x.id, cas: x.vytvorene ?? 0 }))} />
      {zoznam.length ? SKUPINY.map(([nad, fn]) => { const l = zoznam.filter(fn); return l.length > 0 && (
        <div key={nad} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ flex: 1, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" }}>{nad} · {l.length}</span><OznacitSkupinu v={hv} ids={l.map((x) => x.id)} /></div>
          <section style={{ ...karta, padding: mobil ? "4px 14px" : "6px 20px" }}>{l.map(riadok)}</section>
        </div>); })
        : <section style={{ ...karta, padding: "14px 20px", fontSize: 14.5, color: "var(--ink3)" }}>Zatiaľ nič. Ťuknite na + Pridať oznam.</section>}
      <PasVyberu v={hv} dolu={mobil ? 104 : 12} pocet={(n) => (n === 1 ? "1 položka" : n < 5 ? `${n} položky` : `${n} položiek`)}
        onZmaz={(ids) => { zoznam.filter((x) => ids.includes(x.id)).forEach(zmazOznam); setOtv(null); setPozri(null); obnov((y) => y + 1); return `${ids.length === 1 ? "1 položka je zmazaná" : ids.length < 5 ? `${ids.length} položky sú zmazané` : `${ids.length} položiek je zmazaných`} ✓`; }} />
    </div>);

  const pravy: ReactNode = <>
    <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>NÁHĽAD · TAKTO TO UVIDIA ĽUDIA</span>
    {/* OPRAVY 274: kým nie je nič zverejnené, tlačidlo nie je; po zverejnení otvorí stránku pri tomto ozname */}
    {hotovo && posledne && pozrietTl}
    {hotovo && posledne && zoznam.some((x) => x.id === posledne) ? nahladZverejneneho(zoznam.find((x) => x.id === posledne)!) /* OPRAVY 275: po zverejnení skutočný hárok */
      : jub && !hotovo ? <section style={{ ...karta, padding: "14px 18px", fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Náhľad je priamo v Editore oznámení. Parte sa ukáže v bloku Spomíname, svadba a blahoželanie v bloku Teš sa s nami.</section> : nahladPisania}
  </>;
  const pridatTl = (
    <button type="button" onClick={() => { setFormOn(true); setHotovo(null); }} style={{ flex: "none", minHeight: 56, border: "none", borderRadius: 16, background: "#4B7A35", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", boxShadow: "none" }}><span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>+</span>Pridať oznam</button>);
  return <>
    <PrihovorKarta strankaId={strankaId} mobil={mobil} />
    <OnlineOmseKarta strankaId={strankaId} mobil={mobil} />
    <div ref={topRef} style={{ scrollMarginTop: 72 }} />
    {formOn ? (tel ? lavy : (
      <div style={{ flex: "none", display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{lavy}</div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 12 }}>{pravy}</div>
      </div>)) : pridatTl}
    {sprava}
    <NastavenieUpozorneni strankaId={strankaId} />
    {ramSprava && <RamPisania nazov={`${edit ? "Úprava · " : ""}${dr === 2 ? ODRUHY[odr][0] : dr === 1 ? "Udalosť" : "Krátky oznam"}`} teloRef={ramTelo} onSpat={() => { if (edit) vycisti(); setVyb(false); }}
      onNahlad={jub ? undefined : () => setNahlOtv(true)} nahlad={nahlOtv && !jub} onZavriNahlad={() => setNahlOtv(false)} nahladObsah={nahladPisania}
      dole={jub ? <button type="button" onClick={() => setJubOtv(true)} style={{ minHeight: 54, border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 16.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>{jubKon?.typ === edTyp || edit ? "Pokračovať v Editore oznámení ›" : "Otvoriť Editor oznámení ›"}</button> : potvrdenie}>
      <div style={{ padding: "18px 16px 28px", display: "flex", flexDirection: "column", gap: 14 }}>{editEl}{polia}</div>
    </RamPisania>}
    {jub && jubOtv && <EditorOznameni key={`${edit ?? "novy"}-${edTyp}`} ref={edRef} title={ODRUHY[odr][0]} onSend={(p) => { void naEditor(p); }} onUdalost={(e) => zapisEditora({ udalost: e.akcia, typ: edTyp, papier: e.papier ?? null, kto: "farar", stranka_typ: "farnost", stranka: strankaId, pri_zbierke: false })}
      ram={{}} onZavri={() => setJubOtv(false)} cfg={jubCfg} />}
    {vpOn && <NahladNastenky strankaId={strankaId} meno={meno} profil={profil} mobil={mobil} doOznamu={posledne ?? undefined} onSpat={() => setVpOn(false)} />}
  </>;
}
