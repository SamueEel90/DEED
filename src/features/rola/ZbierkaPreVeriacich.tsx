// ============================================================
// OPRAVY 161 · Zbierka pre veriacich (pohreb, svadba, iné) — Správa farnosti → Zbierky → + Pridať zbierku.
// Nezávisí od hlavnej zbierky: peniaze idú príjemcovi, podiel farnosti (0 – 3 %, po 0,5 %, najviac 100 €) na účet farnosti.
// Jeden postup pre všetky druhy, mení sa len text: sken príjemcu (Overovateľ, osobne) · oznámenie na stránke farnosti
// (vlastné alebo zo šablóny) · rozdelenie · kód · hotovo. Prototyp „Sprava farnosti - prvy prichod" (PZT).
// ============================================================
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { DeedQr } from "@/components/deedqr";
import { TESTOVACIA } from "@/lib/testovacia";
import { pridajPrispevok, type VieraFeedItem } from "@/features/viera/mock";
import { spustiZbierku, prazdnaZbierka, PODIEL_MAX, PODIEL_KROK, PODIEL_STROP_EUR, type SpustenaZbierka, type ZbierkaFarnosti } from "@/lib/novaZbierka";

type Druh = Exclude<ZbierkaFarnosti["druh"], "farnost">;
const PZT: Record<Druh, { t: string; nazov: string; chip: string; kto: string; komu: string; ozn: string; sabS: string; kedy: string; foto: string; meno: string; uvod: string; po: string; pred: string; k1: string; k2: string; prijemcovia: string }> = {
  pohreb: { t: "Pohreb", nazov: "Pohrebná zbierka", chip: "POHREBNÁ ZBIERKA", kto: "Pozostalý", komu: "pozostalému", ozn: "parte", sabS: "fotka, meno, dátumy, pohreb, kto oznamuje", kedy: "ROZLÚČKA · KEDY (NEPOVINNÉ)", foto: "Fotka zosnulého", meno: "MENO ZOSNULÉHO", uvod: "S bolesťou v srdci oznamujeme, že nás navždy opustila", po: "pohrebe", pred: "Rozlúčka", k1: "Sken pozostalého", k2: "Parte", prijemcovia: "Rodina" },
  svadba: { t: "Svadba", nazov: "Svadobná zbierka", chip: "SVADOBNÁ ZBIERKA", kto: "Snúbenec", komu: "snúbencovi", ozn: "svadobné oznámenie", sabS: "fotka, mená, dátum a miesto sobáša", kedy: "SOBÁŠ · KEDY (NEPOVINNÉ)", foto: "Fotka snúbencov", meno: "MENÁ SNÚBENCOV", uvod: "S radosťou oznamujeme, že si povieme áno", po: "svadbe", pred: "Svadba", k1: "Sken snúbenca", k2: "Oznámenie", prijemcovia: "Snúbenci" },
  ine: { t: "Iné", nazov: "Zbierka pre veriaceho", chip: "ZBIERKA PRE VERIACEHO", kto: "Príjemca", komu: "príjemcovi", ozn: "oznámenie", sabS: "fotka, meno, o čo ide, dátum", kedy: "KEDY (NEPOVINNÉ)", foto: "Fotka", meno: "MENO PRÍJEMCU", uvod: "Prosíme vás o pomoc", po: "udalosti", pred: "Zbierka", k1: "Sken príjemcu", k2: "Oznámenie", prijemcovia: "Príjemca" },
};
const QR_S = 15; // QR na sken platí 15 sekúnd a sám sa obnovuje
const pct = (n: number) => `${n.toLocaleString("sk-SK")} %`;
const casT = () => new Date().toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
const nahodny = () => Math.random().toString(36).slice(2, 10);

