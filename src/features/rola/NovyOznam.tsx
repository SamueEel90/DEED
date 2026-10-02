// ============================================================
// KARTA 40 · Oznamy (Správa charity → Obsah → Oznamy). Prototyp „Novy oznam PC" (aj Spravovať oznamy).
// Nový oznam — nenadväzuje na starý rola/Oznamy.tsx; ten istý diel ide aj do firemného Môjho DEED.
// Druhy: Oznam a Oznam vo verejnom záujme od P1, Výzva na súrnu pomoc vo všetkých programoch (v Zadarmo
// sú prvé dva zamknuté so štítkom „od P1"). Texty = textové polia, fotky = galéria, ako všade.
// Zverejnenie vždy podržaním (ten istý diel ako platba). Oznam ide sledujúcim po 5 min, verejný a výzva hneď.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { RichTextInput } from "@/components/richtext";
import { OrezFotky } from "@/components/orezfotky";
import { spracujFotku } from "@/lib/obrazok";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { potvrditTuknutim } from "@/features/zbierka/Platba";
import { FLAGS } from "./stav";
import { SUHLAS_FOTKY, SUHLAS_POZNAMKA, SUHLAS_CHYBA } from "@/lib/pravidlaObsahu";
import { panel, pole, cistyText, Media, Zaskrtnutie, odkaz, PravidlaObsahu, GaleriaEditor } from "./obsahZbierky";
import type { MediumZbierky } from "@/lib/novaZbierka";
import {
  OZNAMY_CFG, KATEGORIE_OZNAMU, oznamyStranky, nacitajOznamyStranky, useZmenyOznamovCharity, zverejniOznam, upravOznamCharity, zrusOznamCharity,
  simulujUcast, nastaveniaOznamov, ulozNastaveniaOznamov, beziaceVerejne, vLehote, bezi, dnesIso, maxAkcia, maxVyzva,
  type OznamCharity, type DruhOznamu, type FormaOznamu, type Pozvanie, type Plagat, type ZbierkaPriAkcii,
} from "@/lib/oznamyNove";
import { sucetDarov, useZmenyDarov } from "@/lib/darcovia";

const C = { rSoft: "#F2DDD5", rBd: "#D9A796", red: "#A34A2A", goldBg: "#F1E6C8", goldBd: "#D9C17E", gold: "#8A6A12" };
const fmtD = (v?: string) => { if (!v) return ""; const [y, m, d] = v.split("-"); return `${+d}. ${+m}. ${y}`; };
const DRUHY: [DruhOznamu, string, string][] = [
  ["oznam", "Oznam", "Na vašom profile a príde tým, čo vás sledujú. Napríklad informácia pre dobrovoľníkov."],
  ["verejny", "Oznam vo verejnom záujme", "Na nástenke mesta. Podujatie pre komunitu, šport, kultúra, organizujeme niečo verejné. Až 2 mesiace vopred."],
  ["vyzva", "Výzva na súrnu pomoc", "Na nástenke mesta, najviac 10 dní. Povodeň, požiar, hľadá sa krv. Aj v programe Zadarmo."],
];
const POZVANIA: [Pozvanie, string, string][] = [
  ["bez", "Bez prihlásenia", "len informácia"],
  ["nezavazne", "Nezáväzne · Zúčastním sa", "ľudia ťuknú, vy viete, koľko ich asi príde. Napr. kultúrna akcia zadarmo."],
  ["zavazne", "Záväzne · Prihlásiť sa", "prihlásia sa menom, napr. ako dobrovoľníci. Viete presne kto, môžete dať limit."],
];
const stitok = (o: { druh: DruhOznamu | null; kategoria?: string; zrusene?: string }): [string, string, string, string] =>
  o.zrusene ? ["ZRUŠENÉ", C.rSoft, C.rBd, C.red]
  : o.druh === "vyzva" ? ["SÚRNA POMOC", C.rSoft, C.rBd, C.red]
  : o.druh === "verejny" ? [(o.kategoria ?? "Verejný").toUpperCase(), C.goldBg, C.goldBd, C.gold]
  : ["OZNAM", "var(--gSoft)", "var(--gBd)", "var(--gInk)"];
const kedyText = (o: { druh: DruhOznamu | null; datum?: string; cas?: string; miesto?: string }) =>
  o.druh === "verejny" ? (o.datum ? `Koná sa ${fmtD(o.datum)}${o.cas ? ` o ${o.cas}` : ""}${o.miesto ? ` · ${o.miesto}` : ""}` : "Dátum akcie")
  : o.druh === "vyzva" ? (o.datum ? `Pomoc treba do ${fmtD(o.datum)}` : "Do kedy treba pomoc") : "Na profile charity";
const ucastText = (o: { pozvanie: Pozvanie; limit?: number }, prihlaseni = 0, zucastni = 0) =>
  o.pozvanie === "zavazne" ? `prihlásených ${prihlaseni}${o.limit ? ` z ${o.limit}` : ""} · záväzne` : `zatiaľ ${zucastni} ${zucastni === 1 ? "človek" : zucastni >= 2 && zucastni <= 4 ? "ľudia" : "ľudí"} · nezáväzne`;

