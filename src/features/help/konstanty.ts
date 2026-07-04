// ============================================================
// HELP — centrálne konštanty (v3 spec: „čísla na jednom mieste")
// Všetko sú PLACEHOLDERY — finálne v tokenomickom modeli / na Dagmar.
// Mechanizmus je podstata, nie konkrétne čísla.
// ============================================================

// ---- PÁSMA SUMY (friction by design) --------------------------------------
// DÔLEŽITÉ (v3): pásma sú ANTI-FRAUD / overovacie stupne, NIE daňové.
// Míľnik 2400 € ako „daň z príjmu" NEEXISTUJE — dar medzi f.o. sa v SR nedaní.
// Trenie aj dosah rastú so sumou; hranice a % sú nástrel na doladenie.
export interface Pasmo {
  kod: string;
  text: string;
  blok: boolean;            // true = nepublikuje sa (pod 100 €)
  dokaz?: string;          // požadovaný dôkaz účelu
  dosah?: string;          // geografický dosah po overení
}

export function pasmo(suma: number): Pasmo {
  if (suma < 100)
    return { kod: "pod100", blok: true, text: "Pod 100 € sa finančná žiadosť nepublikuje — skús Ľudskú pomoc alebo priamy dar od peera." };
  if (suma <= 500)
    return { kod: "100-500", blok: false, dokaz: "voliteľný (alebo 3 svedkovia)", dosah: "štvrť → mesto", text: "KYC. Dôkaz účelu voliteľný — alebo 3 nezávislé overenia komunity. Dosah štvrť → mesto po podporách." };
  if (suma <= 1000)
    return { kod: "500-1000", blok: false, dokaz: "povinný", dosah: "mesto", text: "KYC + povinný dôkaz k účelu. Dosah mesto po doložení." };
  if (suma <= 2400)
    return { kod: "1000-2400", blok: false, dokaz: "dôkaz + rozpočet", dosah: "región", text: "KYC + dôkaz + položkový rozpočet. Dosah región po overení." };
  return { kod: "nad2400", blok: false, dokaz: "dôkaz + rozpočet", dosah: "SK / cez Charity", text: "KYC + dôkaz + rozpočet. Vysoká suma → dosah SK, odporúčané zastrešenie cez Charitu. Prebytok môžeš poslať ďalej (reťaz dobra)." };
}

// Upozornenie k sume (nie daňové): sociálne dávky. Text finalizuje Dagmar.
export const POZNAMKA_DAVKY =
  "Pozor: dar môže príjemcovi v hmotnej núdzi dočasne znížiť sociálne dávky. Over si to pred zverejnením.";

// ---- SEKTORY / TAGY TÉM (cross-modulové) ----------------------------------
// Otagovaný prípad sa zobrazí aj v príslušnej doméne Aktivity → cielené publikum.
// Fakty, falošný tag = ban.
export interface Sektor { id: string; label: string; emoji: string; }
export const SEKTORY: Sektor[] = [
  { id: "zdravie", label: "Zdravie", emoji: "❤️" },
  { id: "sport", label: "Šport", emoji: "🏃" },
  { id: "deti", label: "Deti", emoji: "🧒" },
  { id: "priroda", label: "Príroda", emoji: "🌳" },
  { id: "socialne", label: "Sociálne", emoji: "🤝" },
  { id: "vzdelavanie", label: "Vzdelávanie", emoji: "📚" },
  { id: "kultura", label: "Kultúra", emoji: "🎭" },
  { id: "zvierata", label: "Zvieratá", emoji: "🐾" },
  { id: "zachrana", label: "Záchrana", emoji: "🚑" },
  { id: "humanitarna", label: "Humanitárna", emoji: "🕊" },
];

export const TAG_VAROVANIE =
  "Zaklikni len témy, ktoré sa prípadu reálne týkajú. Nevymýšľaj kvôli dosahu — len fakty. Falošný tag = ban.";

