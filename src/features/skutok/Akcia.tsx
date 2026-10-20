// KARTA 22 · Organizovaná akcia (celá obrazovka sprava): skener účastníkov → Začať akciu (čas + GPS)
// → Akcia beží (okno pre meškajúcich, odstránenie krížikom) → Ukončiť akciu → Pridať skutok krok 2.
// Vstupy: Pridať skutok → So skupinou → Akcia práve začína · Môj QR → Organizujem akciu.
import { QrNaUkazanie } from "@/components/qrNaUkazanie";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { IScannerControls } from "@zxing/browser";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { kodZQr } from "@/lib/osobnyQr";
import { useKodAkcie, odkazAkcie, useUcastniciAkcie, pridajUcastnikaSkenom, odoberUcastnika, usePoloha, jeUuid } from "@/lib/akciaCharity";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useLokalita } from "@/lib/lokalita";
import { useAkcia, nastavAkciu, zmenAkciu, cas, type Akcia } from "@/lib/akcia";
import { vibruj } from "@/features/zbierka/animacie";
import { otvorPridatSkutok } from "./otvor";
import { repo } from "@/data";
import { profilZPamate } from "@/lib/profilStranky";
import "@/styles/platba.css";

const Ik = ({ d, s = 18, w = 2 }: { d: string; s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const POLOHA = "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
const ludia = (n: number) => `${n} ${n === 1 ? "človek" : n >= 2 && n <= 4 ? "ľudia" : "ľudí"}`;
const novyId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ (Math.random() * 16 >> (+c / 4))).toString(16)));
const ini = (n: string) => n.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

export function AkciaHost() {
  const a = useAkcia();
  const [ziva, setZiva] = useState(false); // obrazovka ostane v DOM pri zatváraní (animácia sprava)
  useEffect(() => { if (a?.otvorena) setZiva(true); }, [a?.otvorena]);
  if (!a || (!a.otvorena && !ziva)) return null;
  return <AkciaObrazovka a={a} onZavrete={() => setZiva(false)} />;
}

