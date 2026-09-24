// ============================================================
// NAŠE ZBIERKY (správa firmy) — jedno miesto, kde firma pracuje so zbierkou,
// ktorú podporuje. Zbierka sa sem dostane tým, že firma na ňu dala (dar alebo
// zaplatený strop dorovnania) — nedá sa „pripnúť" zbierka, na ktorú nedala nič.
//
// Pri každej zbierke: čísla (dané, vyčlenené, rozdané), bežiace dorovnanie
// a archivácia (stiahnutie z podstránky; dar aj ESG ostávajú).
// Zamestnanci a ESG pribudnú sem, nie do ďalších tlačidiel.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { najdiZbierku } from "@/lib/zbierky";
import { najdiKampan } from "@/features/cudzi-profil/orgy";
import { usePodporyFirmy, archivuj, vratZArchivu, type Podpora } from "@/lib/podpory";
import { useDorovnaniaFirmy, vycerpane, zostatok, popisPomeru, bezi as beziDorovnanie, type Dorovnanie } from "@/lib/dorovnanie";
import { NoveDorovnanieSheet } from "./Dorovnanie";

const ZLATA = "var(--a-gold)";
const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const karta: CSSProperties = {
  background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
  padding: SPACE.sm, marginBottom: SPACE.sm,
};
const cip = (farba: string): CSSProperties => ({
  flex: "none", fontSize: 9.5, fontWeight: 800, letterSpacing: ".04em",
  color: farba, background: tint(farba, .14), borderRadius: RADIUS.pill, padding: `2px ${SPACE.xs}px`,
});

/** názov a stav zbierky — naša (register) aj cudzia (profil organizácie v module Charita) */
function oZbierke(id: string) {
  const z = najdiZbierku(id);
  // `nasa` = zbierka z registra DEED, ktorú vieme spravovať (dorovnanie sa dá
  // založiť len k nej); cudzie kampane z profilov organizácií vieme len pomenovať
  if (z) return { nazov: z.nazov, komu: z.komu, emoji: z.emoji, aktivna: z.stav === "aktivna", nasa: true };
  const k = najdiKampan(id);
  if (k) return { nazov: k.kampan.nazov, komu: k.org, emoji: k.kampan.emoji, aktivna: true, nasa: false };
  return null;
}

