// ============================================================
// DEED · ZOZNAM DARCOV pri zbierke (DEED_Zoznam_Darcov_DEV.md)
// Kompakt pod platobným modulom: posledných ~5 riadkov + „Zobraziť
// všetkých (N)" (N = počítadlo „X ľudí pomohlo" — jeden zdroj čísel).
// Riadok: [identita] daroval [suma?] · relatívny čas. Len zobrazenie —
// pravidlá (prah, anonymita, verzie) rieši lib/darcovia.ts.
// + VolbaDarcovstva — voľba identity darcu v platobnom kroku (PlatbaModal).
// ============================================================
import { useState } from "react";
import type { CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { usePouzivatel } from "@/lib/pouzivatel";
import { pressable } from "@/components/pressable";
import { Sheet } from "@/components/sheet";
import { Switch } from "@/components/ui";
import {
  DARCOVIA_CFG, useDarcovia, identitaDarcu, zobrazenaSuma, relCas, useSektorDarcu, menoBezMena, volbaBezMena,
  
  type DarRiadok, type VolbaDaru, type VerziaIdentity,
} from "@/lib/darcovia";

// ---- jeden riadok zoznamu ----
function Riadok({ r, prvy, skrytSumy }: { r: DarRiadok; prvy?: boolean; skrytSumy?: boolean }) {
  const ja = usePouzivatel();
  const sektor = useSektorDarcu();
  const suma = skrytSumy ? null : zobrazenaSuma(r);
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: SPACE.xs, padding: `${SPACE.xs}px 0`, borderBottom: `1px solid ${C.line2}`, fontSize: 12.5, ...(prvy ? { animation: "fadeUp .3s ease" } : {}) }}>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <b style={{ fontWeight: 600, color: r.firma ? "var(--a-gold)" : r.moj ? C.greenL : C.text }}>{identitaDarcu(r, ja, sektor)}</b>
        <span style={{ color: C.textSec }}>{r.firma ? " dorovnala " : ` daroval${suma ? " " : ""}`}</span>
        {suma && <b style={{ fontWeight: 700, color: r.firma ? "var(--a-gold)" : C.greenL }}>{suma}</b>}
      </span>
      <span style={{ marginLeft: "auto", flex: "none", color: C.textTer, fontSize: 11 }}>{relCas(r.cas)}</span>
    </div>
  );
}

