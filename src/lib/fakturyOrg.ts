// Doplnky 5. 10. (C3) · faktúry za platby organizácie DEED+ (topovanie, predĺženie, program, doplnky).
// Ku každej platbe DEED+ jedna faktúra. Dar (dorovnanie) faktúru nemá.
// Zatiaľ len v pamäti (žiadne úložisko prehliadača); ostrú faktúru vystaví a pošle e-mailom server — pozri Odkazy pre Samuela.
import { useSyncExternalStore } from "react";

export interface FakturaOrg {
  /** „2026/1043" — zobrazuje sa ako FA 2026/1043 */
  cislo: string;
  /** čo sa platilo (Topovať · Mesto · 7 dní) */
  co: string;
  suma: number;
  datum: string;
  sposob: string;
  odberatel: { nazov: string; ico: string; adresa: string; dic?: string; email: string };
}

let FA: FakturaOrg[] = [];
let dalsie = 1043; // testovacie číslovanie, pokračuje za 3 faktúrami za program
const pocuvaj = new Set<() => void>();
const zmena = () => pocuvaj.forEach((f) => f());

export function vystavFakturu(f: Omit<FakturaOrg, "cislo" | "datum">): FakturaOrg {
  const n: FakturaOrg = { ...f, cislo: `${new Date().getFullYear()}/${dalsie++}`, datum: new Date().toISOString() };
  FA = [n, ...FA];
  zmena();
  return n;
}
export function useFakturyOrg(): FakturaOrg[] {
  return useSyncExternalStore((f) => { pocuvaj.add(f); return () => pocuvaj.delete(f); }, () => FA);
}

// ---------------- PDF (jednoduchá testovacia faktúra, Helvetica so slovenskými znakmi) ----------------
// znaky mimo WinAnsi namapované cez /Differences na voľné kódy 0x80+ (glyfy sú v základnom písme Helvetica)
export const NAVYSE: [string, string][] = [["č", "ccaron"], ["Č", "Ccaron"], ["ľ", "lcaron"], ["Ľ", "Lcaron"], ["ť", "tcaron"], ["Ť", "Tcaron"], ["ň", "ncaron"], ["Ň", "Ncaron"], ["ď", "dcaron"], ["Ď", "Dcaron"], ["ĺ", "lacute"], ["Ĺ", "Lacute"], ["ŕ", "racute"], ["Ŕ", "Racute"], ["€", "Euro"], ["•", "bullet"], ["–", "endash"], ["„", "quotedblbase"], ["“", "quotedblleft"], ["š", "scaron"], ["Š", "Scaron"], ["ž", "zcaron"], ["Ž", "Zcaron"]];
const KOD = new Map(NAVYSE.map(([ch], i) => [ch, 0x80 + i]));
export function bajty(t: string): number[] {
  const out: number[] = [];
  for (const ch of t.replace(/ | /g, " ")) {
    const k = KOD.get(ch);
    if (k != null) out.push(k);
    else { const c = ch.charCodeAt(0); out.push(c < 256 ? c : 63); }
  }
  return out;
}
export const esc = (b: number[]) => b.map((c) => (c === 40 || c === 41 || c === 92 ? `\\${String.fromCharCode(c)}` : c < 32 || c > 126 ? `\\${c.toString(8).padStart(3, "0")}` : String.fromCharCode(c))).join("");
const euro = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const den = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };

export function fakturaPdf(f: FakturaOrg): Blob {
  const r: [number, number, number, string][] = []; // x, y, veľkosť, text (bold = veľkosť záporná)
  let y = 790;
  const riadok = (t: string, v = 11, x = 56, dy = 18) => { r.push([x, y, v, t]); y -= dy; };
  riadok(`Faktúra FA ${f.cislo}`, -22, 56, 34);
  riadok("TESTOVACIA FAKTÚRA · ostrú vystaví DEED+ po zaplatení", 9, 56, 30);
  riadok("Odberateľ", -11);
  riadok(f.odberatel.nazov);
  riadok(`IČO ${f.odberatel.ico}${f.odberatel.dic ? ` · DIČ ${f.odberatel.dic}` : ""}`);
  riadok(f.odberatel.adresa);
  riadok(f.odberatel.email, 11, 56, 30);
  riadok(`Dátum vystavenia a úhrady: ${den(f.datum)}`);
  riadok(`Spôsob úhrady: ${f.sposob}`, 11, 56, 30);
  riadok("Položka", -11, 56, 0); riadok("Suma", -11, 470, 20);
  riadok(f.co, 11, 56, 0); riadok(euro(f.suma), 11, 470, 30);
  riadok("Spolu uhradené", -12, 56, 0); riadok(euro(f.suma), -12, 470, 30);
  riadok("Platila organizácia, nie zbierka. Z vyzbieraných peňazí sa nič neberie.", 9);

  const obsah = r.map(([x, yy, v, t]) => `BT /${v < 0 ? "F2" : "F1"} ${Math.abs(v)} Tf ${x} ${yy} Td (${esc(bajty(t))}) Tj ET`).join("\n");
  const dif = `/Differences [128 ${NAVYSE.map(([, g]) => `/${g}`).join(" ")}]`;
  const font = (zaklad: string) => `<< /Type /Font /Subtype /Type1 /BaseFont /${zaklad} /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding ${dif} >> >>`;
  const obj = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    font("Helvetica"), font("Helvetica-Bold"),
    `<< /Length ${obsah.length} >>\nstream\n${obsah}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const off: number[] = [];
  obj.forEach((o, i) => { off.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const u8 = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) u8[i] = pdf.charCodeAt(i) & 255;
  return new Blob([u8], { type: "application/pdf" });
}

/** otvorí PDF faktúry v novom okne, keď to prehliadač nedovolí, stiahne ho */
export function otvorFakturu(f: FakturaOrg) {
  const url = URL.createObjectURL(fakturaPdf(f));
  let w: Window | null = null;
  try { w = window.open(url, "_blank"); } catch { /* sandbox */ }
  if (!w) { const a = document.createElement("a"); a.href = url; a.download = `FA-${f.cislo.replace("/", "-")}.pdf`; document.body.appendChild(a); a.click(); a.remove(); }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
