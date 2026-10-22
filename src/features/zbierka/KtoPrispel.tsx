// ============================================================
// OPRAVY 490 · platobný modul: kto prispel (prototyp „Modul zbierky - farby a poradie“ 4a, PRAVIDLA-APPKY „Farby v pruhu zbierky“).
// Farby úsekov: organizácia (vlastný vklad) tmavozelená · firma zlatá · Reťaz dobra fialová šrafovaná · skutok zelená šrafovaná ·
// ľudia svetlozelená (zvyšok pruhu). Poradie úsekov aj riadkov: organizácia → firmy → reťaze → skutky → ľudia.
// Riadok: foto/logo · meno · štít · čo robí · suma (nezalomí sa). Pod pruhom legenda.
// Zdroje: vlastný vklad a pevná suma organizácie (usePrispievatelia), dorovnanie firmy (dary s „firma“),
// Reťaz dobra (usePodporaRetazou), dar cez skutok (dary s „cezSkutok“). Nič vymyslené — prázdne skupiny sa neukážu.
// ============================================================
import { useState, type CSSProperties, type ReactNode } from "react";
import { TlZbalit } from "@/features/verejny-profil/zbalit";
import { usePrispievatelia } from "@/lib/farnostPrispela";
import { usePodporaRetazou, inicialy, type PodporaRetazou, type Strana } from "@/lib/retaz";
import { beziaceDorovnaniaNaCiel, useZmenyDorovnani } from "@/lib/dorovnanie";
import { objektZbierky } from "@/lib/darZbierky";
import { strankaZbierky } from "@/lib/novaZbierka";
import type { DarRiadok } from "@/lib/darcovia";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { otvorVerziuRetaze } from "@/lib/retazVerzia";
import { StitStrany } from "./StranaZmluvy";
import { sumaEur } from "@/lib/suma";

export const FARBA_ORG = "#2F5E3A";
export const FARBA_FIRMA = "#D9A93E";
export const FARBA_RETAZ = "repeating-linear-gradient(135deg,#6B4E9A 0 4px,#A68BD0 4px 8px)";
export const FARBA_SKUTOK = "repeating-linear-gradient(135deg,#3F6E2A 0 4px,#6E9E4A 4px 8px)";
export const FARBA_LUDIA = "linear-gradient(90deg,#4B7A35,#8DB866)";
/** OPRAVY 491: viac subjektov rovnakého druhu — každý vlastný odtieň podľa poradia pripojenia (8 od tmavej po svetlú, natrvalo pri zbierke);
 *  od 9. sa odtiene opakujú so širším pásikom, od 17. s užším. Reťaz a skutok sú šrafované, organizácia a firma plné (od 9. šrafované). */
const PALETY: Record<"org" | "firma" | "retaz" | "skutok", [string, string][]> = {
  retaz: [["#4A3570", "#7C62A8"], ["#56407E", "#8E73BB"], ["#6B4E9A", "#A68BD0"], ["#7A5BAA", "#B39BDB"], ["#8467B4", "#BBA3E0"], ["#9174BE", "#C7B2E6"], ["#9F84C8", "#D2C0EC"], ["#AE95D2", "#DDCFF1"]],
  firma: [["#9C7418", "#C9982E"], ["#B0831F", "#D4A63C"], ["#C4922A", "#DDB04A"], ["#D9A93E", "#E8C56E"], ["#E0B654", "#EFD08A"], ["#E6C26C", "#F3D99E"], ["#EBCD84", "#F6E2B2"], ["#F0D89C", "#F9EAC6"]],
  org: [["#1F4528", "#3B6E47"], ["#2F5E3A", "#4C7F58"], ["#3A6B45", "#5A8C66"], ["#467852", "#689A73"], ["#52855E", "#76A781"], ["#5E926B", "#84B48F"], ["#6A9F78", "#92C09D"], ["#77AC85", "#A0CCAB"]],
  skutok: [["#2F5A1E", "#5A8A3A"], ["#3F6E2A", "#6E9E4A"], ["#4A7A33", "#7AAA55"], ["#55863C", "#86B660"], ["#609245", "#92C16B"], ["#6B9E4E", "#9ECC76"], ["#76AA57", "#AAD681"], ["#82B661", "#B5E08C"]],
};
/** prvý subjekt má základnú farbu z 490, ďalší striedavo svetlejšie a tmavšie odtiene (aby susedné úseky boli rozlíšiteľné) */
const PORADIE: Record<keyof typeof PALETY, number[]> = { retaz: [2, 5, 0, 7, 3, 6, 1, 4], firma: [3, 6, 0, 5, 1, 7, 2, 4], org: [1, 4, 7, 2, 5, 0, 3, 6], skutok: [1, 4, 7, 2, 5, 0, 3, 6] };
export const odtien = (druh: keyof typeof PALETY, i: number): string => {
  const [a, b] = PALETY[druh][PORADIE[druh][i % 8]], kolo = Math.floor(i / 8), w = kolo === 0 ? 4 : kolo === 1 ? 7 : 2;
  if ((druh === "org" || druh === "firma") && kolo === 0) return i === 0 ? (druh === "org" ? FARBA_ORG : FARBA_FIRMA) : a;
  return `repeating-linear-gradient(135deg,${a} 0 ${w}px,${b} ${w}px ${w * 2}px)`;
};
/** OPRAVY 490: Reťaz dobra fialová (predtým zelená s pásikmi) */
export const pasikyFialove = (i: number) => odtien("retaz", i);

