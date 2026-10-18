// ============================================================
// OPRAVY 347 · QR na tlač — PDF s vektorovým QR v ráme DEED (jeden celok, ten istý ako DeedQr v appke).
// SVG z DeedQr sa prepíše na PDF krivky (obdĺžniky, cesty, odznak), nič sa nerastruje.
// Nálepky 5 × 5 cm (15 na A4) a 10 × 10 cm (2 na A4) so značkami na strihanie; plagát = obrázok + vektorový QR.
// ============================================================
import type { DeedQrVariant } from "@/components/deedqr";

export type FormatQr = "n5" | "n10" | "a4" | "a5";
const CM = 72 / 2.54;
const A4: [number, number] = [595.28, 841.89];
const A5: [number, number] = [419.53, 595.28];

const f = (n: number) => (Math.round(n * 1000) / 1000).toString();
function farba(hex: string | null): string | null {
  if (!hex || hex === "none") return null;
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "0 0 0";
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => f(c / 255)).join(" ");
}
const K = 0.5523;
function obdlznik(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0) return `${f(x)} ${f(y)} ${f(w)} ${f(h)} re`;
  const k = r * K;
  return [`${f(x + r)} ${f(y)} m`, `${f(x + w - r)} ${f(y)} l`, `${f(x + w - r + k)} ${f(y)} ${f(x + w)} ${f(y + r - k)} ${f(x + w)} ${f(y + r)} c`,
    `${f(x + w)} ${f(y + h - r)} l`, `${f(x + w)} ${f(y + h - r + k)} ${f(x + w - r + k)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} c`,
    `${f(x + r)} ${f(y + h)} l`, `${f(x + r - k)} ${f(y + h)} ${f(x)} ${f(y + h - r + k)} ${f(x)} ${f(y + h - r)} c`,
    `${f(x)} ${f(y + r)} l`, `${f(x)} ${f(y + r - k)} ${f(x + r - k)} ${f(y)} ${f(x + r)} ${f(y)} c`, "h"].join(" ");
}
/** SVG cesta (absolútne M L H V C Q Z — tak ich píše DeedQr) → PDF */
function cesta(d: string): string {
  const t = d.match(/[MLHVCQZmlhvcqz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const out: string[] = []; let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = "";
  const n = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) cmd = t[i++].toUpperCase();
    if (cmd === "M") { cx = n(); cy = n(); sx = cx; sy = cy; out.push(`${f(cx)} ${f(cy)} m`); cmd = "L"; }
    else if (cmd === "L") { cx = n(); cy = n(); out.push(`${f(cx)} ${f(cy)} l`); }
    else if (cmd === "H") { cx = n(); out.push(`${f(cx)} ${f(cy)} l`); }
    else if (cmd === "V") { cy = n(); out.push(`${f(cx)} ${f(cy)} l`); }
    else if (cmd === "C") { const a = [n(), n(), n(), n(), n(), n()]; cx = a[4]; cy = a[5]; out.push(`${a.map(f).join(" ")} c`); }
    else if (cmd === "Q") { const qx = n(), qy = n(), x = n(), y = n();
      out.push(`${f(cx + (2 / 3) * (qx - cx))} ${f(cy + (2 / 3) * (qy - cy))} ${f(x + (2 / 3) * (qx - x))} ${f(y + (2 / 3) * (qy - y))} ${f(x)} ${f(y)} c`); cx = x; cy = y; }
    else if (cmd === "Z") { out.push("h"); cx = sx; cy = sy; cmd = ""; }
    else i++;
  }
  return out.join(" ");
}
// šírky Helvetica-Bold (1/1000 em) pre odznak
const SIRKY: Record<string, number> = { D: 722, "+": 584, " ": 278 };
const sirka = (s: string, v: number) => [...s].reduce((a, c) => a + (SIRKY[c] ?? (/\d/.test(c) ? 556 : 611)), 0) * v / 1000;

