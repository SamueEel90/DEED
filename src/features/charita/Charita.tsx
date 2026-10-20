import { useState, memo } from "react";
import { TESTOVACIA } from "@/lib/testovacia";
import { UDALOST_ZALOZ_CHARITU } from "@/lib/aktivnaCharita";
import { SIRKA, C, SPACE, RADIUS } from "@/theme";
import { ModulHlavicka, HladanieModal, OblubeneHviezda, toast, useLayout, useScrollPamat, useStrankaAkcie, useTvorbaGate, StatRiadok, FiltreStat, FeedStlpce, FeedGrid, FeedCard, DoplnokDorovnanie, obalSiroky, OkruhVyber, tint, Lupa, IkonaPlay, IkonaDoska, IkonaKriz, IkonaInstitucia, Overene, FeedSkeleton, SkeletonRiadky, ErrorState, ScreenSwitch, SwipeBack } from "@/shared";
import { FEED_CFG } from "@/lib/feed";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import type { CharitaFeedItem, Oblubeny } from "@/types";
import { DomovBoard, DomovEvent } from "@/features/domov/Domov";
import { useCharitaFeed, useCharitaAdresar } from "@/data";
import { rovnakeOkremFunkcii } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { useVrstva } from "@/lib/urlnav";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { useCesta } from "@/lib/cesta";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { usePouzivatel } from "@/lib/pouzivatel";
import { usePersonalizacia } from "@/lib/personalizacia";
import { oblastKluc } from "@/lib/personalizaciaStore";
import { pribehZbierky, useZmenyPribehov } from "@/lib/pribehZbierky";
import { otvorPribeh, otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { useZmenyDarov, sucetDarov, zLedgeraNacitane } from "@/lib/darcovia";
import { casOd } from "@/components/feedcard";
import { StitOkno } from "@/features/verejny-profil/casti";
import { prazdnaCharita } from "@/lib/testProfily";
import { icoText } from "@/lib/udajeRegistra";

/*
  ============================================================
  MODUL CHARITA — port z DEED_Charita_Prototyp_v1.html
  feed (urgentné / topované / dobrovoľníctvo / materiál)
  → detail zbierky → podpora + pravidelná podpora
  + sheet Pridať + Adresár charít & OZ
  ============================================================
*/

// ---- lokálna paleta modulu — theme-aware tinty (žiadne hardcoded rgba,
// ktoré lámu svetlý motív / nesú starú „aurora" modrú) ----
const K = {
  bg: "transparent", bg2: "rgba(var(--glass-rgb),.03)", card: "rgba(var(--glass-rgb),.045)",
  warmEdge: tint("var(--a-clay)", .3), warmBg: tint("var(--a-clay)", .06),
  blue: "var(--a-info)", blueBg: tint("var(--a-info)", .1), blueEdge: tint("var(--a-info)", .38),
  green: "var(--a-green)", greenBg: tint("var(--a-green)", .08), greenEdge: tint("var(--a-green)", .32),
  gold: "var(--a-gold)", goldBg: tint("var(--a-gold)", .07),
  diamond: "var(--a-info)",
  purple: "var(--a-plum)",
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
  line: "rgba(var(--glass-rgb),.08)",
};

// ---- detail zbierky/karty — jednotný tvar, ktorý sa dá otvoriť z KAŽDEJ karty feedu ----
// (predtým otvárala detail iba urgentná karta; ostatné len toastovali). Každá karta si
// nesie svoj obsah v ZbierkaDetail → klik ho otvorí v novom detaile zbierky (<ZbierkaModul>).
type ZbierkaDetail = {
  id?: string;           // stabilný kľúč (obľúbené + sync karta↔detail)
  nazov: string;
  emoji?: string;
  accent?: string;
  badge?: string;        // odznak vľavo hore (napr. „URGENTNÉ")
  tag?: string;
  tagCol?: string;
  overena?: boolean;
  popis: string;         // krátky text — karta vo feede
  pribeh?: string;       // dlhší príbeh — detail (fallback = popis)
  vyzbierane?: number;
  ciel?: number;         // bez cieľa ⇒ dobrovoľníctvo/materiál (bez progresu)
  ludia?: number;
  fotky?: string[];
  avatar?: string;
  lok?: string;
  karma?: string;
  volunteer?: boolean;   // bez finančného cieľa → CTA „Zapojiť sa"
  orgProfil?: boolean;   // autor je organizácia/charita (inak osoba) — pre cudzí profil
  /** balík 8 A: meno organizátora, keď sa líši od názvu zbierky (zmluva Reťaze) */
  org?: string;
  /** OPRAVY 403: stránka organizácie z databázy (odkaz na jej verejný profil) */
  stranka?: string;
  /** OPRAVY 428: VS zbierky a čas zverejnenia (hlavička detailu) */
  vs?: string; zverejnene?: string;
};

// dátovo riadená karta (comp: "data") → detail
const zoItem = (it: CharitaFeedItem): ZbierkaDetail => ({
  id: String(it.id), nazov: it.nazov || "Zbierka", accent: K.gold,
  overena: it.overena, popis: it.popis || "", vyzbierane: it.vyzbierane, ciel: it.ciel,
  ludia: it.podpora, fotky: it.fotky, lok: it.lok, org: it.orgNazov, stranka: it.stranka, volunteer: it.typ === "skutok", vs: it.vs, zverejnene: it.casVytvorenia,
});

// ZbierkaDetail → záznam obľúbených (bookmark)
const oblubenyZo = (z: ZbierkaDetail): Oblubeny => ({
  refId: z.id ?? z.nazov, typ: z.volunteer ? "skutok" : "charita", modul: "charity",
  nazov: z.nazov, emoji: z.emoji, lok: z.lok, vyzbierane: z.vyzbierane, ciel: z.ciel,
});
// ===================== MODUL =====================
type ModulCharitaProps = {
  wide?: boolean;
  otvorModul?: (m: string) => void;
};

type Screen = "feed" | "board" | "event";
/** krok cesty Späť v module Charita (karta 03) — platba sa do cesty nezapisuje */
type KrokCharita =
  | { typ: "zbierka"; z: ZbierkaDetail };
type Sheet = "add" | "dir" | null;

export default function ModulCharita({ wide, otvorModul }: ModulCharitaProps) {
  const { desktop } = useLayout();
  const [screen, setScreen] = useState<Screen>("feed"); // feed | detail
  const [sheet, setSheet] = useState<Sheet>(null); // add | reg | dir
  const [hladaj, setHladaj] = useState(false);
  const [aktEvent, setAktEvent] = useState<string | null>(null);
  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  // cesta Späť (nový detail zbierky): každý krok má vlastný kľúč → vlastná pamäť scrollu
  const cesta = useCesta<KrokCharita>();
  useScrollPamat(cesta.kluc ?? screen); // pamäť scrollu — „Späť" obnoví pozíciu (nie skok hore)

  // pod-obrazovka = vrstva histórie → browser Back sa vráti o krok (nie von z appky)
  useVrstva(screen !== "feed" || !!cesta.aktualny, () => (cesta.aktualny ? cesta.spat() : setScreen("feed")), screen);

  const otvorZbierku = (z: ZbierkaDetail) => cesta.otvor(z.nazov, { typ: "zbierka", z });
  const krokCesty = () => {
    const krok = cesta.aktualny!;
    const spatNazov = cesta.predosly?.nazov ?? "Tvoj feed";
    const { z } = krok.data;
    // OPRAVY 403: organizácia = jej skutočný verejný profil (nie katalóg ukážkových organizácií)
    return (<SwipeBack onBack={cesta.spat}><ZbierkaModul key={krok.id}
      zbierka={{ id: z.id ?? z.nazov, nazov: z.nazov, popis: z.pribeh ?? z.popis, overena: z.overena,
        media: (z.fotky ?? []).map((src) => ({ typ: "foto" as const, src })),
        vyzbierane: z.vyzbierane, ciel: z.ciel, ludia: z.ludia, vs: z.vs, zverejnene: z.zverejnene }}
      onBack={cesta.spat} spatNazov={spatNazov} onZavriet={cesta.zavri}
      onOtvorOrg={z.stranka ? () => otvorVerejnyProfil(z.stranka!) : undefined}
      stav={krok.stav} onStav={(zm) => cesta.ulozStav(krok.id, zm)} /></SwipeBack>);
  };

  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  // OPRAVY 403: vyhľadávanie len v tom, čo je v databáze (zbierky a skutky z feedu + zaregistrované organizácie)
  const { data: feedData = [] } = useCharitaFeed();
  const { data: adresar = [] } = useCharitaAdresar();
  const hladajData = [
    ...feedData.map((it) => ({ id: `f:${it.id}`, titul: it.nazov ?? "", podtitul: it.orgNazov ?? it.lok ?? "", tag: it.typ === "skutok" ? "Skutok" : "Zbierka", typ: it.typ === "skutok" ? undefined : "Žiadosti Charita" })),
    ...adresar.map((o) => ({ id: `o:${o.id}`, titul: o.nazov, podtitul: o.sidlo, tag: "Charita", typ: "Charity" })),
  ];

  return (
    <div style={{ minHeight: "100%", color: K.txt }}>
      <ScreenSwitch k={cesta.kluc ?? screen}>
      {cesta.aktualny && krokCesty()}
      {!cesta.aktualny && <>
      {screen === "feed" && <CharitaFeed wide={wide} toast={toast} onDetail={(z) => { if (z) otvorZbierku(z); }} onHladaj={() => setHladaj(true)} onSheet={setSheet} onBoard={() => setScreen("board")} />}
      {screen === "board" && <DomovBoard onBack={() => setScreen("feed")} onEvent={(id) => { setAktEvent(id); setScreen("event"); }} />}
      {screen === "event" && obal(<DomovEvent id={aktEvent} onBack={() => setScreen("board")} toast={toast} oslavuj={(s, komu) => toast(`Ďakujeme za ${s} pre ${komu}`)} />)}
      </>}
      </ScreenSwitch>

      {sheet === "add" && <SheetPridat toast={toast} otvorModul={otvorModul} onClose={() => setSheet(null)} />}
      {sheet === "dir" && <SheetAdresar onClose={() => setSheet(null)} />}

      {hladaj && (
        <HladanieModal akcent="var(--a-info)" placeholder="Hľadať zbierky a organizácie…"
          data={hladajData} subjekty={[]} posledne={[]}
          onPick={(id: string) => {
            if (id.startsWith("o:")) { otvorVerejnyProfil(id.slice(2)); return; }
            const it = feedData.find((x) => `f:${x.id}` === id);
            if (it) otvorZbierku(zoItem(it));
          }}
          toast={toast}
          onClose={() => setHladaj(false)} />
      )}
    </div>
  );
}

// ===================== FEED =====================
type FeedProps = {
  wide?: boolean;
  toast: (m: string) => void;
  onDetail: (z?: ZbierkaDetail) => void;
  onHladaj: () => void;
  onSheet: (s: Sheet) => void;
  onBoard: () => void;
};

function CharitaFeed({ wide, toast, onDetail, onHladaj, onSheet, onBoard }: FeedProps) {
  useZmenyPribehov();
  const { desktop } = useLayout();
  // OPRAVY 403: feed = len zbierky a skutky z databázy, od najnovšieho (všetko je zatiaľ v jednom meste)
  const { data: feed0 = [], isLoading, isError, refetch } = useCharitaFeed();
  // OPRAVY 430: najprv zbierky, ktorých oblasť alebo podpoložka sedí so záujmami prihláseného (v rámci okruhu), potom ostatné; bez záujmov od najnovšieho
  const { zaujmy } = usePersonalizacia();
  const sedi = (it: CharitaFeedItem) => !!it.komu && zaujmy.some((z) => oblastKluc(z.oblast) === it.komu!.oblast || it.komu!.pod.includes(z.pod_polozka));
  const feed = zaujmy.length ? [...feed0.filter(sedi), ...feed0.filter((it) => !sedi(it))] : feed0;
  const [radius, setRadius] = useState("stvrt");
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const { gate } = useTvorbaGate(); // pasívny nesmie tvoriť (talent)
  const [stitOkno, setStitOkno] = useState<CharitaFeedItem | null>(null); // OPRAVY 426: ťuk na štít = okno štítu

  const karta = (it: CharitaFeedItem) => {
    const zd = zoItem(it);
    // KARTA 55 · E: zverejnený príbeh → pod fotkou krátky text (max 3 riadky) a odkaz na stránku Príbeh
    const pr = it.pribehZbierky ? pribehZbierky(it.pribehZbierky) : null;
    return (
      <CharitaKarta key={it.id} refId={it.typ === "charita" ? String(it.id) : undefined} wide={wide} onClick={() => onDetail(zd)}
        fotky={it.fotky} accent={K.gold}
        typ={it.typ === "skutok" ? "skutok" : "charita"} stav={it.konciDni != null ? { konciDni: it.konciDni } : undefined}
        doplnky={it.dorovnanie ? <DoplnokDorovnanie ini={it.dorovnanie.ini} text={it.dorovnanie.text} /> : undefined} zFirmy={it.zFirmy}
        nazov={it.nazov} darov={it.darov} cas={casOd(it.casVytvorenia)} cipy={it.komu?.pod}
        tvorca={it.stranka ? { meno: it.orgNazov ?? "Organizácia", logo: it.org?.logo, ini: it.org?.ini, mesto: it.org?.mesto, stit: it.org?.stit ?? "Bronze",
          onProfil: () => otvorVerejnyProfil(it.stranka!), onStit: () => setStitOkno(it) } : undefined}
        popis={pr ? <span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{pr.kratky}</span> : it.popis}
        pribehOdkaz={pr ? { text: `Celý príbeh na stránke ${it.orgNazov ?? "organizácie"} ›`, onClick: () => otvorPribeh(it.pribehZbierky!) } : undefined}
        vyzbierane={it.vyzbierane} ciel={it.ciel} oblubena={oblubenyZo(zd)} />
    );
  };

  // verejné pridávanie príspevku je zrušené — zbierky/kampane pridávajú len firmy (charity) cez svoje rozhranie.
  // V ☰ ostávajú kontextové akcie „Na tejto stránke" (talent, nástenka).
  useStrankaAkcie(() => ({
    pridat: undefined,
    extra: [
      { id: "talent", label: "Ukáž svoj talent", popis: "Tvorivé skutky a talenty", ikona: <IkonaPlay size={18} color="var(--a-green)" />, onClick: gate(() => toast("Ukáž svoj talent")) },
      { id: "board", label: "Nástenka", popis: "Akcie a udalosti v okolí", ikona: <IkonaDoska size={18} color="var(--a-green)" />, onClick: onBoard },
    ],
  }), []);

  const tlacidlo: React.CSSProperties = { minHeight: 44, padding: "0 18px", borderRadius: 12, border: `1px solid ${K.blueEdge}`, background: K.blueBg, color: K.blue, fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" };

  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      {/* header — jednotná hlavička (logo D⁺ + názov) */}
      <ModulHlavicka title="Charita" right={
        <>
          <span {...pressable(onHladaj, "Hľadať")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={K.txt2} /></span>
          <Zvoncek color={K.txt2} toast={toast} />
        </>
      } />
      {/* OPRAVY 402: len testovacia verzia — ten istý registračný formulár charity (bez overenia účtu), každá = nová charita */}
      {TESTOVACIA && <div style={{ padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
        <button type="button" onClick={() => window.dispatchEvent(new Event(UDALOST_ZALOZ_CHARITU))}
          style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px dashed rgba(128,128,120,.6)", background: "rgba(128,128,120,.15)", color: C.text, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>+ Založiť charitu (test)</button>
      </div>}

      {/* skratka na Adresár charít & OZ + štatistický riadok — na desktope na jednom riadku */}
      <FiltreStat
        filtre={
          <div style={{ padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
            <div {...pressable(() => onSheet("dir"), "Adresár charít & OZ")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: K.blueBg, border: `1px solid ${K.blueEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>
              <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint("var(--a-info)", .15), color: K.blue }}><IkonaInstitucia size={20} color={K.blue} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Adresár charít & OZ</div>
                <div style={{ fontSize: 11.5, color: C.textTer }}>Zaregistrované organizácie na jednom mieste</div>
              </div>
              <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
            </div>
          </div>
        }
        stat={
          <StatRiadok inline={desktop} pocet={feed.length} jednotka="zbierok" mesiac="—"
            okruh={(FEED_CFG.radiusy as any)[radius].krat} onOkruh={() => setVyberOkruh(true)} />
        }
      />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <FeedSkeleton count={4} />
      ) : feed.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.sm, padding: "44px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>V tomto okruhu zatiaľ nie je žiadna zbierka</div>
          <button type="button" onClick={() => setVyberOkruh(true)} style={tlacidlo}>Zväčšiť okruh</button>
        </div>
      ) : desktop ? (
        <FeedGrid cols={3} cards={feed.map(karta)} />
      ) : (
        <FeedStlpce wide={wide} padding={`4px ${SPACE.md}px 12px`}
          labelSkutky="Zapoj sa" labelZiadosti="Zbierky"
          jednoStlpec={feed.map(karta)}
          skutky={feed.filter((it) => it.typ === "skutok").map(karta)}
          ziadosti={feed.filter((it) => it.typ !== "skutok").map(karta)}
        />
      )}

      {stitOkno && <StitOkno v6 mobil={!desktop} onClose={() => setStitOkno(null)}
        p={{ ...prazdnaCharita(stitOkno.stranka!, stitOkno.orgNazov), stit: stitOkno.org?.stit ?? "Bronze", sidlo: stitOkno.org?.sidlo ?? "", ico: stitOkno.org?.ico ? icoText(stitOkno.org.ico) : "" }} />}
      {vyberOkruh && <OkruhVyber radius={radius} akcent="var(--a-info)"
        onPick={(r: string) => { setRadius(r); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}

// ---- karty feedu (rozdelené do komponentov kvôli dvojstĺpcu skutky/žiadosti) ----
// JEDNOTNÁ karta = zdieľaná FeedCard (rovnaká anatómia ako Domov/Help/Aktivity);
// tu len mapujeme obsah Charity do slotov.
// memo: re-render len pri zmene dát karty (oblubena/vyzbierane/…); inline onClick sa ignoruje
const CharitaKarta = memo(CharitaKartaBase, rovnakeOkremFunkcii);
// KARTA 55 · F (2a): druh = štítok na fotke + ľavý okraj, stav vpravo hore, doplnky pod názvom. Kategória nie je štítok.
function CharitaKartaBase({ refId, wide, onClick, fotky, emoji, typ, stav, doplnky, zFirmy, nazov, popis, vyzbierane: vyz0, ciel, darov: darov0, oblubena, pribehOdkaz, tvorca, cas, cipy }: any) {
  // OPRAVY 440 (2): jeden zdroj s detailom — keď sú dary zbierky z ledgera načítané, karta berie ich súčet
  // (ten istý ako detail, aj s darmi v DeeD); po dare sa obnoví sama. Kým nie sú, číslo zo servera.
  useZmenyDarov();
  const s = refId ? sucetDarov(refId) : null;
  const zL = !!refId && zLedgeraNacitane(refId);
  const vyzbierane = zL && s ? s.suma : vyz0, darov = zL && s ? s.pocet : darov0;
  // OPRAVY 426: rozloženie 1b — tvorca pod fotkou so štítom (obrázok), bez modrej fajky; text bez HTML, 2 riadky
  return (
    <FeedCard wide={wide} onClick={onClick} label={nazov} typ={typ} stav={stav} doplnky={doplnky} tvorca={tvorca} cas={cas} cipy={cipy}
      media={{
        fotky, emoji,
        overlay: oblubena ? <OblubeneHviezda polozka={oblubena} style={{ top: "auto", bottom: 10 }} /> : undefined,
      }}
      title={nazov}
      text={popis}
      progress={ciel ? { vyzbierane, ciel, zFirmy, darcov: darov ?? 0 } : undefined}
      footer={pribehOdkaz ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); pribehOdkaz.onClick(); }}
          style={{ display: "flex", alignItems: "center", minHeight: 44, marginTop: 6, padding: 0, border: "none", background: "transparent", color: "var(--gInk)", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", textAlign: "left", boxShadow: "none" }}>{pribehOdkaz.text}</button>
      ) : undefined}
    />
  );
}

// ===================== SHEETY =====================
function SheetObal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { desktop } = useLayout();
  // desktop: obsah na čitateľnú šírku a vycentrovaný (inak by sa riadky roztiahli
  // cez celú plochu — šípka/level by odleteli k pravému okraju)
  const cap: React.CSSProperties = desktop ? { maxWidth: SIRKA.citanie, margin: "0 auto", width: "100%" } : {};
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(var(--panel-rgb),.92)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", zIndex: 50, display: "flex", flexDirection: "column", animation: "fadeUp .2s ease" }}>
      <div style={{ padding: SPACE.md, borderBottom: `1px solid ${K.line}` }}>
        <div style={{ ...cap, display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <span onClick={onClose} style={{ display: "flex", color: K.txt2, cursor: "pointer" }}><IkonaKriz size={20} color={K.txt2} /></span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: SPACE.md }}><div style={cap}>{children}</div></div>
    </div>
  );
}

type SheetMoznost = [emoji: React.ReactNode, titul: string, popis: string, akcia: () => void];

function SheetPridat({ toast, otvorModul, onClose }: { toast: (m: string) => void; otvorModul?: (m: string) => void; onClose: () => void }) {
  const ja = usePouzivatel(); // organizácia ako autor skutku
  const moznosti: SheetMoznost[] = [
    ["💶", "Žiadosť o pomoc", "Finančná zbierka — krátka alebo dlhodobá", () => { onClose(); otvorModul?.("help"); }],
    ["🙋", "Žiadosť na dobrovoľníctvo", "Nábor — počet, miesto, dĺžka, QR", () => toast("Sprievodca dobrovoľníckej výzvy (6 krokov)")],
    ["📦", "Iná nefinančná pomoc", "Materiál (deky, krmivo…) — fáza 2", () => toast("Materiál — fáza 2")],
    ["📎", "Dôkaz / update", "Dokladovanie použitia k bežiacej žiadosti", () => toast("Pridať dôkaz / update k bežiacej zbierke")],
    [<svg key="i" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>, "Skutok „takto sme pomohli“", "Dopad a výsledok vašej pomoci", () => { onClose(); otvorPridatSkutok({ start: "skupina", autor: ja.celeMeno }); }],
  ];
  return (
    <SheetObal title="Pridať" onClose={onClose}>
      {moznosti.map((m, i) => (
        <div key={i} onClick={m[3]} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: K.card, border: `1px solid ${K.line}`, borderRadius: RADIUS.sm, padding: SPACE.md, marginBottom: SPACE.sm, cursor: "pointer" }}>
          <div style={{ width: 42, height: 42, borderRadius: RADIUS.sm, background: K.blueBg, color: K.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{m[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{m[1]}</div>
            <div style={{ fontSize: 11.5, color: K.txt2, marginTop: SPACE.xxs }}>{m[2]}</div>
          </div>
          <span style={{ color: K.txt3, fontSize: 16 }}>›</span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: K.txt3, textAlign: "center", padding: SPACE.xxs }}>finančná žiadosť otvorí sprievodcu v module Help</div>
    </SheetObal>
  );
}

// OPRAVY 403: len skutočne zaregistrované organizácie z databázy; ťuk = ich verejný profil
function SheetAdresar({ onClose }: { onClose: () => void }) {
  const { data: ADRESAR = [], isLoading, isError, refetch } = useCharitaAdresar();
  const [hladaj, setHladaj] = useState("");
  const q = hladaj.trim().toLowerCase();
  const filtrovane = ADRESAR.filter((o) => !q || `${o.nazov} ${o.sidlo}`.toLowerCase().includes(q));
  const ini = (n: string) => n.replace(/,?\s*(o\.\s?z\.|n\.\s?o\.)\s*$/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

  return (
    <SheetObal title="Charita & OZ" onClose={onClose}>
      {ADRESAR.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, background: K.card, border: `1px solid ${K.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px`, marginBottom: SPACE.sm }}>
        <span style={{ display: "flex", color: K.txt3 }}><Lupa size={16} color={K.txt3} /></span>
        <input value={hladaj} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHladaj(e.target.value)} placeholder="Hľadať organizáciu alebo mesto…" aria-label="Hľadať organizáciu"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: K.txt, fontSize: 15, padding: `${SPACE.xs}px 0`, minHeight: 40 }} />
      </div>}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonRiadky count={6} />
      ) : ADRESAR.length === 0 ? (
        <div style={{ textAlign: "center", color: K.txt, fontSize: 15, fontWeight: 700, padding: "44px 16px" }}>Zatiaľ tu nie je žiadna organizácia</div>
      ) : (
        <>
          {filtrovane.map((o) => (
            <div key={o.id} {...pressable(() => { onClose(); otvorVerejnyProfil(o.id); }, o.nazov)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px`, borderBottom: `1px solid ${K.line}`, cursor: "pointer", minHeight: 56 }}>
              <span style={{ width: 40, height: 40, borderRadius: RADIUS.round, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: K.blueBg, color: K.blue, fontSize: 14, fontWeight: 800 }}>{ini(o.nazov) || "?"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{o.nazov}</div>
                {o.sidlo && <div style={{ fontSize: 12.5, color: K.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.sidlo}</div>}
              </div>
              <span style={{ color: K.txt3, fontSize: 16 }}>›</span>
            </div>
          ))}
          {!filtrovane.length && <div style={{ textAlign: "center", color: K.txt3, fontSize: 13, padding: SPACE.xl }}>Nič sa nenašlo pre „{hladaj}“</div>}
        </>
      )}
    </SheetObal>
  );
}
