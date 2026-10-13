// ============================================================
// KARTA 62 · Správa → Kostoly a miesta (prototyp „Kostoly a miesta Sprava.dc.html“ 1a zoznam, 1b nové miesto).
// Každý kostol alebo filiálka má na stránke svoju kartu a podstránku. Peniaze a zbierky sú vždy farnosti.
// Pred „Podržte a uložte“ vždy riadok s novou cenou (skúšobná doba: budúca cena; mesačne: od ďalšej platby;
// ročne: pomerná časť do konca roka). Odobratie = miesto zamrzne (nezmaže sa), dá sa obnoviť.
// ============================================================
import { useState, type CSSProperties } from "react";
import { GaleriaEditor, TextovePolia } from "./obsahZbierky";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";
import { useKalendar } from "@/lib/kalendarFarnosti";
import { cenaMiest, predplatne, stavPredplatneho } from "@/lib/predplatneFarnosti";
import { DRUHY_MIESTA, nazovDruhu, prazdneMiesto, riadokCeny, ulozMiesto, useMiesta, zamrazMiesto, type Miesto } from "@/lib/miestaFarnosti";

const karta: CSSProperties = { borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" };
const lbl: CSSProperties = { fontSize: 14, fontWeight: 800 };
const pozn: CSSProperties = { fontWeight: 600, color: "var(--ink3)" };
const pole: CSSProperties = { minHeight: 50, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 16, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const tl = (plne: boolean): CSSProperties => ({ minHeight: 44, padding: "0 16px", borderRadius: 12, border: plne ? "none" : "1.5px solid var(--cardBd)", background: plne ? "#4B7A35" : "var(--field)", color: plne ? "#fff" : "var(--ink)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer", flex: "none" });
const rozpis = (n: number) => [35, ...(n >= 2 ? [10] : []), ...Array.from({ length: Math.max(0, n - 2) }, () => 5)].join(" + ");
const miestT = (n: number) => (n === 1 ? "1 miesto" : n < 5 ? `${n} miesta` : `${n} miest`);
const omsiT = (n: number) => (n === 1 ? "1 omša týždenne" : n < 5 ? `${n} omše týždenne` : `${n} omší týždenne`);

export function KostolyMiesta({ strankaId, mobil, onOmse }: { strankaId: string; mobil: boolean; /** ťuk na počet omší → Omše a kalendár */ onOmse?: () => void }) {
  const vsetky = useMiesta(strankaId, true);
  const kal = useKalendar(strankaId);
  const aktivne = vsetky.filter((m) => !m.zamrznute), zamrznute = vsetky.filter((m) => m.zamrznute);
  const [f, setF] = useState<Miesto | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [potvrd, setPotvrd] = useState(false);
  const [teraz] = useState(() => Date.now());
  const p = predplatne(), st = stavPredplatneho(p, teraz);
  const skusobne = st === "nezverejnene" || st === "skusobne" || st === "konci";
  const omsiTyzdenne = (id: string) => { const k = kal.kostoly[id]; return k?.casyOk ? Object.values(k.vzor).reduce((a, l) => a + l.length, 0) : 0; };
  const novy = !!f && !vsetky.some((m) => m.id === f.id);
  const zamrz = !!f && vsetky.find((m) => m.id === f.id)?.zamrznute;

  const uloz = async () => {
    if (!f || !f.nazov.trim()) return;
    await ulozMiesto(strankaId, { ...f, nazov: f.nazov.trim(), adresa: f.adresa.trim(), popis: f.popis.trim() });
    const n = aktivne.length + (novy ? 1 : 0);
    setHlaska(`${f.nazov.trim()} je na stránke · cena teraz ${cenaMiest(n)} € mesačne`);
    setF(null);
  };
  const odober = async () => {
    if (!f) return;
    await zamrazMiesto(strankaId, f.id, true);
    setHlaska(`${f.nazov} je odobraté · stránka miesta zamrzla, dá sa obnoviť · cena ${cenaMiest(aktivne.length - 1)} € mesačne od ďalšej platby`);
    setF(null); setPotvrd(false);
  };

  if (f) {
    const n = aktivne.length + (novy || zamrz ? 1 : 0);
    const cena = novy || zamrz ? riadokCeny(n, aktivne.length, skusobne) : `Cena sa nemení, ${cenaMiest(aktivne.length)} € mesačne.`;
    const rocne = (novy || zamrz) && !skusobne && p.rocne ? " Pri ročnom predplatnom príde faktúra na pomernú časť do konca predplateného roka." : "";
    const omse = omsiTyzdenne(f.id);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
        <button type="button" onClick={() => { setF(null); setPotvrd(false); }} style={{ ...tl(false), alignSelf: "flex-start" }}>‹ Kostoly a miesta</button>
        <b style={{ fontSize: 22 }}>{novy ? "Nové miesto" : f.nazov || "Miesto"}</b>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Čo to je</span>
          <div role="radiogroup" aria-label="Čo to je" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DRUHY_MIESTA.map(([k, t]) => { const on = f.druh === k; return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setF({ ...f, druh: k })}
                style={{ whiteSpace: "nowrap", minHeight: 44, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${on ? "#4B7A35" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", color: on ? "var(--gInk)" : "var(--ink)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>{t}</button>); })}
          </div></div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Názov</span>
          <input value={f.nazov} onChange={(e) => setF({ ...f, nazov: e.target.value.slice(0, 80) })} placeholder="napr. Kaplnka svätej Anny" style={pole} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Adresa</span>
          <input value={f.adresa} onChange={(e) => setF({ ...f, adresa: e.target.value.slice(0, 120) })} placeholder="ulica, číslo, obec" style={pole} /></label>
        <GaleriaEditor media={f.media} onMedia={(m) => setF({ ...f, media: m })} ph={mobil} max={12} bezVidea nadpis="Fotky · galéria, prvá je titulná" dovetok=" Pod fotku môžete napísať popis." />
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Krátky popis <span style={pozn}>· jedna veta na kartu</span></span>
          <input value={f.popis} onChange={(e) => setF({ ...f, popis: e.target.value.slice(0, 140) })} placeholder="napr. Spätá so stredovekým mestským špitálom." style={pole} /></label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>História <span style={pozn}>· nepovinné, na podstránku</span></span>
          <TextovePolia key={f.id} popis={f.historia} popis2="" onPopis={(h) => setF({ ...f, historia: h })} onPopis2={() => undefined} ph={mobil} popisHlavneho="Krátka história kostola. Ukáže sa na jeho podstránke." placeholder="napr. Kostol bol postavený v roku 1909…" /></div>
        <span style={{ padding: "12px 14px", borderRadius: 12, background: "var(--goldBg)", fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>{cena}{rocne}</span>
        {f.nazov.trim()
          ? <PodrzTlacidlo label={zamrz ? "Podržte a obnovte" : "Podržte a uložte"} trvanie={1200} onConfirm={() => { void (zamrz ? zamrazMiesto(strankaId, f.id, false).then(() => { setHlaska(`${f.nazov} je znova na stránke · cena teraz ${cenaMiest(n)} € mesačne`); setF(null); }) : uloz()); }} />
          : <span role="status" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--goldBg)", fontSize: 14.5, fontWeight: 800 }}>Ešte chýba: názov</span>}
        {!novy && !zamrz && f.id !== "0" && (potvrd
          ? <div role="alert" style={{ padding: "12px 14px", borderRadius: 12, border: "1.5px solid #A34A2A", display: "flex", flexDirection: "column", gap: 10 }}>
              <b style={{ fontSize: 15 }}>{omse ? `V tomto kostole je ${omsiT(omse)}. Odobrať ho aj tak?` : "Odobrať toto miesto?"}</b>
              <span style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.45 }}>Stránka miesta zamrzne, nič sa nezmaže a dá sa obnoviť. {riadokCeny(aktivne.length - 1, aktivne.length, skusobne)}</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><DrzTlacidlo ms={1200} styl={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid #A34A2A", background: "transparent", color: "#A34A2A", fontSize: 14.5, fontWeight: 800 }} onHotovo={() => { void odober(); }}>Podržte · odobrať</DrzTlacidlo><button type="button" onClick={() => setPotvrd(false)} style={tl(false)}>Nechať</button></div>
            </div>
          : <button type="button" onClick={() => setPotvrd(true)} style={{ ...tl(false), alignSelf: "flex-start", color: "#A34A2A", borderColor: "#A34A2A" }}>Odobrať miesto</button>)}
      </div>);
  }

  const riadok = (m: Miesto) => {
    const t = m.media.find((x) => x.typ === "foto")?.src, om = omsiTyzdenne(m.id);
    return (
      <div key={m.id} style={{ ...karta, display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", opacity: m.zamrznute ? 0.7 : 1 }}>
        <span style={{ width: 64, height: 64, borderRadius: 12, flex: "none", background: t ? `center/cover no-repeat url('${t}')` : "linear-gradient(160deg,#A9A290,#5F584A)" }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "#8A6A1F" }}>{nazovDruhu(m.druh).toLocaleUpperCase("sk-SK")}{m.id === "0" ? " · HLAVNÝ" : ""}{m.zamrznute ? " · ODOBRATÉ" : ""}</span>
          <b style={{ fontSize: 16.5, overflowWrap: "anywhere" }}>{m.nazov}</b>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{[m.adresa || (m.id === "0" ? "z registrácie" : ""), m.zamrznute ? "stránka zamrzla" : omsiT(om)].filter(Boolean).join(" · ")}
            {!m.zamrznute && !om && onOmse && <> · <button type="button" onClick={onOmse} style={{ border: "none", background: "transparent", padding: 0, color: "var(--gInk)", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>nastaviť omše ›</button></>}</span>
        </span>
        <button type="button" onClick={() => { setHlaska(null); setF(m); }} style={tl(false)}>{m.zamrznute ? "Obnoviť" : "Upraviť"}</button>
      </div>);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 14, color: "var(--ink3)" }}>Každý kostol alebo filiálka má na stránke svoju kartu a podstránku. Peniaze a zbierky sú vždy farnosti.</span>
      {hlaska && <div role="status" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "2px solid #4B7A35", fontSize: 15, fontWeight: 800, color: "var(--gInk)" }}>{hlaska}</div>}
      {aktivne.map(riadok)}
      <button type="button" onClick={() => { setHlaska(null); setF(prazdneMiesto()); }} style={{ ...tl(true), alignSelf: "flex-start", minHeight: 52, padding: "0 22px", fontSize: 16 }}>+ Pridať kostol alebo filiálku</button>
      <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--card)", display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: 14.5 }}>Cena podľa miest</b>
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>Teraz {miestT(aktivne.length)} · {rozpis(aktivne.length)} € = <b>{cenaMiest(aktivne.length)} € mesačne</b>. Ďalšie miesto + {aktivne.length >= 2 ? 5 : 10} €.{skusobne ? " Počas skúšobnej doby je všetko zadarmo." : ""}</span>
      </div>
      {zamrznute.length > 0 && <><span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", paddingTop: 6 }}>ODOBRATÉ · DAJÚ SA OBNOVIŤ</span>{zamrznute.map(riadok)}</>}
    </div>);
}
