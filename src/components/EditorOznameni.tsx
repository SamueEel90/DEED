// ============================================================
// KARTA 57 A.3 — Editor oznámení (prototyp „Editor oznameni.html", verzia 4 + doplnky na konci súboru).
// Statický súbor public/editor/oznamenia.html v iframe (rovnaký pôvod) — kontrakt ako editor vsádzky:
//   initEditor(cfg) · cfg.onSend(payload) aj pri automatickom ukladaní (stav "koncept") · edKrokSpat() · edNahlad().
// KARTA 57 F: cfg.onUdalost({akcia:"tlac"|"obrazok", papier}) — editor ohlási tlač a stiahnutie obrázka (štatistika).
// ============================================================
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { OknoGalerie, useZdrojFotiek } from "@/components/VyberZGalerie";
import { createPortal } from "react-dom";
import { RamPisania, useRamPisania } from "@/components/RamPisania";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";

export type TypEditora = "parte" | "svadba" | "jubileum" | "blahozelanie" | /** OPRAVY 334: Ďakovný list, Ocenenie za službu, Poďakovanie dobrovoľníkom, Pozvánka, Vlastné */ "ine";
export interface PayloadEditora {
  verzia?: number; stav: "koncept" | "hotovo" | "doplnene"; typ: TypEditora; sablona?: string; rezim?: string;
  pohlavie?: string | null; foto?: string | null; bezTerminu?: boolean; rozlucka?: string | null;
  polia?: Record<string, string | boolean>; html?: string;
  /** BLOK C: miniatúra na stránku farnosti — podklad = pozadie šablóny, rám = farba ozdôb */
  miniatura?: { podklad?: string; ram?: string; tvar?: "oval" | "kruh" | "kosostvorec" | "stvorec"; roky?: number | null; sablona?: string; nazov?: string }; kontext?: Record<string, unknown>; cas?: string;
  [k: string]: unknown;
}
export interface CfgEditora {
  typ: TypEditora; /** BLOK C: viera = Parte, Svadba, Blahoželanie · podnik = Pozvánka na oslavu, Svadba, Blahoželanie */ sektor?: "viera" | "podnik"; rezim?: "plny" | "rychly"; bezTlace?: boolean; qrObrazok?: string; miesta?: string[];
  navrh?: PayloadEditora | null; kontext?: Record<string, unknown>;
  /** BLOK C 235: predvolený podpis blahoželania (Správa farnosti „Blahoželá farnosť“) · OPRAVY 334: pri Iné podpis „Farnosť …“ */ podpis?: string;
}
export interface EditorApi {
  /** krok späť v editore; false = už je na prvom kroku */
  krokSpat: () => boolean;
  /** obrázok hotového oznámenia (JPEG data URL), prázdny pri chybe; verejny = bez času, miesta a hostiny (OPRAVY 228) */
  nahlad: (o?: { verejny?: boolean }) => Promise<string>;
  /** OPRAVY 301: výsledok uloženia — editor ukáže kartu Zverejnené ✓ (blok = kde na stránke) alebo Neuložilo sa · Skúsiť znova */
  vysledok: (v: VysledokUlozenia) => void;
}
export interface VysledokUlozenia { ok: boolean; uprava?: boolean; blok?: string; chyba?: string; /** OPRAVY 310: Po schválení — čaká na farára */ caka?: boolean }
type Vysledok = { ok: boolean; y?: number | null };
type OknoEditora = Window & { initEditor?: (c: unknown) => void; edKrokSpat?: () => boolean; edNahlad?: (o?: { verejny?: boolean; w?: number }) => Promise<string>;
  /** OPRAVY 258: rám na mobile */ edDalej?: () => Vysledok; edHotovo?: () => Vysledok; edNahladRam?: (on: boolean, w: number, h: number) => void; edUlozKoncept?: () => void;
  edAktivne?: () => HTMLElement | null; edNastavFotku?: (src: string) => void;
  /** OPRAVY 303: Kontrola — Podržte a zverejnite, upozorniť na nezaškrtnuté */ edZverejni?: () => Vysledok; edUkazKontrolu?: () => void;
  /** OPRAVY 301: krok Hotovo */ edVysledok?: (v: VysledokUlozenia) => void; edZnova?: () => void; edUpravit?: () => void };
