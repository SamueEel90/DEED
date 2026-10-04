// ============================================================
// DEED · Registrácia — orchestrátor (KARTA 44, návrh 1b)
// Poradie v appke: Úvod (App.tsx, raz) → Vitaj → Kto sa registruje → osoba (OsobaB) alebo organizácia (CharitaB).
//   · „Už mám účet · Prihlásiť sa" → AuthPage (len prihlásenie)
//   · „Len prispievať, bez registrácie" → pasívny vstup (jediný vstup bez účtu v produkcii)
//   · Hosť / demo len v testovacej verzii (AuthPage → Admin prihlásenie)
// Organizácia sa pridáva z osobného účtu: bez prihlásenia najprv prihlásenie alebo registrácia osoby,
// potom App otvorí registráciu organizácie ako vrstvu (start="organizacia").
// `start="aktivny"` = vrstva pasívny → aktívny (rovno Plán osoby).
// ============================================================
import { useState } from "react";
import { toast } from "@/shared";
import { getSession, setSession } from "@/lib/session";
import { TESTOVACIA } from "@/lib/testovacia";
import type { TypUctu } from "@/types";
import { AuthPage } from "./AuthPage";
import { OsobaB, krokZoStavu, ulozenyKrok, type KrokOsoby } from "./OsobaB";
import { CharitaB } from "./CharitaB";
import { Obrazovka, Nadpis, Svetlo, Volby, IK, naServeri } from "./RegB";

type Faza = "vitaj" | "kto" | "login" | "osoba" | "org";

export function Registracia({ onHotovo, start, resume }: { onHotovo?: () => void; start?: "aktivny" | "organizacia"; resume?: { authId: string; typ?: TypUctu; stav?: string } }) {
  // rozrobená registrácia osoby: zo servera (resume) alebo lokálne (mock režim, pád appky)
  const ulozeny = !naServeri ? ulozenyKrok() : null;
  const resumeOsoba = resume && resume.typ !== "charita";
  const [faza, setFaza] = useState<Faza>(() =>
    start === "aktivny" ? "osoba" : start === "organizacia" ? "org" : resumeOsoba || ulozeny?.typ === "osoba" ? "osoba" : "vitaj");
  const [startOsoby] = useState<KrokOsoby>(() =>
    start === "aktivny" ? "plan" : resumeOsoba ? (krokZoStavu(resume!.stav) ?? "telefon") : ((krokZoStavu(ulozeny?.krok) ?? "plan") as KrokOsoby));
  const [auth, setAuth] = useState<{ id: string; email: string } | null>(resumeOsoba ? { id: resume!.authId, email: "" } : null);
  const [kto, setKto] = useState(0);
  const [preOrg, setPreOrg] = useState(false);

  // prihlásený (vrstva v appke) — z neho sa organizácia pridáva
  const s = getSession();
  const prihlaseny = s && !s.demo && s.typ !== "pasivny" ? { meno: s.meno || "Váš účet", ucetId: s.ucet_id } : null;

  const pasivne = () => { setSession({ typ: "pasivny", meno: "Hosť" }); onHotovo?.(); };

  if (faza === "login") {
    return (
      <AuthPage uvodnyRezim="login"
        onAuthed={(id, email) => { setAuth({ id, email }); setFaza("osoba"); }}
        onRegistrovat={() => setFaza("kto")}
        onGuest={TESTOVACIA ? () => { setSession({ demo: true }); onHotovo?.(); } : undefined} />);
  }
  if (faza === "osoba") {
    return <OsobaB start={startOsoby} authId={auth?.id} email={auth?.email} preOrg={preOrg} toast={toast}
      onSpat={() => (start === "aktivny" ? onHotovo?.() : setFaza("kto"))} onHotovo={onHotovo} />;
  }
  if (faza === "org") {
    return <CharitaB prihlaseny={prihlaseny} toast={toast}
      onSpat={() => (start === "organizacia" ? onHotovo?.() : setFaza("kto"))}
      onPrihlasit={() => setFaza("login")}
      onBezUctu={() => { setPreOrg(true); setFaza("osoba"); }}
      onHotovo={onHotovo} />;
  }
  if (faza === "kto") {
    return (
      <Obrazovka kluc="kto" spat={() => setFaza("vitaj")} cta="Pokračovať" onCta={() => setFaza(kto === 0 ? "osoba" : "org")} alt="Len prispievať, bez registrácie" onAlt={pasivne}>
        <Nadpis t="Kto sa registruje?" sub="Každý má vlastný účet. Organizácia sa nemieša s osobným účtom štatutára." />
        <Volby volby={[{ t: "Ja, ako človek", s: "Darujem, robím skutky, pridávam Iskry", ik: IK.osoba }, { t: "Organizácia", s: "Charita, občianske združenie, nadácia", ik: IK.org }]} vybrane={kto} onVyber={setKto} />
      </Obrazovka>);
  }
  return (
    <Obrazovka kluc="vitaj" cta="Vytvoriť účet" onCta={() => setFaza("kto")} alt="Už mám účet · Prihlásiť sa" onAlt={() => setFaza("login")}>
      <Svetlo vyska={330} />
      <Nadpis velky stred t="Vitaj v DEEDGOOD" sub="Miesto pre dobré skutky. Odteraz nás budeš poznať ako DEED+. To plus je dobrý skutok navyše, ten tvoj." />
    </Obrazovka>);
}
