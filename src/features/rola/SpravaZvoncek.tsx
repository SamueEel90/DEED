// ============================================================
// OPRAVY 260 — Správa zvončekovej zbierky (podľa modulu Hlavná zbierka, prototyp „Sprava hlavnej zbierky farnosti").
// Záložky Nastavenie · Štatistiky · Ukončenie. Nastavenie: názov, text (TextovePolia), titulná fotka a fotky (GaleriaEditor
// s popisom), živý náhľad karty zo stránky farnosti, rýchle sumy, EURC. Ukladá sa samo, na stránke sa zmena ukáže hneď.
// Ukončenie podržaním → zelená hláška na tom istom mieste → späť do Správy.
// OPRAVY 289: zbierka pri každej omši z kalendára hlavného kostola (zvoncekOmse.ts), Poďakovanie s ukážkou riadku,
// Pri každej omši · dnes; „Ďalšia omša (test)“ len v DEV paneli.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { useZvoncekOkno, dalsiaOmsaTest, nadpisOkna, nadpisOmse, dalsiaOmsa, riadokOmse, omseZvoncek } from "@/lib/zvoncekOmse";
import { kostolKal } from "@/lib/kalendarFarnosti";
import { useSlovaFarnosti } from "@/lib/mojeFarnosti";
import { useZvoncek, ulozZvoncek, nastavenieZvoncek, nazovZvoncek, podakovanieZvoncek, ZVONCEK_NAZOV, type NastavenieZvoncek } from "@/lib/zvoncekZbierka";
import { TESTOVACIA } from "@/lib/testovacia";
import { HLAVNA_NAZOV_MAX } from "@/lib/centralnaZbierka";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { ZvoncekKarta } from "@/features/verejny-profil/NastenkaFarnosti";
import { TextovePolia, GaleriaEditor } from "./obsahZbierky";
import { SumyPriDarcoch } from "./SumyPriDarcoch";
import { kartaK, nadpisK, drobneK, textK, Taby, UkladaSa, AkoDarovat, useUkladanie, UlozenePri, PasUlozene } from "./spravaCasti";
import { sumaEur } from "@/lib/suma";

const eur = (n: number) => `${sumaEur(n)}`;
const ludi = (n: number) => `${n} ${n === 1 ? "človek" : n >= 2 && n <= 4 ? "ľudia" : "ľudí"}`;

