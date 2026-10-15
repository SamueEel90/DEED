// ============================================================
// OPRAVY 289 · Karta 58 — Zvončeková zbierka ku každej omši z kalendára (nahrádza týždenné okno po–ne, omsoveOkno.ts).
// Omše = kalendár kostola (vzor + zrušené bez zbierky + posunuté s novým časom + pridané omše dňa, bez omší v období
// poznámky, OPRAVY 283). Hlavný kostol „0“; zvončeková pri filiálke číta kalendár filiálky.
// Na stránke vždy len jedna omša. Prepne sa v polovici medzi začiatkami dvoch omší, nikdy skôr ako 60 min po začiatku;
// medzera ≥ 4 h → celá hodina dole, inak na 15 min. Po prepnutí sa darcovia vymažú (okno = nový refId).
// Okno určuje server (0091 zvoncek_okno, dar cez zvoncek_dar). Bez databázy (ukážka) ten istý výpočet tu.
// Dary okna: refId `${stránka}-zv-${kostol}-RRRR-MM-DD-HHMM`. Po každej omši 1 riadok do Hlavnej zbierky
// („Ranná omša 7:00 · Pán Boh zaplať · 120 €“), pri 0 € nič.
// ============================================================
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { TESTOVACIA } from "./testovacia";
import { odKedyHlavna } from "./centralnaZbierka";
import { DEED_ZA_EUR } from "./darZbierky";
import { darcoviaPre, identitaDarcu, refIdySDarmi, sucetDarov, useZmenyDarov, type DarRiadok } from "./darcovia";
import { vsetkyMiesta } from "./miestaFarnosti";
import { CAS_OK, DNI_K, dvt, iso, kostolKal, useKalendar, zIso, type KalKostol } from "./kalendarFarnosti";

export interface ZvOkno {
  /** refId darov okna */ id: string; kostol: string;
  /** deň omše RRRR-MM-DD */ den: string; /** „7:00“ */ cas: string; /** „Ranná omša“, názov z kalendára */ nazov: string;
  /** začiatok omše a okamih prepnutia na ďalšiu (null = ďalšia omša nie je v kalendári), ms */ zac: number; do: number | null;
}
export interface ZvOmsaSDarmi { id: string; /** id miesta (kostola) — hlavný „0“ */ kostol: string; den: string; cas: string; nazov: string; suma: number; darov: number }

const RE_REF = /-zv-([^-]+)-(\d{4}-\d{2}-\d{2})-(\d{2})(\d{2})$/;
export const jeZvoncekRef = (refId: string) => RE_REF.test(refId);
/** stránka a kostol z refId okna */
export function zRefZvoncek(refId: string): { stranka: string; kostol: string } | null {
  const i = refId.lastIndexOf("-zv-"), m = refId.match(RE_REF);
  return i > 0 && m ? { stranka: refId.slice(0, i), kostol: m[1] } : null;
}

// ---- omše dňa (rovnako ako 0091 zvoncek_omse_dna) ----
const NAZ = ["Ranná omša", "Večerná omša", "Hlavná omša"];
function nazovDruhu(k: KalKostol, g: number): string {
  if (g < 3) return NAZ[g];
  const n = k.druhy?.find((d) => d.g === g)?.nazov.trim();
  if (!n) return "Svätá omša";
  if (["Detská", "Mládežnícka", "Školská"].includes(n)) return `${n} omša`;
  return n === "Za zosnulých" ? "Omša za zosnulých" : n;
}
const min = (t: string) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
const fm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
export function omseZvoncek(k: KalKostol, d: Date): { m: number; cas: string; nazov: string }[] {
  const key = iso(d), out: { m: number; cas: string; nazov: string }[] = [];
  for (const kod of k.vzor[dvt(d)] ?? []) {
    const g = Math.floor(kod / 10), t0 = k.casy[g]?.[kod % 10] ?? "";
    if (!CAS_OK(t0) || (k.zrus[key] ?? []).includes(kod)) continue;
    const p = k.pozn?.[kod];
    if (p && (p.od || p.do) && key >= (p.od || "0000") && key <= (p.do || "9999")) continue;
    const ps = k.posun[key]?.[kod], t = ps && CAS_OK(ps) ? ps : t0;
    out.push({ m: min(t), cas: fm(min(t)), nazov: nazovDruhu(k, g) });
  }
  for (const x of k.extra[key] ?? []) if (x.typ === "omsa" && CAS_OK(x.t)) out.push({ m: min(x.t), cas: fm(min(x.t)), nazov: x.m.trim() || "Svätá omša" });
  return out;
}
/** okamih prepnutia medzi omšami so začiatkom a a b (ms) */
const H = 3600000, Q = 900000;
const prepni = (a: number, b: number) => Math.max(b - a >= 4 * H ? Math.floor((a + b) / 2 / H) * H : Math.round((a + b) / 2 / Q) * Q, a + H);

