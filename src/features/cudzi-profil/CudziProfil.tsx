import { Emo } from "@/components/icons";
import { useState } from "react";
import { StityRad } from "@/components/stit";
import { stityOblastiSubjektu } from "@/lib/stityOblasti";
import { CestaHlavicka } from "@/components/cesta";
import { SIRKA, C, SPACE, RADIUS } from "@/theme";
import {
  Aura, MoniBar, QrModal, SegTabs, useLayout, obalSiroky, BackHeader, IkonaFajka, IkonaPlay, Zdielanie, IkonaUsmev,
  EntityHero, BtnAkcia, BtnIkonka, KontextMenu, TabyProfil, MenuSkupina, DvaStlpce,
  IkonaMoznosti, IkonaQr, IkonaVlajka, IkonaOdkaz, Zvon, tint as tintVar,
  Foto, Sheet, ProgresBox, PlatobnyModul, PlatbaModal, ZoznamDarcov,
  FotoProfiluSheet, KamerkaBadge, ZmenitPill, naStitLevel,
} from "@/shared";
import { pressable } from "@/components/pressable";
import { FOTO_TEST_REZIM, klucEntity, useFotkyEntity } from "@/lib/fotoentity";
import { MEDIA_AR } from "@/lib/cardSize";
import { NahlasitSheet } from "@/components/nahlasit";
import type { CudziSubjekt, CudziSubjektOrg, CudziSubjektOsoba } from "@/types";
import { usePersonalizacia } from "@/lib/personalizacia";
import { tagChip, jeHrdina, HRDINA_COL } from "@/lib/ui";
import { qrUrl } from "@/lib/qr";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import { STAVY } from "./mock";
import { najdiOrg, type OrgKampan } from "./orgy";
import { odznakZbierky } from "@/lib/zbierky";
import { pridajDar, type VolbaDaru } from "@/lib/darcovia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { testProfilPreMeno } from "@/lib/testProfily";
import { VerejnyProfilView } from "@/features/verejny-profil/VerejnyProfil";
import { VrstvaProfilu } from "@/features/verejny-profil/casti";
import type { Kanal } from "@/types";

/*
  ============================================================
  CUDZÍ PROFIL — jednotný entity systém (vzor business profilov).
  · Organizácia / charita — plne verejná vizitka: hero (cover→avatar→
    meno+odznak→štatistiky→akcie) → podčiarknuté taby → obsah;
    sekundárne akcie v ⋯ menu; desktop = obsah + sticky rail.
  · Osoba — 3 stavy (viditeľnosť rastie len so súhlasom):
    BEŽNÁ (len meno+úroveň, žiadosť o priateľstvo) · PRIATEĽ (spoločné
    + dovolené skutky + správa) · TVORCA (verejný, sledovateľný).
  Priateľstvo NEODOMYKÁ súkromnú časť automaticky.
  ============================================================
*/

type Toast = (m: string) => void;

interface CudziProfilProps {
  subjekt?: CudziSubjekt;
  onBack?: () => void;
  /** v ceste Späť: krížik zavrie celú cestu (jednotná hlavička cesty) */
  onZavriet?: () => void;
  toast?: Toast;
  /** klik na kampaň — modul môže otvoriť natívny detail zbierky; bez neho sa otvorí vstavaný detail s darovaním */
  onKampan?: (k: OrgKampan) => void;
}

export function CudziProfil({ subjekt = {} as CudziSubjekt, onBack, toast, onKampan, onZavriet }: CudziProfilProps) {
  const { wide, desktop } = useLayout();
  // KARTA 43: tri testovacie stránky (Svetlo pomoci, Pekáreň Dobrota, Martin Konaľ) otvoria
  // svoj verejný profil (Kronika / Výklad / Pirát) aj z feedu, zbierky a adresára.
  const testProfil = testProfilPreMeno(subjekt.meno);
  if (testProfil) return <VrstvaProfilu><VerejnyProfilView kluc={testProfil.k} onBack={onZavriet ?? onBack ?? (() => {})} /></VrstvaProfilu>;
  const inner = subjekt.typ === "org"
    ? <OrgProfil s={subjekt} onBack={onBack} toast={toast} onKampan={onKampan} onZavriet={onZavriet} />
    : <OsobaProfil s={subjekt as CudziSubjektOsoba} onBack={onBack} toast={toast} />;
  // org profil má na desktope dvojstĺpec → širší cap; osoba ostáva v čitateľskom stĺpci
  if (subjekt.typ === "org") return obalSiroky(inner, { wide, desktop, max: SIRKA.stlpec, maxDesktop: SIRKA.citanie }) as React.ReactElement;
  return wide ? <div style={{ maxWidth: SIRKA.stlpec, margin: "0 auto" }}>{inner}</div> : inner;
}

