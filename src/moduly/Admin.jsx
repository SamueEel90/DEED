import { useState, useEffect } from "react";
import { C, GRAD, gradText, glass } from "../theme";
import { Aura } from "../shared";
import { Screens } from "../App.jsx";

/*
  ============================================================
  MODUL ADMIN — investorský „kokpit" + náhľad zariadení
  ============================================================
  Sem je presunutý všetok pitch/bloat z pôvodnej úvodnej stránky:
  - Hero so živými štatistikami
  - karty pre investora
  - prepínač + náhľad appky na mobile / tablete / MacBooku
  Reálna appka beží mimo tohto modulu — toto je len demo/riadiaci panel.
  ============================================================
*/

export default function ModulAdmin({ wide }) {
  const [device, setDevice] = useState("mobil");

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: wide ? "22px 22px 40px" : "16px 14px 32px" }}>
      {/* admin banner */}
      <div style={{ ...glass(14, .05), border: "1px solid rgba(240,199,90,.32)", borderRadius: 16, padding: "12px 15px", display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(240,199,90,.12)", border: "1px solid rgba(240,199,90,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flex: "0 0 auto" }}>🛠</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>Admin · investorský kokpit</div>
          <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 2 }}>Pitch, živé štatistiky a náhľad appky na zariadeniach. Mimo reálnej appky.</div>
        </div>
      </div>

      <Hero />
      <DeviceToggle device={device} onChange={setDevice} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, marginTop: 24 }}>
        <DeviceFrame device={device} />
        <InvestorPanel horizontal />
      </div>

      <div style={{ textAlign: "center", marginTop: 34 }}>
        <div style={{ fontSize: 15, color: C.textSec, fontStyle: "italic" }}>„Sme prvá platforma, na ktorej rozhodujú skutky a nie reči.“</div>
        <div style={{ fontSize: 11, color: C.textTer, marginTop: 10 }}>DEED · interná ukážka pre investorov · mock dáta — žiadne reálne platby, čísla sú orientačné</div>
      </div>
    </div>
  );
}

// ---- HERO + živé štatistiky ----
function Hero() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, animation: "vznasanie 5s ease-in-out infinite" }}>
        <Aura size={92} hrubka={2}>
          <span style={{ width: 46, height: 46, borderRadius: 14, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 6px 22px rgba(99,134,255,.45)" }}>
            D<span style={{ position: "absolute", top: 4, right: 6, fontSize: 11 }}>+</span>
          </span>
        </Aura>
      </div>

      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.01em", lineHeight: 1 }}>
        DEED <span style={gradText}>Aura</span>
      </div>
      <div style={{ fontSize: 16, color: C.textSec, lineHeight: 1.55, marginTop: 12 }}>
        Modulárna platforma dobra — <b style={{ color: C.text }}>človek pomáha človeku</b>.<br />
        Priamo, transparentne, s overiteľným dôkazom.
      </div>

      <div style={{ display: "inline-flex", gap: 10, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
        <BadgeD znak="⌂ Good" text="feed skutkov dobra" />
        <BadgeD znak="♥ Help" text="crowdfunding v núdzi" />
        <BadgeD znak="✚ Charita" text="zbierky a adresár OZ" zlaty />
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
        <Stat cislo={`${247 + tick}`} popis="darov dnes" live />
        <Stat cislo="184 530 €" popis="vyzbierané tento mesiac" />
        <Stat cislo="8 421" popis="skutkov dobra" />
        <Stat cislo="3 % → 1,5 %" popis="degresívny poplatok" />
      </div>
    </div>
  );
}

function BadgeD({ znak, text, zlaty }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, ...glass(14, .05), border: `1px solid ${zlaty ? "rgba(240,199,90,.4)" : "rgba(255,255,255,.1)"}`, borderRadius: 22, padding: "7px 14px" }}>
      <b style={{ fontSize: 13, color: zlaty ? C.gold : C.blueL }}>{znak}</b>
      <span style={{ fontSize: 11.5, color: C.textSec }}>{text}</span>
    </span>
  );
}

// ---- PREPÍNAČ ZARIADENIA ----
function DeviceToggle({ device, onChange }) {
  const moznosti = [["mobil", "📱 Mobil"], ["tablet", "📲 Tablet"], ["macbook", "💻 MacBook"]];
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
      {moznosti.map(([k, t]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: "10px 22px", borderRadius: 24, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          fontWeight: device === k ? 800 : 500,
          border: `1px solid ${device === k ? "rgba(116,166,255,.55)" : C.line}`,
          background: device === k ? "linear-gradient(135deg, rgba(91,155,255,.22), rgba(139,124,255,.16))" : "rgba(255,255,255,.04)",
          boxShadow: device === k ? "0 6px 20px rgba(91,124,255,.25)" : "none",
          color: device === k ? "#EAF1FF" : C.textSec,
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          transition: "all .2s ease",
        }}>{t}</button>
      ))}
    </div>
  );
}

function Stat({ cislo, popis, live }) {
  return (
    <div style={{ ...glass(14, .045), borderRadius: 16, padding: "13px 20px", minWidth: 132 }}>
      <div style={{ fontSize: 21, fontWeight: 800, color: C.greenL }}>
        {cislo} {live && <span style={{ fontSize: 9, color: C.greenL, animation: "pulse 1.6s infinite", verticalAlign: "middle" }}>●</span>}
      </div>
      <div style={{ fontSize: 11, color: C.textTer, marginTop: 3 }}>{popis}</div>
    </div>
  );
}

