import { useState, useEffect, useRef, createContext, useContext } from "react";
import { C, GRAD, GRAD_KUZEL, glass, glassTmavy, ZRNO } from "./theme";

/*
  ============================================================
  DEED Aura — zdieľané komponenty
  dýchajúce pozadie · aura prstene · glass povrchy · galéria
  ============================================================
*/

// ============================================================
// DÝCHAJÚCE POZADIE — tmavý subtle gradient, jemne dýcha + zrno
// ============================================================
export function DychajucePozadie({ silne }) {
  const k = silne ? 1.5 : 1;
  const blob = (style, anim) => (
    <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(70px)", willChange: "transform, opacity", ...style, animation: anim }} />
  );
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1, pointerEvents: "none" }}>
      {blob({ width: 360, height: 360, top: -130, left: -110, background: `radial-gradient(circle, rgba(62,123,250,${.20 * k}), transparent 70%)` }, "dych 9s ease-in-out infinite alternate")}
      {blob({ width: 320, height: 320, top: "36%", right: -140, background: `radial-gradient(circle, rgba(139,124,255,${.15 * k}), transparent 70%)` }, "dych 13s ease-in-out 2s infinite alternate-reverse")}
      {blob({ width: 300, height: 300, bottom: -110, left: "18%", background: `radial-gradient(circle, rgba(67,224,200,${.11 * k}), transparent 70%)` }, "dych 11s ease-in-out 1s infinite alternate")}
      {/* filmové zrno */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: ZRNO, backgroundSize: 240, opacity: .05, mixBlendMode: "overlay" }} />
    </div>
  );
}