/** aktuálne okno v čase t (ms); null = v kalendári nie sú omše */
export function oknoZvoncek(stranka: string, k: KalKostol, kostol: string, t: number): ZvOkno | null {
  const dnes = new Date(t); dnes.setHours(0, 0, 0, 0);
  const L: { zac: number; den: string; cas: string; nazov: string }[] = [];
  for (let i = -8; i <= 8; i++) {
    const d = new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate() + i);
    omseZvoncek(k, d).forEach((o) => L.push({ zac: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, o.m).getTime(), den: iso(d), cas: o.cas, nazov: o.nazov }));
  }
  L.sort((a, b) => a.zac - b.zac);
  if (!L.length) return null;
  let i = 0;
  while (i + 1 < L.length && t >= prepni(L[i].zac, L[i + 1].zac)) i++;
  const a = L[i];
  return { id: `${stranka}-zv-${kostol}-${a.den}-${a.cas.padStart(5, "0").replace(":", "")}`, kostol, den: a.den, cas: a.cas, nazov: a.nazov, zac: a.zac, do: i + 1 < L.length ? prepni(a.zac, L[i + 1].zac) : null };
}

// ---- TESTOVACIE „Ďalšia omša“: posun času na prepnutie (len testovacia verzia, pamätá sa v prehliadači) ----
const KLUC_POSUN = "deed.dev.zvoncekPosun.";
const posl = new Set<() => void>();
let ver = 0;
const zmena = () => { ver++; posl.forEach((f) => f()); };
const posunMs = (stranka: string): number => { if (!TESTOVACIA) return 0; try { return Number(localStorage.getItem(KLUC_POSUN + stranka) ?? 0) || 0; } catch { return 0; } };
const teraz = (stranka: string) => Date.now() + posunMs(stranka);
/** TESTOVACIE: prepne na ďalšiu omšu hneď (darcovia zmiznú, predchádzajúca omša pribudne do Hlavnej zbierky) */
export function dalsiaOmsaTest(stranka: string, okno: ZvOkno | null) {
  if (!okno?.do) return;
  try { localStorage.setItem(KLUC_POSUN + stranka, String(posunMs(stranka) + Math.max(0, okno.do - teraz(stranka)) + 1000)); } catch { /* LS */ }
  serverOkna.clear(); zmena();
}

// ---- server: okno a omše s darmi (0091) ----
const serverOkna = new Map<string, { o: ZvOkno | null; kedy: number }>();
const serverOmse = new Map<string, ZvOmsaSDarmi[]>();
type OknoDB = { ref: string; kostol: string; den: string; cas: string; nazov: string; zaciatok: string; do: string | null };
const zDB = (x: OknoDB): ZvOkno => ({ id: x.ref, kostol: x.kostol, den: x.den, cas: x.cas, nazov: x.nazov, zac: new Date(x.zaciatok).getTime(), do: x.do ? new Date(x.do).getTime() : null });
const nacitava = new Set<string>();
function obnovServer(stranka: string, kostol: string) {
  const kl = `${stranka}|${kostol}`;
  if (!supabase || nacitava.has(kl)) return;
  nacitava.add(kl);
  void Promise.all([
    supabase.rpc("zvoncek_okno", { p_stranka: stranka, p_kostol: kostol, p_cas: new Date(teraz(stranka)).toISOString() }),
    supabase.rpc("zvoncek_omse", { p_stranka: stranka }),
  ]).then(([o, l]) => {
    if (!o.error) serverOkna.set(kl, { o: o.data ? zDB(o.data as OknoDB) : null, kedy: Date.now() });
    if (!l.error) serverOmse.set(stranka, ((l.data ?? []) as { ref: string; nazov: string; eur: number; deed: number; darov: number }[]).flatMap((r) => {
      const m = r.ref.match(RE_REF);
      return m ? [{ id: r.ref, kostol: m[1], den: m[2], cas: `${Number(m[3])}:${m[4]}`, nazov: r.nazov.replace(/ \d{1,2}:\d{2}$/, ""), suma: Number(r.eur) + Number(r.deed) / DEED_ZA_EUR, darov: Number(r.darov) }] : [];
    }));
    zmena();
  }).finally(() => nacitava.delete(kl));
}

/** aktuálne okno: zo servera (keď je databáza), inak výpočet z kalendára */
export function aktualneOkno(stranka: string, kostol = "0"): ZvOkno | null {
  const s = supabase ? serverOkna.get(`${stranka}|${kostol}`) : undefined;
  if (s && (s.o == null || s.o.do == null || teraz(stranka) < s.o.do)) return s.o;
  return oknoZvoncek(stranka, kostolKal(stranka, kostol), kostol, teraz(stranka));
}

