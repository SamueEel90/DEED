// KARTA 18 · bod 4 — Môj QR: Na akciu · Overiť ma · Pozvánka.
// Na akciu a Overiť ma: kód sa mení každých 15 s (snímka obrazovky neplatí), token sa tvorí v telefóne,
// takže funguje aj bez signálu (účasť/overenie sa pripíše po pripojení). Pozvánka: statický odkaz na verejný profil.
import { TESTOVACIA } from "@/lib/testovacia";
import { useT } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QrSkener } from "@/components/qrskener";
import { toast } from "@/components/toast";
import { usePouzivatel } from "@/lib/pouzivatel";
import { DeedQr } from "@/components/deedqr";
import { Harok } from "@/features/zbierka/Zdielat";
import { stitUzivatela } from "./ProfilHlavny";
import "@/styles/platba.css";
import { otvorAkciu } from "@/lib/akcia";

export type ZalozkaQr = "akcia" | "overit" | "pozvanka";
const PERIODA = 15;
// kľúče prekladu (profil.ts)
const PODNADPIS: Record<ZalozkaQr, string> = { akcia: "qr.podnadpis.akcia", overit: "qr.podnadpis.overit", pozvanka: "qr.podnadpis.pozvanka" };
const POUZITIE: Record<"akcia" | "overit", string[]> = {
  akcia: ["qr.pouzitie.akcia1", "qr.pouzitie.akcia2"],
  overit: ["qr.pouzitie.overit1", "qr.pouzitie.overit2", "qr.pouzitie.overit3"],
};
const KRUH = "linear-gradient(135deg,#E2C174,#A8842A)";

/** kód na 15 s — vytvorí sa v telefóne (offline). Podpis tajomstvom zariadenia doplní backend (Supabase). */
export function tokenQr(ucet: string, rezim: string, okno: number): string {
  const surove = `${ucet}|${rezim}|${okno}`;
  let h = 2166136261;
  for (let i = 0; i < surove.length; i++) { h ^= surove.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return `https://deed.sk/q/${rezim}/${encodeURIComponent(ucet)}.${okno}.${h.toString(36)}`;
}

/** zväčšená profilová fotka (300 px, tmavé pozadie, meno) — ťuk kamkoľvek zavrie */
export function ZvacsenaFotka({ onClose }: { onClose: () => void }) {
  const tr = useT();
  const ja = usePouzivatel();
  const ini = `${(ja.meno || "?")[0]}${(ja.priezvisko || "")[0] ?? ""}`.toUpperCase();
  return createPortal(
    <div className="deed-platba" onClick={onClose} role="dialog" aria-modal="true" aria-label={tr("qr.fotkaAria", { meno: ja.celeMeno })}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(18,17,14,.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, cursor: "zoom-out", animation: "zbFsIn .3s ease both" }}>
      <span style={{ width: 300, height: 300, maxWidth: "80vw", maxHeight: "80vw", borderRadius: "50%", padding: 5, background: KRUH, boxSizing: "border-box" }}>
        <span style={{ display: "flex", width: "100%", height: "100%", borderRadius: "50%", background: ja.foto ? `url(${ja.foto}) center/cover` : "#DCE3D0", border: "5px solid #12110E", alignItems: "center", justifyContent: "center", fontSize: 96, fontWeight: 800, color: "#3F6E2A", boxSizing: "border-box" }}>{ja.foto ? "" : ini}</span></span>
      <span style={{ fontSize: 20, fontWeight: 800, color: "#F1ECE1" }}>{ja.celeMeno}</span>
      <span style={{ fontSize: 13, color: "#A59E8F", marginTop: 6 }}>{tr("qr.tukniZavries")}</span>
    </div>, document.body);
}

