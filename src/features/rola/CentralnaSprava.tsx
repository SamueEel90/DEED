// ============================================================
// KARTA 39 · bod 3 — Centrálna zbierka organizácie (Správa charity → Zbierky → Centrálna zbierka, od P1).
// Na celú činnosť · stále hore na stránke · nikdy vo verejnom feede · nie je zapečatená.
// Textové polia + galéria = spoločné diely (obsahZbierky). Účet = hlavný z registrácie, zmena len
// s novým overením (overovacia platba). Dokladovanie nepovinné (Doklady ako pri zbierke, bez povinného minima).
// Vzhľad podľa prototypu Sprava charity PC → P1 → Zbierky → Centrálna zbierka.
// ============================================================
import { useEffect, useState, type CSSProperties } from "react";
import { OrezFotky } from "@/components/orezfotky";
import { profilZPamate, nacitajProfil } from "@/lib/profilStranky";
import { SADY } from "@/lib/novaZbierka";
import { prazdnaCentralna, centralnaZPamate, nacitajCentralnuZbierku, ulozCentralnuZbierku, type CentralnaZbierka } from "@/lib/centralnaZbierka";
import { nacitajStav, ulozStav, type StavZbierky } from "@/lib/zbierkaSprava";
import { sucetDarov } from "@/lib/darcovia";
import { Zamok, Media, Volby, panel, pole, cistyText, GaleriaEditor, TextovePolia } from "./obsahZbierky";
import { OverenieUctu, useOverenieUctu, ibanPlatny } from "./OverenieUctu";
import { DokladyCharity } from "./SpravaZbierky";
import { Titulka } from "./titulka";

