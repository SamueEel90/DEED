// Doplnky 4. 10. (karta 45 · 5b) · detaily z kroniky (Kronika, História vo Výklade, roky) — len na čítanie, BEZ platobného modulu
// (modul je len v Aktuálne). Ťuk na skutok = detail skutku ako na Domove (fotka, text, kto pomáhal, Páči sa mi, Zdieľať).
// Ťuk na ukončenú zbierku = Zbierka skončila, Splnili sme, správa a doklady, darcovia. Návrh obrazoviek zatiaľ nie je.
import { ZbalitASpat, ZmensenyModul } from "@/features/zbierka/ZmensenyModul";
import { ModulPlatby } from "./ModulProfilu";
import { zbierkaAkoSektor } from "./PodporaProfilu";
import { RozbalitelnyText } from "@/components/formattext";
import { useEffect, useState, type CSSProperties } from "react";
import { nastavSkutokDaru, nacitajDarySkutkov } from "@/lib/darZbierky";
import type { TestProfil, TestZbierka } from "@/lib/testProfily";
import { eur, jeFarnost } from "@/lib/testProfily";
import { toast } from "@/shared";
import { Darcovia } from "@/features/zbierka/Riadky";
import { DeedDetail } from "@/features/aktivity/Aktivity";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { useQuery } from "@tanstack/react-query";
import { charitaSupabase } from "@/data/charita.supabase";
import { otvorVerejnyProfil } from "./otvor";
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

