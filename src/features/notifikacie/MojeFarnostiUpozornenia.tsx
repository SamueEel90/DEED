// ============================================================
// KARTA 63 · 1b — Profil → Upozornenia → Moje farnosti (prototyp „Upozornenia farnost.dc.html“).
// Hore „Spolu najviac 1 správa denne“ (súhrn zo všetkých farností, zrušená omša a parte hneď),
// pod ním domovská farnosť · sledované kostoly · sledované farnosti s riadkom, čo chodí. Ťuk = okno 1a.
// ============================================================
import { useState } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { farnostiSuhrn, nastavFarnostiSuhrn, nazovFarnosti, useAdresarFarnosti, useMojeFarnosti, blokyFarnosti, blokyKostola, kratkeBloky } from "@/lib/mojeFarnosti";
import { useMiesta } from "@/lib/miestaFarnosti";
import { OknoUpozorneni, type CielUpozorneni } from "@/features/verejny-profil/OknoUpozorneni";

const prep = (on: boolean) => (
  <span aria-hidden="true" style={{ position: "relative", width: 50, height: 30, borderRadius: 15, background: on ? "#4B7A35" : "var(--track, #D3CDC1)", flex: "none", transition: "background .2s" }}>
    <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transform: `translateX(${on ? 20 : 0}px)`, transition: "transform .2s" }} /></span>);

function Riadok({ k, kc, n, s, onTap }: { k: string; kc: string; n: string; s: string; onTap: () => void }) {
  return (
    <button type="button" onClick={onTap} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, border: "1px solid var(--d-cardBd, var(--cardBd))", background: "var(--d-card, var(--field))", fontFamily: "inherit", textAlign: "left", cursor: "pointer", color: "inherit", boxShadow: "none" }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: kc }}>{k}</span>
        <b style={{ fontSize: 15.5 }}>{n}</b>
        <span style={{ fontSize: 12.5, color: "var(--d-ink3, var(--ink3))" }}>{s}</span>
      </span>
      <span aria-hidden="true" style={{ fontSize: 20, color: "var(--d-ink3, var(--ink3))" }}>›</span>
    </button>);
}
/** riadok sledovaného kostola — názov kostola z miest jeho farnosti */
function RiadokKostola({ stranka, miesto, onTap }: { stranka: string; miesto: string; onTap: (c: CielUpozorneni) => void }) {
  const m = useMiesta(stranka, true).find((x) => x.id === miesto);
  const nf = nazovFarnosti(stranka), n = m?.nazov ?? "Kostol";
  return <Riadok k="SLEDOVANÝ KOSTOL" kc="#2F5A7A" n={`${n} · ${nf}`} s={kratkeBloky(blokyKostola(stranka, miesto))} onTap={() => onTap({ stranka, nazovFarnosti: nf, miesto: { id: miesto, nazov: n } })} />;
}

export function MojeFarnostiUpozornenia({ onBack }: { onBack: () => void }) {
  const MF = useMojeFarnosti();
  useAdresarFarnosti(); // názvy farností
  const [okno, setOkno] = useState<CielUpozorneni | null>(null);
  const suhrn = farnostiSuhrn();
  const far = (id: string) => ({ stranka: id, nazovFarnosti: nazovFarnosti(id) });
  const prazdne = !MF.domovska && !MF.sled.length && !MF.kostoly.length;
  return (
    <div className="deed-platba" style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--d-ink, var(--ink))" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "max(6px, env(safe-area-inset-top)) 16px 0", minHeight: 60 }}>
        <SpatTlacidlo onClick={onBack} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}><div style={{ padding: "6px 16px max(30px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 22 }}>Moje farnosti</b><span style={{ fontSize: 13.5, color: "var(--d-ink3, var(--ink3))" }}>Všetko, čo sledujete, na jednom mieste.</span></div>
        <button type="button" role="switch" aria-checked={suhrn} onClick={() => nastavFarnostiSuhrn(!suhrn)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, border: "1px solid var(--d-cardBd, var(--cardBd))", background: "var(--d-card, var(--field))", fontFamily: "inherit", textAlign: "left", cursor: "pointer", color: "inherit", boxShadow: "none" }}>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>Spolu najviac 1 správa denne</b><span style={{ fontSize: 12.5, color: "var(--d-ink3, var(--ink3))" }}>súhrn zo všetkých farností · zrušená omša a parte hneď</span></span>
          {prep(suhrn)}
        </button>
        {MF.domovska && <Riadok k="DOMOVSKÁ FARNOSŤ" kc="#2F5E3A" n={nazovFarnosti(MF.domovska)} s={kratkeBloky(blokyFarnosti(MF.domovska))} onTap={() => setOkno(far(MF.domovska!))} />}
        {MF.kostoly.map((k) => <RiadokKostola key={`${k.stranka}|${k.miesto}`} stranka={k.stranka} miesto={k.miesto} onTap={setOkno} />)}
        {MF.sled.map((id) => <Riadok key={id} k="SLEDOVANÁ FARNOSŤ" kc="#8A6A1F" n={nazovFarnosti(id)} s={kratkeBloky(blokyFarnosti(id))} onTap={() => setOkno(far(id))} />)}
        {prazdne
          ? <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--d-ink3, var(--ink3))" }}>Zatiaľ nesledujete žiadnu farnosť ani kostol. Na stránke farnosti ťuknite Sledovať.</span>
          : <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--d-ink3, var(--ink3))" }}>Ťuknite na farnosť alebo kostol a vyberte, o čom vám dáme vedieť.</span>}
      </div></div>
      {okno && <OknoUpozorneni ciel={okno} onZavri={() => setOkno(null)} />}
    </div>);
}
