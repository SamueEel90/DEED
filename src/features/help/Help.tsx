import { useState, useEffect } from "react";
import { C, pasmo, inp, infoBox, btn, GRAD_ZELENY, glassTmavy, SPACE, RADIUS } from "@/theme";
import { Foto, Avatar, FotoPrispevku, MiniFotky, Hlavicka, ModulHlavicka, PodporaSekcia, PlatbaModal, HladanieModal, Otazka, Vyber, vyberBox, NavBtns, Suhrn, DokladRow, toast, useGaleria, useLayout, useScrollHore, useStrankaAkcie, useTvorbaGate, Ticker, StatRiadok, FiltreStat, MoniBar, FeedStlpce, FeedGrid, obalSiroky, OkruhVyber, Lupa, Zdielanie, IkonaSpat, IkonaVlajka, IkonaFoto, IkonaPlay, IkonaDoska, IkonaPin, FeedSkeleton, EmptyState, ErrorState, ScreenSwitch } from "@/shared";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { pripravFeed, FEED_CFG } from "@/lib/feed";
import { MEDIA_AR } from "@/lib/cardSize";
import type { HelpFeedItem, Subjekt } from "@/types";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { GoodBoard, GoodEvent } from "@/features/good/Good";
import { useHelpFeed } from "@/data";
import { tint, tagChip } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { USER_LOK, ZIVE_DARY } from "./mock";

/*
  ============================================================
  MODUL HELP — crowdfunding pre ľudí v núdzi
  feed → detail → podpora · ＋ Pridať → Ponúkam / Dopytujem
  ============================================================
*/

// ===================== MODUL =====================
export default function ModulHelp({ wide }: { wide?: boolean }) {
  const { desktop } = useLayout();
  const { data: MOCK_FEED = [] } = useHelpFeed();
  const [screen, setScreen] = useState("feed"); // feed | detail | add | offer | request
  const [aktDetail, setAktDetail] = useState<any>(null);
  const [aktSubjekt, setAktSubjekt] = useState<Subjekt | null>(null);
  const [aktEvent, setAktEvent] = useState<string | null>(null);
  const [hladaj, setHladaj] = useState(false);
  const otvorZ = (z: any) => { setAktDetail(z); setScreen("detail"); };

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);

  // na tablete/desktope sa detailové obrazovky vycentrujú do čitateľnej šírky
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: 620, maxDesktop: 920 });

  return (
    <div style={{ minHeight: "100%" }}>
      <ScreenSwitch k={screen}>
      {screen === "feed" && <Feed wide={wide} toast={toast} onDetail={otvorZ} onHladaj={() => setHladaj(true)} onAdd={() => setScreen("add")} onBoard={() => setScreen("board")} />}
      {screen === "detail" && obal(<Detail z={aktDetail} onBack={() => setScreen("feed")} onAutor={(s) => { setAktSubjekt(s); setScreen("cudzi"); }} />)}
      {screen === "add" && obal(<Add onBack={() => setScreen("feed")} onOffer={() => setScreen("offer")} onRequest={() => setScreen("request")} />)}
      {screen === "offer" && obal(<OfferFlow onDone={() => setScreen("feed")} />)}
      {screen === "request" && obal(<RequestFlow onDone={() => setScreen("feed")} />)}
      {screen === "cudzi" && aktSubjekt && obal(<CudziProfil subjekt={aktSubjekt as any} toast={toast} onBack={() => setScreen("feed")} />)}
      {screen === "board" && obal(<GoodBoard onBack={() => setScreen("feed")} onEvent={(id) => { setAktEvent(id); setScreen("event"); }} toast={toast} />)}
      {screen === "event" && obal(<GoodEvent id={aktEvent} onBack={() => setScreen("board")} toast={toast} oslavuj={(s, komu) => toast(`Ďakujeme za ${s} pre ${komu}`)} />)}
      </ScreenSwitch>

      {hladaj && (
        <HladanieModal akcent="var(--a-danger)" placeholder="Hľadať žiadosti, ponuky, ľudí…"
          data={MOCK_FEED.filter((z) => z.typ !== "charity").map((z) => ({
            id: z.id, titul: z.nazov, podtitul: z.pribeh, kat: z.lok, emoji: z.ikona,
            tag: z.typ === "ziadost" ? "Žiadosť" : "Ponuka",
          }))}
          onPick={(id: number | string) => { const z = MOCK_FEED.find((x) => x.id === id); if (!z) return; z.typ === "ziadost" ? otvorZ(z) : toast(`${z.nazov} — ${z.typ === "ponuka" ? "ponuka pomoci" : "charita"}`); }}
          onSubjekt={(s) => { setAktSubjekt(s); setScreen("cudzi"); }}
          toast={toast} defaultFilter="Žiadosti Help"
          onClose={() => setHladaj(false)} />
      )}
    </div>
  );
}

