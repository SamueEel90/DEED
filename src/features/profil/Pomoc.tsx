// KARTA 24 · 2k (OPRAVY 50) · Pomoc: Časté otázky · Napísať podpore · Nahlásiť problém (+ Zatras telefónom a nahlás).
// Otázky a odpovede v produkcii zo servera (tím ich upraví bez novej verzie appky). Správy podpore a nahlásenia → server.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { toast } from "@/components/toast";
import { ObrazovkaSprava, nacitajKontakt, maskuj } from "./Bezpecnost24";
import { NastKarta, Prepinac, oddelovac } from "./nastUi";
import { lbl, pozn, Ik, hladPole, btn } from "./JazykUdaje";

export const VERZIA_APPKY = "0.9 (pilot)";
const IK_FOTO = "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01";
const IK_DOLE = "M6 9l6 6 6-6";

// ======================= ČASTÉ OTÁZKY =======================
const FAQ: [string, [string, string][]][] = [
  ["ZAČIATOK", [["Čo je DEED?", "Miesto pre dobré skutky, pomoc a zbierky v tvojom okolí. Pomôžeš, daruješ alebo zdieľaš, darovať môžeš už od 0,10 €."], ["Prečo mám overené meno?", "Aby si ľudia mohli dôverovať. Meno overujeme raz pri registrácii a zmeniť ho vie len podpora."]]],
  ["SKUTKY A KARMA", [["Ako sa dostanem do feedu?", "Skutok najprv skontroluje AI. Podľa dôkazov a karmy dostane miesto vo feede štvrte. Keď ho susedia overia, rastie dôvera a môže sa dostať ďalej."], ["Kto vidí moju karmu?", "Len ty. Ostatní vidia iba tvoj štít."], ["Čo je Môj denník?", "Malé skutky pre osobný rozvoj, napríklad prvý beh alebo prečítaná kniha. Vidíš ich len ty."]]],
  ["PLATBY A DARY", [["Drží DEED moje peniaze?", "Nie. Dar ide priamo zbierke alebo žiadateľovi, DEED peniaze nikdy nedrží."], ["Aké sú poplatky?", "Kartou 1,4 % + 0,15 €, prevodom SEPA bez poplatku. Poplatok vždy vidíš pred zaplatením."], ["Ako pripíšem starší dar?", "V Moje dary ťukni Pripísať starší dar a zadaj kód z dokladu, napríklad DAR-4782-K9TQ."]]],
  ["ÚČET A BEZPEČNOSŤ", [["Stratil som prístup k e-mailu", "V E-mail, telefón a heslo ťukni Zmeniť a over sa tvárou, SMS alebo kľúčom. Ak nemáš nič z toho, obnovíme účet cez podporu."], ["Čo sa stane po zrušení účtu?", "Účet sa na 30 dní uspí a prihlásením ho obnovíš. Potom sa zmaže, dary a skutky ostanú zapísané."]]],
];
const bez = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CasteOtazky({ onBack, onPodpora }: { onBack: () => void; onPodpora: () => void }) {
  const [q, setQ] = useState("");
  const [otv, setOtv] = useState<string | null>(null);
  const qq = bez(q.trim());
  const skup = FAQ.map(([h, L]) => [h, L.filter(([t, a]) => !qq || bez(`${t} ${a}`).includes(qq))] as const).filter(([, L]) => L.length);
  return (
    <ObrazovkaSprava titul="Časté otázky" onBack={onBack}>
      {hladPole(q, setQ, "Hľadaj otázku")}
      {skup.map(([h, L]) => (
        <div key={h}>
          <h2 style={lbl}>{h}</h2>
          <NastKarta k="g">
            {L.map(([t, a], i) => { const o = otv === t || qq.length >= 3; return (
              <div key={t} style={{ borderTop: i ? oddelovac : "none" }}>
                <button type="button" aria-expanded={o} onClick={() => setOtv(otv === t ? null : t)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "10px 18px", border: "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
                  <span style={{ flex: 1, fontSize: 15.5, fontWeight: 800 }}>{t}</span>
                  <span style={{ display: "flex", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d={IK_DOLE} s={16} w={2.4} c="var(--d-ink3, var(--ink3))" /></span>
                </button>
                {o && <div className="pf-rise" style={{ padding: "0 18px 14px", fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>{a}</div>}
              </div>); })}
          </NastKarta>
        </div>))}
      {!skup.length && <div style={pozn}>Na toto odpoveď nemáme. Napíš nám, poradíme.</div>}
      <button type="button" onClick={onPodpora} style={btn(false)}>Nenašiel si odpoveď? Napísať podpore</button>
    </ObrazovkaSprava>
  );
}

// ======================= spoločné: téma, text, príloha, hotovo =======================
const Cip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) => (
  <button type="button" role="radio" aria-checked={on} onClick={onClick} style={{ minHeight: 44, padding: "0 14px", borderRadius: 22, border: `1px solid ${on ? "var(--gBd)" : "var(--d-cardBd, var(--cardBd))"}`, boxShadow: "none", background: on ? "var(--gSoft)" : "var(--field)", color: on ? "var(--gInk)" : "var(--d-ink2, var(--ink2))", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>{children}</button>);

function Priloha({ text, subor, setSubor }: { text: string; subor: File | null; setSubor: (f: File | null) => void }) {
  const inp = useRef<HTMLInputElement>(null);
  return (<>
    <input ref={inp} type="file" accept="image/*" hidden onChange={(e) => setSubor(e.target.files?.[0] ?? null)} />
    <button type="button" onClick={() => (subor ? setSubor(null) : inp.current?.click())} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "0 16px", borderRadius: 14, border: "1.5px dashed var(--gBd)", boxShadow: "none", background: "transparent", color: "var(--gInk)", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
      <Ik d={IK_FOTO} />{subor ? `${subor.name.length > 26 ? `${subor.name.slice(0, 24)}…` : subor.name} · odobrať` : text}</button>
  </>);
}
const Hotovo = ({ t, s, cislo, onClose }: { t: string; s: string; cislo: string; onClose: () => void }) => (
  <div className="pf-rise" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "20px 8px" }}>
    <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d="M20 6 9 17l-5-5" s={28} w={2.8} /></span>
    <b role="status" style={{ fontSize: 20 }}>{t}</b>
    <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>{s}</div>
    <div style={{ fontSize: 13.5, color: "var(--d-ink3, var(--ink3))" }}>Číslo: <b style={{ color: "var(--d-ink, var(--ink))", fontVariantNumeric: "tabular-nums" }}>{cislo}</b></div>
    <button type="button" onClick={onClose} style={{ ...btn(false), width: "100%", marginTop: 8 }}>Hotovo</button>
  </div>);
const cislo = (p: string) => `${p}-${String(Math.floor(10000 + Math.random() * 89999))}`;
const pole = { width: "100%", minHeight: 130, padding: "12px 14px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, lineHeight: 1.5, color: "var(--d-ink, var(--ink))", outline: "none", fontFamily: "inherit", resize: "vertical" } as const;

// ======================= NAPÍSAŤ PODPORE =======================
type Sprava = { t: string; tema: string; kedy: string; stav: "riešime" | "vyriešené"; cislo: string };
const KLUC_SPRAVY = "deed.podpora.spravy";
const UKAZKA: Sprava[] = [{ t: "Nepríde mi SMS kód", tema: "Účet a prihlásenie", kedy: "12. 9.", stav: "vyriešené", cislo: "P-18204" }, { t: "Dvakrát stiahnutá platba", tema: "Platby a dary", kedy: "28. 9.", stav: "riešime", cislo: "P-20877" }];
const nacitajSpravy = (): Sprava[] => { try { const s = localStorage.getItem(KLUC_SPRAVY); return s ? JSON.parse(s) : UKAZKA; } catch { return UKAZKA; } };
const TEMY_PODPORA = ["Účet a prihlásenie", "Platby a dary", "Skutky a karma", "Zbierky", "Zamestnávateľ", "Iné"];

export function NapisatPodpore({ onBack }: { onBack: () => void }) {
  const kontakt = nacitajKontakt();
  const [tema, setTema] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [subor, setSubor] = useState<File | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [spravy, setSpravy] = useState<Sprava[]>(nacitajSpravy);
  const ok = !!tema && text.trim().length >= 10;
  const odosli = () => {
    if (!ok) return;
    const c = cislo("P");
    const d = new Date();
    const nove = [{ t: text.trim().split(/[.!?\n]/)[0].slice(0, 48), tema: tema!, kedy: `${d.getDate()}. ${d.getMonth() + 1}.`, stav: "riešime" as const, cislo: c }, ...spravy];
    try { localStorage.setItem(KLUC_SPRAVY, JSON.stringify(nove)); } catch { /* LS */ }
    setSpravy(nove); setHot(c);
  };
  return (
    <ObrazovkaSprava titul="Napísať podpore" onBack={onBack}>
      {hot ? <Hotovo t="Správa odoslaná" s="Odpovieme do 24 hodín v pracovné dni. Odpoveď nájdeš v Oznámeniach." cislo={hot} onClose={onBack} /> : <>
        <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))", padding: "0 6px" }}>Napíš nám, s čím potrebuješ pomôcť. Odpovie človek, nie robot.</div>
        <div>
          <h2 style={lbl} id="tema-podpora">TÉMA</h2>
          <div role="radiogroup" aria-labelledby="tema-podpora" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{TEMY_PODPORA.map((t) => <Cip key={t} on={tema === t} onClick={() => setTema(t)}>{t}</Cip>)}</div>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Opíš, čo potrebuješ" aria-label="Správa pre podporu" style={pole} />
        <Priloha text="Pripojiť fotku alebo snímku" subor={subor} setSubor={setSubor} />
        <div style={pozn}>Odpovieme do 24 hodín v pracovné dni. Odpoveď príde do Oznámení aj na {kontakt.email ? maskuj(kontakt.email, "e") : "tvoj e-mail"}.</div>
        <button type="button" disabled={!ok} onClick={odosli} style={btn(true, ok)}>Odoslať</button>
      </>}
      <div>
        <h2 style={lbl}>MOJE SPRÁVY</h2>
        <NastKarta k="g">
          {spravy.map((s, i) => (
            <div key={s.cislo} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 62, padding: "10px 18px", borderTop: i ? oddelovac : "none" }}>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{s.t}</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))" }}>{s.tema} · {s.kedy}</span></span>
              <span style={{ padding: "3px 9px", borderRadius: 8, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", background: s.stav === "vyriešené" ? "var(--sek-gBg)" : "var(--sek-oBg)", color: s.stav === "vyriešené" ? "var(--sek-g)" : "var(--sek-o)" }}>{s.stav}</span>
            </div>))}
        </NastKarta>
      </div>
    </ObrazovkaSprava>
  );
}

// ======================= NAHLÁSIŤ PROBLÉM =======================
const TYPY = ["Niečo nefunguje", "Nevhodný obsah", "Podvod alebo falošná zbierka", "Niekto je v ohrození", "Bezpečnosť účtu"];
const NALIEHAVE = ["Niekto je v ohrození", "Podvod alebo falošná zbierka"];
const zariadenieText = () => {
  const ua = navigator.userAgent;
  const ios = ua.match(/OS (\d+)_\d+.*like Mac OS X/), and = ua.match(/Android (\d+)/);
  if (/iPhone/.test(ua)) return `iPhone, iOS ${ios?.[1] ?? ""}`.trim();
  if (/iPad/.test(ua)) return `iPad, iPadOS ${ios?.[1] ?? ""}`.trim();
  if (and) return `Android ${and[1]}`;
  if (/Mac OS X/.test(ua)) return "Mac, prehliadač";
  if (/Windows/.test(ua)) return "Windows, prehliadač";
  return "prehliadač";
};

export function NahlasitProblem({ onBack, obrazovka = "Nastavenia", z }: { onBack: () => void; obrazovka?: string; z?: number }) {
  const n = useNastaveniaAppky();
  const [typ, setTyp] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [subor, setSubor] = useState<File | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [cas] = useState(() => { const d = new Date(); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; });
  const ok = !!typ && text.trim().length >= 10;
  const nal = !!typ && NALIEHAVE.includes(typ);
  const zatras = async () => {
    if (!n.zatras) {
      // iOS pýta povolenie senzora pohybu len na ťuk
      const DM = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
      if (DM?.requestPermission) { try { if ((await DM.requestPermission()) !== "granted") { toast("Bez povolenia pohybu to nepôjde"); return; } } catch { return; } }
    }
    zmenNastavenia({ zatras: !n.zatras });
  };
  return (
    <ObrazovkaSprava titul="Nahlásiť problém" onBack={onBack} z={z}>
      {hot ? <Hotovo t="Ďakujeme, pozrieme sa na to" s={nal ? "Riešime to prednostne, do 2 hodín. Ak treba, obsah hneď skryjeme." : "Keď to opravíme, dáme ti vedieť v Oznámeniach."} cislo={hot} onClose={onBack} /> : <>
        <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))", padding: "0 6px" }}>Čo sa stalo? Pomôžeš nám opraviť to rýchlo.</div>
        <div>
          <h2 style={lbl} id="typ-problemu">ČO SA DEJE</h2>
          <div role="radiogroup" aria-labelledby="typ-problemu" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{TYPY.map((t) => <Cip key={t} on={typ === t} onClick={() => setTyp(t)}>{t}</Cip>)}</div>
        </div>
        {nal && <div role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 14, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}><b style={{ color: "var(--d-ink, var(--ink))" }}>Ak je niekto v ohrození, volaj <a href="tel:112" style={{ color: "inherit" }}>112</a>.</b> Nahlásenie riešime do 2 hodín, aj v noci.</div>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Kde a čo sa stalo? Napríklad: pri platbe sa zasekne tlačidlo Podrž a zaplať." aria-label="Opis problému" style={pole} />
        <Priloha text="Pripojiť snímku obrazovky" subor={subor} setSubor={setSubor} />
        <NastKarta k="g" style={{ padding: "14px 18px", fontSize: 13.5, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}>
          <b style={{ display: "block", color: "var(--d-ink, var(--ink))", marginBottom: 2 }}>Pripojíme automaticky</b>
          obrazovka: {obrazovka} · verzia {VERZIA_APPKY} · {zariadenieText()} · čas {cas}
          <div style={{ marginTop: 6 }}>Heslo, platobné údaje ani polohu nepripájame.</div>
        </NastKarta>
        <NastKarta k="g">
          <button type="button" role="switch" aria-checked={n.zatras} onClick={() => { void zatras(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "10px 18px", border: "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>Zatras telefónom a nahlás</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))" }}>z ktorejkoľvek obrazovky, aj so snímkou</span></span>
            <Prepinac on={n.zatras} /></button>
        </NastKarta>
        <button type="button" disabled={!ok} onClick={() => ok && setHot(cislo("N"))} style={btn(true, ok)}>Odoslať</button>
      </>}
    </ObrazovkaSprava>
  );
}

// ======================= ZATRAS TELEFÓNOM =======================
// Host v App: keď je „Zatras" zapnuté, silné zatrasenie otvorí Nahlásiť problém nad aktuálnou obrazovkou.
let otvoreneZ: string | null = null;
let verZ = 0;
const poslZ = new Set<() => void>();
const zmenaZ = () => { verZ++; poslZ.forEach((f) => f()); };
export const otvorNahlasit = (obrazovka: string) => { otvoreneZ = obrazovka; zmenaZ(); };

export function ZatrasHost() {
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
      if (otrasy.length >= 3 && !otvoreneZ) {
        otrasy = [];
        const vrch = [...document.querySelectorAll('[aria-modal="true"]')].pop()?.getAttribute("aria-label");
        otvorNahlasit(vrch || document.title || "appka");
        try { navigator.vibrate?.(20); } catch { /* bez vibrácie */ }
      }
    };
    window.addEventListener("devicemotion", h);
    return () => window.removeEventListener("devicemotion", h);
  }, [n.zatras]);
  if (!otvoreneZ) return null;
  return <NahlasitProblem obrazovka={otvoreneZ} z={170} onBack={() => { otvoreneZ = null; zmenaZ(); }} />;
}
