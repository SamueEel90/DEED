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
  // sociálne prihlásenie (mock) — jeden klik, nevyžaduje vyplnený formulár
  const socialAuth = () => (jeLogin ? onSignIn?.() : onSignUp?.());

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

        {/* oddeľovač */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <span style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textTer, letterSpacing: ".06em" }}>ALEBO</span>
          <span style={{ flex: 1, height: 1, background: C.line }} />
        </div>

        {/* sociálne prihlásenie (mock — správa sa ako zvolený režim) */}
        <div style={{ display: "flex", gap: 10 }}>
          <SocialBtn label="Pokračovať cez Google" onClick={socialAuth}><GoogleG /></SocialBtn>
          <SocialBtn label="Pokračovať cez Apple" onClick={socialAuth}><AppleLogo /></SocialBtn>
          <SocialBtn label="Pokračovať cez Facebook" onClick={socialAuth}><FacebookF /></SocialBtn>
        </div>

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

function SocialBtn({ label, onClick, children }: { label: string; onClick?: () => void; children?: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} style={{
      flex: 1, height: 52, borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: C.surface2, border: `1px solid ${C.line}`, transition: "background .15s ease",
    }}>{children}</button>
  );
}

// ---- značkové glyfy (fixné brand farby, neutrálny povrch — čitateľné v oboch režimoch) ----
function GoogleG() {
  return (
    <svg width="21" height="21" viewBox="0 0 48 48" style={{ display: "block" }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C41.4 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
function AppleLogo() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill={C.text} style={{ display: "block" }}>
      <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1 2.8-2.1c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.7zM14.2 5.8c.6-.8 1.1-1.9.9-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.3-.6 3-1.4z" />
    </svg>
  );
}
function FacebookF() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" style={{ display: "block" }}>
      <path fill="#1877F2" d="M24 12c0-6.6-5.4-12-12-12S0 5.4 0 12c0 6 4.4 11 10.1 11.9v-8.4H7.1V12h3v-2.6c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4C19.6 23 24 18 24 12z" />
    </svg>
  );
}
