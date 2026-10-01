import { Emo, IkonaVlajka, IkonaTerc } from "@/components/icons";
import { DeedZnacka } from "@/components/DeedZnacka";
import { NahlasitSheet } from "@/components/nahlasit";
import { useState, useEffect, useRef, memo } from "react";
import { SIRKA, C, inp, btn, GRAD, SPACE, RADIUS } from "@/theme";
import { Foto, MiniFotky, Video, ModulHlavicka, Hlavicka, AvatarUroven, PlatobnyModul, PlatbaModal, HladanieModal, OblubeneHviezda, OblubeneBtn, toast, Oslava, useGaleria, useScrollPamat, useMotiv, useLayout, useStrankaAkcie, useTvorbaGate, StatRiadok, MoniBar, FeedStlpce, FeedGrid, FeedCard, KartaBadge, typKluc, BackChip, ProgresBox, SwipeBack, obalSiroky, Lupa, Zdielanie, IkonaSipVlavo, IkonaMoznosti, IkonaUlozit, IkonaFajka, IkonaPlay, IkonaDoska, IkonaPin, OkruhVyber, QrModal, SplitQrSheet, FotoVyber, FeedSkeleton, EmptyState, ErrorState, ScreenSwitch, FormatovanyText, ZoznamDarcov } from "@/shared";
import { pridajDar, type VolbaDaru } from "@/lib/darcovia";
import { pripravFeed, vzdialenostKm, FEED_CFG, type FeedUser } from "@/lib/feed";
import { tint, tagChip, jeHrdina, HRDINA_COL, rovnakeOkremFunkcii } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { useVrstva } from "@/lib/urlnav";
import { zdielaj, kopiruj, aktualnaUrl } from "@/lib/zdielanie";
import { Sheet } from "@/components/sheet";
import { nahrajSubory } from "@/lib/uploadFoto";
import { Tip } from "@/components/tooltip";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useLokalita } from "@/lib/lokalita";
import { zobrazVelkost, MEDIA_AR } from "@/lib/cardSize";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import type { GoodPolozka, Subjekt, Udalost, OkruhKod, Oblubeny, MojaZbierka, MojDoklad } from "@/types";
import { useGoodFeed, useGoodUdalosti, useTopPrispevky } from "@/data";
import { usePersonalizacia } from "@/lib/personalizacia";
import { KAT, SRC_COL, NASTENKA_TEMY, TEMA_FARBA } from "./mock";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { PruhySkutkov } from "@/features/skutok/Pruhy";
import { useNastaveniaAppky } from "@/lib/nastaveniaAppky";

const katLabel = (k: GoodPolozka["kat"]) => KAT[k].label || k;

// zostav subjekt cudzieho profilu z položky feedu (autor → org/charita alebo osoba)
// exportované — Top (najvýznamnejšie príspevky) otvára rovnaký cudzí profil
export const autorSubjekt = (it: GoodPolozka): Subjekt => it.zdroj === "Charity"
  ? { typ: "org", meno: it.autor, emoji: it.emoji, lok: it.lok, level: it.charLevel || "Gold" }
  : { typ: "osoba", meno: it.autor, level: it.karma || "Silver" };

// položka feedu → záznam obľúbených (bookmark)
const oblubenyZGood = (it: GoodPolozka): Oblubeny => ({
  refId: it.id, typ: it.typ, modul: it.modul || "good",
  nazov: it.titul, emoji: it.emoji, lok: it.lok, vyzbierane: it.vyzbierane, ciel: it.ciel,
});

// poloha usera (MVP mock — Trenčín, Sihoť). Neskôr z GPS/profilu.
// exportované — Top filtruje rebríčky/príspevky podľa okruhu z rovnakej polohy.
export const USER_LOK = { lat: 48.894, lng: 18.044 };

/*
  ============================================================
  MODUL DOMOV — port z deed_prototype.html
  feed skutkov → detail (podpora, QR, overenie komunitou)
  → overujem/namietam → ＋ pridať skutok (AI náhľad)
  ============================================================
*/

const heroGrad = (kat: GoodPolozka["kat"]) => `linear-gradient(160deg, ${KAT[kat].bg}, ${KAT[kat].bg2})`;
// `tint` je teraz var-aware (z @/lib/ui) — zvláda hex aj CSS premenné (var(--a-*) → color-mix).
// Predtým tu bol lokálny hex-only helper, ktorý z premenných robil takmer čiernu (rozbité tinty).
// jednotný „glass" odznak na médiu karty

// ===================== MODUL =====================
export default function ModulDomov({ wide, otvorModul, otvorId, onOtvorene }: { wide?: boolean; otvorModul?: (m: string) => void; otvorId?: string; onOtvorene?: () => void }) {
  const { desktop } = useLayout();
  const { data: POLOZKY = [] } = useGoodFeed();
  const { gate } = useTvorbaGate(); // pasívny nesmie tvoriť (overovanie skutku = create)
  const [screen, setScreen] = useState("home"); // home | detail | verify | board | event | cudzi
  const [pohlad, setPohlad] = useState<"okolie" | "mojdeed">("okolie"); // prežije návrat z detailu (ScreenSwitch remountuje Home)
  // okruh = JEDNO nastavenie okolia pre celú appku (Domov ↔ nástenka ↔ push) — spec Nástenka v1 §1.1
  const { okruh: radius, nastavOkruh: setRadius } = useLokalita();
  const [aktId, setAktId] = useState<string | number | null>(null);
  const [aktEvent, setAktEvent] = useState<string | null>(null);
  const [aktSubjekt, setAktSubjekt] = useState<Subjekt | null>(null); // cudzí profil (§6)
  const [predtym, setPredtym] = useState("home");     // kam sa vrátiť z cudzieho profilu
  const [verifyMode, setVerifyMode] = useState("ok");
  const [oslava, setOslava] = useState<{ suma: number; komu: string } | null>(null); // {suma, komu}
  const [hladaj, setHladaj] = useState(false);

  const otvorProfil = (subjekt: Subjekt, odkial = "home") => { setAktSubjekt(subjekt); setPredtym(odkial); setScreen("cudzi"); };

  // pamäť scrollu: „Späť" z detailu vráti feed tam, kde používateľ skončil (nie skok hore)
  useScrollPamat(screen);

  // pod-obrazovka = vrstva histórie → browser Back sa vráti na feed (nie von z appky)
  useVrstva(screen !== "home", () => setScreen("home"), screen);

  // deep-link na presný detail (/c/{slug} → App resolvne id → sem)
  useEffect(() => {
    if (!otvorId) return;
    const it = POLOZKY.find((x) => String(x.id) === String(otvorId));
    if (it) { setAktId(it.id); setScreen("detail"); onOtvorene?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otvorId, POLOZKY]);

  const oslavuj = (suma: number, komu: string) => { setOslava({ suma, komu }); setTimeout(() => setOslava(null), 1900); };
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  const akt = POLOZKY.find((x) => x.id === aktId);

  return (
    <div style={{ minHeight: "100%" }}>
      <ScreenSwitch k={screen}>
      {screen === "home" && (
        <Home wide={wide} toast={toast} otvorModul={otvorModul}
          pohlad={pohlad} setPohlad={setPohlad} radius={radius} setRadius={setRadius}
          onDetail={(id) => { setAktId(id); setScreen("detail"); }}
          onHladaj={() => setHladaj(true)}
          onBoard={() => setScreen("board")}
          onAdd={() => otvorPridatSkutok()} />
      )}
      {screen === "cudzi" && aktSubjekt && obal(
        <CudziProfil subjekt={aktSubjekt as any} toast={toast} onBack={() => setScreen(predtym)} />
      )}
      {screen === "board" && (
        <DomovBoard onBack={() => setScreen("home")} onEvent={(id) => { setAktEvent(id); setScreen("event"); }} />
      )}
      {screen === "event" && obal(
        <DomovEvent id={aktEvent} onBack={() => setScreen("board")} toast={toast} oslavuj={oslavuj} />
      )}
      {screen === "detail" && akt && obal(
        <SwipeBack onBack={() => setScreen("home")}>
          <DomovDetail it={akt} toast={toast} oslavuj={oslavuj}
            onBack={() => setScreen("home")}
            onAutor={() => otvorProfil(autorSubjekt(akt), "detail")}
            onVerify={(mode) => gate(() => { setVerifyMode(mode); setScreen("verify"); })()} />
        </SwipeBack>
      )}
      {screen === "verify" && akt && obal(
        <DomovVerify it={akt} mode={verifyMode} toast={toast} onBack={() => setScreen("detail")} />
      )}
      </ScreenSwitch>

      {/* akcia beží / ohlásený skutok — tmavý pruh nad tlačidlom ＋ (karty 21, 22) */}
      {screen === "home" && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: desktop ? 100 : "calc(172px + env(safe-area-inset-bottom, 0px))", zIndex: 41, display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
          <div style={{ width: "100%", maxWidth: 620, display: "flex", flexDirection: "column", gap: 12 }}><PruhySkutkov /></div>
        </div>
      )}

      {/* oslava — jednotný celebration overlay (aura prsteň = podpis značky) */}
      {oslava && (
        <Oslava
          emoji={oslava.suma >= 100 ? "🎊" : oslava.suma >= 50 ? "⭐" : "😊"}
          title={oslava.suma >= 100 ? "Skvelé! Veľká podpora!" : "Ďakujeme!"}
          text={<>Tvoja podpora <b style={{ color: C.greenL }}>{oslava.suma} DeeD</b> letí k {oslava.komu}. Reťaz dobra pokračuje.</>}
          onClose={() => setOslava(null)}
        />
      )}

      {hladaj && (
        <HladanieModal akcent="var(--a-info)" placeholder="Hľadať skutky, žiadosti, ľudí…"
          data={POLOZKY.map((it) => ({
            id: it.id, titul: it.titul, podtitul: `${it.autor} · ${it.lok}`, kat: it.kat, emoji: it.emoji,
            tag: it.typ === "ziadost" ? "Žiadosť" : it.typ === "charita" ? "Charita" : katLabel(it.kat),
          }))}
          onPick={(id) => { setAktId(id as number); setScreen("detail"); }}
          onSubjekt={(s) => otvorProfil(s, "home")}
          toast={toast} defaultFilter="Všetko"
          onClose={() => setHladaj(false)} />
      )}

    </div>
  );
}

