// ============================================================
// OPRAVY 320 · Vecná zbierka farnosti — Správa: (B) vyplniť · (C) beží: plagát A4 na vytlačenie · Darcovia ·
// Ukončenie a poďakovanie (ako pri ďalšej zbierke, bod 314). Bez platobného modulu.
// ============================================================
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { TextovePolia, GaleriaEditor, cistyText } from "./obsahZbierky";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { AnoNie } from "@/components/AnoNie";
import { profilZPamate } from "@/lib/profilStranky";
import { relCas } from "@/lib/darcovia";
import { TlZbalit } from "@/features/verejny-profil/zbalit";
import { podakujDarcom, ulozVecnu, noveIdVecnej, textPlagatuZPoli, fotoVecnej, odkazVecnej, doKedyText, usePrehladDarov, type VecnaZbierka } from "@/lib/vecnaZbierka";
import { kresliPlagat, riadkovTextu, stiahniPdf, vytlac } from "./vecnaPlagat";

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 };
const pole: CSSProperties = { minHeight: 50, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const nad: CSSProperties = { fontSize: 14.5, fontWeight: 800 };
const pozn: CSSProperties = { fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" };
const tlPlne: CSSProperties = { minHeight: 52, padding: "0 18px", border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, boxShadow: "none" };
const tlObr: CSSProperties = { minHeight: 52, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, boxShadow: "none" };
const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const nepov = <span style={{ fontWeight: 500, color: "var(--ink3)" }}> · nepovinné</span>;

/** hlavička plagátu z Upraviť profil (nedá sa prepísať) */
function hlavicka(strankaId: string, meno: string) {
  const p = profilZPamate(strankaId).ulozeny;
  const m = (p?.meno || meno).trim();
  const ini = p?.inicialy || m.split(/\s+/).filter((w) => w.length > 1 && w !== "Farnosť").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "F";
  return { logo: p && !p.bezLoga ? p.logo : null, inicialy: ini, menoFarnosti: m, adresa: (p?.kontakt?.adresaVerejna || p?.kontakt?.sidlo || "").trim() };
}

// ---------- (B) Vyplniť ----------
export function VecnaNova({ strankaId, mobil, onZavri, onHotovo }: { strankaId: string; mobil: boolean; onZavri: () => void; onHotovo: (z: VecnaZbierka) => void }) {
  const [f, setF] = useState({ nazov: "", popis: "", popis2: "", co: "", kde: "", doKedy: "", organizuje: "", ciel: "", ukaz: true });
  const [media, setMedia] = useState<VecnaZbierka["media"]>([]);
  const [chyby, setChyby] = useState<string[]>([]);
  const [uklada, setUklada] = useState(false);
  const [err, setErr] = useState("");
  const zmen = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setChyby([]); setErr(""); };
  const dnes = new Date().toISOString().slice(0, 10);
  const spusti = async () => {
    if (uklada) return;
    const ch = [!f.nazov.trim() && "Názov", !cistyText(f.popis) && "Hlavný text", !f.co.trim() && "Čo zbierame", !f.kde.trim() && "Kde", !f.doKedy && "Do kedy"].filter(Boolean) as string[];
    if (f.doKedy && f.doKedy < dnes) ch.push("Do kedy (dátum je v minulosti)");
    if (ch.length) { setChyby(ch); return; }
    const ciel = Number(f.ciel.replace(/\s/g, "").replace(",", "."));
    const z: VecnaZbierka = { id: noveIdVecnej(), nazov: f.nazov.trim(), popis: f.popis, popis2: f.popis2, co: f.co.trim(), kde: f.kde.trim(), doKedy: f.doKedy, organizuje: f.organizuje.trim(),
      ciel: ciel > 0 ? Math.round(ciel) : null, ukazHodnotu: f.ukaz, media, plagatFoto: media.some((m) => m.typ === "foto"), plagatText: "", stav: "aktivna", spustena: Date.now() };
    z.plagatText = textPlagatuZPoli(z);
    setUklada(true);
    const e = await ulozVecnu(strankaId, z);
    setUklada(false);
    if (e) { setErr(e); return; }
    onHotovo(z);
  };
  return <section style={{ ...karta, border: "2px solid var(--green)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ flex: 1, fontSize: 20 }}>Vecná zbierka</b>
      <button type="button" onClick={onZavri} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontSize: 18, color: "var(--ink2)", boxShadow: "none" }}>×</button></div>
    <span style={pozn}>Ponožky, potraviny, oblečenie. Bez peňazí: darca vec vhodí do krabice a cez QR na plagáte sa zapíše medzi darcov.</span>
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={nad}>Názov</span>
      <input value={f.nazov} maxLength={80} onChange={(e) => zmen({ nazov: e.target.value })} placeholder="napr. Ponožky pre ľudí bez domova" style={pole} /></label>
    <TextovePolia popis={f.popis} popis2={f.popis2} onPopis={(h) => zmen({ popis: h })} onPopis2={(h) => zmen({ popis2: h })} ph={mobil}
      popisHlavneho="Toto ľudia uvidia hneď. Napíšte, čo zbierate, pre koho a prečo. Najviac 12 riadkov." placeholder="Prichádzajú zimné mesiace…"
      nadpis2="Pokračovanie" popis2Text="Ukáže sa po ťuku na „… viac“. Čo presne treba, čo nie, kto to odovzdá, kam to pôjde." placeholder2="Čo presne potrebujeme, čo nie, kto to odovzdá…" />
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "1fr 1fr", gap: 12 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={nad}>Čo zbierame</span><input value={f.co} maxLength={60} onChange={(e) => zmen({ co: e.target.value })} placeholder="nové ponožky" style={pole} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={nad}>Kde</span><input value={f.kde} maxLength={60} onChange={(e) => zmen({ kde: e.target.value })} placeholder="krabica vzadu v kostole" style={pole} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={nad}>Do kedy</span><input type="date" min={dnes} value={f.doKedy} onChange={(e) => zmen({ doKedy: e.target.value })} style={pole} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={nad}>Kto organizuje{nepov}</span><input value={f.organizuje} maxLength={60} onChange={(e) => zmen({ organizuje: e.target.value })} placeholder="napr. Maltézska pomoc" style={pole} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={nad}>Cieľ v hodnote €{nepov}</span><input inputMode="numeric" value={f.ciel} maxLength={7} onChange={(e) => zmen({ ciel: e.target.value.replace(/[^\d\s]/g, "") })} placeholder="napr. 1 000" style={pole} /></label>
    </div>
    <span style={{ ...pozn, marginTop: -6 }}>Bez cieľa sa na stránke ukáže len počet darcov.</span>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={nad}>Ukazovať hodnotu darov na stránke?</span>
      <AnoNie value={f.ukaz} onChange={(v) => zmen({ ukaz: v })} label="Ukazovať hodnotu darov na stránke" siroke />
      <span style={pozn}>{f.ukaz ? "Áno: darca môže napísať približnú hodnotu, pri ňom „10 €“, hore spolu." : "Nie: darca sa na hodnotu ani nepýta, na stránke sú len mená."}</span>
    </div>
    <GaleriaEditor media={media} onMedia={setMedia} ph={mobil} bezVidea nadpis="Fotky" dovetok=" Prvá fotka (HLAVNÁ) ide aj na plagát." />
    {chyby.length > 0 && <div role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1.5px solid #C9A24A", fontSize: 14.5, fontWeight: 800 }}>Ešte chýba: {chyby.join(", ")}</div>}
    {err && <div role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "#F6E3DC", border: "1.5px solid #A34A2A", color: "#7A2E16", fontSize: 14.5, fontWeight: 800 }}>{err}</div>}
    <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={uklada ? "Spúšťa sa…" : "Podržte a spustite"} trvanie={1200} disabled={uklada} onConfirm={() => { void spusti(); }} /></div>
  </section>;
}

