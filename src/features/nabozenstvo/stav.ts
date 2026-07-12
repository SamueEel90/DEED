// ============================================================
// MODUL NÁBOŽENSTVO — mock perzistencia (localStorage).
// Aby správcovské úkony (editácia profilu, rozvrh, viditeľnosť súm,
// moderácia) „zostali" aj po zavretí obrazovky — bez backendu, ale
// funkčne ako produkcia. Rovnaký vzor ako lib/osobne.ts (lsGet/lsSet).
// ============================================================

function nacitaj<T>(kluc: string, fallback: T): T {
  try { const s = localStorage.getItem(kluc); return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}
function uloz(kluc: string, val: unknown) {
  try { localStorage.setItem(kluc, JSON.stringify(val)); } catch { /* LS nedostupné */ }
}

// namespace: deed.naboz.<oblast>.<id>
const kluc = (oblast: string, id: string) => `deed.naboz.${oblast}.${id}`;

export function nacitajStav<T>(oblast: string, id: string, fallback: T): T {
  return nacitaj<T>(kluc(oblast, id), fallback);
}
export function ulozStav(oblast: string, id: string, val: unknown) {
  uloz(kluc(oblast, id), val);
}
