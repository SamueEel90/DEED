// ============================================================
// OPRAVY 164 · Súkromné zbierky — info pre používateľa (veriaceho), prototyp „Sukromne zbierky - info".
// Dar namiesto kvetov, vencov a nechcených darčekov. Druhy Pohrebná · Svadobná · Oslava a iné, 6 krokov,
// overovatelia podľa druhu (farnosť môže všetky tri). Postup je rovnaký ako Zbierka s overovateľom (karta 56E).
// Zoznam overovateľov v okolí zatiaľ nie je — PLACEBO — karta 56E (tlačidlo ukáže „pripravujeme").
// ============================================================
import { useEffect, useRef, useState } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import "@/styles/platba.css";

type Druh = "pohreb" | "svadba" | "ine";
const OV: Record<Druh, string> = {
  pohreb: "farnosť, matrika, obecný úrad, pohrebná služba",
  svadba: "farnosť, matrika, obecný úrad, reštaurácia, hotel, svadobná agentúra",
  ine: "farnosť, reštaurácia, hotel, eventová firma",
};
const D: Record<Druh, [string, string, string, string]> = {
  pohreb: ["Pohrebná", "dar namiesto kvetov a vencov, pomoc rodine", "parte", "pohrebe"],
  svadba: ["Svadobná", "dar snúbencom namiesto darčekov, ktoré nepotrebujú", "svadobné oznámenie", "svadbe"],
  ine: ["Oslava a iné", "jubileum, krst, narodeniny · bez zbytočných darčekov", "oznámenie", "udalosti"],
};
const DRUHY = Object.keys(D) as Druh[];
const TREBA = ["Overený účet v appke DEED (dar príde hneď naň)", "Telefón s appkou DEED", "Prísť k overovateľovi osobne"];
const POZOR = ["Po zapečatení sa rozdelenie už nedá zmeniť.", "Podeliť sa dá len s osobou alebo organizáciou registrovanou v DEED.", "Darca bez mena sa ukáže ako Bohu známy veriaci."];

const karta = { borderRadius: 18, background: "var(--d-card, var(--card))", border: "1px solid var(--d-cardBd, var(--cardBd))", padding: 16 } as const;
const lbl = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "4px 2px 0" } as const;
const velke = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function kroky(d: Druh): [string, string][] {
  const [, , ozn, po] = D[d];
  return [
    ["Vyberte si overovateľa", `Pri tejto zbierke: ${OV[d]}. Každého sme overili my. Prídete k nemu osobne.`],
    ["Naskenujte jeho QR v appke DEED", "Overovateľ vám ukáže QR na svojom telefóne alebo počítači. Naskenujete ho v appke. Tým sa overí, že ste to naozaj vy."],
    [`Vyberte ${ozn}`, `Ak už ${ozn} je na stránke, overovateľ ho vyberie. Inak ho spolu nahráte alebo vytvoríte zo šablóny.`],
    ["Rozhodnite o peniazoch", "Overovateľ nastaví svoj malý podiel. Vy rozhodnete o zvyšku: necháte si ho, podelíte sa s inou osobou alebo organizáciou, alebo sa ho celý vzdáte v jej prospech."],
    ["Potvrďte kódom", "Do appky vám príde kód. Skontrolujete rozdelenie a potvrdíte ho."],
    ["Overovateľ zbierku zapečatí", `Zbierka sa spustí a s ${d === "pohreb" ? "parte" : "oznámením"} bude viditeľná na stránke overovateľa.${d === "pohreb" ? " Ak overoval niekto iný ako farnosť, môžete ju poslať aj na stránku svojej farnosti, ak je farnosť v DEED." : ""} Beží 7 dní po ${po}. Pošlete ju známym, každý dar príde hneď na váš účet.`],
  ];
}

