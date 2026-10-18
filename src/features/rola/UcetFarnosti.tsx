// ============================================================
// OPRAVY 340 — Účet farnosti hneď pri prvom príchode do Správy (nie až pri zapečatení zbierky s overovateľom).
// IBAN → kód → „Pošlite 0,01 € s týmto kódom z účtu farnosti“ → Čaká na platbu / Overený ✓ (OverenieUctu, ten istý ako v Hlavnej zbierke).
// Jeden účet pre Hlavnú zbierku aj podiel farnosti v zbierke s overovateľom — ukladá sa v nastaveniach stránky (kľúč „ucetFarnosti“).
// Kým účet nie je overený, karta je v Prehľade hore: „Bez overeného účtu nespustíte zbierky.“
// ============================================================
import { useState, type CSSProperties } from "react";
import { OverenieUctu, useOverenieUctu, ibanPlatny } from "./OverenieUctu";
import { citajNastavenie, zapisNastavenie, useZmenyNastaveni } from "@/lib/nastaveniaStranky";
import { najdiTestProfil } from "@/lib/testProfily";
import { TESTOVACIA } from "@/lib/testovacia";

export const KLUC_UCTU = "ucetFarnosti";
const cisty = (s: string) => s.replace(/\s/g, "").toUpperCase();
const pekny = (s: string) => cisty(s).replace(/(.{4})/g, "$1 ").trim();

/** hlavný účet farnosti: uložený v Správe, inak z testovacieho profilu; "" = ešte nezadaný */
export function useUcetFarnosti(strankaId: string): { iban: string; overeny: boolean } {
  useZmenyNastaveni();
  const ulozeny = citajNastavenie(KLUC_UCTU);
  const iban = typeof ulozeny === "string" && ibanPlatny(ulozeny) ? cisty(ulozeny) : cisty(najdiTestProfil(strankaId)?.ucet ?? "");
  const o = useOverenieUctu(strankaId, iban);
  return { iban: ibanPlatny(iban) ? iban : "", overeny: o?.stav === "overeny" };
}

const pole: CSSProperties = { height: 52, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 16, fontWeight: 700, letterSpacing: ".04em", color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };

/** karta v Prehľade Správy farnosti — ukáže sa, kým účet nie je overený */
export function UcetFarnostiKarta({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  const { iban, overeny } = useUcetFarnosti(strankaId);
  const [nove, setNove] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  if (overeny && nove === null) return null;
  const uloz = () => {
    if (nove === null) return;
    if (!ibanPlatny(nove)) { setChyba("IBAN nie je správny. Slovenský IBAN má 24 znakov a začína SK."); return; }
    zapisNastavenie(KLUC_UCTU, cisty(nove)); setNove(null); setChyba(null);
  };
  const zadavanie = nove !== null || !iban;
  return (
    <section data-ucet-farnosti="" style={{ flex: "none", borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "2px solid #C9A24A", padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 16 }}>
      <b style={{ fontSize: 18 }}>Účet farnosti</b>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, fontWeight: 700, color: "var(--ink)" }}>Bez overeného účtu nespustíte zbierky.</span>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Na tento účet prídu peniaze z Hlavnej zbierky aj podiel farnosti zo zbierok s overovateľom (pohreb, svadba). Overíme ho platbou 0,01 € s kódom.{TESTOVACIA ? " V testovacej verzii sa zbierky spustia aj bez overenia." : ""}</span>
      {zadavanie ? <>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>IBAN ÚČTU FARNOSTI</span>
          <input value={nove ?? ""} onChange={(e) => { setChyba(null); setNove(e.target.value.toUpperCase().slice(0, 34)); }} placeholder="SK00 0000 0000 0000 0000 0000" autoComplete="off" inputMode="text" style={pole} />
        </label>
        {chyba && <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: "var(--cRed)" }}>{chyba}</span>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {nove && ibanPlatny(nove) ? <button type="button" onClick={uloz} style={{ minHeight: 48, padding: "0 18px", border: "none", borderRadius: 12, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none" }}>Uložiť účet a ukázať kód</button>
            : <span style={{ fontSize: 13.5, color: "var(--ink3)", alignSelf: "center" }}>Napíšte IBAN (24 znakov, začína SK).</span>}
          {iban && <button type="button" onClick={() => { setNove(null); setChyba(null); }} style={{ minHeight: 48, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>Zrušiť</button>}
        </div>
      </> : <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <b style={{ fontSize: 16, letterSpacing: ".03em", overflowWrap: "anywhere" }}>{pekny(iban)}</b>
          <button type="button" onClick={() => setNove("")} style={{ minHeight: 44, padding: "0 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Zmeniť účet</button>
        </div>
        <OverenieUctu stranka={strankaId} iban={iban} ph={mobil} />
      </>}
    </section>);
}