// ============================================================
// BOD 10 · „Pri akcii zbierame na" — karta zbierky s pruhom a Darovať (nie len text)
// ============================================================
const eur = (n: number) => `${Math.round(n).toLocaleString("sk-SK")} €`;
const PRUHY_ZB = "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)";
function ZbierkaPriAkciiKarta({ z, onDarovat, zrusene }: { z: ZbierkaPriAkcii; onDarovat?: () => void; zrusene?: boolean }) {
  useZmenyDarov();
  const v = (z.vyzbierane ?? 0) + sucetDarov(z.id).suma;
  const c = z.ciel ?? 0;
  const pct = c > 0 ? Math.min(100, Math.floor((v / c) * 100)) : 0;
  return (
    <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: 16, background: "var(--field)", border: "1px solid var(--gBd)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden="true" style={{ width: 52, height: 52, flex: "none", borderRadius: 12, background: z.bg ?? PRUHY_ZB }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>PRI AKCII ZBIERAME NA</span>
          <b style={{ display: "block", fontSize: 15, lineHeight: 1.3, color: "var(--ink)" }}>{z.nazov}</b>
        </span>
      </div>
      {c > 0 && <div role="progressbar" aria-label="Vyzbierané" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} style={{ height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 4, background: "#4B7A35", transform: `scaleX(${pct / 100})`, transformOrigin: "left", transition: "transform .4s ease" }} /></div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ flex: "1 1 140px", fontSize: 13.5, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>{eur(v)}</b>{c > 0 ? ` z ${eur(c)} · ${pct} %` : z.centralna ? " · na celú činnosť" : " vyzbierané"}</span>
        {!zrusene && <button type="button" onClick={onDarovat} style={{ flex: "none", whiteSpace: "nowrap", minHeight: 46, padding: "0 22px", border: "none", borderRadius: 13, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff" }}>Darovať</button>}
      </div>
    </div>);
}

// ============================================================
// KARTA OZNAMU — ten istý diel v náhľade aj pri ozname na profile / nástenke
// ============================================================
export function OznamKartaNova({ o, autor, mesto, inicialy, logo, onProfil, onUcast, mojaUcast, onDarovat }: {
  o: Pick<OznamCharity, "forma" | "nadpis" | "text" | "media" | "plagat" | "kategoria" | "datum" | "cas" | "miesto" | "pozvanie" | "limit" | "zbierka" | "zrusene" | "upravene"> & { prihlaseni?: OznamCharity["prihlaseni"]; zucastniSa?: number; druh: DruhOznamu | null };
  autor: string; mesto: string; inicialy: string; logo?: string | null; onProfil?: () => void; onUcast?: () => void; mojaUcast?: boolean;
  /** Darovať na zbierku pri akcii — na profile otvorí zbierku (platbu); v náhľade nič */
  onDarovat?: (z: ZbierkaPriAkcii) => void;
}) {
  const [stT, stBg, stBd, stC] = stitok(o);
  const plagat = o.forma === "plagat" && o.druh !== "vyzva";
  const hl = o.media[0];
  return (
    <section className="sc-tokeny" style={{ borderRadius: 22, background: "var(--card)", border: `1.5px solid ${stBd}`, overflow: "hidden", minWidth: 0, color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <span style={{ width: 38, height: 38, flex: "none", borderRadius: "50%", background: logo ? `url('${logo}') center/cover no-repeat #fff` : "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800, color: "var(--gInk)" }}>{logo ? "" : inicialy}</span>
        <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5, color: "var(--ink)" }}>{autor}</b><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{o.druh === "oznam" ? "oznam · len pre sledujúcich" : `${mesto} · nástenka mesta`}{o.upravene && !o.zrusene ? " · upravené" : ""}</span></span>
        <span style={{ flex: "none", whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 9, background: stBg, border: `1px solid ${stBd}`, fontSize: 12, fontWeight: 800, color: stC }}>{stT}</span>
      </div>
      {/* „Za oznam zodpovedá" — ten istý riadok ako pri zbierke, aj nad plagátom */}
      <div style={{ margin: "0 14px 10px", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ZA OZNAM ZODPOVEDÁ</span><b style={{ display: "block", fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{autor} · Charita · {mesto}</b></span>
        <button type="button" onClick={onProfil} style={{ ...odkaz, minHeight: 44, padding: 0, fontSize: 13, flex: "none" }}>Pozri profil ›</button>
      </div>
      {plagat ? (o.plagat
        ? o.plagat.typ === "pdf"
          ? <object data={o.plagat.src} type="application/pdf" aria-label="Plagát" style={{ display: "block", width: "100%", height: "min(80vh, 640px)", background: "#fff" }}><a href={o.plagat.src} target="_blank" rel="noreferrer" style={{ display: "block", padding: 16 }}>Otvoriť plagát (PDF)</a></object>
          : <img src={o.plagat.src} alt="Plagát" style={{ display: "block", width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", background: "#fff" }} />
        : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "3 / 4", maxHeight: 420, background: "repeating-linear-gradient(135deg,#D9D3C7 0 10px,#E4DFD5 10px 20px)", fontSize: 14, fontWeight: 700, color: "var(--ink3)" }}>Tu bude váš plagát</span>)
      : hl ? <span style={{ display: "block", aspectRatio: "16 / 9", overflow: "hidden", background: "#1D211B" }}><Media m={hl} /></span>
      : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "16 / 8", background: "var(--gSoft)" }}><span style={{ width: 84, height: 84, borderRadius: 22, background: logo ? `url('${logo}') center/cover no-repeat #fff` : "#fff", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "var(--gInk)" }}>{logo ? "" : inicialy}</span></span>}
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <b style={{ fontSize: 16.5, lineHeight: 1.3, color: "var(--ink)", textDecoration: o.zrusene ? "line-through" : "none" }}>{o.nadpis.trim() || "Nadpis oznamu"}</b>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{kedyText(o)}</span>
        {cistyText(o.text) && <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }} dangerouslySetInnerHTML={{ __html: o.text }} />}
        {o.zbierka && o.druh !== "vyzva" && <ZbierkaPriAkciiKarta z={o.zbierka} zrusene={!!o.zrusene} onDarovat={onDarovat ? () => onDarovat(o.zbierka!) : undefined} />}
        {o.pozvanie !== "bez" && o.druh !== "vyzva" && !o.zrusene && <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
          <button type="button" onClick={onUcast} aria-pressed={mojaUcast} style={{ flex: "none", whiteSpace: "nowrap", minHeight: 46, padding: "0 18px", border: "none", borderRadius: 13, background: mojaUcast ? "var(--gSoft)" : "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: mojaUcast ? "var(--gInk)" : "#fff" }}>{o.pozvanie === "zavazne" ? (mojaUcast ? "Prihlásený" : "Prihlásiť sa") : mojaUcast ? "Zúčastníte sa" : "Zúčastním sa"}</button>
          <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{ucastText(o, o.prihlaseni?.length ?? 0, o.zucastniSa ?? 0)}</span>
        </div>}
      </div>
    </section>);
}

// ============================================================
// SPRÁVA OZNAMOV — Nový oznam · Spravovať oznamy
// ============================================================
type Form = { druh: DruhOznamu | null; forma: FormaOznamu; nadpis: string; text: string; media: MediumZbierky[]; plagat?: Plagat; kategoria?: (typeof KATEGORIE_OZNAMU)[number];
  datum: string; cas: string; miesto: string; pozvanie: Pozvanie; limit: string; suhlas: boolean; potvrd: boolean;
  /** „Pri akcii zbierame na": "" = Nič, inak id zbierky z ponuky */
  zbierka: string };
const prazdny = (zadarmo: boolean): Form => ({ druh: zadarmo ? null : "oznam", forma: "text", nadpis: "", text: "", media: [], datum: "", cas: "", miesto: "", pozvanie: "bez", limit: "", suhlas: false, potvrd: false, zbierka: "" });

export function OznamySprava({ strankaId, tier, nazov, inicialy, mesto, logo, mobil, tablet, toast, onProfil, zbierky = [] }: {
  strankaId: string; tier: number; nazov: string; inicialy: string; mesto: string; logo?: string | null; mobil: boolean; tablet: boolean; toast: (m: string) => void; onProfil?: () => void;
  /** ponuka „Pri akcii zbierame na" — centrálna a bežiace zbierky charity (prázdne = výber sa neukáže) */
  zbierky?: ZbierkaPriAkcii[];
}) {
  useZmenyOznamovCharity();
  useEffect(() => { void nacitajOznamyStranky(strankaId); }, [strankaId]);
  const ph = mobil && !tablet;
  const zadarmo = tier < 1;
  const zamknuty = (d: DruhOznamu) => tier < OZNAMY_CFG.odTieru[d];
  const [pohlad, setPohlad] = useState<"novy" | "sprava">("novy");
  const [f, setF] = useState<Form>(() => prazdny(zadarmo));
  const zmen = (z: Partial<Form>) => setF((x) => ({ ...x, ...z }));
  useEffect(() => { if (f.druh && zamknuty(f.druh)) zmen({ druh: null }); }, [tier]); // eslint-disable-line react-hooks/exhaustive-deps
  const [uprava, setUprava] = useState<OznamCharity | null>(null);
  const [hotovo, setHotovo] = useState<OznamCharity | null>(null);
  const [vyrezId, setVyrezId] = useState<number | null>(null);
  const [pravidla, setPravidla] = useState(false);
  const [plDrag, setPlDrag] = useState(false);
  const [, tik] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tik((x) => x + 1), 15000); return () => window.clearInterval(t); }, []);
  const plagatRef = useRef<HTMLInputElement>(null);
  const hore = useRef<HTMLDivElement>(null);

  const druh = f.druh;
  const sPlagatom = (druh === "oznam" || druh === "verejny") && f.forma === "plagat";
  const maMedia = sPlagatom ? !!f.plagat : f.media.length > 0;
  const verejnych = beziaceVerejne(strankaId).filter((o) => o.id !== uprava?.id).length;
  const nadLimit = druh === "verejny" && !uprava && verejnych >= OZNAMY_CFG.verejneNaraz;
  const chyba = !druh ? "Vyberte, čo chcete oznámiť"
    : !f.nadpis.trim() ? "Napíšte nadpis"
    : !sPlagatom && !cistyText(f.text) ? "Napíšte text"
    : sPlagatom && !f.plagat ? "Nahrajte plagát"
    : druh === "verejny" && !f.kategoria ? "Vyberte kategóriu"
    : druh === "verejny" && !f.datum ? "Vyberte, kedy sa akcia koná"
    : druh === "verejny" && !/^\d{4}-\d{2}-\d{2}$/.test(f.datum) ? "Dátum akcie nie je platný"
    : druh === "verejny" && f.datum < dnesIso() ? "Dátum akcie už prešiel"
    : druh === "verejny" && f.datum > maxAkcia() ? "Akcia môže byť najviac 2 mesiace dopredu"
    : druh === "verejny" && !f.miesto.trim() ? "Napíšte, kde sa akcia koná"
    : druh === "vyzva" && !f.datum ? "Vyberte, do kedy treba pomoc"
    : druh === "vyzva" && (!/^\d{4}-\d{2}-\d{2}$/.test(f.datum) || f.datum < dnesIso() || f.datum > maxVyzva()) ? "Výzva môže trvať najviac 10 dní"
    : druh === "vyzva" && !f.potvrd ? "Potvrďte, že ide o súrnu situáciu"
    : maMedia && !f.suhlas ? SUHLAS_CHYBA
    : f.pozvanie === "zavazne" && f.limit && !(parseInt(f.limit, 10) > 0) ? "Zadajte počet ľudí alebo nechajte bez limitu"
    : "";

  // plagát: tlačidlom aj pretiahnutím kamkoľvek na obrazovku
  const nacitajPlagat = async (subor: File) => {
    try {
      if (subor.type === "application/pdf") {
        const src = await new Promise<string>((ok, zle) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = zle; r.readAsDataURL(subor); });
        zmen({ plagat: { src, typ: "pdf", nazov: subor.name }, forma: "plagat" });
      } else if (subor.type.startsWith("image/")) {
        const src = await spracujFotku(subor, { pomer: null, maxSirka: 1600 });
        zmen({ plagat: { src, typ: "img", nazov: subor.name }, forma: "plagat" });
      } else toast("Plagát môže byť JPG, PNG alebo PDF.");
    } catch (e) { toast(e instanceof Error ? e.message : "Plagát sa nepodarilo načítať."); }
  };
  useEffect(() => {
    if (pohlad !== "novy" || !(druh === "oznam" || druh === "verejny") || f.forma !== "plagat") return;
    const ov = (e: DragEvent) => { e.preventDefault(); setPlDrag(true); };
    const lv = (e: DragEvent) => { if (!e.relatedTarget) setPlDrag(false); };
    const dr = (e: DragEvent) => { e.preventDefault(); setPlDrag(false); const s = e.dataTransfer?.files?.[0]; if (s) void nacitajPlagat(s); };
    window.addEventListener("dragover", ov); window.addEventListener("dragleave", lv); window.addEventListener("drop", dr);
    return () => { window.removeEventListener("dragover", ov); window.removeEventListener("dragleave", lv); window.removeEventListener("drop", dr); };
  }, [pohlad, druh, f.forma]); // eslint-disable-line react-hooks/exhaustive-deps

  // pri úprave ostane aj zbierka, ktorá už nie je v ponuke (napr. medzitým skončila)
  const vybranaZbierka = f.zbierka ? zbierky.find((z) => z.id === f.zbierka) ?? (uprava?.zbierka?.id === f.zbierka ? uprava.zbierka : undefined) : undefined;
  const ponukaZbierok = uprava?.zbierka && !zbierky.some((z) => z.id === uprava.zbierka!.id) ? [...zbierky, uprava.zbierka] : zbierky;
  const zData = () => ({
    stranka: strankaId, druh: druh!, forma: druh === "vyzva" ? "text" as const : f.forma, nadpis: f.nadpis.trim(), text: f.text,
    media: sPlagatom ? [] : f.media, plagat: sPlagatom ? f.plagat : undefined,
    kategoria: druh === "verejny" ? f.kategoria : undefined, datum: druh === "oznam" ? undefined : f.datum, cas: druh === "verejny" ? f.cas || undefined : undefined,
    miesto: druh === "verejny" ? f.miesto.trim() : undefined, pozvanie: druh === "vyzva" ? "bez" as const : f.pozvanie,
    limit: f.pozvanie === "zavazne" && parseInt(f.limit, 10) > 0 ? parseInt(f.limit, 10) : undefined,
    zbierka: druh === "vyzva" ? undefined : vybranaZbierka,
  });
  const zverejni = async () => {
    if (chyba) return;
    if (uprava) { const n = await upravOznamCharity(uprava, zData()); setUprava(null); setF(prazdny(zadarmo)); toast(n.zmenaPrihlasenym && n.zmenaPrihlasenym !== uprava.zmenaPrihlasenym ? "Uložené. Prihláseným pošleme správu o zmene." : "Uložené."); setPohlad("sprava"); return; }
    const n = await zverejniOznam({ ...zData(), nadLimit: nadLimit || undefined });
    setHotovo(n); setF(prazdny(zadarmo));
    if (nadLimit) toast(`Verejný oznam nad limit · ${OZNAMY_CFG.cenaNadLimit} €`);
  };
  const upravit = (o: OznamCharity) => {
    setUprava(o); setHotovo(null); setPohlad("novy");
    setF({ druh: o.druh, forma: o.forma, nadpis: o.nadpis, text: o.text, media: o.media, plagat: o.plagat, kategoria: o.kategoria, datum: o.datum ?? "", cas: o.cas ?? "", miesto: o.miesto ?? "",
      pozvanie: o.pozvanie, limit: o.limit ? String(o.limit) : "", suhlas: true, potvrd: true, zbierka: o.zbierka?.id ?? "" });
    window.setTimeout(() => hore.current?.scrollIntoView({ block: "start" }), 30);
  };

  // ---- výrez fotky galérie ----
  const vyrezM = vyrezId != null ? f.media.find((m) => m.id === vyrezId) : null;
  if (vyrezM) return (
    <section style={{ ...panel, gap: 12 }}>
      <span style={{ fontSize: 22, fontWeight: 800 }}>Výrez fotky</span>
      <OrezFotky sprava src={vyrezM.src} pomer={16 / 9} vyrez={vyrezM.vyrez} onZrusit={() => setVyrezId(null)} onVyrez={(v) => { zmen({ media: f.media.map((m) => (m.id === vyrezM.id ? { ...m, vyrez: v } : m)) }); setVyrezId(null); }} />
    </section>);

  const taby = (
    <div role="tablist" style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: 14, background: "var(--btn)", alignSelf: "flex-start" }}>
      {([["novy", uprava ? "Upraviť oznam" : "Nový oznam"], ["sprava", "Spravovať oznamy"]] as const).map(([k, t]) => { const on = pohlad === k; return (
        <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setPohlad(k)} style={{ minHeight: 44, padding: "0 16px", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, background: on ? "var(--field)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)" }}>{t}</button>); })}
    </div>);
  const dva = (l: ReactNode, p: ReactNode) => ph
    ? <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{l}{p}</div>
    : <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.45fr) minmax(300px,1fr)", gap: 20, alignItems: "start" }}><div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{l}</div><div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>{p}</div></div>;

  if (pohlad === "sprava") return (<div ref={hore} style={{ display: "flex", flexDirection: "column", gap: 16 }}>{taby}<Spravovat strankaId={strankaId} ph={ph} dva={dva} onUpravit={upravit} toast={toast} /></div>);

  // ---- Nový oznam ----
  const vyber = (on: boolean): CSSProperties => ({ background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--gBd)" : "#CFC9BC"}` });
  const radio = (on: boolean) => <span style={{ width: 22, height: 22, flex: "none", borderRadius: "50%", border: `2px solid ${on ? "var(--green)" : "#BDB6A8"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0 }} /></span>;
  const lbl: CSSProperties = { fontSize: 15, fontWeight: 800, color: "var(--ink)" };
  const nadpisPh = druh === "vyzva" ? "Napríklad: Hľadáme darcov krvi skupiny 0 negatívna" : druh === "verejny" ? "Napríklad: Beh pre svetlo · rodinný beh v parku" : "Napríklad: Zajtra výdaj od 14:00";
  const kam: [string, string] = druh === "oznam" ? ["Na váš profil a sledujúcim", "Príde tým, čo vás sledujú. Na nástenku mesta ani do okolia nejde."]
    : druh === "verejny" ? [`Na nástenku mesta ${mesto}`, `Uvidia ho ľudia v meste ${mesto} do ${fmtD(f.datum) || "dňa akcie"}. Aj na vašom profile.`]
    : druh === "vyzva" ? [`Na nástenku mesta ${mesto}`, `Výrazne, do ${fmtD(f.datum) || "konca pomoci"}, najviac 10 dní. Aj sledujúcim.`] : ["—", "Najprv vyberte druh oznamu."];
  const poznDrz = uprava ? (uprava.prihlaseni.length || uprava.zucastniSa ? "Pri zmene dátumu alebo miesta pošleme prihláseným správu." : "")
    : druh === "oznam" ? `Oznámenie sledujúcim pošleme ${OZNAMY_CFG.oneskorenieMin} minút po zverejnení. Dovtedy ho môžete upraviť alebo zrušiť.`
    : "Po zverejnení ho hneď uvidí každý na nástenke mesta. Pred zverejnením si ho poriadne skontrolujte.";
  const lblDrz = uprava ? "Podržte a uložte" : nadLimit ? `Podržte a zverejnite · ${OZNAMY_CFG.cenaNadLimit} €` : druh === "vyzva" ? "Podržte a zverejnite výzvu" : "Podržte a zverejnite";
  const tuk = potvrditTuknutim();

  const lavy = (<>
    <section style={{ ...panel, gap: 12 }}>
      <span style={{ fontSize: 17, fontWeight: 800 }}>Čo chcete oznámiť</span>
      {DRUHY.map(([k, t, s]) => { const lock = zamknuty(k), on = druh === k && !lock; return (
        <button key={k} type="button" role="radio" aria-checked={on} aria-disabled={lock} onClick={() => { if (!lock && !uprava) zmen({ druh: k }); }}
          style={{ ...vyber(on), display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "10px 14px", borderRadius: 14, cursor: lock || uprava ? "default" : "pointer", opacity: lock ? 0.55 : 1, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
          {radio(on)}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: 15.5 }}>{t}</b>{lock && <span style={{ flex: "none", whiteSpace: "nowrap", height: 22, padding: "0 8px", borderRadius: 11, border: "1px solid var(--cardBd)", fontSize: 11.5, fontWeight: 800, color: "var(--ink3)", display: "flex", alignItems: "center" }}>od P1</span>}</span>
            <span style={{ display: "block", fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{s}</span>
          </span>
        </button>); })}
    </section>
    <section style={{ ...panel, gap: 14 }}>
      {(druh === "oznam" || druh === "verejny") && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Ako ho chcete ukázať</span>
        <div role="radiogroup" aria-label="Forma oznamu" style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: 14, background: "var(--btn)" }}>
          {([["text", "Text a fotky", "ako skutok"], ["plagat", "Vlastný plagát", "hotový návrh + krátky popis"]] as const).map(([k, t, s]) => { const on = f.forma === k; return (
            <button key={k} type="button" role="radio" aria-checked={on} onClick={() => zmen({ forma: k })} style={{ flex: "1 1 180px", minHeight: 54, padding: "6px 10px", border: "none", borderRadius: 11, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: on ? "var(--field)" : "transparent", boxShadow: on ? "0 1px 3px rgba(30,28,20,.14)" : "none", color: "var(--ink)" }}><b style={{ fontSize: 14.5 }}>{t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></button>); })}
        </div></div>}
      {sPlagatom && <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, border: `2px dashed ${plDrag ? "var(--green)" : "transparent"}`, background: plDrag ? "var(--gSoft)" : "transparent", flexWrap: "wrap" }}>
        <button type="button" onClick={() => plagatRef.current?.click()} style={{ flex: "none", minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1.5px dashed var(--gBd)", background: "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)" }}>{f.plagat ? "Zmeniť plagát" : "+ Nahrať plagát"}</button>
        <input ref={plagatRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { const s = e.target.files?.[0]; e.target.value = ""; if (s) void nacitajPlagat(s); }} />
        <span style={{ flex: "1 1 220px", fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>Pretiahnite plagát sem alebo ťuknite na tlačidlo. Na výšku, JPG, PNG alebo PDF. Ukážeme ho celý, nič neorežeme, a prispôsobí sa obrazovke.</span>
      </div>}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Nadpis</span>
        <input value={f.nadpis} onChange={(e) => zmen({ nadpis: e.target.value.slice(0, 80) })} maxLength={80} placeholder={nadpisPh} aria-label="Nadpis" style={pole} /></label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={lbl}>{sPlagatom ? <>Krátky popis <span style={{ fontWeight: 500, color: "var(--ink3)" }}>— nepovinné</span></> : "Text"}</span>
        <RichTextInput vzhlad="sprava" value={f.text} onChange={(h) => zmen({ text: h })} minH={sPlagatom ? 70 : 120} ariaLabel={sPlagatom ? "Krátky popis" : "Text oznamu"}
          nastroje={["bold", "italic", "insertUnorderedList", "diktovat"]} maxZnakov={OZNAMY_CFG.textZnakov} tvrdyLimit={OZNAMY_CFG.textZnakov} />
      </div>
      {!sPlagatom && <GaleriaEditor media={f.media} onMedia={(m) => zmen({ media: m })} ph={ph} onVyrez={setVyrezId} nadpis="Fotky a video — nepovinné" dovetok=" Bez fotky sa ukáže logo charity." />}
      {maMedia && <>
        <Zaskrtnutie on={f.suhlas} onClick={() => zmen({ suhlas: !f.suhlas })}>{SUHLAS_FOTKY}</Zaskrtnutie>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", marginTop: -4 }}>{SUHLAS_POZNAMKA}{" "}<button type="button" onClick={() => setPravidla(true)} style={odkaz}>Pravidlá obsahu ›</button></span>
      </>}
      {druh === "verejny" && <>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Kategória</span>
          <div role="radiogroup" aria-label="Kategória" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{KATEGORIE_OZNAMU.map((t) => { const on = f.kategoria === t; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => zmen({ kategoria: t })} style={{ ...vyber(on), flex: "none", whiteSpace: "nowrap", minHeight: 44, padding: "0 14px", borderRadius: 22, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, color: on ? "var(--gInk)" : "var(--ink2)" }}>{t}</button>); })}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Kedy sa akcia koná</span>
            <span style={{ display: "flex", gap: 8 }}><input type="date" value={f.datum} min={dnesIso()} max={maxAkcia()} onChange={(e) => zmen({ datum: e.target.value })} aria-label="Dátum akcie" style={{ ...pole, flex: 1, minWidth: 0 }} />
              <input type="time" value={f.cas} onChange={(e) => zmen({ cas: e.target.value })} aria-label="Čas akcie" style={{ ...pole, width: 120, flex: "none" }} /></span>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>najviac 2 mesiace dopredu</span></label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Kde</span>
            <input value={f.miesto} onChange={(e) => zmen({ miesto: e.target.value.slice(0, 80) })} placeholder={`Napríklad: Mierové námestie, ${mesto}`} aria-label="Miesto akcie" style={pole} /></label>
        </div>
      </>}
      {(druh === "oznam" || druh === "verejny") && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Pozvať ľudí</span>
        {POZVANIA.map(([k, t, s]) => { const on = f.pozvanie === k; return (
          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => zmen({ pozvanie: k })} style={{ ...vyber(on), display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            {radio(on)}<span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{t}</b><span style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{s}</span></span></button>); })}
        {f.pozvanie === "zavazne" && <label style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 14, fontWeight: 800 }}>Koľko ľudí najviac</span>
          <input inputMode="numeric" value={f.limit} onChange={(e) => zmen({ limit: e.target.value.replace(/\D/g, "").slice(0, 5) })} placeholder="bez limitu" aria-label="Koľko ľudí najviac" style={{ ...pole, width: 140, height: 46 }} /></label>}
      </div>}
      {(druh === "oznam" || druh === "verejny") && ponukaZbierok.length > 0 && <div role="radiogroup" aria-label="Pri akcii zbierame na" style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Pri akcii zbierame na <span style={{ fontWeight: 500, color: "var(--ink3)" }}>— nepovinné</span></span>
        {([{ id: "", nazov: "Nič", centralna: false } as ZbierkaPriAkcii, ...ponukaZbierok]).map((z) => { const on = f.zbierka === z.id; return (
          <button key={z.id || "nic"} type="button" role="radio" aria-checked={on} onClick={() => zmen({ zbierka: z.id })} style={{ ...vyber(on), display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            {radio(on)}<span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{!z.id ? "Nič" : z.centralna ? "Centrálna zbierka" : z.nazov}</b>
              <span style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{!z.id ? "oznam bez zbierky" : z.centralna ? "na celú činnosť organizácie" : z.ciel ? `bežiaca zbierka · ${eur(z.vyzbierane ?? 0)} z ${eur(z.ciel)}` : "bežiaca zbierka"}</span></span></button>); })}
      </div>}
      {druh === "vyzva" && <>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", borderRadius: 14, background: C.rSoft, border: `1px solid ${C.rBd}` }}>
          <b style={{ fontSize: 15, color: "var(--ink)" }}>Výzva na súrnu pomoc</b>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Len keď ide o náhlu situáciu: povodeň, požiar, hľadá sa krv, nezvestný človek, núdza po nehode. Na nástenke bude do konca pomoci, najviac 10 dní.</span>
          <span style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.5, color: C.red }}>Kto výzvu zneužije, napríklad na reklamu alebo bežnú zbierku, stratí možnosť posielať výzvy.</span>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Pomoc treba do</span>
          <input type="date" value={f.datum} min={dnesIso()} max={maxVyzva()} onChange={(e) => zmen({ datum: e.target.value })} aria-label="Pomoc treba do" style={{ ...pole, maxWidth: 280 }} /></label>
        <Zaskrtnutie on={f.potvrd} onClick={() => zmen({ potvrd: !f.potvrd })}>Potvrdzujem, že ide o súrnu situáciu, nie o reklamu ani bežnú zbierku.</Zaskrtnutie>
      </>}
    </section>
  </>);

  const pravy = (<>
    <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>NÁHĽAD</span>
    <OznamKartaNova o={{ ...f, druh, prihlaseni: uprava?.prihlaseni ?? [], zucastniSa: uprava?.zucastniSa ?? 0, limit: parseInt(f.limit, 10) || undefined, cas: f.cas || undefined, miesto: f.miesto || undefined, zbierka: druh === "vyzva" ? undefined : vybranaZbierka }} autor={nazov} mesto={mesto} inicialy={inicialy} logo={logo} onProfil={onProfil} onDarovat={() => toast("Toto je náhľad.")} />
    <section style={{ borderRadius: 18, background: "var(--gSoft)", border: "1px solid var(--gBd)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--ink3)" }}>KAM PÔJDE</span><b style={{ fontSize: 16 }}>{kam[0]}</b><span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{kam[1]}</span>
    </section>
    {nadLimit && <section style={{ borderRadius: 18, background: C.goldBg, border: `1px solid ${C.goldBd}`, padding: "12px 16px", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Máte {verejnych} bežiace verejné oznamy, v cene sú {OZNAMY_CFG.verejneNaraz}. Ďalší stojí <b style={{ color: "var(--ink)" }}>{OZNAMY_CFG.cenaNadLimit} €</b>. Výzva na súrnu pomoc sa nepočíta.</section>}
    {hotovo ? <Hotovo o={hotovo} onUpravit={() => upravit(hotovo)} onZrusit={async () => { await zrusOznamCharity(hotovo); setHotovo(null); toast("Oznam je zrušený. Nikomu nič neprišlo."); }} onNovy={() => setHotovo(null)} />
    : <>
      {chyba && <span role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: C.gold, textAlign: "center" }}><span style={{ width: 8, height: 8, flex: "none", borderRadius: "50%", background: C.gold }} />{chyba}</span>}
      {tuk
        ? <button type="button" onDoubleClick={() => void zverejni()} aria-disabled={!!chyba} style={{ width: "100%", minHeight: 54, border: "none", borderRadius: 16, background: "#4B7A35", opacity: chyba ? 0.5 : 1, cursor: chyba ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff" }}>{uprava ? "Dvakrát kliknite a uložte" : "Dvakrát kliknite a zverejnite"}</button>
        : <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={lblDrz} disabled={!!chyba} onConfirm={() => void zverejni()} /></div>}
      {poznDrz && <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)", textAlign: "center" }}>{poznDrz}</span>}
      {uprava && <button type="button" onClick={() => { setUprava(null); setF(prazdny(zadarmo)); setPohlad("sprava"); }} style={{ ...odkaz, alignSelf: "center", minHeight: 44, color: "var(--ink3)" }}>Zrušiť úpravu</button>}
    </>}
  </>);

  return (<div ref={hore} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {taby}
    {dva(lavy, pravy)}
    {pravidla && <PravidlaObsahu ph={ph} stit="" onZavri={() => setPravidla(false)} />}
  </div>);
}

function Hotovo({ o, onUpravit, onZrusit, onNovy }: { o: OznamCharity; onUpravit: () => void; onZrusit: () => void; onNovy: () => void }) {
  const lehota = vLehote(o);
  const zostava = Math.max(1, Math.ceil((Date.parse(o.zverejnene) + OZNAMY_CFG.oneskorenieMin * 60000 - Date.now()) / 60000));
  return (
    <section role="status" style={{ borderRadius: 18, background: "var(--field)", border: "1px solid var(--cardBd)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 15.5, color: "var(--ink)" }}>{o.druh === "oznam" ? (lehota ? `Zverejnené. Oznámenie sledujúcim pošleme o ${zostava} min.` : "Zverejnené. Sledujúcim sme poslali oznámenie.") : "Zverejnené na nástenke mesta. Vidí ho každý."}</b>
      {o.druh === "oznam" && lehota && <>
        <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>Dovtedy ho môžete upraviť alebo zrušiť a nikomu nič nepríde.</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={onUpravit} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink2)" }}>Upraviť</button>
          <button type="button" onClick={onZrusit} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: `1.5px solid ${C.rBd}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: C.red }}>Zrušiť</button>
        </div>
      </>}
      <button type="button" onClick={onNovy} style={{ ...odkaz, alignSelf: "flex-start", minHeight: 44 }}>Nový oznam ›</button>
    </section>);
}

