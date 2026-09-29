// KARTA 24 · Nastavenia: Potvrdiť platbu, Predvolený okruh, Prihlásené zariadenia, E-mail / telefón / heslo,
// Zablokovaní ľudia, Súhlasy (+ detail povinného súhlasu) a hlášky pri prihlásení (6. zariadenie, nové zariadenie,
// 24 h obmedzenie). Overovanie kódov, zoznam zariadení a znenia súhlasov bude držať server — tu je appková časť.
import { Prepinac } from "./nastUi";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { Harok } from "@/features/zbierka/Zdielat";
import { useNastaveniaAppky, zmenNastavenia, nacitajNastavenia } from "@/lib/nastaveniaAppky";
import { useLokalita, MESTA } from "@/lib/lokalita";
import { useOsobnyProfil } from "@/lib/osobnyProfil";
import { getSession } from "@/lib/session";
import { zariadenia, odhlas, odhlasOstatne, naplnDoLimitu, useZmenyZariadeni, hodinNovehoZariadenia, nastavNoveZariadenie, MAX_ZARIADENI, NOVE_LIMIT_EUR, type Zariadenie } from "@/lib/zariadenia";
import { zablokovani, odblokuj, useZmenyBlokovania } from "@/lib/blokovanie";
import "@/styles/platba.css";

const Ik = ({ d, s = 18, w = 2 }: { d: string; s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const IK = {
  telefon: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2", pocitac: "M4 5h16v10H4zM2 19h20",
  stit: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", fajka: "M20 6 9 17l-5-5", zamok: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  tvar: "M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0",
  mail: "M4 6h16v12H4zM4 6l8 7 8-7", kluc: "M15 7a4 4 0 1 1-3.9 5H8v3H5v-3H3v-3h8.1A4 4 0 0 1 15 7zM16 11h.01",
  poloha: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5", sipka: "M9 6l6 6-6 6", dole: "M6 9l6 6 6-6", pdf: "M12 3v12M7 10l5 5 5-5M5 21h14",
};
const lbl = { margin: 0, fontSize: 12.5, fontWeight: 800, letterSpacing: ".07em", color: "var(--d-ink3, var(--ink3))" } as const;
const karta = { borderRadius: 20, background: "var(--d-card, var(--card))", border: "1px solid var(--sek-bBd)", boxShadow: "var(--d-hl, none)", padding: "0 18px" } as const; // karta 25: linka vo farbe sekcie (účet a súkromie = modrá)
const hlavne = { width: "100%", height: 56, borderRadius: 18, border: "none", fontSize: 17, fontWeight: 800, color: "#fff", cursor: "pointer", background: "var(--gGrad)", fontFamily: "inherit" } as const;
const vedlajsie = { height: 52, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 15.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" } as const;
const pole = { height: 52, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, color: "var(--ink)", outline: "none", fontFamily: "inherit", minWidth: 0, width: "100%" } as const;
const Bod = ({ children }: { children: ReactNode }) => <div style={{ display: "flex", gap: 10, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}><span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flex: "none", marginTop: 8 }} /><span>{children}</span></div>;
const Prep = Prepinac; // karta 25: vypnutý prepínač viditeľný aj v tmavej
const Hotovo = ({ children }: { children: ReactNode }) => <div role="status" style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 14.5, fontWeight: 700, color: "var(--gInk)" }}><Ik d={IK.fajka} w={2.6} />{children}</div>;
function Volba({ on, onClick, t, s, ikona }: { on: boolean; onClick: () => void; t: string; s?: string; ikona?: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", background: on ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}` }}>
      {ikona && <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--bSoft)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={ikona} s={19} /></span>}
      {!ikona && <Radio on={on} />}
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{t}</span>{s && <span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{s}</span>}</span>
      {ikona && <Radio on={on} />}
    </button>);
}
const Radio = ({ on }: { on: boolean }) => <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", border: `2px solid ${on ? "var(--green)" : "var(--chkBd)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0 }} /></span>;

/** obrazovka, ktorá príde sprava (Späť vráti na Nastavenia) */
export function ObrazovkaSprava({ titul, onBack, children, z = 135 }: { titul: string; onBack: () => void; children: ReactNode; z?: number }) {
  const [otv, setOtv] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const r = requestAnimationFrame(() => setOtv(true)); return () => cancelAnimationFrame(r); }, []);
  const spat = () => { setOtv(false); setTimeout(onBack, 380); };
  // Esc zavrie len vrchnú vrstvu (hárok nad obrazovkou má vlastné Esc)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key !== "Escape") return; const vrch = [...document.querySelectorAll('[aria-modal="true"]')].pop(); if (vrch === ref.current) spat(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  return createPortal(
    <div ref={ref} className="deed-platba" role="dialog" aria-modal="true" aria-label={titul}
      style={{ position: "fixed", inset: 0, zIndex: z, background: "var(--bg)", color: "var(--ink)", fontFamily: "'Plus Jakarta Sans', sans-serif", transform: otv ? "none" : "translateX(105%)", transition: "transform .42s cubic-bezier(.45,0,.25,1)" }}>
      <div style={{ height: "100%", maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "max(6px, env(safe-area-inset-top)) 16px 0", minHeight: 60 }}>
          <SpatTlacidlo onClick={spat} />
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titul}</h1>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}><div style={{ padding: "6px 16px max(30px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div></div>
      </div>
    </div>, document.body);
}