const eur = (n: number) => sumaEur(n);
const pomerText = (p: number) => (p === 0.5 ? "1 : 0,5" : `1 : ${String(p).replace(".", ",")}`);

type Riadok = { k: string; druh: "org" | "firma" | "retaz" | "skutok"; meno: string; logo?: string; strana?: Strana; ini: string; text: ReactNode; suma: number; farba: string; tap?: () => void; tapText?: string };

/** všetky skupiny prispievateľov pri zbierke (bez ľudí) — rovnaké poradie pre pruh aj riadky */
/** organizácia, ktorá zbiera (z modulu) — meno, logo a štít pri vlastnom vklade a pri skutku */
export type OrgZbierky = { meno: string; obrazok?: string; stit?: string };
export function useKtoPrispel(refId: string, dary: DarRiadok[], orgZb?: OrgZbierky, /** OPRAVY 484: názov zbierky pri skutku („zbiera na zbierku: …“) */ nazovZb?: string): { riadky: Riadok[]; cezSkutok: number } {
  const strOrg = (meno: string): Strana | undefined => orgZb?.stit ? { druh: "charita", meno, iniciala: inicialy(meno), stit: orgZb.stit } : undefined;
  useZmenyDorovnani();
  const org = usePrispievatelia(refId);
  const ret = usePodporaRetazou(refId).filter((p) => p.poslane > 0 || p.bezi);
  const r: Riadok[] = [];
  // 1 · organizácia — vlastný vklad
  for (const [io, p] of org.filter((x) => x.vlastne && (x.suma ?? 0) > 0).entries())
    r.push({ k: `o${p.stranka}`, druh: "org", meno: p.meno, ini: inicialy(p.meno), ...(orgZb && orgZb.meno === p.meno ? { logo: orgZb.obrazok, strana: strOrg(p.meno) } : {}), text: <>vložila vlastné peniaze · <span style={{ whiteSpace: "nowrap" }}>{eur(p.suma!)}</span></>, suma: p.suma!, farba: odtien("org", io) });
  // 2 · firmy — pevná suma (Prispela) a dorovnanie (dorovnáva)
  let fi = 0;
  for (const p of org.filter((x) => !x.vlastne && (x.suma ?? 0) > 0))
    r.push({ k: `p${p.stranka}`, druh: "firma", meno: p.meno, ini: inicialy(p.meno), text: <>Prispela · <span style={{ whiteSpace: "nowrap" }}>{eur(p.suma!)}</span></>, suma: p.suma!, farba: odtien("firma", fi++), tap: () => otvorVerejnyProfil(p.stranka), tapText: "Pozri profil ›" });
  const dor = beziaceDorovnaniaNaCiel(refId);
  const firmy = new Map<string, number>();
  for (const d of dary) if (d.firma) firmy.set(d.firma, (firmy.get(d.firma) ?? 0) + d.suma);
  for (const d of dor) if (!firmy.has(d.firma)) firmy.set(d.firma, 0);
  for (const [meno, suma] of firmy) {
    const d = dor.find((x) => x.firma === meno);
    r.push({ k: `f${meno}`, druh: "firma", meno, logo: d?.firmaLogo, ini: inicialy(meno), text: <>dorovnáva {pomerText(d?.pomer ?? 1)} · zatiaľ <span style={{ whiteSpace: "nowrap" }}>{eur(suma)}</span></>, suma, farba: odtien("firma", fi++),
      ...(d?.firmaProfil ? { tap: () => otvorVerejnyProfil(d.firmaProfil!), tapText: "Pozri profil ›" } : {}) });
  }
  // 3 · Reťaz dobra
  ret.forEach((p: PodporaRetazou, i) => r.push({ k: `r${p.retaz}`, druh: "retaz", meno: p.meno, strana: p.robi, ini: inicialy(p.meno), logo: p.robi?.foto,
    text: <>Reťaz dobra · {p.pct}{" "}% · zatiaľ <span style={{ whiteSpace: "nowrap" }}>{eur(p.poslane)}</span></>, suma: p.poslane, farba: odtien("retaz", i),
    // OPRAVY 492: kým reťaz na túto zbierku posiela, ťuk otvorí platobný modul verzie u toho, kto reťazí
    ...(p.bezi ? { tap: () => otvorVerziuRetaze(p.retaz, refId), tapText: "Darovať cez reťaz ›" } : p.stranka ? { tap: () => otvorVerejnyProfil(p.stranka!), tapText: "Pozri profil ›" } : {}) }));
  // 4 · skutky, ktoré zbierajú na zbierku
  // OPRAVY 490: skutok podľa id (0140) — „Pozri ›“ otvorí priamo skutok; staré dary bez id otvoria stránku charity
  const sk = new Map<string, { nazov: string; id?: string; suma: number }>();
  for (const d of dary) if (d.cezSkutok) { const k = d.cezSkutokId ?? `n:${d.cezSkutok}`; const x = sk.get(k); sk.set(k, { nazov: d.cezSkutok, id: d.cezSkutokId, suma: (x?.suma ?? 0) + d.suma }); }
  const strankaZb = async () => objektZbierky(refId)?.stranka ?? (refId.includes(":") ? refId.split(":")[0] : await strankaZbierky(refId));
  let si = 0;
  for (const [k, x] of sk) r.push({ k: `s${k}`, druh: "skutok", meno: orgZb?.meno ?? "Skutok", ini: inicialy(orgZb?.meno ?? "S"), logo: orgZb?.obrazok, strana: orgZb ? strOrg(orgZb.meno) : undefined, text: <>Skutok {x.nazov} · {(nazovZb ?? objektZbierky(refId)?.nazov) ? `zbiera na zbierku: ${nazovZb ?? objektZbierky(refId)?.nazov}` : "zbiera na túto zbierku"} · zatiaľ <span style={{ whiteSpace: "nowrap" }}>{eur(x.suma)}</span></>, suma: x.suma, farba: odtien("skutok", si++),
    tap: () => { void strankaZb().then((st) => { if (st) otvorVerejnyProfil(st, x.id ? { doSkutku: x.id } : undefined); }); }, tapText: "Pozri ›" });
  return { riadky: r, cezSkutok: [...sk.values()].reduce((a, b) => a + b.suma, 0) };
}

