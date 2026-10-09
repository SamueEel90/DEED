// ============================================================
// KARTA 61 §1 — Ľudia farnosti (Správa → Ľudia), prototyp Ludia farnosti.dc.html.
// Hore zbalený riadok duchovného (slovo podľa cirkvi), pod ním „Kto spravuje stránku …“ a pridávanie ľudí v 2 krokoch.
// Duchovný nemusí mať účet v DEED („Vypĺňam za …“ → v zozname „bez účtu v DEED“, ten kto vypĺňa = Správca stránky · vy).
// Úložisko ako Správcovia charity (karta 35): nastavenia_stranky (0050), kľúče „duch“ a „ludia“ — ukladá sa samo.
// PLACEBO — karta 61 §1: pozvánky (e-mail, QR odkaz 48 h, Prijať / Potvrdiť) sú zatiaľ len v zozname, práva rolí server ešte nevynucuje.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { citajNastavenie, maNastavenie, zapisNastavenie, useZmenyNastaveni } from "@/lib/nastaveniaStranky";
import { useSlovaFarnosti } from "@/lib/mojeFarnosti";
import { usePouzivatel } from "@/lib/pouzivatel";
import { zdielaj, kopiruj } from "@/lib/zdielanie";
import { DeedQr } from "@/components/deedqr";
import { TESTOVACIA } from "@/lib/testovacia";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";

type Duch = { tp: string; meno: string; tz: string; kde: string; osl: string; fil: string[]; foto: string; som: 0 | 1 };
type Caka = false | true | "odkaz" | "potvrdit";
type Clovek = { id: number; n: string; k: string; r: string; caka: Caka; do?: string; jaT?: string; vlastny?: boolean };
const D0: Duch = { tp: "", meno: "", tz: "", kde: "", osl: "", fil: [], foto: "", som: 0 };

