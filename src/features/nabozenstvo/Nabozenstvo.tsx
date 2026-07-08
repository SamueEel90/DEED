import { useState, useEffect } from "react";
import { SIRKA, SPACE, RADIUS } from "@/theme";
import { Foto, MiniFotky, ModulHlavicka, PodporaSekcia, PlatbaModal, SplitQrSheet, HladanieModal, toast, useGaleria, useLayout, useScrollHore, useStrankaAkcie, FeedGrid, StatRiadok, FiltreStat, OkruhVyber, MoniBar, ProgresBox, BackHeader, obalSiroky, SegTabs, tint, Lupa, Zdielanie, IkonaVlajka, IkonaFoto, IkonaInstitucia, Srdce, EmptyState, ScreenSwitch, SwipeBack } from "@/shared";
import { MEDIA_AR } from "@/lib/cardSize";
import { FEED_CFG } from "@/lib/feed";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import type { Kanal } from "@/types";
import { pressable } from "@/components/pressable";
import { N, Overena, Chip, SheetPanel, OverujemNamietam, A9Potvrdenie, PrehladTile } from "./ui";
import { FarskyProfil } from "./FarskyProfil";
import { Kalendar } from "./Kalendar";
import { PridatSheet } from "./Pridat";
import {
  FEED_ITEMS, CIRKVI, CIRKVI_FLAT, HLADAJ_DATA, FARNOSTI, FARNOST_PODLA_ID, farnostIdOf, farnostiCirkvi,
  farskySplitVariant, farnostStat, obsahFarnosti, kmNum, rodinaCirkvi, rodinaZoSkratky, KAT_FARBA,
  type NabozFeedItem, type Farnost, type CirkevPolozka,
} from "./mock";

/*
  ============================================================
  MODUL NÁBOŽENSTVO — v2 (adresár-first, produkčná úroveň)
  ------------------------------------------------------------
  · VSTUP = adresár kostolov (farností), NIE zmiešaný feed (§ požiadavka vlastníka)
  · príspevky žijú AŽ v profile kostola (klik na kartu → FarskyProfil)
  · hlavička = jednotná ModulHlavicka + JEDEN filter riadok (fasety vyznaní + sort)
  · adresár sa NIKDY nerebríčkuje — len radenie (najbližšie / abecedne)
  · správcovský (farársky) režim = kontextovo len na profile mojej domovskej cirkvi
  · žiadna karma/levely pre cirkevné subjekty — len badge „overená" (§J)
  ============================================================
*/

type Screen = "domov" | "profil" | "kalendar" | "detail";
type Sheet = "dir" | "add" | null;

