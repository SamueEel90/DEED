import { useState } from "react";
import { C } from "@/theme";
import { ModulHlavicka, toast, useScrollHore, IkonaStit, IkonaKorunka, IkonaHviezda, IkonaUsmev, IkonaKompas, IkonaInstitucia } from "@/shared";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { FunZona } from "@/features/fun/FunZona";
import type { RebricekKategoria, RebricekRozsah, Subjekt, WideProps } from "@/types";

/*
  ============================================================
  MODUL TOP (§14) — rebríčky darcov, hrdinov a B2B partnerov
  ============================================================
  Zjednotené rebríčky z celej platformy (predtým roztrúsené po
  feedoch Domov/Help/Charita/Aktivity). Štvrť · mesto · celé SR.
  Klik na osobu → cudzí profil (§6). FUN → Fun zóna (§13.2).
  ============================================================
*/

// rozsahy rebríčka
const ROZSAHY: RebricekRozsah[] = ["Štvrť", "Mesto", "Celá SR"];

// kategórie ocenení (konsolidované zo všetkých modulov)
const KATEGORIE: RebricekKategoria[] = [
  {
    hl: "B2B PARTNERI", ic: <IkonaStit />, col: "#5BA8F0",
    polozky: [
      { meno: "Kaufland", info: "12 400 € · ESG report", subjekt: { typ: "org", meno: "Kaufland", emoji: "🏢", lok: "Firma · ESG partner", level: "Gold" } },
      { meno: "Lidl", info: "9 800 € · matching", subjekt: { typ: "org", meno: "Lidl pomáha — nadácia", emoji: "🏢", lok: "Firma · matching kampaň", level: "Gold" } },
    ],
  },
  {
    hl: "TOP DARCOVIA", ic: <IkonaKorunka />, col: "#E7C766",
    polozky: [
      { meno: "Lukáš H.", info: "1 850 DEED tento mesiac", subjekt: { typ: "osoba", meno: "Lukáš H.", level: "Gold" } },
      { meno: "Eva K.", info: "1 420 DEED", subjekt: { typ: "osoba", meno: "Eva K.", level: "Gold" } },
    ],
  },
  {
    hl: "TOP HRDINOVIA", ic: <IkonaHviezda />, col: "#F0A85E",
    polozky: [
      { meno: "Jana N.", info: "23 overených skutkov", subjekt: { typ: "osoba", meno: "Jana N.", level: "Gold", stav: "tvorca" } },
      { meno: "Ján H.", info: "18 overených skutkov", subjekt: { typ: "osoba", meno: "Ján H.", level: "Silver" } },
    ],
  },
  {
    hl: "TOP AKTIVITY", ic: <IkonaKompas />, col: "#3DD6CE",
    polozky: [
      { meno: "Cyklo TN", info: "240 km pre dobro", subjekt: { typ: "osoba", meno: "Cyklo TN", level: "Silver", stav: "tvorca" } },
      { meno: "EkoTím Juh", info: "14 vriec odpadu", subjekt: { typ: "osoba", meno: "EkoTím Juh", level: "Silver", stav: "tvorca" } },
    ],
  },
  {
    hl: "TOP CHARITY", ic: <IkonaInstitucia />, col: "#A98BF0",
    polozky: [
      { meno: "Liga proti rakovine", info: "Gold · celá SR", subjekt: { typ: "org", meno: "Liga proti rakovine", emoji: "🎗", lok: "Overená charita · celá SR", level: "Gold" } },
      { meno: "Plamienok", info: "Gold · BA", subjekt: { typ: "org", meno: "Plamienok", emoji: "🕊", lok: "Overená charita · Bratislava", level: "Gold" } },
    ],
  },
];

export default function ModulTop({ wide }: WideProps) {
  const [screen, setScreen] = useState<"top" | "fun" | "profil">("top"); // top | fun | profil
  const [subjekt, setSubjekt] = useState<Subjekt | null>(null);
  const [rozsah, setRozsah] = useState<RebricekRozsah>("Štvrť");

  const scrollHore = useScrollHore();
  const obal = (el: React.ReactNode) => wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el;
  const otvorProfil = (s: Subjekt) => { setSubjekt(s); setScreen("profil"); scrollHore(); };

  if (screen === "fun") return <div style={{ minHeight: "100%" }}>{obal(<FunZona onBack={() => setScreen("top")} toast={toast} />)}</div>;
  if (screen === "profil" && subjekt) return <div style={{ minHeight: "100%" }}>{obal(<CudziProfil subjekt={subjekt as any} toast={toast} onBack={() => setScreen("top")} />)}</div>;

  return (
    <div style={{ minHeight: "100%", paddingBottom: 14 }}>
      <ModulHlavicka title="Top" karma="Gold · L7" right={<Zvoncek color={C.textSec} toast={toast} />} />
      {obal(
        <div style={{ padding: "12px 16px" }}>
          {/* rozsah rebríčka */}
          <div style={{ display: "flex", gap: 7, marginBottom: 6 }}>
            {ROZSAHY.map((r) => {
              const on = rozsah === r;
              return <span key={r} onClick={() => setRozsah(r)} style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 11, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: "pointer",
                background: on ? "rgba(91,155,255,.16)" : C.surface2, border: `1px solid ${on ? "rgba(116,166,255,.5)" : C.line}`, color: on ? "#74A6FF" : C.textSec }}>{r}</span>;
            })}
          </div>

          {/* FUN zóna — vedľa rebríčka lídrov (§13.2) */}
          <div onClick={() => setScreen("fun")} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(240,199,90,.08)", border: "1px solid rgba(240,199,90,.3)", borderRadius: 14, padding: "12px 14px", margin: "10px 0 4px", cursor: "pointer" }}>
            <span style={{ width: 40, height: 40, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "rgba(240,199,90,.16)" }}>😄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Fun zóna · AI omyly</div>
              <div style={{ fontSize: 11.5, color: C.textTer }}>Najväčšie prešľapy AI v hodnotení</div>
            </div>
            <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
          </div>

          {/* rebríčky po kategóriách */}
          {KATEGORIE.map((kat) => (
            <div key={kat.hl}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 8px" }}>
                <span style={{ display: "flex", color: kat.col }}>{kat.ic as React.ReactNode}</span>
                <span style={{ fontSize: 11, letterSpacing: ".4px", color: C.textTer, fontWeight: 700 }}>{kat.hl}</span>
              </div>
              {kat.polozky.map((p, i) => (
                <div key={p.meno} onClick={() => otvorProfil(p.subjekt)} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }}>
                  <span style={{ width: 26, fontSize: 14, fontWeight: 800, color: i === 0 ? kat.col : C.textTer, textAlign: "center", flex: "none" }}>{i + 1}.</span>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff", background: kat.col }}>{p.subjekt.emoji || p.meno[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{p.meno}</div>
                    <div style={{ fontSize: 11.5, color: C.textTer }}>{p.info}</div>
                  </div>
                  {i === 0 && <span style={{ flex: "none", fontSize: 16 }}>🏆</span>}
                </div>
              ))}
            </div>
          ))}

          <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: 18 }}>Karma sa nedá kúpiť — len zaslúžiť konaním. Rebríčky sú verejné; súkromné osoby v nich nefigurujú.</div>
        </div>
      )}
    </div>
  );
}