/** úseky pruhu v poradí organizácia → firmy → reťaze → skutky (ľudia = zvyšok pruhu) */
export const usekyPruhu = (riadky: Riadok[], zaklad: number) => riadky.filter((r) => r.suma > 0).map((r) => ({ w: r.suma / zaklad, farba: r.farba }));

/** legenda pod pruhom — len skupiny, ktoré pri zbierke sú, a ľudia */
export function LegendaPruhu({ riadky, ludia }: { riadky: Riadok[]; ludia: boolean }) {
  const druhy = (["org", "firma", "retaz", "skutok"] as const).filter((d) => riadky.some((r) => r.druh === d && r.suma > 0));
  if (!druhy.length) return null;
  const pol: [string, string][] = [...druhy.map((d) => [d === "org" ? FARBA_ORG : d === "firma" ? FARBA_FIRMA : d === "retaz" ? FARBA_RETAZ : FARBA_SKUTOK, d === "org" ? "organizácia" : d === "firma" ? "firma" : d === "retaz" ? "Reťaz" : "skutok"] as [string, string]), ...(ludia ? [[FARBA_LUDIA, "ľudia"] as [string, string]] : [])];
  return <div style={{ display: "flex", gap: "6px 12px", marginTop: 8, fontSize: 12, color: "var(--ink3)", flexWrap: "wrap" }}>
    {pol.map(([f, t]) => <span key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: f, flex: "none" }} />{t}</span>)}
  </div>;
}

const VZHLAD: Record<Riadok["druh"], { bg: string; bd: string; ink: string; kruh: string }> = {
  org: { bg: "color-mix(in srgb, #2F5E3A 22%, transparent)", bd: "#2F5E3A", ink: "var(--green)", kruh: "#2F5E3A" },
  firma: { bg: "var(--goldBg)", bd: "var(--goldBd)", ink: "var(--gold)", kruh: "#D9A93E" },
  retaz: { bg: "rgba(166,139,208,.14)", bd: "rgba(166,139,208,.45)", ink: "#8467B4", kruh: "#4A3A63" },
  skutok: { bg: "rgba(156,196,116,.14)", bd: "rgba(156,196,116,.42)", ink: "var(--green)", kruh: "#1F4D36" },
};

