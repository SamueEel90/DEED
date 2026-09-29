// KARTA 24 · 2g Jazyk · 2h Stiahnuť moje údaje · 2i Zamestnávateľ — obrazovky sprava z Nastavení (OPRAVY 39).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { usePouzivatel } from "@/lib/pouzivatel";
import { poziadaj, potvrd, pozvi, odmietni, odpoj, useVazbaOsoby } from "@/lib/zamestnanci";
import { FIRMY_ADRESAR, type FirmaAdresar } from "@/features/rola/mock";
import { Harok } from "@/features/zbierka/Zdielat";
import { toast } from "@/components/toast";
import { ObrazovkaSprava } from "./Bezpecnost24";
import { NastKarta, Prepinac, IK, oddelovac } from "./nastUi";

const lbl = { margin: 0, padding: "0 6px 8px", fontSize: 12.5, fontWeight: 800, letterSpacing: ".07em", color: "var(--d-ink3, var(--ink3))" } as const;
const pozn = { fontSize: 12.5, lineHeight: 1.5, color: "var(--d-ink3, var(--ink3))", padding: "0 6px" } as const;
const Ik = ({ d, s = 18, w = 2.2, c = "currentColor" }: { d: string; s?: number; w?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d={d} /></svg>;
const Radio = ({ on }: { on: boolean }) => <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", border: `2px solid ${on ? "var(--green)" : "var(--chkBd)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0, transition: "opacity .15s ease" }} /></span>;
const Check = ({ on }: { on: boolean }) => <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 7, flex: "none", border: `2px solid ${on ? "var(--green)" : "var(--chkBd)"}`, background: on ? "var(--green)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <Ik d={IK.check} s={14} w={3} />}</span>;
const hladPole = (v: string, set: (s: string) => void, ph: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, height: 50, padding: "0 14px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)" }}>
    <Ik d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5" c="var(--d-ink3, var(--ink3))" />
    <input value={v} onChange={(e) => set(e.target.value)} placeholder={ph} aria-label={ph} style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontSize: 16, color: "var(--d-ink, var(--ink))", fontFamily: "inherit" }} />
  </div>);
const btn = (hlavne: boolean, zap = true) => ({ minHeight: 52, borderRadius: 16, border: hlavne ? "none" : "1px solid var(--d-cardBd, var(--cardBd))", boxShadow: "none", background: hlavne ? "var(--gGrad)" : "var(--btn)", color: hlavne ? "#fff" : "var(--d-ink, var(--ink))", fontSize: 15.5, fontWeight: 800, fontFamily: "inherit", cursor: zap ? "pointer" : "default", opacity: zap ? 1 : 0.45, transition: "opacity .2s ease" }) as const;
const bezDiakritiky = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ======================= 2g · JAZYK =======================
/** svetové jazyky a úradné jazyky krajín, kde DEED bude (menšinové nie) · názov vo vlastnom jazyku + po slovensky */
const JAZYKY: [string, string, string][] = [
  ["Slovenčina", "slovenčina", "sk"], ["Čeština", "čeština", "cs"], ["English", "angličtina", "en"],
  ["Deutsch", "nemčina", "de"], ["Español", "španielčina", "es"], ["Français", "francúzština", "fr"], ["Italiano", "taliančina", "it"],
  ["Magyar", "maďarčina", "hu"], ["Polski", "poľština", "pl"], ["Română", "rumunčina", "ro"], ["Українська", "ukrajinčina", "uk"],
  ["Hrvatski", "chorvátčina", "hr"], ["Slovenščina", "slovinčina", "sl"], ["Português", "portugalčina", "pt"], ["Nederlands", "holandčina", "nl"],
  ["Türkçe", "turečtina", "tr"], ["العربية", "arabčina", "ar"], ["中文", "čínština", "zh"], ["日本語", "japončina", "ja"], ["हिन्दी", "hindčina", "hi"],
];
const NAVRH = ["sk", "cs", "en"]; // krajiny, kde DEED beží