/** názov omše z kalendára pre deň a čas (riadok uzavretej omše bez databázy) */
function nazovZKalendara(stranka: string, kostol: string, den: string, cas: string): string {
  return omseZvoncek(kostolKal(stranka, kostol), zIso(den)).find((o) => o.cas === cas)?.nazov ?? "Svätá omša";
}
/** omše s darmi okrem aktuálnej, najnovšie hore — v Hlavnej zbierke každá = jeden riadok */
export function uzavreteOmse(stranka: string, kostol = "0"): ZvOmsaSDarmi[] {
  const akt = aktualneOkno(stranka, kostol)?.id ?? "";
  const zoServera = supabase ? serverOmse.get(stranka) : undefined;
  if (zoServera) return zoServera.filter((o) => o.id !== akt && o.id < (akt || "￿") && o.suma > 0);
  return refIdySDarmi(`${stranka}-zv-${kostol}-`).filter((id) => id < akt || !akt).sort().reverse().flatMap((id) => {
    const m = id.match(RE_REF);
    if (!m) return [];
    const cas = `${Number(m[3])}:${m[4]}`, s = sucetDarov(id);
    return s.suma > 0 ? [{ id, kostol: m[1], den: m[2], cas, nazov: nazovZKalendara(stranka, kostol, m[2], cas), suma: s.suma, darov: s.pocet }] : [];
  });
}

/** súhrn hlavnej zbierky farnosti: suma už obsahuje zvončekové omše (jedno číslo). Pri ročnom prepínači len od 1. januára.
 *  Martin 15. 10.: bežiaca omša sa do Hlavnej nepočíta — pripíše sa až po omši jedným riadkom (inak by sa sumy zdvojili). */
export function suhrnHlavnej(stranka: string, hlavnaRef: string): { suma: number; darcov: number } {
  const od = odKedyHlavna(stranka);
  const h = od ? darcoviaPre(hlavnaRef).filter((r) => r.cas >= od) : null, hs = h ? { suma: h.reduce((x, r) => x + r.suma, 0), pocet: h.length } : sucetDarov(hlavnaRef);
  const uz = uzavreteOmse(stranka).filter((o) => zIso(o.den).getTime() >= od);
  return { suma: hs.suma + uz.reduce((s, o) => s + o.suma, 0), darcov: hs.pocet + uz.length };
}

/** mená darcov okna bez súm: „Anna K., Jozef Mráz, Mária a ďalší“ */
export function menaOkna(dary: DarRiadok[], ja?: Parameters<typeof identitaDarcu>[1]): string {
  const m = [...new Set(dary.map((r) => identitaDarcu(r, ja, "viera").split(" · ")[0]))];
  if (!m.length) return "";
  return m.length > 3 ? `${m.slice(0, 3).join(", ")} a ďalší` : m.join(", ");
}

/** „ranná omša“ — štandardné názvy malým, vlastný názov z kalendára ostáva */
export const nazovMalym = (n: string) => (/^(Ranná|Večerná|Hlavná|Svätá|Detská|Mládežnícka|Školská) omša$|^Omša /.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n);
/** „Št 15. 10. · 6:00 · ranná omša“ */
export function nadpisOkna(o: ZvOkno): string {
  const d = zIso(o.den);
  return `${DNI_K[dvt(d)]} ${d.getDate()}. ${d.getMonth() + 1}. · ${o.cas} · ${nazovMalym(o.nazov)}`;
}
/** „Ranná omša 7:00“ — meno riadku v Hlavnej zbierke; zvončeková pri inom kostole nesie aj miesto („Ranná omša 7:00 · Opatová“) */
export function riadokOmse(o: Pick<ZvOmsaSDarmi, "nazov" | "cas" | "kostol">, stranka?: string): string {
  const miesto = stranka && o.kostol && o.kostol !== "0" ? vsetkyMiesta(stranka).find((m) => m.id === o.kostol)?.nazov.trim() : "";
  return `${o.nazov} ${o.cas}${miesto ? ` · ${miesto}` : ""}`;
}

/** živé okno: prekreslí sa pri novom dare, zmene kalendára, teste a každú minútu */
export function useZvoncekOkno(stranka: string, kostol = "0"): { okno: ZvOkno | null; dary: DarRiadok[]; uzavrete: ZvOmsaSDarmi[] } {
  useZmenyDarov();
  const kal = useKalendar(stranka);
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  const [tik, setTik] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTik((x) => x + 1), 60000); return () => window.clearInterval(t); }, []);
  useEffect(() => { obnovServer(stranka, kostol); }, [stranka, kostol, tik, kal]);
  const okno = aktualneOkno(stranka, kostol);
  return { okno, dary: okno ? darcoviaPre(okno.id) : [], uzavrete: uzavreteOmse(stranka, kostol) };
}

/** „dnes o 12:00“ / „zajtra o 0:00“ / „Ne 18. 10. o 14:00“ — kedy sa zvončeková prepne na ďalšiu omšu ("" = ďalšia omša nie je v kalendári) */
export function kedyPrepne(o: ZvOkno | null, stranka: string): string {
  if (!o?.do) return "";
  const d = new Date(o.do), t = new Date(teraz(stranka)), cas = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const dni = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 864e5);
  return dni === 0 ? `dnes o ${cas}` : dni === 1 ? `zajtra o ${cas}` : `${DNI_K[dvt(d)]} ${d.getDate()}. ${d.getMonth() + 1}. o ${cas}`;
}
