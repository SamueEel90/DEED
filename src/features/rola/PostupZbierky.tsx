// ============================================================
// OPRAVY 332 · Priebežné správy o postupe zbierky farnosti (okrem Hlavnej) — Správa zbierky, záložka „Ako to pokračuje“.
// Farár ukáže postup prác ešte počas zbierky: dátum, text (TextovePolia) a fotky (GaleriaEditor). Zbierka beží ďalej.
// Ukladá sa do správy zbierky (zbierka_sprava, pole postup) — na stránke zbierky blok „Ako to pokračuje · N“.
// Pri ukončení pribudne posledná správa: poďakovanie (záložka Ukončenie a poďakovanie).
// ============================================================
import { useState, type CSSProperties } from "react";
import { TextovePolia, GaleriaEditor, cistyText } from "./obsahZbierky";
import { kartaK, nadpisK, textK } from "./spravaCasti";
import { PodrzZmaz } from "@/components/HromadnyVyber";
import { nacitajStav, ulozStavIsto, useZmenySpravy, type StavZbierky, type SpravaPostupu, zoradPostup, datumPostupu } from "@/lib/zbierkaSprava";
import type { SpustenaZbierka } from "@/lib/novaZbierka";

const pole: CSSProperties = { minHeight: 50, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const dnesIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function PostupZbierky({ z, aktivna, mobil }: { z: SpustenaZbierka; aktivna: boolean; mobil: boolean }) {
  useZmenySpravy();
  const stav0 = (): StavZbierky => nacitajStav(z.id) ?? { stav: aktivna ? "aktivna" : "ukoncena", koniec: z.koniec ?? new Date().toISOString(), predlzenia: 0, lehota: "30", text: "", fotky: [], doklady: [], spravy: [] };
  const spravy = zoradPostup(nacitajStav(z.id)?.postup ?? []);
  const [f, setF] = useState<SpravaPostupu | null>(null);
  const [nova, setNova] = useState(false);
  const [sprava, setSprava] = useState<{ ok: boolean; t: string } | null>(null);
  const [uklada, setUklada] = useState(false);
  const zmen = (p: Partial<SpravaPostupu>) => { setSprava(null); setF((x) => (x ? { ...x, ...p } : x)); };
  const otvorNovu = () => { setSprava(null); setNova(true); setF({ id: `ps-${Date.now().toString(36)}`, datum: dnesIso(), popis: "", popis2: "", media: [], ulozene: "" }); };
  const plna = !!f && (!!cistyText(f.popis) || !!cistyText(f.popis2) || f.media.length > 0);

  const uloz = async () => {
    if (!f || uklada) return;
    if (!plna) { setSprava({ ok: false, t: "Napíšte, ako to pokračuje, alebo pridajte fotky." }); return; }
    if (!f.datum) { setSprava({ ok: false, t: "Vyberte dátum." }); return; }
    setUklada(true); setSprava(null);
    const st = stav0(), x = { ...f, ulozene: new Date().toISOString() }, l = st.postup ?? [];
    const e = await ulozStavIsto(z.id, { ...st, postup: l.some((y) => y.id === x.id) ? l.map((y) => (y.id === x.id ? x : y)) : [x, ...l] });
    setUklada(false);
    if (e) { setSprava({ ok: false, t: `Neuložilo sa. ${e}` }); return; }
    setF(null); setNova(false);
    setSprava({ ok: true, t: "Správa je uložená ✓ Je na stránke zbierky v bloku Ako to pokračuje." });
  };
  const zmaz = async (id: string) => {
    const st = stav0();
    const e = await ulozStavIsto(z.id, { ...st, postup: (st.postup ?? []).filter((y) => y.id !== id) });
    setSprava(e ? { ok: false, t: `Nezmazalo sa. ${e}` } : { ok: true, t: "Správa je zmazaná zo stránky zbierky ✓" });
  };

  const hlaska = sprava && <span role={sprava.ok ? "status" : "alert"} style={{ padding: "12px 14px", borderRadius: 14, fontSize: 14.5, fontWeight: 800, lineHeight: 1.45, ...(sprava.ok ? { background: "var(--gSoft)", border: "1.5px solid var(--gBd)", color: "var(--gInk)" } : { background: "#F6E3DC", border: "1.5px solid #C2410C", color: "#9A3412" }) }}>{sprava.t}</span>;

  if (f) return (
    <section style={{ ...kartaK, gap: 16 }}>
      <b style={{ fontSize: 22, letterSpacing: "-.02em" }}>{nova ? "Nová správa o postupe" : "Upraviť správu o postupe"}</b>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 260 }}><span style={nadpisK}>Dátum</span><input type="date" max={dnesIso()} value={f.datum} onChange={(e) => zmen({ datum: e.target.value })} style={pole} /></label>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={nadpisK}>Ako to pokračuje</span>
        <TextovePolia popis={f.popis} popis2={f.popis2} onPopis={(h) => zmen({ popis: h })} onPopis2={(h) => zmen({ popis2: h })} ph={mobil}
          popisHlavneho="Najviac 12 riadkov, ľudia ho uvidia hneď." placeholder="Tento týždeň sme…" />
      </div>
      <GaleriaEditor media={f.media} onMedia={(m) => zmen({ media: m })} ph={mobil} nadpis="Fotky · ako to vyzerá" popisNapoveda="Popis (nepovinné)" dovetok="" />
      {hlaska}
      <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "1fr 1fr", gap: 10 }}>
        <button type="button" disabled={uklada} onClick={() => void uloz()} style={{ minHeight: 56, border: "none", borderRadius: 16, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", boxShadow: "none" }}>{uklada ? "Ukladá sa…" : "Uložiť správu"}</button>
        <button type="button" disabled={uklada} onClick={() => { setF(null); setNova(false); setSprava(null); }} style={{ minHeight: 56, borderRadius: 16, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>Zrušiť</button>
      </div>
    </section>);

  return (
    <section style={{ ...kartaK, gap: 14 }}>
      <b style={{ fontSize: 22, letterSpacing: "-.02em" }}>Ako to pokračuje</b>
      <span style={textK}>{aktivna ? "Ukážte darcom, ako práce pokračujú. Zbierka beží ďalej. Pri ukončení pridáte poslednú správu: poďakovanie." : "Správy o postupe sú na stránke zbierky. Poďakovanie je posledná správa."}</span>
      <button type="button" onClick={otvorNovu} style={{ alignSelf: "flex-start", minHeight: 52, padding: "0 20px", border: "none", borderRadius: 15, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>+ Pridať správu o postupe</button>
      {hlaska}
      {spravy.length === 0 ? <span style={textK}>Zatiaľ žiadna správa.</span> : spravy.map((s) => (
        <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--cardBd)" }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{datumPostupu(s.datum)}{s.media.length ? ` · ${s.media.length} ${s.media.length === 1 ? "fotka" : s.media.length < 5 ? "fotky" : "fotiek"}` : ""}</span>
          <span style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as CSSProperties}>{cistyText(s.popis || s.popis2) || "Len fotky"}</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={() => { setSprava(null); setNova(false); setF(s); }} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>Upraviť</button>
            <PodrzZmaz label="Podržte a zmažte" onZmaz={() => { void zmaz(s.id); }} />
          </div>
        </div>))}
    </section>);
}
