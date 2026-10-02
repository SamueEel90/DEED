// ============================================================
// KARTA 39 · bod 2 — overenie účtu overovacou platbou (Nová zbierka P1, centrálna „Zmeniť účet").
// Po zadaní platného IBAN ukáže kód; stav „Čaká na overovaciu platbu" → „Účet overený".
// ============================================================
import { useEffect, useState } from "react";
import { FLAGS } from "./stav";
import { OVERENIE_CFG, overenieZPamate, nacitajOverenie, poziadajOverenie, simulujOverenie, useZmenyOverenia } from "@/lib/overenieUctu";

export const ibanPlatny = (iban: string) => { const c = iban.replace(/\s/g, ""); return /^SK\d{2}/i.test(c) && c.length === 24; };
/** stav overenia pre volajúceho (napr. chyba kroku) */
export function useOverenieUctu(stranka: string, iban: string) {
  useZmenyOverenia();
  const platny = ibanPlatny(iban);
  useEffect(() => { if (!platny) return; let ziva = true; void nacitajOverenie(stranka, iban).then((o) => { if (ziva && !o) void poziadajOverenie(stranka, iban); }); return () => { ziva = false; }; }, [stranka, iban, platny]);
  return platny ? overenieZPamate(stranka, iban) : null;
}

export function OverenieUctu({ stranka, iban, ph }: { stranka: string; iban: string; ph?: boolean }) {
  const o = useOverenieUctu(stranka, iban);
  const [skop, setSkop] = useState(false);
  if (!o) return null;
  if (o.stav === "overeny") return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d="M5 12l5 5 9-10" /></svg>
      <span style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink2)" }}><b style={{ color: "var(--gInk)" }}>Účet overený.</b> Patrí vašej organizácii.</span>
    </div>);
  const kopiruj = () => { try { void navigator.clipboard?.writeText(o.kod); setSkop(true); window.setTimeout(() => setSkop(false), 1800); } catch { /* bez schránky */ } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: ph ? "14px 14px" : "16px 18px", borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
      <span style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 9, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>Čaká na overovaciu platbu</span>
      <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink2)" }}>Z tohto účtu pošlite <b style={{ color: "var(--ink)" }}>{OVERENIE_CFG.suma}</b> na účet DEED+ <b style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{OVERENIE_CFG.ucetDeed}</b>. Do správy pre prijímateľa napíšte kód:</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 22, letterSpacing: ".08em", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{o.kod}</b>
        <button type="button" onClick={kopiruj} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)" }}>{skop ? "Skopírované" : "Kopírovať kód"}</button>
      </div>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Overíme, že účet patrí vašej organizácii (názov alebo IČO). Keď platba príde, stav sa zmení sám. Kým účet nie je overený, zbierka sa nedá spustiť.</span>
      {FLAGS.dev_tier_switcher && <button type="button" onClick={() => simulujOverenie(stranka, iban)} style={{ alignSelf: "flex-start", minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px dashed var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>Simulovať prijatú platbu (DEV)</button>}
    </div>);
}
