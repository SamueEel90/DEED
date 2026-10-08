// KARTA 33 · OPRAVY 106 — profil stránky (Upraviť profil): KONCEPT a ULOŽENÝ profil v účte organizácie
// (tabuľka profil_stranky, migrácia 0028). Nič z toho nejde do prehliadača (localStorage).
// Bez DB spojenia (mock/offline) appka drží profil len v pamäti relácie.
import { bezDataUrl } from "./uploadFoto";
import { supabase } from "./supabase";
import type { Kontakt } from "@/features/rola/kontakt";
import type { TvarLoga } from "@/features/rola/stav";
import type { LogoRezim, LogoPozadie } from "./obrazok";

/** rám titulnej fotky (karta 33 bod 5) */
export type RamFotky = "bez" | "br" | "bb" | "zb";
/** výrez titulnej fotky — ukladá sa mierka a posun, nie orezaný obrázok (mobil = PC) */
export interface VyrezFotky { rezim: "cela" | "vyrez"; zoom: number; x: number; y: number }
export interface TitulnaFotka { src: string; w: number; h: number; priemer: string; vyrez: VyrezFotky }

export interface ProfilStranky {
  onas: string;          // hlavný text (HTML z editora), najviac 12 riadkov
  onas2: string;         // pokračovanie — ukáže sa po „viac"
  kontakt: Kontakt;
  logo: string | null;
  tvar: TvarLoga;
  logoRezim: LogoRezim;
  logoPozadie: LogoPozadie;
  cover: TitulnaFotka | null;
  ram: RamFotky;
  /** KARTA 56D §4 (farnosť): názov stránky — predvyplnený z registrácie, dá sa zmeniť */
  meno?: string;
  /** KARTA 56D §4: „Nemám logo" → znak z iniciál (najviac 3 písmená) s rámikom */
  bezLoga?: boolean;
  inicialy?: string;
  ramLoga?: RamFotky;
}
export interface ProfilZaznam { koncept: ProfilStranky | null; konceptCas: string | null; ulozeny: ProfilStranky | null }

const pamat = new Map<string, ProfilZaznam>();
const prazdny: ProfilZaznam = { koncept: null, konceptCas: null, ulozeny: null };
export const profilZPamate = (stranka: string): ProfilZaznam => pamat.get(stranka) ?? prazdny;

export async function nacitajProfil(stranka: string): Promise<ProfilZaznam> {
  if (supabase) {
    const { data, error } = await supabase.from("profil_stranky").select("koncept, koncept_cas, ulozeny").eq("stranka", stranka).maybeSingle();
    if (!error && !data) {
      // nie som správca (RLS) → uložený profil z verejného pohľadu (0059, bez účtu)
      const v = await supabase.from("profil_stranky_verejny").select("ulozeny").eq("stranka", stranka).maybeSingle();
      if (!v.error) { const z: ProfilZaznam = { koncept: null, konceptCas: null, ulozeny: (v.data?.ulozeny as ProfilStranky | null) ?? null }; pamat.set(stranka, z); return z; }
    }
    if (!error) {
      const z: ProfilZaznam = { koncept: (data?.koncept as ProfilStranky | null) ?? null, konceptCas: (data?.koncept_cas as string | null) ?? null, ulozeny: (data?.ulozeny as ProfilStranky | null) ?? null };
      pamat.set(stranka, z); return z;
    }
  }
  return profilZPamate(stranka);
}

/** koncept — volá sa automaticky 600 ms po poslednej zmene */
export async function ulozKoncept(stranka: string, p: ProfilStranky): Promise<string> {
  const cas = new Date().toISOString();
  pamat.set(stranka, { ...profilZPamate(stranka), koncept: p, konceptCas: cas });
  if (supabase) await supabase.from("profil_stranky").upsert({ stranka, koncept: await bezDataUrl(p, "stranky"), koncept_cas: cas }, { onConflict: "stranka" });
  return cas;
}

/** Uložiť profil — zverejní koncept, koncept sa zahodí. Pri chybe DB (napr. nie som správca) hodí chybu. */
export async function zverejniProfil(stranka: string, p: ProfilStranky): Promise<void> {
  const cas = new Date().toISOString();
  if (supabase) {
    const { error } = await supabase.from("profil_stranky").upsert({ stranka, ulozeny: await bezDataUrl(p, "stranky"), ulozeny_cas: cas, koncept: null, koncept_cas: null }, { onConflict: "stranka" });
    if (error) throw new Error(error.message);
  }
  pamat.set(stranka, { koncept: null, konceptCas: null, ulozeny: p });
}

