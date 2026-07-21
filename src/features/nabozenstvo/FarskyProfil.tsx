import { useEffect, useState } from "react";
import { SPACE, RADIUS } from "@/theme";
import { MEDIA_AR } from "@/lib/cardSize";
import {
  Foto, BackHeader, ProgresBox, PodporaSekcia, PlatbaModal, RecurringSheet, QrModal,
  MoniBar, Switch, Input, EmptyState, useStrankaAkcie,
  Zdielanie, IkonaVlajka, IkonaOpakovat, IkonaDoska, IkonaFoto, IkonaPlus, IkonaOko, IkonaNastavenia, Srdce, tint, useGaleria, useLayout,
  ZoznamDarcov, FormatovanyText, RichTextInput, FotoUpload, VideoEmbed, vlozenieVidea,
  StatRad, BtnAkcia, BtnIkonka, KontextMenu, MenuSkupina, MenuHlavicka, MenuPolozka, DvaStlpce,
  IkonaMoznosti, IkonaQr, IkonaKalendar, IkonaMegafon, IkonaCeruzka,
} from "@/shared";
import { pridajDar, type VolbaDaru } from "@/lib/darcovia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { pressable } from "@/components/pressable";
import { NahlasitSheet } from "@/components/nahlasit";
import type { Kanal } from "@/types";
import { N, Overena, SheetPanel, PrehladTile, A9Potvrdenie } from "./ui";
import { SelfAddSheet, nacitajSelfAdd } from "./UserOznamy";
import { ParteMiniatura } from "./SmutocnyOznam";
import { nacitajStav, ulozStav } from "./stav";
import { cistyText } from "@/lib/richtext";
import { obsahFarnosti, farnostStat, KAT_FARBA, vlastnePrispevkyVsetky, zmazPrispevok, pridajPrispevok, upravPrispevok, predvoleneKostoly, type Farnost, type NabozFeedItem, type NabozTyp, type FararInfo, type OsobaFarnosti, type KostolFarnosti } from "./mock";
import { usePrispevkySync } from "./prispevkyDB";

type ViditSum = "zobrazit" | "skryt" | "len-farar";
const VIDIT_LABEL: Record<ViditSum, string> = { zobrazit: "zobraziť", skryt: "skryť", "len-farar": "len farár" };

/*
  ============================================================
  FARSKÝ PROFIL — plnohodnotné rozhranie cirkvi (donation-first §L, role-aware).
  Poradie: foto → identita + stat hlavička → (domovská) prepínač správy → sledovať →
  [SPRÁVCA] prehľad (dashboard) + panel + editácia profilu →
  všeobecná podpora + QR → kampane → udalosti → kontakt → taby obsahu → doklady.
  · USER = prezeranie + dar + sledovať
  · SPRÁVCA (farár, len na mojej domovskej) = prehľad, editácia profilu, kalendár, „+", Split QR…
  Farnosť je MIMO karmy — len badge „overená". Každá kampaň má vlastné darovanie (§57).
  ============================================================
*/

const TABY: { key: NabozTyp; label: string }[] = [
  { key: "zbierka", label: "Zbierky" }, { key: "udalost", label: "Udalosti" },
  { key: "oznam", label: "Oznamy" }, { key: "dobrovolnictvo", label: "Dobrovoľníctvo" },
];

const eur = (n: number) => Math.round(n).toLocaleString("sk-SK");

