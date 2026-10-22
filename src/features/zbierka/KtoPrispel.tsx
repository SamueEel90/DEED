// ============================================================
// OPRAVY 490 · platobný modul: kto prispel (prototyp „Modul zbierky - farby a poradie“ 4a, PRAVIDLA-APPKY „Farby v pruhu zbierky“).
// Farby úsekov: organizácia (vlastný vklad) tmavozelená · firma zlatá · Reťaz dobra fialová šrafovaná · skutok zelená šrafovaná ·
// ľudia svetlozelená (zvyšok pruhu). Poradie úsekov aj riadkov: organizácia → firmy → reťaze → skutky → ľudia.
// Riadok: foto/logo · meno · štít · čo robí · suma (nezalomí sa). Pod pruhom legenda.
// Zdroje: vlastný vklad a pevná suma organizácie (usePrispievatelia), dorovnanie firmy (dary s „firma“),
// Reťaz dobra (usePodporaRetazou), dar cez skutok (dary s „cezSkutok“). Nič vymyslené — prázdne skupiny sa neukážu.
// ============================================================
import type { CSSProperties, ReactNode } from "react";
import { usePrispievatelia } from "@/lib/farnostPrispela";
import { usePodporaRetazou, inicialy, type PodporaRetazou, type Strana } from "@/lib/retaz";
import { beziaceDorovnaniaNaCiel, useZmenyDorovnani } from "@/lib/dorovnanie";
import { objektZbierky } from "@/lib/darZbierky";
import type { DarRiadok } from "@/lib/darcovia";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { StitStrany } from "./StranaZmluvy";
import { sumaEur } from "@/lib/suma";

export const FARBA_ORG = "#2F5E3A";
export const FARBA_FIRMA = "#D9A93E";
export const FARBA_RETAZ = "repeating-linear-gradient(135deg,#6B4E9A 0 4px,#A68BD0 4px 8px)";
export const FARBA_SKUTOK = "repeating-linear-gradient(135deg,#3F6E2A 0 4px,#6E9E4A 4px 8px)";
export const FARBA_LUDIA = "linear-gradient(90deg,#4B7A35,#8DB866)";
/** OPRAVY 490: Reťaz dobra fialová (predtým zelená s pásikmi) — každý ďalší tvorca iný odtieň */
const FIALOVE: [string, string][] = [["#6B4E9A", "#A68BD0"], ["#56407E", "#8E73BB"], ["#8467B4", "#BBA3E0"]];
export const pasikyFialove = (i: number) => { const [a, b] = FIALOVE[i % FIALOVE.length]; return `repeating-linear-gradient(135deg,${a} 0 4px,${b} 4px 8px)`; };

const eur = (n: number) => sumaEur(n);
const pomerText = (p: number) => (p === 0.5 ? "1 : 0,5" : `1 : ${String(p).replace(".", ",")}`);

type Riadok = { k: string; druh: "org" | "firma" | "retaz" | "skutok"; meno: string; logo?: string; strana?: Strana; ini: string; text: ReactNode; suma: number; farba: string; tap?: () => void; tapText?: string };