// ======================= 1 · POTVRDIŤ PLATBU NAD =======================
export const hranicaText = (h: number) => (h === 0 ? "každú" : `${h}\u00a0€`);
export function PotvrditPlatbuHarok({ onClose }: { onClose: () => void }) {
  const n = useNastaveniaAppky();
  const [v, setV] = useState(n.hranicaPlatby);
  const MOZ: [number, string, string][] = [[20, "20 €", ""], [50, "50 €", "odporúčame"], [100, "100 €", ""], [200, "200 €", ""], [0, "Každú platbu", "aj malé dary v eurách"]];
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 46, height: 46, borderRadius: 14, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.zamok} s={22} /></span><span style={{ fontSize: 20, fontWeight: 800 }}>Potvrdiť platbu nad</span></span>}
      paticka={<button type="button" onClick={() => { zmenNastavenia({ hranicaPlatby: v }); toast("Uložené"); onClose(); }} style={hlavne}>Uložiť</button>}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Pri platbe nad túto sumu ťa appka požiada o tvár, odtlačok alebo PIN. Menšie platby prejdú podržaním tlačidla.</div>
      <div role="radiogroup" aria-label="Potvrdiť platbu nad" style={{ display: "flex", flexDirection: "column", gap: 6 }}>{MOZ.map(([h, t, s]) => <Volba key={h} on={v === h} onClick={() => setV(h)} t={t} s={s} />)}</div>
      <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>Mikrodary v DEED a EURC do 1 € sa nepotvrdzujú nikdy, aby dar na jeden klik ostal na jeden klik. Pravidelná podpora sa potvrdí raz, pri nastavení.</div>
    </Harok>);
}

