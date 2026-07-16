// ============================================================
// SMÚTOČNÝ OZNAM (úmrtie) — DEED_Smutocny_Oznam_DEV.md (Martin + Fero, 6. 7. 2026)
// · Režim A = šablóna (1 klasická · 2 teplá so sviečkou · 3 minimalistická)
// · Režim B = vlastné parte ako obrázok
// · V OBOCH režimoch povinné štruktúrované polia POD oznamom (obrázok je pre
//   oko, polia pre systém — kalendár, notifikácie, hľadanie, odkaz na zbierku).
// · Auto-publish (user KYC) · reakcia = srdiečko-kondolencia · žiadne komentáre.
// · Pohrebnú zbierku pripája LEN farár (strom „+" → Pohreb) — tu sa netvorí.
// · TTL §8b: default 7 dní, nastaviteľné; nikdy neexpiruje pred rozlúčkou + 3 dni.
// ============================================================
import { useState } from "react";
import { SPACE, RADIUS } from "@/theme";
import { Input, FotoVyber, Foto } from "@/shared";
import { pressable } from "@/components/pressable";
import { N } from "./ui";
import { vekZDatumov, type SmutocnyData, type Farnost, type NabozFeedItem } from "./mock";

// prednastavené verše + možnosť vlastného (spec §4.3)
export const SMUTOCNE_VERSE = [
  "Odpočinutie večné daj im, Pane, a svetlo večné nech im svieti.",
  "Kto verí vo mňa, bude žiť, aj keď umrie. (Jn 11, 25)",
  "V našich srdciach žiješ ďalej.",
  "Neplačte, že som odišiel — ten pokoj mi prajte.",
];

const SABLONY: { id: 1 | 2 | 3; nazov: string; popis: string }[] = [
  { id: 1, nazov: "Klasická", popis: "krémová · formálna · krížik † · verš" },
  { id: 2, nazov: "Teplá", popis: "tmavá · zlaté akcenty · sviečka" },
  { id: 3, nazov: "Minimalistická", popis: "veľká fotka v popredí · čistá" },
];

const fmtDatum = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("sk") : "");