/** všetky skupiny prispievateľov pri zbierke (bez ľudí) — rovnaké poradie pre pruh aj riadky */
/** organizácia, ktorá zbiera (z modulu) — meno, logo a štít pri vlastnom vklade a pri skutku */
export type OrgZbierky = { meno: string; obrazok?: string; stit?: string };
export function useKtoPrispel(refId: string, dary: DarRiadok[], orgZb?: OrgZbierky): { riadky: Riadok[]; cezSkutok: number } {
  const strOrg = (meno: string): Strana | undefined => orgZb?.stit ? { druh: "charita", meno, iniciala: inicialy(meno), stit: orgZb.stit } : undefined;
  useZmenyDorovnani();
  const org = usePrispievatelia(refId);
  const ret = usePodporaRetazou(refId).filter((p) => p.poslane > 0 || p.bezi);
  const r: Riadok[] = [];
  // 1 · organizácia — vlastný vklad
  for (const p of org.filter((x) => x.vlastne && (x.suma ?? 0) > 0))
    r.push({ k: `o${p.stranka}`, druh: "org", meno: p.meno, ini: inicialy(p.meno), ...(orgZb && orgZb.meno === p.meno ? { logo: orgZb.obrazok, strana: strOrg(p.meno) } : {}), text: <>vložila vlastné peniaze · <span style={{ whiteSpace: "nowrap" }}>{eur(p.suma!)}</span></>, suma: p.suma!, farba: FARBA_ORG });
  // 2 · firmy — pevná suma (Prispela) a dorovnanie (dorovnáva)
  for (const p of org.filter((x) => !x.vlastne && (x.suma ?? 0) > 0))
    r.push({ k: `p${p.stranka}`, druh: "firma", meno: p.meno, ini: inicialy(p.meno), text: <>Prispela · <span style={{ whiteSpace: "nowrap" }}>{eur(p.suma!)}</span></>, suma: p.suma!, farba: FARBA_FIRMA, tap: () => otvorVerejnyProfil(p.stranka), tapText: "Pozri profil ›" });
  const dor = beziaceDorovnaniaNaCiel(refId);
  const firmy = new Map<string, number>();
  for (const d of dary) if (d.firma) firmy.set(d.firma, (firmy.get(d.firma) ?? 0) + d.suma);
  for (const d of dor) if (!firmy.has(d.firma)) firmy.set(d.firma, 0);
  for (const [meno, suma] of firmy) {
    const d = dor.find((x) => x.firma === meno);
    r.push({ k: `f${meno}`, druh: "firma", meno, logo: d?.firmaLogo, ini: inicialy(meno), text: <>dorovnáva {pomerText(d?.pomer ?? 1)} · zatiaľ <span style={{ whiteSpace: "nowrap" }}>{eur(suma)}</span></>, suma, farba: FARBA_FIRMA,
      ...(d?.firmaProfil ? { tap: () => otvorVerejnyProfil(d.firmaProfil!), tapText: "Pozri profil ›" } : {}) });
  }
  // 3 · Reťaz dobra
  ret.forEach((p: PodporaRetazou, i) => r.push({ k: `r${p.retaz}`, druh: "retaz", meno: p.meno, strana: p.robi, ini: inicialy(p.meno), logo: p.robi?.foto,
    text: <>Reťaz dobra · {p.pct}{" "}% · zatiaľ <span style={{ whiteSpace: "nowrap" }}>{eur(p.poslane)}</span></>, suma: p.poslane, farba: pasikyFialove(i),
    ...(p.stranka ? { tap: () => otvorVerejnyProfil(p.stranka!), tapText: "Pozri profil ›" } : {}) }));
  // 4 · skutky, ktoré zbierajú na zbierku
  const sk = new Map<string, number>();
  for (const d of dary) if (d.cezSkutok) sk.set(d.cezSkutok, (sk.get(d.cezSkutok) ?? 0) + d.suma);
  const o = objektZbierky(refId);
  for (const [nazov, suma] of sk) r.push({ k: `s${nazov}`, druh: "skutok", meno: orgZb?.meno ?? "Skutok", ini: inicialy(orgZb?.meno ?? "S"), logo: orgZb?.obrazok, strana: orgZb ? strOrg(orgZb.meno) : undefined, text: <>skutok {nazov} · zatiaľ <span style={{ whiteSpace: "nowrap" }}>{eur(suma)}</span></>, suma, farba: FARBA_SKUTOK,
    ...(o?.stranka ? { tap: () => otvorVerejnyProfil(o.stranka), tapText: "Pozri ›" } : {}) });
  return { riadky: r, cezSkutok: [...sk.values()].reduce((a, b) => a + b, 0) };
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
export function RiadkyKtoPrispel({ riadky }: { riadky: Riadok[] }) {
  if (!riadky.length) return null;
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
    {riadky.map((r) => {
      const v = VZHLAD[r.druh];
      const obsah = <>
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
