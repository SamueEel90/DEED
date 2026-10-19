import { getSession } from "./session";
// DEV prepínač na ukážku klientovi: darca registrovaný (uložená karta, účet, peňaženka)
// alebo neregistrovaný (vypĺňa polia, v zozname darcov je anonym). Len demo session.
const KLUC = "deed.dev.neregistrovany";
const posluchaci = new Set<() => void>();
/** OPRAVY 385: hosť (bez účtu) je vždy neregistrovaný darca — platobné okno s kartou / IBAN, nie rýchly dar. Prepínač len pri demo. */
export function jeNeregistrovany(): boolean {
  const s = getSession();
  if (!s || ("typ" in s && s.typ === "pasivny")) return true;
  if (!("demo" in s && s.demo)) return false;
  try { return localStorage.getItem(KLUC) === "1"; } catch { return false; }
}
export function nastavNeregistrovany(v: boolean) {
  try { localStorage.setItem(KLUC, v ? "1" : "0"); } catch { /* LS */ }
  posluchaci.forEach((f) => f());
}
export function sledujDarcu(f: () => void) { posluchaci.add(f); return () => { posluchaci.delete(f); }; }

// ---- DEV: darujem ako firma? ----
// Prepínač roly hore hovorí „koho profil spravujem", nie „kto práve daruje" —
// inak by sa firemný dar nedal skúsiť na vlastnom profile charity (tam musíš byť
// prepnutý ako charita). Preto je to samostatný prepínač.
const KLUC_FIRMA = "deed.dev.darcaFirma";
export function darujemAkoFirma(): boolean {
  try { return localStorage.getItem(KLUC_FIRMA) === "1"; } catch { return false; }
}
export function nastavDarcuFirmu(v: boolean) {
  try { localStorage.setItem(KLUC_FIRMA, v ? "1" : "0"); } catch { /* LS */ }
  posluchaci.forEach((f) => f());
}

