// ============================================================
// OPRAVY 320 · plagát Vecnej zbierky — A4 s pevným rozložením, kreslený do obrázka (náhľad = tlač = PDF, to isté).
// Hlavička zo systému (logo, celý názov a adresa z Upraviť profil, bez štítu) · VECNÁ ZBIERKA · fotka (voliteľne,
// vždy rovnako vysoká) · názov najviac 2 riadky · text najviac 3 riadky · QR vždy aspoň 5 × 5 cm · Darovali ste? · Organizuje.
// ============================================================
import { DeedQr } from "@/components/deedqr";

export const A4_W = 1240, A4_H = 1754; // 150 dpi
const PX_NA_CM = A4_W / 21;
const PISMO = `"Plus Jakarta Sans", Arial, Helvetica, sans-serif`;
const ZELENA = "#3E7A2E";

export interface PodkladPlagatu {
  nazov: string; text: string; foto: string | null; logo: string | null; inicialy: string;
  menoFarnosti: string; adresa: string; organizuje: string; odkaz: string;
  /** OPRAVY 347: jeden plagát pre všetky QR — druh nad názvom a dva riadky pod QR (predvolene vecná zbierka) */
  druh?: string; vyzva?: [string, string];
}

function obrazok(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => ok(img); img.onerror = () => ok(null); img.src = src;
  });
}
async function qrObrazok(data: string, px: number): Promise<HTMLImageElement | null> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const svg = renderToStaticMarkup(<DeedQr data={data} odznak="D++" variant="svetly" size={px} />);
  return obrazok(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}
/** zalomí text na riadky do šírky; viac ako max riadkov = posledný s „…“ */
export function zalom(g: CanvasRenderingContext2D, t: string, sirka: number, max: number): string[] {
  const r: string[] = []; let a = "";
  for (const w of t.trim().split(/\s+/).filter(Boolean)) {
    const s = a ? `${a} ${w}` : w;
    if (g.measureText(s).width > sirka && a) { r.push(a); a = w; } else a = s;
  }
  if (a) r.push(a);
  if (r.length <= max) return r;
  const v = r.slice(0, max); let p = v[max - 1];
  while (p.length > 1 && g.measureText(`${p} …`).width > sirka) p = p.slice(0, -1);
  v[max - 1] = `${p.trimEnd()} …`;
  return v;
}
/** koľko riadkov zaberie text na plagáte (pole Text na plagáte, najviac 3) */
export function riadkovTextu(t: string, sFotkou: boolean): number {
  const c = document.createElement("canvas").getContext("2d"); if (!c) return 1;
  c.font = `500 ${sFotkou ? 38 : 46}px ${PISMO}`;
  return zalom(c, t, A4_W - 2 * 110, 99).length;
}

function zaoblene(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / s, sh = h / s;
  g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}
function stred(g: CanvasRenderingContext2D, t: string, y: number) { g.textAlign = "center"; g.fillText(t, A4_W / 2, y); }

