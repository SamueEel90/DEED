// KARTA 18 · bod 5 — Peňaženka: Platby v eurách → Krypto peňaženka (DEED | EURC, Poslať · Prijať · Dobiť,
// prepojené krypto účty) → Darované tento rok → Posledné pohyby → Ďalšie pohyby → Výpisy v PDF.
// Bez emoji, bez rozmazania, bez červenej. Reťazová časť a Moja reťaz sem nepatria.
import { useEffect, useState, type ReactNode } from "react";
import { usePouzivatel } from "@/lib/pouzivatel";
import { nacitajZostatok, dobitPenazenku } from "@/lib/osobne";
import { KURZ_DEED_ZA_EUR, KURZ_EURC_ZA_EUR } from "@/lib/kurz";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { Harok } from "@/features/zbierka/Zdielat";
import { poplatokKarty } from "@/features/zbierka/Platba";
import { MojQr } from "./MojQr";
import { Blokacia24h } from "./Bezpecnost24";
import { hodinNovehoZariadenia } from "@/lib/zariadenia";
import { POHYBY, VYPISY } from "./mock";
import "@/styles/platba.css";

type Mena = "DEED" | "EURC";
const Ik = ({ d, size = 18 }: { d: string; size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const IK = {
  banka: "M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18",
  telefon: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
  prijem: "M17 7L7 17M15 17H7V9", vydaj: "M7 17L17 7M9 7h8v8",
  poslat: "M7 17L17 7M9 7h8v8", prijat: "M17 7L7 17M15 17H7V9", dobit: "M12 5v14M5 12h14",
  krypto: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 8h4.5a2 2 0 0 1 0 4H9zM9 12h5a2 2 0 0 1 0 4H9zM11 6v2M11 16v2",
  srdce: "M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z",
  stiahni: "M12 4v12M7 11l5 5 5-5M5 20h14",
  sipka: "M9 6l6 6-6 6",
};
const karta = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" } as const;
const nadpis = (t: string) => <div style={{ padding: "10px 0 8px", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{t}</div>;
const e2 = (n: number) => n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const Riadok = ({ ikona, t, s, vpravo, prvy }: { ikona: ReactNode; t: string; s: string; vpravo?: ReactNode; prvy?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 0", borderTop: prvy ? "none" : "1px solid var(--cardBd)" }}>
    {ikona}<span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>{vpravo}
  </div>);
const kocka = (obsah: ReactNode, bg = "var(--bSoft)", c = "var(--blue)") => <span style={{ width: 40, height: 30, borderRadius: 7, background: bg, color: c, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 11, fontWeight: 800 }}>{obsah}</span>;
const odkaz = (t: string, onClick: () => void) => <button type="button" onClick={onClick} style={{ border: "none", background: "transparent", fontSize: 13.5, fontWeight: 700, color: "var(--green)", cursor: "pointer", flex: "none", padding: "10px 0 10px 10px", fontFamily: "inherit" }}>{t}</button>;
const stitok = (t: string, zelena?: boolean) => <span style={{ fontSize: 12, fontWeight: 700, color: zelena ? "var(--gInk)" : "var(--blue)", background: zelena ? "var(--gSoft)" : "var(--bSoft)", border: `1px solid ${zelena ? "var(--gBd)" : "var(--bBd)"}`, padding: "3px 8px", borderRadius: 8, flex: "none" }}>{t}</span>;
const brana = () => toast("Napojí sa u poskytovateľa platieb");

export function Penazenka18({ onBack, desktop }: { onBack: () => void; desktop?: boolean }) {
  const ja = usePouzivatel();
  const [mena, setMena] = useState<Mena>("DEED");
  const [deed, setDeed] = useState(1240);
  const [eurc, setEurc] = useState(18.4);
  const [viac, setViac] = useState(false);
  const [vypis, setVypis] = useState<number | null>(null);
  const [dobit, setDobit] = useState(false);
  const [prijat, setPrijat] = useState(false);
  const [blok, setBlok] = useState<null | string>(null); // karta 24 · prvých 24 h na novom zariadení
  useEffect(() => { let z = false; nacitajZostatok().then((v) => { if (!z) setDeed(v); }); return () => { z = true; }; }, []);
  const android = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
  const pohyby = POHYBY.filter((p) => p[5] === mena).slice(0, viac ? 20 : 4);
  const vsetkyPocet = POHYBY.filter((p) => p[5] === mena).length;

  const stiahni = (i: number) => {
    setVypis(i); window.setTimeout(() => setVypis(null), 1800);
    const [mesiac] = VYPISY[i];
    const w = window.open("", "_blank");
    if (!w) return;
    const riadky = POHYBY.map((p) => `<tr><td>${p[0]}</td><td>${p[1]}<br><small>${p[2]}</small></td><td style="text-align:right">${p[3]}</td></tr>`).join("");
    w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Výpis ${mesiac}</title><style>body{font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:32px;color:#1D211B}td{padding:8px 6px;border-bottom:1px solid #ddd;vertical-align:top}small{color:#666}</style></head><body><h2>DEED · výpis peňaženky</h2><p>${ja.celeMeno} · ${mesiac} · DEED a EURC</p><table style="width:100%;border-collapse:collapse">${riadky}</table></body></html>`);
    w.document.close(); w.focus(); window.setTimeout(() => w.print(), 400);
  };

  return (
    <div className="deed-platba" style={{ padding: "0 16px 30px", display: "flex", flexDirection: "column", gap: 14, color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 56 }}>
        {!desktop && <SpatTlacidlo onClick={onBack} />}
        <span style={{ fontSize: 19, fontWeight: 800 }}>Peňaženka</span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 6 }}><span style={{ fontSize: 17, fontWeight: 800 }}>Platby v eurách</span><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>karty a účty</span></div>
      <div style={{ ...karta, padding: "4px 14px 6px" }}>
        {nadpis("ULOŽENÉ")}
        <Riadok ikona={kocka("VISA", "#1D211B", "#fff")} t="Visa •••• 4242" s="platí do 08 / 28" vpravo={stitok("Predvolená", true)} />
        <Riadok ikona={kocka(<Ik d={IK.banka} size={16} />)} t="Účet SK31 •••• 6789" s={`SEPA · ${ja.celeMeno}`} />
        <Riadok ikona={kocka(<Ik d={IK.telefon} size={16} />, "var(--field)", "var(--ink2)")} t={android ? "Google Pay" : "Apple Pay"} s="platba jedným dotykom" vpravo={odkaz("Prepojiť", brana)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "8px 0", borderTop: "1px solid var(--cardBd)" }}>
          {["+ Pridať kartu", "+ Pridať účet"].map((t) => <button key={t} type="button" onClick={() => (hodinNovehoZariadenia() > 0 ? setBlok(t.includes("kartu") ? "kartu" : "účet") : brana())} style={{ height: 44, borderRadius: 13, border: "1.5px dashed var(--gBd)", background: "transparent", fontSize: 14, fontWeight: 700, color: "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>{t}</button>)}
        </div>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--ink4)", marginTop: -6 }}>Karty ukladá platobná brána, u nás sú len posledné 4 čísla.</div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 6 }}><span style={{ fontSize: 17, fontWeight: 800, color: "var(--blue)" }}>Krypto peňaženka</span><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>DEED a EURC</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
        {(["DEED", "EURC"] as const).map((m) => <button key={m} type="button" onClick={() => { setMena(m); setViac(false); }} style={{ height: 44, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 800, fontFamily: "inherit", background: mena === m ? "#fff" : "transparent", color: mena === m ? "#1D211B" : "var(--ink3)" }}>{m}</button>)}
      </div>
      <div style={{ borderRadius: 24, background: "linear-gradient(150deg,var(--bSoft) 0%,var(--bCard) 60%,var(--gCard) 100%)", border: "1px solid var(--bBd)", padding: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>Zostatok {mena}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{mena === "DEED" ? deed.toLocaleString("sk-SK") : e2(eurc)}</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: "var(--blue)" }}>{mena}</span></div>
        <div style={{ fontSize: 13.5, color: "var(--ink3)", marginTop: 2 }}>{mena === "DEED" ? `≈ ${e2(deed / KURZ_DEED_ZA_EUR)} €` : `= ${e2(eurc / KURZ_EURC_ZA_EUR)} €`}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink2)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--bBd)" }}>
          {mena === "DEED" ? "Mena skutkov: odmeny za skutky, dary v Help, Good a Aktivitách, poďakovania." : "Digitálne euro na mikrodary od 0,10 € a dary v krypte. Jeden EURC je vždy jedno euro."}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {([["Poslať", IK.poslat, () => toast("Poslať príde v ďalšej verzii")], ["Prijať", IK.prijat, () => setPrijat(true)], ["Dobiť", IK.dobit, () => setDobit(true)]] as const).map(([t, ic, fn]) => (
          <button key={t} type="button" onClick={fn} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, height: 74, borderRadius: 18, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", color: "var(--ink)", fontFamily: "inherit" }}>
            <span style={{ width: 34, height: 34, borderRadius: 11, background: "var(--bSoft)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={ic} /></span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{t}</span></button>))}
      </div>
      <div style={{ ...karta, padding: "4px 14px 6px" }}>
        <div style={{ padding: "10px 0 2px", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>PREPOJENÉ KRYPTO ÚČTY</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)", paddingBottom: 8 }}>Dobíjaj DEED a EURC z krypto účtu alebo krypto karty.</div>
        <Riadok prvy ikona={kocka(<Ik d={IK.krypto} size={16} />)} t="Coinbase" s="prepojené · EURC, USDC" vpravo={stitok("Prepojené")} />
        <Riadok ikona={kocka(<Ik d={IK.krypto} size={16} />)} t="Revolut" s="krypto účet · karta" vpravo={odkaz("Prepojiť", brana)} />
        <Riadok ikona={kocka(<Ik d={IK.krypto} size={16} />)} t="Iná krypto peňaženka" s="príjem na tvoju adresu v sieti Base" vpravo={odkaz("Adresa", brana)} />
      </div>

      <button type="button" onClick={() => toast("Moje dary nájdeš v profile")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", ...karta, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.srdce} /></span>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>Darované tento rok</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>840 € · 1 400 DEED · 37 zbierok</span></span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)" }}>Moje dary ›</span>
      </button>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", marginTop: 4 }}>POSLEDNÉ POHYBY</div>
      <div style={{ ...karta, padding: "0 14px" }}>
        {pohyby.map((p, i) => {
          const novyDen = i === 0 || pohyby[i - 1][0] !== p[0];
          return (
            <div key={`${p[0]}-${p[1]}-${i}`}>
              {novyDen && <div style={{ padding: "10px 0 4px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", color: "var(--ink4)" }}>{p[0]}</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: novyDen ? "none" : "1px solid var(--cardBd)" }}>
                <span style={{ width: 34, height: 34, borderRadius: 11, background: p[4] ? "var(--gSoft)" : "var(--bSoft)", color: p[4] ? "var(--green)" : "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={p[4] ? IK.prijem : IK.vydaj} /></span>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p[1]}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>{p[2]}</span></span>
                <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: p[4] ? "var(--gInk)" : "var(--ink)", flex: "none" }}>{p[3]}</span>
              </div>
            </div>);
        })}
      </div>
      {!viac && vsetkyPocet > 4 && <button type="button" onClick={() => setViac(true)} style={{ height: 48, borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 14.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>Ďalšie pohyby</button>}

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", marginTop: 8 }}>VÝPISY V PDF</div>
      <div style={{ ...karta, padding: "0 14px" }}>
        {VYPISY.map(([m, s], i) => (
          <button key={m} type="button" onClick={() => stiahni(i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 56, border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", padding: 0 }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{m}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: vypis === i ? "var(--gInk)" : "var(--green)" }}>{vypis === i ? "Stiahnuté" : "PDF"}<Ik d={IK.stiahni} size={16} /></span>
          </button>))}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink4)", textAlign: "center", padding: "0 10px" }}>Výpis obsahuje pohyby DEED aj EURC za daný mesiac. Doklady o daroch nájdeš v Moje dary.</div>

      {prijat && <MojQr zalozka="akcia" onClose={() => setPrijat(false)} />}
      {blok && <Harok onClose={() => setBlok(null)} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>Pridať {blok}</span>}><Blokacia24h co={blok === "kartu" ? "novú kartu pridáš" : "nový účet (IBAN) pridáš"} /><div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Chránime ťa pred zneužitím: prvých 24 hodín na novom zariadení nezmeníš e-mail, telefón, IBAN ani kartu a platby sú najviac do 50 €.</div></Harok>}
      {dobit && <DobitHarok mena={mena} onClose={() => setDobit(false)}
        onDobite={async (eur) => {
          if (mena === "DEED") { const nove = await dobitPenazenku(eur * KURZ_DEED_ZA_EUR); setDeed(nove); }
          else setEurc((x) => Math.round((x + eur * KURZ_EURC_ZA_EUR) * 100) / 100);
          toast(`Dobité ${mena === "DEED" ? (eur * KURZ_DEED_ZA_EUR).toLocaleString("sk-SK") + " DEED" : e2(eur) + " EURC"}`);
        }} />}
    </div>
  );
}

/** Dobiť DEED / EURC — 10/20/50/100 €, SEPA alebo kartou, tlačidlo so sumou vrátane poplatku */
function DobitHarok({ mena, onClose, onDobite }: { mena: Mena; onClose: () => void; onDobite: (eur: number) => void }) {
  const [eur, setEur] = useState(20);
  const [sposob, setSposob] = useState<"sepa" | "karta">("karta");
  const spolu = sposob === "karta" ? eur + poplatokKarty(eur) : eur;
  const dostanes = mena === "DEED" ? `${(eur * KURZ_DEED_ZA_EUR).toLocaleString("sk-SK")} DEED` : `${e2(eur * KURZ_EURC_ZA_EUR)} EURC`;
  return (
    <Harok onClose={onClose} zatvorText="Zrušiť" hlavicka={
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 20, fontWeight: 800 }}>Dobiť {mena}</span><span style={{ display: "block", fontSize: 13.5, color: "var(--ink3)" }}>1 € = {mena === "DEED" ? `${KURZ_DEED_ZA_EUR} DEED` : `${KURZ_EURC_ZA_EUR} EURC`}</span></span>}
      paticka={<button type="button" onClick={() => { onDobite(eur); onClose(); }} style={{ flex: 1, height: 58, borderRadius: 18, border: "none", fontSize: 17, fontWeight: 800, color: "#fff", cursor: "pointer", background: "var(--gGrad)", fontFamily: "inherit" }}>Zaplatiť {e2(spolu)} €</button>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {[10, 20, 50, 100].map((v) => { const on = eur === v; return (
          <button key={v} type="button" onClick={() => setEur(v)} style={{ height: 56, borderRadius: 14, cursor: "pointer", fontSize: 17, fontWeight: 800, fontFamily: "inherit", background: on ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink)" }}>{v} €</button>); })}
      </div>
      <div style={{ textAlign: "center", fontSize: 15, color: "var(--ink2)" }}>Dostaneš <b style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{dostanes}</b></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {([["sepa", "Prevod SEPA", "bez poplatku · do 1 pracovného dňa"], ["karta", "Kartou", "hneď · poplatok 1,4 % + 0,15 €"]] as const).map(([k, t, s]) => { const on = sposob === k; return (
          <div key={k} onClick={() => setSposob(k)} role="radio" aria-checked={on} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 14px", borderRadius: 14, cursor: "pointer", background: on ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}` }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", border: `2px solid ${on ? "var(--green)" : "#A8A396"}`, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0 }} /></span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
          </div>); })}
      </div>
    </Harok>
  );
}
