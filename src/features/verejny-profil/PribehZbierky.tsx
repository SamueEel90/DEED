// KARTA 55 · E — stránka Príbeh zbierky (rovnaká pri Kronike, Výklade aj Pirátovi a z odkazu vo feede), podľa „Pribeh zbierky.dc.html".
// Titulka 520 px so štítkami (druh, stav, PRÍBEH TÝŽDŇA zlatý), názov 68 px, miesto · kategória · Z-číslo →
// krátky text tučne 22 px → celý príbeh 18 px → citát 34 px → galéria s popismi → Priebeh (zlatá bodka = posledný zápis).
// PC vpravo sticky 440 px: suma, pruh, dorovnanie, modul. Mobil: suma pod názvom, modul dole zmenšený, „Späť ⌃" na konci.
import { useEffect, useState, type CSSProperties } from "react";
import { tvar, jeFarnost, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { cisloObjektu } from "@/lib/cisloObjektu";
import { druhF } from "@/lib/druhy";
import { stitokNoveho, type Pribeh } from "@/lib/pribehZbierky";
import { FormatovanyText, RozbalitelnyText } from "@/components/formattext";
import { Galeria } from "@/features/zbierka/Vrch";
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
  const st = z.stav === "dlhodoba" ? "DLHODOBÁ" : z.konciDni != null ? `KONČÍ O ${tvar(z.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : z.stav === "ukoncena" ? "UKONČENÁ" : null;
  const nove = stitokNoveho(z.id); // OPRAVY 461: namiesto ručného Príbehu týždňa
  const meno = profil.meno.replace(/\s+o\.\s?z\.$/i, "");
  const stitok = (t: string, s: CSSProperties) => <span style={{ height: pc ? 30 : 26, padding: `0 ${pc ? 12 : 10}px`, borderRadius: 9, fontSize: pc ? 12.5 : 11.5, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", whiteSpace: "nowrap", color: "#fff", ...s }}>{t}</span>;

  const fotoT = p.media.filter((m) => m.typ === "foto");
  const titulka = (
    <div style={{ position: "relative", height: pc ? 520 : 440, background: bgF(z.foto || p.media.find((m) => m.typ === "foto")?.src || "") }}>{/* OPRAVY 455 (4): hlavná = titulná fotka zbierky */}
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.45) 0%,rgba(10,8,5,0) 30%,rgba(10,8,5,.92) 100%)" }} />
      {/* OPRAVY 317: ťuk na titulnú fotku = prehliadač fotiek, pri nej „1 / N“ */}
      {fotoT.length > 0 && <button type="button" onClick={() => setCela(0)} aria-label={fotoT.length > 1 ? `Fotky zbierky, ${fotoT.length}` : "Zväčšiť fotku"} style={{ position: "absolute", inset: 0, border: "none", padding: 0, background: "transparent", cursor: "zoom-in", boxShadow: "none" }} />}
      {fotoT.length > 1 && <span style={{ position: "absolute", right: pc ? 48 : 16, top: pc ? 84 : 72, height: 28, padding: "0 10px", borderRadius: 8, background: "rgba(10,8,5,.72)", color: "#fff", fontSize: 13.5, fontWeight: 800, display: "flex", alignItems: "center", fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}>1 / {fotoT.length}</span>}
      <div style={{ position: "absolute", left: pc ? 48 : 16, right: pc ? 48 : 16, top: pc ? 22 : "max(16px, env(safe-area-inset-top))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button type="button" onClick={onBack} style={{ ...tlTm, background: "#4B7A35" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>{pc ? spatText : "Späť"}</button>
        {onOrg && <button type="button" onClick={onOrg} style={{ ...tlTm, padding: "0 14px 0 8px" }}>{pc && <span style={{ width: 26, height: 26, borderRadius: 7, background: "#fff", color: "#3F6E2A", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{profil.iniciala}</span>}{meno} ›</button>}
      </div>
      <div style={{ position: "absolute", left: pc ? 48 : 16, right: pc ? 48 : 16, bottom: pc ? 40 : 20, display: "flex", flexDirection: "column", gap: pc ? 14 : 10, pointerEvents: "none" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {stitok("ZBIERKA", { background: druhF("zbierka") })}
          {pc && st && stitok(st, { background: "var(--dr-stav)" })}
          {nove && stitok(nove.toLocaleUpperCase("sk-SK"), { background: "rgba(42,37,24,.9)", border: "1px solid #6B5A2E", color: "#E2C27A" })}
        </div>
        <b style={{ fontSize: pc ? 68 : 36, lineHeight: 1.02, letterSpacing: "-.035em", color: "#fff", maxWidth: 820 }}>{z.nazov}</b>
        <span style={{ fontSize: pc ? 14 : 12.5, fontWeight: 800, letterSpacing: ".1em", color: "#E8E1D3" }}>{[z.mesto, z.cast, pc ? z.kategoria : st, pc ? cisloObjektu("Z", z.id, z.vs) : null].filter(Boolean).join(" · ").toLocaleUpperCase("sk-SK")}</span>
      </div>
    </div>);
  const kov = <div style={{ height: "var(--mH)", background: "var(--metal)" }} />;

  const modul = <ModulPlatby profil={profil} sektor={zbierkaAkoSektor(z)} nazov={z.nazov} dorovnanie={!farnost} />;

  // OPRAVY 475 (a): hore vždy pôvodný zapečatený text zbierky, Príbeh pod ním ako samostatná časť
  const povodny = z.popisHtml || z.popis;
  const obsah = <>
    {povodny && <FormatovanyText text={povodny} style={{ fontSize: pc ? 18 : 16, lineHeight: 1.75, color: "var(--ink2)" }} />}
    <PribehCast p={p} pc={pc} />
    {/* OPRAVY 155/3: Späť aj dole pod Priebehom — vráti na to isté miesto */}
    <button type="button" onClick={onBack} style={{ width: "100%", height: 52, borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>{spatText}
    </button>
    {cela !== null && <CelaGaleria media={fotoT.map((m) => ({ typ: "foto" as const, src: m.src, popis: m.popis }))} start={cela} onClose={() => setCela(null)} />}
  </>;

  return (
    <div className="vp sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ height: "100%", overflowY: "auto", background: "var(--bg)", color: "var(--ink)", WebkitOverflowScrolling: "touch" } as CSSProperties}>
      {titulka}{kov}
      {pc ? (
        <div style={{ display: "flex", gap: 48, padding: "48px 48px 80px", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 760, display: "flex", flexDirection: "column", gap: 28 }}>{obsah}</div>
          <aside data-hier="z" style={{ width: 440, flex: "none", position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>{modul}</aside>
        </div>
      ) : (
        <div style={{ padding: "16px 16px 140px", display: "flex", flexDirection: "column", gap: 20 }}>
          {obsah}
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>PODPORIŤ ZBIERKU</span>
          <div data-hier="z"><ZmensenyModul>{modul}</ZmensenyModul></div>
          <ZbalitASpat onClick={onBack} />
        </div>)}
    </div>);
}

/** OPRAVY 475: časť „Príbeh zbierky“ (krátky text, Ako to zatiaľ ide, citát, fotky, Priebeh) — stránka zbierky aj detail zbierky.
 *  Text a fotky sú uložené raz (pribehZbierky), tu sa len zobrazujú. */
export function PribehCast({ p, pc, bezNadpisu }: { p: Pribeh; pc: boolean; bezNadpisu?: boolean }) {
  const [cela, setCela] = useState<number | null>(null);
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
              {/* OPRAVY 455 (3): celý text zápisu (formátovaný), dlhý so … viac, a fotky zápisu */}
              {r.text && <RozbalitelnyText text={r.text} riadky={4} style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }} />}
              {!!r.media?.length && <Galeria okraj="0" radius={14} vyska={pc ? 260 : 200} media={r.media.map((m) => ({ typ: m.typ, src: m.src, popis: m.popis || undefined }))} />}
            </span>
          </div>))}
      </div>
    </div>);
  const datum = p.zverejnene ? datumZ(p.zverejnene) : "";
  return (
    <section aria-label="Príbeh zbierky" style={{ display: "flex", flexDirection: "column", gap: pc ? 24 : 18, paddingTop: bezNadpisu ? 0 : 8, borderTop: bezNadpisu ? "none" : "1px solid var(--cardBd)" }}>
      {!bezNadpisu && <span style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 16 }}>
        <b style={{ fontSize: pc ? 30 : 24, letterSpacing: "-.02em" }}>Príbeh zbierky</b>
        {datum && <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink3)" }}>zverejnený {datum}</span>}
      </span>}
      <b style={{ fontSize: pc ? 22 : 18, lineHeight: 1.5, whiteSpace: "pre-line" }}>{p.kratky}</b>{/* OPRAVY 455 (1): nový riadok ostane */}
      <FormatovanyText text={hlavny} style={textSt} />
      {citat}{galeria}
      {zaver && <FormatovanyText text={zaver} style={textSt} />}
      {priebeh}
      {cela !== null && <CelaGaleria media={foto.map((m) => ({ typ: "foto" as const, src: m.src, popis: m.popis }))} start={cela} onClose={() => setCela(null)} />}
    </section>);
}
