import { useState, useEffect } from "react";
import { SIRKA, C, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { Foto, MiniFotky, ModulHlavicka, PodporaSekcia, PlatbaModal, HladanieModal, toast, useGaleria, useLayout, useScrollHore, useStrankaAkcie, Ticker, StatRiadok, FiltreStat, FeedStlpce, FeedGrid, FeedCard, KartaBadge, BackHeader, ProgresBox, obalSiroky, OkruhVyber, SegTabs, tint, Lupa, Zdielanie, IkonaVlajka, IkonaFoto, IkonaDoska, IkonaInstitucia, EmptyState, ScreenSwitch, SwipeBack } from "@/shared";
import { pripravFeed, FEED_CFG } from "@/lib/feed";
import { MEDIA_AR } from "@/lib/cardSize";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import type { Kanal } from "@/types";
import { useLokalita } from "@/lib/lokalita";
import { pressable } from "@/components/pressable";
import { FEED_ITEMS, CIRKVI, CIRKVI_FLAT, HLADAJ_DATA, type NabozFeedItem, type NabozTyp } from "./mock";

/*
  ============================================================
  MODUL NÁBOŽENSTVO — v1 (šošovka nad enginom, kópia Charity s iným obsahom)
  ------------------------------------------------------------
  · adresár 18 registrovaných cirkví SR (register MK SR)
  · feed obsahu komunít — chips = TYP obsahu (Zbierky/Udalosti/Oznamy/Dobrovoľníctvo)
  · mäkká stena podľa viery — default „moja cirkev", hľadanie nájde všetko (§5)
  · zbierky sa len ZRKADLIA — žijú v Help/Charita engine (§4)
  · žiadna karma/levely pre cirkevné subjekty — len badge „overená" (§2)
  ============================================================
*/

// ---- lokálna paleta modulu (pokojné indigo + zlatá) ----
const N = {
  card: "rgba(var(--glass-rgb),.045)", line: "rgba(var(--glass-rgb),.08)",
  ind: "var(--a-plum)", indBg: tint("var(--a-plum)", .1), indEdge: tint("var(--a-plum)", .38),
  gold: "var(--a-gold)", goldBg: tint("var(--a-gold)", .1),
  green: "var(--a-green)", greenBg: tint("var(--a-green)", .1), greenEdge: tint("var(--a-green)", .34),
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
};

const CHIPY = ["Všetko", "Zbierky", "Udalosti", "Oznamy", "Dobrovoľníctvo"];
const CHIP_TYP: Record<string, NabozTyp> = { Zbierky: "zbierka", Udalosti: "udalost", Oznamy: "oznam", Dobrovoľníctvo: "dobrovolnictvo" };

// ===================== MODUL =====================
type Screen = "feed" | "detail";
type Sheet = "dir" | null;

export default function ModulNabozenstvo({ wide }: { wide?: boolean; otvorModul?: (m: string) => void }) {
  const { desktop } = useLayout();
  const [screen, setScreen] = useState<Screen>("feed");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [hladaj, setHladaj] = useState(false);
  const [akt, setAkt] = useState<NabozFeedItem | null>(null);
  // mäkká stena — „moja cirkev" (default veriaci vidí svoju komunitu)
  const [mojaCirkev, setMojaCirkev] = useState<string>(CIRKVI_FLAT[0].meno);

  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  return (
    <div style={{ minHeight: "100%", color: N.txt }}>
      <ScreenSwitch k={screen}>
        {screen === "feed" && (
          <NabozFeed wide={wide} mojaCirkev={mojaCirkev} onZmenit={() => setSheet("dir")}
            onDetail={(z) => { setAkt(z); setScreen("detail"); }} onHladaj={() => setHladaj(true)} onDir={() => setSheet("dir")} />
        )}
        {screen === "detail" && akt && obal(<SwipeBack onBack={() => setScreen("feed")}><NabozDetail z={akt} onBack={() => setScreen("feed")} /></SwipeBack>)}
      </ScreenSwitch>

      {sheet === "dir" && (
        <SheetAdresar mojaCirkev={mojaCirkev} onClose={() => setSheet(null)}
          onVybrat={(meno) => { setMojaCirkev(meno); setSheet(null); toast(`Tvoja komunita: ${meno}`); }} />
      )}

      {hladaj && (
        <HladanieModal akcent={N.ind} placeholder="Hľadať komunity, cirkvi, zbierky, udalosti…"
          data={HLADAJ_DATA}
          onPick={(id: string) => {
            const it = FEED_ITEMS.find((x) => x.id === id);
            if (it) { setAkt(it); setScreen("detail"); }
            else if (String(id).startsWith("cirkev-")) setSheet("dir");
            else toast("Otváram…");
          }}
          toast={toast} defaultFilter="Všetko"
          onClose={() => setHladaj(false)} />
      )}
    </div>
  );
}

// ===================== FEED =====================
type FeedProps = {
  wide?: boolean;
  mojaCirkev: string;
  onZmenit: () => void;
  onDetail: (z: NabozFeedItem) => void;
  onHladaj: () => void;
  onDir: () => void;
};

function NabozFeed({ wide, mojaCirkev, onZmenit, onDetail, onHladaj, onDir }: FeedProps) {
  const { desktop } = useLayout();
  const [radius, setRadius] = useState("krajina"); // komunity sú často celoslovenské
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const [chip, setChip] = useState("Všetko");
  const [vsetky, setVsetky] = useState(false); // mäkká stena: len moja cirkev ↔ všetky
  const lok = useLokalita();

  // 1) UI predfilter — typ obsahu (chip) + mäkká stena (moja cirkev / všetky)
  const podlaTypu = FEED_ITEMS.filter((it) => chip === "Všetko" || it.ntyp === CHIP_TYP[chip]);
  const predfilter = vsetky ? podlaTypu : podlaTypu.filter((it) => it.cirkev === mojaCirkev);

  // 2) rovnaký feed engine ako Charita (geo + prah + zoradenie)
  const feed = pripravFeed(predfilter as any, { lat: lok.lat, lng: lok.lng, radius } as any) as unknown as NabozFeedItem[];

  const karta = (it: NabozFeedItem) => <NabozKarta key={it.id} wide={wide} it={it} onClick={() => onDetail(it)} />;

  useStrankaAkcie(() => ({
    pridat: { id: "add", label: "Pridať", onClick: () => toast("Nový oznam/udalosť/zbierka komunity — zakladá štatutár (demo)") },
    extra: [
      { id: "dir", label: "Adresár cirkví", popis: "Registrované cirkvi SR — komunity", ikona: <IkonaInstitucia size={18} color={N.ind} />, onClick: onDir },
      { id: "board", label: "Kalendár komunity", popis: "Udalosti a stretnutia", ikona: <IkonaDoska size={18} color={N.ind} />, onClick: () => toast("Kalendár komunity (demo)") },
    ],
  }), [mojaCirkev]);

  const kratkaCirkev = CIRKVI_FLAT.find((c) => c.meno === mojaCirkev)?.skratka || "";

  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      <ModulHlavicka title="Náboženstvo" karma="Náboženstvo · komunita" right={
        <>
          <span {...pressable(onHladaj, "Hľadať")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={N.txt2} /></span>
          <Zvoncek color={N.txt2} toast={toast} />
        </>
      } />

      <Ticker>Farnosť Trenčín <b style={{ color: C.greenL }}>práve dostala 200 DEED</b> → oprava strechy</Ticker>

      {/* mäkká stena — moja komunita + prepínač „len moje / všetky" (§5) */}
      <div style={{ padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.indBg, border: `1px solid ${N.indEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
          <span style={{ width: 34, height: 34, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(N.ind, .16), color: N.ind, fontWeight: 700, fontSize: 12 }}>{kratkaCirkev}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: N.txt3, fontWeight: 700, letterSpacing: ".03em" }}>TVOJA KOMUNITA</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mojaCirkev}</div>
          </div>
          <span {...pressable(onZmenit, "Zmeniť cirkev")} style={{ flex: "none", fontSize: 12, fontWeight: 700, color: N.ind, cursor: "pointer", padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>Zmeniť</span>
        </div>
        <div {...pressable(() => setVsetky((v) => !v), vsetky ? "Zobraziť len moju cirkev" : "Zobraziť všetky cirkvi")} style={{ marginTop: SPACE.xs, fontSize: 11.5, color: N.txt2, cursor: "pointer", display: "flex", alignItems: "center", gap: SPACE.xs }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 17, borderRadius: 99, background: vsetky ? tint(N.ind, .5) : "rgba(var(--glass-rgb),.15)", position: "relative", transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 2, left: vsetky ? 15 : 2, width: 13, height: 13, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
          </span>
          {vsetky ? "Zobrazujem všetky cirkvi — cez hľadanie nájdeš čokoľvek (medzináboženská solidarita)" : "Zobrazujem len tvoju komunitu · klikni pre všetky"}
        </div>
      </div>

      {/* chips = TYP obsahu (nie porovnávanie cirkví) + štatistický riadok */}
      <FiltreStat
        filtre={
          <div style={{ padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
            <SegTabs
              options={CHIPY} value={chip} onChange={setChip} ariaLabel="Filter podľa typu obsahu"
              style={{ display: "flex", gap: SPACE.xs, overflowX: "auto", paddingBottom: SPACE.xs }}
              render={(c, on) => (
                <span style={{ whiteSpace: "nowrap", fontSize: 12, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: 99, cursor: "pointer", background: on ? N.ind : N.card, color: on ? "#fff" : N.txt2, fontWeight: on ? 700 : 400, border: `1px solid ${on ? N.ind : N.line}` }}>{c}</span>
              )}
            />
          </div>
        }
        stat={
          <StatRiadok inline={desktop} pocet={feed.length} jednotka="príspevkov" mesiac="6 120"
            okruh={(FEED_CFG.radiusy as any)[radius].krat} onOkruh={() => setVyberOkruh(true)} />
        }
      />

      {feed.length === 0 ? (
        <EmptyState emoji="⛪" title="Zatiaľ tu nič nie je" text={vsetky ? "Skús iný typ obsahu alebo väčší okruh." : "Tvoja komunita zatiaľ nič nezverejnila — skús zobraziť všetky cirkvi."} />
      ) : desktop ? (
        <FeedGrid cols={3} cards={feed.map(karta)} />
      ) : (
        <FeedStlpce wide={wide} padding="4px 14px 12px"
          labelSkutky="Komunita" labelZiadosti="Zbierky"
          jednoStlpec={feed.map(karta)}
          skutky={feed.filter((it) => it.ntyp !== "zbierka").map(karta)}
          ziadosti={feed.filter((it) => it.ntyp === "zbierka").map(karta)}
        />
      )}

      <div style={{ fontSize: 10, color: N.txt3, textAlign: "center", padding: SPACE.xxs }}>obsah komunít — oznamy, udalosti, dobrovoľníctvo · zbierky žijú v Charite</div>

      {vyberOkruh && <OkruhVyber radius={radius} akcent={N.ind}
        onPick={(r: string) => { setRadius(r); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}

// ---- karta feedu = zdieľaná FeedCard (badge „overená", bez levelov §2) ----
function NabozKarta({ wide, it, onClick }: { wide?: boolean; it: NabozFeedItem; onClick: () => void }) {
  const jeZbierka = it.ntyp === "zbierka";
  const accent = jeZbierka ? N.gold : N.ind;
  return (
    <FeedCard wide={wide} onClick={onClick} label={it.nazov || ""} accent={accent}
      media={{ fotky: it.fotky, emoji: it.emoji || "⛪",
        overlay: it.badgeL ? <KartaBadge pos={{ top: 10, left: 10 }} strong color={jeZbierka ? N.gold : "#fff"}>{it.badgeL}</KartaBadge> : undefined }}
      title={it.nazov}
      titleChips={it.overena ? <Overena /> : undefined}
      subtitle={<>⛪ {it.komunita || it.cirkev}{it.lok ? ` · ${it.lok}` : ""}</>}
      text={it.popis}
      progress={jeZbierka && it.ciel ? { vyzbierane: it.vyzbierane, ciel: it.ciel } : undefined}
    />
  );
}

function Overena() {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 800, color: N.green, background: N.greenBg, border: `1px solid ${N.greenEdge}`, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, lineHeight: 1.2 }}>✓ overená</span>;
}
function badge({ top, left, color }: { top?: number; left?: number; color?: string }): React.CSSProperties {
  return { position: "absolute", top, left, fontSize: 10.5, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, fontWeight: 800, color: color || "#fff", background: "rgba(8,11,18,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 2px 8px rgba(0,0,0,.25)", pointerEvents: "none" };
}

// ===================== DETAIL =====================
function NabozDetail({ z, onBack }: { z: NabozFeedItem; onBack: () => void }) {
  const { wide } = useLayout();
  const otvorGaleriu = useGaleria();
  const jeZbierka = z.ntyp === "zbierka" && z.ciel != null;
  const [suma, setSuma] = useState(z.vyzbierane ?? 0);
  const [ludia, setLudia] = useState(z.podpora ?? 0);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  const fotky = z.fotky ?? [];
  const maFoto = fotky.length > 0;
  const pribeh = z.pribeh ?? z.popis ?? "";
  const pct = z.ciel ? Math.min(100, Math.round(suma / z.ciel * 100)) : 0;

  function podpor(hodnota: number, text: string) { setSuma((s) => s + hodnota * 0.01); setLudia((l) => l + 1); toast(text); }
  function platbaHotova(s: number) { setSuma((x) => x + s * (platba === "EUR" ? 1 : 0.01)); setLudia((l) => l + 1); toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DEED"} · ${z.nazov}`); }

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackHeader onBack={onBack} right={<><Zdielanie size={17} color={N.txt2} /><IkonaVlajka size={16} color={N.txt2} /></>}>
        {z.badgeL && <span style={{ fontSize: 12, color: N.ind, background: N.indBg, border: `1px solid ${N.indEdge}`, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, fontWeight: 700 }}>{z.badgeL}</span>}
        {z.lok && <span style={{ fontSize: 12, color: N.txt2 }}>📍 {z.lok}</span>}
      </BackHeader>
      <div style={{ height: SPACE.sm }} />

      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : {}) }}>
          <Foto src={maFoto ? fotky[0] : undefined} emoji={z.emoji || "⛪"} h={wide ? "100%" : 200} w={wide ? "100%" : undefined} radius={14} onClick={() => maFoto && otvorGaleriu(fotky, 0)} />
          {maFoto && <span style={{ ...badge({ top: 9, left: 9, color: "#fff" }), display: "inline-flex", alignItems: "center", gap: SPACE.xxs }}><IkonaFoto size={12} color="#fff" /> foto komunity</span>}
        </div>
      </div>
      <MiniFotky fotky={fotky} />

      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px 0` }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs }}>
          <span style={{ width: 40, height: 40, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: tint(N.ind, .14) }}>{z.emoji || "⛪"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: SPACE.xs }}>{z.komunita || z.cirkev} {z.overena && <Overena />}</div>
            <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>📍 {z.lok || "Slovensko"} · registrovaná cirkev (MK SR)</div>
          </div>
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, margin: `${SPACE.sm}px 0` }}>{z.nazov}</div>
        <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: SPACE.gutter, color: N.txt2 }}>{pribeh}</div>

        {jeZbierka ? (
          <>
            {/* progres zrkadlenej zbierky — jednotný ProgresBox */}
            <div style={{ marginBottom: SPACE.gutter }}>
              <ProgresBox suma={suma} ciel={z.ciel!} ludia={ludia} />
            </div>

            <div style={{ marginBottom: SPACE.gutter }}>
              <PodporaSekcia
                onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
                upvotes={ludia} onUpvote={() => toast("Palec hore")}
                onPodpor={(s: number) => podpor(s, `Ďakujeme za ${s} DEED pre ${z.nazov}`)} onSms={() => podpor(100, "SMS podpora")}
                onKanal={(k: string) => setPlatba(k as Kanal)} />
            </div>

            <div style={{ fontSize: 11, color: N.txt3, textAlign: "center", background: N.goldBg, border: `1px solid ${tint(N.gold, .34)}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
              🏛 Zbierka žije v module Charita — platby, overenie a transparentnosť zabezpečuje charitatívny engine. Darovať môžeš aj bez zapnutého modulu.
            </div>
          </>
        ) : (
          <div style={{ marginBottom: SPACE.gutter }}>
            {z.ntyp !== "oznam" && (
              <div onClick={() => toast(z.ntyp === "dobrovolnictvo" ? `Ozvali sme sa komunite ${z.komunita || z.cirkev} — čoskoro ťa budú kontaktovať` : `Zapísané — uvidíme sa na: ${z.nazov}`)} style={{ width: "100%", border: `2px solid ${N.greenEdge}`, background: N.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 15, fontWeight: 700, color: N.green, cursor: "pointer", marginBottom: SPACE.sm }}>
                {z.ntyp === "dobrovolnictvo" ? "🙌 Zapojiť sa" : "🗓 Zúčastním sa"}
              </div>
            )}
            <div onClick={() => toast("Zdieľať: odkaz skopírovaný · siete")} style={{ width: "100%", border: `1px solid ${N.line}`, background: N.card, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center", fontSize: 13, fontWeight: 600, color: N.txt2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
              <Zdielanie size={16} color={N.txt2} /> Zdieľať
            </div>
          </div>
        )}
      </div>

      {platba && <PlatbaModal kanal={platba} komu={z.nazov || ""} onClose={() => setPlatba(null)} onDone={platbaHotova} />}
    </div>
  );
}

