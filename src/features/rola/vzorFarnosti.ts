// ============================================================
// OPRAVY 467 · Vzory v Ateliéri — ukážková stránka „Farnosť vzorová“.
// Obsah z prototypov Ateliéra (DEMO Nástenky živo, rovnaký vo všetkých štyroch vzhľadoch), meno prepísané na Farnosť vzorová.
// Vykresľuje ho skutočná NastenkaFarnosti; dáta sú len v pamäti (lib/vzorStranky.ts), nič sa neukladá ani nesťahuje.
// Dátumy sú vždy okolo dneška, aby udalosti a omše na vzore neboli po termíne.
// ============================================================
import { registrujVzor, registrujVzorData, VZOR_FARNOST } from "@/lib/vzorStranky";
import { iso, type KalendarFarnosti, type KalKostol } from "@/lib/kalendarFarnosti";
import type { CentralnaZbierka } from "@/lib/centralnaZbierka";
import type { SpustenaZbierka, MediumZbierky } from "@/lib/novaZbierka";
import type { NastavenieZvoncek } from "@/lib/zvoncekZbierka";
import type { DarRiadok } from "@/lib/darcovia";
import type { VieraFeedItem } from "@/features/viera/mock";
import type { PolozkaFarnika } from "@/lib/odFarnikov";
import type { ReakcieF } from "@/lib/reakcieFarnosti";
import type { Brigada } from "@/lib/brigady";
import type { Stretnutie } from "@/lib/detiMladez";
import type { Miesto } from "@/lib/miestaFarnosti";
import type { OnlineOmse } from "@/lib/prihovor";
import type { ProfilStranky } from "@/lib/profilStranky";
import { POVODNE } from "@/lib/usporiadanieStranky";

export const VZOR_ID = VZOR_FARNOST;
export const VZOR_MENO = "Farnosť vzorová";
export const VZOR_USPORIADANIE = POVODNE;

const IMG = (u: string, w = 800) => `https://images.unsplash.com/${u}?w=${w}&q=70&auto=format&fit=crop`;
const F_KOSTOL = IMG("photo-1438032005730-c779502df39b", 1800);
const F_PUT = IMG("photo-1542601906990-b4d3fb778b09", 900);
const F_DETI = IMG("photo-1488521787991-ed7bbaae773c", 700);
const F_DOZINKY = IMG("photo-1507842217343-583bb7270b66", 600);
const foto = (id: number, src: string): MediumZbierky => ({ id, typ: "foto", src });

const DEN = 864e5;
const teraz = Date.now();
const dnes = new Date(); dnes.setHours(0, 0, 0, 0);
/** dátum o n dní od dneška (RRRR-MM-DD) */
const d = (n: number) => iso(new Date(dnes.getTime() + n * DEN));
/** najbližší deň v týždni (0 = pondelok … 6 = nedeľa) od dneška, aspoň o `min` dní */
const najblizsi = (wd: number, min = 1) => { for (let n = min; n < min + 7; n++) if ((new Date(dnes.getTime() + n * DEN).getDay() + 6) % 7 === wd) return n; return min; };
const ucty = (n: number, z = "v") => Array.from({ length: n }, (_, i) => `${z}${i + 1}`);
const menaZ = (l: string[], mena: string[]) => Object.fromEntries(mena.map((m, i) => [l[i], m]));

// ---- profil ----
export const VZOR_PROFIL: ProfilStranky = {
  meno: VZOR_MENO,
  onas: "<p>Farnosť vzorová pri hlavnom námestí. Patrí k nej farský kostol sv. Michala, kostol Panny Márie a kaplnka sv. Anny. Radi privítame každého, kto hľadá ticho, spoveď alebo len chce prísť pozrieť.</p>",
  onas2: "",
  kontakt: {
    sidlo: "Farské námestie 1", adresaVerejna: "Farské námestie 1",
    telefony: [{ cislo: "0900 000 000", popis: "farský úrad" }], emaily: [], web: "", siete: {},
    uradne: { d: [[{ od: "9:00", do: "11:00" }], [], [{ od: "9:00", do: "11:00" }], [{ od: "16:00", do: "18:00" }], [], [], []], poz: "" },
    udaje: { ico: "", dic: "", iban: "", spravca: "" },
  },
  logo: null, tvar: "kruh", logoRezim: "vyplnit", logoPozadie: "biele", bezLoga: true, inicialy: "FV",
  cover: { src: F_KOSTOL, w: 1800, h: 1200, priemer: "", vyrez: { rezim: "cela", zoom: 1, x: 0, y: 0 } }, ram: "bez",
};

