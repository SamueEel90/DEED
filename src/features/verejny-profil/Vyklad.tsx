// KARTA 43 · návrh Výklad (v2, firma/B2B). Veľká titulka, záložky, sekcie pod sebou,
// „Pomáhame v regiónoch". Celá stránka nesie farbu štítu. Oznamy (aj práca) hneď pod
// zbierkami, História po rokoch, centrálna zbierka a „S nami pomáhajú" na konci.
import { useMemo, useRef, useState } from "react";
import { pressable } from "@/components/pressable";
import { StitObr } from "@/components/stit";
import type { StitLevel } from "@/components/stit";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { eur, vLokalite, type Lokalita, type Mesto, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import {
  IkonaSipka, IkonaZdielat, LokalitaPrepinac, NazivoBlok, Overenie, OznamRiadok, PracaRiadok,
  SkutokKarta, StitOkno, ZbierkaKarta, karta, nadpisSekcie, naZbierkaData, useDomaceMesto, useMobil, vMeste,
} from "./casti";
import { ModulSektory } from "./ModulSektory";

type Tab = "zbierky" | "oznamy" | "doklady" | "skutky" | "historia" | "onas";
const TABY: [Tab, string][] = [["zbierky", "Zbierky"], ["oznamy", "Oznamy"], ["doklady", "Sľúbili a splnili"], ["skutky", "Skutky"], ["historia", "História"], ["onas", "O nás"]];

export function Vyklad({ profil, rezim, onDetail, onBack }: {
  profil: TestProfil; rezim: "vsade" | "detail"; onDetail: (z: TestZbierka) => void; onBack: () => void;
}) {
  const mobil = useMobil();
  const domace = useDomaceMesto(profil);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [tab, setTab] = useState<Tab>("zbierky");
  const [stit, setStit] = useState(false);

  const zbierky = vLokalite(profil.zbierky, lok, domace);
  const skutky = vLokalite(profil.skutky, lok, domace);
  const oznamy = vLokalite(profil.oznamy, lok, domace);
  const praca = vLokalite(profil.praca, lok, domace);
  const bezice = zbierky.filter((z) => z.stav !== "ukoncena");
  const dolozene = zbierky.filter((z) => z.stav === "ukoncena");

  const embed = (z: TestZbierka) => rezim === "vsade"
    ? <div style={{ marginTop: 12, borderTop: "1px solid var(--cardBd)", paddingTop: 6 }}><ZbierkaModul vlozeny zbierka={naZbierkaData(z, profil)} miesto="charita" zoStrankyOrg onBack={() => {}} /></div>
    : undefined;
  const embedSkutok = (id: string, nazov: string) => rezim === "vsade"
    ? <div style={{ borderTop: "1px solid var(--cardBd)", paddingTop: 6 }}><ZbierkaModul vlozeny zbierka={{ id, nazov, organizacia: { meno: profil.meno, typ: "charita", mesto: profil.mesto, cisla: [], stit: profil.stit as never } }} miesto="deed" zoStrankyOrg onBack={() => {}} /></div>
    : undefined;

  const sekcia = (() => {
    switch (tab) {
      case "zbierky": return (
        <Sekcia titulok="Teraz potrebujeme">
          {bezice.map((z, i) => <ZbierkaKarta key={z.id} z={z} velka={i === 0} onOtvor={rezim === "detail" ? () => onDetail(z) : undefined} podMnou={embed(z)} />)}
          {!bezice.length && <Prazdne />}
        </Sekcia>
      );
      case "oznamy": return (
        <Sekcia titulok="Príď medzi nás">
          {oznamy.map((o) => <OznamRiadok key={o.id} o={o} />)}
          {praca.map((p) => <PracaRiadok key={p.id} p={p} />)}
          {!oznamy.length && !praca.length && <Prazdne />}
        </Sekcia>
      );
      case "doklady": return (
        <Sekcia titulok="Sľúbili sme. Splnili sme.">
          {dolozene.map((z) => <ZbierkaKarta key={z.id} z={z} velka onOtvor={rezim === "detail" ? () => onDetail(z) : undefined} podMnou={embed(z)} />)}
          {!dolozene.length && <Prazdne />}
        </Sekcia>
      );
      case "skutky": return (
        <Sekcia titulok="Takto sme pomohli">
          {skutky.map((s) => <SkutokKarta key={s.id} s={s} podMnou={embedSkutok(s.id, s.nazov)} />)}
          {!skutky.length && <Prazdne />}
        </Sekcia>
      );
      case "historia": return (
        <Sekcia titulok="Čo sme urobili rok po roku">
          <div style={{ ...karta, padding: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {profil.cisla.map(([h, t]) => <div key={t}><div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>{h}</div><div style={{ fontSize: 11, color: "var(--ink4)" }}>{t}</div></div>)}
            <div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>od {profil.odRoku}</div><div style={{ fontSize: 11, color: "var(--ink4)" }}>na DEED</div></div>
          </div>
          {[...dolozene, ...skutky.slice(0, 3).map((s) => s)].length ? null : <Prazdne />}
          {dolozene.map((z) => <ZbierkaKarta key={z.id} z={z} />)}
          {skutky.map((s) => <SkutokKarta key={s.id} s={s} />)}
        </Sekcia>
      );
      case "onas": return (
        <Sekcia titulok="O nás">
          <div style={{ ...karta, padding: 18, fontSize: 14, lineHeight: 1.6, color: "var(--ink2)" }}>{profil.veta}</div>
          <div style={{ ...karta, padding: 16 }}><Overenie p={profil} /></div>
        </Sekcia>
      );
    }
  })();

  return (
    <div className="sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ background: "var(--bg)", minHeight: "100%", color: "var(--ink)" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: mobil ? 14 : 22 }}>
        {/* vrchné ovládanie */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button {...pressable()} onClick={onBack} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><IkonaSipka smer="vlavo" />Späť</button>
            <LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button {...pressable()} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 7, padding: "0 14px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><IkonaZdielat />Zdieľať · QR</button>
            <button {...pressable()} style={{ minHeight: 44, padding: "0 18px", borderRadius: 999, background: "var(--green)", border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Sledovať</button>
          </div>
        </div>

        {/* titulka */}
        <div style={{ ...karta, overflow: "hidden", position: "relative" }}>
          <div style={{ height: mobil ? 150 : 230, background: "linear-gradient(135deg, var(--accSoft), var(--card))" }} />
          <button {...pressable()} onClick={() => setStit(true)} aria-label="Štít organizácie"
            style={{ position: "absolute", right: mobil ? 14 : 26, top: mobil ? 92 : 150, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
            <StitObr level={profil.stit as StitLevel} h={mobil ? 84 : 150} tien />
          </button>
          <div style={{ padding: mobil ? "0 16px 18px" : "0 26px 24px", marginTop: mobil ? -40 : -56, position: "relative" }}>
            <div style={{ width: mobil ? 88 : 108, height: mobil ? 88 : 108, borderRadius: 22, background: "var(--field)", border: "3px solid var(--card)", display: "grid", placeItems: "center", fontSize: mobil ? 28 : 36, fontWeight: 800, color: "var(--ink)" }}>{profil.iniciala}</div>
            <div style={{ fontSize: mobil ? 28 : 40, fontWeight: 800, lineHeight: 1.1, color: "var(--ink)", marginTop: 12 }}>{profil.meno}</div>
            <div style={{ fontSize: mobil ? 14 : 16, lineHeight: 1.5, color: "var(--ink2)", marginTop: 8, maxWidth: 620 }}>{profil.veta}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {profil.stitky.map((s) => <span key={s} style={{ padding: "6px 12px", borderRadius: 999, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 12.5, fontWeight: 700, color: "var(--ink2)" }}>{s}</span>)}
            </div>
            {/* Pomáhame v regiónoch */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink4)" }}>Pomáhame v</span>
              {(["Trenčín", "Prešov", "Bratislava"] as Mesto[]).map((m) => (
                <button key={m} {...pressable()} onClick={() => setLok(m)} aria-pressed={lok === m}
                  style={{ minHeight: 36, padding: "0 14px", borderRadius: 999, cursor: "pointer", background: lok === m ? "var(--gSoft)" : "var(--field)", border: `1px solid ${lok === m ? "var(--gBd)" : "var(--cardBd)"}`, color: lok === m ? "var(--gInk)" : "var(--ink2)", fontSize: 13, fontWeight: 700 }}>{m}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height: 14 }} />
        <NazivoBlok profil={profil} lok={lok} domace={domace} />
        <div style={{ height: 14 }} />
        <ModulSektory profil={profil} lok={lok} domace={domace} />

        {/* lepkavé záložky */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--bg)", padding: "10px 0", marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {TABY.map(([k, l]) => (
              <button key={k} {...pressable()} onClick={() => setTab(k)} aria-pressed={tab === k}
                style={{ minHeight: 40, padding: "0 16px", borderRadius: 999, whiteSpace: "nowrap", cursor: "pointer",
                  background: tab === k ? "var(--ink)" : "var(--card)", color: tab === k ? "var(--bg)" : "var(--ink2)",
                  border: `1px solid ${tab === k ? "var(--ink)" : "var(--cardBd)"}`, fontSize: 13.5, fontWeight: 800 }}>{l}</button>
            ))}
          </div>
        </div>

        {sekcia}

        {/* centrálna zbierka + S nami pomáhajú */}
        <div style={{ height: 20 }} />
        <div style={{ ...karta, padding: 20, display: "grid", gap: 10 }}>
          <div style={nadpisSekcie}>Centrálna zbierka · na celú činnosť</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>Pomôž nám pomáhať každý deň</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Peniaze idú tam, kde sú práve najviac potrebné v {vMeste(lok === "Celé Slovensko" ? domace : lok)}.</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "4px 0" }}>
            {profil.centralna.darcovia > 0 && <span style={{ fontSize: 13, color: "var(--ink3)" }}><b style={{ color: "var(--ink)", fontSize: 18 }}>{eur(profil.centralna.vyzbierane)}</b> od začiatku</span>}
            <span style={{ fontSize: 13, color: "var(--ink3)" }}><b style={{ color: "var(--ink)", fontSize: 18 }}>{profil.centralna.darcovia}</b> darcov</span>
          </div>
          <button {...pressable()} style={{ minHeight: 48, borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Podporiť</button>
        </div>

        {stit && <StitOkno p={profil} onClose={() => setStit(false)} />}
      </div>
    </div>
  );
}

function Sekcia({ titulok, children }: { titulok: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 12, marginTop: 8 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>{titulok}</div>
      {children}
    </section>
  );
}
function Prazdne() {
  return <div style={{ ...karta, padding: 18, fontSize: 13, color: "var(--ink4)", textAlign: "center" }}>V tomto meste tu zatiaľ nič nie je.</div>;
}
