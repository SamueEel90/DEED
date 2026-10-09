// ============================================================
// OPRAVY 163 · Šablóny oznámení — JEDEN modul pre parte, svadobné oznámenie a oznámenie.
// Používa ho farár (Zbierka s overovateľom, krok 2) aj veriaci (Pridať → parte, SmutocnyForm).
// Prototyp „Sablony oznameni": 8 rozložení · motív (11 symbolov, pri svadbe 6) · s fotkou / bez ·
// čiernobielo / farebne · farby podľa vzhľadu profilu (Kronika zelená · Nástenka zlatá · Moderné modrá).
// Ornament: pätkové písmo a meno písaným — výnimka z Plus Jakarta len pre tento plagát.
// Formulár parte: meno · Muž / Žena (povinné) · dátumy (vek sa vypočíta, nezmysly nepustí) · rodená ·
// kým bol/a · rozlúčka · posledná veta · citát · text · oznamuje.
// ============================================================
import { CasPole } from "@/components/CasPole";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Vzhlad } from "@/lib/vzhladStranky";

export type DruhOznamu = "parte" | "svadba" | "ine";
export interface UdajeOznamu {
  druh: DruhOznamu;
  meno: string;
  /** parte: zosnulý je žena / muž — kým nie je vybrané, voľby a šablóny sa neukážu */
  zena: boolean | null;
  nar: string; umr: string; // ISO dátumy (parte)
  rod: string;               // rodená (len žena)
  roly: number[];            // kým bol/a — indexy ROLY
  kedyD: string; kedyC: string; kde: string; // rozlúčka / sobáš: dátum, čas, miesto (nepovinné)
  zaver: string; citat: string; text: string; kto: string;
  foto?: string;
}
export interface VolbaSablony { v: number; motiv: string; sFotkou: boolean; cb: boolean }
export const prazdneUdaje = (druh: DruhOznamu): UdajeOznamu => ({ druh, meno: "", zena: null, nar: "", umr: "", rod: "", roly: [], kedyD: "", kedyC: "", kde: "", zaver: ZAVERY[0], citat: CITATY[0], text: "", kto: "" });
export const prvaVolba = (druh: DruhOznamu): VolbaSablony => ({ v: 0, motiv: MOT[druh][0], sFotkou: true, cb: true });

// ---- ponuky (prototyp) ----
export const ROLY: [string, string][] = [["manžel", "manželka"], ["otec", "mama"], ["dedko", "babka"], ["pradedko", "prababka"], ["brat", "sestra"], ["syn", "dcéra"], ["strýko", "teta"], ["priateľ", "priateľka"]];
export const ZAVERY = ["Odpočívaj v pokoji.", "S láskou spomínajú", "Posledné zbohom", "Nikdy nezabudneme", "S vďakou a úctou", "Za všetko ďakujeme", "Smútiaca rodina", "— bez poslednej vety —"];
export const CITATY = ["— bez citátu —", "„Láska nikdy nezanikne.“ (1 Kor 13, 8)", "„Ja som vzkriesenie a život.“ (Jn 11, 25)", "„Blahoslavení, ktorí žalostia, lebo oni budú potešení.“ (Mt 5, 4)", "„Pán je môj pastier, nič mi nechýba.“ (Ž 23, 1)", "Odišiel si tíško, ako si žil.", "Kto žije v srdciach, nezomiera."];
const bezVolby = (t: string) => t.startsWith("—");

// ---- farby podľa vzhľadu profilu ----
interface Paleta { n: string; paper: string; ink: string; acc: string; soft: string; dark: string }
const PAL: Record<Vzhlad, Paleta> = {
  kronika: { n: "Kronika", paper: "#F3F1EA", ink: "#1D211B", acc: "#2F5E3A", soft: "#DCE3D0", dark: "#1B2A1F" },
  vyklad: { n: "Nástenka", paper: "#F7F0E1", ink: "#2A2216", acc: "#876712", soft: "#EADFC4", dark: "#2A2216" },
  pirat: { n: "Moderné", paper: "#EEF2F5", ink: "#14202A", acc: "#3D6B8E", soft: "#D5E0E8", dark: "#14202A" } };

