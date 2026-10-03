import { Emo } from "@/components/icons";
import { DeedZnacka } from "@/components/DeedZnacka";
import { TESTOVACIA } from "@/lib/testovacia";
import { StityRad } from "@/components/stit";
import { stityOblastiSubjektu } from "@/lib/stityOblasti";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { C, SPACE, RADIUS, SIRKA } from "@/theme";
import {
  BackHeader, Sheet, SegTabs, Switch, MoniBar, Stit, naStitLevel, Tip, tint,
  useLayout, obalSiroky,
  EntityHero, BtnAkcia, BtnIkonka, KontextMenu, MenuSkupina, MenuHlavicka, MenuPolozka,
  Zdielanie, IkonaCeruzka, IkonaMoznosti, IkonaTerc, IkonaEuro, IkonaLudia, IkonaOsoba, IkonaKalendar,
  IkonaQr, IkonaDokument, IkonaKorunka, IkonaInstitucia, IkonaOdkaz, IkonaOko, IkonaGraf, IkonaRetaz,
  IkonaMegafon, IkonaHodiny, IkonaPenazenka, IkonaPohar, IkonaStit, IkonaHviezda, IkonaDarcek, IkonaPin,
  IkonaSrdceLine, IkonaNastavenia,
} from "@/shared";
import { pressable } from "@/components/pressable";
import { usePouzivatel } from "@/lib/pouzivatel";
import { klucEntity, useFotkyEntity } from "@/lib/fotoentity";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import { MojaRetaz } from "@/features/retaz/MojaRetaz";
import {
  FLAGS, KONFIG, POZICIE, TIER_LABEL, TIER_POPIS, ROLA_UCTU,
  nacitajPoziciu, ulozPoziciu, nacitajTiery, ulozTiery, nacitajDrzitel, ulozDrzitel,
  nacitajTerminal, ulozTerminal,
  nacitajOrgExtra, ulozOrgExtra, nacitajLogo, ulozLogo, nacitajOnas, ulozOnas, nacitajTvarLoga, ulozTvarLoga, nacitajZdrojAvatara, ulozZdrojAvatara, nacitajHlavuZbalenu, ulozHlavuZbalenu, nacitajCentralnu,
  type Pozicia, type Tier,
} from "./stav";
import { PANELY, SPRAVY, SPRAVA_NADPIS, SEKCIE_SPRAVY, ZASLUZENA, SUBJEKTY, FIRMY_ADRESAR, type PanelBlok, type SpravaItem, type OrgZbierka } from "./mock";
import { Podstranka } from "./Podstranka";
import { UpravProfilSheet } from "./UpravProfil";
import { useRegistraciaCharity, ulozDoRegistracie } from "./registracia";
import { OnasKratky } from "./OnasKratky";
import { jeNeregistrovany, nastavNeregistrovany, darujemAkoFirma, nastavDarcuFirmu } from "@/lib/devDarca";
import { rezimModulu, nastavRezimModulu } from "@/lib/testProfily";
import { CentralnaZbierkaSheet } from "./CentralnaZbierka";
import { SpravaZbierkySheet } from "./SpravaZbierky";
import { VideoSheet, DarcoviaSheet, QrNastrojeSheet, ViditelnostSheet } from "./NastrojeCharity";
import { SektoroveZbierkySheet } from "./SektoroveZbierky";
import { OznamySprava } from "./NovyOznam";
import { createPortal } from "react-dom";
import { InzeratySheet } from "./Inzeraty";
import { DorovnanieSheet } from "./Dorovnanie";
import { PocitadloVyberSheet } from "@/features/overlay/PocitadloVyber";
import { VyzvySheet } from "./Vyzvy";
import { NaseZbierkySheet } from "./NaseZbierky";
import { ZamestnanciSheet } from "./Zamestnanci";
import { useDorovnania, casAutomatu } from "@/lib/dorovnanie";
import { ZBIERKY, predvolenyStav } from "@/lib/zbierky";
import { nacitajStav, percentoDolozenia, fazaDokladovania, useZmenySpravy } from "@/lib/zbierkaSprava";
import { KontaktBlok, nacitajKontakt, ulozKontakt } from "./kontakt";
import { verejneTaby, zamknuteTaby, popisTabu, BLOK_ZA_TAB, zbierkyOrg, cislaSubjektu } from "./obsah";

/*
  ============================================================
  MÔJ DEED FIREMNÝ — entity obrazovka rolí (Charita · Tvorca · B2B).
  Vzor business profilov: hero subjektu s akciami → prehľad → verejný
  obsah → správa (len držiteľ) → kontakt. Jeden skelet, rolový data-feed.
  Štít sa zobrazuje VÝLUČNE ako štít + text (žiadny progres/percentá).
  Zamknuté bloky neukazujú reálne dáta. DEV prepínače len za flagmi.
  ============================================================
*/

type PaywallReq = { tierMin: Tier; nazov: string; dovod?: string };
type OtvorenySheet = null | "zbierky" | "centralna" | "terminal" | "retaz" | "profil" | "adresarB2B" | { spravovat: OrgZbierka } | "video" | "darcovia" | "qr" | "sumy" | "segment" | "oznamy" | "inzeraty" | "dorovnanie" | "zamestnanci" | "pocitadlo" | "vyzvy";

