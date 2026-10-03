// KARTA 43 · verejné profily (test). Host otvára návrh podľa typu profilu:
//   charita → Kronika · firma → Výklad (v2) · tvorca → Pirát (v4).
// Režim modulu z URL (?modul=vsade predvolene / ?modul=detail). V detaile ťuk
// na zbierku otvorí ZbierkaModul; vo vsade je modul rovno v karte.
import { useState } from "react";
import { ZbierkaModul } from "@/features/zbierka/ZbierkaModul";
import { najdiTestProfil, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { useVerejnyProfilOtvoreny, verejnyProfilKluc, verejnyProfilRezim, zavriVerejnyProfil } from "./otvor";
import { naZbierkaData } from "./casti";
import { Kronika } from "./Kronika";
import { Vyklad } from "./Vyklad";

export function VerejnyProfilHost() {
  const otv = useVerejnyProfilOtvoreny();
  if (!otv) return null;
  return <VerejnyProfilVrstva />;
}

function VerejnyProfilVrstva() {
  const kluc = verejnyProfilKluc();
  const profil = kluc ? najdiTestProfil(kluc) : undefined;
  const [detail, setDetail] = useState<TestZbierka | null>(null);
  if (!profil) return null;
  const rezim = verejnyProfilRezim();

  const obsah = detail ? (
    <div className="sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ background: "var(--bg)", minHeight: "100%" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: 14 }}>
        <ZbierkaModul zbierka={naZbierkaData(detail, profil)} zoStrankyOrg onBack={() => setDetail(null)} spatNazov="Späť na profil" />
      </div>
    </div>
  ) : (
    <VerejnyProfilObsah profil={profil} rezim={rezim} onDetail={setDetail} onBack={zavriVerejnyProfil} />
  );
  return <div style={{ position: "fixed", inset: 0, zIndex: 70, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>{obsah}</div>;
}

function VerejnyProfilObsah({ profil, rezim, onDetail, onBack }: {
  profil: TestProfil; rezim: "vsade" | "detail"; onDetail: (z: TestZbierka) => void; onBack: () => void;
}) {
  if (profil.typ === "firma") return <Vyklad profil={profil} rezim={rezim} onDetail={onDetail} onBack={onBack} />;
  // tvorca (Pirát) zatiaľ cez Kroniku, kým nie je hotový
  return <Kronika profil={profil} rezim={rezim} onDetail={onDetail} onBack={onBack} />;
}
