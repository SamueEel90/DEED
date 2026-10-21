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
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { C, GRAD, SPACE, RADIUS } from "@/theme";
import { toast, Znacka, IkonaObalka, IkonaZamok, IkonaOko, IkonaOkoOff, IkonaSipVpravo } from "@/shared";
import { signIn, signUp, resolveSession, resetHeslo, zmenHeslo, jeNeoverenyEmail, posliEmailKod } from "@/lib/auth";
import { useOverenieEmailu, OverteEmailTelo } from "./OverteEmail";
import type { TypUctu } from "@/types";
import { PotvrdNoveZariadenie, LimitZariadeni } from "@/features/profil/Bezpecnost24";
import { zariadenia, odKedy, MAX_ZARIADENI, OVERENIE_ZARIADENIA, nazovZariadenia, ulozMestoZariadenia } from "@/lib/zariadenia";
import { DeedQr } from "@/components/deedqr";
import { zalozQr, stavQr, prihlasOdkazom, odkazPrihlasenia, type QrPc } from "@/lib/qrPrihlasenie";

// 5 zlých pokusov o prihlásenie → 15 minút čakanie. Zadanie 3 · 3.5: počíta to LEN server
// (Auth hook, migrácia 0042) — appka zobrazí jeho hlášku, sama nič nepočíta.
const jeNoveZariadenie = () => { try { return !localStorage.getItem("deed.zariadenie.od"); } catch { return false; } };

type Rezim = "login" | "register";

