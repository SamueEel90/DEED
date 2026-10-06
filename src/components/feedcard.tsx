// ============================================================
// DEED · FEED KARTA — JEDNA Instagram karta pre celú appku.
// Nahrádza DomovKarta / Help FeedCard / CharitaKarta / AktCard /
// VieraKarta — rovnaká anatómia všade:
//   [autor?] → [médium + odznaky] → [titul + chipy] → [text] →
//   [progres (MoniBar)] → [pätička podľa typu]
// Moduly dodávajú len OBSAH (sloty), nie layout.
// ============================================================
import type { CSSProperties, ReactNode } from "react";
import { C, SPACE, RADIUS, FW } from "@/theme";
import { tint } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { FotoPrispevku, Video } from "@/components/media";
import { MoniBar } from "@/components/layout";
import { IkonaPin, IkonaRetaz, IkonaHodiny } from "@/components/icons";
import { druhF, DRUH_NAZOV, type Druh } from "@/lib/druhy";
import { MEDIA_AR } from "@/lib/cardSize";

// ---- glass odznak na médiu (jednotný pre všetky moduly) ----
export function KartaBadge({ pos, color = "#fff", strong, children, style }: {
  pos: Partial<Record<"top" | "left" | "right" | "bottom", number>>;
  color?: string; strong?: boolean; children?: ReactNode; style?: CSSProperties;
}) {
  return (
    <span style={{ position: "absolute", zIndex: 1, display: "inline-flex", alignItems: "center", gap: SPACE.xxs,
      fontSize: strong ? 11 : 10, fontWeight: strong ? FW.black : FW.bold, padding: `${SPACE.xxs}px ${strong ? SPACE.sm : SPACE.xs}px`,
      borderRadius: RADIUS.xs, background: "rgba(8,11,18,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,.18)", color, pointerEvents: "none", ...pos, ...style }}>
      {children}
    </span>
  );
}

// ============================================================
// TYP PRÍSPEVKU — jednotné, jasne viditeľné rozdelenie naprieč CELOU appkou:
//   Skutok · Žiadosť · Ponuka · Charita
// Nahrádza roztrúsené kategórie (Komunita/Zdravie/Príroda…) a tag vľavo hore.
// ============================================================
// KARTA 55 · F (2a): typ = DRUH (Zbierka · Žiadosť · Skutok · Ponuka · Akcia · Hľadáme), farby v styles/druhy.css.
// Kľúč „charita" ostáva kvôli volajúcim, zobrazí sa ako Zbierka.
export type TypKluc = "skutok" | "ziadost" | "ponuka" | "charita" | "akcia" | "hladame";
const TYP_DRUH: Record<TypKluc, Druh> = { skutok: "skutok", ziadost: "ziadost", ponuka: "ponuka", charita: "zbierka", akcia: "akcia", hladame: "hladame" };
export const druhTypu = (t: TypKluc): Druh => TYP_DRUH[t];
export const TYP_PRISPEVKU: Record<TypKluc, { label: string; bg: string; fg: string }> = Object.fromEntries(
  (Object.keys(TYP_DRUH) as TypKluc[]).map((k) => [k, { label: DRUH_NAZOV[TYP_DRUH[k]], bg: druhF(TYP_DRUH[k]), fg: "#fff" }])) as Record<TypKluc, { label: string; bg: string; fg: string }>;

// normalizuje rôzne modulové „typ" hodnoty na 4 kľúče (skutok/žiadosť/ponuka/charita)
export function typKluc(typ?: string): TypKluc | undefined {
  switch (typ) {
    case "skutok": return "skutok";
    case "ziadost": return "ziadost";
    case "ponuka": return "ponuka";
    case "charita":
    case "charity":
    case "zbierka": return "charita";
    case "akcia": return "akcia";
    case "hladame": return "hladame";
    default: return undefined;
  }
}

