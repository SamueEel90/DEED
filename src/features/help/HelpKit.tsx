// ============================================================
// HELP KIT — zdieľané Help-špecifické UI (v3 spec)
// Tag témy · Prísny režim (zraniteľní) · malé placeholder pomôcky.
// Reusnuté naprieč OfferFlow / Ľudská pomoc / Finančný wizard.
// ============================================================
import { C, infoBox, btn, SPACE, RADIUS } from "@/theme";
import { tint, tagChip } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { Otazka } from "@/shared";
import type { Sektor } from "./konstanty";
import { SEKTORY, TAG_VAROVANIE, PRISNY_OTAZKA, PRISNY_POZIADAVKY, LIMIT_MEDZI_ZIADOSTAMI_DNI } from "./konstanty";

// ---- TAG TÉMY (číselník sektorov / segmentov, multi-select) ---------------
export function TagTemy({ vybrane, onToggle, akcent = "var(--a-danger)", polozky = SEKTORY, varovanie = true }: {
  vybrane: string[];
  onToggle: (id: string) => void;
  akcent?: string;
  polozky?: Sektor[];
  varovanie?: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs, marginTop: SPACE.sm }}>
        {polozky.map((s) => {
          const on = vybrane.includes(s.id);
          return (
            <span key={s.id} {...pressable(() => onToggle(s.id), s.label)} aria-pressed={on}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: RADIUS.lg, fontSize: 12.5, fontWeight: on ? 700 : 600, cursor: "pointer", background: on ? tint(akcent, .15) : C.surface2, border: `1px solid ${on ? tint(akcent, .5) : C.line2}`, color: on ? akcent : C.textSec }}>
              <span aria-hidden>{s.emoji}</span>{s.label}
            </span>
          );
        })}
      </div>
      {varovanie && <div style={{ ...infoBox, marginTop: SPACE.sm, fontSize: 12 }}>{TAG_VAROVANIE}</div>}
    </div>
  );
}

// toggle jednej témy v poli (helper pre stav)
export const prepniTag = (tagy: string[], id: string): string[] =>
  tagy.includes(id) ? tagy.filter((t) => t !== id) : [...tagy, id];

// ---- ZRANITEĽNÍ (2b) — otázka + prísny režim ------------------------------
// `pomahajuci` = pri DOPYTE prísny režim platí pre toho, kto sa PRIHLÁSI (nie zadávateľa).
export function ZranitelniBlok({ hodnota, onZmena, pomahajuci = false }: {
  hodnota: boolean | null;
  onZmena: (v: boolean) => void;
  pomahajuci?: boolean;
}) {
  return (
    <div style={{ marginTop: SPACE.md }}>
      <Otazka>{PRISNY_OTAZKA}</Otazka>
      <div style={{ display: "flex", gap: SPACE.sm }}>
        <ZBtn label="Áno" on={hodnota === true} col="var(--a-danger)" onClick={() => onZmena(true)} />
        <ZBtn label="Nie" on={hodnota === false} col="var(--a-info)" onClick={() => onZmena(false)} />
      </div>
      {hodnota && <PrisnyRezimPanel pomahajuci={pomahajuci} />}
    </div>
  );
}

function ZBtn({ label, on, col, onClick }: { label: string; on: boolean; col: string; onClick: () => void }) {
  return (
    <div {...pressable(onClick, label)} aria-pressed={on}
      style={{ flex: 1, textAlign: "center", padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.sm, fontSize: 14, fontWeight: on ? 700 : 600, cursor: "pointer", background: on ? tint(col, .15) : C.surface2, border: `1px solid ${on ? tint(col, .5) : C.line2}`, color: on ? col : C.textSec }}>
      {label}
    </div>
  );
}

