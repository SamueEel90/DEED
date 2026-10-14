// OPRAVY 155/2 — JEDNA galéria na celú obrazovku pre celú appku (feed, zbierka, Príbeh, profily, skutky, albumy farnosti).
// OPRAVY 261: fotka je hlavná — čierne pozadie, fotka čo najväčšia (contain) na výšku aj na šírku.
// Hore tenká lišta nad fotkou (počítadlo „2 / 9“, × Zavrieť 44 px). Nadpis (1 riadok) a popis fotky (2 riadky + „viac“) dole na fotke.
// Mobil: listovanie prstom, bez šípok; dvojťuk a roztiahnutie prstami = priblíženie; potiahnutie dole = zavrieť.
// Pás náhľadov 56 px pod fotkou (na šírku skrytý), prázdny / nenačítaný náhľad sa neukáže. PC: šípky 48 px pri okraji mimo fotky.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { pressable } from "@/components/pressable";
import { useVideoUrl } from "@/lib/videoUloz";
import "@/styles/platba.css";

export type MediumGalerie = ({ typ: "video"; src: string } | { typ: "foto"; src: string }) & { popis?: string };

const ZAVRIET_PRAH = 110; // px potiahnutia dole
const BIELA = "#F1ECE1";

function useDotaz(q: string) {
  const [m, setM] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(q).matches);
  useEffect(() => { const mq = window.matchMedia?.(q); if (!mq) return; const f = () => setM(mq.matches); f(); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); }, [q]);
  return m;
}