// onAuthed — po úspešnom logine (ktorý potrebuje onboarding) alebo registrácii:
// pokračuje na „Kto si?" / do rozrobeného flow. Login onboardnutého usera
// nastaví session priamo (resolveSession) a appka sa zobrazí reaktívne.
// KARTA 44: onRegistrovat = registrácia beží v toku 1b (Registracia.tsx) — prepínač Prihlásenie / Registrácia sa skryje
export function AuthPage({ onAuthed, onGuest, onPasivny, onRegistrovat, uvodnyRezim = "login" }: { onAuthed: (authId: string, email: string, typ?: TypUctu) => void; onGuest?: () => void; onPasivny?: () => void; onRegistrovat?: () => void; uvodnyRezim?: Rezim }) {
  const [rezim, setRezim] = useState<Rezim>(uvodnyRezim);
  const [email, setEmail] = useState("");
  const [heslo, setHeslo] = useState("");
  const [heslo2, setHeslo2] = useState("");
  const [ukazHeslo, setUkazHeslo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  // karta 24 · 3: nové zariadenie potvrdiť, najviac 5 zariadení (zoznam a overenie bude držať server)
  const [brana, setBrana] = useState<null | { krok: "nove" | "limit"; dokonci: () => Promise<void> }>(null);
  // OPRAVY 378: neoverený e-mail (registrácia aj prihlásenie) → obrazovka Overte e-mail (6 číslic)
  const [overit, setOverit] = useState<null | { login: boolean }>(null);
  // OPRAVY 466: prihlásenie počítača QR kódom z mobilu
  const [mobilom, setMobilom] = useState(false);

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

  const poPrihlaseni = async () => {
    const dokonci = async () => {
      const res = await resolveSession();
      if (res.kind === "app") return; // setSession → appka sa zobrazí reaktívne
      if (res.kind === "resume") { onAuthed(res.authId, email.trim(), res.typ); return; }
      setChyba("Účet sa nepodarilo načítať. Skús znova.");
    };
    if (jeNoveZariadenie()) { if (OVERENIE_ZARIADENIA) { setBrana({ krok: "nove", dokonci }); return; } odKedy(); }
    if (zariadenia().length > MAX_ZARIADENI) { setBrana({ krok: "limit", dokonci }); return; }
    await dokonci();
  };
  const ovE = useOverenieEmailu(email, async (id) => {
    if (overit?.login) { setOverit(null); await poPrihlaseni(); return; }
    setOverit(null); onAuthed(id, email.trim());
  });
  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setChyba(null);
    try {
      if (jeLogin) {
        const r = await signIn(email, heslo);
        if (!r.ok && jeNeoverenyEmail(r.chyba)) { void posliEmailKod(email); setOverit({ login: true }); return; }
        if (!r.ok) { setChyba(r.chyba ?? "Prihlásenie zlyhalo."); return; }
        await poPrihlaseni();
      } else {
        const r = await signUp(email, heslo);
        if (!r.ok || !r.authId) { setChyba(r.chyba ?? "Účet sa nepodarilo založiť · Skúsiť znova."); return; }
        if (r.overitEmail) { setOverit({ login: false }); return; }
        onAuthed(r.authId, email.trim());
      }
    } catch {
      setChyba("Niečo sa pokazilo. Skús znova.");
    } finally {
      setBusy(false);
    }
  };

  if (overit) return (
    <div style={{ height: "100%", overflowY: "auto", background: "transparent" }}>
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: "36px 22px 26px", maxWidth: 440, margin: "0 auto", boxSizing: "border-box" }}>
        <b style={{ fontSize: 26, letterSpacing: "-.01em" }}>Overte e-mail</b>
        <OverteEmailTelo email={email.trim()} o={ovE} onZmenit={() => { setOverit(null); setChyba(null); }} />
        <button type="button" disabled={ovE.kod.length !== 6 || ovE.busy} onClick={() => void ovE.over()} style={{ width: "100%", minHeight: 54, borderRadius: RADIUS.md, border: "none", fontFamily: "inherit", fontSize: 15.5, fontWeight: 700,
          cursor: ovE.kod.length === 6 && !ovE.busy ? "pointer" : "not-allowed", background: ovE.kod.length === 6 && !ovE.busy ? GRAD : "rgba(var(--glass-rgb),.06)", color: ovE.kod.length === 6 && !ovE.busy ? "#fff" : C.textTer }}>{ovE.busy ? "Overujem…" : "Overiť"}</button>
      </div>
    </div>);
  if (mobilom) return <PrihlasenieMobilom onSpat={() => setMobilom(false)} onPrihlasene={() => void poPrihlaseni()} />;
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
        {!onRegistrovat && <div style={{ display: "flex", padding: SPACE.xxs, borderRadius: RADIUS.md, background: C.surface2, border: `1px solid ${C.line}`, marginBottom: SPACE.lg }}>
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
        </div>}

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

        {/* OPRAVY 466: na počítači prihlásenie QR kódom z mobilu */}
        {jeLogin && nazovZariadenia().typ === "pocitac" && <button type="button" onClick={() => { setChyba(null); setMobilom(true); }} style={{
          width: "100%", padding: `${SPACE.md}px 0`, marginTop: SPACE.sm, borderRadius: RADIUS.md, fontFamily: "inherit",
          fontSize: 14.5, fontWeight: 700, cursor: "pointer", background: "transparent", color: C.text, border: `1.5px solid ${C.line}`,
        }}>Prihlásiť sa mobilom ›</button>}

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
          <button type="button" onClick={() => (onRegistrovat && jeLogin ? onRegistrovat() : prepniRezim(jeLogin ? "register" : "login"))} style={{ ...linkBtn, fontSize: 13, fontWeight: 800, color: C.green }}>
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