// ============================================================
// PROFIL ORGANIZÁCIE / CHARITY
// ============================================================
function OrgProfil({ s, onBack, toast, onKampan, onZavriet }: { s: CudziSubjektOrg; onBack?: () => void; toast?: Toast; onKampan?: (k: OrgKampan) => void; onZavriet?: () => void }) {
  const { desktop } = useLayout();
  const [tab, setTab] = useState("vsetko");
  const { sledujem, toggleSledovanie } = usePersonalizacia(); // sledovanie = zdieľaný store (Môj DEED)
  const [qr, setQr] = useState(false);
  const [menu, setMenu] = useState(false);
  const [zvoncek, setZvoncek] = useState(false);
  const [nahlasit, setNahlasit] = useState(false);
  const [kampanDetail, setKampanDetail] = useState<OrgKampan | null>(null); // vstavaný detail zbierky
  const [fotky, setFotky] = useState(false);   // sheet „Fotky profilu" (profilová + titulná)
  const meno = s.meno || "Detská nemocnica — nadácia";
  const org = najdiOrg(meno); // register: cover, logo, o nás, štatistiky, kampane s fotkami
  // TEST REŽIM: prihlásený smie prehodiť profilovku aj titulku na KAŽDOM profile.
  // najdiOrg už nahraté fotky domerguje (vidno ich aj v adresári a vo feede) —
  // hook tu drží zápis a prekreslenie po zmene.
  const [vlastne, zmenFotky] = useFotkyEntity(klucEntity("org", meno));
  const smiemUpravit = FOTO_TEST_REZIM;
  const logo = org.logo;
  const cover = org.cover;
  const sleduje = sledujem(meno);
  const level = s.level || org.level;
  const [onasViac, setOnasViac] = useState(false);
  const kampane = org.kampane;
  const akcie = org.akcie;
  const otvorKampan = (k: OrgKampan) => { if (onKampan) onKampan(k); else setKampanDetail(k); };

  const zdielajProfil = () => void zdielaj({ titul: meno, text: meno, url: aktualnaUrl() }, toast ?? (() => {}));
  const skopirujOdkaz = async () => {
    try { await navigator.clipboard.writeText(aktualnaUrl()); toast?.("Odkaz skopírovaný"); } catch { zdielajProfil(); }
  };

  const obsahBlok = (
    <>
      <TabyProfil
        options={["vsetko", "kampane", "skutky", "talent"] as const}
        labels={{ vsetko: "Všetko", kampane: "Kampane", skutky: "Skutky", talent: "Iskry" }}
        badges={{ vsetko: kampane.length + akcie.length, kampane: kampane.length }}
        value={tab} onChange={setTab} ariaLabel="Sekcie profilu organizácie"
      />
      {(tab === "vsetko" || tab === "kampane") && (<>
        {kampane.map((k) => (
          <div key={k.id} {...pressable(() => otvorKampan(k), k.nazov)} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
              <Foto src={k.foto} emoji={k.emoji} w={52} h={44} radius={RADIUS.xs} sizes="52px" alt={k.nazov} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.nazov}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.lok}{k.ludia ? ` · ${k.ludia} darcov` : ""}</div>
              </div>
              <span style={{ color: C.textTer, fontSize: 15, flex: "none" }}>›</span>
            </div>
            <div style={{ marginTop: SPACE.xs }}><MoniBar vyzbierane={k.vyzbierane} ciel={k.ciel} mini /></div>
          </div>
        ))}
        <div style={{ fontSize: 11, letterSpacing: ".05em", color: C.textTer, fontWeight: 800, margin: `${SPACE.gutter}px 0 ${SPACE.xs}px` }}>NADCHÁDZAJÚCE</div>
        {akcie.map((a, i) => (
          <div key={i} {...pressable(() => toast?.(`Akcia: ${a.nazov}`), a.nazov)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line2}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
          <span style={{ flex: "none", fontSize: 11, fontWeight: 800, color: "var(--a-info)", background: tintVar("var(--a-info)", .12), borderRadius: RADIUS.xs, padding: `${SPACE.xs}px ${SPACE.xs}px`, textAlign: "center", lineHeight: 1.2 }}>{a.kedy}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.nazov}</div><div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>{a.kde}</div></div>
            <span style={{ color: C.textTer, fontSize: 15, flex: "none" }}>›</span>
          </div>
        ))}
      </>)}
      {tab === "skutky" && <div style={{ padding: `${SPACE.lg}px 0`, textAlign: "center", color: C.textTer, fontSize: 13 }}>Skutky a vďakypočiny organizácie.</div>}
      {tab === "talent" && <div style={{ padding: `${SPACE.lg}px 0`, textAlign: "center", color: C.textTer, fontSize: 13 }}>Iskry, krátke videá.</div>}
    </>
  );

  // O nás priamo pod hlavičkou — 3 riadky, zvyšok na „viac"
  const oNasKratky = (
    <div style={{ fontSize: 13, lineHeight: 1.5, color: C.textSec }}>
      <span style={onasViac ? undefined : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{org.onas}</span>
      {org.onas.length > 140 && (
        <span {...pressable(() => setOnasViac((v) => !v), onasViac ? "Zbaliť" : "Zobraziť viac")}
          style={{ display: "inline-block", marginTop: 2, fontSize: 12.5, fontWeight: 700, color: "var(--a-info)", cursor: "pointer" }}>
          {onasViac ? "menej" : "viac"}
        </span>
      )}
    </div>
  );

  const oNasBlok = null;

  const doveraBlok = null;

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      {onZavriet && onBack ? (
        <CestaHlavicka onBack={onBack} onZavriet={onZavriet}
          right={<span {...pressable(() => setMenu(true), "Ďalšie možnosti")} style={{ display: "flex", cursor: "pointer" }}><IkonaMoznosti size={18} color={C.textSec} /></span>} />
      ) : (
      <BackHeader onBack={onBack} right={
        <span {...pressable(() => setMenu(true), "Ďalšie možnosti")} style={{ display: "flex", cursor: "pointer" }}><IkonaMoznosti size={18} color={C.textSec} /></span>
      }>
        <span style={{ fontSize: 12, color: C.textSec }}>{meno}</span>
      </BackHeader>
      )}
      <div style={{ height: SPACE.sm }} />

      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <EntityHero
          avatar={<img src={logo} alt={meno} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          cover={cover}
          onAvatar={smiemUpravit ? () => setFotky(true) : undefined}
          onCover={smiemUpravit ? () => setFotky(true) : undefined}
          meno={meno} overene overeneLabel="Overená charita"
          podtitul={s.lok || org.lok}
          vpravo={<StityRad variant="hlavicka" hlavny={naStitLevel(level)} oblasti={stityOblastiSubjektu(meno, naStitLevel(level))} meno={meno} velkost={desktop ? 96 : 76} />}
          podMenom={oNasKratky}
          stats={[
            { hodnota: org.stat.vyzbierane, label: "Vyzbierané" },
            { hodnota: org.stat.skutky, label: "Skutky" },
            { hodnota: org.stat.snami, label: "S nami" },
          ]}
          akcie={<>
            <BtnAkcia variant={sleduje ? "secondary" : "primary"} ariaPressed={sleduje}
              onClick={() => { toggleSledovanie({ meno, typ: "org", emoji: s.emoji }); toast?.(sleduje ? "Prestal si sledovať" : "Sleduješ — dostaneš upozornenia na kampane"); }}>
              {sleduje ? "✓ Sledované" : "Sledovať"}
            </BtnAkcia>
            <BtnAkcia variant="secondary" onClick={zdielajProfil}><Zdielanie size={14} /> Zdieľať</BtnAkcia>
            <BtnIkonka label="QR kód profilu" text="QR" onClick={() => setQr(true)}><IkonaQr size={18} /></BtnIkonka>
            <BtnIkonka label={zvoncek ? "Vypnúť upozornenia" : "Zapnúť upozornenia"} aktivne={zvoncek} farba="var(--a-gold)"
              onClick={() => { setZvoncek((v) => !v); toast?.(zvoncek ? "Upozornenia vypnuté" : "Upozornenia na kampane a akcie zapnuté"); }}>
              <Zvon size={16} />
            </BtnIkonka>
            <BtnIkonka label="Ďalšie možnosti" onClick={() => setMenu(true)}><IkonaMoznosti size={16} /></BtnIkonka>
          </>}
        />
        <div style={{ height: SPACE.gutter }} />
        {desktop
          ? <DvaStlpce hlavny={obsahBlok} bok={<>{oNasBlok}{doveraBlok}</>} />
          : <>{oNasBlok}{obsahBlok}<div style={{ height: SPACE.gutter }} />{doveraBlok}</>}
      </div>

      {menu && (
        <KontextMenu onClose={() => setMenu(false)} polozky={[
          { ikona: <Zdielanie size={17} />, label: "Zdieľať profil", onClick: zdielajProfil },
          { ikona: <IkonaOdkaz size={17} />, label: "Kopírovať odkaz", onClick: () => void skopirujOdkaz() },
          { ikona: <IkonaQr size={17} />, label: "QR kód a embed", popis: "Na tlač alebo vlastný web", onClick: () => setQr(true) },
          { ikona: <IkonaVlajka size={16} />, label: "Nahlásiť profil", danger: true, onClick: () => setNahlasit(true) },
        ]} />
      )}
      {nahlasit && <NahlasitSheet co={`Profil · ${meno}`} refId={meno} modul="charity" onClose={() => setNahlasit(false)} toast={toast ?? (() => {})} />}
      {qr && <QrModal typ="skutok" titul={`QR profilu · ${meno}`} popis="Odznak dôvery s odkazom na profil" odkaz={qrUrl("org", "detska-nemocnica")} onClose={() => setQr(false)} toast={toast} />}
      {kampanDetail && <KampanSheet k={kampanDetail} org={meno} toast={toast} onClose={() => setKampanDetail(null)} />}

      {/* fotky profilu — profilová aj titulná zvlášť (test režim: aj na cudzom profile) */}
      {fotky && (
        <FotoProfiluSheet
          titul={`Fotky profilu · ${meno}`}
          popis="Profilová fotka a titulná fotka tohto profilu."
          foto={vlastne.avatar ?? logo} nahrada={s.emoji ? <Emo e={s.emoji} /> : meno[0]}
          onZmena={(url) => { zmenFotky({ avatar: url }); toast?.(url ? "Profilová fotka uložená" : "Profilová fotka vrátená na pôvodnú"); }}
          cover={vlastne.cover ?? cover}
          onCover={(url) => { zmenFotky({ cover: url }); toast?.(url ? "Titulná fotka uložená" : "Titulná fotka vrátená na pôvodnú"); }}
          coverPopis="Široká fotka na pozadí hlavičky profilu — vidí ju každý návštevník."
          onClose={() => setFotky(false)} />
      )}
    </div>
  );
}

