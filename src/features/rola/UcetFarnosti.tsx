// ============================================================
// OPRAVY 340 — Účet farnosti hneď pri prvom príchode do Správy (nie až pri zapečatení zbierky s overovateľom).
// IBAN → kód → „Pošlite 0,01 € s týmto kódom z účtu farnosti“ → Čaká na platbu / Overený ✓ (OverenieUctu, ten istý ako v Hlavnej zbierke).
// Jeden účet pre Hlavnú zbierku aj podiel farnosti v zbierke s overovateľom — ukladá sa v nastaveniach stránky (kľúč „ucetFarnosti“).
// OPRAVY 340b: jediné miesto na zmenu je Nastavenia → Účet farnosti. Nový účet čaká na overenie (kľúč „ucetFarnostiNovy“),
// dovtedy platí starý; po overení nového sa vymení sám. Stav overenia sa sleduje každých 5 s — odozva hneď na mieste.
// ============================================================
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { OverenieUctu, useOverenieUctu, ibanPlatny } from "./OverenieUctu";
import { citajNastavenie, zapisNastavenie, useZmenyNastaveni } from "@/lib/nastaveniaStranky";
import { nacitajOverenie } from "@/lib/overenieUctu";
import { najdiTestProfil } from "@/lib/testProfily";
import { TESTOVACIA } from "@/lib/testovacia";

export const KLUC_UCTU = "ucetFarnosti";
const KLUC_NOVY = "ucetFarnostiNovy";
const cisty = (s: string) => s.replace(/\s/g, "").toUpperCase();
const pekny = (s: string) => cisty(s).replace(/(.{4})/g, "$1 ").trim();
const datum = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
const platny = (v: unknown) => (typeof v === "string" && ibanPlatny(v) ? cisty(v) : "");

/** stav overenia sa sleduje, kým nie je overený (platba môže prísť kedykoľvek) */
function useSleduj(stranka: string, iban: string, caka: boolean) {
  useEffect(() => {
    if (!iban || !caka) return;
    const t = window.setInterval(() => { if (!document.hidden) void nacitajOverenie(stranka, iban); }, 5000);
    return () => window.clearInterval(t);
  }, [stranka, iban, caka]);
}

export type UcetFarnosti = { iban: string; overeny: boolean; /** stav je známy a nie je overený (čaká na platbu) */ caka: boolean; overene?: string; novy: string; novyOvereny: boolean };
/** hlavný účet farnosti: uložený v Správe, inak z testovacieho profilu; "" = ešte nezadaný. Nový účet čaká na overenie. */
export function useUcetFarnosti(strankaId: string): UcetFarnosti {
  useZmenyNastaveni();
  const iban = platny(citajNastavenie(KLUC_UCTU)) || platny(najdiTestProfil(strankaId)?.ucet ?? "");
  const novy0 = platny(citajNastavenie(KLUC_NOVY));
  const novy = novy0 && novy0 !== iban ? novy0 : "";
  const o = useOverenieUctu(strankaId, iban), on = useOverenieUctu(strankaId, novy);
  const overeny = o?.stav === "overeny", novyOvereny = on?.stav === "overeny";
  useSleduj(strankaId, iban, !!iban && !overeny);
  useSleduj(strankaId, novy, !!novy && !novyOvereny);
  // nový účet je overený → platí odteraz on (starý sa nahradí)
  useEffect(() => { if (novy && novyOvereny) { zapisNastavenie(KLUC_UCTU, novy); zapisNastavenie(KLUC_NOVY, null); } }, [novy, novyOvereny]);
  return { iban, overeny, caka: !!o && !overeny, overene: o?.overene, novy, novyOvereny };
}

