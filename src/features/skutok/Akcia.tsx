// KARTA 22 · Organizovaná akcia (celá obrazovka sprava): skener účastníkov → Začať akciu (čas + GPS)
// → Akcia beží (okno pre meškajúcich, odstránenie krížikom) → Ukončiť akciu → Pridať skutok krok 2.
// Vstupy: Pridať skutok → So skupinou → Akcia práve začína · Môj QR → Organizujem akciu.
import { TESTOVACIA } from "@/lib/testovacia";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { toast } from "@/components/toast";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useLokalita } from "@/lib/lokalita";
import { useAkcia, nastavAkciu, zmenAkciu, cas, type Akcia } from "@/lib/akcia";
import { vibruj } from "@/features/zbierka/animacie";
import { otvorPridatSkutok } from "./otvor";
import { DeedQr } from "@/components/deedqr";
import { useEventToken } from "@/data";
import { profilZPamate } from "@/lib/profilStranky";
import "@/styles/platba.css";

const Ik = ({ d, s = 18, w = 2 }: { d: string; s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const POLOHA = "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
const DEMO_MENA = ["Lucia H.", "Tomáš B.", "Jana N.", "Peťo K.", "Mária S.", "Ondrej V.", "Katka L.", "Miro D.", "Zuzana P.", "Adam R."];
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
  const { data: token } = useEventToken(org && a.id ? a.id : null, 15, "threshold", org?.nazov);
  const qrData = token ?? `https://deed.sk/q/akcia/${a.id ?? "charita"}.charita`;
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
  // kamera: číta QR „Na akciu" (deed.sk/q/akcia/…). Meno účastníka doplní server pri overení tokenu.
  useEffect(() => {
    if (!a.otvorena || !mozePridat || !videoRef.current) return;
    let zrusene = false;
    new BrowserQRCodeReader().decodeFromVideoDevice(undefined, videoRef.current, (r) => {
      const m = r?.getText().match(/\/q\/akcia\/([^.]+)\./);
      if (m) pridaj(`Účastník ${decodeURIComponent(m[1]).slice(-4)}`);
    }).then((c) => { ovladanie.current = c; if (zrusene) c.stop(); }).catch(() => { /* bez kamery — ostáva tlačidlo */ });
    return () => { zrusene = true; try { ovladanie.current?.stop(); } catch { /* už zastavená */ } ovladanie.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.otvorena, mozePridat]);

  const naskenuj = () => {
    if (!mozePridat) return;
    if (TESTOVACIA) { const n = DEMO_MENA.find((m) => !a.uc.some((u) => u.meno === m)); if (n) pridaj(n); return; }
    if (org) return; // dobrovoľník sa pripojí sám skenom QR charity vo svojej appke
    toast("Namier kameru na QR účastníka v jeho appke · Môj QR · Na akciu");
  };
  const zacat = () => {
    if (!a.uc.length) return;
    const start = () => nastavAkciu({ ...aRef.current, stav: "bezi", start: Date.now(), miesto: aRef.current.miesto || lok.mesto });
    if (!navigator.geolocation) { toast("Bez polohy akciu nespustíš. Zapni ju v nastaveniach telefónu."); return; }
    navigator.geolocation.getCurrentPosition(start, () => toast("Bez polohy akciu nespustíš. Zapni ju v nastaveniach telefónu."), { timeout: 10000 });
  };
  const ukoncit = () => {
    const min = Math.max(1, Math.round(el / 60));
    const trvanie = min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
    const x = aRef.current;
    nastavAkciu(null);
    if (x.org) { // koniec ukončí organizátor pre všetkých naraz (odchod skenovať netreba)
      otvorPridatSkutok({ start: "skupina", organizacia: true, strankaId: x.org.stranka, autor: x.org.nazov, zAkcie: { ucastnici: x.uc.map((u) => u.meno), miesto: x.miesto || lok.mesto, trvanie, dar: x.dar, zaznam: x.zaznam } });
      return;
    }
    otvorPridatSkutok({ start: "skupina", zAkcie: { ucastnici: x.uc.map((u) => u.meno), miesto: x.miesto || lok.mesto, trvanie, dar: x.dar } });
  };
  const skry = () => (a.stav === "sken" && !a.uc.length ? nastavAkciu(null) : zmenAkciu({ otvorena: false }));
  const ja2 = org ? org.organizator || ja.celeMeno || "Organizátor" : ja.celeMeno ? ja.celeMeno.replace(/^(\S+)\s+(\S).*$/, "$1 $2.") : "Ty";
  /** OPRAVY 121: organizátor odoberie účastníka — stratí pripojenie aj karmu, zapíše sa do záznamu zmien */
  const odober = (meno: string) => {
    const x = aRef.current;
    nastavAkciu({ ...x, uc: x.uc.filter((u) => u.meno !== meno), ...(x.org ? { zaznam: [...(x.zaznam ?? []), { cas: Date.now(), kto: ja2, co: `odobral účastníka ${meno}` }] } : {}) });
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
          {a.stav === "sken" && <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 13, background: "var(--bSoft)", border: "1px solid var(--bBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>
            <span style={{ color: "var(--blue)", display: "flex", flex: "none", marginTop: 1 }}><Ik d={POLOHA} /></span><span><b style={{ color: "var(--ink)" }}>Organizátor musí mať zapnuté GPS</b> počas celej akcie. {org ? "Dobrovoľníkom" : "Účastníkom"} odporúčame fotiť a natáčať so zapnutou polohou, dôkazy sú potom silnejšie.</span></div>}
          {a.stav === "bezi" && <>
            <div style={{ borderRadius: 22, background: "#1D211B", color: "#F1ECE1", padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "#8DB866" }}><span aria-hidden="true" className="zb-pulz" style={{ width: 8, height: 8, borderRadius: "50%", background: "#8DB866" }} />AKCIA BEŽÍ</div>
              <div role="timer" aria-label={`Čas akcie ${cas(el)}`} style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{cas(el)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "rgba(241,236,225,.75)" }}><Ik d={POLOHA} s={15} />{a.miesto} · GPS zapnuté</div>
            </div>
            <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: zostava > 0 ? "var(--gSoft)" : "var(--card)", border: `1px solid ${zostava > 0 ? "var(--gBd)" : "var(--cardBd)"}`, fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>
              <span style={{ color: "var(--green)", display: "flex", flex: "none" }}><Ik d="M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" /></span>
              <span>{zostava > 0 ? `Meškajúcich pridáš ešte ${Math.ceil(zostava / 60)} min. Potom sa skupina uzavrie.` : "Skupina je uzavretá. Pridať sa už nedá, odstrániť áno."}</span></div>
          </>}
          {org && mozePridat && <div style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, alignSelf: "stretch" }}>
              {logo ? <img src={logo} alt="" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover", background: "#fff", border: "1px solid var(--gBd)", flex: "none" }} />
                : <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gInk)", flex: "none" }}>{ini(org.nazov)}</span>}
              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}><b style={{ display: "block", fontSize: 15.5 }}>{org.nazov}</b><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>QR charity · akčný, obnovuje sa</span></span>
            </div>
            <DeedQr data={qrData} size={a.stav === "sken" ? 220 : 180} variant={document.documentElement.classList.contains("dark") ? "inverzny" : "svetly"} />
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Dobrovoľníci tento QR naskenujú vo svojej appke pri príchode. Tým sa pripoja ku skutku charity a dostanú ho aj s karmou do svojho denníka. Snímka obrazovky neplatí.</span>
          </div>}
          {!org && mozePridat && <div style={{ position: "relative", height: a.stav === "sken" ? 230 : 180, borderRadius: 22, background: "#1D211B", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <video ref={videoRef} muted playsInline aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
            <div style={{ position: "relative", width: a.stav === "sken" ? 170 : 130, height: a.stav === "sken" ? 170 : 130, ["--akH" as string]: `${a.stav === "sken" ? 170 : 130}px` }}>
              {[["left", "top"], ["right", "top"], ["left", "bottom"], ["right", "bottom"]].map(([x, y]) => (
                <span key={x + y} aria-hidden="true" style={{ position: "absolute", [x]: 0, [y]: 0, width: 34, height: 34, [`border${x === "left" ? "Left" : "Right"}`]: "4px solid #8DB866", [`border${y === "top" ? "Top" : "Bottom"}`]: "4px solid #8DB866", borderRadius: x === "left" ? (y === "top" ? "10px 0 0 0" : "0 0 0 10px") : (y === "top" ? "0 10px 0 0" : "0 0 10px 0") }} />))}
              <span aria-hidden="true" className="ak-ciara" style={{ position: "absolute", left: 10, right: 10, top: 0, height: 2, background: "#8DB866", boxShadow: "0 0 12px #8DB866" }} />
            </div>
            <span style={{ position: "absolute", left: 0, right: 0, bottom: 12, textAlign: "center", fontSize: 13.5, fontWeight: 600, color: "rgba(241,236,225,.85)" }}>Namier na QR účastníka · Na akciu</span>
          </div>}
          {mozePridat && (!org || TESTOVACIA) && <button type="button" onClick={naskenuj} style={{ height: 50, borderRadius: 15, border: "1px solid var(--gBd)", background: "var(--gSoft)", fontSize: 15, fontWeight: 800, color: "var(--gInk)", cursor: "pointer", fontFamily: "inherit" }}>{org ? "Simulovať príchod (DEV)" : a.stav === "bezi" ? "Naskenovať ďalšieho" : "Naskenovať účastníka"}</button>}

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ÚČASTNÍCI</h2><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{pocet}</span></div>
          <div aria-live="polite" style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "2px 12px" }}>
            {riadok(`${ja2} · organizátor`, org ? "zakladáte akciu" : "zakladáš akciu", 0)}
            {a.uc.map((u, i) => riadok(u.meno, org ? `príchod ${hm(u.prichod)} · sken QR charity${u.odchod ? ` · odchod ${hm(u.odchod)}` : ""}` : `overený skenom · ${u.neskor ? "pridaný neskôr" : "od začiatku"}`, i + 1, () => odober(u.meno)))}
            {!a.uc.length && <div style={{ padding: "14px 0", fontSize: 14, color: "var(--ink3)", borderTop: "1px solid var(--cardBd)" }}>{org ? "Zatiaľ nikto. Vy ako organizátor ste v zozname automaticky." : "Zatiaľ nikto. Ty ako organizátor si v zozname automaticky."}</div>}
          </div>
          {a.stav === "sken" && <>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>MEŠKAJÚCICH PRIDÁŠ EŠTE</h2>
            <div role="radiogroup" aria-label="Meškajúcich pridáš ešte" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[30, 60, 120].map((m) => { const on = a.okno === m; return (
                <button type="button" role="radio" aria-checked={on} key={m} onClick={() => zmenAkciu({ okno: m })} style={{ height: 44, borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: on ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink)" }}>{m < 60 ? `${m} min` : `${m / 60} h`}</button>); })}
            </div>
          </>}
          {a.stav === "bezi" && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>{org ? "Účastníka môžete kedykoľvek odobrať krížikom, napríklad pri nevhodnom správaní. Stratí pripojenie k skutku aj karmu a zapíše sa to do záznamu zmien." : "Kto nič nerobil alebo robil problémy, toho odstráň krížikom. Nedostane karmu ani odmeny."}</div>}
          {org && a.stav === "bezi" && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>Odchod skenovať netreba. Keď je koniec, ukončíte akciu pre všetkých naraz. Kto chce potvrdenie o čase od–do, naskenuje QR aj pri odchode.</div>}
          {org && !!a.zaznam?.length && <>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ZÁZNAM ZMIEN</h2>
            <div style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "4px 12px" }}>
              {a.zaznam.map((z, i) => <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}><span style={{ flex: "none", fontWeight: 800, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{hm(z.cas)}</span><span>{z.kto} {z.co}</span></div>)}
            </div>
          </>}
        </div></div>
        <div style={{ flex: "none", padding: "12px 16px max(26px, env(safe-area-inset-bottom))", borderTop: "1px solid var(--cardBd)" }}>
          {a.stav === "sken"
            ? <button type="button" onClick={zacat} aria-disabled={!a.uc.length} style={{ width: "100%", height: 56, borderRadius: 18, border: "none", fontSize: 17, fontWeight: 800, color: "#fff", cursor: "pointer", background: "var(--gGrad)", opacity: a.uc.length ? 1 : 0.45, fontFamily: "inherit" }}>Začať akciu</button>
            : <button type="button" onClick={ukoncit} style={{ width: "100%", height: 56, borderRadius: 18, border: "none", fontSize: 17, fontWeight: 800, color: "#fff", cursor: "pointer", background: "#1D211B", fontFamily: "inherit" }}>{org ? "Ukončiť pre všetkých" : "Ukončiť akciu"}</button>}
        </div>
      </div>
    </div>, document.body);
}
