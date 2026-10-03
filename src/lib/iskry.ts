// ============================================================
// KARTA 41 · Iskry — centrálny prúd (časť 1). Starý názov „Talent" = Iskra.
// Zatiaľ jeden prúd pre celé Slovensko; filter oblastí je pripravený, ale skrytý (ZOBRAZ_OBLASTI).
// Iskra = „páči sa mi" (zadarmo, len počet). Dary idú cez darcovia.ts (jediné miesto zápisu darov).
// Mock: ukážkové videá v public/video/iskry/ (skutok.mp4 = výrez z nakup.mp4; husle, balony, prva-pomoc, florbal treba dodať),
// texty z prototypu „Iskra centralna mobil", stav (iskry, sledovanie, námietky) v pamäti relácie.
// TODO (server): prúd videí, počty Iskier, námietky a cudzie dary v reálnom čase prídu z API / realtime.
// ============================================================
import { useSyncExternalStore } from "react";
import { najdiTestProfil, type TestProfil, type TestZbierka } from "@/lib/testProfily";

export const ISKRY_CFG = {
  /** filter Štvrť · Mesto · Kraj · Krajina — zapne sa, až keď bude obsah (Martin 2. 10.) */
  zobrazOblasti: false,
  oblasti: ["Štvrť", "Mesto", "Kraj", "Krajina"] as const,
  druhy: ["Všetko", "Talent", "Vedomosti", "Šport", "Zábava", "Skutky", "Zbierky"] as const,
  /** OPRAVY 135: druh „Zbierky" (posledný) — videá k vlastnej zbierke; v „Všetko" ani inde sa neukážu */
  druhZbierky: 6 as const,
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

export type DruhIskry = 1 | 2 | 3 | 4 | 5 | 6; // index v ISKRY_CFG.druhy (6 = Zbierky)
export interface Iskra {
  id: string; druh: DruhIskry;
  autor: string; kto: string; ini: string; org: boolean;
  popis: string;
  /** video na výšku do 45 s; `bg` je poster, kým sa načíta (a ostane, keď súbor chýba) */
  src?: string; bg: string;
  /** zbierka pri videu — dar ide na ňu; bez nej ide autorovi */
  zbierka?: { id: string; nazov: string; pozn: string };
  iskry: number;
  /** KARTA 41b: Bez peňazí → pri videu nie je Darovať */
  bezDarov?: boolean;
  /** Reťaz dobra: koľko % z daru ide na zbierku (zvyšok autorovi) — pre QR (reťaz) */
  retazPct?: number;
  /** charita bez „Ukázať všetkým v Iskrách" → len na stránke charity (prúd ju ukáže len autorovi) */
  lenStranka?: boolean;
  /** zverejnené (ISO) — posun do vyššej oblasti po 12 h */
  zverejnene?: string;
  /** OPRAVY 135 · druh Zbierky: video k vlastnej zbierke toho, kto ju vedie (stránka = kľúč testProfily) */
  zb?: IskraZbierky;
}
/** výzva / priebeh = bežiaca zbierka (Darovať = platba do nej) · ďakujeme = ukončená (doklady) · firme = poďakovanie firme */
export interface IskraZbierky { typ: "vyzva" | "dakujeme" | "firme"; stitok: string; stranka: string; zbierkaId: string; firma?: string }
/** zbierka (a stránka) pri videu druhu Zbierky */
export function zbierkaIskry(v: Iskra): { profil: TestProfil; z: TestZbierka; firma?: TestProfil } | null {
  if (!v.zb) return null;
  const profil = najdiTestProfil(v.zb.stranka), z = profil?.zbierky.find((x) => x.id === v.zb!.zbierkaId);
  return profil && z ? { profil, z, firma: v.zb.firma ? najdiTestProfil(v.zb.firma) : undefined } : null;
}
/** výzvy po skončení zbierky z kanála zmiznú, poďakovania ostávajú */
export const iskraViditelna = (v: Iskra) => !(v.zb?.typ === "vyzva" && zbierkaIskry(v)?.z.stav === "ukoncena");
/** prúd pre druh: „Všetko" (0) bez Zbierok, Zbierky len po ťuku na Zbierky */
export const iskryVDruhu = (druh: number): Iskra[] =>
  iskryVsetky().filter((v) => iskraViditelna(v) && (druh === 0 ? v.druh !== ISKRY_CFG.druhZbierky : v.druh === druh));
export const refIskry = (v: Iskra) => v.zb?.zbierkaId ?? v.zbierka?.id ?? `iskra-${v.id}`;

// ---- mock prúd (prototyp) ----
function fotoZb(stranka: string, id: string): string {
  const f = najdiTestProfil(stranka)?.zbierky.find((z) => z.id === id)?.foto;
  return f ? `url('${f}') center/cover no-repeat #3a3530` : "#3a3530";
}
export const ISKRY_MOCK: Iskra[] = [
  { id: "emka", src: "/video/iskry/husle.mp4", druh: 1, autor: "Emka, 6 rokov", kto: "Juh · Trenčín", ini: "EM", org: false, popis: "Vivaldi, Jar. Husle mi už sú malé, cvičím na sesterkiných. Pani učiteľka hovorí, že by som mala mať celé, nie trištvrťové. Cvičím každý deň po škole, aj v sobotu. Na jar hrám na koncerte v Piaristickom kostole. Ďakujem každému, kto mi pomôže.",
    zbierka: { id: "iskra-zb-husle", nazov: "Nové husle pre Emku", pozn: "Zbierka pri videu · 100 % na husle" }, iskry: 2140, bg: "linear-gradient(160deg,#8A5A2B,#2B1A0E)" },
  { id: "balony", src: "/video/iskry/balony.mp4", druh: 4, autor: "Svetlo pomoci o.z.", kto: "Charita · Trenčín", ini: "SP", org: true, popis: "Súťaž v nafukovaní balónov s deťmi z centra. Vyhral Maťo, balón mu ulietel aj s ním.",
    iskry: 860, bg: "url('/img/sprava/dom.jpg') center/cover no-repeat #3a3530" },
  { id: "hrasko", src: "/video/iskry/prva-pomoc.mp4", druh: 2, autor: "MUDr. Hraško", kto: "Tvorca · lekár · Trenčín", ini: "MH", org: false, popis: "Ako pomôcť človeku, ktorý sa dusí. 40 sekúnd, ktoré môžu zachrániť život. Najprv sa opýtaj, či môže kašľať. Ak nie, päť úderov medzi lopatky a potom päť stlačení nad pupkom. Opakuj, kým predmet nevyjde alebo kým nepríde záchranka. Pri dieťati do roka je postup iný, ukážem ho v ďalšom videu.",
    iskry: 5310, bg: "linear-gradient(160deg,#3D6B8E,#1D3A50)" },
  { id: "florbal", src: "/video/iskry/florbal.mp4", druh: 3, autor: "TJ Sokol Opatová", kto: "Šport · Opatová", ini: "TJ", org: true, popis: "Žiačky vyhrali kraj vo florbale. Na majstrovstvá potrebujeme dopravu. Turnaj je v Žiline a trvá tri dni.\nAutobus pre 16 hráčok a dvoch trénerov stojí 640 €. Ubytovanie a stravu nám platí zväz. Každé euro navyše pôjde na nové dresy.",
    zbierka: { id: "iskra-zb-autobus", nazov: "Autobus na majstrovstvá", pozn: "Zbierka pri videu" }, iskry: 420, bg: "linear-gradient(160deg,#4E7D37,#22351A)" },
  { id: "vah", src: "/video/iskry/skutok.mp4", druh: 5, autor: "Jana K.", kto: "Juh · skutok overený", ini: "JK", org: false, popis: "S deťmi sme vyčistili breh Váhu. 14 vriec odpadu a jeden starý bicykel.",
    zbierka: { id: "iskra-zb-nina", nazov: "Invalidný vozík pre Ninu", pozn: "Reťaz dobra · 50 % ide na zbierku" }, iskry: 98, bg: "url('/img/sprava/chrbtica.jpg') center/cover no-repeat #3a3530" },
  // OPRAVY 135 · Zbierky: 4 videá k zbierkam Svetla pomoci, Pekárne a Martina Konaľa (bez súboru videa → poster z fotky zbierky)
  { id: "zb-strecha", druh: 6, autor: "Svetlo pomoci o.z.", kto: "Charita · Trenčín", ini: "SP", org: true, iskry: 640, bg: fotoZb("svetlo", "z-strecha-horvath"),
    popis: "Horváthovcom v noci zhorela strecha. Prvú etapu sme už opravili, do zimy chýba krytina. Pomôžte nám to dokončiť.",
    zb: { typ: "vyzva", stitok: "Výzva", stranka: "svetlo", zbierkaId: "z-strecha-horvath" } },
  { id: "zb-husle", druh: 6, autor: "Martin Konaľ", kto: "Tvorca · Trenčín", ini: "MK", org: false, iskry: 1180, bg: fotoZb("tvorca", "tz-husle-deti"),
    popis: "Piate husle sú doma. Ešte šesť detí čaká na svoje, hrám pre ne každý piatok na Mierovom námestí.",
    zb: { typ: "vyzva", stitok: "Priebeh", stranka: "tvorca", zbierkaId: "tz-husle-deti" } },
  { id: "zb-ihrisko", druh: 6, autor: "Pekáreň Dobrota", kto: "Firma · Bratislava", ini: "PD", org: true, iskry: 410, bg: fotoZb("pekaren", "fz-ihrisko"),
    popis: "Ihrisko na Račianskej je hotové. Ďakujeme všetkým, ktorí sa pridali.",
    zb: { typ: "dakujeme", stitok: "Ďakujeme", stranka: "pekaren", zbierkaId: "fz-ihrisko" } },
  { id: "zb-pekaren", druh: 6, autor: "Svetlo pomoci o.z.", kto: "Charita · Trenčín", ini: "SP", org: true, iskry: 520, bg: fotoZb("svetlo", "z-strecha-horvath"),
    popis: "Ďakujeme Pekárni Dobrota. Každý dar na strechu pre Horváthovcov zdvojnásobila.",
    zb: { typ: "firme", stitok: "Ďakujeme firme", stranka: "svetlo", zbierkaId: "z-strecha-horvath", firma: "pekaren" } },
];

// ---- KARTA 41b · pridané Iskry (relácia; TODO server: nahratie videa, uloženie, kvóta charity) ----
const pridane: Iskra[] = [];
/** celý prúd: najnovšie pridané hore, potom ukážkové */
export const iskryVsetky = (): Iskra[] => [...pridane, ...ISKRY_MOCK];
export const najdiIskru = (id: string): Iskra | undefined => iskryVsetky().find((x) => x.id === id);
export function pridajIskru(i: Omit<Iskra, "id" | "iskry" | "zverejnene">): Iskra {
  const n: Iskra = { ...i, id: `i-${Date.now().toString(36)}`, iskry: 0, zverejnene: new Date().toISOString() };
  pridane.unshift(n); zmena(); return n;
}
/** odkaz Iskry (QR, zdieľanie) — appka ho otvorí v prúde na tomto videu; bez appky web stránka Iskry */
export const odkazIskry = (id: string) => `https://deed.sk/i/${encodeURIComponent(id)}`;
/** charita: videá „všetkým v Iskrách" mesačne v cene programu (Zadarmo 1 · P2 2 · P3 4), ďalšie za cenaNad € */
/** videá „všetkým v Iskrách" za mesiac podľa cenníka: Zadarmo 1 · P1 Zbierka 1 · P2 Akcia 2 · P3 Kampaň 4 · Spolok 1; ďalšie za cenaNad € (rovnako vo všetkých) */
export const KVOTA_ISKIER = { naProgram: [1, 1, 2, 4, 1] as number[], cenaNad: 10 };
const kvotaPouzita = new Map<string, number>(); // kľúč: stránka + mesiac
const mesiac = () => new Date().toISOString().slice(0, 7);
export const kvotaOstava = (stranka: string, tier: number) => Math.max(0, (KVOTA_ISKIER.naProgram[tier] ?? 1) - (kvotaPouzita.get(`${stranka}|${mesiac()}`) ?? 0));
export function minKvotu(stranka: string) { const k = `${stranka}|${mesiac()}`; kvotaPouzita.set(k, (kvotaPouzita.get(k) ?? 0) + 1); }

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
