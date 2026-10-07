// KARTA 07 · Platobné okno — Suma → Spôsob → Zhrnutie → Podrž a zaplať → Spracovanie → (Hotovo = karta 09).
// Hárok nad detailom (mobil zdola, tablet 640 px na stred, PC 560 px na stred). Bez blur. Platba sa do cesty Späť nezapisuje.
import { usePoplatok } from "@/lib/poplatky";
import { DeedZnacka } from "@/components/DeedZnacka";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLayout } from "@/components/context";
import { usePouzivatel } from "@/lib/pouzivatel";
import { nacitajPredvolbu, ulozPredvolbu, useSektorDarcu, menoBezMena, volbaBezMena, type VerziaIdentity, type VolbaDaru } from "@/lib/darcovia";
import { toast } from "@/components/toast";
import PodrzTlacidlo from "./PodrzTlacidlo";
import { Svetlusik } from "./Svetlusik";
import { MIN_DAR_EUR, KARTA_OD_EUR } from "./nastavenie";
import type { KanalPlatby } from "./Sumy";
import { PodakovaniePoDare } from "./AnimovaneKomponenty";
import { hlaskaPoDare } from "./hlasky";
import { milnikyPre } from "./KartaStavu";

export type SposobEur = "karta" | "sepa";
export type VysledokPlatby = { kanal: KanalPlatby; sposob?: SposobEur; suma: number; eur: number; darDeed: number; volba?: VolbaDaru };

const DAR_PRE_NAS = 3; // € — dobrovoľný dar platforme (prototyp)
const KLUC_TUK = "deed.platba.potvrditTuknutim";
export const potvrditTuknutim = () => { try { return localStorage.getItem(KLUC_TUK) === "1"; } catch { return false; } };
export const nastavPotvrditTuknutim = (v: boolean) => { try { localStorage.setItem(KLUC_TUK, v ? "1" : "0"); } catch { /* LS */ } };

const e2 = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const eK = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const jednotka = (k: KanalPlatby) => (k === "eur" ? "€" : k === "deed" ? "DeeD" : "EURC");
const vSume = (n: number, k: KanalPlatby) => (k === "eur" ? eK(n) : `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} ${jednotka(k)}`);

type Krok = "suma" | "sposob" | "zhrnutie" | "spracovanie" | "hotovo";
/** stav zbierky tesne pred darom — pre poďakovanie a hlášku (karta 09) */
export type PredDarom = { vyzbierane: number; ciel: number | null; pocetDarov: number; darovDnes: number };

