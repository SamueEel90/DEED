// ============================================================
// OPRAVY 466 doplnok 3 · okno „Overte, že ste to vy“ (tvár / odtlačok alebo PIN) a nastavenie PIN-u.
// Jedno okno pre celú appku (ZamokHost v App); volá ho overTotoznost() z lib/zamok.
// ============================================================
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { signOut } from "@/lib/auth";
import { useNastaveniaAppky } from "@/lib/nastaveniaAppky";
import { useVyzvaZamku, bioDostupna, overBio, mamPin, overPin, zmenPin, trebaOverit, overTotoznost, type Oblast } from "@/lib/zamok";

const tlZ: CSSProperties = { minHeight: 52, border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" };
const tlO: CSSProperties = { minHeight: 48, border: "1.5px solid var(--cardBd)", borderRadius: 14, background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };
const pole: CSSProperties = { height: 56, padding: "0 16px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", fontFamily: "inherit", fontSize: 24, letterSpacing: ".4em", textAlign: "center", outline: "none", width: "100%", boxSizing: "border-box" };
const chybaSt: CSSProperties = { fontSize: 14.5, fontWeight: 700, color: "var(--cRed, #A34A2A)" };

function Okno({ label, children }: { label: string; children: React.ReactNode }) {
  return createPortal(
    <div className="sprava-charity" role="dialog" aria-modal="true" aria-label={label}
      style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(14,12,8,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "min(100%, 480px)", borderRadius: "24px 24px 0 0", background: "var(--bg)", color: "var(--ink)", padding: "22px 18px max(22px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {children}
      </div>
    </div>, document.body);
}

/** výzva na overenie pred citlivou akciou */
export function ZamokHost() {
  const v = useVyzvaZamku();
  const n = useNastaveniaAppky();
  const [rezim, setRezim] = useState<"nacitava" | "bio" | "pin" | "bezPinu">("nacitava");
  const [pin, setPin] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!v) return;
    let z = true; setPin(""); setChyba(null); setRezim("nacitava");
    void (async () => {
      const bio = n.biometria && await bioDostupna();
      if (!z) return;
      if (bio) { setRezim("bio"); return; } // prehliadač pustí overenie tvárou až po ťuku
      setRezim(await mamPin() ? "pin" : "bezPinu");
    })();
    return () => { z = false; };
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!v) return null;
  const skusPin = async () => {
    if (busy || !/^\d{4,6}$/.test(pin)) return;
    setBusy(true); setChyba(null);
    const r = await overPin(pin);
    setBusy(false);
    if (r.ok) v.hotovo(true); else { setChyba(r.chyba ?? "PIN nesedí."); setPin(""); }
  };
  return (
    <Okno label="Overte, že ste to vy">
      <b style={{ fontSize: 22 }}>Overte, že ste to vy</b>
      <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{v.dovod}</span>
      {rezim === "nacitava" && <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Moment…</span>}
      {rezim === "bio" && <>
        <button type="button" onClick={async () => { setChyba(null); if (await overBio()) v.hotovo(true); else setChyba("Overenie sa nepodarilo. Skúste znova alebo použite PIN."); }} style={tlZ}>Overiť tvárou alebo odtlačkom</button>
        <button type="button" onClick={async () => { setChyba(null); setRezim(await mamPin() ? "pin" : "bezPinu"); }} style={tlO}>Použiť PIN</button>
      </>}
      {rezim === "pin" && <>
        <input autoFocus type="password" inputMode="numeric" autoComplete="off" maxLength={6} aria-label="PIN" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => { if (e.key === "Enter") void skusPin(); }} style={pole} />
        <button type="button" disabled={busy || pin.length < 4} onClick={() => void skusPin()} style={{ ...tlZ, opacity: busy || pin.length < 4 ? 0.5 : 1 }}>{busy ? "Overujem…" : "Overiť PIN"}</button>
        <button type="button" onClick={() => { v.hotovo(false); void signOut(); }} style={{ ...tlO, border: "none", minHeight: 44, color: "var(--green)" }}>Zabudli ste PIN? Odhláste sa a prihláste heslom</button>
      </>}
      {rezim === "bezPinu" && <>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)" }}>Nemáte nastavený PIN a tento telefón nevie overiť tvár ani odtlačok. PIN si nastavíte do 10 minút po prihlásení heslom (Nastavenia → PIN).</span>
        <button type="button" onClick={() => { v.hotovo(false); void signOut(); }} style={tlZ}>Odhlásiť sa a prihlásiť heslom</button>
      </>}
      {chyba && <span role="alert" style={chybaSt}>{chyba}</span>}
      <button type="button" onClick={() => v.hotovo(false)} style={tlO}>Zrušiť</button>
    </Okno>);
}