// ---- vstavaný detail kampane — reálne darovanie (foto, progres, podpora, darcovia) ----
// Používa sa tam, kde modul nedodá vlastný natívny detail (Top, Help, Good).
function KampanSheet({ k, org, toast, onClose }: { k: OrgKampan; org: string; toast?: Toast; onClose: () => void }) {
  const [suma, setSuma] = useState(k.vyzbierane);
  const [ludia, setLudia] = useState(k.ludia ?? 0);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  const [qrKampan, setQrKampan] = useState(false); // QR kampane (§10) — sken → dar
  const ja = usePouzivatel();
  const darRef = `org-kampan-${k.id}`;

  const podpor = (hodnota: number) => {
    setSuma((s) => s + hodnota * 0.01);
    setLudia((l) => l + 1);
    pridajDar({ refId: darRef, suma: hodnota * 0.01, kanal: "deed", registrovany: ja.typ !== "pasivny" });
    toast?.(`Ďakujeme za ${hodnota} DeeD · ${k.nazov}`);
  };

  return (
    <>
      <Sheet onClose={onClose} label={k.nazov}>
        <Foto src={k.foto} emoji={k.emoji} h={150} radius={RADIUS.md} alt={k.nazov} />
        <div style={{ fontSize: 16.5, fontWeight: 800, margin: `${SPACE.sm}px 0 2px` }}>{k.nazov}</div>
        <div style={{ fontSize: 11.5, color: C.textTer, marginBottom: SPACE.sm }}>{org}{k.lok ? ` · ${k.lok}` : ""}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: C.textSec, marginBottom: SPACE.sm }}>{k.popis}</div>
        <div style={{ marginBottom: SPACE.sm }}><ProgresBox suma={suma} ciel={k.ciel} ludia={ludia} /></div>
        <PlatobnyModul zbalene
          onShare={() => void zdielaj({ titul: k.nazov, text: k.nazov, url: aktualnaUrl() }, toast ?? (() => {}))}
          upvotes={ludia} onUpvote={() => toast?.("❤")}
          onPodpor={(d: number) => podpor(d)}
          onKanal={(kanal: string) => setPlatba(kanal as Kanal)}
          oblubene={{ refId: k.id, typ: "charita", modul: "charity", nazov: k.nazov, lok: k.lok, ciel: k.ciel, vyzbierane: suma }} toast={toast}
          qr={{ label: "QR tejto kampane", onClick: () => setQrKampan(true) }} />
        <div style={{ marginTop: SPACE.gutter }}>
          <ZoznamDarcov refId={darRef} celkom={ludia} />
        </div>
      </Sheet>
      {qrKampan && <QrModal odznak={odznakZbierky(k.id)} typ="platba" titul={`QR · ${k.nazov}`} popis={`${org}${k.lok ? ` · ${k.lok}` : ""}`}
        qrCiel={{ druh: "case", ref: String(k.id), modul: "charity" }} onClose={() => setQrKampan(false)} toast={toast} />}
      {platba && <PlatbaModal kanal={platba} komu={k.nazov} onClose={() => setPlatba(null)}
        onDone={(s: number, volba?: VolbaDaru) => {
          setSuma((x) => x + s * (platba === "DEED" ? 0.01 : 1));
          setLudia((l) => l + 1);
          pridajDar({ refId: darRef, suma: s * (platba === "DEED" ? 0.01 : 1), kanal: platba === "EUR" ? "psp" : "deed", registrovany: ja.typ !== "pasivny", volba });
          toast?.(`Odoslané ${platba === "EUR" ? s + " €" : platba === "EURC" ? s + " EURC" : s + " DeeD"} · ${k.nazov}`);
        }} />}
    </>
  );
}

