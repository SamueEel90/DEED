import type { CSSProperties, ReactNode } from "react";
import { C, GRAD, GRAD_ZELENY, glassTmavy } from "@/theme";
import { tint } from "@/lib/ui";
import { FEED_CFG } from "@/lib/feed";
import { useMotiv, useViac, useLayout } from "@/components/context";
import { pressable } from "@/components/pressable";
import { Sheet } from "@/components/sheet";
import { IkonaSpat, IkonaMenu, IkonaMesiac, IkonaSlnko, IkonaPlay, IkonaDoska, IkonaPlus, IkonaPin, IkonaSipDole, IkonaFajka } from "@/components/icons";

// ============================================================
// SPOLOČNÉ UI KOMPONENTY (hlavička, výbery, modaly, toasty)
// ============================================================
export function Hlavicka({ title, onBack, step, total, right, titleColor }: { title?: ReactNode; onBack?: () => void; step?: number; total?: number; right?: ReactNode; titleColor?: string }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 5, ...glassTmavy(18, .6), borderLeft: "none", borderRight: "none", borderTop: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px" }}>
        <span {...pressable(onBack, "Späť")} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}><IkonaSpat size={17} color={C.textSec} /></span>
        <span style={{ fontSize: 16, fontWeight: 700, color: titleColor }}>{title}</span>
        {right ? <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>{right}</span>
          : step ? <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 600, color: C.textTer }}>Krok {step}/{total}</span> : null}
      </div>
      {step && <div style={{ height: 3, background: "rgba(var(--glass-rgb),.06)" }}><div style={{ height: 3, background: GRAD, width: `${step / (total || 1) * 100}%`, transition: "width .35s ease", borderRadius: 2 }} /></div>}
    </div>
  );
}

export function Otazka({ children }: { children?: ReactNode }) { return <div style={{ fontSize: 15, fontWeight: 700, margin: "6px 0 12px" }}>{children}</div>; }

// ---- AVATAR S ÚROVŇOU ----
// Úroveň (napr. „L7") je zakomponovaná priamo do profilového obrázka ako malý zlatý odznak.
// `tier` môže byť „Gold · L7" / „Nováčik · L1" / „Overená charita" — úroveň sa vyparsuje, ak chýba, odznak sa nezobrazí.
export function AvatarUroven({ ini, tint, tier, size = 34, ring = true, onClick, title }: { ini?: ReactNode; tint: string; tier?: string; size?: number; ring?: boolean; onClick?: () => void; title?: string }) {
  const lvl = (String(tier || "").match(/L(\d+)/) || [])[1];
  const bH = Math.round(size * 0.44);
  return (
    <div {...(onClick ? pressable(onClick, title) : {})} title={title} style={{ position: "relative", flex: "0 0 auto", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: tint, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: Math.round(size * 0.41), color: "#fff", boxShadow: ring ? `0 0 0 ${Math.max(2, Math.round(size / 17))}px rgba(240,199,90,.85)` : "none" }}>{ini}</div>
      {lvl && (
        <span style={{ position: "absolute", bottom: -Math.round(size * 0.07), right: -Math.round(size * 0.09), height: bH, minWidth: bH, padding: "0 4px", borderRadius: bH / 2, background: "linear-gradient(135deg,#F4CE63,#DE9E36)", color: "#3A2C0E", fontSize: Math.round(size * 0.26), fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: ".02em", boxShadow: "0 1px 4px rgba(0,0,0,.32), 0 0 0 1.6px var(--c-bg)" }}>L{lvl}</span>
      )}
    </div>
  );
}

