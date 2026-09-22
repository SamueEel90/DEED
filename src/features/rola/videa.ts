// ============================================================
// VIDEÁ CHARITY („Mám talent — video") — zoznam videí organizácie.
// Cenník: ZADARMO = 1 video mesačne, ďalšie 10 €; na profile je v ZADARMO
// vidieť 1 video (ostatné ostávajú v správe). Mock: localStorage + IndexedDB.
// ============================================================
import { useSyncExternalStore } from "react";
import { SUBJEKTY } from "./mock";
import type { Tier } from "./stav";
import type { SubjektMeta } from "./mock";
type Polozka = SubjektMeta["taby"][number]["polozky"][number];

export interface VideoOrg {
  id: string;
  titul: string;
  popis: string;
  nahlad?: string;      // obrázok náhľadu (pôvodné demo videá)
  src?: string;         // nahraté video „idb:…"
  dlzka: string;        // „0:45"
  zbierkaId?: string;   // video k zbierke (platobný modul)
  datum: string;        // ISO
  naProfile: boolean;
}

export const VIDEO_ORG_CFG = {
  maxSekund: 45,
  /** koľko videí je vidieť na profile podľa programu */
  naProfile: { 0: 1, 1: 99, 2: 99, 3: 99, 4: 99 } as Record<Tier, number>,
  /** nových videí za mesiac v cene programu */
  zaMesiac: { 0: 1, 1: 1, 2: 2, 3: 4, 4: 99 } as Record<Tier, number>,
  /** cena každého ďalšieho videa v mesiaci */
  cenaDalsie: 10,
};

const KLUC = "deed.rola.videa.charita";
let cache: VideoOrg[] | null = null;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };

function seed(): VideoOrg[] {
  const tab = SUBJEKTY.charita.taby.find((t) => t.key === "video");
  return (tab?.polozky ?? []).filter((p) => p.video).map((p, i) => ({
    id: `seed-${i}`, titul: p.titul, popis: p.popis, nahlad: p.video!.nahlad, dlzka: p.video!.dlzka,
    zbierkaId: p.video!.zbierkaId, datum: new Date(2026, 7 - i, 20).toISOString(), naProfile: true,
  }));
}
export function nacitajVidea(): VideoOrg[] {
  if (cache) return cache;
  try { const s = localStorage.getItem(KLUC); cache = s ? (JSON.parse(s) as VideoOrg[]) : seed(); } catch { cache = seed(); }
  return cache;
}
export function ulozVidea(v: VideoOrg[]) {
  cache = v;
  try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS nedostupné */ }
  posluchaci.forEach((f) => f());
}
export function useVidea(): VideoOrg[] { return useSyncExternalStore(subscribe, nacitajVidea); }

/** videá nahraté v aktuálnom kalendárnom mesiaci (na limit programu) */
export function videiTentoMesiac(v: VideoOrg[], teraz: number): number {
  const d = new Date(teraz);
  return v.filter((x) => !x.id.startsWith("seed-") && new Date(x.datum).getMonth() === d.getMonth() && new Date(x.datum).getFullYear() === d.getFullYear()).length;
}

/** položky záložky Video na verejnom profile — len označené „na profile" a v limite programu */
export function videaNaProfil(tier: Tier): Polozka[] {
  return nacitajVidea().filter((v) => v.naProfile).slice(0, VIDEO_ORG_CFG.naProfile[tier]).map((v) => ({
    emoji: "🎬", titul: v.titul, popis: v.popis,
    video: { nahlad: v.nahlad ?? "", dlzka: v.dlzka, zbierkaId: v.zbierkaId, src: v.src },
  }));
}
