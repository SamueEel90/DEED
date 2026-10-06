// KARTA 55 · E — stránka Príbeh zbierky (rovnaká pri Kronike, Výklade aj Pirátovi a z odkazu vo feede), podľa „Pribeh zbierky.dc.html".
// Titulka 520 px so štítkami (druh, stav, PRÍBEH TÝŽDŇA zlatý), názov 68 px, miesto · kategória · Z-číslo →
// krátky text tučne 22 px → celý príbeh 18 px → citát 34 px → galéria s popismi → Priebeh (zlatá bodka = posledný zápis).
// PC vpravo sticky 440 px: suma, pruh, dorovnanie, modul. Mobil: suma pod názvom, modul dole zmenšený, „Späť ⌃" na konci.
import { useEffect, useState, type CSSProperties } from "react";
import { eur, pct, tvar, jeFarnost, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { cisloObjektu } from "@/lib/cisloObjektu";
import { druhF } from "@/lib/druhy";
import { jePribehTyzdna, type Pribeh } from "@/lib/pribehZbierky";
import { FormatovanyText } from "@/components/formattext";
import { ZbalitASpat, ZmensenyModul } from "@/features/zbierka/ZmensenyModul";
import { ModulPlatby } from "./ModulProfilu";
import { zbierkaAkoSektor } from "./PodporaProfilu";
import { bgF } from "./charitaCasti";
import { CelaGaleria } from "@/components/celaGaleria";

const PC = "(min-width: 1100px)";
function usePc() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia(PC).matches);
  useEffect(() => { const q = window.matchMedia(PC), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}
const tlTm: CSSProperties = { height: 44, padding: "0 14px 0 10px", borderRadius: 14, border: "none", background: "rgba(10,8,5,.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, fontFamily: "inherit", boxShadow: "none" };
const datumZ = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}.`; };

export function PribehZbierky({ profil, z, p, spatText = "Späť do feedu", onBack, onOrg }: {
  profil: TestProfil; z: TestZbierka; p: Pribeh; spatText?: string; onBack: () => void; onOrg?: () => void;
}) {
  const pc = usePc();
  const [cela, setCela] = useState<number | null>(null); // OPRAVY 155/2: fotka na celú obrazovku
  const farnost = jeFarnost(profil);
  const zF = z.zFirmy ?? 0, pp = pct(z.vyzbierane, z.ciel), pF = z.ciel ? Math.min(100 - pp, Math.round(zF / z.ciel * 100)) : 0, pL = Math.max(0, pp - pF);
  const st = z.stav === "dlhodoba" ? "DLHODOBÁ" : z.konciDni != null ? `KONČÍ O ${tvar(z.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : z.stav === "ukoncena" ? "UKONČENÁ" : null;
  const tyzden = jePribehTyzdna(z.id, profil.k);
  const meno = profil.meno.replace(/\s+o\.\s?z\.$/i, "");
  const stitok = (t: string, s: CSSProperties) => <span style={{ height: pc ? 30 : 26, padding: `0 ${pc ? 12 : 10}px`, borderRadius: 9, fontSize: pc ? 12.5 : 11.5, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", whiteSpace: "nowrap", color: "#fff", ...s }}>{t}</span>;

  const titulka = (
    <div style={{ position: "relative", height: pc ? 520 : 440, background: bgF(p.media.find((m) => m.typ === "foto")?.src ?? z.foto) }}>
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.45) 0%,rgba(10,8,5,0) 30%,rgba(10,8,5,.92) 100%)" }} />
      <div style={{ position: "absolute", left: pc ? 48 : 16, right: pc ? 48 : 16, top: pc ? 22 : "max(16px, env(safe-area-inset-top))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button type="button" onClick={onBack} style={tlTm}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>{pc ? spatText : "Späť"}</button>
        {onOrg && <button type="button" onClick={onOrg} style={{ ...tlTm, padding: "0 14px 0 8px" }}>{pc && <span style={{ width: 26, height: 26, borderRadius: 7, background: "#fff", color: "#3F6E2A", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{profil.iniciala}</span>}{meno} ›</button>}
      </div>
      <div style={{ position: "absolute", left: pc ? 48 : 16, right: pc ? 48 : 16, bottom: pc ? 40 : 20, display: "flex", flexDirection: "column", gap: pc ? 14 : 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {stitok("ZBIERKA", { background: druhF("zbierka") })}
          {pc && st && stitok(st, { background: "var(--dr-stav)" })}
          {tyzden && stitok("PRÍBEH TÝŽDŇA", { background: "rgba(42,37,24,.9)", border: "1px solid #6B5A2E", color: "#E2C27A" })}
        </div>
        <b style={{ fontSize: pc ? 68 : 36, lineHeight: 1.02, letterSpacing: "-.035em", color: "#fff", maxWidth: 820 }}>{z.nazov}</b>
        <span style={{ fontSize: pc ? 14 : 12.5, fontWeight: 800, letterSpacing: ".1em", color: "#E8E1D3" }}>{[z.mesto, z.cast, pc ? z.kategoria : st, pc ? cisloObjektu("Z", z.id) : null].filter(Boolean).join(" · ").toLocaleUpperCase("sk-SK")}</span>
      </div>
    </div>);
  const kov = <div style={{ height: "var(--mH)", background: "var(--metal)" }} />;

  const sumaBox = (
    <div style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: pc ? "20px 20px 18px" : "14px 16px", display: "flex", flexDirection: "column", gap: pc ? 12 : 10 }}>
      <span style={{ fontSize: pc ? 16 : 14, color: "var(--ink3)" }}><b style={{ fontSize: pc ? 38 : 26, letterSpacing: "-.03em", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(z.vyzbierane)}</b>{z.ciel ? ` z ${eur(z.ciel)}` : ""}{!pc ? ` · ${tvar(z.ludia, ["človek", "ľudia", "ľudí"])}` : ""}</span>
      <div style={{ height: 9, borderRadius: 5, background: "var(--track)", overflow: "hidden", display: "flex" }}><div style={{ height: "100%", width: `${z.ciel ? pL : 100}%`, background: "#6E9B4F" }} />{pF > 0 && <div style={{ height: "100%", width: `${pF}%`, background: "#C9A24A" }} />}</div>
      {pc && <span style={{ fontSize: 14, color: "var(--ink3)" }}>{[tvar(z.ludia, ["človek", "ľudia", "ľudí"]), zF ? `${eur(zF)} pridala firma` : null, z.konciDni != null ? `končí o ${tvar(z.konciDni, ["deň", "dni", "dní"])}` : null].filter(Boolean).join(" · ")}</span>}
      {z.dorovnanie && !farnost && profil.dorovnaniePas && (pc
        ? <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 5px", borderRadius: 12, background: "var(--goldBg)", border: "1px solid var(--goldBd)", alignSelf: "flex-start" }}><span style={{ width: 26, height: 26, borderRadius: 7, background: "#F2EBDD", color: "#8A6A1C", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{profil.dorovnaniePas.ini}</span><span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gold)" }}>{z.dorovnanie}</span></div>
        : <b style={{ fontSize: 13, color: "var(--gold)" }}>{z.dorovnanie}</b>)}
    </div>);
  const modul = <ModulPlatby profil={profil} sektor={zbierkaAkoSektor(z)} nazov={z.nazov} dorovnanie={!farnost} />;

  const citat = p.citat.text && p.citat.suhlas && (
    <div style={{ padding: pc ? "4px 0 4px 28px" : "2px 0 2px 16px", borderLeft: `${pc ? 6 : 4}px solid var(--acc)`, display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: pc ? 34 : 22, lineHeight: 1.3, fontWeight: 800, fontStyle: "italic", letterSpacing: "-.01em" }}>„{p.citat.text}“</span>
      <span style={{ fontSize: pc ? 15 : 13, color: "var(--ink3)" }}>{[p.citat.meno, p.citat.vztah].filter(Boolean).join(", ")}</span>
    </div>);
  const foto = p.media.filter((m) => m.typ === "foto");
  const galeria = foto.length > 0 && (
    <div style={pc ? { display: "grid", gridTemplateColumns: `repeat(${Math.min(3, foto.length)},minmax(0,1fr))`, gap: 12 } : { display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px", padding: "0 16px" }}>
      {foto.map((m, i) => (
        <figure key={m.id} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 8, flex: pc ? undefined : "none", width: pc ? undefined : 240 }}>
          <button type="button" onClick={() => setCela(i)} aria-label={m.popis ? `Zväčšiť fotku: ${m.popis}` : "Zväčšiť fotku"}
            style={{ display: "block", width: "100%", aspectRatio: "4/3", borderRadius: 18, background: bgF(m.src), border: "none", padding: 0, cursor: "zoom-in", boxShadow: "none" }} />
          {m.popis && <figcaption style={{ fontSize: 13.5, color: "var(--ink3)" }}>{m.popis}</figcaption>}
        </figure>))}
    </div>);
  // „záver" = posledný odsek príbehu, ide až za galériu (ako v prototype)
  const odseky = p.text.match(/<p[\s\S]*?<\/p>/g) ?? [p.text];
  const hlavny = odseky.length > 1 ? odseky.slice(0, -1).join("") : p.text, zaver = odseky.length > 1 ? odseky[odseky.length - 1] : "";
  const textSt: CSSProperties = { fontSize: pc ? 18 : 16, lineHeight: 1.75, color: "var(--ink2)" };
  const priebeh = p.priebeh.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <b style={{ fontSize: pc ? 28 : 24, letterSpacing: "-.02em" }}>Priebeh</b>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {p.priebeh.map((r, i) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "16px minmax(0,1fr)", columnGap: 18, position: "relative", paddingBottom: 22 }}>
            <span style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <span style={{ position: "absolute", top: 8, bottom: -22, width: 2, background: "var(--cardBd)", display: i === p.priebeh.length - 1 ? "none" : undefined }} />
              <span style={{ position: "relative", marginTop: 4, width: 12, height: 12, borderRadius: "50%", background: i === 0 ? "#D9B65A" : "var(--green)", boxShadow: "0 0 0 4px var(--bg)" }} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: i === 0 ? "var(--gold)" : "var(--acc)" }}>{datumZ(r.datum)}</span>
              <b style={{ fontSize: 17 }}>{r.nadpis}</b>
              <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>{r.text}</span>
            </span>
          </div>))}
      </div>
    </div>);
  const obsah = <>
    <b style={{ fontSize: pc ? 22 : 18, lineHeight: 1.5 }}>{p.kratky}</b>
    <FormatovanyText text={hlavny} style={textSt} />
    {citat}{galeria}
    {zaver && <FormatovanyText text={zaver} style={textSt} />}
    {priebeh}
    {/* OPRAVY 155/3: Späť aj dole pod Priebehom — vráti na to isté miesto */}
    <button type="button" onClick={onBack} style={{ width: "100%", height: 52, borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>{spatText}
    </button>
    {cela !== null && <CelaGaleria media={foto.map((m) => ({ typ: "foto" as const, src: m.src, popis: m.popis }))} start={cela} onClose={() => setCela(null)} />}
  </>;

  return (
    <div className="vp sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ height: "100%", overflowY: "auto", background: "var(--bg)", color: "var(--ink)", WebkitOverflowScrolling: "touch" } as CSSProperties}>
      {titulka}{kov}
      {pc ? (
        <div style={{ display: "flex", gap: 48, padding: "48px 48px 80px", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 760, display: "flex", flexDirection: "column", gap: 28 }}>{obsah}</div>
          <aside data-hier="z" style={{ width: 440, flex: "none", position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>{sumaBox}{modul}</aside>
        </div>
      ) : (
        <div style={{ padding: "16px 16px 140px", display: "flex", flexDirection: "column", gap: 20 }}>
          {sumaBox}{obsah}
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>PODPORIŤ ZBIERKU</span>
          <div data-hier="z"><ZmensenyModul>{modul}</ZmensenyModul></div>
          <ZbalitASpat onClick={onBack} />
        </div>)}
    </div>);
}
