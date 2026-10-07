// KARTA 50 · §1 blok „Vzhľad stránky" — prvý v Správe → Upraviť profil (všetky sektory s viacerými vzhľadmi).
// 3 dlaždice s náhľadom, vybraná má zelený rám, pod nimi „Pozrieť verejný profil ›". Zmena sa uloží hneď.
// Zadarmo: vybraný je vzhľad z configu, ostatné dlaždice sú zamknuté „v platenom programe".
import { vzhladyPre, ulozVzhlad, useVzhlad } from "@/lib/vzhladStranky";

const ZAMOK = "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3";

export function VzhladStranky({ strankaId, zadarmo, kto = "darcovia", onPozriet, sektor }: {
  strankaId: string; zadarmo: boolean; /** kto si profil pozerá (farníci, darcovia…) */ kto?: string; onPozriet?: () => void;
  /** KARTA 56D §4: farnosť — názvy Kronika · Nástenka · Moderné, profil sa pozrie tlačidlom Náhľad */ sektor?: string;
}) {
  const vz = useVzhlad(strankaId, zadarmo);
  return (
    <section aria-label="Vzhľad stránky" style={{ flex: "none", borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 800 }}>Vzhľad stránky</span>
      <span style={{ fontSize: 13, color: "var(--ink3)", marginTop: -6 }}>{zadarmo ? `Ako vidia ${kto} váš verejný profil. V programe Zadarmo je jeden vzhľad, ďalšie sú v platenom programe.` : onPozriet ? `Ako vidia ${kto} váš verejný profil. Zmena sa uloží hneď.` : `Ako vidia ${kto} váš verejný profil. Pozriete ho tlačidlom Náhľad.`}</span>
      <div role="radiogroup" aria-label="Vzhľad stránky" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        {vzhladyPre(sektor).map((z) => {
          const on = z.k === vz, zamk = zadarmo && !on;
          return (
            <button key={z.k} type="button" role="radio" aria-checked={on} disabled={zamk} onClick={() => { if (!on) void ulozVzhlad(strankaId, z.k); }}
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
