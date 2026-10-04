// ============================================================
// Spoločné diely obsahu zbierky — galéria, textové polia, drobné UI.
// „Kdekoľvek sú fotky = tá istá galéria, kdekoľvek je text = tie isté textové polia" (PRAVIDLA-APPKY).
// Používa Nová zbierka (karta 37) aj Centrálna zbierka (karta 39 · bod 3).
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RichTextInput } from "@/components/richtext";
import { spracujFotku } from "@/lib/obrazok";
import { MAX_FOTIEK_ZB, VIDEO_S_ZB, RIADKY_ZB, ZNAKY_ZB, POPIS_FOTKY_MAX, type MediumZbierky } from "@/lib/novaZbierka";
import { PRAVIDLA_ORG, PRAVIDLA_NADPIS, PRAVIDLA_UVOD } from "@/lib/pravidlaObsahu";

// ---------- drobné UI ----------
export const Ik = ({ d, s = 18, c = "currentColor", w = 2 }: { d: string; s?: number; c?: string; w?: number }) =>
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d={d} /></svg>;
export const I = {
  fajka: "M5 12l5 5 9-10", vlavo: "M15 18l-6-6 6-6", vpravo: "M9 6l6 6-6 6", kos: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  vyrez: "M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2", foto: "M4 5h16v14H4zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M20 15l-5-5L5 19",
  video: "M3 7h12v10H3zM15 10l6-3v10l-6-3", oko: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  karta: "M4 5h16v14H4zM8 10h8M8 14h5", zamok: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
};
export const Zamok = ({ s = 13 }: { s?: number }) => <Ik d={I.zamok} s={s} w={2.2} />;
export const Pecat = () => <span style={{ flex: "none", height: 20, padding: "0 8px", borderRadius: 10, background: "var(--warnBg)", color: "#8A5A2B", fontSize: 11.5, fontWeight: 800, display: "inline-flex", alignItems: "center" }}>zapečatí sa</span>;
export const vyber = (on: boolean): CSSProperties => ({ background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink)" });
export const panel: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 };
export const pole: CSSProperties = { height: 52, padding: "0 16px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
export const pozn: CSSProperties = { fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: "var(--ink3)" };
export const fmtEur = (n: number) => `${n.toLocaleString("sk-SK").replace(/ /g, " ")} €`;
export const fmtSek = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const cis = (n: number) => String(n).replace(".", ",");
export const cistyText = (h: string) => { const d = document.createElement("div"); d.innerHTML = h || ""; return (d.textContent || "").replace(/\s+/g, " ").trim(); };
export const dlzkaVidea = (src: string) => new Promise<number>((ok) => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => ok(v.duration || 0); v.onerror = () => ok(-1); v.src = src; });
export const sirkaFotky = (src: string) => new Promise<number>((ok) => { const i = new Image(); i.onload = () => ok(i.naturalWidth); i.onerror = () => ok(0); i.src = src; });
export const NASTROJE = ["bold", "italic", "insertUnorderedList", "diktovat"];
let MID = Date.now();

/** vzhľad fotky podľa výrezu (mierka + posun) — rovnaký na PC aj mobile */
export function vzhlad(m?: MediumZbierky): CSSProperties {
  const v = m?.vyrez;
  if (!v) return { objectFit: "cover" };
  if (v.rezim === "cela") return { objectFit: "contain", background: "#1D211B" };
  return { objectFit: "cover", objectPosition: `${v.x * 100}% ${v.y * 100}%`, transform: `scale(${v.zoom})`, transformOrigin: `${v.x * 100}% ${v.y * 100}%` };
}
export const Media = ({ m, style }: { m: MediumZbierky; style?: CSSProperties }) => m.typ === "video"
  ? <video src={m.src} muted playsInline style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", ...style }} />
  : <img src={m.src} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", ...vzhlad(m), ...style }} />;

