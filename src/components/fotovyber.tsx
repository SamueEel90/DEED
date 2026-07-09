// ============================================================
// DEED · FotoVýber — výber fotiek z disku s náhľadom (create flows).
// Otvorí systémový výber súborov, načíta ako data URL (náhľad žije v session),
// dá sa odobrať (✕), limit `max`. Reálny upload do Supabase Storage sa napojí
// neskôr (keď je bucket) — dovtedy fotky žijú lokálne v príspevku.
// ============================================================
import { C, SPACE, RADIUS } from "@/theme";

function citajAkoDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("čítanie súboru zlyhalo"));
    r.readAsDataURL(file);
  });
}

export function FotoVyber({ fotky, onZmena, max = 3, velkost = 64 }: {
  fotky: string[];
  onZmena: (f: string[]) => void;
  max?: number;
  velkost?: number;
}) {
  async function pridaj(file?: File | null) {
    if (!file || fotky.length >= max) return;
    try { onZmena([...fotky, await citajAkoDataUrl(file)]); } catch { /* zlyhalo čítanie — ignoruj */ }
  }
  const s = velkost;
  return (
    <div style={{ display: "flex", gap: SPACE.sm, flexWrap: "wrap" }}>
      {fotky.map((f, i) => (
        <div key={i} style={{ position: "relative", width: s, height: s, borderRadius: RADIUS.sm, overflow: "hidden", border: `1px solid ${C.line}`, backgroundImage: `url(${f})`, backgroundSize: "cover", backgroundPosition: "center" }}>
          <button onClick={() => onZmena(fotky.filter((_, k) => k !== i))} aria-label="Odobrať foto"
            style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.62)", color: "#fff", fontSize: 11, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
        </div>
      ))}
      {fotky.length < max && (
        <label title="Pridať foto" style={{ width: s, height: s, border: `1px dashed ${C.line}`, borderRadius: RADIUS.sm, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 20, color: C.textTer, cursor: "pointer", gap: 2 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>＋</span>
          <span style={{ fontSize: 8.5, fontWeight: 700 }}>FOTO</span>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; void pridaj(f); }} style={{ display: "none" }} />
        </label>
      )}
    </div>
  );
}