export function FarskyProfil({ farnost, farar, jeDomovska, following, onToggleFollow, onToggleSpravca, onSetHome, onBack, onDetail, onKalendar, onPridat, toast }: {
  farnost: Farnost; farar: boolean; jeDomovska?: boolean; following?: boolean;
  onToggleFollow?: () => void; onToggleSpravca?: () => void; onSetHome?: () => void;
  onBack: () => void; onDetail: (it: NabozFeedItem) => void; onKalendar: () => void; onPridat: () => void; toast: (m: string) => void;
}) {
  const { wide } = useLayout();
  const otvorGaleriu = useGaleria();
  const [suma, setSuma] = useState(farnost.vyzbierane);
  const [ludia, setLudia] = useState(farnost.podpora);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  const [recur, setRecur] = useState(false);
  const [qr, setQr] = useState<"donacny" | "zdielat" | null>(null);
  const [sprava, setSprava] = useState(false); // editácia profilu (sheet)
  const [potvrdHome, setPotvrdHome] = useState(false); // A9 potvrdenie „nastaviť ako moju cirkev"
  const [nahlasit, setNahlasit] = useState(false); // nahlásenie profilu (z ⋯ menu)
  const [menu, setMenu] = useState(false); // ⋯ kontextové menu profilu
  const [moderacia, setModeracia] = useState(false); // správca: moderácia oznamov farníkov
  const [viditOpen, setViditOpen] = useState(false); // správca: viditeľnosť súm (§72)
  const [viditSum, setViditSum] = useState<ViditSum>(() => nacitajStav<ViditSum>("viditelnost", farnost.id, "zobrazit"));
  const [selfAddOpen, setSelfAddOpen] = useState(false); // správca: oznamy od farníkov ON/OFF + poplatok
  // editovateľný pohľad profilu (mock — perzistovaný do localStorage per farnost.id);
  // staršie uložené profily nemajú farára/osoby/kostoly → domergujú sa defaulty
  const [view, setView] = useState<ProfilView>(() => {
    const def = predvolenyProfil(farnost);
    const ulozene = nacitajStav<Partial<ProfilView>>("profil", farnost.id, {});
    return { ...def, ...ulozene, farar: { ...def.farar, ...ulozene.farar } };
  });
  const ja = usePouzivatel(); // registrovaný vs pasívny — určuje zápis do zoznamu darcov
  const darRef = `farnost-${farnost.id}`; // kľúč všeobecnej podpory v zozname darcov

  const syncVerzia = usePrispevkySync(farnost.id); // DB → LS zrkadlo (príspevky + profil z iných zariadení)
  useEffect(() => { // po syncu znova prečítaj profil/viditeľnosť z LS (useState initializery sa nere-initnú)
    if (!syncVerzia) return;
    const def = predvolenyProfil(farnost);
    const ulozene = nacitajStav<Partial<ProfilView>>("profil", farnost.id, {});
    setView({ ...def, ...ulozene, farar: { ...def.farar, ...ulozene.farar } });
    setViditSum(nacitajStav<ViditSum>("viditelnost", farnost.id, "zobrazit"));
  }, [syncVerzia]);
  const obsah = obsahFarnosti(farnost.id);
  const stat = farnostStat(farnost.id);
  const maKontakt = !!(view.adresa || view.tel || view.email || view.web || view.omseSuhrn);

  // vlastný FAB profilu (parish-scoped) — deps [farnost.id, farar] (profil→profil sa neremountuje bez key)
  // farár = celý strom pridania; USER = len oznam (PridatSheet ponuku zúži podľa roly)
  useStrankaAkcie(() => ({
    pridat: { id: "add", label: farar ? "Pridať do farnosti" : "Pridať oznam", onClick: onPridat },
    extra: farar ? [{ id: "kal", label: "Kalendár & rozvrh", popis: "Omše, sviatky, udalosti", ikona: <IkonaDoska size={18} color={N.ind} />, onClick: onKalendar }] : [],
  }), [farnost.id, farar]);

  // počítadlo aj zoznam darcov rastú z JEDNÉHO miesta (konzistentné čísla)
  function podpor(hodnota: number, text: string, kanal: "deed" | "sms" = "deed") { setSuma((s) => s + hodnota * 0.01); setLudia((l) => l + 1); pridajDar({ refId: darRef, suma: hodnota * 0.01, kanal, registrovany: kanal !== "sms" && ja.typ !== "pasivny" }); toast(text); }
  function platbaHotova(s: number, volba?: VolbaDaru) { setSuma((x) => x + s * (platba === "EUR" ? 1 : 0.01)); setLudia((l) => l + 1); pridajDar({ refId: darRef, suma: s * (platba === "EUR" ? 1 : 0.01), kanal: platba === "EUR" ? "psp" : "deed", registrovany: ja.typ !== "pasivny", volba }); toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DEED"} · ${farnost.nazov}`); }

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackHeader onBack={onBack} right={
        <span {...pressable(() => setMenu(true), "Ďalšie možnosti")} style={{ display: "flex", cursor: "pointer" }}><IkonaMoznosti size={18} color={N.txt2} /></span>
      }>
        <span style={{ fontSize: 12, color: N.txt2 }}>⛪ {farnost.skratka}</span>
      </BackHeader>
      <div style={{ height: SPACE.sm }} />

      {/* hero foto (+ správca: zmeniť foto) */}
      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : {}) }}>
          <Foto src={view.foto} emoji="⛪" h={wide ? "100%" : 210} w={wide ? "100%" : undefined} radius={14} onClick={() => otvorGaleriu([view.foto], 0)} />
          {farar && (
            <span {...pressable(() => setSprava(true), "Zmeniť foto")} style={{ position: "absolute", bottom: 10, right: 10, display: "inline-flex", alignItems: "center", gap: SPACE.xxs, fontSize: 11.5, fontWeight: 700, color: "#fff", background: "rgba(8,11,18,.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.18)", padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.xs, cursor: "pointer" }}>
              <IkonaFoto size={13} color="#fff" /> Upraviť
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px 0` }}>
        {/* hlavička farnosti */}
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs }}>
          {/* logo farnosti (Role Panely PATCH 2 §6 — „aj farnosť dodatočne"); fallback ⛪ */}
          <span style={{ width: 42, height: 42, borderRadius: RADIUS.sm, flex: "none", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: N.indBg }}>
            {view.logo ? <img src={view.logo} alt={farnost.skratka} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "⛪"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: SPACE.xs }}>{farnost.nazov} <Overena /></div>
            <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>📍 {farnost.obec}{farnost.kostol ? ` · ${farnost.kostol}` : ""}{(view.farar.meno || farnost.farar) ? ` · ${view.farar.meno || farnost.farar}` : ""}</div>
          </div>
        </div>

        {/* stat hlavička (bez karmy — len fakty) */}
        <div style={{ marginBottom: SPACE.sm }}>
          <StatRad kompakt stats={[
            { hodnota: (farnost.sledovatelia ?? 0).toLocaleString("sk-SK"), label: "sledujúcich" },
            { hodnota: stat.zbierky, label: stat.zbierky === 1 ? "zbierka" : "zbierky" },
            ...(farnost.zalozena ? [{ hodnota: farnost.zalozena, label: "založená", farba: N.gold }] : []),
          ]} />
        </div>

        {/* popis (história, založenie, výnimočnosti) — formátovaný text (odseky prežijú) */}
        <div style={{ fontSize: 14, lineHeight: 1.55, color: N.txt2, margin: `${SPACE.xs}px 0 ${SPACE.gutter}px` }}>
          <FormatovanyText text={view.popis} />
        </div>

        {/* video farnosti — LEN embed (YouTube/Vimeo), nič nehostujeme */}
        {vlozenieVidea(view.video) && (
          <div style={{ margin: `0 0 ${SPACE.gutter}px` }}>
            <VideoEmbed url={view.video!} radius={14} />
          </div>
        )}

        {/* nastaviť túto cirkev ako moju domovskú (zobrazí sa navrchu Náboženstva) */}
        {!jeDomovska && onSetHome && (
          potvrdHome ? (
            <div style={{ marginBottom: SPACE.sm }}>
              <A9Potvrdenie nazov={farnost.nazov} onConfirm={() => { onSetHome(); setPotvrdHome(false); }} onCancel={() => setPotvrdHome(false)} />
            </div>
          ) : (
            <button onClick={() => setPotvrdHome(true)} style={{ width: "100%", height: 44, border: `1px solid ${N.goldEdge}`, background: N.goldBg, color: N.gold, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, marginBottom: SPACE.sm }}>★ Nastaviť ako moju cirkev</button>
          )
        )}
        {jeDomovska && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, fontSize: 12.5, fontWeight: 700, color: N.gold, background: N.goldBg, border: `1px solid ${N.goldEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm }}>★ Toto je tvoja domovská cirkev</div>
        )}

        {/* kontextový prepínač správy — LEN na profile mojej domovskej cirkvi */}
        {jeDomovska && onToggleSpravca && (
          <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: farar ? N.goldBg : N.card, border: `1px solid ${farar ? N.goldEdge : N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm, cursor: "pointer" }}>
            <span style={{ fontSize: 16 }}>🛠</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: farar ? N.gold : N.txt }}>Spravovať farnosť</div>
              <div style={{ fontSize: 10.5, color: N.txt3 }}>Režim správcu — prehľad, editácia profilu a nástroje</div>
            </div>
            <Switch on={farar} onChange={onToggleSpravca} ariaLabel="Spravovať farnosť" />
          </label>
        )}

        {/* akčný rad profilu — Sledovať · Pridať oznam · Zdieľať (vzor business profilov) */}
        <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.gutter }}>
          {onToggleFollow && (
            <BtnAkcia variant={following ? "secondary" : "primary"} ariaPressed={following} onClick={onToggleFollow}>
              <Srdce size={14} filled={following} color={following ? N.green : "#fff"} /> {following ? "Sledované" : "Sledovať"}
            </BtnAkcia>
          )}
          {!farar && (
            <BtnAkcia variant="secondary" onClick={onPridat}><IkonaPlus size={14} /> Pridať oznam</BtnAkcia>
          )}
          <BtnIkonka label="Zdieľať profil" onClick={() => setQr("zdielat")}><Zdielanie size={16} /></BtnIkonka>
        </div>

        <DvaStlpce
          hlavny={<>
            {/* ===== [SPRÁVCA] PREHĽAD (dashboard) ===== */}
            {farar && (
              <>
                <SekciaNadpis>PREHĽAD FARNOSTI</SekciaNadpis>
                <div style={{ display: "flex", gap: SPACE.sm, marginBottom: SPACE.gutter }}>
                  <PrehladTile hodnota={(farnost.sledovatelia ?? 0).toLocaleString("sk-SK")} label="sledujúcich" />
                  <PrehladTile hodnota={`${eur(suma)} €`} label="darov spolu" color={N.green} />
                  <PrehladTile hodnota={stat.zbierky} label="aktívnych zbierok" color={N.gold} />
                  <PrehladTile hodnota={ludia} label="podporovateľov" />
                </div>
              </>
            )}

            {/* ===== PLATOBNÝ MODUL — VŠEOBECNÁ PODPORA FARNOSTI ===== */}
            <div style={{ fontSize: 11, fontWeight: 800, color: N.txt3, letterSpacing: ".04em", marginBottom: SPACE.xs }}>VŠEOBECNÁ PODPORA FARNOSTI</div>
            <div style={{ marginBottom: SPACE.sm }}><ProgresBox suma={suma} ciel={farnost.ciel} ludia={ludia} /></div>
            {/* farár si nedaruje sám — darovacie UI vidia len návštevníci */}
            {!farar && (
              <div style={{ marginBottom: SPACE.sm }}>
                <PodporaSekcia
                  onShare={() => setQr("zdielat")}
                  upvotes={ludia} onUpvote={() => toast("❤")} reakcia="srdce"
                  onPodpor={(s: number) => podpor(s, `Ďakujeme za ${s} DEED pre ${farnost.nazov}`)} onSms={() => podpor(100, "SMS podpora", "sms")}
                  onKanal={(k: string) => setPlatba(k as Kanal)} accent={N.ind} supLabel="RÝCHLY DAR — klik a hneď odíde" />
              </div>
            )}
            <div style={{ display: "flex", gap: SPACE.sm, marginBottom: SPACE.xs }}>
              <div onClick={() => setRecur(true)} style={{ flex: 1, border: `1px solid ${N.indEdge}`, background: N.indBg, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center", fontSize: 13, fontWeight: 700, color: N.ind, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
                <IkonaOpakovat size={16} color={N.ind} /> Opakovaný dar
              </div>
              <div onClick={() => setQr(farar ? "donacny" : "zdielat")} style={{ flex: 1, border: `1px solid ${N.line}`, background: N.card, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center", fontSize: 13, fontWeight: 700, color: N.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
                <IkonaQr size={15} /> {farar ? "QR na tlač" : "QR na dar"}
              </div>
            </div>
            {/* zoznam darcov — až pod opakovaným darom / QR, rovnaké číslo ako počítadlo */}
            <div style={{ marginBottom: SPACE.gutter }}>
              <ZoznamDarcov refId={darRef} celkom={ludia} />
            </div>

            {/* ===== [SPRÁVCA] PANEL — nástroje správcu (jednotný settings list) =====
                Poradie podľa DEED_Sprava_Profil_Farnosti_DEV §2. „Pridať kampaň" preč
                (duplicita s „+"), „Spoločná zbierka" preč (split = vlastnosť zbierky).
                „QR na tlač" je dole. */}
            {farar && (
              <MenuSkupina hlavicka={
                <MenuHlavicka ikona={<IkonaNastavenia size={15} />} farba={N.gold} label="SPRÁVA FARNOSTI"
                  popis="Nástroje správcu — vidí len farár a delegovaná rada" />
              }>
                <MenuPolozka ikona={<IkonaCeruzka size={16} />} farba={N.ind} label="Upraviť profil farnosti" popis="Foto, popis, video, farár a osoby, kostoly, kontakt" onClick={() => setSprava(true)} />
                <MenuPolozka ikona={<IkonaKalendar size={16} />} farba={N.info} label="Kalendár a rozvrh" popis="Omše, sviatky, udalosti farnosti" onClick={onKalendar} />
                <MenuPolozka ikona={<IkonaVlajka size={15} />} farba={N.clay} label="Moderácia príspevkov" popis="Oznamy farníkov — upraviť, zmazať alebo obnoviť" onClick={() => setModeracia(true)} />
                <MenuPolozka ikona={<IkonaMegafon size={16} />} farba={N.green} label="Oznamy od farníkov" hodnota={selfAddLabel(farnost.id)} popis="Povoliť pridávanie oznamov a voliteľný poplatok" onClick={() => setSelfAddOpen(true)} />
                <MenuPolozka ikona={<IkonaOko size={16} />} farba={N.ind} label="Viditeľnosť súm zbierok" hodnota={VIDIT_LABEL[viditSum]} popis="Čo vidia návštevníci profilu" onClick={() => setViditOpen(true)} />
                <MenuPolozka ikona={<IkonaQr size={16} />} farba={N.gold} label="QR na tlač do kostola" popis="Pokladnička, nástenka, lavice — sken otvorí darovanie" onClick={() => setQr("donacny")} posledna />
              </MenuSkupina>
            )}

            {/* ===== OBSAH FARNOSTI — všetky typy pod sebou (Zbierky / Udalosti / Oznamy / Dobrovoľníctvo) ===== */}
            <SekciaNadpis>OBSAH FARNOSTI</SekciaNadpis>
            {obsah.length === 0 ? (
              <EmptyState emoji="⛪" title="Zatiaľ žiadny obsah" text="Táto farnosť tu ešte nič nezverejnila." />
            ) : TABY.map(({ key, label }) => {
              const polozky = obsah.filter((it) => it.ntyp === key);
              if (polozky.length === 0) return null;
              return (
                <div key={key}>
                  <PodsekciaNadpis>{label} · {polozky.length}</PodsekciaNadpis>
                  {polozky.map((it) => key === "zbierka"
                    ? <KampanRiadok key={it.id} it={it} onClick={() => onDetail(it)} />
                    : <UdalostRiadok key={it.id} it={it} onClick={() => onDetail(it)} />)}
                </div>
              );
            })}
          </>}
          bok={<>
            {/* ===== KONTAKT + ČASY OMŠÍ ===== */}
            {maKontakt && (
              <>
                <SekciaNadpis>KONTAKT</SekciaNadpis>
                <div style={{ background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, display: "grid", gap: SPACE.xs }}>
                  {view.omseSuhrn && <KontaktRiadok ikona="🕑" label="Časy omší" hodnota={view.omseSuhrn} />}
                  {view.adresa && <KontaktRiadok ikona="📍" label="Adresa" hodnota={view.adresa} />}
                  {view.tel && <KontaktRiadok ikona="📞" label="Telefón" hodnota={view.tel} />}
                  {view.email && <KontaktRiadok ikona="✉" label="E-mail" hodnota={view.email} />}
                  {view.web && <KontaktRiadok ikona="🌐" label="Web" hodnota={view.web} />}
                </div>
              </>
            )}

            {/* ===== VEDENIE FARNOSTI — farár + roster osôb (Správa/Profil §3) ===== */}
            {(view.farar.meno || view.osoby.some((o) => o.meno.trim())) && (
              <>
                <SekciaNadpis>VEDENIE FARNOSTI</SekciaNadpis>
                <div style={{ background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, display: "grid", gap: SPACE.sm }}>
                  {view.farar.meno && <OsobaRiadok foto={view.farar.foto} meno={view.farar.meno} rola="farár · hlavný správca" zvyrazni />}
                  {view.osoby.filter((o) => o.meno.trim()).map((o, i) => (
                    <OsobaRiadok key={i} foto={o.foto} meno={o.meno} rola={o.rola.trim() || "člen farnosti"} />
                  ))}
                </div>
              </>
            )}

            {/* ===== KOSTOLY FARNOSTI — viacero pod jednou farnosťou, každý s časmi omší ===== */}
            {view.kostoly.some((k) => k.nazov.trim()) && (
              <>
                <SekciaNadpis>KOSTOLY FARNOSTI</SekciaNadpis>
                <div style={{ background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, display: "grid", gap: SPACE.sm }}>
                  {view.kostoly.filter((k) => k.nazov.trim()).map((k, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>⛪ {k.nazov}</div>
                      {k.adresa && <div style={{ fontSize: 11, color: N.txt3, marginTop: 2 }}>📍 {k.adresa}</div>}
                      {k.casyOmsi && <div style={{ fontSize: 11.5, color: N.txt2, marginTop: 2 }}>🕑 {k.casyOmsi}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== DOKLADY O POUŽITÍ ===== */}
            <div style={{ marginTop: SPACE.gutter, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, fontSize: 11.5, color: N.txt2, lineHeight: 1.5 }}>
              📄 <b>Doklady o použití prostriedkov zverejňujeme</b> — pri každej zbierke vidíš, kam šli peniaze.
            </div>
          </>}
        />
      </div>

      {platba && <PlatbaModal kanal={platba} komu={farnost.nazov} onClose={() => setPlatba(null)} onDone={platbaHotova} />}
      {recur && <RecurringSheet nazov={farnost.nazov} onClose={() => setRecur(false)} toast={toast} />}
      {menu && (
        <KontextMenu onClose={() => setMenu(false)} polozky={[
          { ikona: <Zdielanie size={17} />, label: "Zdieľať profil", onClick: () => setQr("zdielat") },
          { ikona: <IkonaQr size={17} />, label: "QR kód profilu", popis: "Na tlač alebo šírenie", onClick: () => setQr(farar ? "donacny" : "zdielat") },
          { ikona: <IkonaVlajka size={16} />, label: "Nahlásiť profil", danger: true, onClick: () => setNahlasit(true) },
        ]} />
      )}
      {qr && (
        <QrModal typ={qr === "donacny" ? "platba" : "skutok"}
          titul={qr === "donacny" ? `Donačný QR · ${farnost.nazov}` : `Zdieľať profil · ${farnost.nazov}`}
          popis={qr === "donacny" ? "QR na tlač — pokladnička, nástenka, lavice. Sken otvorí darovanie." : "Zdieľaj profil farnosti"}
          onClose={() => setQr(null)} toast={toast} />
      )}
      {sprava && (
        <SpravaFarnosti farnost={farnost} view={view}
          onSave={(v) => { setView(v); ulozStav("profil", farnost.id, v); setSprava(false); toast("Profil farnosti uložený"); }}
          onClose={() => setSprava(false)} />
      )}
      {selfAddOpen && <SelfAddSheet farnost={farnost} onClose={() => setSelfAddOpen(false)} toast={toast} />}
      {moderacia && <ModeraciaSheet fid={farnost.id} onClose={() => setModeracia(false)} toast={toast} />}
      {viditOpen && (
        <ViditelnostSheet hodnota={viditSum}
          onSet={(v) => { setViditSum(v); ulozStav("viditelnost", farnost.id, v); toast(`Viditeľnosť súm: ${VIDIT_LABEL[v]}`); }}
          onClose={() => setViditOpen(false)} />
      )}
      {nahlasit && <NahlasitSheet co={`Profil · ${farnost.nazov}`} refId={farnost.id} modul="nabozenstvo" onClose={() => setNahlasit(false)} toast={toast} />}
    </div>
  );
}

// ---- SPRÁVCA: moderácia oznamov farníkov (REÁLNE zmazať/obnoviť — localStorage) ----
// label pre správcovský riadok „Oznamy od farníkov" — číta LS pri každom renderi (aktualizuje sa po zavretí sheetu)
function selfAddLabel(fid: string): string {
  const v = nacitajSelfAdd(fid);
  return !v.on ? "Vypnuté" : v.poplatok > 0 ? `Zapnuté · ${v.poplatok.toFixed(2)} €` : "Zapnuté";
}

function ModeraciaSheet({ fid, onClose, toast }: { fid: string; onClose: () => void; toast: (m: string) => void }) {
  // publikované oznamy z úložiska (raw, bez TTL filtra — mazať sa dá aj expirovaný);
  // zoznam držíme lokálne, nech „Obnoviť" funguje kým je sheet otvorený
  const [polozky, setPolozky] = useState<NabozFeedItem[]>(() => vlastnePrispevkyVsetky(fid).filter((it) => it.ntyp === "oznam"));
  const [zmazane, setZmazane] = useState<Set<string>>(() => new Set());
  const [potvrd, setPotvrd] = useState<string | null>(null);   // „naozaj zmazať?" (bod 26)
  const [editujem, setEditujem] = useState<NabozFeedItem | null>(null); // „Upraviť" (bod 26)
  const prepni = (it: NabozFeedItem) => {
    if (zmazane.has(it.id)) {
      setZmazane((s) => { const n = new Set(s); n.delete(it.id); return n; });
      pridajPrispevok(fid, it); toast("Oznam obnovený");
      return;
    }
    if (potvrd !== it.id) { setPotvrd(it.id); return; } // 1. ťuk = potvrdenie
    setPotvrd(null);
    setZmazane((s) => new Set(s).add(it.id));
    zmazPrispevok(fid, it.id);
    toast("Oznam zmazaný — autor dostane upozornenie");
  };
  return (
    <SheetPanel title="Moderácia príspevkov" onClose={onClose}>
      <div style={{ fontSize: 12, color: N.txt3, marginBottom: SPACE.md, lineHeight: 1.5 }}>Oznam farníka môžeš <b>upraviť</b> (preklep, zlý čas) alebo <b>zmazať</b> — odstráni sa z feedu aj z profilu.</div>
      {polozky.length === 0 ? (
        <EmptyState emoji="🛡" title="Žiadne oznamy na moderáciu" text="Keď farníci pridajú oznamy, objavia sa tu." />
      ) : polozky.map((it) => {
        const del = zmazane.has(it.id);
        const pyta = potvrd === it.id;
        return (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${pyta ? "var(--a-danger)" : N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, opacity: del ? .5 : 1 }}>
            <span style={{ fontSize: 17, flex: "none" }}>{it.emoji ?? "📢"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, textDecoration: del ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nazov}</div>
              <div style={{ fontSize: 11, color: N.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pyta ? "⚠ Naozaj zmazať? Ťukni ešte raz na Zmazať" : it.popis}</div>
            </div>
            {!del && (
              <button onClick={() => { setPotvrd(null); setEditujem(it); }} style={{ flex: "none", height: 32, padding: `0 ${SPACE.sm}px`, borderRadius: RADIUS.sm, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${N.indEdge}`, background: N.indBg, color: N.ind }}>Upraviť</button>
            )}
            <button onClick={() => prepni(it)} style={{ flex: "none", height: 32, padding: `0 ${SPACE.gutter}px`, borderRadius: RADIUS.sm, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${del ? N.indEdge : "var(--a-danger)"}`, background: del ? N.indBg : pyta ? "color-mix(in srgb, var(--a-danger) 14%, transparent)" : "transparent", color: del ? N.ind : "var(--a-danger)" }}>{del ? "Obnoviť" : pyta ? "Naozaj?" : "Zmazať"}</button>
          </div>
        );
      })}
      {editujem && (
        <UpravOznamSheet it={editujem} onClose={() => setEditujem(null)}
          onUloz={(patch) => {
            upravPrispevok(fid, editujem.id, patch);
            setPolozky((p) => p.map((x) => (x.id === editujem.id ? { ...x, ...patch } : x)));
            setEditujem(null);
            toast("Oznam upravený ✓");
          }} />
      )}
    </SheetPanel>
  );
}

// „Upraviť oznam" (bod 26) — predvyplnená rýchla editácia (názov · text · dátum);
// plný re-render formulára per typ = ďalšia fáza, toto rieši preklep/zlý čas.
function UpravOznamSheet({ it, onUloz, onClose }: { it: NabozFeedItem; onUloz: (patch: Partial<NabozFeedItem>) => void; onClose: () => void }) {
  const [nazov, setNazov] = useState(it.nazov ?? "");
  const [text, setText] = useState(it.pribeh ?? it.popis ?? "");
  const [datum, setDatum] = useState(it.datum ?? "");
  return (
    <SheetPanel title="Upraviť oznam" onClose={onClose}>
      <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", marginBottom: SPACE.xxs }}>NÁZOV</div>
      <Input value={nazov} onChange={setNazov} placeholder="Názov oznamu…" />
      <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>TEXT</div>
      <RichTextInput minH={90} value={text} onChange={setText} placeholder="Text oznamu… Odseky aj vloženie z Wordu prežijú." />
      {it.datum != null && (<>
        <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>DÁTUM</div>
        <Input value={datum} onChange={setDatum} type="date" />
      </>)}
      <button onClick={() => onUloz({ nazov: nazov.trim() || it.nazov, pribeh: text || undefined, popis: cistyText(text) || it.popis, datum: datum || it.datum })}
        style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: N.green, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer" }}>
        Uložiť zmeny
      </button>
    </SheetPanel>
  );
}

// ---- SPRÁVCA: viditeľnosť súm zbierok na celú farnosť (§72, perzistované) ----
function ViditelnostSheet({ hodnota, onSet, onClose }: { hodnota: ViditSum; onSet: (v: ViditSum) => void; onClose: () => void }) {
  const OPT: { key: ViditSum; label: string; popis: string }[] = [
    { key: "zobrazit", label: "Zobraziť", popis: "Vyzbieraná suma a počet darcov sú verejné." },
    { key: "skryt", label: "Skryť", popis: "Návštevníci vidia len progres, nie konkrétnu sumu." },
    { key: "len-farar", label: "Len farár", popis: "Sumy vidí iba správca farnosti." },
  ];
  return (
    <SheetPanel title="Viditeľnosť súm zbierok" onClose={onClose}>
      <div style={{ fontSize: 12, color: N.txt3, marginBottom: SPACE.md, lineHeight: 1.5 }}>Platí na všetky zbierky farnosti. Evidencia beží vždy — mení sa len to, čo vidia návštevníci.</div>
      <div style={{ display: "grid", gap: SPACE.sm }}>
        {OPT.map((o) => {
          const on = o.key === hodnota;
          return (
            <div key={o.key} {...pressable(() => onSet(o.key), o.label)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: on ? N.indBg : N.card, border: `1px solid ${on ? N.indEdge : N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, cursor: "pointer" }}>
              <span style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", border: `2px solid ${on ? N.ind : N.txt3}`, background: on ? N.ind : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>{on ? "✓" : ""}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: on ? N.ind : N.txt }}>{o.label}</div>
                <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>{o.popis}</div>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onClose} style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: N.green, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer" }}>Hotovo</button>
    </SheetPanel>
  );
}

