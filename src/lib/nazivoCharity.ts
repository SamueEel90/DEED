// ============================================================
// OPRAVY 478 · Profil charity: karta Naživo a Od začiatku zo skutočných darov (Martin 22. 10.)
// Zdroj = ten istý ako Správa → Štatistiky a Čísla: dary z ledgera všetkých zbierok stránky + centrálna (stranka:hlavna).
// Naživo = len dary a skutky, nikdy návštevy. Dnes: súčet dnešných darov a počet ľudí (rovnaké počítanie ako „12 ľudí“ pri zbierke).
// Striedajúci sa riadok: posledný dar · nový skutok · nové v príbehu (posledných 7 dní). Nič s nulou.
// Od začiatku: vyzbierané spolu · darcov · doložených skutkov.
// ============================================================
import { useEffect } from "react";
import { darcoviaPre, identitaDarcu, useZmenyDarov, type DarRiadok } from "./darcovia";
import { naviazObjekt } from "./darZbierky";
import { nacitajZbierkyStranky, zbierkyStrankyZPamate, useZmenyZbierok } from "./novaZbierka";
import { skutkyStrankyZPamate, useZmenySkutkovStranky } from "./skutkyStranky";
import { skutkyOrg, useZmenySkutkov } from "./mojeSkutky";
import { pribehZbierky, useZmenyPribehov } from "./pribehZbierky";
import { sumaEur } from "./suma";

const DEN = 86_400_000;
export interface ZivaPolozka { k: string; tucne: string; text: string }
export interface NazivoCharity {
  dnesSuma: number; dnesLudi: number;
  /** kedy prišiel posledný dar (ms), keď dnes ešte nikto nedal */
  posledny: number | null;
  polozky: ZivaPolozka[];
  odZaciatku: { suma: number; darcov: number; skutkov: number };
}
const datumKratko = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const nazovCentralnej = "Celá činnosť";

/** dary všetkých zbierok stránky (aj centrálnej) — ten istý refId ako Správa (refCentralnej) */
export function daryStranky(stranka: string): { r: DarRiadok; zbierka: string }[] {
  const ref = `${stranka}-centralna`;
  naviazObjekt(ref, { stranka, hlavna: true, nazov: nazovCentralnej });
  const zb = zbierkyStrankyZPamate(stranka);
  return [
    ...darcoviaPre(ref).map((r) => ({ r, zbierka: nazovCentralnej })),
    ...zb.flatMap((z) => darcoviaPre(z.id).map((r) => ({ r, zbierka: z.nazov || "Zbierka" }))),
  ].filter((x) => !x.r.omsa);
}

export function useNazivoCharity(stranka: string, zapnute: boolean): NazivoCharity | null {
  useZmenyDarov(); useZmenyZbierok(); useZmenySkutkovStranky(); useZmenySkutkov(); useZmenyPribehov();
  useEffect(() => { if (zapnute) void nacitajZbierkyStranky(stranka); }, [stranka, zapnute]);
  if (!zapnute) return null;
  const vsetky = daryStranky(stranka).sort((a, b) => b.r.cas - a.r.cas);
  const ludia = vsetky.filter((x) => !x.r.firma);
  const dnes0 = new Date(); dnes0.setHours(0, 0, 0, 0);
  const dnes = ludia.filter((x) => x.r.cas >= dnes0.getTime());
  const polozky: ZivaPolozka[] = [];
  const p = ludia[0];
  if (p) {
    const meno = identitaDarcu(p.r) || "Anonymný darca";
    const text = `${p.r.suma > 0 ? `${sumaEur(p.r.suma)} · ` : ""}${p.zbierka}`;
    polozky.push(p.r.cas >= dnes0.getTime() ? { k: "dar", tucne: meno, text } : { k: "dar", tucne: `Posledný dar ${datumKratko(p.r.cas)}`, text: `${meno} · ${text}` });
  }
  const skutky = (skutkyStrankyZPamate(stranka) ?? skutkyOrg(stranka)).filter((s) => !s.stiahnuty);
  const tyzden = Date.now() - 7 * DEN;
  const novySk = [...skutky].sort((a, b) => (b.datum || 0) - (a.datum || 0))[0];
  if (novySk && (novySk.datum || 0) >= tyzden) polozky.push({ k: "skutok", tucne: "Nový skutok", text: novySk.nazov });
  const pribehy = zbierkyStrankyZPamate(stranka).map((z) => {
    const pr = pribehZbierky(z.id);
    const cas = Math.max(pr?.zverejnene ? Date.parse(pr.zverejnene) : 0, ...(pr?.priebeh ?? []).map((x) => Date.parse(x.datum) || 0));
    return { nazov: z.nazov || "Zbierka", cas };
  }).filter((x) => x.cas >= tyzden).sort((a, b) => b.cas - a.cas);
  if (pribehy[0]) polozky.push({ k: "pribeh", tucne: "Nové v príbehu", text: pribehy[0].nazov });
  return {
    dnesSuma: dnes.reduce((a, x) => a + x.r.suma, 0), dnesLudi: dnes.length,
    posledny: dnes.length ? null : p?.r.cas ?? null,
    polozky,
    odZaciatku: { suma: vsetky.reduce((a, x) => a + x.r.suma, 0), darcov: ludia.length, skutkov: skutky.length },
  };
}

/** OPRAVY 478 doplnok: darcovia zo skutočných darov — rovnaké počítanie ako „12 ľudí“ pri zbierke (dar človeka = človek),
 *  noví = dary v období od darcov, ktorí predtým nedali (meno z ledgera; anonymný dar je vždy nový) */
export function darcoviaZDarov(dary: DarRiadok[], od: number): { spolu: number; novi: number } {
  const ludia = dary.filter((r) => !r.firma && !r.omsa).sort((a, b) => a.cas - b.cas);
  const videl = new Set<string>(); let novi = 0;
  for (const r of ludia) {
    const kto = r.moj ? "ja" : r.registrovany && r.meno ? `m:${r.meno}` : `d:${r.id}`;
    if (!videl.has(kto) && r.cas >= od) novi++;
    videl.add(kto);
  }
  return { spolu: ludia.length, novi };
}
