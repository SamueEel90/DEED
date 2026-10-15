// ============================================================
// OPRAVY 205 — Spomíname a Teš sa s nami (prototyp „Medailony Spominame a Tes sa").
// Spomíname = ovál-medailón so zlatým rámom, bez tlačidiel, ťuk na celý medailón (Kondolovať je až v module).
// Teš sa s nami = tvar podľa druhu (ako dopravné značky): svadba kruh · jubileum kosoštvorec · blahoželanie/poďakovanie štvorec.
// Každá šablóna má spárovanú miniatúru: podklad = pozadie šablóny, rám = farba ozdôb (farby z Editor oznameni.html).
// ============================================================
import type { CSSProperties, ReactNode } from "react";

export interface Paleta { bg: string; fg: string; ac: string; head: string }
const P = (bg: string, fg: string, ac: string, head = ""): Paleta => ({ bg, fg, ac, head });

/** 2a · parte m1–m8 (muž), z1–z8 (žena) */
export const PARTE: Record<string, Paleta> = {
  m1: P("#ffffff", "#1c1c1c", "#1c1c1c"), m2: P("#fbfbfa", "#1c1c1c", "#9aa0ab"), m3: P("#23211e", "#f0e9dc", "#c9a44e", "Posledné zbohom"), m4: P("#f7f2e8", "#2b2520", "#a8842c", "Smútočné oznámenie"),
  m5: P("#ffffff", "#1c1c1c", "#1c1c1c"), m6: P("#f4f1ea", "#25221e", "#6d5a3a"), m7: P("#eceeef", "#1e2226", "#1e2226"), m8: P("#1f2b24", "#efe8d6", "#c9a44e", "Odpočívaj v pokoji"),
  z1: P("#f7f2e8", "#2b2520", "#b08a8a"), z2: P("#ffffff", "#1c1c1c", "#7d6f9e"), z3: P("#fdfbf7", "#2b2520", "#a8849a", "S láskou spomíname"), z4: P("#4a2432", "#f1e8ec", "#c7ccd6", "Smútočné oznámenie"),
  z5: P("#fbf6f4", "#2b2220", "#9b6b6b"), z6: P("#f5f3f8", "#221f2a", "#7d6f9e"), z7: P("#f1f3ee", "#22261f", "#6f8466"), z8: P("#1d2236", "#ece9f2", "#c7ccd6", "S láskou spomíname"),
};
/** 2b · svadba s1–s16 */
export const SVADBA: Record<string, Paleta> = {
  s1: P("#fbf7ee", "#2b2418", "#b08d34", "Budeme sa brať"), s2: P("#fbf0ef", "#3a2428", "#b0707a", "Navždy spolu"), s3: P("#ffffff", "#222222", "#222222"), s4: P("#f1efec", "#1f1f1f", "#1f1f1f"),
  s5: P("#fdfaf4", "#2a251d", "#8a7a5c"), s6: P("#f1f3ee", "#22261f", "#6f8466"), s7: P("#f6efe4", "#2e261b", "#a88a5a", "Povieme si áno"), s8: P("#120d1f", "#ffffff", "#ff4fa3", "Áno"),
  s9: P("radial-gradient(circle at 50% 35%,#fffaf0 0%,#f6ead0 55%,#e8d3a6 100%)", "#3a2a12", "#b8892e", "Budeme sa brať"), s10: P("radial-gradient(circle at 50% 30%,#22305a 0%,#141c38 60%,#0b1024 100%)", "#f6efe0", "#d4a849", "Svadba"),
  s11: P("linear-gradient(170deg,#fff4f3 0%,#f9dcdc 60%,#f1c6c9 100%)", "#3d2226", "#b8892e", "Navždy spolu"), s12: P("radial-gradient(circle at 50% 30%,#1f5a49 0%,#123d32 60%,#0a2620 100%)", "#f4efe2", "#d4a849", "Povieme si áno"),
  s13: P("#0b0716", "#ffffff", "#b45cff", "Berieme sa"), s14: P("#0a0906", "#fff8e6", "#ffc94a", "Áno"), s15: P("linear-gradient(180deg,#ffd9a8 0%,#f7a6a6 45%,#9a6fc4 100%)", "#ffffff", "#ffffff"),
  s16: P("linear-gradient(120deg,#f7ecd6,#fff9ee,#ecd9b0,#fff9ee,#f2e2c0)", "#3a2a12", "#b8892e", "Budeme sa brať"),
};
/** 2c · jubileum j1–j12 */
export const JUBILEUM: Record<string, Paleta> = {
  j1: P("linear-gradient(180deg,#fff7e8,#ffe9f0)", "#2b2b40", "#ff6b6b"), j2: P("radial-gradient(circle at 50% 30%,#2a3f86 0%,#141d4a 60%,#0a0f2b 100%)", "#ffffff", "#ffd34d"),
  j3: P("#ffffff", "#1d1d2b", "#7a4cff"), j4: P("#0b0716", "#ffffff", "#39ff88"), j5: P("radial-gradient(circle at 50% 35%,#fffaf0 0%,#f6ead0 55%,#e8d3a6 100%)", "#3a2a12", "#b8892e"),
  j6: P("radial-gradient(circle at 50% 30%,#22305a 0%,#141c38 60%,#0b1024 100%)", "#f6efe0", "#d4a849"),
  j7: P("linear-gradient(170deg,#fff7f5,#fbe3e6)", "#3d2226", "#b0707a"), j8: P("#f1efec", "#1f1f1f", "#1f1f1f"), j9: P("linear-gradient(180deg,#1a1408 0%,#3a2b10 55%,#7a5a1c 100%)", "#fff6e0", "#e2b85a"),
  j10: P("repeating-conic-gradient(from 0deg at 50% 115%,#f4a259 0deg 8deg,#f7c873 8deg 16deg)", "#3b2412", "#8c3b1a"), j11: P("#fffdf9", "#2c2a35", "#7a6bb0"), j12: P("linear-gradient(180deg,#ffffff,#f3efe8)", "#22201c", "#9a7b3c"),
};
/** 2d · blahoželanie b1–b16 (Editor oznámení, BLOK C: b1–b12 = farby j1–j12, b13–b16 kytica, zlaté konfety, foto bok, kartička); head = nadpis šablóny */
export const BLAHOZELANIE: Record<string, Paleta> = {
  b1: P("linear-gradient(180deg,#fff7e8,#ffe9f0)", "#2b2b40", "#ff6b6b", "Všetko najlepšie"),
  b2: P("radial-gradient(circle at 50% 30%,#2a3f86 0%,#141d4a 60%,#0a0f2b 100%)", "#ffffff", "#ffd34d", "Hurá, narodeniny"),
  b3: P("#ffffff", "#1d1d2b", "#7a4cff", "Všetko najlepšie"),
  b4: P("#0b0716", "#ffffff", "#39ff88", "Všetko naj"),
  b5: P("radial-gradient(circle at 50% 35%,#fffaf0 0%,#f6ead0 55%,#e8d3a6 100%)", "#3a2a12", "#b8892e", "K životnému jubileu"),
  b6: P("radial-gradient(circle at 50% 30%,#22305a 0%,#141c38 60%,#0b1024 100%)", "#f6efe0", "#d4a849", "Srdečne blahoželáme"),
  b7: P("linear-gradient(170deg,#fff7f5,#fbe3e6)", "#3d2226", "#b0707a", "Všetko najlepšie"),
  b8: P("#f1efec", "#1f1f1f", "#1f1f1f"),
  b9: P("linear-gradient(180deg,#1a1408 0%,#3a2b10 55%,#7a5a1c 100%)", "#fff6e0", "#e2b85a", "Blahoželáme"),
  b10: P("repeating-conic-gradient(from 0deg at 50% 115%,#f4a259 0deg 8deg,#f7c873 8deg 16deg)", "#3b2412", "#8c3b1a", "Všetko najlepšie"),
  b11: P("#fffdf9", "#2c2a35", "#7a6bb0", "K životnému jubileu"),
  b12: P("linear-gradient(180deg,#ffffff,#f3efe8)", "#22201c", "#9a7b3c", "Blahoželáme"),
  b13: P("linear-gradient(170deg,#fffaf3,#fdeef0)", "#33222a", "#c2557a", "Všetko najlepšie"),
  b14: P("#ffffff", "#2e2414", "#b8892e", "Blahoželáme"),
  b15: P("#f4f1ea", "#25221e", "#a0522d", "Všetko najlepšie"),
  b16: P("repeating-linear-gradient(45deg,#d9c3a0 0 2px,#dcc7a5 2px 5px)", "#2e2216", "#7a4a1e", "Všetko najlepšie"),
};
/** predvolené farby tvarov z Nástenky (svadba zlatá, jubileum zelená, poďakovanie terakota) */
export const ZAKLAD = { svadba: P("#FBF3E2", "#3A3226", "#C9A24A"), jubileum: P("#E3EEDA", "#2F5E3A", "#4B7A35"), blaho: P("#F8E9DF", "#5E2F17", "#B5643C") };
/** vlastné nahraté parte (bez šablóny) = bordová z4 */
export const BORDOVA = PARTE.z4;

