// ============================================================
// OPRAVY 211 — blok „Deti a mládež" na Nástenke (prototyp Deti a mladez.dc.html, 1b).
// Karty ako Oznamy: dátumový štvorec (tábor = viacdňový, plná modrá), druh · kedy, názov, miesto · text, Prídem + počet.
// Tábor: „Prihlásiť dieťa" (prihlasuje rodič) a „voľných N". Mená detí verejne nikdy, len počet. Prázdny blok sa neukáže.
// ============================================================
import { kdeNaStranke } from "@/features/rola/VyberKostola";
import { useMiesta } from "@/lib/miestaFarnosti";
import { useContext, useState, type CSSProperties, type ReactNode } from "react";
import { Videne, VideneKontext, zoradVidene, podpis } from "@/lib/videne";
import { useStretnutia, skoncilo, jeTabor } from "@/lib/detiMladez";
import { reakcieF, prepniReakciuF, useReakcieF } from "@/lib/reakcieFarnosti";
import { cistyText } from "@/lib/richtext";
import { toast } from "@/shared";
import { kedyStretnutia } from "@/features/rola/DetiMladezFarnosti";
import { Datum, Viac } from "./NastenkaFarnosti";
import { CelaGaleria, OdznakFotiek, type MediumGalerie } from "@/components/celaGaleria";
import { medGal } from "@/lib/medGal";

const zIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

