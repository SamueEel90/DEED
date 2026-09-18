// ============================================================
// DEED · ENTITY — profesionálny interakčný systém profilov subjektov
// (vzor Instagram/Facebook business profily), zdieľaný naprieč
// modulmi: farnosť, charita, tvorca, B2B, cudzí profil.
//
//  · Overene        — SVG overovací odznak (nahrádza textové „✓ overená")
//  · EntityHero     — cover → avatar → meno+odznak → podtitul → štatistiky → akcie
//  · StatRad        — klikateľný riadok štatistík (1 204 sledovateľov · …)
//  · BtnAkcia       — kompaktné akčné tlačidlo profilu (primary/secondary/ghost)
//  · BtnIkonka      — štvorcové ikonové tlačidlo (zvonček, ⋯)
//  · MenuSkupina    — zoskupený zoznam nastavení/nástrojov (karta s riadkami)
//  · MenuPolozka    — riadok: ikona v dlaždici + label + popis + hodnota + chevron
//  · KontextMenu    — ⋯ action sheet (zdieľať / QR / nahlásiť…), destruktívne v červenej
//  · TabyProfil     — podčiarknuté taby obsahu (IG štýl) nad SegTabs (a11y)
//  · DvaStlpce      — desktop layout profilu: obsah + sticky bočný rail
// ============================================================
import type { CSSProperties, ReactNode } from "react";
import { C, SPACE, RADIUS, GRAD } from "@/theme";
import { tint } from "@/lib/ui";
import { MEDIA_AR } from "@/lib/cardSize";
import { pressable } from "@/components/pressable";
import { Sheet } from "@/components/sheet";
import { Switch, Hmat } from "@/components/ui";
import { Tip } from "@/components/tooltip";
import { useLayout } from "@/components/context";
import { IkonaSipVpravo, IkonaZamok, IkonaOdznakOver } from "@/components/icons";
import { KamerkaBadge, ZmenitPill } from "@/components/fotoprofilu";
import { SegTabs } from "@/components/segtabs";

// ---- OVEROVACÍ ODZNAK — jediný vizuál overenia subjektu v appke ----
export function Overene({ size = 16, label = "Overený subjekt" }: { size?: number; label?: string }) {
  return (
    <Tip label={label}>
      <span aria-label={label} style={{ display: "inline-flex", flex: "0 0 auto", verticalAlign: "middle" }}>
        <IkonaOdznakOver size={size} />
      </span>
    </Tip>
  );
}