// ---- SVG ikony blokov a správy (nahrádzajú emoji — jednotný vizuál) ----
const IKONY: Record<string, ReactNode> = {
  zbierky: <IkonaTerc size={17} />, dnes: <IkonaEuro size={17} />, dobrovolnici: <IkonaLudia size={17} />,
  sledujuci: <IkonaOsoba size={17} />, nastenka: <IkonaKalendar size={17} />,
  retaz: <IkonaRetaz size={17} />, vplyv: <IkonaGraf size={17} />, podporovatelia: <IkonaSrdceLine size={17} />,
  akcie: <IkonaKalendar size={17} />, oznamy: <IkonaMegafon size={17} />,
  rebricek: <IkonaPohar size={17} />, ludia: <IkonaLudia size={17} />, sponzoring: <IkonaStit size={17} />,
  ucet: <IkonaHviezda size={17} />,
  profil: <IkonaCeruzka size={16} />, podstranka: <IkonaCeruzka size={16} />, dokladovanie: <IkonaDokument size={17} />,
  darcovia: <IkonaKorunka size={17} />, kalendar: <IkonaKalendar size={17} />, qr: <IkonaQr size={17} />,
  qr2: <IkonaHodiny size={17} />, firmy: <IkonaInstitucia size={17} />, embed: <IkonaOdkaz size={17} />,
  sumy: <IkonaOko size={17} />, reporty: <IkonaGraf size={17} />, terminal: <IkonaPenazenka size={17} />,
  smena: <IkonaHodiny size={17} />, statistiky: <IkonaGraf size={17} />, zamestnanci: <IkonaLudia size={17} />,
  akcia: <IkonaKalendar size={17} />, vto: <IkonaHodiny size={17} />, esg: <IkonaGraf size={17} />,
  odmeny: <IkonaDarcek size={17} />,
};
const ikonaPre = (id: string, fallback: string): ReactNode => IKONY[id] ?? <span style={{ fontSize: 16 }}><Emo e={fallback} /></span>;

/** Prihlásená charita sa najprv načíta z databázy (údaje z registrácie), potom sa ukáže správa. */
export function MojDeedFiremny({ onBack, toast }: { onBack: () => void; toast: (m: string) => void }) {
  const { pripravene, orgId } = useRegistraciaCharity();
  if (!pripravene) {
    return (
      <div>
        <BackHeader onBack={onBack} title={<>Môj <DeedZnacka /> firemný</>} />
        <div style={{ padding: "48px 0", textAlign: "center", color: C.textTer, fontSize: 14 }}>Načítavam údaje organizácie…</div>
      </div>
    );
  }
  return <MojDeedFiremnyObsah onBack={onBack} toast={toast} orgId={orgId} />;
}