// ---- kostoly a omše ----
const miesta: Miesto[] = [
  { id: "0", druh: "farsky", nazov: "Svätého Michala", adresa: "Farské námestie 1", media: [foto(1, F_KOSTOL)], popis: "Najcennejšia a najstaršia sakrálna pamiatka v meste.", historia: "", vytvorene: d(-400) },
  { id: "k1", druh: "kostol", nazov: "Panny Márie", adresa: "Mariánska 2", media: [], popis: "Menší kostol, ranná omša vo štvrtok.", historia: "", vytvorene: d(-400) },
  { id: "k2", druh: "kaplnka", nazov: "Svätej Anny", adresa: "Nemocničná 3", media: [], popis: "Spätá so stredovekým mestským špitálom.", historia: "", vytvorene: d(-400) },
];
const kostol = (k: Partial<KalKostol>): KalKostol => ({ casy: [["6:30", "7:00", "7:30"], ["18:00"], ["10:30"]], casyOk: true, vzor: {}, zrus: {}, posun: {}, extra: {}, ...k });
const nPut = najblizsi(5, 3), nDeti = najblizsi(5, nPut + 1), nOdpust = najblizsi(6, 2), nBrig = najblizsi(5, 1), nStretko = najblizsi(4, 1);
const kalendar: KalendarFarnosti = {
  kostoly: {
    // kód omše = skupina × 10 + poradie času: 0 6:30 · 1 7:00 · 2 7:30 · 10 18:00 · 20 10:30
    "0": kostol({ vzor: { 0: [0], 1: [0, 10], 3: [10], 4: [10], 5: [1, 10], 6: [2, 20, 10] },
      extra: { [d(nPut)]: [{ id: "vz-u1", typ: "udalost", t: "6:00", m: "Farská púť" }], [d(nDeti)]: [{ id: "vz-u2", typ: "udalost", t: "10:00", m: "Detská sobota s miništrantmi" }] } }),
    k1: kostol({ vzor: { 3: [0] } }),
    k2: kostol({ vzor: { 2: [10] } }),
  },
  vlastne: [], verejne: { omse: true, zmeny: true, modl: true, pohreb: true, sobas: false, krst: false, udal: true, umysel: false }, pin: false,
};
const online: OnlineOmse = { on: true, url: "https://www.youtube.com/", rules: [{ wd: 6, d: "", t: "10:30", kazdy: true, kod: 20 }] };

// ---- príspevky Správy: oznamy, udalosti ----
const zaklad = (id: string, dniSpat: number) => ({ id, comp: "data" as const, typ: "skutok" as const, modul: "charity" as const, kat: "Komunita" as const, skore: 6, typSituacie: "normal" as const,
  dni: 0, podpora: 0, farnostId: VZOR_ID, cirkev: "", komunita: VZOR_MENO, overena: true, vytvorene: teraz - dniSpat * DEN });
const prispevky = [
  { ...zaklad("vz-o1", 1), ntyp: "oznam", tag: "Zmena omše", nazov: "V stredu ranná omša nebude", popis: "Večerná o 18:00 v kaplnke sv. Anny.", platnostDni: 7 },
  { ...zaklad("vz-o2", 3), ntyp: "oznam", tag: "Oznam", nazov: "Ohlášky na tento týždeň", popis: "Ruženec denne o 17:30, v piatok prvopiatková spoveď od 16:00.", platnostDni: 7 },
  { ...zaklad("vz-o3", 5), ntyp: "oznam", tag: "Oznam", nazov: "Zápis do prípravy na birmovku", popis: "Do konca mesiaca na farskom úrade.", platnostDni: 14 },
  { ...zaklad("vz-u1", 6), ntyp: "udalost", tag: "Udalosť", nazov: "Farská púť", popis: "Autobus odchádza o 6:00 spred fary, vraciame sa večer. Svätá omša v bazilike, obed spolu.", datum: d(nPut),
    udalost: { cas: "6:00", miesto: "Farské námestie", text: "Autobus odchádza o 6:00 spred fary, vraciame sa večer. Svätá omša v bazilike, obed spolu.", zavazne: true },
    pozvanie: { zavazne: true, limit: 50, menaVer: true }, rsvp: true, fotky: [F_PUT] },
  { ...zaklad("vz-u2", 4), ntyp: "udalost", tag: "Udalosť", nazov: "Detská sobota s miništrantmi", popis: "", datum: d(nDeti), udalost: { cas: "10:00", miesto: "Farská záhrada" },
    pozvanie: { zavazne: false }, rsvp: true, fotky: [F_DETI] },
] as unknown as VieraFeedItem[];

