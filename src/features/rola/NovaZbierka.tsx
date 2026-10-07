// ============================================================
// KARTA 37 · OPRAVY 114 — Nová zbierka (program Zadarmo aj vyššie). Obsahová časť správy charity
// (ako Upraviť profil), na mobile celá obrazovka. 6 krokov: Obsah · Fotky a video · Suma a účet ·
// Platby · Dokladovanie · Kontrola → Podržte a zapečaťte → Zbierka beží.
// Editor, výrez a detail zbierky = existujúce RichTextInput, OrezFotky, ZbierkaModul, PodrzTlacidlo.
// Hranice programov z stav.ts (PROGRAM_TIER), nič napevno. Texty z prototypu Nova zbierka PC.
// KARTA 56D §6 · farnosť (prop `farnost`, prototyp „Nova zbierka farnosti" = ZbierkyZakladny): 5 krokov
// Obsah · Fotky a video · Suma a účet · Platby · Kontrola — bez dĺžky, dokladovania, pravidelnej podpory a štítu;
// účet zamknutý „Na účet hlavnej zbierky"; náhľad „Na stránke farnosti" bez cudzích zbierok.
// ============================================================
import { toast } from "@/components/toast";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { OrezFotky } from "@/components/orezfotky";
import { ZbierkaModul, type ZbierkaData } from "@/features/zbierka/ZbierkaModul";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { potvrditTuknutim } from "@/features/zbierka/Platba";
import { PROGRAM_TIER, nacitajIbanOrg, type Pozicia, type Tier } from "./stav";
import { eurcText, HLAVNY_UCET } from "./NastaveniaCharity";
import { OverenieUctu, useOverenieUctu } from "./OverenieUctu";
import {
  prazdnaZbierka, konceptZbierkyZPamate, nacitajKonceptZbierky, ulozKonceptZbierky, spustiZbierku, lehotaZbierky, cielCislo, jeIne,
  DLHA_FEED_TEXT, DLHA_PRIEBEZNE_TEXT, SADY, SADY_EURC, KROKY_ZBIERKY, UCELY, LEHOTY, NAZOV_ZB, RIADKY_ZB,
  type NovaZbierkaData, type SpustenaZbierka,
} from "@/lib/novaZbierka";
import { uvodZPamate, nacitajUvod, potvrdUvod } from "@/lib/profilStranky";
import { VERIME_VAM, SUHLAS_FOTKY, SUHLAS_POZNAMKA, SUHLAS_CHYBA, PRED_SPUSTENIM_NADPIS, PRED_SPUSTENIM, PRAVDIVA_ZBIERKA } from "@/lib/pravidlaObsahu";

import { Ik, I, Zamok, vyber, panel, pole, pozn, fmtEur, fmtSek, cis, cistyText, Media, Volby, Nadpis, Zaskrtnutie, odkaz, PravidlaObsahu, TextovePolia, GaleriaEditor } from "./obsahZbierky";