function MojDeedFiremnyObsah({ onBack, toast, orgId }: { onBack: () => void; toast: (m: string) => void; orgId: string | null }) {
  const { desktop } = useLayout();
  const ja = usePouzivatel(); // tvorca vystupuje pod vlastnou profilovou fotkou (nie logom)
  // rola + tier per rola — DEV: lokálny stav; produkcia: overený účet + fakturácia
  const [pozicia, setPozicia] = useState<Pozicia>(nacitajPoziciu);
  const [tiery, setTiery] = useState<Record<Pozicia, Tier>>(nacitajTiery);
  const [drzitel, setDrzitel] = useState<boolean>(nacitajDrzitel);
  const [logo, setLogo] = useState<string | null>(() => nacitajLogo(nacitajPoziciu()));
  const [tvarLoga, setTvarLoga] = useState(() => nacitajTvarLoga(nacitajPoziciu()));
  const [zdrojAvatara, setZdrojAvatara] = useState(() => nacitajZdrojAvatara(nacitajPoziciu()));
  const [onas, setOnas] = useState<string | null>(() => nacitajOnas(nacitajPoziciu()));
  const [kontakt, setKontakt] = useState(() => nacitajKontakt(nacitajPoziciu()));
  const [zbalena, setZbalena] = useState(nacitajHlavuZbalenu);
  const prepniHlavu = () => setZbalena((z) => { ulozHlavuZbalenu(!z); return !z; });
  const [paywall, setPaywall] = useState<PaywallReq | null>(null);
  const [sheet, setSheet] = useState<OtvorenySheet>(null);
  const [menu, setMenu] = useState(false);
  const [podstranka, setPodstranka] = useState(false);

  // titulná (cover) fotka subjektu — per rola, oddelene od loga/profilovky
  const [fotky, zmenFotky] = useFotkyEntity(klucEntity("rola", pozicia));

  const tier = tiery[pozicia];
  const prepniPoziciu = (p: Pozicia) => { setPozicia(p); ulozPoziciu(p); setLogo(nacitajLogo(p)); setTvarLoga(nacitajTvarLoga(p)); setZdrojAvatara(nacitajZdrojAvatara(p)); setOnas(nacitajOnas(p)); setKontakt(nacitajKontakt(p)); };
  const nastavTier = (t: Tier) => { const n = { ...tiery, [pozicia]: t }; setTiery(n); ulozTiery(n); };
  const prepniDrzitela = () => { setDrzitel((d) => { ulozDrzitel(!d); return !d; }); };

  // Viditeľnosť nástrojov: vlastné + najviac 2 programy nad sebou (zamknuté).
  // Vyššie sa nezobrazujú vôbec — ZADARMO nevidí nástroje z T3/T4, T1 nevidí T4 atď.
  // firemné peniaze už ležia na účte charity a čakajú len na klik — nech to v správe kričí
  const cakajuceDorovnania = useDorovnania(pozicia).filter((d) => d.stav === "zapecatene");
  const viditelny = (tierMin: Tier) => tierMin <= tier + 2;
  const bloky = PANELY[pozicia].filter((b) => viditelny(b.tierMin));
  // odomknuté nástroje navrch, zamknuté pod ne zoradené podľa programu (najprv T1, potom T2)
  const sprava = SPRAVY[pozicia].filter((it) => it.povinne || viditelny(it.tierMin))
    .map((it, i) => ({ it, i, z: !it.povinne && tier < it.tierMin ? it.tierMin : -1 }))
    .sort((a, b) => a.z - b.z || a.i - b.i).map((x) => x.it);
  // „Začni tu": charita od T1 začína centrálnou zbierkou (hore) a hneď pod ňou sú sektory,
  // lebo patria k sebe — v ZADARMO je navrchu zbierka pre niekoho
  const hore = pozicia === "charita" ? (tier >= 1 ? ["centralna", "segment"] : ["zbierky"]) : [];
  const startId = hore[0] ?? null;  // „Začni tu" ostáva len na prvej položke
  const spravaZoradena = hore.length
    ? [...hore.map((id) => sprava.find((it) => it.id === id)).filter((it): it is SpravaItem => !!it), ...sprava.filter((it) => !hore.includes(it.id))]
    : sprava;
  // nástroje sa triedia do sekcií (Zbierky · Oznamy a obsah · …), nech sa 17 položiek dá nájsť
  // očami; rola bez sekcií (tvorca, B2B) ostáva jedným blokom ako doteraz
  const spravaVSekciach: { nazov: string | null; polozky: SpravaItem[] }[] = spravaZoradena.some((it) => it.sekcia)
    ? SEKCIE_SPRAVY.map((sek) => ({ nazov: sek.nazov as string, polozky: spravaZoradena.filter((it) => it.sekcia === sek.id) }))
        .filter((sek) => sek.polozky.length > 0)
        .concat(spravaZoradena.some((it) => !it.sekcia)
          ? [{ nazov: "ĎALŠIE", polozky: spravaZoradena.filter((it) => !it.sekcia) }] : [])
    : [{ nazov: null, polozky: spravaZoradena }];

  const rolaMeta = POZICIE.find((p) => p.key === pozicia)!;
  const subjekt = SUBJEKTY[pozicia];
  const stit = naStitLevel(ZASLUZENA[pozicia].badge);

  // gate na úrovni akcie: pod tierom → vysvetľujúci paywall
  const gateTier = (tierMin: Tier, nazov: string, akcia: () => void, dovod?: string) => () => {
    if (tier >= tierMin) akcia();
    else setPaywall({ tierMin, nazov, dovod });
  };

  const blokAkcia = (b: PanelBlok) => {
    if (pozicia === "charita" && b.id === "zbierky") return setSheet("zbierky");
    if (pozicia === "charita" && b.id === "centralna") return setSheet("centralna");
    if (pozicia === "tvorca" && b.id === "retaz") return setSheet("retaz");
    setSheet(null); toast(`${b.nazov} — detail`);
  };

  const spravaAkcia = (it: SpravaItem) => {
    if (it.id === "profil" || it.id === "podstranka") return setSheet("profil");
    if (pozicia === "charita" && (it.id === "zbierky" || it.id === "dokladovanie")) return setSheet("zbierky");
    if (pozicia === "tvorca" && it.id === "terminal") return setSheet("terminal");
    if (pozicia === "charita" && it.id === "centralna") return setSheet("centralna");
    if (pozicia === "b2b" && (it.id === "zbierky" || it.id === "zamestnanci")) return setSheet(it.id);
    if (pozicia === "tvorca" && (it.id === "pocitadlo" || it.id === "vyzvy")) return setSheet(it.id);
    if (pozicia === "charita" && (it.id === "video" || it.id === "darcovia" || it.id === "qr" || it.id === "sumy" || it.id === "segment" || it.id === "oznamy" || it.id === "inzeraty" || it.id === "dorovnanie")) return setSheet(it.id);
    toast(`${it.nazov} — čoskoro`);
  };

  // avatar subjektu: charita/B2B = nahraté logo · tvorca = moja profilová fotka
  const fotoOsoby = pozicia === "tvorca" && zdrojAvatara === "foto"; // tvorca: fotka alebo logo značky
  const avatarSrc = (fotoOsoby ? ja.foto : logo) ?? subjekt.foto;
  const coverSrc = fotky.cover ?? subjekt.cover;

  // vlastník vidí TÚ ISTÚ verejnú stránku ako cudzí
  if (podstranka) return <Podstranka pozicia={pozicia} tier={tier} logo={logo} toast={toast} onBack={() => setPodstranka(false)} />;

  const telo = (
    <div style={{ padding: `${SPACE.sm}px ${SPACE.md}px 0` }}>
      {/* ---- DEV panel — simulácia roly/tieru/držiteľa (OPRAVY 81: vrátený; aj pod Moje stránky v profile) ---- */}
      {TESTOVACIA && (FLAGS.dev_role_switcher || FLAGS.dev_tier_switcher) && (
        <DevPanel pozicia={pozicia} tier={tier} drzitel={drzitel}
          onPozicia={prepniPoziciu} onTier={nastavTier} onDrzitel={prepniDrzitela} />
      )}

      {/* ==== HERO SUBJEKTU — cover, logo, meno + odznak, štatistiky, akcie ==== */}
      {zbalena ? (
        // zmenšená hlavička — na mobile nezaberá miesto pri práci s nástrojmi
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.sm }}>
          <span style={{ width: 44, height: 44, flex: "none", overflow: "hidden", borderRadius: !fotoOsoby && tvarLoga === "stvorec" ? RADIUS.sm : "50%", background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
            {avatarSrc ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : subjekt.iniciacky}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.2 }}>{subjekt.nazov}</div>
            <div {...pressable(prepniHlavu, "Rozbaliť profil")} style={{ fontSize: 12, fontWeight: 700, color: "var(--a-info)", cursor: "pointer", marginTop: 2 }}>Rozbaliť profil ▼</div>
          </div>
          <BtnIkonka label="Verejný profil" onClick={() => setPodstranka(true)}><span style={{ fontSize: 15 }}>👁</span></BtnIkonka>
          <BtnIkonka label="Upraviť profil" onClick={() => setSheet("profil")}><IkonaCeruzka size={15} /></BtnIkonka>
          <Stit level={stit} size={36} />
        </div>
      ) : (<>
      <EntityHero avatarTvar={fotoOsoby ? "kruh" : tvarLoga}
        avatar={avatarSrc
          ? <img src={avatarSrc} alt={subjekt.nazov} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : (pozicia === "tvorca" ? subjekt.iniciacky : subjekt.iniciacky)}
        cover={coverSrc}
        coverEl={<span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, opacity: .4 }}><Emo e={subjekt.emoji} /></span>}
        meno={subjekt.nazov} overene={subjekt.overena} overeneLabel="Overený subjekt — identita potvrdená"
        podtitul={<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IkonaPin size={11} color={C.textTer} /> {subjekt.lok} · {rolaMeta.label}</span>}
        vpravo={<StityRad variant="hlavicka" hlavny={stit} oblasti={stityOblastiSubjektu(subjekt.nazov, stit)} meno={subjekt.nazov} velkost={desktop ? 96 : 76} />}
        podMenom={<OnasKratky text={onas ?? subjekt.onas} />}
        stats={cislaSubjektu(pozicia, tier).map(([hodnota, label], i) => ({ hodnota, label, farba: i === 2 ? "var(--a-gold)" : undefined }))}
        akcie={<>
          <BtnAkcia variant="secondary" onClick={() => setPodstranka(true)}>Verejný profil · DEV</BtnAkcia>
          <BtnAkcia variant="secondary" onClick={() => setSheet("profil")}><IkonaCeruzka size={14} /> Upraviť profil</BtnAkcia>
          <BtnIkonka label="Ďalšie možnosti" onClick={() => setMenu(true)}><IkonaMoznosti size={16} /></BtnIkonka>
        </>}
      />
      <div {...pressable(prepniHlavu, "Zmenšiť profil")}
        style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: C.textTer, paddingTop: SPACE.xs, cursor: "pointer" }}>Zmenšiť profil ▲</div>
      </>)}
      <div style={{ height: SPACE.gutter }} />

      {/* ==== PREHĽAD PROFILU — obsah verejného profilu (ten istý výpočet ako profil) + živé čísla ==== */}
      <MenuSkupina zbalitelna="rola-prehlad" nadpis="PREHĽAD PROFILU">
        {(() => {
          // poradie: čo program má (obsah profilu, potom živé čísla) → zamknuté na spodku podľa programu
          const riadky: { k: string; tier: number; el: (posledna: boolean) => ReactNode }[] = [];
          // poradie zhora: Centrálna zbierka (od T1) → Zbierky → Ukončené zbierky → ostatné
          const centralnyBlok = pozicia === "charita" ? bloky.find((b) => b.id === "centralna" && tier >= b.tierMin) : undefined;
          if (centralnyBlok) riadky.push({ k: "centralna", tier: -1, el: (posledna) => (
            <MenuPolozka key="centralna" posledna={posledna} ikona={ikonaPre(centralnyBlok.id, centralnyBlok.emoji)} farba="var(--a-info)"
              label={centralnyBlok.nazov} popis={nacitajCentralnu("charita") ? centralnyBlok.popis : "Zatiaľ nespustená · hotová za minútu"}
              hodnota={centralnyBlok.hodnota} onClick={() => blokAkcia(centralnyBlok)} />
          ) });
          // Video má vlastný nástroj v SPRÁVE (zoznam aj správa videí) — v prehľade by bol dvakrát
          verejneTaby(pozicia, tier).filter((t) => !(pozicia === "charita" && t.key === "video")).forEach((t) => {
            const blok = PANELY[pozicia].find((b) => b.id === BLOK_ZA_TAB[t.key]);
            riadky.push({ k: `tab-${t.key}`, tier: -1, el: (posledna) => (
              <MenuPolozka key={`tab-${t.key}`} posledna={posledna}
                ikona={<span style={{ fontSize: 15 }}><Emo e={t.polozky[0]?.emoji ?? "dokument"} /></span>} farba="var(--a-plum)"
                label={t.label} popis={popisTabu(t)} hodnota={String(t.polozky.length)}
                onClick={() => (blok ? blokAkcia(blok) : setPodstranka(true))} />
            ) });
          });
          bloky.filter((b) => !Object.values(BLOK_ZA_TAB).includes(b.id) && tier >= b.tierMin && b.id !== centralnyBlok?.id).forEach((b) => {
            riadky.push({ k: b.id, tier: -1, el: (posledna) => (
              <MenuPolozka key={b.id} posledna={posledna} ikona={ikonaPre(b.id, b.emoji)} farba="var(--a-info)"
                label={b.nazov} popis={pozicia === "charita" && b.id === "dnes" ? <DnesPrislo />
                  : b.id === "centralna" && !nacitajCentralnu("charita") ? "Zatiaľ nespustená · hotová za minútu" : b.popis} hodnota={b.hodnota}
                onClick={b.info ? undefined : () => blokAkcia(b)} />
            ) });
          });
          if (pozicia === "b2b") riadky.push({ k: "adresar", tier: -1, el: (posledna) => (
            <MenuPolozka key="adresar" posledna={posledna} ikona={<IkonaInstitucia size={17} />} farba="var(--a-info)"
              label="Adresár firiem" popis="Overené firmy a ich podpora komunity" onClick={() => setSheet("adresarB2B")} />
          ) });
          const zamk = [
            ...zamknuteTaby(pozicia, tier).map((t) => ({ k: `tab-${t.key}`, t: t.odTieru ?? 0, emoji: t.polozky[0]?.emoji ?? "dokument", nazov: t.label, ikona: null as ReactNode })),
            ...bloky.filter((b) => !Object.values(BLOK_ZA_TAB).includes(b.id) && tier < b.tierMin)
              .map((b) => ({ k: b.id, t: b.tierMin as number, emoji: b.emoji, nazov: b.nazov, ikona: ikonaPre(b.id, b.emoji) })),
          ].sort((a, b) => a.t - b.t);
          zamk.forEach((z) => riadky.push({ k: z.k, tier: z.t, el: (posledna) => (
            <MenuPolozka key={z.k} posledna={posledna} zamknute farba="var(--c-textTer)"
              ikona={z.ikona ?? <span style={{ fontSize: 15, opacity: .5 }}><Emo e={z.emoji} /></span>}
              label={z.nazov} chip={<TierChip label={`od ${TIER_LABEL[pozicia][z.t as Tier]}`} />}
              popis={`Dostupné od úrovne ${TIER_LABEL[pozicia][z.t as Tier]}`}
              onClick={gateTier(z.t as Tier, z.nazov, () => undefined)} />
          ) }));
          return riadky.map((r, i) => r.el(i === riadky.length - 1));
        })()}
      </MenuSkupina>


      {/* ==== SPRÁVA — vidí len držiteľ roly a delegovaní správcovia ==== */}
      {drzitel && (
        <MenuSkupina zbalitelna="rola-sprava"
          hlavicka={<MenuHlavicka ikona={<IkonaNastavenia size={15} />} label={SPRAVA_NADPIS[pozicia]}
            popis="Nástroje správcu — vidí len držiteľ roly a delegovaní správcovia" />}
        >
          {spravaVSekciach.map(({ nazov, polozky }) => (
            <Fragment key={nazov ?? "bez"}>
              {nazov && (
                <div style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px 4px`, fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, borderTop: `1px solid ${C.line}` }}>{nazov}</div>
              )}
              {polozky.map((it, i) => {
            const zamknute = !it.povinne && tier < it.tierMin;
            return (
              <MenuPolozka key={it.id}
                ikona={it.id === startId ? <span style={{ fontSize: 17 }}><Emo e="start" /></span> : ikonaPre(it.id, it.emoji)}
                farba={it.povinne ? "var(--a-green)" : "var(--a-info)"}
                label={it.nazov}
                chip={it.id === startId
                  ? <span style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", background: "var(--a-green)", borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px`, flex: "none" }}>🚀 Začni tu</span>
                  : it.id === "dorovnanie" && cakajuceDorovnania.length > 0
                  ? <span style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", background: "var(--a-clay)", borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px`, flex: "none" }}>
                      ⚠ Potvrdiť {cakajuceDorovnania.length > 1 ? `(${cakajuceDorovnania.length})` : ""}
                    </span>
                  : it.povinne
                  ? <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--a-green)", background: tint("var(--a-green)", .14), borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px`, flex: "none" }}>Povinné</span>
                  : zamknute ? <TierChip label={`od ${TIER_LABEL[pozicia][it.tierMin]}`} /> : undefined}
                popis={it.id === "dorovnanie" && cakajuceDorovnania[0]
                  ? `Firma ${cakajuceDorovnania[0].firma} uhradila ${cakajuceDorovnania.length > 1 ? "dorovnania" : "dorovnanie"} — potvrďte príjem na účte. Ak nepotvrdíte, spustí sa samo ${casAutomatu(cakajuceDorovnania[0])}.`
                  : it.popis}
                zamknute={zamknute}
                onClick={it.povinne ? () => spravaAkcia(it) : gateTier(it.tierMin, it.nazov, () => spravaAkcia(it))}
                posledna={i === polozky.length - 1}
              />
            );
              })}
            </Fragment>
          ))}
        </MenuSkupina>
      )}

      {/* ==== VÝSLEDOK — klient si po úpravách pozrie, ako profil vidí návštevník ==== */}
      <BtnAkcia variant="primary" style={{ width: "100%", marginBottom: SPACE.gutter }} onClick={() => setPodstranka(true)}>
        Zobraziť verejný profil
      </BtnAkcia>

      {/* ==== KONTAKT ==== */}
      <KontaktBlok k={kontakt} zbalitelna="rola-kontakt" />
    </div>
  );

  return (
    <div style={{ paddingBottom: SPACE.lg, color: C.text }}>
      <BackHeader onBack={onBack} title={<>Môj <DeedZnacka /> firemný</>} />
      {obalSiroky(telo, { desktop, maxDesktop: SIRKA.citanie })}

      {/* ---- ⋯ menu subjektu ---- */}
      {menu && (
        <KontextMenu onClose={() => setMenu(false)} polozky={[
          { ikona: <Zdielanie size={17} />, label: "Zdieľať profil", onClick: () => void zdielaj({ titul: subjekt.nazov, text: subjekt.nazov, url: aktualnaUrl() }, toast) },
          { ikona: <IkonaQr size={17} />, label: "QR kód profilu", popis: "Na tlač alebo vlastný web", onClick: () => setPodstranka(true) },
          ...(pozicia === "b2b" ? [{ ikona: <IkonaInstitucia size={17} />, label: "Adresár firiem", onClick: () => setSheet("adresarB2B") }] : []),
        ]} />
      )}

      {/* ---- sheety ---- */}
      {sheet === "centralna" && <CentralnaZbierkaSheet toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "zbierky" && (
        <OrgZbierkySheet tier={tier} toast={toast} onPaywall={(p) => setPaywall(p)}
          onSpravovat={(z) => setSheet({ spravovat: z })} onClose={() => setSheet(null)} />
      )}
      {typeof sheet === "object" && sheet && "spravovat" in sheet && (
        <SpravaZbierkySheet z={sheet.spravovat} tier={tier} toast={toast}
          onPaywall={(tierMin, nazov, dovod) => setPaywall({ tierMin, nazov, dovod })}
          onClose={() => setSheet("zbierky")} />
      )}
      {sheet === "video" && <VideoSheet tier={tier} toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "darcovia" && <DarcoviaSheet tier={tier} toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "qr" && <QrNastrojeSheet tier={tier} toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "sumy" && <ViditelnostSheet toast={toast} onClose={() => setSheet(null)} />}
      {/* KARTA 40: ten istý nový oznam ako v Správe charity (starý OznamySheet sa už nepoužíva) */}
      {sheet === "oznamy" && createPortal(
        <div className="sprava-charity" role="dialog" aria-modal="true" aria-label="Oznamy" style={{ position: "fixed", inset: 0, zIndex: 120, overflowY: "auto", background: "var(--bg)", color: "var(--ink)", padding: "max(16px, env(safe-area-inset-top)) 16px 120px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <button type="button" onClick={() => setSheet(null)} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>‹ Späť</button>
            <OznamySprava strankaId={pozicia} tier={tier} nazov={subjekt.nazov} inicialy={subjekt.iniciacky} mesto={subjekt.lok} logo={logo ?? subjekt.foto ?? null} mobil={!desktop} tablet={false} toast={toast} onProfil={() => { setSheet(null); setPodstranka(true); }} />
          </div>
        </div>, document.body)}
      {sheet === "zbierky" && pozicia === "b2b" && <NaseZbierkySheet firma={subjekt.nazov} toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "zamestnanci" && pozicia === "b2b" && <ZamestnanciSheet firma={subjekt.nazov} toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "dorovnanie" && <DorovnanieSheet entita={pozicia} toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "inzeraty" && <InzeratySheet entita={pozicia} autor={subjekt.nazov} logo={logo ?? subjekt.foto} tier={tier} toast={toast} onPaywall={setPaywall} onClose={() => setSheet(null)} />}
      {sheet === "segment" && <SektoroveZbierkySheet tier={tier} toast={toast} onPaywall={setPaywall} onClose={() => setSheet(null)} />}
      {sheet === "terminal" && <TerminalSheet toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "retaz" && <MojaRetaz onClose={() => setSheet(null)} toast={toast} />}
      {sheet === "pocitadlo" && <PocitadloVyberSheet toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "vyzvy" && <VyzvySheet tvorca={subjekt.nazov} toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "profil" && (
        <UpravProfilSheet pozicia={pozicia} logo={logo} cover={fotky.cover} toast={toast}
          onUloz={(z) => {
            ulozOnas(pozicia, z.onas); setOnas(z.onas);
            setLogo(z.logo); ulozLogo(pozicia, z.logo);
            setTvarLoga(z.tvar); ulozTvarLoga(pozicia, z.tvar);
            setZdrojAvatara(z.zdroj); ulozZdrojAvatara(pozicia, z.zdroj);
            if (z.cover !== (fotky.cover ?? null)) zmenFotky({ cover: z.cover });
            ulozKontakt(pozicia, z.kontakt); setKontakt(z.kontakt);
            // registrovaná charita: misia, web a siete idú aj do databázy (ten istý profil ako z registrácie)
            if (orgId && pozicia === "charita") {
              ulozDoRegistracie(orgId, { misia: z.onas, web: z.kontakt.web, siete: z.kontakt.siete })
                .catch(() => toast("Profil uložený v zariadení — do databázy sa nepodarilo, skús neskôr"));
            }
          }}
          onClose={() => setSheet(null)} />
      )}
      {sheet === "adresarB2B" && <AdresarB2BSheet vlastneLogo={logo} toast={toast} onClose={() => setSheet(null)} />}

      {paywall && (
        <PaywallModal req={paywall} pozicia={pozicia}
          onKupit={() => { nastavTier(paywall.tierMin); setPaywall(null); toast(`${TIER_LABEL[pozicia][paywall.tierMin]} aktivovaný`); }}
          onClose={() => setPaywall(null)} />
      )}
    </div>
  );
}

// ===================== DEV PANEL — simulácia roly/tieru/držiteľa =====================
/** OPRAVY 75 · DEV simulácia pod Moje stránky v profile (len testovacia verzia) — stav v rola/stav.ts */
export function DevSimulacia() {
  const [pozicia, setPozicia] = useState<Pozicia>(nacitajPoziciu);
  const [tiery, setTiery] = useState<Record<Pozicia, Tier>>(nacitajTiery);
  const [drzitel, setDrzitel] = useState<boolean>(nacitajDrzitel);
  if (!(FLAGS.dev_role_switcher || FLAGS.dev_tier_switcher)) return null;
  return <DevPanel pozicia={pozicia} tier={tiery[pozicia]} drzitel={drzitel}
    onPozicia={(p) => { setPozicia(p); ulozPoziciu(p); }}
    onTier={(t) => { const n = { ...tiery, [pozicia]: t }; setTiery(n); ulozTiery(n); }}
    onDrzitel={() => setDrzitel((d) => { ulozDrzitel(!d); return !d; })} />;
}

function DevPanel({ pozicia, tier, drzitel, onPozicia, onTier, onDrzitel }: {
  pozicia: Pozicia; tier: Tier; drzitel: boolean;
  onPozicia: (p: Pozicia) => void; onTier: (t: Tier) => void; onDrzitel: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [neregistrovany, setNeregistrovany] = useState(jeNeregistrovany);
  const [akoFirma, setAkoFirma] = useState(darujemAkoFirma);
  const [vsadeModul, setVsadeModul] = useState(() => rezimModulu() === "vsade"); // KARTA 43: modul pri každej zbierke vo verejnom profile
  const seg = (on: boolean, farba: string): React.CSSProperties => ({
    flex: 1, height: 32, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    borderRadius: RADIUS.xs, cursor: "pointer", fontSize: 12, fontWeight: on ? 800 : 600,
    background: on ? tint(farba, .12) : "transparent", border: `1px solid ${on ? tint(farba, .4) : "transparent"}`,
    color: on ? farba : C.textSec, transition: "all .15s ease", whiteSpace: "nowrap",
  });
  return (
    <div style={{ border: `1px dashed ${tint("var(--a-plum)", .4)}`, borderRadius: RADIUS.md, marginBottom: SPACE.gutter, overflow: "hidden" }}>
      <div {...pressable(() => setOpen((o) => !o), "Vývojárske prepínače")}
        style={{ display: "flex", alignItems: "center", gap: SPACE.xs, padding: `${SPACE.xs}px ${SPACE.sm}px`, cursor: "pointer", background: tint("var(--a-plum)", .06) }}>
        <DevChip />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec }}>Simulácia — rola · úroveň · držiteľ</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.textTer }}>{open ? "skryť" : "zobraziť"}</span>
      </div>
      {open && (
        <div style={{ padding: SPACE.sm, display: "grid", gap: SPACE.xs }}>
          <SegTabs options={POZICIE.map((p) => p.key)} value={pozicia} onChange={(k) => onPozicia(k as Pozicia)} ariaLabel="Rola (DEV)"
            style={{ display: "flex", gap: SPACE.xxs, padding: SPACE.xxs, borderRadius: RADIUS.sm, background: C.surface2, border: `1px solid ${C.line}` }}
            render={(k, on) => { const p = POZICIE.find((x) => x.key === k)!; return <span style={seg(on, "var(--a-info)")}><Emo e={p.emoji} /> {p.label}</span>; }} />
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
            <SegTabs options={["0", "1", "2", "3", "4"]} value={String(tier)} onChange={(t) => onTier(Number(t) as Tier)} ariaLabel="Úroveň (DEV)"
              style={{ flex: 1, display: "flex", gap: SPACE.xxs, padding: SPACE.xxs, borderRadius: RADIUS.sm, background: C.surface2, border: `1px solid ${C.line}` }}
              render={(t, on) => <span style={seg(on, "var(--a-gold)")}>{TIER_LABEL[pozicia][Number(t)]}</span>} />
            <Tip label="Vyššia úroveň pridáva kapacitu a nástroje. Štít, karma ani poradie sa kúpiť nedajú.">
              <span style={{ width: 16, height: 16, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: C.textTer, border: `1px solid ${C.line}`, cursor: "help", flex: "none" }}>?</span>
            </Tip>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xxs}px ${SPACE.xxs}px` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Držiteľ roly</div>
              <div style={{ fontSize: 10.5, color: C.textTer }}>Zapne sekciu Správa ({ROLA_UCTU[pozicia]})</div>
            </div>
            <Switch on={drzitel} onChange={onDrzitel} ariaLabel="Držiteľ roly" />
          </div>
          {/* darca na ukážku: registrovaný má uloženú kartu, účet a peňaženku; neregistrovaný vypĺňa polia a je anonym */}
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xxs}px ${SPACE.xxs}px` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Darca: {neregistrovany ? "neregistrovaný" : "registrovaný"}</div>
              <div style={{ fontSize: 10.5, color: C.textTer }}>{neregistrovany ? "Vypĺňa kartu / IBAN · v zozname darcov anonym" : "Uložená karta, účet, peňaženka · pod darom jeho meno"}</div>
            </div>
            <Switch on={!neregistrovany} onChange={() => { nastavNeregistrovany(!neregistrovany); setNeregistrovany(!neregistrovany); }} ariaLabel="Registrovaný darca" />
          </div>
          {/* kto práve daruje — nezávisle od prepnutej roly: firemný dar sa musí dať
              skúsiť aj na profile charity, kde si prepnutý ako charita */}
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xxs}px ${SPACE.xxs}px` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Darujem ako: {akoFirma ? "firma" : "ja"}</div>
              <div style={{ fontSize: 10.5, color: C.textTer }}>
                {akoFirma ? "Zbierka sa firme pripne na podstránku a pri zbierke svieti jej meno" : "Bežný osobný dar"}
              </div>
            </div>
            <Switch on={akoFirma} onChange={() => { nastavDarcuFirmu(!akoFirma); setAkoFirma(!akoFirma); }} ariaLabel="Darujem ako firma" />
          </div>
          {/* KARTA 43: verejný profil — modul pri každej zbierke (všade) vs. len v detaile */}
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xxs}px ${SPACE.xxs}px` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Modul pri každej zbierke: {vsadeModul ? "všade" : "len v detaile"}</div>
              <div style={{ fontSize: 10.5, color: C.textTer }}>{vsadeModul ? "Vo verejnom profile je platobný modul rovno pod každou zbierkou aj skutkom" : "Vo verejnom profile je len náhľad, modul sa otvorí v detaile"}</div>
            </div>
            <Switch on={vsadeModul} onChange={() => { const n = !vsadeModul; nastavRezimModulu(n ? "vsade" : "detail"); setVsadeModul(n); }} ariaLabel="Modul pri každej zbierke" />
          </div>
        </div>
      )}
    </div>
  );
}

