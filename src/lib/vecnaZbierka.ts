// ============================================================
// OPRAVY 320 · Vecná zbierka farnosti — zbierka vecí (oblečenie, potraviny, drogéria), bez platobného modulu.
// Zbierky = pole v stave farnosti (naboz_stav, oblasť „vecne“, id = stránka) — ako ostatný obsah stránky.
// Dary = riadky na serveri (vecny_dar, 0100): kto sa zapísal, kedy, prípadne približná hodnota (len pre informáciu).
// Čo sa počíta (počet darcov, hodnota spolu), číta sa zo servera (vecne_dary), nikdy sa nevymýšľa.
// Bez DB (mock) dary v localStorage zariadenia.
// ============================================================
import { ADRESA } from "@/lib/adresa";
import { useEffect, useSyncExternalStore } from "react";
import { nacitajStav, ulozStavIsto, obnovOblast } from "@/features/viera/stav";
import { supabase } from "./supabase";
import { bezDataUrl } from "./uploadFoto";
import { klucNaSlug } from "./testProfily";
import type { MediumZbierky } from "./novaZbierka";

export interface PodakovanieVecnej { popis: string; popis2: string; media: MediumZbierky[]; ulozene?: number; zmazane?: number; /** OPRAVY 320: darcom poslané upozornenie (0101) */ poslane?: number; poslaneKomu?: number }
export interface VecnaZbierka {
  id: string; nazov: string; popis: string; popis2: string;
  co: string; kde: string; /** YYYY-MM-DD */ doKedy: string; organizuje: string;
  /** cieľ v hodnote € (nepovinné) */ ciel: number | null;
  /** ukazovať hodnotu darov na stránke — inak sa darca na hodnotu ani nepýta */ ukazHodnotu: boolean;
  media: MediumZbierky[];
  /** plagát: S fotkou / Bez fotky · text na plagáte (najviac 3 riadky) */ plagatFoto: boolean; plagatText: string;
  stav: "aktivna" | "ukoncena"; spustena: number; koniec?: number;
  podakovanie?: PodakovanieVecnej;
}
export interface DarVecny { meno: string; hodnota: number | null; cas: number; moj?: boolean }
export interface PrehladDarov { pocet: number; ludi: number; spolu: number | null; darcovia: DarVecny[] }

let verzia = 0;
const posl = new Set<() => void>();
const zmena = () => { verzia++; posl.forEach((f) => f()); };
export function useZmenyVecnych(): number { return useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => verzia); }

export const vecneZbierky = (stranka: string): VecnaZbierka[] => nacitajStav<VecnaZbierka[]>("vecne", stranka, []);
export const vecnaZbierka = (stranka: string, id: string) => vecneZbierky(stranka).find((z) => z.id === id) ?? null;
export const fotoVecnej = (z: VecnaZbierka) => z.media.find((m) => m.typ === "foto")?.src;
/** QR na plagáte: stránka farnosti a hneď okno „Darovali ste?“ */
export const odkazVecnej = (stranka: string, id: string) => `${ADRESA}/p/${klucNaSlug(stranka)}?vz=${encodeURIComponent(id)}`;

/** pri otvorení stránky / Správy stiahni čerstvé vecné zbierky farnosti */
export function useVecneZbierky(stranka: string): VecnaZbierka[] {
  useZmenyVecnych();
  useEffect(() => { let ziva = true; void obnovOblast("vecne", stranka).then((ok) => { if (ok && ziva) zmena(); }, () => undefined); return () => { ziva = false; }; }, [stranka]);
  return vecneZbierky(stranka);
}

/** uloženie celej zbierky (nová alebo zmena) — najprv čerstvý zoznam zo servera, potom zápis; vráti chybu alebo null */
export async function ulozVecnu(stranka: string, z: VecnaZbierka): Promise<string | null> {
  let x = z;
  try { x = await bezDataUrl(z, "zbierky"); } catch { return "Fotky sa nepodarilo nahrať. Skontrolujte pripojenie a skúste znova."; }
  await obnovOblast("vecne", stranka).catch(() => false);
  const l = vecneZbierky(stranka);
  const e = await ulozStavIsto("vecne", stranka, l.some((y) => y.id === x.id) ? l.map((y) => (y.id === x.id ? x : y)) : [x, ...l]);
  zmena();
  return e;
}
export const noveIdVecnej = () => `vz-${Date.now().toString(36)}`;

// ---- dary ----
const klucDarov = (stranka: string, id: string) => `deed.vecne.dary.${stranka}.${id}`;
const lokDary = (stranka: string, id: string): DarVecny[] => { try { return JSON.parse(localStorage.getItem(klucDarov(stranka, id)) || "[]") as DarVecny[]; } catch { return []; } };
const prehlady = new Map<string, PrehladDarov>();
const PRAZDNY: PrehladDarov = { pocet: 0, ludi: 0, spolu: null, darcovia: [] };
export const prehladZPamate = (stranka: string, id: string): PrehladDarov => prehlady.get(`${stranka}|${id}`) ?? PRAZDNY;

