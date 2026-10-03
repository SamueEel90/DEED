// KARTA 43 · verejné profily (test). Jedna obrazovka, návrh podľa typu:
//   charita → Kronika · firma → Výklad (v2) · tvorca → Pirát (v4).
// KARTA 43 ZMENA: režim „vsade" zrušený — platobný modul sa otvorí len po ťuku na zbierku/skutok.
// VerejnyProfilView sa dá vložiť priamo (feed, „Stránka organizácie", adresár),
// VerejnyProfilHost je celoobrazovková vrstva otváraná zo store (tlačidlo v Správe, QR).
import { useState } from "react";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { najdiTestProfil, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { useVerejnyProfilOtvoreny, verejnyProfilKluc, zavriVerejnyProfil } from "./otvor";
import { naZbierkaData } from "./casti";
import { Kronika } from "./Kronika";
import { Vyklad } from "./Vyklad";
import { Pirat } from "./Pirat";

/** vložiteľný verejný profil podľa kľúča stránky (svetlo · pekaren · tvorca) */
export function VerejnyProfilView({ kluc, onBack }: { kluc: string; onBack: () => void }) {
  const profil = najdiTestProfil(kluc);
  const [detail, setDetail] = useState<TestZbierka | null>(null);
  if (!profil) return null;

  if (detail) return (
    <div className="sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ background: "var(--bg)", minHeight: "100%" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: 14 }}>
        <ZbierkaModul zbierka={naZbierkaData(detail, profil)} zoStrankyOrg onBack={() => setDetail(null)} spatNazov="Späť na profil" />
      </div>
    </div>
  );

  if (profil.typ === "firma") return <Vyklad profil={profil} onDetail={setDetail} onBack={onBack} />;
  if (profil.typ === "tvorca") return <Pirat profil={profil} onDetail={setDetail} onBack={onBack} />;
  return <Kronika profil={profil} onDetail={setDetail} onBack={onBack} />;
}

/** celoobrazovková vrstva otváraná zo store (otvorVerejnyProfil) — tlačidlo v Správe, QR, zdieľaný odkaz */
export function VerejnyProfilHost() {
  const otv = useVerejnyProfilOtvoreny();
  if (!otv) return null;
  return <VerejnyProfilVrstva />;
}

function VerejnyProfilVrstva() {
  const kluc = verejnyProfilKluc();
  if (!kluc) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <VerejnyProfilView kluc={kluc} onBack={zavriVerejnyProfil} />
    </div>
  );
}
