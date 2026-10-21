// ============================================================
// OPRAVY 467 · Ateliér stránky (farnosť) — prototyp „Atelier stranky PC“ (1a PC, 1b mobil).
// Celá obrazovka bez menu Správy: ‹ Odísť z ateliéru · Ateliér stránky · kroky 1 Vzory · 2 Moja stránka · 3 Zverejniť.
// Úzka obrazovka (rozhoduje šírka, nie zariadenie): ateliér sa neotvára, povie, ako sa dostať na počítač (aj QR prihlásenie 466).
// ============================================================
import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ROZLOZENIA, useRozlozenie, type Rozlozenie } from "@/lib/rozlozenieFarnosti";
import { useUsporiadanie } from "@/lib/usporiadanieStranky";
import { POPIS_VZORU, nazovVzhladu, ulozKonceptAtelieru, useKonceptAtelieru } from "@/lib/atelier";
import { NastenkaFarnosti } from "@/features/verejny-profil/NastenkaFarnosti";
import type { ProfilStranky } from "@/lib/profilStranky";
import { toast } from "@/components/toast";
import { usePrihlaseniePc } from "@/lib/qrPrihlasenie";

const QrSkener = lazy(() => import("@/components/qrskener").then((m) => ({ default: m.QrSkener })));
/** pod touto šírkou je obrazovka na ateliér primalá */
export const ATELIER_MIN_SIRKA = 760;
export function useUzkaObrazovka(): boolean {
  const [u, setU] = useState(() => typeof window !== "undefined" && window.innerWidth < ATELIER_MIN_SIRKA);
  useEffect(() => { const f = () => setU(window.innerWidth < ATELIER_MIN_SIRKA); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return u;
}

const ZLATA = "#C9A24A";
const VZOR_BG: Record<Rozlozenie, string> = Object.fromEntries(ROZLOZENIA.map((r) => [r.k, r.bg])) as Record<Rozlozenie, string>;
type Krok = "vzory" | "moja" | "zver";

export function Atelier({ strankaId, meno, profil, onZavri, onPoradie }: { strankaId: string; meno: string; profil: ProfilStranky | null; onZavri: () => void; /** mobil: Poradie blokov (platí hneď) */ onPoradie: () => void }) {
  const uzka = useUzkaObrazovka();
  const naostro = useRozlozenie(strankaId);
  const usp = useUsporiadanie(strankaId);
  const koncept = useKonceptAtelieru();
  const [krok, setKrok] = useState<Krok>(koncept ? "moja" : "vzory");
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  if (uzka) return createPortal(<AtelierMobil onZavri={onZavri} onPoradie={onPoradie} />, document.body);

  const skusobny = koncept?.rozlozenie ?? naostro;
  const vyberVzor = (k: Rozlozenie) => { ulozKonceptAtelieru({ rozlozenie: k, usporiadanie: koncept?.usporiadanie ?? usp }); setKrok("moja"); };
  const KROKY: [Krok, string][] = [["vzory", "Vzory"], ["moja", "Moja stránka"], ["zver", "Zverejniť"]];
  const tl: CSSProperties = { minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };
  return createPortal(
    <div className="sprava-charity" role="dialog" aria-modal="true" aria-label="Ateliér stránky"
      style={{ position: "fixed", inset: 0, zIndex: 1150, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header style={{ flex: "none", height: 72, display: "flex", alignItems: "center", gap: 18, padding: "0 24px", borderBottom: "1px solid var(--cardBd)", boxSizing: "border-box" }}>
        <button type="button" onClick={onZavri} style={tl}>‹ Odísť z ateliéru</button>
        <b style={{ fontSize: 19 }}>Ateliér stránky</b>
        <nav aria-label="Kroky" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {KROKY.map(([k, t], i) => { const on = k === krok, mozno = k === "vzory" || (k === "moja" && !!koncept); return (
            <button key={k} type="button" aria-current={on ? "step" : undefined} disabled={!mozno || on} onClick={() => setKrok(k)}
              style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 12px", borderRadius: 22, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "transparent", color: on ? "var(--gInk)" : "var(--ink2)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: mozno && !on ? "pointer" : "default", opacity: mozno || on ? 1 : 0.5 }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: on ? "var(--green)" : "var(--btn)", color: on ? "#fff" : "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{i + 1}</span>{t}</button>); })}
        </nav>
      </header>
      <main style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {krok === "vzory" && <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ fontSize: 26 }}>Vyberte vzor</b>
            <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink2)" }}>Takto vyzerajú hotové stránky. Ťuknite na vzor a vyskúšate ho na svojej stránke. Nikto to neuvidí.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 20 }}>
            {ROZLOZENIA.map((r) => (
              <button key={r.k} type="button" onClick={() => vyberVzor(r.k)} aria-label={`${r.t} · ${POPIS_VZORU[r.k]}`}
                style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: 20, border: r.k === skusobny ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
                <VzorNahlad k={r.k} />
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 18 }}>{r.t}</b>
                  {r.k === naostro && <span style={{ padding: "3px 8px", borderRadius: 8, background: "var(--gSoft)", border: "1px solid var(--gBd)", color: "var(--gInk)", fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em" }}>NAOSTRO</span>}
                  {koncept && r.k === koncept.rozlozenie && r.k !== naostro && <span style={{ padding: "3px 8px", borderRadius: 8, background: "var(--goldBg)", border: `1px solid ${ZLATA}`, color: "var(--gold)", fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em" }}>ROZPRACOVANÉ</span>}</span>
                <span style={{ fontSize: 14.5, color: "var(--ink2)" }}>{POPIS_VZORU[r.k]}</span>
              </button>))}
          </div>
        </div>}
        {krok === "moja" && koncept && <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
          <div role="status" style={{ position: "sticky", top: 0, zIndex: 5, flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "12px 24px", background: "#2A2214", borderBottom: `2px solid ${ZLATA}`, color: "#F3EBDD" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <b style={{ fontSize: 16 }}>Skúšobný režim · {nazovVzhladu(koncept.rozlozenie)}</b>
              <span style={{ fontSize: 13.5, color: "#D9D2C4" }}>Ľudia vidia vašu doterajšiu stránku ({nazovVzhladu(naostro)}). Toto vidíte len vy.</span>
            </span>
          </div>
          <div style={{ flex: 1 }}><NastenkaFarnosti bezVidenych strankaId={strankaId} meno={meno} profil={profil} stit="Silver" atelier={{ rozlozenie: koncept.rozlozenie, usporiadanie: koncept.usporiadanie }} /></div>
        </div>}
      </main>
    </div>, document.body);
}

/** zmenšená ukážka vzhľadu (OPRAVY 467: kým nie sú prototypy farskej stránky s „Farnosť vzorová“, náhľad tvaru stránky) */
function VzorNahlad({ k }: { k: Rozlozenie }) {
  const blok = (w: string, h = 10, o = 0.85) => <span style={{ display: "block", width: w, height: h, borderRadius: 4, background: `rgba(255,255,255,${o})` }} />;
  const karta = (h: number) => <span style={{ display: "block", height: h, borderRadius: 8, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.25)" }} />;
  const bok = k === "kronika" || k === "konzervativny";
  return (
    <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: 10, aspectRatio: "16 / 10", borderRadius: 14, background: VZOR_BG[k], padding: 16, boxSizing: "border-box", overflow: "hidden" }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>{blok("44%", 14, 0.95)}{blok("26%", 8, 0.6)}</span>
      <span style={{ flex: 1, display: "grid", gridTemplateColumns: bok ? "30% 1fr" : "1fr", gap: 10, minHeight: 0 }}>
        {bok && <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>{karta(40)}{karta(54)}</span>}
        <span style={{ display: "grid", gridTemplateColumns: k === "moderne" ? "repeat(3,1fr)" : "1fr", gap: 8, alignContent: "start" }}>
          {k === "konzervativny" ? <>{blok("90%", 10, 0.7)}{blok("80%", 10, 0.7)}{blok("85%", 10, 0.7)}{blok("60%", 10, 0.7)}</>
            : k === "moderne" ? <>{karta(70)}{karta(70)}{karta(70)}{karta(40)}{karta(40)}{karta(40)}</>
            : <>{karta(30)}{karta(30)}{karta(30)}</>}
        </span>
      </span>
      <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.9)" }}>Farnosť vzorová</span>
    </span>);
}

/** OPRAVY 467 (5) · úzka obrazovka: ateliér na počítači alebo tablete */
function AtelierMobil({ onZavri, onPoradie }: { onZavri: () => void; onPoradie: () => void }) {
  const [qr, setQr] = useState(false);
  const [sken, setSken] = useState(false);
  // naskenovaný QR počítača → okno „Prihlásiť počítač?“ je pod ateliérom, ateliér sa zavrie
  const pc = usePrihlaseniePc();
  useEffect(() => { if (pc) onZavri(); }, [pc]); // eslint-disable-line react-hooks/exhaustive-deps
  const karta: CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: 18, borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" };
  return (
    <div className="sprava-charity" role="dialog" aria-modal="true" aria-label="Ateliér stránky"
      style={{ position: "fixed", inset: 0, zIndex: 1150, background: "var(--bg)", color: "var(--ink)", overflowY: "auto", padding: "max(16px, env(safe-area-inset-top)) 16px 40px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <button type="button" onClick={onZavri} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>‹ Nastavenia</button>
      <b style={{ fontSize: 26 }}>Ateliér stránky</b>
      <span style={{ fontSize: 16, lineHeight: 1.55, color: "var(--ink2)" }}>Na mobile je obrazovka primalá. Aby ste správne videli, ako bude stránka vyzerať, otvorte ateliér na počítači alebo tablete.</span>
      <section style={karta}>
        <b style={{ fontSize: 16 }}>Na počítači</b>
        <span style={{ fontSize: 15, lineHeight: 1.55 }}>Otvorte <b>deedgood.eu</b> → Správa → Nastavenia → <b>Ateliér stránky</b>, rovnako ako tu.</span>
      </section>
      <section style={karta}>
        <button type="button" aria-expanded={qr} onClick={() => setQr(!qr)} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: 0, border: "none", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>
          <span style={{ flex: 1 }}>Na počítači nie ste prihlásený?</span><span aria-hidden="true">{qr ? "⌃" : "›"}</span></button>
        {qr && <>
          <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Prihlásite sa mobilom, heslo netreba. Na počítači ťuknite <b style={{ color: "var(--ink)" }}>Prihlásiť sa mobilom</b>, ukáže sa QR. Potom ťuknite sem a namierte mobil na QR.</span>
          <button type="button" onClick={() => setSken(true)} style={{ minHeight: 52, border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Naskenovať QR z počítača</button>
        </>}
      </section>
      <button type="button" onClick={onPoradie} style={{ ...karta, flexDirection: "row", alignItems: "center", minHeight: 64, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)", textAlign: "left" }}>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16 }}>Poradie blokov</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>dá sa meniť aj tu, platí hneď</span></span>
        <span aria-hidden="true" style={{ fontSize: 20 }}>›</span></button>
      {sken && <Suspense fallback={null}><QrSkener onClose={() => setSken(false)} toast={toast} /></Suspense>}
    </div>);
}
