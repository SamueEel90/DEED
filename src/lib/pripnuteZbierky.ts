// ============================================================
// OPRAVY 187 · KARTA 61 §4 — zbierka iného subjektu pripnutá na stránke farnosti.
// Farnosť ukazuje cudziu zverejnenú zbierku (charita). Peniaze idú priamo vlastníkovi, farnosť ju nespravuje,
// len pripne alebo odopne. Keď zbierka skončí, z pohľadu v_zbierky_na_pripnutie vypadne a zo stránky zmizne sama.
// DB (0077): stranka_pripnuta_zbierka · v_zbierky_na_pripnutie · zbierka_cez_stranku · platba.zdroj_stranka.
// Bez DB (mock): pripnuté v localStorage, hľadá sa v spustených zbierkach stránok v pamäti.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { UKAZKOVE_STRANKY } from "./mojeStranky";
import { zbierkyStrankyZPamate, cielCislo } from "./novaZbierka";
import { darcoviaPre, sucetDarov, useZmenyDarov, type DarRiadok } from "./darcovia";
import { TESTOVACIA } from "./testovacia";

export interface ZbierkaNaPripnutie { id: string; nazov: string; stranka: string; kto: string; zdroj: "charita" | "help"; ciel: number | null; vyzbierane: number; darov: number;
  /** OPRAVY 199: ukážková zbierka testovacej verzie — darovať sa na ňu nedá */ ukazkova?: true;
  /** titulná fotka */ foto?: string }

/** OPRAVY 199: skúšobná zbierka inej charity — len v testovacej verzii, naostro nikde */
export const UKAZKOVA_ZBIERKA: ZbierkaNaPripnutie = { id: "ukazka-teple-jedlo", nazov: "Teplé jedlo pre ľudí bez domova", stranka: "", kto: "Skúšobná charita", zdroj: "charita", ciel: 2000, vyzbierane: 640, darov: 12, ukazkova: true, foto: "/img/dom.jpg" };
const KLUC_UK = "deed.pripnute.ukazka.v1";
const ukCitaj = (): string[] => { try { return JSON.parse(localStorage.getItem(KLUC_UK) ?? "[]") as string[]; } catch { return []; } };
const ukZapis = (v: string[]) => { try { localStorage.setItem(KLUC_UK, JSON.stringify(v)); } catch { /* LS */ } };
const sUkazkou = (stranka: string, l: ZbierkaNaPripnutie[]) => (TESTOVACIA && ukCitaj().includes(stranka) ? [...l.filter((z) => !z.ukazkova), UKAZKOVA_ZBIERKA] : l);
export interface CezStranku { suma: number; pocet: number; dary: { id: string; cas: number; meno: string | null; moj: boolean; suma: number }[] }

const KLUC = "deed.pripnute.v1";
const pamat = new Map<string, ZbierkaNaPripnutie[]>();
const nacitane = new Set<string>();
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
const odber = (f: () => void) => { posl.add(f); return () => { posl.delete(f); }; };

const lsCitaj = (): Record<string, string[]> => { try { return JSON.parse(localStorage.getItem(KLUC) ?? "{}") as Record<string, string[]>; } catch { return {}; } };
const lsZapis = (v: Record<string, string[]>) => { try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS */ } };

/** mock: spustené zbierky stránok (nie farností) v pamäti relácie */
function lokalneZbierky(): ZbierkaNaPripnutie[] {
  return UKAZKOVE_STRANKY.filter((s) => s.typ !== "farnost").flatMap((s) => zbierkyStrankyZPamate(s.k)
    .filter((z) => (z.stav ?? "aktivna") === "aktivna")
    .map((z) => { const d = sucetDarov(z.id); return { id: z.id, nazov: z.nazov, stranka: s.k, kto: s.n, zdroj: "charita" as const, ciel: cielCislo(z) || null, vyzbierane: d.suma, darov: d.pocet }; }));
}
const zRiadku = (r: Record<string, unknown>): ZbierkaNaPripnutie => ({ id: String(r.id), nazov: String(r.nazov ?? ""), stranka: String(r.stranka ?? ""), kto: String(r.kto ?? ""),
  zdroj: r.zdroj === "help" ? "help" : "charita", ciel: r.ciel == null ? null : Number(r.ciel), vyzbierane: Number(r.vyzbierane ?? 0), darov: Number(r.darov ?? 0) });

/** všetky zverejnené bežiace zbierky, ktoré sa dajú pripnúť */
export async function hladajZbierky(): Promise<ZbierkaNaPripnutie[]> {
  const uk = TESTOVACIA ? [UKAZKOVA_ZBIERKA] : [];
  if (!supabase) return [...uk, ...lokalneZbierky()];
  const { data, error } = await supabase.from("v_zbierky_na_pripnutie").select("id, nazov, stranka, kto, zdroj, ciel, vyzbierane, darov").order("vytvorene", { ascending: false }).limit(300);
  if (error || !data) return uk;
  return [...uk, ...(data as Record<string, unknown>[]).map(zRiadku)];
}

