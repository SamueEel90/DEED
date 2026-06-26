import { useState, useMemo, useEffect } from "react";
import { ModulHlavicka, Hlavicka, PodporaSekcia, PlatbaModal, HladanieModal, toast, Oslava, useMotiv, useScrollHore, Ticker, StatRiadok, FeedStlpce, SekcieBar, OkruhVyber, Lupa, Zvon, IkonaSipVlavo, IkonaMoznosti, Zdielanie, IkonaUlozit, IkonaFoto, IkonaPlus, IkonaPlay, FeedSkeleton, EmptyState, ErrorState, ScreenSwitch } from "@/shared";
import { C, GRAD, GRAD_ZELENY } from "@/theme";
import { pripravFeed, FEED_CFG } from "@/lib/feed";
import type { OkruhKod } from "@/types";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { A, DOM, ORDER, tint } from "./domeny";
import { useAktivityFeed } from "@/data";
import { EVENTS, USER_LOK, type AktItem } from "./mock";
import { LS, load, save, obohatit, osoba, vytvorPost, type NovyPostSpec } from "./utils";

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
const DOM_IKONA: Record<string, React.ReactNode> = {
  zdravie: <DI><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /></DI>,
  learn: <DI><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" /></DI>,
  sport: <DI><circle cx="12" cy="8" r="6" /><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1" /></DI>,
  eko: <DI><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6" /></DI>,
  art: <DI><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" /><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" /></DI>,
};

