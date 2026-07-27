// ============================================================
// DEED · PROFILOVÁ FOTKA — jednotné UI pre VŠETKY profily
// (osobný · tvorca · charita · B2B · farnosť).
//  · FotoProfiluSheet — sheet „Profilová fotka": náhľad + nahratie zo
//    zariadenia (galéria/fotoaparát/drag&drop) + odstránenie.
//  · KamerkaBadge     — malý odznak fotoaparátu cez roh avataru; signál
//    „na fotku sa dá kliknúť a zmeniť ju".
// Fotka ide vždy cez FotoUpload → spracujFotku (re-enkód, EXIF/GPS preč,
// orez na štvorec) — nikde v appke sa surový súbor nepoužíva.
// ============================================================
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet } from "@/components/sheet";
import { FotoUpload } from "@/components/fotoupload";
import { IkonaFoto } from "@/components/icons";
import { AVATAR_SIRKA } from "@/lib/fotoprofilu";

export function FotoProfiluSheet({
  titul = "Profilová fotka",
  popis = "Zobrazuje sa pri tvojich skutkoch, v profile a na tvojom QR.",
  foto,
  nahrada,
  onZmena,
  onClose,
}: {
  titul?: string;
  popis?: string;
  /** aktuálna fotka (data-URL/URL) */
  foto?: string | null;
  /** čo ukázať bez fotky — iniciála, emoji, logo… */
  nahrada?: React.ReactNode;
  /** null = odstrániť fotku */
  onZmena: (dataUrl: string | null) => void;
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

      <FotoUpload value={foto ?? undefined} onZmena={(url) => onZmena(url)} pomer={1} vyska={190} maxSirka={AVATAR_SIRKA} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: SPACE.xs, fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: SPACE.sm }}>
        <IkonaFoto size={13} color={C.textTer} />
        <span>Fotka sa pred uložením prekóduje — <b>EXIF aj GPS súradnice</b> sa odstránia a obrázok sa oreže na štvorec.</span>
      </div>

      {foto && (
        <button onClick={() => onZmena(null)}
          style={{ width: "100%", height: 42, marginTop: SPACE.sm, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, background: "transparent", color: "var(--a-danger)", border: "1px solid rgba(242,112,111,.4)" }}>
          Odstrániť fotku
        </button>
      )}
    </Sheet>
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
