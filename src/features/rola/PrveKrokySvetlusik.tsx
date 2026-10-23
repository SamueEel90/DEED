// ============================================================
// Balík 47 bod 3 · Svetlúšik · Prvé kroky (na vyskúšanie) — zadanie „SVETLUSIK-sprievodca-farara.md“.
// Karta hore v Prehľade farnosti, nie vrstva cez obrazovku. Kroky sa odškrtávajú samy podľa skutočných dát,
// Neskôr ju skryje (vráti sa cez Prvé kroky v Treba vybaviť), nič sa nestratí.
// Výrazy z číselníka cirkví (useSlovaFarnosti + 0163): oslovenie, Vaša farnosť / Váš zbor, bohoslužby, kostol / chrám / synagóga.
// Krok „Pozvať dozorcu“ len pri cirkvi s dozorcom (ako Ľudia farnosti). Svetlúšik nič nerobí za farára, len hovorí, kam ťuknúť.
// ============================================================
import type { CSSProperties } from "react";
import { citajNastavenie, zapisNastavenie, useZmenyNastaveni } from "@/lib/nastaveniaStranky";

export type KrokSprievodcu = { k: string; t: string; hot: boolean; tap: () => void };
const ZELENA = "#4B7A35";
const plne: CSSProperties = { minHeight: 52, padding: "0 22px", borderRadius: 14, border: "none", background: ZELENA, color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" };
const obrys: CSSProperties = { minHeight: 52, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" };
const POCET = ["", "Jeden krok", "Dva kroky", "Tri kroky", "Štyri kroky", "Päť krokov"];
/** oslovenie z číselníka v 5. páde (otec → otče); cirkev bez titulov = duchovný správca */
const piatyPad = (o: string | null) => (!o ? "duchovný správca" : o === "otec" ? "otče" : o);

function Svetlo() {
  return (
    <span aria-hidden="true" style={{ flex: "none", position: "relative", width: 40, height: 40 }}>
      <span style={{ position: "absolute", inset: -6, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,196,92,.5) 0%,rgba(255,196,92,0) 70%)" }} />
      <span style={{ position: "absolute", inset: 0, overflow: "hidden" }}><span style={{ position: "absolute", left: 0, top: 0, width: 400, height: 40, background: "url('/svetlusik-let.png') 0 0/100% 100% no-repeat" }} /></span>
    </span>);
}

export function PrveKrokySvetlusik({ oslovenie, vasa, kroky, mobil, hotovo }: { oslovenie: string | null; vasa: string; kroky: KrokSprievodcu[]; mobil: boolean;
  /** Hotovo: tri tiché odkazy, nič povinné */ hotovo: { oznam: () => void; qr: () => void; vzhlad: () => void } }) {
  useZmenyNastaveni();
  const hotKroky = kroky.filter((k) => k.hot).length, vsetko = hotKroky === kroky.length;
  const dalsi = kroky.findIndex((k) => !k.hot);
  if (citajNastavenie(vsetko ? "prveKrokyHotovo" : "prveKrokyNeskor")) return null;
  const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1.5px solid var(--goldBd)", padding: mobil ? "16px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 14 };
  if (vsetko) return (
    <section aria-label="Prvé kroky sú hotové" style={karta}>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>PRVÉ KROKY · SVETLÚŠIK</span>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Svetlo /><b style={{ fontSize: 19, lineHeight: 1.35 }}>Hotovo. {vasa} má stránku naplnenú.</b></span>
      <span style={{ fontSize: 16, lineHeight: 1.5, color: "var(--ink2)" }}>Ďalej už nič nemusíte. Keď budete chcieť:</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {([["Napísať oznam ›", hotovo.oznam], ["QR plagát ›", hotovo.qr], ["Vzhľad stránky ›", hotovo.vzhlad]] as const).map(([t, f]) => (
          <button key={t} type="button" onClick={f} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", color: "var(--gInk)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>{t}</button>))}
      </div>
      <button type="button" onClick={() => zapisNastavenie("prveKrokyHotovo", true)} style={{ ...obrys, alignSelf: "flex-start" }}>Zavrieť</button>
    </section>);
  return (
    <section aria-label="Prvé kroky" style={karta}>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>PRVÉ KROKY · SVETLÚŠIK</span>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Svetlo />
        <b style={{ fontSize: 19, lineHeight: 1.35 }}>Vitajte, {piatyPad(oslovenie)}. {vasa} má stránku, poďme ju naplniť. {POCET[kroky.length] ?? `${kroky.length} krokov`}, asi 10 minút.</b></span>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {kroky.map((k, i) => (
          <li key={k.k}><button type="button" onClick={k.tap} aria-label={`${i + 1}. ${k.t}${k.hot ? " · hotové" : ""}`}
            style={{ minHeight: 44, padding: "0 14px 0 8px", borderRadius: 22, border: `1.5px solid ${k.hot ? "var(--gBd)" : i === dalsi ? ZELENA : "var(--cardBd)"}`, background: k.hot ? "var(--gSoft)" : "var(--field)", color: "var(--ink)", fontFamily: "inherit", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 14, background: k.hot ? ZELENA : "var(--card)", border: k.hot ? "none" : "1.5px solid var(--cardBd)", color: k.hot ? "#fff" : "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{k.hot ? "✓" : i + 1}</span>
            {k.t}</button></li>))}
      </ol>
      <span style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={kroky[dalsi].tap} style={plne}>{hotKroky ? `Pokračovať › krok ${dalsi + 1}` : "Poďme na to ›"}</button>
        <button type="button" onClick={() => zapisNastavenie("prveKrokyNeskor", true)} style={obrys}>Neskôr</button>
      </span>
    </section>);
}
