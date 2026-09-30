// KARTA 30 · Značka DEED+ (variant 2b). Plus je nakreslený dvoma pásikmi: veľkosť .34em, hrúbka .095em,
// medzera .07em, vrch plusu = vrch D (cap height Plus Jakarta Sans ≈ .70em). Dedí farbu a veľkosť písma,
// nemení výšku riadku. Tri tvary: DEEDGOOD (právne texty) · DEED+ (appka) · DeeD (token). Nikde samotné „DEED".
import { Fragment, type ReactNode } from "react";

export function DeedZnacka({ plus = true }: { plus?: boolean }) {
  return (
    <span aria-label={plus ? "DEED plus" : "DEED"} style={{ whiteSpace: "nowrap" }}>
      <span aria-hidden="true">DEED</span>
      {plus && <span aria-hidden="true" style={{
        display: "inline-block", width: ".34em", height: ".34em", marginLeft: ".07em",
        transform: "translateY(-.36em)",
        background: "linear-gradient(currentColor,currentColor) center/100% .095em no-repeat, linear-gradient(currentColor,currentColor) center/.095em 100% no-repeat",
      }} />}
    </span>
  );
}

/** text s „DEED+" → „DEED+" sa vykreslí ako <DeedZnacka /> (pre vety z konštánt: FAQ, úvod, hlásenia v appke) */
export function sZnackou(t: string): ReactNode {
  if (!t.includes("DEED+")) return t;
  const casti = t.split("DEED+");
  return casti.map((c, i) => <Fragment key={i}>{c}{i < casti.length - 1 && <DeedZnacka />}</Fragment>);
}
