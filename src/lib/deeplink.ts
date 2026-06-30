// ============================================================
// DEED · Deep-link resolver (Fáza 1)
// Naskenovaný QR otvorí appku na URL `/r/{slug}` (príp. /c /@ /o /chain /badge /e).
// Pri boote sa cesta parsne, slug sa resolvne cez `repo.qr.resolve` a appka
// skočí na správny modul. Bez react-routera — len ľahký boot-parse + skok.
// ============================================================
import { parseDeepLink, type QrDruh } from "@/lib/qr";

// moduly, ktoré appka routuje (zhoda s App `ModulId`)
export type ModulCiel = "good" | "help" | "charita" | "profil" | "vyzva" | "mapa" | "top";

/** Druh objektu → modul appky, kam sa má skočiť. */
export function druhNaModul(druh: QrDruh): ModulCiel {
  switch (druh) {
    case "handle": return "profil";   // používateľský profil
    case "org":
    case "branch": return "charita";  // charita / pobočka
    case "event":  return "vyzva";    // aktivity / event
    case "case":                      // skutok / žiadosť
    case "chain":                     // reťaz dobra
    case "badge":                     // odznak (B2B)
    default:       return "good";     // Domov feed
  }
}

/** Prečíta deep-link zo súčasnej URL (alebo null, ak žiadny). */
export function precitajDeepLink(): { slug: string } | null {
  if (typeof window === "undefined") return null;
  return parseDeepLink(window.location.pathname);
}

/** Vyčistí deep-link z URL po spracovaní (nech sa pri ďalšom renderi nereaktivuje). */
export function vycistiDeepLinkUrl(): void {
  try {
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState(null, "", window.location.origin + "/");
    }
  } catch { /* ignoruj (napr. sandbox) */ }
}
