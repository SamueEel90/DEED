import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  ulozDoklady, percentoDolozene, nacitajTerminal, ulozTerminal,
  nacitajOrgExtra, ulozOrgExtra, nacitajLogo, ulozLogo, nacitajOnas, ulozOnas, nacitajTvarLoga, ulozTvarLoga, nacitajHlavuZbalenu, ulozHlavuZbalenu,
  type Pozicia, type Tier, type DokladZbierky,
} from "./stav";
import { PANELY, SPRAVY, SPRAVA_NADPIS, ZASLUZENA, SUBJEKTY, FIRMY_ADRESAR, type PanelBlok, type SpravaItem, type OrgZbierka } from "./mock";
import { Podstranka } from "./Podstranka";
import { UpravProfilSheet } from "./UpravProfil";
import { OnasKratky } from "./OnasKratky";
import { KontaktBlok, nacitajKontakt, ulozKontakt } from "./kontakt";
import { verejneTaby, zamknuteTaby, popisTabu, BLOK_ZA_TAB, zbierkyOrg, dokladyZbierky } from "./obsah";

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
type OtvorenySheet = null | "zbierky" | "terminal" | "retaz" | "profil" | "adresarB2B" | { dokladovanie: OrgZbierka };

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
const ikonaPre = (id: string, fallback: string): ReactNode => IKONY[id] ?? <span style={{ fontSize: 16 }}>{fallback}</span>;

