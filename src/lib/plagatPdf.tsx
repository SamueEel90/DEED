// KARTA 48 · „Stiahnuť plagát (PDF)" — A4 na tlač: názov, DEED QR, odkaz a verejné číslo zbierky.
// QR sa vykreslí do obrázka (JPEG) a vloží do jednoduchého PDF; texty Helvetica so slovenskými znakmi.
import { DeedQr } from "@/components/deedqr";
import { NAVYSE, bajty, esc } from "./fakturyOrg";

async function qrJpeg(data: string, px: number): Promise<Uint8Array> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const svg = renderToStaticMarkup(<DeedQr data={data} variant="svetly" size={px} />);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((ok, zle) => { img.onload = () => ok(); img.onerror = () => zle(new Error("QR sa nepodarilo vykresliť")); img.src = url; });
    const c = document.createElement("canvas"); c.width = px; c.height = px;
    const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, px, px); g.drawImage(img, 0, 0, px, px);
    const b64 = c.toDataURL("image/jpeg", 0.92).split(",")[1];
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  } finally { URL.revokeObjectURL(url); }
}

/** zalomenie dlhého názvu na riadky (približne podľa počtu znakov) */
function zalom(t: string, max: number): string[] {
  const r: string[] = []; let a = "";
  for (const w of t.split(/\s+/)) { if ((a + " " + w).trim().length > max && a) { r.push(a); a = w; } else a = (a + " " + w).trim(); }
  if (a) r.push(a);
  return r;
}

export async function plagatPdf(o: { nazov: string; odkaz: string; cislo?: string; organizacia?: string }): Promise<Blob> {
  const PX = 1200, jpg = await qrJpeg(o.odkaz, PX);
  const W = 595, H = 842, Q = 380;
  const riadky: [number, number, number, string][] = []; // x, y, veľkosť (záporná = tučné), text
  let y = 760;
  zalom(o.nazov, 30).forEach((t) => { riadky.push([0, y, -30, t]); y -= 38; });
  if (o.organizacia) { riadky.push([0, y, 14, o.organizacia]); y -= 24; }
  const qy = y - 20 - Q;
  riadky.push([0, qy - 34, -16, o.odkaz.replace(/^https?:\/\//, "")]);
  if (o.cislo) riadky.push([0, qy - 58, 12, `Číslo zbierky ${o.cislo}`]);
  // text na stred: šírka ≈ 0,52 × veľkosť × počet znakov (Helvetica)
  const text = riadky.map(([, yy, v, t]) => { const s = Math.abs(v); const x = Math.max(30, (W - t.length * s * 0.52) / 2); return `BT /${v < 0 ? "F2" : "F1"} ${s} Tf ${x.toFixed(1)} ${yy} Td (${esc(bajty(t))}) Tj ET`; }).join("\n");
  const obsah = `q ${Q} 0 0 ${Q} ${(W - Q) / 2} ${qy} cm /Im1 Do Q\n${text}`;
  const dif = `/Differences [128 ${NAVYSE.map(([, g]) => `/${g}`).join(" ")}]`;
  const font = (z: string) => `<< /Type /Font /Subtype /Type1 /BaseFont /${z} /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding ${dif} >> >>`;
  const casti: (string | Uint8Array)[] = [];
  const off: number[] = []; let dlzka = 0;
  const pridaj = (x: string | Uint8Array) => { casti.push(x); dlzka += typeof x === "string" ? x.length : x.length; };
  const obj = (n: number, telo: (string | Uint8Array)[]) => { off[n] = dlzka; pridaj(`${n} 0 obj\n`); telo.forEach(pridaj); pridaj("\nendobj\n"); };
  pridaj("%PDF-1.4\n");
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
  obj(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 7 0 R >> >> /Contents 6 0 R >>`]);
  obj(4, [font("Helvetica")]); obj(5, [font("Helvetica-Bold")]);
  obj(6, [`<< /Length ${obsah.length} >>\nstream\n${obsah}\nendstream`]);
  obj(7, [`<< /Type /XObject /Subtype /Image /Width ${PX} /Height ${PX} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, "\nendstream"]);
  const xref = dlzka;
  pridaj(`xref\n0 8\n0000000000 65535 f \n${[1, 2, 3, 4, 5, 6, 7].map((n) => `${String(off[n]).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const u8 = new Uint8Array(dlzka); let p = 0;
  for (const c of casti) { if (typeof c === "string") { for (let i = 0; i < c.length; i++) u8[p++] = c.charCodeAt(i) & 255; } else { u8.set(c, p); p += c.length; } }
  return new Blob([u8], { type: "application/pdf" });
}

export async function stiahniPlagat(o: { nazov: string; odkaz: string; cislo?: string; organizacia?: string }) {
  const url = URL.createObjectURL(await plagatPdf(o));
  const a = document.createElement("a"); a.href = url;
  a.download = `plagat-${o.nazov.normalize("NFD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "zbierka"}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
