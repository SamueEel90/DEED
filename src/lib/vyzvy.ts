// ============================================================
// VÝZVA TVORCU — jeden motor pre „sprav niečo a máš odo mňa niečo".
//
// Tvorca vyhlási podmienku, dá za ňu odmenu a určí obdobie. Systém sám
// zistí, kto ju splnil, a buď odmení všetkých, alebo vyžrebuje N ľudí.
//
// Prečo to nikto iný nemá: odmeňovať overený skutok vedia dnes len veľké
// značky cez krvné banky, a to ručne pri každej kampani. My máme dar, skutok
// aj QR tvorcu overené v systéme, takže zoznam oprávnených vypadne sám.
//
// Dve pravidlá, na ktorých to celé stojí:
//  1. Odmenu dáva TVORCA zo svojho (zľava, vstup, párty). Platforma nesľubuje
//     nič, čo by musela plniť sama.
//  2. Žreb musí byť dokázateľný. Náhoda sa berie z hashu bloku na Base, ktorý
//     v čase vyhlásenia ešte NEEXISTUJE — tvorca ho teda nemôže poznať vopred
//     a ktokoľvek si po žrebovaní výsledok prepočíta z verejných dát.
//
// Mock: localStorage. V produkcii tabuľka + cron na uzávierku.
// ============================================================
import { useSyncExternalStore } from "react";

/** čo musí človek spraviť, aby bol v hre */
export type PodmienkaTyp =
  | "dar"          // akýkoľvek dar na cieľ výzvy
  | "darNad"       // dar aspoň `min` €
  | "skutok"       // overený skutok daného druhu (napr. darovanie krvi)
  | "cezMojQr";    // dar, ktorý prišiel cez QR tohto tvorcu

export interface Podmienka {
  typ: PodmienkaTyp;
  /** pri „darNad" hranica v € */
  min?: number;
  /** pri „skutok" druh skutku, ktorý overujeme (krv, dobrovoľníctvo…) */
  druh?: string;
  /** zbierka/cieľ, ktorého sa to týka (prázdne = hocikde) */
  ciel?: string;
}

/** ako sa odmeňuje */
export type OdmenaTyp =
  | "kazdemu"      // každý, kto splnil
  | "zreb";        // N vyžrebovaných zo všetkých, čo splnili

export interface Odmena {
  typ: OdmenaTyp;
  /** čo to je — vlastnými slovami tvorcu („zľava 30 % na dielo") */
  popis: string;
  /** pri žrebe koľko výhercov */
  pocet?: number;
}

export type StavVyzvy = "beziaca" | "uzavreta" | "vyzrebovana" | "zrusena";

export interface Ucastnik {
  /** kto — v prototype meno, v produkcii id účtu.
   *  Vždy ČLOVEK. Firmy do výziev nepatria: odmena je zľava, vstupenka či
   *  párty a tvorca robí výzvu pre svoju komunitu, nie pre firmy.
   *  (Vzťah tvorca ↔ firma sa rieši dorovnaním, nie žrebom.) */
  osoba: string;
  /** čím sa kvalifikoval (dar v €, alebo id overeného skutku) */
  dokaz: string;
  kedy: number;
}

export interface Vyzva {
  id: string;
  tvorca: string;
  tvorcaNazov?: string;
  nazov: string;
  podmienka: Podmienka;
  odmena: Odmena;
  od: number;
  do: number;
  stav: StavVyzvy;
  ucastnici: Ucastnik[];
  /** výsledok žrebu — zapisuje sa raz a už sa nemení */
  zreb?: {
    /** číslo bloku na Base, z ktorého sme brali náhodu */
    blok: number;
    /** hash toho bloku — s ním si žreb prepočíta ktokoľvek */
    hash: string;
    vyherci: string[];
    kedy: number;
  };
}

const KLUC = "deed.vyzvy";
const posluchaci = new Set<() => void>();
let verzia = 0;
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
export function useZmenyVyziev(): number { return useSyncExternalStore(subscribe, () => verzia, () => 0); }

