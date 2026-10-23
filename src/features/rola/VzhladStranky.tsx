// KARTA 50 · §1 blok „Vzhľad stránky" — prvý v Správe → Upraviť profil (všetky sektory s viacerými vzhľadmi).
// 3 dlaždice s náhľadom, vybraná má zelený rám, pod nimi „Pozrieť verejný profil ›". Zmena sa uloží hneď.
// Zadarmo: vybraný je vzhľad z configu, ostatné dlaždice sú zamknuté „v platenom programe".
import { vzhladyPre, ulozVzhlad, useVzhlad, ulozKlasik, useVybranyVzhlad } from "@/lib/vzhladStranky";
import { toast } from "@/components/toast";
import { ROZLOZENIA, nastavRozlozenie, useRozlozenie } from "@/lib/rozlozenieFarnosti";
import { useKonceptAtelieru, nazovVzhladu } from "@/lib/atelier";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Rozlozenie } from "@/lib/rozlozenieFarnosti";

const ZAMOK = "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3";

/** OPRAVY 507 (podľa 470): malý nákres rozloženia — čiary a plochy vo farbách témy (svetlý aj tmavý režim) */
export function NakresRozlozenia({ k }: { k: Rozlozenie }) {
  const pl = { fill: "var(--btn)" }, tm = { fill: "var(--ink3)", opacity: 0.55 }, sv = { fill: "var(--ink3)", opacity: 0.3 };
  return (
    <svg viewBox="0 0 64 48" aria-hidden="true" style={{ display: "block", width: "100%", aspectRatio: "4/3", borderRadius: 8, background: "var(--card)", border: "1px solid var(--cardBd)", boxSizing: "border-box" }}>
      {k === "nastenka" && <>{/* bloky pod sebou */}
        <rect x="6" y="5" width="52" height="7" rx="1.5" style={tm} />
        <rect x="6" y="15" width="52" height="8" rx="1.5" style={pl} /><rect x="6" y="26" width="52" height="8" rx="1.5" style={pl} /><rect x="6" y="37" width="52" height="7" rx="1.5" style={pl} /></>}
      {k === "kronika" && <>{/* profil vľavo, vpravo dni pod sebou */}
        <rect x="5" y="5" width="17" height="39" rx="2" style={pl} /><circle cx="13.5" cy="13" r="4.5" style={tm} />
        <rect x="8" y="21" width="11" height="2" rx="1" style={sv} /><rect x="8" y="25" width="8" height="2" rx="1" style={sv} />
        <rect x="26" y="5" width="33" height="2.5" rx="1" style={tm} />
        <rect x="26" y="11" width="33" height="9" rx="1.5" style={pl} /><rect x="26" y="23" width="33" height="9" rx="1.5" style={pl} /><rect x="26" y="35" width="33" height="9" rx="1.5" style={pl} /></>}
      {k === "moderne" && <>{/* titulka cez celú šírku · dlaždice */}
        <rect x="5" y="5" width="54" height="17" rx="2" style={tm} />
        <rect x="5" y="25" width="17" height="8.5" rx="1.5" style={pl} /><rect x="23.5" y="25" width="17" height="8.5" rx="1.5" style={pl} /><rect x="42" y="25" width="17" height="8.5" rx="1.5" style={pl} />
        <rect x="5" y="35.5" width="17" height="8.5" rx="1.5" style={pl} /><rect x="23.5" y="35.5" width="17" height="8.5" rx="1.5" style={pl} /><rect x="42" y="35.5" width="17" height="8.5" rx="1.5" style={pl} /></>}
      {k === "konzervativny" && <>{/* jeden stĺpec, bez fotiek, veľké písmo */}
        <rect x="16" y="6" width="32" height="4" rx="1.5" style={tm} />
        {[14, 20, 26, 32, 38].map((y, i) => <rect key={y} x="16" y={y} width={i % 2 ? 26 : 32} height="3" rx="1.5" style={sv} />)}</>}
    </svg>);
}
/** 4 vedľa seba, keď je miesto; inak 2 × 2 (rozhoduje šírka karty, nie zariadenie) */
function useStlpce(min = 440): [RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(2);
  useEffect(() => {
    const el = ref.current; if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setN(e.contentRect.width >= min ? 4 : 2)); ro.observe(el); return () => ro.disconnect();
  }, [min]);
  return [ref, n];
}

