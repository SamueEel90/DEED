import { useState, useEffect } from "react";
import { C, U, AV, GRAD, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { Foto, Avatar, FotoPrispevku, MiniFotky, ModulHlavicka, PodporaSekcia, PlatbaModal, RecurringSheet, SplitQrSheet, HladanieModal, OblubeneHviezda, OblubeneBtn, toast, useGaleria, useLayout, useScrollHore, useStrankaAkcie, useTvorbaGate, Ticker, StatRiadok, FiltreStat, MoniBar, FeedStlpce, FeedGrid, obalSiroky, OkruhVyber, SegTabs, tint, Lupa, Zvon, Zdielanie, IkonaSpat, IkonaVlajka, IkonaFoto, IkonaPlay, IkonaDoska, IkonaOpakovat, IkonaKriz, IkonaInstitucia, FeedSkeleton, SkeletonRiadky, EmptyState, ErrorState, ScreenSwitch } from "@/shared";
import { pripravFeed, FEED_CFG } from "@/lib/feed";
import { MEDIA_AR } from "@/lib/cardSize";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import type { CharitaFeedItem, CharitaLevel, Kanal, Subjekt, Oblubeny } from "@/types";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { GoodBoard, GoodEvent } from "@/features/good/Good";
import { useCharitaFeed, useCharitaAdresar, useCharitaZbierka } from "@/data";
import { useLokalita } from "@/lib/lokalita";
import { ZOFIA_FOTKY, HLADAJ_DATA } from "./mock";
import { tagChip } from "@/lib/ui";
import { pressable } from "@/components/pressable";

/*
  ============================================================
  MODUL CHARITA — port z DEED_Charita_Prototyp_v1.html
  feed (urgentné / topované / dobrovoľníctvo / materiál)
  → detail zbierky → podpora + pravidelná podpora
  + sheet Pridať + Adresár charít & OZ
  ============================================================
*/

// ---- lokálna paleta modulu (Aura — priesvitné glass tóny) ----
const K = {
  bg: "transparent", bg2: "rgba(var(--glass-rgb),.03)", card: "rgba(var(--glass-rgb),.045)",
  warmEdge: "rgba(245,158,90,.3)", warmBg: "rgba(245,158,90,.06)",
  blue: "var(--a-info)", blueBg: "rgba(91,155,255,.1)", blueEdge: "rgba(116,166,255,.38)",
  green: "var(--a-green)", greenBg: "rgba(52,211,153,.08)", greenEdge: "rgba(52,211,153,.32)",
  gold: "var(--a-gold)", goldBg: "rgba(240,199,90,.07)",
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
// nesie svoj obsah v ZbierkaDetail → klik ho posunie do CharitaDetail bez straty údajov.
type ZbierkaDetail = {
  id?: string;           // stabilný kľúč (obľúbené + sync karta↔detail)
  nazov: string;
  emoji?: string;
  accent?: string;
  badge?: string;        // odznak vľavo hore (napr. „🔥 URGENTNÉ")
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
const D_PLAMIENOK: ZbierkaDetail = {
  id: "plamienok", nazov: "Plamienok", emoji: "⭐", accent: K.blue, tag: "HOSPIC", tagCol: K.diamond,
  badge: "⭐ TOP", overena: true, lok: "Bratislava · celé SR", karma: "Gold", orgProfil: true,
  popis: "Detský hospic — pomôžte nám zabezpečiť mobilnú paliatívnu starostlivosť pre rodiny.",
  pribeh: "Plamienok je prvý detský hospic na Slovensku. Sprevádzame nevyliečiteľne choré deti a ich rodiny doma, kde to majú najradšej. Vaša podpora platí mobilné tímy sestier a lekárov, ktoré sú s rodinami vo dne aj v noci.",
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
  id: "zelena", nazov: "Zelená plus", emoji: "♻", accent: K.blue, badge: "MATERIÁL", lok: "Juh", volunteer: true, orgProfil: true,
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

// ZbierkaDetail → záznam obľúbených (bookmark) / cudzí profil (autor)
const oblubenyZo = (z: ZbierkaDetail): Oblubeny => ({
  refId: z.id ?? z.nazov, typ: z.volunteer ? "skutok" : "charita", modul: "charity",
  nazov: z.nazov, emoji: z.emoji, lok: z.lok, vyzbierane: z.vyzbierane, ciel: z.ciel,
});
const subjektZo = (z: ZbierkaDetail): Subjekt => z.orgProfil
  ? { typ: "org", meno: z.nazov, emoji: z.emoji, lok: z.lok, level: (z.karma as any) || "Gold" }
  : { typ: "osoba", meno: z.nazov, level: (z.karma as any) || "Silver" };

// ===================== MODUL =====================
type ModulCharitaProps = {
  wide?: boolean;
  otvorModul?: (m: string) => void;
};

type Screen = "feed" | "detail" | "cudzi" | "board" | "event";
type Sheet = "add" | "reg" | "dir" | null;

export default function ModulCharita({ wide, otvorModul }: ModulCharitaProps) {
  const { desktop } = useLayout();
  const [screen, setScreen] = useState<Screen>("feed"); // feed | detail
  const [sheet, setSheet] = useState<Sheet>(null); // add | reg | dir
  const [hladaj, setHladaj] = useState(false);
  const [aktZ, setAktZ] = useState<ZbierkaDetail | null>(null); // otvorená zbierka/karta
  const [aktSubjekt, setAktSubjekt] = useState<Subjekt | null>(null);
  const [aktEvent, setAktEvent] = useState<string | null>(null);

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);

  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: 620, maxDesktop: 920 });

  return (
    <div style={{ minHeight: "100%", color: K.txt }}>
      <ScreenSwitch k={screen}>
      {screen === "feed" && <CharitaFeed wide={wide} toast={toast} onDetail={(z) => { setAktZ(z ?? null); setScreen("detail"); }} onHladaj={() => setHladaj(true)} onSheet={setSheet} onBoard={() => setScreen("board")} />}
      {screen === "detail" && obal(<CharitaDetail z={aktZ} toast={toast} onBack={() => setScreen("feed")} onReg={() => setSheet("reg")} onAutor={(s) => { setAktSubjekt(s); setScreen("cudzi"); }} />)}
      {screen === "cudzi" && aktSubjekt && obal(<CudziProfil subjekt={aktSubjekt as any} toast={toast} onBack={() => setScreen("feed")} />)}
      {screen === "board" && <GoodBoard onBack={() => setScreen("feed")} onEvent={(id) => { setAktEvent(id); setScreen("event"); }} toast={toast} />}
      {screen === "event" && obal(<GoodEvent id={aktEvent} onBack={() => setScreen("board")} toast={toast} oslavuj={(s, komu) => toast(`Ďakujeme za ${s} pre ${komu}`)} />)}
      </ScreenSwitch>

      {sheet === "add" && <SheetPridat toast={toast} otvorModul={otvorModul} onClose={() => setSheet(null)} />}
      {sheet === "reg" && <SheetReg toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "dir" && <SheetAdresar toast={toast} onClose={() => setSheet(null)} onSubjekt={(s) => { setSheet(null); setAktSubjekt(s); setScreen("cudzi"); }} />}

      {hladaj && (
        <HladanieModal akcent="var(--a-info)" placeholder="Hľadať zbierky, charity, oblasti…"
          data={HLADAJ_DATA}
          onPick={(id: string) => {
            const priame: Record<string, ZbierkaDetail | null> = { rodina: null, plamienok: D_PLAMIENOK, zofia: D_ZOFIA, stromosvet: D_STROMOSVET, zelena: D_ZELENA };
            if (id in priame) { setAktZ(priame[id]); setScreen("detail"); }
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
};

function CharitaFeed({ wide, toast, onDetail, onHladaj, onSheet, onBoard }: FeedProps) {
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
      return (
        <CharitaKarta key={it.id} wide={wide} onClick={() => onDetail(zd)}
          fotky={it.fotky} emoji="💛" accent={K.gold}
          badgeL={it.badgeL ? { t: it.badgeL, col: K.gold } : undefined}
          nazov={it.nazov} overena={it.overena} tag={it.tag} tagCol={K.gold}
          popis={it.popis} vyzbierane={it.vyzbierane} ciel={it.ciel} oblubena={oblubenyZo(zd)} />
      );
    }
    return <Material key={it.id} wide={wide} onDetail={onDetail} />;
  };

  // kontextové akcie stránky → plávajúce „+ Pridať" dole + sekcia „Na tejto stránke" v menu (☰)
  useStrankaAkcie(() => ({
    pridat: { id: "add", label: "Pridať", onClick: () => onSheet("add") },
    extra: [
      { id: "talent", label: "Ukáž svoj talent", popis: "Tvorivé skutky a talenty", ikona: <IkonaPlay size={18} color="var(--a-green)" />, onClick: gate(() => toast("Ukáž svoj talent (demo)")) },
      { id: "board", label: "Nástenka", popis: "Akcie a udalosti v okolí", ikona: <IkonaDoska size={18} color="var(--a-green)" />, onClick: onBoard },
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
      <Ticker>Liga proti rakovine <b style={{ color: C.greenL }}>práve dostala 100 DEED</b> → Marek</Ticker>

      {/* skratka na Adresár charít & OZ + štatistický riadok — na desktope na jednom riadku */}
      <FiltreStat
        filtre={
          <div style={{ padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
            <div onClick={() => onSheet("dir")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: K.blueBg, border: `1px solid ${K.blueEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>
              <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(91,168,240,.15)", color: K.blue }}><IkonaInstitucia size={20} color={K.blue} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Adresár charít & OZ</div>
                <div style={{ fontSize: 11.5, color: C.textTer }}>Overené organizácie na jednom mieste</div>
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
        <FeedStlpce wide={wide} padding="4px 14px 12px"
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
// JEDNOTNÁ FULL-WIDTH (Instagram) KARTA pre Charitu — médium hore · odznaky · titul · príbeh · progres.
function CharitaKarta({ wide, onClick, fotky, emoji, accent, badgeL, badgeR, nazov, overena, tag, tagBg, tagCol, popis, vyzbierane, ciel, oblubena }: any) {
  return (
    <div {...pressable(onClick, nazov)} className="good-card" style={{ background: K.card, border: wide ? `1px solid ${K.line}` : "none", borderBottom: `1px solid ${K.line}`, borderLeft: `3px solid ${accent}`, borderRadius: wide ? RADIUS.md : 0, overflow: "hidden", marginBottom: wide ? 0 : SPACE.sm, cursor: "pointer", ...(wide ? {} : { marginLeft: -SPACE.gutter, marginRight: -SPACE.gutter }) }}>
      {/* médium — 16:9 na tablete/desktope; na mobile pôvodná výška 235 px */}
      <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : { height: 235 }) }}>
        <FotoPrispevku fotky={fotky} emoji={emoji} h={wide ? "100%" : 235} disableGaleria />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.34), transparent 42%)", pointerEvents: "none" }} />
        {badgeL && <span style={badge({ top: 10, left: 10, color: badgeL.col, background: badgeL.bg })}>{badgeL.t}</span>}
        {badgeR && <span style={badge({ top: 10, right: 10, color: badgeR.col, background: badgeR.bg })}>{badgeR.t}</span>}
        {oblubena && <OblubeneHviezda polozka={oblubena} style={{ top: "auto", bottom: 10 }} />}
      </div>
      <div style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px ${SPACE.gutter}px` }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: SPACE.xs, flexWrap: "wrap" }}>
          <span>{nazov}</span>
          {overena && <Overena />}
          {tag && <span style={tagChip(tagCol)}>{tag}</span>}
        </div>
        <div style={{ fontSize: 13, color: K.txt2, lineHeight: 1.5, marginTop: SPACE.xxs }}>{popis}</div>
        {ciel ? <div style={{ marginTop: SPACE.sm }}><MoniBar vyzbierane={vyzbierane} ciel={ciel} mini /></div> : null}
      </div>
    </div>
  );
}
function ZbierkyUrgent({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  const { data: ZBIERKA } = useCharitaZbierka();
  if (!ZBIERKA) return null;
  // detail otvorí reálnu zbierku z DB/mocku (Rodina Kováčová) — plný obsah + progres
  const detail: ZbierkaDetail = {
    nazov: ZBIERKA.nazov, emoji: "🔥", accent: K.gold, badge: "🔥 URGENTNÉ", overena: true,
    lok: ZBIERKA.lok, karma: ZBIERKA.karma, avatar: ZBIERKA.avatar, fotky: ZBIERKA.fotky,
    popis: ZBIERKA.pribeh, pribeh: ZBIERKA.pribeh,
    vyzbierane: ZBIERKA.suma, ciel: ZBIERKA.ciel, ludia: ZBIERKA.ludia,
  };
  return <CharitaKarta wide={wide} onClick={() => onDetail(detail)} fotky={ZBIERKA.fotky} emoji="🔥" accent={K.gold}
    badgeL={{ t: "🔥 URGENTNÉ", col: K.gold }} badgeR={{ t: "🛡 Lidl · 500 €", col: K.diamond, bg: "rgba(96,165,250,.18)" }}
    nazov="Rodina Kováčová" overena popis="V noci nám zhorel dom, ostali sme bez strechy s dvomi deťmi. Potrebujeme pomoc."
    vyzbierane={1430} ciel={2200} oblubena={oblubenyZo(detail)} />;
}
function ZbierkyTop({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  return <CharitaKarta wide={wide} onClick={() => onDetail(D_PLAMIENOK)} emoji="⭐" accent={K.blue}
    badgeL={{ t: "⭐ TOP", col: K.diamond, bg: "rgba(96,165,250,.18)" }}
    nazov="Plamienok" tag="HOSPIC" tagBg="rgba(96,165,250,.12)" tagCol={K.diamond}
    popis="Detský hospic — pomôžte nám zabezpečiť mobilnú paliatívnu starostlivosť pre rodiny."
    vyzbierane={8200} ciel={15000} oblubena={oblubenyZo(D_PLAMIENOK)} />;
}
function ZbierkyMala({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  return <CharitaKarta wide={wide} onClick={() => onDetail(D_ZOFIA)} fotky={ZOFIA_FOTKY} emoji="🩺" accent={K.green}
    badgeR={{ t: "D+", col: K.green, bg: "rgba(52,211,153,.18)" }}
    nazov="Žofia K." overena popis="Po úraze tri mesiace bez príjmu, potrebujem na lieky."
    vyzbierane={520} ciel={800} oblubena={oblubenyZo(D_ZOFIA)} />;
}
function ZapojSa({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  return <CharitaKarta wide={wide} onClick={() => onDetail(D_STROMOSVET)} emoji="🌳" accent={K.green}
    badgeL={{ t: "DOBROVOĽNÍCTVO", col: K.green, bg: "rgba(52,211,153,.18)" }}
    nazov="Stromosvet" popis="Hľadá 10 dobrovoľníkov · výsadba stromov · sobota, Brezina" oblubena={oblubenyZo(D_STROMOSVET)} />;
}
function Material({ wide, onDetail }: { wide?: boolean; onDetail: (z?: ZbierkaDetail) => void }) {
  return <CharitaKarta wide={wide} onClick={() => onDetail(D_ZELENA)} emoji="♻" accent={K.blue}
    badgeL={{ t: "MATERIÁL", col: K.diamond, bg: "rgba(96,165,250,.18)" }}
    nazov="Zelená plus" popis="Triedenie a zber šatstva pre útulok · streda, Juh" oblubena={oblubenyZo(D_ZELENA)} />;
}

function badge({ top, left, right, color, background }: { top?: number; left?: number; right?: number; color?: string; background?: string }): React.CSSProperties {
  return { position: "absolute", top, left, right, fontSize: 10.5, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, fontWeight: 800, color: color || "#fff", background: background || "rgba(8,11,18,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 2px 8px rgba(0,0,0,.25)", pointerEvents: "none" };
}
function Overena() {
  return <span style={tagChip(K.green)}>✓ overená</span>;
}
type RiadokKartaProps = {
  wide?: boolean;
  onClick: () => void;
  ikona: React.ReactNode;
  ikonaBg: string;
  ikonaCol: string;
  ikonaText?: boolean;
  nazov: string;
  tag: string;
  tagBg: string;
  tagCol: string;
  popis: string;
};
function RiadokKarta({ wide, onClick, ikona, ikonaBg, ikonaCol, ikonaText, nazov, tag, tagBg, tagCol, popis }: RiadokKartaProps) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: K.card, border: `1px solid ${K.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: wide ? 0 : SPACE.sm, cursor: "pointer" }}>
      <div style={{ width: 42, height: 42, borderRadius: RADIUS.xs, background: ikonaBg, color: ikonaCol, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ikonaText ? 12 : 18, fontWeight: ikonaText ? 700 : 400, flexShrink: 0 }}>{ikona}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: SPACE.xxs }}>{nazov} <span style={{ fontSize: 11, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: 5, fontWeight: 600, background: tagBg, color: tagCol }}>{tag}</span></div>
        <div style={{ fontSize: 13, color: K.txt2, marginTop: SPACE.xxs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{popis}</div>
      </div>
    </div>
  );
}

// ===================== DETAIL ZBIERKY =====================
// `z` = obsah kliknutej karty (ktorákoľvek karta feedu). Ak chýba (deep-link,
// hľadanie „rodina"), fallback = hlavná zbierka z DB/mocku. Bez cieľa (ciel) ide
// o dobrovoľníctvo/materiál → bez progresu a namiesto podpory CTA „Zapojiť sa".
function CharitaDetail({ z: zProp, toast, onBack, onReg, onAutor }: { z?: ZbierkaDetail | null; toast: (m: string) => void; onBack: () => void; onReg: () => void; onAutor?: (s: Subjekt) => void }) {
  const { data: DB } = useCharitaZbierka();
  const zRaw: ZbierkaDetail | null = zProp ?? (DB ? {
    nazov: DB.nazov, emoji: "🔥", accent: K.gold, badge: "🔥 URGENTNÉ", overena: true,
    lok: DB.lok, karma: DB.karma, avatar: DB.avatar, fotky: DB.fotky,
    popis: DB.pribeh, pribeh: DB.pribeh, vyzbierane: DB.suma, ciel: DB.ciel, ludia: DB.ludia,
  } : null);

  const [suma, setSuma] = useState(zProp?.vyzbierane ?? 0);
  const [ludia, setLudia] = useState(zProp?.ludia ?? 0);
  const [platba, setPlatba] = useState<Kanal | null>(null); // "EUR" | "DEED"
  const [recur, setRecur] = useState(false);                // pravidelná podpora (LEN charita)
  const [split, setSplit] = useState(false);                // split QR (influencer)
  const otvorGaleriu = useGaleria();
  const { wide } = useLayout();
  if (!zRaw) return null;
  const z = zRaw; // zúžené na non-null (bezpečné aj v closure onDone/onPodpor)

  const ciel = z.ciel;
  const jeZbierka = ciel != null && !z.volunteer; // má finančný cieľ → progres + podpora
  const fotky = z.fotky ?? [];
  const maFoto = fotky.length > 0;
  const pribeh = z.pribeh ?? z.popis;
  const pct = ciel ? Math.min(100, Math.round(suma / ciel * 100)) : 0;

  function podpor(hodnota: number, text: string) {
    setSuma((s) => s + hodnota * 0.01);
    setLudia((l) => l + 1);
    toast(text);
  }
  function platbaHotova(s: number) {
    setSuma((x) => x + s * (platba === "EUR" ? 1 : 0.01));
    setLudia((l) => l + 1);
    toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DEED"} · ${z.nazov}`);
  }

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.gutter}px ${SPACE.md}px` }}>
        <span onClick={onBack} style={{ width: 32, height: 32, flex: "0 0 auto", borderRadius: RADIUS.round, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${K.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: K.txt2, cursor: "pointer" }}><IkonaSpat size={17} color={K.txt2} /></span>
        {z.badge && <span style={{ fontSize: 12, color: K.diamond, background: K.blueBg, border: `1px solid ${K.blueEdge}`, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, fontWeight: 700, letterSpacing: ".02em" }}>{z.badge}</span>}
        {z.lok && <span style={{ fontSize: 12, color: K.txt2 }}>📍 {z.lok}</span>}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: SPACE.gutter, color: K.txt2 }}><Zdielanie size={17} color={K.txt2} /><IkonaVlajka size={16} color={K.txt2} /></span>
      </div>

      <div style={{ padding: `0 ${SPACE.md}px` }}>
        {/* hero foto — klik = celá obrazovka + swipe (16:9 na desktope) */}
        <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : {}) }}>
          <Foto src={maFoto ? fotky[0] : undefined} emoji={z.emoji || "💛"} h={wide ? "100%" : 200} w={wide ? "100%" : undefined} radius={14} onClick={() => maFoto && otvorGaleriu(fotky, 0)} />
          {maFoto && <span style={{ ...badge({ top: 9, right: 9, color: K.txt }), display: "inline-flex", alignItems: "center", gap: SPACE.xxs }}><IkonaFoto size={12} color={K.txt} /> foto z prípadu</span>}
          {fotky.length > 1 && <span style={{ position: "absolute", bottom: 9, right: 9, background: "rgba(0,0,0,.6)", borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.xs}px`, fontSize: 10, color: "#fff", pointerEvents: "none" }}>⧉ {fotky.length} · klikni na foto</span>}
        </div>
      </div>
      <MiniFotky fotky={fotky} />

      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px 0` }}>
        <div onClick={() => onAutor?.(subjektZo(z))} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs, cursor: onAutor ? "pointer" : "default" }}>
          <Avatar src={z.avatar} emoji={z.emoji || "💛"} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: SPACE.xs }}>{z.nazov} {z.overena && <Overena />}{z.tag && <span style={tagChip(z.tagCol || K.gold)}>{z.tag}</span>}</div>
            <div style={{ fontSize: 11.5, color: K.txt2, marginTop: SPACE.xxs }}>{z.karma && <><span style={{ color: K.gold }}>⭐ {z.karma}</span> · </>}📍 {z.lok || "Slovensko"} · 1 deň</div>
          </div>
          {onAutor && <span style={{ color: K.txt3, fontSize: 18, flex: "none" }}>›</span>}
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.55, margin: `${SPACE.sm}px 0 ${SPACE.sm}px` }}>{pribeh}</div>

        {/* uložiť do obľúbených */}
        <div style={{ marginBottom: SPACE.gutter }}>
          <OblubeneBtn polozka={oblubenyZo(z)} toast={toast} style={{ width: "100%" }} />
        </div>

        {/* progres — len zbierky s finančným cieľom */}
        {jeZbierka && (
          <div style={{ background: K.card, border: `1px solid ${K.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.gutter}px ${SPACE.md}px`, marginBottom: SPACE.gutter }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: K.green, float: "right" }}>{pct} %</span>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{Math.round(suma)} € <small style={{ fontSize: 13, color: K.txt2, fontWeight: 400 }}>z {ciel} €</small></div>
            <div style={{ height: 9, background: "rgba(var(--glass-rgb),.1)", borderRadius: 99, overflow: "hidden", margin: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>
              <div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99, transition: "width .6s ease", boxShadow: "0 0 12px rgba(43,212,155,.5)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: K.txt2 }}>
              <span>👥 {ludia} ľudí pomohlo</span><span style={{ color: K.green }}>● rastie live</span>
            </div>
          </div>
        )}

        {jeZbierka ? (
          <>
            {/* jednotná sekcia podpory */}
            <div style={{ marginBottom: SPACE.gutter }}>
              <PodporaSekcia
                onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
                upvotes={140} onUpvote={() => toast("Palec hore")}
                onPodpor={(s: number) => podpor(s, `Ďakujeme za ${s} DEED pre ${z.nazov}`)} onSms={() => podpor(100, "SMS podpora")}
                onKanal={(k: string) => setPlatba(k as Kanal)} />
            </div>

            {/* pravidelná podpora */}
            <div onClick={() => setRecur(true)} style={{ width: "100%", border: `2px solid ${K.blueEdge}`, background: K.blueBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: SPACE.sm, display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
              <IkonaOpakovat size={17} color={K.blue} /> Pravidelná podpora
            </div>

            {/* split QR (influencer) — aká časť platby ide komu */}
            <div onClick={() => setSplit(true)} style={{ width: "100%", border: `1px solid ${K.greenEdge}`, background: K.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 600, color: K.green, cursor: "pointer", marginBottom: SPACE.gutter, display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
              🎬 Influencer: rozdeliť platbu (Split QR)
            </div>
          </>
        ) : (
          /* dobrovoľníctvo / materiál — bez peňazí, CTA na zapojenie + zdieľanie */
          <div style={{ marginBottom: SPACE.gutter }}>
            <div onClick={() => toast(`Ozvali sme sa organizácii ${z.nazov} — čoskoro ťa budú kontaktovať`)} style={{ width: "100%", border: `2px solid ${K.greenEdge}`, background: K.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 15, fontWeight: 700, color: K.green, cursor: "pointer", marginBottom: SPACE.sm }}>
              🙌 Zapojiť sa
            </div>
            <div onClick={() => toast("Zdieľať: odkaz skopírovaný · siete")} style={{ width: "100%", border: `1px solid ${K.line}`, background: K.card, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center", fontSize: 13, fontWeight: 600, color: K.txt2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
              <Zdielanie size={16} color={K.txt2} /> Zdieľať výzvu
            </div>
          </div>
        )}
      </div>

      {/* simulácia platby (EUR karta / DEED peňaženka) */}
      {platba && <PlatbaModal kanal={platba} komu={z.nazov} onClose={() => setPlatba(null)} onDone={platbaHotova} />}

      {/* pravidelná podpora — LEN charita (3 voľby + dvojité potvrdenie) */}
      {recur && <RecurringSheet nazov={z.nazov} onClose={() => setRecur(false)} toast={toast} />}

      {/* split QR (influencer) — rozdelenie platby medzi príjemcov */}
      {split && <SplitQrSheet titul={z.nazov} caseId={z.id ?? null} onClose={() => setSplit(false)} toast={toast} />}
    </div>
  );
}

function PayBtn({ flex, bg, bd, col, e, v, onClick }: { flex?: number | string; bg?: string; bd?: string; col?: string; e?: React.ReactNode; v?: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ flex, background: bg, border: `1px solid ${bd}`, borderRadius: RADIUS.sm, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `${SPACE.xs}px 0`, cursor: "pointer", gap: SPACE.xxs }}>
      <span style={{ fontSize: 18, color: col }}>{e}</span><span style={{ fontSize: 11, fontWeight: 600, color: col }}>{v}</span>
    </div>
  );
}

// ===================== SHEETY =====================
function SheetObal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(var(--panel-rgb),.92)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", zIndex: 50, display: "flex", flexDirection: "column", animation: "fadeUp .2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: SPACE.md, borderBottom: `1px solid ${K.line}` }}>
        <span onClick={onClose} style={{ display: "flex", color: K.txt2, cursor: "pointer" }}><IkonaKriz size={20} color={K.txt2} /></span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: SPACE.md }}>{children}</div>
    </div>
  );
}

type SheetMoznost = [emoji: string, titul: string, popis: string, akcia: () => void];

function SheetPridat({ toast, otvorModul, onClose }: { toast: (m: string) => void; otvorModul?: (m: string) => void; onClose: () => void }) {
  const moznosti: SheetMoznost[] = [
    ["💶", "Žiadosť o pomoc", "Finančná zbierka — krátka alebo dlhodobá", () => { onClose(); otvorModul && otvorModul("help"); }],
    ["🙋", "Žiadosť na dobrovoľníctvo", "Nábor — počet, miesto, dĺžka, QR", () => toast("Sprievodca dobrovoľníckej výzvy (6 krokov)")],
    ["📦", "Iná nefinančná pomoc", "Materiál (deky, krmivo…) — fáza 2", () => toast("Materiál — fáza 2")],
    ["📎", "Dôkaz / update", "Dokladovanie použitia k bežiacej žiadosti", () => toast("Pridať dôkaz / update k bežiacej zbierke")],
    ["✨", "Skutok „takto sme pomohli“", "Dopad / výsledok → Talent", () => toast("Pridať skutok „takto sme pomohli“ → Talent")],
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

function SheetReg({ toast, onClose }: { toast: (m: string) => void; onClose: () => void }) {
  return (
    <SheetObal title="Pravidelná podpora" onClose={onClose}>
      <div onClick={() => toast("Podporujem → frekvencia → suma → EUR/DEED → potvrď")} style={{ background: K.card, border: `1px solid ${K.line}`, borderRadius: RADIUS.sm, padding: SPACE.md, marginBottom: SPACE.sm, cursor: "pointer" }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>💶 Túto žiadosť</div>
        <div style={{ fontSize: 12, color: K.txt2, marginTop: SPACE.xxs, lineHeight: 1.45 }}>Pravidelne podporuješ konkrétnu zbierku (Rodina Kováčová). Odhadovaná doba: dlhodobá.</div>
      </div>
      <div onClick={() => toast("Podporujem segment → frekvencia → suma → potvrď")} style={{ background: K.goldBg, border: `1px solid rgba(240,199,90,.4)`, borderRadius: RADIUS.sm, padding: SPACE.md, marginBottom: SPACE.sm, cursor: "pointer" }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>🗂 Segment charity</div>
        <div style={{ fontSize: 12, color: K.txt2, marginTop: SPACE.xxs, lineHeight: 1.45 }}>Podporuješ tému (napr. „onkopacienti“). Charita rozdelí podľa svojho kľúča.</div>
        <div style={{ fontSize: 11, color: K.gold, marginTop: SPACE.xxs }}>⚠️ Tu nevieme presne deklarovať použitie peňazí.</div>
      </div>
      <div onClick={() => toast("Podporujem charitu → frekvencia → suma → potvrď")} style={{ background: K.card, border: `1px solid ${K.line}`, borderRadius: RADIUS.sm, padding: SPACE.md, marginBottom: SPACE.sm, cursor: "pointer" }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>🏛 Celá charita</div>
        <div style={{ fontSize: 12, color: K.txt2, marginTop: SPACE.xxs, lineHeight: 1.45 }}>Paušálna podpora charity — ona sa stará. Sleduješ jej dôveryhodnosť (badge/karma).</div>
      </div>
      <div style={{ fontSize: 10, color: K.txt3, textAlign: "center", padding: SPACE.xxs }}>na pozadí má každá voľba svoj QR/ID · pri výzve sa nastaví prechod 1→2</div>
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
                  <div style={{ width: 38, height: 38, borderRadius: RADIUS.xs, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: SEG_BG[(si + pi) % SEG_BG.length], color: K.txt }}>{p[0]}</div>
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
