// KARTA 24 · 2j (OPRAVY 49) · Zrušiť účet — hárok, 2 kroky + hotovo.
// Účet sa najprv na 30 dní USPÍ (prihlásenie ho obnoví), potom sa osobné údaje zmažú natrvalo.
// Dary a skutky ostávajú (anonymne, ak si to user zvolí). Odovzdanie správy zbierok BLOKUJE pokračovanie.
// Server (napojenie neskôr): uspanie, 30-dňová lehota, e-mail s „Nebol som to ja", zákaz nového účtu s tým istým menom.
import { useState } from "react";
import { signOut } from "@/lib/auth";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useVazbyOsoby } from "@/lib/zamestnanci";
import { toast } from "@/components/toast";
import { Harok } from "@/features/zbierka/Zdielat";
import { Prepinac } from "./nastUi";
import { nacitajKontakt, maskuj } from "./Bezpecnost24";
import { StiahnutUdajeObrazovka, Ik, btn } from "./JazykUdaje";

const LEHOTA_DNI = 30;
const datum = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
const IK = {
  hodiny: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  fajka: "M20 6 9 17l-5-5",
  vykric: "M12 7v6M12 17h.01",
  mesiac: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  tvar: "M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0",
};
type Overenie = "tvar" | "sms" | "kluc";