// ---- JEDNOTNÁ HLAVIČKA MODULU: ☰ + logo D⁺ + názov stránky (+ pravý obsah + prepínač režimu) ----
// pod horným riadkom: SLOGAN (§14) + voliteľná kontextová karma (§5.3 — karma danej oblasti)
// `karma` prop sa zámerne UŽ nezobrazuje (chip „★ Gold · celková" skrytý vo všetkých moduloch) —
// ostáva v type len kvôli spätnej kompatibilite volajúcich. Úroveň je teraz na avatare.
export function ModulHlavicka({ title, right, slogan = "Miesto, kde nerozhodujú slová, ale skutky" }: { title?: ReactNode; right?: ReactNode; karma?: ReactNode; slogan?: ReactNode }) {
  const { svetly, prepni } = useMotiv();
  const otvorViac = useViac();
  const { desktop } = useLayout();
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 6, ...glassTmavy(18, .6), borderLeft: "none", borderRight: "none", borderTop: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 16px 7px" }}>
        {/* na desktope navigáciu + logo nesie bočný panel → tu ☰ aj logo skryjeme (žiadny duplikát) */}
        {!desktop && <span {...pressable(otvorViac, "Menu modulov")} title="Menu modulov" style={{ display: "flex", alignItems: "center", color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}><IkonaMenu size={22} color={C.textSec} /></span>}
        {!desktop && (
          <span style={{ width: 32, height: 32, borderRadius: 10, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 4px 14px rgba(99,134,255,.4)", flex: "0 0 auto" }}>
            D<span style={{ position: "absolute", top: 3, right: 4, fontSize: 9 }}>+</span>
          </span>
        )}
        <span style={{ fontSize: 20, fontWeight: 800 }}>{title}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 13 }}>
          {right}
          <span {...pressable(prepni, "Svetlý / tmavý režim")} title="Svetlý / tmavý režim" style={{ cursor: "pointer", width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.line}`, background: C.surface, flex: "0 0 auto", color: C.textSec }}>{svetly ? <IkonaMesiac size={17} color={C.textSec} /> : <IkonaSlnko size={17} color={C.textSec} />}</span>
        </span>
      </div>
      {slogan && (
        <div style={{ padding: "2px 14px 13px" }}>
          {/* SLOGAN (§14) — väčší a výraznejší, na celú šírku obrazovky (zalamuje sa, neoreže sa) */}
          <div style={{ width: "100%", fontSize: 16.5, fontWeight: 600, fontStyle: "italic", color: C.textSec, lineHeight: 1.35, letterSpacing: ".005em", whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }}>„{slogan}"</div>
        </div>
      )}
    </div>
  );
}

export function vyberBox(active?: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? "rgba(116,166,255,.55)" : C.line}`,
    background: active ? "rgba(91,155,255,.09)" : "rgba(255,255,255,.04)",
    boxShadow: active ? "0 0 18px rgba(91,155,255,.14)" : "none",
    borderRadius: 15, padding: "13px 14px", marginBottom: 10, cursor: "pointer",
    transition: "border-color .2s ease, background .2s ease, box-shadow .2s ease",
  };
}

export function Vyber({ emoji, title, desc, active, onClick }: { emoji?: ReactNode; title?: ReactNode; desc?: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <div {...pressable(onClick)} style={vyberBox(active)}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{emoji} {title}</div>
      {desc && <div style={{ fontSize: 12, color: C.textSec, marginTop: 3, lineHeight: 1.4 }}>{desc}</div>}
    </div>
  );
}

export function NavBtns({ onBack, onNext, canNext }: { onBack?: () => void; onNext?: () => void; canNext?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
      <button onClick={onBack} style={btnLokal("ghost")}>Späť</button>
      <button onClick={onNext} disabled={!canNext} style={btnLokal(canNext ? "primary" : "disabled")}>Pokračovať</button>
    </div>
  );
}

function btnLokal(kind: string): CSSProperties {
  const base: CSSProperties = { flex: 1, padding: "13px 0", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none", fontFamily: "inherit" };
  if (kind === "primary") return { ...base, background: GRAD, color: "#fff", boxShadow: "0 8px 26px rgba(99,134,255,.32), inset 0 1px 0 rgba(255,255,255,.25)" };
  if (kind === "ghost") return { ...base, background: "rgba(var(--glass-rgb),.05)", color: C.textSec, border: `1px solid ${C.line}` };
  if (kind === "disabled") return { ...base, background: "rgba(var(--glass-rgb),.06)", color: C.textTer, cursor: "not-allowed" };
  return base;
}

export function Suhrn({ rows }: { rows: any[] }) {
  return (
    <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: 15, padding: 14 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: i < rows.length - 1 ? `1px solid ${C.line2}` : "none" }}>
          <span style={{ color: C.textTer }}>{r[0]}</span><span style={{ textAlign: "right", maxWidth: "65%", fontWeight: 600 }}>{r[1]}</span>
        </div>
      ))}
    </div>
  );
}

