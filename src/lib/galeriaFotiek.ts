// BLOK B 232 · fotky, ktoré už sú nahraté: farnosť (Správa) vyberá z galérie farnosti, veriaci zo svojich fotiek.
// Zdroj = to, čo farnosť alebo veriaci už nahrali (profil, príspevky, zbierky, brigády, stretnutia, skutky).
// Nič sa nekopíruje ani nenahráva znova, vybraná fotka ide ďalej do GaleriaEditor ako každá iná.
import { profilZPamate } from "./profilStranky";
import { centralnaZPamate } from "./centralnaZbierka";
import { zbierkyStrankyZPamate } from "./novaZbierka";
import { brigady } from "./brigady";
import { stretnutia } from "./detiMladez";
import { odFarnikov } from "./odFarnikov";
import { mojeSkutky, skutkyOrg } from "./mojeSkutky";
import { vlastnePrispevkyVsetky } from "@/features/viera/mock";

/** fotka, ktorá sa dá znova ukázať: nie video, nie dočasná adresa z minulej relácie */
const jeFotka = (s: unknown): s is string =>
  typeof s === "string" && s.length > 0 && !s.startsWith("blob:") && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(s) && !s.startsWith("data:video") && !s.startsWith("data:application");

const bezDuplicit = (l: unknown[]): string[] => { const v: string[] = []; const m = new Set<string>(); for (const s of l) if (jeFotka(s) && !m.has(s)) { m.add(s); v.push(s); } return v; };
const fotkyMedii = (m?: { typ: string; src: string }[]) => (m ?? []).filter((x) => x.typ === "foto").map((x) => x.src);

/** galéria farnosti: titulná fotka profilu, príspevky Správy, hlavná a ďalšie zbierky, brigády, stretnutia, skutky stránky */
export function fotkyFarnosti(stranka: string): string[] {
  const p = profilZPamate(stranka);
  return bezDuplicit([
    p.ulozeny?.cover?.src, p.koncept?.cover?.src,
    ...vlastnePrispevkyVsetky(stranka).flatMap((x) => x.fotky ?? []),
    ...fotkyMedii(centralnaZPamate(stranka)?.media),
    ...zbierkyStrankyZPamate(stranka).flatMap((z) => fotkyMedii(z.media)),
    ...brigady(stranka).map((b) => b.foto),
    ...stretnutia(stranka).flatMap((s) => s.fotky ?? []),
    ...skutkyOrg(stranka).flatMap((s) => s.fotky ?? []),
  ]);
}

/** moje fotky (veriaci): čo som pridal na stránku farnosti a fotky mojich skutkov */
export function mojeFotky(stranka: string, kto: string): string[] {
  return bezDuplicit([
    ...odFarnikov(stranka).filter((x) => x.autor === kto).flatMap((x) => x.fotky ?? []),
    ...mojeSkutky().flatMap((s) => s.fotky ?? []),
  ]);
}
