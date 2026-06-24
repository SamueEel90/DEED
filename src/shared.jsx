import { useState, useEffect, useRef, createContext, useContext } from "react";
import { C, GRAD, GRAD_KUZEL, GRAD_ZELENY, glass, glassTmavy, ZRNO } from "./theme";
import { FEED_CFG } from "./lib/feed";

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

// ============================================================
// SCROLL — kontext: ktorýkoľvek modul vie odscrollovať appku hore
// (scroll-kontajner žije v App; pri prepnutí obrazovky → naň zavoláme scrollHore)
// ============================================================
export const ScrollContext = createContext(() => {});
export const useScrollHore = () => useContext(ScrollContext);

// ============================================================
// MENU „VIAC" — kontext: hamburger (☰) vľavo hore otvára sheet modulov
// (predtým bolo „Viac" tlačidlo v spodnom doku)
// ============================================================
export const ViacContext = createContext(() => {});
export const useViac = () => useContext(ViacContext);

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
        <span onClick={onBack} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}><IkonaSpat size={17} color={C.textSec} /></span>
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
// pod horným riadkom: SLOGAN (§14) + voliteľná kontextová karma (§5.3 — karma danej oblasti)
export function ModulHlavicka({ title, right, karma, slogan = "Miesto, kde nerozhodujú slová, ale skutky" }) {
  const { svetly, prepni } = useMotiv();
  const otvorViac = useViac();
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 6, ...glassTmavy(18, .6), borderLeft: "none", borderRight: "none", borderTop: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 16px 7px" }}>
        <span onClick={otvorViac} title="Menu modulov" style={{ display: "flex", alignItems: "center", color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}><IkonaMenu size={22} color={C.textSec} /></span>
        <span style={{ width: 32, height: 32, borderRadius: 10, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 4px 14px rgba(99,134,255,.4)", flex: "0 0 auto" }}>
          D<span style={{ position: "absolute", top: 3, right: 4, fontSize: 9 }}>+</span>
        </span>
        <span style={{ fontSize: 20, fontWeight: 800 }}>{title}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 13 }}>
          {right}
          <span onClick={prepni} title="Svetlý / tmavý režim" style={{ cursor: "pointer", width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line}`, background: C.surface, flex: "0 0 auto", color: C.textSec }}>{svetly ? <IkonaMesiac size={17} color={C.textSec} /> : <IkonaSlnko size={17} color={C.textSec} />}</span>
        </span>
      </div>
      {(slogan || karma) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px 9px" }}>
          {slogan && <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontStyle: "italic", color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>„{slogan}"</span>}
          {karma && <span style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: "#E7C766", background: "rgba(231,199,102,.12)", border: "1px solid rgba(200,162,58,.4)", borderRadius: 9, padding: "3px 9px" }}>★ {karma}</span>}
        </div>
      )}
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

// ============================================================
// VYHĽADÁVANIE — zdieľaný overlay (zhora), živé filtrovanie feedu
// data: [{ id, titul, podtitul, kat, emoji, tag }] · onPick(id) otvorí detail
// ============================================================
// jeden engine, jeden register filtrov (§11) — moduly ladia len default filter
export const HL_FILTRE = ["Všetko", "Osoby", "Firmy", "Školitelia", "Charity", "Žiadosti Help", "Žiadosti Charita", "Udalosti"];

// VEREJNÉ subjekty — dohľadateľné z ktoréhokoľvek modulu (jeden engine).
// SÚKROMNÉ osoby tu zámerne NIE SÚ (ochrana pred lustráciou §11/§13).
export const SUBJEKTY = [
  { id: "s-kauf", typ: "Firmy",      titul: "Kaufland — DEED partner",        podtitul: "Firma · ESG report · Trenčín",   emoji: "🏢", tag: "Firma" },
  { id: "s-lidl", typ: "Firmy",      titul: "Lidl pomáha — nadácia",          podtitul: "Firma · matching kampaň",        emoji: "🏢", tag: "Firma" },
  { id: "s-pet",  typ: "Školitelia", titul: "Coach Peter — mentálny tréning", podtitul: "Školiteľ · Trenčín",             emoji: "🧠", tag: "Školiteľ" },
  { id: "s-eva",  typ: "Školitelia", titul: "Coach Eva — joga",               podtitul: "Školiteľ · Mestský park",        emoji: "🧘", tag: "Školiteľ" },
  { id: "s-nem",  typ: "Charity",    titul: "Detská nemocnica — nadácia",     podtitul: "✓ Overená charita · Gold · BA",  emoji: "🏥", tag: "Charita" },
  { id: "s-liga", typ: "Charity",    titul: "Liga proti rakovine",            podtitul: "✓ Overená charita · Gold · SR",  emoji: "🎗", tag: "Charita" },
  { id: "s-jan",  typ: "Osoby",      titul: "Ján Novák — lektor gitary",      podtitul: "Verejný profil · ponúka službu", emoji: "🎸", tag: "Osoba" },
];

// klasifikácia ľubovoľnej položky do filtra (z existujúcich tagov, bez zásahu do modulov)
function hlTyp(x) {
  if (x.typ && HL_FILTRE.includes(x.typ)) return x.typ;
  const t = (x.tag || "").toString().toLowerCase();
  if (t.includes("charita")) return "Charity";
  if (t.includes("žiadosť") || t.includes("ziadost")) return "Žiadosti Help";
  if (t.includes("workshop") || t.includes("udalos") || t.includes("akcia")) return "Udalosti";
  if (t.includes("talent") || t.includes("lektor") || t.includes("školit")) return "Školitelia";
  if (t.includes("ponuka")) return "Osoby";
  if (t.includes("firma") || t.includes("partner")) return "Firmy";
  return "Skutky"; // skutky a ostatné → viditeľné len pod „Všetko"
}

export function HladanieModal({ data = [], onPick, onClose, akcent = "#5BA8F0", placeholder = "Hľadať…",
  defaultFilter = "Všetko", posledne = ["Detská nemocnica", "Coach gitara", "Povodeň pomoc"], subjekty = SUBJEKTY, toast }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(defaultFilter);
  const norm = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const dotaz = norm(q.trim());

  // celý vyhľadávací vesmír = obsah modulu + verejné subjekty (jeden engine naprieč)
  const vesmir = [
    ...data.map((x) => ({ ...x, _typ: hlTyp(x) })),
    ...subjekty.map((x) => ({ ...x, _subj: true, _typ: x.typ })),
  ];
  const podlaFiltra = vesmir.filter((x) => filter === "Všetko" || x._typ === filter);
  const vysl = dotaz ? podlaFiltra.filter((x) => norm([x.titul, x.podtitul, x.kat, x.tag].join(" ")).includes(dotaz)) : podlaFiltra;
  const prazdny = !dotaz && filter === "Všetko"; // história + odporúčané
  const odporucane = vesmir.slice(0, 3);

  const klik = (x) => { if (x._subj) toast?.(`Otváram profil: ${x.titul} (demo)`); else onPick?.(x.id); onClose(); };
  const Riadok = (x) => (
    <div key={x.id} onClick={() => klik(x)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 8px", borderRadius: 12, cursor: "pointer", borderBottom: `1px solid ${C.line2}` }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: tint(akcent, .14) }}>{x.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{x.titul}</div>
        {x.podtitul && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.podtitul}</div>}
      </div>
      {x.tag && <span style={{ flex: "0 0 auto", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 7, background: tint(akcent, .14), color: akcent }}>{x.tag}</span>}
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.5)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", display: "flex", flexDirection: "column", zIndex: 58, animation: "fadeUp .18s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...glassTmavy(26, .92), borderTop: "none", borderLeft: "none", borderRight: "none", borderBottomLeftRadius: 22, borderBottomRightRadius: 22, padding: "12px 14px 14px", boxShadow: "0 18px 50px rgba(0,0,0,.45)", maxHeight: "86%", display: "flex", flexDirection: "column" }}>
        {/* vyhľadávací riadok */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 13px", flex: "0 0 auto" }}>
          <Lupa size={18} color={C.textTer} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 15, fontFamily: "inherit" }} />
          {q
            ? <span onClick={() => setQ("")} title="Vymazať" style={{ display: "flex", cursor: "pointer" }}><IkonaKriz size={18} color={C.textTer} /></span>
            : <span onClick={onClose} style={{ fontSize: 13, fontWeight: 600, color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}>Zrušiť</span>}
        </div>

        {/* filter-chipy — jeden engine, 8 typov */}
        <div style={{ display: "flex", gap: 7, padding: "10px 0 2px", overflowX: "auto", flex: "0 0 auto" }}>
          {HL_FILTRE.map((f) => {
            const on = filter === f;
            return <span key={f} onClick={() => setFilter(f)} style={{ flex: "0 0 auto", padding: "6px 12px", borderRadius: 13, fontSize: 11.5, fontWeight: on ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
              background: on ? tint(akcent, .16) : C.surface2, border: `1px solid ${on ? tint(akcent, .5) : C.line}`, color: on ? akcent : C.textSec }}>{f}</span>;
          })}
        </div>

        {/* obsah */}
        <div style={{ overflowY: "auto", margin: "8px -4px 0", flex: "1 1 auto" }}>
          {prazdny ? (
            <>
              {/* POSLEDNÉ HĽADANIA */}
              <div style={{ display: "flex", alignItems: "center", padding: "6px 8px 4px" }}>
                <span style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700 }}>POSLEDNÉ HĽADANIA</span>
                <span onClick={() => setQ("")} style={{ marginLeft: "auto", fontSize: 11, color: C.textTer, cursor: "pointer" }}>vymazať</span>
              </div>
              {posledne.map((p) => (
                <div key={p} onClick={() => setQ(p)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 8px", borderRadius: 12, cursor: "pointer", borderBottom: `1px solid ${C.line2}` }}>
                  <IkonaOpakovat size={15} color={C.textTer} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{p}</span>
                  <IkonaKriz size={14} color={C.textTer} />
                </div>
              ))}
              {/* ODPORÚČANÉ V OKOLÍ */}
              <div style={{ fontSize: 10.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, padding: "16px 8px 6px" }}>ODPORÚČANÉ V OKOLÍ</div>
              {odporucane.map(Riadok)}
            </>
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: C.textTer, padding: "2px 8px 6px" }}>
                {`${vysl.length} ${vysl.length === 1 ? "výsledok" : vysl.length < 5 ? "výsledky" : "výsledkov"}`}{dotaz ? ` · „${q.trim()}"` : ""}{filter !== "Všetko" ? ` · ${filter}` : ""}
              </div>
              {vysl.length === 0
                ? <div style={{ textAlign: "center", padding: "30px 14px", color: C.textTer, fontSize: 13 }}>Nič sa nenašlo. Skús iné slovo alebo filter.</div>
                : vysl.map(Riadok)}
            </>
          )}
          {/* ochrana — súkromné osoby nelustrovateľné */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, color: C.textTer, lineHeight: 1.4, margin: "14px 4px 2px", padding: "9px 11px", borderRadius: 10, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}` }}>
            <IkonaStit size={14} color={C.textTer} /> Súkromné osoby sa nedajú vyhľadať — len verejné profily a tvorcovia (ochrana).
          </div>
        </div>
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
// QR SYSTÉM (§10) — univerzálny QR naprieč platformou
// typy: identita (TOTP ~30 s) · platba (statický) · akcia (TOTP ~15 s) ·
// skutok / D+R (odkaz). UNIVERZÁLNE PRAVIDLO: každý QR má 3 výstupy —
// Skenovať · Kopírovať odkaz · Zdieľať (rieši „mám len jeden telefón").
// Rotujúci QR (TOTP) = screenshot neplatný po pár sekundách (anti-relay).
// ============================================================

// deterministický pattern z reťazca (vyzerá QR-ovo; rovnaký odkaz = rovnaký vzor)
function qrHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function qrPrng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// finder (rohové štvorce) klasického QR — 7×7 v troch rohoch mriežky N×N
function qrFinder(r, c, N) {
  const rohy = [[0, 0], [0, N - 7], [N - 7, 0]];
  for (const [or, oc] of rohy) {
    const rr = r - or, cc = c - oc;
    if (rr >= 0 && rr < 7 && cc >= 0 && cc < 7) {
      const ramik = rr === 0 || rr === 6 || cc === 0 || cc === 6;
      const jadro = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
      return ramik || jadro ? "dark" : "light";
    }
  }
  return null;
}
export function QrVizual({ data = "deed", size = 132, fg = "#0B0C10" }) {
  const N = 25;
  const rnd = qrPrng(qrHash(data));
  const bunky = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const f = qrFinder(r, c, N);
    bunky.push(f ? f === "dark" : rnd() > 0.52);
  }
  return (
    <div style={{ width: size, height: size, background: "#fff", borderRadius: 12, padding: size * 0.07, flex: "0 0 auto", boxShadow: "0 6px 18px rgba(0,0,0,.18)" }}>
      <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: `repeat(${N},1fr)`, gridTemplateRows: `repeat(${N},1fr)` }}>
        {bunky.map((on, k) => <i key={k} style={{ background: on ? fg : "transparent" }} />)}
      </div>
    </div>
  );
}

const QR_TYPY = {
  identita: { rot: 30, tag: "Identity Card", popis: "Overenie identity člena — rotujúci kód", col: "#8B7CFF" },
  platba:   { rot: 0,  tag: "Platobný QR",   popis: "Pošli DEED / prepitné — statický kód",  col: "#43E0C8" },
  akcia:    { rot: 15, tag: "Akčný QR",      popis: "Overenie účasti (proof-of-presence)",    col: "#F0A85E" },
  skutok:   { rot: 0,  tag: "QR skutku",     popis: "Odkaz na skutok / reťaz dobra",          col: "#5BA8F0" },
};

export function QrModal({ typ = "skutok", titul, popis, odkaz = "https://deed.app/s/120042", reazPct, prijemca, onClose, toast }) {
  const meta = QR_TYPY[typ] || QR_TYPY.skutok;
  const rotujuci = meta.rot > 0;
  const [zb, setZb] = useState(meta.rot);     // zostávajúce sekundy do rotácie
  const [krok, setKrok] = useState(0);        // poradie rotácie (mení seed)
  useEffect(() => {
    if (!rotujuci) return;
    const t = setInterval(() => setZb((s) => { if (s <= 1) { setKrok((x) => x + 1); return meta.rot; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [rotujuci, meta.rot]);
  const seed = odkaz + (rotujuci ? "·" + krok : "");

  const kopiruj = () => {
    try { navigator.clipboard?.writeText(odkaz); } catch { /* clipboard nedostupný */ }
    toast?.("Odkaz skopírovaný do schránky");
  };
  const zdielaj = () => {
    try { if (navigator.share) { navigator.share({ title: titul || "DEED", url: odkaz }); return; } } catch { /* share zrušený */ }
    kopiruj();
  };

  const out = (ic, label, sub, onClick) => (
    <button onClick={onClick} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "12px 6px", borderRadius: 13, background: C.surface2, border: `1px solid ${C.line}`, color: C.text, cursor: "pointer", fontFamily: "inherit" }}>
      <span style={{ color: meta.col }}>{ic}</span>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 9.5, color: C.textTer }}>{sub}</span>
    </button>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(meta.col, .16), color: meta.col }}><IkonaDoska size={18} color={meta.col} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{titul || meta.tag}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{popis || meta.popis}</div>
        </div>
        <span style={{ marginLeft: "auto", flex: "none", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: tint(meta.col, .14), color: meta.col }}>{meta.tag}</span>
      </div>

      {/* samotný QR */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "6px 0 4px" }}>
        <div style={{ position: "relative" }}>
          <QrVizual data={seed} size={156} />
          {reazPct != null && (
            <span style={{ position: "absolute", top: -8, right: -8, fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 20, background: GRAD_ZELENY, color: "#06281d", boxShadow: "0 4px 12px rgba(31,191,143,.4)" }}>D+R {reazPct}%</span>
          )}
        </div>
        {prijemca && <div style={{ fontSize: 12, color: C.textSec }}>{reazPct}% ide ďalej → <b style={{ color: C.text }}>{prijemca}</b></div>}
        {rotujuci ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: C.textTer }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${tint(meta.col, .3)}`, borderTopColor: meta.col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: meta.col, animation: "tocenie 1s linear infinite" }} />
            obnoví sa o <b style={{ color: meta.col }}>{zb}s</b> · screenshot neplatný (anti-relay)
          </div>
        ) : (
          <div style={{ fontSize: 11, color: C.textTer, fontFamily: "monospace", maxWidth: "92%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{odkaz}</div>
        )}
      </div>

      {/* 3 výstupy — univerzálne pravidlo §10 */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {out(<Lupa size={18} color={meta.col} />, "Skenovať", "fotoaparát", () => toast?.("Otváram fotoaparát na skenovanie (demo)"))}
        {out(<IkonaUlozit size={18} color={meta.col} />, "Kopírovať", "odkaz", kopiruj)}
        {out(<Zdielanie size={18} color={meta.col} />, "Zdieľať", "siete", zdielaj)}
      </div>
    </Modal>
  );
}

