// ============================================================
// OPRAVY 466 doplnok · zariadenie odhlásené z iného zariadenia (Prihlásené zariadenia → Odhlásiť).
// Po prihlásení sa toto zariadenie zapíše do zoznamu; každú minútu a pri návrate do okna sa pozrie, či v ňom ešte je.
// Keď ho odhlásili na diaľku, appka sa hneď odhlási a na prihlásení povie prečo.
// ============================================================
import { useEffect } from "react";
import { signOut } from "@/lib/auth";
import { zapisToZariadenie, odhlaseneNaDialku } from "@/lib/zariadenia";

const DOVOD = "deed.odhlasenyNaDialku";
export function odhlasenyNaDialku(): boolean {
  try { const v = sessionStorage.getItem(DOVOD) === "1"; sessionStorage.removeItem(DOVOD); return v; } catch { return false; }
}

export function StrazOdhlasenia() {
  useEffect(() => {
    let ziva = true;
    void zapisToZariadenie();
    const over = async () => {
      if (!(await odhlaseneNaDialku()) || !ziva) return;
      try { sessionStorage.setItem(DOVOD, "1"); } catch { /* SS */ }
      void signOut();
    };
    const t = window.setInterval(() => void over(), 60000);
    const v = () => { if (document.visibilityState === "visible") void over(); };
    document.addEventListener("visibilitychange", v);
    return () => { ziva = false; window.clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, []);
  return null;
}
