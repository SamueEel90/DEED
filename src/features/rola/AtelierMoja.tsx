// ============================================================
// OPRAVY 471 · Ateliér na jednej obrazovke (prototyp „Atelier stranky v2“ → 3a). Nahrádza krok Vzory (467) a dolnú lištu (468).
// Hlavička: ‹ Odísť z ateliéru · Ateliér stránky · Ukázať: Moja stránka · Vzorová · veta o zmenách · jedno Zverejniť › (okno 469).
// Lišta pod hlavičkou: Vzhľad (4 tlačidlá s nákresom; naostro väčšie, červený rám) · Poradie blokov ⌄ · Pozrieť na: Počítač · Tablet · Mobil.
// Pás: Moja stránka = zlatý (skúšobný režim) · Vzorová = modrý (Farnosť vzorová, vzorFarnosti.ts).
// Poradie blokov = zoznam z Usporiadať stránku (ZoznamBlokov) 1 : 1, panel vľavo 400 px, bez Podržte a uložte (ukladá sa do konceptu).
// Koncept ide na server; „Uložené ✓“ až po potvrdení, pri chybe hláška + Skúsiť znova.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ROZLOZENIA, type Rozlozenie } from "@/lib/rozlozenieFarnosti";
import { POVODNE, normalizuj, type Usporiadanie } from "@/lib/usporiadanieStranky";
import { kedy2, nazovVzhladu, ulozKonceptIsto, zmenyKonceptu, type KonceptAtelieru } from "@/lib/atelier";
import { NastenkaFarnosti } from "@/features/verejny-profil/NastenkaFarnosti";
import { LayoutContext, useMotiv } from "@/components/context";
import type { ProfilStranky } from "@/lib/profilStranky";
import { cistyText } from "@/lib/richtext";
import { ZoznamBlokov } from "./UsporiadatStranku";
import { AtelierZverejnit } from "./AtelierZverejnit";
import { VZOR_ID, VZOR_MENO, VZOR_PROFIL } from "./vzorFarnosti";

type Zariadenie = "pc" | "tablet" | "mobil";
const ZARIADENIA: [Zariadenie, string, number | null, { wide: boolean; desktop: boolean }][] = [
  ["pc", "Počítač", null, { wide: true, desktop: true }], ["tablet", "Tablet", 820, { wide: true, desktop: false }], ["mobil", "Mobil", 390, { wide: false, desktop: false }],
];
/** farba vzhľadu v nákrese (prototyp 3a) */
const SW: Record<Rozlozenie, string> = { nastenka: "#8A6A1E", kronika: "#2F5E3A", moderne: "#3B6A8E", konzervativny: "#6B5626" };
type Ulozenie = "" | "uklada" | "ok" | "chyba";

/** stránka má obsah (fotka, logo alebo text o farnosti) — veta v modrom páse Vzorovej */
const vyplnena = (p: ProfilStranky | null) => !!p && (!!p.cover?.src || !!p.logo || cistyText(p.onas ?? "").trim().length > 0);

