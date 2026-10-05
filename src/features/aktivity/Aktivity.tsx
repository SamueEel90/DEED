import { Emo } from "@/components/icons";
import { cisloObjektu } from "@/lib/cisloObjektu";
import { StityRad, type StitLevel as StitLv } from "@/components/stit";
import { stityOblastiSubjektu } from "@/lib/stityOblasti";
const naStitLevelOpt = (k: string): StitLv | null => ((["Bronze", "Silver", "Gold", "Platinum", "Legend"] as string[]).includes(k) ? (k as StitLv) : null);
import { useState, useMemo, useEffect, memo } from "react";
import { FormatovanyText, RichTextInput } from "@/shared";
import { ModulHlavicka, Hlavicka, PlatobnyModul, PlatbaModal, HladanieModal, toast, Oslava, useMotiv, useLayout, useScrollPamat, useStrankaAkcie, useTvorbaGate, Ticker, StatRiadok, FiltreStat, FeedStlpce, FeedGrid, FeedCard, TypBadge, BackChip, SwipeBack, obalSiroky, OkruhVyber, Lupa, IkonaMoznosti, Zdielanie, IkonaPlay, IkonaDoska, IkonaPin, IkonaObalka, FotoPrispevku, FotoVyber, FeedSkeleton, EmptyState, ErrorState, ScreenSwitch, EntityHero, BtnAkcia, Overene, KontextMenu, IkonaOdkaz, IkonaVlajka, FotoProfiluSheet } from "@/shared";
import { FOTO_TEST_REZIM, klucEntity, useFotkyEntity } from "@/lib/fotoentity";
import { SIRKA, C, GRAD, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { pripravFeed, FEED_CFG } from "@/lib/feed";
import { MEDIA_AR } from "@/lib/cardSize";
import type { OkruhKod } from "@/types";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { A, DOM, ORDER, tint } from "./domeny";
import { pressable } from "@/components/pressable";
import { NahlasitSheet } from "@/components/nahlasit";
import { useVrstva } from "@/lib/urlnav";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import { rovnakeOkremFunkcii } from "@/lib/ui";
import { useAktivityFeed } from "@/data";
import { usePersonalizacia } from "@/lib/personalizacia";
import { useLokalita } from "@/lib/lokalita";
import { EVENTS, type AktItem } from "./mock";
import { LS, load, save, obohatit, osoba, vytvorPost, type NovyPostSpec } from "./utils";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import type { Oblast } from "@/lib/mojeSkutky";

/*
  ============================================================
  MODUL AKTIVITY — port testovacieho prototypu „DEED Aktivity"
  (nahrádza pôvodný placeholder „Výzva")
  ------------------------------------------------------------
  Domény (Šport/Art/Learn/Eko/Zdravie) + Mix · feed skutkov,
  talentov, workshopov, žiadostí a charitatívnych akcií (D++R)
  → detail (skutok/talent/case · workshop · help) · ＋ Pridať
  sprievodca · Nástenka. Vlastná farebná identita per doména.
  ============================================================
*/

// minimalistické doménové ikony (line SVG, jednofarebné — currentColor)
function DI({ children }: { children: React.ReactNode }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>{children}</svg>;
}
// doména Aktivít → oblasť skutku (Pridať skutok s predvolenou oblasťou)
const DOM_OBLAST: Record<string, Oblast> = { sport: "Šport", art: "Umenie", learn: "Učenie", eko: "Príroda", zdravie: "Zdravie" };
const DOM_IKONA: Record<string, React.ReactNode> = {
  zdravie: <DI><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /></DI>,
  learn: <DI><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" /></DI>,
  sport: <DI><circle cx="12" cy="8" r="6" /><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1" /></DI>,
  eko: <DI><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6" /></DI>,
  art: <DI><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" /><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" /></DI>,
};

// ---- spoločné štýly ----
const rowTopS: React.CSSProperties = { display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xxs };
const pfpS = (bg: string): React.CSSProperties => ({ width: 36, height: 36, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", background: bg });
const nameS: React.CSSProperties = { fontWeight: 700, fontSize: 15.5 };
const titleS: React.CSSProperties = { fontSize: 16, fontWeight: 700, lineHeight: 1.4 };
const heroGrad = (d: string) => `linear-gradient(160deg, ${DOM[d].bg} 0%, #0a0c11 100%)`;
const secLbl: React.CSSProperties = { fontSize: 11.5, letterSpacing: ".4px", color: A.txt3, fontWeight: 700, margin: `${SPACE.md}px 0 ${SPACE.xs}px` };

function Chip({ bg, c, children }: { bg: string; c: string; children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 600, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, background: bg, color: c }}>{children}</span>;
}
function Play({ big }: { big?: boolean }) {
  const s = big ? 58 : 54;
  return <span style={{ width: s, height: s, borderRadius: "50%", background: "rgba(255,255,255,.16)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", border: "1px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", paddingLeft: SPACE.xxs }}>▶</span>;
}

// ===================== MODUL =====================
export default function ModulAktivity({ wide }: { wide?: boolean }) {
  const { data: SEED_ITEMS = [] as unknown as AktItem[], isLoading, isError, refetch } = useAktivityFeed() as { data?: AktItem[]; isLoading: boolean; isError: boolean; refetch: () => void };
  const [dom, setDom] = useState(ORDER[0]); // predvolená kategória (Mix zrušený)
  const [view, setView] = useState("all"); // all | talent | workshop | help
  const [screen, setScreen] = useState("home"); // home | detail | add | board | profile
  const [aktId, setAktId] = useState<number | null>(null);
  const [profilMeno, setProfilMeno] = useState<string | null>(null); // otvorený profil osoby
  const [celeb, setCeleb] = useState<{ title: string; text: string } | null>(null);
  const [hladaj, setHladaj] = useState(false);
  const [add, setAdd] = useState<{ kind: string; d: string } | null>(null); // null = menu | { kind, d }

  // pod-obrazovka = vrstva histórie → browser Back sa vráti na feed (nie von z appky)
  useVrstva(screen !== "home", () => setScreen("home"), screen);

  // perzistentný stav (localStorage)
  const [posts, setPosts] = useState<AktItem[]>(() => load(LS.posts, [] as AktItem[]));   // používateľské príspevky
  const [liked, setLiked] = useState<Record<number, boolean>>(() => load(LS.likes, {}));   // { id: true }
  const [votes, setVotes] = useState<Record<number, string>>(() => load(LS.votes, {}));   // { id: "ok"|"no" }
  const [deltas, setDeltas] = useState<Record<number, any>>(() => load(LS.deltas, {})); // { id: { raised, helpers, support } }
  const [follows, setFollows] = useState<Record<string, boolean>>(() => load(LS.follows, {})); // { meno: true }
  const [tick, setTick] = useState<{ who: string; what: string; to: string } | null>(null); // posledná akcia → live ticker

  useEffect(() => save(LS.posts, posts), [posts]);
  useEffect(() => save(LS.likes, liked), [liked]);
  useEffect(() => save(LS.votes, votes), [votes]);
  useEffect(() => save(LS.deltas, deltas), [deltas]);
  useEffect(() => save(LS.follows, follows), [follows]);

  const celebrate = (title: string, text: string) => { setCeleb({ title, text }); setTimeout(() => setCeleb((c) => (c && c.title === title ? null : c)), 2200); };
  const { desktop } = useLayout();
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  const { svetly } = useMotiv();

  // odvodený zoznam: používateľské príspevky navrch + seed, s aplikovanými deltami
  // (podpora) a obohatené o polia pre Feed algoritmus (typ/skore/geo/dni/podpora).
  const items = useMemo(() => [...posts, ...SEED_ITEMS].map((it) => {
    const d = deltas[it.id];
    const sd = d ? {
      ...it,
      raised: (it.raised || 0) + (d.raised || 0),
      helpers: (it.helpers || 0) + (d.helpers || 0),
      supportCount: d.support || 0,
    } : it;
    return obohatit(sd);
  }), [posts, deltas, SEED_ITEMS]);

  const akt = items.find((x) => x.id === aktId);
  // aktívny accent: detail → doména položky · add → predvolená · inak vybraná doména
  const accentDom = screen === "detail" && akt ? akt.dom : screen === "add" ? (dom === "mix" ? "sport" : dom) : dom;
  const acc = DOM[accentDom];

  function pickDom(d: string) {
    setDom(d); // vždy jedna aktívna kategória (bez Mix)
    setView("all");
  }
  function pickView(v: string) { setView((x) => (x === v ? "all" : v)); }
  function open(id: number) { setAktId(id); setScreen("detail"); }
  function openPerson(name: string) { if (!name) return; setProfilMeno(name); setScreen("profile"); }
  function home() { setScreen("home"); }

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  useScrollPamat(screen); // pamäť scrollu — „Späť" obnoví pozíciu feedu (nie skok hore)

  function like(id: number) { setLiked((l) => ({ ...l, [id]: !l[id] })); }
  function toggleFollow(name: string) {
    setFollows((f) => ({ ...f, [name]: !f[name] }));
    setTick({ who: "Ty", what: (follows[name] ? "prestal(a) sledovať" : "práve začal(a) sledovať"), to: name });
  }

  function support(amt: number, komu: string, it?: AktItem) {
    if (it && it.type === "case") {
      setDeltas((dd) => {
        const cur = dd[it.id] || {};
        const room = Math.max(0, (it.goal || 0) - (it.raised || 0)); // it.raised už obsahuje predošlé delty
        const add = Math.max(0, Math.min(amt, room));               // nepresiahne cieľ
        return { ...dd, [it.id]: { raised: (cur.raised || 0) + add, helpers: (cur.helpers || 0) + 1, support: (cur.support || 0) + 1 } };
      });
    } else if (it) {
      setDeltas((dd) => { const cur = dd[it.id] || {}; return { ...dd, [it.id]: { ...cur, support: (cur.support || 0) + 1 } }; });
    }
    setTick({ who: "Ty", what: `práve podporil(a) ${amt} DeeD →`, to: komu });
    celebrate(amt >= 100 ? "Skvelé! Veľká podpora!" : "Ďakujeme!", `Tvoja podpora ${amt} DeeD letí k ${komu}. Reťaz dobra pokračuje.`);
  }

  function vote(id: number, kind: string) {
    setVotes((v) => {
      if (v[id]) return v; // už hlasoval — žiadna zmena
      return { ...v, [id]: kind };
    });
  }

  function createPost(spec: NovyPostSpec) {
    const post = vytvorPost(spec);
    setPosts((p) => [post, ...p]);
    setTick({ who: "Ty", what: post.type === "help" ? "práve zverejnil(a) žiadosť" : post.type === "workshop" ? "práve vytvoril(a) workshop" : "práve pridal(a) skutok", to: "" });
    setView("all"); // nový post sa zobrazí navrchu feedu (Mix aj jeho doména)
    return post;
  }

  return (
    <div style={{
      minHeight: "100%", position: "relative", color: A.txt,
      background: svetly ? "var(--c-bg)" : acc.tint, transition: "background .4s ease",
      ["--acc"]: acc.c, ["--accBg"]: tint(acc.c, .15), ["--accBd"]: tint(acc.c, .5),
    } as React.CSSProperties}>
      <ScreenSwitch k={screen}>
      {screen === "home" && <Home {...{ items, dom, view, pickDom, pickView, toast, open, openPerson, setScreen, tick, wide, isLoading, isError, refetch, onHladaj: () => setHladaj(true) }} />}
      {screen === "detail" && akt && obal(<SwipeBack onBack={home}><Detail {...{ it: akt, liked, like, support, votes, vote, toast, celebrate, home, openPerson, setScreen }} /></SwipeBack>)}
      {screen === "add" && obal(<Add {...{ dom, add, setAdd, toast, celebrate, home, createPost }} />)}
      {screen === "board" && obal(<Board {...{ dom, toast, home }} />)}
      {screen === "profile" && profilMeno && obal(<OsobaProfil {...{ name: profilMeno, items, follows, toggleFollow, onOpen: open, toast, home }} />)}
      </ScreenSwitch>

      {hladaj && (
        <HladanieModal akcent={acc.c} placeholder="Hľadať aktivity, workshopy, lektorov…"
          data={items.map((it) => ({
            id: it.id, titul: it.title, podtitul: `${it.author} · ${it.loc || DOM[it.dom].label}`, kat: DOM[it.dom].label, emoji: it.emoji,
            tag: it.type === "talent" ? "Iskra" : it.type === "workshop" ? "Workshop" : it.type === "help" ? "Žiadosť" : DOM[it.dom].label,
          }))}
          onPick={(id: number) => open(id)}
          toast={toast} defaultFilter="Udalosti"
          onClose={() => setHladaj(false)} />
      )}

      {celeb && <Oslava title={celeb.title} text={celeb.text} onClose={() => setCeleb(null)} />}
    </div>
  );
}

// ===================== HOME =====================
function Home({ items, dom, view, pickDom, pickView, toast, open, openPerson, setScreen, tick, wide, isLoading, isError, refetch, onHladaj }: any) {
  // zvolený rádius — Feed algoritmus (Časť B)
  const [radius, setRadius] = useState<OkruhKod>("stvrt");
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const { desktop } = useLayout();
  const { sledovaniMena } = usePersonalizacia(); // afinita: LEN sledovaní → re-rank (témy feed nečíta, v1.1 kánon)
  const lok = useLokalita(); // stred feedu = aktívne mesto

  // 1) UI predfilter (doména + sub-záložka) — to engine nerieši
  const list = items.filter((it: AktItem) => {
    if (it.dom !== dom) return false;
    if (view === "talent") return it.type === "talent";
    if (view === "workshop") return it.type === "workshop";
    if (view === "help") return it.type === "help";
    return true;
  });

  // 2) Feed algoritmus na seed obsah; vlastné čerstvé príspevky držíme navrchu
  //    (optimistické UI — používateľ hneď vidí, čo pridal, mimo prahu okruhu).
  const feed = [
    ...list.filter((it: AktItem) => it.mine),
    ...pripravFeed(list.filter((it: AktItem) => !it.mine), { lat: lok.lat, lng: lok.lng, radius, sledovani: sledovaniMena }),
  ];

  // dvojstĺpcový feed (skutky vľavo / žiadosti vpravo) iba v zmiešanom zobrazení na tablete/PC
  const dva = wide && view === "all";
  const feedCard = (it: AktItem) => <AktCard key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;

  // karta feedu na desktope/tablete — bordered 16:9 (do masonry mriežky / stĺpcov)
  const boardCard = (it: AktItem) => <AktCard key={it.id} it={it} wide onOpen={open} onPerson={openPerson} />;

  // štýl položky menu — kategória (Zdravie/Learn/Šport/Eko/Art), theme-aware cez DOM[d].c
  const menuStyle = (d: string, on: boolean): React.CSSProperties => ({ flex: "1 1 0", minWidth: 72, display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, height: 40, borderRadius: RADIUS.sm, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: on ? tint(DOM[d].c, .15) : A.surface, border: `1px solid ${on ? tint(DOM[d].c, .5) : A.line2}`, color: on ? DOM[d].c : A.txt2 });

  // HLAVNÉ MENU STRÁNKY — kategórie (Zdravie/Learn/Šport/Eko/Art).
  // Vždy je aktívna práve jedna kategória; jej obsah sa zobrazí vo feede.
  const filterBar = (
    <div style={{ padding: `0 ${SPACE.md}px ${SPACE.xs}px` }}>
      <div style={{ display: "flex", gap: SPACE.xs, overflowX: "auto" }}>
        {ORDER.map((d) => {
          const on = dom === d;
          return (
            <div key={d} {...pressable(() => pickDom(d), `Kategória ${DOM[d].label}`)} aria-pressed={on} style={menuStyle(d, on)}>
              <span style={{ display: "flex", color: on ? DOM[d].c : A.txt2 }}>{DOM_IKONA[d]}</span>
              {DOM[d].label}
            </div>
          );
        })}
      </div>
    </div>
  );

  // kontextové akcie stránky → plávajúce „+ Pridať" dole + sekcia „Na tejto stránke" (Talent/Nástenka) v ☰
  useStrankaAkcie(() => ({
    pridat: { id: "add", label: "Pridať", onClick: () => setScreen("add") },
    extra: [
      { id: "talent", label: "Ukáž svoj talent", popis: "Tvorivé skutky a talenty", ikona: <IkonaPlay size={18} color="var(--a-green)" />, onClick: () => pickView("talent") },
      { id: "board", label: "Nástenka", popis: "Skutky a výzvy v okolí", ikona: <IkonaDoska size={18} color="var(--a-green)" />, onClick: () => setScreen("board") },
    ],
  }), [dom, view]);

  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      {/* header — jednotná hlavička (logo D⁺ + názov) */}
      <ModulHlavicka title="Aktivity" karma="Aktivity · Silver"
        right={
          <>
            <span {...pressable(onHladaj, "Hľadať")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={A.txt2} /></span>
            <Zvoncek color={A.txt2} toast={toast} />
          </>
        } />

      {/* live ticker — odráža poslednú reálnu akciu */}
      <Ticker>
        {tick
          ? <>{tick.who} <b style={{ color: C.greenL }}>{tick.what}</b>{tick.to ? ` ${tick.to}` : ""}</>
          : <>Cyklo TN <b style={{ color: C.greenL }}>práve dostal 100 DeeD</b> → Marek</>}
      </Ticker>

      {/* filter hore na stránke + štatistický riadok — na desktope na jednom riadku */}
      <FiltreStat filtre={filterBar}
        stat={
          <StatRiadok inline={desktop} pocet={feed.length} jednotka="aktivít" mesiac="9 480"
            okruh={FEED_CFG.radiusy[radius].krat} onOkruh={() => setVyberOkruh(true)} />
        }
      />

      {/* feed — vybraná kategória z menu. Desktop: masonry mriežka zľava (ako Domov/Charita) · mobil: 1/2 stĺpce */}
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <FeedSkeleton count={4} />
      ) : !feed.length ? (
        <EmptyState emoji={<Emo e="✨" />} title="Zatiaľ tu nič nie je" text="V tejto kategórii zatiaľ nie sú príspevky." />
      ) : desktop ? (
        <FeedGrid cols={3} cards={feed.map(boardCard)} />
      ) : (
        <FeedStlpce wide={dva}
          labelSkutky="Skutky & aktivity" labelZiadosti="Hľadajú pomoc"
          jednoStlpec={feed.map(feedCard)}
          skutky={feed.filter((it: AktItem) => it.type !== "help").map(feedCard)}
          ziadosti={feed.filter((it: AktItem) => it.type === "help").map(feedCard)} />
      )}

      {vyberOkruh && <OkruhVyber radius={radius} akcent={DOM[dom].c}
        onPick={(r: string) => { setRadius(r as OkruhKod); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}

// ---- karty ----
function Wb({ bg, c, children }: { bg: string; c: string; children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, background: bg, color: c }}>{children}</span>;
}

// JEDNOTNÁ karta = zdieľaná FeedCard (rovnaká anatómia ako Domov/Help/Charita);
// Aktivity mapujú skutok/talent/workshop/žiadosť/charitu do slotov.
// memo: re-render len pri zmene položky/wide (inline onOpen/onPerson sa ignorujú)
// Aktivity typ → jednotné rozdelenie appky (Skutok/Žiadosť/Ponuka/Charita)
const AKT_TYP = { skutok: "skutok", talent: "skutok", workshop: "ponuka", help: "ziadost", case: "charita" } as const;

const AktCard = memo(AktCardBase, rovnakeOkremFunkcii);
function AktCardBase({ it, wide, onOpen, onPerson }: any) {
  const a = DOM[it.dom];
  const jeHelp = it.type === "help";
  const jeCase = it.type === "case";
  const jeWorkshop = it.type === "workshop";
  const accent = jeHelp ? A.red : a.c;
  return (
    <FeedCard wide={wide} onClick={() => onOpen(it.id)} label={it.title} typ={AKT_TYP[it.type as keyof typeof AKT_TYP]}
      accent={jeHelp ? A.red : undefined}
      autor={{
        meno: it.author, pfp: it.pfp, ini: it.ini, lok: it.loc || a.label, karma: it.karma, cas: it.time, glow: accent,
        onClick: () => onPerson(it.author),
        chips: it.verified ? <Overene size={15} label="Overené komunitou" /> : undefined,
      }}
      media={{
        fotky: it.fotky?.length ? it.fotky : undefined,
        play: it.media === "video",
        emoji: it.media === "kreslene" ? "✎" : it.emoji,
        grad: heroGrad(it.dom), h: 250,
        overlay: (
          // typ (Skutok/Ponuka/Žiadosť/Charita) rieši FeedCard vľavo hore;
          // doménový štítok (Šport/Umenie/…) aj „★ importance" odstránené
          undefined
        ),
      }}
      predTitulom={jeWorkshop ? (
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, flexWrap: "wrap", marginBottom: SPACE.xs }}>
          <Wb bg={it.price === "free" ? A.greenBg : A.goldBg} c={it.price === "free" ? A.green : A.gold}>{it.price === "free" ? "ZADARMO" : it.priceTxt}</Wb>
          {it.b2b && <Wb bg={A.blueBg} c={A.blue}>B2B · audit</Wb>}
          {it.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}
        </div>
      ) : undefined}
      title={it.title}
      progress={jeCase ? { vyzbierane: it.raised, ciel: it.goal } : undefined}
      footer={
        <>
          {jeCase && <div style={{ fontSize: 10, color: A.txt3, marginTop: SPACE.xxs }}>{it.drr} % ide priamo príjemcovi</div>}
          {jeHelp && <div style={{ fontSize: 12.5, marginTop: SPACE.xs, fontWeight: 600, color: A.red }}>❓ Hľadám pomoc · <span style={{ color: A.txt3, fontWeight: 400 }}>{it.helpers} sa zapojilo</span></div>}
          {jeWorkshop && <div style={{ fontSize: 11.5, color: A.txt3, marginTop: SPACE.xs }}>★ {it.rating} · {it.seats} miest{it.loc ? ` · ${it.loc}` : ""}</div>}
        </>
      }
    />
  );
}

// ===================== DETAIL =====================
// jednotná hlavička pod-obrazoviek (rovnaká ako vo zvyšku appky)
function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return <Hlavicka title={title} onBack={onBack} />;
}
// `children` = len TAGY (doména/cena/„hľadám pomoc"). Placeholder (emoji/gradient) sa
// pri chýbajúcej fotke NEzobrazuje — príspevok je čisto textový (tenká lišta + tagy v toku).
// ⋯ = kontextové menu príspevku (zdieľať / kopírovať odkaz / nahlásiť) — jednotné v celej appke.
function DetailHero({ it, onBack, children }: { it: AktItem; onBack: () => void; children?: React.ReactNode }) {
  const { wide } = useLayout();
  const [menu, setMenu] = useState(false);
  const [nahlasit, setNahlasit] = useState(false);
  const maFoto = !!(it.fotky && it.fotky.length);
  const menuBtn = (hero: boolean) => (
    <div {...pressable(() => setMenu(true), "Ďalšie možnosti")} style={{ width: 34, height: 34, borderRadius: "50%", cursor: "pointer",
      background: hero ? "rgba(0,0,0,.55)" : "rgba(var(--glass-rgb),.06)", border: hero ? "none" : `1px solid ${A.line}`,
      display: "flex", alignItems: "center", justifyContent: "center", color: hero ? "#fff" : A.txt2 }}>
      <IkonaMoznosti size={18} color={hero ? "#fff" : A.txt2} />
    </div>
  );
  const overlaye = (
    <>
      {menu && (
        <KontextMenu onClose={() => setMenu(false)} polozky={[
          { ikona: <Zdielanie size={17} />, label: "Zdieľať príspevok", onClick: () => void zdielaj({ titul: it.title, text: it.title, url: aktualnaUrl() }, toast) },
          { ikona: <IkonaOdkaz size={17} />, label: "Kopírovať odkaz", onClick: async () => { try { await navigator.clipboard.writeText(aktualnaUrl()); toast("Odkaz skopírovaný"); } catch { void zdielaj({ titul: it.title, text: it.title, url: aktualnaUrl() }, toast); } } },
          { ikona: <IkonaVlajka size={16} />, label: "Nahlásiť obsah", danger: true, onClick: () => setNahlasit(true) },
        ]} />
      )}
      {nahlasit && <NahlasitSheet co={it.title} refId={String(it.id)} modul="aktivity" onClose={() => setNahlasit(false)} toast={toast} />}
    </>
  );
  if (!maFoto) {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
          <BackChip onBack={onBack} />
          {menuBtn(false)}
        </div>
        {children && <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs, padding: `0 ${SPACE.md}px ${SPACE.xs}px` }}>{children}</div>}
        {overlaye}
      </>
    );
  }
  return (
    <>
      {/* lišta nad fotkou — Späť a možnosti rovnako ako všade (nie na fotke) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
        <BackChip onBack={onBack} />
        {menuBtn(false)}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.dom), ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : { height: 150 }) }}>
        <div style={{ position: "absolute", inset: 0 }}><FotoPrispevku fotky={it.fotky} h="100%" disableGaleria prednost alt={it.title} /></div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.42), transparent 46%)", pointerEvents: "none" }} />
        {it.media === "video" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}><Play big /></div>}
        {children && <div style={{ position: "absolute", bottom: 12, left: 14, right: 14, zIndex: 2, display: "flex", flexWrap: "wrap", gap: SPACE.xs }}>{children}</div>}
      </div>
      {overlaye}
    </>
  );
}
function Detail({ it, liked, like, support, votes, vote, toast, celebrate, home, openPerson }: any) {
  if (it.type === "workshop") return <WorkshopDetail it={it} toast={toast} celebrate={celebrate} home={home} openPerson={openPerson} />;
  if (it.type === "help") return <HelpDetail it={it} toast={toast} celebrate={celebrate} home={home} openPerson={openPerson} />;
  return <DeedDetail it={it} liked={liked} like={like} support={support} votes={votes} vote={vote} toast={toast} home={home} openPerson={openPerson} />;
}

/** detail skutku — ten istý vo feede Aktivít aj na verejných profiloch (kronika, roky).
 *  5. 10.: bezPodpory = staré roky (bez drobnej podpory a darov, ostane Zdieľať a Páči sa mi);
 *  it.split = komu išla podpora („Podpora išla: …"), bez splitu sa riadok neukáže; it.pomahali = kto pomáhal (profil charity). */
export function DeedDetail({ it, support, votes, vote, toast, home, openPerson, bezPodpory = false }: any) {
  const a = DOM[it.dom];
  const [platba, setPlatba] = useState<string | null>(null); // "EUR" | "DEED"
  const isTalent = it.type === "talent", isCase = it.type === "case";
  const pct = isCase ? Math.min(100, Math.round(it.raised / it.goal * 100)) : 0;
  const supLabel = isTalent ? "OCEŇ TVORCU — klik a hneď odíde" : isCase ? "PRIDAJ SA K MAREKOVI" : "DROBNÁ PODPORA — klik a hneď odíde";
  // overovanie skutku — základ + tvoj hlas
  const myVote = votes[it.id];
  const okCount = (it.mine ? 0 : 4 + ((it.id * 3) % 9)) + (myVote === "ok" ? 1 : 0);
  const noCount = (it.mine ? 0 : (it.id * 2) % 3) + (myVote === "no" ? 1 : 0);

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <DetailHero it={it} onBack={home}>
        <TypBadge typ={AKT_TYP[it.type as keyof typeof AKT_TYP]} inline />
      </DetailHero>
      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px` }}>
        <div onClick={() => openPerson(it.author)} style={{ ...rowTopS, cursor: "pointer" }}>
          <div style={pfpS(it.pfp)}>{it.ini}</div>
          <div>
            <div style={{ ...nameS, display: "flex", alignItems: "center", gap: SPACE.xs }}>{it.author} <span style={{ color: C.textTer, fontSize: 13 }}>›</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, fontSize: 12, color: A.txt2, marginTop: 1 }}><IkonaPin size={12} color={A.txt2} />{it.loc}</div>
          </div>
          {it.verified && <span style={{ marginLeft: "auto", display: "inline-flex" }}><Overene size={15} label="Overené komunitou" /></span>}
        </div>
        <div style={{ ...titleS, marginTop: SPACE.sm, fontSize: 14 }}>{it.title}</div>
        <FormatovanyText text={it.desc} style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: SPACE.xs, color: A.txt2 }} />
        {it.pomahali && <div style={{ fontSize: 13.5, marginTop: SPACE.xs, color: A.txt2 }}>Pomáhali: <b style={{ color: A.txt }}>{it.pomahali}</b></div>}
        {it.split?.length > 0 && <div style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: SPACE.xs, color: A.txt2 }}>Podpora išla: <b style={{ color: A.txt }}>{it.split.map((s: { komu: string; pct: number }) => `${s.komu} ${s.pct} %`).join(" · ")}</b></div>}

        {isCase && (
          <div style={{ textAlign: "center", padding: SPACE.sm, background: A.surface2, border: `1px solid ${a.bd}`, borderRadius: RADIUS.sm, marginTop: SPACE.xs }}>
            <b style={{ fontSize: 22, color: a.c }}>{it.raised.toLocaleString("sk")} €</b> <span style={{ color: A.txt2 }}>z {it.goal.toLocaleString("sk")} € ({pct}%)</span>
            <div style={{ height: 6, background: "rgba(var(--glass-rgb),.12)", borderRadius: 99, marginTop: SPACE.xs, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99, transition: "width .4s ease" }} /></div>
            <div style={{ fontSize: 10, color: A.gold, marginTop: SPACE.xs, fontWeight: 700 }}>{it.drr} % z tvojho daru ide Marekovi · overené</div>
            {it.supportCount > 0 && <div style={{ fontSize: 10.5, color: A.green, marginTop: SPACE.xs, fontWeight: 700 }}>✓ Ty si prispel(a) {it.supportCount}× · ďakujeme</div>}
          </div>
        )}

        <PlatobnyModul
          onShare={() => zdielaj({ titul: it.title, text: it.title, url: aktualnaUrl() }, toast)}
          upvotes={Math.floor((it.likes || 0) / 3)} onUpvote={() => toast("Páči sa ti to")}
          onPodpor={(s: number) => support(s, it.author, it)}
          onKanal={(k: string) => setPlatba(k)} supLabel={supLabel} bezDaru={bezPodpory} bezOblubenych={bezPodpory}
          oblubene={{ refId: it.id, typ: isCase ? "ziadost" : isTalent ? "talent" : "skutok", modul: "aktivity", nazov: it.title, lok: it.loc }} toast={toast}
          qr={bezPodpory ? undefined : { label: `QR ${isCase ? "tejto akcie" : isTalent ? "tejto Iskry" : "tohto skutku"}`, popis: "Zväčšiť · kopírovať · zdieľať", cta: "Zdieľať", onClick: () => zdielaj({ titul: it.title, text: it.title, url: aktualnaUrl() }, toast) }} />

        <div style={{ textAlign: "center", fontSize: 10, color: A.txt3, marginTop: SPACE.md }}>
          {myVote ? (myVote === "ok" ? "Označil(a) si tento skutok ako overený. Ďakujeme." : "Podal(a) si námietku — preverí ju AI + komunita.") : "Bol si pri tom? Komunita preveruje skutky."}
        </div>
        <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.gutter }}>
          <Vbtn ok count={okCount} mine={myVote === "ok"} dim={myVote === "no"} onClick={() => {
            if (myVote) return toast("Už si hlasoval(a) o tomto skutku");
            vote(it.id, "ok"); toast("Ďakujeme — tvoje overenie dvíha dôveryhodnosť");
          }} />
          <Vbtn count={noCount} mine={myVote === "no"} dim={myVote === "ok"} onClick={() => {
            if (myVote) return toast("Už si hlasoval(a) o tomto skutku");
            vote(it.id, "no"); toast("Námietka odoslaná — preverí ju AI + overenie");
          }} />
        </div>
      </div>
      {platba && <PlatbaModal kanal={platba} komu={it.author} onClose={() => setPlatba(null)}
        onDone={(s: number) => support(s, it.author, it)} />}
    </div>
  );
}

function WorkshopDetail({ it, toast, celebrate, home, openPerson }: any) {
  const free = it.price === "free";
  const [platba, setPlatba] = useState<string | null>(null); // "EUR" | "DEED"
  // cena zo štítku: "25 €" → 25; "firemné"/"zdarma" → 0. €-cena = individuálna platba (karta / SEPA).
  const cenaEur = free ? 0 : Number(String(it.priceTxt || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const platena = cenaEur > 0;
  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <DetailHero it={it} onBack={home}>
        <Wb bg={free ? A.greenBg : A.goldBg} c={free ? A.green : A.gold}>{free ? "ZADARMO" : it.priceTxt}</Wb>
        {it.b2b && <Wb bg={A.blueBg} c={A.blue}>B2B · audit S1</Wb>}
      </DetailHero>
      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px` }}>
        <div style={{ ...titleS, fontSize: 15 }}>{it.title}</div>
        <FormatovanyText text={it.desc} style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: SPACE.xs, color: A.txt2 }} />

        <div onClick={() => openPerson(it.author)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginTop: SPACE.gutter, cursor: "pointer" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#fff", flex: "none", background: it.pfp }}>{it.ini}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: SPACE.xs }}>{it.author} {it.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}</div>
            <div style={{ fontSize: 12, color: A.txt3 }}>{it.karma || "lektor"} · ★ {it.rating} hodnotenie · otvoriť profil</div>
          </div>
          <span style={{ color: C.textTer }}>›</span>
        </div>

        <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.sm }}>
          <Dr b={it.time.split(" ")[0] || "—"} t="termín" />
          <Dr b={it.loc.includes("online") ? "online" : "naživo"} t="forma" />
          <Dr b={it.seats} t="voľných miest" />
        </div>

        <InfoBox>{!free
          ? <><b style={{ color: A.txt }}>3 QR dochádzka</b> — štart / 60 % / koniec. {it.b2b ? "Povinné = audit dôkaz pre firmu (ESRS S1). Zamestnanec má priradenú firmu, účasť sa jej započíta." : "Pri platenom = overená účasť + karma."} Lektor a platený účastník = KYC.</>
          : "Voľný komunitný workshop — bez 3 QR a bez auditu (obsah/kvalitu nepoznáme). Pozeraj čo ťa zaujíma."}</InfoBox>

        {it.profi && (<><div style={secLbl}>ĎALŠIE OD LEKTORA</div>
          <div onClick={() => toast("Ďalšie workshopy lektora")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: A.surface, border: `1px solid ${A.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, fontSize: 13, cursor: "pointer" }}><span>📚 Ďalšie 2 workshopy · profil</span><span style={{ color: C.textTer }}>›</span></div></>)}

        <Btn onClick={() => {
          if (platena) { setPlatba("EUR"); return; } // platený workshop → reálna platba (karta / SEPA prevod)
          celebrate("Prihlásené!", free ? "Uvidíme sa na workshope. Pri štarte naskenuj QR." : "Pri štarte naskenuj QR (3 QR: štart / 60 % / koniec)."); setTimeout(home, 1700);
        }}>{free ? "Prihlásiť sa" : platena ? "Prihlásiť a zaplatiť · " + it.priceTxt : "Prihlásiť · " + it.priceTxt}</Btn>
        <div style={{ textAlign: "center", padding: `${SPACE.gutter}px ${SPACE.md}px 0`, fontSize: 11, color: A.txt3 }}>{free ? "Zadarmo · základné prihlásenie." : platena ? "Platba kartou alebo SEPA prevodom · " + it.priceTxt : "Fakturácia firme · " + it.priceTxt}</div>
      </div>
      {/* platený workshop → simulácia platby (EUR karta / SEPA prevod), suma predvyplnená cenou */}
      {platba && <PlatbaModal kanal={platba} komu={it.author} suma={cenaEur} onClose={() => setPlatba(null)}
        onDone={() => { setPlatba(null); celebrate("Prihlásené a zaplatené!", "Pri štarte naskenuj QR (3 QR: štart / 60 % / koniec)."); setTimeout(home, 1700); }} />}
    </div>
  );
}

function HelpDetail({ it, toast, celebrate, home, openPerson }: any) {
  const { gate } = useTvorbaGate(); // „Môžem pomôcť" otvára chat = create
  const [platba, setPlatba] = useState<string | null>(null); // "EUR" | "DEED" — pomôcť sa dá aj peniazmi (karta / SEPA / peňaženka)
  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <DetailHero it={it} onBack={home}>
        <TypBadge typ="ziadost" inline />
      </DetailHero>
      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px` }}>
        <div onClick={() => openPerson(it.author)} style={{ ...rowTopS, cursor: "pointer" }}>
          <div style={pfpS(it.pfp)}>{it.ini}</div>
          <div><div style={{ ...nameS, display: "flex", alignItems: "center", gap: SPACE.xs }}>{it.author} <span style={{ color: C.textTer, fontSize: 13 }}>›</span></div><div style={{ fontSize: 12, color: A.txt3 }}>{it.loc} · {cisloObjektu("S", String(it.id))}</div></div>
        </div>
        <div style={{ ...titleS, marginTop: SPACE.sm, fontSize: 14 }}>{it.title}</div>
        <FormatovanyText text={it.desc} style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: SPACE.xs, color: A.txt2 }} />
        <InfoBox>{it.helpers} ľudí sa už zapojilo. Po prijatí sa otvorí chat, dohodnete sa. Po dokončení: hodnotenie + tip + reťaz dobra.</InfoBox>
        <Btn green onClick={gate(() => { celebrate("Ozval si sa!", `Otvorili sme chat s ${it.author}. Dohodnite si detaily.`); setTimeout(home, 1700); })}>✋ Môžem pomôcť</Btn>
        {/* podpora — pomôcť sa dá aj peniazmi (karta / SEPA prevod / peňaženka), nielen časom */}
        <PlatobnyModul
          onShare={() => zdielaj({ titul: it.title, text: it.title, url: aktualnaUrl() }, toast)}
          upvotes={it.helpers || 0} onUpvote={() => toast("Páči sa ti to")}
          onPodpor={(s: number) => toast(`Ďakujeme za ${s} DeeD pre ${it.author}`)}
          onKanal={(k: string) => setPlatba(k)} supLabel="PODPORIŤ — klik a hneď odíde"
          oblubene={{ refId: it.id, typ: "ziadost", modul: "aktivity", nazov: it.title, lok: it.loc }} toast={toast}
          qr={{ label: "QR tejto žiadosti", popis: "Zväčšiť · kopírovať · zdieľať", cta: "Zdieľať", onClick: () => zdielaj({ titul: it.title, text: it.title, url: aktualnaUrl() }, toast) }} />
      </div>
      {/* simulácia platby (EUR karta / SEPA prevod / DEED peňaženka) */}
      {platba && <PlatbaModal kanal={platba} komu={it.author} onClose={() => setPlatba(null)}
        onDone={(s: number) => { setPlatba(null); toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DeeD"} · ${it.author}`); }} />}
    </div>
  );
}

// ---- detail helpery ----
function InfoBox({ children }: { children: React.ReactNode }) {
  return <div style={{ background: A.surface2, border: `1px solid ${A.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginTop: SPACE.gutter, fontSize: 11.5, color: A.txt2, lineHeight: 1.5 }}>{children}</div>;
}
function Cbtn({ ic, t, s, tCol, active, onClick }: any) {
  return (
    <div onClick={onClick} style={{ flex: 1, height: 50, borderRadius: RADIUS.sm, background: active ? "var(--accBg)" : A.surface2, border: `${active ? 2 : 1}px solid ${active ? "var(--accBd)" : A.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .12s ease" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: tCol || A.txt, display: "flex", alignItems: "center", gap: SPACE.xs }}>{ic}{t}</div><div style={{ fontSize: 10, color: A.txt3, marginTop: SPACE.xxs }}>{s}</div>
    </div>
  );
}
function Dr({ b, t }: { b: React.ReactNode; t: string }) {
  return <div style={{ flex: 1, textAlign: "center", background: A.surface, border: `1px solid ${A.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px` }}><b style={{ fontSize: 14 }}>{b}</b><div style={{ fontSize: 9, color: A.txt3, marginTop: SPACE.xxs }}>{t}</div></div>;
}
function Vbtn({ ok, count = 0, mine, dim, onClick }: any) {
  return (
    <div onClick={onClick} style={{ flex: 1, height: 62, borderRadius: RADIUS.sm, display: "flex", alignItems: "center", gap: SPACE.sm, paddingLeft: SPACE.md, cursor: "pointer", opacity: dim ? 0.5 : 1, background: ok ? A.greenBg : A.redBg, border: `${mine ? 2 : 1}px solid ${ok ? A.greenBd : A.redBd}`, transition: "opacity .15s ease" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, background: ok ? "rgba(31,191,143,.22)" : "rgba(242,112,111,.22)", color: ok ? A.green : A.red }}>{ok ? "✓" : "✕"}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1, color: ok ? A.green : A.red }}>{mine ? (ok ? "Overené ✓" : "Namietané") : (ok ? "Overujem" : "Namietam")}</div>
        <div style={{ fontSize: 9.5, color: A.txt3 }}>{count} {ok ? "overení" : "námietok"}</div>
      </div>
    </div>
  );
}
// primárne CTA — rovnaký aurora/zelený gradient ako vo zvyšku appky
function Btn({ children, green, onClick }: { children: React.ReactNode; green?: boolean; onClick?: () => void }) {
  const base: React.CSSProperties = { width: "100%", height: 50, borderRadius: RADIUS.md, color: "#fff", fontWeight: 700, fontSize: 15.5, cursor: "pointer", marginTop: SPACE.md, fontFamily: "inherit", border: "none", transition: "transform .12s ease, box-shadow .25s ease" };
  const styl = green
    ? { ...base, background: GRAD_ZELENY, boxShadow: "0 8px 26px rgba(31,191,143,.32), inset 0 1px 0 rgba(255,255,255,.25)" }
    : { ...base, background: GRAD, boxShadow: "0 8px 26px color-mix(in srgb, var(--a-green) 32%, transparent), inset 0 1px 0 rgba(255,255,255,.25)" };
  return <button onClick={onClick} style={styl}>{children}</button>;
}

// ===================== ＋ PRIDAŤ =====================
function Add({ dom, add, setAdd, toast, celebrate, home, createPost }: any) {
  const d = dom === "mix" ? "sport" : dom;
  const a = DOM[d];
  const pill = (extra?: React.CSSProperties): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: SPACE.xs, fontSize: 11, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, marginBottom: SPACE.xs, background: a.bg, color: a.c, border: `1px solid ${a.bd}`, ...extra });

  if (add) return <AddForm kind={add.kind} d={d} a={a} pill={pill} setAdd={setAdd} toast={toast} celebrate={celebrate} home={home} createPost={createPost} />;

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackBar title="Pridať" onBack={home} />
      <div style={{ padding: SPACE.md }}>
        <div style={pill()}>{a.ic} doména: {a.label} {dom === "mix" ? "(predvolené — zmeň na Domove)" : "(predvyplnené)"}</div>
        <h2 style={{ fontSize: 18, margin: `${SPACE.xxs}px 0` }}>Čo chceš pridať?</h2>
        <div style={{ fontSize: 12, color: A.txt3 }}>Predvyplníme doménu, aby si klikal čo najmenej.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm, marginTop: SPACE.md }}>
          <Ch ic={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--a-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>} t="Pridať skutok" s="spravil som niečo dobré (zabehol, zasadil, pomohol, vytvoril)" onClick={() => otvorPridatSkutok({ oblast: DOM_OBLAST[d] ?? "Šport" })} />
          <Ch ic="🎓" t="Pridať školenie / workshop" s="ponúkam pomoc — učím, vediem, školím" onClick={() => setAdd({ kind: "skolenie", d })} />
          <Ch ic="❓" t="Hľadám pomoc" s="potrebujem mentora, parťáka, dobrovoľníkov" onClick={() => setAdd({ kind: "help", d })} />
        </div>
      </div>
    </div>
  );
}

