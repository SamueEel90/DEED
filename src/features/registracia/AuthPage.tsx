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
import { DeedZnacka } from "@/components/DeedZnacka";
import { useState, type CSSProperties, type ReactNode } from "react";
import { C, GRAD, SPACE, RADIUS } from "@/theme";
import { toast, Znacka, IkonaObalka, IkonaZamok, IkonaOko, IkonaOkoOff, IkonaSipVpravo } from "@/shared";
import { signIn, signUp, resolveSession, resetHeslo, zmenHeslo } from "@/lib/auth";
import type { TypUctu } from "@/types";
import { PotvrdNoveZariadenie, LimitZariadeni } from "@/features/profil/Bezpecnost24";
import { zariadenia, odKedy, MAX_ZARIADENI } from "@/lib/zariadenia";

// 5 zlých pokusov o prihlásenie → 15 minút čakanie (lokálne; server to stráži tiež)
const KLUC_POKUSY = "deed.prihlasenie.pokusy";
const pokusy = (): { n: number; do: number } => { try { return JSON.parse(localStorage.getItem(KLUC_POKUSY) || '{"n":0,"do":0}'); } catch { return { n: 0, do: 0 }; } };
const zamknuteMin = () => { const p = pokusy(); return p.do > Date.now() ? Math.ceil((p.do - Date.now()) / 60000) : 0; };
const zlyPokus = () => { const p = pokusy(), n = p.n + 1; try { localStorage.setItem(KLUC_POKUSY, JSON.stringify(n >= 5 ? { n: 0, do: Date.now() + 15 * 60000 } : { n, do: 0 })); } catch { /* LS */ } };
const vynulujPokusy = () => { try { localStorage.removeItem(KLUC_POKUSY); } catch { /* LS */ } };
const jeNoveZariadenie = () => { try { return !localStorage.getItem("deed.zariadenie.od"); } catch { return false; } };

type Rezim = "login" | "register";

