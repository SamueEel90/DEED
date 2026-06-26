import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { C, GRAD, glass, glassTmavy } from "@/theme";
import { useGaleria } from "@/components/context";
import { pressable } from "@/components/pressable";

// ---- FOTO s fallbackom na emoji ----
export function Foto({ src, emoji, h, w, radius = 0, style, onClick }: { src?: string; emoji?: any; h?: number | string; w?: number | string; radius?: number | string; style?: CSSProperties; onClick?: (e: React.MouseEvent) => void }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div onClick={onClick} style={{ width: w || "100%", height: h, background: "rgba(var(--glass-rgb),.05)", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: Math.min((typeof h === "number" ? h : 90) / 3, 30), color: C.textTer, borderRadius: radius, flex: w ? "0 0 auto" : undefined, cursor: onClick ? "pointer" : undefined, ...style }}>
        {emoji}
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setErr(true)} onClick={onClick} draggable={false} loading="lazy" decoding="async"
    style={{ width: w || "100%", height: h, objectFit: "cover", display: "block", borderRadius: radius, flex: w ? "0 0 auto" : undefined, cursor: onClick ? "pointer" : undefined, ...style }} />;
}

export function Avatar({ src, emoji, size, border, aura }: { src?: string; emoji?: any; size?: number; border?: string; aura?: string }) {
  if (!aura) {
    return <Foto src={src} emoji={emoji} h={size} w={size} radius="50%" style={{ border: border || `1px solid ${C.line}` }} />;
  }
  // aura okolo avataru — gold (karma) alebo aurora gradient
  const pozadie = aura === "gold"
    ? "conic-gradient(from 210deg, #F0C75A, #F09A5E, #F5DD9A, #F0C75A)"
    : GRAD;
  const ziara = aura === "gold" ? "0 0 16px rgba(240,199,90,.45)" : "0 0 16px rgba(120,140,255,.45)";
  return (
    <div style={{ width: (size || 0) + 6, height: (size || 0) + 6, borderRadius: "50%", padding: 3, background: pozadie, boxShadow: ziara, flex: "0 0 auto" }}>
      <Foto src={src} emoji={emoji} h={size} w={size} radius="50%" />
    </div>
  );
}

// klikateľné foto v príspevku — otvorí galériu, ukáže počet fotiek
// disableGaleria=true → klik na foto neotvára galériu, ale prebublá na kartu (otvorí detail skutku/žiadosti)
export function FotoPrispevku({ fotky, emoji, h, w, radius = 0, style, index = 0, disableGaleria }: { fotky?: string[]; emoji?: any; h?: number | string; w?: number | string; radius?: number | string; style?: CSSProperties; index?: number; disableGaleria?: boolean }) {
  const otvor = useGaleria();
  const viac = fotky && fotky.length > 1;
  return (
    <div style={{ position: "relative", width: w || "100%", flex: w ? "0 0 auto" : undefined }}>
      <Foto src={fotky && fotky[index]} emoji={emoji} h={h} w={w} radius={radius} style={style}
        onClick={disableGaleria ? undefined : (e) => { e.stopPropagation(); if (fotky && fotky.length) otvor(fotky, index); }} />
      {viac && (
        <span style={{ position: "absolute", bottom: 7, right: 7, ...glassTmavy(10, .55), color: "#fff",
          fontSize: 10, fontWeight: 600, borderRadius: 12, padding: "3px 9px", pointerEvents: "none" }}>
          ⧉ {fotky!.length}
        </span>
      )}
    </div>
  );
}

// ---- VIDEO príspevku — poster + ▶, po kliknutí hrá inline s ovládaním ----
export function Video({ src, poster, h = 200, radius = 0, style, badge = true }: { src?: string; poster?: string; h?: number | string; radius?: number | string; style?: CSSProperties; badge?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [start, setStart] = useState(false);

  const spusti = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = ref.current;
    if (v) v.play();
  };

  return (
    <div style={{ position: "relative", width: "100%", height: h, background: "#05070d", borderRadius: radius, overflow: "hidden", ...style }}>
      <video
        ref={ref} src={src} poster={poster} preload="metadata" playsInline controls={start}
        onClick={(e) => e.stopPropagation()}
        onPlay={() => setStart(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#05070d" }}
      />
      {!start && (
        <div onClick={spusti} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "linear-gradient(0deg, rgba(0,0,0,.42), rgba(0,0,0,.05) 55%)" }}>
          <span style={{ width: 62, height: 62, borderRadius: "50%", background: "rgba(255,255,255,.16)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#fff", paddingLeft: 5, boxShadow: "0 10px 34px rgba(0,0,0,.45)" }}>▶</span>
        </div>
      )}
      {badge && !start && (
        <span style={{ position: "absolute", top: 10, right: 10, ...glassTmavy(10, .55), color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 7, padding: "4px 9px", pointerEvents: "none" }}>▶ video</span>
      )}
    </div>
  );
}

