// ============================================================
// OPRAVY 290 · balík 8 (A) — strana zmluvy Reťaze dobra: kto reťaz robí a organizátori zbierok v rade.
// Karta ako na profile: kruh s iniciálami / fotka (firma a tvorca logo) · meno · mesto · overenie · hlavný štít vpravo.
// Štít sa ťahá z profilu strany: osoba / Help / tvorca / farnosť = hlavný štít DEED, charita = DEED Care, firma = DEED Partner.
// ============================================================
import type { CSSProperties } from "react";
import { StitObr, naStitLevel } from "@/components/stit";
import { StitCare } from "@/features/verejny-profil/casti";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useMojeStranky, UKAZKOVE_STRANKY } from "@/lib/mojeStranky";
import { najdiTestProfil } from "@/lib/testProfily";
import { useAutorZaMna } from "@/lib/autorFarnosti";
import { inicialy, type Strana } from "@/lib/retaz";

/** hlavný štít strany podľa toho, čo je zač */
export function StitStrany({ s, h = 40 }: { s: Strana; h?: number }) {
  const w = Math.round(h * 0.82);
  // OPRAVY 319: organizátor bez známeho štítu (napr. Hlavná zbierka farnosti) — bez štítu, nikdy pád okna
  if (!s.stit && (s.druh === "charita" || s.druh === "firma")) return null;
  if (s.druh === "charita") return <StitCare stit={s.stit} w={w} h={h} tien="none" />;
  if (s.druh === "firma") return <StitCare stit={s.stit} w={w} h={h} tien="none" firma />;
  return <StitObr level={naStitLevel(s.stit)} h={h} />;
}

/** kruh (osoba, farnosť) alebo zaoblený štvorec (organizácia, firma, tvorca) s fotkou / logom, inak iniciály */
export function ZnakStrany({ s, size = 48 }: { s: Strana; size?: number }) {
  const kruh = s.druh === "osoba" || s.druh === "help" || s.druh === "farnost";
  const st: CSSProperties = { width: size, height: size, flex: "none", borderRadius: kruh ? "50%" : Math.round(size * 0.26), overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.34), fontWeight: 800,
    background: s.foto ? `center/cover no-repeat url('${s.foto}')` : kruh ? "var(--gSoft)" : "var(--field)", color: "var(--gInk)",
    border: kruh ? "2.5px solid var(--gold, #C9A24A)" : "1px solid var(--cardBd)" };
  return <span aria-hidden="true" style={st}>{s.foto ? "" : s.iniciala}</span>;
}

/** karta strany: znak · meno · mesto a overenie (alebo riadok pod menom) · štít vpravo */
export function KartaStrany({ s, styl, onClick }: { s: Strana; styl?: CSSProperties; /** OPRAVY 316: ťuk = profil (so šípkou ›) */ onClick?: () => void }) {
  const pod = s.pod ?? [s.mesto, s.overeny ? "overený pri registrácii" : ""].filter(Boolean).join(" · ");
  const st: CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", ...styl };
  if (onClick) return (
    <button type="button" onClick={onClick} aria-label={`${s.meno} · profil`} style={{ ...st, width: "100%", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
      <ZnakStrany s={s} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block", fontSize: 15.5, lineHeight: 1.3 }}>{s.meno}</b>
        {pod && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>{pod}</span>}
      </span>
      <span style={{ flex: "none", lineHeight: 0 }}><StitStrany s={s} /></span>
      <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>
    </button>);
  return (
    <div style={st}>
      <ZnakStrany s={s} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: "block", fontSize: 15.5, lineHeight: 1.3 }}>{s.meno}</b>
        {pod && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>{pod}</span>}
      </span>
      <span style={{ flex: "none", lineHeight: 0 }}><StitStrany s={s} /></span>
    </div>);
}

/** kto reťaz robí — podľa Konáš ako: ja (môj profil) alebo stránka (charita, firma, tvorca, farnosť).
 *  Pri farnosti farár z Ľudí s titulmi (bod 276), nikdy „správca stránky“. */
export function useRobiRetaz(): Strana {
  const ja = usePouzivatel();
  const { ako } = useMojeStranky();
  const autor = useAutorZaMna(ako === "ja" ? "farnost" : ako);
  const st = ako !== "ja" ? UKAZKOVE_STRANKY.find((x) => x.k === ako) : undefined;
  const p = st ? najdiTestProfil(st.k) : undefined;
  if (st && p) {
    const druh = st.typ;
    const mesto = typeof p.mesto === "string" ? p.mesto : undefined;
    if (druh === "farnost" && autor) return { druh, meno: autor.meno, iniciala: inicialy(autor.meno), foto: autor.foto, stit: p.stit, pod: `${autor.rola} · ${p.meno}` };
    return { druh, meno: p.meno, iniciala: p.iniciala, mesto, overeny: true, stit: p.stit };
  }
  const meno = ja.celeMeno?.trim() || [ja.meno, ja.priezvisko].filter(Boolean).join(" ") || "Vy";
  return { druh: "osoba", meno, iniciala: inicialy(meno), foto: ja.foto ?? undefined, mesto: ja.mesto || undefined, overeny: ja.typ !== "pasivny", stit: (ja.tier ?? "").split(" · ")[0] || "Bronze" };
}
