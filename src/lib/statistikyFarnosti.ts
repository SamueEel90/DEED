// ============================================================
// OPRAVY 345 / 346 (odpovede 18. 10.) — presné počty zo servera (0107 statistiky_farnosti, len správca).
// Bez servera / pred migráciou = null → v appke „—“.
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { DEED_ZA_EUR } from "./darZbierky";

export interface StatServer {
  darciaSpolu: number; noviDarcovia: number; sledujuci: number; sledujuciNovi30: number;
  pravidelna: number | null; podielRodiny: number;
}

export async function statistikyFarnosti(stranka: string, od: number, po?: number): Promise<StatServer | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("statistiky_farnosti", { p_stranka: stranka, p_od: new Date(od).toISOString(), p_do: po != null ? new Date(po).toISOString() : null });
  if (error || !data) return null;
  const j = data as { darcovia_spolu: number; novi_darcovia: number; sledujuci: number; sledujuci_novi_30: number; pravidelna: number | null; podiel_rodiny: Record<string, number> };
  const p = j.podiel_rodiny ?? {};
  return { darciaSpolu: Number(j.darcovia_spolu), noviDarcovia: Number(j.novi_darcovia), sledujuci: Number(j.sledujuci), sledujuciNovi30: Number(j.sledujuci_novi_30),
    pravidelna: j.pravidelna == null ? null : Number(j.pravidelna), podielRodiny: Number(p.EUR ?? 0) + Number(p.DEED ?? 0) / DEED_ZA_EUR };
}

/** štatistiky zo servera pre obdobie od (ms); null = zatiaľ nie sú (načítava sa alebo server ich nedá) */
export function useStatistikyFarnosti(stranka: string, od: number): StatServer | null {
  const [s, setS] = useState<{ k: string; v: StatServer | null } | null>(null);
  const k = `${stranka}|${Math.floor(od / 60000)}`;
  useEffect(() => {
    let ziva = true;
    void statistikyFarnosti(stranka, od).then((v) => { if (ziva) setS({ k, v }); });
    return () => { ziva = false; };
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return s && s.k === k ? s.v : null;
}
