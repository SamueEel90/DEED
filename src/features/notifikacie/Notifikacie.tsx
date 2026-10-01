// KARTA 23 · Oznámenia — zvonček (zoznam) + nastavenia oznámení.
// Zoznam: Späť (vráti tam, odkiaľ si prišiel) · filtre s počtom nových (zelený) · skupiny podľa dňa ·
// akcie priamo v ozname · agregácia malých darov do súhrnu (povinná).
// Nastavenia: hlavný vypínač · každá položka V APPKE a NA DISPLEJ · zbalené kategórie · strop 3 denne ·
// večerný súhrn · tichý čas. Tá istá obrazovka je aj v Nastavenia → Oznámenia (jeden komponent, dva vstupy).
import { sZnackou } from "@/components/DeedZnacka";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Notifikacia, NotifAkciaKod, NotifIkona, NotifTon } from "@/types";
import { useNotifikacie } from "@/data";
import { useVrstva } from "@/lib/urlnav";
import { SpatTlacidlo } from "@/components/cesta";
import { useNastaveniaAppky, zmenNastavenia, nacitajNastavenia } from "@/lib/nastaveniaAppky";
import { useOznamyDarcom, oznacPrecitany, oznacVsetkyPrecitane, type OznamDarcovi } from "@/lib/oznamyDarcom";
import { najdiZbierku } from "@/lib/zbierky";
import { relCas } from "@/lib/darcovia";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { OznamDarcoviSheet } from "./OznamDarcovi";
import { KATEGORIE, NA_DISPLEJ_VYP } from "./mock";
import { NastKarta, IkonaSek, IK, sekFarba, oddelovac, type Sek } from "@/features/profil/nastUi";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useVazbyOsoby } from "@/lib/zamestnanci";
import { dataFirmy, useMojaFirma } from "@/lib/mojaFirma";
import "@/styles/platba.css";

export { NOTIFY } from "./mock";

