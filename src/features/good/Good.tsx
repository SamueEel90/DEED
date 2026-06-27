import { useState, useEffect } from "react";
import { C, inp, GRAD, GRAD_ZELENY } from "@/theme";
import { Foto, FotoPrispevku, MiniFotky, Video, ModulHlavicka, Hlavicka, AvatarUroven, PodporaSekcia, PlatbaModal, HladanieModal, toast, Oslava, useGaleria, useScrollHore, useMotiv, useLayout, useStrankaAkcie, useTvorbaGate, StatRiadok, MoniBar, FeedStlpce, obalSiroky, Lupa, Zdielanie, IkonaSipVlavo, IkonaMoznosti, IkonaUlozit, IkonaFajka, IkonaPlay, IkonaDoska, IkonaPin, OkruhVyber, QrModal, FeedSkeleton, EmptyState, ErrorState, ScreenSwitch } from "@/shared";
import { pripravFeed, FEED_CFG, type FeedUser } from "@/lib/feed";
import { tint, tagChip } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { usePouzivatel } from "@/lib/pouzivatel";
import { zobrazVelkost, MEDIA_AR } from "@/lib/cardSize";
import { RetazDobraSheet } from "@/features/retaz/RetazDobra";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import type { GoodPolozka, Subjekt, Udalost, OkruhKod } from "@/types";
import { useGoodFeed, useGoodUdalosti } from "@/data";
import { usePersonalizacia } from "@/lib/personalizacia";
import { KAT, SRC_COL } from "./mock";

const katLabel = (k: GoodPolozka["kat"]) => KAT[k].label || k;

// zostav subjekt cudzieho profilu z položky feedu (autor → org/charita alebo osoba)
const autorSubjekt = (it: GoodPolozka): Subjekt => it.zdroj === "Charity"
  ? { typ: "org", meno: it.autor, emoji: it.emoji, lok: it.lok, level: it.charLevel || "Gold" }
  : { typ: "osoba", meno: it.autor, level: it.karma || "Silver" };

// poloha usera (MVP mock — Trenčín, Sihoť). Neskôr z GPS/profilu.
const USER_LOK = { lat: 48.894, lng: 18.044 };

/*
  ============================================================
  MODUL DOMOV (DEED Good) — port z deed_prototype.html
  feed skutkov → detail (podpora, QR, overenie komunitou)
  → overujem/namietam → ＋ pridať skutok (AI náhľad)
  ============================================================
*/

const heroGrad = (kat: GoodPolozka["kat"]) => `linear-gradient(160deg, ${KAT[kat].bg}, ${KAT[kat].bg2})`;
// `tint` je teraz var-aware (z @/lib/ui) — zvláda hex aj CSS premenné (var(--a-*) → color-mix).
// Predtým tu bol lokálny hex-only helper, ktorý z premenných robil takmer čiernu (rozbité tinty).
// jednotný „glass" odznak na médiu karty
const mediaBadge = (extra: React.CSSProperties): React.CSSProperties => ({ position: "absolute", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 9, background: "rgba(8,11,18,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.18)", color: "#fff", pointerEvents: "none", ...extra });