// ---- spoločné štýly ----
const cardS: React.CSSProperties = { background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 16, marginBottom: 12, overflow: "hidden", cursor: "pointer" };
const rowTopS: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 };
const pfpS = (bg: string): React.CSSProperties => ({ width: 36, height: 36, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", background: bg });
const nameS: React.CSSProperties = { fontWeight: 700, fontSize: 15.5 };
const timeS: React.CSSProperties = { marginLeft: "auto", fontSize: 12, color: A.txt3 };
const titleS: React.CSSProperties = { fontSize: 16, fontWeight: 700, lineHeight: 1.4 };
const verifS: React.CSSProperties = { fontSize: 11, color: A.green, background: A.greenBg, padding: "3px 9px", borderRadius: 8 };
const heroGrad = (d: string) => `linear-gradient(160deg, ${DOM[d].bg} 0%, #0a0c11 100%)`;
const secLbl: React.CSSProperties = { fontSize: 11.5, letterSpacing: ".4px", color: A.txt3, fontWeight: 700, margin: "18px 0 9px" };

function Chip({ bg, c, children }: { bg: string; c: string; children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: bg, color: c }}>{children}</span>;
}
function DomTag({ it }: { it: AktItem }) {
  const a = DOM[it.dom];
  if (it.type === "talent") return <Chip bg={tint(a.c, .14)} c={a.c}>▶ Talent · {a.label}</Chip>;
  if (it.source === "Charity") return <Chip bg={A.goldBg} c={A.gold}>✓ Charita · {a.label}</Chip>;
  return <Chip bg={tint(a.c, .14)} c={a.c}>{a.ic} {a.label}</Chip>;
}
function Play({ big }: { big?: boolean }) {
  const s = big ? 58 : 54;
  return <span style={{ width: s, height: s, borderRadius: "50%", background: "rgba(255,255,255,.16)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", border: "1px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", paddingLeft: 4 }}>▶</span>;
}
function badge(side: "l" | "r"): React.CSSProperties {
  return { position: "absolute", top: 12, [side === "l" ? "left" : "right"]: 12, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 7, background: "rgba(0,0,0,.6)", color: side === "l" ? A.gold : "#fff", display: "flex", alignItems: "center", gap: 4, pointerEvents: "none" };
}

// ===================== MODUL =====================
export default function ModulAktivity({ wide }: { wide?: boolean }) {
  const { data: SEED_ITEMS = [] as unknown as AktItem[], isLoading, isError, refetch } = useAktivityFeed() as { data?: AktItem[]; isLoading: boolean; isError: boolean; refetch: () => void };
  const [dom, setDom] = useState("mix");
  const [view, setView] = useState("all"); // all | talent | workshop | help
  const [screen, setScreen] = useState("home"); // home | detail | add | board | profile
  const [aktId, setAktId] = useState<number | null>(null);
  const [profilMeno, setProfilMeno] = useState<string | null>(null); // otvorený profil osoby
  const [celeb, setCeleb] = useState<{ title: string; text: string } | null>(null);
  const [hladaj, setHladaj] = useState(false);
  const [add, setAdd] = useState<{ kind: string; d: string } | null>(null); // null = menu | { kind, d }

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
  const obal = (el: React.ReactNode) => (wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el);

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
    setDom((c) => (c === d ? "mix" : d)); // klik na aktívnu doménu = späť na Mix
    setView("all");
  }
  function pickView(v: string) { setView((x) => (x === v ? "all" : v)); }
  function open(id: number) { setAktId(id); setScreen("detail"); }
  function openPerson(name: string) { if (!name) return; setProfilMeno(name); setScreen("profile"); }
  function home() { setScreen("home"); }

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);

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
    setTick({ who: "Ty", what: `práve podporil(a) ${amt} DEED →`, to: komu });
    celebrate(amt >= 100 ? "Skvelé! Veľká podpora!" : "Ďakujeme!", `Tvoja podpora ${amt} DEED letí k ${komu}. Reťaz dobra pokračuje.`);
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
      {screen === "detail" && akt && obal(<Detail {...{ it: akt, liked, like, support, votes, vote, toast, celebrate, home, openPerson, setScreen }} />)}
      {screen === "add" && obal(<Add {...{ dom, add, setAdd, toast, celebrate, home, createPost }} />)}
      {screen === "board" && obal(<Board {...{ dom, toast, home }} />)}
      {screen === "profile" && profilMeno && obal(<OsobaProfil {...{ name: profilMeno, items, follows, toggleFollow, onOpen: open, toast, home }} />)}
      </ScreenSwitch>

      {hladaj && (
        <HladanieModal akcent={acc.c} placeholder="Hľadať aktivity, workshopy, lektorov…"
          data={items.map((it) => ({
            id: it.id, titul: it.title, podtitul: `${it.author} · ${it.loc || DOM[it.dom].label}`, kat: DOM[it.dom].label, emoji: it.emoji,
            tag: it.type === "talent" ? "Talent" : it.type === "workshop" ? "Workshop" : it.type === "help" ? "Žiadosť" : DOM[it.dom].label,
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

  // 1) UI predfilter (doména + sub-záložka) — to engine nerieši
  const list = items.filter((it: AktItem) => {
    if (dom !== "mix" && it.dom !== dom) return false;
    if (view === "talent") return it.type === "talent";
    if (view === "workshop") return it.type === "workshop";
    if (view === "help") return it.type === "help";
    return true;
  });

  // 2) Feed algoritmus na seed obsah; vlastné čerstvé príspevky držíme navrchu
  //    (optimistické UI — používateľ hneď vidí, čo pridal, mimo prahu okruhu).
  const feed = [
    ...list.filter((it: AktItem) => it.mine),
    ...pripravFeed(list.filter((it: AktItem) => !it.mine), { ...USER_LOK, radius }),
  ];

  const sub = (on: boolean): React.CSSProperties => ({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 11, fontSize: 12, fontWeight: 600, cursor: "pointer", background: on ? "var(--accBg)" : A.surface, border: `1px solid ${on ? "var(--accBd)" : A.line2}`, color: on ? "var(--acc)" : A.txt2 });

  // dvojstĺpcový feed (skutky vľavo / žiadosti vpravo) iba v zmiešanom zobrazení na tablete/PC
  const dva = wide && view === "all";
  const feedCard = (it: AktItem) => {
    if (it.type === "workshop") return <WCard key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
    if (it.type === "help") return <ReqCard key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
    if (it.type === "case" || it.size === "med") return <MedCard key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
    if (it.size === "big") return <BigCard key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
    return <SmallRow key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
  };

  return (
    <div style={{ paddingBottom: 14 }}>
      {/* header — jednotná hlavička (logo D⁺ + názov) */}
      <ModulHlavicka title="Aktivity" karma="Aktivity · Silver"
        right={
          <>
            <span onClick={onHladaj} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={A.txt2} /></span>
            <Zvoncek color={A.txt2} toast={toast} />
          </>
        } />

      {/* live ticker — odráža poslednú reálnu akciu */}
      <Ticker>
        {tick
          ? <>{tick.who} <b style={{ color: C.greenL }}>{tick.what}</b>{tick.to ? ` ${tick.to}` : ""}</>
          : <>Cyklo TN <b style={{ color: C.greenL }}>práve dostal 100 DEED</b> → Marek</>}
      </Ticker>

      {/* jednotná sekcia skratiek */}
      <SekcieBar talentActive={view === "talent"} onTalent={() => pickView("talent")} onBoard={() => setScreen("board")} onAdd={() => setScreen("add")} />

      {/* štatistický riadok — počet vo zvolenom okruhu + výber okruhu */}
      <StatRiadok stat={`V okruhu ${feed.length} aktivít · Mesiac 9 480`}
        okruh={FEED_CFG.radiusy[radius].krat} onOkruh={() => setVyberOkruh(true)} />

      {/* prepínač domén */}
      <div style={{ padding: "2px 12px 8px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 7, minWidth: "max-content", padding: "0 4px" }}>
          {ORDER.map((d) => {
            const a = DOM[d]; const on = dom === d;
            return (
              <div key={d} onClick={() => pickDom(d)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 62, height: 54, borderRadius: 14, cursor: "pointer", flex: "none", transition: ".18s", transform: on ? "translateY(-1px)" : "none", background: on ? tint(a.c, .15) : A.surface2, border: `1px solid ${on ? tint(a.c, .5) : A.line}` }}>
                <div style={{ color: on ? a.c : A.txt2, display: "flex" }}>{DOM_IKONA[d]}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: on ? a.c : A.txt2 }}>{a.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* sub sekcie */}
      <div style={{ display: "flex", gap: 8, padding: "2px 16px 12px", borderBottom: `1px solid ${A.line}`, marginBottom: 4 }}>
        <div onClick={() => pickView("workshop")} style={sub(view === "workshop")}><span style={{ fontSize: 13 }}>🎓</span>Workshopy</div>
        <div onClick={() => pickView("help")} style={sub(view === "help")}><span style={{ fontSize: 13 }}>❓</span>Hľadám pomoc</div>
        <div onClick={() => toast("Market — predaj diel/náradia, fáza 2")} style={sub(false)}><span style={{ fontSize: 13 }}>🛒</span>Market<span style={{ fontSize: 8, background: A.goldBg, color: A.gold, padding: "1px 5px", borderRadius: 5, marginLeft: 2 }}>čoskoro</span></div>
      </div>

      {/* feed — na tablete/PC: skutky & aktivity vľavo, žiadosti o pomoc vpravo */}
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <FeedSkeleton count={4} />
      ) : !feed.length ? (
        <EmptyState emoji="✨" title="Zatiaľ tu nič nie je" text="V tejto doméne zatiaľ nie sú príspevky." />
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
const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
function BigCard({ it, wide, onOpen, onPerson }: any) {
  return (
    <div onClick={() => onOpen(it.id)} className="good-card" style={{ ...cardS, marginBottom: wide ? 0 : 12, ...(wide ? {} : { margin: "0 -16px 12px", borderRadius: 0, border: "none", borderBottom: `1px solid ${A.line2}` }) }}>
      <div style={{ height: 148, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.dom) }}>
        <span style={badge("l")}>★ {it.importance || DOM[it.dom].label}</span>
        {it.media === "video" && <span style={badge("r")}>▶ video</span>}
        {it.media === "video" ? <Play /> : <div style={{ fontSize: 50 }}>{it.emoji}</div>}
        <div style={{ position: "absolute", bottom: 12, left: 12 }}><DomTag it={it} /></div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={rowTopS}>
          <div onClick={stop(() => onPerson(it.author))} style={{ ...pfpS(it.pfp), cursor: "pointer" }}>{it.ini}</div>
          <div onClick={stop(() => onPerson(it.author))} style={{ ...nameS, cursor: "pointer" }}>{it.author}</div>
          {it.verified && <span style={verifS}>overené</span>}
          <span style={timeS}>{it.time}</span>
        </div>
        <div style={{ fontSize: 10.5, color: A.txt3, marginLeft: 42, marginBottom: 8 }}>{it.loc} · č. {it.num.toLocaleString("sk")}</div>
        <div style={titleS}>{it.title}</div>
      </div>
    </div>
  );
}
function MedCard({ it, wide, onOpen, onPerson }: any) {
  const a = DOM[it.dom]; const isCase = it.type === "case";
  return (
    <div onClick={() => onOpen(it.id)} style={{ ...cardS, marginBottom: wide ? 0 : 12, display: "flex", padding: 12, gap: 12, alignItems: "flex-start", border: `1px solid ${isCase ? a.bd : A.line}` }}>
      <div style={{ width: 96, height: 80, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: heroGrad(it.dom) }}>{it.media === "kreslene" ? "✎" : it.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{it.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span onClick={stop(() => onPerson(it.author))} style={{ fontSize: 12.5, color: A.txt2, cursor: "pointer", fontWeight: 600 }}>{it.author}</span>
          <DomTag it={it} />
          {isCase && <ProgressMini it={it} />}
        </div>
      </div>
      <span style={timeS}>{it.time}</span>
    </div>
  );
}
function WCard({ it, wide, onOpen, onPerson }: any) {
  const free = it.price === "free";
  return (
    <div onClick={() => onOpen(it.id)} style={{ ...cardS, marginBottom: wide ? 0 : 12, display: "flex", padding: 12, gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 96, height: 80, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: heroGrad(it.dom) }}>{it.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Wb bg={free ? A.greenBg : A.goldBg} c={free ? A.green : A.gold}>{free ? "ZADARMO" : it.priceTxt}</Wb>
          {it.b2b && <Wb bg={A.blueBg} c={A.blue}>B2B · audit</Wb>}
          {it.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, marginTop: 6 }}>{it.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span onClick={stop(() => onPerson(it.author))} style={{ fontSize: 12, color: A.txt2, cursor: "pointer", fontWeight: 600 }}>{it.author}</span>
          <span style={{ fontSize: 12, color: A.txt3 }}>· {it.loc}</span>
          <span style={{ fontSize: 11.5, color: A.txt3 }}>★ {it.rating} · {it.seats} miest</span>
        </div>
      </div>
      <span style={{ ...timeS, fontSize: 9 }}>{it.time}</span>
    </div>
  );
}
function Wb({ bg, c, children }: { bg: string; c: string; children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: bg, color: c }}>{children}</span>;
}
function ProgressMini({ it }: { it: AktItem }) {
  const pct = Math.round((it.raised as number) / (it.goal as number) * 100);
  return (
    <div style={{ width: "100%", marginTop: 6 }}>
      <div style={{ height: 6, background: "rgba(var(--glass-rgb),.12)", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99 }} /></div>
      <div style={{ fontSize: 9, color: A.txt3, marginTop: 3 }}>{(it.raised as number).toLocaleString("sk")} € z {(it.goal as number).toLocaleString("sk")} € · {pct}% · D++R {it.drr}%</div>
    </div>
  );
}
function ReqCard({ it, wide, onOpen, onPerson }: any) {
  return (
    <div onClick={() => onOpen(it.id)} style={{ ...cardS, marginBottom: wide ? 0 : 12, border: `1px solid ${A.redBd}`, background: A.redBg }}>
      <div style={{ display: "flex", padding: 14, gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 64, height: 64, borderRadius: 11, background: "rgba(242,112,111,.16)", border: `1px solid ${A.redBd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "var(--acc)", flex: "none" }}>{it.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: "var(--acc)" }}>{it.title}</div>
          <div style={{ fontSize: 12.5, color: A.txt2, marginTop: 6 }}><span onClick={stop(() => onPerson(it.author))} style={{ cursor: "pointer", fontWeight: 600 }}>{it.author}</span> · {it.loc}</div>
          <div style={{ fontSize: 11.5, color: A.txt3, marginTop: 6 }}>❓ Hľadám pomoc · {it.helpers} sa zapojilo</div>
        </div>
      </div>
    </div>
  );
}
function SmallRow({ it, wide, onOpen, onPerson }: any) {
  const a = DOM[it.dom];
  const ic = it.type === "talent" ? "▶" : it.media === "kreslene" ? "✎" : "▦";
  return (
    <div onClick={() => onOpen(it.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: A.surface, border: `1px solid ${A.line2}`, borderRadius: 12, marginBottom: wide ? 0 : 8, cursor: "pointer" }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flex: "none", background: a.bg, color: a.c, border: `1px solid ${a.bd}` }}>{ic}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", marginRight: 6, background: a.c }} />{it.title}</div>
        <div style={{ fontSize: 11.5, color: A.txt3, marginTop: 3 }}><span onClick={stop(() => onPerson(it.author))} style={{ cursor: "pointer", fontWeight: 600, color: A.txt2 }}>{it.author}</span> · {a.label}{it.karma ? " · " + it.karma : ""}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={timeS}>{it.time}</div>
        <div style={{ color: C.textTer, fontSize: 14 }}>›</div>
      </div>
    </div>
  );
}

// ===================== DETAIL =====================
// jednotná hlavička pod-obrazoviek (rovnaká ako vo zvyšku appky)
function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return <Hlavicka title={title} onBack={onBack} />;
}
function DetailHero({ it, onBack, children }: { it: AktItem; onBack: () => void; children?: React.ReactNode }) {
  return (
    <div style={{ height: 150, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.dom) }}>
      <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", zIndex: 2 }}><IkonaSipVlavo size={20} color="#fff" /></div>
      <div style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", zIndex: 2 }}><IkonaMoznosti size={18} color="#fff" /></div>
      {children}
    </div>
  );
}
const qrCells = () => [...Array(25)].map((_, k) => <i key={k} style={{ background: (k * 7 + 3) % 3 ? "#0B0C0F" : "transparent", borderRadius: 1 }} />);

function Detail({ it, liked, like, support, votes, vote, toast, celebrate, home, openPerson }: any) {
  if (it.type === "workshop") return <WorkshopDetail it={it} toast={toast} celebrate={celebrate} home={home} openPerson={openPerson} />;
  if (it.type === "help") return <HelpDetail it={it} toast={toast} celebrate={celebrate} home={home} openPerson={openPerson} />;
  return <DeedDetail it={it} liked={liked} like={like} support={support} votes={votes} vote={vote} toast={toast} home={home} openPerson={openPerson} />;
}

function DeedDetail({ it, support, votes, vote, toast, home, openPerson }: any) {
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
    <div style={{ paddingBottom: 24 }}>
      <DetailHero it={it} onBack={home}>
        {it.media === "video" ? <Play big /> : <div style={{ fontSize: 52 }}>{it.emoji}</div>}
        <div style={{ position: "absolute", bottom: 12, left: 14 }}><DomTag it={it} /></div>
      </DetailHero>
      <div style={{ padding: "14px 18px" }}>
        <div onClick={() => openPerson(it.author)} style={{ ...rowTopS, cursor: "pointer" }}>
          <div style={pfpS(it.pfp)}>{it.ini}</div>
          <div>
            <div style={{ ...nameS, display: "flex", alignItems: "center", gap: 6 }}>{it.author} <span style={{ color: C.textTer, fontSize: 13 }}>›</span></div>
            <div style={{ fontSize: 12, color: A.txt3 }}>{it.loc} · č. {it.num.toLocaleString("sk")}</div>
          </div>
          {it.verified && <span style={{ ...verifS, marginLeft: "auto" }}>overené</span>}
        </div>
        <div style={{ ...titleS, marginTop: 10, fontSize: 14 }}>{it.title}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 9, color: A.txt2 }}>{it.desc}</p>

        {isCase && (
          <div style={{ textAlign: "center", padding: 12, background: A.surface2, border: `1px solid ${a.bd}`, borderRadius: 12, marginTop: 6 }}>
            <b style={{ fontSize: 22, color: a.c }}>{it.raised.toLocaleString("sk")} €</b> <span style={{ color: A.txt2 }}>z {it.goal.toLocaleString("sk")} € ({pct}%)</span>
            <div style={{ height: 6, background: "rgba(var(--glass-rgb),.12)", borderRadius: 99, marginTop: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99, transition: "width .4s ease" }} /></div>
            <div style={{ fontSize: 10, color: A.gold, marginTop: 8, fontWeight: 700 }}>D++R · {it.drr}% z tvojho daru ide Marekovi · overené</div>
            {it.supportCount > 0 && <div style={{ fontSize: 10.5, color: A.green, marginTop: 6, fontWeight: 700 }}>✓ Ty si prispel(a) {it.supportCount}× · ďakujeme</div>}
          </div>
        )}

        <PodporaSekcia
          onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
          upvotes={Math.floor((it.likes || 0) / 3)} onUpvote={() => toast("Páči sa ti to")}
          onPodpor={(s: number) => support(s, it.author, it)} onSms={() => toast("SMS podpora (euro/operátor)")}
          onKanal={(k: string) => setPlatba(k)} supLabel={supLabel} />

        <div style={{ display: "flex", alignItems: "center", gap: 14, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 14, padding: 12, marginTop: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: "#fff", flex: "none", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridTemplateRows: "repeat(5,1fr)", gap: 1, padding: 5 }}>{qrCells()}</div>
          <div><div style={{ fontWeight: 700, fontSize: 12.5 }}>QR {isCase ? "tejto akcie" : isTalent ? "tohto talentu" : "tohto skutku"}</div><div style={{ fontSize: 12, color: A.txt3 }}>Zväčšiť a zdieľať na siete</div></div>
          <div onClick={() => toast("Zdieľať: YouTube · IG · TikTok · kopírovať")} style={{ marginLeft: "auto", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 11, padding: "9px 15px", borderRadius: 11, cursor: "pointer", boxShadow: "0 5px 16px rgba(99,134,255,.32)" }}>Zdieľať</div>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: A.txt3, marginTop: 16 }}>
          {myVote ? (myVote === "ok" ? "Označil(a) si tento skutok ako overený. Ďakujeme." : "Podal(a) si námietku — preverí ju AI + komunita.") : "Bol si pri tom? Komunita preveruje skutky."}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
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
  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero it={it} onBack={home}>
        <div style={{ fontSize: 52 }}>{it.emoji}</div>
        <div style={{ position: "absolute", bottom: 12, left: 14, display: "flex", gap: 6 }}>
          <Wb bg={free ? A.greenBg : A.goldBg} c={free ? A.green : A.gold}>{free ? "ZADARMO" : it.priceTxt}</Wb>
          {it.b2b && <Wb bg={A.blueBg} c={A.blue}>B2B · audit S1</Wb>}
        </div>
      </DetailHero>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ ...titleS, fontSize: 15 }}>{it.title}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 9, color: A.txt2 }}>{it.desc}</p>

        <div onClick={() => openPerson(it.author)} style={{ display: "flex", alignItems: "center", gap: 10, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 13, padding: 12, marginTop: 14, cursor: "pointer" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#fff", flex: "none", background: it.pfp }}>{it.ini}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>{it.author} {it.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}</div>
            <div style={{ fontSize: 12, color: A.txt3 }}>{it.karma || "lektor"} · ★ {it.rating} hodnotenie · otvoriť profil</div>
          </div>
          <span style={{ color: C.textTer }}>›</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Dr b={it.time.split(" ")[0] || "—"} t="termín" />
          <Dr b={it.loc.includes("online") ? "online" : "naživo"} t="forma" />
          <Dr b={it.seats} t="voľných miest" />
        </div>

        <InfoBox>{!free
          ? <><b style={{ color: A.txt }}>3 QR dochádzka</b> — štart / 60 % / koniec. {it.b2b ? "Povinné = audit dôkaz pre firmu (ESRS S1). Zamestnanec má priradenú firmu, účasť sa jej započíta." : "Pri platenom = overená účasť + karma."} Lektor a platený účastník = KYC.</>
          : "Voľný komunitný workshop — bez 3 QR a bez auditu (obsah/kvalitu nepoznáme). Pozeraj čo ťa zaujíma."}</InfoBox>

        {it.profi && (<><div style={secLbl}>ĎALŠIE OD LEKTORA</div>
          <div onClick={() => toast("Ďalšie workshopy lektora (demo)")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: A.surface, border: `1px solid ${A.line}`, borderRadius: 12, padding: 14, fontSize: 13, cursor: "pointer" }}><span>📚 Ďalšie 2 workshopy · profil</span><span style={{ color: C.textTer }}>›</span></div></>)}

        <Btn onClick={() => { celebrate(free ? "Prihlásené!" : "Prihlásené a zaplatené!", free ? "Uvidíme sa na workshope. Pri štarte naskenuj QR." : "Pri štarte naskenuj QR (3 QR: štart/60%/koniec)."); setTimeout(home, 1700); }}>{free ? "Prihlásiť sa" : "Prihlásiť a zaplatiť · " + it.priceTxt}</Btn>
        <div style={{ textAlign: "center", padding: "14px 18px 0", fontSize: 11, color: A.txt3 }}>{free ? "Zadarmo · základné prihlásenie." : "Platba cez EUR/DEED · " + it.priceTxt}</div>
      </div>
    </div>
  );
}

function HelpDetail({ it, toast, celebrate, home, openPerson }: any) {
  const a = DOM[it.dom];
  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero it={it} onBack={home}>
        <div style={{ fontSize: 52 }}>{it.emoji}</div>
        <div style={{ position: "absolute", bottom: 12, left: 14 }}><Chip bg={tint(a.c, .14)} c={a.c}>❓ Hľadám pomoc · {a.label}</Chip></div>
      </DetailHero>
      <div style={{ padding: "14px 18px" }}>
        <div onClick={() => openPerson(it.author)} style={{ ...rowTopS, cursor: "pointer" }}>
          <div style={pfpS(it.pfp)}>{it.ini}</div>
          <div><div style={{ ...nameS, display: "flex", alignItems: "center", gap: 6 }}>{it.author} <span style={{ color: C.textTer, fontSize: 13 }}>›</span></div><div style={{ fontSize: 12, color: A.txt3 }}>{it.loc} · č. {it.num.toLocaleString("sk")}</div></div>
        </div>
        <div style={{ ...titleS, marginTop: 10, fontSize: 14 }}>{it.title}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 9, color: A.txt2 }}>{it.desc}</p>
        <InfoBox>{it.helpers} ľudí sa už zapojilo. Po prijatí sa otvorí chat, dohodnete sa. Po dokončení: hodnotenie + tip + reťaz dobra.</InfoBox>
        <Btn green onClick={() => { celebrate("Ozval si sa!", `Otvorili sme chat s ${it.author}. Dohodnite si detaily.`); setTimeout(home, 1700); }}>✋ Môžem pomôcť</Btn>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Cbtn ic={<Zdielanie size={14} color={A.txt} />} t="Zdieľať" s="pošli ďalej" onClick={() => toast("Zdieľané")} />
          <Cbtn ic={<IkonaUlozit size={14} color={A.txt} />} t="Uložiť" s="na neskôr" onClick={() => toast("Uložené")} />
        </div>
      </div>
    </div>
  );
}

// ---- detail helpery ----
function InfoBox({ children }: { children: React.ReactNode }) {
  return <div style={{ background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 12, padding: 13, marginTop: 14, fontSize: 11.5, color: A.txt2, lineHeight: 1.5 }}>{children}</div>;
}
function Fx({ w, h, e, v, eCol, bg, bd, col, onClick }: any) {
  return (
    <div onClick={onClick} style={{ width: w, height: h, borderRadius: 10, background: bg || A.surface2, border: `1px solid ${bd || A.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: col || A.blue, fontWeight: 700 }}>
      <span style={{ fontSize: 17, color: eCol }}>{e}</span><span style={{ fontSize: 11, marginTop: 3 }}>{v}</span>
    </div>
  );
}
function Cbtn({ ic, t, s, tCol, active, onClick }: any) {
  return (
    <div onClick={onClick} style={{ flex: 1, height: 50, borderRadius: 11, background: active ? "var(--accBg)" : A.surface2, border: `${active ? 2 : 1}px solid ${active ? "var(--accBd)" : A.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .12s ease" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: tCol || A.txt, display: "flex", alignItems: "center", gap: 6 }}>{ic}{t}</div><div style={{ fontSize: 8.5, color: A.txt3, marginTop: 2 }}>{s}</div>
    </div>
  );
}
function Dr({ b, t }: { b: React.ReactNode; t: string }) {
  return <div style={{ flex: 1, textAlign: "center", background: A.surface, border: `1px solid ${A.line}`, borderRadius: 11, padding: "11px 4px" }}><b style={{ fontSize: 14 }}>{b}</b><div style={{ fontSize: 9, color: A.txt3, marginTop: 2 }}>{t}</div></div>;
}
function Vbtn({ ok, count = 0, mine, dim, onClick }: any) {
  return (
    <div onClick={onClick} style={{ flex: 1, height: 62, borderRadius: 13, display: "flex", alignItems: "center", gap: 10, paddingLeft: 16, cursor: "pointer", opacity: dim ? 0.5 : 1, background: ok ? A.greenBg : A.redBg, border: `${mine ? 2 : 1}px solid ${ok ? A.greenBd : A.redBd}`, transition: "opacity .15s ease" }}>
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
  const base: React.CSSProperties = { width: "100%", height: 50, borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 15.5, cursor: "pointer", marginTop: 18, fontFamily: "inherit", border: "none", transition: "transform .12s ease, box-shadow .25s ease" };
  const styl = green
    ? { ...base, background: GRAD_ZELENY, boxShadow: "0 8px 26px rgba(31,191,143,.32), inset 0 1px 0 rgba(255,255,255,.25)" }
    : { ...base, background: GRAD, boxShadow: "0 8px 26px rgba(99,134,255,.32), inset 0 1px 0 rgba(255,255,255,.25)" };
  return <button onClick={onClick} style={styl}>{children}</button>;
}

// ===================== ＋ PRIDAŤ =====================
function Add({ dom, add, setAdd, toast, celebrate, home, createPost }: any) {
  const d = dom === "mix" ? "sport" : dom;
  const a = DOM[d];
  const pill = (extra?: React.CSSProperties): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 9, marginBottom: 6, background: a.bg, color: a.c, border: `1px solid ${a.bd}`, ...extra });

  if (add) return <AddForm kind={add.kind} d={d} a={a} pill={pill} setAdd={setAdd} toast={toast} celebrate={celebrate} home={home} createPost={createPost} />;

  return (
    <div style={{ paddingBottom: 20 }}>
      <BackBar title="Pridať" onBack={home} />
      <div style={{ padding: 18 }}>
        <div style={pill()}>{a.ic} doména: {a.label} {dom === "mix" ? "(predvolené — zmeň na Domove)" : "(predvyplnené)"}</div>
        <h2 style={{ fontSize: 18, margin: "4px 0" }}>Čo chceš pridať?</h2>
        <div style={{ fontSize: 12, color: A.txt3 }}>Predvyplníme doménu, aby si klikal čo najmenej.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          <Ch ic="✅" t="Pridať skutok" s="spravil som niečo dobré (zabehol, zasadil, pomohol, vytvoril)" onClick={() => setAdd({ kind: "skutok", d })} />
          <Ch ic="🎓" t="Pridať školenie / workshop" s="ponúkam pomoc — učím, vediem, školím" onClick={() => setAdd({ kind: "skolenie", d })} />
          <Ch ic="❓" t="Hľadám pomoc" s="potrebujem mentora, parťáka, dobrovoľníkov" onClick={() => setAdd({ kind: "help", d })} />
        </div>
        <div style={{ padding: "14px 0", fontSize: 11, color: A.txt3, lineHeight: 1.5 }}>Talent (ukáž sa) pridáš tiež cez „Pridať skutok" → typ Talent. Video 45 s (do 1 min), KYC, automatický vodoznak + QR, AI moderácia.</div>
      </div>
    </div>
  );
}

function AddForm({ kind, d, a, pill, setAdd, toast, celebrate, home, createPost }: any) {
  const isTalentable = kind === "skutok", isSkol = kind === "skolenie";
  const [text, setText] = useState("");
  const [talent, setTalent] = useState(false); // skutok: false = skutok, true = talent
  const [free, setFree] = useState(true);      // školenie: true = zadarmo
  const [checks, setChecks] = useState<{ a: boolean; b: boolean }>({ a: false, b: false });
  const tg = (k: "a" | "b") => setChecks((c) => ({ ...c, [k]: !c[k] }));

  const titles: Record<string, string> = { skutok: "Nový skutok", skolenie: "Nové školenie", help: "Hľadám pomoc" };
  const fieldlbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: A.txt2, marginTop: 14 };
  const inp: React.CSSProperties = { width: "100%", background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 12, padding: 14, color: A.txt, fontSize: 14, fontFamily: "inherit", resize: "none", marginTop: 8, outline: "none" };

  function submit() {
    if (!text.trim()) return toast(isSkol ? "Najprv zadaj názov workshopu" : kind === "help" ? "Najprv napíš, čo hľadáš" : "Najprv opíš svoj skutok");
    if (isTalentable && !checks.a) return toast("Potvrď prvé vyhlásenie");
    if (isTalentable && talent && !checks.b) return toast("Pri talente potvrď súhlas s vodoznakom");
    if (isSkol && (!checks.a || !checks.b)) return toast("Potvrď obe vyhlásenia (zodpovednosť + oprávnenie školiť)");

    createPost({ kind, d, text, talent: isTalentable && talent, free: isSkol && free });
    const ttl = kind === "skutok" ? (talent ? "Talent pridaný!" : "Skutok pridaný!") : isSkol ? "Workshop vytvorený!" : "Žiadosť zverejnená!";
    const body = kind === "help" ? "Tvoja žiadosť je navrchu feedu. Keď sa niekto ozve, otvorí sa chat."
      : isSkol ? "Workshop sa práve zobrazil vo feede aj na Nástenke."
      : "Práve sa zobrazil navrchu feedu. Ďakujeme, že konáš.";
    celebrate(ttl, body);
    setTimeout(home, 1500);
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <BackBar title={titles[kind]} onBack={() => setAdd(null)} />
      <div style={{ padding: "6px 18px 18px" }}>
        <div style={pill()}>{a.ic} {a.label}</div>

        {isTalentable && (<>
          <div style={fieldlbl}>Typ</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Cbtn t="Skutok" s="popis + foto" active={!talent} onClick={() => setTalent(false)} />
            <Cbtn t="Talent ▶" s="45 s video" tCol={a.c} active={talent} onClick={() => setTalent(true)} />
          </div>
        </>)}

        <div style={fieldlbl}>{isSkol ? "Názov workshopu" : kind === "help" ? "Čo hľadáš" : "Popis skutku"}</div>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={isSkol ? "napr. Akvarel pre začiatočníkov" : kind === "help" ? "napr. Hľadám parťáka na beh..." : "napr. Vyčistili sme breh Váhu..."} style={inp} />

        {isSkol && (<>
          <div style={fieldlbl}>Cena</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Cbtn t="Zadarmo" s="bez auditu" tCol={A.green} active={free} onClick={() => setFree(true)} />
            <Cbtn t="Platené" s="3 QR + KYC" tCol={A.gold} active={!free} onClick={() => setFree(false)} />
          </div>
        </>)}

        <div style={fieldlbl}>Foto / video</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Mslot onClick={() => toast("Nahrať (demo)")}><IkonaPlus size={22} /></Mslot>
          <Mslot onClick={() => toast("Nahrať (demo)")}><IkonaFoto size={22} /></Mslot>
          {isTalentable && talent && <Mslot onClick={() => toast("Video — vodoznak sa pridá automaticky")}><IkonaPlay size={20} /></Mslot>}
        </div>

        <div style={{ background: A.greenBg, border: `1px solid ${A.greenBd}`, borderRadius: 12, padding: 14, marginTop: 14, fontSize: 13, lineHeight: 1.4 }}>🤖 <b>AI pomôže</b> — z popisu navrhne kategóriu, dôležitosť a skontroluje obsah. Pri talente: automatický vodoznak + QR, anti-deepfake.</div>

        {(isTalentable || isSkol) && (<>
          <div style={fieldlbl}>Potvrdenie</div>
          <Check on={checks.a} onClick={() => tg("a")}>Som to ja alebo blízka osoba s jej súhlasom, zodpovedám za obsah.</Check>
          {isTalentable && talent && <Check on={checks.b} onClick={() => tg("b")}>Súhlasím s logom / vodoznakom DEED na videu.</Check>}
          {isSkol && <Check on={checks.b} onClick={() => tg("b")}>Čestne vyhlasujem, že mám oprávnenie toto školiť (vzdelanie/skúška/certifikát) a doklady viem predložiť k auditu.</Check>}
        </>)}

        <Btn onClick={submit}>{kind === "help" ? "Zverejniť žiadosť" : isSkol ? "Vytvoriť workshop" : "Pridať skutok"}</Btn>
        <div style={{ textAlign: "center", padding: "14px 0 0", fontSize: 11, color: A.txt3 }}>Pred zverejnením prejde AI kontrolou. {isSkol ? "Lektor = KYC." : ""}</div>
      </div>
    </div>
  );
}
function Ch({ ic, t, s, onClick }: any) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 16, padding: "18px 16px", cursor: "pointer" }}>
      <div style={{ fontSize: 28, width: 40, textAlign: "center" }}>{ic}</div>
      <div><div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div><div style={{ fontSize: 11, color: A.txt3, marginTop: 3 }}>{s}</div></div>
    </div>
  );
}
function Mslot({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <div onClick={onClick} style={{ width: 64, height: 64, border: `1px dashed ${A.line}`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: C.textTer, cursor: "pointer" }}>{children}</div>;
}
function Check({ on, onClick, children }: { on: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClick} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: A.surface2, border: `1px solid ${on ? A.greenBd : A.line}`, borderRadius: 11, padding: 12, marginTop: 10, fontSize: 11.5, color: A.txt2, lineHeight: 1.4, cursor: "pointer" }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: `1px solid ${on ? A.greenBd : A.line}`, background: on ? A.greenBg : "transparent", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: A.green }}>{on ? "✓" : ""}</div>
      <div>{children}</div>
    </div>
  );
}

// ===================== NÁSTENKA =====================
function Board({ dom, toast, home }: any) {
  const a = DOM[dom];
  const list = EVENTS[dom] || EVENTS.mix;
  return (
    <div style={{ paddingBottom: 20 }}>
      <BackBar title="Nástenka" onBack={home} />
      <div style={{ padding: "0 18px 6px", fontSize: 11, color: A.txt3, lineHeight: 1.5 }}>Udalosti vo tvojom okolí · {dom === "mix" ? "všetky domény" : a.label}</div>
      {list.map((e, i) => (
        <div key={i} onClick={() => toast(`Udalosť: ${e[2]}`)} style={{ display: "flex", gap: 12, alignItems: "center", background: A.surface, border: `1px solid ${A.line}`, borderRadius: 13, padding: 12, margin: "0 16px 8px", cursor: "pointer" }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: "none", background: a.bg, color: a.c, border: `1px solid ${a.bd}` }}>
            <div style={{ fontSize: 9, fontWeight: 700 }}>{e[0]}</div><div style={{ fontSize: 11, fontWeight: 700 }}>{e[1]}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{e[2]}</div>
            <div style={{ fontSize: 11, color: A.txt3, marginTop: 2 }}>📍 {e[3]}</div>
          </div>
          <span style={{ color: C.textTer, fontSize: 14 }}>›</span>
        </div>
      ))}
      <div style={{ padding: "14px 18px", fontSize: 11, color: A.txt3, lineHeight: 1.5, textAlign: "center" }}>Klikni na doménu na Domove a Nástenka ukáže udalosti danej oblasti.</div>
    </div>
  );
}

// ===================== PROFIL OSOBY =====================
function OsobaProfil({ name, items, follows, toggleFollow, onOpen, toast, home }: any) {
  const p = osoba(name, items);
  const sledujem = !!follows[name];
  const acc = p.domains[0] ? DOM[p.domains[0]] : DOM.mix;
  const followers = p.followers + (sledujem ? 1 : 0);

  const stat = (b: React.ReactNode, t: string) => (
    <div style={{ flex: 1, textAlign: "center", background: A.surface, border: `1px solid ${A.line}`, borderRadius: 12, padding: "11px 4px" }}>
      <b style={{ fontSize: 16 }}>{b}</b><div style={{ fontSize: 9.5, color: A.txt3, marginTop: 2 }}>{t}</div>
    </div>
  );
  const karmaCol = ({ Gold: A.gold, Silver: "#C9D2DE", Bronze: "#CD8B5E", "Nováčik": A.txt3 } as Record<string, string>)[p.karma] || A.txt3;

  return (
    <div style={{ paddingBottom: 24 }}>
      <BackBar title="Profil" onBack={home} />

      {/* hero */}
      <div style={{ padding: "4px 18px 0", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28, color: "#fff", background: p.pfp, border: `2px solid ${acc.c}` }}>{p.ini}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 19, fontWeight: 800 }}>{p.name}</span>
            {p.verified && <span style={verifS}>overené</span>}
            {p.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, fontSize: 12.5, color: A.txt3 }}>
            <span style={{ color: karmaCol, fontWeight: 700 }}>◆ {p.karma}</span>
            <span>· 📍 {p.loc}</span>
          </div>
        </div>
      </div>

      {/* bio */}
      <p style={{ padding: "12px 18px 0", margin: 0, fontSize: 14, lineHeight: 1.55, color: A.txt2 }}>{p.bio}</p>

      {/* akcie */}
      <div style={{ display: "flex", gap: 10, padding: "14px 18px 0" }}>
        {p.isMe ? (
          <button onClick={() => toast("Toto je tvoj profil — uprav ho v záložke Profil")} style={{ flex: 1, height: 46, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: A.surface2, border: `1px solid ${A.line}`, color: A.txt }}>To si ty ✦</button>
        ) : (
          <button onClick={() => toggleFollow(name)} style={{ flex: 1, height: 46, borderRadius: 12, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", transition: "all .15s ease", background: sledujem ? A.surface2 : acc.c, border: `1px solid ${sledujem ? A.line : acc.c}`, color: sledujem ? A.txt : "#08131A" }}>
            {sledujem ? "✓ Sledujem" : "+ Sledovať"}
          </button>
        )}
        <button onClick={() => toast(p.isMe ? "Tvoj profil" : `Správa pre ${p.name} (demo)`)} style={{ flex: 1, height: 46, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: A.surface2, border: `1px solid ${A.line}`, color: A.txt }}>✉ Správa</button>
      </div>

      {/* štatistiky */}
      <div style={{ display: "flex", gap: 8, padding: "14px 18px 0" }}>
        {stat(p.skutky, "skutkov")}
        {stat(followers.toLocaleString("sk"), "sledovateľov")}
        {stat(p.following, "sleduje")}
        {stat(p.domains.length, "oblastí")}
      </div>

      {/* domény */}
      {p.domains.length > 0 && (
        <div style={{ padding: "16px 18px 0" }}>
          <div style={secLbl}>AKTÍVNY V OBLASTIACH</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {p.domains.map((d) => { const a = DOM[d]; return <Chip key={d} bg={tint(a.c, .14)} c={a.c}>{a.ic} {a.label}</Chip>; })}
          </div>
        </div>
      )}

      {/* príspevky */}
      <div style={{ padding: "16px 18px 0" }}>
        <div style={secLbl}>PRÍSPEVKY ({p.items.length})</div>
        {p.items.length === 0 ? (
          <div style={{ textAlign: "center", color: A.txt3, fontSize: 12, padding: "24px 10px", lineHeight: 1.6 }}>Zatiaľ žiadne príspevky.</div>
        ) : p.items.map((it) => {
          const a = DOM[it.dom];
          const lbl = it.type === "talent" ? "Talent" : it.type === "workshop" ? "Workshop" : it.type === "help" ? "Hľadá pomoc" : it.type === "case" ? "Akcia" : "Skutok";
          return (
            <div key={it.id} onClick={() => onOpen(it.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: A.surface, border: `1px solid ${A.line2}`, borderRadius: 12, marginBottom: 8, cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flex: "none", background: a.bg, border: `1px solid ${a.bd}` }}>{it.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                <div style={{ fontSize: 11, color: A.txt3, marginTop: 2 }}><span style={{ color: a.c, fontWeight: 700 }}>{lbl}</span> · {a.label} · {it.time}</div>
              </div>
              <span style={{ color: C.textTer, fontSize: 14 }}>›</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "8px 18px 0", fontSize: 11, color: A.txt3, lineHeight: 1.5 }}>
        {p.verified ? "Overený člen — totožnosť/aktivita potvrdená komunitou (KYC)." : "Skutky a karma sú verejné a overené komunitou. Sledovaním uvidíš nové príspevky tejto osoby."}
      </div>
    </div>
  );
}
