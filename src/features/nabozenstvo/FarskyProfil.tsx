import { useState } from "react";
import { SPACE, RADIUS } from "@/theme";
import { MEDIA_AR } from "@/lib/cardSize";
import {
  Foto, BackHeader, ProgresBox, PodporaSekcia, PlatbaModal, RecurringSheet, SplitQrSheet, QrModal,
  MoniBar, Switch, Input, EmptyState, useStrankaAkcie,
  Zdielanie, IkonaVlajka, IkonaOpakovat, IkonaDoska, IkonaFoto, IkonaPlus, IkonaOko, IkonaNastavenia, IkonaSipVpravo, Srdce, tint, useGaleria, useLayout,
  ZoznamDarcov, FormatovanyText, RichTextInput, FotoUpload, VideoEmbed, vlozenieVidea,
} from "@/shared";
import { pridajDar, type VolbaDaru } from "@/lib/darcovia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { pressable } from "@/components/pressable";
import { NahlasitSheet } from "@/components/nahlasit";
import type { Kanal } from "@/types";
import { N, Overena, SheetPanel, PrehladTile, A9Potvrdenie } from "./ui";
import { SelfAddSheet, nacitajSelfAdd } from "./UserOznamy";
import { nacitajStav, ulozStav } from "./stav";
import { obsahFarnosti, farnostStat, farskySplitVariant, KAT_FARBA, type Farnost, type NabozFeedItem, type NabozTyp } from "./mock";

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
  const [split, setSplit] = useState(false);
  const [qr, setQr] = useState<"donacny" | "zdielat" | null>(null);
  const [sprava, setSprava] = useState(false); // editácia profilu (sheet)
  const [potvrdHome, setPotvrdHome] = useState(false); // A9 potvrdenie „nastaviť ako moju cirkev"
  const [nahlasit, setNahlasit] = useState(false); // vlajka → nahlásenie profilu
  const [moderacia, setModeracia] = useState(false); // správca: moderácia oznamov farníkov
  const [viditOpen, setViditOpen] = useState(false); // správca: viditeľnosť súm (§72)
  const [viditSum, setViditSum] = useState<ViditSum>(() => nacitajStav<ViditSum>("viditelnost", farnost.id, "zobrazit"));
  const [selfAddOpen, setSelfAddOpen] = useState(false); // správca: oznamy od farníkov ON/OFF + poplatok
  // editovateľný pohľad profilu (mock — perzistovaný do localStorage per farnost.id)
  const [view, setView] = useState<ProfilView>(() => nacitajStav<ProfilView>("profil", farnost.id, {
    foto: farnost.foto, popis: farnost.popis, omseSuhrn: farnost.omseSuhrn ?? "", video: "",
    adresa: farnost.kontakt?.adresa ?? "", tel: farnost.kontakt?.tel ?? "", email: farnost.kontakt?.email ?? "", web: farnost.kontakt?.web ?? "",
  }));
  const ja = usePouzivatel(); // registrovaný vs pasívny — určuje zápis do zoznamu darcov
  const darRef = `farnost-${farnost.id}`; // kľúč všeobecnej podpory v zozname darcov

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
      <BackHeader onBack={onBack} right={<>
        <span {...pressable(() => setQr("zdielat"), "Zdieľať profil")} style={{ display: "flex", cursor: "pointer" }}><Zdielanie size={17} color={N.txt2} /></span>
        <span {...pressable(() => setNahlasit(true), "Nahlásiť profil")} style={{ display: "flex", cursor: "pointer" }}><IkonaVlajka size={16} color={N.txt2} /></span>
      </>}>
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
          <span style={{ width: 42, height: 42, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: N.indBg }}>⛪</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: SPACE.xs }}>{farnost.nazov} <Overena /></div>
            <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>📍 {farnost.obec}{farnost.kostol ? ` · ${farnost.kostol}` : ""}{farnost.farar ? ` · ${farnost.farar}` : ""}</div>
          </div>
        </div>

        {/* stat hlavička (bez karmy — len fakty) */}
        <div style={{ fontSize: 11.5, color: N.txt3, marginBottom: SPACE.sm }}>
          👥 {(farnost.sledovatelia ?? 0).toLocaleString("sk-SK")} sledujúcich · {stat.zbierky} {stat.zbierky === 1 ? "zbierka" : "zbierok"}{farnost.zalozena ? ` · Založená ${farnost.zalozena}` : ""}
        </div>

        {/* popis (história, založenie, výnimočnosti) — formátovaný text (odseky prežijú) */}
        <div style={{ fontSize: 14, lineHeight: 1.55, color: N.txt2, margin: `${SPACE.xs}px 0 ${SPACE.gutter}px` }}>
          {farnost.zalozena && <div style={{ marginBottom: SPACE.xxs }}><b style={{ color: N.gold }}>Založená {farnost.zalozena}</b></div>}
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
              <div style={{ fontSize: 10.5, color: N.txt3 }}>Som správca tejto cirkvi (demo) — zapne prehľad, editáciu a nástroje</div>
            </div>
            <Switch on={farar} onChange={onToggleSpravca} ariaLabel="Spravovať farnosť" />
          </label>
        )}

        {/* Sledovať (jeden zdroj pravdy = modulový oblubene) */}
        {onToggleFollow && (
          <button onClick={onToggleFollow} style={{ width: "100%", height: 44, border: `1px solid ${following ? N.greenEdge : N.indEdge}`, background: following ? N.greenBg : N.indBg, color: following ? N.green : N.ind, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, marginBottom: farar ? SPACE.gutter : SPACE.sm }}>
            <Srdce size={16} filled={following} color={following ? N.green : N.ind} /> {following ? "Sledované" : "Sledovať"}
          </button>
        )}

        {/* USER: pridať oznam priamo z profilu farnosti (smútočný/jubilejný/poďakovanie/modlitba) */}
        {!farar && (
          <button onClick={onPridat} style={{ width: "100%", height: 44, border: `1px solid ${N.line}`, background: N.card, color: N.txt, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 14, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, marginBottom: SPACE.gutter }}>
            ＋ Pridať oznam
          </button>
        )}

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
          <div onClick={() => setQr(farar ? "donacny" : "zdielat")} style={{ flex: 1, border: `1px solid ${N.line}`, background: N.card, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center", fontSize: 13, fontWeight: 700, color: N.txt, cursor: "pointer" }}>
            ▦ {farar ? "QR na tlač" : "QR na dar"}
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", marginBottom: SPACE.sm }}>
          Farnosť dostane vždy € (off-ramp) — donor platí DEED aj €. „Terminál netreba" — QR nahrádza platobný terminál.
        </div>
        {/* zoznam darcov — až pod opakovaným darom / QR, rovnaké číslo ako počítadlo */}
        <div style={{ marginBottom: SPACE.gutter }}>
          <ZoznamDarcov refId={darRef} celkom={ludia} />
        </div>

        {/* ===== [SPRÁVCA] PANEL — nástroje správcu ako settings list ===== */}
        {farar && (
          <div style={{ background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.md, marginBottom: SPACE.gutter, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, background: N.goldBg, borderBottom: `1px solid ${N.line}` }}>
              <IkonaNastavenia size={15} color={N.gold} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: N.gold, letterSpacing: ".04em" }}>SPRÁVA FARNOSTI</div>
                <div style={{ fontSize: 10.5, color: N.txt3 }}>Nástroje správcu — vidí len farár a delegovaná rada</div>
              </div>
            </div>
            <SpravaRiadok ikona={<IkonaFoto size={16} color={N.ind} />} farba={N.ind} label="Upraviť profil farnosti" popis="Foto, popis, video, časy omší, kontakt" onClick={() => setSprava(true)} />
            <SpravaRiadok ikona={<IkonaDoska size={16} color={N.info} />} farba={N.info} label="Kalendár & rozvrh" popis="Omše, sviatky, udalosti farnosti" onClick={onKalendar} />
            <SpravaRiadok ikona={<IkonaPlus size={16} color={N.green} />} farba={N.green} label="Pridať kampaň alebo udalosť" popis="Zbierka, udalosť, oznam, dobrovoľníctvo" onClick={onPridat} />
            <SpravaRiadok ikona={<span style={{ fontSize: 15 }}>⚖</span>} farba={N.clay} label="Split QR — pohreb / svadba" popis="Organizátorský nástroj, nie pre darcov" onClick={() => setSplit(true)} />
            <SpravaRiadok ikona={<span style={{ fontSize: 14, fontWeight: 800, color: N.gold }}>▦</span>} farba={N.gold} label="QR na tlač do kostola" popis="Pokladnička, nástenka, lavice — sken → dar" onClick={() => setQr("donacny")} />
            <SpravaRiadok ikona={<IkonaVlajka size={15} color={N.clay} />} farba={N.clay} label="Moderácia príspevkov" popis="Oznamy farníkov — zmazať / obnoviť" onClick={() => setModeracia(true)} />
            <SpravaRiadok ikona={<span style={{ fontSize: 15 }}>📢</span>} farba={N.green} label="Oznamy od farníkov" hodnota={selfAddLabel(farnost.id)} popis="Self-add ON/OFF + voliteľný poplatok (prosba/smútočné vždy zadarmo)" onClick={() => setSelfAddOpen(true)} />
            <SpravaRiadok ikona={<IkonaOko size={16} color={N.ind} />} farba={N.ind} label="Viditeľnosť súm zbierok" hodnota={VIDIT_LABEL[viditSum]} popis="Čo vidia návštevníci profilu (§72)" onClick={() => setViditOpen(true)} posledny />
          </div>
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

        {/* ===== KONTAKT + ČASY OMŠÍ — na spodku profilu ===== */}
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

        {/* ===== DOKLADY O POUŽITÍ ===== */}
        <div style={{ marginTop: SPACE.gutter, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, fontSize: 11.5, color: N.txt2, lineHeight: 1.5 }}>
          📄 <b>Doklady o použití prostriedkov zverejňujeme.</b> Kam šli peniaze — transparentnosť. Systém je tvoj svedok. Každá zbierka žije v Charita engine (platby/overenie), tu sa len zrkadlí.
        </div>
      </div>

      {platba && <PlatbaModal kanal={platba} komu={farnost.nazov} onClose={() => setPlatba(null)} onDone={platbaHotova} />}
      {recur && <RecurringSheet nazov={farnost.nazov} onClose={() => setRecur(false)} toast={toast} />}
      {split && <SplitQrSheet titul={`Pohrebná/svadobná zbierka · ${farnost.nazov}`} caseId={null} zdroj="autor"
        variant={farskySplitVariant("pohreb")} onClose={() => setSplit(false)} toast={toast} />}
      {qr && (
        <QrModal typ={qr === "donacny" ? "platba" : "skutok"}
          titul={qr === "donacny" ? `Donačný QR · ${farnost.nazov}` : `Zdieľať profil · ${farnost.nazov}`}
          popis={qr === "donacny" ? "Nalep na kostol/pokladničku/nástenku → sken → dar za 2 kliky (farár generuje)" : "QR na šírenie profilu farnosti (user)"}
          onClose={() => setQr(null)} toast={toast} />
      )}
      {sprava && (
        <SpravaFarnosti farnost={farnost} view={view}
          onSave={(v) => { setView(v); ulozStav("profil", farnost.id, v); setSprava(false); toast("Profil farnosti uložený"); }}
          onClose={() => setSprava(false)} />
      )}
      {selfAddOpen && <SelfAddSheet farnost={farnost} onClose={() => setSelfAddOpen(false)} toast={toast} />}
      {moderacia && <ModeraciaSheet polozky={obsah.filter((it) => it.ntyp === "oznam")} onClose={() => setModeracia(false)} toast={toast} />}
      {viditOpen && (
        <ViditelnostSheet hodnota={viditSum}
          onSet={(v) => { setViditSum(v); ulozStav("viditelnost", farnost.id, v); toast(`Viditeľnosť súm: ${VIDIT_LABEL[v]} (§72)`); }}
          onClose={() => setViditOpen(false)} />
      )}
      {nahlasit && <NahlasitSheet co={`Profil · ${farnost.nazov}`} refId={farnost.id} modul="nabozenstvo" onClose={() => setNahlasit(false)} toast={toast} />}
    </div>
  );
}