const ZELENA = "#4B7A35", CERV = "#A34A2A";
const karta: CSSProperties = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" };
const pole: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" };
const kick: CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" };
const plne = (on: boolean): CSSProperties => ({ minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: on ? ZELENA : "var(--btn)", color: on ? "#fff" : "var(--ink2)", cursor: on ? "pointer" : "default", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800 });
const obrys: CSSProperties = { minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" };
const zbal: CSSProperties = { alignSelf: "center", minHeight: 48, padding: "0 24px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)" };
const seg = (on: boolean): CSSProperties => ({ flex: 1, minHeight: 44, padding: "0 12px", border: "none", borderRadius: 10, background: on ? "var(--card)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: on ? 800 : 700, color: on ? "var(--ink)" : "var(--ink3)" });
const teraz = () => Date.now();
const inic = (n: string) => n.split(/\s+/).filter((w) => w && !/\.$/.test(w)).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const hlaskaSt: CSSProperties = { padding: "10px 14px", borderRadius: 12, background: "var(--gSoft)", border: `1.5px solid ${ZELENA}`, fontSize: 14, fontWeight: 700, color: "var(--gInk)" };

export function LudiaFarnosti({ strankaId, meno: menoFarnosti, mobil }: { strankaId: string; meno: string; mobil: boolean }) {
  useZmenyNastaveni();
  const ja = usePouzivatel();
  const SL = useSlovaFarnosti(strankaId);
  const T = SL.titul, Tg = SL.titul2p, Sg = SL.jednotka2p, tl = T.charAt(0).toLowerCase() + T.slice(1);
  const ROLY: [string, string][] = [[T, "všetko, aj peňaženka a ľudia"], ...(SL.dozorca ? [["Dozorca", `rovnaké práva ako ${tl}`] as [string, string]] : []),
    ["Správca stránky", `všetko za ${Tg} · platbu z peňaženky ${tl} potvrdí`], ["Kaplán / zástupca", "zbierky, omše, oznamy, profil · bez peňaženky a ľudí"],
    ["Kostolník / pomocník", "len omše, kalendár a oznamy"], ["Účtovník", "len peňaženka a výpisy · nič neupravuje"]];
  const rI = (n: string) => Math.max(0, ROLY.findIndex((x) => x[0] === n));

  const D0u = { ...D0, ...((maNastavenie("duch") ? citajNastavenie("duch") : {}) as Partial<Duch>) };
  const L = (maNastavenie("ludia") ? citajNastavenie("ludia") : []) as Clovek[];
  const ulozL = (a: Clovek[]) => zapisNastavenie("ludia", a);

  const [dOtv, setDOtv] = useState(false);
  const [d, setDraft] = useState<Duch | null>(null);
  const [filIn, setFilIn] = useState("");
  const [prid, setPrid] = useState(false);
  const [nr, setNr] = useState<number | null>(null);
  const [cesta, setCesta] = useState(0);
  const [mail, setMail] = useState("");
  const [poz, setPoz] = useState<{ id: number; r: string; do: string } | null>(null);
  const [hl, setHl] = useState<{ id: string; t: string } | null>(null);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const hlas = (id: string, t: string) => { window.clearTimeout(tm.current); setHl({ id, t }); tm.current = window.setTimeout(() => setHl(null), 3500); };

  const D = d ?? D0u, setD = (o: Partial<Duch>) => setDraft({ ...D, ...o });
  const okD = D.meno.trim().length > 2;
  const celeMeno = [D0u.tp, D0u.meno, D0u.tz].map((x) => x.trim()).filter(Boolean).join(" ");
  const uloz = () => { if (!okD) return; zapisNastavenie("duch", D); setDraft(null); setDOtv(false); hlas("zoz", `Uložené ✓ ${[D.tp, D.meno, D.tz].filter(Boolean).join(" ")}`); };
  const fotoZ = (f?: File) => {
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"), s = 240; c.width = s; c.height = s; const k = Math.max(s / im.width, s / im.height);
      c.getContext("2d")?.drawImage(im, (s - im.width * k) / 2, (s - im.height * k) / 2, im.width * k, im.height * k); setD({ foto: c.toDataURL("image/jpeg", 0.8) }); }; im.src = String(rd.result); };
    rd.readAsDataURL(f);
  };

  // zoznam: duchovný (vy alebo bez účtu) + pozvaní
  const somF = D0u.som === 0;
  const jaMeno = ja.celeMeno?.trim() || "Vy";
  const base: Clovek[] = somF
    ? [{ id: -1, n: celeMeno || jaMeno, k: "", r: T, caka: false, vlastny: true, jaT: `${T} · vy` }]
    : [{ id: -2, n: celeMeno || T, k: "", r: T, caka: false, vlastny: true, jaT: "bez účtu v DEED" }, { id: -1, n: jaMeno, k: "", r: "Správca stránky", caka: false, vlastny: true, jaT: "Správca stránky · vy" }];
  const cakaT = (c: Caka) => (c === "potvrdit" ? "čaká na vaše potvrdenie" : c === "odkaz" ? "pozvánka odoslaná" : "čaká na prijatie");
  const duchovnych = [...base, ...L].filter((x) => (x.r === T || x.r === "Dozorca") && !x.caka).length;

  const okMail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());
  const rola = nr !== null ? ROLY[Math.min(nr, ROLY.length - 1)][0] : "";
  const pozvat = () => { if (!okMail || !rola) return; const id = teraz(); ulozL([...L, { id, n: "", k: mail.trim(), r: rola, caka: true }]); setMail(""); setPrid(false); setNr(null); hlas(String(id), "Pozvaný ✓ Príde mu oznámenie v appke. Keď ťukne Prijať, môže začať."); };
  const vytvor = () => { const dt = new Date(teraz() + 48 * 3600e3); const doT = `${dt.getDate()}. ${dt.getMonth() + 1}. o ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`; const id = teraz();
    ulozL([...L, { id, n: "", k: `pozvánka cez odkaz · platí do ${doT}`, r: rola, caka: "odkaz", do: doT }]); setPoz({ id, r: rola, do: doT }); };
  const odkaz = poz ? `https://deed.sk/p/${String(poz.id).slice(-6)}` : "";
  const sprava = poz ? `${menoFarnosti || "Farnosť"} vás pozýva do správy stránky ako ${poz.r}. Ťuknite na odkaz a vyplňte meno a e-mail: ${odkaz.replace("https://", "")} · platí do ${poz.do}.` : "";
  const ako: [string, string][] = cesta === 0 ? [
    ["Napíšete jeho e-mail", "Ten, s ktorým sa prihlasuje do DEED. Ťuknete Pozvať."],
    ["Príde mu oznámenie", `V appke uvidí: „${menoFarnosti || "Farnosť"} vás pozýva ako ${rola}“ a ťukne Prijať.`],
    ["Hotovo", `V zozname zmizne „čaká na prijatie“. Správu nájde vo svojej appke, ale len to, čo smie ${rola.toLowerCase()}. Vy už nič nepotvrdzujete.`]]
    : [["Vytvoríte pozvánku", "Appka urobí QR kód a odkaz len pre jedného človeka. Platí 48 hodín."],
      ["Pošlete mu ju", "Zdieľať otvorí WhatsApp, SMS alebo e-mail. Alebo mu QR ukážete na mobile."],
      ["Vyplní meno a e-mail", "Naskenuje QR alebo ťukne na odkaz. Príde mu e-mail, ťukne Potvrdiť. Účet v DEED si robiť nemusí."],
      ["Vy ho potvrdíte", "V zozname bude so štítkom „čaká na vaše potvrdenie“. Ťuknete Potvrdiť. Kým nepotvrdíte, nič nevidí."]];

  // ---------- pridávanie (všetko ostatné zmizne) ----------
  if (prid) return (
    <section style={{ ...karta, borderRadius: 22, padding: mobil ? "14px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <button type="button" onClick={() => { setPrid(false); setNr(null); setPoz(null); }} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)" }}>‹ Späť na zoznam</button>
      <b style={{ fontSize: 19 }}>Pridať človeka do správy</b>
      <span style={{ fontSize: 14.5, color: "var(--ink2)" }}>Dva kroky. Najprv vyberte, čo bude robiť, potom ho pozvite.</span>
      <b style={{ fontSize: 15.5 }}>1. Čo bude robiť</b>
      <div role="radiogroup" aria-label="Rola" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ROLY.map(([t, s], i) => { const on = i === nr; return (
          <button key={t} type="button" role="radio" aria-checked={on} onClick={() => { setNr(i); setPoz(null); }} style={{ minHeight: 56, padding: "8px 14px", borderRadius: 14, border: on ? `2px solid ${ZELENA}` : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            <span aria-hidden="true" style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", border: `2px solid ${on ? ZELENA : "#A8A396"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: ZELENA, opacity: on ? 1 : 0 }} /></span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
          </button>); })}
      </div>
      {rola && <>
        <b style={{ fontSize: 15.5 }}>2. Má účet v DEED?</b>
        <div role="radiogroup" aria-label="Má účet v DEED" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)" }}>
          {["Áno, má účet", "Nemá účet"].map((t, i) => <button key={t} type="button" role="radio" aria-checked={cesta === i} onClick={() => setCesta(i)} style={seg(cesta === i)}>{t}</button>)}
        </div>
        {cesta === 0 ? <>
          <label style={lab}>E-mail, s ktorým sa prihlasuje do DEED<input type="email" value={mail} onChange={(e) => setMail(e.target.value.slice(0, 80))} placeholder="meno@priklad.sk" style={pole} /></label>
          <button type="button" aria-disabled={!okMail} onClick={pozvat} style={plne(okMail)}>{okMail ? `Pozvať · ${rola}` : "Najprv napíšte jeho e-mail"}</button>
        </> : !poz ? <>
          <button type="button" onClick={vytvor} style={plne(true)}>Vytvoriť pozvánku</button>
          <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Appka vytvorí QR a odkaz pre jedného človeka s rolou, ktorú ste vybrali. Platí 48 hodín.</span>
        </> : <div style={{ ...karta, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: "none", borderRadius: 14, overflow: "hidden", border: "1px solid var(--cardBd)", lineHeight: 0 }}><DeedQr data={odkaz} size={112} /></span>
            <span style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 15.5 }}>Pozvánka · {poz.r}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Platí do {poz.do}. Naskenuje QR alebo ťukne na odkaz.</span></span>
          </div>
          <span style={kick}>TAKTO PRÍDE SPRÁVA</span>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, padding: "10px 12px", borderRadius: 12, background: "var(--field)" }}>{sprava}</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void zdielaj({ titul: "Pozvánka do správy stránky", text: sprava, url: odkaz })} style={plne(true)}>Zdieľať pozvánku</button>
            <button type="button" onClick={() => void kopiruj(odkaz)} style={obrys}>Kopírovať odkaz</button>
          </div>
          <button type="button" onClick={() => { ulozL(L.filter((y) => y.id !== poz.id)); setPoz(null); hlas("zoz", "Pozvánka zrušená ✓"); }} style={{ ...obrys, alignSelf: "flex-start", color: CERV }}>Zrušiť pozvánku</button>
        </div>}
        {rola === "Správca stránky" && <span style={{ fontSize: 14, lineHeight: 1.5, padding: "10px 14px", borderRadius: 12, background: "var(--goldBg)", border: "1.5px solid #C9A24A" }}>Správca stránky robí všetko za {Tg}. Platba z krypto peňaženky odíde až vtedy, keď ju {tl} potvrdí vo svojej appke.</span>}
        <span style={kick}>{cesta === 0 ? "AKO TO PREBIEHA · MÁ ÚČET" : "AKO TO PREBIEHA · NEMÁ ÚČET"}</span>
        <div style={{ ...karta, padding: "0 14px" }}>
          {ako.map(([t, s], i) => <div key={t} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <span style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{i + 1}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{t}</b><span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{s}</span></span>
          </div>)}
        </div>
      </>}
      <button type="button" onClick={() => { setPrid(false); setNr(null); setPoz(null); }} style={zbal}>Zbaliť ⌃</button>
    </section>);

  return (<>
    {/* ---------- duchovný (zbalený riadok) ---------- */}
    <span style={kick}>{`${T} ${Sg}`.toUpperCase()}</span>
    <section style={{ ...karta, borderRadius: 22, padding: mobil ? "12px 14px" : "14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden="true" style={{ width: 48, height: 48, flex: "none", borderRadius: "50%", background: D0u.foto ? `url("${D0u.foto}") center/cover no-repeat` : "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "var(--gInk)" }}>{D0u.foto ? "" : D0u.meno ? inic(D0u.meno) : "+"}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 15.5 }}>{celeMeno || `${T} ${Sg}`}</b>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{celeMeno ? ([D0u.kde, D0u.fil.length ? `filiálky: ${D0u.fil.join(", ")}` : ""].filter(Boolean).join(" · ") || "fotka, tituly, kde pôsobí") : "nepovinné · meno, fotka, tituly, filiálky"}</span>
        </span>
        {!dOtv && <button type="button" onClick={() => setDOtv(true)} style={obrys}>{celeMeno ? "Upraviť ›" : "Vyplniť ›"}</button>}
      </div>
      {dOtv && <>
        <label style={{ alignSelf: "flex-start", width: 96, height: 96, borderRadius: "50%", border: "1.5px dashed var(--cardBd)", background: D.foto ? `url("${D.foto}") center/cover no-repeat` : "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>
          {!D.foto && <span>+<br />Pridať fotku</span>}
          <input type="file" accept="image/*" onChange={(e) => fotoZ(e.target.files?.[0])} style={{ display: "none" }} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)", gap: 10 }}>
          <label style={lab}>Titul pred<input value={D.tp} onChange={(e) => setD({ tp: e.target.value.slice(0, 30) })} placeholder="napr. Mgr." style={pole} /></label>
          <label style={lab}>Meno a priezvisko<input value={D.meno} onChange={(e) => setD({ meno: e.target.value.slice(0, 60) })} style={pole} /></label>
          <label style={lab}>Titul za<input value={D.tz} onChange={(e) => setD({ tz: e.target.value.slice(0, 30) })} placeholder="napr. PhD." style={pole} /></label>
        </div>
        <label style={lab}>Kde pôsobí<input value={D.kde} onChange={(e) => setD({ kde: e.target.value.slice(0, 90) })} style={pole} /></label>
        <label style={lab}><span>Ako vás oslovujú <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· nepovinné</span></span>
          <input value={D.osl} onChange={(e) => setD({ osl: e.target.value.slice(0, 40) })} placeholder={`napr. ${SL.oslovenie ?? `pán ${tl}`}`} style={pole} /></label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Spravuje aj filiálky</span>
          {D.fil.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{D.fil.map((t, i) => (
            <span key={t + i} style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: 36, padding: "0 4px 0 12px", borderRadius: 18, background: "var(--btn)", fontSize: 14, fontWeight: 700 }}>{t}
              <button type="button" aria-label={`Odstrániť ${t}`} onClick={() => setD({ fil: D.fil.filter((_, j) => j !== i) })} style={{ width: 36, height: 36, border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: "var(--ink3)" }}>×</button></span>))}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={filIn} onChange={(e) => setFilIn(e.target.value.slice(0, 40))} onKeyDown={(e) => { if (e.key === "Enter" && filIn.trim()) { setD({ fil: [...D.fil, filIn.trim()] }); setFilIn(""); } }} placeholder="názov filiálky" aria-label="Názov filiálky" style={pole} />
            <button type="button" onClick={() => { if (!filIn.trim()) return; setD({ fil: [...D.fil, filIn.trim()] }); setFilIn(""); }} style={obrys}>+ Pridať</button>
          </div>
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Kto toto vypĺňa?</span>
        <div role="radiogroup" aria-label="Kto toto vypĺňa" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)" }}>
          {[`Som ${tl}`, `Vypĺňam za ${Tg}`].map((t, i) => <button key={t} type="button" role="radio" aria-checked={D.som === i} onClick={() => setD({ som: i as 0 | 1 })} style={seg(D.som === i)}>{t}</button>)}
        </div>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{D.som === 0 ? "V zozname nižšie budete vy." : `${T} nemusí mať účet v DEED. Vy budete Správca stránky a ${tl} ostane uvedený v zozname.`}</span>
        <button type="button" aria-disabled={!okD} onClick={uloz} style={plne(okD)}>{okD ? "Uložiť" : "Najprv napíšte meno"}</button>
        <button type="button" onClick={() => { setDOtv(false); setDraft(null); }} style={zbal}>Zbaliť ⌃</button>
      </>}
    </section>

    {/* ---------- kto spravuje ---------- */}
    <span style={kick}>{`Kto spravuje stránku ${Sg}`.toUpperCase()}</span>
    <section style={{ ...karta, borderRadius: 22, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {[...base, ...L].map((x, i) => {
        const vlastny = !!x.vlastny, rr = ROLY[rI(x.r)];
        const posledny = (x.r === T || x.r === "Dozorca") && !x.caka && duchovnych <= 1;
        return (
          <div key={x.id} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span aria-hidden="true" style={{ width: 42, height: 42, flex: "none", borderRadius: "50%", background: x.caka ? "var(--btn)" : "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--ink2)" }}>{inic(x.n || "?")}</span>
              <span style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ fontSize: 15 }}>{x.n || x.k || "Pozvaný"}</b>
                {x.caka ? <span style={{ alignSelf: "flex-start", padding: "2px 8px", borderRadius: 8, background: "var(--goldBg)", fontSize: 12, fontWeight: 800 }}>{cakaT(x.caka)}</span> : null}
                <span style={{ fontSize: 13, color: "var(--ink3)" }}>{vlastny ? x.jaT : `${rr[0]} · ${rr[1]}`}</span>
              </span>
              {!vlastny && <select value={x.r} aria-label="Rola" onChange={(e) => { ulozL(L.map((y) => (y.id === x.id ? { ...y, r: e.target.value } : y))); hlas(String(x.id), `Rola zmenená ✓ ${e.target.value}`); }}
                style={{ ...pole, width: "auto", height: 44 }}>{ROLY.map(([t]) => <option key={t} value={t}>{t}</option>)}</select>}
            </div>
            {!vlastny && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {x.caka === "potvrdit" && <button type="button" onClick={() => { ulozL(L.map((y) => (y.id === x.id ? { ...y, caka: false } : y))); hlas(String(x.id), `Potvrdené ✓ ${x.n} môže začať.`); }} style={{ ...plne(true), minHeight: 44 }}>Potvrdiť</button>}
              {x.caka === "odkaz" && TESTOVACIA && <button type="button" onClick={() => ulozL(L.map((y) => (y.id === x.id ? { ...y, caka: "potvrdit", n: "Testovací pozvaný", k: "test@deed.sk" } : y)))} style={{ ...obrys, borderStyle: "dashed" }}>Ukážka: vyplnil pozvánku ›</button>}
              {posledny ? <span style={{ fontSize: 13, color: "var(--ink3)" }}>{SL.dozorca ? `${T} alebo dozorca musí ostať aspoň jeden.` : `${T} musí ostať aspoň jeden.`}</span>
                : <DrzTlacidlo ms={1200} styl={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${CERV}`, background: "transparent", color: CERV, fontSize: 14, fontWeight: 800 }}
                  onHotovo={() => { ulozL(L.filter((y) => y.id !== x.id)); hlas("zoz", `${x.caka ? "Pozvánka zrušená ✓" : "Odobratý ✓"} ${x.n || x.k}`); }}>{x.caka === "potvrdit" ? "Podržte · odmietnuť" : x.caka ? "Podržte · zrušiť" : "Podržte · odobrať"}</DrzTlacidlo>}
            </div>}
            {hl?.id === String(x.id) && <span role="status" style={hlaskaSt}>{hl.t}</span>}
          </div>); })}
    </section>
    {hl?.id === "zoz" && <span role="status" style={hlaskaSt}>{hl.t}</span>}
    <button type="button" onClick={() => { setPrid(true); setDOtv(false); }} style={{ minHeight: 56, padding: "8px 16px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
      <b style={{ fontSize: 15 }}>Potrebujete pridať ďalších ľudí do správy? ›</b>
      <span style={{ fontSize: 13, color: "var(--ink3)" }}>Nemusíte. Stránku zvládnete spravovať aj sám.</span>
    </button>
    <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>{SL.dozorca ? `${T} alebo dozorca musí ostať aspoň jeden.` : `${T} musí ostať aspoň jeden.`} Pri preložení dajte rolu nástupcovi, potom sa môžete odobrať. Odobrať treba podržať.</span>
  </>);
}