const SERIF = "'EB Garamond',Georgia,'Times New Roman',serif";
const ZLATY_RAM = "linear-gradient(160deg,#E3C77E,#A9822F 55%,#E3C77E)";

/** symbol podľa cirkvi z registrácie farnosti */
export const symbolCirkvi = (kod: string) => (kod === "PC" ? "☦" : kod === "ÚZŽNO" ? "✡" : "✝");

/** 1a · medailón Spomíname */
/** OPRAVY 300: malá značka v rohu hárku / medailónu — počet blahoželaní (sústrastí); moje = zelená s ✓; pri 0 nič. Tlačidlo je až v detaile. */
export function ZnackaReakcie({ n, ja, ikona = "srdce", popis, kraj = 8 }: { n: number; ja: boolean; ikona?: "srdce" | "obrucky"; popis: string; /** odsadenie od rohu (záporné = cez okraj) */ kraj?: number }) {
  if (!n) return null;
  const ik = ja ? <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>✓</span>
    : ikona === "obrucky" ? <svg width="16" height="12" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="8.5" cy="8" r="6" /><circle cx="15.5" cy="8" r="6" /></svg>
    : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z" /></svg>;
  return <span role="img" aria-label={`${popis}: ${n}${ja ? ", aj vy" : ""}`} style={{ position: "absolute", top: kraj, right: kraj, zIndex: 2, height: 28, minWidth: 28, padding: "0 8px", boxSizing: "border-box", borderRadius: 14, background: ja ? "#4B7A35" : "rgba(20,17,11,.82)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 800, pointerEvents: "none" }}>{ik}{n}</span>;
}

export function ParteMedailon({ pal, foto, symbol, meno, roky, rozlucka, zbierka, onTap, siva, znacka }: {
  pal: Paleta; foto?: string; symbol: string; meno: string; roky: string; rozlucka: string; zbierka: boolean; onTap: () => void;
  /** OPRAVY 302: v editore Čiernobielo — fotka aj v medailóne čiernobiela */ siva?: boolean; /** OPRAVY 300: značka sústrastí v rohu */ znacka?: ReactNode;
}) {
  return (
    <button type="button" onClick={onTap} aria-label={`${meno} · otvoriť parte${zbierka ? " a zbierku rodiny" : ""}`}
      style={{ width: 220, maxWidth: "100%", border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--nf-ink)", fontFamily: "inherit" }}>
      <span style={{ position: "relative", width: 200, height: 256, borderRadius: "50%", padding: 6, background: ZLATY_RAM, boxSizing: "border-box", display: "block" }}>
        {znacka}
        <span style={{ width: "100%", height: "100%", borderRadius: "50%", padding: foto ? 5 : 0, background: foto ? pal.bg : "transparent", boxSizing: "border-box", display: "block" }}>
          {foto ? <img src={foto} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block", filter: siva ? "grayscale(1)" : undefined }} />
            : <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: pal.bg, color: pal.fg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: SERIF, outline: `1px solid ${pal.ac}`, outlineOffset: -12, textAlign: "center", padding: "0 22px", boxSizing: "border-box" }}>
              <span style={{ fontSize: 34, lineHeight: 1 }}>{symbol}</span><i style={{ fontSize: 16 }}>{pal.head || "Smútočné oznámenie"}</i>
            </span>}
        </span>
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center", fontFamily: SERIF }}>
        <b style={{ fontSize: 23, fontWeight: 600, lineHeight: 1.15 }}>{meno}</b>
        {roky && <span style={{ fontSize: 15, color: "var(--nf-ink2)" }}>{roky}</span>}
        {rozlucka && <i style={{ fontSize: 14.5, color: "var(--nf-ink2)" }}>{rozlucka}</i>}
      </span>
      {zbierka && <span style={{ padding: "4px 10px", borderRadius: 8, background: "var(--nf-fSoft)", color: "var(--nf-fialova)", fontSize: 12, fontWeight: 800, letterSpacing: ".06em" }}>ZBIERKA RODINY</span>}
    </button>);
}

export type TvarDruhu = "kruh" | "kosostvorec" | "stvorec";

/** 1b · tvar Teš sa s nami — jeden komponent s parametrom tvaru */
export function TvarOznamu({ tvar, pal, children, onTap, pod, label }: { tvar: TvarDruhu; pal: Paleta; children: ReactNode; onTap: () => void; pod?: ReactNode; label: string }) {
  const vnutro: CSSProperties = { background: pal.bg, color: pal.fg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", boxSizing: "border-box" };
  const tvarEl = tvar === "kruh"
    ? <span style={{ width: 220, height: 220, borderRadius: "50%", border: `5px solid ${pal.ac}`, boxSizing: "border-box", padding: 6, display: "block" }}><span style={{ ...vnutro, width: "100%", height: "100%", borderRadius: "50%", gap: 2, fontFamily: SERIF, padding: "0 22px" }}>{children}</span></span>
    : tvar === "kosostvorec"
      ? <span style={{ width: 220, height: 220, clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)", background: pal.ac, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 196, height: 196, clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)", background: "#FBF8F1", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ ...vnutro, width: 180, height: 180, clipPath: "polygon(50% 0,100% 50%,50% 100%,0 50%)", padding: "0 34px" }}>{children}</span></span></span>
      : <span style={{ width: 200, height: 200, margin: "10px 0", borderRadius: 30, border: `5px solid ${pal.ac}`, boxSizing: "border-box", padding: 6, display: "block" }}><span style={{ ...vnutro, width: "100%", height: "100%", borderRadius: 20, gap: 6, padding: "0 14px" }}>{children}</span></span>;
  return (
    <span style={{ width: 230, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <button type="button" onClick={onTap} aria-label={label} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", fontFamily: "inherit" }}>{tvarEl}</button>
      {pod}
    </span>);
}

export const kickerTvaru = (c: string): CSSProperties => ({ fontSize: 11, fontWeight: 800, letterSpacing: ".18em", color: c, fontFamily: "'Plus Jakarta Sans',sans-serif" });
export const SERIF_TVARU = SERIF;
