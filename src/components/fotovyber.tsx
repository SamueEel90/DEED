// ============================================================
// DEED · FotoVýber — výber fotiek z disku s náhľadom (create flows).
// Otvorí systémový výber súborov, načíta ako data URL (náhľad žije v session),
// dá sa odobrať (✕), limit `max`. Reálny upload do Supabase Storage sa napojí
// neskôr (keď je bucket) — dovtedy fotky žijú lokálne v príspevku.
// · `cele` — náhľad na výšku bez orezu (contain), pre dokumenty typu parte.
// · Výrez ✂ (delta bod 22): jednoduchý reposition/zoom — posun + priblíženie,
//   canvas re-enkód (auto-crop nesmie rezať tváre). Platí pre všetky uploady.
// ============================================================
import { useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";

function citajAkoDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("čítanie súboru zlyhalo"));
    r.readAsDataURL(file);
  });
}

// výrez: rovnaký pomer ako originál, len priblížený (zoom) a posunutý (fokus %)
function vyrezDataUrl(src: string, zoom: number, posun: number): Promise<string> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width / zoom, h = img.height / zoom;
      const sx = (img.width - w) / 2;
      const sy = (img.height - h) * (posun / 100);
      const c = document.createElement("canvas");
      c.width = Math.round(w); c.height = Math.round(h);
      c.getContext("2d")?.drawImage(img, sx, sy, w, h, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => res(src); // nevieme spracovať → nechaj pôvodné
    img.src = src;
  });
}

function VyrezEditor({ src, onHotovo, onZrusit }: { src: string; onHotovo: (u: string) => void; onZrusit: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [posun, setPosun] = useState(50); // zvislý fokus výrezu v % (0 = hore, 100 = dole)
  return (
    <div style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, boxSizing: "border-box", background: C.surface2 }}>
      <div style={{ width: "100%", height: 180, borderRadius: RADIUS.xs, backgroundImage: `url(${src})`, backgroundSize: `${zoom * 100}% auto`, backgroundPosition: `center ${posun}%`, backgroundRepeat: "no-repeat", border: `1px solid ${C.line}` }} />
      <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, fontSize: 11.5, color: C.textSec, marginTop: SPACE.sm }}>
        Priblíženie
        <input type="range" min={1} max={2.5} step={0.05} value={zoom} onChange={(e) => setZoom(+e.target.value)} style={{ flex: 1 }} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, fontSize: 11.5, color: C.textSec, marginTop: SPACE.xs }}>
        Posun ↕
        <input type="range" min={0} max={100} step={1} value={posun} onChange={(e) => setPosun(+e.target.value)} style={{ flex: 1 }} />
      </label>
      <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.sm }}>
        <button onClick={onZrusit} style={{ flex: 1, height: 34, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: "transparent", color: C.textSec, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Zrušiť</button>
        <button onClick={() => void vyrezDataUrl(src, zoom, posun).then(onHotovo)} style={{ flex: 1, height: 34, borderRadius: RADIUS.sm, border: "none", background: "var(--a-info)", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>Použiť výrez</button>
      </div>
    </div>
  );
}

export function FotoVyber({ fotky, onZmena, max = 3, velkost = 64, video = false, cele = false }: {
  fotky: string[];
  onZmena: (f: string[]) => void;
  max?: number;
  velkost?: number;
  video?: boolean; // povoliť aj video (napr. svadba) — náhľad cez <video>
  cele?: boolean;  // náhľad celého obrázka na výšku (contain) — parte/dokumenty
}) {
  const [editujem, setEditujem] = useState<number | null>(null);
  async function pridaj(file?: File | null) {
    if (!file || fotky.length >= max) return;
    try { onZmena([...fotky, await citajAkoDataUrl(file)]); } catch { /* zlyhalo čítanie — ignoruj */ }
  }
  const s = velkost;
  const w = cele ? 96 : s, h = cele ? 128 : s;
  return (
    <div>
      <div style={{ display: "flex", gap: SPACE.sm, flexWrap: "wrap" }}>
        {fotky.map((f, i) => {
          const jeVideo = f.startsWith("data:video");
          return (
            <div key={i} style={{ position: "relative", width: w, height: h, borderRadius: RADIUS.sm, overflow: "hidden", border: `1px solid ${C.line}`, background: cele ? "#111" : undefined, ...(jeVideo ? {} : { backgroundImage: `url(${f})`, backgroundSize: cele ? "contain" : "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }) }}>
              {jeVideo && <video src={f} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              <button onClick={() => onZmena(fotky.filter((_, k) => k !== i))} aria-label="Odobrať foto"
                style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.62)", color: "#fff", fontSize: 11, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
              {!jeVideo && (
                <button onClick={() => setEditujem(editujem === i ? null : i)} aria-label="Upraviť výrez"
                  style={{ position: "absolute", bottom: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.62)", color: "#fff", fontSize: 10, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✂</button>
              )}
            </div>
          );
        })}
        {fotky.length < max && (
          <label title={video ? "Pridať foto/video" : "Pridať foto"} style={{ width: w, height: h, border: `1px dashed ${C.line}`, borderRadius: RADIUS.sm, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 20, color: C.textTer, cursor: "pointer", gap: 2 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>＋</span>
            <span style={{ fontSize: 8.5, fontWeight: 700 }}>{video ? "FOTO/VIDEO" : "FOTO"}</span>
            <input type="file" accept={video ? "image/*,video/*" : "image/*"} onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; void pridaj(f); }} style={{ display: "none" }} />
          </label>
        )}
      </div>
      {editujem != null && fotky[editujem] && (
        <div style={{ marginTop: SPACE.sm }}>
          <VyrezEditor src={fotky[editujem]}
            onHotovo={(u) => { onZmena(fotky.map((f, k) => (k === editujem ? u : f))); setEditujem(null); }}
            onZrusit={() => setEditujem(null)} />
        </div>
      )}
    </div>
  );
}
