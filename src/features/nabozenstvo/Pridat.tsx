import { useState } from "react";
import { SPACE, RADIUS } from "@/theme";
import { Input, Switch, SplitQrSheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { N, SheetPanel } from "./ui";
import { SPLIT_LABELY, farskySplitVariant, type Farnost } from "./mock";

/*
  ============================================================
  STROM PRIDANIA „+" (matica: uzly · polia · akcie) — role-aware.
  · USER → len jeho možnosti: Oznam (smútočný · jubilejný · poďakovanie · prosba o modlitbu)
  · FARÁR (kontext Farnosť) → celý strom: Zbierka · Udalosť · Oznam · Dobrovoľníctvo
  To isté tlačidlo, ponuka sa mení podľa roly (§ Vstupné body). Mock — publish = toast.
  ============================================================
*/

type Akcia = "Prispieť" | "Zúčastním sa" | "Pripomeň";
type Uzol = {
  id: string; emoji: string; titul: string; popis: string;
  polia: string[];            // čo vyplní tvorca (mock polia)
  akcie?: Akcia[];            // čo dostane user (+ vždy Srdiečko · Zdieľať)
  feed: string;               // routing viditeľnosti
  kto?: string;               // F · R→F · U
  split?: "pohreb" | "svadba";
  helpWizard?: boolean;       // mód C — plný Help sprievodca (8 krokov)
  qrMerge?: boolean;          // mód B — scan QR príjemcu (registrovaný)
  datum?: boolean;            // udalosť s dátumom → kalendár
};
type Kat = { id: string; emoji: string; titul: string; popis: string; uzly: Uzol[] };

const ZBIERKA: Kat = {
  id: "zbierka", emoji: "💶", titul: "Zbierka", popis: "Finančná / ľudská — podľa príjemcu",
  uzly: [
    { id: "z-farska", emoji: "🏛", titul: "Pre nás (farnosť)", popis: "Ľahká vetva — farnosť je overená inštitúcia (KYB)", kto: "F",
      polia: ["Popis", "Tagy", "Cieľová suma €", "Foto/video", "Split (voliteľné)", "Dĺžka"], akcie: ["Prispieť"], feed: "farský (+ Charita) · settlement € na farský účet" },
    { id: "z-akcia", emoji: "🎪", titul: "Na akciu", popis: "Zbierka viazaná na udalosť (koncert, farský deň…)", kto: "F",
      polia: ["Väzba na udalosť", "Popis", "Cieľová suma €", "Foto"], akcie: ["Prispieť"], feed: "farský" },
    { id: "z-registrovany", emoji: "🔗", titul: "Pre iného — registrovaný", popis: "QR-merge: scan QR príjemcu = overenie + súhlas + prepojenie", kto: "F", qrMerge: true, split: "svadba",
      polia: ["Scan QR príjemcu", "Split (napr. 3/97)", "Text (kto)", "Foto"], akcie: ["Prispieť"], feed: "iba farský" },
    { id: "z-neregistrovany", emoji: "🧾", titul: "Pre iného — neregistrovaný", popis: "Plný Help sprievodca (8 krokov) — escrow/IBAN overenie", kto: "F", helpWizard: true,
      polia: ["Podmienky", "Opis", "IBAN overenie", "Téma", "Suma", "Doklady/escrow", "Foto", "Kanál"], akcie: ["Prispieť"], feed: "Help + zrkadlí do farského" },
  ],
};
const UDALOST: Kat = {
  id: "udalost", emoji: "🗓", titul: "Udalosť", popis: "Má dátum/čas → kalendár + pripomienka",
  uzly: [
    { id: "u-omsa", emoji: "⛪", titul: "Omša (z rozvrhu)", popis: "Čas z rozvrhu · auto-generuje omšovú zbierku", kto: "F", datum: true,
      polia: ["Čas z rozvrhu", "Poznámka"], akcie: ["Prispieť", "Pripomeň"], feed: "farský · omša nemá RSVP" },
    { id: "u-sviatok", emoji: "✨", titul: "Sviatok / prikázaný sviatok", popis: "Dátum predvyplnený z cirkevného kalendára", kto: "F", datum: true,
      polia: ["Dátum (z kalendára)", "Časy omší", "Poznámka"], akcie: ["Prispieť", "Pripomeň"], feed: "farský" },
    { id: "u-put", emoji: "⛰", titul: "Púť", popis: "Voliteľná zbierka na dopravu + kapacita", kto: "F", datum: true,
      polia: ["Názov", "Dátum", "Popis", "Foto", "Zbierka na dopravu (voliteľné)", "Kapacita"], akcie: ["Zúčastním sa", "Prispieť", "Pripomeň"], feed: "farský" },
    { id: "u-akcia", emoji: "🎶", titul: "Akcia (koncert, ples, farský deň)", popis: "Vstupné / zbierka voliteľné", kto: "F", datum: true,
      polia: ["Názov", "Dátum", "Popis", "Foto", "Vstupné/zbierka (voliteľné)"], akcie: ["Zúčastním sa", "Prispieť", "Pripomeň"], feed: "farský" },
    { id: "u-svadba", emoji: "💍", titul: "Svadba", popis: "Mená snúbencov + foto len s ich súhlasom · QR-merge split", kto: "R→F", datum: true, split: "svadba",
      polia: ["Mená snúbencov (+ súhlas)", "Dátum", "Zbierka: QR-merge split", "Text"], akcie: ["Prispieť"], feed: "iba farský" },
    { id: "u-pohreb", emoji: "🕯", titul: "Pohreb", popis: "Meno zosnulého + súhlas rodiny · Split QR · predĺžené okno ~týždeň", kto: "R→F", datum: true, split: "pohreb",
      polia: ["Meno zosnulého (+ súhlas rodiny)", "Foto (voliteľné)", "Dátum", "Zbierka QR-merge split", "Text"], akcie: ["Prispieť"], feed: "iba farský" },
  ],
};
const OZNAM: Kat = {
  id: "oznam", emoji: "📢", titul: "Oznam", popis: "Dátum nemusí — objaví sa vo feede",
  uzly: [
    { id: "o-zmena", emoji: "🔔", titul: "Zmenové (omša nebude / zmena programu)", popis: "Notifikácia default zapnutá", kto: "F",
      polia: ["Text", "Platnosť od–do (voliteľné)"], feed: "farský · notif default ON" },
    { id: "o-umrtie", emoji: "🕯", titul: "Úmrtie", popis: "Odkaz na pohrebnú zbierku", kto: "R→F",
      polia: ["Meno zosnulého (+ súhlas)", "Foto (voliteľné)", "Odkaz na pohreb"], akcie: ["Prispieť"], feed: "iba farský" },
    { id: "o-ohlasky", emoji: "💍", titul: "Ohlášky", popis: "Mená snúbencov + dátum sobáša", kto: "F",
      polia: ["Mená snúbencov", "Dátum sobáša", "Odkaz na svadbu (voliteľné)"], feed: "farský" },
    { id: "o-smutocny", emoji: "🤍", titul: "Smútočný (spomienka)", popis: "Reakcia = kondolencia", kto: "U",
      polia: ["Text", "Meno (koho spomíname)", "Foto (voliteľné)"], feed: "farský" },
    { id: "o-jubilejny", emoji: "🎂", titul: "Jubilejný", popis: "Blahoželanie jubilantovi", kto: "U",
      polia: ["Text", "Meno jubilanta", "Dátum", "Foto (voliteľné)"], feed: "farský" },
    { id: "o-podakovanie", emoji: "🙏", titul: "Poďakovanie", popis: "Verejné poďakovanie", kto: "U",
      polia: ["Text", "Komu (voliteľné)"], feed: "farský" },
    { id: "o-modlitba", emoji: "🕊", titul: "Prosba o modlitbu", popis: "Reakcia = „modlím sa“", kto: "U",
      polia: ["Text (za koho/čo)"], feed: "farský" },
  ],
};
const DOBRO: Kat = {
  id: "dobro", emoji: "🙌", titul: "Dobrovoľníctvo", popis: "Výzva o ruky — event QR = karma za účasť",
  uzly: [
    { id: "d-brigada", emoji: "🧹", titul: "Brigáda", popis: "Event QR (proof-of-presence) → účastník dostane karmu", kto: "F", datum: true,
      polia: ["Názov", "Dátum", "Popis", "Koľko rúk treba", "Foto", "Event QR"], akcie: ["Zúčastním sa", "Pripomeň", "Prispieť"], feed: "farský · event QR → karma za účasť" },
  ],
};

const KATEGORIE = [ZBIERKA, UDALOST, OZNAM, DOBRO];
// user smie tvoriť len tieto oznamy (auto-publish, farár môže zmazať)
const USER_UZLY = OZNAM.uzly.filter((u) => u.kto === "U");

export function PridatSheet({ farar, farnost, onClose, toast }: {
  farar: boolean; farnost?: Farnost; onClose: () => void; toast: (m: string) => void;
}) {
  const [kat, setKat] = useState<Kat | null>(null);
  const [uzol, setUzol] = useState<Uzol | null>(null);
  const [split, setSplit] = useState<"pohreb" | "svadba" | null>(null);

  // FORM (level 2) — mock polia + ukážka → publikovať
  if (uzol) {
    return (
      <>
        <SheetPanel title={uzol.titul} onClose={onClose}>
          <BackRiadok onBack={() => setUzol(null)} label={farar ? (kat?.titul ?? "Späť") : "Pridať oznam"} />
          <UzolForm uzol={uzol} farar={farar} farnost={farnost}
            onSplit={uzol.split ? () => setSplit(uzol.split!) : undefined}
            onPublish={() => { toast(publishText(uzol, farar)); onClose(); }}
            onHelp={uzol.helpWizard ? () => { toast("Otváram Help sprievodcu (8 krokov) — escrow/IBAN overenie (demo)"); onClose(); } : undefined}
            toast={toast} />
        </SheetPanel>
        {split && <SplitQrSheet titul={uzol.titul}
          caseId={null} zdroj="autor" variant={farskySplitVariant(split)}
          onClose={() => setSplit(null)} toast={toast} />}
      </>
    );
  }

  // LEVEL 1 (farár): uzly kategórie
  if (farar && kat) {
    return (
      <SheetPanel title={kat.titul} onClose={onClose}>
        <BackRiadok onBack={() => setKat(null)} label="Pridať" />
        <div style={{ fontSize: 12, color: N.txt3, marginBottom: SPACE.sm }}>{kat.popis}</div>
        {kat.uzly.map((u) => <UzolTile key={u.id} u={u} onClick={() => setUzol(u)} />)}
      </SheetPanel>
    );
  }

  // LEVEL 0 (root)
  return (
    <SheetPanel title={farar ? "Pridať do farnosti" : "Pridať oznam"} onClose={onClose}>
      {farar ? (
        <>
          <KontextPas farnost={farnost} />
          {KATEGORIE.map((k) => (
            <div key={k.id} {...pressable(() => setKat(k), k.titul)} style={tileStyle}>
              <Bublina emoji={k.emoji} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{k.titul}</div>
                <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>{k.popis}</div>
              </div>
              <span style={{ color: N.txt3, fontSize: 16 }}>›</span>
            </div>
          ))}
          <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", padding: SPACE.sm }}>
            Aj cez „+" na ploche aj cez Môj DEED (správcovský panel). User nikdy nevidí farárove možnosti a naopak.
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: N.txt2, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>
            Hlavička oznamu = <b>tvoje meno z registrácie</b> (jasné, kto napísal). Auto-publish — farár môže zmazať.
          </div>
          {USER_UZLY.map((u) => <UzolTile key={u.id} u={u} onClick={() => setUzol(u)} />)}
        </>
      )}
    </SheetPanel>
  );
}

// ---- kúsky ----
const tileStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.line}`,
  borderRadius: RADIUS.sm, padding: SPACE.md, marginBottom: SPACE.sm, cursor: "pointer",
};
function Bublina({ emoji }: { emoji: string }) {
  return <div style={{ width: 42, height: 42, borderRadius: RADIUS.sm, background: N.indBg, color: N.ind, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{emoji}</div>;
}
const KTO_LABEL: Record<string, string> = { F: "farár", "R→F": "dotknutý → farár schváli", U: "user → auto-publish" };
function UzolTile({ u, onClick }: { u: Uzol; onClick: () => void }) {
  return (
    <div {...pressable(onClick, u.titul)} style={tileStyle}>
      <Bublina emoji={u.emoji} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{u.titul}</div>
        <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>{u.popis}</div>
      </div>
      <span style={{ color: N.txt3, fontSize: 16 }}>›</span>
    </div>
  );
}
function BackRiadok({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div {...pressable(onBack, "Späť")} style={{ display: "inline-flex", alignItems: "center", gap: SPACE.xs, fontSize: 12.5, color: N.ind, fontWeight: 700, cursor: "pointer", marginBottom: SPACE.sm }}>
      ‹ {label}
    </div>
  );
}
function KontextPas({ farnost }: { farnost?: Farnost }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.goldBg, border: `1px solid ${N.goldEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm }}>
      <span style={{ fontSize: 16 }}>🛠</span>
      <div style={{ fontSize: 12, color: N.txt2 }}>Vystupuješ ako <b style={{ color: N.txt }}>{farnost?.nazov ?? "Farnosť"}</b> · správcovský panel</div>
    </div>
  );
}

