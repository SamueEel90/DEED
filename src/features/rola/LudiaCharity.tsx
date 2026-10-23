// ============================================================
// OPRAVY 404 · Ľudia v správe charity (prototyp „Ludia charity - pracovnici.dc.html“).
// Štatutár smie všetko. Pracovníkom vyberie, čo smú: Všetko okrem peňazí · Len obsah · Vybrať sám (8 prepínačov).
// Pozvaný dostane oznámenie v appke (0125), práva má až po Prijať. Server stráži práva podľa zoznamu (0129).
// Úložisko: nastavenia_stranky, kľúč „ludia“ (ako Ľudia farnosti) — riadok { id, n, k: e-mail, r: "Pracovník", caka, p, prava }.
// Pracovník s právom „Pridávať pracovníkov“ mení ostatných pracovníkov, nie seba (0129 ludia_zmena_citliva).
// OPRAVY 502 (balík 44): 1. Čo smie (charitné, + náhľad: čo uvidí v Správe) · Ako ho voláte · 2. Má účet v DEED+? ako farnosť:
// e-mail → oznámenie, alebo pozvánka cez QR a odkaz na 48 h (PozvankaOdkazom). Výplaty sa zapínajú podržaním,
// o každej výplate pracovníka dostane štatutár upozornenie (server 0160). Jediné miesto pozvánky — Nastavenia sem len odkážu.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as PEv, type KeyboardEvent as KEv, type MouseEvent as MEv } from "react";
import { citajNastavenie, maNastavenie, zapisNastavenie, useZmenyNastaveni } from "@/lib/nastaveniaStranky";
import { PRAVA, PREDVOLBY, PRACOVNIK, predvolbaZ, smieText, useMojEmail, useMojePrava, type Pravo, type Predvolba } from "@/lib/pravaPracovnika";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";
import { KartaNastavenia, IK_PRIDAT_CLOVEKA } from "@/features/rola/KartaNastavenia";
import { DeedZnacka } from "@/components/DeedZnacka";
import { odkazPozvanky } from "@/lib/pozvankaSpravy";
import { novaPozvanka, stavPozvanky, useMinuta, KartaPozvanky, AkoPrebieha, NaMiesteQr } from "./PozvankaOdkazom";
import { usePouzivatel } from "@/lib/pouzivatel";

type Caka = boolean | "odkaz" | "odmietol" | "miesto";
type Clovek = { id: number; n?: string; /** OPRAVY 524: meno z profilu, keď prijal cez QR na mieste */ m?: string; k: string; r: string; caka?: Caka; p?: string; prava?: Pravo[]; /** pozvánka cez odkaz: platí do (ms) a text · kedy prijal (ms) */ dos?: number; do?: string; prijal?: number };

