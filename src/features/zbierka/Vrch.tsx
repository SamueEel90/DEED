// KARTA 02 · Hlavička, galéria, nadpis a text zbierky.
// Galéria = natívny scroll-snap (žiadna knižnica). Animácie len transform/opacity.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { pressable } from "@/components/pressable";
import { useLayout } from "@/components/context";
import { useVideoUrl } from "@/lib/videoUloz";
import { FormatovanyText } from "@/components/formattext";
import { SpatTlacidlo, ZavrietTlacidlo } from "@/components/cesta";

export type Medium = { typ: "video"; src: string } | { typ: "foto"; src: string };

const TMAVA = "rgba(20,18,14,.7)";
const cislo = (n: number) => n.toLocaleString("sk-SK");

// ---------------- 1 · Hlavička ----------------
export function Hlavicka({ cisloZbierky, overena, onBack, spatNazov, onZavriet }: {
  cisloZbierky?: number; overena?: boolean; onBack: () => void;
  spatNazov?: string;        // kam vedie Späť — zatiaľ sa nezobrazuje (jednotné „‹ Späť")
  onZavriet?: () => void;    // krížik: zavrie celú cestu → feed na mieste, kde bola zbierka
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "6px 0 14px", boxSizing: "border-box" }}>
      <SpatTlacidlo onClick={onBack} />
      {cisloZbierky != null && (
        <span style={{ padding: "5px 10px", borderRadius: 10, background: "var(--bSoft)", border: "1px solid var(--bBd)", color: "var(--blue)", fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>#{cislo(cisloZbierky)}</span>
      )}
      {overena && <span style={{ color: "var(--blue)", fontSize: 13.5, fontWeight: 700 }}>Overená</span>}
      <span aria-label="Ďalšie možnosti" role="button" style={{ marginLeft: "auto", fontSize: 18, color: "var(--ink3)", letterSpacing: 1, cursor: "pointer", padding: "0 4px" }}>···</span>
      {onZavriet && <ZavrietTlacidlo onClick={onZavriet} />}
    </div>
  );
}

// ---------------- bodky (aktívna predĺžená cez scaleX) ----------------
function Bodky({ pocet, aktivna }: { pocet: number; aktivna: number }) {
  // všetky bodky 6 px; aktívna scaleX(3) = 18 px, susedia sa odsunú o 6 px (len transform)
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

const dlzka = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

function PlayKruh({ size }: { size: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: "rgba(20,18,14,.55)", border: "1.5px solid rgba(255,255,255,.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13l11-6.5z" /></svg>
    </span>
  );
}

/** video v galérii: tmavé pozadie + prehrať + dĺžka (načíta sa len metadáta) */
function VideoNahlad({ src, onDlzka }: { src: string; onDlzka: (s: number) => void }) {
  const url = useVideoUrl(src);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#2A2620", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {url && <video src={url} preload="metadata" muted playsInline style={{ display: "none" }} onLoadedMetadata={(e) => onDlzka(e.currentTarget.duration)} />}
      <PlayKruh size={52} />
    </div>
  );
}