// ---- motívy (symboly) ----
const SYM: Record<string, [string, number, number, string]> = {
  kat: ["kríž katolícky", 40, 56, '<rect x="17" y="2" width="6" height="52" rx="1"/><rect x="5" y="14" width="30" height="6" rx="1"/>'],
  prav: ["kríž pravoslávny", 40, 56, '<rect x="17" y="2" width="6" height="52"/><rect x="11" y="8" width="18" height="4"/><rect x="4" y="17" width="32" height="5"/><polygon points="9,37 31,42 31,46 9,41"/>'],
  troj: ["kríž dvojramenný", 40, 56, '<rect x="17" y="2" width="6" height="52"/><rect x="10" y="11" width="20" height="5"/><rect x="4" y="23" width="32" height="5"/>'],
  kelt: ["kríž keltský", 40, 56, '<rect x="17" y="2" width="6" height="52"/><rect x="5" y="16" width="30" height="6"/><circle cx="20" cy="19" r="10" fill="none" stroke="C" stroke-width="3"/>'],
  david: ["Dávidova hviezda", 40, 40, '<polygon points="20,3 36,31 4,31" fill="none" stroke="C" stroke-width="3"/><polygon points="20,37 4,9 36,9" fill="none" stroke="C" stroke-width="3"/>'],
  kniha: ["otvorená kniha", 44, 32, '<path d="M3 6 Q12 2 22 7 Q32 2 41 6 V28 Q32 24 22 29 Q12 24 3 28 Z" fill="none" stroke="C" stroke-width="2.5"/><path d="M22 7 V29" stroke="C" stroke-width="2.5"/>'],
  holub: ["holubica", 48, 34, '<path d="M4 20 C12 20 16 15 20 6 C22 13 26 17 34 18 L44 14 L38 22 C34 29 24 32 14 29 L18 25 Z"/>'],
  svieca: ["sviečka", 24, 52, '<ellipse cx="12" cy="9" rx="4" ry="7"/><rect x="6" y="20" width="12" height="30" rx="2"/>'],
  veniec: ["vavrínový veniec", 48, 44, '<path d="M14 40 C4 32 3 16 12 6 M34 40 C44 32 45 16 36 6" fill="none" stroke="C" stroke-width="2.5"/><ellipse cx="7" cy="30" rx="3" ry="6" transform="rotate(30 7 30)"/><ellipse cx="6" cy="19" rx="3" ry="6" transform="rotate(10 6 19)"/><ellipse cx="10" cy="10" rx="3" ry="6" transform="rotate(-20 10 10)"/><ellipse cx="41" cy="30" rx="3" ry="6" transform="rotate(-30 41 30)"/><ellipse cx="42" cy="19" rx="3" ry="6" transform="rotate(-10 42 19)"/><ellipse cx="38" cy="10" rx="3" ry="6" transform="rotate(20 38 10)"/>'],
  srdce: ["srdiečko", 40, 36, '<path d="M20 34 C6 24 2 16 2 10 C2 5 6 2 11 2 C15 2 18 5 20 8 C22 5 25 2 29 2 C34 2 38 5 38 10 C38 16 34 24 20 34 Z"/>'],
  kruzky: ["obrúčky", 52, 32, '<circle cx="18" cy="16" r="12" fill="none" stroke="C" stroke-width="3.5"/><circle cx="34" cy="16" r="12" fill="none" stroke="C" stroke-width="3.5"/>'],
  bez: ["bez symbolu", 0, 0, ""] };
export const MOT: Record<DruhOznamu, string[]> = {
  parte: ["kat", "prav", "troj", "kelt", "david", "kniha", "holub", "svieca", "veniec", "srdce", "bez"],
  svadba: ["kruzky", "srdce", "holub", "kat", "david", "bez"],
  ine: ["bez", "srdce", "holub", "kat", "david", "kniha", "svieca"] };
