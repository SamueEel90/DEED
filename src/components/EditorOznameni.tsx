// ============================================================
// KARTA 57 A.3 — Editor oznámení (prototyp „Editor oznameni.html", verzia 4 + doplnky na konci súboru).
// Statický súbor public/editor/oznamenia.html v iframe (rovnaký pôvod) — kontrakt ako editor vsádzky:
//   initEditor(cfg) · cfg.onSend(payload) aj pri automatickom ukladaní (stav "koncept") · edKrokSpat() · edNahlad().
// KARTA 57 F: cfg.onUdalost({akcia:"tlac"|"obrazok", papier}) — editor ohlási tlač a stiahnutie obrázka (štatistika).
// ============================================================
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { OknoGalerie, useZdrojFotiek } from "@/components/VyberZGalerie";
import { DoleKroky, RamPisania } from "@/components/RamPisania";

export type TypEditora = "parte" | "svadba" | "jubileum" | "blahozelanie";
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
  /** BLOK C 235: predvolený podpis blahoželania (Správa farnosti „Blahoželá farnosť“) */ podpis?: string;
}
export interface EditorApi {
  /** krok späť v editore; false = už je na prvom kroku */
  krokSpat: () => boolean;
  /** obrázok hotového oznámenia (JPEG data URL), prázdny pri chybe; verejny = bez času, miesta a hostiny (OPRAVY 228) */
  nahlad: (o?: { verejny?: boolean }) => Promise<string>;
}
type Vysledok = { ok: boolean; y?: number | null };
type OknoEditora = Window & { initEditor?: (c: unknown) => void; edKrokSpat?: () => boolean; edNahlad?: (o?: { verejny?: boolean }) => Promise<string>;
  /** OPRAVY 258: rám na mobile */ edDalej?: () => Vysledok; edHotovo?: () => Vysledok; edNahladRam?: (on: boolean, w: number, h: number) => void; edUlozKoncept?: () => void;
  edAktivne?: () => HTMLElement | null; edNastavFotku?: (src: string) => void };
