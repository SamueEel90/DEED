// ============================================================
// DEED · Značka (logo) — hlavná podoba = „D⁺ QR vlajka" (DEED_QR_Web_Dplus):
//   · D s QR vnútri + D+ pilulka (biele pozadie) = DeedQr s adresou appky (OPRAVY 347, lib/adresa)
//   · App ikona (zelený D⁺ odznak — launcher)    = /brand/deed-appicon.svg
//
// Rozhodnutie vlastníka (2026-07-15): D⁺ QR vlajka VŠADE — desktop,
// mobil aj login. `force="app"` ostáva pre prípadné launcher-kontexty.
// Klik na značku vždy otvorí QR na celú obrazovku (na bielej karte →
// QR ostáva skenovateľný aj na tmavom pozadí).
// ============================================================
import { DeedZnacka } from "@/components/DeedZnacka";
import { useState } from "react";
import { createPortal } from "react-dom";
import { RADIUS, SPACE } from "@/theme";
import { pressable } from "@/components/pressable";
import { IkonaKriz } from "@/components/icons";
import { DeedQr } from "@/components/deedqr";
import { ADRESA, DOMENA } from "@/lib/adresa";

const APP_SRC = "/brand/deed-appicon.svg";
// OPRAVY 347: QR loga sa kreslí z DeedQr s adresou appky (predtým obrázok s vercel.app) — podtitul = tá istá adresa
const QR_CIEL = DOMENA;

export function Znacka({ size = 40, force, style, text, logoQr }: {
  /** OPRAVY 91: nové QR logo deed-logo-qr (tmavý režim = inverzné), object-fit contain */
  logoQr?: boolean;
  /** KARTA 30: logo v hlavičke ako nápis DEED+ (<DeedZnacka />); klik stále otvorí QR */
  text?: boolean;
  size?: number;
  /** "qr" = QR vlajka (default všade) · "app" = App ikona (launcher-kontexty) */
  force?: "qr" | "app";
  style?: React.CSSProperties;
}) {
  const [full, setFull] = useState(false);
  const mode = force ?? "qr"; // vlastník: QR vlajka všade (desktop aj mobil)

  return (
    <>
      <span {...pressable(() => setFull(true), "Logo DEED+ — zobraziť QR kód na celú obrazovku")}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto", ...style }}>
        {logoQr ? (
          // OPRAVY 101/105: bez dlaždice a rámika, v oboch režimoch to isté PNG, dvojvrstvová žiara vo farbe štítu
          <span data-logo-qr="" aria-label="DEED+ · môj QR" style={{ display: "block", width: size, height: size, filter: "drop-shadow(0 0 4px var(--acc)) drop-shadow(0 0 14px var(--accLine))" }}><DeedQr data={ADRESA} priehladne size={size} /></span>
        )
        : text ? <span style={{ fontSize: Math.round(size * 0.62), fontWeight: 800, letterSpacing: "-.01em", color: "var(--a-green)", lineHeight: 1 }}><DeedZnacka /></span> : <>
        {/* D⁺ QR vlajka = biely štvorec → jemne zaoblené rohy */}
        {mode === "qr" ? <span aria-label="DEED+" style={{ display: "block", width: size, height: size, borderRadius: Math.round(size * 0.16), overflow: "hidden" }}><DeedQr data={ADRESA} size={size} /></span>
          : <img src={APP_SRC} alt="DEED+" draggable={false} style={{ width: size, height: size, display: "block" }} />}</>}
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
    <div role="dialog" aria-modal="true" aria-label="DEED+ QR kód" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: SPACE.lg, padding: SPACE.xl,
        background: "rgba(4,6,12,.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", animation: "fadeUp .2s ease" }}>
      <span {...pressable(onClose, "Zavrieť")}
        style={{ position: "absolute", top: "max(16px, env(safe-area-inset-top, 0px))", right: 16, width: 42, height: 42, borderRadius: RADIUS.round, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <IkonaKriz size={20} color="#fff" />
      </span>
      {/* biela karta → QR ostáva skenovateľný (zelené moduly na bielej) */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: RADIUS.xl, padding: SPACE.lg, boxShadow: "0 24px 70px rgba(0,0,0,.55)" }}>
        <span aria-label="DEED+ — naskenuj QR kód" style={{ display: "block" }}><DeedQr data={ADRESA} size={Math.min(360, Math.round(window.innerWidth * 0.72))} /></span>
      </div>
      <div style={{ color: "#fff", textAlign: "center", lineHeight: 1.5 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Naskenuj a otvor <DeedZnacka /></div>
        <div style={{ fontSize: 12.5, opacity: .7, marginTop: 2 }}>{QR_CIEL}</div>
      </div>
    </div>
  );
}

// nemenný fallback použitý ešte pred načítaním layoutu (aby TS videl export aj bez JSX importu inde)
export const ZNACKA_APP_SRC = APP_SRC;
