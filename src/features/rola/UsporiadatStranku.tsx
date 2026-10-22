// ============================================================
// OPRAVY 292 · Správa → Nástroje → Usporiadať stránku (nie v Nastaveniach, aby si farár omylom nič nepokazil).
// Prototyp „Usporiadat stranku“: zoznam blokov stredného stĺpca s ↑ ↓ (44 px) a Ukázať / Skryť, na mobile aj
// podržať a potiahnuť (úchyt ⠿); živý náhľad (hlavný stĺpec + bočný panel). Jedno poradie pre všetky štyri vzhľady.
// OPRAVY 323: bez prepínača vzhľadu — náhľad ukazuje vzhľad, ktorý má farnosť zapnutý; pri bloku „Vedľa predošlého · Áno / Nie“
// (len Moderné a Klasika na PC; Teš sa a Spomíname túto voľbu nemajú). Pevné: titulka a hlavička, bočný panel, päta, zelené +.
// Zbierky: Nástenka a Moderné presúvateľné, Kronika a Klasika v bočnom paneli. Premenovať 7 blokov (najviac 30 znakov).
// „Podržte a uložte“ + „Obnoviť pôvodné“, hláška na mieste, zlyhanie má tvár. Ukladá sa na server (verejné nastavenia).
// ============================================================
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChybaPriTlacidle } from "@/components/ChybaPriTlacidle";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { BLOKY_STRANKY, PREMENOVAT, NAZOV_MAX, POVODNE, normalizuj, ulozUsporiadanie, useUsporiadanie, nadpisBloku, mozeVedla, radyVedla, type BlokStranky, type Usporiadanie } from "@/lib/usporiadanieStranky";
import { ROZLOZENIA, rozlozenieZPamate, type Rozlozenie } from "@/lib/rozlozenieFarnosti";
import { konceptAtelieru, ulozKonceptAtelieru } from "@/lib/atelier";

const M = Object.fromEntries(BLOKY_STRANKY.map((b) => [b.id, b])) as Record<BlokStranky, (typeof BLOKY_STRANKY)[number]>;
const rovnake = (a: Usporiadanie, b: Usporiadanie) => JSON.stringify(normalizuj(a)) === JSON.stringify(normalizuj(b));

/** OPRAVY 471: zoznam blokov — Usporiadať stránku aj Ateliér (Poradie blokov) s tými istými pravidlami podľa vzhľadu.
 *  Kronika a Klasika: Zbierky v bočnom paneli (PEVNÉ). Vedľa predošlého len kde smie. spodok = tlačidlá volajúceho. */