const ZELENA = "#4B7A35", CERV = "#A34A2A";
const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const pole: CSSProperties = { height: 52, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15.5, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const kick: CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", paddingTop: 4 };
const hlaskaSt: CSSProperties = { display: "block", padding: "10px 12px", borderRadius: 12, background: "var(--gSoft)", border: `1.5px solid ${ZELENA}`, fontSize: 14, fontWeight: 700, color: "var(--gInk)" };
const odkazSt: CSSProperties = { alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", color: ZELENA, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };
const okMail = (m: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.trim());
const seg = (on: boolean): CSSProperties => ({ flex: 1, minHeight: 44, padding: "0 12px", border: "none", borderRadius: 10, background: on ? "var(--green)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: on ? "#fff" : "var(--ink2)" });
const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" };
/** OPRAVY 502 (4): sekcie Správy a právo, ktoré na ne treba (Nástroje vidí každý v Správe) — ako PRAVO_SUB v SpravaStranky */
const SEKCIE: [string, Pravo | null][] = [["Zbierky", "zbierky"], ["Obsah", "obsah"], ["Ľudia", "ludia"], ["Peňaženka", "penazenka_vidiet"], ["Nástroje", null], ["Nastavenia", "nastavenia"]];
const VYPLATY_VETA = "Smie posielať peniaze z účtu charity";

/** čo uvidí v Správe — mení sa hneď pri zmene voľby */
function NahladPrav({ prava }: { prava: Pravo[] }) {
  return (
    <div aria-label="Čo uvidí v Správe" style={{ borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--field)", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ČO UVIDÍ V SPRÁVE</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "2px 12px" }}>
        {SEKCIE.map(([t, pr]) => { const ano = !pr || prava.includes(pr); return (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, fontSize: 14, fontWeight: 700, color: ano ? "var(--ink)" : "var(--ink3)" }}>
            {ano ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={ZELENA} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              : <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>}
            <span>{t} <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· {ano ? "uvidí" : "neuvidí"}</span></span>
          </span>); })}
      </div>
    </div>);
}

/** prepínač práva; „Peňaženka · výplaty“ sa zapína podržaním 1,5 s (vypína ťuknutím) */
function PrepinacPrava({ k, t, s, on, prvy, onZmena }: { k: Pravo; t: string; s: string; on: boolean; prvy: boolean; onZmena: (on: boolean) => void }) {
  const drzat = k === "penazenka_vyplaty" && !on;
  const [drz, setDrz] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const poDrzani = useRef(false); // klik, ktorý príde po dokončenom podržaní, prepínač hneď nevypne
  const zacni = () => { setDrz(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => { setDrz(false); poDrzani.current = true; onZmena(true); }, 1500); };
  const pusti = () => { window.clearTimeout(tm.current); setDrz(false); };
  const ovl = drzat
    ? { onPointerDown: (e: PEv<HTMLButtonElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); zacni(); }, onPointerUp: pusti, onPointerCancel: pusti, onContextMenu: (e: MEv) => e.preventDefault(),
        onKeyDown: (e: KEv) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }, onKeyUp: (e: KEv) => { if (e.key === "Enter" || e.key === " ") pusti(); } }
    : { onPointerDown: () => { poDrzani.current = false; }, onKeyDown: () => { poDrzani.current = false; }, onClick: () => { if (poDrzani.current) { poDrzani.current = false; return; } onZmena(!on); } };
  const vypl = k === "penazenka_vyplaty";
  return (
    <button type="button" role="switch" aria-checked={on} {...ovl}
      style={{ position: "relative", overflow: "hidden", width: "100%", minHeight: 56, padding: "8px 0", border: "none", borderTop: prvy ? "none" : "1px solid var(--cardBd)", background: "transparent", display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none", touchAction: drzat ? "none" : undefined, userSelect: drzat ? "none" : undefined }}>
      {drzat && <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(75,122,53,.16)", transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? 1.5 : 0.2}s linear` }} />}
      <span style={{ position: "relative", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 15 }}>{t}</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{vypl ? VYPLATY_VETA : s}</span>
        {drzat && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gInk)" }}>{drz ? "Držte…" : "Zapnete podržaním"}</span>}
        {vypl && on && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gInk)" }}>O každej výplate dostane štatutár upozornenie.</span>}</span>
      <span aria-hidden="true" style={{ position: "relative", width: 50, height: 30, flex: "none", borderRadius: 15, background: on ? ZELENA : "#CFC8BA", transition: "background .2s" }}>
        <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transform: on ? "translateX(20px)" : "none", transition: "transform .2s" }} /></span>
    </button>);
}

export function LudiaCharity({ mobil, strankaId, meno: menoCharity }: { mobil: boolean; strankaId: string; meno: string }) {
  useZmenyNastaveni();
  const teraz0 = useMinuta();
  const mojeP = useMojePrava(), mojMail = useMojEmail();
  const jaStatutar = mojeP === null, smiemPridavat = jaStatutar || mojeP.includes("pridavat");
  const L = (maNastavenie("ludia") ? citajNastavenie("ludia") : []) as Clovek[];
  const ulozL = (a: Clovek[]) => zapisNastavenie("ludia", a);
  const prac = L.filter((x) => x.r === PRACOVNIK);

  const [form, setForm] = useState<null | "nove" | number>(null);
  const [mail, setMail] = useState("");
  const [popis, setPopis] = useState("");
  const [pred, setPred] = useState<Predvolba | null>(null);
  const [prava, setPrava] = useState<Pravo[]>([]);
  const [hl, setHl] = useState<{ id: string; t: string } | null>(null);
  const [cesta, setCesta] = useState(0);
  const [poz, setPoz] = useState<{ id: number; do: string } | null>(null);
  const [znova, setZnova] = useState<number | null>(null);
  // OPRAVY 524: „Áno, má účet“ → Je pri vás (QR na mieste, predvolené) · Nie je pri vás (e-mail)
  const [kde, setKde] = useState(0);
  const [miestoId, setMiestoId] = useState<number | null>(null);
  const ja = usePouzivatel();
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const hlas = (id: string, t: string) => { window.clearTimeout(tm.current); setHl({ id, t }); tm.current = window.setTimeout(() => setHl(null), 3500); };

  const jeVy = (x: Clovek) => !!mojMail && (x.k ?? "").trim().toLowerCase() === mojMail;
  const otvorNovy = () => { setForm("nove"); setMail(""); setPopis(""); setPred(null); setPrava([]); setHl(null); setCesta(0); setPoz(null); setKde(0); setMiestoId(null); };
  const otvorUpr = (x: Clovek) => { const p = x.prava ?? []; setForm(x.id); setPopis(x.p ?? ""); setPred(predvolbaZ(p)); setPrava([...p]); setHl(null); };
  const upr = typeof form === "number" ? prac.find((y) => y.id === form) : undefined;
  const jeNovy = form === "nove";

  // pozvánka cez odkaz: práva a popis idú s ňou; keď ich štatutár ešte zmení, zmenia sa aj v pozvánke
  const nastavPrava = (p: Pravo[]) => { setPrava(p); const ids = [poz?.id, miestoId].filter((x): x is number => x != null); if (ids.length) ulozL(L.map((y) => (ids.includes(y.id) ? { ...y, prava: p } : y))); };
  const vytvor = () => { if (!pred) return; const { id, dos, doT } = novaPozvanka();
    ulozL([...L, { id, n: "", k: `pozvánka cez odkaz · platí do ${doT}`, r: PRACOVNIK, caka: "odkaz", do: doT, dos, p: popis.trim() || undefined, prava }]); setPoz({ id, do: doT }); };
  const spravaZ = (id: number, doT: string) => `${menoCharity || "Charita"} vás pozýva do správy stránky ako pracovníka. Ťuknite na odkaz, prihláste sa a ťuknite Prijať: ${odkazPozvanky(strankaId, id).replace("https://", "")} · platí do ${doT}.`;
  const poslatZnova = (x: Clovek) => { const { id, dos, doT } = novaPozvanka();
    ulozL(L.map((y) => (y.id === x.id ? { ...y, id, k: `pozvánka cez odkaz · platí do ${doT}`, caka: "odkaz" as Caka, do: doT, dos } : y))); setForm(null); setZnova(id); hlas(String(id), "Nová pozvánka ✓ Platí 48 hodín. Pošlite mu ju."); };
  const potvrd = () => {
    if (jeNovy) {
      if (!okMail(mail) || !pred) return;
      const m = mail.trim().toLowerCase();
      if (L.some((y) => (y.k ?? "").trim().toLowerCase() === m)) { hlas("form", "Tento e-mail už je v zozname"); return; }
      const id = Date.now();
      ulozL([...L, { id, n: "", k: m, r: PRACOVNIK, caka: true, p: popis.trim() || undefined, prava }]);
      setForm(null);
      hlas(String(id), "Pozvaný ✓ Príde mu oznámenie v appke. Keď ťukne Prijať, môže začať.");
    } else if (upr) {
      ulozL(L.map((y) => (y.id === upr.id ? { ...y, p: popis.trim() || undefined, prava } : y)));
      setForm(null);
      hlas(String(upr.id), `Uložené ✓ ${smieText(prava)}`);
    }
  };
  const odober = () => { if (!upr) return; ulozL(L.filter((y) => y.id !== upr.id)); setForm(null); hlas("zoz", `Odobratý ✓ ${upr.n || upr.k}`); };
  const pozvatZnova = () => { if (!upr) return; ulozL(L.map((y) => (y.id === upr.id ? { ...y, caka: true } : y))); setForm(null); hlas(String(upr.id), "Pozvaný znova ✓ Príde mu oznámenie v appke."); };

  const sirka: CSSProperties = { maxWidth: 560, width: "100%", display: "flex", flexDirection: "column", gap: 14, alignSelf: mobil ? "stretch" : "flex-start" };

  // ---------- formulár: pridať pracovníka / čo smie ----------
  if (form !== null && (jeNovy || upr)) {
    const okM = okMail(mail), ok = jeNovy ? okM && !!pred : true;
    const potvrdT = jeNovy ? (!pred ? "Vyberte, čo smie" : !okM ? "Najprv napíšte jeho e-mail" : "Pozvať") : "Uložiť";
    return (
      <div style={sirka}>
        <button type="button" onClick={() => setForm(null)} style={odkazSt}>‹ Späť na zoznam</button>
        <span style={{ fontSize: 24, fontWeight: 800 }}>{jeNovy ? "Pridať pracovníka" : "Čo smie"}</span>
        <div style={{ ...karta, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {upr && <span style={{ fontSize: 16, fontWeight: 800, overflowWrap: "anywhere" }}>{(upr.caka === "odkaz" ? "Pozvaný cez odkaz" : upr.n || upr.k) + (upr.p ? ` · ${upr.p}` : "")}</span>}
          {upr && <input value={popis} onChange={(e) => setPopis(e.target.value.slice(0, 40))} placeholder="Popis, napr. referentka, účtovníčka (nepovinné)" aria-label="Popis" style={pole} />}
          <span style={{ fontSize: 16, fontWeight: 800, paddingTop: 4 }}>{jeNovy ? "1. Čo smie" : "Čo smie"}</span>
          <div role="radiogroup" aria-label="Čo smie" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PREDVOLBY.map(([k, t, s, set]) => { const on = pred === k; return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => { setPred(k); if (k !== "vlastne") nastavPrava([...set]); }}
                style={{ minHeight: 60, padding: "10px 14px", borderRadius: 14, border: on ? `2px solid ${ZELENA}` : "1.5px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
                <span aria-hidden="true" style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", border: on ? "none" : "2px solid #B8B1A3", background: on ? ZELENA : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{on ? "✓" : ""}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>{t}</b><span style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--ink2)" }}>{s}</span></span>
              </button>); })}
          </div>
          {pred === "vlastne" && <div style={{ borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--field)", padding: "2px 14px" }}>
            {PRAVA.map(([k, t, s], i) => <PrepinacPrava key={k} k={k} t={t} s={s} on={prava.includes(k)} prvy={!i}
              onZmena={(on) => nastavPrava(on ? [...prava.filter((x) => x !== k), k] : prava.filter((x) => x !== k))} />)}
          </div>}
          {pred && <NahladPrav prava={prava} />}
          {jeNovy && pred && <>
            <label style={lab}><span>Ako ho voláte <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· nepovinné, len popis</span></span>
              <input value={popis} onChange={(e) => { const v = e.target.value.slice(0, 40); setPopis(v); const ids = [poz?.id, miestoId].filter((x): x is number => x != null); if (ids.length) ulozL(L.map((y) => (ids.includes(y.id) ? { ...y, p: v.trim() || undefined } : y))); }} placeholder="napr. referentka, účtovníčka" style={pole} /></label>
            <span style={{ fontSize: 16, fontWeight: 800, paddingTop: 4 }}>2. Má účet v <DeedZnacka />?</span>
            <div role="radiogroup" aria-label="Má účet v DEED+" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)" }}>
              {["Áno, má účet", "Nemá účet"].map((t, i) => <button key={t} type="button" role="radio" aria-checked={cesta === i} onClick={() => setCesta(i)} style={seg(cesta === i)}>{t}</button>)}
            </div>
            {cesta === 0 ? <>
              <div role="radiogroup" aria-label="Kde je" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                {([["Je pri vás", "naskenuje QR mobilom"], ["Nie je pri vás", "pošlete cez jeho e-mail v DEED+"]] as const).map(([t, s], i) => { const on = kde === i; return (
                  <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setKde(i)} style={{ minHeight: 64, padding: "10px 14px", borderRadius: 14, border: on ? `2px solid ${ZELENA}` : "1.5px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 3, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}>
                    <b style={{ fontSize: 15.5, color: on ? "var(--gInk)" : "var(--ink)" }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink2)" }}>{s}</span></button>); })}
              </div>
              {kde === 0 ? <NaMiesteQr strankaId={strankaId} zaklad={{ r: PRACOVNIK, p: popis.trim() || undefined, prava }} mobil={mobil} onId={setMiestoId}
                od={{ meno: ja.celeMeno?.trim() || "Správca stránky", f: jaStatutar ? "štatutár" : "pracovník" }}
                uspechPod={`Pracovník · ${smieText(prava)}. Nájdete ho v zozname Štatutár a pracovníci.`} />
              : <label style={lab}>E-mail, s ktorým sa prihlasuje do DEED+<input value={mail} onChange={(e) => setMail(e.target.value.slice(0, 80))} type="email" placeholder="meno@priklad.sk" style={pole} /></label>}
            </> : !poz ? <>
              <button type="button" onClick={vytvor} style={{ minHeight: 56, borderRadius: 14, border: "none", background: ZELENA, color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Vytvoriť pozvánku</button>
              <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Appka vytvorí QR a odkaz pre jedného človeka s tým, čo ste mu zapli. Platí 48 hodín.</span>
            </> : <KartaPozvanky odkaz={odkazPozvanky(strankaId, poz.id)} rola="Pracovník" doT={poz.do} sprava={spravaZ(poz.id, poz.do)}
              onZrus={() => { ulozL(L.filter((y) => y.id !== poz.id)); setPoz(null); hlas("form", "Pozvánka zrušená ✓"); }} />}
          </>}
          {(!jeNovy || (cesta === 0 && kde === 1)) && <button type="button" onClick={potvrd} aria-disabled={!ok}
            style={{ minHeight: 56, borderRadius: 14, border: "none", background: ok ? ZELENA : "var(--btn)", color: ok ? "#fff" : "var(--ink2)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: ok ? "pointer" : "default", boxShadow: "none" }}>{potvrdT}</button>}
          {hl?.id === "form" && <span role={hl.t.includes("✓") ? "status" : "alert"} style={hl.t.includes("✓") ? hlaskaSt : { fontSize: 14, fontWeight: 700, color: CERV }}>{hl.t}</span>}
          {upr && stavPozvanky(upr.caka, upr.dos, teraz0)?.vyprsala && <button type="button" onClick={() => poslatZnova(upr)} style={{ minHeight: 48, borderRadius: 12, border: "none", background: ZELENA, color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Poslať znova</button>}
          {upr?.caka === "odmietol" && <button type="button" onClick={pozvatZnova} style={{ minHeight: 48, borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Pozvať znova</button>}
          {upr && <DrzTlacidlo ms={1200} onHotovo={odober} styl={{ minHeight: 48, borderRadius: 12, border: `1.5px solid ${CERV}`, background: "transparent", color: CERV, fontSize: 15, fontWeight: 800 }}>
            {upr.caka && upr.caka !== "odmietol" ? "Podržte · zrušiť pozvánku" : "Podržte · odobrať"}</DrzTlacidlo>}
        </div>
        {jeNovy && pred && <AkoPrebieha nadpis={cesta === 0 ? "AKO TO PREBIEHA · MÁ ÚČET" : "AKO TO PREBIEHA · NEMÁ ÚČET"} kroky={cesta === 0 && kde === 0 ? [
          ["Ukážete mu QR", "Je pri vás. QR na obrazovke sa mení každých 15 s."],
          ["Naskenuje ho v DEED+", `Na mobile uvidí: „${menoCharity || "Charita"} vás pridáva do Správy“, kto ho pridáva a čo bude smieť. Podrží Prijať.`],
          ["Hotovo", "Hneď tu uvidíte, že je v Správe. Vidí len to, čo ste mu zapli."]] : cesta === 0 ? [
          ["Napíšete jeho e-mail", "Ten, s ktorým sa prihlasuje do DEED+. Ťuknete Pozvať."],
          ["Príde mu oznámenie", `V appke uvidí: „${menoCharity || "Charita"} vás pozýva do Správy · Pracovník“ a ťukne Prijať.`],
          ["Hotovo", "Pri ňom uvidíte Prijal ✓. Správu nájde v Profil → Moje stránky, ale len to, čo ste mu zapli. Kým neprijme, nevidí nič."]]
          : [["Vytvoríte pozvánku", "Appka urobí QR kód a odkaz len pre jedného človeka. Platí 48 hodín."],
            ["Pošlete mu ju", "Zdieľať otvorí WhatsApp, SMS alebo e-mail. Alebo mu QR ukážete na mobile."],
            ["Prihlási sa a ťukne Prijať", "Naskenuje QR alebo ťukne na odkaz, prihlási sa do DEED+ (alebo si vytvorí účet) a pozvánku prijme."],
            ["Hotovo", "Pri ňom uvidíte Prijal ✓. Kým neprijme, nevidí nič. Ak odmietne, uvidíte Odmietol."]]} />}
      </div>);
  }

  // ---------- zoznam ----------
  type Riadok = { id: string; n: string; ini: string; sub: string; stitok?: string; zly?: boolean; ty?: boolean; x?: Clovek; vyprsala?: boolean; prijal?: boolean };
  const riadky: Riadok[] = [
    ...(jaStatutar ? [{ id: "ja", n: "Vy", ini: "V", sub: "Štatutár · smie všetko", ty: true }] : []),
    ...prac.map((x): Riadok => { const st = x.caka ? stavPozvanky(x.caka, x.dos, teraz0) : null, menoX = x.caka === "odkaz" ? "Pozvaný cez odkaz" : x.caka === "miesto" && !x.m ? "Pridávaný cez QR na mieste" : x.m || x.n || x.k;
      return { id: String(x.id), n: menoX + (jeVy(x) ? " · vy" : ""), ini: x.caka === "odkaz" ? "?" : (x.n || x.k || "?").trim().charAt(0).toUpperCase() || "?",
        sub: (x.p ? `${x.p} · ` : "") + smieText(x.prava ?? []), x, stitok: st?.t, zly: st?.zly, vyprsala: st?.vyprsala, prijal: !x.caka && !!x.prijal }; }),
  ];
  return (
    <div style={sirka}>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Štatutár smie všetko. Pracovníkom vyberiete, čo smú. Ostatné uvidia zamknuté.</span>
      <span style={kick}>KTO SPRAVUJE STRÁNKU</span>
      <div style={{ ...karta, padding: "4px 16px" }}>
        {riadky.map((s, i) => {
          const mozem = smiemPridavat && !!s.x && !jeVy(s.x);
          return (
            <div key={s.id}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, padding: "14px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
                <span aria-hidden="true" style={{ width: 44, height: 44, flex: "none", borderRadius: "50%", background: s.ty ? "var(--gSoft)" : "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>{s.ini}</span>
                <span style={{ flex: "1 1 180px", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 16, overflowWrap: "anywhere" }}>{s.n}</b>
                    {s.stitok && <span style={{ padding: "2px 8px", borderRadius: 8, background: s.zly ? "#F6E3DC" : "var(--warnBg, #F3EEDF)", border: `1px solid ${s.zly ? CERV : "#C9A24A"}`, fontSize: 12, fontWeight: 800, color: s.zly ? CERV : "var(--gold, #6B5418)" }}>{s.stitok}</span>}
                    {s.prijal && <span style={{ padding: "2px 8px", borderRadius: 8, background: "var(--gSoft)", color: "var(--gInk)", fontSize: 12, fontWeight: 800 }}>Prijal ✓</span>}</span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{s.sub}</span>
                </span>
                {mozem && s.vyprsala && <button type="button" onClick={() => poslatZnova(s.x!)} style={{ flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "none", background: ZELENA, fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "none" }}>Poslať znova</button>}
                {mozem && <button type="button" onClick={() => otvorUpr(s.x!)} style={{ flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)", cursor: "pointer", boxShadow: "none" }}>Upraviť ›</button>}
              </div>
              {hl?.id === s.id && <span role="status" style={{ ...hlaskaSt, marginBottom: 12 }}>{hl.t}</span>}
              {mozem && s.x && znova === s.x.id && s.x.caka === "odkaz" && s.x.do && <div style={{ paddingBottom: 12 }}><KartaPozvanky odkaz={odkazPozvanky(strankaId, s.x.id)} rola="Pracovník" doT={s.x.do} sprava={spravaZ(s.x.id, s.x.do)}
                onZrus={() => { ulozL(L.filter((y) => y.id !== s.x!.id)); setZnova(null); hlas("zoz", "Pozvánka zrušená ✓"); }} /></div>}
            </div>);
        })}
      </div>
      {hl?.id === "zoz" && <span role="status" style={hlaskaSt}>{hl.t}</span>}
      {smiemPridavat && <KartaNastavenia nadpis="Pridať človeka do správy" stav="Nemusíte. Stránku zvládnete spravovať aj sám." tlacidlo="Pridať" ikona={IK_PRIDAT_CLOVEKA} mobil={mobil} onClick={otvorNovy} />}
      {smiemPridavat && <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Štatutár musí ostať aspoň jeden. Pri zmene štatutára dajte rolu nástupcovi, potom sa môžete odobrať. Odobrať treba podržať.</span>}
    </div>);
}

/** počet ľudí v správe charity (štatutár + pracovníci) — riadok v Nastaveniach */
export const pocetLudiCharity = () => 1 + ((maNastavenie("ludia") ? citajNastavenie("ludia") : []) as Clovek[]).filter((x) => x.r === PRACOVNIK).length;
