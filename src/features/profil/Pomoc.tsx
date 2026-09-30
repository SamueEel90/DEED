// KARTA 24 · 2k (OPRAVY 50) · Pomoc: Časté otázky · Napísať podpore · Nahlásiť problém (+ Zatras telefónom a nahlás).
// Otázky a odpovede v produkcii zo servera (tím ich upraví bez novej verzie appky). Správy podpore a nahlásenia → server.
import { sZnackou } from "@/components/DeedZnacka";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { toast } from "@/components/toast";
import { nahlasit as nahlasitDB, type NahlasDovod } from "@/lib/osobne";
import { ObrazovkaSprava, nacitajKontakt, maskuj } from "./Bezpecnost24";
import { NastKarta, Prepinac, oddelovac } from "./nastUi";
import { lbl, pozn, Ik, hladPole, btn } from "./JazykUdaje";
import { useT, tTeraz } from "@/i18n";
import { usePrekladObsahu, maPreklad } from "@/i18n/obsah";

export const VERZIA_APPKY = "0.9 (pilot)";
const IK_FOTO = "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01";
const IK_DOLE = "M6 9l6 6 6-6";

// ======================= ČASTÉ OTÁZKY =======================
const FAQ: [string, string[]][] = [
  ["pomoc.faq.sk.zaciatok", ["deedDeeD", "coJe", "meno"]],
  ["pomoc.faq.sk.skutky", ["feed", "karma", "dennik"]],
  ["pomoc.faq.sk.platby", ["drzi", "poplatky", "starsi"]],
  ["pomoc.faq.sk.ucet", ["email", "zrusenie"]],
];
const bez = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CasteOtazky({ onBack, onPodpora, z }: { onBack: () => void; onPodpora: () => void; z?: number }) {
  const tr = useT();
  const [q, setQ] = useState("");
  const [otv, setOtv] = useState<string | null>(null);
  const qq = bez(q.trim());
  const skup = FAQ.map(([h, L]) => [tr(h), L.map((k) => [tr(`pomoc.faq.${k}.q`), tr(`pomoc.faq.${k}.a`)] as [string, string]).filter(([t, a]) => !qq || bez(`${t} ${a}`).includes(qq))] as const).filter(([, L]) => L.length);
  return (
    <ObrazovkaSprava titul={tr("pomoc.faq.titul")} onBack={onBack} z={z}>
      {hladPole(q, setQ, tr("pomoc.faq.hladaj"))}
      {skup.map(([h, L]) => (
        <div key={h}>
          <h2 style={lbl}>{h}</h2>
          <NastKarta k="g">
            {L.map(([t, a], i) => { const o = otv === t || qq.length >= 3; return (
              <div key={t} style={{ borderTop: i ? oddelovac : "none" }}>
                <button type="button" aria-expanded={o} onClick={() => setOtv(otv === t ? null : t)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "10px 18px", border: "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
                  <span style={{ flex: 1, fontSize: 15.5, fontWeight: 800 }}>{sZnackou(t)}</span>
                  <span style={{ display: "flex", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d={IK_DOLE} s={16} w={2.4} c="var(--d-ink3, var(--ink3))" /></span>
                </button>
                {o && <div className="pf-rise" style={{ padding: "0 18px 14px", fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>{sZnackou(a)}</div>}
              </div>); })}
          </NastKarta>
        </div>))}
      {!skup.length && <div style={pozn}>{tr("pomoc.faq.ziadna")}</div>}
      <button type="button" onClick={onPodpora} style={btn(false)}>{tr("pomoc.faq.napisat")}</button>
    </ObrazovkaSprava>
  );
}

// ======================= spoločné: téma, text, príloha, hotovo =======================
const Cip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) => (
  <button type="button" role="radio" aria-checked={on} onClick={onClick} style={{ minHeight: 44, padding: "0 14px", borderRadius: 22, border: `1px solid ${on ? "var(--gBd)" : "var(--d-cardBd, var(--cardBd))"}`, boxShadow: "none", background: on ? "var(--gSoft)" : "var(--field)", color: on ? "var(--gInk)" : "var(--d-ink2, var(--ink2))", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>{children}</button>);

function Priloha({ text, subor, setSubor }: { text: string; subor: File | null; setSubor: (f: File | null) => void }) {
  const inp = useRef<HTMLInputElement>(null);
  const tr = useT();
  return (<>
    <input ref={inp} type="file" accept="image/*" hidden onChange={(e) => setSubor(e.target.files?.[0] ?? null)} />
    <button type="button" onClick={() => (subor ? setSubor(null) : inp.current?.click())} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "0 16px", borderRadius: 14, border: "1.5px dashed var(--gBd)", boxShadow: "none", background: "transparent", color: "var(--gInk)", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
      <Ik d={IK_FOTO} />{subor ? `${subor.name.length > 26 ? `${subor.name.slice(0, 24)}…` : subor.name} · ${tr("pomoc.odobrat")}` : text}</button>
  </>);
}
const Hotovo = ({ t, s, cislo, onClose }: { t: string; s: string; cislo: string; onClose: () => void }) => { const tr = useT(); return (
  <div className="pf-rise" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "20px 8px" }}>
    <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d="M20 6 9 17l-5-5" s={28} w={2.8} /></span>
    <b role="status" style={{ fontSize: 20 }}>{t}</b>
    <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>{s}</div>
    <div style={{ fontSize: 13.5, color: "var(--d-ink3, var(--ink3))" }}>{tr("pomoc.cislo")} <b style={{ color: "var(--d-ink, var(--ink))", fontVariantNumeric: "tabular-nums" }}>{cislo}</b></div>
    <button type="button" onClick={onClose} style={{ ...btn(false), width: "100%", marginTop: 8 }}>{tr("sp.hotovo")}</button>
  </div>); };
const cislo = (p: string) => `${p}-${String(Math.floor(10000 + Math.random() * 89999))}`;
const pole = { width: "100%", minHeight: 130, padding: "12px 14px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, lineHeight: 1.5, color: "var(--d-ink, var(--ink))", outline: "none", fontFamily: "inherit", resize: "vertical" } as const;

// ======================= NAPÍSAŤ PODPORE =======================
type Sprava = { t: string; tema: string; kedy: string; stav: "riešime" | "vyriešené"; cislo: string };
const KLUC_SPRAVY = "deed.podpora.spravy";
const UKAZKA: Sprava[] = [{ t: "Nepríde mi SMS kód", tema: "Účet a prihlásenie", kedy: "12. 9.", stav: "vyriešené", cislo: "P-18204" }, { t: "Dvakrát stiahnutá platba", tema: "Platby a dary", kedy: "28. 9.", stav: "riešime", cislo: "P-20877" }];
const nacitajSpravy = (): Sprava[] => { try { const s = localStorage.getItem(KLUC_SPRAVY); return s ? JSON.parse(s) : UKAZKA; } catch { return UKAZKA; } };
const TEMY_PODPORA = ["Účet a prihlásenie", "Platby a dary", "Skutky a karma", "Zbierky", "Zamestnávateľ", "Iné"];
// uložená téma ostáva slovenská (id), zobrazuje sa preložená
const TEMA_KLUC: Record<string, string> = { "Účet a prihlásenie": "pomoc.tema.ucet", "Platby a dary": "pomoc.tema.platby", "Skutky a karma": "pomoc.tema.skutky", "Zbierky": "pomoc.tema.zbierky", "Zamestnávateľ": "pomoc.tema.zamestnavatel", "Iné": "pomoc.tema.ine" };

export function NapisatPodpore({ onBack, z }: { onBack: () => void; z?: number }) {
  const tr = useT();
  const kontakt = nacitajKontakt();
  const [tema, setTema] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [subor, setSubor] = useState<File | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [spravy, setSpravy] = useState<Sprava[]>(nacitajSpravy);
  const pr = usePrekladObsahu(); // 79b · obsah správ (ukážkové)
  const ok = !!tema && text.trim().length >= 10;
  const odosli = () => {
    if (!ok) return;
    const c = cislo("P");
    const d = new Date();
    const nove = [{ t: text.trim().split(/[.!?\n]/)[0].slice(0, 48), tema: tema!, kedy: tr.datum(d), stav: "riešime" as const, cislo: c }, ...spravy];
    try { localStorage.setItem(KLUC_SPRAVY, JSON.stringify(nove)); } catch { /* LS */ }
    setSpravy(nove); setHot(c);
  };
  return (
    <ObrazovkaSprava titul={tr("pomoc.podpora.titul")} onBack={onBack} z={z}>
      {hot ? <Hotovo t={tr("pomoc.podpora.odoslana")} s={tr("pomoc.podpora.odoslanaS")} cislo={hot} onClose={onBack} /> : <>
        <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))", padding: "0 6px" }}>{tr("pomoc.podpora.uvod")}</div>
        <div>
          <h2 style={lbl} id="tema-podpora">{tr("pomoc.podpora.tema")}</h2>
          <div role="radiogroup" aria-labelledby="tema-podpora" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{TEMY_PODPORA.map((t) => <Cip key={t} on={tema === t} onClick={() => setTema(t)}>{tr(TEMA_KLUC[t])}</Cip>)}</div>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={tr("pomoc.podpora.placeholder")} aria-label={tr("pomoc.podpora.aria")} style={pole} />
        <Priloha text={tr("pomoc.podpora.priloha")} subor={subor} setSubor={setSubor} />
        <div style={pozn}>{tr("pomoc.podpora.odpovieme", { email: kontakt.email ? maskuj(kontakt.email, "e") : tr("pomoc.podpora.tvojEmail") })}</div>
        <button type="button" disabled={!ok} onClick={odosli} style={btn(true, ok)}>{tr("pomoc.odoslat")}</button>
      </>}
      <div>
        <h2 style={lbl}>{tr("pomoc.podpora.moje")}</h2>
        <NastKarta k="g">
          {spravy.map((s, i) => (
            <div key={s.cislo} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 62, padding: "10px 18px", borderTop: i ? oddelovac : "none" }}>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{pr.p(s.t)}</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))" }}>{TEMA_KLUC[s.tema] ? tr(TEMA_KLUC[s.tema]) : s.tema} · {pr.p(s.kedy)}</span></span>
              <span style={{ padding: "3px 9px", borderRadius: 8, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", background: s.stav === "vyriešené" ? "var(--sek-gBg)" : "var(--sek-oBg)", color: s.stav === "vyriešené" ? "var(--sek-g)" : "var(--sek-o)" }}>{tr(s.stav === "vyriešené" ? "pomoc.stav.vyriesene" : "pomoc.stav.riesime")}</span>
            </div>))}
        </NastKarta>
        {spravy.some((s) => maPreklad(s.t, tr)) && pr.odkaz}
      </div>
    </ObrazovkaSprava>
  );
}

// ======================= NAHLÁSIŤ PROBLÉM =======================
const TYPY = ["Niečo nefunguje", "Nevhodný obsah", "Podvod alebo falošná zbierka", "Niekto je v ohrození", "Bezpečnosť účtu"];
const NALIEHAVE = ["Niekto je v ohrození", "Podvod alebo falošná zbierka"];
// typ ostáva slovenský (id pre moderáciu), zobrazuje sa preložený
const TYP_KLUC: Record<string, string> = { "Niečo nefunguje": "pomoc.problem.typ.nefunguje", "Nevhodný obsah": "pomoc.problem.typ.nevhodny", "Podvod alebo falošná zbierka": "pomoc.problem.typ.podvod", "Niekto je v ohrození": "pomoc.problem.typ.ohrozenie", "Bezpečnosť účtu": "pomoc.problem.typ.bezpecnost" };
const zariadenieText = () => {
  const ua = navigator.userAgent;
  const ios = ua.match(/OS (\d+)_\d+.*like Mac OS X/), and = ua.match(/Android (\d+)/);
  if (/iPhone/.test(ua)) return `iPhone, iOS ${ios?.[1] ?? ""}`.trim();
  if (/iPad/.test(ua)) return `iPad, iPadOS ${ios?.[1] ?? ""}`.trim();
  if (and) return `Android ${and[1]}`;
  if (/Mac OS X/.test(ua)) return tTeraz()("pomoc.problem.mac");
  if (/Windows/.test(ua)) return tTeraz()("pomoc.problem.windows");
  return tTeraz()("pomoc.problem.prehliadac");
};

/** čo sa nahlasuje z menu ⋯ (skutok, zbierka, komentár, profil) — obrazovka sa otvorí rovno s tým */
export type Predmet = { typ: string; nazov: string; refId?: string | number; modul?: string };
const DOVOD: Record<string, NahlasDovod> = { "Podvod alebo falošná zbierka": "podvod", "Nevhodný obsah": "urazlive" };

export function NahlasitProblem({ onBack, obrazovka: obrazovkaP, z, predmet }: { onBack: () => void; obrazovka?: string; z?: number; predmet?: Predmet }) {
  const tr = useT();
  const obrazovka = obrazovkaP ?? tr("pomoc.problem.obrazovkaNast");
  const n = useNastaveniaAppky();
  const [typ, setTyp] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [subor, setSubor] = useState<File | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [cas] = useState(() => { const d = new Date(); return `${tr.datum(d)} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; });
  const ok = !!typ && text.trim().length >= 10;
  const nal = !!typ && NALIEHAVE.includes(typ);
  const zatras = async () => {
    if (!n.zatras) {
      // iOS pýta povolenie senzora pohybu len na ťuk
      const DM = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
      if (DM?.requestPermission) { try { if ((await DM.requestPermission()) !== "granted") { toast(tr("pomoc.problem.bezPohybu")); return; } } catch { return; } }
    }
    zmenNastavenia({ zatras: !n.zatras });
  };
  return (
    <ObrazovkaSprava titul={tr("pomoc.problem.titul")} onBack={onBack} z={z}>
      {hot ? <Hotovo t={tr("pomoc.problem.dakujeme")} s={nal ? tr("pomoc.problem.prednostne") : tr("pomoc.problem.dameVediet")} cislo={hot} onClose={onBack} /> : <>
        {predmet
          ? <NastKarta k="r" style={{ padding: "12px 18px" }}><span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--sek-r)" }}>{tr("pomoc.problem.nahlasujes", { typ: predmet.typ.toUpperCase() })}</span><span style={{ display: "block", fontSize: 15.5, fontWeight: 800, marginTop: 2 }}>{predmet.nazov}</span></NastKarta>
          : <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))", padding: "0 6px" }}>{tr("pomoc.problem.uvod")}</div>}
        <div>
          <h2 style={lbl} id="typ-problemu">{tr("pomoc.problem.coSaDeje")}</h2>
          <div role="radiogroup" aria-labelledby="typ-problemu" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{TYPY.map((t) => <Cip key={t} on={typ === t} onClick={() => setTyp(t)}>{tr(TYP_KLUC[t])}</Cip>)}</div>
        </div>
        {nal && <div role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 14, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}><b style={{ color: "var(--d-ink, var(--ink))" }}>{tr("pomoc.problem.volaj")} <a href="tel:112" style={{ color: "inherit" }}>112</a>.</b> {tr("pomoc.problem.do2h")}</div>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={predmet ? tr("pomoc.problem.phPredmet") : tr("pomoc.problem.ph")} aria-label={tr("pomoc.problem.aria")} style={pole} />
        <Priloha text={tr("pomoc.problem.priloha")} subor={subor} setSubor={setSubor} />
        <NastKarta k="g" style={{ padding: "14px 18px", fontSize: 13.5, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}>
          <b style={{ display: "block", color: "var(--d-ink, var(--ink))", marginBottom: 2 }}>{tr("pomoc.problem.automaticky")}</b>
          {tr("pomoc.problem.diag", { obrazovka, verzia: VERZIA_APPKY, zariadenie: zariadenieText(), cas })}
          <div style={{ marginTop: 6 }}>{tr("pomoc.problem.nepripajame")}</div>
        </NastKarta>
        <NastKarta k="g">
          <button type="button" role="switch" aria-checked={n.zatras} onClick={() => { void zatras(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "10px 18px", border: "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{tr("pomoc.problem.zatras")}</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))" }}>{tr("pomoc.problem.zatrasS")}</span></span>
            <Prepinac on={n.zatras} /></button>
        </NastKarta>
        <button type="button" disabled={!ok} onClick={() => {
          if (!ok) return;
          // moderácia: nahlásený obsah ide do fronty (DB alebo lokálne), problém v appke na podporu
          if (predmet) void nahlasitDB({ co: `${predmet.typ} · ${predmet.nazov}`, refId: predmet.refId, modul: predmet.modul, dovod: DOVOD[typ!] ?? "ine", poznamka: `${typ}: ${text.trim()}`, kedy: new Date().toISOString() });
          setHot(cislo("N"));
        }} style={btn(true, ok)}>{tr("pomoc.odoslat")}</button>
      </>}
    </ObrazovkaSprava>
  );
}

// ======================= GLOBÁLNY HOST: Pomoc z menu ≡, Nahlásiť z menu ⋯, Zatras =======================
type Otvorene = { druh: "faq" } | { druh: "podpora" } | { druh: "problem"; obrazovka: string; predmet?: Predmet };
let otvorene: Otvorene | null = null;
let verZ = 0;
const poslZ = new Set<() => void>();
const zmenaZ = () => { verZ++; poslZ.forEach((f) => f()); };
/** menu ≡ → Časté otázky */
export const otvorPomoc = () => { otvorene = { druh: "faq" }; zmenaZ(); };
/** zatrasenie alebo ⋯ Nahlásiť → Nahlásiť problém (s predmetom, ak je) */
export const otvorNahlasit = (obrazovka: string, predmet?: Predmet) => { otvorene = { druh: "problem", obrazovka, predmet }; zmenaZ(); };

export function PomocHost() {
  const n = useNastaveniaAppky();
  useSyncExternalStore((f) => { poslZ.add(f); return () => poslZ.delete(f); }, () => verZ);
  useEffect(() => {
    if (!n.zatras) return;
    let otrasy: number[] = [];
    const h = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity; if (!a) return;
      const sila = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (sila < 25) return;
      const t = Date.now();
      otrasy = [...otrasy.filter((x) => t - x < 1000), t];
      if (otrasy.length >= 3 && !otvorene) {
        otrasy = [];
        const vrch = [...document.querySelectorAll('[aria-modal="true"]')].pop()?.getAttribute("aria-label");
        otvorNahlasit(vrch || document.title || tTeraz()("pomoc.host.appka"));
        try { navigator.vibrate?.(20); } catch { /* bez vibrácie */ }
      }
    };
    window.addEventListener("devicemotion", h);
    return () => window.removeEventListener("devicemotion", h);
  }, [n.zatras]);
  const zavri = () => { otvorene = null; zmenaZ(); };
  if (!otvorene) return null;
  if (otvorene.druh === "faq") return <CasteOtazky z={170} onBack={zavri} onPodpora={() => { otvorene = { druh: "podpora" }; zmenaZ(); }} />;
  if (otvorene.druh === "podpora") return <NapisatPodpore z={170} onBack={zavri} />;
  return <NahlasitProblem key={otvorene.predmet?.nazov ?? "p"} obrazovka={otvorene.obrazovka} predmet={otvorene.predmet} z={170} onBack={zavri} />;
}