export function MojDeedFiremny({ onBack, toast }: { onBack: () => void; toast: (m: string) => void }) {
  const { desktop } = useLayout();
  const ja = usePouzivatel(); // tvorca vystupuje pod vlastnou profilovou fotkou (nie logom)
  // rola + tier per rola — DEV: lokálny stav; produkcia: overený účet + fakturácia
  const [pozicia, setPozicia] = useState<Pozicia>(nacitajPoziciu);
  const [tiery, setTiery] = useState<Record<Pozicia, Tier>>(nacitajTiery);
  const [drzitel, setDrzitel] = useState<boolean>(nacitajDrzitel);
  const [logo, setLogo] = useState<string | null>(() => nacitajLogo(nacitajPoziciu()));
  const [tvarLoga, setTvarLoga] = useState(() => nacitajTvarLoga(nacitajPoziciu()));
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
  const prepniPoziciu = (p: Pozicia) => { setPozicia(p); ulozPoziciu(p); setLogo(nacitajLogo(p)); setTvarLoga(nacitajTvarLoga(p)); setOnas(nacitajOnas(p)); setKontakt(nacitajKontakt(p)); };
  const nastavTier = (t: Tier) => { const n = { ...tiery, [pozicia]: t }; setTiery(n); ulozTiery(n); };
  const prepniDrzitela = () => { setDrzitel((d) => { ulozDrzitel(!d); return !d; }); };

  // Viditeľnosť nástrojov: vlastné + najviac 2 programy nad sebou (zamknuté).
  // Vyššie sa nezobrazujú vôbec — ZADARMO nevidí nástroje z T3/T4, T1 nevidí T4 atď.
  const viditelny = (tierMin: Tier) => tierMin <= tier + 2;
  const bloky = PANELY[pozicia].filter((b) => viditelny(b.tierMin));
  // odomknuté nástroje navrch, zamknuté pod ne zoradené podľa programu (najprv T1, potom T2)
  const sprava = SPRAVY[pozicia].filter((it) => it.povinne || viditelny(it.tierMin))
    .map((it, i) => ({ it, i, z: !it.povinne && tier < it.tierMin ? it.tierMin : -1 }))
    .sort((a, b) => a.z - b.z || a.i - b.i).map((x) => x.it);
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
    if (pozicia === "tvorca" && b.id === "retaz") return setSheet("retaz");
    setSheet(null); toast(`${b.nazov} — detail`);
  };

  const spravaAkcia = (it: SpravaItem) => {
    if (it.id === "profil" || it.id === "podstranka") return setSheet("profil");
    if (pozicia === "charita" && (it.id === "zbierky" || it.id === "dokladovanie")) return setSheet("zbierky");
    if (pozicia === "tvorca" && it.id === "terminal") return setSheet("terminal");
    toast(`${it.nazov} — čoskoro`);
  };

  // avatar subjektu: charita/B2B = nahraté logo · tvorca = moja profilová fotka
  const avatarSrc = (pozicia === "tvorca" ? ja.foto : logo) ?? subjekt.foto;
  const coverSrc = fotky.cover ?? subjekt.cover;

  // vlastník vidí TÚ ISTÚ verejnú stránku ako cudzí
  if (podstranka) return <Podstranka pozicia={pozicia} tier={tier} logo={logo} toast={toast} onBack={() => setPodstranka(false)} />;

  const telo = (
    <div style={{ padding: `${SPACE.sm}px ${SPACE.md}px 0` }}>
      {/* ---- DEV panel — simulácia roly/tieru/držiteľa (v produkcii sa nezobrazuje) ---- */}
      {(FLAGS.dev_role_switcher || FLAGS.dev_tier_switcher) && (
        <DevPanel pozicia={pozicia} tier={tier} drzitel={drzitel}
          onPozicia={prepniPoziciu} onTier={nastavTier} onDrzitel={prepniDrzitela} />
      )}

      {/* ==== HERO SUBJEKTU — cover, logo, meno + odznak, štatistiky, akcie ==== */}
      {zbalena ? (
        // zmenšená hlavička — na mobile nezaberá miesto pri práci s nástrojmi
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.sm }}>
          <span style={{ width: 44, height: 44, flex: "none", overflow: "hidden", borderRadius: pozicia !== "tvorca" && tvarLoga === "stvorec" ? RADIUS.sm : "50%", background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
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
      <EntityHero avatarTvar={pozicia === "tvorca" ? "kruh" : tvarLoga}
        avatar={avatarSrc
          ? <img src={avatarSrc} alt={subjekt.nazov} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : (pozicia === "tvorca" ? subjekt.emoji : subjekt.iniciacky)}
        cover={coverSrc}
        coverEl={<span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, opacity: .4 }}>{subjekt.emoji}</span>}
        meno={subjekt.nazov} overene={subjekt.overena} overeneLabel="Overený subjekt — identita potvrdená"
        podtitul={<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IkonaPin size={11} color={C.textTer} /> {subjekt.lok} · {rolaMeta.label}</span>}
        vpravo={
          <div style={{ textAlign: "center" }} title="Štít sa zaslúži skutkami — nedá sa kúpiť">
            <Stit level={stit} size={desktop ? 88 : 64} detail subjekt={subjekt.nazov} />
          </div>
        }
        podMenom={<OnasKratky text={onas ?? subjekt.onas} />}
        stats={(tier === 0 && subjekt.cislaZadarmo ? subjekt.cislaZadarmo : subjekt.cisla).map(([hodnota, label], i) => ({ hodnota, label, farba: i === 2 ? "var(--a-gold)" : undefined }))}
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
          verejneTaby(pozicia, tier).forEach((t) => {
            const blok = PANELY[pozicia].find((b) => b.id === BLOK_ZA_TAB[t.key]);
            riadky.push({ k: `tab-${t.key}`, tier: -1, el: (posledna) => (
              <MenuPolozka key={`tab-${t.key}`} posledna={posledna}
                ikona={<span style={{ fontSize: 15 }}>{t.polozky[0]?.emoji ?? "📄"}</span>} farba="var(--a-plum)"
                label={t.label} popis={popisTabu(t)} hodnota={String(t.polozky.length)}
                onClick={() => (blok ? blokAkcia(blok) : setPodstranka(true))} />
            ) });
          });
          bloky.filter((b) => !Object.values(BLOK_ZA_TAB).includes(b.id) && tier >= b.tierMin).forEach((b) => {
            riadky.push({ k: b.id, tier: -1, el: (posledna) => (
              <MenuPolozka key={b.id} posledna={posledna} ikona={ikonaPre(b.id, b.emoji)} farba="var(--a-info)"
                label={b.nazov} popis={pozicia === "charita" && b.id === "dnes" ? <DnesPrislo /> : b.popis} hodnota={b.hodnota}
                onClick={b.info ? undefined : () => blokAkcia(b)} />
            ) });
          });
          if (pozicia === "b2b") riadky.push({ k: "adresar", tier: -1, el: (posledna) => (
            <MenuPolozka key="adresar" posledna={posledna} ikona={<IkonaInstitucia size={17} />} farba="var(--a-info)"
              label="Adresár firiem" popis="Overené firmy a ich podpora komunity" onClick={() => setSheet("adresarB2B")} />
          ) });
          const zamk = [
            ...zamknuteTaby(pozicia, tier).map((t) => ({ k: `tab-${t.key}`, t: t.odTieru ?? 0, emoji: t.polozky[0]?.emoji ?? "📄", nazov: t.label, ikona: null as ReactNode })),
            ...bloky.filter((b) => !Object.values(BLOK_ZA_TAB).includes(b.id) && tier < b.tierMin)
              .map((b) => ({ k: b.id, t: b.tierMin as number, emoji: b.emoji, nazov: b.nazov, ikona: ikonaPre(b.id, b.emoji) })),
          ].sort((a, b) => a.t - b.t);
          zamk.forEach((z) => riadky.push({ k: z.k, tier: z.t, el: (posledna) => (
            <MenuPolozka key={z.k} posledna={posledna} zamknute farba="var(--c-textTer)"
              ikona={z.ikona ?? <span style={{ fontSize: 15, opacity: .5 }}>{z.emoji}</span>}
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
          {sprava.map((it, i) => {
            const zamknute = !it.povinne && tier < it.tierMin;
            return (
              <MenuPolozka key={it.id}
                ikona={ikonaPre(it.id, it.emoji)}
                farba={it.povinne ? "var(--a-green)" : "var(--a-info)"}
                label={it.nazov}
                chip={it.povinne
                  ? <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--a-green)", background: tint("var(--a-green)", .14), borderRadius: RADIUS.xs, padding: `1px ${SPACE.xs}px`, flex: "none" }}>Povinné</span>
                  : zamknute ? <TierChip label={`od ${TIER_LABEL[pozicia][it.tierMin]}`} /> : undefined}
                popis={it.popis}
                zamknute={zamknute}
                onClick={it.povinne ? () => spravaAkcia(it) : gateTier(it.tierMin, it.nazov, () => spravaAkcia(it))}
                posledna={i === sprava.length - 1}
              />
            );
          })}
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
      <BackHeader onBack={onBack} title="Môj DEED firemný" />
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
      {sheet === "zbierky" && (
        <OrgZbierkySheet tier={tier} toast={toast} onPaywall={(p) => setPaywall(p)}
          onDokladovanie={(z) => setSheet({ dokladovanie: z })} onClose={() => setSheet(null)} />
      )}
      {typeof sheet === "object" && sheet && "dokladovanie" in sheet && (
        <DokladovanieSheet z={sheet.dokladovanie} toast={toast} onClose={() => setSheet("zbierky")} />
      )}
      {sheet === "terminal" && <TerminalSheet toast={toast} onClose={() => setSheet(null)} />}
      {sheet === "retaz" && <MojaRetaz onClose={() => setSheet(null)} toast={toast} />}
      {sheet === "profil" && (
        <UpravProfilSheet pozicia={pozicia} logo={logo} cover={fotky.cover} toast={toast}
          onUloz={(z) => {
            ulozOnas(pozicia, z.onas); setOnas(z.onas);
            setLogo(z.logo); ulozLogo(pozicia, z.logo);
            setTvarLoga(z.tvar); ulozTvarLoga(pozicia, z.tvar);
            if (z.cover !== (fotky.cover ?? null)) zmenFotky({ cover: z.cover });
            ulozKontakt(pozicia, z.kontakt); setKontakt(z.kontakt);
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
function DevPanel({ pozicia, tier, drzitel, onPozicia, onTier, onDrzitel }: {
  pozicia: Pozicia; tier: Tier; drzitel: boolean;
  onPozicia: (p: Pozicia) => void; onTier: (t: Tier) => void; onDrzitel: () => void;
}) {
  const [open, setOpen] = useState(true);
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
            render={(k, on) => { const p = POZICIE.find((x) => x.key === k)!; return <span style={seg(on, "var(--a-info)")}>{p.emoji} {p.label}</span>; }} />
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
function OrgZbierkySheet({ tier, toast, onPaywall, onDokladovanie, onClose }: {
  tier: Tier; toast: (m: string) => void; onPaywall: (p: PaywallReq) => void;
  onDokladovanie: (z: OrgZbierka) => void; onClose: () => void;
}) {
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
        const doklady = dokladyZbierky(z.id);
        const pct = percentoDolozene(doklady, z.vyzbierane);
        const poLehote = z.stav === "ukoncena" && z.ukoncena
          && (Date.now() - new Date(z.ukoncena).getTime()) / 86400000 > KONFIG.lehotaDokladovaniaDni;
        const cakaNaDoklady = poLehote && pct < 100;
        return (
          <div key={z.id} style={{ background: C.surface2, border: `1px solid ${cakaNaDoklady ? tint("var(--a-danger)", .4) : C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs }}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
              <span style={{ width: 34, height: 34, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: "rgba(var(--glass-rgb),.06)" }}>{z.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z.nazov}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>{z.darcovia} darcov</div>
              </div>
              <span style={{ flex: "none", fontSize: 10.5, fontWeight: 800, color: z.stav === "aktivna" ? "var(--a-green)" : "var(--a-info)", background: tint(z.stav === "aktivna" ? "var(--a-green)" : "var(--a-info)", .14), borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{z.stav === "aktivna" ? "Aktívna" : "Ukončená"}</span>
            </div>
            <div style={{ marginTop: SPACE.xs }}><MoniBar vyzbierane={z.vyzbierane} ciel={z.ciel} mini /></div>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: SPACE.xs, flexWrap: "wrap" }}>
              {cakaNaDoklady
                ? <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--a-danger)", background: tint("var(--a-danger)", .12), borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>⚠ čaká na doklady</span>
                : <span style={{ fontSize: 10.5, fontWeight: 700, color: pct >= 100 ? "var(--a-green)" : C.textTer, background: "rgba(var(--glass-rgb),.06)", borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>doložené {pct} % použitia</span>}
              <span {...pressable(() => onDokladovanie(z), `Dokladovanie — ${z.nazov}`)} style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: "var(--a-info)", cursor: "pointer" }}>Dokladovanie ›</span>
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

// ===================== DOKLADOVANIE — povinná funkcia, mimo spoplatnenia =====================
function DokladovanieSheet({ z, toast, onClose }: { z: OrgZbierka; toast: (m: string) => void; onClose: () => void }) {
  const [doklady, setDoklady] = useState<DokladZbierky[]>(() => dokladyZbierky(z.id));
  const [typ, setTyp] = useState("Bloček");
  const [popis, setPopis] = useState("");
  const [suma, setSuma] = useState("");
  const pct = percentoDolozene(doklady, z.vyzbierane);

  const pridaj = () => {
    const s = Number(suma.replace(",", "."));
    if (!popis.trim()) { toast("Napíš krátky popis použitia"); return; }
    if (!s || s <= 0) { toast("Zadaj sumu dokladu v €"); return; }
    const nove = [...doklady, { nazov: typ, popis: popis.trim(), suma: s, datum: new Date().toISOString() }];
    setDoklady(nove); ulozDoklady(z.id, nove);
    setPopis(""); setSuma("");
    toast(`Doklad priložený — doložené ${percentoDolozene(nove, z.vyzbierane)} % použitia`);
  };

  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" };

  return (
    <Sheet onClose={onClose} label={`Dokladovanie — ${z.nazov}`}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs }}>
        <span style={{ width: 40, height: 40, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint("var(--a-green)", .1), color: "var(--a-green)" }}><IkonaDokument size={19} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Dokladovanie zbierky</div>
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>{z.nazov} · vyzbierané {z.vyzbierane.toLocaleString("sk")} €</div>
        </div>
        <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: pct >= 100 ? "var(--a-green)" : "var(--a-gold)" }}>{pct} %</span>
      </div>
      {/* stav dokladovania financií (nie badge progres) */}
      <div style={{ height: 7, background: "rgba(var(--glass-rgb),.1)", borderRadius: 4, overflow: "hidden", marginBottom: SPACE.sm }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--a-green)" : "var(--a-gold)", borderRadius: 4, transition: "width .3s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.5, background: tint("var(--a-green)", .08), border: `1px solid ${tint("var(--a-green)", .3)}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.md }}>
        Darcovia vidia pri zbierke „doložené {pct} % použitia". Ukončená zbierka bez dokladov po {KONFIG.lehotaDokladovaniaDni} dňoch dostane na profile stav „čaká na doklady".
      </div>

      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.xs }}>
        {["Bloček", "Faktúra", "Foto"].map((t) => (
          <span key={t} {...pressable(() => setTyp(t), t)} aria-pressed={typ === t}
            style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: typ === t ? 800 : 600, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.pill, cursor: "pointer", background: typ === t ? tint("var(--a-info)", .1) : C.surface2, border: `1px solid ${typ === t ? tint("var(--a-info)", .38) : C.line}`, color: typ === t ? "var(--a-info)" : C.textSec }}>{t}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.xs }}>
        <input value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="Krátky popis použitia (napr. palivo, nájom)" style={{ ...input, flex: 1 }} />
        <input value={suma} onChange={(e) => setSuma(e.target.value)} placeholder="€" inputMode="decimal" style={{ ...input, width: 76, flex: "none", textAlign: "right" }} />
      </div>
      <button onClick={pridaj} style={{ width: "100%", height: 44, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: "var(--a-green)", color: "#06281d", marginBottom: SPACE.md }}>
        Priložiť doklad
      </button>

      {doklady.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textTer, textAlign: "center", padding: SPACE.md }}>Zatiaľ žiadne doklady — priebežné dokladovanie dvíha dôveru darcov.</div>
      ) : doklady.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, marginBottom: SPACE.xxs }}>
          <span style={{ fontSize: 15, flex: "none" }}>{d.nazov === "Faktúra" ? "📄" : d.nazov === "Foto" ? "📷" : "🧾"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.popis}</div>
            <div style={{ fontSize: 10, color: C.textTer }}>{d.nazov} · {new Date(d.datum).toLocaleDateString("sk")}</div>
          </div>
          <span style={{ flex: "none", fontSize: 12.5, fontWeight: 800, color: "var(--a-green)" }}>{d.suma.toLocaleString("sk")} €</span>
        </div>
      ))}
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
