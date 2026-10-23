// ============================================================
// OPRAVY 510 (balík 46) · Ateliér stránky v charite — tok 1 : 1 z farnosti (Atelier.tsx, AtelierMoja.tsx), bez poradia blokov.
// Hlavička: ‹ Odísť z ateliéru · Ateliér stránky · Ukázať: Moja stránka · Charita vzorová · veta o zmenách · Zverejniť vzhľad ›.
// Lišta: Vzhľad (Kronika · Výklad · Moderné s nákresom; naostro väčšie, červený rám) · Pozrieť na: Počítač · Tablet · Mobil.
// Pás: Moja stránka = zlatý (skúšobný režim) · Charita vzorová = modrý (testProfily CHARITA_VZOR).
// Na mobile ateliér nie je (ako vo farnosti): odkaz na počítač alebo tablet + prihlásenie cez QR.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { VZHLADY, useVybranyVzhlad, VZHLAD_ZADARMO, type Vzhlad } from "@/lib/vzhladStranky";
import { useKonceptCharity, useSpatCharity, ulozKonceptCharityIsto, naplanujKonceptCharity, zmenyKonceptuCharity, zverejniCharitaHned, vratSpatCharity, nazovVzhladuCharity } from "@/lib/atelierCharity";
import { kedy2 } from "@/lib/atelier";
import { CHARITA_VZOR } from "@/lib/testProfily";
import { LayoutContext, useMotiv } from "@/components/context";
import { VerejnyProfilView } from "@/features/verejny-profil/VerejnyProfil";
import { AtelierMobil, useUzkaObrazovka } from "./Atelier";
import { AtelierZverejnit } from "./AtelierZverejnit";
import { POVODNE } from "@/lib/usporiadanieStranky";
import { useNeverejna } from "@/lib/zverejnenieStranky";

type Zariadenie = "pc" | "tablet" | "mobil";
const ZARIADENIA: [Zariadenie, string, number | null, { wide: boolean; desktop: boolean }][] = [
  ["pc", "Počítač", null, { wide: true, desktop: true }], ["tablet", "Tablet", 820, { wide: true, desktop: false }], ["mobil", "Mobil", 390, { wide: false, desktop: false }],
];
const SW: Record<Vzhlad, string> = { kronika: "#2F5E3A", vyklad: "#8A6A1E", pirat: "#3B6A8E" };
type Ulozenie = "" | "uklada" | "ok" | "chyba";

