// KARTA 50 · §2 Správa farnosti — rovnaká kostra ako Správa charity (SpravaStranky), položky farnosti.
// Prototyp „Sprava farnosti.dc.html" (PC + mobil). Jeden program „Farnosť", jedna cena → žiadne zámky „od P…".
// Bez štítu (neutrálna strieborná linka), bez dokladov, lehôt a „doložené", bez dorovnania firmy.
// Dáta farnosti z modulu Viera (mock.ts, stav.ts — localStorage + zrkadlo naboz_stav). Čísla a zoznamy bez zdroja sú TESTOVACIE.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { pripojTestovaciuStranku } from "@/lib/stranka";
import { createPortal } from "react-dom";
import { useLayout } from "@/components/context";
import { toast } from "@/components/toast";
import { FARNOSTI, PREDVYPLNENY_ROZVRH, SVIATKY, predvoleneKostoly, type KostolFarnosti, type RozvrhOmsi } from "@/features/viera/mock";
import { nacitajStav, ulozStav } from "@/features/viera/stav";
import { nacitajSelfAdd, ulozSelfAdd } from "@/features/viera/UserOznamy";
import { PridatSheet } from "@/features/viera/Pridat";
import { Kalendar } from "@/features/viera/Kalendar";
import { VerejnyProfilVSprave } from "@/features/verejny-profil/VerejnyProfil";
import { cisloObjektu } from "@/lib/cisloObjektu";
import { SpravaZbierky, type ZbierkaNaSpravu } from "./SpravaZbierky";
import { TextovePolia, GaleriaEditor } from "./obsahZbierky";
import { VzhladStranky } from "./VzhladStranky";
import { TlacidloNastavenia } from "./spravaCasti";
import type { MediumZbierky } from "@/lib/novaZbierka";
import "@/styles/sprava.css";
import { SektorDarcuKontext } from "@/lib/darcovia";

type Sub = "prehlad" | "zbierky" | "omse" | "oznamy" | "ludia" | "penazenka" | "nastroje" | "profil" | "nast" | "zbierka";
const IC: Record<string, string> = {
  zbierky: "M12 21s-7-4.5-9-9.5C1.6 7.9 4 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.4 2.9 4 6.5-2 5-9 9.5-9 9.5z", omse: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4",
  oznamy: "M4 10v4h3l6 4V6L7 10zM17 9a4 4 0 0 1 0 6", ludia: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M16 5.5a3 3 0 0 1 0 5.5M18 15c1.6.6 2.6 2.4 3 5",
  penazenka: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4 2 4M16 13.5h.01", nastroje: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 17v3h-3",
  prehlad: "M3 13h4v7H3zM10 8h4v12h-4zM17 4h4v16h-4z", profil: "M4 20h4L18 10l-4-4L4 16zM13 7l4 4",
  nast: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  verejny: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};
