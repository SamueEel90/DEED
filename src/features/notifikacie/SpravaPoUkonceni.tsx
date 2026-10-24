// OPRAVY 537 (balík 51) · Správa po ukončení súkromnej zbierky — prototyp „Sprava po ukonceni sukromnej zbierky".
// Upozornenie posiela server deň po ukončení o 11:00, len raz (0175, odkaz kon:<druh>:<zbierka>). Ťuk otvorí túto správu.
// Pohrebná: pietne farby (bordová, zlatá), tichý Svetlúšik (prvý snímok, bez letu). Svadobná / jubilejná a iné: teplé, Svetlúšik letí.
// Svetlé / tmavé podľa nastavenia appky. Príspevok = dobrovoľný dar DEED+ ako „Podporiť DEED+“ v module zbierky. Nikdy nepripomínať.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLayout, useMotiv } from "@/components/context";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { vibruj } from "@/features/zbierka/animacie";
import { useVrstva } from "@/lib/urlnav";

export type DruhUkoncenej = "pohreb" | "svadba" | "ine";
type Stav = { druh: DruhUkoncenej } | null;
let stav: Stav = null;
const posl = new Set<() => void>();
/** ťuk na upozornenie kon:<druh>:<zbierka> */
export function otvorSpravuPoUkonceni(druh: string) {
  stav = { druh: druh === "pohreb" ? "pohreb" : druh === "svadba" ? "svadba" : "ine" };
  posl.forEach((f) => f());
}
function zavri() { stav = null; posl.forEach((f) => f()); }

const SUMY = [3, 5, 10];
type Farby = { bg: string; ink: string; telo: string; sub: string; nadpis: string; ram: string; ramSirka: number; sumaInk: string; vybBg: string; vybRam: string; vybInk: string; euro: string; ziara: string };
function farby(pohreb: boolean, svetly: boolean): Farby {
  if (pohreb) return svetly
    ? { bg: "#F1E6DF", ink: "#2A1419", telo: "#3A2026", sub: "#6A4A50", nadpis: "#722535", ram: "#C9A24A", ramSirka: 1.5, sumaInk: "#722535", vybBg: "#722535", vybRam: "#722535", vybInk: "#F1E6DF", euro: "#722535", ziara: "rgba(201,162,74,.35)" }
    : { bg: "#2A1419", ink: "#F4E9E2", telo: "#F4E9E2", sub: "#D9C6BE", nadpis: "#E8C66A", ram: "#C9A24A", ramSirka: 1.5, sumaInk: "#F4E9E2", vybBg: "#722535", vybRam: "#C9A24A", vybInk: "#F4E9E2", euro: "#E8C66A", ziara: "rgba(201,162,74,.35)" };
  return svetly
    ? { bg: "#F6F1E7", ink: "#221D16", telo: "#221D16", sub: "#5A5246", nadpis: "#8A6A1E", ram: "#D8CFBF", ramSirka: 1, sumaInk: "#221D16", vybBg: "#E4EFDD", vybRam: "#4E8A3E", vybInk: "#2F5E3A", euro: "#221D16", ziara: "rgba(255,196,92,.55)" }
    : { bg: "#1A1712", ink: "#EFE9DD", telo: "#EFE9DD", sub: "#C9C2B3", nadpis: "#E8C66A", ram: "#3A342A", ramSirka: 1, sumaInk: "#EFE9DD", vybBg: "#1C2A17", vybRam: "#4E8A3E", vybInk: "#DFF0D6", euro: "#EFE9DD", ziara: "rgba(255,196,92,.55)" };
}