// ===================== FEED =====================
function Feed({ wide, toast, onDetail, onHladaj, onAdd, onBoard }: { wide?: boolean; toast: (m: string) => void; onDetail: (z: any) => void; onHladaj: () => void; onAdd: () => void; onBoard: () => void }) {
  const { desktop } = useLayout();
  const { data: MOCK_FEED = [], isLoading, isError, refetch } = useHelpFeed();
  // živý ticker darov
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 3500);
    return () => clearInterval(t);
  }, []);
  const dar = ZIVE_DARY[tick % ZIVE_DARY.length];

  // zvolený rádius — Feed algoritmus (Časť B): filter podľa okruhu + adaptívny
  // prah + zoradenie. Ponuky/žiadosti si nechávajú vlastný `velkost` (iný slovník
  // než engine), preto NEpremapúvame zobrazVelkost — len filter + poradie.
  const [radius, setRadius] = useState<string>("stvrt");
  const [view, setView] = useState<"all" | "ziadost" | "ponuka">("all"); // typ pomoci (charita do Help nepatrí)
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const { gate } = useTvorbaGate(); // pasívny nesmie tvoriť (talent)
  // charitu z Help vynechávame; potom filter podľa zvoleného typu (žiadosť / ponuka)
  const zaklad = MOCK_FEED.filter((z) => z.typ !== "charity" && (view === "all" || z.typ === view));
  const feed = pripravFeed(zaklad as any, { ...USER_LOK, radius } as any);

  const karta = (z: any) => <FeedCard key={z.id} z={z} wide={wide} onClick={() => z.typ === "ziadost" && onDetail(z)} />;
  const jeZiadost = (z: any) => z.typ === "ziadost";

  // kontextové akcie stránky → plávajúce „+ Pridať" dole + sekcia „Na tejto stránke" v menu (☰)
  useStrankaAkcie(() => ({
    pridat: { id: "add", label: "Pridať", onClick: onAdd },
    extra: [
      { id: "talent", label: "Ukáž svoj talent", popis: "Tvorivé skutky a talenty", ikona: <IkonaPlay size={18} color="var(--a-green)" />, onClick: gate(() => toast("Ukáž svoj talent (demo)")) },
      { id: "board", label: "Nástenka", popis: "Akcie a udalosti v okolí", ikona: <IkonaDoska size={18} color="var(--a-green)" />, onClick: onBoard },
    ],
  }), []);

  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      {/* header — jednotná hlavička (logo D⁺ + názov) */}
      <ModulHlavicka title="Help" karma="Pomoc · Silver" right={
        <>
          <span {...pressable(onHladaj, "Hľadať")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={C.textSec} /></span>
          <Zvoncek color={C.textSec} toast={toast} />
        </>
      } />

      {/* živý ticker */}
      <Ticker key={tick}><b style={{ color: C.text }}>{dar.kto}</b> práve poslal <b style={{ color: C.greenL }}>{dar.co}</b> → {dar.komu}</Ticker>

      {/* filter typu pomoci + štatistický riadok — na desktope na jednom riadku */}
      <FiltreStat
        filtre={
          <div style={{ display: "flex", gap: SPACE.xs, padding: `0 ${SPACE.md}px ${SPACE.xs}px` }}>
            <Seg on={view === "all"} col="var(--a-info)" label="Všetko" onClick={() => setView("all")} />
            <Seg on={view === "ziadost"} col="var(--a-danger)" emoji="🙋" label="Žiadosti" onClick={() => setView("ziadost")} />
            <Seg on={view === "ponuka"} col="var(--a-plum)" emoji="🤝" label="Ponuky" onClick={() => setView("ponuka")} />
          </div>
        }
        stat={
          <StatRiadok inline={desktop} pocet={feed.length} jednotka={view === "ponuka" ? "ponúk" : view === "ziadost" ? "žiadostí" : "príspevkov"} mesiac="8 421"
            okruh={FEED_CFG.radiusy[radius].krat} onOkruh={() => setVyberOkruh(true)} />
        }
      />

      {/* karty — na tablete/PC: ponúkajú vľavo, hľadajú vpravo (zoradené algoritmom) */}
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <FeedSkeleton count={4} />
      ) : feed.length === 0 ? (
        <EmptyState emoji="🙏" title="Nič v tomto okruhu" text="V tomto okruhu zatiaľ nič nie je. Skús iný typ alebo menší okruh." />
      ) : desktop ? (
        <FeedGrid cols={3} cards={feed.map(karta)} />
      ) : (
        <FeedStlpce wide={wide} padding="4px 8px"
          labelSkutky="Ponúkajú pomoc" labelZiadosti="Hľadajú pomoc"
          jednoStlpec={feed.map(karta)}
          skutky={feed.filter((z) => !jeZiadost(z)).map(karta)}
          ziadosti={feed.filter(jeZiadost).map(karta)}
        />
      )}

      {vyberOkruh && <OkruhVyber radius={radius} akcent="var(--a-danger)"
        onPick={(r: any) => { setRadius(r); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}

// segment filtra typu pomoci (Všetko / Žiadosti / Ponuky) — theme-aware cez tint(col)
function Seg({ on, col, label, emoji, onClick }: { on: boolean; col: string; label: string; emoji?: string; onClick: () => void }) {
  return (
    <div {...pressable(onClick, label)} aria-current={on ? "page" : undefined} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, height: 38, borderRadius: RADIUS.sm, fontSize: 12.5, fontWeight: on ? 700 : 600, cursor: "pointer", whiteSpace: "nowrap", background: on ? tint(col, .15) : C.surface2, border: `1px solid ${on ? tint(col, .5) : C.line2}`, color: on ? col : C.textSec }}>
      {emoji && <span style={{ fontSize: 13 }}>{emoji}</span>}{label}
    </div>
  );
}