export function JazykObrazovka({ onBack }: { onBack: () => void }) {
  const n = useNastaveniaAppky();
  const [q, setQ] = useState("");
  const [zavri, setZavri] = useState(0);
  const telefon = (typeof navigator !== "undefined" ? navigator.language : "sk").slice(0, 2);
  const navrh = [telefon, ...NAVRH.filter((k) => k !== telefon)].filter((k) => JAZYKY.some((j) => j[2] === k));
  const qq = bezDiakritiky(q.trim());
  const sedi = (j: [string, string, string]) => !qq || bezDiakritiky(j[0]).includes(qq) || bezDiakritiky(j[1]).includes(qq);
  const skupiny: [string, [string, string, string][]][] = [
    ["NAVRHOVANÉ", navrh.map((k) => JAZYKY.find((j) => j[2] === k)!).filter(sedi)],
    ["VŠETKY JAZYKY", JAZYKY.filter((j) => !navrh.includes(j[2])).filter(sedi)],
  ];
  const vyber = (nazov: string) => { zmenNastavenia({ jazyk: nazov }); toast(`Jazyk: ${nazov}`); setZavri((x) => x + 1); };
  return (
    <ObrazovkaSprava titul="Jazyk" onBack={onBack} zavriet={zavri}>
      {hladPole(q, setQ, "Hľadať jazyk")}
      {skupiny.map(([h, l]) => l.length > 0 && (
        <div key={h}>
          <h2 style={lbl}>{h}</h2>
          <NastKarta k="b">
            <div role="radiogroup" aria-label={h}>
              {l.map(([nazov, sk, kod], i) => { const on = n.jazyk === nazov; return (
                <button key={kod} type="button" role="radio" aria-checked={on} onClick={() => vyber(nazov)} lang={kod}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "10px 18px", border: "none", borderTop: i ? oddelovac : "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{nazov}</span><span lang="sk" style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))" }}>{kod === telefon ? "jazyk telefónu" : sk}</span></span>
                  <Radio on={on} /></button>); })}
            </div>
          </NastKarta>
        </div>))}
      {skupiny.every(([, l]) => !l.length) && <div style={pozn}>Taký jazyk nemáme. Skús iný názov.</div>}
      <div style={pozn}>Jazyk appky nemení jazyk príspevkov. Tie ti vieme preložiť ťuknutím na Preložiť.</div>
    </ObrazovkaSprava>
  );
}
// ======================= 2h · STIAHNUŤ MOJE ÚDAJE =======================
const CO: [string, string, string, string[]][] = [
  ["pr", "Profil a nastavenia", "meno, kontakty, záujmy, súhlasy", ["deed.ja", "deed.profil", "deed.nastavenia", "deed.zaujmy"]],
  ["sk", "Skutky a denník", "texty, fotky, videá, doklady", ["deed.skutky", "deed.moje", "deed.koncept"]],
  ["da", "Dary a zbierky", "kam si daroval, doklady o daroch", ["deed.dary", "deed.zbierk", "deed.oblub", "deed.pravid"]],
  ["pe", "Peňaženka", "pohyby DEED a EURC, výpisy", ["deed.penaz", "deed.wallet", "deed.karty"]],
  ["sp", "Správy a komentáre", "čo si napísal ty", ["deed.spravy", "deed.koment"]],
  ["su", "Prihlásenia a zariadenia", "kedy a odkiaľ si sa prihlásil", ["deed.zariad", "deed.blok"]],
];