const karta: CSSProperties = { ...panel, gap: 12 };
const nadpisS: CSSProperties = { fontSize: 17, fontWeight: 800, color: "var(--ink)" };
const textS: CSSProperties = { fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" };
const odkazS: CSSProperties = { alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--green)" };

export function CentralnaZbierkaSprava({ strankaId, nazov, inicialy, hlavnyUcet, mobil, tablet, toast }: {
  strankaId: string; nazov: string; inicialy: string; hlavnyUcet: string; mobil: boolean; tablet: boolean; toast: (m: string) => void;
}) {
  const ph = mobil && !tablet;
  const [d, setD] = useState<CentralnaZbierka>(() => centralnaZPamate(strankaId) ?? prazdnaCentralna());
  const [zmenene, setZmenene] = useState(false);
  useEffect(() => { let ziva = true; void nacitajCentralnuZbierku(strankaId).then((c) => { if (ziva && c && !zmenene) setD(c); }); return () => { ziva = false; }; }, [strankaId]); // eslint-disable-line react-hooks/exhaustive-deps
  const zmen = (z: Partial<CentralnaZbierka>) => { setZmenene(true); setD((x) => ({ ...x, ...z })); };
  const [profil, setProfil] = useState(() => profilZPamate(strankaId).ulozeny);
  useEffect(() => { let ziva = true; void nacitajProfil(strankaId).then((z) => { if (ziva) setProfil(z.ulozeny); }); return () => { ziva = false; }; }, [strankaId]);
  const [vyrezId, setVyrezId] = useState<number | null>(null);
  const [novyUcet, setNovyUcet] = useState<string | null>(null);
  const overenie = useOverenieUctu(strankaId, novyUcet ?? "");
  const [pohlad, setPohlad] = useState<"sprava" | "doklady">("sprava");
  const idZbierky = `${strankaId}-centralna`;
  const [stav, setStav] = useState<StavZbierky>(() => nacitajStav(idZbierky) ?? { stav: "aktivna", koniec: new Date(Date.now() + 3650 * 86400000).toISOString(), predlzenia: 0, lehota: "30", text: "", fotky: [], doklady: [], spravy: [] });
  const zmenStav = (p: Partial<StavZbierky>) => setStav((x) => { const n = { ...x, ...p }; ulozStav(idZbierky, n); return n; });

  const uloz = async () => { await ulozCentralnuZbierku(strankaId, d); setZmenene(false); toast("Centrálna zbierka je uložená"); };
  const ulozBtn = <button type="button" onClick={() => void uloz()} aria-disabled={!zmenene} style={{ height: 50, padding: "0 22px", border: "none", borderRadius: 14, background: zmenene ? "var(--green)" : "#CFC9BC", color: zmenene ? "#fff" : "#6B6C62", cursor: zmenene ? "pointer" : "default", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, flex: ph ? 1 : "none" }}>Uložiť zmeny</button>;
  const nazovZb = `${nazov} — celá organizácia`;

  // ---- výrez fotky ----
  const vyrezM = vyrezId != null ? d.media.find((m) => m.id === vyrezId) : null;
  if (vyrezM) return (
    <section style={{ ...panel, gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 22, fontWeight: 800 }}>Výrez fotky</span><span style={{ fontSize: 14, color: "var(--ink2)" }}>{ph ? "Posuňte prstom, kam treba." : "Takto bude fotka vyzerať v zbierke. Chyťte ju myšou a posuňte, kam treba."}</span></div>
      <OrezFotky sprava src={vyrezM.src} pomer={16 / 9} vyrez={vyrezM.vyrez} onZrusit={() => setVyrezId(null)}
        onVyrez={(v) => { zmen({ media: d.media.map((m) => (m.id === vyrezM.id ? { ...m, vyrez: v } : m)) }); setVyrezId(null); }} />
    </section>);

  // ---- doklady (nepovinné) ----
  if (pohlad === "doklady") return (<>
    <button type="button" onClick={() => setPohlad("sprava")} style={{ ...odkazS, fontSize: 15 }}>‹ Späť na centrálnu zbierku</button>
    <DokladyCharity zbierkaId={idZbierky} s={stav} zmen={zmenStav} vyzbierane={sucetDarov(idZbierky).suma} teraz={Date.now()} mobil={!!mobil && !tablet} toast={toast} nepovinne />
  </>);

  // ---- náhľad: takto ju uvidia ľudia na stránke ----
  const hl = d.media[0];
  const nahlad = (
    <section style={karta}>
      <span style={nadpisS}>Takto ju uvidia ľudia na vašej stránke</span>
      <div style={{ borderRadius: 18, overflow: "hidden", background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        <div style={{ position: "relative" }}>
          {hl ? <span style={{ display: "block", aspectRatio: "16 / 9", overflow: "hidden", background: "#1D211B" }}><Media m={hl} /></span>
            : profil?.cover ? <Titulka cover={profil.cover} ram={profil.ram} radius={0} />
            : <span style={{ display: "block", aspectRatio: "16 / 9", background: "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)" }} />}
          <span style={{ position: "absolute", left: 16, bottom: -22, width: 54, height: 54, borderRadius: 14, background: profil?.logo ? `url('${profil.logo}') center/cover no-repeat #fff` : "#fff", border: "2px solid var(--field)", boxShadow: "0 2px 8px rgba(0,0,0,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "var(--gInk)" }}>{profil?.logo ? "" : inicialy}</span>
        </div>
        <div style={{ padding: "30px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <b style={{ fontSize: 17, color: "var(--ink)" }}>{nazovZb}</b>
          <span style={{ ...textS, fontSize: 14.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cistyText(d.popis) || "Hlavný text centrálnej zbierky"}</span>
          {cistyText(d.popis2) && <span style={{ fontSize: 14, fontWeight: 800, color: "var(--green)" }}>… viac</span>}
        </div>
      </div>
    </section>);

  const vlavo = (<>
    {nahlad}
    <GaleriaEditor media={d.media} onMedia={(m) => zmen({ media: m })} ph={ph} onVyrez={setVyrezId} nadpis="Fotky a video" dovetok=" Kým nič nepridáte, ukáže sa titulná fotka profilu s logom." />
    <section style={karta}>
      <span style={nadpisS}>Text</span>
      <span style={{ ...textS, marginTop: -4 }}>Dôvod ani účel tu netreba, zbierka je na celú činnosť.</span>
      <TextovePolia popis={d.popis} popis2={d.popis2} onPopis={(h) => zmen({ popis: h })} onPopis2={(h) => zmen({ popis2: h })} ph={ph} popisHlavneho="Toto ľudia uvidia hneď. Najviac 12 riadkov." />
    </section>
  </>);

  const ucet = d.ucet ?? hlavnyUcet;
  const vpravo = (<>
    <section style={karta}>
      <span style={nadpisS}>Kde sa ukáže</span>
      <span style={textS}><b style={{ color: "var(--ink)" }}>Stále hore na vašej stránke.</b> Do verejného feedu nejde nikdy. Ľudia ju nájdu, keď prídu na váš profil, napríklad zo skutku alebo zo zbierky.</span>
    </section>
    <section style={karta}>
      <span style={nadpisS}>Účet</span>
      <div style={{ ...pole, display: "flex", alignItems: "center", gap: 10, background: "var(--field)", color: "var(--ink2)" }}><Zamok s={15} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ucet}</span></div>
      <span style={textS}>{d.ucet ? "Overený účet organizácie." : "Hlavný účet organizácie z registrácie."}</span>
      {novyUcet == null ? <button type="button" onClick={() => setNovyUcet("")} style={odkazS}>Zmeniť účet · nové overenie ›</button> : <>
        <input value={novyUcet} onChange={(e) => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24); setNovyUcet(v.replace(/(.{4})/g, "$1 ").trim()); }} placeholder="SK00 0000 0000 0000 0000 0000" aria-label="Nový účet" style={pole} />
        {!ibanPlatny(novyUcet) && <span style={{ fontSize: 13, color: "var(--ink3)" }}>IBAN má 24 znakov a začína SK.</span>}
        <OverenieUctu stranka={strankaId} iban={novyUcet} ph={ph} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setNovyUcet(null)} style={{ height: 48, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)" }}>Zrušiť</button>
          {overenie?.stav === "overeny" && <button type="button" onClick={() => { zmen({ ucet: novyUcet }); setNovyUcet(null); }} style={{ height: 48, padding: "0 18px", border: "none", borderRadius: 14, background: "var(--green)", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>Použiť tento účet</button>}
        </div>
      </>}
    </section>
    <section style={karta}>
      <span style={nadpisS}>Rýchle sumy v eurách</span>
      <Volby stlpce={3} vyska={60} value={d.sada} onChange={(i) => zmen({ sada: i })} moznosti={SADY.map(([t, a], i) => ({ k: i, t, s: `${a.join(" · ")} €` }))} />
      <span style={textS}>Vlastnú sumu môže darca zadať vždy. Sumy pod 3 € idú len cez SEPA.</span>
    </section>
    <section style={karta}>
      <span style={nadpisS}>Dary v EURC</span>
      <Volby stlpce={2} vyska={56} value={d.eurc} onChange={(v) => zmen({ eurc: v })} moznosti={[{ k: true, t: "Áno", s: "prijímame EURC" }, { k: false, t: "Nie", s: "len eurá" }]} />
      {d.eurc && <>
        <b style={{ fontSize: 15, color: "var(--ink)" }}>Rýchle sumy v EURC</b>
        <Volby stlpce={3} vyska={60} value={d.sadaE} onChange={(i) => zmen({ sadaE: i })} moznosti={SADY.map(([t, a], i) => ({ k: i, t, s: `${a.join(" · ")} EURC` }))} />
      </>}
      <span style={textS}>EURC je digitálne euro, 1 EURC = 1 €. Sumy môžete kedykoľvek zmeniť.</span>
    </section>
    <section style={karta}>
      <span style={nadpisS}>Doklady</span>
      <span style={textS}><b style={{ color: "var(--ink)" }}>Nepovinné.</b> Kedykoľvek môžete ukázať, na čo išli peniaze. Darcovia to uvidia pri zbierke.</span>
      <button type="button" onClick={() => setPohlad("doklady")} style={{ alignSelf: "flex-start", height: 48, padding: "0 20px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)" }}>Pridať doklad</button>
    </section>
  </>);

  return (<>
    <div style={{ display: "flex", alignItems: ph ? "stretch" : "center", flexDirection: ph ? "column" : "row", gap: 12 }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: ph ? 22 : 24, fontWeight: 800, color: "var(--ink)" }}>Centrálna zbierka organizácie</span>
        <span style={{ fontSize: 14, color: "var(--ink3)" }}>na celú vašu činnosť · stále hore na vašej stránke · nikdy vo verejnom feede</span>
      </span>
      {!ph && ulozBtn}
    </div>
    {mobil && !tablet
      ? <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{vlavo}{vpravo}</div>
      : <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{vlavo}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{vpravo}</div>
      </div>}
    {ph && <div style={{ display: "flex" }}>{ulozBtn}</div>}
  </>);
}
