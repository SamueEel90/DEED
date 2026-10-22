// ============================================================
// OPRAVY 486 · Materiálna zbierka charity = kópia vecnej zbierky z Viery (OPRAVY 320), od P1.
// Zoznam bežiacich a ukončených · + Nová materiálna zbierka · Správa (QR a plagát, darcovia, ukončenie s poďakovaním).
// Dáta, darcovia a poďakovanie: tá istá vrstva ako vo Viere (naboz_stav „vecne“, vecny_dar 0100) — server je spoločný.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useVecneZbierky, fotoVecnej, doKedyText, usePrehladDarov, type VecnaZbierka } from "@/lib/vecnaZbierka";
import { VecnaNova, VecnaSprava } from "./VecnaZbierkaSprava";

const kicker: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", padding: "4px 4px 0" };

function Riadok({ strankaId, z, mobil, onClick }: { strankaId: string; z: VecnaZbierka; mobil: boolean; onClick: () => void }) {
  const pr = usePrehladDarov(strankaId, z);
  const f = fotoVecnej(z);
  const ludi = pr.ludi ? `${pr.ludi} ${pr.ludi === 1 ? "darca" : pr.ludi < 5 ? "darcovia" : "darcov"}` : "zatiaľ bez darcov";
  return (
    <button type="button" onClick={onClick} style={{ flex: "none", borderRadius: 20, border: "1.5px solid var(--cardBd)", background: "var(--card)", display: "flex", alignItems: "center", gap: mobil ? 12 : 16, padding: mobil ? "10px 12px" : "12px 18px 12px 12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
      <span aria-hidden="true" style={{ flex: "none", width: mobil ? 64 : 76, height: mobil ? 64 : 76, borderRadius: 14, background: f ? `url("${f}") center/cover no-repeat var(--track)` : "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)" }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#8A6A1F" }}>MATERIÁLNA ZBIERKA{z.stav === "aktivna" ? "" : " · UKONČENÁ"}</span>
        <b style={{ fontSize: 16, overflowWrap: "anywhere" }}>{z.nazov}</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{[z.co, z.stav === "aktivna" && z.doKedy ? `do ${doKedyText(z.doKedy, false)}` : "", ludi].filter(Boolean).join(" · ")}</span>
      </span>
      <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>
    </button>);
}

export function MaterialneCharita({ strankaId, meno, mobil, nova: nova0, onTlacQr }: { strankaId: string; meno: string; mobil: boolean;
  /** z „Akú zbierku pridávate?“ → rovno formulár */ nova?: boolean; onTlacQr?: (id: string) => void }) {
  const vsetky = useVecneZbierky(strankaId);
  const [nova, setNova] = useState(!!nova0);
  const [otv, setOtv] = useState<{ z: VecnaZbierka; nova: boolean } | null>(null);
  // po spustení / návrate: začiatok obrazovky (zelená „beží ✓“ na mieste, nie dole pri tlačidle) — aj keď sa posúva Správa, nie okno
  const vrch = useRef<HTMLDivElement>(null);
  const [krok, setKrok] = useState(0);
  const hore = () => setKrok((k) => k + 1);
  useEffect(() => { if (krok) vrch.current?.scrollIntoView({ block: "start" }); }, [krok]);
  if (nova) return <><div ref={vrch} /><VecnaNova charita strankaId={strankaId} mobil={mobil} onZavri={() => setNova(false)} onHotovo={(z) => { setNova(false); setOtv({ z, nova: true }); hore(); }} /></>;
  if (otv) return <div ref={vrch} style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 14, scrollMarginTop: 80 }}>
    <VecnaSprava charita key={otv.z.id} strankaId={strankaId} meno={meno} z={otv.z} nova={otv.nova} mobil={mobil} onSpat={() => { setOtv(null); hore(); }} onTlacQr={onTlacQr} /></div>;
  const bezi = vsetky.filter((z) => z.stav === "aktivna");
  const skoncene = vsetky.filter((z) => z.stav !== "aktivna");
  return (
    <div ref={vrch} style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 80 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ flex: "1 1 240px", fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Veci namiesto peňazí. Darca vec prinesie a cez QR na plagáte sa zapíše medzi darcov.</span>
        <button type="button" onClick={() => setNova(true)} style={{ flex: mobil ? "1 1 100%" : "none", minHeight: 50, padding: "0 20px", border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, boxShadow: "none" }}>+ Nová materiálna zbierka</button>
      </div>
      {bezi.length > 0 && <span style={kicker}>BEŽIA</span>}
      {bezi.map((z) => <Riadok key={z.id} strankaId={strankaId} z={z} mobil={mobil} onClick={() => setOtv({ z, nova: false })} />)}
      {vsetky.length === 0 && <section style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "24px 18px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
        <b style={{ fontSize: 16.5 }}>Zatiaľ nemáte žiadnu materiálnu zbierku</b>
        <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>Napríklad ponožky, trvanlivé potraviny alebo školské potreby.</span>
      </section>}
      {skoncene.length > 0 && <span style={{ ...kicker, paddingTop: 8 }}>UKONČENÉ</span>}
      {skoncene.map((z) => <Riadok key={z.id} strankaId={strankaId} z={z} mobil={mobil} onClick={() => setOtv({ z, nova: false })} />)}
    </div>);
}
