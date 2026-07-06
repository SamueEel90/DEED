import { useState } from "react";
import { SPACE, RADIUS } from "@/theme";
import { MEDIA_AR } from "@/lib/cardSize";
import {
  Foto, BackHeader, ProgresBox, PodporaSekcia, PlatbaModal, RecurringSheet, SplitQrSheet, QrModal,
  OblubeneBtn, MoniBar, SegTabs, Zdielanie, IkonaVlajka, IkonaOpakovat, IkonaDoska, useGaleria, useLayout,
} from "@/shared";
import { pressable } from "@/components/pressable";
import type { Kanal, Oblubeny } from "@/types";
import { N, Overena, Chip } from "./ui";
import { obsahFarnosti, KAT_FARBA, type Farnost, type NabozFeedItem, type NabozTyp } from "./mock";

/*
  ============================================================
  FARSKÝ PROFIL — donation-first (§L). Štýl Charita profilu, role-aware.
  Poradie zhora: foto → popis → platobný modul (všeobecná podpora + QR) →
  aktuálne kampane → nadchádzajúce udalosti → taby obsahu → doklady o použití.
  · USER = foto + popis + dar + prezeranie kampaní/udalostí
  · FARÁR = navyše Split QR · generovať QR na tlač · pridať/upraviť kampaň · kalendár · moderácia
  Farnosť je MIMO karmy — len badge „overená". Každá kampaň má vlastné darovanie (§57).
  ============================================================
*/

const TABY: { key: NabozTyp; label: string }[] = [
  { key: "zbierka", label: "Zbierky" }, { key: "udalost", label: "Udalosti" },
  { key: "oznam", label: "Oznamy" }, { key: "dobrovolnictvo", label: "Dobrovoľníctvo" },
];

