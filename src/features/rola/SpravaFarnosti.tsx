// KARTA 50 · §2 Správa farnosti — rovnaká kostra ako Správa charity (SpravaStranky), položky farnosti.
// KARTA 56D: Správa od prvého príchodu — všetky funkcie, žiadne ukážkové dáta (prototyp „Sprava farnosti - prvy prichod").
// Profil, logo a percento = profil_stranky (ako charita), pripnuté = sprava_piny, hlavná zbierka = profil_stranky.centralna.
// Omše, oznamy a nastavenia farnosti z modulu Viera (stav.ts — localStorage + zrkadlo naboz_stav) pod kľúčom stránky.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { pripojTestovaciuStranku } from "@/lib/stranka";
import { createPortal } from "react-dom";
import { useLayout } from "@/components/context";
import { toast } from "@/components/toast";
import { type KostolFarnosti } from "@/features/viera/mock";
import { nacitajStav, ulozStav } from "@/features/viera/stav";
import { odFarnikov, pocetyOdVeriacich, useOdFarnikov, useCerstveOdFarnikov } from "@/lib/odFarnikov";
import { OdVeriacich } from "./OdVeriacich";
import { OmseKalendar, TyzdenVPrehlade } from "./OmseKalendar";
import { PrihovorNaStranke } from "@/features/verejny-profil/PrihovorNaStranke";
import { OznamyFarnosti } from "./OznamyFarnosti";
import { nedelneOmse } from "@/lib/kalendarFarnosti";
import { NahladFarnosti, nahladPopis } from "./NahladFarnosti";
import { useVzhlad } from "@/lib/vzhladStranky";
import { VzhladStranky } from "./VzhladStranky";
import { TlacidloNastavenia, LogoKarty, QrKarta } from "./spravaCasti";
import { odkazQrStranky } from "@/features/verejny-profil/otvor";
import { UpravitProfilCharity } from "./UpravitProfilCharity";
import { NovaZbierka } from "./NovaZbierka";
import { SpravaZbierkyFarnosti, stitokZbierkyF, fotoZbierky, rozdelenieZbierkyF } from "./SpravaZbierkyFarnosti";
import { ZbierkaSOverovatelom, type SpatZbierky } from "./ZbierkaPreVeriacich";
import { cielCislo, nacitajZbierkyStranky, useZmenyZbierok, zbierkyStrankyZPamate, type SpustenaZbierka } from "@/lib/novaZbierka";
import "@/styles/sprava.css";
import { SektorDarcuKontext, darcoviaPre, nastavCiste, sucetDarov, useZmenyDarov } from "@/lib/darcovia";
import { SpravaCentralnej } from "./SpravaCentralnej";
import { centralnaZPamate, hlavnaBezi, nacitajCentralnuZbierku, nazovHlavnej, useZmenyCentralnej } from "@/lib/centralnaZbierka";
import { suhrnHlavnej, useOmsoveOkno, menaOkna, doZatvorenia, zavriTyzdenTest } from "@/lib/omsoveOkno";
import { TESTOVACIA } from "@/lib/testovacia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { najdiTestProfil } from "@/lib/testProfily";
import { cistyNazov, nacitajProfil, profilZPamate, uplnostProfilu, type ProfilStranky } from "@/lib/profilStranky";
import { nacitajPiny, pinyZPamate, ulozPiny } from "@/lib/spravaPiny";

type Sub = "prehlad" | "zbierky" | "omse" | "oznamy" | "veriaci" | "ludia" | "filialky" | "penazenka" | "nastroje" | "profil" | "nast" | "hlavna" | "nahlad" | "zbierka" | "nova";
/** sekcie, ktoré sa dajú pripnúť v Prehľade (najviac 6) */
type Pin = Exclude<Sub, "prehlad" | "hlavna" | "nahlad" | "zbierka" | "nova">;
const PINY: Pin[] = ["zbierky", "omse", "oznamy", "veriaci", "ludia", "filialky", "penazenka", "nastroje", "profil", "nast"];
const PIN_MAX_F = 6;
const IC: Record<string, string> = {
  zbierky: "M12 21s-7-4.5-9-9.5C1.6 7.9 4 5 7 5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3 0 5.4 2.9 4 6.5-2 5-9 9.5-9 9.5z", omse: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4",
  oznamy: "M4 10v4h3l6 4V6L7 10zM17 9a4 4 0 0 1 0 6", ludia: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M16 5.5a3 3 0 0 1 0 5.5M18 15c1.6.6 2.6 2.4 3 5",
  penazenka: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4 2 4M16 13.5h.01", nastroje: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 17v3h-3",
  prehlad: "M3 13h4v7H3zM10 8h4v12h-4zM17 4h4v16h-4z", profil: "M4 20h4L18 10l-4-4L4 16zM13 7l4 4",
  nast: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
  verejny: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  veriaci: "M4 5h16v11H9l-5 4zM9 10h6", filialky: "M3 21h18M6 21V11l6-5 6 5v10M12 3v3M10 4.5h4M10 21v-5h4v5", stat: "M3 13h4v7H3zM10 8h4v12h-4zM17 4h4v16h-4z",
  pin: "M9 4h6l-1 6 3 3H7l3-3zM12 13v7", dole: "M6 9l6 6 6-6", kostol: "M4 21h16M5 21V10M19 21V10M9 21V10M15 21V10M3 10l9-6 9 6z",
};
const TIT: Record<Sub, string> = { prehlad: "Prehľad", zbierky: "Zbierky", omse: "Omše a kalendár", oznamy: "Oznamy", veriaci: "Od veriacich", ludia: "Ľudia", filialky: "Filiálky", penazenka: "Peňaženka", nastroje: "Nástroje a štatistiky", profil: "Upraviť profil", nast: "Nastavenia", hlavna: "Hlavná zbierka", nahlad: "Náhľad profilu", zbierka: "Správa zbierky", nova: "Nová zbierka" };
const Ik = ({ d, s = 20, c = "var(--acc)", w = 1.9, style }: { d: string; s?: number; c?: string; w?: number; style?: CSSProperties }) =>
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", ...style }}><path d={d} /></svg>;
const eur = (n: number) => `${n.toLocaleString("sk-SK")} €`;
/** začiatok obdobia Prehľadu: Dnes · 7 dní · 30 dní · Rok (od 1. januára) */
function zaciatokObdobia(ob: number): number {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return [t.getTime(), Date.now() - 7 * 86400000, Date.now() - 30 * 86400000, new Date(new Date().getFullYear(), 0, 1).getTime()][ob];
}
const zaciatokMesiaca = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const dnesText = () => { const s = new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long" }).format(new Date()); return s.charAt(0).toUpperCase() + s.slice(1); };
const VID: ["zobrazit" | "skryt" | "len-farar", string, string][] = [["zobrazit", "Zobraziť", "Návštevníci vidia, koľko sa vyzbieralo."], ["skryt", "Skryť", "Návštevníci vidia len, že zbierka beží."], ["len-farar", "Len farár", "Sumy vidí iba správca farnosti."]];
/** + Pridať mimo Zbierok, Oznamov a Omší (KARTA 56D §2) */
type Akcia = "zbierka" | "oznam" | "zmena";
const PRIDAT: [string, string, string, Akcia][] = [
  [IC.zbierky, "Zbierka", "zbierka farnosti alebo zbierka pre veriacich (pohreb, svadba)", "zbierka"],
  [IC.oznamy, "Oznam", "krátky oznam, udalosť, parte · ukáže sa na profile v Oznamoch", "oznam"],
  [IC.omse, "Zmena omše", "omša nebude alebo bude v inom čase · ťuknite na deň v kalendári", "zmena"],
];
const PRIDAT_T: Partial<Record<Sub, string>> = { zbierky: "+ Pridať zbierku", oznamy: "+ Pridať oznam" };
/** kde sa + Pridať neukazuje (úpravy, náhľad, Omše) */
const BEZ_PRIDAT: Sub[] = ["profil", "hlavna", "nahlad", "zbierka", "nova", "omse"];
/** prvý príchod: jeden kostol z registrácie (KARTA 56F: kým nie sú filiálky, upravuje sa len on) */
const PRVY_KOSTOL: KostolFarnosti[] = [{ nazov: "Váš kostol", adresa: "", casyOmsi: "" }];

// ---- spoločné štýly (prototyp) ----
const karta: CSSProperties = { flex: "none", borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const kicker: CSSProperties = { flex: "none", fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: 4 };
const tlZ: CSSProperties = { flex: "none", minHeight: 44, padding: "0 14px", border: "none", borderRadius: 12, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "#fff" };
const odkaz: CSSProperties = { alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--green)" };

/** OPRAVY 159: Správa farnosti = sektor Viera (výpisy darov: „Bohu známy veriaci") */
export function SpravaFarnosti(p: Parameters<typeof SpravaFarnostiObsah>[0]) {
  return <SektorDarcuKontext.Provider value="viera"><SpravaFarnostiObsah {...p} /></SektorDarcuKontext.Provider>;
}

/** KARTA 57 A.8: ukončené a zrušené zbierky idú do archívu */
const vArchive = (z: SpustenaZbierka) => !!z.stav && z.stav !== "aktivna";
/** „8. 10. 2026 o 14:05" */
const casKonca = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} o ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };

