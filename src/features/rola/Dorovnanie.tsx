// ============================================================
// DOROVNANIE DARU — pás „firma dorovnáva" pri zbierke (DorovnaniePas).
// KARTA 49: správa charity je v SpravaDorovnania.tsx, postup firmy len karta 11 (DorovnanieFirmy.tsx);
// staré DorovnanieSheet, NoveDorovnanieSheet a DEV formulár firmy sú zmazané.
// ============================================================
import { useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { FIRMY_ADRESAR } from "./mock";
import { rovnakaFirma } from "@/lib/firma";
import { Stit, naStitLevel } from "@/components/stit";
import { vycerpane, zostatok, popisPomeru, platiPreMna, type Dorovnanie } from "@/lib/dorovnanie";

const ZLATA = "var(--a-gold)";
const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const datum = (ms: number) => new Date(ms).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });

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
