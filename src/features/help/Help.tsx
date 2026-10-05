import { Emo } from "@/components/icons";
import { useState, useEffect, memo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SIRKA, C, inp, infoBox, btn, SPACE, RADIUS } from "@/theme";
import { pasmo, POZNAMKA_DAVKY, tagLabels, CHARITA_SEGMENTY, segmentLabel, OVERENIA_POTREBNE, ESCROW } from "./konstanty";
import { TagTemy, prepniTag, ZranitelniBlok, PrisnyBadge, AiPoznamka, GuardFuzzy } from "./HelpKit";
import { Foto, Avatar, MiniFotky, Hlavicka, ModulHlavicka, PlatobnyModul, PlatbaModal, HladanieModal, OblubeneHviezda, Otazka, Vyber, vyberBox, NavBtns, Suhrn, DokladRow, toast, Oslava, useGaleria, useLayout, useScrollPamat, useStrankaAkcie, useTvorbaGate, Ticker, StatRiadok, FiltreStat, FeedStlpce, FeedGrid, FeedCard, KartaBadge, typKluc, BackHeader, ProgresBox, obalSiroky, OkruhVyber, Lupa, Zdielanie, IkonaVlajka, IkonaFoto, IkonaPlay, IkonaDoska, IkonaPin, IkonaOsoba, IkonaCharita, FeedSkeleton, EmptyState, ErrorState, ScreenSwitch, KontextMenu, Overene, IkonaMoznosti, IkonaOdkaz, SwipeBack, ZoznamDarcov, FormatovanyText, RichTextInput } from "@/shared";
import { pridajDar, type VolbaDaru } from "@/lib/darcovia";
import { cistyText } from "@/lib/richtext";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { pripravFeed, FEED_CFG } from "@/lib/feed";
import { MEDIA_AR } from "@/lib/cardSize";
import type { HelpFeedItem, Subjekt, Oblubeny, QrSplitRow } from "@/types";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { DomovBoard, DomovEvent } from "@/features/domov/Domov";
import { useHelpFeed, useQrSplitCreate, qk, repo } from "@/data";
import { SplitConfigStep, splitOwnerPct, splitCielePayload, splitValid, splitPreQrModal, QrModal, SplitQrSheet, type SplitCiel } from "@/shared";
import { qrUrl } from "@/lib/qr";
import { usePouzivatel } from "@/lib/pouzivatel";
import { usePersonalizacia } from "@/lib/personalizacia";
import { useLokalita } from "@/lib/lokalita";
import { tint, tagChip, rovnakeOkremFunkcii } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { useVrstva } from "@/lib/urlnav";
import { kopiruj, zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import { OzvatSaSheet } from "@/components/ozvatsa";
import { NahlasitSheet } from "@/components/nahlasit";
import { OverujemNamietam } from "@/features/viera/ui";
import { USER_LOK, ZIVE_DARY, CHARITY_FISKALNE } from "./mock";

/*
  ============================================================
  MODUL HELP — crowdfunding pre ľudí v núdzi
  feed → detail → podpora · ＋ Pridať → Ponúkam / Dopytujem
  ============================================================
*/

// príspevok Help → záznam obľúbených (bookmark)
const oblubenyZHelp = (z: any): Oblubeny => ({
  refId: z.id, typ: z.typ, modul: z.modul || "help",
  nazov: z.nazov, emoji: z.ikona, lok: z.lok, vyzbierane: z.suma, ciel: z.ciel,
});

// ===================== MODUL =====================
export default function ModulHelp({ wide }: { wide?: boolean }) {
  const { desktop } = useLayout();
  const { data: MOCK_FEED = [] } = useHelpFeed();
  const [screen, setScreen] = useState("feed"); // feed | detail | add | offer | request
  const [aktDetail, setAktDetail] = useState<any>(null);
  const [aktSubjekt, setAktSubjekt] = useState<Subjekt | null>(null);
  const [aktEvent, setAktEvent] = useState<string | null>(null);
  const [hladaj, setHladaj] = useState(false);
  // filter feedu žije TU (nie vo Feed) — prežije návrat z detailu (rovnaké správanie ako Domov)
  const [radius, setRadius] = useState<string>("stvrt");
  const [view, setView] = useState<"all" | "ziadost" | "ponuka">("all");
  const otvorZ = (z: any) => { setAktDetail(z); setScreen("detail"); };

  // pod-obrazovka = vrstva histórie → browser Back sa vráti na feed (nie von z appky)
  useVrstva(screen !== "feed", () => setScreen("feed"), screen);

  // tvorba: (1) OPTIMISTICKY vlož navrch feedu (okamžitý výsledok) a (2) zapíš do DB
  // (prispevok, data.help). Po úspešnom zápise invaliduj feed → refetch z DB (uvidia aj ostatní).
  // Bez DB (mock) ostane len optimistický záznam.
  const qc = useQueryClient();
  const ja = usePouzivatel();
  const lok = useLokalita();
  const { pridajZbierku } = usePersonalizacia(); // finančná žiadosť → „Moje zbierky" v Môj DEED
  const createSplit = useQrSplitCreate();
  const [oslava, setOslava] = useState<{ emoji: string; titul: string; text: ReactNode } | null>(null);
  // hotový autorský Split QR po zverejnení — UKÁŽE sa (zdieľanie/tlač), nezapíše sa len potichu
  const [hotovyQr, setHotovyQr] = useState<{ titul: string; odkaz?: string; split: { komu: string; pct: number }[] } | null>(null);
  const zverejni = (vstup: HelpFeedItem, osl: { emoji: string; titul: string; text: ReactNode }, split?: SplitCiel[]) => {
    const item = { ...vstup, lat: lok.lat, lng: lok.lng, lok: lok.mesto }; // geo = aktívne mesto
    qc.setQueryData<HelpFeedItem[]>(qk.help.feed, (old = []) => [item, ...old]);
    // finančná zbierka (má cieľ) → zaregistruj medzi „Moje zbierky" (spravovanie v Môj DEED)
    if (item.ciel) {
      pridajZbierku({
        id: String(item.id), nazov: item.nazov, modul: "help", typ: item.typ, emoji: item.ikona,
        lok: lok.mesto, ciel: item.ciel, vyzbierane: item.suma || 0,
        vytvorene: new Date().toISOString(), stav: "aktivna", doklady: [],
      });
    }
    // ak autor nastavil rozdelenie → po vytvorení QR aj zobraz (real slug z DB, mock = placeholder)
    const ukazQr = (row?: QrSplitRow | null) => {
      if (!split || !split.length) return;
      setHotovyQr({
        titul: item.nazov,
        odkaz: row?.slug ? qrUrl("split", row.slug) : undefined,
        split: splitPreQrModal(ja.celeMeno && ja.celeMeno.trim() ? ja.celeMeno : "Ty (autor)", split),
      });
    };
    repo.help.vytvor(item, ja.ucetId)
      .then((novyId) => {
        if (novyId) qc.invalidateQueries({ queryKey: qk.help.feed });
        // autorský QR split (ak autor nastavil rozdelenie pri tvorbe)
        if (novyId && split && split.length) {
          createSplit.mutate({
            caseId: novyId, owner: ja.ucetId, ownerText: ja.celeMeno,
            ownerPodiel: +(splitOwnerPct(split) / 100).toFixed(5),
            ciele: splitCielePayload(split), zdroj: "autor", mena: "DEED",
          }, { onSuccess: (row) => ukazQr(row), onError: () => ukazQr() });
        } else ukazQr(); // mock bez DB → placeholder QR (funkčne rovnaké UI)
      })
      .catch(() => ukazQr());
    setScreen("feed");
    setOslava(osl);
    setTimeout(() => setOslava(null), 2200);
  };

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  useScrollPamat(screen); // pamäť scrollu — „Späť" obnoví pozíciu feedu (nie skok hore)

  // na tablete/desktope sa detailové obrazovky vycentrujú do čitateľnej šírky
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  return (
    <div style={{ minHeight: "100%" }}>
      <ScreenSwitch k={screen}>
      {screen === "feed" && <Feed wide={wide} toast={toast} onDetail={otvorZ} onHladaj={() => setHladaj(true)} onAdd={() => setScreen("add")} onBoard={() => setScreen("board")}
        radius={radius} setRadius={setRadius} view={view} setView={setView} />}
      {screen === "detail" && obal(<SwipeBack onBack={() => setScreen("feed")}><Detail z={aktDetail} onBack={() => setScreen("feed")} onAutor={(s) => { setAktSubjekt(s); setScreen("cudzi"); }} /></SwipeBack>)}
      {screen === "add" && obal(<Add onBack={() => setScreen("feed")} onOffer={() => setScreen("offer")} onRequest={() => setScreen("request")} />)}
      {screen === "offer" && obal(<OfferFlow onBack={() => setScreen("feed")} onZverejni={zverejni} />)}
      {screen === "request" && obal(<RequestFlow onBack={() => setScreen("feed")} onZverejni={zverejni} />)}
      {screen === "cudzi" && aktSubjekt && obal(<CudziProfil subjekt={aktSubjekt as any} toast={toast} onBack={() => setScreen("feed")} />)}
      {screen === "board" && <DomovBoard onBack={() => setScreen("feed")} onEvent={(id) => { setAktEvent(id); setScreen("event"); }} />}
      {screen === "event" && obal(<DomovEvent id={aktEvent} onBack={() => setScreen("board")} toast={toast} oslavuj={(s, komu) => toast(`Ďakujeme za ${s} pre ${komu}`)} />)}
      </ScreenSwitch>

      {hladaj && (
        <HladanieModal akcent="var(--a-danger)" placeholder="Hľadať žiadosti, ponuky, ľudí…"
          data={MOCK_FEED.filter((z) => z.typ !== "charity").map((z) => ({
            id: z.id, titul: z.nazov, podtitul: z.pribeh, kat: z.lok, emoji: z.ikona,
            tag: z.typ === "ziadost" ? "Žiadosť" : "Ponuka",
          }))}
          onPick={(id: number | string) => { const z = MOCK_FEED.find((x) => x.id === id); if (z) otvorZ(z); }}
          onSubjekt={(s) => { setAktSubjekt(s); setScreen("cudzi"); }}
          toast={toast} defaultFilter="Žiadosti Help"
          onClose={() => setHladaj(false)} />
      )}

      {oslava && <Oslava emoji={oslava.emoji} title={oslava.titul} text={oslava.text} onClose={() => setOslava(null)} />}

      {/* autorský Split QR po zverejnení — zdieľaj / vytlač / skenuj (§10 tri výstupy) */}
      {hotovyQr && (
        <QrModal odznak="D++" typ="rozdelenie" titul={`QR reťaze · ${hotovyQr.titul}`}
          popis="Tvoj autorský QR — platby sa rozdelia podľa zafixovaných %. Zdieľaj alebo vytlač."
          odkaz={hotovyQr.odkaz ?? "https://deed.good/split/demo"} split={hotovyQr.split}
          onClose={() => setHotovyQr(null)} toast={toast} />
      )}
    </div>
  );
}

// ===================== FEED =====================
type HelpFeedProps = {
  wide?: boolean; toast: (m: string) => void; onDetail: (z: any) => void; onHladaj: () => void; onAdd: () => void; onBoard: () => void;
  radius: string; setRadius: (r: string) => void; view: "all" | "ziadost" | "ponuka"; setView: (v: "all" | "ziadost" | "ponuka") => void;
};
function Feed({ wide, toast, onDetail, onHladaj, onAdd, onBoard, radius, setRadius, view, setView }: HelpFeedProps) {
  const { desktop } = useLayout();
  const { data: MOCK_FEED = [], isLoading, isError, refetch } = useHelpFeed();
  const lok = useLokalita(); // stred feedu = aktívne mesto
  // živý ticker darov
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 3500);
    return () => clearInterval(t);
  }, []);
  const dar = ZIVE_DARY[tick % ZIVE_DARY.length];

  // rádius + typ pomoci prichádzajú z ModulHelp (prežijú návrat z detailu).
  // Feed algoritmus (Časť B): filter podľa okruhu + adaptívny prah + zoradenie.
  // Ponuky/žiadosti si nechávajú vlastný `velkost` — len filter + poradie.
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const { gate } = useTvorbaGate(); // pasívny nesmie tvoriť (talent)
  // charitu z Help vynechávame; potom filter podľa zvoleného typu (žiadosť / ponuka)
  const zaklad = MOCK_FEED.filter((z) => z.typ !== "charity" && (view === "all" || z.typ === view));
  const feed = pripravFeed(zaklad as any, { lat: lok.lat, lng: lok.lng, radius } as any);

  const karta = (z: any) => <HelpKarta key={z.id} z={z} wide={wide} onClick={() => onDetail(z)} />;
  const jeZiadost = (z: any) => z.typ === "ziadost";

  // kontextové akcie stránky → plávajúce „+ Pridať" dole + sekcia „Na tejto stránke" v menu (☰)
  useStrankaAkcie(() => ({
    pridat: { id: "add", label: "Pridať", onClick: onAdd },
    extra: [
      { id: "talent", label: "Ukáž svoj talent", popis: "Tvorivé skutky a talenty", ikona: <IkonaPlay size={18} color="var(--a-green)" />, onClick: gate(() => toast("Ukáž svoj talent")) },
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
            <Seg on={view === "ziadost"} col="var(--a-danger)" Ikona={IkonaOsoba} label="Žiadosti" onClick={() => setView("ziadost")} />
            <Seg on={view === "ponuka"} col="var(--a-plum)" Ikona={IkonaCharita} label="Ponuky" onClick={() => setView("ponuka")} />
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
        <FeedStlpce wide={wide} padding={`4px ${SPACE.md}px`}
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
// ikona = minimalistická line-ikona (ako v zvyšku appky), farbí sa podľa stavu
function Seg({ on, col, label, Ikona, onClick }: { on: boolean; col: string; label: string; Ikona?: (p: { size?: number; color?: string }) => React.ReactElement; onClick: () => void }) {
  return (
    <div {...pressable(onClick, label)} aria-current={on ? "page" : undefined} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, height: 38, borderRadius: RADIUS.sm, fontSize: 12.5, fontWeight: on ? 700 : 600, cursor: "pointer", whiteSpace: "nowrap", background: on ? tint(col, .15) : C.surface2, border: `1px solid ${on ? tint(col, .5) : C.line2}`, color: on ? col : C.textSec }}>
      {Ikona && <Ikona size={15} color={on ? col : C.textTer} />}{label}
    </div>
  );
}

// JEDNOTNÁ karta = zdieľaná FeedCard (rovnaká anatómia ako Domov/Charita/Aktivity);
// Help mapuje žiadosť/ponuku/charitu do slotov (typový odznak, sponzor, progres).
// memo: re-render len pri zmene položky/wide (inline onClick sa ignoruje)
const HelpKarta = memo(HelpKartaBase, rovnakeOkremFunkcii);
function HelpKartaBase({ z, wide, onClick }: { z: any; wide?: boolean; onClick: () => void }) {
  const jeZiadost = z.typ === "ziadost";
  const jePonuka = z.typ === "ponuka";
  const jeKriza = z.typSituacie === "kriza";
  const accent = jeZiadost ? (z.sponzor ? C.gold : C.red) : jePonuka ? C.purple : C.gold;
  return (
    <FeedCard wide={wide} onClick={onClick} label={z.nazov} typ={typKluc(z.typ)} stav={jeKriza ? { surne: true } : undefined} accent={jeKriza ? C.red : accent} ring={jeKriza ? C.red : undefined}
      media={{
        fotky: z.fotky, emoji: z.ikona, h: 230,
        overlay: (
          <>
            {/* typ (Žiadosť/Ponuka/Charita) rieši FeedCard vľavo hore; tu ostáva len urgentnosť + sponzor (vpravo) */}
            {z.sponzor && !jeKriza && <KartaBadge pos={{ top: 10, right: 10 }}>{z.sponzor.meno} · {z.sponzor.suma} €</KartaBadge>}
            <OblubeneHviezda polozka={oblubenyZHelp(z)} style={{ top: "auto", bottom: 10 }} />
          </>
        ),
      }}
      title={z.nazov}
      titleChips={
        <>
          {z.overeny && <Overene size={15} label="Overená žiadosť" />}
          {z.odbornik && <span style={tagChip(C.purple)}>✓ odborník</span>}
          {z.prisny && <span style={tagChip(C.red)}>zraniteľní</span>}
          {z.typ === "charity" && !z.sponzor && <span style={tagChip(C.gold)}>hľadá pomoc</span>}
        </>
      }
      subtitle={z.lok ? <span style={{ display: "inline-flex", alignItems: "center", gap: SPACE.xxs, fontSize: 12, color: C.textSec, fontWeight: 600 }}><IkonaPin size={12} color={C.textSec} />{z.lok}{z.karma ? ` · ${z.karma}` : ""}</span> : undefined}
      text={z.pribeh ? cistyText(z.pribeh) : undefined /* karta = čistý text, HTML patrí len do detailu */}
      progress={jeZiadost && z.ciel ? { vyzbierane: z.suma, ciel: z.ciel } : undefined}
    />
  );
}

// ===================== DETAIL ŽIADOSTI =====================
function Detail({ z, onBack, onAutor }: { z: any; onBack: () => void; onAutor: (s: Subjekt) => void }) {
  const [platba, setPlatba] = useState<string | null>(null); // "EUR" | "DEED"
  const [suma, setSuma] = useState(z.suma ?? 0);
  const [ludia, setLudia] = useState(z.ludia ?? 0);
  const [ozvat, setOzvat] = useState(false); // „Mám záujem" → mini formulár so správou
  const [nahlasit, setNahlasit] = useState(false); // nahlásenie obsahu (z ⋯ menu)
  const [menu, setMenu] = useState(false); // ⋯ kontextové menu
  const [qr, setQr] = useState(false); // žiadosť: donačný QR · ponuka: QR na mieste
  const [splitQr, setSplitQr] = useState(false); // influencer: rozdeliť platbu (Split QR)
  const otvorGaleriu = useGaleria();
  const { wide } = useLayout();
  const ja = usePouzivatel(); // registrovaný vs pasívny — určuje zápis do zoznamu darcov
  const darRef = `help-${z.id ?? z.nazov}`; // kľúč žiadosti v zozname darcov

  const hash = () => "0x" + Math.random().toString(16).slice(2, 8) + "…" + Math.random().toString(16).slice(2, 6);

  // počítadlo aj zoznam darcov rastú z JEDNÉHO miesta (konzistentné čísla)
  function posliPevne(hodnota: number, kanal: string) {
    setSuma((s: number) => s + hodnota * 0.01); // DEED ~0,01€ ilustračne
    setLudia((l: number) => l + 1);
    pridajDar({ refId: darRef, suma: hodnota * 0.01, kanal: "deed", registrovany: ja.typ !== "pasivny" });
    toast(`Odoslané: ${hodnota} ${kanal === "DEED" ? "DeeD" : kanal} · záznam platby ${hash()}`);
  }
  function platbaHotova(s: number, volba?: VolbaDaru) {
    setSuma((x: number) => x + s * (platba === "EUR" ? 1 : 0.01));
    setLudia((l: number) => l + 1);
    pridajDar({ refId: darRef, suma: s * (platba === "EUR" ? 1 : 0.01), kanal: platba === "EUR" ? "psp" : "deed", registrovany: ja.typ !== "pasivny", volba });
    toast(`Odoslané: ${platba === "EUR" ? s + " €" : s + " DeeD"} · záznam platby ${hash()}`);
  }

  const jePonuka = z.typ === "ponuka"; // ponuka pomoci → kontakt, nie darovanie

  return (
    <div style={{ paddingBottom: SPACE.xl }}>
      <BackHeader onBack={onBack} right={<span {...pressable(() => setMenu(true), "Ďalšie možnosti")} style={{ display: "flex", cursor: "pointer" }}><IkonaMoznosti size={18} color={C.textTer} /></span>}>
        <span style={{ fontSize: 13, fontWeight: "bold", color: C.blueL, background: tint("var(--a-info)", .12), border: `1px solid ${tint("var(--a-info)", .3)}`, borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.sm}px` }}>#47 821</span>
        <span style={{ fontSize: 11, fontWeight: "bold", color: z.sponzor ? C.gold : C.blueL }}>{z.sponzor ? "Sponzorovaná" : "Overená"}</span>
      </BackHeader>

      {/* hero foto — LEN ak prípad má fotku (bez placeholdera; inak čisto textový detail) */}
      {z.fotky?.length ? (
        <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : {}) }}>
          <Foto src={z.fotky[0]} emoji="🖼" h={wide ? "100%" : 175} w={wide ? "100%" : undefined} onClick={() => otvorGaleriu(z.fotky!, 0)} prednost alt={z.nazov} />
          <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.55)", borderRadius: RADIUS.lg, padding: `${SPACE.xxs}px ${SPACE.sm}px`, fontSize: 10, color: "var(--a-green)", pointerEvents: "none", display: "inline-flex", alignItems: "center", gap: SPACE.xxs }}><IkonaFoto size={12} color="var(--a-green)" /> foto z prípadu</span>
          {z.fotky.length > 1 && <span style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.6)", borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.xs}px`, fontSize: 10, color: "#fff", pointerEvents: "none" }}>⧉ {z.fotky.length} · klikni na foto</span>}
        </div>
      ) : null}
      <MiniFotky fotky={z.fotky} />

      {/* meta — klik otvorí cudzí profil (§6) */}
      <div onClick={() => onAutor({ typ: "osoba", meno: z.nazov, level: z.karma || "Silver", lok: z.lok })} style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderBottom: `1px solid ${C.line2}`, display: "flex", gap: SPACE.sm, alignItems: "center", cursor: "pointer" }}>
        <Avatar src={z.avatar} emoji="👤" size={46} border={`1px solid rgba(127,203,160,.5)`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: "bold", display: "flex", alignItems: "center", gap: 6 }}>{z.nazov} {z.overeny && <Overene size={15} label="Overená žiadosť" />}</div>
          <div style={{ marginTop: SPACE.xxs }}><span style={{ fontSize: 9, fontWeight: 700, background: "rgba(240,199,90,.12)", border: "1px solid rgba(240,199,90,.3)", color: C.gold, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>⭐ {z.karma}</span> <span style={{ fontSize: 11, color: C.textTer }}>📍 {z.lok} · 1 deň</span></div>
        </div>
        <span style={{ color: C.textTer, fontSize: 18, flex: "none" }}>›</span>
      </div>

      {/* pribeh — FormatovanyText: odseky/formátovanie prežijú (staré texty = pre-wrap) */}
      <FormatovanyText text={z.pribeh} style={{ padding: `${SPACE.gutter}px ${SPACE.md}px ${SPACE.sm}px`, fontSize: 14, lineHeight: 1.5, color: C.text }} />

      {/* D++ sponzor */}
      {z.sponzor && (
        <div style={{ margin: `0 ${SPACE.gutter}px ${SPACE.sm}px`, background: "rgba(224,169,61,.08)", border: `1px solid rgba(224,169,61,.35)`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <span style={{ background: "#fff", color: "#0B3D91", fontSize: 10, fontWeight: "bold", borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{z.sponzor.meno}</span>
          <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.4 }}>
            <b>{z.sponzor.meno} pomohol sumou {z.sponzor.suma} €</b> · sponzor žiadosti<br />
            <span style={{ color: C.textTer }}>transparentná suma · overiteľný záznam platby · ESG dopad (ESRS S3)</span>
          </div>
        </div>
      )}

      {/* progres — len finančná žiadosť (má cieľovú sumu) — jednotný ProgresBox */}
      {z.ciel != null && (
        <div style={{ margin: `0 ${SPACE.gutter}px ${SPACE.md}px` }}>
          <ProgresBox suma={suma} ciel={z.ciel} ludia={ludia} />
        </div>
      )}

      {/* ponuka pomoci = kontakt; žiadosť = darovanie */}
      {jePonuka ? (
        <div style={{ padding: `0 ${SPACE.gutter}px ${SPACE.gutter}px` }}>
          <button onClick={() => setOzvat(true)} style={{ ...btn("primary"), width: "100%" }}>✍️ Mám záujem — ozvať sa</button>
          <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, margin: `${SPACE.sm}px 0` }}>Po ozvaní sa dohodnete na detailoch cez chat → prípadne QR na mieste.</div>
          {/* PONUKA = niekto ponúka pomoc/službu → NEdáva sa mu dar (len zdieľať + reakcia).
              Prispievať sa dá len na žiadosti/zbierky, preto modul beží v režime bezDaru. */}
          <PlatobnyModul bezDaru
            onShare={() => zdielaj({ titul: z.nazov, text: z.nazov, url: aktualnaUrl() }, toast)}
            upvotes={140} onUpvote={() => toast("Palec hore")}
            onPodpor={() => {}} onKanal={() => {}}
            oblubene={oblubenyZHelp(z)} toast={toast}
            qr={{ label: "QR na mieste", popis: "Potvrdenie skutku · skenovať · zdieľať", onClick: () => setQr(true) }} />
        </div>
      ) : (
        <div style={{ padding: `0 ${SPACE.gutter}px ${SPACE.gutter}px` }}>
          <PlatobnyModul
            onShare={() => zdielaj({ titul: z.nazov, text: z.nazov, url: aktualnaUrl() }, toast)}
            upvotes={140} onUpvote={() => toast("Palec hore")}
            onPodpor={(s: number) => posliPevne(s, "DEED")}
            onKanal={(k: string) => setPlatba(k)}
            oblubene={oblubenyZHelp(z)} toast={toast}
            qr={{ label: "QR na dar", popis: "Sken → dar za 2 kliky · tlač · zdieľanie", onClick: () => setQr(true) }}
            retaz={{ onClick: () => setSplitQr(true) }} />
          {/* §11: komunitné Overujem/Namietam — pravosť prípadov jednotlivcov (núdza + riziko podvodu) */}
          <div style={{ marginTop: SPACE.gutter }}>
            <OverujemNamietam overeni={ludia > 3 ? Math.round(ludia / 3) : 2} namietky={0} subjekt={z.nazov || "prípad"}
              popis="Bol si pri tom? Poznáš prípad? Komunitné Overujem/Namietam dvíha (alebo zráža) dôveryhodnosť žiadosti." toast={toast} />
          </div>
          {/* zoznam darcov — až pod Overujem/Namietam, rovnaké číslo ako počítadlo */}
          <div style={{ marginTop: SPACE.gutter }}>
            <ZoznamDarcov refId={darRef} celkom={ludia} />
          </div>
        </div>
      )}

      {/* simulácia platby (EUR karta / DEED peňaženka) */}
      {platba && <PlatbaModal kanal={platba} komu={z.nazov} onClose={() => setPlatba(null)} onDone={platbaHotova} />}

      {/* „Mám záujem" — súkromná správa ponúkajúcemu (mock uloženie) */}
      {ozvat && <OzvatSaSheet komu={z.nazov} refId={z.id} modul="help" onClose={() => setOzvat(false)} toast={toast} />}

      {/* ⋯ kontextové menu — zdieľať / kopírovať odkaz / nahlásiť */}
      {menu && (
        <KontextMenu onClose={() => setMenu(false)} polozky={[
          { ikona: <Zdielanie size={17} />, label: "Zdieľať žiadosť", onClick: () => void zdielaj({ titul: z.nazov, text: z.nazov, url: aktualnaUrl() }, toast) },
          { ikona: <IkonaOdkaz size={17} />, label: "Kopírovať odkaz", onClick: async () => { try { await navigator.clipboard.writeText(aktualnaUrl()); toast("Odkaz skopírovaný"); } catch { void zdielaj({ titul: z.nazov, text: z.nazov, url: aktualnaUrl() }, toast); } } },
          { ikona: <IkonaVlajka size={16} />, label: "Nahlásiť obsah", danger: true, onClick: () => setNahlasit(true) },
        ]} />
      )}
      {nahlasit && <NahlasitSheet co={z.nazov} refId={z.id} modul="help" onClose={() => setNahlasit(false)} toast={toast} />}

      {/* QR prípadu — žiadosť: donačný (sken → dar) · ponuka: QR na mieste (potvrdenie skutku) */}
      {qr && (
        <QrModal typ={jePonuka ? "skutok" : "platba"}
          titul={`${jePonuka ? "QR na mieste" : "Donačný QR"} · ${z.nazov}`}
          popis={jePonuka ? "Ukáž pri odovzdaní pomoci — sken potvrdí skutok na mieste (proof-of-deed)" : "Sken → dar za 2 kliky · vytlač na leták alebo zdieľaj"}
          qrCiel={{ druh: "case", ref: String(z.id), modul: "help" }}
          odznak="D+"
          onClose={() => setQr(false)} toast={toast} />
      )}

      {/* influencer: rozdelenie platby medzi žiadosť a organizácie */}
      {splitQr && <SplitQrSheet titul={z.nazov} caseId={String(z.id)} onClose={() => setSplitQr(false)} toast={toast} />}
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
      <div style={{ fontSize: 30 }}><Emo e={emoji} /></div>
      <div style={{ fontSize: 18, fontWeight: "bold", color: col, marginTop: SPACE.xs }}>{title}</div>
      <div style={{ fontSize: 13, color: C.textSec, marginTop: SPACE.xxs, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

// ===================== PONÚKAM — flow =====================
function OfferFlow({ onBack, onZverejni }: { onBack: () => void; onZverejni: (item: HelpFeedItem, osl: { emoji: string; titul: string; text: ReactNode }, split?: SplitCiel[]) => void }) {
  const [krok, setKrok] = useState(1);
  const [typ, setTyp] = useState<string | null>(null);
  const [uroven, setUroven] = useState<string | null>(null);
  const [popis, setPopis] = useState("");
  const [zranitelni, setZranitelni] = useState<boolean | null>(null); // 2b — kontakt so zraniteľnými
  const [tagy, setTagy] = useState<string[]>([]);
  const [rozdel, setRozdel] = useState(false);
  const [ciele, setCiele] = useState<SplitCiel[]>([]);
  const TOTAL = 4;

  const zverejniPonuku = () => {
    const novaPonuka: HelpFeedItem = {
      id: Date.now(),
      typ: "ponuka",
      nazov: `Ponúkam: ${typ}`,
      pribeh: popis,
      ikona: typ === "Čas / ruky" ? "⏱" : "🎓",
      velkost: "stredna",
      lok: "Tvoje okolie",
      karma: uroven === "odbornik" ? "Gold" : "Silver",
      odbornik: uroven === "odbornik",
      tagy, prisny: !!zranitelni,
      skore: 9, typSituacie: "normal", modul: "help", dni: 0,
      lat: USER_LOK.lat, lng: USER_LOK.lng,
    };
    onZverejni(novaPonuka, { emoji: "🤝", titul: "Ponuka zverejnená!", text: "Tvoja ponuka je teraz vo feede medzi „Ponúkajú pomoc“. Ľudia z okolia sa ti môžu ozvať." }, rozdel ? ciele : undefined);
  };

  return (
    <div>
      <Hlavicka title="Ponúkam pomoc" onBack={onBack} step={krok} total={TOTAL} />
      <div style={{ padding: SPACE.md }}>
        {krok === 1 && (
          <>
            <Otazka>Čo ponúkaš?</Otazka>
            <Vyber emoji="🎓" title="Schopnosť / znalosť" desc="doučím, naučím, poradím, opravím" active={typ === "Schopnosť / znalosť"} onClick={() => { setTyp("Schopnosť / znalosť"); setKrok(2); }} />
            <Vyber emoji="⏱" title="Čas / ruky" desc="sťahovanie, výpomoc, postrážim" active={typ === "Čas / ruky"} onClick={() => { setTyp("Čas / ruky"); setKrok(2); }} />
            {/* Vec — FÁZA 2 (v MVP disabled) */}
            <div aria-disabled style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: SPACE.md, marginTop: SPACE.xs, borderRadius: RADIUS.md, border: `1px dashed ${C.line}`, background: C.surface2, opacity: .55, cursor: "not-allowed" }}>
              <span style={{ fontSize: 24 }}>📦</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Vec <span style={{ ...tagChip(C.textTer), marginLeft: 4 }}>čoskoro</span></div>
                <div style={{ fontSize: 12.5, color: C.textTer }}>darujem nábytok, oblečenie, náradie — pridáme vo Fáze 2</div>
              </div>
            </div>
          </>
        )}
        {krok === 2 && (
          <>
            <Otazka>Detail ponuky</Otazka>
            <RichTextInput value={popis} onChange={setPopis} minH={90} placeholder="Čo presne ponúkaš, kde a kedy? Napr. „Doučím matematiku ZŠ/SŠ, víkendy, online alebo u mňa.“" />
            <Otazka>Si v tom amatér alebo odborník?</Otazka>
            <Vyber emoji="🙂" title="Amatér" desc="Pomôžem ako viem — ide live takmer hneď (AI text-moderácia beží aj tak)." active={uroven === "amater"} onClick={() => setUroven("amater")} />
            <Vyber emoji="🎖" title="Odborník" desc="Doložím podklady (certifikát, web, prax) → vyšší vstupný status, zvyšok dvíha komunita." active={uroven === "odbornik"} onClick={() => setUroven("odbornik")} />
            {/* 2b — zraniteľní → prísny režim */}
            <ZranitelniBlok hodnota={zranitelni} onZmena={setZranitelni} />
            <NavBtns onBack={() => setKrok(1)} onNext={() => setKrok(3)} canNext={!!(popis && uroven && zranitelni !== null)} />
          </>
        )}
        {krok === 3 && (
          <>
            <Otazka>Označ tému ponuky</Otazka>
            <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>Tag zobrazí ponuku aj v príslušnej doméne Aktivity → cielené publikum (napr. „doučím" = Vzdelávanie).</div>
            <TagTemy vybrane={tagy} onToggle={(id) => setTagy((t) => prepniTag(t, id))} akcent="var(--a-plum)" />
            <NavBtns onBack={() => setKrok(2)} onNext={() => setKrok(4)} canNext={tagy.length > 0} />
          </>
        )}
        {krok === 4 && (
          <>
            <Otazka>Zhrnutie</Otazka>
            <Suhrn rows={[["Typ", typ], ["Úroveň", uroven === "odbornik" ? "Odborník (doloží podklady)" : "Amatér"], ["Témy", tagLabels(tagy)], ["Popis", popis]]} />
            {zranitelni && <div style={{ marginTop: SPACE.sm }}><PrisnyBadge /></div>}
            {uroven === "odbornik" && <AiPoznamka text="Odborník: pred zverejnením doložíš podklady, AI z nich určí vstupný status karmy v odbore." />}

            {/* autorský split — koľko z platieb cez QR ide tebe a koľko organizáciám */}
            <button onClick={() => setRozdel((v) => !v)} style={{ ...btn(rozdel ? "primary" : "ghost"), width: "100%", marginTop: SPACE.gutter }}>🎬 Rozdeliť medzi organizácie (QR) {rozdel ? "▲" : "▼"}</button>
            {rozdel && (
              <div style={{ marginTop: SPACE.sm, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter }}>
                <SplitConfigStep ownerLabel="Tebe (autor)" ciele={ciele} onCiele={setCiele} />
              </div>
            )}

            <button onClick={zverejniPonuku} disabled={rozdel && !splitValid(ciele)} style={{ ...btn(rozdel && !splitValid(ciele) ? "disabled" : "primary"), width: "100%", marginTop: SPACE.gutter }}>{rozdel ? "Zverejniť + vytvoriť QR" : "Zverejniť ponuku"}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== DOPYTUJEM — flow =====================
function RequestFlow({ onBack, onZverejni }: { onBack: () => void; onZverejni: (item: HelpFeedItem, osl: { emoji: string; titul: string; text: ReactNode }, split?: SplitCiel[]) => void }) {
  const [vetva, setVetva] = useState<string | null>(null); // 'ludska' | 'peniaze'
  const [krok, setKrok] = useState(0);
  // finančná sub-state-machine: guard → prekoho → (prijemca A/B/C) → proxy → charita | wizard
  const [fin, setFin] = useState<"guard" | "prekoho" | "prijemca" | "proxy" | "charita" | "wizard">("guard");
  const [preKoho, setPreKoho] = useState<string | null>(null); // 'seba' | 'zastupeni'
  const [prijemcaTyp, setPrijemcaTyp] = useState<"A" | "B" | null>(null);
  // V zastúpení — údaje PRÍJEMCU (proxy nevypĺňa svoje, je zodpovedná tvár)
  const [proxyMeno, setProxyMeno] = useState("");
  const [proxyAdresa, setProxyAdresa] = useState("");
  const [ibanCesta, setIbanCesta] = useState<"A" | "B" | null>(null); // A: poznám IBAN · B: nemám
  const [iban, setIban] = useState("");
  const [ibanOvereny, setIbanOvereny] = useState(false); // micro-deposit (mock)
  // Cez Charitu — segment potreby + zobrazenie matchov
  const [charitaSegmenty, setCharitaSegmenty] = useState<string[]>([]);
  const [charitaHladane, setCharitaHladane] = useState(false);
  const [popis, setPopis] = useState("");
  const [suma, setSuma] = useState("");
  const [suhlas, setSuhlas] = useState(false);
  const [retaz, setRetaz] = useState("necham");
  const [zranitelni, setZranitelni] = useState<boolean | null>(null); // 2b
  const [tagy, setTagy] = useState<string[]>([]);
  const [rozdel, setRozdel] = useState(false);
  const [ciele, setCiele] = useState<SplitCiel[]>([]);

  const sumaNum = Number(suma || 0);
  const p = sumaNum ? pasmo(sumaNum) : null;

  // nadpis z opisu — vždy z ČISTÉHO textu (opis môže byť formátované HTML z editora)
  const skratka = (t: string) => { const c = cistyText(t); return c.length > 42 ? c.slice(0, 42).trim() + "…" : c; };

  // ľudská (nefinančná) pomoc → žiadosť bez cieľovej sumy
  const zverejniDopyt = () => {
    const novyDopyt: HelpFeedItem = {
      id: Date.now(),
      typ: "ziadost",
      nazov: skratka(popis),
      pribeh: popis,
      ikona: "🧑‍🤝‍🧑",
      velkost: "stredna",
      lok: "Tvoje okolie",
      karma: "Silver",
      tagy, prisny: !!zranitelni,
      skore: 9, typSituacie: "normal", modul: "help", dni: 0,
      lat: USER_LOK.lat, lng: USER_LOK.lng,
    };
    onZverejni(novyDopyt, { emoji: "🙋", titul: "Dopyt zverejnený!", text: "Tvoja prosba je vo feede medzi „Hľadajú pomoc“. Keď sa niekto ozve, dohodnete sa cez chat." });
  };

  // finančná pomoc → žiadosť s cieľovou sumou (progres 0 %)
  const zverejniZiadost = () => {
    const novaZiadost: HelpFeedItem = {
      id: Date.now(),
      typ: "ziadost",
      nazov: skratka(popis || "Žiadosť o pomoc"),
      pribeh: popis,
      ikona: "🙏",
      velkost: "velka",
      lok: "Tvoje okolie",
      karma: "Silver",
      suma: 0,
      ciel: sumaNum,
      ludia: 0,
      tagy,
      skore: 10, typSituacie: "normal", modul: "help", dni: 0,
      lat: USER_LOK.lat, lng: USER_LOK.lng,
    };
    onZverejni(novaZiadost, { emoji: "🙏", titul: "Žiadosť vytvorená!", text: <>Tvoja žiadosť na <b>{sumaNum} €</b> je vo feede. Po posúdení (do 48 h) sa spustí naživo a ľudia môžu prispievať.</> }, rozdel ? ciele : undefined);
  };

  // VÝBER VETVY
  if (!vetva) {
    return (
      <div>
        <Hlavicka title="Dopytujem" onBack={onBack} />
        <div style={{ padding: SPACE.md }}>
          <Otazka>Akú pomoc potrebuješ?</Otazka>
          <Vyber emoji="🧑‍🤝‍🧑" title="Ľudská pomoc" desc="Odvoz, sťahovanie, doučovanie, spoločníčka… (nefinančné)" onClick={() => { setVetva("ludska"); setKrok(1); setZranitelni(null); setTagy([]); }} />
          <Vyber emoji="💶" title="Finančná pomoc" desc="Potrebujem peniaze v núdzi." onClick={() => { setVetva("peniaze"); setFin("guard"); setKrok(0); setPreKoho(null); setPrijemcaTyp(null); setTagy([]); }} />
        </div>
      </div>
    );
  }

  // ĽUDSKÁ POMOC (zrkadlo ponuky — nefinančné, bez pásiem/escrow)
  if (vetva === "ludska") {
    const ludskaOk = !!popis && zranitelni !== null && tagy.length > 0;
    return (
      <div>
        <Hlavicka title="Ľudská pomoc" onBack={() => setVetva(null)} />
        <div style={{ padding: SPACE.md }}>
          <Otazka>Opíš, s čím potrebuješ pomôcť</Otazka>
          <RichTextInput value={popis} onChange={setPopis} minH={100} placeholder="Napr. „Potrebujem odviezť k lekárovi v stredu ráno, Sihoť → nemocnica.“" />
          <AiPoznamka text="AI sito relevancie: či to nevyrieši bežná cesta (odvoz k lekárovi = MHD vs. reálna núdza). Jasný balast odmietne, jasnú núdzu pustí." />
          {/* zraniteľní — pri dopyte prísny režim platí pre toho, kto sa PRIHLÁSI */}
          <ZranitelniBlok hodnota={zranitelni} onZmena={setZranitelni} pomahajuci />
          <Otazka>Označ tému</Otazka>
          <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>Tag zobrazí dopyt aj v doméne Aktivity → nájde ho cielené publikum.</div>
          <TagTemy vybrane={tagy} onToggle={(id) => setTagy((t) => prepniTag(t, id))} />
          <button onClick={zverejniDopyt} disabled={!ludskaOk} style={{ ...btn(ludskaOk ? "primary" : "disabled"), width: "100%", marginTop: SPACE.gutter }}>Zverejniť dopyt</button>
          <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, marginTop: SPACE.sm }}>Po zverejnení sa ozve niekto z okolia → chat po akceptácii → dohoda → QR na mieste.</div>
        </div>
      </div>
    );
  }

  // FINANČNÁ POMOC — sub-state-machine (guard → prekoho → prijemca → charita/wizard)
  const preKohoLabel = preKoho === "seba"
    ? "Pre seba"
    : `V zastúpení (${prijemcaTyp === "A" ? "vie mať účet" : prijemcaTyp === "B" ? "nemôže konať" : "?"})`;

  const finBack = () => {
    if (fin === "guard") { setVetva(null); return; }
    if (fin === "prekoho") { setFin("guard"); return; }
    if (fin === "prijemca") { setFin("prekoho"); return; }
    if (fin === "proxy") { setFin("prijemca"); return; }
    if (fin === "charita") { setFin("prijemca"); return; }
    // wizard
    if (krok === 0) { setFin(preKoho === "seba" ? "prekoho" : "proxy"); return; }
    setKrok(krok - 1);
  };

  // GUARD 0.1 (anti-fraud brána; fuzzy match = mock, viď HelpKit)
  if (fin === "guard") {
    return (
      <div>
        <Hlavicka title="Finančná pomoc" onBack={finBack} />
        <div style={{ padding: SPACE.md }}>
          <GuardFuzzy onOk={() => setFin("prekoho")} />
        </div>
      </div>
    );
  }

  // PRE KOHO? — seba / v zastúpení
  if (fin === "prekoho") {
    return (
      <div>
        <Hlavicka title="Pre koho je žiadosť?" onBack={finBack} />
        <div style={{ padding: SPACE.md }}>
          <Otazka>Kto je zodpovedná (zverejnená) tvár?</Otazka>
          <Vyber emoji="🙋" title="Pre seba" desc="Ja som zodpovedná tvár — celé meno + priezvisko + skutočná foto. KYC, peniaze na môj účet." active={preKoho === "seba"} onClick={() => { setPreKoho("seba"); setPrijemcaTyp(null); setKrok(0); setFin("wizard"); }} />
          <Vyber emoji="👥" title="V zastúpení" desc="Ja som zodpovedná tvár, ale peniaze idú na účet PRÍJEMCU (nie môj)." active={preKoho === "zastupeni"} onClick={() => { setPreKoho("zastupeni"); setFin("prijemca"); }} />
          <div style={{ ...infoBox, fontSize: 12.5 }}>Help žiadosti = žiadna anonymita ani avatar (okrem „Cez Charitu"). Verejná tvár = dôvera + sociálna kontrola.</div>
        </div>
      </div>
    );
  }

  // AKÝ PRÍJEMCA? — A / B / C(Cez Charitu)
  if (fin === "prijemca") {
    return (
      <div>
        <Hlavicka title="Aký príjemca?" onBack={finBack} />
        <div style={{ padding: SPACE.md }}>
          <Otazka>Aká je situácia príjemcu?</Otazka>
          <Vyber emoji="🅰️" title="Vie mať účet" desc="Dospelý s dokladmi. Peniaze sú v úschove, kým si ich neprevezme overený príjemca." active={prijemcaTyp === "A"} onClick={() => { setPrijemcaTyp("A"); setFin("proxy"); }} />
          <Vyber emoji="🅱️" title="Nemôže konať" desc="Dieťa / koma / opatera → zákonný zástupca s dokladom, alebo platba priamo poskytovateľovi (faktúra)." active={prijemcaTyp === "B"} onClick={() => { setPrijemcaTyp("B"); setFin("proxy"); }} />
          <Vyber emoji="🏛" title="Cez Charitu" desc="Bez dokladov / vysoká suma → zbierku zastreší partnerská charita (núdzny anonymizovaný)." onClick={() => { setPrijemcaTyp(null); setFin("charita"); }} />
        </div>
      </div>
    );
  }

  // V ZASTÚPENÍ — údaje PRÍJEMCU + IBAN (micro-deposit A/B, mock)
  if (fin === "proxy") {
    const proxyOk = !!proxyMeno.trim() && !!proxyAdresa.trim() && (ibanCesta === "B" || (ibanCesta === "A" && ibanOvereny));
    return (
      <div>
        <Hlavicka title="Údaje príjemcu" onBack={finBack} />
        <div style={{ padding: SPACE.md }}>
          <div style={{ ...infoBox, fontSize: 12.5 }}>Svoje údaje nevypĺňaš — si zodpovedná tvár. Vypĺňaš údaje <b>príjemcu</b>. Peniaze idú na jeho účet, nie tvoj.</div>
          {prijemcaTyp === "B" && <div style={{ ...infoBox, marginTop: SPACE.sm, background: tint(C.purple, .1), borderColor: tint(C.purple, .35), color: C.purple, fontSize: 12.5 }}>Príjemca nemôže konať → doložíš doklad zákonného zástupcu (rodný list / súd) <b>(mock)</b>, alebo zvolíš platbu priamo poskytovateľovi (faktúra).</div>}

          <Otazka>Meno a priezvisko príjemcu</Otazka>
          <input value={proxyMeno} onChange={(e) => setProxyMeno(e.target.value)} placeholder="napr. Anna Kováčová" style={{ ...inp(0), height: "auto", padding: SPACE.sm, fontSize: 15 }} />
          <Otazka>Adresa príjemcu</Otazka>
          <input value={proxyAdresa} onChange={(e) => setProxyAdresa(e.target.value)} placeholder="ulica, mesto" style={{ ...inp(0), height: "auto", padding: SPACE.sm, fontSize: 15 }} />

          <Otazka>IBAN príjemcu (pre FIAT)</Otazka>
          <Vyber emoji={<Emo e="✅" />} title="IBAN poznám" desc="Zadám a overím micro-depositom, že účet patrí príjemcovi." active={ibanCesta === "A"} onClick={() => { setIbanCesta("A"); setIbanOvereny(false); }} />
          <Vyber emoji="⏳" title="IBAN nemám" desc="Doplním neskôr cez doplnenie žiadosti. Dovtedy beží len DeeD, FIAT nepôjde." active={ibanCesta === "B"} onClick={() => { setIbanCesta("B"); setIban(""); setIbanOvereny(false); }} />

          {ibanCesta === "A" && (
            <div style={{ marginTop: SPACE.sm }}>
              <input value={iban} onChange={(e) => { setIban(e.target.value); setIbanOvereny(false); }} placeholder="SK.. IBAN príjemcu" style={{ ...inp(0), height: "auto", padding: SPACE.sm, fontSize: 15 }} />
              {ibanOvereny ? (
                <div style={{ ...infoBox, background: tint("var(--a-green)", .1), borderColor: tint("var(--a-green)", .35), color: "var(--a-green)", fontSize: 12.5 }}>✓ Účet overený micro-depositom — patrí príjemcovi <b>(mock)</b>.</div>
              ) : (
                <button onClick={() => setIbanOvereny(true)} disabled={iban.trim().length < 8} style={{ ...btn(iban.trim().length < 8 ? "disabled" : "ghost"), width: "100%", marginTop: SPACE.sm }}>Overiť účet (micro-deposit)</button>
              )}
              <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xs }}>Overovaciu mikroplatbu posiela banka — potvrdí, že účet patrí príjemcovi.</div>
            </div>
          )}
          {ibanCesta === "B" && <div style={{ ...infoBox, marginTop: SPACE.sm, background: tint(C.gold, .1), borderColor: tint(C.gold, .35), color: C.gold, fontSize: 12.5 }}>⏳ Kým sa nedoplní účet príjemcu, FIAT nepôjde — beží len DeeD.</div>}

          <button onClick={() => { setKrok(0); setFin("wizard"); }} disabled={!proxyOk} style={{ ...btn(proxyOk ? "primary" : "disabled"), width: "100%", marginTop: SPACE.gutter }}>Pokračovať na žiadosť</button>
        </div>
      </div>
    );
  }

  // CEZ CHARITU (odbočka C) — NIE wizard: appka ukáže dvere, núdzny osloví sám
  if (fin === "charita") {
    const matchujuce = CHARITY_FISKALNE.filter((c) => c.segmenty.some((s) => charitaSegmenty.includes(s)));
    return (
      <div>
        <Hlavicka title="Cez Charitu" onBack={finBack} />
        <div style={{ padding: SPACE.md }}>
          <div style={infoBox}>Núdzny nemá KYC / doklady / účet — <b>za identitu a overenie ručí charita</b>. Appka len ukáže dvere: nesprostredkúva, nezmluvňuje, neručí. Charitu oslovíš <b>sám</b> (mimo appky). Zverejnenie bude anonymizované (dôstojnosť).</div>

          <Otazka>Opíš, s čím treba pomôcť</Otazka>
          <RichTextInput value={popis} onChange={setPopis} minH={90} placeholder="Krátko situácia núdzneho a čo potrebuje." />

          <Otazka>Sektor potreby</Otazka>
          <TagTemy vybrane={charitaSegmenty} onToggle={(id) => { setCharitaSegmenty((s) => prepniTag(s, id)); setCharitaHladane(false); }} polozky={CHARITA_SEGMENTY} akcent="var(--a-teal)" varovanie={false} />

          <button onClick={() => setCharitaHladane(true)} disabled={!popis.trim() || charitaSegmenty.length === 0} style={{ ...btn(!popis.trim() || charitaSegmenty.length === 0 ? "disabled" : "primary"), width: "100%", marginTop: SPACE.gutter }}>Nájsť vhodné charity</button>

          {charitaHladane && (
            <div style={{ marginTop: SPACE.md }}>
              {matchujuce.length === 0 ? (
                <div style={{ ...infoBox, background: tint(C.gold, .1), borderColor: tint(C.gold, .35), color: C.gold }}>Žiadna vhodná charita v okolí pre sektor <b>{charitaSegmenty.map(segmentLabel).join(", ")}</b>. Skús rozšíriť rádius — stav prípadu: „hľadá zastrešenie".</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: SPACE.sm }}>Vhodné charity ({matchujuce.length}) — oslov ich priamo:</div>
                  {matchujuce.map((c) => (
                    <div key={c.id} style={{ border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.sm, background: C.surface2 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{c.nazov}</div>
                      <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>📍 {c.lok} · {c.segmenty.map(segmentLabel).join(" · ")}</div>
                      <div style={{ fontSize: 12.5, color: C.blueL, marginTop: SPACE.xs }}>✉️ {c.kontakt}</div>
                      <button onClick={() => kopiruj(c.kontakt, toast, `Kontakt na ${c.nazov} skopírovaný — oslov ich priamo.`)} style={{ ...btn("ghost"), width: "100%", marginTop: SPACE.sm }}>Kontaktovať charitu</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // SPOLOČNÝ SPRIEVODCA (self + proxy A + proxy B) — 8 krokov
  const steps = ["Podmienky", "Opis", "Téma", "Suma", "Overenie", "Foto", "Kanál", "Potvrdenie"];
  return (
    <div>
      <Hlavicka title="Finančná pomoc" onBack={finBack} step={krok + 1} total={steps.length} />
      <div style={{ padding: SPACE.md }}>

        {krok === 0 && (
          <>
            <Otazka>Podmienky — prečítaj a potvrď</Otazka>
            <div style={{ fontSize: 12.5, color: C.textSec, marginBottom: SPACE.xs }}>Vytváraš žiadosť: <b>{preKohoLabel}</b></div>
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
            <Otazka>Opíš svoj problém vlastnými slovami</Otazka>
            <RichTextInput value={popis} onChange={setPopis} minH={130} placeholder="Prečo si sa do situácie dostal, čo presne vyrieši požadovaná suma, prečo to nezvládneš inak." />
            <AiPoznamka text="AI z opisu odporučí kategóriu a pomôže s formuláciou. Pri nezmysle alebo vnútornom rozpore požiada o doplnenie." />
            <NavBtns onBack={() => setKrok(0)} onNext={() => setKrok(2)} canNext={cistyText(popis).length > 15} />
          </>
        )}

        {krok === 2 && (
          <>
            <Otazka>Označ tému žiadosti</Otazka>
            <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>Tag zobrazí žiadosť aj v príslušnej doméne Aktivity → cielené publikum (vyššia konverzia daru).</div>
            <TagTemy vybrane={tagy} onToggle={(id) => setTagy((t) => prepniTag(t, id))} />
            <NavBtns onBack={() => setKrok(1)} onNext={() => setKrok(3)} canNext={tagy.length > 0} />
          </>
        )}

        {krok === 3 && (
          <>
            <Otazka>Odhadovaná výška pomoci</Otazka>
            <input type="number" value={suma} onChange={(e) => setSuma(e.target.value)} placeholder="suma v €" style={{ ...inp(0), height: "auto", padding: `${SPACE.sm}px`, fontSize: 18 }} />
            {p && <div style={{ ...infoBox, borderColor: p.blok ? "rgba(226,87,75,.4)" : "rgba(93,155,232,.4)", background: p.blok ? C.redBg : "rgba(93,155,232,.08)", color: p.blok ? C.red : C.blueL }}>{p.text}</div>}
            {p && !p.blok && <div style={{ ...infoBox, background: tint(C.gold, .1), borderColor: tint(C.gold, .35), color: C.gold }}>{POZNAMKA_DAVKY}</div>}
            <NavBtns onBack={() => setKrok(2)} onNext={() => setKrok(4)} canNext={sumaNum >= 100} />
          </>
        )}

        {krok === 4 && (
          <>
            <Otazka>Overenie — doklady ALEBO komunita</Otazka>
            <div style={infoBox}>AI rozloží tvoj príbeh na tvrdenia a požiada doklad ku každému. <b>Citlivé doklady idú len do overenia — nikdy do feedu.</b> Do nižšieho pásma stačia namiesto dokladov <b>{OVERENIA_POTREBNE} nezávislé overenia komunity</b>.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs, marginTop: SPACE.sm }}>
              <DokladRow text="Lekárska správa" />
              <DokladRow text="Doklad o príjme / nájme" />
            </div>
            {/* stav „čaká na overenie" — BEZ počítadla (podvodník nevie, koľko chýba) */}
            <div style={{ ...infoBox, marginTop: SPACE.sm, background: tint(C.blueL, .08), borderColor: tint(C.blueL, .3), color: C.blueL, fontSize: 12.5 }}>
              Žiadosť ide do feedu v stave <b>„čaká na overenie"</b> — bez počítadla. {OVERENIA_POTREBNE} nezávislé overenia do 48 h a žiadna potvrdená námietka → výplata odomknutá.
            </div>
            {/* escrow — dary počas overenia (3 stavy, mock) */}
            <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.sm, flexWrap: "wrap" }}>
              {(Object.keys(ESCROW) as Array<keyof typeof ESCROW>).map((k) => (
                <span key={k} title={ESCROW[k].popis} style={{ ...tagChip(C.textSec), display: "inline-flex", gap: 4 }}>{ESCROW[k].emoji} {ESCROW[k].label}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xs }}>Dary sú počas overenia v úschove. Ak overenie neprejde, vrátia sa darcom.</div>
            <NavBtns onBack={() => setKrok(3)} onNext={() => setKrok(5)} canNext={true} />
          </>
        )}

        {krok === 5 && (
          <>
            <Otazka>Foto / video k prípadu (verejné)</Otazka>
            <div style={{ height: 120, border: `1px dashed ${C.line}`, borderRadius: RADIUS.sm, display: "flex", alignItems: "center", justifyContent: "center", color: C.textTer, fontSize: 13, cursor: "pointer" }}>＋ Pridať foto alebo video</div>
            <div style={infoBox}>Foto ide najprv do AI na kontrolu (pôvodné foto vs. kreslená náhrada), nie automaticky na zverejnenie. Foto prípadu ≠ doklady. Osobné foto (tvár) = najvyššia dôvera.</div>
            <NavBtns onBack={() => setKrok(4)} onNext={() => setKrok(6)} canNext={true} />
          </>
        )}

        {krok === 6 && (
          <>
            <Otazka>Ako chceš prijímať podporu?</Otazka>
            {["DeeD (peňaženka)", "EUR (euro na účet)"].map((k, i) => (
              <div key={i} style={{ ...vyberBox(false), display: "flex", justifyContent: "space-between" }}>
                <span>{k}</span><span style={{ fontSize: 11, color: C.textTer }}>poplatok vopred</span>
              </div>
            ))}
            {/* Reťaz prebytku — pri dosiahnutí cieľa (žiadna hranica 2400 €). */}
            <Otazka>Keď sa cieľ naplní</Otazka>
            <div style={infoBox}>Dar medzi fyzickými osobami sa v SR nedaní. Ak sa vyzbiera viac, než treba, prebytok môžeš nechať alebo poslať ďalšiemu prípadu (reťaz dobra).</div>
            <Vyber emoji="🙋" title="Nechám si prebytok" desc="Prebytok zostane mne." active={retaz === "necham"} onClick={() => setRetaz("necham")} />
            <Vyber emoji="🔗" title="Reťaz dobra" desc="Prebytok pošlem ďalšiemu (sektor vyberiem teraz alebo pri naplnení)." active={retaz === "retaz"} onClick={() => setRetaz("retaz")} />
            <div style={{ ...infoBox, marginTop: SPACE.sm, fontSize: 12.5, color: C.textSec }}>Darca pri príspevku dostane voľbu: „ak sa pomoc neprevezme, poslať ďalej" — inak refund. (Zobrazí sa v darcovom toku.)</div>
            <NavBtns onBack={() => setKrok(5)} onNext={() => setKrok(7)} canNext={true} />
          </>
        )}

        {krok === 7 && (
          <>
            <Otazka>Potvrdenie</Otazka>
            <Suhrn rows={[
              ["Pre koho", preKohoLabel],
              ...(preKoho === "zastupeni" ? [["Príjemca", `${proxyMeno || "—"}${ibanCesta === "B" ? " · IBAN neskôr (len DeeD)" : ""}`] as [string, string]] : []),
              ["Témy", tagLabels(tagy)],
              ["Suma", `${sumaNum} € (pásmo ${p?.kod})`],
              ["Opis", popis.slice(0, 60) + (popis.length > 60 ? "…" : "")],
            ]} />
            <div style={{ ...infoBox, marginTop: SPACE.sm }}>Potvrdzujem, že informácie sú pravdivé a doklady pravé. Rozumiem dôsledkom klamstva.</div>

            {/* autorský split — koľko z platieb cez QR ide tebe/organizáciám */}
            <button onClick={() => setRozdel((v) => !v)} style={{ ...btn(rozdel ? "primary" : "ghost"), width: "100%", marginTop: SPACE.gutter }}>🎬 Rozdeliť medzi organizácie (QR) {rozdel ? "▲" : "▼"}</button>
            {rozdel && (
              <div style={{ marginTop: SPACE.sm, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter }}>
                <SplitConfigStep ownerLabel="Tebe (autor)" ciele={ciele} onCiele={setCiele} />
              </div>
            )}

            <button onClick={zverejniZiadost} disabled={rozdel && !splitValid(ciele)} style={{ ...btn(rozdel && !splitValid(ciele) ? "disabled" : "primary"), width: "100%", marginTop: SPACE.gutter }}>{rozdel ? "Vytvoriť žiadosť + QR" : "Vytvoriť žiadosť"}</button>
            <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, marginTop: SPACE.xs }}>Po vytvorení: posúdenie do 48 h → schválené → live.</div>
          </>
        )}
      </div>
    </div>
  );
}