// ===================== MODUL =====================
export default function ModulGood({ wide, otvorModul }: { wide?: boolean; otvorModul?: (m: string) => void }) {
  const { desktop } = useLayout();
  const { data: POLOZKY = [] } = useGoodFeed();
  const { gate } = useTvorbaGate(); // pasívny nesmie tvoriť (overovanie skutku = create)
  const [screen, setScreen] = useState("home"); // home | detail | verify | add | board | event | cudzi
  const [pohlad, setPohlad] = useState<"okolie" | "mojdeed">("okolie"); // prežije návrat z detailu (ScreenSwitch remountuje Home)
  const [radius, setRadius] = useState<OkruhKod>("stvrt");
  const [aktId, setAktId] = useState<number | null>(null);
  const [aktEvent, setAktEvent] = useState<string | null>(null);
  const [aktSubjekt, setAktSubjekt] = useState<Subjekt | null>(null); // cudzí profil (§6)
  const [predtym, setPredtym] = useState("home");     // kam sa vrátiť z cudzieho profilu
  const [verifyMode, setVerifyMode] = useState("ok");
  const [oslava, setOslava] = useState<{ suma: number; komu: string } | null>(null); // {suma, komu}
  const [hladaj, setHladaj] = useState(false);

  const otvorProfil = (subjekt: Subjekt, odkial = "home") => { setAktSubjekt(subjekt); setPredtym(odkial); setScreen("cudzi"); };

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);

  const oslavuj = (suma: number, komu: string) => { setOslava({ suma, komu }); setTimeout(() => setOslava(null), 1900); };
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: 620, maxDesktop: 920 });

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
          onAdd={() => setScreen("add")} />
      )}
      {screen === "cudzi" && aktSubjekt && obal(
        <CudziProfil subjekt={aktSubjekt as any} toast={toast} onBack={() => setScreen(predtym)} />
      )}
      {screen === "board" && obal(
        <GoodBoard onBack={() => setScreen("home")} onEvent={(id) => { setAktEvent(id); setScreen("event"); }} toast={toast} />
      )}
      {screen === "event" && obal(
        <GoodEvent id={aktEvent} onBack={() => setScreen("board")} toast={toast} oslavuj={oslavuj} />
      )}
      {screen === "detail" && akt && obal(
        <GoodDetail it={akt} toast={toast} oslavuj={oslavuj}
          onBack={() => setScreen("home")}
          onAutor={() => otvorProfil(autorSubjekt(akt), "detail")}
          onVerify={(mode) => gate(() => { setVerifyMode(mode); setScreen("verify"); })()} />
      )}
      {screen === "verify" && akt && obal(
        <GoodVerify it={akt} mode={verifyMode} toast={toast} onBack={() => setScreen("detail")} />
      )}
      {screen === "add" && obal(
        <GoodAdd toast={toast} oslavuj={oslavuj} onDone={() => setScreen("home")} />
      )}
      </ScreenSwitch>

      {/* oslava — jednotný celebration overlay (aura prsteň = podpis značky) */}
      {oslava && (
        <Oslava
          emoji={oslava.suma >= 100 ? "🎊" : oslava.suma >= 50 ? "⭐" : "😊"}
          title={oslava.suma >= 100 ? "Skvelé! Veľká podpora!" : "Ďakujeme!"}
          text={<>Tvoja podpora <b style={{ color: C.greenL }}>{oslava.suma} DEED</b> letí k {oslava.komu}. Reťaz dobra pokračuje.</>}
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
  onDetail: (id: number) => void;
  onHladaj: () => void;
  onBoard: () => void;
  onAdd: () => void;
};

// ===================== HOME / FEED =====================
function Home({ wide, toast, otvorModul, pohlad, setPohlad, radius, setRadius, onDetail, onHladaj, onBoard, onAdd }: HomeProps) {
  const { data: POLOZKY = [], isLoading, isError, refetch } = useGoodFeed();
  // `radius` aj `pohlad` žijú v ModulGood (prežijú návrat z detailu) — sem prichádzajú cez props
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const ja = usePouzivatel();
  const { desktop } = useLayout();
  const { gate } = useTvorbaGate();
  const { zaujmyKluce, sledovaniMena } = usePersonalizacia();
  // personalizácia: záujmy + sledovaní vstupujú do afinitnej váhy (re-rank, NIE filter)
  const user: FeedUser = { ...USER_LOK, radius, zaujmy: zaujmyKluce, sledovani: sledovaniMena };

  // FEED ALGORITMUS (Časť B): životnosť → rádius + adaptívny prah →
  // frekvenčný strop → zoradenie. Veľkosť karty (Časť A) cez zobrazVelkost.
  // Lacné: pracuje len s uloženým skóre, žiadne AI. (Neskôr: GET /feed na backende.)
  const feed = pripravFeed(POLOZKY as any, user).map((it: any) => ({ ...it, velkost: zobrazVelkost(it) })) as GoodPolozka[];
  const karta = (it: GoodPolozka) => <GoodKarta key={it.id} it={it} wide={wide} onDetail={() => onDetail(it.id)} />;

  // kontextové akcie stránky → plávajúce „+ Pridať" dole + sekcia „Na tejto stránke" v menu (☰)
  useStrankaAkcie(() => ({
    pridat: { id: "add", label: "Pridať", onClick: onAdd },
    extra: [
      { id: "talent", label: "Ukáž svoj talent", popis: "TikTok kanál skutkov", ikona: <IkonaPlay size={18} color="var(--a-green)" />, onClick: gate(() => toast("Ukáž svoj talent — TikTok kanál (demo)")) },
      { id: "board", label: "Nástenka", popis: "Skutky a výzvy v okolí", ikona: <IkonaDoska size={18} color="var(--a-green)" />, onClick: onBoard },
    ],
  }), []);

  // štatistický riadok — počet vo zvolenom okruhu + klikateľný výber okruhu
  const statRiadok = (
    <StatRiadok pocet={feed.length} jednotka="skutkov" mesiac="9 480" miesto={ja.mesto}
      okruh={FEED_CFG.radiusy[radius].krat} onOkruh={() => setVyberOkruh(true)} />
  );

  // telo Okolia — desktop: 3 kategórie (Skutky | Žiadosti | Charita); mobil/tablet: 1–2 stĺpce
  const okolieFeed = isError ? (
    <ErrorState onRetry={() => refetch()} />
  ) : isLoading ? (
    <FeedSkeleton count={4} />
  ) : feed.length === 0 ? (
    <EmptyState emoji="🤝" title="Vo zvolenom okruhu zatiaľ nie sú skutky" text="Skús väčší okruh alebo sa vráť neskôr." />
  ) : desktop ? (
    <FeedStlpce wide padding="0"
      labelSkutky="Skutky" labelZiadosti="Žiadosti" labelCharita="Charita"
      skutky={feed.filter((it) => it.typ === "skutok").map(karta)}
      ziadosti={feed.filter((it) => it.typ === "ziadost").map(karta)}
      charita={feed.filter((it) => it.typ === "charita").map(karta)}
    />
  ) : (
    <FeedStlpce wide={wide}
      labelSkutky="Skutky" labelZiadosti="Žiadosti & charita"
      jednoStlpec={feed.map(karta)}
      skutky={feed.filter((it) => it.typ === "skutok").map(karta)}
      ziadosti={feed.filter((it) => it.typ !== "skutok").map(karta)}
    />
  );

  return (
    <div style={{ paddingBottom: 14 }}>
      {/* header — jednotná hlavička (logo D⁺ + názov + hľadanie/upozornenia + profil) */}
      <ModulHlavicka title="Domov" karma={ja.demo ? "Gold · celková" : `${String(ja.tier).replace(/\s*·\s*L\d+/, "")} · celková`}
        right={
          <>
            <span onClick={onHladaj} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={C.textSec} /></span>
            <Zvoncek color={C.textSec} toast={toast} />
            <AvatarUroven ini={ja.iniciala} tint={ja.tint} tier={ja.tier} size={34} onClick={() => otvorModul && otvorModul("profil")} title={ja.tier} />
          </>
        } />

      {desktop ? (
        /* DESKTOP — Okolie (3 kategórie) + Môj DEED bočný panel naraz, bez prepínania */
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start", padding: "0 20px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {statRiadok}
            {okolieFeed}
          </div>
          <aside style={{ width: 340, flex: "0 0 340px", minWidth: 0 }}>
            <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 800, margin: "4px 0 10px", paddingLeft: 2 }}>MÔJ DEED</div>
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
  const tab = (key: "okolie" | "mojdeed", label: string) => {
    const on = pohlad === key;
    return (
      <button onClick={() => setPohlad(key)} aria-current={on ? "page" : undefined} style={{
        flex: 1, height: 38, borderRadius: 11, fontFamily: "inherit", cursor: "pointer",
        border: `1px solid ${on ? "rgba(116,166,255,.45)" : "transparent"}`,
        background: on ? "rgba(91,155,255,.14)" : "transparent",
        color: on ? "var(--a-info)" : C.textSec, fontWeight: on ? 800 : 600, fontSize: 13.5,
        transition: "all .15s ease",
      }}>{label}</button>
    );
  };
  return (
    <div style={{ display: "flex", gap: 4, padding: 4, margin: "0 16px 8px", borderRadius: 14, background: C.surface2, border: `1px solid ${C.line}` }}>
      {tab("okolie", "Okolie")}
      {tab("mojdeed", "Môj DEED")}
    </div>
  );
}

// ===================== MÔJ DEED — osobný prehľad =====================
// Záujmy (editor) · ľudia, ktorých sledujem + ich najnovšie · čo podporujem ·
// Nástenka filtrovaná záujmami. Číta zo zdieľaného personalizačného store.
const stopProp = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

function MojDeed({ wide, onDetail, onBoard, toast }: { wide?: boolean; onDetail: (id: number) => void; onBoard: () => void; toast: (m: string) => void }) {
  const obal: React.CSSProperties | undefined = wide ? { maxWidth: 620, margin: "0 auto" } : undefined;
  return <div style={obal}><MojDeedObsah onDetail={onDetail} onBoard={onBoard} toast={toast} /></div>;
}

// obsah Môj DEED (3 sekcie) — zdieľa mobilný plný pohľad aj desktop bočný panel
function MojDeedObsah({ onDetail, onBoard, toast }: { onDetail: (id: number) => void; onBoard: () => void; toast: (m: string) => void }) {
  const { data: POLOZKY = [] } = useGoodFeed();
  const { data: EVENTS = [] } = useGoodUdalosti();
  const { zaujmy, zaujmyKluce, sledovani, toggleSledovanie, podpory } = usePersonalizacia();

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
      {/* čo podporujem — navrchu (hlavný obsah Môj DEED) */}
      <div style={{ padding: "4px 16px 0" }}>
        <SekciaLabel>ČO PODPORUJEM ({podpory.length})</SekciaLabel>
        {podpory.length === 0 ? (
          <PrazdnyTip emoji="💚" text="Keď niekoho podporíš (skutok, žiadosť, charita), uvidíš tu jeho progres a svoju stopu." />
        ) : podporyRows.map(({ p, id, titul, vyzbierane, ciel }) => (
          <div key={String(p.refId)} onClick={() => id && onDetail(id)} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 13, padding: 12, marginBottom: 8, cursor: id ? "pointer" : "default" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titul}</span>
              {p.suma ? <span style={{ flex: "none", fontSize: 11, fontWeight: 700, color: "var(--a-green)", background: "rgba(31,191,143,.12)", borderRadius: 8, padding: "2px 8px" }}>tvojich {p.suma} {p.kanal === "EUR" ? "€" : "DEED"}</span> : null}
            </div>
            {ciel ? <div style={{ marginTop: 9 }}><MoniBar vyzbierane={vyzbierane || 0} ciel={ciel} mini /></div>
              : <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 6 }}>otvorená podpora · ďakujeme</div>}
          </div>
        ))}
      </div>

      {/* koho sledujem — hneď pod podporou */}
      <div style={{ padding: "0 16px" }}>
        <SekciaLabel>KOHO SLEDUJEM ({sledovani.length})</SekciaLabel>
        {sledovani.length === 0 ? (
          <PrazdnyTip emoji="👋" text={'Zatiaľ nikoho nesleduješ. V „Okolí" alebo na profile niekoho klikni „Sledovať" — objaví sa tu aj s najnovšími skutkami.'} />
        ) : ludia.map(({ s, last }) => (
          <div key={s.meno} onClick={() => last && onDetail(last.id)} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line2}`, borderRadius: 13, padding: "10px 12px", marginBottom: 8, cursor: last ? "pointer" : "default" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", background: last?.pfp || s.tint || "var(--a-info)" }}>{last?.ini || s.meno[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.meno}</div>
              <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last ? last.titul : "zatiaľ žiadny nový skutok v okolí"}</div>
            </div>
            <span onClick={stopProp(() => { toggleSledovanie({ meno: s.meno, typ: s.typ }); toast(`Prestal si sledovať ${s.meno}`); })}
              title="Prestať sledovať" style={{ flex: "none", fontSize: 12, fontWeight: 800, color: "var(--a-green)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "5px 11px", cursor: "pointer" }}>✓</span>
          </div>
        ))}
      </div>

      {/* Nástenka filtrovaná záujmami */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SekciaLabel>NÁSTENKA{maZaujmy ? " · podľa záujmov" : ""}</SekciaLabel>
          <span onClick={onBoard} style={{ fontSize: 11.5, color: "var(--a-info)", fontWeight: 700, cursor: "pointer" }}>Celá Nástenka ›</span>
        </div>
        {mojeUdalosti.length === 0 ? (
          <PrazdnyTip emoji="📅" text="Pre tvoje záujmy teraz nie sú udalosti. Skús pridať záujem alebo otvor celú Nástenku." />
        ) : (
          <>
            {tops.length > 0 && (
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                {tops.map((e) => (
                  <div key={e.id} onClick={onBoard} style={{ minWidth: 150, flex: "0 0 auto", background: C.surface2, border: "1px solid rgba(231,199,102,.3)", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
                    <div style={{ height: 60, background: heroGrad(e.kat), display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: C.gold }}>★</span>
                      <span style={{ fontSize: 18, color: KAT[e.kat].c }}>▶</span>
                    </div>
                    <div style={{ padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: KAT[e.kat].c }}>{e.when}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                      <div style={{ fontSize: 9, color: C.textTer, marginTop: 2 }}>{e.who}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mojeUdalosti.map((e) => (
              <div key={e.id} onClick={onBoard} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line2}`, borderRadius: 12, padding: "11px 12px", marginBottom: 8, cursor: "pointer" }}>
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
    </>
  );
}

