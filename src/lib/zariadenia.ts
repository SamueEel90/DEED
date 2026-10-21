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
/** OPRAVY 466 doplnok: id prihlásenia (claim session_id v prístupovom tokene) — podľa neho server odhlási zariadenie na diaľku */
function relaciaZ(token: string | undefined): string | null {
  try { const p = JSON.parse(atob((token ?? "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { session_id?: string }; return p.session_id ?? null; } catch { return null; }
}
const KLUC_ZAPISANE = "deed.zariadenie.zapisane";
async function nacitajZDb(znova = false) {
  if (!supabase || (nacitava && !znova)) return;
  nacitava = true;
  const ses = (await supabase.auth.getSession()).data.session;
  if (!ses || ses.user.is_anonymous) { nacitava = false; return; }
  const t = totoZariadenie();
  const id = deviceId();
  const relacia = relaciaZ(ses.access_token);
  const { data: je } = await supabase.from("zariadenie_uctu").update({ posledne: new Date().toISOString(), nazov: t.nazov, ...(t.mesto ? { mesto: t.mesto } : {}), ...(relacia ? { relacia } : {}) }).eq("device_id", id).select("device_id");
  let ok = !!je?.length;
  if (!ok) ok = !(await supabase.from("zariadenie_uctu").insert({ device_id: id, nazov: t.nazov, typ: t.typ, mesto: t.mesto, ...(relacia ? { relacia } : {}) })).error; // 6. zariadenie server odmietne (limit 5)
  try { if (ok) localStorage.setItem(KLUC_ZAPISANE, ses.user.id); } catch { /* LS */ }
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

/** OPRAVY 466: názov tohto zariadenia („Windows · Chrome“) — aj pre QR prihlásenie počítača */
export function nazovZariadenia(): { nazov: string; typ: Zariadenie["typ"] } {
  const ua = navigator.userAgent;
  const typ: Zariadenie["typ"] = /iPhone|Android.*Mobile|Mobile/.test(ua) ? "telefon" : "pocitac";
  const system = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Počítač";
  const prehliadac = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  return { nazov: typ === "pocitac" && prehliadac ? `${system} · ${prehliadac}` : system, typ };
}
/** OPRAVY 466: mesto tohto zariadenia (podľa IP pri QR prihlásení); nevieme ho = prázdne, nič vymyslené */
const KLUC_MESTO = "deed.zariadenie.mesto";
export function ulozMestoZariadenia(m: string | null) { try { if (m) localStorage.setItem(KLUC_MESTO, m); } catch { /* LS */ } }
const mestoZariadenia = () => { try { return localStorage.getItem(KLUC_MESTO) ?? ""; } catch { return ""; } };
function totoZariadenie(): Zariadenie {
  const { nazov, typ } = nazovZariadenia();
  return { id: "toto", nazov, typ, mesto: mestoZariadenia(), posledna: "teraz aktívny", toto: true, nove: hodinNovehoZariadenia() > 0 };
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
/** OPRAVY 466 doplnok: naozaj odhlási (server zmaže riadok aj prihlásenie toho zariadenia); vráti chybu alebo null */
export async function odhlas(id: string): Promise<string | null> {
  if (zDb && supabase) {
    const { error } = await supabase.rpc("zariadenie_odhlas", { p_device: id });
    if (error) return /^[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(error.message) ? error.message : "Nepodarilo sa odhlásiť. Skúste znova.";
    zDb = zDb.filter((z) => z.id !== id); zmena(); void nacitajZDb(true); return null;
  }
  ulozOstatne(ostatne().filter((z) => z.id !== id)); return null;
}
export async function odhlasOstatne(): Promise<string | null> {
  if (zDb && supabase) {
    const { error } = await supabase.rpc("zariadenie_odhlas_ostatne");
    if (error) return "Nepodarilo sa odhlásiť. Skúste znova.";
    await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
    zDb = []; zmena(); void nacitajZDb(true); return null;
  }
  ulozOstatne([]); return null;
}
/** zapíše toto zariadenie do zoznamu hneď po prihlásení (nie až pri otvorení Prihlásených zariadení) */
export const zapisToZariadenie = () => nacitajZDb(true);
/** odhlásili toto zariadenie z iného? (bolo v zozname a riadok zmizol) */
export async function odhlaseneNaDialku(): Promise<boolean> {
  if (!supabase) return false;
  const ses = (await supabase.auth.getSession()).data.session;
  let zap: string | null = null;
  try { zap = localStorage.getItem(KLUC_ZAPISANE); } catch { /* LS */ }
  if (!ses || !zap || zap !== ses.user.id) return false;
  const { data, error } = await supabase.from("zariadenie_uctu").select("device_id").eq("device_id", deviceId()).maybeSingle();
  if (error) return false; // sieť — skúsi neskôr
  if (!data) { try { localStorage.removeItem(KLUC_ZAPISANE); } catch { /* LS */ } return true; }
  return false;
}
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
