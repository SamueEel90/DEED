// ============================================================
// PO DARE — čo darca uvidí v sekunde, keď platba prejde.
//
// Zámerne to NIE JE oslava darcu: žiadne konfety, žiadne výkričníky,
// žiadne „Ďakujeme!!!". Kontext je zbierka pre človeka v núdzi, nie tombola.
// Namiesto toho je to DÔKAZ — číslo, ktoré ticho narastie, a jedna veta,
// ktorá je vždy pravdivá a vždy iná.
//
// Rytmus (~4 s) — zámerne pomalý. Každý krok má dostať svoju chvíľu,
// inak oko visí na čísle a zvyšok preletí bez povšimnutia:
//   0,0 s  dar tak, ako ho darca zadal
//   0,8 s  sprava priletí diel firmy, číslo sa pomaly prepočíta na súčet
//   2,3 s  ukazovateľ sa pohne o tvoj dar
//   3,0 s  ukazovateľ sa pohne druhý raz — o diel firmy
//   3,9 s  až teraz, do ticha, príde veta
// Potom to stojí a čaká. Zavrie sa ťuknutím, samo až po 14 s — človek si
// to má stihnúť prečítať, nie loviť očami mizneúci text.
//
// Posledný riadok je jediné miesto, kde si dovolíme emóciu, a vyberá sa
// podľa toho, čo je na tomto dare naozaj výnimočné (§ vetaDna nižšie).
// ============================================================
import { useEffect, useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";

const ZLATA = "var(--a-gold)";
const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;

export interface PoDareData {
  /** dar darcu */
  suma: number;
  /** koľko pridala firma (0 = nikto nedorovnával) */
  dorovnane?: number;
  firma?: string;
  /** cieľ zbierky a jej stav PRED týmto darom — bez nich sa ukazovateľ nekreslí */
  ciel?: number;
  predtym?: number;
  /** darca je zamestnancom dorovnávajúcej firmy (iná veta na konci) */
  zamestnanec?: boolean;
  /** tento dar je zatiaľ najväčší na zbierke */
  najvacsi?: boolean;
  /** pred ním nedal nikto */
  prvy?: boolean;
  /** mena, ak to nie sú eurá */
  mena?: string;
}

/** Jedna veta na koniec. Berie sa PRVÁ, ktorá je pravdivá — od najvzácnejšej.
 *  Nič sa nevymýšľa: každá vyplýva z čísel, ktoré v tej chvíli platia. */
function vetaDna(d: PoDareData, spolu: number): string {
  const ciel = d.ciel ?? 0;
  const pred = d.predtym ?? 0;
  const po = pred + spolu;
  const chyba = Math.max(0, ciel - po);
  const preslo = (hranica: number) => ciel > 0 && pred < ciel * hranica && po >= ciel * hranica;

  if (ciel > 0 && po >= ciel) return "Zbierka je plná. Dotiahol si ju ty.";
  if (ciel > 0 && chyba <= 50) return `Do konca chýba ${eur(chyba)}. Skoro.`;
  if (preslo(0.75)) return "Prekročili ste tri štvrtiny.";
  if (preslo(0.5)) return "Práve ste prešli polovicu.";
  if (preslo(0.25)) return "Prvá štvrtina je za vami.";
  if (d.prvy) return "Si prvý. Niekto musí začať.";
  if (d.najvacsi) return "Zatiaľ najväčší dar tejto zbierky.";
  if (d.zamestnanec && d.firma) return `Dal si to ako človek z ${d.firma}.`;
  if (chyba > 0) return `Do cieľa chýba ${eur(chyba)}.`;
  return "Je to na účte charity, k čerpaniu.";
}

const riadok: CSSProperties = { textAlign: "center", lineHeight: 1.5 };

export function PoDare({ d, onClose }: { d: PoDareData; onClose: () => void }) {
  const dorovnane = d.dorovnane ?? 0;
  const spolu = d.suma + dorovnane;
  // 0 dar · 1 priletel diel firmy · 2 prvý skok ukazovateľa · 3 druhý skok · 4 veta
  const [faza, setFaza] = useState(0);
  const [cislo, setCislo] = useState(d.suma);

  // Bez dorovnania niet čo dopočítavať, tak sa celé zrýchli — inak by darca
  // pozeral do statického čísla a čakal, kým sa niečo stane.
  useEffect(() => {
    const kroky: Array<[number, number]> = dorovnane > 0
      ? [[1, 800], [2, 2300], [3, 3000], [4, 3900]]
      : [[1, 250], [2, 700], [3, 700], [4, 1500]];
    const casovace = kroky.map(([f, ms]) => setTimeout(() => setFaza(f), ms));
    casovace.push(setTimeout(onClose, 14000));   // samo až keď je jasné, že darca odišiel
    return () => casovace.forEach(clearTimeout);
  }, [dorovnane, onClose]);

  // číslo narastie z daru na súčet — plynulo, nie prepnutím.
  // Závisí zámerne na `rastie`, nie na `faza`: pri každej ďalšej fáze by sa
  // inak počítanie spustilo odznova a číslo by skákalo dole.
  const rastie = faza >= 1;
  useEffect(() => {
    if (!rastie || dorovnane <= 0) return;
    const zac = performance.now();
    const trvanie = 1250;
    let bezi = true;
    const krok = (t: number) => {
      const p = Math.min(1, (t - zac) / trvanie);
      const e = 1 - Math.pow(1 - p, 3);        // spomalí na konci
      setCislo(d.suma + dorovnane * e);
      if (p < 1 && bezi) requestAnimationFrame(krok);
    };
    requestAnimationFrame(krok);
    return () => { bezi = false; };
  }, [rastie, d.suma, dorovnane]);

  const ciel = d.ciel ?? 0;
  const pred = d.predtym ?? 0;
  const pct = (v: number) => (ciel > 0 ? Math.min(100, (v / ciel) * 100) : 0);
  // ukazovateľ sa dotiahne v dvoch krokoch: najprv tvoj dar, potom diel firmy
  const sirka = faza < 2 ? pct(pred) : faza === 2 ? pct(pred + d.suma) : pct(pred + spolu);
  const jednotka = d.mena ?? "€";

  return (
    <div onClick={onClose} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter") onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: SPACE.lg, cursor: "pointer",
        background: "rgba(4,6,12,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        animation: "fadeUp .22s ease" }}>

      <div style={{ ...riadok, fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: C.textTer }}>
        TVOJ DAR {eur(d.suma)}
      </div>

      {/* súčet — jediné veľké číslo na obrazovke */}
      <div style={{ ...riadok, marginTop: SPACE.xs, fontSize: 54, fontWeight: 800, letterSpacing: "-.02em",
        color: dorovnane > 0 ? "transparent" : "#fff",
        ...(dorovnane > 0 ? {
          backgroundImage: `linear-gradient(100deg, #fff 0%, #fff 34%, ${ZLATA} 50%, #fff 66%, #fff 100%)`,
          backgroundSize: "260% 100%",
          WebkitBackgroundClip: "text", backgroundClip: "text",
          animation: faza >= 1 ? "darLesk 2.4s ease-out .15s 1 both" : undefined,
        } : {}) }}>
        {dorovnane > 0 ? Math.round(cislo).toLocaleString("sk-SK") : d.suma.toLocaleString("sk-SK", { maximumFractionDigits: 2 })}
        <span style={{ fontSize: 22, fontWeight: 700, marginLeft: 4 }}>{jednotka}</span>
      </div>

      {dorovnane > 0 && d.firma && (
        <div style={{ ...riadok, marginTop: 2, fontSize: 13.5, fontWeight: 700, color: ZLATA,
          opacity: faza >= 1 ? 1 : 0,
          animation: faza >= 1 ? "darPrilet .7s ease both" : undefined }}>
          🤝 {d.firma} pridala {eur(dorovnane)}
        </div>
      )}

      <div style={{ ...riadok, marginTop: SPACE.xs, fontSize: 12.5, color: C.textSec }}>
        odchádza príjemcovi
      </div>

      {/* ukazovateľ zbierky — dva skoky, aby bolo vidieť, že sa pohla dvakrát */}
      {ciel > 0 && (
        <div style={{ width: "100%", maxWidth: 300, marginTop: SPACE.lg }}>
          <div style={{ height: 6, background: "rgba(255,255,255,.14)", borderRadius: RADIUS.pill, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${sirka}%`, borderRadius: RADIUS.pill,
              background: faza >= 3 && dorovnane > 0 ? `linear-gradient(90deg, var(--a-green), ${ZLATA})` : "var(--a-green)",
              transition: "width .8s cubic-bezier(.2,.7,.3,1), background .6s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: SPACE.xs, fontSize: 11.5, color: C.textTer }}>
            <span>{Math.round(pred + (faza < 2 ? 0 : faza === 2 ? d.suma : spolu)).toLocaleString("sk-SK")} €</span>
            <span>z {ciel.toLocaleString("sk-SK")} €</span>
          </div>
        </div>
      )}

      <div style={{ ...riadok, marginTop: SPACE.lg, fontSize: 17, fontWeight: 800, color: "#fff",
        maxWidth: 320, minHeight: 46,
        opacity: faza >= 4 ? 1 : 0, transform: faza >= 4 ? "none" : "translateY(6px)",
        transition: "opacity .9s ease, transform .9s cubic-bezier(.2,.7,.3,1)" }}>
        {vetaDna(d, spolu)}
      </div>

      <div style={{ ...riadok, marginTop: SPACE.md, fontSize: 11, color: C.textTer,
        opacity: faza >= 4 ? 1 : 0, transition: "opacity .8s ease" }}>
        ťukni kdekoľvek
      </div>
    </div>
  );
}