export function NaseZbierkySheet({ firma, toast, onClose }: {
  firma: string; toast: (m: string) => void; onClose: () => void;
}) {
  const [nove, setNove] = useState<{ id: string; nazov: string } | null>(null);
  const podpory = usePodporyFirmy(firma);
  const dorovnania = useDorovnaniaFirmy(firma);
  const [teraz] = useState(() => Date.now());

  const dorovnanieKu = (zbierkaId: string): Dorovnanie | undefined =>
    dorovnania.find((d) => d.ciel === zbierkaId && (beziDorovnanie(d, teraz) || d.stav === "zapecatene"));

  const dane = podpory.reduce((a, p) => a + p.suma, 0);
  const vyclenene = dorovnania.filter((d) => d.stav === "aktivne" || d.stav === "zapecatene").reduce((a, d) => a + zostatok(d), 0);

  const riadok = (p: Podpora) => {
    const z = oZbierke(p.zbierkaId);
    const d = dorovnanieKu(p.zbierkaId);
    const archiv = !!p.archivovane;
    const stav = archiv ? "STIAHNUTÁ" : z?.aktivna ? "BEŽÍ" : "UKONČENÁ";
    const farbaStavu = archiv ? "var(--a-clay)" : z?.aktivna ? "var(--a-green)" : C.textTer;
    return (
      <div key={p.zbierkaId} style={{ ...karta, opacity: archiv ? .7 : 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
          <span style={{ fontSize: 18, flex: "none" }}>{z?.emoji ?? "🤝"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {z?.nazov ?? "Zbierka"}
            </div>
            {z?.komu && <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{z.komu}</div>}
          </div>
          <span style={cip(farbaStavu)}>{stav}</span>
        </div>

        <div style={{ fontSize: 11.5, color: C.textSec, marginTop: SPACE.xs, lineHeight: 1.6 }}>
          {p.suma > 0 && <>dali sme <b style={{ color: C.text }}>{eur(p.suma)}</b></>}
          {p.suma > 0 && d ? " · " : ""}
          {d && <>na dorovnávanie vyčlenené <b style={{ color: C.text }}>{eur(d.strop)}</b>, rozdané <b style={{ color: ZLATA }}>{eur(vycerpane(d))}</b></>}
          {!p.suma && !d && "zatiaľ bez pohybu"}
        </div>

        {d ? (
          <div style={{ marginTop: SPACE.xs }}>
            <span style={cip(d.lenZamestnanci ? "var(--a-plum)" : ZLATA)}>
              {d.lenZamestnanci ? "LEN NAŠI ĽUDIA" : "VEREJNÉ DOROVNANIE"}
            </span>
            <div style={{ fontSize: 11, color: ZLATA, fontWeight: 700, marginTop: 4 }}>
              🤝 dorovnávame {popisPomeru(d.pomer)}
              {d.stav === "zapecatene" ? " · čaká na potvrdenie charity" : ""}
            </div>
            <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 2, lineHeight: 1.5 }}>
              {d.lenZamestnanci
                ? "Súkromná firemná akcia — rátame a ukazujeme len dary vašich ľudí."
                : "Dorovnávame každému, kto na zbierku dá."}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xs, lineHeight: 1.5 }}>
            Dorovnávanie tu nebeží — zbierka je len podporená vaším darom.
            {z?.nasa && z?.aktivna ? "" : " (Dorovnanie sa dá založiť len pri bežiacej zbierke z DEED.)"}
          </div>
        )}

        {!d && z?.nasa && z?.aktivna && !archiv && (
          <div {...pressable(() => setNove({ id: p.zbierkaId, nazov: z.nazov }), "Založiť dorovnanie")}
            style={{ marginTop: SPACE.xs, fontSize: 12, fontWeight: 800, color: "var(--a-info)", cursor: "pointer" }}>
            + Založiť dorovnanie (verejné alebo len pre našich)
          </div>
        )}

        <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.xs }}>
          <span {...pressable(() => {
            if (archiv) { vratZArchivu(firma, p.zbierkaId); toast("Zbierka je späť na vašej stránke"); }
            else { archivuj(firma, p.zbierkaId); toast("Stiahnuté zo stránky — dar aj ESG ostávajú"); }
          }, archiv ? "Vrátiť na stránku" : "Stiahnuť zo stránky")}
            style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: C.textTer, cursor: "pointer" }}>
            {archiv ? "Vrátiť na stránku" : "Stiahnuť zo stránky"}
          </span>
        </div>
      </div>
    );
  };

  const bezia = podpory.filter((p) => !p.archivovane && oZbierke(p.zbierkaId)?.aktivna);
  const ostatne = podpory.filter((p) => !bezia.includes(p));

  // založenie dorovnania priamo zo správy — ten istý formulár ako pri zbierke
  if (nove) return (
    <NoveDorovnanieSheet entita="charita" cielId={nove.id} cielNazov={nove.nazov}
      toast={toast} onClose={() => setNove(null)} />
  );

  return (
    <Sheet onClose={onClose} label="Naše zbierky">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🎯 Naše zbierky</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Zbierka sa sem dostane tým, že na ňu dáte — vtedy sa vám zároveň objaví na vašej stránke.
        Odtiaľ ju viete stiahnuť, aj keď dar ostáva v histórii a v ESG.
      </div>

      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
        {[["Podporujeme", String(bezia.length)], ["Dali sme", eur(dane)], ["Ostáva na dorovnávanie", eur(vyclenene)]].map(([k, v]) => (
          <div key={k} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 1 }}>{k}</div>
          </div>
        ))}
      </div>

      {bezia.map(riadok)}
      {ostatne.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: C.textTer, margin: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>
            UKONČENÉ A STIAHNUTÉ
          </div>
          {ostatne.map(riadok)}
        </>
      )}

      {!podpory.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ ste nepodporili žiadnu zbierku.<br />Nájdite si charitu, otvorte jej zbierku a darujte — objaví sa tu aj na vašej stránke.
        </div>
      )}
    </Sheet>
  );
}