async function nacitaj(stranka: string) {
  if (!supabase) {
    const ids = lsCitaj()[stranka] ?? [];
    pamat.set(stranka, lokalneZbierky().filter((z) => ids.includes(z.id))); zmena(); return;
  }
  const { data } = await supabase.from("stranka_pripnuta_zbierka").select("zbierka").eq("stranka", stranka).order("pripnute");
  const ids = ((data ?? []) as { zbierka: string }[]).map((r) => r.zbierka);
  if (!ids.length) { pamat.set(stranka, []); zmena(); return; }
  const v = await supabase.from("v_zbierky_na_pripnutie").select("id, nazov, stranka, kto, zdroj, ciel, vyzbierane, darov").in("id", ids);
  const l = ((v.data ?? []) as Record<string, unknown>[]).map(zRiadku);
  pamat.set(stranka, ids.map((id) => l.find((z) => z.id === id)).filter((z): z is ZbierkaNaPripnutie => !!z)); zmena();
}

/** pripnuté zbierky stránky (skončené tu už nie sú) */
export function usePripnute(stranka: string): ZbierkaNaPripnutie[] {
  useSyncExternalStore(odber, () => ver);
  useZmenyDarov();
  useEffect(() => { if (!nacitane.has(stranka)) { nacitane.add(stranka); void nacitaj(stranka); } }, [stranka]);
  const l = sUkazkou(stranka, pamat.get(stranka) ?? []);
  // mock: suma sa počíta naživo z darov
  return supabase ? l : l.map((z) => { if (z.ukazkova) return z; const d = sucetDarov(z.id); return { ...z, vyzbierane: d.suma, darov: d.pocet }; });
}
export const pripnuteZPamate = (stranka: string) => sUkazkou(stranka, pamat.get(stranka) ?? []);

export async function pripni(stranka: string, z: ZbierkaNaPripnutie): Promise<void> {
  if (z.ukazkova) { ukZapis([...new Set([...ukCitaj(), stranka])]); zmena(); return; }
  pamat.set(stranka, [...pripnuteZPamate(stranka).filter((x) => x.id !== z.id), z]); zmena();
  if (!supabase) { const v = lsCitaj(); v[stranka] = [...new Set([...(v[stranka] ?? []), z.id])]; lsZapis(v); return; }
  const { error } = await supabase.from("stranka_pripnuta_zbierka").insert({ stranka, zbierka: z.id });
  if (error && error.code !== "23505") { void nacitaj(stranka); throw new Error(error.message); }
}
export async function odopni(stranka: string, id: string): Promise<void> {
  if (id === UKAZKOVA_ZBIERKA.id) { ukZapis(ukCitaj().filter((x) => x !== stranka)); zmena(); return; }
  pamat.set(stranka, pripnuteZPamate(stranka).filter((x) => x.id !== id)); zmena();
  if (!supabase) { const v = lsCitaj(); v[stranka] = (v[stranka] ?? []).filter((x) => x !== id); lsZapis(v); return; }
  const { error } = await supabase.from("stranka_pripnuta_zbierka").delete().eq("stranka", stranka).eq("zbierka", id);
  if (error) { void nacitaj(stranka); throw new Error(error.message); }
}

// ---- dary cez stránku farnosti ----
const cez = new Map<string, CezStranku>();
export function useCezStranku(zbierka: string, stranka: string): CezStranku {
  useSyncExternalStore(odber, () => ver);
  const vd = useZmenyDarov(); // nový dar → stiahnuť znova
  const k = `${zbierka}|${stranka}`;
  useEffect(() => {
    if (!supabase || zbierka === UKAZKOVA_ZBIERKA.id) return;
    let ziva = true;
    void supabase.rpc("zbierka_cez_stranku", { p_zbierka: zbierka, p_stranka: stranka }).then(({ data }) => {
      if (!ziva || !data) return;
      const o = data as { suma?: number; pocet?: number; dary?: { id: string; cas: string; meno: string | null; moj: boolean; suma: number }[] };
      cez.set(k, { suma: Number(o.suma ?? 0), pocet: Number(o.pocet ?? 0), dary: (o.dary ?? []).map((d) => ({ ...d, cas: Date.parse(d.cas), suma: Number(d.suma) })) }); zmena();
    });
    return () => { ziva = false; };
  }, [k, zbierka, stranka, vd]);
  if (supabase) return cez.get(k) ?? { suma: 0, pocet: 0, dary: [] };
  const l = darcoviaPre(zbierka).filter((r: DarRiadok) => r.zdroj === stranka);
  return { suma: l.reduce((a, r) => a + r.suma, 0), pocet: l.length, dary: l.map((r) => ({ id: r.id, cas: r.cas, meno: null, moj: !!r.moj, suma: r.suma })) };
}

/** míľniky pásu „Cez našu farnosť“ (bez %) */
export const MILNIKY_CEZ = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
export const dalsiMilnik = (suma: number) => MILNIKY_CEZ.find((m) => m > suma) ?? MILNIKY_CEZ[MILNIKY_CEZ.length - 1];
