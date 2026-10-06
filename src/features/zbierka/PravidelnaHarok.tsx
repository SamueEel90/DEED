// Pravidelná podpora (prototyp „Platba - pravidelna podpora") — rovnaký postup ako jednorazový dar:
// Nastavenie → Spôsob → Zhrnutie → podrž a potvrď → Hotovo. Podporuje sa LEN táto zbierka.
// Firma pravidelný dar nedorovnáva. EURC len registrovaný. Karta od 3 €, pod 3 € len SEPA.
// OPRAVY 142: neregistrovaný bez e-mailu — len SEPA inkaso (IBAN + meno majiteľa), len mesačne, najviac 100 €,
// vždy Anonymný darca, zruší ho vo svojom bankovníctve. Registrovaný ako doteraz, bez limitu.
import { DeedZnacka } from "@/components/DeedZnacka";
import { useState, type ReactNode } from "react";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useRecurringCreate } from "@/data";
import { pridajDar, nacitajPredvolbu, type VolbaDaru } from "@/lib/darcovia";
import { KARTA_OD_EUR } from "./nastavenie";
import { Harok } from "./Zdielat";
import PodrzTlacidlo from "./PodrzTlacidlo";
import { Svetlusik } from "./Svetlusik";
import { Identita, potvrditTuknutim } from "./Platba";
import { usePoplatok, usePopisSadzby } from "@/lib/poplatky";

type Krok = "nastavenie" | "sposob" | "zhrnutie" | "spracovanie" | "hotovo";
type Perioda = "tyzdenne" | "mesacne" | "rocne";
type Sposob = "karta" | "sepa";
/** OPRAVY 142: bez účtu najviac 100 € mesačne */
const HOST_MAX_EUR = 100;

const KLUC = "deed.pravidelne";
type Zaznam = { refId: string; suma: number; mena: "EUR" | "EURC"; perioda: Perioda; od: number };
const nacitaj = (): Zaznam[] => { try { return JSON.parse(localStorage.getItem(KLUC) ?? "[]") as Zaznam[]; } catch { return []; } };
const uloz = (z: Zaznam) => { try { localStorage.setItem(KLUC, JSON.stringify([z, ...nacitaj()])); } catch { /* LS */ } };

const DNI = ["každú nedeľu", "každý pondelok", "každý utorok", "každú stredu", "každý štvrtok", "každý piatok", "každú sobotu"];
const SLOVO: Record<Perioda, string> = { tyzdenne: "týždenne", mesacne: "mesačne", rocne: "ročne" };
const fD = (d: Date, rok?: boolean) => `${d.getDate()}. ${d.getMonth() + 1}.${rok ? ` ${d.getFullYear()}` : ""}`;
const dalsia = (d: Date, p: Perioda) => { const n = new Date(d); if (p === "tyzdenne") n.setDate(n.getDate() + 7); else if (p === "mesacne") n.setMonth(n.getMonth() + 1); else n.setFullYear(n.getFullYear() + 1); return n; };

