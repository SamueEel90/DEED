// ============================================================
// Prihlásený používateľ — jeden zdroj pravdy pre celú appku.
//  · demo session ({demo:true}) → pôvodný "Martin K." (admin skip login)
//  · reálna session ({ucet_id}) → načíta účet/profil/zobrazenie/lokalitu z DB
// Komponenty čítajú cez usePouzivatel().
// ============================================================
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { nacitajUcetData } from "./db";
import { nacitajFotoProfilu, ulozFotoProfilu } from "./fotoprofilu";
import { jeNeregistrovany, sledujDarcu } from "./devDarca";

// demo identita podľa DEV prepínača: registrovaný (plný účet) / neregistrovaný (host, len EUR)
const demoStav = (): Pouzivatel => (jeNeregistrovany()
  ? { ...DEMO, typ: "pasivny", mozeTvorit: false, mozeDeed: false, foto: nacitajFotoProfilu(null) }
  : { ...DEMO, foto: nacitajFotoProfilu(null) });
import type { Pouzivatel, Session, UcetData } from "@/types";

// DEMO identita = presne to, čo appka zobrazovala doteraz (admin/preskočiť)
const DEMO: Pouzivatel = {
  demo: true,
  ucetId: null,
  typ: "demo",
  mozeTvorit: true, // demo = plný náhľad (admin / „pozrieť appku")
  mozeDeed: true,
  meno: "Martin",
  priezvisko: "Konaľ",
  celeMeno: "Martin Konaľ",
  iniciala: "M",
  foto: null, // demo identita si fotku dopĺňa sama (nacitajFotoProfilu pri mounte)
  mesto: "Trenčín",
  poradoveCislo: null,
  rezim: "cele",
  nick: "Martin585",
  tier: "Gold · L7",
  tint: "#3A8DD6",
  nacitavam: false,
};

const PouzivatelContext = createContext<Pouzivatel>(DEMO);
export const usePouzivatel = () => useContext(PouzivatelContext);

// stabilný odtieň avataru z mena
const TINTY = ["#3A8DD6", "#7C5BD8", "var(--a-green)", "#E7894D", "#D65B8A", "#43B0C8"];
function tintPre(s: string): string {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TINTY[h % TINTY.length];
}

function odvod(data: UcetData | null, session: Session): Pouzivatel {
  const { ucet, profil, zobrazenie, lokalita, organizacia } = data || ({} as UcetData);
  const ses = session && !session.demo ? session : null;
  const jeCharita = (ucet?.typ || ses?.typ) === "charita";
  const meno = jeCharita
    ? organizacia?.nazov || ses?.meno || "Charita"
    : profil?.meno || ses?.meno || "Člen";
  const priezvisko = jeCharita ? "" : profil?.priezvisko || "";
  const celeMeno = (jeCharita ? meno : `${meno} ${priezvisko}`).trim();
  const mesto = lokalita?.mesto || profil?.mesto || organizacia?.sidlo || "—";
  // rod sa v DB ešte neukladá — kým ho server nedoplní, ostáva mužský tvar
  const rod = (profil as { rod?: "muz" | "zena" } | null)?.rod;
  const typ = ucet?.typ || ses?.typ || "aktivny";
  return {
    demo: false,
    ucetId: ucet?.id || ses?.ucet_id || null,
    typ,
    mozeTvorit: typ !== "pasivny", // pasívny len prezerá + prispieva
    mozeDeed: typ !== "pasivny", // pasívny prispieva len v EUR (DEED vyžaduje účet)
    meno,
    priezvisko,
    celeMeno: celeMeno || "Člen",
    iniciala: (celeMeno.trim()[0] || "?").toUpperCase(),
    // fotka: DB je zdroj pravdy, lokálna kópia drží posledný upload (offline/mock)
    foto: profil?.profilovka_url || nacitajFotoProfilu(ucet?.id || ses?.ucet_id) || null,
    mesto,
    rod,
    poradoveCislo: ucet?.poradove_cislo ?? ses?.poradove_cislo ?? null,
    rezim: zobrazenie?.rezim || "anonym",
    nick: zobrazenie?.nick || null,
    tier: jeCharita ? "Overená charita" : "Nováčik · L1",
    tint: tintPre(celeMeno || meno),
    nacitavam: false,
  };
}

// seed z dát v session (kým dobehne DB) — žiadny flash prázdneho profilu
function seed(session: Session): Pouzivatel {
  const ses = session && !session.demo ? session : null;
  const meno = ses?.meno || "Člen";
  const jeCharita = ses?.typ === "charita";
  const typ = ses?.typ || "aktivny";
  return {
    demo: false,
    ucetId: ses?.ucet_id || null,
    typ,
    mozeTvorit: typ !== "pasivny", // pasívny len prezerá + prispieva
    mozeDeed: typ !== "pasivny", // pasívny prispieva len v EUR (DEED vyžaduje účet)
    meno,
    priezvisko: "",
    celeMeno: meno,
    iniciala: (meno.trim()[0] || "?").toUpperCase(),
    foto: nacitajFotoProfilu(ses?.ucet_id) || null,
    mesto: "—",
    poradoveCislo: ses?.poradove_cislo ?? null,
    rezim: "anonym",
    nick: null,
    tier: jeCharita ? "Overená charita" : "Nováčik · L1",
    tint: tintPre(meno),
    nacitavam: true,
  };
}

export function PouzivatelProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [stav, setStav] = useState<Pouzivatel>(() =>
    !session || session.demo ? demoStav() : seed(session));

  const refresh = useCallback(async () => {
    if (!session || session.demo || !session.ucet_id) return;
    try {
      const data = await nacitajUcetData(session.ucet_id);
      setStav(odvod(data, session));
    } catch {
      setStav((s) => ({ ...s, nacitavam: false }));
    }
  }, [session]);

  // profilová fotka — jedna cesta pre demo aj reálny účet (LS + best-effort DB),
  // stav sa prepíše hneď (bez čakania na refresh z DB) → avatar sa zmení okamžite
  const ucetId = stav.ucetId;
  const nastavFoto = useCallback((dataUrl: string | null) => {
    ulozFotoProfilu(ucetId, dataUrl);
    setStav((s) => ({ ...s, foto: dataUrl }));
  }, [ucetId]);

  useEffect(() => {
    if (!session || session.demo) {
      setStav(demoStav());
      return sledujDarcu(() => setStav(demoStav())); // DEV prepínač registrovaný / neregistrovaný
    }
    setStav(seed(session));
    refresh();
  }, [session, refresh]);

  // Meno prihláseného sa odkladá do localStorage: engine dorovnaní musí vedieť,
  // či darca je zamestnancom firmy, a k React kontextu sa nedostane.
  // Platí pre KAŽDÚ identitu vrátane demo — inak by zamestnanecké dorovnanie
  // v prototype nikdy nenabehlo (demo cesta odvod() neprechádza).
  useEffect(() => {
    const meno = (stav.celeMeno || stav.meno || "").trim();
    try {
      if (meno) localStorage.setItem("deed.ja.meno", meno);
      else localStorage.removeItem("deed.ja.meno");
    } catch { /* LS nedostupné */ }
  }, [stav.celeMeno, stav.meno]);

  return <PouzivatelContext.Provider value={{ ...stav, refresh, nastavFoto }}>{children}</PouzivatelContext.Provider>;
}
