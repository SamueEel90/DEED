/*
  ============================================================
  DEED Aura — dizajnový systém
  ============================================================
  Identita: "aurora" gradient (modrá → fialová → tyrkys),
  glass povrchy, tmavé dýchajúce pozadie, aura prstene.
  ============================================================
*/

// ---- PALETA (dark, studená polnočná modrá) ----
export const C = {
  bg: "#070A13",
  bg2: "#0B101D",
  surface: "rgba(255,255,255,.045)",
  surface2: "rgba(255,255,255,.07)",
  line: "rgba(255,255,255,.08)",
  line2: "rgba(255,255,255,.05)",
  text: "#F4F7FB",
  textSec: "#C4CCDB", // svetlejšie pre lepší kontrast (čitateľnosť pre všetky vekové kategórie)
  textTer: "#929CB1", // bývalo veľmi tmavé — zosvetlené, aby drobné popisky boli čitateľné
  blue: "#3E7BFA",
  blueL: "#74A6FF",
  green: "#1FBF8F",
  greenL: "#5CE6B8",
  red: "#F2706F",
  redBg: "rgba(242,112,111,.08)",
  purple: "#8B7CFF",
  gold: "#F0C75A",
  teal: "#43E0C8",
  orange: "#F0A85E",
};

// ---- AURORA GRADIENT — podpis značky ----
export const GRAD = "linear-gradient(135deg, #5B9BFF 0%, #8B7CFF 52%, #43E0C8 118%)";
export const GRAD_KUZEL = "conic-gradient(from 0deg, #5B9BFF, #8B7CFF, #43E0C8, #5B9BFF)";
export const GRAD_ZELENY = "linear-gradient(90deg, #1FBF8F, #5CE6B8)";

// gradientový text
export const gradText = {
  background: GRAD,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

// ---- GLASS POVRCH ----
export function glass(blur = 16, alpha = 0.05) {
  return {
    background: `rgba(255,255,255,${alpha})`,
    border: "1px solid rgba(255,255,255,.09)",
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
  };
}

// tmavý glass (sheety, dock, modaly — nad obsahom)
export function glassTmavy(blur = 22, alpha = 0.66) {
  return {
    background: `rgba(11,15,26,${alpha})`,
    border: "1px solid rgba(255,255,255,.09)",
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
  };
}

// ---- ZRNO (filmový noise cez SVG turbulenciu) ----
export const ZRNO = `url("data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// ---- PÁSMA SUMY (prvý nástrel, doladí sa) ----
export function pasmo(suma) {
  if (suma < 100) return { kod: "pod100", text: "Pod 100 € sa finančná žiadosť nepublikuje — skús Ľudskú pomoc alebo priamy dar.", blok: true };
  if (suma <= 500) return { kod: "100-500", text: "KYC + telefón. Dôkaz účelu voliteľný. Štart vo štvrti, dosah rastie s podporou.", blok: false };
  if (suma <= 1000) return { kod: "500-1000", text: "KYC + povinný dôkaz k účelu. Dosah mesto po doložení.", blok: false };
  if (suma <= 2400) return { kod: "1000-2400", text: "KYC + dôkaz + položkový rozpočet. Dosah región po overení.", blok: false };
  return { kod: "nad2400", text: "Prijatá suma nad 2400 €/rok podlieha dani z príjmu. Máš voľbu: zdaniť, alebo prebytok poslať ďalšiemu (reťaz dobra). Odporúčané cez Charitu.", blok: false };
}

// ---- FOTKY (Unsplash CDN + pravatar; všade fallback na emoji) ----
export const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=60`;
export const AV = (n) => `https://i.pravatar.cc/100?img=${n}`;

// ---- SPOLOČNÉ ŠTÝLY ----
export function inp(h) {
  return {
    width: "100%", padding: 15, borderRadius: 13,
    background: "rgba(255,255,255,.04)", border: `1px solid ${C.line}`,
    color: C.text, fontSize: 16, minHeight: h, fontFamily: "inherit", resize: "vertical",
    outline: "none", lineHeight: 1.5,
  };
}

export const infoBox = {
  background: "rgba(91,155,255,.07)", border: "1px solid rgba(91,155,255,.22)",
  borderRadius: 13, padding: "12px 14px", fontSize: 13.5, color: "#B4C9EA",
  lineHeight: 1.5, marginTop: 12,
};

export function btn(kind) {
  const base = {
    flex: 1, padding: "15px 0", borderRadius: 14, fontSize: 15.5, fontWeight: 700,
    cursor: "pointer", border: "none", fontFamily: "inherit",
    transition: "transform .12s ease, box-shadow .25s ease, opacity .2s ease",
  };
  if (kind === "primary") return { ...base, background: GRAD, color: "#fff", boxShadow: "0 8px 26px rgba(99,134,255,.32), inset 0 1px 0 rgba(255,255,255,.25)" };
  if (kind === "ghost") return { ...base, background: "rgba(255,255,255,.04)", color: C.textSec, border: `1px solid ${C.line}` };
  if (kind === "disabled") return { ...base, background: "rgba(255,255,255,.05)", color: C.textTer, cursor: "not-allowed" };
  return base;
}