type HomeProps = {
  wide?: boolean;
  toast: (m: string) => void;
  otvorModul?: (m: string) => void;
  pohlad: "okolie" | "mojdeed";
  setPohlad: (p: "okolie" | "mojdeed") => void;
  radius: OkruhKod;
  setRadius: (r: OkruhKod) => void;
  onDetail: (id: string | number) => void;
  onHladaj: () => void;
  onBoard: () => void;
  onAdd: () => void;
};

// ===================== HOME / FEED =====================
function Home({ wide, toast, otvorModul, pohlad, setPohlad, radius, setRadius, onDetail, onHladaj, onBoard, onAdd }: HomeProps) {
  const { data: POLOZKY = [], isLoading, isError, refetch } = useGoodFeed();
  // `radius` aj `pohlad` žijú v ModulDomov (prežijú návrat z detailu) — sem prichádzajú cez props
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const nastavenia = useNastaveniaAppky(); // karta 24 · 2d: „podľa polohy" pri okruhu
  const lokalita = useLokalita();
  const ja = usePouzivatel();
  const { desktop } = useLayout();
  const { gate } = useTvorbaGate();
  const { sledovaniMena } = usePersonalizacia();
  const lok = useLokalita(); // aktívne mesto = stred feedu (prepínateľné)
  // afinita = LEN sledovaní (re-rank, NIE filter) — témy feed nečíta (v1.1 kánon)
  const user: FeedUser = { lat: lok.lat, lng: lok.lng, radius, sledovani: sledovaniMena };

  // FEED ALGORITMUS (Časť B): životnosť → rádius + adaptívny prah →
  // frekvenčný strop → zoradenie. Veľkosť karty (Časť A) cez zobrazVelkost.
  // Lacné: pracuje len s uloženým skóre, žiadne AI. (Neskôr: GET /feed na backende.)
  const feed = pripravFeed(POLOZKY as any, user).map((it: any) => ({ ...it, velkost: zobrazVelkost(it) })) as GoodPolozka[];
  const karta = (it: GoodPolozka) => <DomovKarta key={it.id} it={it} wide={wide} onDetail={() => onDetail(it.id)} />;

  // kontextové akcie stránky → plávajúce „+ Pridať" dole + sekcia „Na tejto stránke" v menu (☰)
  useStrankaAkcie(() => ({
    pridat: { id: "add", label: "Pridať", onClick: onAdd },
    extra: [
      { id: "talent", label: "Ukáž svoj talent", popis: "TikTok kanál skutkov", ikona: <IkonaPlay size={18} color="var(--a-green)" />, onClick: gate(() => toast("Ukáž svoj talent — TikTok kanál")) },
      { id: "board", label: "Nástenka", popis: "Skutky a výzvy v okolí", ikona: <IkonaDoska size={18} color="var(--a-green)" />, onClick: onBoard },
    ],
  }), []);

  // štatistický riadok — počet vo zvolenom okruhu + klikateľný výber okruhu
  const statRiadok = (
    <StatRiadok pocet={feed.length} jednotka="skutkov" mesiac="9 480" miesto={nastavenia.odPolohy ? `${lokalita.mesto} · podľa polohy` : ja.mesto}
      okruh={FEED_CFG.radiusy[radius].krat} onOkruh={() => setVyberOkruh(true)} />
  );

  // „TOP DNES" — vodorovný pruh najvýznamnejších skutkov (rovnaký zdroj ako modul Top).
  // Highlight nad feedom; klik → detail. Skryje sa, kým nie sú dáta (žiadny prázdny flash).
  const topPruh = <TopPruh radius={radius} onDetail={onDetail} />;

  // telo Okolia — desktop: jednotný 3-stĺpcový grid (masonry); mobil/tablet: 1–2 stĺpce
  const okolieFeed = isError ? (
    <ErrorState onRetry={() => refetch()} />
  ) : isLoading ? (
    <FeedSkeleton count={4} />
  ) : feed.length === 0 ? (
    <EmptyState emoji="🤝" title="Vo zvolenom okruhu zatiaľ nie sú skutky" text="Skús väčší okruh alebo sa vráť neskôr." />
  ) : desktop ? (
    <FeedGrid cols={3} cards={feed.map(karta)} />
  ) : (
    <FeedStlpce wide={wide}
      labelSkutky="Skutky" labelZiadosti="Žiadosti & charita"
      jednoStlpec={feed.map(karta)}
      skutky={feed.filter((it) => it.typ === "skutok").map(karta)}
      ziadosti={feed.filter((it) => it.typ !== "skutok").map(karta)}
    />
  );

  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      {/* header — jednotná hlavička (logo D⁺ + názov + hľadanie/upozornenia + profil) */}
      <ModulHlavicka title="Domov" karma={ja.demo ? "Gold · celková" : `${String(ja.tier).replace(/\s*·\s*L\d+/, "")} · celková`}
        right={
          <>
            <span {...pressable(onHladaj, "Hľadať")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={C.textSec} /></span>
            <Zvoncek color={C.textSec} toast={toast} />
            <AvatarUroven ini={ja.iniciala} foto={ja.foto} tint={ja.tint} tier={ja.tier} size={34} onClick={() => otvorModul && otvorModul("profil")} title={ja.tier} />
          </>
        } />

      {desktop ? (
        /* DESKTOP — Okolie (3 kategórie) + Môj DEED bočný panel naraz, bez prepínania */
        <div style={{ display: "flex", gap: SPACE.md, alignItems: "flex-start", padding: `0 ${SPACE.lg}px` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {statRiadok}
            {topPruh}
            {okolieFeed}
          </div>
          <aside style={{ width: 408, flex: "0 0 408px", minWidth: 0 }}>
            <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 800, margin: `${SPACE.xxs}px 0 ${SPACE.sm}px`, paddingLeft: SPACE.xxs }}>MÔJ <DeedZnacka /></div>
            <MojDeedObsah onDetail={onDetail} onBoard={onBoard} toast={toast} />
          </aside>
        </div>
      ) : (
        <>
          {/* prepínač Okolie (algoritmický feed v okruhu) | Môj DEED (osobný prehľad) */}
          <PohladSwitch pohlad={pohlad} setPohlad={setPohlad} />
          {pohlad === "mojdeed" ? (
            <MojDeed wide={wide} onDetail={onDetail} onBoard={onBoard} toast={toast} />
          ) : (
            <>
              {statRiadok}
              {topPruh}
              {okolieFeed}
            </>
          )}
        </>
      )}

      {vyberOkruh && <OkruhVyber radius={radius}
        onPick={(r: string) => { setRadius(r as OkruhKod); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}

// ===================== PREPÍNAČ POHĽADU (Okolie | Môj DEED) =====================
function PohladSwitch({ pohlad, setPohlad }: { pohlad: string; setPohlad: (p: "okolie" | "mojdeed") => void }) {
  const tab = (key: "okolie" | "mojdeed", label: React.ReactNode) => {
    const on = pohlad === key;
    return (
      <button onClick={() => setPohlad(key)} aria-current={on ? "page" : undefined} style={{
        flex: 1, height: 38, borderRadius: RADIUS.sm, fontFamily: "inherit", cursor: "pointer",
        border: `1px solid ${on ? "color-mix(in srgb, var(--a-info) 45%, transparent)" : "transparent"}`,
        background: on ? "color-mix(in srgb, var(--a-info) 14%, transparent)" : "transparent",
        color: on ? "var(--a-info)" : C.textSec, fontWeight: on ? 800 : 600, fontSize: 13.5,
        transition: "all .15s ease",
      }}>{label}</button>
    );
  };
  return (
    <div style={{ display: "flex", gap: SPACE.xxs, padding: SPACE.xxs, margin: `0 ${SPACE.md}px ${SPACE.xs}px`, borderRadius: RADIUS.md, background: C.surface2, border: `1px solid ${C.line}` }}>
      {tab("okolie", "Okolie")}
      {tab("mojdeed", <>Môj <DeedZnacka /></>)}
    </div>
  );
}

// ===================== MÔJ DEED — osobný prehľad =====================
// Záujmy (editor) · ľudia, ktorých sledujem + ich najnovšie · čo podporujem ·
// Nástenka filtrovaná záujmami. Číta zo zdieľaného personalizačného store.
const stopProp = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

function MojDeed({ wide, onDetail, onBoard, toast }: { wide?: boolean; onDetail: (id: string | number) => void; onBoard: () => void; toast: (m: string) => void }) {
  const obal: React.CSSProperties | undefined = wide ? { maxWidth: 620, margin: "0 auto" } : undefined;
  return <div style={obal}><MojDeedObsah onDetail={onDetail} onBoard={onBoard} toast={toast} /></div>;
}

// obsah Môj DEED (3 sekcie) — zdieľa mobilný plný pohľad aj desktop bočný panel
function MojDeedObsah({ onDetail, onBoard, toast }: { onDetail: (id: string | number) => void; onBoard: () => void; toast: (m: string) => void }) {
  const { data: POLOZKY = [] } = useGoodFeed();
  const { data: EVENTS = [] } = useGoodUdalosti();
  const { zaujmy, zaujmyKluce, sledovani, toggleSledovanie, podpory, oblubene, mojeZbierky, upravZbierku } = usePersonalizacia();
  const [spravovana, setSpravovana] = useState<string | null>(null); // id zbierky v správe
  const zbierkaVSprave = mojeZbierky.find((z) => z.id === spravovana) || null;
  const modulLabel: Record<string, string> = { help: "Help", charity: "Charita", good: "Domov", workshop: "Talent", nabozenstvo: "Viera" };

  const maZaujmy = zaujmy.length > 0;

  // ľudia + ich najnovší príspevok (z feedu Domov)
  const ludia = sledovani.map((s) => ({ s, last: POLOZKY.find((p) => p.autor === s.meno) }));

  // podpory — kde sa dá, dotiahni živý progres z feedu (inak snapshot „k momentu podpory")
  const podporyRows = podpory.map((p) => {
    const live = POLOZKY.find((x) => String(x.id) === String(p.refId));
    return {
      p,
      id: live?.id,
      titul: live?.titul || p.komu || "Podpora",
      vyzbierane: live?.vyzbierane ?? p.vyzbierane,
      ciel: live?.ciel ?? p.ciel,
    };
  });

  // Nástenka filtrovaná záujmami (bez záujmov ukáž všetko)
  const mojeUdalosti = maZaujmy ? EVENTS.filter((e) => zaujmyKluce.has(e.kat)) : EVENTS;
  const tops = mojeUdalosti.filter((e) => e.top);

  return (
    <>
      {/* moje zbierky — čo som vytvoril (spravovanie: ukončiť, vyúčtovať, poďakovať) */}
      <div style={{ padding: `${SPACE.xxs}px ${SPACE.md}px 0` }}>
        <SekciaLabel>MOJE ZBIERKY ({mojeZbierky.length})</SekciaLabel>
        {mojeZbierky.length === 0 ? (
          <PrazdnyTip ikona={<IkonaTerc size={22} color="var(--a-green)" />} text="Keď vytvoríš zbierku alebo žiadosť (Domov, Help, Charita), objaví sa tu — vieš ju spravovať: ukončiť, podať vyúčtovacie doklady a poslať darcom poďakovanie." />
        ) : mojeZbierky.map((z) => {
          const st = STAV_ZBIERKY[z.stav];
          return (
            <div key={z.id} onClick={() => setSpravovana(z.id)}
              style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
                <span style={{ width: 34, height: 34, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: "rgba(var(--glass-rgb),.06)" }}>{z.emoji || "🎯"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z.nazov}</div>
                  <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>{modulLabel[z.modul] || z.modul}{z.lok ? ` · ${z.lok}` : ""}</div>
                </div>
                <span style={{ flex: "none", fontSize: 10.5, fontWeight: 800, color: st.col, background: tint(st.col, .14), borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{st.label}</span>
              </div>
              {z.ciel ? <div style={{ marginTop: SPACE.xs }}><MoniBar vyzbierane={z.vyzbierane || 0} ciel={z.ciel} mini /></div> : null}
              <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.xs, flexWrap: "wrap" }}>
                {z.doklady?.length ? <ZbierkaStopa ic="🧾" t={`${z.doklady.length} dokladov`} /> : null}
                {z.dakovnaSprava ? <ZbierkaStopa ic="💌" t="poďakovanie" /> : null}
                {z.dakovneVideo ? <ZbierkaStopa ic="🎬" t="video" /> : null}
                <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: "var(--a-info)" }}>Spravovať ›</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* čo podporujem — hlavný obsah Môj DEED */}
      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <SekciaLabel>ČO PODPORUJEM ({podpory.length})</SekciaLabel>
        {podpory.length === 0 ? (
          <PrazdnyTip emoji="💚" text="Keď niekoho podporíš (skutok, žiadosť, charita), uvidíš tu jeho progres a svoju stopu." />
        ) : podporyRows.map(({ p, id, titul, vyzbierane, ciel }) => (
          <div key={String(p.refId)} onClick={() => id && onDetail(id)} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, cursor: id ? "pointer" : "default" }}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
              <span style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titul}</span>
              {p.suma ? <span style={{ flex: "none", fontSize: 11, fontWeight: 700, color: "var(--a-green)", background: "rgba(31,191,143,.12)", borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>tvojich {p.suma} {p.kanal === "EUR" ? "€" : "DeeD"}</span> : null}
            </div>
            {ciel ? <div style={{ marginTop: SPACE.xs }}><MoniBar vyzbierane={vyzbierane || 0} ciel={ciel} mini /></div>
              : <div style={{ fontSize: 11.5, color: C.textTer, marginTop: SPACE.xs }}>otvorená podpora · ďakujeme</div>}
          </div>
        ))}
      </div>

      {/* obľúbené — uložené príspevky (bookmark) */}
      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <SekciaLabel>OBĽÚBENÉ ({oblubene.length})</SekciaLabel>
        {oblubene.length === 0 ? (
          <PrazdnyTip emoji="★" text="Ťukni na hviezdičku pri príspevku (Domov, Help, Charita) a uloží sa sem — rýchly prístup k tomu, čo ťa zaujalo." />
        ) : oblubene.map((o) => {
          const jeGood = o.modul === "good";
          return (
            <div key={String(o.refId)} onClick={() => jeGood ? onDetail(o.refId) : toast(`${o.nazov} — otvor v module ${modulLabel[o.modul] || o.modul}`)}
              style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, cursor: "pointer" }}>
              <span style={{ width: 34, height: 34, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: "rgba(var(--glass-rgb),.06)" }}>{o.emoji || "★"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.nazov}</div>
                <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>{modulLabel[o.modul] || o.modul}{o.lok ? ` · ${o.lok}` : ""}</div>
              </div>
              {o.ciel ? <div style={{ width: 84, flex: "none" }}><MoniBar vyzbierane={o.vyzbierane || 0} ciel={o.ciel} mini /></div> : <span style={{ color: C.textTer, fontSize: 16, flex: "none" }}>›</span>}
            </div>
          );
        })}
      </div>

      {/* koho sledujem — hneď pod podporou */}
      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <SekciaLabel>KOHO SLEDUJEM ({sledovani.length})</SekciaLabel>
        {sledovani.length === 0 ? (
          <PrazdnyTip emoji="👋" text={'Zatiaľ nikoho nesleduješ. V „Okolí" alebo na profile niekoho klikni „Sledovať" — objaví sa tu aj s najnovšími skutkami.'} />
        ) : ludia.map(({ s, last }) => (
          <div key={s.meno} onClick={() => last && onDetail(last.id)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line2}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: last ? "pointer" : "default" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", background: last?.pfp || s.tint || "var(--a-info)" }}>{last?.ini || s.meno[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.meno}</div>
              <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last ? last.titul : "zatiaľ žiadny nový skutok v okolí"}</div>
            </div>
            <span onClick={stopProp(() => { toggleSledovanie({ meno: s.meno, typ: s.typ }); toast(`Prestal si sledovať ${s.meno}`); })}
              title="Prestať sledovať" style={{ flex: "none", fontSize: 12, fontWeight: 800, color: "var(--a-green)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px`, cursor: "pointer" }}>✓</span>
          </div>
        ))}
      </div>

      {/* Nástenka filtrovaná záujmami */}
      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SekciaLabel>NÁSTENKA{maZaujmy ? " · podľa záujmov" : ""}</SekciaLabel>
          <span onClick={onBoard} style={{ fontSize: 11.5, color: "var(--a-info)", fontWeight: 700, cursor: "pointer" }}>Celá Nástenka ›</span>
        </div>
        {mojeUdalosti.length === 0 ? (
          <PrazdnyTip emoji="📅" text="Pre tvoje záujmy teraz nie sú udalosti. Skús pridať záujem alebo otvor celú Nástenku." />
        ) : (
          <>
            {tops.length > 0 && (
              <div style={{ display: "flex", gap: SPACE.sm, overflowX: "auto", paddingBottom: SPACE.xs }}>
                {tops.map((e) => (
                  <div key={e.id} onClick={onBoard} style={{ minWidth: 150, flex: "0 0 auto", background: C.surface2, border: "1px solid rgba(231,199,102,.3)", borderRadius: RADIUS.md, overflow: "hidden", cursor: "pointer" }}>
                    <div style={{ height: 60, background: heroGrad(e.kat), display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: C.gold }}>★</span>
                      <span style={{ fontSize: 18, color: KAT[e.kat].c }}>▶</span>
                    </div>
                    <div style={{ padding: `${SPACE.xs}px ${SPACE.sm}px` }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: KAT[e.kat].c }}>{e.when}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                      <div style={{ fontSize: 9, color: C.textTer, marginTop: 2 }}>{e.who}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mojeUdalosti.map((e) => (
              <div key={e.id} onClick={onBoard} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line2}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: SRC_COL[e.src], flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                  <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 3 }}>{e.who} · {e.src}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: SRC_COL[e.src], flex: "none" }}>{e.when}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* správa mojej zbierky — bottom-sheet (ukončiť · vyúčtovanie · poďakovanie) */}
      {zbierkaVSprave && (
        <SpravaZbierky z={zbierkaVSprave} upravZbierku={upravZbierku} toast={toast} onClose={() => setSpravovana(null)} />
      )}
    </>
  );
}

// stav zbierky → štítok (farba + label)
const STAV_ZBIERKY: Record<string, { label: string; col: string }> = {
  aktivna: { label: "Aktívna", col: "var(--a-green)" },
  ukoncena: { label: "Ukončená", col: "var(--a-info)" },
  vyuctovana: { label: "Vyúčtovaná", col: "var(--a-gold)" },
};
function ZbierkaStopa({ ic, t }: { ic: string; t: string }) {
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textTer, background: "rgba(var(--glass-rgb),.06)", borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{ic} {t}</span>;
}

// ===================== SPRÁVA MOJEJ ZBIERKY (bottom-sheet) =====================
// Vlastník zbierky ju tu ukončí, priloží vyúčtovacie doklady a pošle darcom
// ďakovnú správu / ďakovné video. Mock — mení lokálny stav cez upravZbierku.
function SpravaZbierky({ z, upravZbierku, toast, onClose }: {
  z: MojaZbierka; upravZbierku: (id: string, patch: Partial<MojaZbierka>) => void; toast: (m: string) => void; onClose: () => void;
}) {
  const [panel, setPanel] = useState<"" | "doklady" | "sprava" | "video">("");
  const [text, setText] = useState(z.dakovnaSprava || "");
  const dokladInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const doklady = z.doklady || [];
  const st = STAV_ZBIERKY[z.stav];

  const pridajDoklady = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const nahrane = await nahrajSubory(Array.from(files), "doklady"); // Storage (alebo len názov v mocku)
    const cas = new Date().toISOString();
    const nove: MojDoklad[] = nahrane.map((n) => ({ nazov: n.nazov, url: n.url, cas }));
    upravZbierku(z.id, { doklady: [...doklady, ...nove] });
    toast(`Priložené doklady: ${nove.length}`);
  };
  const ukonci = () => { upravZbierku(z.id, { stav: "ukoncena" }); toast("Zbierka ukončená — už neprijíma príspevky"); };
  const podajVyuctovanie = () => {
    if (!doklady.length) { toast("Najprv prilož aspoň jeden doklad"); return; }
    upravZbierku(z.id, { stav: "vyuctovana" }); toast("Vyúčtovanie podané — doklady odoslané na kontrolu"); setPanel("");
  };
  const odosliSpravu = () => {
    if (!text.trim()) { toast("Napíš text poďakovania"); return; }
    upravZbierku(z.id, { dakovnaSprava: text.trim() }); toast("Ďakovná správa odoslaná darcom 💌"); setPanel("");
  };
  const priloziVideo = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const [v] = await nahrajSubory(Array.from(files), "video"); // Storage (alebo len názov v mocku)
    upravZbierku(z.id, { dakovneVideo: true, dakovneVideoUrl: v?.url });
    toast("Ďakovné video priložené 🎬 — darcovia dostanú notifikáciu"); setPanel("");
  };

  const akcia = (ic: string, titul: string, popis: string, on: boolean, onClick: () => void, hotovo?: boolean) => (
    <div {...pressable(onClick, titul)}
      style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: on ? tint("var(--a-info)", .1) : C.surface2, border: `1px solid ${on ? tint("var(--a-info)", .4) : C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, cursor: "pointer" }}>
      <span style={{ width: 36, height: 36, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: "rgba(var(--glass-rgb),.06)" }}>{ic}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{titul}{hotovo ? " ✓" : ""}</div>
        <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>{popis}</div>
      </div>
      <span style={{ color: C.textTer, fontSize: 16 }}>{on ? "▾" : "›"}</span>
    </div>
  );
  const cta = (label: string, onClick: () => void, kind: "primary" | "ghost" = "primary"): React.ReactNode => (
    <button onClick={onClick} style={{ ...btn(kind), width: "100%", marginTop: SPACE.sm }}>{label}</button>
  );

  return (
    <Sheet onClose={onClose} label="Správa zbierky">
      {/* hlavička */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
        <span style={{ width: 40, height: 40, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "rgba(var(--glass-rgb),.06)" }}>{z.emoji || "🎯"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{z.nazov}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>Moja zbierka · spravovanie</div>
        </div>
        <span style={{ flex: "none", fontSize: 11, fontWeight: 800, color: st.col, background: tint(st.col, .14), borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{st.label}</span>
      </div>
      {z.ciel ? <div style={{ marginBottom: SPACE.md }}><MoniBar vyzbierane={z.vyzbierane || 0} ciel={z.ciel} /></div> : null}

      {/* 1 — ukončiť */}
      {z.stav === "aktivna"
        ? akcia("■", "Ukončiť zbierku", "Zastaví príjem príspevkov. Potom môžeš vyúčtovať.", false, ukonci)
        : akcia("✔", "Zbierka ukončená", "Príjem príspevkov je zastavený.", false, () => {}, true)}

      {/* 2 — vyúčtovacie doklady */}
      {akcia("🧾", "Vyúčtovacie doklady", doklady.length ? `${doklady.length} priložených${z.stav === "vyuctovana" ? " · podané" : ""}` : "Prilož bločky/faktúry o použití", panel === "doklady", () => setPanel(panel === "doklady" ? "" : "doklady"), z.stav === "vyuctovana")}
      {panel === "doklady" && (
        <div style={{ padding: `0 ${SPACE.xs}px ${SPACE.sm}px` }}>
          {doklady.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, fontSize: 12.5, color: C.textSec, padding: `${SPACE.xs}px 0`, borderBottom: `1px solid ${C.line2}` }}>
              <span>📄</span><span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.nazov}</span>
            </div>
          ))}
          {doklady.length === 0 && <div style={{ fontSize: 12, color: C.textTer, padding: `${SPACE.xs}px 0` }}>Zatiaľ žiadne doklady.</div>}
          <input ref={dokladInput} type="file" multiple accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => pridajDoklady(e.target.files)} />
          {cta("＋ Priložiť doklad", () => dokladInput.current?.click(), "ghost")}
          {z.stav !== "vyuctovana" && cta("Podať vyúčtovanie", podajVyuctovanie)}
        </div>
      )}

      {/* 3 — ďakovná správa */}
      {akcia("💌", "Ďakovná správa", z.dakovnaSprava ? "Odoslaná darcom" : "Napíš poďakovanie darcom", panel === "sprava", () => setPanel(panel === "sprava" ? "" : "sprava"), !!z.dakovnaSprava)}
      {panel === "sprava" && (
        <div style={{ padding: `0 ${SPACE.xs}px ${SPACE.sm}px` }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Ďakujeme, vďaka vám sme…"
            style={{ ...inp(), width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
          {cta("Odoslať darcom", odosliSpravu)}
        </div>
      )}

      {/* 4 — ďakovné video */}
      {akcia("🎬", "Ďakovné video", z.dakovneVideo ? "Priložené" : "Nahraj krátke video pre darcov", panel === "video", () => setPanel(panel === "video" ? "" : "video"), !!z.dakovneVideo)}
      {panel === "video" && (
        <div style={{ padding: `0 ${SPACE.xs}px ${SPACE.sm}px` }}>
          <input ref={videoInput} type="file" accept="video/*" capture="environment" style={{ display: "none" }} onChange={(e) => priloziVideo(e.target.files)} />
          <div style={{ fontSize: 12, color: C.textTer, marginBottom: SPACE.xs, lineHeight: 1.5 }}>Krátke poďakovanie (do ~60 s) sa pošle darcom ako notifikácia a zobrazí sa pri zbierke.</div>
          {cta("🎬 Nahrať / priložiť video", () => videoInput.current?.click())}
        </div>
      )}

      <div style={{ fontSize: 10.5, color: C.textTer, textAlign: "center", padding: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>Ukončenie a vyúčtovanie sú evidované — doklady aj poďakovanie vidia darcovia pri zbierke.</div>
    </Sheet>
  );
}

function PrazdnyTip({ emoji, ikona, text }: { emoji?: string; ikona?: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center", background: "rgba(var(--glass-rgb),.04)", border: `1px dashed ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.gutter}px ${SPACE.gutter}px`, marginBottom: SPACE.xs }}>
      <span style={{ fontSize: 22, flex: "none", display: "flex" }}>{ikona ?? (emoji ? <Emo e={emoji} /> : null)}</span>
      <span style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}


function ZdrojTag({ it }: { it: GoodPolozka }) {
  if (it.zdroj === "Help") return <span style={tagChip(C.red)}>Help · žiadosť</span>;
  if (it.zdroj === "Charity") return <span style={tagChip(C.gold)}>✓ Charita {it.charLevel || ""}</span>;
  // plain skutok: ukáž TYP (Skutok), nie kategóriu (Komunita/Zdravie…) — jednotné rozdelenie
  return <span style={tagChip("var(--a-green)")}>Skutok</span>;
}

// ===================== TOP DNES — pruh najvýznamnejších skutkov =====================
// Vodorovný carousel nad feedom Domov. Zdroj = `useTopPrispevky` (rovnaké skutky ako
// modul Top, zoradené podľa skóre). Highlight, ktorý ťahá pozornosť na špičku; klik → detail.
function TopPruh({ radius, onDetail }: { radius: OkruhKod; onDetail: (id: string | number) => void }) {
  const { wide } = useLayout();
  const { data: top = [], isLoading } = useTopPrispevky();
  const lok = useLokalita();
  // rovnaké pravidlo ako modul Top: haversine ≤ dosah okruhu; národné/bez-geo prebíjajú prah.
  const km = FEED_CFG.radiusy[radius].km;
  const vidno = top.filter((x) => x.narodne || x.lat == null || vzdialenostKm(lok, x) <= km);
  if (isLoading || vidno.length === 0) return null; // bez dát / nič v okruhu → pruh sa nezobrazí
  const inset = `0 ${SPACE.gutter}px`;
  return (
    <div style={{ marginBottom: SPACE.sm }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, margin: `${SPACE.xs}px 0`, padding: inset }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>🔥</span>
        <span style={{ fontSize: 11, letterSpacing: ".4px", color: C.textTer, fontWeight: 800 }}>TOP DNES · NAJVÄČŠIE SKUTKY</span>
        {!wide && <span style={{ marginLeft: "auto", fontSize: 10.5, color: C.textTer, fontWeight: 700 }}>potiahni ›</span>}
      </div>
      {wide ? (
        /* tablet/desktop: kompaktné mini-karty */
        <div style={{ display: "flex", gap: SPACE.sm, overflowX: "auto", padding: `0 ${SPACE.gutter}px ${SPACE.xs}px` }}>
          {vidno.map((it, i) => <TopPruhKarta key={it.id} it={it} rank={i + 1} onClick={() => onDetail(it.id)} />)}
        </div>
      ) : (
        /* mobil: dominantné karty (veľké ako bežné príspevky) v horizontálnom snap-carousele.
           Šírka 88 % → ďalšia karta vždy „vykúka" (jasný signál, že sa dá skrolovať). */
        <div style={{ display: "flex", gap: SPACE.sm, overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", padding: `0 ${SPACE.gutter}px ${SPACE.xs}px` }}>
          {vidno.map((it) => (
            <div key={it.id} style={{ flex: "0 0 88%", scrollSnapAlign: "start", minWidth: 0 }}>
              <DomovKarta it={it} wide onDetail={() => onDetail(it.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopPruhKarta({ it, rank, onClick }: { it: GoodPolozka; rank: number; onClick: () => void }) {
  const thumb = it.fotky?.[0];
  const prvy = rank === 1;
  return (
    <div {...pressable(onClick, `Otvoriť: ${it.titul}`)} style={{ width: 172, flex: "0 0 auto", background: C.surface2, border: `1px solid ${prvy ? tint(C.gold, .5) : C.line}`, borderRadius: RADIUS.md, overflow: "hidden", cursor: "pointer", boxShadow: prvy ? `0 4px 16px ${tint(C.gold, .14)}` : undefined }}>
      <div style={{ position: "relative", height: 96, background: thumb ? `center/cover no-repeat url("${thumb}")` : heroGrad(it.kat), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.42), transparent 55%)", pointerEvents: "none" }} />
        <span style={{ position: "absolute", top: 7, left: 7, fontSize: 10.5, fontWeight: 800, color: prvy ? "#1b1407" : "#fff", background: prvy ? "var(--a-gold)" : "rgba(8,11,18,.62)", borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px`, border: prvy ? "none" : "1px solid rgba(255,255,255,.22)" }}>{prvy ? "🏆 1" : `#${rank}`}</span>
        {it.media === "video" && <span style={{ position: "absolute", top: 7, right: 7, fontSize: 9, fontWeight: 700, color: "#fff", background: "rgba(8,11,18,.62)", borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px` }}>▶</span>}
        {it.overene && <span style={{ position: "absolute", bottom: 7, left: 7, fontSize: 9, fontWeight: 800, color: "#fff", background: "rgba(46,125,82,.85)", borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px` }}>✓ overené</span>}
      </div>
      <div style={{ padding: `${SPACE.xs}px ${SPACE.sm}px ${SPACE.sm}px` }}>
        <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 31 }}>{it.titul}</div>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, marginTop: 4, minWidth: 0 }}>
          <span style={{ width: 16, height: 16, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, color: "#fff", background: it.pfp || "var(--a-info)" }}>{it.ini || it.autor?.[0]}</span>
          <span style={{ fontSize: 10.5, color: C.textTer, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.autor}</span>
        </div>
      </div>
    </div>
  );
}

