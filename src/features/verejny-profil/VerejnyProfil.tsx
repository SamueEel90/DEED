// KARTA 43 · verejné profily (test). Jedna obrazovka, návrh podľa typu:
//   charita → Kronika / Výklad / Pirát (KARTA 45, testovací prepínač) · firma → stránka firmy (KARTA 46) · tvorca → stránka tvorcu (KARTA 47).
//   kľúč „stream:{id}" (odkaz /z/{zbierka}?s={stream}) → stránka streamu na zbierku (KARTA 47).
// KARTA 43 ZMENA: režim „vsade" zrušený — platobný modul sa otvorí len po ťuku na zbierku/skutok.
// VerejnyProfilView sa dá vložiť priamo (feed, „Stránka organizácie", adresár),
// VerejnyProfilHost je celoobrazovková vrstva otváraná zo store (tlačidlo v Správe, QR).
import { MaterialneNaProfile } from "./MaterialneNaProfile";
import { useTestStav, vyprazdni, otvorenaRealnaStranka } from "@/lib/testStav";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FarnikPridava, OdFarnikov, fabZapnuty } from "./FarnikPridava";
import { PrihovorNaStranke } from "./PrihovorNaStranke";
import { NastenkaFarnosti, posunNaBlok, zvyrazniOznam } from "./NastenkaFarnosti";
import { nacitajProfil, profilZPamate, cistyNazov, type ProfilStranky } from "@/lib/profilStranky";
import { odFarnikov, BLOK_DRUHU } from "@/lib/odFarnikov";
import { useAdresarFarnosti, nazovFarnosti } from "@/lib/mojeFarnosti";
import type { StitLevel } from "@/components/stit";
import { createPortal } from "react-dom";
import { useLayout } from "@/components/context";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { najdiTestProfil, prazdnaCharita, CHARITA_VZOR, type TestProfil, type TestZbierka, type TestSkutok, type TestOznam, type TestPraca } from "@/lib/testProfily";
import { verejneOznamy, useZmenyOznamov, type Oznam } from "@/lib/oznamy";
import { pracaZPonuky } from "@/features/rola/PonukyPrace";
import { centralnaZPamate, nacitajCentralnuZbierku, nazovHlavnej, useZmenyCentralnej } from "@/lib/centralnaZbierka";
import { cistyText } from "@/lib/richtext";
import { otvorVerejnyProfil, useVerejnyProfilOtvoreny, verejnyProfilKluc, zavriVerejnyProfil, vrstvaProfiluPripoj, nahladZoSpravy, cielOznamu, zrusDoOznamu, cielSkutku, zrusDoSkutku, zbierkaZQrCitaj, zrusZbierkuZQr, skutokOtvorenyZFeedu } from "./otvor";
import { VrstvaProfilu, naZbierkaData } from "./casti";
import { useVzhlad, maVybranyVzhlad, type Vzhlad } from "@/lib/vzhladStranky";
import { nacitajTiery } from "@/features/rola/stav";
import { TESTOVACIA } from "@/lib/testovacia";
import { Kronika } from "./Kronika";
import { PataCharita } from "./PataCharita";
import { useRegistra, registra } from "@/lib/udajeRegistra";
import { lokalneStranky } from "@/lib/aktivnaCharita";
import { VykladCharita } from "./VykladCharita";
import { PiratCharita } from "./PiratCharita";
import { StrankaFirmy } from "./StrankaFirmy";
import { StrankaTvorcu } from "./StrankaTvorcu";
import { StreamZbierka } from "./StreamZbierka";
import { DetailSkutku, DetailUkoncenej } from "./DetailyKroniky";
import type { PolCh } from "./charitaCasti";
import { otvorIskry } from "@/features/iskry/otvor";
import { iskryVsetky } from "@/lib/iskry";
import { pribehZbierky, orgPribehu, useZmenyPribehov, nacitajPribehy } from "@/lib/pribehZbierky";
import { PribehZbierky } from "./PribehZbierky";
import { SektorDarcuKontext, sucetDarov, useZmenyDarov } from "@/lib/darcovia";
import { jeCharitaUctu } from "@/lib/mojeStranky";
import { nacitajPrud } from "@/lib/iskry";
import { nacitajSkutkyStranky, skutkyStrankyZPamate, useZmenySkutkovStranky } from "@/lib/skutkyStranky";
import { skutkyOrg, useZmenySkutkov, type MojSkutok } from "@/lib/mojeSkutky";
import { ucast, nacitajUcasti, pocetText, useZmenyUcasti } from "@/lib/oznamUcast";
import { OznamDetail } from "@/features/rola/OznamDetail";
import { useProgramStranky } from "@/lib/programStranky";
import { nacitajOznamyStranky, oznamyStranky, bezi as oznamBezi, useZmenyOznamovCharity, type OznamCharity } from "@/lib/oznamyNove";
import { nacitajZbierkyStranky, zbierkyStrankyZPamate, useZmenyZbierok, cielCislo, doplneniaHtml, type SpustenaZbierka } from "@/lib/novaZbierka";
import { PomozCharita } from "./PomozCharita";
import { useZverejnenie, strankaSaPripravuje } from "@/lib/zverejnenieStranky";
import { StrankaSaPripravuje } from "@/features/rola/ZverejnenieStranky";

