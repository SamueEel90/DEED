// ============================================================
// OPRAVY 467 · 471 · Ateliér stránky (farnosť) — prototyp „Atelier stranky v2“ (3a, jedna obrazovka, AtelierMoja.tsx).
// Celá obrazovka bez menu Správy. Kroky Vzory · Moja stránka · Zverejniť sú od 471 preč (Ukázať: Moja stránka · Vzorová).
// Úzka obrazovka (rozhoduje šírka, nie zariadenie): ateliér sa neotvára, povie, ako sa dostať na počítač (aj QR prihlásenie 466).
// ============================================================
import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRozlozenie } from "@/lib/rozlozenieFarnosti";
import { useUsporiadanie } from "@/lib/usporiadanieStranky";
import { useKonceptAtelieru } from "@/lib/atelier";
import type { ProfilStranky } from "@/lib/profilStranky";
import { toast } from "@/components/toast";
import { usePrihlaseniePc } from "@/lib/qrPrihlasenie";
import { AtelierObrazovka } from "./AtelierMoja";

const QrSkener = lazy(() => import("@/components/qrskener").then((m) => ({ default: m.QrSkener })));
/** pod touto šírkou je obrazovka na ateliér primalá */
export const ATELIER_MIN_SIRKA = 760;
export function useUzkaObrazovka(): boolean {
  const [u, setU] = useState(() => typeof window !== "undefined" && window.innerWidth < ATELIER_MIN_SIRKA);
  useEffect(() => { const f = () => setU(window.innerWidth < ATELIER_MIN_SIRKA); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return u;
}

export function Atelier({ strankaId, meno, profil, onZavri, onPoradie }: { strankaId: string; meno: string; profil: ProfilStranky | null; onZavri: () => void; /** mobil: Poradie blokov (platí hneď) */ onPoradie: () => void }) {
  const uzka = useUzkaObrazovka();
  const naostro = useRozlozenie(strankaId);
  const usp = useUsporiadanie(strankaId);
  const koncept = useKonceptAtelieru();
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  if (uzka) return createPortal(<AtelierMobil onZavri={onZavri} onPoradie={onPoradie} />, document.body);
  // OPRAVY 471: jedna obrazovka (bez krokov Vzory · Moja stránka · Zverejniť)
  return createPortal(
    <div className="sprava-charity" role="dialog" aria-modal="true" aria-label="Ateliér stránky"
      style={{ position: "fixed", inset: 0, zIndex: 1150, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <AtelierObrazovka strankaId={strankaId} meno={meno} profil={profil} koncept={koncept} naostro={naostro} uspNaostro={usp} onZavri={onZavri} />
    </div>, document.body);
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