export function StiahnutUdajeObrazovka({ onBack }: { onBack: () => void }) {
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
  const subor = format === "pdf" ? "deed-moje-udaje.pdf · 2,4 MB" : "deed-moje-udaje.zip · 184 MB";
  // pilot: súbor skladá appka z údajov v tomto zariadení (JSON); PDF a ZIP pripraví server
  const stiahni = () => {
    const kluce = CO.filter(([k]) => v[k]).flatMap(([, , , p]) => p);
    const data: Record<string, unknown> = { vytvorene: new Date().toISOString(), meno: ja.celeMeno, obsah: CO.filter(([k]) => v[k]).map(([, t]) => t) };
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (kluce.some((p) => k.startsWith(p))) { const x = localStorage.getItem(k); try { data[k] = JSON.parse(x ?? "null"); } catch { data[k] = x; } } } } catch { /* LS */ }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "deed-moje-udaje.json"; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Stiahnuté");
  };

  return (
    <ObrazovkaSprava titul="Stiahnuť moje údaje" onBack={onBack}>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))", padding: "0 6px" }}>Všetko, čo o tebe v DEED máme, dostaneš v jednom súbore.</div>
      {stav === null || stav === "overenie" ? <>
        <div>
          <h2 style={lbl}>ČO STIAHNUŤ</h2>
          <NastKarta k="b">
            {CO.map(([k, t, s], i) => (
              <button key={k} type="button" role="checkbox" aria-checked={v[k]} onClick={() => setV((x) => ({ ...x, [k]: !x[k] }))}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "10px 18px", border: "none", borderTop: i ? oddelovac : "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
                <Check on={v[k]} />
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{t}</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))" }}>{s}</span></span>
              </button>))}
          </NastKarta>
        </div>
        <div>
          <h2 style={lbl} id="format-nadpis">FORMÁT</h2>
          <div role="radiogroup" aria-labelledby="format-nadpis" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
            {([["pdf", "PDF", "na čítanie a tlač"], ["zip", "ZIP", "dáta a všetky fotky"]] as const).map(([k, t, s]) => (
              <button key={k} type="button" role="radio" aria-checked={format === k} onClick={() => setFormat(k)} className={format === k ? "seg-on" : undefined}
                style={{ minHeight: 56, padding: "6px 8px", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.25, ...(format === k ? {} : { background: "transparent", color: "var(--d-ink3, var(--ink3))", boxShadow: "none" }) }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{s}</span></button>))}
          </div>
        </div>
        <button type="button" disabled={!nieco} onClick={() => setStav("overenie")} style={btn(true, nieco)}>Pripraviť súbor</button>
        <div style={pozn}>Súbor obsahuje len tvoje údaje, mená iných ľudí sú skryté. Je v ňom aj znenie súhlasov tak, ako si ich odsúhlasil.</div>
      </> : stav === "priprava" ? (
        <NastKarta k="b" style={{ padding: "18px 18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><b style={{ fontSize: 16.5 }}>Pripravujeme súbor</b><span aria-live="polite" style={{ fontSize: 14, fontWeight: 800, color: "var(--sek-b)", fontVariantNumeric: "tabular-nums" }}>{pct} %</span></div>
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Príprava súboru" style={{ height: 8, borderRadius: 4, background: "var(--d-trackOff, var(--track))", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--sek-b)", transformOrigin: "left", transform: `scaleX(${pct / 100})`, transition: "transform .35s linear" }} /></div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}>Môžeš appku zavrieť. Keď bude hotový, pošleme ti oznámenie.</div>
        </NastKarta>
      ) : (
        <>
          <NastKarta k="g" style={{ padding: "18px", display: "flex", alignItems: "center", gap: 14 }}>
            <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 12, background: "var(--sek-gBg)", color: "var(--sek-g)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.check} s={20} w={2.6} /></span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16.5, fontWeight: 800 }}>Súbor je pripravený</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))", marginTop: 2 }}>{subor} · odkaz platí 7 dní</span></span>
          </NastKarta>
          <button type="button" onClick={stiahni} style={btn(true)}>Stiahnuť</button>
        </>
      )}
      {stav === "overenie" && <OverenieHarok onClose={() => setStav(null)} onOk={pripravuj} />}
    </ObrazovkaSprava>
  );
}

/** pred prípravou súboru: tvár alebo odtlačok (v pilote simulované; v produkcii WebAuthn) */
function OverenieHarok({ onClose, onOk }: { onClose: () => void; onOk: () => void }) {
  const [bezi, setBezi] = useState(false);
  const over = () => { setBezi(true); window.setTimeout(onOk, 700); };
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>Potvrď, že si to ty</span>}
      paticka={<button type="button" onClick={over} disabled={bezi} style={{ ...btn(true, !bezi), flex: 1 }}>{bezi ? "Overujem…" : "Overiť tvárou alebo odtlačkom"}</button>}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 14, background: "var(--sek-bBg)", color: "var(--sek-b)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.finger} s={26} w={2} /></span>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>Súbor obsahuje všetko o tebe. Preto ho pripravíme až po overení.</div>
      </div>
    </Harok>
  );
}

