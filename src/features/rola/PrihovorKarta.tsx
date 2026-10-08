// ============================================================
// KARTA 57 C.7 — Príhovor farára · Iskra a C.8 · OPRAVY 177 Online omše — obe v Oznamoch hore (Online pod Príhovorom).
// Obe karty sa dajú zbaliť ⌃ ⌄, po načítaní sú zbalené (jeden riadok so zhrnutím). Na mobile popis pod nadpisom na celú šírku.
// ============================================================
import { useState, type CSSProperties, type ReactNode } from "react";
import { PRIHOVOR_MAX_S, nahrajPrihovor, prihovor, zmazPrihovor, useZmenyPrihovoru, onlineOmse, ulozOnline, odkazOk, omseNaDen, pravidloPlati, textPravidla, type PravidloOnline } from "@/lib/prihovor";
import { useKalendar, dniTyzdna, dvt, iso, DNI_K } from "@/lib/kalendarFarnosti";

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
/** OPRAVY 177: zbaliteľná karta — zbalená = jeden riadok so zhrnutím */
function Zbalitelna({ label, ikona, nadpis, popis, zhrnutie, mobil, children }: { label: string; ikona: ReactNode; nadpis: string; popis: string; zhrnutie: string; mobil: boolean; children: ReactNode }) {
  const [otv, setOtv] = useState(false);
  return (
    <section aria-label={label} style={{ ...karta, padding: mobil ? "12px 14px" : "14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <button type="button" onClick={() => setOtv((o) => !o)} aria-expanded={otv} style={{ display: "flex", flexWrap: mobil ? "wrap" : "nowrap", alignItems: "center", gap: mobil ? 10 : 14, padding: 0, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
        {ikona}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 16 }}>{nadpis}</b>
          {!mobil && <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{otv ? popis : zhrnutie}</span>}
          {mobil && !otv && <span style={{ fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{zhrnutie}</span>}
        </span>
        <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>{otv ? "⌃" : "⌄"}</span>
        {mobil && otv && <span style={{ flex: "1 1 100%", fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{popis}</span>}
      </button>
      {otv && children}
    </section>);
}

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
  const ikona = (
    <span aria-hidden="true" style={{ flex: "none", width: mobil ? 44 : 56, height: mobil ? 44 : 56, borderRadius: "50%", padding: 3, background: p ? "conic-gradient(#C9A24A,#4B7A35,#C9A24A)" : "transparent", border: p ? "none" : "2.5px solid #C9A24A", boxSizing: "border-box" }}>
      <span style={{ display: "flex", width: "100%", height: "100%", borderRadius: "50%", background: "#1D211B", alignItems: "center", justifyContent: "center" }}>{p && <span style={{ width: 0, height: 0, borderLeft: "12px solid #fff", borderTop: "8px solid transparent", borderBottom: "8px solid transparent", marginLeft: 3 }} />}</span>
    </span>);
  return (
    <Zbalitelna label="Príhovor farára" ikona={ikona} nadpis="Príhovor farára · Iskra" mobil={mobil}
      popis={`Krátke video do ${PRIHOVOR_MAX_S} s: príhovor, prianie k sviatku. Ukáže sa len na stránke farnosti, hore v krúžku.`}
      zhrnutie={p ? `Príhovor je na stránke · ${Math.round(p.sek)} s` : "Zatiaľ bez príhovoru"}>
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
    </Zbalitelna>);
}

/** OPRAVY 177: Online omše — prepínač, odkaz (YouTube, Facebook), dni tohto týždňa s časmi z rozpisu; pri každej vybranej
 *  Každý týždeň / Len tento deň a × zruší. Čas sa mení v Omšiach, sem sa prevezme sám (pravidlo drží kód omše). */
export function OnlineOmseKarta({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  useZmenyPrihovoru(); useKalendar(strankaId);
  const o = onlineOmse(strankaId);
  const zmen = (z: Partial<typeof o>) => ulozOnline(strankaId, { ...o, ...z });
  const zly = !!o.url.trim() && !odkazOk(o.url);
  const dni = dniTyzdna(0).map((d) => ({ d, omse: omseNaDen(strankaId, d) }));
  const vybrana = (d: Date, x: { kod: number; t: string }) => o.rules.some((r) => pravidloPlati(r, d, x));
  const pridaj = (d: Date, x: { kod: number; t: string }) => zmen({ rules: [...o.rules, { wd: dvt(d), d: iso(d), t: x.t, kod: x.kod, kazdy: true }] });
  const zrus = (d: Date, x: { kod: number; t: string }) => zmen({ rules: o.rules.filter((r) => !pravidloPlati(r, d, x)) });
  // čas pravidla z tohto týždňa (posunutá omša s novým časom)
  const casTeraz = (r: PravidloOnline) => { const den = dni.find((x) => (r.kazdy ? dvt(x.d) === r.wd : iso(x.d) === r.d)); return den?.omse.find((x) => (r.kod != null ? x.kod === r.kod : x.t === r.t))?.t; };
  const ikona = <span aria-hidden="true" style={{ flex: "none", height: 24, padding: "0 8px", borderRadius: 7, background: "#B3261E", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center" }}>NAŽIVO</span>;
  const zhrnutie = !o.on ? "Vypnuté" : !odkazOk(o.url) ? "Chýba odkaz na vysielanie" : o.rules.length ? o.rules.map((r) => textPravidla(r, casTeraz(r))).join(" · ") : "Zatiaľ nevysielate žiadnu omšu";
  const tl = (on: boolean): CSSProperties => ({ minHeight: 40, padding: "0 12px", borderRadius: 10, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, color: on ? "var(--gInk)" : "var(--ink)", boxShadow: "none" });
  return (
    <Zbalitelna label="Online omše" ikona={ikona} nadpis="Online omše" mobil={mobil} zhrnutie={zhrnutie}
      popis="Vysielate omšu? Vložte odkaz (YouTube, Facebook). Pri omši sa ukáže Pozrieť naživo.">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: 800 }}>Vysielame omše online</span>
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
        <span style={{ fontSize: 14, fontWeight: 800 }}>Ktoré omše vysielate · ťuknite na čas</span>
        {dni.some((x) => x.omse.length) ? <div style={{ display: "flex", flexDirection: "column" }}>
          {dni.map(({ d, omse }, i) => (
            <div key={iso(d)} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 50, padding: "4px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <span style={{ width: 74, flex: "none", fontSize: 14, fontWeight: 800 }}>{DNI_K[dvt(d)]} {d.getDate()}. {d.getMonth() + 1}.</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {omse.length ? omse.map((x) => { const on = vybrana(d, x); return <button key={x.kod} type="button" aria-pressed={on} onClick={() => (on ? zrus(d, x) : pridaj(d, x))} style={tl(on)}>{on ? "▶ " : ""}{x.t}</button>; })
                  : <span style={{ fontSize: 13, color: "var(--ink3)" }}>bez omše</span>}
              </span>
            </div>))}
        </div> : <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Najprv nastavte rozvrh omší v Omšiach. Potom tu vyberiete, ktoré vysielate.</span>}
        {o.rules.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Vysielate</span>
          {o.rules.map((r, i) => (
            <div key={`${r.wd}-${r.d}-${r.kod ?? r.t}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "6px 0", borderTop: "1px solid var(--cardBd)" }}>
              <b style={{ flex: "1 1 160px", fontSize: 14.5 }}>{textPravidla(r, casTeraz(r))}</b>
              <span role="radiogroup" aria-label="Ako často" style={{ display: "flex", gap: 4 }}>
                <button type="button" role="radio" aria-checked={r.kazdy} onClick={() => zmen({ rules: o.rules.map((y, j) => (j === i ? { ...y, kazdy: true } : y)) })} style={tl(r.kazdy)}>Každý týždeň</button>
                <button type="button" role="radio" aria-checked={!r.kazdy} onClick={() => zmen({ rules: o.rules.map((y, j) => (j === i ? { ...y, kazdy: false } : y)) })} style={tl(!r.kazdy)}>Len tento deň</button>
              </span>
              <button type="button" onClick={() => zmen({ rules: o.rules.filter((_, j) => j !== i) })} aria-label={`Zrušiť: ${textPravidla(r, casTeraz(r))}`} style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", border: "none", background: "var(--cRedBg)", color: "#fff", cursor: "pointer", fontSize: 19, fontWeight: 800, lineHeight: 1, padding: 0 }}>×</button>
            </div>))}
        </div>}
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Čas sa mení v Omšiach, sem sa prevezme sám. Keď omša beží, na stránke svieti hore červené NAŽIVO a pri omši „▶ aj online“. Veriacim, čo sledujú farnosť, príde 10 minút vopred upozornenie.</span>
      </>}
    </Zbalitelna>);
}
