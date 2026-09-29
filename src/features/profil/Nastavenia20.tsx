// KARTA 20 · Nastavenia appky — všetko o appke, nič o profile (fotky, režim profilu a Ochrana osoby sú v Upraviť profil).
// Poradie: Vzhľad · Prístupnosť · Oznámenia · Poloha · Bezpečnosť · Súkromie a údaje · Účet · Pomoc · [Odhlásiť sa].
import { useState, type ReactNode } from "react";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useMotiv, type Tema } from "@/components/context";
import { useNastaveniaAppky, zmenNastavenia, type Okruh } from "@/lib/nastaveniaAppky";
import { potvrditTuknutim, nastavPotvrditTuknutim } from "@/features/zbierka/Platba";
import { useVazbaOsoby } from "@/lib/zamestnanci";
import { signOut } from "@/lib/auth";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { IntroPruvodca } from "@/components/intro";
import { NahlasitSheet } from "@/components/nahlasit";
import { MojZamestnavatelSheet } from "@/features/rola/MojZamestnavatel";
import { Harok } from "@/features/zbierka/Zdielat";
import { PotvrditPlatbuHarok, OkruhHarok, PrihlaseneZariadenia, EmailTelefonHeslo, ZablokovaniLudia, Suhlasy, DetailSuhlasu, hranicaText } from "./Bezpecnost24";
import { zariadenia, useZmenyZariadeni } from "@/lib/zariadenia";
import { zablokovani, useZmenyBlokovania } from "@/lib/blokovanie";
import "@/styles/platba.css";

const VERZIA = "0.9 (pilot)";
const OKRUH: Record<Okruh, string> = { stvrt: "Štvrť", mesto: "Mesto", slovensko: "Slovensko" };
const coskoro = () => toast("Pribudne v ďalšej verzii");

const Sipka = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;
const Prepinac = ({ on }: { on: boolean }) => (
  <span aria-hidden="true" style={{ width: 48, height: 28, borderRadius: 14, background: on ? "var(--green)" : "#C9C4B8", position: "relative", transition: "background .2s ease", flex: "none" }}>
    <span style={{ position: "absolute", top: 3, left: 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transform: on ? "translateX(20px)" : "none", transition: "transform .2s ease" }} /></span>);

function Sekcia({ nadpis, children }: { nadpis: string; children: ReactNode }) {
  return (
    <section aria-label={nadpis} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{nadpis}</h2>
      <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "0 14px" }}>{children}</div>
    </section>
  );
}
/** riadok: ťuk (›) alebo prepínač (role=switch) */
function Riadok({ t, s, hodnota, prepinac, onClick, prvy }: { t: string; s?: string; hodnota?: ReactNode; prepinac?: boolean; onClick: () => void; prvy?: boolean }) {
  const jePrep = prepinac !== undefined;
  return (
    <button type="button" onClick={onClick} role={jePrep ? "switch" : undefined} aria-checked={jePrep ? prepinac : undefined}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", border: "none", borderTop: prvy ? "none" : "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t}</span>
        {s && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 1 }}>{s}</span>}
      </span>
      {hodnota !== undefined && <span style={{ fontSize: 14, color: "var(--ink3)", flex: "none" }}>{hodnota}</span>}
      {jePrep ? <Prepinac on={!!prepinac} /> : <Sipka />}
    </button>
  );
}

