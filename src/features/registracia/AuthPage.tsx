// ============================================================
// DEED · Login / Register — profesionálna vstupná obrazovka (§1)
// Prvá obrazovka appky. Prihlásenie (návrat do appky) / Registrácia
// (pokračuje na „Kto si?" → onboarding). Vizuál zladený s DEED témou
// (warm earthy, light primary) — žiadne natvrdo zadané akcenty.
//   · onSignIn() — existujúci člen → rovno do appky
//   · onSignUp() — nový účet → pokračuje na výber typu subjektu
//   · onGuest()  — pozrieť demo bez registrácie
// Auth je zatiaľ mock (bez reálneho backendu) — overuje len formát polí.
// ============================================================
import { useState, type CSSProperties, type ReactNode } from "react";
import { C, GRAD, gradText } from "@/theme";
import { toast, IkonaObalka, IkonaZamok, IkonaOko, IkonaOkoOff, IkonaSipVpravo } from "@/shared";

type Rezim = "login" | "register";

export function AuthPage({ onSignIn, onSignUp, onGuest }: { onSignIn?: () => void; onSignUp?: () => void; onGuest?: () => void }) {
  const [rezim, setRezim] = useState<Rezim>("login");
  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [heslo2, setHeslo2] = useState("");
  const [ukazHeslo, setUkazHeslo] = useState(false);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const hesloOk = heslo.length >= 6;
  const zhoda = heslo === heslo2;
  const jeLogin = rezim === "login";
  const canSubmit = emailOk && hesloOk && (jeLogin || (heslo2.length > 0 && zhoda));

  const submit = () => {
    if (!canSubmit) return;
    if (jeLogin) onSignIn?.();
    else onSignUp?.();
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "transparent" }}>
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 22px 26px", maxWidth: 440, margin: "0 auto", boxSizing: "border-box" }}>

        {/* brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 22 }}>
          <span style={{ width: 64, height: 64, borderRadius: 20, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 12px 30px rgba(78,122,62,.4), inset 0 1px 0 rgba(255,255,255,.25)" }}>
            D<span style={{ position: "absolute", top: 9, right: 11, fontSize: 14 }}>+</span>
          </span>
          <div style={{ fontSize: 27, fontWeight: 800, marginTop: 16, letterSpacing: "-.01em" }}>
            {jeLogin ? "Vitaj späť" : <>Vitaj v <span style={gradText}>DEED</span></>}
          </div>
          <div style={{ fontSize: 13.5, color: C.textSec, marginTop: 6, lineHeight: 1.5, maxWidth: 300 }}>
            {jeLogin ? "Prihlás sa a pokračuj v dobrých skutkoch." : "Vytvor si účet — miesto, kde nerozhodujú slová, ale skutky."}
          </div>
        </div>

        {/* prepínač Prihlásenie / Registrácia */}
        <div style={{ display: "flex", padding: 4, borderRadius: 15, background: C.surface2, border: `1px solid ${C.line}`, marginBottom: 20 }}>
          {([["login", "Prihlásenie"], ["register", "Registrácia"]] as const).map(([r, label]) => {
            const on = rezim === r;
            return (
              <button key={r} onClick={() => setRezim(r)} style={{
                flex: 1, padding: "10px 0", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13.5, fontWeight: 700, transition: "all .2s ease",
                background: on ? GRAD : "transparent", color: on ? "#fff" : C.textSec,
                boxShadow: on ? "0 6px 16px rgba(78,122,62,.3)" : "none",
              }}>{label}</button>
            );
          })}
        </div>

        {/* email */}
        <Pole label="Email">
          <PoleVstup icon={<IkonaObalka size={18} color={C.textTer} />}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email"
              placeholder="tvoj@email.sk" style={vstupStyl} />
          </PoleVstup>
        </Pole>

        {/* heslo */}
        <Pole label="Heslo">
          <PoleVstup icon={<IkonaZamok size={18} color={C.textTer} />} right={
            <button onClick={() => setUkazHeslo((v) => !v)} aria-label={ukazHeslo ? "Skryť heslo" : "Zobraziť heslo"} style={ocBtn}>
              {ukazHeslo ? <IkonaOkoOff size={18} color={C.textTer} /> : <IkonaOko size={18} color={C.textTer} />}
            </button>
          }>
            <input value={heslo} onChange={(e) => setHeslo(e.target.value)} type={ukazHeslo ? "text" : "password"}
              autoComplete={jeLogin ? "current-password" : "new-password"}
              placeholder={jeLogin ? "Tvoje heslo" : "Aspoň 6 znakov"} style={vstupStyl} />
          </PoleVstup>
        </Pole>

        {/* heslo znova (registrácia) */}
        {!jeLogin && (
          <Pole label="Heslo znova">
            <PoleVstup icon={<IkonaZamok size={18} color={C.textTer} />} chyba={heslo2.length > 0 && !zhoda}>
              <input value={heslo2} onChange={(e) => setHeslo2(e.target.value)} type={ukazHeslo ? "text" : "password"}
                autoComplete="new-password" placeholder="Zopakuj heslo" style={vstupStyl} />
            </PoleVstup>
            {heslo2.length > 0 && !zhoda && <div style={{ fontSize: 12, color: C.red, marginTop: 6, fontWeight: 600 }}>Heslá sa nezhodujú.</div>}
          </Pole>
        )}

        {jeLogin && (
          <div style={{ textAlign: "right", marginTop: -4, marginBottom: 4 }}>
            <span onClick={() => toast("Obnova hesla — pripravujeme.")} style={{ fontSize: 12.5, color: C.textTer, cursor: "pointer" }}>Zabudnuté heslo?</span>
          </div>
        )}

        {/* primárna akcia */}
        <button onClick={submit} disabled={!canSubmit} style={{
          width: "100%", padding: "15px 0", marginTop: 12, borderRadius: 14, border: "none", fontFamily: "inherit",
          fontSize: 15.5, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: canSubmit ? GRAD : "rgba(var(--glass-rgb),.06)", color: canSubmit ? "#fff" : C.textTer,
          boxShadow: canSubmit ? "0 8px 26px rgba(78,122,62,.3), inset 0 1px 0 rgba(255,255,255,.22)" : "none",
          transition: "background .2s ease, box-shadow .2s ease",
        }}>
          {jeLogin ? "Prihlásiť sa" : "Vytvoriť účet"} <IkonaSipVpravo size={18} color="#fff" />
        </button>

        {/* prepnutie režimu + hosť */}
        <div style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: C.textSec }}>
          {jeLogin ? "Nemáš účet? " : "Už máš účet? "}
          <span onClick={() => setRezim(jeLogin ? "register" : "login")} style={{ fontWeight: 800, color: C.green, cursor: "pointer" }}>
            {jeLogin ? "Zaregistruj sa" : "Prihlás sa"}
          </span>
        </div>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <span onClick={onGuest} style={{ fontSize: 12.5, color: C.textTer, cursor: "pointer", textDecoration: "underline" }}>
            Pokračovať ako hosť — pozrieť demo
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- pomocné polia ----
const vstupStyl: CSSProperties = {
  flex: 1, minWidth: 0, padding: "14px 0", background: "transparent", border: "none", outline: "none",
  color: C.text, fontSize: 15.5, fontFamily: "inherit",
};
const ocBtn: CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", flex: "0 0 auto" };

function Pole({ label, children }: { label?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  );
}

function PoleVstup({ icon, right, chyba, children }: { icon?: ReactNode; right?: ReactNode; chyba?: boolean; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 13px", borderRadius: 14, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${chyba ? "var(--a-danger)" : C.line}`, transition: "border-color .2s ease" }}>
      {icon && <span style={{ flex: "0 0 auto", display: "flex" }}>{icon}</span>}
      {children}
      {right}
    </div>
  );
}

