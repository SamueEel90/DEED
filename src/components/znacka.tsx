// ============================================================
// DEED · Značka (logo) — dve podoby jednej značky:
//   · QR logo (štvorcový skenovateľný QR, biele pozadie) = /brand/deed-qr.png
//   · App ikona (zelený D⁺ odznak)                        = /brand/deed-appicon.svg
//   (verziu „QR vnorený do D" zámerne NEpoužívame — prianie vlastníka.)
//
// Zobrazenie podľa priania vlastníka:
//   · DESKTOP → všade QR logo (v bočnej navigácii, na logine).
//   · MOBIL   → App ikona; klik NA ŇU zobrazí QR logo na CELÚ obrazovku.
// `force` prekryje auto-voľbu (login = vždy QR). Klik na značku vždy otvorí
// QR na celú obrazovku (na bielej karte → QR ostáva skenovateľný aj na tmavom pozadí).
// ============================================================
import { useState } from "react";
import { createPortal } from "react-dom";
import { C, RADIUS, SPACE } from "@/theme";
import { useLayout } from "@/components/context";
import { pressable } from "@/components/pressable";
import { IkonaKriz } from "@/components/icons";

const QR_SRC = "/brand/deed-qr.png";
const APP_SRC = "/brand/deed-appicon.svg";
// cieľ v QR (viď brand kit README) — len informatívny podtitul pod QR
const QR_CIEL = "deed-help.vercel.app";

export function Znacka({ size = 40, force, style }: {
  size?: number;
  /** "qr" = vždy QR logo · "app" = vždy App ikona (inak auto: desktop→qr, mobil→app) */
  force?: "qr" | "app";
  style?: React.CSSProperties;
}) {
  const { desktop } = useLayout();
  const [full, setFull] = useState(false);
  const mode = force ?? (desktop ? "qr" : "app");
  const src = mode === "qr" ? QR_SRC : APP_SRC;

  return (
    <>
      <span {...pressable(() => setFull(true), "Logo DEED — zobraziť QR kód na celú obrazovku")}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto", ...style }}>
        <img src={src} alt="DEED" draggable={false}
          // štvorcový QR (biele pozadie) aj App ikona = štvorec; QR s jemne zaoblenými rohmi
          style={{ width: size, height: size, display: "block", borderRadius: mode === "qr" ? Math.round(size * 0.16) : undefined }} />
      </span>
      {/* portál do document.body — inak `position:fixed` uviazne v glass predku
          (backdrop-filter v bočnej lište / hlavičke = containing block) a overlay
          sa nezobrazí na strede obrazovky, ale v rámci lišty/hlavičky. */}
      {full && createPortal(<ZnackaFull onClose={() => setFull(false)} />, document.body)}
    </>
  );
}

// QR na celú obrazovku — biela karta (kontrast pre skener) + podtitul + zavretie
function ZnackaFull({ onClose }: { onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="DEED QR kód" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: SPACE.lg, padding: SPACE.xl,
        background: "rgba(4,6,12,.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", animation: "fadeUp .2s ease" }}>
      <span {...pressable(onClose, "Zavrieť")}
        style={{ position: "absolute", top: "max(16px, env(safe-area-inset-top, 0px))", right: 16, width: 42, height: 42, borderRadius: RADIUS.round, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <IkonaKriz size={20} color="#fff" />
      </span>
      {/* biela karta → QR ostáva skenovateľný (zelené moduly na bielej) */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: RADIUS.xl, padding: SPACE.lg, boxShadow: "0 24px 70px rgba(0,0,0,.55)" }}>
        <img src={QR_SRC} alt="DEED — naskenuj QR kód" draggable={false}
          style={{ width: "min(72vw, 360px)", height: "auto", display: "block" }} />
      </div>
      <div style={{ color: "#fff", textAlign: "center", lineHeight: 1.5 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Naskenuj a otvor DEED</div>
        <div style={{ fontSize: 12.5, opacity: .7, marginTop: 2 }}>{QR_CIEL}</div>
      </div>
    </div>
  );
}

// nemenný fallback použitý ešte pred načítaním layoutu (aby TS videl export aj bez JSX importu inde)
export const ZNACKA_QR_SRC = QR_SRC;
export const ZNACKA_APP_SRC = APP_SRC;
