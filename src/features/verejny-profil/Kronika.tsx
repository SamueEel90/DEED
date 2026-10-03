// KARTA 43 · návrh Kronika (charita). Vľavo stojí charita (kto sú, štít, Podporiť),
// vpravo beží kronika od dnes po prvý deň: Teraz, 2026, 2025, … Filter a hľadanie
// fungujú naprieč všetkými rokmi. Farby podľa štítu. Mobil: lepkavá lišta + rady rokov.
import { useMemo, useState } from "react";
import { pressable } from "@/components/pressable";
import { StitObr } from "@/components/stit";
import type { StitLevel } from "@/components/stit";
import { eur, vLokalite, type Lokalita, type Mesto, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import {
  IkonaHladat, IkonaSipka, IkonaZdielat, LokalitaPrepinac, NazivoBlok, Overenie, OznamRiadok, PracaRiadok,
  SkutokKarta, StitOkno, ZbierkaKarta, karta, nadpisSekcie, useDomaceMesto, useMobil,
} from "./casti";
import { ModulSektory } from "./ModulSektory";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { naZbierkaData } from "./casti";

type Filter = "vsetko" | "zbierky" | "skutky" | "iskry" | "oznamy" | "praca";
const FILTRE: [Filter, string][] = [["vsetko", "Všetko"], ["zbierky", "Zbierky"], ["skutky", "Skutky"], ["iskry", "Iskry"], ["oznamy", "Oznamy"], ["praca", "Práca"]];

export function Kronika({ profil, rezim, onDetail, onBack }: {
  profil: TestProfil; rezim: "vsade" | "detail";
  onDetail: (z: TestZbierka) => void; onBack: () => void;
}) {
  const mobil = useMobil();
  const domace = useDomaceMesto(profil);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [filter, setFilter] = useState<Filter>("vsetko");
  const [hladaj, setHladaj] = useState("");
  const [stit, setStit] = useState(false);

  const zbierky = vLokalite(profil.zbierky, lok, domace);
  const skutky = vLokalite(profil.skutky, lok, domace);
  const oznamy = vLokalite(profil.oznamy, lok, domace);
  const praca = vLokalite(profil.praca, lok, domace);
  const bezice = zbierky.filter((z) => z.stav !== "ukoncena");

  const q = hladaj.trim().toLowerCase();
  const ok = (t: string) => !q || t.toLowerCase().includes(q);

  // ľavý stĺpec — vizitka charity
  const vlavo = (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...karta, padding: 18, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 800, color: "var(--ink)" }}>{profil.iniciala}</div>
          <button {...pressable()} onClick={() => setStit(true)} aria-label="Štít organizácie" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
            <StitObr level={profil.stit as StitLevel} h={74} tien />
          </button>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, color: "var(--ink)" }}>{profil.meno}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{profil.veta}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {profil.stitky.map((s) => <span key={s} style={{ padding: "6px 12px", borderRadius: 999, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 12.5, fontWeight: 700, color: "var(--ink2)" }}>{s}</span>)}
        </div>
        <button {...pressable()} onClick={() => setStit(true)} style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--goldBd)", background: "var(--goldBg)", color: "var(--gold)", fontSize: 13.5, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
          <span>Štít CARE · {["Gold"].includes(profil.stit) ? "Zlatý" : profil.stit} · {profil.stitCisla[0][0]} doložené</span>
          <IkonaSipka />
        </button>
        <button {...pressable()} style={{ minHeight: 48, borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Podporiť</button>
        <button {...pressable()} style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Sledovať</button>
      </div>
      <NazivoBlok profil={profil} lok={lok} domace={domace} />
      <div style={{ ...karta, padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {profil.cisla.map(([h, t]) => <div key={t}><div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>{h}</div><div style={{ fontSize: 11, color: "var(--ink4)" }}>{t}</div></div>)}
      </div>
      <div style={{ ...karta, padding: 16 }}><Overenie p={profil} /></div>
    </div>
  );

  // „Teraz" — bežiace zbierky, oznamy, práca
  const teraz = (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>Teraz</div>
        <div style={{ fontSize: 13, color: "var(--ink3)" }}>{bezice.length} zbierky · {oznamy.length} oznamy · {praca.length} ponuky práce</div>
      </div>
      {(filter === "vsetko" || filter === "zbierky") && bezice.filter((z) => ok(z.nazov)).map((z, i) => (
        <ZbierkaKarta key={z.id} z={z} velka={i === 0} onOtvor={rezim === "detail" ? () => onDetail(z) : undefined}
          podMnou={rezim === "vsade" ? <VlozenyModul z={z} profil={profil} /> : undefined} />
      ))}
      {(filter === "vsetko" || filter === "oznamy") && oznamy.filter((o) => ok(o.nadpis)).map((o) => <OznamRiadok key={o.id} o={o} />)}
      {(filter === "vsetko" || filter === "praca") && praca.filter((p) => ok(p.nazov)).map((p) => <PracaRiadok key={p.id} p={p} />)}
    </div>
  );

  // roky — ukončené zbierky a skutky
  const rok2026 = (filter === "vsetko" || filter === "zbierky") ? zbierky.filter((z) => z.stav === "ukoncena" && ok(z.nazov)) : [];
  const skutky2026 = (filter === "vsetko" || filter === "skutky") ? skutky.filter((s) => ok(s.nazov)) : [];
  const roky = (
    <div style={{ display: "grid", gap: 20 }}>
      {teraz}
      <Rok rok="2026" cisla={[["18 940 €", "vyzbierané"], ["5 z 6", "zbierok doložených"], ["31", "skutkov"], ["486", "darcov"]]}>
        {rok2026.map((z) => <ZbierkaKarta key={z.id} z={z} podMnou={rezim === "vsade" ? <VlozenyModul z={z} profil={profil} /> : undefined} />)}
        {skutky2026.map((sk) => <SkutokKarta key={sk.id} s={sk} podMnou={rezim === "vsade" ? <VlozenySkutokModul s={sk} profil={profil} /> : undefined} />)}
        {!rok2026.length && !skutky2026.length && <Prazdne />}
      </Rok>
    </div>
  );

  const pravyVrch = (
    <div style={{ display: "grid", gap: 10 }}>
      <label style={{ ...karta, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", minHeight: 48 }}>
        <span style={{ color: "var(--ink4)" }}><IkonaHladat /></span>
        <input value={hladaj} onChange={(e) => setHladaj(e.target.value)} placeholder="Hľadať v kronike: zbierka, skutok, rok"
          style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: "var(--ink)" }} />
      </label>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {FILTRE.map(([k, l]) => (
          <button key={k} {...pressable()} onClick={() => setFilter(k)} aria-pressed={filter === k}
            style={{ minHeight: 40, padding: "0 16px", borderRadius: 999, whiteSpace: "nowrap", cursor: "pointer",
              background: filter === k ? "var(--ink)" : "var(--card)", color: filter === k ? "var(--bg)" : "var(--ink2)",
              border: `1px solid ${filter === k ? "var(--ink)" : "var(--cardBd)"}`, fontSize: 13.5, fontWeight: 800 }}>{l}</button>
        ))}
      </div>
    </div>
  );

  const hlavicka = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button {...pressable()} onClick={onBack} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><IkonaSipka smer="vlavo" />Späť</button>
        <LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button {...pressable()} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 7, padding: "0 14px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><IkonaZdielat />Zdieľať · QR</button>
      </div>
    </div>
  );

  return (
    <div className="sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ background: "var(--bg)", minHeight: "100%", color: "var(--ink)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: mobil ? 14 : 22 }}>
        {hlavicka}
        <div style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "340px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
          <div style={mobil ? undefined : { position: "sticky", top: 14 }}>
            {vlavo}
            <div style={{ height: 14 }} />
            <ModulSektory profil={profil} lok={lok} domace={domace} />
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ position: "sticky", top: 0, zIndex: 20, background: "var(--bg)", paddingTop: 8, paddingBottom: 8, marginTop: -8 }}>{pravyVrch}</div>
            {roky}
          </div>
        </div>
      </div>
      {stit && <StitOkno p={profil} onClose={() => setStit(false)} />}
    </div>
  );
}

