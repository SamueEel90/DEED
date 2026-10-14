// Martin 13. 10. (Blok A): farár pri zbierke farnosti — „Ukázať sumy pri darcoch: Áno · Nie“ (predvolené Nie).
import { useSumyDarcov, nastavSumyDarcov } from "@/lib/sumyDarcov";
import { AnoNie } from "@/components/AnoNie";

export function SumyPriDarcoch({ stranka, kluc, nadpis = "Ukázať sumy pri darcoch" }: { stranka: string; kluc: string; nadpis?: string }) {
  const ano = useSumyDarcov(stranka, kluc);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <b style={{ fontSize: 15, flex: "1 1 180px" }}>{nadpis}</b>
        <AnoNie value={ano} onChange={(v) => void nastavSumyDarcov(stranka, kluc, v)} label={nadpis} />
      </span>
      <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{ano ? "Pri darcoch sa ukáže meno aj suma. Dary pod 2 € len s menom." : "Pri darcoch sa ukáže len meno, bez sumy."}</span>
    </div>);
}
