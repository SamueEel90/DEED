// ============================================================
// FOTKY SUBJEKTU — profilová (1:1) + TITULNÁ/cover (16:9) pre KAŽDÝ profil
// v appke: organizácia, osoba, rola (charita/tvorca/B2B), farnosť, ja.
//
// TESTOVACÍ REŽIM (FOTO_TEST_REZIM): prihlásený človek smie meniť fotky na
// ktoromkoľvek profile — aj cudzom. Je to DEV barlička na skúšanie vzhľadu;
// v produkcii sa flag vypne a editácia ostane len držiteľovi profilu
// (rovnaký vzor ako FLAGS.dev_* v features/rola/stav.ts).
//
// Perzistencia = tabuľka foto_entity (0079b, kľúč subjektu → URL zo Storage);
// localStorage per kľúč je len cache (offline / mock / kým DB neodpovie).
// Osobná profilovka má vlastnú cestu (lib/fotoprofilu — ide aj do DB);
// tento store drží fotky subjektov a titulné fotky.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { bezDataUrl } from "@/lib/uploadFoto";
import { toast } from "@/components/toast";

/** DEV: editácia fotiek na cudzích profiloch. Pred launchom → false. */
export const FOTO_TEST_REZIM = true;

export interface FotkyEntity {
  /** profilová fotka / logo (štvorec) */
  avatar?: string | null;
  /** titulná fotka (cover, 16:9) */
  cover?: string | null;
}

const PREFIX = "deed.foto.entita.";
// diakritika sa najprv rozloží a odstráni — inak by z „OZ Túlavá labka“ vzniklo
// „oz-t-lav-labka“ a názvy líšiace sa len diakritikou by mohli kolidovať
const slug = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** stabilný kľúč subjektu — `klucEntity("org", "OZ Túlavá labka")` → `org:oz-tulava-labka` */
export const klucEntity = (typ: "org" | "osoba" | "rola" | "farnost" | "ja", meno: string) => `${typ}:${slug(meno) || "bez-nazvu"}`;

export function nacitajFotky(kluc: string): FotkyEntity {
  try { return JSON.parse(localStorage.getItem(PREFIX + kluc) || "{}") as FotkyEntity; } catch { return {}; }
}

export function ulozFotky(kluc: string, f: FotkyEntity) {
  try {
    const cista: FotkyEntity = {};
    if (f.avatar) cista.avatar = f.avatar;
    if (f.cover) cista.cover = f.cover;
    if (cista.avatar || cista.cover) localStorage.setItem(PREFIX + kluc, JSON.stringify(cista));
    else localStorage.removeItem(PREFIX + kluc);
  } catch { /* LS nedostupné */ }
}

// zmena v jednom hooku → ostatné s rovnakým kľúčom (napr. Správa a podstránka naraz)
const odberatelia = new Map<string, Set<(f: FotkyEntity) => void>>();
const ohlas = (kluc: string, f: FotkyEntity) => odberatelia.get(kluc)?.forEach((cb) => cb(f));

const nacitane = new Set<string>();
async function stiahni(kluc: string) {
  if (!supabase || nacitane.has(kluc)) return;
  nacitane.add(kluc);
  const { data, error } = await supabase.from("foto_entity").select("avatar, cover").eq("kluc", kluc).maybeSingle();
  if (error) { nacitane.delete(kluc); return; } // tabuľka ešte nebeží (0079b) → ostáva lokálne
  if (!data) return; // v DB nič → lokálna (napr. ešte nenahraná) ostáva
  const f: FotkyEntity = { avatar: data.avatar, cover: data.cover };
  ulozFotky(kluc, f);
  ohlas(kluc, nacitajFotky(kluc));
}

async function zapis(kluc: string, f: FotkyEntity) {
  if (!supabase) return;
  try {
    const ciste = await bezDataUrl({ avatar: f.avatar ?? null, cover: f.cover ?? null }, "entity"); // fotky → Storage
    if (!ciste.avatar && !ciste.cover) {
      const { error } = await supabase.from("foto_entity").delete().eq("kluc", kluc);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("foto_entity").upsert({ kluc, ...ciste }, { onConflict: "kluc" });
      if (error) throw error;
    }
    if (JSON.stringify(nacitajFotky(kluc)) === JSON.stringify(Object.fromEntries(Object.entries(f).filter(([, v]) => v)))) {
      ulozFotky(kluc, ciste); // cache s URL namiesto base64
      ohlas(kluc, nacitajFotky(kluc));
    }
  } catch (e) {
    toast(e instanceof Error && /prihlásení/.test(e.message) ? e.message : "Fotku sa nepodarilo uložiť na server — je len na tomto zariadení.");
  }
}

/**
 * Fotky subjektu + setter. Vracia `[fotky, zmen]`, kde `zmen({cover:null})`
 * fotku zmaže (späť na pôvodnú z dát). Kľúč sa smie meniť za behu (prepínanie rolí).
 */
export function useFotkyEntity(kluc: string): [FotkyEntity, (zmena: FotkyEntity) => void] {
  const [f, setF] = useState<FotkyEntity>(() => nacitajFotky(kluc));
  useEffect(() => {
    setF(nacitajFotky(kluc));
    let sada = odberatelia.get(kluc);
    if (!sada) odberatelia.set(kluc, (sada = new Set()));
    sada.add(setF);
    void stiahni(kluc);
    return () => { sada!.delete(setF); };
  }, [kluc]);
  const zmen = useCallback((zmena: FotkyEntity) => {
    const nove = { ...nacitajFotky(kluc), ...zmena };
    ulozFotky(kluc, nove);
    ohlas(kluc, nacitajFotky(kluc));
    void zapis(kluc, nove);
  }, [kluc]);
  return [f, zmen];
}
