// ============================================================
// DEED · ŠTÍT — vizuálny systém karmy (DEED_Stity_v0_1 + Role Panely PATCH 1).
// Badge/level sa zobrazuje VÝLUČNE ako štít + textový popis. NIKDY progress
// bar, percentá, „chýba X %" — level-up je prekvapenie (žiadny spoiler,
// štít sa nedá optimalizovať na percentá). Platí globálne: user, charita,
// tvorca, firma. Všetci začínajú Bronze.
//
//  · Hlavná karma  = ornamentálny štít (gravírovanie po ploche)
//  · Modulová karma = hladký štít + gravírovaný SYMBOL modulu
//  Rovnaká silueta a kovy per level — jedna rodina, dve triedy (§7).
//  Finálne assety (5+5 štítov + 6 symbolov) sa dosadia z výroby; SVG tu
//  drží siluetu a kovy, aby výmena bola len swap assetov.
// ============================================================
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import { toast } from "./toast";

export type StitLevel = "Bronze" | "Silver" | "Gold" | "Platinum" | "Legend";

// kovy per level — gradient a/b + hrana (rovnaké pre obe triedy)
const KOVY: Record<StitLevel, { a: string; b: string; edge: string; lesk: string }> = {
  Bronze:   { a: "#c98a52", b: "#7d4c22", edge: "#5e3818", lesk: "#e8b98c" },
  Silver:   { a: "#d9dee5", b: "#8f979f", edge: "#6b737b", lesk: "#f2f5f8" },
  Gold:     { a: "#eed27a", b: "#a8802a", edge: "#7c5d1c", lesk: "#fbecb2" },
  Platinum: { a: "#eef1f4", b: "#9fb0c4", edge: "#74869c", lesk: "#ffffff" },
  Legend:   { a: "#f3d97e", b: "#7a5bd8", edge: "#4d3596", lesk: "#ffe9a8" },
};

/** hotové assety štítov (public/stity) — hlavná karma. Modulová trieda ostáva SVG,
 *  kým neprídu jej vlastné assety so symbolmi. */
const OBRAZKY: Record<StitLevel, string> = {
  Bronze: "/stity/bronze.png",
  Silver: "/stity/silver.png",
  Gold: "/stity/gold.png",
  Platinum: "/stity/platinum.png",
  Legend: "/stity/legend.png",
};

/** krátky textový popis k štítu — jediné, čo sa smie zobraziť (žiadny postup) */
export const STIT_POPIS: Record<StitLevel, string> = {
  Bronze: "zaslúžený štít — každý začína tu",
  Silver: "zaslúžený štít — postavený na skutkoch",
  Gold: "zaslúžený štít — postavený na skutkoch",
  Platinum: "zaslúžený štít — vzácny stupeň dôvery",
  Legend: "zaslúžený štít — najvyšší stupeň dôvery",
};

/** symboly modulov MVP (§3) — gravírujú sa do hladkého štítu. Placeholder
 *  glyfy do príchodu jednofarebných SVG z výroby (razba = grayscale filter). */
export const SYMBOLY_MODULOV: Record<string, string> = {
  help: "🤝",       // podané ruky
  charita: "🫶",    // srdce v dlani
  sport: "🏃",      // diskobolos
  art: "🎼",        // lýra
  learn: "🦉",      // sova (Aténa)
  eco: "🌿",        // vavrínová vetva / dub
  // fáza 2 (potvrdiť pri module): health = Asklépiova palica (JEDEN had),
  // gov = váhy, sos = maják, kids = klíčiaci výhonok
  // Core = bez symbolu (ornamentál) · Viera = bez karmy → bez štítu
};

/** bezpečný mapper zo stringu (mock dáta) na level — neznáme → Bronze */
export function naStitLevel(s?: string): StitLevel {
  return (["Bronze", "Silver", "Gold", "Platinum", "Legend"] as StitLevel[]).find((l) => l === s) ?? "Bronze";
}