/** OPRAVY 244: farnosť — Rozloženie stránky (Nástenka · Kronika · Moderné), ukladá sa zvlášť od vzhľadu profilu */
function RozlozenieFarnosti({ strankaId, onPozriet, onAtelier }: { strankaId: string; onPozriet?: () => void; onAtelier?: () => void }) {
  const vyb = useRozlozenie(strankaId);
  const koncept = useKonceptAtelieru();
  const [mriezka, stlpce] = useStlpce();
  return (<>
    <section aria-label="Vzhľad stránky" style={{ flex: "none", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      {/* OPRAVY 467 (1): naostro — zmena hneď pre všetkých */}
      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ fontSize: 15, fontWeight: 700 }}>Vzhľad stránky</span>
        <span style={{ padding: "3px 8px", borderRadius: 8, background: "var(--gSoft)", border: "1px solid var(--gBd)", color: "var(--gInk)", fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em" }}>NAOSTRO</span></span>
      <span style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: -6 }}>Toto teraz vidia ľudia. Ťuk na iný vzhľad zmení stránku hneď pre všetkých.</span>
      <div ref={mriezka} role="radiogroup" aria-label="Rozloženie stránky" style={{ display: "grid", gridTemplateColumns: `repeat(${stlpce},minmax(0,1fr))`, gap: 8, maxWidth: 680 }}>{/* OPRAVY 507: PC 4 vedľa seba, mobil 2 × 2 */}
        {ROZLOZENIA.map((z) => {
          const on = z.k === vyb, zamk = z.zamknute && !on;
          return (
            <button key={z.k} type="button" role="radio" aria-checked={on} disabled={zamk} onClick={() => { if (!on) void nastavRozlozenie(strankaId, z.k); }}
              style={{ display: "flex", flexDirection: "column", gap: 4, padding: 6, borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: "var(--field)", cursor: zamk ? "default" : "pointer", fontFamily: "inherit", textAlign: "left", opacity: zamk ? 0.6 : 1, boxShadow: "none" }}>
              <NakresRozlozenia k={z.k} />
              <b style={{ fontSize: 13.5, color: "var(--ink)", paddingTop: 2 }}>{z.t}</b>
              {zamk
                ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--ink3)" }}><svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ZAMOK} /></svg>pripravujeme</span>
                : <span style={{ fontSize: 11.5, lineHeight: 1.3, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={z.s}>{z.s}</span>}
            </button>);
        })}
      </div>
      {onPozriet && <button type="button" onClick={onPozriet} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)" }}>Pozrieť verejný profil ›</button>}
    </section>
    {/* OPRAVY 467 (2): Ateliér stránky — skúšobný režim, nikto nevidí, kým nepodržíte Zverejniť */}
    {onAtelier && <section aria-label="Ateliér stránky" style={{ flex: "none", borderRadius: 18, background: "#2A2214", border: "2px solid #C9A24A", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, color: "#F3EBDD" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 17 }}>Ateliér stránky</b>
        <span style={{ padding: "3px 8px", borderRadius: 8, border: "1px solid #C9A24A", color: "#E6C878", fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em" }}>SKÚŠOBNÝ REŽIM</span></span>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: "#D9D2C4" }}>Tu si v pokoji vyskúšate iný vzhľad aj poradie blokov na svojej stránke. Nikto to nevidí, kým nepodržíte Zverejniť vzhľad.</span>
      {koncept && <span style={{ fontSize: 13.5, fontWeight: 700, color: "#E6C878" }}>Rozpracované: {nazovVzhladu(koncept.rozlozenie)} · uložené, nikto to nevidí</span>}
      <button type="button" onClick={onAtelier} style={{ alignSelf: "flex-start", minHeight: 52, padding: "0 22px", borderRadius: 14, border: "none", background: "#C9A24A", color: "#2A2214", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>{koncept ? "Pokračovať v rozpracovanom ›" : "Otvoriť ateliér ›"}</button>
    </section>}
  </>);
}

export function VzhladStranky({ strankaId, zadarmo, kto = "darcovia", onPozriet, sektor, onAtelier }: {
  /** OPRAVY 467: farnosť — karta Ateliér stránky */ onAtelier?: () => void;
  strankaId: string; zadarmo: boolean; /** kto si profil pozerá (veriaci, darcovia…) */ kto?: string; onPozriet?: () => void;
  /** KARTA 56D §4: farnosť — názvy Kronika · Nástenka · Moderné, profil sa pozrie tlačidlom Náhľad */ sektor?: string;
}) {
  if (sektor === "farnost") return <RozlozenieFarnosti strankaId={strankaId} onPozriet={onPozriet} onAtelier={onAtelier} />;
  return <VzhladProfilu strankaId={strankaId} zadarmo={zadarmo} kto={kto} onPozriet={onPozriet} sektor={sektor} />;
}
function VzhladProfilu({ strankaId, zadarmo, kto, onPozriet, sektor }: { strankaId: string; zadarmo: boolean; kto: string; onPozriet?: () => void; sektor?: string }) {
  const vz0 = useVzhlad(strankaId, zadarmo);
  // OPRAVY 403 doplnok: tvorca má navyše Klasik (pôvodná stránka tvorcu) = bez vybraného vzhľadu
  const klasik = sektor === "tvorca";
  const vybrany = useVybranyVzhlad(strankaId);
  const vz = klasik ? vybrany : vz0;
  const dlazdice = [...(klasik ? [{ k: null, t: "Klasik", s: "pôvodná stránka", bg: "linear-gradient(160deg,#6B4A8E,#14110B)" }] : []), ...vzhladyPre(sektor)];
  const vyber = (k: (typeof dlazdice)[number]["k"]) => {
    const p = k ? ulozVzhlad(strankaId, k) : ulozKlasik(strankaId);
    void p.catch(() => toast("Vzhľad sa neuložil · skúste znova"));
  };
  return (
    <section aria-label="Vzhľad stránky" style={{ flex: "none", borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 800 }}>Vzhľad stránky</span>
      <span style={{ fontSize: 13, color: "var(--ink3)", marginTop: -6 }}>{zadarmo ? `Ako vidia ${kto} váš verejný profil. V programe Zadarmo je jeden vzhľad, ďalšie sú v platenom programe.` : onPozriet ? `Ako vidia ${kto} váš verejný profil. Zmena sa uloží hneď.` : `Ako vidia ${kto} váš verejný profil. Pozriete ho tlačidlom Náhľad.`}</span>
      <div role="radiogroup" aria-label="Vzhľad stránky" style={{ display: "grid", gridTemplateColumns: klasik ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: 10 }}>
        {dlazdice.map((z) => {
          const on = z.k === vz, zamk = zadarmo && !on && !klasik;
          return (
            <button key={z.k ?? "klasik"} type="button" role="radio" aria-checked={on} disabled={zamk} onClick={() => { if (!on) vyber(z.k); }}
              style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 16, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: "var(--field)", cursor: zamk ? "default" : "pointer", textAlign: "left", fontFamily: "inherit", boxShadow: "none", opacity: zamk ? 0.6 : 1, minWidth: 0 }}>
              <span style={{ aspectRatio: "4/3", borderRadius: 10, background: z.bg, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 6, gap: 3 }}>
                <span style={{ height: 6, width: "60%", borderRadius: 3, background: "rgba(255,255,255,.85)" }} />
                <span style={{ height: 4, width: "40%", borderRadius: 2, background: "rgba(255,255,255,.6)" }} />
              </span>
              <b style={{ fontSize: 14, color: "var(--ink)" }}>{z.t}</b>
              {zamk
                ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink3)" }}><svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ZAMOK} /></svg>v platenom programe</span>
                : <span style={{ fontSize: 12, color: "var(--ink3)" }}>{z.s}</span>}
            </button>);
        })}
      </div>
      {onPozriet && <button type="button" onClick={onPozriet} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>Pozrieť verejný profil ›</button>}
    </section>);
}
