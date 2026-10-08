// ============================================================
// KARTA 56F · OPRAVY 165 — Omše a kalendár farnosti: dáta.
// Kalendár začína prázdny (žiadne omše, žiadne udalosti), kým ich farár nenastaví.
// Rozvrh: 3 omše (ranná · večerná · veľká nedeľná) × 3 prepisovateľné časy → týždenný vzor (pri dni vybrané časy).
// Ťuk na deň mení len ten deň: zrušiť / posunúť omšu z rozvrhu, pridať bohoslužbu, modlitbu, obrad alebo vlastnú položku.
// Uloženie v účte farnosti: naboz_stav (oblasť „kalendar", kľúč = stránka) cez viera/stav (LS + zrkadlo v DB).
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { nacitajStav, ulozStav, synchronizujStav } from "@/features/viera/stav";

/** kód omše z rozvrhu = skupina × 10 + poradie času (0 ranná · 1 večerná · 2 veľká) */
export type KodOmse = number;
export const SKUPINY_OMSI: [number, string, string][] = [[0, "Ranná", "ranná"], [2, "Veľká (nedeľná)", "veľká"], [1, "Večerná", "večerná"]];
const NAZ_SK = ["ranná", "večerná", "veľká"];
export const nazovOmse = (k: KodOmse) => NAZ_SK[Math.floor(k / 10)] ?? "omša";
export const PREDVOLENE_CASY: string[][] = [["6:00", "6:30", "7:00"], ["17:30", "18:00", "18:30"], ["9:00", "10:00", "10:30"]];

export interface PolozkaDna { id: string; typ: string; t: string; m: string }
export interface KalKostol {
  casy: string[][];
  /** krok 1 uložený → krok 2 (týždenný vzor) odomknutý */
  casyOk: boolean;
  /** týždenný vzor: 0 = pondelok … 6 = nedeľa → kódy omší */
  vzor: Record<number, KodOmse[]>;
  /** dátum (RRRR-MM-DD) → zrušené omše z rozvrhu len v ten deň */
  zrus: Record<string, KodOmse[]>;
  /** dátum → posunutý čas omše z rozvrhu len v ten deň */
  posun: Record<string, Record<number, string>>;
  /** dátum → pridané položky dňa */
  extra: Record<string, PolozkaDna[]>;
  /** KARTA 56G §3: „Poslať oznam veriacim?" — odpoveď ku zmene omše (kľúč „dátum|kód") */
  odpovede?: Record<string, "ano" | "nie">;
}
export type Verej = "omse" | "zmeny" | "modl" | "pohreb" | "sobas" | "krst" | "udal" | "umysel";
export interface KalendarFarnosti {
  kostoly: Record<string, KalKostol>;
  /** vlastné položky ponuky (zapamätané) */
  vlastne: string[];
  /** Čo uvidia ľudia na stránke (aj plagát) */
  verejne: Record<Verej, boolean>;
  /** týždeň pripnutý v Prehľade */
  pin: boolean;
}

export const VEREJNE_VOLBY: [Verej, string][] = [
  ["omse", "Omše z rozvrhu"], ["zmeny", "Zrušené a posunuté omše"], ["modl", "Modlitby (ruženec, adorácia…)"], ["pohreb", "Pohreby s menom"],
  ["sobas", "Sobáše s menami"], ["krst", "Krsty s menom"], ["udal", "Ostatné udalosti (birmovka, prijímanie…)"], ["umysel", "Úmysly omší (za koho)"],
];
// predvolene vypnuté: sobáše, krsty, úmysly
const VEREJNE_ZAKLAD: Record<Verej, boolean> = { omse: true, zmeny: true, modl: true, pohreb: true, sobas: false, krst: false, udal: true, umysel: false };