export function FarskyProfil({ farnost, farar, onBack, onDetail, onKalendar, onPridat, toast }: {
  farnost: Farnost; farar: boolean; onBack: () => void; onDetail: (it: NabozFeedItem) => void;
  onKalendar: () => void; onPridat: () => void; toast: (m: string) => void;
}) {
  const { wide } = useLayout();
  const otvorGaleriu = useGaleria();
  const [suma, setSuma] = useState(farnost.vyzbierane);
  const [ludia, setLudia] = useState(farnost.podpora);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  const [recur, setRecur] = useState(false);
  const [split, setSplit] = useState(false);
  const [qr, setQr] = useState<"donacny" | "zdielat" | null>(null);
  const [tab, setTab] = useState<NabozTyp>("zbierka");

  const obsah = obsahFarnosti(farnost.id);
  const kampane = obsah.filter((it) => it.ntyp === "zbierka");
  const udalosti = obsah.filter((it) => it.ntyp === "udalost");
  const vTabe = obsah.filter((it) => it.ntyp === tab);

  const oblubeny: Oblubeny = { refId: "farnost-" + farnost.id, typ: "charita", modul: "charity", nazov: farnost.nazov, emoji: "⛪", lok: farnost.obec, vyzbierane: suma, ciel: farnost.ciel };

  function podpor(hodnota: number, text: string) { setSuma((s) => s + hodnota * 0.01); setLudia((l) => l + 1); toast(text); }
  function platbaHotova(s: number) { setSuma((x) => x + s * (platba === "EUR" ? 1 : 0.01)); setLudia((l) => l + 1); toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DEED"} · ${farnost.nazov}`); }

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackHeader onBack={onBack} right={<>
        <span {...pressable(() => setQr("zdielat"), "Zdieľať profil")} style={{ display: "flex", cursor: "pointer" }}><Zdielanie size={17} color={N.txt2} /></span>
        <IkonaVlajka size={16} color={N.txt2} />
      </>}>
        <span style={{ fontSize: 12, color: N.txt2 }}>⛪ {farnost.skratka}</span>
      </BackHeader>
      <div style={{ height: SPACE.sm }} />

      {/* hero foto */}
      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <div style={{ position: "relative", ...(wide ? { width: "100%", aspectRatio: MEDIA_AR } : {}) }}>
          <Foto src={farnost.foto} emoji="⛪" h={wide ? "100%" : 210} w={wide ? "100%" : undefined} radius={14} onClick={() => otvorGaleriu([farnost.foto], 0)} />
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

        {/* popis (história, založenie, výnimočnosti) */}
        <div style={{ fontSize: 14, lineHeight: 1.55, color: N.txt2, margin: `${SPACE.sm}px 0 ${SPACE.gutter}px` }}>
          {farnost.zalozena && <b style={{ color: N.gold }}>Založená {farnost.zalozena} · </b>}{farnost.popis}
        </div>

        {/* Sledovať / Pridať k obľúbeným */}
        <div style={{ marginBottom: SPACE.gutter }}>
          <OblubeneBtn polozka={oblubeny} toast={toast} style={{ width: "100%" }} />
        </div>

        {/* ===== PLATOBNÝ MODUL — VŠEOBECNÁ PODPORA FARNOSTI ===== */}
        <div style={{ fontSize: 11, fontWeight: 800, color: N.txt3, letterSpacing: ".04em", marginBottom: SPACE.xs }}>VŠEOBECNÁ PODPORA FARNOSTI</div>
        <div style={{ marginBottom: SPACE.sm }}><ProgresBox suma={suma} ciel={farnost.ciel} ludia={ludia} /></div>
        <div style={{ marginBottom: SPACE.sm }}>
          <PodporaSekcia
            onShare={() => setQr("zdielat")}
            upvotes={ludia} onUpvote={() => toast("❤")}
            onPodpor={(s: number) => podpor(s, `Ďakujeme za ${s} DEED pre ${farnost.nazov}`)} onSms={() => podpor(100, "SMS podpora")}
            onKanal={(k: string) => setPlatba(k as Kanal)} accent={N.ind} supLabel="RÝCHLY DAR — klik a hneď odíde" />
        </div>
        <div style={{ display: "flex", gap: SPACE.sm, marginBottom: SPACE.xs }}>
          <div onClick={() => setRecur(true)} style={{ flex: 1, border: `1px solid ${N.indEdge}`, background: N.indBg, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center", fontSize: 13, fontWeight: 700, color: N.ind, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
            <IkonaOpakovat size={16} color={N.ind} /> Opakovaný dar
          </div>
          <div onClick={() => setQr(farar ? "donacny" : "zdielat")} style={{ flex: 1, border: `1px solid ${N.line}`, background: N.card, borderRadius: RADIUS.sm, padding: SPACE.sm, textAlign: "center", fontSize: 13, fontWeight: 700, color: N.txt, cursor: "pointer" }}>
            ▦ {farar ? "QR na tlač" : "QR na dar"}
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", marginBottom: SPACE.gutter }}>
          Farnosť dostane vždy € (off-ramp) — donor platí DEED aj €. „Terminál netreba" — QR nahrádza platobný terminál.
        </div>

        {/* ===== FARÁROV PANEL (role-aware) ===== */}
        {farar && (
          <div style={{ background: N.goldBg, border: `1px solid ${N.goldEdge}`, borderRadius: RADIUS.md, padding: SPACE.gutter, marginBottom: SPACE.gutter }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: N.gold, letterSpacing: ".04em", marginBottom: SPACE.sm }}>🛠 SPRÁVA FARNOSTI (Môj DEED)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACE.sm }}>
              <FararBtn ikona={<IkonaDoska size={16} color={N.ind} />} label="Kalendár & rozvrh" onClick={onKalendar} />
              <FararBtn ikona={<span>＋</span>} label="Pridať kampaň/udalosť" onClick={onPridat} />
              <FararBtn ikona={<span>⚖</span>} label="Split QR (pohreb/svadba)" onClick={() => setSplit(true)} />
              <FararBtn ikona={<span>🖨</span>} label="QR na tlač do kostola" onClick={() => setQr("donacny")} />
              <FararBtn ikona={<span>🛡</span>} label="Moderácia príspevkov" onClick={() => toast("Moderácia — farár môže zmazať oznam usera (demo)")} />
              <FararBtn ikona={<span>👁</span>} label="Viditeľnosť súm zbierok" onClick={() => toast("Prepínač na farnosť: zobraziť / skryť / len farár (§72)")} />
            </div>
            <div style={{ fontSize: 10, color: N.txt3, marginTop: SPACE.sm }}>Split QR = len farár (organizátorský nástroj, nie darcov). Osobné účty + roly — farár môže delegovať kaplána/radu.</div>
          </div>
        )}

        {/* ===== AKTUÁLNE KAMPANE ===== */}
        {kampane.length > 0 && (
          <>
            <SekciaNadpis>AKTUÁLNE KAMPANE</SekciaNadpis>
            {kampane.map((it) => <KampanRiadok key={it.id} it={it} onClick={() => onDetail(it)} />)}
          </>
        )}

        {/* ===== NADCHÁDZAJÚCE UDALOSTI ===== */}
        {udalosti.length > 0 && (
          <>
            <SekciaNadpis>NADCHÁDZAJÚCE UDALOSTI</SekciaNadpis>
            {udalosti.map((it) => <UdalostRiadok key={it.id} it={it} onClick={() => onDetail(it)} />)}
          </>
        )}

        {/* ===== TABY OBSAHU (Zbierky / Udalosti / Oznamy / Dobrovoľníctvo) ===== */}
        <SekciaNadpis>OBSAH FARNOSTI</SekciaNadpis>
        <SegTabs options={TABY.map((t) => t.label)} value={TABY.find((t) => t.key === tab)!.label}
          onChange={(l: string) => setTab(TABY.find((t) => t.label === l)!.key)} ariaLabel="Taby profilu farnosti"
          style={{ display: "flex", gap: SPACE.xs, overflowX: "auto", paddingBottom: SPACE.xs, marginBottom: SPACE.sm }}
          render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />
        {vTabe.length === 0 ? (
          <div style={{ fontSize: 12.5, color: N.txt3, textAlign: "center", padding: SPACE.lg }}>V tejto sekcii zatiaľ nič nie je.</div>
        ) : tab === "zbierka" ? (
          vTabe.map((it) => <KampanRiadok key={it.id} it={it} onClick={() => onDetail(it)} />)
        ) : (
          vTabe.map((it) => <UdalostRiadok key={it.id} it={it} onClick={() => onDetail(it)} />)
        )}

        {/* ===== DOKLADY O POUŽITÍ ===== */}
        <div style={{ marginTop: SPACE.gutter, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, fontSize: 11.5, color: N.txt2, lineHeight: 1.5 }}>
          📄 <b>Doklady o použití prostriedkov zverejňujeme.</b> Kam šli peniaze — transparentnosť. Systém je tvoj svedok. Každá zbierka žije v Charita engine (platby/overenie), tu sa len zrkadlí.
        </div>
      </div>

      {platba && <PlatbaModal kanal={platba} komu={farnost.nazov} onClose={() => setPlatba(null)} onDone={platbaHotova} />}
      {recur && <RecurringSheet nazov={farnost.nazov} onClose={() => setRecur(false)} toast={toast} />}
      {split && <SplitQrSheet titul={`Pohrebná/svadobná zbierka · ${farnost.nazov}`} caseId={null} zdroj="autor" onClose={() => setSplit(false)} toast={toast} />}
      {qr && (
        <QrModal typ={qr === "donacny" ? "platba" : "skutok"}
          titul={qr === "donacny" ? `Donačný QR · ${farnost.nazov}` : `Zdieľať profil · ${farnost.nazov}`}
          popis={qr === "donacny" ? "Nalep na kostol/pokladničku/nástenku → sken → dar za 2 kliky (farár generuje)" : "QR na šírenie profilu farnosti (user)"}
          onClose={() => setQr(null)} toast={toast} />
      )}
    </div>
  );
}

