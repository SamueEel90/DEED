// <ZbierkaModul> — JEDEN komponent pre detail zbierky + platbu na všetkých miestach (karta 01).
// Pripojené položky v pevnom poradí (nastavenie.ts), odpojené sa nevykresľujú vôbec.
import { TESTOVACIA } from "@/lib/testovacia";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type React from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Switch } from "@/shared";
import { pressable } from "@/components/pressable";
import { jeNeregistrovany, nastavNeregistrovany, darujemAkoFirma, nastavDarcuFirmu, sledujDarcu } from "@/lib/devDarca";
import { pridajDar, darcoviaPre } from "@/lib/darcovia";
import { dorovnanieNaDar, dorovnanieKDaru, useZmenyDorovnani } from "@/lib/dorovnanie";
import { MIESTA, POLOZKY, pripojene, type Miesto, type Kontext } from "./nastavenie";
import { KamIdeDar, CelaZbierka, type TvorcaData } from "./Tvorca";
import { PodporitDeedHarok, PodporitDeedObsah } from "./PodporitDeed";
import { Hlavicka, Galeria, NadpisText, type Medium } from "./Vrch";
import { PoleOrganizacie, type OrgPole } from "./Pole";
import { KartaStavu } from "./KartaStavu";
import { RychleSumyEur, DeedDlazdice, VlastnaSuma, DaryVKrypte, type OtvorPlatbu } from "./Sumy";
import { PlatobneOkno, potvrditTuknutim, nastavPotvrditTuknutim } from "./Platba";
import type { KanalPlatby } from "./Sumy";
import { ZdielatRiadok, PravidelnaRiadok, OblubenePodporit, ZapojitFirmuRiadok, RetazRiadok, KartaDorovnava, Darcovia } from "./Riadky";
import { ZdielatHarok, Harok } from "./Zdielat";
import { NahlasitSheet } from "@/components/nahlasit";
import { firmaAkoDarca } from "@/lib/podpory";
import { PravidelnaHarok } from "./PravidelnaHarok";
import { RetazDobraHarok } from "./RetazDobra";
import { DorovnanieFirmyHarok } from "./DorovnanieFirmy";
import { STUPNE, nastavDevTempo, useDevTempo, type Stupen } from "./tempoStupen";
import type { TempoRezim } from "./Tempo";
import type { StavKroku } from "@/lib/cesta";
import "@/styles/platba.css";
import "@/styles/animacie.css";

export type ZbierkaData = {
  id: string; nazov: string; popis?: string;
  cislo?: number;      // verejné číslo zbierky (#47 821) — len keď ho zbierka má
  overena?: boolean;
  media?: Medium[];    // poradie volí autor (predvolene video prvé)
  organizacia?: OrgPole; // kto za zbierku zodpovedá / kto ju overil (karta 03)
  /** karta 03: overovateľ zbierky a pri split dare ostatné charity — každý vlastný riadok s jedným štítom */
  dalsieOrg?: OrgPole[];
  vyzbierane?: number;   // základ mimo živých darov (karta 04)
  ciel?: number;         // bez cieľa → míľniky
  ludia?: number;
  rychleSumy?: number[];  // € dlaždice — sadu volí charita v nastaveniach zbierky (predvolene 10 / 25 / 45)
  tvorca?: TvorcaData;    // karta 13 — zbierka otvorená cez QR tvorcu (alebo súkromná so splitom)
};

// DEV: ukážkový tvorca, keď appka ešte žiadneho nedodá
const DEV_TVORCA: TvorcaData = {
  id: "dev-tvorca-marek", meno: "Marek Tvorí", menoAkuzativ: "Mareka", menoDativ: "Marekovi",
  platformy: ["Twitch", "YouTube"], nazivo: true, podielZbierke: 50, stit: "Legend",
  odkazy: [{ druh: "nazivo", platforma: "Twitch", url: "https://twitch.tv" }, { druh: "zaznam", platforma: "YouTube", url: "https://youtube.com" }],
};

// karta 15 — na PC idú vľavo pod text len tieto položky, všetko ostatné je modul vpravo
const VLAVO = new Set<string>(["poleZodpoveda", "kamIdeDar", "darcovia"]);
const MQ_PC = "(min-width: 1024px)";
function useSirokeOkno() {
  const [pc, setPc] = useState(() => typeof window !== "undefined" && window.matchMedia(MQ_PC).matches);
  useEffect(() => {
    const m = window.matchMedia(MQ_PC), f = () => setPc(m.matches);
    m.addEventListener("change", f); return () => m.removeEventListener("change", f);
  }, []);
  return pc;
}

