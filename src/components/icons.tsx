import type { ReactNode } from "react";

// ============================================================
// MODERNÉ IKONY — srdce (like) a šípka hore (upvote) — rovnaké všade
// ============================================================
export function Srdce({ size = 18, filled, color = "var(--a-danger)" }: { size?: number; filled?: boolean; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 auto" }}
      fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? 0 : 2.1} strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
export function SipHore({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 auto" }}
      fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V6M6.5 11.5L12 6l5.5 5.5" />
    </svg>
  );
}

// ---- jednotná sada moderných line-ikon (24×24, currentColor, okrúhle konce) ----
function SvgI({ size = 18, color = "currentColor", sw = 2, fill = "none", children }: { size?: number; color?: string; sw?: number; fill?: string; children?: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 auto" }}
      fill={fill} stroke={fill === "none" ? color : "none"} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
// palec hore (upvote)
export function Palec({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></SvgI>;
}
// lupa (hľadanie)
export function Lupa({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><circle cx="11" cy="11" r="7.5" /><path d="M21 21l-4.35-4.35" /></SvgI>;
}
// zvonček (upozornenia)
export function Zvon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></SvgI>;
}
// prehrať (talent)
export function IkonaPlay({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} fill={color}><path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z" /></SvgI>;
}
// nástenka (mriežka)
export function IkonaDoska({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /></SvgI>;
}
// plus (pridať)
export function IkonaPlus({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color} sw={2.4}><path d="M12 5v14M5 12h14" /></SvgI>;
}
// pin (lokalita)
export function IkonaPin({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="2.6" /></SvgI>;
}
// menu (hamburger)
export function IkonaMenu({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><path d="M3 6h18M3 12h18M3 18h18" /></SvgI>;
}
// zdieľať (tri prepojené uzly)
export function Zdielanie({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 3.98M15.4 6.5l-6.8 3.98" /></SvgI>;
}
// slnko (svetlý režim)
export function IkonaSlnko({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></SvgI>;
}
// mesiac (tmavý režim)
export function IkonaMesiac({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></SvgI>;
}

// ---- MODULOVÉ (navigačné) IKONY — jednotný line štýl pre dok + sheet ----
export function IkonaDomov({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></SvgI>;
}
export function IkonaSrdceLine({ size = 22, color = "currentColor" }: { size?: number; color?: string }) { // Help — srdce (outline)
  return <SvgI size={size} color={color}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z" /></SvgI>;
}
export function IkonaCharita({ size = 22, color = "currentColor" }: { size?: number; color?: string }) { // darček
  return <SvgI size={size} color={color}><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" /><path d="M2.5 8.5A1.5 1.5 0 0 1 4 7h16a1.5 1.5 0 0 1 1.5 1.5V11a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1z" /><path d="M12 7v14" /><path d="M12 7S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 7s1.5-4 4-4a2.5 2.5 0 0 1 0 5" /></SvgI>;
}
export function IkonaKompas({ size = 22, color = "currentColor" }: { size?: number; color?: string }) { // Aktivity — objav
  return <SvgI size={size} color={color}><circle cx="12" cy="12" r="9.5" /><path d="M15.8 8.2 13.9 13.9 8.2 15.8l1.9-5.7z" /></SvgI>;
}
export function IkonaMapa({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></SvgI>;
}
export function IkonaPohar({ size = 22, color = "currentColor" }: { size?: number; color?: string }) { // Top — trofej
  return <SvgI size={size} color={color}><path d="M6 4h12v5a6 6 0 0 1-12 0z" /><path d="M6 6H3.6A1.6 1.6 0 0 0 2 7.6 3.4 3.4 0 0 0 6 11M18 6h2.4A1.6 1.6 0 0 1 22 7.6 3.4 3.4 0 0 1 18 11" /><path d="M12 15v3M9.5 21h5M10 21c0-1.4.9-3 2-3s2 1.6 2 3" /></SvgI>;
}
export function IkonaOsoba({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  return <SvgI size={size} color={color}><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></SvgI>;
}
export function IkonaPanel({ size = 22, color = "currentColor" }: { size?: number; color?: string }) { // Admin — dashboard
  return <SvgI size={size} color={color}><rect x="3" y="3" width="8" height="9" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="12" width="8" height="9" rx="1.5" /><rect x="3" y="16" width="8" height="5" rx="1.5" /></SvgI>;
}

// ---- CHROME / AKČNÉ IKONY ----
export function IkonaSpat({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // späť (šípka vľavo)
  return <SvgI size={size} color={color}><path d="M19 12H5M11 18l-6-6 6-6" /></SvgI>;
}
export function IkonaSipVlavo({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // chevron vľavo
  return <SvgI size={size} color={color} sw={2.2}><path d="M15 18l-6-6 6-6" /></SvgI>;
}
export function IkonaSipVpravo({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // chevron vpravo
  return <SvgI size={size} color={color} sw={2.2}><path d="M9 18l6-6-6-6" /></SvgI>;
}
export function IkonaSipDole({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // chevron dole
  return <SvgI size={size} color={color} sw={2.2}><path d="M6 9l6 6 6-6" /></SvgI>;
}
export function IkonaKriz({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // zavrieť
  return <SvgI size={size} color={color} sw={2.2}><path d="M18 6 6 18M6 6l12 12" /></SvgI>;
}
export function IkonaMoznosti({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // ⋯ možnosti
  return <SvgI size={size} fill={color}><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></SvgI>;
}
export function IkonaNastavenia({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // nastavenia
  return <SvgI size={size} color={color}><path d="M20 7h-9M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></SvgI>;
}
export function IkonaVlajka({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // nahlásiť
  return <SvgI size={size} color={color}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></SvgI>;
}
export function IkonaUlozit({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // záložka
  return <SvgI size={size} color={color}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></SvgI>;
}
export function IkonaFajka({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // ✓
  return <SvgI size={size} color={color} sw={2.3}><path d="M20 6 9 17l-5-5" /></SvgI>;
}
export function IkonaOpakovat({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // pravidelná podpora
  return <SvgI size={size} color={color}><path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></SvgI>;
}
export function IkonaFoto({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // foto z prípadu
  return <SvgI size={size} color={color}><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18z" /><circle cx="12" cy="12.5" r="3.2" /></SvgI>;
}
export function IkonaPenazenka({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // peňaženka
  return <SvgI size={size} color={color}><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M16 14.5h2" /></SvgI>;
}
// ---- AUTH / FORMULÁROVÉ IKONY ----
export function IkonaObalka({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // email
  return <SvgI size={size} color={color}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></SvgI>;
}
export function IkonaZamok({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // heslo
  return <SvgI size={size} color={color}><rect x="4" y="10.5" width="16" height="10.5" rx="2.4" /><path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" /><circle cx="12" cy="15.5" r="1.4" fill={color} stroke="none" /></SvgI>;
}
export function IkonaOko({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // ukáž heslo
  return <SvgI size={size} color={color}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></SvgI>;
}
export function IkonaOkoOff({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // skry heslo
  return <SvgI size={size} color={color}><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.9M6.1 7.8A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 3.9-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><path d="M3 3l18 18" /></SvgI>;
}

// ---- REBRÍČKOVÉ (award) IKONY ----
export function IkonaStit({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // partner
  return <SvgI size={size} color={color}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></SvgI>;
}
export function IkonaKorunka({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // darca
  return <SvgI size={size} color={color}><path d="M3 8l4 5 5-8 5 8 4-5-2 12H5z" /></SvgI>;
}
export function IkonaHviezda({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // hrdina / top
  return <SvgI size={size} color={color}><path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.6 19.6l1-6L3.3 9.4l6-.9z" /></SvgI>;
}
export function IkonaUsmev({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // fun
  return <SvgI size={size} color={color}><circle cx="12" cy="12" r="9.5" /><path d="M8.5 14a4 4 0 0 0 7 0" /><path d="M9 9.5h.01M15 9.5h.01" /></SvgI>;
}
export function IkonaInstitucia({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // charita & OZ (adresár)
  return <SvgI size={size} color={color}><path d="M3 10 12 4l9 6" /><path d="M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18" /></SvgI>;
}

// ---- ENTITY / SPRÁVA (profily subjektov, správcovské panely) ----
export function IkonaKalendar({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // kalendár & rozvrh
  return <SvgI size={size} color={color}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></SvgI>;
}
export function IkonaQr({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // QR kód
  return <SvgI size={size} color={color}><rect x="3" y="3" width="7" height="7" rx="1.2" /><rect x="14" y="3" width="7" height="7" rx="1.2" /><rect x="3" y="14" width="7" height="7" rx="1.2" /><path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M18 18h3v3" /></SvgI>;
}
export function IkonaGraf({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // štatistiky / reporty
  return <SvgI size={size} color={color}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></SvgI>;
}
export function IkonaLudia({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // skupina ľudí
  return <SvgI size={size} color={color}><circle cx="9" cy="8" r="3.4" /><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" /><path d="M16.2 5.2a3.4 3.4 0 0 1 0 5.9" /><path d="M17.6 14.4a6.2 6.2 0 0 1 3.9 5.6" /></SvgI>;
}
export function IkonaMegafon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // oznamy
  return <SvgI size={size} color={color}><path d="M3 11v3a1.5 1.5 0 0 0 1.5 1.5H6l4.5 4V6.5L6 10.5H4.5A1.5 1.5 0 0 0 3 12z" /><path d="M14 8.5a5 5 0 0 1 0 7M17 5.5a9 9 0 0 1 0 13" /></SvgI>;
}
export function IkonaDokument({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // doklady / dokumenty
  return <SvgI size={size} color={color}><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5M9 13h6M9 17h6M9 9h2" /></SvgI>;
}
export function IkonaRetaz({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // reťaz tvorcu
  return <SvgI size={size} color={color}><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.1" /></SvgI>;
}
export function IkonaTerc({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // zbierky / ciele
  return <SvgI size={size} color={color}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill={color} stroke="none" /></SvgI>;
}
export function IkonaEuro({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // financie / dary
  return <SvgI size={size} color={color}><path d="M17.5 5.5A7.5 7.5 0 0 0 6.8 8.4a7.6 7.6 0 0 0 0 7.2 7.5 7.5 0 0 0 10.7 2.9" /><path d="M3.5 10.5h9M3.5 13.5h8" /></SvgI>;
}
export function IkonaOdkaz({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // kopírovať odkaz
  return <SvgI size={size} color={color}><path d="M10.5 13.5a4 4 0 0 0 6 .4l2.3-2.3a4 4 0 1 0-5.7-5.7l-1.3 1.3" /><path d="M13.5 10.5a4 4 0 0 0-6-.4l-2.3 2.3a4 4 0 1 0 5.7 5.7l1.3-1.3" /></SvgI>;
}
export function IkonaHodiny({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // čas / smeny
  return <SvgI size={size} color={color}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 1.8" /></SvgI>;
}
export function IkonaDarcek({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // odmeny / benefity
  return <SvgI size={size} color={color}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20v-8M12 8v13.5" /><path d="M12 8s-4.5.2-4.5-2.5C7.5 3.6 10.5 3.4 12 8zM12 8s4.5.2 4.5-2.5C16.5 3.6 13.5 3.4 12 8z" /></SvgI>;
}
export function IkonaCeruzka({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // upraviť
  return <SvgI size={size} color={color}><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></SvgI>;
}
// ---- OBLASTI ZÁUJMOV (profil, pozvánky) ----
export function IkonaList({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // príroda (lístok)
  return <SvgI size={size} color={color}><path d="M5 20c0-8 5-14 14-15-1 9-7 14-14 15z" /><path d="M5 20c3-6 7-10 11-12" /></SvgI>;
}
export function IkonaKniha({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // učenie
  return <SvgI size={size} color={color}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /></SvgI>;
}
export function IkonaSport({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // šport (činka)
  return <SvgI size={size} color={color}><path d="M7.5 7.5v9M16.5 7.5v9M4 9.5v5M20 9.5v5M7.5 12h9M2 12h2M20 12h2" /></SvgI>;
}
export function IkonaPaleta({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // umenie
  return <SvgI size={size} color={color}><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 1.4-3.4c-.8-.8-.3-2.1.8-2.1H18a4 4 0 0 0 4-4c0-4.7-4.5-8.5-10-8.5z" /><circle cx="7.5" cy="10.5" r="1" fill={color} stroke="none" /><circle cx="12" cy="7.5" r="1" fill={color} stroke="none" /><circle cx="16.5" cy="10" r="1" fill={color} stroke="none" /></SvgI>;
}
export function IkonaZachrana({ size = 18, color = "currentColor" }: { size?: number; color?: string }) { // pomoc (záchranné koleso)
  return <SvgI size={size} color={color}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.6" /><path d="M5.7 5.7l3.7 3.7M18.3 5.7l-3.7 3.7M18.3 18.3l-3.7-3.7M5.7 18.3l3.7-3.7" /></SvgI>;
}
export function IkonaOdznakOver({ size = 18, color = "var(--a-info)" }: { size?: number; color?: string }) { // overený subjekt (seal + fajka)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 auto" }} aria-hidden>
      <path d="M12 1.8l2.4 1.9 3-.4 1.2 2.8 2.8 1.2-.4 3 1.9 2.4-1.9 2.4.4 3-2.8 1.2-1.2 2.8-3-.4-2.4 1.9-2.4-1.9-3 .4-1.2-2.8-2.8-1.2.4-3L1 12.7l1.9-2.4-.4-3 2.8-1.2 1.2-2.8 3 .4z" fill={color} />
      <path d="M8.4 12.3l2.5 2.5 4.7-5" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---- Emoji z dát (mock, DB) → čiarová ikona. V UI sa emoji nezobrazujú (OPRAVY 35).
// Ikona má veľkosť 1em, takže preberá font-size miesta, kde predtým stálo emoji.
const EMO_CESTY: [RegExp, string][] = [
  // KARTA 40: oznamy bez emoji — kľúč „oznam" = megafón
  [/^oznam$/, "M3 11v3a1.5 1.5 0 0 0 1.5 1.5H6l4.5 4V6.5L6 10.5H4.5A1.5 1.5 0 0 0 3 12zM14 8.5a5 5 0 0 1 0 7M17 5.5a9 9 0 0 1 0 13"],
  [/⛓|🔗/u, "M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.1"],
  [/♻/u, "M4 12a8 8 0 0 1 14-5.3M20 4v5h-5M20 12a8 8 0 0 1-14 5.3M4 20v-5h5"],
  [/🛡/u, "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  [/✅|✓|✔/u, "M20 6 9 17l-5-5"],
  [/✨|⭐|🌟|★/u, "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z"],
  [/🎬|🎥|▶|📹/u, "M8 5v14l11-7z"],
  [/🗓|📅|🎟|⛪|⛰|🏃|🚶|📆/u, "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"],
  [/🏠|🏡|🏘/u, "M3 11l9-8 9 8M5 10v10h14V10"],
  [/📚|📖|🎓|✏/u, "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"],
  [/🎨|🎭|🎵|🎶|🎸/u, "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.3-1-1.6-1-2.9 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"],
  [/🔥|🚨|🆘|⚠/u, "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
  [/📷|📸|🖼/u, "M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  [/🏛|🏢|🏦|🏥|🏫/u, "M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-7 10 7"],
  [/👥|👤|🙋|🤝|👪/u, "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9"],
  [/🎁|📦|🎒|🧺/u, "M20 12v9H4v-9M2 7h20v5H2zM12 22V7"],
  [/🍲|🍞|🥫|🍎|☕/u, "M4 11h16a8 8 0 0 1-16 0zM8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5"],
  [/🌳|🌱|🌿|🌼|🐾|🐕|🐶|🐱/u, "M12 22V12M12 12C7 12 5 8 5 4c4 0 7 2 7 8zM12 12c5 0 7-4 7-8-4 0-7 2-7 8z"],
  [/🩺|💊|❤️‍🩹|🧑‍⚕️/u, "M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9zM9 12h6M12 9v6"],
  [/🚀/u, "M5 19l3-3M14 4l6 6-8 8-6-6zM14 4c2-1 5-1 6 0 1 1 1 4 0 6"],
  [/💶|💰|💵|€/u, "M17 6a7 7 0 1 0 0 12M4 10h9M4 14h9"],
];
const EMO_SRDCE = "M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z";
/** emoji (reťazec) → čiarová ikona 1em; iný ReactNode (už ikona) prejde bez zmeny */
export function Emo({ e }: { e?: ReactNode }) {
  if (e == null || e === "") return null;
  if (typeof e !== "string") return <>{e}</>;
  const d = EMO_CESTY.find(([r]) => r.test(e))?.[1] ?? EMO_SRDCE;
  return <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-0.125em", flex: "none" }}><path d={d} /></svg>;
}