// ===================== SHEET: ADRESÁR CIRKVÍ =====================
function SheetAdresar({ mojaCirkev, onClose, onVybrat }: { mojaCirkev: string; onClose: () => void; onVybrat: (meno: string) => void }) {
  const [hladaj, setHladaj] = useState("");
  const filtrovane = CIRKVI
    .map((s) => ({ ...s, polozky: s.polozky.filter((p) => !hladaj || (p.meno + " " + p.rodina).toLowerCase().includes(hladaj.toLowerCase())) }))
    .filter((s) => s.polozky.length);

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(var(--panel-rgb),.92)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", zIndex: 50, display: "flex", flexDirection: "column", animation: "fadeUp .2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: SPACE.md, borderBottom: `1px solid ${N.line}` }}>
        <span onClick={onClose} style={{ display: "flex", color: N.txt2, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Adresár registrovaných cirkví SR</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: SPACE.md }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px`, marginBottom: SPACE.sm }}>
          <Lupa size={16} color={N.txt3} />
          <input value={hladaj} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHladaj(e.target.value)} placeholder="Hľadať cirkev alebo vierovyznanie…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: N.txt, fontSize: 13, padding: `${SPACE.xs}px 0` }} />
        </div>
        <div style={{ fontSize: 11, color: N.txt3, marginBottom: SPACE.sm }}>18 cirkví registrovaných štátom (register MK SR, zákon 308/1991) · radenie podľa rodín · nikto nie je vynechaný</div>

        {filtrovane.map((s) => (
          <div key={s.rodina}>
            <div style={{ fontSize: 11, fontWeight: 700, color: N.ind, textTransform: "uppercase", letterSpacing: ".04em", margin: `${SPACE.gutter}px 0 ${SPACE.xxs}px` }}>{s.rodina}</div>
            {s.polozky.map((p) => {
              const on = p.meno === mojaCirkev;
              return (
                <div key={p.skratka} onClick={() => onVybrat(p.meno)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px`, borderBottom: `1px solid ${N.line}`, cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: RADIUS.xs, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: tint(N.ind, .14), color: N.ind }}>{p.skratka}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 500 }}>{p.meno}</div>
                    <div style={{ fontSize: 12, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.rodina}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <Overena />
                    <div style={{ fontSize: 11, color: on ? N.ind : N.txt3, marginTop: SPACE.xxs, fontWeight: on ? 700 : 400 }}>{on ? "✓ moja komunita" : "vybrať"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {!filtrovane.length && <div style={{ textAlign: "center", color: N.txt3, fontSize: 13, padding: SPACE.xl }}>Nič sa nenašlo pre „{hladaj}“</div>}
        <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", padding: `${SPACE.md}px 0` }}>Poznámka: islam na SK registrovaný nie je (zákon žiada 50 000 členov). V zahraničí sa adresár plní podľa tamojšieho registra.</div>
      </div>
    </div>
  );
}