/** položky, ktoré sa dajú pridať do dňa: [kľúč, názov, krátko, predvolený čas, poznámka do poľa, skupina, kategória viditeľnosti] */
export type Skupina = "Bohoslužby" | "Modlitby" | "Obrady" | "Vaše vlastné";
export interface DruhPolozky { k: string; nazov: string; kratko: string; cas: string; ph: string; skupina: Skupina; kat: Verej }
const D = (k: string, nazov: string, kratko: string, cas: string, ph: string, skupina: Skupina, kat: Verej): DruhPolozky => ({ k, nazov, kratko, cas, ph, skupina, kat });
export const DRUHY: DruhPolozky[] = [
  D("omsa", "Svätá omša", "omša", "18:00", "úmysel, napr. za zosnulých z rodiny", "Bohoslužby", "omse"),
  D("liturgia", "Svätá liturgia", "liturgia", "9:00", "úmysel (nepovinné)", "Bohoslužby", "omse"),
  D("sluzby", "Služby Božie", "služby Božie", "10:00", "poznámka (nepovinné)", "Bohoslužby", "omse"),
  D("slovo", "Bohoslužba slova", "bohoslužba slova", "18:00", "poznámka (nepovinné)", "Bohoslužby", "omse"),
  D("vecieren", "Večiereň", "večiereň", "17:00", "poznámka (nepovinné)", "Modlitby", "modl"),
  D("utieren", "Utiereň", "utiereň", "7:00", "poznámka (nepovinné)", "Modlitby", "modl"),
  D("ruzenec", "Ruženec", "ruženec", "17:30", "poznámka (nepovinné)", "Modlitby", "modl"),
  D("adoracia", "Adorácia", "adorácia", "19:00", "poznámka (nepovinné)", "Modlitby", "modl"),
  D("kriz", "Krížová cesta", "krížová cesta", "15:00", "poznámka (nepovinné)", "Modlitby", "modl"),
  D("moleben", "Moleben", "moleben", "17:00", "poznámka (nepovinné)", "Modlitby", "modl"),
  D("panychida", "Panychída", "panychída", "17:00", "za koho (nepovinné)", "Modlitby", "modl"),
  D("spoved", "Spoveď", "spoveď", "17:00", "poznámka (nepovinné)", "Modlitby", "modl"),
  D("pohreb", "Pohreb", "pohreb", "14:00", "meno zosnulého", "Obrady", "pohreb"),
  D("sobas", "Sobáš", "sobáš", "15:00", "mená snúbencov", "Obrady", "sobas"),
  D("krst", "Krst", "krst", "11:30", "meno dieťaťa", "Obrady", "krst"),
  D("prijimanie", "Prvé sv. prijímanie", "prvé sv. prijímanie", "10:00", "poznámka (nepovinné)", "Obrady", "udal"),
  D("birmovka", "Birmovka", "birmovka", "10:00", "poznámka (nepovinné)", "Obrady", "udal"),
  D("udalost", "Udalosť", "udalosť", "16:00", "názov udalosti", "Obrady", "udal"),
];
export const VLASTNE_PREFIX = "v:";
export function druhPolozky(typ: string): DruhPolozky {
  if (typ.startsWith(VLASTNE_PREFIX)) { const n = typ.slice(VLASTNE_PREFIX.length); return D(typ, n, n.toLocaleLowerCase("sk-SK"), "18:00", "poznámka (nepovinné)", "Vaše vlastné", "modl"); }
  return DRUHY.find((x) => x.k === typ) ?? DRUHY[0];
}
/** obrad (zlatý) vs. bohoslužba / modlitba / vlastné (zelené) */
export const jeObrad = (typ: string) => druhPolozky(typ).skupina === "Obrady";

// ---- čas ----
export const CAS_OK = (v: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(v);
/** KARTA 56H §2: čas sa opravuje sám pri písaní — „15,00" / „15.00" → 15:00, „1500" → 15:00, „15," → „15:" */
export const normCas = (v: string) => {
  let x = v.replace(/[,.\-h ]/g, ":").replace(/[^0-9:]/g, "").replace(/:+/g, ":");
  if (/^\d:\d{3}$/.test(x)) x = x.replace(":", ""); // „1:50" + „0" → „1500"
  if (/^\d{3,4}$/.test(x)) x = `${x.slice(0, -2)}:${x.slice(-2)}`;
  return x.slice(0, 5);
};
/** po odídení z poľa: „15" → 15:00, „15:" → 15:00, KARTA 57 E.3: „15:0" (z „15,0") → 15:00 */
export const dokonciCas = (v: string) => (/^\d{1,2}$/.test(v) ? `${v}:00` : /^\d{1,2}:$/.test(v) ? `${v}00` : /^\d{1,2}:\d$/.test(v) ? `${v}0` : v);
/** červená hláška len pri neexistujúcom čase (nie pri rozpísanom) */
export const casNeexistuje = (v: string) => !!v && !CAS_OK(dokonciCas(v)) && !/^(\d{1,2}|([01]?\d|2[0-3]):[0-5]?)$/.test(v);
export const minuty = (t: string) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
/** „06:30" → „6:30" */
export const pekny = (t: string) => (CAS_OK(t) ? `${Number(t.split(":")[0])}:${t.split(":")[1]}` : t);

// ---- dátumy (týždeň od pondelka) ----
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const zIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
/** 0 = pondelok … 6 = nedeľa */
export const dvt = (d: Date) => (d.getDay() + 6) % 7;
/** o koľko týždňov je deň od tohto týždňa */
export const posunTyzdna = (key: string) => Math.round((pondelokDna(zIso(key)).getTime() - pondelok(0).getTime()) / (7 * 864e5));
const pondelokDna = (d: Date) => { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - dvt(t)); return t; };
export function pondelok(posun = 0): Date { const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - dvt(t) + 7 * posun); return t; }
export const dniTyzdna = (posun = 0) => Array.from({ length: 7 }, (_, i) => { const d = pondelok(posun); d.setDate(d.getDate() + i); return d; });
export const DNI_K = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
export const DNI_D = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
export const MES_G = ["januára", "februára", "marca", "apríla", "mája", "júna", "júla", "augusta", "septembra", "októbra", "novembra", "decembra"];
export const MES_N = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];
/** „5. – 11. októbra" · cez prelom „26. októbra – 1. novembra" */
export function rozsahTyzdna(posun = 0, rok = false): string {
  const [a, b] = [dniTyzdna(posun)[0], dniTyzdna(posun)[6]];
  const t = a.getMonth() === b.getMonth() ? `${a.getDate()}. – ${b.getDate()}. ${MES_G[b.getMonth()]}` : `${a.getDate()}. ${MES_G[a.getMonth()]} – ${b.getDate()}. ${MES_G[b.getMonth()]}`;
  return rok ? `${t} ${b.getFullYear()}` : t;
}

