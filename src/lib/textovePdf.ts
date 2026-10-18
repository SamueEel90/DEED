// ============================================================
// OPRAVY 346 — jednoduché textové PDF (A4, Helvetica so slovenskými znakmi, viac strán): Ročný výpis farnosti.
// Riadok = text vľavo, voliteľne suma vpravo; nadpis tučne. Bez knižníc (ako faktúry a plagát).
// ============================================================
import { NAVYSE, bajty, esc } from "./fakturyOrg";

export type RiadokPdf = { t: string; v?: string; tucne?: boolean; velkost?: number; medzera?: number };

/** znaky mimo písma PDF → najbližšie, ktoré písmo má (pomlčka, tri bodky) */
const pis = (t: string) => esc(bajty(t.replace(/—/g, "–").replace(/…/g, "...")));

export function textovePdf(riadky: RiadokPdf[]): Blob {
  const W = 595, H = 842, L = 56, P = 539, HORE = 786, DOLE = 60;
  const strany: string[][] = [[]];
  let y = HORE;
  for (const r of riadky) {
    const s = r.velkost ?? 11, krok = s * 1.45 + (r.medzera ?? 0);
    if (y - krok < DOLE) { strany.push([]); y = HORE; }
    y -= krok;
    const f = r.tucne ? "F2" : "F1", st = strany[strany.length - 1];
    st.push(`BT /${f} ${s} Tf ${L} ${y.toFixed(1)} Td (${pis(r.t)}) Tj ET`);
    if (r.v) { const x = P - r.v.length * s * 0.52; st.push(`BT /${f} ${s} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pis(r.v)}) Tj ET`); }
  }
  const n = strany.length;
  strany.forEach((st, i) => st.push(`BT /F1 9 Tf ${L} 36 Td (${pis(`Strana ${i + 1} z ${n} · DEED+`)}) Tj ET`));
  const dif = `/Differences [128 ${NAVYSE.map(([, g]) => `/${g}`).join(" ")}]`;
  const font = (z: string) => `<< /Type /Font /Subtype /Type1 /BaseFont /${z} /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding ${dif} >> >>`;
  // objekty: 1 katalóg, 2 strany, 3 F1, 4 F2, potom pre každú stranu: stránka + obsah
  const obj: string[] = [];
  obj[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  obj[2] = `<< /Type /Pages /Kids [${strany.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${n} >>`;
  obj[3] = font("Helvetica"); obj[4] = font("Helvetica-Bold");
  strany.forEach((st, i) => {
    const obsah = st.join("\n");
    obj[5 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
    obj[6 + i * 2] = `<< /Length ${obsah.length} >>\nstream\n${obsah}\nendstream`;
  });
  let out = "%PDF-1.4\n";
  const off: number[] = [];
  for (let k = 1; k < obj.length; k++) { off[k] = out.length; out += `${k} 0 obj\n${obj[k]}\nendobj\n`; }
  const xref = out.length;
  out += `xref\n0 ${obj.length}\n0000000000 65535 f \n${off.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${obj.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const u8 = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) u8[i] = out.charCodeAt(i) & 255;
  return new Blob([u8], { type: "application/pdf" });
}

export function stiahniBlob(b: Blob, meno: string) {
  const url = URL.createObjectURL(b);
  const a = document.createElement("a"); a.href = url; a.download = meno;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
