// ============================================================
// Cirkev farnosti — farár ju nastaví (Martin 13:11). Podľa nej sa farnosť zaradí v Adresári cirkví.
// Zoznam: 18 cirkví a náboženských spoločností registrovaných v SR (lib/mojeFarnosti CIRKVI).
// ============================================================
import { useEffect, useState } from "react";
import { CIRKVI, RODINY_CIRKVI, skratkaCirkvi, nacitajCirkevFarnosti, nastavCirkevFarnosti } from "@/lib/mojeFarnosti";

export function CirkevFarnosti({ strankaId, mobil, toast }: { strankaId: string; mobil?: boolean; toast: (t: string) => void }) {
  const [kod, setKod] = useState<string | null>(null);
  const [otv, setOtv] = useState(false);
  useEffect(() => { let ziva = true; void nacitajCirkevFarnosti(strankaId).then((k) => { if (ziva) setKod(k); }); return () => { ziva = false; }; }, [strankaId]);
  const c = CIRKVI.find((x) => x[0] === kod);
  const vyber = (k: string) => {
    const pred = kod; setKod(k); setOtv(false);
    void nastavCirkevFarnosti(strankaId, k).then(() => toast("Cirkev farnosti uložená"), (e: Error) => { setKod(pred); toast(e.message); });
  };
  return (
    <section aria-label="Cirkev farnosti" style={{ borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "12px 14px" : "14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 15 }}>Cirkev farnosti</b>
          <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{c ? `${c[1]} · ${skratkaCirkvi(c[0])}` : "načítavam…"}</span>
        </span>
        <button type="button" aria-expanded={otv} onClick={() => setOtv(!otv)} style={{ flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>{otv ? "Zavrieť" : "Zmeniť"}</button>
      </div>
      <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Podľa nej ľudia nájdu farnosť v Adresári cirkví.</span>
      {otv && RODINY_CIRKVI.map((r, ri) => (
        <div key={r} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--ink3)", paddingTop: 4 }}>{r}</span>
          {CIRKVI.filter((x) => x[3] === ri).map(([k, n, popis]) => { const on = k === kod; return (
            <button key={k} type="button" aria-pressed={on} onClick={() => vyber(k)} style={{ minHeight: 52, padding: "6px 12px", borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
              <span style={{ flex: "none", minWidth: 52, fontSize: 12.5, fontWeight: 800, color: "var(--ink2)" }}>{skratkaCirkvi(k)}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 14 }}>{n}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>{popis}</span></span>
            </button>); })}
        </div>))}
    </section>);
}
