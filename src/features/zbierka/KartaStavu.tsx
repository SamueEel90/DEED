// KARTA 04 · Karta stavu zbierky — s cieľom (suma, %, pruh) alebo bez cieľa (míľniky, posledný dar).
// Všetko z reálnych dát (základ zbierky + živé dary). Animácie len transform/opacity.
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useDarcovia, identitaDarcu, DARCOVIA_CFG, useSektorDarcu, useUkazSumy, type DarRiadok } from "@/lib/darcovia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { ludiaPomohli } from "./hlasky";
import { TempoDarov, type TempoRezim } from "./Tempo";
import { PrispievateliaFarnosti, useUsekyOrganizacii } from "./FarnostPrispela";
import { useKtoPrispel, usekyPruhu, LegendaPruhu, RiadkyKtoPrispel, type OrgZbierky } from "./KtoPrispel";
import { sumaEur } from "@/lib/suma";

// míľniky: počíta systém sám, nikto ich nenastavuje
const MILNIKY = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
export function milnikyPre(suma: number): { dosiahnuty: number | null; dalsi: number } {
  let dosiahnuty: number | null = null;
  for (const m of MILNIKY) { if (suma >= m) dosiahnuty = m; else return { dosiahnuty, dalsi: m }; }
  const nad = Math.floor(suma / 100000) * 100000; // ďalej každých 100 000 €
  return { dosiahnuty: nad, dalsi: nad + 100000 };
}

const eur = (n: number) => `${sumaEur(n)}`;
const dnesOd = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** suma v zozname len keď ju darca povolil a je nad 2 € (≤ 2 € nikdy) */
const sumaDaru = (r: DarRiadok) => r.omsa ? eur(r.suma) : (r.firma || (r.registrovany && r.zobrazSumu)) && r.suma > DARCOVIA_CFG.prahSumy ? eur(r.suma) : null; // OPRAVY 294: omša vždy so sumou

/** počítadlo naskakuje k novej hodnote (~0,7 s) */
function usePocitadlo(ciel: number): number {
  const [hodnota, setHodnota] = useState(ciel);
  const odkial = useRef(ciel);
  useEffect(() => {
    const start = odkial.current;
    if (start === ciel) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { odkial.current = ciel; setHodnota(ciel); return; }
    const t0 = performance.now(); let raf = 0;
    const krok = (t: number) => {
      const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3);
      const v = start + (ciel - start) * e;
      odkial.current = v; setHodnota(p >= 1 ? ciel : Math.round(v * 100) / 100);
      if (p < 1) raf = requestAnimationFrame(krok);
    };
    raf = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(raf);
  }, [ciel]);
  return hodnota;
}

/** pruh cez transform: scaleX — pri prvom vykreslení rastie od 0 */
function Pruh({ podiel, vyska, blik, koniec, useky = [] }: { podiel: number; vyska: number; blik?: number; koniec?: RefObject<HTMLDivElement>; /** OPRAVY 222: úseky organizácií zľava (vlastné tmavozelené, partner zlatý) */ useky?: { w: number; farba: string }[] }) {
  const [p, setP] = useState(0);
  useEffect(() => { const r = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, podiel)))); return () => cancelAnimationFrame(r); }, [podiel]);
  return (
    <>
    <div style={{ position: "relative", height: vyska, borderRadius: 10, background: "var(--track)", overflow: "hidden" }}>
      {useky.length > 0 && <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", pointerEvents: "none", transformOrigin: "0 50%", transform: `scaleX(${p > 0 ? 1 : 0})`, transition: "transform .6s" }}>
        {useky.map((u, i) => <span key={i} style={{ flex: "none", width: `${Math.max(0, Math.min(1, u.w)) * 100}%`, height: "100%", background: u.farba }} />)}
      </div>}
      <div key={blik} className={`zb-pruh${blik ? " zb-blik" : ""}`}
        style={{ height: "100%", borderRadius: 10, background: "var(--hcPruh, linear-gradient(90deg, #4B7A35, #8DB866))", transformOrigin: "0 50%", transform: `scaleX(${p})` }} />
    </div>
    {/* koniec pruhu — sem letí svetielko pri mikrodare (animacie.ts, [data-bar-end]) */}
    <div style={{ position: "relative", height: 0 }}><div ref={koniec} data-bar-end style={{ position: "absolute", top: -vyska / 2, left: `${Math.max(0, Math.min(1, podiel)) * 100}%`, width: 0, height: 0 }} /></div>
    </>
  );
}

