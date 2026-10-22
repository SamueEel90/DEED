// ============================================================
// OPRAVY 473 · Správa zbierky charity po spustení — zapečatené (PRAVIDLA-APPKY „Zbierka charity po spustení“, migrácia 0155)
// (1) Text pre darcov: pôvodný len na čítanie, pod ním doplnenia s dátumom; „+ Doplniť text“ → Podržte a zapečaťte.
// (2) Fotky a video: pôvodné bez koša, šípok a „Hlavné“; nové len na koniec → Podržte a zapečaťte.
// „zapečatené ✓“ až po potvrdení servera, pri chybe hláška + Skúsiť znova.
// ============================================================
import { useState, type CSSProperties } from "react";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { ChybaPriTlacidle } from "@/components/ChybaPriTlacidle";
import { sanitizujHtml } from "@/lib/richtext";
import { zapecatDoplnenie, datumDoplnenia, doplnenieInline, zbierkyStrankyZPamate, useZmenyZbierok, type DoplnenieZbierky, type MediumZbierky } from "@/lib/novaZbierka";
import { TextovePolia, GaleriaEditor, Zamok, Ik, I, cistyText } from "./obsahZbierky";
import { kartaK, nadpisK } from "./spravaCasti";

export const DOPLNENIE_MAX = 400;
/** odseky bez okrajov prehliadača (karta má vlastné medzery) */
const bezOkrajov = (h: string) => h.replace(/<p>/g, '<p style="margin:0 0 6px">');

const zamokS: CSSProperties = { flex: "none", display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 10px", borderRadius: 13, background: "var(--btn)", color: "var(--ink2)", fontSize: 12.5, fontWeight: 800 };
const htmlS: CSSProperties = { fontSize: 15, lineHeight: 1.55, color: "var(--ink)", overflowWrap: "anywhere", margin: 0 };
const okS: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "var(--gInk)" };
const plusS: CSSProperties = { alignSelf: "flex-start", minHeight: 48, padding: "0 18px", borderRadius: 14, border: "2px dashed var(--gBd)", background: "transparent", color: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800 };
const zrusS: CSSProperties = { minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink2)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800 };

type Zdroj = { id: string; stranka?: string; popis?: string; popis2?: string; media?: MediumZbierky[] };

/** spustená zbierka z pamäte (server) — ukážková zbierka v testovacom režime ostáva len na tejto obrazovke */
function useZapecatena(z: Zdroj) {
  useZmenyZbierok();
  const real = z.stranka ? zbierkyStrankyZPamate(z.stranka).find((x) => x.id === z.id) : undefined;
  const [lokal, setLokal] = useState<{ doplnenia: DoplnenieZbierky[]; media: MediumZbierky[] }>({ doplnenia: [], media: [] });
  const popis = real?.popis ?? z.popis ?? "", popis2 = real?.popis2 ?? z.popis2 ?? "";
  const media = real ? real.media : [...(z.media ?? []), ...lokal.media];
  const doplnenia = real ? real.doplnenia ?? [] : lokal.doplnenia;
  const uloz = async (p: { doplnenie?: string; media?: MediumZbierky[] }): Promise<string | null> => {
    if (real && z.stranka) return zapecatDoplnenie(z.stranka, z.id, p);
    setLokal((x) => ({ doplnenia: p.doplnenie ? [...x.doplnenia, { datum: new Date().toISOString().slice(0, 10), text: p.doplnenie }] : x.doplnenia, media: p.media ? [...x.media, ...p.media] : x.media }));
    return null;
  };
  return { popis, popis2, media, doplnenia, uloz };
}

