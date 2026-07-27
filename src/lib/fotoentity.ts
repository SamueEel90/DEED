// ============================================================
// FOTKY SUBJEKTU — profilová (1:1) + TITULNÁ/cover (16:9) pre KAŽDÝ profil
// v appke: organizácia, osoba, rola (charita/tvorca/B2B), farnosť, ja.
//
// TESTOVACÍ REŽIM (FOTO_TEST_REZIM): prihlásený človek smie meniť fotky na
// ktoromkoľvek profile — aj cudzom. Je to DEV barlička na skúšanie vzhľadu;
// v produkcii sa flag vypne a editácia ostane len držiteľovi profilu
// (rovnaký vzor ako FLAGS.dev_* v features/rola/stav.ts).
//
// Perzistencia = localStorage per kľúč subjektu (mock, ako deed.rola.*).
// Osobná profilovka má vlastnú cestu (lib/fotoprofilu — ide aj do DB);
// tento store drží fotky subjektov a titulné fotky.
// ============================================================
import { useCallback, useEffect, useState } from "react";

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

/**
 * Fotky subjektu + setter. Vracia `[fotky, zmen]`, kde `zmen({cover:null})`
 * fotku zmaže (späť na pôvodnú z dát). Kľúč sa smie meniť za behu (prepínanie rolí).
 */
export function useFotkyEntity(kluc: string): [FotkyEntity, (zmena: FotkyEntity) => void] {
  const [f, setF] = useState<FotkyEntity>(() => nacitajFotky(kluc));
  useEffect(() => { setF(nacitajFotky(kluc)); }, [kluc]);
  const zmen = useCallback((zmena: FotkyEntity) => {
    setF((s) => {
      const nove = { ...s, ...zmena };
      ulozFotky(kluc, nove);
      return nove;
    });
  }, [kluc]);
  return [f, zmen];
}
