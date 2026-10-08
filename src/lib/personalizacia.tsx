// ============================================================
// DEED · Personalizácia — provider + usePersonalizacia()
// Jeden zdroj pravdy pre osobné signály (záujmy / sledovanie / podpora),
// ktoré napájajú prehľad „Môj DEED" aj feed afinitu (lib/feed).
// Vzor 1:1 ako lib/pouzivatel.tsx (demo vs real, perzistencia v store).
// ============================================================
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePouzivatel } from "./pouzivatel";
import { nacitajPredvolbu, identitaDarcu } from "./darcovia";
import { USE_SUPABASE } from "./supabase";
import { useSynchronizaciaSkutkov } from "./mojeSkutky";
import {
  nacitajLokalne, ulozZaujmy, ulozSledovani, ulozPodpory, ulozOblubene, ulozZbierky,
  importLegacyFollows, legacyNaImport, demoSeed, zaujmyNaKluce, zaujemZOblasti,
  nacitajPodporyDB, pridajPodporuDB,
  nacitajOblubeneDB, pridajOblubeneDB, odoberOblubeneDB,
  nacitajZbierkyDB, vytvorZbierkuDB, upravZbierkuDB, normalizujZaujmy } from "./personalizaciaStore";
import type { Zaujem, Sledovanie, Podpora, Oblubeny, MojaZbierka } from "@/types";

export interface PersonalizaciaApi {
  // záujmy — `pod` = detailná pod-položka (Zaujem.pod_polozka); bez neho = celá oblasť ("*")
  zaujmy: Zaujem[];
  setZaujmy: (z: Zaujem[]) => void;
  toggleZaujem: (oblast: string, pod?: string) => void;
  /** `pod` daný → konkrétna pod-položka; inak akýkoľvek záujem v oblasti (aktívna kategória). */
  maZaujem: (oblast: string, pod?: string) => boolean;
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
  // obľúbené (bookmark)
  oblubene: Oblubeny[];
  jeOblubene: (refId: number | string) => boolean;
  toggleOblubene: (o: Oblubeny) => void;
  // moje zbierky (ktoré som vytvoril) — spravujem v „Môj DEED"
  mojeZbierky: MojaZbierka[];
  pridajZbierku: (z: MojaZbierka) => void;
  upravZbierku: (id: string, patch: Partial<MojaZbierka>) => void;
  nacitavam: boolean;
}

const prazdny: PersonalizaciaApi = {
  zaujmy: [], setZaujmy: () => {}, toggleZaujem: () => {}, maZaujem: () => false, zaujmyKluce: new Set(),
  sledovani: [], sledujem: () => false, toggleSledovanie: () => {}, sledovaniMena: new Set(),
  podpory: [], pridajPodporu: () => {}, podporujem: () => false,
  oblubene: [], jeOblubene: () => false, toggleOblubene: () => {},
  mojeZbierky: [], pridajZbierku: () => {}, upravZbierku: () => {}, nacitavam: false,
};

const PersonalizaciaContext = createContext<PersonalizaciaApi>(prazdny);
export const usePersonalizacia = () => useContext(PersonalizaciaContext);

