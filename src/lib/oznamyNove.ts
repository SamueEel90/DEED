// ============================================================
// KARTA 40 · Oznamy charity (nový oznam — jeden pre celú appku, nahrádza starý rola/Oznamy.tsx).
// Tri druhy: Oznam (od P1, profil + sledujúci o 5 min) · Oznam vo verejnom záujme (od P1, nástenka mesta
// hneď, akcia najviac 2 mesiace dopredu) · Výzva na súrnu pomoc (všetky programy, nástenka hneď, najviac 10 dní).
// Forma: text a fotky (textové polia + galéria) alebo vlastný plagát. Pozvať ľudí: bez · nezáväzne · záväzne.
// DB: oznam_charity (migrácia 0033). Bez DB drží appka oznamy v pamäti relácie.
// TODO (server): oznámenie sledujúcim po 5 min, správy prihláseným (zmena, zrušenie, pripomienka),
// nástenka mesta a kalendár (len kto má povolené akcie mesta / štvrte alebo sleduje charitu).
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import type { MediumZbierky } from "./novaZbierka";

export type DruhOznamu = "oznam" | "verejny" | "vyzva";
export type FormaOznamu = "text" | "plagat";
export type Pozvanie = "bez" | "nezavazne" | "zavazne";
export const KATEGORIE_OZNAMU = ["Komunita", "Šport", "Kultúra", "Organizujeme", "Vzdelávanie"] as const;

export const OZNAMY_CFG = {
  textZnakov: 600,
  /** oznam: sledujúcim ide oznámenie až po X minútach — dovtedy sa dá upraviť alebo zrušiť */
  oneskorenieMin: 5,
  /** akcia vo verejnom záujme najviac X dní dopredu (2 mesiace) */
  akciaDniDopredu: 61,
  /** výzva najviac X dní */
  vyzvaDni: 10,
  /** naraz bežiace verejné oznamy v cene; ďalší za X € (výzva sa nepočíta) */
  verejneNaraz: 3, cenaNadLimit: 20,
  /** od ktorého programu (tier) — výzva vo všetkých */
  odTieru: { oznam: 1, verejny: 1, vyzva: 0 } as Record<DruhOznamu, number>,
};

export interface Plagat { src: string; typ: "img" | "pdf"; nazov: string; w?: number; h?: number }
export interface OznamCharity {
  id: string; stranka: string; druh: DruhOznamu; forma: FormaOznamu;
  nadpis: string;
  /** textové polia (HTML); pri plagáte krátky popis, nepovinný */
  text: string;
  media: MediumZbierky[];
  plagat?: Plagat;
  kategoria?: (typeof KATEGORIE_OZNAMU)[number];
  /** akcia: deň (YYYY-MM-DD) a čas (HH:MM, nepovinný); výzva: pomoc treba do (YYYY-MM-DD) */
  datum?: string; cas?: string; miesto?: string;
  pozvanie: Pozvanie; limit?: number;
  /** „Pri akcii zbierame na …" — len odkaz */
  zbierka?: { id: string; nazov: string };
  zverejnene: string; upravene?: string; zrusene?: string;
  /** zmena dátumu / miesta po zverejnení → správa prihláseným */
  zmenaPrihlasenym?: string;
  /** 4. a ďalší verejný oznam naraz — zaplatený nad limit */
  nadLimit?: boolean;
  prihlaseni: { meno: string; cas: string }[];
  zucastniSa: number;
}
export interface NastaveniaOznamov { pripomienka: boolean; spravaPriZmene: boolean }

// ---- pamäť relácie + odber zmien ----
const pamat = new Map<string, OznamCharity[]>();
const nast = new Map<string, NastaveniaOznamov>();
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyOznamovCharity = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);

export const oznamyStranky = (stranka: string): OznamCharity[] => [...(pamat.get(stranka) ?? [])].sort((a, b) => b.zverejnene.localeCompare(a.zverejnene));
export const nastaveniaOznamov = (stranka: string): NastaveniaOznamov => nast.get(stranka) ?? { pripomienka: true, spravaPriZmene: true };
export function ulozNastaveniaOznamov(stranka: string, n: NastaveniaOznamov) { nast.set(stranka, n); zmena(); }

