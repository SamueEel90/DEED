// <ZbierkaModul> — JEDEN komponent pre detail zbierky + platbu na všetkých miestach (karta 01).
// Zatiaľ len kostra: pripojené položky sú rámy v pevnom poradí. Vzhľad každej položky
// prichádza postupne s kartami 02–15. Odpojené položky sa nevykresľujú vôbec.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Switch } from "@/shared";
import { pressable } from "@/components/pressable";
import { jeNeregistrovany, nastavNeregistrovany, darujemAkoFirma, nastavDarcuFirmu, sledujDarcu } from "@/lib/devDarca";
import { MIESTA, NAZVY, pripojene, type Miesto, type Kontext, type Hodnota } from "./nastavenie";
import { Hlavicka, Galeria, NadpisText, type Medium } from "./Vrch";
import "@/styles/platba.css";

export type ZbierkaData = {
  id: string; nazov: string; popis?: string;
  cislo?: number;      // verejné číslo zbierky (#47 821) — len keď ho zbierka má
  overena?: boolean;
  media?: Medium[];    // poradie volí autor (predvolene video prvé)
};

// ---- DEV simulácia (len lokálne, v produkcii miesto a stav dodá appka) ----
const KLUC_DEV = "deed.dev.zbierkaModul";
type DevStav = { miesto: Miesto; maCiel: boolean; dorovnanie: boolean; split: boolean; tempoSilna: boolean };
const DEV_ZAKLAD: DevStav = { miesto: "charita", maCiel: true, dorovnanie: false, split: false, tempoSilna: false };
function nacitajDev(): DevStav {
  try { const s = localStorage.getItem(KLUC_DEV); return s ? { ...DEV_ZAKLAD, ...JSON.parse(s) } : DEV_ZAKLAD; } catch { return DEV_ZAKLAD; }
}
function ulozDev(v: DevStav) { try { localStorage.setItem(KLUC_DEV, JSON.stringify(v)); } catch { /* LS */ } }

export function ZbierkaModul({ zbierka, miesto: miestoProp, onBack }: { zbierka: ZbierkaData; miesto?: Miesto; onBack: () => void }) {
  const [dev, setDevRaw] = useState<DevStav>(nacitajDev);
  const setDev = (z: Partial<DevStav>) => setDevRaw((d) => { const n = { ...d, ...z }; ulozDev(n); return n; });
  const [registrovany, setRegistrovany] = useState(() => !jeNeregistrovany());
  const [ico, setIco] = useState(darujemAkoFirma);
  useEffect(() => sledujDarcu(() => { setRegistrovany(!jeNeregistrovany()); setIco(darujemAkoFirma()); }), []);

  const miesto = miestoProp ?? dev.miesto;
  const k: Kontext = { registrovany, ico, maCiel: dev.maCiel, dorovnanieAktivne: dev.dorovnanie, split: dev.split, tempoSilna: dev.tempoSilna };
  const polozky = pripojene(miesto, k);

  return (
    <div className="deed-platba" style={{ minHeight: "100%", background: "var(--bg)", color: "var(--ink)", paddingBottom: SPACE.lg }}>
      <DevPanel dev={dev} setDev={setDev} miestoPevne={!!miestoProp} registrovany={registrovany} ico={ico} />

      {/* karta 02 — hlavička, galéria, nadpis a text (všade okrem hárku Podporiť DEED) */}
      {miesto !== "podporitDeed" && (
        <div style={{ padding: "4px 16px 0" }}>
          <Hlavicka cisloZbierky={zbierka.cislo} overena={zbierka.overena} onBack={onBack} />
          <Galeria media={zbierka.media ?? []} />
          <NadpisText nazov={zbierka.nazov} text={zbierka.popis} />
        </div>
      )}
      {miesto === "podporitDeed" && (
        <Ram nazov="Hárok Podporiť DEED"><span {...pressable(onBack, "Zavrieť")} style={{ cursor: "pointer", fontWeight: 700 }}>✕ Zavrieť</span></Ram>
      )}

      {/* pripojené položky — vždy rovnaké poradie, odpojené chýbajú úplne */}
      {polozky.map((p) => <Ram key={p.kluc} nazov={NAZVY[p.kluc]} hodnota={p.hodnota} />)}
    </div>
  );
}

function Ram({ nazov, hodnota, children }: { nazov: string; hodnota?: Hodnota; children?: ReactNode }) {
  return (
    <div style={{ margin: `0 ${SPACE.md}px ${SPACE.xs}px`, padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderRadius: RADIUS.sm, border: `1px dashed ${C.line}`, background: C.surface }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: SPACE.xs }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec }}>{nazov}</span>
        {typeof hodnota === "string" && <span style={{ fontSize: 11, color: C.textTer }}>· {hodnota}</span>}
      </div>
      {children && <div style={{ marginTop: SPACE.xs, fontSize: 13 }}>{children}</div>}
    </div>
  );
}

// ---- DEV panel — miesto a stav zbierky/darcu (v produkcii sa nezobrazuje) ----
function DevPanel({ dev, setDev, miestoPevne, registrovany, ico }: {
  dev: DevStav; setDev: (z: Partial<DevStav>) => void; miestoPevne: boolean; registrovany: boolean; ico: boolean;
}) {
  const [skryty, setSkryty] = useState(false);
  const chip = (on: boolean): CSSProperties => ({ padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.pill, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${on ? "var(--a-info)" : C.line}`, background: on ? C.surface2 : "transparent", color: on ? C.text : C.textSec });
  const riadok = (label: string, on: boolean, zmen: (v: boolean) => void) => (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xxs}px 0` }}>
      <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{label}</div>
      <Switch on={on} onChange={zmen} ariaLabel={label} />
    </div>
  );
  return (
    <div style={{ margin: SPACE.md, padding: SPACE.sm, borderRadius: RADIUS.sm, border: "1px dashed var(--a-plum)", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "var(--a-plum)", letterSpacing: ".04em" }}>DEV</span>
        <span style={{ flex: 1, fontWeight: 700, color: C.textSec }}>Nový detail zbierky — miesto a stav</span>
        <span {...pressable(() => setSkryty(!skryty), skryty ? "Ukázať" : "Skryť")} style={{ color: C.textTer, cursor: "pointer" }}>{skryty ? "ukázať" : "skryť"}</span>
      </div>
      {!skryty && (
        <>
          {!miestoPevne && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xxs, margin: `${SPACE.sm}px 0` }}>
              {MIESTA.map((m) => <span key={m.kluc} {...pressable(() => setDev({ miesto: m.kluc }), m.nazov)} style={chip(dev.miesto === m.kluc)}>{m.nazov}</span>)}
            </div>
          )}
          {riadok("Zbierka má cieľ", dev.maCiel, (v) => setDev({ maCiel: v }))}
          {riadok("Dorovnanie firmy beží", dev.dorovnanie, (v) => setDev({ dorovnanie: v }))}
          {dev.miesto === "sukromna" && riadok("Súkromnú splitol tvorca", dev.split, (v) => setDev({ split: v }))}
          {riadok("Tempo aspoň Silná", dev.tempoSilna, (v) => setDev({ tempoSilna: v }))}
          {riadok("Darca registrovaný", registrovany, (v) => nastavNeregistrovany(!v))}
          {riadok("Darca má IČO", ico, (v) => nastavDarcuFirmu(v))}
        </>
      )}
    </div>
  );
}
