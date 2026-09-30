// KARTA 24 · 2g Jazyk · 2h Stiahnuť moje údaje — obrazovky sprava z Nastavení (OPRAVY 39). Zamestnávateľ je v profile (Zamestnavatel.tsx).
import { sZnackou } from "@/components/DeedZnacka";
import { useT } from "@/i18n";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { usePouzivatel } from "@/lib/pouzivatel";
import { Harok } from "@/features/zbierka/Zdielat";
import { toast } from "@/components/toast";
import { ObrazovkaSprava } from "./Bezpecnost24";
import { NastKarta, IK, oddelovac } from "./nastUi";

export const lbl = { margin: 0, padding: "0 6px 8px", fontSize: 12.5, fontWeight: 800, letterSpacing: ".07em", color: "var(--d-ink3, var(--ink3))" } as const;
export const pozn = { fontSize: 12.5, lineHeight: 1.5, color: "var(--d-ink3, var(--ink3))", padding: "0 6px" } as const;
export const Ik = ({ d, s = 18, w = 2.2, c = "currentColor" }: { d: string; s?: number; w?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d={d} /></svg>;
const Radio = ({ on }: { on: boolean }) => <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", border: `2px solid ${on ? "var(--green)" : "var(--chkBd)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0, transition: "opacity .15s ease" }} /></span>;
const Check = ({ on }: { on: boolean }) => <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 7, flex: "none", border: `2px solid ${on ? "var(--green)" : "var(--chkBd)"}`, background: on ? "var(--green)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <Ik d={IK.check} s={14} w={3} />}</span>;
export const hladPole = (v: string, set: (s: string) => void, ph: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, height: 50, padding: "0 14px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)" }}>
    <Ik d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5" c="var(--d-ink3, var(--ink3))" />
    <input value={v} onChange={(e) => set(e.target.value)} placeholder={ph} aria-label={ph} style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontSize: 16, color: "var(--d-ink, var(--ink))", fontFamily: "inherit" }} />
  </div>);