// ---- editovateľný pohľad + sheet editácie profilu (správca, mock) ----
// Rozšírené (DEED_Sprava_Profil_Farnosti_DEV §3): farár (foto + meno), osoby
// farnosti (roster, delegovaný prístup k Správe) a viacero kostolov.
type ProfilView = {
  foto: string; logo?: string; popis: string; omseSuhrn: string; video?: string;
  adresa: string; tel: string; email: string; web: string;
  farar: FararInfo; osoby: OsobaFarnosti[]; kostoly: KostolFarnosti[];
};
function predvolenyProfil(f: Farnost): ProfilView {
  return {
    foto: f.foto, logo: "", popis: f.popis, omseSuhrn: f.omseSuhrn ?? "", video: "",
    adresa: f.kontakt?.adresa ?? "", tel: f.kontakt?.tel ?? "", email: f.kontakt?.email ?? "", web: f.kontakt?.web ?? "",
    farar: { meno: f.farar ?? "", foto: "" }, osoby: [], kostoly: predvoleneKostoly(f),
  };
}

function SpravaFarnosti({ farnost, view, onSave, onClose }: { farnost: Farnost; view: ProfilView; onSave: (v: ProfilView) => void; onClose: () => void }) {
  const [v, setV] = useState<ProfilView>(view);
  const set = (k: keyof ProfilView) => (val: string) => setV((s) => ({ ...s, [k]: val }));
  const setFarar = (patch: Partial<FararInfo>) => setV((s) => ({ ...s, farar: { ...s.farar, ...patch } }));
  const setOsoba = (i: number, patch: Partial<OsobaFarnosti>) => setV((s) => ({ ...s, osoby: s.osoby.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));
  const setKostol = (i: number, patch: Partial<KostolFarnosti>) => setV((s) => ({ ...s, kostoly: s.kostoly.map((k, j) => (j === i ? { ...k, ...patch } : k)) }));
  return (
    <SheetPanel title={`Upraviť profil · ${farnost.skratka}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: N.txt3, marginBottom: SPACE.md, lineHeight: 1.5 }}>Zmeny sa prejavia na verejnom profile farnosti.</div>

      <PoleLabel>FOTO PROFILU (cover)</PoleLabel>
      {/* nahratie zo zariadenia (mobil: galéria/fotoaparát · desktop: súbor + drag&drop);
          re-enkód zabije EXIF/GPS aj falošné prípony. URL ostáva ako doplnok. */}
      <FotoUpload value={v.foto} onZmena={set("foto")} pomer={16 / 9} vyska={140} />
      <div style={{ fontSize: 10.5, color: N.txt3, margin: `${SPACE.xs}px 0 ${SPACE.xxs}px` }}>…alebo vlož URL obrázka (doplnková cesta):</div>
      <Input value={v.foto.startsWith("data:") ? "" : v.foto} onChange={set("foto")} placeholder="https://…" />

      <PoleLabel>LOGO FARNOSTI (štvorcové)</PoleLabel>
      <FotoUpload value={v.logo || undefined} onZmena={set("logo")} pomer={1} vyska={120} />
      <div style={{ fontSize: 10.5, color: N.txt3, marginTop: SPACE.xxs }}>Logo je identita v malom — hlavička profilu a adresáre. Bez loga ostáva ⛪. Cover foto vyššie je hero pozadie.</div>

      <PoleLabel>POPIS (história, výnimočnosti)</PoleLabel>
      <RichTextInput value={v.popis} onChange={set("popis")} minH={110} placeholder="Napíš popis farnosti… Odseky, tučné písmo aj vloženie z Wordu prežijú." />

      <PoleLabel>VIDEO (YouTube / Vimeo odkaz)</PoleLabel>
      <Input value={v.video ?? ""} onChange={set("video")} placeholder="https://youtube.com/watch?v=…" />
      {v.video && !vlozenieVidea(v.video) && <div style={{ fontSize: 10.5, color: "var(--a-danger)", marginTop: SPACE.xxs }}>Odkaz nevyzerá ako YouTube/Vimeo video.</div>}
      {vlozenieVidea(v.video) && <div style={{ marginTop: SPACE.xs }}><VideoEmbed url={v.video!} /></div>}
      <div style={{ fontSize: 10.5, color: N.txt3, marginTop: SPACE.xxs }}>Video sa vkladá ako odkaz na YouTube alebo Vimeo.</div>

      {/* ===== FARÁR — foto + meno (§3; hlavička kariet môže „hovoriť" jeho tvárou) ===== */}
      <PoleLabel>FARÁR — VEDIE FARNOSŤ (foto + meno)</PoleLabel>
      <div style={{ display: "flex", gap: SPACE.sm, alignItems: "flex-start" }}>
        <div style={{ width: 96, flex: "none" }}>
          <FotoUpload value={v.farar.foto || undefined} onZmena={(x: string) => setFarar({ foto: x })} pomer={1} vyska={96} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input value={v.farar.meno} onChange={(x: string) => setFarar({ meno: x })} placeholder="napr. Mgr. Jozef Halčin" />
          <div style={{ fontSize: 10.5, color: N.txt3, marginTop: SPACE.xxs, lineHeight: 1.45 }}>Hlavný správca farnosti. Hlavička oznamov môže „hovoriť" farárovou tvárou (prepínač pri tvorbe oznamu).</div>
        </div>
      </div>

      {/* ===== OSOBY FARNOSTI — roster (§3): rola + meno + foto; prístup k Správe deleguje farár ===== */}
      <PoleLabel>OSOBY FARNOSTI — ROSTER</PoleLabel>
      <div style={{ fontSize: 10.5, color: N.txt3, marginBottom: SPACE.xs, lineHeight: 1.45 }}>
        Kaplán, dozorca, kostolník, organista… (voľná rola). Zobrazujú sa na profile. <b>Default = len zobrazenie</b> — prístup k Správe farnosti zapína farár každej osobe zvlášť.
      </div>
      {v.osoby.map((o, i) => (
        <div key={i} style={{ background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs }}>
          <div style={{ display: "flex", gap: SPACE.sm, alignItems: "flex-start" }}>
            <div style={{ width: 64, flex: "none" }}>
              <FotoUpload value={o.foto || undefined} onZmena={(x: string) => setOsoba(i, { foto: x })} pomer={1} vyska={64} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "grid", gap: SPACE.xs }}>
              <Input value={o.rola} onChange={(x: string) => setOsoba(i, { rola: x })} placeholder="Rola — napr. kaplán, kostolník…" />
              <Input value={o.meno} onChange={(x: string) => setOsoba(i, { meno: x })} placeholder="Meno" />
            </div>
            <span {...pressable(() => setV((s) => ({ ...s, osoby: s.osoby.filter((_, j) => j !== i) })), "Odobrať osobu")} style={{ color: N.txt3, cursor: "pointer", fontSize: 16, flex: "none", padding: SPACE.xxs }}>✕</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.sm, fontSize: 12, color: N.txt2 }}>
            <Switch on={o.pristupKSprave} onChange={(x: boolean) => setOsoba(i, { pristupKSprave: x })} ariaLabel="Prístup k Správe farnosti" />
            <span><b>Prístup k Správe farnosti</b> — {o.pristupKSprave ? "zapnutý (delegovaná rada)" : "vypnutý · len zobrazenie na profile"}</span>
          </label>
        </div>
      ))}
      <button onClick={() => setV((s) => ({ ...s, osoby: [...s.osoby, { rola: "", meno: "", foto: "", pristupKSprave: false }] }))}
        style={{ width: "100%", height: 40, border: `1px dashed ${N.indEdge}`, background: N.indBg, color: N.ind, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>+ Pridať osobu</button>

      {/* ===== KOSTOLY — viacero pod jednou farnosťou (§3); časy sa napoja do rozvrhu ===== */}
      <PoleLabel>KOSTOLY FARNOSTI (názov · adresa · časy omší)</PoleLabel>
      <div style={{ fontSize: 10.5, color: N.txt3, marginBottom: SPACE.xs, lineHeight: 1.45 }}>
        Každý kostol má vlastné časy omší — napoja sa do rozvrhu a kalendára farnosti.
      </div>
      {v.kostoly.map((k, i) => (
        <div key={i} style={{ background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, display: "grid", gap: SPACE.xs }}>
          <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center" }}>
            <div style={{ flex: 1 }}><Input value={k.nazov} onChange={(x: string) => setKostol(i, { nazov: x })} placeholder="Názov kostola" /></div>
            <span {...pressable(() => setV((s) => ({ ...s, kostoly: s.kostoly.filter((_, j) => j !== i) })), "Odobrať kostol")} style={{ color: N.txt3, cursor: "pointer", fontSize: 16, flex: "none", padding: SPACE.xxs }}>✕</span>
          </div>
          <Input value={k.adresa} onChange={(x: string) => setKostol(i, { adresa: x })} placeholder="Adresa" />
          <Input value={k.casyOmsi} onChange={(x: string) => setKostol(i, { casyOmsi: x })} placeholder="Časy omší — napr. Ne 9:00 · St 17:30" />
        </div>
      ))}
      <button onClick={() => setV((s) => ({ ...s, kostoly: [...s.kostoly, { nazov: "", adresa: "", casyOmsi: "" }] }))}
        style={{ width: "100%", height: 40, border: `1px dashed ${N.indEdge}`, background: N.indBg, color: N.ind, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>+ Pridať kostol</button>

      <PoleLabel>ČASY OMŠÍ (súhrn)</PoleLabel>
      <Input value={v.omseSuhrn} onChange={set("omseSuhrn")} placeholder="Ne 7:30 · 10:30 · Št 18:00" />
      <div style={{ fontSize: 10.5, color: N.txt3, marginTop: SPACE.xxs, marginBottom: SPACE.xs }}>Podrobný rozvrh omší sa nastavuje v <b>Kalendár &amp; rozvrh</b>. Toto je len súhrn pre profil.</div>

      <PoleLabel>KONTAKT</PoleLabel>
      <div style={{ display: "grid", gap: SPACE.xs }}>
        <Input value={v.adresa} onChange={set("adresa")} placeholder="Adresa" />
        <Input value={v.tel} onChange={set("tel")} placeholder="Telefón" />
        <Input value={v.email} onChange={set("email")} placeholder="E-mail" />
        <Input value={v.web} onChange={set("web")} placeholder="Web" />
      </div>

      <button onClick={() => onSave({ ...v, osoby: v.osoby.filter((o) => o.meno.trim() || o.rola.trim()), kostoly: v.kostoly.filter((k) => k.nazov.trim()) })}
        style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: N.green, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer" }}>Uložiť zmeny</button>
    </SheetPanel>
  );
}

function SekciaNadpis({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: N.txt3, letterSpacing: ".04em", margin: `${SPACE.gutter}px 0 ${SPACE.sm}px` }}>{children}</div>;
}
function PodsekciaNadpis({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, fontWeight: 700, color: N.txt2, margin: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>{children}</div>;
}
function PoleLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>{children}</div>;
}
// riadok osoby na verejnom profile — foto (fallback 👤) + meno + rola;
// delegovaný prístup k Správe sa verejne NEukazuje (interná vec farnosti)
function OsobaRiadok({ foto, meno, rola, zvyrazni }: { foto?: string; meno: string; rola: string; zvyrazni?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
      <span style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flex: "none", background: N.indBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
        {foto ? <img src={foto} alt={meno} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meno}</div>
        <div style={{ fontSize: 10.5, color: zvyrazni ? N.gold : N.txt3 }}>{rola}</div>
      </div>
    </div>
  );
}
export function KontaktRiadok({ ikona, label, hodnota }: { ikona: string; label: string; hodnota: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
      <span style={{ fontSize: 15, flex: "none", width: 20, textAlign: "center" }}>{ikona}</span>
      <span style={{ fontSize: 11, color: N.txt3, flex: "none", width: 66 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: N.txt, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hodnota}</span>
    </div>
  );
}
function KampanRiadok({ it, onClick }: { it: NabozFeedItem; onClick: () => void }) {
  const { desktop } = useLayout();
  const k = desktop ? 2 : 1; // desktop → 2× väčšia miniatúra
  return (
    <div {...pressable(onClick, it.nazov || "")} style={{ background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, marginBottom: SPACE.sm, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: it.ciel ? SPACE.sm : 0 }}>
        <Foto src={it.fotky?.[0]} emoji={it.emoji || "💛"} w={46 * k} h={46 * k} radius={RADIUS.xs} sizes={`${46 * k}px`} alt={it.nazov} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nazov}</div>
          <div style={{ fontSize: 11.5, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.popis}</div>
        </div>
        <span style={{ color: N.txt3, fontSize: 16, flex: "none" }}>›</span>
      </div>
      {it.ciel != null && <MoniBar vyzbierane={it.vyzbierane ?? 0} ciel={it.ciel} mini />}
    </div>
  );
}
function UdalostRiadok({ it, onClick }: { it: NabozFeedItem; onClick: () => void }) {
  const { desktop } = useLayout();
  const k = desktop ? 2 : 1; // desktop → 2× väčšia miniatúra
  const col = it.ukat ? KAT_FARBA[it.ukat] : N.ind;
  return (
    <div {...pressable(onClick, it.nazov || "")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.line}`, borderLeft: `3px solid ${col}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm, cursor: "pointer" }}>
      {/* úmrtie/parte = mini parte kartička (bod 23), nie surová fotka tváre */}
      {it.smutocny ? <ParteMiniatura s={it.smutocny} w={40 * k} h={52 * k} /> : <Foto src={it.fotky?.[0]} emoji={it.emoji || "🗓"} w={52 * k} h={40 * k} radius={RADIUS.xs} sizes={`${52 * k}px`} alt={it.nazov} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nazov}</div>
        <div style={{ fontSize: 11, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.popis}</div>
      </div>
      {it.badgeL && <span style={{ flex: "none", fontSize: 10, fontWeight: 700, color: col }}>{it.badgeL.split(" ")[0]}</span>}
    </div>
  );
}
