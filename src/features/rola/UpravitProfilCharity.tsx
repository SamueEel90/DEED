// ============================================================
// KARTA 33 · OPRAVY 106 — Upraviť profil (spoločná obrazovka pre všetky typy stránok, karta 36).
// Obsahová časť správy (nie hárok). Koncept sa ukladá automaticky 600 ms po zmene do účtu
// organizácie (lib/profilStranky, migrácia 0028), na profile sa ukáže až po „Uložiť profil".
// Editor, orez, logo a kontakt = existujúce RichTextInput, OrezFotky, lib/obrazok, kontakt.tsx.
// ============================================================
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RichTextInput } from "@/components/richtext";
import { Titulka, RAMY, pomerFotky } from "./titulka";
import { OrezFotky } from "@/components/orezfotky";
import { toast } from "@/components/toast";
import { spracujLogo, spracujFotku, rozmeryFotky, LOGO_CFG, COVER_CFG, type LogoRezim, type LogoPozadie } from "@/lib/obrazok";
import { nacitajProfil, profilZPamate, ulozKoncept, zverejniProfil, type ProfilStranky, type RamFotky, type TitulnaFotka, type VyrezFotky } from "@/lib/profilStranky";
import { SIDLO_REGISTRA, ICO_REGISTRA } from "./NastaveniaCharity";
import { nacitajKontakt, SIETE, MAX_TEL, MAX_EMAIL, chybaSiete, chybaWebu, chybaEmailu, chybaTel, type Kontakt } from "./kontakt";
import { type Pozicia, type Tier, type TvarLoga } from "./stav";
import { Podstranka } from "./Podstranka";

// IČO a sídlo z Údajov organizácie (ten istý zdroj, OPRAVY 108)
// ---------- konštanty z karty 33 ----------
const ONAS_RIADKY = 12;
const ONAS_ZNAKY = 1500;
const NASTROJE = ["bold", "italic", "nadpis", "vacsie", "mensie", "insertUnorderedList", "insertOrderedList", "odkaz", "diktovat", "tx", "spat"];
/** profil pred prvým uložením = úplne prázdny (Martin 1. 10. 2026), zo registrácie len zamknuté sídlo */
export function zakladnyProfil(p: Pozicia): ProfilStranky {
  const k = nacitajKontakt(p);
  return {
    onas: "", onas2: "",
    kontakt: { sidlo: p === "charita" ? SIDLO_REGISTRA : k.sidlo, adresaVerejna: "", telefony: [{ cislo: "", popis: "" }], emaily: [{ adresa: "", popis: "" }], web: "", siete: {} },
    logo: null, tvar: "stvorec", logoRezim: "cele", logoPozadie: "biele",
    cover: null, ram: "bez",
  };
}

async function priemernaFarba(src: string): Promise<string> {
  return new Promise((ok) => {
    const i = new Image();
    i.onload = () => {
      const c = document.createElement("canvas"); c.width = 24; c.height = 24; const x = c.getContext("2d");
      if (!x) { ok("#8A8478"); return; }
      x.drawImage(i, 0, 0, 24, 24); const d = x.getImageData(0, 0, 24, 24).data; let R = 0, G = 0, B = 0;
      for (let j = 0; j < d.length; j += 4) { R += d[j]; G += d[j + 1]; B += d[j + 2]; }
      const n = d.length / 4; ok("#" + [R, G, B].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join(""));
    };
    i.onerror = () => ok("#8A8478"); i.src = src;
  });
}

