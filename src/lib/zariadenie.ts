// ============================================================
// DEED · Zariadenie — stabilné device_id (Fáza 3, proof-of-presence)
// Anti-replay viaže 1 sken = 1 zariadenie. ID je náhodné, lokálne, bez PII.
// ============================================================
const KEY = "deed.device.v1";

export function deviceId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // private mode / bez localStorage → efemérne ID (lepšie než nič)
    try { return crypto.randomUUID(); } catch { return `dev-${Date.now()}-${Math.round(Math.random() * 1e9)}`; }
  }
}
