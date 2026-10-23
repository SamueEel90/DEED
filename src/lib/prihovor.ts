// ============================================================
// KARTA 57 C.7 — Príhovor farára (Iskra): krátke video do 45 s na stránke farnosti.
// OPRAVY 269: video alebo len zvuk, viac príhovorov (oblasť „prihovory"), odkazy na videá inde; len v bloku Vypočuj si.
// Nie na Domove Iskier. Video ide do Storage (nahrajSubory,
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
/** OPRAVY 269: príhovor je krátke video alebo len zvuk; viac príhovorov, najnovší prvý */
export interface Prihovor { id: string; src: string; sek: number; cas: number; zvuk?: boolean; /** len v tejto relácii (bez Storage) */ lokalne?: boolean }
/** OPRAVY 269: odkaz na video inde (YouTube, Facebook, iné) — otvorí sa mimo appky */
export interface OdkazVidea { id: string; url: string; nazov: string; cas: number }
interface StavPrihovorov { l: Prihovor[]; odkazy: OdkazVidea[] }

let verzia = 0;
const posl = new Set<() => void>();
const zmena = () => { verzia++; posl.forEach((f) => f()); };
export const useZmenyPrihovoru = () => useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => verzia);
/** príhovory bez Storage (mock) — len v tejto relácii */
const relacia = new Map<string, Prihovor[]>();

const OBLAST = "prihovory";
function stav(id: string): StavPrihovorov {
  const z = nacitajStav<Partial<StavPrihovorov> | null>(OBLAST, id, null);
  if (z) return { l: Array.isArray(z.l) ? z.l : [], odkazy: Array.isArray(z.odkazy) ? z.odkazy : [] };
  // starší zápis: jeden príhovor v oblasti „prihovor"
  const s = nacitajStav<Omit<Prihovor, "id"> | null>("prihovor", id, null);
  return { l: s && !s.lokalne && /^https:\/\//.test(s.src) ? [{ ...s, id: `p${s.cas}` }] : [], odkazy: [] };
}
const uloz = (id: string, s: StavPrihovorov) => { ulozStav(OBLAST, id, s); zmena(); };

/** všetky príhovory, najnovší prvý */
export function prihovory(id: string): Prihovor[] {
  const l = [...(relacia.get(id) ?? []), ...stav(id).l.filter((p) => !p.lokalne && /^https:\/\//.test(p.src))];
  return l.sort((a, b) => b.cas - a.cas);
}
/** najnovší príhovor */
export const prihovor = (id: string): Prihovor | null => prihovory(id)[0] ?? null;
export const odkazyVidei = (id: string): OdkazVidea[] => [...stav(id).odkazy].sort((a, b) => b.cas - a.cas);

const dlzka = (src: string, zvuk: boolean) => new Promise<number>((ok) => { const v = document.createElement(zvuk ? "audio" : "video"); v.preload = "metadata"; v.onloadedmetadata = () => ok(Number.isFinite(v.duration) ? v.duration : 0); v.onerror = () => ok(-1); v.src = src; });

/** nahrá príhovor (video alebo len zvuk); vráti chybu ako text alebo null */
export async function nahrajPrihovor(id: string, f: File | Blob, zvuk = false, sekZnama?: number): Promise<string | null> {
  const typ = f.type || "";
  if (zvuk ? !typ.startsWith("audio/") && !typ.startsWith("video/") : !typ.startsWith("video/")) return zvuk ? "Vyberte zvukový záznam." : "Vyberte video.";
  const lok = URL.createObjectURL(f);
  const s = sekZnama ?? await dlzka(lok, zvuk);
  if (s < 0) { URL.revokeObjectURL(lok); return zvuk ? "Tento záznam sa nedá otvoriť. Skúste iný súbor." : "Toto video sa nedá otvoriť. Skúste iný súbor."; }
  if (s > PRIHOVOR_MAX_S + 0.5) { URL.revokeObjectURL(lok); return `${zvuk ? "Záznam" : "Video"} má ${Math.round(s)} s. Najviac je ${PRIHOVOR_MAX_S} sekúnd, skráťte ho v telefóne a skúste znova.`; }
  const subor = f instanceof File ? f : new File([f], `prihovor.${/ogg/.test(typ) ? "ogg" : /mp4|aac|m4a/.test(typ) ? "m4a" : "webm"}`, { type: typ });
  const [u] = await nahrajSubory([subor], "prihovor");
  const cas = Date.now(), pid = `p${cas}`;
  if (u?.url) {
    URL.revokeObjectURL(lok);
    const st = stav(id);
    uloz(id, { ...st, l: [{ id: pid, src: u.url, sek: s, cas, zvuk: zvuk || undefined }, ...st.l] });
  } else {
    relacia.set(id, [{ id: pid, src: lok, sek: s, cas, zvuk: zvuk || undefined, lokalne: true }, ...(relacia.get(id) ?? [])]);
    zmena();
  }
  return null;
}
/** zmaže príhovory (po jednom aj hromadne) */
export function zmazPrihovory(id: string, ids: string[]) {
  const r = relacia.get(id) ?? [];
  r.filter((p) => ids.includes(p.id)).forEach((p) => URL.revokeObjectURL(p.src));
  relacia.set(id, r.filter((p) => !ids.includes(p.id)));
  const st = stav(id);
  uloz(id, { ...st, l: st.l.filter((p) => !ids.includes(p.id)) });
}
export const zmazPrihovor = (id: string, pid: string) => zmazPrihovory(id, [pid]);

/** pridá odkaz na video inde */
export function pridajOdkazVidea(id: string, url: string, nazov: string) {
  const st = stav(id);
  uloz(id, { ...st, odkazy: [{ id: `o${Date.now()}`, url: url.trim(), nazov: nazov.trim(), cas: Date.now() }, ...st.odkazy] });
}
export function zmazOdkazyVidei(id: string, ids: string[]) {
  const st = stav(id);
  uloz(id, { ...st, odkazy: st.odkazy.filter((o) => !ids.includes(o.id)) });
}
/** služba a náhľad odkazu (náhľad len keď ho služba dá bez prihlásenia — YouTube) */
export function sluzbaOdkazu(url: string): { sluzba: string; nahlad?: string } {
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return { sluzba: "YouTube", nahlad: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` };
  if (/youtube\.com|youtu\.be/i.test(u)) return { sluzba: "YouTube" };
  if (/facebook\.com|fb\.watch/i.test(u)) return { sluzba: "Facebook" };
  if (/vimeo\.com/i.test(u)) return { sluzba: "Vimeo" };
  return { sluzba: "Video" };
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
