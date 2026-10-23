// ============================================================
// OPRAVY 511 (balík 47) · Príprava a zverejnenie stránky — prototyp „Zverejnit stranku - Sprava charity“ (stavy 1–5).
// Charita aj farnosť (farnosť: „hlavná zbierka“ namiesto „centrálna“).
//  1 · Prvý príchod: karta so Svetlúšikom v Prehľade (Rozumiem, beriem na vedomie → už sa neukáže).
//  2 · Pripravuje sa: tenká lišta hore „Neverejný profil …“ + Zverejniť stránku ›, kým nie je verejná.
//  3 · Zverejniť, niečo chýba: zoznam chýbajúceho, ťuk „chýba · doplniť ›“ otvorí miesto.
//  4 · Ste si istý: Podržte a zverejnite stránku (raz navždy, začne skúšobná doba).
//  5 · Verejná: Gratulujeme + upozornenie (Rozumiem) a nepovinný QR plagát (Teraz nie).
// Čo sa už ukázalo, sa pamätá v nastaveniach stránky (kľúče „uvodNeverejna“, „uvodVerejna“, „uvodQrPlagat“).
// ============================================================
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { citajNastavenie, zapisNastavenie, useZmenyNastaveni } from "@/lib/nastaveniaStranky";
import { useZverejnenie, zverejniStranku } from "@/lib/zverejnenieStranky";

const ZELENA = "#4B7A35", CERV = "#A34A2A";
const datumDnes = (iso?: string | null) => { const d = iso ? new Date(iso) : new Date(); return `${d.getDate()}. ${d.getMonth() + 1}.`; };