export function ZapecatenyText({ z, mobil }: { z: Zdroj; mobil: boolean }) {
  const { popis, popis2, doplnenia, uloz } = useZapecatena(z);
  const [pise, setPise] = useState(false);
  const [text, setText] = useState("");
  const [stav, setStav] = useState<"" | "uklada" | "ok">("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [prazdne, setPrazdne] = useState(false);
  const dlzka = cistyText(text).length;
  const zapecat = async () => {
    if (stav === "uklada") return;
    if (!dlzka) { setPrazdne(true); return; }
    if (dlzka > DOPLNENIE_MAX || text.length > 1000) { setChyba(`Doplnenie je dlhé. Najviac ${DOPLNENIE_MAX} znakov, jedna až dve vety.`); return; }
    setChyba(null); setStav("uklada");
    const ch = await uloz({ doplnenie: sanitizujHtml(text) });
    if (ch) { setChyba(ch); setStav(""); return; }
    setText(""); setPise(false); setPrazdne(false); setStav("ok");
  };
  return (
    <section style={kartaK}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={nadpisK}>Text pre darcov</span>
        <span style={zamokS}><Zamok s={13} />Zapečatené pri spustení</span>
      </div>
      <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={htmlS} dangerouslySetInnerHTML={{ __html: bezOkrajov(sanitizujHtml(popis)) || "Bez textu" }} />
        {cistyText(popis2) && <>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>POKRAČOVANIE PRÍBEHU</span>
          <div style={htmlS} dangerouslySetInnerHTML={{ __html: bezOkrajov(sanitizujHtml(popis2)) }} />
        </>}
        {doplnenia.map((d, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingTop: 10, borderTop: "1px solid var(--cardBd)" }}>
            <span style={{ color: "var(--ink3)", display: "flex", marginTop: 3 }}><Zamok s={13} /></span>
            <div style={{ ...htmlS, minWidth: 0 }}><b>Doplnené {datumDoplnenia(d.datum)}:</b> <span dangerouslySetInnerHTML={{ __html: doplnenieInline(d.text) }} /></div>
          </div>))}
      </div>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Pôvodný text sa po spustení nemení. Doplniť ho môžete novým riadkom s dátumom. Uložené doplnenie sa nedá prepísať ani zmazať.</span>
      {stav === "ok" && !pise && <span role="status" style={okS}><Ik d={I.fajka} s={16} w={2.8} />Doplnenie je zapečatené a na stránke ho vidí každý.</span>}
      {!pise ? <button type="button" onClick={() => { setPise(true); setStav(""); }} style={plusS}>+ Doplniť text</button> : <>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 2, borderRadius: 14, outline: prazdne && !dlzka ? "2px solid #A34A2A" : "none", outlineOffset: 4 }}>
          <TextovePolia popis={text} popis2="" onPopis={(h) => { setText(h); setChyba(null); }} onPopis2={() => {}} ph={mobil} bezPokracovania
            nadpis1="Doplnenie textu" popis1="Jedna až dve vety. Na stránke bude pod pôvodným textom s dnešným dátumom." placeholder="Napríklad: Kuchyňu sme už objednali, pribudli dvaja dobrovoľníci." />
        </div>
        {prazdne && !dlzka && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "#A34A2A" }}>Napíšte sem doplnenie. Potom znova podržte tlačidlo.</span>}
        <ChybaPriTlacidle text={chyba} uklada={stav === "uklada"} onZnova={() => void zapecat()} nadpis="Doplnenie sa nezapečatilo" />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ flex: mobil ? "1 1 100%" : "0 1 320px" }}><PodrzTlacidlo label={stav === "uklada" ? "Zapečaťuje sa…" : "Podržte a zapečaťte"} trvanie={1500} onConfirm={() => void zapecat()} /></span>
          <button type="button" onClick={() => { setPise(false); setText(""); setChyba(null); setPrazdne(false); }} style={{ ...zrusS, flex: mobil ? "1 1 100%" : "none" }}>Zrušiť</button>
        </div>
      </>}
    </section>);
}

export function ZapecateneFotky({ z, mobil }: { z: Zdroj; mobil: boolean }) {
  const { media, uloz } = useZapecatena(z);
  const [nove, setNove] = useState<MediumZbierky[]>([]);
  const [stav, setStav] = useState<"" | "uklada" | "ok">("");
  const [chyba, setChyba] = useState<string | null>(null);
  const zapecat = async () => {
    if (stav === "uklada" || !nove.length) return;
    setChyba(null); setStav("uklada");
    const ch = await uloz({ media: nove });
    if (ch) { setChyba(ch); setStav(""); return; }
    setNove([]); setStav("ok");
  };
  return (
    <GaleriaEditor media={[...media, ...nove]} pevne={media.length} onMedia={(m) => { setNove(m.slice(media.length)); setStav(""); setChyba(null); }} ph={mobil} nadpis="Fotky a video" popisNapoveda="Popis (nepovinné), napríklad Pred opravou" dovetok="">
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Pôvodné fotky a video sú zapečatené pri spustení. Nové pridáte za ne, po zapečatení sa už nedajú zmazať.</span>
      {stav === "ok" && !nove.length && <span role="status" style={okS}><Ik d={I.fajka} s={16} w={2.8} />Nové fotky sú zapečatené a na stránke ich vidí každý.</span>}
      {nove.length > 0 && <>
        <ChybaPriTlacidle text={chyba} uklada={stav === "uklada"} onZnova={() => void zapecat()} nadpis="Fotky sa nezapečatili" />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ flex: mobil ? "1 1 100%" : "0 1 320px" }}><PodrzTlacidlo label={stav === "uklada" ? "Zapečaťuje sa…" : `Podržte a zapečaťte (${nove.length})`} trvanie={1500} onConfirm={() => void zapecat()} /></span>
          <button type="button" onClick={() => { setNove([]); setChyba(null); }} style={{ ...zrusS, flex: mobil ? "1 1 100%" : "none" }}>Zrušiť nové</button>
        </div>
      </>}
    </GaleriaEditor>);
}