function SpravaFarnostiObsah({ onBack, strankaId, nazov, test: testPas }: { onBack: () => void; strankaId: string; /** názov z registrácie (Moje stránky) */ nazov?: string; /** testovací pás (OPRAVY 147, 153: dostane „Pozrieť profil ›") */ test?: (onPozriet: () => void) => ReactNode }) {
  const { desktop, wide } = useLayout();
  const tablet = wide && !desktop;
  const ja = usePouzivatel();
  const [sub, setSub] = useState<Sub>("prehlad");
  const [ob, setOb] = useState(2);
  const [pridat, setPridat] = useState(false);
  const [oznamyHore, setOznamyHore] = useState(0); // KARTA 56G §2: + Pridať → Oznam otvorí Oznamy hore
  const [kartaOtv, setKartaOtv] = useState(true);
  const [zmazana, setZmazana] = useState(false); // KARTA 56D §5: hláška po zmazaní hlavnej zbierky, na mieste v Zbierkach
  // KARTA 56D §6: výber druhu zbierky, „najprv hlavná", hláška po spustení a otvorená zbierka
  const [zbVyber, setZbVyber] = useState(false);
  const [zbBlok, setZbBlok] = useState(false);
  const [noveOk, setNoveOk] = useState<string | null>(null);
  const [zbOtv, setZbOtv] = useState<string | null>(null);
  const [pz, setPz] = useState(false); // OPRAVY 161: postup zbierky pre veriacich
  const [archOtv, setArchOtv] = useState(false); // KARTA 57 A.8: archív zbalený
  const [rodOtv, setRodOtv] = useState<string | null>(null); // KARTA 57 A.6: rozbalené vysvetlenie pri zbierke rodiny
  const [pzSpat] = useState<{ current: SpatZbierky | null }>(() => ({ current: null })); // KARTA 57 A.1: horné ‹ Späť = krok späť v zbierke (zbierka sem zapíše svoj krok späť)
  // KARTA 56G: Omše a kalendár otvorené na dni (ťuk v Prehľade) alebo na tomto týždni (Zmena omše) — key = nové otvorenie
  const [omseStart, setOmseStart] = useState<{ den?: string; n: number }>({ n: 0 });
  const naDen = (den?: string) => { setOmseStart((o) => ({ den, n: o.n + 1 })); go("omse"); };
  const go = (k: Sub) => { setSub(k); setPridat(false); setPinOtv(false); setOznamyHore(0); };

  // KARTA 56D §1: profil stránky (profil_stranky) — karta vľavo, percento, „Dokončiť profil"
  const [prof, setProf] = useState(() => profilZPamate(strankaId));
  const [koncept, setKoncept] = useState<ProfilStranky | null>(null); // počas úpravy percento rastie naživo (OPRAVY 112)
  useEffect(() => { let ziva = true; void nacitajProfil(strankaId).then((z) => { if (ziva) setProf(z); }); return () => { ziva = false; }; }, [strankaId]);
  const profilAkt = koncept ?? prof.koncept ?? prof.ulozeny;
  const uplnost = uplnostProfilu(profilAkt);
  const meno = cistyNazov(profilAkt?.meno ?? nazov) || "Vaša farnosť";
  const [vid, setVid] = useState(() => nacitajStav<"zobrazit" | "skryt" | "len-farar">("viditelnost", strankaId, "zobrazit"));
  const kostoly = nacitajStav<{ kostoly?: KostolFarnosti[] }>("profil", strankaId, {}).kostoly ?? PRVY_KOSTOL;

  // KARTA 56D §3: pripnuté sekcie (sprava_piny, najviac 6) — prvý príchod bez pinov
  const [piny, setPiny] = useState<Pin[]>(() => pinyZPamate<Pin>(strankaId, []));
  useEffect(() => { let ziva = true; void nacitajPiny<Pin>(strankaId, []).then((p) => { if (ziva) setPiny(p.filter((x) => PINY.includes(x))); }); return () => { ziva = false; }; }, [strankaId]);
  const [pinOtv, setPinOtv] = useState(false);
  const prepniPin = (k: Pin) => { const n = piny.includes(k) ? piny.filter((x) => x !== k) : piny.length < PIN_MAX_F ? [...piny, k] : piny; setPiny(n); void ulozPiny(strankaId, n, PIN_MAX_F); };

  // KARTA 56B · hlavná zbierka farnosti (= centrálna charity) a okno „Na najbližšiu omšu"
  useZmenyCentralnej(); useZmenyDarov();
  useEffect(() => { void nacitajCentralnuZbierku(strankaId); }, [strankaId]);
  const hlavnaRef = `${strankaId}-centralna`;
  useState(() => nastavCiste([hlavnaRef])); // KARTA 56D §0: hlavná zbierka farnosti bez vymyslených darov (len skutočné)
  const hlavna = centralnaZPamate(strankaId);
  const bezi = hlavnaBezi(strankaId);
  const om = useOmsoveOkno(strankaId);
  const hlavnySuhrn = suhrnHlavnej(strankaId, hlavnaRef);
  const hlavnyUcet = najdiTestProfil(strankaId)?.ucet || "hlavný účet farnosti z registrácie";
  useZmenyZbierok();
  useEffect(() => { void nacitajZbierkyStranky(strankaId); }, [strankaId]);
  const dalsie = zbierkyStrankyZPamate(strankaId);
  const oknoSuma = om.dary.reduce((a, r) => a + r.suma, 0);
  const oknoLudi = new Set(om.dary.map((r) => (r.moj ? "ja" : r.id))).size;

  // KARTA 56D §4: Verejný profil = náhľad vybraného vzhľadu s uloženým profilom (len to, čo farár vyplnil, nikdy ukážkový profil)
  useEffect(() => { void pripojTestovaciuStranku(strankaId); }, [strankaId]); // 0035: tester = správca testovacej stránky
  const verejny = () => go("nahlad");
  const test = testPas?.(verejny);
  const vz = useVzhlad(strankaId, false);
  const mobil = !desktop;
  const telefon = mobil && !tablet;
  // KARTA 56I · 57 B.4: čo pridali veriaci — počet pri „Od veriacich" (úmysly idú len farárovi, nerátajú sa)
  useOdFarnikov(); useCerstveOdFarnikov(strankaId); // OPRAVY 178: čerstvé príspevky a nahlásenia pre Treba vybaviť
  const odF = odFarnikov(strankaId);
  const odFPocet = odF.filter((x) => x.k !== "umysel").length;
  const odV = pocetyOdVeriacich(strankaId);

  // ---------------- časti ----------------
  const pripravujeme = () => toast("Pripravujeme");
  const riadky = (r: { t: string; s: string; v?: string; b?: string; tap?: () => void; bBd?: string; bC?: string }[]) => (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {r.map((x, i) => (
        <div key={x.t + i} style={{ display: "flex", alignItems: "center", gap: mobil ? 10 : 12, minHeight: mobil ? 58 : 60, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: mobil ? 14 : 14.5 }}>{x.t}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{x.s}</span></span>
          {x.v && <b style={{ flex: "none", fontSize: mobil ? 13.5 : 14, fontVariantNumeric: "tabular-nums" }}>{x.v}</b>}
          {x.b && <button type="button" onClick={x.tap} style={{ flex: "none", minHeight: 44, padding: `0 ${mobil ? 12 : 14}px`, borderRadius: 12, border: x.bBd ?? "1px solid var(--cardBd)", background: x.bBd ? "transparent" : "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: mobil ? 13 : 13.5, fontWeight: 800, color: x.bC ?? "var(--ink)" }}>{x.b}</button>}
        </div>))}
    </section>);
  const segment = <T,>(vol: [T, string][], cur: T, set: (v: T) => void, h = 38) => (
    <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)", alignSelf: "flex-start", flexWrap: "wrap" }}>
      {vol.map(([k, t]) => { const on = k === cur; return <button key={String(k)} type="button" aria-pressed={on} onClick={() => set(k)} style={{ minHeight: Math.max(h, 44), padding: "0 14px", border: "none", borderRadius: 9, background: on ? "var(--seg)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, color: on ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>; })}
    </div>);
  const nadpis = (t: string, s: string) => !mobil && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12 }}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 22, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 13.5, color: "var(--ink3)" }}>{s}</span></span></div>;

  // KARTA 56D §3: Treba vybaviť — len to, čo naozaj čaká (profil a hlavná zbierka)
  const ulohy: { t: string; s: string; tap: () => void }[] = [
    ...(uplnost.pct < 100 ? [{ t: "Dokončiť profil", s: uplnost.chyba, tap: () => go("profil") }] : []),
    ...(!bezi ? [{ t: "Pridať hlavnú zbierku", s: "Bez nej sa nedá založiť žiadna iná zbierka.", tap: () => go("zbierky") }] : []),
    // KARTA 57 D.5: od veriacich — ťuk otvorí Od veriacich
    ...(odV.nove ? [{ t: `${odV.nove} ${odV.nove === 1 ? "nový príspevok" : odV.nove < 5 ? "nové príspevky" : "nových príspevkov"} od veriacich`, s: "Pozrite, čo pridali na stránku farnosti.", tap: () => go("veriaci") }] : []),
    ...(odV.nahlasene ? [{ t: `${odV.nahlasene} ${odV.nahlasene === 1 ? "nahlásený príspevok" : odV.nahlasene < 5 ? "nahlásené príspevky" : "nahlásených príspevkov"}`, s: "Ľudia nahlásili príspevok na stránke. Pozrite a rozhodnite.", tap: () => go("veriaci") }] : []),
    ...(odV.umysly ? [{ t: `${odV.umysly} ${odV.umysly === 1 ? "úmysel čaká" : odV.umysly < 5 ? "úmysly čakajú" : "úmyslov čaká"} na omšu`, s: "Zapíšte ich na konkrétnu omšu v Od veriacich.", tap: () => go("veriaci") }] : []),
  ];
  const trebaVybavit = (
    <section data-treba="1" style={{ ...karta, borderRadius: 18, padding: mobil ? "14px 14px" : "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 16 }}>Treba vybaviť</b>
      {ulohy.map((u) => (
        <button key={u.t} type="button" onClick={u.tap} style={{ minHeight: 56, padding: "8px 14px", borderRadius: 14, border: "1.5px solid #C9A24A", background: "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{u.t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{u.s}</span></span>
          <span aria-hidden="true" style={{ fontSize: 18, color: "var(--ink3)" }}>›</span>
        </button>))}
      {!ulohy.length && <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Nič nečaká.</span>}
    </section>);
  const naTreba = () => document.querySelector("[data-treba]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  // KARTA 56B · §6 / 56D §3: Čísla — Vyzbierané · hlavná (podľa obdobia) · Na najbližšiu omšu · Posledná omšová · Sledujúci.
  // Sumy = len dary cez DEED. Počet darov a pravidelná podpora sú v Nástroje → Štatistiky.
  const obOd = zaciatokObdobia(ob);
  const vsetkyDary = [...darcoviaPre(hlavnaRef), ...om.dary, ...om.uzavrete.flatMap((o) => darcoviaPre(o.id))];
  const vyzbObd = vsetkyDary.filter((r) => r.cas >= obOd).reduce((a, r) => a + r.suma, 0);
  const posledna = om.uzavrete[0];
  const poslPocet = posledna ? darcoviaPre(posledna.id).length : 0;
  const OBD_T = ["dnes", "za 7 dní", "za 30 dní", "od januára"];
  const ludiT = (n: number) => `${n} ${n === 1 ? "človek" : n > 1 && n < 5 ? "ľudia" : "ľudí"}`;
  const ramce: [string, string, string][] = [
    ["Vyzbierané · hlavná", eur(vyzbObd), `cez DEED · ${OBD_T[ob]}`],
    ["Na najbližšiu omšu", eur(oknoSuma), oknoLudi ? `nedeľa ${om.okno.nedela} · ${ludiT(oknoLudi)}` : "zatiaľ nikto"],
    ["Posledná omšová", posledna ? eur(posledna.suma) : "—", posledna ? `nedeľa ${posledna.nedela} · ${poslPocet} ${poslPocet === 1 ? "dar" : poslPocet < 5 ? "dary" : "darov"}` : "zatiaľ žiadna"],
    ["Sledujúci", "—", "pripravujeme"], // PLACEBO — karta 56D: sledovanie stránky ešte nemá tabuľku
  ];
  const cisla = (
    <section aria-label="Čísla" style={{ ...karta, borderRadius: 18, padding: mobil ? "12px 12px" : "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ flex: 1, fontSize: 15 }}>Čísla</b>
        <div role="tablist" aria-label="Obdobie" style={{ display: "flex", gap: 2, padding: 3, borderRadius: 12, background: "var(--btn)" }}>
          {["Dnes", "7 dní", "30 dní", "Rok"].map((t, i) => <button key={t} type="button" role="tab" aria-selected={ob === i} onClick={() => setOb(i)} style={{ minHeight: 36, padding: "0 12px", border: "none", borderRadius: 9, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", fontSize: 13, fontWeight: ob === i ? 800 : 700, background: ob === i ? "var(--card)" : "transparent", color: ob === i ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: telefon ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: mobil ? 8 : 10 }}>
        {ramce.map(([k, v, d]) => (
          <div key={k} style={{ minWidth: 0, padding: "10px 12px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k}</span>
            <b style={{ fontSize: mobil ? 19 : 22, lineHeight: 1.15, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{v}</b>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d}</span>
          </div>))}
      </div>
    </section>);
  // KARTA 56D §3: Pripnuté — Treba vybaviť + počet, potom pripnuté sekcie (najviac 6, ukladá sa do účtu)
  const pripnute = (
    <section aria-label="Pripnuté" style={{ ...karta, position: "relative", borderRadius: 18, padding: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ flex: "none", padding: "0 8px 0 6px", fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)" }}>PRIPNUTÉ</span>
      <button type="button" onClick={naTreba} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 12px 0 14px", borderRadius: 13, border: `1.5px solid ${ulohy.length ? "#C9A24A" : "var(--cardBd)"}`, background: ulohy.length ? "var(--goldBg)" : "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>
        Treba vybaviť<span style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: ulohy.length ? "#A34A2A" : "#85867B", color: "#fff", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{ulohy.length}</span>
      </button>
      {piny.map((k) => (
        <button key={k} type="button" onClick={() => go(k)} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 16px 0 12px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: 14.5, fontWeight: 700, color: "var(--ink)", boxShadow: "none" }}>
          <Ik d={IC[k]} s={18} />{TIT[k]}
        </button>))}
      {!piny.length && <span style={{ fontSize: 13.5, color: "var(--ink3)", padding: "0 6px" }}>Zatiaľ nič nepripnuté</span>}
      <span style={{ flex: 1 }} />
      <button type="button" onClick={() => setPinOtv((o) => !o)} aria-expanded={pinOtv} style={{ flex: "none", whiteSpace: "nowrap", height: 44, padding: "0 14px", border: "none", borderRadius: 13, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>
        <Ik d={IC.pin} s={17} c="currentColor" w={2.2} />Upraviť pripnuté
      </button>
      {pinOtv && <div style={{ position: "absolute", right: 8, top: 58, zIndex: 20, width: mobil ? "calc(100% - 16px)" : 340, maxHeight: 420, overflowY: "auto", padding: 8, borderRadius: 18, background: "var(--bg)", border: "1px solid var(--cardBd)", boxShadow: "0 16px 40px rgba(30,28,20,.2)", display: "flex", flexDirection: "column", gap: 2, boxSizing: "border-box" }}>
        <span style={{ padding: "8px 10px 6px", fontSize: 13, color: "var(--ink3)" }}>Pripnite si, čo používate najčastejšie. Najviac 6.</span>
        {PINY.map((k) => { const on = piny.includes(k); return (
          <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => prepniPin(k)} style={{ minHeight: 46, padding: "0 10px", border: "none", borderRadius: 12, background: on ? "var(--gSoft)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{TIT[k]}</span>
            <span style={{ width: 24, height: 24, flex: "none", borderRadius: 7, border: `1.5px solid ${on ? "var(--green)" : "#A8A396"}`, background: on ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>}
            </span>
          </button>); })}
        <button type="button" onClick={() => setPinOtv(false)} style={{ height: 46, marginTop: 6, border: "none", borderRadius: 13, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>Hotovo</button>
      </div>}
    </section>);
  // KARTA 56D §6: karta hlavnej zbierky — zmenšenina fotky · HLAVNÁ ZBIERKA · AKTÍVNA · názov · Ďalší krok
  const fotoH = hlavna?.media.find((m) => m.typ === "foto")?.src;
  const nDarov = (n: number) => `${n} ${n === 1 ? "dar" : n < 5 ? "dary" : "darov"}`;
  const chipF = (t: string, bg: string, r = 8) => <span style={{ height: 26, padding: "0 10px", borderRadius: r, background: bg, color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{t}</span>;
  // KARTA 57 A.10: fotka zbierky ako <img>, nie background:url(data:…)
  const nahladFoto = (src?: string) => <span style={{ position: "relative", overflow: "hidden", flex: "none", width: mobil ? 72 : 96, height: mobil ? 52 : 64, borderRadius: 12, background: "var(--field)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--ink3)" }}>{src ? <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : "bez fotky"}</span>;
  const hlavnaRiadok = (
    <button key="hlavna" type="button" onClick={() => go("hlavna")} style={{ flex: "none", borderRadius: 22, border: "2px solid var(--green)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: mobil ? 12 : 18, padding: mobil ? "12px 14px" : "18px 22px", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
      {nahladFoto(fotoH)}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{chipF("HLAVNÁ ZBIERKA", "var(--green)")}{chipF("AKTÍVNA", "#4B7A35")}</span>
        <b style={{ fontSize: mobil ? 17 : 20, lineHeight: 1.2 }}>{nazovHlavnej(hlavna)}</b>
        <span style={{ fontSize: 14, color: "var(--ink3)" }}>{hlavnySuhrn.darcov ? nDarov(hlavnySuhrn.darcov) : "zatiaľ žiadne dary"} · stála, aj mesačne</span>
        {!hlavnySuhrn.darcov && <span style={{ fontSize: 14, color: "var(--ink)" }}><b>Ďalší krok:</b> stiahnite QR plagát a dajte ho do kostola ›</span>}
      </span>
      <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <b style={{ fontSize: mobil ? 18 : 24, fontVariantNumeric: "tabular-nums" }}>{eur(hlavnySuhrn.suma)}</b>
        <span style={{ fontSize: 12, color: "var(--ink3)" }}>cez DEED</span>
      </span>
      {!mobil && <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>}
    </button>);
  const pridatHlavnu = (
    <button key="pridat-hlavnu" type="button" onClick={() => go("hlavna")} style={{ flex: "none", minHeight: 120, borderRadius: 22, border: "2px dashed var(--cuBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 18, padding: mobil ? "16px 16px" : "20px 24px", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
      <span aria-hidden="true" style={{ flex: "none", width: 52, height: 52, borderRadius: 16, background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>+</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: mobil ? 16 : 18, color: "var(--green)" }}>Pridať hlavnú zbierku</b>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{hlavna ? "Rozpracovaná, ešte nebeží. Dokončite ju a spustite." : "Stála zbierka bez cieľa a konca, aj mesačne. Všetky ďalšie zbierky posielajú peniaze na jej účet. Preto ju treba založiť ako prvú."}</span>
      </span>
    </button>);
  const nedOmse = nedelneOmse(strankaId); // KARTA 56F: nedeľné omše z rozvrhu omší
  const menaO = menaOkna(om.dary, ja);
  const oknoKarta = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ flex: 1, minWidth: 0, fontSize: mobil ? 15 : 16 }}>Nedeľa {om.okno.nedela}{nedOmse.length ? ` · ${nedOmse.join(" · ")}` : ""}</b>
        <span style={{ height: 24, padding: "0 9px", borderRadius: 12, background: "#4B7A35", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center" }}>BEŽÍ</span>
      </div>
      <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>vzniklo samo z rozvrhu omší · len na čítanie</span>
      <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Okno pondelok {om.okno.pondelok} 0:00 – nedeľa {om.okno.nedela} 23:59 · zatvorí sa o {doZatvorenia(om.okno, strankaId)}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{eur(oknoSuma)}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>od {oknoLudi} {oknoLudi === 1 ? "človeka" : "ľudí"} · cez DEED</span></div>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Na profile: {menaO || "zatiaľ nikto"}{menaO ? " (bez súm)" : ""}. Bez mena = <b>Bohu známy veriaci</b>. Po zatvorení okna mená zmiznú a do hlavnej zbierky pribudne jeden riadok „spoločný dar veriacich“.</span>
      {om.uzavrete.length > 0 && <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--cardBd)", paddingTop: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "4px 0" }}>Uzavreté týždne v hlavnej zbierke</span>
        {om.uzavrete.slice(0, 6).map((o, i) => <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 14 }}>Omšová zbierka {o.nedela}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>spoločný dar veriacich{i === 0 ? " · 1 darca v štatistike" : ""}</span></span>
          <b style={{ flex: "none", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{eur(o.suma)}</b>
        </div>)}
      </div>}
      {TESTOVACIA && <button type="button" onClick={() => { zavriTyzdenTest(strankaId); toast("Týždeň zavretý (test). Začalo nové prázdne okno."); }} style={{ ...odkaz, color: "var(--ink3)" }}>Zavrieť týždeň (test)</button>}
    </section>);

  // KARTA 56D §3: Prehľad = Čísla · Pripnuté · Treba vybaviť.
  // KARTA 57 B.1: mobil a tablet = karta farnosti (ťuk = Upraviť profil) → Čísla → 6 dlaždíc → Verejný profil · Nastavenia · Nástroje a štatistiky → Pripnuté → Treba vybaviť
  const DLAZDICE: [Sub, string][] = [["zbierky", "Zbierky"], ["omse", "Omše"], ["oznamy", "Oznamy"], ["veriaci", "Od veriacich"], ["ludia", "Ľudia"], ["filialky", "Filiálky"]];
  const riadokDomov = (d: string, t: string, s: string, tap: () => void, tyrk = false) => (
    <button type="button" onClick={tap} style={{ flex: 1, minWidth: 0, minHeight: 56, padding: "8px 14px", borderRadius: 16, border: `1px solid ${tyrk ? "var(--tBd)" : "var(--cardBd)"}`, background: tyrk ? "var(--tBg)" : "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
      <Ik d={d} c={tyrk ? "var(--tInk)" : "var(--acc)"} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 15, color: tyrk ? "var(--tInk)" : "var(--ink)" }}>{t}</b><span style={{ fontSize: 12, color: tyrk ? "var(--tInk2)" : "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s}</span></span>
      <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: tyrk ? "var(--tInk)" : "var(--ink3)" }}>›</span>
    </button>);
  const prehlad = mobil ? <>
    <button type="button" onClick={() => go("profil")} style={{ flex: "none", borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
      <LogoKarty profil={profilAkt} inicialy="" size={48} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: 16, color: "var(--cuInk)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meno}</b>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cuInk2)" }}>Profil hotový na {uplnost.pct} % · Upraviť ›</span>
        <span style={{ display: "block", height: 6, borderRadius: 3, background: "rgba(168,116,80,.25)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 3, background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${uplnost.pct / 100})` }} /></span>
      </span>
    </button>
    {cisla}
    <div style={{ flex: "none", display: "grid", gridTemplateColumns: tablet ? "repeat(6,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {DLAZDICE.map(([k, t]) => (
        <button key={k} type="button" onClick={() => go(k)} style={{ position: "relative", minHeight: 86, padding: "8px 4px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", boxShadow: "none" }}>
          <Ik d={IC[k]} s={24} />
          <span style={{ fontSize: 14, lineHeight: 1.2, fontWeight: 800, textAlign: "center", color: "var(--ink)" }}>{t}</span>
          {k === "veriaci" && odFPocet > 0 && <span aria-label={`${odFPocet} nových`} style={{ position: "absolute", top: 8, right: 8, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 11, background: "#A34A2A", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>{odFPocet}</span>}
        </button>))}
    </div>
    <div style={{ flex: "none", display: "flex", flexDirection: tablet ? "row" : "column", gap: 8 }}>
      {riadokDomov(IC.verejny, "Verejný profil", "ako ho vidia veriaci", verejny, true)}
      {riadokDomov(IC.nast, "Nastavenia", "appka, účet, Peňaženka", () => go("nast"))}
    </div>
    <div style={{ flex: "none", display: "flex" }}>{riadokDomov(IC.stat, "Nástroje a štatistiky", "sledujúci, darcovia, QR do kostola", () => go("nastroje"))}</div>
    {pripnute}
    <TyzdenVPrehlade strankaId={strankaId} onDen={naDen} mobil />
    {trebaVybavit}
  </> : <>{cisla}{pripnute}<TyzdenVPrehlade strankaId={strankaId} onDen={naDen} mobil={false} />{trebaVybavit}</>;

  // KARTA 56D §6 · OPRAVY 161: ďalšie zbierky stránky (zbierka farnosti / pre veriacich) — z účtu (tabuľka zbierka)
  const sprava = (m: string) => { setZbVyber(false); setZbBlok(false); setNoveOk(null); setZmazana(false); return m; };
  const dalsieRiadok = (z: SpustenaZbierka) => {
    const [chip, bg] = stitokZbierkyF(z);
    const s0 = sucetDarov(z.id);
    const veriaci = z.farnost && z.farnost.druh !== "farnost";
    // KARTA 57 A.6: zbierka rodiny po zapečatení — farár nevidí sumy ani darcov, ťuk = len vysvetlenie
    if (veriaci) { const otv = rodOtv === z.id, d = z.farnost?.druh; return (
      <button key={z.id} type="button" onClick={() => setRodOtv(otv ? null : z.id)} aria-expanded={otv} style={{ flex: "none", borderRadius: 20, border: "1.5px solid #B9A3C2", background: "var(--card)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: mobil ? 12 : 16, padding: mobil ? "10px 12px" : "12px 18px 12px 12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
        {nahladFoto(fotoZbierky(z))}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ alignSelf: "flex-start" }}>{chipF(`${d === "svadba" ? "SVADBA" : d === "ine" ? "PRE VERIACEHO" : "POHREB"} · ZBIERKA RODINY`, "#6E4E7A", 7)}</span>
          <b style={{ fontSize: mobil ? 16 : 18 }}>{z.nazov || "Zbierka rodiny"}</b>
          <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>overili ste · beží · spravuje príjemca</span>
        </span>
        {otv && <span style={{ flex: "1 1 100%", fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Sumy a darcov vidí len príjemca. Podiel farnosti vám príde do Peňaženky. Na stránke farnosti je táto zbierka fialovou, aby bolo jasné, že ju nevyberá farnosť.</span>}
      </button>); }
    const ciel = z.cielTyp === "ciel" ? cielCislo(z) : 0;
    const pod = s0.pocet ? nDarov(s0.pocet) : "zatiaľ žiadne dary";
    return (
      <button key={z.id} type="button" onClick={() => { sprava(""); setZbOtv(z.id); go("zbierka"); }} style={{ flex: "none", borderRadius: 20, border: "1px solid var(--cardBd)", background: "var(--card)", display: "flex", alignItems: "center", gap: mobil ? 12 : 16, padding: mobil ? "10px 12px" : "12px 18px 12px 12px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none", width: "100%" }}>
        {nahladFoto(fotoZbierky(z))}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ alignSelf: "flex-start" }}>{chipF(chip, bg, 7)}</span>
          <b style={{ fontSize: mobil ? 16 : 18 }}>{z.nazov || "Nová zbierka"}</b>
          <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{veriaci ? `${pod} · ${rozdelenieZbierkyF(z)}` : `${ciel ? `cieľ ${eur(ciel)} · ` : ""}${pod}`}</span>
        </span>
        <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end" }}><b style={{ fontSize: mobil ? 17 : 20, fontVariantNumeric: "tabular-nums" }}>{eur(s0.suma)}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>cez DEED</span></span>
        {!mobil && <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>}
      </button>);
  };
  // KARTA 57 A.8: archív — ukončené a zrušené v jednom zbalenom riadku, pri každej dátum a čas ukončenia (čas servera)
  const archiv = dalsie.filter(vArchive);
  const archivKarta = archiv.length > 0 && (
    <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="button" onClick={() => setArchOtv((o) => !o)} aria-expanded={archOtv} style={{ minHeight: 64, padding: "10px 16px", borderRadius: 18, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
        <Ik d="M3 5h18v4H3zM5 9v10h14V9M10 13h4" s={20} c="var(--acc)" />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>Archív · {archiv.length} {archiv.length === 1 ? "zbierka" : archiv.length < 5 ? "zbierky" : "zbierok"}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>ukončené a zrušené · všetko sa uchováva, kedykoľvek dohľadáte</span></span>
        <span aria-hidden="true" style={{ fontSize: 18, color: "var(--ink3)", transform: `rotate(${archOtv ? 180 : 0}deg)`, transition: "transform .2s ease" }}>⌄</span>
      </button>
      {archOtv && <div style={{ display: "flex", flexDirection: "column", borderRadius: 18, border: "1px solid var(--cardBd)", background: "var(--card)", padding: "4px 16px" }}>
        {archiv.map((z, i) => { const rod = !!z.farnost && z.farnost.druh !== "farnost", otv = rodOtv === z.id; const [chip] = stitokZbierkyF(z); return (
          <button key={z.id} type="button" onClick={() => { if (rod) { setRodOtv(otv ? null : z.id); return; } sprava(""); setZbOtv(z.id); go("zbierka"); }} aria-expanded={rod ? otv : undefined}
            style={{ minHeight: 60, padding: "10px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 15 }}>{z.nazov || "Zbierka"}</b>
              <span style={{ fontSize: 13, color: "var(--ink3)" }}>{[chip.toLocaleLowerCase("sk-SK"), casKonca(z.koniec)].filter(Boolean).join(" · ")}</span>
              {rod && otv && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)", paddingTop: 4 }}>Zbierka rodiny, ktorú ste overili. Sumy a darcov vidí len príjemca. Váš podiel farnosti nájdete v Peňaženke.</span>}
            </span>
            <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>{rod ? (otv ? "⌃" : "⌄") : "›"}</span>
          </button>); })}
      </div>}
    </div>);
  const sprava2 = (t: string, zav: () => void, zelena: boolean) => (
    <div role="status" style={{ flex: "none", borderRadius: 18, background: zelena ? "var(--gSoft)" : "var(--card)", border: `2px solid ${zelena ? "var(--green)" : "var(--cardBd)"}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <b style={{ flex: 1, minWidth: 220, fontSize: 16, color: zelena ? "var(--gInk)" : "var(--ink)" }}>{t}</b>
      <button type="button" onClick={zav} style={{ height: 44, padding: "0 16px", borderRadius: 12, border: `1px solid ${zelena ? "var(--gBd)" : "var(--cardBd)"}`, background: zelena ? "transparent" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: zelena ? "var(--gInk)" : "var(--ink)", boxShadow: "none" }}>Rozumiem</button>
    </div>);
  const volbaZb = (ik: string, t: string, s: string, tap: () => void) => (
    <button type="button" onClick={tap} style={{ minHeight: 84, padding: "14px 18px", borderRadius: 18, border: "1.5px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
      <span style={{ flex: "none", width: 52, height: 52, borderRadius: 15, background: "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={ik} s={24} c="var(--gInk)" /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 17 }}>{t}</b><span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink3)" }}>{s}</span></span>
      <span aria-hidden="true" style={{ fontSize: 22, color: "var(--ink3)" }}>›</span>
    </button>);
  const zbierky = <>
    {nadpis("Zbierky", "Ťuk na riadok otvorí Správu zbierky")}
    {zbVyber && <section style={{ flex: "none", borderRadius: 22, background: "var(--card)", border: "2px solid var(--green)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ flex: 1, fontSize: 19 }}>Akú zbierku pridávate?</b>
        <button type="button" onClick={() => setZbVyber(false)} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontSize: 18, color: "var(--ink2)", boxShadow: "none" }}>×</button></div>
      {volbaZb(IC.kostol, "Zbierka farnosti", "na opravu, misie, lavice · peniaze idú na účet hlavnej zbierky", () => { sprava(""); if (!bezi) { setZbBlok(true); return; } go("nova"); })}
      {volbaZb(IC.ludia, "Zbierka s overovateľom", "pohreb, svadba, iné · peniaze idú rodine, podiel farnosti na účet farnosti · nezávisí od hlavnej zbierky", () => { sprava(""); setPz(true); })}
    </section>}
    {pz && <ZbierkaSOverovatelom stranka={strankaId} menoFarnosti={meno} ucetFarnosti={hlavnyUcet} mobil={mobil} pc={desktop} toast={toast} onZavri={() => setPz(false)} spatRef={pzSpat}
      onHotovo={(_z, t) => { setPz(false); setNoveOk(t); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
    {/* KARTA 56E §2: kým beží tvorba (výber druhu alebo postup), zoznam zbierok sa nezobrazuje */}
    {!zbVyber && !pz && <>
    {/* KARTA 57 B.2: v Zbierkach na mobile a tablete aj veľké + Pridať zbierku hore */}
    {mobil && <button type="button" onClick={() => { setPridat(false); setZbVyber(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ flex: "none", minHeight: 56, border: "none", borderRadius: 16, background: "#4B7A35", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", boxShadow: "none" }}><span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>+</span>Pridať zbierku</button>}
    {noveOk && sprava2(noveOk, () => setNoveOk(null), true)}
    {zbBlok && !bezi && <div role="alert" style={{ flex: "none", borderRadius: 18, background: "var(--goldBg)", border: "2px solid #C9A24A", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 16.5 }}>Najprv treba spustiť hlavnú zbierku</b>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Všetky ďalšie zbierky posielajú peniaze na jej účet. Keď hlavná zbierka beží, môžete pridávať ďalšie.</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => { setZbBlok(false); go("hlavna"); }} style={{ height: 50, padding: "0 20px", border: "none", borderRadius: 14, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>Pridať hlavnú zbierku</button>
        <button type="button" onClick={() => setZbBlok(false)} style={{ height: 50, padding: "0 18px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" }}>Zavrieť</button>
      </div>
    </div>}
    {zmazana && !hlavna && sprava2("Hlavná zbierka je zmazaná. Novú pridáte ťuknutím nižšie.", () => setZmazana(false), false)}
    <span style={mobil ? { ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" } : kicker}>HLAVNÁ ZBIERKA · JEDEN ÚČET</span>
    {bezi && hlavnaRiadok}
    {bezi && <>
      <span style={mobil ? { ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" } : kicker}>NA NAJBLIŽŠIU OMŠU · TÝŽDENNÉ OKNO</span>
      {oknoKarta}
    </>}
    {dalsie.length > 0 && <>
      <span style={mobil ? { ...kicker, letterSpacing: ".07em", padding: "8px 2px 0" } : { ...kicker, paddingTop: 8 }}>ĎALŠIE ZBIERKY</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{dalsie.filter((z) => !vArchive(z)).map(dalsieRiadok)}</div>
      {archivKarta}
    </>}
    {!bezi && pridatHlavnu}
    </>}
  </>;

  // KARTA 56F · OPRAVY 165: Omše a kalendár (Týždeň · Mesiac · Rozvrh omší, úprava dňa, plagát, pripnutie do Prehľadu)
  const omse = <OmseKalendar key={omseStart.n} start={omseStart} strankaId={strankaId} meno={meno} kostoly={kostoly.map((k) => ({ nazov: k.nazov, adresa: k.adresa }))} mobil={mobil} tel={telefon} toast={toast} />;

  // KARTA 56G §4–5: Oznamy farnosti — Krátky oznam · Udalosť · Oznámenie, náhľad, ohlášky, zoznam zverejnených
  const oznamy = <>
    {nadpis("Oznamy", "Ohlášky a oznamy farnosti")}
    <OznamyFarnosti strankaId={strankaId} meno={meno} profil={prof.ulozeny} mobil={mobil} tel={telefon} toast={toast} hore={oznamyHore} />
  </>;
  // KARTA 57 B.1/B.4 · D: Od veriacich = úmysly, čo pridali veriaci, nastavenia pre veriacich
  const veriaci = <>
    {nadpis("Od veriacich", "Úmysly na omšu, príspevky veriacich a čo smú pridávať")}
    <OdVeriacich strankaId={strankaId} meno={meno} mobil={mobil} toast={toast} />
  </>;
  // KARTA 57 B.3: Kostoly farnosti → dlaždica Filiálky (filiálky dorobíme)
  const filialky = <>
    {nadpis("Filiálky", "Farský kostol a filiálky")}
    <span style={{ fontSize: 14, color: "var(--ink3)" }}>Farský kostol a filiálky. Pri každom kostole budú vlastné omše.</span>
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 15, fontWeight: 800, paddingBottom: 4 }}>Kostoly farnosti</span>
      {kostoly.map((x, i) => (
        <div key={x.nazov + i} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 14.5 }}>{x.nazov}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{x.adresa || "adresa z registrácie"}</span>
        </div>))}
      {/* PLACEBO — karta 57 B.3: pridanie filiálky ešte nemá formulár */}
      <button type="button" onClick={pripravujeme} style={odkaz}>+ Pridať kostol</button>
    </section>
  </>;

  // KARTA 56D §0: Ľudia = len prihlásený správca. Ďalšie osoby a počty pribudnú s tabuľkou správcov (PLACEBO — karta 56D).
  const iniJa = ja.celeMeno.split(/\s+/).map((x) => x[0] ?? "").join("").slice(0, 2).toUpperCase() || "VY";
  const darcovNum = new Set(vsetkyDary.map((r) => (r.moj ? "ja" : r.id))).size;
  // KARTA 57 D.6: Ľudia = Správcovia (osoby + prístup) a Dobrovoľníci; štatistiky sú v Nástrojoch a štatistikách
  const ludia = <>
    {nadpis("Ľudia", "Správcovia farnosti a dobrovoľníci")}
    <span style={mobil ? { ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" } : kicker}>SPRÁVCOVIA · KTO MÔŽE SPRAVOVAŤ FARNOSŤ</span>
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: mobil ? 10 : 12, minHeight: mobil ? 62 : 64, padding: "8px 0" }}>
        <span style={{ flex: "none", width: mobil ? 40 : 44, height: mobil ? 40 : 44, borderRadius: "50%", background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: mobil ? 13 : 14, fontWeight: 800, color: "var(--ink2)" }}>{iniJa}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: mobil ? 14 : 14.5 }}>{ja.celeMeno}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>hlavný správca · zaregistrovali ste farnosť</span></span>
        <span style={{ flex: "none", fontSize: 12.5, color: "var(--ink3)" }}>vždy má prístup</span>
      </div>
      {/* PLACEBO — karta 56D: ďalšie osoby a prístup pribudnú s tabuľkou správcov */}
      <button type="button" onClick={pripravujeme} style={{ ...odkaz, display: "block", width: "100%", textAlign: "left", padding: "10px 0 12px", borderTop: "1px solid var(--cardBd)" }}>+ Pridať osobu</button>
    </section>
    <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Kaplán, kostolník, účtovníčka, katechétka… Prístup k Správe má len ten, komu ho zapnete. Na profile sa ukážu, prístup sa verejne neukazuje.</span>
    <span style={mobil ? { ...kicker, letterSpacing: ".07em", padding: "8px 2px 0" } : { ...kicker, paddingTop: 8 }}>DOBROVOĽNÍCI</span>
    {/* PLACEBO — karta 57 D.6: dobrovoľníci farnosti (brigády, upratovanie, spev) ešte nemajú tabuľku */}
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink3)" }}>Zatiaľ nikto. Kto sa pridá k dobrovoľníkom farnosti (brigády, upratovanie, spev), uvidíte ho tu. Pripravujeme.</span>
      <button type="button" disabled style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "default", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--ink3)", boxShadow: "none" }}>Napísať všetkým · keď niekto pribudne</button>
    </section>
  </>;
  // KARTA 57 B.1: Nástroje a štatistiky — sledujúci, darcovia, QR do kostola
  const statistikyL = riadky([
    { t: "Sledujúci", s: "dostávajú ohlášky a oznamy · pripravujeme" }, // PLACEBO — karta 56D
    { t: "Darcovia", s: "mená bez súm · bez mena = Bohu známy veriaci", v: String(darcovNum) },
    { t: "Pravidelná podpora", s: "mesačne, kartou alebo SEPA · pripravujeme" }, // PLACEBO — karta 56D
  ]);
  const mesOd = zaciatokMesiaca();
  const mesDary = vsetkyDary.filter((r) => r.cas >= mesOd);
  const penazenka = <>
    {nadpis("Peňaženka", "Dary idú priamo na účet farnosti, DEED peniaze nedrží")}
    {riadky([
      { t: "Prišlo tento mesiac", s: mesDary.length ? `${mesDary.length} ${mesDary.length === 1 ? "dar" : mesDary.length < 5 ? "dary" : "darov"} · hlavná zbierka a omše` : "zatiaľ žiadne dary", v: eur(mesDary.reduce((a, r) => a + r.suma, 0)) },
      { t: "Čaká na výplatu", s: "do 2 pracovných dní · pripravujeme" }, // PLACEBO — karta 56D: výplaty rieši platobný modul
      { t: "Výplaty na účet", s: "pripravujeme" }, // PLACEBO — karta 56D
      { t: "Dary v EURC", s: "pripravujeme" }, // PLACEBO — karta 56D
    ])}
  </>;
  const viditKarta = (
    <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 15 }}>Viditeľnosť súm zbierok</b>
      <span style={{ fontSize: 13, color: "var(--ink3)" }}>Čo vidia návštevníci profilu</span>
      {segment(VID.map(([k, t]) => [k, t] as [typeof vid, string]), vid, (v) => { setVid(v); ulozStav("viditelnost", strankaId, v); }, 40)}
      <span style={{ fontSize: 13, color: "var(--ink2)" }}>{VID.find((x) => x[0] === vid)?.[2]}</span>
    </section>);
  const nastrojeL = riadky([["QR na tlač do kostola", "pokladnička, nástenka, lavice · sken otvorí dar", "Tlačiť"], ["Štatistiky", "dary podľa omší, zbierok a mesiacov", "Otvoriť"], ["Ročný výpis", "podklad pre farskú radu a ekonómov", "Stiahnuť"]].map(([t, s, b]) => ({ t, s, b, tap: pripravujeme })));
  const nastaveniaL = riadky([["Vzhľad a prístupnosť", "téma, jazyk, veľkosť písma"], ["Oznámenia", "nový dar, oznam od veriaceho"], ["Príjem darov", "EURC, transparentný účet"], ["Správcovia", "kto má prístup k Správe farnosti"], ["Program a predplatné", "program Farnosť · jedna cena · faktúry"]].map(([t, s]) => ({ t, s })));
  // OPRAVY 162: hore karta QR farnosti — jeden QR z registrácie, stav podľa hlavnej zbierky
  const qrFarnosti = <QrKarta nazov={meno} slug={strankaId} odkaz={odkazQrStranky(strankaId)} organizacia={meno} toast={toast} nadpis="QR farnosti"
    stav={bezi ? { t: "Teraz vedie na hlavnú zbierku", zelena: true } : { t: "Teraz vedie na profil farnosti", zelena: false }}
    popis="Jeden QR na dvere kostola. Dostali ste ho pri registrácii a nikdy sa nemení. Keď spustíte hlavnú zbierku, ten istý QR povedie rovno na ňu. Netreba nič tlačiť znova." />;
  const kick = (t: string) => <span style={mobil ? { ...kicker, letterSpacing: ".07em", padding: "4px 2px 0" } : kicker}>{t}</span>;
  const nastroje = <>{nadpis("Nástroje a štatistiky", "Sledujúci, darcovia, QR do kostola, viditeľnosť súm")}{kick("ŠTATISTIKY")}{statistikyL}{kick("NÁSTROJE")}{qrFarnosti}{viditKarta}{nastrojeL}</>;
  // KARTA 57 B.4: Peňaženka je hore v Nastaveniach (z menu PC vypadla)
  const nastavenia = <>{nadpis("Nastavenia", "Ako pri charite, bez programov a faktúr za vyššie programy")}
    <button type="button" onClick={() => go("penazenka")} style={{ flex: "none", minHeight: 60, padding: "8px 16px", borderRadius: mobil ? 18 : 22, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
      <Ik d={IC.penazenka} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>Peňaženka</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>zostatok, výplaty na účet farnosti · súkromné</span></span>
      <span aria-hidden="true" style={{ fontSize: 18, color: "var(--ink3)" }}>›</span>
    </button>
    {nastaveniaL}</>;

  // KARTA 56D §4: Upraviť profil = modul z charity (profil_stranky: koncept sa ukladá sám, Uložiť zverejní)
  const profil = <UpravitProfilCharity farnost strankaId={strankaId} pozicia="charita" tier={4} nazov={cistyNazov(nazov) || "Vaša farnosť"} inicialy="" mobil={mobil} tablet={tablet} stit="silver"
    onZmena={setKoncept} onUlozene={(pr) => { setProf({ koncept: null, konceptCas: null, ulozeny: pr }); setKoncept(null); }}
    onZrusit={() => { setKoncept(null); go("prehlad"); }} onHotovo={() => { setKoncept(null); go("prehlad"); }}
    vzhlad={<VzhladStranky strankaId={strankaId} zadarmo={false} kto="ľudia" sektor="farnost" />} />;
  const nahlad = <NahladFarnosti prihovor={(sv) => <PrihovorNaStranke strankaId={strankaId} svetly={sv} />} profil={prof.ulozeny} meno={cistyNazov(prof.ulozeny?.meno ?? nazov) || "Vaša farnosť"} vzhlad={vz} mobil={mobil && !tablet} hore={
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button type="button" onClick={() => go("profil")} style={{ height: 44, padding: "0 16px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>‹ Späť na úpravu</button>
      <span style={{ fontSize: 14, color: "var(--ink3)" }}>{nahladPopis(vz)}</span>
    </div>} />;

  // KARTA 56B: hlavnú zbierku nejde zmazať, kým beží zbierka farnosti (na jej účet). Zbierky pre veriacich od nej nezávisia (OPRAVY 161).
  const ostatneBezia = dalsie.some((z) => (z.farnost?.druh ?? "farnost") === "farnost" && z.stav !== "ukoncena" && z.stav !== "vyuctovana");
  const zbOtvorena = dalsie.find((z) => z.id === zbOtv);
  const zbierkaEl = zbOtvorena ? <SpravaZbierkyFarnosti key={zbOtvorena.id} stranka={strankaId} z={zbOtvorena} mobil={mobil} toast={toast} onSpat={() => go("zbierky")} /> : null;
  const novaEl = <NovaZbierka strankaId={strankaId} pozicia="charita" tier={4} nazov={meno} inicialy={meno.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase()} mobil={mobil} tablet={tablet} stit="silver"
    onMojeZbierky={() => go("zbierky")} farnost={{ ucet: hlavnyUcet, onSpustena: (z) => { go("zbierky"); setNoveOk(`Zbierka „${z.nazov}“ beží. Nájdete ju nižšie v Ďalších zbierkach.`); } }} />;
  const hlavnaSprava = <SpravaCentralnej strankaId={strankaId} nazov={meno} hlavnyUcet={hlavnyUcet} tier={4} mobil={mobil} toast={toast}
    onZbierky={() => setSub("zbierky")} farnost={{ ostatneBezia, onZmazana: () => { setZmazana(true); go("zbierky"); }, onHotovo: () => go("prehlad") }} />;
  const obsah: Record<Sub, ReactNode> = { prehlad, zbierky, omse, oznamy, veriaci, ludia, filialky, penazenka, nastroje, profil, nahlad, hlavna: hlavnaSprava, zbierka: zbierkaEl, nova: novaEl, nast: nastavenia };

  // ---------------- Pridať ----------------
  // KARTA 56D §2 · 56G §2: tlačidlo v hlavičke podľa sekcie; inde ponuka 3 položiek (Zbierka · Oznam · Zmena omše)
  const akcia = (k: Akcia) => {
    setPridat(false);
    if (k === "zbierka") { go("zbierky"); setZbVyber(true); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (k === "oznam") { go("oznamy"); setOznamyHore((n) => n + 1); return; }
    naDen(); // KARTA 56G §2: Zmena omše = kalendár na tomto týždni, bez vybraného dňa
  };
  const pridatTl = () => { if (sub === "zbierky") akcia("zbierka"); else if (sub === "oznamy") akcia("oznam"); else setPridat(true); };
  const zoznamPridat = PRIDAT.map(([d, t, s, k]) => (
    <button key={t} type="button" onClick={() => akcia(k)} style={{ minHeight: mobil ? 56 : 60, padding: mobil ? "6px 12px" : "8px 12px", borderRadius: 15, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
      <span style={{ width: mobil ? 38 : 40, height: mobil ? 38 : 40, flex: "none", borderRadius: 11, background: "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={d} s={mobil ? 19 : 20} c="var(--gInk)" /></span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: mobil ? 14.5 : 15, color: "var(--ink)" }}>{t}</b><span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{s}</span></span>
    </button>));
  const vrstvy = <>
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
  </>;

  const titul = TIT[sub];
  const spatTl = (onClick: () => void) => <button type="button" onClick={onClick} aria-label="Späť" style={{ flex: "none", height: 44, padding: mobil ? "0 12px 0 8px" : "0 14px 0 8px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: mobil ? 14 : 15, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>‹ Späť</button>;
  const nazpat = () => {
    if (sub === "zbierky" && pz && pzSpat.current) { const r = pzSpat.current(); if (r === "spat") return; if (r === "zavriet") { setPz(false); return; } }
    if (sub === "hlavna" || sub === "zbierka" || sub === "nova") setSub("zbierky"); else if (sub === "penazenka") setSub("nast"); else if (sub === "prehlad") onBack(); else setSub("prehlad"); };

  // ================= PC =================
  if (desktop) {
    const nav: Sub[] = ["prehlad", "zbierky", "omse", "oznamy", "veriaci", "ludia", "nastroje"]; // KARTA 57 B.4: + Od veriacich (s počtom), − Peňaženka (je v Nastaveniach) // Nastavenia ako tlačidlo pod Verejným profilom (OPRAVY 157); Upraviť profil je hore pri profile (KARTA 56F)
    const aktivna = sub === "hlavna" || sub === "zbierka" || sub === "nova" ? "zbierky" : sub === "penazenka" ? "nast" : sub;
    return (
      <div className="sprava-charity" data-stit="silver" style={{ minHeight: "100dvh", boxSizing: "border-box", padding: "20px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>
        <aside style={{ width: 244, flex: "none", display: "flex", flexDirection: "column", gap: 12, paddingRight: 16, borderRight: "2px solid", borderImage: "var(--metal) 1", position: "sticky", top: 20, alignSelf: "flex-start", minHeight: "calc(100dvh - 40px)", boxSizing: "border-box" }}>
          {/* KARTA 56D §1: karta farnosti ako pri charite — logo, názov, percento, pruh, čo chýba, Upraviť */}
          <div style={{ flex: "none", borderRadius: 18, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45)", overflow: "hidden" }}>
            <button type="button" onClick={() => setKartaOtv((o) => !o)} aria-expanded={kartaOtv} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 12, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
              <LogoKarty profil={profilAkt} inicialy="" size={40} />
              <span style={{ flex: 1, minWidth: 0 }}><span title={meno} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 14.5, fontWeight: 800, lineHeight: 1.25, color: "var(--cuInk)" }}>{meno}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--cuInk2)", whiteSpace: "nowrap" }}>Farnosť · {uplnost.pct} %</span></span>
              <Ik d={IC.dole} s={18} w={2.4} style={{ transform: `rotate(${kartaOtv ? 180 : 0}deg)`, transition: "transform .2s ease" }} />
            </button>
            {kartaOtv && <div style={{ padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--accLine)" }}>
              <span style={{ display: "block", height: 6, marginTop: 8, borderRadius: 3, background: "rgba(168,116,80,.25)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 3, background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${uplnost.pct / 100})`, transition: "transform .5s ease" }} /></span>
              <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--cuInk)" }}>{uplnost.chyba}</span>
              <button type="button" onClick={() => go("profil")} style={{ height: 44, border: "none", borderRadius: 12, background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, boxShadow: "none" }}>Upraviť</button>
            </div>}
          </div>
          <button type="button" onClick={verejny} style={{ flex: "none", height: 56, padding: "0 14px", borderRadius: 18, background: "var(--tBg)", border: "1px solid var(--tBd)", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
            <Ik d={IC.verejny} c="var(--tInk)" />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 800, color: "var(--tInk)" }}>Verejný profil</span><span style={{ fontSize: 12, color: "var(--tInk2)" }}>ako ho vidia veriaci</span></span>
            <span aria-hidden="true" style={{ fontSize: 18, color: "var(--tInk)" }}>›</span>
          </button>
          <TlacidloNastavenia on={aktivna === "nast"} onClick={() => go("nast")} />
          <nav aria-label="Správa farnosti" style={{ flex: "none", display: "flex", flexDirection: "column", gap: 2, padding: "4px 0" }}>
            {nav.map((k) => { const on = aktivna === k; return (
              <button key={k} type="button" onClick={() => go(k)} aria-current={on ? "page" : undefined} className={on ? undefined : "sc-hov"} style={{ height: 48, padding: "0 14px", border: "none", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", boxShadow: "none", background: on ? "var(--accSoft)" : "transparent", color: on || k === "prehlad" ? "var(--ink)" : "var(--ink2)" }}>
                <Ik d={IC[k]} /><span style={{ flex: 1, fontSize: 15, fontWeight: on ? 800 : 600, whiteSpace: "nowrap" }}>{TIT[k]}</span>
                {k === "veriaci" && odFPocet > 0 && <span style={{ minWidth: 24, height: 24, padding: "0 7px", borderRadius: 12, background: "#A34A2A", color: "#fff", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>{odFPocet}</span>}
              </button>); })}
          </nav>
        </aside>
        <div style={{ flex: 1, minWidth: 0 }}>
          <main style={{ maxWidth: 1600, margin: "0 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 14, paddingBottom: 40 }}>
            <header style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, paddingBottom: 14, background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat" }}>
              {spatTl(nazpat)}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titul}</h1>
                <span style={{ fontSize: 13, color: "var(--ink3)" }}>{dnesText()}</span>
              </span>
              {!BEZ_PRIDAT.includes(sub) && <button type="button" onClick={pridatTl} style={{ ...tlZ, height: 44, padding: "0 18px", borderRadius: 13, fontSize: 15 }}>{PRIDAT_T[sub] ?? "+ Pridať"}</button>}
            </header>
            {test}
            <div key={sub} style={{ display: "flex", flexDirection: "column", gap: 14, animation: "spravaFade .2s ease both" }}>{obsah[sub]}</div>
          </main>
        </div>
        {vrstvy}
      </div>);
  }

  // ================= MOBIL a TABLET =================
  const mTitul = titul;
  return (
    <div className="sprava-charity" data-stit="silver" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 5, flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "var(--metal) left bottom/100% var(--mH,3px) no-repeat, var(--bg)" }}>
        {spatTl(nazpat)}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <b style={{ maxWidth: "100%", fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mTitul}</b>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>{dnesText()}</span>
        </span>
        <span aria-hidden="true" style={{ flex: "none", width: 44 }} />
      </header>
      <div key={sub} style={{ padding: "12px 14px 180px", display: "flex", flexDirection: "column", gap: 12, animation: "spravaFade .2s ease both", width: "100%", maxWidth: tablet ? 880 : undefined, margin: tablet ? "0 auto" : undefined, boxSizing: "border-box" }}>
        {obsah[sub]}
        {test}
      </div>
      {/* KARTA 57 B.2: zelené + vpravo dole nad lištou appky */}
      {!BEZ_PRIDAT.includes(sub) && !pridat && <button type="button" onClick={pridatTl} aria-label={(PRIDAT_T[sub] ?? "+ Pridať").slice(2)} style={{ position: "fixed", right: 16, bottom: "calc(112px + env(safe-area-inset-bottom, 0px))", zIndex: 30, width: 58, height: 58, border: "none", borderRadius: "50%", background: "#4B7A35", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px rgba(30,60,20,.4)" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>}
      {vrstvy}
    </div>);
}