/** KARTA 56D §1: názov stránky bez čiarky a bodky na konci (farnosť si ho môže zmeniť v Upraviť profil) */
export const cistyNazov = (s?: string | null) => (s ?? "").trim().replace(/[\s,.;:–-]+$/, "");

// ---- percento profilu (karta 33 bod 6) — zo 4 vecí po 25 %, z ULOŽENÉHO profilu ----
const text = (h?: string | null) => String(h ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
export function maKontakt(k?: Kontakt | null): boolean {
  if (!k) return false;
  return !!(k.adresaVerejna.trim() || k.web.trim() || k.telefony.some((t) => t.cislo.trim()) || k.emaily.some((e) => e.adresa.trim()) || Object.values(k.siete).some((v) => (v ?? "").trim()));
}
export function uplnostProfilu(p: ProfilStranky | null, kontaktZRegistracie?: Kontakt): { pct: number; chyba: string } {
  const pol: [string, boolean][] = [
    ["logo", !!p?.logo || (!!p?.bezLoga && !!p.inicialy?.trim())], ["titulná fotka", !!p?.cover], ["O nás", !!text(p?.onas)], ["kontakt", maKontakt(p?.kontakt ?? kontaktZRegistracie)],
  ];
  const ch = pol.filter(([, ok]) => !ok).map(([n]) => n);
  const pct = (4 - ch.length) * 25;
  const zoznam = ch.length <= 1 ? ch.join("") : `${ch.slice(0, -1).join(", ")} a ${ch[ch.length - 1]}`;
  return { pct, chyba: ch.length ? `Chýba ${zoznam}.` : "Profil je hotový." };
}

// ---- OPRAVY 121: úvod „Veríme vám" — raz pred prvým skutkom (a prvou zbierkou) charity, Rozumiem → už nikdy.
// Ukladá sa do účtu stránky (profil_stranky.uvod, migrácia 0029); dočasne aj príznak v prehliadači (nižšie).
export type UvodStranky = "skutok" | "zbierka";
const uvodPamat = new Map<string, Partial<Record<UvodStranky, string>>>();
// Dočasne (kým server neukladá profil_stranky.uvod spoľahlivo) aj príznak v prehliadači podľa strankaId —
// jeden pre charitu, zdieľa ho Pridať skutok aj Nová zbierka (ten istý text „Veríme vám").
const lsKluc = (stranka: string) => `deed.verimeVam.${stranka}`;
const lsUvod = (stranka: string): string | null => { try { return localStorage.getItem(lsKluc(stranka)); } catch { return null; } };
export const uvodZPamate = (stranka: string, co: UvodStranky): boolean => !!uvodPamat.get(stranka)?.[co] || !!lsUvod(stranka);
export async function nacitajUvod(stranka: string): Promise<Partial<Record<UvodStranky, string>>> {
  const lokal = lsUvod(stranka);
  const spoj = (u: Partial<Record<UvodStranky, string>>) => (lokal ? { skutok: u.skutok ?? lokal, zbierka: u.zbierka ?? lokal } : u);
  if (supabase) {
    const { data, error } = await supabase.from("profil_stranky").select("uvod").eq("stranka", stranka).maybeSingle();
    if (!error) { const u = spoj({ ...(uvodPamat.get(stranka) ?? {}), ...((data?.uvod as Partial<Record<UvodStranky, string>> | null) ?? {}) }); uvodPamat.set(stranka, u); return u; }
  }
  return spoj(uvodPamat.get(stranka) ?? {});
}
export async function potvrdUvod(stranka: string, co: UvodStranky): Promise<void> {
  const u = { ...(uvodPamat.get(stranka) ?? {}), [co]: new Date().toISOString() };
  uvodPamat.set(stranka, u);
  try { localStorage.setItem(lsKluc(stranka), u[co]!); } catch { /* bez úložiska ostane v pamäti relácie */ }
  if (supabase) await supabase.from("profil_stranky").upsert({ stranka, uvod: u }, { onConflict: "stranka" });
}
