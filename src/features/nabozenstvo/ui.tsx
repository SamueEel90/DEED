// ============================================================
// MODUL NÁBOŽENSTVO — lokálna paleta + drobné zdieľané kúsky.
// Paleta N (pokojné indigo/slivka + zlatá + zelená) — theme-aware tinty,
// žiadne hardcoded rgba (viď pamäť svetlého motívu). Zdieľané naprieč
// Nabozenstvo / FarskyProfil / Kalendar / Pridat.
// ============================================================
import { useState, forwardRef, type ReactNode, type HTMLAttributes } from "react";
import { SPACE, RADIUS, SIRKA } from "@/theme";
import { tint, IkonaKriz, useLayout, Overene } from "@/shared";
import { pressable } from "@/components/pressable";

export const N = {
  card: "rgba(var(--glass-rgb),.045)", line: "rgba(var(--glass-rgb),.08)",
  ind: "var(--a-plum)", indBg: tint("var(--a-plum)", .1), indEdge: tint("var(--a-plum)", .38),
  gold: "var(--a-gold)", goldBg: tint("var(--a-gold)", .1), goldEdge: tint("var(--a-gold)", .34),
  green: "var(--a-green)", greenBg: tint("var(--a-green)", .1), greenEdge: tint("var(--a-green)", .34),
  clay: "var(--a-clay)", clayBg: tint("var(--a-clay)", .1), clayEdge: tint("var(--a-clay)", .34),
  info: "var(--a-info)", infoBg: tint("var(--a-info)", .1),
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
};

// badge „overená" — jediný odznak cirkevných subjektov (žiadna karma/levely);
// jednotný SVG odznak overenia (vzor veľkých sietí) namiesto textovej pilulky
export function Overena() {
  return <Overene size={16} label="Overená farnosť" />;
}

// jednoduchá „chip" pilulka (typ obsahu / stav).
// forwardRef + spread injektovaných props — aby SegTabs (cez cloneElement)
// dokázal na DOM span dodať onClick/role/tabIndex/ref (inak by chip nebol klikateľný).
type ChipProps = { children: ReactNode; color?: string; on?: boolean } & HTMLAttributes<HTMLSpanElement>;
export const Chip = forwardRef<HTMLSpanElement, ChipProps>(function Chip({ children, color = N.ind, on, style, ...rest }, ref) {
  return (
    <span ref={ref} {...rest} style={{ whiteSpace: "nowrap", fontSize: 12, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: 99, cursor: "pointer", background: on ? color : N.card, color: on ? "#fff" : N.txt2, fontWeight: on ? 700 : 400, border: `1px solid ${on ? color : N.line}`, ...style }}>
      {children}
    </span>
  );
});

// ============================================================
// OVERUJEM / NAMIETAM — komunitné overenie pravosti (reuse z Help/Core §78).
// Pravosť prípadu (pohreb, svadba, zbierka pre iného) NErieši záruka cirkvi,
// ale komunita. Farnosť nanajvýš „potvrdzuje, že prípad pozná", bez záruky.
// ============================================================
export function OverujemNamietam({ overeni = 0, namietky = 0, subjekt = "prípad", popis, toast }: {
  overeni?: number; namietky?: number; subjekt?: string; popis?: ReactNode; toast?: (m: string) => void;
}) {
  const [stav, setStav] = useState<null | "ok" | "nie">(null);
  const [ov, setOv] = useState(overeni);
  const [na, setNa] = useState(namietky);
  const daj = (m: "ok" | "nie") => {
    if (stav === m) return;
    if (m === "ok") { setOv((x) => x + (stav === null ? 1 : 0)); if (stav === "nie") setNa((x) => Math.max(0, x - 1)); toast?.(`Ďakujeme — potvrdil si, že ${subjekt} poznáš. Dvíha to dôveryhodnosť.`); }
    else { setNa((x) => x + (stav === null ? 1 : 0)); if (stav === "ok") setOv((x) => Math.max(0, x - 1)); toast?.("Námietka odoslaná — preverí ju komunita. Falošná námietka v zlej viere = sankcia."); }
    setStav(m);
  };
  const red = "var(--a-danger)";
  return (
    <div style={{ background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: N.txt3, letterSpacing: ".04em" }}>PRAVOSŤ OVERUJE KOMUNITA</div>
      <div style={{ fontSize: 11, color: N.txt3, margin: `2px 0 ${SPACE.sm}px`, lineHeight: 1.45 }}>{popis ?? "Nie záruka cirkvi — farnosť prípad nanajvýš pozná. Rozhoduje komunitné Overujem/Namietam."}</div>
      <div style={{ display: "flex", gap: SPACE.sm }}>
        <span {...pressable(() => daj("ok"), "Overujem")} style={ovBtn(stav === "ok", N.green, N.greenBg, N.greenEdge)}>
          <span style={{ fontSize: 15 }}>✓</span> Overujem <b style={{ opacity: .8 }}>{ov}</b>
        </span>
        <span {...pressable(() => daj("nie"), "Namietam")} style={ovBtn(stav === "nie", red, tint(red, .1), tint(red, .34))}>
          <span style={{ fontSize: 15 }}>✕</span> Namietam <b style={{ opacity: .8 }}>{na}</b>
        </span>
      </div>
    </div>
  );
}
function ovBtn(on: boolean, col: string, bg: string, edge: string): React.CSSProperties {
  return { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, cursor: "pointer",
    border: `1.5px solid ${on ? col : edge}`, background: on ? bg : "transparent", color: col, fontWeight: 700, fontSize: 13.5,
    borderRadius: RADIUS.sm, padding: `${SPACE.sm}px 0` };
}