// ---------------- 2 · Galéria ----------------
export function Galeria({ media }: { media: Medium[] }) {
  const { wide, desktop } = useLayout();
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [sekundy, setSekundy] = useState<number | null>(null);
  const [cela, setCela] = useState(false);
  if (!media.length) return null; // bez médií nič prázdne

  const vyska = desktop ? 330 : wide ? 280 : 240;
  const radius = desktop ? 22 : wide ? 24 : 0;
  const viac = media.length > 1;
  const naScroll = () => { const el = ref.current; if (el) setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };

  return (
    <>
      <div style={{ position: "relative", margin: wide ? "0 0 16px" : "0 -16px 14px", height: vyska, background: "#2A2620", overflow: "hidden", borderRadius: radius }}>
        <div ref={ref} className="zb-snap" onScroll={naScroll} onClick={() => setCela(true)} role="button" aria-label="Otvoriť galériu na celú obrazovku" style={{ cursor: "zoom-in" }}>
          {media.map((m, i) => (
            <div key={i}>
              {m.typ === "foto"
                ? <span style={{ position: "absolute", inset: 0, background: `url(${m.src}) center/cover no-repeat` }} />
                : <VideoNahlad src={m.src} onDlzka={setSekundy} />}
            </div>
          ))}
        </div>
        {viac && <div style={{ position: "absolute", left: 0, right: 0, top: 10, pointerEvents: "none" }}><Bodky pocet={media.length} aktivna={index} /></div>}
        <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", gap: 6, pointerEvents: "none" }}>
          {viac && (
            <span style={{ padding: "3px 9px", borderRadius: 7, background: TMAVA, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, fontVariantNumeric: "tabular-nums" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-9 8" /></svg>
              {index + 1} / {media.length}
            </span>
          )}
          {media[index]?.typ === "video" && sekundy != null && isFinite(sekundy) && (
            <span style={{ padding: "3px 8px", borderRadius: 7, background: TMAVA, color: "#fff", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{dlzka(sekundy)}</span>
          )}
        </div>
        <span style={{ position: "absolute", right: 10, bottom: 10, width: 30, height: 30, borderRadius: 9, background: "rgba(20,18,14,.6)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
        </span>
      </div>
      {cela && <CelaObrazovka media={media} start={index} onClose={(i) => { setCela(false); setIndex(i); const el = ref.current; if (el) el.scrollLeft = i * el.clientWidth; }} />}
    </>
  );
}

// ---------------- celá obrazovka (otočenie telefónu = natívne, médium je contain) ----------------
function CelaObrazovka({ media, start, onClose }: { media: Medium[]; start: number; onClose: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  useLayoutEffect(() => { const el = ref.current; if (el) el.scrollLeft = start * el.clientWidth; }, [start]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(index); };
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [index, onClose]);
  const naScroll = () => { const el = ref.current; if (el) setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };
  const krivka = "cubic-bezier(.2,.8,.2,1)";

  return createPortal(
    <div className="deed-platba" role="dialog" aria-label="Galéria"
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0B0A08", display: "flex", flexDirection: "column", animation: "zbFsIn .28s ease both" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "max(10px, env(safe-area-inset-top)) 16px 10px", color: "#F1ECE1" }}>
        <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{media.length > 1 ? `${index + 1} / ${media.length}` : ""}</span>
        <button type="button" onClick={() => onClose(index)} aria-label="Zavrieť"
          style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(241,236,225,.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F1ECE1" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="zb-fs-media" style={{ position: "relative", flex: 1, overflow: "hidden", animation: `zbFsScale .32s ${krivka} both` }}>
        <div ref={ref} className="zb-snap" onScroll={naScroll}>
          {media.map((m, i) => <div key={i}>{m.typ === "foto"
            ? <span style={{ position: "absolute", inset: 0, background: `url(${m.src}) center/contain no-repeat` }} />
            : <VideoCele src={m.src} aktivne={i === index} />}</div>)}
        </div>
      </div>
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#A9A395", fontSize: 12.5, fontWeight: 600, paddingTop: 10 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M3 9a9 9 0 0 1 4-5M21 15a9 9 0 0 1-4 5" /></svg>
        Potiahni prstom · otoč telefón pre celú šírku
      </div>
      <div style={{ flex: "none", padding: "12px 0 max(34px, env(safe-area-inset-bottom))" }}>
        {media.length > 1 && <Bodky pocet={media.length} aktivna={index} />}
      </div>
    </div>,
    document.body,
  );
}

/** video na celej obrazovke: ťuk na prehrať spustí prehrávanie; pri odscrollovaní sa zastaví */
function VideoCele({ src, aktivne }: { src: string; aktivne: boolean }) {
  const url = useVideoUrl(src);
  const [hra, setHra] = useState(false);
  // mimo obrazovky sa video odpojí (zastaví)
  if (hra && aktivne && url) return <video src={url} controls autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />;
  return (
    <div {...pressable(() => setHra(true), "Prehrať video")} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <PlayKruh size={72} />
    </div>
  );
}

// ---------------- 3 + 4 · Nadpis a text ----------------
const RIADKY = 3, RIADOK = 21; // 14 px × 1,5

export function NadpisText({ nazov, text, otvoreny: otvorenyZvonka, onOtvoreny }: { nazov: string; text?: string; otvoreny?: boolean; onOtvoreny?: (v: boolean) => void }) {
  const { wide, desktop } = useLayout();
  const obal = useRef<HTMLDivElement>(null);
  const vnutro = useRef<HTMLDivElement>(null);
  const [dlhy, setDlhy] = useState(false);
  const [otvorenyLok, setOtvorenyLok] = useState(false);
  const otvoreny = otvorenyZvonka ?? otvorenyLok;           // pri ceste Späť sa obnoví rozbalenie
  const setOtvoreny = (v: boolean) => { setOtvorenyLok(v); onOtvoreny?.(v); };
  const maText = !!text?.trim();

  useLayoutEffect(() => {
    const meraj = () => { const v = vnutro.current; if (v) setDlhy(v.scrollHeight > RIADKY * RIADOK + 1); };
    meraj();
    const ro = new ResizeObserver(meraj);
    if (vnutro.current) ro.observe(vnutro.current);
    return () => ro.disconnect();
  }, [text]);

  const zbal = () => {
    setOtvoreny(false);
    requestAnimationFrame(() => {
      const el = obal.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
    });
  };

  const nadpis: CSSProperties = { fontSize: desktop ? 30 : wide ? 26 : 20, fontWeight: 800, lineHeight: 1.3, color: "var(--ink)" };
  const odkaz: CSSProperties = { border: "none", boxShadow: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "var(--green)", fontFamily: "inherit" };

  return (
    <div ref={obal} style={{ scrollMarginTop: 12 }}>
      <div style={nadpis}>{nazov}</div>
      {maText && (
        <div style={{ margin: "6px 0 16px" }}>
          <div style={{ position: "relative", maxHeight: otvoreny ? "none" : RIADKY * RIADOK, overflow: "hidden" }}>
            {/* ten istý render formátovaného textu ako v celej appke (tučné, nadpisy, zoznamy, veľkosti, odkazy) */}
            <div ref={vnutro}>
              <FormatovanyText text={text} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", textWrap: "pretty" } as CSSProperties} />
            </div>
            {dlhy && !otvoreny && (
              <button type="button" onClick={() => setOtvoreny(true)}
                style={{ ...odkaz, position: "absolute", right: 0, bottom: 0, height: RIADOK, lineHeight: `${RIADOK}px`, padding: "0 0 0 44px", background: "linear-gradient(90deg, rgba(0,0,0,0), var(--bg) 40px)" }}>… viac</button>
            )}
          </div>
          {dlhy && otvoreny && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={zbal} style={{ ...odkaz, background: "transparent", padding: "2px 0" }}>menej</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
