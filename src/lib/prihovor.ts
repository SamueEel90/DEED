// ============================================================
// KARTA 57 C.7 — Príhovor farára (Iskra): jedno krátke video do 45 s na stránke farnosti.
// Len na stránke farnosti (krúžok hore), nie vo feede Iskier. Video ide do Storage (nahrajSubory,
// priečinok „prihovor"); bez DB/session ostane len v tejto relácii (mock).
// Stav = KV oblasť „prihovor" (zrkadlo naboz_stav).
// KARTA 57 C.8 · OPRAVY 177 — Online omše: odkaz a pravidlá vysielania (oblasť „online", rules: [{ wd, d, t, kazdy }]).
// NAŽIVO = práve beží vybraná omša (od 5 min pred začiatkom do 75 min po ňom).
// ============================================================
import { useSyncExternalStore } from "react";
import { nacitajStav, ulozStav } from "@/features/viera/stav";
import { nahrajSubory } from "./uploadFoto";
import { DNI_K, dvt, iso, kostolKal, minuty, omseDna, type KodOmse } from "./kalendarFarnosti";

export const PRIHOVOR_MAX_S = 45;
export interface Prihovor { src: string; sek: number; cas: number; /** len v tejto relácii (bez Storage) */ lokalne?: boolean }

let verzia = 0;
const posl = new Set<() => void>();
const zmena = () => { verzia++; posl.forEach((f) => f()); };
export const useZmenyPrihovoru = () => useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => verzia);
const relacia = new Map<string, Prihovor>();

export function prihovor(id: string): Prihovor | null {
  const r = relacia.get(id);
  if (r) return r;
  const p = nacitajStav<Prihovor | null>("prihovor", id, null);
  return p && !p.lokalne && /^https:\/\//.test(p.src) ? p : null;
}
const dlzka = (src: string) => new Promise<number>((ok) => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => ok(v.duration || 0); v.onerror = () => ok(-1); v.src = src; });

/** nahrá video príhovoru; vráti chybu ako text alebo null */
export async function nahrajPrihovor(id: string, f: File): Promise<string | null> {
  if (!f.type.startsWith("video/")) return "Vyberte video.";
  const lok = URL.createObjectURL(f);
  const s = await dlzka(lok);
  if (s < 0) { URL.revokeObjectURL(lok); return "Toto video sa nedá otvoriť. Skúste iný súbor."; }
  if (s > PRIHOVOR_MAX_S + 0.5) { URL.revokeObjectURL(lok); return `Video má ${Math.round(s)} s. Najviac je ${PRIHOVOR_MAX_S} sekúnd, skráťte ho v telefóne a skúste znova.`; }
  const [u] = await nahrajSubory([f], "prihovor");
  const p: Prihovor = u?.url ? { src: u.url, sek: s, cas: Date.now() } : { src: lok, sek: s, cas: Date.now(), lokalne: true };
  if (u?.url) URL.revokeObjectURL(lok);
  relacia.set(id, p);
  if (!p.lokalne) ulozStav("prihovor", id, p);
  zmena();
  return null;
}
export function zmazPrihovor(id: string) {
  const r = relacia.get(id);
  if (r?.lokalne) URL.revokeObjectURL(r.src);
  relacia.delete(id); ulozStav("prihovor", id, null); zmena();
}

// ---------------- Online omše (OPRAVY 177) ----------------
/** pravidlo vysielania: wd = deň v týždni (0 pondelok … 6 nedeľa), d = dátum (RRRR-MM-DD) pri „Len tento deň",
 *  t = čas pri výbere (len na zobrazenie, platí čas z rozpisu), kod = omša z rozpisu (čas sa prevezme sám), kazdy = každý týždeň */
export interface PravidloOnline { wd: number; d: string; t: string; kazdy: boolean; kod?: KodOmse }
export interface OnlineOmse { on: boolean; url: string; rules: PravidloOnline[] }
const ONLINE_ZAKLAD: OnlineOmse = { on: false, url: "", rules: [] };
export const onlineOmse = (id: string): OnlineOmse => { const z = nacitajStav<Partial<OnlineOmse>>("online", id, {}); return { ...ONLINE_ZAKLAD, ...z, rules: Array.isArray(z.rules) ? z.rules : [] }; };
export function ulozOnline(id: string, o: OnlineOmse) { ulozStav("online", id, o); zmena(); }
export const odkazOk = (u: string) => /^https:\/\/[^\s/]+\.[^\s]+$/i.test(u.trim());

/** omše dňa z rozpisu (vzor + zmeny): zrušené vynechané, posunuté s novým časom */
export const omseNaDen = (id: string, den: Date) => omseDna(kostolKal(id), den).filter((x) => !x.zrusena).map((x) => ({ kod: x.kod, t: x.t }));
/** spĺňa pravidlo túto omšu v tento deň? */
export const pravidloPlati = (r: PravidloOnline, den: Date, o: { kod: KodOmse; t: string }) =>
  (r.kazdy ? r.wd === dvt(den) : r.d === iso(den)) && (r.kod != null ? r.kod === o.kod : r.t === o.t);
/** online časy v daný deň (pre „▶ aj online 9:00") */
export function onlineVDen(id: string, den: Date): string[] {
  const o = onlineOmse(id);
  if (!o.on || !odkazOk(o.url) || !o.rules.length) return [];
  return omseNaDen(id, den).filter((x) => o.rules.some((r) => pravidloPlati(r, den, x))).map((x) => x.t);
}
/** text pravidla: „každú nedeľu 9:00" / „Ne 11. 10. 9:00" */
const KAZDY = ["každý pondelok", "každý utorok", "každú stredu", "každý štvrtok", "každý piatok", "každú sobotu", "každú nedeľu"];
export function textPravidla(r: PravidloOnline, casTeraz?: string) {
  const t = casTeraz ?? r.t;
  if (r.kazdy) return `${KAZDY[r.wd]} ${t}`;
  const [, m, d] = r.d.split("-").map(Number);
  return `${DNI_K[r.wd]} ${d}. ${m}. ${t}`;
}

/** práve beží vysielaná omša? vráti jej čas (napr. „9:00") alebo null */
export function naZivo(id: string, teraz = new Date()): string | null {
  const m = teraz.getHours() * 60 + teraz.getMinutes();
  return onlineVDen(id, teraz).find((t) => m >= minuty(t) - 5 && m <= minuty(t) + 75) ?? null;
}