// ---------- Spravovať oznamy ----------
function Spravovat({ strankaId, ph, dva, onUpravit, toast }: { strankaId: string; ph: boolean; dva: (l: ReactNode, p: ReactNode) => ReactNode; onUpravit: (o: OznamCharity) => void; toast: (m: string) => void }) {
  const zoznam = oznamyStranky(strankaId);
  const n = nastaveniaOznamov(strankaId);
  const [ludiId, setLudiId] = useState<string | null>(null);
  const [zrId, setZrId] = useState<string | null>(null);
  const verejnych = beziaceVerejne(strankaId).length;
  const tlO: CSSProperties = { flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink2)" };
  const meta = (o: OznamCharity) => o.druh === "verejny" ? `Nástenka mesta · koná sa ${fmtD(o.datum)}${o.cas ? ` o ${o.cas}` : ""}${o.miesto ? ` · ${o.miesto}` : ""}${o.nadLimit ? ` · nad limit ${OZNAMY_CFG.cenaNadLimit} €` : ""}`
    : o.druh === "vyzva" ? `Nástenka mesta · pomoc treba do ${fmtD(o.datum)}`
    : `Profil · ${vLehote(o) ? `sledujúcim pôjde o ${Math.max(1, Math.ceil((Date.parse(o.zverejnene) + OZNAMY_CFG.oneskorenieMin * 60000 - Date.now()) / 60000))} min` : "poslané sledujúcim"}`;
  const lavy = (<>
    <span style={{ fontSize: 14, color: "var(--ink3)" }}>Verejné oznamy naraz: <b style={{ color: "var(--ink)" }}>{verejnych} z {OZNAMY_CFG.verejneNaraz}</b> · ďalší nad limit za {OZNAMY_CFG.cenaNadLimit} €</span>
    {!zoznam.length && <section style={{ ...panel, alignItems: "center", textAlign: "center" }}><b style={{ fontSize: 17 }}>Zatiaľ žiadny oznam</b></section>}
    {zoznam.map((o) => {
      const [stT, stBg, stBd, stC] = stitok(o);
      const akcia = o.druh !== "oznam", aktivny = bezi(o) && zrId !== o.id;
      const pocet = o.pozvanie === "zavazne" ? o.prihlaseni.length : o.zucastniSa;
      return (
        <section key={o.id} style={{ ...panel, gap: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ flex: "none", whiteSpace: "nowrap", padding: "3px 10px", borderRadius: 9, background: stBg, border: `1px solid ${stBd}`, fontSize: 12, fontWeight: 800, color: stC }}>{stT}</span>
            <b style={{ flex: 1, minWidth: ph ? 0 : 200, fontSize: 16, textDecoration: o.zrusene ? "line-through" : "none" }}>{o.nadpis}</b>
            {o.upravene && !o.zrusene && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>upravené</span>}
          </div>
          <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>{meta(o)}</span>
          {o.pozvanie !== "bez" && <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {o.pozvanie === "zavazne"
              ? <button type="button" aria-expanded={ludiId === o.id} onClick={() => setLudiId(ludiId === o.id ? null : o.id)} style={{ ...odkaz, minHeight: 44, padding: 0, fontSize: 14 }}>Prihlásení: {pocet}{o.limit ? ` z ${o.limit}` : ""} · záväzne ›</button>
              : <span style={{ fontSize: 14, fontWeight: 800, color: "var(--green)" }}>Zúčastní sa: {pocet} {pocet === 1 ? "človek" : pocet >= 2 && pocet <= 4 ? "ľudia" : "ľudí"} · nezáväzne</span>}
            {FLAGS.dev_tier_switcher && aktivny && <button type="button" onClick={() => void simulujUcast(o)} style={{ minHeight: 32, padding: "0 10px", borderRadius: 10, border: "1px dashed var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>+1 (DEV)</button>}
          </div>}
          {ludiId === o.id && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{o.prihlaseni.length ? o.prihlaseni.map((l, i) => <span key={i} style={{ flex: "none", whiteSpace: "nowrap", minHeight: 30, padding: "0 12px", borderRadius: 15, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", fontSize: 13, color: "var(--ink2)" }}>{l.meno}</span>) : <span style={{ fontSize: 13, color: "var(--ink3)" }}>Zatiaľ nikto.</span>}</div>}
          {aktivny && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => onUpravit(o)} style={tlO}>Upraviť</button>
            {akcia && <button type="button" onClick={() => setZrId(o.id)} style={{ ...tlO, borderColor: C.rBd, color: C.red }}>{o.druh === "vyzva" ? "Zrušiť výzvu" : "Zrušiť akciu"}</button>}
          </div>}
          {zrId === o.id && <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 14, background: C.rSoft, border: `1px solid ${C.rBd}` }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{o.druh === "vyzva" ? "Zrušiť výzvu? Pri nej sa ukáže „Zrušené“." : `Zrušiť akciu? Pri ozname sa ukáže „Zrušené“${pocet ? ` a ${pocet} ${pocet === 1 ? "prihlásenému" : "prihláseným"} príde správa` : ""}.`}</span>
            <div style={{ display: "flex", gap: 10 }}><button type="button" onClick={() => setZrId(null)} style={tlO}>Späť</button>
              <button type="button" onClick={async () => { await zrusOznamCharity(o); setZrId(null); toast(pocet ? "Zrušené. Prihláseným posielame správu." : "Zrušené."); }} style={{ ...tlO, border: "none", background: C.red, color: "#fff" }}>Áno, zrušiť</button></div>
          </div>}
          {o.upravene && !o.zrusene && akcia && <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>Pri úprave dátumu alebo miesta pošleme prihláseným správu. Pri ozname sa ukáže „upravené“.</span>}
        </section>);
    })}
  </>);
  const prepinac = (on: boolean, t: string, s: string, tap: () => void) => (
    <button type="button" role="switch" aria-checked={on} onClick={tap} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "6px 12px", borderRadius: 12, border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
      <span style={{ width: 38, height: 22, flex: "none", borderRadius: 11, background: on ? "var(--green)" : "#BDB6A8", position: "relative" }}><span style={{ position: "absolute", top: 2, left: 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: `translateX(${on ? 16 : 0}px)`, transition: "transform .2s ease" }} /></span>
      <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5, color: "var(--ink)" }}>{t}</b><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
    </button>);
  const pravy = (<section style={{ ...panel, gap: 10, padding: "16px 18px" }}>
    <b style={{ fontSize: 16 }}>Nastavenia oznamov</b>
    {prepinac(n.pripomienka, "Pripomienka deň pred akciou", "prihláseným záväzne aj nezáväzne", () => ulozNastaveniaOznamov(strankaId, { ...n, pripomienka: !n.pripomienka }))}
    {prepinac(n.spravaPriZmene, "Správa pri zmene dátumu alebo miesta", "prihláseným, automaticky", () => ulozNastaveniaOznamov(strankaId, { ...n, spravaPriZmene: !n.spravaPriZmene }))}
  </section>);
  return <>{dva(lavy, pravy)}</>;
}
