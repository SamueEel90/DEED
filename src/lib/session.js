// ============================================================
// Mock session (kým nie je reálny Supabase Auth)
// Drží prihláseného usera v localStorage + notifikuje React.
//   · registrovaný:  { ucet_id, typ, poradove_cislo, meno }
//   · demo (preskočená registrácia): { demo: true }
//   · žiadna session (null) → appka zobrazí registráciu (§1 vidlička)
// ============================================================
import { useEffect, useState } from "react";

const KEY = "deed.session";
const listeners = new Set();

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setSession(s) {
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
export function useSession() {
  const [s, setS] = useState(getSession);
  useEffect(() => {
    const l = () => setS(getSession());
    listeners.add(l);
    window.addEventListener("storage", l);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", l);
    };
  }, []);
  return s;
}