// ---------- spoločné štýly (karta 33 bod 3) ----------
const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 };
const pole: CSSProperties = { height: 50, minWidth: 0, padding: "0 16px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd, #CFC9BC)", fontSize: 15, color: "var(--ink)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const zamknute: CSSProperties = { ...pole, display: "flex", alignItems: "center", gap: 8, background: "var(--fieldLock, #EAE6DD)", color: "var(--ink3)" };
const poznamka: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--ink3)", lineHeight: 1.45 };
const nadpis = (t: string, d?: string, fs = 15) => <span style={{ fontSize: fs, fontWeight: 800, color: "var(--ink)" }}>{t}{d && <span style={{ fontWeight: 500, color: "var(--ink3)" }}> — {d}</span>}</span>;
const tl = (druh: "zelene" | "sive" | "obrys", h = 46): CSSProperties => ({
  flex: "none", height: h, padding: "0 18px", borderRadius: h >= 46 ? 14 : 13, cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, whiteSpace: "nowrap",
  border: druh === "obrys" ? "1.5px solid var(--cardBd)" : "none", background: druh === "zelene" ? "var(--green)" : druh === "sive" ? "var(--btn)" : "transparent",
  color: druh === "zelene" ? "#fff" : druh === "sive" ? "var(--ink)" : "var(--ink2)",
});
const Zamok = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
function Volba<T extends string>({ moznosti, value, onChange }: { moznosti: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {moznosti.map(([k, t]) => { const on = k === value; return (
        <button key={k} type="button" aria-pressed={on} onClick={() => onChange(k)} style={{ flex: 1, minWidth: 0, height: 42, borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, background: on ? "var(--gSoft)" : "var(--btn)", border: `1.5px solid ${on ? "var(--gBd)" : "transparent"}`, color: on ? "var(--gInk)" : "var(--ink2)" }}>{t}</button>); })}
    </div>);
}
const Chyba = ({ t }: { t: string | null }) => (t ? <span style={{ fontSize: 13, fontWeight: 700, color: "#A34A2A", marginTop: -6 }}>{t}</span> : null);
const Zmaz = ({ onClick }: { onClick: () => void }) => <button type="button" onClick={onClick} aria-label="Odstrániť" style={{ flex: "none", width: 40, height: 50, border: "none", background: "transparent", cursor: "pointer", fontSize: 20, color: "var(--ink3)" }}>×</button>;
const Pridat = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => <button type="button" onClick={onClick} style={{ alignSelf: "flex-start", minHeight: 44, border: "none", background: "transparent", padding: "0", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>{children}</button>;
const cas = (iso: string) => new Date(iso).toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });

// ============================================================
export function UpravitProfilCharity({ strankaId, pozicia, tier, nazov, inicialy, mobil, tablet, stit, onZrusit, onHotovo, onUlozene, onZmena }: {
  strankaId: string; pozicia: Pozicia; tier: Tier; nazov: string; inicialy: string; mobil: boolean; tablet: boolean;
  stit: string;
  onZrusit: () => void; onHotovo: () => void; onUlozene: (p: ProfilStranky) => void;
  /** OPRAVY 112: každá zmena hore — percento v karte charity rastie naživo */
  onZmena?: (p: ProfilStranky) => void;
}) {
  const z0 = profilZPamate(strankaId);
  const [p, setP] = useState<ProfilStranky>(() => z0.koncept ?? z0.ulozeny ?? zakladnyProfil(pozicia));
  const [konceptCas, setKonceptCas] = useState<string | null>(z0.konceptCas);
  const [nacitane, setNacitane] = useState(false);
  const zmenene = useRef(false);
  // načítanie z účtu (koncept má prednosť pred uloženým)
  useEffect(() => { let ziva = true; void nacitajProfil(strankaId).then((z) => { if (!ziva) return; if (!zmenene.current) { setP(z.koncept ?? z.ulozeny ?? zakladnyProfil(pozicia)); setKonceptCas(z.konceptCas); } setNacitane(true); }); return () => { ziva = false; }; }, [strankaId, pozicia]);
  const zmen = (z: Partial<ProfilStranky>) => { zmenene.current = true; setP((x) => ({ ...x, ...z })); };
  const zmenK = (z: Partial<Kontakt>) => { zmenene.current = true; setP((x) => ({ ...x, kontakt: { ...x.kontakt, ...z } })); };
  useEffect(() => { if (zmenene.current) onZmena?.(p); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);
  // KONCEPT — automaticky 600 ms po poslednej zmene
  useEffect(() => {
    if (!zmenene.current || !nacitane) return;
    const t = window.setTimeout(() => { void ulozKoncept(strankaId, p).then(setKonceptCas); }, 600);
    return () => window.clearTimeout(t);
  }, [p, strankaId, nacitane]);

  const [pohlad, setPohlad] = useState<"uprava" | "nahlad" | "ulozene">("uprava");
  const [riadky, setRiadky] = useState(0);
  const [zn1, setZn1] = useState(0);
  const [zn2, setZn2] = useState(0);
  const dlhy = riadky > ONAS_RIADKY;
  const k = p.kontakt;
  const chyby = [...k.telefony.map((t) => chybaTel(t.cislo)), ...k.emaily.map((e) => chybaEmailu(e.adresa)), chybaWebu(k.web), ...SIETE.map((x) => chybaSiete(x.k, k.siete[x.k] ?? ""))].filter(Boolean);
  const mozeUlozit = !dlhy && chyby.length === 0;

  const uloz = async () => {
    if (!mozeUlozit) return;
    const cisty: ProfilStranky = { ...p, kontakt: { ...k, telefony: k.telefony.filter((t) => t.cislo.trim()), emaily: k.emaily.filter((e, i) => i === 0 || e.adresa.trim()) } };
    await zverejniProfil(strankaId, cisty);
    zmenene.current = false; setKonceptCas(null); setP(cisty); onUlozene(cisty); setPohlad("ulozene");
  };

  // ---- logo ----
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoSubor, setLogoSubor] = useState<File | null>(null);
  const [logoOrez, setLogoOrez] = useState(false);
  const [pracujem, setPracujem] = useState(false);
  const spracuj = async (f: File, r: LogoRezim, poz: LogoPozadie) => {
    setPracujem(true);
    try { zmen({ logo: await spracujLogo(f, { rezim: r, pozadie: poz }), logoRezim: r, logoPozadie: poz }); }
    catch (e) { toast(e instanceof Error ? e.message : "Nahranie loga zlyhalo."); }
    finally { setPracujem(false); }
  };
  const zmenRezim = (r: LogoRezim) => { zmen({ logoRezim: r }); if (logoSubor) void spracuj(logoSubor, r, p.logoPozadie); };
  const zmenPozadie = (poz: LogoPozadie) => { zmen({ logoPozadie: poz }); if (logoSubor) void spracuj(logoSubor, p.logoRezim, poz); };
  const radius = p.tvar === "kruh" ? "50%" : "22%";
  const logoPozadie = p.logoPozadie === "tmave" ? "#15171c" : p.logoPozadie === "priehladne" ? "transparent" : "#fff";

  // ---- titulná fotka ----
  const coverRef = useRef<HTMLInputElement>(null);
  const [orez, setOrez] = useState(false);
  const [rozmer, setRozmer] = useState<{ w: number; h: number } | null>(p.cover ? { w: p.cover.w, h: p.cover.h } : null);
  const vyberCover = async (f: File) => {
    if (f.size > COVER_CFG.maxMB * 1024 * 1024) { toast(`Fotka má ${(f.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB, limit je ${COVER_CFG.maxMB} MB.`); return; }
    try {
      const r = await rozmeryFotky(f);
      const src = await spracujFotku(f, { pomer: null, maxSirka: 2400 });
      const vyrez: VyrezFotky = { rezim: "vyrez", zoom: 1, x: 0.5, y: 0.5 };
      setRozmer(r);
      zmen({ cover: { src, w: r.w, h: r.h, priemer: await priemernaFarba(src), vyrez } });
    } catch (e) { toast(e instanceof Error ? e.message : "Fotku sa nepodarilo načítať."); }
  };
  const nastavVyrez = (v: VyrezFotky) => p.cover && zmen({ cover: { ...p.cover, vyrez: v } });
  const kvalita = (() => {
    if (!rozmer) return null;
    const rozmazana = rozmer.w < COVER_CFG.minSirka, tvar = Math.abs(rozmer.w / rozmer.h - 16 / 9) > 0.25;
    if (!rozmazana && !tvar) return null;
    return `Fotka má ${rozmer.w} × ${rozmer.h} px${rozmazana ? " — bude rozmazaná" : ""}${tvar ? `${rozmazana ? " a" : " —"} nemá tvar 16 : 9, časť sa oreže` : ""}. Najlepšia je fotka na šírku, aspoň 1600 × 900 px, bez textu.`;
  })();

  // ---------- NÁHĽAD / PROFIL ULOŽENÝ = skutočný verejný profil s lištou (OPRAVY 107) ----------
  if (pohlad !== "uprava") return (
    <VerejnyProfilOkno pozicia={pozicia} tier={tier} strankaId={strankaId} stit={stit} mobil={mobil}
      profil={pohlad === "nahlad" ? p : undefined} ulozene={pohlad === "nahlad" ? "nie" : "ano"}
      onZavri={() => (pohlad === "nahlad" ? setPohlad("uprava") : onHotovo())}
      lista={pohlad === "nahlad"
        ? <><b style={{ flex: mobil ? "1 1 100%" : 1, minWidth: 0, fontSize: 14.5, color: "#5E4A12" }}>Náhľad. Zatiaľ nič nie je uložené.</b>
            <button type="button" onClick={() => setPohlad("uprava")} style={tl("sive", 44)}>Späť na úpravu</button>
            <button type="button" onClick={() => void uloz()} disabled={!mozeUlozit} style={{ ...tl("zelene", 44), opacity: mozeUlozit ? 1 : 0.45 }}>Uložiť profil</button></>
        : <><b style={{ flex: mobil ? "1 1 100%" : 1, minWidth: 0, fontSize: 14.5, color: "var(--gInk)" }}>Profil uložený. Takto ho vidia ľudia.</b>
            <button type="button" onClick={() => setPohlad("uprava")} style={{ ...tl("obrys", 44), border: "none", color: "var(--gInk)", padding: "0 10px" }}>Upraviť</button>
            <button type="button" onClick={onHotovo} style={tl("zelene", 44)}>Hotovo</button></>} />
  );

  // ---------- ÚPRAVA ----------
  const hlavicka = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: mobil && !tablet ? "wrap" : undefined }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 22, fontWeight: 800 }}>Upraviť profil</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--ink3)" }}>
          <span aria-hidden="true" style={{ flex: "none", width: 8, height: 8, borderRadius: "50%", background: konceptCas ? "var(--green)" : "var(--ink4)" }} />
          <span>{konceptCas ? `Koncept uložený ${cas(konceptCas)} · na profile sa ukáže až po Uložiť profil` : "Zmeny sa ukladajú ako koncept · na profile sa ukážu až po Uložiť profil"}</span>
        </span>
      </span>
      {!(mobil && !tablet) && <span style={{ flex: "none", display: "flex", gap: 12 }}>
        <button type="button" onClick={onZrusit} style={tl("obrys")}>Zrušiť</button>
        <button type="button" onClick={() => setPohlad("nahlad")} style={tl("sive")}>Náhľad</button>
        <button type="button" onClick={() => void uloz()} disabled={!mozeUlozit} title={mozeUlozit ? undefined : "Najprv opravte chyby"} style={{ ...tl("zelene"), padding: "0 22px", opacity: mozeUlozit ? 1 : 0.45, cursor: mozeUlozit ? "pointer" : "default" }}>Uložiť profil</button>
      </span>}
    </div>);

  const kartaOnas = (
    <section style={karta} aria-label="Názov a O nás">
      {nadpis("Názov", "z registrácie, overený cez IČO", 14)}
      <div style={zamknute}><Zamok />{nazov} · IČO {ICO_REGISTRA}</div>
      <span style={{ marginTop: 6 }}>{nadpis("O nás · hlavný text")}</span>
      <span style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.45, marginTop: -4 }}>Toto ľudia uvidia hneď v hlavičke profilu. Kto ste a komu pomáhate, tak, aby to zaujalo. Najviac 12 riadkov.</span>
      <RichTextInput vzhlad="sprava" value={p.onas} onChange={(h) => zmen({ onas: h })} nastroje={NASTROJE} minH={130} chybaRam={dlhy}
        placeholder="Kto ste a komu pomáhate…" ariaLabel="O nás · hlavný text" tvrdyLimit={Math.max(0, ONAS_ZNAKY - zn2)} onRiadky={setRiadky} onZnaky={setZn1} />
      {(() => { const f = dlhy ? "#A34A2A" : riadky > 9 ? "#8A5A2B" : "var(--green)"; return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: "100%", borderRadius: 3, background: f, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, riadky / ONAS_RIADKY)})` }} /></span>
          <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: f }}>{riadky} z {ONAS_RIADKY} riadkov</span>
        </div>); })()}
      {dlhy && <span style={{ fontSize: 13, fontWeight: 700, color: "#A34A2A", lineHeight: 1.45 }}>Hlavný text je dlhší ako 12 riadkov. Skráťte ho, alebo časť presuňte nižšie do pokračovania.</span>}
      <span style={{ marginTop: 8 }}>{nadpis("O nás · pokračovanie", "nepovinné")}</span>
      <span style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.45, marginTop: -4 }}>Ukáže sa, až keď návštevník klikne na „viac“.</span>
      <RichTextInput vzhlad="sprava" value={p.onas2} onChange={(h) => zmen({ onas2: h })} nastroje={NASTROJE} minH={130}
        placeholder="Podrobnosti, história, čo všetko robíte…" ariaLabel="O nás · pokračovanie" tvrdyLimit={Math.max(0, ONAS_ZNAKY - zn1)} onZnaky={setZn2} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={poznamka}>Text skopírovaný z Wordu, Facebooku či Instagramu si tučné, kurzívu aj odrážky ponechá.</span>
        <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{zn1 + zn2} / {ONAS_ZNAKY}</span>
      </div>
    </section>);

  const kartaKontakt = (
    <section style={karta} aria-label="Kontakt">
      {nadpis("Kontakt")}
      {nadpis("Sídlo", "z registrácie, overené cez IČO", 14)}
      <div style={zamknute}><Zamok />{k.sidlo}</div>
      {nadpis("Adresa pre verejnosť", "ak sa líši od sídla (výdajňa, kancelária)", 14)}
      <input style={pole} value={k.adresaVerejna} placeholder="Napríklad: Hviezdoslavova 12, Trenčín" onChange={(e) => zmenK({ adresaVerejna: e.target.value })} aria-label="Adresa pre verejnosť" />
      {nadpis("Telefón", "číslo uvidí každý návštevník", 14)}
      {k.telefony.map((t, i) => (<div key={`t${i}`} style={{ display: "contents" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input style={{ ...pole, flex: 3 }} value={t.cislo} placeholder="+421 …" inputMode="tel" aria-label="Telefón" onChange={(e) => zmenK({ telefony: k.telefony.map((x, j) => (j === i ? { ...x, cislo: e.target.value } : x)) })} />
          <input style={{ ...pole, flex: 2 }} value={t.popis} placeholder="Kto? Napríklad: Kancelária" aria-label="Popis telefónu" onChange={(e) => zmenK({ telefony: k.telefony.map((x, j) => (j === i ? { ...x, popis: e.target.value } : x)) })} />
          {i > 0 && <Zmaz onClick={() => zmenK({ telefony: k.telefony.filter((_, j) => j !== i) })} />}
        </div>
        <Chyba t={chybaTel(t.cislo)} />
      </div>))}
      {k.telefony.length < MAX_TEL && <Pridat onClick={() => zmenK({ telefony: [...k.telefony, { cislo: "", popis: "" }] })}>+ Pridať telefón</Pridat>}
      {nadpis("E-mail", "hlavný, ďalšie s popisom", 14)}
      {k.emaily.map((m, i) => (<div key={`e${i}`} style={{ display: "contents" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {i === 0 && <span style={{ width: 70, flex: "none", fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Hlavný</span>}
          <input style={{ ...pole, flex: 3 }} value={m.adresa} placeholder="info@…" inputMode="email" aria-label="E-mail" onChange={(e) => zmenK({ emaily: k.emaily.map((x, j) => (j === i ? { ...x, adresa: e.target.value } : x)) })} />
          {i > 0 && <input style={{ ...pole, flex: 2 }} value={m.popis} placeholder="Na čo? Napríklad: Dobrovoľníci" aria-label="Popis e-mailu" onChange={(e) => zmenK({ emaily: k.emaily.map((x, j) => (j === i ? { ...x, popis: e.target.value } : x)) })} />}
          {i > 0 && <Zmaz onClick={() => zmenK({ emaily: k.emaily.filter((_, j) => j !== i) })} />}
        </div>
        <Chyba t={chybaEmailu(m.adresa)} />
      </div>))}
      {k.emaily.length < MAX_EMAIL && <Pridat onClick={() => zmenK({ emaily: [...k.emaily, { adresa: "", popis: "" }] })}>+ Pridať e-mail</Pridat>}
      {nadpis("Web a sociálne siete", undefined, 14)}
      {[{ k: "web", label: "Web", ph: "www.vasastranka.sk" }, ...SIETE.map((x) => ({ k: x.k, label: x.label, ph: PH_SIETE[x.k] ?? `${x.domeny[0]}/…` }))].map((r) => {
        const v = r.k === "web" ? k.web : k.siete[r.k as keyof Kontakt["siete"]] ?? "";
        const ch = r.k === "web" ? chybaWebu(v) : chybaSiete(r.k as keyof Kontakt["siete"], v);
        return (<div key={r.k} style={{ display: "contents" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 84, flex: "none", fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>{r.label}</span>
            <input style={{ ...pole, flex: 1 }} value={v} placeholder={r.ph} inputMode="url" aria-label={r.label}
              onChange={(e) => (r.k === "web" ? zmenK({ web: e.target.value }) : zmenK({ siete: { ...k.siete, [r.k]: e.target.value } }))} />
          </div>
          {ch && <span style={{ fontSize: 13, fontWeight: 700, color: "#A34A2A", marginTop: -6, paddingLeft: 94 }}>{ch}</span>}
        </div>);
      })}
    </section>);

  const kartaLogo = (
    <section style={karta} aria-label="Logo">
      {nadpis("Logo")}
      <Volba moznosti={[["kruh", "Kruh"], ["stvorec", "Štvorec"]] as [TvarLoga, string][]} value={p.tvar} onChange={(t) => zmen({ tvar: t })} />
      <Volba moznosti={[["cele", "Celé logo"], ["vyplnit", "Vyplniť (orez)"]] as [LogoRezim, string][]} value={p.logoRezim} onChange={zmenRezim} />
      {p.logoRezim === "cele" && <Volba moznosti={[["biele", "Biele pozadie"], ["tmave", "Tmavé"], ["priehladne", "Priehľadné"]] as [LogoPozadie, string][]} value={p.logoPozadie} onChange={zmenPozadie} />}
      {logoOrez && logoSubor
        ? <OrezFotky sprava subor={logoSubor} pomer={1} vystupSirka={LOGO_CFG.vystup} onZrusit={() => setLogoOrez(false)}
            onHotovo={(url) => { zmen({ logo: url, logoRezim: "vyplnit" }); setLogoOrez(false); }} />
        : <div style={{ display: "flex", alignItems: "flex-end", gap: 18, padding: 14, borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", flexWrap: "wrap" }}>
            {([[68, "Profil"], [40, "Feed"], [28, "Adresár"]] as [number, string][]).map(([px, t]) => (
              <span key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ width: px, height: px, borderRadius: radius, overflow: "hidden", background: p.logo ? logoPozadie : "#fff", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(px * 0.36), fontWeight: 800, color: "var(--gInk)" }}>
                  {p.logo ? <img src={p.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : inicialy}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ink3)" }}>{t}</span>
              </span>))}
            <span style={{ flex: 1 }} />
            <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button type="button" onClick={() => logoRef.current?.click()} disabled={pracujem} style={{ ...tl("zelene", 44), padding: "0 16px", fontSize: 14 }}>{pracujem ? "Spracúvam…" : p.logo ? "Zmeniť logo" : "Nahrať logo"}</button>
              {p.logo && <button type="button" onClick={() => (logoSubor ? setLogoOrez(true) : logoRef.current?.click())} style={{ ...tl("sive", 40), padding: "0 14px", fontSize: 13.5, borderRadius: 12 }}>Upraviť výrez</button>}
            </span>
          </div>}
      <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) { setLogoSubor(f); void spracuj(f, p.logoRezim, p.logoPozadie); } }} />
      <span style={poznamka}>PNG (ideálne priehľadné), JPG alebo WebP, aspoň 400 × 400 px. Široké logo dajte „Celé logo“ — neoreže sa.</span>
    </section>);

  const kartaFotka = (
    <section style={karta} aria-label="Titulná fotka">
      {nadpis("Titulná fotka", "na šírku, od 16 : 9 po 3 : 1")}
      {orez && p.cover
        ? <OrezFotky sprava zony src={p.cover.src} pomer={pomerFotky(p.cover.w, p.cover.h)} pozadie={p.cover.priemer}
            vyrez={{ ...p.cover.vyrez, rezim: "vyrez" }} onZrusit={() => setOrez(false)} onVyrez={(v) => { nastavVyrez(v); setOrez(false); }} />
        : <div onClick={() => !p.cover && coverRef.current?.click()} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void vyberCover(f); }}
            role={p.cover ? undefined : "button"} aria-label={p.cover ? undefined : "Nahrať titulnú fotku"} style={{ cursor: p.cover ? "default" : "pointer" }}>
            <Titulka cover={p.cover} ram={p.ram} zony prazdne={
              <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--ink3)", textAlign: "center", padding: 16 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>
                Pretiahni sem titulnú fotku (16 : 9)
              </span>} />
          </div>}
      {!orez && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => coverRef.current?.click()} style={{ ...tl("zelene", 44), padding: "0 14px", fontSize: 14 }}>{p.cover ? "Zmeniť fotku" : "Nahrať fotku"}</button>
        {p.cover && <>
          <button type="button" onClick={() => nastavVyrez({ rezim: "cela", zoom: 1, x: 0.5, y: 0.5 })} aria-pressed={p.cover.vyrez.rezim === "cela"} style={{ ...tl("sive", 44), padding: "0 14px", fontSize: 14 }}>Celá fotka</button>
          <button type="button" onClick={() => nastavVyrez({ rezim: "vyrez", zoom: 1, x: 0.5, y: 0.5 })} style={{ ...tl("sive", 44), padding: "0 14px", fontSize: 14 }}>Prispôsobiť rámu</button>
          <button type="button" onClick={() => setOrez(true)} style={{ ...tl("sive", 44), padding: "0 14px", fontSize: 14 }}>Upraviť výrez</button>
        </>}
      </div>}
      <input ref={coverRef} type="file" accept="image/*,.heic,.heif" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ""; if (f) void vyberCover(f); }} />
      {kvalita && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#A34A2A", lineHeight: 1.45 }}>{kvalita}</span>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
        {nadpis("Rám", "lem okolo fotky, prekryje jej okraj", 14)}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {RAMY.map((r) => { const on = r.k === p.ram; return (
            <button key={r.k} type="button" aria-pressed={on} onClick={() => zmen({ ram: r.k })} style={{ height: 44, padding: "0 14px 0 8px", borderRadius: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 800, background: on ? "var(--gSoft)" : "var(--btn)", border: `1.5px solid ${on ? "var(--gBd)" : "transparent"}`, color: on ? "var(--gInk)" : "var(--ink)" }}>
              <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 8, background: r.g, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)" }} />{r.t}
            </button>); })}
        </div>
      </div>
      <span style={poznamka}>Rám sa prispôsobí fotke na šírku (od 16 : 9 po 3 : 1), takže široká fotka nezaberie zbytočne miesto na mobile. Celá fotka = zmestí sa celá. Prispôsobiť rámu = vyplní celý rám. Upraviť výrez = posun myšou, zmenšenie a zväčšenie kolieskom. Takto nastavená sa ukáže rovnako na PC, tablete aj mobile. Aspoň 1600 × 900 px. Do označených miest (logo, štít) nedávajte nič dôležité. Fotka bez textu vyzerá na mobile najlepšie.</span>
    </section>);

  // ---------- rozloženie (bod 3) ----------
  if (mobil && !tablet) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {hlavicka}
      {kartaLogo}{kartaFotka}{kartaOnas}{kartaKontakt}
      <div style={{ display: "flex", justifyContent: "center" }}><button type="button" onClick={onZrusit} style={tl("obrys", 44)}>Zrušiť</button></div>
      <div aria-hidden="true" style={{ height: 70 }} />
      {/* spodná lišta: Náhľad · Uložiť profil — nad spodným menu appky (portál, aby ju menu neprekrylo) */}
      {createPortal(
        <div className="sprava-charity" data-stit={stit} style={{ position: "fixed", left: 12, right: 12, bottom: "calc(96px + env(safe-area-inset-bottom, 0px))", zIndex: 45, display: "flex", gap: 10, padding: 8, borderRadius: 18, background: "var(--panel)", border: "1px solid var(--cardBd)", boxShadow: "0 8px 24px rgba(30,28,20,.16)" }}>
          <button type="button" onClick={() => setPohlad("nahlad")} style={{ ...tl("sive", 50), flex: 1 }}>Náhľad</button>
          <button type="button" onClick={() => void uloz()} disabled={!mozeUlozit} style={{ ...tl("zelene", 50), flex: 2, opacity: mozeUlozit ? 1 : 0.45 }}>Uložiť profil</button>
        </div>, document.body)}
    </div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {hlavicka}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>{kartaOnas}{kartaKontakt}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>{kartaLogo}{kartaFotka}</div>
      </div>
    </div>);
}
const PH_SIETE: Partial<Record<string, string>> = { facebook: "facebook.com/…", instagram: "instagram.com/…", youtube: "youtube.com/@…", tiktok: "tiktok.com/@…", linkedin: "linkedin.com/company/…", x: "x.com/…" };

// ============================================================
// OPRAVY 107: Náhľad, Profil uložený aj tlačidlo Verejný profil = SKUTOČNÝ verejný profil (Podstranka)
// na celú obrazovku, len s lištou hore. Druhý vzhľad verejného profilu neexistuje.
// ============================================================
export function VerejnyProfilOkno({ pozicia, tier, strankaId, stit, profil, lista, ulozene, mobil, onZavri, sektor }: {
  /** OPRAVY 147: typ stránky (testovací prepínač) */ sektor?: string;
  pozicia: Pozicia; tier: Tier; strankaId: string; stit: string; profil?: ProfilStranky;
  lista: ReactNode; ulozene?: "ano" | "nie" | "info"; mobil: boolean; onZavri: () => void;
}) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  const druh = ulozene ?? "info";
  const pas = (
    <div className="sprava-charity" data-stit={stit} style={{ position: "sticky", top: 0, zIndex: 50, padding: mobil ? "10px 12px" : "12px 24px", background: "#2A2E26" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 14,
        background: druh === "ano" ? "var(--gSoft)" : druh === "nie" ? "var(--goldBg)" : "var(--bg)", border: druh === "ano" ? "1.5px solid var(--gBd)" : druh === "nie" ? "1.5px dashed var(--goldBd)" : "1.5px solid transparent" }}>{lista}</div>
    </div>);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Verejný profil" style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto", background: "var(--c-bg)" }}>
      <Podstranka pozicia={pozicia} tier={tier} logo={null} toast={toast} onBack={onZavri} strankaId={strankaId} profilNahlad={profil} lista={pas} sektor={sektor} />
    </div>, document.body);
}
