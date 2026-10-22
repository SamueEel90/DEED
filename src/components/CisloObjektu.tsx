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
  // OPRAVY 477: mobil v hlavičke — skrátené „č. Z-…972 8“ (posledné 4 číslice) + ikonka kopírovania; ťuk na číslo rozbalí / zbalí,
  // kopírovanie vždy celé číslo. Nič sa neprekrýva so ‹ Späť ani s ··· / ×. PC a tablet ostávajú s celým číslom.
  const [mob, setMob] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches);
  useEffect(() => { const q = window.matchMedia("(max-width: 600px)"), f = () => setMob(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  const [cele, setCele] = useState(false);
  if (hlavicka && mob) {
    const pos: number[] = []; for (let i = 0; i < cislo.length; i++) if (/\d/.test(cislo[i])) pos.push(i);
    const kratke = pos.length > 4 ? `${cislo.slice(0, cislo.indexOf("-") + 1)}…${cislo.slice(pos[pos.length - 4])}` : cislo;
    return (
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0, maxWidth: "100%" }}>
          <button type="button" onClick={() => setCele(!cele)} aria-expanded={cele} aria-label={cele ? `${nazov[0].toUpperCase()}${nazov.slice(1)} ${cislo}, zbaliť` : `${nazov[0].toUpperCase()}${nazov.slice(1)}, zobraziť celé`}
            style={{ minHeight: 44, minWidth: 0, padding: "2px 4px", border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums",
              color: stav === "ok" ? "var(--gInk, var(--a-green))" : "var(--ink, var(--c-text))", whiteSpace: cele ? "normal" : "nowrap", overflowWrap: "anywhere", textAlign: "center", lineHeight: 1.25 }}>
            <span aria-live="polite">{stav === "ok" ? "Skopírované ✓" : stav === "chyba" ? "Nepodarilo sa skopírovať" : `č. ${cele ? cislo : kratke}`}</span></button>
          <button type="button" onClick={() => void tap()} aria-label={`Skopírovať ${nazov} ${cislo}`}
            style={{ flex: "none", width: 36, height: 44, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", color: "var(--ink3, var(--c-textTer))", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><Kop s={15} /></button>
        </span>
        {kedy && <span style={{ fontSize: 12.5, whiteSpace: "nowrap", color: "var(--ink3, var(--c-textTer))" }}>Zverejnené {kedy}</span>}
      </span>);
  }
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
