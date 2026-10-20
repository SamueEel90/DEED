// ============================================================
// OPRAVY 448 · pomocníci ku skutku „Už sme pomohli“ naostro (bez DEV simulácie)
//  · SkenerPomocnika — kamera; pomocník ukáže Môj QR (ktorákoľvek záložka). Server overí podpísaný kód (0144),
//    zapíše pomocníka a pošle mu „… ťa pridal(a) ku skutku ✓“; tu hneď riadok „✓ Mária Š. · pridaná skenom“.
//  · HarokPozvanky — odkaz pozvánky (Kopírovať · Zdieľať do SMS, WhatsApp …) + vyhľadanie registrovaných podľa mena.
//    Kto odkaz otvorí bez účtu → registrácia → hneď „… ťa pozýva ku skutku · Bol som pri tom“ (0143). Platí 2 hodiny.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { kodZQr, pridajPomocnikaSkenom } from "@/lib/osobnyQr";
import { vytvorPozvanku, hladajOsoby, posliPozvanku, type NajdenaOsoba } from "@/lib/pozvankaSkutku";
import { vibruj } from "@/features/zbierka/animacie";

const tl: CSSProperties = { minHeight: 46, padding: "0 16px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };

/** kamera na osobný QR pomocníka; onPridany(meno) po overení serverom */
export function SkenerPomocnika({ skutok, nazov, stranka, onPridany, onZavri }: { skutok: string; nazov: string; stranka: string | null; onPridany: (meno: string) => void; onZavri: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sprava, setSprava] = useState<{ ok: boolean; t: string } | null>(null);
  const posledny = useRef<string>("");
  const bezi = useRef(false);
  useEffect(() => {
    const video = videoRef.current; if (!video) return;
    let zrusene = false; let ovl: { stop: () => void } | null = null;
    import("@zxing/browser").then(({ BrowserQRCodeReader }) => new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video, (r) => {
      const kod = r ? kodZQr(r.getText()) : null;
      if (!kod || kod === posledny.current || bezi.current) return;
      posledny.current = kod; bezi.current = true;
      void pridajPomocnikaSkenom(kod, skutok, nazov, stranka).then((x) => {
        bezi.current = false;
        if ("chyba" in x) { setSprava({ ok: false, t: x.chyba }); return; }
        vibruj(8); setSprava({ ok: true, t: `✓ ${x.meno} · pridaný skenom` }); onPridany(x.meno);
      });
    })).then((c) => { ovl = c; if (zrusene) c.stop(); }).catch(() => setSprava({ ok: false, t: "Kamera sa nespustila. Povoľte appke fotoaparát v nastaveniach telefónu." }));
    return () => { zrusene = true; try { ovl?.stop(); } catch { /* už zastavená */ } };
  }, [skutok, nazov, stranka]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative", height: 230, borderRadius: 18, background: "#1D211B", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video ref={videoRef} muted playsInline aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
        <span aria-hidden="true" style={{ position: "relative", width: 170, height: 170, border: "3px solid #8DB866", borderRadius: 18 }} />
        <span style={{ position: "absolute", left: 0, right: 0, bottom: 12, textAlign: "center", fontSize: 13.5, fontWeight: 600, color: "rgba(241,236,225,.9)" }}>Namierte na Môj QR pomocníka</span>
      </div>
      {sprava && <span role={sprava.ok ? "status" : "alert"} style={{ fontSize: 14, fontWeight: 700, color: sprava.ok ? "var(--gInk)" : "var(--cRed, #A34A2A)" }}>{sprava.t}</span>}
      <button type="button" onClick={onZavri} style={{ ...tl, alignSelf: "flex-start" }}>Hotovo so skenovaním</button>
    </div>);
}