// JEDNOTNÁ karta = zdieľaná FeedCard (rovnaká anatómia ako Help/Charita/Aktivity);
// Good mapuje skutok/charitu/žiadosť do slotov. Exportovaná — Top renderuje identickú kartu.
// memo: karta sa re-renderuje len keď sa zmení JEJ položka/wide (inline onDetail
// closure sa ignoruje — zachytáva stabilné settery, viď rovnakeOkremFunkcii)
export const DomovKarta = memo(DomovKartaBase, rovnakeOkremFunkcii);
function DomovKartaBase({ it, wide, onDetail }: { it: GoodPolozka; wide?: boolean; onDetail: () => void }) {
  const { svetly } = useMotiv();
  const kat = KAT[it.kat];
  const jeZiadost = it.typ === "ziadost";
  const jeCharita = it.typ === "charita";
  const overCol = svetly ? "#0F8A5E" : "var(--a-green)";
  const accent = jeZiadost ? C.red : jeCharita ? C.gold : kat.c;
  return (
    <FeedCard wide={wide} onClick={onDetail} label={`Otvoriť: ${it.titul}`} typ={typKluc(it.typ)}
      accent={jeZiadost ? C.red : undefined} ring={it.topovane ? C.gold : undefined}
      autor={{
        meno: it.autor, pfp: it.pfp, ini: it.ini, lok: it.lok, karma: it.karma, cas: it.cas, glow: accent,
        chips: (
          <>
            {it.typ === "skutok" && jeHrdina(it.karma) && <span style={tagChip(HRDINA_COL)}>Hrdina</span>}
            {it.overene && <span style={tagChip(overCol)}><IkonaFajka size={11} color={overCol} /> overené</span>}
            {(jeZiadost || jeCharita) && <ZdrojTag it={it} />}
          </>
        ),
      }}
      media={{
        video: it.video, fotky: it.fotky, emoji: it.media === "kreslene" ? "✎" : it.emoji,
        grad: heroGrad(it.kat), h: 280, emojiH: it.video || it.fotky?.length ? undefined : (wide ? 132 : 168),
        overlay: (
          <>
            {/* typ (Skutok/Žiadosť/Charita) rieši FeedCard vľavo hore; kategória (Komunita/Zdravie…) a „★ TOP/Výnimočný" štítok odstránené */}
            {it.media === "video" && <KartaBadge pos={{ top: 10, right: 10 }}>▶ video</KartaBadge>}
            <OblubeneHviezda polozka={oblubenyZGood(it)} />
          </>
        ),
      }}
      title={it.titul}
      titleChips={it.topovane ? <span style={tagChip(C.gold)}>★ TOP</span> : undefined}
      progress={(jeCharita || jeZiadost) && it.ciel ? { vyzbierane: it.vyzbierane || 0, ciel: it.ciel, ludia: jeZiadost ? it.pomocnici : undefined } : undefined}
      footer={jeZiadost && !it.ciel ? <div style={{ fontSize: 12.5, marginTop: SPACE.xs, fontWeight: 600, color: C.red }}>❓ {it.pomocnici} ľudí sa zapojilo · <span style={{ color: C.textSec, fontWeight: 400 }}>otvorená podpora</span></div> : undefined}
    />
  );
}

