// ============================================================
// OPRAVY 397 (Viera) · Farár v Správe pri brigáde, udalosti a ozname s prihlásením vidí celý zoznam:
// „Prihlásení · N z limitu“, riadok meno · ako sa prihlásil · kedy, Napísať prihláseným (Oznámenia, ako Poďakovať darcom 349)
// a Stiahnuť zoznam (tlač alebo PDF, napr. do autobusu).
// ============================================================
import { useState, type CSSProperties } from "react";
import { napisPrihlasenym, stiahniZoznam } from "@/lib/prihlaseniFarnosti";

const ZELENA = "#4B7A35", CERV = "#A34A2A";
const kedyT = (ms?: number) => { if (!ms) return ""; const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function PrihlaseniFarara({ strankaId, refId, nazov, rezim, limit, zoznam, mena, kedy, menaVer, onMenaVer }: {
  /** mená prihlásených na stránke: Ukázať (true) · Len pre mňa (false) */ menaVer: boolean; onMenaVer: (v: boolean) => void;
  strankaId: string; refId: string; nazov: string; /** 1 nezáväzne (Zúčastním sa / Prídem) · 2 záväzne (Prihlásiť sa) */ rezim: 1 | 2; limit?: number;
  zoznam: string[]; mena?: Record<string, string>; kedy?: Record<string, number>;
}) {
  const [otv, setOtv] = useState(false);
  const [pis, setPis] = useState(false);
  const [txt, setTxt] = useState("");
  const [st, setSt] = useState<{ k: "busy" } | { k: "ok"; n: number } | { k: "err"; e: string } | null>(null);
  const ako = rezim === 2 ? "Záväzne" : "Nezáväzne · Zúčastním sa";
  const riadky = [...zoznam].sort((a, b) => (kedy?.[a] ?? 0) - (kedy?.[b] ?? 0)).map((k): [string, string, string] => [mena?.[k] ?? "veriaci", ako, kedyT(kedy?.[k])]);
  const n = zoznam.length;
  const hlavicka = `${rezim === 2 ? "Prihlásení" : "Zúčastní sa"} · ${n}${limit ? ` z ${limit}` : ""}`;
  const tl: CSSProperties = { minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)", boxShadow: "none" };
  const posli = async () => {
    const t = txt.trim();
    if (!t || st?.k === "busy") return;
    setSt({ k: "busy" });
    const v = await napisPrihlasenym(strankaId, refId, t.slice(0, 1500));
    setSt("e" in v ? { k: "err", e: v.e } : { k: "ok", n: v.n });
    if (!("e" in v)) setTxt("");
  };
  const seg = (on: boolean): CSSProperties => ({ flex: 1, minHeight: 40, padding: "0 12px", border: "none", borderRadius: 10, background: on ? ZELENA : "transparent", color: on ? "#fff" : "var(--ink2)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, boxShadow: "none" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Mená prihlásených</span>
        <span role="radiogroup" aria-label="Mená prihlásených" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 12, background: "var(--btn)", minWidth: 220 }}>
          <button type="button" role="radio" aria-checked={menaVer} onClick={() => onMenaVer(true)} style={seg(menaVer)}>Ukázať</button>
          <button type="button" role="radio" aria-checked={!menaVer} onClick={() => onMenaVer(false)} style={seg(!menaVer)}>Len pre mňa</button>
        </span>
      </div>
      <button type="button" aria-expanded={otv} onClick={() => setOtv((o) => !o)} disabled={!n}
        style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: n ? "pointer" : "default", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: n ? "var(--green)" : "var(--ink3)", boxShadow: "none" }}>
        {n ? `${hlavicka} ${otv ? "⌃" : "⌄"}` : `${hlavicka} · zatiaľ nikto`}
      </button>
      {otv && n > 0 && <>
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--cardBd)" }}>
          {riadky.map(([m, a, k], i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", padding: "9px 0", borderBottom: "1px solid var(--cardBd)" }}>
              <b style={{ flex: "1 1 160px", minWidth: 0, fontSize: 14.5 }}>{m}</b>
              <span style={{ fontSize: 13, color: "var(--ink2)" }}>{a}</span>
              {k && <span style={{ fontSize: 13, color: "var(--ink3)" }}>{k}</span>}
            </div>))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { setPis((p) => !p); setSt(null); }} aria-expanded={pis} style={tl}>Napísať prihláseným</button>
          <button type="button" onClick={() => { if (!stiahniZoznam(nazov, `${hlavicka} · ${new Date().toLocaleDateString("sk-SK")}`, riadky)) setSt({ k: "err", e: "Prehliadač zablokoval nové okno · povoľte okná pre túto stránku" }); }} style={tl}>Stiahnuť zoznam</button>
        </div>
        {pis && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea value={txt} onChange={(e) => { setTxt(e.target.value); setSt(null); }} rows={3} maxLength={1500} aria-label="Správa prihláseným"
            placeholder="Napríklad: Stretneme sa o 8:00 pri kostole, rukavice prineste."
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, resize: "vertical" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void posli()} disabled={!txt.trim() || st?.k === "busy"}
              style={{ minHeight: 46, padding: "0 18px", border: "none", borderRadius: 12, background: txt.trim() ? ZELENA : "var(--btn)", color: txt.trim() ? "#fff" : "var(--ink3)", cursor: txt.trim() ? "pointer" : "default", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, boxShadow: "none" }}>
              {st?.k === "busy" ? "Posielam …" : `Poslať ${n === 1 ? "1 prihlásenému" : `${n} prihláseným`}`}
            </button>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Príde im do Oznámení.</span>
          </div>
        </div>}
        {st?.k === "ok" && <span role="status" style={{ fontSize: 14, fontWeight: 700, color: "var(--gInk)" }}>Odoslané ✓ {st.n === 1 ? "1 prihlásenému" : `${st.n} prihláseným`}</span>}
        {st?.k === "err" && <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: CERV }}>{st.e}</span>}
      </>}
    </div>);
}