export const tagLabel = (id: string): string => SEKTORY.find((s) => s.id === id)?.label ?? id;
export const tagLabels = (ids: string[]): string => ids.map(tagLabel).join(", ");

// ---- SEGMENTY POTREBY (Cez Charitu — iné než sektory) ---------------------
export const CHARITA_SEGMENTY: Sektor[] = [
  { id: "byvanie", label: "Bývanie", emoji: "🏠" },
  { id: "jedlo", label: "Jedlo", emoji: "🍲" },
  { id: "lieky", label: "Lieky", emoji: "💊" },
  { id: "osatenie", label: "Ošatenie", emoji: "🧥" },
  { id: "hygiena", label: "Hygiena", emoji: "🧼" },
  { id: "ine", label: "Iné", emoji: "🤲" },
];
export const segmentLabel = (id: string): string => CHARITA_SEGMENTY.find((s) => s.id === id)?.label ?? id;

// ---- PRÍSNY REŽIM (práca so zraniteľnými) ---------------------------------
// Prierezové pravidlo — viazané na KONTAKT so zraniteľným, nie na smer (ponuka/dopyt).
export const PRISNY_SPUSTACE = ["opatera", "dieťa", "ohrozený senior", "vstup do domácnosti"];
export const PRISNY_OTAZKA =
  "Týka sa to detí, ohrozených seniorov, alebo vstupu do domácnosti?";
export const PRISNY_POZIADAVKY = [
  "Vyššie KYC + liveness (nielen telefón)",
  "Bezúhonnosť / register trestov (GDPR čl. 10 — na Dagmar)",
  "Odborník doloží prax",
  "Viditeľné označenie „práca so zraniteľnými — overený“",
  "Súhlas zákonného zástupcu (dieťa) / rodiny (senior)",
];

// ---- ČASOVÉ KONŠTANTY (placeholder) ---------------------------------------
export const POSUDENIE_H = 48;              // posúdenie žiadosti
export const POTVRDENIE_SKUTKU_H = 48;      // druhá strana potvrdí skutok
export const OVERENIA_POTREBNE = 3;         // nezávislé komunitné overenia
export const SVEDKOVIA_NIZSIE_PASMO = 3;    // 3 svedkovia stačia do nižšieho pásma
export const ESCROW_GRACE_DNI = 30;         // grace pred refundom
export const LIMIT_MEDZI_ZIADOSTAMI_DNI = 30;

// ---- ESCROW (DEED) — jeden kontrakt, 3 stavy ------------------------------
// Rieši: overenie komunitou, prevzatie pri zastúpení, akumuláciu reťaze.
// Kľúč (NIE custody): kontrakt má len DVE destinácie — príjemca po KYC, alebo späť darcom.
export type EscrowStav = "drzi" | "uvolnene" | "refund";
export const ESCROW: Record<EscrowStav, { label: string; emoji: string; popis: string }> = {
  drzi:     { label: "Drží", emoji: "🔒", popis: "DEED je v kontrakte s ID žiadosti; kontrakt eviduje kto koľko (kvôli refundu). Platforma NEMÁ právo presmerovať." },
  uvolnene: { label: "Uvoľnené", emoji: "✅", popis: "Príjemca prešiel KYC + claim → vytvorila sa mu ERC-4337 peňaženka → uvoľnené. Ďalšie príspevky už priamo jemu." },
  refund:   { label: "Refund", emoji: "↩️", popis: "Koniec + grace (30 dní) bez claimu → vrátenie darcom (Base L2, lacný batch)." },
};

// ---- OCHUTNÁVKA (bez registrácie) -----------------------------------------
export const DAR_BEZ_REG_EUR = 10;   // 1. návšteva, dar do 10 €, bez registrácie (FIAT/SMS)

// ---- POPLATKY (placeholder — kto platí = neskôr) --------------------------
export const POPLATKY = {
  deedOd: 3,     // % degresívne
  deedDo: 1.5,   // %
  poznamka: "DEED degresívne 3 → 1,5 %; SMS/FIAT fix + marža. Vopred, transparentne.",
};