// ---- od veriacich: prosby, oznam, udalosť, fotky, jubileum, poďakovanie, parte ----
const od = (x: Omit<PolozkaFarnika, "cas"> & { pred: number }): PolozkaFarnika => { const { pred, ...r } = x; return { ...r, cas: teraz - pred * DEN }; };
const odfarnikov: PolozkaFarnika[] = [
  od({ id: "vz-p1", k: "modlitba", t: "Za moju mamu, v stredu ide na operáciu srdca.", s: "", kto: "Bohu známy veriaci", anon: true, modl: ucty(34), pred: 1 }),
  od({ id: "vz-p2", k: "modlitba", t: "Za našu dcéru, ktorá v januári čaká bábätko.", s: "", kto: "Lucia M.", modl: ucty(18), pred: 2 }),
  od({ id: "vz-p3", k: "modlitba", t: "Za pokoj a zmierenie v našej rodine.", s: "", kto: "Bohu známy veriaci", anon: true, modl: ucty(52), pred: 3 }),
  od({ id: "vz-v1", k: "oznam", t: "Našli sa kľúče pri kostole", s: "Sú na farskom úrade.", kto: "Jana H.", pred: 2 }),
  od({ id: "vz-v2", k: "udalost", t: "Odpust sv. Terézie", s: "Svätá omša a po nej agapé pred kaplnkou.", kto: "Ján H.", pozv: 1, ucast: ucty(58),
    f: { nad: "Odpust sv. Terézie", txt: "", datum: d(nOdpust), cas: "10:30", kde: "Kaplnka sv. Anny", umK: 0, pozv: 1, limit: "", anon: false }, pred: 3 }),
  od({ id: "vz-a1", k: "fotky", t: "Dožinky", s: "", kto: "Eva K.", fotky: [F_DOZINKY, F_KOSTOL, F_DETI], pred: 4 }),
  od({ id: "vz-j1", k: "ine", t: "Anna a Ján, 50 rokov spolu", s: "Ďakovná omša vo štvrtok o 18:00.", kto: "Rodina", blaho: ucty(56),
    editor: { stav: "hotovo", typ: "jubileum", polia: { jMeno: "Anna a Ján", jD: d(2), jVekTxt: "50" } }, pred: 2 }),
  od({ id: "vz-j2", k: "ine", t: "Ďakujeme spevokolu", s: "Za krásnu dožinkovú omšu a všetkým, ktorí pomohli.", kto: "Eva K.", blaho: ucty(12), pred: 3 }),
  od({ id: "vz-q1", k: "parte", t: "Mária K.", s: "", kto: "Peter K., syn", sustrast: ucty(23),
    editor: { stav: "hotovo", typ: "parte", polia: { meno: "Mária K.", nar: "1938", umr: "2026", rd: d(2), rc: "14:00", rm: "Dom smútku" } }, pred: 1 }),
];

// ---- reakcie (Prídem, Prihlásiť sa) ----
const prihlaseni = ucty(32, "p");
const reakcie: Record<string, ReakcieF> = {
  "vz-u1": { ucast: prihlaseni, mena: menaZ(prihlaseni, ["Jozef M.", "Anna K.", "Peter H.", "Lucia M.", "Ján N.", "Eva K."]) },
  "vz-u2": { ucast: ucty(14, "d") },
  "vz-b1": { ucast: ucty(9, "b") },
  "vz-b2": { ucast: ucty(4, "l") },
};