function SekciaNadpis({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: N.txt3, letterSpacing: ".04em", margin: `${SPACE.gutter}px 0 ${SPACE.sm}px` }}>{children}</div>;
}
function FararBtn({ ikona, label, onClick }: { ikona: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <div {...pressable(onClick, label)} style={{ display: "flex", alignItems: "center", gap: SPACE.xs, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: N.txt }}>
      <span style={{ flex: "none", display: "flex", fontSize: 15 }}>{ikona}</span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </div>
  );
}
function KampanRiadok({ it, onClick }: { it: NabozFeedItem; onClick: () => void }) {
  return (
    <div {...pressable(onClick, it.nazov || "")} style={{ background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, marginBottom: SPACE.sm, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: it.ciel ? SPACE.sm : 0 }}>
        <span style={{ fontSize: 18, flex: "none" }}>{it.emoji || "💛"}</span>
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
  const col = it.ukat ? KAT_FARBA[it.ukat] : N.ind;
  return (
    <div {...pressable(onClick, it.nazov || "")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.line}`, borderLeft: `3px solid ${col}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm, cursor: "pointer" }}>
      <span style={{ fontSize: 17, flex: "none" }}>{it.emoji || "🗓"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nazov}</div>
        <div style={{ fontSize: 11, color: N.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.popis}</div>
      </div>
      {it.badgeL && <span style={{ flex: "none", fontSize: 10, fontWeight: 700, color: col }}>{it.badgeL.split(" ")[0]}</span>}
    </div>
  );
}