const url = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}") center/contain no-repeat`;
const symbol = (k: string, c: string) => { const S = SYM[k]; if (!S?.[1]) return "none"; return url(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S[1]} ${S[2]}" fill="${c}">${S[3].replace(/stroke="C"/g, `stroke="${c}"`)}</svg>`); };
function medailon(k: string, gold: string, ink: string) {
  const S = SYM[k];
  const vnutro = S?.[1] ? `<g transform="translate(${100 - S[1] * 0.8},${100 - S[2] * 0.8}) scale(1.6)" fill="${ink}">${S[3].replace(/stroke="C"/g, `stroke="${ink}"`)}</g>` : "";
  let kruh = ""; for (let j = 0; j < 36; j++) kruh += `<path transform="rotate(${j * 10} 100 100) translate(95 14)" d="M0 0h10v10h-7v-6h4v3" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="miter"/>`;
  const fl = (y: number, r: number) => `<g transform="translate(100 ${y}) rotate(${r})"><path d="M-46 0 Q-20 -2.4 -8 0 Q-20 2.4 -46 0Z M46 0 Q20 -2.4 8 0 Q20 2.4 46 0Z" fill="${ink}"/><circle cx="0" cy="0" r="3" fill="${gold}"/></g>`;
  return url(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="97" fill="#fff" stroke="${gold}" stroke-width="3"/><circle cx="100" cy="100" r="92" fill="none" stroke="${gold}" stroke-width="1"/>${kruh}<circle cx="100" cy="100" r="68" fill="none" stroke="${gold}" stroke-width="1"/>${fl(52, 0)}${fl(148, 180)}${vnutro}</svg>`);
}
function ornament(c: string, flip: boolean) {
  const strana = (s: number) => `<g transform="scale(${s} 1)"><path d="M8 0 C30 -1 52 -9 74 -9 C92 -9 104 -2 112 6 C118 12 128 13 133 8 C138 3 135 -5 128 -5 C123 -5 121 0 125 2" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/><path d="M30 2 C48 8 66 10 82 6 C94 3 100 -6 96 -12 C93 -16 87 -14 88 -10" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round"/><path d="M58 -8 C62 -16 72 -18 76 -13" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="150" cy="0" rx="9" ry="1.6" fill="${c}"/></g>`;
  return url(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-170 -24 340 48"><g${flip ? ' transform="scale(1 -1)"' : ""}>${strana(1)}${strana(-1)}<path d="M0 -14 C5 -8 5 -3 0 3 C-5 -3 -5 -8 0 -14Z" fill="${c}"/><circle cx="0" cy="8" r="2.4" fill="${c}"/><path d="M-8 4 C-4 10 4 10 8 4" fill="none" stroke="${c}" stroke-width="1.3"/></g></svg>`);
}

// ---- 8 rozložení ----
type Farba = string | ((P: Paleta, d: DruhOznamu) => string);
interface Var { n: string; L: "s" | "v" | "h"; bg?: Farba; ink?: Farba; acc?: keyof Paleta; bd?: (P: Paleta, d: DruhOznamu) => string; ol?: (P: Paleta) => string; orn?: boolean; serif?: boolean; medal?: boolean; citat?: boolean; wm?: boolean; sw: number; fw?: number; fh?: number; fr?: string; fbd?: (P: Paleta) => string; pad?: string; ns: number; it?: boolean; up?: boolean }
export const VARIANTY: Var[] = [
  { n: "Ornament", L: "s", bg: () => "#F6EEDF", ink: () => "#3A2A1E", orn: true, serif: true, sw: 22, fw: 86, fh: 108, fr: "4px", fbd: () => "1px solid #B9A27A", pad: "70px 30px", ns: 34 },
  { n: "Klasika", L: "s", bd: (P) => `2px solid ${P.acc}`, ol: (P) => `1px solid ${P.acc}`, sw: 30, fw: 92, fh: 116, fr: "50%", ns: 28 },
  { n: "Medailón", L: "s", bg: () => "#FFFFFF", medal: true, sw: 150, fw: 74, fh: 92, fr: "4px", ns: 26 },
  { n: "Fotka vedľa", L: "v", bd: (P) => `1px solid ${P.soft}`, sw: 26, ns: 26 },
  { n: "Fotka hore", L: "h", sw: 26, ns: 26 },
  { n: "Tmavé", L: "s", bg: "dark", ink: "paper", acc: "soft", sw: 34, fw: 100, fh: 100, fr: "50%", fbd: (P) => `3px solid ${P.soft}`, ns: 28, it: true },
  { n: "Čierny okraj", L: "s", bg: () => "#FFFFFF", ink: () => "#14110B", bd: (P, d) => (d === "svadba" ? `10px solid ${P.acc}` : "14px solid #14110B"), sw: 30, fw: 92, fh: 116, fr: "4px", ns: 26, up: true },
  { n: "Citát", L: "s", bd: (P) => `6px double ${P.acc}`, citat: true, wm: true, sw: 0, fw: 96, fh: 96, fr: "50%", ns: 30, it: true },
];

/** Ornament potrebuje pätkové písmo a písané meno — načíta sa až keď sa šablóny ukážu */
function useFontyOrnamentu() {
  useEffect(() => {
    const id = "deed-fonty-ornament";
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500;1,700&family=Great+Vibes&display=swap";
    document.head.appendChild(l);
  }, []);
}

// ---- dátumy a vek ----
const DNES = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; };
const rozober = (x: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x || ""); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; };
const porovnaj = (a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }) => (a.y - b.y) || (a.m - b.m) || (a.d - b.d);
const skDatum = (o: { y: number; m: number; d: number }) => `${o.d}. ${o.m}. ${o.y}`;
export function vekOznamu(nar: string, umr: string): { roky: string; vek: string; umr: string; chyba: string; text: string } {
  const a = rozober(nar), b = rozober(umr);
  let vek = "", chyba = "";
  if (a && a.y < 1900) chyba = "Dátum narodenia nemôže byť pred rokom 1900.";
  else if (b && porovnaj(b, DNES()) > 0) chyba = "Dátum úmrtia nemôže byť v budúcnosti.";
  else if (a && b && porovnaj(a, b) > 0) chyba = "Dátum narodenia musí byť pred dátumom úmrtia.";
  else if (a && b) { let v = b.y - a.y; if (b.m < a.m || (b.m === a.m && b.d < a.d)) v--; if (v > 120) chyba = `Skontrolujte dátumy, vek vychádza ${v} rokov.`; else vek = String(v); }
  return { roky: !chyba && a && b ? `${a.y} – ${b.y}` : "", vek, umr: !chyba && b ? skDatum(b) : "", chyba,
    text: chyba || (vek ? `Vypočítané: vo veku ${vek} rokov` : a || b ? "Vek vypočítame, keď vyplníte oba dátumy." : "") };
}
const kedyText = (u: UdajeOznamu) => {
  const d = rozober(u.kedyD);
  return [[d ? skDatum(d) : "", u.kedyC ? `o ${u.kedyC}` : ""].filter(Boolean).join(" "), u.kde.trim()].filter(Boolean);
};
/** „náš milovaný manžel a otec" z vybraných rolí */
export function rolaText(u: UdajeOznamu): string {
  if (u.druh !== "parte" || u.zena == null) return "";
  const t = ROLY.filter((_, i) => u.roly.includes(i)).map(([m, z]) => (u.zena ? z : m));
  const sp = t.length > 1 ? `${t.slice(0, -1).join(", ")} a ${t[t.length - 1]}` : t[0] ?? "";
  return sp ? `${u.zena ? "naša milovaná" : "náš milovaný"} ${sp}` : "";
}