function AkciaObrazovka({ a, onZavrete }: { a: Akcia; onZavrete: () => void }) {
  const ja = usePouzivatel();
  const lok = useLokalita();
  const [otv, setOtv] = useState(false);
  const [, tik] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ovladanie = useRef<IScannerControls | null>(null);
  const aRef = useRef(a); aRef.current = a;

  useEffect(() => { const r = requestAnimationFrame(() => setOtv(a.otvorena)); if (!a.otvorena) { const t = setTimeout(onZavrete, 450); return () => { cancelAnimationFrame(r); clearTimeout(t); }; } return () => cancelAnimationFrame(r); }, [a.otvorena, onZavrete]);
  useEffect(() => { if (a.stav !== "bezi") return; const t = setInterval(() => tik((x) => x + 1), 1000); return () => clearInterval(t); }, [a.stav]);

  // OPRAVY 121 · body 10–12: akcia za charitu — QR charity (akčný, podpísaný, rotuje), príchod skenom povinný,
  // koniec ukončí organizátor pre všetkých, odobratie účastníka ide do záznamu zmien. Texty vykaním.
  const org = a.org;
  // OPRAVY 446: id akcie charity je uuid (server); stará lokálna akcia s DEV menami sa začne odznova
  useEffect(() => { if (org && !jeUuid(a.id)) nastavAkciu({ ...aRef.current, id: novyId(), uc: [], zaznam: [] }); }, [org, a.id]);
  const idAkcie = org && jeUuid(a.id) ? a.id! : null;
  // QR charity naozaj rotuje (nový kód každých 15 s, odpočet a pás ako v Môj QR)
  const { kod: kodAkcie, sek } = useKodAkcie(idAkcie, org?.nazov ?? "");
  const qrData = kodAkcie ? odkazAkcie(kodAkcie) : null;
  // účastníci zo servera — jeden zdroj (sken organizátora aj QR charity)
  const { zoznam: ucServer, obnov } = useUcastniciAkcie(idAkcie);
  useEffect(() => {
    if (!org || !ucServer) return;
    const x = aRef.current;
    const nove = ucServer.map((u) => ({ meno: u.meno, ucet: u.ucet, neskor: !!x.start && !!u.prichod && Date.parse(u.prichod) > x.start, prichod: u.prichod ? Date.parse(u.prichod) : undefined, odchod: u.odchod ? Date.parse(u.odchod) : undefined }));
    if (JSON.stringify(nove) !== JSON.stringify(x.uc)) nastavAkciu({ ...x, uc: nove });
  }, [org, ucServer]);
  const poloha = usePoloha(a.otvorena);
  const [hlaska, setHlaska] = useState<string | null>(null); // odpoveď na mieste tlačidla (nie toast dole)
  const [skener, setSkener] = useState(false);
  const [sken, setSken] = useState<{ ok: boolean; t: string } | null>(null);
  const [koniec, setKoniec] = useState<{ text: string; dalej: () => void } | null>(null);
  useEffect(() => { setHlaska(null); }, [a.uc.length, poloha.stav]);
  const logo = org ? profilZPamate(org.stranka).ulozeny?.logo ?? null : null;
  const hm = (t?: number) => (t ? new Date(t).toLocaleTimeString("sk-SK", { hour: "numeric", minute: "2-digit" }) : "");
  const el = a.start ? Math.floor((Date.now() - a.start) / 1000) : 0;
  const zostava = a.start ? Math.max(0, a.okno * 60 - el) : 0;
  const mozePridat = a.stav === "sken" || zostava > 0;

  const pridaj = (meno: string) => {
    const x = aRef.current;
    if (x.uc.some((u) => u.meno === meno)) return;
    nastavAkciu({ ...x, uc: [...x.uc, { meno, neskor: x.stav === "bezi", ...(x.org ? { prichod: Date.now() } : {}) }] });
    vibruj(8);
  };
  // kamera: číta QR „Na akciu" (deedgood.eu/q/akcia/…). Meno účastníka doplní server pri overení tokenu.
  // OPRAVY 446 (1): pri charite kamera beží len po „Skenovať účastníkov“ a každý kód overí server (Môj QR · Na akciu)
  const kamera = org ? skener && mozePridat : mozePridat;
  const posledny = useRef(""); const bezi = useRef(false);
  useEffect(() => {
    if (!a.otvorena || !kamera || !videoRef.current) return;
    let zrusene = false;
    const video = videoRef.current;
    // @zxing sa načíta až s kamerou (Zadanie 5 · 5.6 — nie v hlavnom balíku)
    import("@zxing/browser").then(({ BrowserQRCodeReader }) => new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video, (r) => {
      const text = r?.getText() ?? "";
      if (aRef.current.org) {
        const kod = kodZQr(text); const id = aRef.current.id;
        if (!kod || !id || kod === posledny.current || bezi.current) return;
        posledny.current = kod; bezi.current = true;
        void pridajUcastnikaSkenom(id, kod).then((x) => {
          bezi.current = false;
          if ("chyba" in x) { setSken({ ok: false, t: x.chyba }); return; }
          vibruj(8); setSken({ ok: true, t: `✓ ${x.meno} · na akcii` }); obnov();
        });
        return;
      }
      const m = text.match(/\/q\/akcia\/([^.]+)\./);
      if (m) pridaj(`Účastník ${decodeURIComponent(m[1]).slice(-4)}`);
    })).then((c) => { ovladanie.current = c; if (zrusene) c.stop(); }).catch(() => { if (!zrusene) setSken({ ok: false, t: "Kamera sa nespustila. Povoľte appke fotoaparát v nastaveniach telefónu." }); });
    return () => { zrusene = true; try { ovladanie.current?.stop(); } catch { /* už zastavená */ } ovladanie.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.otvorena, kamera]);

  const dovod = (): string | null => !a.uc.length ? (org ? "Najprv naskenujte aspoň jedného účastníka." : "Najprv naskenuj aspoň jedného účastníka.")
    : poloha.stav !== "ok" || !poloha.poz ? (org ? "Zapnite polohu. Bez nej akcia nezačne." : "Zapni polohu. Bez nej akcia nezačne.") : null;
  const tukZacat = () => setHlaska(dovod()); // „Podržte tlačidlo“ ukáže samo PodrzTlacidlo
  const zacat = () => {
    // OPRAVY 446 (3): poloha je skontrolovaná vopred; bez nej akcia nezačne
    const d = dovod(); if (d || !poloha.poz) { setHlaska(d); return; }
    setHlaska(null);
    const x = aRef.current;
    // Zadanie 4 · 4.5: akcia za charitu — poloha akcie na server (od nej sa meria polomer skenov)
    if (x.org && x.id) void repo.qr.eventPoloha(x.id, poloha.poz.lat, poloha.poz.lng).catch(() => setHlaska("Polohu akcie sa nepodarilo uložiť. Účastníci sa pripoja aj tak, len bez kontroly miesta."));
    nastavAkciu({ ...x, stav: "bezi", start: Date.now(), miesto: x.miesto || lok.mesto });
  };
  const ukoncit = () => {
    const min = Math.max(1, Math.round(el / 60));
    const trvanie = min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
    const x = aRef.current;
    if (x.org && x.id) void repo.qr.eventUkonci(x.id).catch(() => undefined);   // splnenie podľa prahu počíta server (4.5)
    // OPRAVY 446 (8): na mieste tlačidla „Akcia skončila · 13 min · 4 ľudia ✓“, ďalší krok Opíšte skutok
    setSkener(false); vibruj(12);
    setKoniec({ text: `Akcia skončila · ${trvanie} · ${ludia(x.uc.length + 1)} ✓`, dalej: () => { setKoniec(null); nastavAkciu(null); dalsiKrok(x, trvanie); } });
  };
  const dalsiKrok = (x: Akcia, trvanie: string) => {
    if (x.org) { // koniec ukončí organizátor pre všetkých naraz (odchod skenovať netreba)
      // OPRAVY 447 (3): čas každého na akcii = od príchodu (najskôr od začiatku) po odchod alebo koniec akcie
      const koniec = Date.now(), zac = x.start ?? koniec;
      const pomocnici = x.uc.map((u) => ({ meno: u.meno, ms: Math.max(0, (u.odchod ?? koniec) - Math.max(u.prichod ?? zac, zac)), ...(u.ucet ? { ucet: u.ucet } : {}) }));
      otvorPridatSkutok({ start: "skupina", organizacia: true, strankaId: x.org.stranka, autor: x.org.nazov, zAkcie: { ucastnici: x.uc.map((u) => u.meno), miesto: x.miesto || lok.mesto, trvanie, dar: x.dar, zaznam: x.zaznam, pomocnici } });
      return;
    }
    otvorPridatSkutok({ start: "skupina", zAkcie: { ucastnici: x.uc.map((u) => u.meno), miesto: x.miesto || lok.mesto, trvanie, dar: x.dar } });
  };
  const skry = () => (a.stav === "sken" && !a.uc.length ? nastavAkciu(null) : zmenAkciu({ otvorena: false }));
  const ja2 = org ? org.organizator || ja.celeMeno || "Organizátor" : ja.celeMeno ? ja.celeMeno.replace(/^(\S+)\s+(\S).*$/, "$1 $2.") : "Ty";
  /** OPRAVY 121: organizátor odoberie účastníka — stratí pripojenie aj karmu, zapíše sa do záznamu zmien */
  const odober = (meno: string) => {
    const x = aRef.current;
    const u = x.uc.find((y) => y.meno === meno);
    if (x.org && x.id && u?.ucet) void odoberUcastnika(x.id, u.ucet).then((e) => { if (e) setHlaska(e); obnov(); });
    nastavAkciu({ ...x, uc: x.uc.filter((u) => u.meno !== meno), ...(x.org ? { zaznam: [...(x.zaznam ?? []), { cas: Date.now(), kto: ja2, co: `odobral dobrovoľníka ${meno}` }] } : {}) });
  };
  const pocet = `${a.uc.length + 1} účastníkov`;
  const riadok = (meno: string, s: string, i: number, del?: () => void): ReactNode => (
    <div key={meno} className="pf-rise" style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
      <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800, flex: "none" }}>{ini(meno)}</span>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{meno}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--gInk)" }}>{s}</span></span>
      {del && <button type="button" onClick={del} aria-label={`Odstrániť ${meno}`} style={{ width: 44, height: 44, border: "none", borderRadius: 10, background: "transparent", color: "var(--ink3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d="M6 6l12 12M18 6L6 18" s={16} /></button>}
    </div>);

  return createPortal(
    <div className="deed-platba" role="dialog" aria-modal="true" aria-label={a.stav === "bezi" ? "Akcia" : org ? "Akcia za charitu" : "Organizuješ akciu"}
      style={{ position: "fixed", inset: 0, zIndex: 140, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', sans-serif", transform: otv ? "none" : "translateX(105%)", transition: "transform .45s cubic-bezier(.45,0,.25,1)" }}>
      <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "max(8px, env(safe-area-inset-top)) 16px 0", minHeight: 60 }}>
          <button type="button" onClick={skry} style={{ display: "flex", alignItems: "center", gap: 4, height: 44, padding: "0 6px 0 0", border: "none", background: "transparent", fontSize: 15, fontWeight: 700, color: "var(--a-green)", cursor: "pointer", fontFamily: "inherit" }}>
            <Ik d="m15 18-6-6 6-6" s={20} w={2.2} />{a.stav === "sken" && !a.uc.length ? "Zrušiť" : "Skryť"}</button>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{a.stav === "bezi" ? "Akcia" : org ? "Akcia za charitu" : "Organizuješ akciu"}</h1>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}><div style={{ padding: "8px 16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* OPRAVY 446 (3): appka zistí polohu sama — zapnutá = malý zelený riadok, inak červená karta s tlačidlom */}
          {poloha.stav === "ok" || poloha.stav === "zistuje"
            ? <div role="status" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: poloha.stav === "ok" ? "var(--gInk)" : "var(--ink3)" }}><Ik d={POLOHA} s={16} />{poloha.stav === "ok" ? "Poloha zapnutá ✓" : "Zisťujeme polohu…"}</div>
            : <div role="alert" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", borderRadius: 16, background: "color-mix(in srgb, #A34A2A 12%, var(--card))", border: "1.5px solid #C8664A" }}>
                <span style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 16, fontWeight: 800, color: "var(--cRed, #A34A2A)" }}><Ik d={POLOHA} />{org ? "Zapnite polohu · bez nej akcia nezačne" : "Zapni polohu · bez nej akcia nezačne"}</span>
                {poloha.stav === "zamietnuta" && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>{org ? "Appka nemá povolenú polohu. Povoľte ju v nastaveniach telefónu: Nastavenia → Súkromie → Polohové služby → prehliadač alebo DEED+ → Pri používaní. Potom ťuknite znova." : "Appka nemá povolenú polohu. Povoľ ju v nastaveniach telefónu: Nastavenia → Súkromie → Polohové služby → prehliadač alebo DEED+ → Pri používaní. Potom ťukni znova."}</span>}
                {poloha.stav === "nepodporovana" && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Tento prehliadač polohu nevie zistiť. Otvorte DEED+ v Safari alebo Chrome.</span>}
                <button type="button" onClick={poloha.skus} style={{ alignSelf: "flex-start", minHeight: 46, padding: "0 18px", borderRadius: 13, border: "none", background: "#A34A2A", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Zapnúť polohu</button>
              </div>}
          {a.stav === "bezi" && <>
            <div style={{ borderRadius: 22, background: "#1D211B", color: "#F1ECE1", padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#8DB866" }}><span aria-hidden="true" className="zb-pulz" style={{ width: 8, height: 8, borderRadius: "50%", background: "#8DB866" }} />AKCIA BEŽÍ</div>
              <div role="timer" aria-label={`Čas akcie ${cas(el)}`} style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{cas(el)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "rgba(241,236,225,.75)" }}><Ik d={POLOHA} s={15} />{a.miesto}{poloha.stav === "ok" ? " · poloha zapnutá" : ""}</div>
            </div>
            <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: zostava > 0 ? "var(--gSoft)" : "var(--card)", border: `1px solid ${zostava > 0 ? "var(--gBd)" : "var(--cardBd)"}`, fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>
              <span style={{ color: "var(--green)", display: "flex", flex: "none" }}><Ik d="M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" /></span>
              <span>{zostava > 0 ? `Meškajúcich pridáš ešte ${Math.ceil(zostava / 60)} min. Potom sa skupina uzavrie.` : "Skupina je uzavretá. Pridať sa už nedá, odstrániť áno."}</span></div>
          </>}
          {org && mozePridat && !skener && <button type="button" onClick={() => { setSken(null); setSkener(true); }} style={{ minHeight: 56, borderRadius: 16, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Ik d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" s={20} />Skenovať účastníkov</button>}
          {org && mozePridat && !skener && <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)", marginTop: -6 }}>Účastník ukáže v appke Môj QR · Na akciu. Kód sa mení každých 15 s, snímka obrazovky neplatí.</div>}
          {org && mozePridat && <div style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, alignSelf: "stretch" }}>
              {logo ? <img src={logo} alt="" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover", background: "#fff", border: "1px solid var(--gBd)", flex: "none" }} />
                : <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gInk)", flex: "none" }}>{ini(org.nazov)}</span>}
              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}><b style={{ display: "block", fontSize: 15.5 }}>{org.nazov}</b><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>Alebo pre veľa ľudí naraz · QR charity</span></span>
            </div>
            {qrData ? <QrNaUkazanie qr={{ data: qrData, bezOdznaku: true }} size={a.stav === "sken" ? 220 : 180} popis={`Akcia ${org.nazov} · naskenujte v appke DEED+`} rotacia={{ sek }} ram={{ background: "#fff", borderRadius: 18, padding: 8 }} />
              : <div style={{ width: a.stav === "sken" ? 236 : 196, height: a.stav === "sken" ? 236 : 196, borderRadius: 18, background: "var(--field)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--ink3)" }}>Pripravuje sa kód…</div>}
            {qrData && <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 236, maxWidth: "100%" }}>
              <div style={{ height: 5, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--green)", transformOrigin: "left", transform: `scaleX(${sek / 15})`, transition: "transform .5s linear" }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink3)" }}><span>nový kód o <b style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{sek} s</b></span><span>snímka obrazovky neplatí</span></div>
            </div>}
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Dobrovoľníci tento QR naskenujú v appke cez Skenovať QR druhého alebo fotoaparátom. Tým sa pripoja ku skutku charity a dostanú ho do svojho denníka.</span>
          </div>}
          {kamera && <div style={{ position: "relative", height: a.stav === "sken" ? 230 : 180, borderRadius: 22, background: "#1D211B", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <video ref={videoRef} muted playsInline aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
            <div style={{ position: "relative", width: a.stav === "sken" ? 170 : 130, height: a.stav === "sken" ? 170 : 130, ["--akH" as string]: `${a.stav === "sken" ? 170 : 130}px` }}>
              {[["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]].map(([x, y]) => (
                <span key={x + y} aria-hidden="true" style={{ position: "absolute", [x]: 0, [y]: 0, width: 34, height: 34, [`border${x === "left" ? "Left" : "Right"}`]: "4px solid #8DB866", [`border${y === "top" ? "Top" : "Bottom"}`]: "4px solid #8DB866", borderRadius: x === "left" ? (y === "top" ? "10px 0 0 0" : "0 0 0 10px") : (y === "top" ? "0 10px 0 0" : "0 0 10px 0") }} />))}
              <span aria-hidden="true" className="ak-ciara" style={{ position: "absolute", left: 10, right: 10, top: 0, height: 2, background: "#8DB866", boxShadow: "0 0 12px #8DB866" }} />
            </div>
            <span style={{ position: "absolute", left: 0, right: 0, bottom: 12, textAlign: "center", fontSize: 13.5, fontWeight: 600, color: "rgba(241,236,225,.85)" }}>{org ? "Namierte na Môj QR účastníka" : "Namier na QR účastníka · Na akciu"}</span>
          </div>}
          {sken && <span role={sken.ok ? "status" : "alert"} style={{ fontSize: 14.5, fontWeight: 700, color: sken.ok ? "var(--gInk)" : "var(--cRed, #A34A2A)" }}>{sken.t}</span>}
          {org && skener && mozePridat && <button type="button" onClick={() => { setSkener(false); setSken(null); }} style={{ alignSelf: "flex-start", minHeight: 46, padding: "0 16px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Hotovo so skenovaním</button>}

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{org ? "ORGANIZÁTOR A DOBROVOĽNÍCI" : "ÚČASTNÍCI"}</h2><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{org ? `${a.uc.length} ${a.uc.length === 1 ? "dobrovoľník" : a.uc.length >= 2 && a.uc.length <= 4 ? "dobrovoľníci" : "dobrovoľníkov"}` : pocet}</span></div>
          <div aria-live="polite" style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "2px 12px" }}>
            {riadok(`${ja2} · organizátor`, org ? "vedúci skupiny · poverenie od charity" : "zakladáš akciu", 0)}
            {a.uc.map((u, i) => riadok(u.meno, org ? `príchod ${hm(u.prichod)}${u.odchod ? ` · odchod ${hm(u.odchod)}` : ""}` : `overený skenom · ${u.neskor ? "pridaný neskôr" : "od začiatku"}`, i + 1, () => odober(u.meno)))}
            {!a.uc.length && <div style={{ padding: "14px 0", fontSize: 14, color: "var(--ink3)", borderTop: "1px solid var(--cardBd)" }}>{org ? "Zatiaľ nikto. Vy ako organizátor ste v zozname automaticky." : "Zatiaľ nikto. Ty ako organizátor si v zozname automaticky."}</div>}
          </div>
          {a.stav === "sken" && <>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>MEŠKAJÚCICH PRIDÁŠ EŠTE</h2>
            <div role="radiogroup" aria-label="Meškajúcich pridáš ešte" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[30, 60, 120].map((m) => { const on = a.okno === m; return (
                <button type="button" role="radio" aria-checked={on} key={m} onClick={() => zmenAkciu({ okno: m })} style={{ height: 44, borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: on ? "var(--green)" : "var(--card)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "#fff" : "var(--ink)" }}>{m < 60 ? `${m} min` : `${m / 60} h`}</button>); })}
            </div>
          </>}
          {a.stav === "bezi" && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>{org ? "Dobrovoľníka môžete kedykoľvek odobrať krížikom, napríklad pri nevhodnom správaní. Stratí pripojenie k skutku aj karmu a zapíše sa to do záznamu zmien." : "Kto nič nerobil alebo robil problémy, toho odstráň krížikom. Nedostane karmu ani odmeny."}</div>}
          {org && a.stav === "bezi" && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>Odchod skenovať netreba. Keď je koniec, ukončíte akciu pre všetkých naraz. Kto chce potvrdenie o čase od–do, naskenuje QR aj pri odchode.</div>}
          {org && !!a.zaznam?.length && <>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ZÁZNAM ZMIEN</h2>
            <div style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "4px 12px" }}>
              {a.zaznam.map((z, i) => <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}><span style={{ flex: "none", fontWeight: 800, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{hm(z.cas)}</span><span>{z.kto} {z.co}</span></div>)}
            </div>
          </>}
        </div></div>
        <div style={{ flex: "none", padding: "12px 16px max(26px, env(safe-area-inset-bottom))", borderTop: "1px solid var(--cardBd)" }}>
          {/* OPRAVY 446 (6, 8): odpoveď na mieste tlačidla; Začať aj Ukončiť podržaním (vo vrecku sa neuklikne) */}
          {koniec ? <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 56, borderRadius: 18, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 16.5, fontWeight: 800, color: "var(--gInk)", textAlign: "center", padding: "0 12px" }}>{koniec.text}</div>
              <button type="button" onClick={koniec.dalej} style={{ width: "100%", height: 52, borderRadius: 16, border: "none", fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer", background: "var(--gGrad)", fontFamily: "inherit" }}>{org ? "Ďalej · Opíšte skutok" : "Ďalej · Opíš skutok"}</button>
            </div>
            : <>
              {hlaska && <div role="alert" style={{ marginBottom: 10, padding: "12px 14px", borderRadius: 14, background: "color-mix(in srgb, #A34A2A 12%, var(--card))", border: "1.5px solid #C8664A", fontSize: 15, fontWeight: 700, lineHeight: 1.4, color: "var(--ink)" }}>{hlaska}</div>}
              {a.stav === "sken"
                ? <PodrzTlacidlo label={org ? "Podržte · Začať akciu" : "Podrž · Začať akciu"} trvanie={1500} onConfirm={zacat} onHint={tukZacat} />
                : <PodrzTlacidlo label={org ? "Podržte · Ukončiť pre všetkých" : "Podrž · Ukončiť akciu"} trvanie={1500} onConfirm={ukoncit} />}
            </>}
        </div>
      </div>
    </div>, document.body);
}