function PrazdnyTip({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "center", background: "rgba(var(--glass-rgb),.04)", border: `1px dashed ${C.line}`, borderRadius: 13, padding: "14px 14px", marginBottom: 8 }}>
      <span style={{ fontSize: 22, flex: "none" }}>{emoji}</span>
      <span style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}


function ZdrojTag({ it }: { it: GoodPolozka }) {
  if (it.zdroj === "Help") return <span style={tagChip(C.red)}>Help · žiadosť</span>;
  if (it.zdroj === "Charity") return <span style={tagChip(C.gold)}>✓ Charita {it.charLevel || ""}</span>;
  return <span style={tagChip(KAT[it.kat].c)}>{katLabel(it.kat)}</span>;
}

// JEDNOTNÁ FULL-WIDTH (Instagram) KARTA — všetky príspevky (skutok / charita / žiadosť) rovnako:
// autor hore · veľké médium · titul · pätička podľa typu (charita/žiadosť = progres / „hľadá pomoc").
function GoodKarta({ it, wide, onDetail }: { it: GoodPolozka; wide?: boolean; onDetail: () => void }) {
  const { svetly } = useMotiv();
  const kat = KAT[it.kat];
  const jeZiadost = it.typ === "ziadost";
  const jeCharita = it.typ === "charita";
  const overCol = svetly ? "#0F8A5E" : "var(--a-green)";
  const accent = jeZiadost ? C.red : jeCharita ? C.gold : kat.c;
  const maMedia = !!(it.video || it.fotky?.length);
  // desktop/tablet: foto/video v pomere 16:9. Mobil: pôvodná výška (280 px). Len-emoji ostáva kompaktné.
  const emojiH = wide ? 132 : 168;
  const medLabel = jeCharita ? `✓ Charita ${it.charLevel || ""}`.trim() : jeZiadost ? "Žiadosť" : katLabel(it.kat);
  return (
    <div {...pressable(onDetail, `Otvoriť: ${it.titul}`)} className="good-card" style={{
      background: C.surface2,
      border: wide ? `1px solid ${C.line}` : "none",
      borderBottom: `1px solid ${wide ? C.line : C.line2}`,
      borderRadius: wide ? 18 : 0,
      marginLeft: wide ? 0 : -16, marginRight: wide ? 0 : -16,
      marginBottom: wide ? 0 : 10,
      borderLeft: jeZiadost ? `3px solid ${C.red}` : undefined,
      boxShadow: it.topovane && wide ? `0 0 0 1.5px ${tint(C.gold, .5)}, 0 8px 24px ${tint(C.gold, .14)}` : undefined,
      overflow: "hidden", cursor: "pointer",
    }}>
      {/* autor */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 10px" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", background: it.pfp, boxShadow: `0 3px 10px ${tint(accent, .3)}` }}>{it.ini}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.autor}</span>
            {it.overene && <span style={tagChip(overCol)}><IkonaFajka size={11} color={overCol} /> overené</span>}
            {(jeZiadost || jeCharita) && <ZdrojTag it={it} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, minWidth: 0 }}>
            <IkonaPin size={12} color={C.textSec} />
            <span style={{ fontSize: 12, color: C.textSec, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.lok}</span>
            {it.karma && <span style={{ flex: "none", fontSize: 11.5, color: C.textTer }}>· {it.karma}</span>}
          </div>
        </div>
        <span style={{ fontSize: 11.5, color: C.textSec, flex: "none", fontWeight: 500 }}>{it.cas}</span>
      </div>
      {/* médium — desktop/tablet: 16:9; mobil: pôvodná výška 280 px. Len-emoji ostáva kompaktné. */}
      <div style={{ position: "relative", ...(maMedia ? (wide ? { width: "100%", aspectRatio: MEDIA_AR } : { height: 280 }) : { height: emojiH }), margin: wide ? "0 10px" : 0, borderRadius: wide ? 14 : 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.kat) }}>
        {it.video
          ? <Video src={it.video} poster={it.fotky?.[0]} h={wide ? "100%" : 280} badge={false} />
          : it.fotky?.length
            ? <FotoPrispevku fotky={it.fotky} emoji={it.emoji} h={wide ? "100%" : 280} disableGaleria />
            : <div style={{ fontSize: maMedia ? 46 : 52 }}>{it.media === "kreslene" ? "✎" : it.emoji}</div>}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.34), transparent 42%)", pointerEvents: "none" }} />
        {it.topovane
          ? <span style={mediaBadge({ top: 10, left: 10, color: "var(--a-gold)", fontSize: 11, fontWeight: 800, padding: "5px 11px", border: "1px solid rgba(231,199,102,.6)" })}>★ TOP · prioritné</span>
          : it.vyznam && <span style={mediaBadge({ top: 10, left: 10, color: "var(--a-gold)" })}>★ {it.vyznam}</span>}
        {it.media === "video" && <span style={mediaBadge({ top: 10, right: 10 })}>▶ video</span>}
        <span style={mediaBadge({ bottom: 10, left: 10, color: accent, fontSize: 10.5, fontWeight: 800 })}><span style={{ width: 6, height: 6, borderRadius: "50%", background: accent }} /> {medLabel}</span>
      </div>
      {/* titul + pätička podľa typu */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.36, color: jeZiadost ? C.text : undefined, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.titul}</div>
          {it.topovane && <span style={tagChip(C.gold)}>★ TOP</span>}
        </div>
        {jeCharita && it.ciel ? <div style={{ marginTop: 10 }}><MoniBar vyzbierane={it.vyzbierane || 0} ciel={it.ciel} mini /></div> : null}
        {jeZiadost && (it.ciel
          ? <div style={{ marginTop: 10 }}><MoniBar vyzbierane={it.vyzbierane || 0} ciel={it.ciel} ludia={it.pomocnici} mini /></div>
          : <div style={{ fontSize: 12.5, marginTop: 8, fontWeight: 600, color: C.red }}>❓ {it.pomocnici} ľudí sa zapojilo · <span style={{ color: C.textSec, fontWeight: 400 }}>otvorená podpora</span></div>)}
      </div>
    </div>
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
function GoodDetail({ it, toast, oslavuj, onBack, onVerify, onAutor }: GoodDetailProps) {
  const [platba, setPlatba] = useState<string | null>(null); // "EUR" | "DEED"
  const [qr, setQr] = useState(false);        // QR skutku (§10) — 3 výstupy
  const otvorGaleriu = useGaleria();
  const { wide } = useLayout();
  const { pridajPodporu } = usePersonalizacia(); // podpora → „Čo podporujem" v Môj DEED
  const maHero = !!(it.video || it.fotky?.length);
  const jeZiadost = it.typ === "ziadost", jeCharita = it.typ === "charita";
  const maProgres = (jeZiadost && it.ciel) || jeCharita;
  const pct = maProgres && it.ciel ? Math.round((it.vyzbierane ?? 0) / it.ciel * 100) : 0;

  // zaznamenaj podporu do zdieľaného store (snapshot progresu k momentu podpory)
  const zaznamenajPodporu = (suma: number, kanal: string = "DEED") =>
    pridajPodporu({ refId: it.id, typ: it.typ, modul: it.modul || "good", suma, kanal, komu: it.autor, vyzbierane: it.vyzbierane, ciel: it.ciel });

  function podpor(suma: number) {
    zaznamenajPodporu(suma);
    toast(`Ďakujeme za ${suma} DEED pre ${it.autor}`);
    oslavuj(suma, it.autor);
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* hero — desktop/tablet: 16:9; mobil: pôvodné výšky (video 220 / foto 150) */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.kat), ...(wide && maHero ? { width: "100%", aspectRatio: MEDIA_AR } : (it.video ? {} : { height: 150 })) }}>
        {it.video
          ? <Video src={it.video} poster={it.fotky?.[0]} h={wide ? "100%" : 220} badge={false} />
          : it.fotky?.length
            ? <Foto src={it.fotky[0]} emoji={it.emoji} h={wide ? "100%" : 150} w={wide ? "100%" : undefined} style={{ position: "absolute", inset: 0 }} onClick={() => otvorGaleriu(it.fotky ?? [], 0)} />
            : <div style={{ fontSize: 52 }}>{it.media === "kreslene" ? "✎" : it.emoji}</div>}
        <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, cursor: "pointer", zIndex: 2 }}><IkonaSipVlavo size={20} color="#fff" /></div>
        <div onClick={() => toast("⋯ možnosti")} style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", zIndex: 2 }}><IkonaMoznosti size={18} color="#fff" /></div>
        <span style={{ position: "absolute", bottom: 12, left: 14, pointerEvents: "none" }}><ZdrojTag it={it} /></span>
        {(it.fotky?.length ?? 0) > 1 && <span style={{ position: "absolute", bottom: 12, right: 14, background: "rgba(0,0,0,.6)", borderRadius: 12, padding: "3px 9px", fontSize: 10, color: "#fff", pointerEvents: "none" }}>⧉ {it.fotky?.length} · klikni na foto</span>}
      </div>
      <MiniFotky fotky={it.fotky} />

      <div style={{ padding: "14px 18px" }}>
        <div onClick={onAutor} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", background: it.pfp, flex: "none" }}>{it.ini}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{it.autor} <span style={{ fontSize: 11, color: C.textTer, fontWeight: 500 }}>›</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: C.textSec, marginTop: 1 }}><IkonaPin size={12} color={C.textSec} />{it.lok}{it.karma ? ` · ${it.karma}` : ""}</div>
          </div>
          {it.overene && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--a-green)", background: "rgba(61,214,140,.13)", padding: "3px 9px", borderRadius: 8 }}>overené</span>}
        </div>
        <div style={{ marginTop: 12, fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{it.titul}</div>
        <p style={{ color: C.textSec, fontSize: 14.5, lineHeight: 1.6, marginTop: 9 }}>{it.popis}</p>

        {maProgres && it.ciel && (
          <div style={{ textAlign: "center", padding: 12, background: C.surface2, border: "1px solid rgba(116,166,255,.35)", borderRadius: 14, marginTop: 6 }}>
            <b style={{ fontSize: 22, color: "var(--a-info)" }}>{(it.vyzbierane ?? 0).toLocaleString("sk")} €</b> <span style={{ color: C.textSec }}>z {it.ciel.toLocaleString("sk")} € ({pct}%)</span>
            <div style={{ height: 6, background: "rgba(var(--glass-rgb),.12)", borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99 }} />
            </div>
          </div>
        )}

        <PodporaSekcia
          onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
          upvotes={Math.floor((it.lajky || 0) / 3)} onUpvote={() => toast("Páči sa ti to")}
          onPodpor={(s: number) => podpor(s)} onSms={() => toast("SMS podpora (euro/operátor)")}
          onKanal={(k: string) => setPlatba(k)} />

        {/* QR skutku (§10) — klik otvorí univerzálny QR s 3 výstupmi */}
        <div onClick={() => setQr(true)} style={{ display: "flex", alignItems: "center", gap: 14, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, marginTop: 14, cursor: "pointer" }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: "#fff", flex: "none", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridTemplateRows: "repeat(5,1fr)", gap: 1, padding: 5 }}>
            {[...Array(25)].map((_, k) => <i key={k} style={{ background: (k * 7 + 3) % 3 ? "#0B0C0F" : "transparent", borderRadius: 1 }} />)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5 }}>QR tohto skutku</div>
            <div style={{ fontSize: 12, color: C.textTer }}>Skenovať · kopírovať · zdieľať</div>
          </div>
          <div style={{ marginLeft: "auto", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 11, padding: "9px 15px", borderRadius: 11, cursor: "pointer", boxShadow: "0 5px 16px rgba(99,134,255,.32)" }}>Otvoriť QR</div>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: C.textTer, marginTop: 16 }}>Bol si pri tom? Komunita preveruje skutky.</div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <VerifyBtn ok onClick={() => onVerify("ok")} />
          <VerifyBtn onClick={() => onVerify("no")} />
        </div>
      </div>

      {/* simulácia platby (EUR karta / DEED peňaženka) */}
      {platba && <PlatbaModal kanal={platba} komu={it.autor} onClose={() => setPlatba(null)}
        onDone={(s: number) => { zaznamenajPodporu(s, platba); toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DEED"} · ${it.autor}`); oslavuj(s, it.autor); }} />}

      {/* univerzálny QR skutku (§10) — typ „skutok", 3 výstupy */}
      {qr && <QrModal typ="skutok" titul={`QR skutku č. ${it.num.toLocaleString("sk")}`} popis={it.titul.slice(0, 38) + "…"}
        odkaz={`https://deed.app/s/${it.num}`} onClose={() => setQr(false)} toast={toast} />}
    </div>
  );
}

function SekciaLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "18px 0 9px" }}>{children}</div>;
}

