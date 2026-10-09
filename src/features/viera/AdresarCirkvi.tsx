// ============================================================
// KARTA 60 — Adresár cirkví SR (prototyp „Adresar cirkvi"). Nahrádza starý „Sprievodca výberom cirkvi".
// Svetlý štýl ako nástenka, celá obrazovka. 3 kroky: 1 Poloha · 2 Cirkev · 3 Farnosť, hore ‹ Späť = krok späť.
// S domovskou: hore zelený rám MOJA DOMOVSKÁ FARNOSŤ (Zmeniť domovskú, Podržte · odstrániť) + SLEDUJETE.
// Farnosti len registrované v DEED (v_adresar_farnosti). Dáta: lib/mojeFarnosti (tabuľka moje_farnosti, 0076).
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CIRKVI, RODINY_CIRKVI, skratkaCirkvi, useMojeFarnosti, useAdresarFarnosti, nazovFarnosti, useAdresarOtvoreny, zavriAdresar,
  nastavDomovsku, pridajSledovanu, odstranSledovanu, type FarnostAdresar,
} from "@/lib/mojeFarnosti";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { toast } from "@/shared";

const BG = "#EFEAE1", PAPIER = "#FBF9F4", KARTA = "#E4DFD5", INK = "#1D211B", INK2 = "#4A4C43", INK3 = "#5B5D53", LINKA = "#CFC8BA";
const ZELENA = "#4B7A35", ZINK = "#2F5A22", ZSOFT = "#E3ECDB", CERV = "#A34A2A";
const bez = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const km = (x: number) => `${x < 10 ? x.toFixed(1).replace(".", ",") : Math.round(x)} km`;
function vzdialenost(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** tlačidlo „Podržte · …" — naplní sa za ms, potom vykoná */
function Drz({ ms, children, onHotovo, styl, plnenie = "rgba(163,74,42,.18)" }: { ms: number; children: ReactNode; onHotovo: () => void; styl: CSSProperties; plnenie?: string }) {
  const [drz, setDrz] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const zacni = () => { setDrz(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => { setDrz(false); onHotovo(); }, ms); };
  const pusti = () => { window.clearTimeout(tm.current); setDrz(false); };
  return (
    <button type="button" onPointerDown={(e) => { e.preventDefault(); zacni(); }} onPointerUp={pusti} onPointerLeave={pusti} onPointerCancel={pusti} onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") pusti(); }}
      style={{ position: "relative", overflow: "hidden", cursor: "pointer", fontFamily: "inherit", touchAction: "none", userSelect: "none", ...styl }}>
      <span style={{ position: "absolute", inset: 0, background: plnenie, transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? ms / 1000 : 0.2}s linear` }} />
      <span style={{ position: "relative" }}>{children}</span>
    </button>);
}
export { Drz as DrzTlacidlo };

const hlaskaSt: CSSProperties = { padding: "12px 14px", borderRadius: 14, background: ZSOFT, border: `2px solid ${ZELENA}`, fontSize: 15.5, fontWeight: 800, color: ZINK };
const segSt = (on: boolean): CSSProperties => ({ minHeight: 46, padding: "0 18px", borderRadius: 13, border: on ? "2px solid #14110B" : `1.5px solid ${LINKA}`, background: on ? "#14110B" : "transparent", color: on ? "#fff" : INK, fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, cursor: "pointer" });
const akciaSt = (druh: "z" | "o" | "s"): CSSProperties => ({ minHeight: 54, padding: "6px 16px", borderRadius: 14, border: druh === "z" ? "none" : druh === "o" ? `1.5px solid ${ZELENA}` : `1px solid ${LINKA}`, background: druh === "z" ? ZELENA : druh === "o" ? "transparent" : "#fff", color: druh === "z" ? "#fff" : druh === "o" ? ZINK : INK, fontFamily: "inherit", fontSize: 16.5, fontWeight: 800, cursor: "pointer" });

function AdresarCirkvi({ onZavri, spatText = "‹ Späť" }: { onZavri: () => void; /** text Späť na kroku 1 (napr. „‹ Späť na moju farnosť") */ spatText?: string }) {
  const MF = useMojeFarnosti();
  const vsetky = useAdresarFarnosti();
  const maDom = !!MF.domovska;
  const [k, setK] = useState(0);
  const [obec, setObec] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsHlada, setGpsHlada] = useState(false);
  const [hl2, setHl2] = useState("");
  const [z2, setZ2] = useState(0);
  const [z3, setZ3] = useState(0);
  const [c, setC] = useState<string | null>(null);
  const [otv, setOtv] = useState<string | null>(null);
  const [hl, setHl] = useState<{ kde: string; t: string } | null>(null);
  const hlTm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(hlTm.current), []);
  const hlas = (kde: string, t: string) => { window.clearTimeout(hlTm.current); setHl({ kde, t }); hlTm.current = window.setTimeout(() => setHl(null), 4000); };
  const skus = (p: Promise<void>) => { p.catch((e: Error) => toast(e.message)); };
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, [onZavri]);

  const spat = () => { if (k > 0) { setK(k - 1); setOtv(null); } else onZavri(); };
  const cirk = CIRKVI.find((x) => x[0] === c);
  const kroky: [string, string][] = [["1 · POLOHA", gps ? "Moja poloha" : obec.trim() || "Kde hľadáte"], ["2 · CIRKEV", cirk ? skratkaCirkvi(cirk[0]) : "Vyberte"], ["3 · FARNOSŤ", maDom ? "Pridať ďalšiu" : "Domovská"]];
  const ok1 = !!gps || obec.trim().length > 1;
  const zistiGps = () => {
    if (!navigator.geolocation) { toast("Tento prehliadač polohu nevie zistiť. Napíšte obec."); return; }
    setGpsHlada(true);
    navigator.geolocation.getCurrentPosition((p) => { setGpsHlada(false); setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); setObec(""); },
      () => { setGpsHlada(false); toast("Polohu sa nepodarilo zistiť. Napíšte obec."); }, { timeout: 10000 });
  };

  // ---- 2 · cirkvi ----
  const q = bez(hl2.trim());
  let L = CIRKVI.filter((x) => !q || bez(`${x[1]} ${x[0]} ${x[2]}`).includes(q));
  L = z2 === 0 ? [...L].sort((a, b) => a[1].localeCompare(b[1], "sk")) : [...L].sort((a, b) => a[3] - b[3]);

  // ---- 3 · farnosti ----
  const dist = (f: FarnostAdresar) => (gps && f.lat != null && f.lng != null ? vzdialenost(gps, { lat: f.lat, lng: f.lng }) : null);
  let F = (vsetky ?? []).filter((f) => f.cirkev === c);
  const o = bez(obec.trim());
  if (z3 === 1) F = [...F].sort((a, b) => a.nazov.localeCompare(b.nazov, "sk"));
  else if (gps) F = [...F].sort((a, b) => (dist(a) ?? 9e9) - (dist(b) ?? 9e9));
  else if (o) F = [...F].sort((a, b) => Number(bez(b.obec ?? "").includes(o)) - Number(bez(a.obec ?? "").includes(o)) || a.nazov.localeCompare(b.nazov, "sk"));
  const poloha = gps ? "vašej polohy" : obec.trim();
  const kdeT = gps ? "farnosti v okolí vašej polohy · od najbližšej" : obec.trim() ? `farnosti v okolí: ${obec.trim()}` : "všetky farnosti tejto cirkvi";

  const riadokFarnosti = (f: FarnostAdresar) => {
    const dom = MF.domovska === f.id, sl = MF.sled.includes(f.id), o2 = otv === f.id;
    const d = dist(f);
    return (
      <div key={f.id} style={{ borderRadius: 18, background: PAPIER, border: o2 ? `2px solid ${ZELENA}` : `1px solid ${LINKA}`, overflow: "hidden" }}>
        <button type="button" onClick={() => setOtv(o2 ? null : f.id)} aria-expanded={o2} style={{ width: "100%", minHeight: 72, padding: "10px 16px", border: "none", background: "transparent", display: "flex", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer", color: INK, fontFamily: "inherit" }}>
          <span style={{ width: 52, height: 52, flex: "none", borderRadius: 14, background: dom ? ZELENA : KARTA, color: dom ? "#fff" : INK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{skratkaCirkvi(f.cirkev)}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 17 }}>{f.nazov}</b><span style={{ fontSize: 14.5, color: INK3 }}>{[f.obec, d != null ? km(d) : ""].filter(Boolean).join(" · ") || "obec doplní farnosť"}</span></span>
          {(dom || sl) && <span style={{ flex: "none", height: 30, padding: "0 10px", borderRadius: 9, background: dom ? ZELENA : ZSOFT, color: dom ? "#fff" : ZINK, fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center" }}>{dom ? "DOMOVSKÁ" : "SLEDUJETE"}</span>}
          <span aria-hidden="true" style={{ fontSize: 20, color: INK3 }}>{o2 ? "⌃" : "⌄"}</span>
        </button>
        {o2 && <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {!maDom ? <button type="button" onClick={() => { skus(nastavDomovsku(f.id)); hlas(f.id, `Vaša domovská: ${f.nazov} ✓ Viera sa naplní jej správami.`); }} style={akciaSt("z")}>Vybrať ako domovskú</button>
            : dom ? <span style={{ ...akciaSt("o"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}>✓ Moja farnosť</span>
            : <>
              {sl ? <button type="button" onClick={() => { skus(odstranSledovanu(f.id)); hlas(f.id, "Už ju nesledujete."); }} style={akciaSt("o")}>Sledujem ✓ · ťuknite a prestanete</button>
                : <button type="button" onClick={() => { skus(pridajSledovanu(f.id)); hlas(f.id, `${f.nazov} je medzi sledovanými ✓`); }} style={akciaSt("z")}>Pridať do sledovaných</button>}
              <Drz ms={1500} plnenie="rgba(0,0,0,.18)" styl={akciaSt("s")} onHotovo={() => { const st = MF.domovska ? nazovFarnosti(MF.domovska) : ""; skus(nastavDomovsku(f.id)); hlas(f.id, `Domovská zmenená ✓ ${st} ostala medzi sledovanými.`); }}>Podržte · urobiť domovskou</Drz>
            </>}
          <button type="button" onClick={() => { onZavri(); otvorVerejnyProfil(f.id); }} style={akciaSt("s")}>Otvoriť stránku ›</button>
          {hl?.kde === f.id && <span role="status" style={hlaskaSt}>{hl.t}</span>}
        </div>}
      </div>);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Adresár cirkví SR" style={{ position: "fixed", inset: 0, zIndex: 1000, background: BG, color: INK, overflowY: "auto", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "calc(20px + env(safe-area-inset-top, 0px)) clamp(16px,4vw,32px) 60px", display: "flex", flexDirection: "column", gap: 18, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={spat} autoFocus style={{ minHeight: 48, padding: "0 16px", borderRadius: 14, border: `1px solid ${LINKA}`, background: PAPIER, color: INK, fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>{k === 0 ? spatText : `‹ Späť na krok ${k}`}</button>
          <b style={{ flex: 1, minWidth: 200, fontSize: "clamp(24px,3vw,30px)", letterSpacing: "-.02em" }}>Adresár cirkví SR</b>
        </div>

        {maDom && <section style={{ borderRadius: 22, background: PAPIER, border: `2px solid ${ZELENA}`, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: ZINK }}>MOJA DOMOVSKÁ FARNOSŤ</span>
          <b style={{ fontSize: 22, lineHeight: 1.25 }}>{nazovFarnosti(MF.domovska!)}</b>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { setK(c ? 2 : 0); setOtv(null); hlas("#top", "Vyberte novú domovskú v zozname nižšie. Stará ostane medzi sledovanými."); }} style={{ flex: "1 1 200px", minHeight: 54, borderRadius: 14, border: "none", background: ZELENA, color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Zmeniť domovskú</button>
            <Drz ms={1500} styl={{ flex: "1 1 200px", minHeight: 54, borderRadius: 14, border: `1.5px solid ${CERV}`, background: "#fff", color: CERV, fontSize: 16, fontWeight: 800 }}
              onHotovo={() => { const st = nazovFarnosti(MF.domovska!); skus(nastavDomovsku(null)); hlas("#top", `Domovská odstránená: ${st}. Vyberte novú nižšie.`); setK(c ? 2 : 0); }}>Podržte · odstrániť</Drz>
          </div>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: INK3 }}>Keď domovskú odstránite, Viera bude prázdna, kým si nevyberiete novú.</span>
          {MF.sled.length > 0 && <>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: INK3, paddingTop: 6 }}>SLEDUJETE</span>
            {MF.sled.map((id) => (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 0", borderTop: `1px solid ${KARTA}` }}>
                <b style={{ flex: "1 1 180px", fontSize: 16.5 }}>{nazovFarnosti(id)}</b>
                <Drz ms={1200} styl={{ minHeight: 48, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${CERV}`, background: "#fff", color: CERV, fontSize: 14.5, fontWeight: 800 }}
                  onHotovo={() => { const n = nazovFarnosti(id); skus(odstranSledovanu(id)); hlas("#top", `Odstránené zo sledovaných ✓ ${n}`); }}>Podržte · odstrániť</Drz>
              </div>))}
          </>}
          {hl?.kde === "#top" && <span role="status" style={hlaskaSt}>{hl.t}</span>}
        </section>}
        {!maDom && hl?.kde === "#top" && <span role="status" style={hlaskaSt}>{hl.t}</span>}

        <div role="list" aria-label="Kroky" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {kroky.map(([n, t], i) => { const on = k === i, hot = i < k; return (
            <button key={n} type="button" role="listitem" aria-current={on ? "step" : undefined} onClick={() => { if (i <= k || (i === 2 && c)) { setK(i); setOtv(null); } }}
              style={{ minHeight: 58, padding: "8px 12px", borderRadius: 14, border: on ? `2px solid ${ZELENA}` : `1px solid ${LINKA}`, background: on ? ZSOFT : hot ? PAPIER : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 2, textAlign: "left", color: INK, fontFamily: "inherit", minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: on || hot ? ZINK : INK3 }}>{hot ? `${n} ✓` : n}</span>
              <b style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{t}</b>
            </button>); })}
        </div>

        {k === 0 && <section style={{ borderRadius: 22, background: PAPIER, border: `1px solid ${LINKA}`, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <b style={{ fontSize: 22 }}>Kde bývate alebo kde hľadáte?</b>
          <span style={{ fontSize: 16, lineHeight: 1.5, color: INK2 }}>Napíšte obec alebo mesto. Ukážeme farnosti v okolí.</span>
          <label style={{ display: "flex", alignItems: "center", gap: 10, height: 58, padding: "0 16px", borderRadius: 15, border: `1.5px solid ${LINKA}`, background: "#fff" }}>
            <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: "50%", border: `2.5px solid ${INK3}`, flex: "none", boxSizing: "border-box" }} />
            <input value={obec} onChange={(e) => { setObec(e.target.value.slice(0, 40)); setGps(null); }} onKeyDown={(e) => { if (e.key === "Enter" && ok1) setK(1); }} placeholder="napr. Čadca" aria-label="Obec alebo mesto" style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 18, fontWeight: 700, color: INK, outline: "none" }} />
          </label>
          <button type="button" onClick={zistiGps} style={{ minHeight: 56, borderRadius: 15, border: `1.5px solid ${ZELENA}`, background: "transparent", color: ZINK, fontFamily: "inherit", fontSize: 16.5, fontWeight: 800, cursor: "pointer" }}>{gps ? "Poloha zistená ✓" : gpsHlada ? "Zisťujem polohu…" : "Zistiť moju polohu (GPS)"}</button>
          <button type="button" onClick={() => { if (ok1) setK(1); }} aria-disabled={!ok1} style={{ minHeight: 60, borderRadius: 15, border: "none", background: ok1 ? ZELENA : KARTA, color: ok1 ? "#fff" : INK2, fontFamily: "inherit", fontSize: 17.5, fontWeight: 800, cursor: ok1 ? "pointer" : "default" }}>{ok1 ? "Pokračovať" : "Najprv napíšte obec alebo ťuknite na GPS"}</button>
          <button type="button" onClick={() => { setObec(""); setGps(null); setK(1); }} style={{ alignSelf: "center", minHeight: 44, padding: "0 8px", border: "none", background: "transparent", color: INK3, fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4 }}>Pokračovať bez polohy</button>
        </section>}

        {k === 1 && <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <b style={{ fontSize: 22 }}>Vyberte cirkev</b>
          <label style={{ display: "flex", alignItems: "center", gap: 10, height: 54, padding: "0 16px", borderRadius: 15, border: `1.5px solid ${LINKA}`, background: "#fff" }}>
            <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: "50%", border: `2.5px solid ${INK3}`, flex: "none", boxSizing: "border-box" }} />
            <input value={hl2} onChange={(e) => setHl2(e.target.value.slice(0, 40))} placeholder="Hľadať cirkev" aria-label="Hľadať cirkev" style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 17, color: INK, outline: "none" }} />
          </label>
          <div role="radiogroup" aria-label="Zoradiť" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Abecedne", "Podľa rodín"].map((t, i) => <button key={t} type="button" role="radio" aria-checked={z2 === i} onClick={() => setZ2(i)} style={segSt(z2 === i)}>{t}</button>)}
          </div>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: INK3 }}>18 cirkví registrovaných štátom. Poradie nič nehodnotí.</span>
          <div style={{ display: "flex", flexDirection: "column", borderRadius: 20, background: PAPIER, border: `1px solid ${LINKA}`, overflow: "hidden" }}>
            {L.map((x, i) => { const nad = z2 === 1 && (i === 0 || L[i - 1][3] !== x[3]); return (
              <div key={x[0]} style={{ display: "contents" }}>
                {nad && <span style={{ padding: "16px 18px 6px", fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: INK3, borderTop: i ? `1px solid ${KARTA}` : "none" }}>{RODINY_CIRKVI[x[3]]}</span>}
                <button type="button" onClick={() => { setC(x[0]); setK(2); setOtv(null); }} style={{ minHeight: 72, padding: "10px 18px", border: "none", borderTop: i || nad ? `1px solid ${KARTA}` : "none", background: c === x[0] ? ZSOFT : "transparent", display: "flex", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer", color: INK, fontFamily: "inherit" }}>
                  <span style={{ width: 52, height: 52, flex: "none", borderRadius: 14, background: KARTA, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{skratkaCirkvi(x[0])}</span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 17, lineHeight: 1.3 }}>{x[1]}</b><span style={{ fontSize: 14.5, color: INK3 }}>{x[2]}</span></span>
                  <span aria-hidden="true" style={{ fontSize: 22, color: INK3 }}>›</span>
                </button>
              </div>); })}
            {!L.length && <span style={{ padding: 18, fontSize: 15.5, color: INK3 }}>Takú cirkev nepoznáme. Skúste iný názov.</span>}
          </div>
          <span style={{ fontSize: 13.5, color: INK3, textAlign: "center" }}>Islam na Slovensku registrovaný nie je. V zahraničí sa adresár plní podľa tamojšieho registra.</span>
        </section>}

        {k === 2 && cirk && <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <b style={{ fontSize: 22 }}>{maDom ? "Pridajte ďalšiu farnosť" : "Vyberte svoju domovskú farnosť"}</b>
          {!maDom && <span style={{ padding: "14px 16px", borderRadius: 16, background: "#F3EEDF", border: "1.5px solid #C9A24A", fontSize: 16, lineHeight: 1.5, fontWeight: 600 }}>Najprv si vyberte domovskú farnosť. Bez nej sa vo Viere nič neukáže. Ďalšie farnosti si pridáte potom.</span>}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 16, background: PAPIER, border: `1px solid ${LINKA}` }}>
            <span style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: KARTA, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800 }}>{skratkaCirkvi(cirk[0])}</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 16 }}>{cirk[1]}</b><span style={{ fontSize: 14, color: INK3 }}>{kdeT}</span></span>
            <button type="button" onClick={() => { setK(1); setOtv(null); }} style={{ minHeight: 44, padding: "0 12px", border: "none", background: "transparent", color: ZINK, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Zmeniť</button>
          </div>
          <div role="radiogroup" aria-label="Zoradiť" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[poloha ? "Najbližšie" : "Podľa vzdialenosti", "Abecedne"].map((t, i) => <button key={t} type="button" role="radio" aria-checked={z3 === i} onClick={() => { setZ3(i); setOtv(null); }} style={segSt(z3 === i)}>{t}</button>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {vsetky == null ? <span style={{ fontSize: 15.5, color: INK3 }}>Načítavam farnosti…</span>
              : F.length ? F.map(riadokFarnosti)
              : <span style={{ padding: 18, borderRadius: 18, border: `1.5px dashed ${LINKA}`, fontSize: 16, lineHeight: 1.5, color: INK2 }}>V tejto cirkvi zatiaľ nie je v DEED žiadna farnosť. Keď sa zaregistruje, nájdete ju tu.</span>}
          </div>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: INK3 }}>Domovská farnosť je jedna. Sledovať môžete aj ďalšie, aj inej cirkvi.</span>
        </section>}
      </div>
    </div>, document.body);
}

/** Adresár nad celou appkou (otvára ho Viera aj okno Moje farnosti) */
export function AdresarHost() {
  const spat = useAdresarOtvoreny();
  return spat ? <AdresarCirkvi onZavri={zavriAdresar} spatText={spat} /> : null;
}