// ============================================================
// PROFIL OSOBY (3 stavy)
// ============================================================
function OsobaProfil({ s, onBack, toast }: { s: CudziSubjektOsoba; onBack?: () => void; toast?: Toast }) {
  // demo: prepínač stavu (v reále stav určuje vzťah + súhlas)
  const [stav, setStav] = useState<string>(s.stav || "bezna");
  const [pridane, setPridane] = useState(false);
  const [fotky, setFotky] = useState(false);
  const { sledujem, toggleSledovanie } = usePersonalizacia(); // sledovanie = zdieľaný store (Môj DEED)
  const meno = s.meno || "Ján Novák";
  const sleduje = sledujem(meno);
  const level = s.level || "Silver";
  const farba = stav === "tvorca" ? "var(--a-plum)" : stav === "priatel" ? "var(--a-green)" : "var(--a-info)";
  // TEST REŽIM: fotky sa dajú nastaviť aj cudzej osobe (profilová + titulná zvlášť)
  const [vlastne, zmenFotky] = useFotkyEntity(klucEntity("osoba", meno));
  const smiemUpravit = FOTO_TEST_REZIM;

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackHeader onBack={onBack}>
        <span style={{ fontSize: 12, color: C.textSec }}>{meno}</span>
      </BackHeader>
      <div style={{ height: SPACE.sm }} />

      {/* náhľad stavu (DEV) — v reále určuje vzťah a súhlas */}
      <div style={{ margin: `0 ${SPACE.md}px ${SPACE.sm}px`, border: `1px dashed ${tintVar("var(--a-plum)", .4)}`, borderRadius: RADIUS.sm, padding: SPACE.xs }}>
        <SegTabs
          options={STAVY.map(([k]) => k)}
          value={stav}
          onChange={(k) => { setStav(k); setPridane(false); }}
          ariaLabel="Náhľad stavu profilu"
          style={{ display: "flex", gap: SPACE.xs }}
          render={(k, on) => {
            const l = (STAVY.find(([sk]) => sk === k) || [k, k])[1];
            return <span style={{ flex: 1, textAlign: "center", padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.xs, fontSize: 11, fontWeight: on ? 800 : 600, cursor: "pointer",
              background: on ? tintVar(farba, .12) : "transparent", border: `1px solid ${on ? tintVar(farba, .45) : "transparent"}`, color: on ? farba : C.textTer }}>{l}</span>;
          }}
        />
      </div>

      <div style={{ padding: `0 ${SPACE.md}px` }}>
        {/* hero osoby — cover podľa stavu (alebo nahratá titulná), avatar, meno + stavový chip */}
        <div style={{ position: "relative", ...(vlastne.cover ? { aspectRatio: MEDIA_AR } : { height: 96 }), borderRadius: RADIUS.md, overflow: "hidden", background: `linear-gradient(160deg, ${tintVar(farba, .3)}, ${tintVar(farba, .08)})`, transition: "background .3s ease" }}>
          {vlastne.cover && <img src={vlastne.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          {smiemUpravit && <ZmenitPill onClick={() => setFotky(true)} />}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: SPACE.sm, marginTop: -30, padding: `0 ${SPACE.sm}px`, position: "relative", zIndex: 1 }}>
          <span {...(smiemUpravit ? pressable(() => setFotky(true), "Profilová fotka") : {})}
            style={{ position: "relative", flex: "none", borderRadius: RADIUS.round, border: `3px solid var(--c-bg)`, boxShadow: "0 2px 10px rgba(0,0,0,.18)", cursor: smiemUpravit ? "pointer" : "default" }}>
            {vlastne.avatar
              ? <img src={vlastne.avatar} alt={meno} style={{ width: 68, height: 68, borderRadius: RADIUS.round, objectFit: "cover", display: "block" }} />
              : <Aura size={68} hrubka={2}><span style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>{meno[0]}</span></Aura>}
            {smiemUpravit && <KamerkaBadge size={22} />}
          </span>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
            <div style={{ fontSize: 16.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meno}</span>
              {jeHrdina(level) && <span style={tagChip(HRDINA_COL)}>Hrdina</span>}
            </div>
            <div style={{ fontSize: 11.5, color: farba, fontWeight: 700, marginTop: 2 }}>
              {stav === "tvorca" ? "Lektor · gitara" : stav === "priatel" ? `Priateľ · ${level}` : level}
            </div>
          </div>
        </div>
        <div style={{ height: SPACE.gutter }} />

        {/* ---- BEŽNÁ ---- */}
        {stav === "bezna" && (<>
          <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.gutter }}>
            <BtnAkcia variant={pridane ? "secondary" : "primary"} onClick={() => { if (!pridane) { setPridane(true); toast?.("Žiadosť o priateľstvo odoslaná — čaká na súhlas"); } }}>
              {pridane ? "Žiadosť odoslaná ✓" : "Pridať priateľa"}
            </BtnAkcia>
          </div>
          <MenuSkupina>
            <div style={{ padding: `${SPACE.xl}px ${SPACE.md}px`, textAlign: "center" }}>
              <div style={{ fontSize: 30 }}>🔒</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: SPACE.xs }}>Súkromný profil</div>
              <div style={{ fontSize: 12.5, color: C.textTer, marginTop: SPACE.xs, lineHeight: 1.5 }}>Skutky a aktivita sú súkromné. Po prijatí priateľstva uvidíš o tejto osobe viac.</div>
            </div>
          </MenuSkupina>
          <div style={{ fontSize: 11, color: C.textTer, textAlign: "center", lineHeight: 1.5 }}>Bežnú osobu nemožno jednostranne sledovať — len priateľstvo so vzájomným súhlasom.</div>
        </>)}

        {/* ---- PRIATEĽ ---- */}
        {stav === "priatel" && (<>
          <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.gutter }}>
            <BtnAkcia variant="secondary" ariaPressed><IkonaFajka size={15} color="var(--a-green)" /> Priateľ</BtnAkcia>
            <BtnAkcia variant="primary" onClick={() => toast?.("Správa (len medzi priateľmi)")}>Správa</BtnAkcia>
          </div>
          <MenuSkupina nadpis="SPOLOČNÉ">
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
              <IkonaUsmev size={18} color="var(--a-info)" /><span style={{ fontSize: 13.5 }}>3 spoloční priatelia</span>
            </div>
          </MenuSkupina>
          <MenuSkupina nadpis="NEDÁVNE SKUTKY">
            {["Čistenie brehu Váhu", "Odviezol suseda na dialýzu"].map((t, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderBottom: i < arr.length - 1 ? `1px solid ${C.line2}` : "none" }}>
                <IkonaFajka size={15} color="var(--a-green)" /><span style={{ fontSize: 13.5 }}>{t}</span>
              </div>
            ))}
          </MenuSkupina>
          <div style={{ fontSize: 11, color: C.textTer, textAlign: "center" }}>Vidíš, lebo ste priatelia — a len to, čo osoba dovolila.</div>
        </>)}

        {/* ---- TVORCA ---- */}
        {stav === "tvorca" && (<>
          <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.gutter }}>
            <BtnAkcia variant={sleduje ? "secondary" : "primary"} ariaPressed={sleduje}
              onClick={() => { toggleSledovanie({ meno, typ: "osoba" }); toast?.(sleduje ? "Prestal si sledovať" : "Sleduješ tvorcu"); }}>
              {sleduje ? "✓ Sledované" : "Sledovať"}
            </BtnAkcia>
            <BtnIkonka label="Zdieľať profil" onClick={() => void zdielaj({ titul: meno, text: meno, url: aktualnaUrl() }, toast ?? (() => {}))}><Zdielanie size={16} /></BtnIkonka>
          </div>
          <MenuSkupina nadpis="PONUKA">
            <div {...pressable(() => toast?.("Rezervácia výučby"), "Rezervácia výučby")} style={{ padding: SPACE.gutter, cursor: "pointer" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Výučba gitary pre začiatočníkov</div>
              <div style={{ fontSize: 12, color: C.textTer, marginTop: SPACE.xxs }}>8 rokov praxe · od 15 €/h</div>
            </div>
          </MenuSkupina>
          <MenuSkupina nadpis="ISKRY">
            <div {...pressable(() => toast?.("Iskry"), "Iskry")} style={{ height: 120, background: "linear-gradient(160deg, #1a1430, #2c2350)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <span style={{ width: 54, height: 54, borderRadius: RADIUS.round, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><IkonaPlay size={22} color="#fff" /></span>
            </div>
          </MenuSkupina>
          <div style={{ fontSize: 11, color: C.textTer, textAlign: "center" }}>Profil je verejný, lebo osoba dobrovoľne ponúka službu.</div>
        </>)}
      </div>

      {fotky && (
        <FotoProfiluSheet
          titul={`Fotky profilu · ${meno}`}
          popis="Profilová fotka a titulná fotka tohto profilu."
          foto={vlastne.avatar} nahrada={meno[0]}
          onZmena={(url) => { zmenFotky({ avatar: url }); toast?.(url ? "Profilová fotka uložená" : "Profilová fotka odstránená"); }}
          cover={vlastne.cover}
          onCover={(url) => { zmenFotky({ cover: url }); toast?.(url ? "Titulná fotka uložená" : "Titulná fotka odstránená"); }}
          onClose={() => setFotky(false)} />
      )}
    </div>
  );
}