export function ZrusitUcet({ onClose }: { onClose: () => void }) {
  const ja = usePouzivatel();
  const kontakt = nacitajKontakt();
  const firmy = useVazbyOsoby(ja.celeMeno).filter((v) => v.stav === "potvrdeny");
  const [krok, setKrok] = useState<1 | 2 | 3>(1);
  const [hotove, setHotove] = useState<Record<string, boolean>>({});
  const [anonym, setAnonym] = useState(false);
  const [udaje, setUdaje] = useState(false);
  const [ov, setOv] = useState<Overenie | null>(null);
  const [overene, setOverene] = useState(false);
  const [overujem, setOverujem] = useState(false);
  const [smsKod, setSmsKod] = useState("");
  const [text, setText] = useState("");
  const koniec = new Date(Date.now() + LEHOTA_DNI * 86400000);
  const spravaOk = !!hotove.sprava;
  const zrusOk = overene && text.trim().toUpperCase() === "ZRUŠIŤ";

  // PRED ZRUŠENÍM · [id, názov, popis, akcia?, blokuje?] — pilot: údaje z ukážky, v produkcii zo servera
  const PRED: [string, string, string, string?, boolean?][] = [
    ["penaze", "Vyber peniaze z peňaženky", "1 240 DEED a 18,40 EURC. Po zmazaní sa k nim nedostaneš.", "Vybrať"],
    ["sprava", "Odovzdaj správu zbierok a rolí", "Spravuješ Zbierku pre Sárku. Bez správcu by ostala opustená.", "Odovzdať", true],
    ["pravidelne", "Pravidelné dary sa zastavia", "2 pravidelné podpory, posledná platba 1. 10."],
    ...(firmy.length ? [["firma", "Odpojíme ťa od zamestnávateľa", "Hodiny, ktoré čakajú na schválenie, firme ešte odošleme."] as [string, string, string]] : []),
    ["udaje", "Stiahni si svoje údaje", "skutky, dary, doklady a súhlasy v jednom súbore", "Stiahnuť"],
  ];
  const akcia = (id: string) => {
    if (id === "udaje") setUdaje(true);
    if (id === "penaze") toast("Výber zadaný, peniaze prídu na tvoj účet");
    if (id === "sprava") toast("Správu zbierky sme ponúkli spolusprávcovi");
    setHotove((h) => ({ ...h, [id]: true }));
  };
  const over = (k: Overenie) => {
    setOv(k); setOverene(false); setSmsKod("");
    if (k === "sms") { toast("SMS kód sme poslali"); return; }
    setOverujem(true);
    window.setTimeout(() => { setOverujem(false); setOverene(true); }, 800); // pilot; v produkcii WebAuthn / passkey
  };
  const zrus = () => {
    if (!zrusOk) return;
    // TODO(server): uspať účet, anonymizovať dary (anonym), odoslať e-mail s „Nebol som to ja"
    setKrok(3);
  };

  const hlavicka = (t: string, k?: string) => <span style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{t}</span>{k && <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink3)" }}>{k}</span>}</span>;

  if (krok === 3) return (
    <Harok onClose={() => { onClose(); void signOut(); }} hlavicka={hlavicka("Hotovo")}
      paticka={<button type="button" onClick={() => { onClose(); void signOut(); }} style={{ ...btn(false), flex: 1 }}>Zavrieť</button>}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", padding: "6px 4px" }}>
        <span aria-hidden="true" style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--btn)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.mesiac} s={26} w={2} /></span>
        <b role="status" style={{ fontSize: 19 }}>Účet je uspaný</b>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>Natrvalo ho zmažeme <b style={{ color: "var(--ink)" }}>{datum(koniec)}</b>. Dovtedy ho obnovíš tým, že sa prihlásiš.</div>
      </div>
      <div style={{ padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink2)" }}>
        Na e-mail {kontakt.email ? maskuj(kontakt.email, "e") : "k účtu"} sme poslali potvrdenie. Ak si to nebol ty, ťukni v ňom na <b style={{ color: "var(--ink)" }}>Nebol som to ja</b> a účet sa hneď obnoví.</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)", textAlign: "center" }}>Ďakujeme za každý skutok. Dobro, ktoré si urobil, ostáva.</div>
    </Harok>
  );

  if (krok === 2) {
    const MOZ: [Overenie, string, string][] = [["tvar", "Tvár alebo odtlačok", "na tomto zariadení"], ["sms", "SMS kód", kontakt.tel ? `na ${maskuj(kontakt.tel, "t")}` : "na tvoje číslo"], ["kluc", "Bezpečnostný kľúč", "passkey alebo USB kľúč"]];
    return (
      <Harok onClose={onClose} hlavicka={hlavicka("Zrušiť účet", "2 / 2")}
        paticka={<>
          <button type="button" onClick={() => setKrok(1)} style={{ ...btn(false), flex: 1 }}>Späť</button>
          <button type="button" disabled={!zrusOk} onClick={zrus} style={{ flex: 1, minHeight: 52, borderRadius: 16, border: "none", background: "#1D211B", color: "#F1ECE1", fontSize: 15.5, fontWeight: 800, fontFamily: "inherit", cursor: zrusOk ? "pointer" : "default", opacity: zrusOk ? 1 : 0.4, transition: "opacity .2s ease" }}>Zrušiť účet</button>
        </>}>
        <div style={{ fontSize: 14.5, color: "var(--ink2)" }}>Over, že účet rušíš naozaj ty.</div>
        <div role="radiogroup" aria-label="Overenie totožnosti" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MOZ.map(([k, t, s]) => { const on = ov === k; return (
            <button key={k} type="button" role="radio" aria-checked={on} onClick={() => over(k)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 14px", borderRadius: 14, border: `1px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--card)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{on && overujem ? "overujem…" : on && overene ? "overené" : s}</span></span>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", border: `2px solid ${on ? "var(--green)" : "var(--chkBd)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0 }} /></span>
            </button>); })}
        </div>
        {ov === "sms" && !overene && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: "var(--ink2)" }}>Kód z SMS
            <input value={smsKod} inputMode="numeric" autoComplete="one-time-code" maxLength={6} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setSmsKod(v); if (v.length === 6) setOverene(true); }}
              placeholder="6 číslic" style={{ height: 52, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 18, letterSpacing: ".2em", color: "var(--ink)", outline: "none", fontFamily: "inherit" }} /></label>)}
        <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: "var(--ink2)" }}>
          <span>Na potvrdenie napíš <b style={{ color: "var(--ink)" }}>ZRUŠIŤ</b></span>
          <input value={text} onChange={(e) => setText(e.target.value.toUpperCase().slice(0, 10))} placeholder="ZRUŠIŤ" autoComplete="off"
            style={{ height: 52, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
        </label>
      </Harok>
    );
  }

  return (
    <>
      <Harok onClose={onClose} hlavicka={hlavicka("Zrušiť účet", "1 / 2")}
        paticka={<>
          <button type="button" onClick={onClose} style={{ ...btn(false), flex: 1 }}>Nechať účet</button>
          <button type="button" disabled={!spravaOk} onClick={() => setKrok(2)} style={{ flex: 1, minHeight: 52, borderRadius: 16, border: "none", background: "#1D211B", color: "#F1ECE1", fontSize: 15.5, fontWeight: 800, fontFamily: "inherit", cursor: spravaOk ? "pointer" : "default", opacity: spravaOk ? 1 : 0.4, transition: "opacity .2s ease" }}>Pokračovať</button>
        </>}>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>Zmažeme tvoj profil, fotky, záujmy a priateľov. Dary a skutky sa vymazať nedajú, ostávajú zapísané v zbierkach tak, ako si ich poslal.</div>
        <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 16, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink2)" }}>
          <span style={{ color: "var(--green)", display: "flex", marginTop: 1 }}><Ik d={IK.hodiny} s={18} w={2} /></span>
          <span><b style={{ color: "var(--ink)" }}>{LEHOTA_DNI} dní na rozmyslenie.</b> Účet sa najprv uspí. Kým sa neprihlásiš, nikto ho nevidí. Do {datum(koniec)} ho obnovíš prihlásením, potom sa zmaže natrvalo.</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "0 2px" }}>PRED ZRUŠENÍM</div>
        <div style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "0 14px" }}>
          {PRED.map(([id, t, s, a], i) => { const ok = !a || hotove[id]; return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: ok ? "var(--gSoft)" : "var(--goldBg)", color: ok ? "var(--green)" : "var(--gold)" }}><Ik d={ok ? IK.fajka : IK.vykric} s={15} w={2.8} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)" }}>{s}</span></span>
              {a && !hotove[id] && <button type="button" onClick={() => akcia(id)} style={{ minHeight: 44, padding: "0 6px", border: "none", background: "transparent", color: "var(--gInk)", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", flex: "none" }}>{a}</button>}
              <span className="sr-only">{ok ? "hotovo" : "treba urobiť"}</span>
            </div>); })}
        </div>
        <button type="button" role="switch" aria-checked={anonym} onClick={() => setAnonym(!anonym)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "10px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>Zmeniť všetky moje dary na anonymné</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>v zoznamoch darcov bude Anonymný darca</span></span>
          <Prepinac on={anonym} />
        </button>
        {!spravaOk && <div role="status" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Najprv odovzdaj správu <b style={{ color: "var(--ink)" }}>Zbierky pre Sárku</b>. Potom môžeš pokračovať.</div>}
      </Harok>
      {udaje && <StiahnutUdajeObrazovka z={160} onBack={() => setUdaje(false)} />}
    </>
  );
}
