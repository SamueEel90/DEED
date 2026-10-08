// ============================================================
// KARTA 57 C.7 — Príhovor farára (Iskra): jedno krátke video do 45 s na stránke farnosti.
// Len na stránke farnosti (krúžok hore), nie vo feede Iskier. Video ide do Storage (nahrajSubory,
// priečinok „prihovor"); bez DB/session ostane len v tejto relácii (mock).
// Stav = KV oblasť „prihovor" (zrkadlo naboz_stav).
// KARTA 57 C.8 — Online omše: odkaz na vysielanie a ktoré omše z rozvrhu sa vysielajú (oblasť „online").
// NAŽIVO = práve beží vybraná omša (od 5 min pred začiatkom do 75 min po ňom).
// ============================================================
import { useSyncExternalStore } from "react";
import { nacitajStav, ulozStav } from "@/features/viera/stav";
import { nahrajSubory } from "./uploadFoto";
import { DNI_D, DNI_K, casKodu, dvt, kostolKal, minuty, omseDna, type KodOmse } from "./kalendarFarnosti";

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

// ---------------- Online omše ----------------
export interface OnlineOmse { on: boolean; url: string; /** kľúče omší z rozvrhu: „kód@dni" (dni = 0 pondelok … 6 nedeľa) */ omse: string[] }
const ONLINE_ZAKLAD: OnlineOmse = { on: false, url: "", omse: [] };
export const onlineOmse = (id: string): OnlineOmse => ({ ...ONLINE_ZAKLAD, ...nacitajStav<Partial<OnlineOmse>>("online", id, {}) });
export function ulozOnline(id: string, o: OnlineOmse) { ulozStav("online", id, o); zmena(); }
export const odkazOk = (u: string) => /^https:\/\/[^\s/]+\.[^\s]+$/i.test(u.trim());

/** omše z týždenného rozvrhu ako voľby: rovnaký čas vo všedné dni = jedna voľba */
export function volbyOnline(id: string): { k: string; t: string }[] {
  const k = kostolKal(id);
  const dni = new Map<KodOmse, number[]>();
  Object.entries(k.vzor).forEach(([d, l]) => l.forEach((kod) => { if (casKodu(k, kod) !== "—") dni.set(kod, [...(dni.get(kod) ?? []), Number(d)]); }));
  const out: { k: string; t: string; m: number; d: number }[] = [];
  dni.forEach((dd, kod) => {
    const cas = casKodu(k, kod);
    const vsedne = dd.filter((d) => d < 5).sort(), vikend = dd.filter((d) => d >= 5).sort();
    const skup: number[][] = [];
    if (vsedne.length >= 2) skup.push(vsedne); else vsedne.forEach((d) => skup.push([d]));
    vikend.forEach((d) => skup.push([d]));
    skup.forEach((g) => out.push({ k: `${kod}@${g.join(",")}`, t: `${g.length === 1 ? DNI_D[g[0]] : g.length === 5 ? "Všedné dni" : g.map((d) => DNI_K[d]).join(", ")} ${cas}`, m: minuty(cas), d: g[0] === 6 ? -1 : g[0] }));
  });
  return out.sort((a, b) => a.d - b.d || a.m - b.m).map(({ k: kk, t }) => ({ k: kk, t }));
}

/** práve beží vysielaná omša? vráti jej čas (napr. „9:00") alebo null */
export function naZivo(id: string, teraz = new Date()): string | null {
  const o = onlineOmse(id);
  if (!o.on || !odkazOk(o.url) || !o.omse.length) return null;
  const d = dvt(teraz), m = teraz.getHours() * 60 + teraz.getMinutes();
  const vybrane = new Set(o.omse.flatMap((x) => { const [kod, dd] = x.split("@"); return dd.split(",").map((y) => `${kod}@${y}`); }));
  const dnes = omseDna(kostolKal(id), teraz).filter((x) => !x.zrusena && vybrane.has(`${x.kod}@${d}`));
  const bezi = dnes.find((x) => m >= minuty(x.t) - 5 && m <= minuty(x.t) + 75);
  return bezi ? bezi.t : null;
}
