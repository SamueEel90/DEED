// ============================================================
// OPRAVY 390 · hosť (Len prispievať, bez registrácie / QR bez účtu) — jedna veta hore na Domove.
// „Prezeráte ako hosť · Zaregistrujete sa kedykoľvek ›“, × ju zbalí natrvalo (tento prehliadač).
// ============================================================
import { useState } from "react";
import { useSession } from "@/lib/session";
import { useAktivacia } from "@/components/context";
import { C } from "@/theme";

const KLUC = "deed.host.pruhZbaleny";
const zbaleny = () => { try { return localStorage.getItem(KLUC) === "1"; } catch { return false; } };

export function HostPruh() {
  const s = useSession();
  const aktivacia = useAktivacia();
  const [skryty, setSkryty] = useState(zbaleny);
  if (skryty || !s || !("typ" in s) || s.typ !== "pasivny") return null;
  const zbal = () => { try { localStorage.setItem(KLUC, "1"); } catch { /* bez úložiska len na teraz */ } setSkryty(true); };
  return (
    <div role="note" style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 16px 10px", padding: "4px 4px 4px 14px", minHeight: 44, borderRadius: 14, background: C.surface2, border: `1px solid ${C.line}`, color: C.textSec, fontSize: 14, lineHeight: 1.35 }}>
      <span style={{ flex: 1, minWidth: 0 }}>Prezeráte ako hosť ·{" "}
        <button type="button" onClick={() => aktivacia("aktivny")} style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: C.green }}>Zaregistrujete sa kedykoľvek ›</button>
      </span>
      <button type="button" onClick={zbal} aria-label="Zbaliť" style={{ flex: "none", width: 40, height: 40, borderRadius: 12, border: "none", background: "transparent", color: C.textTer, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}