/** OPRAVY 402: testovací profil, alebo novo založená charita (vlastné id ch-…) — prázdny profil s menom z registra */
const profilKluca = (k: string): TestProfil | undefined =>
  (k === CHARITA_VZOR.k ? CHARITA_VZOR : undefined) ?? najdiTestProfil(k) ?? (/^ch-/.test(k) || jeCharitaUctu(k) ? prazdnaCharita(k, registra(k).nazov || lokalneStranky().find((x) => x.k === k)?.n) : undefined);

/** vložiteľný verejný profil podľa kľúča stránky (svetlo · pekaren · tvorca) */
/** OPRAVY 159: profil farnosti = sektor Viera (darca bez mena = „Bohu známy veriaci") */
export function VerejnyProfilView(p: { kluc: string; onBack: () => void; /** OPRAVY 249: len vrstva otvorená tlačidlom Náhľad v Správe */ nahlad?: boolean; /** OPRAVY 414: Náhľad neuloženého profilu charity */ profilNahlad?: ProfilStranky; /** OPRAVY 510: Ateliér — vzhľad, ktorý sa skúša */ vzhladAtelier?: Vzhlad }) {
  const k = p.kluc.startsWith("stream:") ? "tvorca" : p.kluc.startsWith("pribeh:") ? orgPribehu(p.kluc.slice(7)) : p.kluc;
  const tp = profilKluca(k);
  // OPRAVY 511: QR alebo odkaz neverejnej stránky — návštevník uvidí „Stránka sa pripravuje“, správca svoju stránku
  const zv = useZverejnenie(k);
  const [pripravuje, setPripravuje] = useState(false);
  useEffect(() => { let z = true; void strankaSaPripravuje(k).then((x) => { if (z) setPripravuje(x); }); return () => { z = false; }; }, [k]);
  if (pripravuje && zv.stav !== "neverejna") return <StrankaSaPripravuje onBack={p.onBack} />;
  // KARTA 57C · 60: farnosť (testovacia aj ktorákoľvek z Adresára) = živá stránka z uloženého
  if (!tp || tp.typ === "farnost") return <SektorDarcuKontext.Provider value="viera"><FarnostStranka strankaId={k} onBack={p.onBack} nahlad={!!p.nahlad} stit={(tp?.stit as StitLevel | undefined) ?? "Silver"} /></SektorDarcuKontext.Provider>;
  return <SektorDarcuKontext.Provider value="ine"><VerejnyProfilObsah {...p} /></SektorDarcuKontext.Provider>;
}

/** OPRAVY 160/2, 6: farnosť — keď hlavná zbierka beží, na profile je jej názov, text farára a galéria zo Správy */
function sHlavnouZUctu(p: TestProfil): TestProfil {
  const c = p.typ === "farnost" ? centralnaZPamate(p.k) : null;
  if (!c?.spustena) return p;
  const galeria = c.media.map((m) => ({ typ: m.typ, src: m.src, popis: m.popis }));
  const foto = c.media.find((m) => m.typ === "foto")?.src;
  return { ...p, centralna: { ...p.centralna, nazov: nazovHlavnej(c), popis: cistyText(c.popis) || undefined, popisHtml: [c.popis, c.popis2].filter((x) => x && cistyText(x)).join("") || undefined, ...(galeria.length ? { galeria, foto: foto ?? p.centralna.foto } : {}) } };
}

