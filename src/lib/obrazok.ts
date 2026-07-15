// ============================================================
// UPLOAD OBRÁZKOV (DEED_Formatovanie_Textu_DEV.md · ČASŤ B, §8)
// Klient VŽDY re-enkóduje cez canvas → JPEG:
//  · zabije EXIF vrátane GPS (fotka z fary nesie súradnice bytu — súkromie)
//  · typ sa kontroluje podľa OBSAHU (dekódovanie), nie prípony — falošná
//    prípona = dekódovanie zlyhá = odmietnuté
//  · orez na pomer dizajnu (cover 16:9, avatar štvorec) + zmenšenie
// HEIC: iOS pri výbere cez <input type=file> konvertuje HEIC→JPEG sám,
// Safari heic dekóduje natívne; pri reálnom backende re-enkód beží aj na
// serveri (spec: „server VŽDY re-enkóduje") — toto je jeho klientská verzia.
// ============================================================

export const OBRAZOK_CFG = {
  maxMB: 10,        // limit veľkosti (config, štart 10 MB)
  maxSirka: 1600,   // dlhšia strana po zmenšení
  kvalita: 0.85,
};

async function dekoduj(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // 1. cesta: createImageBitmap (rýchle, bez DOM)
  try { return await createImageBitmap(file); } catch { /* skús <img> (starší Safari) */ }
  // 2. cesta: <img> + objectURL
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("dekódovanie zlyhalo")); };
    img.src = url;
  });
}

/**
 * Spracuje súbor na bezpečný JPEG data-URL (mock náhrada serverového re-enkódu).
 * `pomer` = šírka/výška na orez (16/9 cover, 1 avatar); null = bez orezu.
 * Vyhadzuje Error so slovenskou hláškou — ukáž ju používateľovi.
 */
export async function spracujFotku(file: File, o: { pomer?: number | null; maxSirka?: number } = {}): Promise<string> {
  const maxB = OBRAZOK_CFG.maxMB * 1024 * 1024;
  if (file.size > maxB) throw new Error(`Súbor má ${(file.size / 1024 / 1024).toFixed(1)} MB — limit je ${OBRAZOK_CFG.maxMB} MB.`);

  let zdroj: ImageBitmap | HTMLImageElement;
  try { zdroj = await dekoduj(file); }
  catch { throw new Error("Toto nie je platný obrázok (JPG/PNG/WebP/HEIC) — súbor sa nedá prečítať."); }

  const sw = "width" in zdroj ? zdroj.width : 0;
  const sh = "height" in zdroj ? zdroj.height : 0;
  if (!sw || !sh) throw new Error("Obrázok je prázdny alebo poškodený.");

  // orez na pomer dizajnu (center-crop) + zmenšenie
  const pomer = o.pomer ?? null;
  let cw = sw, ch = sh, cx = 0, cy = 0;
  if (pomer) {
    if (sw / sh > pomer) { cw = Math.round(sh * pomer); cx = Math.round((sw - cw) / 2); }
    else { ch = Math.round(sw / pomer); cy = Math.round((sh - ch) / 2); }
  }
  const maxS = o.maxSirka ?? OBRAZOK_CFG.maxSirka;
  const mierka = Math.min(1, maxS / Math.max(cw, ch));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cw * mierka);
  canvas.height = Math.round(ch * mierka);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nie je dostupný.");
  ctx.drawImage(zdroj as CanvasImageSource, cx, cy, cw, ch, 0, 0, canvas.width, canvas.height);
  if ("close" in zdroj) zdroj.close();

  // toDataURL = čerstvý JPEG bez metadát → EXIF/GPS je preč
  return canvas.toDataURL("image/jpeg", OBRAZOK_CFG.kvalita);
}
