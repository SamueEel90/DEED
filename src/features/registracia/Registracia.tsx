// ============================================================
// DEED · Registrácia — orchestrátor
// §1 (charita doc): prvá obrazovka = výber typu subjektu.
// Fyzická osoba → OsobaFlow · Charita/OZ → CharitaFlow.
// "Preskočiť" → demo session (pozrieť appku bez registrácie).
// Po dokončení flow zavolá setSession → gate v Screens otvorí appku.
// ============================================================
import { useRef, useState } from "react";
import { C, GRAD } from "@/theme";
import { Vyber, Otazka, Toast } from "@/shared";
import { setSession } from "@/lib/session";
import { OsobaFlow } from "./OsobaFlow";
import { CharitaFlow } from "./CharitaFlow";

type TypSubjektu = "osoba" | "charita";

export function Registracia({ onHotovo }: { onHotovo?: () => void }) {
  const [typ, setTyp] = useState<TypSubjektu | null>(null); // null | "osoba" | "charita"
  const [toastText, setToastText] = useState("");

  const zhasni = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = (text: string) => {
    setToastText(text);
    if (zhasni.current) clearTimeout(zhasni.current);
    zhasni.current = setTimeout(() => setToastText(""), 2600);
  };

  const spat = () => setTyp(null);
  const preskoc = () => {
    setSession({ demo: true });
    onHotovo?.();
  };

  let obsah;
  if (typ === "osoba") obsah = <OsobaFlow onHotovo={onHotovo} onSpat={spat} toast={toast} />;
  else if (typ === "charita") obsah = <CharitaFlow onHotovo={onHotovo} onSpat={spat} toast={toast} />;
  else obsah = <VidlickaTyp onPick={setTyp} onPreskoc={preskoc} toast={toast} />;

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {obsah}
      <Toast text={toastText} />
    </div>
  );
}

// ---- §1 — Kto si (výber typu subjektu) ----
function VidlickaTyp({
  onPick,
  onPreskoc,
  toast,
}: {
  onPick: (typ: TypSubjektu) => void;
  onPreskoc: () => void;
  toast: (text: string) => void;
}) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "34px 18px 18px" }}>
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22 }}>
          <span style={{ width: 46, height: 46, borderRadius: 14, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 23, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 6px 18px rgba(99,134,255,.42)", flex: "0 0 auto" }}>
            D<span style={{ position: "absolute", top: 6, right: 7, fontSize: 11 }}>+</span>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Vitaj v DEED</div>
            <div style={{ fontSize: 12, color: C.textTer, fontStyle: "italic" }}>Miesto, kde nerozhodujú slová, ale skutky</div>
          </div>
        </div>

        <Otazka>Kto si?</Otazka>
        <Vyber emoji="🙋" title="Fyzická osoba" desc="Tvoj osobný účet — skutky, karma, peňaženka." onClick={() => onPick("osoba")} />
        <Vyber emoji="🎗️" title="Charita / OZ" desc="Samostatný subjekt, nemieša sa s osobou." onClick={() => onPick("charita")} />
        <Vyber emoji="🏢" title="B2B partner" desc="Firma — ESG, matching, dobrovoľníctvo." onClick={() => toast("B2B partner — pripravujeme (fáza 2).")} />
        <Vyber emoji="⚽" title="Klub · Zoskupenie · Cirkev" desc="Registrácie ďalších entít." onClick={() => toast("Ďalšie typy subjektov — pripravujeme (fáza 2).")} />
      </div>

      <div style={{ padding: "12px 18px 18px", textAlign: "center", flex: "0 0 auto" }}>
        <span onClick={onPreskoc} style={{ fontSize: 13, color: C.textTer, cursor: "pointer", textDecoration: "underline" }}>
          Preskočiť — pozrieť demo appky
        </span>
      </div>
    </div>
  );
}
