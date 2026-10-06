// OPRAVY 155/2 — JEDNA galéria na celú obrazovku pre celú appku (feed, zbierka, Príbeh, profily, skutky).
// Tmavé pozadie, popis fotky dole, ďalšia fotka posunom prsta alebo šípkami (aj klávesnica),
// zavrieť ✕, Esc alebo gestom dole. Video sa spustí ťukom. Animácie len transform/opacity.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pressable } from "@/components/pressable";
import { useVideoUrl } from "@/lib/videoUloz";
import "@/styles/platba.css";

export type MediumGalerie = ({ typ: "video"; src: string } | { typ: "foto"; src: string }) & { popis?: string };

const ZAVRIET_PRAH = 110; // px potiahnutia dole

function Bodky({ pocet, aktivna }: { pocet: number; aktivna: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 5 }}>
      {Array.from({ length: pocet }, (_, i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: 6, background: i === aktivna ? "#fff" : "rgba(255,255,255,.55)",
          transform: `translateX(${i < aktivna ? -6 : i > aktivna ? 6 : 0}px) scaleX(${i === aktivna ? 3 : 1})`,
          transition: "transform .3s ease, background-color .3s ease" }} />
      ))}
    </div>
  );
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

export function CelaGaleria({ media, start = 0, onClose }: { media: MediumGalerie[]; start?: number; onClose: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  const [dy, setDy] = useState(0);
  const tah = useRef<{ x: number; y: number; smer: "x" | "y" | null } | null>(null);
  useLayoutEffect(() => { const el = ref.current; if (el) el.scrollLeft = start * el.clientWidth; }, [start]);
  const posun = (o: number) => { const el = ref.current; if (el) el.scrollTo({ left: Math.max(0, Math.min(media.length - 1, index + o)) * el.clientWidth, behavior: "smooth" }); };
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
  const naScroll = () => { const el = ref.current; if (el) setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };

  // gesto dole = zavrieť (len keď ide prst zvisle; vodorovne listuje scroll-snap)
  const tStart = (e: React.TouchEvent) => { const t = e.touches[0]; tah.current = { x: t.clientX, y: t.clientY, smer: null }; };
  const tPohyb = (e: React.TouchEvent) => {
    const s = tah.current; if (!s) return; const t = e.touches[0];
    const ddx = t.clientX - s.x, ddy = t.clientY - s.y;
    if (!s.smer && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) s.smer = Math.abs(ddy) > Math.abs(ddx) ? "y" : "x";
    if (s.smer === "y") setDy(Math.max(0, ddy));
  };
  const tKoniec = () => { const s = tah.current; tah.current = null; if (s?.smer === "y" && dy > ZAVRIET_PRAH) onClose(index); else setDy(0); };

  const viac = media.length > 1;
  const sipka = (o: number) => {
    const vidno = o < 0 ? index > 0 : index < media.length - 1;
    return (
      <button type="button" onClick={() => posun(o)} aria-label={o < 0 ? "Predchádzajúca fotka" : "Ďalšia fotka"} tabIndex={vidno ? 0 : -1}
        style={{ position: "absolute", top: "50%", [o < 0 ? "left" : "right"]: 14, width: 48, height: 48, marginTop: -24, borderRadius: 24, border: "none", background: "rgba(241,236,225,.14)", color: "#F1ECE1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none", opacity: vidno ? 1 : 0, pointerEvents: vidno ? "auto" : "none", transition: "opacity .2s ease" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={o < 0 ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} /></svg>
      </button>);
  };

  return createPortal(
    <div className="deed-platba" role="dialog" aria-modal="true" aria-label="Galéria"
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: `rgba(11,10,8,${Math.max(.4, 1 - dy / 500)})`, display: "flex", flexDirection: "column", animation: "zbFsIn .28s ease both" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "max(10px, env(safe-area-inset-top)) 16px 10px", color: "#F1ECE1", opacity: dy ? 0 : 1, transition: "opacity .2s ease" }}>
        <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{viac ? `${index + 1} / ${media.length}` : ""}</span>
        <button type="button" onClick={() => onClose(index)} aria-label="Zavrieť"
          style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "rgba(241,236,225,.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F1ECE1" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="zb-fs-media" onTouchStart={tStart} onTouchMove={tPohyb} onTouchEnd={tKoniec} onTouchCancel={tKoniec}
        style={{ position: "relative", flex: 1, overflow: "hidden", transform: `translateY(${dy}px)`, transition: dy && tah.current ? "none" : "transform .25s ease", animation: "zbFsScale .32s cubic-bezier(.2,.8,.2,1) both" }}>
        <div ref={ref} className="zb-snap" onScroll={naScroll}>
          {media.map((m, i) => <div key={i}>{m.typ === "foto"
            ? <span role="img" aria-label={m.popis || undefined} style={{ position: "absolute", inset: 0, background: `url("${m.src}") center/contain no-repeat` }} />
            : <VideoCele src={m.src} aktivne={i === index} />}</div>)}
        </div>
        {viac && <>{sipka(-1)}{sipka(1)}</>}
      </div>
      <div style={{ flex: "none", opacity: dy ? 0 : 1, transition: "opacity .2s ease" }}>
        {media[index]?.popis && <div style={{ padding: "12px 20px 0", textAlign: "center", color: "#F1ECE1", fontSize: 15, lineHeight: 1.45 }}>{media[index].popis}</div>}
        <div style={{ padding: "14px 0 max(28px, env(safe-area-inset-bottom))" }}>{viac && <Bodky pocet={media.length} aktivna={index} />}</div>
      </div>
    </div>,
    document.body,
  );
}
