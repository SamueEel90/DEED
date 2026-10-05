import { useState, memo } from "react";
import { DeedZnacka } from "@/components/DeedZnacka";
import { SIRKA, C, SPACE, RADIUS } from "@/theme";
import { ModulHlavicka, HladanieModal, OblubeneHviezda, toast, useLayout, useScrollPamat, useStrankaAkcie, useTvorbaGate, Ticker, StatRiadok, FiltreStat, FeedStlpce, FeedGrid, FeedCard, DoplnokDorovnanie, obalSiroky, OkruhVyber, SegTabs, tint, Lupa, IkonaPlay, IkonaDoska, IkonaKriz, IkonaInstitucia, Overene, FeedSkeleton, SkeletonRiadky, EmptyState, ErrorState, ScreenSwitch, SwipeBack } from "@/shared";
import { pripravFeed, FEED_CFG } from "@/lib/feed";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import type { CharitaFeedItem, CharitaLevel, Subjekt, Oblubeny } from "@/types";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { najdiOrg, type OrgKampan } from "@/features/cudzi-profil/orgy";
import { DomovBoard, DomovEvent } from "@/features/domov/Domov";
import { useCharitaFeed, useCharitaAdresar, useCharitaZbierka } from "@/data";
import { useLokalita } from "@/lib/lokalita";
import { ZOFIA_FOTKY, HLADAJ_DATA } from "./mock";
import { tagChip, rovnakeOkremFunkcii } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { useVrstva } from "@/lib/urlnav";
import { MojDeedFiremny } from "@/features/rola/MojDeedFiremny";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { poleZOrg } from "@/features/zbierka/Pole";
import { useCesta } from "@/lib/cesta";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { usePouzivatel } from "@/lib/pouzivatel";
import { pribehZbierky, useZmenyPribehov } from "@/lib/pribehZbierky";
import { otvorPribeh } from "@/features/verejny-profil/otvor";

// čiarová ikona recyklácie (namiesto emoji) — karta Materiál
const IKONA_RECYKLACIA = <svg width="44" height="44" color="var(--a-info)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7L4.5 14M11 19h8.2a1.8 1.8 0 0 0 1.6-2.7l-1.3-2.3M14 16l-3 3 3 3M8.3 13.3 7.2 9.2 3.1 10.3M9.5 7.7l1.6-2.8a1.8 1.8 0 0 1 3.1 0l1.4 2.4M19.5 11.5l-1.1 4.1-4.1-1.1" /></svg>;

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

// avatar pozadia adresára — theme-aware accent tinty (bolo 7 bright hardcoded rgba,
// ktoré v light mode zmizli; var(--a-*) sa prispôsobí motívu — viď pamäť svetlého motívu)
const SEG_BG = [
  tint("var(--a-danger)", .16), tint("var(--a-info)", .16), tint("var(--a-green)", .16),
  tint("var(--a-teal)", .16), tint("var(--a-gold)", .16), tint("var(--a-plum)", .16), tint("var(--a-clay)", .16),
];
const lvlFarba = (l: CharitaLevel | string): string => (({ Legend: "var(--a-gold)", Gold: "var(--a-gold)", Silver: "var(--c-textTer)", Bronze: "var(--a-clay)" } as Record<string, string>)[l] || "var(--c-textTer)");

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
};