export function AtelierCharity({ strankaId, onZavri }: { strankaId: string; onZavri: () => void }) {
  const uzka = useUzkaObrazovka();
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  if (uzka) return createPortal(<AtelierMobil onZavri={onZavri} />, document.body);
  return createPortal(
    <div className="sprava-charity" role="dialog" aria-modal="true" aria-label="Ateliér stránky"
      style={{ position: "fixed", inset: 0, zIndex: 1150, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <ObrazovkaCharity strankaId={strankaId} onZavri={onZavri} />
    </div>, document.body);
}

function ObrazovkaCharity({ strankaId, onZavri }: { strankaId: string; onZavri: () => void }) {
  const svetly = useMotiv().svetly;
  const naostro = useVybranyVzhlad(strankaId) ?? VZHLAD_ZADARMO;
  const koncept = useKonceptCharity();
  const spat = useSpatCharity();
  const [vz, setVz] = useState<Vzhlad>(koncept?.vzhlad ?? naostro);
  const [mod, setMod] = useState<"moja" | "vzor">("moja");
  const [zar, setZar] = useState<Zariadenie>("pc");
  const [zver, setZver] = useState(false);
  const [ul, setUl] = useState<Ulozenie>("");
  const [chyba, setChyba] = useState("");
  const [nap, setNap] = useState(false);
  useEffect(() => { if (!nap) return; const t = window.setTimeout(() => setNap(false), 4000); return () => window.clearTimeout(t); }, [nap]);

  // koncept na server chvíľu po zmene; „Uložené ✓“ až po potvrdení
  const posl = useRef(koncept?.vzhlad ?? "");
  const naplanovane = koncept?.naplanovane;
  const uloz = async (v: Vzhlad): Promise<boolean> => {
    setUl("uklada"); setChyba("");
    const e = await ulozKonceptCharityIsto(v, naplanovane);
    if (e) { setUl("chyba"); setChyba(e); return false; }
    posl.current = v; setUl("ok"); return true;
  };
  useEffect(() => {
    if (vz === posl.current || (!posl.current && vz === naostro)) return;
    const t = window.setTimeout(() => { void uloz(vz); }, 500);
    return () => window.clearTimeout(t);
  }, [vz]); // eslint-disable-line react-hooks/exhaustive-deps

  const aktualny = { vzhlad: vz, zmenene: koncept?.zmenene ?? "", naplanovane };
  const zmeny = zmenyKonceptuCharity(aktualny, naostro);
  const zVeta = zmeny.length ? "1 zmena čaká" : "Zatiaľ bez zmien";
  const neverejna = useNeverejna(strankaId); // OPRAVY 511: kým stránka nie je verejná, vzhľad sa len uloží
  const otvorZverejnit = async () => {
    if (!zmeny.length) { setNap(true); return; }
    if (ul === "uklada") return;
    if (vz !== posl.current && !(await uloz(vz))) return;
    if (neverejna) { setUl("uklada"); const e = await zverejniCharitaHned(strankaId, aktualny, naostro); if (e) { setUl("chyba"); setChyba(e); } else setUl("ok"); return; }
    setZver(true);
  };

  const P = svetly
    ? { naBd: "#C8553D", naBg: "#FBE9E4", naSt: "#A3402B", zlBg: "#F6ECD2", zlT: "#5E4510", zlS: "#6E5622", moBg: "#E6EEF7", moT: "#1F3550", moS: "#33506F" }
    : { naBd: "#C8553D", naBg: "#2A1814", naSt: "#F0A08E", zlBg: "#2B2412", zlT: "#F3DFA8", zlS: "#E1CC93", moBg: "#1B2430", moT: "#DCE7F5", moS: "#B7C8DE" };
  const vzor = mod === "vzor", nazovVz = nazovVzhladuCharity(vz), nazovNaostro = nazovVzhladuCharity(naostro);
  const pasT = vzor ? `Vzor · takto môže vyzerať stránka vo vzhľade ${nazovVz}` : `Skúšobný režim · toto je vaša stránka vo vzhľade ${nazovVz}`;
  const pasS = vzor ? "Vyplnená ukážka Charity vzorovej. Vaše skúšanie platí pre Moju stránku." : `S vašimi fotkami a textami. Ľudia zatiaľ vidia ${nazovNaostro}. Toto vidíte len vy.`;

  const tl: CSSProperties = { flex: "none", whiteSpace: "nowrap", minHeight: 46, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };
  const vol = (on: boolean): CSSProperties => ({ flex: "none", whiteSpace: "nowrap", minHeight: 50, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "transparent", color: on ? "var(--gInk)" : "var(--ink)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" });
  const lbl: CSSProperties = { fontSize: 15, color: "var(--ink2)", whiteSpace: "nowrap" };
  const [, , sirka, layout] = ZARIADENIA.find((z) => z[0] === zar)!;

  return (<>
    <header style={{ flex: "none", minHeight: 72, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "10px 24px", borderBottom: "1px solid var(--cardBd)", boxSizing: "border-box" }}>
      <button type="button" onClick={onZavri} style={tl}>‹ Odísť z ateliéru</button>
      <b style={{ fontSize: 20, whiteSpace: "nowrap" }}>Ateliér stránky</b>
      <span aria-hidden="true" style={{ flex: "none", width: 1, height: 38, background: "var(--cardBd)" }} />
      <b style={lbl}>Ukázať:</b>
      <div role="radiogroup" aria-label="Ukázať" style={{ flex: "none", display: "flex", padding: 3, borderRadius: 14, background: "var(--seg)", border: "1px solid var(--cardBd)" }}>
        {([["moja", "Moja stránka"], ["vzor", "Charita vzorová"]] as const).map(([k, n]) => { const on = mod === k; return (
          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setMod(k)} style={{ whiteSpace: "nowrap", minHeight: 44, padding: "0 16px", borderRadius: 11, border: "none", background: on ? "#355A2B" : "transparent", color: on ? "#fff" : "var(--ink2)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{n}</button>); })}
      </div>
      <span style={{ flex: 1 }} />
      <span role="status" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 14.5, color: "var(--ink2)", whiteSpace: "nowrap" }}>
        <span>{zVeta}{naplanovane && zmeny.length ? ` · zverejní sa ${kedy2(naplanovane)}` : ""}</span>
        {ul === "uklada" && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Ukladá sa…</span>}
        {nap && !zmeny.length && <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gold)" }}>Najprv vyberte iný vzhľad.</span>}
        {ul === "ok" && <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gInk)" }}>Uložené ✓ · nikto to nevidí</span>}
      </span>
      <button type="button" onClick={() => { void otvorZverejnit(); }} aria-disabled={!zmeny.length}
        style={{ flex: "none", whiteSpace: "nowrap", minHeight: 50, padding: "0 22px", borderRadius: 14, border: `1.5px solid ${zmeny.length ? "#4A743B" : "var(--cardBd)"}`, background: zmeny.length ? "#355A2B" : "transparent", color: zmeny.length ? "#fff" : "var(--ink3)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}
        >{neverejna ? "Uložiť vzhľad ›" : "Zverejniť vzhľad ›"}</button>
    </header>
    {ul === "chyba" && <div role="alert" style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", background: "var(--goldBg)", borderBottom: "1.5px solid #C9A24A" }}>
      <img src="/svetlusik.png" alt="" width={34} height={34} style={{ flex: "none" }} />
      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{chyba}</span>
      <button type="button" onClick={() => { void uloz(vz); }} style={{ ...tl, minHeight: 42, background: "var(--card)" }}>Skúsiť znova</button>
    </div>}

    <div style={{ flex: "none", minHeight: 72, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 24px", borderBottom: "1px solid var(--cardBd)", boxSizing: "border-box" }}>
      <b style={lbl}>Vzhľad:</b>
      {VZHLADY.map((r) => {
        const live = r.k === naostro, on = r.k === vz, w = live ? 58 : 46, h = live ? 44 : 34;
        const bd = live ? P.naBd : on ? "var(--green)" : "var(--cardBd)", bg = live ? P.naBg : on ? "var(--gSoft)" : "var(--card)", st = live ? P.naSt : on ? "var(--gInk)" : "var(--ink3)";
        return (
          <button key={r.k} type="button" aria-pressed={on} onClick={() => setVz(r.k)} aria-label={`${r.t} · ${live ? "teraz na stránke" : on ? "skúšate" : "vyskúšať"}`}
            style={{ flex: "none", whiteSpace: "nowrap", minHeight: live ? 62 : 50, padding: "0 14px 0 8px", borderRadius: 12, border: `2px solid ${bd}`, background: bg, color: "var(--ink)", fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, boxShadow: live && on ? "0 0 0 2px var(--green)" : "none" }}>
            <Nakres k={r.k} w={w} h={h} />
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2 }}>
              <span style={{ fontSize: live ? 16.5 : 15, fontWeight: 800 }}>{r.t}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: st }}>{live ? "teraz" : on ? "skúšate" : "vyskúšať"}</span>
              {live && <span style={{ fontSize: 12, fontWeight: 700, color: st }}>na stránke</span>}
            </span>
          </button>);
      })}
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

    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: sirka ? "var(--btn)" : "transparent", padding: sirka ? "24px 16px 40px" : 0 }}>
      <div style={sirka ? { width: sirka, maxWidth: "100%", margin: "0 auto", borderRadius: 24, overflow: "hidden", border: "8px solid #1D211B", boxShadow: "0 12px 40px rgba(0,0,0,.25)", background: "var(--bg)" } : undefined}>
        <LayoutContext.Provider value={layout}>
          {vzor
            ? <VerejnyProfilView key={`vzor-${vz}`} kluc={CHARITA_VZOR.k} onBack={() => setMod("moja")} vzhladAtelier={vz} />
            : <VerejnyProfilView key={`moja-${vz}`} kluc={strankaId} onBack={onZavri} vzhladAtelier={vz} />}
        </LayoutContext.Provider>
      </div>
    </div>
    {zver && <AtelierZverejnit strankaId={strankaId} koncept={null} naostro="nastenka" uspNaostro={POVODNE} onSpat={() => setZver(false)} onHotovo={onZavri}
      adapter={{
        ma: true, zmeny, naostroNazov: nazovNaostro, naplanovane,
        hned: () => zverejniCharitaHned(strankaId, aktualny, naostro),
        naplanuj: (iso) => naplanujKonceptCharity(aktualny, iso),
        spat: spat ? { nazov: nazovVzhladuCharity(spat.vzhlad), do: spat.do } : null,
        vrat: () => (spat ? vratSpatCharity(strankaId, spat) : Promise.resolve(null)),
      }} />}
  </>);
}

/** malý nákres obrazovky vzhľadu: Kronika profil vľavo · Výklad veľká titulka · Moderné celé obrazovky */
function Nakres({ k, w, h }: { k: Vzhlad; w: number; h: number }) {
  const sw = SW[k], f = "var(--cardBd)";
  const b = (st: CSSProperties) => <span style={{ borderRadius: 2, ...st }} />;
  return (
    <span aria-hidden="true" style={{ flex: "none", width: w, height: h, boxSizing: "border-box", borderRadius: 6, background: "var(--field)", border: "1px solid var(--cardBd)", padding: 4, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
      {k === "kronika" && <span style={{ flex: 1, display: "flex", gap: 3 }}>{b({ width: "32%", background: sw })}<span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>{b({ flex: 1, background: f })}{b({ flex: 1, background: f })}</span></span>}
      {k === "vyklad" && <>{b({ height: "50%", background: sw })}<span style={{ flex: 1, display: "flex", gap: 3 }}>{b({ flex: 1, background: f })}{b({ flex: 1, background: f })}</span></>}
      {k === "pirat" && <>{b({ flex: 1, background: sw })}</>}
    </span>);
}
