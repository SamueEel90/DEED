// KARTA 24 · Prihlásené zariadenia — zoznam v DB (zariadenie_uctu, 0085b; limit 5 stráži server), bez DB / demo lokálne.
// Odhlásenie zariadenia ho zatiaľ len vymaže zo zoznamu (zrušenie relácie na inom zariadení príde s vlastným auth backendom).
// Pravidlá: najviac 5 aktívnych zariadení · nové zariadenie treba potvrdiť (kód alebo „Áno, som to ja")
// · prvých 24 h na novom zariadení bez zmeny e-mailu, telefónu, IBAN a karty, platby najviac do 50 €.
import { useSyncExternalStore } from "react";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { deviceId } from "@/lib/zariadenie";

export const MAX_ZARIADENI = 5;
export const NOVE_HODIN = 24;
export const NOVE_LIMIT_EUR = 50;
/** OPRAVY 361: kým server kód naozaj nepošle a neoverí, obrazovka „Potvrď nové zariadenie“ sa neukazuje */
export const OVERENIE_ZARIADENIA = false;

export interface Zariadenie { id: string; nazov: string; typ: "telefon" | "pocitac"; mesto: string; posledna: string; toto?: boolean; nove?: boolean; potvrdene?: string }

const KLUC = "deed.zariadenia", KLUC_OD = "deed.zariadenie.od";
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyZariadeni = () => {
  void nacitajZDb();
  return useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
};

// ---- DB: toto zariadenie sa zapíše (posledná aktivita), ostatné sa čítajú zo zoznamu účtu ----
type RiadokZar = { device_id: string; nazov: string; typ: Zariadenie["typ"]; mesto: string; potvrdene: string | null; prve: string; posledne: string };
let zDb: Zariadenie[] | null = null;
let nacitava = false;
const kedy = (iso: string) => { const d = new Date(iso); return d.toDateString() === new Date().toDateString() ? `dnes ${d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}` : d.toLocaleDateString("sk-SK"); };
async function nacitajZDb(znova = false) {
  if (!supabase || (nacitava && !znova)) return;
  nacitava = true;
  if (!(await supabase.auth.getSession()).data.session) { nacitava = false; return; }
  const t = totoZariadenie();
  const id = deviceId();
  const { data: je } = await supabase.from("zariadenie_uctu").update({ posledne: new Date().toISOString(), nazov: t.nazov }).eq("device_id", id).select("device_id");
  if (!je?.length) await supabase.from("zariadenie_uctu").insert({ device_id: id, nazov: t.nazov, typ: t.typ, mesto: t.mesto }); // 6. zariadenie server odmietne (limit 5)
  const { data, error } = await supabase.from("zariadenie_uctu").select("device_id, nazov, typ, mesto, potvrdene, prve, posledne").order("posledne", { ascending: false });
  if (error) return;
  zDb = ((data ?? []) as RiadokZar[]).filter((r) => r.device_id !== id).map((r) => ({
    id: r.device_id, nazov: r.nazov, typ: r.typ, mesto: r.mesto, posledna: kedy(r.posledne),
    nove: Date.now() - Date.parse(r.prve) < NOVE_HODIN * 3600000, ...(r.potvrdene ? { potvrdene: r.potvrdene } : {}),
  }));
  zmena();
}

/** kedy sa appka na tomto zariadení prvýkrát prihlásila (lokálne) */
export function odKedy(): number {
  try {
    const v = Number(localStorage.getItem(KLUC_OD));
    if (v) return v;
    const t = (getSession() as { demo?: boolean } | null)?.demo ? Date.now() - 40 * 86400000 : Date.now();
    localStorage.setItem(KLUC_OD, String(t)); return t;
  } catch { return Date.now(); }
}
/** koľko hodín ešte platí obmedzenie nového zariadenia (0 = neplatí) */
export function hodinNovehoZariadenia(): number {
  const h = NOVE_HODIN - (Date.now() - odKedy()) / 3600000;
  return h > 0 ? Math.ceil(h) : 0;
}
/** len na ukážku (DEV): toto zariadenie ako nové */
export function nastavNoveZariadenie(nove: boolean) {
  try { localStorage.setItem(KLUC_OD, String(nove ? Date.now() - 3 * 3600000 : Date.now() - 40 * 86400000)); } catch { /* LS */ }
  zmena();
}

function totoZariadenie(): Zariadenie {
  const ua = navigator.userAgent;
  const typ: Zariadenie["typ"] = /iPhone|Android.*Mobile|Mobile/.test(ua) ? "telefon" : "pocitac";
  const system = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Počítač";
  const prehliadac = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  return { id: "toto", nazov: typ === "pocitac" && prehliadac ? `${system} · ${prehliadac}` : system, typ, mesto: "Trenčín", posledna: "teraz aktívny", toto: true, nove: hodinNovehoZariadenia() > 0 };
}
const DEMO: Zariadenie[] = [
  { id: "d2", nazov: "MacBook · Safari", typ: "pocitac", mesto: "Trenčín", posledna: "dnes 13:05", nove: true, potvrdene: "potvrdené kódom" },
  { id: "d3", nazov: "Samsung Galaxy A54", typ: "telefon", mesto: "Bratislava", posledna: "24. 9. 2026" },
];
function ostatne(): Zariadenie[] {
  if (zDb) return zDb;
  try { const s = localStorage.getItem(KLUC); if (s) return JSON.parse(s); } catch { /* LS */ }
  return (getSession() as { demo?: boolean } | null)?.demo ? DEMO : [];
}
const ulozOstatne = (z: Zariadenie[]) => { try { localStorage.setItem(KLUC, JSON.stringify(z)); } catch { /* LS */ } zmena(); };

export const zariadenia = (): Zariadenie[] => [totoZariadenie(), ...ostatne()];
export const odhlas = (id: string) => {
  if (zDb && supabase) { zDb = zDb.filter((z) => z.id !== id); zmena(); void supabase.from("zariadenie_uctu").delete().eq("device_id", id).then(() => nacitajZDb(true)); return; }
  ulozOstatne(ostatne().filter((z) => z.id !== id));
};
export const odhlasOstatne = () => {
  if (zDb && supabase) { zDb = []; zmena(); void supabase.from("zariadenie_uctu").delete().neq("device_id", deviceId()).then(() => nacitajZDb(true)); return; }
  ulozOstatne([]);
};
/** DEV: doplň 5 ďalších zariadení — toto by bolo šieste */
export function naplnDoLimitu() {
  const zoz = ostatne(), extra: Zariadenie[] = [
    { id: "d4", nazov: "iPad · Safari", typ: "pocitac", mesto: "Trenčín", posledna: "20. 9. 2026" },
    { id: "d5", nazov: "Windows · Chrome", typ: "pocitac", mesto: "Nitra", posledna: "12. 9. 2026" },
    { id: "d6", nazov: "Xiaomi Redmi Note", typ: "telefon", mesto: "Žilina", posledna: "2. 9. 2026" },
    { id: "d7", nazov: "Lenovo · Firefox", typ: "pocitac", mesto: "Trenčín", posledna: "30. 8. 2026" },
  ];
  ulozOstatne([...zoz, ...extra.filter((e) => !zoz.some((z) => z.id === e.id))].slice(0, MAX_ZARIADENI));
}
