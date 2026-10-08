// ============================================================
// KARTA 57 D — Správa farnosti → Od veriacich (farár).
// Poradie: Úmysly na omšu · len pre vás → Pridali veriaci v skupinách → zbalené Nastavenia pre veriacich.
// Ťuk na príspevok: oprava nadpisu a textu („Opravené ✓", veriaci dostane správu), parte/svadba/jubileum
// z editora farár len maže. Mazanie len podržaním. Označiť viac: všetko · staršie ako 30 dní · skupinu.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { nacitajSelfAdd, ulozSelfAdd } from "@/features/viera/UserOznamy";
import { DRUHY_FARNIKA, CEZ_EDITOR, nacitajSmie, ulozSmie, smie, odFarnikov, upravOdFarnika, zmazOdFarnika, zmazOdFarnikov, nastavenieOdVeriacich, ulozNastavenieOdVeriacich, useOdFarnikov, type DruhFarnika, type PolozkaFarnika } from "@/lib/odFarnikov";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { PodrzZmaz, TextOznamu } from "./OznamyFarnosti";
import { cistyText } from "./obsahZbierky";

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const kicker: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--acc)", padding: "4px 2px 0" };
const POPLATKY = [0, 1, 2, 5];
const SKUPINY: [string, DruhFarnika[]][] = [
  ["PROSBY O MODLITBU", ["modlitba"]], ["UDALOSTI", ["udalost"]], ["KRÁTKE OZNAMY", ["oznam"]], ["FOTKY Z AKCIÍ", ["fotky"]], ["OZNÁMENIA · PARTE, SVADBY, JUBILEÁ", ["parte", "svadba", "ine"]],
];
const DEN = 864e5;
const terazMs = () => Date.now();
const druhT = (k: DruhFarnika) => (DRUHY_FARNIKA.find((d) => d.k === k)?.t ?? "").toLocaleUpperCase("sk-SK");
const kedy = (cas: number) => { const d = new Date(cas); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const prispevkov = (n: number) => `${n} ${n === 1 ? "príspevok" : n >= 2 && n <= 4 ? "príspevky" : "príspevkov"}`;
const naHtml = (t: string) => t ? t.split("\n").map((r) => `<p>${r.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("") : "";

function Prepinac({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{ flex: "none", width: 52, height: 44, border: "none", background: "transparent", padding: "7px 0", cursor: "pointer", boxShadow: "none" }}>
      <span style={{ display: "block", position: "relative", width: 52, height: 30, borderRadius: 15, background: on ? "#4B7A35" : "var(--track)" }}>
        <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: 12, background: "#fff", transform: `translateX(${on ? 22 : 0}px)`, transition: "transform .2s ease" }} />
      </span>
    </button>);
}

/** oprava príspevku farárom: nadpis + text */
function Oprava({ x, strankaId }: { x: PolozkaFarnika; strankaId: string }) {
  const [t, setT] = useState(x.t);
  const [h, setH] = useState(() => naHtml(x.s));
  const [ok, setOk] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const zmena = t.trim() !== x.t || cistyText(h) !== x.s;
  const uloz = () => {
    if (!zmena || !t.trim()) return;
    upravOdFarnika(strankaId, x.id, { t: t.trim(), s: cistyText(h).slice(0, 600), upravil: true });
    setOk(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => setOk(false), 2200);
  };
  return <>
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><b style={{ fontSize: 14.5 }}>Nadpis</b>
      <input value={t} onChange={(e) => setT(e.target.value.slice(0, 80))} style={{ height: 48, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} /></label>
    <TextOznamu value={h} onChange={setH} label="Text" popis="Opravte preklep alebo údaj." />
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <button type="button" onClick={uloz} aria-disabled={!zmena} style={{ minHeight: 46, padding: "0 18px", border: "none", borderRadius: 12, background: ok ? "var(--gSoft)" : zmena ? "#4B7A35" : "#CFC9BC", color: ok ? "var(--gInk)" : zmena ? "#fff" : "#6B6C62", cursor: zmena ? "pointer" : "default", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, boxShadow: "none" }}>{ok ? "Opravené ✓" : "Uložiť opravu"}</button>
      <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Veriaci dostane správu, že ste jeho príspevok upravili.</span>
    </div>
  </>;
}

export function OdVeriacich({ strankaId, mobil, toast }: { strankaId: string; mobil: boolean; toast: (m: string) => void }) {
  useOdFarnikov();
  const vsetko = odFarnikov(strankaId);
  const umysly = vsetko.filter((x) => x.k === "umysel");
  const L = vsetko.filter((x) => x.k !== "umysel");
  const nast = nastavenieOdVeriacich(strankaId);
  // D.5: farár otvoril Od veriacich → nové príspevky a úmysly sú videné
  useEffect(() => { ulozNastavenieOdVeriacich(strankaId, { videne: terazMs() }); }, [strankaId]);
  const [otv, setOtv] = useState<string | null>(null);
  const [selM, setSelM] = useState(false);
  const [vyb, setVyb] = useState<Set<string>>(() => new Set());
  const [nastOtv, setNastOtv] = useState(false);
  const [self, setSelf] = useState(() => nacitajSelfAdd(strankaId));
  const smieF = nacitajSmie(strankaId);
  const zmenSelf = (p: Partial<typeof self>) => { const n = { ...self, ...p }; setSelf(n); ulozSelfAdd(strankaId, n); };
  const prepniVyb = (id: string) => setVyb((v) => { const n = new Set(v); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const pridajVyb = (ids: string[]) => setVyb((v) => new Set([...v, ...ids]));

  const tlMale = (aktiv = false): CSSProperties => ({ minHeight: 40, padding: "0 12px", borderRadius: 10, border: `1px solid ${aktiv ? "var(--gBd)" : "var(--cardBd)"}`, background: aktiv ? "var(--gSoft)" : "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: aktiv ? "var(--gInk)" : "var(--ink)", boxShadow: "none", whiteSpace: "nowrap" });

  const riadok = (x: PolozkaFarnika, i: number) => {
    const o = otv === x.id && !selM, on = vyb.has(x.id), ed = CEZ_EDITOR.includes(x.k);
    return (
      <div key={x.id} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
        <button type="button" onClick={() => (selM ? prepniVyb(x.id) : setOtv(o ? null : x.id))} aria-expanded={selM ? undefined : o} aria-pressed={selM ? on : undefined}
          style={{ width: "100%", minHeight: 62, padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
          {selM && <span aria-hidden="true" style={{ flex: "none", width: 26, height: 26, borderRadius: 8, border: `2px solid ${on ? "#A34A2A" : "var(--cardBd)"}`, background: on ? "#A34A2A" : "transparent", color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? "✓" : ""}</span>}
          <span style={{ flex: "none", padding: "3px 9px", borderRadius: 8, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 11, fontWeight: 800, color: "var(--gInk)", whiteSpace: "nowrap", maxWidth: mobil ? 110 : undefined, overflow: "hidden", textOverflow: "ellipsis" }}>{druhT(x.k)}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 14.5 }}>{x.t}</b>
            <span style={{ fontSize: 12.5, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[x.s, x.kto, kedy(x.cas), x.upravil ? "upravil farár" : ""].filter(Boolean).join(" · ")}</span>
            {(x.nahl ?? 0) > 0 && <span style={{ alignSelf: "flex-start", marginTop: 2, padding: "2px 8px", borderRadius: 7, background: "var(--cRedBg)", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".06em" }}>NAHLÁSENÉ · {x.nahl}×</span>}
            {x.k === "parte" && (x.sus ?? 0) > 0 && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink2)" }}>sústrasť prejavilo {x.sus} · rodine ide súhrn raz denne</span>}
          </span>
          {!selM && <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>{o ? "⌃" : "⌄"}</span>}
        </button>
        {o && <div style={{ padding: "0 0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {ed ? <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Oznámenie z editora (parte, svadba, jubileum) upravuje ten, kto ho pridal. Vy ho môžete zmazať.</span>
            : <Oprava key={x.id} x={x} strankaId={strankaId} />}
          {x.fotky?.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 6 }}>{x.fotky.slice(0, 8).map((f, j) => <img key={j} src={f} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 10, display: "block" }} />)}</div> : null}
          <div><PodrzZmaz onZmaz={() => { zmazOdFarnika(strankaId, x.id); setOtv(null); toast("Zmazané."); }} /></div>
        </div>}
      </div>);
  };

  const skupiny = SKUPINY.map(([nad, ks]) => [nad, L.filter((x) => ks.includes(x.k))] as const).filter(([, l]) => l.length);
  const n = L.filter((x) => vyb.has(x.id)).length;

  return <>
    {/* D.1: úmysly hore — povinnosť farára, na stránku nejdú */}
    <span style={kicker}>ÚMYSLY NA OMŠU · LEN PRE VÁS</span>
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {!umysly.length && <span style={{ display: "block", padding: "12px 0", fontSize: 14, color: "var(--ink3)" }}>Zatiaľ žiadne úmysly. Keď veriaci zapíše úmysel na omšu, príde vám sem, nie na stránku.</span>}
      {umysly.map((u, i) => (
        <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{u.t || "Úmysel"}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{[u.s, u.kto, kedy(u.cas)].filter(Boolean).join(" · ")}</span></span>
          <PodrzZmaz onZmaz={() => { zmazOdFarnika(strankaId, u.id); toast("Zmazané."); }} />
        </div>))}
    </section>

    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 6 }}>
      <b style={{ flex: 1, fontSize: 17 }}>Pridali veriaci · {L.length}</b>
      {L.length > 0 && <button type="button" onClick={() => { setSelM(!selM); setVyb(new Set()); setOtv(null); }} style={tlMale(selM)}>{selM ? "Hotovo" : "Označiť viac"}</button>}
    </div>
    {selM && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => pridajVyb(L.map((x) => x.id))} style={tlMale()}>Označiť všetko</button>
      <button type="button" onClick={() => setVyb(new Set(L.filter((x) => terazMs() - x.cas > 30 * DEN).map((x) => x.id)))} style={tlMale()}>Staršie ako 30 dní</button>
      <button type="button" onClick={() => setVyb(new Set())} style={tlMale()}>Zrušiť výber</button>
    </div>}
    {!L.length && <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: "14px 20px", fontSize: 14, color: "var(--ink3)" }}>Zatiaľ nič. Čo veriaci pridajú, uvidíte tu a môžete to opraviť alebo zmazať.</section>}
    {skupiny.map(([nad, l]) => (
      <div key={nad} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" }}>{nad} · {l.length}</span>
          {selM && <button type="button" onClick={() => pridajVyb(l.map((x) => x.id))} style={tlMale()}>Označiť skupinu</button>}
        </div>
        <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>{l.map(riadok)}</section>
      </div>))}
    {selM && n > 0 && <div role="region" aria-label="Označené" style={{ position: "sticky", bottom: mobil ? 104 : 12, zIndex: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 16, background: "var(--panel)", border: "1.5px solid var(--cRed)", boxShadow: "0 10px 26px rgba(30,28,20,.22)" }}>
      <b style={{ flex: 1, fontSize: 15 }}>Označené: {prispevkov(n)}</b>
      <PodrzZmaz label={`Podržte a zmažte ${n}`} onZmaz={() => { zmazOdFarnikov(strankaId, [...vyb]); setVyb(new Set()); setSelM(false); toast(`${n === 1 ? "1 príspevok je zmazaný" : n < 5 ? `${n} príspevky sú zmazané` : `${n} príspevkov je zmazaných`} ✓`); }} />
    </div>}

    {/* D.1: zbalené Nastavenia pre veriacich */}
    <button type="button" onClick={() => setNastOtv((o) => !o)} aria-expanded={nastOtv} style={{ marginTop: 6, minHeight: 64, padding: "10px 16px", borderRadius: 18, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>Nastavenia pre veriacich</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>čo smú pridať, poplatok, upozornenia</span></span>
      <span aria-hidden="true" style={{ fontSize: 18, color: "var(--ink3)" }}>{nastOtv ? "⌃" : "⌄"}</span>
    </button>
    {nastOtv && <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>Veriaci môžu pridávať oznamy</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Zverejnia sa hneď, vy ich môžete zmazať. Prosba o modlitbu a smútočné oznámenie sú vždy zadarmo.</span></span>
        <Prepinac on={self.on} onClick={() => zmenSelf({ on: !self.on })} label="Veriaci môžu pridávať oznamy" />
      </div>
      {self.on && <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: "var(--ink2)" }}>Poplatok za oznam</span>
          <div role="radiogroup" aria-label="Poplatok za oznam" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)", flexWrap: "wrap" }}>
            {POPLATKY.map((p) => { const on = (POPLATKY.includes(self.poplatok) ? self.poplatok : 0) === p; return <button key={p} type="button" role="radio" aria-checked={on} onClick={() => zmenSelf({ poplatok: p })} style={{ minHeight: 44, padding: "0 14px", border: "none", borderRadius: 9, background: on ? "var(--seg)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, color: on ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{p ? `${p} €` : "Zadarmo"}</button>; })}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 6 }}>
          <b style={{ fontSize: 14.5 }}>Čo smú veriaci pridať sami</b>
          <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Na verejnej stránke uvidí zelené tlačidlo + Pridať. Ponúkne sa mu len to, čo tu zapnete. Pridávať môžu len registrovaní v DEED.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {DRUHY_FARNIKA.map((d) => { const on = smie(smieF, d.k); return (
            <div key={d.k} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, borderTop: "1px solid var(--cardBd)" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{d.t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{d.s}</span></span>
              <Prepinac on={on} onClick={() => ulozSmie(strankaId, { ...smieF, [d.k]: !on })} label={d.t} />
            </div>); })}
        </div>
        <button type="button" onClick={() => otvorVerejnyProfil(strankaId)} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Pozrieť, ako to vidia veriaci ›</button>
      </>}
      {/* D.4: upozornenie farárovi — PLACEBO — karta 57 D.4: posielanie správ rieši server */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid var(--cardBd)", paddingTop: 10 }}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>Upozorniť ma na nový príspevok</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{nast.upozornit ? "Príde vám správa, keď veriaci niečo pridá alebo nahlási" : "Vypnuté · nové príspevky uvidíte len tu"}</span></span>
        <Prepinac on={nast.upozornit} onClick={() => ulozNastavenieOdVeriacich(strankaId, { upozornit: !nast.upozornit })} label="Upozorniť ma na nový príspevok" />
      </div>
    </section>}
  </>;
}
