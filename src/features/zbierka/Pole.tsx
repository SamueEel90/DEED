// KARTA 03 · Pole „Za zbierku zodpovedá" / „Zbierku overil" — rozbaľuje sa na mieste.
// Overovateľ zbierku len OVERIL — nikde „ručí" ani „garantuje". Pri mene žiadna fajka, status ukazuje štít.
import type { OrgData } from "@/features/cudzi-profil/orgy";

export type StitUroven = "Bronze" | "Silver" | "Gold" | "Platinum" | "Legend";
export type OrgPole = {
  meno: string;
  typ: "charita" | "overovatel";
  mesto: string;
  obrazok?: string;            // foto → inak logo (z profilu); bez neho iniciála
  veta?: string;               // 1 veta o organizácii (z profilu)
  cisla: [string, string][];   // [hodnota, popis] — napr. ["24 600 €", "vyzbierané"]
  stit: StitUroven;
};

const SUBOR: Record<StitUroven, string> = { Bronze: "bronze", Silver: "silver", Gold: "gold", Platinum: "platinum", Legend: "legend" };
const NAZOV_STITU: Record<StitUroven, string> = { Bronze: "Bronzový", Silver: "Strieborný", Gold: "Zlatý", Platinum: "Platinový", Legend: "Legenda" };
const iniciala = (m: string) => m.replace(/^(OZ|o\.z\.)\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const prvaVeta = (t: string) => (t.match(/^.*?[.!?](\s|$)/)?.[0] ?? t).trim();

/** profil organizácie (feed Charity / cudzí profil) → dáta poľa */
export function poleZOrg(o: OrgData, typ: OrgPole["typ"] = "charita"): OrgPole {
  return {
    meno: o.meno, typ, mesto: o.lok, obrazok: o.logo, veta: prvaVeta(o.onas),
    cisla: typ === "charita" ? [[o.stat.vyzbierane, "vyzbierané"], [o.stat.skutky, "skutkov"], [o.stat.snami, "s nami"]] : [],
    stit: o.level,
  };
}

export function PoleOrganizacie({ org, nadpis, otvorene, onPrepni, onOtvorStranku }: {
  org: OrgPole; nadpis: string; otvorene: boolean; onPrepni: () => void; onOtvorStranku?: () => void;
}) {
  const typLabel = org.typ === "charita" ? "Charita" : "Overovateľ";
  return (
    <div style={{ margin: "0 0 12px", borderRadius: 18, background: "var(--card)", border: `1px solid ${otvorene ? "var(--gBd)" : "var(--cardBd)"}`, overflow: "hidden" }}>
      <button type="button" onClick={onPrepni} aria-expanded={otvorene}
        style={{ width: "100%", minHeight: 62, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
        {org.obrazok
          ? <span style={{ width: 44, height: 44, borderRadius: 12, flex: "none", background: `url(${org.obrazok}) center/cover no-repeat` }} />
          : <span style={{ width: 44, height: 44, borderRadius: 12, flex: "none", background: "var(--gSoft)", color: "var(--gInk)", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{iniciala(org.meno)}</span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".07em", color: "var(--ink3)" }}>{nadpis.toUpperCase()}</span>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.meno}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{typLabel} · {org.mesto}</span>
        </span>
        <img src={`/odznaky/${SUBOR[org.stit]}.png`} alt={NAZOV_STITU[org.stit]} width={34} height={40} style={{ objectFit: "contain", flex: "none" }} />
        <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: `rotate(${otvorene ? 180 : 0}deg)`, transition: "transform .3s ease" }}><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>
      {otvorene && (
        <div style={{ borderTop: "1px solid var(--cardBd)", padding: "12px 14px 14px", fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.5, animation: "zbFsIn .2s ease both" }}>
          {org.veta && <div>{org.veta}</div>}
          {org.cisla.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12.5 }}>
              {org.cisla.map(([h, l], i) => <span key={i}>{i > 0 && " · "}<b style={{ color: "var(--ink)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{h}</b> {l}</span>)}
            </div>
          )}
          {onOtvorStranku && (
            <button type="button" onClick={onOtvorStranku}
              style={{ marginTop: 10, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--blue)" }}>
              {org.typ === "charita" ? "Otvoriť stránku charity ›" : "Otvoriť stránku overovateľa ›"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
