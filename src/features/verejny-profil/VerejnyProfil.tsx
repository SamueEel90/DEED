// KARTA 43 · verejné profily (test). Jedna obrazovka, návrh podľa typu:
//   charita → Kronika / Výklad / Pirát (KARTA 45, testovací prepínač) · firma → stránka firmy (KARTA 46) · tvorca → stránka tvorcu (KARTA 47).
//   kľúč „stream:{id}" (odkaz /z/{zbierka}?s={stream}) → stránka streamu na zbierku (KARTA 47).
// KARTA 43 ZMENA: režim „vsade" zrušený — platobný modul sa otvorí len po ťuku na zbierku/skutok.
// VerejnyProfilView sa dá vložiť priamo (feed, „Stránka organizácie", adresár),
// VerejnyProfilHost je celoobrazovková vrstva otváraná zo store (tlačidlo v Správe, QR).
import { useEffect, useState } from "react";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { najdiTestProfil, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { useVerejnyProfilOtvoreny, verejnyProfilKluc, zavriVerejnyProfil } from "./otvor";
import { VrstvaProfilu, naZbierkaData, PrepinacPodania, usePodanie } from "./casti";
import { TESTOVACIA } from "@/lib/testovacia";
import { Kronika } from "./Kronika";
import { VykladCharita } from "./VykladCharita";
import { PiratCharita } from "./PiratCharita";
import { StrankaFirmy } from "./StrankaFirmy";
import { StrankaTvorcu } from "./StrankaTvorcu";
import { StreamZbierka } from "./StreamZbierka";

/** vložiteľný verejný profil podľa kľúča stránky (svetlo · pekaren · tvorca) */
export function VerejnyProfilView({ kluc, onBack }: { kluc: string; onBack: () => void }) {
  const zStreamu = kluc.startsWith("stream:") ? kluc.slice(7) : null;
  const profil = najdiTestProfil(zStreamu ? "tvorca" : kluc);
  const [detail, setDetail] = useState<TestZbierka | null>(null);
  const [stream, setStream] = useState<string | null>(null);
  // stránka streamu otvorená z profilu tvorcu: krok späť v prehliadači (alebo gesto) vráti na tvorcu
  useEffect(() => {
    if (!stream) return;
    try { window.history.pushState({ deedStream: stream }, ""); } catch { /* sandbox */ }
    const f = () => setStream(null);
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

  if (profil.typ === "firma") return <StrankaFirmy profil={profil} onDetail={setDetail} onBack={onBack} />; // KARTA 46
  if (zStreamu || stream) return <StreamZbierka profil={profil} streamId={(zStreamu || stream)!} />; // KARTA 47
  if (profil.typ === "tvorca") return <StrankaTvorcu profil={profil} onBack={onBack} onStream={setStream} />; // KARTA 47
  const prepinac = TESTOVACIA ? <PrepinacPodania /> : undefined;
  if (podanie === "pirat") return <PiratCharita profil={profil} onDetail={setDetail} onBack={onBack} prepinac={TESTOVACIA ? <PrepinacPodania tmavy /> : undefined} />;
  if (podanie === "vyklad") return <VykladCharita profil={profil} onDetail={setDetail} onBack={onBack} prepinac={prepinac} />;
  return <Kronika profil={profil} onDetail={setDetail} onBack={onBack} prepinac={prepinac} />;
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
