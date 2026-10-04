// KARTA 47 · stránka, kam vedie QR / odkaz zo streamu: deed.sk/z/{zbierka}?s={stream}. 1 : 1 podľa „Stream - QR na zbierku.dc.html".
// Vedie rovno na zbierku (nie na tvorcu). Pás „{tvorca} vysiela naživo" · prehrávač u nás (YouTube až po ťuku) · počítadlo
// POČAS VYSIELANIA (nové dary každé 4 s) → po skončení STREAM VYZBIERAL · zbierka · „V streame sa ukážeš ako" · platobný modul
// hneď otvorený (bez dorovnania). Neregistrovaný je v streame vždy Anonymný darca, bez registrácie pred platbou.
// PC (≥ 1200): max. 1160 px, vpravo lepkavý stĺpec 440 px. Mobil a tablet pod sebou.
import { useEffect, useState, type CSSProperties } from "react";
import type { TestProfil } from "@/lib/testProfily";
import { STREAMY, STREAM_ZBIERKY } from "@/lib/testTvorca";
import { jeNeregistrovany, sledujDarcu } from "@/lib/devDarca";
import { usePouzivatel } from "@/lib/pouzivatel";
import { TESTOVACIA } from "@/lib/testovacia";
import { DOK, PribehText } from "./casti";
import { ModulPlatby } from "./ModulProfilu";
import { PRUH } from "./charitaCasti";