export function PersonalizaciaProvider({ children }: { children: ReactNode }) {
  const { demo, celeMeno, ucetId, meno, priezvisko, nick, mesto } = usePouzivatel();
  const [zaujmy, setZaujmyStav] = useState<Zaujem[]>([]);
  const [sledovani, setSledovani] = useState<Sledovanie[]>([]);
  const [podpory, setPodpory] = useState<Podpora[]>([]);
  const [oblubene, setOblubene] = useState<Oblubeny[]>([]);
  const [mojeZbierky, setMojeZbierky] = useState<MojaZbierka[]>([]);
  const [hydratovane, setHydratovane] = useState(false); // perzistuj až po inicializácii
  useSynchronizaciaSkutkov(USE_SUPABASE && !demo ? ucetId : null); // denník skutkov v účte (0072)

  // inicializácia: localStorage (+ jednorazový legacy import); demo bez dát → realistický seed
  useEffect(() => {
    const ulozene = nacitajLokalne();
    let { zaujmy: z, sledovani: s } = ulozene;
    const { podpory: p } = ulozene;
    // obľúbené: pri živej DB je autoritatívna DB (efekt nižšie), inak localStorage
    setOblubene(USE_SUPABASE ? [] : ulozene.oblubene);
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
    // Podpory: keď je DB k dispozícii, nechaj ich dotiahnuť z `podpora` (efekt nižšie) —
    // inak (offline) použi demo seed / lokálny stav.
    if (demo && prazdnyStore) {
      const seed = demoSeed();
      z = seed.zaujmy; s = seed.sledovani;
      setPodpory(USE_SUPABASE ? [] : seed.podpory);
      setMojeZbierky(USE_SUPABASE ? [] : seed.mojeZbierky); // DB je autoritatívna (efekt nižšie)
    } else {
      setPodpory(USE_SUPABASE ? [] : p);
      setMojeZbierky(USE_SUPABASE ? [] : ulozene.mojeZbierky);
    }
    setZaujmyStav(normalizujZaujmy(z));
    setSledovani(s);
    setHydratovane(true);
  }, [demo]);

  // Fáza D — „Čo podporujem" zo Supabase (agregát `podpora`). Overlay nad lokálny/seed
  // stav. Zadanie 1 · Blok 1: LEN podľa ucet_id — demo bez účtu ostáva na lokálnom stave
  // (čítanie podľa mena by zlialo dary dvoch ľudí s rovnakým menom). Bez DB → no-op.
  useEffect(() => {
    if (!USE_SUPABASE) return;
    const filter = { ucetId };
    if (!filter.ucetId) return;
    let zrusene = false;
    nacitajPodporyDB(filter)
      .then((rows) => { if (!zrusene) setPodpory(rows); })
      .catch(() => { /* DB nedostupná → ostáva lokálny stav */ });
    return () => { zrusene = true; };
  }, [ucetId]);

  // Obľúbené zo Supabase (owner-only cez auth.uid — anon session). Bez DB → no-op.
  // Session sa po prvej návšteve cachuje (supabase-js localStorage), takže race
  // je len pri úplne prvom otvorení; write-through v toggleOblubene to dorovná.
  useEffect(() => {
    if (!USE_SUPABASE) return;
    let zrusene = false;
    nacitajOblubeneDB()
      .then((rows) => { if (!zrusene) setOblubene(rows); })
      .catch(() => { /* DB nedostupná / bez session → ostáva lokálny stav */ });
    return () => { zrusene = true; };
  }, [demo, ucetId]);

  // Moje zbierky zo Supabase (owner-only cez auth.uid() — anon session). Bez DB → no-op.
  useEffect(() => {
    if (!USE_SUPABASE) return;
    let zrusene = false;
    nacitajZbierkyDB()
      .then((rows) => { if (!zrusene) setMojeZbierky(rows); })
      .catch(() => { /* DB nedostupná / bez session → ostáva lokálny stav */ });
    return () => { zrusene = true; };
  }, [demo, ucetId]);

  // perzistencia — len REÁLNY účet a až po hydratácii. `!demo` → demo seed sa nikdy neuloží
  // (nepresiakne do reálneho účtu); `hydratovane` (state, nie ref) → prvý beh s [] sa preskočí.
  useEffect(() => { if (hydratovane && !demo) ulozZaujmy(zaujmy); }, [zaujmy, hydratovane, demo]);
  useEffect(() => { if (hydratovane && !demo) ulozSledovani(sledovani); }, [sledovani, hydratovane, demo]);
  useEffect(() => { if (hydratovane && !demo) ulozPodpory(podpory); }, [podpory, hydratovane, demo]);
  useEffect(() => { if (hydratovane && !demo) ulozOblubene(oblubene); }, [oblubene, hydratovane, demo]);
  useEffect(() => { if (hydratovane && !demo) ulozZbierky(mojeZbierky); }, [mojeZbierky, hydratovane, demo]);

  const api = useMemo<PersonalizaciaApi>(() => ({
    zaujmy,
    setZaujmy: setZaujmyStav,
    // pod daný → toggle konkrétnej pod-položky; inak toggle celej oblasti ("*")
    toggleZaujem: (oblast, pod) => {
      const cielPod = pod ?? "*";
      setZaujmyStav((zs) => zs.some((z) => z.oblast === oblast && z.pod_polozka === cielPod)
        ? zs.filter((z) => !(z.oblast === oblast && z.pod_polozka === cielPod))
        : [...zs, pod ? { oblast, pod_polozka: pod, vlastny: false } : zaujemZOblasti(oblast)]);
    },
    maZaujem: (oblast, pod) => pod != null
      ? zaujmy.some((z) => z.oblast === oblast && z.pod_polozka === pod)
      : zaujmy.some((z) => z.oblast === oblast),
    zaujmyKluce: zaujmyNaKluce(zaujmy),
    sledovani,
    sledujem: (meno) => sledovani.some((s) => s.meno === meno),
    toggleSledovanie: (s) => setSledovani((xs) => xs.some((x) => x.meno === s.meno)
      ? xs.filter((x) => x.meno !== s.meno)
      : [s, ...xs]),
    sledovaniMena: new Set(sledovani.map((s) => s.meno)),
    podpory,
    pridajPodporu: (p) => {
      // okamžitá UI reakcia — akumuluj v pamäti (na položku podľa refId)
      setPodpory((ps) => {
        const i = ps.findIndex((x) => String(x.refId) === String(p.refId));
        if (i === -1) return [p, ...ps];
        const cur = ps[i];
        const copy = [...ps];
        copy[i] = { ...cur, ...p, suma: (cur.suma || 0) + (p.suma || 0) };
        return copy;
      });
      // reálny účet → perzistuj ako event do `podpora` (demo ostáva ephemerálne)
      if (USE_SUPABASE && !demo && ucetId) {
        // 0061: meno ide do platby len podľa voľby darcu pri tomto dare (anonym = žiadne meno)
        const zobrazenie = p.zobrazenie ?? nacitajPredvolbu().verzia;
        const darca = zobrazenie === 4 ? null
          : identitaDarcu({ id: "", refId: String(p.refId), cas: 0, suma: 0, kanal: "deed", registrovany: true, verzia: zobrazenie, zobrazSumu: false, moj: true },
              { meno, priezvisko, celeMeno, nick, mesto });
        pridajPodporuDB({
          darca, zobrazenie, ucetId, refId: p.refId, prijemca: p.komu,
          suma: p.suma, kanal: p.kanal, vyzbierane: p.vyzbierane, ciel: p.ciel,
        }).catch(() => { /* sieťová chyba — UI stav ostáva */ });
      }
    },
    podporujem: (refId) => podpory.some((x) => String(x.refId) === String(refId)),
    oblubene,
    jeOblubene: (refId) => oblubene.some((x) => String(x.refId) === String(refId)),
    toggleOblubene: (o) => {
      const je = oblubene.some((x) => String(x.refId) === String(o.refId));
      // write-through do DB (fire-and-forget); bez DB → len lokálny stav + localStorage efekt
      if (USE_SUPABASE) (je ? odoberOblubeneDB(o.refId) : pridajOblubeneDB(o)).catch(() => { /* sieť — UI stav ostáva */ });
      setOblubene((xs) => je ? xs.filter((x) => String(x.refId) !== String(o.refId)) : [o, ...xs]);
    },
    mojeZbierky,
    pridajZbierku: (z) => {
      setMojeZbierky((xs) => xs.some((x) => x.id === z.id) ? xs : [z, ...xs]);
      if (USE_SUPABASE) vytvorZbierkuDB(z).catch(() => { /* sieť — UI stav ostáva */ });
    },
    upravZbierku: (id, patch) => {
      setMojeZbierky((xs) => xs.map((x) => x.id === id ? { ...x, ...patch } : x));
      if (USE_SUPABASE) upravZbierkuDB(id, patch).catch(() => { /* sieť — UI stav ostáva */ });
    },
    nacitavam: !hydratovane,
  }), [zaujmy, sledovani, podpory, oblubene, mojeZbierky, hydratovane, demo, celeMeno, ucetId, meno, priezvisko, nick, mesto]);

  return <PersonalizaciaContext.Provider value={api}>{children}</PersonalizaciaContext.Provider>;
}
