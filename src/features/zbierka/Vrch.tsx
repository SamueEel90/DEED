// KARTA 02 · Hlavička, galéria, nadpis a text zbierky.
// Galéria = natívny scroll-snap (žiadna knižnica). Animácie len transform/opacity.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLayout } from "@/components/context";
import { useVideoUrl } from "@/lib/videoUloz";
import { FormatovanyText } from "@/components/formattext";
import { SpatTlacidlo, ZavrietTlacidlo } from "@/components/cesta";
import { CisloObjektu } from "@/components/CisloObjektu";
import { usePersonalizacia } from "@/lib/personalizacia";
import type { Oblubeny } from "@/types";
import { CelaGaleria } from "@/components/celaGaleria";

/** 5. 10. · popis = nepovinný popis fotky (najviac 80 znakov): darca ho vidí pod fotkou na celej obrazovke, čítačka ako alt */
export type Medium = ({ typ: "video"; src: string } | { typ: "foto"; src: string }) & { popis?: string };

const TMAVA = "rgba(20,18,14,.7)";

// ---------------- 1 · Hlavička ----------------
export function Hlavicka({ cisloZbierky, zverejnene, nazovCisla = "číslo zbierky", onBack, onZavriet, onMoznosti }: {
  /** KARTA 48 · OPRAVY 428: verejné číslo „Z-123 456 789 0" (= VS) v strede hlavičky, ťuk = skopírovať číslice */
  cisloZbierky?: string; /** OPRAVY 428: ISO čas zverejnenia pod číslom */ zverejnene?: string; nazovCisla?: string; /** OPRAVY 426: už sa nezobrazuje */ overena?: boolean; onBack: () => void;
  spatNazov?: string;        // kam vedie Späť — zatiaľ sa nezobrazuje (jednotné „‹ Späť")
  onZavriet?: () => void;    // krížik: zavrie celú cestu → feed na mieste, kde bola zbierka
  onMoznosti?: () => void;   // ⋯ menu zbierky (Nahlásiť — OPRAVY 51)
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "6px 0 14px", boxSizing: "border-box" }}>
      <SpatTlacidlo onClick={onBack} />
      {/* OPRAVY 428: číslo a dátum zverejnenia v strede medzi ‹ Späť a ··· × (komunikácia s podporou) · OPRAVY 426: „Overená“ preč */}
      <span style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>{cisloZbierky != null && <CisloObjektu cislo={cisloZbierky} zverejnene={zverejnene} hlavicka nazov={nazovCisla} />}</span>
      {/* OPRAVY 428: ··· okrúhle ako × */}
      <button type="button" aria-label="Ďalšie možnosti" onClick={onMoznosti} style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", border: "none", background: "rgba(var(--glass-rgb), .12)", fontSize: 16, fontWeight: 800, color: "var(--c-text)", letterSpacing: 1, cursor: "pointer", padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" }}>···</button>
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
export function Galeria({ media, vyska: vyskaP, radius: radiusP, okraj, prekrytie, bezBodiek, nahlady }: {
  media: Medium[];
  /** 5. 10. · galéria aj v náhľade „Posielaš do …" (iná výška, rám, bez okraja) */
  vyska?: number; radius?: number | string; okraj?: string;
  /** štítky nad fotkou (napr. „Posielaš do · …"), neklikateľné */
  prekrytie?: ReactNode;
  bezBodiek?: boolean;
  /** OPRAVY 317: pod galériou rad malých náhľadov ďalších fotiek (max 5, potom +N), ťuk = prehliadač na tej fotke */
  nahlady?: boolean;
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
      {nahlady && viac && <div style={{ display: "flex", gap: desktop ? 8 : 6, margin: wide ? "-6px 0 16px" : "-4px 0 14px" }}>
        {media.slice(1, 6).map((m, j) => <button key={j} type="button" onClick={() => { setIndex(j + 1); setCela(true); }} aria-label={`Fotka ${j + 2} z ${media.length}${m.popis ? `: ${m.popis}` : ""}`} style={{ position: "relative", ...(desktop ? { width: 72, height: 72, flex: "none" } : { flex: "1 1 0", minWidth: 0, maxWidth: 56, aspectRatio: "1" }), padding: 0, border: "none", borderRadius: 10, overflow: "hidden", background: "#2A2620", cursor: "zoom-in", boxShadow: "none" }}>
          {m.typ === "foto" ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: `url(${m.src}) center/cover no-repeat` }} /> : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><PlayKruh size={28} /></span>}
        </button>)}
        {media.length > 6 && <button type="button" onClick={() => { setIndex(6); setCela(true); }} aria-label={`Ďalšie fotky, ${media.length - 6}`} style={{ ...(desktop ? { width: 72, height: 72, flex: "none" } : { flex: "1 1 0", minWidth: 0, maxWidth: 56, aspectRatio: "1" }), padding: 0, border: "1.5px solid var(--cardBd)", borderRadius: 10, background: "var(--btn)", color: "var(--ink)", fontFamily: "inherit", fontSize: 17, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>+{media.length - 6}</button>}
      </div>}
      {cela && <CelaGaleria media={media} start={index} onClose={(i) => { setCela(false); setIndex(i); const el = ref.current; if (el) el.scrollLeft = i * el.clientWidth; }} />}
    </>
  );
}

