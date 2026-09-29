// ============================================================
// ŠTÍTY OBLASTÍ (karta 26, OPRAVY 52–54) — hlavný štít + štíty podľa oblastí.
// Jedna hlavná karma a jeden hlavný štít; štíty oblastí ukazujú, v čom je človek dobrý,
// a všetky sa započítavajú do hlavného. Karma a čísla sa nikde verejne neukazujú.
// Assety: public/stity/oblasti/DEED_<Oblasť>_<STUPEŇ>(.webp | -128.webp | .png) — vyrába `npm run stity`.
// Vyvesené štíty: user vyberie najviac 5, poradie ťahaním (lokálne, v produkcii profil na serveri).
// ============================================================
import { useSyncExternalStore } from "react";
import type { StitLevel } from "@/components/stit";

export type Oblast = "ART" | "HEALTH" | "LEARN" | "SPORT" | "EKO" | "HELP" | "CARE" | "TEAM" | "PARTNER";
/** poradie v mriežke Karma a štíty (PARTNER = štít firmy, u človeka sa nezobrazuje) */
export const OBLASTI_USER: Oblast[] = ["ART", "HEALTH", "LEARN", "SPORT", "EKO", "HELP", "CARE", "TEAM"];
/** assety od Martina hotové; ostatné „štít pripravujeme" */
export const MA_ASSET: Record<Oblast, boolean> = { ART: true, HEALTH: true, LEARN: true, SPORT: true, EKO: true, HELP: false, CARE: false, TEAM: false, PARTNER: false };
const SUBOR: Record<Oblast, string> = { ART: "Art", HEALTH: "Health", LEARN: "Learn", SPORT: "Sport", EKO: "Eko", HELP: "Help", CARE: "Care", TEAM: "Team", PARTNER: "Partner" };

export const STIT_SK: Record<StitLevel, string> = { Bronze: "Bronzový", Silver: "Strieborný", Gold: "Zlatý", Platinum: "Platinový", Legend: "Legenda" };
export const PORADIE: StitLevel[] = ["Bronze", "Silver", "Gold", "Platinum", "Legend"];

/** obrázok hlavného štítu (jestvujúce assety) */
export const hlavnyObr = (l: StitLevel) => `/stity/${l.toLowerCase()}.png`;
/** obrázok štítu oblasti · m = 128 px (mriežka, profil) · v = 512 px (zväčšenie) */
export function oblastObr(o: Oblast, l: StitLevel, velkost: "m" | "v" = "m"): { webp: string; png: string } | null {
  if (!MA_ASSET[o]) return null;
  const n = `/stity/oblasti/DEED_${SUBOR[o]}_${l.toUpperCase()}`;
  return { webp: velkost === "m" ? `${n}-128.webp` : `${n}.webp`, png: `${n}.png` };
}

/** priradenie záujmov k oblastiam (karta 26; potvrdí Martin) · Viera bez karmy a bez štítu */
export const ZAUJEM_OBLAST: Record<string, Oblast | null> = {
  Umenie: "ART", Hudba: "ART", Zdravie: "HEALTH", Učenie: "LEARN", Šport: "SPORT", Príroda: "EKO", Zvieratá: "EKO",
  Komunita: "HELP", Pomoc: "HELP", Charita: "CARE", Viera: null,
};

export type StitOblasti = { oblast: Oblast; level: StitLevel };
/** zoradenie od najvyššieho stupňa */
export const odNajvyssieho = (a: StitOblasti[]) => [...a].sort((x, y) => PORADIE.indexOf(y.level) - PORADIE.indexOf(x.level));

// ---- vlastné štíty (mock, v produkcii karma engine) ----
export const MOJE_STITY: StitOblasti[] = [
  { oblast: "ART", level: "Silver" }, { oblast: "HEALTH", level: "Bronze" }, { oblast: "LEARN", level: "Silver" },
  { oblast: "SPORT", level: "Bronze" }, { oblast: "EKO", level: "Gold" },
];
export const MOJ_HLAVNY: StitLevel = "Gold";
/** dátumy získania stupňov v oblasti (mock) */
export const ZISKANE_DNA: Partial<Record<StitLevel, string>> = { Bronze: "11. 3. 2026", Silver: "3. 6. 2026", Gold: "2. 9. 2026" };

/** Karta 26 · doplnok 29. 9.: hlavný štít Bronzový má každý od registrácie; štíty oblastí sú na začiatku zamknuté.
 *  Bronzový v oblasti odomkne skutok alebo dar v tej oblasti v hodnote aspoň PRAH_BRONZ_OBLAST (ekvivalent v €,
 *  návrh 20 € — dohodne tím). User číslo nevidí. V produkcii rozhoduje karma engine na serveri. */
