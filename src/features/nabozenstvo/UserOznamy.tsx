// ============================================================
// USER OZNAMY (Spomienkový · Jubilejný · Poďakovanie · Prosba o modlitbu)
// DEED_User_Oznamy_DEV (Martin + Fero, 6. 7. 2026; aktualizácia 17. 7. —
// pribudol SPOMIENKOVÝ oznam, premenovaný zo „smútočný": NIE JE to oznámenie
// o smrti (to je samostatné parte), ale neskoršia pamiatka — výročie úmrtia,
// nedožité jubileum, „spomíname na X". Žiadny pohreb, žiadna zbierka.)
// · Filozofia: feed tvorí primárne farár — self-add = ODBREMENENIE farára,
//   voliteľné (farnosť si ho zapne/vypne, prípadne spoplatní = self-funding).
// · VŽDY ZADARMO: prosba o modlitbu + spomienkový/smútočné (simónia) —
//   poplatok max pri jubileu/poďakovaní.
// · Režim A = jednoduchá karta (polia) · režim B = vlastný obrázok.
//   Obrázok: prednastavené (picker §5) / vlastné foto / bez fota.
// · TEXT formátovateľný (RichTextInput — paste z Wordu prežije, delta bod 14).
// · Reakcia kontextová (srdiečko / „modlím sa" / kondolencia) · žiadne
//   komentáre · bez zbierky.
// · TTL default 7 dní (prosba dlhšie, default 9) — oznamAktivny v mock.ts.
// ============================================================
import { useState } from "react";
import { SPACE, RADIUS, U } from "@/theme";
import { Input, Switch, RichTextInput, FotoVyber, Foto } from "@/shared";
import { cistyText } from "@/lib/richtext";
import { pressable } from "@/components/pressable";
import { N, SheetPanel } from "./ui";
import { nacitajStav, ulozStav } from "./stav";
import type { Farnost, NabozFeedItem, ReakciaTyp } from "./mock";

export type UserOznamTyp = "jubilejny" | "podakovanie" | "modlitba" | "spomienkovy";

// ---- nastavenie farnosti: „useri pridávajú sami" ON/OFF + voliteľný poplatok (€) ----
export interface SelfAddNastavenie { on: boolean; poplatok: number; }
export const nacitajSelfAdd = (fid: string): SelfAddNastavenie =>
  nacitajStav<SelfAddNastavenie>("selfadd", fid, { on: true, poplatok: 0 });
export const ulozSelfAdd = (fid: string, v: SelfAddNastavenie) => ulozStav("selfadd", fid, v);

// ---- prednastavené obrázky (§5) — Unsplash mock; Foto má emoji fallback ----
type Preset = { id: string; label: string; url: string; emoji: string };
// bohatšia, tematizovaná knižnica (delta bod 25) — kvalitné, dôstojné, nie náhodné
// stocky; portréty aj landscape (karta zobrazí oba pomery, contain)
const PRESETY: Record<UserOznamTyp, Preset[]> = {
  modlitba: [
    { id: "ruky", label: "Spojené ruky", url: U("photo-1545231027-637d2f6210f8"), emoji: "🙏" },
    { id: "svieca", label: "Horiaca sviečka", url: U("photo-1514302240736-b1fee5985889"), emoji: "🕯" },
    { id: "utecha", label: "Utešujúce ruky", url: U("photo-1516585427167-9f4af9627e6c"), emoji: "🤝" },
    { id: "kriz", label: "Kríž / ruženec", url: U("photo-1507692049790-de58290a4334"), emoji: "✝️" },
    { id: "vitraz", label: "Vitráž", url: U("photo-1548625149-fc4a29cf7092"), emoji: "⛪" },
  ],
  jubilejny: [
    { id: "torta", label: "Torta", url: U("photo-1578985545062-69928b1d9587"), emoji: "🎂" },
    { id: "kvety", label: "Kvety", url: U("photo-1490750967868-88aa4486c946"), emoji: "💐" },
    { id: "balony", label: "Balóny", url: U("photo-1530103862676-de8c9debad1d"), emoji: "🎈" },
    { id: "pripitok", label: "Prípitok", url: U("photo-1510812431401-41d2bd2722f3"), emoji: "🥂" },
    { id: "sviatocne", label: "Sviatočné", url: U("photo-1513151233558-d860c5398176"), emoji: "🎉" },
  ],
  podakovanie: [
    { id: "srdce", label: "Srdce", url: U("photo-1518199266791-5375a83190b7"), emoji: "❤️" },
    { id: "kvety", label: "Kvety", url: U("photo-1490750967868-88aa4486c946"), emoji: "💐" },
    { id: "ruky", label: "Spojené ruky", url: U("photo-1545231027-637d2f6210f8"), emoji: "🙏" },
    { id: "vdaka", label: "Ďakujem", url: U("photo-1499744937866-d7e566a20a61"), emoji: "🌷" },
  ],
  // spomienkový (§4.4): foto / preset sviečka · kríž / bez
  spomienkovy: [
    { id: "svieca", label: "Sviečka", url: U("photo-1514302240736-b1fee5985889"), emoji: "🕯" },
    { id: "kriz", label: "Kríž", url: U("photo-1507692049790-de58290a4334"), emoji: "✝️" },
    { id: "kvety", label: "Kvety", url: U("photo-1455659817273-f96807779a8a"), emoji: "🌹" },
  ],
};

