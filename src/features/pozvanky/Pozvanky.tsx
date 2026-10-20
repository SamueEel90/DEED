// ============================================================
// OPRAVY 449 · obrazovky z odkazov na webe
//  · OsobaVrstva — /u/<odkaz> (osobná pozvánka z Môj QR): profil usera — fotka, meno podľa jeho voľby, mesto.
//    Bez štítu (server ho zatiaľ nepočíta) a bez „Pridať medzi priateľov“ (priatelia ešte nie sú na serveri) — Martin 20. 10.
//  · PozvankaHost / PozvankaVrstva — /pozvanka/<token>: „… ťa pozýva ku skutku · Bol som pri tom (podržať)“.
//    Bez účtu: Prihlásiť sa / Zaregistrovať sa a hneď späť sem (bez úvodu appky).
// ============================================================
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePouzivatel } from "@/lib/pouzivatel";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { profilOsoby, useOtvorenaOsoba, zavriOsobu, type ProfilOsoby } from "@/lib/odkazOsoby";
import { usePozvanka, infoPozvanky, prijmiPozvanku, zavriPozvanku, type InfoPozvanky } from "@/lib/pozvankaSkutku";
import { usePripojenie, infoAkcie, pripojSaKAkcii, zavriPripojenie, usePoloha, type InfoAkcie } from "@/lib/akciaCharity";