function prvky(el: Element, out: string[]) {
  for (const c of Array.from(el.children)) {
    const tag = c.tagName.toLowerCase(), fill = farba(c.getAttribute("fill"));
    if (tag === "g") {
      const tr = c.getAttribute("transform") ?? "";
      const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/.exec(tr);
      out.push("q"); if (m) out.push(`1 0 0 1 ${m[1]} ${m[2]} cm`);
      if (/rotate/.test(tr)) { out.push("Q"); continue; } // reťaz (tvorca) sa na QR farnosti nepoužíva
      prvky(c, out); out.push("Q");
    } else if (tag === "rect" && fill) {
      const a = (k: string) => parseFloat(c.getAttribute(k) ?? "0") || 0;
      out.push(`${fill} rg ${obdlznik(a("x"), a("y"), a("width"), a("height"), a("rx"))} f`);
    } else if (tag === "path" && fill) {
      out.push(`${fill} rg ${cesta(c.getAttribute("d") ?? "")} f`);
    } else if (tag === "text" && fill) {
      const s = c.textContent ?? "", v = parseFloat(c.getAttribute("font-size") ?? "30");
      let x = parseFloat(c.getAttribute("x") ?? "0"); const y = parseFloat(c.getAttribute("y") ?? "0");
      if (c.getAttribute("text-anchor") === "middle") x -= sirka(s, v) / 2;
      out.push(`${fill} rg BT /QB ${f(v)} Tf 1 0 0 -1 ${f(x)} ${f(y)} Tm (${s.replace(/[()\\]/g, "\\$&")}) Tj ET`);
    }
  }
}

/** vektorový DEED QR → príkazy PDF na mieste (x, y = ľavý dolný roh, strana s v bodoch) */
export async function qrPrikazy(data: string, variant: DeedQrVariant, x: number, y: number, s: number): Promise<string> {
  const [{ renderToStaticMarkup }, { createElement }, { DeedQr }] = await Promise.all([import("react-dom/server"), import("react"), import("@/components/deedqr")]);
  const svg = renderToStaticMarkup(createElement(DeedQr, { data, odznak: "D++", variant, size: 1000 }));
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") throw new Error("QR sa nepodarilo pripraviť.");
  const out: string[] = ["q", `${f(s / 1000)} 0 0 ${f(-s / 1000)} ${f(x)} ${f(y + s)} cm`];
  prvky(root, out);
  out.push("Q");
  return out.join("\n");
}

