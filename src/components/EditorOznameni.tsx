// ============================================================
// KARTA 57 A.3 — Editor oznámení (prototyp „Editor oznameni.html", verzia 4 + doplnky na konci súboru).
// Statický súbor public/editor/oznamenia.html v iframe (rovnaký pôvod) — kontrakt ako editor vsádzky:
//   initEditor(cfg) · cfg.onSend(payload) aj pri automatickom ukladaní (stav "koncept") · edKrokSpat() · edNahlad().
// KARTA 57 F: cfg.onUdalost({akcia:"tlac"|"obrazok", papier}) — editor ohlási tlač a stiahnutie obrázka (štatistika).
// ============================================================
import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from "react";

export type TypEditora = "parte" | "svadba" | "jubileum" | "blahozelanie";
export interface PayloadEditora {
  verzia?: number; stav: "koncept" | "hotovo" | "doplnene"; typ: TypEditora; sablona?: string; rezim?: string;
  pohlavie?: string | null; foto?: string | null; bezTerminu?: boolean; rozlucka?: string | null;
  polia?: Record<string, string | boolean>; html?: string; kontext?: Record<string, unknown>; cas?: string;
  [k: string]: unknown;
}
export interface CfgEditora {
  typ: TypEditora; rezim?: "plny" | "rychly"; bezTlace?: boolean; qrObrazok?: string; miesta?: string[];
  navrh?: PayloadEditora | null; kontext?: Record<string, unknown>;
}
export interface EditorApi {
  /** krok späť v editore; false = už je na prvom kroku */
  krokSpat: () => boolean;
  /** obrázok hotového oznámenia (JPEG data URL), prázdny pri chybe */
  nahlad: () => Promise<string>;
}
type OknoEditora = Window & { initEditor?: (c: unknown) => void; edKrokSpat?: () => boolean; edNahlad?: () => Promise<string> };

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
      nahlad: async () => { try { return (await okno()?.edNahlad?.()) ?? ""; } catch { return ""; } },
    }));
    const naNacitanie = () => {
      try {
        const { navrh, ...zvysok } = cfg;
        okno()?.initEditor?.({ ...zvysok, ...(navrh ? { navrh } : {}), onSend: (p: PayloadEditora) => posli.current(p), onUdalost: (u: UdalostTlace) => udal.current?.(u) });
      } catch { /* iframe ešte nie je pripravený */ }
    };
    return <iframe ref={fr} src={`/editor/oznamenia.html#${cfg.typ}`} onLoad={naNacitanie} title={title} style={{ display: "block", width: "100%", border: "none", background: "#EFEAE1", ...style }} />;
  });