const pole: CSSProperties = { height: 52, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 16, fontWeight: 700, letterSpacing: ".04em", color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const tlZ: CSSProperties = { minHeight: 48, padding: "0 18px", border: "none", borderRadius: 12, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none" };
const tlO: CSSProperties = { minHeight: 48, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", boxShadow: "none" };

/** zadanie IBAN: zelené tlačidlo až pri platnom čísle, dovtedy veta */
function ZadajIban({ onUloz, onZrus, text }: { onUloz: (iban: string) => void; onZrus?: () => void; text: string }) {
  const [v, setV] = useState("");
  return <>
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{text}</span>
      <input value={v} onChange={(e) => setV(e.target.value.toUpperCase().slice(0, 34))} placeholder="SK00 0000 0000 0000 0000 0000" autoComplete="off" style={pole} />
    </label>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {ibanPlatny(v) ? <button type="button" onClick={() => onUloz(cisty(v))} style={tlZ}>Uložiť účet a ukázať kód</button>
        : <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Napíšte IBAN (24 znakov, začína SK).</span>}
      {onZrus && <button type="button" onClick={onZrus} style={tlO}>Zrušiť</button>}
    </div>
  </>;
}

const Overeny = ({ iban, overene, novy }: { iban: string; overene?: string; novy?: boolean }) => (
  <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", flexWrap: "wrap" }}>
    <b style={{ flex: "1 1 220px", fontSize: 16, letterSpacing: ".03em", overflowWrap: "anywhere" }}>{pekny(iban)}</b>
    <b style={{ fontSize: 14.5, color: "var(--gInk)" }}>{novy ? "Nový účet overený ✓" : "Overený ✓"}{overene ? ` · ${datum(overene)}` : ""}</b>
  </div>);

/** spoločný rámik karty */
function Karta({ mobil, zlata, children }: { mobil: boolean; zlata?: boolean; children: ReactNode }) {
  return <section data-ucet-farnosti="" style={{ flex: "none", borderRadius: mobil ? 18 : 22, background: "var(--card)", border: zlata ? "2px solid #C9A24A" : "1px solid var(--cardBd)", padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 16 }}>{children}</section>;
}

/** Prehľad Správy farnosti — kým účet nie je overený (prvý príchod). Po overení hneď na mieste „Účet je overený ✓“. */
export function UcetFarnostiKarta({ strankaId, mobil, onNastavenia }: { strankaId: string; mobil: boolean; /** zmena účtu = Nastavenia → Účet farnosti */ onNastavenia?: () => void }) {
  const u = useUcetFarnosti(strankaId);
  const [zavrete, setZavrete] = useState(false);
  const [cakal, setCakal] = useState(false); // potvrdenie „overený“ len keď sme na tomto mieste videli čakanie na platbu
  if ((u.caka || !u.iban) && !cakal) setCakal(true);
  if (u.overeny && (!cakal || zavrete)) return null;
  if (u.overeny) return <Karta mobil={mobil}>
    <b style={{ fontSize: 18, color: "var(--gInk)" }}>Účet farnosti je overený ✓</b>
    <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Platba prišla. Môžete spúšťať zbierky. Účet nájdete v Nastaveniach → Účet farnosti.</span>
    <Overeny iban={u.iban} overene={u.overene} />
    <button type="button" onClick={() => setZavrete(true)} style={{ ...tlO, alignSelf: "flex-start" }}>Zavrieť</button>
  </Karta>;
  return <Karta mobil={mobil} zlata>
    <b style={{ fontSize: 18 }}>Účet farnosti</b>
    <span style={{ fontSize: 14.5, lineHeight: 1.5, fontWeight: 700, color: "var(--ink)" }}>Bez overeného účtu nespustíte zbierky.</span>
    <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Na tento účet prídu peniaze z Hlavnej zbierky aj podiel farnosti zo zbierok s overovateľom (pohreb, svadba). Overíme ho platbou 0,01 € s kódom.{TESTOVACIA ? " V testovacej verzii sa zbierky spustia aj bez overenia." : ""}</span>
    {!u.iban ? <ZadajIban text="IBAN ÚČTU FARNOSTI" onUloz={(i) => zapisNastavenie(KLUC_UCTU, i)} />
      : <>
        <b style={{ fontSize: 16, letterSpacing: ".03em", overflowWrap: "anywhere" }}>{pekny(u.iban)}</b>
        <OverenieUctu stranka={strankaId} iban={u.iban} ph={mobil} />
        {onNastavenia && <button type="button" onClick={onNastavenia} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Iný účet? Zmeniť v Nastaveniach ›</button>}
      </>}
  </Karta>;
}

/** Nastavenia → Účet farnosti — jediné miesto na zmenu účtu */
export function UcetFarnostiNastavenia({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  const u = useUcetFarnosti(strankaId);
  const [meni, setMeni] = useState(false);
  const [vymeneny, setVymeneny] = useState<string | null>(null);
  const [novyPred, setNovyPred] = useState(u.novy);
  // nový účet sa práve overil a vymenil → potvrdenie na mieste
  if (novyPred !== u.novy) { setNovyPred(u.novy); if (novyPred && !u.novy && u.iban === novyPred) setVymeneny(u.iban); }
  const uloz = (iban: string) => {
    setMeni(false); setVymeneny(null);
    if (!u.iban || !u.overeny) zapisNastavenie(KLUC_UCTU, iban); // nie je čo zachovať — rovno tento
    else if (iban !== u.iban) zapisNastavenie(KLUC_NOVY, iban); // starý platí, kým sa nový neoverí
  };
  return <Karta mobil={mobil}>
    <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Na tento účet idú dary Hlavnej zbierky, omšových zbierok, ďalších zbierok farnosti aj podiel farnosti zo zbierok s overovateľom.</span>
    {vymeneny && <span role="status" style={{ fontSize: 15, fontWeight: 800, color: "var(--gInk)" }}>Nový účet je overený ✓ Odteraz idú dary naň.</span>}
    {!u.iban ? <ZadajIban text="IBAN ÚČTU FARNOSTI" onUloz={uloz} />
      : <>
        {u.overeny ? <Overeny iban={u.iban} overene={u.overene} />
          : <><b style={{ fontSize: 16, letterSpacing: ".03em", overflowWrap: "anywhere" }}>{pekny(u.iban)}</b><OverenieUctu stranka={strankaId} iban={u.iban} ph={mobil} /></>}
        {u.novy && <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: 14, background: "var(--panel)", border: "1.5px solid #C9A24A" }}>
          <b style={{ fontSize: 15.5 }}>Nový účet čaká na overenie</b>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Kým nepríde platba 0,01 € z nového účtu, dary idú na terajší účet.</span>
          <b style={{ fontSize: 16, letterSpacing: ".03em", overflowWrap: "anywhere" }}>{pekny(u.novy)}</b>
          <OverenieUctu stranka={strankaId} iban={u.novy} ph={mobil} />
          <button type="button" onClick={() => zapisNastavenie(KLUC_NOVY, null)} style={{ ...tlO, alignSelf: "flex-start" }}>Zrušiť zmenu</button>
        </div>}
        {meni ? <ZadajIban text="NOVÝ IBAN" onUloz={uloz} onZrus={() => setMeni(false)} />
          : !u.novy && <button type="button" onClick={() => { setMeni(true); setVymeneny(null); }} style={{ ...tlO, alignSelf: "flex-start" }}>Zmeniť účet</button>}
      </>}
  </Karta>;
}
