// ============================================================
// DEED · Login / Register — profesionálna vstupná obrazovka (§1)
// Prvá obrazovka appky. Prihlásenie (návrat do appky) / Registrácia
// (pokračuje na „Kto si?" → onboarding). Vizuál zladený s DEED témou
// (warm earthy, light primary) — žiadne natvrdo zadané akcenty.
//   · onSignIn() — existujúci člen → rovno do appky
//   · onSignUp() — nový účet → pokračuje na výber typu subjektu
//   · onGuest()  — „Admin prihlásenie" (demo náhľad bez registrácie)
//   · onPasivny()— „Pokračovať bez prihlásenia" → pasívny vstup (bez účtu)
// Auth je zatiaľ mock (bez reálneho backendu) — overuje len formát polí.
// ============================================================
import { useState, type CSSProperties, type ReactNode } from "react";
import { C, GRAD, gradText, SPACE, RADIUS } from "@/theme";
import { toast, IkonaObalka, IkonaZamok, IkonaOko, IkonaOkoOff, IkonaSipVpravo } from "@/shared";
import { signIn, signUp, resolveSession } from "@/lib/auth";
import type { TypUctu } from "@/types";

type Rezim = "login" | "register";

// onAuthed — po úspešnom logine (ktorý potrebuje onboarding) alebo registrácii:
// pokračuje na „Kto si?" / do rozrobeného flow. Login onboardnutého usera
// nastaví session priamo (resolveSession) a appka sa zobrazí reaktívne.
export function AuthPage({ onAuthed, onGuest, onPasivny }: { onAuthed: (authId: string, email: string, typ?: TypUctu) => void; onGuest?: () => void; onPasivny?: () => void }) {
  const [rezim, setRezim] = useState<Rezim>("login");
  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [heslo2, setHeslo2] = useState("");
  const [ukazHeslo, setUkazHeslo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const hesloOk = heslo.length >= 6;
  const zhoda = heslo === heslo2;
  const jeLogin = rezim === "login";
  const canSubmit = emailOk && hesloOk && (jeLogin || (heslo2.length > 0 && zhoda));

  const prepniRezim = (r: Rezim) => { setRezim(r); setChyba(null); };

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setChyba(null);
    try {
      if (jeLogin) {
        const r = await signIn(email, heslo);
        if (!r.ok) { setChyba(r.chyba ?? "Prihlásenie zlyhalo."); return; }
        const res = await resolveSession();
        if (res.kind === "app") return; // setSession → appka sa zobrazí reaktívne
        if (res.kind === "resume") { onAuthed(res.authId, email.trim(), res.typ); return; }
        setChyba("Účet sa nepodarilo načítať. Skús znova.");
      } else {
        const r = await signUp(email, heslo);
        if (!r.ok || !r.authId) { setChyba(r.chyba ?? "Registrácia zlyhala."); return; }
        onAuthed(r.authId, email.trim());
      }
    } catch {
      setChyba("Niečo sa pokazilo. Skús znova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "transparent" }}>
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 22px 26px", maxWidth: 440, margin: "0 auto", boxSizing: "border-box" }}>

        {/* brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: SPACE.lg }}>
          <span style={{ width: 64, height: 64, borderRadius: RADIUS.lg, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 12px 30px rgba(78,122,62,.4), inset 0 1px 0 rgba(255,255,255,.25)" }}>
            D<span style={{ position: "absolute", top: 9, right: 11, fontSize: 14 }}>+</span>
          </span>
          <div style={{ fontSize: 27, fontWeight: 800, marginTop: SPACE.md, letterSpacing: "-.01em" }}>
            {jeLogin ? "Vitaj späť" : <>Vitaj v <span style={gradText}>DEED</span></>}
          </div>
          <div style={{ fontSize: 13.5, color: C.textSec, marginTop: SPACE.xxs, lineHeight: 1.5, maxWidth: 300 }}>
            {jeLogin ? "Prihlás sa a pokračuj v dobrých skutkoch." : "Vytvor si účet — miesto, kde nerozhodujú slová, ale skutky."}
          </div>
        </div>

        {/* prepínač Prihlásenie / Registrácia */}
        <div style={{ display: "flex", padding: SPACE.xxs, borderRadius: RADIUS.md, background: C.surface2, border: `1px solid ${C.line}`, marginBottom: SPACE.lg }}>
          {([["login", "Prihlásenie"], ["register", "Registrácia"]] as const).map(([r, label]) => {
            const on = rezim === r;
            return (
              <button key={r} onClick={() => prepniRezim(r)} style={{
                flex: 1, padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit",
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
            {heslo2.length > 0 && !zhoda && <div style={{ fontSize: 12, color: C.red, marginTop: SPACE.xxs, fontWeight: 600 }}>Heslá sa nezhodujú.</div>}
          </Pole>
        )}

        {jeLogin && (
          <div style={{ textAlign: "right", marginTop: -SPACE.xxs, marginBottom: SPACE.xxs }}>
            <span onClick={() => toast("Obnova hesla — pripravujeme.")} style={{ fontSize: 12.5, color: C.textTer, cursor: "pointer" }}>Zabudnuté heslo?</span>
          </div>
        )}

        {/* chyba */}
        {chyba && (
          <div role="alert" style={{ fontSize: 12.5, color: C.red, fontWeight: 600, textAlign: "center", marginTop: SPACE.sm, lineHeight: 1.45 }}>{chyba}</div>
        )}

        {/* primárna akcia */}
        <button onClick={submit} disabled={!canSubmit || busy} style={{
          width: "100%", padding: `${SPACE.md}px 0`, marginTop: SPACE.sm, borderRadius: RADIUS.md, border: "none", fontFamily: "inherit",
          fontSize: 15.5, fontWeight: 700, cursor: (!canSubmit || busy) ? "not-allowed" : "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs,
          background: canSubmit && !busy ? GRAD : "rgba(var(--glass-rgb),.06)", color: canSubmit && !busy ? "#fff" : C.textTer,
          boxShadow: canSubmit && !busy ? "0 8px 26px rgba(78,122,62,.3), inset 0 1px 0 rgba(255,255,255,.22)" : "none",
          transition: "background .2s ease, box-shadow .2s ease",
        }}>
          {busy ? "Moment…" : <>{jeLogin ? "Prihlásiť sa" : "Vytvoriť účet"} <IkonaSipVpravo size={18} color="#fff" /></>}
        </button>

        {/* sekundárna akcia — vstup bez prihlásenia (pasívny režim, bez účtu) */}
        <button onClick={onPasivny} style={{
          width: "100%", padding: `${SPACE.md}px 0`, marginTop: SPACE.sm, borderRadius: RADIUS.md, fontFamily: "inherit",
          fontSize: 14.5, fontWeight: 700, cursor: "pointer", transition: "background .2s ease",
          background: "rgba(var(--glass-rgb),.05)", color: C.textSec, border: `1px solid ${C.line}`,
        }}>
          Pokračovať bez prihlásenia
        </button>

        {/* prepnutie režimu + hosť */}
        <div style={{ textAlign: "center", marginTop: SPACE.lg, fontSize: 13, color: C.textSec }}>
          {jeLogin ? "Nemáš účet? " : "Už máš účet? "}
          <span onClick={() => prepniRezim(jeLogin ? "register" : "login")} style={{ fontWeight: 800, color: C.green, cursor: "pointer" }}>
            {jeLogin ? "Zaregistruj sa" : "Prihlás sa"}
          </span>
        </div>
        <div style={{ textAlign: "center", marginTop: SPACE.gutter }}>
          <span onClick={onGuest} style={{ fontSize: 12.5, color: C.textTer, cursor: "pointer", textDecoration: "underline" }}>
            Admin prihlásenie
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- pomocné polia ----
const vstupStyl: CSSProperties = {
  flex: 1, minWidth: 0, padding: `${SPACE.gutter}px 0`, background: "transparent", border: "none", outline: "none",
  color: C.text, fontSize: 15.5, fontFamily: "inherit",
};
const ocBtn: CSSProperties = { background: "transparent", border: "none", cursor: "pointer", padding: SPACE.xxs, display: "flex", alignItems: "center", flex: "0 0 auto" };

function Pole({ label, children }: { label?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: SPACE.gutter }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: SPACE.xs }}>{label}</div>
      {children}
    </div>
  );
}

function PoleVstup({ icon, right, chyba, children }: { icon?: ReactNode; right?: ReactNode; chyba?: boolean; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `0 ${SPACE.sm}px`, borderRadius: RADIUS.md, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${chyba ? "var(--a-danger)" : C.line}`, transition: "border-color .2s ease" }}>
      {icon && <span style={{ flex: "0 0 auto", display: "flex" }}>{icon}</span>}
      {children}
      {right}
    </div>
  );
}

