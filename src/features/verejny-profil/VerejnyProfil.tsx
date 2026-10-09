// KARTA 43 · verejné profily (test). Jedna obrazovka, návrh podľa typu:
//   charita → Kronika / Výklad / Pirát (KARTA 45, testovací prepínač) · firma → stránka firmy (KARTA 46) · tvorca → stránka tvorcu (KARTA 47).
//   kľúč „stream:{id}" (odkaz /z/{zbierka}?s={stream}) → stránka streamu na zbierku (KARTA 47).
// KARTA 43 ZMENA: režim „vsade" zrušený — platobný modul sa otvorí len po ťuku na zbierku/skutok.
// VerejnyProfilView sa dá vložiť priamo (feed, „Stránka organizácie", adresár),
// VerejnyProfilHost je celoobrazovková vrstva otváraná zo store (tlačidlo v Správe, QR).
import { useTestStav, vyprazdni } from "@/lib/testStav";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FarnikPridava, OdFarnikov, fabZapnuty } from "./FarnikPridava";
import { PrihovorNaStranke } from "./PrihovorNaStranke";
import { NastenkaFarnosti, BLOK_DRUHU, posunNaBlok } from "./NastenkaFarnosti";
import { nacitajProfil, profilZPamate, cistyNazov, type ProfilStranky } from "@/lib/profilStranky";
import { odFarnikov } from "@/lib/odFarnikov";
import type { ZbierkaData } from "@/features/zbierka/ZbierkaModul";
import type { StitLevel } from "@/components/stit";
import { createPortal } from "react-dom";
import { useLayout } from "@/components/context";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { najdiTestProfil, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { centralnaZPamate, nacitajCentralnuZbierku, nazovHlavnej, useZmenyCentralnej } from "@/lib/centralnaZbierka";
import { cistyText } from "@/lib/richtext";
import { otvorVerejnyProfil, useVerejnyProfilOtvoreny, verejnyProfilKluc, zavriVerejnyProfil, vrstvaProfiluPripoj } from "./otvor";
import { VrstvaProfilu, naZbierkaData } from "./casti";
import { useVzhlad, maVybranyVzhlad, type Vzhlad } from "@/lib/vzhladStranky";
import { nacitajTiery } from "@/features/rola/stav";
import { TESTOVACIA } from "@/lib/testovacia";
import { Kronika } from "./Kronika";
import { VykladCharita } from "./VykladCharita";
import { PiratCharita } from "./PiratCharita";
import { StrankaFirmy } from "./StrankaFirmy";
import { StrankaTvorcu } from "./StrankaTvorcu";
import { StreamZbierka } from "./StreamZbierka";
import { DetailSkutku, DetailUkoncenej } from "./DetailyKroniky";
import type { PolCh } from "./charitaCasti";
import { otvorIskry } from "@/features/iskry/otvor";
import { iskryVsetky } from "@/lib/iskry";
import { pribehZbierky, orgPribehu, useZmenyPribehov } from "@/lib/pribehZbierky";
import { PribehZbierky } from "./PribehZbierky";
import { SektorDarcuKontext } from "@/lib/darcovia";

/** vložiteľný verejný profil podľa kľúča stránky (svetlo · pekaren · tvorca) */
/** OPRAVY 159: profil farnosti = sektor Viera (darca bez mena = „Bohu známy darca") */
export function VerejnyProfilView(p: { kluc: string; onBack: () => void }) {
  const k = p.kluc.startsWith("stream:") ? "tvorca" : p.kluc.startsWith("pribeh:") ? orgPribehu(p.kluc.slice(7)) : p.kluc;
  return <SektorDarcuKontext.Provider value={najdiTestProfil(k)?.typ === "farnost" ? "viera" : "ine"}><VerejnyProfilObsah {...p} /></SektorDarcuKontext.Provider>;
}

/** OPRAVY 160/2, 6: farnosť — keď hlavná zbierka beží, na profile je jej názov, text farára a galéria zo Správy */
function sHlavnouZUctu(p: TestProfil): TestProfil {
  const c = p.typ === "farnost" ? centralnaZPamate(p.k) : null;
  if (!c?.spustena) return p;
  const galeria = c.media.map((m) => ({ typ: m.typ, src: m.src, popis: m.popis }));
  const foto = c.media.find((m) => m.typ === "foto")?.src;
  return { ...p, centralna: { ...p.centralna, nazov: nazovHlavnej(c), popis: cistyText(c.popis) || undefined, ...(galeria.length ? { galeria, foto: foto ?? p.centralna.foto } : {}) } };
}

function VerejnyProfilObsah({ kluc, onBack }: { kluc: string; onBack: () => void }) {
  const zStreamu = kluc.startsWith("stream:") ? kluc.slice(7) : null;
  // KARTA 55 · E: „pribeh:{zbierka}" (odkaz z feedu) → stránka Príbeh; „{Organizácia} ›" otvorí jej profil
  const zPribehu = kluc.startsWith("pribeh:") ? kluc.slice(7) : null;
  const profil0 = najdiTestProfil(zStreamu ? "tvorca" : zPribehu ? orgPribehu(zPribehu) : kluc);
  const [detail, setDetail] = useState<TestZbierka | null>(null);
  // KARTA 57C §1: farnosť = živá nástenka z uloženého (nie testovací profil)
  const [detailF, setDetailF] = useState<ZbierkaData | null>(null);
  const kFar = profil0?.typ === "farnost" ? profil0.k : null;
  const [profF, setProfF] = useState<ProfilStranky | null>(() => (kFar ? profilZPamate(kFar).ulozeny : null));
  useEffect(() => { if (!kFar) return; let ziva = true; void nacitajProfil(kFar).then((z) => { if (ziva) setProfF(z.ulozeny); }); return () => { ziva = false; }; }, [kFar]);
  const [stream, setStream] = useState<string | null>(null);
  // doplnky 4. 10.: záznam z kroniky / rokov — skutok, akcia, ukončená zbierka (bez platby), Iskra = Iskry na tom videu
  const [zaznam, setZaznam] = useState<PolCh | null>(null);
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
  const ts = useTestStav(); // OPRAVY 147: testovací prázdny profil
  // KARTA 50 · §1: vzhľad vyberá správca v Správe → Upraviť profil (Zadarmo = vzhľad z configu); návštevník ho neprepína.
  // „Celá kronika" v Pirátovi otvorí Kroniku len pre tohto návštevníka (nič sa neukladá).
  const [tiery] = useState(nacitajTiery);
  const typP = profil0?.typ;
  const tierStranky = TESTOVACIA && ts.program !== null ? ts.program : typP === "charita" ? tiery.charita : typP === "firma" ? tiery.b2b : tiery.tvorca;
  const vzhlad = useVzhlad(profil0?.k ?? kluc, typP !== "farnost" && tierStranky === 0); // farnosť: jeden platený program, výber má vždy
  const [prepis, setPrepis] = useState<Vzhlad | null>(null);
  const podanie = prepis ?? vzhlad;
  // OPRAVY 160: spustená hlavná zbierka farnosti z účtu (názov, text farára, fotky) prepíše testovaciu
  useZmenyCentralnej();
  useEffect(() => { if (typP === "farnost" && profil0) void nacitajCentralnuZbierku(profil0.k); }, [typP, profil0]);
  if (!profil0) return null;
  const profil = sHlavnouZUctu(ts.prazdny ? vyprazdni(profil0) : profil0);
  if (zPribehu) {
    const zb = profil0.zbierky.find((x) => x.id === zPribehu), pr = pribehZbierky(zPribehu);
    if (zb && pr) return <PribehZbierky profil={profil0} z={zb} p={pr} onBack={onBack} onOrg={() => otvorVerejnyProfil(profil0.k)} />;
  }

  // OPRAVY 148: žiadny testovací pás na verejnej stránke (testuje sa v Správe). Vzhľad pri všetkých typoch —
  // firma a tvorca majú zatiaľ jedno vlastné podanie; keď správca vyberie vzhľad, ukáže sa podanie charity s ich dátami.
  // KARTA 56I: farnosť — sekcia Od veriacich a zelené + Pridať (veriaci pridáva sám)
  const farnost = profil.typ === "farnost";
  const fab = farnost && fabZapnuty(profil.k);
  const odF = (pad?: string) => farnost ? <OdFarnikov strankaId={profil.k} novy={novyOdF} pad={pad} fab={fab} /> : undefined;
  const padOdF = pc ? "44px 40px 0" : "28px 16px 0";
  const hore = (pad?: string) => farnost ? <PrihovorNaStranke strankaId={profil.k} pad={pad} /> : undefined; // KARTA 57 C.7–C.8
  const zakladStranka = (): ReactNode => {
    if (farnost) return <NastenkaFarnosti strankaId={profil.k} meno={cistyNazov(profF?.meno ?? profil0.meno) || "Vaša farnosť"} profil={profF} fab={fab} onBack={onBack} onDetail={setDetailF} stit={profil.stit as StitLevel} />;
    const podania = podanie === "pirat" ? <PiratCharita profil={profil} onDetail={setDetail} onZaznam={otvorZaznam} onBack={onBack} onKronika={() => setPrepis("kronika")} odFarnikov={odF(padOdF)} hore={hore(pc ? "24px 40px 0" : "16px 16px 0")} />
      : podanie === "vyklad" ? <VykladCharita profil={profil} onDetail={setDetail} onZaznam={otvorZaznam} onBack={onBack} odFarnikov={odF(padOdF)} hore={hore()} />
      : <Kronika profil={profil} onDetail={setDetail} onZaznam={otvorZaznam} onBack={onBack} odFarnikov={odF()} hore={hore()} />;
    const vlastneVzhlady = (profil.typ === "firma" || profil.typ === "tvorca") && maVybranyVzhlad(profil.k);
    if (vlastneVzhlady && !zStreamu) return podania;
    if (profil.typ === "firma") return <StrankaFirmy profil={profil} onDetail={setDetail} onBack={onBack} />; // KARTA 46
    // KARTA 47 · stream cez QR / odkaz: vľavo hore „{tvorca} ›" otvorí profil tvorcu
    if (zStreamu) return <StreamZbierka profil={profil} streamId={zStreamu} onTvorca={() => otvorVerejnyProfil("tvorca")} />;
    // KARTA 47 · stream z profilu tvorcu: profil ostáva pod ním (skrytý), „Späť" vráti na to isté miesto
    if (profil.typ === "tvorca") return (
      <div style={{ position: "relative", height: "100%" }}>
        <div aria-hidden={!!stream} style={stream ? { position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none" } : { height: "100%" }}>
          <StrankaTvorcu profil={profil} onBack={onBack} onStream={setStream} onDetail={setDetail} />
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
  const pribeh = detail ? pribehZbierky(detail.id) : null;
  const vrstva = detailF ? (
    <div className="sc-tokeny" style={{ background: "var(--bg)", minHeight: "100%" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: 14 }}>
        <ZbierkaModul zbierka={detailF} zoStrankyOrg onBack={() => setDetailF(null)} spatNazov="Späť na stránku farnosti" />
      </div>
    </div>
  ) : detail && pribeh ? (
    <PribehZbierky profil={profil} z={detail} p={pribeh} spatText={profil.meno.replace(/\s+o\.\s?z\.$/i, "")} onBack={() => setDetail(null)} />
  ) : detail ? (
    <div className="sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ background: "var(--bg)", minHeight: "100%" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: 14 }}>
        <ZbierkaModul zbierka={naZbierkaData(detail, profil)} zoStrankyOrg onBack={() => setDetail(null)} spatNazov="Späť na stránku" />
      </div>
    </div>
  ) : zaznam ? (
    <div className="vp sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ height: "100%" }}>
      {zaznam.typ === "zb"
        ? <DetailUkoncenej pc={pc} profil={profil} p={zaznam} onBack={() => setZaznam(null)} />
        : <DetailSkutku pc={pc} profil={profil} p={zaznam} onBack={() => setZaznam(null)} />}
    </div>
  ) : null;
  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div aria-hidden={vrstva ? true : undefined} style={vrstva ? { position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none" } : { height: "100%" }}>{zakladStranka()}</div>
      {vrstva && <div style={{ position: "absolute", inset: 0, overflowY: (detail && !pribeh) || detailF ? "auto" : undefined }}>{vrstva}</div>}
      {farnost && !vrstva && <FarnikPridava strankaId={profil.k} mobil={!pc} onPozriet={(id) => { setNovyOdF(id); const b = BLOK_DRUHU[odFarnikov(profil.k).find((x) => x.id === id)?.k ?? ""]; window.setTimeout(() => posunNaBlok(b?.[0] ?? "ozn"), 60); }} />}
    </div>);
}

/** OPRAVY 154: verejný profil otvorený zo Správy (charita, farnosť, firma, tvorca, klub, spolok) — okno NAD Správou
 *  ako VerejnyProfilOkno (portál, celá obrazovka), „Späť" vráti do Správy na to isté miesto. */
export function VerejnyProfilVSprave({ kluc, onZavri }: { kluc: string; onZavri: () => void }) {
  // OPRAVY 155/7: z-index 70 — nad Správou, ale POD oknami profilu (štít 80, platba 150, Iskry 160, galéria 1000)
  const { desktop } = useLayout();
  useEffect(() => vrstvaProfiluPripoj(), []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Verejný profil" style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: desktop ? 104 : 0, zIndex: 70, overflowY: "auto", background: "var(--c-bg)", WebkitOverflowScrolling: "touch" } as CSSProperties}>
      <VerejnyProfilView kluc={kluc} onBack={onZavri} />
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
  return <VrstvaProfilu><VerejnyProfilView kluc={kluc} onBack={zavriVerejnyProfil} /></VrstvaProfilu>;
}

function usePc1200() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1200px)").matches);
  useEffect(() => { const q = window.matchMedia("(min-width: 1200px)"), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}