/** vrstva v appke (montuje sa raz pri zvončeku); otvorí ju ťuk na upozornenie */
export function SpravaPoUkonceniVrstva({ onSpat }: { onSpat: () => void }) {
  const [s, setS] = useState<Stav>(stav);
  useEffect(() => { const f = () => setS(stav); posl.add(f); return () => { posl.delete(f); }; }, []);
  useVrstva(!!s, zavri);
  useEffect(() => {
    if (!s) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [s]);
  if (!s) return null;
  return createPortal(<Sprava druh={s.druh} onSpat={() => { zavri(); onSpat(); }} />, document.body);
}

function Sprava({ druh, onSpat }: { druh: DruhUkoncenej; onSpat: () => void }) {
  const { svetly } = useMotiv();
  const { desktop } = useLayout();
  const pohreb = druh === "pohreb";
  const f = farby(pohreb, svetly);
  const [suma, setSuma] = useState<number | null>(5);
  const [vlastna, setVlastna] = useState("");
  const [hotovo, setHotovo] = useState(false);
  const [ziari, setZiari] = useState(false);
  const vlastnaRef = useRef<HTMLInputElement>(null);
  const vlastnaSuma = Number(vlastna.replace(",", ".").replace(/[^\d.]/g, ""));
  const vybrana = suma ?? (vlastnaSuma >= 1 ? vlastnaSuma : null);
  const podpor = () => { vibruj(8); setHotovo(true); setZiari(true); window.setTimeout(() => setZiari(false), 1400); };
  const vel = desktop ? 80 : pohreb ? 72 : 84;

  const chip = (a: boolean): CSSProperties => ({ height: desktop ? 52 : 50, borderRadius: 12, border: a ? `2px solid ${f.vybRam}` : `${f.ramSirka}px solid ${f.ram}`, background: a ? f.vybBg : "transparent",
    color: a ? f.vybInk : f.sumaInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer", fontVariantNumeric: "tabular-nums" });
  const vlastnaPole = (
    <label style={{ height: desktop ? 52 : 48, borderRadius: 12, border: suma === null && vlastna ? `2px solid ${f.vybRam}` : `${f.ramSirka}px solid ${f.ram}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 8, cursor: "text", boxSizing: "border-box", minWidth: 0 }}>
      <input ref={vlastnaRef} value={vlastna} inputMode="decimal" aria-label="Vlastná suma v eurách" placeholder={desktop ? "Vlastná" : "Vlastná suma"}
        onFocus={() => setSuma(null)} onChange={(e) => { setSuma(null); setVlastna(e.target.value.replace(/[^\d,.]/g, "").slice(0, 7)); }}
        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: f.ink, fontFamily: "inherit", fontSize: 15, fontWeight: vlastna ? 800 : 500 }} />
      <b style={{ color: f.euro }}>€</b>
    </label>
  );

  const obsah = (
    <>
      <button type="button" onClick={onSpat} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 10, border: "none", background: "#4E8A3E", color: "#fff", fontFamily: "inherit", fontSize: desktop ? 14 : 13.5, fontWeight: 800, cursor: "pointer" }}>
        {desktop ? "‹ Späť na oznámenia" : "‹ Späť"}
      </button>
      <div aria-hidden="true" style={{ alignSelf: "center", position: "relative", width: vel, height: vel, marginTop: desktop ? 0 : 6 }}>
        <div style={{ position: "absolute", inset: -vel / 4, borderRadius: "50%", background: `radial-gradient(circle,${f.ziara},rgba(0,0,0,0) 68%)`,
          animation: ziari ? "spuZiari 1.4s ease" : undefined }} />
        <div style={{ position: "relative", width: vel, height: vel, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: vel * 10, height: vel, background: "url(/svetlusik-let.png) 0 0/100% 100% no-repeat",
            animation: pohreb ? undefined : "svetlusikSprite .6s steps(10) infinite" }} />
        </div>
      </div>
      {pohreb
        ? <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
            <div style={{ width: desktop ? 40 : 30, height: 1.5, background: "#C9A24A" }} />
            <span style={{ fontSize: desktop ? 12.5 : 12, fontWeight: 800, letterSpacing: ".12em", color: f.nadpis }}>ZBIERKA JE UKONČENÁ</span>
            <div style={{ width: desktop ? 40 : 30, height: 1.5, background: "#C9A24A" }} />
          </div>
        : <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", color: f.nadpis, textAlign: "center" }}>ZBIERKA JE UKONČENÁ</span>}
      {pohreb
        ? <span style={{ fontSize: desktop ? 18 : 17, lineHeight: 1.6, textAlign: "center", textWrap: "pretty", color: f.telo }}>Ďakujeme, že ste ju zverili DEED+. Snažili sme sa, aby vám v ťažkých dňoch aspoň s týmto ubudlo starostí.</span>
        : <span style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.45, textAlign: "center", textWrap: "pretty", color: f.telo }}>Dúfame, že urobila radosť.</span>}
      <span style={{ fontSize: desktop ? 15.5 : 15, lineHeight: 1.55, textAlign: "center", textWrap: "pretty", color: f.sub }}>
        {pohreb ? "Podporiť nás môžete dobrovoľným príspevkom nižšie, aby takáto pomoc ostala dostupná aj ďalším." : "Podporiť nás môžete dobrovoľným príspevkom nižšie, aby sme to isté mohli spraviť pre ďalších."}
      </span>
      <div style={{ marginTop: desktop ? 0 : "auto", display: "flex", flexDirection: "column", gap: 10, paddingTop: desktop ? 6 : 0 }}>
        {hotovo
          ? <div role="status" style={{ minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: pohreb ? f.nadpis : svetly ? "#2F5E3A" : "#DFF0D6" }}>Ďakujeme ✓</div>
          : <>
              {desktop
                ? <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                    {SUMY.map((v) => <button key={v} type="button" aria-pressed={suma === v} onClick={() => { setSuma(v); setVlastna(""); }} style={chip(suma === v)}>{v} €</button>)}
                    {vlastnaPole}
                  </div>
                : <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                      {SUMY.map((v) => <button key={v} type="button" aria-pressed={suma === v} onClick={() => { setSuma(v); setVlastna(""); vlastnaRef.current?.blur(); }} style={chip(suma === v)}>{v} €</button>)}
                    </div>
                    {vlastnaPole}
                  </>}
              <PodrzTlacidlo label="Podržte a podporte DEED+" farba={pohreb ? (svetly ? "bordova" : "piet") : "zelena"} disabled={vybrana == null} onConfirm={podpor} vyska={desktop ? 56 : 54} />
            </>}
        <span style={{ fontSize: desktop ? 13.5 : 13, textAlign: "center", color: f.sub }}>Dobrovoľné. Bez príspevku sa nič nestane.</span>
      </div>
    </>
  );

  const kluc = `@keyframes spuZiari { 0% { transform: scale(1); opacity: 1 } 40% { transform: scale(${pohreb ? 1.25 : 1.6}); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }`;
  return (
    <div role="dialog" aria-modal="true" aria-label="Zbierka je ukončená" style={{ position: "fixed", inset: 0, zIndex: 1250, overflowY: "auto", background: desktop ? "var(--c-bg)" : f.bg, color: f.ink, fontFamily: "inherit" }}>
      <style>{kluc}</style>
      {desktop
        ? <div style={{ display: "flex", justifyContent: "center", padding: 36 }}>
            <div style={{ width: 560, maxWidth: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16, padding: "30px 36px", borderRadius: 24, border: svetly ? "none" : `1px solid ${pohreb ? "#4A2A30" : "#3A342A"}`, background: f.bg, color: f.ink }}>{obsah}</div>
          </div>
        : <div style={{ minHeight: "100dvh", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14, padding: "max(16px, env(safe-area-inset-top)) 22px max(22px, env(safe-area-inset-bottom))", maxWidth: 560, margin: "0 auto" }}>{obsah}</div>}
    </div>
  );
}
