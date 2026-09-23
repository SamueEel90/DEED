// ============================================================
// MÍĽNIKOVÝ BAR — progres pre zbierky BEZ cieľovej sumy (centrálna, sektorová).
// Bar beží od míľnika k míľniku (3 000 · 6 000 · 9 000 …), nie k cieľu.
// Značka míľnika: ✓ zelená = tranža doložená · oranžová = čaká na doklady.
// Darca z toho číta „ukázali, na čo minuli prvé 3 000 — pridám na ďalšie".
// ============================================================
import { C, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { milniky, dolozeneMilniky, VLASTNA_ZBIERKA_CFG } from "@/features/rola/vlastneZbierky";

const ZELENA = "var(--a-green)";
const ORANZ = "var(--a-warn, #E0913A)";
const eur = (n: number) => `${Math.round(n).toLocaleString("sk")} €`;

export function MilnikBar({ vyzbierane, dolozene, ludia, krok = VLASTNA_ZBIERKA_CFG.milnik, mini = false, dobrovolne = false }: {
  vyzbierane: number;
  /** koľko € z vyzbieraného je doložených dokladmi */
  dolozene: number;
  ludia?: number;
  krok?: number;
  mini?: boolean;
  /** centrálna zbierka: dokladovanie je dobrovoľné → žiadna oranžová výčitka, len zelený bonus */
  dobrovolne?: boolean;
}) {
  const m = milniky(vyzbierane, krok);
  const dolozenych = dolozeneMilniky(dolozene, krok);
  const cakaTranza = !dobrovolne && m.dosiahnute.length > dolozenych;

  return (
    <div>
      {!mini && (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: SPACE.xs }}>
          <div>
            <span style={{ fontSize: 24, fontWeight: 800 }}>{eur(vyzbierane)}</span>
            <span style={{ fontSize: 12.5, color: C.textTer }}> vyzbierané</span>
          </div>
          <span style={{ fontSize: 11.5, color: C.textTer }}>ďalší míľnik {eur(m.dalsi)}</span>
        </div>
      )}

      {/* bar aktuálneho úseku */}
      <div style={{ height: mini ? 7 : 10, background: "rgba(var(--glass-rgb),.1)", borderRadius: RADIUS.pill, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${m.pct}%`, background: ZELENA, borderRadius: RADIUS.pill, transition: "width .6s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.textTer, marginTop: 3 }}>
        <span>{eur(m.od)}</span><span>{eur(m.dalsi)}</span>
      </div>

      {/* značky míľnikov */}
      {m.dosiahnute.length > 0 && !(dobrovolne && dolozenych === 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xxs, marginTop: SPACE.xs }}>
          {(dobrovolne ? m.dosiahnute.slice(0, dolozenych) : m.dosiahnute).map((v, i) => {
            const ok = dobrovolne || i < dolozenych;
            const f = ok ? ZELENA : ORANZ;
            return (
              <span key={v} title={ok ? "doložené" : "čaká na doklady"}
                style={{ fontSize: 10.5, fontWeight: 800, color: f, background: tint(f, .12), border: `1px solid ${tint(f, .35)}`, borderRadius: RADIUS.pill, padding: `2px ${SPACE.xs}px` }}>
                {ok ? "✓" : "⏳"} {eur(v)}
              </span>
            );
          })}
        </div>
      )}

      {!mini && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginTop: SPACE.xs }}>
          <span style={{ color: cakaTranza ? ORANZ : dolozenych > 0 ? ZELENA : C.textSec, fontWeight: cakaTranza || dolozenych > 0 ? 700 : 400 }}>
            {dobrovolne
              ? (dolozenych > 0 ? `✓ Dobrovoľne doložené ${eur(dolozenych * krok)}` : "Dokladovanie je tu dobrovoľné")
              : m.dosiahnute.length === 0 ? "Prvé doklady pri " + eur(krok)
              : cakaTranza ? `Čaká na doklady k ${eur(m.dosiahnute.length * krok)}`
              : `Doložené ${eur(dolozenych * krok)}`}
          </span>
          {ludia != null && <span style={{ color: C.textTer }}>👥 {ludia}</span>}
        </div>
      )}
    </div>
  );
}
