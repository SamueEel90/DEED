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

// ---- DEV: klik na zbierku otvorí nový detail (<ZbierkaModul>, prepis podľa dizajnéra) ----
const KLUC_NOVY = "deed.dev.novyDetailZbierky";
export function novyDetailZbierky(): boolean {
  try { return localStorage.getItem(KLUC_NOVY) !== "0"; } catch { return true; }
}
export function nastavNovyDetailZbierky(v: boolean) {
  try { localStorage.setItem(KLUC_NOVY, v ? "1" : "0"); } catch { /* LS */ }
  posluchaci.forEach((f) => f());
}
