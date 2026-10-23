// ============================================================
// OPRAVY 443 doplnok · skutok za charitu pri výpadku servera.
// Zverejnenie čaká na server; keď zlyhá, skutok ostane v zariadení ako „nezverejnený“ (nič sa nestratí).
// Appka ho skúsi nahrať znova: tlačidlom „Skúsiť znova“, pri otvorení Správy → Skutky a keď sa vráti sieť.
// Položka feedu Domov vznikne až po úspešnom zápise skutku (feedCaka), aby na Domove nebol skutok, ktorý stránka nemá.
// ============================================================
import { repo } from "@/data";
import type { GoodPolozka } from "@/types";
import { getSession } from "@/lib/session";
import { skutkyOrg, upravSkutokOrg, zverejnitZnova, nezverejneneOrg, strankySCakajucimi, pridajSkutokOrg, type MojSkutok } from "@/lib/mojeSkutky";

const ucet = () => (getSession() as { ucet_id?: string } | null)?.ucet_id ?? null;

/** po úspešnom zápise skutku: príspevok na Domov Domov (ak čaká) a jeho id ku skutku (OPRAVY 436) */
async function doFeedu(stranka: string, id: string, poFeede?: () => void): Promise<void> {
  const s = skutkyOrg(stranka).find((x) => x.id === id);
  const it = s?.feedCaka as GoodPolozka | undefined;
  if (!s || !it) return;
  await upravSkutokOrg(stranka, id, { feedCaka: undefined });
  const nid = await repo.good.vytvor(it, ucet()).catch(() => null);
  if (nid) { await upravSkutokOrg(stranka, id, { prispevokId: nid }); poFeede?.(); }
}

/** zverejní nový skutok za charitu; vráti chybu (veta pre tvorcu) alebo null */
export async function zverejnitSkutokOrg(stranka: string, s: MojSkutok, feed: GoodPolozka, poFeede?: () => void): Promise<string | null> {
  const e = await pridajSkutokOrg(stranka, { ...s, feedCaka: feed });
  if (!e) await doFeedu(stranka, s.id, poFeede);
  return e;
}

/** jeden čakajúci skutok znova */
export async function skusitZnova(stranka: string, id: string, poFeede?: () => void): Promise<string | null> {
  const e = await zverejnitZnova(stranka, id);
  if (!e) await doFeedu(stranka, id, poFeede);
  return e;
}

/** všetky čakajúce skutky stránky (Správa → Skutky, návrat siete) */
export async function dopisCakajuce(stranka: string, poFeede?: () => void): Promise<void> {
  for (const s of nezverejneneOrg(stranka)) { if (await skusitZnova(stranka, s.id, poFeede)) return; }
}

let pocuva = false;
/** keď sa vráti sieť, skúsi nahrať čakajúce skutky všetkých stránok */
export function sledujSiet(): void {
  if (pocuva || typeof window === "undefined") return;
  pocuva = true;
  const f = () => { for (const st of strankySCakajucimi()) void dopisCakajuce(st); };
  window.addEventListener("online", f);
  f();
}

export const TEXT_NEZVEREJNENY = "Skutok sa pre technický problém nezverejnil. Je uložený v tomto zariadení, nič sa nestratilo.";
