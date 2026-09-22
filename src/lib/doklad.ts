// ============================================================
// DOKLAD K ZBIERKE — fotka (bloček, faktúra) alebo PDF faktúry.
// Fotka sa prekóduje (bez EXIF/GPS), PDF sa uloží ako je (mock: data-URL,
// v produkcii upload do privátneho úložiska).
// ============================================================
import { spracujFotku } from "@/lib/obrazok";

export const DOKLAD_CFG = { maxPdfMB: 3 };

export const jePdf = (u?: string) => !!u && u.startsWith("data:application/pdf");

/** súbor dokladu → data-URL; chybu vyhodí so slovenskou hláškou */
export async function nacitajDoklad(f: File): Promise<string> {
  if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
    if (f.size > DOKLAD_CFG.maxPdfMB * 1024 * 1024) throw new Error(`PDF má ${(f.size / 1024 / 1024).toFixed(1)} MB — limit je ${DOKLAD_CFG.maxPdfMB} MB.`);
    return await new Promise<string>((ok, zle) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).replace(/^data:[^;]*;/, "data:application/pdf;"));
      r.onerror = () => zle(new Error("PDF sa nepodarilo načítať."));
      r.readAsDataURL(f);
    });
  }
  return spracujFotku(f, { pomer: null, maxSirka: 1400 });
}

/** otvorí doklad v novej karte (PDF cez blob — prehliadače blokujú priame data-URL) */
export async function otvorDoklad(u: string) {
  try {
    const blob = await (await fetch(u)).blob();
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  } catch { /* nič */ }
}
