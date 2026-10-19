// ============================================================
// OPRAVY 412 · Nástroje → Štít dôvery na web (od P1)
// Jeden odznak = obrázok štítu DEED+ CARE podľa aktuálnej úrovne (Bronz · Striebro · Zlato · Platina · Legenda),
// bez voľby svetlý / tmavý, bez textu navyše. Ťuk na odznak na webe otvorí verejný profil charity v DEED+.
// Obrázok sa načítava z DEED+ (/odznak/{stránka}, api/odznak.ts) — keď charita postúpi, odznak sa zmení sám.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ADRESA } from "@/lib/adresa";
import { klucNaSlug } from "@/lib/testProfily";
import { verejneZPamate, zapisVerejne } from "@/lib/verejneNastavenia";
import { StitCare } from "@/features/verejny-profil/casti";

const ZELENA = "#4B7A35";
const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };

/** kód pre web charity: odkaz na verejný profil + obrázok štítu z DEED+ */
export const kodOdznaku = (strankaId: string, nazov: string) =>
  `<a href="${ADRESA}/p/${encodeURIComponent(klucNaSlug(strankaId))}" target="_blank" rel="noopener"><img src="${ADRESA}/odznak/${encodeURIComponent(strankaId)}" alt="${nazov.replace(/[<>"&]/g, "")} · Štít dôvery DEED+ CARE" width="120" height="146" style="border:0"></a>`;

export function StitNaWeb({ strankaId, nazov, stit, mobil }: { strankaId: string; nazov: string; /** „bronze“ … „legend“ */ stit: string; mobil: boolean }) {
  const [hotovo, setHotovo] = useState<"ok" | "chyba" | null>(null);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  // úroveň štítu musí poznať aj server (odznak na cudzom webe sa číta odtiaľ)
  useEffect(() => { if (verejneZPamate(strankaId)?.["stit"] !== stit) void zapisVerejne(strankaId, "stit", stit); }, [strankaId, stit]);
  const velky = stit.charAt(0).toUpperCase() + stit.slice(1);
  const kopiruj = async () => {
    window.clearTimeout(tm.current);
    try { await navigator.clipboard.writeText(kodOdznaku(strankaId, nazov)); setHotovo("ok"); }
    catch { setHotovo("chyba"); }
    tm.current = window.setTimeout(() => setHotovo(null), 3000);
  };
  return (
    <section style={{ ...karta, padding: mobil ? "18px 16px" : "24px 28px", display: "flex", flexDirection: mobil ? "column" : "row", alignItems: "center", gap: mobil ? 18 : 32, maxWidth: 760 }}>
      <span style={{ flex: "none", padding: 12 }}><StitCare stit={velky} w={120} h={146} /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, alignItems: mobil ? "stretch" : "flex-start" }}>
        <button type="button" onClick={() => void kopiruj()} style={{ minHeight: 50, padding: "0 22px", border: "none", borderRadius: 14, background: ZELENA, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800 }}>
          {hotovo === "ok" ? "Skopírované ✓" : "Skopírovať kód pre web"}</button>
        {hotovo === "chyba" && <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: "#A34A2A" }}>Kód sa nepodarilo skopírovať · skúste znova</span>}
        <span style={{ fontSize: 14.5, color: "var(--ink2)" }}>Pošlite to tomu, kto vám robí web.</span>
      </span>
    </section>);
}