export function SpravaZvoncek({ strankaId, mobil, toast, onSpat }: { strankaId: string; mobil: boolean; toast: (m: string) => void; onSpat: () => void }) {
  const n = useZvoncek(strankaId);
  const om = useZvoncekOkno(strankaId);
  const slova = useSlovaFarnosti(strankaId);
  const pod = podakovanieZvoncek(n, slova);
  const dnes = omseZvoncek(kostolKal(strankaId), new Date());
  const [tab, setTab] = useState(0);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  // OPRAVY 313: po každej zmene pri poli „Uložené ✓“ (alebo „Neuložilo sa · Skúsiť znova“), dole pás Všetko je uložené
  const u = useUkladanie();
  const zmen = (p: Partial<NastavenieZvoncek>, pole: string) => u.sleduj([pole], ulozZvoncek(strankaId, { ...n, ...p }), () => ulozZvoncek(strankaId, nastavenieZvoncek(strankaId)));
  const dalsia = dalsiaOmsa(om.okno, strankaId);

  // ---- čísla (prázdne = 0) ----
  const teraz = om.dary.reduce((a, r) => a + r.suma, 0);
  const terazLudi = new Set(om.dary.map((r) => (r.moj ? "ja" : r.id))).size;
  const spolu = teraz + om.uzavrete.reduce((a, o) => a + o.suma, 0);
  const omsi = om.uzavrete.length + (om.dary.length ? 1 : 0);

  const pole = { height: 52, padding: "0 14px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", fontFamily: "inherit", fontSize: 16, fontWeight: 700, outline: "none", width: "100%", boxSizing: "border-box" } as const;
  const nastavenie = <>
    <section style={kartaK}>
      <span style={nadpisK}>Názov</span>
      <input value={n.nazov} onChange={(e) => zmen({ nazov: e.target.value.slice(0, HLAVNA_NAZOV_MAX) }, "nazov")} placeholder={ZVONCEK_NAZOV} aria-label="Názov zbierky" style={pole} />
      <span style={drobneK}>{n.nazov.length} / {HLAVNA_NAZOV_MAX} · prázdne = {ZVONCEK_NAZOV}</span>
      <UlozenePri u={u} pole="nazov" />
    </section>
    <section style={kartaK}><span style={nadpisK}>Text pre darcov</span>
      <TextovePolia popis={n.popis} popis2={n.popis2} onPopis={(x) => zmen({ popis: x }, "text")} onPopis2={(x) => zmen({ popis2: x }, "text")} ph={mobil} popisHlavneho="Toto ľudia uvidia pri zbierke hneď. Najviac 12 riadkov."
        placeholder="Napríklad: na kvety a sviece do kostola." bezPokracovania /* OPRAVY 313: pri zvončekovej stačí Hlavný text */ />
      <UlozenePri u={u} pole="text" /></section>
    <section style={kartaK}>
      <span style={nadpisK}>Poďakovanie</span>
      <input value={n.podakovanie ?? ""} onChange={(e) => zmen({ podakovanie: e.target.value.slice(0, 40) }, "podakovanie")} placeholder={slova.podakovanie} aria-label="Poďakovanie" style={pole} />
      <span style={drobneK}>Po každej omši pribudne v Hlavnej zbierke riadok:</span>
      <span style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15 }}>{om.okno ? riadokOmse(om.okno, strankaId) : "Ranná omša 7:00"}</b><span style={{ fontSize: 14, color: "var(--ink2)" }}>{pod}</span></span>
        <b style={{ flex: "none", fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{eur(120)}</b>
      </span>
      <span style={drobneK}>Pri 0 € riadok nepribudne. Prázdne = {slova.podakovanie}.</span>
      <UlozenePri u={u} pole="podakovanie" />
    </section>
    <section style={kartaK}>
      <span style={nadpisK}>Pri každej omši · dnes</span>
      {dnes.length ? dnes.sort((a, b) => a.m - b.m).map((o) => <span key={o.m} style={{ display: "flex", gap: 12, fontSize: 15 }}><b style={{ width: 52, fontVariantNumeric: "tabular-nums" }}>{o.cas}</b><span>{o.nazov}</span></span>)
        : <span style={textK}>{om.okno ? "Dnes v kalendári omša nie je." : "Najprv nastavte omše v Omšiach a kalendári."}</span>}
      {om.okno && <span style={drobneK}>Na stránke teraz: {nadpisOkna(om.okno)} · {dalsia}</span>}
    </section>
    <section style={kartaK}><SumyPriDarcoch stranka={strankaId} kluc="zvoncek" nadpis="Ukázať sumy pri darcoch" /></section>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <GaleriaEditor media={n.media} onMedia={(m) => zmen({ media: m }, "fotky")} ph={mobil} bezVidea nadpis="Titulná fotka a fotky" popisNapoveda="Popis (nepovinné)" dovetok=" Prvá fotka je titulná na karte. Pod fotku môžete napísať popis." />
      <UlozenePri u={u} pole="fotky" style={{ paddingRight: 8 }} />
    </div>
  </>;
  const vpravo = <>
    <section style={kartaK}>
      <span style={nadpisK}>Takto to uvidia ľudia na stránke farnosti</span>
      <div style={{ maxWidth: 420 }}><ZvoncekKarta strankaId={strankaId} nahlad /></div>
    </section>
    <AkoDarovat sada={n.sada} eurc={n.eurc} sadaE={n.sadaE} onZmena={(p) => zmen({ ...(p.sada != null ? { sada: p.sada } : {}), ...(p.eurc != null ? { eurc: p.eurc } : {}), ...(p.sadaE != null ? { sadaE: p.sadaE } : {}) }, "sumy")} bezi={!n.ukoncena} />
    <UlozenePri u={u} pole="sumy" style={{ paddingRight: 8, marginTop: -6 }} />
  </>;
  const cislo = (v: string, t: string) => <span key={t} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><b style={{ fontSize: 24, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={drobneK}>{t}</span></span>;
  const statistiky = <>
    <section style={kartaK}>
      <span style={nadpisK}>Teraz · {om.okno ? nadpisOkna(om.okno) : "najprv nastavte omše"}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>{cislo(eur(teraz), "vyzbierané")}{cislo(String(terazLudi), terazLudi === 1 ? "človek" : "ľudí")}</div>
      <span style={drobneK}>Po omši sa pripíše do Hlavnej zbierky jedným riadkom{dalsia ? `, ${dalsia}` : ""}.</span>
    </section>
    <section style={kartaK}>
      <span style={nadpisK}>Spolu</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>{cislo(eur(spolu), "vyzbierané")}{cislo(String(omsi), omsi === 1 ? "omša s darmi" : omsi >= 2 && omsi <= 4 ? "omše s darmi" : "omší s darmi")}</div>
      {om.uzavrete.length > 0 && <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--cardBd)", paddingTop: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "4px 0" }}>OMŠE V HLAVNEJ ZBIERKE</span>
        {om.uzavrete.map((o, i) => <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <b style={{ flex: 1, minWidth: 0, fontSize: 14.5 }}>{Number(o.den.slice(8))}. {Number(o.den.slice(5, 7))}. · {riadokOmse(o, strankaId)}</b>
          <span style={{ flex: "none", fontSize: 13.5, color: "var(--ink3)" }}>{o.darov} {o.darov === 1 ? "dar" : o.darov < 5 ? "dary" : "darov"}</span>
          <b style={{ flex: "none", fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}>{eur(o.suma)}</b>
        </div>)}
      </div>}
    </section>
  </>;
  const ukoncenie = hotovo
    ? <div role="status" style={{ padding: "16px 18px", borderRadius: 16, background: "var(--gSoft)", border: "2px solid var(--green)", display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: 17, color: "var(--gInk)" }}>{hotovo}</b>
        <span style={{ fontSize: 14.5, color: "var(--ink2)" }}>Vraciame vás do Správy zbierok.</span>
      </div>
    : <section style={kartaK}>
        <span style={nadpisK}>{n.ukoncena ? "Zbierka je ukončená" : "Ukončiť zvončekovú zbierku"}</span>
        <span style={textK}>{n.ukoncena
          ? "Na stránke farnosti sa neukazuje. Keď ju spustíte znova, ukáže sa s tým istým názvom, textom a fotkami."
          : `Na stránke farnosti sa prestane ukazovať. Čo sa vyzbieralo (${eur(spolu)}), ostáva v Hlavnej zbierke, nič sa nevracia.`}</span>
        <div style={{ ["--gGrad" as string]: n.ukoncena ? "linear-gradient(90deg,#4B7A35,#8DB866)" : undefined }}>
          <PodrzTlacidlo label={n.ukoncena ? "Podržte a spustite znova" : "Podržte a ukončite"} trvanie={1500}
            onConfirm={() => {
              const kon = !n.ukoncena;
              zmen({ ukoncena: kon }, "ukoncenie");
              setHotovo(kon ? `${nazovZvoncek(n)} je ukončená ✓` : `${nazovZvoncek(n)} beží ✓`);
              tm.current = window.setTimeout(onSpat, 1800);
            }} />
        </div>
        <span style={drobneK}>Držte prst na tlačidle, kým sa nenaplní.</span>
      </section>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={onSpat} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>‹ Späť</button>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--gInk)" }}>ZVONČEKOVÁ ZBIERKA · {n.ukoncena ? "UKONČENÁ" : "BEŽÍ"}</span>
          <b style={{ fontSize: mobil ? 19 : 22 }}>{nazovZvoncek(n)} · {om.okno ? nadpisOmse(om.okno) /* OPRAVY 313: bez druhu omše (je v podnadpise karty) */ : "najprv nastavte omše"}</b>
        </span>
        {tab === 0 && <UkladaSa />}
      </div>
      <Taby akt={tab} onTab={setTab} skryte={[1, 4]} />
      {tab === 0 && (mobil
        ? <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{nastavenie}{vpravo}</div>
        : <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>{nastavenie}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, position: "sticky", top: 12 }}>{vpravo}</div>
          </div>)}
      {tab === 0 && <PasUlozene u={u} onSpat={onSpat} mobil={mobil} />}
      {tab === 2 && statistiky}
      {tab === 3 && ukoncenie}
      {/* DEV panel — len testovacia verzia */}
      {TESTOVACIA && <div style={{ border: "1px dashed rgba(122,78,122,.45)", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 160, fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>DEV · test omše · {ludi(terazLudi)} pri tejto omši</span>
        <button type="button" disabled={!om.okno?.do} onClick={() => { void dalsiaOmsaTest(strankaId, om.okno).then((e) => toast(e ?? "Omša je zavretá (test). Darcovia sa vymazali, omša je v Hlavnej zbierke ako jeden dar.")); }} style={{ minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" }}>Zavrieť omšu (test)</button>
      </div>}
    </div>);
}
