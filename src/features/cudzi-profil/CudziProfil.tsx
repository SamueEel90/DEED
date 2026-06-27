import { useState } from "react";
import { C, GRAD, GRAD_ZELENY } from "@/theme";
import { Aura, MoniBar, QrModal, useLayout, IkonaSipVlavo, IkonaFajka, IkonaStit, IkonaPlay, IkonaPin, Zdielanie, IkonaUsmev } from "@/shared";
import type { CudziSubjekt, CudziSubjektOrg, CudziSubjektOsoba } from "@/types";
import { usePersonalizacia } from "@/lib/personalizacia";
import { KAMPANE_FALLBACK, AKCIE_FALLBACK, STAVY } from "./mock";

/*
  ============================================================
  CUDZÍ PROFIL (§6)
  ============================================================
  §6.1 Organizácia / charita — plne verejná vizitka (cover, badge
       dôvery zaslúžený karmou, štatistiky, kampane, QR + embed).
  §6.2 Osoba — 3 stavy (viditeľnosť rastie len so súhlasom):
       • BEŽNÁ — navonok len meno + úroveň · len „Pridať priateľa"
         · súkromný profil zamknutý · nesledovateľná
       • PRIATEĽ — spoloční priatelia + nedávne skutky (čo dovolil) + Správa
       • TVORCA — dobrovoľne verejný · Sledovať + ponuka služby + Talent
  Priateľstvo NEODOMYKÁ súkromnú časť automaticky.
  ============================================================
*/

const tint = (hex: string, a: number): string => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

type Toast = (m: string) => void;

interface CudziProfilProps {
  subjekt?: CudziSubjekt;
  onBack?: () => void;
  toast?: Toast;
}

export function CudziProfil({ subjekt = {} as CudziSubjekt, onBack, toast }: CudziProfilProps) {
  const { wide } = useLayout();
  const inner = subjekt.typ === "org"
    ? <OrgProfil s={subjekt} onBack={onBack} toast={toast} />
    : <OsobaProfil s={subjekt as CudziSubjektOsoba} onBack={onBack} toast={toast} />;
  // na tablete/desktope drž profil v čitateľnej šírke (rodič môže byť oveľa širší)
  return wide ? <div style={{ maxWidth: 680, margin: "0 auto" }}>{inner}</div> : inner;
}

function BackBtn({ onBack }: { onBack?: () => void }) {
  return <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 3 }}><IkonaSipVlavo size={20} color="#fff" /></div>;
}

