// ============================================================
// DEED · Zdieľanie — jeden zdroj pravdy pre „Zdieľať" a „Kopírovať"
// naprieč modulmi. Poradie: Web Share API (mobil — natívny sheet)
// → clipboard fallback s toastom. Zrušenie share sheetu užívateľom
// nie je chyba a nezobrazuje nič.
// ============================================================

type Toast = ((m: string) => void) | undefined;

/** Skopíruje text do schránky; toast potvrdí (alebo ohlási nedostupnosť). */
export async function kopiruj(text: string, toast?: Toast, sprava = "Odkaz skopírovaný do schránky"): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast?.(sprava);
    return true;
  } catch {
    toast?.("Kopírovanie nie je dostupné — skopíruj ručne: " + text);
    return false;
  }
}

/**
 * Natívne zdieľanie s fallbackom na clipboard.
 * `url` je hlavný náklad; bez `url` sa zdieľa/kopíruje `text`.
 */
export async function zdielaj(o: { titul: string; text?: string; url?: string }, toast?: Toast): Promise<void> {
  const naklad = o.url ?? o.text ?? "";
  if (typeof navigator.share === "function") {
    try { await navigator.share({ title: o.titul, text: o.text, url: o.url }); return; }
    catch (e) {
      // AbortError = užívateľ zavrel sheet — ticho; iné chyby → fallback
      if ((e as DOMException)?.name === "AbortError") return;
    }
  }
  if (naklad) await kopiruj(naklad, toast);
}

/** Absolútna URL aktuálnej obrazovky (po Vlne 2 nesie /m/{modul}). */
export function aktualnaUrl(): string {
  return location.origin + location.pathname;
}
