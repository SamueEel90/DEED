// DEV prepínač na ukážku klientovi: darca registrovaný (uložená karta, účet, peňaženka)
// alebo neregistrovaný (vypĺňa polia, v zozname darcov je anonym). Len demo session.
const KLUC = "deed.dev.neregistrovany";
const posluchaci = new Set<() => void>();
export function jeNeregistrovany(): boolean {
  try { return localStorage.getItem(KLUC) === "1"; } catch { return false; }
}
export function nastavNeregistrovany(v: boolean) {
  try { localStorage.setItem(KLUC, v ? "1" : "0"); } catch { /* LS */ }
  posluchaci.forEach((f) => f());
}
export function sledujDarcu(f: () => void) { posluchaci.add(f); return () => { posluchaci.delete(f); }; }
