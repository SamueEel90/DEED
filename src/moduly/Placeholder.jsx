import { C } from "../theme";
import { Aura } from "../shared";

/*
  ============================================================
  PLACEHOLDER MODULY — Výzva / Mapa / Top (v príprave)
  ukazujú, že spodné menu je modulárne a dá sa rozširovať
  ============================================================
*/

const INFO = {
  vyzva: {
    ikona: "★", nazov: "Výzva", farba: "#F0A85E",
    popis: "Komunitné výzvy a súťaže v konaní dobra — týždenné misie, tímové výzvy firiem, odmeny v DEED.",
    ukazka: [
      ["🌳", "Výzva týždňa", "Vysaď strom vo svojej štvrti · 240 zapojených"],
      ["🏃", "Firemná výzva — Kaufland", "10 000 km pre dobro · beží do nedele"],
      ["🩸", "Daruj krv", "Mestská výzva · nemocnica TN · +150 DEED"],
    ],
  },
  mapa: {
    ikona: "🗺", nazov: "Mapa", farba: "#5BA8F0",
    popis: "Pomoc a skutky v okolí na mape — nastavíš si rádius, vidíš kto potrebuje pomoc pár ulíc od teba.",
    ukazka: [
      ["📍", "Sihoť · 400 m", "Žiadosť: odvoz k lekárovi (Jozef M.)"],
      ["📍", "Juh · 1,2 km", "Dobrovoľníctvo: výsadba stromov (Stromosvet)"],
      ["📍", "Zámostie · 2 km", "Zbierka: Rodina Kováčová · 65 %"],
    ],
  },
  top: {
    ikona: "🏆", nazov: "Top", farba: "#E7C766",
    popis: "Rebríčky darcov, hrdinov a B2B partnerov — mesto, štvrť, celé Slovensko.",
    ukazka: [
      ["♛", "Lukáš H.", "Top darca · 1 850 DEED tento mesiac"],
      ["★", "Jana N.", "Top hrdina · 23 overených skutkov"],
      ["▼", "Kaufland", "Top B2B partner · 12 400 € · ESG report"],
    ],
  },
};

export default function ModulPlaceholder({ id }) {
  const m = INFO[id] || INFO.vyzva;
  return (
    <div style={{ minHeight: "100%", padding: "40px 22px 24px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Aura size={88} hrubka={2}>
          <span style={{ fontSize: 32, color: m.farba }}>{m.ikona}</span>
        </Aura>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>{m.nazov}</div>
      <div style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: m.farba, border: `1px solid ${m.farba}55`, borderRadius: 14, padding: "3px 11px", marginTop: 8 }}>MODUL V PRÍPRAVE</div>
      <div style={{ fontSize: 13.5, color: C.textSec, lineHeight: 1.55, marginTop: 14, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>{m.popis}</div>

      <div style={{ marginTop: 26, textAlign: "left", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
        <div style={{ fontSize: 10, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>UKÁŽKA OBSAHU</div>
        {m.ukazka.map((u, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13, padding: "12px 14px", marginBottom: 9, opacity: .75 }}>
            <span style={{ fontSize: 18, flex: "0 0 auto", color: m.farba }}>{u[0]}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u[1]}</div>
              <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>{u[2]}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