/** krok editora (OPRAVY 258) */
interface StavKroku { i: number; n: number; nazvy: string[]; typ: string; hotovo: boolean; ulozene: boolean; kontrola: boolean;
  /** OPRAVY 303: stránka (koho, vzhlad, ozdoby, osoba, udaje2, udaje, kontrola, hotovo), poradie medzi stránkami, kam ďalej, návrat na Kontrolu, zaškrtnuté, miniatúra */
  kluc?: string; strana?: number; strany?: number; dalsi?: string | null; navrat?: boolean; kOk?: boolean; rychly?: boolean; mini?: { bg?: string; ac?: string; /** OPRAVY 318: skutočná miniatúra parte a „meno · vzhľad“ */ img?: string; t?: string };
  /** OPRAVY 318: dlhá cesta parte (5 strán + Kontrola) */ p318?: boolean;
  /** OPRAVY 301: uloženie (caka · ok · chyba) */ uloz?: "caka" | "ok" | "chyba" | null; hotovoText?: string }
/** OPRAVY 258: rám na mobile — extra = nad poľami editora (napr. Fotky), vrstva = hláška nad rámom; onZavri (prop) = Späť z 1. kroku, rozpísané sa uloží ako koncept
 *  OPRAVY 299: s `ram` na PC (≥ 1024, mimo rámu) to isté okno ako u veriaceho: hore „‹ Späť …“, vľavo nastavenie, vpravo živý náhľad (jeden komponent pre farára aj veriaceho) */
export interface RamEditora { extra?: ReactNode; vrstva?: ReactNode }
/** OPRAVY 258: vybratá fotka do editora ako data URL (náhľad a obrázok sa kreslia cez SVG, cudzia adresa by sa nevykreslila) */
async function naDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  try {
    const b = await (await fetch(src)).blob();
    return await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ok(src); r.readAsDataURL(b); });
  } catch { return src; }
}

