// ============================================================
// Mock session (kým nie je reálny Supabase Auth)
// Drží prihláseného usera v localStorage + notifikuje React.
//   · registrovaný:  { ucet_id, typ, poradove_cislo, meno }
//   · demo (preskočená registrácia): { demo: true }
//   · žiadna session (null) → appka zobrazí registráciu (§1 vidlička)
// ============================================================
import { useEffect, useState } from "react";
import type { Session } from "@/types";

const KEY = "deed.session";
const listeners = new Set<() => void>();

export function getSession(): Session {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null") as Session;
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setSession(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
  emit();
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
  emit();
}

// React hook — re-renderuje pri prihlásení/odhlásení (aj naprieč tabmi)
// OPRAVY 370: iná karta s appkou zapisuje do localStorage stále (príspevky, videné, zvonček …) — každý zápis
// prekreslil celú appku v tejto karte (aj Nástenku), na PC s viacerými kartami sa rolovanie zasekávalo.
// Teraz len zmena session a len keď sa naozaj zmenila.
const surova = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export function useSession(): Session {
  const [s, setS] = useState<Session>(getSession);
  useEffect(() => {
    let posledna = surova();
    const l = () => { const r = surova(); if (r === posledna) return; posledna = r; setS(getSession()); };
    const naStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) l(); };
    listeners.add(l);
    window.addEventListener("storage", naStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", naStorage);
    };
  }, []);
  return s;
}