const PC = "(min-width: 1200px)";
function usePc() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia(PC).matches);
  useEffect(() => { const q = window.matchMedia(PC), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}
const eurT = (n: number) => `${n.toLocaleString("sk-SK")} €`;
const karta: CSSProperties = { background: "var(--card)", border: "1px solid var(--cardBd)" };

/** onBack = prišiel z appky (Späť vráti, odkiaľ prišiel) · onTvorca = prišiel cez QR / odkaz („{tvorca} ›" otvorí profil tvorcu) */
export function StreamZbierka({ profil, streamId, onBack, onTvorca }: { profil: TestProfil; streamId: string; onBack?: () => void; onTvorca?: () => void }) {
  const pc = usePc();
  const st = STREAMY[streamId];
  const zb = st ? STREAM_ZBIERKY[st.zbierka] : undefined;
  const [po, setPo] = useState(false);
  const [hra, setHra] = useState(false);
  const [meno, setMeno] = useState(0);
  const [live, setLive] = useState(0), [liveOp, setLiveOp] = useState(1);
  const [registrovany, setRegistrovany] = useState(() => !jeNeregistrovany());
  useEffect(() => sledujDarcu(() => setRegistrovany(!jeNeregistrovany())), []);
  const ja = usePouzivatel();
  useEffect(() => {
    if (po) return;
    let t2: number | undefined;
    const t = window.setInterval(() => { setLiveOp(0); t2 = window.setTimeout(() => { setLive((x) => x + 1); setLiveOp(1); }, 320); }, 4000);
    return () => { window.clearInterval(t); window.clearTimeout(t2); };
  }, [po]);
  if (!st || !zb) return null;

  const anonym = !registrovany || meno === 1;
  const mojeMeno = `${ja.meno} ${(ja.priezvisko || "").slice(0, 1)}.`.trim();
  const bodka = po ? "#85867B" : "#E5483A", bodkaAnim = po ? "none" : "vpPulz 1.2s ease infinite";
  const [ls, lt] = st.live[live % st.live.length];

  const tlHore: CSSProperties = { alignSelf: "flex-start", justifySelf: "start", height: 44, padding: onBack ? "0 14px 0 8px" : "0 14px", border: "1px solid var(--cardBd)", borderRadius: 14, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 800, color: "var(--ink)", boxShadow: "none", fontFamily: "inherit" };
  const hore = onBack
    ? <button type="button" onClick={onBack} aria-label="Späť" style={tlHore}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť</button>
    : onTvorca ? <button type="button" onClick={onTvorca} style={tlHore}>{st.tvorca} ›</button> : null;

  const pas = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 16, background: "#1D211B", color: "#fff" }}>
      <span style={{ flex: "none", width: 10, height: 10, borderRadius: "50%", background: bodka, animation: bodkaAnim }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <b style={{ fontSize: 14 }}>{po ? `${st.tvorcaKratko} vysielal pre túto zbierku` : `${st.tvorca} vysiela naživo`}</b>
        <span style={{ fontSize: 12, opacity: 0.75 }}>{po ? `${st.platforma} · ${st.datum} · ${st.dlzka}` : `${st.platforma} · sleduje ${st.divaci.toLocaleString("sk-SK")} ľudí`}</span>
      </span>
      <button type="button" style={{ flex: "none", height: 40, padding: "0 14px", border: "none", borderRadius: 12, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "none", fontFamily: "inherit" }}>{po ? `Záznam na ${st.platforma}` : "Späť na stream"} ↗</button>
    </div>
  );

  const pocitadlo = (
    <div style={{ borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: bodka, animation: bodkaAnim }} /><b style={{ fontSize: 11.5, letterSpacing: ".08em", color: "var(--gold)" }}>{po ? "STREAM VYZBIERAL" : "POČAS VYSIELANIA"}</b></span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 30, lineHeight: 1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{eurT(po ? st.sumaKoniec : st.suma)}</b>
        <span style={{ fontSize: 14, color: "var(--ink2)", whiteSpace: "nowrap" }}>od {po ? st.ludiaKoniec : st.ludia} ľudí</span>
      </span>
      {po
        ? <span style={{ fontSize: 13, color: "var(--ink2)" }}>Zbierka beží ďalej. Daruj aj teraz.</span>
        : <span aria-live="polite" style={{ fontSize: 13, color: "var(--ink2)", opacity: liveOp, transition: "opacity .3s" }}><b style={{ color: "var(--gInk)" }}>{ls}</b> {lt}</span>}
    </div>
  );

  const prehravac = (
    <div style={{ borderRadius: 22, overflow: "hidden", background: "#000", border: "1px solid var(--cardBd)" }}>
      <button type="button" onClick={() => setHra((x) => !x)} aria-label={hra ? "Zastaviť" : "Prehrať"} style={{ position: "relative", display: "block", width: "100%", aspectRatio: "16/9", padding: 0, border: "none", cursor: "pointer", background: `url('${st.nahlad}') center/cover #111`, boxShadow: "none" }}>
        <span style={{ position: "absolute", inset: 0, background: `rgba(10,8,5,${hra ? 0 : 0.35})` }} />
        <span style={{ position: "absolute", left: 12, top: 12, height: 26, padding: "0 10px", borderRadius: 13, background: po ? "rgba(10,8,5,.75)" : "#E5483A", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{po ? `ZÁZNAM · ${st.dlzka}` : `NAŽIVO · ${st.divaci.toLocaleString("sk-SK")}`}</span>
        {!hra && <span style={{ position: "absolute", left: "50%", top: "50%", width: 64, height: 46, margin: "-23px 0 0 -32px", borderRadius: 14, background: "rgba(10,8,5,.75)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>}
        {hra && <span style={{ position: "absolute", left: 12, right: 12, bottom: 12, height: 4, borderRadius: 2, background: "rgba(255,255,255,.3)" }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 2, background: "#E5483A", transformOrigin: "0 50%", transform: `scaleX(${po ? 0.18 : 1})` }} /></span>}
      </button>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: "var(--card)" }}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <b style={{ fontSize: 14.5, color: "var(--ink)" }}>{po ? `Záznam streamu pre ${zb.komu}` : "Pozri stream tu, bez odchodu"}</b>
          <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{po ? `${st.tvorca} · ${st.datum} · pozri, ako to celé vzniklo` : `${st.tvorca} hrá pre ${zb.komu}`}</span>
        </span>
      </div>
      <span style={{ display: "block", padding: "0 14px 10px", background: "var(--card)", fontSize: 11.5, color: "var(--ink3)" }}>Prehrávač {st.platforma} sa načíta až po ťuku.</span>
    </div>
  );

  const zbierka = (
    <article style={{ borderRadius: 22, overflow: "hidden", ...karta }}>
      <span style={{ display: "block", height: pc ? 320 : 180, background: `url('${zb.foto}') center 25%/cover no-repeat #3a3530` }} />
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{zb.stitok}</span>
        <b style={{ fontSize: 22, lineHeight: 1.2 }}>{zb.nazov}</b>
        <PribehText text={zb.pribeh} riadky={4} />
        <span style={{ display: "block", height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, zb.vyzbierane / zb.ciel)})` }} /></span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}><b style={{ fontSize: 19 }}>{eurT(zb.vyzbierane)}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>z {eurT(zb.ciel)} · {zb.ludia} ľudí</span></span>
        <span style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 8, borderTop: "1px solid var(--cardBd)" }}>
          <span style={{ flex: "none", width: 36, height: 36, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#3F6E2A" }}>{zb.charitaSkratka}</span>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>Za zbierku zodpovedá <b style={{ color: "var(--ink)" }}>{zb.charita}</b> · overené</span>
        </span>
      </div>
    </article>
  );

  const ukazes = (
    <div style={{ borderRadius: 18, ...karta, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <b style={{ fontSize: 14 }}>V streame sa ukážeš ako</b>
      {registrovany && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[mojeMeno, "Anonymne"].map((t, i) => {
          const on = meno === i;
          return <button key={t} type="button" aria-pressed={on} onClick={() => setMeno(i)} style={{ height: 48, borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "var(--ink)", boxShadow: "none", fontFamily: "inherit" }}>{t}</button>;
        })}
      </div>}
      <span style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#1D211B", color: "#fff" }}>
        <span style={{ flex: "none", position: "relative", width: 24, height: 24, overflow: "hidden" }}><span style={{ position: "absolute", left: 0, top: 0, width: 240, height: 24, background: "url('/svetlusik-let.png') 0 0/100% 100% no-repeat" }} /></span>
        <span style={{ fontSize: 13 }}>Náhľad v streame: <b>{anonym ? "Anonymný darca" : mojeMeno} · 10 €</b></span>
      </span>
    </div>
  );

  const modul = <ModulPlatby profil={{ ...profil, meno: zb.charita }} sektor={zb.modul} dorovnanie={false} nazov={zb.nazov} />;
  const prepinac = TESTOVACIA && (
    <div role="group" aria-label="Stav streamu (test)" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink3)", marginRight: 2 }}>Test:</span>
      {([["Vysiela naživo", false], ["Stream skončil", true]] as const).map(([t, v]) => {
        const on = po === v;
        return <button key={t} type="button" aria-pressed={on} onClick={() => { setPo(v); setHra(false); }} style={{ height: 44, padding: "0 14px", borderRadius: 22, border: on ? "none" : "1.5px solid #4E7D37", background: on ? "#1D211B" : "#fff", color: on ? "#fff" : "#3F6E2A", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "none" }}>{t}</button>;
      })}
    </div>
  );

  if (pc) return (
    <div className="vp sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ position: "relative", height: "100%", overflowY: "auto", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 32px 80px", display: "flex", flexDirection: "column", gap: 18 }}>
        {hore}{pas}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 440px", gap: 28, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{prehravac}{zbierka}{prepinac}</div>
          <aside style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 12 }}>{pocitadlo}{ukazes}{modul}</aside>
        </div>
      </div>
    </div>
  );
  return (
    <div className="vp sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ position: "relative", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "var(--bg)" } as CSSProperties}>
      <div style={{ padding: `max(14px, env(safe-area-inset-top)) 14px ${DOK + 24}px`, display: "grid", gridTemplateColumns: "minmax(0,1fr)", gridAutoRows: "max-content", alignContent: "start", gap: 12 }}>
        {hore}{pas}{pocitadlo}{prehravac}{zbierka}{ukazes}{modul}{prepinac}
      </div>
    </div>
  );
}