// ---------------- 3 + 4 · Nadpis a text ----------------
const RIADKY = 5, RIADOK = 21; // 14 px × 1,5 · OPRAVY 435: dlhý text na 5 riadkov

/** OPRAVY 429: ☆ Sledovať ↔ Sledujete ✓ — ten istý stav ako hviezdička na karte a Domov → Obľúbené (tabuľka oblubene) */
export function SledovatTlacidlo({ polozka }: { polozka: Oblubeny }) {
  const { jeOblubene, toggleOblubene } = usePersonalizacia();
  const on = jeOblubene(polozka.refId);
  return (
    <button type="button" onClick={() => toggleOblubene(polozka)} aria-pressed={on}
      style={{ flex: "none", height: 44, padding: "0 18px", borderRadius: 22, border: "1.5px solid var(--cardBd)", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14.5, fontWeight: 800, whiteSpace: "nowrap", color: on ? "var(--green)" : "var(--ink)" }}>
      {on ? "Sledujete ✓" : <><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>Sledovať</>}
    </button>);
}

/** OPRAVY 429: nadpis detailu so Sledovať (PC a tablet vpravo na riadku nadpisu, mobil pod nadpisom vľavo) */
export function TitulSoSledovat({ titul, polozka, wide, style }: { titul: ReactNode; polozka: Oblubeny; wide: boolean; style?: CSSProperties }) {
  return wide
    ? <div style={{ display: "flex", alignItems: "flex-start", gap: 16, ...style }}><div style={{ flex: 1, minWidth: 0 }}>{titul}</div><SledovatTlacidlo polozka={polozka} /></div>
    : <div style={style}>{titul}<div style={{ marginTop: 8 }}><SledovatTlacidlo polozka={polozka} /></div></div>;
}

export function NadpisText({ nazov, text, otvoreny: otvorenyZvonka, onOtvoreny, sledovat }: { nazov: string; text?: string; otvoreny?: boolean; onOtvoreny?: (v: boolean) => void;
  /** OPRAVY 429: Sledovať vedľa nadpisu (PC/tablet vpravo hore, mobil pod nadpisom vľavo) */ sledovat?: Oblubeny }) {
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
      {sledovat && wide
        ? <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}><div style={{ ...nadpis, flex: 1, minWidth: 0 }}>{nazov}</div><SledovatTlacidlo polozka={sledovat} /></div>
        : <div style={nadpis}>{nazov}</div>}
      {sledovat && !wide && <div style={{ marginTop: 8 }}><SledovatTlacidlo polozka={sledovat} /></div>}
      {maText && (
        <div style={{ margin: "6px 0 16px" }}>
          <div style={{ position: "relative", maxHeight: otvoreny ? "none" : RIADKY * RIADOK, overflow: "hidden" }}>
            {/* ten istý render formátovaného textu ako v celej appke (tučné, nadpisy, zoznamy, veľkosti, odkazy) */}
            <div ref={vnutro}>
              <FormatovanyText text={text} style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", textWrap: "pretty" } as CSSProperties} />
            </div>
            {dlhy && !otvoreny && (
              <button type="button" onClick={() => setOtvoreny(true)}
                style={{ ...odkaz, position: "absolute", right: 0, bottom: 0, height: RIADOK, lineHeight: `${RIADOK}px`, padding: "0 0 0 44px", background: "linear-gradient(90deg, rgba(0,0,0,0), var(--bg) 40px)" }}>Čítať ďalej ›</button>
            )}
          </div>
          {dlhy && otvoreny && (
            <div style={{ display: "flex" }}>
              <button type="button" onClick={zbal} style={{ ...odkaz, background: "transparent", padding: "2px 0", minHeight: 44 }}>Zbaliť ^</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