// ---- pomôž, deti ----
const brigady: Brigada[] = [
  { id: "vz-b1", druh: "Brigáda", t: "Upratovanie fary a záhrady", dat: d(nBrig), cas: "9:00 – 12:00", kde: "Fara", txt: "<p>Hrabanie lístia a orezanie kríkov. Rukavice a náradie máme.</p>", pz: 1, limit: 0, vytvorena: d(-3) },
  { id: "vz-b2", druh: "Služba pri omši", t: "Hľadáme lektorov", dat: d(nBrig), cas: "10:00", kde: "Farský kostol", txt: "<p>Čítanie na nedeľnej omši. Naučíme vás, stačí prísť na nácvik.</p>", pz: 1, limit: 0, vytvorena: d(-3) },
];
const deti: Stretnutie[] = [
  { id: "vz-s1", druh: "Stretko", t: "Stretko mladých", dat: d(nStretko), cas: "17:00", kde: "Fara", txt: "", pz: 0, limit: 0, vytvorena: d(-5) },
  { id: "vz-s2", druh: "Tábor", t: "Letný tábor", dat: d(250), datDo: d(255), cas: "", kde: "Kysuce", txt: "", pz: 2, limit: 40, vytvorena: d(-5) },
];

// ---- zbierky ----
const centralna: CentralnaZbierka = { popis: "<p>Na kúrenie, svetlo, kostol a všetko, čo farnosť robí.</p>", popis2: "", media: [foto(1, F_KOSTOL)], sada: 0, eurc: false, sadaE: 0, ucet: null, spustena: d(-300), nazov: "Podporiť farnosť" };
const zvoncek: NastavenieZvoncek = { nazov: "Zvončeková zbierka", popis: "", popis2: "", media: [], sada: 0, eurc: false, sadaE: 0 };
const zbierka = (id: string, nazov: string, ciel: string, media: MediumZbierky[], konci?: number): SpustenaZbierka => ({
  id, stranka: VZOR_ID, spustena: d(-60), ucet: "", lehota: konci != null ? d(konci) : "", lehotaKluc: null, stav: "aktivna",
  nazov, popis: "", popis2: "", media, typ: "ine" as SpustenaZbierka["typ"], mesiace: 12, cielTyp: ciel ? "ciel" : "otv", ciel, iban: "", sada: 0, eurc: false, sadaE: 0,
  prav: true, ucel: null, ineT: "", ineL: null, krok: 0, farnost: { druh: "farnost" } });
const zbierky: SpustenaZbierka[] = [
  zbierka("vzor-z1", "Nové lavice do kostola", "12000", [foto(1, F_KOSTOL)]),
  zbierka("vzor-z2", "Oprava organu", "9000", []),
  zbierka("vzor-z3", "Misijná nedeľa", "", [], 5),
];

// ---- dary (súčty na kartách) ----
const dar = (ref: string, i: number, suma: number): DarRiadok => ({ id: `${ref}-${i}`, refId: ref, cas: teraz - i * 3600e3, suma, kanal: "karta" as DarRiadok["kanal"], registrovany: false, verzia: 4 as DarRiadok["verzia"], zobrazSumu: false });
const dary = (ref: string, pocet: number, spolu: number): DarRiadok[] => Array.from({ length: pocet }, (_, i) => dar(ref, i, Math.round((spolu / pocet) * 100) / 100));
const DARY: Record<string, DarRiadok[]> = {
  [`${VZOR_ID}-centralna`]: dary(`${VZOR_ID}-centralna`, 96, 1240),
  "vzor-z1": dary("vzor-z1", 140, 4200),
  "vzor-z2": dary("vzor-z2", 182, 4120),
  "vzor-z3": dary("vzor-z3", 64, 820),
};

registrujVzor(VZOR_ID, { kalendar, online, prispevky, odfarnikov, reakcie, brigady, deti, miesta, zvoncek });
registrujVzorData(`${VZOR_ID}:centralna`, centralna);
registrujVzorData(`${VZOR_ID}:zbierky`, zbierky);
registrujVzorData("vzor:dary", DARY);
