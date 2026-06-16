import { useState, useEffect, useRef, createContext, useContext } from "react";
import { C, GRAD, GRAD_KUZEL, GRAD_ZELENY, glass, glassTmavy, ZRNO } from "./theme";

// hex → priesvitné rgba (akcentové tinty fungujúce v tmavom aj svetlom režime)
const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

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
      <div onClick={onClick} style={{ width: w || "100%", height: h, background: "rgba(var(--glass-rgb),.05)", display: "flex", alignItems: "center",
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
// disableGaleria=true → klik na foto neotvára galériu, ale prebublá na kartu (otvorí detail skutku/žiadosti)
export function FotoPrispevku({ fotky, emoji, h, w, radius = 0, style, index = 0, disableGaleria }) {
  const otvor = useGaleria();
  const viac = fotky && fotky.length > 1;
  return (
    <div style={{ position: "relative", width: w || "100%", flex: w ? "0 0 auto" : undefined }}>
      <Foto src={fotky && fotky[index]} emoji={emoji} h={h} w={w} radius={radius} style={style}
        onClick={disableGaleria ? undefined : (e) => { e.stopPropagation(); if (fotky && fotky.length) otvor(fotky, index); }} />
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
export function Hlavicka({ title, onBack, step, total, right, titleColor }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 5, ...glassTmavy(18, .6), borderLeft: "none", borderRight: "none", borderTop: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px" }}>
        <span onClick={onBack} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}>←</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: titleColor }}>{title}</span>
        {right ? <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>{right}</span>
          : step ? <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: C.textTer }}>Krok {step}/{total}</span> : null}
      </div>
      {step && <div style={{ height: 3, background: "rgba(var(--glass-rgb),.06)" }}><div style={{ height: 3, background: GRAD, width: `${step / total * 100}%`, transition: "width .35s ease", borderRadius: 2 }} /></div>}
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
  if (kind === "ghost") return { ...base, background: "rgba(var(--glass-rgb),.05)", color: C.textSec, border: `1px solid ${C.line}` };
  if (kind === "disabled") return { ...base, background: "rgba(var(--glass-rgb),.06)", color: C.textTer, cursor: "not-allowed" };
  return base;
}

export function Suhrn({ rows }) {
  return (
    <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: 15, padding: 14 }}>
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: 13, padding: "12px 13px", fontSize: 13 }}>
      <span>{text}</span><span style={{ fontSize: 12, fontWeight: 700, color: C.blueL, cursor: "pointer" }}>＋ doložiť</span>
    </div>
  );
}

export function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.5)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 55, animation: "fadeUp .2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", ...glassTmavy(26, .8), borderBottom: "none", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: "10px 20px 22px", boxShadow: "0 -18px 60px rgba(0,0,0,.45)" }}>
        <div style={{ width: 42, height: 4, borderRadius: 3, background: "rgba(var(--glass-rgb),.22)", margin: "4px auto 16px" }} />
        {children}
      </div>
    </div>
  );
}

export function Toast({ text }) {
  // snackbar — vždy tmavý (aj vo svetlom režime), aby bol mätový text vždy čitateľný
  return (
    <div style={{ position: "absolute", bottom: 92, left: "50%", transform: "translateX(-50%)",
      background: "rgba(12,20,16,.93)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
      border: "1px solid rgba(92,230,184,.35)", color: "#C9F2E2", padding: "11px 18px", borderRadius: 30, fontSize: 12.5, fontWeight: 600,
      zIndex: 60, width: "max-content", maxWidth: "88%", textAlign: "center", animation: "fadeUp .3s ease",
      boxShadow: "0 10px 34px rgba(0,0,0,.45), 0 0 24px rgba(67,224,200,.12)" }}>
      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: GRAD_ZELENY_LOKAL, marginRight: 8, verticalAlign: "middle" }} />
      {text}
    </div>
  );
}
const GRAD_ZELENY_LOKAL = "linear-gradient(90deg, #1FBF8F, #5CE6B8)";

// ---- OSLAVA — jednotný „celebration“ overlay (aura prsteň = podpis značky) ----
// rovnaký naprieč modulmi: emoji v aura prstenci + titulok + text
export function Oslava({ emoji = "🎉", title, text, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.75)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, zIndex: 200, animation: "fadeUp .2s ease", padding: 24 }}>
      <Aura size={134} hrubka={2}><span style={{ fontSize: 52 }}>{emoji}</span></Aura>
      <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, textAlign: "center" }}>{title}</div>
      {text && <div style={{ color: C.textSec, fontSize: 14, textAlign: "center", padding: "0 22px", lineHeight: 1.5, maxWidth: 340 }}>{text}</div>}
    </div>
  );
}

