// ============================================================
// KARTA 41 · časť 2 (41b) · Pridať Iskru. Prototyp „Pridat Iskru mobil". Jeden diel pre človeka aj charitu
// (podľa „Konáš ako" hore), postavený ako Pridať skutok: 1 Video · 2 Kam pôjdu peniaze · 3 Náhľad · 4 Zverejniť · Hotovo.
// Človek tyká, charita vyká. Reťaz dobra = ten istý diel ako v platobnom module (PercentaRetaze), najmenej 5 %, jedna zbierka.
// Charita: centrálna / iná zbierka (100 %, bez percent) / bez peňazí; „Ukázať video všetkým v Iskrách" (kvóta podľa programu).
// TODO (server): nahratie videa, uloženie Iskry, kvóta charity, vypálenie QR do videa pri stiahnutí.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLayout } from "@/components/context";
import { toast } from "@/components/toast";
import { RichTextInput } from "@/components/richtext";
import { cistyText } from "@/lib/richtext";
import { DeedQr } from "@/components/deedqr";
import { DeedZnacka } from "@/components/DeedZnacka";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useLokalita } from "@/lib/lokalita";
import { useNastaveniaAppky } from "@/lib/nastaveniaAppky";
import { jeNeregistrovany } from "@/lib/devDarca";
import { useMojeStranky, UKAZKOVE_STRANKY } from "@/lib/mojeStranky";
import { nacitajTiery } from "@/features/rola/stav";
import { CENTRALNA_ID } from "@/features/rola/vlastneZbierky";
import { verejneBeziace, zbierkaVRetazi, type ZbierkaVRetazi } from "@/lib/retaz";
import { normalizuj } from "@/lib/mojeSkutky";
import { najdiTestProfil, TEST_PROFILY, eur as eurT, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { ISKRY_CFG, KVOTA_ISKIER, kvotaOstava, minKvotu, odkazIskry, pridajIskru, type DruhIskry, type Iskra } from "@/lib/iskry";
import { Harok } from "@/features/zbierka/Zdielat";
import { PercentaRetaze } from "@/features/zbierka/RetazDobra";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { potvrditTuknutim } from "@/features/zbierka/Platba";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { otvorIskry, usePridatIskruOtvorene, zavriPridatIskru, otvorPridatIskru, pridatIskruAko } from "./otvor";
import { ZdielatIskru } from "./Iskry";
import "@/styles/sprava.css";

const MAX_S = 60, ODPORUCANE_S = 45, POPIS_MAX = 150;
type Pen = "ja" | "retaz" | "centralna" | "ina" | "bez" | "zbierka";
const Ik = ({ d, s = 22, w = 2.2, c = "currentColor", fill = "none" }: { d: string; s?: number; w?: number; c?: string; fill?: string }) =>
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const IK = { spat: "M15 18l-6-6 6-6", hraj: "M8 5l12 7-12 7z", qr: "M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M8 12h8", lupa: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  iskra: "M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z", fajka: "M5 12l5 5 9-10", video: "M3 7h12v10H3zM15 10l6-3v10l-6-3", skutok: "M20 6 9 17l-5-5" };

// ---------- zelené + → výber (Skutok · Iskra) ----------
export function PridatVyber({ onClose }: { onClose: () => void }) {
  const st = useMojeStranky();
  const { rod } = usePouzivatel(); // bez rodu v profile ostáva mužský tvar
  const org = UKAZKOVE_STRANKY.find((x) => x.k === st.ako && x.typ === "charita");
  const o = (ty: string, vy: string) => (org ? vy : ty);
  const riadok = (ik: string, t: string, s: string, on: () => void) => (
    <button type="button" onClick={() => { onClose(); on(); }} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "12px 14px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
      <span style={{ width: 44, height: 44, flex: "none", borderRadius: 13, background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={ik} /></span>
      <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 16 }}>{t}</b><span style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{s}</span></span>
    </button>);
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>{o("Čo chceš pridať?", "Čo chcete pridať?")}</span>}>
      {riadok(IK.skutok, "Skutok", o(`${rod === "zena" ? "Urobila" : "Urobil"} som niečo dobré.`, "Urobili ste niečo dobré."), () => otvorPridatSkutok())}
      {riadok(IK.iskra, "Iskra", "Krátke video do 45 s.", () => otvorPridatIskru())}
    </Harok>);
}

// ---------- host (raz v App) ----------
export function PridatIskruHost() {
  const otv = usePridatIskruOtvorene();
  if (!otv) return null;
  return <PridatIskru />;
}

