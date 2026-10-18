// ============================================================
// OPRAVY 378 · Overte e-mail — 6 číslic z e-mailu (Supabase verifyOtp type „signup“), bez odkazu.
// Používa registrácia osoby (OsobaB, krok „email“) aj prihlásenie s neovereným e-mailom (AuthPage).
// Zlý kód: „Kód nesedí · skúste znova“, vypršaný: „Kód vypršal · pošleme nový“ (a hneď ho pošle).
// ============================================================
import { useEffect, useRef, useState } from "react";
import { overEmailKod, posliEmailKod } from "@/lib/auth";
import { KodPolia } from "./RegB";

/** Supabase: platnosť kódu (Auth → Email OTP Expiration), predvolene 1 hodina */
const PLATNOST_MS = 60 * 60 * 1000;

export function useOverenieEmailu(email: string, onOverene: (authId: string) => void | Promise<void>) {
  const [kod, setKod0] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [odpocet, setOdpocet] = useState(60);
  const poslane = useRef(Date.now());
  useEffect(() => { if (odpocet <= 0) return; const t = window.setTimeout(() => setOdpocet((s) => s - 1), 1000); return () => window.clearTimeout(t); }, [odpocet]);
  const posli = async () => {
    if (odpocet > 0 || busy) return;
    setBusy(true); setChyba(null);
    const r = await posliEmailKod(email);
    setBusy(false);
    if (!r.ok) { setChyba(r.chyba ?? "Kód sa nepodarilo poslať · skúste znova."); return; }
    poslane.current = Date.now(); setKod0(""); setOdpocet(60);
  };
  const over = async () => {
    if (kod.length !== 6 || busy) return;
    setBusy(true); setChyba(null);
    const r = await overEmailKod(email, kod);
    if (!r.ok) {
      setBusy(false);
      if (r.chyba !== "kod") { setChyba(r.chyba ?? "Overenie sa nepodarilo · skúste znova."); return; }
      if (Date.now() - poslane.current > PLATNOST_MS) {
        setChyba("Kód vypršal · pošleme nový");
        const p = await posliEmailKod(email);
        if (p.ok) { poslane.current = Date.now(); setKod0(""); setOdpocet(60); }
        return;
      }
      setChyba("Kód nesedí · skúste znova"); return;
    }
    try { await onOverene(r.authId ?? ""); } catch { setChyba("Účet sa nepodarilo založiť · Skúsiť znova."); } finally { setBusy(false); }
  };
  const setKod = (v: string) => { setChyba(null); setKod0(v); };
  return { kod, setKod, chyba, setChyba, busy, odpocet, posli, over };
}

export function OverteEmailTelo({ email, o, onZmenit }: { email: string; o: ReturnType<typeof useOverenieEmailu>; onZmenit: () => void }) {
  const link = { border: "none", background: "transparent", padding: 0, minHeight: 44, cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--green)", boxShadow: "none" } as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink2)" }}>Poslali sme 6 číslic na <b style={{ color: "var(--ink)", overflowWrap: "anywhere" }}>{email}</b>. Pozrite aj priečinok Spam.</span>
      <KodPolia value={o.kod} onChange={o.setKod} label="Kód z e-mailu" />
      {o.chyba && <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: "#B8452F" }}>{o.chyba}</span>}
      <span style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        {o.odpocet > 0 ? <span style={{ fontSize: 14, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>Poslať znova o 0:{String(o.odpocet).padStart(2, "0")}</span>
          : <button type="button" onClick={() => void o.posli()} disabled={o.busy} style={link}>Poslať znova</button>}
        <button type="button" onClick={onZmenit} style={{ ...link, color: "var(--ink2)" }}>Zmeniť e-mail</button>
      </span>
    </div>);
}
