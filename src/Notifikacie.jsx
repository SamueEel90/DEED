import { useState } from "react";
import { C, GRAD, glassTmavy } from "./theme";
import { Zvon, IkonaNastavenia, IkonaSipVlavo, IkonaKriz } from "./shared";

/*
  ============================================================
  NOTIFIKÁCIE (§8) — zvonček (zoznam) + nastavenia
  ============================================================
  Zvonček je konštanta hore vo všetkých moduloch. Klik → zoznam
  agregovaných oznámení (1240 podpor = 1 súhrn) s badge počtom
  neprečítaných. Gear → nastavenia: prepínače po kategóriách +
  MASTER vypínač + tiché hodiny.

  Agregácia je POVINNÁ — nikdy 1 notifikácia za každú mikro-platbu.
  ============================================================
*/

// kategórie: Moje skutky · Peňaženka/Reťaz · Sledované · Sociálne · Od DEED
export const NOTIFY = [
  { id: 1, kat: "skutky",    ic: "✓", col: "#2BD49B", titul: "Skutok vyhodnotený",            text: "+130 DEED · významný (3 riadky vo feede)", cas: "teraz", nove: true },
  { id: 2, kat: "skutky",    ic: "❤", col: "#F2706F", titul: "Jana N. podporila tvoj skutok", text: "+50 DEED", cas: "8 min", nove: true },
  { id: 3, kat: "penazenka", ic: "♻", col: "#2BD49B", titul: "Reťaz dobra odoslaná",          text: "39 DEED → Rodina po povodni", cas: "1 h" },
  { id: 4, kat: "penazenka", ic: "⭐", col: "#5BA8F0", titul: "Súhrn podpory",                 text: "1 240 mikro-podpor spojených · +124 DEED", cas: "2 h", agg: true },
  { id: 5, kat: "sledovane", ic: "🏥", col: "#5BA8F0", titul: "Detská nemocnica — nová kampaň", text: "Sledované · zbierka na inkubátor", cas: "5 h" },
  { id: 6, kat: "sledovane", ic: "🏃", col: "#F0A85E", titul: "Pripomienka: Beh pre zdravie",  text: "Zajtra 09:00 · si prihlásený", cas: "6 h" },
  { id: 7, kat: "socialne",  ic: "👤", col: "#8B7CFF", titul: "Peter chce byť tvoj priateľ",   text: "Žiadosť o priateľstvo", cas: "1 d" },
  { id: 8, kat: "deed",      ic: "✦", col: "#43E0C8", titul: "Oznam od DEED",                 text: "Nová funkcia: Reťaz dobra", cas: "2 d" },
];

const KATEGORIE = [
  { hl: "MOJE SKUTKY",       polozky: ["Vyhodnotenie skutku", "Overenie / námietka", "Niekto ma podporil"] },
  { hl: "PEŇAŽENKA / REŤAZ", polozky: ["Prijatý DEED", "Reťaz dobra odoslaná"] },
  { hl: "SLEDOVANÉ",         polozky: ["Nová kampaň / akcia", "Pripomienky akcií"] },
  { hl: "SOCIÁLNE",          polozky: ["Žiadosti o priateľstvo", "Správy"] },
  { hl: "OD DEED",           polozky: ["Oznamy a novinky"] },
];
const VYPNUTE_DEF = { "Oznamy a novinky": true }; // default off (§8: Od DEED ticho)