type GoodDetailProps = {
  it: GoodPolozka;
  toast: (m: string) => void;
  oslavuj: (suma: number, komu: string) => void;
  onBack: () => void;
  onVerify: (mode: string) => void;
  onAutor: () => void;
};

// ===================== DETAIL =====================
// Exportovaný — Top „Najvýznamnejšie príspevky" otvára rovnaký detail (podpora/QR/overenie).
export function DomovDetail({ it, toast, oslavuj, onBack, onVerify, onAutor }: GoodDetailProps) {
  const [platba, setPlatba] = useState<string | null>(null); // "EUR" | "DEED"
  const [qr, setQr] = useState(false);        // QR skutku (§10) — 3 výstupy
  const [split, setSplit] = useState(false);  // split QR — reťaz dobra §10 × §9
  const [moznosti, setMoznosti] = useState(false); // „⋯" menu — zdieľať/kopírovať/uložiť/QR/nahlásiť
  const [nahlasit, setNahlasit] = useState(false); // OPRAVY 51
  const otvorGaleriu = useGaleria();
  const { wide } = useLayout();
  const ja = usePouzivatel();
  const { pridajPodporu, jeOblubene, toggleOblubene } = usePersonalizacia(); // podpora → „Čo podporujem" v Môj DEED
  const darRef = `good-${it.id}`; // kľúč skutku v zozname darcov
  const maHero = !!(it.video || it.fotky?.length);
  const jeZiadost = it.typ === "ziadost", jeCharita = it.typ === "charita";
  const maProgres = (jeZiadost && it.ciel) || jeCharita;

  // zaznamenaj podporu do zdieľaného store (snapshot progresu k momentu podpory)
  const zaznamenajPodporu = (suma: number, kanal: string = "DEED") =>
    pridajPodporu({ refId: it.id, typ: it.typ, modul: it.modul || "good", suma, kanal, komu: it.autor, vyzbierane: it.vyzbierane, ciel: it.ciel });

  function podpor(suma: number) {
    zaznamenajPodporu(suma);
    pridajDar({ refId: darRef, suma: suma * 0.01, kanal: "deed", registrovany: ja.typ !== "pasivny" });
    toast(`Ďakujeme za ${suma} DeeD pre ${it.autor}`);
    oslavuj(suma, it.autor);
  }

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      {/* hero — desktop/tablet: 16:9; mobil: pôvodné výšky (video 220 / foto 150) */}
      {/* lišta so Späť a možnosťami — vždy nad fotkou, rovnako ako všade */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
          <BackChip onBack={onBack} />
          <button type="button" aria-label="Ďalšie možnosti" onClick={() => setMoznosti(true)} style={{ width: 44, height: 44, margin: -5, padding: 5, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSec }}><IkonaMoznosti size={18} color={C.textSec} /></span></button>
        </div>
      {maHero && (
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.kat), ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : (it.video ? {} : { height: 150 })) }}>
          {it.video
            ? <Video src={it.video} poster={it.fotky?.[0]} h={wide ? "100%" : 220} badge={false} />
            : <Foto src={it.fotky![0]} emoji={it.emoji} h={wide ? "100%" : 150} w={wide ? "100%" : undefined} style={{ position: "absolute", inset: 0 }} onClick={() => otvorGaleriu(it.fotky ?? [], 0)} prednost alt={it.titul} />}
          <span style={{ position: "absolute", bottom: 12, left: 14, pointerEvents: "none" }}><ZdrojTag it={it} /></span>
          {(it.fotky?.length ?? 0) > 1 && <span style={{ position: "absolute", bottom: 12, right: 14, background: "rgba(0,0,0,.6)", borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.xs}px`, fontSize: 10, color: "#fff", pointerEvents: "none" }}>⧉ {it.fotky?.length} · klikni na foto</span>}
        </div>
      )}
      <MiniFotky fotky={it.fotky} />

      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px` }}>
        <div onClick={onAutor} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, cursor: "pointer" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", background: it.pfp, flex: "none" }}>{it.ini}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{it.autor} <span style={{ fontSize: 11, color: C.textTer, fontWeight: 500 }}>›</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, fontSize: 12.5, color: C.textSec, marginTop: 1 }}><IkonaPin size={12} color={C.textSec} />{it.lok}{it.karma ? ` · ${it.karma}` : ""}</div>
          </div>
          {it.overene && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--a-green)", background: "rgba(61,214,140,.13)", padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs }}>overené</span>}
        </div>
        <div style={{ marginTop: SPACE.sm, fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{it.titul}</div>
        <FormatovanyText text={it.popis} style={{ color: C.textSec, fontSize: 14.5, lineHeight: 1.6, marginTop: SPACE.xs }} />

        {maProgres && it.ciel && (
          <div style={{ marginTop: SPACE.xs }}>
            <ProgresBox suma={it.vyzbierane ?? 0} ciel={it.ciel} live={false} />
          </div>
        )}

        {/* jednotný platobný modul (§ platba) — sumy → obľúbené → QR → reťaz dobra */}
        <PlatobnyModul
          onShare={() => zdielaj({ titul: it.titul, text: it.titul, url: aktualnaUrl() }, toast)}
          upvotes={Math.floor((it.lajky || 0) / 3)} onUpvote={() => toast("Páči sa ti to")}
          onPodpor={(s: number) => podpor(s)}
          onKanal={(k: string) => setPlatba(k)}
          oblubene={oblubenyZGood(it)} toast={toast}
          qr={{ label: "QR tohto skutku", onClick: () => setQr(true) }}
          retaz={{ onClick: () => setSplit(true) }} />

        <div style={{ textAlign: "center", fontSize: 10, color: C.textTer, marginTop: SPACE.md }}>Bol si pri tom? Komunita preveruje skutky.</div>
        <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.gutter }}>
          <VerifyBtn ok onClick={() => onVerify("ok")} />
          <VerifyBtn onClick={() => onVerify("no")} />
        </div>

        {/* zoznam darcov — pri skutkoch až pod Overujem/Namietam */}
        <div style={{ marginTop: SPACE.gutter }}>
          <ZoznamDarcov refId={darRef} celkom={it.podpora} />
        </div>
      </div>

      {/* simulácia platby (EUR karta / DEED peňaženka) */}
      {platba && <PlatbaModal kanal={platba} komu={it.autor} onClose={() => setPlatba(null)}
        onDone={(s: number, volba?: VolbaDaru) => { zaznamenajPodporu(s, platba); pridajDar({ refId: darRef, suma: s * (platba === "EUR" ? 1 : 0.01), kanal: platba === "EUR" ? "psp" : "deed", registrovany: ja.typ !== "pasivny", volba }); toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DeeD"} · ${it.autor}`); oslavuj(platba === "EUR" ? Math.round(s * 100) : s, it.autor); }} />}

      {/* univerzálny QR skutku (§10) — reálne skenovateľný odkaz na živé interné ID */}
      {qr && <QrModal typ="skutok" titul={`QR skutku č. ${it.num.toLocaleString("sk")}`} popis={it.titul.slice(0, 38) + "…"}
        qrCiel={{ druh: "case", ref: String(it.id), modul: "good" }} onClose={() => setQr(false)} toast={toast} />}

      {/* split QR (influencer) — rozdelenie platby medzi príjemcov */}
      {split && <SplitQrSheet titul={it.titul.slice(0, 40)} caseId={String(it.id)} onClose={() => setSplit(false)} toast={toast} />}

      {/* „⋯" možnosti príspevku */}
      {moznosti && (
        <Sheet onClose={() => setMoznosti(false)} label="Možnosti príspevku">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: SPACE.sm }}>Možnosti</div>
          <MoznostRiadok ikona={<Zdielanie size={17} color={C.textSec} />} label="Zdieľať"
            onClick={() => { setMoznosti(false); void zdielaj({ titul: it.titul, text: it.titul, url: aktualnaUrl() }, toast); }} />
          <MoznostRiadok ikona={<IkonaDoska size={17} color={C.textSec} />} label="Kopírovať odkaz"
            onClick={() => { setMoznosti(false); void kopiruj(aktualnaUrl(), toast); }} />
          <MoznostRiadok ikona={<IkonaUlozit size={17} color={jeOblubene(it.id) ? "var(--a-gold)" : C.textSec} />}
            label={jeOblubene(it.id) ? "Odobrať z obľúbených" : "Uložiť do obľúbených"}
            onClick={() => { const bolo = jeOblubene(it.id); toggleOblubene(oblubenyZGood(it)); toast(bolo ? "Odobrané z obľúbených" : "Pridané do obľúbených ★"); setMoznosti(false); }} />
          <MoznostRiadok ikona={<span style={{ fontSize: 15 }}>▦</span>} label="Zobraziť QR skutku"
            onClick={() => { setMoznosti(false); setQr(true); }} />
          <MoznostRiadok ikona={<IkonaVlajka size={17} color="var(--a-danger)" />} label="Nahlásiť skutok"
            onClick={() => { setMoznosti(false); setNahlasit(true); }} />
        </Sheet>
      )}
      {nahlasit && <NahlasitSheet typ="Skutok" co={it.titul} refId={it.id} modul="good" onClose={() => setNahlasit(false)} />}
    </div>
  );
}

