// ============================================================
// OPRAVY 502 (balík 44) · pozvánka do Správy cez QR a odkaz — jedna pre farnosť aj charitu.
// Platí 48 h (server 0125 kontroluje „dos“). V zozname „čaká · platí ešte 31 h“, po 48 h „Pozvánka vypršala“ + Poslať znova
// (nová pozvánka s tou istou rolou a právami, starý odkaz prestane platiť — mení sa id).
// Pozvánka e-mailom nevyprší (server ju drží, kým ju človek neprijme alebo neodmietne), preto pri nej čas nie je.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { QrNaUkazanie } from "@/components/qrNaUkazanie";
import { citajNastavenie, maNastavenie, zapisNastavenie, obnovKluc, useZmenyNastaveni } from "@/lib/nastaveniaStranky";
import { odkazNaMieste, oknoNaMieste, tokenNaMieste, noveTajne } from "@/lib/pozvankaSpravy";
import { zdielaj, kopiruj } from "@/lib/zdielanie";

export const POZVANKA_MS = 48 * 3600e3;
const ZELENA = "#4B7A35", CERV = "#A34A2A";

/** nová pozvánka cez odkaz: id (= posledná časť odkazu), dokedy platí (ms) a text „23. 10. o 14:05“ */
export function novaPozvanka(): { id: number; dos: number; doT: string } {
  const id = Date.now(), dt = new Date(id + POZVANKA_MS);
  return { id, dos: dt.getTime(), doT: `${dt.getDate()}. ${dt.getMonth() + 1}. o ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}` };
}

/** stav pozvaného v zozname: text štítka, či je zlý (červený) a či pozvánka vypršala */
export function stavPozvanky(caka: unknown, dos?: number, teraz = Date.now()): { t: string; zly: boolean; vyprsala: boolean } | null {
  if (caka === "odmietol") return { t: "Odmietol", zly: true, vyprsala: false };
  if (caka === "odkaz") {
    if (!dos) return { t: "Pozvaný · pozvánka cez QR", zly: false, vyprsala: false };
    if (dos <= teraz) return { t: "Pozvánka vypršala", zly: true, vyprsala: true };
    const h = Math.min(48, Math.round((dos - teraz) / 3600e3));
    return { t: h >= 1 ? `čaká · platí ešte ${h} h` : "čaká · platí ešte necelú hodinu", zly: false, vyprsala: false };
  }
  if (caka === true) return { t: "Pozvaný · čaká", zly: false, vyprsala: false };
  if (caka === "miesto") return { t: "QR na mieste · neprijal", zly: true, vyprsala: false }; // OPRAVY 524: správca odišiel skôr, než prijal
  return null;
}

/** prekreslí sa raz za minútu (odpočet „platí ešte … h“) */
export function useMinuta(): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => { const i = window.setInterval(() => setT(Date.now()), 60_000); return () => window.clearInterval(i); }, []);
  return t;
}

const plne: CSSProperties = { minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: ZELENA, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800 };
const obrys: CSSProperties = { minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" };
const kick: CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" };

/** QR + odkaz, „Takto príde správa“, Zdieľať · Kopírovať (→ Skopírované ✓) · Zrušiť */
export function KartaPozvanky({ odkaz, rola, doT, sprava, onZrus }: { odkaz: string; rola: string; doT: string; sprava: string; onZrus: () => void }) {
  const [skop, setSkop] = useState(false);
  useEffect(() => { if (!skop) return; const t = window.setTimeout(() => setSkop(false), 2500); return () => window.clearTimeout(t); }, [skop]);
  return (
    <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <QrNaUkazanie qr={{ data: odkaz }} size={112} popis={`Pozvánka do správy stránky · ${rola}`} ram={{ border: "1px solid var(--cardBd)", overflow: "hidden" }} />
        <span style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 15.5 }}>Pozvánka · {rola}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Platí do {doT}. Naskenuje QR alebo ťukne na odkaz.</span></span>
      </div>
      <span style={kick}>TAKTO PRÍDE SPRÁVA</span>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, padding: "10px 12px", borderRadius: 12, background: "var(--field)", overflowWrap: "anywhere" }}>{sprava}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void zdielaj({ titul: "Pozvánka do správy stránky", text: sprava, url: odkaz })} style={plne}>Zdieľať pozvánku</button>
        <button type="button" onClick={() => void kopiruj(odkaz).then((ok) => setSkop(ok))} aria-live="polite" style={{ ...obrys, minHeight: 52, ...(skop ? { borderColor: ZELENA, color: ZELENA } : {}) }}>{skop ? "Skopírované ✓" : "Kopírovať odkaz"}</button>
      </div>
      <button type="button" onClick={onZrus} style={{ ...obrys, alignSelf: "flex-start", color: CERV }}>Zrušiť pozvánku</button>
    </div>);
}

