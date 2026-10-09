// ============================================================
// KARTA 57C §1 — živá verejná stránka farnosti (prototyp „Farnost nastenka - zivo“).
// Číta všetko z uloženého: Upraviť profil, hlavná zbierka, zvončeková (omšové okno), zbierky farnosti,
// omše a online omše, príhovor, oznamy farára (Oznamy v Správe) a príspevky veriacich (odFarnikov).
// Mapa blok ← úložisko: MAPA-NASTENKY.md. Prázdny blok sa nezobrazí; prázdna farnosť = titulka + jedna veta.
// Žiadne ukážkové dáta. Úmysel na omšu nikdy. Pomôž, Videá a Farár spravuje aj zatiaľ nemajú úložisko → skryté.
// Darcovia hlavnej zbierky: z ledgera, vždy „Bohu známy veriaci“ (voľba mena sa ešte nezapisuje), suma jedného
// darcu nikdy; zvončeková = jeden súhrnný riadok za nedeľu.
// ============================================================
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ProfilStranky } from "@/lib/profilStranky";
import { cistyText } from "@/lib/richtext";
import { usePouzivatel } from "@/lib/pouzivatel";
import { usePersonalizacia } from "@/lib/personalizacia";
import { centralnaZPamate, nacitajCentralnuZbierku, nazovHlavnej, useZmenyCentralnej } from "@/lib/centralnaZbierka";
import { naviazObjekt } from "@/lib/darZbierky";
import { useDarcovia, sucetDarov, relCas, nastavCiste, type DarRiadok } from "@/lib/darcovia";
import { useOmsoveOkno, suhrnHlavnej, menaOkna } from "@/lib/omsoveOkno";
import { nacitajZbierkyStranky, zbierkyStrankyZPamate, useZmenyZbierok, cielCislo, type SpustenaZbierka } from "@/lib/novaZbierka";
import { useKalendar, kostolKal, omseDna, polozkyDna, druhPolozky, minuty, iso, dvt, nazovOmse, nedelneOmse, DNI_K } from "@/lib/kalendarFarnosti";
import { prihovor, useZmenyPrihovoru, naZivo, onlineOmse, onlineVDen } from "@/lib/prihovor";
import { odFarnikov, useOdFarnikov, useCerstveOdFarnikov, prepniVPolozke, vyprsal, type PolozkaFarnika, type PoleReakcie } from "@/lib/odFarnikov";
import { reakcieF, prepniReakciuF, useReakcieF, useCerstveReakcieF, type PoleReakcieF } from "@/lib/reakcieFarnosti";
import { vlastnePrispevky, type VieraFeedItem } from "@/features/viera/mock";
import { usePrispevkySync } from "@/features/viera/prispevkyDB";
import { Plagat } from "@/features/viera/Sablony";
import { useVzhlad } from "@/lib/vzhladStranky";
import { stitokOznamu } from "@/features/rola/OmseKalendar";
import { klucJa, nastavUpravu, MenuPrispevku, CelaObrazovka, ProhliadacAlbumu } from "./FarnikPridava";
import type { ZbierkaData } from "@/features/zbierka/ZbierkaModul";
import type { StitLevel } from "@/components/stit";
import { toast } from "@/shared";

// ---- farby prototypu (svetlá nástenka) ----
const BG = "#EFEAE1", KARTA = "#E4DFD5", INK = "#1D211B", INK2 = "#4A4C43", INK3 = "#5B5D53", LINKA = "#CFC8BA", PAPIER = "#FBF9F4";
const TEAL = "#2F7A78", ZELENA = "#4B7A35", FIALOVA = "#6E4E7A", CERVENA = "#8E3B2F", ZLATA = "#8A6A1F";
/** svetlé premenné pre spoločné kúsky (··· Nahlásiť, celé obrazovky) — nástenka je zatiaľ len svetlá */
const PREMENNE = { "--ink": INK, "--ink2": INK2, "--ink3": INK3, "--card": PAPIER, "--cardBd": LINKA, "--field": PAPIER, "--btn": "#E4DFD5", "--gSoft": "#E3ECDB", "--gBd": "#9DBB86", "--gInk": "#2F5A22", "--goldBg": "#E2D7BF", "--bg": BG } as CSSProperties;
const PAD_X = "clamp(20px,5vw,72px)";
const MES = ["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"];
const DNW = ["pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota", "nedeľa"];
const DNW_V = ["PONDELOK", "UTOROK", "STREDA", "ŠTVRTOK", "PIATOK", "SOBOTA", "NEDEĽA"];
const ludi = (n: number) => `${n} ${n === 1 ? "človek" : n >= 2 && n <= 4 ? "ľudia" : "ľudí"}`;
const fotiek = (n: number) => `${n} ${n === 1 ? "fotka" : n >= 2 && n <= 4 ? "fotky" : "fotiek"}`;
const eur = (n: number) => `${Math.round(n).toLocaleString("sk-SK")} €`;
const dd = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const zIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const terazMs = () => Date.now();
const terazD = () => new Date();
const vcera = () => { const d = terazD(); d.setDate(d.getDate() - 1); return iso(d); };
const ziveObr = (u?: string | null) => !!u && !/^blob:/.test(u);
const bezPredpony = (s: string) => s.replace(/^[^·]*·\s*/, "");
const iniciy = (m: string) => m.split(/\s+/).filter((w) => w.length > 1 && w !== "Farnosť").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "F";

const blokStyl = (pozadie?: string): CSSProperties => ({ display: "flex", flexWrap: "wrap", gap: "20px 40px", padding: `48px ${PAD_X}`, borderTop: `1px solid ${LINKA}`, background: pozadie, scrollMarginTop: 16 });
const nadpisBloku: CSSProperties = { fontSize: "clamp(32px,3.2vw,44px)", lineHeight: 1.02, letterSpacing: "-.035em" };
const kicker = (c = INK3): CSSProperties => ({ fontSize: 14, fontWeight: 800, letterSpacing: ".12em", color: c });
/** tlačidlo reakcie podľa prototypu (tmavé = hlavné, svetlé = sústrasť) */
const tlacR = (ja: boolean, tmave: boolean, plne = false): CSSProperties => ({
  minHeight: 48, padding: "0 18px", borderRadius: 13, cursor: plne ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap",
  border: ja ? `2px solid ${ZELENA}` : tmave ? "2px solid #14110B" : `1.5px solid ${LINKA}`,
  background: plne ? "#CFC9BC" : ja ? "#E3ECDB" : tmave ? "#14110B" : PAPIER,
  color: plne ? INK2 : ja ? "#2F5A22" : tmave ? "#fff" : INK,
});
const tlacUpravit: CSSProperties = { alignSelf: "flex-start", minHeight: 44, padding: "0 16px", borderRadius: 12, border: `1.5px solid ${ZELENA}`, background: "transparent", color: "#2F5A22", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };

