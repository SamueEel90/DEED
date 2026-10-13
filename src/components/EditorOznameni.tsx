// ============================================================
// KARTA 57 A.3 — Editor oznámení (prototyp „Editor oznameni.html", verzia 4 + doplnky na konci súboru).
// Statický súbor public/editor/oznamenia.html v iframe (rovnaký pôvod) — kontrakt ako editor vsádzky:
//   initEditor(cfg) · cfg.onSend(payload) aj pri automatickom ukladaní (stav "koncept") · edKrokSpat() · edNahlad().
// KARTA 57 F: cfg.onUdalost({akcia:"tlac"|"obrazok", papier}) — editor ohlási tlač a stiahnutie obrázka (štatistika).
// ============================================================
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from "react";

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
type OknoEditora = Window & { initEditor?: (c: unknown) => void; edKrokSpat?: () => boolean; edNahlad?: (o?: { verejny?: boolean }) => Promise<string> };

export interface UdalostTlace { akcia: "tlac" | "obrazok"; papier?: "A4" | "A5" }
export const EditorOznameni = forwardRef<EditorApi, { cfg: CfgEditora; onSend: (p: PayloadEditora) => void; onUdalost?: (u: UdalostTlace) => void; style?: CSSProperties; title?: string }>(
  function EditorOznameni({ cfg, onSend, onUdalost, style, title = "Editor oznámenia" }, ref) {
    const fr = useRef<HTMLIFrameElement>(null);
    const posli = useRef(onSend);
    const udal = useRef(onUdalost);
    useEffect(() => { posli.current = onSend; udal.current = onUdalost; }, [onSend, onUdalost]);
    const okno = () => fr.current?.contentWindow as OknoEditora | null | undefined;
    useImperativeHandle(ref, () => ({
      krokSpat: () => { try { return !!okno()?.edKrokSpat?.(); } catch { return false; } },
      nahlad: async (o) => { try { return (await okno()?.edNahlad?.(o)) ?? ""; } catch { return ""; } },
    }));
    const naNacitanie = () => {
      try {
        const { navrh, ...zvysok } = cfg;
        okno()?.initEditor?.({ ...zvysok, ...(navrh ? { navrh } : {}), onSend: (p: PayloadEditora) => posli.current(p), onUdalost: (u: UdalostTlace) => udal.current?.(u) });
      } catch { /* iframe ešte nie je pripravený */ }
    };
    return <iframe ref={fr} src={`/editor/oznamenia.html#${cfg.typ}`} onLoad={naNacitanie} title={title} style={{ display: "block", width: "100%", border: "none", background: "#EFEAE1", ...style }} />;
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
