// ============================================================
// DEED · Personalizačný store — perzistenčný šev (mock localStorage).
// Jeden zdroj pravdy pre osobné signály: záujmy + sledovanie + podpora.
// Dnes localStorage (deed.me.*); zajtra Supabase (tabuľka "zaujmy" už
// existuje v lib/db — výmena = TENTO jeden súbor). Číta usePersonalizacia().
// ============================================================
import type { Zaujem, Sledovanie, Podpora, Oblubeny, MojaZbierka, PersonalizaciaStav } from "@/types";
import { supabase } from "@/lib/supabase";

// ---- localStorage kľúče (namespace deed.me.* — oddelené od deed.aktivity.*) ----
export const ME = {
  zaujmy: "deed.me.zaujmy.v1",
  sledovani: "deed.me.sledovani.v1",
  podpory: "deed.me.podpory.v1",
  oblubene: "deed.me.oblubene.v1",
  zbierky: "deed.me.zbierky.v1",
};
const LEGACY_FOLLOWS = "deed.aktivity.follows.v1"; // { [meno]: true } — staré sledovanie z Aktivít
const LEGACY_MIGROVANE = "deed.me.sledovani.migrated.v1"; // flag: legacy import už prebehol (jednorazový)

function load<T>(key: string, fallback: T): T {
  try { const v = JSON.parse(localStorage.getItem(key) as string); return v == null ? fallback : v; }
  catch { return fallback; }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* napr. private mode */ }
}

// ---- KATALÓG ZÁUJMOV — jediná „vocabulary" (label + emoji + kľúče do feedu + pod-položky) ----
// `oblast`     = kanonický kľúč ukladaný do Zaujem.oblast.
// `kluce`      = hodnoty, ktoré nesú položky feedu (Good `kat` + Aktivity `dom`) → afinita.
// `podpolozky` = detailný číselník z registrácie (`cis_zaujmy`, §6.2) → profil dropdown.
//   Šport/Umenie(+Hudba)/Učenie/Zdravie/Príroda(Eko) sú 1:1 z registračného číselníka;
//   Komunita/Pomoc sú profilové kategórie navyše (číselník ich nemá) → doplnené z domén
//   Help/Charita. Zjednotenie slovníka + DB↔store most pre reálne účty ostáva Fáza 4.
export interface ZaujemKategoria { oblast: string; label: string; emoji: string; kluce: string[]; podpolozky: string[]; }
export const ZAUJMY_KATALOG: ZaujemKategoria[] = [
  { oblast: "Priroda",  label: "Príroda",  emoji: "🌿", kluce: ["Priroda", "eko"],
    podpolozky: ["Akcie", "Životný štýl", "Zvieratá/príroda", "Udržateľnosť", "Eko pestovanie/záhrada"] },
  { oblast: "Komunita", label: "Komunita", emoji: "🤝", kluce: ["Komunita"],
    podpolozky: ["Dobrovoľníctvo", "Susedská výpomoc", "Komunitné podujatia", "Seniori", "Deti a mládež", "Zbierky a dary"] },
  { oblast: "Zdravie",  label: "Zdravie",  emoji: "❤️", kluce: ["Zdravie", "zdravie"],
    podpolozky: ["Výživa/strava", "Pohyb/telo", "Duševné zdravie", "Prevencia", "Závislosti", "Skupiny"] },
  { oblast: "Ucenie",   label: "Učenie",   emoji: "📚", kluce: ["Ucenie", "learn"],
    podpolozky: ["Jazyky", "IT/tech", "Financie/právo", "Remeslá/praktické", "Soft skills", "Veda", "Doučovanie", "Technické hobby"] },
  { oblast: "Sport",    label: "Šport",    emoji: "🏃", kluce: ["sport"],
    podpolozky: ["Tímové/loptové", "Raketové", "Beh a vytrvalosť", "Cyklistika", "Vodné športy", "Zimné športy", "Sila/fitness", "Bojové športy", "Outdoor/hory", "Precízne/mentálne", "Pohyb/tanec", "Iné"] },
  { oblast: "Art",      label: "Umenie",   emoji: "🎨", kluce: ["art"],
    podpolozky: ["Výtvarné", "Priestorové", "Fotografia", "Film/video", "Scénické", "Literatúra", "Dizajn/remeslá", "Digitálne", "Hudba – rock", "Hudba – pop", "Hudba – rap/hip-hop", "Hudba – elektronická", "Hudba – klasická", "Hudba – jazz/blues"] },
  { oblast: "Pomoc",    label: "Pomoc",    emoji: "🆘", kluce: ["Pomoc"],
    podpolozky: ["Finančná pomoc", "Materiálna pomoc", "Doučovanie/mentoring", "Sprevádzanie/asistencia", "Krízová pomoc", "Psychická podpora"] },
];
const KLUCE_OBLASTI: Record<string, string[]> = Object.fromEntries(ZAUJMY_KATALOG.map((z) => [z.oblast, z.kluce]));

