// ============================================================
// OPRAVY 452 · Darcovia charity zo servera (0148 stranka_darcovia): každý dar s kľúčom darcu (md5 stránka:účet).
// 1 účet = 1 riadok (meno, počet darov, suma, posledný dar). Anonymné dary (bez účtu alebo bez mena) sú jeden
// spoločný riadok a nikdy sa nepripočítajú k menovanému. Bez databázy (ukážka) z darov na tomto zariadení.
// ============================================================
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { DEED_ZA_EUR } from "./darZbierky";
import { darcoviaPre, identitaDarcu } from "./darcovia";
import { zbierkyStrankyZPamate } from "./novaZbierka";

export type DarDarcu = { id: string; cas: number; eur: number; zbierka: string };
export type DarcaStranky = { k: string; meno: string; dary: DarDarcu[]; suma: number; posledny: number };
export type DarcoviaStranky = { menovani: DarcaStranky[]; anonymne: DarcaStranky | null };

type Riadok = { id: string; cas: number; eur: number; zbierka: string; darca: string | null; meno: string | null };

function zoskup(riadky: Riadok[]): DarcoviaStranky {
  const mapa = new Map<string, DarcaStranky>();
  let anon: DarcaStranky | null = null;
  for (const r of [...riadky].sort((a, b) => b.cas - a.cas)) {
    const dar: DarDarcu = { id: r.id, cas: r.cas, eur: r.eur, zbierka: r.zbierka };
    if (!r.darca) {
      anon ??= { k: "anonymne", meno: "Anonymné dary", dary: [], suma: 0, posledny: 0 };
      anon.dary.push(dar); anon.suma += r.eur; anon.posledny = Math.max(anon.posledny, r.cas);
      continue;
    }
    // meno = to, ktoré darca vybral pri najnovšom dare
    const d = mapa.get(r.darca) ?? { k: r.darca, meno: r.meno || "Darca", dary: [], suma: 0, posledny: 0 };
    d.dary.push(dar); d.suma += r.eur; d.posledny = Math.max(d.posledny, r.cas);
    mapa.set(r.darca, d);
  }
  return { menovani: [...mapa.values()].sort((a, b) => b.posledny - a.posledny), anonymne: anon };
}

/** bez databázy: dary na tomto zariadení (registrovaný s menom = podľa mena, ostatné anonymné) */
function zPamate(strankaId: string): DarcoviaStranky {
  const riadky: Riadok[] = zbierkyStrankyZPamate(strankaId).flatMap((z) => darcoviaPre(z.id).filter((r) => !r.omsa).map((r): Riadok => {
    const meno = r.firma || (r.registrovany && r.verzia !== 4 ? identitaDarcu(r, undefined, "ine") : null);
    return { id: r.id, cas: r.cas, eur: r.suma, zbierka: z.nazov || "Zbierka", darca: meno ? `m:${meno}` : null, meno };
  }));
  return zoskup(riadky);
}

export function useDarcoviaStranky(strankaId: string, zmena: number) {
  return useQuery({
    queryKey: ["darcovia-stranky", strankaId, supabase ? 0 : zmena],
    queryFn: async (): Promise<DarcoviaStranky> => {
      if (!supabase) return zPamate(strankaId);
      const { data, error } = await supabase.rpc("stranka_darcovia", { p_stranka: strankaId });
      if (error) throw error;
      const l = (data ?? []) as { id: string; cas: string; mena: string; suma: number; meno: string | null; darca: string | null; nazov: string | null }[];
      return zoskup(l.map((d) => ({ id: d.id, cas: new Date(d.cas).getTime(), eur: d.mena === "DEED" ? Number(d.suma) / DEED_ZA_EUR : Number(d.suma),
        zbierka: d.nazov || "Zbierka", darca: d.darca, meno: d.meno })));
    },
    staleTime: 20_000,
  });
}
