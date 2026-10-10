// ============================================================
// KARTA 56E §2, 2b · OPRAVY 161 — Zbierka s overovateľom (pohreb, svadba, iné) — Správa farnosti → Zbierky → + Pridať zbierku.
// Overovateľom je tu farnosť (neskôr aj matrika, úrad, reštaurácia… — princíp rovnaký, mení sa kto overuje a texty).
// Nezávisí od hlavnej zbierky: peniaze idú príjemcovi, podiel overovateľa (0 – 3 %, po 0,5 %, najviac 100 €) farnosti.
// Rozdelenie ide do nastavenie.rozdelenie → server ho pri zapečatení zapíše ako split (0065) a overí účet každého príjemcu.
// Kroky: 1 sken príjemcu (živý QR, 15 s) · 2 oznámenie (už je na stránke / nahrať vlastné / zo šablóny) ·
// 3 rozdelenie (podiel overovateľa + zvyšok rozhoduje príjemca: nechať si / podeliť sa) · 4 kód + zapečatiť · 5 hotovo.
// Nová zbierka začína vždy úplne prázdna. Prototyp „Sprava farnosti - prvy prichod" (pre-kodera-7-10-b).
// ============================================================
import { CasPole } from "@/components/CasPole";
import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DeedQr } from "@/components/deedqr";
import { QrNaParte, tlacParte, type QrParte } from "./QrNaParte";
import { zapisEditora, zapisZPayloadu } from "@/lib/editorStat";
import { EditorOznameni, type EditorApi, type PayloadEditora } from "@/components/EditorOznameni";
import { nacitajStav, ulozStav } from "@/features/viera/stav";
import { TESTOVACIA } from "@/lib/testovacia";
import { nacitajOverenie, overenieZPamate, useZmenyOverenia, poziadajOverenie, OVERENIE_CFG } from "@/lib/overenieUctu";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useVzhlad } from "@/lib/vzhladStranky";
import { pridajPrispevok, upravPrispevok, vlastnePrispevkyVsetky, type VieraFeedItem } from "@/features/viera/mock";
import { FormularOznamu, VyberSablony, chybaOznamu, popisOznamu, prazdneUdaje, prvaVolba, type DruhOznamu, type UdajeOznamu, type VolbaSablony } from "@/features/viera/Sablony";
import { hladajPrijemcov, type PrijemcaDeed } from "@/lib/prijemcoviDeed";
import { SADY_EUR, SADY_EURC } from "@/lib/sadyDarov";
import {
  spustiZbierku, prazdnaZbierka, PODIEL_MAX, PODIEL_KROK, PODIEL_STROP_EUR, PODELIT_MAX, PODELIT_MIN, PODELIT_KROK,
  type SpustenaZbierka, type ZbierkaFarnosti, type PodielZbierky } from "@/lib/novaZbierka";

type Druh = Exclude<ZbierkaFarnosti["druh"], "farnost">;
const DRUH_OZN: Record<Druh, DruhOznamu> = { pohreb: "parte", svadba: "svadba", ine: "ine" };
const PZT: Record<Druh, { t: string; nazov: string; chip: string; kto: string; komu: string; ozn: string; sabS: string; kedy: string; meno: string; po: string; pred: string; k1: string; k2: string; prijM: string; prijK: string; prijD: string; phMeno: string; phKde: string }> = {
  pohreb: { t: "Pohreb", nazov: "Pohrebná zbierka", chip: "POHREBNÁ ZBIERKA", kto: "Pozostalý", komu: "pozostalému", ozn: "parte", sabS: "fotka, meno, dátumy, pohreb, kto oznamuje", kedy: "ROZLÚČKA · KEDY (NEPOVINNÉ)", meno: "MENO A PRIEZVISKO ZOSNULÉHO", po: "pohrebe", pred: "Rozlúčka", k1: "Sken pozostalého", k2: "Parte", prijM: "Rodina", prijK: "rodina", prijD: "rodine", phMeno: "Meno a priezvisko zosnulého", phKde: "napr. kostol, dom smútku" },
  svadba: { t: "Svadba", nazov: "Svadobná zbierka", chip: "SVADOBNÁ ZBIERKA", kto: "Snúbenec", komu: "snúbencovi", ozn: "svadobné oznámenie", sabS: "fotka, mená, dátum a miesto sobáša", kedy: "SOBÁŠ · KEDY (NEPOVINNÉ)", meno: "MENÁ SNÚBENCOV", po: "svadbe", pred: "Svadba", k1: "Sken snúbenca", k2: "Oznámenie", prijM: "Snúbenci", prijK: "snúbenci", prijD: "snúbencom", phMeno: "Mená snúbencov", phKde: "napr. farský kostol" },
  ine: { t: "Iné", nazov: "Zbierka s overovateľom", chip: "ZBIERKA S OVEROVATEĽOM", kto: "Príjemca", komu: "príjemcovi", ozn: "oznámenie", sabS: "fotka, meno, o čo ide, dátum", kedy: "KEDY (NEPOVINNÉ)", meno: "MENO PRÍJEMCU", po: "udalosti", pred: "Zbierka", k1: "Sken príjemcu", k2: "Oznámenie", prijM: "Príjemca", prijK: "príjemca", prijD: "príjemcovi", phMeno: "Meno príjemcu", phKde: "miesto" } };
const QR_S = 15; // QR na sken platí 15 sekúnd a sám sa obnovuje
const pct = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("sk-SK")} %`;
const nahodny = () => Math.random().toString(36).slice(2, 10);
const teraz = () => Date.now();
const velke = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const pole: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const lab: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" };
const tlZ: CSSProperties = { height: 50, padding: "0 20px", border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff", boxShadow: "none" };
const tlO: CSSProperties = { height: 50, padding: "0 18px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" };
const volbaSt = (on: boolean): CSSProperties => ({ minHeight: 64, padding: "10px 14px", borderRadius: 14, border: `${on ? 2 : 1.5}px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12, color: "var(--ink)", boxShadow: "none" });
const Bodka = ({ on }: { on: boolean }) => <span aria-hidden="true" style={{ flex: "none", width: 20, height: 20, borderRadius: "50%", border: `2px solid ${on ? "var(--green)" : "var(--ink4, #A8A396)"}`, background: on ? "var(--green)" : "transparent", boxShadow: on ? "inset 0 0 0 3px var(--gSoft)" : "none" }} />;

/** KARTA 57 A.1: horné ‹ Späť v Správe — „spat" = krok späť vybavený, „zavriet" = zavrieť zbierku, „nic" = po zapečatení */
export type SpatZbierky = () => "spat" | "zavriet" | "nic";