export function AtelierObrazovka({ strankaId, meno, profil, koncept, naostro, uspNaostro, onZavri }: { strankaId: string; meno: string; profil: ProfilStranky | null;
  koncept: KonceptAtelieru | null; naostro: Rozlozenie; uspNaostro: Usporiadanie; onZavri: () => void }) {
  const svetly = useMotiv().svetly;
  const [vz, setVz] = useState<Rozlozenie>(koncept?.rozlozenie ?? naostro);
  const [u, setU] = useState<Usporiadanie>(() => normalizuj(koncept?.usporiadanie ?? uspNaostro));
  const [mod, setMod] = useState<"moja" | "vzor">("moja"); // Martin 22. 10.: vždy Moja stránka, kým server nepozná stav „zverejnená“
  const [zar, setZar] = useState<Zariadenie>("pc");
  const [por, setPor] = useState(false);
  const [zver, setZver] = useState(false);
  const [ul, setUl] = useState<Ulozenie>("");
  const [chyba, setChyba] = useState("");
  const [nap, setNap] = useState(false); // nápoveda pri sivom Zverejniť
  useEffect(() => { if (!nap) return; const t = window.setTimeout(() => setNap(false), 4000); return () => window.clearTimeout(t); }, [nap]);

  // ---- koncept na server: chvíľu po poslednej zmene; „Uložené ✓“ až po potvrdení ----
  const posl = useRef(koncept ? JSON.stringify({ r: koncept.rozlozenie, u: normalizuj(koncept.usporiadanie) }) : "");
  const naplanovane = koncept?.naplanovane;
  const uloz = async (r: Rozlozenie, us: Usporiadanie): Promise<boolean> => {
    setUl("uklada"); setChyba("");
    const e = await ulozKonceptIsto({ rozlozenie: r, usporiadanie: us, naplanovane });
    if (e) { setUl("chyba"); setChyba(e); return false; }
    posl.current = JSON.stringify({ r, u: us }); setUl("ok"); return true;
  };
  useEffect(() => {
    const j = JSON.stringify({ r: vz, u });
    if (j === posl.current || (!posl.current && vz === naostro && JSON.stringify(u) === JSON.stringify(normalizuj(uspNaostro)))) return;
    const t = window.setTimeout(() => { void uloz(vz, u); }, 500);
    return () => window.clearTimeout(t);
  }, [vz, u]); // eslint-disable-line react-hooks/exhaustive-deps

  const aktualny: KonceptAtelieru = { rozlozenie: vz, usporiadanie: u, zmenene: koncept?.zmenene ?? "", naplanovane };
  const zmeny = zmenyKonceptu(aktualny, naostro, uspNaostro);
  const zVeta = zmeny.length ? (zmeny.length === 1 ? "1 zmena čaká" : `${zmeny.length} ${zmeny.length < 5 ? "zmeny čakajú" : "zmien čaká"}`) : "Zatiaľ bez zmien";
  const otvorZverejnit = async () => {
    if (!zmeny.length) { setNap(true); return; }
    if (ul === "uklada") return;
    if (JSON.stringify({ r: vz, u }) !== posl.current && !(await uloz(vz, u))) return; // najprv musí byť uložené
    setZver(true);
  };

  // ---- farby (svetlý aj tmavý režim) ----
  const P = svetly
    ? { naBd: "#C8553D", naBg: "#FBE9E4", naSt: "#A3402B", zlBg: "#F6ECD2", zlT: "#5E4510", zlS: "#6E5622", moBg: "#E6EEF7", moT: "#1F3550", moS: "#33506F" }
    : { naBd: "#C8553D", naBg: "#2A1814", naSt: "#F0A08E", zlBg: "#2B2412", zlT: "#F3DFA8", zlS: "#E1CC93", moBg: "#1B2430", moT: "#DCE7F5", moS: "#B7C8DE" };
  const vzor = mod === "vzor", nazovVz = nazovVzhladu(vz), nazovNaostro = nazovVzhladu(naostro);
  const pasT = vzor ? `Vzor · takto môže vyzerať stránka vo vzhľade ${nazovVz}` : `Skúšobný režim · toto je vaša stránka vo vzhľade ${nazovVz}`;
  const pasS = vzor
    ? (vyplnena(profil) ? "Vyplnená ukážka Farnosti vzorovej. Vaše skúšanie platí pre Moju stránku." : "Vyplnená ukážka Farnosti vzorovej. Keď doplníte svoje fotky a texty, prepnite na Moja stránka.")
    : `S vašimi fotkami a textami. Ľudia zatiaľ vidia ${nazovNaostro}. Toto vidíte len vy.`;

  const tl: CSSProperties = { flex: "none", whiteSpace: "nowrap", minHeight: 46, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };
  const vol = (on: boolean): CSSProperties => ({ flex: "none", whiteSpace: "nowrap", minHeight: 50, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "transparent", color: on ? "var(--gInk)" : "var(--ink)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" });
  const lbl: CSSProperties = { fontSize: 15, color: "var(--ink2)", whiteSpace: "nowrap" };
  const [, , sirka, layout] = ZARIADENIA.find((z) => z[0] === zar)!;
  const atelier = { rozlozenie: vz, usporiadanie: u };

  return (<>
    <header style={{ flex: "none", minHeight: 72, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "10px 24px", borderBottom: "1px solid var(--cardBd)", boxSizing: "border-box" }}>
      <button type="button" onClick={onZavri} style={tl}>‹ Odísť z ateliéru</button>
      <b style={{ fontSize: 20, whiteSpace: "nowrap" }}>Ateliér stránky</b>
      <span aria-hidden="true" style={{ flex: "none", width: 1, height: 38, background: "var(--cardBd)" }} />
      <b style={lbl}>Ukázať:</b>
      <div role="radiogroup" aria-label="Ukázať" style={{ flex: "none", display: "flex", padding: 3, borderRadius: 14, background: "var(--seg)", border: "1px solid var(--cardBd)" }}>
        {([["moja", "Moja stránka"], ["vzor", "Vzorová"]] as const).map(([k, n]) => { const on = mod === k; return (
          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setMod(k)} style={{ whiteSpace: "nowrap", minHeight: 44, padding: "0 16px", borderRadius: 11, border: "none", background: on ? "#355A2B" : "transparent", color: on ? "#fff" : "var(--ink2)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{n}</button>); })}
      </div>
      <span style={{ flex: 1 }} />
      <span role="status" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 14.5, color: "var(--ink2)", whiteSpace: "nowrap" }}>
        <span>{zVeta}{naplanovane && zmeny.length ? ` · zverejní sa ${kedy2(naplanovane)}` : ""}</span>
        {ul === "uklada" && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Ukladá sa…</span>}
        {nap && !zmeny.length && <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gold)" }}>Najprv niečo zmeňte: vzhľad alebo poradie blokov.</span>}
        {ul === "ok" && <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gInk)" }}>Uložené ✓ · nikto to nevidí</span>}
      </span>
      <button type="button" onClick={() => { void otvorZverejnit(); }} aria-disabled={!zmeny.length}
        style={{ flex: "none", whiteSpace: "nowrap", minHeight: 50, padding: "0 22px", borderRadius: 14, border: `1.5px solid ${zmeny.length ? "#4A743B" : "var(--cardBd)"}`, background: zmeny.length ? "#355A2B" : "transparent", color: zmeny.length ? "#fff" : "var(--ink3)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: zmeny.length ? "pointer" : "default" }}
        >Zverejniť ›</button>
    </header>
    {ul === "chyba" && <div role="alert" style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", background: "var(--goldBg)", borderBottom: "1.5px solid #C9A24A" }}>
      <img src="/svetlusik.png" alt="" width={34} height={34} style={{ flex: "none" }} />
      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{chyba}</span>
      <button type="button" onClick={() => { void uloz(vz, u); }} style={{ ...tl, minHeight: 42, background: "var(--card)" }}>Skúsiť znova</button>
    </div>}

    <div style={{ flex: "none", minHeight: 72, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 24px", borderBottom: "1px solid var(--cardBd)", boxSizing: "border-box" }}>
      <b style={lbl}>Vzhľad:</b>
      {ROZLOZENIA.map((r) => {
        const live = r.k === naostro, on = r.k === vz, w = live ? 58 : 46, h = live ? 44 : 34;
        const bd = live ? P.naBd : on ? "var(--green)" : "var(--cardBd)", bg = live ? P.naBg : on ? "var(--gSoft)" : "var(--card)", st = live ? P.naSt : on ? "var(--gInk)" : "var(--ink3)";
        return (
          <button key={r.k} type="button" aria-pressed={on} onClick={() => setVz(r.k)} aria-label={`${r.t} · ${live ? "teraz na stránke" : on ? "skúšate" : "vyskúšať"}`}
            style={{ flex: "none", whiteSpace: "nowrap", minHeight: live ? 62 : 50, padding: "0 14px 0 8px", borderRadius: 12, border: `2px solid ${bd}`, background: bg, color: "var(--ink)", fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, boxShadow: live && on ? `0 0 0 2px var(--green)` : "none" }}>
            <Nakres k={r.k} w={w} h={h} />
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2 }}>
              <span style={{ fontSize: live ? 16.5 : 15, fontWeight: 800 }}>{r.t}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: st }}>{live ? "teraz" : on ? "skúšate" : "vyskúšať"}</span>
              {live && <span style={{ fontSize: 12, fontWeight: 700, color: st }}>na stránke</span>}
            </span>
          </button>);
      })}
      <span aria-hidden="true" style={{ flex: "none", width: 1, height: 38, background: "var(--cardBd)", margin: "0 4px" }} />
      <button type="button" aria-expanded={por} onClick={() => setPor(!por)} style={vol(por)}>Poradie blokov {por ? "⌃" : "⌄"}</button>
      <span style={{ flex: 1 }} />
      <b style={lbl}>Pozrieť na:</b>
      <span role="radiogroup" aria-label="Pozrieť na" style={{ display: "flex", gap: 8 }}>
        {ZARIADENIA.map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={zar === k} onClick={() => setZar(k)} style={vol(zar === k)}>{t}</button>)}
      </span>
    </div>

    <div role="status" style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", background: vzor ? P.moBg : P.zlBg, borderBottom: `1.5px solid ${vzor ? "#6E8FB8" : "#C9A24A"}` }}>
      <span aria-hidden="true" style={{ flex: "none", width: 10, height: 10, borderRadius: "50%", background: vzor ? "#6E8FB8" : "#C9A24A" }} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16, color: vzor ? P.moT : P.zlT }}>{pasT}</b><span style={{ fontSize: 14, color: vzor ? P.moS : P.zlS }}>{pasS}</span></span>
    </div>

    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      {por && <aside aria-label="Poradie blokov" style={{ flex: "none", width: 400, overflowY: "auto", borderRight: "1px solid var(--cardBd)", background: "var(--bg)", padding: "18px 16px 30px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <b style={{ flex: 1, fontSize: 19 }}>Poradie blokov</b>
          <button type="button" onClick={() => setPor(false)} style={{ ...tl, minHeight: 40, fontSize: 14, background: "var(--btn)" }}>Zavrieť</button>
        </span>
        <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink3)" }}>Šípkami zmeníte poradie, prepínačom blok skryjete. Platí pre všetky vzhľady. Stránka vedľa sa mení hneď, ľudia to uvidia až po Zverejniť.</span>
        <ZoznamBlokov u={u} zmen={setU} vz={vz} mobil={false} spodok={
          <button type="button" onClick={() => setU({ ...POVODNE, poradie: [...POVODNE.poradie] })} style={{ ...tl, alignSelf: "flex-start", marginTop: 4 }}>Obnoviť pôvodné</button>} />
      </aside>}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", background: sirka ? "var(--btn)" : "transparent", padding: sirka ? "24px 16px 40px" : 0 }}>
        <div style={sirka ? { width: sirka, maxWidth: "100%", margin: "0 auto", borderRadius: 24, overflow: "hidden", border: "8px solid #1D211B", boxShadow: "0 12px 40px rgba(0,0,0,.25)", background: "var(--bg)" } : undefined}>
          <LayoutContext.Provider value={layout}>
            {vzor
              ? <NastenkaFarnosti key="vzor" bezVidenych nahlad strankaId={VZOR_ID} meno={VZOR_MENO} profil={VZOR_PROFIL} stit="Silver" atelier={atelier} />
              : <NastenkaFarnosti key="moja" bezVidenych strankaId={strankaId} meno={meno} profil={profil} stit="Silver" atelier={atelier} />}
          </LayoutContext.Provider>
        </div>
      </div>
    </div>
    {zver && <AtelierZverejnit strankaId={strankaId} koncept={aktualny} naostro={naostro} uspNaostro={uspNaostro} onSpat={() => setZver(false)} onHotovo={onZavri} />}
  </>);
}

/** malý nákres obrazovky vzhľadu (prototyp 3a) */
function Nakres({ k, w, h }: { k: Rozlozenie; w: number; h: number }) {
  const sw = SW[k], f = "var(--cardBd)";
  const b = (st: CSSProperties) => <span style={{ borderRadius: 2, ...st }} />;
  return (
    <span aria-hidden="true" style={{ flex: "none", width: w, height: h, boxSizing: "border-box", borderRadius: 6, background: "var(--field)", border: "1px solid var(--cardBd)", padding: 4, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
      {k === "nastenka" && <>{b({ height: "28%", background: sw })}{b({ flex: 1, background: f })}{b({ flex: 1, background: f })}</>}
      {k === "kronika" && <span style={{ flex: 1, display: "flex", gap: 3 }}>{b({ width: "32%", background: sw })}<span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>{b({ flex: 1, background: f })}{b({ flex: 1, background: f })}</span></span>}
      {k === "moderne" && <>{b({ height: "45%", background: sw })}<span style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>{b({ background: f })}{b({ background: f })}{b({ background: f })}</span></>}
      {k === "konzervativny" && <span style={{ flex: 1, width: "60%", alignSelf: "center", display: "flex", flexDirection: "column", gap: 3, justifyContent: "center" }}>{b({ height: 4, width: "70%", background: sw })}{b({ height: 3, background: f })}{b({ height: 3, background: f })}</span>}
    </span>);
}