export function nacitaj(): Vyzva[] {
  try { return JSON.parse(localStorage.getItem(KLUC) ?? "[]") as Vyzva[]; } catch { return []; }
}
function uloz(v: Vyzva[]) {
  try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS nedostupné */ }
  verzia++; posluchaci.forEach((f) => f());
}
function zmen(id: string, patch: Partial<Vyzva>) {
  uloz(nacitaj().map((x) => (x.id === id ? { ...x, ...patch } : x)));
}

export const bezi = (v: Vyzva, teraz = Date.now()) =>
  v.stav === "beziaca" && teraz >= v.od && teraz <= v.do;

export function vyhlas(n: Omit<Vyzva, "id" | "stav" | "ucastnici" | "zreb">): Vyzva {
  const novy: Vyzva = { ...n, id: `vz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, stav: "beziaca", ucastnici: [] };
  uloz([novy, ...nacitaj()]);
  return novy;
}

export const zrus = (id: string) => zmen(id, { stav: "zrusena" });
export const uzavri = (id: string) => zmen(id, { stav: "uzavreta" });

/** Splnil tento čin podmienku výzvy? Jedno miesto — volá sa z darovacej rúry
 *  aj z overenia skutku, aby sa na to nová obrazovka nedala zabudnúť. */
export function splna(v: Vyzva, cin: { suma?: number; ciel?: string; druhSkutku?: string; cezTvorcu?: string }): boolean {
  const p = v.podmienka;
  if (p.ciel && p.ciel !== cin.ciel) return false;
  switch (p.typ) {
    case "dar": return (cin.suma ?? 0) > 0;
    case "darNad": return (cin.suma ?? 0) >= (p.min ?? 0);
    case "skutok": return !!cin.druhSkutku && (!p.druh || p.druh === cin.druhSkutku);
    case "cezMojQr": return !!cin.cezTvorcu && cin.cezTvorcu === v.tvorca && (cin.suma ?? 0) > 0;
  }
}

/** Zapíše účastníka do všetkých bežiacich výziev, ktorým jeho čin vyhovuje.
 *  Jeden človek je v jednej výzve NAJVIAC RAZ — inak by stačilo poslať
 *  desať jednoeurových darov a mať desať žrebov. */
export function zapisCin(osoba: string, cin: { suma?: number; ciel?: string; druhSkutku?: string; cezTvorcu?: string }, teraz = Date.now()): string[] {
  const meno = osoba.trim();
  if (!meno) return [];
  const zasiahnute: string[] = [];
  const vsetky = nacitaj().map((v) => {
    if (!bezi(v, teraz) || !splna(v, cin)) return v;
    if (v.ucastnici.some((u) => u.osoba.trim().toLowerCase() === meno.toLowerCase())) return v;
    zasiahnute.push(v.id);
    const dokaz = cin.druhSkutku ? `skutok:${cin.druhSkutku}` : `dar:${cin.suma ?? 0}`;
    return { ...v, ucastnici: [...v.ucastnici, { osoba: meno, dokaz, kedy: teraz }] };
  });
  if (zasiahnute.length) uloz(vsetky);
  return zasiahnute;
}

// ---- ŽREB ----
/** Deterministický výber z hashu: rovnaký hash + rovnaký zoznam = rovnakí
 *  výhercovia. Preto si to prepočíta ktokoľvek a tvorcovi nemusí veriť. */
export function vyberZHashu(zoznam: string[], hash: string, pocet: number): string[] {
  const cisti = hash.replace(/^0x/, "");
  const zvysok = [...zoznam];
  const vyherci: string[] = [];
  let i = 0;
  while (vyherci.length < Math.min(pocet, zoznam.length)) {
    // každých 8 znakov hashu = jedno losovanie; keď sa minú, hashuje sa ďalej
    const kus = cisti.slice((i * 8) % cisti.length, ((i * 8) % cisti.length) + 8) || "0";
    const cislo = parseInt(kus, 16) || 0;
    const index = (cislo + i) % zvysok.length;
    vyherci.push(zvysok.splice(index, 1)[0]);
    i++;
  }
  return vyherci;
}

/** TODO(reťazec): blok sa berie z Base — číslo aj hash sa ukladajú do výzvy,
 *  aby sa žreb dal prepočítať aj o rok. Do tej doby mock.  */
export async function nahodaZBloku(): Promise<{ blok: number; hash: string }> {
  // v produkcii: posledný potvrdený blok Base v čase uzávierky
  const blok = Math.floor(Date.now() / 2000);
  const hash = Array.from({ length: 64 }, (_, i) => "0123456789abcdef"[(blok * (i + 7)) % 16]).join("");
  return { blok, hash };
}

/** Dá sa už žrebovať? Len po konci obdobia a len raz.
 *  Kým výzva beží, môžu pribúdať účastníci — keby sa dalo žrebovať počas
 *  behu, tvorca si vyberie moment, ktorý mu vyhovuje, a celá dokázateľnosť
 *  je na nič. */
export function daSaZrebovat(v: Vyzva, teraz = Date.now()): boolean {
  return !v.zreb && v.stav !== "zrusena" && teraz > v.do;
}

/** „o 3 dni" — dokedy sa ešte čaká na uzávierku (prázdne, keď už je po nej) */
export function doUzavierky(v: Vyzva, teraz = Date.now()): string {
  const zostava = v.do - teraz;
  if (zostava <= 0) return "";
  const dni = Math.floor(zostava / 86400000);
  if (dni >= 1) return `o ${dni} ${dni === 1 ? "deň" : dni < 5 ? "dni" : "dní"}`;
  const hodiny = Math.floor(zostava / 3600000);
  return hodiny >= 1 ? `o ${hodiny} h` : `o ${Math.max(1, Math.round(zostava / 60000))} min`;
}

/** Uzávierka: zamkne zoznam, vytiahne náhodu a zapíše výsledok. Raz a navždy.
 *  Vracia null, ak je ešte skoro — volajúci má vtedy tlačidlo nechať zhasnuté. */
export async function vyzrebuj(id: string, teraz = Date.now()): Promise<Vyzva | null> {
  const v = nacitaj().find((x) => x.id === id);
  if (!v) return null;
  if (v.zreb) return v;                       // už vyžrebované — nič sa neprepisuje
  if (!daSaZrebovat(v, teraz)) return null;   // pred uzávierkou sa nežrebuje
  // hash sa berie AŽ TERAZ, teda po uzávierke — v čase vyhlásenia ten blok
  // ešte neexistoval a tvorca ho nemohol poznať dopredu
  const { blok, hash } = await nahodaZBloku();
  const mena = v.ucastnici.map((u) => u.osoba);
  const pocet = v.odmena.typ === "zreb" ? (v.odmena.pocet ?? 1) : mena.length;
  const vyherci = v.odmena.typ === "zreb" ? vyberZHashu(mena, hash, pocet) : mena;
  zmen(id, { stav: "vyzrebovana", zreb: { blok, hash, vyherci, kedy: Date.now() } });
  return nacitaj().find((x) => x.id === id) ?? null;
}

export const vyzvyTvorcu = (tvorca: string): Vyzva[] =>
  nacitaj().filter((v) => v.tvorca === tvorca).sort((a, b) => b.od - a.od);

export function useVyzvyTvorcu(tvorca: string): Vyzva[] {
  useZmenyVyziev();
  return vyzvyTvorcu(tvorca);
}

/** popis podmienky do textov — jedno miesto, nech sa to všade volá rovnako */
export function popisPodmienky(p: Podmienka): string {
  switch (p.typ) {
    case "dar": return "ktokoľvek, kto dá dar";
    case "darNad": return `dar aspoň ${p.min ?? 0} €`;
    case "skutok": return `overený skutok${p.druh ? ` — ${p.druh}` : ""}`;
    case "cezMojQr": return "dar cez môj QR";
  }
}