// live tok darov — súčet dňa rastie priebežne
function DnesPrislo() {
  const [suma, setSuma] = useState(342);
  const [darcovia, setDarcovia] = useState(17);
  useEffect(() => {
    const t = setInterval(() => {
      setSuma((s) => s + Math.round(2 + Math.random() * 12));
      if (Math.random() < 0.4) setDarcovia((d) => d + 1);
    }, 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--a-green)", flex: "none", animation: "pulse 1.6s ease infinite" }} />
      <b style={{ color: "var(--a-green)" }}>{suma} €</b> · {darcovia} darcov dnes
    </span>
  );
}

// ===================== PAYWALL — vysvetlenie zamknutej funkcie =====================
function PaywallModal({ req, pozicia, onKupit, onClose }: { req: PaywallReq; pozicia: Pozicia; onKupit: () => void; onClose: () => void }) {
  const label = TIER_LABEL[pozicia][req.tierMin];
  return (
    <Sheet onClose={onClose} label={`Odomknúť ${label}`}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
        <span style={{ width: 42, height: 42, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: tint("var(--a-gold)", .1) }}>🔓</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{req.nazov}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>dostupné od úrovne <b style={{ color: "var(--a-gold)" }}>{label}</b></div>
        </div>
      </div>
      {req.dovod && (
        <div style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.5, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>{req.dovod}</div>
      )}
      <div style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.55, marginBottom: SPACE.md }}>
        <b style={{ color: C.text }}>{label}</b> — {TIER_POPIS[pozicia][req.tierMin]}. Vyššia úroveň pridáva kapacitu a nástroje.
      </div>
      <button onClick={onKupit} style={{ width: "100%", height: 48, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 15, background: "var(--a-gold)", color: "#231a02" }}>
        Aktivovať {label}
      </button>
      <button onClick={onClose} style={{ width: "100%", height: 42, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, background: "transparent", color: C.textSec, marginTop: SPACE.xs }}>
        Zatiaľ nie
      </button>
    </Sheet>
  );
}