export function NovaZbierka({ strankaId, pozicia, tier, nazov, inicialy, mobil, tablet, stit, onMojeZbierky, farnost }: {
  strankaId: string; pozicia: Pozicia; tier: Tier; nazov: string; inicialy: string; mobil: boolean; tablet: boolean; stit: string;
  /** „Moje zbierky" (hotovo) */
  onMojeZbierky: () => void;
  /** KARTA 56D §6: zbierka farnosti — účet hlavnej zbierky, po zapečatení späť do Zbierok */
  farnost?: { ucet: string; onSpustena: (z: SpustenaZbierka) => void };
}) {
  const ph = mobil && !tablet;
  const zadarmo = !!farnost || tier < PROGRAM_TIER.P1; // farnosť: jeden účet (hlavnej zbierky), bez dlhodobej a pravidelnej
  const KROKY = farnost ? [1, 2, 3, 4, 6] : [1, 2, 3, 4, 5, 6];
  const eurcRezim = eurcText(); // "nie" | "pre všetky zbierky" | "podľa zbierky"
  const hlavnyUcet = farnost?.ucet || nacitajIbanOrg(pozicia) || HLAVNY_UCET;
  const [d, setD] = useState<NovaZbierkaData>(() => konceptZbierkyZPamate(strankaId) ?? prazdnaZbierka());
  const zmenene = useRef(false);
  const [nacitane, setNacitane] = useState(false);
  useEffect(() => { let ziva = true; void nacitajKonceptZbierky(strankaId).then((k) => { if (ziva && k && !zmenene.current) setD(k); if (ziva) setNacitane(true); }); return () => { ziva = false; }; }, [strankaId]);
  const zmen = (z: Partial<NovaZbierkaData>) => { zmenene.current = true; setD((x) => ({ ...x, ...z })); };
  // ROZPÍSANÉ SA UKLADÁ SAMO — 600 ms po poslednej zmene, do účtu stránky
  useEffect(() => {
    if (!zmenene.current || !nacitane) return;
    const t = window.setTimeout(() => { void ulozKonceptZbierky(strankaId, d); }, 600);
    return () => window.clearTimeout(t);
  }, [d, strankaId, nacitane]);

  const k = KROKY.includes(d.krok) ? d.krok : KROKY.find((n) => n > d.krok) ?? 6;
  const ki = KROKY.indexOf(k);
  const [riadky, setRiadky] = useState(0);
  const [ok, setOk] = useState(false);
  const [vyrezId, setVyrezId] = useState<number | null>(null);
  const [nahlad, setNahlad] = useState<null | "str" | "detail">(null);
  const [hotovo, setHotovo] = useState<SpustenaZbierka | null>(null);
  const [pozriet, setPozriet] = useState(false);
  // karta 37 · bod 8: „Veríme vám" raz pred prvou zbierkou (rovnaké úložisko ako pri skutku za charitu)
  const [uvodOn, setUvodOn] = useState(() => !uvodZPamate(strankaId, "zbierka") && !uvodZPamate(strankaId, "skutok"));
  useEffect(() => { let ziva = true; void nacitajUvod(strankaId).then((u) => { if (ziva) setUvodOn(!u.zbierka && !u.skutok); }); return () => { ziva = false; }; }, [strankaId]);
  const [pravidla, setPravidla] = useState(false);
  const hore = useRef<HTMLDivElement>(null);
  // pri zmene kroku hore na začiatok správy (hlavička ostane vidno), nie pri prvom otvorení
  const prvy = useRef(true);
  useEffect(() => { if (prvy.current) { prvy.current = false; return; } (hore.current?.closest(".sprava-charity") as HTMLElement | null)?.scrollIntoView?.({ block: "start" }); }, [k, nahlad, hotovo]);

  // ---------- chyby krokov (texty z prototypu) ----------
  const fotiek = d.media.filter((m) => m.typ === "foto").length;
  const video = d.media.find((m) => m.typ === "video");
  const iban = d.iban.replace(/\s/g, "");
  // KARTA 39 · bod 2: vlastný účet (od P1) sa overuje overovacou platbou; kým nie je overený, zbierka sa nespustí
  const overenie = useOverenieUctu(strankaId, zadarmo ? "" : d.iban);
  const chybaKroku = (n: number): string => {
    if (n === 1) { if (!d.nazov.trim()) return "Doplňte názov zbierky"; if (!cistyText(d.popis)) return "Napíšte hlavný text"; if (riadky > RIADKY_ZB) return "Hlavný text je dlhší ako 12 riadkov"; }
    if (n === 2) { if (!fotiek) return "Pridajte aspoň jednu fotku"; if (!d.suhlas) return SUHLAS_CHYBA; }
    if (n === 3) {
      if (d.cielTyp === "ciel" && !(cielCislo(d) > 0)) return "Zadajte cieľovú sumu";
      if (!zadarmo && (!/^SK\d{2}/i.test(iban) || iban.length !== 24)) return "Zadajte transparentný účet (IBAN má 24 znakov a začína SK)"; // Zadarmo: IBAN sa nekontroluje
    }
    if (n === 5 && !farnost) { if (d.ucel == null) return "Vyberte, na aký účel zbierate"; if (jeIne(d)) { if (!d.ineT.trim()) return "Napíšte, na čo zbierate"; if (d.ineL == null) return "Vyberte lehotu na doklady"; } }
    if (n === 6 && !zadarmo && overenie?.stav !== "overeny") return "Účet zbierky ešte nie je overený";
    if (n === 6 && !ok) return "Potvrďte, že ste údaje skontrolovali";
    return "";
  };
  const chyba = chybaKroku(k);
  const hotoveDo = KROKY.slice(0, -1).findIndex((n) => chybaKroku(n));
  const maxK = hotoveDo === -1 ? 6 : KROKY[hotoveDo];
  const naKrok = (n: number) => { if (n <= maxK) zmen({ krok: n }); };
  const dalej = () => { if (!chyba && ki < KROKY.length - 1) zmen({ krok: KROKY[ki + 1] }); };
  const spat = () => { if (ki > 0) zmen({ krok: KROKY[ki - 1] }); };
  const zapecat = async () => {
    if (chyba) return;
    try {
      const z = await spustiZbierku(strankaId, zadarmo ? { ...d, typ: "kratka", iban: "", prav: false, ...(farnost ? { ucel: null, farnost: { druh: "farnost" as const } } : {}) } : d, zadarmo ? hlavnyUcet : d.iban, farnost ? "nabozenstvo" : undefined);
      if (farnost) { farnost.onSpustena(z); return; }
      setHotovo(z);
    } catch (e) { toast(e instanceof Error ? e.message : "Zbierku sa nepodarilo spustiť."); }
  };

  // ---------- súhrn a odvodené údaje ----------
  const dlha = !zadarmo && d.typ === "dlha";
  const leh = lehotaZbierky(d, dlha);
  const maCiel = d.cielTyp === "ciel";
  const eurcOn = eurcRezim === "pre všetky zbierky" || (eurcRezim === "podľa zbierky" && d.eurc);
  const typT = zadarmo || d.typ === "kratka" ? "Krátkodobá · 30 dní" : `Dlhodobá · ${d.mesiace} mesiacov`;
  const dokladyT = d.ucel != null ? `${jeIne(d) ? d.ineT.trim() || "Iné" : UCELY[d.ucel][0]} · ${leh.text || "—"}` : "—";
  const suhrn: [string, string, number, boolean][] = farnost ? [
    ["Názov", d.nazov || "—", 1, true], ["Popis", cistyText(d.popis).slice(0, 140) || "—", 1, true],
    ["Fotky a video", `${fotiek} ${fotiek === 1 ? "fotka" : fotiek >= 2 && fotiek <= 4 ? "fotky" : "fotiek"} · ${video ? `video ${fmtSek(video.sek ?? 0)}` : "bez videa"}`, 2, false],
    ["Suma", maCiel ? fmtEur(cielCislo(d)) : "otvorená, bez cieľa", 3, true], ["Kam prídu peniaze", "Na účet hlavnej zbierky", 3, true],
    ["Rýchle sumy", `${SADY[d.sada][0]} · ${SADY[d.sada][1].join(" · ")} €`, 4, false],
    ...(eurcRezim === "nie" ? [] : [["Dary v EURC", eurcOn ? `áno · ${SADY_EURC[d.sadaE][0]} ${SADY_EURC[d.sadaE][1].map(cis).join(" · ")}` : "nie", 4, false] as [string, string, number, boolean]]),
  ] : [
    ["Názov", d.nazov || "—", 1, true], ["Popis", cistyText(d.popis).slice(0, 140) || "—", 1, true],
    ["Fotky a video", `${fotiek} ${fotiek === 1 ? "fotka" : fotiek >= 2 && fotiek <= 4 ? "fotky" : "fotiek"} · ${video ? `video ${fmtSek(video.sek ?? 0)}` : "bez videa"} · hlavné: ${d.media[0] ? (d.media[0].typ === "video" ? "video" : "fotka 1") : "—"}`, 2, false],
    ["Ako dlho", typT, 3, true], ["Suma", maCiel ? fmtEur(cielCislo(d)) : "otvorená, bez cieľa", 3, true],
    [zadarmo ? "Kam prídu peniaze" : "Transparentný účet", zadarmo ? `${hlavnyUcet} · hlavný účet` : d.iban ? `${d.iban} · ${overenie?.stav === "overeny" ? "overený" : "čaká na overenie"}` : "—", 3, true],
    ["Rýchle sumy", `${SADY[d.sada][0]} · ${SADY[d.sada][1].join(" · ")} €`, 4, false],
    ...(eurcRezim === "nie" ? [] : [["Dary v EURC", eurcOn ? `áno · ${SADY_EURC[d.sadaE][0]} ${SADY_EURC[d.sadaE][1].map(cis).join(" · ")}` : "nie", 4, false] as [string, string, number, boolean]]),
    ...(zadarmo ? [] : [["Pravidelná podpora", d.prav ? "áno, sumu volí darca" : "nie", 4, false] as [string, string, number, boolean]]), ["Dokladovanie", dokladyT, 5, true],
  ];
  const zbierkaData = (id = "nova"): ZbierkaData => ({
    id, nazov: d.nazov || "Názov zbierky", popis: (d.popis || "<p>Hlavný text zbierky</p>") + (cistyText(d.popis2) ? d.popis2 : ""), overena: true,
    media: d.media.map((m) => ({ typ: m.typ, src: m.src, popis: m.popis })), vyzbierane: 0, ciel: maCiel ? cielCislo(d) : undefined, ludia: 0, rychleSumy: SADY[d.sada][1],
  });

  // ============ VÝREZ FOTKY ============
  const vyrezM = vyrezId != null ? d.media.find((m) => m.id === vyrezId) : null;
  if (vyrezM) return (
    <section ref={hore as never} style={{ ...panel, gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 22, fontWeight: 800 }}>Výrez fotky</span><span style={{ fontSize: 14, color: "var(--ink2)" }}>{ph ? "Posuňte prstom, kam treba." : "Takto bude fotka vyzerať v zbierke. Chyťte ju myšou a posuňte, kam treba."}</span></div>
      <OrezFotky sprava src={vyrezM.src} pomer={16 / 9} vyrez={vyrezM.vyrez} onZrusit={() => setVyrezId(null)}
        onVyrez={(v) => { zmen({ media: d.media.map((m) => (m.id === vyrezM.id ? { ...m, vyrez: v } : m)) }); setVyrezId(null); }} />
    </section>);

  // ============ HOTOVO · ZBIERKA BEŽÍ ============
  if (hotovo && pozriet) return <ZbierkaModul zbierka={{ ...zbierkaData(hotovo.id), nazov: hotovo.nazov }} miesto="charita" zoStrankyOrg onBack={() => setPozriet(false)} spatNazov="Späť" />;
  if (hotovo) return (
    <section ref={hore as never} style={{ ...panel, alignItems: "center", textAlign: "center", padding: ph ? "36px 20px" : "56px 32px", gap: 14 }}>
      <span style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--gSoft)", border: "1.5px solid var(--gBd)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={I.fajka} s={34} w={2.6} /></span>
      <span style={{ fontSize: 26, fontWeight: 800 }}>Zbierka beží</span>
      <span style={{ maxWidth: 560, fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>„{hotovo.nazov}“ je zapečatená a vidia ju darcovia{ph ? "." : " na vašom profile aj vo feede. Fotky a video môžete pridávať aj teraz."}</span>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
        <button type="button" onClick={() => setPozriet(true)} style={{ height: 50, padding: "0 22px", border: "none", borderRadius: 14, background: "var(--green)", color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Pozrieť zbierku</button>
        <button type="button" onClick={onMojeZbierky} style={{ height: 50, padding: "0 22px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Moje zbierky</button>
      </div>
    </section>);

  // ============ NÁHĽAD (čo uvidí darca) ============
  if (nahlad) {
    const hl = d.media[0];
    const tab = (t: "str" | "detail", n: string) => { const on = nahlad === t; return <button key={t} type="button" role="tab" aria-selected={on} onClick={() => setNahlad(t)} style={{ flex: ph ? 1 : "none", height: 40, padding: "0 16px", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, background: on ? "var(--seg)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", boxShadow: on ? "0 1px 3px rgba(30,28,20,.14)" : "none" }}>{n}</button>; };
    const kartaMini = (n: string, meta: string, suma: string, bg: ReactNode, nova?: boolean) => (
      <button type="button" onClick={nova ? () => setNahlad("detail") : undefined} style={{ borderRadius: 18, overflow: "hidden", background: "var(--card)", border: nova ? "2px solid var(--green)" : "1px solid var(--cardBd)", padding: 0, textAlign: "left", fontFamily: "inherit", cursor: nova ? "pointer" : "default", display: "flex", flexDirection: "column" }}>
        <span style={{ display: "block", aspectRatio: "16 / 9", position: "relative", overflow: "hidden", background: "var(--track)" }}>{bg}</span>
        <span style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {nova && <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--green)" }}>VAŠA NOVÁ ZBIERKA</span>}
          <b style={{ fontSize: 15.5, color: "var(--ink)" }}>{n}</b>
          <span style={{ height: 6, borderRadius: 3, background: "var(--track)" }} />
          <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, color: "var(--ink3)" }}><span>{meta}</span><b style={{ color: "var(--ink)" }}>{suma}</b></span>
        </span>
      </button>);
    return (<>
      <div ref={hore} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setNahlad(null)} style={{ height: 44, padding: "0 14px 0 8px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}><Ik d={I.vlavo} s={18} w={2.4} />Späť na kontrolu</button>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)" }}>NÁHĽAD</span>
        <div role="tablist" style={{ display: "flex", gap: 2, padding: 4, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", flex: ph ? "1 1 100%" : "none" }}>{tab("str", farnost ? "Na stránke farnosti" : "Na stránke charity")}{tab("detail", "Detail zbierky")}</div>
        {!ph && <span style={{ fontSize: 14, color: "var(--ink3)" }}>Takto zbierku uvidí darca</span>}
      </div>
      {nahlad === "str" ? <section style={{ ...panel }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gInk)" }}>{inicialy}</span>
          <span style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15 }}>{nazov}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{farnost ? "Farnosť · overená" : "Charita · overená"}</span></span></div>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ZBIERKY</span>
        <div style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: 12 }}>
          {kartaMini(d.nazov || "Názov zbierky", farnost ? "zbierka farnosti" : typT === "Krátkodobá · 30 dní" ? "ešte 30 dní" : `ešte ${d.mesiace} mesiacov`, maCiel ? `0 / ${fmtEur(cielCislo(d))}` : "0 € · otvorená", hl ? <Media m={hl} /> : null, true)}
          {/* KARTA 56D §6: farnosť — len nová zbierka, žiadne cudzie (ukážkové) */}
          {!farnost && kartaMini("Strecha pre rodinu Horváthovú", "ešte 9 dní", "8 420 / 12 000 €", <img src="/img/sprava/dom.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />)}
          {!farnost && kartaMini("Centrálna zbierka Svetla pomoci", "na celú činnosť", "2 180 € · otvorená", <span style={{ display: "block", width: "100%", height: "100%", background: "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)" }} />)}
        </div>
        <span style={pozn}>Kliknite na svoju zbierku a otvorí sa detail, ktorý uvidí darca.</span>
      </section> : <ZbierkaModul zbierka={zbierkaData()} miesto="charita" zoStrankyOrg onBack={() => setNahlad(null)} spatNazov="Späť na kontrolu" />}
    </>);
  }

  // ============ KROKY ============
  const stepper = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!ph && <div style={{ display: "flex", justifyContent: "flex-end" }}><span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />Rozpísané sa ukladá samo</span></div>}
      <div role="list" aria-label="Kroky" style={{ display: "grid", gridTemplateColumns: `repeat(${KROKY.length},minmax(0,1fr))`, gap: ph ? 5 : 10 }}>
        {KROKY.map((n, i) => { const t = KROKY_ZBIERKY[n - 1], akt = n === k, hot = n < k, moze = n <= maxK; return (
          <button key={t} role="listitem" type="button" onClick={() => naKrok(n)} aria-current={akt ? "step" : undefined} style={{ border: "none", background: "transparent", padding: 0, cursor: moze ? "pointer" : "default", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 8, textAlign: "left", minHeight: ph ? 12 : 44 }}>
            <span style={{ height: 4, borderRadius: 2, background: n <= k ? "var(--green)" : "var(--track)", transition: "background .3s ease" }} />
            {!ph && <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", background: akt ? "var(--ink)" : hot ? "var(--green)" : "var(--track)", color: akt || hot ? "#fff" : "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{hot ? <Ik d={I.fajka} s={13} w={3} /> : i + 1}</span>
              <span style={{ fontSize: 14, fontWeight: akt ? 800 : 700, color: akt ? "var(--ink)" : "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</span>
            </span>}
          </button>); })}
      </div>
      {ph && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>Krok {ki + 1} z {KROKY.length} · {KROKY_ZBIERKY[k - 1]}</span>}
    </div>);

  const hlavicka = (t: string, s: string) => <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: ph ? 22 : 26, fontWeight: 800, color: "var(--ink)" }}>{t}</span><span style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink3)" }}>{s}</span></div>;
  let obsah: ReactNode;

  if (k === 1) {
    obsah = <>{uvodOn && <section className="pf-rise" style={{ borderRadius: 22, background: "var(--gSoft)", border: "1.5px solid var(--gBd)", padding: ph ? "18px 18px" : "22px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 21, fontWeight: 800, color: "var(--ink)" }}>{VERIME_VAM.nadpis}</span>
        {VERIME_VAM.odseky.map((t) => <span key={t} style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>{t}</span>)}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
          <button type="button" onClick={() => { setUvodOn(false); void potvrdUvod(strankaId, "zbierka"); }} style={{ height: 48, padding: "0 24px", border: "none", borderRadius: 14, background: "var(--green)", color: "#fff", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, cursor: "pointer" }}>Rozumiem</button>
          <button type="button" onClick={() => setPravidla(true)} style={{ ...odkaz, fontSize: 14.5 }}>Pravidlá obsahu ›</button>
        </div>
      </section>}
      {hlavicka("O čom je zbierka", "Napíšte to tak, ako by ste to povedali susedovi.")}
      <section style={panel}>
        <Nadpis t="Názov zbierky" pecat />
        <input value={d.nazov} onChange={(e) => zmen({ nazov: e.target.value.slice(0, NAZOV_ZB) })} maxLength={NAZOV_ZB} placeholder="Napríklad: Invalidný vozík pre Ninu" aria-label="Názov zbierky" style={pole} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: -6 }}><span style={pozn}>Krátko a jasne: komu a na čo.</span><span style={{ ...pozn, fontWeight: 800, flex: "none" }}>{d.nazov.length} / {NAZOV_ZB}</span></div>
        <TextovePolia popis={d.popis} popis2={d.popis2} onPopis={(h) => zmen({ popis: h })} onPopis2={(h) => zmen({ popis2: h })} ph={ph} pecat onRiadky={setRiadky} />
      </section></>;
  } else if (k === 2) {
    obsah = <>{hlavicka("Fotky a video", ph ? "Prvé je hlavné, to ľudia uvidia ako prvé. Poradie zmeníte šípkami." : "Skutočné fotky človeka alebo miesta, komu pomáhate. Tvár a hlas presvedčia viac než text.")}
      <GaleriaEditor media={d.media} onMedia={(m) => zmen({ media: m })} ph={ph} onVyrez={setVyrezId}>
      <Zaskrtnutie on={!!d.suhlas} onClick={() => zmen({ suhlas: !d.suhlas })}>{SUHLAS_FOTKY}</Zaskrtnutie>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", marginTop: -4 }}>{SUHLAS_POZNAMKA}{" "}<button type="button" onClick={() => setPravidla(true)} style={odkaz}>Pravidlá obsahu ›</button></span>
      </GaleriaEditor></>;
  } else if (k === 3) {
    obsah = <>{hlavicka("Suma a účet", farnost ? "Koľko potrebujete a kam peniaze prídu." : "Koľko potrebujete, ako dlho a kam peniaze prídu.")}
      <section style={panel}>
        {!farnost && <><Nadpis t={ph ? "Ako dlho bude bežať" : "Ako dlho bude zbierka bežať"} pecat />
        <Volby stlpce={2} value={zadarmo ? "kratka" : d.typ} onChange={(t) => zmen({ typ: t })} moznosti={[
          { k: "kratka" as const, t: "Krátkodobá", s: "30 dní, na jednu konkrétnu vec" },
          { k: "dlha" as const, t: "Dlhodobá", s: zadarmo ? "vo vyššom programe" : "3 až 12 mesiacov", zamok: zadarmo },
        ]} />
        {dlha && <>
          <Volby stlpce={3} vyska={48} value={d.mesiace} onChange={(m) => zmen({ mesiace: m })} moznosti={([3, 6, 12] as const).map((m) => ({ k: m, t: `${m} mesiacov` }))} />
          <span style={{ padding: "12px 16px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{DLHA_FEED_TEXT}</span>
        </>}</>}
        <Nadpis t="Suma" pecat />
        <Volby stlpce={2} value={d.cielTyp} onChange={(t) => zmen({ cielTyp: t })} moznosti={[{ k: "ciel" as const, t: "Cieľová suma", s: "viem, koľko potrebujem" }, { k: "otv" as const, t: "Otvorená", s: "bez cieľa, koľko sa vyzbiera" }]} />
        {maCiel && <label style={{ position: "relative", display: "block", maxWidth: ph ? undefined : 320 }}>
          <input value={cielCislo(d) ? cielCislo(d).toLocaleString("sk-SK").replace(/\u00A0/g, " ") : ""} onChange={(e) => zmen({ ciel: e.target.value.replace(/\D/g, "").slice(0, 7) })} inputMode="numeric" placeholder="Napríklad 4 000" aria-label="Cieľová suma v eurách" style={{ ...pole, paddingRight: 40 }} />
          <span style={{ position: "absolute", right: 16, top: 15, fontSize: 16, fontWeight: 800, color: "var(--ink3)" }}>€</span>
        </label>}
        {farnost ? <>
          <Nadpis t="Kam prídu peniaze" />
          <div style={{ ...pole, display: "flex", alignItems: "center", gap: 10, background: "var(--btn)", color: "var(--ink2)", maxWidth: ph ? undefined : 520 }}><Zamok s={15} /><span>Na účet hlavnej zbierky</span></div>
          <span style={{ ...pozn, marginTop: -6 }}>Všetky zbierky farnosti idú na jeden účet. Každá má vlastné počítadlo.</span>
        </> : zadarmo ? <>
          <Nadpis t="Kam prídu peniaze" />
          <div style={{ ...pole, display: "flex", alignItems: "center", gap: 10, background: "var(--btn)", color: "var(--ink2)", maxWidth: ph ? undefined : 520 }}><Zamok s={15} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hlavnyUcet}</span></div>
          <span style={{ ...pozn, marginTop: -6 }}>Hlavný účet organizácie z registrácie. Vlastný účet pre každú zbierku je vo vyššom programe.</span>
        </> : <>
          <Nadpis t={ph ? "Transparentný účet" : "Transparentný účet zbierky"} pecat />
          <input value={d.iban} onChange={(e) => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24); zmen({ iban: v.replace(/(.{4})/g, "$1 ").trim() }); }} placeholder="SK00 0000 0000 0000 0000 0000" aria-label="Transparentný účet zbierky" style={{ ...pole, maxWidth: ph ? undefined : 520 }} />
          <span style={{ ...pozn, marginTop: -6 }}>{ph ? "Pohyby na ňom vidí každý." : "Pohyby na ňom vidí každý. Pri zbierke ho ukážeme darcom."}</span>
          <OverenieUctu stranka={strankaId} iban={d.iban} ph={ph} />
        </>}
      </section></>;
  } else if (k === 4) {
    obsah = <>{hlavicka("Ako budú ľudia darovať", "Rýchle sumy a možnosti, ktoré darca uvidí pri zbierke.")}
      <section style={panel}>
        <Nadpis t={ph ? "Rýchle sumy" : "Rýchle sumy pre darcov"} />
        <Volby stlpce={ph ? 1 : 3} vyska={ph ? 52 : 62} value={d.sada} onChange={(i) => zmen({ sada: i })} moznosti={SADY.map(([t, a], i) => (ph ? { k: i, t, vpravo: `${a.join(" · ")} €` } : { k: i, t, s: `${a.join(" · ")} €` }))} />
        <span style={{ ...pozn, marginTop: -6 }}>{ph ? "Vlastnú sumu môže darca zadať vždy. Pod 3 € len SEPA." : "Vlastnú sumu môže darca zadať vždy. Sumy pod 3 € idú len cez SEPA."}</span>
        {eurcRezim === "pre všetky zbierky" && <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{ph ? "Dary v EURC sú zapnuté pre všetky zbierky." : "Dary v kryptomene EURC sú zapnuté pre všetky zbierky"}</b><span style={pozn}>{ph ? "Zmeníte v Nastaveniach stránky." : "Zmeniť to môžete v Nastaveniach stránky."}</span></div>}
        {eurcRezim === "podľa zbierky" && <>
          <Nadpis t={ph ? "Dary v EURC pri tejto zbierke" : "Dary v kryptomene EURC pri tejto zbierke"} />
          <Volby stlpce={2} vyska={50} value={d.eurc} onChange={(v) => zmen({ eurc: v })} moznosti={[{ k: true, t: "Áno" }, { k: false, t: "Nie" }]} />
          {!ph && <span style={{ ...pozn, marginTop: -6 }}>EURC je digitálne euro 1 : 1. V Nastaveniach stránky máte zvolené „podľa zbierky“.</span>}
        </>}
        {eurcOn && <>
          <Nadpis t="Rýchle sumy v EURC" />
          <Volby stlpce={ph ? 1 : 3} vyska={ph ? 52 : 62} value={d.sadaE} onChange={(i) => zmen({ sadaE: i })} moznosti={SADY_EURC.map(([t, a], i) => (ph ? { k: i, t, vpravo: a.map(cis).join(" · ") } : { k: i, t, s: a.map(cis).join(" · ") }))} />
        </>}
        {/* OPRAVY 124: pravidelná podpora je až od P1 — v Zadarmo sa neukáže */}
        {!zadarmo && <>
        <Nadpis t={ph ? "Pravidelná podpora" : "Pravidelná podpora pri tejto zbierke"} />
        <Volby stlpce={2} value={d.prav} onChange={(v) => zmen({ prav: v })} moznosti={[{ k: true, t: "Áno, ponúknuť", s: "darcovia môžu dávať každý mesiac" }, { k: false, t: "Nie", s: "len jednorazové dary" }]} />
        <span style={{ ...pozn, marginTop: -6 }}>{ph ? "Sumu si volí darca sám." : "Sumu pravidelnej podpory si volí darca sám, keď ju nastavuje. Vy len rozhodnete, či ju pri tejto zbierke ponúknete."}</span>
        </>}
      </section></>;
  } else if (k === 5) {
    obsah = <>{hlavicka("Dokladovanie", ph ? "Vyberte účel. Lehotu na doklady nastavíme sami." : "Darcovia chcú vidieť, na čo išli ich peniaze. Podľa účelu nastavíme lehotu sami.")}
      <section style={panel}>
        {!ph && <Nadpis t="Na aký účel zbierate" pecat />}
        <div role="radiogroup" aria-label="Účel zbierky" style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
          {UCELY.map(([t, l, p], i) => { const on = d.ucel === i; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => zmen({ ucel: i })} style={{ ...vyber(on), minHeight: 70, padding: "12px 16px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", border: `2px solid ${on ? "var(--green)" : "#BDB6A8"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0 }} /></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 12.5, fontWeight: 700, color: on ? "var(--gInk)" : "var(--ink3)" }}>{p}</span>{ph && <span style={{ fontSize: 12.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink2)" }}>{l}</span>}</span>
              {!ph && <span style={{ flex: "none", maxWidth: 120, textAlign: "right", fontSize: 12.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink2)" }}>{l}</span>}
            </button>); })}
        </div>
        {jeIne(d) && <>
          <Nadpis t="Na čo zbierate" />
          <input value={d.ineT} onChange={(e) => zmen({ ineT: e.target.value.slice(0, 80) })} placeholder="Napíšte, na čo zbierate" aria-label="Na čo zbierate" style={pole} />
          <Nadpis t="Lehota na doklady" />
          <Volby stlpce={ph ? 2 : 4} vyska={50} value={d.ineL} onChange={(i) => zmen({ ineL: i })} moznosti={LEHOTY.map(([t], i) => ({ k: i, t }))} />
        </>}
        {d.ucel != null && leh.text && <div style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 12 }}>
          <div style={{ padding: "16px 18px", borderRadius: 16, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--gInk)" }}>LEHOTA NA DOKLADY</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{leh.text}</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>{ph ? "Po spustení sa nedá zmeniť. Predĺžiť len na žiadosť so zdôvodnením, zadarmo." : "Po spustení sa nedá zmeniť, ani v správe zbierky. Predĺžiť ju môžete len na žiadosť so zdôvodnením, zadarmo."}</span>
            {dlha && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>{DLHA_PRIEBEZNE_TEXT}</span>}
          </div>
          {!ph && <div style={{ padding: "16px 18px", borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ČO DARCOVIA UVIDIA</span>
            <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink2)" }}>Pri zbierke lehotu „{leh.text}“. Keď doložíte, zmení sa na zelené <b style={{ color: "var(--green)" }}>doložené</b>. Po lehote bez dokladov sa na profile ukáže „čaká na doklady“.</span>
          </div>}
        </div>}
      </section></>;
  } else {
    obsah = <>{hlavicka(ph ? "Kontrola" : "Kontrola pred spustením", ph ? "Údaje so zámkom sa po spustení nedajú zmeniť." : "Údaje so zámkom sa po spustení nedajú zmeniť, ani vami, ani nami. Najprv si pozrite, ako bude zbierka vyzerať.")}
      <div style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 12 }}>
        {(ph ? [["detail", "Pozrieť, ako ju uvidí darca", "aj s platbou", I.oko]] : [["str", farnost ? "Na stránke farnosti" : "Na stránke charity", "karta zbierky medzi ostatnými", I.karta], ["detail", "Detail zbierky", "čo darca uvidí po otvorení, aj s platbou", I.oko]]).map(([t, n, s, ic]) => (
          <button key={t} type="button" onClick={() => setNahlad(t as "str" | "detail")} style={{ minHeight: 76, padding: "14px 18px", borderRadius: 18, border: "1.5px solid var(--gBd)", background: "var(--gSoft)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: "var(--field)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={ic} s={20} /></span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16, color: "var(--gInk)" }}>{n}</b><span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gInk)" }}>{s}</span></span>
          </button>))}
      </div>
      <section style={{ ...panel, padding: 8, gap: 0, display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", columnGap: 8, rowGap: 8 }}>
        {suhrn.map(([kk, v, n, lock]) => (
          <div key={kk} style={{ minHeight: 60, padding: "10px 14px", borderRadius: 14, background: "var(--field)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>{kk}{lock && <Zamok s={12} />}</span>
              <b style={{ fontSize: 14.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</b>
            </span>
            <button type="button" onClick={() => zmen({ krok: n })} style={{ flex: "none", minHeight: 44, padding: "0 6px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)" }}>Upraviť</button>
          </div>))}
      </section>
      <section style={{ ...panel, padding: ph ? "16px 18px" : "16px 20px", gap: 10 }}>
        <b style={{ fontSize: 16, color: "var(--ink)" }}>{PRED_SPUSTENIM_NADPIS}</b>
        {PRED_SPUSTENIM.map((t) => <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}><span style={{ color: "var(--green)", display: "flex", flex: "none", marginTop: 2 }}><Ik d={I.fajka} s={18} w={2.6} /></span><span>{t}</span></div>)}
      </section>
      <Zaskrtnutie on={ok} onClick={() => setOk(!ok)}>{PRAVDIVA_ZBIERKA}</Zaskrtnutie></>;
  }

  // ---------- spodná lišta ----------
  const tuk = potvrditTuknutim();
  const chybaEl = chyba ? <span role="status" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#8A5A2B", minWidth: 0 }}><span style={{ width: 8, height: 8, flex: "none", borderRadius: "50%", background: "#C9A24A" }} />{chyba}</span> : null;
  const dalejEl = ki < KROKY.length - 1
    ? <button type="button" onClick={dalej} aria-disabled={!!chyba} style={{ flex: ph ? 1 : "none", height: 52, padding: "0 24px", border: "none", borderRadius: 14, background: chyba ? "#CFC9BC" : "var(--green)", color: chyba ? "#6B6C62" : "#fff", cursor: chyba ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>Pokračovať{!ph && <Ik d={I.vpravo} s={17} w={2.4} />}</button>
    : tuk
      ? <button type="button" onDoubleClick={() => void zapecat()} aria-disabled={!!chyba} style={{ flex: ph ? 1 : "none", height: 52, padding: "0 24px", border: "none", borderRadius: 14, background: chyba ? "#CFC9BC" : "var(--green)", color: chyba ? "#6B6C62" : "#fff", cursor: chyba ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800 }}>Dvakrát kliknite a zapečaťte</button>
      : <div style={{ flex: ph ? 1 : "none", width: ph ? undefined : 280, ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label="Podržte a zapečaťte" disabled={!!chyba} onConfirm={() => void zapecat()} /></div>;
  const spatEl = ki > 0 ? <button type="button" onClick={spat} aria-label="Späť" style={{ flex: "none", height: 52, minWidth: 52, padding: ph ? 0 : "0 18px 0 12px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: ph ? "var(--field)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Ik d={I.vlavo} s={18} w={2.4} />{!ph && "Späť"}</button> : null;

  const pravidlaEl = pravidla ? <PravidlaObsahu ph={ph} stit={stit} onZavri={() => setPravidla(false)} /> : null;
  if (ph) return (<>
    <div ref={hore} style={{ display: "flex", flexDirection: "column", gap: 16 }}>{stepper}{obsah}</div>{pravidlaEl}
    <div aria-hidden="true" style={{ height: chyba ? 120 : 90 }} />
    {createPortal(
      <div className="sprava-charity" data-stit={stit} style={{ position: "fixed", left: 12, right: 12, bottom: "calc(96px + env(safe-area-inset-bottom, 0px))", zIndex: 45, display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 18, background: "var(--panel)", border: "1px solid var(--cardBd)", boxShadow: "0 8px 24px rgba(30,28,20,.16)" }}>
        {chybaEl}
        <div style={{ display: "flex", gap: 10 }}>{spatEl}{dalejEl}</div>
      </div>, document.body)}
  </>);
  return (<>
    <div ref={hore} style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", maxWidth: 980, margin: "0 auto" }}>{stepper}<div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 820, margin: "0 auto" }}>{obsah}</div></div>{pravidlaEl}
    <div style={{ position: "sticky", bottom: 0, zIndex: 4, marginTop: 4, padding: "14px 0 16px", display: "flex", alignItems: "center", gap: 14, background: "var(--bg)", borderTop: "1px solid var(--cardBd)" }}>
      {spatEl}<span style={{ flex: 1 }} />{chybaEl}{dalejEl}
    </div>
  </>);
}
