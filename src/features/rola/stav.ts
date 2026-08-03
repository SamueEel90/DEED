// ============================================================
// ROLOVÉ PANELY (Charita · Tvorca · B2B) — stav rolí a tierov.
// Per DEED_Role_Panely_Sprava_v0_1 §0: jeden účet, rola pripnutá na účet;
// rolové panely sa PRIDÁVAJÚ navrch userovho základu. V DEV režime sa rola
// aj tier simulujú prepínačmi (žiadne oddelené registrácie) — v produkcii
// sa rola číta z overeného účtu a tier z fakturácie.
// Perzistencia = localStorage (rovnaký vzor ako viera/stav.ts).
// ============================================================
import type { OrgZbierka } from "./mock"; // type-only — bez runtime cyklu

export type Pozicia = "charita" | "tvorca" | "b2b";
export type Tier = 0 | 1 | 2;

// ---- feature flagy (DEV barličky — pred launchom odstrániť/vypnúť, §0.1/§0.1b) ----
export const FLAGS = {
  /** prepínač rolí Charita · Tvorca · B2B — v produkcii sa NEZOBRAZUJE */
  dev_role_switcher: true,
  /** prepínač tierov T0/T1/T2 (B2B: Free/STARTER/BUSINESS) — simulácia bez platby */
  dev_tier_switcher: true,
  /** otvorené (Dagmar): status tvorcu pri termináli — zatiaľ NEblokovať v kóde (§2.4) */
  terminal_requires_business_id: false,
};

// ---- placeholder čísla = config, nie hardcode (§4.6 — ceny/limity rieši Vitkovič) ----
export const KONFIG = {
  /** limit súbežných zbierok charity podľa tieru (T1/T2 = placeholder) */
  limitZbierok: { 0: 1, 1: 3, 2: 10 } as Record<Tier, number>,
  /** lehota dokladovania po ukončení zbierky (placeholder X dní, §1.4) */
  lehotaDokladovaniaDni: 30,
  /** počet delegovaných správcov B2B podľa tieru (§3.1) */
  spravcoviaB2B: { 0: 1, 1: 2, 2: 5 } as Record<Tier, number>,
};

// ---- tierová mriežka — mapovanie na existujúce cenníky (§0.2, žiadny nový cenník) ----
export const POZICIE: { key: Pozicia; label: string; emoji: string }[] = [
  { key: "charita", label: "Charita", emoji: "💛" },
  { key: "tvorca", label: "Tvorca", emoji: "🎬" },
  { key: "b2b", label: "B2B", emoji: "🏢" },
];
export const TIER_LABEL: Record<Pozicia, [string, string, string]> = {
  charita: ["T0", "T1", "T2"],
  tvorca: ["T0", "T1", "T2"],
  b2b: ["Free", "STARTER", "BUSINESS"], // = B2B Master §6 (ENTERPRISE mimo záber)
};
export const TIER_POPIS: Record<Pozicia, [string, string, string]> = {
  charita: ["profil a jedna zbierka", "viac súbežných zbierok a kalendár", "plné nástroje vrátane dobrovoľníkov a reportov"],
  tvorca: ["profil a reťaze", "príspevky, oznamy a štatistiky", "akcie, QR a overené smeny"],
  b2b: ["verifikácia a základná vizitka", "tímové funkcie a odmeny", "plné firemné nástroje a ESG"],
};
/** rola pripnutá na účet (§1.1/§2.1/§3.1) — názvy rolí pre správu/labely */
export const ROLA_UCTU: Record<Pozicia, string> = {
  charita: "charity_admin", tvorca: "creator", b2b: "company_admin",
};

// ---- mock perzistencia (localStorage) — namespace deed.rola.* ----
function nacitaj<T>(kluc: string, fallback: T): T {
  try { const s = localStorage.getItem(kluc); return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}
function uloz(kluc: string, val: unknown) {
  try { localStorage.setItem(kluc, JSON.stringify(val)); } catch { /* LS nedostupné */ }
}
const kluc = (oblast: string) => `deed.rola.${oblast}`;

export const nacitajPoziciu = (): Pozicia => nacitaj<Pozicia>(kluc("pozicia"), "charita");
export const ulozPoziciu = (p: Pozicia) => uloz(kluc("pozicia"), p);

/** tier per rola — v DEV drží lokálny stav/config, v produkcii sa číta z fakturácie (§0.1b) */
export const nacitajTiery = (): Record<Pozicia, Tier> => nacitaj(kluc("tiery"), { charita: 0, tvorca: 0, b2b: 0 } as Record<Pozicia, Tier>);
export const ulozTiery = (t: Record<Pozicia, Tier>) => uloz(kluc("tiery"), t);

/** DEV: som držiteľ roly? (sekcia SPRÁVA viditeľná len role — §0 bod 3) */
export const nacitajDrzitel = (): boolean => nacitaj(kluc("drzitel"), true);
export const ulozDrzitel = (d: boolean) => uloz(kluc("drzitel"), d);

// ---- dokladovanie zbierky (§1.4 — POVINNÉ, netierované) ----
export interface DokladZbierky {
  nazov: string;   // bloček / faktúra / foto
  popis: string;   // krátky popis použitia
  suma: number;    // €
  datum: string;   // ISO
}
export const nacitajDoklady = (zbierkaId: string): DokladZbierky[] =>
  nacitaj<DokladZbierky[]>(kluc(`doklady.${zbierkaId}`), []);
export const ulozDoklady = (zbierkaId: string, d: DokladZbierky[]) =>
  uloz(kluc(`doklady.${zbierkaId}`), d);

/** verejný stav dokladovania: „doložené X % použitia" (transparentnosť per prípad — nikdy platená) */
export function percentoDolozene(doklady: DokladZbierky[], vyzbierane: number): number {
  if (!vyzbierane) return 0;
  const spolu = doklady.reduce((s, d) => s + d.suma, 0);
  return Math.min(100, Math.round((spolu / vyzbierane) * 100));
}

// ---- terminál tvorcu (zap/vyp — §2.4) ----
export const nacitajTerminal = (): boolean => nacitaj(kluc("terminal"), false);
export const ulozTerminal = (on: boolean) => uloz(kluc("terminal"), on);

// ---- logo subjektu (PATCH 2 §6) — štvorcový avatar entity (charita, B2B; tvorca
// logo nepotrebuje — má profilovú fotku osoby). Fallback bez loga = iniciálky. ----
export const nacitajLogo = (p: Pozicia): string | null => nacitaj<string | null>(kluc(`logo.${p}`), null);
export const ulozLogo = (p: Pozicia, dataUrl: string | null) => uloz(kluc(`logo.${p}`), dataUrl);

// ---- zbierky vytvorené v správe charity navyše k mocku (limit per tier §1.3) ----
export const nacitajOrgExtra = (): OrgZbierka[] => nacitaj<OrgZbierka[]>(kluc("orgzbierky"), []);
export const ulozOrgExtra = (z: OrgZbierka[]) => uloz(kluc("orgzbierky"), z);