function PridatIskru() {
  const { wide } = useLayout();
  const ja = usePouzivatel();
  const lok = useLokalita();
  const mestoPovolene = useNastaveniaAppky().poloha; // bez povolenej polohy mesto nepíšeme
  const st = useMojeStranky();
  const ako = pridatIskruAko() ?? st.ako; // zo Správy charity vždy za charitu
  const stranka = UKAZKOVE_STRANKY.find((x) => x.k === ako && x.typ === "charita") ?? null;
  const org = !!stranka;
  const o = (ty: string, vy: string) => (org ? vy : ty);
  const autor = org ? stranka!.n : `${ja.meno || "Ty"}${ja.priezvisko ? ` ${ja.priezvisko[0].toUpperCase()}.` : ""}`;
  const ini = (org ? stranka!.i : autor.split(/\s+/).map((x) => x[0]).join("").slice(0, 2)).toUpperCase();
  const tier = nacitajTiery().charita;
  // OPRAVY 135: druh „Zbierky" len pre toho, kto vedie bežiacu zbierku (charita, firma, tvorca) — video k vlastnej zbierke
  const vedie = UKAZKOVE_STRANKY.find((x) => x.k === ako) ?? null;
  const vsetkyZb: TestZbierka[] = vedie ? (najdiTestProfil(vedie.k)?.zbierky ?? []) : [];
  const mojeZb = vsetkyZb.filter((z) => z.stav !== "ukoncena");
  // OPRAVY 138/2: Ďakujeme = ukončené zbierky za posledných 90 dní; Ďakujeme firme = firmy, ktoré pri zbierke stránky dorovnávali (bežiace aj ukončené)
  const ukonceneZb = vsetkyZb.filter((z) => z.stav === "ukoncena" && z.rok && z.m && z.d && Date.now() - new Date(z.rok, MES.indexOf(z.m), parseInt(z.d, 10)).getTime() <= 90 * 864e5);
  const firmy: { f: TestProfil; zb: TestZbierka[] }[] = TEST_PROFILY.filter((f) => f.typ === "firma" && f.k !== vedie?.k)
    .map((f) => ({ f, zb: vsetkyZb.filter((z) => !!z.dorovnanie && z.dorovnanie.includes(f.meno.replace(/\s+s\.\s?r\.\s?o\.$/, ""))) })).filter((x) => x.zb.length);
  const DZ = ISKRY_CFG.druhZbierky;
  const [vlastnaZb, setVlastnaZb] = useState<TestZbierka | null>(null);
  const [vidTyp, setVidTyp] = useState<"vyzva" | "dakujeme" | "firme" | null>(null);
  const [priebeh, setPriebeh] = useState(false); // štítok Výzva / Priebeh — stránka si zvolí
  const [firmaK, setFirmaK] = useState<string | null>(null);

  const [k, setK] = useState(1);
  const [video, setVideo] = useState<{ url: string; s: number | null } | null>(null);
  const [vch, setVch] = useState<string | null>(null);
  const [popis, setPopis] = useState("");
  const [druh, setDruh] = useState<DruhIskry | null>(null);
  const [pen, setPen] = useState<Pen | null>(null);
  const [zb, setZb] = useState<ZbierkaVRetazi | null>(null);
  const [q, setQ] = useState("");
  const [pct, setPct] = useState(25);
  const [ok1, setOk1] = useState(false);
  const [ok2, setOk2] = useState(false);
  const [sken, setSken] = useState(false);
  const [hotovo, setHotovo] = useState<Iskra | null>(null);
  const [zdielat, setZdielat] = useState(false);
  const subRef = useRef<HTMLInputElement>(null), kamRef = useRef<HTMLInputElement>(null), telo = useRef<HTMLDivElement>(null);
  const hladajRef = useRef<HTMLInputElement>(null); // „Hľadať zbierku" zo skenera dá fokus do poľa
  useEffect(() => { telo.current?.scrollTo({ top: 0 }); }, [k, hotovo]);
  useEffect(() => () => { if (video && !hotovo) URL.revokeObjectURL(video.url); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === "Escape" && !zdielat && !sken) zavri(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); });

  // len prihlásený
  const neprihlaseny = jeNeregistrovany();
  const kvota = org ? kvotaOstava(stranka!.k, tier) : 0;
  const popisT = cistyText(popis);
  const ukazZb = pen === "ina" || pen === "retaz";
  const centralnaN = org ? `Centrálna zbierka ${stranka!.n}` : "";

  const chyba = k === 1 ? (!video ? o("Nahraj video", "Nahrajte video") : popisT.length < 5 ? o("Napíš, čo je na videu", "Napíšte, čo je na videu") : druh == null ? o("Vyber druh", "Vyberte druh") : druh === DZ && !vidTyp ? o("Vyber, aké video", "Vyberte, aké video") : druh === DZ && vidTyp === "firme" && !firmaK ? o("Vyber firmu", "Vyberte firmu") : druh === DZ && !vlastnaZb ? o("Vyber zbierku", "Vyberte zbierku") : "")
    : k === 2 && druh === DZ ? ""
    : k === 2 ? (!pen ? o("Vyber, kam pôjdu peniaze", "Vyberte, kam pôjdu peniaze") : ukazZb && !zb ? o("Vyber zbierku", "Vyberte zbierku") : "")
    : k === 4 ? (!ok1 ? o("Potvrď, že video je tvoje", "Potvrďte, že video je vaše") : "") : "";

  const zavri = () => { zavriPridatIskru(); };
  // Hotovo: Pozrieť aj Zavrieť (aj šípka späť) otvoria prúd rovno na novom videu
  const doPrudu = () => { const id = hotovo?.id; zavriPridatIskru(); if (id) otvorIskry(id); };
  const spat = () => { if (hotovo) return doPrudu(); if (k > 1) setK(k - 1); else zavri(); };

  const onVideo = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) { setVch(o("Toto nie je video. Vyber súbor MP4 alebo MOV.", "Toto nie je video. Vyberte súbor MP4 alebo MOV.")); return; }
    const url = URL.createObjectURL(f);
    const v = document.createElement("video"); v.preload = "metadata";
    v.onloadedmetadata = () => {
      const s = Math.round(v.duration);
      if (v.duration > MAX_S + 0.5) { URL.revokeObjectURL(url); setVch(`Video má ${s} s. Najviac je 1 minúta, ${o("skráť ho.", "skráťte ho.")}`); return; }
      if (video) URL.revokeObjectURL(video.url);
      setVideo({ url, s }); setVch(v.duration > ODPORUCANE_S + 0.5 ? `Video má ${s} s. Odporúčame do 45 s, ale ešte je to v poriadku.` : null);
    };
    v.onerror = () => { if (video) URL.revokeObjectURL(video.url); setVideo({ url, s: null }); setVch(null); };
    v.src = url;
  };

  const zbNazov = druh === DZ && vlastnaZb ? vlastnaZb.nazov : pen === "centralna" ? centralnaN : ukazZb && zb ? zb.nazov : "";
  const zbPozn = druh === DZ ? (vidTyp === "vyzva" ? "100 % ide na zbierku" : vidTyp === "firme" ? "Ďakujeme firme" : "Ďakujeme") : pen === "centralna" ? "100 % na centrálnu zbierku" : pen === "retaz" ? `Reťaz dobra · ${pct} % ide na zbierku` : pen === "ina" ? "100 % ide na zbierku" : "";

  const zverejni = () => {
    if (chyba || !video || druh == null) return;
    if (druh === DZ) {
      if (!vedie || !vlastnaZb) return;
      if (org && ok2 && kvota > 0) minKvotu(stranka!.k);
      const typT = vedie.typ === "charita" ? "Charita" : vedie.typ === "firma" ? "Firma" : "Tvorca";
      const n = pridajIskru({ druh, autor: vedie.n, kto: `${typT} · ${vlastnaZb.mesto}`, ini: vedie.i, org: vedie.typ !== "tvorca", popis: popisT, src: video.url, bg: "#1D211B",
        zb: { typ: vidTyp ?? "vyzva", stitok: vidTyp === "dakujeme" ? "Ďakujeme" : vidTyp === "firme" ? "Ďakujeme firme" : priebeh ? "Priebeh" : "Výzva", stranka: vedie.k, zbierkaId: vlastnaZb.id, firma: vidTyp === "firme" ? firmaK ?? undefined : undefined },
        lenStranka: org && !ok2 });
      setHotovo(n); return;
    }
    if (!pen) return;
    const vsetkym = !org || ok2;
    if (org && ok2 && kvota > 0) minKvotu(stranka!.k);
    if (org && ok2 && kvota <= 0) toast(`Video nad rámec programu · ${KVOTA_ISKIER.cenaNad} €`);
    const zbierka = pen === "centralna" ? { id: CENTRALNA_ID, nazov: centralnaN, pozn: zbPozn }
      : (pen === "ina" || pen === "retaz") && zb ? { id: zb.id, nazov: zb.nazov, pozn: zbPozn } : undefined;
    const n = pridajIskru({ druh, autor, kto: org ? ["Charita", mestoPovolene ? lok.mesto : ""].filter(Boolean).join(" · ") : (mestoPovolene ? lok.mesto : ""), ini, org, popis: popisT, src: video.url, bg: "#1D211B",
      zbierka, bezDarov: pen === "bez", retazPct: pen === "retaz" ? pct : undefined, lenStranka: org && !vsetkym });
    setHotovo(n);
  };

  // ---------- vzhľad ----------
  const vyber = (on: boolean): CSSProperties => ({ background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}` });
  const radio = (on: boolean) => <span aria-hidden="true" style={{ width: 22, height: 22, flex: "none", marginTop: 1, borderRadius: "50%", border: `2px solid ${on ? "var(--green)" : "#9C978B"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0 }} /></span>;
  const zaskrt = (on: boolean, t: ReactNode, s: ReactNode, tap: () => void) => (
    <button type="button" role="checkbox" aria-checked={on} onClick={tap} style={{ ...vyber(on), display: "flex", alignItems: "flex-start", gap: 12, minHeight: 56, padding: "12px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
      <span aria-hidden="true" style={{ width: 24, height: 24, flex: "none", borderRadius: 7, border: `2px solid ${on ? "var(--green)" : "#9C978B"}`, background: on ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ opacity: on ? 1 : 0, display: "flex" }}><Ik d={IK.fajka} s={14} w={3} c="#fff" /></span></span>
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 14.5, lineHeight: 1.45 }}>{t}</b><span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{s}</span></span>
    </button>);
  const lbl: CSSProperties = { fontSize: 15, fontWeight: 800 };
  const nadpisy = ["Video", "Kam pôjdu peniaze", "Náhľad", "Zverejniť"];
  const tuk = potvrditTuknutim();

  // ---------- kroky ----------
  let obsah: ReactNode;
  if (neprihlaseny) obsah = <div style={{ padding: "40px 8px", textAlign: "center", fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Iskru môže pridať len prihlásený.</div>;
  else if (hotovo) obsah = (
    <div className="pf-rise" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 8px", textAlign: "center" }}>
      <span style={{ width: 72, height: 72, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,196,92,.6),rgba(255,196,92,0) 70%)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.iskra} s={34} w={0} fill="#E8B64A" /></span>
      <b style={{ fontSize: 21 }}>Iskra je zverejnená</b>
      <span style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>{org
        ? (hotovo.lenStranka ? "Je len na vašej stránke. Uvidia ju tí, ktorí vás navštívia alebo sledujú." : "Je na vašej stránke a uvidia ju všetci v Iskrách. Kam idú peniaze, je zapečatené.")
        : `Je v Iskrách. Do vyššej oblasti sa môže posunúť po ${ISKRY_CFG.posunPoHodinach} hodinách. Kam idú peniaze, je zapečatené.`}</span>
    </div>);
  else if (k === 1) obsah = (<>
    <div role="button" tabIndex={0} onClick={() => subRef.current?.click()} onKeyDown={(e) => { if (e.key === "Enter") subRef.current?.click(); }} aria-label={video ? "Zmeniť video" : "Nahrať video"}
      style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: 300, borderRadius: 22, border: "2px dashed var(--gBd)", background: "var(--card)", cursor: "pointer", overflow: "hidden" }}>
      {video ? <>
        <video src={video.url} muted autoPlay loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <span style={{ position: "absolute", right: 10, bottom: 10, height: 32, padding: "0 12px", borderRadius: 16, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center" }}>Zmeniť video</span>
      </> : <>
        <span style={{ width: 56, height: 56, borderRadius: "50%", background: "#4B7A35", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.hraj} s={26} w={0} fill="#fff" /></span>
        <b style={{ fontSize: 16, color: "var(--gInk)" }}>Nahrať video</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>na výšku, do 45 s</span>
      </>}
    </div>
    <input ref={subRef} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; onVideo(f); }} />
    <input ref={kamRef} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; onVideo(f); }} />
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" onClick={() => kamRef.current?.click()} style={{ flex: 1, minHeight: 50, borderRadius: 14, border: "1.5px solid var(--gBd)", background: "var(--gSoft)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)" }}>Natočiť video</button>
      <button type="button" onClick={() => subRef.current?.click()} style={{ flex: 1, minHeight: 50, borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>Vybrať zo súborov</button>
    </div>
    {vch && <span role="status" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.45, color: video && !/Najviac|nie je video/.test(vch) ? "var(--gold)" : "#8E3B2F" }}>{vch}</span>}
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Čo je na videu</span>
      <RichTextInput vzhlad="sprava" value={popis} onChange={setPopis} minH={84} ariaLabel="Čo je na videu" placeholder="Napríklad: Emka hrá Vivaldiho, husle sú jej už malé."
        nastroje={["diktovat"]} maxZnakov={POPIS_MAX} tvrdyLimit={POPIS_MAX} /></div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><span style={lbl}>Druh</span>
      <div role="radiogroup" aria-label="Druh" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {ISKRY_CFG.druhy.slice(1).map((t, i) => { const on = druh === i + 1; if (i + 1 === DZ && !mojeZb.length && !ukonceneZb.length) return null; return (
          <button key={t} type="button" role="radio" aria-checked={on} onClick={() => { setDruh((i + 1) as DruhIskry); if (i + 1 !== DZ) { setVlastnaZb(null); setVidTyp(null); setFirmaK(null); } }} style={{ minHeight: 44, padding: "0 16px", borderRadius: 22, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 600, background: on ? "#2F5E3A" : "transparent", border: `1.5px solid ${on ? "#2F5E3A" : "var(--fieldBd)"}`, color: on ? "#fff" : "var(--ink)" }}>{t}</button>); })}
      </div></div>
    {druh === DZ && <ZbierkyVyber o={o} vidTyp={vidTyp} onTyp={(t) => { setVidTyp(t); setVlastnaZb(null); setFirmaK(null); }} priebeh={priebeh} onPriebeh={setPriebeh}
      bezice={mojeZb} ukoncene={ukonceneZb} firmy={firmy} firmaK={firmaK} onFirma={(f) => { setFirmaK(f); setVlastnaZb(null); }} zbierka={vlastnaZb} onZbierka={setVlastnaZb} radio={radio} vyber={vyber} />}
  </>);
  else if (k === 2 && druh === DZ) obsah = (<>
    <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{vidTyp === "vyzva" ? "Pod videom bude tlačidlo Darovať. Celý dar pôjde na zbierku." : o("Je to poďakovanie, pod videom nebude Darovať, ale Sledovať tvoju stránku.", "Je to poďakovanie, pod videom nebude Darovať, ale Sledovať vašu stránku.")}</span>
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 14, borderRadius: 16, background: "var(--gSoft)", border: "1.5px solid var(--gBd)" }}>
      <span style={{ fontSize: 13, color: "var(--ink3)" }}>{zbPozn}{vidTyp === "firme" && firmaK ? ` · ${(najdiTestProfil(firmaK)?.meno ?? "").replace(/\s+s\.\s?r\.\s?o\.$/, "")}` : ""}</span><b style={{ fontSize: 15 }}>{vlastnaZb?.nazov}</b>
    </div>
    <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>Po zverejnení sa to zapečatí.</b> Kam idú peniaze, sa už nedá zmeniť.</div>
  </>);
  else if (k === 2) {
    const P: [Pen, string, string][] = org
      ? [["centralna", "Na našu centrálnu zbierku", `Celý príspevok ide na celú činnosť ${stranka!.n}`.replace(/\.?$/, ".")], ["ina", "Na zbierku inej charity", "Celý príspevok (100 %) pôjde na vybranú zbierku."], ["bez", "Bez peňazí", "Pri videu nebude tlačidlo Darovať."]]
      : [["ja", "Pre mňa", "Dary pôjdu tebe, autorovi videa."], ["retaz", "Reťaz dobra", "Delíš sa so zbierkou. Sám určíš, koľko % pôjde na ňu, najmenej 5 %."], ["bez", "Bez peňazí", "Pri videu nebude tlačidlo Darovať."]];
    const qq = normalizuj(q.trim());
    const najdene = !zb && qq.length >= 2 ? verejneBeziace().filter((z) => (!org || z.org !== stranka!.n) && (normalizuj(z.nazov).includes(qq) || normalizuj(z.org).includes(qq))).slice(0, 8) : [];
    obsah = (<>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{o("Pod videom bude tlačidlo Darovať. Vyber, kam pôjdu peniaze.", "Pod videom bude tlačidlo Darovať. Vyberte, kam pôjdu peniaze.")}</span>
      <div role="radiogroup" aria-label="Kam pôjdu peniaze" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {P.map(([kk, t, x]) => { const on = pen === kk; return (
          <button key={kk} type="button" role="radio" aria-checked={on} onClick={() => { setPen(kk); setZb(null); setQ(""); }} style={{ ...vyber(on), display: "flex", alignItems: "flex-start", gap: 12, minHeight: 64, padding: "12px 14px", borderRadius: 16, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            {radio(on)}<span style={{ display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{x}</span></span></button>); })}
      </div>
      {ukazZb && <div className="pf-rise" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: 16, background: "var(--card)" }}>
        <b style={{ fontSize: 14.5 }}>{zb ? o("Zbierka, ktorej pomôžeš", "Vybraná zbierka") : o("Vyber zbierku, ktorej pomôžeš", "Vyberte zbierku inej charity")}</b>
        {/* len hľadanie (od 2 znakov) + QR zbierky, žiadne návrhy vopred; po výbere ostane jedna + Zmeniť zbierku */}
        {!zb && <>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, minHeight: 46, padding: "0 12px", borderRadius: 12, border: "1.5px solid var(--fieldBd)", background: "var(--field)", color: "var(--ink3)" }}>
              <Ik d={IK.lupa} s={18} />
              <input ref={hladajRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={o("Hľadať zbierku alebo meno", "Hľadať zbierku alebo charitu")} aria-label="Hľadať zbierku" style={{ flex: 1, minWidth: 0, height: 42, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none" }} />
            </label>
            <button type="button" onClick={() => setSken(true)} aria-label="Naskenovať QR zbierky" style={{ flex: "none", width: 46, height: 46, borderRadius: 12, border: "1.5px solid var(--fieldBd)", background: "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}><Ik d={IK.qr} s={20} w={2} /></button>
          </div>
          {(qq.length < 2 || !najdene.length) && <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{qq.length >= 2 ? o("Nič sme nenašli. Skús iný názov alebo naskenuj QR.", "Nič sme nenašli. Skúste iný názov alebo naskenujte QR.")
            : o("Napíš názov zbierky alebo meno, alebo naskenuj QR zbierky, napríklad od kamaráta.", "Napíšte názov zbierky alebo charity, alebo naskenujte QR zbierky.")}</span>}
        </>}
        {(zb ? [zb] : najdene).map((z) => <ZbierkaRiadok key={z.id} z={z} on={!!zb} onClick={() => setZb(z)} />)}
        {zb && <button type="button" onClick={() => { setZb(null); setQ(""); }} style={{ alignSelf: "flex-start", minHeight: 44, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)" }}>Zmeniť zbierku</button>}
        {!org && pen === "retaz" && zb && <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6, paddingTop: 12, borderTop: "1px solid var(--cardBd)" }}>
          <PercentaRetaze pct={pct} onPct={(v) => setPct(Math.max(5, Math.min(100, Math.round(v / 5) * 5)))} />
        </div>}
      </div>}
      <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>Po zverejnení sa to zapečatí.</b> Kam idú peniaze, sa už nedá zmeniť.</div>
    </>);
  } else if (k === 3) obsah = (<>
    <span style={{ fontSize: 14.5, color: "var(--ink2)" }}>Takto ju uvidia ľudia v Iskrách.</span>
    <div style={{ position: "relative", alignSelf: "center", width: 240, height: 426, borderRadius: 22, overflow: "hidden", background: "#000", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.7)" }}>
      {video && <video src={video.url} muted autoPlay loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 28%,rgba(0,0,0,0) 50%,rgba(0,0,0,.85) 100%)" }} />
      {/* QR Iskry ako polopriehľadný vodoznak (inverzný, ~35 %) */}
      <span aria-hidden="true" style={{ position: "absolute", top: 12, right: 10, opacity: 0.35, lineHeight: 0 }}><DeedQr data={odkazIskry("nahlad")} odznak={org ? "D++" : "D+"} retaz={pen === "retaz"} variant="inverzny" size={56} /></span>
      <span style={{ position: "absolute", left: 10, top: "40%", display: "flex", flexDirection: "column", opacity: 0.85 }}><span style={{ fontSize: 13, fontWeight: 800, color: "#8CC653", lineHeight: 1 }}><DeedZnacka /></span><span style={{ fontSize: 8, fontWeight: 700 }}>{autor}</span></span>
      <div style={{ position: "absolute", right: 8, bottom: 96, display: "flex", flexDirection: "column", gap: 8 }}>
        {["rgba(0,0,0,.45)", "rgba(0,0,0,.45)", pen === "bez" ? "transparent" : "#4B7A35", "rgba(0,0,0,.45)"].map((b, i) => <span key={i} style={{ width: 34, height: 34, borderRadius: "50%", background: b }} />)}
      </div>
      <div style={{ position: "absolute", left: 10, right: 52, bottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <b style={{ fontSize: 12.5 }}>{autor}</b><span style={{ fontSize: 11, lineHeight: 1.4 }}>{popisT || "Popis videa"}</span>
        {zbNazov && <span style={{ padding: "6px 8px", borderRadius: 9, background: "rgba(0,0,0,.5)", fontSize: 10.5, lineHeight: 1.35, textShadow: "none" }}><span style={{ opacity: 0.85 }}>{zbPozn}</span><br /><b>{zbNazov}</b></span>}
      </div>
    </div>
  </>);
  else {
    const ostava = kvota > 0;
    obsah = (<>
      <section style={{ borderRadius: 20, background: "var(--card)", padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
        <b style={{ fontSize: 18 }}>{o("Video musí byť tvoje", "Video musí byť vaše")}</b>
        <span style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>{o("Zverejniť môžeš len video, ktoré si natočil sám alebo s ľuďmi, ktorí s tým súhlasia.", "Vaše Iskry nekontroluje umelá inteligencia. Ako organizácia za ne zodpovedáte sami.")}</span>
        <span style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>{o("Cudzie video alebo video vytvorené AI, ktoré vydávaš za svoje, znamená zákaz účtu. Ľudia ho môžu namietať a my ho stiahneme.", "Cudzie video alebo video vytvorené AI, ktoré vydávate za svoje, znamená zákaz účtu. Ľudia ho môžu namietať a my ho stiahneme.")}</span>
      </section>
      {zaskrt(ok1, o("Video je moje alebo mám právo ho použiť", "Video je naše alebo máme právo ho použiť"), "Ľudia na videu súhlasia, deti len so súhlasom rodiča.", () => setOk1(!ok1))}
      {org && zaskrt(ok2, "Ukázať video všetkým v Iskrách",
        ostava ? `Uvidia ho aj ľudia, ktorí vás nesledujú. V programe máte ${KVOTA_ISKIER.naProgram[tier] ?? 1} ${(KVOTA_ISKIER.naProgram[tier] ?? 1) === 1 ? "takéto video" : "takéto videá"} mesačne zadarmo, tento mesiac vám ešte ${kvota === 1 ? "ostáva" : `ostávajú ${kvota}`}. Ďalšie stojí ${KVOTA_ISKIER.cenaNad} €. Bez zaškrtnutia bude video len na vašej stránke.`
          : `Uvidia ho aj ľudia, ktorí vás nesledujú. Tento mesiac ste už použili. Toto video stojí ${KVOTA_ISKIER.cenaNad} €. Bez zaškrtnutia bude video len na vašej stránke.`, () => setOk2(!ok2))}
    </>);
  }

  const pata = neprihlaseny ? <button type="button" onClick={zavri} style={tlHl(false)}>Zavrieť</button>
    : hotovo ? <>
      <button type="button" onClick={doPrudu} style={tlHl(false)}>Pozrieť v Iskrách</button>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={() => setZdielat(true)} style={tlVed}>Zdieľať</button>
        <button type="button" onClick={doPrudu} style={tlVed}>Zavrieť</button>
      </div>
    </> : <>
      {chyba && <span role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: "var(--gold)" }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)" }} />{chyba}</span>}
      {k < 4 ? <button type="button" aria-disabled={!!chyba} onClick={() => { if (!chyba) setK(k + 1); }} style={tlHl(!!chyba)}>Pokračovať</button>
        : <>
          {tuk ? <button type="button" onDoubleClick={zverejni} aria-disabled={!!chyba} style={tlHl(!!chyba)}>{o("Dvakrát klikni a zverejni", "Dvakrát kliknite a zverejnite")}</button>
            : <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={o("Podrž a zverejni", "Podržte a zverejnite")} disabled={!!chyba} onConfirm={zverejni} /></div>}
          <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)", textAlign: "center" }}>{o("Po zverejnení ju hneď uvidia ľudia v Iskrách. Pred zverejnením si ju poriadne pozri.", "Po zverejnení ju hneď uvidia ľudia v Iskrách. Pred zverejnením si ju poriadne pozrite.")}</span>
        </>}
    </>;

  const okno = (
    <div className="sprava-charity" role="dialog" aria-modal="true" aria-label="Pridať Iskru"
      style={{ position: "fixed", inset: 0, zIndex: 145, display: "flex", alignItems: "center", justifyContent: "center", background: wide ? "rgba(29,33,27,.55)" : "var(--bg)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ position: "relative", width: wide ? 520 : "100%", maxWidth: "100%", height: wide ? "min(calc(100% - 48px), 900px)" : "100%", borderRadius: wide ? 28 : 0, background: "var(--bg)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: wide ? "0 30px 70px rgba(30,28,20,.3)" : "none" }}>
        <div style={{ flex: "none", padding: "max(14px, env(safe-area-inset-top)) 18px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={spat} aria-label={hotovo || k === 1 ? "Zavrieť" : "Späť"} style={{ width: 44, height: 44, marginLeft: -10, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}><Ik d={IK.spat} s={22} w={2.4} /></button>
            <b style={{ flex: 1, minWidth: 0, fontSize: 19, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hotovo ? "Hotovo" : nadpisy[k - 1]}</b>
            <span style={{ flex: "0 1 auto", minWidth: 0, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", height: 28, lineHeight: "28px", padding: "0 10px", borderRadius: 14, fontSize: 12.5, fontWeight: 800, background: org ? "#2F5E3A" : "var(--card)", color: org ? "#fff" : "var(--ink)" }}>ako {org ? stranka!.n : autor}</span>
            {!hotovo && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink4)" }}>{k} / 4</span>}
          </div>
          <div style={{ display: "flex", gap: 5 }}>{[1, 2, 3, 4].map((i) => <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: hotovo || i <= k ? "#6BA34A" : "var(--cardBd)" }} />)}</div>
        </div>
        <div ref={telo} style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "6px 18px 18px", display: "flex", flexDirection: "column", gap: 16 }}>{obsah}</div>
        <div style={{ flex: "none", padding: "12px 18px max(22px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--cardBd)", background: "var(--bg)" }}>{pata}</div>
      </div>
      {sken && <SkenZbierky onClose={() => setSken(false)} onZbierka={(z) => { setZb(z); setSken(false); }}
        onHladat={() => { setSken(false); window.setTimeout(() => hladajRef.current?.focus(), 120); }} />}
      {zdielat && hotovo && <ZdielatIskru v={hotovo} onClose={() => setZdielat(false)} />}
    </div>);
  return createPortal(okno, document.body);
}

const MES = ["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"];

// ---------- OPRAVY 138/2 · druh Zbierky: „Aké video?" (3 veľké voľby, 56 px) a výber zbierky / firmy ----------
function ZbierkyVyber({ o, vidTyp, onTyp, priebeh, onPriebeh, bezice, ukoncene, firmy, firmaK, onFirma, zbierka, onZbierka, radio, vyber }: {
  o: (ty: string, vy: string) => string; vidTyp: "vyzva" | "dakujeme" | "firme" | null; onTyp: (t: "vyzva" | "dakujeme" | "firme") => void;
  priebeh: boolean; onPriebeh: (p: boolean) => void; bezice: TestZbierka[]; ukoncene: TestZbierka[]; firmy: { f: TestProfil; zb: TestZbierka[] }[];
  firmaK: string | null; onFirma: (k: string) => void; zbierka: TestZbierka | null; onZbierka: (z: TestZbierka) => void;
  radio: (on: boolean) => ReactNode; vyber: (on: boolean) => CSSProperties;
}) {
  const TYPY: ["vyzva" | "dakujeme" | "firme", string, string, number][] = [
    ["vyzva", "Výzva alebo priebeh", "K bežiacej zbierke", bezice.length],
    ["dakujeme", "Ďakujeme", "K ukončenej zbierke za posledných 90 dní", ukoncene.length],
    ["firme", "Ďakujeme firme", "Firme, ktorá pri zbierke dorovnávala alebo sponzorovala", firmy.length],
  ];
  const meno = (f: TestProfil) => f.meno.replace(/\s+s\.\s?r\.\s?o\.$/, "");
  const zoznam = vidTyp === "vyzva" ? bezice : vidTyp === "dakujeme" ? ukoncene : vidTyp === "firme" && firmaK ? (firmy.find((x) => x.f.k === firmaK)?.zb ?? []) : [];
  const riadok = (on: boolean, t: string, s: string, tap: () => void, key: string) => (
    <button key={key} type="button" role="radio" aria-checked={on} onClick={tap} style={{ ...vyber(on), display: "flex", alignItems: "flex-start", gap: 12, minHeight: 56, padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
      {radio(on)}<span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14 }}>{t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
    </button>);
  const sumaZb = (z: TestZbierka) => z.stav === "ukoncena" ? `skončila ${z.skoncila ?? ""} · ${eurT(z.vyzbierane)}` : z.ciel ? `${eurT(z.vyzbierane)} z ${eurT(z.ciel)}` : eurT(z.vyzbierane);
  return (
    <div className="pf-rise" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 16, background: "var(--card)" }}>
      <b style={{ fontSize: 15 }}>Aké video?</b>
      <div role="radiogroup" aria-label="Aké video" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {TYPY.map(([k, t, s, n]) => { const on = vidTyp === k, off = !n; return (
          <button key={k} type="button" role="radio" aria-checked={on} aria-disabled={off} onClick={() => { if (!off) onTyp(k); }}
            style={{ ...vyber(on), display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 14px", borderRadius: 14, cursor: off ? "default" : "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", opacity: off ? 0.5 : 1 }}>
            {radio(on)}<span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{off ? (k === "firme" ? o("Žiadna firma zatiaľ pri tvojich zbierkach nepomáhala", "Žiadna firma zatiaľ pri vašich zbierkach nepomáhala") : "Žiadna takáto zbierka") : s}</span></span>
          </button>); })}
      </div>
      {vidTyp === "vyzva" && <div role="radiogroup" aria-label="Štítok" style={{ display: "flex", gap: 2, padding: 3, borderRadius: 12, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        {([["Výzva", false], ["Priebeh", true]] as const).map(([t, p]) => <button key={t} type="button" role="radio" aria-checked={priebeh === p} onClick={() => onPriebeh(p)}
          style={{ flex: 1, minHeight: 44, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: priebeh === p ? 800 : 600, background: priebeh === p ? "var(--card)" : "transparent", color: "var(--ink)" }}>{t}</button>)}
      </div>}
      {vidTyp === "firme" && <>
        <b style={{ fontSize: 14.5 }}>Ktorá firma pomohla</b>
        <div role="radiogroup" aria-label="Firma" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {firmy.map(({ f, zb }) => riadok(firmaK === f.k, meno(f), `pri ${zb.length === 1 ? "zbierke " + zb[0].nazov : zb.length + " zbierkach"}`, () => onFirma(f.k), f.k))}
        </div>
      </>}
      {zoznam.length > 0 && <>
        <b style={{ fontSize: 14.5 }}>Ku ktorej zbierke je video</b>
        <div role="radiogroup" aria-label="Zbierka" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {zoznam.map((z) => riadok(zbierka?.id === z.id, z.nazov, `${z.mesto} · ${sumaZb(z)}`, () => onZbierka(z), z.id))}
        </div>
        <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>Video sa ukáže v Iskrách len pod Zbierkami.</span>
      </>}
    </div>);
}

const tlHl = (off: boolean): CSSProperties => ({ minHeight: 54, border: "none", borderRadius: 16, cursor: off ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", background: "#4B7A35", opacity: off ? 0.45 : 1 });
const tlVed: CSSProperties = { flex: 1, minHeight: 48, borderRadius: 14, border: "1.5px solid var(--fieldBd)", background: "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)" };

function ZbierkaRiadok({ z, on, onClick }: { z: ZbierkaVRetazi; on: boolean; onClick: () => void }) {
  const p = z.ciel ? Math.min(1, z.vyzbierane / z.ciel) : 0;
  return (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 56, padding: "10px 12px", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}` }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8, width: "100%" }}><b style={{ flex: 1, fontSize: 14 }}>{z.nazov}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>{z.ciel ? `vyzbierané ${Math.round(p * 100)} %` : z.org}</span></span>
      {z.ciel ? <span style={{ display: "block", width: "100%", height: 4, borderRadius: 2, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: "100%", background: "#6BA34A", transformOrigin: "left", transform: `scaleX(${p})` }} /></span> : null}
    </button>);
}

/** QR zbierky (deed.sk/z/{id}) — kamera; bez kamery hláška. Nájdená zbierka sa hneď vyberie. */
function SkenZbierky({ onClose, onZbierka, onHladat }: { onClose: () => void; onZbierka: (z: ZbierkaVRetazi) => void; onHladat: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** null = kamera beží · "nie" = nie je dostupná · "zamietnuta" = človek ju nepovolil */
  const [chyba, setChyba] = useState<null | "nie" | "zamietnuta">(null);
  const [ako, setAko] = useState(false); // web nevie otvoriť nastavenia telefónu — ukážeme postup
  useEffect(() => {
    let zrusene = false, hotovo = false;
    let stop: (() => void) | null = null;
    void import("@zxing/browser").then(({ BrowserQRCodeReader }) => {
      if (zrusene) return;
      return new BrowserQRCodeReader().decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (res, _e, ctrl) => {
        stop = () => ctrl.stop();
        if (!res || hotovo) return;
        const m = res.getText().match(/\/z\/([^/?#\s]+)/);
        const z = m ? zbierkaVRetazi(decodeURIComponent(m[1])) : null;
        if (z) { hotovo = true; ctrl.stop(); onZbierka(z); } else toast("Toto nie je QR zbierky.");
      }).then((c) => { stop = () => c.stop(); if (zrusene) c.stop(); });
    }).catch((e: unknown) => {
      if (zrusene) return;
      const n = (e as { name?: string } | null)?.name;
      setChyba(n === "NotAllowedError" || n === "SecurityError" ? "zamietnuta" : "nie");
    });
    return () => { zrusene = true; try { stop?.(); } catch { /* už stojí */ } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Harok onClose={onClose} z={160} hlavicka={<span style={{ flex: 1, fontSize: 17, fontWeight: 800 }}>{chyba ? "Kamera nie je dostupná" : "Naskenovať QR zbierky"}</span>}>
      {!chyba
        ? <video ref={videoRef} muted playsInline style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 18, background: "#000" }} />
        : <>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{chyba === "zamietnuta" ? "Povoľ kameru v nastaveniach telefónu, alebo nájdi zbierku podľa názvu." : "Zbierku nájdeš aj podľa názvu."}</span>
          {ako && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>iPhone: Nastavenia → Safari → Kamera → Povoliť. Android: ťuk na ikonu vedľa adresy → Povolenia → Kamera.</span>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {chyba === "zamietnuta" && <button type="button" onClick={() => setAko(true)} style={{ flex: 1, minHeight: 48, borderRadius: 14, border: "1.5px solid var(--fieldBd)", background: "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>Otvoriť nastavenia</button>}
            <button type="button" onClick={onHladat} style={{ flex: 1, minHeight: 48, borderRadius: 14, border: "none", background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff" }}>Hľadať zbierku</button>
          </div>
        </>}
    </Harok>);
}
