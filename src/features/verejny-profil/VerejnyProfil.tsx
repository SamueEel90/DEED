// KARTA 43 · verejné profily (test). Jedna obrazovka, návrh podľa typu:
//   charita → Kronika / Výklad / Pirát (KARTA 45, testovací prepínač) · firma → stránka firmy (KARTA 46) · tvorca → stránka tvorcu (KARTA 47).
//   kľúč „stream:{id}" (odkaz /z/{zbierka}?s={stream}) → stránka streamu na zbierku (KARTA 47).
// KARTA 43 ZMENA: režim „vsade" zrušený — platobný modul sa otvorí len po ťuku na zbierku/skutok.
// VerejnyProfilView sa dá vložiť priamo (feed, „Stránka organizácie", adresár),
// VerejnyProfilHost je celoobrazovková vrstva otváraná zo store (tlačidlo v Správe, QR).
import { useEffect, useRef, useState } from "react";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { najdiTestProfil, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { otvorVerejnyProfil, useVerejnyProfilOtvoreny, verejnyProfilKluc, zavriVerejnyProfil } from "./otvor";
import { VrstvaProfilu, naZbierkaData, PrepinacPodania, usePodanie } from "./casti";
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

/** vložiteľný verejný profil podľa kľúča stránky (svetlo · pekaren · tvorca) */
export function VerejnyProfilView({ kluc, onBack }: { kluc: string; onBack: () => void }) {
  const zStreamu = kluc.startsWith("stream:") ? kluc.slice(7) : null;
  const profil = najdiTestProfil(zStreamu ? "tvorca" : kluc);
  const [detail, setDetail] = useState<TestZbierka | null>(null);
  const [stream, setStream] = useState<string | null>(null);
  // doplnky 4. 10.: záznam z kroniky / rokov — skutok, akcia, ukončená zbierka (bez platby), Iskra = Iskry na tom videu
  const [zaznam, setZaznam] = useState<PolCh | null>(null);
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
  const [podanie] = usePodanie(); // KARTA 45: charita v 3 podaniach (testovací prepínač na profile)
  if (!profil) return null;

  if (detail) return (
    <div className="sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ background: "var(--bg)", minHeight: "100%" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: 14 }}>
        <ZbierkaModul zbierka={naZbierkaData(detail, profil)} zoStrankyOrg onBack={() => setDetail(null)} spatNazov="Späť na profil" />
      </div>
    </div>
  );

  if (zaznam) return (
    <div className="vp sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ height: "100%" }}>
      {zaznam.typ === "zb"
        ? <DetailUkoncenej pc={pc} profil={profil} p={zaznam} onBack={() => setZaznam(null)} />
        : <DetailSkutku pc={pc} profil={profil} p={zaznam} onBack={() => setZaznam(null)} />}
    </div>
  );

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
  const prepinac = TESTOVACIA ? <PrepinacPodania /> : undefined;
  if (podanie === "pirat") return <PiratCharita profil={profil} onDetail={setDetail} onBack={onBack} prepinac={TESTOVACIA ? <PrepinacPodania tmavy /> : undefined} />;
  if (podanie === "vyklad") return <VykladCharita profil={profil} onDetail={setDetail} onZaznam={otvorZaznam} onBack={onBack} prepinac={prepinac} />;
  return <Kronika profil={profil} onDetail={setDetail} onZaznam={otvorZaznam} onBack={onBack} prepinac={prepinac} />;
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
