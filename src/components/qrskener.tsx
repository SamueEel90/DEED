import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { C, SPACE, RADIUS, GRAD_ZELENY } from "@/theme";
import { tint } from "@/lib/ui";
import { useScan } from "@/data";
import { deviceId } from "@/lib/zariadenie";
import { usePouzivatel } from "@/lib/pouzivatel";
import { Sheet } from "@/components/sheet";
import { Lupa, IkonaFajka, IkonaKriz } from "@/components/icons";

// ============================================================
// QR SKENER (Fáza 3) — proof-of-presence: naskenuj rotujúci TOTP token
// kamerou (@zxing) a over cez server (scan_validate). Manuálny fallback
// (vloženie tokenu) keď kamera nie je dostupná / povolená.
// ============================================================
type Verdikt = "ok" | "replay" | "expired" | "fake" | "out_of_radius";

const VERDIKT_TXT: Record<Verdikt, { t: string; d: string; col: string }> = {
  ok:             { t: "Overené",        d: "Prítomnosť zaznamenaná cez tvoj účet.", col: "var(--a-green)" },
  replay:         { t: "Už naskenované", d: "Tento kód si už použil na tomto zariadení.", col: "var(--a-clay)" },
  expired:        { t: "Kód expiroval",  d: "Screenshot je neplatný — naskenuj živý kód.", col: "var(--a-clay)" },
  fake:           { t: "Neplatný kód",   d: "Podpis nesedí — toto nie je DEED akčný QR.", col: "var(--a-danger)" },
  out_of_radius:  { t: "Mimo miesta",    d: "Si príliš ďaleko od akcie.", col: "var(--a-danger)" },
};

export function QrSkener({ onClose, toast }: { onClose?: () => void; toast?: (t: string) => void }) {
  const { ucetId } = usePouzivatel();
  const skenuj = useScan();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const hotovoRef = useRef(false);                 // zabráni viacnásobnému spracovaniu jedného skenu
  const [manual, setManual] = useState(false);
  const [token, setToken] = useState("");
  const [verdikt, setVerdikt] = useState<Verdikt | null>(null);

  const stopCam = () => { try { controlsRef.current?.stop(); } catch { /* už zastavené */ } controlsRef.current = null; };

  async function over(raw: string) {
    if (hotovoRef.current) return;
    const t = raw.trim();
    if (!t.startsWith("DEED1.")) { toast?.("To nie je DEED akčný QR"); return; }
    hotovoRef.current = true;
    stopCam();
    try {
      const r = await skenuj.mutateAsync({ token: t, deviceId: deviceId(), userId: ucetId ?? null });
      setVerdikt(r.vysledok as Verdikt);
    } catch {
      setVerdikt("fake");
    }
  }

  // spusti kameru pri otvorení; pri zlyhaní/odmietnutí → manuálny režim
  useEffect(() => {
    let zrusene = false;
    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, _err, controls) => {
        controlsRef.current = controls;
        if (zrusene) { controls.stop(); return; }
        if (result) void over(result.getText());
      })
      .then((controls) => { controlsRef.current = controls; if (zrusene) controls.stop(); })
      .catch(() => { if (!zrusene) setManual(true); });   // bez kamery → manuál
    return () => { zrusene = true; stopCam(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inpS: CSSProperties = { width: "100%", padding: `${SPACE.sm}px`, borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };
  const btn = (grad = false): CSSProperties => ({ width: "100%", padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.md, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: grad ? GRAD_ZELENY : C.surface2, color: grad ? "#fff" : C.text, marginTop: SPACE.sm });

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.gutter }}>
        <span style={{ width: 36, height: 36, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint("#F0A85E", .16), color: "#F0A85E" }}><Lupa size={18} color="#F0A85E" /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Naskenovať akčný QR</div>
          <div style={{ fontSize: 11.5, color: C.textTer }}>Overenie prítomnosti · rotujúci kód</div>
        </div>
      </div>

      {verdikt ? (
        // výsledok overenia
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.md}px 0 ${SPACE.xs}px` }}>
          <div style={{ width: 56, height: 56, borderRadius: RADIUS.round, background: tint(VERDIKT_TXT[verdikt].col, .16), display: "flex", alignItems: "center", justifyContent: "center" }}>
            {verdikt === "ok" ? <IkonaFajka size={28} color={VERDIKT_TXT[verdikt].col} /> : <IkonaKriz size={26} color={VERDIKT_TXT[verdikt].col} />}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: VERDIKT_TXT[verdikt].col }}>{VERDIKT_TXT[verdikt].t}</div>
          <div style={{ fontSize: 12.5, color: C.textSec, textAlign: "center", maxWidth: 280 }}>{VERDIKT_TXT[verdikt].d}</div>
          <button onClick={onClose} style={btn(true)}>Hotovo</button>
        </div>
      ) : manual ? (
        // manuálny fallback — vloženie tokenu (kamera nedostupná)
        <div>
          <div style={{ fontSize: 12.5, color: C.textTer, marginBottom: SPACE.sm }}>Kamera nie je dostupná. Vlož token z akčného QR (DEED1.…).</div>
          <input autoFocus value={token} onChange={(e) => setToken(e.target.value)} placeholder="DEED1.…" style={inpS} />
          <button disabled={skenuj.isPending || !token.trim()} onClick={() => over(token)} style={btn(true)}>{skenuj.isPending ? "Overujem…" : "Overiť"}</button>
        </div>
      ) : (
        // živý kamerový náhľad
        <div>
          <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: RADIUS.md, overflow: "hidden", background: "#000", border: `1px solid ${C.line}` }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
            <div style={{ position: "absolute", inset: "18%", border: "2px solid rgba(255,255,255,.85)", borderRadius: RADIUS.md, boxShadow: "0 0 0 100vmax rgba(0,0,0,.25)" }} />
          </div>
          <div style={{ fontSize: 11.5, color: C.textTer, textAlign: "center", marginTop: SPACE.sm }}>Namier na rotujúci QR organizátora</div>
          <button onClick={() => setManual(true)} style={btn(false)}>Vložiť token manuálne</button>
        </div>
      )}
    </Sheet>
  );
}