export const btn = (hlavne: boolean, zap = true) => ({ minHeight: 52, borderRadius: 16, border: hlavne ? "none" : "1px solid var(--d-cardBd, var(--cardBd))", boxShadow: "none", background: hlavne ? "var(--gGrad)" : "var(--btn)", color: hlavne ? "#fff" : "var(--d-ink, var(--ink))", fontSize: 15.5, fontWeight: 800, fontFamily: "inherit", cursor: zap ? "pointer" : "default", opacity: zap ? 1 : 0.45, transition: "opacity .2s ease" }) as const;
export const bezDiakritiky = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ======================= 2g · JAZYK =======================
/** svetové jazyky a úradné jazyky krajín, kde DEED bude (menšinové nie) · názov vo vlastnom jazyku + po slovensky */
const JAZYKY: [string, string][] = [
  ["Slovenčina", "sk"], ["Čeština", "cs"], ["English", "en"],
  ["Deutsch", "de"], ["Español", "es"], ["Français", "fr"], ["Italiano", "it"],
  ["Magyar", "hu"], ["Polski", "pl"], ["Română", "ro"], ["Українська", "uk"],
  ["Hrvatski", "hr"], ["Slovenščina", "sl"], ["Português", "pt"], ["Nederlands", "nl"],
  ["Türkçe", "tr"], ["العربية", "ar"], ["中文", "zh"], ["日本語", "ja"], ["हिन्दी", "hi"],
];
/** OPRAVY 74 · „Jazyk" v aktuálnom jazyku (anglické „Language" sa pridáva vždy) a text lišty po zmene */
const SLOVO: Record<string, string> = { Slovenčina: "Jazyk", Čeština: "Jazyk", English: "Language", Deutsch: "Sprache", Español: "Idioma", Français: "Langue", Italiano: "Lingua", Magyar: "Nyelv", Polski: "Język", Română: "Limbă", Українська: "Мова", Hrvatski: "Jezik", Slovenščina: "Jezik", Português: "Idioma", Nederlands: "Taal", Türkçe: "Dil", "العربية": "اللغة", "中文": "语言", "日本語": "言語", "हिन्दी": "भाषा" };
const LISTA: Record<string, [string, string]> = { Slovenčina: ["Jazyk zmenený.", "Späť na "], Čeština: ["Jazyk změněn.", "Zpět na "], English: ["Language changed.", "Back to "], Deutsch: ["Sprache geändert.", "Zurück zu "] };
export function JazykNazov({ jazyk }: { jazyk: string }) {
  const w = SLOVO[jazyk] ?? "Language";
  return <>{w}{w !== "Language" && <span lang="en" style={{ fontWeight: 600, color: "var(--d-ink3, var(--ink3))" }}> · Language</span>}</>;
}
// lišta „Jazyk zmenený · Späť na …" 10 s po zmene (žije mimo obrazovky Jazyk, tá sa po výbere zavrie)
let zmena: { novy: string; povodny: string; id: number } | null = null;
let verZ = 0; const poslZ = new Set<() => void>();
const ohlas = () => { verZ++; poslZ.forEach((f) => f()); };
function zmenJazyk(novy: string, povodny: string) {
  if (novy === povodny) return;
  zmenNastavenia({ jazyk: novy });
  const id = Date.now(); zmena = { novy, povodny, id }; ohlas();
  window.setTimeout(() => { if (zmena?.id === id) { zmena = null; ohlas(); } }, 10000);
}
export function JazykLista() {
  useSyncExternalStore((f) => { poslZ.add(f); return () => poslZ.delete(f); }, () => verZ, () => 0);
  if (!zmena) return null;
  const z = zmena, [t, b] = LISTA[z.novy] ?? LISTA.English;
  return createPortal(
    <div role="status" aria-live="polite" className="pf-rise" lang={JAZYKY.find((j) => j[0] === z.novy)?.[1]}
      style={{ position: "fixed", left: 16, right: 16, bottom: "calc(26px + env(safe-area-inset-bottom))", zIndex: 400, maxWidth: 520, margin: "0 auto", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: "#1D211B", color: "#F1ECE1", boxShadow: "0 10px 30px rgba(0,0,0,.3)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{t}</span>
      <button type="button" onClick={() => { zmenNastavenia({ jazyk: z.povodny }); zmena = null; ohlas(); }}
        style={{ flex: "none", whiteSpace: "nowrap", minHeight: 44, padding: "0 12px", borderRadius: 11, border: "none", boxShadow: "none", background: "#F1ECE1", color: "#1D211B", fontSize: 13.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>{b}{z.povodny}</button>
    </div>, document.body);
}
const NAVRH = ["sk", "cs", "en"]; // krajiny, kde DEED beží

export function JazykObrazovka({ onBack }: { onBack: () => void }) {
  const t = useT();
  const n = useNastaveniaAppky();
  const [q, setQ] = useState("");
  const [zavri, setZavri] = useState(0);
  const telefon = (typeof navigator !== "undefined" ? navigator.language : "sk").slice(0, 2);
  const navrh = [telefon, ...NAVRH.filter((k) => k !== telefon)].filter((k) => JAZYKY.some((j) => j[1] === k));
  const qq = bezDiakritiky(q.trim());
  const sedi = (j: [string, string]) => !qq || bezDiakritiky(j[0]).includes(qq) || bezDiakritiky(t(`jazyk.n.${j[1]}`)).includes(qq);
  const skupiny: [string, [string, string][]][] = [
    [t("jazyk.navrhovane"), navrh.map((k) => JAZYKY.find((j) => j[1] === k)!).filter(sedi)],
    [t("jazyk.vsetky"), JAZYKY.filter((j) => !navrh.includes(j[1])).filter(sedi)],
  ];
  const vyber = (nazov: string) => { zmenJazyk(nazov, n.jazyk); setZavri((x) => x + 1); };
  const en = n.jazyk === "English";
  return (
    <ObrazovkaSprava titul={<JazykNazov jazyk={n.jazyk} />} aria={t("jazyk.aria")} onBack={onBack} zavriet={zavri}>
      {/* pevné English — nikdy sa neprekladá (záchrana, keď niekto omylom zmení jazyk) */}
      <div lang="en" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button type="button" role="radio" aria-checked={en} onClick={() => vyber("English")}
          style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 14px", borderRadius: 16, cursor: "pointer", textAlign: "left", fontFamily: "inherit", boxShadow: "none", background: en ? "var(--gSoft)" : "var(--d-card, var(--card))", border: `1.5px solid ${en ? "var(--gBd)" : "var(--bBd)"}`, color: "var(--d-ink, var(--ink))" }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: "var(--bSoft)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 13, fontWeight: 800 }}>EN</span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>English</span><span style={{ display: "block", fontSize: 12.5, color: "var(--d-ink3, var(--ink3))" }}>Lost in another language? Tap here.</span></span>
          <Radio on={en} /></button>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--d-ink3, var(--ink3))", padding: "0 2px" }}>This line always stays in English.</div>
      </div>
      {hladPole(q, setQ, t("jazyk.hladat"))}
      {skupiny.map(([h, l]) => l.length > 0 && (
        <div key={h}>
          <h2 style={lbl}>{h}</h2>
          <NastKarta k="b">
            <div role="radiogroup" aria-label={h}>
              {l.map(([nazov, kod], i) => { const on = n.jazyk === nazov; return (
                <button key={kod} type="button" role="radio" aria-checked={on} onClick={() => vyber(nazov)} lang={kod}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "10px 18px", border: "none", borderTop: i ? oddelovac : "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{nazov}</span><span lang={t.jazyk} style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))" }}>{kod === telefon ? t("jazyk.telefonu") : t(`jazyk.n.${kod}`)}</span></span>
                  <Radio on={on} /></button>); })}
            </div>
          </NastKarta>
        </div>))}
      {skupiny.every(([, l]) => !l.length) && <div style={pozn}>{t("jazyk.nemame")}</div>}
      <div style={pozn}>{t("jazyk.pozn")}</div>
    </ObrazovkaSprava>
  );
}
// ======================= 2h · STIAHNUŤ MOJE ÚDAJE =======================
const CO: [string, string[]][] = [
  ["pr", ["deed.ja", "deed.profil", "deed.nastavenia", "deed.zaujmy"]],
  ["sk", ["deed.skutky", "deed.moje", "deed.koncept"]],
  ["da", ["deed.dary", "deed.zbierk", "deed.oblub", "deed.pravid"]],
  ["pe", ["deed.penaz", "deed.wallet", "deed.karty"]],
  ["sp", ["deed.spravy", "deed.koment"]],
  ["su", ["deed.zariad", "deed.blok"]],
];

