// ============================================================
// OPRAVY 392 · okno pozvánky do Správy: „{farnosť} vás pozýva do Správy · {popis · rola}“ → Prijať · Odmietnuť.
// Otvára sa zo zvončeka alebo po QR pozvánke (po prihlásení). Neprihlásený / hosť dostane Prihlásiť sa.
// ============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/lib/session";
import { useAktivacia } from "@/components/context";
import { nacitajStrankyUctu } from "@/lib/mojeStranky";
import { cakajucaPozvanka, zabudniPozvanku, nacitajPozvanku, odpovedzPozvanke, UDALOST_POZVANKA, type Pozvanka } from "@/lib/pozvankaSpravy";

const tl = (zelene: boolean) => ({ minHeight: 52, borderRadius: 14, border: zelene ? "none" : "1px solid var(--cardBd)", background: zelene ? "var(--green)" : "var(--btn)", color: zelene ? "#fff" : "var(--ink)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" });

export function PozvankaHost() {
  const s = useSession();
  const aktivacia = useAktivacia();
  const prihlaseny = !!s && !("demo" in s && s.demo) && !("typ" in s && s.typ === "pasivny");
  const [ciel, setCiel] = useState<{ stranka: string; id: string } | null>(cakajucaPozvanka);
  const [p, setP] = useState<Pozvanka | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [pracuje, setPracuje] = useState(false);
  const [hotovo, setHotovo] = useState<"prijal" | "odmietol" | null>(null);
  useEffect(() => { const f = (e: Event) => { setCiel((e as CustomEvent).detail); setP(null); setChyba(null); setHotovo(null); }; window.addEventListener(UDALOST_POZVANKA, f); return () => window.removeEventListener(UDALOST_POZVANKA, f); }, []);
  useEffect(() => {
    if (!ciel || !prihlaseny) return;
    let ziva = true;
    void nacitajPozvanku(ciel.stranka, ciel.id).then((r) => { if (!ziva) return; if ("ok" in r) setP(r.ok); else setChyba(r.chyba); });
    return () => { ziva = false; };
  }, [ciel, prihlaseny]);
  if (!ciel) return null;
  const zavri = () => { zabudniPozvanku(); setCiel(null); setP(null); setChyba(null); setHotovo(null); };
  const odpovedz = async (prijat: boolean) => {
    setPracuje(true); setChyba(null);
    const e = await odpovedzPozvanke(ciel.stranka, ciel.id, prijat);
    setPracuje(false);
    if (e) { setChyba(e); return; }
    zabudniPozvanku(); setHotovo(prijat ? "prijal" : "odmietol");
    if (prijat) void nacitajStrankyUctu();
  };
  const rola = p ? `${p.p ? `${p.p} · ` : ""}${p.r}` : "";
  const coSmie = p?.r === "Pomocník" ? "Celú Správu stránky okrem Nastavení (účet farnosti, predplatné a ľudia)." : "Celú Správu stránky vrátane Nastavení a ľudí.";
  return createPortal(
    <div className="deed-platba" role="dialog" aria-modal="true" aria-label="Pozvánka do Správy" style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={zavri} style={{ position: "absolute", inset: 0, background: "rgba(10,9,6,.55)" }} />
      <div style={{ position: "relative", width: "min(560px, 100%)", boxSizing: "border-box", padding: "20px 18px max(20px, env(safe-area-inset-bottom))", borderRadius: "24px 24px 0 0", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 12, color: "var(--ink)" }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>POZVÁNKA DO SPRÁVY</span>
        {!prihlaseny ? <>
          <b style={{ fontSize: 20, lineHeight: 1.3 }}>Pozvánku uvidíte po prihlásení</b>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>Prihláste sa účtom, ktorým budete stránku spravovať. Pozvánka potom ostane otvorená.</span>
          <button type="button" onClick={() => aktivacia("login")} style={tl(true)}>Prihlásiť sa</button>
          <button type="button" onClick={() => aktivacia("aktivny")} style={tl(false)}>Vytvoriť účet</button>
        </> : hotovo ? <>
          <b role="status" style={{ fontSize: 20, lineHeight: 1.3 }}>{hotovo === "prijal" ? "Prijaté ✓" : "Odmietnuté"}</b>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{hotovo === "prijal" ? "Správu stránky nájdete v Profil → Moje stránky." : "Farár uvidí, že ste pozvánku odmietli."}</span>
          <button type="button" onClick={zavri} style={tl(true)}>Zavrieť</button>
        </> : !p ? <>
          <span role={chyba ? "alert" : "status"} style={{ fontSize: 15.5, lineHeight: 1.5, color: chyba ? "#A34A2A" : "var(--ink2)", fontWeight: chyba ? 700 : 400 }}>{chyba ?? "Načítavam pozvánku…"}</span>
          <button type="button" onClick={zavri} style={tl(false)}>Zavrieť</button>
        </> : p.stav !== "caka" ? <>
          <b style={{ fontSize: 19, lineHeight: 1.3 }}>{p.nazov}</b>
          <span role="status" style={{ fontSize: 15.5, lineHeight: 1.5 }}>{p.stav === "prijal" ? "Túto pozvánku ste už prijali ✓" : p.stav === "odmietol" ? "Túto pozvánku ste odmietli." : "Pozvánka vypršala. Požiadajte farára o novú."}</span>
          <button type="button" onClick={zavri} style={tl(true)}>Zavrieť</button>
        </> : <>
          <b style={{ fontSize: 20, lineHeight: 1.3 }}>{p.nazov} vás pozýva do Správy</b>
          <span style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 9, background: "var(--gSoft)", color: "var(--gInk)", fontSize: 14, fontWeight: 800 }}>{rola}</span>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{coSmie} Kým pozvánku neprijmete, Správu nevidíte.</span>
          {chyba && <span role="alert" style={{ fontSize: 14.5, fontWeight: 700, color: "#A34A2A" }}>{chyba}</span>}
          <button type="button" disabled={pracuje} onClick={() => void odpovedz(true)} style={{ ...tl(true), opacity: pracuje ? .6 : 1 }}>{pracuje ? "Ukladám…" : "Prijať"}</button>
          <button type="button" disabled={pracuje} onClick={() => void odpovedz(false)} style={tl(false)}>Odmietnuť</button>
        </>}
      </div>
    </div>, document.body);
}