// ============================================================
// MODERNÉ IKONY — srdce (like) a šípka hore (upvote) — rovnaké všade
// ============================================================
export function Srdce({ size = 18, filled, color = "#F2706F" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 auto" }}
      fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? 0 : 2.1} strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
export function SipHore({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 auto" }}
      fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V6M6.5 11.5L12 6l5.5 5.5" />
    </svg>
  );
}

// ============================================================
// JEDNOTNÁ SEKCIA PODPORY (ZADARMO · DROBNÁ PODPORA · VLASTNÁ SUMA)
// rovnaký dizajn naprieč Domov / Help / Charita / Aktivity
// ============================================================
function PSLabel({ children }) {
  return <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "18px 0 9px" }}>{children}</div>;
}
const psPill = (active) => ({
  flex: 1, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
  fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit", transition: "all .15s ease",
  background: active ? "rgba(242,112,111,.10)" : C.surface2,
  border: `1px solid ${active ? "rgba(242,112,111,.5)" : C.line}`,
  color: active ? "#F2706F" : C.text,
});
const psFix = (emph) => ({
  flex: 1, minHeight: 62, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "transform .12s ease",
  background: emph ? "rgba(240,168,94,.10)" : C.surface2,
  border: `1px solid ${emph ? "rgba(240,168,94,.4)" : C.line}`, color: C.text,
});
const psKanal = {
  flex: 1, minHeight: 56, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit", background: C.surface2, border: `1px solid ${C.line}`, color: C.text,
};