export function PlatobneOkno({ kanal, suma: sumaStart, nazov, registrovany, bonus, firma, pred, onHotovo, onClose }: {
  pred: PredDarom;
  kanal: KanalPlatby; suma?: number; nazov: string; registrovany: boolean;
  bonus?: (eur: number) => number;   // dorovnanie firmy k daru (len €)
  firma?: string;
  onHotovo: (v: VysledokPlatby) => void; onClose: () => void;
}) {
  const { wide, desktop } = useLayout();
  const sektor = useSektorDarcu();
  const eur = kanal === "eur";
  const [text, setText] = useState(sumaStart ? String(sumaStart).replace(".", ",") : "");
  const suma = Number(text.replace(",", ".")) || 0;
  const [krok, setKrok] = useState<Krok>(sumaStart ? (eur ? "sposob" : "zhrnutie") : "suma");
  const [sposob, setSposob] = useState<SposobEur | undefined>(undefined);
  const [darDeed, setDarDeed] = useState(false);
  const [nap, setNap] = useState(false); // nápoveda „Podrž tlačidlo…"
  const [volba, setVolba] = useState<VolbaDaru>(nacitajPredvolbu);
  const [otvorene, setOtvorene] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setOtvorene(true)); return () => cancelAnimationFrame(r); }, []);

  const kroky: Krok[] = eur ? ["suma", "sposob", "zhrnutie"] : ["suma", "zhrnutie"];
  const pod1 = eur && suma > 0 && suma < MIN_DAR_EUR;
  const mozeDalej = suma > 0 && !pod1;
  const eurHodnota = eur ? suma : kanal === "deed" ? suma / 100 : suma;
  // Zadanie 3 · 3.4: poplatok si appka pýta od servera (ten istý výpočet strhne platba) — platí ho darca navrch
  const pop = usePoplatok(eur && sposob ? (sposob === "karta" ? "fiat" : "sepa") : null, suma);
  const poplatok = pop.poplatok;
  const dar = eur && darDeed ? DAR_PRE_NAS : 0;
  const spolu = Math.round((suma + poplatok + dar) * 100) / 100;
  const dorovna = eur && bonus ? bonus(suma) : 0;

  const ja = usePouzivatel();
  const zatvor = () => { if (krok !== "spracovanie") { setOtvorene(false); setTimeout(onClose, 250); } };
  const dalej = () => {
    if (!mozeDalej) return;
    if (krok === "suma") setKrok(eur ? "sposob" : "zhrnutie");
  };
  const spat = () => { const i = kroky.indexOf(krok as Krok); if (i > 0) setKrok(kroky[i - 1]); else zatvor(); };
  const zaplat = () => {
    if (registrovany) ulozPredvolbu(volba);
    setKrok("spracovanie");
    setTimeout(() => { onHotovo({ kanal, sposob, suma, eur: eurHodnota, darDeed: dar, volba: registrovany ? volba : undefined }); setKrok("hotovo"); }, 1800);
  };

  // klávesnica (PC): čísla, čiarka, Backspace, Enter = ďalej, Esc = zavrieť
  const pridajZnak = (z: string) => setText((t) => {
    if (z === "⌫") return t.slice(0, -1);
    if (z === ",") return !eur && kanal === "deed" ? t : t.includes(",") ? t : (t || "0") + ",";
    const n = (t === "0" ? "" : t) + z;
    const [, des] = n.split(",");
    if (des && des.length > 2) return t;
    return n.length > 7 ? t : n;
  });
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { zatvor(); return; }
      if (krok !== "suma") return;
      if (/^[0-9]$/.test(e.key)) pridajZnak(e.key);
      else if (e.key === "," || e.key === ".") pridajZnak(",");
      else if (e.key === "Backspace") pridajZnak("⌫");
      else if (e.key === "Enter") dalej();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const hlavicka = (
    <div style={{ flex: "none", padding: wide ? "18px 18px 0" : "10px 18px 0" }}>
      {!wide && <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--handle)", margin: "0 auto 12px" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--bSoft)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: eur ? 19 : 13, fontWeight: 800, flex: "none" }}>{eur ? "€" : jednotka(kanal)}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>{eur ? "Platba v eurách" : kanal === "deed" ? "Platba v DeeD" : "Platba v EURC"}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nazov} · {eur ? "karta / prevod" : "z peňaženky"}</span>
        </span>
        {krok !== "spracovanie" && (
          <button type="button" onClick={zatvor} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "var(--btn)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>
      {krok !== "spracovanie" && krok !== "hotovo" && (
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {kroky.map((k, i) => {
            const ai = kroky.indexOf(krok), hotovy = i <= ai;
            return (
              <button key={k} type="button" onClick={() => { if (i < ai) setKrok(k); }}
                style={{ flex: 1, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: i < ai ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 5, textAlign: "left", fontFamily: "inherit" }}>
                <span style={{ height: 3, borderRadius: 3, background: hotovy ? "var(--green)" : "var(--track)", transition: "background .3s ease" }} />
                <span style={{ fontSize: 12, fontWeight: i === ai ? 800 : 600, color: i === ai ? "var(--ink)" : hotovy ? "var(--green)" : "var(--ink4)" }}>{k === "suma" ? "Suma" : k === "sposob" ? "Spôsob" : "Zhrnutie"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  let obsah: ReactNode, pata: ReactNode = null;
  if (krok === "suma") {
    const plus = kanal === "deed" ? [50, 100, 500] : [5, 10, 25];
    const klavesy = ["1", "2", "3", "4", "5", "6", "7", "8", "9", kanal === "deed" ? "" : ",", "0", "⌫"];
    obsah = (
      <>
        <div style={{ textAlign: "center", paddingTop: 10 }}>
          <span style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{text || "0"}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "var(--ink3)", marginLeft: 6 }}>{jednotka(kanal)}</span>
        </div>
        {pod1 && <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--ink3)" }}>Najmenší dar v eurách je 1 €.</div>}
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {plus.map((p) => (
            <button key={p} type="button" onClick={() => setText(String(Math.round((suma + p) * 100) / 100).replace(".", ","))}
              style={{ padding: "8px 16px", borderRadius: 99, border: "1px solid var(--fieldBd)", background: "var(--key)", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "var(--ink)", fontFamily: "inherit" }}>+{p}</button>
          ))}
        </div>
        {!desktop && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, marginTop: "auto" }}>
            {klavesy.map((k, i) => k ? (
              <button key={i} type="button" className="zb-kl" onClick={() => pridajZnak(k)} aria-label={k === "⌫" ? "Zmazať" : k}
                style={{ height: 52, borderRadius: 14, border: "none", background: "var(--key)", fontSize: 22, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>{k}</button>
            ) : <span key={i} />)}
          </div>
        )}
        {desktop && <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--ink3)" }}>Sumu napíš z klávesnice · Enter pokračuje · Esc zavrie</div>}
      </>
    );
    pata = <HlavneTlacidlo disabled={!mozeDalej} onClick={dalej}>Ďalej</HlavneTlacidlo>;
  } else if (krok === "sposob") {
    const kartaNie = suma < KARTA_OD_EUR;
    obsah = (
      <>
        <div style={{ fontSize: 14, color: "var(--ink2)" }}>Vyber spôsob platby pre <b style={{ fontVariantNumeric: "tabular-nums" }}>{eK(suma)}</b></div>
        <MoznostSposobu disabled={kartaNie} onClick={() => { setSposob("karta"); setKrok("zhrnutie"); }} ikona={IKONA_KARTA}
          nadpis="Platobná karta" popis="1,4 % + 0,15 € · hneď" />
        {kartaNie && <div style={{ marginTop: -6, fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)", padding: "0 4px" }}>Kartou sa dá platiť od 3 €.</div>}
        <MoznostSposobu onClick={() => { setSposob("sepa"); setKrok("zhrnutie"); }} ikona={IKONA_BANKA}
          nadpis="Bankový prevod (SEPA)" popis="bez poplatku · do 1 prac. dňa" />
      </>
    );
    pata = <SekundarneTlacidlo onClick={spat}>Späť</SekundarneTlacidlo>;
  } else if (krok === "zhrnutie") {
    obsah = (
      <>
        {dorovna > 0 && (
          <div style={{ padding: "13px 15px", borderRadius: 16, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>Tvojich {eK(suma)} → zbierka dostane <span style={{ color: "var(--gold)" }}>{eK(suma + dorovna)}</span></div>
            <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 2, lineHeight: 1.4 }}>{firma} k tvojmu daru pridá {eK(dorovna)} zo svojej vyčlenenej sumy.</div>
          </div>
        )}
        {registrovany
          ? <Identita volba={volba} setVolba={setVolba} eur={eurHodnota} />
          : <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
              <span style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--track)", color: "var(--ink4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flex: "none" }}>?</span>
              <span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>V zozname darcov sa zobrazíš ako</span><span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{menoBezMena(sektor)}</span></span>
            </div>}
        <RiadokPlatby kanal={kanal} sposob={sposob} registrovany={registrovany} />
        <div style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "4px 16px" }}>
          <Riadok l="Suma" v={vSume(suma, kanal)} />
          {poplatok > 0 && <Riadok l={`Poplatok (${pop.popis})`} v={e2(poplatok)} />}
          {eur && (
            <div onClick={() => setDarDeed(!darDeed)} role="checkbox" aria-checked={darDeed} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--cardBd)", cursor: "pointer" }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${darDeed ? "var(--green)" : "var(--chkBd)"}`, background: darDeed ? "var(--green)" : "transparent", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                {darDeed && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
              <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>Dar pre nás — chod <DeedZnacka /></span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>dobrovoľné · ide platforme, nie príjemcovi</span></span>
              <span style={{ fontSize: 14.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: darDeed ? "var(--ink)" : "var(--ink4)" }}>{e2(DAR_PRE_NAS)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 0 11px", fontSize: 16.5, fontWeight: 800 }}><span>Spolu</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{eur ? e2(spolu) : vSume(suma, kanal)}</span></div>
        </div>
        {nap && <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 13, fontWeight: 600, color: "var(--gInk)" }}>Podrž tlačidlo, kým sa nenaplní.</div>}
        {sposob === "karta" && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink3)", padding: "0 4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" /></svg>Zabezpečené cez 3-D Secure</div>}
      </>
    );
    const label = `${potvrditTuknutim() ? "Zaplatiť" : "Podrž a zaplať"} ${eur ? e2(spolu) : vSume(suma, kanal)}`;
    pata = (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <SekundarneTlacidlo onClick={spat}>Späť</SekundarneTlacidlo>
        {potvrditTuknutim()
          ? <HlavneTlacidlo onClick={zaplat}>{label}</HlavneTlacidlo>
          : <PodrzTlacidlo label={label} onConfirm={zaplat} onHint={() => setNap(true)} />}
      </div>
    );
  } else if (krok === "hotovo") {
    // karta 09 — poďakovanie (hotový komponent dizajnéra): Svetlúšik, roj do pruhu, hláška
    const po = pred.vyzbierane + eurHodnota + dorovna;
    const G = pred.ciel;
    const m0 = milnikyPre(pred.vyzbierane), m1 = milnikyPre(po);
    obsah = (
      <PodakovaniePoDare meno={ja.meno} registrovany={registrovany} eur={eurHodnota} sumaTxt={vSume(suma, kanal)}
        dorovnanieTxt={dorovna > 0 ? eK(dorovna) : undefined} firma={firma}
        predPct={G ? Math.min(1, pred.vyzbierane / G) : pred.vyzbierane / m0.dalsi} poPct={G ? Math.min(1, po / G) : Math.min(1, po / m1.dalsi)}
        poTxt={G ? `${eK(po)} z ${eK(G)}` : `Vyzbierané ${eK(po)}`} poPctTxt={G ? `${Math.floor((po / G) * 100)} %` : `ďalší míľnik ${eK(m1.dalsi)}`}
        hlaska={hlaskaPoDare({ vyzbierane: pred.vyzbierane, ciel: G, pocetDarov: pred.pocetDarov, darovDnes: pred.darovDnes }, { eur: eurHodnota, dorovnanie: dorovna, registrovany })}
        onRegistrovat={() => toast("Registrácia s pripísaním daru — karta 08")} onHotovo={zatvor} />
    );
  } else {
    obsah = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, textAlign: "center", minHeight: 320 }}>
        <Svetlusik size={112} />
        <div style={{ fontSize: 17, fontWeight: 700 }}>{!eur ? `Posielam ${jednotka(kanal)} príjemcovi` : sposob === "sepa" ? "Posielam prevod príjemcovi" : "Overujem kartu cez platobnú bránu"}</div>
        <div style={{ fontSize: 13.5, color: "var(--ink3)" }}>Neprerušuj to, trvá to pár sekúnd.</div>
      </div>
    );
  }

  const sirka = desktop ? 560 : wide ? 640 : undefined;
  const okno: CSSProperties = wide
    ? { position: "relative", width: sirka, maxWidth: "calc(100vw - 32px)", maxHeight: "min(760px, calc(100vh / var(--pismo, 1) - 48px))", borderRadius: 28,
        transform: otvorene ? "none" : "translateY(24px)", opacity: otvorene ? 1 : 0 }
    : { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "92%", borderRadius: "28px 28px 0 0", transform: otvorene ? "none" : "translateY(105%)" }; // mobil zdola, tablet/PC v strede

  return createPortal(
    <div className="deed-platba" role="dialog" aria-modal="true" aria-label="Platba"
      style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div onClick={zatvor} style={{ position: "absolute", inset: 0, background: "var(--scrim)", opacity: otvorene ? 1 : 0, transition: "opacity .32s ease" }} />
      <div style={{ ...okno, background: "var(--sheet)", color: "var(--ink)", display: "flex", flexDirection: "column", overflow: "hidden",
        transition: "transform .32s cubic-bezier(.2,.8,.2,1), opacity .32s ease" }}>
        {hlavicka}
        <div key={krok} className="zb-krok" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>{obsah}</div>
        {pata && <div style={{ flex: "none", padding: "10px 18px max(18px, env(safe-area-inset-bottom))" }}>{pata}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------------- kúsky ----------------
const IKONA_KARTA = <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></svg>;
const IKONA_BANKA = <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></svg>;
const IKONA_PENAZENKA = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h2M3 9h15a3 3 0 0 0 3-3" /></svg>;

function HlavneTlacidlo({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: disabled ? "default" : "pointer", opacity: disabled ? .45 : 1, fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }}>
      {children}
    </button>
  );
}
function SekundarneTlacidlo({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: "var(--btn)", color: "var(--ink)", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>;
}
function MoznostSposobu({ ikona, nadpis, popis, onClick, disabled }: { ikona: ReactNode; nadpis: string; popis: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="zb-karta" onClick={onClick} disabled={disabled}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", textAlign: "left", cursor: disabled ? "default" : "pointer", opacity: disabled ? .45 : 1, fontFamily: "inherit", color: "var(--ink)" }}>
      {ikona}
      <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{nadpis}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>{popis}</span></span>
      <span style={{ fontSize: 18, color: "var(--ink4)" }}>›</span>
    </button>
  );
}
function Riadok({ l, v }: { l: string; v: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", fontSize: 14.5, borderBottom: "1px solid var(--cardBd)" }}><span style={{ color: "var(--ink2)" }}>{l}</span><span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</span></div>;
}
/** uložený spôsob platby registrovaného (DEV: ukážka z prototypu, kým nie je platobná brána) */
function RiadokPlatby({ kanal, sposob, registrovany }: { kanal: KanalPlatby; sposob?: SposobEur; registrovany: boolean }) {
  if (kanal !== "eur") return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, background: "var(--gCard)", border: "1px solid var(--gBd)" }}>
      {IKONA_PENAZENKA}<span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>Peňaženka {jednotka(kanal)}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>bez poplatku · hneď</span></span>
    </div>
  );
  if (!registrovany) return null; // neregistrovaný vypĺňa kartu / IBAN — karta 08
  const karta = sposob === "karta";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, background: "var(--gCard)", border: "1px solid var(--gBd)" }}>
      {karta ? IKONA_KARTA : IKONA_BANKA}
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{karta ? "Visa •••• 4242" : "SK31 •••• 4421"}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{karta ? "Uložená karta · platnosť 08/28" : "SEPA · bez poplatku · do 1 prac. dňa"}</span>
      </span>
      <span role="button" onClick={() => toast("Zmena spôsobu platby — napojí sa na platobnú bránu")} style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)", cursor: "pointer" }}>Zmeniť</span>
    </div>
  );
}
/** „V ZOZNAME DARCOV SA UKÁŽEŠ AKO" + „Zobraziť sumu" (do 2 € sa suma nezobrazí nikdy) */
export function Identita({ volba, setVolba, eur }: { volba: VolbaDaru; setVolba: (v: VolbaDaru) => void; eur: number }) {
  const ja = usePouzivatel();
  const sektor = useSektorDarcu();
  const bezMena = volbaBezMena(sektor);
  const meno = ja.meno || "Darca", priezv = ja.priezvisko || "";
  const moznosti = useMemo((): [VerziaIdentity, string][] => [
    [2, `${meno}${priezv ? ` ${priezv[0]}.` : ""}`], [1, `${meno} ${priezv}`.trim()],
    ...(ja.mesto ? [[5, `${`${meno} ${priezv}`.trim()}, ${ja.mesto}`] as [VerziaIdentity, string]] : []),
    ...(ja.nick ? [[3, ja.nick] as [VerziaIdentity, string]] : []), [4, bezMena],
  ], [meno, priezv, ja.mesto, ja.nick, bezMena]);
  const vybrane = moznosti.find(([v]) => v === volba.verzia)?.[1] ?? bezMena;
  const nad2 = eur > 2;
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)", marginTop: 2 }}>V ZOZNAME DARCOV SA UKÁŽEŠ AKO</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -18px", padding: "0 18px 2px", scrollbarWidth: "none" }}>
        {moznosti.map(([v, l]) => {
          const on = v === volba.verzia;
          return <button key={v} type="button" onClick={() => setVolba({ ...volba, verzia: v })}
            style={{ flex: "none", padding: "9px 14px", borderRadius: 99, border: `1.5px solid ${on ? "var(--gBd)" : "var(--pillBd)"}`, background: on ? "var(--gSoft)" : "transparent", color: on ? "var(--gInk)" : "var(--ink2)", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>{l}</button>;
        })}
      </div>
      {nad2 ? (
        <div onClick={() => setVolba({ ...volba, zobrazSumu: !volba.zobrazSumu })} role="switch" aria-checked={volba.zobrazSumu}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer" }}>
          <span style={{ position: "relative", width: 44, height: 26, borderRadius: 99, background: volba.zobrazSumu ? "var(--green)" : "var(--track)", flex: "none", transition: "background .25s ease" }}>
            <span style={{ position: "absolute", top: 3, left: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transform: `translateX(${volba.zobrazSumu ? 18 : 0}px)`, transition: "transform .3s cubic-bezier(.3,1.4,.5,1)" }} />
          </span>
          <span><span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>Zobraziť sumu daru</span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{vybrane}{volba.zobrazSumu && volba.verzia !== 4 ? ` · ${eK(eur)}` : ""}</span></span>
        </div>
      ) : <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>Pri daroch do 2 € sa suma v zozname nezobrazuje.</div>}
    </>
  );
}
