// ============================================================
// KARTA 35 · Správa charity — Nastavenia (fáza B). 12 obrazoviek podľa prototypu
// „Sprava charity PC.dc.html" → Nastavenia. Vykanie, Späť rieši hlavička správy.
// Uložiť / Odoslať / Pridať sú sivé, kým nie je čo uložiť. Žiadne SMS.
// Stav obrazoviek drží appka počas relácie (pamat) — do účtu sa zatiaľ neukladá (backend príde neskôr).
// ============================================================
import { useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { DeedZnacka, sZnackou } from "@/components/DeedZnacka";
import { DeedQr } from "@/components/deedqr";
import { zdielaj, kopiruj } from "@/lib/zdielanie";
import { SADY_EURC, SADY_EUR, type SadaEurc, type SadaEur } from "@/lib/sadyDarov";
import { TESTOVACIA } from "@/lib/testovacia";
import { nacitajKryptoOrg, ulozKryptoOrg, nacitajSady, ulozSady, type Tier, type TypStranky, CENNIK_TYPU, TYP_NAZOV, TIER_LABEL, TIER_POPIS } from "./stav";

// ---------- pamäť relácie (prežije prechody medzi obrazovkami) ----------
// TODO (OPRAVY 88): pred spustením uložiť do účtu charity — oznámenia, EURC, údaje, súhlasy, správcovia, zariadenia.
// usePamat drží hodnoty len kým je appka otvorená; po zatvorení sa stratia.
const pamat = new Map<string, unknown>();
function usePamat<T>(kluc: string, zaklad: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => (pamat.has(kluc) ? (pamat.get(kluc) as T) : zaklad));
  const set = (n: T | ((p: T) => T)) => setV((p) => { const x = typeof n === "function" ? (n as (p: T) => T)(p) : n; pamat.set(kluc, x); return x; });
  return [v, set];
}
/** hodnoty pre riadky v Nastaveniach (počty, EURC, program) */
export const pocetSpravcov = () => ((pamat.get("spr") as Spravca[] | undefined) ?? SPR0).length;
export const pocetZariadeni = () => ((pamat.get("zar") as Zar[] | undefined) ?? ZAR0).length;
/** OPRAVY 89: riadok „Dary v eurách" ukazuje vybranú sadu */
export const eurText = () => { const k = nacitajSady("charita").eur; return `${SADY_EUR[k].label} · ${SADY_EUR[k].sumy.join(" · ")} €`; };
export const eurcText = () => ["nie", "pre všetky zbierky", "podľa zbierky"][(pamat.get("ek.p") as number | undefined) ?? (nacitajKryptoOrg("charita") ? 2 : 0)];

// ---------- spoločné ----------
const ZELENA = "#4B7A35", SIVA = "#A8A396", CERVENA = "#A34A2A";
const nad: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--acc)" };
const krt: React.CSSProperties = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" };
const pozn: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)" };
const pole: React.CSSProperties = { height: 48, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const obrys = (c = "var(--ink)"): React.CSSProperties => ({ flex: "none", height: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 800, color: c });
const plne = (on: boolean): React.CSSProperties => ({ height: 52, border: "none", borderRadius: 14, background: on ? ZELENA : SIVA, cursor: on ? "pointer" : "default", fontSize: 15.5, fontWeight: 800, color: "#fff" });
const btn = (i: number) => (i ? "1px solid var(--cardBd)" : "none");
const ZAMOK = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flex: "none" }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
const FAJKA = (c = "var(--acc)", s = 15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}><path d="M5 12l5 5 9-10" /></svg>;
const SIPKA = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flex: "none" }}><path d="M9 6l6 6-6 6" /></svg>;