const IKONA: Record<NotifIkona, string> = {
  ok: "M20 6 9 17l-5-5", srd: "M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z", otaz: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  stit: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", ret: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  lud: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9", kal: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  dok: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 14l2 2 4-4", ciel: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  sum: "M4 20V10M10 20V4M16 20v-7M22 20H2", deed: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z", namiet: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
};
const TON: Record<NotifTon, [string, string]> = { g: ["var(--gSoft)", "var(--green)"], b: ["var(--bSoft)", "var(--blue)"], gold: ["var(--goldBg)", "var(--gold)"] };
const AKCIA: Record<NotifAkciaKod, [string, boolean]> = { odpovedat: ["Odpovedať", true], bol: ["Bol som pri tom", true], nebol: ["Nebol", false], prijat: ["Prijať", true], neskor: ["Neskôr", false], otvorit: ["Otvoriť", true] };
const FILTRE: [Notifikacia["kat"] | "vsetko", string][] = [["vsetko", "Všetko"], ["skutky", "Skutky"], ["skupina", "Skupina"], ["penaze", "Peniaze"], ["zbierky", "Zbierky"], ["ludia", "Ľudia"], ["firma", "Zamestnávateľ"]];
const Ik = ({ d, s = 19, w = 2 }: { d: string; s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const Prep = ({ on, male }: { on: boolean; male?: boolean }) => {
  const w = male ? 44 : 48, h = male ? 26 : 28, k = male ? 20 : 22;
  return <span aria-hidden="true" style={{ width: w, height: h, borderRadius: h / 2, background: on ? "var(--green)" : "var(--d-trackOff, #CFC9BC)", position: "relative", flex: "none", transition: "background .2s ease", display: "block" }}>
    <span style={{ position: "absolute", top: 3, left: 3, width: k, height: k, borderRadius: "50%", background: on ? "#fff" : "var(--d-knobOff, #fff)", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transform: on ? `translateX(${w - k - 6}px)` : "none", transition: "transform .2s ease" }} /></span>;
};

/** oznamy darcom (doložená zbierka, novinka) → riadok zoznamu; id záporné = oznam darcovi */
function oznamyNaRiadky(oz: OznamDarcovi[]): Notifikacia[] {
  return oz.map((o, i) => {
    const z = najdiZbierku(o.zbierkaId);
    const org = z?.ziadatel.meno ?? "Charita";
    const d = new Date(o.datum), dni = Math.round((new Date(new Date().toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
    const den = dni <= 0 ? "Dnes" : dni === 1 ? "Včera" : `${d.getDate()}. ${d.getMonth() + 1}.`;
    return o.typ === "dolozene"
      ? { id: -(i + 1), kat: "zbierky", ikona: "dok", ton: "g", den, titul: `${org} doložila tvoj dar`, text: `${z?.nazov ?? "Zbierka"} · pozri, na čo išli peniaze`, cas: relCas(Date.parse(o.datum)), nove: !o.precitane }
      : { id: -(i + 1), kat: "zbierky", ikona: "deed", ton: "b", den, titul: `Novinka: ${z?.nazov ?? "zbierka"}`, text: o.text ?? "", cas: relCas(Date.parse(o.datum)), nove: !o.precitane };
  });
}

// prečítané / vybavené oznamy (lokálne, kým nie je Supabase)
const KLUC_PREC = "deed.oznamy.precitane";
const nacitajPrec = (): number[] => { try { return JSON.parse(localStorage.getItem(KLUC_PREC) || "[]"); } catch { return []; } };
const ulozPrec = (x: number[]) => { try { localStorage.setItem(KLUC_PREC, JSON.stringify(x)); } catch { /* LS */ } };

// ============================================================
// ZVONČEK — tlačidlo so zeleným počtom + celá obrazovka Oznámenia
// ============================================================
export function Zvoncek({ color = "var(--c-textSec)", toast }: { color?: string; toast?: (msg: string) => void }) {
  const { data: zakladne = [] } = useNotifikacie();
  const oznamy = useOznamyDarcom();
  const [otvor, setOtvor] = useState(false);
  const [prec, setPrec] = useState<number[]>(nacitajPrec);
  const [detail, setDetail] = useState<OznamDarcovi | null>(null);
  const tlacidlo = useRef<HTMLButtonElement>(null);
  // karta 24 · 2i: oznámenia od firmy chodia aj sem (filter Zamestnávateľ) — len keď je user prepojený
  const ja = usePouzivatel();
  const firmy = useVazbyOsoby(ja.celeMeno).filter((v) => v.stav === "potvrdeny");
  const mf = useMojaFirma();
  const odFirmy: Notifikacia[] = firmy.flatMap((v, fi) => dataFirmy(v.firma).oznamy.filter((o) => !mf.vybavene.includes(o.id)).map((o, i) => ({
    id: 900000 + fi * 50 + i, kat: "firma" as const, den: "Dnes", cas: v.firma, ikona: o.typ === "kontrola" ? "otaz" as const : o.typ === "akcia" ? "kal" as const : "srd" as const,
    ton: o.typ === "kontrola" ? "gold" as const : "g" as const, titul: o.t, text: `${v.firma} · ${o.s}`, nove: o.typ === "kontrola" })));
  const vsetky = [...oznamyNaRiadky(oznamy), ...odFirmy, ...zakladne];
  const nove = vsetky.filter((n) => n.nove && !prec.includes(n.id)).length;
  const oznac = (id: number) => setPrec((p) => { const n = p.includes(id) ? p : [...p, id]; ulozPrec(n); return n; });
  const zavri = () => { setOtvor(false); requestAnimationFrame(() => tlacidlo.current?.focus()); };
  useVrstva(otvor, () => setOtvor(false));
  return (
    <>
      <button ref={tlacidlo} type="button" onClick={() => setOtvor(true)} aria-label={nove > 0 ? `Oznámenia, ${nove} nové` : "Oznámenia"}
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, margin: -10, border: "none", background: "transparent", cursor: "pointer", color }}>
        <Ik d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" s={20} />
        {nove > 0 && <span aria-hidden="true" style={{ position: "absolute", top: 5, right: 4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--a-green)", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px var(--c-bg)" }}>{nove}</span>}
      </button>
      {otvor && <OznameniaObrazovka zoznam={vsetky} prec={prec} onOznac={oznac}
        onPrecitaj={() => { const n = vsetky.map((x) => x.id); setPrec(n); ulozPrec(n); oznacVsetkyPrecitane(); }}
        onOznamDarcovi={(id) => { const o = oznamy[-id - 1]; if (!o) return; oznacPrecitany(o.id); zavri(); setDetail(o); }}
        onClose={zavri} toast={toast} />}
      {detail && <OznamDarcoviSheet zbierkaId={detail.zbierkaId} typ={detail.typ} text={detail.text} onClose={() => setDetail(null)} />}
    </>
  );
}

function OznameniaObrazovka({ zoznam, prec, onOznac, onPrecitaj, onOznamDarcovi, onClose, toast }: {
  zoznam: Notifikacia[]; prec: number[]; onOznac: (id: number) => void; onPrecitaj: () => void; onOznamDarcovi: (id: number) => void; onClose: () => void; toast?: (m: string) => void;
}) {
  const [f, setF] = useState<Notifikacia["kat"] | "vsetko">("vsetko");
  const [nast, setNast] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.focus(); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key !== "Escape") return; if (nast) setNast(false); else onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  const jeNovy = (n: Notifikacia) => !!n.nove && !prec.includes(n.id);
  const L = zoznam.filter((n) => f === "vsetko" || n.kat === f);
  const akcia = (n: Notifikacia, a: NotifAkciaKod) => {
    onOznac(n.id);
    if (a === "odpovedat" && n.skutok) { onClose(); otvorPridatSkutok({ otazky: n.skutok.otazky, skutok: { nazov: n.skutok.nazov, popis: n.skutok.popis } }); }
    else if (a === "bol") toast?.("Potvrdené. Skutok sa ti pripíše do Moje skutky.");
    else if (a === "nebol") toast?.("Dobre, do skutku ťa nepridáme.");
    else if (a === "prijat") toast?.("Ste priatelia");
    else if (a === "otvorit") { onClose(); toast?.("Ohlásený skutok nájdeš v Moje skutky"); }
  };
  return createPortal(
    <div ref={panel} tabIndex={-1} className="deed-platba" role="dialog" aria-modal="true" aria-label="Oznámenia"
      style={{ position: "fixed", inset: 0, zIndex: 130, background: "var(--bg)", color: "var(--ink)", fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", overflow: "hidden" }}>
      <div style={{ height: "100%", maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "max(6px, env(safe-area-inset-top)) 16px 0", minHeight: 60 }}>
          <SpatTlacidlo onClick={onClose} />
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Oznámenia</h1>
          {zoznam.some(jeNovy) && <button type="button" onClick={onPrecitaj} style={{ border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "12px 4px", whiteSpace: "nowrap", fontFamily: "inherit" }}>Prečítané</button>}
          <button type="button" onClick={() => setNast(true)} aria-label="Nastavenia oznámení" style={{ marginLeft: "auto", width: 44, height: 44, border: "none", borderRadius: 14, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink2)", flex: "none" }}>
            <Ik d="M4 7h10M18 7h2M4 17h4M12 17h8M16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4" s={20} /></button>
        </div>
        <div role="group" aria-label="Filter oznámení" style={{ flex: "none", display: "flex", gap: 6, padding: "4px 16px 10px", overflowX: "auto", scrollbarWidth: "none" }}>
          {FILTRE.filter(([k]) => k !== "firma" || zoznam.some((x) => x.kat === "firma")).map(([k, t]) => { const on = f === k, n = zoznam.filter((x) => (k === "vsetko" || x.kat === k) && jeNovy(x)).length; return (
            <button type="button" key={k} aria-pressed={on} onClick={() => setF(k)} aria-label={n && k !== "vsetko" ? `${t}, ${n} nové` : t}
              style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, height: 44, padding: "0 14px", borderRadius: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: on ? "var(--ink)" : "var(--card)", border: `1.5px solid ${on ? "var(--ink)" : "var(--cardBd)"}`, color: on ? "var(--bg)" : "var(--ink2)" }}>
              {t}{n > 0 && k !== "vsetko" && <span aria-hidden="true" style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--green)", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>}</button>); })}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}><div aria-live="polite" style={{ padding: "0 16px max(30px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 6 }}>
          {L.map((n, i) => {
            const nv = jeNovy(n), [ibg, ic] = TON[n.ton], vybav = n.akcie && !prec.includes(n.id);
            const obsah: ReactNode = <>
              <span aria-hidden="true" style={{ position: "relative", width: 40, height: 40, borderRadius: 12, background: ibg, color: ic, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IKONA[n.ikona]} />
                {nv && <span style={{ position: "absolute", top: -3, right: -3, width: 11, height: 11, borderRadius: "50%", background: "var(--green)", border: "2px solid var(--bg)" }} />}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 15, fontWeight: nv ? 800 : 600, lineHeight: 1.3, flex: 1, minWidth: 0 }}>{nv && <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Nové: </span>}{n.titul}</span><span style={{ flex: "none", fontSize: 12.5, color: "var(--ink4)", whiteSpace: "nowrap" }}>{n.cas}</span></span>
                <span style={{ display: "block", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", marginTop: 2 }}>{n.text}</span>
              </span></>;
            const riadokSt = { display: "flex", gap: 12, alignItems: "flex-start", padding: 12, borderRadius: 16, background: nv ? "var(--card)" : "transparent", border: `1px solid ${nv ? "var(--gBd)" : "transparent"}`, color: "var(--ink)", textAlign: "left" as const, fontFamily: "inherit", width: "100%" };
            return (
              <div key={n.id}>
                {(i === 0 || L[i - 1].den !== n.den) && <h2 style={{ margin: 0, fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "12px 2px 4px" }}>{n.den}</h2>}
                {vybav ? (
                  <div style={riadokSt}>{obsah}</div>
                ) : (
                  <button type="button" onClick={() => (n.id < 0 ? onOznamDarcovi(n.id) : onOznac(n.id))} style={{ ...riadokSt, cursor: "pointer" }}>{obsah}</button>
                )}
                {vybav && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 12px 10px 64px", marginTop: -4 }}>
                  {n.akcie!.map((a) => { const [t, hl] = AKCIA[a]; return (
                    <button type="button" key={a} onClick={() => akcia(n, a)} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", border: hl ? "none" : "1px solid var(--cardBd)", background: hl ? "var(--green)" : "var(--btn)", color: hl ? "#fff" : "var(--ink)" }}>{t}</button>); })}
                </div>}
              </div>);
          })}
          {!L.length && <div style={{ padding: "30px 10px", textAlign: "center", fontSize: 14.5, color: "var(--ink3)" }}>Tu zatiaľ nič nie je.</div>}
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink4)", padding: "16px 0 4px" }}>To je všetko. Staršie oznámenia sa po 90 dňoch archivujú.</div>
        </div></div>
      </div>
      {/* nastavenia prichádzajú sprava */}
      <div aria-hidden={!nast} style={{ position: "absolute", inset: 0, background: "var(--bg)", transform: nast ? "none" : "translateX(105%)", transition: "transform .45s cubic-bezier(.45,0,.25,1)", visibility: nast ? "visible" : "hidden" }}>
        <div style={{ height: "100%", maxWidth: 640, margin: "0 auto" }}><NastaveniaOznameni onBack={() => setNast(false)} /></div>
      </div>
    </div>, document.body);
}

// ============================================================
// NASTAVENIA OZNÁMENÍ — jeden komponent pre zvonček aj Nastavenia → Oznámenia
// ============================================================
const stavPolozky = (zmeny: Record<string, { a: boolean; p: boolean }>, t: string) => zmeny[t] ?? { a: true, p: !NA_DISPLEJ_VYP.includes(t) };

/** karta 25 · kategórie s ikonou a popisom, malými písmenami, farba podľa kategórie */
const KAT_VZHLAD: Record<string, { k: Sek; d: string; t: string; s: string }> = {
  "MOJE SKUTKY": { k: "g", d: IK.check, t: "Moje skutky", s: "overenie, námietky, karma" },
  "SKUPINA A AKCIE": { k: "b", d: IK.users, t: "Skupina a akcie", s: "pozvánky, začiatok a koniec akcie" },
  "PENIAZE A PLATBY": { k: "o", d: IK.wallet, t: "Peniaze a platby", s: "dary, prijaté peniaze, doklady" },
  "ZBIERKY": { k: "r", d: IK.heart, t: "Zbierky", s: "míľniky, naplnenie, poďakovania" },
  "ĽUDIA A PROFIL": { k: "b", d: IK.user, t: "Ľudia a profil", s: "priatelia, sledovanie, štít" },
  "OD DEED+": { k: "g", d: IK.leaf, t: "Od DEED+", s: "novinky a dôležité zmeny" },
};

export function NastaveniaOznameni({ onBack }: { onBack: () => void }) {
  const n = useNastaveniaAppky();
  const oz = n.oznamy;
  const [otv, setOtv] = useState<string[]>([]);
  const zmenOz = (z: Partial<typeof oz>) => zmenNastavenia({ oznamy: { ...nacitajNastavenia().oznamy, ...z } });
  const prepni = (t: string, k: "a" | "p") => {
    if (!oz.master) return;
    const o = { ...stavPolozky(oz.zmeny, t) };
    o[k] = !o[k];
    if (k === "a" && !o.a) o.p = false;  // vypnúť V appke vypne aj Na displej
    if (k === "p" && o.p) o.a = true;    // zapnúť Na displej zapne aj V appke
    zmenOz({ zmeny: { ...oz.zmeny, [t]: o } });
  };
  const HODINY_OD = ["21:00", "22:00", "23:00"], HODINY_DO = ["6:00", "7:00", "8:00"];
  const dalsi = (x: string[], v: string) => x[(x.indexOf(v) + 1) % x.length];
  const lbl = { margin: 0, padding: "0 6px 8px", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 800, letterSpacing: ".07em", color: "var(--d-ink3, var(--ink3))" } as const;
  const bodka = (k: Sek) => <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: sekFarba(k).c, flex: "none" }} />;
  const txt = (t: string, s: string) => <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{sZnackou(t)}</span>{s && <span style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--d-ink3, var(--ink3))", marginTop: 2 }}>{s}</span>}</span>;
  const riadokPrep = (d: string, t: string, s: string, on: boolean, onClick: () => void, prvy: boolean) => (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 68, padding: "12px 18px", borderTop: prvy ? "none" : oddelovac, borderLeft: "none", borderRight: "none", borderBottom: "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
      <IkonaSek d={d} k="o" />{txt(t, s)}<Prep on={on} /></button>);

  return (
    <div className="deed-platba" style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--d-ink, var(--ink))" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "max(6px, env(safe-area-inset-top)) 16px 0", minHeight: 60 }}>
        <SpatTlacidlo onClick={onBack} />
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Nastavenia oznámení</h1>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}><div style={{ padding: "6px 16px max(30px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 18 }}>
        <button type="button" role="switch" aria-checked={oz.master} onClick={() => zmenOz({ master: !oz.master })} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 74, padding: "16px 18px", borderRadius: 20, background: "var(--sek-gBg)", border: "1px solid var(--sek-gBd)", boxShadow: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
          <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 12, background: "var(--sek-g)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.bell} s={20} w={2.2} /></span>
          <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 16.5, fontWeight: 800 }}>Všetky oznámenia</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink2, var(--ink2))", marginTop: 2 }}>hlavný vypínač · SOS a bezpečnosť ostávajú vždy</span></span>
          <Prep on={oz.master} /></button>
        <div>
          <h2 style={lbl}>{bodka("o")}ČO CHCEŠ DOSTÁVAŤ</h2>
          <NastKarta k="o">
            {KATEGORIE.map((k, ki) => {
              const v = KAT_VZHLAD[k.hl] ?? { k: "o" as Sek, d: IK.bell, t: k.hl, s: "" };
              const f = sekFarba(v.k);
              const o = otv.includes(k.hl), zap = k.polozky.filter((t) => oz.master && stavPolozky(oz.zmeny, t).a).length;
              return (
                <div key={k.hl} style={{ borderTop: ki ? oddelovac : "none" }}>
                  <button type="button" aria-expanded={o} onClick={() => setOtv((x) => (o ? x.filter((y) => y !== k.hl) : [...x, k.hl]))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 66, padding: "12px 18px", border: "none", boxShadow: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "var(--d-ink, var(--ink))" }}>
                    <IkonaSek d={v.d} k={v.k} />{txt(v.t, v.s)}
                    <span style={{ padding: "4px 10px", borderRadius: 10, background: f.bg, color: f.c, fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums", flex: "none" }}>{zap} z {k.polozky.length}</span>
                    <span aria-hidden="true" style={{ display: "flex", color: "var(--d-ink3, var(--ink3))", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease", flex: "none" }}><Ik d="M6 9l6 6 6-6" s={16} w={2.4} /></span></button>
                  {o && <div className="pf-rise" style={{ padding: "0 18px 8px 70px", opacity: oz.master ? 1 : 0.4 }}>
                    <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 56px 56px", gap: "0 4px", padding: "2px 0 4px", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: "var(--d-ink3, var(--ink3))" }}><span /><span style={{ textAlign: "center" }}>V APPKE</span><span style={{ textAlign: "center" }}>NA DISPLEJ</span></div>
                    {k.polozky.map((t, i) => { const st = stavPolozky(oz.zmeny, t), a = oz.master && st.a, pu = oz.master && st.p; return (
                      <div key={t} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 56px 56px", gap: "0 4px", alignItems: "center", minHeight: 56, borderTop: i ? oddelovac : "none" }}>
                        <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{t}</span>{k.popisy[i] && <span style={{ display: "block", fontSize: 12.5, color: "var(--d-ink3, var(--ink3))" }}>{k.popisy[i]}</span>}</span>
                        <button type="button" role="switch" aria-checked={a} aria-label={`${t} v appke`} aria-disabled={!oz.master} onClick={() => prepni(t, "a")} style={{ justifySelf: "center", border: "none", boxShadow: "none", background: "transparent", padding: 9, margin: -9, cursor: oz.master ? "pointer" : "default" }}><Prep on={a} male /></button>
                        <button type="button" role="switch" aria-checked={pu} aria-label={`${t} na displej`} aria-disabled={!oz.master} onClick={() => prepni(t, "p")} style={{ justifySelf: "center", border: "none", boxShadow: "none", background: "transparent", padding: 9, margin: -9, cursor: oz.master ? "pointer" : "default" }}><Prep on={pu} male /></button>
                      </div>); })}
                  </div>}
                </div>);
            })}
          </NastKarta>
        </div>
        <div>
          <h2 style={lbl}>{bodka("o")}ABY ŤA TO NERUŠILO</h2>
          <NastKarta k="o">
            {riadokPrep(IK.phone, "Najviac 3 na displej denne", "okrem vecí, ktoré od teba niečo potrebujú, a bezpečnosti", oz.strop, () => zmenOz({ strop: !oz.strop }), true)}
            {riadokPrep(IK.clock, "Drobnosti raz denne o 19:00", "súhrn namiesto jednotlivých oznámení", oz.vecer, () => zmenOz({ vecer: !oz.vecer }), false)}
          </NastKarta>
        </div>
        <div>
          <h2 style={lbl}>{bodka("o")}TICHÝ ČAS</h2>
          <NastKarta k="o">
            {riadokPrep(IK.moon, "Nerušiť", "oznámenia prídu potichu, v appke ich uvidíš", n.tichyCas, () => zmenNastavenia({ tichyCas: !n.tichyCas }), true)}
            {n.tichyCas && <div style={{ padding: "0 18px 16px 70px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {([["Od", n.tichyOd, () => zmenNastavenia({ tichyOd: dalsi(HODINY_OD, n.tichyOd) })], ["Do", n.tichyDo, () => zmenNastavenia({ tichyDo: dalsi(HODINY_DO, n.tichyDo) })]] as const).map(([l, v, tap]) => (
                  <button type="button" key={l} onClick={tap} aria-label={`${l} ${v}, zmeniť`} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "10px 12px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--d-cardBd, var(--cardBd))", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
                    <span style={{ fontSize: 12.5, color: "var(--d-ink3, var(--ink3))" }}>{l}</span><span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{v}</span></button>))}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}><span style={{ color: "var(--sek-g)", display: "flex", flex: "none", marginTop: 2 }}><Ik d={IKONA.stit} s={16} /></span><span>SOS pomoc v okolí, bezpečnosť účtu a potvrdenie platby prídu vždy, aj v tichom čase.</span></div>
            </div>}
          </NastKarta>
        </div>
        <div style={{ padding: "14px 18px", borderRadius: 16, background: "var(--d-card, var(--field))", border: "1px solid var(--d-cardBd, var(--cardBd))", fontSize: 13, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}><b style={{ color: "var(--d-ink, var(--ink))" }}>Nikdy ťa nezahltíme.</b> Malé dary spájame do jedného súhrnu. Na displej príde oznámenie len pri veciach, ktoré od teba niečo potrebujú alebo ťa naozaj potešia.</div>
      </div></div>
    </div>
  );
}

/** starý názov exportu (Profil → Nastavenia → Oznámenia) */
export const Nastavenia = NastaveniaOznameni;
