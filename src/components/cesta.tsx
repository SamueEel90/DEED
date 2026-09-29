// Tlačidlá cesty Späť — JEDEN vzhľad na každej stránke cesty (Martin 28. 9. 2026):
// „‹ Späť" vľavo hore (15 px, 700, zelená appky, bez kruhu a bez názvu stránky), krížik vpravo hore.
import { useT } from "@/i18n";
import type { ReactNode } from "react";

/** naFotke = Späť položené na fotke/videu: rovnaké písmo, veľkosť a farba, len na svetlej pilulke, aby bolo čitateľné */
export function SpatTlacidlo({ onClick, naFotke }: { onClick: () => void; naFotke?: boolean }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} aria-label={t("sp.spat")}
      style={{ display: "flex", alignItems: "center", gap: 4, height: naFotke ? 36 : 44, padding: naFotke ? "0 14px 0 8px" : "0 6px 0 0", border: "none",
        background: naFotke ? "rgba(var(--panel-rgb), .92)" : "transparent", borderRadius: naFotke ? 999 : 0, boxShadow: "none",
        cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "var(--a-green)", flex: "none" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      {t("sp.spat")}
    </button>
  );
}

export function ZavrietTlacidlo({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Zavrieť a späť na feed"
      style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(var(--glass-rgb), .12)", color: "var(--c-text)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flex: "none", boxShadow: "none" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>
  );
}

/** hlavička stránky v ceste (napr. stránka charity): Späť · stred · vpravo menu + krížik. Bez blur. */
export function CestaHlavicka({ onBack, onZavriet, children, right }: { onBack: () => void; onZavriet?: () => void; children?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--c-bg)", borderBottom: "1px solid rgba(var(--glass-rgb), .085)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 16px" }}>
        <SpatTlacidlo onClick={onBack} />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        {right}
        {onZavriet && <ZavrietTlacidlo onClick={onZavriet} />}
      </div>
    </div>
  );
}
