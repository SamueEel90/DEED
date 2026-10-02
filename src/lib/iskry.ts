// ============================================================
// KARTA 41 · Iskry — centrálny prúd (časť 1). Starý názov „Talent" = Iskra.
// Zatiaľ jeden prúd pre celé Slovensko; filter oblastí je pripravený, ale skrytý (ZOBRAZ_OBLASTI).
// Iskra = „páči sa mi" (zadarmo, len počet). Dary idú cez darcovia.ts (jediné miesto zápisu darov).
// Mock: ukážkové videá v public/video/iskry/ (skutok.mp4 = výrez z nakup.mp4; husle, balony, prva-pomoc, florbal treba dodať),
// texty z prototypu „Iskra centralna mobil", stav (iskry, sledovanie, námietky) v pamäti relácie.
// TODO (server): prúd videí, počty Iskier, námietky a cudzie dary v reálnom čase prídu z API / realtime.
// ============================================================
import { useSyncExternalStore } from "react";

export const ISKRY_CFG = {
  /** filter Štvrť · Mesto · Kraj · Krajina — zapne sa, až keď bude obsah (Martin 2. 10.) */
  zobrazOblasti: false,
  oblasti: ["Štvrť", "Mesto", "Kraj", "Krajina"] as const,
  druhy: ["Všetko", "Talent", "Vedomosti", "Šport", "Zábava", "Skutky"] as const,
  /** video sa posunie do vyššej oblasti až po X hodinách a len bez otvorenej námietky */
  posunPoHodinach: 12,
  /** zdôvodnenie námietky najmenej X znakov */
  namietkaMinZnakov: 20,
  /** živý pás: jeden dar X ms */
  pasMs: 5000,
  /** rýchle sumy v okne Darovať */
  mikroEurc: [0.1, 0.5, 1], mikroDeed: [10, 50, 100], sepa: [1, 3, 5], karta: [5, 10, 20],
};
export const DOVODY_NAMIETKY = [
  "Video vytvorila AI, autor ho vydáva za svoje",
  "Falošné alebo zinscenované video",
  "Cudzie video, nie je autora",
  "Zbierka pri videu nie je pravdivá",
  "Iné",
];

export type DruhIskry = 1 | 2 | 3 | 4 | 5; // index v ISKRY_CFG.druhy
export interface Iskra {
  id: string; druh: DruhIskry;
  autor: string; kto: string; ini: string; org: boolean;
  popis: string;
  /** video na výšku do 45 s; `bg` je poster, kým sa načíta (a ostane, keď súbor chýba) */
  src?: string; bg: string;
  /** zbierka pri videu — dar ide na ňu; bez nej ide autorovi */
  zbierka?: { id: string; nazov: string; pozn: string };
  iskry: number;
}
export const refIskry = (v: Iskra) => v.zbierka?.id ?? `iskra-${v.id}`;

// ---- mock prúd (prototyp) ----
export const ISKRY_MOCK: Iskra[] = [
  { id: "emka", src: "/video/iskry/husle.mp4", druh: 1, autor: "Emka, 6 rokov", kto: "Juh · Trenčín", ini: "EM", org: false, popis: "Vivaldi, Jar. Husle mi už sú malé, cvičím na sesterkiných.",
    zbierka: { id: "iskra-zb-husle", nazov: "Nové husle pre Emku", pozn: "Zbierka pri videu · 100 % na husle" }, iskry: 2140, bg: "linear-gradient(160deg,#8A5A2B,#2B1A0E)" },
  { id: "balony", src: "/video/iskry/balony.mp4", druh: 4, autor: "Svetlo pomoci o.z.", kto: "Charita · Trenčín", ini: "SP", org: true, popis: "Súťaž v nafukovaní balónov s deťmi z centra. Vyhral Maťo, balón mu ulietel aj s ním.",
    iskry: 860, bg: "url('/img/sprava/dom.jpg') center/cover no-repeat #3a3530" },
  { id: "hrasko", src: "/video/iskry/prva-pomoc.mp4", druh: 2, autor: "MUDr. Hraško", kto: "Tvorca · lekár · Trenčín", ini: "MH", org: false, popis: "Ako pomôcť človeku, ktorý sa dusí. 40 sekúnd, ktoré môžu zachrániť život.",
    iskry: 5310, bg: "linear-gradient(160deg,#3D6B8E,#1D3A50)" },
  { id: "florbal", src: "/video/iskry/florbal.mp4", druh: 3, autor: "TJ Sokol Opatová", kto: "Šport · Opatová", ini: "TJ", org: true, popis: "Žiačky vyhrali kraj vo florbale. Na majstrovstvá potrebujeme dopravu.",
    zbierka: { id: "iskra-zb-autobus", nazov: "Autobus na majstrovstvá", pozn: "Zbierka pri videu" }, iskry: 420, bg: "linear-gradient(160deg,#4E7D37,#22351A)" },
  { id: "vah", src: "/video/iskry/skutok.mp4", druh: 5, autor: "Jana K.", kto: "Juh · skutok overený", ini: "JK", org: false, popis: "S deťmi sme vyčistili breh Váhu. 14 vriec odpadu a jeden starý bicykel.",
    zbierka: { id: "iskra-zb-nina", nazov: "Invalidný vozík pre Ninu", pozn: "Reťaz dobra · 50 % ide na zbierku" }, iskry: 98, bg: "url('/img/sprava/chrbtica.jpg') center/cover no-repeat #3a3530" },
];

// ---- stav relácie ----
const moje = new Set<string>();      // moje Iskry
const sledujem = new Set<string>();  // sledovaní autori
const overujem = new Set<string>();
const namietky = new Map<string, { dovod: string; text: string; cas: string }>();
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyIskier = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);

export const mojaIskra = (id: string) => moje.has(id);
export const pocetIskier = (v: Iskra) => v.iskry + (moje.has(v.id) ? 1 : 0);
/** tlačidlo Iskra: zapne / vypne */
export function prepniIskru(id: string) { if (moje.has(id)) moje.delete(id); else moje.add(id); zmena(); }
/** dvojitý ťuk: len zapne */
export function zapniIskru(id: string) { if (!moje.has(id)) { moje.add(id); zmena(); } }
export const sledujemAutora = (autor: string) => sledujem.has(autor);
export function prepniSledovanie(autor: string) { if (sledujem.has(autor)) sledujem.delete(autor); else sledujem.add(autor); zmena(); }
export const overujemIskru = (id: string) => overujem.has(id);
export function prepniOverenie(id: string) { if (overujem.has(id)) overujem.delete(id); else overujem.add(id); zmena(); }
export const namietkaIskry = (id: string) => namietky.get(id) ?? null;
/** námietku posúdi DEED; video sa medzitým neposúva do vyššej oblasti */
export function podajNamietku(id: string, dovod: string, text: string) { namietky.set(id, { dovod, text, cas: new Date().toISOString() }); zmena(); }
/** posun do vyššej oblasti — až po 12 h a bez otvorenej námietky (keď sa zapnú oblasti) */
export const mozePostupit = (id: string, zverejnene: string, teraz = Date.now()) =>
  !namietky.has(id) && teraz - Date.parse(zverejnene) >= ISKRY_CFG.posunPoHodinach * 3600000;
