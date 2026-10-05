// KARTA 48 · centrálna zbierka a sektory charity (Správa → Zbierky).
// Centrálna = položka 0 (od P1, nezakladá sa). Sektory 1–3 (od P2) len z činností v stanovách.
// Farba podľa poradia: 0 zelená, 1 petrolejová, 2 fialová, 3 oranžová (data-hier).
// Zatiaľ v pamäti relácie (žiadne úložisko prehliadača); čísla sú TESTOVACIE, na serveri ich počíta server.
import { useSyncExternalStore } from "react";
import type { CentralnaZbierka } from "./centralnaZbierka";

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

export interface SektorCharity {
  id: string;
  nazov: string;
  /** činnosť zo stanov, z ktorej sektor vznikol */
  stanovy: string;
  foto: string;
  /** odkaz na plagát deed.sk/z/{slug} */
  slug: string;
}
/** testovacie čísla položky: tento mesiac, ľudí dáva mesačne, od začiatku */
export interface CislaPolozky { mesiac: number; mesacne: number; spolu: number }

export const SEKTORY_MAX = 3;
export const SEKTORY_OD_TIERU = 2;
export const CENTRALNA_FOTO = U("photo-1542601906990-b4d3fb778b09");
export const CENTRALNA_SLUG = "svetlo-pomoci";

/** činnosti zo stanov, z ktorých sa dá pridať sektor (TESTOVACIE; na serveri z registrácie) */
export const STANOVY_CINNOSTI: { nazov: string; stanovy: string }[] = [
  { nazov: "Seniori", stanovy: "Sociálne služby pre seniorov" },
  { nazov: "Deti", stanovy: "Výchova a vzdelávanie detí" },
  { nazov: "Ľudia bez domova", stanovy: "Pomoc ľuďom bez domova" },
  { nazov: "Zdravie", stanovy: "Podpora zdravia a prevencia" },
  { nazov: "Vzdelávanie", stanovy: "Vzdelávanie dospelých" },
  { nazov: "Komunita", stanovy: "Komunitná práca v meste" },
];

const TEST: (SektorCharity & { cisla: CislaPolozky; text: string })[] = [
  { id: "sek-seniori", nazov: "Seniori", stanovy: "Sociálne služby pre seniorov", foto: U("photo-1516307365426-bea591f05011"), slug: "svetlo-pomoci-seniori", cisla: { mesiac: 1480, mesacne: 61, spolu: 9840 }, text: "<p>Nákupy, lieky a obedy pre osamelých seniorov zo Sihote a Opatovej. Chodíme za nimi každý týždeň.</p>" },
  { id: "sek-deti", nazov: "Deti", stanovy: "Výchova a vzdelávanie detí", foto: U("photo-1503454537195-1dcabb73ffb9"), slug: "svetlo-pomoci-deti", cisla: { mesiac: 940, mesacne: 38, spolu: 6210 }, text: "<p>Doučovanie, školské potreby a krúžky pre deti z Tábora a Zámostia.</p>" },
  { id: "sek-bez-domova", nazov: "Ľudia bez domova", stanovy: "Pomoc ľuďom bez domova", foto: U("photo-1519681393784-d120267933ba"), slug: "svetlo-pomoci-bez-domova", cisla: { mesiac: 1210, mesacne: 54, spolu: 11480 }, text: "<p>Nocľaháreň, polievka a sprchy pre ľudí bez domova v Trenčíne.</p>" },
];
export const CENTRALNA_CISLA: CislaPolozky = { mesiac: 3120, mesacne: 143, spolu: 42550 };
export const NULA: CislaPolozky = { mesiac: 0, mesacne: 0, spolu: 0 };

let sektory: SektorCharity[] = TEST.map(({ cisla: _c, text: _t, ...s }) => s);
const cisla = new Map<string, CislaPolozky>(TEST.map((s) => [s.id, s.cisla]));
const obsah = new Map<string, CentralnaZbierka>(TEST.map((s) => [s.id, { popis: s.text, popis2: "", media: [], sada: 1, eurc: true, sadaE: 0, ucet: null }]));
let verzia = 0;
const pocuvaj = new Set<() => void>();
const zmena = () => { verzia++; pocuvaj.forEach((f) => f()); };
export const useZmenySektorov = () => useSyncExternalStore((f) => { pocuvaj.add(f); return () => pocuvaj.delete(f); }, () => verzia);

export const nacitajSektory = (): SektorCharity[] => sektory;
export function useSektory(): SektorCharity[] { useZmenySektorov(); return sektory; }
export const cislaSektora = (id: string): CislaPolozky => cisla.get(id) ?? NULA;
export const obsahSektora = (id: string): CentralnaZbierka | null => obsah.get(id) ?? null;
export function ulozObsahSektora(id: string, c: CentralnaZbierka) { obsah.set(id, c); zmena(); }
export function pridajSektor(c: { nazov: string; stanovy: string }): SektorCharity | null {
  if (sektory.length >= SEKTORY_MAX || sektory.some((s) => s.nazov === c.nazov)) return null;
  const slug = `svetlo-pomoci-${c.nazov.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  const s: SektorCharity = { id: `sek-${Date.now()}`, nazov: c.nazov, stanovy: c.stanovy, foto: "", slug };
  sektory = [...sektory, s];
  obsah.set(s.id, { popis: "", popis2: "", media: [], sada: 1, eurc: true, sadaE: 0, ucet: null });
  zmena();
  return s;
}
/** zmazanie sektora vracia funkciu na vrátenie (pás Vrátiť) */
export function zmazSektor(id: string): () => void {
  const pred = sektory;
  sektory = sektory.filter((s) => s.id !== id);
  zmena();
  return () => { sektory = pred; zmena(); };
}

export function premenujSektor(id: string, nazov: string) { sektory = sektory.map((s) => (s.id === id ? { ...s, nazov } : s)); zmena(); }

/** žiadosť o zmenu účtu centrálnej / sektora — ide DEED+ na schválenie (do 2 pracovných dní) */
export interface ZiadostUcet { dovod: string; iban: string; podana: string }
const ziadosti = new Map<string, ZiadostUcet>();
export const ziadostUctu = (kluc: string) => ziadosti.get(kluc) ?? null;
export function poziadajOZmenuUctu(kluc: string, z: Omit<ZiadostUcet, "podana">) { ziadosti.set(kluc, { ...z, podana: new Date().toISOString() }); zmena(); }

/** zavretá centrálna (Ukončenie) — 15 minút sa dá vrátiť, potom správa pravidelným darcom (server) */
let centralnaZavreta: { kedy: string; vratitDo: string; dovod: string } | null = null;
export const zavretaCentralna = () => centralnaZavreta;
export function zavriCentralnu(dovod: string) { centralnaZavreta = { kedy: new Date().toISOString(), vratitDo: new Date(Date.now() + 15 * 60000).toISOString(), dovod }; zmena(); }
export function otvorCentralnu() { centralnaZavreta = null; zmena(); }

/** ktorú položku otvoriť v Správe centrálnej a sektorov (0 = centrálna, 1… = sektor podľa poradia) */
let vyber = 0;
export const vyberCentralnej = () => vyber;
export const nastavVyberCentralnej = (i: number) => { vyber = i; };