// fixné karty feedu (top/mala/zapoj/material) — obsah raz, použije sa na kartu aj detail
const D_MOTYLIK: ZbierkaDetail = {
  id: "motylik", nazov: "Motýlik", emoji: "⭐", accent: K.blue, tag: "HOSPIC", tagCol: K.diamond,
  badge: "⭐ TOP", overena: true, lok: "Bratislava · celé SR", karma: "Gold", orgProfil: true,
  popis: "Detský hospic — pomôžte nám zabezpečiť mobilnú paliatívnu starostlivosť pre rodiny.",
  pribeh: "Motýlik je prvý detský hospic na Slovensku. Sprevádzame nevyliečiteľne choré deti a ich rodiny doma, kde to majú najradšej. Vaša podpora platí mobilné tímy sestier a lekárov, ktoré sú s rodinami vo dne aj v noci.",
  vyzbierane: 8200, ciel: 15000, ludia: 214,
};
const D_ZOFIA: ZbierkaDetail = {
  id: "zofia", nazov: "Žofia K.", emoji: "🩺", accent: K.green, badge: "D+", overena: true,
  lok: "Trenčín · Sihoť", karma: "Bronze", fotky: ZOFIA_FOTKY,
  popis: "Po úraze tri mesiace bez príjmu, potrebujem na lieky.",
  pribeh: "Po páde zo schodov som tri mesiace na PN a bez príjmu. Potrebujem doplatiť lieky a rehabilitáciu, aby som sa mohla vrátiť do práce. Ďakujem každému, kto pomôže aj málom.",
  vyzbierane: 520, ciel: 800, ludia: 14,
};
const D_STROMOSVET: ZbierkaDetail = {
  id: "stromosvet", nazov: "Stromosvet", emoji: "🌳", accent: K.green, badge: "DOBROVOĽNÍCTVO", lok: "Brezina", volunteer: true, orgProfil: true,
  popis: "Hľadá 10 dobrovoľníkov · výsadba stromov · sobota, Brezina",
  pribeh: "Hľadáme 10 dobrovoľníkov na jesennú výsadbu stromov v lokalite Brezina. Stretávame sa v sobotu ráno, náradie a rukavice zabezpečíme. Príď pomôcť lesu — aj pár hodín má zmysel.",
};
const D_ZELENA: ZbierkaDetail = {
  id: "zelena", nazov: "Zelená plus", emoji: "", accent: K.blue, badge: "MATERIÁL", lok: "Juh", volunteer: true, orgProfil: true,
  popis: "Triedenie a zber šatstva pre útulok · streda, Juh",
  pribeh: "V stredu triedime a zbierame šatstvo a deky pre miestny útulok. Prines, čo už nenosíš, alebo príď pomôcť s triedením. Každý kus poteší a zahreje.",
};