/** „Ako to prebieha“ — očíslované kroky */
export function AkoPrebieha({ nadpis, kroky }: { nadpis: string; kroky: [string, string][] }) {
  return (<>
    <span style={kick}>{nadpis}</span>
    <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "0 14px" }}>
      {kroky.map(([t, s], i) => <div key={t} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
        <span style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{i + 1}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{t}</b><span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{s}</span></span>
      </div>)}
    </div>
  </>);
}

// ============================================================
// OPRAVY 524 (balík 49) · „Je pri vás“ — QR na mieste, mení sa každých 15 s (server 0167).
// Pracovník ho naskenuje v DEED+, uvidí „{organizácia} vás pridáva do Správy“ a podrží Prijať. Tu sa hneď ukáže „{meno} je v Správe ✓“.
// Na e-mail nechodí nič. QR relácia platí 10 minút, potom „Ukázať nový QR“. Kým neprijme, nemá žiadne práva.
// Riadok v „ludia“ vzniká pri otvorení a zmizne, keď správca odíde a pracovník neprijal.
// ============================================================
export type ZakladNaMieste = { r: string; p?: string; prava?: string[] };
type RiadokNaMieste = { id: number; k?: string; m?: string; caka?: unknown };
const NA_MIESTE_MS = 10 * 60e3;

