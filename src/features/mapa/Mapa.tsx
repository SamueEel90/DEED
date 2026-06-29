import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C, GRAD, SPACE, RADIUS } from "@/theme";
import { ModulHlavicka, IkonaPin, toast, useLayout, useMotiv, obalSiroky } from "@/shared";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { FEED_CFG } from "@/lib/feed";
import { useMapaBody } from "@/data";
import { useLokalita } from "@/lib/lokalita";
import type { MapaBod } from "@/types";
import { UROVNE } from "./mock";

/*
  ============================================================
  MODUL MAPA (§15) — reálna mapa (OpenStreetMap/Leaflet, bez API kľúča)
  ============================================================
  Štvrť = posuvník 1–5 km (default 2). Mesto/okres/kraj/krajina = väčší
  okruh (FEED_CFG.radiusy.km). Na mape sú reálne body z DB (skutky z
  `prispevok`, udalosti z `udalost`) a počty v okruhu sa rátajú z ich
  súradníc (haversine) — žiadne platené API. Mení LEN zobrazenie feedu,
  nie karmu/odmenu.
  ============================================================
*/

// farba bodu podľa pôvodu (skutky podľa modulu, udalosti modro)
const FARBA_MODUL: Record<string, string> = {
  good: "#2bd49b", help: "#e2574b", charity: "#e0a93d", workshop: "#9b7cf0",
};
const farbaBodu = (b: MapaBod) => (b.druh === "udalost" ? "#5b9bff" : FARBA_MODUL[b.modul || "good"] || "#2bd49b");