// ============================================================
// OPRAVY 466 · Prihlásiť sa mobilom: veľký QR (jednorazový, 2 min, potom sa sám vymení), PC sa každú 1,5 s pýta,
// či mobil potvrdil; potom sa sám prihlási („Prihlásené ✓“) a pokračuje tam, kam išiel.
// ============================================================
function PrihlasenieMobilom({ onSpat, onPrihlasene }: { onSpat: () => void; onPrihlasene: () => void }) {
  const [q, setQ] = useState<QrPc | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [pozn, setPozn] = useState<string | null>(null);
  const [hotovo, setHotovo] = useState(false);
  const [teraz, setTeraz] = useState(() => Date.now());
  const ziva = useRef(true);
  const novy = async (veta?: string) => {
    setChyba(null); setPozn(veta ?? null);
    try { const x = await zalozQr(nazovZariadenia().nazov); if (ziva.current) setQ(x); }
    catch (e) { if (ziva.current) { setQ(null); setChyba((e as Error).message); } }
  };
  useEffect(() => { ziva.current = true; void novy(); return () => { ziva.current = false; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = window.setInterval(() => setTeraz(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  // QR po 2 minútach sám vymení
  useEffect(() => { if (q && !hotovo && teraz >= q.platiDo) void novy(); }, [teraz, q, hotovo]); // eslint-disable-line react-hooks/exhaustive-deps
  // počúva stav (každú 1,5 s)
  useEffect(() => {
    if (!q || hotovo) return;
    let bezi = false;
    const t = window.setInterval(async () => {
      if (bezi) return; bezi = true;
      try {
        const s = await stavQr(q);
        if (!ziva.current) return;
        if (s.stav === "potvrdene") {
          window.clearInterval(t);
          const e = await prihlasOdkazom(s.tokenHash);
          if (e) { setChyba(e); void novy(); return; }
          ulozMestoZariadenia(s.mesto);
          setHotovo(true);
          window.setTimeout(onPrihlasene, 900);
        } else if (s.stav === "zrusene") { window.clearInterval(t); void novy("V mobile ste prihlásenie zrušili. Toto je nový QR."); }
        else if (s.stav === "vyprsal" || s.stav === "pouzite" || s.stav === "nenajdene") { window.clearInterval(t); void novy(); }
        else if (s.stav === "bez_emailu") { window.clearInterval(t); setChyba("Tento účet nemá e-mail. Prihláste sa na počítači e-mailom a heslom."); }
      } catch { /* sieť — skúsi znova o 1,5 s */ } finally { bezi = false; }
    }, 1500);
    return () => window.clearInterval(t);
  }, [q, hotovo]); // eslint-disable-line react-hooks/exhaustive-deps
  const zostava = q ? Math.max(0, Math.ceil((q.platiDo - teraz) / 1000)) : 0;
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "transparent" }}>
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 18, padding: "36px 22px 26px", maxWidth: 520, margin: "0 auto", boxSizing: "border-box", textAlign: "center" }}>
        <button type="button" onClick={onSpat} style={{ ...linkBtn, alignSelf: "flex-start", fontSize: 14.5, fontWeight: 800, color: C.green, minHeight: 44 }}>‹ Späť na prihlásenie e-mailom</button>
        <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.01em" }}>Prihlásiť sa mobilom</div>
        {hotovo ? <div role="status" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "18px 22px", borderRadius: 18, background: "var(--gSoft, rgba(75,122,53,.12))", border: "1px solid var(--gBd, #A9C08F)" }}>
            <b style={{ fontSize: 22, color: "var(--gInk, #3F6E2A)" }}>Prihlásené ✓</b>
          </div>
          : <>
            <div style={{ padding: 14, borderRadius: 22, background: "#FFFFFF", border: `1px solid ${C.line}`, lineHeight: 0, minWidth: 300, minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {q ? <DeedQr data={odkazPrihlasenia(q.token)} odznak="D+" variant="svetly" size={300} /> : <span style={{ fontSize: 14, color: "#555", lineHeight: 1.4 }}>{chyba ? "" : "Pripravujem QR…"}</span>}
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.55, color: C.text, maxWidth: 400 }}>Otvorte <DeedZnacka /> v mobile → <b>Môj QR</b> → <b>Naskenovať</b> a namierte na tento kód.</div>
            {q && <div style={{ fontSize: 13.5, color: C.textTer }}>Platí ešte {Math.floor(zostava / 60)}:{String(zostava % 60).padStart(2, "0")}, potom sa sám vymení. Platí len raz a len na tomto počítači.</div>}
            {pozn && <div role="status" style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{pozn}</div>}
            {chyba && <div role="alert" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", borderRadius: 16, border: "1.5px solid #8E2F1E", fontSize: 14.5, color: C.text, maxWidth: 400 }}>
              {chyba}
              <button type="button" onClick={() => void novy()} style={{ minHeight: 44, borderRadius: 12, border: "none", background: "var(--a-green, #4B7A35)", color: "#fff", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Skúsiť znova</button>
            </div>}
          </>}
      </div>
    </div>);
}