// pásik miniatúr pod hlavnou fotkou (detail príspevku)
export function MiniFotky({ fotky }: { fotky?: string[] }) {
  const otvor = useGaleria();
  if (!fotky || fotky.length < 2) return null;
  return (
    <div style={{ display: "flex", gap: 6, padding: "9px 14px 0", overflowX: "auto" }}>
      {fotky.map((f, i) => (
        <Foto key={i} src={f} emoji="🖼" h={46} w={62} radius={10}
          onClick={() => otvor(fotky, i)} style={{ border: `1px solid ${C.line}` }} />
      ))}
    </div>
  );
}

// ---- LIGHTBOX — celá obrazovka + swipe (dotyk, myš, šípky, klávesnica) ----
export function Lightbox({ fotky, index = 0, onClose }: { fotky: string[]; index?: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; t: number; presun: boolean } | null>(null);
  const boloPotiahnute = useRef(false); // click po drag-u nesmie zavrieť galériu
  const rootRef = useRef<HTMLDivElement>(null);

  // a11y: focus skočí do galérie a po zatvorení sa vráti na pôvodný prvok
  useEffect(() => {
    const predtym = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => predtym?.focus?.();
  }, []);

  useEffect(() => {
    const klavesy = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, fotky.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", klavesy);
    return () => window.removeEventListener("keydown", klavesy);
  }, [fotky.length, onClose]);

  const zaciatok = (x: number) => { drag.current = { x, t: Date.now(), presun: false }; };
  const pohyb = (x: number) => {
    if (!drag.current) return;
    const d = x - drag.current.x;
    if (Math.abs(d) > 4) drag.current.presun = true;
    setDx(d);
  };
  const koniec = () => {
    if (!drag.current) return;
    boloPotiahnute.current = drag.current.presun;
    const svihnutie = Date.now() - drag.current.t < 260 && Math.abs(dx) > 28;
    const prah = 60;
    if ((dx < -prah || (svihnutie && dx < 0)) && i < fotky.length - 1) setI(i + 1);
    else if ((dx > prah || (svihnutie && dx > 0)) && i > 0) setI(i - 1);
    drag.current = null;
    setDx(0);
  };

  return (
    <div
      ref={rootRef} role="dialog" aria-modal="true" aria-label="Galéria fotiek" tabIndex={-1}
      style={{ position: "fixed", inset: 0, background: "rgba(4,6,12,.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        zIndex: 1000, display: "flex", flexDirection: "column", userSelect: "none", touchAction: "none", outline: "none", animation: "fadeUp .18s ease" }}
      onMouseDown={(e) => zaciatok(e.clientX)}
      onMouseMove={(e) => drag.current && pohyb(e.clientX)}
      onMouseUp={koniec}
      onMouseLeave={() => drag.current && koniec()}
      onTouchStart={(e) => zaciatok(e.touches[0].clientX)}
      onTouchMove={(e) => pohyb(e.touches[0].clientX)}
      onTouchEnd={koniec}
    >
      {/* horná lišta */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 18px" }}>
        <span role="status" aria-live="polite" style={{ ...glass(12, .07), fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.85)", borderRadius: 20, padding: "5px 13px" }}>{i + 1} / {fotky.length}</span>
        <span {...pressable(onClose, "Zavrieť galériu")} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
          style={{ ...glass(12, .07), marginLeft: "auto", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", color: "rgba(255,255,255,.9)" }}>✕</span>
      </div>

      {/* pás fotiek */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div style={{
          display: "flex", height: "100%",
          transform: `translateX(calc(${-i * 100}% + ${dx}px))`,
          transition: dx !== 0 ? "none" : "transform .3s cubic-bezier(.22,.9,.3,1)",
        }}>
          {fotky.map((f, k) => (
            <div key={k}
              onClick={(e) => { if (!boloPotiahnute.current && e.target === e.currentTarget) onClose(); }}
              style={{ flex: "0 0 100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10px" }}>
              <Foto src={f} emoji="🖼" h="auto"
                style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", objectFit: "contain", pointerEvents: "none", borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,.55)" }} />
            </div>
          ))}
        </div>

        {/* šípky pre desktop */}
        {i > 0 && (
          <span {...pressable(() => setI(i - 1), "Predchádzajúca fotka")} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            style={sipka("left")}>‹</span>
        )}
        {i < fotky.length - 1 && (
          <span {...pressable(() => setI(i + 1), "Ďalšia fotka")} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            style={sipka("right")}>›</span>
        )}
      </div>

      {/* bodky */}
      <div style={{ display: "flex", justifyContent: "center", gap: 7, padding: "16px 0 20px" }}>
        {fotky.map((_, k) => (
          <span key={k} {...pressable(() => setI(k), `Fotka ${k + 1}`)} aria-current={k === i ? "true" : undefined} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
            style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 4, cursor: "pointer", transition: "all .25s ease",
              background: k === i ? GRAD : "rgba(255,255,255,.25)" }} />
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,.35)", paddingBottom: 14, marginTop: -8 }}>
        ← swipni alebo potiahni myšou →
      </div>
    </div>
  );
}

function sipka(strana: "left" | "right"): CSSProperties {
  return {
    position: "absolute", top: "50%", [strana]: 14, transform: "translateY(-50%)",
    width: 42, height: 42, borderRadius: "50%",
    background: "rgba(255,255,255,.07)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,.16)", color: "#fff", fontSize: 26,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1, paddingBottom: 3,
  } as CSSProperties;
}