export function SukromneZbierky({ onBack, desktop }: { onBack: () => void; desktop?: boolean }) {
  const [d, setD] = useState<Druh>("pohreb");
  const [hl, setHl] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const hladat = () => { setHl(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => setHl(false), 2400); };

  return (
    <div className="deed-platba" style={{ padding: "0 16px 30px", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        {!desktop && <SpatTlacidlo onClick={onBack} />}
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Súkromné zbierky</h1>
      </div>

      <div style={karta}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Zbierka pre vás a vašu rodinu</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Namiesto kvetov, vencov a nechcených darčekov dostanete dar priamo na svoj účet. Nikto nemusí nosiť hotovosť ani obálky. Zbierku založíte spolu s overovateľom, ktorý k vašej udalosti patrí a ktorého sme overili my.</div>
      </div>

      <div style={lbl}>AKÉ ZBIERKY SA DAJÚ ZALOŽIŤ</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DRUHY.map((k) => { const on = d === k; return (
          <button key={k} type="button" aria-pressed={on} onClick={() => setD(k)} style={{ textAlign: "left", fontFamily: "inherit", cursor: "pointer", padding: "12px 14px", borderRadius: 16, border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--card)", color: "var(--ink)" }}>
            <span style={{ display: "block", fontSize: 15.5, fontWeight: 800, color: on ? "var(--green)" : "var(--ink)" }}>{D[k][0]}</span>
            <span style={{ display: "block", fontSize: 13.5, color: "var(--ink2)", marginTop: 2 }}>{D[k][1]}</span>
          </button>); })}
      </div>

      <div style={lbl}>AKO NA TO · {D[d][0].toUpperCase()} ZBIERKA</div>
      <div style={{ ...karta, display: "flex", flexDirection: "column", gap: 14 }}>
        {kroky(d).map(([t, s], i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <span style={{ width: 28, height: 28, borderRadius: 14, background: "var(--gSoft)", color: "var(--green)", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{t}</span>
              <span style={{ display: "block", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", marginTop: 3 }}>{s}</span>
            </span>
          </div>))}
      </div>

      <div style={lbl}>KTO MÔŽE ZBIERKU OVERIŤ</div>
      <div style={karta}>
        <div style={{ fontSize: 13.5, color: "var(--ink2)", marginBottom: 10 }}>Každý overovateľ overuje len to, čo s ním naozaj súvisí. Farnosť môže všetky tri.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DRUHY.map((k) => { const on = d === k; return (
            <div key={k} style={{ padding: "9px 12px", borderRadius: 12, border: `1px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "transparent" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: on ? "var(--green)" : "var(--ink)" }}>{D[k][0]}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--ink2)" }}>{velke(OV[k])}</span>
            </div>); })}
        </div>
      </div>

      <div style={lbl}>ČO BUDETE POTREBOVAŤ</div>
      <div style={{ ...karta, display: "flex", flexDirection: "column", gap: 8 }}>
        {TREBA.map((x) => <div key={x} style={{ display: "flex", gap: 10, fontSize: 14 }}><span style={{ color: "var(--green)", fontWeight: 800 }}>✓</span><span>{x}</span></div>)}
      </div>

      <div style={lbl}>KAM IDÚ PENIAZE</div>
      <div style={karta}>
        <div style={{ display: "flex", height: 30, borderRadius: 10, overflow: "hidden", fontSize: 12, fontWeight: 800 }}>
          <span style={{ flex: 66, background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", paddingLeft: 10 }}>Vy · zvyšok</span>
          <span style={{ flex: 26, background: "color-mix(in srgb, var(--green) 30%, transparent)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>ak chcete</span>
          <span style={{ flex: 8, background: "var(--ink3)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 11.5, color: "var(--ink3)", marginTop: 4 }}>overovateľ</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)", marginTop: 8 }}>Dar ide hneď na účet príjemcu. Overovateľ si môže nechať malý podiel, najviac 3 % a najviac 100 €. Zvyšok je váš. Môžete si ho nechať, podeliť sa s inou osobou alebo organizáciou, alebo sa ho celý vzdať v jej prospech. Musí byť registrovaná v DEED. Darca rozdelenie vidí pred darom.</div>
      </div>

      <div style={lbl}>DOBRÉ VEDIEŤ</div>
      <div style={{ ...karta, display: "flex", flexDirection: "column", gap: 6 }}>
        {POZOR.map((x) => <div key={x} style={{ fontSize: 14, color: "var(--ink2)" }}>· {x}</div>)}
      </div>

      <button type="button" onClick={hladat} style={{ height: 50, borderRadius: 14, border: "none", background: hl ? "var(--gSoft)" : "var(--green)", color: hl ? "var(--green)" : "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
        {hl ? "Zoznam overovateľov pripravujeme" : "Nájsť overovateľa vo svojom okolí"}
      </button>
    </div>);
}