// dátovo riadená karta (comp: "data") → detail
const zoItem = (it: CharitaFeedItem): ZbierkaDetail => ({
  id: String(it.id), nazov: it.nazov || "Zbierka", emoji: it.emoji || "💛", accent: K.gold,
  badge: it.badgeL, tag: it.tag, tagCol: K.gold, overena: it.overena, orgProfil: true,
  popis: it.popis || "", vyzbierane: it.vyzbierane, ciel: it.ciel,
  ludia: it.podpora, fotky: it.fotky, lok: it.lok, karma: "Silver",
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

type Screen = "feed" | "cudzi" | "board" | "event" | "firemny";
/** krok cesty Späť v module Charita (karta 03) — platba sa do cesty nezapisuje */
type KrokCharita =
  | { typ: "zbierka"; z: ZbierkaDetail; org?: string; zoStrankyOrg?: boolean }
  | { typ: "org"; subjekt: Subjekt };
type Sheet = "add" | "dir" | null;

export default function ModulCharita({ wide, otvorModul }: ModulCharitaProps) {
  const { desktop } = useLayout();
  const [screen, setScreen] = useState<Screen>("feed"); // feed | detail
  const [sheet, setSheet] = useState<Sheet>(null); // add | reg | dir
  const [hladaj, setHladaj] = useState(false);
  // urgentná zbierka z DB/mocku (Rodina Kováčová) — pre vyhľadávanie
  const { data: ZB } = useCharitaZbierka();
  const urgentna: ZbierkaDetail | null = ZB ? { nazov: ZB.nazov, emoji: "", overena: true, lok: ZB.lok, karma: ZB.karma, avatar: ZB.avatar, fotky: ZB.fotky,
    popis: ZB.pribeh, pribeh: ZB.pribeh, vyzbierane: ZB.suma, ciel: ZB.ciel, ludia: ZB.ludia } : null;
  const [aktSubjekt, setAktSubjekt] = useState<Subjekt | null>(null);
  const [aktEvent, setAktEvent] = useState<string | null>(null);

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  // cesta Späť (nový detail zbierky): každý krok má vlastný kľúč → vlastná pamäť scrollu
  const cesta = useCesta<KrokCharita>();
  useScrollPamat(cesta.kluc ?? screen); // pamäť scrollu — „Späť" obnoví pozíciu (nie skok hore)

  // pod-obrazovka = vrstva histórie → browser Back sa vráti o krok (nie von z appky)
  useVrstva(screen !== "feed" || !!cesta.aktualny, () => (cesta.aktualny ? cesta.spat() : setScreen("feed")), screen);

  const otvorZbierku = (z: ZbierkaDetail) => cesta.otvor(z.nazov, { typ: "zbierka", z, org: z.orgProfil ? z.nazov : undefined });
  const krokCesty = () => {
    const krok = cesta.aktualny!;
    const spatNazov = cesta.predosly?.nazov ?? "Tvoj feed";
    if (krok.data.typ === "org") {
      const meno = (krok.data.subjekt as { meno?: string }).meno ?? "";
      return obal(<SwipeBack onBack={cesta.spat}><CudziProfil subjekt={krok.data.subjekt as any} toast={toast} onBack={cesta.spat} onZavriet={cesta.zavri}
        onKampan={(k: OrgKampan) => cesta.otvor(k.nazov, { typ: "zbierka", org: meno, zoStrankyOrg: true,
          z: { id: k.id, nazov: k.nazov, emoji: k.emoji, overena: true, orgProfil: true, lok: k.lok, fotky: [k.foto], popis: k.popis, pribeh: k.popis, vyzbierane: k.vyzbierane, ciel: k.ciel, ludia: k.ludia } })} /></SwipeBack>);
    }
    const { z, org, zoStrankyOrg } = krok.data;
    const o = org ? najdiOrg(org) : null;
    return (<SwipeBack onBack={cesta.spat}><ZbierkaModul key={krok.id}
      zbierka={{ id: z.id ?? z.nazov, nazov: z.nazov, popis: z.pribeh ?? z.popis, overena: z.overena,
        media: (z.fotky ?? []).map((src) => ({ typ: "foto" as const, src })), organizacia: o ? poleZOrg(o) : undefined,
        vyzbierane: z.vyzbierane, ciel: z.ciel, ludia: z.ludia }}
      onBack={cesta.spat} spatNazov={spatNazov} onZavriet={cesta.zavri} zoStrankyOrg={zoStrankyOrg}
      onOtvorOrg={o ? () => cesta.otvor(o.meno, { typ: "org", subjekt: { typ: "org", meno: o.meno, emoji: o.emoji, lok: o.lok, level: o.level } as Subjekt }) : undefined}
      stav={krok.stav} onStav={(zm) => cesta.ulozStav(krok.id, zm)} /></SwipeBack>);
  };

  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  return (
    <div style={{ minHeight: "100%", color: K.txt }}>
      <ScreenSwitch k={cesta.kluc ?? screen}>
      {cesta.aktualny && krokCesty()}
      {!cesta.aktualny && <>
      {screen === "feed" && <CharitaFeed wide={wide} toast={toast} onDetail={(z) => { if (z) otvorZbierku(z); }} onHladaj={() => setHladaj(true)} onSheet={setSheet} onBoard={() => setScreen("board")} onFiremny={() => setScreen("firemny")} />}
      {screen === "firemny" && obalSiroky(<SwipeBack onBack={() => setScreen("feed")}><MojDeedFiremny onBack={() => setScreen("feed")} toast={toast} /></SwipeBack>, { wide, desktop, max: SIRKA.stlpec })}
      {screen === "cudzi" && aktSubjekt && obal(<CudziProfil subjekt={aktSubjekt as any} toast={toast} onBack={() => setScreen("feed")}
        onKampan={(k: OrgKampan) => cesta.otvor(k.nazov, { typ: "zbierka", org: (aktSubjekt as { meno?: string } | null)?.meno, zoStrankyOrg: true,
          z: { id: k.id, nazov: k.nazov, emoji: k.emoji, overena: true, orgProfil: true, lok: k.lok, fotky: [k.foto], popis: k.popis, pribeh: k.popis, vyzbierane: k.vyzbierane, ciel: k.ciel, ludia: k.ludia } })} />)}
      {screen === "board" && <DomovBoard onBack={() => setScreen("feed")} onEvent={(id) => { setAktEvent(id); setScreen("event"); }} />}
      {screen === "event" && obal(<DomovEvent id={aktEvent} onBack={() => setScreen("board")} toast={toast} oslavuj={(s, komu) => toast(`Ďakujeme za ${s} pre ${komu}`)} />)}
      </>}
      </ScreenSwitch>

      {sheet === "add" && <SheetPridat toast={toast} otvorModul={otvorModul} onClose={() => setSheet(null)} />}
      {sheet === "dir" && <SheetAdresar toast={toast} onClose={() => setSheet(null)} onSubjekt={(s) => { setSheet(null); setAktSubjekt(s); setScreen("cudzi"); }} />}

      {hladaj && (
        <HladanieModal akcent="var(--a-info)" placeholder="Hľadať zbierky, charity, oblasti…"
          data={HLADAJ_DATA}
          onPick={(id: string) => {
            const priame: Record<string, ZbierkaDetail | null> = { rodina: null, motylik: D_MOTYLIK, zofia: D_ZOFIA, stromosvet: D_STROMOSVET, zelena: D_ZELENA };
            if (id in priame) { const z = priame[id] ?? urgentna; if (z) otvorZbierku(z); }
            else if (String(id).startsWith("adr-")) setSheet("dir");
            else { const d = HLADAJ_DATA.find((x) => x.id === id); toast(`${d?.titul} — ${d?.tag}`); }
          }}
          onSubjekt={(s) => { setAktSubjekt(s); setScreen("cudzi"); }}
          toast={toast} defaultFilter="Charity"
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
  onFiremny: () => void;
};

function CharitaFeed({ wide, toast, onDetail, onHladaj, onSheet, onBoard, onFiremny }: FeedProps) {
  useZmenyPribehov();
  const { desktop } = useLayout();
  const { data: FEED_ITEMS = [], isLoading, isError, refetch } = useCharitaFeed();
  // zvolený rádius — Feed algoritmus (Časť B): filter podľa okruhu + adaptívny
  // prah + zoradenie. Karty zostávajú pôvodné komponenty (dizajn nedotknutý),
  // engine len rozhoduje, KTORÉ a v akom poradí sa zobrazia.
  const [radius, setRadius] = useState("stvrt");
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const { gate } = useTvorbaGate(); // pasívny nesmie tvoriť (talent)
  const lok = useLokalita(); // stred feedu = aktívne mesto
  const feed = pripravFeed(FEED_ITEMS as any, { lat: lok.lat, lng: lok.lng, radius } as any) as unknown as (CharitaFeedItem & { _poradie: number; _kriza: boolean; _riadky: number })[];

  // mapovanie metadát späť na pôvodné komponenty kariet — každá karta otvorí svoj detail
  const karta = (it: CharitaFeedItem) => {
    if (it.comp === "urgent") return <ZbierkyUrgent key={it.id} wide={wide} onDetail={onDetail} />;
    if (it.comp === "top") return <ZbierkyTop key={it.id} wide={wide} onDetail={onDetail} />;
    if (it.comp === "mala") return <ZbierkyMala key={it.id} wide={wide} onDetail={onDetail} />;
    if (it.comp === "zapoj") return <ZapojSa key={it.id} wide={wide} onDetail={onDetail} />;
    if (it.comp === "data") {
      const zd = zoItem(it);
      // KARTA 55 · E: zverejnený príbeh → pod fotkou krátky text (max 3 riadky) a odkaz na stránku Príbeh
      const pr = it.pribehZbierky ? pribehZbierky(it.pribehZbierky) : null;
      if (pr) return (
        <CharitaKarta key={it.id} wide={wide} onClick={() => onDetail(zd)}
          fotky={it.fotky} emoji="💛" accent={K.gold}
          typ="charita" stav={it.konciDni != null ? { konciDni: it.konciDni } : undefined}
          doplnky={it.dorovnanie ? <DoplnokDorovnanie ini={it.dorovnanie.ini} text={it.dorovnanie.text} /> : undefined} zFirmy={it.zFirmy}
          nazov={it.nazov} overena={it.overena}
          popis={<span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{pr.kratky}</span>}
          pribehOdkaz={{ text: `Celý príbeh na stránke ${it.orgNazov ?? "organizácie"} ›`, onClick: () => otvorPribeh(it.pribehZbierky!) }}
          vyzbierane={it.vyzbierane} ciel={it.ciel} oblubena={oblubenyZo(zd)} />
      );
      return (
        <CharitaKarta key={it.id} wide={wide} onClick={() => onDetail(zd)}
          fotky={it.fotky} emoji="💛" accent={K.gold}
          typ="charita" stav={it.konciDni != null ? { konciDni: it.konciDni } : undefined}
          doplnky={it.dorovnanie ? <DoplnokDorovnanie ini={it.dorovnanie.ini} text={it.dorovnanie.text} /> : undefined} zFirmy={it.zFirmy}
          nazov={it.nazov} overena={it.overena}
          popis={it.popis} vyzbierane={it.vyzbierane} ciel={it.ciel} oblubena={oblubenyZo(zd)} />
      );
    }
    return <Material key={it.id} wide={wide} onDetail={onDetail} />;
  };

  // verejné pridávanie príspevku je zrušené — zbierky/kampane pridávajú len firmy (charity) cez svoje rozhranie.
  // V ☰ ostávajú kontextové akcie „Na tejto stránke" (talent, nástenka).
  useStrankaAkcie(() => ({
    pridat: undefined,
    extra: [
      { id: "talent", label: "Ukáž svoj talent", popis: "Tvorivé skutky a talenty", ikona: <IkonaPlay size={18} color="var(--a-green)" />, onClick: gate(() => toast("Ukáž svoj talent")) },
      { id: "board", label: "Nástenka", popis: "Akcie a udalosti v okolí", ikona: <IkonaDoska size={18} color="var(--a-green)" />, onClick: onBoard },
      { id: "firemny", label: "Môj DEED+ firemný", popis: "Rolové panely a správa — Charita · Tvorca · B2B", ikona: <IkonaInstitucia size={18} color="var(--a-green)" />, onClick: onFiremny },
    ],
  }), []);

  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      {/* header — jednotná hlavička (logo D⁺ + názov) */}
      <ModulHlavicka title="Charita" karma="Charita · Gold" right={
        <>
          <span {...pressable(onHladaj, "Hľadať")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={K.txt2} /></span>
          <Zvoncek color={K.txt2} toast={toast} />
        </>
      } />

      {/* živý ticker */}
      <Ticker>Nádej pacientom <b style={{ color: C.greenL }}>práve dostala 100 DeeD</b> → Marek</Ticker>

      {/* skratka na Adresár charít & OZ + štatistický riadok — na desktope na jednom riadku */}
      <FiltreStat
        filtre={
          <div style={{ padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
            <div onClick={() => onSheet("dir")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: K.blueBg, border: `1px solid ${K.blueEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>
              <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint("var(--a-info)", .15), color: K.blue }}><IkonaInstitucia size={20} color={K.blue} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Adresár charít & OZ</div>
                <div style={{ fontSize: 11.5, color: C.textTer }}>Overené organizácie na jednom mieste</div>
              </div>
              <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
            </div>
            {/* rolové panely a správa (Charita · Tvorca · B2B) — OPRAVY 81: vrátené, ostáva aj v profile pod Moje stránky */}
            <div onClick={onFiremny} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: K.goldBg, border: `1px solid ${tint("var(--a-gold)", .3)}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer", marginTop: SPACE.xs }}>
              <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint("var(--a-gold)", .15), color: "var(--a-gold)" }}><IkonaInstitucia size={18} color="var(--a-gold)" /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Môj <DeedZnacka /> firemný</div>
                <div style={{ fontSize: 11.5, color: C.textTer }}>Rolové panely a správa — Charita · Tvorca · B2B</div>
              </div>
              <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
            </div>
          </div>
        }
        stat={
          <StatRiadok inline={desktop} pocet={feed.length} jednotka="zbierok" mesiac="12 840"
            okruh={(FEED_CFG.radiusy as any)[radius].krat} onOkruh={() => setVyberOkruh(true)} />
        }
      />

      {/* feed — na tablete/PC: zapoj sa vľavo, zbierky vpravo (zoradené algoritmom) */}
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <FeedSkeleton count={4} />
      ) : feed.length === 0 ? (
        <EmptyState emoji="💛" title="Žiadne zbierky v okruhu" text="Skús väčší okruh." />
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

      <div style={{ fontSize: 10, color: K.txt3, textAlign: "center", padding: SPACE.xxs }}>↑ feed je pestrý — veľké urgentné, topované, dobrovoľnícke, materiál ↑</div>

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
function CharitaKartaBase({ wide, onClick, fotky, emoji, typ, stav, doplnky, zFirmy, nazov, overena, popis, vyzbierane, ciel, oblubena, pribehOdkaz }: any) {
  return (
    <FeedCard wide={wide} onClick={onClick} label={nazov} typ={typ} stav={stav} doplnky={doplnky}
      media={{
        fotky, emoji,
        overlay: oblubena ? <OblubeneHviezda polozka={oblubena} style={{ top: "auto", bottom: 10 }} /> : undefined,
      }}
      title={nazov}
      titleChips={overena ? <Overena /> : undefined}
      text={popis}
      progress={ciel ? { vyzbierane, ciel, zFirmy } : undefined}
      footer={pribehOdkaz ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); pribehOdkaz.onClick(); }}
          style={{ display: "flex", alignItems: "center", minHeight: 44, marginTop: 6, padding: 0, border: "none", background: "transparent", color: "var(--gInk)", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", textAlign: "left", boxShadow: "none" }}>{pribehOdkaz.text}</button>
      ) : undefined}
    />
  );
}
function ZbierkyUrgent({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  const { data: ZBIERKA } = useCharitaZbierka();
  if (!ZBIERKA) return null;
  // detail otvorí reálnu zbierku z DB/mocku (Rodina Kováčová) — plný obsah + progres
  const detail: ZbierkaDetail = {
    nazov: ZBIERKA.nazov, emoji: "", accent: K.gold, badge: "URGENTNÉ", overena: true,
    lok: ZBIERKA.lok, karma: ZBIERKA.karma, avatar: ZBIERKA.avatar, fotky: ZBIERKA.fotky,
    popis: ZBIERKA.pribeh, pribeh: ZBIERKA.pribeh,
    vyzbierane: ZBIERKA.suma, ciel: ZBIERKA.ciel, ludia: ZBIERKA.ludia,
  };
  return <CharitaKarta wide={wide} onClick={() => onDetail(detail)} fotky={ZBIERKA.fotky} emoji="" accent={K.gold}
    typ="ziadost" stav={{ surne: true }} doplnky={<DoplnokDorovnanie ini="NO" text="Nordika pridala 500 €" />}
    nazov="Rodina Kováčová" overena popis="V noci nám zhorel dom, ostali sme bez strechy s dvomi deťmi. Potrebujeme pomoc."
    vyzbierane={1430} ciel={2200} oblubena={oblubenyZo(detail)} />;
}
function ZbierkyTop({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  return <CharitaKarta wide={wide} onClick={() => onDetail(D_MOTYLIK)} emoji="⭐" accent={K.blue}
    typ="charita" nazov="Motýlik"
    popis="Detský hospic — pomôžte nám zabezpečiť mobilnú paliatívnu starostlivosť pre rodiny."
    vyzbierane={8200} ciel={15000} oblubena={oblubenyZo(D_MOTYLIK)} />;
}
function ZbierkyMala({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  return <CharitaKarta wide={wide} onClick={() => onDetail(D_ZOFIA)} fotky={ZOFIA_FOTKY} emoji="🩺" accent={K.green}
    typ="ziadost" nazov="Žofia K." overena popis="Po úraze tri mesiace bez príjmu, potrebujem na lieky."
    vyzbierane={520} ciel={800} oblubena={oblubenyZo(D_ZOFIA)} />;
}
function ZapojSa({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  return <CharitaKarta wide={wide} onClick={() => onDetail(D_STROMOSVET)} emoji="🌳" accent={K.green}
    typ="hladame" nazov="Stromosvet" popis="Hľadá 10 dobrovoľníkov · výsadba stromov · sobota, Brezina" oblubena={oblubenyZo(D_STROMOSVET)} />;
}
function Material({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  return <CharitaKarta wide={wide} onClick={() => onDetail(D_ZELENA)} emoji={IKONA_RECYKLACIA} accent={K.blue}
    typ="akcia" nazov="Zelená plus" popis="Triedenie a zber šatstva pre útulok · streda, Juh" oblubena={oblubenyZo(D_ZELENA)} />;
}

function Overena() {
  return <Overene size={15} label="Overená zbierka" />;
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

function SheetAdresar({ toast, onClose, onSubjekt }: { toast: (m: string) => void; onClose: () => void; onSubjekt?: (s: Subjekt) => void }) {
  const { data: ADRESAR = [], isLoading, isError, refetch } = useCharitaAdresar();
  const [chip, setChip] = useState("Všetko");
  const [hladaj, setHladaj] = useState("");
  const chipy = ["Všetko", "Zdravie", "Deti", "Zvieratá", "Príroda", "Sociálne", "Humanitárna"];

  const filtrovane = ADRESAR
    .filter((s) => chip === "Všetko" || s.chipy.includes(chip))
    .map((s) => ({ ...s, polozky: s.polozky.filter((p) => !hladaj || (p[1] + " " + p[2]).toLowerCase().includes(hladaj.toLowerCase())) }))
    .filter((s) => s.polozky.length);

  return (
    <SheetObal title="Charita & OZ" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, background: K.card, border: `1px solid ${K.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px`, marginBottom: SPACE.sm }}>
        <span style={{ display: "flex", color: K.txt3 }}><Lupa size={16} color={K.txt3} /></span>
        <input value={hladaj} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHladaj(e.target.value)} placeholder="Hľadať charitu, oblasť, mesto…"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: K.txt, fontSize: 13, padding: `${SPACE.xs}px 0` }} />
      </div>
      <SegTabs
        options={chipy}
        value={chip}
        onChange={setChip}
        ariaLabel="Filter charít podľa oblasti"
        style={{ display: "flex", gap: SPACE.xs, overflowX: "auto", paddingBottom: SPACE.xs, marginBottom: SPACE.xxs }}
        render={(c, on) => (
          <span style={{ whiteSpace: "nowrap", fontSize: 12, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: 99, cursor: "pointer", background: on ? K.txt : K.card, color: on ? K.bg : K.txt2, fontWeight: on ? 600 : 400, border: `1px solid ${on ? K.txt : K.line}` }}>{c}</span>
        )}
      />
      <div style={{ fontSize: 11, color: K.txt3, marginBottom: SPACE.sm, display: "flex", gap: SPACE.sm }}>
        <span>📍 Trenčín · 20 km</span><span>⚙ Typ pomoci</span><span style={{ marginLeft: "auto" }}>dôvera + blízkosť</span>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <SkeletonRiadky count={6} />
      ) : ADRESAR.length === 0 ? (
        <EmptyState emoji="🏛" title="Žiadne organizácie" />
      ) : (
        <>
          {filtrovane.map((s, si) => (
            <div key={s.sekcia}>
              <div style={{ fontSize: 11, fontWeight: 700, color: K.blue, textTransform: "uppercase", letterSpacing: ".04em", margin: `${SPACE.gutter}px 0 ${SPACE.xxs}px` }}>{s.sekcia}</div>
              {s.polozky.map((p, pi) => (
                <div key={pi} onClick={() => onSubjekt ? onSubjekt({ typ: "org", meno: p[1], lok: p[2], level: p[3] as any }) : toast("Profil charity — " + p[1])} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px`, borderBottom: `1px solid ${K.line}`, cursor: "pointer" }}>
                  <span style={{ width: 38, height: 38, borderRadius: RADIUS.round, overflow: "hidden", flexShrink: 0, border: `1px solid ${K.line}`, background: SEG_BG[(si + pi) % SEG_BG.length] }}>
                    <img src={najdiOrg(p[1]).logo} alt={p[1]} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{p[1]}</div>
                    <div style={{ fontSize: 12.5, color: K.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p[2]}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: lvlFarba(p[3]) }}>⬢ {p[3]}</div>
                    <div style={{ fontSize: 12, color: K.txt3, marginTop: SPACE.xxs }}>{p[4]}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!filtrovane.length && <div style={{ textAlign: "center", color: K.txt3, fontSize: 13, padding: SPACE.xl }}>Nič sa nenašlo pre „{hladaj}“</div>}
        </>
      )}
    </SheetObal>
  );
}
