// ============================================================
// OPRAVY 420 (charita) · Správa → Obsah → Iskry: zoznam Iskier tejto charity + „+ Pridať Iskru“ (hotové PridatIskru).
// Iskra charity = autor je názov charity (rovnako ju berie verejný profil, záložka Iskry). Nič nové sa nekreslí.
// ============================================================
import { useEffect } from "react";
import { iskryVsetky, nacitajPrud, useZmenyIskier, pocetIskier } from "@/lib/iskry";
import { otvorIskry, otvorPridatIskru } from "@/features/iskry/otvor";
import { cistyText } from "@/lib/richtext";

const datum = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };

export function IskryCharity({ strankaId, nazov, mobil }: { strankaId: string; nazov: string; mobil: boolean }) {
  useZmenyIskier();
  useEffect(() => { nacitajPrud(); }, []);
  const moje = iskryVsetky().filter((v) => v.autor === nazov);
  const karta = { borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "1px solid var(--cardBd)" } as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 900 }}>
      <button type="button" onClick={() => otvorPridatIskru(strankaId)}
        style={{ alignSelf: "flex-start", minHeight: 52, padding: "0 22px", border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, boxShadow: "none" }}>+ Pridať Iskru</button>
      {moje.length === 0
        ? <section style={{ ...karta, padding: "16px 20px", fontSize: 14.5, color: "var(--ink3)" }}>Zatiaľ žiadna Iskra. Krátke video do 45 s sa ukáže na vašom profile v záložke Iskry.</section>
        : <section style={{ ...karta, padding: mobil ? "4px 14px" : "6px 20px" }}>
          {moje.map((v, i) => (
            <button key={v.id} type="button" onClick={() => otvorIskry(v.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
              <span aria-hidden="true" style={{ width: 40, height: 52, flex: "none", borderRadius: 8, background: v.bg || "#1D211B" }} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cistyText(v.popis) || "Iskra"}</b>
                <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{[datum(v.zverejnene), v.lenStranka ? "len na profile" : "aj v Iskrách", `${pocetIskier(v)} iskier`].filter(Boolean).join(" · ")}</span>
              </span>
              <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>›</span>
            </button>))}
        </section>}
    </div>);
}
