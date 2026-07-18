import { useEffect, useMemo, useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { BackHeader, Sheet, SegTabs, Switch, MoniBar, Stit, naStitLevel, STIT_POPIS, Tip, FotoUpload, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { MojaRetaz } from "@/features/retaz/MojaRetaz";
import {
  FLAGS, KONFIG, POZICIE, TIER_LABEL, TIER_POPIS, ROLA_UCTU,
  nacitajPoziciu, ulozPoziciu, nacitajTiery, ulozTiery, nacitajDrzitel, ulozDrzitel,
  nacitajDoklady, ulozDoklady, percentoDolozene, nacitajTerminal, ulozTerminal,
  nacitajOrgExtra, ulozOrgExtra, nacitajLogo, ulozLogo,
  type Pozicia, type Tier, type DokladZbierky,
} from "./stav";
import { PANELY, SPRAVY, SPRAVA_NADPIS, ZASLUZENA, SUBJEKTY, ORG_ZBIERKY, FIRMY_ADRESAR, type PanelBlok, type SpravaItem, type OrgZbierka } from "./mock";
import { Podstranka } from "./Podstranka";

/*
  ============================================================
  MÔJ DEED FIREMNÝ — rolové panely a správa (Charita · Tvorca · B2B)
  per DEED_Role_Panely_Sprava_v0_1 + PATCH 1 + PATCH 2.

  PATCH 2 §1 — farský vzor namiesto kokpitu s kartičkami (jeden engine,
  farnosť = prototyp, ostatní podmnožiny s inými nástrojmi):
   1 karta subjektu (logo, meno, overená, ŠTÍT bez progresu, 3 čísla)
   2 prehľadové bloky (Dnes prišlo, dobrovoľníci, sponzoring…)
   3 verejný obsah (čo vidí každý zvonku) + vstup na verejnú podstránku
   4 SPRÁVA [typ] — inline, vidí len držiteľ roly + delegovaní
   5 kontakt
  DEV prepínače POZÍCIE + TIERU zostávajú hore (flagy, v produkcii preč).

  PATCH 1: badge len ŠTÍT + text (žiadny progress/percentá — level-up je
  prekvapenie, hook on_badge_levelup) · veta o kúpiteľnom vs. zaslúženom
  z UI von (nanajvýš tooltip „?" pri tieri) · zamknuté karty NEukazujú
  reálne dáta (blur/placeholder) · tier lišta per rola (charita/tvorca
  T0/T1/T2, B2B Free/STARTER/BUSINESS).
  ============================================================
*/

// lokálna paleta — theme-aware tinty (žiadne hardcoded rgba, viď pamäť svetlého motívu)
const F = {
  card: "rgba(var(--glass-rgb),.045)", card2: "rgba(var(--glass-rgb),.03)", line: "rgba(var(--glass-rgb),.08)",
  blue: "var(--a-info)", blueBg: tint("var(--a-info)", .1), blueEdge: tint("var(--a-info)", .38),
  green: "var(--a-green)", greenBg: tint("var(--a-green)", .1), greenEdge: tint("var(--a-green)", .34),
  gold: "var(--a-gold)", goldBg: tint("var(--a-gold)", .1), goldEdge: tint("var(--a-gold)", .34),
  plum: "var(--a-plum)", plumBg: tint("var(--a-plum)", .1), plumEdge: tint("var(--a-plum)", .38),
  red: "var(--a-danger)",
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
};

type PaywallReq = { tierMin: Tier; nazov: string; dovod?: string };
type OtvorenySheet = null | "zbierky" | "terminal" | "retaz" | "profil" | "adresarB2B" | { dokladovanie: OrgZbierka };

export function MojDeedFiremny({ onBack, toast }: { onBack: () => void; toast: (m: string) => void }) {
  // rola + tier per rola — DEV: lokálny stav/LS; produkcia: overený účet + fakturácia (§0.1/§0.1b)
  const [pozicia, setPozicia] = useState<Pozicia>(nacitajPoziciu);
  const [tiery, setTiery] = useState<Record<Pozicia, Tier>>(nacitajTiery);
  const [drzitel, setDrzitel] = useState<boolean>(nacitajDrzitel); // SPRÁVA len držiteľovi roly (+ delegácia)
  const [logo, setLogo] = useState<string | null>(() => nacitajLogo(nacitajPoziciu()));
  const [paywall, setPaywall] = useState<PaywallReq | null>(null);
  const [sheet, setSheet] = useState<OtvorenySheet>(null);
  const [podstranka, setPodstranka] = useState(false);

  const tier = tiery[pozicia];
  const prepniPoziciu = (p: Pozicia) => { setPozicia(p); ulozPoziciu(p); setLogo(nacitajLogo(p)); };
  const nastavTier = (t: Tier) => { const n = { ...tiery, [pozicia]: t }; setTiery(n); ulozTiery(n); };
  const prepniDrzitela = () => { setDrzitel((d) => { ulozDrzitel(!d); return !d; }); };

  const bloky = PANELY[pozicia];
  const sprava = SPRAVY[pozicia];
  const rolaMeta = POZICIE.find((p) => p.key === pozicia)!;
  const subjekt = SUBJEKTY[pozicia];
  const stit = naStitLevel(ZASLUZENA[pozicia].badge);

  // gate na úrovni akcie: pod tierom → paywall modal s vysvetlením (§4.3)
  const gateTier = (tierMin: Tier, nazov: string, akcia: () => void, dovod?: string) => () => {
    if (tier >= tierMin) akcia();
    else setPaywall({ tierMin, nazov, dovod });
  };

  // routing akcií blokov panela (jeden skelet — rolový data-feed)
  const blokAkcia = (b: PanelBlok) => {
    if (pozicia === "charita" && b.id === "zbierky") return setSheet("zbierky");
    if (pozicia === "tvorca" && b.id === "retaz") return setSheet("retaz");
    if (pozicia === "b2b" && b.id === "rebricek") return toast("Rebríček odvetvia v meste — porovnanie s inými firmami (súťaž, nie postup)");
    toast(`${b.nazov} — detail (demo)`);
  };

  // routing položiek SPRÁVY
  const spravaAkcia = (it: SpravaItem) => {
    if (it.id === "profil" || it.id === "podstranka") return setSheet("profil");
    if (pozicia === "charita" && (it.id === "zbierky" || it.id === "dokladovanie")) return setSheet("zbierky");
    if (pozicia === "tvorca" && it.id === "terminal") return setSheet("terminal");
    toast(`${it.nazov} — otvorí sa správcovské rozhranie (demo)`);
  };

  // vlastník vidí TÚ ISTÚ verejnú stránku ako cudzí (PATCH 2 §3)
  if (podstranka) return <Podstranka pozicia={pozicia} logo={logo} toast={toast} onBack={() => setPodstranka(false)} />;

  return (
    <div style={{ paddingBottom: SPACE.lg, color: F.txt }}>
      <BackHeader onBack={onBack} title="Môj DEED firemný" />
      <div style={{ padding: `${SPACE.sm}px ${SPACE.md}px 0` }}>

        {/* základ pre každého = plné userove funkcie; rolové panely sa PRIDÁVAJÚ navrch (§0 bod 2) */}
        <div style={{ fontSize: 11.5, color: F.txt3, lineHeight: 1.5, marginBottom: SPACE.sm }}>
          Plné userove funkcie (Môj feed, Moje zbierky, Peňaženka…) máš ako doteraz — rolové panely sa <b>pridávajú navrch</b>, nikdy nenahrádzajú.
        </div>

        {/* ---- DEV prepínač pozícií (§0.1) — v produkcii sa rola číta z overeného účtu ---- */}
        {FLAGS.dev_role_switcher && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginBottom: SPACE.xs }}>
              <SekciaLabel>POZÍCIA</SekciaLabel>
              <DevChip />
            </div>
            <SegTabs
              options={POZICIE.map((p) => p.key)}
              value={pozicia}
              onChange={(k) => prepniPoziciu(k as Pozicia)}
              ariaLabel="Prepínač rolí (DEV)"
              style={{ display: "flex", gap: SPACE.xxs, padding: SPACE.xxs, borderRadius: RADIUS.md, background: C.surface2, border: `1px solid ${F.line}`, marginBottom: SPACE.sm }}
              render={(k, on) => {
                const p = POZICIE.find((x) => x.key === k)!;
                return (
                  <span style={{ flex: 1, height: 38, display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, borderRadius: RADIUS.sm, cursor: "pointer", fontSize: 13.5, fontWeight: on ? 800 : 600, background: on ? F.blueBg : "transparent", border: `1px solid ${on ? F.blueEdge : "transparent"}`, color: on ? F.blue : F.txt2, transition: "all .15s ease" }}>
                    {p.emoji} {p.label}
                  </span>
                );
              }}
            />
          </>
        )}

        {/* ---- DEV prepínač tierov (§0.1b) — tier lišta per rola (PATCH 1 §4);
             veta o kúpiteľnom vs. zaslúženom žije len v tooltipe „?" (PATCH 1 §2) ---- */}
        {FLAGS.dev_tier_switcher && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginBottom: SPACE.xs }}>
              <SekciaLabel>TIER</SekciaLabel>
              <DevChip />
              <Tip label="Tier pridáva kapacitu a nástroje. Štít, karma ani poradie sa kúpiť nedajú — zaslúžená os beží naplno aj na Tier 0.">
                <span style={{ width: 15, height: 15, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 800, color: F.txt3, border: `1px solid ${F.line}`, cursor: "help" }}>?</span>
              </Tip>
              <span style={{ fontSize: 10.5, color: F.txt3, marginLeft: "auto" }}>rola účtu: {ROLA_UCTU[pozicia]}</span>
            </div>
            <SegTabs
              options={["0", "1", "2"]}
              value={String(tier)}
              onChange={(t) => nastavTier(Number(t) as Tier)}
              ariaLabel="Prepínač tierov (DEV)"
              style={{ display: "flex", gap: SPACE.xxs, padding: SPACE.xxs, borderRadius: RADIUS.md, background: C.surface2, border: `1px solid ${F.line}`, marginBottom: SPACE.xxs }}
              render={(t, on) => (
                <span style={{ flex: 1, height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: RADIUS.sm, cursor: "pointer", fontSize: 12.5, fontWeight: on ? 800 : 600, background: on ? F.goldBg : "transparent", border: `1px solid ${on ? F.goldEdge : "transparent"}`, color: on ? F.gold : F.txt2, transition: "all .15s ease" }}>
                  {TIER_LABEL[pozicia][Number(t)]}
                </span>
              )}
            />
            <div style={{ fontSize: 10.5, color: F.txt3, marginBottom: SPACE.gutter }}>
              {TIER_LABEL[pozicia][tier]}: {TIER_POPIS[pozicia][tier]}
            </div>
          </>
        )}

        {/* ==== 1 · KARTA SUBJEKTU — logo, meno, overená, ŠTÍT (bez progresu!), 3 čísla ==== */}
        <div style={{ background: F.card, border: `1px solid ${F.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter, marginBottom: SPACE.gutter }}>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
            <span style={{ width: 52, height: 52, borderRadius: "50%", flex: "none", overflow: "hidden", background: C.surface2, border: `1px solid ${F.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>
              {logo ? <img src={logo} alt={subjekt.nazov} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (pozicia === "tvorca" ? subjekt.emoji : subjekt.iniciacky)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800, display: "flex", alignItems: "center", gap: SPACE.xs, flexWrap: "wrap" }}>
                {subjekt.nazov}
                {subjekt.overena && <span style={{ fontSize: 10, fontWeight: 800, color: F.green, background: F.greenBg, border: `1px solid ${F.greenEdge}`, padding: `1px ${SPACE.xs}px`, borderRadius: RADIUS.xs }}>✓ overená</span>}
              </div>
              <div style={{ fontSize: 11, color: F.txt3, marginTop: 2 }}>📍 {subjekt.lok} · {rolaMeta.label}</div>
            </div>
            {/* štít + text — NIKDY progress bar/percentá (DEED_Stity §1) */}
            <div style={{ flex: "none", textAlign: "center" }}>
              <Stit level={stit} size={42} />
              <div style={{ fontSize: 10, fontWeight: 800, color: F.gold, marginTop: 2 }}>{stit}</div>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: F.txt3, margin: `${SPACE.xs}px 0 ${SPACE.sm}px` }}>{STIT_POPIS[stit]}</div>
          <div style={{ display: "flex", gap: SPACE.xs }}>
            {subjekt.cisla.map(([hodnota, label], i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", background: C.surface2, border: `1px solid ${F.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.xxs}px` }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: i === 2 ? F.gold : F.txt }}>{hodnota}</div>
                <div style={{ fontSize: 9.5, color: F.txt3, marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ==== 2 · PREHĽAD — rolové bloky (ako „Prehľad farnosti"); zamknuté = blur dát ==== */}
        <SekciaLabel>PREHĽAD — {rolaMeta.label.toUpperCase()}</SekciaLabel>
        {bloky.map((b) => (
          <PanelBlokKarta key={b.id} b={b} tier={tier} pozicia={pozicia}
            onClick={gateTier(b.tierMin, b.nazov, () => blokAkcia(b))} />
        ))}
        {pozicia === "tvorca" && (
          <div style={{ fontSize: 10.5, color: F.txt3, lineHeight: 1.5, margin: `${SPACE.xs}px 0 0` }}>
            ⛓ Reťaz sa <b>nevytvára tu</b> — vzniká pri zbierke: otvor zbierku, ktorú chceš podporiť → „Vytvoriť reťaz" → nastavíš % (fixné po zverejnení) a poradie vo fronte. Tu reťaze len vidíš.
          </div>
        )}

        {/* ==== 3 · VEREJNÝ OBSAH — čo vidí každý zvonku + vstup na podstránku ==== */}
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, margin: `${SPACE.gutter}px 0 ${SPACE.xs}px` }}>
          <SekciaLabel>VEREJNÝ OBSAH</SekciaLabel>
          <span style={{ fontSize: 10, color: F.txt3 }}>· vidí každý zvonku</span>
        </div>
        {subjekt.taby.map((t) => (
          <div key={t.key} {...pressable(() => setPodstranka(true), t.label)}
            style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface2, border: `1px solid ${F.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, marginBottom: SPACE.xxs, cursor: "pointer" }}>
            <span style={{ fontSize: 15, flex: "none" }}>{t.polozky[0]?.emoji ?? "📄"}</span>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700 }}>{t.label} <span style={{ color: F.txt3, fontWeight: 600 }}>· {t.polozky.length}</span></div>
            <span style={{ color: F.txt3, fontSize: 14 }}>›</span>
          </div>
        ))}
        <button onClick={() => setPodstranka(true)} style={{ width: "100%", height: 42, marginTop: SPACE.xxs, borderRadius: RADIUS.sm, border: `1px solid ${F.blueEdge}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13, background: F.blueBg, color: F.blue }}>
          Otvoriť verejnú podstránku ›
        </button>
        <div style={{ fontSize: 10, color: F.txt3, textAlign: "center", marginTop: SPACE.xxs }}>vlastník vidí tú istú verejnú stránku ako cudzí — jeden zdroj pravdy</div>
        {pozicia === "b2b" && (
          <div {...pressable(() => setSheet("adresarB2B"), "Adresár firiem")}
            style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: F.card, border: `1px solid ${F.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginTop: SPACE.sm, cursor: "pointer" }}>
            <span style={{ fontSize: 16, flex: "none" }}>🏢</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Adresár firiem</div>
              <div style={{ fontSize: 10.5, color: F.txt3 }}>Výkladná skriňa + anti-greenwashing overenie</div>
            </div>
            <span style={{ color: F.txt3, fontSize: 15 }}>›</span>
          </div>
        )}

        {/* ==== 4 · SPRÁVA — inline, vidí len držiteľ roly (+ delegovaní); v DEV prepínateľná ==== */}
        <DrzitelToggle on={drzitel} rola={rolaMeta.label} onToggle={prepniDrzitela} />
        {drzitel && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, margin: `${SPACE.gutter}px 0 ${SPACE.xs}px` }}>
              <SekciaLabel>{SPRAVA_NADPIS[pozicia]}</SekciaLabel>
              <span style={{ fontSize: 10, color: F.txt3 }}>· vidí len držiteľ + delegovaní</span>
            </div>
            {sprava.map((it) => {
              const zamknute = !it.povinne && tier < it.tierMin; // povinnosti sa netierujú (§0 bod 7)
              return (
                <div key={it.id} {...pressable(it.povinne ? () => spravaAkcia(it) : gateTier(it.tierMin, it.nazov, () => spravaAkcia(it)), it.nazov)}
                  style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: it.povinne ? F.greenBg : F.card, border: `1px solid ${it.povinne ? F.greenEdge : F.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, cursor: "pointer", opacity: zamknute ? .75 : 1 }}>
                  <span style={{ width: 38, height: 38, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: "rgba(var(--glass-rgb),.06)" }}>{it.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: SPACE.xs, flexWrap: "wrap" }}>
                      {it.nazov}
                      {it.povinne && <span style={{ fontSize: 9.5, fontWeight: 800, color: F.green, background: tint("var(--a-green)", .14), borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px` }}>POVINNÉ · netierované</span>}
                      {zamknute && <TierChip label={`od ${TIER_LABEL[pozicia][it.tierMin]}`} />}
                    </div>
                    <div style={{ fontSize: 11, color: F.txt2, marginTop: 2, lineHeight: 1.4 }}>{it.popis}</div>
                    {it.tierPozn && <div style={{ fontSize: 10, color: F.txt3, marginTop: 2 }}>{it.tierPozn}</div>}
                  </div>
                  <span style={{ color: F.txt3, fontSize: 16, flex: "none" }}>{zamknute ? "🔒" : "›"}</span>
                </div>
              );
            })}
            {pozicia === "charita" && (
              <div style={{ fontSize: 10.5, color: F.txt3, lineHeight: 1.5, marginTop: SPACE.xs }}>
                Dokladovanie je povinnosť — žiadny paywall sa ho nesmie dotknúť. Nedoložená ukončená zbierka po {KONFIG.lehotaDokladovaniaDni} dňoch = stav „čaká na doklady" na profile (vplyv na štít dôvery, nie blokácia platieb).
              </div>
            )}
            {pozicia === "b2b" && (
              <div style={{ fontSize: 10.5, color: F.txt3, lineHeight: 1.5, marginTop: SPACE.xs }}>
                Tier 0 firma: modrá fajka + Free vizitka + prispievanie od prvého dňa. Tiery = existujúci cenník B2B Master §6 · správcovia podľa tieru: {KONFIG.spravcoviaB2B[tier]}.
              </div>
            )}
          </>
        )}

        {/* ==== 5 · KONTAKT ==== */}
        <div style={{ margin: `${SPACE.gutter}px 0 ${SPACE.xs}px` }}><SekciaLabel>KONTAKT</SekciaLabel></div>
        <div style={{ background: F.card, border: `1px solid ${F.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter, fontSize: 12.5, color: F.txt2, lineHeight: 1.7 }}>
          📍 {subjekt.kontakt.adresa}<br />✉️ {subjekt.kontakt.email}<br />📞 {subjekt.kontakt.tel}{subjekt.kontakt.web && <><br />🌐 {subjekt.kontakt.web}</>}
        </div>
      </div>

      {/* ---- sheety ---- */}
      {sheet === "zbierky" && (
        <OrgZbierkySheet tier={tier} toast={toast} onPaywall={(p) => setPaywall(p)}
          onDokladovanie={(z) => setSheet({ dokladovanie: z })} onClose={() => setSheet(null)} />
      )}
      {typeof sheet === "object" && sheet && "dokladovanie" in sheet && (
        <DokladovanieSheet z={sheet.dokladovanie} toast={toast} onClose={() => setSheet("zbierky")} />
      )}
      {sheet === "terminal" && <TerminalSheet toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "retaz" && <MojaRetaz onClose={() => setSheet(null)} toast={toast} />}
      {sheet === "profil" && (
        <UpravProfilSheet pozicia={pozicia} logo={logo} toast={toast}
          onLogo={(url) => { setLogo(url); ulozLogo(pozicia, url); }} onClose={() => setSheet(null)} />
      )}
      {sheet === "adresarB2B" && <AdresarB2BSheet toast={toast} onClose={() => setSheet(null)} />}

      {/* paywall — v DEV preklikateľný: tester vidí modal aj stav po „zakúpení" (§0.1b) */}
      {paywall && (
        <PaywallModal req={paywall} pozicia={pozicia}
          onKupit={() => { nastavTier(paywall.tierMin); setPaywall(null); toast(`${TIER_LABEL[pozicia][paywall.tierMin]} aktivovaný (demo — bez platby)`); }}
          onClose={() => setPaywall(null)} />
      )}
    </div>
  );
}

// ===================== BLOK PREHĽADU (jeden skelet) =====================
// PATCH 1 §3: karta zamknutá tierom NESMIE ukazovať reálne dáta — obsah sa
// rozmaže (placeholder), inak by Free tier dostal zadarmo, čo vyšší predáva.
function PanelBlokKarta({ b, tier, pozicia, onClick }: { b: PanelBlok; tier: Tier; pozicia: Pozicia; onClick: () => void }) {
  const zamknute = tier < b.tierMin;
  const blur: React.CSSProperties = zamknute ? { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" } : {};
  return (
    <div {...pressable(onClick, b.nazov)}
      style={{ background: C.surface2, border: `1px solid ${F.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, cursor: "pointer", opacity: zamknute ? .8 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
        <span style={{ width: 34, height: 34, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: "rgba(var(--glass-rgb),.06)" }}>{b.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: SPACE.xs, flexWrap: "wrap" }}>
            {b.nazov}
            {zamknute && <TierChip label={`od ${TIER_LABEL[pozicia][b.tierMin]}`} />}
          </div>
          {/* „Dnes prišlo" — live tok darov (rastie live, §1.2) */}
          {pozicia === "charita" && b.id === "dnes" ? <DnesPrislo /> : (
            <div style={{ fontSize: 11.5, color: F.txt3, marginTop: 2, lineHeight: 1.4, ...blur }}>
              {zamknute ? "12 345 · placeholder — odomkne tier" : b.popis}
            </div>
          )}
        </div>
        {b.hodnota && <span style={{ flex: "none", fontSize: 14, fontWeight: 800, color: F.blue, ...blur }}>{zamknute ? "9 999" : b.hodnota}</span>}
      </div>
      {b.progress ? <div style={{ marginTop: SPACE.xs, ...blur }}><MoniBar vyzbierane={b.progress.vyzbierane} ciel={b.progress.ciel} mini /></div> : null}
      <div style={{ display: "flex", marginTop: SPACE.xs }}>
        <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: zamknute ? F.txt3 : F.blue }}>{zamknute ? "🔒 odomkne tier" : `${b.akcia || "Spravovať"} ›`}</span>
      </div>
    </div>
  );
}

// live tok darov — súčet dňa pomaly rastie (mock „rastie live")
function DnesPrislo() {
  const [suma, setSuma] = useState(342);
  const [darcovia, setDarcovia] = useState(17);
  useEffect(() => {
    const t = setInterval(() => {
      setSuma((s) => s + Math.round(2 + Math.random() * 12));
      if (Math.random() < 0.4) setDarcovia((d) => d + 1);
    }, 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ fontSize: 11.5, color: F.txt3, marginTop: 2, display: "flex", alignItems: "center", gap: SPACE.xs }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: F.green, flex: "none", animation: "pulse 1.6s ease infinite" }} />
      <b style={{ color: F.green }}>{suma} €</b> · {darcovia} darcov dnes · tok rastie live
    </div>
  );
}

// ===================== DRŽITEĽ ROLY (DEV toggle — vzor FararToggle) =====================
function DrzitelToggle({ on, rola, onToggle }: { on: boolean; rola: string; onToggle: () => void }) {
  return (
    <div {...pressable(onToggle, on ? "Vypnúť režim držiteľa roly" : "Zapnúť režim držiteľa roly")} aria-pressed={on}
      style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.gutter, background: on ? F.plumBg : F.card, border: `1px solid ${on ? F.plumEdge : F.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>
      <span style={{ fontSize: 17, flex: "none" }}>🛡</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: on ? F.plum : F.txt }}>Držiteľ roly — {rola} <DevChip /></div>
        <div style={{ fontSize: 11, color: F.txt3, lineHeight: 1.4 }}>{on ? "Sekcia SPRÁVA je viditeľná (držiteľ + delegovaní správcovia)." : "Sekciu SPRÁVA vidí len držiteľ roly a delegovaní správcovia."}</div>
      </div>
      <span style={{ width: 42, height: 24, borderRadius: 99, flex: "none", background: on ? F.plum : tint("var(--c-textTer)", .4), position: "relative", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
      </span>
    </div>
  );
}

// ===================== PAYWALL MODAL (§4.3) =====================
// Gate na úrovni akcie — user vidí, čo existuje; klik pod tierom otvorí vysvetlenie.
// V DEV preklikateľný: „zakúpenie" nastaví tier a prerenderuje panely aj správu.
function PaywallModal({ req, pozicia, onKupit, onClose }: { req: PaywallReq; pozicia: Pozicia; onKupit: () => void; onClose: () => void }) {
  const label = TIER_LABEL[pozicia][req.tierMin];
  return (
    <Sheet onClose={onClose} label={`Odomknúť ${label}`}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
        <span style={{ width: 42, height: 42, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: F.goldBg }}>🔓</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{req.nazov}</div>
          <div style={{ fontSize: 11.5, color: F.txt3, marginTop: 2 }}>dostupné od tieru <b style={{ color: F.gold }}>{label}</b></div>
        </div>
      </div>
      {req.dovod && (
        <div style={{ fontSize: 12.5, color: F.txt2, lineHeight: 1.5, background: F.card, border: `1px solid ${F.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>{req.dovod}</div>
      )}
      <div style={{ fontSize: 12.5, color: F.txt2, lineHeight: 1.55, marginBottom: SPACE.md }}>
        <b style={{ color: F.txt }}>{label}</b> = {TIER_POPIS[pozicia][req.tierMin]}. Tier pridáva <b>kapacitu a nástroje</b> — priestor konať vo väčšom.
      </div>
      <button onClick={onKupit} style={{ width: "100%", height: 48, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 15, background: F.gold, color: "#231a02" }}>
        Aktivovať {label} (demo — bez platby)
      </button>
      <button onClick={onClose} style={{ width: "100%", height: 42, borderRadius: RADIUS.sm, border: `1px solid ${F.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, background: "transparent", color: F.txt2, marginTop: SPACE.xs }}>
        Zatiaľ nie
      </button>
      <div style={{ fontSize: 10, color: F.txt3, textAlign: "center", marginTop: SPACE.sm }}>ceny = placeholder (jednotný cenník) · v produkcii sa tier číta z fakturácie</div>
    </Sheet>
  );
}

// ===================== ZBIERKY ORGANIZÁCIE (charita §1.3) =====================
// Limit súbežných zbierok podľa tieru — gate na AKCII „Vytvoriť zbierku".
function OrgZbierkySheet({ tier, toast, onPaywall, onDokladovanie, onClose }: {
  tier: Tier; toast: (m: string) => void; onPaywall: (p: PaywallReq) => void;
  onDokladovanie: (z: OrgZbierka) => void; onClose: () => void;
}) {
  const [extra, setExtra] = useState<OrgZbierka[]>(nacitajOrgExtra);
  const zbierky = useMemo(() => [...ORG_ZBIERKY, ...extra], [extra]);
  const aktivne = zbierky.filter((z) => z.stav === "aktivna").length;
  const limit = KONFIG.limitZbierok[tier];

  const vytvor = () => {
    if (aktivne >= limit) {
      if (tier < 2) {
        onPaywall({
          tierMin: (tier + 1) as Tier, nazov: "Ďalšia súbežná zbierka",
          dovod: `Na tieri ${TIER_LABEL.charita[tier]} máš limit ${limit} ${limit === 1 ? "súbežnú zbierku" : "súbežné zbierky"} (${aktivne} aktívnych). Vyšší tier pridáva kapacitu.`,
        });
      } else toast(`Limit súbežných zbierok na T2: ${limit} (placeholder — config)`);
      return;
    }
    const n: OrgZbierka = { id: `org-${Date.now()}`, nazov: "Nová zbierka (koncept)", emoji: "🎯", ciel: 1000, vyzbierane: 0, stav: "aktivna", darcovia: 0 };
    const nove = [...extra, n];
    setExtra(nove); ulozOrgExtra(nove);
    toast("Zbierka vytvorená (koncept) — sprievodca detailov príde s Charita engine");
  };

  return (
    <Sheet onClose={onClose} label="Zbierky organizácie">
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>🎯 Zbierky organizácie</div>
      <div style={{ fontSize: 11.5, color: F.txt3, marginBottom: SPACE.sm }}>{aktivne} aktívne · limit tieru {TIER_LABEL.charita[tier]}: {limit} súbežných (placeholder — config)</div>

      {zbierky.map((z) => {
        const doklady = nacitajDoklady(z.id);
        const pct = percentoDolozene(doklady, z.vyzbierane);
        const poLehote = z.stav === "ukoncena" && z.ukoncena
          && (Date.now() - new Date(z.ukoncena).getTime()) / 86400000 > KONFIG.lehotaDokladovaniaDni;
        const cakaNaDoklady = poLehote && pct < 100;
        return (
          <div key={z.id} style={{ background: C.surface2, border: `1px solid ${cakaNaDoklady ? tint("var(--a-danger)", .4) : F.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs }}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
              <span style={{ width: 34, height: 34, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: "rgba(var(--glass-rgb),.06)" }}>{z.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z.nazov}</div>
                <div style={{ fontSize: 11, color: F.txt3, marginTop: 2 }}>{z.darcovia} darcov</div>
              </div>
              <span style={{ flex: "none", fontSize: 10.5, fontWeight: 800, color: z.stav === "aktivna" ? F.green : F.blue, background: tint(z.stav === "aktivna" ? "var(--a-green)" : "var(--a-info)", .14), borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{z.stav === "aktivna" ? "Aktívna" : "Ukončená"}</span>
            </div>
            <div style={{ marginTop: SPACE.xs }}><MoniBar vyzbierane={z.vyzbierane} ciel={z.ciel} mini /></div>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: SPACE.xs, flexWrap: "wrap" }}>
              {cakaNaDoklady
                ? <span style={{ fontSize: 10.5, fontWeight: 800, color: F.red, background: tint("var(--a-danger)", .12), borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>⚠ čaká na doklady</span>
                : <span style={{ fontSize: 10.5, fontWeight: 700, color: pct >= 100 ? F.green : F.txt3, background: "rgba(var(--glass-rgb),.06)", borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>🧾 doložené {pct} % použitia</span>}
              <span {...pressable(() => onDokladovanie(z), `Dokladovanie — ${z.nazov}`)} style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: F.blue, cursor: "pointer" }}>Dokladovanie ›</span>
            </div>
          </div>
        );
      })}

      <button onClick={vytvor} style={{ width: "100%", height: 46, marginTop: SPACE.xs, borderRadius: RADIUS.sm, border: `1px solid ${F.blueEdge}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: F.blueBg, color: F.blue }}>
        + Vytvoriť zbierku {aktivne >= limit && tier < 2 ? "· 🔒 limit tieru" : ""}
      </button>
      <div style={{ fontSize: 10, color: F.txt3, textAlign: "center", marginTop: SPACE.sm }}>gate na úrovni akcie — vidíš, čo existuje; limit vysvetlí paywall (§4.3)</div>
    </Sheet>
  );
}

// ===================== DOKLADOVANIE (§1.4 — POVINNÉ, netierované) =====================
// Nahratie dokladov použitia financií — priebežne aj po ukončení. Verejný pohľad:
// darca vidí „doložené X % použitia". Transparentnosť NIKDY nie je platená featúra.
function DokladovanieSheet({ z, toast, onClose }: { z: OrgZbierka; toast: (m: string) => void; onClose: () => void }) {
  const [doklady, setDoklady] = useState<DokladZbierky[]>(() => nacitajDoklady(z.id));
  const [typ, setTyp] = useState("Bloček");
  const [popis, setPopis] = useState("");
  const [suma, setSuma] = useState("");
  const pct = percentoDolozene(doklady, z.vyzbierane);

  const pridaj = () => {
    const s = Number(suma.replace(",", "."));
    if (!popis.trim()) { toast("Napíš krátky popis použitia"); return; }
    if (!s || s <= 0) { toast("Zadaj sumu dokladu v €"); return; }
    const nove = [...doklady, { nazov: typ, popis: popis.trim(), suma: s, datum: new Date().toISOString() }];
    setDoklady(nove); ulozDoklady(z.id, nove);
    setPopis(""); setSuma("");
    toast(`Doklad priložený — doložené ${percentoDolozene(nove, z.vyzbierane)} % použitia`);
  };

  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${F.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, color: F.txt, fontSize: 13, fontFamily: "inherit", outline: "none" };

  return (
    <Sheet onClose={onClose} label={`Dokladovanie — ${z.nazov}`}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs }}>
        <span style={{ width: 40, height: 40, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: F.greenBg }}>🧾</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Dokladovanie zbierky</div>
          <div style={{ fontSize: 11.5, color: F.txt3, marginTop: 2 }}>{z.nazov} · vyzbierané {z.vyzbierane.toLocaleString("sk")} €</div>
        </div>
        <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: pct >= 100 ? F.green : F.gold }}>{pct} %</span>
      </div>
      {/* pozn.: toto NIE je badge progres — je to stav dokladovania financií (§1.4) */}
      <div style={{ height: 7, background: "rgba(var(--glass-rgb),.1)", borderRadius: 4, overflow: "hidden", marginBottom: SPACE.sm }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? F.green : F.gold, borderRadius: 4, transition: "width .3s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: F.txt3, lineHeight: 1.5, background: F.greenBg, border: `1px solid ${F.greenEdge}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.md }}>
        <b style={{ color: F.green }}>Povinná základná funkcia — nikdy netierovaná.</b> Darca vidí pri zbierke „doložené {pct} % použitia". Ukončená zbierka bez dokladov po {KONFIG.lehotaDokladovaniaDni} dňoch → „čaká na doklady" na profile (vplyv na štít dôvery, NIE blokácia platieb).
      </div>

      {/* nahratie dokladu (mock — bloček/faktúra/foto + popis + suma + dátum) */}
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.xs }}>
        {["Bloček", "Faktúra", "Foto"].map((t) => (
          <span key={t} {...pressable(() => setTyp(t), t)} aria-pressed={typ === t}
            style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: typ === t ? 800 : 600, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.pill, cursor: "pointer", background: typ === t ? F.blueBg : C.surface2, border: `1px solid ${typ === t ? F.blueEdge : F.line}`, color: typ === t ? F.blue : F.txt2 }}>{t}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.xs }}>
        <input value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="Krátky popis použitia (napr. palivo, nájom)" style={{ ...input, flex: 1 }} />
        <input value={suma} onChange={(e) => setSuma(e.target.value)} placeholder="€" inputMode="decimal" style={{ ...input, width: 76, flex: "none", textAlign: "right" }} />
      </div>
      <button onClick={pridaj} style={{ width: "100%", height: 44, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: F.green, color: "#06281d", marginBottom: SPACE.md }}>
        Priložiť doklad
      </button>

      {/* zoznam dokladov */}
      {doklady.length === 0 ? (
        <div style={{ fontSize: 12, color: F.txt3, textAlign: "center", padding: SPACE.md }}>Zatiaľ žiadne doklady — priebežné dokladovanie dvíha dôveru.</div>
      ) : doklady.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface2, border: `1px solid ${F.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, marginBottom: SPACE.xxs }}>
          <span style={{ fontSize: 15, flex: "none" }}>{d.nazov === "Faktúra" ? "📄" : d.nazov === "Foto" ? "📷" : "🧾"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.popis}</div>
            <div style={{ fontSize: 10, color: F.txt3 }}>{d.nazov} · {new Date(d.datum).toLocaleDateString("sk")}</div>
          </div>
          <span style={{ flex: "none", fontSize: 12.5, fontWeight: 800, color: F.green }}>{d.suma.toLocaleString("sk")} €</span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: F.txt3, textAlign: "center", marginTop: SPACE.sm }}>opakované nedokladovanie → eskalácia per anti-fraud pravidlá (mimo záber)</div>
    </Sheet>
  );
}

// ===================== TERMINÁL TVORCU (§2.4) =====================
function TerminalSheet({ toast, onClose }: { toast: (m: string) => void; onClose: () => void }) {
  const [on, setOn] = useState<boolean>(nacitajTerminal);
  const prepni = (v: boolean) => { setOn(v); ulozTerminal(v); toast(v ? "Terminál zapnutý — kasička je na podstránke DOLE" : "Terminál vypnutý"); };
  return (
    <Sheet onClose={onClose} label="Terminál (Transak)">
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
        <span style={{ width: 42, height: 42, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: F.blueBg }}>💳</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Terminál (Transak)</div>
          <div style={{ fontSize: 11.5, color: F.txt3, marginTop: 2 }}>priame príspevky tvorcovi · DEED = prostredie, nie strana transakcie</div>
        </div>
        <Switch on={on} onChange={prepni} ariaLabel="Terminál zap/vyp" />
      </div>
      <div style={{ fontSize: 12.5, color: F.txt2, lineHeight: 1.55, marginBottom: SPACE.sm }}>
        Záväzné poradie podstránky: skutky a reťaze <b>hore</b> · oznamy <b>stred</b> · terminál (kasička) <b>dole</b>.
      </div>
      {!FLAGS.terminal_requires_business_id && (
        <div style={{ fontSize: 10.5, color: F.txt3, lineHeight: 1.5, background: F.card, border: `1px solid ${F.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
          Otvorené (Dagmar): status tvorcu pri termináli (živnostník vs. f. o.) — zatiaľ neblokuje, drží ho feature flag <code style={{ fontSize: 10 }}>terminal_requires_business_id</code>.
        </div>
      )}
    </Sheet>
  );
}

// ===================== UPRAVIŤ PROFIL + LOGO SUBJEKTU (PATCH 2 §6) =====================
// Logo = štvorcový avatar entity (v krúžku): karta subjektu, hero podstránky,
// riadok adresára, embed badge, logo pri sponzoringu. Tvorca logo nepotrebuje
// (profilová fotka osoby). Fallback bez loga = iniciálky.
function UpravProfilSheet({ pozicia, logo, toast, onLogo, onClose }: {
  pozicia: Pozicia; logo: string | null; toast: (m: string) => void;
  onLogo: (url: string | null) => void; onClose: () => void;
}) {
  const s = SUBJEKTY[pozicia];
  const maLogo = pozicia !== "tvorca";
  return (
    <Sheet onClose={onClose} label="Upraviť profil">
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>✏️ Upraviť profil</div>
      <div style={{ fontSize: 11.5, color: F.txt3, marginBottom: SPACE.md }}>{s.nazov} · foto, popis, kontakt — plný editor príde s registráciou subjektov</div>

      {maLogo ? (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: F.txt3, letterSpacing: ".04em", marginBottom: SPACE.xs }}>LOGO SUBJEKTU</div>
          <div style={{ display: "flex", gap: SPACE.gutter, alignItems: "center", marginBottom: SPACE.sm }}>
            <span style={{ width: 64, height: 64, borderRadius: "50%", flex: "none", overflow: "hidden", background: C.surface2, border: `1px solid ${F.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800 }}>
              {logo ? <img src={logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : s.iniciacky}
            </span>
            <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: F.txt3, lineHeight: 1.5 }}>
              Štvorcové logo — zobrazuje sa v krúžku: karta subjektu, adresár, hero podstránky, embed badge, logo pri sponzoringu. Bez loga = iniciálky.
            </div>
          </div>
          <FotoUpload value={logo ?? undefined} onZmena={(url) => { onLogo(url); toast("Logo uložené"); }} pomer={1} vyska={120} />
          {logo && (
            <button onClick={() => { onLogo(null); toast("Logo odstránené — späť na iniciálky"); }}
              style={{ width: "100%", height: 38, marginTop: SPACE.xs, borderRadius: RADIUS.sm, border: `1px solid ${F.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12, background: "transparent", color: F.txt2 }}>
              Odstrániť logo
            </button>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: F.txt2, lineHeight: 1.55, background: F.card, border: `1px solid ${F.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
          Tvorca logo nepotrebuje — identitou je profilová fotka osoby (jedna identita, žiadna druhá stránka). Bio, portfólio a odkazy sa editujú v profile.
        </div>
      )}
    </Sheet>
  );
}

// ===================== ADRESÁR FIRIEM (PATCH 2 §5) =====================
// Výkladná skriňa + anti-greenwashing. Riadok = logo/iniciálky, štít, odvetvie,
// mesto, súčet podpory — len súhrn, detail na podstránke (adresár je rázcestník,
// nie dashboard). Radenie dôvera+blízkosť; poradie sa NIKDY nepredáva.
// Tvorca adresár NEMÁ (osoba → žiadny rebríček FO; objavuje sa cez obsah/QR/reťaze).
function AdresarB2BSheet({ toast, onClose }: { toast: (m: string) => void; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} label="Adresár firiem">
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>🏢 Adresár firiem</div>
      <div style={{ fontSize: 11.5, color: F.txt3, marginBottom: SPACE.sm }}>radenie: dôvera + blízkosť · poradie sa nikdy nepredáva</div>
      {FIRMY_ADRESAR.map((f) => (
        <div key={f.nazov} {...pressable(() => toast(`${f.nazov} — verejná podstránka firmy (demo)`), f.nazov)}
          style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px`, borderBottom: `1px solid ${F.line}`, cursor: "pointer" }}>
          <span style={{ width: 38, height: 38, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: F.blueBg, color: F.blue }}>{f.iniciacky}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{f.nazov}</div>
            <div style={{ fontSize: 11.5, color: F.txt3, marginTop: 1 }}>{f.odvetvie} · {f.mesto}</div>
          </div>
          <div style={{ flex: "none", display: "flex", alignItems: "center", gap: SPACE.sm }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: F.green }}>{f.podpora}</div>
              <div style={{ fontSize: 9.5, color: F.txt3 }}>podpora</div>
            </div>
            <Stit level={naStitLevel(f.stit)} size={28} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10, color: F.txt3, textAlign: "center", marginTop: SPACE.sm, lineHeight: 1.5 }}>
        anti-greenwashing: každé euro dohľadateľné (D++ stopa) · featured pozícia z Premium vizitky smie byť v moduloch, NIE v adresári
      </div>
    </Sheet>
  );
}

// ===================== DROBNÉ =====================
function SekciaLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: F.txt3, fontWeight: 800 }}>{children}</div>;
}
function DevChip() {
  return <span style={{ fontSize: 9, fontWeight: 800, color: F.plum, background: tint("var(--a-plum)", .14), border: `1px solid ${tint("var(--a-plum)", .35)}`, borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px`, letterSpacing: ".04em" }}>DEV</span>;
}
function TierChip({ label }: { label: string }) {
  return <span style={{ fontSize: 9.5, fontWeight: 800, color: F.gold, background: tint("var(--a-gold)", .14), borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px` }}>🔒 {label}</span>;
}