// ---- ŠTATISTIKY PROFILU — klikateľné čísla (IG vzor) ----
export interface StatPolozka { hodnota: ReactNode; label: string; onClick?: () => void; farba?: string }
export function StatRad({ stats, kompakt }: { stats: StatPolozka[]; kompakt?: boolean }) {
  return (
    <div style={{ display: "flex", borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface, overflow: "hidden" }}>
      {stats.map((s, i) => (
        <div key={i} {...(s.onClick ? pressable(s.onClick, `${s.label} — detail`) : {})}
          style={{ flex: 1, minWidth: 0, textAlign: "center", padding: kompakt ? `${SPACE.xs}px ${SPACE.xxs}px` : `${SPACE.sm}px ${SPACE.xxs}px`, borderLeft: i ? `1px solid ${C.line}` : "none", cursor: s.onClick ? "pointer" : "default" }}>
          <div style={{ fontSize: kompakt ? 14 : 15.5, fontWeight: 800, color: s.farba ?? C.text, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.hodnota}</div>
          <div style={{ fontSize: kompakt ? 9.5 : 10.5, fontWeight: 600, color: C.textTer, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---- AKČNÉ TLAČIDLÁ PROFILU — kompaktný rad pod hlavičkou (IG vzor) ----
export function BtnAkcia({ variant = "secondary", onClick, children, ariaPressed, style }: {
  variant?: "primary" | "secondary" | "ghost"; onClick?: () => void; children?: ReactNode; ariaPressed?: boolean; style?: CSSProperties;
}) {
  const base: CSSProperties = {
    flex: 1, minWidth: 0, height: 38, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs,
    borderRadius: RADIUS.sm, fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis",
    transition: "background .15s ease, border-color .15s ease, transform .12s ease", padding: `0 ${SPACE.sm}px`,
  };
  const v: CSSProperties =
    variant === "primary" ? { background: GRAD, color: "#fff", border: "1px solid transparent", boxShadow: "0 4px 14px color-mix(in srgb, var(--a-green) 26%, transparent)" }
    : variant === "secondary" ? { background: C.surface2, color: C.text, border: `1px solid ${C.line}` }
    : { background: "transparent", color: C.textSec, border: `1px solid ${C.line}` };
  return <button onClick={onClick} aria-pressed={ariaPressed} style={{ ...base, ...v, ...style }}>{children}</button>;
}

export function BtnIkonka({ onClick, label, aktivne, farba = "var(--a-info)", children }: {
  onClick?: () => void; label: string; aktivne?: boolean; farba?: string; children?: ReactNode;
}) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={aktivne} title={label}
      style={{ width: 40, height: 38, flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", position: "relative",
        background: aktivne ? tint(farba, .12) : C.surface2, border: `1px solid ${aktivne ? tint(farba, .4) : C.line}`,
        color: aktivne ? farba : C.textSec, transition: "background .15s ease, border-color .15s ease" }}>
      <Hmat o={4} />
      {children}
    </button>
  );
}

// ---- ENTITY HERO — hlavička profilu subjektu (cover + avatar + akcie) ----
export function EntityHero({ cover, coverEl, avatar, meno, overene, overeneLabel, podtitul, vpravo, podMenom, stats, akcie, onAvatar, onCover, coverLabel }: {
  /** URL cover fotky; alternatívne coverEl = vlastný element (gradient, Foto…) */
  cover?: string; coverEl?: ReactNode;
  /** avatar element (Foto/img/iniciálky) — vykreslí sa v krúžku cez okraj coveru */
  avatar: ReactNode;
  meno: ReactNode; overene?: boolean; overeneLabel?: string;
  /** riadok pod menom — kategória · lokalita */
  podtitul?: ReactNode;
  /** pravý horný slot vedľa mena (štít…) */
  vpravo?: ReactNode;
  /** blok medzi hlavičkou a číslami (O nás…) */
  podMenom?: ReactNode;
  stats?: StatPolozka[];
  /** rad akčných tlačidiel (BtnAkcia/BtnIkonka) */
  akcie?: ReactNode;
  /** klik na avatar (nastaviť profilovú fotku) — zobrazí odznak fotoaparátu */
  onAvatar?: () => void;
  /** klik na titulnú fotku — zobrazí pilulku „Zmeniť titulnú" v rohu coveru */
  onCover?: () => void;
  coverLabel?: string;
}) {
  const { desktop } = useLayout();
  const vyskaCover = desktop ? 200 : 132;
  const av = desktop ? 84 : 68;
  // s nahratou titulnou fotkou drží hlavička celý pomer 16:9 — vidno presne to,
  // čo sa orezalo pri nahratí; bez fotky ostáva nižší gradientový pás
  const coverStyl: CSSProperties = cover ? { aspectRatio: MEDIA_AR } : { height: vyskaCover };
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative", ...coverStyl, borderRadius: RADIUS.md, overflow: "hidden", background: `linear-gradient(135deg, ${tint("var(--a-info)", .22)}, ${tint("var(--a-plum)", .16)} 60%, ${tint("var(--a-gold)", .18)})` }}>
        {cover ? <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : coverEl}
        {onCover && <ZmenitPill label={coverLabel} onClick={onCover} style={{ right: "auto", left: 8 }} />}
      </div>
      {/* štít sedí na pravej hrane coveru — mimo riadku s menom, aby meno malo celú šírku */}
      {vpravo && (
        <div style={{ position: "absolute", right: SPACE.sm, bottom: 0, transform: "translateY(38%)", zIndex: 2, pointerEvents: "auto" }}>{vpravo}</div>
      )}
      {/* position:relative + zIndex — riadok s avatarom sa prekrýva cez cover <img>;
          bez toho replaced content coveru premaľuje pozadie/rámik avatara (paint order) */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: SPACE.sm, marginTop: -(av / 2.6), padding: `0 ${SPACE.sm}px`, position: "relative", zIndex: 1 }}>
        {/* onAvatar = fotka sa dá zmeniť → odznak fotoaparátu žije MIMO orezaného
            krúžku (span nižšie má overflow:hidden, inak by ho odrezal) */}
        <span style={{ position: "relative", flex: "none", display: "inline-flex" }}>
          <span {...(onAvatar ? pressable(onAvatar, "Profilová fotka") : {})}
            style={{ width: av, height: av, borderRadius: RADIUS.round, flex: "none", overflow: "hidden", border: `3px solid var(--c-bg)`, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(av * .36), fontWeight: 800, cursor: onAvatar ? "pointer" : "default", boxShadow: "0 2px 10px rgba(0,0,0,.18)" }}>
            {avatar}
          </span>
          {onAvatar && <KamerkaBadge size={Math.round(av * .34)} />}
        </span>
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 2, paddingRight: vpravo ? (desktop ? 98 : 76) : 0 }}>
          <div style={{ fontSize: desktop ? 19 : 16.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meno}</span>
            {overene && <Overene size={desktop ? 18 : 16} label={overeneLabel} />}
          </div>
          {podtitul && <div style={{ fontSize: desktop ? 12.5 : 11.5, color: C.textSec, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{podtitul}</div>}
        </div>
      </div>
      {podMenom && <div style={{ marginTop: SPACE.sm }}>{podMenom}</div>}
      {stats && stats.length > 0 && <div style={{ marginTop: SPACE.sm }}><StatRad stats={stats} /></div>}
      {akcie && <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.sm }}>{akcie}</div>}
    </div>
  );
}

// ---- MENU SKUPINA — zoskupený zoznam (nastavenia / nástroje / kontakt) ----
export function MenuSkupina({ nadpis, poznamka, hlavicka, children, style }: {
  /** malý nadpis NAD kartou (sekcia) */
  nadpis?: ReactNode;
  /** drobný text vpravo od nadpisu */
  poznamka?: ReactNode;
  /** voliteľná zvýraznená hlavička VO vnútri karty (napr. SPRÁVA — zlatý pás) */
  hlavicka?: ReactNode;
  children?: ReactNode; style?: CSSProperties;
}) {
  return (
    <div style={{ marginBottom: SPACE.gutter, ...style }}>
      {(nadpis || poznamka) && (
        <div style={{ display: "flex", alignItems: "baseline", gap: SPACE.xs, margin: `0 ${SPACE.xxs}px ${SPACE.xs}px` }}>
          {nadpis && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: C.textTer }}>{nadpis}</span>}
          {poznamka && <span style={{ fontSize: 10.5, color: C.textTer, marginLeft: "auto" }}>{poznamka}</span>}
        </div>
      )}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, overflow: "hidden" }}>
        {hlavicka}
        {children}
      </div>
    </div>
  );
}

