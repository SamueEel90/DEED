// ============================================================
// DEED · Auth (Fáza 5) — Supabase Auth (email/heslo) ako identitná vrstva.
// localStorage "deed.session" (session.ts) ostáva cache vyriešenej app-session;
// tu je most: registrácia / prihlásenie / odhlásenie + reconciliation pri štarte.
// Všetko guardované supabaseReady — bez Supabase appka beží v demo režime.
//   · auth-first onboarding: signUp vytvorí auth usera, ucet sa naviaže (auth_id)
//   · pri prihlásení/boote resolveSession() rozhodne: app | resume onboarding | nič
// ============================================================
import type { TypUctu } from "@/types";
import { supabase, supabaseReady } from "./supabase";
import { getSession, setSession, clearSession } from "./session";
import { najdiUcetPodlaAuth, nacitajUcetData } from "./db";

export interface AuthVysledok {
  ok: boolean;
  authId?: string;
  chyba?: string;
  /** OPRAVY 378: účet vznikol, ale e-mail treba overiť 6 číslicami (Supabase „Confirm email“) — session ešte nie je */
  overitEmail?: boolean;
}

// preklad Supabase auth chýb na slovenské hlášky pre používateľa.
// POZOR: špecifické prípady MUSIA byť pred generickým "email" catchom
// (napr. "email rate limit exceeded" obsahuje "email" — netreba ho hlásiť ako neplatný).
function prelozChybu(message?: string, inak = "Nepodarilo sa · skúste znova."): string {
  const m = (message || "").toLowerCase();
  if (m.startsWith("priveľa pokusov")) return message as string;   // zámok prihlásenia zo servera (0042)
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "Nesprávny email alebo heslo.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) return "Tento email už je zaregistrovaný — prihlás sa.";
  if (m.includes("rate limit") || m.includes("over_email_send") || m.includes("too many")) return "Priveľa pokusov · skúste o chvíľu.";
  if (m.includes("not confirmed")) return "E-mail ešte nie je potvrdený.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled") || m.includes("signups are disabled") || m.includes("logins are disabled")) return "Registrácia emailom je vypnutá v Supabase.";
  if (m.includes("password")) return "Heslo musí mať aspoň 8 znakov.";
  if (m.includes("is invalid") || (m.includes("email") && m.includes("invalid"))) return "Neplatný email.";
  if (m.includes("email")) return "Problém s emailom. Skús znova o chvíľu.";
  return inak;
}

export async function signUp(email: string, heslo: string): Promise<AuthVysledok> {
  if (!supabase) return { ok: false, chyba: "Supabase nie je nakonfigurovaný." };
  // odkaz v potvrdzovacom e-maile vedie späť tam, kde sa človek registroval (doména aj locale), nie na Site URL z Supabase
  const navrat = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: heslo, options: navrat ? { emailRedirectTo: navrat } : undefined });
  if (error) return { ok: false, chyba: prelozChybu(error.message, "Účet sa nepodarilo založiť · Skúsiť znova.") };
  const authId = data.user?.id;
  if (!authId) return { ok: false, chyba: "Účet sa nepodarilo založiť · Skúsiť znova." };
  // OPRAVY 377/378: bez session (zapnuté potvrdenie e-mailu) sa do ucet nesmie vkladať — najprv overiť e-mail kódom
  if (!data.session) {
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, chyba: "Tento e-mail už je zaregistrovaný · prihláste sa." };
    return { ok: true, authId, overitEmail: true };
  }
  return { ok: true, authId };
}

/** OPRAVY 378: 6 číslic z e-mailu (šablóna Confirm signup s {{ .Token }}) → session */
export async function overEmailKod(email: string, kod: string): Promise<AuthVysledok> {
  if (!supabase) return { ok: false, chyba: "Nie je spojenie so serverom." };
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: kod.replace(/\D/g, ""), type: "signup" });
  if (error || !data.session) {
    const m = (error?.message ?? "").toLowerCase();
    if (/expired|invalid|otp/.test(m) || !data?.session) return { ok: false, chyba: "kod" };
    if (/failed to fetch|network/.test(m)) return { ok: false, chyba: "Nie je spojenie so serverom. Skúste znova." };
    return { ok: false, chyba: "Overenie sa nepodarilo · skúste znova." };
  }
  return { ok: true, authId: data.user?.id };
}

/** OPRAVY 378: pošle nový overovací kód na e-mail */
export async function posliEmailKod(email: string): Promise<AuthVysledok> {
  if (!supabase) return { ok: false, chyba: "Nie je spojenie so serverom." };
  const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
  if (error) return { ok: false, chyba: /rate|too many|seconds/i.test(error.message) ? "Kód sme poslali pred chvíľou · skúste o minútu." : "Kód sa nepodarilo poslať · skúste znova." };
  return { ok: true };
}

/** OPRAVY 378: prihlásenie s neovereným e-mailom → rovno obrazovka Overte e-mail */
export const jeNeoverenyEmail = (chyba?: string) => !!chyba && /nie je potvrdený/.test(chyba);

