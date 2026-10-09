// ============================================================
// KARTA 61 §2 — Dobrovoľníctvo a organizovanie brigád (Správa → Ľudia, pod zoznamom), prototyp Brigady farnosti.dc.html.
// + Vytvoriť brigádu → formulár na mieste (hore „‹ Späť na zoznam brigád“), vedľa živý náhľad karty bloku Pomôž.
// Zoznam: koľko príde, mená, Upraviť, Podržte · zmazať. Po termíne „SKONČILA · na stránke už nie je“.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useBrigady, ulozBrigadu, zmazBrigadu, skoncila, DRUHY_BRIGADY, type Brigada } from "@/lib/brigady";
import { reakcieF, useReakcieF, useCerstveReakcieF } from "@/lib/reakcieFarnosti";
import { cistyText } from "@/lib/richtext";
import type { MediumZbierky } from "@/lib/novaZbierka";
import { CasPole } from "@/components/CasPole";
import { TextovePolia, GaleriaEditor } from "./obsahZbierky";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";

const ZELENA = "#4B7A35", CERV = "#A34A2A";
const DNI = ["NEDEĽA", "PONDELOK", "UTOROK", "STREDA", "ŠTVRTOK", "PIATOK", "SOBOTA"];
const POZV: [string, string][] = [["Bez prihlásenia", "len informácia"], ["Nezáväzne · Zúčastním sa", "ľudia ťuknú, vy viete, koľko ich asi príde"], ["Záväzne · Prihlásiť sa", "prihlásia sa menom. Viete presne kto, môžete dať limit."]];
const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const pole: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" };
const kick: CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" };
const hlaskaSt: CSSProperties = { padding: "10px 14px", borderRadius: 12, background: "var(--gSoft)", border: `1.5px solid ${ZELENA}`, fontSize: 14, fontWeight: 700, color: "var(--gInk)" };
const obrys: CSSProperties = { minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" };
const teraz = () => Date.now();
type Form = { druh: number; t: string; dat: string; cas: string; kde: string; txt: string; txt2: string; media: MediumZbierky[]; pz: 0 | 1 | 2; lim: string };
const prazdny = (): Form => ({ druh: 0, t: "", dat: "", cas: "", kde: "", txt: "", txt2: "", media: [], pz: 2, lim: "" });
export const kedyBrigady = (dat: string, cas: string) => { const d = dat ? new Date(`${dat}T12:00:00`) : null; return [d ? `${DNI[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.` : "", cas].filter(Boolean).join(" · "); };

function Riadok({ b, strankaId, prvy, onUpr, hlas }: { b: Brigada; strankaId: string; prvy: boolean; onUpr: () => void; hlas: (t: string) => void }) {
  const r = reakcieF(strankaId, b.id), l = r.ucast ?? [], mena = l.map((k) => r.mena?.[k] ?? "veriaci").join(", ");
  const po = skoncila(b, teraz());
  return (
    <div style={{ padding: "14px 0", borderTop: prvy ? "none" : "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 6 }}>
      <b style={{ fontSize: 15.5 }}>{b.t}</b>
      <span style={{ fontSize: 13, color: po ? CERV : "var(--ink3)", fontWeight: po ? 700 : 500 }}>{[po ? "SKONČILA · na stránke už nie je" : "", b.druh, kedyBrigady(b.dat, b.cas), b.kde].filter(Boolean).join(" · ")}</span>
      {b.pz > 0 && <span style={{ fontSize: 14, fontWeight: 700 }}>{l.length ? `${l.length} príde${b.limit ? ` z ${b.limit}` : ""}` : "zatiaľ nikto"}</span>}
      {b.pz === 2 && mena && <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Príde: {mena}</span>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onUpr} style={obrys}>Upraviť</button>
        <DrzTlacidlo ms={1200} styl={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${CERV}`, background: "transparent", color: CERV, fontSize: 14, fontWeight: 800 }}
          onHotovo={() => { void zmazBrigadu(strankaId, b.id).then(() => hlas(`Brigáda zmazaná ✓ ${b.t}`)); }}>Podržte · zmazať</DrzTlacidlo>
      </div>
    </div>);
}

export function BrigadyFarnosti({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  useReakcieF(); useCerstveReakcieF(strankaId);
  const L = useBrigady(strankaId);
  const [on, setOn] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [f, setFf] = useState<Form>(prazdny);
  const [kluc, setKluc] = useState(0);
  const [hl, setHl] = useState<string | null>(null);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const hlas = (t: string) => { window.clearTimeout(tm.current); setHl(t); tm.current = window.setTimeout(() => setHl(null), 4000); };
  const setF = (p: Partial<Form>) => setFf((q) => ({ ...q, ...p }));

  const otvor = (b?: Brigada) => {
    setEdit(b?.id ?? null);
    setFf(b ? { druh: Math.max(0, DRUHY_BRIGADY.indexOf(b.druh)), t: b.t, dat: b.dat, cas: b.cas, kde: b.kde, txt: b.txt, txt2: b.txt2 ?? "", media: b.foto ? [{ id: 1, typ: "foto", src: b.foto }] : [], pz: b.pz, lim: b.limit ? String(b.limit) : "" } : prazdny());
    setKluc((k) => k + 1); setOn(true);
  };
  const ch = [!f.t.trim() && "názov", !f.dat && "dátum", !f.cas && "čas"].filter(Boolean) as string[];
  const kedy = kedyBrigady(f.dat, f.cas);
  const foto = f.media.find((m) => m.typ === "foto")?.src;
  const zverejni = () => {
    if (ch.length) return;
    const st = edit ? L.find((x) => x.id === edit) : undefined;
    const b: Brigada = { id: edit ?? `br${teraz().toString(36)}`, druh: DRUHY_BRIGADY[f.druh], t: f.t.trim(), dat: f.dat, cas: f.cas, kde: f.kde.trim(), txt: f.txt, txt2: f.txt2 || undefined,
      foto, pz: f.pz, limit: f.pz === 2 ? parseInt(f.lim, 10) || 0 : 0, vytvorena: st?.vytvorena ?? new Date().toISOString() };
    void ulozBrigadu(strankaId, b).then(() => { setOn(false); setEdit(null); hlas(`${edit ? "Zmeny sú uložené ✓" : "Zverejnené ✓"} ${b.t} je na stránke v bloku Pomôž.`); });
  };

  const nahlad = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={kick}>NÁHĽAD · TAKTO TO BUDE V BLOKU POMÔŽ</span>
      <div style={{ borderRadius: 22, overflow: "hidden", background: "#E4DFD5", color: "#1D211B", display: "flex", flexDirection: "column" }}>
        {foto && <img src={foto} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".12em", color: "#5B5D53" }}>{`${DRUHY_BRIGADY[f.druh]}${kedy ? ` · ${kedy}` : ""}`.toUpperCase()}</span>
          <b style={{ fontSize: 20, lineHeight: 1.25 }}>{f.t.trim() || "Názov brigády"}</b>
          {cistyText(f.txt).trim() && <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "#4A4C43" }}>{cistyText(f.txt).trim()}</span>}
          <span style={{ fontSize: 14.5, color: "#5B5D53" }}>{f.kde.trim() || "miesto"}</span>
          {f.pz > 0 && <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ minHeight: 44, padding: "0 16px", borderRadius: 13, background: "#14110B", color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center" }}>{f.pz === 2 ? "Prihlásiť sa" : "Prídem pomôcť"}</span>
            {f.pz === 2 && f.lim && <span style={{ fontSize: 15, fontWeight: 700 }}>miesta: {f.lim}</span>}
          </span>}
        </div>
      </div>
    </div>);

  if (on) return (
    <section style={{ ...karta, padding: mobil ? "14px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <button type="button" onClick={() => { setOn(false); setEdit(null); }} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)" }}>‹ Späť na zoznam brigád</button>
      <b style={{ fontSize: 19 }}>{edit ? "Upravujete brigádu" : "Nová brigáda"}</b>
      <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1.3fr) minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <span style={lab}>Čo to je</span>
          <div role="radiogroup" aria-label="Čo to je" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DRUHY_BRIGADY.map((t, i) => { const a = f.druh === i; return <button key={t} type="button" role="radio" aria-checked={a} onClick={() => setF({ druh: i })} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: a ? `2px solid ${ZELENA}` : "1px solid var(--cardBd)", background: a ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>{t}</button>; })}
          </div>
          <label style={lab}>Názov<input value={f.t} onChange={(e) => setF({ t: e.target.value.slice(0, 70) })} placeholder="napr. Upratovanie fary a záhrady" style={pole} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
            <label style={lab}>Dátum<input type="date" value={f.dat} onChange={(e) => setF({ dat: e.target.value })} style={pole} /></label>
            <label style={lab}>Čas<CasPole value={f.cas} onCommit={(v) => setF({ cas: v })} label="Čas brigády" placeholder="napr. 9:00" style={pole} /></label>
          </div>
          <label style={lab}>Miesto<input value={f.kde} onChange={(e) => setF({ kde: e.target.value.slice(0, 60) })} placeholder="napr. Fara" style={pole} /></label>
          <TextovePolia key={kluc} popis={f.txt} popis2={f.txt2} onPopis={(h) => setF({ txt: h })} onPopis2={(h) => setF({ txt2: h })} ph={mobil}
            popisHlavneho="Čo sa bude robiť a čo si vziať. Najviac 12 riadkov." placeholder="napr. Hrabanie lístia a orezanie kríkov. Rukavice a náradie máme." />
          <GaleriaEditor media={f.media} onMedia={(m) => setF({ media: m.slice(0, 1) })} ph={mobil} max={1} bezVidea nadpis="Fotka — nepovinné" dovetok="" />
          <span style={lab}>Pozvať ľudí</span>
          <div role="radiogroup" aria-label="Pozvať ľudí" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {POZV.map(([t, s], i) => { const a = f.pz === i; return (
              <button key={t} type="button" role="radio" aria-checked={a} onClick={() => setF({ pz: i as 0 | 1 | 2 })} style={{ minHeight: 56, padding: "8px 14px", borderRadius: 14, border: a ? `2px solid ${ZELENA}` : "1px solid var(--cardBd)", background: a ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
                <span aria-hidden="true" style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", border: `2px solid ${a ? ZELENA : "#A8A396"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: ZELENA, opacity: a ? 1 : 0 }} /></span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
              </button>); })}
          </div>
          {f.pz === 2 && <>
            <label style={lab}>Koľko ľudí najviac<input value={f.lim} inputMode="numeric" onChange={(e) => setF({ lim: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="bez limitu" style={{ ...pole, maxWidth: 160 }} /></label>
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>Nepovinné. Po naplnení sa prihlasovanie zavrie, mená prihlásených uvidíte pri brigáde.</span>
          </>}
          {ch.length > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: CERV }}>Ešte chýba: {ch.join(", ")}.</span>}
          {ch.length ? <span style={{ minHeight: 52, borderRadius: 14, background: "var(--btn)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15.5, fontWeight: 800 }}>{edit ? "Podržte a uložte zmeny" : "Podržte a zverejnite"}</span>
            : <DrzTlacidlo ms={1500} plnenie="rgba(255,255,255,.3)" styl={{ minHeight: 52, borderRadius: 14, border: "none", background: ZELENA, color: "#fff", fontSize: 15.5, fontWeight: 800 }} onHotovo={zverejni}>{edit ? "Podržte a uložte zmeny" : "Podržte a zverejnite"}</DrzTlacidlo>}
        </div>
        {nahlad}
      </div>
    </section>);

  return (<>
    <span style={kick}>DOBROVOĽNÍCTVO A ORGANIZOVANIE BRIGÁD</span>
    <section style={{ ...karta, padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Brigáda, upratovanie, služba pri omši. Na stránke farnosti sa ukáže v bloku <b>Pomôž</b> s tlačidlom Prídem pomôcť.</span>
      <button type="button" onClick={() => otvor()} style={{ alignSelf: "flex-start", minHeight: 50, padding: "0 20px", border: "none", borderRadius: 14, background: ZELENA, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800 }}>+ Vytvoriť brigádu</button>
      {hl && <span role="status" style={hlaskaSt}>{hl}</span>}
      {L.length > 0 && <div style={{ display: "flex", flexDirection: "column" }}>{L.map((b, i) => <Riadok key={b.id} b={b} strankaId={strankaId} prvy={!i} onUpr={() => otvor(b)} hlas={hlas} />)}</div>}
    </section>
  </>);
}