// ======================= 2i · ZAMESTNÁVATEĽ =======================
const BENEFITY: [string, string, string][] = [
  ["Sobota pre útulok", "firemná akcia · 4. 10. · prihlásených 12", "Firma pozýva zamestnancov na spoločnú sobotu v útulku. Prihlásiš sa v detaile akcie, účasť sa potvrdí na mieste."],
  ["Deň dobrovoľníctva", "jeden platený deň v roku na skutok", "Jeden pracovný deň v roku môžeš venovať skutku. Termín si dohodneš s vedúcim, skutok pridáš ako zvyčajne."],
];
const VIDI = ["že si ich zamestnanec a máš DEED", "skutky vo firemných programoch a akciách, na ktoré si sa prihlásil", "či si na akcii bol (potvrdená účasť)"];
const NEVIDI = ["tvoju karmu ani súkromné skutky", "kam a koľko daruješ", "tvoju peňaženku", "tvoju polohu mimo firemnej akcie"];
const datum = (ms: number) => new Date(ms).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
const firmaPodla = (nazov: string) => FIRMY_ADRESAR.find((f) => f.nazov === nazov);
/** pilot: kód „PEKA-2931" → firma, ktorej názov začína na PEKA (v produkcii overí server) */
const firmaPodlaKodu = (kod: string) => { const p = bezDiakritiky(kod.split("-")[0]).replace(/[^a-z]/g, ""); return p.length >= 3 ? FIRMY_ADRESAR.find((f) => bezDiakritiky(f.nazov).replace(/[^a-z]/g, "").startsWith(p)) : undefined; };

