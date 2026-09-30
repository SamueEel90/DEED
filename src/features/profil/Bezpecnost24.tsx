// KARTA 24 · Nastavenia: Potvrdiť platbu, Predvolený okruh, Prihlásené zariadenia, E-mail / telefón / heslo,
// Zablokovaní ľudia, Súhlasy (+ detail povinného súhlasu) a hlášky pri prihlásení (6. zariadenie, nové zariadenie,
// 24 h obmedzenie). Overovanie kódov, zoznam zariadení a znenia súhlasov bude držať server — tu je appková časť.
import { TESTOVACIA } from "@/lib/testovacia";
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
import { useT, tTeraz } from "@/i18n";
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
export function ObrazovkaSprava({ titul, aria, onBack, children, z = 135, zavriet = 0 }: { titul: ReactNode; /** názov pre čítačky, keď titul nie je text */ aria?: string; onBack: () => void; children: ReactNode; z?: number; /** zvýšenie = zasunúť a zavrieť (napr. po výbere) */ zavriet?: number }) {
  const [otv, setOtv] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const r = requestAnimationFrame(() => setOtv(true)); return () => cancelAnimationFrame(r); }, []);
  const spat = () => { setOtv(false); setTimeout(onBack, 380); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (zavriet > 0) { const t = setTimeout(spat, 200); return () => clearTimeout(t); } }, [zavriet]);
  // Esc zavrie len vrchnú vrstvu (hárok nad obrazovkou má vlastné Esc)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key !== "Escape") return; const vrch = [...document.querySelectorAll('[aria-modal="true"]')].pop(); if (vrch === ref.current) spat(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  return createPortal(
    <div ref={ref} className="deed-platba" role="dialog" aria-modal="true" aria-label={aria ?? (typeof titul === "string" ? titul : undefined)}
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
export const hranicaText = (h: number) => (h === 0 ? tTeraz()("bezpecnost.kazdu") : tTeraz().eur(h));
export function PotvrditPlatbuHarok({ onClose }: { onClose: () => void }) {
  const t = useT();
  const n = useNastaveniaAppky();
  const [v, setV] = useState(n.hranicaPlatby);
  const MOZ: [number, string, string][] = [[20, t.eur(20), ""], [50, t.eur(50), t("bezpecnost.odporucame")], [100, t.eur(100), ""], [200, t.eur(200), ""], [0, t("bezpecnost.kazduPlatbu"), t("bezpecnost.kazduPlatbuS")]];
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 46, height: 46, borderRadius: 14, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.zamok} s={22} /></span><span style={{ fontSize: 20, fontWeight: 800 }}>{t("nastavenia.platba")}</span></span>}
      paticka={<button type="button" onClick={() => { zmenNastavenia({ hranicaPlatby: v }); toast(t("bezpecnost.ulozene")); onClose(); }} style={hlavne}>{t("sp.ulozit")}</button>}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>{t("bezpecnost.platba.text")}</div>
      <div role="radiogroup" aria-label={t("nastavenia.platba")} style={{ display: "flex", flexDirection: "column", gap: 6 }}>{MOZ.map(([h, l, s]) => <Volba key={h} on={v === h} onClick={() => setV(h)} t={l} s={s} />)}</div>
      <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>{t("bezpecnost.platba.mikro")}</div>
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
  const t = useT();
  const n = useNastaveniaAppky();
  const lok = useLokalita();
  const os = useOsobnyProfil();
  const [okruh, setOkruh] = useState(n.okruh);
  const [odPolohy, setOdPolohy] = useState(n.odPolohy);
  const [kdeSom, setKdeSom] = useState<string | null>(null);
  const mojeMesto = os.mesto && MESTA.some((m) => m.nazov === os.mesto) ? os.mesto : lok.mesto;
  const mesto = odPolohy ? kdeSom ?? lok.mesto : mojeMesto;
  const zapniPolohu = () => {
    if (!navigator.geolocation) { toast(t("bezpecnost.okruh.nemaPolohu")); return; }
    navigator.geolocation.getCurrentPosition((g) => { setOdPolohy(true); setKdeSom(najblizsieMesto({ lat: g.coords.latitude, lng: g.coords.longitude }).nazov); },
      () => { setOdPolohy(false); toast(t("bezpecnost.okruh.bezPolohy")); }, { timeout: 10000 });
  };
  const uloz = () => {
    zmenNastavenia({ okruh, odPolohy });
    lok.nastavOkruh(okruh === "slovensko" ? "krajina" : okruh);
    lok.nastavMesto(mesto);
    if (odPolohy) try { localStorage.removeItem(KLUC_POLOHA); } catch { /* LS */ }
    onClose();
  };
  const MOZ: [typeof okruh, string, string][] = [["stvrt", t("nastavenia.okruh.stvrt"), t("bezpecnost.okruh.stvrtS")], ["mesto", t("nastavenia.okruh.mesto"), t("bezpecnost.okruh.mestoS", { mesto })], ["slovensko", t("nastavenia.okruh.slovensko"), t("bezpecnost.okruh.slovenskoS")]];
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{t("nastavenia.okruh")}</span>} paticka={<button type="button" onClick={uloz} style={hlavne}>{t("sp.ulozit")}</button>}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>{t("bezpecnost.okruh.text")}</div>
      <div role="radiogroup" aria-label={t("bezpecnost.okruh.aria")} style={{ display: "flex", flexDirection: "column", gap: 6 }}>{MOZ.map(([k, l, s]) => <Volba key={k} on={okruh === k} onClick={() => setOkruh(k)} t={l} s={s} />)}</div>
      <h2 style={{ ...lbl, marginTop: 2 }}>{t("bezpecnost.okruh.pocitatOd")}</h2>
      <div role="radiogroup" aria-label={t("bezpecnost.okruh.pocitatOdAria")} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
        {([[t("bezpecnost.okruh.mojeMiesto"), mojeMesto, false], [t("bezpecnost.okruh.kdeSom"), t("bezpecnost.okruh.kdeSomS"), true]] as const).map(([l, s, a]) => { const on = odPolohy === a; return (
          <button type="button" role="radio" aria-checked={on} key={String(a)} onClick={() => (a ? zapniPolohu() : setOdPolohy(false))} style={{ minHeight: 54, padding: "6px 8px", borderRadius: 11, border: "none", cursor: "pointer", background: on ? "var(--card)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, fontFamily: "inherit" }}>
            <span style={{ fontSize: 14.5, fontWeight: 800 }}>{l}</span><span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{s}</span></button>); })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        <span style={{ color: "var(--green)", display: "flex", flex: "none" }}><Ik d={IK.poloha} /></span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{odPolohy ? t("bezpecnost.okruh.prave") : t("bezpecnost.okruh.od")} <b style={{ color: "var(--ink)" }}>{mesto}</b></span>
        {!odPolohy && <button type="button" onClick={onZmenitMiesto} style={{ flex: "none", border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "10px 0 10px 6px", fontFamily: "inherit" }}>{t("bezpecnost.zmenit")}</button>}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>{t("bezpecnost.okruh.pozn")}</div>
    </Harok>);
}

// ======================= 2 · PRIHLÁSENÉ ZARIADENIA =======================
function ZoznamZariadeni({ onOdhlas }: { onOdhlas?: (z: Zariadenie) => void }) {
  const t = useT();
  const zoz = zariadenia();
  return (
    <div style={karta}>
      {zoz.map((z, i) => (
        <div key={z.id} className="pf-rise" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 72, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 12, background: z.toto ? "var(--gSoft)" : "var(--bSoft)", color: z.toto ? "var(--green)" : "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK[z.typ]} s={20} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span style={{ fontSize: 15, fontWeight: 700 }}>{z.nazov}</span>{z.toto && <span style={{ padding: "2px 7px", borderRadius: 7, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 11, fontWeight: 800, color: "var(--gInk)", whiteSpace: "nowrap" }}>{t("bezpecnost.zar.toto")}</span>}</span>
            <span style={{ display: "block", fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>{[z.mesto, z.posledna, z.potvrdene].filter(Boolean).join(" · ")}</span>
            {z.nove && <span style={{ display: "block", marginTop: 4, fontSize: 12.5, fontWeight: 700, color: "var(--gold)" }}>{t("bezpecnost.zar.nove", { eur: t.eur(NOVE_LIMIT_EUR) })}</span>}
          </span>
          {!z.toto && onOdhlas && <button type="button" onClick={() => onOdhlas(z)} style={{ flex: "none", minHeight: 44, padding: "0 12px", borderRadius: 11, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 14, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>{t("bezpecnost.zar.odhlasit")}</button>}
        </div>))}
    </div>);
}
const OCHRANA = [1, 2, 3, 4]; // bezpecnost.ochrana.{i}t / {i}s

export function PrihlaseneZariadenia({ onBack }: { onBack: () => void }) {
  const t = useT();
  useZmenyZariadeni();
  const [sprava, setSprava] = useState("");
  const [dev, setDev] = useState<null | "limit" | "nove">(null); // len na vývoj: ukážka hlášok z prihlásenia
  const zoz = zariadenia();
  return (
    <ObrazovkaSprava titul={t("nastavenia.zariadenia")} onBack={onBack}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>{t("bezpecnost.zar.intro")}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px" }}><h2 style={lbl}>{t("bezpecnost.zar.nadpis")}</h2><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{t("bezpecnost.zar.pocet", { n: zoz.length, max: MAX_ZARIADENI })}</span></div>
      <ZoznamZariadeni onOdhlas={(z) => { odhlas(z.id); setSprava(t("bezpecnost.zar.odhlaseny", { nazov: z.nazov })); }} />
      {zoz.length > 1 && <button type="button" onClick={() => { odhlasOstatne(); setSprava(t("bezpecnost.zar.ostatneOdhlasene")); }} style={{ ...vedlajsie, fontWeight: 800 }}>{t("bezpecnost.zar.odhlasitOstatne")}</button>}
      {sprava && <Hotovo>{sprava}</Hotovo>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 18px", borderRadius: 20, background: "var(--d-card, var(--card))", border: "1px solid var(--sek-bBd)", boxShadow: "var(--d-hl, none)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--green)", display: "flex" }}><Ik d={IK.stit} /></span><span style={{ fontSize: 15.5, fontWeight: 800 }}>{t("bezpecnost.zar.ako")}</span></div>
        {OCHRANA.map((i) => <Bod key={i}><b style={{ color: "var(--ink)" }}>{t(`bezpecnost.ochrana.${i}t`)}</b> {t(`bezpecnost.ochrana.${i}s`)}</Bod>)}
      </div>
      <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>{t("bezpecnost.zar.ozn1")} <b style={{ color: "var(--ink)" }}>{t("bezpecnost.nebolSom")}</b> {t("bezpecnost.zar.ozn2")}</div>
      {TESTOVACIA && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" onClick={() => { naplnDoLimitu(); setDev("limit"); }} style={{ minHeight: 44, borderRadius: 12, border: "1.5px dashed var(--cardBd)", background: "transparent", fontSize: 13, color: "var(--ink3)", cursor: "pointer", fontFamily: "inherit" }}>{t("bezpecnost.dev6")}</button>
        <button type="button" onClick={() => setDev("nove")} style={{ minHeight: 44, borderRadius: 12, border: "1.5px dashed var(--cardBd)", background: "transparent", fontSize: 13, color: "var(--ink3)", cursor: "pointer", fontFamily: "inherit" }}>{t("bezpecnost.devNove")}</button>
      </div>}
      {dev === "limit" && <LimitZariadeni onPokracovat={() => setDev(null)} />}
      {dev === "nove" && <PotvrdNoveZariadenie onPotvrdene={() => setDev(null)} onZrusit={() => setDev(null)} />}
    </ObrazovkaSprava>);
}

/** 3.1 · pri 6. prihlásení (volá sa z prihlásenia) */
export function LimitZariadeni({ onPokracovat }: { onPokracovat: () => void }) {
  const t = useT();
  useZmenyZariadeni();
  const plne = zariadenia().length > MAX_ZARIADENI;
  return (
    <ObrazovkaSprava titul={t("bezpecnost.limit.titul")} onBack={onPokracovat} z={200}>
      <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}><b>{t("bezpecnost.limit.b", { n: MAX_ZARIADENI })}</b> {t("bezpecnost.limit.text")}</div>
      <ZoznamZariadeni onOdhlas={(z) => odhlas(z.id)} />
      <button type="button" onClick={onPokracovat} aria-disabled={plne} style={{ ...hlavne, opacity: plne ? 0.45 : 1 }}>{t("sp.pokracovat")}</button>
    </ObrazovkaSprava>);
}

/** 3.2 · nové zariadenie: kód na e-mail / telefón, alebo „Áno, som to ja" na prihlásenom zariadení */
export function PotvrdNoveZariadenie({ onPotvrdene, onZrusit }: { onPotvrdene: () => void; onZrusit: () => void }) {
  const [kod, setKod] = useState("");
  const [kam, setKam] = useState<"mail" | "sms">("mail");
  const t = useT();
  const zar = zariadenia()[0];
  return (
    <ObrazovkaSprava titul={t("bezpecnost.nove.titul")} onBack={onZrusit} z={200}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>{t("bezpecnost.nove.a")} <b style={{ color: "var(--ink)" }}>{zar.nazov}</b> {t("bezpecnost.nove.b", { mesto: zar.mesto })}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 14, background: "var(--bSoft)", border: "1px solid var(--bBd)", fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>
        <span style={{ color: "var(--blue)", display: "flex", flex: "none", marginTop: 2 }}><Ik d={IK.telefon} /></span>
        <span>{t("bezpecnost.nove.c")} <b style={{ color: "var(--ink)" }}>{t("bezpecnost.nove.otazka", { nazov: zar.nazov, mesto: zar.mesto })}</b> {t("bezpecnost.nove.d")} <b style={{ color: "var(--ink)" }}>{t("bezpecnost.anoSomJa")}</b>{t("bezpecnost.nove.e")}</span>
      </div>
      <h2 style={lbl}>{t("bezpecnost.aleboKod")}</h2>
      <div role="radiogroup" aria-label={t("bezpecnost.kamKod")} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
        {([["mail", t("bezpecnost.naEmail")], ["sms", t("bezpecnost.smsTel")]] as const).map(([k, l]) => <button type="button" role="radio" aria-checked={kam === k} key={k} onClick={() => setKam(k)} style={{ height: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", background: kam === k ? "var(--card)" : "transparent", color: kam === k ? "var(--ink)" : "var(--ink3)" }}>{l}</button>)}
      </div>
      <input value={kod} onChange={(e) => setKod(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label={t("bezpecnost.kod")} placeholder="• • • • • •" style={{ ...pole, fontSize: 24, letterSpacing: ".35em", textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "var(--ink3)" }}><span>{t("bezpecnost.plati")}</span><button type="button" onClick={() => toast(t("bezpecnost.kodZnova"))} style={{ border: "none", background: "transparent", fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "10px 0", fontFamily: "inherit", fontSize: 13.5 }}>{t("bezpecnost.poslatZnova")}</button></div>
      <button type="button" onClick={() => kod.length === 6 && onPotvrdene()} aria-disabled={kod.length !== 6} style={{ ...hlavne, opacity: kod.length === 6 ? 1 : 0.45 }}>{t("bezpecnost.potvrdit")}</button>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>{t("bezpecnost.nove.pozn", { eur: t.eur(NOVE_LIMIT_EUR) })}</div>
    </ObrazovkaSprava>);
}

/** 3.3 · hláška na novom zariadení (e-mail, telefón, IBAN, karta) */
export function Blokacia24h({ co: coP }: { co?: string }) {
  const t = useT();
  const co = coP ?? t("bezpecnost.blok24.co");
  const h = hodinNovehoZariadenia();
  if (!h) return null;
  return <div role="status" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{t("bezpecnost.blok24.a", { co, urob: /pridáš$|^you can add/.test(co) ? "" : t("bezpecnost.blok24.urob") })}<b style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{t("bezpecnost.blok24.h", { h })}</b>{t("bezpecnost.blok24.b")}</div>;
}

// ======================= 2b · E-MAIL, TELEFÓN A HESLO =======================
type Kontakt = { email: string; tel: string; hesloZmenene: number | null };
const KLUC_KONTAKT = "deed.kontakt";
export const nacitajKontakt = (): Kontakt => {
  try { const s = localStorage.getItem(KLUC_KONTAKT); if (s) return JSON.parse(s); } catch { /* LS */ }
  return (getSession() as { demo?: boolean } | null)?.demo ? { email: "martin.konal@gmail.com", tel: "+421 905 123 482", hesloZmenene: Date.now() - 95 * 86400000 } : { email: "", tel: "", hesloZmenene: null };
};
export const maskuj = (t: string, k: "e" | "t") => (k === "e" ? t.replace(/^(.)[^@]*(@.*)$/, "$1•••$2") : t.replace(/(\+\d{3}\s?\d)[\d\s]*(\d{3})$/, "$1•• ••• $2"));

export function EmailTelefonHeslo({ onBack }: { onBack: () => void }) {
  const t = useT();
  useZmenyZariadeni();
  const [k, setK] = useState<Kontakt>(nacitajKontakt);
  const [zmena, setZmena] = useState<null | "e" | "t" | "h">(null);
  const pred = (x: number | null) => { if (!x) return t("bezpecnost.nenastavene"); const d = Math.round((Date.now() - x) / 86400000); return d < 1 ? t("bezpecnost.zmeneneDnes") : d < 30 ? t("bezpecnost.zmenenePredD", { n: d }) : t("bezpecnost.zmenenePredM", { n: Math.round(d / 30) }); };
  const RIADKY: ["e" | "t" | "h", string, string, string][] = [["e", t("bezpecnost.email"), k.email || t("bezpecnost.nenastaveny"), k.email ? t("bezpecnost.overeny") : ""], ["t", t("bezpecnost.telefon"), k.tel || t("bezpecnost.nenastaveny"), k.tel ? t("bezpecnost.overeny") : ""], ["h", t("bezpecnost.heslo"), "••••••••••", pred(k.hesloZmenene)]];
  return (
    <ObrazovkaSprava titul={t("nastavenia.kontakt")} onBack={onBack}>
      <div style={karta}>
        {RIADKY.map(([key, l, v, s], i) => (
          <button type="button" key={key} onClick={() => setZmena(key)} aria-label={t("bezpecnost.zmenitAria", { l, v })} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 70, border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", padding: "6px 0" }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{l}</span><span style={{ display: "block", fontSize: 16, fontWeight: 700, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>{s && <span style={{ display: "block", fontSize: 12.5, color: "var(--gInk)", marginTop: 1 }}>{s}</span>}</span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--green)" }}>{t("bezpecnost.zmenit")}</span></button>))}
      </div>
      {TESTOVACIA && (
        <button type="button" role="switch" aria-checked={hodinNovehoZariadenia() > 0} onClick={() => nastavNoveZariadenie(!hodinNovehoZariadenia())} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "6px 12px", borderRadius: 13, border: "1.5px dashed var(--cardBd)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--ink3)", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ flex: 1 }}>{t("bezpecnost.devLen")} <b style={{ color: "var(--ink2)" }}>{t("bezpecnost.devNoveZar")}</b></span><Prep on={hodinNovehoZariadenia() > 0} /></button>)}
      <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>{t("bezpecnost.kontakt.ozn1")} <b style={{ color: "var(--ink)" }}>{t("bezpecnost.nebolSom")}</b>{t("bezpecnost.kontakt.ozn2")}</div>
      <div style={karta}>
        <button type="button" onClick={() => toast(t("bezpecnost.pribudne"))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 58, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
          <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t("bezpecnost.kluc")}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{t("bezpecnost.klucS")}</span></span><span style={{ color: "var(--ink3)", display: "flex" }}><Ik d={IK.sipka} s={16} w={2.4} /></span></button>
      </div>
      {zmena && <ZmenaHarok co={zmena} kontakt={k} onClose={() => setZmena(null)} onHotovo={(z) => { const n = { ...k, ...z }; setK(n); try { localStorage.setItem(KLUC_KONTAKT, JSON.stringify(n)); } catch { /* LS */ } }} />}
    </ObrazovkaSprava>);
}

function ZmenaHarok({ co, kontakt, onClose, onHotovo }: { co: "e" | "t" | "h"; kontakt: Kontakt; onClose: () => void; onHotovo: (z: Partial<Kontakt>) => void }) {
  const t = useT();
  const [krok, setKrok] = useState<0 | 1 | 2 | 3>(co === "h" ? 1 : 0);
  const [ov, setOv] = useState<null | "bio" | "sms" | "mail" | "kluc">(null);
  const [overene, setOverene] = useState<string | null>(null);
  const [v, setV] = useState("");
  const [h0, setH0] = useState("");
  const [h1, setH1] = useState("");
  const [bezStareho, setBezStareho] = useState(false);
  const [kod, setKod] = useState("");
  const zamok = co !== "h" && hodinNovehoZariadenia() > 0;
  const titul = t(`bezpecnost.zmena.${co}`);
  const SP: [NonNullable<typeof ov>, string, string, string][] = ([["bio", t("bezpecnost.sp.bio"), t("bezpecnost.sp.bioS"), IK.tvar], ["sms", t("bezpecnost.sp.sms"), kontakt.tel ? t("bezpecnost.sp.smsNa", { tel: maskuj(kontakt.tel, "t") }) : t("bezpecnost.sp.smsTeraz"), IK.telefon], ["mail", t("bezpecnost.sp.mail"), kontakt.email ? maskuj(kontakt.email, "e") : t("bezpecnost.sp.mailTeraz"), IK.mail], ["kluc", t("bezpecnost.kluc"), t("bezpecnost.sp.klucS"), IK.kluc]] as [NonNullable<typeof ov>, string, string, string][])
    .filter(([k]) => !(co === "t" && k === "sms") && !(co === "e" && k === "mail"));
  const sila = (h1.length >= 8 ? 1 : 0) + (/[A-Z]/.test(h1) && /[a-z]/.test(h1) ? 1 : 0) + (/\d/.test(h1) ? 1 : 0) + (/[^A-Za-z0-9]/.test(h1) || h1.length >= 12 ? 1 : 0);
  const ok = co === "h" ? (bezStareho || h0.length >= 4) && sila >= 3 : co === "e" ? /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v.trim()) : v.replace(/\D/g, "").length >= 9;
  const over = async () => {
    if (!ov) return;
    if (ov === "kluc" || ov === "bio") {
      // WebAuthn (passkey / tvár / odtlačok) — kľúč zaregistruje server; bez neho appka overenie len ukáže
      if (!window.PublicKeyCredential) { toast(t("bezpecnost.prehliadac")); return; }
    }
    setOverene(t(`bezpecnost.overene.${ov}`));
    setKrok(1);
  };
  const cil = co === "h" ? kontakt.email : v.trim();
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{titul}</span>}>
      {zamok ? <Blokacia24h /> : <>
        {krok === 0 && <>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{t("bezpecnost.zmena.najprv")}</div>
          <div role="radiogroup" aria-label={t("bezpecnost.zmena.sposob")} style={{ display: "flex", flexDirection: "column", gap: 6 }}>{SP.map(([k, l, s, d]) => <Volba key={k} on={ov === k} onClick={() => setOv(k)} t={l} s={s} ikona={d} />)}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>{t("bezpecnost.zmena.nemas")} <button type="button" onClick={() => toast(t("bezpecnost.zmena.podporaToast"))} style={{ border: "none", background: "transparent", padding: "8px 0", fontWeight: 800, color: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>{t("bezpecnost.zmena.obnovit")}</button> {t("bezpecnost.zmena.obnovitS")}</div>
          <button type="button" onClick={over} aria-disabled={!ov} style={{ ...hlavne, opacity: ov ? 1 : 0.45 }}>{ov === "bio" ? t("bezpecnost.overitTvarou") : ov === "kluc" ? t("bezpecnost.pouzitKluc") : t("bezpecnost.poslatKod")}</button>
        </>}
        {krok === 1 && <>
          {overene && <div role="status" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, fontWeight: 700, color: "var(--gInk)" }}><Ik d={IK.fajka} s={16} w={2.6} />{t("bezpecnost.zmena.overene", { ako: overene, co: t(co === "e" ? "bezpecnost.zmena.noveE" : co === "t" ? "bezpecnost.zmena.noveT" : "bezpecnost.zmena.noveH") })}</div>}
          {co === "h" ? <>
            {!bezStareho && <>
              <input type="password" value={h0} onChange={(e) => setH0(e.target.value)} placeholder={t("bezpecnost.terajsieHeslo")} aria-label={t("bezpecnost.terajsieHeslo")} autoComplete="current-password" style={pole} />
              <button type="button" onClick={() => { setBezStareho(true); setKrok(0); }} style={{ alignSelf: "flex-start", border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "8px 0", fontFamily: "inherit" }}>{t("bezpecnost.nepamatam")}</button>
            </>}
            <input type="password" value={h1} onChange={(e) => setH1(e.target.value)} placeholder={t("bezpecnost.noveHeslo")} aria-label={t("bezpecnost.noveHeslo")} autoComplete="new-password" style={pole} />
            <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>{[0, 1, 2, 3].map((i) => <span key={i} style={{ height: 5, borderRadius: 3, background: i < sila ? (sila >= 3 ? "var(--green)" : "var(--gold)") : "var(--pillBd)", transition: "background .2s ease" }} />)}</div>
            <div aria-live="polite" style={{ fontSize: 13, color: "var(--ink3)" }}>{!h1 ? t("bezpecnost.heslo.pravidla") : sila >= 3 ? t("bezpecnost.heslo.silne") : t("bezpecnost.heslo.slabe")}</div>
          </> : <>
            <input value={v} onChange={(e) => setV(e.target.value)} placeholder={co === "e" ? t("bezpecnost.novyEmail") : "+421 9xx xxx xxx"} aria-label={co === "e" ? t("bezpecnost.novyEmail") : t("bezpecnost.noveCislo")} inputMode={co === "e" ? "email" : "tel"} autoComplete={co === "e" ? "email" : "tel"} style={pole} />
            <div style={{ fontSize: 13, color: "var(--ink3)" }}>{co === "e" ? t("bezpecnost.zmena.kodEmail") : t("bezpecnost.zmena.kodSms")}</div>
          </>}
          <button type="button" onClick={() => ok && (setKod(""), setKrok(2))} aria-disabled={!ok} style={{ ...hlavne, opacity: ok ? 1 : 0.45 }}>{co === "h" ? t("sp.pokracovat") : t("bezpecnost.poslatKod")}</button>
        </>}
        {krok === 2 && <>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{co === "t" ? t("bezpecnost.zmena.poslaliSms", { kam: v.trim() }) : t("bezpecnost.zmena.poslali", { kam: cil })}</div>
          <input value={kod} onChange={(e) => setKod(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label={t("bezpecnost.kod")} placeholder="• • • • • •" style={{ ...pole, fontSize: 24, letterSpacing: ".35em", textAlign: "center", fontVariantNumeric: "tabular-nums" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "var(--ink3)" }}><span>{t("bezpecnost.plati")}</span><button type="button" onClick={() => toast(t("bezpecnost.kodZnova"))} style={{ border: "none", background: "transparent", fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "10px 0", fontFamily: "inherit", fontSize: 13.5 }}>{t("bezpecnost.poslatZnova")}</button></div>
          <button type="button" onClick={() => { if (kod.length !== 6) return; onHotovo(co === "e" ? { email: v.trim() } : co === "t" ? { tel: v.trim() } : { hesloZmenene: Date.now() }); if (co === "h") odhlasOstatne(); setKrok(3); }} aria-disabled={kod.length !== 6} style={{ ...hlavne, opacity: kod.length === 6 ? 1 : 0.45 }}>{t("bezpecnost.potvrdit")}</button>
          {co !== "h" && <div style={{ fontSize: 13, color: "var(--ink3)" }}>{co === "e" ? t("bezpecnost.zmena.staryE") : t("bezpecnost.zmena.staryT")}</div>}
        </>}
        {krok === 3 && <>
          <Hotovo>{co === "h" ? t("bezpecnost.zmena.hotovoH") : co === "e" ? t("bezpecnost.zmena.hotovoE") : t("bezpecnost.zmena.hotovoT")}</Hotovo>
          <button type="button" onClick={onClose} style={vedlajsie}>{t("sp.hotovo")}</button>
        </>}
      </>}
    </Harok>);
}

// ======================= 2c · ZABLOKOVANÍ ĽUDIA =======================
export function ZablokovaniLudia({ onBack }: { onBack: () => void }) {
  const t = useT();
  useZmenyBlokovania();
  const [sprava, setSprava] = useState("");
  const zoz = zablokovani();
  return (
    <ObrazovkaSprava titul={t("nastavenia.blokovani")} onBack={onBack}>
      {zoz.length ? <div style={karta}>
        {zoz.map((z, i) => (
          <div key={z.meno} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--pillBd)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flex: "none" }}>{z.ini}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{z.meno}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{t("bezpecnost.blok.kedy", { datum: z.datum })}</span></span>
            <button type="button" onClick={() => { odblokuj(z.meno); setSprava(t("bezpecnost.blok.odblokovany", { meno: z.meno })); }} style={{ flex: "none", minHeight: 44, padding: "0 12px", borderRadius: 11, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 14, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>{t("bezpecnost.blok.odblokovat")}</button>
          </div>))}
      </div> : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "28px 20px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", textAlign: "center" }}>
          <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.fajka} s={22} w={2.4} /></span>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{t("bezpecnost.blok.nikoho")}</span>
        </div>)}
      {sprava && <div role="status" style={{ fontSize: 14, fontWeight: 700, color: "var(--gInk)", padding: "0 2px" }}>{sprava}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        <span style={{ fontSize: 15.5, fontWeight: 800 }}>{t("bezpecnost.blok.co")}</span>
        {[1, 2, 3, 4].map((i) => <Bod key={i}>{t(`bezpecnost.blok.b${i}`)}</Bod>)}
        <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)", marginTop: 2 }}>{t("bezpecnost.blok.ako")}</span>
      </div>
    </ObrazovkaSprava>);
}

