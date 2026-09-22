import { sucetDarov } from "@/lib/darcovia";
// ============================================================
// Obsah profilu podľa programu — JEDEN výpočet pre verejný profil aj správu,
// aby všade svietili rovnaké čísla (inak správa klame o tom, čo vidí návštevník).
// ============================================================
import { najdiZbierku } from "@/lib/zbierky";
import { SUBJEKTY, type SubjektMeta } from "./mock";
import { nacitajDoklady, type DokladZbierky, type Pozicia, type Tier } from "./stav";
import type { OrgZbierka } from "./mock";

export type Tab = SubjektMeta["taby"][number];

const ukoncena = (p: { zbierkaId?: string }) => !!p.zbierkaId && najdiZbierku(p.zbierkaId)?.stav === "ukoncena";

/** Záložky verejného profilu pre daný program: len čo program má; ukončené zbierky sú v Skutkoch. */
export function verejneTaby(pozicia: Pozicia, tier: Tier): Tab[] {
  const s = SUBJEKTY[pozicia];
  const presunute = s.taby.find((t) => t.key === "zbierky")?.polozky.filter(ukoncena) ?? [];
  return s.taby
    .filter((t) => (t.odTieru ?? 0) <= tier)
    .map((t) => ({ ...t, polozky: (
      t.key === "zbierky" ? t.polozky.filter((p) => !ukoncena(p))
      : t.key === "skutky" ? [...presunute, ...t.polozky]
      : t.polozky
    ).filter((p) => (p.odTieru ?? 0) <= tier) }));
}

/** Záložky, ktoré program ešte nemá, ale sú najviac 2 programy nad ním (v správe zamknuté). */
export function zamknuteTaby(pozicia: Pozicia, tier: Tier): Tab[] {
  return SUBJEKTY[pozicia].taby.filter((t) => (t.odTieru ?? 0) > tier && (t.odTieru ?? 0) <= tier + 2);
}

/** krátky popis záložky do prehľadu v správe — reálne čísla z tých istých dát */
export function popisTabu(t: Tab): string {
  const n = t.polozky.length;
  if (t.key === "zbierky") {
    const z = t.polozky.map((p) => (p.zbierkaId ? najdiZbierku(p.zbierkaId) : undefined)).filter(Boolean);
    const spolu = z.reduce((a, x) => a + (x?.vyzbierane ?? 0), 0);
    const ciel = z.reduce((a, x) => a + (x?.ciel ?? 0), 0);
    return `${n} ${n === 1 ? "aktívna" : n < 5 ? "aktívne" : "aktívnych"} · ${spolu.toLocaleString("sk")} € z ${ciel.toLocaleString("sk")} €`;
  }
  if (t.key === "skutky") {
    const dolozene = t.polozky.filter((p) => p.dokaz || p.dokazZbierky || (p.zbierkaId && najdiZbierku(p.zbierkaId)?.dokaz)).length;
    return `${n} na profile · ${dolozene} doložené fotkami a dokladmi`;
  }
  if (t.key === "video") return `${n} na profile`;
  return `${n} na profile`;
}

/** panelové bloky, ktoré kopírujú záložku verejného profilu — v prehľade by boli dvakrát */
export const BLOK_ZA_TAB: Record<string, string> = { zbierky: "zbierky", retaz: "retaz", darovali: "sponzoring" };

// ---------- zbierky organizácie v správe = tie isté ako na verejnom profile ----------

/** všetky zbierky subjektu v danom programe (aktívne aj ukončené) v tvare pre správu */
export function zbierkyOrg(pozicia: Pozicia, tier: Tier): OrgZbierka[] {
  // zbierky zo všetkých záložiek (ukončené sú na profile v Skutkoch) — bez duplicít
  const polozky = SUBJEKTY[pozicia].taby.filter((t) => (t.odTieru ?? 0) <= tier).flatMap((t) => t.polozky);
  return polozky
    .filter((p, i, a) => p.zbierkaId && (p.odTieru ?? 0) <= tier && a.findIndex((x) => x.zbierkaId === p.zbierkaId) === i)
    .map((p) => najdiZbierku(p.zbierkaId!))
    .filter((z): z is NonNullable<typeof z> => !!z)
    .map((z) => ({ id: z.id, nazov: z.nazov, emoji: z.emoji, ciel: z.ciel, vyzbierane: z.vyzbierane, stav: z.stav, darcovia: z.darcovia }));
}

/** doklady zbierky: nahraté v správe, inak tie z dôkazu na profile (faktúry, bločky) */
export function dokladyZbierky(id: string): DokladZbierky[] {
  const ulozene = nacitajDoklady(id);
  if (ulozene.length) return ulozene;
  return (najdiZbierku(id)?.dokaz?.doklady ?? []).map((d) => ({ nazov: d.druh, popis: `${d.nazov} · ${d.dodavatel}`, suma: d.suma, datum: d.datum }));
}

/** Čísla v hlavičke profilu — JEDEN výpočet pre verejný profil aj správu.
 *  Charita: Vyzbierané = všetky jej zbierky (bez duplicít) + živé dary + centrálna;
 *  Skutky = počet položiek v záložke Skutky (vrátane ukončených zbierok). */
export function cislaSubjektu(pozicia: Pozicia, tier: Tier): [string, string][] {
  const s = SUBJEKTY[pozicia];
  const zaklad = tier === 0 && s.cislaZadarmo ? s.cislaZadarmo : s.cisla;
  if (pozicia !== "charita") return zaklad;
  const ids = [...new Set(s.taby.flatMap((t) => t.polozky.map((p) => p.zbierkaId)).filter((id): id is string => !!id))];
  const vyzbierane = ids.reduce((a, id) => a + (najdiZbierku(id)?.vyzbierane ?? 0) + sucetDarov(id).suma, 0) + sucetDarov("z-centralna").suma;
  const skutky = verejneTaby(pozicia, tier).find((t) => t.key === "skutky")?.polozky.length ?? 0;
  return zaklad.map(([h, l], i) => (i === 0 ? [`${vyzbierane.toLocaleString("sk", { maximumFractionDigits: 0 })} €`, l] : i === 1 ? [String(skutky), l] : [h, l]));
}
