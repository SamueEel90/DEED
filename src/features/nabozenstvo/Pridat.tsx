import { useState } from "react";
import { SPACE, RADIUS } from "@/theme";
import { Input, Switch, SplitQrSheet, FotoVyber, RichTextInput, tint } from "@/shared";
import { cistyText } from "@/lib/richtext";
import { pressable } from "@/components/pressable";
import { usePouzivatel } from "@/lib/pouzivatel";
import { N, SheetPanel } from "./ui";
import { SmutocnyForm } from "./SmutocnyOznam";
import { UserOznamForm, nacitajSelfAdd, type UserOznamTyp } from "./UserOznamy";
import { SPLIT_LABELY, farskySplitVariant, pridajPrispevok, type Farnost, type NabozFeedItem, type NabozTyp, type UdalostKat, type ReakciaTyp } from "./mock";

/*
  ============================================================
  STROM PRIDANIA „+" (matica: uzly · polia · akcie) — role-aware.
  · USER → len jeho možnosti: Oznam (smútočný · jubilejný · poďakovanie · prosba o modlitbu)
  · FARÁR (kontext Farnosť) → celý strom: Zbierka · Udalosť · Oznam · Dobrovoľníctvo
  To isté tlačidlo, ponuka sa mení podľa roly (§ Vstupné body).
  Publish = REÁLNY príspevok (pridajPrispevok → localStorage) — objaví sa vo
  feede farnosti, v taboch profilu aj v počtoch. Fotky cez FotoVyber (data URL).
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

// Deliaca čiara (delta bod 27): JEDEN príjemca = samostatná zbierka, 100 % jemu,
// žiadny bežec. DVAJA+ = split (bežec sa objaví). „Pre nás" preto BEZ splitu aj
// BEZ tagov (bod 29 — feed je scopovaný na farnosť, typ je známy).
const ZBIERKA: Kat = {
  id: "zbierka", emoji: "💶", titul: "Zbierka", popis: "Jeden príjemca → celé jemu · dvaja a viac → bežec rozdelí",
  uzly: [
    { id: "z-farska", emoji: "🏛", titul: "Pre nás (farnosť)", popis: "Ľahká vetva (KYB) · 1 príjemca = 100 % — bez tagov, bez splitu", kto: "F",
      polia: ["Názov", "Popis", "Cieľová suma €", "Foto/video", "Dĺžka"], akcie: ["Prispieť"], feed: "farský (+ Charita) · settlement € na farský účet" },
    { id: "z-akcia", emoji: "🎪", titul: "Na akciu", popis: "Viazaná na udalosť (koncert, farský deň…) · 1 príjemca = farnosť", kto: "F",
      polia: ["Názov", "Väzba na udalosť", "Popis", "Cieľová suma €", "Foto", "Dĺžka"], akcie: ["Prispieť"], feed: "farský" },
    { id: "z-registrovany", emoji: "🔗", titul: "Pre iného — registrovaný", popis: "Jednorazový 6-miestny kód od príjemcu (PC-friendly, bez kamery) · obojstranné potvrdenie", kto: "F", qrMerge: true, split: "svadba",
      polia: ["Názov", "Kód príjemcu (6-miestny)", "Split (rodina/kostol)", "Text (kto)", "Foto"], akcie: ["Prispieť"], feed: "iba farský" },
    { id: "z-neregistrovany", emoji: "🧾", titul: "Pre iného — neregistrovaný", popis: "Plný sprievodca s overením účtu a úschovou darov", kto: "F", helpWizard: true,
      polia: ["Názov", "Podmienky", "Opis", "IBAN overenie", "Téma", "Suma", "Doklady/escrow", "Foto", "Kanál"], akcie: ["Prispieť"], feed: "Help + zrkadlí do farského" },
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
    // Pohreb a Svadba už NIE sú Udalosti (Delta 2 bod 2 — duplicita): žijú ako Oznam
    // (úmrtie/parte, ohlášky) — nesú dátum → kalendár + pripomienka; peniaze =
    // samostatná zbierka napojená cez „Pridať zbierku" na ozname.
  ],
};
const OZNAM: Kat = {
  id: "oznam", emoji: "📢", titul: "Oznam", popis: "Dátum nemusí — objaví sa vo feede",
  uzly: [
    { id: "o-zmena", emoji: "🔔", titul: "Zmenové (omša nebude / zmena programu)", popis: "Notifikácia default zapnutá · názov povinný (headline)", kto: "F",
      polia: ["Názov", "Text", "Platnosť od–do (voliteľné)"], feed: "farský · notif default ON" },
    { id: "o-umrtie", emoji: "🕯", titul: "Oznámenie o úmrtí (parte)", popis: "Šablóna alebo vlastné parte · čistý oznam — zbierka sa pripája až na zverejnenom ozname cez Pridať zbierku", kto: "F",
      polia: ["Meno", "Dátumy + vek", "Verš", "Rozlúčka (kde + kedy)", "Foto", "Šablóna"], feed: "farský" },
    { id: "o-ohlasky", emoji: "💍", titul: "Ohlášky", popis: "Mená snúbencov · termín je priamo v ohláškach (žiadny odkaz na svadbu)", kto: "F",
      polia: ["Mená snúbencov", "Dátum + čas sobáša", "Miesto"], feed: "farský" },
    { id: "o-vlastny", emoji: "📣", titul: "Vlastný oznam", popis: "Čokoľvek — zatvorený kostol, ples, zbierka šatstva… (catch-all)", kto: "F",
      polia: ["Názov", "Text", "Foto (voliteľné)", "Platnosť (dní)"], feed: "farský" },
    { id: "o-smutocny", emoji: "🤍", titul: "Oznámenie o úmrtí (parte)", popis: "Šablóna alebo vlastné parte · polia pod oznamom · reakcia = kondolencia · bez zbierky", kto: "U",
      polia: ["Meno", "Dátumy + vek", "Verš", "Rozlúčka (kde + kedy)", "Foto", "Šablóna"], feed: "farský" },
    { id: "o-spomienkovy", emoji: "🕯", titul: "Spomienkový oznam", popis: "Pamiatka — výročie úmrtia, nedožité jubileum · reakcia = kondolencia · vždy zadarmo", kto: "U",
      polia: ["Meno zosnulého", "Príležitosť", "Dátumy nar.–zom. (voliteľné)", "Text spomienky", "Obrázok (foto/sviečka/kríž/bez)"], feed: "farský" },
    { id: "o-jubilejny", emoji: "🎂", titul: "Jubilejný", popis: "Blahoželanie jubilantovi · karta alebo vlastný obrázok", kto: "U",
      polia: ["Meno jubilanta", "Dôvod/jubileum", "Dátum", "Text", "Foto"], feed: "farský" },
    { id: "o-podakovanie", emoji: "🙏", titul: "Poďakovanie", popis: "Verejné poďakovanie · karta alebo vlastný obrázok", kto: "U",
      polia: ["Za čo", "Komu (voliteľné)", "Text", "Foto"], feed: "farský" },
    { id: "o-modlitba", emoji: "🕊", titul: "Prosba o modlitbu", popis: "Reakcia = „modlím sa“ · vždy zadarmo · môže byť bez mena", kto: "U",
      polia: ["Úmysel (za koho/čo)", "Text", "Bez mena", "Obrázok (predvolené/vlastné/bez)"], feed: "farský" },
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
  const { celeMeno } = usePouzivatel();
  const [kat, setKat] = useState<Kat | null>(null);
  const [uzol, setUzol] = useState<Uzol | null>(null);
  const [split, setSplit] = useState<"pohreb" | "svadba" | null>(null);
  // self-add nastavenie farnosti (DEED_User_Oznamy_DEV.md §2) — ON/OFF + voliteľný poplatok
  const selfAdd = farnost ? nacitajSelfAdd(farnost.id) : { on: true, poplatok: 0 };
  const USER_TYP: Record<string, UserOznamTyp> = { "o-jubilejny": "jubilejny", "o-podakovanie": "podakovanie", "o-modlitba": "modlitba", "o-spomienkovy": "spomienkovy" };

  // FORM (level 2) — mock polia + ukážka → publikovať
  if (uzol) {
    const userTyp = USER_TYP[uzol.id];
    return (
      <>
        <SheetPanel title={uzol.titul} onClose={onClose}>
          <BackRiadok onBack={() => setUzol(null)} label={farar ? (kat?.titul ?? "Späť") : "Pridať oznam"} />
          {uzol.id === "o-smutocny" || uzol.id === "o-umrtie" ? (
            /* dedikované parte (DEED_Oznamenie_o_Umrti_DEV.md) — šablóna/obrázok, povinné polia, TTL, BEZ zbierky (§0) */
            <SmutocnyForm farnost={farnost} autor={celeMeno || "Farník"} farar={farar}
              onPublish={(it) => { if (farnost) pridajPrispevok(farnost.id, it); toast(farar ? "Oznámenie o úmrtí zverejnené 🕯" : "Oznámenie o úmrtí zverejnené (auto-publish · farár môže zmazať) 🕯"); onClose(); }} />
          ) : userTyp ? (
            /* user oznamy (DEED_User_Oznamy_DEV.md) — jubilejný/poďakovanie/prosba, 2 režimy + obrázok */
            <UserOznamForm typ={userTyp} farnost={farnost} autor={celeMeno || "Farník"} poplatok={selfAdd.poplatok}
              onPublish={(it) => { if (farnost) pridajPrispevok(farnost.id, it); toast(`Oznam zverejnený (auto-publish · farár môže zmazať)${it.spoplatnene ? ` · zaplatené ${selfAdd.poplatok.toFixed(2)} €` : ""}`); onClose(); }} />
          ) : (
          <UzolForm uzol={uzol} farar={farar} farnost={farnost}
            onSplit={uzol.split ? () => setSplit(uzol.split!) : undefined}
            onPublish={(it) => { if (farnost) pridajPrispevok(farnost.id, it); toast(publishText(uzol, farar)); onClose(); }}
            onHelp={uzol.helpWizard ? () => { toast("Otváram Help sprievodcu"); onClose(); } : undefined}
            toast={toast} />
          )}
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
      ) : !selfAdd.on ? (
        /* farnosť má self-add vypnutý (§2) — feed tvorí farár, oznam vybaví osobne */
        <div style={{ fontSize: 12.5, color: N.txt2, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.md, lineHeight: 1.55, textAlign: "center" }}>
          <div style={{ fontSize: 26, marginBottom: SPACE.xs }}>🔕</div>
          <b>Farnosť má pridávanie oznamov farníkmi vypnuté.</b><br />
          Feed tvorí farár — ozvi sa mu a oznam (jubileum, poďakovanie, prosbu o modlitbu) pridá za teba.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: N.txt2, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>
            Hlavička oznamu = <b>tvoje meno z registrácie</b> (jasné, kto napísal). Auto-publish — farár môže zmazať.
            {selfAdd.poplatok > 0 && <> · Farnosť má oznamy spoplatnené <b>{selfAdd.poplatok.toFixed(2)} €</b> — prosba o modlitbu a smútočné sú vždy zadarmo.</>}
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
// „Späť" (delta bod 21) — viditeľné TLAČIDLO, nie schovaný odkaz: tučné, väčšie,
// vždy „‹ Späť" (Späť = o krok späť na výber typu; X hore = zavrieť celé)
function BackRiadok({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div {...pressable(onBack, "Späť")} style={{ display: "inline-flex", alignItems: "center", gap: SPACE.xs, fontSize: 14.5, color: N.ind, fontWeight: 800, cursor: "pointer", marginBottom: SPACE.sm, background: N.indBg, border: `1px solid ${N.indEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.gutter}px` }} title={label}>
      ‹ Späť
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

// ---- zostavenie REÁLNEHO príspevku z formulára (ntyp/ukat/reakcia z uzla) ----
const UKAT_UZLA: Record<string, UdalostKat> = {
  "u-omsa": "omsa", "u-sviatok": "sviatok", "u-put": "put", "u-akcia": "akcia",
  "u-svadba": "svadba", "u-pohreb": "pohreb", "d-brigada": "brigada", "o-umrtie": "pohreb",
};
const REAKCIA_UZLA: Record<string, ReakciaTyp> = {
  "o-smutocny": "kondolencia", "o-umrtie": "kondolencia", "o-spomienkovy": "kondolencia", "o-modlitba": "modlitba", "o-jubilejny": "blahozelanie",
};
const NTYP_META: Record<NabozTyp, { tag: string; badge: string }> = {
  zbierka: { tag: "Zbierka", badge: "ZBIERKA" }, udalost: { tag: "Udalosť", badge: "UDALOSŤ" },
  oznam: { tag: "Oznam", badge: "OZNAM" }, dobrovolnictvo: { tag: "Dobrovoľníctvo", badge: "VÝZVA" },
};

function postavPrispevok(uzol: Uzol, opts: {
  farar: boolean; farnost?: Farnost; autor: string; text: string; polia: Record<string, string>; fotky: string[]; autorTvar?: boolean;
}): NabozFeedItem {
  const { farar, farnost, autor, text, polia, fotky, autorTvar } = opts;
  const pole = (test: (l: string) => boolean) => { const p = uzol.polia.find((x) => test(x.toLowerCase())); return p ? polia[p] : undefined; };
  const ntyp: NabozTyp = uzol.id.startsWith("z-") ? "zbierka" : uzol.id.startsWith("u-") ? "udalost" : uzol.id.startsWith("d-") ? "dobrovolnictvo" : "oznam";
  const meta = NTYP_META[ntyp];
  const nazovPola = pole((l) => l.startsWith("názov"));
  const meno = pole((l) => l.includes("meno") || l.includes("mená"));
  const nazov = (nazovPola || (meno ? `${uzol.titul} — ${meno}` : "") || cistyText(text).slice(0, 60) || uzol.titul).trim();
  const suma = pole((l) => l.includes("suma") || l.includes("€"));
  const ciel = suma ? +suma || undefined : undefined;
  const datum = pole((l) => l.includes("dátum") || l.includes("datum"));
  const plat = pole((l) => l.includes("platnosť (dní)")); // vlastný oznam — voliteľná TTL
  return {
    id: `naboz-${Date.now()}`, comp: "data", typ: ntyp === "zbierka" ? "charita" : "skutok", modul: "charity", kat: "Komunita",
    ntyp, skore: 6, typSituacie: "normal", dni: 0, podpora: 0,
    lat: farnost?.lat, lng: farnost?.lng, lok: farnost?.obec,
    farnostId: farnost?.id, cirkev: farnost?.cirkev ?? "", komunita: farar ? farnost?.nazov : autor,
    nazov, overena: farar, badgeL: `${uzol.emoji} ${meta.badge}`, tag: meta.tag, emoji: uzol.emoji,
    // popis = krátky ČISTÝ text do kariet/riadkov · pribeh = formátovaný obsah do detailu
    popis: cistyText(text) || uzol.popis, pribeh: text || undefined,
    datum: datum || undefined, ukat: UKAT_UZLA[uzol.id], reakciaTyp: REAKCIA_UZLA[uzol.id],
    rsvp: uzol.akcie?.includes("Zúčastním sa") || undefined, split: uzol.split ? true : undefined,
    ciel, vyzbierane: ciel != null ? 0 : undefined,
    fotky: fotky.length ? fotky : undefined,
    autorTvar: autorTvar || undefined, // farárova tvár v hlavičke (bod 20)
    ...(plat ? { vytvorene: Date.now(), platnostDni: Math.max(1, +plat || 7) } : {}),
  };
}

// ---- FORM uzla — polia + akcie preview + ukážka/publikovať (reálny príspevok) ----
function UzolForm({ uzol, farar, farnost, onSplit, onPublish, onHelp, toast }: {
  uzol: Uzol; farar: boolean; farnost?: Farnost; onSplit?: () => void; onPublish: (it: NabozFeedItem) => void; onHelp?: () => void; toast: (m: string) => void;
}) {
  const { celeMeno } = usePouzivatel();
  const [text, setText] = useState("");
  const [notif, setNotif] = useState(uzol.id === "o-zmena");
  const [tvar, setTvar] = useState(false); // bod 20 — farárova tvár v hlavičke (voliteľné)
  const [preview, setPreview] = useState(false);
  const [polia, setPolia] = useState<Record<string, string>>({});
  const [fotky, setFotky] = useState<string[]>([]); // reálne fotky/video (FotoVyber → data URL)
  const setPole = (k: string, v: string) => setPolia((s) => ({ ...s, [k]: v }));
  const lab = uzol.split ? SPLIT_LABELY[uzol.split] : null;
  // NÁZOV sa renderuje ako PRVÉ pole (pred popisom); hlavné textové pole (POPIS/TEXT
  // OZNAMU) rieši voľný text → obe vynechaj zo zoznamu POLIA
  const nazovPole = uzol.polia.find((p) => p.toLowerCase().startsWith("názov"));
  const viditelnePolia = uzol.polia.filter((p) => { const l = p.toLowerCase(); return !(l === "popis" || l === "opis" || l.startsWith("text") || p === nazovPole); });

  return (
    <div>
      <div style={{ fontSize: 12, color: N.txt2, marginBottom: SPACE.md }}>{uzol.popis}</div>

      {/* meta: kto tvorí + feed */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs, marginBottom: SPACE.md }}>
        {uzol.kto && <MetaChip>{`Tvorí: ${KTO_LABEL[uzol.kto] ?? uzol.kto}`}</MetaChip>}
        <MetaChip>{`Feed: ${uzol.feed}`}</MetaChip>
        {uzol.datum && <MetaChip>🗓 kalendár + pripomienka</MetaChip>}
      </div>

      {/* NÁZOV — vždy prvé pole (pred popisom) */}
      {nazovPole && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", marginBottom: SPACE.xxs }}>NÁZOV</div>
          <Input value={polia[nazovPole] ?? ""} onChange={(v) => setPole(nazovPole, v)} placeholder="Názov príspevku…" />
          <div style={{ height: SPACE.sm }} />
        </>
      )}

      {/* hlavné textové pole */}
      <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", marginBottom: SPACE.xxs }}>
        {uzol.id.startsWith("o-") ? "TEXT OZNAMU" : "POPIS"}
      </div>
      <RichTextInput minH={90} value={text} onChange={setText}
        placeholder={uzol.id === "o-modlitba" ? "Za koho / za čo sa modlíme…" : "Napíš text… Odseky aj vloženie z Wordu prežijú."} />

      {/* ostatné polia — reálne typované inputy (číslo/dátum/foto/QR/text) */}
      {viditelnePolia.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>POLIA</div>
          <div style={{ display: "grid", gap: SPACE.sm }}>
            {viditelnePolia.map((p) => {
              // foto/video → REÁLNY výber z disku s náhľadom (nie mock attach)
              const l = p.toLowerCase();
              if (typPola(p) === "foto" && !l.includes("doklad") && !l.includes("escrow")) {
                return (
                  <div key={p}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".02em", marginBottom: SPACE.xxs }}>{p.toUpperCase()}</div>
                    <FotoVyber fotky={fotky} onZmena={setFotky} max={3} video={l.includes("video")} />
                  </div>
                );
              }
              return <PoleInput key={p} label={p} value={polia[p] ?? ""} onChange={(v) => setPole(p, v)} toast={toast} />;
            })}
          </div>
        </>
      )}

      {/* bod 20: farár si môže dať vlastnú tvár do hlavičky — „farár hovorí osobne" */}
      {farar && uzol.id.startsWith("o-") && (
        <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.md, fontSize: 13, color: N.txt2 }}>
          <Switch on={tvar} onChange={setTvar} ariaLabel="Moja tvár v hlavičke" />
          <span><b>Moja tvár v hlavičke</b> — osobný, teplý dotyk („farár hovorí…"), voliteľné</span>
        </label>
      )}

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
          {lab && <div style={{ fontSize: 11.5, color: N.txt2, marginTop: SPACE.xxs }}>{lab.rodina} ↔ {lab.kostol} · krok 5 % · 0 % ok (dobrovoľné) · % sa po vytvorení zafixujú</div>}
        </div>
      )}

      {/* prepojenie príjemcu (bod 30) — čerstvé, jednorazové, na jednu zbierku */}
      {uzol.qrMerge && (
        <div style={{ marginTop: SPACE.sm, fontSize: 11.5, color: N.txt3, background: N.infoBg, border: `1px solid ${tint(N.info, .3)}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
          🔗 Prepojenie je vždy čerstvé a jednorazové — 6-miestny kód od príjemcu (registrovaný, KYC), obojstranné potvrdenie v appke. Farár NIKDY nevyberá z uloženého zoznamu QR.
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
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: SPACE.xxs }}>{farar ? `${farnost?.nazov ?? "Farský úrad"} · ✓ overená` : (celeMeno || "Tvoje meno")}</div>
                {fotky.length > 0 && <div style={{ fontSize: 11, color: N.txt3, marginTop: SPACE.xxs }}>📎 {fotky.length} {fotky.length === 1 ? "príloha" : "prílohy"}</div>}
                <div style={{ fontSize: 13, color: N.txt2, marginTop: SPACE.xs, lineHeight: 1.5 }}>{text || <span style={{ color: N.txt3 }}>(text oznamu)</span>}</div>
              </div>
              <button onClick={() => onPublish(postavPrispevok(uzol, { farar, farnost, autor: celeMeno || "Farník", text, polia, fotky, autorTvar: tvar }))} style={ctaStyle(N.green)}>Publikovať</button>
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

// odvodenie typu poľa z jeho názvu → reálny input namiesto „bullet" labelu
type TypPola = "cislo" | "datum" | "foto" | "qr" | "kod" | "split" | "iban" | "text";
function typPola(label: string): TypPola {
  const l = label.toLowerCase();
  if (l.includes("kód")) return "kod"; // jednorazový 6-miestny kód príjemcu (delta bod 30)
  if (l.includes("scan qr") || l.includes("event qr")) return "qr";
  if (l.includes("split")) return "split";
  if (l.includes("iban")) return "iban";
  if (l.includes("dátum") || l.includes("datum")) return "datum";
  if (l.includes("suma") || l.includes("kapacita") || l.includes("koľko rúk") || l.includes("€") || l.includes("platnosť (dní)")) return "cislo";
  if (l.includes("foto") || l.includes("video") || l.includes("doklad") || l.includes("escrow")) return "foto";
  return "text";
}
function placeholderPola(label: string, t: TypPola): string {
  if (t === "cislo") return label.includes("€") || label.toLowerCase().includes("suma") ? "napr. 2000" : "napr. 10";
  if (t === "iban") return "SK00 0000 0000 0000 0000 0000";
  if (t === "text" && label.toLowerCase().includes("mená")) return "Zadaj mená (so súhlasom)…";
  return `Zadaj: ${label.replace(/\s*\(.*\)/, "").toLowerCase()}…`;
}
function PoleInput({ label, value, onChange, toast }: { label: string; value: string; onChange: (v: string) => void; toast: (m: string) => void }) {
  const t = typPola(label);
  const lab = <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".02em", marginBottom: SPACE.xxs }}>{label.toUpperCase()}</div>;

  // foto/QR → mock priloženie (attach) tlačidlom
  if (t === "foto" || t === "qr") {
    const priloz = () => { onChange(value ? "" : "✓"); toast(value ? "Odobraté" : t === "qr" ? "QR naskenované" : "Príloha nahraná"); };
    return (
      <div>{lab}
        <button type="button" onClick={priloz}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, height: 44, borderRadius: RADIUS.sm, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
            border: `1px ${value ? "solid" : "dashed"} ${value ? N.greenEdge : N.line}`, background: value ? N.greenBg : N.card, color: value ? N.green : N.txt2 }}>
          {value ? "✓ " : t === "qr" ? "▦ " : "📎 "}{value ? "Priložené — klikni pre zmenu" : t === "qr" ? "Skenovať QR" : "Priložiť foto/video"}
        </button>
      </div>
    );
  }
  // jednorazový 6-miestny kód príjemcu (bod 30) — PC-friendly, bez kamery;
  // po zadaní ukáže JEDNÉHO kandidáta (meno + KYC ✓) na potvrdenie
  if (t === "kod") {
    const cislice = value.replace(/\D/g, "");
    return (
      <div>{lab}
        <Input value={value} onChange={(v: string) => onChange(v.replace(/\D/g, "").slice(0, 6))} placeholder="napr. 482 913 · platí ~15 min" />
        <div style={{ fontSize: 10.5, color: N.txt3, lineHeight: 1.4, marginTop: SPACE.xxs }}>Príjemca si kód vygeneruje v appke („Pripojiť ma k zbierke"). Napíš ho — sken QR je len voliteľná skratka. Žiadna knižnica uložených QR.</div>
        {cislice.length === 6 && (
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.greenBg, border: `1px solid ${N.greenEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, marginTop: SPACE.xs, fontSize: 12 }}>
            <span style={{ fontSize: 15 }}>👤</span>
            <span style={{ color: N.txt }}><b>Mária Kováčová</b> · KYC ✓ — potvrdíš jedného kandidáta; jej padne notifikácia (obojstranný handshake)</span>
          </div>
        )}
      </div>
    );
  }
  // split → nastavuje sa dole cez „Rozdeliť dar (Split QR)"
  if (t === "split") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.greenBg, border: `1px solid ${N.greenEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, fontSize: 12, color: N.txt2 }}>
        <span>⚖</span><span>{label} — nastav nižšie cez <b style={{ color: N.green }}>Rozdeliť dar (Split QR)</b></span>
      </div>
    );
  }
  return (
    <div>{lab}
      <Input value={value} onChange={onChange} type={t === "cislo" ? "number" : t === "datum" ? "date" : "text"} placeholder={placeholderPola(label, t)} />
    </div>
  );
}
function ctaStyle(bg: string): React.CSSProperties {
  return { width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: bg, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer" };
}