// ============================================================
// SIMULÁCIA PLATBY — EUR (karta · platobná brána) / DEED (peňaženka · chain)
// realistický tok: suma → detaily → spracovanie → potvrdenie (doklad)
// ============================================================
const PLATBA_ZOSTATOK = 1240; // DEED zostatok v peňaženke (demo)
export function PlatbaModal({ kanal, komu, onClose, onDone }) {
  const jeEur = kanal === "EUR";
  const [krok, setKrok] = useState("suma"); // suma | detaily | spracovanie | hotovo
  const [suma, setSuma] = useState("");
  const [karta, setKarta] = useState({ cislo: "", exp: "", cvc: "" });
  const [res, setRes] = useState(null);
  const sumaNum = Number(suma) || 0;
  const poplatok = jeEur ? Math.round((sumaNum * 0.014 + 0.15) * 100) / 100 : 0;
  const spolu = Math.round((sumaNum + poplatok) * 100) / 100;
  const malo = !jeEur && sumaNum > PLATBA_ZOSTATOK;

  const inpS = { width: "100%", padding: "12px 13px", borderRadius: 12, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 16, outline: "none", fontFamily: "inherit" };
  const btnP = (ok, grad = GRAD) => ({ width: "100%", padding: "13px 0", borderRadius: 14, border: "none", fontWeight: 700, fontSize: 15, cursor: ok ? "pointer" : "not-allowed", fontFamily: "inherit", background: ok ? grad : "rgba(var(--glass-rgb),.06)", color: ok ? "#fff" : C.textTer, boxShadow: ok ? "0 8px 26px rgba(99,134,255,.32)" : "none", marginTop: 14 });
  const chips = jeEur ? [5, 10, 20, 50] : [50, 100, 200, 500];
  const fmtCislo = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})(?=.)/g, "$1 ");
  const fmtExp = (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; };
  const kartaOk = karta.cislo.replace(/\s/g, "").length === 16 && karta.exp.length === 5 && karta.cvc.length >= 3;

  function zaplatit() {
    setKrok("spracovanie");
    setTimeout(() => {
      setRes({
        id: "TX-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        hash: "0x" + Math.random().toString(16).slice(2, 10) + "…" + Math.random().toString(16).slice(2, 6),
        cas: new Date().toLocaleString("sk"),
      });
      setKrok("hotovo");
    }, 1800);
  }

  const Riadok = ({ k, v, accent }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", fontSize: 12.5, borderBottom: `1px solid ${C.line2}` }}>
      <span style={{ color: C.textTer, flex: "none" }}>{k}</span>
      <span style={{ fontWeight: 600, color: accent || C.text, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );

  return (
    <Modal onClose={krok === "spracovanie" ? () => {} : onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: jeEur ? "rgba(91,155,255,.14)" : "rgba(67,224,200,.14)", color: jeEur ? C.blueL : C.teal, fontWeight: 800, fontSize: 14 }}>{jeEur ? "€" : "D⁺"}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{jeEur ? "Platba kartou" : "Platba z peňaženky"}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{jeEur ? "EUR · platobná brána" : "DEED · wallet → wallet"}{komu ? ` · pre ${komu}` : ""}</div>
        </div>
      </div>

      {krok === "suma" && (<>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input autoFocus type="number" inputMode="decimal" placeholder="0" value={suma} onChange={(e) => setSuma(e.target.value)} style={{ ...inpS, fontSize: 26, fontWeight: 800, textAlign: "center", padding: "16px 54px" }} />
          <span style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", fontWeight: 800, color: C.textTer }}>{jeEur ? "€" : "DEED"}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {chips.map((c) => <button key={c} onClick={() => setSuma(String(c))} style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: `1px solid ${C.line}`, background: "rgba(var(--glass-rgb),.05)", color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{c}</button>)}
        </div>
        {!jeEur && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 10 }}>Zostatok v peňaženke: <b style={{ color: C.text }}>{PLATBA_ZOSTATOK.toLocaleString("sk")} DEED</b></div>}
        {malo && <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>Nedostatok DEED v peňaženke.</div>}
        <button disabled={sumaNum <= 0 || malo} onClick={() => setKrok("detaily")} style={btnP(sumaNum > 0 && !malo)}>Pokračovať</button>
      </>)}

      {krok === "detaily" && jeEur && (<>
        <input autoFocus inputMode="numeric" placeholder="Číslo karty" value={karta.cislo} onChange={(e) => setKarta({ ...karta, cislo: fmtCislo(e.target.value) })} style={{ ...inpS, marginBottom: 10, letterSpacing: ".06em" }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input inputMode="numeric" placeholder="MM/RR" value={karta.exp} onChange={(e) => setKarta({ ...karta, exp: fmtExp(e.target.value) })} style={{ ...inpS, flex: 1 }} />
          <input inputMode="numeric" placeholder="CVC" value={karta.cvc} onChange={(e) => setKarta({ ...karta, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} style={{ ...inpS, flex: 1 }} />
        </div>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "4px 12px 8px" }}>
          <Riadok k="Suma" v={`${sumaNum.toFixed(2)} €`} />
          <Riadok k="Poplatok (1,4 % + 0,15 €)" v={`${poplatok.toFixed(2)} €`} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, fontSize: 14, fontWeight: 800 }}><span>Spolu</span><span>{spolu.toFixed(2)} €</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: C.textTer, marginTop: 10, lineHeight: 1.4 }}><IkonaStit size={13} color={C.green} /> Zabezpečené · 3‑D Secure · test 4242 4242 4242 4242</div>
        <button disabled={!kartaOk} onClick={zaplatit} style={btnP(kartaOk)}>Zaplatiť {spolu.toFixed(2)} €</button>
      </>)}

      {krok === "detaily" && !jeEur && (<>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "4px 12px 8px" }}>
          <Riadok k="Suma" v={`${sumaNum.toLocaleString("sk")} DEED`} />
          <Riadok k="Poplatok" v="0 DEED" accent={C.green} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, fontSize: 13.5, fontWeight: 700 }}><span>Zostatok po platbe</span><span>{(PLATBA_ZOSTATOK - sumaNum).toLocaleString("sk")} DEED</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: C.textTer, marginTop: 10, lineHeight: 1.4 }}><IkonaStit size={13} color={C.teal} /> Wallet → wallet · okamžite · podpis na chaine</div>
        <button onClick={zaplatit} style={btnP(true, GRAD_ZELENY)}>Potvrdiť platbu</button>
      </>)}

      {krok === "spracovanie" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15, padding: "26px 0 30px" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", border: "3px solid rgba(var(--glass-rgb),.14)", borderTopColor: jeEur ? C.blueL : C.teal, animation: "tocenie .8s linear infinite" }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Spracúva sa platba…</div>
          <div style={{ fontSize: 11.5, color: C.textTer, textAlign: "center" }}>{jeEur ? "Overujem kartu cez platobnú bránu" : "Podpisujem transakciu na chaine"}</div>
        </div>
      )}

      {krok === "hotovo" && res && (<>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "4px 0 14px" }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(46,200,140,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}><IkonaFajka size={28} color="#2BD49B" /></div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Platba úspešná</div>
          <div style={{ fontSize: 12.5, color: C.textSec }}>{jeEur ? `${spolu.toFixed(2)} €` : `${sumaNum.toLocaleString("sk")} DEED`}{komu ? ` → ${komu}` : ""}</div>
        </div>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "4px 12px 8px" }}>
          <Riadok k="Kanál" v={jeEur ? "Karta (EUR)" : "Peňaženka (DEED)"} />
          {jeEur && <Riadok k="Poplatok" v={`${poplatok.toFixed(2)} €`} />}
          <Riadok k="ID transakcie" v={res.id} />
          <Riadok k="⛓ Hash" v={res.hash} accent={C.blueL} />
          <Riadok k="Dátum" v={res.cas} />
        </div>
        <button onClick={() => { onDone?.(sumaNum); onClose?.(); }} style={btnP(true, GRAD_ZELENY)}>Hotovo</button>
      </>)}
    </Modal>
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