/** riadky pod pruhom — foto/logo · meno · štít · čo robí · suma */
const DALSICH: Record<Riadok["druh"], (n: number) => string> = {
  org: (n) => n === 1 ? "a ďalšia organizácia" : `a ďalších ${n} ${n < 5 ? "organizácie" : "organizácií"}`,
  firma: (n) => n === 1 ? "a ďalšia firma" : `a ďalších ${n} ${n < 5 ? "firmy" : "firiem"}`,
  retaz: (n) => n === 1 ? "a ďalšia reťaz" : `a ďalších ${n} ${n < 5 ? "reťaze" : "reťazí"}`,
  skutok: (n) => n === 1 ? "a ďalší skutok" : `a ďalších ${n} ${n < 5 ? "skutky" : "skutkov"}`,
};
/** OPRAVY 491: z každého druhu 3 najväčšie + „a ďalších N · spolu … € · Zobraziť všetky ›“ (rozbalí sa tu, dole Zbaliť) */
export function RiadkyKtoPrispel({ riadky }: { riadky: Riadok[] }) {
  const [otv, setOtv] = useState<Set<string>>(new Set());
  if (!riadky.length) return null;
  const vystup: (Riadok | { dalsie: Riadok["druh"]; n: number; suma: number } | { zbal: Riadok["druh"] })[] = [];
  for (const druh of ["org", "firma", "retaz", "skutok"] as const) {
    const g = riadky.filter((x) => x.druh === druh).sort((a, b) => b.suma - a.suma);
    if (g.length <= 3 || otv.has(druh)) { vystup.push(...g); if (g.length > 3) vystup.push({ zbal: druh }); continue; }
    vystup.push(...g.slice(0, 3));
    const zv = g.slice(3);
    vystup.push({ dalsie: druh, n: zv.length, suma: zv.reduce((a, x) => a + x.suma, 0) });
  }
  const prepni = (d: string, on: boolean) => setOtv((x) => { const n = new Set(x); if (on) n.add(d); else n.delete(d); return n; });
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
    {vystup.map((r) => {
      if ("zbal" in r) return <TlZbalit key={`z${r.zbal}`} onZbal={() => prepni(r.zbal, false)} styl={{ color: VZHLAD[r.zbal].ink }} />;
      if ("dalsie" in r) return <button key={`d${r.dalsie}`} type="button" onClick={() => prepni(r.dalsie, true)} aria-expanded={false}
        style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 48, padding: "8px 12px", borderRadius: 14, border: `1px dashed ${VZHLAD[r.dalsie].bd}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--ink2)", textAlign: "left", boxShadow: "none" }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.4 }}>{DALSICH[r.dalsie](r.n)} · spolu <span style={{ whiteSpace: "nowrap", fontWeight: 800, color: "var(--ink)" }}>{eur(r.suma)}</span></span>
        <span style={{ flex: "none", whiteSpace: "nowrap", fontSize: 13, fontWeight: 800, color: VZHLAD[r.dalsie].ink }}>Zobraziť všetky ›</span>
      </button>;
      const v = VZHLAD[r.druh];
      const viac = riadky.filter((x) => x.druh === r.druh).length > 1; // OPRAVY 491: pri viacerých rovnakého druhu pásik vlastného odtieňa
      const obsah = <>
        {viac && <span aria-hidden="true" style={{ flex: "none", alignSelf: "stretch", width: 6, margin: "-4px 0", borderRadius: 3, background: r.farba }} />}
        <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: r.logo ? `url("${r.logo}") center/cover no-repeat #fff` : v.kruh, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{r.logo ? "" : r.ini}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><b style={{ fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.meno}</b>{r.strana && <StitStrany s={r.strana} h={22} />}</span>
          <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ink2)" }}>{r.text}</span>
        </span>
        {r.tap && <span style={{ flex: "none", whiteSpace: "nowrap", fontSize: 13, fontWeight: 800, color: v.ink }}>{r.tapText}</span>}
      </>;
      const st: CSSProperties = { display: "flex", alignItems: "center", gap: 10, minHeight: 60, padding: "10px 12px", borderRadius: 14, background: v.bg, border: `1px solid ${v.bd}`, fontFamily: "inherit", width: "100%", boxSizing: "border-box", color: "var(--ink)" };
      return r.tap ? <button key={r.k} type="button" onClick={r.tap} style={{ ...st, cursor: "pointer", boxShadow: "none" }}>{obsah}</button> : <div key={r.k} role="note" style={st}>{obsah}</div>;
    })}
  </div>;
}