export function Nastavenia20({ onBack, onNotif, onUpravProfil, desktop }: { onBack: () => void; onNotif: () => void; onUpravProfil?: () => void; desktop?: boolean }) {
  const ja = usePouzivatel();
  const { tema, nastavTemu } = useMotiv();
  const n = useNastaveniaAppky();
  const [tuk, setTuk] = useState(potvrditTuknutim);
  const vazba = useVazbaOsoby(ja.celeMeno);
  const [harok, setHarok] = useState<null | "okruh" | "platba" | "zrusit" | "zamestnavatel" | "uvod" | "nahlasit">(null);
  const [detail, setDetail] = useState<null | "pod" | "ud">(null); // OPRAVY 34: detail súhlasu (karta 24 · 2f)
  const [obr, setObr] = useState<null | "zariadenia" | "kontakt" | "blokovani" | "suhlasy">(null); // obrazovky sprava (karta 24)
  useZmenyZariadeni(); useZmenyBlokovania();

  const stiahniUdaje = () => {
    const data: Record<string, unknown> = { vytvorene: new Date().toISOString(), meno: ja.celeMeno };
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith("deed.")) { const v = localStorage.getItem(k); try { data[k] = JSON.parse(v ?? "null"); } catch { data[k] = v; } } } } catch { /* LS */ }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "moje-udaje-deed.json"; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Stiahnuté");
  };
  const pismo = (d: number) => zmenNastavenia({ pismo: Math.min(150, Math.max(90, n.pismo + d)) });
  const pasik = (i: number) => 90 + i * 10 <= n.pismo;

  return (
    <div className="deed-platba" style={{ padding: "0 16px 30px", display: "flex", flexDirection: "column", gap: 14, color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        {!desktop && <SpatTlacidlo onClick={onBack} />}
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Nastavenia</h1>
      </div>

      <Sekcia nadpis="VZHĽAD">
        <div style={{ padding: "12px 0" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }} id="tema-nadpis">Téma</div>
          <div role="radiogroup" aria-labelledby="tema-nadpis" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
            {([["svetla", "Svetlá"], ["tmava", "Tmavá"], ["system", "Podľa telefónu"]] as [Tema, string][]).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={tema === k} onClick={() => nastavTemu(k)}
                style={{ minHeight: 44, padding: "4px 6px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", lineHeight: 1.2, background: tema === k ? "#fff" : "transparent", color: tema === k ? "#1D211B" : "var(--ink3)" }}>{l}</button>))}
          </div>
        </div>
        <Riadok t="Jazyk" hodnota="Slovenčina" onClick={coskoro} />
      </Sekcia>

      <Sekcia nadpis="PRÍSTUPNOSŤ">
        <div style={{ padding: "12px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Veľkosť písma</span>
            <span aria-live="polite" style={{ fontSize: 14, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{n.pismo} %</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button type="button" onClick={() => pismo(-10)} disabled={n.pismo <= 90} aria-label="Zmenšiť písmo" style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: "var(--btn)", fontSize: 13, fontWeight: 800, color: "var(--ink)", cursor: "pointer", opacity: n.pismo <= 90 ? .4 : 1, fontFamily: "inherit" }}>A</button>
            <div aria-hidden="true" style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
              {Array.from({ length: 7 }, (_, i) => <span key={i} style={{ height: 5, borderRadius: 3, background: pasik(i) ? "var(--green)" : "var(--track)" }} />)}
            </div>
            <button type="button" onClick={() => pismo(10)} disabled={n.pismo >= 150} aria-label="Zväčšiť písmo" style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: "var(--btn)", fontSize: 20, fontWeight: 800, color: "var(--ink)", cursor: "pointer", opacity: n.pismo >= 150 ? .4 : 1, fontFamily: "inherit" }}>A</button>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: 8 }}>Pridáva sa k veľkosti písma v telefóne.</div>
        </div>
        <Riadok t="Obmedziť animácie" s="bez letov, iskier a pulzovania" prepinac={n.obmedzAnim} onClick={() => zmenNastavenia({ obmedzAnim: !n.obmedzAnim })} />
        <Riadok t="Vibrácie" s="pri potvrdení a po dare" prepinac={n.vibracie} onClick={() => zmenNastavenia({ vibracie: !n.vibracie })} />
        <Riadok t="Titulky vo videách" s="vždy zapnuté" prepinac={n.titulky} onClick={() => zmenNastavenia({ titulky: !n.titulky })} />
        <Riadok t="Potvrdzovať ťuknutím" s="namiesto podržania, pri platbe dvakrát ťukni" prepinac={tuk} onClick={() => { nastavPotvrditTuknutim(!tuk); setTuk(!tuk); }} />
      </Sekcia>

      <Sekcia nadpis="OZNÁMENIA">
        <Riadok prvy t="Čo chceš dostávať" s="dary, pozvánky, priatelia, zbierky" onClick={onNotif} />
        <Riadok t="Tichý čas" s={`${n.tichyOd} – ${n.tichyDo}, okrem SOS`} prepinac={n.tichyCas} onClick={() => zmenNastavenia({ tichyCas: !n.tichyCas })} />
      </Sekcia>

      <Sekcia nadpis="POLOHA">
        <Riadok prvy t="Poloha telefónu" s="na skutky a pomoc v okolí" prepinac={n.poloha} onClick={() => zmenNastavenia({ poloha: !n.poloha })} />
        <Riadok t="Predvolený okruh" s={n.odPolohy ? "podľa toho, kde práve si" : undefined} hodnota={OKRUH[n.okruh]} onClick={() => setHarok("okruh")} />
      </Sekcia>

      <Sekcia nadpis="BEZPEČNOSŤ">
        <Riadok prvy t="Prihlásenie tvárou alebo odtlačkom" prepinac={n.biometria} onClick={() => zmenNastavenia({ biometria: !n.biometria })} />
        <Riadok t="Potvrdiť platbu nad" s="tvárou, odtlačkom alebo PIN" hodnota={<b style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{hranicaText(n.hranicaPlatby)}</b>} onClick={() => setHarok("platba")} />
        <Riadok t="Prihlásené zariadenia" hodnota={String(zariadenia().length)} onClick={() => setObr("zariadenia")} />
        <Riadok t="E-mail, telefón a heslo" onClick={() => setObr("kontakt")} />
      </Sekcia>

      <Sekcia nadpis="SÚKROMIE A ÚDAJE">
        <Riadok prvy t="Hľadať priateľov v kontaktoch" s="čísla sa neukladajú, len ich odtlačok" prepinac={n.kontakty} onClick={() => zmenNastavenia({ kontakty: !n.kontakty })} />
        <Riadok t="Zablokovaní ľudia" hodnota={String(zablokovani().length)} onClick={() => setObr("blokovani")} />
        <Riadok t="Súhlasy" onClick={() => setObr("suhlasy")} />
        <Riadok t="Stiahnuť moje údaje" s="všetko o tebe v jednom súbore" onClick={stiahniUdaje} />
      </Sekcia>

      <Sekcia nadpis="ÚČET">
        <Riadok prvy t="Zamestnávateľ" hodnota={vazba?.stav === "potvrdeny" ? vazba.firma : vazba?.stav === "pozvany" ? "Pozvánka čaká" : vazba?.stav === "ziadost" ? "Čaká na firmu" : "Nenastavený"} onClick={() => setHarok("zamestnavatel")} />
        <Riadok t="Zrušiť účet" onClick={() => setHarok("zrusit")} />
      </Sekcia>

      <Sekcia nadpis="POMOC">
        <Riadok prvy t="Prehrať úvod" onClick={() => setHarok("uvod")} />
        <Riadok t="Ukážky pre začiatok" s="inšpirácia v prázdnych zoznamoch, len pre teba" prepinac={n.ukazky} onClick={() => zmenNastavenia({ ukazky: !n.ukazky })} />
        <Riadok t="Časté otázky" onClick={coskoro} />
        <Riadok t="Napísať podpore" onClick={coskoro} />
        <Riadok t="Nahlásiť problém" onClick={() => setHarok("nahlasit")} />
        <Riadok t="Podmienky používania" onClick={() => setDetail("pod")} />
        <Riadok t="Ochrana súkromia" onClick={() => setDetail("ud")} />
      </Sekcia>

      <button type="button" onClick={() => { toast("Odhlásené"); void signOut(); }} style={{ minHeight: 54, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 16, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>Odhlásiť sa</button>
      <div style={{ fontSize: 12.5, color: "var(--ink3)", textAlign: "center" }}>DEED · verzia {VERZIA}</div>

      {harok === "okruh" && <OkruhHarok onClose={() => setHarok(null)} onZmenitMiesto={() => { setHarok(null); onUpravProfil?.(); }} />}
      {harok === "platba" && <PotvrditPlatbuHarok onClose={() => setHarok(null)} />}
      {obr === "zariadenia" && <PrihlaseneZariadenia onBack={() => setObr(null)} />}
      {obr === "kontakt" && <EmailTelefonHeslo onBack={() => setObr(null)} />}
      {obr === "blokovani" && <ZablokovaniLudia onBack={() => setObr(null)} />}
      {obr === "suhlasy" && <Suhlasy onBack={() => setObr(null)} />}
      {detail && <DetailSuhlasu typ={detail} onBack={() => setDetail(null)} />}
      {harok === "zrusit" && <ZrusitUcet onClose={() => setHarok(null)} />}
      {harok === "zamestnavatel" && <MojZamestnavatelSheet osoba={ja.celeMeno} toast={toast} onClose={() => setHarok(null)} />}
      {harok === "uvod" && <IntroPruvodca onClose={() => setHarok(null)} />}
      {harok === "nahlasit" && <NahlasitSheet co="Problém v appke" refId="appka" modul="appka" toast={toast} onClose={() => setHarok(null)} />}
    </div>
  );
}