// ======================= 2d · PREDVOLENÝ OKRUH =======================
const vzdialenost = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
export const najblizsieMesto = (p: { lat: number; lng: number }) => [...MESTA].sort((a, b) => vzdialenost(p, a) - vzdialenost(p, b))[0];
const KLUC_POLOHA = "deed.okruh.poloha";
/** Kde práve som: pri zmene polohy o viac ako ~5 km sa okruh prepočíta sám. Volá sa pri štarte a pri návrate do appky. */
export function prepocitajPodlaPolohy(nastavMesto: (m: string) => void) {
  if (!nacitajNastavenia().odPolohy || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((g) => {
    const p = { lat: g.coords.latitude, lng: g.coords.longitude };
    let posl: { lat: number; lng: number } | null = null;
    try { posl = JSON.parse(localStorage.getItem(KLUC_POLOHA) || "null"); } catch { /* LS */ }
    if (posl && vzdialenost(posl, p) < 5) return;
    try { localStorage.setItem(KLUC_POLOHA, JSON.stringify(p)); } catch { /* LS */ }
    nastavMesto(najblizsieMesto(p).nazov);
  }, () => zmenNastavenia({ odPolohy: false }), { timeout: 10000, maximumAge: 600000 });
}

export function OkruhHarok({ onClose, onZmenitMiesto }: { onClose: () => void; onZmenitMiesto: () => void }) {
  const n = useNastaveniaAppky();
  const lok = useLokalita();
  const os = useOsobnyProfil();
  const [okruh, setOkruh] = useState(n.okruh);
  const [odPolohy, setOdPolohy] = useState(n.odPolohy);
  const [kdeSom, setKdeSom] = useState<string | null>(null);
  const mojeMesto = os.mesto && MESTA.some((m) => m.nazov === os.mesto) ? os.mesto : lok.mesto;
  const mesto = odPolohy ? kdeSom ?? lok.mesto : mojeMesto;
  const zapniPolohu = () => {
    if (!navigator.geolocation) { toast("Tento telefón polohu neposkytuje."); return; }
    navigator.geolocation.getCurrentPosition((g) => { setOdPolohy(true); setKdeSom(najblizsieMesto({ lat: g.coords.latitude, lng: g.coords.longitude }).nazov); },
      () => { setOdPolohy(false); toast("Bez povolenej polohy počítame od tvojho miesta."); }, { timeout: 10000 });
  };
  const uloz = () => {
    zmenNastavenia({ okruh, odPolohy });
    lok.nastavOkruh(okruh === "slovensko" ? "krajina" : okruh);
    lok.nastavMesto(mesto);
    if (odPolohy) try { localStorage.removeItem(KLUC_POLOHA); } catch { /* LS */ }
    onClose();
  };
  const MOZ: [typeof okruh, string, string][] = [["stvrt", "Štvrť", `okolie tvojho miesta · asi 2 km`], ["mesto", "Mesto", `celé ${mesto}`], ["slovensko", "Slovensko", "všetko, zoradené od najbližšieho"]];
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>Predvolený okruh</span>} paticka={<button type="button" onClick={uloz} style={hlavne}>Uložiť</button>}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Odkiaľ ti Domov ukáže skutky, pomoc a zbierky, keď appku otvoríš.</div>
      <div role="radiogroup" aria-label="Okruh" style={{ display: "flex", flexDirection: "column", gap: 6 }}>{MOZ.map(([k, t, s]) => <Volba key={k} on={okruh === k} onClick={() => setOkruh(k)} t={t} s={s} />)}</div>
      <h2 style={{ ...lbl, marginTop: 2 }}>POČÍTAŤ OD</h2>
      <div role="radiogroup" aria-label="Počítať od" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
        {([["Moje miesto", mojeMesto, false], ["Kde práve som", "podľa polohy telefónu", true]] as const).map(([t, s, a]) => { const on = odPolohy === a; return (
          <button type="button" role="radio" aria-checked={on} key={t} onClick={() => (a ? zapniPolohu() : setOdPolohy(false))} style={{ minHeight: 54, padding: "6px 8px", borderRadius: 11, border: "none", cursor: "pointer", background: on ? "var(--card)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, fontFamily: "inherit" }}>
            <span style={{ fontSize: 14.5, fontWeight: 800 }}>{t}</span><span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{s}</span></button>); })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        <span style={{ color: "var(--green)", display: "flex", flex: "none" }}><Ik d={IK.poloha} /></span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{odPolohy ? "Práve si v:" : "Počítame od miesta, kde sa zdržiavaš:"} <b style={{ color: "var(--ink)" }}>{mesto}</b></span>
        {!odPolohy && <button type="button" onClick={onZmenitMiesto} style={{ flex: "none", border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "10px 0 10px 6px", fontFamily: "inherit" }}>Zmeniť</button>}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>Okruh zmeníš aj priamo v Domove jedným ťuknutím. SOS pomoc v okolí ti príde vždy podľa polohy telefónu, nie podľa okruhu.</div>
    </Harok>);
}

// ======================= 2 · PRIHLÁSENÉ ZARIADENIA =======================
function ZoznamZariadeni({ onOdhlas }: { onOdhlas?: (z: Zariadenie) => void }) {
  const zoz = zariadenia();
  return (
    <div style={karta}>
      {zoz.map((z, i) => (
        <div key={z.id} className="pf-rise" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 72, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 12, background: z.toto ? "var(--gSoft)" : "var(--bSoft)", color: z.toto ? "var(--green)" : "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK[z.typ]} s={20} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span style={{ fontSize: 15, fontWeight: 700 }}>{z.nazov}</span>{z.toto && <span style={{ padding: "2px 7px", borderRadius: 7, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 11, fontWeight: 800, color: "var(--gInk)", whiteSpace: "nowrap" }}>TOTO ZARIADENIE</span>}</span>
            <span style={{ display: "block", fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>{[z.mesto, z.posledna, z.potvrdene].filter(Boolean).join(" · ")}</span>
            {z.nove && <span style={{ display: "block", marginTop: 4, fontSize: 12.5, fontWeight: 700, color: "var(--gold)" }}>nové · 24 h bez zmeny údajov, platby do {NOVE_LIMIT_EUR}&nbsp;€</span>}
          </span>
          {!z.toto && onOdhlas && <button type="button" onClick={() => onOdhlas(z)} style={{ flex: "none", minHeight: 44, padding: "0 12px", borderRadius: 11, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 14, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>Odhlásiť</button>}
        </div>))}
    </div>);
}
const OCHRANA: [string, string][] = [["Najviac 5 zariadení.", "Pri šiestom najprv jedno odhlásiš."], ["Nové zariadenie potvrdíš", "kódom na e-mail alebo telefón, alebo ťuknutím „Áno, som to ja“ na prihlásenom zariadení."], ["Prvých 24 hodín", "na novom zariadení nezmeníš e-mail, telefón, IBAN ani kartu a platby sú najviac do 50 €."], ["Po 5 zlých pokusoch", "o prihlásenie počkáš 15 minút a my ti dáme vedieť."]];

export function PrihlaseneZariadenia({ onBack }: { onBack: () => void }) {
  useZmenyZariadeni();
  const [sprava, setSprava] = useState("");
  const [dev, setDev] = useState<null | "limit" | "nove">(null); // len na vývoj: ukážka hlášok z prihlásenia
  const zoz = zariadenia();
  return (
    <ObrazovkaSprava titul="Prihlásené zariadenia" onBack={onBack}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Tu vidíš, kde si prihlásený. Ak niektoré zariadenie nepoznáš, odhlás ho a zmeň si heslo.</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px" }}><h2 style={lbl}>ZARIADENIA</h2><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{zoz.length} z {MAX_ZARIADENI}</span></div>
      <ZoznamZariadeni onOdhlas={(z) => { odhlas(z.id); setSprava(`${z.nazov} je odhlásený.`); }} />
      {zoz.length > 1 && <button type="button" onClick={() => { odhlasOstatne(); setSprava("Ostatné zariadenia sú odhlásené."); }} style={{ ...vedlajsie, fontWeight: 800 }}>Odhlásiť všetky ostatné</button>}
      {sprava && <Hotovo>{sprava}</Hotovo>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 18px", borderRadius: 20, background: "var(--d-card, var(--card))", border: "1px solid var(--sek-bBd)", boxShadow: "var(--d-hl, none)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--green)", display: "flex" }}><Ik d={IK.stit} /></span><span style={{ fontSize: 15.5, fontWeight: 800 }}>Ako chránime tvoj účet</span></div>
        {OCHRANA.map(([t, s]) => <Bod key={t}><b style={{ color: "var(--ink)" }}>{t}</b> {s}</Bod>)}
      </div>
      <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>Pri každom novom prihlásení ti pošleme oznámenie. Ak si to nebol ty, ťukni v ňom <b style={{ color: "var(--ink)" }}>Nebol som to ja</b> a zariadenie hneď odhlásime.</div>
      {import.meta.env.DEV && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" onClick={() => { naplnDoLimitu(); setDev("limit"); }} style={{ minHeight: 44, borderRadius: 12, border: "1.5px dashed var(--cardBd)", background: "transparent", fontSize: 13, color: "var(--ink3)", cursor: "pointer", fontFamily: "inherit" }}>Vývoj: 6. zariadenie</button>
        <button type="button" onClick={() => setDev("nove")} style={{ minHeight: 44, borderRadius: 12, border: "1.5px dashed var(--cardBd)", background: "transparent", fontSize: 13, color: "var(--ink3)", cursor: "pointer", fontFamily: "inherit" }}>Vývoj: nové zariadenie</button>
      </div>}
      {dev === "limit" && <LimitZariadeni onPokracovat={() => setDev(null)} />}
      {dev === "nove" && <PotvrdNoveZariadenie onPotvrdene={() => setDev(null)} onZrusit={() => setDev(null)} />}
    </ObrazovkaSprava>);
}

/** 3.1 · pri 6. prihlásení (volá sa z prihlásenia) */
export function LimitZariadeni({ onPokracovat }: { onPokracovat: () => void }) {
  useZmenyZariadeni();
  const plne = zariadenia().length > MAX_ZARIADENI;
  return (
    <ObrazovkaSprava titul="Priveľa zariadení" onBack={onPokracovat} z={200}>
      <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}><b>Máš prihlásených {MAX_ZARIADENI} zariadení.</b> Odhlás jedno, aby si mohol pokračovať.</div>
      <ZoznamZariadeni onOdhlas={(z) => odhlas(z.id)} />
      <button type="button" onClick={onPokracovat} aria-disabled={plne} style={{ ...hlavne, opacity: plne ? 0.45 : 1 }}>Pokračovať</button>
    </ObrazovkaSprava>);
}

/** 3.2 · nové zariadenie: kód na e-mail / telefón, alebo „Áno, som to ja" na prihlásenom zariadení */
export function PotvrdNoveZariadenie({ onPotvrdene, onZrusit }: { onPotvrdene: () => void; onZrusit: () => void }) {
  const [kod, setKod] = useState("");
  const [kam, setKam] = useState<"mail" | "sms">("mail");
  const t = zariadenia()[0];
  return (
    <ObrazovkaSprava titul="Potvrď nové zariadenie" onBack={onZrusit} z={200}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Prihlasuješ sa na <b style={{ color: "var(--ink)" }}>{t.nazov}</b> v meste {t.mesto}. Aby sme vedeli, že si to ty, potvrď ho.</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 14, background: "var(--bSoft)", border: "1px solid var(--bBd)", fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>
        <span style={{ color: "var(--blue)", display: "flex", flex: "none", marginTop: 2 }}><Ik d={IK.telefon} /></span>
        <span>Na zariadení, kde si už prihlásený, ti prišlo oznámenie <b style={{ color: "var(--ink)" }}>„Prihlasuješ sa na {t.nazov} v meste {t.mesto}?“</b> Ťukni tam <b style={{ color: "var(--ink)" }}>Áno, som to ja</b>.</span>
      </div>
      <h2 style={lbl}>ALEBO ZADAJ KÓD</h2>
      <div role="radiogroup" aria-label="Kam poslať kód" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
        {([["mail", "Na e-mail"], ["sms", "SMS na telefón"]] as const).map(([k, l]) => <button type="button" role="radio" aria-checked={kam === k} key={k} onClick={() => setKam(k)} style={{ height: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", background: kam === k ? "var(--card)" : "transparent", color: kam === k ? "var(--ink)" : "var(--ink3)" }}>{l}</button>)}
      </div>
      <input value={kod} onChange={(e) => setKod(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="Kód" placeholder="• • • • • •" style={{ ...pole, fontSize: 24, letterSpacing: ".35em", textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "var(--ink3)" }}><span>Platí 10 minút</span><button type="button" onClick={() => toast("Kód sme poslali znova")} style={{ border: "none", background: "transparent", fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "10px 0", fontFamily: "inherit", fontSize: 13.5 }}>Poslať znova</button></div>
      <button type="button" onClick={() => kod.length === 6 && onPotvrdene()} aria-disabled={kod.length !== 6} style={{ ...hlavne, opacity: kod.length === 6 ? 1 : 0.45 }}>Potvrdiť</button>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>Bez potvrdenia sa do účtu nedostaneš. Prvých 24 hodín na tomto zariadení nezmeníš e-mail, telefón, IBAN ani kartu a platby budú najviac do {NOVE_LIMIT_EUR}&nbsp;€.</div>
    </ObrazovkaSprava>);
}

/** 3.3 · hláška na novom zariadení (e-mail, telefón, IBAN, karta) */
export function Blokacia24h({ co = "túto zmenu" }: { co?: string }) {
  const h = hodinNovehoZariadenia();
  if (!h) return null;
  return <div role="status" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Na novom zariadení {co} {/pridáš$/.test(co) ? "" : "urobíš "}o <b style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{h} h</b>, alebo hneď na zariadení, kde si prihlásený dlhšie.</div>;
}

// ======================= 2b · E-MAIL, TELEFÓN A HESLO =======================
type Kontakt = { email: string; tel: string; hesloZmenene: number | null };
const KLUC_KONTAKT = "deed.kontakt";
const nacitajKontakt = (): Kontakt => {
  try { const s = localStorage.getItem(KLUC_KONTAKT); if (s) return JSON.parse(s); } catch { /* LS */ }
  return (getSession() as { demo?: boolean } | null)?.demo ? { email: "martin.konal@gmail.com", tel: "+421 905 123 482", hesloZmenene: Date.now() - 95 * 86400000 } : { email: "", tel: "", hesloZmenene: null };
};
const maskuj = (t: string, k: "e" | "t") => (k === "e" ? t.replace(/^(.)[^@]*(@.*)$/, "$1•••$2") : t.replace(/(\+\d{3}\s?\d)[\d\s]*(\d{3})$/, "$1•• ••• $2"));

export function EmailTelefonHeslo({ onBack }: { onBack: () => void }) {
  useZmenyZariadeni();
  const [k, setK] = useState<Kontakt>(nacitajKontakt);
  const [zmena, setZmena] = useState<null | "e" | "t" | "h">(null);
  const pred = (x: number | null) => { if (!x) return "nenastavené"; const d = Math.round((Date.now() - x) / 86400000); return d < 1 ? "zmenené dnes" : d < 30 ? `zmenené pred ${d} dňami` : `zmenené pred ${Math.round(d / 30)} mesiacmi`; };
  const RIADKY: ["e" | "t" | "h", string, string, string][] = [["e", "E-mail", k.email || "nenastavený", k.email ? "overený" : ""], ["t", "Telefón", k.tel || "nenastavený", k.tel ? "overený" : ""], ["h", "Heslo", "••••••••••", pred(k.hesloZmenene)]];
  return (
    <ObrazovkaSprava titul="E-mail, telefón a heslo" onBack={onBack}>
      <div style={karta}>
        {RIADKY.map(([key, l, v, s], i) => (
          <button type="button" key={key} onClick={() => setZmena(key)} aria-label={`${l}: ${v}. Zmeniť`} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 70, border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", padding: "6px 0" }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{l}</span><span style={{ display: "block", fontSize: 16, fontWeight: 700, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>{s && <span style={{ display: "block", fontSize: 12.5, color: "var(--gInk)", marginTop: 1 }}>{s}</span>}</span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--green)" }}>Zmeniť</span></button>))}
      </div>
      {import.meta.env.DEV && (
        <button type="button" role="switch" aria-checked={hodinNovehoZariadenia() > 0} onClick={() => nastavNoveZariadenie(!hodinNovehoZariadenia())} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "6px 12px", borderRadius: 13, border: "1.5px dashed var(--cardBd)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--ink3)", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ flex: 1 }}>Len na vývoj: <b style={{ color: "var(--ink2)" }}>prihlásený na novom zariadení</b></span><Prep on={hodinNovehoZariadenia() > 0} /></button>)}
      <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>Každú zmenu potvrdíš kódom a na pôvodný e-mail alebo telefón ti pošleme oznámenie. Ak si to nebol ty, ťukni v ňom <b style={{ color: "var(--ink)" }}>Nebol som to ja</b>.</div>
      <div style={karta}>
        <button type="button" onClick={() => toast("Pribudne v ďalšej verzii")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 58, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
          <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>Bezpečnostný kľúč</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>passkey alebo USB kľúč · pridať</span></span><span style={{ color: "var(--ink3)", display: "flex" }}><Ik d={IK.sipka} s={16} w={2.4} /></span></button>
      </div>
      {zmena && <ZmenaHarok co={zmena} kontakt={k} onClose={() => setZmena(null)} onHotovo={(z) => { const n = { ...k, ...z }; setK(n); try { localStorage.setItem(KLUC_KONTAKT, JSON.stringify(n)); } catch { /* LS */ } }} />}
    </ObrazovkaSprava>);
}

function ZmenaHarok({ co, kontakt, onClose, onHotovo }: { co: "e" | "t" | "h"; kontakt: Kontakt; onClose: () => void; onHotovo: (z: Partial<Kontakt>) => void }) {
  const [krok, setKrok] = useState<0 | 1 | 2 | 3>(co === "h" ? 1 : 0);
  const [ov, setOv] = useState<null | "bio" | "sms" | "mail" | "kluc">(null);
  const [overene, setOverene] = useState<string | null>(null);
  const [v, setV] = useState("");
  const [h0, setH0] = useState("");
  const [h1, setH1] = useState("");
  const [bezStareho, setBezStareho] = useState(false);
  const [kod, setKod] = useState("");
  const zamok = co !== "h" && hodinNovehoZariadenia() > 0;
  const titul = { e: "Zmeniť e-mail", t: "Zmeniť telefón", h: "Zmeniť heslo" }[co];
  const SP: [NonNullable<typeof ov>, string, string, string][] = ([["bio", "Tvár alebo odtlačok", "na tomto zariadení", IK.tvar], ["sms", "SMS kód", kontakt.tel ? `na ${maskuj(kontakt.tel, "t")}` : "na terajšie číslo", IK.telefon], ["mail", "Kód na terajší e-mail", kontakt.email ? maskuj(kontakt.email, "e") : "na terajší e-mail", IK.mail], ["kluc", "Bezpečnostný kľúč", "passkey alebo USB kľúč", IK.kluc]] as [NonNullable<typeof ov>, string, string, string][])
    .filter(([k]) => !(co === "t" && k === "sms") && !(co === "e" && k === "mail"));
  const sila = (h1.length >= 8 ? 1 : 0) + (/[A-Z]/.test(h1) && /[a-z]/.test(h1) ? 1 : 0) + (/\d/.test(h1) ? 1 : 0) + (/[^A-Za-z0-9]/.test(h1) || h1.length >= 12 ? 1 : 0);
  const ok = co === "h" ? (bezStareho || h0.length >= 4) && sila >= 3 : co === "e" ? /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v.trim()) : v.replace(/\D/g, "").length >= 9;
  const over = async () => {
    if (!ov) return;
    if (ov === "kluc" || ov === "bio") {
      // WebAuthn (passkey / tvár / odtlačok) — kľúč zaregistruje server; bez neho appka overenie len ukáže
      if (!window.PublicKeyCredential) { toast("Tento prehliadač bezpečnostný kľúč nepodporuje."); return; }
    }
    setOverene({ bio: "tvárou", sms: "cez SMS", mail: "cez e-mail", kluc: "kľúčom" }[ov]);
    setKrok(1);
  };
  const cil = co === "h" ? kontakt.email : v.trim();
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{titul}</span>}>
      {zamok ? <Blokacia24h /> : <>
        {krok === 0 && <>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>Najprv over, že si to ty. Vyber spôsob, ku ktorému máš prístup.</div>
          <div role="radiogroup" aria-label="Spôsob overenia" style={{ display: "flex", flexDirection: "column", gap: 6 }}>{SP.map(([k, t, s, d]) => <Volba key={k} on={ov === k} onClick={() => setOv(k)} t={t} s={s} ikona={d} />)}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>Nemáš prístup k ničomu z toho? <button type="button" onClick={() => toast("Napíš nám na podpora@deed.sk, overíme ťa dokladom do 48 h.")} style={{ border: "none", background: "transparent", padding: "8px 0", fontWeight: 800, color: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Obnoviť účet cez podporu</button> · overíme ťa dokladom, trvá do 48 h.</div>
          <button type="button" onClick={over} aria-disabled={!ov} style={{ ...hlavne, opacity: ov ? 1 : 0.45 }}>{ov === "bio" ? "Overiť tvárou" : ov === "kluc" ? "Použiť kľúč" : "Poslať kód"}</button>
        </>}
        {krok === 1 && <>
          {overene && <div role="status" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, fontWeight: 700, color: "var(--gInk)" }}><Ik d={IK.fajka} s={16} w={2.6} />Overené {overene}. Teraz zadaj {co === "e" ? "nový e-mail." : co === "t" ? "nové číslo." : "nové heslo."}</div>}
          {co === "h" ? <>
            {!bezStareho && <>
              <input type="password" value={h0} onChange={(e) => setH0(e.target.value)} placeholder="Terajšie heslo" aria-label="Terajšie heslo" autoComplete="current-password" style={pole} />
              <button type="button" onClick={() => { setBezStareho(true); setKrok(0); }} style={{ alignSelf: "flex-start", border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "8px 0", fontFamily: "inherit" }}>Nepamätám si terajšie heslo</button>
            </>}
            <input type="password" value={h1} onChange={(e) => setH1(e.target.value)} placeholder="Nové heslo" aria-label="Nové heslo" autoComplete="new-password" style={pole} />
            <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>{[0, 1, 2, 3].map((i) => <span key={i} style={{ height: 5, borderRadius: 3, background: i < sila ? (sila >= 3 ? "var(--green)" : "var(--gold)") : "var(--pillBd)", transition: "background .2s ease" }} />)}</div>
            <div aria-live="polite" style={{ fontSize: 13, color: "var(--ink3)" }}>{!h1 ? "Aspoň 8 znakov, veľké aj malé písmená a číslo." : sila >= 3 ? "Silné heslo." : "Ešte slabé. Pridaj číslo alebo veľké písmeno."}</div>
          </> : <>
            <input value={v} onChange={(e) => setV(e.target.value)} placeholder={co === "e" ? "Nový e-mail" : "+421 9xx xxx xxx"} aria-label={co === "e" ? "Nový e-mail" : "Nové telefónne číslo"} inputMode={co === "e" ? "email" : "tel"} autoComplete={co === "e" ? "email" : "tel"} style={pole} />
            <div style={{ fontSize: 13, color: "var(--ink3)" }}>{co === "e" ? "Pošleme kód na nový e-mail, aby sme vedeli, že je tvoj." : "Pošleme SMS s kódom na nové číslo."}</div>
          </>}
          <button type="button" onClick={() => ok && (setKod(""), setKrok(2))} aria-disabled={!ok} style={{ ...hlavne, opacity: ok ? 1 : 0.45 }}>{co === "h" ? "Pokračovať" : "Poslať kód"}</button>
        </>}
        {krok === 2 && <>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{co === "t" ? `Poslali sme SMS s kódom na ${v.trim()}.` : `Poslali sme kód na ${cil}.`}</div>
          <input value={kod} onChange={(e) => setKod(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="Kód" placeholder="• • • • • •" style={{ ...pole, fontSize: 24, letterSpacing: ".35em", textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "var(--ink3)" }}><span>Platí 10 minút</span><button type="button" onClick={() => toast("Kód sme poslali znova")} style={{ border: "none", background: "transparent", fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "10px 0", fontFamily: "inherit", fontSize: 13.5 }}>Poslať znova</button></div>
          <button type="button" onClick={() => { if (kod.length !== 6) return; onHotovo(co === "e" ? { email: v.trim() } : co === "t" ? { tel: v.trim() } : { hesloZmenene: Date.now() }); if (co === "h") odhlasOstatne(); setKrok(3); }} aria-disabled={kod.length !== 6} style={{ ...hlavne, opacity: kod.length === 6 ? 1 : 0.45 }}>Potvrdiť</button>
          {co !== "h" && <div style={{ fontSize: 13, color: "var(--ink3)" }}>Starý {co === "e" ? "e-mail" : "telefón"} platí, kým zmenu nepotvrdíš.</div>}
        </>}
        {krok === 3 && <>
          <Hotovo>{co === "h" ? "Heslo je zmenené. Ostatné zariadenia sme odhlásili." : co === "e" ? "E-mail je zmenený." : "Telefón je zmenený."}</Hotovo>
          <button type="button" onClick={onClose} style={vedlajsie}>Hotovo</button>
        </>}
      </>}
    </Harok>);
}

// ======================= 2c · ZABLOKOVANÍ ĽUDIA =======================
export function ZablokovaniLudia({ onBack }: { onBack: () => void }) {
  useZmenyBlokovania();
  const [sprava, setSprava] = useState("");
  const zoz = zablokovani();
  return (
    <ObrazovkaSprava titul="Zablokovaní ľudia" onBack={onBack}>
      {zoz.length ? <div style={karta}>
        {zoz.map((z, i) => (
          <div key={z.meno} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--pillBd)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flex: "none" }}>{z.ini}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{z.meno}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>zablokovaný {z.datum}</span></span>
            <button type="button" onClick={() => { odblokuj(z.meno); setSprava(`${z.meno} je odblokovaný. Znovu ho zablokuješ na jeho profile.`); }} style={{ flex: "none", minHeight: 44, padding: "0 12px", borderRadius: 11, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 14, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>Odblokovať</button>
          </div>))}
      </div> : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "28px 20px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", textAlign: "center" }}>
          <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.fajka} s={22} w={2.4} /></span>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Nikoho si nezablokoval</span>
        </div>)}
      {sprava && <div role="status" style={{ fontSize: 14, fontWeight: 700, color: "var(--gInk)", padding: "0 2px" }}>{sprava}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        <span style={{ fontSize: 15.5, fontWeight: 800 }}>Čo znamená zablokovať</span>
        {["Nevidí tvoj profil, skutky ani zbierky a nenájde ťa vo vyhľadávaní.", "Nemôže ti písať, pridať ťa do skutku ani ti poslať žiadosť o priateľstvo.", "Jeho skutky, komentáre a pozvánky neuvidíš ani ty.", "Nedozvie sa, že si ho zablokoval."].map((t) => <Bod key={t}>{t}</Bod>)}
        <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)", marginTop: 2 }}>Zablokovať niekoho môžeš na jeho profile cez tri bodky vpravo hore. Dary a platby blok nezastaví.</span>
      </div>
    </ObrazovkaSprava>);
}

// ======================= 2e · SÚHLASY + 2f DETAIL =======================
const VERZIA_PODMIENOK = "1.2";
type Nep = "pers" | "stat" | "news" | "part";
const NEPOVINNE: [Nep, string, string][] = [["pers", "Feed podľa mojich záujmov", "nástenka a pozvánky podľa Moje záujmy"], ["stat", "Anonymné štatistiky", "pomáhajú nám opraviť chyby, bez mena a polohy"], ["news", "Novinky od DEED e-mailom", "najviac raz mesačne"], ["part", "Údaje pre partnerov", "firmy uvidia len súhrn, nikdy tvoje meno"]];

function usePovolenie(meno: "geolocation" | "camera"): string {
  const [s, setS] = useState("zisťujem…");
  useEffect(() => {
    let zrus = false;
    const p = navigator.permissions?.query?.({ name: meno as PermissionName });
    if (!p) { setS("povolíš pri prvom použití"); return; }
    p.then((r) => { if (!zrus) setS(r.state === "granted" ? "povolené" : r.state === "denied" ? "nepovolené" : "opýtame sa pri prvom použití"); }).catch(() => !zrus && setS("povolíš pri prvom použití"));
    return () => { zrus = true; };
  }, [meno]);
  return s;
}

export function Suhlasy({ onBack }: { onBack: () => void }) {
  const n = useNastaveniaAppky();
  const [detail, setDetail] = useState<null | "pod" | "ud">(null);
  const poloha = usePovolenie("geolocation"), kamera = usePovolenie("camera");
  const prepni = (k: Nep) => {
    const s = n.suhlasy, on = !s[k], d = new Date();
    zmenNastavenia({ suhlasy: { ...s, [k]: on, zaznam: [...s.zaznam, { k, on, cas: d.toISOString(), verzia: VERZIA_PODMIENOK }] } });
  };
  const sys = () => toast("Otvor Nastavenia telefónu → Aplikácie → DEED");
  const riadok = (t: string, s: string, d: string, pravo: ReactNode, onClick: () => void, i: number, role?: { switch: boolean }) => (
    <button type="button" key={t} onClick={onClick} role={role ? "switch" : undefined} aria-checked={role ? role.switch : undefined}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t}</span><span style={{ display: "block", fontSize: 13, lineHeight: 1.45, color: "var(--ink3)", marginTop: 1 }}>{s}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink4)", marginTop: 3 }}>{d}</span></span>
      {pravo}</button>);
  const odk = (t: string) => <span style={{ flex: "none", fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{t}</span>;
  return (
    <ObrazovkaSprava titul="Súhlasy" onBack={onBack}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Tu vidíš, na čo si dal súhlas. Nepovinné môžeš kedykoľvek vypnúť, appka bude fungovať ďalej.</div>
      <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>POVINNÉ</h2><div style={karta}>
        {riadok("Podmienky používania", "pravidlá DEED, skutky, dary a zbierky", `odsúhlasené 3. 9. 2026 · verzia ${VERZIA_PODMIENOK}`, odk("Zobraziť"), () => setDetail("pod"), 0)}
        {riadok("Spracovanie údajov pre účet", "meno, e-mail, telefón, história skutkov a darov", "odsúhlasené 3. 9. 2026", odk("Zobraziť"), () => setDetail("ud"), 1)}
      </div></div>
      <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>POVOLENIA TELEFÓNU</h2><div style={karta}>
        {riadok("Poloha", "skutky a pomoc v okolí, GPS pri akciách", poloha, odk("V telefóne ›"), sys, 0)}
        {riadok("Fotoaparát a fotky", "dôkazy ku skutkom, profilová fotka, QR", kamera, odk("V telefóne ›"), sys, 1)}
        {riadok("Kontakty", "hľadanie priateľov, čísla sa neukladajú", n.kontakty ? "povolené" : "nepovolené", odk("V telefóne ›"), sys, 2)}
      </div></div>
      <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>NEPOVINNÉ</h2><div style={karta}>
        {NEPOVINNE.map(([k, t, s], i) => riadok(t, s, n.suhlasy[k] ? "zapnuté" : "vypnuté", <Prep on={n.suhlasy[k]} />, () => prepni(k), i, { switch: n.suhlasy[k] }))}
      </div></div>
      <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>Povinné súhlasy zrušíš len zrušením účtu. Znenie každého súhlasu, ako si ho odsúhlasil, nájdeš v <b style={{ color: "var(--ink)" }}>Stiahnuť moje údaje</b>.</div>
      {detail && <DetailSuhlasu typ={detail} onBack={() => setDetail(null)} />}
    </ObrazovkaSprava>);
}

// znenie je NÁVRH z prototypu — potvrdí právnik; neskôr sa načíta zo servera podľa verzie
const V_SKRATKE = ["Skutky overuje AI a komunita. Za pravdivosť skutku zodpovedáš ty.", "DEED nedrží tvoje peniaze. Dary idú priamo zbierke alebo žiadateľovi.", "Karma a skutky patria len tebe. Verejný je iba tvoj štít.", "Fotky ľudí zverejňuj len s ich súhlasom a s úctou k nim.", "Účet môžeš kedykoľvek zrušiť. Dary ostanú zapísané, môžu byť anonymné."];
const KAPITOLY: [string, string][] = [["1. Kto sme a čo je DEED", "DEED je appka pre dobré skutky, pomoc a zbierky. Prevádzkovateľ, kontakt a sídlo doplní právnik."], ["2. Tvoj účet", "Jeden človek, jeden účet. Meno overujeme pri registrácii. Za bezpečnosť hesla a zariadení zodpovedáš ty."], ["3. Skutky a overovanie", "Skutky kontroluje AI a komunita cez Overujem a Namietam. Nepravdivý skutok môžeme zrušiť a karmu odobrať."], ["4. Dary, zbierky a platby", "Platby spracúva platobná brána. DEED peniaze nedrží. Poplatky vidíš vždy pred zaplatením."], ["5. Obsah a správanie", "Bez urážok, reklamy a osobných údajov iných. Fotky ľudí len s ich súhlasom."], ["6. Zmeny podmienok", "Pri zmene ťa upozorníme a požiadame o nový súhlas. Zmeny ukážeme zvýraznené."]];
const UDAJE: [string, string, string][] = [["Meno a overenie totožnosti", "účet a dôvera medzi ľuďmi", "kým máš účet"], ["E-mail a telefón", "prihlásenie, bezpečnosť a dôležité oznámenia", "kým máš účet"], ["Skutky, fotky a dôkazy", "overenie skutku a feed", "kým ich nezmažeš"], ["Dary a platby", "doklady, ktoré vyžaduje zákon", "10 rokov, po zrušení účtu anonymne"], ["Poloha", "skutky a pomoc v okolí, GPS pri akcii", "len pri používaní, históriu neukladáme"]];
const PRAVA: [string, string][] = [["Pozrieť si údaje", "Stiahnuť moje údaje"], ["Opraviť údaje", "Upraviť profil, E-mail, telefón a heslo"], ["Stiahnuť údaje", "všetko v jednom súbore"], ["Vymazať údaje", "Zrušiť účet"]];

export function DetailSuhlasu({ typ, onBack }: { typ: "pod" | "ud"; onBack: () => void }) {
  const [kap, setKap] = useState<number | null>(null);
  const titul = typ === "pod" ? "Podmienky používania" : "Spracovanie údajov";
  const pdf = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const telo = typ === "pod" ? KAPITOLY.map(([t, x]) => `<h3>${esc(t)}</h3><p>${esc(x)}</p>`).join("") : UDAJE.map(([a, b, c]) => `<h3>${esc(a)}</h3><p>${esc(b)} · ${esc(c)}</p>`).join("");
    w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${titul}</title><style>body{font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:28px;color:#1D211B;line-height:1.5}</style></head><body><h1>DEED · ${titul}</h1><p>Verzia ${VERZIA_PODMIENOK}</p>${telo}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };
  return (
    <ObrazovkaSprava titul={titul} onBack={onBack} z={140}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 14, fontWeight: 700, color: "var(--gInk)" }}><Ik d={IK.fajka} w={2.6} />{typ === "pod" ? `Verzia ${VERZIA_PODMIENOK} · odsúhlasené 3. 9. 2026` : "Odsúhlasené 3. 9. 2026"}</div>
      {typ === "pod" ? <>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>V SKRATKE</h2><div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 18px", borderRadius: 20, background: "var(--d-card, var(--card))", border: "1px solid var(--sek-bBd)", boxShadow: "var(--d-hl, none)" }}>{V_SKRATKE.map((t) => <Bod key={t}>{t}</Bod>)}</div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>ČO SA ZMENILO VO VERZII {VERZIA_PODMIENOK}</h2><div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Pribudol skutok ako dar a ohlásený skutok. Doplnili sme pravidlá fotiek a dôstojnosti ľudí v ťažkej situácii.</div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>CELÉ ZNENIE</h2><div style={karta}>
          {KAPITOLY.map(([t, x], i) => { const o = kap === i; return (
            <div key={t} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <button type="button" aria-expanded={o} onClick={() => setKap(o ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 52, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{t}</span><span aria-hidden="true" style={{ display: "flex", color: "var(--ink3)", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d={IK.dole} s={15} w={2.4} /></span></button>
              {o && <div style={{ padding: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "var(--ink2)" }}>{x}</div>}
            </div>); })}
        </div></div>
      </> : <>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>ČO O TEBE UKLADÁME</h2><div style={karta}>
          {UDAJE.map(([co, preco, dlho], i) => (
            <div key={co} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>{co}</span><span style={{ flex: "none", fontSize: 12.5, fontWeight: 700, color: "var(--gold)", textAlign: "right", maxWidth: "45%" }}>{dlho}</span></div>
              <div style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", marginTop: 2 }}>{preco}</div>
            </div>))}
        </div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>KTO ICH VIDÍ</h2><div style={{ padding: "14px 18px", borderRadius: 20, background: "var(--d-card, var(--card))", border: "1px solid var(--sek-bBd)", boxShadow: "var(--d-hl, none)", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>Ty, AI pri overovaní skutkov a platobná brána pri platbe. Nikto iný. <b style={{ color: "var(--ink)" }}>Zaväzujeme sa, že tvoje údaje ani to, čo v appke robíš, nikdy nepredáme iným firmám na komerčné účely.</b></div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>SKUTKY PRE FIRMU (ESG)</h2><div style={{ padding: "14px 18px", borderRadius: 20, background: "var(--d-card, var(--card))", border: "1px solid var(--sek-bBd)", boxShadow: "var(--d-hl, none)", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>Ak je tvoj skutok priradený k firme, započítame ho do jej správ o zodpovednosti (ESG a CSGR). Vždy len <b style={{ color: "var(--ink)" }}>bez tvojho mena</b> a len v rozsahu, ktorý povoľuje zákon.</div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>TVOJE PRÁVA</h2><div style={karta}>
          {PRAVA.map(([t, s], i) => (
            <button type="button" key={t} onClick={() => { onBack(); toast(`Nájdeš v Nastaveniach: ${s}`); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 56, border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{s}</span></span><span style={{ color: "var(--ink3)", display: "flex" }}><Ik d={IK.sipka} s={16} w={2.4} /></span></button>))}
        </div></div>
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>Otázky k údajom:</b> ochrana.udajov@deed.sk. Ak nie si spokojný s odpoveďou, môžeš sa obrátiť na Úrad na ochranu osobných údajov SR.</div>
      </>}
      <button type="button" onClick={pdf} style={{ ...vedlajsie, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Ik d={IK.pdf} s={17} />Stiahnuť PDF</button>
    </ObrazovkaSprava>);
}

/** Kde práve som — prepočet okruhu pri štarte a pri návrate do appky (mount raz v App) */
export function PolohaOkruhu() {
  const lok = useLokalita();
  useEffect(() => {
    const f = () => { if (document.visibilityState === "visible") prepocitajPodlaPolohy(lok.nastavMesto); };
    f(); document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [lok.nastavMesto]);
  return null;
}