// ======================= 2e · SÚHLASY + 2f DETAIL =======================
const VERZIA_PODMIENOK = "1.2";
type Nep = "pers" | "stat" | "news" | "part";
const NEPOVINNE: Nep[] = ["pers", "stat", "news", "part"]; // bezpecnost.nep.{k} / {k}S

function usePovolenie(meno: "geolocation" | "camera"): string {
  const t = useT();
  const [s, setS] = useState("bezpecnost.povol.zistujem");
  useEffect(() => {
    let zrus = false;
    const p = navigator.permissions?.query?.({ name: meno as PermissionName });
    if (!p) { setS("bezpecnost.povol.pri"); return; }
    p.then((r) => { if (!zrus) setS(r.state === "granted" ? "bezpecnost.povolene" : r.state === "denied" ? "bezpecnost.nepovolene" : "bezpecnost.povol.opytame"); }).catch(() => !zrus && setS("bezpecnost.povol.pri"));
    return () => { zrus = true; };
  }, [meno]);
  return t(s);
}

export function Suhlasy({ onBack }: { onBack: () => void }) {
  const t = useT();
  const n = useNastaveniaAppky();
  const [detail, setDetail] = useState<null | "pod" | "ud">(null);
  const poloha = usePovolenie("geolocation"), kamera = usePovolenie("camera");
  const prepni = (k: Nep) => {
    const s = n.suhlasy, on = !s[k], d = new Date();
    zmenNastavenia({ suhlasy: { ...s, [k]: on, zaznam: [...s.zaznam, { k, on, cas: d.toISOString(), verzia: VERZIA_PODMIENOK }] } });
  };
  const sys = () => toast(t("bezpecnost.sysToast"));
  const riadok = (nazov: string, s: string, d: string, pravo: ReactNode, onClick: () => void, i: number, role?: { switch: boolean }) => (
    <button type="button" key={nazov} onClick={onClick} role={role ? "switch" : undefined} aria-checked={role ? role.switch : undefined}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{nazov}</span><span style={{ display: "block", fontSize: 13, lineHeight: 1.45, color: "var(--ink3)", marginTop: 1 }}>{s}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink4)", marginTop: 3 }}>{d}</span></span>
      {pravo}</button>);
  const odk = (l: string) => <span style={{ flex: "none", fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{l}</span>;
  return (
    <ObrazovkaSprava titul={t("nastavenia.suhlasy")} onBack={onBack}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>{t("bezpecnost.suhl.intro")}</div>
      <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.povinne")}</h2><div style={karta}>
        {riadok(t("nastavenia.podmienky"), t("bezpecnost.podmienkyS"), t("bezpecnost.odsuhlaseneV", { datum: t.datum(ODSUHLASENE, true), v: VERZIA_PODMIENOK }), odk(t("bezpecnost.zobrazit")), () => setDetail("pod"), 0)}
        {riadok(t("bezpecnost.spracovanie"), t("bezpecnost.spracovanieS"), t("bezpecnost.odsuhlasene", { datum: t.datum(ODSUHLASENE, true) }), odk(t("bezpecnost.zobrazit")), () => setDetail("ud"), 1)}
      </div></div>
      <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.povolenia")}</h2><div style={karta}>
        {riadok(t("bezpecnost.poloha"), t("bezpecnost.polohaS"), poloha, odk(t("bezpecnost.vTelefone")), sys, 0)}
        {riadok(t("bezpecnost.foto"), t("bezpecnost.fotoS"), kamera, odk(t("bezpecnost.vTelefone")), sys, 1)}
        {riadok(t("bezpecnost.kontakty"), t("bezpecnost.kontaktyS"), n.kontakty ? t("bezpecnost.povolene") : t("bezpecnost.nepovolene"), odk(t("bezpecnost.vTelefone")), sys, 2)}
      </div></div>
      <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.nepovinne")}</h2><div style={karta}>
        {NEPOVINNE.map((k, i) => riadok(t(`bezpecnost.nep.${k}`), t(`bezpecnost.nep.${k}S`), n.suhlasy[k] ? t("bezpecnost.zapnute") : t("bezpecnost.vypnute"), <Prep on={n.suhlasy[k]} />, () => prepni(k), i, { switch: n.suhlasy[k] }))}
      </div></div>
      <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>{t("bezpecnost.suhl.pozn1")} <b style={{ color: "var(--ink)" }}>{t("nastavenia.udaje")}</b>{t("bezpecnost.suhl.pozn2")}</div>
      {detail && <DetailSuhlasu typ={detail} onBack={() => setDetail(null)} />}
    </ObrazovkaSprava>);
}

// znenie je NÁVRH z prototypu — potvrdí právnik; neskôr sa načíta zo servera podľa verzie
const ODSUHLASENE = new Date(2026, 8, 3);
const V_SKRATKE = [1, 2, 3, 4, 5]; // bezpecnost.vs.{i}
const KAPITOLY = [1, 2, 3, 4, 5, 6]; // bezpecnost.kap.{i} / {i}x
const UDAJE = [1, 2, 3, 4, 5]; // bezpecnost.ud.{i} / {i}p / {i}d
const PRAVA = [1, 2, 3, 4]; // bezpecnost.pr.{i} / {i}s

export function DetailSuhlasu({ typ, onBack }: { typ: "pod" | "ud"; onBack: () => void }) {
  const t = useT();
  const [kap, setKap] = useState<number | null>(null);
  const titul = typ === "pod" ? t("nastavenia.podmienky") : t("bezpecnost.detail.ud");
  const pdf = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    const telo = typ === "pod" ? KAPITOLY.map((i) => `<h3>${esc(t(`bezpecnost.kap.${i}`))}</h3><p>${esc(t(`bezpecnost.kap.${i}x`))}</p>`).join("") : UDAJE.map((i) => `<h3>${esc(t(`bezpecnost.ud.${i}`))}</h3><p>${esc(t(`bezpecnost.ud.${i}p`))} · ${esc(t(`bezpecnost.ud.${i}d`))}</p>`).join("");
    w.document.write(`<!doctype html><html lang="${t.jazyk}"><head><meta charset="utf-8"><title>${titul}</title><style>body{font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:28px;color:#1D211B;line-height:1.5}</style></head><body><h1>DEEDGOOD · ${titul}</h1><p>${t("bezpecnost.verzia", { v: VERZIA_PODMIENOK })}</p>${telo}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };
  return (
    <ObrazovkaSprava titul={titul} onBack={onBack} z={140}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 14, fontWeight: 700, color: "var(--gInk)" }}><Ik d={IK.fajka} w={2.6} />{typ === "pod" ? t("bezpecnost.detail.verziaOds", { v: VERZIA_PODMIENOK, datum: t.datum(ODSUHLASENE, true) }) : t("bezpecnost.detail.ods", { datum: t.datum(ODSUHLASENE, true) })}</div>
      {typ === "pod" ? <>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.vSkratke")}</h2><div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 18px", borderRadius: 20, background: "var(--d-card, var(--card))", border: "1px solid var(--sek-bBd)", boxShadow: "var(--d-hl, none)" }}>{V_SKRATKE.map((i) => <Bod key={i}>{t(`bezpecnost.vs.${i}`)}</Bod>)}</div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.zmenilo", { v: VERZIA_PODMIENOK })}</h2><div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{t("bezpecnost.zmenilo.text")}</div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.celeZnenie")}</h2><div style={karta}>
          {KAPITOLY.map((c, i) => { const o = kap === i; return (
            <div key={c} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <button type="button" aria-expanded={o} onClick={() => setKap(o ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 52, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{t(`bezpecnost.kap.${c}`)}</span><span aria-hidden="true" style={{ display: "flex", color: "var(--ink3)", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d={IK.dole} s={15} w={2.4} /></span></button>
              {o && <div style={{ padding: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "var(--ink2)" }}>{t(`bezpecnost.kap.${c}x`)}</div>}
            </div>); })}
        </div></div>
      </> : <>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.coUkladame")}</h2><div style={karta}>
          {UDAJE.map((c, i) => (
            <div key={c} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>{t(`bezpecnost.ud.${c}`)}</span><span style={{ flex: "none", fontSize: 12.5, fontWeight: 700, color: "var(--gold)", textAlign: "right", maxWidth: "45%" }}>{t(`bezpecnost.ud.${c}d`)}</span></div>
              <div style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", marginTop: 2 }}>{t(`bezpecnost.ud.${c}p`)}</div>
            </div>))}
        </div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.ktoVidi")}</h2><div style={{ padding: "14px 18px", borderRadius: 20, background: "var(--d-card, var(--card))", border: "1px solid var(--sek-bBd)", boxShadow: "var(--d-hl, none)", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>{t("bezpecnost.ktoVidi.a")} <b style={{ color: "var(--ink)" }}>{t("bezpecnost.ktoVidi.b")}</b></div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.esg")}</h2><div style={{ padding: "14px 18px", borderRadius: 20, background: "var(--d-card, var(--card))", border: "1px solid var(--sek-bBd)", boxShadow: "var(--d-hl, none)", fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>{t("bezpecnost.esg.a")} <b style={{ color: "var(--ink)" }}>{t("bezpecnost.esg.b")}</b> {t("bezpecnost.esg.c")}</div></div>
        <div><h2 style={{ ...lbl, padding: "0 2px 6px" }}>{t("bezpecnost.prava")}</h2><div style={karta}>
          {PRAVA.map((c, i) => (
            <button type="button" key={c} onClick={() => { onBack(); toast(t("bezpecnost.najdes", { s: t(`bezpecnost.pr.${c}s`) })); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 56, border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t(`bezpecnost.pr.${c}`)}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{t(`bezpecnost.pr.${c}s`)}</span></span><span style={{ color: "var(--ink3)", display: "flex" }}><Ik d={IK.sipka} s={16} w={2.4} /></span></button>))}
        </div></div>
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>{t("bezpecnost.otazky")}</b> {t("bezpecnost.otazky.text")}</div>
      </>}
      <button type="button" onClick={pdf} style={{ ...vedlajsie, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Ik d={IK.pdf} s={17} />{t("bezpecnost.stiahnutPdf")}</button>
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