// ---------- jednoduchý zapisovač PDF (strany, písmo Helvetica-Bold, voliteľne JPEG na celú stranu) ----------
interface Strana { w: number; h: number; obsah: string; jpeg?: { data: Uint8Array; w: number; h: number } }
function pdf(strany: Strana[]): Blob {
  const casti: (string | Uint8Array)[] = [], off: number[] = []; let dlzka = 0;
  const pridaj = (x: string | Uint8Array) => { casti.push(x); dlzka += x.length; };
  const obj = (n: number, telo: (string | Uint8Array)[]) => { off[n] = dlzka; pridaj(`${n} 0 obj\n`); telo.forEach(pridaj); pridaj("\nendobj\n"); };
  pridaj("%PDF-1.4\n");
  // 1 katalóg · 2 strany · 3 písmo · potom pre každú stranu: stránka, obsah, (obrázok)
  const cisla: { p: number; c: number; i?: number }[] = []; let n = 4;
  for (const s of strany) { const p = n++, c = n++, i = s.jpeg ? n++ : undefined; cisla.push({ p, c, i }); }
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, [`<< /Type /Pages /Kids [${cisla.map((x) => `${x.p} 0 R`).join(" ")}] /Count ${strany.length} >>`]);
  obj(3, ["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"]);
  strany.forEach((s, k) => {
    const { p, c, i } = cisla[k];
    obj(p, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(s.w)} ${f(s.h)}] /Resources << /Font << /QB 3 0 R >>${i ? ` /XObject << /Im1 ${i} 0 R >>` : ""} >> /Contents ${c} 0 R >>`]);
    obj(c, [`<< /Length ${s.obsah.length} >>\nstream\n${s.obsah}\nendstream`]);
    if (i && s.jpeg) obj(i, [`<< /Type /XObject /Subtype /Image /Width ${s.jpeg.w} /Height ${s.jpeg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${s.jpeg.data.length} >>\nstream\n`, s.jpeg.data, "\nendstream"]);
  });
  const xref = dlzka;
  pridaj(`xref\n0 ${n}\n0000000000 65535 f \n${Array.from({ length: n - 1 }, (_, k) => `${String(off[k + 1]).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const u8 = new Uint8Array(dlzka); let p = 0;
  for (const x of casti) { if (typeof x === "string") { for (let k = 0; k < x.length; k++) u8[p++] = x.charCodeAt(k) & 255; } else { u8.set(x, p); p += x.length; } }
  return new Blob([u8], { type: "application/pdf" });
}

/** nálepky na hárku A4: 5 × 5 cm = 3 × 5 kusov, 10 × 10 cm = 1 × 2 kusy; značky na strihanie okolo mriežky */
export async function nalepkyPdf(data: string, variant: DeedQrVariant, format: "n5" | "n10"): Promise<Blob> {
  const s = (format === "n5" ? 5 : 10) * CM, st = format === "n5" ? 3 : 1, ri = format === "n5" ? 5 : 2;
  const [W, H] = A4, x0 = (W - st * s) / 2, y0 = (H - ri * s) / 2;
  const qr = await qrPrikazy(data, variant, 0, 0, s);
  const ops: string[] = [];
  for (let r = 0; r < ri; r++) for (let c = 0; c < st; c++) ops.push(`q 1 0 0 1 ${f(x0 + c * s)} ${f(y0 + r * s)} cm\n${qr}\nQ`);
  // značky: krátke čiary 3 – 9 mm od mriežky na každej hrane strihu
  const od = 0.3 * CM, dl = 0.6 * CM, zn: string[] = [];
  for (let c = 0; c <= st; c++) { const x = x0 + c * s; zn.push(`${f(x)} ${f(y0 - od)} m ${f(x)} ${f(y0 - od - dl)} l`, `${f(x)} ${f(y0 + ri * s + od)} m ${f(x)} ${f(y0 + ri * s + od + dl)} l`); }
  for (let r = 0; r <= ri; r++) { const y = y0 + r * s; zn.push(`${f(x0 - od)} ${f(y)} m ${f(x0 - od - dl)} ${f(y)} l`, `${f(x0 + st * s + od)} ${f(y)} m ${f(x0 + st * s + od + dl)} ${f(y)} l`); }
  ops.push(`q 0 0 0 RG 0.4 w ${zn.join(" ")} S Q`);
  return pdf([{ w: W, h: H, obsah: ops.join("\n") }]);
}

/** plagát: obrázok plagátu (bez QR) cez celú stranu + vektorový QR na mieste qr (v pixeloch obrázka) */
export async function plagatPdfVektor(c: HTMLCanvasElement, qr: { x: number; y: number; s: number }, data: string, format: "a4" | "a5"): Promise<Blob> {
  const [W, H] = format === "a5" ? A5 : A4, k = W / c.width;
  const b64 = c.toDataURL("image/jpeg", 0.92).split(",")[1], bin = atob(b64), jpg = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) jpg[i] = bin.charCodeAt(i);
  const q = await qrPrikazy(data, "svetly", qr.x * k, H - (qr.y + qr.s) * k, qr.s * k);
  return pdf([{ w: W, h: H, obsah: `q ${f(W)} 0 0 ${f(H)} 0 0 cm /Im1 Do Q\n${q}`, jpeg: { data: jpg, w: c.width, h: c.height } }]);
}

export function stiahni(b: Blob, meno: string) {
  const url = URL.createObjectURL(b);
  const a = document.createElement("a"); a.href = url; a.download = meno;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export const menoSuboru = (t: string) => t.normalize("NFD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "qr";