export function Volby<K extends string | number | boolean>({ moznosti, value, onChange, stlpce = 2, vyska = 72 }: { moznosti: { k: K; t: string; s?: string; zamok?: boolean; vpravo?: string }[]; value: K | null; onChange: (k: K) => void; stlpce?: number; vyska?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${stlpce},minmax(0,1fr))`, gap: 10 }}>
      {moznosti.map((o) => { const on = !o.zamok && value === o.k; return (
        <button key={String(o.k)} type="button" aria-pressed={on} aria-disabled={o.zamok} onClick={() => { if (!o.zamok) onChange(o.k); }}
          style={{ ...vyber(on), ...(o.zamok ? { color: "var(--ink3)", opacity: 0.6, cursor: "not-allowed" } : { cursor: "pointer" }), minHeight: vyska, padding: "12px 16px", borderRadius: 14, fontFamily: "inherit", textAlign: o.vpravo ? "left" : "left", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 800 }}>{o.t}{o.zamok && <Zamok />}</span>
            {o.s && <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: on ? "var(--gInk)" : "var(--ink3)" }}>{o.s}</span>}
          </span>
          {o.vpravo && <span style={{ flex: "none", fontSize: 13, fontWeight: 800 }}>{o.vpravo}</span>}
        </button>); })}
    </div>);
}
export const Nadpis = ({ t, pecat, d }: { t: string; pecat?: boolean; d?: ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={{ fontSize: 15.5, fontWeight: 800, color: "var(--ink)" }}>{t}</span>{d}{pecat && <Pecat />}</div>);

// ============================================================
// zaškrtnutie (súhlas v kroku 2, pravdivosť v kroku 6)
export const Zaskrtnutie = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" role="checkbox" aria-checked={on} onClick={onClick} style={{ minHeight: 60, padding: "12px 18px", borderRadius: 16, border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, background: "var(--field)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 14 }}>
    <span style={{ width: 26, height: 26, flex: "none", borderRadius: 8, border: `2px solid ${on ? "var(--green)" : "#BDB6A8"}`, background: on ? "var(--green)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <Ik d={I.fajka} s={15} w={3} />}</span>
    <b style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink)", alignSelf: "center" }}>{children}</b>
  </button>);
export const odkaz: CSSProperties = { border: "none", background: "transparent", padding: "10px 0", color: "var(--green)", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" };

/** Pravidlá obsahu — rovnaké body ako pri skutku za charitu (jeden zdroj) */
export function PravidlaObsahu({ ph, stit, onZavri }: { ph: boolean; stit: string; onZavri: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  return createPortal(
    <div className="sprava-charity" data-stit={stit} style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: ph ? "flex-end" : "center", justifyContent: "center", padding: ph ? 0 : 24, background: "transparent", minHeight: 0 }}>
      <div onClick={onZavri} style={{ position: "absolute", inset: 0, background: "rgba(20,18,14,.45)" }} />
      <div role="dialog" aria-modal="true" aria-label="Pravidlá obsahu" className="pf-rise" style={{ position: "relative", width: "100%", maxWidth: ph ? undefined : 560, maxHeight: ph ? "90%" : "86vh", overflowY: "auto", borderRadius: ph ? "28px 28px 0 0" : 24, background: "var(--panel)", padding: ph ? "20px 20px max(28px, env(safe-area-inset-bottom))" : "26px 28px 28px", display: "flex", flexDirection: "column", gap: 12, color: "var(--ink)" }}>
        <span style={{ fontSize: 21, fontWeight: 800 }}>{PRAVIDLA_NADPIS}</span>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{PRAVIDLA_UVOD}</span>
        {PRAVIDLA_ORG.map(([t, x]) => (
          <div key={t} style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}><span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flex: "none", marginTop: 8 }} /><span><b style={{ color: "var(--ink)" }}>{t}</b> {x}</span></div>))}
        <button type="button" onClick={onZavri} style={{ height: 52, marginTop: 6, border: "none", borderRadius: 14, background: "var(--green)", color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Rozumiem</button>
      </div>
    </div>, document.body);
}


/** TEXTOVÉ POLIA — hlavný text (najviac 12 riadkov) + pokračovanie po „… viac", spolu 1 500 znakov */
export function TextovePolia({ popis, popis2, onPopis, onPopis2, ph, pecat, onRiadky, popisHlavneho = "Toto ľudia uvidia hneď. Napíšte, komu a na čo idú peniaze, tak, aby to zaujalo. Najviac 12 riadkov." }: {
  popis: string; popis2: string; onPopis: (h: string) => void; onPopis2: (h: string) => void; ph: boolean; pecat?: boolean; onRiadky?: (n: number) => void; popisHlavneho?: string;
}) {
  const [riadky, setRiadky] = useState(0);
  const [zn1, setZn1] = useState(0);
  const [zn2, setZn2] = useState(0);
  const dlhy = riadky > RIADKY_ZB, f = dlhy ? "#A34A2A" : riadky > 9 ? "#8A5A2B" : "var(--green)";
  return (<>
        <Nadpis t="Hlavný text" pecat={pecat} />
    <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", marginTop: -6 }}>{ph ? "Toto ľudia uvidia hneď. Najviac 12 riadkov." : popisHlavneho}</span>
    <RichTextInput vzhlad="sprava" value={popis} onChange={onPopis} nastroje={NASTROJE} minH={150} chybaRam={dlhy}
      ariaLabel="Hlavný text" tvrdyLimit={Math.max(0, ZNAKY_ZB - zn2)} onRiadky={(n) => { setRiadky(n); onRiadky?.(n); }} onZnaky={setZn1} />
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", borderRadius: 3, background: f, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, riadky / RIADKY_ZB)})`, transition: "transform .3s ease" }} /></span>
      <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: f }}>{riadky} z {RIADKY_ZB} riadkov</span>
    </div>
    {dlhy && <span style={{ fontSize: 13, fontWeight: 700, color: "#A34A2A", lineHeight: 1.45 }}>{ph ? "Skráťte ho, alebo časť presuňte nižšie do pokračovania." : "Hlavný text je dlhší ako 12 riadkov. Skráťte ho, alebo časť presuňte nižšie do „Pokračovanie príbehu“."}</span>}
    <Nadpis t="Pokračovanie príbehu" d={<span style={{ fontSize: 14, color: "var(--ink3)" }}>— nepovinné</span>} />
    <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", marginTop: -6 }}>{ph ? "Ukáže sa po kliknutí na „… viac“." : "Ukáže sa, až keď darca klikne na „… viac“. Sem patria podrobnosti."}</span>
    <RichTextInput vzhlad="sprava" value={popis2} onChange={onPopis2} nastroje={NASTROJE} minH={130}
      ariaLabel="Pokračovanie príbehu" tvrdyLimit={Math.max(0, ZNAKY_ZB - zn1)} onZnaky={setZn2} />
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={pozn}>Text z Wordu, Facebooku či Instagramu si tučné, kurzívu aj odrážky ponechá.</span>
      <span style={{ ...pozn, fontWeight: 800, flex: "none" }}>{(zn1 + zn2).toLocaleString("sk-SK")} / 1 500</span>
    </div>
  </>);
}