function publishText(u: Uzol, farar: boolean): string {
  if (u.helpWizard) return "Otváram Help sprievodcu…";
  if (!farar) return `Oznam „${u.titul}" zverejnený (auto-publish · farár môže zmazať)`;
  return `„${u.titul}" zverejnené do farnosti · feed: ${u.feed}`;
}

// ---- FORM uzla — mock polia + akcie preview + ukážka/publikovať ----
function UzolForm({ uzol, farar, farnost, onSplit, onPublish, onHelp, toast }: {
  uzol: Uzol; farar: boolean; farnost?: Farnost; onSplit?: () => void; onPublish: () => void; onHelp?: () => void; toast: (m: string) => void;
}) {
  const [text, setText] = useState("");
  const [notif, setNotif] = useState(uzol.id === "o-zmena");
  const [preview, setPreview] = useState(false);
  const lab = uzol.split ? SPLIT_LABELY[uzol.split] : null;

  return (
    <div>
      <div style={{ fontSize: 12, color: N.txt2, marginBottom: SPACE.md }}>{uzol.popis}</div>

      {/* meta: kto tvorí + feed */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs, marginBottom: SPACE.md }}>
        {uzol.kto && <MetaChip>{`Tvorí: ${KTO_LABEL[uzol.kto] ?? uzol.kto}`}</MetaChip>}
        <MetaChip>{`Feed: ${uzol.feed}`}</MetaChip>
        {uzol.datum && <MetaChip>🗓 kalendár + pripomienka</MetaChip>}
      </div>

      {/* hlavné textové pole (mock) */}
      <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", marginBottom: SPACE.xxs }}>
        {uzol.id.startsWith("o-") ? "TEXT OZNAMU" : "POPIS"}
      </div>
      <Input multiline minH={90} value={text} onChange={setText}
        placeholder={uzol.id === "o-modlitba" ? "Za koho / za čo sa modlíme…" : "Napíš text…"} />

      {/* ostatné polia (mock — len naznačené inputy/labely) */}
      <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>POLIA</div>
      <div style={{ display: "grid", gap: SPACE.xs }}>
        {uzol.polia.map((p) => (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: N.ind, flex: "none" }} />
            <span style={{ fontSize: 13, color: N.txt2 }}>{p}</span>
          </div>
        ))}
      </div>

      {/* zmenové oznamy → notifikácia default ON */}
      {uzol.id === "o-zmena" && (
        <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.md, fontSize: 13, color: N.txt2 }}>
          <Switch on={notif} onChange={setNotif} ariaLabel="Push notifikácia" />
          Poslať push notifikáciu farníkom (zmena programu)
        </label>
      )}

      {/* akcie, ktoré dostane user */}
      <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>AKCIE PRE POUŽÍVATEĽA</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs }}>
        <MetaChip>❤ Srdiečko</MetaChip><MetaChip>↗ Zdieľať</MetaChip>
        {(uzol.akcie ?? []).map((a) => <MetaChip key={a}>{a === "Prispieť" ? "💶 Prispieť" : a === "Zúčastním sa" ? "🗓 Zúčastním sa" : "🔔 Pripomeň"}</MetaChip>)}
      </div>

      {/* farársky Split QR — pohreb/svadba/QR-merge */}
      {farar && onSplit && (
        <div onClick={onSplit} style={{ marginTop: SPACE.md, border: `1px solid ${N.greenEdge}`, background: N.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, cursor: "pointer" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: N.green }}>⚖ Rozdeliť dar (Split QR)</div>
          {lab && <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>{lab.rodina} ↔ {lab.kostol} · min 3 % · % sa po vytvorení zafixujú</div>}
        </div>
      )}

      {/* QR-merge poznámka (registrovaný príjemca) */}
      {uzol.qrMerge && (
        <div style={{ marginTop: SPACE.sm, fontSize: 11.5, color: N.txt3, background: N.infoBg, border: `1px solid ${tint(N.info, .3)}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
          🔗 QR scan = overenie + súhlas + prepojenie účtu naraz. Príjemca musí byť registrovaný a merge potvrdí v appke (nie verejný „share" QR).
        </div>
      )}

      {/* mód C — plný Help sprievodca */}
      {onHelp ? (
        <button onClick={onHelp} style={ctaStyle(N.ind)}>Otvoriť Help sprievodcu (8 krokov)</button>
      ) : (
        <>
          {!preview ? (
            <button onClick={() => setPreview(true)} style={ctaStyle(N.ind)}>Ukážka</button>
          ) : (
            <>
              <div style={{ marginTop: SPACE.md, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter }}>
                <div style={{ fontSize: 10.5, color: N.txt3, fontWeight: 700 }}>UKÁŽKA · hlavička</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: SPACE.xxs }}>{farar ? (farnost?.nazov ?? "Farský úrad") : "Tvoje meno"} · ✓ overená</div>
                <div style={{ fontSize: 13, color: N.txt2, marginTop: SPACE.xs, lineHeight: 1.5 }}>{text || <span style={{ color: N.txt3 }}>(text oznamu)</span>}</div>
              </div>
              <button onClick={onPublish} style={ctaStyle(N.green)}>Publikovať</button>
            </>
          )}
        </>
      )}
      <div style={{ fontSize: 10, color: N.txt3, textAlign: "center", padding: `${SPACE.sm}px 0` }}>Žiadne komentáre — železné pravidlo platformy. Len štruktúrované akcie.</div>
    </div>
  );
}
function MetaChip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, color: N.txt2, background: N.card, border: `1px solid ${N.line}`, borderRadius: 99, padding: `${SPACE.xxs}px ${SPACE.sm}px` }}>{children}</span>;
}
function ctaStyle(bg: string): React.CSSProperties {
  return { width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: bg, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer" };
}
