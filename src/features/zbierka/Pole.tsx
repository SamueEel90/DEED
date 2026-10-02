// KARTA 03 · Pole „Za zbierku zodpovedá" / „Zbierku overil" — rozbaľuje sa na mieste.
// Overovateľ zbierku len OVERIL — nikde „ručí" ani „garantuje". Pri mene žiadna fajka, status ukazuje štít.
import type { OrgData } from "@/features/cudzi-profil/orgy";
import { StityRad } from "@/components/stit";
import { stityOblastiSubjektu } from "@/lib/stityOblasti";

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
    // OPRAVY 128: rámik pri focuse (klávesnica) okolo celej karty, nie len hornej časti (index.css · .zb-pole-org)
    <div className="zb-pole-org" style={{ margin: "0 0 12px", borderRadius: 18, background: "var(--card)", border: `1px solid ${otvorene ? "var(--gBd)" : "var(--cardBd)"}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", paddingRight: 6 }}>
      <button type="button" onClick={(e) => { if (e.detail > 0) e.currentTarget.blur(); onPrepni(); }} aria-expanded={otvorene}
        style={{ flex: 1, minWidth: 0, minHeight: 62, display: "flex", alignItems: "center", gap: 12, padding: "12px 8px 12px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
        {org.obrazok
          ? <span style={{ width: 44, height: 44, borderRadius: 12, flex: "none", background: `url(${org.obrazok}) center/cover no-repeat` }} />
          : <span style={{ width: 44, height: 44, borderRadius: 12, flex: "none", background: "var(--gSoft)", color: "var(--gInk)", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{iniciala(org.meno)}</span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".07em", color: "var(--ink3)" }}>{nadpis.toUpperCase()}</span>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.meno}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{typLabel} · {org.mesto}</span>
        </span>
      </button>
        {/* OPRAVY 53: hlavný štít + najviac 3 vyvesené štíty oblastí + „+N"; ťuk na štít = zväčšenie */}
        <StityRad variant="pole" hlavny={org.stit} oblasti={stityOblastiSubjektu(org.meno, org.stit)} meno={org.meno} velkost={38} />
        {/* šípka bez kruhu (Martin zrušil šípky v kruhu) */}
        <button type="button" onClick={onPrepni} tabIndex={-1} aria-hidden="true" style={{ flex: "none", width: 36, height: 44, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flex: "none", transform: `rotate(${otvorene ? 180 : 0}deg)`, transition: "transform .3s ease" }}><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
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
              style={{ marginTop: 4, minHeight: 44, display: "flex", alignItems: "center", padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--green)" }}>
              {org.typ === "charita" ? "Stránka organizácie ›" : "Otvoriť stránku overovateľa ›"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
