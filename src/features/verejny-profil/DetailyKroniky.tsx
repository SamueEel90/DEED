// Doplnky 4. 10. (karta 45 · 5b) · detaily z kroniky (Kronika, História vo Výklade, roky) — len na čítanie, BEZ platobného modulu
// (modul je len v Aktuálne). Ťuk na skutok = detail skutku ako vo feede (fotka, text, kto pomáhal, Páči sa mi, Zdieľať).
// Ťuk na ukončenú zbierku = Zbierka skončila, Splnili sme, správa a doklady, darcovia. Návrh obrazoviek zatiaľ nie je.
import { ZbalitASpat } from "@/features/zbierka/ZmensenyModul";
import { useState, type CSSProperties } from "react";
import type { TestProfil, TestZbierka } from "@/lib/testProfily";
import { eur } from "@/lib/testProfily";
import { toast } from "@/shared";
import { Darcovia } from "@/features/zbierka/Riadky";
import { DeedDetail } from "@/features/aktivity/Aktivity";
import { PRUH, type PolCh } from "./charitaCasti";

const sekcia: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: 6 };
const karta: CSSProperties = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 14px" };

function Obal({ pc, onBack, children }: { pc: boolean; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg)", color: "var(--ink)", WebkitOverflowScrolling: "touch" } as CSSProperties}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: pc ? "24px 32px 80px" : "max(14px, env(safe-area-inset-top)) 16px 140px", display: "flex", flexDirection: "column", gap: 14 }}>
        <button type="button" onClick={onBack} aria-label="Späť" style={{ alignSelf: "flex-start", height: 44, padding: "0 14px 0 8px", border: "1px solid var(--cardBd)", borderRadius: 14, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14.5, fontWeight: 800, color: "var(--ink)", boxShadow: "none", fontFamily: "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť
        </button>
        {children}
        <ZbalitASpat onClick={onBack} />{/* bod 149 */}
      </div>
    </div>
  );
}
const Foto = ({ src }: { src: string }) => <span style={{ display: "block", width: "100%", aspectRatio: "16/9", borderRadius: 22, background: `url('${src}') center/cover no-repeat #3a3530` }} />;
const datum = (p: PolCh) => `${p.d} ${p.m.toLocaleLowerCase("sk-SK")} ${p.rok}`;

/** detail skutku (aj minulej akcie) z kroniky = ten istý DeedDetail ako vo feede Aktivít, staré roky bez podpory */
export function DetailSkutku({ profil, p, onBack }: { pc: boolean; profil: TestProfil; p: PolCh; onBack: () => void }) {
  const sk = profil.skutky.find((s) => s.id === p.id);
  const [hlasy, setHlasy] = useState<Record<number, string>>({});
  const num = Math.abs([...p.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7)) % 100000;
  const it = {
    id: num, num, dom: "zdravie", type: "skutok", emoji: "", verified: true, likes: 0,
    author: profil.meno, ini: profil.iniciala, pfp: "#4B7A35",
    loc: `${sk?.mesto ?? profil.mesto} · ${datum(p)}`,
    title: p.nazov, desc: sk?.popis ?? p.s, fotky: [p.foto],
    pomahali: sk?.dobrovolnici ? `${profil.meno} · ${sk.dobrovolnici} dobrovoľníkov` : profil.meno,
    split: sk?.split,
  };
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--c-bg)", WebkitOverflowScrolling: "touch" } as CSSProperties}>
      <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 120 }}>
        <DeedDetail it={it} bezPodpory support={() => {}} votes={hlasy} vote={(id: number, v: string) => setHlasy((h) => ({ ...h, [id]: v }))}
          toast={toast} home={onBack} openPerson={() => {}} />
      </div>
    </div>
  );
}

/** detail ukončenej zbierky z kroniky — bez platby */
export function DetailUkoncenej({ pc, profil, p, onBack }: { pc: boolean; profil: TestProfil; p: PolCh; onBack: () => void }) {
  // záznam kroniky nemusí mať celú zbierku (staršie roky) — vtedy sa ukáže to, čo je v riadku kroniky
  const z: TestZbierka = p.zbierka ?? { id: p.id, nazov: p.nazov, popis: "", mesto: profil.mesto, foto: p.foto, vyzbierane: 0, ludia: 0, stav: "ukoncena", spravaDarcom: p.q, doklady: p.dok ? parseInt(p.dok, 10) || undefined : undefined };
  const kedy = z.skoncila ?? datum(p);
  return (
    <Obal pc={pc} onBack={onBack}>
      <Foto src={z.foto} />
      <span style={{ alignSelf: "flex-start", height: 28, padding: "0 12px", borderRadius: 14, background: "var(--btn)", color: "var(--ink2)", fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>ZBIERKA SKONČILA{kedy ? ` · ${kedy.toLocaleUpperCase("sk-SK")}` : ""}</span>
      <b style={{ fontSize: pc ? 30 : 24, lineHeight: 1.15 }}>{z.nazov}</b>
      {z.popis && <span style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--ink2)" }}>{z.popis}</span>}
      {!p.zbierka && <span style={{ fontSize: 15, color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>{p.s}</span>}
      {p.zbierka && z.ciel != null && <span style={{ display: "block", height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, z.vyzbierane / z.ciel)})` }} /></span>}
      {p.zbierka && <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums", flexWrap: "wrap" }}><b style={{ fontSize: 21 }}>{eur(z.vyzbierane)}</b><span style={{ fontSize: 14, color: "var(--ink3)" }}>{z.ciel ? `z ${eur(z.ciel)} · ` : ""}od {z.ludia} darcov</span></span>}
      <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Za zbierku zodpovedá <b style={{ color: "var(--ink)" }}>{z.zodpoveda ?? profil.meno}</b></span>
      {z.spravaDarcom && <div style={{ padding: "14px 16px", borderRadius: 18, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--green)" }}>SPLNILI SME</span>
        <span style={{ fontSize: 15.5, lineHeight: 1.55 }}>„{z.spravaDarcom}“</span>
      </div>}
      {!p.bezDokladov && <>
        <span style={sekcia}>SPRÁVA A DOKLADY</span>
        <div style={{ ...karta, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ height: 26, padding: "0 10px", borderRadius: 13, background: z.doklady ? "#2F5E3A" : "var(--btn)", color: z.doklady ? "#fff" : "var(--ink2)", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{z.doklady ? `DOLOŽENÉ · ${z.doklady} ${z.doklady === 1 ? "DOKLAD" : z.doklady < 5 ? "DOKLADY" : "DOKLADOV"}` : "SPRÁVA SA PÍŠE"}</span>
        </div>
      </>}
      <div style={{ marginTop: 4 }}><Darcovia refId={z.id} bezDorovnania skoncena /></div>
    </Obal>
  );
}