/** nakreslí plagát; fotkaChyba = fotku sa nepodarilo načítať (plagát je potom bez nej) */
export async function kresliPlagat(p: PodkladPlagatu, o?: { bezQr?: boolean }): Promise<{ c: HTMLCanvasElement; fotkaChyba: boolean; qr: { x: number; y: number; s: number } }> {
  try { await document.fonts?.load(`800 40px ${PISMO}`); } catch { /* písmo z prehliadača */ }
  const c = document.createElement("canvas"); c.width = A4_W; c.height = A4_H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#FBF8F2"; g.fillRect(0, 0, A4_W, A4_H);
  const M = 110, W = A4_W - 2 * M;
  const [foto, logo, qr] = await Promise.all([p.foto ? obrazok(p.foto) : Promise.resolve(null), p.logo ? obrazok(p.logo) : Promise.resolve(null), o?.bezQr ? Promise.resolve(null) : qrObrazok(p.odkaz, 900)]);
  const fotkaChyba = !!p.foto && !foto;
  const sFotkou = !!foto;
  // hlavička (zo systému)
  const L = 96, hy = 84;
  if (logo) { g.save(); zaoblene(g, M, hy, L, L, 18); g.clip(); cover(g, logo, M, hy, L, L); g.restore(); }
  else { g.fillStyle = "#E9E2D2"; zaoblene(g, M, hy, L, L, 18); g.fill(); g.fillStyle = "#5A4E36"; g.font = `800 38px ${PISMO}`; g.textAlign = "center"; g.fillText(p.inicialy.slice(0, 3), M + L / 2, hy + L / 2 + 14); }
  g.textAlign = "left"; g.fillStyle = "#1A1A1A"; g.font = `800 34px ${PISMO}`;
  const hl = zalom(g, p.menoFarnosti, W - L - 28, 2);
  hl.forEach((t, i) => g.fillText(t, M + L + 28, hy + 38 + i * 40));
  if (p.adresa) { g.fillStyle = "#666"; g.font = `500 26px ${PISMO}`; g.fillText(zalom(g, p.adresa, W - L - 28, 1)[0], M + L + 28, hy + 38 + hl.length * 40 + 2); }
  const ciara = hy + L + 34;
  g.strokeStyle = "#DDD6C8"; g.lineWidth = 3; g.beginPath(); g.moveTo(M, ciara); g.lineTo(A4_W - M, ciara); g.stroke();
  // VECNÁ ZBIERKA
  let y = ciara + 72;
  g.fillStyle = ZELENA; g.font = `800 34px ${PISMO}`;
  if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "5px";
  stred(g, p.druh ?? "VECNÁ ZBIERKA", y);
  if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  y += 34;
  // fotka — vždy rovnako vysoká
  // rozpočet výšky: s fotkou aj pri 2 riadkoch názvu a 3 riadkoch textu ostane QR aspoň 5 × 5 cm
  if (foto) { const FH = 280; g.save(); zaoblene(g, M, y, W, FH, 22); g.clip(); cover(g, foto, M, y, W, FH); g.restore(); y += FH + 72; } else y += 70;
  // názov (najviac 2 riadky)
  const NV = sFotkou ? 66 : 84;
  g.fillStyle = "#1A1A1A"; g.font = `800 ${NV}px ${PISMO}`;
  zalom(g, p.nazov, W, 2).forEach((t) => { stred(g, t, y); y += NV * 1.16; });
  // text (najviac 3 riadky)
  const TV = sFotkou ? 38 : 46;
  y += 10; g.fillStyle = "#444"; g.font = `500 ${TV}px ${PISMO}`;
  zalom(g, p.text, W, 3).forEach((t) => { stred(g, t, y); y += TV * 1.4; });
  // QR — vždy aspoň 5 × 5 cm (plocha kódu je ~66 % obrázka s rámom, preto obrázok väčší)
  const pata = A4_H - 90, spodokTextu = pata - 190;
  const Q = Math.max(Math.round(7.6 * PX_NA_CM), Math.min(spodokTextu - y - 40, Math.round(11 * PX_NA_CM)));
  const qy = spodokTextu - Q;
  if (qr) g.drawImage(qr, (A4_W - Q) / 2, qy, Q, Q);
  const [v1, v2] = p.vyzva ?? ["Darovali ste? Naskenujte", "a zapíšte sa medzi darcov"];
  g.fillStyle = "#1A1A1A"; g.font = `800 44px ${PISMO}`; stred(g, v1, qy + Q + 58);
  g.fillStyle = "#555"; g.font = `500 34px ${PISMO}`; stred(g, v2, qy + Q + 104);
  if (p.organizuje.trim()) { g.fillStyle = "#777"; g.font = `500 30px ${PISMO}`; stred(g, zalom(g, `Organizuje ${p.organizuje.trim()}`, W, 1)[0], pata); }
  return { c, fotkaChyba, qr: { x: (A4_W - Q) / 2, y: qy, s: Q } };
}

/** obrázok plagátu → PDF A4 (jedna strana, obrázok cez celú stranu) */
export function plagatNaPdf(c: HTMLCanvasElement): Blob {
  const b64 = c.toDataURL("image/jpeg", 0.92).split(",")[1], bin = atob(b64), jpg = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) jpg[i] = bin.charCodeAt(i);
  const W = 595.28, H = 841.89, obsah = `q ${W} 0 0 ${H} 0 0 cm /Im1 Do Q`;
  const casti: (string | Uint8Array)[] = [], off: number[] = []; let dlzka = 0;
  const pridaj = (x: string | Uint8Array) => { casti.push(x); dlzka += x.length; };
  const obj = (n: number, telo: (string | Uint8Array)[]) => { off[n] = dlzka; pridaj(`${n} 0 obj\n`); telo.forEach(pridaj); pridaj("\nendobj\n"); };
  pridaj("%PDF-1.4\n");
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
  obj(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>`]);
  obj(4, [`<< /Length ${obsah.length} >>\nstream\n${obsah}\nendstream`]);
  obj(5, [`<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, "\nendstream"]);
  const xref = dlzka;
  pridaj(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((n) => `${String(off[n]).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const u8 = new Uint8Array(dlzka); let p = 0;
  for (const x of casti) { if (typeof x === "string") { for (let i = 0; i < x.length; i++) u8[p++] = x.charCodeAt(i) & 255; } else { u8.set(x, p); p += x.length; } }
  return new Blob([u8], { type: "application/pdf" });
}
export function stiahniPdf(c: HTMLCanvasElement, nazov: string) {
  const url = URL.createObjectURL(plagatNaPdf(c));
  const a = document.createElement("a"); a.href = url;
  a.download = `plagat-${nazov.normalize("NFD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "vecna-zbierka"}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
/** tlač A4 cez skrytý rám (bez nového okna) */
export function vytlac(c: HTMLCanvasElement): Promise<void> {
  return new Promise((ok, zle) => {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
    const d = f.contentDocument; if (!d || !f.contentWindow) { f.remove(); zle(new Error("tlac")); return; }
    d.open(); d.write(`<!doctype html><html><head><style>@page{size:A4;margin:0}html,body{margin:0}img{display:block;width:210mm;height:297mm}</style></head><body><img alt="" src="${c.toDataURL("image/png")}"></body></html>`); d.close();
    const img = d.querySelector("img");
    const tlac = () => { try { f.contentWindow!.focus(); f.contentWindow!.print(); ok(); } catch (e) { zle(e as Error); } window.setTimeout(() => f.remove(), 60000); };
    if (img && !img.complete) img.onload = tlac; else tlac();
  });
}