function AddForm({ kind, d, a, pill, setAdd, toast, celebrate, home, createPost }: any) {
  const isSkol = kind === "skolenie";
  const [text, setText] = useState("");
  const [fotky, setFotky] = useState<string[]>([]); // vybrané foto (data URL, náhľad) → na kartu príspevku
  const [free, setFree] = useState(true);      // školenie: true = zadarmo
  const [checks, setChecks] = useState<{ a: boolean; b: boolean }>({ a: false, b: false });
  const tg = (k: "a" | "b") => setChecks((c) => ({ ...c, [k]: !c[k] }));

  const titles: Record<string, string> = { skolenie: "Nové školenie", help: "Hľadám pomoc" };
  const fieldlbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: A.txt2, marginTop: SPACE.gutter };
  const inp: React.CSSProperties = { width: "100%", background: A.surface2, border: `1px solid ${A.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, color: A.txt, fontSize: 14, fontFamily: "inherit", resize: "none", marginTop: SPACE.xs, outline: "none" };

  function submit() {
    if (!text.replace(/<[^>]+>/g, "").trim()) return toast(isSkol ? "Najprv zadaj názov workshopu" : "Najprv napíš, čo hľadáš");
    if (isSkol && (!checks.a || !checks.b)) return toast("Potvrď obe vyhlásenia (zodpovednosť + oprávnenie školiť)");

    createPost({ kind, d, text, talent: false, free: isSkol && free, fotky });
    const ttl = isSkol ? "Workshop vytvorený!" : "Žiadosť zverejnená!";
    const body = kind === "help" ? "Tvoja žiadosť je navrchu feedu. Keď sa niekto ozve, otvorí sa chat."
      : "Workshop sa práve zobrazil vo feede aj na Nástenke.";
    celebrate(ttl, body);
    setTimeout(home, 1500);
  }

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackBar title={titles[kind]} onBack={() => setAdd(null)} />
      <div style={{ padding: `${SPACE.xs}px ${SPACE.md}px ${SPACE.md}px` }}>
        <div style={pill()}>{a.ic} {a.label}</div>

        <div style={fieldlbl}>{isSkol ? "Názov workshopu" : "Čo hľadáš"}</div>
        {isSkol
          ? <input value={text} onChange={(e) => setText(e.target.value)} placeholder="napr. Akvarel pre začiatočníkov" aria-label="Názov workshopu" style={inp} />
          : <div style={{ marginTop: SPACE.xs }}><RichTextInput value={text} onChange={setText} placeholder="napr. Hľadám parťáka na beh..." ariaLabel="Čo hľadáš" minH={90} /></div>}

        {isSkol && (<>
          <div style={fieldlbl}>Cena</div>
          <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.xs }}>
            <Cbtn t="Zadarmo" s="bez auditu" tCol={A.green} active={free} onClick={() => setFree(true)} />
            <Cbtn t="Platené" s="3 QR + KYC" tCol={A.gold} active={!free} onClick={() => setFree(false)} />
          </div>
        </>)}

        <div style={fieldlbl}>Foto</div>
        <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.xs, alignItems: "center" }}>
          <FotoVyber fotky={fotky} onZmena={setFotky} max={4} />
        </div>

        <div style={{ background: A.greenBg, border: `1px solid ${A.greenBd}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, marginTop: SPACE.gutter, fontSize: 13, lineHeight: 1.4 }}>🤖 <b>AI pomôže</b> — z popisu navrhne kategóriu, dôležitosť a skontroluje obsah.</div>

        {isSkol && (<>
          <div style={fieldlbl}>Potvrdenie</div>
          <Check on={checks.a} onClick={() => tg("a")}>Som to ja alebo blízka osoba s jej súhlasom, zodpovedám za obsah.</Check>
          {isSkol && <Check on={checks.b} onClick={() => tg("b")}>Čestne vyhlasujem, že mám oprávnenie toto školiť (vzdelanie/skúška/certifikát) a doklady viem predložiť k auditu.</Check>}
        </>)}

        <Btn onClick={submit}>{kind === "help" ? "Zverejniť žiadosť" : "Vytvoriť workshop"}</Btn>
        <div style={{ textAlign: "center", padding: `${SPACE.gutter}px 0 0`, fontSize: 11, color: A.txt3 }}>Pred zverejnením prejde AI kontrolou. {isSkol ? "Lektor = KYC." : ""}</div>
      </div>
    </div>
  );
}
function Ch({ ic, t, s, onClick }: any) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: SPACE.gutter, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: RADIUS.md, padding: `${SPACE.md}px ${SPACE.md}px`, cursor: "pointer" }}>
      <div style={{ fontSize: 28, width: 40, textAlign: "center" }}>{ic}</div>
      <div><div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div><div style={{ fontSize: 11, color: A.txt3, marginTop: SPACE.xxs }}>{s}</div></div>
    </div>
  );
}
function Check({ on, onClick, children }: { on: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClick} style={{ display: "flex", gap: SPACE.sm, alignItems: "flex-start", background: A.surface2, border: `1px solid ${on ? A.greenBd : A.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginTop: SPACE.sm, fontSize: 11.5, color: A.txt2, lineHeight: 1.4, cursor: "pointer" }}>
      <div style={{ width: 20, height: 20, borderRadius: RADIUS.xs, border: `1px solid ${on ? A.greenBd : A.line}`, background: on ? A.greenBg : "transparent", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: A.green }}>{on ? "✓" : ""}</div>
      <div>{children}</div>
    </div>
  );
}

// ===================== NÁSTENKA =====================
function Board({ dom, toast, home }: any) {
  const a = DOM[dom];
  const list = EVENTS[dom] || EVENTS.mix;
  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackBar title="Nástenka" onBack={home} />
      <div style={{ padding: `0 ${SPACE.md}px ${SPACE.xs}px`, fontSize: 11, color: A.txt3, lineHeight: 1.5 }}>Udalosti vo tvojom okolí · {dom === "mix" ? "všetky domény" : a.label}</div>
      {list.map((e, i) => (
        <div key={i} onClick={() => toast(`Udalosť: ${e[2]}`)} style={{ display: "flex", gap: SPACE.sm, alignItems: "center", background: A.surface, border: `1px solid ${A.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, margin: `0 ${SPACE.md}px ${SPACE.xs}px`, cursor: "pointer" }}>
          <div style={{ width: 46, height: 46, borderRadius: RADIUS.sm, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: "none", background: a.bg, color: a.c, border: `1px solid ${a.bd}` }}>
            <div style={{ fontSize: 9, fontWeight: 700 }}>{e[0]}</div><div style={{ fontSize: 11, fontWeight: 700 }}>{e[1]}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{e[2]}</div>
            <div style={{ fontSize: 11, color: A.txt3, marginTop: SPACE.xxs }}>📍 {e[3]}</div>
          </div>
          <span style={{ color: C.textTer, fontSize: 14 }}>›</span>
        </div>
      ))}
      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px`, fontSize: 11, color: A.txt3, lineHeight: 1.5, textAlign: "center" }}>Klikni na doménu na Domove a Nástenka ukáže udalosti danej oblasti.</div>
    </div>
  );
}

// ===================== PROFIL OSOBY =====================
function OsobaProfil({ name, items, follows, toggleFollow, onOpen, toast, home }: any) {
  const p = osoba(name, items);
  const { gate } = useTvorbaGate(); // „Správa" iniciuje chat = create
  const sledujem = !!follows[name];
  // fotky profilu — v testovacom režime ich smie nastaviť aj návštevník
  const [fotky, zmenFotky] = useFotkyEntity(klucEntity("osoba", name));
  const [fotkySheet, setFotkySheet] = useState(false);
  const smiemUpravit = FOTO_TEST_REZIM || p.isMe;
  const acc = p.domains[0] ? DOM[p.domains[0]] : DOM.mix;
  const followers = p.followers + (sledujem ? 1 : 0);


  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackBar title="Profil" onBack={home} />

      {/* hero — jednotný entity vzor (cover→avatar→meno+odznak→štatistiky→akcie) */}
      <div style={{ padding: `${SPACE.xxs}px ${SPACE.md}px 0` }}>
        <EntityHero
          avatar={fotky.avatar
            ? <img src={fotky.avatar} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 26, color: "#fff", background: p.pfp }}>{p.ini}</span>}
          cover={fotky.cover ?? undefined}
          onAvatar={smiemUpravit ? () => setFotkySheet(true) : undefined}
          onCover={smiemUpravit ? () => setFotkySheet(true) : undefined}
          coverEl={<span style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${tint(acc.c, .3)}, ${tint(acc.c, .06)})` }} />}
          meno={<>{p.name}{p.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}</>}
          overene={p.verified} overeneLabel="Overený člen — potvrdené komunitou"
          podtitul={<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IkonaPin size={11} color={A.txt3} /> {p.loc.replace(/\s*\/\s*/g, " · ")}</span>}
          vpravo={naStitLevelOpt(p.karma) && <StityRad variant="hlavicka" hlavny={naStitLevelOpt(p.karma)!} oblasti={stityOblastiSubjektu(p.name, naStitLevelOpt(p.karma)!)} meno={p.name} velkost={76} />}
          stats={[
            { hodnota: p.skutky, label: "skutkov" },
            { hodnota: followers.toLocaleString("sk"), label: "sledovateľov" },
            { hodnota: p.following, label: "sleduje" },
            { hodnota: p.domains.length, label: "oblastí" },
          ]}
          akcie={p.isMe ? (
            <BtnAkcia variant="secondary" onClick={() => toast("Toto je tvoj profil — uprav ho v záložke Profil")}>To si ty ✦</BtnAkcia>
          ) : (<>
            <BtnAkcia variant={sledujem ? "secondary" : "primary"} ariaPressed={sledujem} onClick={() => toggleFollow(name)}>
              {sledujem ? "✓ Sledujem" : "+ Sledovať"}
            </BtnAkcia>
            <BtnAkcia variant="secondary" onClick={gate(() => toast(`Správa pre ${p.name}`))}><IkonaObalka size={14} /> Správa</BtnAkcia>
          </>)}
        />
      </div>

      {fotkySheet && (
        <FotoProfiluSheet
          titul={`Fotky profilu · ${p.name}`}
          popis="Profilová fotka a titulná fotka tohto profilu."
          foto={fotky.avatar} nahrada={p.ini}
          onZmena={(url) => { zmenFotky({ avatar: url }); toast(url ? "Profilová fotka uložená" : "Profilová fotka odstránená"); }}
          cover={fotky.cover}
          onCover={(url) => { zmenFotky({ cover: url }); toast(url ? "Titulná fotka uložená" : "Titulná fotka odstránená"); }}
          onClose={() => setFotkySheet(false)} />
      )}

      {/* bio */}
      <p style={{ padding: `${SPACE.sm}px ${SPACE.md}px 0`, margin: 0, fontSize: 14, lineHeight: 1.55, color: A.txt2 }}>{p.bio}</p>

      {/* domény */}
      {p.domains.length > 0 && (
        <div style={{ padding: `${SPACE.md}px ${SPACE.md}px 0` }}>
          <div style={secLbl}>AKTÍVNY V OBLASTIACH</div>
          <div style={{ display: "flex", gap: SPACE.xs, flexWrap: "wrap" }}>
            {p.domains.map((d) => { const a = DOM[d]; return <Chip key={d} bg={tint(a.c, .14)} c={a.c}>{a.ic} {a.label}</Chip>; })}
          </div>
        </div>
      )}

      {/* príspevky */}
      <div style={{ padding: `${SPACE.md}px ${SPACE.md}px 0` }}>
        <div style={secLbl}>PRÍSPEVKY ({p.items.length})</div>
        {p.items.length === 0 ? (
          <div style={{ textAlign: "center", color: A.txt3, fontSize: 12, padding: `${SPACE.lg}px ${SPACE.sm}px`, lineHeight: 1.6 }}>Zatiaľ žiadne príspevky.</div>
        ) : p.items.map((it) => {
          const a = DOM[it.dom];
          const lbl = it.type === "talent" ? "Iskra" : it.type === "workshop" ? "Workshop" : it.type === "help" ? "Hľadá pomoc" : it.type === "case" ? "Akcia" : "Skutok";
          return (
            <div key={it.id} onClick={() => onOpen(it.id)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, background: A.surface, border: `1px solid ${A.line2}`, borderRadius: RADIUS.sm, marginBottom: SPACE.xs, cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: RADIUS.xs, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flex: "none", background: a.bg, border: `1px solid ${a.bd}` }}><Emo e={it.emoji} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                <div style={{ fontSize: 11, color: A.txt3, marginTop: SPACE.xxs }}><span style={{ color: a.c, fontWeight: 700 }}>{lbl}</span> · {a.label} · {it.time}</div>
              </div>
              <span style={{ color: C.textTer, fontSize: 14 }}>›</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: `${SPACE.xs}px ${SPACE.md}px 0`, fontSize: 11, color: A.txt3, lineHeight: 1.5 }}>
        {p.verified ? "Overený člen — totožnosť/aktivita potvrdená komunitou (KYC)." : "Skutky a karma sú verejné a overené komunitou. Sledovaním uvidíš nové príspevky tejto osoby."}
      </div>
    </div>
  );
}
