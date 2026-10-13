// ============================================================
// OPRAVY 211 — blok „Deti a mládež" na Nástenke (prototyp Deti a mladez.dc.html, 1b).
// Karty ako Oznamy: dátumový štvorec (tábor = viacdňový, plná modrá), druh · kedy, názov, miesto · text, Prídem + počet.
// Tábor: „Prihlásiť dieťa" (prihlasuje rodič) a „voľných N". Mená detí verejne nikdy, len počet. Prázdny blok sa neukáže.
// ============================================================
import type { CSSProperties, ReactNode } from "react";
import { useStretnutia, skoncilo, jeTabor } from "@/lib/detiMladez";
import { reakcieF, prepniReakciuF, useReakcieF } from "@/lib/reakcieFarnosti";
import { cistyText } from "@/lib/richtext";
import { toast } from "@/shared";
import { kedyStretnutia } from "@/features/rola/DetiMladezFarnosti";
import { Datum, Viac } from "./NastenkaFarnosti";

const zIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

export function DetiAMladezBlok({ strankaId, blokStyl, lavy, kto, mojeMeno, reg }: { strankaId: string; blokStyl: CSSProperties; lavy: ReactNode; kto: string; mojeMeno: string; reg: boolean }) {
  useReakcieF();
  const L = useStretnutia(strankaId).filter((s) => !skoncilo(s)).sort((a, b) => a.dat.localeCompare(b.dat));
  if (!L.length) return null;
  return (
    <div data-blok="deti" style={blokStyl}>
      {lavy}
      <div style={{ flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,420px))", gap: 16, alignItems: "start", overflowWrap: "anywhere" }}>
        {L.map((s) => {
          const r = reakcieF(strankaId, s.id), l = r.ucast ?? [], ja = l.includes(kto), tab = jeTabor(s), zav = s.pz === 2;
          const plne = !ja && zav && s.limit > 0 && l.length >= s.limit;
          const t = plne ? "Plné · ďakujeme" : ja ? (tab ? "Prihlásené ✓ · zrušiť" : zav ? "Prihlásený ✓ · zrušiť" : "Prídem ✓ · zrušiť") : tab && zav ? "Prihlásiť dieťa" : zav ? "Prihlásiť sa" : "Prídem";
          const poc = tab && s.limit ? `voľných ${Math.max(0, s.limit - l.length)}` : l.length ? (zav ? `prihlásených ${l.length}` : `príde ${l.length}`) : s.limit ? `miesta: ${s.limit}` : "";
          const foto = s.fotky?.[0], txt = cistyText(s.txt).trim();
          return (
            <div key={s.id} style={{ borderRadius: 22, overflow: "hidden", background: "var(--nf-karta)", display: "flex", flexDirection: "column" }}>
              {foto && <img src={foto} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />}
              <div style={{ padding: "16px 18px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                {s.dat && <Datum d={zIso(s.dat)} viacdnova={tab && !!s.datDo && s.datDo !== s.dat} />}
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--nf-gInk)" }}>{`${s.druh} · ${kedyStretnutia(s)}`.toLocaleUpperCase("sk-SK")}</span>
                  <b style={{ fontSize: 18, lineHeight: 1.3, color: "var(--nf-ink)" }}>{s.t}</b>
                  {(s.kde || txt) && <Viac text={[s.kde, txt].filter(Boolean).join(" · ")} velkost={15.5} />}
                  {s.pz > 0 && <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 4 }}>
                    <button type="button" aria-pressed={ja} disabled={plne} onClick={() => { if (zav && !ja && !reg) { toast("Prihlásiť sa menom môžu len registrovaní v DEED+."); return; } prepniReakciuF(strankaId, s.id, "ucast", kto, mojeMeno); }}
                      style={{ minHeight: 48, padding: "0 18px", borderRadius: 13, cursor: plne ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", border: ja ? "2px solid var(--nf-zelena)" : "2px solid var(--nf-plne)", background: plne ? "var(--nf-vyp)" : ja ? "var(--nf-gSoft)" : "var(--nf-plne)", color: plne ? "var(--nf-ink2)" : ja ? "var(--nf-gInk)" : "var(--nf-plneInk)" }}>{t}</button>
                    {poc && <span style={{ fontSize: 15.5, fontWeight: 700, color: "var(--nf-ink)" }}>{poc}</span>}
                  </span>}
                </span>
              </div>
            </div>);
        })}
      </div>
    </div>);
}