export function DokladRow({ text }: { text?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: 13, padding: "12px 13px", fontSize: 13 }}>
      <span>{text}</span><span style={{ fontSize: 12, fontWeight: 700, color: C.blueL, cursor: "pointer" }}>＋ doložiť</span>
    </div>
  );
}

// ============================================================
// JEDNOTNÝ LIVE TICKER — „● niekto práve poslal X → komu" (Help / Charita / Aktivity)
// rovnaký pásik: zelená pulzujúca bodka + jeden riadok textu (obsah dodá modul)
// ============================================================
export function Ticker({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 16px", fontSize: 13, color: C.textSec,
      borderTop: `1px solid ${C.line2}`, borderBottom: `1px solid ${C.line2}`, background: "rgba(31,191,143,.06)", animation: "fadeUp .45s ease" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.greenL, flex: "none", animation: "pulse 1.6s infinite" }} />
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
}

// ============================================================
// JEDNOTNÁ SEKCIA SKRATIEK — ▶ Ukáž svoj talent · ▣ Nástenka · ＋ Pridať
// rovnaký dizajn (pilulky) naprieč Domov / Help / Charita / Aktivity
// ============================================================
export function SekcieBar({ onTalent, onBoard, onAdd, talentActive }: { onTalent?: () => void; onBoard?: () => void; onAdd?: () => void; talentActive?: boolean }) {
  const base: CSSProperties = { flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 50, padding: "6px 8px", borderRadius: 14, fontSize: 13.5, fontWeight: 700, lineHeight: 1.15, textAlign: "center", cursor: "pointer", fontFamily: "inherit", transition: "all .15s ease" };
  const ghost = (active?: boolean): CSSProperties => ({ ...base, background: active ? "rgba(91,155,255,.12)" : C.surface2, border: `1px solid ${active ? "rgba(116,166,255,.45)" : C.line}`, color: active ? C.blueL : C.text });
  const primary: CSSProperties = { ...base, background: GRAD, border: "1px solid transparent", color: "#fff", boxShadow: "0 6px 20px rgba(99,134,255,.32)" };
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 16px 14px", borderBottom: `1px solid ${C.line}` }}>
      <div {...pressable(onTalent)} style={ghost(talentActive)}><IkonaPlay size={13} color={talentActive ? C.blueL : C.text} /> Ukáž svoj talent</div>
      <div {...pressable(onBoard)} style={ghost(false)}><IkonaDoska size={15} color="var(--a-info)" /> Nástenka</div>
      <div {...pressable(onAdd)} style={primary}><IkonaPlus size={16} color="#fff" /> Pridať</div>
    </div>
  );
}