const pole: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const lab: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" };
const tlZ: CSSProperties = { height: 50, padding: "0 20px", border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff", boxShadow: "none" };
const tlO: CSSProperties = { height: 50, padding: "0 18px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" };

interface Oznam { meno: string; roky: string; rod: string; kedy: string; kde: string; kto: string }

export function ZbierkaPreVeriacich({ stranka, menoFarnosti, ucetFarnosti, mobil, toast, onZavri, onHotovo }: {
  stranka: string; menoFarnosti: string; ucetFarnosti: string; mobil: boolean; toast: (m: string) => void;
  onZavri: () => void; onHotovo: (z: SpustenaZbierka, sprava: string) => void;
}) {
  const [krok, setKrok] = useState(1);
  const [druh, setDruh] = useState<Druh>("pohreb");
  const T = PZT[druh];
  const farV = menoFarnosti.toLocaleUpperCase("sk-SK");

  // ---- 1 · sken príjemcu: QR sa obnovuje každých 15 s ----
  const [token, setToken] = useState(nahodny);
  const [zostava, setZostava] = useState(QR_S);
  useEffect(() => {
    if (krok !== 1) return;
    const t = window.setInterval(() => setZostava((s) => { if (s > 1) return s - 1; setToken(nahodny()); return QR_S; }), 1000);
    return () => window.clearInterval(t);
  }, [krok]);
  const [skenCas, setSkenCas] = useState("");

  // ---- 2 · oznámenie ----
  const [rezim, setRezim] = useState<"" | "vl" | "sab">("");
  const [o, setO] = useState<Oznam>({ meno: "", roky: "", rod: "", kedy: "", kde: "", kto: "" });
  const [subor, setSubor] = useState<string>("");
  const [foto, setFoto] = useState<string>("");
  const zmenO = (k: keyof Oznam) => (e: { target: { value: string } }) => setO((x) => ({ ...x, [k]: e.target.value }));
  const nacitajSubor = (f: File | undefined, set: (s: string) => void) => {
    if (!f) return;
    const r = new FileReader(); r.onload = () => set(String(r.result ?? "")); r.readAsDataURL(f);
  };
  const rozT = o.kedy || o.kde ? `${T.pred} ${[o.kedy, o.kde].filter(Boolean).join(", ")}.` : `Termín ${druh === "pohreb" ? "rozlúčky" : "oznámime neskôr"}${druh === "pohreb" ? " oznámime." : "."}`;
  const zverejni = () => {
    if (!o.meno.trim()) { toast("Doplňte meno."); return; }
    const it: VieraFeedItem = {
      id: `naboz-${Date.now()}`, comp: "data", typ: "skutok", modul: "charity", kat: "Komunita",
      ntyp: "oznam", skore: 6, typSituacie: "normal", dni: 0, podpora: 0, farnostId: stranka, cirkev: "",
      komunita: menoFarnosti, overena: true, nazov: `${T.ozn.charAt(0).toUpperCase()}${T.ozn.slice(1)} · ${o.meno.trim()}`, tag: "Oznam",
      popis: rezim === "sab" ? [T.uvod, o.meno.trim(), [o.rod && `rod. ${o.rod}`, o.roky].filter(Boolean).join(" · "), rozT, o.kto && `Oznamuje ${o.kto}`].filter(Boolean).join(" · ") : [o.meno.trim(), o.rod && `rod. ${o.rod}`, rozT].filter(Boolean).join(" · "),
      fotky: rezim === "vl" ? (subor.startsWith("data:image/") ? [subor] : undefined) : foto ? [foto] : undefined,
      ukat: druh === "pohreb" ? "pohreb" : druh === "svadba" ? "svadba" : undefined, reakciaTyp: druh === "pohreb" ? "kondolencia" : druh === "svadba" ? "blahozelanie" : undefined,
      vytvorene: Date.now(), platnostDni: 7, linkedZbierka: true,
    };
    pridajPrispevok(stranka, it);
    setKrok(3);
  };

  // ---- 3 · rozdelenie ----
  const [podiel, setPodiel] = useState(PODIEL_MAX);
  const stopy = Array.from({ length: PODIEL_MAX / PODIEL_KROK + 1 }, (_, i) => i * PODIEL_KROK);

  // ---- 5 · hotovo: zbierka sa zapečatí až po potvrdení kódom ----
  const [z, setZ] = useState<SpustenaZbierka | null>(null);
  const potvrdene = async () => {
    const nazov = `${T.pred} · ${o.meno.trim() || "—"}`;
    try {
      // PLACEBO — karta 56D / OPRAVY 161: výplatu príjemcovi (jeho overený účet) a podiel farnosti rozdelí server;
      // kým to nie je, zbierka nesie účet farnosti a príjemcu v nastavení.
      const nova = await spustiZbierku(stranka, {
        ...prazdnaZbierka(), nazov, popis: `<p>${rozT}</p>`, media: foto ? [{ id: 1, typ: "foto", src: foto }] : [], cielTyp: "otv",
        farnost: { druh, podiel, prijemca: { meno: T.kto, overeny: skenCas }, oznamenie: { meno: o.meno.trim(), rodena: o.rod || undefined, roky: o.roky || undefined, kedy: o.kedy || undefined, kde: o.kde || undefined, kto: o.kto || undefined, vlastne: rezim === "vl" ? "ano" : undefined } },
      }, ucetFarnosti, "nabozenstvo");
      setZ(nova); setKrok(5);
    } catch (e) { toast(e instanceof Error ? e.message : "Zbierku sa nepodarilo spustiť."); }
  };

  const kroky = [`1 · ${T.k1}`, `2 · ${T.k2}`, "3 · Rozdelenie", "4 · Kód", "5 · Hotovo"];
  const test = (t: string, onClick: () => void) => TESTOVACIA
    ? <button type="button" onClick={onClick} style={{ ...tlO, alignSelf: "flex-start", height: 44, borderStyle: "dashed" }}>{t}</button>
    : <span style={{ fontSize: 13, color: "var(--ink3)" }}>pripravujeme</span>; // PLACEBO — karta 56D / OPRAVY 161: sken a kód v appke príjemcu
  const policko = (t: string, k: keyof Oznam, ph: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={lab}>{t}</span><input value={o[k]} onChange={zmenO(k)} placeholder={ph} style={pole} /></label>);
  const dvaStlpce = (a: ReactNode, b: ReactNode) => <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 10 }}>{a}{b}</div>;
  const spatZverejnit = <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <button type="button" onClick={() => setRezim("")} style={tlO}>‹ Späť</button>
    <button type="button" onClick={zverejni} aria-disabled={!o.meno.trim()} style={{ ...tlZ, opacity: o.meno.trim() ? 1 : 0.5 }}>Zverejniť {T.ozn} a pripojiť zbierku ›</button>
  </div>;

  return (
    <section aria-label={T.nazov} style={{ flex: "none", borderRadius: 22, background: "var(--card)", border: "2px solid var(--green)", padding: mobil ? "16px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ flex: 1, fontSize: 19 }}>{T.nazov} · farnosť overuje</b>
        <button type="button" onClick={onZavri} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontSize: 18, color: "var(--ink2)", boxShadow: "none" }}>×</button>
      </div>
      <div role="list" aria-label="Kroky" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {kroky.map((t, i) => { const n = i + 1; return <span key={t} role="listitem" aria-current={n === krok ? "step" : undefined} style={{ height: 32, padding: "0 12px", borderRadius: 16, background: n === krok ? "#4B7A35" : n < krok ? "var(--gSoft)" : "var(--btn)", color: n === krok ? "#fff" : n < krok ? "var(--gInk)" : "var(--ink3)", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{t}</span>; })}
      </div>
      {krok <= 2 && <div role="radiogroup" aria-label="Druh zbierky" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(Object.keys(PZT) as Druh[]).map((k) => { const on = k === druh; return (
          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setDruh(k)} style={{ height: 44, padding: "0 18px", borderRadius: 22, border: `${on ? 2 : 1}px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink)", boxShadow: "none" }}>{PZT[k].t}</button>); })}
      </div>}

      {krok === 1 && <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: "none", width: 168, height: 168, borderRadius: 18, background: "#fff", padding: 8, boxSizing: "border-box", display: "flex" }}><DeedQr data={`https://deed.sk/overit/${stranka}/${token}`} size={152} variant="svetly" /></span>
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 17 }}>{T.kto} naskenuje QR vo svojej appke</b>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Musí byť pri vás osobne s telefónom. Rola <b>Overovateľ</b> je zapnutá pri QR farnosti. Kód platí 15 sekúnd a sám sa obnovuje.</span>
          <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: "100%", background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${zostava / QR_S})`, transition: "transform 1s linear" }} /></span>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>ešte {zostava} s · potom nový QR</span>
          {test("Simulovať sken (test)", () => { setSkenCas(casT()); setKrok(2); })}
        </div>
      </div>}

      {krok === 2 && <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
          <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 }}>✓</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15, color: "var(--gInk)" }}>{T.kto} · pripojený</b><span style={{ fontSize: 13, color: "var(--ink2)" }}>overený účet · sken o {skenCas} na fare</span></span>
        </div>
        {rezim === "" && <>
          <b style={{ fontSize: 16 }}>Ku ktorému oznámeniu pripojiť zbierku?</b>
          <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
            {([["vl", `+ Nahrať vlastné ${T.ozn}`, "plagát od rodiny (obrázok alebo PDF)"], ["sab", `+ Vytvoriť ${T.ozn} zo šablóny`, T.sabS]] as ["vl" | "sab", string, string][]).map(([k, t, s]) => (
              <button key={k} type="button" onClick={() => setRezim(k)} style={{ minHeight: 76, padding: "12px 16px", borderRadius: 16, border: "1.5px dashed var(--gBd)", background: "var(--field)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", flexDirection: "column", gap: 4, color: "var(--ink)", boxShadow: "none" }}>
                <b style={{ fontSize: 15.5, color: "var(--green)" }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span>
              </button>))}
          </div>
        </>}
        {rezim === "vl" && <>
          <b style={{ fontSize: 16 }}>Vlastné {T.ozn} od rodiny</b>
          <label style={{ minHeight: 76, padding: "12px 16px", borderRadius: 16, border: "1.5px dashed var(--gBd)", background: "var(--field)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ fontSize: 15.5, color: "var(--green)" }}>{subor ? `${T.ozn.charAt(0).toUpperCase()}${T.ozn.slice(1)} je nahraté ✓` : `+ Nahrať ${T.ozn}`}</b>
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>fotka z mobilu, obrázok alebo PDF z mailu či USB</span>
            <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => nacitajSubor(e.target.files?.[0], setSubor)} />
          </label>
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Oznámenie ukážeme tak, ako je. Doplňte len to, podľa čoho ho ľudia nájdu a čo sa ukáže v kalendári farnosti.</span>
          {policko("MENO A PRIEZVISKO", "meno", "Mária Kováčová")}
          {druh === "pohreb" && policko("RODENÁ (PRI ŽENE, NEPOVINNÉ)", "rod", "Hudecová")}
          {dvaStlpce(policko(T.kedy, "kedy", "napr. piatok 10. 10. o 14:00"), policko("KDE (NEPOVINNÉ)", "kde", "napr. Dom smútku Opatová"))}
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>Termín môžete doplniť neskôr, sledujúci dostanú upozornenie. V hlavičke bude farnosť.</span>
          {spatZverejnit}
        </>}
        {rezim === "sab" && <>
          <b style={{ fontSize: 16 }}>Nové {T.ozn} zo šablóny farnosti</b>
          <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1.2fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <span style={{ flex: "none", width: 64, height: 64, borderRadius: 12, background: foto ? `url('${foto}') center/cover no-repeat var(--field)` : "var(--field)", border: "1px solid var(--cardBd)", filter: druh === "pohreb" ? "grayscale(1)" : undefined }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{T.foto}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>nepovinná{druh === "pohreb" ? ", ukáže sa čiernobielo" : ""}</span><span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>{foto ? "Zmeniť fotku" : "Pridať fotku"}</span></span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => nacitajSubor(e.target.files?.[0], setFoto)} />
              </label>
              {policko(T.meno, "meno", "Mária Kováčová")}
              {dvaStlpce(policko("ROKY", "roky", "1938 – 2026"), druh === "pohreb" ? policko("RODENÁ (PRI ŽENE, NEPOVINNÉ)", "rod", "Hudecová") : <span />)}
              {dvaStlpce(policko(T.kedy, "kedy", "napr. piatok 10. 10. o 14:00"), policko("KDE (NEPOVINNÉ)", "kde", "napr. Dom smútku Opatová"))}
              <span style={{ fontSize: 13, color: "var(--ink3)" }}>Ak termín ešte neviete, nechajte prázdne a doplňte neskôr. Sledujúci dostanú upozornenie.</span>
              {policko("OZNAMUJE", "kto", "syn Peter s rodinou")}
              <span style={{ fontSize: 13, color: "var(--ink3)" }}>V hlavičke bude farnosť, ktorá za zbierku zodpovedá. Text sa dá upraviť aj po zverejnení.</span>
            </div>
            <div aria-label="Náhľad oznámenia" style={{ borderRadius: 16, border: "1px solid var(--cardBd)", background: "#fff", color: "#14110B", padding: "20px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "#5B5D53" }}>{farV} OZNAMUJE</span>
              {foto && <span style={{ width: 96, height: 96, borderRadius: 12, background: `url('${foto}') center/cover no-repeat`, filter: druh === "pohreb" ? "grayscale(1)" : undefined }} />}
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{T.uvod}</span>
              <b style={{ fontSize: 22, lineHeight: 1.2 }}>{o.meno || "—"}</b>
              {(o.rod || o.roky) && <span style={{ fontSize: 14 }}>{o.rod ? `rod. ${o.rod} · ` : ""}{o.roky}</span>}
              <span style={{ fontSize: 14, lineHeight: 1.5 }}>{rozT}</span>
              {o.kto && <span style={{ fontSize: 13.5, color: "#5B5D53" }}>Oznamuje {o.kto}</span>}
            </div>
          </div>
          {spatZverejnit}
        </>}
      </>}

      {krok === 3 && <>
        <b style={{ fontSize: 17 }}>Rozdelenie zbierky</b>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Dohodnite sa s rodinou. Farnosť najviac {pct(PODIEL_MAX)}, po {pct(PODIEL_KROK)}, môže byť aj 0 %. <b>Farnosť dostane najviac {PODIEL_STROP_EUR} €</b>, všetko nad to ide rodine.</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setPodiel((p) => Math.max(0, p - PODIEL_KROK))} aria-label="O 0,5 % menej" style={{ ...tlO, width: 50, padding: 0, fontSize: 22 }}>−</button>
          <div role="radiogroup" aria-label="Podiel farnosti" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {stopy.map((v) => { const on = v === podiel; return <button key={v} type="button" role="radio" aria-checked={on} onClick={() => setPodiel(v)} style={{ minWidth: 52, height: 44, padding: "0 8px", borderRadius: 12, border: `${on ? 2 : 1}px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : v < podiel ? "var(--field)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 600, color: on ? "var(--gInk)" : "var(--ink2)", boxShadow: "none" }}>{v.toLocaleString("sk-SK")}</button>; })}
          </div>
          <button type="button" onClick={() => setPodiel((p) => Math.min(PODIEL_MAX, p + PODIEL_KROK))} aria-label="O 0,5 % viac" style={{ ...tlO, width: 50, padding: 0, fontSize: 22 }}>+</button>
          <b style={{ fontSize: 16 }}>Farnosť {pct(podiel)}</b>
        </div>
        <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", height: 44, fontSize: 13.5, fontWeight: 800 }}>
          <span style={{ flex: 100 - podiel, background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", padding: "0 12px", whiteSpace: "nowrap" }}>{T.prijemcovia} · {pct(100 - podiel)}</span>
          <span style={{ flex: Math.max(podiel, 0.001) * 4, background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", whiteSpace: "nowrap" }}>{podiel ? `Farnosť ${pct(podiel)}` : "0 %"}</span>
        </div>
        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Zbierka beží do 7 dní po {T.po}, môžete ju ukončiť skôr. Rozdelenie uvidí darca pred darom. Po zapečatení sa nemení.</span>
        <button type="button" onClick={() => setKrok(4)} style={{ ...tlZ, alignSelf: "flex-start" }}>Zapečatiť</button>
      </>}

      {krok === 4 && <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span aria-hidden="true" style={{ flex: "none", width: 44, height: 44, borderRadius: "50%", background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>✓</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 17 }}>Kód sme poslali: {T.komu}</b>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Príde mu ako upozornenie v appke. Napíše ho a potvrdí rozdelenie ({T.prijemcovia.toLowerCase()} {pct(100 - podiel)}, farnosti {pct(podiel)}). Kód platí 5 minút.</span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={() => toast("Kód sme poslali znova.")} style={{ ...tlO, height: 44 }}>Poslať znova</button>
            {test("Simulovať potvrdenie (test)", () => void potvrdene())}
          </span>
        </div>
      </div>}

      {krok === 5 && z && <>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)", flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{T.chip} · ZBIERKU OVERILA {farV}</span>
            <b style={{ fontSize: 17 }}>{z.nazov}</b>
            <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{T.prijemcovia.toLowerCase()} {pct(100 - podiel)} · farnosti {pct(podiel)} · do 7 dní po {T.po} · zapečatené</span>
          </span>
          <span style={{ height: 24, padding: "0 10px", borderRadius: 9, background: "#4B7A35", color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center" }}>BEŽÍ</span>
        </div>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Zbierka je pripojená k oznámeniu na stránke farnosti. {T.kto} ju môže zdieľať, peniaze idú priamo jemu, bez mena = Bohu známy darca.</span>
        <button type="button" onClick={() => onHotovo(z, `${T.nazov} beží. Nájdete ju nižšie v Ďalších zbierkach.`)} style={{ ...tlZ, alignSelf: "flex-start" }}>Hotovo · späť do Zbierok</button>
      </>}
    </section>);
}
