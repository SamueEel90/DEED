import { useState, useEffect } from "react";
import { SIRKA, SPACE, RADIUS } from "@/theme";
import { Foto, MiniFotky, ModulHlavicka, PodporaSekcia, PlatbaModal, SplitQrSheet, HladanieModal, toast, useGaleria, useLayout, useScrollHore, useStrankaAkcie, Ticker, StatRiadok, FiltreStat, FeedStlpce, FeedGrid, FeedCard, KartaBadge, ProgresBox, BackHeader, obalSiroky, OkruhVyber, SegTabs, tint, Lupa, Zdielanie, IkonaVlajka, IkonaFoto, IkonaDoska, IkonaInstitucia, IkonaOpakovat, EmptyState, ScreenSwitch, SwipeBack } from "@/shared";
import { pripravFeed, FEED_CFG } from "@/lib/feed";
import { MEDIA_AR } from "@/lib/cardSize";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import type { Kanal } from "@/types";
import { useLokalita } from "@/lib/lokalita";
import { pressable } from "@/components/pressable";
import { N, Overena, Chip, SheetPanel, OverujemNamietam } from "./ui";
import { FarskyProfil } from "./FarskyProfil";
import { Kalendar } from "./Kalendar";
import { PridatSheet } from "./Pridat";
import {
  FEED_ITEMS, CIRKVI, CIRKVI_FLAT, HLADAJ_DATA, FARNOSTI, FARNOST_PODLA_ID, farnostIdOf, KAT_FARBA,
  type NabozFeedItem, type NabozTyp, type Farnost,
} from "./mock";

/*
  ============================================================
  MODUL NÁBOŽENSTVO — v1.2 (donation-first, kópia Charity s iným obsahom)
  ------------------------------------------------------------
  · adresár 18 registrovaných cirkví SR · domovská farnosť + obľúbené (follow)
  · dva tiles v hlavičke: Adresár (všetky) · Moja cirkev (moje) — §D
  · kontext „Vystupujem ako: [ja] ↔ [Farnosť]" → farárov panel (kalendár, „+")
  · farská karta = donation karta (Charita štýl) + QR · zbierky sa ZRKADLIA z Charity
  · žiadna karma/levely pre cirkevné subjekty — len badge „overená" (§J)
  ============================================================
*/

const CHIPY = ["Všetko", "Zbierky", "Udalosti", "Oznamy", "Dobrovoľníctvo"];
const CHIP_TYP: Record<string, NabozTyp> = { Zbierky: "zbierka", Udalosti: "udalost", Oznamy: "oznam", Dobrovoľníctvo: "dobrovolnictvo" };

type Screen = "feed" | "profil" | "kalendar" | "detail";
type Sheet = "dir" | "add" | null;

