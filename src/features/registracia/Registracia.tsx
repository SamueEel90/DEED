// ============================================================
// DEED · Registrácia — orchestrátor
// §1: prvá obrazovka = profesionálne Prihlásenie / Registrácia (AuthPage).
//   · Prihlásenie → rovno do appky (návrat existujúceho člena)
//   · Registrácia → „Kto si?" → OsobaFlow / CharitaFlow
//   · Hosť → demo session (pozrieť appku bez registrácie)
// `start="aktivny"` = upgrade overlay (pasívny → aktívny): preskočí login aj
// „Kto si?" a otvorí rovno aktívny osoba tok.
// Po dokončení flow zavolá setSession → gate v Screens otvorí appku.
// ============================================================
import { useState } from "react";
import { C, GRAD } from "@/theme";
import { Otazka, toast, m, tint, IkonaOsoba, IkonaCharita, IkonaStit, IkonaInstitucia, IkonaSipVpravo } from "@/shared";
import { pressable } from "@/components/pressable";
import { setSession } from "@/lib/session";
import { AuthPage } from "./AuthPage";
import { OsobaFlow } from "./OsobaFlow";
import { CharitaFlow } from "./CharitaFlow";

type TypSubjektu = "osoba" | "charita";

export function Registracia({ onHotovo, start }: { onHotovo?: () => void; start?: "aktivny" }) {
  const [auth, setAuth] = useState(false); // prešiel cez login/register?
  const [typ, setTyp] = useState<TypSubjektu | null>(null); // null | "osoba" | "charita"

  // upgrade overlay (pasívny → aktívny) — rovno do aktívneho osoba toku
  if (start === "aktivny") {
    return (
      <div style={{ height: "100%", position: "relative", background: C.bg }}>
        <OsobaFlow startKrok="a1" onHotovo={onHotovo} onSpat={onHotovo} toast={toast} />
      </div>
    );
  }

  // prihlásenie / hosť → do appky ako demo náhľad (mock — bez reálneho backendu)
  const doApp = () => {
    setSession({ demo: true });
    onHotovo?.();
  };

  let obsah;
  if (!auth) {
    obsah = <AuthPage onSignIn={doApp} onSignUp={() => setAuth(true)} onGuest={doApp} />;
  } else if (typ === "osoba") {
    obsah = <OsobaFlow onHotovo={onHotovo} onSpat={() => setTyp(null)} toast={toast} />;
  } else if (typ === "charita") {
    obsah = <CharitaFlow onHotovo={onHotovo} onSpat={() => setTyp(null)} toast={toast} />;
  } else {
    obsah = <VidlickaTyp onPick={setTyp} onSpat={() => setAuth(false)} toast={toast} />;
  }

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {obsah}
    </div>
  );
}

// ---- §1 — Kto si (výber typu subjektu) — po registrácii ----
function VidlickaTyp({
  onPick,
  onSpat,
  toast,
}: {
  onPick: (typ: TypSubjektu) => void;
  onSpat: () => void;
  toast: (text: string) => void;
}) {
  // minimalistické line-ikony (ako v appke) + farebná dlaždica pre každý typ
  const moznosti = [
    { id: "osoba", Ikona: IkonaOsoba, col: "var(--a-green)", title: "Fyzická osoba", desc: "Tvoj osobný účet — skutky, karma, peňaženka.", onClick: () => onPick("osoba") },
    { id: "charita", Ikona: IkonaCharita, col: "var(--a-plum)", title: "Charita / OZ", desc: "Samostatný subjekt, nemieša sa s osobou.", onClick: () => onPick("charita") },
    { id: "b2b", Ikona: IkonaStit, col: "var(--a-info)", title: "B2B partner", desc: "Firma — ESG, matching, dobrovoľníctvo.", soon: true, onClick: () => toast("B2B partner — pripravujeme (fáza 2).") },
    { id: "klub", Ikona: IkonaInstitucia, col: "var(--a-gold)", title: "Klub · Zoskupenie · Cirkev", desc: "Registrácie ďalších entít.", soon: true, onClick: () => toast("Ďalšie typy subjektov — pripravujeme (fáza 2).") },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "34px 18px 18px" }}>
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22 }}>
          <span style={{ width: 46, height: 46, borderRadius: 14, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 23, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 6px 18px rgba(78,122,62,.42)", flex: "0 0 auto" }}>
            D<span style={{ position: "absolute", top: 6, right: 7, fontSize: 11 }}>+</span>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Ešte krok — kto si?</div>
            <div style={{ fontSize: 12, color: C.textTer, fontStyle: "italic" }}>Podľa toho ti pripravíme účet</div>
          </div>
        </div>

        <Otazka>Vyber typ účtu</Otazka>
        {moznosti.map((o, i) => (
          <m.div
            key={o.id}
            {...pressable(o.onClick, o.title)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, rotate: [0, -2, 2, -1, 0] }}
            transition={{ delay: 0.06 + i * 0.1, duration: 0.55, ease: "easeOut" }}
            whileHover={{ y: -3, rotate: [0, -1.3, 1.3, 0], boxShadow: `0 14px 30px ${tint(o.col, 0.28)}`, transition: { rotate: { duration: 0.4 }, default: { type: "spring", stiffness: 380, damping: 18 } } }}
            whileTap={{ scale: 0.985 }}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: 15, borderRadius: 18, marginBottom: 12, cursor: "pointer", background: C.surface, border: `1px solid ${C.line}` }}
          >
            <span style={{ width: 46, height: 46, borderRadius: 14, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", background: tint(o.col, 0.14), border: `1px solid ${tint(o.col, 0.28)}` }}>
              <o.Ikona size={23} color={o.col} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.01em" }}>{o.title}</span>
                {o.soon && (
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: C.textTer, background: "rgba(var(--glass-rgb),.07)", border: `1px solid ${C.line}`, borderRadius: 8, padding: "2px 7px" }}>čoskoro</span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: C.textSec, marginTop: 3, lineHeight: 1.45 }}>{o.desc}</div>
            </div>
            {!o.soon && <IkonaSipVpravo size={18} color={C.textTer} />}
          </m.div>
        ))}
      </div>

      <div style={{ padding: "12px 18px 18px", textAlign: "center", flex: "0 0 auto" }}>
        <span onClick={onSpat} style={{ fontSize: 13, color: C.textTer, cursor: "pointer" }}>
          ← Späť na prihlásenie
        </span>
      </div>
    </div>
  );
}
