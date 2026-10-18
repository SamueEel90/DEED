// ============================================================
// OPRAVY 222 · B · Vložiť vlastné peniaze (prototyp Spolufinancovanie, Martin 13. 10.) — Správa zbierky farnosti.
// Len farár, len vlastná zbierka farnosti s vlastným účtom (stráži server 0083).
// Suma → Prevod z hlavného účtu (VS) → Čaká → Potvrdené. Kým platba nepríde, darcovia nič nevidia (nie je to pohyb).
// Potvrdí server podľa VS; „Simulovať: platba prišla“ len TESTOVACIA (server ho pustí len testovacej stránke).
// ============================================================
import { useState } from "react";
import { useSomFarar, useVklady, vlozVlastne, potvrdVklad, type Vklad } from "@/lib/farnostPrispela";
import { TESTOVACIA } from "@/lib/testovacia";
import { kartaK } from "./spravaCasti";
import { sumaEur } from "@/lib/suma";
import { EMAIL_PODPORA } from "@/lib/kontakty";

const eur = (n: number) => `${sumaEur(n)}`;
const iban = (s: string) => s.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
const vs = (s: string) => s.replace(/(\d{4})(?=\d)/g, "$1 ");
const odKoho = (m: string) => m.replace(/^Farnosť /, "Farnosti ");
const zel = { height: 52, border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", boxShadow: "none" } as const;

export function VlastnePeniaze({ stranka, menoStranky, refId, toast }: { stranka: string; menoStranky: string; refId: string; toast: (m: string) => void }) {
  const farar = useSomFarar(stranka);
  const L = useVklady(refId);
  const [suma, setSuma] = useState("");
  const [krok, setKrok] = useState<"suma" | "prevod" | null>(null);
  const [nove, setNove] = useState<Vklad | null>(null);
  const [cakam, setCakam] = useState(false);
  if (!farar) return null;
  const caka = L.find((v) => v.stav === "caka");
  const posl = L.find((v) => v.stav === "potvrdene");
  const v = nove && nove.stav === "caka" ? caka ?? nove : caka;
  const n = Number(suma.replace(",", ".").replace(/\s/g, ""));
  const ok = Number.isFinite(n) && n > 0;
  const pokracuj = () => { if (!ok || cakam) return; setCakam(true);
    void vlozVlastne(refId, n).then((x) => { setNove(x); setKrok("prevod"); }).catch((e: Error) => toast(e.message)).finally(() => setCakam(false)); };

  // 2 · prevod (hneď po vytvorení) → 3 · čaká
  if (v && krok === "prevod") return <section style={kartaK}>
    <b style={{ fontSize: 19 }}>Pošlite prevod zo svojho hlavného účtu</b>
    <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "8px 16px", padding: "14px 16px", borderRadius: 14, background: "var(--field)", fontSize: 14.5, overflowWrap: "anywhere" }}>
      <span style={{ color: "var(--ink3)" }}>Z účtu</span><b>{iban(v.z_uctu)}</b>
      <span style={{ color: "var(--ink3)" }}>Na účet zbierky</span><b>{iban(v.na_ucet)}</b>
      <span style={{ color: "var(--ink3)" }}>Suma</span><b>{eur(v.suma)}</b>
      <span style={{ color: "var(--ink3)" }}>Variabilný symbol</span><b>{vs(v.vs)}</b>
    </div>
    <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Pošlite ho vo svojej banke. Keď platba príde na transparentný účet zbierky, spoznáme ju podľa symbolu a potvrdíme sami, zvyčajne do 1 pracovného dňa.</span>
    <button type="button" onClick={() => setKrok(null)} style={zel}>Prevod som poslal</button>
  </section>;
  if (v) return <section style={kartaK}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "var(--bSoft, #DCE6EE)", border: "1px solid var(--bBd, #A8BFD0)" }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--blue, #3A6E96)" }} /><b style={{ fontSize: 15 }}>{`Čaká na platbu · ${eur(v.suma)}`}</b>
    </div>
    <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Pri zbierke sa ukáže, až keď platbu uvidíme na transparentnom účte. Kým nepríde, darcovia nič nevidia.</span>
    <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>{`Prevod: ${eur(v.suma)} · VS ${vs(v.vs)} · na ${iban(v.na_ucet)}`}</span>
    {/* OPRAVY 376: ručné overenie výpisu zatiaľ nie je — len kontakt na podporu */}
    <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Neprišla do 3 pracovných dní? Napíšte na <a href={`mailto:${EMAIL_PODPORA}`} style={{ color: "var(--gInk)", fontWeight: 800 }}>{EMAIL_PODPORA}</a>.</span>
    {TESTOVACIA && <button type="button" onClick={() => { void potvrdVklad(refId, v.id).then(() => setNove(null)).catch((e: Error) => toast(e.message)); }} style={{ height: 48, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink2)", alignSelf: "flex-start", boxShadow: "none" }}>Simulovať: platba prišla</button>}
  </section>;
  return <section style={kartaK}>
    {posl && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
      <b style={{ fontSize: 15 }}>{`Potvrdené · ${eur(posl.suma)} od ${odKoho(menoStranky)}`}</b>
    </div>}
    <b style={{ fontSize: 19 }}>Vložiť vlastné peniaze</b>
    <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Ukážte darcom, že do zbierky dávate aj vy. Zbierka potom nezačína od nuly.</span>
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 800 }}>Suma</span>
      <span style={{ display: "flex", alignItems: "center", height: 54, padding: "0 16px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--cardBd)" }}>
        <input value={suma} onChange={(e) => setSuma(e.target.value.replace(/[^\d,.\s]/g, "").slice(0, 10))} inputMode="decimal" placeholder="napr. 3 000" aria-label="Suma v eurách"
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 18, fontWeight: 800, color: "var(--ink)" }} />
        <b style={{ fontSize: 18 }}>€</b>
      </span>
    </label>
    <button type="button" disabled={!ok || cakam} onClick={pokracuj} style={{ ...zel, background: ok ? "#4B7A35" : "var(--btn)", color: ok ? "#fff" : "var(--ink3)", cursor: ok ? "pointer" : "default" }}>Pokračovať</button>
  </section>;
}