// riadok v „⋯ možnosti" sheete — plné 48px tap targety
function MoznostRiadok({ ikona, label, onClick }: { ikona: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, width: "100%", height: 48, padding: `0 ${SPACE.xs}px`, borderRadius: RADIUS.sm, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 600, color: C.text, textAlign: "left" }}>
      <span style={{ width: 32, height: 32, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line2}` }}>{ikona}</span>
      {label}
    </button>
  );
}

function SekciaLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.md}px 0 ${SPACE.xs}px`, ...style }}>{children}</div>;
}

function VerifyBtn({ ok, onClick }: { ok?: boolean; onClick: () => void }) {
  const { svetly } = useMotiv();
  const accent = ok ? "var(--a-green)" : "#E0524B";
  const titleCol = svetly ? accent : (ok ? "var(--a-green)" : "#F68C8B");
  return (
    <Tip label={ok
      ? "Komunitné overenie: potvrdíš, že skutok je pravdivý. Overenia (nie srdiečka) dvíhajú dosah príspevku."
      : "Námietka: označíš pochybný skutok na preverenie. Komunitná kontrola chráni dôveru platformy."}>
    <div {...pressable(onClick, ok ? "Overujem skutok" : "Namietam skutok")} style={{ flex: 1, height: 62, borderRadius: RADIUS.sm, display: "flex", alignItems: "center", gap: SPACE.sm, paddingLeft: SPACE.md, cursor: "pointer",
      background: ok ? "rgba(46,200,140,.12)" : "rgba(242,112,111,.12)", border: `1px solid ${ok ? "rgba(46,125,82,.55)" : "rgba(122,48,48,.55)"}` }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, background: ok ? "rgba(46,200,140,.2)" : "rgba(242,112,111,.2)", color: accent }}>{ok ? "✓" : "✕"}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.1, color: titleCol }}>{ok ? "Overujem" : "Namietam"}</div>
        <div style={{ fontSize: 11.5, color: C.textTer }}>skutok</div>
      </div>
    </div>
    </Tip>
  );
}

