// ============================================================
// Prihlásený používateľ — jeden zdroj pravdy pre celú appku.
//  · demo session ({demo:true}) → pôvodný "Martin K." (admin skip login)
//  · reálna session ({ucet_id}) → načíta účet/profil/zobrazenie/lokalitu z DB
// Komponenty čítajú cez usePouzivatel().
// ============================================================
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { nacitajUcetData } from "./db";
import type { Pouzivatel, Session, UcetData } from "@/types";

// DEMO identita = presne to, čo appka zobrazovala doteraz (admin/preskočiť)
const DEMO: Pouzivatel = {
  demo: true,
  ucetId: null,
  typ: "demo",
  meno: "Martin",
  priezvisko: "K.",
  celeMeno: "Martin K.",
  iniciala: "M",
  mesto: "Trenčín",
  poradoveCislo: null,
  rezim: "cele",
  nick: null,
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
  return {
    demo: false,
    ucetId: ucet?.id || ses?.ucet_id || null,
    typ: ucet?.typ || ses?.typ || "aktivny",
    meno,
    priezvisko,
    celeMeno: celeMeno || "Člen",
    iniciala: (celeMeno.trim()[0] || "?").toUpperCase(),
    mesto,
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
  return {
    demo: false,
    ucetId: ses?.ucet_id || null,
    typ: ses?.typ || "aktivny",
    meno,
    priezvisko: "",
    celeMeno: meno,
    iniciala: (meno.trim()[0] || "?").toUpperCase(),
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
  const [stav, setStav] = useState<Pouzivatel>(() => (!session || session.demo ? DEMO : seed(session)));

  const refresh = useCallback(async () => {
    if (!session || session.demo || !session.ucet_id) return;
    try {
      const data = await nacitajUcetData(session.ucet_id);
      setStav(odvod(data, session));
    } catch {
      setStav((s) => ({ ...s, nacitavam: false }));
    }
  }, [session]);

  useEffect(() => {
    if (!session || session.demo) {
      setStav(DEMO);
      return;
    }
    setStav(seed(session));
    refresh();
  }, [session, refresh]);

  return <PouzivatelContext.Provider value={{ ...stav, refresh }}>{children}</PouzivatelContext.Provider>;
}