const nadpis = (t: string, mt = 8) => <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)", marginTop: mt }}>{t}</div>;
const vyber = (on: boolean) => ({ background: on ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink)" });
const bodka = (on: boolean) => (
  <span style={{ flex: "none", width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${on ? "var(--green)" : "var(--chkBd)"}`, background: on ? "var(--green)" : "transparent", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? "✓" : ""}</span>);
const pole = { height: 50, padding: "0 14px", borderRadius: 13, border: "1px solid var(--fieldBd)", background: "var(--field)", fontSize: 15.5, color: "var(--ink)", outline: "none", fontFamily: "inherit", minWidth: 0 } as const;

export function PravidelnaHarok({ refId, nazov, registrovany, onClose, zbierka = true, suma: sumaOd }: {
  refId: string; nazov: string; registrovany: boolean; onClose: () => void;
  /** OPRAVY 139: tip „X € / mes." z profilu charity otvorí hárok s vyplnenou sumou */
  suma?: number;
  /** false = farnosť / organizácia (nie konkrétna zbierka) — bez riadku o dokladoch */
  zbierka?: boolean;
}) {
  const ja = usePouzivatel();
  const rec = useRecurringCreate();
  const [dnes] = useState(() => new Date());
  const [krok, setKrok] = useState<Krok>("nastavenie");
  const [mena, setMena] = useState<"EUR" | "EURC">("EUR");
  const [suma, setSuma] = useState(sumaOd ?? 10);
  const [vlastna, setVlastna] = useState<string | null>(null);
  const [perioda, setPerioda] = useState<Perioda>("mesacne");
  const [sposob, setSposob] = useState<Sposob>("karta");
  const [volba, setVolba] = useState<VolbaDaru>(nacitajPredvolbu);
  const [tip, setTip] = useState(false);
  const [napoveda, setNapoveda] = useState(false);
  const [hlaska, setHlaska] = useState("");
  // neregistrovaný vypĺňa len mandát SEPA (IBAN + meno majiteľa) — bez e-mailu (OPRAVY 142)
  const [karta, setKarta] = useState(""), [exp, setExp] = useState(""), [cvc, setCvc] = useState("");
  const [iban, setIban] = useState(""), [majitel, setMajitel] = useState("");
  const [ukazChyby, setUkazChyby] = useState(false);
  const podrz = !potvrditTuknutim();

  const eurc = registrovany && mena === "EURC";
  const eur = vlastna != null ? Math.round((parseFloat(vlastna.replace(",", ".")) || 0) * 100) / 100 : suma;
  const mala = eur > 0 && eur < KARTA_OD_EUR;
  const host = !registrovany;
  const nadLimit = host && eur > HOST_MAX_EUR;
  const sp: Sposob | "eurc" = eurc ? "eurc" : mala || host ? "sepa" : sposob;
  // Zadanie 3 · 3.4: poplatok zo servera (rovnaký výpočet ako pri platbe)
  const poplatok = usePoplatok(sp === "karta" ? "fiat" : null, eur).poplatok;
  const popisKarty = usePopisSadzby("fiat");
  const zle = {
    karta: sp === "karta" && karta.replace(/\D/g, "").length < 15,
    exp: sp === "karta" && !(/^(0[1-9]|1[0-2]) \/ \d{2}$/.test(exp)),
    cvc: sp === "karta" && cvc.length < 3,
    iban: sp === "sepa" && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban.replace(/\s/g, "")),
    majitel: sp === "sepa" && majitel.trim().length < 3,
  };
  const chybaUdaje = !registrovany && !eurc && Object.values(zle).some(Boolean);
  const tipV = Math.max(0.5, Math.round(eur * 0.1 * 2) / 2);
  const spolu = eur + poplatok + (tip && !eurc ? tipV : 0);
  const jed = eurc ? " EURC" : " €";
  const f = (n: number, dec?: boolean) => `${(dec || !Number.isInteger(Math.round(n * 100) / 100) ? n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n.toLocaleString("sk-SK"))}${jed}`;
  const rok = perioda === "rocne";
  const dalsiaD = dalsia(dnes, perioda);
  const poznamka = perioda === "tyzdenne" ? `Prvá platba dnes ${fD(dnes)}, potom ${DNI[dnes.getDay()]}.`
    : perioda === "mesacne" ? `Prvá platba dnes ${fD(dnes)}, potom každého ${dnes.getDate()}. v mesiaci.`
    : `Prvá platba dnes ${fD(dnes, true)}, potom každý rok ${fD(dnes)}.`;
  const zrusenie = registrovany ? "Zrušíš ho kedykoľvek v Profil → Pravidelné dary." : "Zrušíš ho kedykoľvek vo svojom bankovníctve (inkaso / súhlasy).";
  const kroky: Krok[] = eurc ? ["nastavenie", "zhrnutie"] : ["nastavenie", "sposob", "zhrnutie"];
  const ki = kroky.indexOf(krok);
  const labelSposob = { karta: registrovany ? "Karta Visa •••• 4242" : "Platobná karta", sepa: registrovany ? "SEPA inkaso · SK31 •••• 4421" : "SEPA inkaso", eurc: "Peňaženka EURC" }[sp];

  const potvrd = async () => {
    if (chybaUdaje) { setKrok("sposob"); setUkazChyby(true); return; }
    setKrok("spracovanie");
    const mn = eurc ? "EURC" : "EUR";
    if (ja.ucetId && !ja.demo) {
      try { await rec.mutateAsync({ rozsah: "request", suma: eur, mena: mn, perioda, caseId: refId, charitaUcet: null, viazaneNaZbierku: true }); } catch { /* ukážka pokračuje */ }
    }
    const predtym = nacitaj().filter((z) => z.refId === refId).length;
    uloz({ refId, suma: eur, mena: mn, perioda, od: Date.now() });
    // prvá platba odchádza hneď — je to dar ako každý iný (firma ho nedorovnáva)
    pridajDar({ refId, suma: eur, kanal: eurc ? "deed" : sp === "sepa" ? "sepa" : "psp", registrovany, volba: registrovany ? volba : undefined });
    const n = predtym + 1;
    const co = zbierka ? "túto zbierku" : nazov, Co = zbierka ? "Túto zbierku" : nazov;
    setHlaska(n === 1
      ? (registrovany ? `Si prvý, kto ${co} podporuje pravidelne.` : `Toto je prvý pravidelný dar pre ${co}.`)
      : registrovany ? `S tebou ${co} pravidelne podporuje ${n} ${n <= 4 ? "ľudia" : "ľudí"}.` : `${Co} teraz pravidelne podporuje ${n} ${n <= 4 ? "ľudia" : "ľudí"}.`);
    window.setTimeout(() => { setKrok("hotovo"); try { navigator.vibrate?.([10, 40, 16]); } catch { /* bez vibrácie */ } }, 1800);
  };
  const dalej = () => {
    if (krok === "nastavenie") { if (eur > 0 && !nadLimit) setKrok(eurc ? "zhrnutie" : "sposob"); }
    else if (krok === "sposob") { if (chybaUdaje) { setUkazChyby(true); return; } setKrok("zhrnutie"); }
  };
  const spat = () => { if (ki > 0) { setKrok(kroky[ki - 1]); setNapoveda(false); } };

  const ram = (zly: boolean) => (ukazChyby && zly ? { ...pole, border: "1.5px solid #A34A2A" } : pole);
  let obsah: ReactNode;
  if (krok === "nastavenie") {
    obsah = (
      <>
        {registrovany && <>
          {nadpis("MENA", 0)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {([["EUR", "€ EUR", "karta alebo prevod"], ["EURC", "EURC", "z peňaženky · bez poplatku"]] as const).map(([k, t, d]) => (
              <button key={k} type="button" onClick={() => setMena(k)} style={{ ...vyber(mena === k), padding: "10px 12px", borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                <span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink3)" }}>{d}</span>
              </button>))}
          </div>
        </>}
        {nadpis("SUMA", registrovany ? 8 : 0)}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {[5, 10, 20, 50].map((v) => (
            <button key={v} type="button" onClick={() => { setSuma(v); setVlastna(null); }} style={{ ...vyber(vlastna == null && suma === v), height: 50, borderRadius: 14, cursor: "pointer", fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums", fontFamily: "inherit" }}>{v}{jed}</button>))}
        </div>
        {vlastna == null
          ? <button type="button" onClick={() => setVlastna(String(suma))} style={{ height: 46, borderRadius: 14, background: "var(--card)", border: "1.5px solid var(--cardBd)", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "var(--ink)", fontFamily: "inherit" }}>Vlastná suma</button>
          : <div style={{ display: "flex", alignItems: "center", gap: 8, height: 54, padding: "0 16px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--green)" }}>
              <input autoFocus value={vlastna} inputMode="decimal" placeholder="Napíš sumu" aria-label="Vlastná suma" onChange={(e) => setVlastna(e.target.value.replace(/[^0-9,.]/g, "").slice(0, 7))}
                style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 20, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums", fontFamily: "inherit" }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink3)" }}>{eurc ? "EURC" : "€"}</span>
            </div>}
        {nadLimit && <div role="status" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: "#A34A2A", padding: "0 4px" }}>Bez účtu najviac {HOST_MAX_EUR} € mesačne. S účtom bez tohto limitu.</div>}
        {/* bez účtu len mesačne — ostatné voľby skryté */}
        {registrovany && <>
          {nadpis("AKO ČASTO")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {(["tyzdenne", "mesacne", "rocne"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setPerioda(k)} style={{ ...vyber(perioda === k), height: 48, borderRadius: 14, cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: "inherit" }}>{SLOVO[k]}</button>))}
          </div>
        </>}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
          <svg style={{ flex: "none", marginTop: 2 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink2)" strokeWidth="1.8" strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
          <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>{poznamka}</span>
        </div>
      </>
    );
  } else if (krok === "sposob") {
    obsah = (
      <>
        <div style={{ fontSize: 14, color: "var(--ink2)" }}>Ako sa bude platiť <b style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{f(eur)} {SLOVO[perioda]}</b></div>
        {([["karta", registrovany ? "Karta Visa •••• 4242" : "Platobná karta", `poplatok ${popisKarty} pri každej platbe`],
           ["sepa", registrovany ? "SEPA inkaso · SK31 •••• 4421" : "SEPA inkaso z tvojho účtu", "bez poplatku · pripísanie do 1 prac. dňa"]] as const).map(([k, t, d]) => {
          const zak = k === "karta" && (mala || host), on = sp === k;
          return (
            <button key={k} type="button" onClick={() => { if (!zak) setSposob(k); }} style={{ ...vyber(on), display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 18, textAlign: "left", cursor: zak ? "not-allowed" : "pointer", opacity: zak ? .45 : 1, color: "var(--ink)", fontFamily: "inherit" }}>
              {k === "karta"
                ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></svg>
                : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></svg>}
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 1 }}>{k === "karta" && host ? "Kartou len s účtom. Inkaso zrušíš vo svojej banke." : d}</span></span>
              {bodka(on)}
            </button>);
        })}
        {mala && !host && <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)", padding: "0 4px" }}>Pri sume pod 3 € ponúkame len prevod, lebo poplatok za kartu by pri každej platbe zjedol veľkú časť daru.</div>}
        {!registrovany && <>
          {nadpis("TVOJE ÚDAJE")}
          {sp === "karta" && !host ? <>
            <input value={karta} onChange={(e) => setKarta(e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "))}
              placeholder="Číslo karty" inputMode="numeric" autoComplete="cc-number" style={ram(zle.karta)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input value={exp} onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 4); setExp(d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d); }}
                placeholder="MM / RR" inputMode="numeric" autoComplete="cc-exp" style={ram(zle.exp)} />
              <input value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="CVC" inputMode="numeric" autoComplete="cc-csc" style={ram(zle.cvc)} />
            </div>
          </> : <>
            <input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 34).replace(/(.{4})(?=.)/g, "$1 "))}
              placeholder="IBAN" autoComplete="off" style={ram(zle.iban)} />
            <input value={majitel} onChange={(e) => setMajitel(e.target.value)} placeholder="Meno majiteľa účtu" autoComplete="name" style={ram(zle.majitel)} />
          </>}
          {ukazChyby && chybaUdaje && <div style={{ fontSize: 13, fontWeight: 600, color: "#A34A2A" }}>Doplň IBAN a meno majiteľa účtu. Bez nich pravidelný dar nenastavíme.</div>}
        </>}
      </>
    );
  } else if (krok === "zhrnutie") {
    const riadky: [string, string][] = [
      ["Suma", f(eur, true)], ["Ako často", SLOVO[perioda]], ["Prvá platba", `dnes, ${fD(dnes, rok)}`], ["Ďalšia platba", fD(dalsiaD, rok)],
      ["Podporuješ", zbierka ? "túto zbierku" : nazov], ...(zbierka ? [["Doklady o použití", "budú doložené"] as [string, string]] : []), ["Platba", labelSposob],
      ...(poplatok ? [["Poplatok za kartu", f(poplatok, true)] as [string, string]] : []),
    ];
    obsah = (
      <>
        {registrovany ? <Identita volba={volba} setVolba={setVolba} eur={eur} /> : <>
          {nadpis("V ZOZNAME DARCOV SA UKÁŽEŠ AKO", 0)}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
            <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--btn)", color: "var(--ink4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>?</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Anonymný darca</span>
          </div>
        </>}
        <div style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "2px 16px", marginTop: 4 }}>
          {riadky.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", fontSize: 14, borderBottom: "1px solid var(--cardBd)" }}>
              <span style={{ color: "var(--ink2)" }}>{k}</span><span style={{ fontWeight: 700, textAlign: "right", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
            </div>))}
          {!eurc && (
            <div onClick={() => setTip(!tip)} role="checkbox" aria-checked={tip} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--cardBd)", cursor: "pointer" }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${tip ? "var(--green)" : "var(--chkBd)"}`, background: tip ? "var(--green)" : "transparent", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{tip ? "✓" : ""}</span>
              <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>Dar pre nás — chod <DeedZnacka /></span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>dobrovoľné · ide platforme, nie príjemcovi</span></span>
              <span style={{ fontSize: 14, fontWeight: 700, color: tip ? "var(--ink)" : "var(--ink4)", fontVariantNumeric: "tabular-nums" }}>{f(tipV, true)}</span>
            </div>)}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0 10px", fontSize: 16, fontWeight: 800 }}><span>Spolu pri každej platbe</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{f(spolu, true)}</span></div>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)", padding: "0 4px" }}>{zrusenie}{registrovany ? " Ak platba neprejde, dáme ti vedieť v appke." : ""}</div>
        {napoveda && <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 13, fontWeight: 600, color: "var(--gInk)" }}>Pravidelný dar potvrdíš podržaním tlačidla.</div>}
      </>
    );
  } else if (krok === "spracovanie") {
    obsah = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", paddingTop: 60 }}>
        <Svetlusik size={104} />
        <div style={{ fontSize: 17, fontWeight: 700 }}>Nastavujem pravidelný dar</div>
        <div style={{ fontSize: 13.5, color: "var(--ink3)" }}>a posielam prvú platbu</div>
      </div>
    );
  } else {
    obsah = (
      <>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 4 }}>
          <Svetlusik size={128} />
          <div style={{ marginTop: 2, fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{registrovany && ja.meno ? `Ďakujeme, ${ja.meno}.` : "Ďakujeme."}</div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{f(eur)}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>{SLOVO[perioda]}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 14, color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>Prvá platba odišla dnes. Ďalšia {fD(dalsiaD, rok)}{rok ? "." : ""}</div>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", fontSize: 15.5, fontWeight: 700, lineHeight: 1.4, textAlign: "center" }}>{hlaska}</div>
        {!registrovany && (
          <div style={{ padding: "14px 16px", borderRadius: 16, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Chceš, aby sa ti dary pripisovali?</div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>S účtom ho uvidíš a zmeníš v Profile. V zozname potom môže byť tvoje meno a pribudne ti karma.</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--green)" }}>Zaregistrovať sa ›</div>
          </div>)}
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)", textAlign: "center" }}>{zrusenie}</div>
      </>
    );
  }

  const tlacidlo = (label: string, onClick: () => void, druhe?: boolean, off?: boolean) => (
    <button type="button" onClick={onClick}
      style={{ flex: druhe ? 1 : 2, height: 54, borderRadius: 16, border: "none", background: druhe ? "var(--btn)" : "linear-gradient(90deg,#4B7A35,#8DB866)", color: druhe ? "var(--ink)" : "#fff", fontSize: druhe ? 16 : 15.5, fontWeight: druhe ? 700 : 800, cursor: "pointer", opacity: off ? .45 : 1, fontFamily: "inherit" }}>{label}</button>);
  const potvrdLabel = `${podrz ? "Podrž a potvrď" : "Potvrdiť"} · ${f(spolu, true)} ${SLOVO[perioda]}`;
  const paticka = krok === "spracovanie" ? null : (
    <>
      {(krok === "sposob" || krok === "zhrnutie") && tlacidlo("Späť", spat, true)}
      {krok === "nastavenie" || krok === "sposob" ? tlacidlo("Pokračovať", dalej, false, eur <= 0 || nadLimit || (krok === "sposob" && chybaUdaje))
        : krok === "zhrnutie" ? <div style={{ flex: 2, display: "flex", flexDirection: "column" }}>{podrz ? <PodrzTlacidlo label={potvrdLabel} onConfirm={potvrd} onHint={() => setNapoveda(true)} /> : tlacidlo(potvrdLabel, potvrd)}</div>
        : tlacidlo("Hotovo", onClose)}
    </>
  );
  const krokyUI = ki >= 0 ? (
    <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
      {kroky.map((k, i) => (
        <button key={k} type="button" onClick={() => { if (i < ki) setKrok(k); }} style={{ flex: 1, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: i < ki ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 5, textAlign: "left", fontFamily: "inherit" }}>
          <span style={{ height: 3, width: "100%", borderRadius: 3, background: i <= ki ? "var(--green)" : "var(--cardBd)", transition: "background .3s ease" }} />
          <span style={{ fontSize: 12, fontWeight: i === ki ? 800 : 600, color: i === ki ? "var(--ink)" : i < ki ? "var(--green)" : "var(--ink4)" }}>{{ nastavenie: "Nastavenie", sposob: "Spôsob", zhrnutie: "Zhrnutie", spracovanie: "", hotovo: "" }[k]}</span>
        </button>))}
    </div>) : null;
  const hlavicka = (
    <>
      <span style={{ width: 44, height: 44, borderRadius: 13, background: "var(--iconBg)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>Pravidelná podpora</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>pre {nazov} · zrušiteľná kedykoľvek</span>
      </span>
    </>
  );
  return <Harok onClose={() => { if (krok !== "spracovanie") onClose(); }} hlavicka={hlavicka} podHlavickou={krokyUI} paticka={paticka}>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{obsah}</div>
  </Harok>;
}