// ===================== OVERENIE / NÁMIETKA =====================
// Exportované — Top „Najvýznamnejšie príspevky" zdieľa rovnaký flow overenia/námietky.
export function DomovVerify({ it, mode, toast, onBack }: { it: GoodPolozka; mode: string; toast: (m: string) => void; onBack: () => void }) {
  const ok = mode === "ok";
  const [dokazy, setDokazy] = useState<string[]>([]); // foto dôkazy (data URL, náhľad) — zvyšujú dôveryhodnosť
  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <Hlavicka title={ok ? "Overujem skutok" : "Námietka k skutku"} onBack={onBack} titleColor={ok ? "var(--a-green)" : "var(--a-danger)"} />
      <div style={{ padding: `${SPACE.xxs}px ${SPACE.md}px ${SPACE.gutter}px` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, fontSize: 13 }}>
          <div><b>{it.autor}</b><div style={{ fontSize: 12, color: C.textTer }}>{it.titul.slice(0, 30)}… · č. {it.num.toLocaleString("sk")}</div></div>
        </div>
        <div style={{ background: ok ? "#0f2417" : "#2a1414", border: `1px solid ${ok ? "#2E7D52" : "#7A3030"}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, marginTop: SPACE.gutter, fontSize: 12, lineHeight: 1.4, color: ok ? "#C2E6D4" : "#F0B0AC" }}>
          {ok ? "Potvrdzujem, že som bol pri tom a skutok sa naozaj stal. Nepravdivé overenie môže mať následky." : "Námietka sa preveruje. Falošná námietka v zlej viere = rovnaká sankcia ako podvod."} <span style={{ fontSize: 11, color: C.textTer }}>[právna veta]</span>
        </div>
        <SekciaLabel>{ok ? "Doplň (nepovinné)" : "Vysvetli dôvod námietky · povinné"}</SekciaLabel>
        <textarea rows={3} placeholder={ok ? "Bol som tam, videl som to…" : "Napríklad: bol som tam o hodinu neskôr a…"} style={inp(70)} />
        <SekciaLabel>Foto (nepovinné — zvýši dôveryhodnosť)</SekciaLabel>
        <div style={{ marginTop: SPACE.xs }}>
          <FotoVyber fotky={dokazy} onZmena={setDokazy} max={3} />
        </div>
        <button onClick={() => { toast(ok ? `Ďakujeme — tvoje overenie${dokazy.length ? " s dôkazom" : ""} dvíha dôveryhodnosť skutku` : `Námietka${dokazy.length ? " s dôkazom" : ""} odoslaná — preverí ju AI + overenie`); setTimeout(onBack, 400); }}
          style={{ width: "100%", height: 50, borderRadius: RADIUS.sm, border: `1px solid ${ok ? "#2E7D52" : "#7A3030"}`, background: ok ? "#0f2417" : "#2a1414", color: ok ? "#cfeede" : "#F0B0AC", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: SPACE.md }}>
          {ok ? "✓ Overujem skutok" : "✕ Podávam námietku"}
        </button>
      </div>
    </div>
  );
}

// ===================== PRIDAŤ SKUTOK =====================
// ===================== NÁSTENKA (board) =====================
// Exportovaná — komunitná nástenka (udalosti/akcie v okolí) je zdieľaná aj do Help/Charita.
// Filtre Kde·Kedy·témy + druhý pohľad kalendár (DEED_Nastenka_Filtre_Kalendar_DEV_v1.md).
// Kde = JEDNO nastavenie okolia pre celú appku (useLokalita().okruh — Domov ↔ nástenka).
type KedyKod = "dnes" | "vikend" | "tyzden" | "mesiac";
const KEDY_LABEL: Record<KedyKod, string> = { dnes: "Dnes", vikend: "Víkend", tyzden: "Tento týždeň", mesiac: "Mesiac" };
const DEN_MS = 86400000;
// časové okno voľby Kedy (spec §1.2) — Víkend = najbližšia SO+NE VRÁTANE dneška
// (v utorok = táto SO+NE; v sobotu = dnes + zajtra; v nedeľu = dnes)
function kedyOkno(k: KedyKod): [number, number] {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const d0 = d.getTime(), dow = d.getDay(); // 0 = NE … 6 = SO
  if (k === "dnes") return [d0, d0 + DEN_MS];
  if (k === "vikend") {
    if (dow === 6) return [d0, d0 + 2 * DEN_MS];
    if (dow === 0) return [d0, d0 + DEN_MS];
    return [d0 + (6 - dow) * DEN_MS, d0 + (8 - dow) * DEN_MS];
  }
  if (k === "tyzden") return [d0, d0 + (dow === 0 ? 1 : 8 - dow) * DEN_MS]; // dnes až nedeľa
  return [d0, d0 + 30 * DEN_MS]; // mesiac = najbližších 30 dní
}
const denKluc = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const casUdalosti = (e: Udalost) => (e.datum ? Date.parse(e.datum) : Infinity); // bez dátumu → koniec zoznamu, Kedy ju nefiltruje
// radenie: čas konania (najbližšie hore), pri zhode vzdialenosť (spec §1.4)
const zoradUdalosti = (a: Udalost, b: Udalost) => casUdalosti(a) - casUdalosti(b) || (a.km ?? 0) - (b.km ?? 0);

// jeden riadok udalosti — bodka = farba TÉMY (jeden farebný jazyk s chipmi, spec §1.3);
// organizátor ostáva viditeľný v riadku (typ organizátora z chipov VON). Reuse aj v kalendári.
function UdalostRiadok({ e, onClick, desktop }: { e: Udalost; onClick: () => void; desktop?: boolean }) {
  const c = TEMA_FARBA[e.dom ?? ""] ?? C.textTer;
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line2}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: desktop ? 0 : SPACE.xs, cursor: "pointer" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
        <div style={{ fontSize: 12, color: C.textTer, marginTop: 3 }}>{e.who} · {e.src}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: c }}>{e.when}</div>
        <div style={{ color: C.textTer, fontSize: 16 }}>›</div>
      </div>
    </div>
  );
}

// kalendár — druhý pohľad nástenky (spec §2): mesačná mriežka, deň s akciami má bodku
// s počtom, ťuk na deň vysype zoznam dňa (rovnaké riadky). Číta TIE ISTÉ dáta ako zoznam.
function BoardKalendar({ events, den, setDen, onEvent, desktop }: { events: Udalost[]; den: number; setDen: (t: number) => void; onEvent: (id: string) => void; desktop?: boolean }) {
  const [mesiac, setMesiac] = useState(() => { const d = new Date(den); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const poDnoch: Record<string, Udalost[]> = {};
  events.forEach((e) => { if (!e.datum) return; const k = denKluc(Date.parse(e.datum)); (poDnoch[k] ||= []).push(e); });
  const y = mesiac.getFullYear(), m = mesiac.getMonth();
  const ofs = (new Date(y, m, 1).getDay() + 6) % 7; // pondelkový začiatok týždňa
  const dniVMes = new Date(y, m + 1, 0).getDate();
  const dnesKluc = denKluc(Date.now());
  const denAkcie = (poDnoch[denKluc(den)] ?? []).slice().sort(zoradUdalosti);
  const posun = (o: number) => setMesiac((x) => new Date(x.getFullYear(), x.getMonth() + o, 1));
  return (
    <div style={{ padding: `0 ${SPACE.md}px` }}>
      {/* hlavička mesiaca — listovanie šípkami */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${SPACE.xs}px 0 ${SPACE.sm}px` }}>
        <span {...pressable(() => posun(-1), "Predchádzajúci mesiac")} style={{ width: 34, height: 34, borderRadius: RADIUS.sm, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface2, border: `1px solid ${C.line}`, cursor: "pointer", fontSize: 16, color: C.textSec }}>‹</span>
        <b style={{ fontSize: 14.5, textTransform: "capitalize" }}>{mesiac.toLocaleDateString("sk", { month: "long", year: "numeric" })}</b>
        <span {...pressable(() => posun(1), "Nasledujúci mesiac")} style={{ width: 34, height: 34, borderRadius: RADIUS.sm, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface2, border: `1px solid ${C.line}`, cursor: "pointer", fontSize: 16, color: C.textSec }}>›</span>
      </div>
      {/* mriežka */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((h) => <div key={h} style={{ textAlign: "center", fontSize: 10, color: C.textTer, fontWeight: 700, padding: `${SPACE.xxs}px 0` }}>{h}</div>)}
        {Array.from({ length: ofs }).map((_, i) => <div key={"x" + i} />)}
        {Array.from({ length: dniVMes }).map((_, i) => {
          const t = new Date(y, m, i + 1).getTime();
          const k = denKluc(t), akcie = poDnoch[k] ?? [], n = akcie.length;
          const on = denKluc(den) === k, dnes = dnesKluc === k;
          // čitateľnosť dňa (oprava 17. 7.): desktop/tablet = 2–3 skrátené názvy s bodkou
          // témy (+X ďalšie); mobil = väčšia bodka s počtom, názvy až po ťuku na deň
          return (
            <div key={i} {...pressable(() => setDen(t), `${i + 1}. ${m + 1}. — ${n} akcií`)} style={{ minHeight: desktop ? 72 : 48, borderRadius: RADIUS.xs, display: "flex", flexDirection: "column", alignItems: desktop ? "stretch" : "center", justifyContent: desktop ? "flex-start" : "center", gap: desktop ? 2 : 2, cursor: "pointer", padding: desktop ? "4px 5px" : undefined, overflow: "hidden",
              background: on ? tint("var(--a-info)", .14) : C.surface2, border: `1px solid ${on ? tint("var(--a-info)", .5) : dnes ? tint("var(--a-info)", .35) : C.line2}` }}>
              <span style={{ fontSize: 12.5, fontWeight: on || dnes ? 800 : 600, color: on ? "var(--a-info)" : C.text, textAlign: desktop ? "left" : "center" }}>{i + 1}</span>
              {desktop ? (<>
                {akcie.slice(0, 2).map((e) => (
                  <span key={e.id} style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", flex: "none", background: TEMA_FARBA[e.dom ?? ""] ?? C.textTer }} />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: C.textSec, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span>
                  </span>
                ))}
                {n > 2 && <span style={{ fontSize: 9, fontWeight: 700, color: C.textTer }}>+{n - 2} ďalšie</span>}
              </>) : (
                n > 0
                  ? <span style={{ fontSize: 10.5, fontWeight: 800, lineHeight: 1, color: "var(--a-info)", background: tint("var(--a-info)", .14), borderRadius: RADIUS.pill, padding: "2px 6px" }}>●{n}</span>
                  : <span style={{ fontSize: 10.5, lineHeight: 1, padding: "2px 6px", color: "transparent" }}>●</span>
              )}
            </div>
          );
        })}
      </div>
      {/* zoznam vybraného dňa — rovnaké riadky ako zoznam nástenky */}
      <SekciaLabel style={{ padding: `${SPACE.md}px 0 ${SPACE.xs}px` }}>AKCIE · {new Date(den).toLocaleDateString("sk", { weekday: "long", day: "numeric", month: "numeric" })}</SekciaLabel>
      <div style={desktop ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: SPACE.sm, alignItems: "start" } : undefined}>
        {denAkcie.map((e) => <UdalostRiadok key={e.id} e={e} onClick={() => onEvent(e.id)} desktop={desktop} />)}
      </div>
      {denAkcie.length === 0 && <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: `${SPACE.md}px 0` }}>Žiadne akcie v tento deň.</div>}
    </div>
  );
}

