// ============================================================
// KARTA 48 · bod 3 — Správa centrálnej a sektorov (1 : 1 podľa „Sprava centralnej a sektorovej zbierky").
// Hore rad: Celá činnosť · sektory (farebná bodka podľa poradia) · + Pridať sektor. Ťuk prepne celú správu.
// Záložky ako pri bežnej zbierke. Doklady len v záložke Doklady, dobrovoľné. Účet zamknutý (hlavný z registrácie),
// zmena len žiadosťou s dôvodom. Sektor: text zo stanov, názov, Zmazať sektor cez hárok. Ukladá sa samo (600 ms).
// KARTA 56B · farnosť (prop `farnost`): „Hlavná zbierka farnosti" — bez sektorov, dorovnania a Dokladov; prvý príchod
// prázdny (bez čísel a QR, „Spustiť hlavnú zbierku"); jeden účet pre všetky zbierky farnosti; okno „Na najbližšiu omšu"
// (týždenné obdobie hlavného účtu, mená bez súm); Ukončenie = Zmazať (len keď nebeží iná zbierka farnosti).
// KARTA 56D §5 · OPRAVY 160: hore „Hlavná zbierka" a riadok na názov (najviac 40 znakov), prázdny text a galéria,
// náhľad = skutočná karta modulu z profilu, Spustiť = kontrola Názov · Text · Titulná fotka + podržať 1,5 s,
// po spustení na tom istom mieste „Hlavná zbierka beží" a ďalší krok (QR plagát).
// ============================================================
import { naviazObjekt } from "@/lib/darZbierky";
import { useNeverejna } from "@/lib/zverejnenieStranky";
import { SumyPriDarcoch } from "./SumyPriDarcoch";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { profilZPamate } from "@/lib/profilStranky";
import { prazdnaCentralna, prazdnaHlavna, nazovHlavnej, HLAVNA_NAZOV_MAX, centralnaZPamate, nacitajCentralnuZbierku, ulozCentralnuZbierku, zmazCentralnuZbierku, type CentralnaZbierka } from "@/lib/centralnaZbierka";
import { cistyText } from "@/lib/richtext";
import { usePolozkyQr, PlagatOkno, QrZalozka } from "./QrNastroje";
import { KartaModulu } from "@/features/verejny-profil/ModulProfilu";
import { odkazQrStranky } from "@/features/verejny-profil/otvor";
import { suhrnHlavnej, datumOmse, textRiadkuOmse } from "@/lib/zvoncekOmse";
import { useZvoncek, podakovanieZvoncek } from "@/lib/zvoncekZbierka";
import { useSlovaFarnosti } from "@/lib/mojeFarnosti";
import { usePouzivatel } from "@/lib/pouzivatel";
import { Prepinac } from "@/features/profil/nastUi";
import {
  useSektory, obsahSektora, ulozObsahSektora, pridajSektor, zmazSektor, premenujSektor, ziadostUctu, poziadajOZmenuUctu,
  zavretaCentralna, zavriCentralnu, otvorCentralnu, vyberCentralnej, nastavVyberCentralnej, useZmenySektorov, vezmiNovySektor, jeNovySektor,
  NULA, SEKTORY_MAX, SEKTORY_OD_TIERU, STANOVY_CINNOSTI, type SektorCharity,
} from "@/lib/sektoryCharity";
import { nacitajStav, ulozStav, type StavZbierky } from "@/lib/zbierkaSprava";
import { nastavCiste, sucetDarov, darcoviaPre, identitaDarcu, relCas, zobrazenaSuma, useZmenyDarov, useSektorDarcu } from "@/lib/darcovia";
import { beziaceDorovnanieNaCiel, zostatok } from "@/lib/dorovnanie";
import { cisloObjektu } from "@/lib/cisloObjektu";
import { overIban, formatujIban } from "./segmenty";
import { TextovePolia, GaleriaEditor } from "./obsahZbierky";
import { DokladyCharity } from "./SpravaZbierky";
import { kartaK, nadpisK, textK, drobneK, obrysK, zelenyK, ZAMOK, SpatZbierky, UkladaSa, DorovnaniePas, useUkladanie, UlozenePri, PasUlozene, Taby, CislaKarta, AkoDarovat, QrKarta, Statistiky } from "./spravaCasti";
import { sumaEur } from "@/lib/suma";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { ChybaPriTlacidle } from "@/components/ChybaPriTlacidle";

const eur = (n: number) => `${sumaEur(n)}`;
const inic = (t: string) => t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const dnes = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };

// OPRAVY 442: ukážkové dary, doklady a štatistiky (Lucia B., Jana K., Pekáreň Dobrota …) zmazané — na stránke len skutočné.
// id starých ukážkových dokladov, ktoré mohli ostať uložené v zariadení → pri otvorení sa vyhodia
const STARE_UKAZKOVE_DOKLADY = new Set(["c1", "c2", "c3"]);

function novyStav(id: string, _farnost = false): StavZbierky { return { stav: "aktivna", koniec: new Date(Date.now() + 3650 * 86400000).toISOString(), predlzenia: 0, lehota: "30", text: "", fotky: [], doklady: [] /* OPRAVY 403 doplnok: bez ukážkových dokladov */, spravy: [] }; }