const fanusikovia = (n: number) => n === 1 ? "1 fanúšik pomohol" : n >= 2 && n <= 4 ? `${n} fanúšikovia pomohli` : `${n} fanúšikov pomohlo`;
const organizacie = (n: number) => n === 1 ? "1 organizácia" : n >= 2 && n <= 4 ? `${n} organizácie` : `${n} organizácií`;
const ludiaNom = (n: number) => n === 1 ? "1 človek" : n >= 2 && n <= 4 ? `${n} ľudia` : `${n} ľudí`;
/** „38 ľudí a 1 organizácia pomohli“ (organizácia = partner, nie vlastné peniaze) */
const ludiaAOrg = (n: number, o: number) => !o ? ludiaPomohli(n) : !n ? `${organizacie(o)} ${o === 1 ? "pomohla" : o <= 4 ? "pomohli" : "pomohlo"}` : `${ludiaNom(n)} a ${organizacie(o)} pomohli`;
function Ludia({ pocet, fanusikov, org = 0, cezSkutok = 0 }: { pocet: number; fanusikov?: boolean; org?: number; /** OPRAVY 490 */ cezSkutok?: number }) {
  if (pocet + org <= 0) return null; // OPRAVY 415: bez darov ani „0 ľudí pomohlo“, ani „rastie naživo“
  return (<>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, color: "var(--ink3)" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      <span style={{ flex: 1, minWidth: 0 }}>{(fanusikov ? fanusikovia(pocet) : ludiaAOrg(pocet, org)).replace(/^(\d+) /, "$1\u00A0")}</span>
      <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, color: "var(--green)", fontWeight: 700, whiteSpace: "nowrap" }}>
        <span className="zb-pulz" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />
        rastie naživo
      </span>
    </div>
    {cezSkutok > 0 && <div style={{ marginTop: 4, paddingLeft: 22, fontSize: 12.5, color: "var(--ink3)" }}>z toho <span style={{ whiteSpace: "nowrap", fontWeight: 700, color: "var(--ink2)" }}>{eur(cezSkutok)}</span> cez skutok</div>}
    </>
  );
}