// vsade: celý ZbierkaModul vložený pod kartou (bez hlavičky, galérie a DEV panela)
function VlozenyModul({ z, profil }: { z: TestZbierka; profil: TestProfil }) {
  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--cardBd)", paddingTop: 6 }}>
      <ZbierkaModul vlozeny zbierka={naZbierkaData(z, profil)} miesto="charita" zoStrankyOrg onBack={() => {}} />
    </div>
  );
}
// vsade: podpora skutku — Help modul (drobná podpora, vlastná suma, Podporiť DEED+)
function VlozenySkutokModul({ s, profil }: { s: { id: string; nazov: string }; profil: TestProfil }) {
  return (
    <div style={{ borderTop: "1px solid var(--cardBd)", paddingTop: 6 }}>
      <ZbierkaModul vlozeny zbierka={{ id: s.id, nazov: s.nazov, organizacia: { meno: profil.meno, typ: "charita", mesto: profil.mesto, cisla: [], stit: profil.stit as never } }} miesto="deed" zoStrankyOrg onBack={() => {}} />
    </div>
  );
}

function Rok({ rok, cisla, children }: { rok: string; cisla: [string, string][]; children: React.ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", borderTop: "1px solid var(--cardBd)", paddingTop: 16 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: "var(--ink)" }}>{rok}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {cisla.map(([h, t]) => <span key={t} style={{ fontSize: 12.5, color: "var(--ink3)" }}><b style={{ color: "var(--ink)" }}>{h}</b> {t}</span>)}
        </div>
      </div>
      {children}
    </section>
  );
}

function Prazdne() {
  return <div style={{ ...karta, padding: 18, fontSize: 13, color: "var(--ink4)", textAlign: "center" }}>V tomto výbere nič nie je.</div>;
}