/** Záujmy → množina kľúčov pre feed afinitu (Good `kat` + Aktivity `dom`). */
export function zaujmyNaKluce(zaujmy: Zaujem[]): Set<string> {
  const s = new Set<string>();
  for (const z of zaujmy) for (const k of (KLUCE_OBLASTI[z.oblast] || [])) s.add(k);
  return s;
}

/** Top-level záujem (celá oblasť → pod_polozka = "*"). */
export const zaujemZOblasti = (oblast: string): Zaujem => ({ oblast, pod_polozka: "*" });

// ---- načítanie / uloženie (mock vrstva — zajtra Supabase) ----
export function nacitajLokalne(): Omit<PersonalizaciaStav, "nacitavam"> {
  return {
    zaujmy: load<Zaujem[]>(ME.zaujmy, []),
    sledovani: load<Sledovanie[]>(ME.sledovani, []),
    podpory: load<Podpora[]>(ME.podpory, []),
    oblubene: load<Oblubeny[]>(ME.oblubene, []),
    mojeZbierky: load<MojaZbierka[]>(ME.zbierky, []),
  };
}
export const ulozZaujmy = (z: Zaujem[]) => save(ME.zaujmy, z);
export const ulozSledovani = (s: Sledovanie[]) => save(ME.sledovani, s);
export const ulozPodpory = (p: Podpora[]) => save(ME.podpory, p);
export const ulozOblubene = (o: Oblubeny[]) => save(ME.oblubene, o);
export const ulozZbierky = (z: MojaZbierka[]) => save(ME.zbierky, z);

/** Má legacy import ešte prebehnúť? Len kým nie je nastavený flag a legacy kľúč existuje. */
export function legacyNaImport(): boolean {
  try {
    return localStorage.getItem(LEGACY_MIGROVANE) == null && localStorage.getItem(LEGACY_FOLLOWS) != null;
  } catch { return false; }
}

/** Jednorazový import starých Aktivity follow-ov — po importe nastaví flag, aby sa už
 *  „nevzkriesili" potom, čo používateľ všetkých prestane sledovať. */
export function importLegacyFollows(): Sledovanie[] {
  const raw = load<Record<string, boolean>>(LEGACY_FOLLOWS, {});
  const out = Object.keys(raw).filter((m) => raw[m]).map((meno) => ({ meno, typ: "osoba" as const }));
  save(LEGACY_MIGROVANE, true); // migrácia dokončená (aj pri prázdnom importe)
  return out;
}

// ============================================================
// PODPORY — Supabase vrstva (Fáza D). „Čo podporujem" = agregát eventov
// z tabuľky `podpora` (group by príjemca). Zápis = nový event (in-app dar).
// Demo (Martin K.) číta podľa `darca_nazov`; reálny účet podľa `ucet_id`.
// ============================================================
const KANAL_Z_DB: Record<string, string> = { deed: "DEED", fiat: "EUR", sms: "SMS" };
const KANAL_DO_DB: Record<string, string> = { DEED: "deed", EUR: "fiat", SMS: "sms" };
const jeUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

/** Eventy `podpora` → agregát na položku (kľúč = prispevok_id | príjemca). */
function agregujPodpory(rows: any[]): Podpora[] {
  const mapa = new Map<string, Podpora>();
  for (const r of rows) {
    const kluc = r.prispevok_id || r.prijemca || String(r.id);
    const suma = Number(r.suma) || 0;
    const ex = mapa.get(kluc);
    if (ex) {
      ex.suma = (ex.suma || 0) + suma;
      // snapshot/čas drž najnovší (rows prichádzajú zoradené cas desc)
    } else {
      mapa.set(kluc, {
        refId: r.prispevok_id || r.prijemca || String(r.id),
        typ: "charita",
        modul: "charity",
        suma,
        kanal: KANAL_Z_DB[r.kanal] || "DEED",
        komu: r.prijemca || undefined,
        vyzbierane: r.vyzbierane != null ? Number(r.vyzbierane) : undefined,
        ciel: r.ciel != null ? Number(r.ciel) : undefined,
        cas: r.cas || undefined,
      });
    }
  }
  return [...mapa.values()];
}

