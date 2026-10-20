// ============================================================
// OPRAVY 428 · verejné číslo objektu — JEDEN komponent, všade rovnaký (podklad Cislo-objektu.md).
// „č. Z-123 456 789 0“ · ťuk na celý riadok skopíruje LEN číslice a na tom istom mieste na 2 s „Skopírované ✓“.
// hlavicka = v hlavičke detailu medzi ‹ Späť a ··· ×: dva riadky na stred, pod číslom „Zverejnené 20. 10. 2026 · 11:05“
// (úzko „20. 10. · 11:05“, číslo sa neskracuje nikdy). V texte nikdy „ID“.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { kopiruj } from "@/lib/zdielanie";

const Kop = ({ s }: { s: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
const dva = (n: number) => String(n).padStart(2, "0");
/** „20. 10. 2026 · 11:05“ alebo krátko „20. 10. · 11:05“ */
export function zverejneneText(iso: string, kratko = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()}. ${d.getMonth() + 1}.${kratko ? "" : ` ${d.getFullYear()}`} · ${d.getHours()}:${dva(d.getMinutes())}`;
}
/** skopíruje číslice čísla objektu; true = podarilo sa */
export const kopirujCislo = (cislo: string) => kopiruj(cislo.replace(/\D/g, ""));

export function CisloObjektu({ cislo, zverejnene, hlavicka, nazov = "číslo" }: {
  /** „Z-123 456 789 0“ (cisloObjektu) */ cislo: string;
  /** ISO čas zverejnenia — len v hlavičke detailu */ zverejnene?: string;
  hlavicka?: boolean;
  /** pre čítačku: „číslo zbierky“, „číslo žiadosti“ … */ nazov?: string;
}) {
  const [stav, setStav] = useState<"" | "ok" | "chyba">("");
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const [uzke, setUzke] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 420px)").matches);
  useEffect(() => { const q = window.matchMedia("(max-width: 420px)"), f = () => setUzke(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  const tap = async () => { window.clearTimeout(tm.current); setStav((await kopirujCislo(cislo)) ? "ok" : "chyba"); tm.current = window.setTimeout(() => setStav(""), 2000); };
  const text = stav === "ok" ? "Skopírované ✓" : stav === "chyba" ? "Nepodarilo sa skopírovať" : `č. ${cislo}`;
  const kedy = zverejnene ? zverejneneText(zverejnene, uzke) : "";
  return (
    <button type="button" onClick={() => void tap()} aria-label={`${nazov[0].toUpperCase()}${nazov.slice(1)} ${cislo}, skopírovať`}
      style={{ minHeight: 44, minWidth: 0, padding: hlavicka ? "2px 6px" : "0 2px", border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit",
        display: "flex", flexDirection: "column", alignItems: hlavicka ? "center" : "flex-start", justifyContent: "center", gap: 1, color: "var(--ink3, var(--c-textTer))" }}>
      <span aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontSize: hlavicka ? 14 : 13, fontWeight: hlavicka ? 700 : 500, fontVariantNumeric: "tabular-nums",
        color: stav === "ok" ? "var(--gInk, var(--a-green))" : hlavicka ? "var(--ink, var(--c-text))" : "inherit" }}>{text}{!stav && <Kop s={hlavicka ? 15 : 14} />}</span>
      {hlavicka && kedy && <span style={{ fontSize: 13, whiteSpace: "nowrap", color: "var(--ink3, var(--c-textTer))" }}>Zverejnené {kedy}</span>}
    </button>);
}

/** OPRAVY 428: stred hlavičky detailu (medzi ‹ Späť a ··· ×) — skutok, žiadosť, ponuka, zbierka */
export function CisloVHlavicke({ cislo, zverejnene, nazov }: { cislo: string; zverejnene?: string; nazov?: string }) {
  return <span style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}><CisloObjektu cislo={cislo} zverejnene={zverejnene} hlavicka nazov={nazov} /></span>;
}
/** „číslo skutku“ · „číslo žiadosti“ · „číslo ponuky“ · „číslo zbierky“ */
export const nazovCisla = (t: string) => ({ S: "číslo skutku", H: "číslo žiadosti", O: "číslo ponuky", Z: "číslo zbierky" } as Record<string, string>)[t] ?? "číslo";