// onAuthed — po úspešnom logine (ktorý potrebuje onboarding) alebo registrácii:
// pokračuje na „Kto si?" / do rozrobeného flow. Login onboardnutého usera
// nastaví session priamo (resolveSession) a appka sa zobrazí reaktívne.
export function AuthPage({ onAuthed, onGuest, onPasivny, uvodnyRezim = "login" }: { onAuthed: (authId: string, email: string, typ?: TypUctu) => void; onGuest?: () => void; onPasivny?: () => void; uvodnyRezim?: Rezim }) {
  const [rezim, setRezim] = useState<Rezim>(uvodnyRezim);
  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [heslo2, setHeslo2] = useState("");
  const [ukazHeslo, setUkazHeslo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  // karta 24 · 3: nové zariadenie potvrdiť, najviac 5 zariadení (zoznam a overenie bude držať server)
  const [brana, setBrana] = useState<null | { krok: "nove" | "limit"; dokonci: () => Promise<void> }>(null);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const hesloOk = heslo.length >= 6;
  const zhoda = heslo === heslo2;
  const jeLogin = rezim === "login";
  const canSubmit = emailOk && hesloOk && (jeLogin || (heslo2.length > 0 && zhoda));

  const prepniRezim = (r: Rezim) => { setRezim(r); setChyba(null); };

  // „Zabudnuté heslo" — pošle obnovovací email na adresu z poľa vyššie
  const [resetBusy, setResetBusy] = useState(false);
  const posliReset = async () => {
    if (!emailOk) { setChyba("Napíš svoj email do poľa vyššie a potom klikni na obnovu hesla znova."); return; }
    setResetBusy(true);
    setChyba(null);
    try {
      const r = await resetHeslo(email);
      if (r.ok) toast("Poslali sme ti email s odkazom na obnovu hesla.");
      else setChyba(r.chyba ?? "Email sa nepodarilo odoslať.");
    } finally {
      setResetBusy(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setChyba(null);
    try {
      if (jeLogin) {
        const cakaj = zamknuteMin();
        if (cakaj) { setChyba(`Priveľa pokusov. Skús to o ${cakaj} minút.`); return; }
        const r = await signIn(email, heslo);
        if (!r.ok) { zlyPokus(); setChyba(zamknuteMin() ? "Priveľa pokusov. Skús to o 15 minút." : r.chyba ?? "Prihlásenie zlyhalo."); return; }
        vynulujPokusy();
        const dokonci = async () => {
          const res = await resolveSession();
          if (res.kind === "app") return; // setSession → appka sa zobrazí reaktívne
          if (res.kind === "resume") { onAuthed(res.authId, email.trim(), res.typ); return; }
          setChyba("Účet sa nepodarilo načítať. Skús znova.");
        };
        if (jeNoveZariadenie()) { setBrana({ krok: "nove", dokonci }); return; }
        if (zariadenia().length > MAX_ZARIADENI) { setBrana({ krok: "limit", dokonci }); return; }
        await dokonci();
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

  if (brana?.krok === "nove") return <PotvrdNoveZariadenie onZrusit={() => setBrana(null)} onPotvrdene={() => { odKedy(); if (zariadenia().length > MAX_ZARIADENI) setBrana({ ...brana, krok: "limit" }); else { setBrana(null); void brana.dokonci(); } }} />;
  if (brana?.krok === "limit") return <LimitZariadeni onPokracovat={() => { if (zariadenia().length > MAX_ZARIADENI) return; setBrana(null); void brana.dokonci(); }} />;

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "transparent" }}>
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 22px 26px", maxWidth: 440, margin: "0 auto", boxSizing: "border-box" }}>

        {/* brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: SPACE.lg }}>
          {/* QR logo na login/register (mobil aj desktop) — klik zväčší na celú obrazovku */}
          <Znacka force="qr" size={116} />
          <div style={{ fontSize: 27, fontWeight: 800, marginTop: SPACE.md, letterSpacing: "-.01em" }}>
            {jeLogin ? "Vitaj späť" : <>Vitaj v <span style={{ color: "var(--a-green)" }}><DeedZnacka /></span></>}
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

        {/* formulár — Enter v ľubovoľnom poli odošle (submit) */}
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        {/* email */}
        <Pole label="Email" htmlFor="auth-email">
          <PoleVstup icon={<IkonaObalka size={18} color={C.textTer} />}>
            <input id="auth-email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email"
              placeholder="tvoj@email.sk" style={vstupStyl} />
          </PoleVstup>
        </Pole>

        {/* heslo */}
        <Pole label="Heslo" htmlFor="auth-heslo">
          <PoleVstup icon={<IkonaZamok size={18} color={C.textTer} />} right={
            <button type="button" onClick={() => setUkazHeslo((v) => !v)} aria-label={ukazHeslo ? "Skryť heslo" : "Zobraziť heslo"} style={ocBtn}>
              {ukazHeslo ? <IkonaOkoOff size={18} color={C.textTer} /> : <IkonaOko size={18} color={C.textTer} />}
            </button>
          }>
            <input id="auth-heslo" name="password" value={heslo} onChange={(e) => setHeslo(e.target.value)} type={ukazHeslo ? "text" : "password"}
              autoComplete={jeLogin ? "current-password" : "new-password"}
              placeholder={jeLogin ? "Tvoje heslo" : "Aspoň 6 znakov"} style={vstupStyl} />
          </PoleVstup>
        </Pole>

        {/* heslo znova (registrácia) */}
        {!jeLogin && (
          <Pole label="Heslo znova" htmlFor="auth-heslo2">
            <PoleVstup icon={<IkonaZamok size={18} color={C.textTer} />} chyba={heslo2.length > 0 && !zhoda}>
              <input id="auth-heslo2" name="password2" value={heslo2} onChange={(e) => setHeslo2(e.target.value)} type={ukazHeslo ? "text" : "password"}
                autoComplete="new-password" placeholder="Zopakuj heslo" style={vstupStyl} />
            </PoleVstup>
            {heslo2.length > 0 && !zhoda && <div style={{ fontSize: 12, color: C.red, marginTop: SPACE.xxs, fontWeight: 600 }}>Heslá sa nezhodujú.</div>}
          </Pole>
        )}

        {jeLogin && (
          <div style={{ textAlign: "right", marginTop: -SPACE.xxs, marginBottom: SPACE.xxs }}>
            <button type="button" disabled={resetBusy} onClick={posliReset} style={linkBtn}>
              {resetBusy ? "Posielam…" : "Zabudnuté heslo?"}
            </button>
          </div>
        )}

        {/* chyba */}
        {chyba && (
          <div role="alert" style={{ fontSize: 12.5, color: C.red, fontWeight: 600, textAlign: "center", marginTop: SPACE.sm, lineHeight: 1.45 }}>{chyba}</div>
        )}

        {/* primárna akcia */}
        <button type="submit" disabled={!canSubmit || busy} style={{
          width: "100%", padding: `${SPACE.md}px 0`, marginTop: SPACE.sm, borderRadius: RADIUS.md, border: "none", fontFamily: "inherit",
          fontSize: 15.5, fontWeight: 700, cursor: (!canSubmit || busy) ? "not-allowed" : "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs,
          background: canSubmit && !busy ? GRAD : "rgba(var(--glass-rgb),.06)", color: canSubmit && !busy ? "#fff" : C.textTer,
          boxShadow: canSubmit && !busy ? "0 8px 26px rgba(78,122,62,.3), inset 0 1px 0 rgba(255,255,255,.22)" : "none",
          transition: "background .2s ease, box-shadow .2s ease",
        }}>
          {busy ? "Moment…" : <>{jeLogin ? "Prihlásiť sa" : "Vytvoriť účet"} <IkonaSipVpravo size={18} color="#fff" /></>}
        </button>
        </form>

        {/* sekundárna akcia — vstup bez prihlásenia (pasívny režim, bez účtu).
            V upgrade kontexte (pasívny → aktívny) sa nezobrazuje — handler nie je odovzdaný. */}
        {onPasivny && (
          <button onClick={onPasivny} style={{
            width: "100%", padding: `${SPACE.md}px 0`, marginTop: SPACE.sm, borderRadius: RADIUS.md, fontFamily: "inherit",
            fontSize: 14.5, fontWeight: 700, cursor: "pointer", transition: "background .2s ease",
            background: "rgba(var(--glass-rgb),.05)", color: C.textSec, border: `1px solid ${C.line}`,
          }}>
            Pokračovať bez prihlásenia
          </button>
        )}

        {/* prepnutie režimu + hosť */}
        <div style={{ textAlign: "center", marginTop: SPACE.lg, fontSize: 13, color: C.textSec }}>
          {jeLogin ? "Nemáš účet? " : "Už máš účet? "}
          <button type="button" onClick={() => prepniRezim(jeLogin ? "register" : "login")} style={{ ...linkBtn, fontSize: 13, fontWeight: 800, color: C.green }}>
            {jeLogin ? "Zaregistruj sa" : "Prihlás sa"}
          </button>
        </div>
        {onGuest && (
          <div style={{ textAlign: "center", marginTop: SPACE.gutter }}>
            <button type="button" onClick={onGuest} style={{ ...linkBtn, textDecoration: "underline" }}>
              Admin prihlásenie
            </button>
          </div>
        )}
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
// textové „link" tlačidlo — skutočný <button> (klávesnica/SR), vizuál textového odkazu
const linkBtn: CSSProperties = { background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, color: C.textTer };

function Pole({ label, htmlFor, children }: { label?: ReactNode; htmlFor?: string; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: SPACE.gutter }}>
      <label htmlFor={htmlFor} style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: SPACE.xs }}>{label}</label>
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

// ============================================================
// NOVÉ HESLO — obrazovka po kliknutí na obnovovací odkaz z emailu
// (Supabase PASSWORD_RECOVERY). Nastaví heslo a vráti do appky.
// ============================================================
export function NoveHeslo({ onDone }: { onDone: () => void }) {
  const [heslo, setHeslo] = useState("");
  const [heslo2, setHeslo2] = useState("");
  const [busy, setBusy] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const zhoda = heslo === heslo2;
  const canSubmit = heslo.length >= 6 && heslo2.length > 0 && zhoda;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setChyba(null);
    try {
      const r = await zmenHeslo(heslo);
      if (!r.ok) { setChyba(r.chyba ?? "Heslo sa nepodarilo zmeniť."); return; }
      await resolveSession(); // recovery session → app session (ak je účet dokončený)
      toast("Heslo zmenené — vitaj späť.");
      onDone();
    } catch {
      setChyba("Niečo sa pokazilo. Skús znova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "transparent" }}>
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "36px 22px 26px", maxWidth: 440, margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: SPACE.lg }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Nastav si nové heslo</div>
          <div style={{ fontSize: 13.5, color: C.textSec, marginTop: SPACE.xxs }}>Prišiel si z obnovovacieho odkazu — zvoľ si nové heslo (min. 6 znakov).</div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
          <Pole label="Nové heslo" htmlFor="nh-heslo">
            <PoleVstup icon={<IkonaZamok size={18} color={C.textTer} />}>
              <input id="nh-heslo" value={heslo} onChange={(e) => setHeslo(e.target.value)} type="password" autoComplete="new-password" placeholder="Aspoň 6 znakov" style={vstupStyl} />
            </PoleVstup>
          </Pole>
          <Pole label="Heslo znova" htmlFor="nh-heslo2">
            <PoleVstup icon={<IkonaZamok size={18} color={C.textTer} />} chyba={heslo2.length > 0 && !zhoda}>
              <input id="nh-heslo2" value={heslo2} onChange={(e) => setHeslo2(e.target.value)} type="password" autoComplete="new-password" placeholder="Zopakuj heslo" style={vstupStyl} />
            </PoleVstup>
            {heslo2.length > 0 && !zhoda && <div style={{ fontSize: 12, color: C.red, marginTop: SPACE.xxs, fontWeight: 600 }}>Heslá sa nezhodujú.</div>}
          </Pole>
          {chyba && <div role="alert" style={{ fontSize: 12.5, color: C.red, fontWeight: 600, textAlign: "center", marginTop: SPACE.sm, lineHeight: 1.45 }}>{chyba}</div>}
          <button type="submit" disabled={!canSubmit || busy} style={{
            width: "100%", padding: `${SPACE.md}px 0`, marginTop: SPACE.sm, borderRadius: RADIUS.md, border: "none", fontFamily: "inherit",
            fontSize: 15.5, fontWeight: 700, cursor: (!canSubmit || busy) ? "not-allowed" : "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs,
            background: canSubmit && !busy ? GRAD : "rgba(var(--glass-rgb),.06)", color: canSubmit && !busy ? "#fff" : C.textTer,
          }}>
            {busy ? "Moment…" : "Uložiť nové heslo"}
          </button>
        </form>
      </div>
    </div>
  );
}

