// ============================================================
// KARTA 56G §4–5 · OPRAVY 167 — Správa farnosti → Oznamy (prototyp „Sprava farnosti - prvy prichod", PC).
// Čo chcete oznámiť: Krátky oznam · Udalosť · Oznámenie (parte, svadba, jubileum). Bez „Kde sa ukáže",
// bez „Pri akcii zbierame na", bez výzvy na súrnu pomoc — oznam je len na profile pre sledujúcich.
// Zverejnenie podržaním, živý náhľad vpravo, zoznam zverejnených s červeným ×.
// 56H §1: ohlášky sa tu netlačia — tlač len v Omše → Vytlačiť na nástenku (plagát má hore OZNAMY).
// Oznamy = príspevky farnosti (viera/mock pridajPrispevok — tie isté, ktoré ukazuje profil farnosti).
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RichTextInput } from "@/components/richtext";
import { spracujFotku } from "@/lib/obrazok";
import { useVzhlad } from "@/lib/vzhladStranky";
import type { MediumZbierky } from "@/lib/novaZbierka";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { GaleriaEditor, cistyText, NASTROJE } from "./obsahZbierky";
import { pridajPrispevok, vlastnePrispevky, zmazPrispevok, type VieraFeedItem } from "@/features/viera/mock";
import { FormularOznamu, VyberSablony, Plagat, prazdneUdaje, prvaVolba, chybaOznamu, popisOznamu, type DruhOznamu, type UdajeOznamu, type VolbaSablony } from "@/features/viera/Sablony";
import { zmenKostol, CAS_OK, normCas, dokonciCas, casNeexistuje, pekny } from "@/lib/kalendarFarnosti";
import { stitokOznamu } from "./OmseKalendar";

type Druh = 0 | 1 | 2; // Krátky oznam · Udalosť · Oznámenie
const DRUHY: [string, string][] = [
  ["Krátky oznam", "len text, bez fotky · napr. V piatok nebude spovedanie"],
  ["Udalosť", "dátum, čas, fotky · sama sa zapíše do kalendára"],
  ["Oznámenie", "parte, svadba, jubileum · šablóna alebo vlastný plagát"],
];
const PLATI: [string, number][] = [["Bez konca", 36500], ["7 dní", 7], ["14 dní", 14], ["30 dní", 30]];
const POZVANIA: [string, string][] = [["Bez prihlásenia", "len informácia"], ["Nezáväzne · Zúčastním sa", "ľudia ťuknú, viete, koľko ich asi príde"], ["Záväzne · Prihlásiť sa", "prihlásia sa menom, napr. na púť do autobusu"]];
const ODRUHY: [string, DruhOznamu, string][] = [["Parte", "parte", "PARTE"], ["Svadba", "svadba", "SVADBA"], ["Jubileum", "ine", "JUBILEUM"]];
const RIADKY = 12;
const ZLATA = "#C9A24A";

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const lbl: CSSProperties = { fontSize: 15, fontWeight: 800, color: "var(--ink)" };
const pole: CSSProperties = { height: 50, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const radio = (on: boolean) => <span aria-hidden="true" style={{ width: 22, height: 22, flex: "none", borderRadius: "50%", border: `2px solid ${on ? "var(--green)" : "#A8A396"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0 }} /></span>;
const kartaVolby = (on: boolean): CSSProperties => ({ display: "flex", alignItems: "center", gap: 14, minHeight: 58, padding: "10px 14px", borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" });
const iniciy = (m: string) => m.split(/\s+/).filter((w) => w.length > 1).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "F";
const DEN_MS = 864e5;
const terazMs = () => Date.now();

function Segment<T extends string | number>({ vol, cur, set, label }: { vol: [T, string][]; cur: T; set: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)", alignSelf: "flex-start", flexWrap: "wrap" }}>
      {vol.map(([k, t]) => { const on = k === cur; return <button key={String(k)} type="button" role="radio" aria-checked={on} onClick={() => set(k)} style={{ minHeight: 44, padding: "0 16px", border: "none", borderRadius: 9, background: on ? "var(--seg)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: on ? 800 : 700, color: on ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>; })}
    </div>);
}

/** text oznamu — jedno pole, najviac 12 riadkov (rovnaké textové pole ako všade) */
function TextOznamu({ value, onChange, popis = "Najviac 12 riadkov.", label = "Text" }: { value: string; onChange: (h: string) => void; popis?: string; label?: string }) {
  const [riadky, setRiadky] = useState(0);
  const dlhy = riadky > RIADKY, f = dlhy ? "#A34A2A" : riadky > 9 ? "#8A5A2B" : "var(--green)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={lbl}>{label}</span>
      <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>{popis}</span>
      <RichTextInput vzhlad="sprava" value={value} onChange={onChange} nastroje={NASTROJE} minH={120} chybaRam={dlhy} ariaLabel={label} tvrdyLimit={1200} onRiadky={setRiadky} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", borderRadius: 3, background: f, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, riadky / RIADKY)})`, transition: "transform .3s ease" }} /></span>
        <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: f }}>{riadky} / {RIADKY} riadkov</span>
      </div>
      {dlhy && <span style={{ fontSize: 13, fontWeight: 700, color: "#A34A2A" }}>Text je dlhší ako 12 riadkov. Skráťte ho.</span>}
    </div>);
}

