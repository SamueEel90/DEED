// ============================================================
// DOROVNANIE DARU — pás „firma dorovnáva" pri zbierke (DorovnaniePas).
// KARTA 49: správa charity je v SpravaDorovnania.tsx, postup firmy len karta 11 (DorovnanieFirmy.tsx);
// staré DorovnanieSheet, NoveDorovnanieSheet a DEV formulár firmy sú zmazané.
// ============================================================
import { DeedZnacka } from "@/components/DeedZnacka";
import { Emo } from "@/components/icons";
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { FIRMY_ADRESAR } from "./mock";
import { pripniVyclenene } from "@/lib/podpory";
import { rovnakaFirma } from "@/lib/firma";
import { nacitajSegmenty } from "./segmenty";
import { CENTRALNA_ID, nacitajProfil } from "./vlastneZbierky";
import { PlatbaModal } from "@/components/platba";
import { Stit, naStitLevel } from "@/components/stit";
import {
  DOROVNANIE_CFG, useDorovnania, zapecat, potvrdPlatbu, odmietni, ukonci, pozastav, vysporiadaj,
  vycerpane, zostatok, popisPomeru, nazovPomeru, priklad, bezi, daSaZmazat, zmazDorovnanie,
  useDorovnaniaFirmy, beziaceDorovnanie, casAutomatu, platiPreMna, type Dorovnanie, type KanalDorovnania,
} from "@/lib/dorovnanie";

const ZLATA = "var(--a-gold)";
const ZELENA = "var(--a-green)";
const DEN = 86400000;
const karta: CSSProperties = { background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs };
const vstup: CSSProperties = { width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
const btnHlavny: CSSProperties = { width: "100%", height: 48, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 15, background: ZELENA, color: "#06281d" };
const btnDruhy: CSSProperties = { width: "100%", height: 44, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, background: "transparent", color: C.textSec };
const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const datum = (ms: number) => new Date(ms).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
const naDatum = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const zDatumu = (s: string, zaloha: number) => (s ? new Date(`${s}T00:00:00`).getTime() : zaloha);

/**
 * Bežec pri zbierke — kto dorovnáva. Tvar je zámerne ten istý ako karta
 * „ŽIADATEĽ": logo vľavo, štít a „Profil" vpravo, čísla až po rozkliknutí.
 * Firma platí zo všetkých najviac, tak nech je aj vidieť ako partner,
 * nie ako mikro-riadok v platobnom module.
 */
export function DorovnaniePas({ d, onFirma }: { d: Dorovnanie; onFirma?: () => void }) {
  const [otvorene, setOtvorene] = useState(false);
  const zost = zostatok(d);
  const minute = zost <= 0;
  // štít firmy je v adresári (v produkcii príde s profilom firmy)
  const zaznam = FIRMY_ADRESAR.find((f) => rovnakaFirma(f.nazov, d.firma));
  const logo = d.firmaLogo ?? zaznam?.logo;
  const ram = tint(ZLATA, minute ? .25 : .45);

  return (
    <div style={{ background: tint(ZLATA, minute ? .07 : .13), border: `1px solid ${otvorene ? tint(ZLATA, .7) : ram}`,
      borderRadius: RADIUS.sm, marginBottom: SPACE.xxs }}>
      <div {...pressable(() => setOtvorene((o) => !o), `Dorovnáva ${d.firma}`)}
        style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: SPACE.sm, cursor: "pointer" }}>
        {logo
          ? <img src={logo} alt="" style={{ width: 40, height: 40, borderRadius: RADIUS.xs, objectFit: "cover", flex: "none" }} />
          : <span style={{ flex: "none", width: 40, height: 40, borderRadius: RADIUS.xs, background: tint(ZLATA, .25),
              display: "grid", placeItems: "center", fontSize: 18 }}>🤝</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", color: C.textTer }}>
            {minute ? "DOROVNÁVALA" : "DOROVNÁVA"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.firma}</div>
          <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 1 }}>
            {minute ? `spolu pridala ${eur(vycerpane(d))}`
              : !platiPreMna(d) ? "dorovnáva dary svojich zamestnancov"
              : <>k tvojmu daru pridá <b style={{ color: ZLATA }}>{popisPomeru(d.pomer)}</b></>}
          </div>
        </div>
        {zaznam && <Stit level={naStitLevel(zaznam.stit)} size={30} />}
        <span style={{ flex: "none", fontSize: 12, fontWeight: 700, color: "var(--a-info)" }}>{otvorene ? "Zavrieť" : "Profil"}</span>
      </div>

      {otvorene && (
        <div style={{ borderTop: `1px solid ${ram}`, padding: SPACE.sm, fontSize: 12.5, color: C.textSec, lineHeight: 1.7 }}>
          {zaznam && <div>{zaznam.odvetvie} · {zaznam.mesto}</div>}
          {!minute && (<>
            <div>vyčlenila <b style={{ color: C.text }}>{eur(d.strop)}</b>, ostáva <b style={{ color: C.text }}>{eur(zost)}</b></div>
            <div>{d.doVycerpania ? "Darca prispieva, dokiaľ sa neminie celková suma" : `Darca prispieva do ${datum(d.do)}`}</div>
          </>)}
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>
            Je to dar firmy, nie sponzoring — peniaze sú na účte charity k čerpaniu.
          </div>
          {onFirma && (
            <div {...pressable(onFirma, `Stránka ${d.firma}`)}
              style={{ marginTop: SPACE.xs, fontSize: 12.5, fontWeight: 800, color: "var(--a-info)", cursor: "pointer" }}>
              Otvoriť stránku firmy ›
            </div>
          )}
        </div>
      )}
    </div>
  );
}
