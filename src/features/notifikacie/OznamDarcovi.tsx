// ============================================================
// OZNAM DARCOVI — čo darca uvidí po kliknutí na oznámenie:
// charita doložila použitie zbierky (+ opätovné poďakovanie) alebo
// priebežná správa počas zbierky. Rovnaký pohľad slúži ako náhľad v správe.
// ============================================================
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet } from "@/components/sheet";
import { tint } from "@/lib/ui";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useDarcovia, sucetDarov } from "@/lib/darcovia";
import { najdiZbierku, dokazZoStavu, ZBIERKY } from "@/lib/zbierky";
import { nacitajStav, percentoDolozenia, type StavZbierky } from "@/lib/zbierkaSprava";
import { DokazBlok } from "@/features/rola/DokazBlok";

const ZELENA = "var(--a-green)";

export function OznamDarcoviSheet({ zbierkaId, typ, text, nahladStav, onClose }: {
  zbierkaId: string; typ: "dolozene" | "sprava"; text?: string;
  /** náhľad zo správy — ešte nezverejnený stav */
  nahladStav?: StavZbierky; onClose: () => void;
}) {
  const ja = usePouzivatel();
  const moje = useDarcovia(zbierkaId).filter((r) => r.moj);
  const z = najdiZbierku(zbierkaId) ?? ZBIERKY.find((x) => x.id === zbierkaId);
  if (!z) return null;

  const st = nahladStav ?? nacitajStav(zbierkaId);
  const dokaz = st ? dokazZoStavu(st) : z.dokaz;
  const vyz = st?.simVyzbierane ?? z.vyzbierane + sucetDarov(zbierkaId).suma;
  const pct = st ? percentoDolozenia(st, vyz) : 100;
  const menom = ja.typ !== "pasivny" && ja.typ !== "charita" && ja.meno ? ja.meno : null;
  const mojaSuma = moje.reduce((a, r) => a + r.suma, 0);
  const org = z.ziadatel.meno;

  return (
    <Sheet onClose={onClose} label={typ === "dolozene" ? "Doložené použitie zbierky" : "Novinka zo zbierky"}>
      {nahladStav && (
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, textAlign: "center", border: `1px dashed ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.xxs, marginBottom: SPACE.sm }}>
          NÁHĽAD — TAKTO TO UVIDÍ DARCA
        </div>
      )}

      {/* od koho */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
        <img src={z.ziadatel.foto} alt={org} style={{ width: 38, height: 38, borderRadius: RADIUS.sm, objectFit: "cover", flex: "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{org}</div>
          <div style={{ fontSize: 11.5, color: C.textTer }}>{z.nazov}</div>
        </div>
      </div>

      {typ === "dolozene" ? (
        <>
          <div style={{ textAlign: "center", padding: `${SPACE.sm}px 0 ${SPACE.md}px` }}>
            <div style={{ fontSize: 34, lineHeight: 1 }}>💚</div>
            <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.25, marginTop: SPACE.xs }}>
              Ďakujeme{menom ? `, ${menom},` : ""} za tvoj dar!
            </div>
            <div style={{ fontSize: 13.5, color: C.textSec, lineHeight: 1.5, marginTop: SPACE.xs }}>
              Tvoj dar{mojaSuma > 0 ? ` ${mojaSuma.toLocaleString("sk")} €` : ""} pomohol. {org} doložila, na čo išli peniaze zo zbierky.
            </div>
            <span style={{ display: "inline-block", marginTop: SPACE.sm, fontSize: 13, fontWeight: 800, color: ZELENA, background: tint(ZELENA, .12), border: `1px solid ${tint(ZELENA, .35)}`, borderRadius: RADIUS.pill, padding: `${SPACE.xxs}px ${SPACE.sm}px` }}>
              ✓ Doložené {pct} % použitia
            </span>
          </div>
          {dokaz && <DokazBlok dokaz={dokaz} vyzbierane={vyz} odberatel={org} />}
        </>
      ) : (
        <div style={{ padding: `${SPACE.xs}px 0 ${SPACE.md}px` }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: SPACE.sm }}>Novinka zo zbierky</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.55, background: tint(ZELENA, .07), borderLeft: `3px solid ${ZELENA}`, borderRadius: RADIUS.xs, padding: SPACE.sm }}>{text}</div>
          <div style={{ fontSize: 13, color: C.textSec, marginTop: SPACE.sm }}>Ďakujeme{menom ? `, ${menom},` : ""} že pomáhaš.</div>
        </div>
      )}

      <button onClick={onClose} style={{ width: "100%", height: 46, marginTop: SPACE.sm, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: ZELENA, color: "#06281d" }}>
        Zavrieť
      </button>
    </Sheet>
  );
}
