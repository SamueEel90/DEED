// ============================================================
// Martin (odpovede 13. 10.) — riadok autora pri príspevkoch Správy farnosti.
// Ukáže toho, kto príspevok naozaj pridal: meno a fotka z Ľudia (inak z účtu) + rola („správca stránky“, „kaplán“ …).
// Farár = len účet, ktorý je farárom aj na serveri (som_farar), meno s titulmi z Ľudia.
// Kto nemá vyplnený profil → undefined → na stránke logo a názov farnosti. Duchovný nikdy namiesto iného autora.
// ============================================================
import { citajNastavenie, maNastavenie, useZmenyNastaveni } from "./nastaveniaStranky";
import { usePouzivatel } from "./pouzivatel";
import { useSlovaFarnosti } from "./mojeFarnosti";
import { useSomFarar } from "./farnostPrispela";

export interface AutorF { meno: string; foto?: string; rola: string }

const malym = (r: string) => { const t = r.split(" / ")[0].trim(); return t.charAt(0).toLocaleLowerCase("sk-SK") + t.slice(1); };

/** autor za prihláseného človeka v tejto stránke (pri zverejnení sa uloží do príspevku) */
export function useAutorZaMna(strankaId: string): AutorF | undefined {
  useZmenyNastaveni();
  const ja = usePouzivatel();
  const SL = useSlovaFarnosti(strankaId);
  const somF = useSomFarar(strankaId);
  const meno = ja.celeMeno?.trim() ?? "";
  if (somF) {
    const d = (maNastavenie("duch") ? citajNastavenie("duch") : {}) as { tp?: string; meno?: string; tz?: string; foto?: string };
    const dm = [d.tp, d.meno, d.tz].map((x) => (x ?? "").trim()).filter(Boolean).join(" ") || meno;
    return dm ? { meno: dm, foto: d.foto || ja.foto || undefined, rola: malym(SL.titul) } : undefined;
  }
  if (!meno) return undefined;
  const L = (maNastavenie("ludia") ? citajNastavenie("ludia") : []) as { n?: string; r?: string; caka?: unknown; foto?: string }[];
  const c = L.find((x) => !x.caka && (x.n ?? "").trim() === meno);
  return { meno, foto: c?.foto || ja.foto || undefined, rola: malym(c?.r || "Správca stránky") };
}