export async function nacitajDary(stranka: string, z: VecnaZbierka): Promise<PrehladDarov> {
  let p: PrehladDarov;
  if (supabase) {
    const { data, error } = await supabase.rpc("vecne_dary", { p_stranka: stranka, p_zbierka: z.id });
    if (error || !data) return prehladZPamate(stranka, z.id);
    const d = data as { pocet: number; ludi: number; spolu: number | null; darcovia: { meno: string; hodnota: number | null; cas: string }[] };
    p = { pocet: d.pocet, ludi: d.ludi, spolu: d.spolu, darcovia: (d.darcovia ?? []).map((r) => ({ meno: r.meno, hodnota: r.hodnota, cas: Date.parse(r.cas) })) };
  } else {
    const vsetky = lokDary(stranka, z.id);
    // OPRAVY 362: moje zápisy = jeden riadok (posledné meno, súčet hodnôt), ako na serveri (0111)
    const moje = vsetky.filter((r) => r.moj);
    const l = moje.length ? [{ ...moje[0], hodnota: moje.some((r) => r.hodnota != null) ? moje.reduce((a, r) => a + (r.hodnota ?? 0), 0) : null }, ...vsetky.filter((r) => !r.moj)].sort((x, y) => y.cas - x.cas) : vsetky;
    p = { pocet: vsetky.length, ludi: l.length, spolu: z.ukazHodnotu ? l.reduce((a, r) => a + (r.hodnota ?? 0), 0) : null, darcovia: z.ukazHodnotu ? l : l.map((r) => ({ ...r, hodnota: null })) };
  }
  prehlady.set(`${stranka}|${z.id}`, p); zmena();
  return p;
}
export function usePrehladDarov(stranka: string, z: VecnaZbierka | null): PrehladDarov {
  useZmenyVecnych();
  useEffect(() => { if (z) void nacitajDary(stranka, z); }, [stranka, z?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return z ? prehladZPamate(stranka, z.id) : PRAZDNY;
}

/** darca sa zapíše (Podržte · daroval som) — len prihlásený; hodnota len keď ju farár ukazuje. Vráti chybu alebo null. */
export async function zapisDar(stranka: string, z: VecnaZbierka, meno: string, hodnota: number | null): Promise<string | null> {
  const h = z.ukazHodnotu && hodnota != null && hodnota > 0 ? Math.round(hodnota * 100) / 100 : null;
  if (supabase) {
    const { error } = await supabase.rpc("vecny_dar_zapis", { p_stranka: stranka, p_zbierka: z.id, p_meno: meno, p_hodnota: h });
    if (error) {
      const m = error.message || "";
      return /neprihlaseny/.test(m) ? "Bez prihlásenia sa zapísať nedá. Prihláste sa a skúste znova."
        : /ukoncena|neexistuje/.test(m) ? "Táto zbierka už skončila. Zapísať sa nedá."
        : "Zapísať sa nepodarilo. Skontrolujte pripojenie a skúste znova.";
    }
  } else {
    try { localStorage.setItem(klucDarov(stranka, z.id), JSON.stringify([{ meno, hodnota: h, cas: Date.now(), moj: true }, ...lokDary(stranka, z.id)].slice(0, 500))); }
    catch { return "Na zariadení nie je miesto. Uvoľnite miesto a skúste znova."; }
  }
  await nacitajDary(stranka, z);
  return null;
}

/** plagát: text predvyplnený z polí Čo · Kde · Do kedy */
const DNI_GEN = ["nedele", "pondelka", "utorka", "stredy", "štvrtka", "piatka", "soboty"];
export function doKedyText(iso: string, genitiv = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); if (!m) return "";
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return `${genitiv ? `${DNI_GEN[d.getDay()]} ` : ""}${d.getDate()}. ${d.getMonth() + 1}.`;
}
export function textPlagatuZPoli(z: Pick<VecnaZbierka, "co" | "kde" | "doKedy">): string {
  const co = z.co.trim(), kde = z.kde.trim(), dk = doKedyText(z.doKedy);
  return [co ? co[0].toLocaleUpperCase("sk-SK") + co.slice(1) : "", kde, dk ? `do ${dk}` : ""].filter(Boolean).join(" · ");
}
export const zbierkaSkoncila = (z: VecnaZbierka) => z.stav === "ukoncena";

// ---- OPRAVY 320 doplnok: neprihlásený ťukol Prihlásiť sa → po prihlásení späť na zápis tej istej zbierky ----
const KLUC_ZAPIS = "deed.vecne.zapisPoPrihlaseni";
export function cakajZapisPoPrihlaseni(stranka: string, id: string) { try { sessionStorage.setItem(KLUC_ZAPIS, JSON.stringify({ stranka, id })); } catch { /* bez úložiska sa len nevráti */ } }
/** číta sa bez mazania (StrictMode volá inicializáciu dvakrát); zmaže zrusZapisPoPrihlaseni */
export function zapisPoPrihlaseni(stranka: string): string | null {
  try { const v = JSON.parse(sessionStorage.getItem(KLUC_ZAPIS) || "null") as { stranka: string; id: string } | null; return v && v.stranka === stranka ? v.id : null; } catch { return null; }
}
export function zrusZapisPoPrihlaseni() { try { sessionStorage.removeItem(KLUC_ZAPIS); } catch { /* LS */ } }

/** OPRAVY 320 doplnok (0101): poďakovanie darcom do zvončeka — raz za zbierku. Vráti počet príjemcov alebo chybu. */
export async function podakujDarcom(stranka: string, z: VecnaZbierka, text: string): Promise<{ n: number } | { e: string }> {
  if (!supabase) return { e: "Upozornenie darcom posiela server. V tejto verzii bez servera sa neposlalo." };
  const { data, error } = await supabase.rpc("vecna_podakuj", { p_stranka: stranka, p_zbierka: z.id, p_text: text });
  if (error) return { e: /uz_poslane/.test(error.message) ? "Darcom ste už poďakovanie poslali." : /nie_spravca/.test(error.message) ? "Poďakovanie posiela len správca stránky." : "Upozornenie darcom sa nepodarilo poslať. Skúste to znova." };
  return { n: Number(data) || 0 };
}