export function ZoznamDarcov({ refId, celkom, style, skrytSumy }: {
  refId: string;
  /** príjemca vypol sumy darov na svojom profile (Viditeľnosť súm) */
  skrytSumy?: boolean;
  /** počítadlo „X ľudí pomohlo" — rovnaké číslo ako ProgresBox (jeden zdroj, spec §0.3) */
  celkom?: number;
  style?: CSSProperties;
}) {
  const riadky = useDarcovia(refId);
  const [vsetci, setVsetci] = useState(false);
  if (!riadky.length) return null;
  const kompakt = riadky.slice(0, DARCOVIA_CFG.pocetRiadkovKompakt);
  const n = Math.max(celkom ?? 0, riadky.length);
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.md}px`, ...style }}>
      <div style={{ display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".4px", color: C.textTer, marginBottom: SPACE.xxs }}>
        DARCOVIA
        <span style={{ marginLeft: "auto", color: C.greenL, fontWeight: 700, fontSize: 10.5 }}>● rastie naživo</span>
      </div>
      {kompakt.map((r, i) => <Riadok key={r.id} r={r} prvy={i === 0 && !r.id.includes("-seed-")} skrytSumy={skrytSumy} />)}
      <div {...pressable(() => setVsetci(true), "Zobraziť všetkých darcov")}
        style={{ position: "relative", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.textSec, padding: `${SPACE.sm}px 0 ${SPACE.xxs}px`, cursor: "pointer" }}>
        Zobraziť všetkých ({n.toLocaleString("sk")})
      </div>

      {vsetci && (
        <Sheet onClose={() => setVsetci(false)} label="Všetci darcovia">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: SPACE.xxs }}>Darcovia ({n.toLocaleString("sk")})</div>
          <div style={{ fontSize: 11, color: C.textTer, marginBottom: SPACE.sm }}>Chronologicky, najnovší hore. Identita aj suma sú voľbou darcu — default je Anonym.</div>
          <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
            {riadky.map((r) => <Riadok key={r.id} r={r} skrytSumy={skrytSumy} />)}
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ============================================================
// VOĽBA DARCOVSTVA — v platobnom kroku (spec §2): 4 verzie jedným klikom,
// prepínač „zobraziť sumu" (len nad prahom) + „zobraziť mesto" (profilová
// predvoľba, opt-in). Pasívny/neregistrovaný nevolí nič — vždy Anonymný darca.
// ============================================================
export function VolbaDarcovstva({ volba, onZmena, sumaEur }: {
  volba: VolbaDaru; onZmena: (v: VolbaDaru) => void; sumaEur: number;
}) {
  const ja = usePouzivatel();
  const sektor = useSektorDarcu();
  const registrovany = ja.typ !== "pasivny";

  if (!registrovany) {
    // akvizičný háčik bez vnucovania: chce viac → registrácia
    return (
      <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm, fontSize: 11.5, color: C.textSec, lineHeight: 1.45 }}>
        V zozname darcov sa zobrazíš ako <b>{menoBezMena(sektor)}</b>. Chceš darovať pod menom či prezývkou? Stačí bezplatná registrácia.
      </div>
    );
  }

  const inicialovo = `${ja.meno} ${(ja.priezvisko || "")[0]?.toUpperCase() ?? ""}${(ja.priezvisko || "")[0] ? "." : ""}`.trim();
  // Martin K. · Martin Konaľ · Martin Konaľ, Trenčín · Martin585 · Anonym (predvolená = posledná voľba)
  const maMesto = !!ja.mesto && ja.mesto !== "—";
  const moznosti: Array<{ v: VerziaIdentity; label: string }> = [
    { v: 2, label: inicialovo },
    { v: 1, label: ja.celeMeno },
    ...(maMesto ? [{ v: 5 as VerziaIdentity, label: `${ja.celeMeno}, ${ja.mesto}` }] : []),
    ...(ja.nick ? [{ v: 3 as VerziaIdentity, label: ja.nick }] : []),
    { v: 4, label: volbaBezMena(sektor) },
  ];
  const podPrahom = sumaEur > 0 && sumaEur < DARCOVIA_CFG.prahSumy;

  return (
    <div style={{ marginBottom: SPACE.sm }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".3px", color: C.textTer, marginBottom: SPACE.xs }}>V ZOZNAME DARCOV SA UKÁŽEŠ AKO</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs }}>
        {moznosti.map((m) => {
          const on = volba.verzia === m.v;
          return (
            <button key={m.v} onClick={() => onZmena({ ...volba, verzia: m.v })} aria-pressed={on}
              style={{ padding: `${SPACE.xs}px ${SPACE.sm}px`, borderRadius: RADIUS.pill, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${on ? C.green : C.line}`, background: on ? tint(C.green, .12) : "rgba(var(--glass-rgb),.05)", color: on ? C.green : C.textSec }}>
              {m.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gap: SPACE.xs, marginTop: SPACE.xs }}>
        {sumaEur >= DARCOVIA_CFG.prahSumy ? (
          <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, cursor: "pointer", background: tint(C.green, volba.zobrazSumu ? .12 : .06), border: `1px solid ${tint(C.green, volba.zobrazSumu ? .45 : .25)}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px` }}>
            <Switch on={volba.zobrazSumu} onChange={(v) => onZmena({ ...volba, zobrazSumu: v })} ariaLabel="Zobraziť sumu daru" />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: volba.zobrazSumu ? C.green : C.text }}>Zobraziť sumu daru</span>
              <span style={{ display: "block", fontSize: 11, color: C.textTer }}>{volba.zobrazSumu ? "V zozname darcov bude pri tebe aj suma." : "V zozname darcov bude len „daroval“, bez sumy."}</span>
            </span>
          </label>
        ) : podPrahom ? (
          <div style={{ fontSize: 10.5, color: C.textTer }}>Dar pod {DARCOVIA_CFG.prahSumy} € sa zobrazuje bez sumy — vždy len „daroval".</div>
        ) : null}
      </div>
    </div>
  );
}