const tlO: CSSProperties = { minHeight: 52, padding: "0 20px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "var(--ink)" };
const tlZ: CSSProperties = { ...tlO, border: "none", background: "var(--green)", color: "#fff" };
const MES = ["januára", "februára", "marca", "apríla", "mája", "júna", "júla", "augusta", "septembra", "októbra", "novembra", "decembra"];

function Ram({ children, onZavri, label }: { children: ReactNode; onZavri?: () => void; label: string }) {
  return (
    <div className="sprava-charity" role="dialog" aria-modal="true" aria-label={label}
      style={{ position: "fixed", inset: 0, zIndex: 90, background: "var(--bg)", color: "var(--ink)", overflowY: "auto", display: "flex", justifyContent: "center", padding: "max(16px, env(safe-area-inset-top)) 16px 40px", boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
        {onZavri && <button type="button" onClick={onZavri} style={{ ...tlO, alignSelf: "flex-start", minHeight: 44, fontSize: 15, padding: "0 14px", background: "var(--btn)" }}>‹ Späť</button>}
        {children}
      </div>
    </div>);
}

// ---------------- profil usera z odkazu ----------------
export function OsobaVrstva() {
  const odkaz = useOtvorenaOsoba();
  const [p, setP] = useState<ProfilOsoby | null | "nacitava">("nacitava");
  useEffect(() => { if (!odkaz) return; setP("nacitava"); let z = true; void profilOsoby(odkaz).then((x) => { if (z) setP(x); }); return () => { z = false; }; }, [odkaz]);
  if (!odkaz || typeof document === "undefined") return null;
  const meno = p && p !== "nacitava" ? p.meno ?? "Člen DEED+" : "";
  const ini = meno.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "D+";
  const od = p && p !== "nacitava" && p.od ? new Date(p.od) : null;
  return createPortal(
    <Ram onZavri={zavriOsobu} label="Profil">
      {p === "nacitava" ? <span style={{ fontSize: 15, color: "var(--ink3)" }}>Načítava sa…</span>
        : !p ? <section style={{ display: "flex", flexDirection: "column", gap: 8, padding: 18, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
            <b style={{ fontSize: 18 }}>Profil sa nenašiel</b>
            <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Odkaz je neplatný alebo ho človek zmenil. Požiadajte ho o nový.</span>
          </section>
        : <section style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 18px", borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", textAlign: "center" }}>
            {p.foto ? <img src={p.foto} alt="" style={{ width: 112, height: 112, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--cardBd)" }} />
              : <span aria-hidden="true" style={{ width: 112, height: 112, borderRadius: "50%", background: "var(--gSoft)", border: "3px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800, color: "var(--gInk)" }}>{ini}</span>}
            <b style={{ fontSize: 24, lineHeight: 1.2 }}>{meno}</b>
            {(p.mesto || od) && <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>{[p.mesto, od ? `v DEED+ od ${MES[od.getMonth()]} ${od.getFullYear()}` : ""].filter(Boolean).join(" · ")}</span>}
          </section>}
    </Ram>, document.body);
}

// ---------------- pozvánka ku skutku ----------------
export function PozvankaSkutkuHost({ prihlaseny, onPrihlasit, onRegistrovat }: { prihlaseny: boolean; onPrihlasit?: () => void; onRegistrovat?: () => void }) {
  const st = usePozvanka();
  const token = st?.token ?? null;
  const [i, setI] = useState<InfoPozvanky | null | "nacitava">("nacitava");
  const [chyba, setChyba] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState(false);
  const [posiela, setPosiela] = useState(false);
  useEffect(() => { if (!token) return; let z = true; void infoPozvanky(token).then((x) => { if (z) { setI(x); if (x?.moja) setHotovo(true); } }, () => { if (z) setI(null); }); return () => { z = false; }; }, [token, prihlaseny]);
  if (!token) return null;
  const potvrd = async () => {
    if (posiela) return;
    setPosiela(true); setChyba(null);
    const e = await prijmiPozvanku(token);
    setPosiela(false);
    if (e) setChyba(e); else setHotovo(true);
  };
  const karta: CSSProperties = { display: "flex", flexDirection: "column", gap: 12, padding: 18, borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" };
  return (
    <Ram onZavri={zavriPozvanku} label="Pozvánka ku skutku">
      {i === "nacitava" ? <span style={{ fontSize: 15, color: "var(--ink3)" }}>Načítava sa…</span>
        : !i ? <section style={karta}><b style={{ fontSize: 18 }}>Pozvánka sa nenašla</b><span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Odkaz je neplatný. Požiadajte organizátora o novú pozvánku.</span></section>
        : <section style={karta}>
            <span style={{ fontSize: 15, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>{i.od}</b> ťa pozýva ku skutku</span>
            <b style={{ fontSize: 22, lineHeight: 1.25 }}>{i.nazov}</b>
            {hotovo ? <div role="status" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "14px 16px", borderRadius: 16, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
                <b style={{ fontSize: 18, color: "var(--gInk)" }}>Si pri skutku ✓</b>
                <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Keď ho {i.od} zverejní, príde ti do denníka.</span>
              </div>
              : i.vlastna ? <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Toto je vaša pozvánka. Pošlite ju tomu, kto bol pri skutku.</span>
              : i.prijata ? <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Túto pozvánku už potvrdil niekto iný. Požiadajte organizátora o novú.</span>
              : !i.plati ? <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Pozvánka už neplatí, platí 2 hodiny. Požiadajte organizátora o novú.</span>
              : !prihlaseny ? <>
                  <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Aby sme vedeli, že ste to vy, prihláste sa. Kto ešte nemá účet, zaregistruje sa a hneď sa vráti sem.</span>
                  <button type="button" onClick={onRegistrovat} style={tlZ}>Zaregistrovať sa</button>
                  <button type="button" onClick={onPrihlasit} style={tlO}>Prihlásiť sa</button>
                </>
              : <>
                  <PodrzTlacidlo label={posiela ? "Potvrdzuje sa…" : "Podržte · Bol som pri tom"} trvanie={1500} disabled={posiela} onConfirm={() => void potvrd()} />
                  {chyba && <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: "var(--cRed, #A34A2A)" }}>{chyba}</span>}
                </>}
          </section>}
    </Ram>);
}
/** po prihlásení: vrstva nad appkou, kým je pozvánka otvorená */
export function PozvankaSkutkuVrstva({ onPrihlasit, onRegistrovat }: { onPrihlasit: () => void; onRegistrovat: () => void }) {
  const st = usePozvanka();
  const ja = usePouzivatel();
  if (!st || typeof document === "undefined") return null;
  return createPortal(<PozvankaSkutkuHost prihlaseny={!ja.demo && !!ja.ucetId} onPrihlasit={onPrihlasit} onRegistrovat={onRegistrovat} />, document.body);
}

// ---------------- OPRAVY 446 (2): pripojenie k akcii charity (sken rotujúceho QR charity) ----------------
export function PripojenieAkcieHost({ prihlaseny, onPrihlasit, onRegistrovat }: { prihlaseny: boolean; onPrihlasit?: () => void; onRegistrovat?: () => void }) {
  const token = usePripojenie();
  const [i, setI] = useState<InfoAkcie | null | "nacitava">("nacitava");
  const [chyba, setChyba] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState(false);
  const [posiela, setPosiela] = useState(false);
  const poloha = usePoloha(!!token && prihlaseny);
  useEffect(() => { if (!token) return; let z = true; void infoAkcie(token).then((x) => { if (z) { setI(x); if (x?.som) setHotovo(true); } }); return () => { z = false; }; }, [token, prihlaseny]);
  if (!token) return null;
  const pripoj = async () => {
    if (posiela) return;
    setPosiela(true); setChyba(null);
    const e = await pripojSaKAkcii(token, poloha.poz);
    setPosiela(false);
    if (e) setChyba(e); else setHotovo(true);
  };
  const nazov = i && i !== "nacitava" ? i.nazov ?? "charity" : "";
  const karta: CSSProperties = { display: "flex", flexDirection: "column", gap: 12, padding: 18, borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" };
  const sedy = { fontSize: 14.5, lineHeight: 1.5, color: "var(--ink3)" } as const;
  return (
    <Ram onZavri={zavriPripojenie} label="Pripojiť sa k akcii">
      {i === "nacitava" ? <span style={{ fontSize: 15, color: "var(--ink3)" }}>Načítava sa…</span>
        : hotovo ? <section style={karta}>
            <div role="status" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "14px 16px", borderRadius: 16, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
              <b style={{ fontSize: 19, color: "var(--gInk)" }}>Si na akcii {nazov} ✓</b>
              <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Keď organizátor akciu ukončí, skutok ti príde do denníka.</span>
            </div>
            <button type="button" onClick={zavriPripojenie} style={tlO}>Hotovo</button>
          </section>
        : !i || !i.plati ? <section style={karta}>
            <b style={{ fontSize: 18 }}>{i?.skoncila ? "Akcia už skončila" : "Kód už neplatí"}</b>
            <span style={sedy}>{i?.skoncila ? "K tejto akcii sa už nedá pripojiť." : "QR charity sa mení každých 15 s a platí najviac minútu. Naskenujte ho znova."}</span>
          </section>
        : <section style={karta}>
            <span style={{ fontSize: 15, color: "var(--ink2)" }}>Pripojiť sa k akcii</span>
            <b style={{ fontSize: 22, lineHeight: 1.25 }}>{nazov}?</b>
            {i.organizator ? <span style={sedy}>Túto akciu vediete vy. Účastníci tento QR naskenujú vo svojej appke.</span>
              : !prihlaseny ? <>
                  <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Aby sme vedeli, že ste to vy, prihláste sa. Kto ešte nemá účet, zaregistruje sa a hneď sa vráti sem.</span>
                  <button type="button" onClick={onRegistrovat} style={tlZ}>Zaregistrovať sa</button>
                  <button type="button" onClick={onPrihlasit} style={tlO}>Prihlásiť sa</button>
                </>
              : <>
                  {poloha.stav === "ok" ? <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gInk)" }}>Poloha zapnutá ✓</span>
                    : poloha.stav !== "zistuje" && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Poloha je vypnutá. Ak ju akcia vyžaduje, zapnite ju v nastaveniach telefónu.</span>}
                  <PodrzTlacidlo label={posiela ? "Pripája sa…" : "Podržte a pripojte sa"} trvanie={1500} disabled={posiela} onConfirm={() => void pripoj()} />
                  {chyba && <span role="alert" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--cRed, #A34A2A)" }}>{chyba}</span>}
                </>}
          </section>}
    </Ram>);
}
/** po prihlásení: vrstva nad appkou, kým je okno pripojenia otvorené */
export function PripojenieAkcieVrstva({ onPrihlasit, onRegistrovat }: { onPrihlasit: () => void; onRegistrovat: () => void }) {
  const t = usePripojenie();
  const ja = usePouzivatel();
  if (!t || typeof document === "undefined") return null;
  return createPortal(<PripojenieAkcieHost prihlaseny={!ja.demo && !!ja.ucetId} onPrihlasit={onPrihlasit} onRegistrovat={onRegistrovat} />, document.body);
}