// ---- KARTY PRE INVESTORA ----
function InvestorPanel({ horizontal }) {
  const karty = [
    ["🧩", "Modulárna platforma", "Domov (skutky), Help (núdza), Charita (zbierky + adresár OZ), Profil s peňaženkou. Spodné menu si každý poskladá sám — appka rastie s komunitou."],
    ["🛡", "Anti-fraud by design", "KYC overenie totožnosti, GPS pravidlo „1 adresa = 1 zbierka“, AI kontrola dokladov a rekontrola každých 30 dní. Vieme presne, kto žiada."],
    ["⛓", "Blockchain dôkaz", "Každý dar má overiteľný hash transakcie. 100 % audit weight — verifikovaný príjemca, dokumenty, AML. Dôkaz, nie sľub."],
    ["🏢", "B2B sponzor pri žiadosti (D++)", "„LIDL pomohol Marekovi 500 €.“ Logo firmy pri žiadosti, transparentná suma — doložiteľný sociálny dopad pre ESG report (ESRS S3)."],
    ["💶", "Lacnejší než konkurencia", "Degresívny poplatok 3 % → 1,5 % — klesá s rastom komunity. Celá suma daru ide žiadateľovi, darca získava DEED odmenu + karmu."],
  ];
  return (
    <div style={horizontal
      ? { width: "100%", maxWidth: 1040, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }
      : { width: 400, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      {karty.map((k, i) => (
        <div key={i} style={{ ...glass(16, .045), borderRadius: 18, padding: "17px 18px", animation: `fadeUp .5s ease ${i * 0.08}s both` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,.05)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flex: "0 0 auto" }}>{k[0]}</span>
            <b style={{ fontSize: 15 }}>{k[1]}</b>
          </div>
          <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.55, marginTop: 9 }}>{k[2]}</div>
        </div>
      ))}
      <div style={{ background: "linear-gradient(135deg, rgba(91,155,255,.1), rgba(139,124,255,.08))", border: "1px solid rgba(116,166,255,.32)", borderRadius: 18, padding: "17px 18px", boxShadow: "0 0 30px rgba(91,124,255,.1)" }}>
        <b style={{ fontSize: 14, color: C.blueL }}>👆 Vyskúšaj si demo</b>
        <div style={{ fontSize: 13, color: "#A9C2E8", lineHeight: 1.6, marginTop: 8 }}>
          1 · Appka funguje naživo — prepínaj moduly v spodnom docku, cez <b>⊞ Viac → ✎ Upraviť menu</b> si vyber vlastné taby<br />
          2 · Klikni na fotku/video v príspevku → celá obrazovka, <b>swipuj medzi fotkami</b><br />
          3 · V Help podpor žiadosť (⭐ 💎 🔥), v Charite otvor <b>Adresár OZ</b>, v Domove pridaj skutok cez ＋
        </div>
      </div>
    </div>
  );
}

// ---- RÁM ZARIADENIA (telefón / tablet / macbook) s naživo bežiacou appkou ----
function DeviceFrame({ device }) {
  const ziaraRamu = "0 34px 90px rgba(0,0,0,.65), 0 0 80px rgba(91,123,255,.13), 0 0 0 1px rgba(255,255,255,.06)";

  // MacBook = okno prehliadača
  if (device === "macbook") {
    return (
      <div style={{ width: "100%", maxWidth: 1040 }}>
        <div style={{ borderRadius: 16, overflow: "hidden", background: C.bg, boxShadow: ziaraRamu }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", background: "rgba(255,255,255,.04)", borderBottom: `1px solid ${C.line}` }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((f) => <span key={f} style={{ width: 11, height: 11, borderRadius: "50%", background: f, flex: "0 0 auto" }} />)}
            <span style={{ flex: 1, maxWidth: 420, margin: "0 auto", background: "rgba(0,0,0,.35)", border: `1px solid ${C.line}`, borderRadius: 9, padding: "5px 14px", fontSize: 12, color: C.textSec, textAlign: "center" }}>🔒 deed.app</span>
            <span style={{ width: 47, flex: "0 0 auto" }} />
          </div>
          <div style={{ height: 640, maxHeight: "70vh", position: "relative", color: C.text }}>
            <Screens wide preview />
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, marginTop: 12 }}>Naživo bežiaca appka · mock dáta</div>
      </div>
    );
  }

  // telefón / tablet
  const tablet = device === "tablet";
  return (
    <div style={{ maxWidth: "100%" }}>
      <div style={{
        width: tablet ? 768 : 430, maxWidth: "100%",
        borderRadius: tablet ? 36 : 42, padding: tablet ? 14 : 11,
        background: "linear-gradient(160deg, #2B3040 0%, #161A26 55%, #1E2330 100%)",
        boxShadow: ziaraRamu,
      }}>
        <div style={{
          borderRadius: tablet ? 24 : 32, overflow: "hidden", position: "relative",
          background: C.bg, height: tablet ? 880 : 780, maxHeight: "78vh",
          color: C.text,
        }}>
          {tablet
            ? <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 9, height: 9, background: "#000", borderRadius: "50%", border: "1px solid rgba(255,255,255,.15)", zIndex: 100 }} />
            : <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 116, height: 24, background: "#000", borderRadius: 16, zIndex: 100, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.05)" }} />}
          <div style={{ height: "100%", position: "relative" }}>
            <Screens wide={tablet} preview />
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, marginTop: 12 }}>Naživo bežiaca appka · mock dáta</div>
    </div>
  );
}