// znak druhu 2a — plný štítok 26 px vo farbe druhu, 11,5 / 800, biely text (na fotke vľavo hore, bez fotky nad názvom)
export function TypBadge({ typ, pos, inline }: {
  typ: TypKluc; pos?: Partial<Record<"top" | "left" | "right" | "bottom", number>>; inline?: boolean;
}) {
  const t = TYP_PRISPEVKU[typ];
  return (
    <span style={{
      ...(inline ? { display: "inline-flex" } : { display: "flex", position: "absolute", zIndex: 2, ...(pos ?? { top: 10, left: 10 }) }),
      alignItems: "center", height: 26, padding: "0 9px", borderRadius: 7, fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em",
      textTransform: "uppercase", background: t.bg, color: t.fg, whiteSpace: "nowrap",
    }}>{t.label}</span>
  );
}

/** stav vpravo hore na fotke: SÚRNE (#B5483A) · KONČÍ O N DNÍ (tmavý) */
export type StavKarty = { surne: true } | { konciDni: number };
export function StavBadge({ stav, inline }: { stav: StavKarty; inline?: boolean }) {
  const surne = "surne" in stav;
  const n = surne ? 0 : stav.konciDni;
  const t = surne ? "Súrne" : `Končí o ${n} ${n === 1 ? "deň" : n >= 2 && n <= 4 ? "dni" : "dní"}`;
  return (
    <span style={{
      ...(inline ? { display: "inline-flex" } : { display: "flex", position: "absolute", zIndex: 2, top: 10, right: 10 }),
      alignItems: "center", height: 26, padding: "0 9px", borderRadius: 7, fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em",
      textTransform: "uppercase", background: surne ? "var(--dr-surne)" : "var(--dr-stav)", color: "#fff", whiteSpace: "nowrap",
    }}>{t}</span>
  );
}

