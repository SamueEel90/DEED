// ============================================================
// KARTA 62 · Päta farnosti (Martin 13. 10.): IČO, DIČ, IBAN a správca farnosti sú predvyplnené z registrácie
// a farár ich môže zmeniť v Upraviť profil (kontakt.udaje). Na stránke raz, v Kancelárii farského úradu.
// ============================================================
import { najdiTestProfil } from "./testProfily";

export interface UradneUdaje { ico: string; dic: string; iban: string; spravca: string }

/** údaje z registrácie stránky — TODO server: tabuľka organizacia (ico, bankovy_ucet); DIČ a správca sa pri registrácii farnosti zatiaľ nezadávajú */
export function udajeZRegistracie(stranka: string): UradneUdaje {
  const t = najdiTestProfil(stranka);
  return { ico: t?.ico ?? "", dic: "", iban: t?.ucet ?? "", spravca: "" };
}
/** uložené v profile, inak z registrácie */
export const uradneUdaje = (stranka: string, ulozene?: UradneUdaje): UradneUdaje => ulozene ?? udajeZRegistracie(stranka);
