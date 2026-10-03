// KARTA 03 · Pole „Za zbierku zodpovedá" / „Zbierku overil" — rozbaľuje sa na mieste.
// Overovateľ zbierku len OVERIL — nikde „ručí" ani „garantuje". Pri mene žiadna fajka, status ukazuje štít.
// Len JEDEN štít na riadok (hlavný DEED+ CARE). Štíty oblastí sú len na verejnom profile — ťuk na štít alebo šípku ho otvorí.
// Overovateľ a ďalšie charity (split dar) majú vlastný riadok, každý so svojím hlavným štítom.
import { useState } from "react";
import type { OrgData } from "@/features/cudzi-profil/orgy";
import { StitObr } from "@/components/stit";

export type StitUroven = "Bronze" | "Silver" | "Gold" | "Platinum" | "Legend";
export type OrgPole = {
  meno: string;
  typ: "charita" | "overovatel";
  /** vlastná stránka riadku (split dar · overovateľ); bez nej sa použije onOtvorStranku */
  onStranka?: () => void;
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

export function PoleOrganizacie({ org, dalsie = [], nadpis, otvorene, onPrepni, onOtvorStranku }: {
  org: OrgPole; nadpis: string; otvorene: boolean; onPrepni: () => void; onOtvorStranku?: () => void;
  /** ďalšie riadky pod hlavnou organizáciou: overovateľ, pri split dare ostatné charity */
  dalsie?: OrgPole[];
}) {
  // riadky pod hlavným sa rozbaľujú samy (hlavný riadi ZbierkaModul)
  const [otvDalsie, setOtvDalsie] = useState<number | null>(null);
  return (
    // OPRAVY 128: rámik pri focuse (klávesnica) okolo celej karty, nie len hornej časti (index.css · .zb-pole-org)
    <div className="zb-pole-org" style={{ margin: "0 0 12px", borderRadius: 18, background: "var(--card)", border: `1px solid ${otvorene ? "var(--gBd)" : "var(--cardBd)"}`, overflow: "hidden" }}>
      <Riadok org={org} nadpis={nadpis} otvorene={otvorene} onPrepni={onPrepni} onOtvorStranku={onOtvorStranku} />
      {/* ďalšie riadky bez nadpisu — ten patrí celej karte; rolu nesie riadok pod menom */}
      {dalsie.map((d, i) => (
        <Riadok key={`${d.meno}-${i}`} org={d} ciara
          otvorene={otvDalsie === i} onPrepni={() => setOtvDalsie(otvDalsie === i ? null : i)} onOtvorStranku={d.onStranka} />
      ))}
    </div>
  );
}

function Riadok({ org, nadpis, otvorene, onPrepni, onOtvorStranku, ciara }: {
  org: OrgPole; nadpis?: string; otvorene: boolean; onPrepni: () => void; onOtvorStranku?: () => void; ciara?: boolean;
}) {
  // „Charita · Trenčín · centrum" v jednom riadku; overovateľ má rolu „Overuje"
  const podMenom = org.typ === "charita" ? `Charita · ${org.mesto}` : "Overuje";
  const naProfil = onOtvorStranku ?? onPrepni;
  return (<>
      <div style={{ display: "flex", alignItems: "center", paddingRight: 6, borderTop: ciara ? "1px solid var(--cardBd)" : "none" }}>
      <button type="button" onClick={(e) => { if (e.detail > 0) e.currentTarget.blur(); onPrepni(); }} aria-expanded={otvorene}
        style={{ flex: 1, minWidth: 0, minHeight: 62, display: "flex", alignItems: "center", gap: 12, padding: "12px 8px 12px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
        {org.obrazok
          ? <span style={{ width: 44, height: 44, borderRadius: 12, flex: "none", background: `url(${org.obrazok}) center/cover no-repeat` }} />
          : <span style={{ width: 44, height: 44, borderRadius: 12, flex: "none", background: "var(--gSoft)", color: "var(--gInk)", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{iniciala(org.meno)}</span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          {nadpis && <span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".07em", color: "var(--ink3)" }}>{nadpis.toUpperCase()}</span>}
          {/* meno celé, najviac 2 riadky (uvoľnilo sa miesto po štítoch oblastí) */}
          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{org.meno}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{podMenom}</span>
        </span>
      </button>
        {/* len hlavný štít; ťuk otvorí profil, kde sú všetky štíty organizácie */}
        <button type="button" onClick={naProfil} aria-label={`Profil: ${org.meno}`} style={{ flex: "none", minWidth: 44, minHeight: 44, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <StitObr level={org.stit} h={38} />
        </button>
        {/* šípka vedie na profil organizácie (rozbalenie je na riadku s menom) */}
        <button type="button" onClick={naProfil} tabIndex={-1} aria-hidden="true" style={{ flex: "none", width: 36, height: 44, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><path d="m9 6 6 6-6 6" /></svg>
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
  </>);
}