// ---- doplnky pod názvom (2a): dorovnanie (zlaté, logo firmy a pomer) · delenie (reťaz) · online zbierka (hodiny) ----
const doplnokSt: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, minHeight: 30, padding: "3px 10px 3px 4px", borderRadius: 9, fontSize: 12.5, fontWeight: 800, lineHeight: 1.25, maxWidth: "100%" };
export function DoplnokDorovnanie({ ini, text }: { ini: string; text: ReactNode }) {
  return <span style={{ ...doplnokSt, background: "var(--goldBg, rgba(201,162,74,.14))", border: "1px solid var(--goldBd, rgba(201,162,74,.45))", color: "var(--goldInk, #8A6414)" }}>
    <span style={{ width: 22, height: 22, borderRadius: 5, background: "#fff", color: "#8A6414", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{ini}</span>{text}</span>;
}
export function DoplnokDelenie({ text }: { text: ReactNode }) {
  return <span style={{ ...doplnokSt, paddingLeft: 8, border: "1px solid var(--cardBd, rgba(127,127,127,.3))", color: "var(--ink, inherit)" }}><IkonaRetaz size={15} />{text}</span>;
}
export function DoplnokOnline({ text }: { text: ReactNode }) {
  return <span style={{ ...doplnokSt, paddingLeft: 8, border: "1px solid var(--cardBd, rgba(127,127,127,.3))", color: "var(--ink, inherit)" }}><IkonaHodiny size={15} color="var(--dr-skutok-t)" />{text}</span>;
}

// ---- ▶ kruh pre mock-video (bez reálneho src) ----
export function PlayKruh({ big }: { big?: boolean }) {
  const s = big ? 58 : 54;
  return <span style={{ width: s, height: s, borderRadius: RADIUS.round, background: "rgba(255,255,255,.16)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", border: "1px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", paddingLeft: SPACE.xxs }}>▶</span>;
}

export type FeedCardAutor = {
  meno: ReactNode;
  /** pozadie avatara (gradient/farba) alebo ReactNode avatar */
  pfp?: string;
  ini?: ReactNode;
  /** riadok pod menom — lokalita (s pin ikonou) */
  lok?: ReactNode;
  karma?: ReactNode;
  cas?: ReactNode;
  /** chipy vedľa mena (overené / Hrdina / zdroj…) */
  chips?: ReactNode;
  /** farba žiary avatara (default = accent karty) */
  glow?: string;
  onClick?: () => void;
};

export type FeedCardMedia = {
  fotky?: string[];
  /** reálne video (src) — hrá inline */
  video?: string;
  /** mock-video: iba ▶ overlay + odznak (bez src) */
  play?: boolean;
  emoji?: ReactNode;
  /** pozadie média (gradient kategórie), keď nie je foto */
  grad?: string;
  /** výška média na mobile (default 235) */
  h?: number;
  /** len-emoji karta: kompaktná výška (Good 132/168) namiesto plného média */
  emojiH?: number;
  /** odznaky/overlaye na médiu (KartaBadge / OblubeneHviezda / DomTag…) */
  overlay?: ReactNode;
};

export type FeedCardProps = {
  wide?: boolean;
  onClick?: () => void;
  /** aria label karty (default: string titul) */
  label?: string;
  /** typ príspevku = druh (2a) → štítok vľavo hore na fotke (bez fotky nad názvom) + ľavý okraj 5 px vo farbe druhu */
  typ?: TypKluc;
  /** stav vpravo hore na fotke (SÚRNE / KONČÍ O N DNÍ) */
  stav?: StavKarty;
  /** doplnky pod názvom: DoplnokDorovnanie · DoplnokDelenie · DoplnokOnline */
  doplnky?: ReactNode;
  /** ľavý accent pás (žiadosť=červená, doména…) */
  accent?: string;
  /** zvýrazňujúci prstenec (TOP/URGENT) — farba ringu */
  ring?: string;
  autor?: FeedCardAutor;
  media?: FeedCardMedia;
  /** obsah NAD titulom (workshop cenové chipy…) */
  predTitulom?: ReactNode;
  title?: ReactNode;
  /** chipy pri titule (✓ overená / TOP…) */
  titleChips?: ReactNode;
  /** riadok pod titulom (komunita/lokalita, keď karta nemá autora) */
  subtitle?: ReactNode;
  /** popis/príbeh */
  text?: ReactNode;
  /** progres zbierky → jednotný MoniBar */
  progress?: { vyzbierane?: number; ciel?: number; ludia?: number; /** diel firmy (dorovnanie) zlatou v pruhu */ zFirmy?: number };
  /** pätička podľa typu (❓ hľadá pomoc / ★ rating workshopu…) */
  footer?: ReactNode;
};

export function FeedCard({ wide, onClick, label, typ, stav, doplnky, accent, ring, autor, media = {}, predTitulom, title, titleChips, subtitle, text, progress, footer }: FeedCardProps) {
  const maMedia = !!(media.video || media.play || (media.fotky && media.fotky.length));
  const mobileH = media.h ?? 235;
  // médium: foto/video → 16:9 na tablete/PC, fixná výška na mobile; len-emoji → kompaktná výška ak je daná
  const mediaBox: CSSProperties = !maMedia && media.emojiH != null
    ? { height: media.emojiH }
    : wide ? { width: "100%", aspectRatio: MEDIA_AR } : { height: mobileH };

  return (
    <div {...pressable(onClick, label)} className="good-card" style={{
      background: C.surface2,
      border: wide ? `1px solid ${C.line}` : "none",
      borderBottom: `1px solid ${wide ? C.line : C.line2}`,
      borderLeft: typ ? `5px solid ${druhF(druhTypu(typ))}` : accent ? `3px solid ${accent}` : undefined,
      borderRadius: wide ? RADIUS.md : 0,
      marginLeft: wide ? 0 : -SPACE.md, marginRight: wide ? 0 : -SPACE.md,
      marginBottom: wide ? 0 : SPACE.sm,
      boxShadow: ring && wide ? `0 0 0 1.5px ${tint(ring, .5)}, 0 8px 24px ${tint(ring, .14)}` : undefined,
      overflow: "hidden", cursor: onClick ? "pointer" : undefined,
    }}>
      {/* autor hore (IG anatómia) — klik/Enter na avatare či mene otvorí profil autora,
          stopPropagation drží kartu zavretú (karta samotná ostáva klikacia/fokusovateľná) */}
      {autor && (
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px ${SPACE.sm}px` }}>
          <div {...(autor.onClick ? pressable((e) => { e.stopPropagation(); autor.onClick!(); }, typeof autor.meno === "string" ? `Profil: ${autor.meno}` : "Profil autora") : {})}
            style={{ width: 38, height: 38, borderRadius: RADIUS.round, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: FW.bold, fontSize: 15, color: "#fff", background: autor.pfp, cursor: autor.onClick ? "pointer" : undefined, boxShadow: (autor.glow ?? accent) ? `0 3px 10px ${tint((autor.glow ?? accent)!, .3)}` : undefined }}>{autor.ini}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, flexWrap: "wrap" }}>
              <span {...(autor.onClick ? pressable((e) => { e.stopPropagation(); autor.onClick!(); }) : {})}
                style={{ fontWeight: FW.bold, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: autor.onClick ? "pointer" : undefined }}>{autor.meno}</span>
              {autor.chips}
            </div>
            {(autor.lok || autor.karma) && (
              <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, marginTop: 3, minWidth: 0 }}>
                <IkonaPin size={12} color={C.textSec} />
                <span style={{ fontSize: 12, color: C.textSec, fontWeight: FW.semi, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{autor.lok}</span>
                {autor.karma && <span style={{ flex: "none", fontSize: 11.5, color: C.textTer }}>· {autor.karma}</span>}
              </div>
            )}
          </div>
          {autor.cas && <span style={{ fontSize: 11.5, color: C.textSec, flex: "none", fontWeight: FW.med }}>{autor.cas}</span>}
        </div>
      )}

      {/* médium + odznaky — vykreslíme LEN keď je reálne médium (foto/video).
          Bez fotky/videa žiadny placeholder (emoji/gradient) — príspevok je čisto textový. */}
      {maMedia && (
        <div style={{ position: "relative", ...mediaBox, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: media.grad }}>
          {media.video
            ? <Video src={media.video} poster={media.fotky?.[0]} h={wide ? "100%" : mobileH} badge={false} />
            : media.fotky?.length
              ? <div style={{ position: "absolute", inset: 0 }}><FotoPrispevku fotky={media.fotky} emoji={media.emoji} h="100%" disableGaleria alt={typeof title === "string" ? title : label} /></div>
              : null}
          {media.play && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}><PlayKruh big /></div>}
          {!media.video && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.34), transparent 42%)", pointerEvents: "none" }} />}
          {media.play && <KartaBadge pos={{ top: 10, right: 10 }}>▶ video</KartaBadge>}
          {/* typ príspevku vľavo hore — jednotné rozdelenie naprieč appkou */}
          {typ && <TypBadge typ={typ} />}
          {stav && <StavBadge stav={stav} />}
          {media.overlay}
        </div>
      )}

      {/* titul + text + progres + pätička */}
      <div style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px ${SPACE.gutter}px` }}>
        {/* bez fotky niet kam dať štítok na médium → ukáž typ inline nad titulom */}
        {(typ || stav) && !maMedia && <div style={{ marginBottom: SPACE.xs, display: "flex", gap: 6, flexWrap: "wrap" }}>{typ && <TypBadge typ={typ} inline />}{stav && <StavBadge stav={stav} inline />}</div>}
        {predTitulom}
        {(title != null || titleChips != null) && (
          <div style={{ fontSize: 16, fontWeight: FW.bold, lineHeight: 1.36, display: "flex", alignItems: "flex-start", gap: SPACE.xs, flexWrap: "wrap" }}>
            <span style={{ flex: "1 1 auto", minWidth: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{title}</span>
            {titleChips}
          </div>
        )}
        {doplnky && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: SPACE.xs }}>{doplnky}</div>}
        {subtitle && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: SPACE.xxs }}>{subtitle}</div>}
        {/* KARTA 55 · F: krátky text pod názvom, najviac 3 riadky */}
        {text && <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5, marginTop: SPACE.xs, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{text}</div>}
        {progress?.ciel ? <div style={{ marginTop: SPACE.sm }}><MoniBar vyzbierane={progress.vyzbierane || 0} ciel={progress.ciel} ludia={progress.ludia} zFirmy={progress.zFirmy} mini /></div> : null}
        {footer}
      </div>
    </div>
  );
}
