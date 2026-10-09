import { useState, useEffect } from "react";
import { SIRKA, SPACE, RADIUS } from "@/theme";
import { Foto, MiniFotky, PlatobnyModul, PlatbaModal, SplitQrSheet, QrModal, HladanieModal, toast, useGaleria, useLayout, useScrollPamat, ProgresBox, BackHeader, obalSiroky, tint, Zdielanie, IkonaVlajka, IkonaFoto, ScreenSwitch, SwipeBack, ZoznamDarcov, FormatovanyText, Input } from "@/shared";
import { pridajDar, SektorDarcuKontext, type VolbaDaru } from "@/lib/darcovia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { cistyText } from "@/lib/richtext";
import { MEDIA_AR } from "@/lib/cardSize";
import type { Kanal } from "@/types";
import { pressable } from "@/components/pressable";
import { useVrstva } from "@/lib/urlnav";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import { stiahniIcs } from "@/lib/kalendar";
import { maPripomienku, zapniPripomienku, vypniPripomienku } from "@/lib/pripomienky";
import { OzvatSaSheet } from "@/components/ozvatsa";
import { NahlasitSheet } from "@/components/nahlasit";
import { nacitajRsvp as nacitajRsvpDB, prepniRsvp as prepniRsvpDB } from "@/lib/osobne";
import { N, Overena, SheetPanel, OverujemNamietam } from "./ui";
import { SmutocnyOznamBlok } from "./SmutocnyOznam";
import { FarskyProfil } from "./FarskyProfil";
import { Kalendar } from "./Kalendar";
import { PridatSheet } from "./Pridat";
import {
  FEED_ITEMS, HLADAJ_DATA, FARNOSTI, FARNOST_PODLA_ID, farnostIdOf, farskySplitVariant, rodinaZoSkratky, KAT_FARBA, reakciaToast,
  jeVlastnyPrispevok, zmazPrispevok, upravPrispevok } from "./mock";
import { useMojeFarnosti, otvorAdresar } from "@/lib/mojeFarnosti";
import { FarnostStranka } from "@/features/verejny-profil/VerejnyProfil";
import {
  type VieraFeedItem, type Farnost } from "./mock";

/*
  ============================================================
  MODUL VIERA — v2 (adresár-first, produkčná úroveň)
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

/** OPRAVY 159: celý modul Viera = sektor Viera (darca bez mena = „Bohu známy veriaci") */
export default function ModulViera(p: { wide?: boolean; otvorModul?: (m: string) => void }) {
  return <SektorDarcuKontext.Provider value="viera"><ModulVieraObsah {...p} /></SektorDarcuKontext.Provider>;
}

