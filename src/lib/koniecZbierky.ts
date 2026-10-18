// ============================================================
// OPRAVY 348 · koniec zbierky farnosti — zbierka farnosti je krátkodobá (30 dní od spustenia, NovaZbierka),
// farár ju môže predĺžiť o 14 dní. Predĺžený koniec sa ukladá pri stránke (naboz_stav „koniecZbierok“).
// ============================================================
import { nacitajStav, ulozStavIsto } from "@/features/viera/stav";
import type { SpustenaZbierka } from "./novaZbierka";

export const DNI_ZBIERKY = 30, PREDLZENIE_DNI = 14;
const DEN = 86400000;
const konce = (stranka: string) => nacitajStav<Record<string, string>>("koniecZbierok", stranka, {});

/** plánovaný koniec bežiacej zbierky farnosti */
export function koniecZbierky(stranka: string, z: Pick<SpustenaZbierka, "id" | "spustena">): Date {
  const k = konce(stranka)[z.id];
  return k ? new Date(k) : new Date(new Date(z.spustena).getTime() + DNI_ZBIERKY * DEN);
}
/** o koľko dní zbierka končí (0 = dnes) */
export const dniDoKonca = (koniec: Date, teraz = Date.now()) => Math.ceil((koniec.getTime() - teraz) / DEN);
export const datumKonca = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;

/** predĺži o 14 dní; vráti nový koniec alebo chybu (text) */
export async function predlzZbierku(stranka: string, z: Pick<SpustenaZbierka, "id" | "spustena">): Promise<{ koniec: Date } | { e: string }> {
  const n = new Date(koniecZbierky(stranka, z).getTime() + PREDLZENIE_DNI * DEN);
  const e = await ulozStavIsto("koniecZbierok", stranka, { ...konce(stranka), [z.id]: n.toISOString() });
  return e ? { e } : { koniec: n };
}

// Prvé kroky (348 · krok 5): QR farnosti alebo zbierky aspoň raz stiahnutý na tlač
export const qrVytlacene = (stranka: string) => !!nacitajStav<string | null>("qrVytlacene", stranka, null);
export function zapisQrVytlacene(stranka: string) { if (!qrVytlacene(stranka)) void ulozStavIsto("qrVytlacene", stranka, new Date().toISOString()); }
