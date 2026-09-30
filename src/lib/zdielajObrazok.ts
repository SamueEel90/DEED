// Zdieľanie obrázka z <canvas> (1080 × 1350) — systémové zdieľanie so súborom, inak stiahnutie PNG.
import QRCode from "qrcode";

export async function zdielajCanvas(c: HTMLCanvasElement, nazovSuboru: string, titul: string): Promise<"zdielane" | "stiahnute" | "zrusene"> {
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) return "zrusene";
  const subor = new File([blob], nazovSuboru, { type: "image/png" });
  const n = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (n.share && n.canShare?.({ files: [subor] })) {
    try { await n.share({ files: [subor], title: titul }); return "zdielane"; } catch { return "zrusene"; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = nazovSuboru; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "stiahnute";
}

/** spoločný rám obrázka: pozadie, logo DEED dole a QR na appku */
export async function ramObrazka(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#EFEAE1"); g.addColorStop(1, "#E2D7BF");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1D211B"; ctx.font = "800 44px 'Plus Jakarta Sans', sans-serif"; ctx.textBaseline = "alphabetic";
  ctx.fillText("DEED", 72, H - 80);
  // plus značky DEED+ (karta 30, 2b): nakreslený dvoma pásikmi, .34em, hrúbka .095em, vrch = vrch D
  const em = 44, w = ctx.measureText("DEED").width, pl = 72 + w + 0.07 * em, vel = 0.34 * em, hr = 0.095 * em, vrch = H - 80 - 0.70 * em;
  ctx.fillRect(pl, vrch + (vel - hr) / 2, vel, hr); ctx.fillRect(pl + (vel - hr) / 2, vrch, hr, vel);
  ctx.fillStyle = "#4A4C43"; ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("Miesto, kde nerozhodujú slová, ale skutky", 72, H - 42);
  try {
    const qr = document.createElement("canvas");
    await QRCode.toCanvas(qr, "https://deed.sk", { width: 150, margin: 1, color: { dark: "#1D211B", light: "#ffffff" } });
    ctx.fillStyle = "#fff"; ctx.fillRect(W - 72 - 162, H - 72 - 162 + 20, 162, 162);
    ctx.drawImage(qr, W - 72 - 156, H - 72 - 156 + 20, 150, 150);
  } catch { /* bez QR */ }
}