const TIT: Record<Sub, string> = { prehlad: "Prehľad", zbierky: "Zbierky", omse: "Omše a kalendár", oznamy: "Oznamy", ludia: "Ľudia", penazenka: "Peňaženka", nastroje: "Nástroje", profil: "Upraviť profil", nast: "Nastavenia", zbierka: "Správa zbierky" };
const Ik = ({ d, s = 20, c = "var(--acc)", w = 1.9 }: { d: string; s?: number; c?: string; w?: number }) =>
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d={d} /></svg>;
const U = (id: string) => `url('https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=70') center/cover no-repeat #3a3530`;
const eur = (n: number) => `${n.toLocaleString("sk-SK")} €`;
const dnesText = () => { const s = new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long" }).format(new Date()); return s.charAt(0).toUpperCase() + s.slice(1); };

// ---- TESTOVACIE čísla Prehľadu (Dnes · 7 dní · 30 dní · Rok) — na serveri ich počíta server ----
const D: [string, string][][] = [
  [["146 €", "omšová zbierka v nedeľu"], ["21", "+4 oproti min. nedeli"], ["38 ľudí", "pravidelne"], ["1 240", "+3 dnes"]],
  [["612 €", "+9 % oproti min. týždňu"], ["74", "+6 %"], ["38 ľudí", "pravidelne"], ["1 240", "+11 za týždeň"]],
  [["2 380 €", "+5 % oproti min. mesiacu"], ["286", "+4 %"], ["38 ľudí", "pravidelne"], ["1 240", "+42 za mesiac"]],
  [["21 900 €", "od januára"], ["2 914", ""], ["38 ľudí", "pravidelne"], ["1 240", "+380 za rok"]],
];
// ---- TESTOVACIE zbierky farnosti (prototyp) — ťuk otvorí Správu zbierky bez záložky Doklady ----
interface ZbF { id: string; e: string; t: string; s: string; v: number; ciel: number; darcovia: number; konci?: number; ukoncena?: boolean; bg: string; stala?: boolean }
const ZBIERKY: ZbF[] = [
  { id: "farnost-organ", e: "FARSKÝ KOSTOL", t: "Oprava organu", s: "končí o 12 dní · 96 darcov", v: 4120, ciel: 12000, darcovia: 96, konci: 12, bg: U("photo-1507842217343-583bb7270b66") },
  { id: "farnost-pohreb-kovacova", e: "POHREB · ROZDELENÁ", t: "Rozlúčka s pani Annou Kováčovou", s: "rodina 90 % · farnosť 10 % · 41 darcov", v: 1260, ciel: 0, darcovia: 41, konci: 9, bg: U("photo-1490750967868-88aa4486c946") },
  { id: "farnost-omsa-5-10", e: "OMŠOVÁ ZBIERKA", t: "Nedeľa 5. 10. · 10:30", s: "z rozvrhu omší · 21 darov", v: 146, ciel: 0, darcovia: 21, ukoncena: true, bg: U("photo-1438032005730-c779502df39b") },
  { id: "farnost-misie", e: "MISIE", t: "Misijná nedeľa", s: "skončila 28. 9. · 64 darcov", v: 820, ciel: 0, darcovia: 64, ukoncena: true, bg: U("photo-1488521787991-ed7bbaae773c") },
];
const STALA: ZbF = { id: "farnost-podpora", e: "STÁLE · NA CHOD FARNOSTI", t: "Všeobecná podpora farnosti", s: "214 ľudí · 38 dáva mesačne", v: 5100, ciel: 0, darcovia: 214, bg: U("photo-1611859732483-07bd0d5e3c50"), stala: true };
const naSpravu = (z: ZbF, org: string): ZbierkaNaSpravu => ({ id: z.id, nazov: z.t, bg: z.bg, ciel: z.ciel, vyzbierane: z.v, darcovia: z.darcovia, zostavaDni: z.konci, ukoncena: z.ukoncena, bezPredlzenia: z.stala, organizacia: org, mesto: "Trenčín" });

const OSOBY: [string, string, string, number | null][] = [["JH", "Mgr. Jozef Halčin", "farár · hlavný správca", null], ["MK", "Mgr. Michal Kubiš", "kaplán", 1], ["EP", "Eva Petríková", "kostolníčka", 2], ["TR", "Tomáš Riečan", "organista", 3]];
const OZN_FARNOST: [string, string][] = [["Ohlášky · 28. nedeľa v Cezročnom období", "zverejnené v sobotu · 412 videní"], ["Zmena: v stredu 8. 10. ranná omša nebude", "oznámenie poslané sledujúcim"], ["Brigáda na fare · sobota 11. 10.", "9 prihlásených"]];
const OZN_FARNICI: [string, string][] = [["Prosba o modlitbu", "Mária S. · za zdravie mamy · pred 2 h"], ["Blahoželanie", "Rodina Hrušková · 50 rokov manželstva · včera"], ["Smútočné oznámenie", "Rodina Kováčová · pani Anna, pohreb v piatok 10:00 · pred 3 dňami"]];
const POPLATKY = [0, 1, 2, 5];
const VID: ["zobrazit" | "skryt" | "len-farar", string, string][] = [["zobrazit", "Zobraziť", "Návštevníci vidia, koľko sa vyzbieralo."], ["skryt", "Skryť", "Návštevníci vidia len, že zbierka beží."], ["len-farar", "Len farár", "Sumy vidí iba správca farnosti."]];
const PRIDAT: [string, string, string, { kat: string; uzol?: string }][] = [
  [IC.zbierky, "Zbierka farnosti", "na opravu, misie, pohreb alebo svadbu", { kat: "zbierka" }],
  [IC.omse, "Omša alebo udalosť", "z rozvrhu, sviatok, púť, brigáda", { kat: "udalost" }],
  [IC.oznamy, "Ohlášky", "nedeľné oznamy farnosti", { kat: "oznam", uzol: "o-ohlasky" }],
  [IC.oznamy, "Zmena programu", "omša nebude, iný čas · ide sledujúcim", { kat: "oznam", uzol: "o-zmena" }],
  [IC.ludia, "Smútočné oznámenie", "parte, čas pohrebu, zbierka pre rodinu", { kat: "oznam", uzol: "o-umrtie" }],
  [IC.ludia, "Dobrovoľníctvo", "brigáda, upratovanie, služba", { kat: "dobro", uzol: "d-brigada" }],
];
const DNI = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];
const OMSA_K: Record<string, string> = { ranna: "ranná", vecerna: "večerná", velka: "veľká omša", mimoriadna: "mimoriadna" };
const cas = (t: string) => t.replace(/^0(\d)/, "$1");