function VideoCele({ src, aktivne }: { src: string; aktivne: boolean }) {
  const url = useVideoUrl(src);
  const [hra, setHra] = useState(false);
  if (hra && aktivne && url) return <video src={url} controls autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />;
  return (
    <div {...pressable(() => setHra(true), "Prehrať video")} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <span style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(20,18,14,.55)", border: "1.5px solid rgba(255,255,255,.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={33} height={33} viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13l11-6.5z" /></svg>
      </span>
    </div>
  );
}

type Zoom = { s: number; x: number; y: number };
const BEZ: Zoom = { s: 1, x: 0, y: 0 };

export function CelaGaleria({ media, start = 0, onClose, nadpis }: { media: MediumGalerie[]; start?: number; onClose: (index: number) => void; /** OPRAVY 261: nadpis albumu / príspevku (1 riadok dole) */ nadpis?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pasRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(start);
  const [dy, setDy] = useState(0);
  const [zm, setZm] = useState<Zoom>(BEZ);
  const [viac, setViac] = useState(false);
  const [dlhy, setDlhy] = useState(false);
  const [tahom, setTahom] = useState(false);
  const [zle, setZle] = useState<ReadonlySet<string>>(() => new Set());
  const pc = useDotaz("(hover: hover) and (pointer: fine)");
  const nizke = useDotaz("(max-height: 500px)"); // telefón na šírku: bez pásu náhľadov
  const tah = useRef<{ x: number; y: number; smer: "x" | "y" | "pan" | "pinch" | null; d0?: number; z0: Zoom; t: number } | null>(null);
  const tuk = useRef<{ t: number; x: number; y: number } | null>(null);
  useLayoutEffect(() => { const el = ref.current; if (el) el.scrollLeft = start * el.clientWidth; }, [start]);
  const posun = (o: number) => { const el = ref.current; if (el) el.scrollTo({ left: Math.max(0, Math.min(media.length - 1, index + o)) * el.clientWidth, behavior: "smooth" }); };
  const naIndex = (i: number) => { const el = ref.current; if (el) el.scrollTo({ left: i * el.clientWidth }); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(index);
      if (e.key === "ArrowRight") posun(1);
      if (e.key === "ArrowLeft") posun(-1);
    };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  });
  const naScroll = () => { const el = ref.current; if (!el) return; const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth)); if (i !== index) { setIndex(i); setZm(BEZ); setViac(false); } };
  // popis dlhší ako 2 riadky → „viac“
  const popis = media[index]?.popis?.trim() ?? "";
  useLayoutEffect(() => { const el = popRef.current; setDlhy(!!el && el.scrollHeight > el.clientHeight + 1); }, [popis, index, viac]);
  // aktívny náhľad v páse ostane viditeľný
  useEffect(() => { const p = pasRef.current, b = p?.querySelector<HTMLElement>(`[data-i="${index}"]`); if (p && b) { const l = b.offsetLeft - p.clientWidth / 2 + b.offsetWidth / 2; p.scrollTo({ left: l, behavior: "smooth" }); } }, [index]);

  const obmedz = (z: Zoom): Zoom => {
    const el = ref.current; if (!el || z.s <= 1) return BEZ;
    const mx = (el.clientWidth * (z.s - 1)) / 2, my = (el.clientHeight * (z.s - 1)) / 2;
    return { s: z.s, x: Math.max(-mx, Math.min(mx, z.x)), y: Math.max(-my, Math.min(my, z.y)) };
  };
  const dvojtuk = (cx: number, cy: number) => {
    const el = ref.current; if (!el) return;
    if (zm.s > 1) { setZm(BEZ); return; }
    const r = el.getBoundingClientRect(), s = 2.5;
    setZm(obmedz({ s, x: (r.left + r.width / 2 - cx) * (s - 1), y: (r.top + r.height / 2 - cy) * (s - 1) }));
  };
  const vzd = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const tStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setTahom(true);
    if (e.touches.length === 2) { tah.current = { x: t.clientX, y: t.clientY, smer: "pinch", d0: vzd(e.touches), z0: zm, t: Date.now() }; return; }
    tah.current = { x: t.clientX, y: t.clientY, smer: zm.s > 1 ? "pan" : null, z0: zm, t: Date.now() };
  };
  const tPohyb = (e: React.TouchEvent) => {
    const s = tah.current; if (!s) return; const t = e.touches[0];
    if (s.smer === "pinch" && e.touches.length === 2 && s.d0) { setZm(obmedz({ ...s.z0, s: Math.max(1, Math.min(4, s.z0.s * vzd(e.touches) / s.d0)) })); return; }
    const ddx = t.clientX - s.x, ddy = t.clientY - s.y;
    if (s.smer === "pan") { setZm(obmedz({ s: s.z0.s, x: s.z0.x + ddx, y: s.z0.y + ddy })); return; }
    if (!s.smer && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) s.smer = Math.abs(ddy) > Math.abs(ddx) ? "y" : "x";
    if (s.smer === "y") setDy(Math.max(0, ddy));
  };
  const tKoniec = (e: React.TouchEvent) => {
    const s = tah.current; tah.current = null;
    setTahom(false);
    if (s?.smer === "y" && dy > ZAVRIET_PRAH) { onClose(index); return; }
    setDy(0);
    // dvojťuk: dva krátke ťuky do 300 ms blízko seba
    const c = e.changedTouches[0];
    if (s && !s.smer && c && Date.now() - s.t < 250) {
      const p = tuk.current, teraz = Date.now();
      if (p && teraz - p.t < 300 && Math.hypot(p.x - c.clientX, p.y - c.clientY) < 30) { tuk.current = null; dvojtuk(c.clientX, c.clientY); }
      else tuk.current = { t: teraz, x: c.clientX, y: c.clientY };
    }
  };

  const viacFotiek = media.length > 1;
  const nahlady = media.map((m, i) => ({ m, i })).filter(({ m }) => m.typ === "video" || !zle.has(m.src));
  const pas = viacFotiek && !nizke && nahlady.length > 1;
  const sipka = (o: number) => {
    const vidno = o < 0 ? index > 0 : index < media.length - 1;
    return (
      <button type="button" onClick={() => posun(o)} aria-label={o < 0 ? "Predchádzajúca fotka" : "Ďalšia fotka"} tabIndex={vidno ? 0 : -1}
        style={{ position: "absolute", top: "50%", [o < 0 ? "left" : "right"]: 18, zIndex: 2, width: 48, height: 48, marginTop: -24, borderRadius: 24, border: "none", background: "rgba(241,236,225,.16)", color: BIELA, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none", opacity: vidno ? 1 : 0, pointerEvents: vidno ? "auto" : "none", transition: "opacity .2s ease" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={o < 0 ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} /></svg>
      </button>);
  };
  const skry: CSSProperties = { opacity: dy || zm.s > 1 ? 0 : 1, pointerEvents: dy || zm.s > 1 ? "none" : undefined, transition: "opacity .2s ease" };
  const nad = nadpis?.trim() ?? "";

  return createPortal(
    <div className="deed-platba" role="dialog" aria-modal="true" aria-label={nad || "Galéria"}
      style={{ position: "fixed", inset: 0, zIndex: 1150, background: `rgba(0,0,0,${Math.max(.4, 1 - dy / 500)})`, display: "flex", flexDirection: "column", overscrollBehavior: "contain", animation: "zbFsIn .28s ease both" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div className="zb-fs-media" onTouchStart={tStart} onTouchMove={tPohyb} onTouchEnd={tKoniec} onTouchCancel={tKoniec} onDoubleClick={(e) => dvojtuk(e.clientX, e.clientY)}
          style={{ position: "absolute", top: 0, bottom: 0, left: pc && viacFotiek ? 84 : 0, right: pc && viacFotiek ? 84 : 0, overflow: "hidden", touchAction: zm.s > 1 ? "none" : "pan-x", transform: `translateY(${dy}px)`, transition: dy && tahom ? "none" : "transform .25s ease", animation: "zbFsScale .32s cubic-bezier(.2,.8,.2,1) both" }}>
          <div ref={ref} className="zb-snap" onScroll={naScroll} style={{ overflowX: zm.s > 1 ? "hidden" : undefined }}>
            {media.map((m, i) => <div key={i}>{m.typ === "foto"
              ? <img src={m.src} alt={m.popis || ""} draggable={false} onError={() => setZle((z) => (z.has(m.src) ? z : new Set(z).add(m.src)))}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", userSelect: "none", transform: i === index && zm.s > 1 ? `translate(${zm.x}px, ${zm.y}px) scale(${zm.s})` : undefined, transition: tahom ? "none" : "transform .2s ease" }} />
              : <VideoCele src={m.src} aktivne={i === index} />}</div>)}
          </div>
        </div>
        {pc && viacFotiek && <>{sipka(-1)}{sipka(1)}</>}
        {/* hore tenká lišta nad fotkou */}
        <div style={{ ...skry, position: "absolute", left: 0, right: 0, top: 0, zIndex: 3, minHeight: 56, boxSizing: "border-box", padding: "max(6px, env(safe-area-inset-top)) 12px 6px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "linear-gradient(180deg, rgba(0,0,0,.6), rgba(0,0,0,0))", color: BIELA }}>
          <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{viacFotiek ? `${index + 1} / ${media.length}` : ""}</span>
          <button type="button" onClick={() => onClose(index)}
            style={{ minHeight: 44, padding: "0 14px", borderRadius: 22, border: "none", background: "rgba(241,236,225,.16)", color: BIELA, cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none" }}>× Zavrieť</button>
        </div>
        {/* nadpis a popis fotky dole na fotke */}
        {(nad || popis) && <div style={{ ...skry, position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3, padding: `36px ${pc && viacFotiek ? 84 : 16}px ${pas ? "12px" : "max(14px, env(safe-area-inset-bottom))"}`, background: viac ? "rgba(0,0,0,.86)" : "linear-gradient(0deg, rgba(0,0,0,.78), rgba(0,0,0,0))", color: BIELA, display: "flex", flexDirection: "column", gap: 4, maxHeight: viac ? "55%" : undefined, overflowY: viac ? "auto" : undefined, boxSizing: "border-box" }}>
          {nad && <b style={{ fontSize: 17, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nad}</b>}
          {popis && <span ref={popRef} onClick={() => (dlhy || viac) && setViac((v) => !v)}
            style={{ fontSize: 15, lineHeight: 1.45, color: "#E8E1D3", whiteSpace: "pre-line", cursor: dlhy || viac ? "pointer" : undefined, ...(viac ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }) } as CSSProperties}>{popis}</span>}
          {popis && (dlhy || viac) && <button type="button" onClick={() => setViac((v) => !v)} style={{ alignSelf: "flex-start", minHeight: 36, padding: 0, border: "none", background: "transparent", color: "#C6E3AE", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>{viac ? "menej" : "viac"}</button>}
        </div>}
      </div>
      {/* pás náhľadov (na šírku skrytý) */}
      {pas && <div ref={pasRef} style={{ ...skry, flex: "none", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", padding: `8px 16px max(10px, env(safe-area-inset-bottom))`, justifyContent: nahlady.length * 62 < (typeof window !== "undefined" ? window.innerWidth - 32 : 0) ? "center" : "flex-start" }}>
        {nahlady.map(({ m, i }) => <button key={i} data-i={i} type="button" onClick={() => naIndex(i)} aria-label={`Fotka ${i + 1}`} aria-current={i === index ? "true" : undefined}
          style={{ flex: "none", width: 56, height: 56, padding: 0, borderRadius: 8, overflow: "hidden", border: `2px solid ${i === index ? "#fff" : "transparent"}`, background: "#1D1B16", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: i === index ? 1 : 0.7, boxShadow: "none" }}>
          {m.typ === "foto"
            ? <img src={m.src} alt="" loading="lazy" onError={() => setZle((z) => (z.has(m.src) ? z : new Set(z).add(m.src)))} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>}
        </button>)}
      </div>}
    </div>,
    document.body,
  );
}

const fotiekG = (n: number) => `${n} ${n === 1 ? "fotka" : n >= 2 && n <= 4 ? "fotky" : "fotiek"}`;
/** OPRAVY 270: odznak „N fotiek" v rohu fotky, keď je ich viac (rodič má position: relative) */
export function OdznakFotiek({ m, hore }: { m: MediumGalerie[]; hore?: boolean }) {
  const v = m.some((x) => x.typ === "video"), f = m.length - (v ? 1 : 0);
  if (!v && f < 2) return null;
  // OPRAVY 284 (3): s videom malé ▶ v rohu, video ide v prehliadači prvé
  return <span style={{ position: "absolute", right: hore ? 20 : 10, ...(hore ? { top: 20 } : { bottom: 10 }), padding: "3px 9px", borderRadius: 7, background: "rgba(20,17,11,.78)", color: "#fff", fontSize: 14, fontWeight: 700, pointerEvents: "none", display: "flex", alignItems: "center", gap: 6 }}>
    {v && <span aria-hidden="true" style={{ width: 0, height: 0, borderLeft: "9px solid #fff", borderTop: "6px solid transparent", borderBottom: "6px solid transparent" }} />}
    {v ? (f > 1 ? `s videom · ${fotiekG(f)}` : "s videom") : fotiekG(f)}</span>;
}