/** vlastný plagát — jeden obrázok, ťuk alebo pretiahnutie */
function PlagatPole({ src, onSrc, toast, popis }: { src?: string; onSrc: (s: string) => void; toast: (m: string) => void; popis: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [nad, setNad] = useState(false);
  const nacitaj = async (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast("Plagát môže byť JPG alebo PNG."); return; }
    try { onSrc(await spracujFotku(f, { pomer: null, maxSirka: 1600 })); } catch (e) { toast(e instanceof Error ? e.message : "Plagát sa nepodarilo načítať."); }
  };
  return (
    <div role="button" tabIndex={0} onClick={() => ref.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setNad(true); }} onDragLeave={() => setNad(false)} onDrop={(e) => { e.preventDefault(); setNad(false); void nacitaj(e.dataTransfer.files?.[0]); }}
      style={{ minHeight: 96, padding: "12px 16px", borderRadius: 16, border: `1.5px dashed ${nad ? "var(--green)" : "var(--gBd)"}`, background: nad ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
      {src && <span style={{ flex: "none", width: 60, height: 76, borderRadius: 8, background: `url('${src}') center/contain no-repeat var(--card)`, border: "1px solid var(--cardBd)" }} />}
      <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <b style={{ fontSize: 15.5, color: "var(--green)" }}>{src ? "Nahraté ✓ · ťuknite a vymeňte" : "+ Nahrať plagát"}</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{popis}</span>
      </span>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { void nacitaj(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </div>);
}

const fmtDatum = (iso: string) => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); return `${["Ne", "Po", "Ut", "St", "Št", "Pi", "So"][dt.getDay()]} ${d}. ${m}.`; };

export function OznamyFarnosti({ strankaId, meno, mobil, toast, hore }: { strankaId: string; meno: string; mobil: boolean; toast: (m: string) => void; /** obsah pod zoznamom (Od farníkov) */ hore?: number }) {
  const vz = useVzhlad(strankaId, false);
  const [dr, setDr] = useState<Druh>(0);
  const [n, setN] = useState("");
  const [txt, setTxt] = useState("");
  const [plati, setPlati] = useState(0);
  const [usp, setUsp] = useState<0 | 1>(0); // Text a fotky · Vlastný plagát
  const [dat, setDat] = useState("");
  const [cas, setCas] = useState("");
  const [miesto, setMiesto] = useState("");
  const [media, setMedia] = useState<MediumZbierky[]>([]);
  const [plagat, setPlagat] = useState<string | undefined>();
  const [pozv, setPozv] = useState(0);
  const [odr, setOdr] = useState(0);
  const [osp, setOsp] = useState<0 | 1>(0); // Zo šablóny · Vlastný plagát
  const [u, setU] = useState<UdajeOznamu>(() => prazdneUdaje("parte"));
  const [volba, setVolba] = useState<VolbaSablony>(() => prvaVolba("parte"));
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [, obnov] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (hore) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [hore]);

  const zmenOdr = (i: number) => { setOdr(i); const d = ODRUHY[i][1]; setU(prazdneUdaje(d)); setVolba(prvaVolba(d)); };
  const novy = () => { setN(""); setTxt(""); setPlati(0); setUsp(0); setDat(""); setCas(""); setMiesto(""); setMedia([]); setPlagat(undefined); setPozv(0); setOsp(0); zmenOdr(0); setHotovo(null); };

  // ---- čo chýba ----
  const casZly = casNeexistuje(cas);
  const ch: string[] = [];
  if (dr === 2 && osp === 0) {
    if (!u.meno.trim()) ch.push("meno");
    if (ODRUHY[odr][1] === "parte" && u.zena == null) ch.push("Muž alebo Žena");
  } else if (!n.trim()) ch.push("nadpis");
  if (dr === 1) { if (!dat) ch.push("dátum"); if (!CAS_OK(cas)) ch.push("čas"); }
  if ((dr === 1 && usp === 1) || (dr === 2 && osp === 1)) { if (!plagat) ch.push("plagát"); }
  const chybaSab = dr === 2 && osp === 0 && !ch.length ? chybaOznamu(u) : null;

  // ---- náhľad ----
  const chip = dr === 1 ? "UDALOSŤ" : dr === 2 ? ODRUHY[odr][2] : "OZNAM";
  const nadpisN = n.trim() || (dr === 2 ? u.meno.trim() || "Meno" : dr === 1 ? "Nadpis udalosti" : "Nadpis oznamu");
  const kedyT = dr === 1 ? [fmtDatum(dat), CAS_OK(cas) ? pekny(cas) : "", miesto.trim()].filter(Boolean).join(" · ") : dr === 2 && osp === 0 ? popisOznamu(u).split(" · ").slice(1).join(" · ") : "";
  const obrazok = dr === 1 ? (usp === 1 ? plagat : media.find((m) => m.typ === "foto")?.src) : dr === 2 && osp === 1 ? plagat : undefined;
  const nahlad = (
    <section aria-label="Náhľad oznamu" style={{ ...karta, overflow: "hidden", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <span style={{ width: 38, height: 38, flex: "none", borderRadius: "50%", background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gInk)" }}>{iniciy(meno)}</span>
        <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{meno}</b><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>na profile · pre sledujúcich</span></span>
        <span style={{ flex: "none", padding: "4px 10px", borderRadius: 9, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 12, fontWeight: 800, color: "var(--gInk)" }}>{chip}</span>
      </div>
      {dr === 2 && osp === 0 && u.meno.trim() && (u.zena != null || u.druh !== "parte")
        ? <div style={{ display: "flex", justifyContent: "center", padding: 12, background: "var(--field)" }}><Plagat u={u} volba={volba} vz={vz} sirka={280} /></div>
        : dr !== 0 && (obrazok
          ? <img src={obrazok} alt="" style={{ display: "block", width: "100%", maxHeight: 420, objectFit: dr === 1 && usp === 0 ? "cover" : "contain", background: "#fff" }} />
          : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "16 / 9", background: "var(--gSoft)" }}><span style={{ width: 72, height: 72, borderRadius: 18, background: "#fff", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "var(--gInk)" }}>{iniciy(meno)}</span></span>)}
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <b style={{ fontSize: 16.5, lineHeight: 1.3 }}>{nadpisN}</b>
        {kedyT && <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{kedyT}</span>}
        {dr !== 2 && cistyText(txt) && <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)", whiteSpace: "pre-line" }}>{cistyText(txt)}</div>}
        {dr === 1 && pozv > 0 && <span style={{ alignSelf: "flex-start", marginTop: 6, minHeight: 44, padding: "0 18px", borderRadius: 13, background: "#4B7A35", color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center" }}>{pozv === 2 ? "Prihlásiť sa" : "Zúčastním sa"}</span>}
      </div>
    </section>);

  // ---- zverejniť ----
  const zverejni = () => {
    if (ch.length || chybaSab) return;
    const teraz = terazMs(), id = `naboz-${teraz}`;
    const zaklad = { id, comp: "data" as const, typ: "skutok" as const, modul: "charity" as const, kat: "Komunita" as const, skore: 6, typSituacie: "normal" as const, dni: 0, podpora: 0, farnostId: strankaId, cirkev: "", komunita: meno, overena: true, vytvorene: teraz };
    let kalendar = false;
    if (dr === 0) {
      pridajPrispevok(strankaId, { ...zaklad, ntyp: "oznam", tag: "Oznam", nazov: n.trim(), popis: cistyText(txt), platnostDni: PLATI[plati][1] });
    } else if (dr === 1) {
      const kedy = [pekny(cas), miesto.trim()].filter(Boolean).join(" · ");
      pridajPrispevok(strankaId, { ...zaklad, ntyp: "udalost", tag: "Udalosť", nazov: n.trim(), popis: [kedy, cistyText(txt)].filter(Boolean).join(" · "), datum: dat, rsvp: pozv > 0,
        fotky: usp === 1 ? (plagat ? [plagat] : undefined) : media.filter((m) => m.typ === "foto").map((m) => m.src) });
      zmenKostol(strankaId, "0", (k) => ({ ...k, extra: { ...k.extra, [dat]: [...(k.extra[dat] ?? []), { id: `u${teraz}`, typ: "udalost", t: pekny(cas), m: n.trim() }] } }));
      kalendar = true;
    } else {
      const d = ODRUHY[odr][1], vl = osp === 1;
      pridajPrispevok(strankaId, { ...zaklad, ntyp: "oznam", tag: d === "ine" ? "Jubileum" : "Oznam", ukat: d === "parte" ? "pohreb" : d === "svadba" ? "svadba" : undefined,
        nazov: vl ? n.trim() : `${ODRUHY[odr][0]} · ${u.meno.trim()}`, popis: vl ? n.trim() : popisOznamu(u), datum: vl ? undefined : u.kedyD || undefined,
        fotky: vl ? (plagat ? [plagat] : undefined) : u.foto ? [u.foto] : undefined,
        reakciaTyp: d === "parte" ? "kondolencia" : d === "svadba" ? "blahozelanie" : undefined,
        smutocny: d === "parte" ? { mode: vl ? "image" : "template", imageUrl: vl ? plagat : undefined, meno: vl ? n.trim() : u.meno.trim(), rodena: !vl && u.zena && u.rod.trim() ? u.rod.trim() : undefined,
          datumNar: vl ? "" : u.nar, datumUmr: vl ? "" : u.umr, rozluckaMiesto: vl ? "" : u.kde.trim(), rozluckaDatum: vl ? "" : u.kedyD, rozluckaCas: vl ? "" : u.kedyC, foto: vl ? undefined : u.foto,
          text: vl ? undefined : u.text.trim() || undefined, sablona: vl ? undefined : { u, volba, vz } } : undefined,
        platnostDni: 7 });
    }
    setHotovo(`${dr === 2 ? "Oznámenie je zverejnené ✓" : dr === 1 ? "Udalosť je zverejnená ✓" : "Oznam je zverejnený ✓"}${kalendar ? " · zapísané aj do kalendára" : ""}`);
    obnov((x) => x + 1);
  };

  // ---- formulár ----
  const lavy = (
    <section style={{ ...karta, padding: mobil ? "14px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <b style={{ fontSize: 17 }}>Čo chcete oznámiť</b>
      <div role="radiogroup" aria-label="Čo chcete oznámiť" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DRUHY.map(([t, s], i) => { const on = dr === i; return (
          <button key={t} type="button" role="radio" aria-checked={on} onClick={() => { setDr(i as Druh); setHotovo(null); }} style={kartaVolby(on)}>
            {radio(on)}<span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 15.5, color: on ? "var(--gInk)" : "var(--ink)" }}>{t}</b><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
          </button>); })}
      </div>
      {hotovo ? <div role="status" style={{ padding: "14px 16px", borderRadius: 14, background: "var(--gSoft)", border: "2px solid var(--green)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <b style={{ flex: 1, minWidth: 200, fontSize: 16, color: "var(--gInk)" }}>{hotovo}</b>
        <button type="button" onClick={novy} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Napísať ďalší</button>
      </div> : <>
        {dr === 1 && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Ako ho chcete ukázať</span><Segment label="Ako ho chcete ukázať" vol={[[0, "Text a fotky"], [1, "Vlastný plagát"]]} cur={usp} set={(v) => setUsp(v as 0 | 1)} /></div>}
        {dr === 2 && <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Druh oznámenia</span><Segment label="Druh oznámenia" vol={ODRUHY.map(([t], i) => [i, t] as [number, string])} cur={odr} set={zmenOdr} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Ako ho chcete ukázať</span><Segment label="Ako ho chcete ukázať" vol={[[0, "Zo šablóny"], [1, "Vlastný plagát"]]} cur={osp} set={(v) => setOsp(v as 0 | 1)} /></div>
        </>}
        {!(dr === 2 && osp === 0) && <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Nadpis</span>
          <input value={n} onChange={(e) => setN(e.target.value.slice(0, 80))} placeholder={dr === 1 ? "napr. Púť do Šaštína" : dr === 2 ? "napr. Zomrel pán Ján Novák" : "napr. V piatok nebude spovedanie"} style={pole} /></label>}
        {dr === 1 && <div style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ ...lbl, fontSize: 14 }}>Dátum</span><input type="date" value={dat} onChange={(e) => setDat(e.target.value)} aria-label="Dátum" style={pole} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ ...lbl, fontSize: 14 }}>Čas</span><input value={cas} inputMode="numeric" maxLength={5} onChange={(e) => setCas(normCas(e.target.value))} onBlur={() => setCas((c) => dokonciCas(c))} placeholder="napr. 15:00" aria-label="Čas" aria-invalid={casZly || undefined} style={{ ...pole, border: `${casZly ? 2 : 1}px solid ${casZly ? "var(--cRed)" : "var(--cardBd)"}` }} /></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ ...lbl, fontSize: 14 }}>Miesto</span><input value={miesto} onChange={(e) => setMiesto(e.target.value.slice(0, 60))} placeholder="napr. pred kostolom" aria-label="Miesto" style={pole} /></label>
          {casZly && <span role="alert" style={{ gridColumn: "1 / -1", fontSize: 12.5, fontWeight: 700, color: "var(--cRed)" }}>Takýto čas neexistuje. Píšte hodiny:minúty, napríklad 15:00.</span>}
        </div>}
        {dr === 0 && <TextOznamu value={txt} onChange={setTxt} />}
        {dr === 1 && usp === 0 && <><TextOznamu value={txt} onChange={setTxt} />
          <GaleriaEditor media={media} onMedia={setMedia} ph={mobil} nadpis="Fotky a video · nepovinné" dovetok=" Prvá fotka je hlavná. Bez fotky sa ukážu iniciály farnosti." /></>}
        {dr === 1 && usp === 1 && <><PlagatPole src={plagat} onSrc={setPlagat} toast={toast} popis="ťuknite a vyberte obrázok, alebo ho sem pretiahnite · na výšku, JPG alebo PNG" />
          <TextOznamu value={txt} onChange={setTxt} label="Krátky popis" popis="Nepovinné. Napríklad čo si vziať so sebou." /></>}
        {dr === 2 && osp === 0 && <>
          <FormularOznamu u={u} onU={setU} mobil={mobil} />
          {u.druh === "parte" && u.zena == null ? <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Šablóny sa ukážu, keď vyššie vyberiete Muž alebo Žena.</span>
            : <><b style={{ fontSize: 15 }}>Vyberte vzhľad · 8 šablón</b><VyberSablony u={u} volba={volba} onVolba={setVolba} vz={vz} mobil={mobil} /></>}
        </>}
        {dr === 2 && osp === 1 && <PlagatPole src={plagat} onSrc={setPlagat} toast={toast} popis="ťuknite a vyberte obrázok, alebo ho sem pretiahnite · JPG alebo PNG" />}
        {dr === 0 && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Platí do</span>
          <Segment label="Platí do" vol={PLATI.map(([t], i) => [i, t] as [number, string])} cur={plati} set={setPlati} />
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>Potom oznam sám zmizne. Zmazať ho môžete aj skôr.</span></div>}
        {dr === 1 && <div role="radiogroup" aria-label="Pozvať ľudí" style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Pozvať ľudí</span>
          {POZVANIA.map(([t, s], i) => { const on = pozv === i; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setPozv(i)} style={kartaVolby(on)}>{radio(on)}<span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{t}</b><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{s}</span></span></button>); })}
        </div>}
        {ch.length || chybaSab
          ? <div role="status" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--goldBg)", border: `1.5px solid ${ZLATA}`, fontSize: 14.5, fontWeight: 800 }}>{ch.length ? `Ešte chýba: ${ch.join(", ")}` : chybaSab}</div>
          : <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label="Podržte a zverejnite" trvanie={1500} onConfirm={zverejni} /></div>}
      </>}
    </section>);

  const zoznam = vlastnePrispevky(strankaId);

  // ---- zverejnené ----
  const meta = (x: VieraFeedItem) => x.tag === "Zmena omše" ? x.popis ?? ""
    : x.ntyp === "udalost" ? [fmtDatum(x.datum ?? ""), x.popis].filter(Boolean).join(" · ")
    : x.ntyp === "oznam" && !x.ukat && x.tag === "Oznam" ? ((x.platnostDni ?? 7) >= 36500 ? "bez konca" : `platí ${Math.round(x.platnostDni ?? 7)} dní · do ${new Date((x.vytvorene ?? 0) + (x.platnostDni ?? 7) * DEN_MS).toLocaleDateString("sk-SK")}`)
    : x.popis ?? "";
  const zverejnene = zoznam.length ? (
    <section aria-label="Zverejnené oznamy" style={{ ...karta, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {zoznam.map((x, i) => (
        <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: "none", padding: "3px 9px", borderRadius: 8, background: stitokOznamu(x) === "ZMENA OMŠE" ? "var(--goldBg)" : "var(--gSoft)", border: `1px solid ${stitokOznamu(x) === "ZMENA OMŠE" ? ZLATA : "var(--gBd)"}`, fontSize: 11.5, fontWeight: 800, color: stitokOznamu(x) === "ZMENA OMŠE" ? "var(--ink)" : "var(--gInk)", whiteSpace: "nowrap" }}>{stitokOznamu(x)}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{x.nazov}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{meta(x)}</span></span>
          <button type="button" onClick={() => { zmazPrispevok(strankaId, x.id); obnov((y) => y + 1); toast("Oznam je zmazaný."); }} aria-label={`Zmazať: ${x.nazov}`} title="Zmazať"
            style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", border: "none", background: "var(--cRedBg)", color: "#fff", cursor: "pointer", fontSize: 19, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, boxShadow: "none" }}>×</button>
        </div>))}
    </section>)
    : <section style={{ ...karta, padding: "12px 20px", fontSize: 14.5, color: "var(--ink3)" }}>Zatiaľ žiadne oznamy. Prvý napíšete vyššie a zverejníte podržaním.</section>;

  const pravy: ReactNode = <><span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>NÁHĽAD · TAKTO TO UVIDIA ĽUDIA</span>{nahlad}</>;
  return <>
    <div ref={topRef} style={{ scrollMarginTop: 16 }} />
    {mobil ? <>{lavy}{pravy}</> : (
      <div style={{ flex: "none", display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{lavy}</div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>{pravy}</div>
      </div>)}
    {zverejnene}
  </>;
}