// ---- DEV simulácia (len lokálne, v produkcii miesto a stav dodá appka) ----
const KLUC_DEV = "deed.dev.zbierkaModul";
type DevStav = { miesto: Miesto; maCiel: boolean; dorovnanie: boolean; split: boolean; tempoSilna: boolean; dalsieOrg: boolean };
const DEV_CIEL = 2200;
const DEV_ZAKLAD: DevStav = { miesto: "charita", maCiel: true, dorovnanie: false, split: false, tempoSilna: false, dalsieOrg: false };
/** DEV ukážka: overovateľ + druhá charita (split dar) — kým ich nedodá server */
const DEV_DALSIE_ORG: OrgPole[] = [
  { meno: "Mesto Trenčín", typ: "overovatel", mesto: "Trenčín", veta: "Zbierku sme overili na mieste.", cisla: [], stit: "Gold" },
  { meno: "Svetlo pomoci o.z.", typ: "charita", mesto: "Trenčín · Juh", veta: "Pomáhame rodinám v núdzi v Trenčianskom kraji.", cisla: [["12 400 €", "vyzbierané"], ["38", "skutkov"]], stit: "Silver" },
];
function nacitajDev(): DevStav {
  try { const s = localStorage.getItem(KLUC_DEV); return s ? { ...DEV_ZAKLAD, ...JSON.parse(s) } : DEV_ZAKLAD; } catch { return DEV_ZAKLAD; }
}
function ulozDev(v: DevStav) { try { localStorage.setItem(KLUC_DEV, JSON.stringify(v)); } catch { /* LS */ } }