export function SpravaCentralnej({ strankaId, nazov, hlavnyUcet, tier, mobil, toast, onZbierky, onDorovnanie, onDarcovia, farnost, startQr, onTlacQr }: {
  strankaId: string; nazov: string; hlavnyUcet: string; tier: number; mobil: boolean; toast: (m: string) => void;
  onZbierky: () => void; onDorovnanie?: () => void; onDarcovia?: () => void;
  /** KARTA 56B · hlavná zbierka farnosti: beží iná zbierka farnosti (zmazať sa nedá) · po zmazaní späť na Zbierky
   *  KARTA 56D §5: onHotovo = „Hotovo · späť do Správy" po spustení */
  farnost?: { ostatneBezia: boolean; onZmazana: () => void; onHotovo: () => void; /** OPRAVY 340b: Zmeniť účet = Nastavenia → Účet farnosti */ onZmenitUcet?: () => void };
  /** OPRAVY 347: záložka QR — otvoriť rovno na nej (návrat z QR nástrojov) · Tlačiť › */ startQr?: boolean; onTlacQr?: (id: string) => void;
}) {
  useZmenySektorov(); useZmenyDarov();
  const sektory0 = useSektory(farnost ? "" : strankaId);
  const sektory = farnost ? [] : sektory0;
  const smieSektory = !farnost && tier >= SEKTORY_OD_TIERU;
  const [typ, setTyp] = useState(() => Math.min(vyberCentralnej(), smieSektory ? sektory.length : 0));
  const sek: SektorCharity | null = typ > 0 ? sektory[typ - 1] ?? null : null;
  const h = sek ? String(typ) : "0";
  const kluc = sek ? sek.id : "centralna";
  const idZbierky = `${strankaId}-${kluc}`;
  const neverejna = useNeverejna(strankaId); // OPRAVY 511
  // OPRAVY 445 (2): centrálna charity = dary z ledgera (stranka:hlavna), ten istý zdroj ako profil a zoznam v Správe
  if (!farnost && !sek) naviazObjekt(idZbierky, { stranka: strankaId, hlavna: true, nazov: "Celá činnosť" });
  const [tab, setTab] = useState(startQr ? 5 : 0); // OPRAVY 453: aj charita
  // OPRAVY 347: plagát hlavnej = jeden plagát pre všetky QR (QR farnosti)
  const qrFar = usePolozkyQr(strankaId, nazov).find((x) => x.id === "farnost");
  const [plOkno, setPlOkno] = useState(false);
  const [novySek, setNovySek] = useState(() => jeNovySektor() && smieSektory); // OPRAVY 486
  useEffect(() => { vezmiNovySektor(); }, []);
  const prepni = (i: number) => { setTyp(i); nastavVyberCentralnej(i); setNovySek(false); };

  // ---- obsah položky (text, galéria, sumy) — ukladá sa samo ----
  const nacitaj = (): CentralnaZbierka => (sek ? obsahSektora(sek.id) : centralnaZPamate(strankaId)) ?? (farnost ? prazdnaHlavna() : { ...prazdnaCentralna(), popis: "" }); // OPRAVY 414: charita — nič predvyplnené
  const [d, setD] = useState<CentralnaZbierka>(nacitaj);
  const [ulozene, setUlozene] = useState(false);
  const zmenene = useRef(false);
  // OPRAVY 515 (Martin 23. 10.): charita — žiadne samo ukladanie. Zmeny sú rozpracované, kým ich správca nepotvrdí
  // „Podržte a uložte“ (prvé uloženie centrálnu spustí) alebo nezruší „Zrušiť úpravy“. Farnosť sa ukladá sama ako doteraz.
  const ch = !farnost;
  const [ulozeneJson, setUlozeneJson] = useState(() => JSON.stringify(d));
  const neulozene = ch && JSON.stringify(d) !== ulozeneJson;
  useEffect(() => { zmenene.current = false; const x = nacitaj(); setD(x); setUlozeneJson(JSON.stringify(x)); setUlozene(false); }, [kluc]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sek) return; let ziva = true; void nacitajCentralnuZbierku(strankaId).then((c) => { if (ziva && c && !zmenene.current) { setD(c); setUlozeneJson(JSON.stringify(c)); } }); return () => { ziva = false; }; }, [strankaId, kluc]); // eslint-disable-line react-hooks/exhaustive-deps
  // OPRAVY 313: pri poli „Uložené ✓“ / „Neuložilo sa · Skúsiť znova“, dole pás Všetko je uložené
  const u = useUkladanie();
  const polia = useRef(new Set<string>());
  const dRef = useRef(d);
  useEffect(() => { dRef.current = d; }, [d]);
  const zapis = (x: CentralnaZbierka): Promise<string | null> => { if (sek) return ulozObsahSektora(sek.id, x); return ulozCentralnuZbierku(strankaId, x); };
  useEffect(() => {
    if (!zmenene.current || ch) return;
    const t = window.setTimeout(() => { const pl = [...polia.current]; polia.current.clear(); u.sleduj(pl, zapis(d), () => zapis(dRef.current)); setUlozene(true); }, 600);
    return () => window.clearTimeout(t);
  }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const zmen = (p: Partial<CentralnaZbierka>, pole = "ine") => { zmenene.current = true; polia.current.add(pole); setD((x) => ({ ...x, ...p })); };

  // ---- doklady (dobrovoľné) ----
  // OPRAVY 311: farnosť nikdy ukážkové doklady (aj keď už ostali uložené zo skoršieho otvorenia)
  const bezUkazok = (x: StavZbierky): StavZbierky => ({ ...x, doklady: x.doklady.filter((dk) => !STARE_UKAZKOVE_DOKLADY.has(dk.id)) });
  const [stav, setStav] = useState<StavZbierky>(() => bezUkazok(nacitajStav(idZbierky) ?? novyStav(idZbierky, !!farnost)));
  useEffect(() => { setStav(bezUkazok(nacitajStav(idZbierky) ?? novyStav(idZbierky, !!farnost))); }, [idZbierky]); // eslint-disable-line react-hooks/exhaustive-deps
  const zmenStav = (p: Partial<StavZbierky>) => setStav((x) => { const n = { ...x, ...p }; ulozStav(idZbierky, n); return n; });

  // ---- čísla a dary ----
  // OPRAVY 311: farnosť (Hlavná zbierka) nikdy ukážkové čísla — len skutočné súčty zo servera (ledger, 0096 s omšami)
  if (farnost) nastavCiste([idZbierky]); // ani ukážkoví darcovia
  // OPRAVY 403 doplnok: žiadne ukážkové čísla, dary ani dorovnanie (vymyslené prepojenia s Pekárňou a tvorcom zmazané) — len skutočné
  const c = NULA;
  const darov = sucetDarov(idZbierky);
  const hlavnaSuma = farnost ? suhrnHlavnej(strankaId, idZbierky).suma : darov.suma; // farnosť: okná sú v hlavnej (jedno číslo)
  const zacMes = (() => { const x = new Date(); x.setDate(1); x.setHours(0, 0, 0, 0); return x.getTime(); })();
  const mesiacReal = darcoviaPre(idZbierky).filter((r) => r.cas >= zacMes).reduce((a, r) => a + r.suma, 0);
  const mesiac = farnost ? mesiacReal : c.mesiac + hlavnaSuma, spolu = c.spolu + hlavnaSuma;
  // Štatistiky (skutočné): dary po dňoch tento mesiac, počet darcov
  const dniMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dniReal = Array.from({ length: dniMes }, (_, i) => darcoviaPre(idZbierky).filter((r) => r.cas >= zacMes && new Date(r.cas).getDate() === i + 1).length);
  const darcovReal = new Set(darcoviaPre(idZbierky).filter((r) => !r.omsa).map((r) => (r.moj ? "ja" : r.id))).size;
  const sektor = useSektorDarcu();
  // farnosť: mená bez súm; OPRAVY 289: po každej omši jeden riadok zvončekovej („Ranná omša 7:00 · Pán Boh zaplať · 120 €“),
  // jednotliví darcovia zvončekovej sa do hlavnej nepripisujú; suma hlavnej už omše obsahuje
  const podZv = podakovanieZvoncek(useZvoncek(strankaId), useSlovaFarnosti(strankaId));
  const ja = usePouzivatel();
  const spustena = !!sek || !!d.spustena; // OPRAVY 414 (8): aj centrálna charity beží až po Podržte a spustite
  const farnostDary: [string, string, string][] = !farnost ? [] : [
    // OPRAVY 294: skončená omša je v daroch Hlavnej (server 0096) — v Štatistikách jeden riadok s dátumom a časom
    ...darcoviaPre(idZbierky).map((r): [string, string, string] => r.omsa
      ? [textRiadkuOmse(r, podZv), datumOmse(r.id), eur(r.suma)]
      : [identitaDarcu(r, ja, "viera"), relCas(r.cas), ""]),
  ].slice(0, 3);
  const realne: [string, string, string][] = farnost ? farnostDary : darcoviaPre(idZbierky).slice(0, 3).map((r) => [identitaDarcu(r, undefined, sektor), relCas(r.cas), zobrazenaSuma(r) ?? ""]);
  const dary = realne;
  const nazovPol = sek ? sek.nazov : farnost ? nazovHlavnej(d) : "Celá činnosť";
  const chip = sek ? `SEKTOR ${typ}` : farnost ? "HLAVNÁ ZBIERKA" : "CENTRÁLNA ZBIERKA";
  const podnadpis = sek ? "jedna téma · peniaze idú len sem · bez cieľa a konca" : farnost ? "stála zbierka farnosti · hore na profile" /* OPRAVY 350 */ : "na celú činnosť · stále hore na profile · nikdy na Domove";
  const profil = profilZPamate(strankaId).ulozeny;
  const foto = d.media.find((m) => m.typ === "foto")?.src ?? (sek?.foto || profil?.cover || "");
  const bgFoto = "#3a3530";
  const fotoSrc = typeof foto === "string" ? foto : foto?.src; // titulná fotka profilu je objekt { src, … }
  const fotoImg = fotoSrc ? <img src={fotoSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null; // KARTA 57 A.10: <img>, nie background:url(data:…)

  // ---- dorovnanie ----
  const dor = beziaceDorovnanieNaCiel(sek ? idZbierky : `${strankaId}-centralna`);
  const dorPas = farnost ? null : dor ? <DorovnaniePas ini={inic(dor.firma)} firma={dor.firma} pomer={`1 : ${dor.pomer}`} pod={`ešte ${eur(zostatok(dor))}${dor.doVycerpania ? " · do vyčerpania" : ` · do ${dnes(new Date(dor.do).toISOString())}`}`} onClick={onDorovnanie} />
    : null;

  // ---- účet: zamknutý, zmena len žiadosťou ----
  const [ucOtv, setUcOtv] = useState(false);
  const [ucDov, setUcDov] = useState<number | null>(null);
  const [ucNovy, setUcNovy] = useState("");
  const ziadost = ziadostUctu(idZbierky);
  const DOVODY_UCTU = ["Zmenili sme banku", "Účet bol zrušený", "Iný dôvod"];
  const ucOk = ucDov != null && !!overIban(ucNovy);
  const ucetKarta = (
    <section style={kartaK}>
      <span style={nadpisK}>Účet</span>
      <div style={{ height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 700, color: "var(--ink2)" }}>{ZAMOK}<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.ucet ?? hlavnyUcet}</span></div>
      <span style={textK}>{farnost?.onZmenitUcet ? "Účet farnosti z Nastavení. Ten istý účet dostáva aj podiel zo zbierok s overovateľom." : farnost ? "Účet farnosti z registrácie." : "Hlavný účet organizácie z registrácie."}</span>
      {farnost?.onZmenitUcet ? <button type="button" onClick={farnost.onZmenitUcet} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>Zmeniť účet ›</button>
      : ziadost ? <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gInk)" }}>Žiadosť o zmenu účtu sme prijali {dnes(ziadost.podana)}. Posúdime ju do 2 pracovných dní.</span>
        : !ucOtv ? <button type="button" onClick={() => setUcOtv(true)} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>Požiadať o zmenu účtu ›</button>
        : <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 14, background: "var(--panel)", border: "1px solid var(--cardBd)" }}>
          <b style={{ fontSize: 15 }}>Žiadosť o zmenu účtu</b>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>Účet zbierky meníme len na požiadanie. Posúdime ju do 2 pracovných dní. Kým ju neschválime, dary idú na terajší účet.</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink3)", letterSpacing: ".04em" }}>DÔVOD</span>
          <div role="radiogroup" aria-label="Dôvod" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DOVODY_UCTU.map((t, i) => { const on = ucDov === i; return <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setUcDov(i)} style={{ minHeight: 46, padding: "0 14px", borderRadius: 12, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>{t}</button>; })}
          </div>
          <input value={ucNovy} onChange={(e) => setUcNovy(formatujIban(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24)))} placeholder="Nový účet · SK00 0000 0000 0000 0000 0000" aria-label="Nový účet" style={{ height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} />
          <span style={drobneK}>Účet musí patriť organizácii (rovnaké IČO). Po schválení pošleme 0,01 € s kódom na overenie a pravidelným darcom dáme vedieť.</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { setUcOtv(false); setUcDov(null); setUcNovy(""); }} style={obrysK}>Zrušiť</button>
            <button type="button" aria-disabled={!ucOk} onClick={() => { if (!ucOk) { toast(ucDov == null ? "Vyberte dôvod." : "Skontrolujte číslo účtu."); return; } poziadajOZmenuUctu(idZbierky, { dovod: DOVODY_UCTU[ucDov!], iban: overIban(ucNovy)! }); setUcOtv(false); toast("Žiadosť sme poslali. Posúdime ju do 2 pracovných dní."); }} style={{ ...zelenyK, opacity: ucOk ? 1 : 0.45 }}>Odoslať žiadosť</button>
          </div>
        </div>}
    </section>);

  // ---- karty Nastavenia ----
  const tentoMesiac = <CislaKarta nadpis="Tento mesiac" dary={dary} cisla={farnost ? [[eur(mesiac), "tento mesiac · cez DEED+"], [String(c.mesacne), "ľudí dáva mesačne"], [eur(spolu), "od začiatku · cez DEED+"]] : [[eur(mesiac), "tento mesiac"], [eur(spolu), "od začiatku"]]}>
    <button type="button" onClick={onDarcovia} style={obrysK}>Všetci darcovia ›</button>
  </CislaKarta>;
  const textKarta = <section data-pole="text" style={kartaK}><span style={nadpisK}>Text pre darcov</span>
    <TextovePolia popis={d.popis} popis2={d.popis2} onPopis={(x) => zmen({ popis: x }, "text")} onPopis2={(x) => zmen({ popis2: x }, "text")} ph={mobil} popisHlavneho="Toto ľudia uvidia pri zbierke hneď. Najviac 12 riadkov."
      placeholder={farnost ? "Napíšte, na čo ľudia prispievajú." : undefined} />
    <UlozenePri u={u} pole="text" /></section>;
  const galeria = <div data-pole="foto" style={{ display: "flex", flexDirection: "column", gap: 6 }}><GaleriaEditor media={d.media} onMedia={(m) => zmen({ media: m }, "fotky")} ph={mobil} nadpis="Fotky a video" popisNapoveda="Popis (nepovinné)" dovetok="" /><UlozenePri u={u} pole="fotky" style={{ paddingRight: 8 }} /></div>;
  // OPRAVY 160/5: náhľad = tá istá karta ako na profile (KartaModulu), mení sa hneď pri písaní a pridaní fotky
  const nahlad = farnost ? (
    <section style={kartaK}>
      <span style={nadpisK}>Takto to uvidia ľudia na profile</span>
      <div data-hier="0"><KartaModulu galeria={d.media.map((m) => ({ typ: m.typ, src: m.src, popis: m.popis }))} stitok="HLAVNÁ ZBIERKA" nazov={nazovPol} riadok={nazov} popis={cistyText(d.popis) || undefined} /></div>
    </section>) : (
    <section style={kartaK}>
      <span style={nadpisK}>Takto to uvidia ľudia na profile</span>
      <div data-hier={h} style={{ position: "relative", height: 150, borderRadius: 18, overflow: "hidden", border: "2px solid var(--hc)", background: bgFoto }}>
        {fotoImg}
        <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, background: "var(--hc)" }} />
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,0) 30%,rgba(10,8,5,.85) 100%)" }} />
        <span style={{ position: "absolute", left: 14, bottom: 12, display: "flex", flexDirection: "column", gap: 2, color: "#fff" }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", opacity: .85 }}>{sek ? `SEKTOR ${typ}` : farnost ? "HLAVNÁ" : "CENTRÁLNA"}</span>
          <b style={{ fontSize: 18 }}>{nazovPol}</b>
          <span style={{ fontSize: 13, opacity: .9 }}>{eur(mesiac)} tento mesiac</span>
        </span>
      </div>
      {!farnost && <span style={drobneK}>Farba je podľa poradia, nie podľa obsahu: centrálna vždy zelená, 1. sektor petrolejová, 2. modrá, 3. terakota, ďalšie svetlejšie.</span>}
    </section>);
  const sektorKarta = sek && (
    <section style={kartaK}>
      <span style={nadpisK}>Sektor</span>
      <span style={textK}>Téma: <b style={{ color: "var(--ink)" }}>{sek.stanovy}</b>. Názov sektora na profile zmeníte tu.</span>{/* OPRAVY 442 doplnok 3: stanovy appka nepozná, bez „overené pri registrácii“ */}
      <input value={sek.nazov} maxLength={30} onChange={(e) => premenujSektor(sek.id, e.target.value)} onBlur={(e) => { if (!e.target.value.trim()) premenujSektor(sek.id, STANOVY_CINNOSTI.find((x) => x.stanovy === sek.stanovy)?.nazov ?? "Sektor"); }} aria-label="Názov sektora"
        style={{ height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} />
    </section>);
  // OPRAVY 162: farnosť — ten istý QR farnosti z registrácie (po spustení vedie rovno na hlavnú zbierku)
  const qr = farnost
    ? <QrKarta nazov={nazov} slug={strankaId} odkaz={odkazQrStranky(strankaId)} cislo={cisloObjektu("Z", idZbierky)} toast={toast} nadpis="QR farnosti" onPlagat={() => setPlOkno(true)}
        popis="Ten istý QR z registrácie. Vedie rovno na Hlavnú zbierku." /* OPRAVY 350 */ />
    : <QrKarta nazov={sek ? `${nazov} · ${sek.nazov}` : nazov} slug={strankaId} odkaz={odkazQrStranky(strankaId)} cislo={cisloObjektu("Z", idZbierky)} toast={toast} />; /* OPRAVY 358: /z/{slug} centrálnej neexistuje — QR vedie na stránku (centrálna je na nej hore) */
  // farnosť pred spustením: namiesto QR karta „ešte nebeží" + Spustiť (bez Z-čísla a odkazu)
  const spustit = () => { const n = { ...d, spustena: new Date().toISOString() }; zmenene.current = false; setD(n); void ulozCentralnuZbierku(strankaId, n); setUlozene(true); };
  // KARTA 56D §5: kontrola pred spustením — ťuk na chýbajúce posunie na pole
  const kontrola: [string, string, boolean][] = [...(farnost ? [["nazov", "Názov", !!d.nazov?.trim()] as [string, string, boolean]] : []), ["text", "Text pre darcov", !!cistyText(d.popis)], ["foto", "Titulná fotka", d.media.some((m) => m.typ === "foto")]];
  const mozeSpustit = kontrola.every((k) => k[2]);
  // OPRAVY 515: charita — uloženie podržaním (prvé uloženie centrálnu spustí), Zrušiť úpravy vráti posledné uložené
  const [ukl, setUkl] = useState(false);
  const [chybaUl, setChybaUl] = useState<string | null>(null);
  const ulozCh = async () => {
    if (ukl || (!spustena && !mozeSpustit)) return;
    const n = spustena ? d : { ...d, spustena: new Date().toISOString() };
    setChybaUl(null); setUkl(true);
    const e = await zapis(n);
    setUkl(false);
    if (e) { setChybaUl(e); return; }
    zmenene.current = false; setD(n); setUlozeneJson(JSON.stringify(n)); setUlozene(true);
  };
  const zrusUpravy = () => { zmenene.current = false; setD(JSON.parse(ulozeneJson) as CentralnaZbierka); setChybaUl(null); };
  const idiNa = (pole: string) => {
    const el = document.querySelector<HTMLElement>(`[data-pole="${pole}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const f = el.matches("input") ? el : el.querySelector<HTMLElement>("[contenteditable=true]") ?? el.querySelector<HTMLElement>("input[type=file]")?.parentElement?.querySelector<HTMLElement>("button") ?? el.querySelector<HTMLElement>("input, button");
    window.setTimeout(() => f?.focus({ preventScroll: true }), 350);
  };
  const [spDrz, setSpDrz] = useState(false);
  const spTm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(spTm.current), []);
  const spZacni = () => { if (!mozeSpustit) return; setSpDrz(true); window.clearTimeout(spTm.current); spTm.current = window.setTimeout(() => { setSpDrz(false); spustit(); }, 1500); };
  const spPusti = () => { window.clearTimeout(spTm.current); setSpDrz(false); };
  const nebezi = (
    <section key="spustit" style={{ ...kartaK, border: "2px solid var(--green)" }}>
      <b style={{ fontSize: 18 }}>{farnost ? "Spustiť hlavnú zbierku" : "Spustiť centrálnu zbierku"}</b>
      <span style={textK}>Pred spustením musí byť vyplnené:</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {kontrola.map(([p, t, hot]) => (
          <button key={p} type="button" onClick={() => { if (!hot) idiNa(p); }} style={{ minHeight: 52, padding: "6px 14px", borderRadius: 14, border: `1.5px solid ${hot ? "var(--cardBd)" : "#E0B9AE"}`, background: hot ? "var(--field)" : "var(--t2, var(--field))", cursor: hot ? "default" : "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
            <span aria-hidden="true" style={{ flex: "none", width: 28, height: 28, borderRadius: "50%", background: hot ? "var(--green)" : "#A34A2A", color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{hot ? "✓" : "!"}</span>
            <b style={{ flex: 1, minWidth: 0, fontSize: 15.5 }}>{t}</b>
            <span style={{ flex: "none", fontSize: 14, fontWeight: 800, color: hot ? "var(--gInk)" : "#A34A2A" }}>{hot ? "hotové" : "chýba · doplniť ›"}</span>
          </button>))}
      </div>
      {ch ? <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{mozeSpustit ? <>Všetko je vyplnené. Dole podržte <b>Uložiť</b> a zbierka sa spustí.</> : "Doplňte, čo chýba. Ťuknite na riadok vyššie."}</span>
      : mozeSpustit ? <>
        <button type="button" onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); spZacni(); }} onPointerUp={spPusti} onPointerCancel={spPusti} onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); spZacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") spPusti(); }}
          style={{ position: "relative", height: 60, border: "none", borderRadius: 16, background: "#3F6E2A", overflow: "hidden", cursor: "pointer", touchAction: "none", userSelect: "none", fontFamily: "inherit" } as CSSProperties}>
          <span style={{ position: "absolute", inset: 0, background: "#6E9F4E", transformOrigin: "0 50%", transform: `scaleX(${spDrz ? 1 : 0})`, transition: `transform ${spDrz ? "1.5s" : ".2s"} linear` }} />
          <span style={{ position: "relative", fontSize: 17, fontWeight: 800, color: "#fff" }}>{spDrz ? "Držte…" : "Podržte a spustite"}</span>
        </button>
        <span style={{ fontSize: 13, color: "var(--ink3)", textAlign: "center" }}>Držte prst na tlačidle, kým sa nenaplní.</span>
      </> : <span style={{ minHeight: 60, borderRadius: 16, border: "2px dashed var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "var(--ink3)", textAlign: "center", padding: "0 12px" }}>Najprv doplňte, čo chýba. Ťuknite na riadok vyššie.</span>}
    </section>);
  // po spustení na tom istom mieste: čo sa stalo a čo ďalej (výsledok na tlačidle)
  const bezi = farnost && (
    <section key="bezi" role="status" style={{ ...kartaK, background: "var(--gSoft)", border: "2px solid var(--green)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden="true" style={{ flex: "none", width: 44, height: 44, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
        <b style={{ fontSize: 19, color: "var(--gInk)" }}>{neverejna ? "Hlavná zbierka je pripravená" : "Hlavná zbierka beží"}</b>
      </span>
      {neverejna ? <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}><b>Spustí sa po zverejnení stránky.</b> Dovtedy ju nikto nevidí a dary sa neprijímajú. QR plagát bude k dispozícii po zverejnení.</span> : <>
      <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}>Je hore na vašom profile a ľudia už môžu darovať.</span>
      <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}><b>Ďalší krok:</b> stiahnite QR plagát, vytlačte ho a dajte do kostola a k pokladničke.</span></>}
      {neverejna ? <button type="button" disabled aria-disabled="true" style={{ height: 56, border: "1.5px dashed var(--cardBd)", borderRadius: 15, background: "transparent", cursor: "default", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "var(--ink3)", boxShadow: "none" }}>Stiahnuť QR plagát · po zverejnení</button>
      : <button type="button" onClick={() => setPlOkno(true)} style={{ height: 56, border: "none", borderRadius: 15, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", boxShadow: "none" }}>QR plagát · upraviť a stiahnuť ›</button>}
      <button type="button" onClick={farnost.onHotovo} style={{ height: 52, borderRadius: 15, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Hotovo · späť do Správy</button>
    </section>);
  // Martin 13:11 · ročné počítanie hlavnej zbierky (prepínač áno/nie, nič sa nemaže)
  const rocneKarta = farnost && (
    <section key="rocne" style={kartaK}>
      <button type="button" role="switch" aria-checked={!!d.rocne} onClick={() => zmen({ rocne: !d.rocne }, "rocne")}
        style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 56, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "var(--ink)" }}>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 16.5 }}>Každý rok začať od nuly</b>
          <span style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink2)" }}>{d.rocne ? `Ukazovateľ počíta dary od 1. januára ${new Date().getFullYear()}. Staršie dary ostávajú vo výpise.` : "Ukazovateľ počíta všetky dary od spustenia zbierky."}</span></span>
        <Prepinac on={!!d.rocne} />
      </button>
      <UlozenePri u={u} pole="rocne" />
    </section>);
  const vlavo = <>{ch && !spustena && nebezi}{spustena && tentoMesiac}{textKarta}{galeria}</>;
  // Martin 13. 10.: farnosť — sumy pri darcoch hlavnej zbierky zapína farár (OPRAVY 266: zvončeková je v Správe zvončekovej)
  const sumyKarta = farnost ? <section style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
    <SumyPriDarcoch stranka={strankaId} kluc="hlavna" nadpis="Hlavná zbierka · ukázať sumy pri darcoch" />
  </section> : null;
  const vpravo = <>{sumyKarta}{nahlad}{ucetKarta}<AkoDarovat sada={d.sada} eurc={d.eurc} sadaE={d.sadaE} onZmena={(p) => zmen(p, "sumy")} pravidelna={!!farnost || tier >= 1} bezi={spustena} /><UlozenePri u={u} pole="sumy" style={{ paddingRight: 8, marginTop: -6 }} />{sektorKarta}{rocneKarta}{spustena ? <>{bezi}{qr}</> : !ch && nebezi}</>;
  // OPRAVY 515: charita — dole Podržte a uložte · Zrušiť úpravy (namiesto pásu Všetko je uložené)
  const lista = ch && (neulozene || !spustena) && (
    <div style={mobil ? { height: 130 } : { position: "sticky", bottom: 12, zIndex: 5, marginTop: 4 }}>
      <div style={{ ...(mobil ? { position: "fixed", left: 16, right: 16, bottom: "calc(100px + env(safe-area-inset-bottom, 0px))", zIndex: 60 } : {}), borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", boxShadow: "0 6px 18px rgba(30,40,20,.18)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <ChybaPriTlacidle text={chybaUl} uklada={ukl} onZnova={() => void ulozCh()} nadpis="Zbierka sa neuložila" />
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>{!spustena ? (mozeSpustit ? "Uložením sa zbierka spustí a ukáže na profile." : "Najprv doplňte, čo chýba hore.") : "Máte neuložené zmeny."}</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ flex: mobil ? "1 1 100%" : "0 1 320px" }}><PodrzTlacidlo label={ukl ? "Ukladá sa…" : "Podržte a uložte"} trvanie={1500} disabled={!spustena && !mozeSpustit} onConfirm={() => void ulozCh()} /></span>
          {neulozene && <button type="button" onClick={zrusUpravy} style={{ minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink2)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, flex: mobil ? "1 1 100%" : "none" }}>Zrušiť úpravy</button>}
        </div>
      </div>
    </div>);
  const stlpce = (l: ReactNode, p: ReactNode) => mobil
    ? <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{l}{p}</div>
    : <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}><div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{l}</div><div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{p}</div></div>;

  // ---- ukončenie: zavrieť centrálnu / zmazať sektor (hárok, podrž 1,5 s, 15 minút Vrátiť späť) ----
  const [harok, setHarok] = useState(false);
  const [vratSek, setVratSek] = useState<{ nazov: string; vrat: () => void; do: number } | null>(null);
  const zavreta = zavretaCentralna();
  const [, tik] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tik((x) => x + 1), 30000); return () => window.clearInterval(t); }, []);
  const pasZav = !sek && !farnost && zavreta && Date.parse(zavreta.vratitDo) > Date.now()
    ? { t: "Centrálna zbierka je zavretá", vrat: () => otvorCentralnu() }
    : vratSek && vratSek.do > Date.now() ? { t: `Sektor ${vratSek.nazov} je zmazaný`, vrat: () => { vratSek.vrat(); setVratSek(null); } } : null;
  const potvrd = (dovod: string) => {
    setHarok(false);
    if (farnost) { void zmazCentralnuZbierku(strankaId); farnost.onZmazana(); return; }
    if (sek) { const n = sek.nazov; const vrat = zmazSektor(sek.id); setVratSek({ nazov: n, vrat, do: Date.now() + 15 * 60000 }); prepni(0); setTab(3); }
    else { zavriCentralnu(dovod); setTab(3); }
  };
  const ukoncenie = farnost ? (
    <section style={kartaK}>
      <span style={nadpisK}>Zmazať hlavnú zbierku</span>
      <span style={textK}>{farnost.ostatneBezia ? "Najprv ukončite ostatné zbierky farnosti. Všetky posielajú peniaze na účet hlavnej zbierky." : "Ľudia vás potom nebudú môcť podporiť cez hlavnú zbierku. Zmazať ju môžete, len keď nebeží žiadna iná zbierka farnosti."}</span>
      <button type="button" onClick={() => { if (farnost.ostatneBezia) { toast("Najprv ukončite ostatné zbierky farnosti. Všetky posielajú peniaze na účet hlavnej zbierky."); return; } setHarok(true); }} style={{ ...obrysK, border: "1.5px solid #E0B9AE", color: "#A34A2A", opacity: farnost.ostatneBezia ? 0.45 : 1 }} aria-disabled={farnost.ostatneBezia}>Zmazať hlavnú zbierku…</button>
    </section>) : (
    <section style={kartaK}>
      <span style={nadpisK}>{sek ? "Zmazať sektor" : "Zavrieť centrálnu zbierku"}</span>
      <span style={textK}>{sek ? "Sektor zmizne z profilu, jeho história ostane v kronike. Pravidelní darcovia dostanú správu a ponuku presunúť dar na centrálnu. Miesto pre nový sektor sa uvoľní." : "Ľudia vás potom nebudú môcť podporiť na celú činnosť. Konkrétne zbierky a sektory bežia ďalej."}</span>
      {!sek && zavreta ? <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink3)" }}>Zavretá {dnes(zavreta.kedy)}.</span>
        : <button type="button" onClick={() => setHarok(true)} style={{ ...obrysK, border: "1.5px solid #E0B9AE", color: "#A34A2A" }}>{sek ? "Zmazať sektor…" : "Zavrieť zbierku…"}</button>}
    </section>);

  // ---- + Pridať sektor (len z činností v stanovách, od P2, najviac 3) ----
  const volne = STANOVY_CINNOSTI.filter((x) => !sektory.some((s) => s.stanovy === x.stanovy));
  const plno = sektory.length >= SEKTORY_MAX;
  const novyPanel = novySek && (
    <div style={{ borderRadius: 18, background: "var(--panel)", border: "1px solid var(--cardBd)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <b style={{ fontSize: 15 }}>Nový sektor</b>
      <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>Vyberte tému. Najviac {SEKTORY_MAX} sektory, od programu Akcia. Dostane farbu podľa poradia a vlastné QR.</span>
      {smieSektory && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {volne.map((o) => <button key={o.nazov} type="button" aria-disabled={plno} onClick={() => { if (plno) return; const s = pridajSektor(strankaId, o, toast); if (s) { prepni(sektory.length + 1); toast(`Sektor ${s.nazov} je pridaný`); } }} style={{ height: 44, padding: "0 14px", borderRadius: 22, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: plno ? "default" : "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--ink)", opacity: plno ? 0.5 : 1, boxShadow: "none" }}>{o.nazov}</button>)}
      </div>}
      <span style={drobneK}>{!smieSektory ? "Sektory máte od programu Akcia." : plno ? `Máte ${sektory.length} z ${SEKTORY_MAX} sektorov. Nový pridáte, keď niektorý zmažete.` : `Máte ${sektory.length} z ${SEKTORY_MAX} sektorov.`}</span>
    </div>);
  const rad: [string, number][] = [["Celá činnosť", 0], ...(smieSektory ? sektory.map((s, i) => [s.nazov, i + 1] as [string, number]) : [])];

  return (<>
    <div data-hier={h} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <SpatZbierky onClick={onZbierky} />
      <span style={{ flex: 1 }} />
      {farnost ? <UkladaSa dovetok={ulozene ? "uložené pred chvíľou" : undefined} /> : neulozene ? <span role="status" style={{ fontSize: 13, fontWeight: 700, color: "#A34A2A" }}>Neuložené zmeny</span> : null}
    </div>
    {farnost && <>
      <b style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: "-.02em", paddingTop: 2 }}>Hlavná zbierka</b>
      <input data-pole="nazov" value={d.nazov ?? ""} maxLength={HLAVNA_NAZOV_MAX} onChange={(e) => zmen({ nazov: e.target.value }, "nazov")} placeholder="Pridajte názov zbierky" aria-label="Názov hlavnej zbierky"
        style={{ height: 48, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} />
      <UlozenePri u={u} pole="nazov" style={{ marginTop: -6 }} />
    </>}
    {!farnost && <div role="tablist" aria-label="Centrálna a sektory" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
      {rad.map(([t, v]) => { const on = typ === v; return (
        <button key={v} type="button" role="tab" aria-selected={on} onClick={() => prepni(v)} style={{ flex: "none", height: 44, padding: "0 14px", borderRadius: 22, border: on ? "2px solid var(--ink)" : "1px solid var(--cardBd)", background: on ? "var(--card)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)", whiteSpace: "nowrap", boxShadow: "none" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: `var(--h${v})` }} />{t}</button>); })}
      <button type="button" aria-expanded={novySek} onClick={() => setNovySek((x) => !x)} style={{ flex: "none", height: 44, padding: "0 14px", borderRadius: 22, border: "1.5px dashed var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)", whiteSpace: "nowrap", boxShadow: "none" }}>+ Pridať sektor</button>
    </div>}
    {novyPanel}
    {!farnost && <div data-hier={h} style={{ borderRadius: 22, overflow: "hidden", background: "var(--card)", border: "2px solid var(--hc)", display: "flex", flexWrap: "wrap" }}>
      <span style={{ flex: "none", width: mobil ? "100%" : 220, minHeight: mobil ? 120 : 140, background: bgFoto, position: "relative", overflow: "hidden" }}>{fotoImg}<span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, background: "var(--hc)" }} /></span>
      <div style={{ flex: 1, minWidth: 240, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ alignSelf: "flex-start", height: 26, padding: "0 10px", borderRadius: 13, background: "var(--hcF)", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{chip}</span>
        <b style={{ fontSize: 24, lineHeight: 1.15 }}>{nazovPol}</b>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{podnadpis}</span>
      </div>
    </div>}
    {dorPas}
    <Taby akt={tab} onTab={setTab} odsadenie={16} skryte={farnost ? [1] : []} qr />
    {pasZav && <div role="status" style={{ borderRadius: 18, background: "#1D211B", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>{pasZav.t}</b><span style={{ fontSize: 13, opacity: .8 }}>Pravidelným darcom pošleme správu o 15 minút. Dovtedy to môžete vrátiť.</span></span>
      <button type="button" onClick={pasZav.vrat} style={{ height: 46, padding: "0 18px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#1D211B" }}>Vrátiť späť</button>
    </div>}
    {tab === 0 && stlpce(vlavo, vpravo)}
    {tab === 0 && (ch ? lista : <PasUlozene u={u} onSpat={onZbierky} mobil={mobil} />)}
    {tab === 1 && <DokladyCharity zbierkaId={idZbierky} s={stav} zmen={zmenStav} vyzbierane={spolu} teraz={Date.now()} mobil={mobil} toast={toast} nepovinne />}
    {tab === 2 && <Statistiky d={{ obdobie: "tento mesiac", od: "", dni: dniReal, cez: [["Priamo na profile", mesiac, ""]], split: [], darcovia: farnost ? [[String(darcovReal), "darcov"], [String(c.mesacne), "dáva mesačne"]] : [[String(darcovReal), "darcov"]] /* OPRAVY 442 doplnok 3: charita bez „0 dáva mesačne“, dni zo skutočných darov */, dary: realne }} tier={tier} mobil={mobil} toast={toast} />}
    {tab === 3 && ukoncenie}
    {tab === 5 && farnost && <QrZalozka strankaId={strankaId} meno={nazov} id="farnost" mobil={mobil} onTlac={onTlacQr} />}
    {/* OPRAVY 453: charita — centrálna aj sektor majú QR charity (sektor nemá vlastnú verejnú adresu) */}
    {tab === 5 && !farnost && <QrZalozka strankaId={strankaId} meno={nazov} id="charita" mobil={mobil} onTlac={onTlacQr} charita />}
    {plOkno && qrFar && <PlagatOkno strankaId={strankaId} meno={nazov} p={qrFar} format="a4" mobil={mobil} onZavri={() => setPlOkno(false)} />}
    {harok && <ZavrietHarok mobil={mobil} sektor={sek?.nazov ?? null} farnost={!!farnost} mesacne={c.mesacne} onPotvrd={potvrd} onZavri={() => setHarok(false)} />}
  </>);
}

/** hárok „Zavrieť centrálnu zbierku?" / „Zmazať sektor {názov}?" — Prečo · Čo sa stane · Podrž (1,5 s) · Nechať bežať */
function ZavrietHarok({ mobil, sektor, farnost, mesacne, onPotvrd, onZavri }: { mobil: boolean; sektor: string | null; farnost?: boolean; mesacne: number; onPotvrd: (dovod: string) => void; onZavri: () => void }) {
  const [vidno, setVidno] = useState(false);
  const [dovod, setDovod] = useState<number | null>(null);
  const [drz, setDrz] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  const DOV = sektor ? ["Túto tému už nerobíme", "Spájame ju s inou", "Iný dôvod"] : farnost ? ["Končíme činnosť", "Iný dôvod"] : ["Končíme činnosť", "Stačia nám sektory", "Iný dôvod"];
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setVidno(true))); return () => { cancelAnimationFrame(r); window.clearTimeout(tm.current); }; }, []);
  const zavri = () => { setVidno(false); window.setTimeout(onZavri, 260); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  const zacni = () => { if (dovod == null) return; setDrz(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => { setDrz(false); onPotvrd(DOV[dovod]); }, 1500); };
  const pusti = () => { window.clearTimeout(tm.current); setDrz(false); };
  const tit = sektor ? `Zmazať sektor ${sektor}?` : farnost ? "Zmazať hlavnú zbierku?" : "Zavrieť centrálnu zbierku?";
  const sekcia: CSSProperties = { fontSize: 13, fontWeight: 800, color: "var(--ink3)", letterSpacing: ".04em" };
  const karta: CSSProperties = { position: "fixed", zIndex: 91, background: "var(--bg)", color: "var(--ink)", boxShadow: "0 30px 80px rgba(0,0,0,.45)", padding: 22, display: "flex", flexDirection: "column", gap: 14, maxHeight: "92vh", overflowY: "auto" };
  return createPortal(
    <div className="sprava-charity" style={{ background: "transparent", minHeight: 0 }}>
      <div onClick={zavri} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(10,8,5,.6)", opacity: vidno ? 1 : 0, transition: "opacity .25s ease" }} />
      <div role="dialog" aria-modal="true" aria-label={tit} style={mobil
        ? { ...karta, left: 0, right: 0, bottom: 0, borderRadius: "26px 26px 0 0", paddingBottom: "max(24px, env(safe-area-inset-bottom))", transform: `translateY(${vidno ? "0%" : "105%"})`, transition: "transform .32s cubic-bezier(.2,.8,.2,1)" }
        : { ...karta, left: "50%", top: "50%", width: "min(520px, calc(100% - 32px))", borderRadius: 26, opacity: vidno ? 1 : 0, transform: `translate(-50%, -50%) scale(${vidno ? 1 : 0.94})`, transition: "opacity .25s ease, transform .3s ease" }}>
        <b style={{ fontSize: 21 }}>{tit}</b>
        <span style={sekcia}>PREČO</span>
        <div role="radiogroup" aria-label="Prečo" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DOV.map((t, i) => { const on = dovod === i; return <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setDovod(i)} style={{ minHeight: 50, padding: "0 16px", borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>{t}</button>; })}
        </div>
        <span style={sekcia}>ČO SA STANE</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>
          <span>· {farnost ? "Zmazať ju môžete, len keď nebeží žiadna iná zbierka farnosti." : `Dary sem sa zastavia. Konkrétne zbierky ${sektor ? "a ostatné sektory" : "a sektory"} bežia ďalej.`}</span>
          {mesacne > 0 && <span>· <b style={{ color: "var(--ink)" }}>{mesacne}</b> pravidelných darcov dostane správu, ich mesačný dar sa zastaví{sektor ? " a ponúkneme im presun na centrálnu" : ""}.</span>}
          <span>· Vyzbierané peniaze ostávajú na účte, nič sa nevracia.</span>
        </div>
        <button type="button" aria-disabled={dovod == null} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); zacni(); }} onPointerUp={pusti} onPointerCancel={pusti}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") pusti(); }} onContextMenu={(e) => e.preventDefault()}
          style={{ position: "relative", height: 58, border: "none", borderRadius: 16, background: "#7A3A2C", overflow: "hidden", cursor: dovod == null ? "default" : "pointer", touchAction: "none", userSelect: "none", opacity: dovod == null ? 0.45 : 1, fontFamily: "inherit" } as CSSProperties}>
          <span style={{ position: "absolute", inset: 0, background: "#A34A2A", transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? "1.5s" : ".2s"} linear` }} />
          <span style={{ position: "relative", fontSize: 16, fontWeight: 800, color: "#fff" }}>{sektor ? "Podrž a zmaž sektor" : farnost ? "Podrž a zmaž zbierku" : "Podrž a zavri zbierku"}</span>
        </button>
        <button type="button" onClick={zavri} style={{ height: 44, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink3)" }}>Nechať bežať</button>
      </div>
    </div>, document.body);
}