export async function signIn(email: string, heslo: string): Promise<AuthVysledok> {
  if (!supabase) return { ok: false, chyba: "Supabase nie je nakonfigurovaný." };
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: heslo });
  if (error) return { ok: false, chyba: prelozChybu(error.message) };
  return { ok: true, authId: data.user?.id };
}

export async function signOut(): Promise<void> {
  try { await supabase?.auth.signOut(); } catch { /* ignoruj sieťovú chybu — lokálne aj tak odhlás */ }
  clearSession();
}

// „Zabudnuté heslo" — pošle email s odkazom na obnovu. Odkaz vedie späť do appky
// (detectSessionInUrl spracuje recovery hash → PASSWORD_RECOVERY → subscribeRecovery).
export async function resetHeslo(email: string): Promise<AuthVysledok> {
  if (!supabase) return { ok: false, chyba: "Obnova hesla nie je v demo režime dostupná." };
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: typeof window !== "undefined" ? window.location.origin + "/" : undefined,
  });
  if (error) return { ok: false, chyba: prelozChybu(error.message) };
  return { ok: true };
}

/** Nastaví nové heslo prihlásenému (recovery) userovi. */
export async function zmenHeslo(nove: string): Promise<AuthVysledok> {
  if (!supabase) return { ok: false, chyba: "Zmena hesla nie je v demo režime dostupná." };
  const { error } = await supabase.auth.updateUser({ password: nove });
  if (error) return { ok: false, chyba: prelozChybu(error.message) };
  return { ok: true };
}

/** PASSWORD_RECOVERY (klik na odkaz z emailu) → callback. Vracia unsubscribe. */
export function subscribeRecovery(onRecovery: () => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") onRecovery();
  });
  return () => data.subscription.unsubscribe();
}

/** Zaistí aspoň ANONYMNÉ auth session — aby osobné DB funkcie (obľúbené, RSVP,
 *  správy, nahlásenia, peňaženka) mali `auth.uid()` aj pre hosťa bez registrácie.
 *  Ak už session existuje (reálna alebo anonymná) → no-op. Bez Supabase alebo pri
 *  chybe (napr. anonymné prihlásenie nie je v projekte povolené) ticho pokračuje —
 *  DB vrstva (lib/osobne) potom padne na localStorage. Vracia auth id (alebo null). */
export async function zaistiSession(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error) return null;
    return anon.user?.id ?? null;
  } catch {
    return null;
  }
}

// Výsledok reconciliation — App podľa neho zobrazí appku / resume onboarding / login.
export type ResolveVysledok =
  | { kind: "app" }
  | { kind: "resume"; authId: string; typ?: TypUctu; stav?: string }
  | { kind: "none" };

async function odvodMeno(ucetId: string, typ: string): Promise<string | undefined> {
  try {
    const d = await nacitajUcetData(ucetId);
    if (typ === "charita") return d.organizacia?.nazov || undefined;
    return d.profil?.meno || undefined;
  } catch {
    return undefined;
  }
}

// Reconciliation pri štarte aj po prihlásení:
//  · authed + ucet 'hotovo'   → setSession(...) → {kind:'app'}
//  · authed + ucet rozrobený  → {kind:'resume', authId, typ, stav}
//  · authed bez ucetu         → {kind:'resume', authId}  (pokračuj „Kto si?")
//  · bez authu + stale real session v localStorage → clearSession → {kind:'none'}
//  · demo / nič               → {kind:'none'}  (demo sa NIKDY nediera authom)
export async function resolveSession(): Promise<ResolveVysledok> {
  if (!supabaseReady || !supabase) return { kind: "none" };
  const ses = getSession();
  if (ses && ses.demo) return { kind: "none" };

  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;

  if (!user) {
    // žiadny Supabase auth, ale localStorage drží real session → stale, vyčisti
    if (ses && !ses.demo && ses.ucet_id) clearSession();
    return { kind: "none" };
  }
  // ANONYMNÉ konto (osobné DB funkcie pre hosťa) = NIE je registrácia → hosť, nie resume.
  // Bez tohto by sa anon user (bez `ucet`) tváril ako rozrobený onboarding.
  if (user.is_anonymous) return { kind: "none" };

  const ucet = await najdiUcetPodlaAuth(user.id);
  if (!ucet) return { kind: "resume", authId: user.id };
  if (ucet.stav_registracie !== "hotovo") {
    return { kind: "resume", authId: user.id, typ: ucet.typ as TypUctu, stav: ucet.stav_registracie };
  }
  const meno = await odvodMeno(ucet.id, ucet.typ);
  setSession({ ucet_id: ucet.id, typ: ucet.typ as TypUctu, poradove_cislo: ucet.poradove_cislo, meno });
  return { kind: "app" };
}

// onAuthStateChange: pri SIGNED_OUT vyčisti app-session (cross-tab logout, expiry).
// Ignoruje TOKEN_REFRESHED/USER_UPDATED. Vracia odhlasovaciu funkciu.
export function subscribeAuth(onSignedOut?: () => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      const s = getSession();
      if (s && !s.demo) clearSession();
      onSignedOut?.();
    }
  });
  return () => data.subscription.unsubscribe();
}
