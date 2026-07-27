// ============================================================
// DEED · FOTKY PROFILU — jednotné UI pre VŠETKY profily
// (osobný · tvorca · charita · B2B · farnosť · cudzia org/osoba).
//  · FotoProfiluSheet — sheet s dvoma nezávislými sekciami:
//    PROFILOVÁ (štvorec 1:1) a TITULNÁ/cover (16:9). Sekcia sa zobrazí
//    len ak volajúci dodá príslušný `onZmena`/`onCover`.
//  · KamerkaBadge  — odznak fotoaparátu cez roh avataru (klik = zmeniť).
//  · ZmenitPill    — sklenená pilulka „Zmeniť titulnú" do rohu cover fotky.
// Fotka ide vždy cez FotoUpload → spracujFotku (re-enkód, EXIF/GPS preč,
// orez na pomer) — nikde v appke sa surový súbor nepoužíva.
// ============================================================
import type { ReactNode } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet } from "@/components/sheet";
import { FotoUpload } from "@/components/fotoupload";
import { IkonaFoto } from "@/components/icons";
import { pressable } from "@/components/pressable";
import { AVATAR_SIRKA } from "@/lib/fotoprofilu";

export function FotoProfiluSheet({
  titul = "Profilová fotka",
  popis = "Zobrazuje sa pri tvojich skutkoch, v profile a na tvojom QR.",
  foto,
  nahrada,
  onZmena,
  cover,
  onCover,
  coverPopis = "Široká fotka na pozadí hlavičky profilu.",
  onClose,
}: {
  titul?: string;
  popis?: string;
  /** aktuálna profilová fotka (data-URL/URL); vynechaj `onZmena` a sekcia sa nezobrazí */
  foto?: string | null;
  /** čo ukázať bez fotky — iniciála, emoji, logo… */
  nahrada?: ReactNode;
  /** null = odstrániť fotku */
  onZmena?: (dataUrl: string | null) => void;
  /** aktuálna titulná (cover) fotka — sekcia sa zobrazí len s `onCover` */
  cover?: string | null;
  onCover?: (dataUrl: string | null) => void;
  coverPopis?: string;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose} label={titul}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.gutter, marginBottom: SPACE.md }}>
        <span style={{ width: 66, height: 66, flex: "none", borderRadius: RADIUS.round, overflow: "hidden", background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: C.textSec }}>
          {foto ? <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : nahrada}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{titul}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45 }}>{popis}</div>
        </div>
      </div>

      {onZmena && (
        <>
          <PoleNadpis>PROFILOVÁ FOTKA (štvorec)</PoleNadpis>
          <FotoUpload value={foto ?? undefined} onZmena={(url) => onZmena(url)} pomer={1} vyska={180} maxSirka={AVATAR_SIRKA} />
          {foto && <OdstranitBtn label="Odstrániť profilovú fotku" onClick={() => onZmena(null)} />}
        </>
      )}

      {onCover && (
        <>
          <PoleNadpis style={{ marginTop: onZmena ? SPACE.md : 0 }}>TITULNÁ FOTKA (16:9)</PoleNadpis>
          <FotoUpload value={cover ?? undefined} onZmena={(url) => onCover(url)} pomer={16 / 9} vyska={140} />
          <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xxs, lineHeight: 1.45 }}>{coverPopis}</div>
          {cover && <OdstranitBtn label="Odstrániť titulnú fotku" onClick={() => onCover(null)} />}
        </>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: SPACE.xs, fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: SPACE.md }}>
        <IkonaFoto size={13} color={C.textTer} />
        <span>Fotka sa pred uložením prekóduje — <b>EXIF aj GPS súradnice</b> sa odstránia a obrázok sa oreže na správny pomer.</span>
      </div>
    </Sheet>
  );
}

function PoleNadpis({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 10.5, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", marginBottom: SPACE.xs, ...style }}>{children}</div>;
}

function OdstranitBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", height: 40, marginTop: SPACE.xs, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, background: "transparent", color: "var(--a-danger)", border: "1px solid rgba(242,112,111,.4)" }}>
      {label}
    </button>
  );
}

/** odznak fotoaparátu cez dolný roh avataru — rodič musí byť position:relative.
 *  `strana="vlavo"` uhne odznaku úrovne (L7), ktorý sedí vpravo dole. */
export function KamerkaBadge({ size = 24, strana = "vpravo" }: { size?: number; strana?: "vlavo" | "vpravo" }) {
  return (
    <span aria-hidden style={{
      position: "absolute", [strana === "vlavo" ? "left" : "right"]: -2, bottom: -2, width: size, height: size, borderRadius: RADIUS.round,
      display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
      background: C.surface2, border: `1.5px solid var(--c-bg)`, color: C.textSec, boxShadow: "0 2px 8px rgba(0,0,0,.28)",
    }}>
      <IkonaFoto size={Math.round(size * 0.55)} color={C.textSec} />
    </span>
  );
}

/** sklenená pilulka do rohu cover fotky („Zmeniť titulnú") — vzor z profilu farnosti */
export function ZmenitPill({ label = "Zmeniť titulnú", onClick, style }: { label?: string; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <span {...pressable(onClick, label)}
      style={{
        position: "absolute", bottom: 8, right: 8, display: "inline-flex", alignItems: "center", gap: SPACE.xxs,
        fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(8,11,18,.6)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.18)",
        padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, cursor: "pointer", zIndex: 2, ...style,
      }}>
      <IkonaFoto size={12} color="#fff" /> {label}
    </span>
  );
}
