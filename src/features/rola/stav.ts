// ============================================================
// ROLOVÉ PANELY (Charita · Tvorca · B2B) — stav rolí a tierov.
// Per DEED_Role_Panely_Sprava_v0_1 §0: jeden účet, rola pripnutá na účet;
// rolové panely sa PRIDÁVAJÚ navrch userovho základu. V DEV režime sa rola
// aj tier simulujú prepínačmi (žiadne oddelené registrácie) — v produkcii
// sa rola číta z overeného účtu a tier z fakturácie.
// Perzistencia = localStorage (rovnaký vzor ako viera/stav.ts).
// ============================================================
import type { SadaEur, SadaEurc } from "@/lib/sadyDarov";
import type { OrgZbierka } from "./mock"; // type-only — bez runtime cyklu

export type Pozicia = "charita" | "tvorca" | "b2b";
export type Tier = 0 | 1 | 2 | 3 | 4;

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
  limitZbierok: { 0: 1, 1: 5, 2: 10, 3: 9999, 4: 9999 } as Record<Tier, number>, // cenník charity: 1 · 5 · 10 · bez limitu (OPRAVY 87, mimo centrálnej)
  /** lehota dokladovania po ukončení zbierky (placeholder X dní, §1.4) */
  lehotaDokladovaniaDni: 30,
  /** počet delegovaných správcov B2B podľa tieru (§3.1) */
  spravcoviaB2B: { 0: 1, 1: 1, 2: 1, 3: 2, 4: 5 } as Record<Tier, number>,
  /** KARTA 39 · bod 1: dlhodobá zbierka vo feede. Prah „živá" sa bude počítať podľa aktívnych v oblasti — stupne doladíme s dátami. */
  dlhodoba: {
    /** prvých X dní veľká karta vo feede */
    velkaDni: 30,
    /** živá = aspoň `dary` darov za posledných `dni` dní (začiatok; neskôr podľa aktívnych v oblasti) */
    prah: { dary: 3, dni: 30 },
    /** priebežné doloženie vytiahne zbierku hore na X hodín, najviac raz za Y dní */
    horeHodin: 24, vytiahnutieKazdychDni: 30,
  },
};

