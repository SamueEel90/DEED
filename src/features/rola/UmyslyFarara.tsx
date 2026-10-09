// ============================================================
// OPRAVY 176 — Úmysly na omšu (Od veriacich, hore). Len pre farára, na stránku nejdú.
// Ťuk na úmysel = rozbalí sa (žiadne ďalšie okná) → týždenný kalendár omší z rozpisu (vzor + zmeny),
// ‹ Tento týždeň › dopredu až 12 týždňov, späť len po dnešok. Pri omši: voľná / obsadená / tento ✓.
// Ťuk na voľnú omšu = ZAPÍSANÝ ✓ a hneď Správa veriacemu (predvyplnená) · Poslať správu → „Správa poslaná ✓".
// Zapísaný: Poslať správu · Odslúžené ✓ (zbalený riadok Odslúžené · N) · Presunúť na inú omšu.
// Hore + Zapísať úmysel (osobne alebo telefonicky): text, kto, omša.
// ============================================================
import { useState, type CSSProperties } from "react";
import { odFarnikov, pridajOdFarnika, upravOdFarnika, zmazOdFarnika, type PolozkaFarnika } from "@/lib/odFarnikov";
import { useKalendar, kostolKal, omseDna, dniTyzdna, rozsahTyzdna, iso, dvt, DNI_K, minuty } from "@/lib/kalendarFarnosti";
import { PodrzZmaz } from "./OznamyFarnosti";

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const kicker: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--acc)", padding: "4px 2px 0" };
const pole: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const MAX_TYZDNOV = 12;
const terazMs = () => Date.now();
const dnesIso = () => iso(new Date());
const kedy = (cas: number) => { const d = new Date(cas); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const DNI_DLHE = ["pondelok", "utorok", "stredu", "štvrtok", "piatok", "sobotu", "nedeľu"];
const zIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const omsaText = (z: { d: string; t: string }) => { const d = zIso(z.d); return `${DNI_K[dvt(d)]} ${d.getDate()}. ${d.getMonth() + 1}. o ${z.t}`; };
const predvolenaSprava = (u: PolozkaFarnika, z: { d: string; t: string }, meno: string) => {
  const d = zIso(z.d);
  return `Dobrý deň, váš úmysel na omšu „${u.t}“ sme zapísali na ${DNI_DLHE[dvt(d)]} ${d.getDate()}. ${d.getMonth() + 1}. o ${z.t}. Pozdravujeme, ${meno}.`;
};

type Zapis = { d: string; kod: number; t: string };

/** týždenný kalendár omší z rozpisu: voľná / obsadená / tento ✓ */
function KalendarOmsi({ strankaId, vybrany, ignoruj, onVyber }: { strankaId: string; vybrany?: Zapis; ignoruj?: string; onVyber: (z: Zapis) => void }) {
  useKalendar(strankaId);
  const [off, setOff] = useState(() => {
    if (!vybrany) return 0;
    const t = dniTyzdna(0)[0].getTime(), d = zIso(vybrany.d).getTime();
    return Math.max(0, Math.min(MAX_TYZDNOV, Math.floor((d - t) / (7 * 864e5))));
  });
  const k = kostolKal(strankaId);
  const dnes = dnesIso();
  const obsadene = new Set(odFarnikov(strankaId).filter((x) => x.k === "umysel" && x.zapis && !x.odsluzene && x.id !== ignoruj).map((x) => `${x.zapis!.d}|${x.zapis!.kod}`));
  const dni = dniTyzdna(off).filter((d) => iso(d) >= dnes);
  const tl = (stav: "volna" | "obsadena" | "tento"): CSSProperties => ({ minHeight: 44, padding: "0 12px", borderRadius: 10, border: stav === "tento" ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: stav === "tento" ? "var(--gSoft)" : stav === "obsadena" ? "var(--btn)" : "var(--field)", cursor: stav === "obsadena" ? "default" : "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: stav === "tento" ? "var(--gInk)" : stav === "obsadena" ? "var(--ink3)" : "var(--ink)", boxShadow: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.15 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => setOff((o) => Math.max(0, o - 1))} disabled={off === 0} aria-label="Predošlý týždeň" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: off ? "pointer" : "default", opacity: off ? 1 : 0.35, fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>‹</button>
        <span style={{ flex: 1, minWidth: 0, textAlign: "center", display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15 }}>{off === 0 ? "Tento týždeň" : off === 1 ? "Budúci týždeň" : `O ${off} ${off < 5 ? "týždne" : "týždňov"}`}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{rozsahTyzdna(off, true)}</span></span>
        <button type="button" onClick={() => setOff((o) => Math.min(MAX_TYZDNOV, o + 1))} disabled={off === MAX_TYZDNOV} aria-label="Ďalší týždeň" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: off < MAX_TYZDNOV ? "pointer" : "default", opacity: off < MAX_TYZDNOV ? 1 : 0.35, fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>›</button>
      </div>
      {dni.map((d, i) => {
        const omse = omseDna(k, d).filter((o) => !o.zrusena).sort((a, b) => minuty(a.t) - minuty(b.t));
        return (
          <div key={iso(d)} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, borderTop: i ? "1px solid var(--cardBd)" : "none", paddingTop: i ? 4 : 0 }}>
            <span style={{ width: 70, flex: "none", fontSize: 14, fontWeight: 800 }}>{DNI_K[dvt(d)]} {d.getDate()}. {d.getMonth() + 1}.</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {omse.length ? omse.map((o) => {
                const key = `${iso(d)}|${o.kod}`;
                const stav = vybrany && vybrany.d === iso(d) && vybrany.kod === o.kod ? "tento" : obsadene.has(key) ? "obsadena" : "volna";
                return <button key={o.kod} type="button" disabled={stav === "obsadena"} aria-pressed={stav === "tento"} onClick={() => stav === "volna" && onVyber({ d: iso(d), kod: o.kod, t: o.t })} style={tl(stav)}>
                  <span>{o.t}</span><span style={{ fontSize: 11, fontWeight: 700 }}>{stav === "tento" ? "tento ✓" : stav === "obsadena" ? "obsadená" : "voľná"}</span>
                </button>; })
                : <span style={{ fontSize: 13, color: "var(--ink3)" }}>bez omše</span>}
            </span>
          </div>); })}
      {!dni.some((d) => omseDna(k, d).some((o) => !o.zrusena)) && <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>V tomto týždni nie sú v rozpise žiadne omše. Rozpis nastavíte v Omšiach.</span>}
    </div>);
}