/**
 * Štít — heraldická silueta + kov per level.
 *  · trieda "hlavna": ornamentálne gravírovanie po ploche (hlavná karma)
 *  · trieda "modul": hladká plocha + symbol modulu (modulová karma)
 * Malé rozlíšenie (avatar ~40 px): detail gravírovania sa stráca — počíta sa s tým.
 */
export function Stit({ level, trieda = "hlavna", symbol, size = 44, title, detail, subjekt }: {
  level: StitLevel;
  trieda?: "hlavna" | "modul";
  /** kľúč z SYMBOLY_MODULOV alebo vlastný glyf (len trieda "modul") */
  symbol?: string;
  size?: number;
  title?: string;
  /** klik na štít otvorí zväčšený detail (level + popis) */
  detail?: boolean;
  /** meno subjektu do detailu */
  subjekt?: string;
}) {
  const [otvoreny, setOtvoreny] = useState(false);
  const kov = KOVY[level];
  const id = `stit-${level}-${trieda}`; // gradienty per level+trieda (stabilné id → žiadne duplicity defs nevadia)
  const glyf = symbol ? (SYMBOLY_MODULOV[symbol] ?? symbol) : null;
  return (
    <span title={title ?? `${level} — ${STIT_POPIS[level]}`}
      {...(detail ? { role: "button", tabIndex: 0, onClick: (e: React.MouseEvent) => { e.stopPropagation(); setOtvoreny(true); }, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOtvoreny(true); } } } : {})}
      style={{ display: "inline-flex", position: "relative", width: size, height: size * 1.12, flex: "none", cursor: detail ? "pointer" : "default" }} aria-label={`Štít ${level}`}>
      {trieda === "hlavna" ? (
        <img src={OBRAZKY[level]} alt="" width={size} height={size * 1.12}
          style={{ display: "block", width: size, height: size * 1.12, objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,.45))" }} />
      ) : (
      <svg viewBox="0 0 100 112" width={size} height={size * 1.12} style={{ display: "block" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={kov.a} />
            <stop offset="1" stopColor={kov.b} />
          </linearGradient>
        </defs>
        {/* silueta — rovnaká pre celú rodinu (§7 konzistencia) */}
        <path d="M50 4 L92 18 V56 C92 82 74 98 50 108 C26 98 8 82 8 56 V18 Z"
          fill={`url(#${id})`} stroke={kov.edge} strokeWidth="3" />
        {/* horný lesk kovu */}
        <path d="M50 8 L88 20 V32 C74 26 26 26 12 32 V20 Z" fill={kov.lesk} opacity=".35" />
        {/* hladký štít — len jemná vnútorná linka, symbol nesie význam */}
        <path d="M50 14 L84 25 V55 C84 76 69 90 50 99 C31 90 16 76 16 55 V25 Z"
          fill="none" stroke={kov.edge} strokeWidth="1.4" opacity=".4" />
      </svg>
      )}
      {trieda === "modul" && glyf && (
        // gravírovaný symbol — jednofarebná razba kovom štítu (grayscale ≈ reliéf)
        <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .42, filter: "grayscale(1) contrast(.85) opacity(.8)", transform: "translateY(-4%)" }}>{glyf}</span>
      )}
      {otvoreny && createPortal(
        <StitDetail level={level} trieda={trieda} symbol={symbol} subjekt={subjekt} onClose={() => setOtvoreny(false)} />,
        document.body,
      )}
    </span>
  );
}

/**
 * Detail štítu — klik na štít ho zväčší. NIE je to reveal moment povýšenia
 * (ten je StitReveal). Tu sa len pozerám na štít, ktorý subjekt už má.
 */
