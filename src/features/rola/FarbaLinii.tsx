// OPRAVY 243 · Správa → Nastavenia → Vzhľad stránky → Farba línií (prototyp „Farnost nastenka - farebne linie“).
// Mení len línie na verejnej stránke farnosti (pod titulkou, nad blokmi, nad omšami). Ukladá sa hneď pri stránke.
import { useSlovaFarnosti } from "@/lib/mojeFarnosti";
import { FARBY_LINIE, ROK, farbaCirkevnehoRoka, nastavLiniu, useVolbaLinie, volbyLinie } from "@/lib/liniaStranky";

const sekNadpis = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" } as const;

export function FarbaLinii({ strankaId, pred }: { strankaId: string; /** OPRAVY 244: Rozloženie stránky nad Farbou línií */ pred?: import("react").ReactNode }) {
  const { cirkev } = useSlovaFarnosti(strankaId);
  const vyb = useVolbaLinie(strankaId, cirkev);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={sekNadpis}>VZHĽAD STRÁNKY</div>
      {pred}
      <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div id="sc-linie" style={{ fontSize: 15, fontWeight: 700 }}>Farba línií</div>
        <div role="radiogroup" aria-labelledby="sc-linie" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {volbyLinie(cirkev).map((v) => {
            const on = vyb === v, farba = v === ROK ? farbaCirkevnehoRoka(new Date(), cirkev) : FARBY_LINIE[v];
            return (
              <button key={v} type="button" role="radio" aria-checked={on} onClick={() => void nastavLiniu(strankaId, v)}
                style={{ minHeight: 44, padding: "0 14px 0 10px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 8,
                  background: on ? "var(--gSoft)" : "var(--btn)", border: `1.5px solid ${on ? "var(--gBd)" : "transparent"}`, color: on ? "var(--gInk)" : "var(--ink)" }}>
                <span aria-hidden="true" style={{ width: 22, height: 6, borderRadius: 3, background: farba, flex: "none" }} />{v}
              </button>);
          })}
        </div>
        <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)" }}>Línia pod titulkou a medzi blokmi na stránke farnosti. Tlačidlá, karty, text a pozadie sa nemenia.{volbyLinie(cirkev)[0] === ROK ? ` Podľa cirkevného roka: advent a pôst fialová, Vianoce a Veľká noc zlatá, Turíce červená, inak zelená.${cirkev === "PC" ? " Sviatky podľa juliánskeho kalendára." : ""}` : ""}</span>
      </div>
    </div>);
}
