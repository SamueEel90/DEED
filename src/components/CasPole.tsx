// ============================================================
// OPRAVY 180 — jedno pole na čas v celej appke (žiadne type="time").
// „16.00", „16,00", „1600", „16" → 16:00 (normCas + dokonciCas z lib/kalendarFarnosti).
// Klávesnica s čiarkou aj bodkou (inputMode decimal). Ťuk označí celý čas, nový sa píše rovno cez neho
// (aj keď mobil označenie nespraví, prvé písmeno nahradí starý čas). Zlý alebo prázdny sa po odídení vráti na predošlý.
// ============================================================
import { useEffect, useState, type CSSProperties } from "react";
import { normCas, dokonciCas, casNeexistuje, CAS_OK, pekny } from "@/lib/kalendarFarnosti";

/** „6:30" → „06:30" (pre polia, ktoré čas porovnávajú ako text) */
export const sNulou = (t: string) => (CAS_OK(t) ? t.padStart(5, "0") : t);

export function CasPole({ value, onCommit, onChyba, label = "Čas, ťuknite a prepíšte", style, placeholder, disabled, format = pekny }: {
  value: string; onCommit: (v: string) => void; onChyba?: (zly: boolean) => void; label?: string; style?: CSSProperties; placeholder?: string; disabled?: boolean;
  /** tvar uloženého času (predvolene „6:30") */ format?: (t: string) => string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const zly = draft != null && casNeexistuje(draft);
  useEffect(() => { onChyba?.(zly); }, [zly]); // eslint-disable-line react-hooks/exhaustive-deps
  const oznac = (el: HTMLInputElement) => { try { el.select(); } catch { /* */ } window.setTimeout(() => { try { if (document.activeElement === el) el.select(); } catch { /* */ } }, 0); };
  return (
    <input value={draft ?? value} inputMode="decimal" autoComplete="off" aria-label={label} aria-invalid={zly || undefined} placeholder={placeholder} disabled={disabled}
      onFocus={(e) => oznac(e.target)}
      onMouseUp={(e) => { if (draft == null) e.preventDefault(); }}
      onChange={(e) => {
        let raw = e.target.value;
        // prvé písmeno po ťuku vždy nahradí celý starý čas (aj keď mobil čas neoznačil a kurzor je kdekoľvek)
        const ev = e.nativeEvent as InputEvent;
        if (draft == null && value && ev.inputType?.startsWith("insert") && ev.data) raw = ev.data;
        setDraft(normCas(raw));
      }}
      onBlur={() => { const d = draft == null ? null : dokonciCas(draft); if (d != null && CAS_OK(d)) onCommit(format(d)); setDraft(null); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      style={{ fontVariantNumeric: "tabular-nums", outline: "none", ...style, ...(zly ? { border: "2px solid var(--cRed, #A3341F)" } : {}) }} />);
}