/** krok editora (OPRAVY 258) */
interface StavKroku { i: number; n: number; nazvy: string[]; typ: string; hotovo: boolean; ulozene: boolean; kontrola: boolean }
/** OPRAVY 258: rám na mobile — extra = nad poľami editora (napr. Fotky), vrstva = hláška nad rámom; onZavri (prop) = Späť z 1. kroku, rozpísané sa uloží ako koncept */
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
export const EditorOznameni = forwardRef<EditorApi, { cfg: CfgEditora; onSend: (p: PayloadEditora) => void; onUdalost?: (u: UdalostTlace) => void; style?: CSSProperties; title?: string; ram?: RamEditora | null; onZavri?: () => void }>(
  function EditorOznameni({ cfg, onSend, onUdalost, style, title = "Editor oznámenia", ram, onZavri }, ref) {
    const fr = useRef<HTMLIFrameElement>(null);
    const posli = useRef(onSend);
    const udal = useRef(onUdalost);
    useEffect(() => { posli.current = onSend; udal.current = onUdalost; }, [onSend, onUdalost]);
    const okno = () => fr.current?.contentWindow as OknoEditora | null | undefined;
    useImperativeHandle(ref, () => ({
      krokSpat: () => { try { return !!okno()?.edKrokSpat?.(); } catch { return false; } },
      nahlad: async (o) => { try { return (await okno()?.edNahlad?.(o)) ?? ""; } catch { return ""; } },
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
    const spat = useRef<{ top: number; el: HTMLElement | null }>({ top: 0, el: null });
    const krokI = useRef(-1);
    const naNacitanie = () => {
      try {
        const { navrh, ...zvysok } = cfg;
        okno()?.initEditor?.({ ...zvysok, ...(navrh ? { navrh } : {}), onSend: (p: PayloadEditora) => posli.current(p), onUdalost: (u: UdalostTlace) => udal.current?.(u),
          onVyberFotku: () => setGalOtv(true), fotkyTlacidlo: zdroj ? zdroj.tlacidlo : "Vybrať z verejných fotiek ›",
          ...(ram ? { ram: true, tema: document.documentElement.classList.contains("dark") ? "dark" : "light",
            onKrok: (k: StavKroku) => { setKrok(k); if (k.i !== krokI.current) { krokI.current = k.i; setChyba(""); telo.current?.scrollTo({ top: 0 }); } },
            onVyska: (h: number) => setVyska(h), onChyba: (t: string) => setChyba(t) } : {}) });
      } catch { /* iframe ešte nie je pripravený */ }
    };
    const vyber = (l: string[]) => { setGalOtv(false); const s = l[0]; if (s) void naDataUrl(s).then((d) => { try { okno()?.edNastavFotku?.(d); } catch { /* editor zatvorený */ } }); };
    const galeria = galOtv && <OknoGalerie zdroj={zdroj} vybrane={[]} zostava={1} onZavri={() => setGalOtv(false)} onVyber={vyber} />;
    const posunNa = (y?: number | null) => { const el = telo.current, f = fr.current; if (el && f && y != null) el.scrollTo({ top: Math.max(0, f.offsetTop + y - 12), behavior: "smooth" }); };
    // náhľad na celú plochu: editor dostane rozmer plochy, po zatvorení to isté miesto a to isté pole
    useLayoutEffect(() => {
      if (!ram) return;
      const el = telo.current, w = okno();
      if (nahl) { if (el) { el.scrollTop = 0; setPlocha(el.clientHeight); try { w?.edNahladRam?.(true, el.clientWidth, el.clientHeight); } catch { /* */ } } }
      else if (el && spat.current.top) { try { w?.edNahladRam?.(false, 0, 0); } catch { /* */ } el.scrollTop = spat.current.top; const a = spat.current.el; spat.current = { top: 0, el: null }; if (a) try { a.focus({ preventScroll: true }); } catch { /* */ } }
    }, [nahl, !!ram]); // eslint-disable-line react-hooks/exhaustive-deps
    const iframe = <iframe ref={fr} src={`/editor/oznamenia.html#${cfg.typ}`} onLoad={naNacitanie} title={title}
      style={ram ? { display: "block", width: "100%", height: nahl ? plocha : Math.max(vyska, 200), border: "none", background: "transparent" } : { display: "block", width: "100%", border: "none", background: "#EFEAE1", ...style }} />;
    if (!ram) return <>{iframe}{galeria}</>;
    const zavri = () => { try { okno()?.edUlozKoncept?.(); } catch { /* */ } onZavri?.(); };
    const spatKrok = () => { if (krok?.ulozene || !okno()?.edKrokSpat?.()) zavri(); };
    const otvorNahlad = () => { let a: HTMLElement | null = null; try { a = okno()?.edAktivne?.() ?? null; a?.blur(); } catch { /* */ } spat.current = { top: telo.current?.scrollTop || 1, el: a }; setNahl(true); };
    const dalej = () => { const w = okno(); if (!w) return; const r = krok?.hotovo ? w.edHotovo?.() : w.edDalej?.(); if (r && (krok?.hotovo || !r.ok)) posunNa(r.y); };
    return (
      <RamPisania nazov={krok?.typ || title} kroky={krok ? { i: krok.i, n: krok.n } : undefined} onSpat={spatKrok} onNahlad={() => otvorNahlad()} nahlad={nahl} onZavriNahlad={() => setNahl(false)}
        chyba={chyba} teloRef={telo} vrstva={<>{ram.vrstva}{galeria}</>}
        dole={krok && <DoleKroky i={krok.i} onSpat={() => { try { okno()?.edKrokSpat?.(); } catch { /* */ } }} onDalej={dalej} dalej={krok.hotovo ? (krok.ulozene ? "Uložené ✓" : "Hotovo · uložiť") : "Pokračovať ›"} zakazane={krok.hotovo && krok.ulozene} />}>
        {ram.extra && <div style={{ display: nahl ? "none" : undefined }}>{ram.extra}</div>}
        {iframe}
      </RamPisania>);
  });

/** OPRAVY 228: verejný obrázok oznámenia z návrhu editora (svadba, pozvánka, blahoželanie) — bez súkromných riadkov.
 *  Editor sa načíta skrytý mimo obrazovky, obnoví návrh a vráti obrázok; výsledok sa pamätá počas relácie. */
const verejne = new Map<string, string>();
export function useVerejnyObrazok(navrh: PayloadEditora | null | undefined, kluc: string): string {
  const k = navrh ? `${kluc}|${navrh.cas ?? ""}` : "";
  const [, obnov] = useState(0);
  useEffect(() => {
    if (!navrh || !k || verejne.has(k)) return;
    let zivy = true;
    const fr = document.createElement("iframe");
    fr.setAttribute("aria-hidden", "true"); fr.tabIndex = -1;
    fr.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0;visibility:hidden;pointer-events:none";
    fr.src = `/editor/oznamenia.html#${navrh.typ}`;
    fr.onload = () => {
      const w = fr.contentWindow as OknoEditora | null;
      try { w?.initEditor?.({ typ: navrh.typ, navrh, onSend: () => undefined }); } catch { /* editor ešte nie je pripravený */ }
      window.setTimeout(async () => {
        const o = await (async () => { try { return (await w?.edNahlad?.({ verejny: true })) ?? ""; } catch { return ""; } })();
        if (o) verejne.set(k, o);
        if (zivy) obnov((x) => x + 1);
        fr.remove();
      }, 450);
    };
    document.body.appendChild(fr);
    return () => { zivy = false; fr.remove(); };
  }, [navrh, k]);
  return k ? verejne.get(k) ?? "" : "";
}