export async function nacitajOznamyStranky(stranka: string): Promise<OznamCharity[]> {
  if (supabase) {
    const { data, error } = await supabase.from("oznam_charity").select("data").eq("stranka", stranka);
    if (!error && data) { pamat.set(stranka, data.map((r) => r.data as OznamCharity)); zmena(); }
  }
  return oznamyStranky(stranka);
}
async function zapis(o: OznamCharity) {
  const l = pamat.get(o.stranka) ?? [];
  pamat.set(o.stranka, l.some((x) => x.id === o.id) ? l.map((x) => (x.id === o.id ? o : x)) : [o, ...l]);
  zmena();
  if (supabase) await supabase.from("oznam_charity").upsert({ id: o.id, stranka: o.stranka, druh: o.druh, data: o, zverejnene: o.zverejnene, zrusene: o.zrusene ?? null }, { onConflict: "id" });
}

// ---- pravidlá ----
const DEN = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const dnesIso = () => iso(new Date());
export const maxAkcia = () => iso(new Date(Date.now() + OZNAMY_CFG.akciaDniDopredu * DEN));
export const maxVyzva = () => iso(new Date(Date.now() + OZNAMY_CFG.vyzvaDni * DEN));
/** oznam je ešte v 5-minútovej lehote — sledujúcim nič neprišlo, dá sa upraviť / zrušiť bez stopy */
export const vLehote = (o: OznamCharity, teraz = Date.now()) => o.druh === "oznam" && !o.zrusene && teraz - Date.parse(o.zverejnene) < OZNAMY_CFG.oneskorenieMin * 60000;
/** beží = nezrušený a ešte nie po dátume (akcia / výzva) */
export const bezi = (o: OznamCharity, dnes = dnesIso()) => !o.zrusene && (!o.datum || o.druh === "oznam" || o.datum >= dnes);
export const beziaceVerejne = (stranka: string) => oznamyStranky(stranka).filter((o) => o.druh === "verejny" && bezi(o));

export async function zverejniOznam(o: Omit<OznamCharity, "id" | "zverejnene" | "prihlaseni" | "zucastniSa">): Promise<OznamCharity> {
  const n: OznamCharity = { ...o, id: `oz-${Date.now().toString(36)}`, zverejnene: new Date().toISOString(), prihlaseni: [], zucastniSa: 0 };
  await zapis(n);
  return n;
}
/** úprava po zverejnení — „upravené"; zmena dátumu alebo miesta → správa prihláseným (ak je zapnutá) */
export async function upravOznamCharity(stary: OznamCharity, z: Partial<OznamCharity>): Promise<OznamCharity> {
  const n: OznamCharity = { ...stary, ...z };
  const zmenaKdeKedy = (z.datum !== undefined && z.datum !== stary.datum) || (z.cas !== undefined && z.cas !== stary.cas) || (z.miesto !== undefined && z.miesto !== stary.miesto);
  if (!vLehote(stary)) n.upravene = new Date().toISOString();
  if (zmenaKdeKedy && (stary.prihlaseni.length || stary.zucastniSa) && nastaveniaOznamov(stary.stranka).spravaPriZmene) n.zmenaPrihlasenym = new Date().toISOString();
  await zapis(n);
  return n;
}
/** zrušiť akciu → „Zrušené" + správa všetkým prihláseným; oznam v 5-min lehote zmizne úplne */
export async function zrusOznamCharity(o: OznamCharity) {
  if (vLehote(o)) { pamat.set(o.stranka, (pamat.get(o.stranka) ?? []).filter((x) => x.id !== o.id)); zmena(); if (supabase) await supabase.from("oznam_charity").delete().eq("id", o.id); return; }
  await zapis({ ...o, zrusene: new Date().toISOString() });
}
/** DEV — prihlásenie / účasť na skúšku (v produkcii klik človeka pri ozname) */
export async function simulujUcast(o: OznamCharity) {
  const MENA = ["Jana K.", "Peter M.", "Lucia B.", "Martin Š.", "Eva H.", "Tomáš R."];
  if (o.pozvanie === "zavazne") { if (o.limit && o.prihlaseni.length >= o.limit) return; await zapis({ ...o, prihlaseni: [...o.prihlaseni, { meno: MENA[o.prihlaseni.length % MENA.length], cas: new Date().toISOString() }] }); }
  else if (o.pozvanie === "nezavazne") await zapis({ ...o, zucastniSa: o.zucastniSa + 1 });
}