/** Zrušiť účet — user ho zruší sám; aktívne až po napísaní ZRUŠIŤ */
function ZrusitUcet({ onClose }: { onClose: () => void }) {
  const [anonym, setAnonym] = useState(false);
  const [text, setText] = useState("");
  const moze = text.trim().toUpperCase() === "ZRUŠIŤ";
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>Zrušiť účet</span>}
      paticka={<>
        <button type="button" onClick={onClose} style={{ flex: 1, minHeight: 54, borderRadius: 16, border: "none", background: "var(--btn)", fontSize: 15.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>Nechať účet</button>
        <button type="button" disabled={!moze} onClick={() => { toast(anonym ? "Účet zrušený, dary sú anonymné" : "Účet zrušený"); onClose(); void signOut(); }}
          style={{ flex: 1, minHeight: 54, borderRadius: 16, border: "none", background: "var(--ink2)", fontSize: 15.5, fontWeight: 800, color: "var(--bg)", cursor: moze ? "pointer" : "default", opacity: moze ? 1 : .4, transition: "opacity .2s ease", fontFamily: "inherit" }}>Zrušiť účet</button>
      </>}>
      <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>Zmažeme tvoj profil, fotky, záujmy a priateľov. Dary a skutky sa vymazať nedajú, ostávajú zapísané v zbierkach tak, ako si ich poslal.</div>
      <div style={{ padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>
        Pred zrušením si <b style={{ color: "var(--ink)" }}>vyber peniaze z peňaženky</b> (zostatok DEED, EURC). Po zrušení sa k nim už nedostaneš.</div>
      <button type="button" role="switch" aria-checked={anonym} onClick={() => setAnonym(!anonym)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>Zmeniť všetky moje dary na anonymné</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>v zoznamoch darcov bude Anonymný darca</span></span>
        <Prepinac on={anonym} />
      </button>
      <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: "var(--ink2)" }}>
        <span>Na potvrdenie napíš <b style={{ color: "var(--ink)" }}>ZRUŠIŤ</b></span>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="ZRUŠIŤ" autoComplete="off"
          style={{ height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 15.5, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
      </label>
    </Harok>
  );
}