function Prep({ on, zamok }: { on: boolean; zamok?: boolean }) {
  return <span aria-hidden="true" style={{ width: 48, height: 28, borderRadius: 14, background: on ? (zamok ? "var(--ink4)" : "var(--green)") : "#C9C4B8", display: "block", position: "relative", transition: "background .2s ease", flex: "none" }}><span style={{ position: "absolute", top: 3, left: 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transform: on ? "translateX(20px)" : "none", transition: "transform .2s ease" }} /></span>;
}
function RiadokPrep({ t, s, on, onClick, zamok, znak, i, minH = 58 }: { t: React.ReactNode; s?: React.ReactNode; on: boolean; onClick?: () => void; zamok?: boolean; znak?: string; i: number; minH?: number }) {
  return (
    <button role="switch" aria-checked={on} aria-disabled={zamok || undefined} onClick={zamok ? undefined : onClick}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: minH, padding: "6px 0", border: "none", borderTop: btn(i), background: "transparent", cursor: zamok ? "default" : "pointer", textAlign: "left" }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{t}</span>
          {znak && <span style={{ height: 20, padding: "0 7px", borderRadius: 10, border: "1px solid var(--cardBd)", fontSize: 11, fontWeight: 800, color: "var(--ink3)", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{znak}</span>}</span>
        {s && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{s}</span>}
      </span>
      {zamok && ZAMOK}
      <Prep on={on} zamok={zamok} />
    </button>);
}
function Segment<T extends string | number>({ volby, hodnota, onZmena, stlpce, tien }: { volby: [T, string][]; hodnota: T; onZmena: (v: T) => void; stlpce?: number; tien?: boolean }) {
  return (
    <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: `repeat(${stlpce ?? volby.length},minmax(0,1fr))`, gap: 4, padding: 4, borderRadius: 14, background: "var(--btn)" }}>
      {volby.map(([k, t]) => { const on = k === hodnota; return (
        <button key={String(k)} role="radio" aria-checked={on} onClick={() => onZmena(k)} style={{ minHeight: 42, padding: "0 6px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: tien ? 800 : 700, lineHeight: 1.2, background: on ? (tien ? "var(--seg)" : "var(--white)") : "transparent", color: on ? "var(--ink)" : "var(--ink3)", boxShadow: on && tien ? "0 1px 3px rgba(30,28,20,.14)" : "none" }}>{t}</button>); })}
    </div>);
}
const Zoznam = ({ polozky, bodka }: { polozky: string[]; bodka?: boolean }) => (
  <div style={{ ...krt, padding: "4px 16px" }}>
    {polozky.map((x, i) => <div key={x} style={{ display: "flex", gap: 10, padding: "11px 0", borderTop: btn(i), fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>
      {bodka ? <span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: "var(--acc)", marginTop: 8 }} /> : FAJKA()}<span>{x}</span></div>)}
  </div>);
const dvaStlpce = (mobil: boolean, a = "1fr", b = "1fr"): React.CSSProperties => ({ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : `minmax(0,${a}) minmax(0,${b})`, gap: 18, alignItems: "start" });
const stlpec: React.CSSProperties = { minWidth: 0, display: "flex", flexDirection: "column", gap: 8 };

// ============================================================
// 1 · Čo chcete dostávať
// ============================================================
type Nf = Record<string, boolean | number | string>;
const eur = (n: number) => n.toLocaleString("sk-SK") + " €";
export function ObrOznamenia({ mobil }: { mobil: boolean }) {
  const [nf, setNf] = usePamat<Nf>("nf", {});
  const on = (k: string, d: boolean) => (nf[k] as boolean | undefined) ?? d;
  const prepni = (k: string, d: boolean) => setNf((c) => ({ ...c, [k]: !((c[k] as boolean | undefined) ?? d) }));
  const hr = (nf.hr as number | undefined) ?? 100, sm = (nf.suhrn as number | undefined) ?? 1;
  type R = [string, string, string, boolean, ("lock" | "suhrn")?];
  const sekcie: [React.ReactNode, R[]][] = [
    ["PENIAZE", [["dar", "Nový dar", "kto a koľko daroval", true, "suhrn"], ["velky", "Väčší dar", `od ${eur(hr)}, vždy hneď`, true], ["vyplata", "Výplata na účet", "peniaze odišli na transparentný účet", true], ["prav", "Pravidelná podpora", "nová, zrušená alebo neprešla platba", true, "lock"]]],
    ["ZBIERKY A DOKLADY", [["koniec", "Zbierka sa končí", "3 dni pred koncom", true], ["ciel", "Zbierka dosiahla cieľ", "", true], ["lehota", "Lehota na doklady", "7 dní a 1 deň pred termínom", true, "lock"], ["overenie", "Kontrola dokladov", "overovateľ schválil alebo vrátil doklady", true, "lock"]]],
    ["ĽUDIA", [["sled", "Nový sledujúci", "", true, "suhrn"], ["dobro", "Dobrovoľník sa prihlásil", "na brigádu alebo akciu", true], ["retaz", "Pripojenie cez Reťaz dobra", "niekto spustil zbierku pre vás", true], ["firma", "Firma chce dorovnávať", "ponuka partnera na dorovnanie", true, "lock"]]],
    [<DeedZnacka key="d" />, [["novinky", "Novinky DEED+", "nové funkcie, raz za mesiac", false]]],
  ];
  return (<>
    <span style={{ fontSize: 14, color: "var(--ink2)", maxWidth: 760, lineHeight: 1.5 }}>Vyberte, o čom vám dáme vedieť. Dôležité veci pri peniazoch a dokladoch sa vypnúť nedajú, aby vám nič neušlo.</span>
    <div style={dvaStlpce(mobil)}>
      <div style={stlpec}>
        <div style={nad}>KAM VÁM TO POŠLEME</div>
        <div style={{ ...krt, padding: "0 14px" }}>
          <RiadokPrep i={0} t="V appke" s="zvonček hore, vždy zapnuté" on zamok />
          <RiadokPrep i={1} t="Na displej telefónu" s="aj keď appku nemáte otvorenú" on={on("displej", true)} onClick={() => prepni("displej", true)} />
          <RiadokPrep i={2} t="E-mailom" s="info@svetlopomoci.sk" on={on("mail", false)} onClick={() => prepni("mail", false)} />
        </div>
        <div style={{ ...nad, marginTop: 10 }}>SÚHRN</div>
        <div style={{ ...krt, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Drobné veci posielať</span>
          <Segment volby={[[0, "Hneď"], [1, "Raz denne"], [2, "Raz týždenne"]]} hodnota={sm} onZmena={(v) => setNf((c) => ({ ...c, suhrn: v }))} />
          <span style={pozn}>Týka sa položiek so značkou „súhrn“, napríklad nový sledujúci alebo bežný dar.</span>
        </div>
        <div style={{ ...nad, marginTop: 10 }}>VÄČŠÍ DAR</div>
        <div style={{ ...krt, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Dať vedieť hneď pri dare od</span>
          <Segment volby={[50, 100, 200, 500].map((n) => [n, eur(n)] as [number, string])} hodnota={nf.hrV ? -1 : hr} onZmena={(v) => setNf((c) => ({ ...c, hr: v, hrV: "" }))} />
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>alebo vlastná suma</span>
            <span style={{ position: "relative", flex: 1, maxWidth: 160 }}>
              <input value={(nf.hrV as string | undefined) ?? ""} inputMode="numeric" placeholder="napr. 75" aria-label="Vlastná suma v eurách"
                onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); const n = parseInt(v, 10); setNf((c) => ({ ...c, hrV: v, ...(n > 0 ? { hr: n } : {}) })); }}
                style={{ ...pole, height: 44, padding: "0 34px 0 12px", fontWeight: 700 }} />
              <span style={{ position: "absolute", right: 12, top: 12, fontSize: 15, fontWeight: 700, color: "var(--ink3)" }}>€</span>
            </span>
          </label>
          <span style={pozn}>Menšie dary prídu v súhrne, podľa nastavenia vyššie.</span>
        </div>
      </div>
      <div style={{ ...stlpec, gap: 18 }}>
        {sekcie.map(([n, rows], si) => (
          <div key={si} style={stlpec}>
            <div style={nad}>{n}</div>
            <div style={{ ...krt, padding: "0 14px" }}>
              {rows.map(([k, t, s, d, z], i) => <RiadokPrep key={k} i={i} t={sZnackou(t)} s={s} on={z === "lock" ? true : on(k, d)} zamok={z === "lock"} znak={z === "lock" ? "dôležité" : z === "suhrn" ? "súhrn" : undefined} onClick={() => prepni(k, d)} />)}
            </div>
          </div>))}
      </div>
    </div>
  </>);
}

// ============================================================
// 2a · Dary v eurách (OPRAVY 89) — ako Dary v EURC, len bez otázky áno/nie
// ============================================================
const SADY_EUR_PORADIE: SadaEur[] = ["drobne", "stredne", "vyssie"];
export function ObrEur({ mobil }: { mobil: boolean }) {
  const [sada, setSada] = useState<SadaEur>(() => nacitajSady("charita").eur);
  const [rz, setRz] = usePamat<number>("eu.r", 1);
  const vyber = (on: boolean): React.CSSProperties => ({ minHeight: 64, padding: "8px 10px", borderRadius: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, textAlign: "center", background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink)" });
  return (
    <section style={{ ...krt, borderRadius: 20, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 15.5, fontWeight: 800 }}>Rýchle sumy v eurách</span>
      <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {SADY_EUR_PORADIE.map((k) => (
          <button key={k} role="radio" aria-checked={k === sada} onClick={() => { setSada(k); ulozSady("charita", { ...nacitajSady("charita"), eur: k }); }} style={vyber(k === sada)}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{SADY_EUR[k].label}</span><span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink3)" }}>{SADY_EUR[k].sumy.join(" · ")} €</span></button>))}
      </div>
      <Segment volby={[[0, "Rovnaké pri všetkých zbierkach"], [1, "Vyberiem pri každej zbierke"]]} hodnota={rz} onZmena={setRz} stlpce={mobil ? 1 : 2} />
      <span style={pozn}>{rz === 0 ? "Tieto sumy budú pri každej zbierke rovnaké. Pri zbierke sa nedajú zmeniť." : "Toto sú predvolené sumy. Pri tvorbe zbierky ich môžete zmeniť."}</span>
      <span style={pozn}>Sumy do 5 € idú len prevodom SEPA. Pri karte by ich zjedol poplatok. Vlastnú sumu môže darca napísať vždy.</span>
    </section>);
}

// ============================================================
// 2 · Dary v EURC
// ============================================================
const SADY_PORADIE: SadaEurc[] = ["mikro", "drobne", "stredne", "vacsie"];
export function ObrEurc({ mobil }: { mobil: boolean }) {
  const [p, setP] = usePamat<number>("ek.p", nacitajKryptoOrg("charita") ? 2 : 0);
  const [sada, setSada] = useState<SadaEurc>(() => nacitajSady("charita").eurc);
  const [rz, setRz] = usePamat<number>("ek.r", 1);
  const [pv, setPv] = usePamat<boolean>("ek.prav", false);
  const vyber = (on: boolean): React.CSSProperties => ({ minHeight: 64, padding: "8px 10px", borderRadius: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, textAlign: "center", background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink)" });
  const sek: React.CSSProperties = { ...krt, borderRadius: 20, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 };
  return (<>
    <section style={sek}>
      <span style={{ fontSize: 15.5, fontWeight: 800 }}>Chcete prijímať dary v EURC?</span>
      <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {([["Nie", "nikde"], ["Áno", "pri všetkých zbierkach"], ["Podľa zbierky", "vyberiem pri každej"]] as const).map(([t, s], i) => (
          <button key={t} role="radio" aria-checked={i === p} onClick={() => { setP(i); ulozKryptoOrg("charita", i !== 0); }} style={vyber(i === p)}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{t}</span><span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink3)" }}>{s}</span></button>))}
      </div>
      <span style={pozn}>EURC je digitálne euro 1 : 1. Keď vyberiete Nie, dary v krypte sa nezobrazia v žiadnej zbierke.</span>
    </section>
    {p !== 0 && <>
      <section style={sek}>
        <span style={{ fontSize: 15.5, fontWeight: 800 }}>Rýchle sumy v EURC</span>
        <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: mobil ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 8 }}>
          {SADY_PORADIE.map((k) => (
            <button key={k} role="radio" aria-checked={k === sada} onClick={() => { setSada(k); ulozSady("charita", { ...nacitajSady("charita"), eurc: k }); }} style={vyber(k === sada)}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{SADY_EURC[k].label}</span><span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink3)" }}>{SADY_EURC[k].sumy.map((v) => v.toLocaleString("sk-SK")).join(" · ")}</span></button>))}
        </div>
        <Segment volby={[[0, "Rovnaké pri všetkých zbierkach"], [1, "Vyberiem pri každej zbierke"]]} hodnota={rz} onZmena={setRz} stlpce={mobil ? 1 : 2} />
        <span style={pozn}>{rz === 0 ? "Tieto sumy budú pri každej zbierke rovnaké. Pri zbierke sa nedajú zmeniť." : "Toto sú predvolené sumy. Pri tvorbe zbierky ich môžete zmeniť."}</span>
      </section>
      <section style={{ ...krt, borderRadius: 20, padding: "0 20px" }}>
        <RiadokPrep i={0} minH={64} t="EURC aj pri pravidelnej podpore" s="darca si môže mesačnú podporu nastaviť aj v EURC" on={pv} onClick={() => setPv(!pv)} />
      </section>
    </>}
  </>);
}

// ============================================================
// 3 · Správa účtov
// ============================================================
export function ObrUcty({ mobil, otvor }: { mobil: boolean; otvor: (s: string) => void }) {
  const Z: [string, string, string, boolean][] = [["Strecha pre rodinu Horváthovú", "Slovenská sporiteľňa", "SK12 … 8801", true], ["Vozík pre Ninu", "Tatra banka", "SK44 … 2190", true], ["Teplé jedlo na zimu", "VÚB banka", "SK07 … 5532", false]];
  return (
    <div style={dvaStlpce(mobil, "1fr", "1.4fr")}>
      <div style={stlpec}>
        <div style={nad}>HLAVNÝ ÚČET</div>
        <div style={{ ...krt, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{ZAMOK}<span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>overený pri registrácii</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 13, color: "var(--ink3)" }}>Slovenská sporiteľňa</span><span style={{ fontSize: 18, fontWeight: 800, letterSpacing: ".02em", overflowWrap: "anywhere" }}>{HLAVNY_UCET}</span><span style={{ fontSize: 13, color: "var(--ink3)" }}>Svetlo pomoci o.z.</span></div>
          <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>Hlavný účet sa nedá zmeniť v appke. Na zmenu ho musíme znova overiť. Napíšte nám cez podporu.</span>
          <button onClick={() => otvor("n:podpora")} style={{ ...obrys(), alignSelf: "flex-start" }}>Zmeniť cez podporu</button>
        </div>
      </div>
      <div style={stlpec}>
        <div style={nad}>TRANSPARENTNÉ ÚČTY ZBIEROK</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {Z.map(([z, b, i, bezi], k) => (
            <button key={z} onClick={() => otvor("g_zbierky")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 72, border: "none", borderTop: btn(k), background: "transparent", cursor: "pointer", textAlign: "left" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z}</span><span style={{ fontSize: 13, color: "var(--ink3)" }}>{b} · {i}</span></span>
              <span style={{ flex: "none", height: 24, padding: "0 9px", borderRadius: 12, background: bezi ? "var(--gSoft)" : "var(--btn)", color: bezi ? "var(--gInk)" : "var(--ink3)", display: "flex", alignItems: "center", fontSize: 12, fontWeight: 800 }}>{bezi ? "beží" : "ukončená"}</span>{SIPKA}
            </button>))}
        </div>
        <span style={pozn}>Transparentný účet pripájate pri každej zbierke zvlášť, pri jej vytváraní.</span>
      </div>
    </div>);
}

// ============================================================
// 4 · Správcovia a prístupy
// ============================================================
type Stav = false | "prijatie" | "potvrdit";
type Spravca = { id: number; n: string; k: string; r: number; caka: Stav; ja?: boolean; odkaz?: boolean };
const SPR0: Spravca[] = [{ id: 1, n: "Martin Štofik", k: "martin@svetlopomoci.sk", r: 0, caka: false, ja: true }];
// poradie = ROLY_STRANKY v stav.ts (OPRAVY 121: pribudol Organizátor)
const ROLY: [string, string][] = [["Hlavný správca", "všetko, aj účty, program a správcovia"], ["Správca", "zbierky, obsah, ľudia, výkazy · bez účtov a programu"], ["Pomocník", "len obsah: skutky, oznamy, nástenka · peniaze nevidí"],
  ["Organizátor", "vedúci skupiny s poverením od vás: skutky a akcie za charitu, QR charity · peniaze, darcov ani nastavenia nevidí"]];
type Pozvanka = { id: number; r: number; do: string; url: string };
export function ObrSpravcovia({ mobil }: { mobil: boolean }) {
  const [L, setL] = usePamat<Spravca[]>("spr", SPR0);
  const [nr, setNr] = usePamat<number>("spr.r", 1);
  const [cesta, setCesta] = usePamat<number>("spr.c", 0);
  const [kon, setKon] = useState("");
  const [poz, setPoz] = usePamat<Pozvanka | null>("spr.poz", null);
  const ok = /\S+@\S+\.\S+/.test(kon.trim());
  const hlavni = L.filter((x) => x.r === 0 && !x.caka).length;
  const pridaj = () => { if (!ok) return; setL((a) => [...a, { id: Date.now(), n: "", k: kon.trim(), r: nr, caka: "prijatie" }]); setKon(""); toast("Oznámenie sme mu poslali. Prijme ho v appke."); };
  const vytvor = () => {
    const d = new Date(Date.now() + 48 * 3600 * 1000);
    const doT = `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    const id = Date.now(); const url = `${location.origin}/pozvanka/${id.toString(36)}`;
    setPoz({ id, r: nr, do: doT, url });
    setL((a) => [...a, { id, n: "", k: `pozvánka cez odkaz · platí do ${doT}`, r: nr, caka: "prijatie", odkaz: true }]);
  };
  const zrusPoz = () => { if (poz) setL((a) => a.filter((y) => y.id !== poz.id)); setPoz(null); };
  const ako: [string, string][] = cesta === 0
    ? [["Pridáte ho", "Napíšete e-mail, s ktorým je v DEED+."], ["Príde mu oznámenie", "V appke: „Svetlo pomoci vás pridalo ako správcu“. Ťukne Prijať."], ["Hotovo", "Stránku nájde v Môj profil → Moje stránky."]]
    : [["Pošlete mu pozvánku", "Odkaz alebo QR, kadiaľ chcete. Platí 48 hodín."], ["Vyplní meno a e-mail", "Príde mu e-mail, ťukne Potvrdiť. Môže si zapnúť prihlásenie odtlačkom alebo Face ID."], ["Vy ho potvrdíte", "Uvidíte ho v zozname so štítkom „čaká na vaše potvrdenie“. Kým nepotvrdíte, nič nevidí."]];
  return (
    <div style={dvaStlpce(mobil, "1.4fr", "1fr")}>
      <div style={stlpec}>
        <div style={nad}>KTO SPRAVUJE STRÁNKU</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {L.map((x, i) => {
            const meno = x.n || "Pozvaný";
            const odT = x.caka === "potvrdit" ? "Odmietnuť" : x.caka ? "Zrušiť" : "Odobrať";
            const odober = () => { if (x.r === 0 && !x.caka && hlavni <= 1) { toast("Hlavný správca musí ostať aspoň jeden."); return; } setL((a) => a.filter((y) => y.id !== x.id)); if (poz && poz.id === x.id) setPoz(null); };
            return (
              <div key={x.id} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 12px", minHeight: 76, padding: "10px 0", borderTop: btn(i) }}>
                <span style={{ width: 42, height: 42, flex: "none", borderRadius: "50%", background: x.caka ? "var(--btn)" : "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--ink2)" }}>{x.n ? x.n.split(" ").map((w) => w[0]).join("") : "?"}</span>
                <span style={{ flex: "1 1 200px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 15 }}>{meno}</b>
                    {x.caka && <span style={{ flex: "none", whiteSpace: "nowrap", height: 22, padding: "0 8px", borderRadius: 11, background: "var(--warnBg)", border: "1px solid #C9A24A", display: "flex", alignItems: "center", fontSize: 11.5, fontWeight: 800, color: "var(--gold)" }}>{x.caka === "potvrdit" ? "čaká na vaše potvrdenie" : "čaká na prijatie"}</span>}</span>
                  <span style={{ fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.k}</span>
                </span>
                {x.ja ? <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: "var(--acc)" }}>Hlavný správca · vy</span>
                  : <div style={{ flex: "none", marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <select value={x.r} aria-label="Rola" onChange={(e) => { const v = +e.target.value; setL((a) => a.map((y) => (y.id === x.id ? { ...y, r: v } : y))); }} style={{ height: 44, padding: "0 10px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                      {ROLY.map(([t], k) => <option key={t} value={k}>{t}</option>)}
                    </select>
                    {x.caka === "potvrdit" && <button onClick={() => setL((a) => a.map((y) => (y.id === x.id ? { ...y, caka: false } : y)))} style={{ height: 44, padding: "0 14px", borderRadius: 12, border: "none", background: ZELENA, cursor: "pointer", fontSize: 13.5, fontWeight: 800, color: "#fff" }}>Potvrdiť</button>}
                    {x.caka === "prijatie" && <button onClick={() => toast("Pozvánku sme poslali znova.")} style={{ ...obrys(), fontSize: 13.5 }}>Poslať znova</button>}
                    {x.caka === "prijatie" && x.odkaz && TESTOVACIA && <button onClick={() => { setL((a) => a.map((y) => (y.id === x.id ? { ...y, n: "Jana Kováčová", k: "jana.kovacova@gmail.com · bez účtu", caka: "potvrdit" } : y))); setPoz(null); }} style={{ ...obrys("var(--ink3)"), fontSize: 12, borderStyle: "dashed" }}>DEV · prijal pozvánku</button>}
                    <button onClick={odober} style={{ ...obrys(CERVENA), fontSize: 13.5 }}>{odT}</button>
                  </div>}
              </div>);
          })}
        </div>
        <span style={pozn}>Hlavný správca musí ostať aspoň jeden. Ak ním chcete urobiť niekoho iného, najprv mu dajte rolu Hlavný správca, potom sa môžete odobrať.</span>
      </div>
      <div style={stlpec}>
        <div style={nad}>PRIDAŤ SPRÁVCU</div>
        <div style={{ ...krt, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div role="radiogroup" aria-label="Rola" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>1. Akú rolu mu dáte</span>
            {ROLY.map(([t, s], i) => { const on = i === nr; return (
              <button key={t} role="radio" aria-checked={on} onClick={() => setNr(i)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 12px", borderRadius: 14, border: `1.5px solid ${on ? "var(--cuBd)" : "var(--cardBd)"}`, background: on ? "var(--accSoft)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", border: `2px solid ${on ? "var(--acc)" : "#A8A396"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--acc)", opacity: on ? 1 : 0 }} /></span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 14.5, color: "var(--ink)" }}>{t}</b><span style={{ fontSize: 12.5, lineHeight: 1.35, color: "var(--ink3)" }}>{s}</span></span>
              </button>); })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>2. Má už účet v <DeedZnacka />?</span>
            <Segment volby={[[0, "Áno, má účet"], [1, "Nemá účet"]]} hodnota={cesta} onZmena={setCesta} tien />
          </div>
          {cesta === 0 && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input value={kon} onChange={(e) => setKon(e.target.value)} type="email" placeholder="jeho e-mail v DEED+" aria-label="E-mail správcu" style={pole} />
            <button onClick={pridaj} aria-disabled={!ok} style={{ ...plne(ok), height: 48, fontSize: 15 }}>Pridať správcu</button>
          </div>}
          {cesta === 1 && !poz && <>
            <button onClick={vytvor} style={{ ...plne(true), height: 48, fontSize: 15 }}>Vytvoriť pozvánku</button>
            <span style={pozn}>Appka vytvorí QR a odkaz pre 1 človeka s rolou, ktorú ste vybrali.</span>
          </>}
          {cesta === 1 && poz && <>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ flex: "none", borderRadius: 14, overflow: "hidden", border: "1px solid var(--cardBd)", lineHeight: 0 }}><DeedQr data={poz.url} size={112} variant={document.documentElement.classList.contains("dark") ? "inverzny" : "svetly"} /></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 14.5 }}>Pozvánka · {ROLY[poz.r][0]}</b><span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>Platí do {poz.do}. Naskenuje QR alebo ťukne na odkaz.</span></span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => void zdielaj({ titul: "Pozvánka do správy stránky", text: "Svetlo pomoci vás pozýva do správy stránky v DEED+. Odkaz platí 48 hodín.", url: poz.url }, toast)} style={{ ...plne(true), height: 48, fontSize: 15 }}>Zdieľať pozvánku</button>
              <button onClick={() => void kopiruj(poz.url, toast, "Odkaz je skopírovaný. Platí 48 hodín.")} style={{ ...obrys(), height: 48, fontSize: 15 }}>Kopírovať odkaz</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ ...pozn, flex: 1 }}>Zdieľať otvorí ponuku telefónu: WhatsApp, e-mail, Messenger…</span>
              <button onClick={zrusPoz} style={{ flex: "none", height: 44, padding: "0 12px", border: "none", borderRadius: 12, background: "transparent", cursor: "pointer", fontSize: 13.5, fontWeight: 800, color: CERVENA }}>Zrušiť pozvánku</button>
            </div>
          </>}
        </div>
        <div style={{ ...nad, marginTop: 10 }}>{cesta === 0 ? "AKO TO FUNGUJE · MÁ ÚČET" : "AKO TO FUNGUJE · NEMÁ ÚČET"}</div>
        <div style={{ ...krt, padding: "4px 16px" }}>
          {ako.map(([t, s], i) => (
            <div key={t} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: btn(i) }}>
              <span style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", background: "var(--accSoft)", border: "1px solid var(--cuBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--acc)" }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{t}</b><span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{s}</span></span>
            </div>))}
        </div>
        <span style={pozn}>{cesta === 0 ? "Prijatie potvrdzuje on vo svojom účte, vy už nič nepotvrdzujete." : "Registrovať sa v DEED+ nemusí. Bez registrácie môže robiť len správu vašej stránky. Inak vidí appku ako každý návštevník a môže prispievať. Nabudúce sa prihlási odtlačkom, Face ID alebo odkazom v e-maile. Žiadne SMS."}</span>
      </div>
    </div>);
}

