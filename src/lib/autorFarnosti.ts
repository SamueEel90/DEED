// ============================================================
// Martin (odpovede 13. 10.) — riadok autora pri príspevkoch Správy farnosti.
// OPRAVY 276: autor = osoba z Ľudí priradená k účtu, ktorý píše (duchovný s titulmi a fotkou, kaplán, kostolník …).
// Duchovný = účet farára v Ľuďoch („Som farár“) alebo farár podľa servera (som_farar).
// Kto nemá vyplnený profil → undefined → na stránke logo a názov farnosti. Duchovný nikdy namiesto iného autora.
// ============================================================
import { citajNastavenie, maNastavenie, useZmenyNastaveni } from "./nastaveniaStranky";
import { usePouzivatel } from "./pouzivatel";
import { useSlovaFarnosti } from "./mojeFarnosti";
import { useSomFarar } from "./farnostPrispela";

export interface AutorF { meno: string; foto?: string; rola: string; /** OPRAVY 276: účet, ktorý písal */ ucet?: string }

const malym = (r: string) => { const t = r.split(" / ")[0].trim(); return t.charAt(0).toLocaleLowerCase("sk-SK") + t.slice(1); };
type Duch = { tp?: string; meno?: string; tz?: string; foto?: string; som?: 0 | 1; ucet?: string };
type Clovek = { n?: string; r?: string; caka?: unknown; foto?: string };
const duch = () => (maNastavenie("duch") ? citajNastavenie("duch") : {}) as Duch;
const ludia = () => (maNastavenie("ludia") ? citajNastavenie("ludia") : []) as Clovek[];
const menoDucha = (d: Duch) => [d.tp, d.meno, d.tz].map((x) => (x ?? "").trim()).filter(Boolean).join(" ");
/** účet je duchovný z Ľudí („Som farár“ a účet farára je tento, alebo farár podľa servera) */
const jeDuch = (d: Duch, ucet: string | null | undefined, somF: boolean) => somF || (d.som === 0 && (!d.ucet || (!!ucet && d.ucet === ucet)));

/** OPRAVY 276: autor zo Správy = osoba z Ľudí priradená k účtu, ktorý píše (duchovný s titulmi a fotkou, inak človek zo zoznamu Ľudí).
 *  Keď účet osobu v Ľuďoch nemá → undefined → na stránke meno a logo farnosti. Nikdy meno účtu ani „správca stránky“. */
export function useAutorZaMna(strankaId: string): AutorF | undefined {
  useZmenyNastaveni();
  const ja = usePouzivatel();
  const SL = useSlovaFarnosti(strankaId);
  const somF = useSomFarar(strankaId);
  const meno = ja.celeMeno?.trim() ?? "";
  const d = duch(), ucet = ja.ucetId ?? undefined;
  if (jeDuch(d, ucet, somF)) {
    const dm = menoDucha(d);
    return dm ? { meno: dm, foto: d.foto || undefined, rola: malym(SL.titul), ucet } : undefined;
  }
  if (!meno) return undefined;
  const c = ludia().find((x) => !x.caka && (x.n ?? "").trim() === meno && !/správca stránky/i.test(x.r ?? ""));
  return c ? { meno, foto: c.foto || ja.foto || undefined, rola: malym(c.r || ""), ucet } : undefined;
}

/** OPRAVY 276: aj pri už uložených príspevkoch — „… · správca stránky“ sa ukáže ako duchovný (ak to bol jeho účet) alebo farnosť */
export function useAutorNaStranke(strankaId: string): (af?: AutorF) => AutorF | undefined {
  useZmenyNastaveni();
  const ja = usePouzivatel();
  const SL = useSlovaFarnosti(strankaId);
  const somF = useSomFarar(strankaId);
  const d = duch(), dm = menoDucha(d), mojeMeno = ja.celeMeno?.trim() ?? "";
  const ako = (): AutorF | undefined => (dm ? { meno: dm, foto: d.foto || undefined, rola: malym(SL.titul) } : undefined);
  return (af) => {
    if (!af?.meno.trim()) return undefined;
    if (af.ucet && d.som === 0 && d.ucet && af.ucet === d.ucet) return ako();
    if (!/^správca stránky$/i.test(af.rola.trim())) return af;
    // starší zápis s menom účtu: keď je to účet duchovného (prihlásený = farár podľa Ľudí), ukáže sa duchovný, inak farnosť
    if (af.meno.trim() === mojeMeno && jeDuch(d, ja.ucetId, somF)) return ako();
    const c = ludia().find((x) => !x.caka && (x.n ?? "").trim() === af.meno.trim() && !/správca stránky/i.test(x.r ?? ""));
    return c ? { ...af, foto: af.foto || c.foto, rola: malym(c.r || "") } : undefined;
  };
}