// panel požiadaviek prísneho režimu (v prototype = mock, len zobrazenie)
export function PrisnyRezimPanel({ pomahajuci = false }: { pomahajuci?: boolean }) {
  return (
    <div style={{ marginTop: SPACE.sm, border: `1px solid ${tint("var(--a-danger)", .4)}`, background: tint("var(--a-danger)", .08), borderRadius: RADIUS.md, padding: SPACE.md }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontWeight: 700, color: "var(--a-danger)", fontSize: 13.5 }}>
        🛡 Prísny režim — práca so zraniteľnými
      </div>
      <div style={{ fontSize: 12.5, color: C.textSec, marginTop: SPACE.xs, lineHeight: 1.5 }}>
        {pomahajuci
          ? <>Prísnym režimom prejde <b>ten, kto sa prihlási</b> ako pomáhajúci — nie ty. Bude musieť doložiť <b>(mock)</b>:</>
          : <>Pred zverejnením treba doložiť <b>(mock v prototype)</b>:</>}
      </div>
      <ul style={{ margin: `${SPACE.xs}px 0 0`, paddingLeft: 18, fontSize: 12.5, color: C.textSec, lineHeight: 1.6 }}>
        {PRISNY_POZIADAVKY.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  );
}

// odznak do zhrnutia / karty
export function PrisnyBadge() {
  return <span style={tagChip("var(--a-danger)")}>🛡 zraniteľní — prísny režim</span>;
}

// ---- AI placeholder (mock verdikt) ----------------------------------------
// v prototype AI vždy „OK" / náhoda-free; text pripomína, že kontrola beží aj tak.
export function AiPoznamka({ text }: { text: string }) {
  return <div style={{ ...infoBox, fontSize: 12.5 }}>🤖 {text} <span style={{ color: C.textTer }}>(mock — v prototype AI vždy „OK")</span></div>;
}

// ---- GUARD 0.1 (anti-fraud brána pred finančnou žiadosťou) ----------------
// ⚠ POZNÁMKA PRE SAMA: tu pôjde reálny FUZZY MATCH — porovnanie novej žiadosti
// voči existujúcim (podobný príbeh / recyklované foto / opakované páry) +
// 30-dňový limit medzi žiadosťami (Funkcna v1 §7 anti-fraud). V prototype = MOCK
// (vždy prejde). Presná logika guardu 0.1 je vo v3 — doladiť po jeho dodaní.
export function GuardFuzzy({ onOk }: { onOk: () => void }) {
  const checks: [string, string, string][] = [
    ["🕒", `${LIMIT_MEDZI_ZIADOSTAMI_DNI}-dňový limit medzi žiadosťami`, "aby sa žiadosti nereťazili donekonečna"],
    ["🔁", "Fuzzy kontrola duplicít", "podobný príbeh · recyklované foto · opakované páry"],
    ["🪪", "KYC príjemcu", "peniaze idú vždy na overený účet"],
  ];
  return (
    <>
      <Otazka>Než začneme — rýchla kontrola</Otazka>
      <div style={infoBox}>Finančná žiadosť má zámerné trenie (anti-fraud). Než ju vytvoríš, systém spraví pár kontrol.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs, marginTop: SPACE.md }}>
        {checks.map(([e, t, d], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: SPACE.sm, borderRadius: RADIUS.sm, background: C.surface2, border: `1px solid ${C.line2}` }}>
            <span style={{ fontSize: 20 }} aria-hidden>{e}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 11.5, color: C.textTer }}>{d}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--a-green)" }}>✓ OK</span>
          </div>
        ))}
      </div>
      <div style={{ ...infoBox, marginTop: SPACE.sm, fontSize: 12, background: tint("var(--a-clay)", .1), borderColor: tint("var(--a-clay)", .35), color: "var(--a-clay)" }}>
        🔧 Mock: reálny fuzzy match + 30-dňový limit sem (v3 guard 0.1). Teraz vždy prejde.
      </div>
      <button onClick={onOk} style={{ ...btn("primary"), width: "100%", marginTop: SPACE.gutter }}>Prešlo — pokračovať</button>
    </>
  );
}