function Logo({ f, nazov, velke }: { f?: FirmaAdresar; nazov: string; velke?: boolean }) {
  const s = velke ? 52 : 40;
  const [zle, setZle] = useState(false);
  return f?.logo && !zle
    ? <img src={f.logo} alt="" onError={() => setZle(true)} style={{ width: s, height: s, borderRadius: 12, objectFit: "cover", flex: "none" }} />
    : <span aria-hidden="true" style={{ width: s, height: s, borderRadius: 12, background: "var(--sek-oBg)", color: "var(--sek-o)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: velke ? 16 : 14, fontWeight: 800, flex: "none" }}>{f?.iniciacky ?? nazov.slice(0, 2).toUpperCase()}</span>;
}
const FirmaKarta = ({ nazov, pod, children }: { nazov: string; pod: ReactNode; children?: ReactNode }) => (
  <div style={{ padding: "16px 18px", borderRadius: 20, background: "var(--goldBg)", border: "1px solid var(--sek-oBd)", boxShadow: "var(--d-hl, none)", display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Logo f={firmaPodla(nazov)} nazov={nazov} velke />
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 17, fontWeight: 800, color: "var(--d-ink, var(--ink))" }}>{nazov}</span><span style={{ display: "block", fontSize: 13.5, lineHeight: 1.45, color: "var(--d-ink2, var(--ink2))", marginTop: 2 }}>{pod}</span></span>
    </div>
    {children}
  </div>);

export function ZamestnavatelObrazovka({ onBack }: { onBack: () => void }) {
  const ja = usePouzivatel();
  const osoba = ja.celeMeno;
  const vazba = useVazbaOsoby(osoba);
  const n = useNastaveniaAppky();
  const [q, setQ] = useState("");
  const [kod, setKod] = useState("");
  const [skener, setSkener] = useState(false);
  const [benefit, setBenefit] = useState<number | null>(null);
  const qq = bezDiakritiky(q.trim()), qCisla = q.replace(/\D/g, "");
  const vysledky = qq.length >= 2 ? FIRMY_ADRESAR.filter((f) => bezDiakritiky(f.nazov).includes(qq) || (qCisla.length >= 3 && (f.ico ?? "").replace(/\s/g, "").includes(qCisla))) : [];
  const kodOk = kod.replace(/-/g, "").length >= 6;
  const pripoj = (k: string) => {
    const f = firmaPodlaKodu(k);
    if (!f) { toast("Kód nepoznáme. Over ho na personálnom."); return; }
    poziadaj(f.nazov, osoba); setKod("");
  };

  return (
    <ObrazovkaSprava titul="Zamestnávateľ" onBack={onBack}>
      {/* NEPRIPOJENÝ */}
      {(!vazba || vazba.stav === "pozvany") && <>
        <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))", padding: "0 6px" }}>Ak je tvoja firma v DEED, prepoj sa s ňou. Získaš firemné benefity a tvoje skutky pomôžu aj firme.</div>
        <div>
          <h2 style={lbl}>ČO TÝM ZÍSKAŠ</h2>
          <NastKarta k="o" style={{ padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "var(--sek-o)", display: "flex", marginTop: 1 }}><Ik d={IK.gift} /></span>
            <span style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>Záleží na tvojej firme, aké benefity pre svojich ľudí pripravila. Keď pridá nový, dozvieš sa o ňom.</span>
          </NastKarta>
        </div>
        {vazba?.stav === "pozvany" && (
          <div>
            <h2 style={lbl}>POZVÁNKA OD FIRMY</h2>
            <FirmaKarta nazov={vazba.firma} pod="ťa pozýva ako svojho zamestnanca">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" onClick={() => { odmietni(vazba.firma, osoba); toast("Pozvánka odmietnutá"); }} style={btn(false)}>Odmietnuť</button>
                <button type="button" onClick={() => { potvrd(vazba.firma, osoba); toast(`Prepojené s firmou ${vazba.firma}`); }} style={btn(true)}>Prijať</button>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--d-ink3, var(--ink3))" }}>Nepoznáš túto firmu? Odmietni, nič sa nestane.</div>
            </FirmaKarta>
          </div>)}
        <div>
          <h2 style={lbl}>NÁJDI SVOJU FIRMU</h2>
          {hladPole(q, setQ, "Názov firmy alebo IČO")}
          {vysledky.length > 0 && <NastKarta k="b" style={{ marginTop: 10 }}>
            {vysledky.map((f, i) => (
              <div key={f.nazov} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 68, padding: "12px 18px", borderTop: i ? oddelovac : "none" }}>
                <Logo f={f} nazov={f.nazov} />
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 700 }}>{f.nazov}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--d-ink3, var(--ink3))" }}>{f.mesto} · IČO {f.ico}</span></span>
                <button type="button" onClick={() => poziadaj(f.nazov, osoba)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--sek-bBd)", boxShadow: "none", background: "var(--sek-bBg)", color: "var(--sek-b)", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", flex: "none" }}>Požiadať</button>
              </div>))}
          </NastKarta>}
          {qq.length >= 2 && !vysledky.length && <div style={{ ...pozn, marginTop: 10 }}>Firmu sme nenašli. Možno ešte nie je v DEED, pozvi ju cez personálne.</div>}
        </div>
        <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 700, color: "var(--d-ink3, var(--ink3))" }}><span style={{ flex: 1, height: 1, background: "var(--d-sep, var(--cardBd))" }} />alebo<span style={{ flex: 1, height: 1, background: "var(--d-sep, var(--cardBd))" }} /></div>
        <div>
          <h2 style={lbl}>KÓD OD FIRMY</h2>
          <input value={kod} onChange={(e) => setKod(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12))} placeholder="napr. PEKA-2931" aria-label="Kód od firmy" autoComplete="off"
            style={{ width: "100%", height: 52, padding: "0 16px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 17, fontWeight: 700, letterSpacing: ".06em", color: "var(--d-ink, var(--ink))", outline: "none", fontFamily: "inherit" }} />
          <div style={{ ...pozn, marginTop: 8 }}>Kód ti dá personálne alebo ho nájdeš na firemnom QR v práci.</div>
        </div>
        <button type="button" disabled={!kodOk} onClick={() => pripoj(kod)} style={btn(true, kodOk)}>Pripojiť sa k firme</button>
        <button type="button" onClick={() => setSkener(true)} style={{ ...btn(false), display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Ik d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10" />Naskenovať firemný QR</button>
        {import.meta.env.DEV && !vazba && <button type="button" onClick={() => pozvi("Pekáreň Dobrota", osoba)} style={{ ...btn(false), minHeight: 44, fontSize: 13, fontWeight: 700 }}>Ukážka: pozvánka od firmy</button>}
      </>}

      {/* ČAKÁ */}
      {vazba?.stav === "ziadost" && <>
        <FirmaKarta nazov={vazba.firma} pod="Žiadosť sme poslali. Keď ju firma potvrdí, pošleme ti oznámenie." />
        <button type="button" onClick={() => { odpoj(vazba.firma, osoba); toast("Žiadosť zrušená"); }} style={btn(false)}>Zrušiť žiadosť</button>
        {import.meta.env.DEV && <button type="button" onClick={() => potvrd(vazba.firma, osoba)} style={{ ...btn(false), minHeight: 44, fontSize: 13, fontWeight: 700 }}>Ukážka: firma potvrdila</button>}
      </>}

      {/* PREPOJENÝ */}
      {vazba?.stav === "potvrdeny" && <>
        <FirmaKarta nazov={vazba.firma} pod={`prepojené od ${datum(vazba.potvrdene ?? vazba.kedy)}`} />
        <div>
          <h2 style={lbl}>BENEFITY OD FIRMY</h2>
          <NastKarta k="o">
            {BENEFITY.map(([t, s], i) => (
              <button key={t} type="button" onClick={() => setBenefit(i)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 68, padding: "12px 18px", border: "none", borderTop: i ? oddelovac : "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
                <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 11, background: "var(--sek-oBg)", color: "var(--sek-o)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.gift} s={19} w={2} /></span>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{t}</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))", marginTop: 2 }}>{s}</span></span>
                <Ik d="M9 6l6 6-6 6" s={16} w={2.4} c="var(--d-ink3, var(--ink3))" />
              </button>))}
          </NastKarta>
          <div style={{ ...pozn, marginTop: 8 }}>Benefity pripravuje firma. Keď pridá nový, pošleme ti oznámenie.</div>
        </div>
        <NastKarta k="b">
          <button type="button" role="switch" aria-checked={n.esgFirme} onClick={() => zmenNastavenia({ esgFirme: !n.esgFirme })} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 68, padding: "12px 18px", border: "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>Započítať moje skutky firme</span><span style={{ display: "block", fontSize: 13, color: "var(--d-ink3, var(--ink3))", marginTop: 2 }}>do ESG a CSGR správ, vždy bez tvojho mena</span></span>
            <Prepinac on={n.esgFirme} /></button>
        </NastKarta>
        <div>
          <h2 style={lbl}>ČO FIRMA VIDÍ</h2>
          <NastKarta k="b" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
            {VIDI.map((t) => <div key={t} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.45, color: "var(--d-ink2, var(--ink2))" }}><span style={{ color: "var(--sek-g)", display: "flex", marginTop: 2 }}><Ik d={IK.check} s={16} w={2.6} /></span><span><span className="sr-only">Vidí: </span>{t}</span></div>)}
            <div style={{ height: 1, background: "var(--d-sep, var(--cardBd))", margin: "4px 0" }} />
            {NEVIDI.map((t) => <div key={t} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.45, color: "var(--d-ink2, var(--ink2))" }}><span style={{ color: "var(--sek-r)", display: "flex", marginTop: 2 }}><Ik d="M6 6l12 12M18 6 6 18" s={16} w={2.6} /></span><span><span className="sr-only">Nevidí: </span>{t}</span></div>)}
          </NastKarta>
        </div>
        <button type="button" onClick={() => { odpoj(vazba.firma, osoba); toast("Odpojené od firmy"); }} style={btn(false)}>Odpojiť sa od firmy</button>
        <div style={pozn}>Po odpojení o tebe firma ďalej nič nevidí. Pri zmene zamestnania sa odpoj a pripoj k novej firme.</div>
      </>}

      {skener && <SkenerFirmy onClose={() => setSkener(false)} onKod={(k) => { setSkener(false); setKod(k); pripoj(k); }} />}
      {benefit !== null && <Harok onClose={() => setBenefit(null)} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{BENEFITY[benefit][0]}</span>}>
        <div style={{ fontSize: 13.5, color: "var(--d-ink3, var(--ink3))" }}>{BENEFITY[benefit][1]}</div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--d-ink2, var(--ink2))" }}>{BENEFITY[benefit][2]}</div>
      </Harok>}
    </ObrazovkaSprava>
  );
}