export function DomovBoard({ onBack, onEvent }: { onBack: () => void; onEvent: (id: string) => void }) {
  const { data: EVENTS = [] } = useGoodUdalosti();
  const { wide, desktop } = useLayout();
  const { mesto, okruh, nastavOkruh } = useLokalita(); // Kde = jedno nastavenie s Domovom (spec §1.1)
  const [tema, setTema] = useState<string>("all");                 // témy: single-select, Všetko = default
  const [kedy, setKedy] = useState<KedyKod>("tyzden");             // default: Tento týždeň (spec §1.2)
  const [pohlad, setPohlad] = useState<"zoznam" | "kalendar">("zoznam"); // default ZOZNAM; prepnutie nestráca filtre
  const [den, setDen] = useState<number>(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [vyberKde, setVyberKde] = useState(false);
  const [vyberKedy, setVyberKedy] = useState(false);

  // Kde + téma platia pre zoznam, TOPOVANÉ pás aj kalendár súčasne (spec §1.3, §2)
  const kmMax = FEED_CFG.radiusy[okruh].km;
  const zaklad = EVENTS.filter((e) => (e.km ?? 0) <= kmMax && (tema === "all" || e.dom === tema));
  const [od, doKedy] = kedyOkno(kedy);
  const list = zaklad.filter((e) => !e.datum || (casUdalosti(e) >= od && casUdalosti(e) < doKedy)).sort(zoradUdalosti);
  const tops = zaklad.filter((e) => e.top);
  // na chipe svieti aktuálna voľba („Trenčín", „5 km"), nie slovo „Kde"
  const kdeLabel = okruh === "mesto" ? mesto : okruh === "stvrt" ? "5 km" : FEED_CFG.radiusy[okruh].label;
  const kedyLabel = pohlad === "kalendar" ? new Date(den).toLocaleDateString("sk", { day: "numeric", month: "numeric" }) : KEDY_LABEL[kedy];

  const chip = (on: boolean, c = "var(--a-info)") => ({ flex: "0 0 auto" as const, display: "inline-flex" as const, alignItems: "center" as const, gap: 4, padding: `${SPACE.xs}px ${SPACE.gutter}px`, borderRadius: RADIUS.sm, fontSize: 11, cursor: "pointer" as const, whiteSpace: "nowrap" as const, background: on ? tint(c, .12) : C.surface2, border: `1px solid ${on ? tint(c, .4) : C.line}`, color: on ? c : C.textSec, fontWeight: on ? 700 : 500 });
  const volba = (on: boolean) => ({ display: "flex" as const, alignItems: "center" as const, gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderRadius: RADIUS.sm, marginBottom: SPACE.xs, cursor: "pointer" as const, background: on ? tint("var(--a-info)", .12) : C.surface2, border: `1px solid ${on ? tint("var(--a-info)", .45) : C.line}`, fontSize: 14, fontWeight: 700, color: on ? "var(--a-info)" : C.text });

  // desktop/tablet: čitateľná centrovaná šírka (nie roztiahnuté na celú obrazovku)
  return (
    <div style={{ paddingBottom: SPACE.lg, maxWidth: desktop ? SIRKA.plocha : wide ? SIRKA.stlpec : undefined, marginLeft: "auto", marginRight: "auto" }}>
      {/* prepínač kalendára = pripnutý chip 📅 vedľa Kedy (oprava 17. 7.) — ikonka vpravo hore sa ruší */}
      <Hlavicka title="Nástenka" onBack={onBack} />

      {/* topované — filtruje ho téma aj Kde (spec akceptácia 4) */}
      {tops.length > 0 && (<>
      <SekciaLabel><span style={{ color: C.gold }}>TOPOVANÉ</span></SekciaLabel>
      <div style={{ display: "flex", gap: SPACE.sm, padding: `0 ${SPACE.md}px ${SPACE.xs}px`, overflowX: "auto" }}>
        {tops.map((e) => (
          <div key={e.id} onClick={() => onEvent(e.id)} style={{ minWidth: 152, flex: "0 0 auto", background: C.surface2, border: "1px solid rgba(231,199,102,.3)", borderRadius: RADIUS.md, overflow: "hidden", cursor: "pointer" }}>
            <div style={{ height: 64, background: heroGrad(e.kat), display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: C.gold }}>★</span>
              <span style={{ fontSize: 18, color: KAT[e.kat].c }}>▶</span>
            </div>
            <div style={{ padding: `${SPACE.xs}px ${SPACE.sm}px` }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: TEMA_FARBA[e.dom ?? ""] ?? KAT[e.kat].c }}>{e.when}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
              <div style={{ fontSize: 9, color: C.textTer, marginTop: 2 }}>{e.who}</div>
            </div>
          </div>
        ))}
      </div>
      </>)}

      {/* filtrovací riadok — [Kde ▾][Kedy ▾] pripnuté │ témy posuvné (spec §1).
          Desktop = jeden riadok; mobil = DVA riadky (oprava 17. 7. — pevné chipy zaberú
          šírku a témy nevidno; takto vidno bez posúvania aspoň 4 tematické chipy). */}
      <div style={{ display: "flex", flexDirection: wide ? "row" : "column", alignItems: wide ? "center" : "stretch", gap: SPACE.xs, padding: `${SPACE.xs}px ${SPACE.md}px` }}>
        <div style={{ display: "flex", gap: SPACE.xs, flex: "none" }}>
          <div {...pressable(() => setVyberKde(true), "Kde — zmeniť okolie (platí pre celú appku)")} style={chip(true)}>📍 {kdeLabel} ▾</div>
          <div {...pressable(() => setVyberKedy(true), "Kedy — zmeniť obdobie")} style={chip(true)}>{kedyLabel} ▾</div>
          {/* tretí pripnutý chip 📅 = prepínač zoznam ↔ kalendár; keď je kalendár zapnutý, svieti */}
          <div {...pressable(() => setPohlad((p) => (p === "zoznam" ? "kalendar" : "zoznam")), "Prepnúť zoznam / kalendár")} style={chip(pohlad === "kalendar")}>📅</div>
        </div>
        {wide && <div style={{ width: 1, alignSelf: "stretch", borderLeft: `1px dashed ${C.line}`, flex: "none" }} />}
        <div style={{ display: "flex", gap: SPACE.xs, overflowX: "auto", minWidth: 0 }}>
          <div {...pressable(() => setTema("all"), "Téma: všetko")} style={chip(tema === "all")}>Všetko</div>
          {NASTENKA_TEMY.map((t) => (
            <div key={t.kod} {...pressable(() => setTema(t.kod), `Téma: ${t.label}`)} style={chip(tema === t.kod, t.c)}>{t.label}</div>
          ))}
        </div>
      </div>

      {pohlad === "zoznam" ? (<>
        {/* všetky udalosti — radené podľa času konania, pri zhode podľa vzdialenosti */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${SPACE.xs}px ${SPACE.md}px 0` }}>
          <SekciaLabel>VŠETKY UDALOSTI</SekciaLabel>
          <span style={{ fontSize: 11, color: C.textTer }}>{list.length} · {KEDY_LABEL[kedy].toLowerCase()}</span>
        </div>
        <div style={{ padding: `0 ${SPACE.md}px`, ...(desktop ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: SPACE.sm, alignItems: "start" } : {}) }}>
          {list.map((e) => <UdalostRiadok key={e.id} e={e} onClick={() => onEvent(e.id)} desktop={desktop} />)}
        </div>
        {list.length === 0 && <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: `${SPACE.md}px 0` }}>Nič v tomto období — skús iný filter alebo väčší okruh.</div>}
      </>) : (
        <BoardKalendar events={zaklad} den={den} setDen={setDen} onEvent={onEvent} desktop={desktop} />
      )}

      {/* Kde — rovnaký výber okruhu/mesta ako Domov (jeden zdroj pravdy) */}
      {vyberKde && <OkruhVyber radius={okruh}
        onPick={(r: string) => { nastavOkruh(r as OkruhKod); setVyberKde(false); }}
        onClose={() => setVyberKde(false)} />}

      {/* Kedy — Dnes / Víkend / Tento týždeň / Mesiac / Vyber deň (kalendár) */}
      {vyberKedy && (
        <Sheet onClose={() => setVyberKedy(false)} label="Kedy">
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: SPACE.sm }}>Kedy</div>
          {(Object.keys(KEDY_LABEL) as KedyKod[]).map((k) => (
            <div key={k} {...pressable(() => { setKedy(k); setPohlad("zoznam"); setVyberKedy(false); }, KEDY_LABEL[k])} style={volba(kedy === k && pohlad === "zoznam")}>
              {KEDY_LABEL[k]}
              {k === "vikend" && <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 500, color: C.textTer }}>najbližšia SO + NE, vrátane dneška</span>}
            </div>
          ))}
          <div {...pressable(() => { setPohlad("kalendar"); setVyberKedy(false); }, "Vyber deň — kalendár")} style={volba(pohlad === "kalendar")}>
            📅 Vyber deň <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 500, color: C.textTer }}>otvorí kalendár</span>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ===================== DETAIL UDALOSTI =====================
// Exportovaný — detail udalosti z komunitnej nástenky (zdieľaný do Help/Charita).
export function DomovEvent({ id, onBack, toast }: { id: string | null; onBack: () => void; toast: (m: string) => void; oslavuj?: (suma: number, komu: string) => void }) {
  const { data: EVENTS = [] } = useGoodUdalosti();
  const e: Udalost | undefined = EVENTS.find((x) => x.id === id);
  if (!e) return null;
  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <div style={{ height: 150, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(e.kat) }}>
        <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, cursor: "pointer", zIndex: 2 }}><IkonaSipVlavo size={20} color="#fff" /></div>
        <div style={{ fontSize: 46, color: KAT[e.kat].c }}>▶</div>
        <span style={{ position: "absolute", bottom: 12, left: 14, fontSize: 10, fontWeight: 600, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, background: "rgba(0,0,0,.6)", color: SRC_COL[e.src], pointerEvents: "none" }}>{e.src}</span>
      </div>
      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px` }}>
        <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{e.title}</div>
        <div style={{ display: "flex", gap: SPACE.gutter, marginTop: SPACE.sm, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.textSec }}>🗓 {e.when}</span>
          <span style={{ fontSize: 12, color: C.textSec }}>📍 {e.place}</span>
          <span style={{ fontSize: 12, color: C.textSec }}>👥 {e.cap}</span>
        </div>
        <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.55, marginTop: SPACE.sm }}>{e.desc}</p>

        {/* karma sa NEpripisuje za prihlásenie — len z overenej QR dochádzky (schválená oprava 16. 7.) */}
        <div style={{ background: "color-mix(in srgb, var(--a-info) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--a-info) 22%, transparent)", borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginTop: SPACE.sm, fontSize: 12, color: C.blueL, lineHeight: 1.5 }}>
          Po prihlásení dostaneš pripomienku a QR vstupenku.
        </div>

        <button onClick={() => toast(`Prihlásené na: ${e.title}`)}
          style={{ width: "100%", height: 50, borderRadius: RADIUS.sm, background: GRAD, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: SPACE.md, boxShadow: "0 8px 26px color-mix(in srgb, var(--a-green) 32%, transparent)" }}>
          Zúčastním sa
        </button>
        <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.sm }}>
          <div onClick={() => zdielaj({ titul: e.title, text: `${e.title} · ${e.when} · ${e.place}`, url: aktualnaUrl() }, toast)} style={{ flex: 1, height: 46, borderRadius: RADIUS.sm, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Zdielanie size={15} color={C.textSec} /> Zdieľať</div>
          <OblubeneBtn polozka={{ refId: e.id, typ: "udalost", modul: "good", nazov: e.title, lok: e.place }} toast={toast} style={{ flex: 1, height: 46 }} />
        </div>
      </div>
    </div>
  );
}