// ---- SPRÁVCA: moderácia oznamov farníkov (mock — zmazať/obnoviť) ----
// label pre správcovský riadok „Oznamy od farníkov" — číta LS pri každom renderi (aktualizuje sa po zavretí sheetu)
function selfAddLabel(fid: string): string {
  const v = nacitajSelfAdd(fid);
  return !v.on ? "Vypnuté" : v.poplatok > 0 ? `Zapnuté · ${v.poplatok.toFixed(2)} €` : "Zapnuté";
}

function ModeraciaSheet({ polozky, onClose, toast }: { polozky: NabozFeedItem[]; onClose: () => void; toast: (m: string) => void }) {
  const [zmazane, setZmazane] = useState<Set<string>>(() => new Set());
  const prepni = (id: string) => {
    setZmazane((s) => { const n = new Set(s); const bol = n.has(id); bol ? n.delete(id) : n.add(id); toast(bol ? "Oznam obnovený" : "Oznam zmazaný — farník dostane upozornenie"); return n; });
  };
  return (
    <SheetPanel title="Moderácia príspevkov" onClose={onClose}>
      <div style={{ fontSize: 12, color: N.txt3, marginBottom: SPACE.md, lineHeight: 1.5 }}>Farár môže zmazať nevhodný oznam farníka. Zbierky a udalosti farnosti sa overujú v Charita engine — tu ich nemažeš.</div>
      {polozky.length === 0 ? (
        <EmptyState emoji="🛡" title="Žiadne oznamy na moderáciu" text="Keď farníci pridajú oznamy, objavia sa tu." />
      ) : polozky.map((it) => {
        const del = zmazane.has(it.id);
        return (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, opacity: del ? .5 : 1 }}>
            <span style={{ fontSize: 17, flex: "none" }}>{it.emoji ?? "📢"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, textDecoration: del ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nazov}</div>
              <div style={{ fontSize: 11, color: N.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.popis}</div>
            </div>
            <button onClick={() => prepni(it.id)} style={{ flex: "none", height: 32, padding: `0 ${SPACE.gutter}px`, borderRadius: RADIUS.sm, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${del ? N.indEdge : "var(--a-danger)"}`, background: del ? N.indBg : "transparent", color: del ? N.ind : "var(--a-danger)" }}>{del ? "Obnoviť" : "Zmazať"}</button>
          </div>
        );
      })}
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
      <div style={{ fontSize: 12, color: N.txt3, marginBottom: SPACE.md, lineHeight: 1.5 }}>Platí na všetky zbierky farnosti (§72). Evidencia beží vždy — mení sa len to, čo vidia návštevníci.</div>
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
type ProfilView = { foto: string; popis: string; omseSuhrn: string; video?: string; adresa: string; tel: string; email: string; web: string };

function SpravaFarnosti({ farnost, view, onSave, onClose }: { farnost: Farnost; view: ProfilView; onSave: (v: ProfilView) => void; onClose: () => void }) {
  const [v, setV] = useState<ProfilView>(view);
  const set = (k: keyof ProfilView) => (val: string) => setV((s) => ({ ...s, [k]: val }));
  return (
    <SheetPanel title={`Upraviť profil · ${farnost.skratka}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: N.txt3, marginBottom: SPACE.md, lineHeight: 1.5 }}>Správca cirkvi upravuje verejný profil. Zmeny sa v tomto deme uložia lokálne (bez backendu).</div>

      <PoleLabel>FOTO PROFILU (cover)</PoleLabel>
      {/* nahratie zo zariadenia (mobil: galéria/fotoaparát · desktop: súbor + drag&drop);
          re-enkód zabije EXIF/GPS aj falošné prípony. URL ostáva ako doplnok. */}
      <FotoUpload value={v.foto} onZmena={set("foto")} pomer={16 / 9} vyska={140} />
      <div style={{ fontSize: 10.5, color: N.txt3, margin: `${SPACE.xs}px 0 ${SPACE.xxs}px` }}>…alebo vlož URL obrázka (doplnková cesta):</div>
      <Input value={v.foto.startsWith("data:") ? "" : v.foto} onChange={set("foto")} placeholder="https://…" />

      <PoleLabel>POPIS (história, výnimočnosti)</PoleLabel>
      <RichTextInput value={v.popis} onChange={set("popis")} minH={110} placeholder="Napíš popis farnosti… Odseky, tučné písmo aj vloženie z Wordu prežijú." />

      <PoleLabel>VIDEO (YouTube / Vimeo odkaz)</PoleLabel>
      <Input value={v.video ?? ""} onChange={set("video")} placeholder="https://youtube.com/watch?v=…" />
      {v.video && !vlozenieVidea(v.video) && <div style={{ fontSize: 10.5, color: "var(--a-danger)", marginTop: SPACE.xxs }}>Odkaz nevyzerá ako YouTube/Vimeo video.</div>}
      {vlozenieVidea(v.video) && <div style={{ marginTop: SPACE.xs }}><VideoEmbed url={v.video!} /></div>}
      <div style={{ fontSize: 10.5, color: N.txt3, marginTop: SPACE.xxs }}>Video len embedujeme (farnosti už YT kanály majú) — nič nehostujeme.</div>

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

      <button onClick={() => onSave(v)} style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: N.green, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer" }}>Uložiť zmeny</button>
      <div style={{ fontSize: 10, color: N.txt3, textAlign: "center", padding: `${SPACE.sm}px 0` }}>Farnosť je overená inštitúcia — bez karmy/levelov. Editovať smie len správca (farár alebo delegovaná rada).</div>
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
export function KontaktRiadok({ ikona, label, hodnota }: { ikona: string; label: string; hodnota: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
      <span style={{ fontSize: 15, flex: "none", width: 20, textAlign: "center" }}>{ikona}</span>
      <span style={{ fontSize: 11, color: N.txt3, flex: "none", width: 66 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: N.txt, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hodnota}</span>
    </div>
  );
}
// riadok správcovského panela — ikona v tónovanej dlaždici, label + popis, hodnota/šípka vpravo
function SpravaRiadok({ ikona, farba, label, popis, hodnota, onClick, posledny }: {
  ikona: React.ReactNode; farba: string; label: string; popis: string; hodnota?: string; onClick: () => void; posledny?: boolean;
}) {
  return (
    <div {...pressable(onClick, label)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderBottom: posledny ? "none" : `1px solid ${N.line}`, cursor: "pointer" }}>
      <span style={{ width: 34, height: 34, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: RADIUS.xs, background: tint(farba, .12) }}>{ikona}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: N.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ fontSize: 11, color: N.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{popis}</div>
      </div>
      {hodnota && <span style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: farba, background: tint(farba, .1), border: `1px solid ${tint(farba, .3)}`, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: 99 }}>{hodnota}</span>}
      <IkonaSipVpravo size={15} color={N.txt3} />
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
      <Foto src={it.fotky?.[0]} emoji={it.emoji || "🗓"} w={52 * k} h={40 * k} radius={RADIUS.xs} sizes={`${52 * k}px`} alt={it.nazov} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nazov}</div>
        <div style={{ fontSize: 11, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.popis}</div>
      </div>
      {it.badgeL && <span style={{ flex: "none", fontSize: 10, fontWeight: 700, color: col }}>{it.badgeL.split(" ")[0]}</span>}
    </div>
  );
}