// ---- spoločné štýly (prototyp) ----
const karta: CSSProperties = { flex: "none", borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const kicker: CSSProperties = { flex: "none", fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: 4 };
const tlZ: CSSProperties = { flex: "none", minHeight: 44, padding: "0 14px", border: "none", borderRadius: 12, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "#fff" };
const odkaz: CSSProperties = { alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--green)" };

/** OPRAVY 159: Správa farnosti = sektor Viera (výpisy darov: „Bohu známy darca") */
export function SpravaFarnosti(p: Parameters<typeof SpravaFarnostiObsah>[0]) {
  return <SektorDarcuKontext.Provider value="viera"><SpravaFarnostiObsah {...p} /></SektorDarcuKontext.Provider>;
}

function SpravaFarnostiObsah({ onBack, strankaId, test: testPas }: { onBack: () => void; strankaId: string; /** testovací pás (OPRAVY 147, 153: dostane „Pozrieť profil ›") */ test?: (onPozriet: () => void) => ReactNode }) {
  const { desktop, wide } = useLayout();
  const tablet = wide && !desktop;
  const f = FARNOSTI[0]; // ukážková farnosť (Trenčín — mesto); v produkcii zo stránky
  const [sub, setSub] = useState<Sub>("prehlad");
  const [spat, setSpat] = useState<Sub>("prehlad");
  const [zb, setZb] = useState<ZbF | null>(null);
  const [ob, setOb] = useState(2);
  const [pridat, setPridat] = useState(false);
  const [start, setStart] = useState<{ kat: string; uzol?: string } | null>(null);
  const [kal, setKal] = useState(false);
  const [self, setSelf] = useState(() => nacitajSelfAdd(f.id));
  const [vid, setVid] = useState(() => nacitajStav<"zobrazit" | "skryt" | "len-farar">("viditelnost", f.id, "zobrazit"));
  const [pristup, setPristup] = useState<Record<number, boolean>>(() => nacitajStav("pristup", f.id, { 1: true }));
  const [zmaz, setZmaz] = useState<Record<number, boolean>>({});
  const profil0 = nacitajStav<{ popis?: string; popis2?: string; galeria?: MediumZbierky[]; kostoly?: KostolFarnosti[] }>("profil", f.id, {});
  const [popis, setPopis] = useState(profil0.popis ?? `<p>${f.popis.replace(/\s*Doklady .*$/, "")}</p>`);
  const [popis2, setPopis2] = useState(profil0.popis2 ?? "");
  const [media, setMedia] = useState<MediumZbierky[]>(profil0.galeria ?? []);
  const ulozProfil = (p: Partial<{ popis: string; popis2: string; galeria: MediumZbierky[] }>) => ulozStav("profil", f.id, { ...nacitajStav("profil", f.id, {}), ...p });
  const rozvrh = nacitajStav<RozvrhOmsi>("rozvrh", f.id, PREDVYPLNENY_ROZVRH);
  const kostoly = profil0.kostoly ?? predvoleneKostoly(f);

  const go = (k: Sub) => { setSpat(sub === "zbierka" ? spat : sub); setSub(k); setPridat(false); };
  const otvorZb = (z: ZbF) => { setZb(z); go("zbierka"); };
  // OPRAVY 154: verejný profil sa otvorí v okne NAD Správou (predtým sa otváral pod jej vrstvou a nebolo ho vidieť)
  const [verejnyOtv, setVerejnyOtv] = useState(false);
  useEffect(() => { void pripojTestovaciuStranku(strankaId); }, [strankaId]); // 0035: tester = správca testovacej stránky
  const verejny = () => setVerejnyOtv(true);
  const test = testPas?.(verejny);
  const verejnyEl = verejnyOtv ? <VerejnyProfilVSprave kluc={strankaId} onZavri={() => setVerejnyOtv(false)} /> : null;
  const mobil = !desktop;

  // ---------------- časti ----------------
  const zbRiadok = (z: ZbF) => {
    const st = z.stala ? null : z.ukoncena ? ["UKONČENÁ", "#5B5D53"] : ["BEŽÍ", "#4B7A35"];
    return (
      <button key={z.id} type="button" onClick={() => otvorZb(z)} style={{ display: "flex", alignItems: "center", gap: mobil ? 12 : 14, padding: mobil ? 10 : 12, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
        <span style={{ flex: "none", width: mobil ? 56 : 64, height: mobil ? 56 : 64, borderRadius: mobil ? 12 : 14, background: z.bg }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: mobil ? 10.5 : 11, fontWeight: 800, letterSpacing: mobil ? ".06em" : ".08em", color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z.e}</span>
          <b style={{ fontSize: mobil ? 15 : 16, lineHeight: 1.25 }}>{z.t}</b>
          <span style={{ fontSize: mobil ? 12 : 13, color: "var(--ink3)" }}>{z.s}</span>
          {!mobil && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{cisloObjektu("Z", z.id)}</span>}
          {mobil && st && <span style={{ alignSelf: "flex-start", height: 22, padding: "0 8px", borderRadius: 11, background: st[1], color: "#fff", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center" }}>{st[0]}</span>}
        </span>
        {mobil ? <b style={{ flex: "none", fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}>{eur(z.v)}</b> : <>
          <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <b style={{ fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{eur(z.v)}</b>
            {st && <span style={{ height: 24, padding: "0 9px", borderRadius: 12, background: st[1], color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{st[0]}</span>}
          </span>
          <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span></>}
      </button>);
  };
  const riadky = (r: { t: string; s: string; v?: string; b?: string; tap?: () => void; bBd?: string; bC?: string }[]) => (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {r.map((x, i) => (
        <div key={x.t + i} style={{ display: "flex", alignItems: "center", gap: mobil ? 10 : 12, minHeight: mobil ? 58 : 60, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: mobil ? 14 : 14.5 }}>{x.t}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{x.s}</span></span>
          {x.v && <b style={{ flex: "none", fontSize: mobil ? 13.5 : 14, fontVariantNumeric: "tabular-nums" }}>{x.v}</b>}
          {x.b && <button type="button" onClick={x.tap} style={{ flex: "none", minHeight: 44, padding: `0 ${mobil ? 12 : 14}px`, borderRadius: 12, border: x.bBd ?? "1px solid var(--cardBd)", background: x.bBd ? "transparent" : "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: mobil ? 13 : 13.5, fontWeight: 800, color: x.bC ?? "var(--ink)" }}>{x.b}</button>}
        </div>))}
    </section>);
  const prepinac = (on: boolean, onClick: () => void, label: string) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{ flex: "none", width: 52, height: 44, border: "none", background: "transparent", padding: "7px 0", cursor: "pointer", boxShadow: "none" }}>
      <span style={{ display: "block", position: "relative", width: 52, height: 30, borderRadius: 15, background: on ? "#4B7A35" : "var(--track)" }}>
        <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: 12, background: "#fff", transform: `translateX(${on ? 22 : 0}px)`, transition: "transform .2s ease" }} />
      </span>
    </button>);
  const segment = <T,>(vol: [T, string][], cur: T, set: (v: T) => void, h = 38) => (
    <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)", alignSelf: "flex-start", flexWrap: "wrap" }}>
      {vol.map(([k, t]) => { const on = k === cur; return <button key={String(k)} type="button" aria-pressed={on} onClick={() => set(k)} style={{ minHeight: Math.max(h, 44), padding: "0 14px", border: "none", borderRadius: 9, background: on ? "var(--seg)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, color: on ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>; })}
    </div>);
  const nadpis = (t: string, s: string) => !mobil && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12 }}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 22, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 13.5, color: "var(--ink3)" }}>{s}</span></span></div>;

  const ulohy = [["#C9A24A", "Ohlášky na nedeľu 12. 10.", "Ešte nie sú pripravené.", "Pripraviť"], ["#4E7D37", "2 nové oznamy od farníkov", "Zverejnené, pozrite si ich.", "Pozrieť"], ["#A34A2A", "Misijná nedeľa skončila", "Poďakujte darcom v ohláškach.", "Napísať"]];
  const trebaVybavit = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "0 12px" : "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
      {!mobil && <div style={{ display: "flex", alignItems: "baseline", gap: 10, paddingBottom: 6 }}><span style={{ fontSize: 17, fontWeight: 800 }}>Treba vybaviť</span><span style={{ fontSize: 13, color: "var(--ink3)" }}>{ulohy.length}</span></div>}
      {ulohy.map(([dot, t, s, b], i) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: mobil ? 10 : 14, minHeight: mobil ? 62 : 58, padding: mobil ? "9px 0" : 0, borderTop: mobil && !i ? "none" : "1px solid var(--cardBd)" }}>
          <span style={{ width: 9, height: 9, flex: "none", borderRadius: "50%", background: dot }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: mobil ? 14 : 14.5, lineHeight: 1.3 }}>{t}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{s}</span></span>
          <button type="button" onClick={() => go("oznamy")} style={tlZ}>{b}</button>
        </div>))}
    </section>);
  const cisla = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "12px 14px" : "14px 20px", display: "flex", flexDirection: "column", gap: mobil ? 6 : 8 }}>
      <div role="tablist" aria-label="Obdobie" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 2, padding: 3, borderRadius: 12, background: "var(--btn)" }}>
        {["Dnes", "7 dní", "30 dní", "Rok"].map((t, i) => <button key={t} type="button" role="tab" aria-selected={ob === i} onClick={() => setOb(i)} style={{ height: 44, border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: ob === i ? 800 : 700, background: ob === i ? "var(--seg)" : "transparent", color: ob === i ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mobil ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", columnGap: mobil ? 14 : 12, rowGap: mobil ? 0 : 12 }}>
        {["Vyzbierané", "Počet darov", "Pravidelná podpora", "Sledujúci"].map((k, i) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: mobil ? 0 : 2, padding: mobil ? "8px 0" : "6px 0 0", borderTop: mobil && i > 1 ? "1px solid var(--cardBd)" : "none" }}>
            <span style={{ fontSize: mobil ? 12 : 12.5, fontWeight: 700, color: "var(--ink3)" }}>{k}</span>
            <b style={{ fontSize: mobil ? 19 : 22, fontVariantNumeric: "tabular-nums", color: i === 0 ? "var(--gInk)" : "var(--ink)" }}>{D[ob][i][0]}</b>
            <span style={{ fontSize: mobil ? 11 : 12, color: "var(--ink3)" }}>{D[ob][i][1]}</span>
          </div>))}
      </div>
    </section>);
  // Dnes a zajtra — z rozvrhu omší (mock.ts / uložený rozvrh)
  const den = new Date().getDay();
  const farsky = kostoly[0]?.nazov ? "farský kostol" : f.obec;
  const dnes = [0, 1].flatMap((o) => (rozvrh.weeklyPattern.find((d) => d.dayOfWeek === (den + o) % 7)?.masses ?? []).map((m) => ({ cas: cas(m.time), t: "Svätá omša", s: `${o ? "zajtra" : "dnes"} · ${farsky}` })));
  const dnesKarta = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "0 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
      {!mobil && <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, paddingBottom: 6 }}><span style={{ fontSize: 17, fontWeight: 800 }}>Dnes a zajtra</span><button type="button" onClick={() => go("omse")} style={{ ...odkaz, minHeight: 32 }}>Rozvrh ›</button></div>}
      {dnes.length ? dnes.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 54, borderTop: mobil && !i ? "none" : "1px solid var(--cardBd)" }}>
          <b style={{ flex: "none", width: mobil ? 54 : 62, fontSize: mobil ? 16 : 17, fontVariantNumeric: "tabular-nums" }}>{d.cas}</b>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: mobil ? 1 : 2 }}><b style={{ fontSize: mobil ? 13.5 : 14 }}>{d.t}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{d.s}</span></span>
        </div>)) : <span style={{ padding: "14px 0", fontSize: 13.5, color: "var(--ink3)", borderTop: mobil ? "none" : "1px solid var(--cardBd)" }}>Dnes ani zajtra nie je v rozvrhu omša.</span>}
    </section>);
  const bezia = ZBIERKY.filter((z) => !z.ukoncena);

  const prehlad = mobil ? <>
    <button type="button" onClick={() => go("profil")} style={{ flex: "none", borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
      <span style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: `url('${f.foto}') center/cover no-repeat var(--card)` }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 14, color: "var(--cuInk)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.nazov}</b><span style={{ fontSize: 12, fontWeight: 700, color: "var(--cuInk2)" }}>Farnosť · {f.skratka} · Upraviť profil ›</span></span>
    </button>
    <div style={{ flex: "none", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {([["verejny", "Verejný profil"], ["zbierky", "Zbierky"], ["omse", "Omše"], ["oznamy", "Oznamy"], ["ludia", "Ľudia"], ["penazenka", "Peňaženka"]] as [string, string][]).map(([k, t]) => { const vp = k === "verejny"; return (
        <button key={k} type="button" onClick={() => (vp ? verejny() : go(k as Sub))} style={{ position: "relative", minHeight: 76, padding: "8px 4px", borderRadius: 16, border: `1px solid ${vp ? "var(--tBd)" : "var(--cardBd)"}`, background: vp ? "var(--tBg)" : "var(--card)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit", boxShadow: "none" }}>
          <Ik d={IC[k]} s={22} c={vp ? "var(--tInk)" : "var(--acc)"} />
          <span style={{ fontSize: 12.5, lineHeight: 1.2, fontWeight: 800, textAlign: "center", color: vp ? "var(--tInk)" : "var(--ink)" }}>{t}</span>
          {k === "oznamy" && <span style={{ position: "absolute", top: 6, right: 6, minWidth: 20, height: 20, padding: "0 5px", borderRadius: 10, background: "#4B7A35", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>}
        </button>); })}
    </div>
    <span style={{ ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" }}>TREBA VYBAVIŤ · {ulohy.length}</span>{trebaVybavit}
    {cisla}
    <span style={{ ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" }}>DNES A ZAJTRA</span>{dnesKarta}
    <span style={{ ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" }}>BEŽIACE ZBIERKY</span>{bezia.map(zbRiadok)}
  </> : (
    <div style={{ flex: "none", display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {trebaVybavit}{cisla}
        <span style={kicker}>BEŽIACE ZBIERKY</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{bezia.map(zbRiadok)}</div>
      </div>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {dnesKarta}
        <section style={{ ...karta, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Oznamy od farníkov</span>
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>2 nové za týždeň. Zverejnia sa samy, vy ich môžete upraviť alebo zmazať.</span>
          <button type="button" onClick={() => go("oznamy")} style={odkaz}>Pozrieť ›</button>
        </section>
      </div>
    </div>);

  const zbierky = <>
    {nadpis("Zbierky", "Ťuk na riadok otvorí Správu zbierky, rovnakú ako pri charite")}
    <span style={mobil ? { ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" } : kicker}>{mobil ? "VŠEOBECNÁ PODPORA · STÁLE" : "VŠEOBECNÁ PODPORA FARNOSTI · STÁLE"}</span>
    {zbRiadok(STALA)}
    <span style={mobil ? { ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" } : kicker}>ZBIERKY</span>
    <div style={{ display: "flex", flexDirection: "column", gap: mobil ? 12 : 10 }}>{ZBIERKY.map(zbRiadok)}</div>
    {!mobil && <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Omšová zbierka vzniká sama z rozvrhu omší. Pri pohrebe a svadbe ide dar rodine a časť farnosti podľa rozdelenia, ktoré nastavíte.</span>}
  </>;

  const rozvrhKarta = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {[1, 2, 3, 4, 5, 6, 0].map((d, i) => { const o = rozvrh.weeklyPattern.find((x) => x.dayOfWeek === d)?.masses ?? []; return (
        <div key={d} style={mobil ? { display: "flex", flexDirection: "column", gap: 6, padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" } : { display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "6px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <b style={{ flex: "none", width: mobil ? undefined : 92, fontSize: mobil ? 13.5 : 14, color: d === 0 ? "var(--gInk)" : "var(--ink)" }}>{DNI[d]}</b>
          <span style={{ flex: 1, minWidth: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {o.length ? o.map((m, j) => <span key={j} style={{ height: mobil ? 30 : 32, padding: `0 ${mobil ? 9 : 10}px`, borderRadius: mobil ? 9 : 10, background: m.type === "velka" ? "var(--gSoft)" : "var(--field)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", gap: mobil ? 5 : 6, fontSize: mobil ? 12.5 : 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{cas(m.time)}<span style={{ fontWeight: 600, color: "var(--ink3)" }}>{OMSA_K[m.type]}</span></span>)
              : <span style={{ fontSize: 13, color: "var(--ink3)" }}>bez omše</span>}
          </span>
        </div>); })}
    </section>);
  const mesDen = (() => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const sviatky = [...SVIATKY.filter((s) => s.md >= mesDen), ...SVIATKY.filter((s) => s.md < mesDen)].slice(0, 2);
  const kostolyKarta = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
      {!mobil && <span style={{ fontSize: 15, fontWeight: 800, paddingBottom: 6 }}>Kostoly farnosti</span>}
      {kostoly.map((k, i) => <div key={k.nazov} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 0", borderTop: mobil && !i ? "none" : "1px solid var(--cardBd)" }}><b style={{ fontSize: 14 }}>{k.nazov}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{[i === 0 ? "farský" : "", k.adresa, k.casyOmsi].filter(Boolean).join(" · ")}</span></div>)}
      <button type="button" onClick={() => setKal(true)} style={odkaz}>+ Pridať kostol</button>
    </section>);
  const omse = mobil ? <>{rozvrhKarta}<span style={{ ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" }}>KOSTOLY</span>{kostolyKarta}</> : <>
    {nadpis("Omše a kalendár", "Rozvrh platí každý týždeň. Zmenu pre jeden deň pridáte cez + Pridať → Zmena programu.")}
    <div style={{ flex: "none", display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
      {rozvrhKarta}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {kostolyKarta}
        <section style={{ ...karta, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Najbližšie sviatky</span>
          {sviatky.map((s) => <span key={s.md} style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>{s.nazov} · {Number(s.md.slice(3))}. {Number(s.md.slice(0, 2))}.{s.kind === "prikazany" ? " · prikázaný sviatok" : ""}</span>)}
        </section>
      </div>
    </div></>;

  const zmenSelf = (p: Partial<typeof self>) => { const n = { ...self, ...p }; setSelf(n); ulozSelfAdd(f.id, n); };
  const selfKarta = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: mobil ? 10 : 12 }}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: mobil ? 14 : 15 }}>Farníci môžu pridávať oznamy</b>
          <span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{mobil ? (self.on ? "Zverejnia sa hneď, vy ich môžete zmazať" : "Vypnuté, oznamy pridáva len farnosť") : "Zverejnia sa hneď, vy ich môžete zmazať. Prosba o modlitbu a smútočné oznámenie sú vždy zadarmo."}</span>
        </span>
        {prepinac(self.on, () => zmenSelf({ on: !self.on }), "Farníci môžu pridávať oznamy")}
      </div>
      {self.on && <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>Poplatok za oznam</span>
        {segment(POPLATKY.map((p) => [p, p ? `${p} €` : "Zadarmo"] as [number, string]), POPLATKY.includes(self.poplatok) ? self.poplatok : 0, (p) => zmenSelf({ poplatok: p }), 36)}
      </div>}
    </section>);
  const oznamy = <>
    {nadpis("Oznamy", "Ohlášky, oznamy farnosti a oznamy od farníkov")}
    {riadky(OZN_FARNOST.map(([t, s]) => ({ t, s, b: "Upraviť", tap: () => setPridat(true) })))}
    <span style={mobil ? { ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" } : kicker}>OD FARNÍKOV</span>
    {selfKarta}
    {riadky(OZN_FARNICI.map(([t, s], i) => { const z = !!zmaz[i]; return { t, s: z ? "zmazané · farník dostal správu" : s, b: z ? "Obnoviť" : "Zmazať", bBd: `1.5px solid ${z ? "var(--cardBd)" : "var(--red, #8E3B2F)"}`, bC: z ? "var(--ink2)" : "#C0573F", tap: () => setZmaz((q) => ({ ...q, [i]: !q[i] })) }; }))}
  </>;

  const zmenPristup = (k: number) => setPristup((p) => { const n = { ...p, [k]: !p[k] }; ulozStav("pristup", f.id, n); return n; });
  const ludia = <>
    {nadpis("Ľudia", "Farár, osoby farnosti, sledujúci a darcovia")}
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {OSOBY.map(([i, m, r, k], j) => { const on = k === null || !!pristup[k]; const pT = k === null ? "vždy má prístup" : on ? "prístup k Správe" : "len na profile"; return (
        <div key={m} style={{ display: "flex", alignItems: "center", gap: mobil ? 10 : 12, minHeight: mobil ? 62 : 64, padding: "8px 0", borderTop: j ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: "none", width: mobil ? 40 : 44, height: mobil ? 40 : 44, borderRadius: "50%", background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: mobil ? 13 : 14, fontWeight: 800, color: "var(--ink2)" }}>{i}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: mobil ? 14 : 14.5 }}>{m}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{mobil ? `${r} · ${pT}` : r}</span></span>
          {!mobil && <span style={{ flex: "none", fontSize: 12.5, color: "var(--ink3)" }}>{pT}</span>}
          {k !== null && prepinac(on, () => zmenPristup(k), `Prístup k Správe · ${m}`)}
        </div>); })}
      {!mobil && <div style={{ padding: "10px 0 12px", borderTop: "1px solid var(--cardBd)", fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>+ Pridať osobu</div>}
    </section>
    {!mobil && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Na profile sa ukážu všetci. Prístup k Správe má len ten, komu ho zapnete. To sa verejne neukazuje.</span>}
    {riadky([["Sledujúci", "dostávajú ohlášky a oznamy", "1 240"], ["Darcovia a sumy", "mená len so súhlasom darcu", "214"], ["Pravidelná podpora", "mesačne, kartou alebo SEPA", "38 ľudí"], ["Dobrovoľníci", "brigády, upratovanie, spev", "27"]].map(([t, s, v]) => ({ t, s, v })))}
  </>;
  const penazenka = <>
    {nadpis("Peňaženka", "Dary idú priamo na účet farnosti, DEED peniaze nedrží")}
    {riadky([["Prišlo tento mesiac", "286 darov · omše, zbierky, podpora", "2 380 €"], ["Čaká na výplatu", "do 2 pracovných dní", "412 €"], ["Výplaty na účet", "posledná 2. 10. 2026", "1 960 €"], ["Dary v EURC", "prijímanie zapnuté", "0,0 EURC"]].map(([t, s, v]) => ({ t, s, v })))}
  </>;
  const pripravujeme = () => toast("Pripravujeme");
  const viditKarta = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 15 }}>Viditeľnosť súm zbierok</b>
      <span style={{ fontSize: 13, color: "var(--ink3)" }}>Čo vidia návštevníci profilu</span>
      {segment(VID.map(([k, t]) => [k, t] as [typeof vid, string]), vid, (v) => { setVid(v); ulozStav("viditelnost", f.id, v); }, 40)}
      <span style={{ fontSize: 13, color: "var(--ink2)" }}>{VID.find((x) => x[0] === vid)?.[2]}</span>
    </section>);
  const nastrojeL = riadky([["QR na tlač do kostola", "pokladnička, nástenka, lavice · sken otvorí dar", "Tlačiť"], ["Štatistiky", "dary podľa omší, zbierok a mesiacov", "Otvoriť"], ["Ročný výpis", "podklad pre farskú radu a ekonómov", "Stiahnuť"]].map(([t, s, b]) => ({ t, s, b, tap: pripravujeme })));
  const nastaveniaL = riadky([["Vzhľad a prístupnosť", "téma, jazyk, veľkosť písma"], ["Oznámenia", "nový dar, oznam od farníka"], ["Príjem darov", "EURC, transparentný účet"], ["Správcovia", "kto má prístup k Správe farnosti"], ["Program a predplatné", "program Farnosť · jedna cena · faktúry"]].map(([t, s]) => ({ t, s })));
  const nastroje = <>{nadpis("Nástroje", "QR do kostola, viditeľnosť súm, výkazy")}{viditKarta}{nastrojeL}</>;
  const nastavenia = <>{nadpis("Nastavenia", "Ako pri charite, bez programov a faktúr za vyššie programy")}{nastaveniaL}</>;

  // Upraviť profil: Vzhľad stránky (prvý) · O farnosti (TextovePolia) · Fotky a video (GaleriaEditor s popisom) · kontakt · účet
  const profilL = riadky([
    { t: "Farár a osoby", s: "v časti Ľudia", b: "Otvoriť", tap: () => go("ludia") },
    { t: "Kostoly a časy omší", s: "v časti Omše a kalendár", b: "Otvoriť", tap: () => go("omse") },
    { t: "Kontakt", s: [f.kontakt?.adresa?.split(",")[0], f.kontakt?.email].filter(Boolean).join(" · "), b: "Upraviť", tap: pripravujeme },
    { t: "Účet farnosti", s: "zmena len na požiadanie s dôvodom", b: "Požiadať", tap: pripravujeme },
  ]);
  const vzhlad = <VzhladStranky strankaId={strankaId} zadarmo={false} kto="farníci" onPozriet={verejny} />;
  const onasKarta = (
    <section style={{ ...karta, padding: mobil ? "14px 16px" : "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 15, fontWeight: 800 }}>O farnosti</span>
      <TextovePolia popis={popis} popis2={popis2} ph={mobil} onPopis={(h) => { setPopis(h); ulozProfil({ popis: h }); }} onPopis2={(h) => { setPopis2(h); ulozProfil({ popis2: h }); }} popisHlavneho="Toto farníci uvidia na profile hneď. Najviac 12 riadkov." />
    </section>);
  const galeria = <GaleriaEditor media={media} onMedia={(m) => { setMedia(m); ulozProfil({ galeria: m }); }} ph={mobil} nadpis="Fotky a video" dovetok="" popisNapoveda="Popis fotky (nepovinné)" />;
  const profil = <>
    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12 }}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 22, fontWeight: 800 }}>Upraviť profil farnosti</span><span style={{ display: "block", fontSize: 13.5, color: "var(--ink3)" }}>Ukladá sa samo</span></span></div>
    {mobil ? <>{vzhlad}{onasKarta}{galeria}{profilL}</> : (
      <div style={{ flex: "none", display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>{vzhlad}{onasKarta}{galeria}</div>
        {profilL}
      </div>)}
  </>;

  const zbierkaEl = zb && <SpravaZbierky key={zb.id} z={naSpravu(zb, f.nazov)} tier={4} bezDokladov mobil={mobil} toast={toast} onZbierky={() => setSub("zbierky")} />;
  const obsah: Record<Sub, ReactNode> = { prehlad, zbierky, omse, oznamy, ludia, penazenka, nastroje, profil, zbierka: zbierkaEl, nast: mobil ? <>
    <span style={{ ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" }}>NÁSTROJE</span>{viditKarta}{nastrojeL}
    <span style={{ ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" }}>NASTAVENIA</span>{nastaveniaL}
  </> : nastavenia };

  // ---------------- Pridať ----------------
  const zoznamPridat = PRIDAT.map(([d, t, s, st]) => (
    <button key={t} type="button" onClick={() => { setPridat(false); setStart(st); }} style={{ minHeight: mobil ? 56 : 60, padding: mobil ? "6px 12px" : "8px 12px", borderRadius: 15, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
      <span style={{ width: mobil ? 38 : 40, height: mobil ? 38 : 40, flex: "none", borderRadius: 11, background: "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={d} s={mobil ? 19 : 20} c="var(--gInk)" /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: mobil ? 14.5 : 15, color: "var(--ink)" }}>{t}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{s}</span></span>
    </button>));
  const vrstvy = <>
    {verejnyEl}
    {pridat && createPortal(<div className="sprava-charity" data-stit="silver" style={{ minHeight: 0, background: "transparent" }}>
      <div onClick={() => setPridat(false)} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(20,17,11,.45)" }} />
      <div role="dialog" aria-modal="true" aria-label="Pridať do farnosti" style={mobil
        ? { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 141, borderRadius: "24px 24px 0 0", background: "var(--panel)", padding: "10px 14px calc(30px + env(safe-area-inset-bottom, 0px))", display: "flex", flexDirection: "column", gap: 8, color: "var(--ink)" }
        : { position: "fixed", top: 80, left: "50%", zIndex: 141, width: 520, marginLeft: -260, borderRadius: 24, background: "var(--panel)", border: "1px solid var(--cardBd)", padding: 18, display: "flex", flexDirection: "column", gap: 8, color: "var(--ink)" }}>
        {mobil ? <><span aria-hidden="true" style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, background: "var(--cardBd)" }} /><b style={{ fontSize: 17, padding: "4px 2px" }}>Pridať do farnosti</b></>
          : <div style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ flex: 1, fontSize: 18 }}>Pridať do farnosti</b><button type="button" onClick={() => setPridat(false)} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontSize: 18, color: "var(--ink2)", boxShadow: "none" }}>×</button></div>}
        {zoznamPridat}
      </div>
    </div>, document.body)}
    {start && createPortal(<div style={{ position: "fixed", inset: 0, zIndex: 150 }}><PridatSheet farar farnost={f} start={start} toast={toast} onClose={() => setStart(null)} /></div>, document.body)}
    {kal && createPortal(<div style={{ position: "fixed", inset: 0, zIndex: 150, overflowY: "auto", background: "var(--c-bg)" }}><Kalendar farnost={f} toast={toast} onBack={() => setKal(false)} /></div>, document.body)}
  </>;

  const titul = sub === "zbierka" && zb ? zb.t : TIT[sub];
  const spatTl = (onClick: () => void) => <button type="button" onClick={onClick} aria-label="Späť" style={{ flex: "none", height: 44, padding: mobil ? "0 12px 0 8px" : "0 14px 0 8px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: mobil ? 14 : 15, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>‹ Späť</button>;
  const nazpat = () => { if (sub === "zbierka") setSub(spat); else if (sub === "prehlad") onBack(); else setSub("prehlad"); };

  // ================= PC =================
  if (desktop) {
    const nav: Sub[] = ["prehlad", "zbierky", "omse", "oznamy", "ludia", "penazenka", "nastroje", "profil"]; // Nastavenia ako tlačidlo pod Verejným profilom (OPRAVY 157)
    const aktivna = sub === "zbierka" ? "zbierky" : sub;
    return (
      <div className="sprava-charity" data-stit="silver" style={{ minHeight: "100dvh", boxSizing: "border-box", padding: "20px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        <aside style={{ width: 244, flex: "none", display: "flex", flexDirection: "column", gap: 12, paddingRight: 16, borderRight: "2px solid", borderImage: "var(--metal) 1", position: "sticky", top: 20, alignSelf: "flex-start", minHeight: "calc(100dvh - 40px)", boxSizing: "border-box" }}>
          <div style={{ flex: "none", borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: `url('${f.foto}') center/cover no-repeat var(--card)`, flex: "none" }} />
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 14.5, fontWeight: 800, lineHeight: 1.25, color: "var(--cuInk)" }}>{f.nazov}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--cuInk2)", whiteSpace: "nowrap" }}>Farnosť · {f.skratka}</span></span>
          </div>
          <button type="button" onClick={verejny} style={{ flex: "none", height: 56, padding: "0 14px", borderRadius: 18, background: "var(--tBg)", border: "1px solid var(--tBd)", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
            <Ik d={IC.verejny} c="var(--tInk)" />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 800, color: "var(--tInk)" }}>Verejný profil</span><span style={{ fontSize: 12, color: "var(--tInk2)" }}>ako ho vidia farníci</span></span>
            <span aria-hidden="true" style={{ fontSize: 18, color: "var(--tInk)" }}>›</span>
          </button>
          <TlacidloNastavenia on={aktivna === "nast"} onClick={() => go("nast")} />
          <nav aria-label="Správa farnosti" style={{ flex: "none", display: "flex", flexDirection: "column", gap: 2, padding: "4px 0" }}>
            {nav.map((k) => { const on = aktivna === k; return (
              <button key={k} type="button" onClick={() => go(k)} aria-current={on ? "page" : undefined} className={on ? undefined : "sc-hov"} style={{ height: 48, padding: "0 14px", border: "none", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", boxShadow: "none", background: on ? "var(--accSoft)" : "transparent", color: on || k === "prehlad" ? "var(--ink)" : "var(--ink2)" }}>
                <Ik d={IC[k]} /><span style={{ flex: 1, fontSize: 15, fontWeight: on ? 800 : 600, whiteSpace: "nowrap" }}>{TIT[k]}</span>
                {k === "oznamy" && <span aria-label="2 nové" style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: "#4B7A35", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>}
              </button>); })}
          </nav>
          <div style={{ flex: "none", marginTop: "auto", padding: "12px 14px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>PROGRAM FARNOSŤ</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--ink2)" }}>Jedna cena, všetko v ňom. Žiadne vyššie programy.</span>
          </div>
        </aside>
        <div style={{ flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 1600, margin: "0 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 14, paddingBottom: 40 }}>
            <header style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat" }}>
              {spatTl(nazpat)}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titul}</h1>
                <span style={{ fontSize: 13, color: "var(--ink3)" }}>{dnesText()}</span>
              </span>
              <button type="button" onClick={() => setPridat(true)} style={{ ...tlZ, height: 44, padding: "0 18px", borderRadius: 13, fontSize: 15 }}>+ Pridať</button>
            </header>
            {test}
            <div key={sub + (zb?.id ?? "")} style={{ display: "flex", flexDirection: "column", gap: 14, animation: "spravaFade .2s ease both" }}>{obsah[sub]}</div>
          </main>
        </div>
        {vrstvy}
      </div>);
  }

  // ================= MOBIL a TABLET =================
  const mTitul = sub === "prehlad" ? "Prehľad" : sub === "nast" ? "Nástroje a nastavenia" : titul;
  return (
    <div className="sprava-charity" data-stit="silver" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 5, flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat, var(--bg)" }}>
        {spatTl(nazpat)}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <b style={{ maxWidth: "100%", fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mTitul}</b>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>{dnesText()}</span>
        </span>
        <button type="button" onClick={() => go("nast")} aria-label="Nástroje a nastavenia" style={{ flex: "none", width: 44, height: 44, borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" }}><Ik d={IC.nast} /></button>
        <button type="button" onClick={() => setPridat(true)} aria-label="Pridať" style={{ flex: "none", width: 44, height: 44, border: "none", borderRadius: 13, background: "#4B7A35", cursor: "pointer", color: "#fff", fontSize: 22, fontWeight: 700, boxShadow: "none" }}>+</button>
      </header>
      <div key={sub + (zb?.id ?? "")} style={{ padding: "12px 14px 28px", display: "flex", flexDirection: "column", gap: 12, animation: "spravaFade .2s ease both", width: "100%", maxWidth: tablet ? 880 : undefined, margin: tablet ? "0 auto" : undefined, boxSizing: "border-box" }}>
        {obsah[sub]}
        {test}
      </div>
      {vrstvy}
    </div>);
}