/** správa veriacemu (predvyplnená, dá sa upraviť) */
function SpravaVeriacemu({ u, strankaId, text0 }: { u: PolozkaFarnika; strankaId: string; text0: string }) {
  const [text, setText] = useState(text0);
  const [ok, setOk] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <b style={{ fontSize: 14.5 }}>Správa veriacemu</b>
      <textarea value={text} onChange={(e) => { setText(e.target.value.slice(0, 500)); setOk(false); }} rows={3} aria-label="Správa veriacemu" style={{ padding: "10px 12px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, lineHeight: 1.45, color: "var(--ink)", outline: "none", resize: "vertical" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* PLACEBO — OPRAVY 176: doručenie správy veriacemu (notifikácia) rieši server; ukladá sa pri úmysle */}
        <button type="button" disabled={!text.trim()} onClick={() => { upravOdFarnika(strankaId, u.id, { sprava: { text: text.trim(), cas: terazMs() } }); setOk(true); }} style={{ minHeight: 46, padding: "0 18px", border: "none", borderRadius: 12, background: ok ? "var(--gSoft)" : "#4B7A35", color: ok ? "var(--gInk)" : "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800 }}>{ok ? "Správa poslaná ✓" : "Poslať správu"}</button>
        {u.sprava && !ok && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>naposledy poslané {kedy(u.sprava.cas)}</span>}
      </div>
    </div>);
}

export function UmyslyFarara({ strankaId, meno, mobil, toast }: { strankaId: string; meno: string; mobil: boolean; toast: (m: string) => void }) {
  const vsetky = odFarnikov(strankaId).filter((x) => x.k === "umysel");
  const aktivne = vsetky.filter((x) => !x.odsluzene);
  const odsluzene = vsetky.filter((x) => x.odsluzene);
  const [otv, setOtv] = useState<string | null>(null);
  const [presun, setPresun] = useState<string | null>(null);
  const [spravaPre, setSpravaPre] = useState<string | null>(null);
  const [odsOtv, setOdsOtv] = useState(false);
  // + Zapísať úmysel (osobne / telefonicky)
  const [novy, setNovy] = useState(false);
  const [nT, setNT] = useState(""), [nKto, setNKto] = useState(""), [nZ, setNZ] = useState<Zapis | null>(null);
  const zapisNovy = () => {
    if (!nT.trim()) { toast("Napíšte, za koho má byť omša."); return; }
    pridajOdFarnika(strankaId, { id: `u${terazMs().toString(36)}`, k: "umysel", t: nT.trim(), s: nZ ? `zapísaný na ${omsaText(nZ)}` : "zatiaľ bez omše", kto: nKto.trim() || "zapísal farár", cas: terazMs(), osobne: true, zapis: nZ ?? undefined });
    setNovy(false); setNT(""); setNKto(""); setNZ(null); toast("Úmysel je zapísaný.");
  };
  const zapis = (u: PolozkaFarnika, z: Zapis) => {
    upravOdFarnika(strankaId, u.id, { zapis: z, s: `zapísaný na ${omsaText(z)}` });
    setPresun(null); setSpravaPre(u.osobne ? null : u.id);
  };
  const tlB = (zelene = false): CSSProperties => ({ minHeight: 44, padding: "0 14px", borderRadius: 12, border: zelene ? "none" : "1px solid var(--cardBd)", background: zelene ? "#4B7A35" : "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: zelene ? "#fff" : "var(--ink)", boxShadow: "none" });

  const riadok = (u: PolozkaFarnika, i: number) => {
    const o = otv === u.id, z = u.zapis;
    return (
      <div key={u.id} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
        <button type="button" onClick={() => { setOtv(o ? null : u.id); setPresun(null); setSpravaPre(null); }} aria-expanded={o} style={{ width: "100%", minHeight: 60, padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 14.5 }}>{u.t || "Úmysel"}</b>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{[z ? null : u.s, u.kto, u.osobne ? "osobne alebo telefonicky" : null, kedy(u.cas)].filter(Boolean).join(" · ")}</span>
          </span>
          {z ? <span style={{ flex: "none", padding: "3px 9px", borderRadius: 8, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 11.5, fontWeight: 800, color: "var(--gInk)", whiteSpace: "nowrap" }}>ZAPÍSANÝ ✓ {mobil ? "" : omsaText(z)}</span>
            : <span style={{ flex: "none", padding: "3px 9px", borderRadius: 8, background: "var(--goldBg)", border: "1px solid #C9A24A", fontSize: 11.5, fontWeight: 800, color: "var(--ink)", whiteSpace: "nowrap" }}>ČAKÁ NA OMŠU</span>}
          <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>{o ? "⌃" : "⌄"}</span>
        </button>
        {o && <div style={{ padding: "0 0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {z && <span style={{ fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>ZAPÍSANÝ ✓ · {omsaText(z)}</span>}
          {(!z || presun === u.id) && <>
            <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>{z ? "Vyberte inú omšu:" : "Ťuknite na voľnú omšu:"}</span>
            <KalendarOmsi strankaId={strankaId} vybrany={z} ignoruj={u.id} onVyber={(nz) => zapis(u, nz)} />
          </>}
          {z && spravaPre === u.id && <SpravaVeriacemu key={`${z.d}${z.kod}`} u={u} strankaId={strankaId} text0={predvolenaSprava(u, z, meno)} />}
          {z && presun !== u.id && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!u.osobne && spravaPre !== u.id && <button type="button" onClick={() => setSpravaPre(u.id)} style={tlB()}>Poslať správu</button>}
            <button type="button" onClick={() => { upravOdFarnika(strankaId, u.id, { odsluzene: terazMs() }); setOtv(null); toast("Odslúžené ✓"); }} style={tlB(true)}>Odslúžené ✓</button>
            <button type="button" onClick={() => { setPresun(u.id); setSpravaPre(null); }} style={tlB()}>Presunúť na inú omšu</button>
          </div>}
          <div><PodrzZmaz onZmaz={() => { zmazOdFarnika(strankaId, u.id); setOtv(null); toast("Zmazané."); }} /></div>
        </div>}
      </div>);
  };

  return <>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ ...kicker, flex: 1 }}>ÚMYSLY NA OMŠU · LEN PRE VÁS</span>
      <button type="button" onClick={() => setNovy((n) => !n)} aria-expanded={novy} style={{ ...tlB(true), minHeight: 40 }}>+ Zapísať úmysel</button>
    </div>
    {novy && <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 15.5 }}>Zapísať úmysel · osobne alebo telefonicky</b>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink3)" }}>ZA KOHO MÁ BYŤ OMŠA</span><input value={nT} onChange={(e) => setNT(e.target.value.slice(0, 120))} placeholder="napr. za + Jána a Máriu Novákových" style={pole} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink3)" }}>KTO ŽIADA · NEPOVINNÉ</span><input value={nKto} onChange={(e) => setNKto(e.target.value.slice(0, 60))} placeholder="napr. pani Nováková, tel. 0900 …" style={pole} /></label>
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink3)" }}>OMŠA {nZ ? `· ${omsaText(nZ)}` : "· nepovinné, dá sa zapísať aj neskôr"}</span>
      <KalendarOmsi strankaId={strankaId} vybrany={nZ ?? undefined} onVyber={setNZ} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={zapisNovy} style={tlB(true)}>Zapísať úmysel</button>
        <button type="button" onClick={() => { setNovy(false); setNT(""); setNKto(""); setNZ(null); }} style={tlB()}>Zrušiť</button>
      </div>
    </section>}
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {!aktivne.length && <span style={{ display: "block", padding: "12px 0", fontSize: 14, color: "var(--ink3)" }}>Zatiaľ žiadne úmysly. Keď veriaci zapíše úmysel na omšu, príde vám sem, nie na stránku.</span>}
      {aktivne.map(riadok)}
    </section>
    {odsluzene.length > 0 && <>
      <button type="button" onClick={() => setOdsOtv((o) => !o)} aria-expanded={odsOtv} style={{ minHeight: 52, padding: "8px 16px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
        <b style={{ flex: 1, fontSize: 14.5 }}>Odslúžené · {odsluzene.length}</b><span aria-hidden="true" style={{ fontSize: 18, color: "var(--ink3)" }}>{odsOtv ? "⌃" : "⌄"}</span>
      </button>
      {odsOtv && <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
        {odsluzene.map((u, i) => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "6px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14 }}>{u.t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{[u.zapis ? omsaText(u.zapis) : null, u.kto, `odslúžené ${kedy(u.odsluzene!)}`].filter(Boolean).join(" · ")}</span></span>
            <button type="button" onClick={() => upravOdFarnika(strankaId, u.id, { odsluzene: undefined })} style={{ ...tlB(), minHeight: 40 }}>Vrátiť</button>
          </div>))}
      </section>}
    </>}
  </>;
}