// ============================================================
// AURA PRSTEŇ — podpis značky (rotujúci aurora kruh so žiarou)
// ============================================================
export function Aura({ size = 110, hrubka = 2, children }) {
  const prsten = { position: "absolute", inset: 0, borderRadius: "50%", background: GRAD_KUZEL, animation: "tocenie 7s linear infinite" };
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      {/* žiara */}
      <div style={{ ...prsten, filter: "blur(16px)", opacity: .7 }} />
      {/* samotný prsteň (maskou orezaný na obrys) */}
      <div style={{ ...prsten, padding: hrubka, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
      {/* obsah */}
      <div style={{ position: "absolute", inset: hrubka + 5, borderRadius: "50%", background: "#0A0F1C", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

// ---- FOTO s fallbackom na emoji ----
export function Foto({ src, emoji, h, w, radius = 0, style, onClick }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div onClick={onClick} style={{ width: w || "100%", height: h, background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: Math.min((typeof h === "number" ? h : 90) / 3, 30), color: "#4A5066", borderRadius: radius, flex: w ? "0 0 auto" : undefined, cursor: onClick ? "pointer" : undefined, ...style }}>
        {emoji}
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setErr(true)} onClick={onClick} draggable={false}
    style={{ width: w || "100%", height: h, objectFit: "cover", display: "block", borderRadius: radius, flex: w ? "0 0 auto" : undefined, cursor: onClick ? "pointer" : undefined, ...style }} />;
}

export function Avatar({ src, emoji, size, border, aura }) {
  if (!aura) {
    return <Foto src={src} emoji={emoji} h={size} w={size} radius="50%" style={{ border: border || `1px solid ${C.line}` }} />;
  }
  // aura okolo avataru — gold (karma) alebo aurora gradient
  const pozadie = aura === "gold"
    ? "conic-gradient(from 210deg, #F0C75A, #F09A5E, #F5DD9A, #F0C75A)"
    : GRAD;
  const ziara = aura === "gold" ? "0 0 16px rgba(240,199,90,.45)" : "0 0 16px rgba(120,140,255,.45)";
  return (
    <div style={{ width: size + 6, height: size + 6, borderRadius: "50%", padding: 3, background: pozadie, boxShadow: ziara, flex: "0 0 auto" }}>
      <Foto src={src} emoji={emoji} h={size} w={size} radius="50%" />
    </div>
  );
}

// ============================================================
// GALÉRIA — kontext: ktorýkoľvek modul otvorí fullscreen prezeranie
// ============================================================
export const GaleriaContext = createContext(() => {});
export const useGaleria = () => useContext(GaleriaContext);

// klikateľné foto v príspevku — otvorí galériu, ukáže počet fotiek
export function FotoPrispevku({ fotky, emoji, h, w, radius = 0, style, index = 0 }) {
  const otvor = useGaleria();
  const viac = fotky && fotky.length > 1;
  return (
    <div style={{ position: "relative", width: w || "100%", flex: w ? "0 0 auto" : undefined }}>
      <Foto src={fotky && fotky[index]} emoji={emoji} h={h} w={w} radius={radius} style={style}
        onClick={(e) => { e.stopPropagation(); if (fotky && fotky.length) otvor(fotky, index); }} />
      {viac && (
        <span style={{ position: "absolute", bottom: 7, right: 7, ...glassTmavy(10, .55), color: "#fff",
          fontSize: 10, fontWeight: 600, borderRadius: 12, padding: "3px 9px", pointerEvents: "none" }}>
          ⧉ {fotky.length}
        </span>
      )}
    </div>
  );
}

// ---- VIDEO príspevku — poster + ▶, po kliknutí hrá inline s ovládaním ----
export function Video({ src, poster, h = 200, radius = 0, style, badge = true }) {
  const ref = useRef(null);
  const [start, setStart] = useState(false);

  const spusti = (e) => {
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
export function MiniFotky({ fotky }) {
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
export function Lightbox({ fotky, index = 0, onClose }) {
  const [i, setI] = useState(index);
  const [dx, setDx] = useState(0);
  const drag = useRef(null);
  const boloPotiahnute = useRef(false); // click po drag-u nesmie zavrieť galériu

  useEffect(() => {
    const klavesy = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, fotky.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", klavesy);
    return () => window.removeEventListener("keydown", klavesy);
  }, [fotky.length, onClose]);

  const zaciatok = (x) => { drag.current = { x, t: Date.now(), presun: false }; };
  const pohyb = (x) => {
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
      style={{ position: "fixed", inset: 0, background: "rgba(4,6,12,.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        zIndex: 1000, display: "flex", flexDirection: "column", userSelect: "none", touchAction: "none", animation: "fadeUp .18s ease" }}
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
        <span style={{ ...glass(12, .07), fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.85)", borderRadius: 20, padding: "5px 13px" }}>{i + 1} / {fotky.length}</span>
        <span onClick={onClose} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
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
          <span onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={() => setI(i - 1)}
            style={sipka("left")}>‹</span>
        )}
        {i < fotky.length - 1 && (
          <span onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={() => setI(i + 1)}
            style={sipka("right")}>›</span>
        )}
      </div>

      {/* bodky */}
      <div style={{ display: "flex", justifyContent: "center", gap: 7, padding: "16px 0 20px" }}>
        {fotky.map((_, k) => (
          <span key={k} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={() => setI(k)}
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

function sipka(strana) {
  return {
    position: "absolute", top: "50%", [strana]: 14, transform: "translateY(-50%)",
    width: 42, height: 42, borderRadius: "50%",
    background: "rgba(255,255,255,.07)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,.16)", color: "#fff", fontSize: 26,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1, paddingBottom: 3,
  };
}

// ============================================================
// SPOLOČNÉ UI KOMPONENTY (hlavička, výbery, modaly, toasty)
// ============================================================
export function Hlavicka({ title, onBack, step, total }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 5, ...glassTmavy(18, .6), borderLeft: "none", borderRight: "none", borderTop: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px" }}>
        <span onClick={onBack} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.06)", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: C.textSec, cursor: "pointer" }}>←</span>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        {step && <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: C.textTer }}>Krok {step}/{total}</span>}
      </div>
      {step && <div style={{ height: 3, background: "rgba(255,255,255,.06)" }}><div style={{ height: 3, background: GRAD, width: `${step / total * 100}%`, transition: "width .35s ease", borderRadius: 2 }} /></div>}
    </div>
  );
}

export function Otazka({ children }) { return <div style={{ fontSize: 15, fontWeight: 700, margin: "6px 0 12px" }}>{children}</div>; }

// ---- MOTÍV (svetlý / tmavý režim) ----
export const MotivContext = createContext({ svetly: false, prepni: () => {} });
export const useMotiv = () => useContext(MotivContext);

// ---- JEDNOTNÁ HLAVIČKA MODULU: ☰ + logo D⁺ + názov stránky (+ pravý obsah + prepínač režimu) ----
export function ModulHlavicka({ title, onMenu, right }) {
  const { svetly, prepni } = useMotiv();
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 6, display: "flex", alignItems: "center", gap: 11, padding: "13px 16px", ...glassTmavy(18, .6), borderLeft: "none", borderRight: "none", borderTop: "none" }}>
      <span onClick={onMenu} style={{ fontSize: 23, color: C.textSec, cursor: onMenu ? "pointer" : "default", lineHeight: 1, flex: "0 0 auto" }}>☰</span>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 4px 14px rgba(99,134,255,.4)", flex: "0 0 auto" }}>
        D<span style={{ position: "absolute", top: 3, right: 4, fontSize: 9 }}>+</span>
      </span>
      <span style={{ fontSize: 20, fontWeight: 800 }}>{title}</span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 13 }}>
        {right}
        <span onClick={prepni} title="Svetlý / tmavý režim" style={{ cursor: "pointer", fontSize: 16, width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line}`, background: C.surface, flex: "0 0 auto" }}>{svetly ? "🌙" : "☀️"}</span>
      </span>
    </div>
  );
}

export function vyberBox(active) {
  return {
    border: `1px solid ${active ? "rgba(116,166,255,.55)" : C.line}`,
    background: active ? "rgba(91,155,255,.09)" : "rgba(255,255,255,.04)",
    boxShadow: active ? "0 0 18px rgba(91,155,255,.14)" : "none",
    borderRadius: 15, padding: "13px 14px", marginBottom: 10, cursor: "pointer",
    transition: "border-color .2s ease, background .2s ease, box-shadow .2s ease",
  };
}

export function Vyber({ emoji, title, desc, active, onClick }) {
  return (
    <div onClick={onClick} style={vyberBox(active)}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{emoji} {title}</div>
      {desc && <div style={{ fontSize: 12, color: C.textSec, marginTop: 3, lineHeight: 1.4 }}>{desc}</div>}
    </div>
  );
}

export function NavBtns({ onBack, onNext, canNext }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
      <button onClick={onBack} style={btnLokal("ghost")}>Späť</button>
      <button onClick={onNext} disabled={!canNext} style={btnLokal(canNext ? "primary" : "disabled")}>Pokračovať</button>
    </div>
  );
}

function btnLokal(kind) {
  const base = { flex: 1, padding: "13px 0", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "inherit" };
  if (kind === "primary") return { ...base, background: GRAD, color: "#fff", boxShadow: "0 8px 26px rgba(99,134,255,.32), inset 0 1px 0 rgba(255,255,255,.25)" };
  if (kind === "ghost") return { ...base, background: "rgba(255,255,255,.04)", color: C.textSec, border: `1px solid ${C.line}` };
  if (kind === "disabled") return { ...base, background: "rgba(255,255,255,.05)", color: C.textTer, cursor: "not-allowed" };
  return base;
}

export function Suhrn({ rows }) {
  return (
    <div style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${C.line}`, borderRadius: 15, padding: 14 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: i < rows.length - 1 ? `1px solid ${C.line2}` : "none" }}>
          <span style={{ color: C.textTer }}>{r[0]}</span><span style={{ textAlign: "right", maxWidth: "65%", fontWeight: 600 }}>{r[1]}</span>
        </div>
      ))}
    </div>
  );
}

export function DokladRow({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.035)", border: `1px solid ${C.line}`, borderRadius: 13, padding: "12px 13px", fontSize: 13 }}>
      <span>{text}</span><span style={{ fontSize: 12, fontWeight: 700, color: C.blueL, cursor: "pointer" }}>＋ doložiť</span>
    </div>
  );
}

export function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.5)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 55, animation: "fadeUp .2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", ...glassTmavy(26, .8), borderBottom: "none", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: "10px 20px 22px", boxShadow: "0 -18px 60px rgba(0,0,0,.45)" }}>
        <div style={{ width: 42, height: 4, borderRadius: 3, background: "rgba(255,255,255,.18)", margin: "4px auto 16px" }} />
        {children}
      </div>
    </div>
  );
}

export function Toast({ text }) {
  return (
    <div style={{ position: "absolute", bottom: 92, left: "50%", transform: "translateX(-50%)", ...glassTmavy(18, .72),
      border: "1px solid rgba(92,230,184,.3)", color: "#C9F2E2", padding: "11px 18px", borderRadius: 30, fontSize: 12.5, fontWeight: 600,
      zIndex: 60, width: "max-content", maxWidth: "88%", textAlign: "center", animation: "fadeUp .3s ease",
      boxShadow: "0 10px 34px rgba(0,0,0,.45), 0 0 24px rgba(67,224,200,.12)" }}>
      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: GRAD_ZELENY_LOKAL, marginRight: 8, verticalAlign: "middle" }} />
      {text}
    </div>
  );
}
const GRAD_ZELENY_LOKAL = "linear-gradient(90deg, #1FBF8F, #5CE6B8)";
