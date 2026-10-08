// ============================================================
// OZNÁMENIE O ÚMRTÍ (parte) — DEED_Oznamenie_o_Umrti_DEV (Martin + Fero, 6. 7.;
// aktualizácia 17. 7. — režim 1/2 + zobrazenie).
// · §0: vytvára sa VŽDY ako čistý oznam (režim 1 — žiadne peniaze). Pohrebná
//   zbierka sa dá pripojiť AŽ POTOM tlačidlom „Pridať zbierku" priamo na ozname
//   (režim 2) — zbierka je SAMOSTATNÁ entita, formulár úmrtia jej polia nemá.
// · Režim A = šablóna (1 klasická · 2 teplá so sviečkou · 3 minimalistická) —
//   VŠETKY tri zobrazujú meno · dátumy+vek · verš · ROZLÚČKU (miesto+dátum+čas).
// · Režim B = vlastné parte ako obrázok — zobrazuje sa CELÉ na výšku (portrét,
//   neorezané), tap = zväčšiť; feed thumbnail = zmenšené celé parte.
// · Povinné polia sa ukladajú ako DÁTA (kalendár/notifikácie/hľadanie) — ŽIADNY
//   duplicitný panel pod oznamom (šablóna ich zobrazuje sama; pri obrázku len
//   minimálny systémový riadok nenápadne). Delta 1 bod 24 + Delta 2 bod 4.
// · Tvorí user (KYC, auto-publish — farár môže zmazať) ALEBO farár.
// · TEXT formátovateľný (RichTextInput — paste z Wordu prežije, delta bod 14).
// · Reakcia = srdiečko-kondolencia · Zdieľať · žiadne komentáre. Prispieť LEN
//   v režime 2 (napojená zbierka).
// · TTL §8: default 7 dní, nastaviteľné; nikdy neexpiruje pred rozlúčkou (+3 dni).
// ============================================================
import { useState } from "react";
import { SPACE, RADIUS } from "@/theme";
import { Input, FotoVyber, Foto, FormatovanyText } from "@/shared";
import { useVzhlad } from "@/lib/vzhladStranky";
import { Plagat, FormularOznamu, VyberSablony, chybaOznamu, vekOznamu, popisOznamu, prazdneUdaje, prvaVolba, type UdajeOznamu, type VolbaSablony } from "./Sablony";
import { cistyText } from "@/lib/richtext";
import { pressable } from "@/components/pressable";
import { N } from "./ui";
import { vekZDatumov, type SmutocnyData, type Farnost, type VieraFeedItem } from "./mock";

// prednastavené verše + možnosť vlastného (spec §4.3)
export const SMUTOCNE_VERSE = [
  "Odpočinutie večné daj im, Pane, a svetlo večné nech im svieti.",
  "Kto verí vo mňa, bude žiť, aj keď umrie. (Jn 11, 25)",
  "V našich srdciach žiješ ďalej.",
  "Neplačte, že som odišiel — ten pokoj mi prajte.",
];

const fmtDatum = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("sk") : "");

