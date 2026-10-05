// Doplnky 5. 10. (C1, C3) · platba organizácie (Topovať, Predĺžiť, doplnky) — nikdy na jeden klik.
// Výber (dlaždica) → pod ním zhrnutie: čo, suma, kto platí, kam príde faktúra, Karta / DeeD organizácie
// → „Podrž a zaplať X €" (0,9 s) · Zrušiť → zelené potvrdenie s odkazom na faktúru (PDF).
// Bez fakturačných údajov sa platba nespustí: „Najprv doplňte fakturačné údaje ›".
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { vystavFakturu, otvorFakturu, type FakturaOrg } from "@/lib/fakturyOrg";
import { fakturacneUdaje } from "./NastaveniaCharity";

const eur = (n: number) => `${n.toLocaleString("sk-SK")} €`;
const SPOSOBY: [string, string][] = [["Karta organizácie", "Visa •• 4521"], ["DeeD organizácie", "z peňaženky"]];

export function PlatbaOrganizacie({ co, cena, onZaplatene, onZrus, onUdaje }: {
  co: string; cena: number;
  onZaplatene: (fa: FakturaOrg) => void;
  onZrus: () => void;
  /** otvorí Nastavenia → Údaje organizácie */
  onUdaje?: () => void;
}) {
  const [sp, setSp] = useState(0);
  const [drz, setDrz] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const ud = fakturacneUdaje();
  const zacni = () => {
    if (!ud) return;
    setDrz(true); window.clearTimeout(tm.current);
    tm.current = window.setTimeout(() => {
      setDrz(false);
      onZaplatene(vystavFakturu({ co, suma: cena, sposob: `${SPOSOBY[sp][0]} · ${SPOSOBY[sp][1]}`, odberatel: ud }));
    }, 900);
  };
  const pusti = () => { window.clearTimeout(tm.current); setDrz(false); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 16, background: "var(--panel)", border: "1px solid var(--goldBd)", color: "var(--ink)" }}>
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <b style={{ fontSize: 15 }}>{co}</b>
        <b style={{ fontSize: 24, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{eur(cena)}</b>
      </span>
      {ud ? <>
        <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>Platí organizácia, nie zbierka. Z vyzbieraných peňazí sa nič neberie. Faktúru vystavíme na {ud.nazov} a príde na {ud.email}.</span>
        <div role="radiogroup" aria-label="Spôsob platby" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SPOSOBY.map(([t, s], i) => { const on = sp === i; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setSp(i)} style={{ height: 52, borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--ink)", boxShadow: "none", fontFamily: "inherit" }}>
              <b style={{ fontSize: 14 }}>{t}</b><span style={{ fontSize: 11.5, color: "var(--ink3)" }}>{s}</span>
            </button>); })}
        </div>
        <button type="button" onPointerDown={zacni} onPointerUp={pusti} onPointerLeave={pusti} onPointerCancel={pusti}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") pusti(); }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ position: "relative", height: 56, border: "none", borderRadius: 16, background: "#2F5E3A", overflow: "hidden", cursor: "pointer", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", boxShadow: "none", fontFamily: "inherit" } as CSSProperties}>
          <span style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#4B7A35,#8DB866)", transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? ".9s" : ".2s"} linear` }} />
          <span style={{ position: "relative", fontSize: 16, fontWeight: 800, color: "#fff" }}>Podrž a zaplať {eur(cena)}</span>
        </button>
      </> : <>
        <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>Platí organizácia, nie zbierka. Ku každej platbe vystavíme faktúru, preto potrebujeme fakturačné údaje.</span>
        {onUdaje ? <button type="button" onClick={onUdaje} style={{ minHeight: 48, padding: "0 16px", borderRadius: 14, border: "1.5px solid var(--green)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>Najprv doplňte fakturačné údaje ›</button>
          : <b style={{ fontSize: 14.5, color: "var(--ink)" }}>Najprv doplňte fakturačné údaje v Nastavenia → Údaje organizácie.</b>}
      </>}
      <button type="button" onClick={onZrus} style={{ height: 44, border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "var(--ink3)", boxShadow: "none", fontFamily: "inherit" }}>Zrušiť</button>
    </div>
  );
}

/** zelené potvrdenie po zaplatení s odkazom na faktúru */
export function Zaplatene({ text, fa }: { text: string; fa?: FakturaOrg }) {
  return (
    <span role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "10px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>
      <span>{text}</span>
      {fa && <button type="button" onClick={() => otvorFakturu(fa)} style={{ minHeight: 44, padding: "0 12px", border: "none", borderRadius: 10, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Faktúra FA {fa.cislo} ›</button>}
    </span>
  );
}