/** firemný QR: text „DEED-FIRMA:<KÓD>" alebo samotný kód */
function SkenerFirmy({ onClose, onKod }: { onClose: () => void; onKod: (k: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const naKod = useRef(onKod);
  useEffect(() => { naKod.current = onKod; });
  const [chyba, setChyba] = useState(false);
  useEffect(() => {
    let stop: (() => void) | undefined, zrusene = false, hotovo = false;
    import("@zxing/browser").then(({ BrowserQRCodeReader }) => {
      if (zrusene) return;
      new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video.current ?? undefined, (r, _e, c) => {
        stop = () => c.stop();
        if (!r || hotovo) return;
        hotovo = true; c.stop();
        naKod.current(r.getText().replace(/^DEED-FIRMA:/i, "").trim().toUpperCase());
      }).catch(() => setChyba(true));
    }).catch(() => setChyba(true));
    return () => { zrusene = true; try { stop?.(); } catch { /* už zastavené */ } };
  }, []);
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>Firemný QR</span>}>
      {chyba
        ? <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>Kamera nie je dostupná. Napíš kód od firmy do poľa Kód od firmy.</div>
        : <><video ref={video} muted playsInline style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 18, background: "#000" }} />
          <div style={{ fontSize: 13.5, color: "var(--d-ink3, var(--ink3))", textAlign: "center" }}>Namier kameru na firemný QR v práci.</div></>}
    </Harok>
  );
}
