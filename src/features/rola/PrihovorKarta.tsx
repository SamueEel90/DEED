// ============================================================
// KARTA 57 C.7 — Príhovor farára · Iskra (karta hore v Oznamoch) a C.8 Online omše (v Omšiach).
// ============================================================
import { useState, type CSSProperties } from "react";
import { PRIHOVOR_MAX_S, nahrajPrihovor, prihovor, zmazPrihovor, useZmenyPrihovoru, onlineOmse, ulozOnline, volbyOnline, odkazOk } from "@/lib/prihovor";
import { useKalendar } from "@/lib/kalendarFarnosti";

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const casT = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} o ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };

export function PrihovorKarta({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  useZmenyPrihovoru();
  const p = prihovor(strankaId);
  const [nahrava, setNahrava] = useState(false);
  const [chyba, setChyba] = useState("");
  const vyber = async (f?: File | null) => {
    if (!f) return;
    setChyba(""); setNahrava(true);
    const e = await nahrajPrihovor(strankaId, f);
    setNahrava(false); if (e) setChyba(e);
  };
  const tl = (zelene: boolean): CSSProperties => ({ flex: 1, minWidth: mobil ? 0 : 200, minHeight: 60, padding: "8px 14px", borderRadius: 14, border: zelene ? "none" : "2px dashed var(--gBd)", background: zelene ? "#4B7A35" : "transparent", color: zelene ? "#fff" : "var(--gInk)", cursor: nahrava ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, textAlign: "center", fontFamily: "inherit", opacity: nahrava ? 0.6 : 1 });
  return (
    <section aria-label="Príhovor farára" style={{ ...karta, padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span aria-hidden="true" style={{ flex: "none", width: 56, height: 56, borderRadius: "50%", padding: 3, background: p ? "conic-gradient(#C9A24A,#4B7A35,#C9A24A)" : "transparent", border: p ? "none" : "2.5px solid #C9A24A", boxSizing: "border-box" }}>
          <span style={{ display: "flex", width: "100%", height: "100%", borderRadius: "50%", background: "#1D211B", alignItems: "center", justifyContent: "center" }}>{p && <span style={{ width: 0, height: 0, borderLeft: "12px solid #fff", borderTop: "8px solid transparent", borderBottom: "8px solid transparent", marginLeft: 3 }} />}</span>
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 16 }}>Príhovor farára · Iskra</b>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>Krátke video do {PRIHOVOR_MAX_S} s: príhovor, prianie k sviatku. Ukáže sa len na stránke farnosti, hore v krúžku.</span>
        </span>
      </div>
      {p ? <>
        <video src={p.src} controls playsInline preload="metadata" style={{ display: "block", width: "100%", maxWidth: 360, maxHeight: 420, borderRadius: 14, background: "#000", alignSelf: mobil ? "center" : "flex-start" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 15, color: "var(--gInk)" }}>Príhovor je na stránke ✓</b>
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>{Math.round(p.sek)} s · {casT(p.cas)}{p.lokalne ? " · len v tejto relácii" : ""}</span>
          </span>
          <button type="button" onClick={() => zmazPrihovor(strankaId)} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cRed)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--cRed)", boxShadow: "none" }}>Odstrániť</button>
        </div>
      </> : <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={tl(true)}><b style={{ fontSize: 15.5 }}>{nahrava ? "Nahráva sa…" : "Natočiť teraz"}</b><span style={{ fontSize: 12.5, opacity: 0.9 }}>otvorí sa kamera</span>
          <input type="file" accept="video/*" capture="user" disabled={nahrava} onChange={(e) => { void vyber(e.target.files?.[0]); e.currentTarget.value = ""; }} style={{ display: "none" }} /></label>
        <label style={tl(false)}><b style={{ fontSize: 15.5 }}>Vybrať z telefónu</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>už natočené video</span>
          <input type="file" accept="video/*" disabled={nahrava} onChange={(e) => { void vyber(e.target.files?.[0]); e.currentTarget.value = ""; }} style={{ display: "none" }} /></label>
      </div>}
      {chyba && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "#A34A2A" }}>{chyba}</span>}
    </section>);
}

/** KARTA 57 C.8: Online omše — prepínač, odkaz (YouTube, Facebook), ktoré omše z rozvrhu */
export function OnlineOmseKarta({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  useZmenyPrihovoru(); useKalendar(strankaId);
  const o = onlineOmse(strankaId);
  const volby = volbyOnline(strankaId);
  const zmen = (z: Partial<typeof o>) => ulozOnline(strankaId, { ...o, ...z });
  const zly = !!o.url.trim() && !odkazOk(o.url);
  return (
    <section aria-label="Online omše" style={{ ...karta, padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: "none", height: 24, padding: "0 8px", borderRadius: 7, background: "#B3261E", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center" }}>NAŽIVO</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 15.5 }}>Online omše</b>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>Vysielate omšu? Vložte odkaz (YouTube, Facebook). Pri omši sa ukáže Pozrieť naživo.</span>
        </span>
        <button type="button" role="switch" aria-checked={o.on} aria-label="Online omše" onClick={() => zmen({ on: !o.on })} style={{ flex: "none", width: 52, height: 44, border: "none", background: "transparent", padding: "7px 0", cursor: "pointer", boxShadow: "none" }}>
          <span style={{ display: "block", position: "relative", width: 52, height: 30, borderRadius: 15, background: o.on ? "#4B7A35" : "var(--track)" }}>
            <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: 12, background: "#fff", transform: `translateX(${o.on ? 22 : 0}px)`, transition: "transform .2s ease" }} />
          </span>
        </button>
      </div>
      {o.on && <>
        <input value={o.url} onChange={(e) => zmen({ url: e.target.value.slice(0, 300) })} inputMode="url" placeholder="https://youtube.com/@vasafarnost/live" aria-label="Odkaz na vysielanie" aria-invalid={zly || undefined}
          style={{ height: 50, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: `${zly ? 2 : 1}px solid ${zly ? "var(--cRed)" : "var(--cardBd)"}`, fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} />
        {zly && <span role="alert" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cRed)" }}>Odkaz musí začínať https://</span>}
        <span style={{ fontSize: 14, fontWeight: 800 }}>Ktoré omše vysielate</span>
        {volby.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {volby.map((v) => { const on = o.omse.includes(v.k); return (
            <button key={v.k} type="button" aria-pressed={on} onClick={() => zmen({ omse: on ? o.omse.filter((x) => x !== v.k) : [...o.omse, v.k] })} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, color: "var(--ink)", boxShadow: "none" }}>{v.t}</button>); })}
        </div> : <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Najprv nastavte rozvrh omší. Potom tu vyberiete, ktoré vysielate.</span>}
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Keď omša beží, na stránke svieti hore červené NAŽIVO. Veriacim, čo sledujú farnosť, príde 10 minút vopred upozornenie.</span>
      </>}
    </section>);
}
