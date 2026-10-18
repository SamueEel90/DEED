// ============================================================
// KARTA 63 · 1c — nad „Podržte a zverejnite“: Upozorniť sledujúcich Áno · Nie + „Pošle sa N ľuďom, ktorí sledujú …“.
// N = sledujúci bloku (pri ozname pre konkrétne kostoly aj sledujúci týchto kostolov). Predvolené z Nastavenia upozornení (1d).
// 1d — Správa → Oznamy → hore „Upozornenia sledujúcim“ (OPRAVY 341): čo sa pri zverejnení predvolene pošle.
// ============================================================
import { useEffect, useState } from "react";
import { pocetSledujucich, type Blok } from "@/lib/mojeFarnosti";
import { BLOK_VETA, DRUHY_UPOZ, hned, nastavPredvoleneUpozIsto, useNastavenieUpoz, type DruhUpoz } from "@/lib/upozorneniaFarnosti";
import { KartaNastavenia } from "./KartaNastavenia";
import { Volby } from "@/components/Volby";

const IK_ZVONCEK = <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />;
import { AnoNie } from "@/components/AnoNie";

const ludom = (n: number) => (n === 1 ? "1 človeku" : `${n} ľuďom`);

export function UpozornitSledujucich({ strankaId, blok, miesta, value, onChange }: {
  strankaId: string; blok: Blok; /** oznam len pre niektoré kostoly */ miesta?: string[]; value: boolean; onChange: (v: boolean) => void;
}) {
  const [n, setN] = useState<number | null>(null);
  const kl = miesta?.join(",") ?? "";
  useEffect(() => {
    let ziva = true;
    void pocetSledujucich(strankaId, blok, kl ? kl.split(",") : undefined).then((x) => { if (ziva) setN(x); }, () => { if (ziva) setN(null); });
    return () => { ziva = false; };
  }, [strankaId, blok, kl]);
  const kedy = hned(blok) ? "hneď" : "v dennom súhrne";
  const veta = !value ? "Zverejní sa bez upozornenia." : `Pošle sa ${n === null ? "tým" : ludom(n)}, ktorí sledujú ${BLOK_VETA[blok]} (${kedy}).`;
  return (
    <div style={{ padding: "14px 16px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 15.5 }}>Upozorniť sledujúcich</b>
      <AnoNie value={value} onChange={onChange} label="Upozorniť sledujúcich" />
      <span role="status" style={{ fontSize: 13.5, color: "var(--ink2)" }}>{veta}</span>
    </div>);
}

/** OPRAVY 341: Správa → Oznamy hore — zbalená zlatá karta „Upozornenia sledujúcim“ (ako Čo môžu veriaci pridávať).
 *  Ťuk otvorí zoznam, každý riadok Áno · Nie; „uložené ✓“ až po potvrdení servera, pri chybe na mieste Skúsiť znova. */
export function NastavenieUpozorneni({ strankaId, mobil }: { strankaId: string; mobil?: boolean }) {
  const predv = useNastavenieUpoz(strankaId);
  const [otv, setOtv] = useState(false);
  const [stav, setStav] = useState<Record<string, "uklada" | "ok" | string>>({});
  const vypinatelne = DRUHY_UPOZ.filter(([d]) => d !== "omsa");
  const ano = vypinatelne.filter(([d]) => predv(d)).length, nie = vypinatelne.length - ano;
  const sumar = `${ano} ${ano === 1 ? "druh pošle" : ano >= 2 && ano <= 4 ? "druhy pošlú" : "druhov pošle"} upozornenie · ${nie} nie · zmena omše vždy hneď`;
  const zmen = async (d: DruhUpoz, on: boolean) => {
    setStav((x) => ({ ...x, [d]: "uklada" }));
    const e = await nastavPredvoleneUpozIsto(strankaId, d, on);
    setStav((x) => ({ ...x, [d]: e ? e : "ok" }));
  };
  if (!otv) return <KartaNastavenia nadpis="Upozornenia sledujúcim" stav={sumar} tlacidlo="Nastaviť" ikona={IK_ZVONCEK} mobil={mobil} onClick={() => setOtv(true)} />;
  return (
    <section aria-label="Upozornenia sledujúcim" style={{ borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "2px solid #C9A24A", display: "flex", flexDirection: "column" }}>
      <button type="button" onClick={() => setOtv(false)} aria-expanded="true" style={{ minHeight: 72, padding: mobil ? "12px 14px" : "12px 20px", border: "none", background: "transparent", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A24A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>{IK_ZVONCEK}</svg>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 16 }}>Upozornenia sledujúcim</b><span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{sumar}</span></span>
        <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>⌃</span>
      </button>
      <div style={{ padding: mobil ? "0 14px 16px" : "0 20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Čo sa pri zverejnení predvolene pošle sledujúcim. Pri každom ozname to viete ešte prepnúť.</span>
        {DRUHY_UPOZ.map(([d, n], i) => { const pevne = d === "omsa", st = stav[d]; return (
          <div key={d} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <span style={{ flex: "1 1 180px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 15 }}>{n}</b>
              {pevne ? <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>vždy · nedá sa vypnúť</span>
                : st === "uklada" ? <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Ukladá sa…</span>
                : st === "ok" ? <span role="status" style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gInk)" }}>uložené ✓</span>
                : st ? <span role="alert" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cRed)" }}>Nepodarilo sa · <button type="button" onClick={() => void zmen(d, predv(d))} style={{ padding: 0, border: "none", background: "transparent", color: "var(--cRed)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, textDecoration: "underline", cursor: "pointer" }}>Skúsiť znova</button></span> : null}
            </span>
            {!pevne && <span style={{ flex: "none", minWidth: 150 }}><Volby value={predv(d)} onChange={(v) => void zmen(d, v)} moznosti={[[true, "Áno"], [false, "Nie"]] as const} label={n} /></span>}
          </div>); })}
        <button type="button" onClick={() => setOtv(false)} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 18px", border: "none", borderRadius: 12, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, boxShadow: "none" }}>Hotovo · zbaliť ⌃</button>
      </div>
    </section>);
}
