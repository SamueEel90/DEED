// ============================================================
// KARTA ZBIERKY — spoločný formulár pre centrálnu a sektorovú zbierku.
// Aby zbierka nebola suchý platobný modul, ale karta ako každá iná:
// fotka, názov a popis → zobrazí sa vo feedoch, dá sa zdieľať a má svoj QR.
// ============================================================
import { type CSSProperties, type ReactNode } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { spracujFotku } from "@/lib/obrazok";
import { MilnikBar } from "@/components/milnikbar";
import type { ProfilZbierky } from "./vlastneZbierky";

const ZELENA = "var(--a-green)";
export const vstup: CSSProperties = {
  width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`,
  borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 13.5, fontFamily: "inherit", outline: "none",
};

export function KartaZbierkyForm({ profil, zmen, logo, toast, deti, bar }: {
  profil: ProfilZbierky;
  zmen: (patch: Partial<ProfilZbierky>) => void;
  /** fallback obrázok, keď charita nedá vlastnú fotku (logo organizácie) */
  logo?: string;
  toast: (m: string) => void;
  /** doplnkové polia (napr. IBAN sektora) */
  deti?: ReactNode;
  /** míľnikový bar — karta je zároveň náhľadom, netreba ju ukazovať druhýkrát */
  bar?: ReactNode;
}) {
  const nahraj = async (files: FileList | null) => {
    const f = files?.[0]; if (!f) return;
    try { zmen({ foto: await spracujFotku(f, { pomer: 16 / 9, maxSirka: 1200 }) }); }
    catch (e) { toast((e as Error).message); }
  };

  return (
    <>
      {/* fotka */}
      <div style={{ position: "relative", borderRadius: RADIUS.md, overflow: "hidden", border: `1px solid ${C.line}`, background: C.surface2, aspectRatio: "16 / 9", marginBottom: SPACE.xs }}>
        {profil.foto || logo
          ? <img src={profil.foto || logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: profil.foto ? 1 : .55 }} />
          : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 34 }}>💛</div>}
        <div style={{ position: "absolute", right: SPACE.xs, bottom: SPACE.xs, display: "flex", gap: SPACE.xxs }}>
          {profil.foto && (
            <button type="button" onClick={() => zmen({ foto: undefined })}
              style={{ fontSize: 11.5, fontWeight: 800, cursor: "pointer", border: "none", fontFamily: "inherit", background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: RADIUS.pill, padding: `${SPACE.xxs}px ${SPACE.sm}px` }}>
              Odstrániť
            </button>
          )}
          <label style={{ fontSize: 11.5, fontWeight: 800, cursor: "pointer", background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: RADIUS.pill, padding: `${SPACE.xxs}px ${SPACE.sm}px` }}>
            {profil.foto ? "Zmeniť fotku" : "Pridať fotku"}
            <input type="file" accept="image/*" hidden onChange={(e) => void nahraj(e.target.files)} />
          </label>
        </div>
      </div>
      {!profil.foto && <div style={{ fontSize: 11, color: C.textTer, marginBottom: SPACE.xs }}>Bez fotky sa použije logo organizácie. Vlastná fotka z vašej práce chytí darcu viac.</div>}

      {/* názov + popis */}
      <input value={profil.nazov} onChange={(e) => zmen({ nazov: e.target.value })} maxLength={60}
        placeholder="Názov zbierky" style={{ ...vstup, fontWeight: 700, marginBottom: SPACE.xs }} />
      <textarea value={profil.popis} onChange={(e) => zmen({ popis: e.target.value })} maxLength={220} rows={3}
        placeholder="Na čo peniaze idú, keď darca nevyberá konkrétnu zbierku. Dve-tri vety."
        style={{ ...vstup, resize: "vertical" }} />
      <div style={{ fontSize: 10.5, color: C.textTer, textAlign: "right", marginTop: 2 }}>{profil.popis.length} / 220</div>

      {bar && <div style={{ marginTop: SPACE.sm }}>{bar}</div>}
      {deti}
    </>
  );
}

/** náhľad karty tak, ako ju uvidí darca vo feede */
export function NahladKarty({ profil, logo, vyzbierane, dolozene, ludia }: {
  profil: ProfilZbierky; logo?: string; vyzbierane: number; dolozene: number; ludia?: number;
}) {
  return (
    <div style={{ background: C.surface2, border: `1px solid ${tint(ZELENA, .25)}`, borderRadius: RADIUS.md, overflow: "hidden" }}>
      {(profil.foto || logo) && <img src={profil.foto || logo} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />}
      <div style={{ padding: SPACE.sm }}>
        <div style={{ fontSize: 14.5, fontWeight: 800 }}>{profil.nazov || "Bez názvu"}</div>
        {profil.popis && <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.45, margin: `2px 0 ${SPACE.sm}px` }}>{profil.popis}</div>}
        <MilnikBar vyzbierane={vyzbierane} dolozene={dolozene} ludia={ludia} />
      </div>
    </div>
  );
}