export default function ModulNabozenstvo({ wide }: { wide?: boolean; otvorModul?: (m: string) => void }) {
  const { desktop } = useLayout();
  const [screen, setScreen] = useState<Screen>("domov");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [hladaj, setHladaj] = useState(false);
  const [akt, setAkt] = useState<NabozFeedItem | null>(null);
  const [aktFarnost, setAktFarnost] = useState<Farnost | null>(null);

  // domovská cirkev (A9 súhlas) · obľúbené = sledované (jeden zdroj pravdy) · správcovský režim
  const [domovska, setDomovska] = useState<string | null>("tn-mesto");
  const [oblubene, setOblubene] = useState<Set<string>>(() => new Set(["tn-mesto", "ecav-tn", "zob-ba"]));
  const [spravovana, setSpravovana] = useState<string | null>(null); // profil mojej cirkvi → „Spravovať farnosť"
  const [rodina, setRodina] = useState("Všetky"); // faseta vyznania (aj cieľ routingu z vyhľadávania)
  const domFarnost = domovska ? FARNOST_PODLA_ID(domovska) : undefined;

  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  const otvorProfil = (f: Farnost) => { setAktFarnost(f); setScreen("profil"); };
  const toggleFollow = (id: string) => setOblubene((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSpravca = (id: string) => setSpravovana((p) => (p === id ? null : id));
  const spatZDetailu = () => setScreen(aktFarnost ? "profil" : "domov");

  return (
    <div style={{ minHeight: "100%", color: N.txt }}>
      <ScreenSwitch k={screen}>
        {screen === "domov" && (
          <NabozDomov wide={wide} domFarnost={domFarnost} oblubene={oblubene} rodina={rodina} onRodina={setRodina}
            onProfil={otvorProfil} onHladaj={() => setHladaj(true)} onSprievodca={() => setSheet("dir")}
            onToggleFollow={toggleFollow}
            onPrispevok={(z) => { const f = FARNOST_PODLA_ID(farnostIdOf(z)); if (f) setAktFarnost(f); setAkt(z); setScreen("detail"); }} />
        )}
        {screen === "profil" && aktFarnost && obal(
          <SwipeBack onBack={() => setScreen("domov")}>
            <FarskyProfil key={aktFarnost.id} farnost={aktFarnost} farar={spravovana === aktFarnost.id} jeDomovska={domovska === aktFarnost.id}
              following={oblubene.has(aktFarnost.id)} onToggleFollow={() => toggleFollow(aktFarnost.id)}
              onToggleSpravca={() => toggleSpravca(aktFarnost.id)} onSetHome={() => { setDomovska(aktFarnost.id); toast(`Domovská cirkev nastavená · ${aktFarnost.skratka} (súhlas A9)`); }} toast={toast}
              onBack={() => setScreen("domov")} onDetail={(z) => { setAkt(z); setScreen("detail"); }}
              onKalendar={() => setScreen("kalendar")} onPridat={() => setSheet("add")} />
          </SwipeBack>
        )}
        {screen === "kalendar" && obal(
          <SwipeBack onBack={() => setScreen(aktFarnost ? "profil" : "domov")}>
            <Kalendar farnost={aktFarnost ?? domFarnost ?? FARNOSTI[0]} toast={toast} onBack={() => setScreen(aktFarnost ? "profil" : "domov")} />
          </SwipeBack>
        )}
        {screen === "detail" && akt && obal(
          <SwipeBack onBack={spatZDetailu}>
            <NabozDetail z={akt} farar={spravovana === farnostIdOf(akt)} onBack={spatZDetailu} onProfil={otvorProfil} />
          </SwipeBack>
        )}
      </ScreenSwitch>

      {sheet === "dir" && (
        <SheetAdresar domovska={domovska} oblubene={oblubene}
          onDomov={(id) => { setDomovska(id); setSheet(null); toast(`Domovská cirkev nastavená · ${FARNOST_PODLA_ID(id)?.skratka ?? ""} (súhlas A9)`); }}
          onFollow={toggleFollow}
          onProfil={(f) => { setSheet(null); otvorProfil(f); }} onClose={() => setSheet(null)} />
      )}

      {sheet === "add" && (
        <PridatSheet farar={spravovana != null && spravovana === (aktFarnost?.id ?? domovska)} farnost={aktFarnost ?? domFarnost} toast={toast} onClose={() => setSheet(null)} />
      )}

      {hladaj && (
        <HladanieModal akcent={N.ind} placeholder="Hľadať kostol, obec, cirkev, zbierky…"
          data={HLADAJ_DATA}
          onPick={(id: string | number) => {
            const sid = String(id);
            if (sid.startsWith("farnost-")) {
              const f = FARNOST_PODLA_ID(sid.slice(8)); if (f) { setHladaj(false); otvorProfil(f); }
            } else if (sid.startsWith("cirkev-")) {
              const r = rodinaZoSkratky(sid.slice(7)); if (r) setRodina(r); setHladaj(false); setScreen("domov");
            } else {
              const it = FEED_ITEMS.find((x) => x.id === id);
              if (it) { const f = FARNOST_PODLA_ID(farnostIdOf(it)); if (f) setAktFarnost(f); setAkt(it); setHladaj(false); setScreen("detail"); }
              else toast("Otváram…");
            }
          }}
          toast={toast} defaultFilter="Všetko"
          onClose={() => setHladaj(false)} />
      )}
    </div>
  );
}

// slovenské skloňovanie počtu (1 / 2–4 / 5+)
function sklon(n: number, jeden: string, dva: string, viac: string): string {
  return n === 1 ? jeden : n >= 2 && n <= 4 ? dva : viac;
}

// ===================== DOMOV = ADRESÁR KOSTOLOV =====================
// Vstupná maska: LEN kostoly (farnosti). Príspevky sa objavia až v profile.
const FASETY = ["Všetky", ...CIRKVI.map((s) => s.rodina)];

type DomovProps = {
  wide?: boolean;
  domFarnost?: Farnost;
  oblubene: Set<string>;
  rodina: string;
  onRodina: (r: string) => void;
  onProfil: (f: Farnost) => void;
  onHladaj: () => void;
  onSprievodca: () => void;
  onToggleFollow: (id: string) => void;
  onPrispevok: (z: NabozFeedItem) => void;
};

function NabozDomov({ wide, domFarnost, oblubene, rodina, onRodina, onProfil, onHladaj, onSprievodca, onToggleFollow, onPrispevok }: DomovProps) {
  const { desktop } = useLayout();
  const [sort, setSort] = useState<"najblizsie" | "abecedne">("najblizsie");
  const [radius, setRadius] = useState<string>("mesto");
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const radiusy = FEED_CFG.radiusy as Record<string, { km: number; krat: string }>;
  const radiusKm = radiusy[radius]?.km ?? 15;

  // Žiadny verejný „+": oznamy/zbierky tvorí len správca cirkvi (farnosť) cez svoje rozhranie.
  // V ☰ ostáva adresár cirkví (sprievodca výberom + nastavenie domovskej).
  useStrankaAkcie(() => ({
    pridat: undefined,
    extra: [{ id: "dir", label: "Adresár cirkví SR", popis: "18 registrovaných cirkví · nájdi a nastav domovskú", ikona: <IkonaInstitucia size={18} color={N.ind} />, onClick: onSprievodca }],
  }), []);

  // okruh filtruje kostoly podľa vzdialenosti (adresár sa NIKDY nerebríčkuje — len filter + radenie)
  const vOkruhu = FARNOSTI.filter((f) => kmNum(f.vzdial) <= radiusKm);
  const udalostiMesiac = vOkruhu.reduce((s, f) => s + farnostStat(f.id).udalosti, 0);
  const zoznam = vOkruhu
    .filter((f) => f.id !== domFarnost?.id)
    .filter((f) => rodina === "Všetky" || rodinaCirkvi(f.cirkev) === rodina);
  const zoradene = sort === "najblizsie"
    ? [...zoznam].sort((a, b) => kmNum(a.vzdial) - kmNum(b.vzdial))
    : [...zoznam].sort((a, b) => a.nazov.localeCompare(b.nazov, "sk"));

  const adrPadX = desktop ? 0 : SPACE.md;

  // panel „Moja cirkev" — na mobile stohovaný hore, na desktope bočný (ako „Môj DEED" v Domove)
  const mojaCirkev = (
    <>
      <SekciaLabel>MOJA CIRKEV</SekciaLabel>
      {domFarnost ? (
        <>
          <KostolKarta wide={wide} f={domFarnost} home following={oblubene.has(domFarnost.id)}
            onClick={() => onProfil(domFarnost)} onFollow={() => onToggleFollow(domFarnost.id)} />
          <MojaCirkevPrehlad f={domFarnost} onPrispevok={onPrispevok} onProfil={() => onProfil(domFarnost)} />
        </>
      ) : (
        <div {...pressable(onSprievodca, "Nastav si domovskú cirkev")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.indBg, border: `1px solid ${N.indEdge}`, borderRadius: RADIUS.md, padding: SPACE.gutter, cursor: "pointer" }}>
          <IkonaInstitucia size={22} color={N.ind} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: N.ind }}>Nastav si domovskú cirkev ›</div>
            <div style={{ fontSize: 11, color: N.txt2 }}>Otvor adresár alebo profil kostola → „Nastaviť ako moju cirkev". Zobrazí sa navrchu.</div>
          </div>
        </div>
      )}
    </>
  );

  // adresár kostolov — faseta + radenie + mriežka (hlavný obsah)
  const adresar = (
    <>
      <div style={{ padding: `${SPACE.xs}px ${adrPadX}px 0` }}>
        <SegTabs options={FASETY} value={rodina} onChange={onRodina} ariaLabel="Filter podľa vyznania"
          style={{ display: "flex", gap: SPACE.xs, overflowX: "auto", paddingBottom: SPACE.xs }}
          render={(c: string, on: boolean) => <Chip on={on}>{c === "Všetky" ? "Všetky cirkvi" : c}</Chip>} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SPACE.sm, padding: `0 ${adrPadX}px ${SPACE.sm}px` }}>
        <SekciaLabel>{domFarnost ? "ĎALŠIE KOSTOLY" : "KOSTOLY"}{rodina !== "Všetky" ? ` · ${rodina}` : ""}</SekciaLabel>
        <SegTabs options={["Najbližšie", "Abecedne"]} value={sort === "najblizsie" ? "Najbližšie" : "Abecedne"}
          onChange={(l: string) => setSort(l === "Abecedne" ? "abecedne" : "najblizsie")} ariaLabel="Zoradenie adresára"
          style={{ display: "flex", gap: SPACE.xs, flex: "none" }} render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />
      </div>
      {zoradene.length === 0 ? (
        <EmptyState emoji="⛪" title="Žiadny kostol v tomto okruhu"
          text="Skús väčší okruh alebo inú fasetu vyznania."
          action={<span {...pressable(() => setVyberOkruh(true), "Zväčšiť okruh")} style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: N.ind, background: N.indBg, border: `1px solid ${N.indEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>Zväčšiť okruh</span>} />
      ) : (
        <FeedGrid cols={desktop ? 2 : wide ? 2 : 1} padding={`4px ${adrPadX}px 14px`} cards={zoradene.map((f) => (
          <KostolKarta key={f.id} wide={wide} f={f} following={oblubene.has(f.id)}
            onClick={() => onProfil(f)} onFollow={() => onToggleFollow(f.id)} />
        ))} />
      )}
      <div style={{ fontSize: 10, color: N.txt3, textAlign: "center", padding: SPACE.sm, lineHeight: 1.5 }}>
        Register MK SR · 18 registrovaných cirkví SR · adresár sa <b>nerebríčkuje</b> (triedenie, nie poradie)
      </div>
    </>
  );

  return (
    <div style={{ paddingBottom: SPACE.gutter }}>
      <ModulHlavicka title="Náboženstvo" right={
        <>
          <span {...pressable(onHladaj, "Hľadať")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={N.txt2} /></span>
          <Zvoncek color={N.txt2} toast={toast} />
        </>
      } />

      {/* adresár cirkví (sekčný sprievodca) + lokalita/okruh — na desktope na jednom riadku */}
      <FiltreStat
        filtre={
          <div style={{ padding: `0 ${SPACE.md}px ${SPACE.sm}px` }}>
            <div {...pressable(onSprievodca, "Adresár cirkví SR")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.indBg, border: `1px solid ${N.indEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>
              <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(N.ind, .15) }}><IkonaInstitucia size={20} color={N.ind} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Adresár cirkví SR</div>
                <div style={{ fontSize: 11.5, color: N.txt3 }}>18 registrovaných cirkví · nájdi a nastav domovskú</div>
              </div>
              <span style={{ color: N.txt3, fontSize: 16 }}>›</span>
            </div>
          </div>
        }
        stat={
          <StatRiadok inline={desktop} pocet={vOkruhu.length} jednotka="kostolov" mesiac={udalostiMesiac}
            okruh={radiusy[radius]?.krat ?? "okruh"} onOkruh={() => setVyberOkruh(true)} />
        }
      />

      {desktop ? (
        <div style={{ display: "flex", gap: SPACE.lg, alignItems: "flex-start", padding: `${SPACE.xs}px ${SPACE.md}px 0` }}>
          <div style={{ flex: 1, minWidth: 0 }}>{adresar}</div>
          <aside style={{ width: 340, flex: "0 0 340px", minWidth: 0, position: "sticky", top: SPACE.sm }}>{mojaCirkev}</aside>
        </div>
      ) : (
        <>
          <div style={{ padding: `${SPACE.xs}px ${SPACE.md}px ${SPACE.sm}px` }}>{mojaCirkev}</div>
          {adresar}
        </>
      )}

      {vyberOkruh && <OkruhVyber radius={radius} akcent={N.ind}
        onPick={(r: string) => { setRadius(r); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}

// rýchly prehľad mojej cirkvi (à la „Môj DEED"): dlaždice + aktívne zbierky + info oznamy/udalosti
function MojaCirkevPrehlad({ f, onPrispevok, onProfil }: { f: Farnost; onPrispevok: (z: NabozFeedItem) => void; onProfil: () => void }) {
  const obsah = obsahFarnosti(f.id);
  const zbierky = obsah.filter((it) => it.ntyp === "zbierka").slice(0, 2);
  const oznamy = obsah.filter((it) => it.ntyp === "oznam" || it.ntyp === "udalost").slice(0, 3);
  const st = farnostStat(f.id);
  return (
    <div style={{ marginTop: SPACE.sm }}>
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
        <PrehladTile ikona="👥 " hodnota={(f.sledovatelia ?? 0).toLocaleString("sk-SK")} label="sledujúcich" color={N.ind} />
        <PrehladTile ikona="💶 " hodnota={`${Math.round(f.vyzbierane ?? 0).toLocaleString("sk-SK")} €`} label="vyzbierané" color={N.green} />
        <PrehladTile ikona="🕊 " hodnota={String(st.zbierky)} label="zbierok" color={N.gold} />
      </div>

      {zbierky.map((z) => (
        <div key={z.id} {...pressable(() => onPrispevok(z), z.nazov)} style={{ background: N.indBg, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, cursor: "pointer" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: SPACE.xxs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z.emoji ? `${z.emoji} ` : ""}{z.nazov}</div>
          {z.ciel != null && <MoniBar vyzbierane={z.vyzbierane ?? 0} ciel={z.ciel} mini />}
        </div>
      ))}

      {oznamy.length > 0 && <SekciaLabel>OZNAMY &amp; UDALOSTI</SekciaLabel>}
      {oznamy.map((o) => (
        <div key={o.id} {...pressable(() => onPrispevok(o), o.nazov)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xs}px 0`, borderTop: `1px solid ${N.line}`, cursor: "pointer" }}>
          <span style={{ width: 30, height: 30, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: tint(N.ind, .12) }}>{o.emoji ?? "📢"}</span>
          <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.nazov}</div>
          <span style={{ color: N.txt3, fontSize: 14, flex: "none" }}>›</span>
        </div>
      ))}

      {zbierky.length === 0 && oznamy.length === 0 && (
        <div style={{ fontSize: 11.5, color: N.txt3, padding: `${SPACE.xs}px 0` }}>Táto cirkev zatiaľ nemá zbierky ani oznamy.</div>
      )}

      <button onClick={onProfil} style={{ width: "100%", marginTop: SPACE.sm, height: 40, border: `1px solid ${N.indEdge}`, background: N.indBg, color: N.ind, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Otvoriť profil cirkvi ›</button>
    </div>
  );
}

function SekciaLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: N.txt3, letterSpacing: ".04em", marginBottom: SPACE.xs }}>{children}</div>;
}

// ---- karta kostola (adresárová entita — NIE post karta) ----
function KostolKarta({ wide, f, home, following, onClick, onFollow }: {
  wide?: boolean; f: Farnost; home?: boolean; following?: boolean; onClick: () => void; onFollow?: () => void;
}) {
  const st = farnostStat(f.id);
  const statText = st.spolu > 0
    ? [st.zbierky ? `${st.zbierky} ${sklon(st.zbierky, "zbierka", "zbierky", "zbierok")}` : null,
       st.udalosti ? `${st.udalosti} ${sklon(st.udalosti, "udalosť", "udalosti", "udalostí")}` : null]
        .filter(Boolean).slice(0, 2).join(" · ") || `${f.sledovatelia ?? 0} sledujúcich`
    : `Založená ${f.zalozena ?? "—"} · ${f.sledovatelia ?? 0} sledujúcich`;

  return (
    <div {...pressable(onClick, f.nazov)} style={{ background: N.card, border: `1px solid ${home ? N.indEdge : N.line}`, borderRadius: RADIUS.md, overflow: "hidden", cursor: "pointer", boxShadow: home ? `0 0 20px ${tint(N.ind, .1)}` : "none" }}>
      <div style={{ position: "relative" }}>
        <Foto src={f.foto} emoji="⛪" h={180} radius={0} />
        <span style={fotoBadge(10, "left")}>{f.skratka}</span>
        {home && <span style={{ ...fotoBadge(10, "right"), display: "inline-flex", alignItems: "center", gap: 3 }}><span style={{ color: "#F4CE63" }}>★</span> moja</span>}
        {onFollow && (
          <span {...pressable((e?: any) => { e?.stopPropagation?.(); onFollow(); }, following ? "Prestať sledovať" : "Sledovať")}
            style={{ position: "absolute", bottom: 10, right: 10, width: 34, height: 34, borderRadius: "50%", background: "rgba(8,11,18,.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Srdce size={17} filled={following} color={following ? "#F4CE63" : "#fff"} />
          </span>
        )}
      </div>
      <div style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px ${SPACE.gutter}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginBottom: 3 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nazov}</div>
          <Overena />
        </div>
        <div style={{ fontSize: 11.5, color: N.txt2, marginBottom: SPACE.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {f.obec} · {f.vzdial}{f.kostol ? ` · ${f.kostol}` : ""}</div>
        <div style={{ fontSize: 11, color: N.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>⛪ {statText}</div>
      </div>
    </div>
  );
}
function fotoBadge(pos: number, side: "left" | "right"): React.CSSProperties {
  return { position: "absolute", top: pos, [side]: pos, fontSize: 10.5, fontWeight: 800, color: "#fff", background: "rgba(8,11,18,.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.16)", padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs };
}

// ===================== DETAIL PRÍSPEVKU =====================
function NabozDetail({ z, farar, onBack, onProfil }: { z: NabozFeedItem; farar: boolean; onBack: () => void; onProfil: (f: Farnost) => void }) {
  const { wide } = useLayout();
  const otvorGaleriu = useGaleria();
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
  const maRsvp = !!z.rsvp; // púť/akcia/brigáda (omša RSVP nemá)
  const jeSplit = !!z.split; // pohreb/svadba
  // §11: Overujem/Namietam LEN na Help prípadoch jednotlivcov (núdza + riziko podvodu).
  const overitelne = !!z.overitelne;
  const badgeCol = z.ukat ? KAT_FARBA[z.ukat] : N.ind;

  function podpor(hodnota: number, text: string) { setSuma((s) => s + hodnota * 0.01); setLudia((l) => l + 1); toast(text); }
  function platbaHotova(s: number) { setSuma((x) => x + s * (platba === "EUR" ? 1 : 0.01)); setLudia((l) => l + 1); toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DEED"} · ${z.nazov}`); }
  const reakcia = z.ukat === "pohreb" || (z.ukat === "oznam" && z.emoji === "🤍") ? "Kondolencia odoslaná" : z.id === "jubileum" ? "❤ Blahoželáme" : "❤";

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackHeader onBack={onBack} right={<><Zdielanie size={17} color={N.txt2} /><IkonaVlajka size={16} color={N.txt2} /></>}>
        {z.badgeL && <span style={{ fontSize: 12, color: badgeCol, background: tint(badgeCol, .12), border: `1px solid ${tint(badgeCol, .38)}`, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, fontWeight: 700 }}>{z.badgeL}</span>}
        {z.lok && <span style={{ fontSize: 12, color: N.txt2 }}>📍 {z.lok}</span>}
      </BackHeader>
      <div style={{ height: SPACE.sm }} />

      {/* hero foto — LEN ak príspevok má fotku (bez placeholdera; inak čisto textový detail) */}
      {maFoto && (
        <div style={{ padding: `0 ${SPACE.md}px` }}>
          <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : {}) }}>
            <Foto src={fotky[0]} emoji={z.emoji || "⛪"} h={wide ? "100%" : 200} w={wide ? "100%" : undefined} radius={14} onClick={() => otvorGaleriu(fotky, 0)} />
            <span style={{ ...badge({ top: 9, left: 9, color: "#fff" }), display: "inline-flex", alignItems: "center", gap: SPACE.xxs }}><IkonaFoto size={12} color="#fff" /> foto komunity</span>
          </div>
        </div>
      )}
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

        {/* §11: Overujem/Namietam LEN na Help prípadoch jednotlivcov (núdza + riziko podvodu) */}
        {overitelne && (
          <div style={{ marginBottom: SPACE.gutter }}>
            <OverujemNamietam overeni={ludia > 3 ? Math.round(ludia / 3) : 2} namietky={0} subjekt={z.nazov || "prípad"} toast={toast} />
          </div>
        )}

        {/* §11: pohreb/svadba — pravosť rieši overená farnosť + farár + registrácia, nie hlasovanie */}
        {jeSplit && (
          <div style={{ marginBottom: SPACE.gutter, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter, fontSize: 11.5, color: N.txt2, lineHeight: 1.5 }}>
            🕯 Pravosť potvrdzuje <b>overená farnosť</b> + <b>farár schválil</b> + registrácia (dom smútku, rodina). „Niekto zomrel — Namietam" je netaktné aj zbytočné — na zriedkavý podvod stačí <b>nahlásiť</b> (vlajka hore), nie verejné hlasovanie.
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
                upvotes={ludia} onUpvote={() => toast(reakcia)} reakcia="srdce"
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
            {/* §12: oznam/dobrovoľníctvo bez napojenej zbierky → LEN srdiečko + zdieľať. */}
            <PodporaSekcia
              onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
              upvotes={ludia} onUpvote={() => toast(reakcia)} reakcia="srdce" bezDaru
              onPodpor={() => {}} onKanal={() => {}} accent={N.ind} />
            {z.ntyp === "oznam" && <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", marginTop: SPACE.sm }}>Bez zbierky — len srdiečko a zdieľať. „Prispieť" sa objaví len ak je oznam napojený na zbierku (napr. úmrtie → pohrebná zbierka). Žiadne komentáre (železné pravidlo).</div>}
          </div>
        )}
      </div>

      {platba && <PlatbaModal kanal={platba} komu={z.nazov || ""} onClose={() => setPlatba(null)} onDone={platbaHotova} />}
      {split && <SplitQrSheet titul={z.nazov || "Zbierka"} caseId={null} zdroj="autor"
        variant={farskySplitVariant(z.ukat === "svadba" ? "svadba" : "pohreb")}
        onClose={() => setSplit(false)} toast={toast} />}
    </div>
  );
}
function badge({ top, left, color }: { top?: number; left?: number; color?: string }): React.CSSProperties {
  return { position: "absolute", top, left, fontSize: 10.5, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, fontWeight: 800, color: color || "#fff", background: "rgba(8,11,18,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 2px 8px rgba(0,0,0,.25)", pointerEvents: "none" };
}

// ===================== SHEET: SPRIEVODCA VÝBEROM (vedený výber domovskej) =====================
// Vedená sekvencia: poloha → vyznanie → farnosti TEJ cirkvi podľa vzdialenosti →
// vyber domovskú (A9) / pridaj obľúbenú / otvor profil. Prístupný cez ☰ „Sprievodca výberom"
// a z prázdneho stavu (bez domovskej). Doplnková cesta — adresár na domove je primárny objav.
type AdrKrok = "poloha" | "vyznanie" | "farnosti";

function SheetAdresar({ domovska, oblubene, onDomov, onFollow, onProfil, onClose }: {
  domovska: string | null; oblubene: Set<string>; onDomov: (id: string) => void; onFollow: (id: string) => void; onProfil: (f: Farnost) => void; onClose: () => void;
}) {
  const [krok, setKrok] = useState<AdrKrok>("poloha");
  const [obec, setObec] = useState("");
  const [cirkev, setCirkev] = useState<CirkevPolozka | null>(null);
  const [hladaj, setHladaj] = useState("");
  const [radenC, setRadenC] = useState<"abecedne" | "rodiny">("abecedne"); // §A: abecedne = default
  const [radenF, setRadenF] = useState<"najblizsie" | "abecedne">("najblizsie");
  const [vybrana, setVybrana] = useState<string | null>(null); // rozbalené akcie riadku
  const [potvrdDom, setPotvrdDom] = useState<string | null>(null); // A9 potvrdenie domovskej

  // 18 cirkví — radenie abecedne (default) / rodiny; nikdy sa nerebríčkujú
  const cirkviF = CIRKVI
    .map((s) => ({ ...s, polozky: s.polozky.filter((p) => !hladaj || (p.meno + " " + p.rodina).toLowerCase().includes(hladaj.toLowerCase())) }))
    .filter((s) => s.polozky.length);
  const cirkviAbc = [...CIRKVI_FLAT].filter((p) => !hladaj || (p.meno + " " + p.rodina).toLowerCase().includes(hladaj.toLowerCase())).sort((a, b) => a.meno.localeCompare(b.meno));

  // farnosti scopnuté na zvolenú cirkev (§10) + radenie
  const farnostiScope = cirkev ? farnostiCirkvi(cirkev.meno) : [];
  const farnostiZoradene = radenF === "najblizsie"
    ? [...farnostiScope].sort((a, b) => kmNum(a.vzdial) - kmNum(b.vzdial))
    : [...farnostiScope].sort((a, b) => a.nazov.localeCompare(b.nazov));

  const titulKroku = krok === "poloha" ? "Kde hľadáš?" : krok === "vyznanie" ? "Vyber si vyznanie" : "Vyber si farnosť";

  return (
    <SheetPanel title="Sprievodca výberom cirkvi" onClose={onClose}>
      {/* breadcrumb postupnosti */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, flexWrap: "wrap", fontSize: 11, marginBottom: SPACE.md }}>
        <KrokChip label={obec ? `📍 ${obec}` : "📍 Poloha"} on={krok === "poloha"} done={krok !== "poloha"} onClick={() => setKrok("poloha")} />
        <span style={{ color: N.txt3 }}>›</span>
        <KrokChip label={cirkev ? `⛪ ${cirkev.skratka}` : "⛪ Vyznanie"} on={krok === "vyznanie"} done={!!cirkev && krok === "farnosti"} onClick={() => setKrok("vyznanie")} />
        <span style={{ color: N.txt3 }}>›</span>
        <KrokChip label="🏠 Domovská" on={krok === "farnosti"} done={false} onClick={() => cirkev && setKrok("farnosti")} />
      </div>

      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: SPACE.sm }}>{titulKroku}</div>

      {/* ===== KROK 1: POLOHA ===== */}
      {krok === "poloha" && (
        <>
          <div style={{ fontSize: 12, color: N.txt2, marginBottom: SPACE.md, lineHeight: 1.5 }}>Geo pracuje na úrovni farností (nie vyznaní). Napíš obec alebo zapni GPS — <b>starší človek bez GPS nesmie ostať visieť</b>.</div>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px`, marginBottom: SPACE.sm }}>
            <Lupa size={16} color={N.txt3} />
            <input value={obec} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObec(e.target.value)} placeholder="Zadaj obec / mesto…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: N.txt, fontSize: 14, padding: `${SPACE.sm}px 0` }} />
          </div>
          <div {...pressable(() => setObec("Trenčín"), "Zapnúť GPS")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, border: `1px solid ${N.indEdge}`, background: N.indBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, cursor: "pointer", color: N.ind, fontWeight: 700, fontSize: 13, marginBottom: SPACE.md }}>
            📍 Zapnúť GPS (nájsť moju polohu)
          </div>
          <button onClick={() => setKrok("vyznanie")} style={ctaAdr(obec ? N.ind : N.txt3)}>
            {obec ? `Pokračovať · ${obec}` : "Pokračovať bez polohy"}
          </button>
          <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", padding: `${SPACE.sm}px 0` }}>Polohu môžeš zadať aj neskôr — najprv si vyber vyznanie.</div>
        </>
      )}

      {/* ===== KROK 2: VYZNANIE (18 cirkví) ===== */}
      {krok === "vyznanie" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px`, marginBottom: SPACE.sm }}>
            <Lupa size={16} color={N.txt3} />
            <input value={hladaj} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHladaj(e.target.value)} placeholder="Hľadať cirkev alebo vierovyznanie…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: N.txt, fontSize: 13, padding: `${SPACE.xs}px 0` }} />
          </div>
          <SegTabs options={["Abecedne", "Podľa rodín"]} value={radenC === "abecedne" ? "Abecedne" : "Podľa rodín"}
            onChange={(l: string) => setRadenC(l === "Abecedne" ? "abecedne" : "rodiny")} ariaLabel="Radenie cirkví"
            style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }} render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />
          <div style={{ fontSize: 11, color: N.txt3, marginBottom: SPACE.sm }}>18 cirkví registrovaných štátom (register MK SR, zákon 308/1991) · <b>18 cirkví sa medzi sebou nikdy nerebríčkuje</b> — je to triedenie, nie poradie.</div>

          {radenC === "abecedne" ? (
            cirkviAbc.map((p) => <CirkevRiadok key={p.skratka} p={p} onClick={() => { setCirkev(p); setVybrana(null); setKrok("farnosti"); }} />)
          ) : (
            cirkviF.map((s) => (
              <div key={s.rodina}>
                <div style={{ fontSize: 11, fontWeight: 700, color: N.ind, textTransform: "uppercase", letterSpacing: ".04em", margin: `${SPACE.gutter}px 0 ${SPACE.xxs}px` }}>{s.rodina}</div>
                {s.polozky.map((p) => <CirkevRiadok key={p.skratka} p={p} onClick={() => { setCirkev(p); setVybrana(null); setKrok("farnosti"); }} />)}
              </div>
            ))
          )}
          {!cirkviAbc.length && <div style={{ textAlign: "center", color: N.txt3, fontSize: 13, padding: SPACE.xl }}>Nič sa nenašlo pre „{hladaj}“</div>}
          <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", padding: `${SPACE.md}px 0` }}>Islam na SK registrovaný nie je (zákon žiada 50 000 členov). V zahraničí sa adresár plní podľa tamojšieho registra.</div>
        </>
      )}

      {/* ===== KROK 3: FARNOSTI ZVOLENEJ CIRKVI ===== */}
      {krok === "farnosti" && cirkev && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.indBg, border: `1px solid ${N.indEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm }}>
            <span style={{ width: 30, height: 30, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, background: tint(N.ind, .18), color: N.ind }}>{cirkev.skratka}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: N.ind, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cirkev.meno}</div>
              <div style={{ fontSize: 10.5, color: N.txt2 }}>farnosti tejto cirkvi{obec ? ` · pri ${obec}` : ""} · podľa vzdialenosti</div>
            </div>
            <span {...pressable(() => setKrok("vyznanie"), "Zmeniť vyznanie")} style={{ fontSize: 11, fontWeight: 700, color: N.ind, cursor: "pointer", flex: "none" }}>zmeniť</span>
          </div>

          <SegTabs options={["Najbližšie ku mne", "Abecedne"]} value={radenF === "najblizsie" ? "Najbližšie ku mne" : "Abecedne"}
            onChange={(l: string) => setRadenF(l === "Abecedne" ? "abecedne" : "najblizsie")} ariaLabel="Radenie farností"
            style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }} render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />

          {farnostiZoradene.map((f) => {
            const dom = f.id === domovska;
            const foll = oblubene.has(f.id);
            const open = vybrana === f.id;
            return (
              <div key={f.id} style={{ borderBottom: `1px solid ${N.line}` }}>
                <div {...pressable(() => setVybrana(open ? null : f.id), f.nazov)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px`, cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: RADIUS.xs, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: tint(N.ind, .14), color: N.ind }}>{f.skratka}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: SPACE.xxs }}>{f.nazov} {dom && <span style={{ color: N.gold }}>★</span>}</div>
                    <div style={{ fontSize: 11.5, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.obec} · {f.vzdial} · <Overena /></div>
                  </div>
                  <span style={{ color: N.txt3, fontSize: 15, flex: "none", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
                </div>

                {/* akcie riadku (vybrať / domovská / obľúbené / profil) + potvrdenie */}
                {open && (
                  <div style={{ padding: `0 ${SPACE.xxs}px ${SPACE.sm}px` }}>
                    {potvrdDom === f.id ? (
                      <A9Potvrdenie nazov={f.nazov} onConfirm={() => onDomov(f.id)} onCancel={() => setPotvrdDom(null)} />
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs }}>
                        <button onClick={() => setPotvrdDom(f.id)} disabled={dom} style={adrBtn(N.ind, !dom)}>{dom ? "✓ toto je tvoja domovská" : "🏠 Nastaviť ako domovskú"}</button>
                        <div style={{ display: "flex", gap: SPACE.sm }}>
                          <button onClick={() => onFollow(f.id)} style={{ ...adrBtn(foll ? N.green : N.txt2, false), flex: 1 }}>{foll ? "✓ Sledujem" : "+ Pridať k obľúbeným"}</button>
                          <button onClick={() => onProfil(f)} style={{ ...adrBtn(N.txt2, false), flex: 1 }}>Otvoriť profil ›</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!farnostiZoradene.length && (
            <div style={{ textAlign: "center", color: N.txt3, fontSize: 12.5, padding: SPACE.xl, lineHeight: 1.6 }}>
              V cirkvi <b>{cirkev.meno}</b> zatiaľ nemáme farnosť{obec ? ` pri „${obec}"` : ""}.<br />Napíš inú obec alebo skús neskôr — adresár sa plní, ako sa farnosti registrujú.
            </div>
          )}
          <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", padding: `${SPACE.md}px 0` }}>Domovská = súhlas o vierovyznaní (A9). Obľúbené len pridávajú obsah do feedu (aj iné vyznanie cez hľadanie — medzináboženská solidarita).</div>
        </>
      )}
    </SheetPanel>
  );
}
function ctaAdr(bg: string): React.CSSProperties {
  return { width: "100%", height: 48, border: "none", borderRadius: RADIUS.md, background: bg, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer" };
}
function adrBtn(col: string, primary: boolean): React.CSSProperties {
  return { height: 40, border: `1px solid ${primary ? col : N.line}`, background: primary ? tint(col, .12) : N.card, color: col, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs };
}
function KrokChip({ label, on, done, onClick }: { label: string; on: boolean; done: boolean; onClick?: () => void }) {
  return (
    <span {...(onClick ? pressable(onClick, label) : {})} style={{ fontSize: 11, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: 99, cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap",
      background: on ? N.ind : done ? N.greenBg : N.card, color: on ? "#fff" : done ? N.green : N.txt3, border: `1px solid ${on ? N.ind : done ? N.greenEdge : N.line}` }}>
      {done && !on ? "✓ " : ""}{label}
    </span>
  );
}
function CirkevRiadok({ p, onClick }: { p: CirkevPolozka; onClick: () => void }) {
  return (
    <div {...pressable(onClick, p.meno)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px`, borderBottom: `1px solid ${N.line}`, cursor: "pointer" }}>
      <div style={{ width: 40, height: 40, borderRadius: RADIUS.xs, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: tint(N.ind, .14), color: N.ind }}>{p.skratka}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{p.meno}</div>
        <div style={{ fontSize: 12, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.rodina}</div>
      </div>
      <Overena />
      <span style={{ color: N.txt3, fontSize: 15, flex: "none" }}>›</span>
    </div>
  );
}
