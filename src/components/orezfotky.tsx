// ============================================================
// DEED · OrezFotky — výrez titulnej fotky: posun prstom/myšou, zoom,
// alebo „Celá fotka" (neoreže sa, okraje doplní rozmazaná kópia).
// Výstup = JPEG data-URL v pomere rámu (EXIF preč — ide cez canvas).
// ============================================================
import { useEffect, useRef, useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { OBRAZOK_CFG } from "@/lib/obrazok";

type Rezim = "vyrez" | "cela";

/** KARTA 33: výrez ako čísla (mierka + posun) — ukladá sa namiesto orezaného obrázka, mobil = PC */
export interface Vyrez { rezim: Rezim; zoom: number; x: number; y: number }

export function OrezFotky({ subor, src, pomer = 16 / 9, vystupSirka = 1600, zony, bezStitu, onHotovo, onZrusit, vyrez, onVyrez, sprava, pozadie }: {
  subor?: File; pomer?: number; vystupSirka?: number; zony?: boolean; /** KARTA 56D §4: farnosť — bez miesta pre štít */ bezStitu?: boolean;
  onHotovo?: (dataUrl: string) => void; onZrusit: () => void;
  /** KARTA 33: obrázok už spracovaný (data-URL) namiesto súboru */
  src?: string;
  /** KARTA 33: počiatočný výrez a návrat výrezu namiesto obrázka */
  vyrez?: Vyrez; onVyrez?: (v: Vyrez) => void;
  /** KARTA 33: vzhľad Správy stránky (zelené voľby, značky loga a štítu v px) */
  sprava?: boolean;
  /** farba prázdneho miesta pri „Celá fotka" (inak rozmazaná kópia) */
  pozadie?: string;
}) {
  const ramRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [fw, setFw] = useState(0);
  const [zoom, setZoom] = useState(vyrez?.zoom ?? 1);
  const [pos, setPos] = useState({ x: vyrez?.x ?? 0.5, y: vyrez?.y ?? 0.5 }); // stred výrezu (0–1) v rámci voľného posunu
  const [rezim, setRezim] = useState<Rezim>(vyrez?.rezim ?? "vyrez");
  // KARTA 33: zväčšenie prstami (2 prsty) — vzdialenosť prstov pri začiatku
  const prsty = useRef(new Map<number, { x: number; y: number }>());
  const stipnutie = useRef<{ d: number; z: number } | null>(null);
  const tah = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [taham, setTaham] = useState(false);

  useEffect(() => {
    if (!subor && !src) return;
    const u = subor ? URL.createObjectURL(subor) : src!;
    const i = new Image();
    i.onload = () => { setImg(i); setUrl(u); };
    i.src = u;
    return () => { if (subor) URL.revokeObjectURL(u); };
  }, [subor, src]);
  // koliesko myši = zväčšenie/zmenšenie (len vo výreze)
  useEffect(() => {
    const el = ramRef.current; if (!el) return;
    const kol = (e: WheelEvent) => { if (rezim !== "vyrez") return; e.preventDefault(); setZoom((z) => Math.min(3, Math.max(1, z * (e.deltaY < 0 ? 1.06 : 1 / 1.06)))); };
    el.addEventListener("wheel", kol, { passive: false }); return () => el.removeEventListener("wheel", kol);
  }, [rezim]);

  useEffect(() => {
    const el = ramRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFw(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fh = fw / pomer;
  const iw = img?.naturalWidth ?? 1, ih = img?.naturalHeight ?? 1;
  // geometria obrázka v ráme (px na obrazovke)
  const geo = (() => {
    if (rezim === "cela") {
      const s = Math.min(fw / iw, fh / ih);
      const w = iw * s, h = ih * s;
      return { w, h, x: (fw - w) / 2, y: (fh - h) / 2 };
    }
    const s = Math.max(fw / iw, fh / ih) * zoom;
    const w = iw * s, h = ih * s;
    return { w, h, x: -(w - fw) * pos.x, y: -(h - fh) * pos.y };
  })();

  const zaciatok = (e: React.PointerEvent) => {
    if (rezim !== "vyrez") return;
    prsty.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (prsty.current.size === 2) { const [a, b] = [...prsty.current.values()]; stipnutie.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; tah.current = null; return; }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    tah.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    setTaham(true);
  };
  const pohyb = (e: React.PointerEvent) => {
    if (prsty.current.has(e.pointerId)) prsty.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (stipnutie.current && prsty.current.size === 2) {
      const [a, b] = [...prsty.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(Math.min(3, Math.max(1, stipnutie.current.z * d / Math.max(1, stipnutie.current.d)))); return;
    }
    const t = tah.current;
    if (!t) return;
    const volnoX = geo.w - fw, volnoY = geo.h - fh;
    const nx = volnoX > 0 ? t.px - (e.clientX - t.x) / volnoX : 0.5;
    const ny = volnoY > 0 ? t.py - (e.clientY - t.y) / volnoY : 0.5;
    setPos({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
  };
  const koniec = (e?: React.PointerEvent) => { if (e) prsty.current.delete(e.pointerId); if (prsty.current.size < 2) stipnutie.current = null; tah.current = null; setTaham(false); };

  function pouzi() {
    if (onVyrez) { onVyrez({ rezim, zoom, x: pos.x, y: pos.y }); return; }
    if (!img || !fw || !onHotovo) return;
    const W = Math.min(vystupSirka, Math.round(iw)), H = Math.round(W / pomer);
    const k = W / fw;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    if (rezim === "cela") {
      // pozadie: tá istá fotka roztiahnutá a rozmazaná — bez čiernych pásov
      const s = Math.max(W / iw, H / ih);
      ctx.filter = "blur(28px) brightness(.85)";
      ctx.drawImage(img, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
      ctx.filter = "none";
    }
    ctx.drawImage(img, geo.x * k, geo.y * k, geo.w * k, geo.h * k);
    onHotovo(cv.toDataURL("image/jpeg", OBRAZOK_CFG.kvalita));
  }

  const btn = (aktivny: boolean): React.CSSProperties => sprava ? ({
    flex: 1, height: 44, borderRadius: 13, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800,
    border: `1.5px solid ${aktivny ? "var(--gBd)" : "transparent"}`, background: aktivny ? "var(--gSoft)" : "var(--btn)", color: aktivny ? "var(--gInk)" : "var(--ink2)",
  }) : ({
    flex: 1, height: 34, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
    border: `1px solid ${aktivny ? "var(--a-info)" : C.line}`, background: aktivny ? "var(--a-info)" : "transparent", color: aktivny ? "#fff" : C.textSec,
  });

  return (
    <div>
      {!sprava && <div style={{ display: "flex", gap: SPACE.xxs, marginBottom: SPACE.xs }}>
        <button type="button" style={btn(rezim === "vyrez")} onClick={() => setRezim("vyrez")}>Výrez (posuň fotku)</button>
        <button type="button" style={btn(rezim === "cela")} onClick={() => setRezim("cela")}>Celá fotka</button>
      </div>}
      <div ref={ramRef} onPointerDown={zaciatok} onPointerMove={pohyb} onPointerUp={koniec} onPointerCancel={koniec}
        style={{ position: "relative", width: "100%", aspectRatio: `${pomer}`, overflow: "hidden", borderRadius: sprava ? 14 : RADIUS.sm, background: pozadie ?? "#111",
          cursor: rezim === "vyrez" ? (taham ? "grabbing" : "grab") : "default", touchAction: "none", userSelect: "none" }}>
        {url && rezim === "cela" && !pozadie && (
          <img src={url} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px) brightness(.85)", transform: "scale(1.1)" }} />
        )}
        {url && (
          <img src={url} alt="" draggable={false}
            style={{ position: "absolute", left: geo.x, top: geo.y, width: geo.w, height: geo.h, maxWidth: "none", pointerEvents: "none" }} />
        )}
        {zony && sprava && (
          <>
            <span aria-hidden="true" style={{ position: "absolute", left: 14, bottom: 12, width: 56, height: 56, borderRadius: 14, border: "1.5px dashed rgba(255,255,255,.8)", pointerEvents: "none" }} />
            {!bezStitu && <span aria-hidden="true" style={{ position: "absolute", right: 14, bottom: 12, width: 44, height: 52, borderRadius: 10, border: "1.5px dashed rgba(255,255,255,.8)", pointerEvents: "none" }} />}
          </>
        )}
        {zony && !sprava && (
          <>
            <span style={{ position: "absolute", left: "3%", bottom: "-12%", width: "22%", aspectRatio: "1", borderRadius: "50%", border: "2px dashed rgba(255,255,255,.9)", background: "rgba(0,0,0,.25)", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10.5, fontWeight: 800 }}>LOGO</span>
            <span style={{ position: "absolute", right: "3%", bottom: "-8%", width: "18%", aspectRatio: "0.85", borderRadius: 10, border: "2px dashed rgba(255,255,255,.9)", background: "rgba(0,0,0,.25)", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10.5, fontWeight: 800 }}>ŠTÍT</span>
          </>
        )}
      </div>
      {rezim === "vyrez" && (
        <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.xs, fontSize: sprava ? 13.5 : 12, fontWeight: sprava ? 700 : undefined, color: sprava ? "var(--ink2)" : C.textSec }}>
          Priblíženie
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1 }} />
        </label>
      )}
      <div style={{ fontSize: sprava ? 12.5 : 10.5, fontWeight: sprava ? 600 : undefined, color: sprava ? "var(--ink3)" : C.textTer, marginTop: 4 }}>
        {sprava
          ? (rezim === "vyrez" ? "Posuňte fotku myšou alebo prstom. Zväčšenie kolieskom alebo dvoma prstami." : "Fotka sa zmestí celá, prázdne miesto doplní jej priemerná farba.")
          : rezim === "vyrez" ? "Potiahni fotku prstom alebo myšou, kým nesedí výrez." : "Fotka sa neoreže — okraje doplní rozmazané pozadie."}
      </div>
      <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.sm }}>
        <button type="button" onClick={onZrusit} style={sprava ? btn(false) : { ...btn(false), height: 40 }}>Zrušiť</button>
        <button type="button" onClick={pouzi} disabled={!img}
          style={sprava ? { ...btn(true), flex: 2, background: "var(--green)", borderColor: "var(--green)", color: "#fff" } : { ...btn(true), height: 40, flex: 2, background: "var(--a-green)", borderColor: "var(--a-green)" }}>Použiť výrez</button>
      </div>
    </div>
  );
}