// ---------- plagát: náhľad a voľby (C) ----------
function PlagatVecnej({ strankaId, meno, z, onZmena, mobil }: { strankaId: string; meno: string; z: VecnaZbierka; onZmena: (p: Partial<VecnaZbierka>) => void; mobil: boolean }) {
  const [obr, setObr] = useState<{ src: string; c: HTMLCanvasElement } | null>(null);
  const [chyba, setChyba] = useState("");
  const [cela, setCela] = useState(false);
  const [akcia, setAkcia] = useState<"" | "tlac" | "pdf">("");
  const foto = fotoVecnej(z) ?? null, h = useMemo(() => hlavicka(strankaId, meno), [strankaId, meno]);
  const podklad = { nazov: z.nazov, text: z.plagatText, foto: z.plagatFoto ? foto : null, ...h, organizuje: z.organizuje, odkaz: odkazVecnej(strankaId, z.id) };
  const kluc = JSON.stringify(podklad);
  useEffect(() => {
    let ziva = true;
    const t = window.setTimeout(() => {
      void kresliPlagat(podklad).then(({ c, fotkaChyba }) => {
        if (!ziva) return;
        try { setObr({ src: c.toDataURL("image/jpeg", 0.85), c }); setChyba(fotkaChyba ? "Fotku sa nepodarilo načítať, plagát je zatiaľ bez nej. Skúste to o chvíľu znova." : ""); }
        catch { setChyba("Plagát s touto fotkou sa nedá pripraviť. Zvoľte Bez fotky."); }
      }, () => { if (ziva) setChyba("Plagát sa nepodarilo pripraviť. Skúste to znova."); });
    }, 150);
    return () => { ziva = false; window.clearTimeout(t); };
  }, [kluc]); // eslint-disable-line react-hooks/exhaustive-deps
  const zmenText = (t: string) => { const v = t.replace(/\n/g, " "); if (riadkovTextu(v, z.plagatFoto && !!foto) <= 3) onZmena({ plagatText: v }); };
  const urob = async (co: "tlac" | "pdf") => {
    if (!obr || akcia) return; setAkcia(co); setChyba("");
    try { if (co === "pdf") stiahniPdf(obr.c, z.nazov); else await vytlac(obr.c); }
    catch { setChyba(co === "pdf" ? "PDF sa nepodarilo pripraviť. Skúste to znova." : "Tlač sa nepodarilo otvoriť. Stiahnite PDF a vytlačte ho."); }
    setAkcia("");
  };
  return <>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={nad}>Fotka na plagáte</span>
      <AnoNie value={z.plagatFoto && !!foto} onChange={(v) => onZmena({ plagatFoto: v })} label="Fotka na plagáte" ano="S fotkou" nie="Bez fotky" siroke />
      <span style={pozn}>{foto ? "Berie sa hlavná fotka zbierky (HLAVNÁ vo Fotkách). Bez fotky je väčší text a QR." : "Zbierka nemá fotku. Plagát je bez fotky, väčší text a QR."}</span>
    </div>
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={nad}>Text na plagáte <span style={{ fontWeight: 500, color: "var(--ink3)" }}>· najviac 3 riadky</span></span>
      <textarea value={z.plagatText} onChange={(e) => zmenText(e.target.value)} rows={3} style={{ ...pole, minHeight: 84, padding: "10px 14px", lineHeight: 1.45, resize: "none" }} />
      <span style={pozn}>Vyplnili sme ho z polí Čo · Kde · Do kedy. Prepíšte ho, ak chcete, plagát sa hneď zmení. Dlhší ako 3 riadky sa napísať nedá.</span>
    </label>
    <span style={pozn}>Hlavička s logom, názvom a adresou sa doplní sama z Upraviť profil. Plagát má pevné rozloženie, QR je vždy aspoň 5 × 5 cm.</span>
    <button type="button" onClick={() => obr && setCela(true)} aria-label="Plagát na celú obrazovku" style={{ alignSelf: "center", width: mobil ? "min(100%, 300px)" : 320, aspectRatio: "210 / 297", padding: 0, border: "1px solid var(--cardBd)", borderRadius: 6, overflow: "hidden", background: "#FBF8F2", cursor: obr ? "zoom-in" : "default", boxShadow: "0 6px 20px rgba(0,0,0,.18)" }}>
      {obr ? <img src={obr.src} alt={`Plagát · ${z.nazov}`} style={{ display: "block", width: "100%", height: "100%" }} /> : <span style={{ fontSize: 14, color: "#555" }}>Pripravujem plagát…</span>}
    </button>
    {chyba && <span role="alert" style={{ padding: "10px 14px", borderRadius: 12, background: "#F6E3DC", border: "1.5px solid #A34A2A", color: "#7A2E16", fontSize: 14, fontWeight: 800, lineHeight: 1.45 }}>{chyba}</span>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <button type="button" disabled={!obr || !!akcia} onClick={() => void urob("tlac")} style={{ ...tlPlne, opacity: obr ? 1 : 0.5 }}>{akcia === "tlac" ? "Otváram tlač…" : "Vytlačiť A4"}</button>
      <button type="button" disabled={!obr || !!akcia} onClick={() => void urob("pdf")} style={{ ...tlObr, opacity: obr ? 1 : 0.5 }}>{akcia === "pdf" ? "Pripravujem…" : "Stiahnuť PDF"}</button>
    </div>
    {cela && obr && createPortal(<div role="dialog" aria-modal="true" aria-label="Plagát" onClick={() => setCela(false)} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "#0E0C08", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "calc(12px + env(safe-area-inset-top, 0px)) 12px 12px" }}>
      <button type="button" autoFocus onClick={() => setCela(false)} style={{ alignSelf: "flex-end", minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#1A1A1A" }}>Zavrieť ×</button>
      <img src={obr.src} alt={`Plagát · ${z.nazov}`} style={{ flex: 1, minHeight: 0, maxWidth: "100%", objectFit: "contain" }} />
    </div>, document.body)}
  </>;
}

// ---------- (C) Beží · Správa vecnej zbierky ----------
export function VecnaSprava({ strankaId, meno, z: z0, nova, mobil, onSpat }: { strankaId: string; meno: string; z: VecnaZbierka; /** hneď po spustení: zelená karta a Hotovo */ nova?: boolean; mobil: boolean; onSpat: () => void }) {
  const [z, setZ] = useState(z0);
  const [ulozene, setUlozene] = useState<"" | "uklada" | "ok" | "chyba">("");
  const [chybaT, setChybaT] = useState("");
  const tm = useRef<number | undefined>(undefined);
  const prvy = useRef(true);
  useEffect(() => {
    if (prvy.current) { prvy.current = false; return; }
    window.clearTimeout(tm.current);
    tm.current = window.setTimeout(() => { setUlozene("uklada"); void ulozVecnu(strankaId, z).then((e) => { setUlozene(e ? "chyba" : "ok"); setChybaT(e ?? ""); }); }, 700);
    return () => window.clearTimeout(tm.current);
  }, [z.plagatFoto, z.plagatText, z.podakovanie, z.stav]); // eslint-disable-line react-hooks/exhaustive-deps
  const zmen = (p: Partial<VecnaZbierka>) => setZ((x) => ({ ...x, ...p }));
  const pr = usePrehladDarov(strankaId, z);
  const [vsetci, setVsetci] = useState(false);
  const aktivna = z.stav === "aktivna";
  const [dak, setDak] = useState(z.podakovanie ?? { popis: "", popis2: "", media: [] });
  const [koniec, setKoniec] = useState(false);
  const plneDak = !!cistyText(dak.popis) || !!cistyText(dak.popis2) || dak.media.length > 0;
  // OPRAVY 320 doplnok: Poslať poďakovanie darcom (raz, 0101)
  const poslane = z.podakovanie?.poslane;
  const [poslat, setPoslat] = useState(true);
  const [posl, setPosl] = useState<{ ok: boolean; t: string } | null>(null);
  const posliDarcom = async (n: VecnaZbierka): Promise<VecnaZbierka> => {
    if (!plneDak || !poslat || poslane || pr.ludi === 0) return n;
    const r = await podakujDarcom(strankaId, n, cistyText(dak.popis || dak.popis2).slice(0, 500));
    if ("e" in r) { setPosl({ ok: false, t: r.e }); return n; }
    setPosl({ ok: true, t: `Darcovia dostali upozornenie (${r.n}).` });
    return { ...n, podakovanie: { ...(n.podakovanie ?? dak), poslane: Date.now(), poslaneKomu: r.n } };
  };
  const ukonci = async () => {
    let n: VecnaZbierka = { ...z, stav: "ukoncena", koniec: Date.now(), ...(plneDak ? { podakovanie: { ...dak, ulozene: Date.now() } } : {}) };
    setUlozene("uklada"); setPosl(null);
    const e = await ulozVecnu(strankaId, n);
    if (e) { setUlozene("chyba"); setChybaT(e); return; }
    const n2 = await posliDarcom(n);
    if (n2 !== n) { n = n2; await ulozVecnu(strankaId, n); }
    prvy.current = true; setZ(n); setUlozene("ok"); setKoniec(true);
  };
  const ulozDak = async () => {
    if (!plneDak) { setUlozene("chyba"); setChybaT("Napíšte poďakovanie alebo pridajte fotky."); return; }
    let n: VecnaZbierka = { ...z, podakovanie: { ...dak, ulozene: Date.now(), zmazane: z.podakovanie?.zmazane, poslane: z.podakovanie?.poslane, poslaneKomu: z.podakovanie?.poslaneKomu } };
    setUlozene("uklada"); setPosl(null); const e = await ulozVecnu(strankaId, n);
    if (e) { setUlozene("chyba"); setChybaT(e); return; }
    const n2 = await posliDarcom(n);
    if (n2 !== n) { n = n2; await ulozVecnu(strankaId, n); }
    prvy.current = true; setZ(n); setUlozene("ok");
  };
  const zmazZoStranky = async () => {
    if (!z.podakovanie) return;
    const n = { ...z, podakovanie: { ...z.podakovanie, zmazane: Date.now() } };
    setUlozene("uklada"); const e = await ulozVecnu(strankaId, n);
    if (e) { setUlozene("chyba"); setChybaT(e); return; }
    prvy.current = true; setZ(n); setUlozene("ok");
  };
  const darcovia = vsetci ? pr.darcovia : pr.darcovia.slice(0, 5);
  return <>
    <button type="button" onClick={onSpat} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>‹ Späť na zbierky</button>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--gInk)" }}>VECNÁ ZBIERKA{aktivna ? "" : " · UKONČENÁ"}</span>
      <b style={{ fontSize: 22, lineHeight: 1.25 }}>{z.nazov}</b>
      <span style={pozn}>{[z.co, z.kde, z.doKedy ? `do ${doKedyText(z.doKedy, false)}` : "", z.organizuje ? `organizuje ${z.organizuje}` : ""].filter(Boolean).join(" · ")}</span>
    </div>
    {nova && aktivna && <div role="status" style={{ padding: "14px 16px", borderRadius: 14, background: "var(--gSoft)", border: "2px solid var(--green)", display: "flex", flexDirection: "column", gap: 4 }}>
      <b style={{ fontSize: 16.5, color: "var(--gInk)" }}>Vecná zbierka beží ✓</b><span style={{ fontSize: 14.5, color: "var(--ink2)" }}>Ďalší krok: vytlačte plagát a zaveste ho ku krabici.</span></div>}
    {ulozene && <span role={ulozene === "chyba" ? "alert" : "status"} style={{ fontSize: 14, fontWeight: 800, color: ulozene === "chyba" ? "#A34A2A" : ulozene === "ok" ? "var(--gInk)" : "var(--ink3)" }}>{ulozene === "uklada" ? "Ukladá sa…" : ulozene === "ok" ? "Uložené ✓" : `Neuložilo sa. ${chybaT}`}</span>}
    {aktivna && <section style={karta}><b style={{ fontSize: 18 }}>Plagát na vytlačenie</b><PlagatVecnej strankaId={strankaId} meno={meno} z={z} mobil={mobil} onZmena={zmen} />
      {nova && <button type="button" onClick={onSpat} style={{ ...tlObr, borderColor: "var(--gBd)", color: "var(--gInk)" }}>Hotovo · späť do Správy</button>}</section>}
    <section style={karta}>
      <b style={{ fontSize: 18 }}>Darcovia{pr.pocet ? ` · ${pr.ludi}` : ""}</b>
      {pr.pocet === 0 ? <span style={pozn}>Zatiaľ sa nikto nezapísal. Darca vec vhodí do krabice a naskenuje QR na plagáte.</span> : <>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{z.ukazHodnotu && pr.spolu ? `asi ${eur(pr.spolu)}${z.ciel ? ` z ${eur(z.ciel)}` : ""} · ` : ""}{pr.ludi} {pr.ludi === 1 ? "človek daroval" : pr.ludi < 5 ? "ľudia darovali" : "ľudí darovalo"}</span>
        <div style={{ display: "flex", flexDirection: "column" }}>{darcovia.map((d, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <b style={{ flex: 1, minWidth: 0, fontSize: 15 }}>{d.meno}</b>{d.hodnota != null && <span style={{ fontSize: 14.5, fontWeight: 800 }}>{eur(d.hodnota)}</span>}<span style={{ fontSize: 13, color: "var(--ink3)" }}>{relCas(d.cas)}</span></div>)}</div>
        {pr.darcovia.length > 5 && (vsetci ? <TlZbalit onZbal={() => setVsetci(false)} /> : <button type="button" onClick={() => setVsetci(true)} aria-expanded={false} style={{ ...tlObr, alignSelf: "flex-start", minHeight: 44 }}>Všetci darcovia ({pr.darcovia.length}) ›</button>)}
      </>}
    </section>
    {koniec ? <section role="status" style={{ ...karta, background: "var(--gSoft)", border: "2px solid var(--green)" }}>
      <b style={{ fontSize: 17 }}>Zbierka je ukončená</b>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{plneDak ? "Darcovia sa už zapísať nedajú. Na stránke farnosti je zbierka s vaším poďakovaním." : "Darcovia sa už zapísať nedajú. Poďakovanie môžete doplniť neskôr."}</span>
      {posl && <span role={posl.ok ? "status" : "alert"} style={{ fontSize: 14.5, fontWeight: 800, color: posl.ok ? "var(--gInk)" : "#A34A2A" }}>{posl.t}</span>}
      <button type="button" onClick={onSpat} style={tlPlne}>Hotovo · späť na zbierky</button>
    </section> : <section style={karta}>
      <b style={{ fontSize: 18 }}>{aktivna ? "Ukončenie a poďakovanie" : "Poďakovanie"}</b>
      <span style={pozn}>{aktivna ? "Napíšte, komu vaše veci pomohli, a pridajte fotky. Ukáže sa na stránke pri ukončenej zbierke." : "Ukáže sa na stránke pri ukončenej zbierke."}</span>
      <TextovePolia popis={dak.popis} popis2={dak.popis2} onPopis={(h) => setDak((x) => ({ ...x, popis: h }))} onPopis2={(h) => setDak((x) => ({ ...x, popis2: h }))} ph={mobil}
        popisHlavneho="Najviac 12 riadkov, ľudia ho uvidia hneď." placeholder="Ďakujeme. Vaše veci sme odovzdali…" nadpis2="Pokračovanie" popis2Text="Komu ďakujeme, čo sme urobili. Ukáže sa po „… viac“." placeholder2="Ukáže sa po „… viac“." />
      <GaleriaEditor media={dak.media} onMedia={(m) => setDak((x) => ({ ...x, media: m }))} ph={mobil} bezVidea nadpis="Fotky · ako to dopadlo" popisNapoveda="Popis (nepovinné)" dovetok="" />
      {poslane ? <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gInk)" }}>Darcom sme poslali upozornenie{z.podakovanie?.poslaneKomu ? ` (${z.podakovanie.poslaneKomu})` : ""}.</span>
        : pr.ludi > 0 && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", minHeight: 52 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>Poslať poďakovanie darcom</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>každý, kto sa zapísal, dostane upozornenie · raz</span></span>
          <AnoNie value={poslat} onChange={setPoslat} label="Poslať poďakovanie darcom" />
        </div>}
      {posl && <span role={posl.ok ? "status" : "alert"} style={{ fontSize: 14.5, fontWeight: 800, color: posl.ok ? "var(--gInk)" : "#A34A2A" }}>{posl.t}</span>}
      {aktivna ? <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={plneDak ? "Podržte a ukončite s poďakovaním" : "Podržte a ukončite"} trvanie={1500} onConfirm={() => { void ukonci(); }} /></div>
        : <button type="button" onClick={() => void ulozDak()} style={tlPlne}>Uložiť poďakovanie</button>}
      {!aktivna && z.podakovanie?.ulozene && !z.podakovanie.zmazane && <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--cardBd)" }}>
        <b style={{ fontSize: 15 }}>Zbierka je na stránke farnosti s poďakovaním</b>
        <span style={pozn}>Nechajte ju tam, koľko chcete. Keď ju zmažete zo stránky, tu ostane.</span>
        <button type="button" onClick={() => void zmazZoStranky()} style={{ ...tlObr, alignSelf: "flex-start", color: "#A34A2A", borderColor: "#A34A2A" }}>Zmazať zo stránky</button>
      </div>}
    </section>}
  </>;
}
