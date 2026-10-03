// KARTA 43 · bod 133 — modul centrálna zbierka + 3 sektory, 1 : 1 podľa prototypu v4 Pirát (pravý panel).
// ZMENA (Martin 3. 10.): modul je zbalený — dlaždice bez platby, platba sa rozbalí až po ťuku na dlaždicu.
// „Poslať" otvorí skutočné platobné okno (PlatobneOkno), po platbe poďakovanie ako v prototype.
import { useState } from "react";
import { PlatobneOkno } from "@/features/zbierka/Platba";
import type { KanalPlatby } from "@/features/zbierka/Sumy";
import { pridajDar } from "@/lib/darcovia";
import { mestoTextu, type Lokalita, type Mesto, type TestProfil, type TestSektor } from "@/lib/testProfily";
import { vMeste } from "./casti";

const SUMY = [1, 5, 10, 25, 50];
const FARBY_ROZPISU = ["#4E7D37", "#C9A14A", "#3D6B8E"];
const eurK = (n: number) => `${n} €`;
const kratkeMeno = (m: string) => m.replace(/\s+(o\.\s?z\.|s\.\s?r\.\s?o\.|n\.\s?o\.)$/i, "");

export function ModulSektory({ profil, lok, domace, onZbierky }: { profil: TestProfil; lok: Lokalita; domace: Mesto; onZbierky?: () => void }) {
  const mesto = mestoTextu(lok, domace);
  const regOk = lok !== "Celé Slovensko";
  const kde = `v ${vMeste(mesto)}`;
  const dlazdice: (TestSektor & { centralna?: boolean })[] = [{ ...profil.centralna, centralna: true }, ...profil.sektory];
  const [sek, setSek] = useState<string | null>(null);
  const [amt, setAmt] = useState(10);
  const [lenReg, setLenReg] = useState(true);
  const [meno, setMeno] = useState(true);
  const [hotovo, setHotovo] = useState(false);
  const [platba, setPlatba] = useState<{ kanal: KanalPlatby; suma: number } | null>(null);
  const sk = dlazdice.find((d) => d.id === sek);
  const kdeT = regOk && lenReg ? ` ${kde}` : "";
  const komu = sk ? (sk.centralna ? "celú činnosť" : sk.nazov) : "";
  const firma = profil.dorovnaniePas?.nadpis.split(" zdvojnásobí")[0];
  const seg = (on: boolean) => ({ background: on ? "var(--bg)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", fontWeight: on ? 800 : 700 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>PODPORIŤ {(profil.podporit ?? kratkeMeno(profil.meno)).toLocaleUpperCase("sk-SK")}</span>
        <b style={{ fontSize: 23, lineHeight: 1.2 }}>Vyber, ako blízko chceš vidieť</b>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>
        <span>CELÁ ČINNOSŤ</span>
        <span style={{ flex: 1, height: 2, borderRadius: 1, background: "linear-gradient(90deg,var(--track),var(--green))" }} />
        <span>SEKTOR</span>
        <span style={{ flex: 1, height: 2, borderRadius: 1, background: "linear-gradient(90deg,var(--green),var(--gInk))" }} />
        <span style={{ color: "var(--gInk)" }}>KAŽDÝ DOKLAD</span>
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {dlazdice.map((k) => {
          const on = k.id === sek;
          return (
            <button key={k.id} type="button" aria-expanded={on} onClick={() => { setSek(on ? null : k.id); setHotovo(false); }}
              style={{ minHeight: 86, padding: 12, borderRadius: 16, border: on ? "2px solid var(--acc)" : "1px solid var(--cardBd)", background: on ? "var(--card)" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, textAlign: "left" }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{k.centralna ? "CENTRÁLNA ZBIERKA" : "SEKTOR"}</span>
              <b style={{ fontSize: 16, lineHeight: 1.2, color: "var(--ink)" }}>{k.nazov}</b>
              <span style={{ fontSize: 12.5, lineHeight: 1.35, color: "var(--gInk)" }}>{k.mesta[mesto].dlazdica}</span>
            </button>
          );
        })}
      </div>

      {sk && !hotovo && <>
        <div style={{ borderRadius: 22, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column" }}>
          <span style={{ position: "relative", height: 150, background: `url('${sk.foto}') center/cover no-repeat #3a3530` }}>
            <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,0) 30%,rgba(10,8,5,.82))" }} />
            <span style={{ position: "absolute", left: 16, right: 16, bottom: 14, display: "flex", flexDirection: "column", gap: 2, color: "#fff" }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "#E6DFD2" }}>{sk.centralna ? "CENTRÁLNA ZBIERKA" : "SEKTOR"}</span>
              <b style={{ fontSize: 22, lineHeight: 1.2 }}>{sk.nazov}</b>
            </span>
          </span>
          <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)" }}>{sk.mesta[mesto].minulyMesiac}</span>
            {sk.mesta[mesto].rozpis.length > 1 && <>
              <span style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", gap: 2 }}>
                {sk.mesta[mesto].rozpis.map(([n, p], i) => <span key={n} style={{ flex: p, background: FARBY_ROZPISU[i % 3] }} />)}
              </span>
              <span style={{ display: "flex", gap: 14, fontSize: 12.5, color: "var(--ink2)", flexWrap: "wrap" }}>
                {sk.mesta[mesto].rozpis.map(([n, p]) => <span key={n}>{p} % {n}</span>)}
              </span>
            </>}
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
              {sk.mesta[mesto].uvidis}
            </span>
          </div>
        </div>
        {firma && <span style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
          <span style={{ flex: "none", width: 34, height: 34, borderRadius: 10, background: "var(--field)", border: "1px solid var(--goldBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "var(--gold)" }}>{profil.dorovnaniePas!.ini}</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.4 }}><b>{firma}</b> zdvojnásobí dary{regOk ? ` ${kde}` : ""} · z {eurK(amt)} bude {eurK(amt * 2)}</span>
        </span>}
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", paddingTop: 2 }}>KOĽKO</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6 }}>
          {SUMY.map((a) => {
            const on = a === amt;
            return (
              <button key={a} type="button" aria-pressed={on} onClick={() => setAmt(a)}
                style={{ height: 56, borderRadius: 14, border: on ? "2px solid var(--acc)" : "1px solid var(--cardBd)", background: on ? "var(--card)" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                <b style={{ fontSize: 17, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eurK(a)}</b>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink3)" }}>{a === 1 ? "cez DEED" : a === 10 ? "najčastejšie" : ""}</span>
              </button>
            );
          })}
        </div>
        {regOk && <>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", paddingTop: 2 }}>KDE</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 4, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
            {([[`Len ${kde}`, true], ["Kde treba najviac", false]] as [string, boolean][]).map(([t, v]) => (
              <button key={t} type="button" aria-pressed={lenReg === v} onClick={() => setLenReg(v)} style={{ height: 44, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13.5, whiteSpace: "nowrap", ...seg(lenReg === v) }}>{t}</button>
            ))}
          </div>
        </>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 4, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
          {([["S menom", true], ["Anonymne", false]] as [string, boolean][]).map(([t, v]) => (
            <button key={t} type="button" aria-pressed={meno === v} onClick={() => setMeno(v)} style={{ height: 44, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13.5, whiteSpace: "nowrap", ...seg(meno === v) }}>{t}</button>
          ))}
        </div>
        <button type="button" onClick={() => setPlatba({ kanal: amt === 1 ? "deed" : "eur", suma: amt })}
          style={{ minHeight: 60, padding: "8px 18px", border: "none", borderRadius: 18, background: "linear-gradient(135deg,#4B7A35,#6E9F4E)", cursor: "pointer", fontSize: 17, fontWeight: 800, color: "#fff", boxShadow: "0 10px 24px rgba(40,80,30,.3)" }}>
          Poslať {eurK(amt)} · {sk.centralna ? "celá činnosť" : sk.nazov}{kdeT}
        </button>
        <span style={{ textAlign: "center", fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)" }}>
          {amt === 1 ? "1 € posielame cez DEED, karta je od 3 €." : "Karta, Apple Pay alebo DEED."}{meno ? " V zozname darcov budeš s menom." : " V zozname budeš ako Anonymný darca."}
        </span>
      </>}

      {sk && hotovo && <div style={{ borderRadius: 22, background: "var(--gSoft)", border: "1.5px solid var(--gBd)", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ width: 48, height: 48, borderRadius: 24, background: "#4B7A35", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <b style={{ fontSize: 22, lineHeight: 1.25, color: "var(--ink)" }}>Ďakujeme. Tvojich {eurK(amt)}{firma ? ` (s ${firma === "Pekáreň Dobrota" ? "Pekárňou" : firma} ${eurK(amt * 2)})` : ""} ide na {komu}{kdeT}.</b>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Keď ich {profil.typ === "charita" ? "charita" : profil.typ === "firma" ? "firma" : "tvorca"} minie, pošleme ti, na čo presne išli, aj s dokladom.</span>
        <button type="button" onClick={() => setHotovo(false)} style={{ alignSelf: "flex-start", height: 44, padding: "0 18px", borderRadius: 13, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>Hotovo</button>
      </div>}

      {onZbierky && <button type="button" onClick={onZbierky} style={{ padding: "12px 14px", minHeight: 44, borderRadius: 14, border: "1px dashed var(--cardBd)", background: "transparent", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}>
        <b style={{ fontSize: 14, color: "var(--ink)" }}>Chceš vidieť každý doklad?</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>Vyber konkrétnu zbierku{regOk ? ` ${kde}` : ""} ›</span>
      </button>}

      {platba && sk && (
        <PlatobneOkno kanal={platba.kanal} suma={platba.suma} nazov={`${sk.nazov}${kdeT}`} registrovany
          pred={{ vyzbierane: sk.vyzbierane, ciel: null, pocetDarov: sk.darcovia, darovDnes: 0 }}
          onClose={() => setPlatba(null)}
          onHotovo={(v) => { pridajDar({ refId: sk.id, suma: v.eur, kanal: v.kanal === "eur" ? "psp" : "deed", registrovany: true, volba: v.volba }); setHotovo(true); }} />
      )}
    </div>
  );
}