export const PRAH_BRONZ_OBLAST = 20;
export const odomkneBronzVOblasti = (hodnotaEur: number) => hodnotaEur >= PRAH_BRONZ_OBLAST;
export const KARMA_MESIAC = 84;

export type Uspech = { level: StitLevel; oblast?: Oblast; t: string; s: string; d: string };
export const MOJE_USPECHY: Uspech[] = [
  { level: "Gold", t: "Hlavný štít: Zlatý", s: "Za rok skutkov v okolí. Prišiel ako prekvapenie a ostáva.", d: "14. 9. 2026" },
  { level: "Gold", oblast: "EKO", t: "Zlatý štít v oblasti EKO", s: "Rok čistenia potoka so susedmi, 12 akcií.", d: "2. 9. 2026" },
  { level: "Silver", oblast: "LEARN", t: "Strieborný štít v oblasti LEARN", s: "Doučovanie matematiky pre deti zo sídliska.", d: "18. 7. 2026" },
  { level: "Silver", oblast: "ART", t: "Strieborný štít v oblasti ART", s: "Maľovanie múru v materskej škole.", d: "3. 6. 2026" },
  { level: "Bronze", oblast: "HEALTH", t: "Prvý štít v oblasti HEALTH", s: "Prvé darovanie krvi cez DEED+.", d: "11. 3. 2026" },
];

/** lichotky pri hlavnom štíte — striedajú sa (staré tituly smú byť len lichotkou, nie odznakom) */
const ZAKLAD_LI = ["Zaslúžený skutkami. Ďakujeme, že si tu.", "Tvoje skutky sú vidieť. Ľudia okolo teba to cítia.", "Každý štít niekto potreboval. Tento si postavil ty."];
export const LICHOTKY: Record<StitLevel, string[]> = {
  Bronze: ZAKLAD_LI, Silver: ZAKLAD_LI,
  Gold: [ZAKLAD_LI[0], ZAKLAD_LI[1], "Zlatý ti pristane. Ale tá Platina má iný lesk.", ZAKLAD_LI[2]],
  Platinum: ZAKLAD_LI, Legend: ZAKLAD_LI,
};

// ---- vyvesené štíty (najviac 5, poradie) ----
export const MAX_VYVESENE = 5;
const KLUC = "deed.stity.vyvesene";
const posl = new Set<() => void>();
let ver = 0;
const ZAKLAD: Oblast[] = ["EKO", "ART", "LEARN"];
export const vyvesene = (): Oblast[] => { try { const s = localStorage.getItem(KLUC); return s ? JSON.parse(s) : ZAKLAD; } catch { return ZAKLAD; } };
const uloz = (v: Oblast[]) => { try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS */ } ver++; posl.forEach((f) => f()); };
/** zapnúť / vypnúť vyvesenie; vráti false, keď je plno */
export function prepniVyvesenie(o: Oblast): boolean {
  const v = vyvesene();
  if (v.includes(o)) { uloz(v.filter((x) => x !== o)); return true; }
  if (v.length >= MAX_VYVESENE) return false;
  uloz([...v, o]); return true;
}
export const zoradVyvesene = (v: Oblast[]) => uloz(v);
export function useVyvesene(): Oblast[] {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  return vyvesene();
}

// ---- štíty iných subjektov (mock: deterministicky z mena; v produkcii z ich profilu) ----
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
/** vyvesené štíty oblastí iného subjektu (zoradené, najviac 5) — nikdy vyššie ako jeho hlavný štít */
export function stityOblastiSubjektu(meno: string, hlavny: StitLevel, firma = false): StitOblasti[] {
  const h = hash(meno);
  const pool: Oblast[] = ["ART", "HEALTH", "LEARN", "SPORT", "EKO"];
  const pocet = h % 4 + (PORADIE.indexOf(hlavny) >= 2 ? 2 : 1);
  const max = PORADIE.indexOf(hlavny);
  const out: StitOblasti[] = [];
  for (let i = 0; i < Math.min(pocet, pool.length); i++) {
    const o = pool[(h >> (i * 3)) % pool.length];
    if (out.some((x) => x.oblast === o)) continue;
    out.push({ oblast: o, level: PORADIE[Math.max(0, max - ((h >> (i * 5 + 2)) % 3))] });
  }
  void firma;
  return odNajvyssieho(out).slice(0, MAX_VYVESENE);
}