export function ZoznamBlokov({ u, zmen, vz, mobil, spodok }: { u: Usporiadanie; zmen: (n: Usporiadanie) => void; vz: Rozlozenie; mobil: boolean; spodok?: ReactNode }) {
  const [ed, setEd] = useState<BlokStranky | null>(null);
  const bok = vz === "kronika" || vz === "konzervativny";
  const L = u.poradie.filter((k) => !(bok && k === "zbierky")), n = L.length;
  const panel = bok ? ["Zbierky farnosti", "Omše a kalendár", "Farský úrad"] : ["Omše a kalendár", "Farský úrad"];
  const presun = (i: number, j: number) => {
    if (j < 0 || j >= n || i === j) return;
    const a = L[i], b = L[j], o = u.poradie.slice(), ia = o.indexOf(a), ib = o.indexOf(b);
    o.splice(ia, 1); o.splice(ib, 0, a); // pri susedoch = výmena; pri ťahu = vloženie na miesto
    zmen({ ...u, poradie: o });
  };
  const vedla = (k: BlokStranky, on: boolean) => zmen({ ...u, vedla: on ? [...u.vedla.filter((x) => x !== k), k] : u.vedla.filter((x) => x !== k) });
  const prepni = (k: BlokStranky) => zmen({ ...u, skryte: u.skryte.includes(k) ? u.skryte.filter((x) => x !== k) : [...u.skryte, k] });
  const premenuj = (k: BlokStranky, t: string) => { const z = { ...u.nazvy }; if (t) z[k] = t.slice(0, NAZOV_MAX); else delete z[k]; zmen({ ...u, nazvy: z }); };
  const zoznam = useRef<HTMLDivElement>(null);
  const [tah, setTah] = useState<BlokStranky | null>(null);
  const tahZ = (k: BlokStranky) => (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setTah(k); };
  const tahM = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!tah || !zoznam.current) return;
    const riadky = [...zoznam.current.querySelectorAll<HTMLElement>("[data-usp]")];
    const i = L.indexOf(tah);
    let j = riadky.findIndex((r) => { const b = r.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
    if (j < 0) j = riadky.length - 1; else if (j > i) j -= 1;
    if (j !== i) presun(i, j);
  };
  const tahK = () => setTah(null);
  const sivy: CSSProperties = { display: "flex", alignItems: "center", gap: 12, minHeight: 50, padding: "8px 14px", boxSizing: "border-box", borderRadius: 12, background: "var(--btn)", color: "var(--ink3)" };
  const stitok: CSSProperties = { width: mobil ? 64 : 84, flex: "none", fontSize: 12, fontWeight: 800, letterSpacing: ".04em" };
  const sipka = (on: boolean): CSSProperties => ({ flex: "none", width: 44, height: 44, borderRadius: 11, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)", fontSize: 18, cursor: on ? "pointer" : "default", opacity: on ? 1 : 0.35, fontFamily: "inherit", boxShadow: "none" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div style={sivy}><span style={stitok}>VŽDY PRVÁ</span><b style={{ fontSize: 15 }}>Titulka a hlavička</b></div>
      <div style={sivy}><span style={stitok}>PEVNÉ</span><span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><b style={{ fontSize: 15 }}>Bočný panel · {panel.join(" · ")}</b><span style={{ fontSize: 12.5 }}>Na PC pravý stĺpec, na mobile v hlavičke.</span></span></div>
      <div ref={zoznam} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {L.map((k, i) => {
          const on = !u.skryte.includes(k), moze = !!PREMENOVAT[k], nm = nadpisBloku(u, k, M[k].t), otv = ed === k;
          return (
            <div key={k} data-usp={k} style={{ display: "flex", flexDirection: "column", borderRadius: 12, background: on ? "var(--card)" : "var(--btn)", border: tah === k ? "2px solid var(--green)" : "1px solid var(--cardBd)", boxShadow: tah === k ? "0 8px 20px rgba(0,0,0,.18)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: mobil ? 6 : 10, minHeight: 56, padding: mobil ? "6px 8px 6px 4px" : "6px 10px 6px 14px" }}>
                {mobil
                  ? <button type="button" aria-label={`Podržať a potiahnuť: ${nm}`} onPointerDown={tahZ(k)} onPointerMove={tahM} onPointerUp={tahK} onPointerCancel={tahK}
                      style={{ flex: "none", width: 36, height: 44, border: "none", background: "transparent", color: "var(--ink3)", fontSize: 20, cursor: "grab", touchAction: "none", padding: 0, boxShadow: "none" }}>⠿</button>
                  : <span style={{ width: 24, flex: "none", fontSize: 13, fontWeight: 800, color: "var(--ink3)" }}>{i + 1}</span>}
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1, opacity: on ? 1 : 0.55 }}>
                  <b style={{ fontSize: 15.5, overflowWrap: "anywhere" }}>{nm}</b>
                  {moze && <button type="button" onClick={() => setEd(otv ? null : k)} aria-expanded={otv} style={{ alignSelf: "flex-start", minHeight: 28, padding: 0, border: "none", background: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--green)", cursor: "pointer", boxShadow: "none" }}>
                    {otv ? "Zavrieť" : u.nazvy[k] ? "Premenované · zmeniť ›" : "Premenovať ›"}</button>}
                  {!on && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>skryté na stránke</span>}
                </span>
                <button type="button" onClick={() => presun(i, i - 1)} aria-label={`Posunúť hore: ${nm}`} disabled={i === 0} style={sipka(i > 0)}>↑</button>
                <button type="button" onClick={() => presun(i, i + 1)} aria-label={`Posunúť dole: ${nm}`} disabled={i === n - 1} style={sipka(i < n - 1)}>↓</button>
                <button type="button" role="switch" aria-checked={on} aria-label={`${on ? "Ukázané" : "Skryté"}: ${nm}`} onClick={() => prepni(k)} style={{ position: "relative", flex: "none", width: 52, height: 30, borderRadius: 15, border: "none", background: on ? "#4B7A35" : "#CFC8BA", cursor: "pointer", padding: 0, boxShadow: "none" }}>
                  <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transform: `translateX(${on ? 22 : 0}px)`, transition: "transform .2s" }} />
                </button>
              </div>
              {/* OPRAVY 323: Vedľa predošlého · Áno / Nie (Moderné a Klasika na PC) */}
              {i > 0 && mozeVedla(k) && mozeVedla(L[i - 1]) && <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: mobil ? "0 12px 10px" : "0 14px 10px 48px", opacity: on ? 1 : 0.55 }}>
                <span style={{ flex: "1 1 160px", minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14 }}>Vedľa predošlého</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>vedľa bloku {nadpisBloku(u, L[i - 1], M[L[i - 1]].t)} · Moderné a Klasika na PC</span></span>
                <span role="radiogroup" aria-label={`Vedľa predošlého: ${nm}`} style={{ display: "flex", flex: "none", border: "1.5px solid var(--cardBd)", borderRadius: 12, overflow: "hidden" }}>
                  {([["Áno", true], ["Nie", false]] as [string, boolean][]).map(([t, v]) => { const a = u.vedla.includes(k) === v; return (
                    <button key={t} type="button" role="radio" aria-checked={a} onClick={() => vedla(k, v)} style={{ minHeight: 40, minWidth: 56, padding: "0 12px", border: "none", background: a ? "#4B7A35" : "transparent", color: a ? "#fff" : "var(--ink)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>{t}</button>); })}
                </span>
              </div>}
              {otv && moze && <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: mobil ? "4px 12px 14px" : "4px 14px 14px 48px" }}>
                <input value={u.nazvy[k] ?? M[k].t} onChange={(e) => premenuj(k, e.target.value)} maxLength={NAZOV_MAX} aria-label="Nový názov bloku"
                  style={{ minHeight: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--green)", background: "var(--field)", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                <span style={{ padding: "10px 12px", borderRadius: 10, background: "var(--field)", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>Zmení sa len nadpis na stránke. Sem stále pôjde to isté: <b>{PREMENOVAT[k]}</b>. Pôvodný názov: {M[k].t}.</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => { if (!(u.nazvy[k] ?? "").trim()) premenuj(k, ""); setEd(null); }} style={{ minHeight: 44, padding: "0 18px", borderRadius: 12, border: "none", background: "#4B7A35", color: "#fff", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Hotovo</button>
                  <button type="button" onClick={() => { premenuj(k, ""); setEd(null); }} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Pôvodný názov</button>
                </div>
              </div>}
            </div>);
        })}
      </div>
      <div style={sivy}><span style={stitok}>VŽDY POSLEDNÁ</span><b style={{ fontSize: 15 }}>Päta · kalendár, kancelária, úradné hodiny</b></div>
      {spodok}
      </div>);
}

export function UsporiadatStranku({ strankaId, mobil, onSpat }: { strankaId: string; mobil: boolean; onSpat: () => void }) {
  const ulozene = useUsporiadanie(strankaId);
  const [u, setU] = useState<Usporiadanie>(ulozene);
  const vz = rozlozenieZPamate(strankaId); // OPRAVY 323: náhľad = zapnutý vzhľad farnosti
  const [hlaska, setHlaska] = useState<{ ok: boolean; t: string } | null>(null);
  const [uklada, setUklada] = useState(false);
  const zmen = (n: Usporiadanie) => { setHlaska(null); setU(n); };
  const zapnuty = ROZLOZENIA.find((r) => r.k === rozlozenieZPamate(strankaId))?.t ?? "Nástenka";
  const bok = vz === "kronika" || vz === "konzervativny";
  const L = u.poradie.filter((k) => !(bok && k === "zbierky"));
  const panel = bok ? ["Zbierky farnosti", "Omše a kalendár", "Farský úrad"] : ["Omše a kalendár", "Farský úrad"];
  const parVz = vz === "moderne" || vz === "konzervativny"; // dvojice vedľa seba len v Modernom a Klasike
  const zmenene = !rovnake(u, ulozene);

  const ulozit = async () => {
    if (uklada) return;
    setUklada(true); setHlaska(null);
    const e = await ulozUsporiadanie(strankaId, u);
    // OPRAVY 468: rozpracovaný koncept v ateliéri dostane to isté poradie
    const k = konceptAtelieru(); if (!e && k) ulozKonceptAtelieru({ rozlozenie: k.rozlozenie, usporiadanie: u, naplanovane: k.naplanovane });
    setUklada(false);
    setHlaska(e ? { ok: false, t: e } : { ok: true, t: "Uložené ✓ Stránka farnosti má nové poradie vo všetkých vzhľadoch." });
  };

  const zoznamEl = <ZoznamBlokov u={u} zmen={zmen} vz={vz} mobil={mobil} spodok={<>
      {zmenene && !hlaska && <span style={{ fontSize: 13.5, fontWeight: 700, color: "#8A6A1C" }}>Zmeny ešte nie sú uložené.</span>}
      {hlaska?.ok && <div role="status" style={{ padding: "12px 14px", borderRadius: 14, fontSize: 14.5, fontWeight: 800, lineHeight: 1.45, background: "var(--gSoft)", border: "1.5px solid var(--gBd)", color: "var(--gInk)" }}>{hlaska.t}</div>}
      {/* OPRAVY 335: chyba priamo nad tlačidlom (na mobile aj okno) */}
      <ChybaPriTlacidle text={hlaska && !hlaska.ok ? hlaska.t : null} uklada={uklada} onZnova={() => void ulozit()} />
      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: mobil ? "wrap" : "nowrap" }}>
        <div style={{ flex: "1 1 220px", ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={uklada ? "Ukladá sa…" : "Podržte a uložte"} trvanie={1200} disabled={uklada} onConfirm={() => { void ulozit(); }} /></div>
        <button type="button" onClick={() => { zmen({ ...POVODNE, poradie: [...POVODNE.poradie] }); }} style={{ flex: mobil ? "1 1 100%" : "none", minHeight: 54, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Obnoviť pôvodné</button>
      </div>
  </>} />;

  const nahlad = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, position: mobil ? "static" : "sticky", top: 20, minWidth: 0 }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>ŽIVÝ NÁHĽAD · TAKTO TO UVIDIA ĽUDIA</span>
      <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? 12 : 16, display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1fr) 190px", gap: 8 }}>
        <div style={{ gridColumn: "1 / -1", height: 64, borderRadius: 12, background: "linear-gradient(160deg,#A9A290,#5F584A)", display: "flex", alignItems: "flex-end", padding: "8px 12px", boxSizing: "border-box", color: "#fff", fontSize: 13, fontWeight: 800 }}>Titulka</div>
        {mobil && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{panel.map((p) => <span key={p} style={{ padding: "6px 10px", borderRadius: 10, background: "var(--btn)", color: "var(--ink2)", fontSize: 13, fontWeight: 700 }}>{p}</span>)}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          {(parVz && !mobil ? radyVedla(u, L.filter((k) => !u.skryte.includes(k))) : L.filter((k) => !u.skryte.includes(k)).map((k) => [k])).map((rad) => <div key={rad[0]} style={{ display: "grid", gridTemplateColumns: `repeat(${rad.length},minmax(0,1fr))`, gap: 8, minWidth: 0 }}>
            {rad.map((k0) => { const k = k0 as BlokStranky; return <div key={k} style={{ minHeight: 40, padding: "0 12px", borderRadius: 10, background: "var(--field)", display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700, minWidth: 0 }}>
              <span style={{ flex: "none", width: 6, height: 22, borderRadius: 3, background: M[k].farba }} /><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nadpisBloku(u, k, M[k].t)}</span></div>; })}</div>)}
        </div>
        {!mobil && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{panel.map((p) => <div key={p} style={{ minHeight: 40, padding: "8px 12px", boxSizing: "border-box", borderRadius: 10, background: "var(--btn)", color: "var(--ink2)", display: "flex", alignItems: "center", fontSize: 13.5, fontWeight: 700 }}>{p}</div>)}</div>}
        <div style={{ gridColumn: "1 / -1", minHeight: 40, padding: "0 12px", borderRadius: 10, background: "#14110B", color: "#fff", display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700 }}>Päta · Farský úrad</div>
      </div>
      <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Prázdny blok sa na stránke neukáže, aj keď je zapnutý. Upozornenia pre veriacich ostávajú pri bloku, nie pri poradí.</span>
    </div>);

  return (<>
    <button type="button" onClick={onSpat} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>‹ Nástroje</button>
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 24 }}>Usporiadať stránku</b><span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink3)" }}>{mobil ? "Šípkami alebo podržaním ⠿ a potiahnutím zmeníte poradie" : "Šípkami zmeníte poradie"}, prepínačom blok skryjete. Prázdny blok sa skryje sám. Platí pre všetky vzhľady.</span></div>
    {/* OPRAVY 323: bez prepínača vzhľadu — náhľad je zapnutý vzhľad farnosti */}
    <span style={{ padding: "10px 14px", borderRadius: 12, background: "var(--field)", fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>Poradie platí pre všetky vzhľady. Náhľad: <b style={{ color: "var(--ink)" }}>{zapnuty}</b>{bok ? " · Zbierky sú v bočnom paneli." : ""}</span>
    {mobil ? <>{zoznamEl}{nahlad}</>
      : <div style={{ display: "grid", gridTemplateColumns: "minmax(0,520px) minmax(0,1fr)", gap: 32, alignItems: "start" }}>{zoznamEl}{nahlad}</div>}
  </>);
}
