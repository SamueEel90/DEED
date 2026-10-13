// ============================================================
// KARTA 63 · 1c — nad „Podržte a zverejnite“: Upozorniť sledujúcich Áno · Nie + „Pošle sa N ľuďom, ktorí sledujú …“.
// N = sledujúci bloku (pri ozname pre konkrétne kostoly aj sledujúci týchto kostolov). Predvolené z Nastavenia upozornení (1d).
// 1d — Správa → Oznamy → úplne dole „Nastavenie upozornení“: čo sa pri zverejnení predvolene pošle.
// ============================================================
import { useEffect, useState } from "react";
import { pocetSledujucich, type Blok } from "@/lib/mojeFarnosti";
import { BLOK_VETA, DRUHY_UPOZ, hned, nastavPredvoleneUpoz, useNastavenieUpoz } from "@/lib/upozorneniaFarnosti";

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
      <div role="radiogroup" aria-label="Upozorniť sledujúcich" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)", alignSelf: "flex-start" }}>
        {([[true, "Áno"], [false, "Nie"]] as const).map(([v, t]) => { const on = value === v; return (
          <button key={t} type="button" role="radio" aria-checked={on} onClick={() => onChange(v)}
            style={{ minHeight: 40, padding: "0 20px", border: "none", borderRadius: 9, background: on ? "var(--ink)" : "transparent", color: on ? "var(--bg)" : "var(--ink3)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>{t}</button>); })}
      </div>
      <span role="status" style={{ fontSize: 13.5, color: "var(--ink2)" }}>{veta}</span>
    </div>);
}

export function NastavenieUpozorneni({ strankaId }: { strankaId: string }) {
  const predv = useNastavenieUpoz(strankaId);
  return (
    <section aria-label="Nastavenie upozornení" style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
      <b style={{ fontSize: 17 }}>Nastavenie upozornení</b>
      <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Čo sa pri zverejnení predvolene pošle sledujúcim. Pri každej veci to viete prepnúť.</span>
      {DRUHY_UPOZ.map(([d, n, ano]) => { const pevne = d === "omsa", on = predv(d); return (
        <button key={d} type="button" role={pevne ? undefined : "switch"} aria-checked={pevne ? undefined : on} disabled={pevne} onClick={() => nastavPredvoleneUpoz(strankaId, d, !on)}
          style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "6px 14px", borderRadius: 12, border: "none", background: "var(--card)", fontFamily: "inherit", textAlign: "left", cursor: pevne ? "default" : "pointer", color: "var(--ink)", boxShadow: "none" }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{n}</span>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink3)" }}>{on ? ano : "Nie"}</span>
        </button>); })}
    </section>);
}