function ModulVieraObsah({ wide }: { wide?: boolean; otvorModul?: (m: string) => void }) {
  const { desktop } = useLayout();
  const [screen, setScreen] = useState<Screen>("domov");
  const MF = useMojeFarnosti();
  const [sheet, setSheet] = useState<Sheet>(null);
  // pod-obrazovka = vrstva histórie → browser Back sa vráti na adresár (nie von z appky)
  useVrstva(screen !== "domov", () => setScreen("domov"), screen);
  const [hladaj, setHladaj] = useState(false);
  const [akt, setAkt] = useState<VieraFeedItem | null>(null);
  const [aktFarnost, setAktFarnost] = useState<Farnost | null>(null);

  // domovská cirkev (A9 súhlas) · obľúbené = sledované (jeden zdroj pravdy) · správcovský režim
  const [domovska, setDomovska] = useState<string | null>("tn-mesto");
  const [oblubene, setOblubene] = useState<Set<string>>(() => new Set(["tn-mesto", "ecav-tn", "zob-ba"]));
  const [spravovana, setSpravovana] = useState<string | null>(null); // profil mojej cirkvi → „Spravovať farnosť"
  const [, setRodina] = useState("Všetky"); // faseta vyznania (aj cieľ routingu z vyhľadávania)
  const domFarnost = domovska ? FARNOST_PODLA_ID(domovska) : undefined;

  useScrollPamat(screen); // pamäť scrollu — „Späť" z príspevku obnoví pozíciu (nie skok hore)
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie });

  const otvorProfil = (f: Farnost) => { setAktFarnost(f); setScreen("profil"); };
  const toggleFollow = (id: string) => setOblubene((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSpravca = (id: string) => setSpravovana((p) => (p === id ? null : id));
  const spatZDetailu = () => setScreen(aktFarnost ? "profil" : "domov");

  return (
    <div style={{ minHeight: "100%", color: N.txt }}>
      <ScreenSwitch k={screen}>
        {/* KARTA 60: bez domovskej len pás Adresár cirkví SR; s domovskou jej živá stránka (tlačidlo Moja farnosť ⌄ vpravo hore) */}
        {screen === "domov" && (MF.domovska ? <FarnostStranka key={MF.domovska} strankaId={MF.domovska} /> : <PasAdresar />)}
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
            <Kalendar farnost={aktFarnost ?? domFarnost ?? FARNOSTI[0]} toast={toast} onBack={() => setScreen(aktFarnost ? "profil" : "domov")} onPridat={() => setSheet("add")} />
          </SwipeBack>
        )}
        {screen === "detail" && akt && obal(
          <SwipeBack onBack={spatZDetailu}>
            <VieraDetail z={akt} farar={spravovana === farnostIdOf(akt)} onBack={spatZDetailu} onProfil={otvorProfil} />
          </SwipeBack>
        )}
      </ScreenSwitch>


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

/** KARTA 60: Viera bez domovskej farnosti = len veľký pás Adresár cirkví SR */
function PasAdresar() {
  return (
    <div style={{ minHeight: "100%", background: "#EFEAE1", color: "#1D211B", padding: "clamp(20px,5vw,56px) clamp(16px,5vw,72px)", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <button type="button" onClick={() => otvorAdresar()} style={{ width: "100%", maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, padding: "clamp(24px,4vw,40px)", borderRadius: 26, border: "2px solid #4B7A35", background: "#FBF9F4", color: "#1D211B", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
        <b style={{ fontSize: "clamp(28px,4vw,40px)", lineHeight: 1.1, letterSpacing: "-.03em" }}>Adresár cirkví SR ›</b>
        <span style={{ fontSize: 17, lineHeight: 1.5, color: "#4A4C43" }}>18 cirkví registrovaných štátom. Nájdite svoju farnosť a vyberte si ju ako domovskú. Potom tu uvidíte jej oznamy, omše a zbierky.</span>
        <span style={{ marginTop: 6, minHeight: 56, padding: "0 22px", borderRadius: 15, background: "#4B7A35", color: "#fff", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center" }}>Otvoriť Adresár</span>
      </button>
    </div>);
}

// ===================== DETAIL PRÍSPEVKU =====================
function VieraDetail({ z, farar, onBack, onProfil }: { z: VieraFeedItem; farar: boolean; onBack: () => void; onProfil: (f: Farnost) => void }) {
  const { wide } = useLayout();
  const otvorGaleriu = useGaleria();
  // parte režim 2: „Pridať zbierku" nastaví cieľ aj lokálne (z je snapshot z feedu)
  const [cielLocal, setCielLocal] = useState<number | null>(z.ciel ?? null);
  const maCiel = cielLocal != null; // aj udalosti s voliteľnou zbierkou (púť/pohreb)
  const [suma, setSuma] = useState(z.vyzbierane ?? 0);
  const [ludia, setLudia] = useState(z.podpora ?? 0);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  const [split, setSplit] = useState(false);
  const [qr, setQr] = useState(false); // QR zbierky (§10) — sken → dar
  const fotky = z.fotky ?? [];
  // bod 23: pri parte ŽIADNY surový banner navrchu — parte je obsah (foto už obsahuje)
  const maFoto = fotky.length > 0 && !z.smutocny;
  const pribeh = z.pribeh ?? z.popis ?? "";
  const f = FARNOST_PODLA_ID(farnostIdOf(z));
  const jeUdalost = z.ntyp === "udalost";
  const maRsvp = !!z.rsvp; // púť/akcia/brigáda (omša RSVP nemá)
  const [idem, setIdem] = useState(false); // RSVP účasť (DB/localStorage) — načíta sa async
  useEffect(() => { let z0 = false; nacitajRsvpDB().then((s) => { if (!z0) setIdem(s.has(z.id)); }); return () => { z0 = true; }; }, [z.id]);
  async function prepniRsvp() {
    const nove = await prepniRsvpDB(z.id);
    setIdem(nove);
    toast(nove ? `Zapísané — ${z.nazov}. Tešíme sa!` : "Účasť zrušená");
  }
  // 🔔 Pripomeň = reálna pripomienka (Web Notifications): povolenie + uloženie +
  // okamžité potvrdenie + naplánovanie na čas udalosti. Toggle (zapnúť/zrušiť).
  const [pripomenute, setPripomenute] = useState(false);
  useEffect(() => { setPripomenute(maPripomienku(z.id)); }, [z.id]);
  async function prepniPripomen() {
    if (pripomenute) { vypniPripomienku(z.id); setPripomenute(false); toast("Pripomienka zrušená"); return; }
    const ok = await zapniPripomienku({ refId: z.id, modul: "nabozenstvo", nazov: z.nazov ?? "Udalosť", datum: z.datum });
    setPripomenute(true);
    toast(ok
      ? (z.datum ? "Pripomenieme ti deň udalosti 🔔" : "Pripomienka pridaná 🔔")
      : "Zapni upozornenia v prehliadači, nech ti to pripomenieme");
  }
  // sekundárne: pridať do systémového kalendára (.ics) — spoľahlivé aj pri zavretej appke
  const doKalendara = () => { if (z.datum) stiahniIcs({ id: z.id, nazov: z.nazov ?? "Udalosť", datum: z.datum, miesto: z.lok, popis: cistyText(z.pribeh ?? z.popis ?? "").slice(0, 200) }, toast); };
  const zdielajDetail = () => void zdielaj({ titul: z.nazov ?? "DEED+", text: `${z.nazov ?? ""} — ${z.komunita || z.cirkev}`, url: aktualnaUrl() }, toast);
  const [ozvat, setOzvat] = useState(false); // „Zapojiť sa" → správa farnosti
  const [nahlasit, setNahlasit] = useState(false); // vlajka → nahlásenie obsahu
  const [mazem, setMazem] = useState(false); // farárske mazanie — 2. ťuk potvrdí
  const [pridatZbierku, setPridatZbierku] = useState(false); // parte režim 2 — pripojenie pohrebnej zbierky
  const jeSplit = !!z.split; // pohreb/svadba
  // §11: Overujem/Namietam LEN na Help prípadoch jednotlivcov (núdza + riziko podvodu).
  const overitelne = !!z.overitelne;
  const badgeCol = z.ukat ? KAT_FARBA[z.ukat] : N.ind;

  // počítadlo aj zoznam darcov rastú z JEDNÉHO miesta (konzistentné čísla)
  const ja = usePouzivatel();
  const darRef = `naboz-${z.id}`;
  function podpor(hodnota: number, text: string) { setSuma((s) => s + hodnota * 0.01); setLudia((l) => l + 1); pridajDar({ refId: darRef, suma: hodnota * 0.01, kanal: "deed", registrovany: ja.typ !== "pasivny" }); toast(text); }
  function platbaHotova(s: number, volba?: VolbaDaru) { setSuma((x) => x + s * (platba === "DEED" ? 0.01 : 1)); setLudia((l) => l + 1); pridajDar({ refId: darRef, suma: s * (platba === "DEED" ? 0.01 : 1), kanal: platba === "EUR" ? "psp" : "deed", registrovany: ja.typ !== "pasivny", volba }); toast(`Odoslané ${platba === "EUR" ? s + " €" : platba === "EURC" ? s + " EURC" : s + " DeeD"} · ${z.nazov}`); }
  // §delta bod 2: kontextová reakcia-srdiečko (kondolencia / modlím sa / blahoželáme) — odvodené z typu
  const reakcia = reakciaToast(z);

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackHeader onBack={onBack} right={<><span {...pressable(zdielajDetail, "Zdieľať príspevok")} style={{ display: "flex", cursor: "pointer", position: "relative" }}><Zdielanie size={17} color={N.txt2} /></span><span {...pressable(() => setNahlasit(true), "Nahlásiť obsah")} style={{ display: "flex", cursor: "pointer", position: "relative" }}><IkonaVlajka size={16} color={N.txt2} /></span></>}>
        {z.badgeL && <span style={{ fontSize: 12, color: badgeCol, background: tint(badgeCol, .12), border: `1px solid ${tint(badgeCol, .38)}`, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, fontWeight: 700 }}>{z.badgeL}</span>}
        {z.lok && <span style={{ fontSize: 12, color: N.txt2 }}>📍 {z.lok}</span>}
      </BackHeader>
      <div style={{ height: SPACE.sm }} />

      {/* hero foto — LEN ak príspevok má fotku (bez placeholdera; inak čisto textový detail).
          Oznamy (bod 25): portrét aj landscape — obrázok CELÝ (contain), neoreže sa do pruhu. */}
      {maFoto && (
        <div style={{ padding: `0 ${SPACE.md}px` }}>
          {z.ntyp === "oznam" || z.plagat ? (
            <img src={fotky[0]} alt={z.nazov} onClick={() => otvorGaleriu(fotky, 0)}
              style={{ display: "block", width: "100%", height: "auto", maxHeight: z.plagat ? 640 : 420, objectFit: "contain", background: "#111", borderRadius: 14, cursor: "zoom-in" }} />
          ) : (
            <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : {}) }}>
              <Foto src={fotky[0]} emoji={z.emoji || "⛪"} h={wide ? "100%" : 200} w={wide ? "100%" : undefined} radius={14} onClick={() => otvorGaleriu(fotky, 0)} prednost alt={z.nazov} />
              <span style={{ ...badge({ top: 9, left: 9, color: "#fff" }), display: "inline-flex", alignItems: "center", gap: SPACE.xxs }}><IkonaFoto size={12} color="#fff" /> foto komunity</span>
            </div>
          )}
        </div>
      )}
      {!z.smutocny && <MiniFotky fotky={fotky} />}

      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px 0` }}>
        {/* hlavička = vydavateľ (farnosť) + overená → klik otvorí profil */}
        <div {...(f ? pressable(() => onProfil(f), "Otvoriť farnosť") : {})} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs, cursor: f ? "pointer" : "default" }}>
          {/* bod 20: farárova tvár v hlavičke (voliteľné) — osobný odkaz namiesto loga farnosti */}
          <span style={{ width: 40, height: 40, borderRadius: z.autorTvar ? "50%" : RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: tint(N.ind, .14), border: z.autorTvar ? `1px solid ${N.indEdge}` : "none" }}>{z.autorTvar ? "👤" : (z.emoji || "⛪")}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: SPACE.xs }}>{z.komunita || z.cirkev} {z.overena && <Overena />}</div>
            <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>📍 {z.lok || "Slovensko"} · registrovaná (MK SR){z.autorTvar ? " · hovorí farár osobne" : ""}</div>
          </div>
          {f && <span style={{ color: N.txt3, fontSize: 18, flex: "none" }}>›</span>}
        </div>

        <div style={{ fontSize: 17, fontWeight: 700, margin: `${SPACE.sm}px 0` }}>{z.nazov}</div>
        {z.smutocny ? (
          /* parte — šablóna zobrazuje všetko sama / obrázok celý na výšku (bez duplicitného panelu) */
          <div style={{ marginBottom: SPACE.gutter }}>
            <SmutocnyOznamBlok s={z.smutocny} onKondolencia={() => toast(reakcia)}
              onZvacsit={z.smutocny.imageUrl ? () => otvorGaleriu([z.smutocny!.imageUrl!], 0) : undefined} />
            {/* režim 2 (§0): farár pripojí pohrebnú zbierku AŽ na zverejnenom ozname */}
            {farar && !maCiel && jeVlastnyPrispevok(farnostIdOf(z), z.id) && (
              <div {...pressable(() => setPridatZbierku(true), "Pridať pohrebnú zbierku")}
                style={{ marginTop: SPACE.sm, border: `1px dashed ${N.greenEdge}`, background: N.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 13.5, fontWeight: 700, color: N.green, cursor: "pointer" }}>
                ➕ Pridať zbierku — pohrebná (samostatná entita, prepojí sa s oznamom)
              </div>
            )}
          </div>
        ) : (
          <FormatovanyText text={pribeh} style={{ fontSize: 14, lineHeight: 1.55, marginBottom: SPACE.gutter, color: N.txt2 }} />
        )}

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
          <div style={{ marginBottom: SPACE.gutter }}>
            <div style={{ display: "flex", gap: SPACE.sm }}>
              {maRsvp && (
                <div {...pressable(prepniRsvp, idem ? "Zrušiť účasť" : "Zúčastniť sa")} style={{ flex: 1, border: `2px solid ${N.greenEdge}`, background: idem ? tint("var(--a-green)", .18) : N.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 700, color: N.green, cursor: "pointer" }}>{idem ? "✓ Idem — zrušiť účasť" : "🗓 Zúčastním sa"}</div>
              )}
              <div {...pressable(prepniPripomen, pripomenute ? "Zrušiť pripomienku" : "Pripomenúť")} aria-pressed={pripomenute} style={{ flex: maRsvp ? "none" : 1, minWidth: 120, border: `1px solid ${N.indEdge}`, background: pripomenute ? tint(N.ind, .2) : N.indBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 700, color: N.ind, cursor: "pointer" }}>{pripomenute ? "🔔 Pripomenieme ti ✓" : "🔔 Pripomeň"}</div>
            </div>
            {z.datum && (
              <div style={{ textAlign: "center", marginTop: SPACE.xs }}>
                <span {...pressable(doKalendara, "Pridať do systémového kalendára")} style={{ fontSize: 11.5, fontWeight: 700, color: N.txt3, cursor: "pointer" }}>📅 pridať aj do kalendára (.ics)</span>
              </div>
            )}
          </div>
        )}

        {maCiel ? (
          <>
            <div style={{ marginBottom: SPACE.gutter }}>
              <ProgresBox suma={suma} ciel={cielLocal!} ludia={ludia} />
            </div>

            <div style={{ marginBottom: SPACE.gutter }}>
              <PlatobnyModul zbalene
                onShare={zdielajDetail}
                upvotes={ludia} onUpvote={() => toast(reakcia)} reakcia="srdce"
                onPodpor={(s: number) => podpor(s, `Ďakujeme za ${s} DeeD pre ${z.nazov}`)}
                onKanal={(k: string) => setPlatba(k as Kanal)} accent={N.ind}
                supLabel={z.ukat === "pohreb" ? "PRISPIEŤ — pohrebná zbierka (predĺžené okno ~týždeň)" : "PRISPIEŤ — klik a hneď odíde"}
                oblubene={{ refId: z.id, typ: z.ntyp ?? "zbierka", modul: "nabozenstvo", nazov: z.nazov ?? "Zbierka", lok: z.lok, ciel: cielLocal ?? undefined, vyzbierane: suma }} toast={toast}
                qr={{ label: "QR tejto zbierky", onClick: () => setQr(true) }}
                {/* Split QR pri pohrebe/svadbe nastavuje LEN farár (rodine ↔ kostolu) */
                ...(jeSplit && farar ? { retaz: { label: "Rozdeliť dar (QR reťaze)", popis: "Rodine ↔ kostolu — % sa zafixujú pri vzniku", onClick: () => setSplit(true) } } : {})} />
            </div>

            {/* zoznam darcov — až pod pravidelnou podporou / reťazou dobra */}
            <div style={{ marginBottom: SPACE.gutter }}>
              <ZoznamDarcov refId={darRef} celkom={ludia} />
            </div>

            <div style={{ fontSize: 11, color: N.txt3, textAlign: "center", background: N.goldBg, border: `1px solid ${N.goldEdge}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
              🏛 Platby, overenie a transparentnosť zabezpečuje modul Charita. Pravosť prípadu potvrdzuje komunita.
            </div>
          </>
        ) : (
          <div style={{ marginBottom: SPACE.gutter }}>
            {z.ntyp === "dobrovolnictvo" && (
              <div {...pressable(() => setOzvat(true), "Zapojiť sa — napísať farnosti")} style={{ width: "100%", border: `2px solid ${N.greenEdge}`, background: N.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 15, fontWeight: 700, color: N.green, cursor: "pointer", marginBottom: SPACE.sm, boxSizing: "border-box" }}>
                🙌 Zapojiť sa
              </div>
            )}
            {/* §12: oznam/dobrovoľníctvo bez napojenej zbierky → LEN srdiečko + zdieľať. */}
            <PlatobnyModul zbalene
              onShare={zdielajDetail}
              upvotes={ludia} onUpvote={() => toast(reakcia)} reakcia="srdce" bezDaru
              onPodpor={() => {}} onKanal={() => {}} accent={N.ind}
              oblubene={{ refId: z.id, typ: z.ntyp ?? "oznam", modul: "nabozenstvo", nazov: z.nazov ?? "Oznam", lok: z.lok }} toast={toast} />
            {z.ntyp === "oznam" && <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", marginTop: SPACE.sm }}>Bez zbierky — len srdiečko a zdieľať. „Prispieť" sa objaví len ak je oznam napojený na zbierku (napr. úmrtie → pohrebná zbierka). Žiadne komentáre (železné pravidlo).</div>}
          </div>
        )}

        {/* mazanie cez farára — auto-publish poistka („farár môže zmazať"); len na
            publikované príspevky veriacich/farára (demo obsah z mocku sa mazať nedá) */}
        {farar && jeVlastnyPrispevok(farnostIdOf(z), z.id) && (
          <div {...pressable(() => {
            if (!mazem) { setMazem(true); return; }
            zmazPrispevok(farnostIdOf(z), z.id);
            toast("Oznam zmazaný — veriaci dostane upozornenie");
            onBack();
          }, mazem ? "Naozaj zmazať" : "Zmazať príspevok (farár)")}
            style={{ marginTop: SPACE.gutter, border: "1px solid color-mix(in srgb, var(--a-danger) 45%, transparent)", background: mazem ? "color-mix(in srgb, var(--a-danger) 14%, transparent)" : "transparent", borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 700, color: "var(--a-danger)", cursor: "pointer" }}>
            {mazem ? "⚠ Naozaj zmazať? Ťukni ešte raz" : "🗑 Zmazať príspevok (farár)"}
          </div>
        )}
      </div>

      {platba && <PlatbaModal kanal={platba} komu={z.nazov || ""} onClose={() => setPlatba(null)} onDone={platbaHotova} />}
      {/* QR zbierky (§10) — sken otvorí darovanie, dá sa vytlačiť aj zdieľať */}
      {qr && <QrModal typ="platba" titul={`QR · ${z.nazov ?? "Zbierka"}`} popis={(z.komunita || z.cirkev || "").slice(0, 38)}
        qrCiel={{ druh: "case", ref: String(z.id), modul: "nabozenstvo" }} onClose={() => setQr(false)} toast={toast} />}
      {split && <SplitQrSheet titul={z.nazov || "Zbierka"} caseId={null} zdroj="autor"
        variant={farskySplitVariant(z.ukat === "svadba" ? "svadba" : "pohreb")}
        onClose={() => setSplit(false)} toast={toast} />}

      {/* „Zapojiť sa" — súkromná správa farnosti (mock uloženie) */}
      {ozvat && <OzvatSaSheet komu={z.komunita || z.cirkev} refId={z.id} modul="nabozenstvo" onClose={() => setOzvat(false)} toast={toast} />}

      {/* vlajka — nahlásenie obsahu (§11: nahlásiť, nie hlasovať) */}
      {nahlasit && <NahlasitSheet co={z.nazov ?? "Príspevok"} refId={z.id} modul="nabozenstvo" onClose={() => setNahlasit(false)} toast={toast} />}

      {/* parte režim 2 — pripojenie pohrebnej zbierky (samostatná entita, linkuje sa) */}
      {pridatZbierku && (
        <PridatZbierkuSheet tvorca={z.overena ? null : z.komunita || null}
          onClose={() => setPridatZbierku(false)}
          onHotovo={(ciel) => {
            upravPrispevok(farnostIdOf(z), z.id, { ciel, vyzbierane: 0, linkedZbierka: true });
            setCielLocal(ciel);
            setPridatZbierku(false);
            toast("Pohrebná zbierka pripojená — na ozname pribudlo Prispieť 🕯");
          }} />
      )}
    </div>
  );
}

// ============================================================
// PRIDAŤ ZBIERKU na parte (režim 2, §0): zbierka = samostatná entita, s oznamom
// sa len prepojí. Príjemca: user-parte → predvyplnený tvorca oznamu (KYC ✓);
// farárske parte → jednorazový 6-miestny kód od príjemcu (delta bod 30 —
// PC-friendly, bez kamery; žiadna knižnica QR).
// ============================================================
function PridatZbierkuSheet({ tvorca, onClose, onHotovo }: { tvorca: string | null; onClose: () => void; onHotovo: (ciel: number) => void }) {
  const [ciel, setCiel] = useState("500");
  const [kod, setKod] = useState("");
  const kodOk = tvorca != null || kod.replace(/\D/g, "").length === 6;
  const cielNum = Math.max(1, +ciel || 0);
  return (
    <SheetPanel title="Pridať zbierku — pohrebná" onClose={onClose}>
      <div style={{ fontSize: 12, color: N.txt3, lineHeight: 1.5, marginBottom: SPACE.md }}>
        Zbierka je <b>samostatná entita</b> v sekcii Zbierky (vlastný QR, vlastný TTL) — s oznamom sa len prepojí a zobrazí spolu. Peniaze idú <b>registrovanému príjemcovi</b> po obojstrannom potvrdení.
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `0 0 ${SPACE.xxs}px` }}>PRÍJEMCA</div>
      {tvorca ? (
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.greenEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
          <span style={{ width: 34, height: 34, borderRadius: "50%", background: N.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flex: "none" }}>👤</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{tvorca}</div>
            <div style={{ fontSize: 11, color: N.green, fontWeight: 700 }}>tvorca oznamu · KYC ✓ · predvyplnené</div>
          </div>
        </div>
      ) : (<>
        <Input value={kod} onChange={(v: string) => setKod(v.replace(/\D/g, "").slice(0, 6))} placeholder="6-miestny kód od príjemcu (napr. 482 913)" />
        <div style={{ fontSize: 11, color: N.txt3, lineHeight: 1.45, marginTop: SPACE.xxs }}>
          Príjemca si v appke vygeneruje jednorazový kód („Pripojiť ma k zbierke", platí ~15 min). Napíš ho — bez kamery; sken QR je len skratka. Potvrdíš jedného kandidáta (meno + foto + KYC ✓), jemu padne notifikácia — bez potvrdenia oboch strán zbierka nebeží.
        </div>
        {kodOk && (
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.greenEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginTop: SPACE.sm }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: N.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flex: "none" }}>👤</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Mária Kováčová</div>
              <div style={{ fontSize: 11, color: N.green, fontWeight: 700 }}>kandidát podľa kódu · KYC ✓</div>
            </div>
          </div>
        )}
      </>)}
      <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>CIEĽ ZBIERKY (€)</div>
      <div style={{ width: 130 }}><Input value={ciel} onChange={setCiel} type="number" placeholder="500" /></div>
      <div style={{ fontSize: 11, color: N.txt3, lineHeight: 1.45, marginTop: SPACE.xs }}>
        Jeden príjemca → celé jemu (bez bežca). Kostolný podiel = dobrovoľný dar rodiny — bežec sa objaví až pridaním 2. príjemcu.
      </div>
      <button onClick={() => kodOk && onHotovo(cielNum)} disabled={!kodOk}
        style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: kodOk ? N.green : N.card, color: kodOk ? "#fff" : N.txt3, fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: kodOk ? "pointer" : "not-allowed" }}>
        Prepojiť a spustiť zbierku
      </button>
    </SheetPanel>
  );
}
function badge({ top, left, color }: { top?: number; left?: number; color?: string }): React.CSSProperties {
  return { position: "absolute", top, left, fontSize: 10.5, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, fontWeight: 800, color: color || "#fff", background: "rgba(8,11,18,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 2px 8px rgba(0,0,0,.25)", pointerEvents: "none" };
}