// ============================================================
// §6.1 — PROFIL ORGANIZÁCIE / CHARITY
// ============================================================
function OrgProfil({ s, onBack, toast }: { s: CudziSubjektOrg; onBack?: () => void; toast?: Toast }) {
  const [tab, setTab] = useState("Kampane");
  const { sledujem, toggleSledovanie } = usePersonalizacia(); // sledovanie = zdieľaný store (Môj DEED)
  const [qr, setQr] = useState(false);
  const meno = s.meno || "Detská nemocnica — nadácia";
  const sleduje = sledujem(meno);
  const level = s.level || "Gold";
  const kampane = s.kampane || KAMPANE_FALLBACK;
  const akcie = s.akcie || AKCIE_FALLBACK;

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* cover + logo */}
      <div style={{ position: "relative", height: 120, background: "linear-gradient(160deg, #10233a, #1d3f63)" }}>
        <BackBtn onBack={onBack} />
      </div>
      <div style={{ padding: "0 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: -34 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, flex: "none", background: GRAD, border: "3px solid var(--c-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>{s.emoji || "🏥"}</div>
          <div style={{ paddingBottom: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{meno}</div>
            <div style={{ fontSize: 12, color: C.textTer }}>{s.lok || "nadácia · Bratislava"}</div>
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, fontWeight: 700, color: "var(--a-gold)", background: "rgba(231,199,102,.13)", border: "1px solid rgba(200,162,58,.5)", borderRadius: 9, padding: "4px 10px" }}>
          <IkonaFajka size={12} color="var(--a-gold)" /> Overená charita · {level}
        </div>

        {/* štatistiky */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {[["11 200 €", "vyzbierané"], ["1 240", "podporovateľov"], [level, "úroveň"]].map((x, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13, padding: "10px 4px" }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{x[0]}</div>
              <div style={{ fontSize: 10, color: C.textTer, marginTop: 2 }}>{x[1]}</div>
            </div>
          ))}
        </div>

        {/* sledovať + upozornenia */}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={() => { toggleSledovanie({ meno, typ: "org", emoji: s.emoji }); toast?.(sleduje ? "Prestal si sledovať" : "Sleduješ — dostaneš upozornenia na kampane"); }}
            style={{ flex: 1, height: 46, borderRadius: 13, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              background: sleduje ? "rgba(var(--glass-rgb),.06)" : GRAD, color: sleduje ? C.text : "#fff", boxShadow: sleduje ? "none" : "0 8px 24px rgba(99,134,255,.3)" }}>
            {sleduje ? "✓ Sledované" : "Sledovať"}
          </button>
          <button onClick={() => toast?.("Upozornenia na novú kampaň/akciu zapnuté")} style={{ width: 52, height: 46, borderRadius: 13, border: `1px solid ${C.line}`, background: C.surface2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🔔</button>
        </div>

        {/* taby */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {["Kampane", "Skutky", "Talent"].map((t) => {
            const on = tab === t;
            return <span key={t} onClick={() => setTab(t)} style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 11, fontSize: 13, fontWeight: on ? 700 : 500, cursor: "pointer",
              background: on ? "rgba(91,155,255,.14)" : C.surface2, border: `1px solid ${on ? "rgba(116,166,255,.45)" : C.line}`, color: on ? "var(--a-info)" : C.textSec }}>{t}</span>;
          })}
        </div>

        {/* O nás */}
        <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 6px" }}>O NÁS</div>
        <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.55, margin: 0 }}>Pomáhame detským oddeleniam nemocníc na Slovensku. Overená nezisková organizácia. Doklady o použití prostriedkov zverejňujeme.</p>

        {tab === "Kampane" && (<>
          <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 8px" }}>AKTÍVNE KAMPANE</div>
          {kampane.map((k, i) => (
            <div key={i} onClick={() => toast?.(`Kampaň: ${k.nazov}`)} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 14, padding: 13, marginBottom: 9, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ fontSize: 18 }}>{k.emoji}</span><span style={{ fontSize: 14, fontWeight: 700 }}>{k.nazov}</span></div>
              <div style={{ marginTop: 8 }}><MoniBar vyzbierane={k.vyzbierane} ciel={k.ciel} mini /></div>
            </div>
          ))}
          <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "14px 0 8px" }}>NADCHÁDZAJÚCE</div>
          {akcie.map((a, i) => (
            <div key={i} onClick={() => toast?.(`Akcia: ${a.nazov}`)} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line2}`, borderRadius: 12, padding: "11px 12px", marginBottom: 8, cursor: "pointer" }}>
              <span style={{ flex: "none", fontSize: 11, fontWeight: 800, color: "var(--a-info)", background: "rgba(116,166,255,.14)", borderRadius: 8, padding: "6px 8px", textAlign: "center", lineHeight: 1.2 }}>{a.kedy}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.nazov}</div><div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>{a.kde}</div></div>
            </div>
          ))}
        </>)}
        {tab === "Skutky" && <div style={{ padding: "20px 0", textAlign: "center", color: C.textTer, fontSize: 13 }}>Skutky a vďakypočiny organizácie.</div>}
        {tab === "Talent" && <div style={{ padding: "20px 0", textAlign: "center", color: C.textTer, fontSize: 13 }}>Videá a tematický Talent kanál.</div>}

        {/* badge dôvery DEED */}
        <div style={{ background: "rgba(31,191,143,.07)", border: "1px solid rgba(31,191,143,.25)", borderRadius: 14, padding: "12px 14px", marginTop: 16, display: "flex", gap: 11, alignItems: "center" }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(31,191,143,.14)" }}><IkonaFajka size={18} color="var(--a-green)" /></span>
          <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.45 }}><b style={{ color: C.text }}>Badge dôvery {level}</b> = zaslúžený karmou za skutky, nie kúpený. Nahrádza externé pečate.</div>
        </div>

        {/* QR profilu + embed */}
        <div onClick={() => setQr(true)} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 14, padding: 13, marginTop: 10, cursor: "pointer" }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, flex: "none", background: "#fff", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gridTemplateRows: "repeat(4,1fr)", gap: 1, padding: 4 }}>{[...Array(16)].map((_, k) => <i key={k} style={{ background: (k * 5 + 2) % 3 ? "#0B0C0F" : "transparent" }} />)}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>QR profilu charity</div><div style={{ fontSize: 11, color: C.textTer }}>Zdieľať · embed badge na web (backlink)</div></div>
          <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
        </div>
      </div>

      {qr && <QrModal typ="skutok" titul={`QR profilu · ${meno}`} popis="Embed badge dôvery na web charity" odkaz="https://deed.app/o/detska-nemocnica" onClose={() => setQr(false)} toast={toast} />}
    </div>
  );
}

// ============================================================
// §6.2 — PROFIL OSOBY (3 stavy)
// ============================================================
function OsobaProfil({ s, onBack, toast }: { s: CudziSubjektOsoba; onBack?: () => void; toast?: Toast }) {
  // demo: prepínač stavu (v reále stav určuje vzťah + súhlas)
  const [stav, setStav] = useState<string>(s.stav || "bezna");
  const [pridane, setPridane] = useState(false);
  const { sledujem, toggleSledovanie } = usePersonalizacia(); // sledovanie = zdieľaný store (Môj DEED)
  const meno = s.meno || "Ján Novák";
  const sleduje = sledujem(meno);
  const level = s.level || "Silver";
  const farba = stav === "tvorca" ? "var(--a-plum)" : stav === "priatel" ? "var(--a-green)" : "var(--a-info)";

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ position: "relative", height: 96, background: `linear-gradient(160deg, ${tint(farba, .35)}, ${tint(farba, .12)})`, transition: "background .3s ease" }}>
        <BackBtn onBack={onBack} />
      </div>

      {/* demo prepínač stavu */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "10px 16px 0" }}>
        {STAVY.map(([k, l]) => {
          const on = stav === k;
          return <span key={k} onClick={() => { setStav(k); setPridane(false); }} style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 10, fontSize: 11, fontWeight: on ? 700 : 500, cursor: "pointer",
            background: on ? tint(farba, .16) : C.surface2, border: `1px solid ${on ? tint(farba, .5) : C.line}`, color: on ? farba : C.textTer }}>{l}</span>;
        })}
      </div>
      <div style={{ textAlign: "center", fontSize: 10, color: C.textTer, marginTop: 6 }}>Náhľad stavu profilu (v reále určuje vzťah a súhlas)</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 8 }}>
        <Aura size={84} hrubka={2}><span style={{ fontSize: 30, fontWeight: 800, color: "#fff" }}>{meno[0]}</span></Aura>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>{meno}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 11, fontWeight: 700, color: farba, background: tint(farba, .12), border: `1px solid ${tint(farba, .4)}`, borderRadius: 9, padding: "3px 10px" }}>
          {stav === "tvorca" ? "✓ Lektor · gitara" : stav === "priatel" ? "✓ Priateľ · " + level : level}
        </div>
      </div>

      <div style={{ padding: "16px 18px 0" }}>
        {/* ---- BEŽNÁ ---- */}
        {stav === "bezna" && (<>
          <button onClick={() => { setPridane(true); toast?.("Žiadosť o priateľstvo odoslaná — čaká na súhlas"); }} disabled={pridane}
            style={{ width: "100%", height: 50, borderRadius: 14, border: "none", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: pridane ? "default" : "pointer",
              background: pridane ? "rgba(var(--glass-rgb),.06)" : GRAD, color: pridane ? C.textTer : "#fff", boxShadow: pridane ? "none" : "0 8px 24px rgba(99,134,255,.3)" }}>
            {pridane ? "Žiadosť odoslaná ✓" : "Pridať priateľa"}
          </button>
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: "28px 18px", marginTop: 16, textAlign: "center" }}>
            <div style={{ fontSize: 30 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Súkromný profil</div>
            <div style={{ fontSize: 12.5, color: C.textTer, marginTop: 6, lineHeight: 1.5 }}>Skutky a aktivita sú súkromné. Po prijatí priateľstva uvidíš o tejto osobe viac. Súkromné nevidí nikto.</div>
          </div>
          <div style={{ fontSize: 11, color: C.textTer, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>Bežnú osobu nemožno jednostranne „sledovať" — len priateľstvo so vzájomným súhlasom.</div>
        </>)}

        {/* ---- PRIATEĽ ---- */}
        {stav === "priatel" && (<>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, height: 46, borderRadius: 13, background: "rgba(61,214,140,.1)", border: "1px solid rgba(46,125,82,.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontWeight: 700, fontSize: 14, color: "var(--a-green)" }}><IkonaFajka size={16} color="var(--a-green)" /> Priateľ</div>
            <button onClick={() => toast?.("Správa (len medzi priateľmi)")} style={{ flex: 1, height: 46, borderRadius: 13, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Správa</button>
          </div>
          <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 8px" }}>SPOLOČNÉ</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 13px" }}>
            <IkonaUsmev size={18} color="var(--a-info)" /><span style={{ fontSize: 13.5 }}>3 spoloční priatelia</span>
          </div>
          <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 8px" }}>NEDÁVNE SKUTKY</div>
          {["Čistenie brehu Váhu", "Odviezol suseda na dialýzu"].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line2}`, borderRadius: 12, padding: "11px 13px", marginBottom: 8 }}>
              <IkonaFajka size={15} color="var(--a-green)" /><span style={{ fontSize: 13.5 }}>{t}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.textTer, textAlign: "center", marginTop: 6 }}>Vidíš, lebo ste priatelia. Priateľstvo neodomyká súkromnú časť — len čo osoba dovolila.</div>
        </>)}

        {/* ---- TVORCA ---- */}
        {stav === "tvorca" && (<>
          <button onClick={() => { toggleSledovanie({ meno, typ: "osoba" }); toast?.(sleduje ? "Prestal si sledovať" : "Sleduješ tvorcu"); }}
            style={{ width: "100%", height: 50, borderRadius: 14, border: "none", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer",
              background: sleduje ? "rgba(var(--glass-rgb),.06)" : GRAD, color: sleduje ? C.text : "#fff", boxShadow: sleduje ? "none" : "0 8px 24px rgba(99,134,255,.3)" }}>
            {sleduje ? "✓ Sledované" : "Sledovať"}
          </button>
          <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 8px" }}>PONUKA</div>
          <div onClick={() => toast?.("Rezervácia výučby (demo)")} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, cursor: "pointer" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>Výučba gitary pre začiatočníkov</div>
            <div style={{ fontSize: 12, color: C.textTer, marginTop: 4 }}>8 rokov praxe · od 15 €/h</div>
          </div>
          <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 8px" }}>TALENT</div>
          <div onClick={() => toast?.("Talent kanál (demo)")} style={{ height: 120, borderRadius: 14, background: "linear-gradient(160deg, #1a1430, #2c2350)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><IkonaPlay size={22} color="#fff" /></span>
          </div>
          <div style={{ fontSize: 11, color: C.textTer, textAlign: "center", marginTop: 12 }}>Verejný, lebo dobrovoľne ponúka službu.</div>
        </>)}
      </div>
    </div>
  );
}
