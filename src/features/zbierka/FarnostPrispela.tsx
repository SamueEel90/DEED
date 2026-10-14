// ============================================================
// OPRAVY 222 — Spolufinancovanie 1 : 1 ako v charite (prototyp Spolufinancovanie, Martin 13. 10.).
// Pri zbierke: zlatý úsek + „Prispela Farnosť … · 3 000 € · partner zbierky · Pozri profil ›“ (cudzia organizácia),
// tmavozelený „3 000 € od Farnosti … · vlastné peniaze organizácie, ktorá zbiera“; pri zbierke rodiny len „Prispela aj …“.
// A · „Prispieť ako Farnosť … ›“ pod rýchlymi sumami: len farár, len pevná suma (farnosť nedorovnáva), platobný modul ako dar organizácie.
// ============================================================
import { useState } from "react";
import { createPortal } from "react-dom";
import { useFarnostFarara, usePrispievatelia, darFarnosti } from "@/lib/farnostPrispela";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { toast } from "@/shared";
import { PlatobneOkno } from "./Platba";

const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })}\u00A0€`;
const inic = (m: string) => m.split(/\s+/).filter((w) => w.length > 1 && !/^(Farnosť|o\.z\.|OZ)$/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "F";
/** „Farnosť Stakčín“ → „Farnosti Stakčín“ (od koho) */
const odKoho = (m: string) => m.replace(/^Farnosť /, "Farnosti ");
export const ZLATA_USEK = "#B8862B", VLASTNE_USEK = "#2F5E3A";

/** úseky pruhu a počet darov organizácií (neratajú sa medzi ľudí) */
export function useUsekyOrganizacii(refId: string): { cudzie: number; vlastne: number; organizacii: number; darovOrg: number } {
  const L = usePrispievatelia(refId);
  return {
    cudzie: L.filter((p) => !p.vlastne).reduce((a, p) => a + (p.suma ?? 0), 0),
    vlastne: L.filter((p) => p.vlastne).reduce((a, p) => a + (p.suma ?? 0), 0),
    organizacii: L.filter((p) => !p.vlastne).length,
    darovOrg: L.reduce((a, p) => a + p.pocet, 0),
  };
}

/** riadky organizácií pri zbierke (v karte stavu pod pruhom) */
export function PrispievateliaFarnosti({ refId, rodina }: { refId: string; rodina?: boolean }) {
  const L = usePrispievatelia(refId);
  if (!L.length) return null;
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
    {L.map((p) => {
      const vl = p.vlastne, bg = vl ? "#D6E2DA" : "var(--goldBg)", bd = vl ? "#9DB8A4" : "var(--goldBd)", ic = vl ? VLASTNE_USEK : "var(--gold)";
      const t = rodina || p.suma == null ? `Prispela aj ${p.meno}` : vl ? `${eur(p.suma)} od ${odKoho(p.meno)}` : `Prispela ${p.meno} · ${eur(p.suma)}`;
      const pod = vl ? "vlastné peniaze organizácie, ktorá zbiera" : "partner zbierky";
      const obsah = <>
        <span aria-hidden="true" style={{ flex: "none", width: 36, height: 36, borderRadius: 10, background: "#fff", border: `1px solid ${bd}`, color: ic, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800 }}>{inic(p.meno)}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }}>
          <b style={{ fontSize: 14, color: vl ? "#1D211B" : "var(--ink)" }}>{t}</b>
          {!(rodina || p.suma == null) && <span style={{ fontSize: 12.5, color: vl ? "#4A4C43" : "var(--ink2)" }}>{pod}</span>}
        </span>
        {!vl && <span style={{ flex: "none", whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 800, color: ic }}>Pozri profil ›</span>}
      </>;
      const st = { display: "flex", alignItems: "center", gap: 10, minHeight: 56, padding: "10px 12px", borderRadius: 14, background: bg, border: `1px solid ${bd}`, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const };
      return vl ? <div key={p.stranka} role="note" style={st}>{obsah}</div>
        : <button key={p.stranka} type="button" onClick={() => otvorVerejnyProfil(p.stranka)} style={{ ...st, cursor: "pointer", boxShadow: "none" }}>{obsah}</button>;
    })}
  </div>;
}

/** A · „Prispieť ako Farnosť … ›“ — len farár, len na cudziu zbierku, pevná suma, SEPA alebo karta farnosti */
export function PrispietZaFarnost({ refId, nazov, vlastnik }: { refId: string; nazov: string; /** meno stránky, ktorej zbierka patrí */ vlastnik?: string }) {
  const f = useFarnostFarara();
  const [otv, setOtv] = useState(false);
  const [suma, setSuma] = useState("");
  const [plat, setPlat] = useState(false);
  if (!f || (vlastnik && vlastnik === f.meno)) return null;
  const n = Number(suma.replace(",", ".").replace(/\s/g, ""));
  const ok = Number.isFinite(n) && n > 0;
  return <>
    <button type="button" onClick={() => setOtv(true)} style={{ display: "flex", alignItems: "center", minHeight: 44, margin: "6px 0 2px", padding: "0 2px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--gold)", boxShadow: "none" }}>{`Prispieť ako ${f.meno} ›`}</button>
    {otv && !plat && createPortal(<div className="deed-platba" role="dialog" aria-modal="true" aria-label={`Prispieť ako ${f.meno}`} onClick={() => setOtv(false)} style={{ position: "fixed", inset: 0, zIndex: 1300, background: "var(--scrim)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <section onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, borderRadius: 22, background: "var(--sheet)", border: "1px solid var(--cardBd)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, color: "var(--ink)", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 19 }}>{`Prispieť ako ${f.meno}`}</b>
          <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{`do zbierky „${nazov}“${vlastnik ? ` · ${vlastnik}` : ""}`}</span>
        </span>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Suma</span>
          <span style={{ display: "flex", alignItems: "center", height: 54, padding: "0 16px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--cardBd)" }}>
            <input value={suma} onChange={(e) => setSuma(e.target.value.replace(/[^\d,.\s]/g, "").slice(0, 10))} inputMode="decimal" autoFocus placeholder="napr. 200" aria-label="Suma v eurách"
              style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 18, fontWeight: 800, color: "var(--ink)" }} />
            <b style={{ fontSize: 18 }}>€</b>
          </span>
        </label>
        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>{`Pri zbierke sa ukáže „Prispela ${f.meno} · ${ok ? eur(n) : "suma"}“ s vaším logom.`}</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Zaplatíte cez platobný modul ako dar organizácie. Doklad o dare príde na fakturačné údaje vašej organizácie.</span>
        <button type="button" disabled={!ok} onClick={() => setPlat(true)} style={{ height: 52, border: "none", borderRadius: 14, background: ok ? "#4B7A35" : "var(--btn)", cursor: ok ? "pointer" : "default", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: ok ? "#fff" : "var(--ink3)", boxShadow: "none" }}>Pokračovať na platbu</button>
        <button type="button" onClick={() => setOtv(false)} style={{ alignSelf: "center", minHeight: 44, padding: "0 18px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" }}>Zrušiť</button>
      </section>
    </div>, document.body)}
    {plat && <PlatobneOkno kanal="eur" suma={n} nazov={`${nazov} · ${f.meno}`} registrovany pred={{ vyzbierane: 0, ciel: null, pocetDarov: 0, darovDnes: 0 }}
      onClose={() => { setPlat(false); setOtv(false); }}
      onHotovo={(v) => { void darFarnosti(refId, v.eur, v.sposob === "sepa", f).then(() => toast(`${f.meno} prispela ${eur(v.eur)} ✓ Doklad nájdete v Peňaženke vo Výpisoch.`)).catch((e: Error) => toast(e.message)); }} />}
  </>;
}