// ============================================================
// RENDER OZNAMU — šablóna / obrázok + ŠTRUKTÚROVANÉ POLIA POD NÍM (spec §3)
// Pevné „papierové" farby sú zámer (parte vyzerá rovnako v oboch motívoch).
// ============================================================
export function SmutocnyOznamBlok({ s, onKondolencia }: { s: SmutocnyData; onKondolencia?: () => void }) {
  const vek = vekZDatumov(s.datumNar, s.datumUmr);
  const datumy = `${fmtDatum(s.datumNar)} — ${fmtDatum(s.datumUmr)}`;
  return (
    <div>
      {/* — oznam (pre oko) — */}
      {s.mode === "image" && s.imageUrl ? (
        <div style={{ borderRadius: RADIUS.md, overflow: "hidden", border: `1px solid ${N.line}` }}>
          <Foto src={s.imageUrl} h={320} alt={`Smútočné parte — ${s.meno}`} />
        </div>
      ) : s.templateId === 2 ? (
        /* B — teplá: tmavá, zlaté akcenty, sviečka + „Zapáliť sviečku" (= kondolencia) */
        <div style={{ borderRadius: RADIUS.md, background: "#171412", border: "1px solid #3A3226", padding: `${SPACE.lg}px ${SPACE.md}px`, textAlign: "center", color: "#EFE6D5" }}>
          <div style={{ fontSize: 30 }}>🕯</div>
          <div style={{ fontSize: 11, letterSpacing: ".2em", color: "#D9B36A", fontWeight: 700, marginTop: SPACE.sm }}>S HLBOKÝM ZÁRMUTKOM OZNAMUJEME</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: SPACE.sm, fontFamily: "Georgia, serif" }}>{s.meno}</div>
          <div style={{ fontSize: 13, color: "#C9BBA2", marginTop: SPACE.xxs }}>{datumy}{vek != null ? ` · ${vek} rokov` : ""}</div>
          {s.foto && <div style={{ margin: `${SPACE.md}px auto 0`, width: 110, height: 110, borderRadius: "50%", overflow: "hidden", border: "2px solid #D9B36A" }}><Foto src={s.foto} h={110} w={110} alt={s.meno} /></div>}
          {s.vers && <div style={{ fontStyle: "italic", fontSize: 13.5, lineHeight: 1.6, color: "#D9CBB0", marginTop: SPACE.md, fontFamily: "Georgia, serif" }}>„{s.vers}"</div>}
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
            <div style={{ fontSize: 13, color: "#6B6459", marginTop: SPACE.xxs }}>{datumy}{vek != null ? ` · ${vek} rokov` : ""}</div>
            {s.vers && <div style={{ fontStyle: "italic", fontSize: 13, color: "#6B6459", marginTop: SPACE.sm, lineHeight: 1.55 }}>„{s.vers}"</div>}
          </div>
        </div>
      ) : (
        /* A — klasická (parte): krémová, formálna, krížik †, verš */
        <div style={{ borderRadius: RADIUS.md, background: "#F6F1E7", border: "1px solid #D8CDB8", padding: `${SPACE.lg}px ${SPACE.md}px`, textAlign: "center", color: "#2A2620", fontFamily: "Georgia, serif" }}>
          <div style={{ fontSize: 26, color: "#6B6151" }}>†</div>
          {s.foto && <div style={{ margin: `${SPACE.sm}px auto 0`, width: 96, height: 96, borderRadius: RADIUS.xs, overflow: "hidden", border: "1px solid #C9BCA2" }}><Foto src={s.foto} h={96} w={96} alt={s.meno} /></div>}
          <div style={{ fontSize: 12, letterSpacing: ".12em", color: "#6B6151", marginTop: SPACE.sm }}>V TICHEJ SPOMIENKE</div>
          <div style={{ fontSize: 23, fontWeight: 700, marginTop: SPACE.xxs }}>{s.meno}</div>
          <div style={{ fontSize: 13.5, color: "#4C4437", marginTop: SPACE.xxs }}>{datumy}{vek != null ? ` · vo veku ${vek} rokov` : ""}</div>
          {s.vers && <div style={{ fontStyle: "italic", fontSize: 13.5, lineHeight: 1.6, color: "#4C4437", marginTop: SPACE.md, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>„{s.vers}"</div>}
          <div style={{ width: 46, borderTop: "1px solid #C9BCA2", margin: `${SPACE.md}px auto 0` }} />
          <div style={{ fontSize: 12.5, color: "#4C4437", marginTop: SPACE.sm }}>Posledná rozlúčka {fmtDatum(s.rozluckaDatum)} o {s.rozluckaCas}<br />{s.rozluckaMiesto}</div>
        </div>
      )}

      {/* — štruktúrované polia POD oznamom (povinné v OBOCH režimoch, spec §3) — */}
      <div style={{ marginTop: SPACE.sm, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
        <PoleRiadok k="Spomíname" v={s.meno} />
        <PoleRiadok k="Dátumy" v={`${datumy}${vek != null ? ` · ${vek} rokov` : ""}`} />
        {s.vers && <PoleRiadok k="Verš" v={`„${s.vers}"`} />}
        <PoleRiadok k="Rozlúčka" v={`${s.rozluckaMiesto} · ${fmtDatum(s.rozluckaDatum)} o ${s.rozluckaCas}`} posledny />
      </div>
    </div>
  );
}
function PoleRiadok({ k, v, posledny }: { k: string; v: string; posledny?: boolean }) {
  return (
    <div style={{ display: "flex", gap: SPACE.sm, padding: `${SPACE.xs}px 0`, borderBottom: posledny ? "none" : `1px solid ${N.line}`, fontSize: 12.5 }}>
      <span style={{ flex: "none", width: 86, color: N.txt3, fontWeight: 700 }}>{k}</span>
      <span style={{ color: N.txt, minWidth: 0 }}>{v}</span>
    </div>
  );
}

// ============================================================
// FORMULÁR — poradie polí presne podľa spec §4:
// meno → dátumy + vek → verš → rozlúčka (kde + kedy) → foto → šablóna → ukážka → potvrdiť
// ============================================================
export function SmutocnyForm({ farnost, autor, onPublish }: {
  farnost?: Farnost; autor: string; onPublish: (it: NabozFeedItem) => void;
}) {
  const [mode, setMode] = useState<"template" | "image">("template");
  const [meno, setMeno] = useState("");
  const [datumNar, setDatumNar] = useState("");
  const [datumUmr, setDatumUmr] = useState("");
  const [versIdx, setVersIdx] = useState<number | "vlastny" | null>(null);
  const [versVlastny, setVersVlastny] = useState("");
  const [miesto, setMiesto] = useState("");
  const [rozDatum, setRozDatum] = useState("");
  const [rozCas, setRozCas] = useState("");
  const [fotky, setFotky] = useState<string[]>([]);   // A: voliteľná fotka · B: samotné parte (povinné)
  const [sablona, setSablona] = useState<1 | 2 | 3>(1);
  const [platnost, setPlatnost] = useState("7");      // TTL §8b — default 7 dní, nastaviteľné
  const [preview, setPreview] = useState(false);

  const vek = vekZDatumov(datumNar, datumUmr);
  const vers = versIdx === "vlastny" ? versVlastny.trim() : versIdx != null ? SMUTOCNE_VERSE[versIdx] : "";
  // povinné minimum (oba režimy): meno · dátumy · čas + miesto rozlúčky; režim B navyše obrázok
  const validne = !!(meno.trim() && datumNar && datumUmr && miesto.trim() && rozDatum && rozCas && (mode === "template" || fotky.length));

  const data: SmutocnyData = {
    mode, templateId: mode === "template" ? sablona : undefined,
    imageUrl: mode === "image" ? fotky[0] : undefined,
    meno: meno.trim(), datumNar, datumUmr, vers: vers || undefined,
    rozluckaMiesto: miesto.trim(), rozluckaDatum: rozDatum, rozluckaCas: rozCas,
    foto: mode === "template" ? fotky[0] : undefined,
  };

  function publikuj() {
    if (!validne) return;
    onPublish({
      id: `naboz-${Date.now()}`, comp: "data", typ: "skutok", modul: "charity", kat: "Komunita",
      ntyp: "oznam", skore: 6, typSituacie: "normal", dni: 0, podpora: 0,
      lat: farnost?.lat, lng: farnost?.lng, lok: farnost?.obec,
      farnostId: farnost?.id, cirkev: farnost?.cirkev ?? "", komunita: autor,
      nazov: `Smútočný oznam — ${meno.trim()}`, overena: false, badgeL: "🕯 OZNAM", tag: "Oznam", emoji: "🕯",
      popis: `V spomienke na ${meno.trim()}${vek != null ? ` (†${vek})` : ""} · rozlúčka ${fmtDatum(rozDatum)} o ${rozCas}, ${miesto.trim()}`,
      datum: rozDatum, ukat: "pohreb", reakciaTyp: "kondolencia",
      fotky: fotky.length ? fotky : undefined, smutocny: data,
      vytvorene: Date.now(), platnostDni: Math.max(1, +platnost || 7),
    });
  }

  const seg = (on: boolean): React.CSSProperties => ({ flex: 1, textAlign: "center", padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.sm, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: on ? N.indBg : N.card, border: `1px solid ${on ? N.indEdge : N.line}`, color: on ? N.ind : N.txt2 });
  const lab = (t: string, povinne?: boolean) => <div style={{ fontSize: 11, fontWeight: 700, color: N.txt3, letterSpacing: ".03em", margin: `${SPACE.md}px 0 ${SPACE.xxs}px` }}>{t}{povinne && <span style={{ color: N.clay }}> *</span>}</div>;

  return (
    <div>
      <div style={{ fontSize: 12, color: N.txt2, marginBottom: SPACE.sm, lineHeight: 1.5 }}>
        Dôstojný oznam do šablóny alebo z vlastného parte. <b>Auto-publish</b> (farár/nahlásenie môže zmazať) · poistka = KYC + 10-ročný ban za falošný oznam. Pohrebnú zbierku môže pripojiť <b>len farár</b>.
      </div>

      {/* režim A / B (spec §3) */}
      <div style={{ display: "flex", gap: SPACE.xs }}>
        <div {...pressable(() => setMode("template"), "Režim šablóna")} style={seg(mode === "template")}>📄 Šablóna</div>
        <div {...pressable(() => setMode("image"), "Režim vlastné parte")} style={seg(mode === "image")}>🖼 Vlastné parte (obrázok)</div>
      </div>

      {/* 1 · meno */}
      {lab("MENO — KOHO SPOMÍNAME", true)}
      <Input value={meno} onChange={setMeno} placeholder="napr. Anna Kováčová" />

      {/* 2 · dátumy + vek (dopočíta sa) */}
      {lab("DÁTUMY — NARODENIE · ÚMRTIE", true)}
      <div style={{ display: "flex", gap: SPACE.sm, alignItems: "center" }}>
        <div style={{ flex: 1 }}><Input value={datumNar} onChange={setDatumNar} type="date" /></div>
        <div style={{ flex: 1 }}><Input value={datumUmr} onChange={setDatumUmr} type="date" /></div>
        <div style={{ flex: "none", fontSize: 12.5, fontWeight: 700, color: vek != null ? N.txt : N.txt3, minWidth: 64, textAlign: "center" }}>{vek != null ? `${vek} rokov` : "vek —"}</div>
      </div>

      {/* 3 · verš — výber + vlastný */}
      {lab("VERŠ — ODPORÚČANÉ")}
      <div style={{ display: "grid", gap: SPACE.xs }}>
        {SMUTOCNE_VERSE.map((v, i) => (
          <div key={i} {...pressable(() => setVersIdx(versIdx === i ? null : i), "Vybrať verš")} style={{ fontSize: 12, fontStyle: "italic", lineHeight: 1.45, padding: `${SPACE.xs}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, cursor: "pointer", background: versIdx === i ? N.indBg : N.card, border: `1px solid ${versIdx === i ? N.indEdge : N.line}`, color: versIdx === i ? N.txt : N.txt2 }}>„{v}"</div>
        ))}
        <div {...pressable(() => setVersIdx(versIdx === "vlastny" ? null : "vlastny"), "Vlastný verš")} style={{ fontSize: 12, fontWeight: 700, padding: `${SPACE.xs}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, cursor: "pointer", background: versIdx === "vlastny" ? N.indBg : N.card, border: `1px dashed ${versIdx === "vlastny" ? N.indEdge : N.line}`, color: versIdx === "vlastny" ? N.ind : N.txt2 }}>✍️ Vlastný verš…</div>
        {versIdx === "vlastny" && <Input value={versVlastny} onChange={setVersVlastny} placeholder="Napíš vlastný verš…" />}
      </div>

      {/* 4 · rozlúčka — kde + kedy */}
      {lab("ROZLÚČKA — KDE + KEDY", true)}
      <div style={{ display: "grid", gap: SPACE.sm }}>
        <Input value={miesto} onChange={setMiesto} placeholder="Miesto (napr. Dom smútku Trenčín)" />
        <div style={{ display: "flex", gap: SPACE.sm }}>
          <div style={{ flex: 1.4 }}><Input value={rozDatum} onChange={setRozDatum} type="date" /></div>
          <div style={{ flex: 1 }}><Input value={rozCas} onChange={setRozCas} type="time" /></div>
        </div>
      </div>

      {/* 5 · foto — A voliteľné · B povinný obrázok parte */}
      {lab(mode === "image" ? "OBRÁZOK PARTE" : "FOTO — VOLITEĽNÉ", mode === "image")}
      <FotoVyber fotky={fotky} onZmena={setFotky} max={1} />
      {mode === "image" && <div style={{ fontSize: 11, color: N.txt3, marginTop: SPACE.xxs }}>Obrázok je pre oko — polia vyššie sú pre systém (kalendár, notifikácie, hľadanie) a zobrazia sa pod oznamom.</div>}

      {/* 6 · šablóna (režim A) */}
      {mode === "template" && (<>
        {lab("ŠABLÓNA")}
        <div style={{ display: "flex", gap: SPACE.xs }}>
          {SABLONY.map((s) => (
            <div key={s.id} {...pressable(() => setSablona(s.id), `Šablóna ${s.nazov}`)} style={{ flex: 1, padding: `${SPACE.sm}px ${SPACE.xs}px`, borderRadius: RADIUS.sm, textAlign: "center", cursor: "pointer", background: sablona === s.id ? N.indBg : N.card, border: `1px solid ${sablona === s.id ? N.indEdge : N.line}` }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: sablona === s.id ? N.ind : N.txt }}>{s.id} · {s.nazov}</div>
              <div style={{ fontSize: 9.5, color: N.txt3, marginTop: 2, lineHeight: 1.35 }}>{s.popis}</div>
            </div>
          ))}
        </div>
      </>)}

      {/* platnosť (TTL §8b) — default 7 dní, nastaviteľné; pri úmrtí nikdy pred rozlúčkou */}
      {lab("PLATNOSŤ VO FEEDE (DNÍ)")}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
        <div style={{ width: 90 }}><Input value={platnost} onChange={setPlatnost} type="number" placeholder="7" /></div>
        <div style={{ fontSize: 11, color: N.txt3, lineHeight: 1.4 }}>Default 7 dní · oznam nikdy nezmizne pred rozlúčkou (+3 dni po nej).</div>
      </div>

      {/* 7 · ukážka → 8 · potvrdiť */}
      {!preview ? (
        <button onClick={() => setPreview(true)} disabled={!validne}
          style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: validne ? N.ind : N.card, color: validne ? "#fff" : N.txt3, fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: validne ? "pointer" : "not-allowed" }}>
          Ukážka
        </button>
      ) : (
        <>
          <div style={{ marginTop: SPACE.md }}>
            <div style={{ fontSize: 10.5, color: N.txt3, fontWeight: 700, marginBottom: SPACE.xs }}>UKÁŽKA · takto to uvidí komunita ({autor})</div>
            <SmutocnyOznamBlok s={data} />
          </div>
          <button onClick={publikuj} disabled={!validne}
            style={{ width: "100%", marginTop: SPACE.md, height: 48, border: "none", borderRadius: RADIUS.md, background: validne ? N.green : N.card, color: validne ? "#fff" : N.txt3, fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: validne ? "pointer" : "not-allowed" }}>
            Potvrdiť a publikovať
          </button>
        </>
      )}
      {!validne && <div style={{ fontSize: 11, color: N.clay, textAlign: "center", marginTop: SPACE.xs }}>Povinné: meno · dátumy · miesto + dátum + čas rozlúčky{mode === "image" ? " · obrázok parte" : ""}.</div>}
      <div style={{ fontSize: 10, color: N.txt3, textAlign: "center", padding: `${SPACE.sm}px 0` }}>Srdiečko = kondolencia · žiadne komentáre (železné pravidlo). Oznam patrí komunite, zbierka farnosti.</div>
    </div>
  );
}