export function PodporaSekcia({ likes = 0, liked, onLike, upvotes = 0, onUpvote, onPodpor, onSms, onKanal, accent = "#74A6FF", supLabel = "DROBNÁ PODPORA — klik a hneď odíde" }) {
  const fix = [
    { e: "★", v: "10", col: accent, a: 10 },
    { e: "◆", v: "50", col: accent, a: 50 },
    { e: "🔥", v: "100", col: "#F0A85E", a: 100, emph: true },
  ];
  return (
    <div>
      <PSLabel>ZADARMO</PSLabel>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onLike} style={psPill(liked)}>
          <Srdce size={19} filled={liked} color={liked ? "#F2706F" : C.textSec} />
          {(likes || 0) + (liked ? 1 : 0)}
        </button>
        <button onClick={onUpvote} style={{ ...psPill(false), color: C.text }}>
          <SipHore size={18} color={C.textSec} /> {upvotes}
        </button>
      </div>

      <PSLabel>{supLabel}</PSLabel>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        {fix.map((b) => (
          <button key={b.v} onClick={() => onPodpor(b.a)} style={psFix(b.emph)}>
            <span style={{ fontSize: 20, color: b.col, lineHeight: 1 }}>{b.e}</span>
            <span style={{ fontSize: 13, marginTop: 4 }}>{b.v} <span style={{ fontSize: 9, fontWeight: 700, color: C.textTer, letterSpacing: ".3px" }}>DEED</span></span>
          </button>
        ))}
        <div style={{ width: 1, alignSelf: "stretch", borderLeft: `1px dashed ${C.line}`, margin: "3px 3px" }} />
        <button onClick={onSms} style={{ ...psFix(false), flex: 0.85, background: "rgba(240,199,90,.08)", borderColor: "rgba(240,199,90,.35)" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>SMS</span>
          <span style={{ fontSize: 13, marginTop: 3, color: C.gold }}>€</span>
        </button>
      </div>

      <PSLabel>VLASTNÁ SUMA — vyber kanál</PSLabel>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onKanal("FIAT")} style={psKanal}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>€ FIAT</span>
          <span style={{ fontSize: 11, color: C.textTer, marginTop: 3 }}>euro · procesor</span>
        </button>
        <button onClick={() => onKanal("DEED")} style={psKanal}>
          <span style={{ fontWeight: 800, fontSize: 15, color: accent }}>DEED</span>
          <span style={{ fontSize: 11, color: C.textTer, marginTop: 3 }}>wallet → wallet</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// JEDNOTNÝ REBRÍČEK OCENENÍ — rovnaká veľkosť a dizajn naprieč modulmi
// ocenenia: [{ ic, col, label, name, onClick }] · ludia: [{ ini, name, col, onClick }]
// pred = voliteľný úvodný kachlík (napr. Adresár v Charite)
// ============================================================
export function Rebricky({ ocenenia = [], ludia = [], pred = null }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "0 16px 12px", overflowX: "auto", alignItems: "stretch" }}>
      {pred}
      {ocenenia.map((o, i) => (
        <div key={i} onClick={o.onClick} style={{ minWidth: 84, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13, padding: "8px 5px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: o.onClick ? "pointer" : "default", flex: "0 0 auto" }}>
          <div style={{ width: 30, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: tint(o.col, .16), color: o.col }}>{o.ic}</div>
          <div style={{ fontSize: 7.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>{o.label}</div>
          <div style={{ fontSize: 9.5, fontWeight: 700, textAlign: "center", maxWidth: 76, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</div>
        </div>
      ))}
      {ludia.length > 0 && <div style={{ width: 1, background: C.line, margin: "4px 2px", flex: "0 0 auto" }} />}
      {ludia.map((p, i) => (
        <div key={"p" + i} onClick={p.onClick} style={{ minWidth: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: "0 0 auto", cursor: p.onClick ? "pointer" : "default" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(var(--glass-rgb),.06)", border: `2px solid ${p.col || "#5BA8F0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.text }}>{p.ini}</div>
          <div style={{ fontSize: 9, color: C.textSec, maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// JEDNOTNÝ ŠTATISTICKÝ RIADOK — „Dnes X · Mesiac Y" + „Moja štvrť" s výberom okruhu
// rovnaký dizajn aj poloha (hneď pod rebríčkom) vo všetkých moduloch
// ============================================================
export function StatRiadok({ stat, miesto = "Trenčín", okruh = "2 km", onOkruh }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, rowGap: 4, padding: "2px 18px 12px", fontSize: 13, color: C.textTer }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3DD68C", flex: "none", animation: "pulse 1.6s infinite" }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stat}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 7, flex: "none" }}>
        <span style={{ whiteSpace: "nowrap" }}>◉ Moja štvrť · {miesto} · {okruh}</span>
        <a onClick={onOkruh} style={{ color: "#74A6FF", cursor: "pointer", fontWeight: 600 }}>okruh ▾</a>
      </span>
    </div>
  );
}

// ============================================================
// JEDNOTNÝ BAR ZBIERKY — „X € z Y €" + zelený progres (rovnaký všade)
// mini = kompaktný do kariet · inak väčší do detailov
// ============================================================
export function MoniBar({ vyzbierane = 0, ciel = 0, ludia, mini }) {
  const pct = ciel ? Math.min(100, Math.round((vyzbierane / ciel) * 100)) : 0;
  const h = mini ? 6 : 9;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: mini ? 12 : 13 }}>
        <span style={{ fontWeight: 600 }}>{vyzbierane.toLocaleString("sk")} € <span style={{ color: C.textTer, fontWeight: 400 }}>z {ciel.toLocaleString("sk")} €</span></span>
        <span style={{ color: C.textTer }}>{pct} %</span>
      </div>
      <div style={{ height: h, background: "rgba(var(--glass-rgb),.1)", borderRadius: 99, overflow: "hidden", marginTop: 6 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99, boxShadow: "0 0 10px rgba(43,212,155,.45)", transition: "width .6s ease" }} />
      </div>
      {ludia != null && <div style={{ fontSize: 11, color: C.textTer, marginTop: 5 }}>👥 {ludia} pomohlo</div>}
    </div>
  );
}

// ============================================================
// DVOJSTĹPCOVÝ FEED (tablet/PC) — skutky vľavo, žiadosti vpravo
// na úzkej obrazovke spadne do jedného stĺpca (jednoStlpec v pôvodnom poradí)
// ============================================================
export function FeedStlpce({ wide, skutky, ziadosti, jednoStlpec, labelSkutky = "Skutky", labelZiadosti = "Žiadosti", padding = "0 16px" }) {
  if (!wide) return <div style={{ padding }}>{jednoStlpec}</div>;
  const Hd = ({ children }) => <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "0 0 10px", paddingLeft: 2 }}>{children}</div>;
  const col = { display: "flex", flexDirection: "column", gap: 12, minWidth: 0 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start", padding }}>
      <div style={{ minWidth: 0 }}><Hd>{labelSkutky}</Hd><div style={col}>{skutky}</div></div>
      <div style={{ minWidth: 0 }}><Hd>{labelZiadosti}</Hd><div style={col}>{ziadosti}</div></div>
    </div>
  );
}