/** Nastavenia → PIN: nový (len do 10 min po prihlásení heslom) alebo zmena (so súčasným) */
export function PinHarok({ onClose }: { onClose: () => void }) {
  const [ma, setMa] = useState<boolean | null>(null);
  const [stary, setStary] = useState("");
  const [novy, setNovy] = useState("");
  const [znova, setZnova] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void mamPin().then(setMa); }, []);
  const ok = /^\d{4,6}$/.test(novy) && novy === znova && (!ma || /^\d{4,6}$/.test(stary));
  const uloz = async () => {
    if (!ok || busy) return;
    setBusy(true); setChyba(null);
    const e = await zmenPin(novy, ma ? stary : undefined);
    setBusy(false);
    if (e) setChyba(e); else setHotovo(true);
  };
  const cisla = (set: (x: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/\D/g, "").slice(0, 6));
  return (
    <Okno label="PIN">
      <b style={{ fontSize: 22 }}>{ma ? "Zmeniť PIN" : "Nastaviť PIN"}</b>
      {hotovo ? <>
          <span role="status" style={{ fontSize: 16, fontWeight: 800, color: "var(--gInk)" }}>PIN je uložený ✓</span>
          <button type="button" onClick={onClose} style={tlZ}>Hotovo</button>
        </>
        : ma === null ? <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Moment…</span>
        : <>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>4 až 6 číslic. Pýtame ho pri Peňaženke a väčších platbách, keď telefón nevie overiť tvár ani odtlačok.</span>
          {ma && <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>Súčasný PIN<input type="password" inputMode="numeric" autoComplete="off" value={stary} onChange={cisla(setStary)} style={pole} /></label>}
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>Nový PIN<input type="password" inputMode="numeric" autoComplete="off" value={novy} onChange={cisla(setNovy)} style={pole} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700 }}>Nový PIN znova<input type="password" inputMode="numeric" autoComplete="off" value={znova} onChange={cisla(setZnova)} style={pole} /></label>
          {znova.length >= 4 && novy !== znova && <span role="alert" style={chybaSt}>PIN sa nezhoduje.</span>}
          <button type="button" disabled={!ok || busy} onClick={() => void uloz()} style={{ ...tlZ, opacity: ok && !busy ? 1 : 0.5 }}>{busy ? "Ukladám…" : "Uložiť PIN"}</button>
          {chyba && <span role="alert" style={chybaSt}>{chyba}</span>}
          <button type="button" onClick={onClose} style={tlO}>Zrušiť</button>
        </>}
    </Okno>);
}

/** obsah za zámkom (Peňaženka, Správa): kým nie je overené, nič; Zrušiť = späť */
export function ZaZamkom({ oblast, dovod, onZrus, children }: { oblast: Oblast; dovod: string; onZrus: () => void; children: React.ReactNode }) {
  const [ok, setOk] = useState(() => !trebaOverit(oblast));
  useEffect(() => {
    if (ok) return;
    let z = true;
    void overTotoznost(oblast, dovod).then((x) => { if (!z) return; if (x) setOk(true); else onZrus(); });
    return () => { z = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return ok ? <>{children}</> : null;
}