// ============================================================
// 5 · Údaje organizácie
// ============================================================
type Ud = { mail: string; tel: string; dic: string; fmail: string; ina: boolean; adr: string };
const UD0: Ud = { mail: "info@svetlopomoci.sk", tel: "+421 905 111 222", dic: "", fmail: "info@svetlopomoci.sk", ina: false, adr: "" };
/** IČO a sídlo z registra — jeden zdroj pre Údaje organizácie aj Upraviť profil (OPRAVY 108). TODO: tabuľka organizacia.sidlo */
export const SIDLO_REGISTRA = "Palackého 14, 911 01 Trenčín";
export const ICO_REGISTRA = "00 000 000";
/** OPRAVY 114: hlavný účet organizácie z registrácie (jedno miesto — Účty aj Nová zbierka v Zadarmo) */
export const HLAVNY_UCET = "SK31 0900 0000 0051 2233 4417";

export function ObrUdaje({ mobil }: { mobil: boolean }) {
  const [ud, setUd] = usePamat<Ud>("ud", UD0);
  const [d, setD] = useState<Partial<Ud>>({});
  const v = <K extends keyof Ud>(k: K): Ud[K] => (d[k] ?? ud[k]) as Ud[K];
  const zmena = (Object.keys(d) as (keyof Ud)[]).some((k) => d[k] !== ud[k]);
  const set = (k: keyof Ud) => (e: React.ChangeEvent<HTMLInputElement>) => { const x = e.target.value; setD((c) => ({ ...c, [k]: x })); };
  const REG: [string, string][] = [["Názov", "Svetlo pomoci o.z."], ["IČO", ICO_REGISTRA], ["Právna forma", "Občianske združenie"], ["Sídlo", SIDLO_REGISTRA], ["Dátum vzniku", "14. 3. 2012"], ["Štatutár", "Martin Štofik · overený"]];
  const Pole = ({ k, t, ph, typ = "text" }: { k: keyof Ud; t: React.ReactNode; ph?: string; typ?: string }) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>{t}</span><input type={typ} value={v(k) as string} onChange={set(k)} placeholder={ph} style={pole} /></label>);
  return (
    <div style={dvaStlpce(mobil)}>
      <div style={stlpec}>
        <div style={nad}>Z REGISTRA</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {REG.map(([t, x], i) => <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", borderTop: btn(i) }}><span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t}</span><span style={{ fontSize: 15, fontWeight: 700 }}>{x}</span></span>{ZAMOK}</div>)}
        </div>
        <span style={pozn}>Tieto údaje sme overili pri registrácii vo verejnom registri. V appke sa nedajú prepísať. Keď ich zmeníte v registri, načítajte ich znova.</span>
        <button onClick={() => toast("Údaje sme načítali z registra. Nič sa nezmenilo.")} style={{ ...obrys(), alignSelf: "flex-start" }}>Načítať znova z registra</button>
      </div>
      <div style={stlpec}>
        <div style={nad}>KONTAKT PRE <DeedZnacka /></div>
        <div style={{ ...krt, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {Pole({ k: "mail", t: "E-mail organizácie", typ: "email" })}
          {Pole({ k: "tel", t: "Telefón", typ: "tel" })}
          <span style={pozn}>Sem vám píšeme my. Kontakt pre darcov je v Upraviť profil.</span>
        </div>
        <div style={{ ...nad, marginTop: 10 }}>FAKTURAČNÉ ÚDAJE</div>
        <div style={{ ...krt, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {Pole({ k: "dic", t: <>DIČ <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· ak ho máte</span></>, ph: "napr. 2021234567" })}
          <RiadokPrep i={0} minH={48} t="Fakturačná adresa = sídlo" s={SIDLO_REGISTRA} on={!v("ina")} onClick={() => setD((c) => ({ ...c, ina: !v("ina") }))} />
          {v("ina") && <input value={v("adr")} onChange={set("adr")} placeholder="ulica, PSČ, mesto" aria-label="Fakturačná adresa" style={pole} />}
          {Pole({ k: "fmail", t: "E-mail na faktúry", typ: "email" })}
          <span style={pozn}>Na tieto údaje vystavíme faktúru za program. V programe Zadarmo neplatíte nič.</span>
        </div>
        <button onClick={() => { if (!zmena) return; setUd({ ...ud, ...d }); setD({}); toast("Údaje sú uložené."); }} aria-disabled={!zmena} style={plne(zmena)}>Uložiť</button>
      </div>
    </div>);
}

// ============================================================
// 6 · Program a predplatné
// ============================================================
type Prog = [string, string, number, number, string[]];
export const PROG: Prog[] = [
  ["Zadarmo", "P0", 0, 0, ["Profil, karma a štít", "1 zbierka naraz", "1 Iskra mesačne", "Prehľad darcov a ročný výpis"]],
  ["Zbierka", "P1", 33, 336.6, ["5 zbierok naraz, mimo centrálnej", "Centrálna zbierka spoločnosti", "Pravidelná podpora", "Dlhodobá zbierka, 3 až 12 mesiacov", "Vlastný účet pre každú zbierku", "Spolufinancovanie", "Sponzoring so zmluvou", "Oznamy, oznam vo verejnom záujme a inzerát", "Štít dôvery na web"]],
  ["Akcia", "P2", 90, 918, ["10 zbierok naraz", "Benefičné podujatia a lístky", "Dobrovoľníci a QR dochádzka", "Sektorové zbierky podľa činnosti", "Upútavky v Iskre", "2 Iskry mesačne"]],
  ["Kampaň", "P3", 150, 1530, ["Zbierky bez limitu", "Sektorové QR", "Materiálne zbierky", "Prednosť vo vyhľadávaní", "Export pre granty", "4 Iskry mesačne"]],
];
const A = "A";
const POR: [string, [string, ...string[]][]][] = [
  ["Profil a dôvera", [["Profil — foto, logo, popis, odkaz na web", A, A, A, A], ["Karma a štít, Bronze až Legend", A, A, A, A], ["Zápis v adresári", A, A, A, A], ["QR identity — overená organizácia", A, A, A, A], ["Skutky do feedu mesta", A, A, A, A], ["Iskra — video do 45 s", "1 / mes.", "1 / mes.", "2 / mes.", "4 / mes."], ["Ďalšia Iskra nad kvótu", "10 €", "10 €", "10 €", "10 €"], ["Štít dôvery na vlastný web", "", A, A, A], ["Sektorové QR", "", "", "", A]]],
  ["Zbierky", [["Krátka cieľová zbierka, do 30 dní", A, A, A, A], ["Súbežne otvorených zbierok, mimo centrálnej", "1", "5", "10", "bez limitu"], ["QR zbierky na zdieľanie", A, A, A, A], ["Dôkazy a správy", A, A, A, A], ["Centrálna zbierka spoločnosti", "", A, A, A], ["Predĺženie vo feede, +15 dní za 5 / 15 / 40 €", A, A, A, A], ["Dlhodobá zbierka, 3 až 12 mesiacov", "", A, A, A], ["Vlastný účet pre každú zbierku", "", A, A, A], ["Spolufinancovanie", "", A, A, A], ["Sektorové zbierky podľa činnosti", "", "", A, A], ["Materiálne zbierky", "", "", "", A]]],
  ["Príjem daru", [["Jednorazový dar — prevod, karta, DEED+", A, A, A, A], ["Rýchle sumy a vlastná suma", A, A, A, A], ["Pravidelná podpora — mesačný dar", "", A, A, A]]],
  ["Sponzoring", [["Hľadáme sponzora s protiplnením", "", A, A, A], ["Predvyplnená sponzorská zmluva", "", A, A, A], ["Logo sponzora na profile", "", A, A, A], ["Doklad o protiplnení pre sponzora", "", A, A, A], ["Sponzorských zbierok", "", "bez limitu", "bez limitu", "bez limitu"]]],
  ["Prezentácia, oznamy a ľudia", [["Prezentácia činnosti a služieb", "", A, A, A], ["Oznamy na profile", "", A, A, A], ["Inzerát — zamestnanec, brigádnik, člen", "", "1", "5", "bez limitu"], ["Oznam vo verejnom záujme (nástenka mesta)", "", A, A, A], ["Výzva na súrnu pomoc", A, A, A, A], ["Benefičné podujatie s QR", "", "", A, A], ["Predaj lístkov, merchu a služieb", "", "", A, A], ["Predaj vlastných školení, provízia 10 %", "", "", A, A]]],
  ["Dobrovoľníctvo", [["Dobrovoľnícka výzva pre verejnosť", "", "", A, A], ["QR dochádzka — príchod a odchod", "", "", A, A], ["Náhradníci a chat s prihlásenými", "", "", A, A], ["Upozornenie dobrovoľníkom v okolí", "", "", A, A], ["Výkaz odrobených hodín", "", "", A, A]]],
  ["Dosah a pobočky", [["Dosah — štvrť, mesto, kraj", A, A, A, A], ["Pobočiek", "1", "5", "10", "bez limitu"], ["Prednosť vo vyhľadávaní", "", "", "", A]]],
  ["Iskra a prehľady", [["Komu sme pomohli — výsledky", A, A, A, A], ["Upútavky na zbierky v Iskre", "", "", A, A], ["Prehľad darcov a súm", A, A, A, A], ["Ročný výpis činnosti", A, A, A, A], ["Export pre granty", "", "", "", A]]],
];
const f2 = (n: number) => n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
/** KARTA 36: spolok — jedna cena (cenník charity, stĺpec Spolok) */
const JEDNA_CENA: Partial<Record<TypStranky, { m: number; r: number; zlava: string; f: string[] } | null>> = {
  spolok: { m: 10, r: 100, zlava: "−16,7 %", f: ["Profil, karma a štít", "2 zbierky naraz: stála na členské + 1", "Členské ako stála zbierka, zoznam kto zaplatil", "Skupina členov — správca pozve, člen prijme pozvanie", "Členovia pridávajú sami: brigáda, fotky, oznam", "Oznamy a inzerát", "1 Iskra mesačne"] },
  farnost: null, // cenu dodá dizajn
};
/** program podľa typu: charita (4 programy) · jedna cena · B2B / tvorca (TIER_LABEL + TIER_POPIS z kódu) */
export function ObrProgram(p: { mobil: boolean; typ?: TypStranky; tier: Tier; onTier: (t: Tier) => void; otvor: (s: string) => void }) {
  const c = CENNIK_TYPU[p.typ ?? "charita"];
  if (c === "jedna") return <ProgramJednaCena {...p} typ={p.typ!} />;
  if (c === "b2b" || c === "tvorca") return <ProgramRola {...p} rola={c === "b2b" ? "b2b" : "tvorca"} />;
  return <ProgramCharita {...p} />;
}
function ProgramJednaCena({ mobil, typ, otvor }: { mobil: boolean; typ: TypStranky; otvor: (s: string) => void }) {
  const [roc, setRoc] = usePamat<boolean>("pr.roc", false);
  const j = JEDNA_CENA[typ];
  const cena = j ? (roc ? j.r : j.m) : 0;
  return (<>
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div style={{ ...krt, flex: 1, minWidth: mobil ? 0 : 260, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Váš program</span><b style={{ fontSize: 20 }}>{TYP_NAZOV[typ]}</b>
      </div>
      {j && <div style={{ flex: mobil ? "1 1 100%" : "none" }}><Segment volby={[[0, "Mesačne"], [1, `Na rok · ${j.zlava}`]]} hodnota={roc ? 1 : 0} onZmena={(v) => setRoc(v === 1)} tien /></div>}
    </div>
    <div style={{ ...krt, maxWidth: 420, borderRadius: 18, background: "var(--accSoft)", border: "1.5px solid var(--cuBd)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <b style={{ fontSize: 17 }}>{TYP_NAZOV[typ]}</b>
      {j ? <>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ display: "flex", alignItems: "baseline", gap: 4 }}><b style={{ fontSize: 26 }}>{f2(cena)}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{roc ? "na rok, jednou platbou" : "mesačne"}</span></span>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>bez DPH · s DPH {f2(Math.round(cena * 1.23 * 100) / 100)}{roc ? ` · ušetríte ${f2(j.m * 12 - j.r)}` : ""}</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingTop: 10, borderTop: "1px solid var(--cardBd)" }}>{j.f.map((x) => <span key={x} style={{ display: "flex", gap: 8, fontSize: 13.5, lineHeight: 1.35, color: "var(--ink2)" }}>{FAJKA()}{x}</span>)}</div>
      </> : <span style={{ fontSize: 15, color: "var(--ink2)" }}>Pripravujeme</span>}
    </div>
    <span style={pozn}>Jedna cena, jedna pobočka, jedno mesto. Ceny sú bez DPH.</span>
    <button onClick={() => otvor("n:udaje")} style={{ ...obrys(), alignSelf: "flex-start" }}>Fakturačné údaje</button>
  </>);
}
function ProgramRola({ mobil, rola, tier, onTier }: { mobil: boolean; rola: "b2b" | "tvorca"; tier: Tier; onTier: (t: Tier) => void }) {
  const [ch, setCh] = useState<number | null>(null);
  const L = TIER_LABEL[rola], D = TIER_POPIS[rola];
  return (<>
    <div style={{ ...krt, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Váš program</span><b style={{ fontSize: 20 }}>{L[tier]}</b><span style={{ fontSize: 13, color: "var(--ink2)" }}>{D[tier]}</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
      {L.map((n, i) => { const on = i === tier, pot = ch === i; return (
        <div key={n} style={{ minWidth: 0, borderRadius: 18, background: on ? "var(--accSoft)" : "var(--card)", border: on ? "1.5px solid var(--cuBd)" : "1px solid var(--cardBd)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 17 }}>{n}</b><span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.4, color: "var(--ink2)" }}>{D[i]}</span>
          <button onClick={on ? undefined : pot ? () => { onTier(i as Tier); setCh(null); toast(`Program ${n} platí od dnes.`); } : () => setCh(i)} aria-disabled={on || undefined}
            style={{ height: 46, borderRadius: 13, border: on ? "1.5px solid var(--cuBd)" : pot ? "none" : "1.5px solid var(--cardBd)", background: on ? "transparent" : pot ? ZELENA : "transparent", cursor: on ? "default" : "pointer", fontSize: 14.5, fontWeight: 800, color: on ? "var(--acc)" : pot ? "#fff" : "var(--ink)" }}>{on ? "Váš program" : pot ? "Potvrdiť zmenu" : `Prejsť na ${n}`}</button>
        </div>); })}
    </div>
  </>);
}
function ProgramCharita({ mobil, tier, onTier, otvor }: { mobil: boolean; tier: Tier; onTier: (t: Tier) => void; otvor: (s: string) => void }) {
  const cur = Math.min(3, tier);
  const [roc, setRoc] = usePamat<boolean>("pr.roc", false);
  const [ch, setCh] = useState<number | null>(null);
  const [por, setPor] = useState(false);
  const stav = cur === 0 ? "Neplatíte nič." : `Ďalšia platba 1. 11. 2026 · ${f2(roc ? PROG[cur][3] : PROG[cur][2])} bez DPH`;
  const poznT = ch != null && ch !== cur
    ? (ch > cur ? "Vyšší program platí hneď. Doplatíte len rozdiel za zvyšok obdobia." : "Nižší program začne platiť od ďalšieho obdobia. Dovtedy máte všetko, za čo ste zaplatili. Zbierky nad limit dobehnú, nové otvoríte až v limite.")
    : (roc ? "Na rok zaplatíte jednou platbou a máte 15 % zľavu. " : "Mesačne platíte každý mesiac, kedykoľvek zrušíte. ") + "Ceny sú bez DPH. Program môžete zmeniť kedykoľvek.";
  const VZDY = ["SEPA prevod je zadarmo. Celá suma príde na váš účet do 1 pracovného dňa. Výnimka: dar rozdelený cez Reťaz dobra, tam si poplatok účtuje poskytovateľ platobných služieb a strhne sa z daru. Nie je to poplatok DEED+.", "Pri platbe kartou platí poplatok darca navrch. Vy dostanete celý dar.", "Topovanie zbierky si môžete kúpiť zvlášť v každom programe.", "Karma sa nedá kúpiť. Program mení len to, čo máte zapnuté."];
  const PLATBA: [string, string, string][] = [["Spôsob platby", cur ? "faktúra prevodom" : "zatiaľ nič neplatíte", "x:Spôsob platby"], ["Faktúry", cur ? "3 faktúry · posledná 1. 10. 2026" : "zatiaľ žiadne", "x:Faktúry"], ["Fakturačné údaje", "IČO, DIČ, adresa, e-mail na faktúry", "n:udaje"]];
  return (<>
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div style={{ ...krt, flex: 1, minWidth: mobil ? 0 : 260, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Váš program</span><b style={{ fontSize: 20 }}>{PROG[cur][0]} · {PROG[cur][1]}</b><span style={{ fontSize: 13, color: "var(--ink2)" }}>{stav}</span>
      </div>
      <div style={{ flex: mobil ? "1 1 100%" : "none" }}><Segment volby={[[0, "Mesačne"], [1, "Na rok · −15 %"]]} hodnota={roc ? 1 : 0} onZmena={(v) => { setRoc(v === 1); setCh(null); }} tien /></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(4,minmax(0,1fr))", gap: 12, alignItems: "stretch" }}>
      {PROG.map(([n, k, m, r, f], i) => {
        const on = i === cur, pot = ch === i, cena = roc ? r : m;
        const dph = cena ? `bez DPH · s DPH ${f2(Math.round(cena * 1.23 * 100) / 100)}${roc ? ` · ušetríte ${f2(Math.round((m * 12 - r) * 100) / 100)}` : ""}` : "navždy";
        const btT = on ? "Váš program" : pot ? (i > cur ? "Potvrdiť zmenu" : "Potvrdiť prechod") : `Prejsť na ${n}`;
        const tap = on ? undefined : pot ? () => { onTier(i as Tier); setCh(null); toast(i > cur ? `Program ${n} platí od dnes.` : `Program ${n} začne platiť od 1. 11. 2026.`); } : () => setCh(i);
        return (
          <div key={n} style={{ minWidth: 0, borderRadius: 18, background: on ? "var(--accSoft)" : "var(--card)", border: on ? "1.5px solid var(--cuBd)" : "1px solid var(--cardBd)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ flex: 1, fontSize: 17 }}>{n}</b><span style={{ height: 22, padding: "0 8px", borderRadius: 11, background: "var(--btn)", display: "flex", alignItems: "center", fontSize: 11.5, fontWeight: 800, color: "var(--ink3)" }}>{k}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}><b style={{ fontSize: 26 }}>{f2(cena)}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{cena ? (roc ? "na rok, jednou platbou" : "mesačne") : ""}</span></span><span style={{ fontSize: 12, color: "var(--ink3)" }}>{dph}</span></div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, paddingTop: 10, borderTop: "1px solid var(--cardBd)" }}>
              {f.map((x) => <span key={x} style={{ display: "flex", gap: 8, fontSize: 13.5, lineHeight: 1.35, color: "var(--ink2)" }}>{FAJKA()}{x}</span>)}
            </div>
            <button onClick={tap} aria-disabled={on || undefined} style={{ height: 46, borderRadius: 13, border: on ? "1.5px solid var(--cuBd)" : (pot || i > cur) ? "none" : "1.5px solid var(--cardBd)", background: on ? "transparent" : pot ? ZELENA : i > cur ? "var(--green)" : "transparent", cursor: on ? "default" : "pointer", fontSize: 14.5, fontWeight: 800, color: on ? "var(--acc)" : (pot || i > cur) ? "#fff" : "var(--ink)" }}>{btT}</button>
          </div>);
      })}
    </div>
    <span style={pozn}>{poznT}</span>
    <button onClick={() => setPor((x) => !x)} aria-expanded={por} style={{ alignSelf: "center", height: 46, padding: "0 20px", borderRadius: 13, border: "1.5px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
      {por ? "Skryť celé porovnanie" : "Celé porovnanie programov"}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ transform: por ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}><path d="M6 9l6 6 6-6" /></svg>
    </button>
    {por && <div style={{ ...krt, overflowX: "auto", overscrollBehaviorX: "contain" }}>
      <div style={{ minWidth: 560 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2.2fr) repeat(4,minmax(0,1fr))", padding: "12px 16px", background: "var(--btn)", fontSize: 13, fontWeight: 800 }}>
          <span />{PROG.map(([n], i) => <span key={n} style={{ textAlign: "center", color: i === cur ? "var(--acc)" : "var(--ink)" }}>{n}</span>)}
        </div>
        {POR.map(([g, rows]) => (
          <div key={g}>
            <div style={{ padding: "12px 16px 4px", ...nad }}>{g.toUpperCase()}</div>
            {rows.map(([t, ...v]) => (
              <div key={t} style={{ display: "grid", gridTemplateColumns: "minmax(0,2.2fr) repeat(4,minmax(0,1fr))", alignItems: "center", minHeight: 42, padding: "0 16px", borderTop: "1px solid var(--cardBd)" }}>
                <span style={{ fontSize: 13.5, lineHeight: 1.35, color: "var(--ink2)", padding: "6px 8px 6px 0" }}>{sZnackou(t)}</span>
                {v.map((x, i) => <span key={i} style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", minHeight: 42, background: i === cur ? "var(--accSoft)" : "transparent", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                  {x === A ? <span role="img" aria-label="áno">{FAJKA("var(--acc)", 16)}</span> : x === "" ? <span aria-label="nie" style={{ color: "var(--ink4)" }}>—</span> : x}</span>)}
              </div>))}
          </div>))}
      </div>
    </div>}
    <div style={dvaStlpce(mobil)}>
      <div style={stlpec}><div style={nad}>PLATÍ VŽDY, V KAŽDOM PROGRAME</div><Zoznam polozky={VZDY} /></div>
      <div style={stlpec}><div style={nad}>PLATBA A FAKTÚRY</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {PLATBA.map(([t, s, ciel], i) => (
            <button key={t} onClick={() => otvor(ciel)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 56, border: "none", borderTop: btn(i), background: "transparent", cursor: "pointer", textAlign: "left" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{t}</span><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>{SIPKA}
            </button>))}
        </div>
      </div>
    </div>
  </>);
}

// ============================================================
// 7 · Prihlásené zariadenia
// ============================================================
type Zar = { id: number; pc?: boolean; n: string; kto: string; m: string; a: string; ja?: boolean; nove?: boolean };
const ZAR0: Zar[] = [{ id: 1, pc: true, n: "MacBook Air · Chrome", kto: "Martin Štofik", m: "Trenčín", a: "teraz", ja: true }, { id: 2, n: "iPhone 15 · appka DEED+", kto: "Martin Štofik", m: "Trenčín", a: "pred 2 hodinami" }, { id: 3, n: "Samsung Galaxy A54 · appka DEED+", kto: "Martin Štofik", m: "Bratislava", a: "dnes 11:20", nove: true }];
export function ObrZariadenia({ mobil }: { mobil: boolean }) {
  const [Z, setZ] = usePamat<Zar[]>("zar", ZAR0);
  return (
    <div style={dvaStlpce(mobil, "1.4fr", "1fr")}>
      <div style={stlpec}>
        <div style={nad}>ZARIADENIA · {Z.length}</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {Z.map((z, i) => (
            <div key={z.id} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 12px", minHeight: 72, padding: "10px 0", borderTop: btn(i) }}>
              <span style={{ width: 40, height: 40, flex: "none", borderRadius: 12, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{z.pc ? <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M2 20h20" /></> : <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>}</svg>
              </span>
              <span style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 15 }}>{sZnackou(z.n)}</b>{z.ja && <span style={{ flex: "none", whiteSpace: "nowrap", height: 22, padding: "0 8px", borderRadius: 11, background: "var(--gSoft)", display: "flex", alignItems: "center", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: "var(--gInk)" }}>TOTO ZARIADENIE</span>}</span>
                <span style={{ fontSize: 13, color: "var(--ink3)" }}>{z.kto} · {z.m} · {z.a}</span>
                {z.nove && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold)" }}>nové · 24 h bez zmeny účtov a správcov</span>}
              </span>
              {!z.ja && <button onClick={() => { setZ((a) => a.filter((y) => y.id !== z.id)); toast(`${z.n.split(" · ")[0]} je odhlásený.`); }} style={{ ...obrys(CERVENA), marginLeft: "auto", fontSize: 13.5 }}>Odhlásiť</button>}
            </div>))}
        </div>
        {Z.length > 1 && <button onClick={() => { setZ((a) => a.filter((y) => y.ja)); toast("Ostatné zariadenia sú odhlásené."); }} style={{ ...obrys(CERVENA), alignSelf: "flex-start" }}>Odhlásiť všetky ostatné</button>}
        <span style={pozn}>Vidíte zariadenia všetkých správcov stránky. Najviac 5 na jedného správcu.</span>
      </div>
      <div style={stlpec}><div style={nad}>AKO CHRÁNIME STRÁNKU</div>
        <Zoznam polozky={["Nové zariadenie 24 hodín nemôže meniť účty, program ani správcov.", "Pri prihlásení z nového zariadenia dostane hlavný správca oznámenie.", "Výplatu na účet a zmenu účtu potvrdzuje odtlačok, Face ID alebo PIN.", "Keď správcu odoberiete, odhlási sa zo všetkých zariadení hneď."]} />
      </div>
    </div>);
}

// ============================================================
// 8 · Súhlasy
// ============================================================
export function ObrSuhlasy({ mobil, otvor }: { mobil: boolean; otvor: (s: string) => void }) {
  const [sh, setSh] = usePamat<Record<string, boolean>>("shc", {});
  const POV: [string, string, string][] = [["Podmienky pre organizácie", "zbierky, doklady, programy a poplatky", "Martin Štofik · 30. 9. 2026 · verzia 1.0"], ["Zmluva o spracúvaní osobných údajov", "ako DEED+ spracúva údaje vašich darcov za vás", "Martin Štofik · 30. 9. 2026"], ["Overenie organizácie", "kontrola v registri a overenie štatutára", "overené 30. 9. 2026"]];
  const NEP: [string, string, string, boolean][] = [["news", "Novinky DEED+ e-mailom", "nové funkcie, najviac raz mesačne", true], ["stat", "Anonymné štatistiky", "pomáhajú nám opraviť chyby, bez údajov darcov", true], ["part", "Súhrn pre partnerov", "firmy, ktoré dorovnávajú, vidia len súčty, nikdy mená darcov", true], ["tip", "Tipy, ako zbierať lepšie", "raz týždenne v appke", false]];
  return (<>
    <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", maxWidth: 760 }}>Tu vidíte, s čím organizácia súhlasila. Povinné súhlasy odsúhlasil štatutár pri registrácii. Nepovinné môžete kedykoľvek vypnúť.</span>
    <div style={dvaStlpce(mobil)}>
      <div style={stlpec}>
        <div style={nad}>POVINNÉ</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {POV.map(([t, s, d], i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 72, padding: "10px 0", borderTop: btn(i) }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span><span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink2)" }}>{d}</span></span>
              <button onClick={() => otvor(`x:${t}`)} style={{ ...obrys(), fontSize: 13.5 }}>Zobraziť</button>
            </div>))}
        </div>
        <span style={pozn}>Povinné súhlasy zrušíte len zrušením stránky charity. Keď zmeníme znenie, hlavnému správcovi príde oznámenie a nové znenie odsúhlasí znova.</span>
      </div>
      <div style={stlpec}>
        <div style={nad}>NEPOVINNÉ</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {NEP.map(([k, t, s, d], i) => <RiadokPrep key={k} i={i} minH={66} t={sZnackou(t)} s={s} on={sh[k] ?? d} onClick={() => setSh((c) => ({ ...c, [k]: !(c[k] ?? d) }))} />)}
        </div>
        <span style={pozn}>Znenie každého súhlasu aj s dátumom a menom toho, kto ho odsúhlasil, je v Stiahnuť údaje charity.</span>
      </div>
    </div>
  </>);
}

// ============================================================
// 9 · Stiahnuť údaje charity
// ============================================================
type Subor = { id: number; n: string; pr: boolean };
export function ObrStiahnut({ mobil }: { mobil: boolean }) {
  const [st, setSt] = usePamat<Record<string, boolean | number>>("st", {});
  const [sub, setSub] = usePamat<Subor[]>("st.sub", []);
  const P: [string, string, string, boolean][] = [["zb", "Zbierky a doklady", "každá zbierka, sumy, bločky a faktúry", true], ["da", "Darcovia a dary", "mená len tých, ktorí ich dovolili ukázať", true], ["vy", "Výplaty a faktúry DEED+", "čo prišlo na účty a čo ste platili za program", true], ["su", "Súhlasy a ich znenia", "kto a kedy čo odsúhlasil", false], ["zm", "Správcovia a záznam zmien", "kto čo pridal, zmenil alebo odoslal", false]];
  const on = (k: string, d: boolean) => (st[k] as boolean | undefined) ?? d;
  const any = P.some(([k, , , d]) => on(k, d));
  const ob = (st.ob as number | undefined) ?? 0, fo = (st.fo as number | undefined) ?? 0;
  const pr = sub.some((f) => f.pr);
  const ok = any && !pr;
  useEffect(() => {
    if (!pr) return;
    const t = window.setTimeout(() => setSub((a) => a.map((f) => ({ ...f, pr: false }))), 2500);
    return () => window.clearTimeout(t);
  }, [pr]); // eslint-disable-line react-hooks/exhaustive-deps
  const priprav = () => { if (!ok) return; const n = `Svetlo pomoci · ${["2026", "2025", "všetko"][ob]}.${["xlsx", "pdf", "json"][fo]}`; setSub((a) => [{ id: Date.now(), n, pr: true }, ...a]); };
  return (
    <div style={dvaStlpce(mobil, "1.2fr", "1fr")}>
      <div style={stlpec}>
        <div style={nad}>ČO CHCETE STIAHNUŤ</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {P.map(([k, t, s, d], i) => { const o = on(k, d); return (
            <button key={k} role="checkbox" aria-checked={o} onClick={() => setSt((c) => ({ ...c, [k]: !o }))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 0", border: "none", borderTop: btn(i), background: "transparent", cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 24, height: 24, flex: "none", borderRadius: 7, border: `1.5px solid ${o ? "var(--green)" : "#A8A396"}`, background: o ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: o ? 1 : 0 }}><path d="M5 12l5 5 9-10" /></svg></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15, color: "var(--ink)" }}>{sZnackou(t)}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
            </button>); })}
        </div>
        <div style={{ ...nad, marginTop: 10 }}>OBDOBIE</div>
        <Segment volby={[[0, "Tento rok"], [1, "Minulý rok"], [2, "Všetko"]]} hodnota={ob} onZmena={(v) => setSt((c) => ({ ...c, ob: v }))} tien />
        <div style={{ ...nad, marginTop: 10 }}>FORMÁT</div>
        <Segment volby={[[0, "Excel"], [1, "PDF"], [2, "JSON"]]} hodnota={fo} onZmena={(v) => setSt((c) => ({ ...c, fo: v }))} tien />
        <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{["tabuľky na otvorenie v Exceli alebo Tabuľkách Google", "prehľadný dokument na tlač alebo pre výbor", "pre programátora alebo iný systém"][fo]}</span>
        <button onClick={priprav} aria-disabled={!ok} style={{ ...plne(ok), marginTop: 6 }}>{pr ? "Pripravujeme súbor…" : "Pripraviť súbor"}</button>
      </div>
      <div style={stlpec}>
        <div style={nad}>PRIPRAVENÉ SÚBORY</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {sub.length === 0 ? <div style={{ padding: "18px 0", fontSize: 14, color: "var(--ink2)" }}>Zatiaľ ste nič nepripravili.</div>
            : sub.map((f, i) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, borderTop: btn(i) }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d="M6 3h9l4 4v14H6zM14 3v5h5" /></svg>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{f.n}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{f.pr ? "pripravujeme, pošleme vám aj e-mail" : "pripravené dnes · platí 7 dní"}</span></span>
                <button onClick={() => { if (!f.pr) toast("Potvrďte odtlačkom, Face ID alebo PIN. Potom sa súbor stiahne."); }} aria-disabled={f.pr || undefined} style={{ flex: "none", height: 44, padding: "0 14px", border: "none", borderRadius: 12, background: f.pr ? SIVA : ZELENA, cursor: f.pr ? "default" : "pointer", fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{f.pr ? "Čakajte" : "Stiahnuť"}</button>
              </div>))}
        </div>
        <Zoznam polozky={["Stiahnuť môže len hlavný správca. Potvrdí to odtlačkom, Face ID alebo PIN.", "Údaje darcov používajte len pre vlastnú evidenciu a výkazy.", "Odkaz na stiahnutie platí 7 dní, potom sa súbor zmaže.", "Kto a kedy sťahoval, uvidíte v Správcovia a záznam zmien."]} />
      </div>
    </div>);
}

// ============================================================
// 10 · Časté otázky
// ============================================================
const FAQ: [string, [string, string][]][] = [
  ["PENIAZE", [["Koľko stojí DEED+?", "Program Zadarmo je zadarmo navždy. Platené programy začínajú na 33 € mesačne bez DPH. Prehľad je v Nastavenia → Program a predplatné."], ["Platíme poplatok z darov?", "Nie. SEPA prevod je zadarmo. Pri platbe kartou platí poplatok darca navrch, vy dostanete celý dar. Výnimka: pri dare rozdelenom cez Reťaz dobra si za rozdelenie platby účtuje poplatok poskytovateľ platobných služieb a strhne sa z daru. Nie je to poplatok DEED+."], ["Kedy prídu peniaze na účet?", "SEPA prevod príde na transparentný účet zbierky do 1 pracovného dňa."], ["Môžeme zmeniť hlavný účet?", "Len cez podporu. Nový účet musíme znova overiť, aby sa peniaze nedostali na cudzí účet."], ["Čo je EURC?", "Digitálna mena naviazaná na euro, 1 EURC = 1 €. Či ju prijímate, rozhodnete v Nastavenia → Dary v EURC. Keď ju vypnete, darcovia ju u vás neuvidia."]]],
  ["ZBIERKY", [["Koľko zbierok môžeme mať naraz?", "Zadarmo 1, Zbierka 5, Akcia 10, Kampaň bez limitu. Centrálna zbierka sa do limitu nepočíta."], ["Čo je centrálna zbierka?", "Stála zbierka celej organizácie bez konca. Ľudia vás cez ňu podporujú aj mesačne. Máte ju od programu Zbierka."], ["Čo sú sektorové zbierky?", "Zbierka na tému, ktorú robíte dlhodobo, napríklad Pomoc seniorom. Nemá cieľ ani koniec, beží, kým ju nezavriete. Má vlastný účet a vlastné QR. Darca, ktorý nechce dať na jeden prípad ani naslepo celej organizácii, si vyberie tému, ktorá mu je blízka. Máte ich od programu Akcia."], ["Aký sektor si môžeme otvoriť?", "Len taký, ktorý máte zapísaný ako činnosť v stanovách, zriaďovacej listine alebo v registri. Overíme to pri registrácii. Keď stanovy rozšírite, požiadajte o pridanie sektora a doložte zmenu."], ["Musíme dokladovať pri centrálnej a sektorovej zbierke?", "Pri centrálnych a sektorových zbierkach dokladovať nemusíte, je to dobrovoľné. Dokladovanie ale zvyšuje vašu karmu aj dôveryhodnosť v očiach darcov."], ["Aký je rozdiel medzi centrálnou a sektorovou zbierkou?", "Centrálna je na chod celej organizácie. Sektorová na jednu tému, ktorú robíte dlhodobo. Konkrétna zbierka je na jeden prípad s cieľom a koncom."], ["Prečo musíme dokladovať?", "Darcovia chcú vidieť, na čo išli ich peniaze. Doklady nahráte do lehoty, ktorú si zvolíte pri zbierke. Overovateľ ich skontroluje."], ["Prečo sa cieľ a účel nedajú zmeniť?", "Po spustení sú zamknuté pre vás aj pre nás. Darca tak vie, že dáva presne na to, čo videl."]]],
  ["SPRÁVA STRÁNKY", [["Ako pridám ďalšieho správcu?", "Nastavenia → Správcovia a prístupy → Pridať správcu. Ak má účet v DEED+, napíšete jeho e-mail. Ak nemá, pošlete mu pozvánku."], ["Musí sa správca registrovať?", "Nie. Bez registrácie môže robiť len správu vašej stránky. Prihlasuje sa odtlačkom, Face ID alebo odkazom v e-maile."], ["Ako získame vyšší štít?", "Štít rastie s karmou charity: skutky, doložené zbierky a spokojní darcovia. Kúpiť sa nedá."], ["Čo je Iskra?", "Krátke video do 45 s. Keď ho spojíte so zbierkou, pod videom je tlačidlo Darovať."]]],
];
export function ObrFaq({ otvor }: { otvor: (s: string) => void }) {
  const [q, setQ] = useState("");
  const [o, setO] = useState<string | null>(null);
  const n = q.trim().toLowerCase();
  const sk = FAQ.map(([g, Q], gi) => ({ g, gi, q: Q.filter(([a, b]) => !n || `${a} ${b}`.toLowerCase().includes(n)) })).filter((x) => x.q.length);
  return (
    <div style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ position: "relative", display: "block" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ position: "absolute", left: 14, top: 15 }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input value={q} onChange={(e) => { setQ(e.target.value); setO(null); }} type="search" placeholder="Hľadať v otázkach" aria-label="Hľadať v otázkach" style={{ ...pole, borderRadius: 14, paddingLeft: 42 }} />
      </label>
      {sk.map(({ g, gi, q: Q }) => (
        <div key={g} style={stlpec}>
          <div style={nad}>{g}</div>
          <div style={{ ...krt, padding: "0 16px" }}>
            {Q.map(([a, b], i) => { const id = `${gi}-${a}`, on = o === id || (!!n && o == null); return (
              <div key={a} style={{ borderTop: btn(i) }}>
                <button onClick={() => setO(o === id ? "" : id)} aria-expanded={on} style={{ width: "100%", minHeight: 56, padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                  <b style={{ flex: 1, fontSize: 15, color: "var(--ink)" }}>{sZnackou(a)}</b>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flex: "none", transform: on ? "rotate(180deg)" : "none", transition: "transform .2s ease" }}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {on && <div style={{ padding: "0 28px 14px 0", fontSize: 14, lineHeight: 1.55, color: "var(--ink2)" }}>{b}</div>}
              </div>); })}
          </div>
        </div>))}
      {sk.length === 0 && <div style={{ ...krt, padding: "18px 16px", fontSize: 14, color: "var(--ink2)" }}>Na „{q}“ sme nič nenašli.</div>}
      <div style={{ ...krt, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ flex: 1, fontSize: 14.5, color: "var(--ink2)" }}>Nenašli ste odpoveď?</span>
        <button onClick={() => otvor("n:podpora")} style={{ flex: "none", height: 46, padding: "0 18px", border: "none", borderRadius: 13, background: ZELENA, cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "#fff" }}>Napísať podpore</button>
      </div>
    </div>);
}

// ============================================================
// 11 · Napísať podpore
// ============================================================
type Msg = { t: string; d: string; s: "riešime" | "vyriešené" };
const TEMY = ["Peniaze a výplaty", "Zbierka", "Účet a správcovia", "Program a faktúry", "Niečo nefunguje", "Iné"];
export function ObrPodpora({ mobil, otvor }: { mobil: boolean; otvor: (s: string) => void }) {
  const [tm, setTm] = useState(-1);
  const [zb, setZb] = useState("");
  const [tx, setTx] = useState("");
  const [pr, setPr] = useState(0);
  const [L, setL] = usePamat<Msg[]>("po.L", [{ t: "Výplata na účet neprišla", d: "odoslané 24. 9. 2026", s: "vyriešené" }]);
  const ok = tm >= 0 && tx.trim().length > 5;
  const odosli = () => { if (!ok) return; setL((a) => [{ t: tx.trim().slice(0, 60), d: `${TEMY[tm]} · odoslané dnes`, s: "riešime" }, ...a]); setTm(-1); setTx(""); setPr(0); setZb(""); toast("Správu sme dostali. Odpovieme do 1 pracovného dňa."); };
  return (
    <div style={dvaStlpce(mobil, "1.3fr", "1fr")}>
      <div style={stlpec}>
        <div style={nad}>S ČÍM VÁM POMÔŽEME</div>
        <div style={{ ...krt, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div role="radiogroup" aria-label="Téma" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TEMY.map((t, i) => { const on = i === tm; return <button key={t} role="radio" aria-checked={on} onClick={() => setTm(i)} style={{ height: 44, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${on ? "var(--cuBd)" : "var(--cardBd)"}`, background: on ? "var(--accSoft)" : "transparent", cursor: "pointer", fontSize: 14, fontWeight: 800, color: on ? "var(--acc)" : "var(--ink)" }}>{t}</button>; })}
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Týka sa to zbierky? <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· nepovinné</span></span>
            <select value={zb} onChange={(e) => setZb(e.target.value)} style={{ ...pole, padding: "0 12px" }}><option value="">Nie</option><option value="1">Strecha pre rodinu Horváthovú</option><option value="2">Invalidný vozík pre Ninu</option><option value="3">Teplé jedlo na zimu</option></select></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Čo sa stalo</span>
            <textarea value={tx} onChange={(e) => setTx(e.target.value)} rows={6} placeholder="Napíšte to vlastnými slovami. Čím viac podrobností, tým rýchlejšie pomôžeme." style={{ ...pole, height: "auto", padding: "12px 14px", lineHeight: 1.5, resize: "vertical" }} /></label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 14px", borderRadius: 12, border: "1.5px dashed #BDB6A8", cursor: "pointer", color: "var(--gInk)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12l-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 8" /></svg>
            <b style={{ flex: 1, fontSize: 14.5 }}>{pr ? `Priložené: ${pr} ${pr === 1 ? "súbor" : pr < 5 ? "súbory" : "súborov"}` : "Priložiť snímku obrazovky alebo doklad"}</b>
            <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => { const n = (e.target.files || []).length; e.target.value = ""; setPr((x) => x + n); }} style={{ display: "none" }} />
          </label>
          <button onClick={odosli} aria-disabled={!ok} style={plne(ok)}>Odoslať</button>
          <span style={pozn}>Odpovieme v appke aj na e-mail info@svetlopomoci.sk. Spolu so správou pošleme aj verziu appky a zariadenie, aby sme chybu našli rýchlejšie.</span>
        </div>
      </div>
      <div style={stlpec}>
        <div style={nad}>VAŠE SPRÁVY</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {L.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, borderTop: btn(i) }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{r.d}</span></span>
              <span style={{ flex: "none", whiteSpace: "nowrap", height: 24, padding: "0 9px", borderRadius: 12, background: r.s === "riešime" ? "var(--warnBg)" : "var(--gSoft)", color: r.s === "riešime" ? "var(--gold)" : "var(--gInk)", display: "flex", alignItems: "center", fontSize: 12, fontWeight: 800 }}>{r.s}</span>
            </div>))}
        </div>
        <Zoznam polozky={["Odpovieme do 1 pracovného dňa.", "Peniaze a výplaty riešime prednostne.", "Píše vám vždy človek z DEED+, nie automat."]} />
        <button onClick={() => otvor("n:faq")} style={{ ...obrys(), alignSelf: "flex-start" }}>Pozrieť Časté otázky</button>
      </div>
    </div>);
}

// ============================================================
// 12 · Zrušiť stránku charity
// ============================================================
export function ObrZrusit({ mobil, otvor, tier, nova }: { mobil: boolean; otvor: (s: string) => void; tier: Tier; nova: boolean }) {
  const [dov, setDov] = useState("");
  const [txt, setTxt] = useState("");
  const [k2, setK2] = useState(false);
  const cur = Math.min(3, tier);
  const program = cur === 0 ? "Žiadny, neplatíte nič." : `Program ${PROG[cur][0]} · zaplatené do 31. 10. 2026. Zrušením sa platba zastaví, peniaze za zvyšok obdobia nevraciame.`;
  // blokuje len bežiaca zbierka a nedoložené doklady; platený program neblokuje
  const K: [string, string, boolean, string?][] = [
    ["Bežiace zbierky", nova ? "Žiadna zbierka nebeží." : "2 zbierky ešte bežia. Ukončite ich, peniaze prídu na účty.", !nova, "Ukončiť zbierky"],
    ["Doklady", nova ? "Všetko je doložené." : "Teplé jedlo na zimu čaká na doklady do 12. 10. 2026.", !nova, "Nahrať doklady"],
    ["Výplaty na účet", "Všetko je vyplatené.", false],
    ["Platený program", program, false],
  ];
  const blok = K.some((k) => k[2]);
  const ok = !blok && txt.trim().toUpperCase() === "ZRUŠIŤ";
  const zrus = () => { if (!ok) return; if (!k2) { setK2(true); return; } setK2(false); setTxt(""); toast("Stránka je zrušená. 30 dní ju môžete obnoviť cez podporu."); };
  return (
    <div style={dvaStlpce(mobil, "1.2fr", "1fr")}>
      <div style={stlpec}>
        <div style={nad}>1. NAJPRV TREBA VYBAVIŤ</div>
        <div style={{ ...krt, padding: "0 16px" }}>
          {K.map(([t, s, ma, b], i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, minHeight: 66, padding: "8px 0", borderTop: btn(i) }}>
              <span style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", background: ma ? CERVENA : "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ma ? "M12 7v6M12 17h.01" : "M5 12l5 5 9-10"} /></svg></span>
              <span style={{ flex: "1 1 200px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
              {ma && b && <button onClick={() => otvor("g_zbierky")} style={{ flex: "none", height: 44, padding: "0 14px", border: "none", borderRadius: 12, background: "var(--green)", cursor: "pointer", fontSize: 13.5, fontWeight: 800, color: "#fff", marginLeft: "auto" }}>{b}</button>}
            </div>))}
        </div>
        <div style={{ ...nad, marginTop: 10 }}>2. ČO SA STANE</div>
        <Zoznam bodka polozky={["Verejný profil a všetky zbierky zmiznú z appky hneď.", "Pravidelná podpora sa zastaví. Darcom pošleme správu a už im nič nestrhneme.", "Správcovia stratia prístup a odhlásia sa zo všetkých zariadení.", "30 dní môžete stránku obnoviť cez podporu. Potom ju zmažeme natrvalo.", "Účtovné údaje o daroch a výplatách musíme podľa zákona uchovať. Nikto ich neuvidí."]} />
      </div>
      <div style={stlpec}>
        <div style={nad}>3. POTVRDENIE</div>
        <div style={{ ...krt, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={() => otvor("n:stiahnut")} style={{ ...obrys(), height: 46, fontSize: 14.5 }}>Najprv stiahnuť údaje charity</button>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Prečo odchádzate? <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· nepovinné, pomôže nám</span></span>
            <textarea value={dov} onChange={(e) => setDov(e.target.value)} rows={3} style={{ ...pole, height: "auto", padding: "12px 14px", lineHeight: 1.5, resize: "vertical" }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Na potvrdenie napíšte ZRUŠIŤ</span>
            <input value={txt} onChange={(e) => { setTxt(e.target.value); setK2(false); }} autoComplete="off" style={{ ...pole, fontSize: 16, fontWeight: 800, letterSpacing: ".06em", borderColor: txt.trim().toUpperCase() === "ZRUŠIŤ" ? "var(--green)" : "var(--cardBd)" }} /></label>
          <button onClick={zrus} aria-disabled={!ok} style={{ height: 52, border: "none", borderRadius: 14, background: ok ? CERVENA : SIVA, cursor: ok ? "pointer" : "default", fontSize: 15.5, fontWeight: 800, color: "#fff" }}>{k2 && ok ? "Naozaj zrušiť stránku" : "Zrušiť stránku charity"}</button>
          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: blok ? CERVENA : "var(--ink3)" }}>{blok ? "Najprv vybavte body vľavo. Potom môžete stránku zrušiť." : k2 && ok ? "Ťuknite ešte raz na potvrdenie." : "Zrušiť môže len hlavný správca."}</span>
        </div>
      </div>
    </div>);
}
