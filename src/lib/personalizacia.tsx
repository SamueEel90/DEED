// ============================================================
// DEED · Personalizácia — provider + usePersonalizacia()
// Jeden zdroj pravdy pre osobné signály (záujmy / sledovanie / podpora),
// ktoré napájajú prehľad „Môj DEED" aj feed afinitu (lib/feed).
// Vzor 1:1 ako lib/pouzivatel.tsx (demo vs real, perzistencia v store).
// ============================================================
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePouzivatel } from "./pouzivatel";
import {
  nacitajLokalne, ulozZaujmy, ulozSledovani, ulozPodpory,
  importLegacyFollows, legacyNaImport, demoSeed, zaujmyNaKluce, zaujemZOblasti,
} from "./personalizaciaStore";
import type { Zaujem, Sledovanie, Podpora } from "@/types";

export interface PersonalizaciaApi {
  // záujmy
  zaujmy: Zaujem[];
  setZaujmy: (z: Zaujem[]) => void;
  toggleZaujem: (oblast: string) => void;
  maZaujem: (oblast: string) => boolean;
  zaujmyKluce: Set<string>;
  // sledovanie
  sledovani: Sledovanie[];
  sledujem: (meno: string) => boolean;
  toggleSledovanie: (s: Sledovanie) => void;
  sledovaniMena: Set<string>;
  // podpora
  podpory: Podpora[];
  pridajPodporu: (p: Podpora) => void;
  podporujem: (refId: number | string) => boolean;
  nacitavam: boolean;
}

const prazdny: PersonalizaciaApi = {
  zaujmy: [], setZaujmy: () => {}, toggleZaujem: () => {}, maZaujem: () => false, zaujmyKluce: new Set(),
  sledovani: [], sledujem: () => false, toggleSledovanie: () => {}, sledovaniMena: new Set(),
  podpory: [], pridajPodporu: () => {}, podporujem: () => false, nacitavam: false,
};

const PersonalizaciaContext = createContext<PersonalizaciaApi>(prazdny);
export const usePersonalizacia = () => useContext(PersonalizaciaContext);

export function PersonalizaciaProvider({ children }: { children: ReactNode }) {
  const { demo } = usePouzivatel();
  const [zaujmy, setZaujmyStav] = useState<Zaujem[]>([]);
  const [sledovani, setSledovani] = useState<Sledovanie[]>([]);
  const [podpory, setPodpory] = useState<Podpora[]>([]);
  const [hydratovane, setHydratovane] = useState(false); // perzistuj až po inicializácii

  // inicializácia: localStorage (+ jednorazový legacy import); demo bez dát → realistický seed
  useEffect(() => {
    const ulozene = nacitajLokalne();
    let { zaujmy: z, sledovani: s } = ulozene;
    const { podpory: p } = ulozene;
    // seed guard sa vyhodnocuje voči PÔVODNÉMU stavu store-u (PRED legacy importom) —
    // inak by legacy follow naplnil `s` a demo seed (záujmy + podpory) by sa preskočil.
    const prazdnyStore = z.length === 0 && s.length === 0 && p.length === 0;
    // REÁLNY účet: jednorazový import starých Aktivity follow-ov (marker zabráni „vzkrieseniu"
    // po tom, čo používateľ všetkých prestane sledovať).
    if (!demo && s.length === 0 && legacyNaImport()) {
      const legacy = importLegacyFollows();
      if (legacy.length) s = legacy;
    }
    // DEMO identita s prázdnym store-om → realistický seed (len v pamäti, NEpersistuje sa).
    if (demo && prazdnyStore) {
      const seed = demoSeed();
      z = seed.zaujmy; s = seed.sledovani;
      setPodpory(seed.podpory);
    } else {
      setPodpory(p);
    }
    setZaujmyStav(z);
    setSledovani(s);
    setHydratovane(true);
  }, [demo]);

  // perzistencia — len REÁLNY účet a až po hydratácii. `!demo` → demo seed sa nikdy neuloží
  // (nepresiakne do reálneho účtu); `hydratovane` (state, nie ref) → prvý beh s [] sa preskočí.
  useEffect(() => { if (hydratovane && !demo) ulozZaujmy(zaujmy); }, [zaujmy, hydratovane, demo]);
  useEffect(() => { if (hydratovane && !demo) ulozSledovani(sledovani); }, [sledovani, hydratovane, demo]);
  useEffect(() => { if (hydratovane && !demo) ulozPodpory(podpory); }, [podpory, hydratovane, demo]);

  const api = useMemo<PersonalizaciaApi>(() => ({
    zaujmy,
    setZaujmy: setZaujmyStav,
    toggleZaujem: (oblast) => setZaujmyStav((zs) => zs.some((z) => z.oblast === oblast)
      ? zs.filter((z) => z.oblast !== oblast)
      : [...zs, zaujemZOblasti(oblast)]),
    maZaujem: (oblast) => zaujmy.some((z) => z.oblast === oblast),
    zaujmyKluce: zaujmyNaKluce(zaujmy),
    sledovani,
    sledujem: (meno) => sledovani.some((s) => s.meno === meno),
    toggleSledovanie: (s) => setSledovani((xs) => xs.some((x) => x.meno === s.meno)
      ? xs.filter((x) => x.meno !== s.meno)
      : [s, ...xs]),
    sledovaniMena: new Set(sledovani.map((s) => s.meno)),
    podpory,
    pridajPodporu: (p) => setPodpory((ps) => {
      const i = ps.findIndex((x) => String(x.refId) === String(p.refId));
      if (i === -1) return [p, ...ps];
      const cur = ps[i];
      const copy = [...ps];
      copy[i] = { ...cur, ...p, suma: (cur.suma || 0) + (p.suma || 0) };
      return copy;
    }),
    podporujem: (refId) => podpory.some((x) => String(x.refId) === String(refId)),
    nacitavam: !hydratovane,
  }), [zaujmy, sledovani, podpory, hydratovane]);

  return <PersonalizaciaContext.Provider value={api}>{children}</PersonalizaciaContext.Provider>;
}