// ============================================================
// PLAGÁT — jedna šablóna (360 × 510, zmenší sa na šírku `sirka`)
// ============================================================
export function Plagat({ u, volba, vz, sirka = 360 }: { u: UdajeOznamu; volba: VolbaSablony; vz: Vzhlad; sirka?: number }) {
  useFontyOrnamentu();
  const V = VARIANTY[volba.v] ?? VARIANTY[0];
  const P = PAL[vz] ?? PAL.kronika;
  const d = u.druh, sv = d === "svadba", ine = d === "ine", pa = d === "parte";
  const z = !!u.zena;
  const col = (k: Farba | undefined, def: string) => (typeof k === "function" ? k(P, d) : k ? P[k as keyof Paleta] : def);
  const acc = V.acc ? P[V.acc] : P.acc, ink = col(V.ink, P.ink), bg = col(V.bg, P.paper);
  const mot = MOT[d].includes(volba.motiv) ? volba.motiv : MOT[d][0];
  const S = SYM[mot]; const pomer = S?.[1] ? S[2] / S[1] : 1;
  const sw = V.medal ? 150 : V.sw, sh = V.medal ? 150 : Math.round(sw * pomer);
  const maSym = V.medal || (sw > 0 && mot !== "bez");
  const v = vekOznamu(u.nar, u.umr);
  const kk = kedyText(u);
  const uvod = u.text.trim() || (ine ? "Prosíme vás o pomoc" : sv ? "S radosťou oznamujeme, že si povieme áno" : `S hlbokým žiaľom oznamujeme všetkým príbuzným, priateľom a známym, že nás navždy ${z ? "opustila" : "opustil"}`);
  const rola = pa ? rolaText(u) || (z ? "naša milovaná" : "náš milovaný") : "";
  const kedyT = ine ? (kk.length ? `Kedy: ${kk.join(", ")}` : "") : sv ? (kk.length ? `Sobáš bude ${kk.join("\n")}` : "Termín sobáša oznámime.")
    : kk.length ? `Posledná rozlúčka ${z ? "s našou drahou zosnulou" : "s naším drahým zosnulým"} bude\n${kk.join(", ")}` : "Termín rozlúčky oznámime.";
  const zaver = pa ? (bezVolby(u.zaver) ? "" : u.zaver) : sv ? "Ďakujeme, že budete s nami." : "";
  const kto = u.kto.trim();
  const ktoT = kto ? (sv ? `Pozývajú ${kto}` : ine ? `Oznamuje ${kto}` : kto) : pa ? "Smútiaca rodina" : "";
  const maCitat = (!bezVolby(u.citat) || !!V.citat) && !ine;
  const citat = !bezVolby(u.citat) ? u.citat : sv ? "„Láska je trpezlivá, láska je dobrotivá.“ (1 Kor 13, 4)" : "„Láska nikdy nezanikne.“ (1 Kor 13, 8)";
  const foto = u.foto ? `url('${u.foto}') center/cover no-repeat` : "repeating-linear-gradient(135deg,rgba(0,0,0,.09) 0 8px,rgba(0,0,0,.03) 8px 16px)";
  const flt = pa && volba.cb ? "grayscale(1)" : "none";
  const ff = V.serif ? "'Cormorant Garamond',Georgia,serif" : "'Plus Jakarta Sans',sans-serif";
  const meno = u.meno.trim() || (sv ? "Mená snúbencov" : ine ? "Meno príjemcu" : "Meno a priezvisko");
  const menoSt: CSSProperties = { fontSize: V.ns, lineHeight: 1.1, fontFamily: V.serif ? "'Great Vibes','Cormorant Garamond',serif" : "inherit", fontWeight: V.serif ? 400 : 800,
    fontStyle: V.it ? "italic" : "normal", textTransform: V.up ? "uppercase" : "none", letterSpacing: V.up ? ".06em" : "-.01em", opacity: u.meno.trim() ? 1 : 0.4, color: V.L === "s" && !V.it ? ink : acc };
  const symEl = maSym && <span style={{ position: "relative", flex: "none", width: sw, height: sh, background: V.medal ? medailon(mot, "#B08A3E", "#24201D") : symbol(mot, acc) }} />;
  const fotoEl = (st: CSSProperties) => volba.sFotkou && <span style={{ flex: "none", background: foto, filter: flt, boxSizing: "border-box", ...st }} />;
  const texty = (sym: boolean): ReactNode => <>
    <span style={{ position: "relative", fontSize: 10, fontWeight: 800, letterSpacing: ".14em", color: acc }}>{sv ? "SVADOBNÉ OZNÁMENIE" : "OZNÁMENIE"}</span>
    {maCitat && <span style={{ position: "relative", fontSize: 12.5, fontStyle: "italic", lineHeight: 1.45, opacity: 0.8, maxWidth: 260 }}>{citat}</span>}
    {sym && symEl}
  </>;
  const telo = <>
    <span style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.85, whiteSpace: "pre-line" }}>{uvod}</span>
    {rola && <span style={{ fontSize: 12.5, fontStyle: "italic", opacity: 0.9 }}>{rola}</span>}
    <b style={menoSt}>{meno}</b>
    {pa && z && u.rod.trim() && <span style={{ fontSize: 12.5, fontStyle: "italic" }}>rod. {u.rod.trim()}</span>}
    {pa && v.roky && <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em" }}>{v.roky}</span>}
    {pa && v.umr && <span style={{ fontSize: 12, opacity: 0.85 }}>{z ? "zomrela" : "zomrel"} dňa {v.umr}{v.vek ? ` vo veku ${v.vek} rokov` : ""}</span>}
    {kedyT && <span style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-line", paddingTop: 4 }}>{kedyT}</span>}
    {zaver && <span style={{ fontSize: 12.5, fontStyle: "italic", fontWeight: 700, color: acc }}>{zaver}</span>}
    {ktoT && <span style={{ fontSize: 11.5, opacity: 0.75 }}>{ktoT}</span>}
  </>;
  const k = sirka / 360;
  return (
    <span style={{ display: "block", width: sirka, height: Math.round(510 * k), overflow: "hidden", flex: "none" }}>
      <span style={{ display: "block", width: 360, height: 510, transform: `scale(${k})`, transformOrigin: "0 0" }}>
        <div role="img" aria-label={`${V.n} · ${meno}`} style={{ width: 360, height: 510, boxSizing: "border-box", position: "relative", overflow: "hidden", background: bg, color: ink, border: V.bd ? V.bd(P, d) : "none", fontFamily: ff, fontStyle: V.serif ? "italic" : "normal" }}>
          {V.ol && <span style={{ position: "absolute", inset: 10, border: V.ol(P), pointerEvents: "none" }} />}
          {V.wm && <span style={{ position: "absolute", left: "50%", top: "50%", width: 260, height: 260, margin: "-130px 0 0 -130px", background: symbol(mot, ink), opacity: 0.08, pointerEvents: "none" }} />}
          {V.orn && <>
            <span style={{ position: "absolute", left: 24, right: 24, top: 18, height: 46, background: ornament(acc, false), pointerEvents: "none" }} />
            <span style={{ position: "absolute", left: 24, right: 24, bottom: 18, height: 46, background: ornament(acc, true), pointerEvents: "none" }} />
          </>}
          {V.L === "s" && <div style={{ position: "relative", height: "100%", boxSizing: "border-box", padding: V.pad ?? "28px 26px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 7 }}>
            {texty(true)}{fotoEl({ width: V.fw ?? 90, height: V.fh ?? 112, borderRadius: V.fr ?? "4px", border: V.fbd ? V.fbd(P) : "none" })}{telo}
          </div>}
          {V.L === "v" && <div style={{ position: "relative", height: "100%", display: "flex" }}>
            {fotoEl({ width: "44%", height: "100%" })}
            <div style={{ flex: 1, minWidth: 0, padding: "26px 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 7, textAlign: "left" }}>{texty(true)}{telo}</div>
          </div>}
          {V.L === "h" && <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
            {fotoEl({ height: 210 })}
            <div style={{ flex: 1, padding: "16px 26px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center" }}>{texty(true)}{telo}</div>
          </div>}
        </div>
      </span>
    </span>);
}

// ============================================================
// VÝBER ŠABLÓNY — prepínače, motív, 8 náhľadov, veľký náhľad vybranej
// ============================================================
export function VyberSablony({ u, volba, onVolba, vz, mobil }: { u: UdajeOznamu; volba: VolbaSablony; onVolba: (v: VolbaSablony) => void; vz: Vzhlad; mobil?: boolean }) {
  const pa = u.druh === "parte";
  const seg = (moz: [string, boolean][], cur: boolean, set: (v: boolean) => void) => (
    <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 13, background: "var(--btn,#DCD8CF)" }}>
      {moz.map(([t, v]) => { const on = cur === v; return <button key={t} type="button" aria-pressed={on} onClick={() => set(v)} style={{ minHeight: 40, padding: "0 14px", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, background: on ? "var(--card,#fff)" : "transparent", color: on ? "var(--ink,#1D211B)" : "var(--ink3,#5B5D53)", boxShadow: "none" }}>{t}</button>; })}
    </div>);
  const mot = MOT[u.druh].includes(volba.motiv) ? volba.motiv : MOT[u.druh][0];
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {seg([["S fotkou", true], ["Bez fotky", false]], volba.sFotkou, (x) => onVolba({ ...volba, sFotkou: x }))}
        {pa && seg([["Čiernobielo", true], ["Farebne", false]], volba.cb, (x) => onVolba({ ...volba, cb: x }))}
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3,#5B5D53)" }}>MOTÍV</span>
          <select value={mot} onChange={(e) => onVolba({ ...volba, motiv: e.target.value })} style={{ height: 44, padding: "0 12px", borderRadius: 12, border: "1px solid var(--cardBd,#CFC9BC)", background: "var(--field,#fff)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 700, color: "var(--ink,#1D211B)" }}>
            {MOT[u.druh].map((k) => <option key={k} value={k}>{SYM[k][0]}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        <div role="radiogroup" aria-label="Šablóna" style={{ flex: "1 1 300px", display: "grid", gridTemplateColumns: "repeat(auto-fill,130px)", maxWidth: 590, gap: 10 }}>
          {VARIANTY.map((V, i) => { const on = i === volba.v; return (
            <button key={V.n} type="button" role="radio" aria-checked={on} onClick={() => onVolba({ ...volba, v: i })} style={{ padding: 0, border: `3px solid ${on ? "var(--green,#4E7D37)" : "transparent"}`, borderRadius: 10, background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, fontFamily: "inherit", boxShadow: "none" }}>
              <span style={{ display: "block", borderRadius: 6, overflow: "hidden" }}><Plagat u={u} volba={{ ...volba, v: i }} vz={vz} sirka={124} /></span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink,#1D211B)", padding: "0 4px 4px" }}>{V.n}</span>
            </button>); })}
        </div>
        <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3,#5B5D53)" }}>NÁHĽAD · {VARIANTY[volba.v]?.n.toLocaleUpperCase("sk-SK")}</span>
          <span style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 24px rgba(30,28,20,.16)" }}><Plagat u={u} volba={volba} vz={vz} sirka={mobil ? 300 : 360} /></span>
        </div>
      </div>
      <span style={{ fontSize: 13, color: "var(--ink3,#5B5D53)" }}>Farby ladia so vzhľadom vášho profilu ({PAL[vz]?.n ?? "Kronika"}). Text sa berie z polí vyššie.</span>
    </section>);
}

// ============================================================
// FORMULÁR — polia podľa druhu (parte / svadba / iné)
// ============================================================
const lab: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3,#5B5D53)" };
const pole: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd,#CFC9BC)", background: "var(--field,#fff)", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "var(--ink,#1D211B)", outline: "none", width: "100%", boxSizing: "border-box" };
const pozn: CSSProperties = { fontSize: 13, lineHeight: 1.45, color: "var(--ink3,#5B5D53)" };
const TEXTY: Record<DruhOznamu, { meno: string; phMeno: string; kedy: string; phKde: string; phKto: string; foto: string; cb: boolean }> = {
  parte: { meno: "MENO A PRIEZVISKO ZOSNULÉHO", phMeno: "Meno a priezvisko zosnulého", kedy: "ROZLÚČKA · KEDY (NEPOVINNÉ)", phKde: "napr. kostol, dom smútku", phKto: "napr. syn s rodinou", foto: "Fotka zosnulého", cb: true },
  svadba: { meno: "MENÁ SNÚBENCOV", phMeno: "Mená snúbencov", kedy: "SOBÁŠ · KEDY (NEPOVINNÉ)", phKde: "napr. farský kostol", phKto: "napr. snúbenci a rodičia", foto: "Fotka snúbencov", cb: false },
  ine: { meno: "MENO PRÍJEMCU", phMeno: "Meno príjemcu", kedy: "KEDY (NEPOVINNÉ)", phKde: "miesto", phKto: "kto oznamuje", foto: "Fotka", cb: false } };
/** chyba formulára (null = dá sa zverejniť) */
export function chybaOznamu(u: UdajeOznamu): string | null {
  if (!u.meno.trim()) return "Doplňte meno.";
  if (u.druh === "parte" && u.zena == null) return "Vyberte Muž alebo Žena.";
  const v = vekOznamu(u.nar, u.umr);
  if (v.chyba) return v.chyba;
  return null;
}

export function FormularOznamu({ u, onU, mobil, bezFotky, upozornenie = true }: { u: UdajeOznamu; onU: (u: UdajeOznamu) => void; mobil?: boolean; /** vlastné parte ako obrázok — fotka do šablóny netreba */ bezFotky?: boolean; /** OPRAVY 169: v Oznamoch (bez zbierky) bez vety o upozornení sledujúcich */ upozornenie?: boolean }) {
  const T = TEXTY[u.druh];
  const pa = u.druh === "parte";
  const zmen = (p: Partial<UdajeOznamu>) => onU({ ...u, ...p });
  const txt = (k: "meno" | "rod" | "kde" | "kto", t: string, ph: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={lab}>{t}</span><input value={u[k]} onChange={(e) => zmen({ [k]: e.target.value })} placeholder={ph} style={pole} /></label>);
  const dva = (a: ReactNode, b: ReactNode) => <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 10 }}>{a}{b}</div>;
  const dnes = new Date().toISOString().slice(0, 10);
  const v = vekOznamu(u.nar, u.umr);
  const [fotoKey, setFotoKey] = useState(0);
  const nacitaj = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => zmen({ foto: String(r.result ?? "") }); r.readAsDataURL(f); setFotoKey((x) => x + 1); };
  const rola = rolaText(u);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      {!bezFotky && <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <span style={{ flex: "none", width: 64, height: 64, borderRadius: 12, background: u.foto ? `url('${u.foto}') center/cover no-repeat var(--field,#fff)` : "var(--field,#fff)", border: "1px solid var(--cardBd,#CFC9BC)", filter: T.cb ? "grayscale(1)" : undefined }} />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{T.foto}</b><span style={{ fontSize: 12.5, color: "var(--ink3,#5B5D53)" }}>nepovinná{T.cb ? ", ukáže sa čiernobielo" : ""}</span><span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--green,#4E7D37)" }}>{u.foto ? "Zmeniť fotku" : "Pridať fotku"}</span></span>
        <input key={fotoKey} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => nacitaj(e.target.files?.[0])} />
      </label>}
      {txt("meno", T.meno, T.phMeno)}
      {pa && <>
        <span style={lab}>ZOSNULÝ JE</span>
        <div role="radiogroup" aria-label="Zosnulý je" style={{ display: "flex", gap: 8 }}>
          {([["Muž", false], ["Žena", true]] as [string, boolean][]).map(([t, z]) => { const on = u.zena === z; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => zmen({ zena: z, rod: z ? u.rod : "" })} style={{ flex: 1, height: 48, borderRadius: 12, border: `${on ? 2 : 1}px solid ${on ? "var(--green,#4E7D37)" : "var(--cardBd,#CFC9BC)"}`, background: on ? "var(--gSoft,#E3EBD8)" : "var(--field,#fff)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: on ? "var(--gInk,#2F5E1F)" : "var(--ink,#1D211B)", boxShadow: "none" }}>{t}</button>); })}
        </div>
        <span style={pozn}>Podľa toho sa upravia texty na parte (opustil / opustila, manžel / manželka).</span>
        {dva(
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lab}>DÁTUM NARODENIA</span><input type="date" min="1900-01-01" max={dnes} value={u.nar} onChange={(e) => zmen({ nar: e.target.value })} style={pole} /></label>,
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lab}>DÁTUM ÚMRTIA</span><input type="date" min="1900-01-01" max={dnes} value={u.umr} onChange={(e) => zmen({ umr: e.target.value })} style={pole} /></label>)}
        {v.text && <span role={v.chyba ? "alert" : undefined} style={{ fontSize: 13.5, fontWeight: 700, color: v.chyba ? "#A34A2A" : "var(--gInk,#2F5E1F)" }}>{v.text}</span>}
        {u.zena === true && txt("rod", "RODENÁ (NEPOVINNÉ)", "rodné priezvisko")}
      </>}
      {dva(
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lab}>{T.kedy}</span>
          <span style={{ display: "flex", gap: 8 }}><input type="date" value={u.kedyD} onChange={(e) => zmen({ kedyD: e.target.value })} style={{ ...pole, flex: 1.4 }} aria-label="Dátum" /><CasPole value={u.kedyC} onCommit={(v) => zmen({ kedyC: v })} placeholder="14:00" label="Čas" style={{ ...pole, flex: 1, minWidth: 0 }} /></span></label>,
        txt("kde", "KDE (NEPOVINNÉ)", T.phKde))}
      <span style={pozn}>Ak termín ešte neviete, nechajte prázdne a doplňte neskôr.{upozornenie ? " Sledujúci dostanú upozornenie." : ""}</span>
      {pa && <>
        <span style={lab}>KÝM BOL / BOLA · ŤUKNITE, ČO PLATÍ</span>
        {u.zena == null ? <span style={pozn}>Najprv vyberte vyššie: Muž alebo Žena.</span> : <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ROLY.map(([m, z], i) => { const on = u.roly.includes(i); return (
              <button key={m} type="button" aria-pressed={on} onClick={() => zmen({ roly: on ? u.roly.filter((x) => x !== i) : [...u.roly, i] })} style={{ height: 44, padding: "0 14px", borderRadius: 22, border: `${on ? 2 : 1}px solid ${on ? "var(--green,#4E7D37)" : "var(--cardBd,#CFC9BC)"}`, background: on ? "var(--gSoft,#E3EBD8)" : "var(--field,#fff)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: on ? "var(--gInk,#2F5E1F)" : "var(--ink,#1D211B)", boxShadow: "none" }}>{u.zena ? z : m}</button>); })}
          </div>
          <span style={pozn}>{rola ? `Na parte bude: „${rola}“` : "Zatiaľ nič nevybrané. Ťuknite na jedno alebo viac slov vyššie, napríklad manželka a mama."}</span>
        </>}
        {dva(
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lab}>POSLEDNÁ VETA</span><select value={u.zaver} onChange={(e) => zmen({ zaver: e.target.value })} style={pole}>{ZAVERY.map((z) => <option key={z}>{z}</option>)}</select></label>,
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lab}>CITÁT HORE (NEPOVINNÝ)</span><select value={u.citat} onChange={(e) => zmen({ citat: e.target.value })} style={pole}>{CITATY.map((c) => <option key={c}>{c}</option>)}</select></label>)}
      </>}
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lab}>TEXT OZNÁMENIA (NEPOVINNÉ)</span>
        <textarea value={u.text} onChange={(e) => zmen({ text: e.target.value })} rows={3} style={{ ...pole, height: "auto", padding: "10px 14px", resize: "vertical" }} /></label>
      <span style={{ ...pozn, marginTop: -6 }}>Keď necháte prázdne, použije sa veta zo šablóny.</span>
      {txt("kto", u.druh === "svadba" ? "POZÝVAJÚ" : "OZNAMUJE", T.phKto)}
    </div>);
}

/** popis do feedu / zoznamu z údajov oznámenia */
export function popisOznamu(u: UdajeOznamu): string {
  const v = vekOznamu(u.nar, u.umr);
  const kk = kedyText(u);
  return [u.meno.trim() + (v.vek ? ` (†${v.vek})` : ""), kk.length ? `${u.druh === "parte" ? "rozlúčka" : u.druh === "svadba" ? "sobáš" : "kedy"} ${kk.join(", ")}` : ""].filter(Boolean).join(" · ");
}
