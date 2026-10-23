// ============================================================
// OPRAVY 526 (Martin 23. 10.) · „Po naplnení cieľa zbierku automaticky uzavrieť“ — predvolene zapnuté (server 0168).
// Zapnuté: keď suma dosiahne cieľ, dary sa zastavia a začne lehota na dokladovanie (ako ručné „Ukončiť · Cieľ je splnený“),
// správcovi príde upozornenie, poďakuje sám. Dar, ktorý cieľ prekročí, sa pripíše celý. Vypnuté: beží, kým ju neukončí ručne.
// Len zbierka s cieľom — centrálna, sektorové a otvorené ho nemajú.
// ============================================================
import { useState, type CSSProperties } from "react";
import { Prepinac } from "@/features/profil/nastUi";

export const AUTO_UZAVRIET_T = "Po naplnení cieľa zbierku automaticky uzavrieť";
export const autoUzavrietPopis = (on: boolean) => on
  ? "Keď suma dosiahne cieľ, dary sa zastavia a začne lehota na dokladovanie. Dar, ktorý cieľ prekročí, sa pripíše celý. Darcom poďakujete sami."
  : "Zbierka beží ďalej aj po dosiahnutí cieľa, kým ju neukončíte.";

/** riadok s prepínačom (formulár aj Správa) */
export function RiadokAutoUzavriet({ on, onZmena, pracuje, chyba }: { on: boolean; onZmena: (on: boolean) => void; pracuje?: boolean; chyba?: string | null }) {
  const tl: CSSProperties = { display: "flex", alignItems: "center", gap: 14, width: "100%", minHeight: 56, padding: 0, border: "none", background: "transparent", cursor: pracuje ? "default" : "pointer", fontFamily: "inherit", textAlign: "left", color: "var(--ink)", opacity: pracuje ? 0.6 : 1 };
  return (<>
    <button type="button" role="switch" aria-checked={on} disabled={pracuje} onClick={() => onZmena(!on)} style={tl}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <b style={{ fontSize: 16 }}>{AUTO_UZAVRIET_T}</b>
        <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>{autoUzavrietPopis(on)}</span>
      </span>
      <Prepinac on={on} />
    </button>
    {chyba && <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: "#A34A2A" }}>{chyba}</span>}
  </>);
}

/** karta v Správe zbierky — zmena hneď na serveri */
export function KartaAutoUzavriet({ zapnute, uloz, styl }: { zapnute: boolean; uloz: (on: boolean) => Promise<string | null>; styl: CSSProperties }) {
  const [on, setOn] = useState(zapnute);
  const [pracuje, setPracuje] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const zmen = async (v: boolean) => {
    setPracuje(true); setChyba(null); setOk(false); setOn(v);
    const e = await uloz(v);
    setPracuje(false);
    if (e) { setOn(!v); setChyba(e); } else setOk(true);
  };
  return (
    <section style={styl}>
      <RiadokAutoUzavriet on={on} onZmena={(v) => void zmen(v)} pracuje={pracuje} chyba={chyba} />
      {ok && <b role="status" style={{ alignSelf: "flex-end", fontSize: 13.5, color: "var(--gInk, #2F5A22)" }}>Uložené ✓</b>}
    </section>);
}