export function KartaStavu({ refId, zaklad, ciel, ludiaZaklad, tempo = false, koniecPruhu, cezTvorcu, skryta, bezMilnikov, organizacia }: {
  /** OPRAVY 490: organizácia, ktorá zbiera — logo a štít pri vlastnom vklade a pri skutku */
  organizacia?: OrgZbierky;
  /** OPRAVY 388: zvončeková zbierka — nemá cieľ ani míľniky, len suma */
  bezMilnikov?: boolean;
  /** KARTA 57C §4 · OPRAVY 181: pohrebná zbierka — len rozmazaná suma a „suma sa ukáže po vašom dare“; bez míľnika a Posledného daru */
  skryta?: boolean;
  /** karta 13 — karta stavu „cez tvorcu": len dary cez neho, jeho suma je vždy vlastná */
  cezTvorcu?: { id: string; menoAkuzativ: string };
  refId: string;
  tempo?: TempoRezim;    // karta 05 — vnútri karty pod pruhom
  koniecPruhu?: RefObject<HTMLDivElement>;
  zaklad: number;        // vyzbierané mimo zoznamu živých darov (z dát zbierky)
  ciel?: number | null;  // bez cieľa → míľniky
  ludiaZaklad: number;
}) {
  const vsetkyDary = useDarcovia(refId);
  const dary = cezTvorcu ? vsetkyDary.filter((r) => r.cezTvorcu === cezTvorcu.id) : vsetkyDary;
  const ja = usePouzivatel();
  const sektor = useSektorDarcu();
  const ukazSumy = useUkazSumy();
  const suma = (cezTvorcu ? 0 : zaklad) + dary.reduce((a, r) => a + r.suma, 0);
  const org = useUsekyOrganizacii(refId);
  // OPRAVY 490: kto prispel — organizácia → firmy → reťaze → skutky → ľudia (úseky pruhu, legenda, riadky)
  const kto = useKtoPrispel(refId, dary, organizacia);
  // OPRAVY 222: dary organizácií (farnosť, vlastné peniaze) nie sú ľudia
  const ludia = Math.max(0, (cezTvorcu ? 0 : ludiaZaklad) + dary.filter((r) => !r.firma).length - (cezTvorcu ? 0 : org.darovOrg));
  const nadpisVyzbierane = cezTvorcu ? `Vyzbierané cez ${cezTvorcu.menoAkuzativ}` : "Vyzbierané";
  const zobrazena = usePocitadlo(suma);
  const maCiel = ciel != null && ciel > 0;

  // míľnik: pri dosiahnutí pruh zablikne naplnený, potom sa plní k ďalšiemu
  const { dosiahnuty, dalsi } = milnikyPre(suma);
  const predosly = useRef(dosiahnuty);
  const [oslava, setOslava] = useState(0);
  useEffect(() => {
    if (dosiahnuty !== predosly.current && (dosiahnuty ?? 0) > (predosly.current ?? 0)) {
      setOslava(Date.now());
      const t = setTimeout(() => setOslava(0), 900);
      predosly.current = dosiahnuty;
      return () => clearTimeout(t);
    }
    predosly.current = dosiahnuty;
  }, [dosiahnuty]);

  const karta: CSSProperties = { margin: "0 0 12px", borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: maCiel ? "18px 18px 14px" : "16px 18px 14px" };
  const velka: CSSProperties = { fontSize: 32, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: "var(--ink)" };

  if (maCiel && cezTvorcu) {
    return (
      <div style={karta}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>{nadpisVyzbierane}</div>
        <div style={{ ...velka, marginTop: 2, marginBottom: 12 }} data-zb-suma={refId}>{eur(zobrazena)}</div>
        <Pruh podiel={suma / ciel!} vyska={10} koniec={koniecPruhu} />
        <TempoDarov refId={refId} rezim={tempo} cezTvorcu={cezTvorcu.id} />
        <Ludia pocet={ludia} fanusikov />
      </div>
    );
  }
  if (maCiel) {
    const pct = Math.floor((suma / ciel!) * 100);
    return (
      <div style={karta}>
        {/* OPRAVY 257: číslo a jednotka sa nikdy nerozdelia; keď sa riadok nezmestí, „z 500 € · 2 %“ ide celé pod sumu */}
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "2px 8px", marginBottom: 12 }}>
          <span style={{ ...velka, whiteSpace: "nowrap" }} data-zb-suma={refId}>{eur(zobrazena)}</span>
          <span style={{ flex: "1 0 auto", display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 14, color: "var(--ink3)" }}>z{"\u00A0"}{eur(ciel!)}</span>
            <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 800, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{pct}{"\u00A0"}%</span>
          </span>
        </div>
        <Pruh podiel={suma / ciel!} vyska={10} koniec={koniecPruhu} useky={usekyPruhu(kto.riadky, ciel!)} />
        <LegendaPruhu riadky={kto.riadky} ludia={ludia > 0} />
        <RiadkyKtoPrispel riadky={kto.riadky} />
        <TempoDarov refId={refId} rezim={tempo} />
        <Ludia pocet={ludia} org={org.organizacii} cezSkutok={kto.cezSkutok} />
      </div>
    );
  }

  if (skryta) {
    const odhalena = dary.some((r) => r.moj);
    return (
      <div style={karta}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>{nadpisVyzbierane}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2 }}>
          <div style={{ ...velka, filter: odhalena ? "none" : "blur(9px)", userSelect: odhalena ? undefined : "none" }} aria-hidden={odhalena ? undefined : true} data-zb-suma={refId}>{eur(odhalena ? zobrazena : 0)}</div>
          {!odhalena && <span style={{ fontSize: 13, lineHeight: 1.35, fontWeight: 700, color: "var(--ink3)" }}>suma sa ukáže<br />po vašom dare</span>}
        </div>
        {/* OPRAVY 222: pri zbierke rodiny bez sumy — „Prispela aj Farnosť …“ */}
        <PrispievateliaFarnosti refId={refId} rodina />
        <Ludia pocet={ludia} org={org.organizacii} />
      </div>
    );
  }
  const dnes = dary.filter((r) => r.cas >= dnesOd()).reduce((a, r) => a + r.suma, 0);
  const posledny = dary[0];
  const zakladMilnika = oslava ? 1 : suma / dalsi;
  return (
    <div style={karta}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>{nadpisVyzbierane}</div>
      <div style={{ ...velka, marginTop: 2 }} data-zb-suma={refId}>{eur(zobrazena)}</div>
      {dnes > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", marginTop: 4 }}>dnes +{eur(dnes)}</div>}
      {bezMilnikov ? <div ref={koniecPruhu} style={{ height: 0 }} /> : <>
      <div style={{ marginTop: 12 }}><Pruh podiel={zakladMilnika} vyska={6} blik={oslava || undefined} koniec={koniecPruhu}
        useky={cezTvorcu || oslava ? [] : usekyPruhu(kto.riadky, dalsi)} /></div>
      {!cezTvorcu && !oslava && <LegendaPruhu riadky={kto.riadky} ludia={ludia > 0} />}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>
        <span>{dosiahnuty ? `míľnik ${eur(dosiahnuty)} dosiahnutý` : "prvý míľnik"}</span>
        <span>ďalší míľnik <span style={{ color: "var(--green)" }}>{eur(dalsi)}</span></span>
      </div></>}
      {posledny && (
        <div key={posledny.id} className="zb-novy" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, background: "var(--bg)", border: "1px solid var(--cardBd)", borderRadius: 12, padding: "8px 12px" }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", flex: "none" }}>POSLEDNÝ DAR</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{identitaDarcu(posledny, ja, sektor)}</span>
          {(ukazSumy || posledny.omsa) && sumaDaru(posledny) && <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)", flex: "none", fontVariantNumeric: "tabular-nums" }}>{sumaDaru(posledny)}</span>}
        </div>
      )}
      {!cezTvorcu && <RiadkyKtoPrispel riadky={kto.riadky} />}
      <TempoDarov refId={refId} rezim={tempo} cezTvorcu={cezTvorcu?.id} />
      <Ludia pocet={ludia} fanusikov={!!cezTvorcu} org={cezTvorcu ? 0 : org.organizacii} cezSkutok={cezTvorcu ? 0 : kto.cezSkutok} />
    </div>
  );
}
