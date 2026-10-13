// Martin 13. 10. (Blok A): farár pri zbierke farnosti — „Ukázať sumy pri darcoch: Áno · Nie“ (predvolené Nie).
import { useSumyDarcov, nastavSumyDarcov } from "@/lib/sumyDarcov";

export function SumyPriDarcoch({ stranka, kluc, nadpis = "Ukázať sumy pri darcoch" }: { stranka: string; kluc: string; nadpis?: string }) {
  const ano = useSumyDarcov(stranka, kluc);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <b style={{ fontSize: 15, flex: "1 1 180px" }}>{nadpis}</b>
        <span role="radiogroup" aria-label={nadpis} style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)" }}>
          {([["Áno", true], ["Nie", false]] as const).map(([t, v]) => { const on = ano === v; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => { if (!on) void nastavSumyDarcov(stranka, kluc, v); }}
              style={{ minHeight: 40, padding: "0 18px", border: "none", borderRadius: 9, background: on ? "var(--card)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: on ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>); })}
        </span>
      </span>
      <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{ano ? "Pri darcoch sa ukáže meno aj suma. Dary pod 2 € len s menom." : "Pri darcoch sa ukáže len meno, bez sumy."}</span>
    </div>);
}