// ---- prepínač ----
function Toggle({ on, dim, onClick }) {
  return (
    <span onClick={onClick} style={{ width: 42, height: 25, borderRadius: 20, flex: "none", cursor: "pointer", padding: 3, opacity: dim ? .4 : 1,
      background: on ? "linear-gradient(90deg,#1FBF8F,#5CE6B8)" : "rgba(var(--glass-rgb),.14)", transition: "background .2s ease" }}>
      <span style={{ display: "block", width: 19, height: 19, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.35)", transform: on ? "translateX(17px)" : "none", transition: "transform .2s ease" }} />
    </span>
  );
}

// ============================================================
// ZVONČEK — tlačidlo s badge + overlay (zoznam / nastavenia)
// ============================================================
export function Zvoncek({ color = "#C4CCDB", toast }) {
  const [otvor, setOtvor] = useState(false);
  const [view, setView] = useState("zoznam"); // zoznam | nastavenia
  const [precitane, setPrecitane] = useState(false);
  const neprecitane = precitane ? 0 : NOTIFY.filter((n) => n.nove).length;

  return (
    <>
      <span onClick={() => { setOtvor(true); setView("zoznam"); }} style={{ position: "relative", display: "flex", alignItems: "center", cursor: "pointer" }}>
        <Zvon size={20} color={color} />
        {neprecitane > 0 && (
          <span style={{ position: "absolute", top: -5, right: -6, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 9, background: "#F2706F", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px var(--c-bg)" }}>{neprecitane}</span>
        )}
      </span>

      {otvor && (
        <div onClick={() => setOtvor(false)} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.5)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", display: "flex", flexDirection: "column", zIndex: 80, animation: "fadeUp .18s ease" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...glassTmavy(26, .92), borderTop: "none", borderLeft: "none", borderRight: "none", borderBottomLeftRadius: 22, borderBottomRightRadius: 22, padding: "12px 14px 16px", boxShadow: "0 18px 50px rgba(0,0,0,.45)", maxHeight: "88%", display: "flex", flexDirection: "column" }}>
            {view === "zoznam" ? (
              <Zoznam onSettings={() => setView("nastavenia")} onClose={() => setOtvor(false)} onPrecitaj={() => setPrecitane(true)} toast={toast} />
            ) : (
              <Nastavenia onBack={() => setView("zoznam")} toast={toast} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ---- ZOZNAM oznámení ----
function Zoznam({ onSettings, onClose, onPrecitaj, toast }) {
  const neprecitane = NOTIFY.filter((n) => n.nove).length;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto", paddingBottom: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 800 }}>Oznámenia</span>
        {neprecitane > 0 && <span onClick={onPrecitaj} style={{ fontSize: 11, fontWeight: 700, color: "#5BA8F0", cursor: "pointer" }}>Označiť prečítané</span>}
        <span onClick={onSettings} title="Nastavenia notifikácií" style={{ marginLeft: "auto", display: "flex", cursor: "pointer", color: C.textSec }}><IkonaNastavenia size={19} color={C.textSec} /></span>
        <span onClick={onClose} style={{ display: "flex", cursor: "pointer", color: C.textSec }}><IkonaKriz size={19} color={C.textSec} /></span>
      </div>
      <div style={{ fontSize: 11, color: C.textTer, paddingBottom: 8, flex: "0 0 auto" }}>{neprecitane} neprečítané · mikro-podpory agregované do súhrnu</div>
      <div style={{ overflowY: "auto", margin: "0 -4px", flex: "1 1 auto" }}>
        {NOTIFY.map((n) => (
          <div key={n.id} onClick={() => toast?.(n.titul)} style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 8px", borderRadius: 12, cursor: "pointer", borderBottom: `1px solid ${C.line2}`, background: n.nove ? "rgba(91,168,240,.05)" : "transparent" }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: tint(n.col, .15), color: n.col }}>{n.ic}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                {n.nove && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5BA8F0", flex: "none" }} />}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.titul}</span>
                {n.agg && <span style={{ flex: "none", fontSize: 8.5, fontWeight: 800, color: C.textTer, border: `1px solid ${C.line}`, borderRadius: 6, padding: "1px 5px" }}>SÚHRN</span>}
              </div>
              <div style={{ fontSize: 12, color: C.textTer, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.text}</div>
            </div>
            <span style={{ fontSize: 11, color: C.textTer, flex: "none" }}>{n.cas}</span>
          </div>
        ))}
        <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, padding: "14px 0 4px" }}>To je všetko · staršie sa archivujú</div>
      </div>
    </>
  );
}

// ---- NASTAVENIA notifikácií (kategórie + master + tiché hodiny) ----
export function Nastavenia({ onBack, embedded, toast }) {
  const [master, setMaster] = useState(true);
  const [tiche, setTiche] = useState(true);
  const [vyp, setVyp] = useState(VYPNUTE_DEF); // mapka vypnutých prepínačov
  const je = (k) => !vyp[k];
  const prepni = (k) => setVyp((v) => ({ ...v, [k]: !v[k] }));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto", paddingBottom: 4 }}>
        {!embedded && <span onClick={onBack} style={{ display: "flex", cursor: "pointer", color: C.textSec }}><IkonaSipVlavo size={20} color={C.textSec} /></span>}
        <span style={{ fontSize: 16, fontWeight: 800 }}>Notifikácie</span>
      </div>

      <div style={{ overflowY: "auto", flex: "1 1 auto", margin: "0 -2px", paddingRight: 2 }}>
        {/* MASTER */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(91,155,255,.08)", border: "1px solid rgba(91,155,255,.25)", borderRadius: 14, padding: "13px 14px", margin: "8px 0 4px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Všetky notifikácie</div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>Hlavný vypínač · prebíja kategórie</div>
          </div>
          <Toggle on={master} onClick={() => setMaster((m) => !m)} />
        </div>

        {/* kategórie */}
        {KATEGORIE.map((kat) => (
          <div key={kat.hl}>
            <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: "16px 0 6px" }}>{kat.hl}</div>
            {kat.polozky.map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", marginBottom: 7 }}>
                <span style={{ flex: 1, fontSize: 13.5 }}>{p}</span>
                <Toggle on={master && je(p)} dim={!master} onClick={() => master && prepni(p)} />
              </div>
            ))}
          </div>
        ))}

        {/* tiché hodiny */}
        <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: "16px 0 6px" }}>TICHÉ HODINY</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5 }}>Nočný pokoj</div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>22:00 – 7:00 · push vždy ticho</div>
          </div>
          <Toggle on={tiche} onClick={() => setTiche((t) => !t)} />
        </div>

        {/* push default vysvetlenie */}
        <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: 14, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 13px" }}>
          <b style={{ color: C.textSec }}>Push štandard:</b> mini dary nepushujú (vidno v appke ticho), podpora nad 100 DEED a euro (FIAT) áno, akčné (priateľstvo, pripomienka, vyhodnotenie) áno. Všetko nastaviteľné.
        </div>
      </div>
    </>
  );
}

const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
