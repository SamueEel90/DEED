// ============================================================
// DEED · PWA — registrácia service workera (update prompt cez
// sonner) + „Pridať na plochu" (beforeinstallprompt store).
//
//  · initPwa() — volá sa raz z main.tsx; v dev je SW vypnutý.
//  · useInstall() — hook pre UI: { dostupny, instaluj, ios }.
//    Android/desktop Chrome → natívny prompt; iOS Safari nemá
//    beforeinstallprompt → vraciame `ios` na zobrazenie návodu.
// ============================================================
import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";
import { sonnerToast } from "@/components/toast";

// ---- service worker + update toast ----
export function initPwa(): void {
  if (import.meta.env.DEV || typeof window === "undefined") return;
  const aktualizuj = registerSW({
    onNeedRefresh() {
      sonnerToast("Nová verzia DEED+ je pripravená.", {
        duration: 12000,
        action: { label: "Obnoviť", onClick: () => { void aktualizuj(true); } },
      });
    },
    onOfflineReady() {
      sonnerToast("DEED+ je pripravený aj offline.", { duration: 3500 });
    },
  });
}

// ---- install prompt (beforeinstallprompt) ----
type BipEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let odlozeny: BipEvent | null = null;
const posluchaci = new Set<() => void>();
const ohlas = () => posluchaci.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // prompt ukážeme na klik, nie hneď
    odlozeny = e as BipEvent;
    ohlas();
  });
  window.addEventListener("appinstalled", () => { odlozeny = null; ohlas(); });
}

const subscribe = (cb: () => void) => { posluchaci.add(cb); return () => { posluchaci.delete(cb); }; };
const jeStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

/** iOS Safari (bez beforeinstallprompt) mimo nainštalovanej appky → ukáž návod. */
export const jeIosBezPwa = (): boolean =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !jeStandalone();

export function useInstall(): { dostupny: boolean; ios: boolean; instaluj: () => void } {
  const dostupny = useSyncExternalStore(subscribe, () => odlozeny !== null);
  const instaluj = () => {
    const e = odlozeny;
    if (!e) return;
    odlozeny = null;
    ohlas();
    void e.prompt();
  };
  return { dostupny, ios: !dostupny && jeIosBezPwa(), instaluj };
}