export function StitDetail({ level, trieda = "hlavna", symbol, subjekt, onClose }: {
  level: StitLevel; trieda?: "hlavna" | "modul"; symbol?: string; subjekt?: string; onClose: () => void;
}) {
  const kov = KOVY[level];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-label={`Štít ${level}`} onClick={(e) => { e.stopPropagation(); onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, cursor: "default", background: "radial-gradient(circle at 50% 42%, rgba(20,18,12,.88), rgba(4,6,12,.96) 78%)", animation: "stitDetailFade .22s ease" }}>
      <style>{`
        @keyframes stitDetailFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes stitDetailPop { from { transform: scale(.82); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
      <span onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "stitDetailPop .28s cubic-bezier(.2,1.1,.4,1) both" }}>
        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 300, height: 300 }}>
          <span aria-hidden style={{ position: "absolute", inset: 30, borderRadius: "50%", background: `radial-gradient(circle, ${kov.a}38, transparent 70%)` }} />
          <span style={{ position: "relative" }}><Stit level={level} trieda={trieda} symbol={symbol} size={230} /></span>
        </span>
        {subjekt && <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#fff" }}>{subjekt}</span>}
        <span style={{ display: "block", fontSize: 12.5, color: "rgba(255,255,255,.62)", marginTop: 6, lineHeight: 1.5, maxWidth: 280 }}>{STIT_POPIS[level]}</span>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ height: 42, padding: "0 22px", marginTop: 22, borderRadius: 12, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.88)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Zavrieť
        </button>
      </span>
    </div>
  );
}

/** Štít + textový popis vedľa (najčastejšia kompozícia) — modulový titul je TEXT, nie grafika (§4). */
export function StitRiadok({ level, titul, trieda, symbol, size = 44 }: {
  level: StitLevel; titul?: ReactNode; trieda?: "hlavna" | "modul"; symbol?: string; size?: number;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <Stit level={level} trieda={trieda} symbol={symbol} size={size} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: KOVY[level].b === "#7a5bd8" ? "var(--a-plum)" : "var(--c-text)" }}>{level}</span>
        <span style={{ display: "block", fontSize: 10.5, color: "var(--c-textTer)", lineHeight: 1.35 }}>{titul ?? STIT_POPIS[level]}</span>
      </span>
    </span>
  );
}

// ============================================================
// on_badge_levelup — hook na reveal moment (DEED_Stity §6).
// Pri povýšení sa prehrá personalizovaná reveal animácia (badge video
// ~20 s, vždy skippable, zdieľateľná) — videá per LEVEL (4 ks, Silver→Legend).
// Assety a prehrávač prídu neskôr — zatiaľ len registrovateľný hook,
// nech volajúci kód (karma engine) má kam zavesiť moment.
// ============================================================
export type BadgeLevelupHandler = (ev: { subjekt: string; level: StitLevel }) => void;
const levelupHandlers = new Set<BadgeLevelupHandler>();

export function onBadgeLevelup(handler: BadgeLevelupHandler): () => void {
  levelupHandlers.add(handler);
  return () => levelupHandlers.delete(handler);
}
/** zavolá karma engine pri povýšení — spustí reveal (StitRevealHost počúva) */
export function emitBadgeLevelup(ev: { subjekt: string; level: StitLevel }) {
  levelupHandlers.forEach((h) => h(ev));
}

/**
 * Host reveal momentu — namontovaný raz v App; počúva on_badge_levelup
 * a prehrá reveal overlay. Finálne badge videá per LEVEL (4 ks, Silver→Legend)
 * prídu z výroby — do ich príchodu drží moment CSS animácia s rovnakou
 * anatómiou: personalizácia menom, vždy skippable, zdieľateľná von (§6).
 */
export function StitRevealHost() {
  const [ev, setEv] = useState<{ subjekt: string; level: StitLevel } | null>(null);
  useEffect(() => onBadgeLevelup(setEv), []);
  if (!ev) return null;
  return <StitReveal subjekt={ev.subjekt} level={ev.level} onClose={() => setEv(null)} />;
}

export function StitReveal({ subjekt, level, onClose }: { subjekt: string; level: StitLevel; onClose: () => void }) {
  const kov = KOVY[level];
  // Escape = preskočiť (skippable aj z klávesnice)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const podelSa = () => {
    void zdielaj({ titul: `Nový štít: ${level}`, text: `${subjekt} — ${level} štít na DEED. Postavené na skutkoch, nie na rečiach.`, url: aktualnaUrl() }, toast);
  };
  return (
    <div role="dialog" aria-label={`Nový štít ${level}`} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(circle at 50% 40%, rgba(28,22,10,.9), rgba(4,6,12,.97) 75%)", animation: "stitRevealFade .35s ease" }}>
      <style>{`
        @keyframes stitRevealFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes stitRevealPop { 0% { transform: scale(.15) rotate(-16deg); opacity: 0 } 55% { transform: scale(1.14) rotate(4deg); opacity: 1 } 75% { transform: scale(.96) rotate(-1deg) } 100% { transform: scale(1) rotate(0) } }
        @keyframes stitRevealRay { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes stitRevealUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
      `}</style>
      {/* vždy skippable — ✕ hore, klik na pozadie, Escape */}
      <button onClick={onClose} aria-label="Preskočiť"
        style={{ position: "absolute", top: 18, right: 18, height: 34, padding: "0 14px", borderRadius: 17, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.85)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        Preskočiť ✕
      </button>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 340 }}>
        {/* lúče za štítom — jediný pohyblivý prvok, kým prídu videá */}
        <div style={{ position: "relative", width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(${kov.a}33, transparent 22%, ${kov.a}22 38%, transparent 55%, ${kov.a}33 72%, transparent 90%, ${kov.a}33)`, filter: "blur(2px)", animation: "stitRevealRay 14s linear infinite" }} />
          <div aria-hidden style={{ position: "absolute", inset: 34, borderRadius: "50%", background: `radial-gradient(circle, ${kov.a}40, transparent 70%)` }} />
          <span style={{ position: "relative", animation: "stitRevealPop .9s cubic-bezier(.2,1.4,.4,1) both .15s" }}>
            <Stit level={level} size={128} />
          </span>
        </div>
        <div style={{ animation: "stitRevealUp .5s ease both .7s" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".28em", color: "rgba(255,255,255,.55)" }}>NOVÝ ŠTÍT</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: kov.a, marginTop: 4, textShadow: `0 0 28px ${kov.a}55` }}>{level}</div>
          {/* meno = textový overlay na šablónu (§6) — nie nový render */}
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 8 }}>{subjekt}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 4, lineHeight: 1.5 }}>{STIT_POPIS[level]}</div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 22, animation: "stitRevealUp .5s ease both 1s" }}>
          <button onClick={podelSa} style={{ height: 44, padding: "0 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${kov.a}, ${kov.b})`, color: "#1c1608", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            Zdieľať štít
          </button>
          <button onClick={onClose} style={{ height: 44, padding: "0 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,.25)", background: "transparent", color: "rgba(255,255,255,.85)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Pokračovať
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Doživotné badge (§5) — medaily/piny, NIE štíty. MVP = textový chip;
// grafika (medaily) post-MVP, až budú prví držitelia.
// ============================================================
export const DOZIVOTNE_BADGE: { id: string; nazov: string; popis: string }[] = [
  { id: "zachranca-zivota", nazov: "Záchranca života", popis: "Preukázateľne zachránil ľudský život" },
  { id: "senior-hero", nazov: "Senior Hero", popis: "Dlhodobá výnimočná pomoc seniorom" },
  { id: "once-a-legend", nazov: "Once a Legend", popis: "Raz dosiahnutý Legend sa nezabúda" },
  { id: "renta-hrdina", nazov: "Renta hrdina", popis: "Trvalá renta venovaná dobru" },
  { id: "community-hero", nazov: "Community Hero", popis: "Mimoriadny prínos celej komunite" },
  { id: "svedok-dobra", nazov: "Svedok dobra", popis: "Overil a doložil skutky iných" },
];

/** textový chip doživotného badge — mimo úrovní, nedá sa kúpiť ani stratiť */
export function DozivotnyChip({ id }: { id: string }) {
  const b = DOZIVOTNE_BADGE.find((x) => x.id === id);
  if (!b) return null;
  return (
    <span title={b.popis} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: "var(--a-gold)", background: "rgba(231,199,102,.12)", border: "1px solid rgba(200,162,58,.45)", whiteSpace: "nowrap" }}>
      🎖 {b.nazov}
    </span>
  );
}