/** detail skutku (aj minulej akcie) z kroniky = ten istý DeedDetail ako na Domove Aktivít, staré roky bez podpory */
export function DetailSkutku({ profil, p, onBack }: { pc: boolean; profil: TestProfil; p: PolCh; onBack: () => void }) {
  const sk = profil.skutky.find((s) => s.id === p.id);
  const [hlasy, setHlasy] = useState<Record<number, string>>({});
  const num = Math.abs([...p.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7)) % 100000;
  const pz = sk?.podpora?.na === "zbierka" ? sk.podpora : undefined;
  // OPRAVY 438 (3): zbierka skutku — naša z profilu, inak (zbierka inej charity) tak, ako sa uložila pri skutku
  const zb: TestZbierka | undefined = pz ? profil.zbierky.find((z) => z.id === pz.zbierkaId)
    ?? (pz.nazov ? { id: pz.zbierkaId, nazov: pz.nazov, popis: "", mesto: profil.mesto, foto: "", vyzbierane: 0, ludia: 0, stav: "bezi" } : undefined) : undefined;
  const cudzia = !!pz && !!zb && !profil.zbierky.some((z) => z.id === pz.zbierkaId);
  const modul = !p.rok || !sk?.podpora ? null
    : sk.podpora.na === "centralna" ? (profil.bezCentralnej ? null : { nadpis: `PODPORIŤ · ${profil.centralna.nazov.toLocaleUpperCase("sk-SK")}`, sektor: profil.centralna, nazov: `${profil.centralna.nazov} · ${profil.meno}`, kam: profil.centralna.nazov })
    : zb ? { nadpis: "PODPORIŤ ZBIERKU · 100 % IDE NA ŇU", sektor: zbierkaAkoSektor(zb), nazov: cudzia && pz?.org ? `${zb.nazov} · ${pz.org}` : zb.nazov, kam: cudzia && pz?.org ? `${zb.nazov} · ${pz.org}` : zb.nazov } : null;
  // dar z tohto modulu ide cez skutok (0140) — kým je detail otvorený
  const refMod = modul?.sektor.id;
  useEffect(() => { if (!refMod || !sk) return; nastavSkutokDaru(refMod, sk.id); return () => nastavSkutokDaru(refMod, null); }, [refMod, sk]);
  const [cez, setCez] = useState<{ eur: number; pocet: number } | null>(null);
  useEffect(() => { if (!modul || !sk) return; let z = true; void nacitajDarySkutkov([sk.id]).then((m) => { if (z) setCez(m.get(sk.id) ?? null); }); return () => { z = false; }; }, [!!modul, sk?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const it = {
    id: num, num, dom: "zdravie", type: "skutok", emoji: "", verified: true, likes: 0,
    author: profil.meno, ini: profil.iniciala, pfp: "#4B7A35",
    loc: `${sk?.mesto ?? profil.mesto} · ${datum(p)}`,
    title: p.nazov, desc: sk?.popis ?? p.s, fotky: sk?.fotky?.length ? sk.fotky : [p.foto].filter((f) => f && !f.startsWith("logo|")), // OPRAVY 441: všetky fotky, nie len prvá
    pomahali: sk?.dobrovolnici ? `${profil.meno} · ${sk.dobrovolnici} dobrovoľníkov` : profil.meno,
    split: sk?.split,
    logo: profil.logo, pomocnici: sk?.pomocnici, // OPRAVY 447 (2, 3)
  };
  const [osoba, setOsoba] = useState<string | null>(null);
  // odchýlka 438: zbierka inej charity — ťuk na riadok otvorí jej detail s platobným modulom (dar ide stále cez skutok)
  const [cudziaOtv, setCudziaOtv] = useState(false);
  const { data: feedCh = [] } = useQuery({ queryKey: ["charita-zbierky-vyber"], queryFn: () => charitaSupabase.feed(), enabled: cudzia, staleTime: 60_000 });
  if (osoba) return <CudziProfil subjekt={{ typ: "osoba", meno: osoba }} toast={toast} onBack={() => setOsoba(null)} />;
  if (cudziaOtv && zb && pz) {
    const f = feedCh.find((x) => String(x.id) === pz.zbierkaId);
    return <ZbierkaModul zbierka={{ id: pz.zbierkaId, nazov: f?.nazov ?? zb.nazov, popis: f?.popis ?? "", overena: f?.overena,
      media: (f?.fotky ?? []).map((src) => ({ typ: "foto" as const, src })), vyzbierane: f?.vyzbierane, ciel: f?.ciel, ludia: f?.podpora, vs: f?.vs, zverejnene: f?.casVytvorenia }}
      onBack={() => setCudziaOtv(false)} spatNazov={p.nazov} onZavriet={() => setCudziaOtv(false)}
      onOtvorOrg={f?.stranka ? () => otvorVerejnyProfil(f.stranka!) : undefined} />;
  }
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--c-bg)", WebkitOverflowScrolling: "touch" } as CSSProperties}>
      <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 120 }}>
        <DeedDetail it={it} bezPodpory charita={profil.typ === "charita"} onPomocnik={(u: { meno: string }) => setOsoba(u.meno)} support={() => {}} votes={hlasy} vote={(id: number, v: string) => setHlasy((h) => ({ ...h, [id]: v }))}
          toast={toast} home={onBack} openPerson={() => {}} />
        {/* bod 150 · skutok s platobným modulom (bod 122): na centrálnu / na zbierku (100 % tam) / bez modulu */}
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {modul && <>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: 8 }}>{modul.nadpis}</span>
            {/* OPRAVY 438 (3): kam idú peniaze a koľko už prišlo cez tento skutok */}
            {cudzia && <button type="button" onClick={() => setCudziaOtv(true)} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "8px 12px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--card)", boxShadow: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 15 }}>{zb?.nazov}</b><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{[pz?.org, pz?.cislo].filter(Boolean).join(" · ")}</span></span>
              <span aria-hidden="true" style={{ fontSize: 18, color: "var(--ink3)" }}>›</span>
            </button>}
            <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{!cudzia && <>Peniaze idú na <b style={{ color: "var(--ink)" }}>{modul.kam}</b>{pz?.cislo ? <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}> · {pz.cislo}</span> : null}.</>}
              {cez && cez.eur > 0 ? <> Cez tento skutok prišlo <b style={{ color: "var(--ink)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{eur(cez.eur)}</b> od {cez.pocet} {cez.pocet === 1 ? "darcu" : "darcov"}.</> : null}</span>
            <ZmensenyModul><ModulPlatby profil={profil} sektor={modul.sektor} nazov={modul.nazov} dorovnanie={!jeFarnost(profil)} /></ZmensenyModul>
          </>}
          {/* OPRAVY 443 (3): „Zbaliť a späť ^“ dole v detaile skutku preč (ako 440) */}
        </div>
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
      {z.popis && <RozbalitelnyText text={z.popisHtml ?? z.popis} style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--ink2)" }} />}
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