// ============================================================
// RENDER OZNAMU — šablóna / obrázok. ŽIADNY duplicitný panel polí pod oznamom
// (šablóna zobrazuje všetko sama; obrázok má len minimálny systémový riadok).
// Pevné „papierové" farby sú zámer (parte vyzerá rovnako v oboch motívoch).
// ============================================================
export function SmutocnyOznamBlok({ s, onKondolencia, onZvacsit }: { s: SmutocnyData; onKondolencia?: () => void; onZvacsit?: () => void }) {
  const vek = vekZDatumov(s.datumNar, s.datumUmr);
  const datumy = `${fmtDatum(s.datumNar)} — ${fmtDatum(s.datumUmr)}`;
  const rozlucka = `Posledná rozlúčka ${fmtDatum(s.rozluckaDatum)} o ${s.rozluckaCas} · ${s.rozluckaMiesto}`;
  return (
    <div>
      {/* — oznam (pre oko) — */}
      {s.mode !== "image" && s.sablona ? (
        /* OPRAVY 163: šablóna z jedného modulu (8 rozložení, motív, farby podľa vzhľadu) */
        <div style={{ display: "flex", justifyContent: "center" }}><span style={{ borderRadius: RADIUS.md, overflow: "hidden", border: `1px solid ${N.line}` }}><Plagat u={s.sablona.u} volba={s.sablona.volba} vz={s.sablona.vz} sirka={320} /></span></div>
      ) : s.mode === "image" && s.imageUrl ? (<>
        {/* bod 24: parte je dokument na výšku — zobraz CELÉ v pôvodnom pomere, tap = zväčšiť */}
        <img src={s.imageUrl} alt={`Smútočné parte — ${s.meno}`}
          onClick={onZvacsit}
          style={{ display: "block", width: "100%", height: "auto", maxHeight: 560, objectFit: "contain", borderRadius: RADIUS.md, border: `1px solid ${N.line}`, background: "#111", cursor: onZvacsit ? "zoom-in" : undefined }} />
        {/* minimálne systémové polia — nenápadne (pre kalendár/hľadanie), žiadny veľký duplicitný blok */}
        <div style={{ fontSize: 11, color: N.txt3, textAlign: "center", marginTop: SPACE.xxs }}>{s.meno}{s.rodena ? `, rodená ${s.rodena}` : ""} · †{fmtDatum(s.datumUmr)} · {rozlucka}</div>
      </>) : s.templateId === 2 ? (
        /* B — teplá: tmavá, zlaté akcenty, sviečka + „Zapáliť sviečku" (= kondolencia) */
        <div style={{ borderRadius: RADIUS.md, background: "#171412", border: "1px solid #3A3226", padding: `${SPACE.lg}px ${SPACE.md}px`, textAlign: "center", color: "#EFE6D5" }}>
          <div style={{ fontSize: 30 }}>🕯</div>
          <div style={{ fontSize: 11, letterSpacing: ".2em", color: "#D9B36A", fontWeight: 700, marginTop: SPACE.sm }}>S HLBOKÝM ZÁRMUTKOM OZNAMUJEME</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: SPACE.sm, fontFamily: "Georgia, serif" }}>{s.meno}</div>
          {s.rodena && <div style={{ fontSize: 12.5, fontStyle: "italic", color: "#C9BBA2", marginTop: 2 }}>rodená {s.rodena}</div>}
          <div style={{ fontSize: 13, color: "#C9BBA2", marginTop: SPACE.xxs }}>{datumy}{vek != null ? ` · ${vek} rokov` : ""}</div>
          {s.foto && <div style={{ margin: `${SPACE.md}px auto 0`, width: 110, height: 110, borderRadius: "50%", overflow: "hidden", border: "2px solid #D9B36A" }}><Foto src={s.foto} h={110} w={110} alt={s.meno} /></div>}
          {s.vers && <div style={{ fontStyle: "italic", fontSize: 13.5, lineHeight: 1.6, color: "#D9CBB0", marginTop: SPACE.md, fontFamily: "Georgia, serif" }}>„{s.vers}"</div>}
          {/* §6: aj Teplá MUSÍ zobraziť rozlúčku (bez nej stráca parte najdôležitejší praktický údaj) */}
          <div style={{ width: 46, borderTop: "1px solid #3A3226", margin: `${SPACE.md}px auto 0` }} />
          <div style={{ fontSize: 12.5, color: "#C9BBA2", marginTop: SPACE.sm }}>Posledná rozlúčka {fmtDatum(s.rozluckaDatum)} o {s.rozluckaCas}<br />{s.rozluckaMiesto}</div>
          {onKondolencia && (
            <button onClick={onKondolencia} style={{ marginTop: SPACE.md, padding: `${SPACE.sm}px ${SPACE.lg}px`, borderRadius: RADIUS.pill, border: "1px solid #D9B36A", background: "transparent", color: "#D9B36A", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              🕯 Zapáliť sviečku
            </button>
          )}
        </div>
      ) : s.templateId === 3 ? (
        /* C — minimalistická: veľká fotka v popredí, čistá */
        <div style={{ borderRadius: RADIUS.md, overflow: "hidden", border: `1px solid ${N.line}`, background: "#FFFFFF", color: "#1D1B18" }}>
          {s.foto && <Foto src={s.foto} h={230} alt={s.meno} />}
          <div style={{ padding: `${SPACE.md}px ${SPACE.md}px`, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: ".01em" }}>{s.meno}</div>
            {s.rodena && <div style={{ fontSize: 12.5, fontStyle: "italic", color: "#6B6459", marginTop: 2 }}>rodená {s.rodena}</div>}
            <div style={{ fontSize: 13, color: "#6B6459", marginTop: SPACE.xxs }}>{datumy}{vek != null ? ` · ${vek} rokov` : ""}</div>
            {s.vers && <div style={{ fontStyle: "italic", fontSize: 13, color: "#6B6459", marginTop: SPACE.sm, lineHeight: 1.55 }}>„{s.vers}"</div>}
            {/* §6: aj minimalistická zobrazuje rozlúčku */}
            <div style={{ fontSize: 12, color: "#4C4437", marginTop: SPACE.sm }}>Posledná rozlúčka {fmtDatum(s.rozluckaDatum)} o {s.rozluckaCas} · {s.rozluckaMiesto}</div>
          </div>
        </div>
      ) : (
        /* A — klasická (parte): krémová, formálna, krížik †, verš */
        <div style={{ borderRadius: RADIUS.md, background: "#F6F1E7", border: "1px solid #D8CDB8", padding: `${SPACE.lg}px ${SPACE.md}px`, textAlign: "center", color: "#2A2620", fontFamily: "Georgia, serif" }}>
          <div style={{ fontSize: 26, color: "#6B6151" }}>†</div>
          {s.foto && <div style={{ margin: `${SPACE.sm}px auto 0`, width: 96, height: 96, borderRadius: RADIUS.xs, overflow: "hidden", border: "1px solid #C9BCA2" }}><Foto src={s.foto} h={96} w={96} alt={s.meno} /></div>}
          <div style={{ fontSize: 12, letterSpacing: ".12em", color: "#6B6151", marginTop: SPACE.sm }}>V TICHEJ SPOMIENKE</div>
          <div style={{ fontSize: 23, fontWeight: 700, marginTop: SPACE.xxs }}>{s.meno}</div>
          {s.rodena && <div style={{ fontSize: 13, fontStyle: "italic", color: "#6B6151", marginTop: 2 }}>rodená {s.rodena}</div>}
          <div style={{ fontSize: 13.5, color: "#4C4437", marginTop: SPACE.xxs }}>{datumy}{vek != null ? ` · vo veku ${vek} rokov` : ""}</div>
          {s.vers && <div style={{ fontStyle: "italic", fontSize: 13.5, lineHeight: 1.6, color: "#4C4437", marginTop: SPACE.md, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>„{s.vers}"</div>}
          <div style={{ width: 46, borderTop: "1px solid #C9BCA2", margin: `${SPACE.md}px auto 0` }} />
          <div style={{ fontSize: 12.5, color: "#4C4437", marginTop: SPACE.sm }}>Posledná rozlúčka {fmtDatum(s.rozluckaDatum)} o {s.rozluckaCas}<br />{s.rozluckaMiesto}</div>
        </div>
      )}

      {/* — voliteľný formátovateľný text (§5 — rich, odseky aj Word paste prežijú) — */}
      {s.text && cistyText(s.text) && (
        <FormatovanyText text={s.text} style={{ fontSize: 13.5, lineHeight: 1.55, color: N.txt2, marginTop: SPACE.sm, padding: `0 ${SPACE.xs}px` }} />
      )}
      {/* ŽIADNY duplicitný panel polí pod oznamom — šablóna ich zobrazuje sama;
          pri obrázku je minimálny systémový riadok priamo pod parte (bod 24). */}
    </div>
  );
}

// ============================================================
// MINI PARTE — feed thumbnail (bod 23): do feedu ide vyrenderovaná dôstojná
// parte kartička, NIE surová osobná fotka tváre. Obrázkový režim = zmenšené
// celé parte (portrét, contain), šablóna = mini dlaždica s † a menom.
// ============================================================
export function ParteMiniatura({ s, w = 52, h = 64 }: { s: SmutocnyData; w?: number; h?: number }) {
  if (s.mode === "image" && s.imageUrl) {
    return <img src={s.imageUrl} alt={`Parte — ${s.meno}`} style={{ width: w, height: h, objectFit: "contain", background: "#111", borderRadius: RADIUS.xs, border: `1px solid ${N.line}`, flex: "none", display: "block" }} />;
  }
  if (s.sablona) return <span style={{ flex: "none", borderRadius: RADIUS.xs, overflow: "hidden", border: `1px solid ${N.line}`, display: "block", width: w, height: h }}><Plagat u={s.sablona.u} volba={s.sablona.volba} vz={s.sablona.vz} sirka={w} /></span>;
  const tepla = s.templateId === 2;
  return (
    <div style={{ width: w, height: h, flex: "none", borderRadius: RADIUS.xs, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, textAlign: "center", padding: 3, boxSizing: "border-box",
      background: tepla ? "#171412" : "#F6F1E7", border: `1px solid ${tepla ? "#3A3226" : "#D8CDB8"}`, color: tepla ? "#EFE6D5" : "#2A2620", fontFamily: "Georgia, serif" }}>
      <span style={{ fontSize: 13, lineHeight: 1, color: tepla ? "#D9B36A" : "#6B6151" }}>{tepla ? "🕯" : "†"}</span>
      <span style={{ fontSize: 7.5, fontWeight: 700, lineHeight: 1.15, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{s.meno}</span>
    </div>
  );
}

// ============================================================
// FORMULÁR — OPRAVY 163: jeden modul šablón (Sablony.tsx) pre farára aj veriaceho.
// Režim šablóna = formulár parte + 8 šablón; režim obrázok = vlastné parte + tie isté polia (kalendár, hľadanie).
// ============================================================
export function SmutocnyForm({ farnost, autor, farar, onPublish }: {
  farnost?: Farnost; autor: string; farar?: boolean; onPublish: (it: VieraFeedItem) => void;
}) {
  const [mode, setMode] = useState<"template" | "image">("template");
  const [u, setU] = useState<UdajeOznamu>(() => prazdneUdaje("parte"));
  const [volba, setVolba] = useState<VolbaSablony>(() => prvaVolba("parte"));
  const vz = useVzhlad(farnost?.id ?? "", false);
  const [fotky, setFotky] = useState<string[]>([]);   // režim obrázok: samotné parte (povinné)
  const [nazov, setNazov] = useState("");             // headline (bod 18) — prefill z mena, upraviteľný
  const [platnost, setPlatnost] = useState("7");      // TTL §8 — default 7 dní, nastaviteľné

  const chyba = chybaOznamu(u) ?? (mode === "image" && !fotky.length ? "Nahrajte obrázok parte." : null);
  const vek = vekOznamu(u.nar, u.umr).vek;
  const data: SmutocnyData = {
    mode, imageUrl: mode === "image" ? fotky[0] : undefined,
    meno: u.meno.trim(), rodena: u.zena && u.rod.trim() ? u.rod.trim() : undefined, datumNar: u.nar, datumUmr: u.umr,
    rozluckaMiesto: u.kde.trim(), rozluckaDatum: u.kedyD, rozluckaCas: u.kedyC,
    foto: mode === "template" ? u.foto : undefined, text: u.text.trim() || undefined,
    sablona: mode === "template" ? { u, volba, vz } : undefined,
  };

  function publikuj() {
    if (chyba) return;
    // §0: LEN OZNAM — žiadne pole zbierky, žiadny odkaz na zbierku (ciel/split sa nenastavujú)
    onPublish({
      id: `naboz-${Date.now()}`, comp: "data", typ: "skutok", modul: "charity", kat: "Komunita",
      ntyp: "oznam", skore: 6, typSituacie: "normal", dni: 0, podpora: 0,
      lat: farnost?.lat, lng: farnost?.lng, lok: farnost?.obec,
      farnostId: farnost?.id, cirkev: farnost?.cirkev ?? "",
      komunita: farar ? farnost?.nazov ?? autor : autor, overena: !!farar,
      nazov: nazov.trim() || `Oznámenie o úmrtí — ${u.meno.trim()}`, tag: "Oznam",
      popis: `V spomienke na ${popisOznamu(u)}`,
      datum: u.kedyD || undefined, ukat: "pohreb", reakciaTyp: "kondolencia",
      fotky: mode === "image" ? fotky : u.foto ? [u.foto] : undefined, smutocny: data,
      vytvorene: Date.now(), platnostDni: Math.max(1, +platnost || 7),
    });
  }

  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, textAlign: "center", padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.sm, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: on ? N.indBg : N.card, border: `1px solid ${on ? N.indEdge : N.line}`, color: on ? N.ind : N.txt2 });
  const lab = (t: string, povinne?: boolean) => <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>{t}{povinne && <span style={{ color: N.clay }}> *</span>}</div>;

  return (
    <div>
      <div style={{ fontSize: 12, color: N.txt2, marginBottom: SPACE.sm, lineHeight: 1.5 }}>
        Dôstojné oznámenie úmrtia zo šablóny alebo z vlastného parte. Zverejní sa hneď, farár ho môže zmazať.
      </div>
      <div style={{ display: "flex", gap: SPACE.xs }}>
        <div {...pressable(() => setMode("template"), "Šablóna")} style={seg(mode === "template")}>Šablóna</div>
        <div {...pressable(() => setMode("image"), "Vlastné parte")} style={seg(mode === "image")}>Vlastné parte (obrázok)</div>
      </div>
      {mode === "image" && <>
        {lab("OBRÁZOK PARTE (zobrazí sa celý, neorezaný)", true)}
        <FotoVyber fotky={fotky} onZmena={setFotky} max={1} cele />
      </>}
      <div style={{ marginTop: SPACE.md }}><FormularOznamu u={u} onU={setU} bezFotky={mode === "image"} /></div>
      {mode === "template" && (u.zena == null
        ? <div style={{ fontSize: 12.5, color: N.txt3, marginTop: SPACE.md }}>Šablóny sa ukážu, keď vyššie vyberiete Muž alebo Žena.</div>
        : <div style={{ marginTop: SPACE.md }}>{lab("VYBERTE VZHĽAD · 8 ŠABLÓN")}<VyberSablony u={u} volba={volba} onVolba={setVolba} vz={vz} mobil /></div>)}

      {lab("NÁZOV OZNAMU — PREDVYPLNENÝ, UPRAVITEĽNÝ")}
      <Input value={nazov} onChange={setNazov} placeholder={u.meno.trim() ? `Oznámenie o úmrtí — ${u.meno.trim()}` : "Oznámenie o úmrtí — …"} />
      {lab("PLATNOSŤ VO FEEDE (DNÍ)")}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
        <div style={{ width: 90 }}><Input value={platnost} onChange={setPlatnost} type="number" placeholder="7" /></div>
        <div style={{ fontSize: 11, color: N.txt3, lineHeight: 1.4 }}>Predvolene 7 dní · oznam nezmizne pred rozlúčkou (+3 dni po nej).</div>
      </div>
      <button onClick={publikuj} disabled={!!chyba}
        style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: chyba ? N.card : N.green, color: chyba ? N.txt3 : "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: chyba ? "not-allowed" : "pointer" }}>
        Zverejniť parte
      </button>
      {chyba && <div style={{ fontSize: 11.5, color: N.clay, textAlign: "center", marginTop: SPACE.xs }}>{chyba}</div>}
      {vek && !chyba && <div style={{ fontSize: 11, color: N.txt3, textAlign: "center", marginTop: SPACE.xs }}>Vek {vek} rokov sa ukáže na parte.</div>}
    </div>
  );
}