export interface UdalostTlace { akcia: "tlac" | "obrazok"; papier?: "A4" | "A5" }
export const EditorOznameni = forwardRef<EditorApi, { cfg: CfgEditora; onSend: (p: PayloadEditora) => void; onUdalost?: (u: UdalostTlace) => void; style?: CSSProperties; title?: string; ram?: RamEditora | null; onZavri?: () => void;
  /** OPRAVY 299: PC okno — text tlačidla hore a nadpis okna */ spatText?: string; nadpis?: string;
  /** OPRAVY 301: po uložení — Pozrieť na stránke › a „Hotovo · späť …“ (text) */ onPozriet?: () => void; onHotovo?: () => void; hotovoText?: string }>(
  function EditorOznameni({ cfg, onSend, onUdalost, style, title = "Editor oznámenia", ram: ramProp, onZavri, spatText = "‹ Späť", nadpis, onPozriet, onHotovo, hotovoText }, ref) {
    // OPRAVY 299: rám na celú obrazovku len na mobile a tablete na výšku; na PC okno s živým náhľadom
    const naMobile = useRamPisania();
    const ram = naMobile ? ramProp : null;
    // OPRAVY 318: bez obsahu nad editorom sa posúva iframe sám (natívne rolovanie aj pri rýchlom ťahu na iPhone), telo rámu stojí
    const vlastne = !!ram && !ram.extra;
    const pcOkno = !!ramProp && !naMobile;
    const ulozeneRef = useRef(false);
    const fr = useRef<HTMLIFrameElement>(null);
    const posli = useRef(onSend);
    const udal = useRef(onUdalost);
    const poHotove = useRef({ onPozriet, onHotovo });
    useEffect(() => { posli.current = onSend; udal.current = onUdalost; poHotove.current = { onPozriet, onHotovo }; }, [onSend, onUdalost, onPozriet, onHotovo]);
    const okno = () => fr.current?.contentWindow as OknoEditora | null | undefined;
    useImperativeHandle(ref, () => ({
      krokSpat: () => { try { return !!okno()?.edKrokSpat?.(); } catch { return false; } },
      nahlad: async (o) => { try { return (await okno()?.edNahlad?.(o)) ?? ""; } catch { return ""; } },
      vysledok: (v) => { try { okno()?.edVysledok?.(v); } catch { /* editor zatvorený */ } },
    }));
    // OPRAVY 258: okno Vybrať fotku (Moje fotky · Verejné fotky) aj v Editore oznámení
    const zdroj = useZdrojFotiek();
    const [galOtv, setGalOtv] = useState(false);
    // OPRAVY 258: rám na mobile — stav krokov, výška obsahu (jedno rolovanie), náhľad na ťuk
    const [krok, setKrok] = useState<StavKroku | null>(null);
    const [vyska, setVyska] = useState(0);
    const [chyba, setChyba] = useState("");
    const [nahl, setNahl] = useState(false);
    const [plocha, setPlocha] = useState(600);
    const telo = useRef<HTMLDivElement>(null);
    const spat = useRef<{ top: number; el: HTMLElement | null; y?: number }>({ top: 0, el: null });
    const krokI = useRef(-1);
    const krokJ = useRef("");
    const otvorNahlad = () => { let a: HTMLElement | null = null; try { a = okno()?.edAktivne?.() ?? null; a?.blur(); } catch { /* */ } spat.current = { top: telo.current?.scrollTop || 1, el: a, y: vlastne ? okno()?.scrollY ?? 0 : undefined }; setNahl(true); };
    const naNacitanie = () => {
      try {
        const { navrh, ...zvysok } = cfg;
        okno()?.initEditor?.({ ...zvysok, ...(navrh ? { navrh } : {}), onUdalost: (u: UdalostTlace) => udal.current?.(u),
          onSend: (p: PayloadEditora) => { if (p.stav === "hotovo") ulozeneRef.current = true; posli.current(p); },
          hotovoKarta: true, hotovoText, ...(onPozriet ? { onPozriet: () => poHotove.current.onPozriet?.() } : {}), onHotovo: () => (poHotove.current.onHotovo ?? onZavri)?.(),
          onVyberFotku: () => setGalOtv(true), fotkyTlacidlo: zdroj ? zdroj.tlacidlo : "Vybrať z verejných fotiek ›",
          ...(ram ? { ram: true, tema: document.documentElement.classList.contains("dark") ? "dark" : "light",
            onKrok: (k: StavKroku) => { const j = JSON.stringify(k); if (j === krokJ.current) return; krokJ.current = j; setKrok(k); if (k.i !== krokI.current) { krokI.current = k.i; setChyba(""); telo.current?.scrollTo({ top: 0 }); if (vlastne) try { okno()?.scrollTo(0, 0); } catch { /* */ } } },
            onCelaObrazovka: () => otvorNahlad(),
            onVyska: (h: number) => setVyska(h), onChyba: (t: string) => setChyba(t) } : {}) });
      } catch { /* iframe ešte nie je pripravený */ }
    };
    const vyber = (l: string[]) => { setGalOtv(false); const s = l[0]; if (s) void naDataUrl(s).then((d) => { try { okno()?.edNastavFotku?.(d); } catch { /* editor zatvorený */ } }); };
    // Editor A: jedno okno Vybrať fotku — Z telefónu · Moje fotky · Verejné fotky
    const zTel = (f: File) => { setGalOtv(false); const r = new FileReader(); r.onload = () => { try { okno()?.edNastavFotku?.(String(r.result)); } catch { /* editor zatvorený */ } }; r.readAsDataURL(f); };
    const galeria = galOtv && <OknoGalerie zdroj={zdroj} vybrane={[]} zostava={1} onZavri={() => setGalOtv(false)} onVyber={vyber} zTelefonu={zTel} />;
    const posunNa = (y?: number | null) => { if (y == null) return; if (vlastne) { try { okno()?.scrollTo({ top: Math.max(0, y - 12), behavior: "smooth" }); } catch { /* */ } return; } const el = telo.current, f = fr.current; if (el && f) el.scrollTo({ top: Math.max(0, f.offsetTop + y - 12), behavior: "smooth" }); };
    // náhľad na celú plochu: editor dostane rozmer plochy, po zatvorení to isté miesto a to isté pole
    useLayoutEffect(() => {
      if (!ram) return;
      const el = telo.current, w = okno();
      if (nahl) { if (el) { el.scrollTop = 0; setPlocha(el.clientHeight); try { w?.edNahladRam?.(true, el.clientWidth, el.clientHeight); } catch { /* */ } } }
      else if (el && spat.current.top) { try { w?.edNahladRam?.(false, 0, 0); } catch { /* */ } el.scrollTop = spat.current.top; const y = spat.current.y; if (y != null) window.setTimeout(() => { try { okno()?.scrollTo(0, y); } catch { /* */ } }, 30); const a = spat.current.el; spat.current = { top: 0, el: null }; if (a) try { a.focus({ preventScroll: true }); } catch { /* */ } }
    }, [nahl, !!ram]); // eslint-disable-line react-hooks/exhaustive-deps
    const iframe = <iframe key={ram ? "ram" : "pc"} ref={fr} src={`/editor/oznamenia.html#${cfg.typ}`} onLoad={naNacitanie} title={title}
      style={ram ? { display: "block", width: "100%", height: vlastne ? "100%" : nahl ? plocha : Math.max(vyska, 200), border: "none", background: "transparent" }
        : pcOkno ? { position: "absolute", inset: 0, display: "block", width: "100%", height: "100%", border: "none", background: "#EFEAE1" }
        : { display: "block", width: "100%", border: "none", background: "#EFEAE1", ...style }} />;
    if (pcOkno) {
      // ‹ Späť: najprv krok späť v editore (ako u veriaceho), z 1. kroku alebo po uložení zavrie; rozpísané sa uloží ako koncept
      const spatPc = () => { try { if (!ulozeneRef.current && okno()?.edKrokSpat?.()) return; okno()?.edUlozKoncept?.(); } catch { /* */ } onZavri?.(); };
      return createPortal(
        <div role="dialog" aria-modal="true" aria-label={nadpis ?? title} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,17,11,.82)", overscrollBehavior: "contain", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 16, boxSizing: "border-box" }}>
          <div style={{ width: "100%", maxWidth: 1200, flex: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={spatPc} style={{ minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, boxShadow: "none" }}>{spatText}</button>
          </div>
          <div className="sc-tokeny" style={{ position: "relative", flex: 1, minHeight: 0, width: "100%", maxWidth: 1200, borderRadius: 20, overflow: "hidden", background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: "none", padding: "14px 16px 10px", borderBottom: "1px solid var(--cardBd)" }}><b style={{ fontSize: 19 }}>{nadpis ?? title}</b></div>
            {ramProp?.extra && <div style={{ flex: "none", maxHeight: "55%", overflowY: "auto", borderBottom: "1px solid var(--cardBd)" }}>{ramProp.extra}</div>}
            <div style={{ position: "relative", flex: 1, minHeight: 0 }}>{iframe}{ramProp?.vrstva}</div>
          </div>
          {galeria}
        </div>, document.body);
    }
    if (!ram) return <>{iframe}{galeria}</>;
    const zavri = () => { try { okno()?.edUlozKoncept?.(); } catch { /* */ } onZavri?.(); };
    const spatKrok = () => { if (krok?.kluc === "hotovo" && krok.uloz && krok.uloz !== "caka") { try { okno()?.edUpravit?.(); } catch { /* */ } return; } if (krok?.ulozene || !okno()?.edKrokSpat?.()) zavri(); };
    const dalej = () => { const w = okno(); if (!w) return; const r = krok?.hotovo ? w.edHotovo?.() : w.edDalej?.(); if (r && (krok?.hotovo || !r.ok)) posunNa(r.y); };
    // OPRAVY 303: hlavička „Parte · 2 z 5“, od 3. stránky pás náhľadu 64 px, dole jedno tlačidlo, ktoré hovorí kam; Kontrola = Podržte a zverejnite
    const k = krok;
    const stred = !k ? title : k.kluc === "kontrola" ? "Kontrola" : k.kluc === "hotovo" ? k.typ : k.strana ? `${k.typ} · ${k.strana} z ${k.strany}` : k.typ;
    const diely = k?.strana && k.strany ? { i: k.strana - 1, n: k.strany } : undefined;
    const POD: Record<string, string> = { ozdoby: "mení sa hneď", osoba: "mení sa, ako píšete", udaje: "mení sa, ako píšete", udaje2: "skontrolujte pred uložením" };
    // OPRAVY 318: od 3. strany a na Kontrole skutočná miniatúra parte, „meno · vzhľad“
    const pas = k?.p318 ? (["ozdoby", "osoba", "udaje2", "udaje", "kontrola"].includes(k.kluc ?? "") /* OPRAVY 331: aj strana Text (svadba, blahoželanie) */ ? (
      <div style={{ height: 64, boxSizing: "border-box", padding: "0 16px", display: "flex", alignItems: "center", gap: 12 }}>
        {k.mini?.img ? <img src={k.mini.img} alt="" style={{ width: 32, height: 48, flex: "none", objectFit: "cover", borderRadius: 3, border: "1px solid var(--cardBd)", background: "#fff" }} />
          : <span aria-hidden="true" style={{ width: 32, height: 48, flex: "none", borderRadius: 3, background: k.mini?.bg || "#fff", border: "1px solid var(--cardBd)" }} />}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15.5 }}>Náhľad</b><span style={{ fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.mini?.t || "mení sa, ako píšete"}</span></span>
        <button type="button" onClick={otvorNahlad} style={{ flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "transparent", color: "var(--gInk)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none" }}>Pozrieť ⤢</button>
      </div>) : undefined)
    : k?.kluc && POD[k.kluc] && (k.kluc !== "udaje" || k.rychly) ? (
      <div style={{ height: 64, boxSizing: "border-box", padding: "0 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden="true" style={{ width: 34, height: 48, flex: "none", borderRadius: 4, background: k.mini?.bg || "#fff", boxShadow: `inset 0 -4px 0 ${k.mini?.ac || "#888"}`, border: "1px solid var(--cardBd)" }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15.5 }}>Náhľad</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{POD[k.kluc]}</span></span>
        <button type="button" onClick={otvorNahlad} style={{ flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "transparent", color: "var(--gInk)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none" }}>Pozrieť ⤢</button>
      </div>) : undefined;
    const tlB = { width: "100%", minHeight: 56, border: "none", borderRadius: 14, fontFamily: "inherit", fontSize: 16.5, fontWeight: 800, cursor: "pointer", boxShadow: "none" } as const;
    const zverejni = () => { const r = okno()?.edZverejni?.(); if (r && !r.ok) posunNa(r.y); };
    const dole = !k ? null : k.kluc === "kontrola" ? <>
      {k.kOk ? <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label="Podržte a zverejnite" trvanie={1500} onConfirm={zverejni} /></div>
        : <button type="button" onClick={() => { try { okno()?.edUkazKontrolu?.(); } catch { /* */ } }} style={{ ...tlB, background: "var(--btn)", color: "var(--ink2)" }}>Podržte a zverejnite</button>}
      {!k.p318 /* OPRAVY 318: prototyp bez riadku pod tlačidlom */ && <span style={{ fontSize: 13, color: "var(--ink3)", textAlign: "center" }}>{k.kOk ? "Podržte prst na tlačidle, kým sa nenaplní." : "Tlačidlo je aktívne až po zaškrtnutí."}</span>}
    </> : k.hotovo && k.uloz === "caka" ? <button type="button" disabled style={{ ...tlB, background: "var(--btn)", color: "var(--ink2)", cursor: "default" }}>Ukladá sa…</button>
      : k.hotovo && k.uloz === "ok" ? <button type="button" onClick={() => (onHotovo ?? onZavri)?.()} style={{ ...tlB, background: "var(--ink)", color: "var(--bg)" }}>{hotovoText || "Hotovo · späť na stránku farnosti"}</button>
      : k.hotovo && k.uloz === "chyba" ? <button type="button" onClick={() => { try { okno()?.edZnova?.(); } catch { /* */ } }} style={{ ...tlB, background: "#4B7A35", color: "#fff" }}>Skúsiť znova</button>
      : k.hotovo ? <button type="button" onClick={dalej} disabled={k.ulozene} style={{ ...tlB, background: k.ulozene ? "var(--btn)" : "#4B7A35", color: k.ulozene ? "var(--ink2)" : "#fff", cursor: k.ulozene ? "default" : "pointer" }}>{k.ulozene ? "Uložené ✓" : "Hotovo · uložiť"}</button>
      : <button type="button" onClick={dalej} style={{ ...tlB, background: "#4B7A35", color: "#fff" }}>{k.navrat ? "Späť na kontrolu ›" : k.dalsi ? `Pokračovať · ${k.dalsi} ›` : k.p318 ? "Skontrolovať ›" : "Skontrolovať a uložiť ›"}</button>;
    return (
      <RamPisania nazov={k?.typ || title} stred={stred} kroky={diely} onSpat={spatKrok} spatText={k?.kluc === "hotovo" && k.uloz && k.uloz !== "caka" ? "‹ Späť na úpravu" : "‹ Späť"} nahlad={nahl} onZavriNahlad={() => setNahl(false)} pas={pas}
        chyba={chyba} teloRef={telo} vrstva={<>{ram.vrstva}{galeria}</>} dole={dole} bezRolovania={vlastne && !nahl}>
        {ram.extra && <div style={{ display: nahl ? "none" : undefined }}>{ram.extra}</div>}
        {iframe}
      </RamPisania>);
  });

/** OPRAVY 228: verejný obrázok oznámenia z návrhu editora (svadba, pozvánka, blahoželanie) — bez súkromných riadkov.
 *  Editor sa načíta skrytý mimo obrazovky, obnoví návrh a vráti obrázok; výsledok sa pamätá počas relácie.
 *  OPRAVY 296: aj celý hárok parte (verejny = false) — fotka zo Storage, hárok až keď je fotka načítaná. */
const verejne = new Map<string, string>();
export function useVerejnyObrazok(navrh: PayloadEditora | null | undefined, kluc: string): string {
  return useObrazokNavrhu(navrh, kluc, true) || "";
}
/** null = ešte sa kreslí · "" = nepodarilo sa · inak obrázok (JPEG data URL) */
export function useObrazokNavrhu(navrh: PayloadEditora | null | undefined, kluc: string, verejny: boolean, /** OPRAVY 302: šírka obrázka */ w = 840): string | null {
  const k = navrh ? `${kluc}|${navrh.cas ?? ""}|${verejny ? "v" : "c"}|${w}` : "";
  const [, obnov] = useState(0);
  useEffect(() => {
    if (!navrh || !k || verejne.has(k)) return;
    let zivy = true;
    const fr = document.createElement("iframe");
    fr.setAttribute("aria-hidden", "true"); fr.tabIndex = -1;
    fr.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0;visibility:hidden;pointer-events:none";
    fr.src = `/editor/oznamenia.html#${navrh.typ}`;
    fr.onload = () => {
      const okn = fr.contentWindow as OknoEditora | null;
      try { okn?.initEditor?.({ typ: navrh.typ, navrh, onSend: () => undefined }); } catch { /* editor ešte nie je pripravený */ }
      window.setTimeout(async () => {
        const o = await (async () => { try { return (await okn?.edNahlad?.({ verejny, w })) ?? ""; } catch { return ""; } })();
        verejne.set(k, o);
        if (zivy) obnov((x) => x + 1);
        fr.remove();
      }, 450);
    };
    document.body.appendChild(fr);
    return () => { zivy = false; fr.remove(); };
  }, [navrh, k, verejny, w]);
  return !k ? "" : verejne.has(k) ? verejne.get(k)! : null;
}
