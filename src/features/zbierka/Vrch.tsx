// KARTA 02 · Hlavička, galéria, nadpis a text zbierky.
// Galéria = natívny scroll-snap (žiadna knižnica). Animácie len transform/opacity.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLayout } from "@/components/context";
import { useVideoUrl } from "@/lib/videoUloz";
import { FormatovanyText } from "@/components/formattext";
import { SpatTlacidlo, ZavrietTlacidlo } from "@/components/cesta";
import { kopiruj } from "@/lib/zdielanie";
import { toast } from "@/components/toast";
import { CelaGaleria } from "@/components/celaGaleria";

/** 5. 10. · popis = nepovinný popis fotky (najviac 80 znakov): darca ho vidí pod fotkou na celej obrazovke, čítačka ako alt */
export type Medium = ({ typ: "video"; src: string } | { typ: "foto"; src: string }) & { popis?: string };

const TMAVA = "rgba(20,18,14,.7)";

// ---------------- 1 · Hlavička ----------------
export function Hlavicka({ cisloZbierky, overena, onBack, onZavriet, onMoznosti }: {
  /** KARTA 48: verejné číslo zbierky „Z-123 456 789 0" (= variabilný symbol), ťuk = skopírovať */
  cisloZbierky?: string; overena?: boolean; onBack: () => void;
  spatNazov?: string;        // kam vedie Späť — zatiaľ sa nezobrazuje (jednotné „‹ Späť")
  onZavriet?: () => void;    // krížik: zavrie celú cestu → feed na mieste, kde bola zbierka
  onMoznosti?: () => void;   // ⋯ menu zbierky (Nahlásiť — OPRAVY 51)
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "6px 0 14px", boxSizing: "border-box" }}>
      <SpatTlacidlo onClick={onBack} />
      {cisloZbierky != null && (
        <button type="button" onClick={async () => { const ok = await kopiruj(cisloZbierky.replace(/^[A-Z]-/, "").replace(/\s/g, "")); toast(ok ? "Číslo zbierky je skopírované" : "Číslo sa nepodarilo skopírovať"); }} aria-label={`Číslo zbierky ${cisloZbierky}, skopírovať`}
          style={{ minHeight: 44, padding: "0 10px", borderRadius: 10, background: "var(--bSoft)", border: "1px solid var(--bBd)", color: "var(--blue)", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", cursor: "pointer", boxShadow: "none" }}>{cisloZbierky}</button>
      )}
      {overena && <span style={{ color: "var(--blue)", fontSize: 13.5, fontWeight: 700 }}>Overená</span>}
      <button type="button" aria-label="Ďalšie možnosti" onClick={onMoznosti} style={{ marginLeft: "auto", minWidth: 44, height: 44, border: "none", background: "transparent", fontSize: 18, color: "var(--ink3)", letterSpacing: 1, cursor: "pointer", padding: "0 4px", fontFamily: "inherit" }}>···</button>
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
export function Galeria({ media, vyska: vyskaP, radius: radiusP, okraj, prekrytie, bezBodiek }: {
  media: Medium[];
  /** 5. 10. · galéria aj v náhľade „Posielaš do …" (iná výška, rám, bez okraja) */
  vyska?: number; radius?: number | string; okraj?: string;
  /** štítky nad fotkou (napr. „Posielaš do · …"), neklikateľné */
  prekrytie?: ReactNode;
  bezBodiek?: boolean;
}) {
  const { wide, desktop } = useLayout();
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [sekundy, setSekundy] = useState<number | null>(null);
  const [cela, setCela] = useState(false);
  const [nad, setNad] = useState(false); // PC: šípky ‹ › pri prechode myšou
  if (!media.length) return null; // bez médií nič prázdne

  const vyska = vyskaP ?? (desktop ? 330 : wide ? 280 : 240);
  const radius = radiusP ?? (desktop ? 22 : wide ? 24 : 0);
  const viac = media.length > 1;
  const naScroll = () => { const el = ref.current; if (el) setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };
  const posun = (o: number) => { const el = ref.current; if (el) el.scrollTo({ left: Math.max(0, Math.min(media.length - 1, index + o)) * el.clientWidth, behavior: "smooth" }); };
  const sipka = (o: number) => (
    <button type="button" onClick={(e) => { e.stopPropagation(); posun(o); }} aria-label={o < 0 ? "Predchádzajúca fotka" : "Ďalšia fotka"}
      style={{ position: "absolute", top: "50%", [o < 0 ? "left" : "right"]: 8, width: 44, height: 44, marginTop: -22, borderRadius: 22, border: "none", background: "rgba(20,18,14,.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none", opacity: nad && (o < 0 ? index > 0 : index < media.length - 1) ? 1 : 0, pointerEvents: nad ? "auto" : "none", transition: "opacity .2s ease" } as CSSProperties}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={o < 0 ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} /></svg>
    </button>
  );

  return (
    <>
      <div onMouseEnter={() => setNad(true)} onMouseLeave={() => setNad(false)} style={{ position: "relative", margin: okraj ?? (wide ? "0 0 16px" : "0 -16px 14px"), height: vyska, background: "#2A2620", overflow: "hidden", borderRadius: radius }}>
        <div ref={ref} className="zb-snap" onScroll={naScroll} onClick={() => setCela(true)} role="button" aria-label="Otvoriť galériu na celú obrazovku" style={{ cursor: "zoom-in" }}>
          {media.map((m, i) => (
            <div key={i}>
              {m.typ === "foto"
                ? <span role="img" aria-label={m.popis || undefined} style={{ position: "absolute", inset: 0, background: `url(${m.src}) center/cover no-repeat` }} />
                : <VideoNahlad src={m.src} onDlzka={setSekundy} />}
            </div>
          ))}
        </div>
        {prekrytie && <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{prekrytie}</div>}
        {viac && desktop && <>{sipka(-1)}{sipka(1)}</>}
        {viac && !bezBodiek && <div style={{ position: "absolute", left: 0, right: 0, top: 10, pointerEvents: "none" }}><Bodky pocet={media.length} aktivna={index} /></div>}
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
      {cela && <CelaGaleria media={media} start={index} onClose={(i) => { setCela(false); setIndex(i); const el = ref.current; if (el) el.scrollLeft = i * el.clientWidth; }} />}
    </>
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