// jednotný obal pre modálne sheety modulu (adresár, „+", split…)
export function SheetPanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { desktop } = useLayout();
  const cap: React.CSSProperties = desktop ? { maxWidth: SIRKA.citanie, margin: "0 auto", width: "100%" } : {};
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(var(--panel-rgb),.92)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", zIndex: 50, display: "flex", flexDirection: "column", animation: "fadeUp .2s ease" }}>
      <div style={{ padding: SPACE.md, borderBottom: `1px solid ${N.line}` }}>
        <div style={{ ...cap, display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <span onClick={onClose} style={{ display: "flex", color: N.txt2, cursor: "pointer" }}><IkonaKriz size={20} color={N.txt2} /></span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: SPACE.md }}><div style={cap}>{children}</div></div>
    </div>
  );
}

// ============================================================
// A9 POTVRDENIE — nastavenie domovskej cirkvi = súhlas o vierovyznaní (A9).
// Zdieľané: adresárová karta, farský profil, sprievodca výberom.
// ============================================================
export function A9Potvrdenie({ nazov, onConfirm, onCancel }: { nazov: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ background: N.goldBg, border: `1px solid ${N.goldEdge}`, borderRadius: RADIUS.sm, padding: SPACE.gutter }}>
      <div style={{ fontSize: 12, color: N.txt2, marginBottom: SPACE.sm, lineHeight: 1.5 }}>
        Nastaviť <b style={{ color: N.txt }}>{nazov}</b> ako domovskú cirkev? Je to <b>súhlas o tvojom vierovyznaní (A9)</b> — riadi mäkkú stenu feedu. Dá sa kedykoľvek zmeniť.
      </div>
      <div style={{ display: "flex", gap: SPACE.sm }}>
        <button onClick={onConfirm} style={{ ...a9Btn(N.ind, true), flex: 1 }}>Áno, potvrdiť</button>
        <button onClick={onCancel} style={{ ...a9Btn(N.txt3, false), flex: "none", padding: `0 ${SPACE.gutter}px` }}>Zrušiť</button>
      </div>
    </div>
  );
}
function a9Btn(col: string, primary: boolean): React.CSSProperties {
  return { height: 40, border: `1px solid ${primary ? col : N.line}`, background: primary ? tint(col, .12) : N.card, color: col, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs };
}

// malá dlaždica pre správcovský prehľad (dashboard) + kompaktné štatistiky
export function PrehladTile({ ikona, hodnota, label, color = N.ind }: { ikona?: ReactNode; hodnota: ReactNode; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.xs}px`, textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1.1 }}>{hodnota}</div>
      <div style={{ fontSize: 10, color: N.txt3, marginTop: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ikona}{label}</div>
    </div>
  );
}