export default function ModulNabozenstvo({ wide }: { wide?: boolean; otvorModul?: (m: string) => void }) {
  const { desktop } = useLayout();
  const [screen, setScreen] = useState<Screen>("feed");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [hladaj, setHladaj] = useState(false);
  const [akt, setAkt] = useState<NabozFeedItem | null>(null);
  const [aktFarnost, setAktFarnost] = useState<Farnost | null>(null);

  // domovská farnosť + obľúbené (follow) + kontext roly
  const [domovska, setDomovska] = useState<string>("tn-mesto");
  const [oblubene, setOblubene] = useState<Set<string>>(() => new Set(["tn-mesto", "ecav-tn", "zob-ba"]));
  const [farar, setFarar] = useState(false); // Vystupujem ako: ja ↔ Farnosť
  const domFarnost = FARNOST_PODLA_ID(domovska) ?? FARNOSTI[0];

  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  const otvorProfil = (f: Farnost) => { setAktFarnost(f); setScreen("profil"); };

  return (
    <div style={{ minHeight: "100%", color: N.txt }}>
      <ScreenSwitch k={screen}>
        {screen === "feed" && (
          <NabozFeed wide={wide} domFarnost={domFarnost} oblubene={oblubene} farar={farar}
            onFarar={setFarar} onDir={() => setSheet("dir")} onAdd={() => setSheet("add")}
            onProfil={otvorProfil} onKalendar={() => { setAktFarnost(domFarnost); setScreen("kalendar"); }}
            onDetail={(z) => { setAkt(z); setScreen("detail"); }} onHladaj={() => setHladaj(true)} />
        )}
        {screen === "profil" && aktFarnost && obal(
          <SwipeBack onBack={() => setScreen("feed")}>
            <FarskyProfil farnost={aktFarnost} farar={farar} toast={toast}
              onBack={() => setScreen("feed")} onDetail={(z) => { setAkt(z); setScreen("detail"); }}
              onKalendar={() => setScreen("kalendar")} onPridat={() => setSheet("add")} />
          </SwipeBack>
        )}
        {screen === "kalendar" && obal(
          <SwipeBack onBack={() => setScreen(aktFarnost ? "profil" : "feed")}>
            <Kalendar farnost={aktFarnost ?? domFarnost} toast={toast} onBack={() => setScreen(aktFarnost ? "profil" : "feed")} />
          </SwipeBack>
        )}
        {screen === "detail" && akt && obal(<SwipeBack onBack={() => setScreen("feed")}><NabozDetail z={akt} farar={farar} onBack={() => setScreen("feed")} onProfil={otvorProfil} /></SwipeBack>)}
      </ScreenSwitch>

      {sheet === "dir" && (
        <SheetAdresar domovska={domovska} oblubene={oblubene}
          onDomov={(id) => { setDomovska(id); setSheet(null); toast(`Domovská cirkev nastavená · ${FARNOST_PODLA_ID(id)?.skratka ?? ""} (súhlas A9)`); }}
          onFollow={(id) => setOblubene((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          onProfil={(f) => { setSheet(null); otvorProfil(f); }} onClose={() => setSheet(null)} />
      )}

      {sheet === "add" && (
        <PridatSheet farar={farar} farnost={aktFarnost ?? domFarnost} toast={toast} onClose={() => setSheet(null)} />
      )}

      {hladaj && (
        <HladanieModal akcent={N.ind} placeholder="Hľadať farnosť, mesto, cirkev, zbierky…"
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
  domFarnost: Farnost;
  oblubene: Set<string>;
  farar: boolean;
  onFarar: (v: boolean) => void;
  onDir: () => void;
  onAdd: () => void;
  onProfil: (f: Farnost) => void;
  onKalendar: () => void;
  onDetail: (z: NabozFeedItem) => void;
  onHladaj: () => void;
};

function NabozFeed({ wide, domFarnost, oblubene, farar, onFarar, onDir, onAdd, onProfil, onKalendar, onDetail, onHladaj }: FeedProps) {
  const { desktop } = useLayout();
  const [radius, setRadius] = useState("krajina");
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const [chip, setChip] = useState("Všetko");
  const [filterFar, setFilterFar] = useState<string>(domFarnost.id); // domovská = default (mäkká stena)
  const lok = useLokalita();

  // chip rad obľúbených farností (§13): Všetky · domovská ★ · ostatné
  const oblubeneList = [domFarnost.id, ...[...oblubene].filter((id) => id !== domFarnost.id)]
    .map((id) => FARNOST_PODLA_ID(id)).filter(Boolean) as Farnost[];
  const farChips = ["Všetky", ...oblubeneList.map((f) => f.id)];

  // 1) UI predfilter — typ obsahu + farnosť (mäkká stena = default domovská)
  const podlaTypu = FEED_ITEMS.filter((it) => chip === "Všetko" || it.ntyp === CHIP_TYP[chip]);
  const predfilter = filterFar === "Všetky" ? podlaTypu : podlaTypu.filter((it) => farnostIdOf(it) === filterFar);

  // 2) rovnaký feed engine ako Charita (geo + prah + zoradenie)
  const feed = pripravFeed(predfilter as any, { lat: lok.lat, lng: lok.lng, radius } as any) as unknown as NabozFeedItem[];
  const karta = (it: NabozFeedItem) => <NabozKarta key={it.id} wide={wide} it={it} onClick={() => onDetail(it)} onProfil={onProfil} />;

  useStrankaAkcie(() => ({
    pridat: { id: "add", label: farar ? "Pridať do farnosti" : "Pridať oznam", onClick: onAdd },
    extra: farar
      ? [
          { id: "kal", label: "Kalendár & rozvrh", popis: "Omše, sviatky, udalosti", ikona: <IkonaDoska size={18} color={N.ind} />, onClick: onKalendar },
          { id: "dir", label: "Adresár cirkví", popis: "Registrované cirkvi SR", ikona: <IkonaInstitucia size={18} color={N.ind} />, onClick: onDir },
        ]
      : [
          { id: "dir", label: "Adresár cirkví", popis: "Objav všetkých 18 · zmeň domovskú", ikona: <IkonaInstitucia size={18} color={N.ind} />, onClick: onDir },
          { id: "moja", label: "Môj farský profil", popis: "Vojsť do domovskej farnosti", ikona: <IkonaDoska size={18} color={N.ind} />, onClick: () => onProfil(domFarnost) },
        ],
  }), [farar]);

  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      <ModulHlavicka title="Náboženstvo" karma="Náboženstvo · komunita" right={
        <>
          <span {...pressable(onHladaj, "Hľadať")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={N.txt2} /></span>
          <Zvoncek color={N.txt2} toast={toast} />
        </>
      } />

      {/* §39b oprava tickera: cirkev dostáva €, nie DEED */}
      <Ticker>Darca poslal 200 DEED → zbierke „strecha" padlo <b style={{ color: "var(--a-green)" }}>≈ 8 €</b> na farský účet</Ticker>

      {/* §D dva tiles: Adresár cirkví (všetky) · Moja cirkev (moje) — nahrádzajú starý prepínač */}
      <div style={{ display: "flex", gap: SPACE.sm, padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
        <div {...pressable(onDir, "Adresár cirkví")} style={tileBox(N.card, N.line)}>
          <IkonaInstitucia size={18} color={N.ind} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Adresár cirkví</div>
            <div style={{ fontSize: 10.5, color: N.txt3 }}>všetkých 18 · zmeň domovskú</div>
          </div>
        </div>
        <div {...pressable(() => onProfil(domFarnost), "Moja cirkev")} style={tileBox(N.indBg, N.indEdge)}>
          <span style={{ width: 26, height: 26, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(N.ind, .18), color: N.ind, fontSize: 10, fontWeight: 800 }}>{domFarnost.skratka}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: N.ind }}>Moja cirkev ›</div>
            <div style={{ fontSize: 10.5, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{domFarnost.nazov}</div>
          </div>
        </div>
      </div>

      {/* kontext: vystupujem ako ja ↔ Farnosť (§N) */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
        <span style={{ fontSize: 11, color: N.txt3, fontWeight: 700 }}>Vystupuješ ako:</span>
        <SegTabs options={["Ja", `Farnosť ${domFarnost.skratka}`]} value={farar ? `Farnosť ${domFarnost.skratka}` : "Ja"}
          onChange={(l: string) => onFarar(l !== "Ja")} ariaLabel="Kontext roly"
          style={{ display: "flex", gap: SPACE.xs }} render={(c: string, on: boolean) => <Chip on={on} color={c === "Ja" ? N.ind : N.gold}>{c === "Ja" ? "🙂 Ja" : `🛠 ${c}`}</Chip>} />
        {farar && <span style={{ fontSize: 10, color: N.txt3, marginLeft: "auto" }}>správcovský panel</span>}
      </div>

      {/* §13 filter feedu = obľúbené farnosti (domovská ★) */}
      <div style={{ padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
        <SegTabs options={farChips} value={filterFar} onChange={setFilterFar} ariaLabel="Filter podľa farnosti"
          style={{ display: "flex", gap: SPACE.xs, overflowX: "auto", paddingBottom: SPACE.xs }}
          render={(id: string, on: boolean) => {
            const f = FARNOST_PODLA_ID(id);
            const label = id === "Všetky" ? "Všetky" : id === domFarnost.id ? `${f?.obec ?? id} ★` : `${f?.obec ?? id} · ${f?.skratka ?? ""}`;
            return <Chip on={on}>{label}</Chip>;
          }} />
      </div>

      {/* chips = TYP obsahu + štatistický riadok */}
      <FiltreStat
        filtre={
          <div style={{ padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
            <SegTabs options={CHIPY} value={chip} onChange={setChip} ariaLabel="Filter podľa typu obsahu"
              style={{ display: "flex", gap: SPACE.xs, overflowX: "auto", paddingBottom: SPACE.xs }}
              render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />
          </div>
        }
        stat={
          <StatRiadok inline={desktop} pocet={feed.length} jednotka="príspevkov" mesiac="6 120"
            okruh={(FEED_CFG.radiusy as any)[radius].krat} onOkruh={() => setVyberOkruh(true)} />
        }
      />

      {feed.length === 0 ? (
        <EmptyState emoji="⛪" title="Zatiaľ tu nič nie je" text={filterFar === "Všetky" ? "Skús iný typ obsahu alebo väčší okruh." : "Táto farnosť zatiaľ nič nezverejnila — skús „Všetky“."} />
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

      <div style={{ fontSize: 10, color: N.txt3, textAlign: "center", padding: SPACE.xxs }}>obsah komunít — oznamy, udalosti, dobrovoľníctvo · zbierky žijú v Charite (mirror)</div>

      {vyberOkruh && <OkruhVyber radius={radius} akcent={N.ind}
        onPick={(r: string) => { setRadius(r); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}
function tileBox(bg: string, border: string): React.CSSProperties {
  return { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: SPACE.sm, background: bg, border: `1px solid ${border}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" };
}

// ---- karta feedu = zdieľaná FeedCard (badge „overená", bez levelov §J) ----
function NabozKarta({ wide, it, onClick, onProfil }: { wide?: boolean; it: NabozFeedItem; onClick: () => void; onProfil: (f: Farnost) => void }) {
  const jeZbierka = it.ntyp === "zbierka";
  const accent = jeZbierka ? N.gold : it.ukat ? KAT_FARBA[it.ukat] : N.ind;
  const f = FARNOST_PODLA_ID(farnostIdOf(it));
  return (
    <FeedCard wide={wide} onClick={onClick} label={it.nazov || ""} accent={accent}
      media={{ fotky: it.fotky, emoji: it.emoji || "⛪",
        overlay: it.badgeL ? <KartaBadge pos={{ top: 10, left: 10 }} strong color={jeZbierka ? N.gold : "#fff"}>{it.badgeL}</KartaBadge> : undefined }}
      title={it.nazov}
      titleChips={it.overena ? <Overena /> : undefined}
      subtitle={
        <span {...(f ? pressable((e?: any) => { e?.stopPropagation?.(); onProfil(f); }, "Otvoriť farnosť") : {})} style={{ cursor: f ? "pointer" : "default" }}>
          ⛪ {it.komunita || it.cirkev}{it.lok ? ` · ${it.lok}` : ""}
        </span>
      }
      text={it.popis}
      progress={jeZbierka && it.ciel ? { vyzbierane: it.vyzbierane, ciel: it.ciel } : undefined}
    />
  );
}

// ===================== DETAIL PRÍSPEVKU =====================
function NabozDetail({ z, farar, onBack, onProfil }: { z: NabozFeedItem; farar: boolean; onBack: () => void; onProfil: (f: Farnost) => void }) {
  const { wide } = useLayout();
  const otvorGaleriu = useGaleria();
  const jeZbierka = z.ntyp === "zbierka" && z.ciel != null;
  const maCiel = z.ciel != null; // aj udalosti s voliteľnou zbierkou (púť/pohreb)
  const [suma, setSuma] = useState(z.vyzbierane ?? 0);
  const [ludia, setLudia] = useState(z.podpora ?? 0);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  const [split, setSplit] = useState(false);
  const fotky = z.fotky ?? [];
  const maFoto = fotky.length > 0;
  const pribeh = z.pribeh ?? z.popis ?? "";
  const f = FARNOST_PODLA_ID(farnostIdOf(z));
  const jeUdalost = z.ntyp === "udalost";
  const jePripomienka = jeUdalost || z.ntyp === "dobrovolnictvo";
  const maRsvp = !!z.rsvp; // púť/akcia/brigáda (omša RSVP nemá)
  const jeSplit = !!z.split; // pohreb/svadba
  const overitelne = !!z.overitelne || jeSplit; // pravosť rieši komunita (§78), nie záruka cirkvi
  const badgeCol = z.ukat ? KAT_FARBA[z.ukat] : N.ind;

  function podpor(hodnota: number, text: string) { setSuma((s) => s + hodnota * 0.01); setLudia((l) => l + 1); toast(text); }
  function platbaHotova(s: number) { setSuma((x) => x + s * (platba === "EUR" ? 1 : 0.01)); setLudia((l) => l + 1); toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DEED"} · ${z.nazov}`); }
  const reakcia = z.ukat === "pohreb" || z.ukat === "oznam" && z.emoji === "🤍" ? "Kondolencia odoslaná" : z.id === "jubileum" ? "❤ Blahoželáme" : "❤";

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackHeader onBack={onBack} right={<><Zdielanie size={17} color={N.txt2} /><IkonaVlajka size={16} color={N.txt2} /></>}>
        {z.badgeL && <span style={{ fontSize: 12, color: badgeCol, background: tint(badgeCol, .12), border: `1px solid ${tint(badgeCol, .38)}`, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, fontWeight: 700 }}>{z.badgeL}</span>}
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
        {/* hlavička = vydavateľ (farnosť) + overená → klik otvorí profil */}
        <div {...(f ? pressable(() => onProfil(f), "Otvoriť farnosť") : {})} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs, cursor: f ? "pointer" : "default" }}>
          <span style={{ width: 40, height: 40, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: tint(N.ind, .14) }}>{z.emoji || "⛪"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: SPACE.xs }}>{z.komunita || z.cirkev} {z.overena && <Overena />}</div>
            <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>📍 {z.lok || "Slovensko"} · registrovaná (MK SR)</div>
          </div>
          {f && <span style={{ color: N.txt3, fontSize: 18, flex: "none" }}>›</span>}
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, margin: `${SPACE.sm}px 0` }}>{z.nazov}</div>
        <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: SPACE.gutter, color: N.txt2 }}>{pribeh}</div>

        {/* pravosť rieši komunita (Overujem/Namietam) — pohreb/svadba/zbierka pre iného (§78) */}
        {overitelne && (
          <div style={{ marginBottom: SPACE.gutter }}>
            <OverujemNamietam overeni={ludia > 3 ? Math.round(ludia / 3) : 2} namietky={0} subjekt={z.nazov || "prípad"} toast={toast} />
          </div>
        )}

        {/* udalosť s dátumom → RSVP (nie omša) + pripomienka */}
        {jeUdalost && (
          <div style={{ display: "flex", gap: SPACE.sm, marginBottom: SPACE.gutter }}>
            {maRsvp && (
              <div onClick={() => toast(`Zapísané — ${z.nazov} · X pôjde`)} style={{ flex: 1, border: `2px solid ${N.greenEdge}`, background: N.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 700, color: N.green, cursor: "pointer" }}>🗓 Zúčastním sa</div>
            )}
            <div onClick={() => toast("Pripomeniem ti · pridané do kalendára")} style={{ flex: maRsvp ? "none" : 1, minWidth: 120, border: `1px solid ${N.indEdge}`, background: N.indBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 700, color: N.ind, cursor: "pointer" }}>🔔 Pripomeň</div>
          </div>
        )}

        {maCiel ? (
          <>
            <div style={{ marginBottom: SPACE.gutter }}>
              <ProgresBox suma={suma} ciel={z.ciel!} ludia={ludia} />
            </div>

            <div style={{ marginBottom: SPACE.gutter }}>
              <PodporaSekcia
                onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
                upvotes={ludia} onUpvote={() => toast(reakcia)}
                onPodpor={(s: number) => podpor(s, `Ďakujeme za ${s} DEED pre ${z.nazov}`)} onSms={() => podpor(100, "SMS podpora")}
                onKanal={(k: string) => setPlatba(k as Kanal)} accent={N.ind}
                supLabel={z.ukat === "pohreb" ? "PRISPIEŤ — pohrebná zbierka (predĺžené okno ~týždeň)" : "PRISPIEŤ — klik a hneď odíde"} />
            </div>

            {/* pohreb/svadba — Split QR (len farár: rodine ↔ kostolu) */}
            {jeSplit && farar && (
              <div onClick={() => setSplit(true)} style={{ border: `1px solid ${N.greenEdge}`, background: N.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 700, color: N.green, cursor: "pointer", marginBottom: SPACE.gutter }}>
                ⚖ Rozdeliť dar (Split QR) — rodine ↔ kostolu
              </div>
            )}

            <div style={{ fontSize: 11, color: N.txt3, textAlign: "center", background: N.goldBg, border: `1px solid ${N.goldEdge}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
              🏛 Zbierka žije v engine Charita — platby, overenie a transparentnosť. Farnosť dostane vždy € (off-ramp). Pravosť rieši komunitné Overujem/Namietam, nie záruka cirkvi.
            </div>
          </>
        ) : (
          <div style={{ marginBottom: SPACE.gutter }}>
            {z.ntyp === "dobrovolnictvo" && (
              <div onClick={() => toast(`Zapojiť sa — ${z.nazov} · event QR = karma za účasť`)} style={{ width: "100%", border: `2px solid ${N.greenEdge}`, background: N.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 15, fontWeight: 700, color: N.green, cursor: "pointer", marginBottom: SPACE.sm }}>
                🙌 Zapojiť sa
              </div>
            )}
            {/* oznam / dobrovoľníctvo bez cieľa: srdiečko + zdieľať (žiadne komentáre) */}
            <PodporaSekcia
              onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
              upvotes={ludia} onUpvote={() => toast(reakcia)}
              onPodpor={(s: number) => podpor(s, `Ďakujeme za ${s} DEED pre ${z.nazov}`)} onSms={() => podpor(100, "SMS podpora")}
              onKanal={(k: string) => setPlatba(k as Kanal)} accent={N.ind}
              supLabel={z.ntyp === "oznam" ? "PODPORIŤ komunitu — voliteľné" : "PODPORIŤ — klik a hneď odíde"} />
            {z.ukat === "oznam" && <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", marginTop: SPACE.sm }}>Oznam — len srdiečko a zdieľať. Žiadne komentáre (železné pravidlo).</div>}
          </div>
        )}
      </div>

      {platba && <PlatbaModal kanal={platba} komu={z.nazov || ""} onClose={() => setPlatba(null)} onDone={platbaHotova} />}
      {split && <SplitQrSheet titul={z.nazov || "Zbierka"} caseId={null} zdroj="autor" onClose={() => setSplit(false)} toast={toast} />}
    </div>
  );
}
function badge({ top, left, color }: { top?: number; left?: number; color?: string }): React.CSSProperties {
  return { position: "absolute", top, left, fontSize: 10.5, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, fontWeight: 800, color: color || "#fff", background: "rgba(8,11,18,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 2px 8px rgba(0,0,0,.25)", pointerEvents: "none" };
}

// ===================== SHEET: ADRESÁR CIRKVÍ (+ domovská / follow) =====================
function SheetAdresar({ domovska, oblubene, onDomov, onFollow, onProfil, onClose }: {
  domovska: string; oblubene: Set<string>; onDomov: (id: string) => void; onFollow: (id: string) => void; onProfil: (f: Farnost) => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"farnosti" | "cirkvi">("farnosti");
  const [hladaj, setHladaj] = useState("");
  const [raden, setRaden] = useState<"abecedne" | "rodiny" | "najblizsie">("rodiny");

  // FARNOSTI (geo na úrovni farností §A) — hľadanie podľa názvu/mesta (§F)
  const farnostiF = FARNOSTI.filter((f) => !hladaj || (f.nazov + " " + f.obec + " " + f.cirkev).toLowerCase().includes(hladaj.toLowerCase()));

  // 18 cirkví — 3 režimy radenia (abecedne default / rodiny / geo neplatí pre vyznania)
  const cirkviF = CIRKVI
    .map((s) => ({ ...s, polozky: s.polozky.filter((p) => !hladaj || (p.meno + " " + p.rodina).toLowerCase().includes(hladaj.toLowerCase())) }))
    .filter((s) => s.polozky.length);
  const cirkviAbc = raden === "abecedne" ? [...CIRKVI_FLAT].filter((p) => !hladaj || (p.meno + " " + p.rodina).toLowerCase().includes(hladaj.toLowerCase())).sort((a, b) => a.meno.localeCompare(b.meno)) : null;

  return (
    <SheetPanel title="Adresár cirkví a farností" onClose={onClose}>
      <SegTabs options={["Farnosti", "Cirkvi (18)"]} value={tab === "farnosti" ? "Farnosti" : "Cirkvi (18)"}
        onChange={(l: string) => setTab(l === "Farnosti" ? "farnosti" : "cirkvi")} ariaLabel="Farnosti alebo cirkvi"
        style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }} render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />

      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px`, marginBottom: SPACE.sm }}>
        <Lupa size={16} color={N.txt3} />
        <input value={hladaj} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHladaj(e.target.value)}
          placeholder={tab === "farnosti" ? "Zadaj obec / názov farnosti (alebo zapni GPS)…" : "Hľadať cirkev alebo vierovyznanie…"}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: N.txt, fontSize: 13, padding: `${SPACE.xs}px 0` }} />
      </div>

      {tab === "farnosti" ? (
        <>
          {/* radenie (§A tri režimy) */}
          <SegTabs options={["Podľa rodín", "Abecedne", "Najbližšie ku mne"]}
            value={raden === "rodiny" ? "Podľa rodín" : raden === "abecedne" ? "Abecedne" : "Najbližšie ku mne"}
            onChange={(l: string) => setRaden(l === "Abecedne" ? "abecedne" : l === "Najbližšie ku mne" ? "najblizsie" : "rodiny")}
            ariaLabel="Radenie" style={{ display: "flex", gap: SPACE.xs, overflowX: "auto", marginBottom: SPACE.sm }}
            render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />
          <div style={{ fontSize: 11, color: N.txt3, marginBottom: SPACE.sm }}>Geo pracuje na úrovni farností (nie vyznaní). Bez GPS napíš obec — starší človek nesmie ostať visieť.</div>

          {(raden === "najblizsie" ? [...farnostiF].sort((a, b) => parseFloat(a.vzdial) - parseFloat(b.vzdial)) : farnostiF).map((f) => {
            const dom = f.id === domovska;
            const foll = oblubene.has(f.id);
            return (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px`, borderBottom: `1px solid ${N.line}` }}>
                <div {...pressable(() => onProfil(f), f.nazov)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, flex: 1, minWidth: 0, cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: RADIUS.xs, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: tint(N.ind, .14), color: N.ind }}>{f.skratka}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: SPACE.xxs }}>{f.nazov} {dom && <span style={{ color: N.gold }}>★</span>}</div>
                    <div style={{ fontSize: 11.5, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.obec} · {f.vzdial} · <Overena /></div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: "none" }}>
                  <span {...pressable(() => onFollow(f.id), foll ? "Prestať sledovať" : "Sledovať")} style={{ fontSize: 10.5, fontWeight: 700, color: foll ? N.green : N.txt3, cursor: "pointer", textAlign: "right" }}>{foll ? "✓ sledujem" : "+ sledovať"}</span>
                  <span {...pressable(() => onDomov(f.id), "Nastaviť ako domovskú")} style={{ fontSize: 10.5, fontWeight: 700, color: dom ? N.ind : N.txt3, cursor: "pointer", textAlign: "right" }}>{dom ? "domovská" : "nastav domovskú"}</span>
                </div>
              </div>
            );
          })}
          {!farnostiF.length && <div style={{ textAlign: "center", color: N.txt3, fontSize: 13, padding: SPACE.xl }}>Nič sa nenašlo pre „{hladaj}“</div>}
        </>
      ) : (
        <>
          <SegTabs options={["Podľa rodín", "Abecedne"]} value={raden === "abecedne" ? "Abecedne" : "Podľa rodín"}
            onChange={(l: string) => setRaden(l === "Abecedne" ? "abecedne" : "rodiny")} ariaLabel="Radenie cirkví"
            style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }} render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />
          <div style={{ fontSize: 11, color: N.txt3, marginBottom: SPACE.sm }}>18 cirkví registrovaných štátom (register MK SR, zákon 308/1991) · 18 cirkví sa medzi sebou nikdy nerebríčkuje.</div>

          {cirkviAbc ? (
            cirkviAbc.map((p) => <CirkevRiadok key={p.skratka} meno={p.meno} rodina={p.rodina} skratka={p.skratka} />)
          ) : (
            cirkviF.map((s) => (
              <div key={s.rodina}>
                <div style={{ fontSize: 11, fontWeight: 700, color: N.ind, textTransform: "uppercase", letterSpacing: ".04em", margin: `${SPACE.gutter}px 0 ${SPACE.xxs}px` }}>{s.rodina}</div>
                {s.polozky.map((p) => <CirkevRiadok key={p.skratka} meno={p.meno} rodina={p.rodina} skratka={p.skratka} />)}
              </div>
            ))
          )}
          {!cirkviF.length && <div style={{ textAlign: "center", color: N.txt3, fontSize: 13, padding: SPACE.xl }}>Nič sa nenašlo pre „{hladaj}“</div>}
          <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", padding: `${SPACE.md}px 0` }}>Islam na SK registrovaný nie je (zákon žiada 50 000 členov). V zahraničí sa adresár plní podľa tamojšieho registra.</div>
        </>
      )}
    </SheetPanel>
  );
}
function CirkevRiadok({ meno, rodina, skratka }: { meno: string; rodina: string; skratka: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px`, borderBottom: `1px solid ${N.line}` }}>
      <div style={{ width: 40, height: 40, borderRadius: RADIUS.xs, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: tint(N.ind, .14), color: N.ind }}>{skratka}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{meno}</div>
        <div style={{ fontSize: 12, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rodina}</div>
      </div>
      <Overena />
    </div>
  );
}