// ---- jednotná sada moderných line-ikon (24×24, currentColor, okrúhle konce) ----
function SvgI({ size = 18, color = "currentColor", sw = 2, fill = "none", children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 auto" }}
      fill={fill} stroke={fill === "none" ? color : "none"} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
// palec hore (upvote)
export function Palec({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} color={color}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></SvgI>;
}
// lupa (hľadanie)
export function Lupa({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} color={color}><circle cx="11" cy="11" r="7.5" /><path d="M21 21l-4.35-4.35" /></SvgI>;
}
// zvonček (upozornenia)
export function Zvon({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} color={color}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></SvgI>;
}
// prehrať (talent)
export function IkonaPlay({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} fill={color}><path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z" /></SvgI>;
}
// nástenka (mriežka)
export function IkonaDoska({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} color={color}><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /></SvgI>;
}
// plus (pridať)
export function IkonaPlus({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} color={color} sw={2.4}><path d="M12 5v14M5 12h14" /></SvgI>;
}
// pin (lokalita)
export function IkonaPin({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} color={color}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="2.6" /></SvgI>;
}
// menu (hamburger)
export function IkonaMenu({ size = 22, color = "currentColor" }) {
  return <SvgI size={size} color={color}><path d="M3 6h18M3 12h18M3 18h18" /></SvgI>;
}
// zdieľať (tri prepojené uzly)
export function Zdielanie({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} color={color}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 3.98M15.4 6.5l-6.8 3.98" /></SvgI>;
}
// slnko (svetlý režim)
export function IkonaSlnko({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} color={color}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></SvgI>;
}
// mesiac (tmavý režim)
export function IkonaMesiac({ size = 18, color = "currentColor" }) {
  return <SvgI size={size} color={color}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></SvgI>;
}

// ---- MODULOVÉ (navigačné) IKONY — jednotný line štýl pre dok + sheet ----
export function IkonaDomov({ size = 22, color = "currentColor" }) {
  return <SvgI size={size} color={color}><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></SvgI>;
}
export function IkonaSrdceLine({ size = 22, color = "currentColor" }) { // Help — srdce (outline)
  return <SvgI size={size} color={color}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z" /></SvgI>;
}
export function IkonaCharita({ size = 22, color = "currentColor" }) { // darček
  return <SvgI size={size} color={color}><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2.5 8.5A1.5 1.5 0 0 1 4 7h16a1.5 1.5 0 0 1 1.5 1.5V11a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1z" /><path d="M12 7v14" /><path d="M12 7S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 7s1.5-4 4-4a2.5 2.5 0 0 1 0 5" /></SvgI>;
}
export function IkonaKompas({ size = 22, color = "currentColor" }) { // Aktivity — objav
  return <SvgI size={size} color={color}><circle cx="12" cy="12" r="9.5" /><path d="M15.8 8.2 13.9 13.9 8.2 15.8l1.9-5.7z" /></SvgI>;
}
export function IkonaMapa({ size = 22, color = "currentColor" }) {
  return <SvgI size={size} color={color}><path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></SvgI>;
}
export function IkonaPohar({ size = 22, color = "currentColor" }) { // Top — trofej
  return <SvgI size={size} color={color}><path d="M6 4h12v5a6 6 0 0 1-12 0z" /><path d="M6 6H3.6A1.6 1.6 0 0 0 2 7.6 3.4 3.4 0 0 0 6 11M18 6h2.4A1.6 1.6 0 0 1 22 7.6 3.4 3.4 0 0 1 18 11" /><path d="M12 15v3M9.5 21h5M10 21c0-1.4.9-3 2-3s2 1.6 2 3" /></SvgI>;
}
export function IkonaOsoba({ size = 22, color = "currentColor" }) {
  return <SvgI size={size} color={color}><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></SvgI>;
}
export function IkonaPanel({ size = 22, color = "currentColor" }) { // Admin — dashboard
  return <SvgI size={size} color={color}><rect x="3" y="3" width="8" height="9" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="12" width="8" height="9" rx="1.5" /><rect x="3" y="16" width="8" height="5" rx="1.5" /></SvgI>;
}

// ---- CHROME / AKČNÉ IKONY ----
export function IkonaSpat({ size = 18, color = "currentColor" }) { // späť (šípka vľavo)
  return <SvgI size={size} color={color}><path d="M19 12H5M11 18l-6-6 6-6" /></SvgI>;
}
export function IkonaSipVlavo({ size = 18, color = "currentColor" }) { // chevron vľavo
  return <SvgI size={size} color={color} sw={2.2}><path d="M15 18l-6-6 6-6" /></SvgI>;
}
export function IkonaSipVpravo({ size = 18, color = "currentColor" }) { // chevron vpravo
  return <SvgI size={size} color={color} sw={2.2}><path d="M9 18l6-6-6-6" /></SvgI>;
}
export function IkonaSipDole({ size = 18, color = "currentColor" }) { // chevron dole
  return <SvgI size={size} color={color} sw={2.2}><path d="M6 9l6 6 6-6" /></SvgI>;
}
export function IkonaKriz({ size = 18, color = "currentColor" }) { // zavrieť
  return <SvgI size={size} color={color} sw={2.2}><path d="M18 6 6 18M6 6l12 12" /></SvgI>;
}
export function IkonaMoznosti({ size = 18, color = "currentColor" }) { // ⋯ možnosti
  return <SvgI size={size} fill={color}><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></SvgI>;
}
export function IkonaNastavenia({ size = 18, color = "currentColor" }) { // nastavenia
  return <SvgI size={size} color={color}><path d="M20 7h-9M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></SvgI>;
}
export function IkonaVlajka({ size = 18, color = "currentColor" }) { // nahlásiť
  return <SvgI size={size} color={color}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></SvgI>;
}
export function IkonaUlozit({ size = 18, color = "currentColor" }) { // záložka
  return <SvgI size={size} color={color}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></SvgI>;
}
export function IkonaFajka({ size = 18, color = "currentColor" }) { // ✓
  return <SvgI size={size} color={color} sw={2.3}><path d="M20 6 9 17l-5-5" /></SvgI>;
}
export function IkonaOpakovat({ size = 18, color = "currentColor" }) { // pravidelná podpora
  return <SvgI size={size} color={color}><path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></SvgI>;
}
export function IkonaFoto({ size = 18, color = "currentColor" }) { // foto z prípadu
  return <SvgI size={size} color={color}><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" /><circle cx="12" cy="12.5" r="3.2" /></SvgI>;
}
export function IkonaPenazenka({ size = 18, color = "currentColor" }) { // peňaženka
  return <SvgI size={size} color={color}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16 14.5h2" /></SvgI>;
}
// ---- REBRÍČKOVÉ (award) IKONY ----
export function IkonaStit({ size = 18, color = "currentColor" }) { // partner
  return <SvgI size={size} color={color}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></SvgI>;
}
export function IkonaKorunka({ size = 18, color = "currentColor" }) { // darca
  return <SvgI size={size} color={color}><path d="M3 8l4 5 5-8 5 8 4-5-2 12H5z" /></SvgI>;
}
export function IkonaHviezda({ size = 18, color = "currentColor" }) { // hrdina / top
  return <SvgI size={size} color={color}><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.6 19.6l1-6L3.3 9.4l6-.9z" /></SvgI>;
}
export function IkonaUsmev({ size = 18, color = "currentColor" }) { // fun
  return <SvgI size={size} color={color}><circle cx="12" cy="12" r="9.5" /><path d="M8.5 14a4 4 0 0 0 7 0" /><path d="M9 9.5h.01M15 9.5h.01" /></SvgI>;
}
export function IkonaInstitucia({ size = 18, color = "currentColor" }) { // charita & OZ (adresár)
  return <SvgI size={size} color={color}><path d="M3 10 12 4l9 6" /><path d="M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18" /></SvgI>;
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
// 1 DEED ≈ 0,01 € (ilustračne) — zobrazí sa pod hodnotou
const eurZaDeed = (a) => (a * 0.01).toLocaleString("sk", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
// stupňované zvýraznenie pevných súm: 0 = najjemnejšie (10) · 1 = stredné (50) · 2 = najvýraznejšie (100)
const psFix = (tier = 0, col = "#74A6FF") => {
  const t = [
    { bg: C.surface2, bd: C.line, sh: "none" },
    { bg: tint(col, .09), bd: tint(col, .4), sh: "none" },
    { bg: "rgba(240,168,94,.16)", bd: "rgba(240,168,94,.65)", sh: "0 6px 20px rgba(240,168,94,.28)" },
  ][tier];
  return {
    flex: tier === 2 ? 1.18 : 1, minHeight: 64, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "transform .12s ease",
    background: t.bg, border: `1px solid ${t.bd}`, boxShadow: t.sh, color: C.text,
  };
};
const psKanal = {
  flex: 1, minHeight: 56, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit", background: C.surface2, border: `1px solid ${C.line}`, color: C.text,
};

export function PodporaSekcia({ onShare, upvotes = 0, onUpvote, onPodpor, onSms, onKanal, accent = "#74A6FF", supLabel = "DROBNÁ PODPORA — klik a hneď odíde" }) {
  const { svetly } = useMotiv();
  const goldTxt = svetly ? "#8A6B0E" : C.gold; // v svetlom režime tmavšia zlatá (čitateľnosť)
  const fix = [
    { e: "★", v: "10", col: accent, a: 10, tier: 0 },
    { e: "◆", v: "50", col: accent, a: 50, tier: 1 },
    { e: "🔥", v: "100", col: "#F0A85E", a: 100, tier: 2 },
  ];
  return (
    <div>
      <PSLabel>ZADARMO</PSLabel>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onShare} style={{ ...psPill(false), color: C.text }}>
          <Zdielanie size={18} color={C.textSec} /> Zdieľať
        </button>
        <button onClick={onUpvote} style={{ ...psPill(false), color: C.text }}>
          <Palec size={18} color={C.textSec} /> {upvotes}
        </button>
      </div>

      <PSLabel>{supLabel}</PSLabel>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        {fix.map((b) => (
          <button key={b.v} onClick={() => onPodpor(b.a)} style={psFix(b.tier, b.col)}>
            <span style={{ fontSize: b.tier === 2 ? 22 : 20, color: b.col, lineHeight: 1 }}>{b.e}</span>
            <span style={{ fontSize: b.tier === 2 ? 14 : 13, marginTop: 4 }}>{b.v} <span style={{ fontSize: 9, fontWeight: 700, color: C.textTer, letterSpacing: ".3px" }}>DEED</span></span>
            <span style={{ fontSize: 9.5, color: C.textTer, marginTop: 2 }}>≈ {eurZaDeed(b.a)}</span>
          </button>
        ))}
        <div style={{ width: 1, alignSelf: "stretch", borderLeft: `1px dashed ${C.line}`, margin: "3px 3px" }} />
        <button onClick={onSms} style={{ ...psFix(0), flex: 0.85, background: svetly ? "rgba(240,199,90,.16)" : "rgba(240,199,90,.08)", borderColor: svetly ? "rgba(180,140,20,.5)" : "rgba(240,199,90,.35)" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: goldTxt }}>SMS</span>
          <span style={{ fontSize: 13, marginTop: 3, color: goldTxt }}>€</span>
        </button>
      </div>

      <PSLabel>VLASTNÁ SUMA — vyber kanál</PSLabel>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onKanal("EUR")} style={psKanal}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>€ EUR</span>
        </button>
        <button onClick={() => onKanal("DEED")} style={psKanal}>
          <span style={{ fontWeight: 800, fontSize: 15, color: accent }}>DEED</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// JEDNOTNÝ LIVE TICKER — „● niekto práve poslal X → komu" (Help / Charita / Aktivity)
// rovnaký pásik: zelená pulzujúca bodka + jeden riadok textu (obsah dodá modul)
// ============================================================
export function Ticker({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 16px", fontSize: 13, color: C.textSec,
      borderTop: `1px solid ${C.line2}`, borderBottom: `1px solid ${C.line2}`, background: "rgba(31,191,143,.06)", animation: "fadeUp .45s ease" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.greenL, flex: "none", animation: "pulse 1.6s infinite" }} />
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
}

// ============================================================
// JEDNOTNÁ SEKCIA SKRATIEK — ▶ Ukáž svoj talent · ▣ Nástenka · ＋ Pridať
// rovnaký dizajn (pilulky) naprieč Domov / Help / Charita / Aktivity
// ============================================================
export function SekcieBar({ onTalent, onBoard, onAdd, talentActive }) {
  const base = { flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 50, padding: "6px 8px", borderRadius: 14, fontSize: 13.5, fontWeight: 700, lineHeight: 1.15, textAlign: "center", cursor: "pointer", fontFamily: "inherit", transition: "all .15s ease" };
  const ghost = (active) => ({ ...base, background: active ? "rgba(91,155,255,.12)" : C.surface2, border: `1px solid ${active ? "rgba(116,166,255,.45)" : C.line}`, color: active ? C.blueL : C.text });
  const primary = { ...base, background: GRAD, border: "1px solid transparent", color: "#fff", boxShadow: "0 6px 20px rgba(99,134,255,.32)" };
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 16px 14px", borderBottom: `1px solid ${C.line}` }}>
      <div onClick={onTalent} style={ghost(talentActive)}><IkonaPlay size={13} color={talentActive ? C.blueL : C.text} /> Ukáž svoj talent</div>
      <div onClick={onBoard} style={ghost(false)}><IkonaDoska size={15} color="#7E9BF0" /> Nástenka</div>
      <div onClick={onAdd} style={primary}><IkonaPlus size={16} color="#fff" /> Pridať</div>
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
    <div>
      {/* ocenenia */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 10px", overflowX: "auto", alignItems: "stretch" }}>
        {pred}
        {ocenenia.map((o, i) => (
          <div key={i} onClick={o.onClick} style={{ minWidth: 84, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13, padding: "8px 5px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: o.onClick ? "pointer" : "default", flex: "0 0 auto" }}>
            <div style={{ width: 30, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: tint(o.col, .16), color: o.col }}>{o.ic}</div>
            <div style={{ fontSize: 7.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>{o.label}</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, textAlign: "center", maxWidth: 76, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</div>
          </div>
        ))}
      </div>
      {/* profilové avatary — pod oceneniami */}
      {ludia.length > 0 && (
        <div style={{ display: "flex", gap: 14, padding: "0 16px 12px", overflowX: "auto", alignItems: "flex-start" }}>
          {ludia.map((p, i) => (
            <div key={"p" + i} onClick={p.onClick} style={{ minWidth: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "0 0 auto", cursor: p.onClick ? "pointer" : "default" }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(var(--glass-rgb),.06)", border: `2px solid ${p.col || "#5BA8F0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.text }}>{p.ini}</div>
              <div style={{ fontSize: 9.5, color: C.textSec, maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// JEDNOTNÝ ŠTATISTICKÝ RIADOK — „Dnes X · Mesiac Y" + „Moja štvrť" s výberom okruhu
// rovnaký dizajn aj poloha (hneď pod rebríčkom) vo všetkých moduloch
// ============================================================
export function StatRiadok({ stat, miesto = "Trenčín", okruh = "2 km", onOkruh }) {
  // čísla v štatistike zvýrazníme (Dnes 312 · Mesiac 9 480)
  const casti = String(stat).split(/(\d[\d  ]*)/g);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 16px 14px", borderBottom: `1px solid ${C.line}` }}>
      {/* live štatistika — chip s pulzujúcou bodkou */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "1 1 auto", minWidth: 0, padding: "6px 13px", borderRadius: 20, background: "rgba(31,191,143,.08)", border: "1px solid rgba(31,191,143,.22)", fontSize: 12.5, color: C.textSec, fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", flex: "none", background: "#2BBd8C", boxShadow: "0 0 0 4px rgba(61,214,140,.16)", animation: "pulse 1.6s infinite" }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {casti.map((p, i) => /\d/.test(p) ? <b key={i} style={{ color: C.text, fontWeight: 800 }}>{p}</b> : p)}
        </span>
      </span>
      {/* moja štvrť + okruh — klikateľný chip */}
      <span onClick={onOkruh} title="Zmeniť okruh" style={{ display: "inline-flex", alignItems: "center", gap: 7, flex: "none", padding: "5px 8px 5px 12px", borderRadius: 20, background: C.surface2, border: `1px solid ${C.line}`, cursor: "pointer", fontSize: 12.5, color: C.textSec, fontWeight: 600, whiteSpace: "nowrap" }}>
        <IkonaPin size={13} color="#74A6FF" /> Moja štvrť · {miesto}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: "3px 6px 3px 9px", borderRadius: 14, background: "rgba(116,166,255,.14)", color: "#74A6FF", fontSize: 11.5, fontWeight: 700 }}>
          {okruh} <IkonaSipDole size={12} color="#74A6FF" />
        </span>
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

// ============================================================
// VÝBER OKRUHU — zdieľaný (Feed algoritmus, Časť B): mení rádius feedu.
// Väčší okruh = vyšší prah významnosti (vidíš len špičku). `akcent` =
// farba modulu (Good modrá, Help červená, …). Reuse vo všetkých feedoch.
// ============================================================
const OKRUH_POPIS = {
  stvrt: "Aj menšie skutky vo tvojom okolí",
  mesto: "Významnejšie skutky v meste",
  okres: "Veľmi významné skutky v okrese",
  kraj: "Veľmi významné skutky v kraji",
  krajina: "Len mimoriadne skutky z celej SR",
};
export function OkruhVyber({ radius, onPick, onClose, akcent = "#74A6FF" }) {
  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>Okruh feedu</div>
      <div style={{ fontSize: 12.5, color: C.textTer, margin: "4px 0 14px" }}>Väčší okruh = vyšší prah významnosti — vidíš len špičku.</div>
      {Object.entries(FEED_CFG.radiusy).map(([k, r]) => {
        const on = radius === k;
        return (
          <div key={k} onClick={() => onPick(k)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 13, marginBottom: 8, cursor: "pointer",
            background: on ? tint(akcent, .12) : C.surface2, border: `1px solid ${on ? tint(akcent, .45) : C.line}` }}>
            <IkonaPin size={16} color={on ? akcent : C.textTer} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: on ? akcent : C.text }}>{r.label}</div>
              <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>{OKRUH_POPIS[k]}</div>
            </div>
            {on && <IkonaFajka size={16} color={akcent} />}
          </div>
        );
      })}
    </Modal>
  );
}