/** Načíta „Čo podporujem" z DB (demo: podľa mena; reálny účet: podľa ucet_id). */
export async function nacitajPodporyDB(filter: { ucetId?: string | null; darca?: string | null }): Promise<Podpora[]> {
  if (!supabase) return [];
  let q = supabase.from("podpora").select("*").order("cas", { ascending: false });
  if (filter.ucetId) q = q.eq("ucet_id", filter.ucetId);
  else if (filter.darca) q = q.eq("darca_nazov", filter.darca);
  else return [];
  const { data, error } = await q;
  if (error) throw error;
  return agregujPodpory(data || []);
}

/** Zapíše in-app dar cez Payment Engine (RPC platba_create). `platba` je
 *  system-of-record; AFTER INSERT trigger zrkadlí riadok do `podpora`, takže
 *  `nacitajPodporyDB`/charita mappery čítajú ďalej bez zmeny. (Fáza 2.) */
export async function pridajPodporuDB(p: {
  darca: string; ucetId?: string | null; refId: number | string;
  prijemca?: string; suma?: number; kanal?: string; vyzbierane?: number; ciel?: number;
}): Promise<void> {
  if (!supabase) return;
  const kanal = KANAL_DO_DB[p.kanal || "DEED"] || "deed";        // DEED→deed, EUR→fiat, SMS→sms
  const mena = kanal === "deed" ? "DEED" : "EUR";
  let idemKluc: string;
  try { idemKluc = crypto.randomUUID(); } catch { idemKluc = `dar-${Date.now()}-${Math.round(Math.random() * 1e9)}`; }
  const { error } = await supabase.rpc("platba_create", {
    p_idem_kluc: idemKluc,
    p_suma: p.suma ?? 0,
    p_mena: mena,
    p_kanal: kanal,
    p_case_id: jeUuid(p.refId) ? p.refId : null,                 // uuid prípadu alebo NULL
    p_odosielatel: p.ucetId ?? null,
    p_odosielatel_text: p.darca,
    p_prijemca_text: p.prijemca ?? null,
    p_meta: { vyzbierane: p.vyzbierane ?? null, ciel: p.ciel ?? null },
  });
  if (error) throw error;
}

// ---- OBĽÚBENÉ v DB (tabuľka `oblubene`, owner-only cez auth.uid — anon session) ----
// Kľúčované na auth.uid(), takže žiaden ucetId filter — RLS vráti len moje riadky.

/** Načíta obľúbené prihláseného/anon používateľa z DB. */
export async function nacitajOblubeneDB(): Promise<Oblubeny[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("oblubene").select("*").order("vytvorene", { ascending: false });
  if (error) throw error;
  return (data || []).map((r): Oblubeny => ({
    refId: r.ref_id,
    typ: r.typ,
    modul: r.modul,
    nazov: r.nazov,
    emoji: r.emoji ?? undefined,
    lok: r.lok ?? undefined,
    vyzbierane: r.data?.vyzbierane ?? undefined,
    ciel: r.data?.ciel ?? undefined,
  }));
}

/** Pridá obľúbené do DB (owner = auth.uid() cez default). Duplikát ignoruj (unique). */
export async function pridajOblubeneDB(o: Oblubeny): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("oblubene").insert({
    ref_id: String(o.refId), typ: o.typ, modul: o.modul, nazov: o.nazov,
    emoji: o.emoji ?? null, lok: o.lok ?? null,
    data: { vyzbierane: o.vyzbierane ?? null, ciel: o.ciel ?? null },
  });
  // 23505 = unique violation (už je obľúbené) → nie je chyba
  if (error && error.code !== "23505") throw error;
}

/** Odoberie obľúbené z DB podľa ref_id (owner-only). */
export async function odoberOblubeneDB(refId: number | string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("oblubene").delete().eq("ref_id", String(refId));
  if (error) throw error;
}

