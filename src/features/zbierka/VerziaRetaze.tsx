// ============================================================
// OPRAVY 492 · vrstva „verzia zbierky u toho, kto reťazí“ — otvorí ju QR reťaze (/r/…) alebo ťuk na riadok reťaze
// v hlavnej zbierke. Platobný modul na mieste „tvorca“ (Kam ide tvoj dar · Vyzbierané cez reťaz · Celá zbierka ·
// Darcovia cez reťaz), bez Reťaze dobra. Späť zavrie len vrstvu — pod ňou ostane to, odkiaľ prišiel.
// ============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useVerziaRetaze, zavriVerziuRetaze, nacitajVerziu, type Verzia, type CielVerzie } from "@/lib/retazVerzia";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { ZbierkaModul } from "./ZbierkaModul";

const tl = { minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)" } as const;

export function VerziaRetazeVrstva() {
  const c = useVerziaRetaze();
  const [st, setSt] = useState<{ c: CielVerzie; v: Verzia } | null>(null);
  const [skus, setSkus] = useState(0);
  useEffect(() => {
    if (!c) return;
    let ziva = true;
    // stránka toho, kto reťazí, ide pod vrstvu (Späť na ňu vráti)
    void nacitajVerziu(c, (s) => { zavriVerziuRetaze(); otvorVerejnyProfil(s); }).then((v) => {
      if (!ziva) return;
      setSt({ c, v });
      if (c.zQr && v.druh !== "chyba" && v.stranka) otvorVerejnyProfil(v.stranka);
    });
    return () => { ziva = false; };
  }, [c, skus]);
  useEffect(() => {
    if (!c) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavriVerziuRetaze(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [c]);
  if (!c) return null;
  const v = st && st.c === c ? st.v : null;
  return createPortal(
    <div className="sc-tokeny" role="dialog" aria-modal="true" aria-label="Zbierka cez reťaz dobra" style={{ position: "fixed", inset: 0, zIndex: 1100, background: "var(--bg)", color: "var(--ink)", overflowY: "auto" }}>
      {!v && <div style={{ padding: "40px 16px", textAlign: "center", fontSize: 15, color: "var(--ink3)" }}>Načítavam…</div>}
      {v?.druh === "ok" && <div style={{ maxWidth: 1240, margin: "0 auto", padding: 14 }}>
        <ZbierkaModul zbierka={v.zbierka} miesto="tvorca" onBack={zavriVerziuRetaze} spatNazov={c.zQr && v.stranka ? "Späť na stránku" : "Späť"} />
      </div>}
      {(v?.druh === "nebezi" || v?.druh === "chyba") && <div style={{ maxWidth: 520, margin: "0 auto", padding: "calc(24px + env(safe-area-inset-top, 0px)) 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <b style={{ fontSize: 20 }}>{v.druh === "nebezi" ? "Reťaz teraz neposiela na žiadnu zbierku" : "Zbierku sa nepodarilo načítať"}</b>
        <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{v.druh === "nebezi"
          ? `Zbierky v reťazi ${v.meno} sú naplnené alebo ukončené.`
          : "Skontrolujte pripojenie a skúste to znova."}</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {v.druh === "chyba" && <button type="button" onClick={() => { setSt(null); setSkus((n) => n + 1); }} style={{ ...tl, background: "#4B7A35", color: "#fff", border: "none" }}>Skúsiť znova</button>}
          <button type="button" onClick={zavriVerziuRetaze} style={tl}>{v.druh === "nebezi" && c.zQr && v.stranka ? "Na stránku" : "Zavrieť"}</button>
        </div>
      </div>}
    </div>, document.body);
}
