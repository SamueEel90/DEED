// ============================================================
// KARTA 56B · §3 — „Na najbližšiu omšu" = týždenné OBDOBIE hlavného účtu farnosti, nie samostatná zbierka.
// Okno: pondelok 0:00 – nedeľa 23:59 (Europe/Bratislava). Počas okna mená darcov BEZ súm; po zatvorení mená
// zmiznú a v hlavnej zbierke ostane jeden riadok „Omšová zbierka 12. 10. · spoločný dar veriacich" (v štatistike
// 1 darca). V ledgeri peniaze tečú raz — okno je len zobrazovacia agregácia nad hlavným účtom.
// Dary okna: refId `${stranka}-omsa-YYYY-MM-DD` (dátum nedele). Suma hlavnej zbierky okná už obsahuje.
// ============================================================
import { useEffect, useState, useSyncExternalStore } from "react";
import { TESTOVACIA } from "./testovacia";
import { odKedyHlavna } from "./centralnaZbierka";
import { darcoviaPre, identitaDarcu, refIdySDarmi, sucetDarov, useZmenyDarov, type DarRiadok } from "./darcovia";

const TZ = "Europe/Bratislava";
const DEN = 86400000;

/** posun voči UTC v Bratislave v danom okamihu (ms) */
function posunTz(t: number): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(t)).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
}
/** polnoc bratislavského dňa (lokálne y, m, d) ako okamih */
function polnoc(y: number, m: number, d: number): number {
  const lok = Date.UTC(y, m, d);
  const t = lok - posunTz(lok);
  return lok - posunTz(t); // druhý krok pre zmenu letného času
}

export interface OmsoveOkno {
  /** refId darov okna */ id: string;
  /** začiatok (pondelok 0:00) a koniec (nasledujúci pondelok 0:00), ms */ od: number; do: number;
  /** nedeľa okna „12. 10." */ nedela: string;
  /** pondelok okna „6. 10." */ pondelok: string;
}
function oknoPre(stranka: string, t: number): OmsoveOkno {
  const lok = new Date(t + posunTz(t));
  const odPon = (lok.getUTCDay() + 6) % 7;
  const pon = new Date(Date.UTC(lok.getUTCFullYear(), lok.getUTCMonth(), lok.getUTCDate() - odPon));
  const ned = new Date(pon.getTime() + 6 * DEN);
  const iso = `${ned.getUTCFullYear()}-${String(ned.getUTCMonth() + 1).padStart(2, "0")}-${String(ned.getUTCDate()).padStart(2, "0")}`;
  const od = polnoc(pon.getUTCFullYear(), pon.getUTCMonth(), pon.getUTCDate());
  const nasl = new Date(pon.getTime() + 7 * DEN);
  return { id: `${stranka}-omsa-${iso}`, od, do: polnoc(nasl.getUTCFullYear(), nasl.getUTCMonth(), nasl.getUTCDate()), nedela: `${ned.getUTCDate()}. ${ned.getUTCMonth() + 1}.`, pondelok: `${pon.getUTCDate()}. ${pon.getUTCMonth() + 1}.` };
}

// ---- TESTOVACIE „Zavrieť týždeň": posun o týždeň dopredu (len testovacia verzia, pamätá sa v prehliadači) ----
const KLUC_POSUN = "deed.dev.omsaPosun.";
const posl = new Set<() => void>();
let ver = 0;
const posunTyzdne = (stranka: string): number => { if (!TESTOVACIA) return 0; try { return Number(localStorage.getItem(KLUC_POSUN + stranka) ?? 0) || 0; } catch { return 0; } };
/** TESTOVACIE: zavrie aktuálne okno — mená zmiznú, ostane spoločný dar, začne nové prázdne okno */
export function zavriTyzdenTest(stranka: string) {
  try { localStorage.setItem(KLUC_POSUN + stranka, String(posunTyzdne(stranka) + 1)); } catch { /* LS */ }
  ver++; posl.forEach((f) => f());
}
const teraz = (stranka: string) => Date.now() + posunTyzdne(stranka) * 7 * DEN;

export const aktualneOkno = (stranka: string): OmsoveOkno => oknoPre(stranka, teraz(stranka));

/** uzavreté okná s darmi, najnovšie hore — v hlavnej zbierke každé = jeden spoločný dar veriacich */
export function uzavreteOkna(stranka: string): (OmsoveOkno & { suma: number })[] {
  const akt = aktualneOkno(stranka).id;
  return refIdySDarmi(`${stranka}-omsa-`).filter((id) => id < akt).sort().reverse().map((id) => {
    const [y, m, d] = id.slice(-10).split("-").map(Number);
    const o = oknoPre(stranka, polnoc(y, m - 1, d) + DEN / 2);
    return { ...o, suma: sucetDarov(id).suma };
  });
}

/** mená darcov okna bez súm: „Anna K., Jozef Mráz, Mária a ďalší" (bez mena = „Bohu známy veriaci") */
export function menaOkna(dary: DarRiadok[], ja?: Parameters<typeof identitaDarcu>[1]): string {
  const m = [...new Set(dary.map((r) => identitaDarcu(r, ja, "viera").split(" · ")[0]))];
  if (!m.length) return "";
  return m.length > 3 ? `${m.slice(0, 3).join(", ")} a ďalší` : m.join(", ");
}

/** súhrn hlavnej zbierky farnosti: suma už obsahuje okná (jedno číslo, nikdy súčet dvoch vedľa seba).
 *  Pri ročnom prepínači len dary a okná od 1. januára. */
export function suhrnHlavnej(stranka: string, hlavnaRef: string): { suma: number; darcov: number } {
  const od = odKedyHlavna(stranka), akt = aktualneOkno(stranka), a = sucetDarov(akt.id);
  const h = od ? darcoviaPre(hlavnaRef).filter((r) => r.cas >= od) : null, hs = h ? { suma: h.reduce((x, r) => x + r.suma, 0), pocet: h.length } : sucetDarov(hlavnaRef);
  const uz = uzavreteOkna(stranka).filter((o) => o.do >= od);
  return { suma: hs.suma + a.suma + uz.reduce((s, o) => s + o.suma, 0), darcov: hs.pocet + a.pocet + uz.length };
}

/** živé okno: prekreslí sa pri novom dare, pri „Zavrieť týždeň" a každú minútu (odpočet) */
export function useOmsoveOkno(stranka: string): { okno: OmsoveOkno; dary: DarRiadok[]; uzavrete: (OmsoveOkno & { suma: number })[] } {
  useZmenyDarov();
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  const [, tik] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tik((x) => x + 1), 60000); return () => window.clearInterval(t); }, []);
  const okno = aktualneOkno(stranka);
  return { okno, dary: darcoviaPre(okno.id), uzavrete: uzavreteOkna(stranka) };
}

/** „zatvorí sa o 5 dní 8 h" / „o 3 h 20 min" */
export function doZatvorenia(okno: OmsoveOkno, stranka: string): string {
  const ms = Math.max(0, okno.do - teraz(stranka));
  const d = Math.floor(ms / DEN), h = Math.floor((ms % DEN) / 3600000), min = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d} ${d === 1 ? "deň" : d < 5 ? "dni" : "dní"} ${h} h` : h > 0 ? `${h} h ${min} min` : `${min} min`;
}