// ---- tierová mriežka — mapovanie na existujúce cenníky (§0.2, žiadny nový cenník) ----
export const POZICIE: { key: Pozicia; label: string; emoji: string }[] = [
  { key: "charita", label: "Charita", emoji: "💛" },
  { key: "tvorca", label: "Tvorca", emoji: "🎬" },
  { key: "b2b", label: "B2B", emoji: "🏢" },
];
// 5 stupňov: ZADARMO + T1–T4. BUSINESS a ENTERPRISE (firmy) prídu neskôr.
type Paterica = [string, string, string, string, string];
export const TIER_LABEL: Record<Pozicia, Paterica> = {
  charita: ["ZADARMO", "T1", "T2", "T3", "T4"],
  tvorca: ["ZADARMO", "T1", "T2", "T3", "T4"],
  b2b: ["ZADARMO", "T1", "T2", "T3", "T4"],
};
export const TIER_POPIS: Record<Pozicia, Paterica> = {
  charita: ["profil a jedna zbierka pre niekoho", "viac súbežných zbierok", "viac zbierok a akcie", "plné nástroje", "bez limitov"],
  tvorca: ["profil, reťaz a jedna zbierka", "vlastná stránka, podporovatelia · 30 €", "akcie a sponzoring · 60 €", "tím a overený sponzoring · 120 €", "redakčné kontá, bez limitov · 240 €"],
  b2b: ["profil a darovanie", "živnostník · 15 €", "firma s prevádzkou · 30 €", "firma so zamestnancami · 50 €", "firma 10–50 ľudí · 100 €"],
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

// ---- hlavička správy zmenšená (na mobile šetrí miesto) ----
export const nacitajHlavuZbalenu = (): boolean => nacitaj(kluc("hlavaZbalena"), false);
export const ulozHlavuZbalenu = (z: boolean) => uloz(kluc("hlavaZbalena"), z);

// ---- čo je v krúžku profilu: fotka osoby alebo logo (tvorca si vyberá — môže mať značku) ----
export type ZdrojAvatara = "foto" | "logo";
export const nacitajZdrojAvatara = (p: Pozicia): ZdrojAvatara =>
  p === "tvorca" ? nacitaj<ZdrojAvatara>(kluc(`avatar.${p}`), "foto") : "logo";
export const ulozZdrojAvatara = (p: Pozicia, z: ZdrojAvatara) => uloz(kluc(`avatar.${p}`), z);

// ---- charita: prijíma dary v krypte (EURC)? platí pre všetky jej zbierky ----
export const nacitajKryptoOrg = (p: Pozicia): boolean => nacitaj(kluc(`krypto.${p}`), true);
export const ulozKryptoOrg = (p: Pozicia, v: boolean) => uloz(kluc(`krypto.${p}`), v);
// ---- sady rýchlych súm (eurá + EURC), ktoré si vybral príjemca ----
export const nacitajSady = (p: Pozicia): { eur: SadaEur; eurc: SadaEurc } => nacitaj(kluc(`sady.${p}`), { eur: "drobne", eurc: "mikro" } as { eur: SadaEur; eurc: SadaEurc });
export const ulozSady = (p: Pozicia, v: { eur: SadaEur; eurc: SadaEurc }) => uloz(kluc(`sady.${p}`), v);
// ---- centrálna zbierka organizácie spustená (nastavenie zo správy) ----
export const nacitajCentralnu = (p: Pozicia): boolean => nacitaj(kluc(`centralna.${p}`), false);
export const ulozCentralnu = (p: Pozicia, v: boolean) => uloz(kluc(`centralna.${p}`), v);

// ---- tvar loga (kruh/štvorec) — vyberá si subjekt v Upraviť profil ----
export type TvarLoga = "kruh" | "stvorec";
export const nacitajTvarLoga = (p: Pozicia): TvarLoga => nacitaj<TvarLoga>(kluc(`logotvar.${p}`), "kruh");
export const ulozTvarLoga = (p: Pozicia, t: TvarLoga) => uloz(kluc(`logotvar.${p}`), t);

// ---- O nás (formátovaný text z editora, max 800 znakov) — null = pôvodný text z mocku ----
export const ONAS_MAX = 800;
export const nacitajOnas = (p: Pozicia): string | null => nacitaj<string | null>(kluc(`onas.${p}`), null);
export const ulozOnas = (p: Pozicia, html: string | null) => uloz(kluc(`onas.${p}`), html);

// ---- bankový účet organizácie z registrácie (organizacie.bankovy_ucet) ----
// Centrálna zbierka ho len zobrazuje — mení sa v profile organizácie, nie v zbierke.
export const nacitajIbanOrg = (p: Pozicia): string => nacitaj<string>(kluc(`iban.${p}`), "");
export const ulozIbanOrg = (p: Pozicia, v: string) => uloz(kluc(`iban.${p}`), v);

// ---- zbierky vytvorené v správe charity navyše k mocku (limit per tier §1.3) ----
export const nacitajOrgExtra = (): OrgZbierka[] => nacitaj<OrgZbierka[]>(kluc("orgzbierky"), []);
export const ulozOrgExtra = (z: OrgZbierka[]) => uloz(kluc("orgzbierky"), z);

// ---- viditeľnosť súm na verejnom profile (charita, ZADARMO) ----
// stav zbierok (progres) je vždy verejný — to je základ dôvery; voliteľné je len toto:
export interface Viditelnost { hlavicka: boolean; sumyDarov: boolean }
export const nacitajViditelnost = (p: Pozicia): Viditelnost => nacitaj(kluc(`viditelnost.${p}`), { hlavicka: true, sumyDarov: true });
export const ulozViditelnost = (p: Pozicia, v: Viditelnost) => uloz(kluc(`viditelnost.${p}`), v);

// ============================================================
// KARTA 34 · Správa charity — povolenia z JEDNÉHO miesta.
// Program charity P1–P3 = tier 1–3 (logika tierov vyššie sa NEMENÍ, toto len číta tier).
// Každá položka správy má `od` — od ktorého programu ju charita má. Komponent nič nepovoľuje natvrdo.
// ============================================================
export type Program = "zadarmo" | "P1" | "P2" | "P3";
export const PROGRAM_TIER: Record<Program, Tier> = { zadarmo: 0, P1: 1, P2: 2, P3: 3 };
/** názov programu podľa tieru (štítok „od Px", riadok Program v paneli) */
export const PROGRAM_NAZOV: Record<Tier, string> = { 0: "Zadarmo", 1: "P1", 2: "P2", 3: "P3", 4: "P4" };
export type PolozkaSpravy =
  | "zbierky" | "centralna" | "dorovnanie" | "segment" | "materialne"
  | "skutky" | "video" | "oznamy" | "nastenka" | "upoutavky"
  | "darcovia" | "sledujuci" | "dobrovolnici" | "podujatia" | "sponzoring" | "inzeraty"
  | "qr" | "sektorqr" | "embed" | "prednost" | "statistiky" | "vypis" | "export"
  // KARTA 36: pobočky (zatiaľ bez obrazovky) a nástroje firmy
  | "pobocky" | "dorovnavanie" | "zamestnanci" | "esg" | "firemnyqr"
  // OPRAVY 118: Pridať skutok v Nástrojoch (od Zadarmo, bez limitu)
  | "pridatSkutok";
export const POVOLENIA_CHARITY: Record<PolozkaSpravy, { od: Program }> = {
  zbierky: { od: "zadarmo" }, centralna: { od: "P1" }, dorovnanie: { od: "P1" }, segment: { od: "P2" }, materialne: { od: "P3" },
  skutky: { od: "zadarmo" }, video: { od: "zadarmo" }, oznamy: { od: "P1" }, nastenka: { od: "P1" }, upoutavky: { od: "P2" },
  darcovia: { od: "zadarmo" }, sledujuci: { od: "zadarmo" }, dobrovolnici: { od: "P2" }, podujatia: { od: "P2" }, sponzoring: { od: "P1" }, inzeraty: { od: "P1" },
  qr: { od: "zadarmo" }, sektorqr: { od: "P2" }, embed: { od: "P1" }, prednost: { od: "P3" }, statistiky: { od: "zadarmo" }, vypis: { od: "zadarmo" }, export: { od: "P3" },
  pobocky: { od: "zadarmo" }, dorovnavanie: { od: "zadarmo" }, zamestnanci: { od: "zadarmo" }, esg: { od: "zadarmo" }, firemnyqr: { od: "zadarmo" },
  pridatSkutok: { od: "zadarmo" },
};
/** má charita s týmto tierom položku? (program) */
export const maPovolenie = (id: PolozkaSpravy, tier: Tier): boolean => tier >= PROGRAM_TIER[POVOLENIA_CHARITY[id].od];
/** OPRAVY 118: ukazuje sa len svoj program + 2 vyššie (Zadarmo nevidí P3 ani P4) — všade: menu, dlaždice, skupiny, pripnuté */
export const vidno = (od: Program, tier: Tier): boolean => PROGRAM_TIER[od] <= tier + 2;
export const vidnoPolozku = (id: PolozkaSpravy, tier: Tier): boolean => vidno(POVOLENIA_CHARITY[id].od, tier);

// ============================================================
// KARTA 36 · Typy profilov — jedna správa pre všetkých. Typ len VYPÍNA položky, PRIDÁVA nástroje a mení slová.
// Položka je viditeľná, keď ju povolí typ (nie je vo VYPNUTE) — program potom rozhodne, či je odomknutá.
// ============================================================
export type TypStranky = "charita" | "spolok" | "sport" | "umenie" | "skola" | "farnost" | "obec" | "nemocnica" | "firma" | "tvorca" | "ina";
export const TYP_NAZOV: Record<TypStranky, string> = {
  charita: "Charita / OZ", spolok: "Spolok", sport: "Športový klub", umenie: "Umelecký súbor", skola: "Škola", farnost: "Farnosť",
  obec: "Obec / mesto", nemocnica: "Nemocnica", firma: "Firma", tvorca: "Tvorca", ina: "Iná organizácia",
};
/** poradie typov (registrácia, testovacia lišta) */
export const TYPY_STRANOK: TypStranky[] = ["charita", "spolok", "sport", "umenie", "skola", "farnost", "obec", "nemocnica", "firma", "tvorca", "ina"];
/** v appke skryté (pripravené na fázu 2) */
export const TYP_SKRYTY: Partial<Record<TypStranky, true>> = { nemocnica: true };
/** čo typ VYPÍNA */
export const POVOLENIA_TYPU: Record<TypStranky, PolozkaSpravy[]> = {
  charita: [], obec: [], nemocnica: [], ina: [],
  spolok: ["segment", "sektorqr", "materialne", "pobocky"],
  sport: ["segment", "materialne"],
  umenie: ["segment", "materialne", "pobocky"],
  skola: ["inzeraty"],
  farnost: ["inzeraty", "segment", "sektorqr", "pobocky"],
  // firma: zbierky pre seba a pravidelná podpora (centrálna) zatiaľ vypnuté
  firma: ["zbierky", "centralna", "segment", "materialne"],
  tvorca: ["segment", "materialne", "pobocky", "sektorqr"],
};
/** čo typ PRIDÁVA — vlastná skupina navrch menu (názov skupiny = TYP_NAZOV) */
export const NASTROJE_TYPU: Record<TypStranky, PolozkaSpravy[]> = {
  charita: [], spolok: [], sport: [], umenie: [], skola: [], farnost: [], obec: [], nemocnica: [], ina: [],
  firma: ["dorovnavanie", "zamestnanci", "esg", "firemnyqr"],
  tvorca: ["video"], // Iskra navrch, ďalšie nástroje dodá dizajn
};
/** povolí položku typ? */
export const typPovoli = (id: PolozkaSpravy, typ: TypStranky): boolean => !POVOLENIA_TYPU[typ].includes(id);
/** slová podľa typu — štruktúra, texty sa doplnia pri každom type */
export type Slovo = "darcovia" | "akcie" | "sektory";
export const SLOVA_TYPU: Record<TypStranky, Partial<Record<Slovo, string>>> = {
  charita: {}, ina: {}, firma: {},
  spolok: { darcovia: "členovia" }, sport: { darcovia: "členovia", akcie: "zápasy" }, umenie: { akcie: "vystúpenia" },
  skola: { sektory: "triedy" }, farnost: { darcovia: "farníci" }, obec: { darcovia: "obyvatelia" },
  nemocnica: { sektory: "oddelenia" }, tvorca: { darcovia: "podporovatelia" },
};
export const slovo = (typ: TypStranky, s: Slovo, zaklad: string): string => SLOVA_TYPU[typ][s] ?? zaklad;
/** cenník podľa typu: charita (4 programy) · jedna cena · B2B · vlastný tvorcu */
export type Cennik = "charita" | "jedna" | "b2b" | "tvorca";
export const CENNIK_TYPU: Record<TypStranky, Cennik> = {
  charita: "charita", sport: "charita", umenie: "charita", skola: "charita", obec: "charita", nemocnica: "charita", ina: "charita",
  spolok: "jedna", farnost: "jedna", firma: "b2b", tvorca: "tvorca",
};
/** sada štítov podľa typu (zatiaľ všetci CARE, firma firemný — obrázky dodá dizajn) */
export type StitSada = "care" | "firma";
export const STIT_SADA_TYPU: Record<TypStranky, StitSada> = {
  charita: "care", spolok: "care", sport: "care", umenie: "care", skola: "care", farnost: "care", obec: "care", nemocnica: "care", ina: "care", tvorca: "care",
  firma: "firma",
};
// ---- DEV: typ testovanej stránky (testovacia lišta) a typ z registrácie ----
export const nacitajTypStranky = (): TypStranky | null => nacitaj<TypStranky | null>(kluc("typStranky"), null);
export const ulozTypStranky = (t: TypStranky) => uloz(kluc("typStranky"), t);
/** registrácia „Iná organizácia" — čím sa zaoberá (aby sme vedeli, aký typ doplniť) */
export const ulozInaCinnost = (t: string) => uloz(kluc("inaCinnost"), t);
/** program, od ktorého položka je (na štítok a zamknutú obrazovku) */
export const odProgramu = (id: PolozkaSpravy): Program => POVOLENIA_CHARITY[id].od;

// ---- štít charity (CARE) — v produkcii z karmy charity, v DEV prepínač ----
export type StitCharity = "bronze" | "silver" | "gold" | "platinum" | "legend";
export const nacitajStitCharity = (): StitCharity => nacitaj<StitCharity>(kluc("stit.charita"), "bronze");
export const ulozStitCharity = (s: StitCharity) => uloz(kluc("stit.charita"), s);
// ---- pripnuté položky v správe stránky: najviac 12 (OPRAVY 94), ukladajú sa do účtu (src/lib/spravaPiny.ts) ----
export const PIN_MAX = 12;
// ---- DEV: nová charita (nuly, prázdne stavy) alebo bežiaca ukážka ----
export const nacitajCharituNovu = (): boolean => nacitaj(kluc("charita.nova"), false);
export const ulozCharituNovu = (v: boolean) => uloz(kluc("charita.nova"), v);

// ============================================================
// OPRAVY 121 · bod 9 — roly v správe stránky (poradie = Nastavenia → Správcovia a prístupy).
// Organizátor = vedúci skupiny ako pri skutkoch ľudí, len s poverením od charity (OPRAVY 122). Ostatní sú dobrovoľníci.
// Pridáva skutky a akcie za charitu, nevidí peniaze, darcov ani nastavenia.
// Bez roly sa skutok za charitu (ani QR charity) vytvoriť nedá. Overenie roly robí server pri uložení.
// ============================================================
export type RolaStranky = "hlavny" | "spravca" | "pomocnik" | "organizator";
export const ROLY_STRANKY: RolaStranky[] = ["hlavny", "spravca", "pomocnik", "organizator"];
/** smie pridať skutok za charitu a ukázať QR charity */
export const smieSkutokZaCharitu = (r: RolaStranky | null | undefined): boolean => r === "hlavny" || r === "spravca" || r === "organizator";
/** vidí peniaze, darcov a nastavenia (Organizátor nie) */
export const vidiPeniaze = (r: RolaStranky | null | undefined): boolean => r === "hlavny" || r === "spravca";