export function ZbierkaModul({ zbierka, miesto: miestoProp, onBack, spatNazov, onZavriet, zoStrankyOrg, onOtvorOrg, stav, onStav, vlozeny }: {
  zbierka: ZbierkaData; miesto?: Miesto; onBack: () => void;
  spatNazov?: string; onZavriet?: () => void;
  /** predošlý krok cesty je stránka tej istej organizácie → pole sa skryje */
  zoStrankyOrg?: boolean;
  onOtvorOrg?: () => void;
  /** rozbalené časti — uložené v kroku cesty, aby ich Späť obnovil */
  stav?: StavKroku; onStav?: (zmena: StavKroku) => void;
  /** KARTA 43 (?modul=vsade): modul je vložený pod kartou zbierky — bez hlavičky, galérie a DEV panela, v toku stránky */
  vlozeny?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null), koniecPruhu = useRef<HTMLDivElement>(null); // mikrodar: odkiaľ a kam letí svetielko
  const mikro = { root: rootRef, ciel: koniecPruhu };
  const [stavLok, setStavLok] = useState<StavKroku>({});
  const [menu, setMenu] = useState<null | "menu" | "nahlasit">(null); // ⋯ zbierky (OPRAVY 51)
  const st = stav ?? stavLok;
  const zmenStav = (z: StavKroku) => { setStavLok((x) => ({ ...x, ...z })); onStav?.(z); };
  const [dev, setDevRaw] = useState<DevStav>(nacitajDev);
  const setDev = (z: Partial<DevStav>) => setDevRaw((d) => { const n = { ...d, ...z }; ulozDev(n); return n; });
  const [registrovany, setRegistrovany] = useState(() => !jeNeregistrovany());
  const [ico, setIco] = useState(darujemAkoFirma);
  useEffect(() => sledujDarcu(() => { setRegistrovany(!jeNeregistrovany()); setIco(darujemAkoFirma()); }), []);

  const miesto = miestoProp ?? dev.miesto;
  // DEV: prepínač cieľa — zapnutý = skutočný cieľ, a keď ho zbierka nemá, ukážkový 2 200 €; vypnutý = bez cieľa
  const realnyCiel = zbierka.ciel != null && zbierka.ciel > 0 ? zbierka.ciel : null;
  const ciel = dev.maCiel ? (realnyCiel ?? DEV_CIEL) : null;
  const maCiel = ciel != null;
  // dorovnanie = skutočný stav (rovnaký zdroj, ktorý dorovná aj dar) — nie DEV prepínač
  useZmenyDorovnani();
  const dorovnanie = dorovnanieNaDar(zbierka.id);
  const k: Kontext = { registrovany, ico, maCiel, dorovnanieAktivne: !!dorovnanie, split: dev.split, tempoSilna: true /* viditeľnosť rieši TempoDarov (karta 05) */ };
  const tempoRezim = POLOZKY[miesto].tempo as TempoRezim;
  // karta 07 — platobné okno (so sumou rovno na Spôsob, bez sumy od kroku Suma)
  const [platba, setPlatba] = useState<{ kanal: KanalPlatby; suma?: number } | null>(null);
  const otvorPlatbu: OtvorPlatbu = (p) => { setPredDarom(stavPredDarom()); setPlatba(p); };
  // stav zbierky tesne pred darom (pre poďakovanie a hlášku) — zachytí sa pri otvorení okna
  const stavPredDarom = () => {
    const dary = darcoviaPre(zbierka.id), dnes = new Date(); dnes.setHours(0, 0, 0, 0);
    return { vyzbierane: (zbierka.vyzbierane ?? 0) + dary.reduce((a, r) => a + r.suma, 0), ciel, pocetDarov: (zbierka.ludia ?? 0) + dary.length, darovDnes: dary.filter((r) => r.cas >= dnes.getTime()).length };
  };
  const [predDarom, setPredDarom] = useState(stavPredDarom);
  // hárky z karty 12 (zatiaľ pôvodné hárky appky — nový vzhľad príde s ich kartami)
  const [harok, setHarok] = useState<"pravidelna" | "firma" | "retaz" | "zdielat" | "podporit" | null>(null);
  const polozky = pripojene(miesto, k);
  const pcOkno = useSirokeOkno();
  const pc = vlozeny ? false : pcOkno; // KARTA 43: vložený modul je vždy v jednom stĺpci (žije v úzkom stĺpci profilu)
  // karta 13 — tvorca (na mieste tvorca vždy, na súkromnej len so splitom)
  const cezTvorcaMiesto = miesto === "tvorca" || (miesto === "sukromna" && dev.split);
  const tvorca = cezTvorcaMiesto ? (zbierka.tvorca ?? (TESTOVACIA ? DEV_TVORCA : undefined)) : undefined;
  const cezTvorcu = tvorca?.id;

  const vykresli = (p: (typeof polozky)[number]) => {
    // karta 03 — pole charity / overovateľa (skryté, keď si prišiel zo stránky tej istej organizácie)
    if (p.kluc === "poleZodpoveda") {
      if (!zbierka.organizacia || zoStrankyOrg) return null;
      const org: OrgPole = { ...zbierka.organizacia, typ: miesto === "sukromna" ? "overovatel" : "charita" };
      const dalsie = zbierka.dalsieOrg ?? (TESTOVACIA && dev.dalsieOrg ? DEV_DALSIE_ORG : []);
      return (
        <div key={p.kluc} className="zb-pol" style={{ padding: "0 16px" }}>
          <PoleOrganizacie org={org} dalsie={dalsie} nadpis={String(p.hodnota)} otvorene={!!st.pole}
            onPrepni={() => zmenStav({ pole: !st.pole })} onOtvorStranku={onOtvorOrg} />
        </div>
      );
    }
    // karta 04 — karta stavu celej zbierky (míľniky sú jej súčasť; pri tvorcovi karta 13)
    if (p.kluc === "kartaStavu" && p.hodnota === "cela") {
      return (
        <div key={p.kluc} className="zb-pol" style={{ padding: "0 16px" }}>
          <KartaStavu refId={zbierka.id} zaklad={zbierka.vyzbierane ?? 0} ciel={ciel} ludiaZaklad={zbierka.ludia ?? 0} tempo={tempoRezim} koniecPruhu={koniecPruhu} />
        </div>
      );
    }
    // karta 13 — „Vyzbierané cez {meno}" (tempo vždy) + malá karta „Celá zbierka"
    if (p.kluc === "kartaStavu" && tvorca) {
      return (
        <div key={p.kluc} className="zb-pol" style={{ padding: "0 16px" }}>
          <KartaStavu refId={zbierka.id} zaklad={0} ciel={null} ludiaZaklad={0} tempo={tempoRezim} koniecPruhu={koniecPruhu}
            cezTvorcu={{ id: tvorca.id, menoAkuzativ: tvorca.menoAkuzativ }} />
          <CelaZbierka refId={zbierka.id} zaklad={zbierka.vyzbierane ?? 0} ciel={ciel} ludiaZaklad={zbierka.ludia ?? 0} />
        </div>
      );
    }
    if (p.kluc === "kamIdeDar") {
      if (!tvorca) return null;
      return <div key={p.kluc} className="zb-pol" style={{ padding: "0 16px" }}><KamIdeDar nazovZbierky={zbierka.nazov} fotoZbierky={zbierka.media?.find((m) => m.typ === "foto")?.src} tvorca={tvorca} /></div>;
    }
    if (p.kluc === "milniky" || p.kluc === "tempo") return null; // súčasť karty stavu
    // karta 06 — rýchle sumy + vlastná suma (vlastná suma je hneď pod nimi)
    if (p.kluc === "rychleSumy" && p.hodnota !== "podporitDeed") {
      const naDeed = p.hodnota === "deed";
      const vlastnaEur = polozky.some((x) => x.kluc === "vlastnaEur") || (miesto === "deed" && registrovany);
      return (
        <div key={p.kluc} className="zb-pol" style={{ padding: "0 16px" }}>
          {naDeed
            ? <DeedDlazdice refId={zbierka.id} registrovany={registrovany} mikro={mikro} cezTvorcu={cezTvorcu} />
            : <RychleSumyEur sumy={p.hodnota === "eurDrobne" ? [1, 3, 5] : zbierka.rychleSumy ?? [10, 25, 45]}
                doplnok={p.hodnota === "eurDrobne" || miesto === "sukromna" ? undefined : "sumy si volí charita"}
                kDaru={dorovnanie ? (sm) => dorovnanieKDaru(dorovnanie, sm) : undefined} otvor={otvorPlatbu} />}
          <VlastnaSuma eur={vlastnaEur} deed={miesto === "deed" && registrovany} otvor={otvorPlatbu}
            firma={dorovnanie ? `${dorovnanie.firma} ${dorovnanie.pomer === 1 ? "zdvojnásobí" : "dorovná"}` : undefined} />
        </div>
      );
    }
    if (p.kluc === "vlastnaEur") return null; // vykreslená spolu s rýchlymi sumami
    const obal = (el: React.ReactNode) => <div key={p.kluc} className="zb-pol" style={{ padding: "0 16px" }}>{el}</div>;
    if (p.kluc === "zdielat") return obal(<ZdielatRiadok onZdielat={() => setHarok("zdielat")} />);
    if (p.kluc === "dorovnanie" && dorovnanie) return obal(<>
      <KartaDorovnava d={dorovnanie} />
      {dorovnanieKDaru(dorovnanie, 20) > 0 && <div style={{ margin: "-4px 0 12px", textAlign: "center", fontSize: 13.5, fontWeight: 700, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>
        daruješ 20 € → k príjemcovi ide {(20 + dorovnanieKDaru(dorovnanie, 20)).toLocaleString("sk-SK")} €</div>}
    </>);
    if (p.kluc === "pravidelna") return obal(<PravidelnaRiadok registrovany={registrovany} onClick={() => setHarok("pravidelna")} />);
    if (p.kluc === "oblubene") return obal(<OblubenePodporit polozka={{ refId: zbierka.id, typ: "charita", modul: "charity", nazov: zbierka.nazov, ciel: zbierka.ciel }}
      onPodporit={() => setHarok("podporit")} />);
    if (p.kluc === "zapojitFirmu") return obal(<ZapojitFirmuRiadok firma={firmaAkoDarca() ?? "Vaša firma"} onClick={() => setHarok("firma")} />);
    if (p.kluc === "retazNastavit") return obal(<RetazRiadok onClick={() => setHarok("retaz")} />);
    if (p.kluc === "darcovia") return obal(<Darcovia refId={zbierka.id} cezTvorcu={cezTvorcu} nadpis={tvorca ? `DARCOVIA CEZ ${tvorca.menoAkuzativ.toLocaleUpperCase("sk-SK")}` : undefined} />);
    if (p.kluc === "krypto") return <div key={p.kluc} className="zb-pol" style={{ padding: "0 16px" }}><DaryVKrypte refId={zbierka.id} otvor={otvorPlatbu} mikro={mikro} cezTvorcu={cezTvorcu} /></div>;
    return null;
  };
  // karta 02 — hlavička, galéria, nadpis a text (všade okrem hárku Podporiť DEED)
  const vrch = vlozeny ? null : miesto !== "podporitDeed" ? (
    <div className="zb-pol" style={{ padding: "4px 16px 0" }}>
      <Hlavicka cisloZbierky={zbierka.cislo} overena={zbierka.overena} onBack={onBack} spatNazov={spatNazov} onZavriet={onZavriet} onMoznosti={() => setMenu("menu")} />
      <Galeria media={zbierka.media ?? []} />
      <NadpisText nazov={zbierka.nazov} text={zbierka.popis} otvoreny={st.text as boolean | undefined} onOtvoreny={(v) => zmenStav({ text: v })} />
    </div>
  ) : <PodporitDeedObsah registrovany={registrovany} />;
  const lave = polozky.filter((p) => VLAVO.has(p.kluc));
  const prave = polozky.filter((p) => !VLAVO.has(p.kluc));

  return (
    <div ref={rootRef} className="deed-platba" style={{ position: "relative", minHeight: vlozeny ? undefined : "100%", background: vlozeny ? "transparent" : "var(--bg)", color: "var(--ink)", paddingBottom: vlozeny ? 0 : SPACE.lg }}>
      {TESTOVACIA && !vlozeny && <DevPanel dev={dev} setDev={setDev} miestoPevne={!!miestoProp} registrovany={registrovany} ico={ico}
        cielInfo={realnyCiel ? undefined : `ukážkový ${DEV_CIEL.toLocaleString("sk-SK")} €`} dorovnava={dorovnanie?.firma}
        onDar={(suma) => pridajDar({ refId: zbierka.id, suma, kanal: "psp", registrovany, cezTvorcu })} />}


      {menu === "menu" && <Harok onClose={() => setMenu(null)} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>Možnosti</span>}>
        <button type="button" onClick={() => setMenu("nahlasit")} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "0 16px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--a-danger)", fontSize: 15.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>Nahlásiť zbierku</button>
      </Harok>}
      {menu === "nahlasit" && <NahlasitSheet typ="Zbierka" co={zbierka.nazov} refId={zbierka.id} modul="zbierka" onClose={() => setMenu(null)} />}

      {platba && (
        <PlatobneOkno kanal={platba.kanal} suma={platba.suma} nazov={zbierka.nazov} registrovany={registrovany} pred={predDarom}
          bonus={dorovnanie ? (sm) => dorovnanieKDaru(dorovnanie, sm) : undefined} firma={dorovnanie?.firma}
          onClose={() => setPlatba(null)}
          onHotovo={(v) => {
            pridajDar({ refId: zbierka.id, suma: v.eur, kanal: v.kanal === "eur" ? (v.sposob === "sepa" ? "sepa" : "psp") : "deed", registrovany, volba: v.volba, cezTvorcu });
          }} />
      )}

      {harok === "pravidelna" && <PravidelnaHarok refId={zbierka.id} nazov={zbierka.nazov} registrovany={registrovany} onClose={() => setHarok(null)} />}
      {harok === "firma" && <DorovnanieFirmyHarok zbierkaId={zbierka.id} zbierkaNazov={zbierka.nazov} firma={firmaAkoDarca() ?? "Vaša firma"} onClose={() => setHarok(null)} />}
      {harok === "zdielat" && <ZdielatHarok id={zbierka.id} nazov={zbierka.nazov} organizacia={zbierka.organizacia?.meno}
        obrazok={zbierka.media?.find((m) => m.typ === "foto")?.src} onClose={() => setHarok(null)} />}
      {harok === "podporit" && <PodporitDeedHarok registrovany={registrovany} onClose={() => setHarok(null)} />}
      {harok === "retaz" && <RetazDobraHarok zbierka={{ id: zbierka.id, nazov: zbierka.nazov, org: zbierka.organizacia?.meno, ciel, vyzbierane: zbierka.vyzbierane }} onClose={() => setHarok(null)} />}

      {/* pripojené položky — vždy rovnaké poradie, odpojené chýbajú úplne */}
      {/* karta 15 — mobil: jeden stĺpec v pevnom poradí · PC (≥ 1024): vľavo obsah, vpravo modul 420 px (sticky) */}
      <div className={`zb-obsah${vlozeny ? " zb-obsah--vlozeny" : ""}`}>
        <div className="zb-lavy">{vrch}{pc && lave.map(vykresli)}</div>
        <div className="zb-pravy">{(pc ? prave : polozky).map(vykresli)}</div>
      </div>
    </div>
  );
}

// ---- DEV panel — miesto a stav zbierky/darcu (v produkcii sa nezobrazuje) ----
function DevPanel({ dev, setDev, miestoPevne, registrovany, ico, cielInfo, onDar, dorovnava }: {
  dev: DevStav; setDev: (z: Partial<DevStav>) => void; miestoPevne: boolean; registrovany: boolean; ico: boolean;
  cielInfo?: string; onDar: (suma: number) => void; dorovnava?: string;
}) {
  // predvolene zbalený, nech detail vyzerá ako v appke; stav sa pamätá
  const [skryty, setSkrytyRaw] = useState(() => { try { return localStorage.getItem("deed.dev.zbierkaPanel") !== "1"; } catch { return true; } });
  const setSkryty = (v: boolean) => { setSkrytyRaw(v); try { localStorage.setItem("deed.dev.zbierkaPanel", v ? "0" : "1"); } catch { /* LS */ } };
  const tempo = useDevTempo();
  const [tuk, setTuk] = useState(potvrditTuknutim);
  const chip = (on: boolean): CSSProperties => ({ padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.pill, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${on ? "var(--a-info)" : C.line}`, background: on ? C.surface2 : "transparent", color: on ? C.text : C.textSec });
  const riadok = (label: string, on: boolean, zmen: (v: boolean) => void) => (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xxs}px 0` }}>
      <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{label}</div>
      <Switch on={on} onChange={zmen} ariaLabel={label} />
    </div>
  );
  return (
    <div style={{ margin: SPACE.md, padding: SPACE.sm, borderRadius: RADIUS.sm, border: "1px dashed var(--a-plum)", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "var(--a-plum)", letterSpacing: ".04em" }}>DEV</span>
        <span style={{ flex: 1, fontWeight: 700, color: C.textSec }}>Nový detail zbierky — miesto a stav</span>
        <span {...pressable(() => setSkryty(!skryty), skryty ? "Ukázať" : "Skryť")} style={{ color: C.textTer, cursor: "pointer" }}>{skryty ? "ukázať" : "skryť"}</span>
      </div>
      {!skryty && (
        <>
          {!miestoPevne && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xxs, margin: `${SPACE.sm}px 0` }}>
              {MIESTA.map((m) => <span key={m.kluc} {...pressable(() => setDev({ miesto: m.kluc }), m.nazov)} style={chip(dev.miesto === m.kluc)}>{m.nazov}</span>)}
            </div>
          )}
          {riadok(`Zbierka má cieľ${cielInfo ? ` (${cielInfo})` : ""}`, dev.maCiel, (v) => setDev({ maCiel: v }))}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: SPACE.xxs, padding: `${SPACE.xxs}px 0` }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>Simulovať dar</span>
            {[3, 25, 150, 1000].map((s) => <span key={s} {...pressable(() => onDar(s), `Simulovať dar ${s} €`)} style={chip(false)}>+{s.toLocaleString("sk-SK")} €</span>)}
          </div>
          <div style={{ padding: `${SPACE.xxs}px 0`, fontSize: 12, fontWeight: 700 }}>
            Dorovnanie firmy: {dorovnava ? <span style={{ color: "var(--a-gold)" }}>beží · {dorovnava}</span> : <span style={{ color: C.textTer }}>nebeží</span>}
            <div style={{ fontSize: 10.5, fontWeight: 400, color: C.textTer }}>skutočný stav zbierky · zapína ho firma cez „Zapojiť firmu do dorovnania"</div>
          </div>
          {dev.miesto === "sukromna" && riadok("Súkromnú splitol tvorca", dev.split, (v) => setDev({ split: v }))}
          {riadok("Overovateľ a druhá charita (split dar)", dev.dalsieOrg, (v) => setDev({ dalsieOrg: v }))}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: SPACE.xxs, padding: `${SPACE.xxs}px 0` }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>Tempo darov (výpočet ešte nie je)</span>
            {STUPNE.map((n, i) => <span key={n} {...pressable(() => nastavDevTempo(i as Stupen), n)} style={chip(tempo === i)}>{n}</span>)}
          </div>
          {riadok("Potvrdiť platbu ťuknutím (namiesto podržania)", tuk, (v) => { nastavPotvrditTuknutim(v); setTuk(v); })}
          {riadok("Darca registrovaný", registrovany, (v) => nastavNeregistrovany(!v))}
          {riadok("Darca má IČO", ico, (v) => nastavDarcuFirmu(v))}
        </>
      )}
    </div>
  );
}
