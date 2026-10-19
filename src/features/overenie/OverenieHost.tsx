// ============================================================
// OPRAVY 338 — stránka /overenie/<token> u príjemcu (pozostalý, snúbenec, príjemca zbierky s overovateľom).
// Neprihlásený: Prihlásiť sa / Zaregistrovať sa → po prihlásení späť sem (lístok je v zariadení 15 min).
// Prihlásený: „Farnosť … chce založiť zbierku pre vás · Pohreb · meno · Podržte a potvrďte, že ste to vy“.
// OPRAVY 364: farár pošle na potvrdenie → tu sa hneď ukáže rozdelenie, príjemca ho podrží a potvrdí (bez kódu, 0113).
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePouzivatel } from "@/lib/pouzivatel";
import { ChybaPriTlacidle } from "@/components/ChybaPriTlacidle";
import { useOverenieStav, zavriOverenie, ovpNahlad, ovpPotvrd, ovpSuhlas, textChyby, type NahladOverenia } from "@/lib/overeniePrijemcu";

const DRUH: Record<NahladOverenia["druh"], string> = { pohreb: "Pohreb", svadba: "Svadba", ine: "Zbierka s overovateľom" };
const tlO: CSSProperties = { minHeight: 52, padding: "0 20px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "var(--ink)", boxShadow: "none" };
const tlZ: CSSProperties = { ...tlO, border: "none", background: "var(--green)", color: "#fff" };

/** tlačidlo „Podržte…“ — potvrdí sa po ms držania (prst aj klávesnica) */
function Podrz({ text, onHotovo, disabled, ms = 1200 }: { text: string; onHotovo: () => void; disabled?: boolean; ms?: number }) {
  const [drz, setDrz] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const zacni = () => { if (disabled) return; setDrz(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => { setDrz(false); onHotovo(); }, ms); };
  const pusti = () => { window.clearTimeout(tm.current); setDrz(false); };
  return (
    <button type="button" disabled={disabled} onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); zacni(); }} onPointerUp={pusti} onPointerCancel={pusti}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") pusti(); }}
      style={{ position: "relative", minHeight: 58, width: "100%", border: "none", borderRadius: 16, background: "#3F6E2A", overflow: "hidden", cursor: "pointer", touchAction: "none", fontFamily: "inherit", opacity: disabled ? 0.6 : 1 }}>
      <span style={{ position: "absolute", inset: 0, background: "#6E9F4E", transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? `${ms / 1000}s` : ".2s"} linear` }} />
      <span style={{ position: "relative", fontSize: 16.5, fontWeight: 800, color: "#fff" }}>{drz ? "Držte…" : text}</span>
    </button>);
}

function Ram({ children, onZavri }: { children: ReactNode; onZavri?: () => void }) {
  return (
    <div className="sprava-charity" role="dialog" aria-modal="true" aria-label="Overenie príjemcu zbierky"
      style={{ position: "fixed", inset: 0, zIndex: 90, background: "var(--bg)", overflowY: "auto", display: "flex", justifyContent: "center", padding: "24px 16px 40px", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
        {onZavri && <button type="button" onClick={onZavri} style={{ ...tlO, alignSelf: "flex-start", minHeight: 44, fontSize: 15 }}>‹ Zavrieť</button>}
        {children}
      </div>
    </div>);
}

/** prihlaseny = skutočný účet; meno = meno z profilu (len na zobrazenie) */
export function OverenieHost({ prihlaseny, meno, onPrihlasit, onRegistrovat }: { prihlaseny: boolean; meno?: string; onPrihlasit?: () => void; onRegistrovat?: () => void }) {
  const st = useOverenieStav();
  const listok = st && "listok" in st ? st.listok : null;
  const [n, setN] = useState<NahladOverenia | null>(null);
  const [chybaN, setChybaN] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [uklada, setUklada] = useState(false);
  const [obnov, setObnov] = useState(0);

  // náhľad + sledovanie (kým čaká na potvrdenie od farára, každé 3 s)
  useEffect(() => {
    if (!listok) return;
    let ziva = true;
    const nacitaj = () => ovpNahlad(listok).then((x) => { if (ziva) { setN(x); setChybaN(null); } }, (e: unknown) => { if (ziva) setChybaN(textChyby(e)); });
    void nacitaj();
    const t = window.setInterval(() => { if (!document.hidden) void nacitaj(); }, 3000);
    return () => { ziva = false; window.clearInterval(t); };
  }, [listok, prihlaseny, obnov]);

  if (!st) return null;
  if ("nacitava" in st) return <Ram><span style={{ fontSize: 16, color: "var(--ink2)" }}>Načítavam overenie…</span></Ram>;
  if ("chyba" in st || chybaN) {
    const t = "chyba" in st ? st.chyba : chybaN!;
    return <Ram onZavri={zavriOverenie}>
      <b style={{ fontSize: 22 }}>Overenie zbierky</b>
      <div role="alert" style={{ padding: "14px 16px", borderRadius: 16, background: "var(--errBg)", border: "2px solid var(--cRed)", fontSize: 16, fontWeight: 700, lineHeight: 1.45 }}>{t}</div>
      <button type="button" onClick={zavriOverenie} style={{ ...tlO, alignSelf: "flex-start" }}>Zavrieť</button>
    </Ram>;
  }
  if (!n) return <Ram><span style={{ fontSize: 16, color: "var(--ink2)" }}>Načítavam overenie…</span></Ram>;

  const hlava = <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{DRUH[n.druh].toLocaleUpperCase("sk-SK")}</span>
    <b style={{ fontSize: 23, lineHeight: 1.25 }}>{n.nazov ?? "Farnosť"} chce založiť zbierku pre vás</b>
  </div>;
  const akcia = async (f: () => Promise<unknown>) => {
    if (uklada) return;
    setUklada(true); setChyba(null);
    try { await f(); setObnov((x) => x + 1); } catch (e) { setChyba(textChyby(e)); } finally { setUklada(false); }
  };

  // neprihlásený: prihlásiť / zaregistrovať a potom späť sem
  if (!prihlaseny) return <Ram onZavri={zavriOverenie}>
    {hlava}
    <span style={{ fontSize: 16, lineHeight: 1.5, color: "var(--ink2)" }}>Prihláste sa alebo sa zaregistrujte. Potom sa vrátite sem a potvrdíte, že ste to vy.</span>
    <button type="button" onClick={onPrihlasit} style={tlZ}>Prihlásiť sa</button>
    <button type="button" onClick={onRegistrovat} style={tlO}>Zaregistrovať sa</button>
  </Ram>;

  if (n.iny) return <Ram onZavri={zavriOverenie}>
    {hlava}
    <div role="alert" style={{ padding: "14px 16px", borderRadius: 16, background: "var(--errBg)", border: "2px solid var(--cRed)", fontSize: 16, fontWeight: 700, lineHeight: 1.45 }}>Toto overenie už potvrdil niekto iný. Požiadajte farára o nový QR.</div>
  </Ram>;

  // 1 · potvrdiť, že som to ja
  if (!n.potvrdene) return <Ram onZavri={zavriOverenie}>
    {hlava}
    <div style={{ padding: "14px 16px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>PRÍJEMCA</span>
      <b style={{ fontSize: 18 }}>{meno || "Váš účet"}</b>
    </div>
    <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>Peniaze zo zbierky pôjdu na váš účet. Farár potom pripraví oznámenie a rozdelenie, potvrdíte ho podržaním.</span>
    <ChybaPriTlacidle text={chyba} uklada={uklada} onZnova={() => void akcia(() => ovpPotvrd(listok!))} />
    <Podrz text={uklada ? "Ukladá sa…" : "Podržte a potvrďte, že som to ja"} disabled={uklada} onHotovo={() => void akcia(() => ovpPotvrd(listok!))} />
  </Ram>;

  // 3 · hotovo
  if (n.suhlas) return <Ram onZavri={zavriOverenie}>
    {hlava}
    <div role="status" style={{ padding: "16px 18px", borderRadius: 18, background: "var(--gSoft)", border: "2px solid var(--green)", display: "flex", flexDirection: "column", gap: 8 }}>
      <b style={{ fontSize: 18, color: "var(--gInk)" }}>{n.zbierka ? "Zbierka beží ✓" : "Potvrdené ✓ · farár môže zapečatiť"}</b>
      <span style={{ fontSize: 15, lineHeight: 1.5 }}>{n.zbierka ? "Nájdete ju v Domov · Moje zbierky. Vidíte tam darcov a zbierku môžete ukončiť." : "Keď farár zbierku zapečatí, nájdete ju v Domov · Moje zbierky."}</span>
    </div>
    <button type="button" onClick={zavriOverenie} style={{ ...tlZ, alignSelf: "flex-start" }}>Hotovo</button>
  </Ram>;

  // 2 · čaká, kým farár pošle na potvrdenie → rozdelenie a Podržte (OPRAVY 364, bez kódu)
  const caka = n.caka ?? n.kod_caka;
  return <Ram onZavri={zavriOverenie}>
    {hlava}
    <div role="status" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 15, fontWeight: 800, color: "var(--gInk)" }}>Potvrdili ste, že ste to vy ✓</div>
    {caka ? <>
      <div style={{ padding: "14px 16px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ROZDELENIE ZBIERKY</span>
        <b style={{ fontSize: 16.5, lineHeight: 1.45 }}>{n.rozdelenie ?? "—"}</b>
      </div>
      <ChybaPriTlacidle text={chyba} uklada={uklada} nadpis="Nepotvrdilo sa" onZnova={() => void akcia(() => ovpSuhlas(listok!))} />
      <Podrz ms={1500} text={uklada ? "Ukladá sa…" : "Podržte a potvrďte rozdelenie"} disabled={uklada} onHotovo={() => void akcia(() => ovpSuhlas(listok!))} />
    </> : n.vyprsalo ? <div role="alert" style={{ padding: "14px 16px", borderRadius: 16, background: "var(--errBg)", border: "2px solid var(--cRed)", fontSize: 16, fontWeight: 700, lineHeight: 1.45 }}>Čas vypršal · požiadajte farára o nové potvrdenie</div>
      : <span style={{ fontSize: 16, lineHeight: 1.5, color: "var(--ink2)" }}>Farár teraz pripraví oznámenie a rozdelenie. Keď ho pošle na potvrdenie, ukáže sa tu. Nechajte túto stránku otvorenú.</span>}
  </Ram>;
}

/** vrstva nad appkou (prihlásený) — portál, aby bola nad všetkým */
export function OverenieVrstva({ onPrihlasit, onRegistrovat }: { onPrihlasit: () => void; onRegistrovat: () => void }) {
  const st = useOverenieStav();
  const ja = usePouzivatel();
  if (!st || typeof document === "undefined") return null;
  return createPortal(<OverenieHost prihlaseny={!ja.demo && !!ja.ucetId} meno={ja.celeMeno} onPrihlasit={onPrihlasit} onRegistrovat={onRegistrovat} />, document.body);
}