/** KARTA 66 · Konzervatívny: položka ako riadok (bez fotky na stránke, fotky na ťuk) */
export type RiadokDeti = { id: string; dat?: Date; kedy: string; t: string; txt: string; tlac: ReactNode; poc: string; fotky: string[]; /** OPRAVY 270 */ popisy?: string[] };
export function DetiAMladezBlok({ strankaId, blokStyl, lavy, kto, mojeMeno, reg, riadok }: { strankaId: string; blokStyl: CSSProperties; lavy: ReactNode; kto: string; mojeMeno: string; reg: boolean; riadok?: (r: RiadokDeti) => ReactNode }) {
  useReakcieF();
  const [gal, setGal] = useState<{ t: string; m: MediumGalerie[] } | null>(null); // OPRAVY 270: ťuk na fotku = prehliadač
  const miestaF = useMiesta(strankaId); // OPRAVY 287: Iné miesto, inak kostol
  const vid = useContext(VideneKontext); // OPRAVY 297: videné sa pri ďalšej návšteve zbalia, neprečítané hore
  const ps = (s: { t: string; txt: string; dat: string; cas: string; kde: string; kostol?: string; fotky?: string[] }) => podpis(s.t, s.txt, s.dat, s.cas, s.kde, s.kostol, s.fotky?.[0]);
  const L = zoradVidene(vid, useStretnutia(strankaId).filter((s) => !skoncilo(s)).sort((a, b) => a.dat.localeCompare(b.dat)), (s) => [s.id, ps(s)]);
  if (!L.length) return null;
  return (
    <div data-blok="deti" style={blokStyl}>
      {lavy}
      <div style={riadok ? { display: "flex", flexDirection: "column", minWidth: 0 } : { flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,420px))", gap: 16, alignItems: "start", overflowWrap: "anywhere" }}>
        {L.map((s) => {
          const r = reakcieF(strankaId, s.id), l = r.ucast ?? [], ja = l.includes(kto), tab = jeTabor(s), zav = s.pz === 2;
          const plne = !ja && zav && s.limit > 0 && l.length >= s.limit;
          const t = plne ? "Plné · ďakujeme" : ja ? (tab ? "Prihlásené ✓ · zrušiť" : zav ? "Prihlásený ✓ · zrušiť" : "Prídem ✓ · zrušiť") : tab && zav ? "Prihlásiť dieťa" : zav ? "Prihlásiť sa" : "Prídem";
          const poc = tab && s.limit ? `voľných ${Math.max(0, s.limit - l.length)}` : l.length ? (zav ? `prihlásených ${l.length}` : `príde ${l.length}`) : s.limit ? `miesta: ${s.limit}` : "";
          const foto = s.fotky?.[0], txt = cistyText(s.txt).trim();
          if (riadok) return <Videne key={s.id} id={s.id} podpis={ps(s)}>{riadok({ id: s.id, dat: s.dat ? zIso(s.dat) : undefined, kedy: kedyStretnutia(s), t: s.t, txt: [kdeNaStranke(s.kostol, s.kde, miestaF), txt].filter(Boolean).join(" · "), poc, fotky: s.fotky ?? [], popisy: s.popisy,
            tlac: s.pz > 0 ? <button type="button" aria-pressed={ja} disabled={plne} onClick={() => { if (zav && !ja && !reg) { toast("Prihlásiť sa menom môžu len registrovaní v DEED+."); return; } prepniReakciuF(strankaId, s.id, "ucast", kto, mojeMeno); }}
              style={{ minHeight: 48, padding: "0 18px", borderRadius: 12, cursor: plne ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", border: ja ? "2px solid var(--nf-zelena)" : "2px solid var(--nf-plne)", background: plne ? "var(--nf-vyp)" : ja ? "var(--nf-gSoft)" : "var(--nf-plne)", color: plne ? "var(--nf-ink2)" : ja ? "var(--nf-gInk)" : "var(--nf-plneInk)" }}>{t}</button> : null })}</Videne>;
          return (
            <Videne key={s.id} id={s.id} podpis={ps(s)}>
            <div style={{ borderRadius: 22, overflow: "hidden", background: "var(--nf-karta)", display: "flex", flexDirection: "column" }}>
              {foto && (() => { const m = medGal(s.fotky, s.popisy); return <button type="button" onClick={() => { if (m.length) setGal({ t: s.t, m }); }} aria-label="Fotky na celú obrazovku" style={{ position: "relative", border: "none", padding: 0, cursor: "zoom-in", display: "block" }}><img src={foto} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} /><OdznakFotiek m={m} /></button>; })()}
              <div style={{ padding: "16px 18px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                {s.dat && <Datum d={zIso(s.dat)} viacdnova={tab && !!s.datDo && s.datDo !== s.dat} />}
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--nf-gInk)" }}>{`${s.druh} · ${kedyStretnutia(s)}`.toLocaleUpperCase("sk-SK")}</span>
                  <b style={{ fontSize: 18, lineHeight: 1.3, color: "var(--nf-ink)" }}>{s.t}</b>
                  {kdeNaStranke(s.kostol, s.kde, miestaF) && <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--nf-ink2)" }}>{kdeNaStranke(s.kostol, s.kde, miestaF)}</span>}
                  {txt && <div className="vid-skry"><Viac text={s.txt} velkost={15.5} /></div>}
                  {s.pz > 0 && <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 4 }}>
                    <button type="button" aria-pressed={ja} disabled={plne} onClick={() => { if (zav && !ja && !reg) { toast("Prihlásiť sa menom môžu len registrovaní v DEED+."); return; } prepniReakciuF(strankaId, s.id, "ucast", kto, mojeMeno); }}
                      style={{ minHeight: 48, padding: "0 18px", borderRadius: 13, cursor: plne ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", border: ja ? "2px solid var(--nf-zelena)" : "2px solid var(--nf-plne)", background: plne ? "var(--nf-vyp)" : ja ? "var(--nf-gSoft)" : "var(--nf-plne)", color: plne ? "var(--nf-ink2)" : ja ? "var(--nf-gInk)" : "var(--nf-plneInk)" }}>{t}</button>
                    {poc && <span style={{ fontSize: 15.5, fontWeight: 700, color: "var(--nf-ink)" }}>{poc}</span>}
                  </span>}
                </span>
              </div>
            </div></Videne>);
        })}
      </div>
      {gal && <CelaGaleria media={gal.m} nadpis={gal.t} onClose={() => setGal(null)} />}
    </div>);
}
