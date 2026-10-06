// KARTA 11 · Postup firmy — Nové dorovnanie → Skontrolujte a zapečaťte (① Úhrada ② Pečať) → Zapečatené.
// Všetko zlaté, firme sa vyká, jedno tlačidlo, ktoré sa mení. Úhrada firmy nie je dar → žiadne poďakovanie darcu.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { zapecat, DOROVNANIE_CFG } from "@/lib/dorovnanie";
import { pripniVyclenene } from "@/lib/podpory";
import { Harok } from "./Zdielat";
import PodrzTlacidlo from "./PodrzTlacidlo";
import { Svetlusik } from "./Svetlusik";
import { potvrditTuknutim, poplatokKarty } from "./Platba";

const STROP_MAX = 300, STROP_MIN = 50, DEN = 86400000;
const eS = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const e2 = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const datumSk = (t: number) => new Date(t).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
const POMER_L: Record<number, string> = { 0.5: "+50 %", 1: "1 : 1", 2: "2 : 1", 5: "5 : 1" };
const POMER_SLOVOM: Record<number, string> = { 0.5: "polovicu", 1: "rovnakú sumu", 2: "dvojnásobok", 5: "päťnásobok" };

type Krok = "formular" | "kontrola" | "platim" | "zapecatene";

const nadpis: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)", marginTop: 6 };
const pole: CSSProperties = { display: "flex", alignItems: "center", gap: 8, height: 52, padding: "0 16px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--goldBd)" };
const vstup: CSSProperties = { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 19, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums", fontFamily: "inherit" };
const volba = (on: boolean): CSSProperties => ({ borderRadius: 14, background: on ? "var(--goldBg)" : "var(--card)", border: `1.5px solid ${on ? "var(--goldBd)" : "var(--cardBd)"}`, color: on ? "var(--gold)" : "var(--ink)", cursor: "pointer", fontFamily: "inherit" });

function Pecat({ velka, anim, datum }: { velka?: boolean; anim?: boolean; datum?: string }) {
  const r = velka ? 96 : 104;
  return (
    <div style={{ width: r, height: r, borderRadius: "50%", border: "3px solid #876712", color: "#876712", background: velka ? "var(--goldBg)" : "rgba(226,215,191,.92)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: velka ? 11 : 12, fontWeight: 800, letterSpacing: ".08em",
      transform: "rotate(-10deg)", animation: anim ? "sealIn .6s cubic-bezier(.2,.8,.2,1) both" : undefined }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>◆</span>ZAPEČATENÉ
      {datum && <span style={{ fontSize: 10.5, letterSpacing: ".02em", fontWeight: 700 }}>{datum}</span>}
    </div>
  );
}

function HlavneTlacidlo({ label, podrz, onConfirm, disabled, zelene }: { label: string; podrz: boolean; onConfirm: () => void; disabled?: boolean; zelene?: boolean }) {
  if (podrz) return <PodrzTlacidlo label={label} farba="zlata" onConfirm={onConfirm} disabled={disabled} />;
  return (
    <button type="button" disabled={disabled} onClick={onConfirm}
      style={{ height: 56, borderRadius: 16, border: "none", background: zelene ? "linear-gradient(90deg,#4B7A35,#8DB866)" : "linear-gradient(90deg,#8A6A1C,#C9A24A)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1, fontFamily: "inherit" }}>
      {label}
    </button>
  );
}

/** firmaUcet = číslo účtu firmy (identita, lib/firma) · firma = názov len na zobrazenie */
export function DorovnanieFirmyHarok({ zbierkaId, zbierkaNazov, firmaUcet, firma, onClose }: { zbierkaId: string; zbierkaNazov: string; firmaUcet: string; firma: string; onClose: () => void }) {
  const [krok, setKrok] = useState<Krok>("formular");
  const [dnes] = useState(() => Date.now());
  const [pomer, setPomer] = useState(DOROVNANIE_CFG.pomer);
  const [stropIn, setStropIn] = useState(String(STROP_MAX));
  const [stropDaru, setStropDaru] = useState(STROP_MAX);
  const [rozpocetIn, setRozpocetIn] = useState("5000");
  const [doKedy, setDoKedy] = useState(() => Date.now() + 30 * DEN);
  const [zvysok, setZvysok] = useState<"zbierke" | "firme">("zbierke");
  const [lenZam, setLenZam] = useState(false);
  const [kanal, setKanal] = useState<"karta" | "sepa">("karta");
  const [uhradene, setUhradene] = useState<number | null>(null);
  const [pecati, setPecati] = useState(false);
  const podrz = !potvrditTuknutim();
  const casy = useRef<number[]>([]);
  const obalRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const sc = obalRef.current?.parentElement; if (sc) sc.scrollTop = 0; }, [krok]); // nový krok od vrchu
  useEffect(() => () => casy.current.forEach(clearTimeout), []);
  const neskor = (f: () => void, ms: number) => { casy.current.push(window.setTimeout(f, ms)); };

  const rozpocet = Math.max(0, parseInt(rozpocetIn.replace(/\s/g, ""), 10) || 0);
  const poplatok = kanal === "karta" ? poplatokKarty(rozpocet) : 0;
  const stropNad = (parseInt(stropIn, 10) || 0) > STROP_MAX;
  const pokryje = rozpocet > 0 ? `pokryje približne ${Math.floor(rozpocet / Math.min(20 * pomer, stropDaru)).toLocaleString("sk-SK")} darov po 20 €` : "zadajte sumu";
  const sepa = kanal === "sepa";

  const uhrad = () => { setKrok("platim"); neskor(() => { setUhradene(Date.now()); setKrok("kontrola"); }, 1700); };
  const zapecatNaozaj = () => {
    setPecati(true);
    neskor(() => {
      const od = Date.now();
      zapecat({ entita: "charita", ciel: zbierkaId, cielNazov: zbierkaNazov, firmaUcet, firma, pomer, strop: rozpocet, stropDaru, od, do: doKedy,
        zvysok, lenZamestnanci: lenZam || undefined, kanal });
      pripniVyclenene(firmaUcet, zbierkaId, rozpocet, firma);
      try { navigator.vibrate?.([10, 40, 16]); } catch { /* bez vibrácie */ }
      setPecati(false); setKrok("zapecatene");
    }, 1100);
  };

  const ikona = krok === "zapecatene" ? "✓" : "◆";
  const titul = krok === "formular" ? "Nové dorovnanie" : krok === "zapecatene" ? "Zapečatené" : uhradene ? "Krok 2 · Zapečaťte podmienky" : "Krok 1 · Uhraďte rozpočet";
  const hlavicka = (
    <>
      <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--goldBg)", border: "1px solid var(--goldBd)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, flex: "none" }}>{ikona}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>{titul}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firma}</span>
      </span>
    </>
  );

  let obsah: ReactNode;
  if (krok === "formular") {
    obsah = (
      <>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>Toto vyplníte vy za firmu. Sú to vaše peniaze a vaše podmienky.</div>
        <div style={nadpis}>KTORÚ ZBIERKU DOROVNÁVATE</div>
        <div style={{ padding: "13px 14px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", fontSize: 15, fontWeight: 700 }}>{zbierkaNazov}</div>
        <div style={nadpis}>KOĽKO PRIDÁTE KU KAŽDÉMU DARU</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {DOROVNANIE_CFG.pomery.map((r) => (
            <button key={r} type="button" onClick={() => setPomer(r)} style={{ ...volba(pomer === r), padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{POMER_L[r] ?? `${r} : 1`}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>z 20 € bude {eS(20 + 20 * r)}</span>
            </button>
          ))}
        </div>
        <div style={nadpis}>NAJVIAC K JEDNÉMU DARU</div>
        <div style={pole}>
          <input value={stropIn} inputMode="numeric" aria-label="Najviac k jednému daru"
            onChange={(e) => { const t = e.target.value.replace(/[^0-9]/g, "").slice(0, 4), v = parseInt(t, 10); setStropIn(t); if (v > 0) setStropDaru(Math.min(STROP_MAX, Math.max(STROP_MIN, v))); }}
            onBlur={() => setStropIn(String(stropDaru))} style={vstup} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink3)" }}>€</span>
        </div>
        <div style={{ fontSize: 12.5, color: stropNad ? "var(--gold)" : "var(--ink3)" }}>
          {stropNad ? "Najviac sa dá 300 € k jednému daru, použijeme 300 €." : "Môžete zadať 50 až 300 €. Menší strop = rozpočet vydrží na viac darov."}
        </div>
        <div style={nadpis}>KOĽKO CELKOM VYČLEŇUJETE</div>
        <div style={pole}>
          <input value={rozpocetIn} inputMode="numeric" aria-label="Koľko celkom vyčleňujete"
            onChange={(e) => setRozpocetIn(e.target.value.replace(/[^0-9 ]/g, "").slice(0, 9))} style={vstup} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink3)" }}>€</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--gold)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{pokryje} · uhradíte vopred</div>
        <div style={nadpis}>DOKEDY</div>
        <label style={{ position: "relative", padding: "13px 14px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          <span>do {datumSk(doKedy)}</span><span style={{ color: "var(--ink3)", fontWeight: 600 }}>zmeniť</span>
          <input type="date" aria-label="Dokedy" value={new Date(doKedy).toISOString().slice(0, 10)} min={new Date(dnes + DEN).toISOString().slice(0, 10)}
            onChange={(e) => { const t = new Date(`${e.target.value}T23:59:59`).getTime(); if (t > Date.now()) setDoKedy(t); }}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
        </label>
        <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>Skončí to, čo nastane skôr: tento dátum alebo minutý rozpočet.</div>
        <div style={nadpis}>ČO S NEVYČERPANÝM ZVYŠKOM</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {([["zbierke", "Ostáva zbierke"], ["firme", "Vráti sa vám"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setZvysok(k)} style={{ ...volba(zvysok === k), height: 46, fontSize: 14.5, fontWeight: 700 }}>{l}</button>))}
        </div>
        <div style={nadpis}>KOMU DOROVNÁVATE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {([[false, "Každému darcovi"], [true, "Len našim zamestnancom"]] as const).map(([k, l]) => (
            <button key={l} type="button" onClick={() => setLenZam(k)} style={{ ...volba(lenZam === k), height: 46, fontSize: 14.5, fontWeight: 700 }}>{l}</button>))}
        </div>
        <HlavneTlacidlo label="Skontrolovať" podrz={false} disabled={rozpocet <= 0} onConfirm={() => setKrok("kontrola")} />
      </>
    );
  } else if (krok === "platim") {
    obsah = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "36px 0 28px", textAlign: "center" }}>
        <Svetlusik size={96} />
        <div style={{ fontSize: 16, fontWeight: 800 }}>{sepa ? "Pripravujem SEPA prevod na účet charity" : "Overujem kartu firmy"}</div>
      </div>
    );
  } else if (krok === "kontrola") {
    const riadky: [string, string][] = [
      ["Zbierka", zbierkaNazov],
      ["Ku každému daru pridáte", POMER_SLOVOM[pomer] ?? `${pomer}×`],
      ["Najviac k jednému daru", eS(stropDaru)],
      ["Celkom vyčleňujete", eS(rozpocet)],
      ["Beží", `od zapečatenia do ${datumSk(doKedy)}`],
      ["Nevyčerpaný zvyšok", zvysok === "zbierke" ? "ostáva zbierke" : "vráti sa vám"],
      ["Dorovnávate", lenZam ? "len zamestnancom" : "každý dar"],
    ];
    const bod = (text: string, plny: boolean, ink: string) => (
      <span style={{ width: 24, height: 24, borderRadius: "50%", border: "1.5px solid #876712", background: plny ? "#876712" : "transparent", color: ink, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{text}</span>);
    obsah = (
      <>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>
          {uhradene ? "Rozpočet je uhradený. Zapečatením sa podmienky stanú nemennými, ani vami, ani nami, a dorovnanie sa spustí." : "Skontrolujte podmienky a uhraďte rozpočet. Zapečatíte ich v ďalšom kroku."}
        </div>
        <div style={{ position: "relative", borderRadius: 16, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "4px 16px 10px" }}>
          {riadky.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--goldBd)", fontSize: 13.5 }}>
              <span style={{ color: "var(--ink2)" }}>{k}</span><span style={{ fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v}</span>
            </div>))}
          {pecati && <div style={{ position: "absolute", right: 14, bottom: -18 }}><Pecat anim datum={datumSk(dnes)} /></div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          {bod(uhradene ? "✓" : "1", !!uhradene, uhradene ? "#fff" : "var(--gold)")}<span style={{ fontSize: 13.5, fontWeight: 700 }}>Úhrada</span>
          <span style={{ flex: 1, height: 2, background: "var(--goldBd)" }} />
          {bod("2", false, "var(--gold)")}<span style={{ fontSize: 13.5, fontWeight: 700 }}>Pečať</span>
        </div>
        {!uhradene && (
          <>
            <div style={{ fontSize: 13, color: "var(--ink2)" }}>Najprv úhrada, až potom pečať. Darcom sľubujeme len to, čo už je na účte charity.</div>
            {/* pri veľkej sume je SEPA prvá (bez poplatku) */}
            {(rozpocet >= 1000 ? (["sepa", "karta"] as const) : (["karta", "sepa"] as const)).map((k) => {
              const on = kanal === k;
              const [t, d] = k === "karta"
                ? ["Karta", `dorovnanie beží hneď po zapečatení · poplatok ${e2(poplatokKarty(rozpocet))}`]
                : ["SEPA prevod", "bez poplatku · beží, keď charita potvrdí príjem (najneskôr do 48 h)"];
              return (
                <button key={k} type="button" onClick={() => setKanal(k)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: on ? "var(--goldBg)" : "var(--card)", border: `1.5px solid ${on ? "var(--goldBd)" : "var(--cardBd)"}`, textAlign: "left", cursor: "pointer", color: "var(--ink)", fontFamily: "inherit" }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{t}</span>
                    <span style={{ display: "block", fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.4 }}>{d}</span>
                  </span>
                  <span style={{ flex: "none", width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${on ? "#876712" : "var(--chkBd)"}`, background: on ? "#876712" : "transparent", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? "✓" : ""}</span>
                </button>);
            })}
          </>
        )}
        {uhradene && (
          <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>✓ Uhradené {e2(rozpocet)} · {datumSk(uhradene)}</div>
            <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 2 }}>{sepa ? "SEPA: dorovnanie sa spustí, keď charita potvrdí príjem, najneskôr do 48 h." : "Karta: dorovnanie sa spustí hneď po zapečatení."}</div>
          </div>
        )}
        <HlavneTlacidlo key={uhradene ? "pecat" : "uhrada"} podrz={podrz} disabled={pecati}
          label={uhradene ? (podrz ? "Podržte a zapečaťte" : "Zapečatiť") : `${podrz ? "Podržte a uhraďte" : "Uhradiť"} ${e2(rozpocet + poplatok)}`}
          onConfirm={uhradene ? zapecatNaozaj : uhrad} />
        {!uhradene && (
          <button type="button" onClick={() => setKrok("formular")} style={{ border: "none", background: "transparent", color: "var(--ink2)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 6 }}>Ešte upraviť</button>
        )}
      </>
    );
  } else {
    const kDaru = Math.min(20 * pomer, stropDaru);
    obsah = (
      <>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, paddingTop: 6 }}>
          <Pecat velka />
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{sepa ? "Zapečatené. Čakáme na potvrdenie úhrady." : "Zapečatené. Dorovnanie beží."}</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>
            {sepa ? "Keď charita potvrdí príjem vášho prevodu (najneskôr do 48 h), dorovnanie sa spustí a dáme vám vedieť v appke aj e-mailom."
              : `Od tejto chvíle pridáte k darom v zbierke ${zbierkaNazov} ${POMER_SLOVOM[pomer] ?? "svoj diel"}. Podmienky sa už nedajú zmeniť, ani vami, ani nami.`}
          </div>
        </div>
        {sepa && (
          <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--card)", border: "1px dashed var(--goldBd)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--goldBd)", borderTopColor: "#876712", animation: "spin 1.2s linear infinite", flex: "none" }} />
            <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Čaká na potvrdenie charity · najneskôr {datumSk(dnes + 2 * DEN)}</span>
          </div>
        )}
        <div style={nadpis}>TAKTO TO UVIDIA DARCOVIA</div>
        <div style={{ padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>daruješ 20 € → k príjemcovi ide {eS(20 + kDaru)}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 14 }}><span style={{ flex: 1, fontWeight: 700 }}>Jana z Nitry</span><span style={{ fontWeight: 700 }}>20 €</span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, paddingLeft: 14, fontSize: 13.5, color: "var(--gold)" }}><span style={{ flex: 1 }}>+ {firma}</span><span style={{ fontWeight: 700 }}>{eS(kDaru)}</span></div>
        </div>
        <div style={{ fontSize: 13, color: "var(--ink3)", textAlign: "center" }}>Priebeh sledujete v Profil firmy → Dorovnania. O prvom dorovnaní, polovici rozpočtu a konci vám dáme vedieť.</div>
        <div style={{ padding: "18px 16px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <Svetlusik size={72} />
          <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.35 }}>{sepa ? "Ďakujeme, že sa pridávate." : "Ďakujeme v mene ľudí, ktorým pomáhate."}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Každý, kto teraz daruje, vie, že jeho dar nezostane sám. Vaše {eS(rozpocet)} sa premení na viac dobrých skutkov, než by ste stihli urobiť sami.</div>
        </div>
        <HlavneTlacidlo label="Hotovo" podrz={false} zelene onConfirm={onClose} />
      </>
    );
  }
  // obal: položky hárku sa nesmú zmenšovať (Harok je flex stĺpec so scrollom)
  return <Harok onClose={onClose} hlavicka={hlavicka}><div ref={obalRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>{obsah}</div></Harok>;
}
