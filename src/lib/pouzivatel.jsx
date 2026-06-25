// ============================================================
// Prihlásený používateľ — jeden zdroj pravdy pre celú appku.
//  · demo session ({demo:true}) → pôvodný "Martin K." (admin skip login)
//  · reálna session ({ucet_id}) → načíta účet/profil/zobrazenie/lokalitu z DB
// Komponenty čítajú cez usePouzivatel().
// ============================================================
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { nacitajUcetData } from "./db";

// DEMO identita = presne to, čo appka zobrazovala doteraz (admin/preskočiť)
const DEMO = {
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

const PouzivatelContext = createContext(DEMO);
export const usePouzivatel = () => useContext(PouzivatelContext);

// stabilný odtieň avataru z mena
const TINTY = ["#3A8DD6", "#7C5BD8", "#1FBF8F", "#E7894D", "#D65B8A", "#43B0C8"];
function tintPre(s) {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TINTY[h % TINTY.length];
}

function odvod(data, session) {
  const { ucet, profil, zobrazenie, lokalita, organizacia } = data || {};
  const jeCharita = (ucet?.typ || session?.typ) === "charita";
  const meno = jeCharita
    ? organizacia?.nazov || session?.meno || "Charita"
    : profil?.meno || session?.meno || "Člen";
  const priezvisko = jeCharita ? "" : profil?.priezvisko || "";
  const celeMeno = (jeCharita ? meno : `${meno} ${priezvisko}`).trim();
  const mesto = lokalita?.mesto || profil?.mesto || organizacia?.sidlo || "—";
  return {
    demo: false,
    ucetId: ucet?.id || session?.ucet_id,
    typ: ucet?.typ || session?.typ,
    meno,
    priezvisko,
    celeMeno: celeMeno || "Člen",
    iniciala: (celeMeno.trim()[0] || "?").toUpperCase(),
    mesto,
    poradoveCislo: ucet?.poradove_cislo ?? session?.poradove_cislo ?? null,
    rezim: zobrazenie?.rezim || "anonym",
    nick: zobrazenie?.nick || null,
    tier: jeCharita ? "Overená charita" : "Nováčik · L1",
    tint: tintPre(celeMeno || meno),
    nacitavam: false,
  };
}

// seed z dát v session (kým dobehne DB) — žiadny flash prázdneho profilu
function seed(session) {
  const meno = session?.meno || "Člen";
  const jeCharita = session?.typ === "charita";
  return {
    demo: false,
    ucetId: session?.ucet_id || null,
    typ: session?.typ || "aktivny",
    meno,
    priezvisko: "",
    celeMeno: meno,
    iniciala: (meno.trim()[0] || "?").toUpperCase(),
    mesto: "—",
    poradoveCislo: session?.poradove_cislo ?? null,
    rezim: "anonym",
    nick: null,
    tier: jeCharita ? "Overená charita" : "Nováčik · L1",
    tint: tintPre(meno),
    nacitavam: true,
  };
}

export function PouzivatelProvider({ session, children }) {
  const [stav, setStav] = useState(() => (!session || session.demo ? DEMO : seed(session)));

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