export function StiahnutUdajeObrazovka({ onBack, z }: { onBack: () => void; /** nad hárkom (Zrušiť účet) */ z?: number }) {
  const t = useT();
  const ja = usePouzivatel();
  const [v, setV] = useState<Record<string, boolean>>(() => Object.fromEntries(CO.map(([k]) => [k, true])));
  const [format, setFormat] = useState<"pdf" | "zip">("pdf");
  const [stav, setStav] = useState<null | "overenie" | "priprava" | "hotovo">(null);
  const [pct, setPct] = useState(0);
  const tik = useRef<number | undefined>(undefined);
  const nieco = Object.values(v).some(Boolean);
  useEffect(() => () => window.clearInterval(tik.current), []);

  const pripravuj = () => {
    setStav("priprava"); setPct(0);
    window.clearInterval(tik.current);
    tik.current = window.setInterval(() => setPct((p) => { const x = Math.min(100, p + 9); if (x >= 100) { window.clearInterval(tik.current); setStav("hotovo"); } return x; }), 350);
  };
  const subor = format === "pdf" ? t("udaje.suborPdf") : t("udaje.suborZip");
  // pilot: súbor skladá appka z údajov v tomto zariadení (JSON); PDF a ZIP pripraví server
  const stiahni = () => {
    const kluce = CO.filter(([k]) => v[k]).flatMap(([, p]) => p);
    const data: Record<string, unknown> = { vytvorene: new Date().toISOString(), meno: ja.celeMeno, obsah: CO.filter(([k]) => v[k]).map(([k]) => t(`udaje.co.${k}`)) };
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (kluce.some((p) => k.startsWith(p))) { const x = localStorage.getItem(k); try { data[k] = JSON.parse(x ?? "null"); } catch { data[k] = x; } } } } catch { /* LS */ }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = t("udaje.suborJson"); a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(t("udaje.stiahnute"));
  };

  return (
    <ObrazovkaSprava titul={t("nastavenia.udaje")} onBack={onBack} z={z}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))", padding: "0 6px" }}>{sZnackou(t("udaje.uvod"))}</div>
      {stav === null || stav === "overenie" ? <>
        <div>
          <h2 style={lbl}>{t("udaje.coStiahnut")}</h2>
          <NastKarta k="b">
            {CO.map(([k], i) => (
              <button key={k} type="button" role="checkbox" aria-checked={v[k]} onClick={() => setV((x) => ({ ...x, [k]: !x[k] }))}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "10px 18px", border: "none", borderTop: i ? oddelovac : "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
                <Check on={v[k]} />
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{t(`udaje.co.${k}`)}</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))" }}>{t(`udaje.co.${k}.s`)}</span></span>
              </button>))}
          </NastKarta>
        </div>
        <div>
          <h2 style={lbl} id="format-nadpis">{t("udaje.format")}</h2>
          <div role="radiogroup" aria-labelledby="format-nadpis" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
            {([["pdf", "PDF", t("udaje.pdfS")], ["zip", "ZIP", t("udaje.zipS")]] as const).map(([k, f, s]) => (
              <button key={k} type="button" role="radio" aria-checked={format === k} onClick={() => setFormat(k)} className={format === k ? "seg-on" : undefined}
                style={{ minHeight: 56, padding: "6px 8px", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.25, ...(format === k ? {} : { background: "transparent", color: "var(--d-ink3, var(--ink3))", boxShadow: "none" }) }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{f}</span><span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{s}</span></button>))}
          </div>
        </div>
        <button type="button" disabled={!nieco} onClick={() => setStav("overenie")} style={btn(true, nieco)}>{t("udaje.pripravit")}</button>
        <div style={pozn}>{t("udaje.pozn")}</div>
      </> : stav === "priprava" ? (
        <NastKarta k="b" style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><b style={{ fontSize: 16.5 }}>{t("udaje.pripravujeme")}</b><span aria-live="polite" style={{ fontSize: 14, fontWeight: 800, color: "var(--sek-b)", fontVariantNumeric: "tabular-nums" }}>{t("nastavenia.pct", { n: pct })}</span></div>
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("udaje.priprava")} style={{ height: 8, borderRadius: 4, background: "var(--d-trackOff, var(--track))", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--sek-b)", transformOrigin: "left", transform: `scaleX(${pct / 100})`, transition: "transform .35s linear" }} /></div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}>{t("udaje.zavriet")}</div>
        </NastKarta>
      ) : (
        <>
          <NastKarta k="g" style={{ padding: "18px", display: "flex", alignItems: "center", gap: 14 }}>
            <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 12, background: "var(--sek-gBg)", color: "var(--sek-g)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.check} s={20} w={2.6} /></span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16.5, fontWeight: 800 }}>{t("udaje.pripraveny")}</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))", marginTop: 2 }}>{t("udaje.plati", { subor })}</span></span>
          </NastKarta>
          <button type="button" onClick={stiahni} style={btn(true)}>{t("udaje.stiahnut")}</button>
        </>
      )}
      {stav === "overenie" && <OverenieHarok z={z ? z + 15 : undefined} onClose={() => setStav(null)} onOk={pripravuj} />}
    </ObrazovkaSprava>
  );
}

/** pred prípravou súboru: tvár alebo odtlačok (v pilote simulované; v produkcii WebAuthn) */
function OverenieHarok({ onClose, onOk, z }: { onClose: () => void; onOk: () => void; z?: number }) {
  const t = useT();
  const [bezi, setBezi] = useState(false);
  const over = () => { setBezi(true); window.setTimeout(onOk, 700); };
  return (
    <Harok z={z} onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{t("udaje.potvrd")}</span>}
      paticka={<button type="button" onClick={over} disabled={bezi} style={{ ...btn(true, !bezi), flex: 1 }}>{bezi ? t("udaje.overujem") : t("udaje.overit")}</button>}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 14, background: "var(--sek-bBg)", color: "var(--sek-b)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.finger} s={26} w={2} /></span>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>{t("udaje.overText")}</div>
      </div>
    </Harok>
  );
}

