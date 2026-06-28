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
import { C, GRAD, SPACE, RADIUS, infoBox } from "@/theme";
import { Otazka, Vyber, toast, m, tint, IkonaOsoba, IkonaCharita, IkonaStit, IkonaInstitucia, IkonaSipVpravo } from "@/shared";
import { pressable } from "@/components/pressable";
import { setSession } from "@/lib/session";
import type { TypUctu } from "@/types";
import { AuthPage } from "./AuthPage";
import { OsobaFlow } from "./OsobaFlow";
import { CharitaFlow } from "./CharitaFlow";
import { Shell } from "./RegKit";

type TypSubjektu = "osoba" | "charita";

// resume = boot zistil prihláseného usera bez dokončeného účtu → skoč do flow.
export function Registracia({ onHotovo, start, resume }: { onHotovo?: () => void; start?: "aktivny"; resume?: { authId: string; typ?: TypUctu; stav?: string } }) {
  // auth identita (Supabase Auth) — z resume pri boote, alebo po signup/login
  const [authId, setAuthId] = useState<string | null>(resume?.authId ?? null);
  const [email, setEmail] = useState<string>("");
  const [typ, setTyp] = useState<TypSubjektu | null>(
    resume?.typ === "charita" ? "charita" : (resume?.typ === "aktivny" || resume?.typ === "pasivny") ? "osoba" : null
  );
  // „Pokračovať bez prihlásenia" → medziobrazovka s pasívnym vstupom (bez Supabase Auth)
  const [pasivny, setPasivny] = useState(false);

  // upgrade overlay (pasívny → aktívny) — legacy telefón tok (samostatný follow-up na auth)
  if (start === "aktivny") {
    return (
      <div style={{ height: "100%", position: "relative", background: C.bg }}>
        <OsobaFlow startKrok="a1" onHotovo={onHotovo} onSpat={onHotovo} toast={toast} />
      </div>
    );
  }

  // hosť → demo náhľad (bez Supabase Auth — pre vývoj)
  const doApp = () => {
    setSession({ demo: true });
    onHotovo?.();
  };

  // pasívny vstup bez prihlásenia (anonym, bez DB účtu) → ephemeral session → appka.
  // Pasívny len prezerá a prispieva (EUR/SMS); na tvorbu sa kedykoľvek zaregistruje.
  const vstupPasivne = () => {
    setSession({ typ: "pasivny", meno: "Hosť" });
    onHotovo?.();
  };

  // po úspešnej registrácii / logine-ktorý-potrebuje-onboarding
  const onAuthed = (id: string, em: string, t?: TypUctu) => {
    setAuthId(id);
    setEmail(em);
    if (t === "charita") setTyp("charita");
    else if (t === "aktivny" || t === "pasivny") setTyp("osoba");
    // inak ostane null → „Kto si?"
  };

  let obsah;
  if (!authId) {
    obsah = pasivny
      ? <PasivnyVstup onConfirm={vstupPasivne} onSpat={() => setPasivny(false)} />
      : <AuthPage onAuthed={onAuthed} onGuest={doApp} onPasivny={() => setPasivny(true)} />;
  } else if (typ === "osoba") {
    obsah = <OsobaFlow authId={authId} email={email} onHotovo={onHotovo} onSpat={() => setTyp(null)} toast={toast} />;
  } else if (typ === "charita") {
    obsah = <CharitaFlow authId={authId} email={email} resume={!!resume} onHotovo={onHotovo} onSpat={() => setTyp(null)} toast={toast} />;
  } else {
    obsah = <VidlickaTyp onPick={setTyp} onSpat={() => setAuthId(null)} toast={toast} />;
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
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.lg }}>
          <span style={{ width: 46, height: 46, borderRadius: RADIUS.md, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 23, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 6px 18px rgba(78,122,62,.42)", flex: "0 0 auto" }}>
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
            style={{ display: "flex", alignItems: "center", gap: SPACE.gutter, padding: SPACE.md, borderRadius: RADIUS.md, marginBottom: SPACE.sm, cursor: "pointer", background: C.surface, border: `1px solid ${C.line}` }}
          >
            <span style={{ width: 46, height: 46, borderRadius: RADIUS.md, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", background: tint(o.col, 0.14), border: `1px solid ${tint(o.col, 0.28)}` }}>
              <o.Ikona size={23} color={o.col} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, flexWrap: "wrap" }}>
                <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.01em" }}>{o.title}</span>
                {o.soon && (
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: C.textTer, background: "rgba(var(--glass-rgb),.07)", border: `1px solid ${C.line}`, borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>čoskoro</span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: C.textSec, marginTop: SPACE.xxs, lineHeight: 1.45 }}>{o.desc}</div>
            </div>
            {!o.soon && <IkonaSipVpravo size={18} color={C.textTer} />}
          </m.div>
        ))}
      </div>

      <div style={{ padding: `${SPACE.sm}px ${SPACE.md}px ${SPACE.md}px`, textAlign: "center", flex: "0 0 auto" }}>
        <span onClick={onSpat} style={{ fontSize: 13, color: C.textTer, cursor: "pointer" }}>
          ← Späť na prihlásenie
        </span>
      </div>
    </div>
  );
}

// ---- „Pokračovať bez prihlásenia" → pasívny vstup (anonym, bez účtu) ----
function PasivnyVstup({ onConfirm, onSpat }: { onConfirm: () => void; onSpat: () => void }) {
  return (
    <Shell title="Bez prihlásenia" onBack={onSpat}>
      <Otazka>Pokračuj ako pasívny</Otazka>
      <Vyber
        emoji="💛"
        title="Pasívny — len prispievam"
        desc="Prezeraj a prispievaj (FIAT/karta/SMS) všade. Bez vytvárania obsahu."
        active={false}
        onClick={onConfirm}
      />
      <div style={infoBox}>
        Pasívny vojde do appky hneď a môže komukoľvek prispieť. Na vytváranie obsahu sa kedykoľvek zaregistruješ — bez straty doterajšieho.
      </div>
    </Shell>
  );
}