/** GALÉRIA — fotky (najviac 8) a jedno video do 45 s, poradie, výrez, pretiahnutie, popis fotky. Výrez rieši volajúci (onVyrez, bez neho sa tlačidlo neukáže).
 *  5. 10.: pod každou fotkou pole Popis (nepovinné, najviac 80 znakov) — darca ho vidí pod fotkou na celej obrazovke, čítačka ako alt.
 *  popisNapoveda = placeholder poľa (pri dokladoch „Napríklad: Pred opravou, Po oprave"). Jedna galéria všade, bez PRED / PO. */
export function GaleriaEditor({ media, onMedia, ph, onVyrez, nadpis = "Galéria zbierky", dovetok = " Fotky a video môžete pridávať aj po spustení zbierky.", popisNapoveda = "Popis fotky (nepovinné)", children }: {
  media: MediumZbierky[]; onMedia: (m: MediumZbierky[]) => void; ph: boolean; onVyrez?: (id: number) => void; nadpis?: string; dovetok?: string; popisNapoveda?: string; children?: ReactNode;
}) {
  const [chybaMed, setChybaMed] = useState("");
  const [drag, setDrag] = useState<number | null>(null);
  const [nadZonou, setNadZonou] = useState(false);
  const [male, setMale] = useState<Record<number, boolean>>({});
  const fotoRef = useRef<HTMLInputElement>(null), vidRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef(media); mediaRef.current = media;
  const fotiek = media.filter((m) => m.typ === "foto").length;
  const video = media.find((m) => m.typ === "video");
  const pridajSubory = async (subory: File[]) => {
    setChybaMed("");
    const nove: MediumZbierky[] = [];
    const akt = mediaRef.current; let fot = akt.filter((m) => m.typ === "foto").length, vid = akt.some((m) => m.typ === "video");
    for (const f of subory) {
      if (f.type.startsWith("video/")) {
        if (vid) continue;
        const src = URL.createObjectURL(f); const s = await dlzkaVidea(src);
        if (s < 0) { setChybaMed("Toto video sa nedá otvoriť. Skúste iný súbor."); continue; }
        if (s > VIDEO_S_ZB + 0.5) { URL.revokeObjectURL(src); setChybaMed(`Video má ${fmtSek(s)}. Najviac je 45 sekúnd, skráťte ho v telefóne a skúste znova.`); continue; }
        nove.push({ id: MID++, typ: "video", src, sek: s }); vid = true;
      } else if (f.type.startsWith("image/")) {
        if (fot >= MAX_FOTIEK_ZB) { setChybaMed(`Pridali sme ${MAX_FOTIEK_ZB - akt.filter((m) => m.typ === "foto").length}. Najviac je 8 fotiek.`); break; }
        try {
          const src = await spracujFotku(f, { pomer: null, maxSirka: 2000 }); const w = await sirkaFotky(src);
          nove.push({ id: MID++, typ: "foto", src, w }); fot++;
        } catch (e) { setChybaMed(e instanceof Error ? e.message : "Fotku sa nepodarilo načítať."); }
      }
    }
    if (nove.length) onMedia([...mediaRef.current, ...nove]);
  };
  const presun = (i: number, j: number) => { if (j < 0 || j >= media.length || i === j) return; const m = [...media]; const [x] = m.splice(i, 1); m.splice(j, 0, x); onMedia(m); };
  useEffect(() => { media.forEach((m) => { if (m.typ === "foto" && m.w && m.w < 1200 && !male[m.id]) setMale((x) => ({ ...x, [m.id]: true })); }); }, [media, male]);

    const pridat = (foto: boolean) => (
      <button type="button" onClick={() => (foto ? fotoRef : vidRef).current?.click()} style={{ minHeight: ph ? 92 : 140, borderRadius: 14, border: "2px dashed var(--gBd)", background: "transparent", color: "var(--green)", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 10, textAlign: "center" }}>
        <Ik d={foto ? I.foto : I.video} s={22} />
        <b style={{ fontSize: 15 }}>{foto ? "Pridať fotky" : "Pridať video"}</b>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink2)" }}>{foto ? (ph ? "aj viac naraz" : "alebo ich sem pretiahnite, aj viac naraz") : ph ? "do 45 s" : "nepovinné · jedno, do 45 s"}</span>
      </button>);
    const tl: CSSProperties = { height: 36, minWidth: 36, padding: "0 10px", border: "none", borderRadius: 10, background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 };
  return (
      <section style={{ ...panel, background: nadZonou ? "var(--gSoft)" : "var(--card)", outline: nadZonou ? "2px dashed var(--green)" : "none" }}
        onDragOver={(e) => { e.preventDefault(); if (drag == null && !nadZonou) setNadZonou(true); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setNadZonou(false); }}
        onDrop={(e) => { e.preventDefault(); setNadZonou(false); if (e.dataTransfer.files?.length) void pridajSubory(Array.from(e.dataTransfer.files)); }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 15.5, fontWeight: 800 }}>{nadpis}</span><span style={{ ...pozn, fontWeight: 800 }}>{fotiek} / 8 fotiek · {video ? `1 video ${fmtSek(video.sek ?? 0)}` : "bez videa"}</span></div>
        {ph && <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>{fotiek < MAX_FOTIEK_ZB && pridat(true)}{!video && pridat(false)}</div>}
        <div style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: 14 }}>
          {media.map((m, i) => (
            <div key={m.id} draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDrag(i); }} onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files?.length) { setDrag(null); void pridajSubory(Array.from(e.dataTransfer.files)); return; } if (drag != null) presun(drag, i); setDrag(null); }} onDragEnd={() => setDrag(null)}
              style={{ display: "flex", flexDirection: "column", gap: 8, opacity: drag === i ? 0.4 : 1 }}>
              <span style={{ position: "relative", display: "block", aspectRatio: "16 / 10", borderRadius: 14, overflow: "hidden", background: "#1D211B", boxShadow: i === 0 ? "0 0 0 3px var(--green)" : "none", cursor: "grab" }}>
                <Media m={m} />
                {i === 0 && <span style={{ position: "absolute", left: 8, top: 8, height: 22, padding: "0 8px", borderRadius: 11, background: "var(--green)", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center" }}>HLAVNÉ</span>}
                {m.typ === "video" && <span style={{ position: "absolute", right: 8, top: 8, height: 22, padding: "0 8px", borderRadius: 11, background: "rgba(20,18,14,.7)", color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center" }}>VIDEO · {fmtSek(m.sek ?? 0)}</span>}
                <span style={{ position: "absolute", left: 8, bottom: 8, width: 26, height: 26, borderRadius: "50%", background: "#fff", color: "var(--ink)", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              </span>
              {male[m.id] && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#8A5A2B" }}>Fotka je malá, na PC môže byť rozmazaná.</span>}
              <input value={m.popis ?? ""} maxLength={POPIS_FOTKY_MAX} onChange={(e) => onMedia(media.map((x) => (x.id === m.id ? { ...x, popis: e.target.value.slice(0, POPIS_FOTKY_MAX) } : x)))}
                placeholder={popisNapoveda} aria-label={`Popis ${m.typ === "video" ? "videa" : "fotky"} ${i + 1}`}
                style={{ height: 44, padding: "0 12px", borderRadius: 12, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 14, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={() => presun(i, i - 1)} aria-label="Posunúť dopredu" disabled={i === 0} style={{ ...tl, opacity: i === 0 ? 0.35 : 1 }}><Ik d={I.vlavo} s={15} w={2.4} /></button>
                <button type="button" onClick={() => presun(i, i + 1)} aria-label="Posunúť dozadu" disabled={i === media.length - 1} style={{ ...tl, opacity: i === media.length - 1 ? 0.35 : 1 }}><Ik d={I.vpravo} s={15} w={2.4} /></button>
                {m.typ === "foto" && onVyrez && <button type="button" onClick={() => onVyrez(m.id)} style={tl}><Ik d={I.vyrez} s={14} />Výrez</button>}
                {i > 0 && <button type="button" onClick={() => presun(i, 0)} style={{ ...tl, background: "var(--gSoft)", color: "var(--gInk)" }}>Hlavné</button>}
                <span style={{ flex: 1 }} />
                <button type="button" onClick={() => onMedia(media.filter((x) => x.id !== m.id))} aria-label={`Odstrániť ${m.typ === "video" ? "video" : "fotku"} ${i + 1}`} style={{ ...tl, background: "transparent", color: "var(--ink3)" }}><Ik d={I.kos} s={16} /></button>
              </div>
            </div>))}
          {!ph && fotiek < MAX_FOTIEK_ZB && pridat(true)}
          {!ph && !video && pridat(false)}
        </div>
        <input ref={fotoRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; void pridajSubory(f); }} />
        <input ref={vidRef} type="file" accept="video/*" hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; void pridajSubory(f); }} />
        {chybaMed && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "#A34A2A" }}>{chybaMed}</span>}
        {!ph && <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 14, background: "var(--field)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink2)" }}>
          <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", background: "var(--gSoft)", color: "var(--gInk)", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>i</span>
          <span><b style={{ color: "var(--ink)" }}>Prvé je hlavné.</b> To ľudia uvidia ako prvé vo feede aj na vašom profile. Viac fotiek naraz pretiahnete z počítača rovno sem, alebo ich v okne vyberiete s podržaným Ctrl (na Macu Cmd). Poradie zmeníte potiahnutím alebo šípkami. Tlačidlom Výrez nastavíte, ktorá časť fotky bude vidno.{dovetok}</span>
        </div>}
        {children}
      </section>);
}