// JEDNOTNÁ FULL-WIDTH (Instagram) KARTA pre Help — žiadosť / ponuka / charita:
// veľké médium hore (foto/emoji) · typový odznak · titul + príbeh · pri žiadosti progres.
function FeedCard({ z, wide, onClick }: { z: any; wide?: boolean; onClick: () => void }) {
  const jeZiadost = z.typ === "ziadost";
  const jePonuka = z.typ === "ponuka";
  const jeKriza = z.typSituacie === "kriza";
  const accent = jeZiadost ? (z.sponzor ? C.gold : C.red) : jePonuka ? C.purple : C.gold;
  const typLabel = jeZiadost ? `ŽIADOSŤ · ${z.sponzor ? "D++" : "D+"}` : jePonuka ? "PONUKA POMOCI" : "CHARITA";
  return (
    <div {...pressable(onClick, z.nazov)} className="good-card" style={{ margin: wide ? 0 : `0 ${-SPACE.md}px ${SPACE.sm}px`, border: wide ? `1px solid ${C.line}` : "none", borderBottom: `1px solid ${wide ? C.line : C.line2}`, borderLeft: `3px solid ${jeKriza ? C.red : accent}`, borderRadius: wide ? RADIUS.md : 0, overflow: "hidden", background: C.surface2, boxShadow: jeKriza && wide ? `0 0 0 1.5px ${tint(C.red, .5)}, 0 8px 24px ${tint(C.red, .14)}` : undefined, cursor: jeZiadost ? "pointer" : "default" }}>
      {/* médium — 16:9 na tablete/desktope; na mobile pôvodná výška 230 px */}
      <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : { height: 230 }) }}>
        <FotoPrispevku fotky={z.fotky} emoji={z.ikona} h={wide ? "100%" : 230} disableGaleria />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.34), transparent 42%)", pointerEvents: "none" }} />
        {jeKriza && <span style={{ position: "absolute", top: 10, left: 10, background: C.red, color: "#fff", fontSize: 11, fontWeight: 800, borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.sm}px`, pointerEvents: "none", boxShadow: "0 2px 10px rgba(0,0,0,.3)" }}>🔴 URGENTNÉ</span>}
        <span style={{ position: "absolute", top: 10, ...(jeKriza ? { right: 10 } : { left: 10 }), background: accent, color: "#fff", fontSize: 9.5, fontWeight: 800, borderRadius: RADIUS.lg, padding: `${SPACE.xxs}px ${SPACE.sm}px`, pointerEvents: "none" }}>{typLabel}</span>
        {z.sponzor && !jeKriza && <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(8,11,18,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#fff", fontSize: 9.5, fontWeight: 700, borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px`, pointerEvents: "none" }}>🛡 {z.sponzor.meno} · {z.sponzor.suma} €</span>}
      </div>
      {/* titul + príbeh */}
      <div style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px ${SPACE.gutter}px` }}>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35, display: "flex", alignItems: "center", gap: SPACE.xs, flexWrap: "wrap" }}>
          <span style={{ flex: "0 1 auto", minWidth: 0 }}>{z.nazov}</span>
          {z.overeny && <span style={tagChip(C.greenL)}>✓ overená</span>}
          {z.odbornik && <span style={tagChip(C.purple)}>✓ odborník</span>}
          {z.typ === "charity" && !z.sponzor && <span style={tagChip(C.gold)}>hľadá pomoc</span>}
        </div>
        {z.lok && <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, marginTop: SPACE.xs, fontSize: 12, color: C.textSec, fontWeight: 600 }}><IkonaPin size={12} color={C.textSec} />{z.lok}{z.karma ? ` · ${z.karma}` : ""}</div>}
        <div style={{ fontSize: 13.5, color: C.textSec, marginTop: SPACE.xs, lineHeight: 1.5 }}>{z.pribeh}</div>
        {jeZiadost && z.ciel ? <div style={{ marginTop: SPACE.sm }}><MoniBar vyzbierane={z.suma} ciel={z.ciel} mini /></div> : null}
      </div>
    </div>
  );
}

// ===================== DETAIL ŽIADOSTI =====================
function Detail({ z, onBack, onAutor }: { z: any; onBack: () => void; onAutor: (s: Subjekt) => void }) {
  const [platba, setPlatba] = useState<string | null>(null); // "EUR" | "DEED"
  const [suma, setSuma] = useState(z.suma);
  const [ludia, setLudia] = useState(z.ludia);
  const otvorGaleriu = useGaleria();
  const { wide } = useLayout();

  const hash = () => "0x" + Math.random().toString(16).slice(2, 8) + "…" + Math.random().toString(16).slice(2, 6);

  function posliPevne(hodnota: number, kanal: string) {
    setSuma((s: number) => s + (kanal === "SMS" ? 1 : hodnota * 0.01)); // DEED ~0,01€ ilustračne
    setLudia((l: number) => l + 1);
    toast(`Odoslané: ${hodnota} ${kanal} · ⛓ ${hash()}`);
  }
  function platbaHotova(s: number) {
    setSuma((x: number) => x + s * (platba === "EUR" ? 1 : 0.01));
    setLudia((l: number) => l + 1);
    toast(`Odoslané: ${platba === "EUR" ? s + " €" : s + " DEED"} · ⛓ ${hash()}`);
  }

  const pct = Math.min(100, Math.round(suma / z.ciel * 100));

  return (
    <div style={{ paddingBottom: SPACE.xl }}>
      <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, ...glassTmavy(18, .55), borderLeft: "none", borderRight: "none", borderTop: "none" }}>
        <span onClick={onBack} style={{ width: 32, height: 32, borderRadius: RADIUS.round, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}><IkonaSpat size={17} color={C.textSec} /></span>
        <span style={{ fontSize: 13, fontWeight: "bold", color: C.blueL, background: "rgba(91,155,255,.12)", border: `1px solid rgba(91,155,255,.3)`, borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.sm}px` }}>#47 821</span>
        <span style={{ fontSize: 11, fontWeight: "bold", color: z.sponzor ? C.gold : C.blueL }}>{z.sponzor ? "D++" : "D+"}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: SPACE.gutter, color: C.textTer }}><Zdielanie size={17} color={C.textTer} /><IkonaVlajka size={16} color={C.textTer} /></span>
      </div>

      {/* hero foto — klik = celá obrazovka, swipe medzi fotkami (16:9 na desktope) */}
      <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : {}) }}>
        <Foto src={z.fotky && z.fotky[0]} emoji="🖼" h={wide ? "100%" : 175} w={wide ? "100%" : undefined} onClick={() => z.fotky?.length && otvorGaleriu(z.fotky, 0)} />
        <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.55)", borderRadius: RADIUS.lg, padding: `${SPACE.xxs}px ${SPACE.sm}px`, fontSize: 10, color: "var(--a-green)", pointerEvents: "none", display: "inline-flex", alignItems: "center", gap: SPACE.xxs }}><IkonaFoto size={12} color="var(--a-green)" /> foto z prípadu</span>
        {z.fotky?.length > 1 && <span style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.6)", borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.xs}px`, fontSize: 10, color: "#fff", pointerEvents: "none" }}>⧉ {z.fotky.length} · klikni na foto</span>}
      </div>
      <MiniFotky fotky={z.fotky} />

      {/* meta — klik otvorí cudzí profil (§6) */}
      <div onClick={() => onAutor({ typ: "osoba", meno: z.nazov, level: z.karma || "Silver", lok: z.lok })} style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderBottom: `1px solid ${C.line2}`, display: "flex", gap: SPACE.sm, alignItems: "center", cursor: "pointer" }}>
        <Avatar src={z.avatar} emoji="👤" size={46} border={`1px solid rgba(127,203,160,.5)`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: "bold" }}>{z.nazov} {z.overeny && <span style={{ fontSize: 9, color: C.greenL, border: `1px solid rgba(127,203,160,.4)`, borderRadius: RADIUS.lg, padding: "1px 6px" }}>overená</span>}</div>
          <div style={{ marginTop: SPACE.xxs }}><span style={{ fontSize: 9, fontWeight: 700, background: "rgba(240,199,90,.12)", border: "1px solid rgba(240,199,90,.3)", color: C.gold, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>⭐ {z.karma}</span> <span style={{ fontSize: 11, color: C.textTer }}>📍 {z.lok} · 1 deň</span></div>
        </div>
        <span style={{ color: C.textTer, fontSize: 18, flex: "none" }}>›</span>
      </div>

      {/* pribeh */}
      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px ${SPACE.sm}px`, fontSize: 14, lineHeight: 1.5, color: C.text }}>{z.pribeh}</div>

      {/* D++ sponzor */}
      {z.sponzor && (
        <div style={{ margin: `0 ${SPACE.gutter}px ${SPACE.sm}px`, background: "rgba(224,169,61,.08)", border: `1px solid rgba(224,169,61,.35)`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <span style={{ background: "#fff", color: "#0B3D91", fontSize: 10, fontWeight: "bold", borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{z.sponzor.meno}</span>
          <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.4 }}>
            <b>{z.sponzor.meno} pomohol sumou {z.sponzor.suma} €</b> · D++ sponzor žiadosti<br />
            <span style={{ color: C.textTer }}>transparentná suma · ⛓ blockchain dôkaz · ESG dopad (ESRS S3)</span>
          </div>
        </div>
      )}

      {/* progres */}
      <div style={{ margin: `0 ${SPACE.gutter}px ${SPACE.md}px`, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div><span style={{ fontSize: 26, fontWeight: "bold" }}>{Math.round(suma)} €</span> <span style={{ fontSize: 13, color: C.textTer }}>z {z.ciel} €</span></div>
          <span style={{ fontSize: 16, fontWeight: "bold", color: C.greenL }}>{pct} %</span>
        </div>
        <div style={{ position: "relative", height: 12, borderRadius: RADIUS.xs, background: "rgba(var(--glass-rgb),.1)", margin: `${SPACE.sm}px 0 ${SPACE.xs}px`, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: GRAD_ZELENY, borderRadius: RADIUS.xs, transition: "width .6s ease", boxShadow: "0 0 14px rgba(43,212,155,.5)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
          <span style={{ color: C.textSec }}>👥 {ludia} ľudí pomohlo</span>
          <span style={{ color: C.greenL }}>● rastie live</span>
        </div>
      </div>

      {/* jednotná sekcia podpory */}
      <div style={{ padding: `0 ${SPACE.gutter}px ${SPACE.gutter}px` }}>
        <PodporaSekcia
          onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
          upvotes={140} onUpvote={() => toast("Palec hore")}
          onPodpor={(s: number) => posliPevne(s, "DEED")} onSms={() => posliPevne(1, "SMS")}
          onKanal={(k: string) => setPlatba(k)} />
      </div>

      {/* simulácia platby (EUR karta / DEED peňaženka) */}
      {platba && <PlatbaModal kanal={platba} komu={z.nazov} onClose={() => setPlatba(null)} onDone={platbaHotova} />}
    </div>
  );
}

function Pevne({ emoji, val, w, bg, bd, col, onClick }: { emoji: string; val: string; w: number; bg: string; bd: string; col: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ width: w, textAlign: "center", borderRadius: RADIUS.xs, background: bg, border: `1px solid ${bd}`, padding: `${SPACE.xs}px 0`, cursor: "pointer" }}>
      <div style={{ fontSize: 15 }}>{emoji}</div>
      <div style={{ fontSize: 11, fontWeight: "bold", color: col }}>{val}</div>
    </div>
  );
}

// ===================== ADD — rázcestník =====================
function Add({ onBack, onOffer, onRequest }: { onBack: () => void; onOffer: () => void; onRequest: () => void }) {
  return (
    <div>
      <Hlavicka title="Pridať" onBack={onBack} />
      <div style={{ padding: SPACE.lg }}>
        <div style={{ fontSize: 15, color: C.textSec, marginBottom: SPACE.md }}>Čo chceš spraviť?</div>
        <BigChoice emoji="🤝" title="PONÚKAM" desc="Dám svoj čas, schopnosť alebo vec — pomôžem niekomu." col={C.purple} onClick={onOffer} />
        <BigChoice emoji="🙋" title="DOPYTUJEM" desc="Niečo potrebujem — ľudskú pomoc alebo finančnú podporu." col={C.blueL} onClick={onRequest} />
      </div>
    </div>
  );
}

function BigChoice({ emoji, title, desc, col, onClick }: { emoji: string; title: string; desc: string; col: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ border: `1px solid ${col}55`, background: `${col}14`, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.gutter, cursor: "pointer" }}>
      <div style={{ fontSize: 30 }}>{emoji}</div>
      <div style={{ fontSize: 18, fontWeight: "bold", color: col, marginTop: SPACE.xs }}>{title}</div>
      <div style={{ fontSize: 13, color: C.textSec, marginTop: SPACE.xxs, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

// ===================== PONÚKAM — flow =====================
function OfferFlow({ onDone }: { onDone: () => void }) {
  const [krok, setKrok] = useState(1);
  const [typ, setTyp] = useState<string | null>(null);
  const [uroven, setUroven] = useState<string | null>(null);
  const [popis, setPopis] = useState("");

  return (
    <div>
      <Hlavicka title="Ponúkam pomoc" onBack={onDone} step={krok} total={3} />
      <div style={{ padding: SPACE.md }}>
        {krok === 1 && (
          <>
            <Otazka>Čo ponúkaš?</Otazka>
            {[["🎓", "Schopnosť / znalosť", "doučím, naučím, poradím, opravím"], ["⏱", "Čas / ruky", "sťahovanie, výpomoc, postrážim"], ["📦", "Vec", "darujem nábytok, oblečenie, náradie"]].map((t, i) => (
              <Vyber key={i} emoji={t[0]} title={t[1]} desc={t[2]} active={typ === t[1]} onClick={() => { setTyp(t[1]); setKrok(2); }} />
            ))}
          </>
        )}
        {krok === 2 && (
          <>
            <Otazka>Detail ponuky</Otazka>
            <textarea value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="Čo presne ponúkaš, kde a kedy? Napr. „Doučím matematiku ZŠ/SŠ, víkendy, online alebo u mňa.“"
              style={inp(90)} />
            <Otazka>Si v tom amatér alebo odborník?</Otazka>
            <Vyber emoji="🙂" title="Amatér" desc="Pomôžem ako viem — ide live takmer hneď." active={uroven === "amater"} onClick={() => setUroven("amater")} />
            <Vyber emoji="🎖" title="Odborník" desc="Doložím podklady (certifikát, web, prax) → vyšší vstupný status, zvyšok dvíha komunita." active={uroven === "odbornik"} onClick={() => setUroven("odbornik")} />
            <NavBtns onBack={() => setKrok(1)} onNext={() => setKrok(3)} canNext={!!(popis && uroven)} />
          </>
        )}
        {krok === 3 && (
          <>
            <Otazka>Zhrnutie</Otazka>
            <Suhrn rows={[["Typ", typ], ["Úroveň", uroven === "odbornik" ? "Odborník (doloží podklady)" : "Amatér"], ["Popis", popis]]} />
            {uroven === "odbornik" && <div style={infoBox}>Odborník: pred zverejnením doložíš podklady. AI z nich určí vstupný status karmy v odbore.</div>}
            <button onClick={onDone} style={{ ...btn("primary"), width: "100%", marginTop: SPACE.gutter }}>Zverejniť ponuku</button>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== DOPYTUJEM — flow =====================
function RequestFlow({ onDone }: { onDone: () => void }) {
  const [vetva, setVetva] = useState<string | null>(null); // 'ludska' | 'peniaze'
  const [krok, setKrok] = useState(0);
  const [preKoho, setPreKoho] = useState<string | null>(null);
  const [popis, setPopis] = useState("");
  const [suma, setSuma] = useState("");
  const [suhlas, setSuhlas] = useState(false);
  const [retaz, setRetaz] = useState("necham");

  const sumaNum = Number(suma || 0);
  const p = sumaNum ? pasmo(sumaNum) : null;

  // VÝBER VETVY
  if (!vetva) {
    return (
      <div>
        <Hlavicka title="Dopytujem" onBack={onDone} />
        <div style={{ padding: SPACE.md }}>
          <Otazka>Akú pomoc potrebuješ?</Otazka>
          <Vyber emoji="🧑‍🤝‍🧑" title="Ľudská pomoc" desc="Odvoz, sťahovanie, doučovanie, spoločníčka… (nefinančné)" onClick={() => { setVetva("ludska"); setKrok(1); }} />
          <Vyber emoji="💶" title="Finančná pomoc" desc="Potrebujem peniaze v núdzi." onClick={() => { setVetva("peniaze"); setKrok(0); }} />
        </div>
      </div>
    );
  }

  // ĽUDSKÁ POMOC (zjednodušený tok – zrkadlo ponuky)
  if (vetva === "ludska") {
    return (
      <div>
        <Hlavicka title="Ľudská pomoc" onBack={() => setVetva(null)} />
        <div style={{ padding: SPACE.md }}>
          <Otazka>Opíš, s čím potrebuješ pomôcť</Otazka>
          <textarea value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="Napr. „Potrebujem odviezť k lekárovi v stredu ráno, Sihoť → nemocnica.“" style={inp(100)} />
          <div style={infoBox}>AI posúdi relevanciu (či to nevyrieši bežná cesta) a navrhne kategóriu. Po zverejnení sa ti ozve niekto z okolia → chat → dohoda → QR na mieste.</div>
          <button onClick={onDone} disabled={!popis} style={{ ...btn(popis ? "primary" : "disabled"), width: "100%", marginTop: SPACE.gutter }}>Zverejniť dopyt</button>
        </div>
      </div>
    );
  }

  // FINANČNÁ POMOC — wizard
  const steps = ["Podmienky", "Pre koho", "Opis", "Suma", "Doklady", "Foto", "Kanál", "Potvrdenie"];
  return (
    <div>
      <Hlavicka title="Finančná pomoc" onBack={() => krok === 0 ? setVetva(null) : setKrok(krok - 1)} step={krok + 1} total={steps.length} />
      <div style={{ padding: SPACE.md }}>

        {krok === 0 && (
          <>
            <Otazka>Podmienky — prečítaj a potvrď</Otazka>
            <div style={{ ...infoBox, lineHeight: 1.5 }}>
              • Uvedené informácie musia byť <b>pravdivé</b>. Klamstvo = ban (10 rokov / doživotne) a možné právne kroky.<br /><br />
              • <b>Nepreplácame</b> žiadne náklady (notár, doklady atď.).<br /><br />
              • Žiadosť po vyhodnotení <b>nemusí byť schválená</b> (nemáš na zverejnenie nárok).<br /><br />
              • Posúdenie do <b>48 h</b>; pri pochybnosti môžeme žiadať ďalšie doklady.
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.gutter, cursor: "pointer" }}>
              <input type="checkbox" checked={suhlas} onChange={(e) => setSuhlas(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 13 }}>Rozumiem a súhlasím so všetkými podmienkami.</span>
            </label>
            <button onClick={() => setKrok(1)} disabled={!suhlas} style={{ ...btn(suhlas ? "primary" : "disabled"), width: "100%", marginTop: SPACE.md }}>Pokračovať</button>
          </>
        )}

        {krok === 1 && (
          <>
            <Otazka>Pre koho je žiadosť?</Otazka>
            <Vyber emoji="🙋" title="Pre seba" desc="KYC + môj účet." active={preKoho === "seba"} onClick={() => { setPreKoho("seba"); setKrok(2); }} />
            <Vyber emoji="👥" title="Pre iného" desc="Príjemca má účet u nás (alebo prijmem za neho, verejne uvedené)." active={preKoho === "iny"} onClick={() => { setPreKoho("iny"); setKrok(2); }} />
            <Vyber emoji="🏛" title="Cez Charitu" desc="Vysoká suma / príjemca bez účtu → zastreší partnerská charita." active={preKoho === "charita"} onClick={() => { setPreKoho("charita"); setKrok(2); }} />
          </>
        )}

        {krok === 2 && (
          <>
            <Otazka>Opíš svoj problém vlastnými slovami</Otazka>
            <textarea value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="Prečo si sa do situácie dostal, čo presne vyrieši požadovaná suma, prečo to nezvládneš inak." style={inp(130)} />
            <div style={infoBox}>AI z opisu odporučí kategóriu a pomôže s formuláciou. Pri nezmysle alebo vnútornom rozpore požiada o doplnenie.</div>
            <NavBtns onBack={() => setKrok(1)} onNext={() => setKrok(3)} canNext={popis.length > 15} />
          </>
        )}

        {krok === 3 && (
          <>
            <Otazka>Odhadovaná výška pomoci</Otazka>
            <input type="number" value={suma} onChange={(e) => setSuma(e.target.value)} placeholder="suma v €" style={{ ...inp(0), height: "auto", padding: `${SPACE.sm}px`, fontSize: 18 }} />
            {p && <div style={{ ...infoBox, borderColor: p.blok ? "rgba(226,87,75,.4)" : "rgba(93,155,232,.4)", background: p.blok ? C.redBg : "rgba(93,155,232,.08)", color: p.blok ? C.red : C.blueL }}>{p.text}</div>}
            <NavBtns onBack={() => setKrok(2)} onNext={() => setKrok(4)} canNext={sumaNum >= 100} />
          </>
        )}

        {krok === 4 && (
          <>
            <Otazka>Doklady k tvrdeniam</Otazka>
            <div style={infoBox}>AI rozloží tvoj príbeh na tvrdenia a požiada doklad ku každému (napr. úmrtný list, lekárska správa, exekučný príkaz). <b>Citlivé doklady idú len do overenia — nikdy do feedu.</b></div>
            <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs, marginTop: SPACE.sm }}>
              <DokladRow text="Lekárska správa" />
              <DokladRow text="Doklad o príjme / nájme" />
            </div>
            <NavBtns onBack={() => setKrok(3)} onNext={() => setKrok(5)} canNext={true} />
          </>
        )}

        {krok === 5 && (
          <>
            <Otazka>Foto / video k prípadu (verejné)</Otazka>
            <div style={{ height: 120, border: `1px dashed ${C.line}`, borderRadius: RADIUS.sm, display: "flex", alignItems: "center", justifyContent: "center", color: C.textTer, fontSize: 13, cursor: "pointer" }}>＋ Pridať foto alebo video</div>
            <div style={infoBox}>Foto prípadu = vyššia dôvera a väčší dosah. Bez fota = nižšia dôvera, lokálny dosah. Osobné foto (tvár) = najvyššia dôvera. Oddelené od dokladov.</div>
            <NavBtns onBack={() => setKrok(4)} onNext={() => setKrok(6)} canNext={true} />
          </>
        )}

        {krok === 6 && (
          <>
            <Otazka>Ako chceš prijímať podporu?</Otazka>
            {["DEED (wallet)", "EUR (euro na účet)", "SMS"].map((k, i) => (
              <div key={i} style={{ ...vyberBox(false), display: "flex", justifyContent: "space-between" }}>
                <span>{k}</span><span style={{ fontSize: 11, color: C.textTer }}>poplatok vopred</span>
              </div>
            ))}
            {sumaNum > 2400 && (
              <>
                <Otazka>Nad 2400 € — reťaz dobra</Otazka>
                <div style={infoBox}>Suma nad 2400 €/rok podlieha dani z príjmu. Môžeš ju zdaniť, alebo prebytok poslať ďalšiemu.</div>
                <Vyber emoji="🧾" title="Zdaním sám" desc="Prebytok si nechám, zdaním v priznaní." active={retaz === "zdanim"} onClick={() => setRetaz("zdanim")} />
                <Vyber emoji="🔗" title="Reťaz dobra" desc="Prebytok nad 2400 € pošlem ďalšiemu (sektor vyberiem teraz alebo pri naplnení)." active={retaz === "retaz"} onClick={() => setRetaz("retaz")} />
              </>
            )}
            <NavBtns onBack={() => setKrok(5)} onNext={() => setKrok(7)} canNext={true} />
          </>
        )}

        {krok === 7 && (
          <>
            <Otazka>Potvrdenie</Otazka>
            <Suhrn rows={[
              ["Pre koho", preKoho === "seba" ? "Pre seba" : preKoho === "iny" ? "Pre iného" : "Cez Charitu"],
              ["Suma", `${sumaNum} € (pásmo ${p?.kod})`],
              ["Opis", popis.slice(0, 60) + (popis.length > 60 ? "…" : "")],
            ]} />
            <div style={{ ...infoBox, marginTop: SPACE.sm }}>Potvrdzujem, že informácie sú pravdivé a doklady pravé. Rozumiem dôsledkom klamstva.</div>
            <button onClick={onDone} style={{ ...btn("primary"), width: "100%", marginTop: SPACE.gutter }}>Vytvoriť žiadosť</button>
            <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, marginTop: SPACE.xs }}>Po vytvorení: posúdenie do 48 h → schválené → live.</div>
          </>
        )}
      </div>
    </div>
  );
}
