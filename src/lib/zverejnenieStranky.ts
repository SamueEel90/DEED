// ============================================================
// OPRAVY 511 (balík 47) · Stránka neverejná, kým ju správca nezverejní (server 0162: stranka.zverejnena, stranka_zverejni).
// Stav číta správa (riadok stránky vidí len ona, kým nie je verejná). Návštevník QR / odkazu sa pýta stranka_pripravuje.
// Bez servera (mock) je stránka verejná, okrem tých, ktoré test označí ako neverejné (oznacNeverejnuMock).
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { jeVzor } from "./vzorStranky";

/** "?" = ešte nevieme (načítava sa) */
export type Zverejnenie = { stav: "?" } | { stav: "neverejna" } | { stav: "verejna"; od: string | null };
const pamat = new Map<string, Zverejnenie>();
const mockNeverejne = new Set<string>();
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
const nacitavane = new Set<string>();

export function oznacNeverejnuMock(stranka: string) { mockNeverejne.add(stranka); pamat.delete(stranka); zmena(); }

export async function nacitajZverejnenie(stranka: string): Promise<Zverejnenie> {
  if (!stranka || jeVzor(stranka)) return { stav: "verejna", od: null };
  if (!supabase) {
    const z: Zverejnenie = mockNeverejne.has(stranka) ? { stav: "neverejna" } : { stav: "verejna", od: null };
    if (pamat.get(stranka)?.stav !== z.stav) { pamat.set(stranka, z); zmena(); }
    return z;
  }
  if (nacitavane.has(stranka)) return pamat.get(stranka) ?? { stav: "?" };
  nacitavane.add(stranka);
  const { data, error } = await supabase.from("stranka").select("zverejnena").eq("id", stranka).maybeSingle().then((x) => x, () => ({ data: null, error: { message: "siet" } }));
  nacitavane.delete(stranka);
  if (error) return pamat.get(stranka) ?? { stav: "?" };
  // riadok nevidno = nie som správca neverejnej stránky; ako správca ho vidím vždy
  const z: Zverejnenie = data ? (data.zverejnena ? { stav: "verejna", od: data.zverejnena as string } : { stav: "neverejna" }) : { stav: "?" };
  pamat.set(stranka, z); zmena();
  return z;
}

export function useZverejnenie(stranka: string): Zverejnenie {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  useEffect(() => { void nacitajZverejnenie(stranka); }, [stranka]);
  return pamat.get(stranka) ?? { stav: "?" };
}
/** stránka je v príprave (pre Správu: lišta, štítky zbierok, QR plagát, oznamy) */
export const useNeverejna = (stranka: string) => useZverejnenie(stranka).stav === "neverejna";

/** Zverejniť stránku (raz navždy). Chyba ako text alebo null. */
export async function zverejniStranku(stranka: string): Promise<string | null> {
  if (!supabase) { mockNeverejne.delete(stranka); pamat.set(stranka, { stav: "verejna", od: new Date().toISOString() }); zmena(); return null; }
  const { data, error } = await supabase.rpc("stranka_zverejni", { p_stranka: stranka }).then((x) => x, () => ({ data: null, error: { message: "siet" } }));
  if (error) return /nemate_povolene/.test(error.message ?? "") ? "Stránku zverejní štatutár alebo hlavný správca." : "Stránka sa nezverejnila. Skontrolujte pripojenie a skúste znova.";
  pamat.set(stranka, { stav: "verejna", od: (data as string | null) ?? new Date().toISOString() }); zmena();
  return null;
}

/** návštevník: stránka existuje, ale ešte sa pripravuje (QR, odkaz) */
export async function strankaSaPripravuje(stranka: string): Promise<boolean> {
  if (!supabase) return mockNeverejne.has(stranka);
  const { data, error } = await supabase.rpc("stranka_pripravuje", { p_stranka: stranka }).then((x) => x, () => ({ data: null, error: { message: "siet" } }));
  return !error && data === true;
}