function Svetlo({ size = 40 }: { size?: number }) {
  return (
    <span aria-hidden="true" style={{ flex: "none", position: "relative", width: size, height: size }}>
      <span style={{ position: "absolute", inset: -6, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,196,92,.5) 0%,rgba(255,196,92,0) 70%)" }} />
      <span style={{ position: "absolute", inset: 0, overflow: "hidden" }}><span style={{ position: "absolute", left: 0, top: 0, width: size * 10, height: size, background: "url('/svetlusik-let.png') 0 0/100% 100% no-repeat" }} /></span>
    </span>);
}
const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 };
const plne: CSSProperties = { alignSelf: "flex-start", minHeight: 52, padding: "0 22px", borderRadius: 14, border: "none", background: ZELENA, color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" };
const obrys: CSSProperties = { alignSelf: "flex-start", minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };

/** 2 · lišta hore, kým stránka nie je verejná */
export function ListaNeverejna({ strankaId, mobil, onZverejnit }: { strankaId: string; mobil: boolean; onZverejnit: () => void }) {
  const z = useZverejnenie(strankaId);
  if (z.stav !== "neverejna") return null;
  return (
    <div role="status" style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: mobil ? "8px 12px" : "8px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
      <span aria-hidden="true" style={{ flex: "none", width: 10, height: 10, borderRadius: "50%", background: "#C9A24A" }} />
      <span style={{ flex: "1 1 220px", minWidth: 0, fontSize: 14.5, lineHeight: 1.4, color: "var(--ink)" }}>
        <b>Neverejný profil</b> · zatiaľ ho nikto nevidí <b style={{ color: CERV }}>· dary sa neprijímajú</b></span>
      <button type="button" onClick={onZverejnit} style={{ flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 12, border: "none", background: ZELENA, color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Zverejniť stránku ›</button>
    </div>);
}

/** 1 a 5 · karty v Prehľade */
export function KartyZverejnenia({ strankaId, farnost, onQrPlagat }: { strankaId: string; farnost: boolean; onQrPlagat: () => void }) {
  useZmenyNastaveni();
  const z = useZverejnenie(strankaId);
  const zbierka = farnost ? "hlavnú zbierku" : "centrálnu zbierku";
  if (z.stav === "neverejna" && !citajNastavenie("uvodNeverejna")) return (
    <section aria-label="Vitajte" style={{ ...karta, border: "1.5px solid var(--goldBd)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Svetlo /><b style={{ fontSize: 20, lineHeight: 1.3 }}>Vitajte v DEED+ na vašej správcovskej stránke.</b></span>
      <b style={{ fontSize: 16.5, color: "var(--gold)" }}>Vaša stránka je zatiaľ neverejná.</b>
      <span style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>Môžete si ju v pokoji pripraviť: profil, zbierky, oznamy, udalosti. Všetko sa ukladá, ale nikto to nevidí.</span>
      <span role="note" style={{ padding: "12px 14px", borderRadius: 14, background: "#F6E3DC", border: `1.5px solid ${CERV}`, color: "#6E2716", fontSize: 15.5, fontWeight: 700, lineHeight: 1.5 }}>Kým je stránka neverejná, nedá sa prijímať žiadny dar. Zbierky sa aktivujú až po zverejnení stránky.</span>
      <span style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>Ako bude vyzerať, uvidíte vo Verejnom profile vľavo hore. Keď sa vám bude páčiť, ťuknete hore na <b style={{ color: "var(--ink)" }}>Zverejniť stránku</b>. Až vtedy ju ľudia uvidia.</span>
      {farnost && <span style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}>Skúšobná doba sa začne až zverejnením stránky.</span>}
      <button type="button" onClick={() => zapisNastavenie("uvodNeverejna", true)} style={plne}>Rozumiem, beriem na vedomie</button>
    </section>);
  if (z.stav !== "verejna" || !citajNastavenie("zverejnilaSom")) return null;
  const uvod = !citajNastavenie("uvodVerejna"), qr = !citajNastavenie("uvodQrPlagat");
  if (!uvod && !qr) return null;
  return (<>
    {uvod && <section aria-label="Stránka je verejná" style={{ ...karta, border: `1.5px solid ${ZELENA}` }}>
      <span style={{ alignSelf: "flex-start", padding: "3px 10px", borderRadius: 8, background: "var(--gSoft)", border: "1px solid var(--gBd)", color: "var(--gInk)", fontSize: 12, fontWeight: 800, letterSpacing: ".06em" }}>VEREJNÁ</span>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Svetlo /><b style={{ fontSize: 20, lineHeight: 1.3 }}>Gratulujeme. Vitajte oficiálne v DEED+.</b></span>
      <span style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>Vaša stránka je verejná. Ľudia vás nájdu vo vyhľadávaní a na mape, zbierky prijímajú dary.</span>
      <span role="note" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1.5px solid #C9A24A", display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: 12.5, letterSpacing: ".08em", color: "var(--gold)" }}>UPOZORNENIE</b>
        <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink)" }}>Všetko, čo odteraz pridáte na stránku, bude hneď zverejnené. Vzhľad a farby stránky si stále môžete upraviť v Nastavenia › Vzhľad stránky › Ateliér.</span>
      </span>
      {farnost && <span style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}>Skúšobná doba beží od dnes, {datumDnes(z.od)}</span>}
      <button type="button" onClick={() => zapisNastavenie("uvodVerejna", true)} style={plne}>Rozumiem</button>
    </section>}
    {qr && <section aria-label="QR plagát" style={karta}>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>ODPORÚČAME · NEPOVINNÉ</span>
      <b style={{ fontSize: 18 }}>QR plagát vašej stránky</b>
      <span style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>Kto ho naskenuje mobilom, dostane sa rovno na vašu {zbierka} a hneď vám môže poslať dar. Stačí ho vytlačiť a dať na nástenku alebo k vchodu.</span>
      <span style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => { zapisNastavenie("uvodQrPlagat", true); onQrPlagat(); }} style={plne}>Stiahnuť QR plagát</button>
        <button type="button" onClick={() => zapisNastavenie("uvodQrPlagat", true)} style={obrys}>Teraz nie</button>
      </span>
    </section>}
  </>);
}

export type Polozka = { t: string; ok: boolean; onDoplnit: () => void };
/** 3 a 4 · okno Zverejniť stránku? */
export function OknoZverejnit({ strankaId, polozky, farnost, onZavri }: { strankaId: string; polozky: Polozka[]; farnost: boolean; onZavri: () => void }) {
  const [hint, setHint] = useState(false);
  const [bezi, setBezi] = useState(false);
  const [chyba, setChyba] = useState("");
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  const chyba0 = polozky.filter((p) => !p.ok);
  const zverejni = async () => {
    if (bezi) return; setBezi(true); setChyba("");
    const e = await zverejniStranku(strankaId);
    setBezi(false);
    if (e) { setChyba(e); return; }
    zapisNastavenie("zverejnilaSom", true);
    onZavri();
  };
  const riadok = (p: Polozka, i: number): ReactNode => (
    <div key={p.t} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
      <b style={{ flex: 1, fontSize: 16 }}>{p.t}</b>
      {p.ok ? <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gInk)" }}>✓ hotové</span>
        : <button type="button" onClick={() => { onZavri(); p.onDoplnit(); }} style={{ minHeight: 44, padding: "0 4px", border: "none", background: "transparent", color: CERV, fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>chýba · doplniť ›</button>}
    </div>);
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(20,17,11,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onZavri}>
      <div role="dialog" aria-modal="true" aria-label="Zverejniť stránku" onClick={(e) => e.stopPropagation()} className="sprava-charity"
        style={{ width: "min(520px, 100%)", maxHeight: "100%", overflowY: "auto", boxSizing: "border-box", borderRadius: 24, background: "var(--bg)", color: "var(--ink)", border: "1px solid var(--cardBd)", padding: 22, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        <b style={{ fontSize: 23 }}>Zverejniť stránku?</b>
        {chyba0.length ? <>
          <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink2)" }}>Ešte niečo chýba. Doplňte to a potom zverejnite.</span>
          <div style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "2px 16px" }}>{polozky.map(riadok)}</div>
          <button type="button" onClick={onZavri} style={{ ...obrys, alignSelf: "center" }}>Zavrieť</button>
        </> : <>
          <span style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>Stránku uvidia všetci: vo vyhľadávaní a na mape. Zbierky začnú prijímať dary.</span>
          <span style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--ink)", fontWeight: 700 }}>Späť do prípravy sa už nedá. Všetko, čo pridáte potom, pôjde von hneď.</span>
          {farnost && <span style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>Zverejnením sa začne skúšobná doba.</span>}
          {hint && <span role="status" style={{ fontSize: 14, fontWeight: 800, color: "var(--gold)" }}>Podržte tlačidlo, kým sa nenaplní.</span>}
          {chyba && <span role="alert" style={{ fontSize: 14.5, fontWeight: 800, color: "#B3261E" }}>{chyba}</span>}
          <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}>
            <PodrzTlacidlo label={bezi ? "Zverejňuje sa…" : "Podržte a zverejnite stránku"} trvanie={1500} disabled={bezi} onHint={() => setHint(true)} onConfirm={() => { setHint(false); void zverejni(); }} />
          </div>
          <button type="button" onClick={onZavri} style={{ ...obrys, alignSelf: "center" }}>Ešte nie, zavrieť</button>
        </>}
      </div>
    </div>, document.body);
}

/** návštevník QR / odkazu neverejnej stránky */
export function StrankaSaPripravuje({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "calc(28px + env(safe-area-inset-top, 0px)) 16px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Svetlo /><b style={{ fontSize: 22 }}>Stránka sa pripravuje</b></span>
      <span style={{ fontSize: 16, lineHeight: 1.55, color: "var(--ink2)" }}>Správca ju ešte dopĺňa. Keď ju zverejní, nájdete ju tu aj vo vyhľadávaní.</span>
      <button type="button" onClick={onBack} style={obrys}>‹ Späť</button>
    </div>);
}