// ---- MOJE ZBIERKY v DB (tabuľka `zbierka`, owner-only cez auth.uid() — migrácia 0021) ----
// Klientom generované `id` (text). Doklady = jsonb pole na riadku. Bez DB → no-op.
function riadokNaZbierka(r: any): MojaZbierka {
  return {
    id: r.id, nazov: r.nazov, modul: r.modul, typ: r.typ ?? undefined, emoji: r.emoji ?? undefined,
    lok: r.lok ?? undefined, ciel: r.ciel != null ? Number(r.ciel) : undefined,
    vyzbierane: r.vyzbierane != null ? Number(r.vyzbierane) : undefined,
    vytvorene: r.vytvorene, stav: r.stav,
    doklady: Array.isArray(r.doklady) ? r.doklady : [],
    dakovnaSprava: r.dakovna_sprava ?? undefined,
    dakovneVideo: !!r.dakovne_video, dakovneVideoUrl: r.dakovne_video ?? undefined,
  };
}

/** Načíta moje zbierky z DB (owner = auth.uid() cez RLS). */
export async function nacitajZbierkyDB(): Promise<MojaZbierka[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("zbierka").select("*").order("vytvorene", { ascending: false });
  if (error) throw error;
  return (data || []).map(riadokNaZbierka);
}

/** Vloží novú zbierku (pouzivatel = auth.uid() cez default). Duplikát id ignoruj. */
export async function vytvorZbierkuDB(z: MojaZbierka): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("zbierka").insert({
    id: z.id, nazov: z.nazov, modul: z.modul, typ: z.typ ?? null, emoji: z.emoji ?? null,
    lok: z.lok ?? null, ciel: z.ciel ?? null, vyzbierane: z.vyzbierane ?? 0, stav: z.stav,
    dakovna_sprava: z.dakovnaSprava ?? null,
    dakovne_video: z.dakovneVideoUrl ?? (z.dakovneVideo ? "ano" : null),
    doklady: z.doklady ?? [],
  });
  if (error && error.code !== "23505") throw error; // 23505 = duplikát → nie chyba
}

/** Upraví zbierku (ukončiť / doklady / poďakovanie) — owner-only. */
export async function upravZbierkuDB(id: string, patch: Partial<MojaZbierka>): Promise<void> {
  if (!supabase) return;
  const row: Record<string, unknown> = { upravene: new Date().toISOString() };
  if (patch.stav !== undefined) row.stav = patch.stav;
  if (patch.doklady !== undefined) row.doklady = patch.doklady;
  if (patch.dakovnaSprava !== undefined) row.dakovna_sprava = patch.dakovnaSprava;
  if (patch.vyzbierane !== undefined) row.vyzbierane = patch.vyzbierane;
  if (patch.dakovneVideoUrl !== undefined) row.dakovne_video = patch.dakovneVideoUrl;
  else if (patch.dakovneVideo !== undefined) row.dakovne_video = patch.dakovneVideo ? "ano" : null;
  const { error } = await supabase.from("zbierka").update(row).eq("id", id);
  if (error) throw error;
}

/** Demo seed — aby „Môj DEED" nebol prázdny pri prvom otvorení (len demo identita).
 *  Mená/refId zodpovedajú mock feedu Domov (Good/mock.ts), nech sekcie reálne ožijú. */
export function demoSeed(): Omit<PersonalizaciaStav, "nacitavam"> {
  return {
    zaujmy: [zaujemZOblasti("Priroda"), zaujemZOblasti("Komunita"), zaujemZOblasti("Zdravie")],
    sledovani: [
      { meno: "Mária H.", typ: "osoba" },
      { meno: "EkoTím Juh", typ: "osoba" },
    ],
    podpory: [
      { refId: 3, typ: "ziadost", modul: "help", suma: 50, kanal: "DEED", komu: "Rodina Kováčová", vyzbierane: 1450, ciel: 2400 },
    ],
    oblubene: [],
    mojeZbierky: [
      { id: "z-demo-1", nazov: "Nové kreslá do čitárne", modul: "help", typ: "ziadost", emoji: "📚", lok: "Košice",
        ciel: 800, vyzbierane: 640, vytvorene: "2026-06-20T10:00:00.000Z", stav: "aktivna", doklady: [] },
      { id: "z-demo-2", nazov: "Zbierka pre útulok Nádej", modul: "charity", typ: "charita", emoji: "🐾", lok: "Košice",
        ciel: 1500, vyzbierane: 1500, vytvorene: "2026-05-02T09:00:00.000Z", stav: "ukoncena", doklady: [] },
    ],
  };
}