// ---- deň: omše z rozvrhu a položky ----
export const novyKostol = (): KalKostol => ({ casy: PREDVOLENE_CASY.map((x) => [...x]), casyOk: false, vzor: {}, zrus: {}, posun: {}, extra: {} });
export const casKodu = (k: KalKostol, kod: KodOmse) => { const v = k.casy[Math.floor(kod / 10)]?.[kod % 10] ?? ""; return CAS_OK(v) ? pekny(v) : "—"; };
export interface OmsaDna { kod: KodOmse; vzor: string; t: string; zrusena: boolean; posunuta: boolean }
export function omseDna(k: KalKostol, d: Date): OmsaDna[] {
  const key = iso(d), zr = k.zrus[key] ?? [], ps = k.posun[key] ?? {};
  return (k.vzor[dvt(d)] ?? []).map((kod) => { const vz = casKodu(k, kod); const p = ps[kod]; return { kod, vzor: vz, t: p && CAS_OK(p) ? pekny(p) : vz, zrusena: zr.includes(kod), posunuta: !!p && pekny(p) !== vz }; })
    .filter((o) => o.vzor !== "—").sort((a, b) => minuty(a.vzor) - minuty(b.vzor));
}
export const polozkyDna = (k: KalKostol, d: Date) => k.extra[iso(d)] ?? [];
/** deň so zmenou (zrušená / posunutá omša) — jemne červený */
export const maZmenu = (k: KalKostol, d: Date) => omseDna(k, d).some((o) => o.zrusena || o.posunuta);

// ---- úložisko (jeden stav na stránku, zdieľaný Správou a Prehľadom) ----
const prazdny = (): KalendarFarnosti => ({ kostoly: {}, vlastne: [], verejne: { ...VEREJNE_ZAKLAD }, pin: false });
const pamat = new Map<string, KalendarFarnosti>();
const posl = new Set<() => void>();
let verzia = 0;
const zmena = () => { verzia++; posl.forEach((f) => f()); };
function nacitaj(id: string): KalendarFarnosti {
  let s = pamat.get(id);
  if (!s) { const z = nacitajStav<Partial<KalendarFarnosti>>("kalendar", id, {}); s = { ...prazdny(), ...z, verejne: { ...VEREJNE_ZAKLAD, ...(z.verejne ?? {}) } }; pamat.set(id, s); }
  return s;
}
export function kalendar(id: string): KalendarFarnosti { return nacitaj(id); }
export function kostolKal(id: string, kostol = "0"): KalKostol { return nacitaj(id).kostoly[kostol] ?? novyKostol(); }
export function zmenKalendar(id: string, f: (s: KalendarFarnosti) => KalendarFarnosti) {
  const n = f(nacitaj(id)); pamat.set(id, n); ulozStav("kalendar", id, n); zmena();
}
export function zmenKostol(id: string, kostol: string, f: (k: KalKostol) => KalKostol) {
  zmenKalendar(id, (s) => ({ ...s, kostoly: { ...s.kostoly, [kostol]: f(s.kostoly[kostol] ?? novyKostol()) } }));
}
/** zmazanie vlastnej položky z ponuky ju zmaže aj zo všetkých dní */
export function zmazVlastnu(id: string, nazov: string) {
  const typ = VLASTNE_PREFIX + nazov;
  zmenKalendar(id, (s) => ({
    ...s, vlastne: s.vlastne.filter((x) => x !== nazov),
    kostoly: Object.fromEntries(Object.entries(s.kostoly).map(([kk, k]) => [kk, { ...k, extra: Object.fromEntries(Object.entries(k.extra).map(([d, l]) => [d, l.filter((p) => p.typ !== typ)])) }])),
  }));
}
export function useKalendar(id: string): KalendarFarnosti {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => verzia);
  useEffect(() => { let ziva = true; void synchronizujStav(id).then((ok) => { if (ok && ziva) { pamat.delete(id); zmena(); } }); return () => { ziva = false; }; }, [id]);
  return nacitaj(id);
}
/** nedeľné omše hlavného kostola (pre omšové okno v Zbierkach) */
export function nedelneOmse(id: string): string[] {
  const k = kostolKal(id);
  return (k.vzor[6] ?? []).map((kod) => casKodu(k, kod)).filter((t) => t !== "—").sort((a, b) => minuty(a) - minuty(b));
}