const META: Record<UserOznamTyp, { emoji: string; titul: string; reakcia: ReakciaTyp; reakciaLabel: string; ttl: number }> = {
  jubilejny: { emoji: "🎂", titul: "Jubilejný oznam", reakcia: "blahozelanie", reakciaLabel: "❤ Srdiečko", ttl: 7 },
  podakovanie: { emoji: "🙏", titul: "Poďakovanie", reakcia: "srdce", reakciaLabel: "❤ Srdiečko", ttl: 7 },
  modlitba: { emoji: "🕊", titul: "Prosba o modlitbu", reakcia: "modlitba", reakciaLabel: "🙏 Modlím sa", ttl: 9 }, // modlitby bežia dlhšie (§8)
  spomienkovy: { emoji: "🕯", titul: "Spomienkový oznam", reakcia: "kondolencia", reakciaLabel: "🕯 Kondolencia", ttl: 7 }, // pamiatka/výročie (§4.4)
};

const lab = (t: string, povinne?: boolean) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>{t}{povinne && <span style={{ color: N.clay }}> *</span>}</div>
);

// ---- výber obrázka: prednastavené / vlastné foto / bez fota (§3, §5) ----
type ImageMode = "none" | "preset" | "upload";
function ObrazokVyber({ typ, imageMode, setImageMode, presetId, setPresetId, fotky, setFotky }: {
  typ: UserOznamTyp; imageMode: ImageMode; setImageMode: (m: ImageMode) => void;
  presetId: string | null; setPresetId: (id: string | null) => void;
  fotky: string[]; setFotky: (f: string[]) => void;
}) {
  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, textAlign: "center", padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, fontSize: 12, fontWeight: 700, cursor: "pointer", background: on ? N.indBg : N.card, border: `1px solid ${on ? N.indEdge : N.line}`, color: on ? N.ind : N.txt2 });
  return (
    <div>
      <div style={{ display: "flex", gap: SPACE.xs }}>
        <div {...pressable(() => setImageMode("none"), "Bez fota")} style={seg(imageMode === "none")}>Bez fota</div>
        <div {...pressable(() => setImageMode("preset"), "Predvolený obrázok")} style={seg(imageMode === "preset")}>Predvolené</div>
        <div {...pressable(() => setImageMode("upload"), "Vlastné foto")} style={seg(imageMode === "upload")}>Vlastné foto</div>
      </div>
      {imageMode === "preset" && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(PRESETY[typ].length, 4)}, 1fr)`, gap: SPACE.xs, marginTop: SPACE.sm }}>
          {PRESETY[typ].map((p) => {
            const on = presetId === p.id;
            return (
              <div key={p.id} {...pressable(() => setPresetId(on ? null : p.id), p.label)} style={{ borderRadius: RADIUS.sm, overflow: "hidden", cursor: "pointer", border: `2px solid ${on ? N.ind : N.line}`, background: N.card }}>
                <Foto src={p.url} emoji={p.emoji} h={64} alt={p.label} />
                <div style={{ fontSize: 9.5, fontWeight: 700, textAlign: "center", padding: `${SPACE.xxs}px 2px`, color: on ? N.ind : N.txt2 }}>{p.label}</div>
              </div>
            );
          })}
        </div>
      )}
      {imageMode === "upload" && <div style={{ marginTop: SPACE.sm }}><FotoVyber fotky={fotky} onZmena={setFotky} max={1} /></div>}
    </div>
  );
}

// ============================================================
// FORMULÁR — polia a poradie presne podľa §4 (per typ)
// ============================================================
export function UserOznamForm({ typ, farnost, autor, poplatok = 0, onPublish }: {
  typ: UserOznamTyp; farnost?: Farnost; autor: string; poplatok?: number; onPublish: (it: NabozFeedItem) => void;
}) {
  const m = META[typ];
  const [mode, setMode] = useState<"card" | "image">("card");
  // polia (per typ — nepoužité ostanú prázdne)
  const [meno, setMeno] = useState("");        // jubilejný: meno jubilanta · spomienkový: meno zosnulého
  const [dovod, setDovod] = useState("");      // jubilejný: dôvod/jubileum · poďakovanie: za čo · spomienkový: príležitosť
  const [komu, setKomu] = useState("");        // poďakovanie: komu (volit.)
  const [umysel, setUmysel] = useState("");    // modlitba: úmysel (môže byť bez mena)
  const [datum, setDatum] = useState("");      // jubilejný: dátum (volit.)
  const [datumNar, setDatumNar] = useState(""); // spomienkový: dátumy nar.–zom. (volit.)
  const [datumZom, setDatumZom] = useState("");
  const [text, setText] = useState("");        // formátovateľný text (rich) — NEZABIŤ formát (§6)
  const [bezMena, setBezMena] = useState(false); // modlitba: obsah anonymný, KYC autor v pozadí
  const [imageMode, setImageMode] = useState<ImageMode>("none");
  const [nazovEdit, setNazovEdit] = useState(""); // headline override (bod 18)
  const [presetId, setPresetId] = useState<string | null>(null);
  const [fotky, setFotky] = useState<string[]>([]);   // vlastné foto (režim A) / vlastný obrázok (režim B)
  const [platnost, setPlatnost] = useState(String(m.ttl)); // TTL §8
  const [preview, setPreview] = useState(false);

  const zadarmo = typ === "modlitba" || typ === "spomienkovy"; // + parte (rieši SmutocnyForm) — simónia (§2)
  const jePoplatok = !zadarmo && poplatok > 0;

  // povinné podľa §4: jubilejný = meno + dôvod · poďakovanie = za čo · modlitba = úmysel
  // · spomienkový = meno zosnulého + príležitosť; režim B navyše obrázok
  const poviaOk = typ === "jubilejny" || typ === "spomienkovy" ? !!(meno.trim() && dovod.trim())
    : typ === "podakovanie" ? !!dovod.trim() : !!umysel.trim();
  const validne = poviaOk && (mode === "card" || fotky.length > 0);

  const obrazok = mode === "image" ? fotky[0]
    : imageMode === "upload" ? fotky[0]
    : imageMode === "preset" && presetId ? PRESETY[typ].find((p) => p.id === presetId)?.url
    : undefined;

  // spomienkový: dátumy nar.–zom. sú voliteľné, zobrazia sa v popise (★ – ✝)
  const fmtD = (d: string) => (d ? new Date(d).toLocaleDateString("sk") : "");
  const rokyZivota = datumNar || datumZom ? `★ ${fmtD(datumNar) || "…"} – ✝ ${fmtD(datumZom) || "…"}` : "";

  const nazov = typ === "jubilejny" ? `${dovod.trim()} — ${meno.trim()}`
    : typ === "spomienkovy" ? `Spomíname — ${meno.trim()}`
    : typ === "podakovanie" ? `Poďakovanie${komu.trim() ? ` — ${komu.trim()}` : ""}`
    : "Prosba o modlitbu";
  const popisKratky = typ === "podakovanie" ? `Za: ${dovod.trim()}`
    : typ === "modlitba" ? umysel.trim()
    : typ === "spomienkovy" ? [dovod.trim(), rokyZivota].filter(Boolean).join(" · ")
    : (cistyText(text) || m.titul);

  function publikuj() {
    if (!validne) return;
    onPublish({
      id: `naboz-${Date.now()}`, comp: "data", typ: "skutok", modul: "charity", kat: "Komunita",
      ntyp: "oznam", skore: 5, typSituacie: "normal", dni: 0, podpora: 0,
      lat: farnost?.lat, lng: farnost?.lng, lok: farnost?.obec,
      farnostId: farnost?.id, cirkev: farnost?.cirkev ?? "",
      // hlavička = meno usera z registrácie (§2); „bez mena" = obsah anonymný, KYC v pozadí (§4.3)
      komunita: typ === "modlitba" && bezMena ? "Farník — bez mena" : autor,
      nazov: nazovEdit.trim() || nazov, overena: false, badgeL: `${m.emoji} OZNAM`, tag: "Oznam", emoji: m.emoji,
      popis: cistyText(text) || popisKratky, pribeh: text || undefined,
      datum: datum || undefined, reakciaTyp: m.reakcia,
      fotky: obrazok ? [obrazok] : undefined,
      vytvorene: Date.now(), platnostDni: Math.max(1, +platnost || m.ttl),
      spoplatnene: jePoplatok || undefined,
    });
  }

  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, textAlign: "center", padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.sm, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: on ? N.indBg : N.card, border: `1px solid ${on ? N.indEdge : N.line}`, color: on ? N.ind : N.txt2 });

  return (
    <div>
      <div style={{ fontSize: 12, color: N.txt2, marginBottom: SPACE.sm, lineHeight: 1.5 }}>
        <b>Auto-publish</b> (farár môže zmazať) · hlavička = tvoje meno z registrácie · poistka = KYC + 10-ročný ban za falošný oznam.
      </div>

      {/* poplatok / zadarmo (§2 — self-funding vs simónia) */}
      {zadarmo ? (
        <div style={{ fontSize: 11.5, fontWeight: 700, color: N.green, background: N.greenBg, border: `1px solid ${N.greenEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, marginBottom: SPACE.sm }}>
          🕊 VŽDY ZADARMO — {typ === "spomienkovy" ? "spomienkový oznam sa nikdy nespoplatňuje (ako smútočné)" : "prosba o modlitbu sa nikdy nespoplatňuje"} (ani v platenom režime).
        </div>
      ) : jePoplatok ? (
        <div style={{ fontSize: 11.5, color: N.txt2, background: N.goldBg, border: `1px solid ${N.goldEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, marginBottom: SPACE.sm }}>
          💶 Farnosť má oznamy spoplatnené: <b>{poplatok.toFixed(2)} €</b> (pokrýva náklady appky). Zaplatíš pri publikovaní.
        </div>
      ) : null}

      {/* režim A / B (§3) */}
      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.xxs }}>
        <div {...pressable(() => setMode("card"), "Jednoduchá karta")} style={seg(mode === "card")}>📄 Jednoduchá karta</div>
        <div {...pressable(() => setMode("image"), "Vlastný návrh (obrázok)")} style={seg(mode === "image")}>🖼 Vlastný návrh</div>
      </div>

      {/* polia podľa typu — poradie §4 */}
      {typ === "jubilejny" && (<>
        {lab("MENO JUBILANTA", true)}
        <Input value={meno} onChange={setMeno} placeholder="napr. Jozef Novák" />
        {lab("DÔVOD / JUBILEUM", true)}
        <Input value={dovod} onChange={setDovod} placeholder="napr. 90 rokov · 50. výročie sobáša" />
        {lab("DÁTUM — VOLITEĽNÉ")}
        <Input value={datum} onChange={setDatum} type="date" />
        {lab("TEXT BLAHOŽELANIA — VOLITEĽNÉ")}
        <RichTextInput minH={80} value={text} onChange={setText} placeholder="Napíš blahoželanie… Formát aj vloženie z Wordu prežijú." />
      </>)}
      {typ === "podakovanie" && (<>
        {lab("ZA ČO ĎAKUJEŠ", true)}
        <Input value={dovod} onChange={setDovod} placeholder="napr. pomoc pri oprave strechy" />
        {lab("KOMU — VOLITEĽNÉ")}
        <Input value={komu} onChange={setKomu} placeholder="napr. dobrovoľníkom z farnosti" />
        {lab("TEXT — VOLITEĽNÉ")}
        <RichTextInput minH={80} value={text} onChange={setText} placeholder="Napíš poďakovanie… Formát aj vloženie z Wordu prežijú." />
      </>)}
      {typ === "spomienkovy" && (<>
        {/* §4.4 — pamiatka/výročie: NIE JE oznámenie o smrti (to je samostatné parte) */}
        <div style={{ fontSize: 11.5, color: N.txt3, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, marginBottom: SPACE.xxs, lineHeight: 1.45 }}>
          Spomienka na zosnulého — výročie úmrtia, nedožité jubileum. Oznámenie o úmrtí (parte) je samostatný typ oznamu.
        </div>
        {lab("MENO ZOSNULÉHO", true)}
        <Input value={meno} onChange={setMeno} placeholder="napr. Jozef Novák" />
        {lab("PRÍLEŽITOSŤ", true)}
        <Input value={dovod} onChange={setDovod} placeholder="napr. 1. výročie úmrtia · nedožitých 80 rokov" />
        {lab("DÁTUMY NAR. – ZOM. — VOLITEĽNÉ")}
        <div style={{ display: "flex", gap: SPACE.xs }}>
          <div style={{ flex: 1 }}><Input value={datumNar} onChange={setDatumNar} type="date" /></div>
          <div style={{ flex: 1 }}><Input value={datumZom} onChange={setDatumZom} type="date" /></div>
        </div>
        {lab("TEXT SPOMIENKY — VOLITEĽNÉ")}
        <RichTextInput minH={80} value={text} onChange={setText} placeholder="Spomíname… Formát aj vloženie z Wordu prežijú." />
      </>)}
      {typ === "modlitba" && (<>
        {lab("ÚMYSEL — ZA KOHO / ZA ČO", true)}
        <Input value={umysel} onChange={setUmysel} placeholder="môže byť aj bez mena — napr. za chorú mamu" />
        {lab("TEXT — VOLITEĽNÉ")}
        <RichTextInput minH={80} value={text} onChange={setText} placeholder="Doplň prosbu… Formát aj vloženie z Wordu prežijú." />
        <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.md, fontSize: 13, color: N.txt2 }}>
          <Switch on={bezMena} onChange={setBezMena} ariaLabel="Bez mena" />
          <span><b>Bez mena</b> — obsah bude anonymný (tvoja identita KYC ostáva v pozadí)</span>
        </label>
      </>)}

      {/* obrázok (§3/§5) — režim B: obrázok JE oznam (povinný) · režim A: preset/vlastné/bez */}
      {mode === "image" ? (<>
        {lab("VLASTNÝ OBRÁZOK OZNAMU", true)}
        <FotoVyber fotky={fotky} onZmena={setFotky} max={1} />
      </>) : (<>
        {lab(typ === "jubilejny" ? "FOTO — SO SÚHLASOM JUBILANTA" : "OBRÁZOK")}
        <ObrazokVyber typ={typ} imageMode={imageMode} setImageMode={setImageMode}
          presetId={presetId} setPresetId={setPresetId} fotky={fotky} setFotky={setFotky} />
      </>)}

      {/* NÁZOV (delta bod 18) — headline; predvyplní sa z mena/subjektu, upraviteľný */}
      {lab("NÁZOV OZNAMU — PREDVYPLNENÝ, UPRAVITEĽNÝ")}
      <Input value={nazovEdit} onChange={setNazovEdit} placeholder={nazov} />

      {/* TTL (§8) */}
      {lab("PLATNOSŤ VO FEEDE (DNÍ)")}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
        <div style={{ width: 90 }}><Input value={platnost} onChange={setPlatnost} type="number" placeholder={String(m.ttl)} /></div>
        <div style={{ fontSize: 11, color: N.txt3, lineHeight: 1.4 }}>{typ === "modlitba" ? "Modlitby bežia dlhšie — default 9 dní." : "Default 7 dní."} Po expirácii oznam zmizne z feedu.</div>
      </div>

      {/* akcie pre usera (§7) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs, marginTop: SPACE.md }}>
        <MetaChip>{m.reakciaLabel}</MetaChip><MetaChip>↗ Zdieľať</MetaChip><MetaChip>bez komentárov · bez zbierky</MetaChip>
      </div>

      {/* ukážka → publikovať */}
      {!preview ? (
        <button onClick={() => setPreview(true)} disabled={!validne}
          style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: validne ? N.ind : N.card, color: validne ? "#fff" : N.txt3, fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: validne ? "pointer" : "not-allowed" }}>
          Ukážka
        </button>
      ) : (
        <>
          <div style={{ marginTop: SPACE.md, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.md, overflow: "hidden" }}>
            <div style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
              <div style={{ fontSize: 10.5, color: N.txt3, fontWeight: 700 }}>UKÁŽKA · hlavička</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: SPACE.xxs }}>{typ === "modlitba" && bezMena ? "Farník — bez mena 🔒" : autor}</div>
            </div>
            {/* bod 25: portrét aj landscape — obrázok sa zobrazí celý (contain), neoreže sa do pruhu */}
            {obrazok && <img src={obrazok} alt={nazov} style={{ display: "block", width: "100%", height: "auto", maxHeight: 260, objectFit: "contain", background: "#111" }} />}
            <div style={{ padding: `${SPACE.sm}px ${SPACE.gutter}px ${SPACE.gutter}px` }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{m.emoji} {nazovEdit.trim() || nazov}</div>
              <div style={{ fontSize: 12.5, color: N.txt2, marginTop: SPACE.xxs, lineHeight: 1.5 }}>{cistyText(text) || popisKratky}</div>
            </div>
          </div>
          <button onClick={publikuj} disabled={!validne}
            style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: validne ? N.green : N.card, color: validne ? "#fff" : N.txt3, fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: validne ? "pointer" : "not-allowed" }}>
            {jePoplatok ? `Zaplatiť ${poplatok.toFixed(2)} € a publikovať` : "Publikovať"}
          </button>
        </>
      )}
      {!validne && (
        <div style={{ fontSize: 11, color: N.clay, textAlign: "center", marginTop: SPACE.xs }}>
          Povinné: {typ === "jubilejny" ? "meno jubilanta · dôvod" : typ === "spomienkovy" ? "meno zosnulého · príležitosť" : typ === "podakovanie" ? "za čo" : "úmysel"}{mode === "image" ? " · vlastný obrázok" : ""}.
        </div>
      )}
      <div style={{ fontSize: 10, color: N.txt3, textAlign: "center", padding: `${SPACE.sm}px 0` }}>Žiadne komentáre — železné pravidlo platformy. Feed tvorí primárne farár; self-add ho odbremeňuje.</div>
    </div>
  );
}
function MetaChip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, color: N.txt2, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.pill, padding: `${SPACE.xxs}px ${SPACE.sm}px` }}>{children}</span>;
}

// ============================================================
// [SPRÁVCA] NASTAVENIE SELF-ADD — ON/OFF + voliteľný poplatok (§2)
// ============================================================
export function SelfAddSheet({ farnost, onClose, toast }: { farnost: Farnost; onClose: () => void; toast: (m: string) => void }) {
  const [v, setV] = useState<SelfAddNastavenie>(() => nacitajSelfAdd(farnost.id));
  const uloz = () => { ulozSelfAdd(farnost.id, { on: v.on, poplatok: Math.max(0, +v.poplatok || 0) }); toast(v.on ? "Oznamy farníkov: zapnuté" : "Oznamy farníkov: vypnuté"); onClose(); };
  return (
    <SheetPanel title="Oznamy od farníkov" onClose={onClose}>
      <div style={{ fontSize: 12, color: N.txt3, marginBottom: SPACE.md, lineHeight: 1.5 }}>
        Self-add = odbremenenie farára (jubileá, poďakovania, prosby o modlitbu si farníci pridajú sami, auto-publish). Feed tvorí primárne farár — toto je voliteľné.
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, fontSize: 14, fontWeight: 700 }}>
        <Switch on={v.on} onChange={(on) => setV((s) => ({ ...s, on }))} ariaLabel="Useri pridávajú sami" />
        Useri pridávajú sami
      </label>
      {v.on && (<>
        <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>POPLATOK ZA OZNAM (€) — VOLITEĽNÉ</div>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <div style={{ width: 110 }}><Input value={String(v.poplatok || "")} onChange={(x) => setV((s) => ({ ...s, poplatok: +x || 0 }))} type="number" placeholder="0" /></div>
          <div style={{ fontSize: 11, color: N.txt3, lineHeight: 1.4 }}>Self-funding — poplatky pokryjú náklady appky. 0 = zadarmo.</div>
        </div>
        <div style={{ fontSize: 11.5, color: N.green, background: N.greenBg, border: `1px solid ${N.greenEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, marginTop: SPACE.sm, lineHeight: 1.45 }}>
          🕊 <b>Prosba o modlitbu a smútočné oznamy sú VŽDY zadarmo</b> — nikdy sa nespoplatňujú ani v platenom režime (simónia).
        </div>
      </>)}
      <button onClick={uloz} style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: N.green, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer" }}>Uložiť</button>
    </SheetPanel>
  );
}