export function MojQr({ zalozka = "akcia", onClose }: { zalozka?: ZalozkaQr; onClose: () => void }) {
  const tr = useT();
  const ja = usePouzivatel();
  const [z, setZ] = useState<ZalozkaQr>(zalozka);
  const [sek, setSek] = useState(PERIODA);
  const [okno, setOkno] = useState(() => Math.floor(Date.now() / (PERIODA * 1000)));
  const [blik, setBlik] = useState(false);
  const [ok, setOk] = useState(false);
  const [kop, setKop] = useState(false);
  const [zoomFoto, setZoomFoto] = useState(false);
  const [zoomStit, setZoomStit] = useState(false);
  const [skener, setSkener] = useState(false);
  const [velky, setVelky] = useState(false); // OPRAVY 27: ťuk na QR → celá obrazovka
  const zamok = useRef<{ release: () => Promise<void> } | null>(null);
  const handle = (ja.nick || `${ja.meno}-${(ja.priezvisko || "")[0] ?? ""}`).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ja";
  const odkaz = `deed.sk/p/${handle}`;
  const stit = stitUzivatela(!!ja.demo);
  const nazovStitu = tr(`profil.stit.${stit}`);
  const ini = `${(ja.meno || "?")[0]}${(ja.priezvisko || "")[0] ?? ""}`.toUpperCase();
  const zivy = z !== "pozvanka";

  // 15 s obnova kódu (pás sa zmenšuje, pri obnove QR na chvíľu zbledne)
  useEffect(() => {
    if (!zivy) return;
    const t = window.setInterval(() => {
      setSek((s) => {
        if (s > 1) return s - 1;
        setBlik(true);
        window.setTimeout(() => { setBlik(false); setOkno(Math.floor(Date.now() / (PERIODA * 1000))); }, 250);
        return PERIODA;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [zivy, z]);

  // obrazovka nezhasne, kým je QR otvorený (jas na maximum nastaví až natívna appka — web to nevie)
  useEffect(() => {
    if (!zivy) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { zamok.current = l; }).catch(() => { /* nepodporované */ });
    return () => { zamok.current?.release().catch(() => {}); zamok.current = null; };
  }, [zivy]);

  const prepni = (n: ZalozkaQr) => { setZ(n); setSek(PERIODA); setOkno(Math.floor(Date.now() / (PERIODA * 1000))); };
  // potvrdenie skenu — príde z backendu obom stranám; v DEV ťuk na QR ukáže, ako vyzerá
  const potvrdenie = () => {
    if (!zivy || ok) return;
    try { navigator.vibrate?.([8, 40, 12]); } catch { /* bez vibrácie */ }
    setOk(true); window.setTimeout(() => setOk(false), 2200);
  };
  const data = zivy ? tokenQr(ja.ucetId || handle, z, okno) : `https://${odkaz}`;
  const zalozkaBtn = (k: ZalozkaQr, t: string) => (
    <button key={k} type="button" onClick={() => prepni(k)} style={{ height: 42, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", background: z === k ? "#fff" : "transparent", color: z === k ? "#1D211B" : "var(--ink3)" }}>{t}</button>);

  return (
    <>
      <Harok onClose={onClose} zatvorText={tr("sp.zavriet")} hlavicka={
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 20, fontWeight: 800 }}>{tr("qr.titul")}</span><span style={{ display: "block", fontSize: 13.5, color: "var(--ink3)" }}>{tr(PODNADPIS[z])}</span></span>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
            {zalozkaBtn("akcia", tr("qr.naAkciu"))}{zalozkaBtn("overit", tr("qr.overitMa"))}{zalozkaBtn("pozvanka", tr("qr.pozvanka"))}
          </div>
          {/* karta 22 · skratka na skener akcie (nie štvrtá záložka) */}
          <button type="button" onClick={() => { onClose(); otvorAkciu(); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 50, borderRadius: 14, border: "1.5px dashed var(--gBd)", background: "transparent", fontSize: 15, fontWeight: 700, color: "var(--gInk)", cursor: "pointer", fontFamily: "inherit" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" /></svg>
            {tr("qr.organizujem")}</button>
          {z === "overit" && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
              <span onClick={() => setZoomFoto(true)} role="button" aria-label={tr("qr.zvacsitFotku")} style={{ position: "relative", flex: "none", width: 64, height: 64, borderRadius: "50%", padding: 2.5, background: KRUH, cursor: "zoom-in", boxSizing: "border-box" }}>
                <span style={{ display: "flex", width: "100%", height: "100%", borderRadius: "50%", background: ja.foto ? `url(${ja.foto}) center/cover` : "color-mix(in srgb, var(--a-green) 16%, var(--c-bg))", border: "2.5px solid var(--bg)", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 800, color: "var(--gInk)", boxSizing: "border-box" }}>{ja.foto ? "" : ini}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>{ja.celeMeno}</span>
                <span style={{ display: "block", fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>{ja.mesto && ja.mesto !== "—" ? `${ja.mesto} · ` : ""}{tr("qr.overeny")}</span>
              </span>
              <img onClick={() => setZoomStit(true)} src={`/odznaky/${stit.toLowerCase()}.png`} alt={tr("qr.stitAlt", { stit: nazovStitu })} style={{ width: 40, height: 46, objectFit: "contain", flex: "none", cursor: "zoom-in" }} />
            </div>
          )}
          <div role={zivy ? "button" : undefined} tabIndex={zivy ? 0 : undefined} aria-label={zivy ? tr("qr.zvacsitQr") : undefined}
            onClick={zivy ? () => setVelky(true) : undefined} onDoubleClick={TESTOVACIA ? potvrdenie : undefined}
            onKeyDown={(e) => { if (zivy && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setVelky(true); } }}
            style={{ alignSelf: "center", position: "relative", borderRadius: 22, background: "#fff", padding: 8, lineHeight: 0, cursor: zivy ? "zoom-in" : "default" }}>
            <div style={{ opacity: blik ? .15 : 1, transition: "opacity .25s ease" }}><DeedQr data={data} bezOdznaku size={252} /></div>
            <div aria-live="polite" style={{ position: "absolute", inset: 0, borderRadius: 22, background: "color-mix(in srgb, var(--a-green) 16%, #fff)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, lineHeight: 1.3, opacity: ok ? 1 : 0, transform: ok ? "scale(1)" : "scale(.9)", transition: "opacity .3s ease, transform .4s cubic-bezier(.34,1.4,.5,1)", pointerEvents: "none" }}>
              <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
              <span style={{ fontSize: 19, fontWeight: 800, color: "var(--gInk)" }}>{z === "overit" ? tr("qr.overenieOk") : tr("qr.ucastOk")}</span>
            </div>
          </div>
          {zivy && <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "center", width: 268, maxWidth: "100%" }}>
              <div style={{ height: 5, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--green)", transformOrigin: "left", transform: `scaleX(${sek / PERIODA})`, transition: "transform 1s linear" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink3)" }}>
                <span>{tr("qr.novyKod")}<b style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{tr("qr.sekundy", { n: sek })}</b></span><span>{tr("qr.snimka")}</span></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
              {POUZITIE[z].map((u) => <div key={u} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flex: "none" }} />{tr(u)}</div>)}
            </div>
            <button type="button" onClick={() => setSkener(true)} style={{ height: 52, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" /></svg>{tr("qr.skenovat")}</button>
          </>}
          {!zivy && <>
            <div style={{ display: "flex", alignItems: "center", height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 15 }}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{odkaz}</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(`https://${odkaz}`).catch(() => {}); setKop(true); window.setTimeout(() => setKop(false), 1600); }}
                style={{ height: 52, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 15, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>{kop ? tr("sp.skopirovane") : tr("sp.kopirovat")}</button>
              <button type="button" onClick={() => { const n = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }; if (n.share) n.share({ title: ja.celeMeno, url: `https://${odkaz}` }).catch(() => {}); else { navigator.clipboard?.writeText(`https://${odkaz}`).catch(() => {}); setKop(true); window.setTimeout(() => setKop(false), 1600); } }}
                style={{ height: 52, borderRadius: 16, border: "none", background: "var(--gGrad)", fontSize: 15, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>{tr("sp.zdielat")}</button>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)", textAlign: "center", padding: "0 8px" }}>{tr("qr.otvoriProfil")}</div>
          </>}
        </div>
      </Harok>
      {skener && <QrSkener onClose={() => setSkener(false)} toast={toast} />}
      {zoomFoto && <ZvacsenaFotka onClose={() => setZoomFoto(false)} />}
      {velky && zivy && createPortal(
        <div onClick={() => setVelky(false)} role="dialog" aria-modal="true" aria-label={tr("qr.celaObrazovkaAria")}
          style={{ position: "fixed", inset: 0, zIndex: 210, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, cursor: "zoom-out", animation: "zbFsIn .25s ease both" }}>
          <div style={{ opacity: blik ? 0.15 : 1, transition: "opacity .25s ease", lineHeight: 0 }}><DeedQr data={data} bezOdznaku size={Math.min(window.innerWidth - 48, window.innerHeight - 140)} /></div>
          <span style={{ fontSize: 16, color: "#4A4C43", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{tr("qr.novyKod")}<b style={{ color: "#1D211B", fontVariantNumeric: "tabular-nums" }}>{tr("qr.sekundy", { n: sek })}</b></span>
        </div>, document.body)}
      {zoomStit && createPortal(
        <div className="deed-platba" onClick={() => { setZoomFoto(false); setZoomStit(false); }} role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(18,17,14,.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, cursor: "zoom-out", animation: "zbFsIn .3s ease both" }}>
          <>
            <div style={{ position: "relative", width: 260, height: 300 }}>
              <div className="pf-ziara" style={{ position: "absolute", left: "50%", top: "50%", width: 380, height: 380, margin: "-190px 0 0 -190px", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,231,163,.55) 0%,rgba(246,183,60,.18) 40%,rgba(246,183,60,0) 70%)" }} />
              <img src={`/odznaky/${stit.toLowerCase()}.png`} alt="" style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain" }} /></div>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#E2C174" }}>{tr("qr.stitAlt", { stit: nazovStitu })}</span>
            <span style={{ fontSize: 14, color: "#C4BDAE" }}>{tr("qr.zasluzeny", { meno: ja.celeMeno })}</span>
          </>
          <span style={{ fontSize: 13, color: "#A59E8F", marginTop: 6 }}>{tr("qr.tukniZavries")}</span>
        </div>, document.body,
      )}
    </>
  );
}