// Carto tiles (zadarmo, bez kľúča) — svetlá/tmavá podľa motívu
const DLAZDICE = {
  svetla: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  tmava: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const ATRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// vzdialenosť dvoch bodov v km (haversine)
function vzdialenostKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function ModulMapa({ wide }: { wide?: boolean }) {
  const { desktop } = useLayout();
  const { svetly } = useMotiv();
  const { data: body = [] } = useMapaBody();
  const lok = useLokalita(); // stred mapy = aktívne mesto (prepínateľné)
  const STRED = { lat: lok.lat, lng: lok.lng };
  const [uroven, setUroven] = useState("stvrt");
  const [km, setKm] = useState(2);
  const [gps, setGps] = useState(false); // demo: GPS vypnuté → banner

  const jeStvrt = uroven === "stvrt";
  // okruh v km: štvrť = posuvník; ostatné = admin okruh z FEED_CFG
  const radiusKm = jeStvrt ? km : FEED_CFG.radiusy[uroven]?.km ?? 15;
  const krajina = uroven === "krajina"; // príliš veľký okruh → bez kruhu, oddialiť

  // reálne počty v okruhu (z bodov v DB)
  const { skutky, udalosti } = useMemo(() => {
    let s = 0, u = 0;
    for (const b of body) {
      if (vzdialenostKm(STRED, b) > radiusKm) continue;
      if (b.druh === "udalost") u++; else s++;
    }
    return { skutky: s, udalosti: u };
  }, [body, radiusKm, lok.lat, lok.lng]);

  // ---- Leaflet refs ----
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const kruhRef = useRef<L.Circle | null>(null);
  const bodyVrstvaRef = useRef<L.LayerGroup | null>(null);
  const tyRef = useRef<L.CircleMarker | null>(null); // marker „Ty" — presúva sa pri zmene mesta

  // init mapy (raz; StrictMode-safe cez cleanup)
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { center: [STRED.lat, STRED.lng], zoom: 13, zoomControl: true, attributionControl: true });
    mapRef.current = map;
    tileRef.current = L.tileLayer(svetly ? DLAZDICE.svetla : DLAZDICE.tmava, { attribution: ATRIB, subdomains: "abcd", maxZoom: 19 }).addTo(map);
    kruhRef.current = L.circle([STRED.lat, STRED.lng], { radius: radiusKm * 1000, color: "#5b9bff", weight: 2, fillColor: "#5b9bff", fillOpacity: 0.1 }).addTo(map);
    bodyVrstvaRef.current = L.layerGroup().addTo(map);
    // marker „Ty"
    tyRef.current = L.circleMarker([STRED.lat, STRED.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#3b6fe0", fillOpacity: 1 })
      .addTo(map).bindTooltip("Ty", { permanent: true, direction: "top", offset: [0, -6] });
    setTimeout(() => map.invalidateSize(), 0);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // prepínanie dlaždíc podľa motívu
  useEffect(() => {
    if (tileRef.current) tileRef.current.setUrl(svetly ? DLAZDICE.svetla : DLAZDICE.tmava);
  }, [svetly]);

  // body na mape (z DB) — prekresli pri zmene
  useEffect(() => {
    const vrstva = bodyVrstvaRef.current;
    if (!vrstva) return;
    vrstva.clearLayers();
    for (const b of body) {
      L.circleMarker([b.lat, b.lng], { radius: 5, weight: 1, color: "rgba(0,0,0,.25)", fillColor: farbaBodu(b), fillOpacity: 0.85 }).addTo(vrstva);
    }
  }, [body]);

  // okruh + výrez podľa zvolenej úrovne
  useEffect(() => {
    const map = mapRef.current, kruh = kruhRef.current;
    if (!map || !kruh) return;
    tyRef.current?.setLatLng([STRED.lat, STRED.lng]); // „Ty" sleduje aktívne mesto
    if (krajina) {
      map.removeLayer(kruh);
      map.setView([48.7, 19.5], 7); // celé Slovensko
    } else {
      if (!map.hasLayer(kruh)) kruh.addTo(map);
      kruh.setLatLng([STRED.lat, STRED.lng]).setRadius(radiusKm * 1000);
      map.fitBounds(kruh.getBounds(), { padding: [24, 24] });
    }
    setTimeout(() => map.invalidateSize(), 0);
  }, [uroven, km, radiusKm, krajina, STRED.lat, STRED.lng]);

  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: 620, maxDesktop: 860 });

  return (
    <div style={{ minHeight: "100%", paddingBottom: SPACE.gutter }}>
      <ModulHlavicka title="Mapa" right={<Zvoncek color={C.textSec} toast={toast} />} />
      {obal(
        <div style={{ padding: `${SPACE.sm}px ${SPACE.md}px` }}>
          {/* GPS banner — len keď je poloha vypnutá */}
          {!gps && (
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(240,168,94,.1)", border: "1px solid rgba(240,168,94,.35)", borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.sm }}>
              <span style={{ fontSize: 18 }}>⚠</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--a-clay)" }}>Poloha (GPS) je vypnutá</div>
                <div style={{ fontSize: 11, color: C.textTer }}>Zapni ju pre presnejší okruh okolo teba</div>
              </div>
              <span onClick={() => { setGps(true); toast("Poloha zapnutá (demo)"); }} style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: "#fff", background: "rgba(240,168,94,.85)", borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, cursor: "pointer" }}>Zapnúť</span>
            </div>
          )}

          {/* reálna mapa (Leaflet + OpenStreetMap) */}
          <div ref={elRef} style={{ height: desktop ? 460 : 300, borderRadius: RADIUS.md, overflow: "hidden", border: `1px solid ${C.line}`, zIndex: 0 }} />

          {/* legenda bodov */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: `${SPACE.xs}px ${SPACE.gutter}px`, marginTop: SPACE.sm, fontSize: 11, color: C.textSec }}>
            {[["Skutky", FARBA_MODUL.good], ["Pomoc", FARBA_MODUL.help], ["Charita", FARBA_MODUL.charity], ["Workshopy", FARBA_MODUL.workshop], ["Udalosti", "#5b9bff"]].map(([lbl, col]) => (
              <span key={lbl} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: RADIUS.round, background: col as string, flex: "none" }} />{lbl}
              </span>
            ))}
          </div>

          {/* úrovne okruhu */}
          <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.gutter }}>
            {UROVNE.map(([id, label]) => {
              const on = uroven === id;
              return <span key={id} onClick={() => setUroven(id)} style={{ flex: 1, textAlign: "center", padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: "pointer",
                background: on ? "rgba(91,155,255,.16)" : C.surface2, border: `1px solid ${on ? "rgba(116,166,255,.5)" : C.line}`, color: on ? "var(--a-info)" : C.textSec }}>{label}</span>;
            })}
          </div>

          {/* posuvník (len štvrť) alebo popis admin hranice */}
          {jeStvrt ? (
            <div style={{ marginTop: SPACE.md }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12.5, color: C.textSec }}>Veľkosť okruhu (štvrť)</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--a-info)" }}>{km} km</span>
              </div>
              <input type="range" min={1} max={5} step={1} value={km} onChange={(e) => setKm(+e.target.value)} style={{ width: "100%", marginTop: SPACE.xs, accentColor: "var(--a-info)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textTer }}>
                {[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: SPACE.md, display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
              <IkonaPin size={18} color="var(--a-info)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{FEED_CFG.radiusy[uroven].label}</div>
                <div style={{ fontSize: 11, color: C.textTer }}>{krajina ? "Celé Slovensko" : `Okruh ~${radiusKm} km`} · vyšší prah významnosti</div>
              </div>
            </div>
          )}

          {/* info chip — reálne počty v okruhu */}
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: SPACE.gutter, padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, background: "rgba(31,191,143,.08)", border: "1px solid rgba(31,191,143,.22)" }}>
            <span style={{ width: 9, height: 9, borderRadius: RADIUS.round, flex: "none", background: "var(--a-green)", animation: "pulse 1.6s infinite" }} />
            <span style={{ fontSize: 12.5, color: C.textSec }}>V tomto okruhu: <b style={{ color: C.text }}>{skutky.toLocaleString("sk")}</b> skutkov · <b style={{ color: C.text }}>{udalosti.toLocaleString("sk")}</b> udalostí</span>
          </div>
          <div style={{ fontSize: 10.5, color: C.textTer, margin: "8px 2px 0", lineHeight: 1.5 }}>Reálne body z DB v okolí mesta {lok.mesto}. Mení len, čo vidíš vo feede a na nástenke — nie karmu ani odmeny.</div>

          <button onClick={() => toast(`Rádius nastavený: ${jeStvrt ? km + " km · štvrť" : FEED_CFG.radiusy[uroven].label}`)}
            style={{ width: "100%", height: 50, borderRadius: RADIUS.md, marginTop: SPACE.gutter, border: "none", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 26px rgba(99,134,255,.32)" }}>
            Použiť rádius
          </button>
        </div>
      )}    </div>
  );
}