function VerifyBtn({ ok, onClick }: { ok?: boolean; onClick: () => void }) {
  const { svetly } = useMotiv();
  const accent = ok ? "var(--a-green)" : "#E0524B";
  const titleCol = svetly ? accent : (ok ? "var(--a-green)" : "#F68C8B");
  return (
    <div onClick={onClick} style={{ flex: 1, height: 62, borderRadius: 13, display: "flex", alignItems: "center", gap: 10, paddingLeft: 16, cursor: "pointer",
      background: ok ? "rgba(46,200,140,.12)" : "rgba(242,112,111,.12)", border: `1px solid ${ok ? "rgba(46,125,82,.55)" : "rgba(122,48,48,.55)"}` }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, background: ok ? "rgba(46,200,140,.2)" : "rgba(242,112,111,.2)", color: accent }}>{ok ? "✓" : "✕"}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.1, color: titleCol }}>{ok ? "Overujem" : "Namietam"}</div>
        <div style={{ fontSize: 11.5, color: C.textTer }}>skutok</div>
      </div>
    </div>
  );
}

// ===================== OVERENIE / NÁMIETKA =====================
function GoodVerify({ it, mode, toast, onBack }: { it: GoodPolozka; mode: string; toast: (m: string) => void; onBack: () => void }) {
  const ok = mode === "ok";
  return (
    <div style={{ paddingBottom: 24 }}>
      <Hlavicka title={ok ? "Overujem skutok" : "Námietka k skutku"} onBack={onBack} titleColor={ok ? "var(--a-green)" : "var(--a-danger)"} />
      <div style={{ padding: "4px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, fontSize: 13 }}>
          <div><b>{it.autor}</b><div style={{ fontSize: 12, color: C.textTer }}>{it.titul.slice(0, 30)}… · č. {it.num.toLocaleString("sk")}</div></div>
        </div>
        <div style={{ background: ok ? "#0f2417" : "#2a1414", border: `1px solid ${ok ? "#2E7D52" : "#7A3030"}`, borderRadius: 12, padding: 14, marginTop: 14, fontSize: 12, lineHeight: 1.4, color: ok ? "#C2E6D4" : "#F0B0AC" }}>
          {ok ? "Potvrdzujem, že som bol pri tom a skutok sa naozaj stal. Nepravdivé overenie môže mať následky." : "Námietka sa preveruje. Falošná námietka v zlej viere = rovnaká sankcia ako podvod."} <span style={{ fontSize: 11, color: C.textTer }}>[právna veta]</span>
        </div>
        <SekciaLabel>{ok ? "Doplň (nepovinné)" : "Vysvetli dôvod námietky · povinné"}</SekciaLabel>
        <textarea rows={3} placeholder={ok ? "Bol som tam, videl som to…" : "Napríklad: bol som tam o hodinu neskôr a…"} style={inp(70)} />
        <SekciaLabel>Foto/video (nepovinné — zvýši dôveryhodnosť)</SekciaLabel>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {[0, 1, 2].map((k) => (
            <div key={k} onClick={() => toast("📷 Pridať")} style={{ width: 64, height: 64, border: `1px dashed ${C.line}`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: C.textTer, cursor: "pointer" }}>+</div>
          ))}
        </div>
        <button onClick={() => { toast(ok ? "Ďakujeme — tvoje overenie dvíha dôveryhodnosť skutku" : "Námietka odoslaná — preverí ju AI + overenie"); setTimeout(onBack, 400); }}
          style={{ width: "100%", height: 50, borderRadius: 12, border: `1px solid ${ok ? "#2E7D52" : "#7A3030"}`, background: ok ? "#0f2417" : "#2a1414", color: ok ? "#cfeede" : "#F0B0AC", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18 }}>
          {ok ? "✓ Overujem skutok" : "✕ Podávam námietku"}
        </button>
      </div>
    </div>
  );
}

// ===================== PRIDAŤ SKUTOK =====================
function GoodAdd({ toast, oslavuj, onDone }: { toast: (m: string) => void; oslavuj: (suma: number, komu: string) => void; onDone: () => void }) {
  const [krok, setKrok] = useState("vyber"); // vyber | solo | nahlad | vyhodnotene
  const [text, setText] = useState("");
  const [miesto, setMiesto] = useState("");        // kde sa skutok stal — zaradenie do regiónu/feedu (nie dôkaz pravdy)
  const [kontrola, setKontrola] = useState(false); // medzistav: „AI kontroluje skutok…"
  const [aiNavrh, setAiNavrh] = useState("");      // editovateľný AI návrh textu (krok náhľad)
  const [suhlas, setSuhlas] = useState(false);     // povinné potvrdenie pravdivosti skutku
  const [retaz, setRetaz] = useState(false);       // Reťaz dobra — Cesta A (po vyhodnotení významného)
  const ODMENA = 130;                              // DEED odmena za významný skutok (placeholder)
  const mozePokracovat = miesto.trim().length > 0; // miesto je povinné

  // medzistav po „Pokračovať": krátky loading, neskôr sem príde reálne AI overenie
  useEffect(() => {
    if (!kontrola) return;
    const t = setTimeout(() => { setKontrola(false); setKrok("nahlad"); }, 1500);
    return () => clearTimeout(t);
  }, [kontrola]);

  // späť: počas kontroly ju najprv zruš, inak normálna navigácia medzi krokmi
  const nazad = () => {
    if (kontrola) return setKontrola(false);
    if (krok === "vyber") return onDone();
    if (krok === "vyhodnotene") return setKrok("nahlad");
    setKrok(krok === "nahlad" ? "solo" : "vyber");
  };

  const aiText = () => {
    const raw = text.trim() || "Pomohol som susede vyniesť nákup do tretieho poschodia.";
    let s = raw.charAt(0).toUpperCase() + raw.slice(1);
    if (!/[.!?]$/.test(s)) s += ".";
    return s;
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <Hlavicka title={krok === "vyber" ? "Pridať skutok" : krok === "solo" ? "Opíš svoj skutok" : krok === "vyhodnotene" ? "Skutok vyhodnotený" : "Skontroluj a potvrď"}
        onBack={nazad} />

      <div style={{ padding: 18 }}>
        {krok === "vyber" && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>Ako si pomohol?</h2>
            <p style={{ color: C.textSec, fontSize: 13 }}>Vyber, či si skutok urobil sám, alebo vo viacerých.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div onClick={() => setKrok("solo")} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 16, padding: "24px 14px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 34 }}>🙋</div><div style={{ fontWeight: 700, marginTop: 10 }}>Sólo</div><div style={{ fontSize: 11, color: C.textTer, marginTop: 4 }}>urobil som to sám</div>
              </div>
              <div onClick={() => toast("Komunitný — scan QR účastníkov (demo)")} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 16, padding: "24px 14px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 34 }}>👥</div><div style={{ fontWeight: 700, marginTop: 10 }}>Komunitný</div><div style={{ fontSize: 11, color: C.textTer, marginTop: 4 }}>boli sme viacerí</div>
              </div>
            </div>
            <div style={{ padding: "14px 0", fontSize: 11, color: C.textTer, lineHeight: 1.5 }}>Žiadosti o pomoc sa vytvárajú v module Help. Tu pridávaš len skutky, ktoré si vykonal.</div>
          </>
        )}

        {krok === "solo" && !kontrola && (
          <>
            <p style={{ color: C.textSec, fontSize: 13 }}>Napíš vlastnými slovami, čo si urobil. AI to upraví a navrhne kategóriu.</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Napr.: pomohol som susede vyniesť nákup do tretieho poschodia…" style={{ ...inp(90), marginTop: 8 }} />

            {/* kde sa skutok stal — povinné, slúži na zaradenie do regiónu/feedu */}
            <div style={{ fontSize: 12, color: C.textTer, lineHeight: 1.5, margin: "16px 0 8px" }}>Kde sa skutok stal — pomôže zaradiť ho do správneho okolia.</div>
            <input value={miesto} onChange={(e) => setMiesto(e.target.value)} placeholder="Mesto / obec / miesto" style={inp(50)} />

            <SekciaLabel>Dôkaz — foto/video (ide len do AI overenia)</SekciaLabel>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {[0, 1].map((k) => (
                <div key={k} onClick={() => toast("📷 Pridať dôkaz")} style={{ width: 64, height: 64, border: `1px dashed ${C.line}`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: C.textTer, cursor: "pointer" }}>+</div>
              ))}
            </div>
            <button onClick={() => { if (!mozePokracovat) return; setAiNavrh(aiText()); setSuhlas(false); setKontrola(true); }} disabled={!mozePokracovat}
              style={{ width: "100%", height: 50, borderRadius: 14, background: GRAD, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: mozePokracovat ? "pointer" : "not-allowed", marginTop: 18, boxShadow: "0 8px 26px rgba(99,134,255,.32)", opacity: mozePokracovat ? 1 : .5, transition: "opacity .2s ease" }}>
              Pokračovať
            </button>
          </>
        )}

        {krok === "solo" && kontrola && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "64px 18px", textAlign: "center", animation: "fadeUp .25s ease" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.line}`, borderTopColor: "var(--a-plum)", animation: "tocenie .8s linear infinite" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>AI kontroluje skutok…</div>
            <div style={{ fontSize: 12.5, color: C.textTer, maxWidth: 250, lineHeight: 1.5 }}>Chvíľu strpenia — overujeme tvoj popis.</div>
          </div>
        )}

        {krok === "nahlad" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b style={{ color: "var(--a-green)", fontSize: 13 }}>✦ AI návrh textu</b>
              <span style={{ fontSize: 11, color: C.textTer }}>· môžeš ho upraviť</span>
            </div>
            {/* editovateľný AI návrh — používateľ má posledné slovo */}
            <textarea value={aiNavrh} onChange={(e) => setAiNavrh(e.target.value)} rows={3}
              style={{ ...inp(90), marginTop: 8, background: "rgba(61,214,140,.10)", border: "1px solid rgba(46,125,82,.45)" }} />
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 8 }}>Kategória: Komunita · navrhnutá AI</div>
            <p style={{ fontSize: 11, color: C.textTer, marginTop: 14 }}>Vidíš, ako sa skutok zobrazí. Máš posledné slovo — text vyššie môžeš upraviť.</p>

            {/* potvrdenie pravdivosti — povinné zaškrtnutie pred pridaním */}
            <div onClick={() => setSuhlas((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(242,112,111,.1)", border: `1px solid ${suhlas ? "rgba(31,191,143,.55)" : "rgba(122,48,48,.4)"}`, borderRadius: 12, padding: 14, marginTop: 14, fontSize: 12.5, lineHeight: 1.45, color: C.textSec, cursor: "pointer", transition: "border-color .2s ease" }}>
              <div style={{ width: 26, height: 26, flex: "0 0 auto", borderRadius: 8, border: `2px solid ${suhlas ? "var(--a-green)" : C.textTer}`, background: suhlas ? "var(--a-green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 800, transition: "all .15s ease" }}>{suhlas ? "✓" : ""}</div>
              <span>Skutok je pravdivý a súhlasím s náhľadom. Klamstvo = zrušenie + sankcia.</span>
            </div>

            <button onClick={() => { if (!suhlas) return; setKrok("vyhodnotene"); }} disabled={!suhlas}
              style={{ width: "100%", height: 50, borderRadius: 14, background: GRAD_ZELENY, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: suhlas ? "pointer" : "not-allowed", marginTop: 18, boxShadow: "0 8px 26px rgba(31,191,143,.32)", opacity: suhlas ? 1 : .5, transition: "opacity .2s ease" }}>
              Súhlasím a pridať skutok
            </button>
          </>
        )}

        {/* CESTA A — po vyhodnotení významného skutku: ponuka Reťaze dobra (§9) */}
        {krok === "vyhodnotene" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 0 14px" }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(31,191,143,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}><IkonaFajka size={28} color="var(--a-green)" /></div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Skutok schválený</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--a-gold)", background: "rgba(240,199,90,.12)", border: "1px solid rgba(240,199,90,.3)", padding: "4px 11px", borderRadius: 20 }}>★ Vyhodnotený ako VÝZNAMNÝ · 3 riadky vo feede</div>
            </div>

            <div style={{ textAlign: "center", background: "rgba(91,155,255,.07)", border: "1px solid rgba(91,155,255,.28)", borderRadius: 16, padding: "16px 14px" }}>
              <div style={{ fontSize: 12, color: C.textSec }}>Pridelená odmena</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--a-info)", marginTop: 2 }}>+{ODMENA} <span style={{ fontSize: 15 }}>DEED</span></div>
            </div>

            <p style={{ textAlign: "center", fontSize: 13.5, color: C.textSec, lineHeight: 1.5, marginTop: 16 }}>Chceš celú odmenu sebe, alebo sa <b style={{ color: "var(--a-green)" }}>podeliť</b> v Reťazi dobra?</p>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => { toast(`Skutok pridaný! +${ODMENA} DEED — celé tebe`); oslavuj(ODMENA, "teba"); setTimeout(onDone, 700); }}
                style={{ flex: 1, height: 50, borderRadius: 14, border: `1px solid ${C.line}`, background: "rgba(var(--glass-rgb),.05)", color: C.text, fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>Celé mne</button>
              <button onClick={() => setRetaz(true)}
                style={{ flex: 1.2, height: 50, borderRadius: 14, border: "none", background: GRAD_ZELENY, color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 26px rgba(31,191,143,.32)" }}>♻ Podeliť sa</button>
            </div>
            <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: 14, textAlign: "center" }}>Ponuka Reťaze sa zobrazí len pri významných skutkoch (3–4 riadky). Pri menších ju spustíš ručne v <b>Profil → Moje skutky</b>.</div>
          </>
        )}
      </div>

      {/* Reťaz dobra — Cesta A (§9): nastav % + vyber žiadosť → QR D+R */}
      {retaz && (
        <RetazDobraSheet odmena={ODMENA} mode="skutok" titulOdkaz="Tvoj skutok"
          onClose={() => setRetaz(false)}
          onDone={({ pct, ziadost }: { pct: number; ziadost?: { nazov?: string } }) => { oslavuj(ODMENA, ziadost?.nazov || "reťaz dobra"); setTimeout(onDone, 700); }}
          toast={toast} />
      )}
    </div>
  );
}

// ===================== NÁSTENKA (board) =====================
function GoodBoard({ onBack, onEvent, toast }: { onBack: () => void; onEvent: (id: string) => void; toast: (m: string) => void }) {
  const { data: EVENTS = [] } = useGoodUdalosti();
  const [filter, setFilter] = useState("Všetko");
  const tops = EVENTS.filter((e) => e.top);
  const list = EVENTS.filter((e) => filter === "Všetko" || e.src === filter || (filter === "Šport" && e.kat === "Zdravie"));
  const chipy = ["Všetko", "Šport", "Komunita", "Mesto", "Partner"];

  return (
    <div style={{ paddingBottom: 24 }}>
      <Hlavicka title="Nástenka" onBack={onBack} right={<span style={{ color: C.textTer, fontSize: 16 }}>▦</span>} />

      {/* topované */}
      <SekciaLabel><span style={{ color: C.gold }}>TOPOVANÉ · odporúčané</span></SekciaLabel>
      <div style={{ display: "flex", gap: 10, padding: "0 16px 8px", overflowX: "auto" }}>
        {tops.map((e) => (
          <div key={e.id} onClick={() => onEvent(e.id)} style={{ minWidth: 152, flex: "0 0 auto", background: C.surface2, border: "1px solid rgba(231,199,102,.3)", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
            <div style={{ height: 64, background: heroGrad(e.kat), display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: C.gold }}>★</span>
              <span style={{ fontSize: 18, color: KAT[e.kat].c }}>▶</span>
            </div>
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: KAT[e.kat].c }}>{e.when}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
              <div style={{ fontSize: 9, color: C.textTer, marginTop: 2 }}>{e.who}</div>
            </div>
          </div>
        ))}
      </div>

      {/* filtre */}
      <div style={{ display: "flex", gap: 8, padding: "6px 16px 8px", overflowX: "auto" }}>
        {chipy.map((f) => {
          const on = filter === f;
          return <div key={f} onClick={() => setFilter(f)} style={{ flex: "0 0 auto", padding: "7px 14px", borderRadius: 13, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", background: on ? "rgba(91,155,255,.12)" : C.surface2, border: `1px solid ${on ? "rgba(116,166,255,.4)" : C.line}`, color: on ? "#7FC2EF" : C.textSec, fontWeight: on ? 700 : 500 }}>{f}</div>;
        })}
      </div>

      {/* všetky udalosti */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 18px 0" }}>
        <SekciaLabel>VŠETKY UDALOSTI</SekciaLabel>
        <span style={{ fontSize: 11, color: C.textTer }}>{EVENTS.length * 18} v okolí</span>
      </div>
      <div style={{ padding: "0 16px" }}>
        {list.map((e) => (
          <div key={e.id} onClick={() => onEvent(e.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line2}`, borderRadius: 12, padding: "11px 12px", marginBottom: 8, cursor: "pointer" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: SRC_COL[e.src], flex: "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
              <div style={{ fontSize: 12, color: C.textTer, marginTop: 3 }}>{e.who} · {e.src}</div>
            </div>
            <div style={{ textAlign: "right", flex: "none" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: SRC_COL[e.src] }}>{e.when}</div>
              <div style={{ color: C.textTer, fontSize: 16 }}>›</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== DETAIL UDALOSTI =====================
function GoodEvent({ id, onBack, toast, oslavuj }: { id: string | null; onBack: () => void; toast: (m: string) => void; oslavuj: (suma: number, komu: string) => void }) {
  const { data: EVENTS = [] } = useGoodUdalosti();
  const e: Udalost | undefined = EVENTS.find((x) => x.id === id);
  if (!e) return null;
  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ height: 150, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(e.kat) }}>
        <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, cursor: "pointer", zIndex: 2 }}><IkonaSipVlavo size={20} color="#fff" /></div>
        <div style={{ fontSize: 46, color: KAT[e.kat].c }}>▶</div>
        <span style={{ position: "absolute", bottom: 12, left: 14, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: "rgba(0,0,0,.6)", color: SRC_COL[e.src], pointerEvents: "none" }}>{e.src}</span>
      </div>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{e.title}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.textSec }}>🗓 {e.when}</span>
          <span style={{ fontSize: 12, color: C.textSec }}>📍 {e.place}</span>
          <span style={{ fontSize: 12, color: C.textSec }}>👥 {e.cap}</span>
        </div>
        <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.55, marginTop: 12 }}>{e.desc}</p>

        <div style={{ background: "rgba(91,155,255,.07)", border: "1px solid rgba(91,155,255,.22)", borderRadius: 13, padding: "11px 13px", marginTop: 12, fontSize: 12, color: C.blueL, lineHeight: 1.5 }}>
          Po prihlásení dostaneš pripomienku a QR vstupenku. Účasť sa pripíše do tvojich aktivít a karmy.
        </div>

        <button onClick={() => { toast(`Prihlásené na: ${e.title}`); oslavuj(20, "komunitu"); }}
          style={{ width: "100%", height: 50, borderRadius: 12, background: GRAD, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18, boxShadow: "0 8px 26px rgba(99,134,255,.32)" }}>
          Zúčastním sa
        </button>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <div onClick={() => toast("Zdieľané")} style={{ flex: 1, height: 46, borderRadius: 11, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Zdielanie size={15} color={C.textSec} /> Zdieľať</div>
          <div onClick={() => toast("Uložené na neskôr")} style={{ flex: 1, height: 46, borderRadius: 11, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><IkonaUlozit size={15} color={C.textSec} /> Uložiť</div>
        </div>
      </div>
    </div>
  );
}
