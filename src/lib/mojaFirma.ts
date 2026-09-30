// ============================================================
// MOJA FIRMA (strana zamestnanca) — karta 24 · 2i, PRAVIDLA-APPKY „Firma a zamestnanec".
// Všetko, čo firma pripraví pre svojich ľudí: benefity, oznámenia, akcie/školenia/smeny,
// odmeny a firemné hodiny na dobrovoľníctvo (VTO). Zdroj v produkcii = B2B profil firmy
// (kod/B2B-poznamky.md, príde neskôr). Teraz mock + localStorage pre odpovede usera.
// Firma NIKDY nevidí voľby zamestnanca (predvoľbu Neukázať / Anonymne / S menom).
// ============================================================
import { useSyncExternalStore } from "react";
import { tTeraz } from "@/i18n";

export type FirmaVolba = "neukazat" | "anonym" | "meno";
export const VOLBA_TXT: Record<FirmaVolba, string> = { neukazat: "Neukázať", anonym: "Anonymne", meno: "S menom" };
export const VOLBA_VETA: Record<FirmaVolba, string> = {
  neukazat: "Firma sa o tvojich skutkoch mimo práce nedozvie.",
  anonym: "Firme pribudne len číslo do ESG súhrnu. Nevie, že si to bol ty, takže ťa odmeniť nemôže.",
  meno: "Firma uvidí skutok aj tvoje meno a môže ťa odmeniť.",
};
/** config: rozpad súhrnu podľa oblastí až od tohto počtu zapojených */
export const MIN_ROZPAD = 5;
/** config: kontrola „Stále pracuješ v…?" po toľkých mesiacoch bez firemnej akcie či smeny (aj raz ročne) */
export const MESIACE_BEZ_AKCIE = 3;

export type Benefit = { t: string; s: string; detail: string };
export type FirmaOznam = { id: string; typ: "kontrola" | "benefit" | "akcia"; t: string; s: string };
export type FirmaAkcia = { d: number; m: string; t: string; s: string; stitok: "prihlásený" | "povinné" | "potvrdené" | "navrhnuté"; typ: "akcia" | "skolenie" | "smena" };
export type Odmena = { za: string; hodnota: string; kedy: string; zdroj: string; vdaka?: string };
export type VtoAkcia = { d: number; m: string; t: string; s: string };
export type VtoHistoria = { t: string; s: string; h: number; stav: "čaká na schválenie" | "schválené firmou" | "vyplatené" };
export type Vto = { rok: number; spolu: number; vyuzite: number; obnovi: string; prihlasene: VtoAkcia[]; historia: VtoHistoria[]; oblasti: string[]; sukromne: number };
export type FirmaData = { benefity: Benefit[]; oznamy: FirmaOznam[]; akcie: FirmaAkcia[]; odmeny: Odmena[]; vto?: Vto; kodPrefix?: string };