/** OPRAVY 414 (8): zbierka charity z databázy → zbierka profilu (nič predvolené, nič z testovacej stránky) */
function zbierkaProfilu(z: SpustenaZbierka, p: TestProfil): TestZbierka {
  const s = sucetDarov(z.id), ciel = cielCislo(z), foto = z.media?.find((m) => m.typ === "foto")?.src ?? "";
  return { id: z.id, vs: z.vs, nazov: z.nazov || "Zbierka", popis: cistyText(z.popis ?? ""), popisHtml: [z.popis, z.popis2].filter((x) => x && cistyText(x)).join("") + doplneniaHtml(z.doplnenia) || undefined, mesto: p.mesto, foto, vyzbierane: s.suma, ciel: ciel || undefined, ludia: s.pocet,
    stav: (z.stav ?? "aktivna") !== "aktivna" ? "ukoncena" : z.typ === "dlha" ? "dlhodoba" : "bezi",
    galeria: (z.media ?? []).map((m) => ({ typ: m.typ, src: m.src, popis: m.popis })), zDb: true, prav: !!z.prav, eurc: !!z.eurc };
}
/** OPRAVY 418: skutok a oznam zo Správy charity → položky verejného profilu (nič vymyslené) */
const MES = ["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"];
const casAkcie = (ms: number) => { const min = Math.max(1, Math.round(ms / 60000)); return min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`; };
/** OPRAVY 479: skutok bez vlastnej fotky = logo charity na farbe loga, vycentrované (ako na hlavnom feede) — „logo|farba|src“ */
export const logoAkoFoto = (prof: ProfilStranky | null | undefined): string => !prof?.logo ? "" : `logo|${prof.logoPozadie === "tmave" ? "#15171c" : prof.logoPozadie === "priehladne" ? "#E9E4DA" : "#fff"}|${prof.logo}`;
function skutokProfilu(s: MojSkutok, p: TestProfil, tier = 0, logo = ""): TestSkutok {
  const d = new Date(s.datum || Date.now());
  return { id: s.id, nazov: s.nazov, popis: cistyText(s.popis), mesto: p.mesto, kedy: `${d.getDate()}. ${d.getMonth() + 1}.`, foto: s.fotky[0] ?? logo, fotky: s.fotky,
    dobrovolnici: s.ucastnici?.length || undefined, d: `${d.getDate()}.`, m: MES[d.getMonth()], rok: d.getFullYear(),
    // OPRAVY 438 (3): kam idú peniaze zo skutku (zapečatené pri zverejnení) — platobný modul v detaile skutku
    podpora: s.peniaze === "centralna" ? { na: "centralna" } : (s.peniaze === "nasa" || s.peniaze === "ina") && s.dar?.[0]
      ? { na: "zbierka", zbierkaId: s.dar[0].id, nazov: s.dar[0].nazov, org: s.dar[0].org, cislo: s.dar[0].cislo } : undefined,
    // OPRAVY 447 (3): Zadarmo len „Pomáhali: … · N dobrovoľníkov“, od P1 aj zoznam pomocníkov s časom
    pomocnici: tier >= 1 && s.pomocnici?.length ? s.pomocnici.map((u) => ({ meno: u.meno, cas: casAkcie(u.ms), ucet: u.ucet })) : undefined };
}
/** OPRAVY 408: pracovná ponuka zo Správy → plagát Hľadáme ľudí */
function pracaProfilu(o: Oznam, p: TestProfil): TestPraca {
  const j = pracaZPonuky(o), d = new Date(o.ponuka?.uzavierka ?? o.vytvorene);
  return { ...j, druh: "zamestnanec", text: j.opis ?? "", mesto: p.mesto, den: `${d.getDate()}.`, mesiac: MES[d.getMonth()], pod: j.pod ?? "" };
}
function oznamProfilu(o: OznamCharity, p: TestProfil): TestOznam {
  const d = new Date(o.datum ? `${o.datum}T12:00:00` : o.zverejnene);
  const druh: TestOznam["druh"] = o.druh === "vyzva" ? "vyzva" : o.druh === "verejny" ? "akcia" : "oznam";
  const stitok = druh === "vyzva" ? "VÝZVA" : druh === "akcia" ? `AKCIA${o.cas ? ` · ${o.cas}` : ""}` : "OZNAM";
  // OPRAVY 431: fotka na karte, výzva „do 21. 10.“, počet prihlásených zo servera (oznam_ucast)
  const { pocet } = ucast(o.id);
  return { id: o.id, druh, nadpis: o.nadpis, stitok, text: [cistyText(o.text), o.miesto].filter(Boolean).join(" · "), mesto: p.mesto,
    den: `${d.getDate()}.`, mesiac: MES[d.getMonth()], predDnom: druh === "vyzva" && o.datum ? "do" : undefined, foto: o.media.find((m) => m.typ === "foto")?.src,
    tlacidlo: o.pozvanie === "zavazne" ? "Prihlásiť sa" : o.pozvanie === "nezavazne" ? "Zúčastním sa" : "", pod: o.pozvanie !== "bez" && pocet > 0 ? pocetText(pocet, druh === "vyzva") : "" };
}
/** OPRAVY 414 (3, 8): skutočná charita — logo, titulná fotka a iniciály z Upraviť profil, zbierky len z databázy */
function sUdajmiCharity(p: TestProfil, prof: ProfilStranky | null, tier = 0): TestProfil {
  if (p.typ !== "charita" || !p.bezCentralnej) return p;
  const zbierky = zbierkyStrankyZPamate(p.k).map((z) => zbierkaProfilu(z, p));
  const ini = prof?.bezLoga && prof.inicialy?.trim() ? prof.inicialy.trim() : p.iniciala;
  // centrálna len keď ju charita sama založila a spustila (Zbierky → Založiť centrálnu zbierku)
  const c = centralnaZPamate(p.k), foto = c?.media.find((m) => m.typ === "foto")?.src;
  const centralna = c?.spustena ? { ...p.centralna, popis: cistyText(c.popis) || undefined, popisHtml: [c.popis, c.popis2].filter((x) => x && cistyText(x)).join("") || undefined, foto: foto ?? p.centralna.foto, galeria: c.media.map((m) => ({ typ: m.typ, src: m.src, popis: m.popis })) } : p.centralna;
  // OPRAVY 418: skutky a oznamy zo Správy (server; bez neho zo správy na tomto zariadení)
  const sk = (skutkyStrankyZPamate(p.k) ?? skutkyOrg(p.k).filter((x) => !x.stiahnuty)).map((s) => skutokProfilu(s, p, tier, logoAkoFoto(prof)));
  const oz = oznamyStranky(p.k).filter((o) => oznamBezi(o)).map((o) => oznamProfilu(o, p));
  // OPRAVY 432: Zadarmo nemá centrálnu zbierku, pravidelnú podporu ani pracovné ponuky (všetko od P1)
  const praca = tier < 1 ? [] : verejneOznamy(`stranka:${p.k}`, "inzerat").map((o) => pracaProfilu(o, p)); // OPRAVY 408
  // OPRAVY 418: O nás · hlavný text z Upraviť profil = veta v hlavičke profilu (všetky 3 vzhľady)
  return { ...p, veta: cistyText(prof?.onas ?? "").trim() || p.veta, onas2: cistyText(prof?.onas2 ?? "").trim() ? prof!.onas2 : undefined, zivaCharita: true, zbierky, skutky: sk, oznamy: oz, praca, iniciala: ini, logo: prof?.logo || undefined, titulka: prof?.cover?.src || p.titulka, centralna, bezCentralnej: tier < 1 || !c?.spustena };
}

function VerejnyProfilObsah({ kluc, onBack, profilNahlad, vzhladAtelier }: { kluc: string; onBack: () => void; profilNahlad?: ProfilStranky; vzhladAtelier?: Vzhlad }) {
  const zStreamu = kluc.startsWith("stream:") ? kluc.slice(7) : null;
  // KARTA 55 · E: „pribeh:{zbierka}" (odkaz z feedu) → stránka Príbeh; „{Organizácia} ›" otvorí jej profil
  const zPribehu = kluc.startsWith("pribeh:") ? kluc.slice(7) : null;
  const kl0 = zStreamu ? "tvorca" : zPribehu ? orgPribehu(zPribehu) : kluc;
  // OPRAVY 402: novo založená charita (vlastné id) — prázdny profil s menom z registra
  const profil0 = profilKluca(kl0);
  const [detail, setDetail] = useState<TestZbierka | null>(null);
  const [detailZQr, setDetailZQr] = useState(false); // OPRAVY 483: z QR rovno modul s platbou (nie príbeh)
  const [oznamId, setOznamId] = useState<string | null>(null); // OPRAVY 431: ťuk na oznam / výzvu = detail
  // KARTA 57C §1: farnosť = živá nástenka z uloženého (nie testovací profil)
  const [stream, setStream] = useState<string | null>(null);
  // doplnky 4. 10.: záznam z kroniky / rokov — skutok, akcia, ukončená zbierka (bez platby), Iskra = Iskry na tom videu
  const [zaznam, setZaznam] = useState<PolCh | null>(null);
  const [zaznamZFeedu, setZaznamZFeedu] = useState(false); // OPRAVY 485: skutok z hlavného feedu — Späť rovno na feed
  const [novyOdF, setNovyOdF] = useState<string | null>(null); // KARTA 56I: nová položka Od veriacich je zvýraznená
  const pc = usePc1200();
  const otvorZaznam = (p: PolCh) => {
    if (p.typ === "is") { const id = p.id.replace(/^k-/, ""); otvorIskry(iskryVsetky().some((v) => v.id === id) ? id : undefined); return; }
    setZaznam(p);
  };
  // stránka streamu otvorená z profilu tvorcu: krok späť v prehliadači (alebo gesto) vráti na tvorcu
  const pridanyKrok = useRef(false);
  useEffect(() => {
    if (!stream) return;
    try { window.history.pushState({ deedStream: stream }, ""); pridanyKrok.current = true; } catch { /* sandbox */ }
    const f = () => { pridanyKrok.current = false; setStream(null); };
    window.addEventListener("popstate", f);
    return () => window.removeEventListener("popstate", f);
  }, [stream]);
  useZmenyPribehov();
  // OPRAVY 455 (0, 8): zverejnené príbehy zo servera (doteraz len z pamäte prehliadača — po obnovení zmizli)
  const idZbierok = [...(profil0?.zbierky ?? []).map((x) => x.id), ...(zPribehu ? [zPribehu] : [])].join(",");
  useEffect(() => { if (idZbierok) void nacitajPribehy(idZbierok.split(",")); }, [idZbierok]);
  const ts = useTestStav(); // OPRAVY 147: testovací prázdny profil
  // KARTA 50 · §1: vzhľad vyberá správca v Správe → Upraviť profil (Zadarmo = vzhľad z configu); návštevník ho neprepína.
  // „Celá kronika" v Pirátovi otvorí Kroniku len pre tohto návštevníka (nič sa neukladá).
  const [tiery] = useState(nacitajTiery);
  const typP = profil0?.typ;
  // OPRAVY 432: charita — program zo servera (program_stranky, 0137); testovací prepínač Program ho na tomto zariadení prebije
  const programCh = useProgramStranky(typP === "charita" ? profil0?.k : null);
  const tierStranky = TESTOVACIA && ts.program !== null ? ts.program : typP === "charita" ? programCh : typP === "firma" ? tiery.b2b : tiery.tvorca;
  const regV = useRegistra(profil0?.k ?? kluc); // OPRAVY 400: názov charity z registra
  const vzhlad = useVzhlad(profil0?.k ?? kluc, typP !== "farnost" && tierStranky === 0); // farnosť: jeden platený program, výber má vždy
  const [prepis, setPrepis] = useState<Vzhlad | null>(null);
  const podanie = vzhladAtelier ?? prepis ?? vzhlad;
  // OPRAVY 160: spustená hlavná zbierka farnosti z účtu (názov, text farára, fotky) prepíše testovaciu
  useZmenyCentralnej();
  useEffect(() => { if (typP === "farnost" && profil0) void nacitajCentralnuZbierku(profil0.k); }, [typP, profil0]);
  // OPRAVY 414: uložený profil a zbierky skutočnej charity
  useZmenyZbierok(); useZmenyDarov(); useZmenySkutkovStranky(); useZmenySkutkov(); useZmenyOznamovCharity(); useZmenyOznamov(); useZmenyUcasti();
  const kCh = profil0?.bezCentralnej ? profil0.k : null;
  // OPRAVY 445 (1): profil skutočnej charity — žiadni ukážkoví darcovia ani čísla
  useEffect(() => (kCh ? otvorenaRealnaStranka() : undefined), [kCh]);
  const idOznamov = kCh ? oznamyStranky(kCh).map((o) => o.id).join(",") : "";
  useEffect(() => { if (idOznamov) void nacitajUcasti(idOznamov.split(",")); }, [idOznamov]);
  const [profCh, setProfCh] = useState<ProfilStranky | null>(() => (kCh ? profilZPamate(kCh).ulozeny : null));
  useEffect(() => { if (!kCh) return; let ziva = true; void nacitajProfil(kCh).then((z) => { if (ziva) setProfCh(z.ulozeny); }); void nacitajZbierkyStranky(kCh); void nacitajCentralnuZbierku(kCh); void nacitajSkutkyStranky(kCh); void nacitajOznamyStranky(kCh); nacitajPrud(); return () => { ziva = false; }; }, [kCh]);
  // OPRAVY 490: z modulu zbierky „Pozri ›“ pri skutku → detail toho skutku hneď po načítaní skutkov stránky
  useEffect(() => {
    const id = cielSkutku();
    if (!id || !kCh || !profil0) return;
    const sk = (skutkyStrankyZPamate(kCh) ?? skutkyOrg(kCh)).find((x) => x.id === id || x.prispevokId === id); // OPRAVY 485: z feedu id príspevku
    if (!sk) return;
    const t = skutokProfilu(sk, profil0);
    setZaznamZFeedu(skutokOtvorenyZFeedu());
    zrusDoSkutku();
    setZaznam({ id: t.id, typ: "sk", d: t.d ?? "", m: t.m ?? "", rok: t.rok ?? new Date().getFullYear(), nazov: t.nazov, s: t.popis, foto: t.foto });
  });
  // OPRAVY 483: QR / odkaz zbierky (/z/{id}) → rovno detail tej zbierky s platbou (ako vo Viere), nie stránka charity
  useEffect(() => {
    const id = zbierkaZQrCitaj();
    if (!id || !kCh || !profil0) return;
    const z = zbierkyStrankyZPamate(kCh).find((x) => x.id === id);
    if (!z) return;
    zrusZbierkuZQr();
    setDetailZQr(true);
    setDetail(zbierkaProfilu(z, profil0));
  });
  if (!profil0) return null;
  const profil1 = sUdajmiCharity(sHlavnouZUctu(ts.prazdny ? vyprazdni(profil0) : profil0), profilNahlad ?? profCh, tierStranky);
  const profil = profil1.typ === "charita" && regV.nazov.trim() ? { ...profil1, meno: regV.nazov.trim() } : profil1;
  if (zPribehu) {
    const zb = profil0.zbierky.find((x) => x.id === zPribehu), pr = pribehZbierky(zPribehu);
    if (zb && pr) return <PribehZbierky profil={profil0} z={zb} p={pr} onBack={onBack} onOrg={() => otvorVerejnyProfil(profil0.k)} />;
  }

  // OPRAVY 148: žiadny testovací pás na verejnej stránke (testuje sa v Správe). Vzhľad pri všetkých typoch —
  // firma a tvorca majú zatiaľ jedno vlastné podanie; keď správca vyberie vzhľad, ukáže sa podanie charity s ich dátami.
  // KARTA 56I: farnosť — sekcia Od veriacich a zelené + Pridať (veriaci pridáva sám)
  const farnost = profil.typ === "farnost";
  const fab = farnost && fabZapnuty(profil.k);
  // OPRAVY 406: charita — v tom istom mieste blok Pomôž (Dobrovoľníctvo zo Správy)
  const odF = (pad?: string) => farnost ? <OdFarnikov strankaId={profil.k} novy={novyOdF} pad={pad} fab={fab} /> : profil.typ === "charita" ? <><MaterialneNaProfile strankaId={profil.k} meno={profil.meno} logo={profil.logo} inicialy={profil.iniciala} pad={pad} /><PomozCharita strankaId={profil.k} pad={pad} /></> : undefined; // OPRAVY 486: materiálne zbierky
  const padOdF = pc ? "44px 40px 0" : "28px 16px 0";
  const hore = (pad?: string) => farnost ? <PrihovorNaStranke strankaId={profil.k} pad={pad} /> : undefined; // KARTA 57 C.7–C.8
  // OPRAVY 400: charita — Kontakt (sídlo, prevádzky) a Údaje organizácie na konci stránky
  const pata = (pad: string, siroke?: boolean) => profil.typ === "charita" ? <PataCharita strankaId={profil.k} pad={pad} siroke={siroke} /> : undefined;
  const zakladStranka = (): ReactNode => {
    const podania = podanie === "pirat" ? <PiratCharita profil={profil} onDetail={setDetail} onOznam={setOznamId} onZaznam={otvorZaznam} onBack={onBack} onKronika={() => setPrepis("kronika")} odFarnikov={odF(padOdF)} hore={hore(pc ? "24px 40px 0" : "16px 16px 0")} pata={pata(pc ? "40px 40px 0" : "28px 16px 0", pc)} />
      : podanie === "vyklad" ? <VykladCharita profil={profil} onDetail={setDetail} onOznam={setOznamId} onZaznam={otvorZaznam} onBack={onBack} odFarnikov={odF(padOdF)} hore={hore()} pata={pata(pc ? "40px 40px 0" : "28px 16px 0", pc)} />
      : <Kronika profil={profil} onDetail={setDetail} onOznam={setOznamId} onZaznam={otvorZaznam} onBack={onBack} odFarnikov={odF()} hore={hore()} pata={pata("0", pc)} />;
    const vlastneVzhlady = (profil.typ === "firma" || profil.typ === "tvorca") && maVybranyVzhlad(profil.k);
    if (vlastneVzhlady && !zStreamu) return podania;
    if (profil.typ === "firma") return <StrankaFirmy profil={profil} onDetail={setDetail} onBack={onBack} />; // KARTA 46
    // KARTA 47 · stream cez QR / odkaz: vľavo hore „{tvorca} ›" otvorí profil tvorcu
    if (zStreamu) return <StreamZbierka profil={profil} streamId={zStreamu} onTvorca={() => otvorVerejnyProfil("tvorca")} />;
    // KARTA 47 · stream z profilu tvorcu: profil ostáva pod ním (skrytý), „Späť" vráti na to isté miesto
    if (profil.typ === "tvorca") return (
      <div style={{ position: "relative", height: "100%" }}>
        <div aria-hidden={!!stream} style={stream ? { position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none" } : { height: "100%" }}>
          <StrankaTvorcu profil={profil} onBack={onBack} onStream={setStream} onDetail={setDetail} onZaznam={otvorZaznam} />
        </div>
        {stream && <div style={{ position: "absolute", inset: 0 }}>
          <StreamZbierka profil={profil} streamId={stream} onBack={() => { const krok = pridanyKrok.current; pridanyKrok.current = false; setStream(null); if (krok) { try { window.history.back(); } catch { /* sandbox */ } } }} />
        </div>}
      </div>
    );
    return podania;
  };
  // bod 149 · detail zbierky / záznam sa otvorí NAD profilom (profil ostane pod ním) → Zbaliť a späť vráti na tú istú kartu a posun
  // KARTA 55 · E: zbierka so zverejneným príbehom otvorí stránku Príbeh zbierky (inak modul zbierky ako doteraz)
  const pribeh = detail && !detailZQr ? pribehZbierky(detail.id) : null;
  const oznamD = oznamId ? oznamyStranky(profil.k).find((o) => o.id === oznamId) : undefined;
  const vrstva = oznamD ? (
    <div className="sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ background: "var(--bg)", minHeight: "100%" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <OznamDetail o={oznamD} org={{ nazov: profil.meno, logo: profil.logo, ini: profil.iniciala, mesto: profil.mesto }} onBack={() => setOznamId(null)} />
      </div>
    </div>
  ) : detail && pribeh ? (
    <PribehZbierky profil={profil} z={detail} p={pribeh} spatText={profil.meno.replace(/\s+o\.\s?z\.$/i, "")} onBack={() => setDetail(null)} />
  ) : detail ? (
    <div className="sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ background: "var(--bg)", minHeight: "100%" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: 14 }}>
        <ZbierkaModul zbierka={naZbierkaData(detail, profil)} zoStrankyOrg onBack={() => { setDetail(null); setDetailZQr(false); }} spatNazov="Späť na stránku" />
      </div>
    </div>
  ) : zaznam ? (
    <div className="vp sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ height: "100%" }}>
      {zaznam.typ === "zb"
        ? <DetailUkoncenej pc={pc} profil={profil} p={zaznam} onBack={() => setZaznam(null)} />
        : <DetailSkutku pc={pc} profil={profil} p={zaznam} onBack={() => { if (zaznamZFeedu) { setZaznamZFeedu(false); zavriVerejnyProfil(); } setZaznam(null); }} />}
    </div>
  ) : null;
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div aria-hidden={vrstva ? true : undefined} style={vrstva ? { position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none" } : { height: "100%" }}>{zakladStranka()}</div>
      {vrstva && <div style={{ position: "absolute", inset: 0, overflowY: (detail && !pribeh) || oznamD ? "auto" : undefined }}>{vrstva}</div>}

    </div>);
}

/** OPRAVY 154: verejný profil otvorený zo Správy (charita, farnosť, firma, tvorca, klub, spolok) — okno NAD Správou
 *  ako VerejnyProfilOkno (portál, celá obrazovka), „Späť" vráti do Správy na to isté miesto. */
export function VerejnyProfilVSprave({ kluc, onZavri, lista, profilNahlad }: { kluc: string; onZavri: () => void; /** OPRAVY 414: lišta hore (Náhľad · Profil uložený) */ lista?: ReactNode; profilNahlad?: ProfilStranky }) {
  // OPRAVY 155/7: z-index 70 — nad Správou, ale POD oknami profilu (štít 80, platba 150, Iskry 160, galéria 1000)
  const { desktop } = useLayout();
  useEffect(() => vrstvaProfiluPripoj(), []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Verejný profil" style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: desktop ? 104 : 0, zIndex: 70, overflowY: "auto", background: "var(--c-bg)", WebkitOverflowScrolling: "touch" } as CSSProperties}>
      {lista ? <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>{lista}<div style={{ flex: 1, minHeight: 0 }}><VerejnyProfilView kluc={kluc} onBack={onZavri} profilNahlad={profilNahlad} /></div></div>
        : <VerejnyProfilView kluc={kluc} onBack={onZavri} profilNahlad={profilNahlad} />}
    </div>, document.body);
}

/** vrstva vnútri appky otváraná zo store (otvorVerejnyProfil) — tlačidlo v Správe, QR, zdieľaný odkaz.
 *  Kreslí sa v obsahu appky: ľavé menu (PC) aj dok (mobil) ostávajú nad ňou. */
export function VerejnyProfilHost() {
  const otv = useVerejnyProfilOtvoreny();
  if (!otv) return null;
  return <VerejnyProfilVrstva />;
}

function VerejnyProfilVrstva() {
  const kluc = verejnyProfilKluc();
  if (!kluc) return null;
  return <VrstvaProfilu><VerejnyProfilView kluc={kluc} onBack={zavriVerejnyProfil} nahlad={nahladZoSpravy()} /></VrstvaProfilu>;
}

function usePc1200() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1200px)").matches);
  useEffect(() => { const q = window.matchMedia("(min-width: 1200px)"), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}

/** KARTA 57C · 60 — stránka farnosti (živá nástenka + zelené +) pre ľubovoľnú farnosť v DEED.
 *  Vo Viere ju ukazuje aj domovská farnosť (bez Späť). */
export function FarnostStranka({ strankaId, onBack, nahlad = false, stit = "Silver" }: { strankaId: string; onBack?: () => void; nahlad?: boolean; stit?: StitLevel }) {
  useAdresarFarnosti();
  const pc = usePc1200();
  const [prof, setProf] = useState<ProfilStranky | null>(() => profilZPamate(strankaId).ulozeny);
  const [pre, setPre] = useState(strankaId);
  if (pre !== strankaId) { setPre(strankaId); setProf(profilZPamate(strankaId).ulozeny); }
  useEffect(() => { let ziva = true; void nacitajProfil(strankaId).then((z) => { if (ziva) setProf(z.ulozeny); }); return () => { ziva = false; }; }, [strankaId]);
  // OPRAVY 315: z upozornenia — blok s príspevkom sa rozbalí a stránka sa posunie presne naň
  const [doOz, setDoOz] = useState(() => (onBack ? cielOznamu() : null));
  const zvyrazni = (id: string) => { const kd = odFarnikov(strankaId).find((x) => x.id === id)?.k, b = kd ? BLOK_DRUHU[kd] : undefined; return zvyrazniOznam(id, undefined, () => posunNaBlok(b?.[0] ?? "ozn")); };
  useEffect(() => { zrusDoOznamu(); if (doOz) return zvyrazni(doOz); }, [doOz]); // eslint-disable-line react-hooks/exhaustive-deps
  /** doOznamu rozbalí zbalený blok (mobil), potom zvýraznenie */
  const naPrispevok = (id: string) => { if (id === doOz) zvyrazni(id); else setDoOz(id); };
  const fab = fabZapnuty(strankaId);
  const meno = cistyNazov(prof?.meno ?? nazovFarnosti(strankaId)) || "Vaša farnosť";
  return (
    <div style={{ position: "relative", minHeight: "100%", background: "var(--nf-bg)" }}>
      <NastenkaFarnosti strankaId={strankaId} meno={meno} profil={prof} fab={fab} onBack={onBack} stit={stit} nahlad={!!onBack && nahlad} doOznamu={doOz ?? undefined} />
      {fab && <div aria-hidden="true" style={{ height: pc ? 110 : 180 }} />/* OPRAVY 278: rezerva dole, + nikdy nezakryje text ani tlačidlá (mobil: + je nad spodným menu, všetky vzhľady rovnako) */}
      <FarnikPridava strankaId={strankaId} mobil={!pc} onPozriet={(id) => { naPrispevok(id); /* OPRAVY 301: presne pri oznámení, inak aspoň blok */ }} />
    </div>);
}