/** KARTA 57 A.2: QR na celú obrazovku (biele pozadie, odpočet, × Zavrieť), obrazovka nezhasne (Wake Lock, ak ho prehliadač má) */
const velkostQr = () => Math.round(Math.min(window.innerWidth * 0.92, window.innerHeight * 0.68, 640));
function QrVelky({ data, zostava, onZavri }: { data: string; zostava: number; onZavri: () => void }) {
  const [velkost, setVelkost] = useState(velkostQr);
  useEffect(() => { const f = () => setVelkost(velkostQr()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  useEffect(() => {
    let zamok: { release: () => Promise<void> } | null = null, ziva = true;
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wl?.request("screen").then((z) => { if (ziva) zamok = z; else void z.release(); }).catch(() => undefined);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); };
    window.addEventListener("keydown", esc);
    return () => { ziva = false; window.removeEventListener("keydown", esc); void zamok?.release().catch(() => undefined); };
  }, [onZavri]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="QR na celú obrazovku" onClick={onZavri} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 24, cursor: "zoom-out" }}>
      <span style={{ display: "flex" }}><DeedQr key={data} data={data} size={velkost} variant="svetly" /></span>
      <span style={{ width: "min(92vw, 640px)", height: 10, borderRadius: 5, background: "#E4DFD5", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: "#4B7A35", transformOrigin: "0 50%", transform: `scaleX(${zostava / QR_S})`, transition: zostava === QR_S ? "none" : "transform 1s linear" }} /></span>
      <b style={{ fontSize: 18, color: "#1D211B", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>Naskenujte v appke DEED · ešte {zostava} s, potom nový kód</b>
      <button type="button" onClick={(e) => { e.stopPropagation(); onZavri(); }} autoFocus style={{ minHeight: 56, padding: "0 28px", border: "none", borderRadius: 16, background: "#1D211B", color: "#fff", fontFamily: "inherit", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>× Zavrieť</button>
    </div>, document.body);
}

export function ZbierkaSOverovatelom({ stranka, menoFarnosti, ucetFarnosti, mobil, pc = !mobil, toast, onZavri, onHotovo, spatRef, onSpatText, onOverit }: {
  stranka: string; menoFarnosti: string; ucetFarnosti: string; mobil: boolean; /** KARTA 57 A.3: PC = editor v stránke, mobil a tablet = na celú obrazovku */ pc?: boolean; toast: (m: string) => void;
  onZavri: () => void; onHotovo: (z: SpustenaZbierka, sprava: string) => void;
  /** KARTA 57 A.1: horné ‹ Späť Správy sa pýta zbierky */ spatRef?: { current: SpatZbierky | null };
  /** OPRAVY 198: otvorí overenie účtu farnosti */ onOverit?: () => void;
  /** OPRAVY 185: text horného Späť Správy („Späť na krok 2“, „Späť na výber parte“; prázdny = zavrie zbierku) */ onSpatText?: (t: string) => void;
}) {
  const [krok, setKrok] = useState(1);
  // OPRAVY 198: naostro sa bez overeného účtu namiesto zapečatenia ukáže karta Overiť účet (testovacia verzia pustí)
  useZmenyOverenia();
  useEffect(() => { void nacitajOverenie(stranka, ucetFarnosti); }, [stranka, ucetFarnosti]);
  const overenie = overenieZPamate(stranka, ucetFarnosti);
  const ucetOk = TESTOVACIA || overenie?.stav === "overeny";
  const [overOtv, setOverOtv] = useState(false);
  const [druh, setDruh] = useState<Druh>("pohreb");
  const T = PZT[druh];
  const farV = menoFarnosti.toLocaleUpperCase("sk-SK");
  const vz = useVzhlad(stranka, false);

  // ---- 1 · sken príjemcu: živý QR, odpočet 15 → 1 s, potom nový ----
  const [token, setToken] = useState(nahodny);
  const [zostava, setZostava] = useState(QR_S);
  useEffect(() => {
    if (krok !== 1) return;
    const t = window.setInterval(() => setZostava((s) => { if (s > 1) return s - 1; setToken(nahodny()); return QR_S; }), 1000);
    return () => window.clearInterval(t);
  }, [krok]);

  // ---- 2 · oznámenie: už je na stránke / vlastné / zo šablóny ----
  const [rezim, setRezim] = useState<"" | "je" | "vl" | "sab">("");
  const [u, setU] = useState<UdajeOznamu>(() => prazdneUdaje("parte"));
  const [volba, setVolba] = useState<VolbaSablony>(() => prvaVolba("parte"));
  const zmenDruh = (d: Druh) => { setDruh(d); setU(prazdneUdaje(DRUH_OZN[d])); setVolba(prvaVolba(DRUH_OZN[d])); setRezim(""); setSubor(null); setVybrany(null); };
  const [subor, setSubor] = useState<{ url: string; meno: string; pdf: boolean } | null>(null);
  const [qrParte, setQrParte] = useState<QrParte>({ qr: true, kde: "pod", papier: "A5" }); // KARTA 57 A.4
  const [nad, setNad] = useState(false);
  const suborRef = useRef<HTMLInputElement>(null);
  const nacitaj = (f?: File) => {
    if (!f) return;
    if (!/^image\//.test(f.type) && f.type !== "application/pdf") { toast("Nahrajte obrázok alebo PDF."); return; }
    const r = new FileReader(); r.onload = () => setSubor({ url: String(r.result ?? ""), meno: f.name, pdf: f.type === "application/pdf" }); r.readAsDataURL(f);
  };
  const pustit = (e: DragEvent) => { e.preventDefault(); setNad(false); nacitaj(e.dataTransfer.files?.[0]); };
  // oznámenia, ktoré už sú na stránke (farár vyberá ťukom, nič sa nepripojí samo)
  const [naStranke, setNaStranke] = useState<VieraFeedItem[]>(() => vlastnePrispevkyVsetky(stranka));
  const [vybrany, setVybrany] = useState<string | null>(null);
  const preDruh = (it: VieraFeedItem) => (druh === "pohreb" ? !!it.smutocny || it.ukat === "pohreb" : druh === "svadba" ? it.ukat === "svadba" : it.ntyp === "oznam");
  const existujuce = naStranke.filter(preDruh);
  const pridajSkusobne = () => { // len testovacia verzia
    [1, 2].forEach((n) => pridajPrispevok(stranka, {
      id: `naboz-test-${Date.now()}-${n}`, comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam", skore: 6, typSituacie: "normal", dni: 0, podpora: 0,
      farnostId: stranka, cirkev: "", komunita: "veriaci (test)", nazov: `Skúšobné ${T.ozn} ${n}`, tag: "Oznam", popis: "pridal veriaci · skúšobné", ukat: druh === "ine" ? undefined : druh, vytvorene: Date.now() - n * 3600000, platnostDni: 7 }));
    setNaStranke(vlastnePrispevkyVsetky(stranka));
  };
  const [prispevok, setPrispevok] = useState<string | null>(null); // ku ktorému oznámeniu sa zbierka pripojí
  const menoOzn = rezim === "je" ? existujuce.find((x) => x.id === prispevok)?.nazov ?? "" : u.meno.trim();
  const zverejni = () => {
    const ch = chybaOznamu(u);
    if (ch) { toast(ch); return; }
    if (rezim === "vl" && !subor) { toast(`Nahrajte ${T.ozn}.`); return; }
    const id = `naboz-${Date.now()}`;
    pridajPrispevok(stranka, {
      id, comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam", skore: 6, typSituacie: "normal", dni: 0, podpora: 0,
      farnostId: stranka, cirkev: "", komunita: menoFarnosti, overena: true, nazov: `${velke(T.ozn)} · ${u.meno.trim()}`, tag: "Oznam",
      popis: popisOznamu(u), datum: u.kedyD || undefined,
      fotky: rezim === "vl" ? (subor && !subor.pdf ? [subor.url] : undefined) : u.foto ? [u.foto] : undefined,
      ukat: druh === "ine" ? undefined : druh, reakciaTyp: druh === "pohreb" ? "kondolencia" : druh === "svadba" ? "blahozelanie" : undefined,
      smutocny: druh === "pohreb" ? {
        mode: rezim === "vl" ? "image" : "template", imageUrl: rezim === "vl" && subor && !subor.pdf ? subor.url : undefined,
        meno: u.meno.trim(), rodena: u.zena && u.rod.trim() ? u.rod.trim() : undefined, datumNar: u.nar, datumUmr: u.umr,
        rozluckaMiesto: u.kde.trim(), rozluckaDatum: u.kedyD, rozluckaCas: u.kedyC, foto: u.foto, text: u.text.trim() || undefined,
        sablona: rezim === "sab" ? { u, volba, vz } : undefined } : undefined,
      vytvorene: Date.now(), platnostDni: 7, linkedZbierka: true });
    if (rezim === "vl" && druh === "pohreb") zapisEditora({ udalost: "vlastne", typ: "parte", vlastne: true, qr: qrParte.qr, qr_miesto: qrParte.qr ? (qrParte.kde === "pod" ? "pod" : "rohy") : null, kto: "overovatel", stranka_typ: "farnost", stranka, pri_zbierke: true });
    setPrispevok(id); setKrok(3);
  };
  const pripojit = () => { if (!vybrany) return; setPrispevok(vybrany); setKrok(3); };

  // ---- KARTA 57 A.3: parte zo šablóny = Editor oznámení (rýchly režim, bez tlače pred zapečatením) ----
  const edRef = useRef<EditorApi>(null);
  const [edKon, setEdKon] = useState<PayloadEditora | null>(() => nacitajStav<PayloadEditora | null>("partekoncept", stranka, null)); // rozpísané sa nestratí
  const [edMob, setEdMob] = useState(false);
  const [ulozT, setUlozT] = useState("");
  // KARTA 57 F: štatistika editora — overovateľ farnosti pri zbierke rodiny
  const kdeStat = { kto: "overovatel" as const, stranka_typ: "farnost", stranka, pri_zbierke: true };
  const naEditor = async (p: PayloadEditora) => {
    if (p.stav === "koncept") { setEdKon(p); ulozStav("partekoncept", stranka, p); return; }
    zapisZPayloadu(p, kdeStat);
    if (p.stav !== "hotovo") return;
    const P = p.polia ?? {}, str = (k: string) => String(P[k] ?? "").trim();
    const meno = str("meno") || "Parte";
    const obr = (await edRef.current?.nahlad()) || "";
    const id = `naboz-${teraz()}`;
    const kk = [str("rd"), str("rc"), str("rm")].filter(Boolean).join(" · ");
    pridajPrispevok(stranka, {
      id, comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam", skore: 6, typSituacie: "normal", dni: 0, podpora: 0,
      farnostId: stranka, cirkev: "", komunita: menoFarnosti, overena: true, nazov: `Parte · ${meno}`, tag: "Oznam",
      popis: [meno, kk ? `rozlúčka ${kk}` : "termín rozlúčky oznámime"].join(" · "), datum: str("rd") || undefined,
      fotky: obr ? [obr] : undefined, plagat: true, ukat: "pohreb", reakciaTyp: "kondolencia",
      smutocny: { mode: "template", imageUrl: obr || undefined, meno, rodena: str("rod") || undefined, datumNar: str("nar"), datumUmr: str("umr"),
        rozluckaMiesto: str("rm"), rozluckaDatum: str("rd"), rozluckaCas: str("rc"), foto: p.foto ?? undefined, editor: p },
      vytvorene: teraz(), platnostDni: 7 });
    setEdKon(null); ulozStav("partekoncept", stranka, null); setEdMob(false);
    setNaStranke(vlastnePrispevkyVsetky(stranka)); setRezim("je"); setVybrany(id); setUlozT(`Parte ${meno} je uložené ✓`);
  };
  const editor = (styl: CSSProperties) => (
    <EditorOznameni ref={edRef} title="Editor parte" onSend={(p) => { void naEditor(p); }} onUdalost={(e) => zapisEditora({ udalost: e.akcia, typ: "parte", papier: e.papier ?? null, ...kdeStat })} style={styl}
      cfg={{ typ: "parte", rezim: "rychly", bezTlace: true, qrObrazok: "/editor/qr-deed.png", miesta: ["v Dome smútku", "vo farskom kostole", "na miestnom cintoríne"], kontext: { zbierka: "pohreb", stranka }, navrh: edKon }} />);
  const edSpat = () => { if (!edRef.current?.krokSpat()) setEdMob(false); };

  // ---- 3 · rozdelenie: krok 1 podiel overovateľa, krok 2 zvyšok rozhoduje príjemca ----
  const [podiel, setPodiel] = useState(PODIEL_MAX);
  const stopy = Array.from({ length: PODIEL_MAX / PODIEL_KROK + 1 }, (_, i) => i * PODIEL_KROK);
  const zvysok = Math.round((100 - podiel) * 10) / 10;
  const [podelit, setPodelit] = useState(false);
  const [spolu, setSpolu] = useState<{ id: string; nazov: string; popis: string; pct: number }[]>([]);
  const pridane = podelit ? spolu.reduce((a, x) => a + x.pct, 0) : 0;
  const prijemcovi = Math.round((zvysok - pridane) * 10) / 10;
  const [hladaj, setHladaj] = useState("");
  const [vysledky, setVysledky] = useState<PrijemcaDeed[]>([]);
  useEffect(() => {
    let ziva = true;
    const t = window.setTimeout(() => { void hladajPrijemcov(hladaj, [stranka, ...spolu.map((x) => x.id)]).then((r) => { if (ziva) setVysledky(r); }); }, 200);
    return () => { ziva = false; window.clearTimeout(t); };
  }, [hladaj, spolu, stranka]);
  const pridajSpolu = (p: PrijemcaDeed) => {
    if (spolu.length >= PODELIT_MAX || prijemcovi < PODELIT_MIN) return;
    setSpolu((l) => [...l, { ...p, pct: PODELIT_MIN }]); setHladaj("");
  };
  const zmenPct = (i: number, o: number) => setSpolu((l) => l.map((x, j) => (j !== i ? x : { ...x, pct: Math.max(PODELIT_MIN, Math.min(x.pct + o, x.pct + prijemcovi)) })));
  // KARTA 57C §5: Ako budú ľudia darovať — pevné sady (pod tlačidlo nikdy viac ako 50 €), nič vlastné; EURC bez Mikro.
  // Ukladá sa so zbierkou (sada / eurc / sadaE = index v SADY_EUR / SADY_EURC), po zapečatení sa sada dá zmeniť podržaním.
  const [sada, setSada] = useState(0);
  const [eurc, setEurc] = useState(false);
  const [sadaE, setSadaE] = useState(1);
  const rozdelenieT = [`${T.prijD} ${prijemcovi === 0 && podelit ? "0 % · všetko darované" : pct(prijemcovi)}`, ...(podelit ? spolu.map((x) => `${x.nazov} ${pct(x.pct)}`) : []), `farnosti ${pct(podiel)}`].join(" · ");

  // ---- 4 · kód, potvrdenie a zapečatenie ----
  const [znova, setZnova] = useState(false);
  useEffect(() => { if (!znova) return; const t = window.setTimeout(() => setZnova(false), 2000); return () => window.clearTimeout(t); }, [znova]);
  const [potvrdil, setPotvrdil] = useState(false);
  const [drz, setDrz] = useState(false);
  const drzTm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(drzTm.current), []);
  const [z, setZ] = useState<SpustenaZbierka | null>(null);
  const ja = usePouzivatel();
  const zapecat = async () => {
    const nazov = `${T.pred} · ${menoOzn || "—"}`;
    // účet príjemcu prinesie sken v jeho appke (PLACEBO — karta 56E); v testovacom režime je príjemcom prihlásený tester
    const ucetPrijemcu = TESTOVACIA ? ja.ucetId ?? undefined : undefined;
    const rozdelenie: PodielZbierky[] = [
      { druh: "prijemca", ucet: ucetPrijemcu ?? "", text: T.kto, podiel: prijemcovi / 100 },
      { druh: "overovatel", podiel: podiel / 100 },
      ...(podelit ? spolu.map((x): PodielZbierky => ({ druh: "podelene", stranka: x.id, text: x.nazov, podiel: x.pct / 100 })) : []),
    ];
    try {
      const nova = await spustiZbierku(stranka, {
        ...prazdnaZbierka(), rozdelenie, sada, eurc, sadaE, nazov, popis: `<p>${popisOznamu(u) || nazov}</p>`, media: u.foto ? [{ id: 1, typ: "foto", src: u.foto }] : [], cielTyp: "otv",
        farnost: {
          druh, podiel, prijemca: { meno: T.kto, overeny: new Date().toISOString(), ucet: ucetPrijemcu },
          oznamenie: { meno: menoOzn, rodena: u.rod || undefined, kedy: [u.kedyD, u.kedyC].filter(Boolean).join(" ") || undefined, kde: u.kde || undefined, kto: u.kto || undefined, vlastne: rezim === "vl" ? "ano" : undefined, prispevok: prispevok ?? undefined,
            qr: rezim === "vl" && druh === "pohreb" ? { zap: qrParte.qr, kde: qrParte.kde, papier: qrParte.papier } : undefined },
          podelit: podelit ? spolu.map((x) => ({ id: x.id, nazov: x.nazov, pct: x.pct })) : undefined } }, ucetFarnosti, "nabozenstvo");
      if (prispevok) upravPrispevok(stranka, prispevok, { linkedZbierka: true });
      setZ(nova); setKrok(5);
    } catch (e) { toast(e instanceof Error ? e.message : "Zbierku sa nepodarilo spustiť."); }
  };
  const zacni = () => { setDrz(true); window.clearTimeout(drzTm.current); drzTm.current = window.setTimeout(() => { setDrz(false); void zapecat(); }, 1500); };
  const pusti = () => { window.clearTimeout(drzTm.current); setDrz(false); };

  // ---- KARTA 57 A.1: späť = vždy o krok späť; po zapečatení späť nie je ----
  const [qrVelky, setQrVelky] = useState(false);
  const spatT = krok === 2 && rezim ? `Späť na výber ${druh === "pohreb" ? "parte" : "oznámenia"}` : krok > 1 && krok < 5 ? `Späť na krok ${krok - 1}` : "";
  const krokSpat = () => {
    if (edMob) { edSpat(); return; }
    if (krok === 2 && rezim) { setRezim(""); setVybrany(null); setUlozT(""); return; }
    if (krok === 4) setPotvrdil(false);
    if (krok > 1 && krok < 5) setKrok(krok - 1);
  };
  useEffect(() => {
    if (!spatRef) return;
    spatRef.current = () => (krok >= 5 ? "nic" : spatT ? (krokSpat(), "spat") : "zavriet");
    return () => { spatRef.current = null; };
  });
  useEffect(() => { onSpatText?.(krok >= 5 ? "" : spatT); }, [spatT, krok, onSpatText]);
  const kroky = [`1 · ${T.k1}`, `2 · ${T.k2}`, "3 · Rozdelenie", "4 · Kód", "5 · Hotovo"];
  const test = (t: string, onClick: () => void) => TESTOVACIA
    ? <button type="button" onClick={onClick} style={{ ...tlO, alignSelf: "flex-start", height: 44, borderStyle: "dashed" }}>{t}</button>
    : <span style={{ fontSize: 13, color: "var(--ink3)" }}>pripravujeme</span>; // PLACEBO — karta 56E: sken a kód v appke príjemcu
  const txt = (t: string, k: "meno" | "rod" | "kde", ph: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={lab}>{t}</span><input value={u[k]} onChange={(e) => setU((x) => ({ ...x, [k]: e.target.value }))} placeholder={ph} style={pole} /></label>);
  const dva = (a: ReactNode, b: ReactNode) => <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 10 }}>{a}{b}</div>;
  const spatZverejnit = <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <button type="button" onClick={() => setRezim("")} style={tlO}>{`‹ Späť na výber ${druh === "pohreb" ? "parte" : "oznámenia"}`}</button>
    <button type="button" onClick={zverejni} aria-disabled={!!chybaOznamu(u)} style={{ ...tlZ, opacity: chybaOznamu(u) ? 0.5 : 1 }}>Zverejniť {T.ozn} a pripojiť zbierku ›</button>
  </div>;
  // KARTA 57 A.5: čo sa tlačí na fare — vlastné parte (obrázok) alebo hotové parte z editora (obrázok z náhľadu)
  const [tlOk, setTlOk] = useState(false);
  const obrTlac = rezim === "vl" ? (subor && !subor.pdf ? subor.url : undefined) : prispevok ? naStranke.find((x) => x.id === prispevok)?.fotky?.[0] : undefined;
  // farebný pás = skutočné delenie (príjemca · pridaní · overovateľ)
  const pas = (
    <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", height: 44, fontSize: 13, fontWeight: 800 }}>
      {prijemcovi > 0 && <span style={{ flex: prijemcovi, minWidth: 0, background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", padding: "0 10px", whiteSpace: "nowrap", overflow: "hidden" }}>{T.prijM} · {pct(prijemcovi)}</span>}
      {podelit && spolu.map((x, i) => <span key={x.id} style={{ flex: x.pct, minWidth: 0, background: i ? "#7A9A5E" : "#5E8746", color: "#fff", display: "flex", alignItems: "center", padding: "0 8px", whiteSpace: "nowrap", overflow: "hidden" }}>{pct(x.pct)}</span>)}
      <span style={{ flex: Math.max(podiel, 0.001) * 4, minWidth: 0, background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", whiteSpace: "nowrap" }}>{podiel ? `Farnosť ${pct(podiel)}` : "0 %"}</span>
    </div>);

  return (
    <section aria-label={T.nazov} style={{ flex: "none", borderRadius: 22, background: "var(--card)", border: "2px solid var(--green)", padding: mobil ? "16px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ flex: 1, fontSize: 19 }}>{T.nazov} · farnosť overuje</b>
        <button type="button" onClick={onZavri} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontSize: 18, color: "var(--ink2)", boxShadow: "none" }}>×</button>
      </div>
      {spatT && <button type="button" onClick={krokSpat} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "var(--gSoft)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>‹ {spatT}</button>}
      <div role="list" aria-label="Kroky" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {kroky.map((t, i) => { const n = i + 1; return <span key={t} role="listitem" aria-current={n === krok ? "step" : undefined} style={{ height: 32, padding: "0 12px", borderRadius: 16, background: n === krok ? "#4B7A35" : n < krok ? "var(--gSoft)" : "var(--btn)", color: n === krok ? "#fff" : n < krok ? "var(--gInk)" : "var(--ink3)", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{t}</span>; })}
      </div>
      {krok <= 2 && <div role="radiogroup" aria-label="Druh zbierky" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(Object.keys(PZT) as Druh[]).map((k) => { const on = k === druh; return (
          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => zmenDruh(k)} style={{ height: 44, padding: "0 18px", borderRadius: 22, border: `${on ? 2 : 1}px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink)", boxShadow: "none" }}>{PZT[k].t}</button>); })}
      </div>}

      {krok === 1 && <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <button type="button" onClick={() => setQrVelky(true)} aria-label="Zväčšiť QR na celú obrazovku" style={{ width: 168, height: 168, borderRadius: 18, border: "none", background: "#fff", padding: 8, boxSizing: "border-box", display: "flex", cursor: "zoom-in", boxShadow: "none" }}><DeedQr key={token} data={`https://deed.sk/overit/${stranka}/${token}`} size={152} variant="svetly" /></button>
          <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Ťuknite na QR a zväčší sa</span>
        </span>
        {qrVelky && <QrVelky data={`https://deed.sk/overit/${stranka}/${token}`} zostava={zostava} onZavri={() => setQrVelky(false)} />}
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 17 }}>{T.kto} naskenuje QR v appke DEED</b>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Musí byť pri vás osobne. Skenuje v appke na mobile, tablete alebo počítači s kamerou. Rola <b>Overovateľ</b> je zapnutá pri QR farnosti. Kód platí 15 sekúnd a sám sa obnovuje.</span>
          <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: "100%", background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${zostava / QR_S})`, transition: zostava === QR_S ? "none" : "transform 1s linear" }} /></span>
          <span style={{ fontSize: 13, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>ešte {zostava} s · potom nový QR</span>
          {test("Simulovať sken (test)", () => setKrok(2))}
        </div>
      </div>}

      {krok === 2 && <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
          <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 }}>✓</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15, color: "var(--gInk)" }}>{T.kto} · pripojený</b><span style={{ fontSize: 13, color: "var(--ink2)" }}>overený účet · sken pred chvíľou na fare</span></span>
        </div>
        {rezim === "" && <>
          <b style={{ fontSize: 16 }}>Ku ktorému oznámeniu pripojiť zbierku?</b>
          <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: 10 }}>
            {([["je", `${velke(T.ozn)} už je na stránke farnosti`, `${T.kto.toLowerCase()} ho pridal sám · len k nemu pripojíte zbierku`], ["vl", `+ Nahrať vlastné ${T.ozn}`, "plagát od rodiny (obrázok alebo PDF)"], ["sab", `+ Vytvoriť ${T.ozn} zo šablóny`, T.sabS]] as ["je" | "vl" | "sab", string, string][]).map(([k, t, s]) => (
              <button key={k} type="button" onClick={() => { setRezim(k); setNaStranke(vlastnePrispevkyVsetky(stranka)); }} style={{ minHeight: 76, padding: "12px 16px", borderRadius: 16, border: `1.5px ${k === "je" ? "solid" : "dashed"} var(--gBd)`, background: "var(--field)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", flexDirection: "column", gap: 4, color: "var(--ink)", boxShadow: "none" }}>
                <b style={{ fontSize: 15.5, color: "var(--green)" }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span>
              </button>))}
          </div>
        </>}
        {rezim === "je" && <>
          {ulozT && <div role="status" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "2px solid var(--green)", display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ fontSize: 15.5, color: "var(--gInk)" }}>{ulozT}</b>
            <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Je prvé v zozname a už vybraté. Ťuknite dole na Pripojiť zbierku k tomuto parte.</span>
          </div>}
          <b style={{ fontSize: 16 }}>{velke(T.ozn)}, ktoré už je na stránke</b>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Na stránke môže byť naraz viac oznámení. Ťuknite na to, ku ktorému pripojíte zbierku. Nič sa nepripojí samo.</span>
          {existujuce.length ? <div role="radiogroup" aria-label="Oznámenia na stránke" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {existujuce.map((x) => { const on = vybrany === x.id; return (
              <button key={x.id} type="button" role="radio" aria-checked={on} onClick={() => setVybrany(x.id)} style={volbaSt(on)}>
                <Bodka on={on} /><span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><b style={{ fontSize: 15 }}>{x.nazov ?? "Oznámenie"}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{[x.komunita && `pridal ${x.komunita}`, x.vytvorene && new Date(x.vytvorene).toLocaleDateString("sk-SK")].filter(Boolean).join(" · ")}</span></span>
              </button>); })}
          </div> : <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 6 }}>
            <b style={{ fontSize: 15 }}>Na stránke farnosti zatiaľ nie je žiadne {T.ozn}</b>
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Keď ho {T.kto.toLowerCase()} pridá sám (v Oznamoch, ak to máte povolené), ukáže sa tu ako prvé. Inak ho nahrajte alebo vytvorte zo šablóny.</span>
            {TESTOVACIA && <button type="button" onClick={pridajSkusobne} style={{ ...tlO, alignSelf: "flex-start", height: 44, borderStyle: "dashed" }}>Test: pridať 2 skúšobné {T.ozn}</button>}
          </div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { setRezim(""); setVybrany(null); }} style={tlO}>{`‹ Späť na výber ${druh === "pohreb" ? "parte" : "oznámenia"}`}</button>
            <button type="button" onClick={pripojit} aria-disabled={!vybrany} style={{ ...tlZ, opacity: vybrany ? 1 : 0.5 }}>Pripojiť zbierku k tomuto {druh === "pohreb" ? "parte" : "oznámeniu"} ›</button>
          </div>
        </>}
        {rezim === "vl" && <>
          <b style={{ fontSize: 16 }}>Vlastné {T.ozn} od rodiny</b>
          <div role="button" tabIndex={0} onClick={() => suborRef.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); suborRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setNad(true); }} onDragLeave={() => setNad(false)} onDrop={pustit}
            style={{ minHeight: 96, padding: "12px 16px", borderRadius: 16, border: `1.5px dashed ${nad ? "var(--green)" : "var(--gBd)"}`, background: nad ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
            {subor && (subor.pdf
              ? <span style={{ flex: "none", width: 60, height: 76, borderRadius: 8, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#A34A2A" }}>PDF</span>
              : <span style={{ flex: "none", width: 60, height: 76, borderRadius: 8, background: `url('${subor.url}') center/contain no-repeat var(--card)`, border: "1px solid var(--cardBd)" }} />)}
            <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <b style={{ fontSize: 15.5, color: "var(--green)" }}>{subor ? "Nahraté ✓ · ťuknite a vymeňte" : `+ Nahrať ${T.ozn}`}</b>
              <span style={{ fontSize: 13, color: "var(--ink3)", overflowWrap: "anywhere" }}>{subor ? subor.meno : "ťuknite a vyberte súbor, alebo ho sem pretiahnite · obrázok alebo PDF"}</span>
            </span>
            <input ref={suborRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => { nacitaj(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          </div>
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Oznámenie ukážeme tak, ako je. Doplňte len to, podľa čoho ho ľudia nájdu a čo sa ukáže v kalendári farnosti.</span>
          {txt(T.meno, "meno", T.phMeno)}
          {druh === "pohreb" && <>
            <span style={lab}>ZOSNULÝ JE</span>
            <div role="radiogroup" aria-label="Zosnulý je" style={{ display: "flex", gap: 8 }}>
              {([["Muž", false], ["Žena", true]] as [string, boolean][]).map(([t, zz]) => { const on = u.zena === zz; return (
                <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setU((x) => ({ ...x, zena: zz, rod: zz ? x.rod : "" }))} style={{ flex: 1, height: 48, borderRadius: 12, border: `${on ? 2 : 1}px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink)", boxShadow: "none" }}>{t}</button>); })}
            </div>
            {u.zena === true && txt("RODENÁ (NEPOVINNÉ)", "rod", "rodné priezvisko")}
          </>}
          {dva(<label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lab}>{T.kedy}</span>
            <span style={{ display: "flex", gap: 8 }}><input type="date" value={u.kedyD} onChange={(e) => setU((x) => ({ ...x, kedyD: e.target.value }))} style={{ ...pole, flex: 1.4 }} aria-label="Dátum" /><CasPole value={u.kedyC} onCommit={(v) => setU((x) => ({ ...x, kedyC: v }))} placeholder="14:00" label="Čas" style={{ ...pole, flex: 1, minWidth: 0 }} /></span></label>,
            txt("KDE (NEPOVINNÉ)", "kde", T.phKde))}
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>Termín môžete doplniť neskôr, sledujúci dostanú upozornenie. V hlavičke bude farnosť.</span>
          {druh === "pohreb" && subor && !subor.pdf && <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 16, background: "var(--panel)", border: "1px solid var(--cardBd)" }}>
            <b style={{ fontSize: 16 }}>QR kód zbierky na parte</b>
            <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Vyberte, kam QR na tlači príde. Vytlačiť s QR pôjde po zapečatení, v kroku Hotovo.</span>
            <QrNaParte src={subor.url} onZmena={setQrParte} onSablona={() => setRezim("sab")} onIne={() => setSubor(null)} />
          </div>}
          {spatZverejnit}
        </>}
        {rezim === "sab" && druh === "pohreb" && <>
          <b style={{ fontSize: 16 }}>Nové parte zo šablóny farnosti</b>
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Rýchly režim: Muž alebo Žena, vzhľad, údaje. Texty sú už vo vzhľade. Keď termín rozlúčky ešte neviete, zaškrtnite „Údaje doplníme neskôr“, doplní ho rodina sama.</span>
          {pc ? editor({ height: 960, border: "1px solid var(--cardBd)", borderRadius: 18 })
            : <button type="button" onClick={() => setEdMob(true)} style={{ ...tlZ, height: 56, fontSize: 16 }}>{edKon ? "Pokračovať v tvorbe parte ›" : "Otvoriť tvorbu parte ›"}</button>}
          {edMob && createPortal(
            <div className="sc-tokeny" role="dialog" aria-modal="true" aria-label="Tvorba parte" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#EFEAE1", display: "flex", flexDirection: "column" }}>
              <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg)", borderBottom: "1px solid var(--cardBd)" }}>
                <button type="button" onClick={edSpat} style={{ flex: "none", height: 48, padding: "0 16px 0 12px", border: "none", borderRadius: 12, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff" }}>‹ Späť</button>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--gInk)" }}>KROK 2 · PARTE · rozpísané sa nestratí</span><b style={{ fontSize: 15, color: "var(--ink)" }}>Tvorba parte</b></span>
              </div>
              {editor({ flex: 1, minHeight: 0 })}
            </div>, document.body)}
        </>}
        {rezim === "sab" && druh !== "pohreb" && <>
          <b style={{ fontSize: 16 }}>Nové {T.ozn} zo šablóny farnosti</b>
          <FormularOznamu u={u} onU={setU} mobil={mobil} />
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>V hlavičke bude farnosť, ktorá za zbierku zodpovedá. Text sa dá upraviť aj po zverejnení.</span>
          <b style={{ fontSize: 15 }}>Vyberte vzhľad · 8 šablón</b>
          <VyberSablony u={u} volba={volba} onVolba={setVolba} vz={vz} mobil={mobil} />
          {spatZverejnit}
        </>}
      </>}

      {krok === 3 && <>
        <b style={{ fontSize: 17 }}>Rozdelenie zbierky</b>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Krok 1 · podiel overovateľa. Farnosť najviac {pct(PODIEL_MAX)}, po {pct(PODIEL_KROK)}, môže byť aj 0 %. <b>Farnosť dostane najviac {PODIEL_STROP_EUR} €</b>, všetko nad to ide {T.prijD}.</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setPodiel((p) => Math.max(0, p - PODIEL_KROK))} aria-label="O 0,5 % menej" style={{ ...tlO, width: 50, padding: 0, fontSize: 22 }}>−</button>
          <div role="radiogroup" aria-label="Podiel farnosti" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {stopy.map((v) => { const on = v === podiel; return <button key={v} type="button" role="radio" aria-checked={on} onClick={() => setPodiel(v)} style={{ minWidth: 52, height: 44, padding: "0 8px", borderRadius: 12, border: `${on ? 2 : 1}px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : v < podiel ? "var(--field)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 600, color: on ? "var(--gInk)" : "var(--ink2)", boxShadow: "none" }}>{v.toLocaleString("sk-SK")}</button>; })}
          </div>
          <button type="button" onClick={() => setPodiel((p) => Math.min(PODIEL_MAX, p + PODIEL_KROK))} aria-label="O 0,5 % viac" style={{ ...tlO, width: 50, padding: 0, fontSize: 22 }}>+</button>
          <b style={{ fontSize: 16 }}>Farnosť {pct(podiel)}</b>
        </div>
        {pas}
        <b style={{ fontSize: 16, marginTop: 4 }}>Krok 2 · zvyšok {pct(zvysok)} · rozhoduje {T.prijK}</b>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Farnosť len overuje. {T.prijM} si zvyšok nechá, podelí sa alebo ho celý daruje.</span>
        <div role="radiogroup" aria-label="Zvyšok" style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
          {([[false, "Nechať si celý zvyšok", `všetko ide ${T.prijD}`], [true, "Podeliť sa", "s overenou stránkou alebo žiadosťou"]] as [boolean, string, string][]).map(([v, t, s]) => (
            <button key={t} type="button" role="radio" aria-checked={podelit === v} onClick={() => setPodelit(v)} style={volbaSt(podelit === v)}>
              <Bodka on={podelit === v} /><span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
            </button>))}
        </div>
        {podelit && <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 16, background: "var(--panel)", border: "1px solid var(--cardBd)" }}>
          <span style={lab}>{T.prijM.toLocaleUpperCase("sk-SK")} · ZVYŠOK</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ flex: 1, fontSize: 15.5 }}>{T.prijM}</b><b style={{ fontSize: 15.5, fontVariantNumeric: "tabular-nums" }}>{prijemcovi === 0 ? "0 % · všetko darované" : pct(prijemcovi)}</b></div>
          <span style={lab}>IDE ĎALEJ · KOMU KOĽKO</span>
          {spolu.map((x, i) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--cardBd)", flexWrap: "wrap" }}>
              <span style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{x.nazov}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{x.popis}</span></span>
              <button type="button" onClick={() => zmenPct(i, -PODELIT_KROK)} aria-label={`${x.nazov} o 5 % menej`} style={{ ...tlO, width: 44, height: 44, padding: 0, fontSize: 20 }}>−</button>
              <b style={{ minWidth: 52, textAlign: "center", fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{pct(x.pct)}</b>
              <button type="button" onClick={() => zmenPct(i, PODELIT_KROK)} aria-label={`${x.nazov} o 5 % viac`} style={{ ...tlO, width: 44, height: 44, padding: 0, fontSize: 20 }}>+</button>
              <button type="button" onClick={() => setSpolu((l) => l.filter((_, j) => j !== i))} aria-label={`Odstrániť ${x.nazov}`} style={{ ...tlO, width: 44, height: 44, padding: 0, fontSize: 18 }}>×</button>
            </div>))}
          {spolu.length < PODELIT_MAX ? <>
            <input value={hladaj} onChange={(e) => setHladaj(e.target.value)} placeholder="+ Vybrať zo zoznamu · napíšte názov" aria-label="Vybrať zo zoznamu" style={pole} disabled={prijemcovi < PODELIT_MIN} />
            {vysledky.map((p) => (
              <button key={p.id} type="button" onClick={() => pridajSpolu(p)} style={{ ...volbaSt(false), minHeight: 52 }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{p.nazov}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{p.popis}</span></span>
              </button>))}
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Len tí, ktorí sú registrovaní v DEED. Žiadny voľný účet.</span>
          </> : <span style={{ fontSize: 13, color: "var(--ink3)" }}>Najviac {PODELIT_MAX}. Ak chcete iného, najprv jedného odstráňte.</span>}
        </div>}
        <section style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 16, background: "var(--panel)", border: "1px solid var(--cardBd)" }}>
          <b style={{ fontSize: 16 }}>Ako budú ľudia darovať</b>
          <b style={{ fontSize: 14.5 }}>Rýchle sumy pre darcov</b>
          <div role="radiogroup" aria-label="Rýchle sumy v eurách" style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
            {Object.values(SADY_EUR).map((x, i) => (
              <button key={x.label} type="button" role="radio" aria-checked={sada === i} onClick={() => setSada(i)} style={{ ...volbaSt(sada === i), flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <b style={{ fontSize: 15 }}>{x.label}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{x.sumy.join(" · ")} €</span>
              </button>))}
          </div>
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Vlastnú sumu môže darca zadať vždy. Sady sú pevné, dohodnite s rodinou, ktorá sa hodí. Po zapečatení sa sada dá zmeniť, rozdelenie nie.</span>
          <b style={{ fontSize: 14.5 }}>Dary v kryptomene EURC</b>
          <div role="radiogroup" aria-label="Dary v EURC" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
            {([[true, "Áno"], [false, "Nie"]] as [boolean, string][]).map(([v, t]) => <button key={t} type="button" role="radio" aria-checked={eurc === v} onClick={() => setEurc(v)} style={{ ...volbaSt(eurc === v), minHeight: 50, justifyContent: "center" }}><b style={{ fontSize: 15 }}>{t}</b></button>)}
          </div>
          {eurc && <>
            <b style={{ fontSize: 14.5 }}>Rýchle sumy v EURC</b>
            <div role="radiogroup" aria-label="Rýchle sumy v EURC" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {(["drobne", "stredne"] as const).map((k) => { const i = Object.keys(SADY_EURC).indexOf(k), x = SADY_EURC[k]; return (
                <button key={k} type="button" role="radio" aria-checked={sadaE === i} onClick={() => setSadaE(i)} style={{ ...volbaSt(sadaE === i), flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <b style={{ fontSize: 15 }}>{x.label}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{x.sumy.join(" · ")} EURC</span>
                </button>); })}
            </div>
          </>}
        </section>
        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Zbierka beží do 7 dní po {T.po}, môžete ju ukončiť skôr. Rozdelenie uvidí darca pred darom. Po zapečatení sa nemení.</span>
        <button type="button" onClick={() => setKrok(4)} style={{ ...tlZ, alignSelf: "flex-start" }}>Pokračovať ›</button>
      </>}

      {krok === 4 && (!potvrdil ? <div key="kod" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span aria-hidden="true" style={{ flex: "none", width: 44, height: 44, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>✓</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 17 }}>Kód sme poslali: {T.komu}</b>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Príde mu ako upozornenie v appke. Napíše ho a potvrdí rozdelenie ({rozdelenieT}). Kód platí 5 minút.</span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={() => setZnova(true)} style={{ ...tlO, height: 44, ...(znova ? { borderColor: "var(--green)", color: "var(--gInk)" } : {}) }}>{znova ? "Poslané znova ✓" : "Poslať znova"}</button>
            {test("Simulovať potvrdenie (test)", () => setPotvrdil(true))}
          </span>
        </div>
      </div> : <section key="zapecatit" role="status" style={{ borderRadius: 18, background: "var(--gSoft)", border: "2px solid var(--green)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <b style={{ fontSize: 17, color: "var(--gInk)" }}>{T.kto} potvrdil rozdelenie ✓</b>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)" }}>{velke(rozdelenieT)}. Posledný krok: zapečaťte zbierku. Potom sa spustí a rozdelenie sa už nedá zmeniť.</span>
{ucetOk ? <>
                <button type="button" onPointerDown={(e) => { e.preventDefault(); zacni(); }} onPointerUp={pusti} onPointerLeave={pusti} onPointerCancel={pusti} onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") pusti(); }}
          style={{ position: "relative", height: 58, border: "none", borderRadius: 16, background: "#3F6E2A", overflow: "hidden", cursor: "pointer", touchAction: "none", userSelect: "none", fontFamily: "inherit" } as CSSProperties}>
          <span style={{ position: "absolute", inset: 0, background: "#6E9F4E", transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? "1.5s" : ".2s"} linear` }} />
          <span style={{ position: "relative", fontSize: 16, fontWeight: 800, color: "#fff" }}>{drz ? "Držte…" : "Podržte a zapečaťte"}</span>
        </button>
        <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)", textAlign: "center", whiteSpace: "normal", overflowWrap: "anywhere" }}>Po zapečatení sa rozdelenie už nedá zmeniť. Držte prst na tlačidle, kým sa nenaplní.</span>
        </> : <div role="alert" style={{ borderRadius: 16, background: "var(--goldBg)", border: "2px solid #C9A24A", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 16 }}>Účet ešte nie je overený</b>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", whiteSpace: "normal" }}>Zbierku zapečatíte, keď overíme účet farnosti. Stačí poslať 0,01 € s kódom.</span>
          {/* overenie priamo tu — po overení sa na tomto mieste ukáže Podržte a zapečaťte (krok 4 ostáva) */}
          {!overOtv ? <button type="button" onClick={() => { setOverOtv(true); void poziadajOverenie(stranka, ucetFarnosti); }} style={{ ...tlZ, alignSelf: "flex-start" }}>Overiť účet ›</button>
            : <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
                <span style={{ fontSize: 14.5, lineHeight: 1.5, whiteSpace: "normal" }}>Z účtu <b style={{ overflowWrap: "anywhere" }}>{ucetFarnosti}</b> pošlite {OVERENIE_CFG.suma} na účet <b style={{ overflowWrap: "anywhere" }}>{OVERENIE_CFG.ucetDeed}</b> so správou <b>{overenie?.kod ?? "…"}</b>.</span>
                <span style={{ fontSize: 13.5, color: "var(--ink3)", whiteSpace: "normal" }}>Keď platba príde, účet overíme a tu sa ukáže Podržte a zapečaťte. Zbierka zatiaľ čaká v kroku 4.</span>
                <button type="button" onClick={() => void nacitajOverenie(stranka, ucetFarnosti)} style={{ ...tlO, alignSelf: "flex-start" }}>Skontrolovať znova</button>
                {onOverit && <button type="button" onClick={onOverit} style={{ ...tlO, alignSelf: "flex-start" }}>Účty farnosti ›</button>}
              </div>}
        </div>}
      </section>)}

      {krok === 5 && z && <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)", flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{T.chip} · ZBIERKU OVERILA {farV}</span>
            <b style={{ fontSize: 17 }}>{z.nazov}</b>
            <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{rozdelenieT} · do 7 dní po {T.po} · zapečatené</span>
          </span>
          <span style={{ height: 24, padding: "0 10px", borderRadius: 9, background: "#4B7A35", color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center" }}>AKTÍVNA</span>
        </div>
        {/* KARTA 57 A.5: PDF A4/A5 a obrázok príjemcovi do appky — PLACEBO — karta 57 (schránka príjemcu ešte nie je); tlač tu na fare funguje */}
        <div role="status" style={{ padding: "16px 18px", borderRadius: 18, background: "var(--gSoft)", border: "2px solid var(--green)", display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 17, color: "var(--gInk)" }}>Zapečatené ✓ {velke(T.ozn)} s QR kódom sme poslali do appky príjemcu</b>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>PDF na tlač aj obrázok na WhatsApp. Zbierku odteraz spravuje on: vidí štatistiku a darcov, doplní termín, ukončí ju. Vy sumy ani darcov neuvidíte, podiel farnosti príde do Peňaženky.</span>
          {obrTlac && <button type="button" onClick={() => { const n = rezim === "vl" ? qrParte : { qr: false, kde: "pod" as const, papier: "A5" as const }; tlacParte(obrTlac, n); zapisEditora({ udalost: "tlac", typ: "parte", vlastne: rezim === "vl", papier: n.papier, qr: n.qr, qr_miesto: n.qr ? (n.kde === "pod" ? "pod" : "rohy") : null, kto: "overovatel", stranka_typ: "farnost", stranka, pri_zbierke: true }); setTlOk(true); window.setTimeout(() => setTlOk(false), 2200); }} style={{ ...tlZ, height: 54 }}>{tlOk ? "Posielam do tlačiarne ✓" : `Vytlačiť ${T.ozn} tu na fare`}</button>}
          {obrTlac && <span style={{ fontSize: 13, color: "var(--ink3)" }}>Ak rodina nemá tlačiareň, vytlačte jej {T.ozn} tu na fare.</span>}
        </div>
        <button type="button" onClick={() => onHotovo(z, `${T.nazov} beží. Nájdete ju nižšie v Ďalších zbierkach.`)} style={{ ...tlZ, alignSelf: "flex-start" }}>Hotovo · späť do Zbierok</button>
      </>}
    </section>);
}