const DATA: Record<string, FirmaData> = {
  "Pekáreň Dobrota": {
    benefity: [
      { t: "Sobota pre útulok", s: "firemná akcia · 4. 10. · prihlásených 12", detail: "Firma pozýva zamestnancov na spoločnú sobotu v útulku Túlavá labka. Účasť potvrdíš pracovným QR na mieste, hodiny sa ti započítajú do firemných hodín." },
      { t: "Deň dobrovoľníctva", s: "jeden platený deň v roku na skutok", detail: "Jeden pracovný deň v roku môžeš venovať skutku. Termín si dohodneš s vedúcim." },
    ],
    oznamy: [
      { id: "pd-kontrola", typ: "kontrola", t: "Stále pracuješ v Pekárni Dobrota?", s: "overujeme raz ročne" },
      { id: "pd-benefit", typ: "benefit", t: "Nový benefit: permanentka na plaváreň", s: "pred 2 dňami" },
      { id: "pd-akcia", typ: "akcia", t: "Nová firemná akcia: sadenie stromov", s: "sobota 18. 10." },
    ],
    akcie: [
      { d: 4, m: "OKT", t: "Sobota pre útulok", s: "firemná akcia · VTO · 9:00 – 13:00", stitok: "prihlásený", typ: "akcia" },
      { d: 9, m: "OKT", t: "BOZP školenie", s: "povinné · zasadačka · 10:00", stitok: "povinné", typ: "skolenie" },
      { d: 11, m: "OKT", t: "Ranná smena", s: "predajňa Námestie · 6:00 – 14:00", stitok: "potvrdené", typ: "smena" },
    ],
    odmeny: [
      { za: "Za pomoc pri povodni v Bošáci", hodnota: "+300 DeeD", kedy: "14. 9.", zdroj: "skutok s menom", vdaka: "„Ďakujeme, že si reprezentoval celú pekáreň.“ — vedenie" },
      { za: "Za firemnú brigádu v útulku", hodnota: "deň voľna", kedy: "20. 8.", zdroj: "firemná akcia", vdaka: "„Vďaka tebe sme mali najviac dobrovoľníkov v meste.“" },
    ],
    vto: {
      rok: 2026, spolu: 40, vyuzite: 12, obnovi: "1. 1. 2027",
      prihlasene: [{ d: 4, m: "OKT", t: "Sobota pre útulok", s: "Túlavá labka · 9:00 – 13:00" }, { d: 12, m: "OKT", t: "Čítanie deťom v nemocnici", s: "Detské oddelenie · 15:00 – 17:00" }],
      historia: [
        { t: "Venčenie psov", s: "Túlavá labka · 20. 9.", h: 5.5, stav: "vyplatené" },
        { t: "Detský tábor, 2 dni", s: "OZ Motýlik · 6. – 7. 9.", h: 4.5, stav: "schválené firmou" },
        { t: "Súkromné miesto", s: "oblasť Deti · 30. 8.", h: 2, stav: "čaká na schválenie" },
      ],
      oblasti: ["Deti", "Zvieratá"], sukromne: 1,
    },
    kodPrefix: "PEKA",
  },
  "Kaviareň Pod Hradom": {
    benefity: [{ t: "Káva zadarmo po skutku", s: "raz týždenne po potvrdenom skutku", detail: "Po potvrdenom skutku s menom dostaneš kávu zadarmo. Platí raz týždenne." }],
    oznamy: [{ id: "kh-benefit", typ: "benefit", t: "Nový benefit: káva zadarmo po skutku", s: "včera" }],
    akcie: [{ d: 6, m: "OKT", t: "Večerná smena", s: "kaviareň · 16:00 – 22:00", stitok: "potvrdené", typ: "smena" }],
    odmeny: [],
  },
};
const PRAZDNE: FirmaData = { benefity: [], oznamy: [], akcie: [], odmeny: [] };
export const dataFirmy = (nazov: string): FirmaData => DATA[nazov] ?? PRAZDNE;

// ---- odpovede usera (lokálne) ----
const KLUC = "deed.mojaFirma";
type Stav = { vybavene: string[]; navrhy: Record<string, FirmaAkcia[]> };
const posl = new Set<() => void>();
let ver = 0;
const nacitaj = (): Stav => { try { return { vybavene: [], navrhy: {}, ...JSON.parse(localStorage.getItem(KLUC) ?? "{}") }; } catch { return { vybavene: [], navrhy: {} }; } };
const uloz = (s: Stav) => { try { localStorage.setItem(KLUC, JSON.stringify(s)); } catch { /* LS */ } ver++; posl.forEach((f) => f()); };
export function useMojaFirma() {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  return nacitaj();
}
/** oznámenie od firmy vybavené (Áno na kontrolu, prečítaný benefit…) */
export const vybavOznam = (id: string) => { const s = nacitaj(); if (!s.vybavene.includes(id)) uloz({ ...s, vybavene: [...s.vybavene, id] }); };
/** návrh firemnej akcie — firma ho potvrdí a pozve kolegov; meno navrhovateľa vidí len firma */
export const navrhniAkciu = (firma: string, a: { t: string; kedy: string }) => {
  const s = nacitaj();
  const dt = new Date(a.kedy);
  const m = ["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"];
  const akcia: FirmaAkcia = { d: isNaN(dt.getTime()) ? 0 : dt.getDate(), m: isNaN(dt.getTime()) ? "" : m[dt.getMonth()], t: a.t, s: tTeraz()("firma.navrh.s"), stitok: "navrhnuté", typ: "akcia" };
  uloz({ ...s, navrhy: { ...s.navrhy, [firma]: [...(s.navrhy[firma] ?? []), akcia] } });
};
/** pilot: kód „PEKA-2931" → firma podľa prefixu (v produkcii overí server) */
export const firmaPodlaKodu = (kod: string, firmy: string[]): string | undefined => {
  const bez = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  const p = bez(kod.split("-")[0]);
  if (p.length < 3) return undefined;
  return Object.entries(DATA).find(([, d]) => d.kodPrefix && bez(d.kodPrefix) === p)?.[0] ?? firmy.find((f) => bez(f).startsWith(p));
};
