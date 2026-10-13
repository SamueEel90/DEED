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
// DB: tabuľky vyzva + vyzva_ucastnik (0085b). Vyhlási správca stránky, účastníkov zapisuje
// server (vyzva_zapis_cin), žreb sa zapíše raz (vyzva_zreb). Bez DB (mock/offline) localStorage.
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { toast } from "@/components/toast";

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
  /** stránka tvorcu v DB (kto smie výzvu spravovať) */
  stranka?: string;
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
export function useZmenyVyziev(): number {
  void nacitajZDb();
  return useSyncExternalStore(subscribe, () => verzia, () => 0);
}

// ---- DB (0085b): výzvy sú spoločné pre všetkých → pamäť z DB; null = DB nebeží, ostáva localStorage ----
let zDb: Vyzva[] | null = null;
let nacitava: Promise<void> | null = null;
type RiadokVyzvy = { id: string; stranka: string; tvorca: string; tvorca_nazov: string | null; nazov: string; podmienka: Podmienka; odmena: Odmena;
  od: string; do_: string; stav: StavVyzvy; zreb: Vyzva["zreb"] | null; vyzva_ucastnik: { osoba: string; dokaz: string; kedy: string }[] };
function nacitajZDb(znova = false): Promise<void> {
  if (!supabase) return Promise.resolve();
  if (nacitava && !znova) return nacitava;
  nacitava = (async () => {
    const { data, error } = await supabase!.from("vyzva").select("*, vyzva_ucastnik(osoba, dokaz, kedy)").order("od", { ascending: false }).limit(500);
    if (error) { nacitava = null; return; } // tabuľka ešte nebeží → localStorage
    zDb = ((data ?? []) as RiadokVyzvy[]).map((r) => ({
      id: r.id, stranka: r.stranka, tvorca: r.tvorca, tvorcaNazov: r.tvorca_nazov ?? undefined, nazov: r.nazov,
      podmienka: r.podmienka, odmena: r.odmena, od: Date.parse(r.od), do: Date.parse(r.do_), stav: r.stav,
      ucastnici: (r.vyzva_ucastnik ?? []).map((u) => ({ osoba: u.osoba, dokaz: u.dokaz, kedy: Date.parse(u.kedy) })),
      ...(r.zreb ? { zreb: r.zreb } : {}),
    }));
    verzia++; posluchaci.forEach((f) => f());
  })();
  return nacitava;
}

export function nacitaj(): Vyzva[] {
  if (zDb) return zDb;
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

export async function vyhlas(n: Omit<Vyzva, "id" | "stav" | "ucastnici" | "zreb">): Promise<Vyzva | null> {
  const novy: Vyzva = { ...n, id: `vz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, stav: "beziaca", ucastnici: [] };
  if (supabase && zDb && n.stranka) {
    const { error } = await supabase.from("vyzva").insert({
      id: novy.id, stranka: n.stranka, tvorca: n.tvorca, tvorca_nazov: n.tvorcaNazov ?? null, nazov: n.nazov,
      podmienka: n.podmienka, odmena: n.odmena, od: new Date(n.od).toISOString(), do_: new Date(n.do).toISOString(),
    });
    if (error) { toast("Výzvu sa nepodarilo vyhlásiť — vyhlasuje ju len správca stránky."); return null; }
    await nacitajZDb(true);
    return novy;
  }
  uloz([novy, ...nacitaj()]);
  return novy;
}

async function zmenStav(id: string, stav: "zrusena" | "uzavreta") {
  if (supabase && zDb) {
    const { error } = await supabase.rpc("vyzva_stav", { p_id: id, p_stav: stav });
    if (error) toast("Zmena výzvy sa nepodarila — smie ju meniť len správca stránky.");
    await nacitajZDb(true);
    return;
  }
  zmen(id, { stav });
}
export const zrus = (id: string) => zmenStav(id, "zrusena");
export const uzavri = (id: string) => zmenStav(id, "uzavreta");

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
  if (supabase) {
    // server rozhodne sám (rovnaká logika ako splna) a zapíše človeka najviac raz
    void supabase.rpc("vyzva_zapis_cin", { p_osoba: meno, p_suma: cin.suma ?? null, p_ciel: cin.ciel ?? null, p_druh: cin.druhSkutku ?? null, p_cez: cin.cezTvorcu ?? null })
      .then(({ data, error }) => { if (!error && (data as string[] | null)?.length) void nacitajZDb(true); });
    return nacitaj().filter((v) => bezi(v, teraz) && splna(v, cin) && !v.ucastnici.some((u) => u.osoba.trim().toLowerCase() === meno.toLowerCase())).map((v) => v.id);
  }
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
  if (supabase && zDb) {
    const { error } = await supabase.rpc("vyzva_zreb", { p_id: id, p_blok: blok, p_hash: hash, p_vyherci: vyherci });
    if (error) return null;
    await nacitajZDb(true);
    return nacitaj().find((x) => x.id === id) ?? null;
  }
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
