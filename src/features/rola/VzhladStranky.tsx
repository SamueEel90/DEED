// KARTA 50 · §1 blok „Vzhľad stránky" — prvý v Správe → Upraviť profil (všetky sektory s viacerými vzhľadmi).
// 3 dlaždice s náhľadom, vybraná má zelený rám, pod nimi „Pozrieť verejný profil ›". Zmena sa uloží hneď.
// Zadarmo: vybraný je vzhľad z configu, ostatné dlaždice sú zamknuté „v platenom programe".
import { vzhladyPre, ulozVzhlad, useVzhlad, ulozKlasik, useVybranyVzhlad } from "@/lib/vzhladStranky";
import { toast } from "@/components/toast";
import { ROZLOZENIA, nastavRozlozenie, useRozlozenie } from "@/lib/rozlozenieFarnosti";

const ZAMOK = "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3";

/** OPRAVY 244: farnosť — Rozloženie stránky (Nástenka · Kronika · Moderné), ukladá sa zvlášť od vzhľadu profilu */
function RozlozenieFarnosti({ strankaId, onPozriet }: { strankaId: string; onPozriet?: () => void }) {
  const vyb = useRozlozenie(strankaId);
  return (
    <section aria-label="Rozloženie stránky" style={{ flex: "none", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 15, fontWeight: 700 }}>Rozloženie stránky</span>
      <span style={{ fontSize: 12.5, color: "var(--ink3)", marginTop: -6 }}>Ako vidia veriaci váš verejný profil. Zmena sa uloží hneď.</span>
      <div role="radiogroup" aria-label="Rozloženie stránky" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>{/* KARTA 66: štyri vzhľady = 2 × 2 */}
        {ROZLOZENIA.map((z) => {
          const on = z.k === vyb, zamk = z.zamknute && !on;
          return (
            <button key={z.k} type="button" role="radio" aria-checked={on} disabled={zamk} onClick={() => { if (!on) void nastavRozlozenie(strankaId, z.k); }}
              style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, borderRadius: 16, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: "var(--field)", cursor: zamk ? "default" : "pointer", fontFamily: "inherit", textAlign: "left", opacity: zamk ? 0.6 : 1, boxShadow: "none" }}>
              <span style={{ aspectRatio: "4/3", borderRadius: 10, background: z.bg, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 6, gap: 3 }}>
                <span style={{ height: 6, width: "60%", borderRadius: 3, background: "rgba(255,255,255,.85)" }} />
                <span style={{ height: 4, width: "40%", borderRadius: 2, background: "rgba(255,255,255,.6)" }} />
              </span>
              <b style={{ fontSize: 14, color: "var(--ink)" }}>{z.t}</b>
              {zamk
                ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink3)" }}><svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ZAMOK} /></svg>pripravujeme</span>
                : <span style={{ fontSize: 12, color: "var(--ink3)" }}>{z.k === "nastenka" ? `predvolená · ${z.s}` : z.s}</span>}
            </button>);
        })}
      </div>
      {onPozriet && <button type="button" onClick={onPozriet} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)" }}>Pozrieť verejný profil ›</button>}
    </section>);
}

export function VzhladStranky({ strankaId, zadarmo, kto = "darcovia", onPozriet, sektor }: {
  strankaId: string; zadarmo: boolean; /** kto si profil pozerá (veriaci, darcovia…) */ kto?: string; onPozriet?: () => void;
  /** KARTA 56D §4: farnosť — názvy Kronika · Nástenka · Moderné, profil sa pozrie tlačidlom Náhľad */ sektor?: string;
}) {
  if (sektor === "farnost") return <RozlozenieFarnosti strankaId={strankaId} onPozriet={onPozriet} />;
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