// ===================== ZBIERKY ORGANIZÁCIE =====================
function OrgZbierkySheet({ tier, toast, onPaywall, onSpravovat, onClose }: {
  tier: Tier; toast: (m: string) => void; onPaywall: (p: PaywallReq) => void;
  onSpravovat: (z: OrgZbierka) => void; onClose: () => void;
}) {
  const [teraz] = useState(() => Date.now());
  useZmenySpravy();
  const [extra, setExtra] = useState<OrgZbierka[]>(nacitajOrgExtra);
  // tie isté zbierky ako na verejnom profile (+ koncepty vytvorené tu)
  const zbierky = useMemo(() => [...zbierkyOrg("charita", tier), ...extra], [extra, tier]);
  const aktivne = zbierky.filter((z) => z.stav === "aktivna").length;
  const limit = KONFIG.limitZbierok[tier];

  const vytvor = () => {
    if (aktivne >= limit) {
      if (tier < 4) {
        onPaywall({
          tierMin: (tier + 1) as Tier, nazov: "Ďalšia súbežná zbierka",
          dovod: `Na úrovni ${TIER_LABEL.charita[tier]} máš limit ${limit} ${limit === 1 ? "súbežnú zbierku" : "súbežné zbierky"} (${aktivne} aktívnych).`,
        });
      } else toast(`Dosiahnutý limit súbežných zbierok: ${limit}`);
      return;
    }
    const n: OrgZbierka = { id: `org-${Date.now()}`, nazov: "Nová zbierka (koncept)", emoji: "🎯", ciel: 1000, vyzbierane: 0, stav: "aktivna", darcovia: 0 };
    const nove = [...extra, n];
    setExtra(nove); ulozOrgExtra(nove);
    toast("Zbierka vytvorená ako koncept");
  };

  return (
    <Sheet onClose={onClose} label="Zbierky organizácie">
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>Zbierky organizácie</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginBottom: SPACE.sm }}>{aktivne} aktívne · limit úrovne {TIER_LABEL.charita[tier]}: {limit} súbežných</div>

      {zbierky.map((z) => {
        const raw = ZBIERKY.find((x) => x.id === z.id);
        const st = nacitajStav(z.id) ?? (raw ? predvolenyStav(raw, teraz) : null);
        const vyz = st?.simVyzbierane ?? z.vyzbierane;
        const pct = st ? percentoDolozenia(st, vyz) : 0;
        const faza = st && z.stav === "ukoncena" ? fazaDokladovania(st, vyz, teraz) : null;
        const stavText = !faza ? `doložené ${pct} % použitia`
          : faza.faza === "dolozene" ? "✓ doložené"
          : faza.faza === "lehota" ? `na doloženie ${faza.dni} dní`
          : faza.faza === "vyzva" ? `dolož do ${faza.dni} dní`
          : faza.faza === "zdovodnene" ? "zdôvodnenie posudzujeme"
          : "čaká na doklady";
        return (
          <div key={z.id} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs }}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
              <span style={{ width: 34, height: 34, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: "rgba(var(--glass-rgb),.06)" }}><Emo e={z.emoji} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z.nazov}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>{z.darcovia} darcov</div>
              </div>
              <span style={{ flex: "none", fontSize: 10.5, fontWeight: 800, color: z.stav === "aktivna" ? "var(--a-green)" : "var(--a-info)", background: tint(z.stav === "aktivna" ? "var(--a-green)" : "var(--a-info)", .14), borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{z.stav === "aktivna" ? "Aktívna" : "Ukončená"}</span>
            </div>
            <div style={{ marginTop: SPACE.xs }}><MoniBar vyzbierane={z.vyzbierane} ciel={z.ciel} mini /></div>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: SPACE.xs, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: pct >= 100 || faza?.faza === "dolozene" ? "var(--a-green)" : C.textTer, background: "rgba(var(--glass-rgb),.06)", borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{stavText}</span>
              <span {...pressable(() => onSpravovat(z), `Spravovať — ${z.nazov}`)} style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, color: "var(--a-green)", cursor: "pointer" }}>Spravovať ›</span>
            </div>
          </div>
        );
      })}

      <button onClick={vytvor} style={{ width: "100%", height: 46, marginTop: SPACE.xs, borderRadius: RADIUS.sm, border: `1px solid ${tint("var(--a-info)", .38)}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: tint("var(--a-info)", .1), color: "var(--a-info)" }}>
        + Vytvoriť zbierku
      </button>
    </Sheet>
  );
}

// ===================== PRÍSPEVKY OD PODPOROVATEĽOV (tvorca) =====================
function TerminalSheet({ toast, onClose }: { toast: (m: string) => void; onClose: () => void }) {
  const [on, setOn] = useState<boolean>(nacitajTerminal);
  const prepni = (v: boolean) => { setOn(v); ulozTerminal(v); toast(v ? "Príspevky zapnuté — tlačidlo podpory je na tvojom profile" : "Príspevky vypnuté"); };
  return (
    <Sheet onClose={onClose} label="Príspevky od podporovateľov">
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
        <span style={{ width: 42, height: 42, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint("var(--a-info)", .1), color: "var(--a-info)" }}><IkonaPenazenka size={20} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Príspevky od podporovateľov</div>
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>priame príspevky na tvojom verejnom profile</div>
        </div>
        <Switch on={on} onChange={prepni} ariaLabel="Príspevky zap/vyp" />
      </div>
      <div style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.55 }}>
        Po zapnutí sa na spodku tvojho verejného profilu zobrazí tlačidlo podpory. Tvoja tvorba a reťaze ostávajú vždy navrchu.
      </div>
    </Sheet>
  );
}


// ===================== ADRESÁR FIRIEM =====================
function AdresarB2BSheet({ vlastneLogo, toast, onClose }: { vlastneLogo: string | null; toast: (m: string) => void; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} label="Adresár firiem">
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>Adresár firiem</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginBottom: SPACE.sm }}>Overené firmy a ich podpora komunity</div>
      {FIRMY_ADRESAR.map((f) => {
        // logo v riadku (PATCH 2 §6) — vlastná firma berie nahraté logo zo správy; fallback iniciálky
        const logoRiadku = f.iniciacky === SUBJEKTY.b2b.iniciacky ? (vlastneLogo ?? f.logo) : f.logo;
        return (
        <div key={f.nazov} {...pressable(() => toast(`${f.nazov} — verejný profil firmy`), f.nazov)}
          style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px`, borderBottom: `1px solid ${C.line}`, cursor: "pointer" }}>
          <span style={{ width: 38, height: 38, borderRadius: "50%", flex: "none", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: tint("var(--a-info)", .1), color: "var(--a-info)" }}>
            {logoRiadku ? <img src={logoRiadku} alt={f.nazov} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : f.iniciacky}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{f.nazov}</div>
            <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 1 }}>{f.odvetvie} · {f.mesto}</div>
          </div>
          <div style={{ flex: "none", display: "flex", alignItems: "center", gap: SPACE.sm }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--a-green)" }}>{f.podpora}</div>
              <div style={{ fontSize: 9.5, color: C.textTer }}>podpora</div>
            </div>
            <Stit level={naStitLevel(f.stit)} size={28} />
          </div>
        </div>
        );
      })}
    </Sheet>
  );
}

// ===================== DROBNÉ =====================
function DevChip() {
  return <span style={{ fontSize: 9, fontWeight: 800, color: "var(--a-plum)", background: tint("var(--a-plum)", .14), border: `1px solid ${tint("var(--a-plum)", .35)}`, borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px`, letterSpacing: ".04em", flex: "none" }}>DEV</span>;
}
function TierChip({ label }: { label: string }) {
  return <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--a-gold)", background: tint("var(--a-gold)", .14), borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px`, flex: "none" }}>{label}</span>;
}