// ============================================================
// JEDNOTNÝ REBRÍČEK OCENENÍ — rovnaká veľkosť a dizajn naprieč modulmi
// ocenenia: [{ ic, col, label, name, onClick }] · ludia: [{ ini, name, col, onClick }]
// pred = voliteľný úvodný kachlík (napr. Adresár v Charite)
// ============================================================
export function Rebricky({ ocenenia = [], ludia = [], pred = null }: { ocenenia?: any[]; ludia?: any[]; pred?: ReactNode }) {
  return (
    <div>
      {/* ocenenia */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 10px", overflowX: "auto", alignItems: "stretch" }}>
        {pred}
        {ocenenia.map((o, i) => (
          <div key={i} onClick={o.onClick} style={{ minWidth: 84, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13, padding: "8px 5px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: o.onClick ? "pointer" : "default", flex: "0 0 auto" }}>
            <div style={{ width: 30, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: tint(o.col, .16), color: o.col }}>{o.ic}</div>
            <div style={{ fontSize: 10, letterSpacing: ".2px", color: C.textTer, fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>{o.label}</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, textAlign: "center", maxWidth: 76, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name}</div>
          </div>
        ))}
      </div>
      {/* profilové avatary — pod oceneniami */}
      {ludia.length > 0 && (
        <div style={{ display: "flex", gap: 14, padding: "0 16px 12px", overflowX: "auto", alignItems: "flex-start" }}>
          {ludia.map((p, i) => (
            <div key={"p" + i} onClick={p.onClick} style={{ minWidth: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "0 0 auto", cursor: p.onClick ? "pointer" : "default" }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(var(--glass-rgb),.06)", border: `2px solid ${p.col || "var(--a-info)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.text }}>{p.ini}</div>
              <div style={{ fontSize: 9.5, color: C.textSec, maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// JEDNOTNÝ ŠTATISTICKÝ RIADOK — segmentovaný panel:
//   [počet v okruhu] · [mesačná štatistika] · [poloha + výber okruhu]
// rovnaký dizajn aj poloha (hneď pod rebríčkom) vo všetkých moduloch
// ============================================================
export function StatRiadok({ pocet, jednotka, mesiac, miesto = "Trenčín", okruh = "2 km", onOkruh }: { pocet?: ReactNode; jednotka?: string; mesiac?: ReactNode; miesto?: ReactNode; okruh?: ReactNode; onOkruh?: () => void }) {
  // segmentovaný panel: [počet v okruhu] · [mesačná štatistika] · [poloha + výber okruhu]
  // jednotná výška, vnútorné deliace čiary, jediný interaktívny segment = poloha
  const cislo: CSSProperties = { fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const popis: CSSProperties = { fontSize: 10.5, fontWeight: 600, color: C.textTer, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: ".01em" };
  return (
    <div style={{ padding: "4px 14px 14px", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "stretch", borderRadius: 14, background: C.surface, border: `1px solid ${C.line}`, overflow: "hidden" }}>
        {/* segment 1 — počet v okruhu (živé, pulzujúca bodka) */}
        <div title={jednotka ? `${pocet} ${jednotka} v okruhu` : "v okruhu"} style={{ flex: "1 1 0", minWidth: 0, padding: "9px 13px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", flex: "none", background: "var(--a-green)", boxShadow: "0 0 0 3px rgba(78,122,62,.18)", animation: "pulse 1.6s infinite" }} />
            <span style={cislo}>{pocet}</span>
          </div>
          <div style={popis}>v okruhu</div>
        </div>
        {/* segment 2 — mesačná štatistika */}
        <div style={{ flex: "1 1 0", minWidth: 0, padding: "9px 13px", borderLeft: `1px solid ${C.line}` }}>
          <div style={cislo}>{mesiac}</div>
          <div style={popis}>tento mesiac</div>
        </div>
        {/* segment 3 — poloha + výber okruhu (jediný interaktívny, akcentové pozadie) */}
        <div {...pressable(onOkruh, "Zmeniť okruh")} title="Zmeniť okruh" style={{ flex: "1.25 1 0", minWidth: 0, padding: "9px 13px", borderLeft: `1px solid ${C.line}`, background: "var(--a-info-bg)", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
            <IkonaPin size={13} color="var(--a-info)" />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 800, color: "var(--a-info)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{okruh}</span>
            <IkonaSipDole size={13} color="var(--a-info)" />
          </div>
          <div style={{ ...popis, color: C.textSec }}>{miesto}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// JEDNOTNÝ BAR ZBIERKY — „X € z Y €" + zelený progres (rovnaký všade)
// mini = kompaktný do kariet · inak väčší do detailov
// ============================================================
export function MoniBar({ vyzbierane = 0, ciel = 0, ludia, mini }: { vyzbierane?: number; ciel?: number; ludia?: number; mini?: boolean }) {
  const pct = ciel ? Math.min(100, Math.round((vyzbierane / ciel) * 100)) : 0;
  const h = mini ? 6 : 9;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: mini ? 12 : 13 }}>
        <span style={{ fontWeight: 600 }}>{vyzbierane.toLocaleString("sk")} € <span style={{ color: C.textTer, fontWeight: 400 }}>z {ciel.toLocaleString("sk")} €</span></span>
        <span style={{ color: C.textTer }}>{pct} %</span>
      </div>
      <div style={{ height: h, background: "rgba(var(--glass-rgb),.1)", borderRadius: 99, overflow: "hidden", marginTop: 6 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99, boxShadow: "0 0 10px rgba(43,212,155,.45)", transition: "width .6s ease" }} />
      </div>
      {ludia != null && <div style={{ fontSize: 11, color: C.textTer, marginTop: 5 }}>👥 {ludia} pomohlo</div>}
    </div>
  );
}

// ============================================================
// ŠIROKOOBSAHOVÝ WRAPPER — jednotné riadenie šírky obsahu:
//   · desktop (≥1180) → plná šírka (node bez capu), alebo `maxDesktop` cap pre čítacie obrazovky
//   · wide (tablet)    → centrovaný stĺpec do `max` (default 620) ako doteraz
//   · mobil            → bez wrappera (full-bleed)
// Nahrádza lokálne `const obal = wide ? <div maxWidth:620>…</div> : el` v moduloch.
// ============================================================
export function obalSiroky(node: ReactNode, { wide, desktop, max = 620, maxDesktop }: { wide?: boolean; desktop?: boolean; max?: number; maxDesktop?: number }): ReactNode {
  if (desktop) return maxDesktop ? <div style={{ maxWidth: maxDesktop, margin: "0 auto", width: "100%" }}>{node}</div> : node;
  if (wide) return <div style={{ maxWidth: max, margin: "0 auto" }}>{node}</div>;
  return node;
}

// ============================================================
// VIACSTĹPCOVÝ FEED (tablet/PC) — skutky vľavo, žiadosti vpravo
// (voliteľne 3. stĺpec `charita` na desktope). Na úzkej obrazovke spadne
// do jedného stĺpca (jednoStlpec v pôvodnom poradí).
// ============================================================
export function FeedStlpce({ wide, skutky, ziadosti, charita, jednoStlpec, labelSkutky = "Skutky", labelZiadosti = "Žiadosti", labelCharita = "Charita", padding = "0 16px" }: { wide?: boolean; skutky?: ReactNode; ziadosti?: ReactNode; charita?: ReactNode; jednoStlpec?: ReactNode; labelSkutky?: ReactNode; labelZiadosti?: ReactNode; labelCharita?: ReactNode; padding?: string }) {
  if (!wide) return <div style={{ padding }}>{jednoStlpec}</div>;
  const Hd = ({ children }: { children?: ReactNode }) => <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "0 0 10px", paddingLeft: 2 }}>{children}</div>;
  const col: CSSProperties = { display: "flex", flexDirection: "column", gap: 12, minWidth: 0 };
  const tri = charita !== undefined; // 3. stĺpec = desktop „Charita"
  return (
    <div style={{ display: "grid", gridTemplateColumns: tri ? "1fr 1fr 1fr" : "1fr 1fr", gap: 14, alignItems: "start", padding }}>
      <div style={{ minWidth: 0 }}><Hd>{labelSkutky}</Hd><div style={col}>{skutky}</div></div>
      <div style={{ minWidth: 0 }}><Hd>{labelZiadosti}</Hd><div style={col}>{ziadosti}</div></div>
      {tri && <div style={{ minWidth: 0 }}><Hd>{labelCharita}</Hd><div style={col}>{charita}</div></div>}
    </div>
  );
}

// ============================================================
// VÝBER OKRUHU — zdieľaný (Feed algoritmus, Časť B): mení rádius feedu.
// Väčší okruh = vyšší prah významnosti (vidíš len špičku). `akcent` =
// farba modulu (Good modrá, Help červená, …). Reuse vo všetkých feedoch.
// ============================================================
const OKRUH_POPIS: Record<string, string> = {
  stvrt: "Aj menšie skutky vo tvojom okolí",
  mesto: "Významnejšie skutky v meste",
  okres: "Veľmi významné skutky v okrese",
  kraj: "Veľmi významné skutky v kraji",
  krajina: "Len mimoriadne skutky z celej SR",
};
export function OkruhVyber({ radius, onPick, onClose, akcent = "var(--a-info)" }: { radius?: string; onPick: (k: string) => void; onClose?: () => void; akcent?: string }) {
  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>Okruh feedu</div>
      <div style={{ fontSize: 12.5, color: C.textTer, margin: "4px 0 14px" }}>Väčší okruh = vyšší prah významnosti — vidíš len špičku.</div>
      {Object.entries(FEED_CFG.radiusy).map(([k, r]) => {
        const on = radius === k;
        return (
          <div key={k} {...pressable(() => onPick(k))} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 13, marginBottom: 8, cursor: "pointer",
            background: on ? tint(akcent, .12) : C.surface2, border: `1px solid ${on ? tint(akcent, .45) : C.line}` }}>
            <IkonaPin size={16} color={on ? akcent : C.textTer} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: on ? akcent : C.text }}>{r.label}</div>
              <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>{OKRUH_POPIS[k]}</div>
            </div>
            {on && <IkonaFajka size={16} color={akcent} />}
          </div>
        );
      })}
    </Sheet>
  );
}