// zvýraznená hlavička vo vnútri MenuSkupiny (správcovské panely)
export function MenuHlavicka({ ikona, farba = "var(--a-gold)", label, popis }: { ikona?: ReactNode; farba?: string; label: ReactNode; popis?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, background: tint(farba, .09), borderBottom: `1px solid ${C.line}` }}>
      {ikona && <span style={{ display: "flex", color: farba }}>{ikona}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: farba, letterSpacing: ".05em" }}>{label}</div>
        {popis && <div style={{ fontSize: 10.5, color: C.textTer, marginTop: 1 }}>{popis}</div>}
      </div>
    </div>
  );
}

// ---- MENU POLOŽKA — jeden riadok skupiny ----
export function MenuPolozka({ ikona, farba = "var(--a-info)", label, popis, hodnota, chip, zamknute, onClick, danger, posledna }: {
  ikona?: ReactNode;
  /** akcent ikony (dlaždica sa tónuje z nej) */
  farba?: string;
  label: ReactNode; popis?: ReactNode;
  /** hodnota vpravo (napr. „Zapnuté", „1 204") — sekundárny text */
  hodnota?: ReactNode;
  /** malý chip vpravo (napr. „od STARTER") */
  chip?: ReactNode;
  /** zamknuté tierom — zámok namiesto chevronu + tlmený riadok */
  zamknute?: boolean;
  onClick?: () => void; danger?: boolean; posledna?: boolean;
}) {
  const txt = danger ? "var(--a-danger)" : C.text;
  const body = (
    <>
      {ikona && (
        <span style={{ width: 36, height: 36, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: RADIUS.xs, background: tint(danger ? "var(--a-danger)" : farba, .12), color: danger ? "var(--a-danger)" : farba }}>
          {ikona}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: txt, display: "flex", alignItems: "center", gap: SPACE.xs, minWidth: 0 }}>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
          {chip}
        </div>
        {popis && <div style={{ fontSize: 11, color: C.textTer, marginTop: 1.5, lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{popis}</div>}
      </div>
      {hodnota && <span style={{ flex: "none", fontSize: 12, fontWeight: 600, color: C.textSec, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hodnota}</span>}
      {zamknute
        ? <IkonaZamok size={15} color={C.textTer} />
        : (onClick && <IkonaSipVpravo size={15} color={C.textTer} />)}
    </>
  );
  const rowStyle: CSSProperties = {
    display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`,
    borderBottom: posledna ? "none" : `1px solid ${C.line2}`, cursor: onClick ? "pointer" : "default",
    opacity: zamknute ? .62 : 1, transition: "background .12s ease",
  };
  return <div {...(onClick ? pressable(onClick, typeof label === "string" ? label : undefined) : {})} style={rowStyle}>{body}</div>;
}

// toggle variant položky — Switch vpravo (oddelený komponent, čistejšie API)
export function MenuPrepinac({ ikona, farba = "var(--a-info)", label, popis, on, onChange, posledna }: {
  ikona?: ReactNode; farba?: string; label: string; popis?: ReactNode; on: boolean; onChange: (v: boolean) => void; posledna?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderBottom: posledna ? "none" : `1px solid ${C.line2}` }}>
      {ikona && <span style={{ width: 36, height: 36, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: RADIUS.xs, background: tint(farba, .12), color: farba }}>{ikona}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</div>
        {popis && <div style={{ fontSize: 11, color: C.textTer, marginTop: 1.5, lineHeight: 1.35 }}>{popis}</div>}
      </div>
      <Switch on={on} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

// ---- KONTEXT MENU (⋯) — action sheet ----
export interface KontextAkcia { ikona?: ReactNode; label: string; popis?: string; danger?: boolean; onClick: () => void }
export function KontextMenu({ label = "Možnosti", polozky, onClose }: { label?: string; polozky: KontextAkcia[]; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} label={label}>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, overflow: "hidden", marginTop: SPACE.xxs }}>
        {polozky.map((a, i) => (
          <div key={i} {...pressable(() => { onClose(); a.onClick(); }, a.label)}
            style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm + 2}px ${SPACE.gutter}px`, borderBottom: i < polozky.length - 1 ? `1px solid ${C.line2}` : "none", cursor: "pointer" }}>
            {a.ikona && <span style={{ display: "flex", flex: "none", color: a.danger ? "var(--a-danger)" : C.textSec }}>{a.ikona}</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: a.danger ? "var(--a-danger)" : C.text }}>{a.label}</div>
              {a.popis && <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{a.popis}</div>}
            </div>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{ width: "100%", height: 46, marginTop: SPACE.sm, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        Zrušiť
      </button>
    </Sheet>
  );
}

// ---- TABY PROFILU — podčiarknuté taby obsahu (IG vzor) ----
export function TabyProfil<T extends string>({ options, labels, badges, value, onChange, ariaLabel = "Sekcie profilu" }: {
  options: readonly T[]; labels: Record<T, string>; badges?: Partial<Record<T, ReactNode>>;
  value: T; onChange: (v: T) => void; ariaLabel?: string;
}) {
  return (
    <SegTabs
      options={options} value={value} onChange={onChange} ariaLabel={ariaLabel}
      style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.line}`, overflowX: "auto", scrollbarWidth: "none", marginBottom: SPACE.sm }}
      render={(k, on) => (
        <span style={{ flex: "1 0 auto", minWidth: 76, padding: `${SPACE.sm}px ${SPACE.sm}px`, textAlign: "center", cursor: "pointer", position: "relative",
          fontSize: 13, fontWeight: on ? 800 : 600, color: on ? C.text : C.textTer, whiteSpace: "nowrap", transition: "color .15s ease" }}>
          {labels[k]}{badges?.[k] != null && <span style={{ marginLeft: 5, fontSize: 10.5, fontWeight: 700, color: C.textTer }}>{badges[k]}</span>}
          {on && <span aria-hidden style={{ position: "absolute", left: "22%", right: "22%", bottom: -1, height: 2.5, borderRadius: 2, background: C.text }} />}
        </span>
      )}
    />
  );
}

// ---- DVA STĹPCE — desktop layout profilu: obsah + sticky bočný rail ----
export function DvaStlpce({ hlavny, bok, sirkaBoku = 340 }: { hlavny: ReactNode; bok?: ReactNode; sirkaBoku?: number }) {
  const { desktop } = useLayout();
  if (!desktop || !bok) return <>{hlavny}{bok}</>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `minmax(0,1fr) ${sirkaBoku}px`, gap: SPACE.lg, alignItems: "start" }}>
      <div style={{ minWidth: 0 }}>{hlavny}</div>
      <div style={{ position: "sticky", top: SPACE.sm }}>{bok}</div>
    </div>
  );
}

// ---- KONTAKT RIADOK — jednotný riadok kontaktu s ikonou ----
export function KontaktPolozka({ ikona, label, hodnota, href, posledna }: { ikona: ReactNode; label: string; hodnota: string; href?: string; posledna?: boolean }) {
  const obsah = (
    <>
      <span style={{ width: 32, height: 32, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: RADIUS.xs, background: "rgba(var(--glass-rgb),.06)", color: C.textSec }}>{ikona}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: C.textTer }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: href ? "var(--a-info)" : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hodnota}</div>
      </div>
    </>
  );
  const st: CSSProperties = { display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xs + 2}px ${SPACE.gutter}px`, borderBottom: posledna ? "none" : `1px solid ${C.line2}`, textDecoration: "none" };
  return href ? <a href={href} target="_blank" rel="noreferrer" style={st}>{obsah}</a> : <div style={st}>{obsah}</div>;
}