/** hárok „Poslať pozvánku“: odkaz pre každého (aj bez účtu) + pozvanie registrovaného podľa mena */
export function HarokPozvanky({ skutok, nazov, stranka, onOdkaz, onPozvany, onZavri }: { skutok: string; nazov: string; stranka: string | null;
  /** nový odkaz pozvánky (riadok „Pozvánka poslaná · čaká“) */ onOdkaz: (token: string) => void;
  /** pozvaný registrovaný (riadok s jeho menom · čaká) */ onPozvany: (token: string, meno: string) => void; onZavri: () => void }) {
  const [odkaz, setOdkaz] = useState<{ token: string; odkaz: string } | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [kop, setKop] = useState(false);
  const [q, setQ] = useState("");
  const [vysl, setVysl] = useState<NajdenaOsoba[]>([]);
  const [pozvani, setPozvani] = useState<Set<string>>(() => new Set());
  const novyOdkaz = async () => {
    setChyba(null);
    const p = await vytvorPozvanku(skutok, nazov, stranka);
    if (!p) { setChyba("Pozvánku sa nepodarilo vytvoriť. Skontrolujte pripojenie a skúste znova."); return null; }
    return p;
  };
  const kopiruj = async () => {
    const p = odkaz ?? await novyOdkaz(); if (!p) return;
    if (!odkaz) { setOdkaz(p); onOdkaz(p.token); }
    try { await navigator.clipboard.writeText(p.odkaz); setKop(true); } catch { setChyba("Odkaz sa nepodarilo skopírovať. Podržte ho a skopírujte ručne."); }
  };
  const zdielaj = async () => {
    const p = odkaz ?? await novyOdkaz(); if (!p) return;
    if (!odkaz) { setOdkaz(p); onOdkaz(p.token); }
    if (typeof navigator.share === "function") { try { await navigator.share({ title: "Bol si pri tom? Potvrď v DEED+", url: p.odkaz }); } catch { /* zrušené */ } }
    else void kopiruj();
  };
  useEffect(() => { const t = window.setTimeout(() => { void hladajOsoby(q).then(setVysl); }, 300); return () => window.clearTimeout(t); }, [q]);
  const pozvi = async (o: NajdenaOsoba) => {
    const p = await novyOdkaz(); if (!p) return;
    const e = await posliPozvanku(p.token, o.ucet);
    if (e) { setChyba(e); return; }
    setPozvani((s) => new Set(s).add(o.ucet)); onPozvany(p.token, o.meno);
  };
  return (
    <div role="dialog" aria-label="Poslať pozvánku" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
      <b style={{ fontSize: 16 }}>Poslať pozvánku</b>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Pošlite odkaz aj tomu, kto ešte nie je v DEED+. Po registrácii hneď potvrdí, že bol pri tom. Odkaz platí 2 hodiny.</span>
      {odkaz && <span style={{ fontSize: 13, color: "var(--ink3)", overflowWrap: "anywhere" }}>{odkaz.odkaz}</span>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void kopiruj()} style={tl}>{kop ? "Skopírované ✓" : "Kopírovať odkaz"}</button>
        <button type="button" onClick={() => void zdielaj()} style={{ ...tl, border: "none", background: "var(--green)", color: "#fff" }}>Zdieľať · SMS, WhatsApp …</button>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: "1px solid var(--cardBd)" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Alebo nájdite človeka v DEED+</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Meno a priezvisko" aria-label="Hľadať človeka" style={{ height: 46, padding: "0 12px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--card)", fontSize: 16, fontFamily: "inherit", color: "var(--ink)" }} />
      </label>
      {q.trim().length >= 3 && !vysl.length && <span style={{ fontSize: 13, color: "var(--ink3)" }}>Nikoho sme nenašli. Pošlite mu odkaz.</span>}
      {vysl.map((o) => (
        <div key={o.ucet} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48 }}>
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{o.meno}</b>{o.mesto && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{o.mesto}</span>}</span>
          {pozvani.has(o.ucet) ? <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gInk)" }}>Pozvaný ✓</span>
            : <button type="button" onClick={() => void pozvi(o)} style={{ ...tl, minHeight: 40 }}>Pozvať</button>}
        </div>))}
      {chyba && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cRed, #A34A2A)" }}>{chyba}</span>}
      <button type="button" onClick={onZavri} style={{ ...tl, alignSelf: "flex-start" }}>Zavrieť</button>
    </div>);
}