export function posunNaBlok(blok: string) {
  document.querySelector(`[data-blok="${blok}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export interface NastenkaProps {
  strankaId: string; meno: string; profil: ProfilStranky | null;
  /** ťuk na zbierku → detail (§3 ho prerobí na zbierku + platobný modul) */
  onDetail: (z: ZbierkaData) => void;
  /** zelené + je zapnuté (miesto dole, nech ho nič neprekryje) */
  fab?: boolean;
  /** „‹ Späť“ vľavo hore (stránka otvorená v appke) */
  onBack?: () => void;
  /** štít stránky (riadok „kto za zbierku zodpovedá“ v module) */
  stit: StitLevel;
}

/** kľúč na zväčšenie: obrázok alebo šablóna farára */
type Velke = { src: string } | { it: VieraFeedItem };

export function NastenkaFarnosti({ strankaId, meno, profil, onDetail, fab, onBack, stit: stitStranky }: NastenkaProps) {
  const kal = useKalendar(strankaId);
  useZmenyPrihovoru(); useZmenyCentralnej(); useZmenyZbierok(); useOdFarnikov(); useReakcieF();
  useCerstveOdFarnikov(strankaId); useCerstveReakcieF(strankaId); usePrispevkySync(strankaId);
  useEffect(() => { void nacitajCentralnuZbierku(strankaId); void nacitajZbierkyStranky(strankaId); }, [strankaId]);
  const vz = useVzhlad(strankaId, false);
  const ja = usePouzivatel();
  const kto = klucJa(ja), reg = ja.typ !== "pasivny", mojeMeno = ja.celeMeno?.trim() || "veriaci";
  const pers = usePersonalizacia();
  const [cas, setCas] = useState(terazD);
  useEffect(() => { const t = window.setInterval(() => setCas(terazD()), 60000); return () => window.clearInterval(t); }, []);
  const [prihOn, setPrihOn] = useState(false);
  const [velke, setVelke] = useState<Velke | null>(null);
  const [album, setAlbum] = useState<PolozkaFarnika | null>(null);
  const [zoz, setZoz] = useState<string | null>(null);
  const [flt, setFlt] = useState<"vse" | "far" | "ver">("vse");

  const VJ = kal.verejne, kk = kostolKal(strankaId);
  const vc = vcera();
  const orgPole = { meno, typ: "charita" as const, mesto: "", cisla: [] as [string, string][], obrazok: profil?.logo ?? undefined, stit: stitStranky };

  // ---------- titulka ----------
  const cover = profil?.cover?.src && ziveObr(profil.cover.src) ? profil.cover.src : "";
  const logo = !profil?.bezLoga && profil?.logo ? profil.logo : null;
  const inic = (profil?.bezLoga && profil.inicialy?.trim().toUpperCase()) || iniciy(meno);
  const p = prihovor(strankaId);
  const zivoT = VJ.omse ? naZivo(strankaId, cas) : null, zivoUrl = onlineOmse(strankaId).url.trim();
  const sled = pers.sledujem(meno);

  // ---------- O nás + hlavná ----------
  const onas = cistyText([profil?.onas, profil?.onas2].filter(Boolean).join("\n")).trim();
  const hl = centralnaZPamate(strankaId);
  const hlOn = !!hl?.spustena;
  const hlRef = `${strankaId}-centralna`;
  nastavCiste([hlRef]); // bod 0: žiadni ukážkoví darcovia
  if (hlOn) naviazObjekt(hlRef, { stranka: strankaId, hlavna: true, nazov: nazovHlavnej(hl) });
  const hlTxt = hl ? cistyText(hl.popis).trim() : "";

  // ---------- zbierky ----------
  const zb = zbierkyStrankyZPamate(strankaId).filter((z) => (z.stav ?? "aktivna") === "aktivna");
  const druh = (z: SpustenaZbierka) => z.farnost?.druh ?? "farnost";
  const zbFar = zb.filter((z) => druh(z) === "farnost"), zbIne = zb.filter((z) => druh(z) === "ine");
  const zbPohreb = zb.filter((z) => druh(z) === "pohreb"), zbSvadba = zb.filter((z) => druh(z) === "svadba");
  const zvOn = hlOn && nedelneOmse(strankaId).length > 0;
  const detailZbierky = (z: SpustenaZbierka): ZbierkaData => ({
    id: z.id, nazov: z.nazov, popis: cistyText(z.popis), overena: true, ciel: cielCislo(z) || undefined,
    media: z.media.filter((m) => ziveObr(m.src)).map((m) => (m.typ === "video" ? { typ: "video" as const, src: m.src } : { typ: "foto" as const, src: m.src })),
    organizacia: orgPole,
  });

  // ---------- omše ----------
  const omseD = (d: Date) => VJ.omse ? [...omseDna(kk, d).filter((o) => !o.zrusena).map((o) => ({ t: o.t, n: nazovOmse(o.kod) })), ...polozkyDna(kk, d).filter((x) => druhPolozky(x.typ).kat === "omse").map((x) => ({ t: x.t, n: "omša" }))].sort((a, b) => minuty(a.t) - minuty(b.t)) : [];
  const dni = Array.from({ length: 7 }, (_, i) => { const d = new Date(cas.getFullYear(), cas.getMonth(), cas.getDate() + i); return { d, i, om: omseD(d), ol: VJ.omse ? onlineVDen(strankaId, d) : [] }; });
  const maOmse = dni.some((d) => d.om.length);
  const mNow = cas.getHours() * 60 + cas.getMinutes();
  const dalsia = dni[0].om.find((o) => minuty(o.t) >= mNow - 30);
  const nd = dni.slice(1).find((d) => d.om.length);
  const pasT = dalsia ? `Dnes ${dalsia.t} · ${/omša/.test(dalsia.n) ? dalsia.n : `${dalsia.n} omša`}` : nd ? `${dni[0].om.length ? "Dnes už omša nie je" : "Dnes omša nie je"} · najbližšia ${nd.i === 1 ? "zajtra" : `${DNW[dvt(nd.d)]} ${nd.d.getDate()}. ${nd.d.getMonth() + 1}.`} o ${nd.om[0].t}` : "";

  // ---------- zdroje oznamov ----------
  const OZ = vlastnePrispevky(strankaId);
  const OD = odFarnikov(strankaId).filter((x) => x.k !== "umysel" && !vyprsal(x, terazMs()) && !(x.k === "udalost" && x.f?.datum && x.f.datum < vc));
  const autor = (x: PolozkaFarnika) => (x.anon || /Bohu známy/.test(x.kto) ? "Pridal veriaci" : `Pridal veriaci · ${x.kto}`);
  const moje = (x: PolozkaFarnika) => !!x.autor && x.autor === kto;
  const obrVer = (x: PolozkaFarnika) => { const o = x.obr ?? (x.editor ? x.fotky?.[0] : undefined); return ziveObr(o) ? o! : ""; };
  const obrFar = (x: VieraFeedItem) => { const o = x.smutocny?.imageUrl ?? (x.plagat ? x.fotky?.[0] : undefined); return ziveObr(o) ? o! : ""; };
  const sablonaFar = (x: VieraFeedItem) => (!obrFar(x) && x.oz?.u && x.oz.volba ? x.oz : null);
  const stit = (x: VieraFeedItem) => (x.tag === "Oznámenie" ? "OZNÁMENIE" : stitokOznamu(x));

  // ---------- Príď a zaži s nami ----------
  type Ud = { id: string; ms: number; dat: string; t: string; txt: string; kedy: string; od: string; foto: string; plag: boolean; pz: 0 | 1 | 2; limit: number; zoznam: string[]; mena: Record<string, string>; prepni: () => void; mojeX?: PolozkaFarnika };
  const udFar: Ud[] = OZ.filter((x) => x.ntyp === "udalost" && (!x.datum || x.datum >= vc)).map((x) => {
    const r = reakcieF(strankaId, x.id), pz: 0 | 1 | 2 = x.pozvanie ? (x.pozvanie.zavazne ? 2 : 1) : x.rsvp ? (x.udalost?.zavazne ? 2 : 1) : 0;
    const d = x.datum ? zIso(x.datum) : null;
    return { id: x.id, ms: d?.getTime() ?? 9e15, dat: x.datum ?? "", t: x.nazov ?? "", txt: x.udalost?.text ?? "", od: "Farnosť",
      kedy: [d ? `${DNW_V[dvt(d)]} ${d.getDate()}. ${d.getMonth() + 1}.` : "", x.udalost?.cas, x.udalost?.miesto?.toLocaleUpperCase("sk-SK")].filter(Boolean).join(" · "),
      foto: ziveObr(x.fotky?.[0]) ? x.fotky![0] : "", plag: !!x.plagat, pz, limit: x.pozvanie?.limit ?? 0, zoznam: r.ucast ?? [], mena: r.mena ?? {},
      prepni: () => prepniReakciuF(strankaId, x.id, "ucast", kto, mojeMeno) };
  });
  const udVer: Ud[] = OD.filter((x) => x.k === "udalost").map((x) => {
    const d = x.f?.datum ? zIso(x.f.datum) : null;
    return { id: x.id, ms: d?.getTime() ?? 9e15, dat: x.f?.datum ?? "", t: x.t, txt: x.s, od: autor(x),
      kedy: [d ? `${DNW_V[dvt(d)]} ${d.getDate()}. ${d.getMonth() + 1}.` : "", x.f?.cas, x.f?.kde?.toLocaleUpperCase("sk-SK")].filter(Boolean).join(" · "),
      foto: ziveObr(x.fotky?.[0]) ? x.fotky![0] : "", plag: false, pz: x.pozv ?? 0, limit: x.limit ?? 0, zoznam: x.ucast ?? [], mena: x.mena ?? {},
      prepni: () => prepniVPolozke(strankaId, x.id, "ucast", kto, undefined, mojeMeno), mojeX: x };
  });
  const udalosti = [...udFar, ...udVer].sort((a, b) => a.ms - b.ms);
  const alba = OD.filter((x) => x.k === "fotky" && x.fotky?.some(ziveObr));
  const maPrid = udalosti.length > 0 || alba.length > 0;

  // ---------- Modli sa s nami ----------
  const prosby = OD.filter((x) => x.k === "modlitba");
  // ---------- Spomíname ----------
  const parteFar = OZ.filter((x) => stit(x) === "PARTE");
  const parteVer = OD.filter((x) => x.k === "parte");
  const maSpom = parteFar.length + parteVer.length + zbPohreb.length > 0;
  // ---------- Teš sa s nami ----------
  const tesFar = OZ.filter((x) => ["SVADBA", "JUBILEUM"].includes(stit(x)));
  const tesVer = OD.filter((x) => x.k === "svadba" || x.k === "ine");
  const maTes = tesFar.length + tesVer.length + zbSvadba.length > 0;
  // ---------- Oznamy farnosti ----------
  type Oz = { id: string; ms: number; chip: string; t: string; txt: string; zm: boolean; g: "far" | "ver"; x?: PolozkaFarnika };
  const ozAll: Oz[] = [
    ...OZ.filter((x) => ["OZNAM", "ZMENA OMŠE", "OZNÁMENIE"].includes(stit(x)) && (stit(x) !== "ZMENA OMŠE" || VJ.zmeny)).map((x): Oz => ({ id: x.id, ms: x.vytvorene ?? 0, chip: stit(x) === "ZMENA OMŠE" ? "ZMENA PROGRAMU" : stit(x), t: x.nazov ?? "", txt: x.popis ?? "", zm: stit(x) === "ZMENA OMŠE", g: "far" })),
    ...OD.filter((x) => x.k === "oznam").map((x): Oz => ({ id: x.id, ms: x.cas, chip: `OD VERIACICH · ${(x.anon ? "Bohu známy veriaci" : x.kto).toLocaleUpperCase("sk-SK")}`, t: x.t, txt: x.s, zm: false, g: "ver", x })),
  ].sort((a, b) => b.ms - a.ms);
  const maFilter = ozAll.some((x) => x.g === "far") && ozAll.some((x) => x.g === "ver");
  const oznamy = ozAll.filter((x) => !maFilter || flt === "vse" || x.g === flt);
  const k = profil?.kontakt;
  const urad = k ? [k.adresaVerejna.trim() || k.sidlo.trim(), ...k.telefony.map((t) => t.cislo.trim()), ...k.emaily.map((e) => e.adresa.trim())].filter(Boolean) : [];
  const maInfo = ozAll.length > 0 || maOmse || urad.length > 0;

  const maVrch = !!onas || hlOn;
  const maZbierky = zvOn || zbFar.length + zbIne.length > 0;
  const prazdna = !(maVrch || maZbierky || maPrid || !!p || prosby.length || maSpom || maTes || maInfo);

  // ---------- spoločné kúsky ----------
  const pozvat = (u: Ud) => {
    const jaV = u.zoznam.includes(kto), n = u.zoznam.length, zav = u.pz === 2;
    const plne = !jaV && zav && u.limit > 0 && n >= u.limit;
    const t = plne ? "Plné · ďakujeme" : jaV ? (zav ? "Prihlásený ✓ · zrušiť" : "Prídem ✓ · zrušiť") : zav ? "Prihlásiť sa" : "Prídem";
    const poc = n ? (zav ? `prihlásení ${n}${u.limit ? ` z ${u.limit}` : ""}` : `${ludi(n)} príde`) : u.limit ? `miesta: ${u.limit}` : "";
    const zozOn = zoz === u.id;
    const mena = u.zoznam.map((x) => `${u.mena[x] ?? "veriaci"}${x === kto ? " (vy)" : ""}`);
    return <>
      <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 6 }}>
        <button type="button" aria-pressed={jaV} disabled={plne} onClick={() => { if (zav && !jaV && !reg) { toast("Prihlásiť sa menom môžu len registrovaní v DEED."); return; } u.prepni(); }} style={tlacR(jaV, true, plne)}>{t}</button>
        {poc && <span style={{ fontSize: 16, fontWeight: 700 }}>{poc}</span>}
      </span>
      {zav && mena.length > 0 && <>
        <button type="button" aria-expanded={zozOn} onClick={() => setZoz(zozOn ? null : u.id)} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", color: INK, fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4 }}>{zozOn ? "Skryť zoznam ⌃" : `Kto sa prihlásil · ${mena.length} ⌄`}</button>
        {zozOn && <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${LINKA}` }}>{mena.map((m, i) => <span key={i} style={{ padding: "9px 0", borderBottom: `1px solid ${LINKA}`, fontSize: 16 }}>{m}</span>)}</div>}
      </>}
    </>;
  };
  const reakcia = ({ zoznam, prepni, t, tJa, tmave = true, poc }: { zoznam: string[]; prepni: () => void; t: string; tJa: string; tmave?: boolean; poc: (n: number) => string }) => {
    const jaV = zoznam.includes(kto);
    return <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button type="button" aria-pressed={jaV} onClick={prepni} style={tlacR(jaV, tmave)}>{jaV ? tJa : t}</button>
      {zoznam.length > 0 && <span style={{ fontSize: 16, fontWeight: 700 }}>{poc(zoznam.length)}</span>}
    </span>;
  };
  const reakF = (ref: string, pole: PoleReakcieF) => ({ zoznam: reakcieF(strankaId, ref)[pole] ?? [], prepni: () => prepniReakciuF(strankaId, ref, pole, kto, mojeMeno) });
  const reakV = (x: PolozkaFarnika, pole: PoleReakcie) => ({ zoznam: (x[pole] as string[] | undefined) ?? [], prepni: () => prepniVPolozke(strankaId, x.id, pole, kto, undefined, mojeMeno) });
  const sustrast = (z: { zoznam: string[]; prepni: () => void }) => <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "14px 24px 18px", borderTop: `1px solid ${LINKA}` }}>
    {reakcia({ ...z, t: "Úprimnú sústrasť", tJa: "Prejavili ste sústrasť ✓", tmave: false, poc: (n) => String(n) })}
  </div>;
  const obrazokOznamu = ({ src, it, pomer, maxH, onTap, label }: { src: string; it?: VieraFeedItem; pomer: string; maxH?: number; onTap: () => void; label: string }) => (
    <button type="button" onClick={onTap} aria-label={`${label} na celú obrazovku`} style={{ width: "100%", aspectRatio: src ? pomer : undefined, maxHeight: maxH, border: "none", padding: 0, background: PAPIER, cursor: "zoom-in", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {src ? <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        : it?.oz?.u && it.oz.volba ? <span style={{ padding: 12, display: "flex" }}><Plagat u={it.oz.u} volba={it.oz.volba} vz={vz} sirka={300} /></span> : null}
    </button>);
  const rodinaZbierka = (z: SpustenaZbierka, text: string) => (
    <button type="button" onClick={() => onDetail(detailZbierky(z))} style={{ textAlign: "left", padding: "14px 16px", borderRadius: 14, border: `2px solid ${FIALOVA}`, background: "#F3EEF4", display: "flex", flexDirection: "column", gap: 3, cursor: "pointer", color: INK, fontFamily: "inherit" }}>
      <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".1em", color: FIALOVA }}>ZBIERKA RODINY</span>
      <b style={{ fontSize: 17 }}>{text}</b>
    </button>);
  const lavyStlpec = (nadpis: string, popis: string) => <div style={{ flex: "1 1 220px", maxWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}><b style={nadpisBloku}>{nadpis}</b><span style={{ fontSize: 17, lineHeight: 1.5, color: INK3 }}>{popis}</span></div>;

  return (
    <div className="nastenka-farnosti" style={{ ...PREMENNE, position: "relative", width: "100%", maxWidth: 1440, margin: "0 auto", background: BG, color: INK, display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom: fab ? 110 : 0 }}>
      {/* ---------- titulka ---------- */}
      <div style={{ position: "relative", minHeight: "clamp(300px,34vw,480px)", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: `${onBack ? 92 : 24}px ${PAD_X} clamp(20px,3vw,40px)`, background: cover ? `linear-gradient(180deg,rgba(10,8,5,.3) 0%,rgba(10,8,5,0) 35%,rgba(10,8,5,.88) 100%), url("${cover}") center/cover no-repeat #D9D3C7` : "linear-gradient(160deg,#3A372E 0%,#14110B 100%)" }}>
        {onBack && <button type="button" onClick={onBack} style={{ position: "absolute", top: 24, left: PAD_X, minHeight: 48, padding: "0 18px", border: "none", borderRadius: 14, background: "rgba(255,255,255,.92)", color: INK, fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>‹ Späť</button>}
        {zivoT && zivoUrl && <a href={zivoUrl} target="_blank" rel="noopener noreferrer" style={{ position: "absolute", top: 24, right: PAD_X, minHeight: 48, padding: "0 18px", borderRadius: 24, background: "#B3261E", color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: 10, fontSize: 15.5, fontWeight: 800, letterSpacing: ".04em" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff" }} />NAŽIVO · omša {zivoT} · Pozrieť ›</a>}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(14px,2vw,24px)", flexWrap: "wrap" }}>
          {p ? <button type="button" onClick={() => setPrihOn(true)} aria-label="Príhovor farára · prehrať" style={{ flex: "none", width: "clamp(76px,7vw,100px)", height: "clamp(76px,7vw,100px)", borderRadius: "50%", padding: 4, border: "none", background: "conic-gradient(#C9A24A,#4B7A35,#C9A24A)", cursor: "pointer" }}>
            <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: INK, border: `3px solid ${BG}`, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}><span style={{ width: 0, height: 0, borderLeft: "18px solid #fff", borderTop: "11px solid transparent", borderBottom: "11px solid transparent", marginLeft: 5 }} /></span>
          </button>
            : logo ? <img src={logo} alt="Logo" style={{ flex: "none", width: "clamp(76px,7vw,100px)", height: "clamp(76px,7vw,100px)", borderRadius: profil?.tvar === "kruh" ? "50%" : 26, objectFit: "cover", background: "#fff" }} />
            : <span style={{ flex: "none", width: "clamp(76px,7vw,100px)", height: "clamp(76px,7vw,100px)", borderRadius: 26, background: "#fff", color: "#14110B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(26px,2.6vw,34px)", fontWeight: 800 }}>{inic}</span>}
          <span style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}><b style={{ fontSize: "clamp(34px,4.4vw,60px)", lineHeight: 1, letterSpacing: "-.04em", color: "#fff", textWrap: "balance" } as CSSProperties}>{meno}</b><span style={{ fontSize: "clamp(15px,1.4vw,19px)", color: "#E8E1D3" }}>Farnosť</span></span>
          <button type="button" aria-pressed={sled} onClick={() => pers.toggleSledovanie({ meno, typ: "org" } as Parameters<typeof pers.toggleSledovanie>[0])} style={{ flex: "none", minHeight: 54, padding: "0 24px", borderRadius: 15, border: "none", background: sled ? "#E3ECDB" : "#fff", color: sled ? "#2F5A22" : "#14110B", fontFamily: "inherit", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>{sled ? "Sledujete ✓" : "Sledovať farnosť"}</button>
        </div>
      </div>

      {/* ---------- O nás + Hlavná zbierka ---------- */}
      {maVrch && <div style={{ padding: `40px ${PAD_X}`, display: "flex", flexWrap: "wrap", gap: "32px 40px", alignItems: "flex-start" }}>
        {onas && <span style={{ flex: "1.15 1 380px", minWidth: 0, fontSize: "clamp(17px,1.5vw,20px)", lineHeight: 1.7, color: INK2, whiteSpace: "pre-line" }}>{onas}</span>}
        {hlOn && hl && <HlavnaKarta strankaId={strankaId} hlRef={hlRef} nazov={nazovHlavnej(hl)} txt={hlTxt}
          onTap={() => onDetail({ id: hlRef, nazov: nazovHlavnej(hl), popis: hlTxt, overena: true, organizacia: orgPole,
            media: hl.media.filter((m) => ziveObr(m.src)).map((m) => (m.typ === "video" ? { typ: "video" as const, src: m.src } : { typ: "foto" as const, src: m.src })) })} />}
      </div>}

      {/* ---------- Zbierky farnosti ---------- */}
      {maZbierky && <div data-blok="zbierky" style={{ padding: `0 ${PAD_X} 40px`, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}><b style={{ fontSize: 30, letterSpacing: "-.02em" }}>Zbierky farnosti</b><span style={{ fontSize: 17, color: INK3 }}>ťuknite na zbierku a prispejte</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14, alignItems: "stretch" }}>
          {zvOn && <ZvoncekKarta strankaId={strankaId} onTap={(id, t) => onDetail({ id, nazov: t, popis: "Ako do zvončeka pri omši. Dar ide farnosti.", overena: true, organizacia: orgPole })} />}
          {zbFar.map((z) => <ZbierkaKarta key={z.id} z={z} onTap={() => onDetail(detailZbierky(z))} />)}
          {zbIne.map((z) => <button key={z.id} type="button" onClick={() => onDetail(detailZbierky(z))} style={{ textAlign: "left", border: "none", borderRadius: 22, background: KARTA, borderLeft: `5px solid ${FIALOVA}`, padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 8, color: INK, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={kicker(FIALOVA)}>ZBIERKA RODINY</span><b style={{ fontSize: 20, lineHeight: 1.25 }}>{bezPredpony(z.nazov) || "Zbierka"}</b><span style={{ fontSize: 16, color: INK2 }}>Peniaze idú: rodine · Prispieť ›</span>
          </button>)}
        </div>
      </div>}

      {/* ---------- pás Dnes ---------- */}
      {maOmse && pasT && <div style={{ margin: `0 ${PAD_X} 8px`, padding: "16px 22px", borderRadius: 16, border: `1.5px solid ${LINKA}`, display: "flex", alignItems: "center", gap: "12px 20px", flexWrap: "wrap", fontSize: 17 }}>
        <b>{pasT}</b><span style={{ flex: 1 }} />
        <button type="button" onClick={() => document.querySelector("[data-omse]")?.scrollIntoView({ behavior: "smooth", block: "start" })} style={{ minHeight: 44, padding: "0 4px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: INK, cursor: "pointer" }}>Všetky omše ›</button>
      </div>}

      {/* ---------- Príď a zaži s nami ---------- */}
      {maPrid && <div data-blok="prid" style={blokStyl()}>
        {lavyStlpec("Príď a zaži s nami", "Pozývame vás. Ťuknite Prídem, nech vieme, s koľkými rátať. Fotky z akcií sú tu tiež.")}
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {udalosti.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 16 }}>
            {udalosti.map((u) => { const d = u.dat ? zIso(u.dat) : null; return (
              <div key={u.id} style={{ borderRadius: 24, overflow: "hidden", background: KARTA, display: "flex", flexDirection: "column" }}>
                {u.foto && u.plag ? <button type="button" onClick={() => setVelke({ src: u.foto })} aria-label="Plagát na celú obrazovku" style={{ width: "100%", aspectRatio: "3 / 4", border: "none", padding: 0, background: "#D9D3C7", cursor: "zoom-in", display: "block" }}><img src={u.foto} alt="Plagát" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} /></button>
                  : <div style={{ position: "relative", aspectRatio: u.foto ? "16 / 9" : "4 / 1", minHeight: 110, background: "linear-gradient(160deg,#D9D3C7,#C9C1B2)", overflow: "hidden" }}>
                    {u.foto && <img src={u.foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                    {d && <span style={{ position: "absolute", left: 16, top: 16, width: 72, height: 78, borderRadius: 16, background: "#fff", color: "#14110B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><b style={{ fontSize: 28, lineHeight: 1 }}>{d.getDate()}.</b><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".08em" }}>{MES[d.getMonth()]}</span><span style={{ fontSize: 12.5, color: INK3 }}>{DNW[dvt(d)]}</span></span>}
                  </div>}
                <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {u.kedy && <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".1em", color: ZLATA }}>{u.kedy}</span>}
                  <b style={{ fontSize: 22, lineHeight: 1.2, letterSpacing: "-.01em" }}>{u.t}</b>
                  {u.txt && <span style={{ fontSize: 16.5, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line" }}>{u.txt}</span>}
                  <span style={{ fontSize: 14.5, color: INK3 }}>{u.od}</span>
                  {u.pz > 0 && pozvat(u)}
                  {u.mojeX && moje(u.mojeX) && <button type="button" onClick={() => nastavUpravu(u.id)} style={tlacUpravit}>Upraviť · moje</button>}
                  {u.mojeX && <MenuPrispevku x={u.mojeX} strankaId={strankaId} kto={kto} moje={false} />}
                </div>
              </div>); })}
          </div>}
          {alba.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={kicker()}>FOTKY Z AKCIÍ</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
              {alba.map((a) => { const f = a.fotky!.find(ziveObr)!; return (
                <button key={a.id} type="button" onClick={() => setAlbum(a)} style={{ textAlign: "left", border: "none", padding: 0, borderRadius: 18, overflow: "hidden", background: KARTA, display: "flex", flexDirection: "column", cursor: "pointer", color: INK, fontFamily: "inherit" }}>
                  <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "4 / 3", background: "#D9D3C7", overflow: "hidden" }}><img src={f} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /><span style={{ position: "absolute", right: 10, bottom: 10, padding: "3px 9px", borderRadius: 7, background: "rgba(20,17,11,.78)", color: "#fff", fontSize: 14, fontWeight: 700 }}>{fotiek(a.fotky!.length)}</span></span>
                  <span style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 17, lineHeight: 1.25 }}>{a.t || "Fotky z akcie"}</b><span style={{ fontSize: 14.5, color: INK3 }}>{autor(a)}</span></span>
                </button>); })}
            </div>
          </div>}
        </div>
      </div>}

      {/* ---------- Vypočuj si ---------- */}
      {p && <div style={blokStyl()}>
        {lavyStlpec("Vypočuj si", "Krátky príhovor farára.")}
        <div style={{ flex: "999 1 520px", minWidth: 0 }}>
          <button type="button" onClick={() => setPrihOn(true)} style={{ width: "100%", textAlign: "left", display: "flex", flexWrap: "wrap", gap: "20px 24px", alignItems: "center", padding: 16, borderRadius: 24, background: KARTA, border: "none", cursor: "pointer", color: INK, fontFamily: "inherit" }}>
            <span style={{ position: "relative", flex: "0 1 360px", minWidth: 220, aspectRatio: "16 / 9", borderRadius: 16, background: INK, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 0, height: 0, borderLeft: "20px solid #14110B", borderTop: "13px solid transparent", borderBottom: "13px solid transparent", marginLeft: 6 }} /></span></span>
            <span style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 8 }}><span style={kicker()}>PRÍHOVOR FARÁRA · PRIDANÝ {dd(p.cas)}</span><b style={{ fontSize: "clamp(22px,2.2vw,30px)", lineHeight: 1.15, letterSpacing: "-.02em" }}>Príhovor farára</b><span style={{ fontSize: 16, color: INK3 }}>Ťuknite a prehrá sa na celú obrazovku.</span></span>
          </button>
        </div>
      </div>}

      {/* ---------- Modli sa s nami ---------- */}
      {prosby.length > 0 && <div data-blok="mod" style={blokStyl()}>
        {lavyStlpec("Modli sa s nami", "Prosby veriacich. Ťuknite Modlím sa s vami, človek uvidí, že nie je sám.")}
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {prosby.map((x) => (
            <div key={x.id} style={{ padding: 22, borderRadius: 22, background: KARTA, display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}><Sviecka /><span style={{ fontSize: 15, color: INK3 }}>{x.anon || /Bohu známy/.test(x.kto) ? "bez mena" : x.kto}</span></span>
              <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>{x.t && <b style={{ fontSize: 19, lineHeight: 1.4 }}>{x.t}</b>}{x.s && <span style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 600, color: INK2, whiteSpace: "pre-line" }}>{x.s}</span>}</span>
              {reakcia({ ...reakV(x, "modl"), t: "Modlím sa s vami", tJa: "Modlíte sa s nami ✓", poc: (n) => `${n} sa modlí` })}
              {moje(x) && <button type="button" onClick={() => nastavUpravu(x.id)} style={tlacUpravit}>Upraviť · moje</button>}
              <MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={false} />
            </div>))}
        </div>
      </div>}

      {/* ---------- Spomíname ---------- */}
      {maSpom && <div data-blok="spom" style={blokStyl("#E7E2D8")}>
        {lavyStlpec("Spomíname", "Parte a spomienky. Úprimnú sústrasť aj príspevok rodine.")}
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16, alignItems: "start" }}>
          {parteFar.map((x) => { const src = obrFar(x), sab = sablonaFar(x); return (
            <div key={x.id} style={{ border: "3px solid #14110B", background: PAPIER, display: "flex", flexDirection: "column" }}>
              {src || sab ? obrazokOznamu({ src: src, it: x, pomer: "3 / 4", maxH: 460, label: "Parte", onTap: () => setVelke(src ? { src } : { it: x }) })
                : <TextParte meno={x.smutocny?.meno ?? x.nazov ?? ""} kedy={x.popis ?? ""} />}
              <span style={{ padding: "12px 24px", fontSize: 14.5, color: INK3 }}>Farnosť</span>
              {sustrast(reakF(x.id, "sustrast"))}
            </div>); })}
          {parteVer.map((x) => { const src = obrVer(x); return (
            <div key={x.id} style={{ border: "3px solid #14110B", background: PAPIER, display: "flex", flexDirection: "column" }}>
              {src ? obrazokOznamu({ src: src, pomer: "3 / 4", maxH: 460, label: "Parte", onTap: () => setVelke({ src }) }) : <TextParte meno={x.t} kedy={x.s} />}
              <span style={{ padding: "12px 24px", fontSize: 14.5, color: INK3 }}>{autor(x)}</span>
              {sustrast(reakV(x, "sustrast"))}
              <div style={{ padding: "0 24px 16px" }}><MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={false} /></div>
            </div>); })}
          {zbPohreb.map((z) => (
            <div key={z.id} style={{ border: `3px solid ${FIALOVA}`, background: PAPIER, display: "flex", flexDirection: "column" }}>
              <button type="button" onClick={() => onDetail(detailZbierky(z))} style={{ border: "none", background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: INK }}><TextParte meno={bezPredpony(z.nazov) || "Rozlúčka"} kedy="" /></button>
              <span style={{ padding: "0 24px 12px", fontSize: 14.5, color: INK3 }}>Rodina</span>
              <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column" }}>{rodinaZbierka(z, "Peniaze idú: rodine · Prispieť ›")}</div>
              {sustrast(reakF(z.id, "sustrast"))}
            </div>))}
        </div>
      </div>}

      {/* ---------- Teš sa s nami ---------- */}
      {maTes && <div data-blok="tes" style={blokStyl()}>
        {lavyStlpec("Teš sa s nami", "Svadby, jubileá a poďakovania. Ťuknite Blahoželám.")}
        <div style={{ flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, alignItems: "start" }}>
          {tesFar.map((x) => { const src = obrFar(x), sab = sablonaFar(x); return (
            <div key={x.id} style={{ borderRadius: 22, overflow: "hidden", background: KARTA, display: "flex", flexDirection: "column" }}>
              {(src || sab) && obrazokOznamu({ src: src, it: x, pomer: "3 / 4", label: "Oznámenie", onTap: () => setVelke(src ? { src } : { it: x }) })}
              <div style={{ padding: "18px 20px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={kicker("#4E7D37")}>{stit(x)} · FARNOSŤ</span>
                <b style={{ fontSize: 21, lineHeight: 1.25 }}>{x.nazov}</b>
                {!src && !sab && x.popis && <span style={{ fontSize: 16.5, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line" }}>{x.popis}</span>}
                {reakcia({ ...reakF(x.id, "blaho"), t: "Blahoželám", tJa: "Blahoželáte ✓", poc: (n) => String(n) })}
              </div>
            </div>); })}
          {tesVer.map((x) => { const src = obrVer(x); return (
            <div key={x.id} style={{ borderRadius: 22, overflow: "hidden", background: KARTA, display: "flex", flexDirection: "column" }}>
              {src && obrazokOznamu({ src: src, pomer: "3 / 4", label: "Oznámenie", onTap: () => setVelke({ src }) })}
              <div style={{ padding: "18px 20px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={kicker("#4E7D37")}>{x.k === "svadba" ? "SVADBA" : "JUBILEUM"} · {(x.anon ? "veriaci" : x.kto).toLocaleUpperCase("sk-SK")}</span>
                <b style={{ fontSize: 21, lineHeight: 1.25 }}>{x.t}</b>
                {!src && x.s && <span style={{ fontSize: 16.5, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line" }}>{x.s}</span>}
                {reakcia({ ...reakV(x, "blaho"), t: "Blahoželám", tJa: "Blahoželáte ✓", poc: (n) => String(n) })}
                <MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={false} />
              </div>
            </div>); })}
          {zbSvadba.map((z) => (
            <div key={z.id} style={{ borderRadius: 22, overflow: "hidden", background: KARTA, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "18px 20px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={kicker("#4E7D37")}>SVADBA</span>
                <b style={{ fontSize: 21, lineHeight: 1.25 }}>{bezPredpony(z.nazov) || "Svadba"}</b>
                {rodinaZbierka(z, "Darček pre snúbencov · Prispieť ›")}
                {reakcia({ ...reakF(z.id, "blaho"), t: "Blahoželám", tJa: "Blahoželáte ✓", poc: (n) => String(n) })}
              </div>
            </div>))}
        </div>
      </div>}

      {/* ---------- Oznamy farnosti · Sväté omše · Farský úrad ---------- */}
      {maInfo && <div data-blok="ozn" style={{ padding: `40px ${PAD_X} 56px`, borderTop: "4px solid #1D211B", display: "flex", flexWrap: "wrap", gap: "36px 40px", alignItems: "flex-start", scrollMarginTop: 16 }}>
        {ozAll.length > 0 && <div style={{ flex: "1.4 1 340px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ ...kicker(), paddingBottom: 10 }}>OZNAMY FARNOSTI</span>
          {maFilter && <div role="radiogroup" aria-label="Filter oznamov" style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 12 }}>
            {([["vse", "Všetko"], ["far", "Od farnosti"], ["ver", "Od veriacich"]] as const).map(([kf, t]) => { const on = flt === kf; return <button key={kf} type="button" role="radio" aria-checked={on} onClick={() => setFlt(kf)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: on ? "2px solid #14110B" : `1.5px solid ${LINKA}`, background: on ? "#14110B" : "transparent", color: on ? "#fff" : INK, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{t}</button>; })}
          </div>}
          {oznamy.map((x) => (
            <div key={x.id} style={{ display: "flex", gap: 16, padding: "14px 0", borderTop: `1px solid ${LINKA}` }}>
              <span style={{ width: 80, flex: "none", fontSize: 16, fontWeight: 800, color: x.zm ? CERVENA : INK }}>{dd(x.ms)}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={kicker(x.zm ? CERVENA : INK3)}>{x.chip}</span>
                <b style={{ fontSize: 18 }}>{x.t}</b>
                {x.txt && <span style={{ fontSize: 16.5, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line" }}>{x.txt}</span>}
                {x.x && moje(x.x) && <button type="button" onClick={() => nastavUpravu(x.id)} style={tlacUpravit}>Upraviť · moje</button>}
                {x.x && <MenuPrispevku x={x.x} strankaId={strankaId} kto={kto} moje={false} />}
              </span>
            </div>))}
          {oznamy.length === 0 && <span style={{ padding: "14px 0", borderTop: `1px solid ${LINKA}`, fontSize: 16, color: INK3 }}>V tomto výbere nič nie je.</span>}
        </div>}
        {maOmse && <div data-omse="1" style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10, scrollMarginTop: 16 }}>
          <span style={kicker()}>SVÄTÉ OMŠE</span>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 16.5 }}>
            {dni.map((d) => { const dn = d.i === 0; return (
              <span key={iso(d.d)} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "10px 12px", margin: "1px -12px", borderRadius: 10, background: dn ? "#14110B" : "transparent", color: dn ? "#fff" : INK }}>
                <span>{DNI_K[dvt(d.d)]} {d.d.getDate()}. {d.d.getMonth() + 1}.{dn ? " · dnes" : ""}</span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                  <b style={{ textAlign: "right" }}>{d.om.map((o) => o.t).join(" · ") || "—"}</b>
                  {d.ol.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13.5, fontWeight: 800, color: dn ? "#FF9C8F" : "#B3261E" }}><span style={{ width: 0, height: 0, borderLeft: "8px solid currentColor", borderTop: "5px solid transparent", borderBottom: "5px solid transparent" }} />aj online {d.ol.join(" · ")}</span>}
                </span>
              </span>); })}
          </div>
        </div>}
        {urad.length > 0 && <div style={{ flex: "1 1 240px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={kicker()}>FARSKÝ ÚRAD</span>
          <span style={{ fontSize: 16.5, lineHeight: 1.6, color: INK2, whiteSpace: "pre-line" }}>{urad.join("\n")}</span>
        </div>}
      </div>}

      {/* ---------- prázdna farnosť ---------- */}
      {prazdna && <div style={{ padding: `56px ${PAD_X} 80px`, display: "flex", flexDirection: "column", gap: 8 }}>
        <b style={{ fontSize: 24 }}>Farnosť tu zatiaľ nič nezverejnila.</b>
        <span style={{ fontSize: 17, color: INK3 }}>Sledujte ju a dáme vám vedieť, keď pribudne oznam, omša alebo zbierka.</span>
      </div>}

      {/* ---------- celé obrazovky ---------- */}
      {prihOn && p && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Príhovor farára" style={{ position: "fixed", inset: 0, zIndex: 1100, background: "#000", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: "none", padding: "calc(14px + env(safe-area-inset-top, 0px)) 16px 10px", display: "flex", alignItems: "center", gap: 12 }}>
            <b style={{ flex: 1, fontSize: 17, color: "#fff" }}>Príhovor farára</b>
            <button type="button" onClick={() => setPrihOn(false)} autoFocus style={{ minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#111" }}>× Zavrieť</button>
          </div>
          <video src={p.src} controls playsInline autoPlay style={{ flex: 1, minHeight: 0, width: "100%", background: "#000", objectFit: "contain" }} />
        </div>, document.body)}
      {velke && <CelaObrazovka label="Na celú obrazovku" onZavri={() => setVelke(null)}>
        <VelkyObrazok v={velke} vz={vz} />
      </CelaObrazovka>}
      {album && <ProhliadacAlbumu a={album} onZavri={() => setAlbum(null)} />}
    </div>);
}

/** sviečka (prosba o modlitbu) */
function Sviecka() {
  return <span aria-hidden="true" style={{ position: "relative", width: 12, height: 30, flex: "none" }}><span style={{ position: "absolute", left: 3.5, top: 0, width: 5, height: 8, borderRadius: "50%", background: "#C9A24A" }} /><span style={{ position: "absolute", left: 1, top: 9, width: 10, height: 21, borderRadius: 2, background: PAPIER, border: `1px solid ${LINKA}`, boxSizing: "border-box" }} /></span>;
}

/** parte bez obrázka: krížik, úvod, meno, text */
function TextParte({ meno, kedy }: { meno: string; kedy: string }) {
  return (
    <div style={{ padding: "24px 24px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <span aria-hidden="true" style={{ position: "relative", width: 18, height: 26, flex: "none" }}><span style={{ position: "absolute", left: 6.5, top: 0, width: 3.5, height: 26, background: "#14110B" }} /><span style={{ position: "absolute", left: 0, top: 6.5, width: 18, height: 3.5, background: "#14110B" }} /></span>
      <span style={{ fontSize: 16, color: INK2 }}>S bolesťou v srdci oznamujeme</span>
      <b style={{ fontSize: 30, letterSpacing: "-.02em", lineHeight: 1.1 }}>{meno}</b>
      {kedy && <span style={{ fontSize: 16.5, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line" }}>{kedy}</span>}
    </div>);
}

/** obrázok na celú obrazovku: vyplní výšku, čierna len po bokoch */
function VelkyObrazok({ v, vz }: { v: Velke; vz: Parameters<typeof Plagat>[0]["vz"] }) {
  if ("src" in v) return <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px 8px" }}><img src={v.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>;
  const oz = v.it.oz;
  if (!oz?.u || !oz.volba) return null;
  const sirka = Math.max(240, Math.min(window.innerWidth - 16, Math.round((window.innerHeight - 90) / 1.414)));
  return <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", justifyContent: "center", padding: "0 8px 8px" }}><Plagat u={oz.u} volba={oz.volba} vz={vz} sirka={sirka} /></div>;
}

/** HLAVNÁ ZBIERKA — suma z ledgera (+ zvončekové nedele), darcovia „Bohu známy veriaci“ bez súm, zvonček jeden riadok za nedeľu */
function HlavnaKarta({ strankaId, hlRef, nazov, txt, onTap }: { strankaId: string; hlRef: string; nazov: string; txt: string; onTap: () => void }) {
  const dary = useDarcovia(hlRef);
  const { uzavrete } = useOmsoveOkno(strankaId);
  const s = suhrnHlavnej(strankaId, hlRef);
  const riadky: { cas: number; k: string; s: string }[] = [
    ...dary.map((r: DarRiadok) => ({ cas: r.cas, k: "Bohu známy veriaci", s: relCas(r.cas) })),
    ...uzavrete.filter((o) => o.suma > 0).map((o) => ({ cas: o.do, k: `Zvončeková zbierka · nedeľa ${o.nedela}`, s: eur(o.suma) })),
  ].sort((a, b) => b.cas - a.cas).slice(0, 4);
  return (
    <button type="button" onClick={onTap} style={{ flex: "1 1 360px", minWidth: 0, textAlign: "left", padding: "26px 28px", borderRadius: 24, background: KARTA, border: "none", borderLeft: `6px solid ${TEAL}`, display: "flex", flexDirection: "column", gap: 12, cursor: "pointer", color: INK, fontFamily: "inherit" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><span style={{ height: 30, padding: "0 12px", borderRadius: 9, background: TEAL, color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center" }}>HLAVNÁ ZBIERKA</span><span style={{ fontSize: 15.5, color: INK3 }}>stále · aj pravidelne mesačne</span></span>
      <b style={{ fontSize: "clamp(24px,2.2vw,30px)", letterSpacing: "-.02em" }}>{nazov} ›</b>
      {txt && <span style={{ fontSize: 17, lineHeight: 1.5, color: INK2 }}>{txt}</span>}
      {s.suma > 0 ? <span style={{ fontSize: 18, color: INK2 }}><b style={{ fontSize: 42, letterSpacing: "-.03em", color: INK }}>{eur(s.suma)}</b> spolu · {ludi(s.darcov)}</span>
        : <span style={{ fontSize: 17, color: INK2 }}>Zatiaľ tu nie je žiadny dar</span>}
      {riadky.length > 0 && <span style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${LINKA}` }}>
        {riadky.map((r, i) => <span key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: `1px solid ${LINKA}`, fontSize: 15.5 }}><span style={{ color: INK2 }}>{r.k}</span><b style={{ flex: "none" }}>{r.s}</b></span>)}
      </span>}
    </button>);
}

/** ZVONČEKOVÁ ZBIERKA — omšové okno tohto týždňa (nedeľa) */
function ZvoncekKarta({ strankaId, onTap }: { strankaId: string; onTap: (id: string, t: string) => void }) {
  const { okno, dary } = useOmsoveOkno(strankaId);
  const ja = usePouzivatel();
  const suma = dary.reduce((a, r) => a + r.suma, 0);
  const mena = suma > 0 ? menaOkna(dary, ja) : "";
  const casy = nedelneOmse(strankaId);
  const t = `Nedeľa ${okno.nedela}`;
  return (
    <button type="button" onClick={() => onTap(okno.id, `Zvončeková zbierka · ${t}`)} style={{ textAlign: "left", border: "none", borderRadius: 22, background: KARTA, borderLeft: `5px solid ${TEAL}`, padding: 18, display: "flex", flexDirection: "column", gap: 10, color: INK, cursor: "pointer", fontFamily: "inherit" }}>
      <span style={kicker(TEAL)}>ZVONČEKOVÁ ZBIERKA ›</span>
      <b style={{ fontSize: 24, lineHeight: 1.2 }}>{t}</b>
      <span style={{ fontSize: 16, color: INK3 }}>{casy.length === 1 ? `omša ${casy[0]}` : `omše ${casy.join(" · ")}`}</span>
      {suma > 0 ? <>
        <span style={{ fontSize: 16.5 }}><b style={{ fontSize: 30, letterSpacing: "-.02em" }}>{eur(suma)}</b> <span style={{ color: INK3 }}>od {ludi(dary.length)}</span></span>
        {mena && <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{mena.split(/, | a (?=ďalší)/).map((m, i) => <span key={i} style={{ height: 36, padding: "0 12px", borderRadius: 18, background: BG, display: "flex", alignItems: "center", fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>{m}</span>)}</span>}
      </> : <span style={{ fontSize: 16, color: INK2 }}>Zatiaľ žiadne dary na túto omšu.</span>}
      <span style={{ fontSize: 14.5, lineHeight: 1.45, color: INK3 }}>ako do zvončeka pri omši</span>
    </button>);
}

/** zbierka farnosti (lavice, organ …) — suma a ľudia z ledgera */
function ZbierkaKarta({ z, onTap }: { z: SpustenaZbierka; onTap: () => void }) {
  useDarcovia(z.id);
  const s = sucetDarov(z.id), ciel = cielCislo(z);
  const foto = z.media.find((m) => m.typ === "foto" && ziveObr(m.src))?.src;
  const pod: ReactNode = s.pocet ? `${eur(s.suma)}${ciel ? ` z ${eur(ciel)}` : ""} · ${ludi(s.pocet)}` : "Zatiaľ žiadne dary";
  return (
    <button type="button" onClick={onTap} style={{ textAlign: "left", border: "none", borderRadius: 22, overflow: "hidden", background: KARTA, borderLeft: `5px solid ${TEAL}`, padding: 0, display: "flex", flexDirection: "column", color: INK, cursor: "pointer", fontFamily: "inherit" }}>
      {foto && <img src={foto} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block", background: "#D9D3C7" }} />}
      <span style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={kicker(TEAL)}>ZBIERKA</span>
        <b style={{ fontSize: 20, lineHeight: 1.25 }}>{z.nazov || "Zbierka"}</b>
        <span style={{ fontSize: 16, color: INK2 }}>{pod}</span>
      </span>
    </button>);
}