export function NaMiesteQr({ strankaId, zaklad, od, uspechPod, mobil, onId }: { strankaId: string; zaklad: ZakladNaMieste; od: { meno: string; f: string };
  /** druhý riadok pri „{meno} je v Správe ✓“ */ uspechPod: string; mobil: boolean; onId?: (id: number) => void }) {
  useZmenyNastaveni();
  const [id] = useState(() => Date.now());
  const [tajne, setTajne] = useState(noveTajne);
  const [dos, setDos] = useState(() => Date.now() + NA_MIESTE_MS);
  const [tik, setTik] = useState(() => Date.now());
  const [tok, setTok] = useState<{ okno: number; t: string } | null>(null);
  const ludia = () => (maNastavenie("ludia") ? citajNastavenie("ludia") : []) as RiadokNaMieste[];
  const zakladRef = useRef(zaklad); zakladRef.current = zaklad;
  const odRef = useRef(od); odRef.current = od;
  // riadok pozvánky: pri otvorení a pri novom QR (nové tajomstvo zruší aj viazanie na skôr naskenovaný účet)
  useEffect(() => {
    const z = zakladRef.current, l = ludia();
    const zaz = { id, n: "", k: "", r: z.r, ...(z.p ? { p: z.p } : {}), ...(z.prava ? { prava: z.prava } : {}), caka: "miesto", tajne, dos, od: odRef.current };
    zapisNastavenie("ludia", l.some((x) => x.id === id) ? l.map((x) => (x.id === id ? zaz : x)) : [...l, zaz]);
  }, [tajne, dos]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onId?.(id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // odchod bez prijatia → riadok preč
  useEffect(() => () => { const l = ludia(), e = l.find((x) => x.id === id); if (e && e.caka !== false) zapisNastavenie("ludia", l.filter((x) => x.id !== id)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const e = ludia().find((x) => x.id === id);
  const prijal = !!e && e.caka === false, odmietol = e?.caka === "odmietol", naskenoval = e?.caka === "miesto" && (e.k ?? "").includes("@");
  const vyprsal = !prijal && !odmietol && tik > dos;
  // hodiny (odpočet 15 s) a token aktuálneho okna
  useEffect(() => { if (prijal || odmietol) return; const i = window.setInterval(() => setTik(Date.now()), 1000); return () => window.clearInterval(i); }, [prijal, odmietol]);
  const okno = oknoNaMieste(tik);
  useEffect(() => { let ziva = true; if (prijal || odmietol || vyprsal) return; void tokenNaMieste(tajne, okno).then((t) => { if (ziva) setTok({ okno, t }); }).catch(() => undefined); return () => { ziva = false; }; }, [tajne, okno, prijal, odmietol, vyprsal]);
  // pracovník mohol medzitým naskenovať alebo prijať — zoznam znova zo servera
  useEffect(() => { if (prijal || odmietol || vyprsal) return; const i = window.setInterval(() => { void obnovKluc("ludia"); }, 2500); return () => window.clearInterval(i); }, [prijal, odmietol, vyprsal]);
  const zost = 15 - Math.floor((tik / 1000) % 15);
  const novy = () => { setTajne(noveTajne()); setDos(Date.now() + NA_MIESTE_MS); setTok(null); };
  if (prijal) return (
    <div role="status" style={{ display: "flex", flexDirection: "column", gap: 4, padding: 16, borderRadius: 14, background: "var(--gSoft)", border: `2px solid ${ZELENA}` }}>
      <b style={{ fontSize: 17, color: "var(--gInk)" }}>{e?.m || "Pracovník"} je v Správe ✓</b>
      <span style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink2)" }}>{uspechPod}</span>
    </div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: mobil ? "wrap" : "nowrap", padding: 16, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        <span style={{ width: 180, height: 180, flex: "none", borderRadius: 14, background: "#fff", padding: 6, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", opacity: vyprsal || odmietol ? .25 : 1 }}>
          {tok && tok.okno === okno && !vyprsal && !odmietol ? <QrNaUkazanie qr={{ data: odkazNaMieste(strankaId, id, tok.t) }} size={168} popis="QR na pridanie do Správy · mení sa každých 15 s" rotacia={{ sek: zost, perioda: 15 }} />
            : <span style={{ fontSize: 13, color: "#6B655A" }}>{vyprsal || odmietol ? "" : "Pripravujem QR…"}</span>}
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          {odmietol ? <><b style={{ fontSize: 17 }}>{e?.m || "Pracovník"} pozvánku odmietol</b>
            <button type="button" onClick={novy} style={{ ...plne, alignSelf: "flex-start" }}>Ukázať nový QR</button></>
          : vyprsal ? <><b style={{ fontSize: 17 }}>QR vypršal</b><span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>Platil 10 minút. Ukážte nový.</span>
            <button type="button" onClick={novy} style={{ ...plne, alignSelf: "flex-start" }}>Ukázať nový QR</button></>
          : naskenoval ? <><b style={{ fontSize: 17 }}>{e?.m || "Pracovník"} naskenoval QR</b><span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>Čaká sa, kým na mobile podrží Prijať.</span></>
          : <><b style={{ fontSize: 17 }}>Nech naskenuje tento QR</b>
            <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>Mobilom, v ktorom je prihlásený v DEED+. Potvrdí podržaním a hneď je v Správe.</span>
            <span aria-live="off" style={{ fontSize: 14, fontWeight: 800, color: "var(--gold, #8A6A1C)", fontVariantNumeric: "tabular-nums" }}>Platí ešte 0:{String(zost).padStart(2, "0")} · obnoví sa sám</span></>}
        </span>
      </div>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>QR sa mení každých 15 s, aby ho nikto neodfotil a nepoužil neskôr. Na e-mail nechodí nič.</span>
    </div>);
}
