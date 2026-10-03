// KARTA 43 · bod 133 — návrh Pirát (v4, tvorca), 1 : 1 podľa prototypu „Verejny profil charity PC v4 Pirat".
// PC: vľavo 6 obrazoviek na celú výšku (tvár · čo teraz potrebujú · dôkaz · ľudia · oznamy a práca · koniec),
// posúva sa po jednej (scroll-snap), bodky vpravo; navrchu Späť, „Si v …", Zdieľať · QR, Sledovať.
// Vpravo jediný platobný modul (460 px, centrálna + 3 sektory, zbalený podľa ZMENY).
// Mobil (karta 43 §5): obrazovky na výšku nad dokom appky, bodky vpravo, nad dokom pás
// „Podporiť · Celá činnosť ⌄" → hárok zdola s dlaždicami 2 × 2 a platbou. Dáta len z testProfily.ts.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { eur, pct, tvar, vLokalite, type Lokalita, type Mesto, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { DOK, LokalitaPrepinac, MESIACE, PortalVp, StitCare, StitOkno, nazovStitu, useDomaceMesto, useMobil, vMeste } from "./casti";
import { ModulSektory } from "./ModulSektory";

const BODY = ["Tvár", "Čo teraz potrebujú", "Dôkaz", "Ľudia, ktorí dali", "Oznamy a práca", "Koniec"];
const bg = (f: string) => `url('${f}') center/cover no-repeat #3a3530`;
const poradie = (m: string, d: string) => MESIACE.indexOf(m) * 100 + (parseInt(d, 10) || 0);
const PAS = 60; // výška pásu „Podporiť" na mobile
const Z_MESTA: Record<Mesto, string> = { "Trenčín": "Trenčína", "Prešov": "Prešova", "Bratislava": "Bratislavy" };

export function Pirat({ profil, onDetail, onBack }: { profil: TestProfil; onDetail: (z: TestZbierka) => void; onBack: () => void }) {
  const mobil = useMobil();
  const domace = useDomaceMesto(profil);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [sled, setSled] = useState(false);
  const [stitOtv, setStitOtv] = useState(false);
  const [harok, setHarok] = useState(false);
  const [harokVidno, setHarokVidno] = useState(false);
  const [bod, setBod] = useState(0);
  const [live, setLive] = useState(0);
  const [liveOp, setLiveOp] = useState(1);
  const scRef = useRef<HTMLDivElement | null>(null);
  const modRef = useRef<HTMLDivElement | null>(null);
  const stit = profil.stit.toLowerCase();

  // ---- dáta podľa mesta ----
  const sk = lok === "Celé Slovensko";
  const kde = sk ? "na Slovensku" : `v ${vMeste(lok)}`;
  const kdeV = kde.toLocaleUpperCase("sk-SK");
  const zbierky = vLokalite(profil.zbierky, lok, domace);
  const bezice = zbierky.filter((z) => z.stav !== "ukoncena");
  const zb = bezice[0];
  const dalsie = bezice.slice(1, 4);
  const dok = zbierky.find((z) => z.stav === "ukoncena" && z.spravaDarcom) ?? profil.zbierky.find((z) => z.stav === "ukoncena" && z.spravaDarcom);
  const dokKde = dok && dok.mesto !== lok && !sk ? `V ${vMeste(dok.mesto).toLocaleUpperCase("sk-SK")}` : kdeV;
  const skutky = vLokalite(profil.skutky, lok, domace);
  const darcovia = sk ? profil.darcovia : profil.darcovia.filter((d) => d.mesto === lok);
  const vyzbierane = zbierky.reduce((s, z) => s + z.vyzbierane, 0);
  const oz = [
    ...vLokalite(profil.oznamy, lok, domace).map((o) => ({ id: o.id, k: poradie(o.mesiac, o.den), den: o.den, mes: o.mesiac, dBg: o.druh === "vyzva" ? "#8E3B2F" : o.druh === "akcia" ? "#2F5E3A" : "#876712", st: o.stitok, stc: o.druh === "vyzva" ? "var(--red)" : o.druh === "akcia" ? "var(--green)" : "var(--gold)", n: o.nadpis, s: o.text, btn: o.tlacidlo, pocet: o.pod })),
    ...vLokalite(profil.praca, lok, domace).map((p) => ({ id: p.id, k: poradie(p.mesiac, p.den), den: p.den, mes: p.mesiac, dBg: "#3D6B8E", st: `HĽADÁME · ${p.druh === "brigadnik" ? "BRIGÁDNIK" : "ZAMESTNANEC"}`, stc: "var(--blue)", n: p.nazov, s: p.text, btn: "Mám záujem", pocet: p.pod })),
  ].sort((a, b) => a.k - b.k).slice(0, mobil ? 3 : 4);
  const mestaProfilu = [...new Set(profil.zbierky.map((z) => z.mesto))].join(", ");

  // Ľudia, ktorí dali: zoznam sa posúva, najnovší sa objaví s prechodom
  useEffect(() => {
    let t2: number | undefined;
    const t = window.setInterval(() => { setLiveOp(0); t2 = window.setTimeout(() => { setLive((x) => x + 1); setLiveOp(1); }, 350); }, 4500);
    return () => { window.clearInterval(t); window.clearTimeout(t2); };
  }, []);
  const n = darcovia.length;
  const darci = n ? darcovia.map((_, i) => darcovia[(i - (live % n) + n) % n]) : [];

  // ---- posun po obrazovkách ----
  const onSc = () => { const c = scRef.current; if (!c) return; const b = Math.round(c.scrollTop / Math.max(1, c.clientHeight)); if (b !== bod) setBod(b); };
  const skoc = (i: number) => { const c = scRef.current; if (c) c.scrollTo({ top: i * c.clientHeight, behavior: "smooth" }); };
  const otvorHarok = () => { setHarok(true); requestAnimationFrame(() => requestAnimationFrame(() => setHarokVidno(true))); };
  const zavriHarok = () => { setHarokVidno(false); window.setTimeout(() => setHarok(false), 280); };
  const naModul = () => { if (mobil) otvorHarok(); else modRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };

  // ================= obrazovky =================
  const sekcia = (i: number, deti: React.ReactNode, style?: CSSProperties) => (
    <section key={i} aria-label={BODY[i]} style={{ position: "relative", height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always", padding: mobil ? `84px 52px ${PAS + 22}px 16px` : "96px 40px 40px", display: "flex", flexDirection: "column", gap: mobil ? 14 : 18, overflow: "hidden", ...style }}>{deti}</section>
  );
  const lab = (t: string) => <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>{t}</span>;

  const s1 = (
    <section key={0} aria-label={BODY[0]} style={{ position: "relative", height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always", background: bg(profil.titulka) }}>
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.55) 0%,rgba(10,8,5,0) 22%,rgba(10,8,5,0) 42%,rgba(10,8,5,.9) 100%)" }} />
      <div style={{ position: "absolute", left: mobil ? 16 : 40, right: mobil ? 52 : 220, bottom: mobil ? PAS + 120 : 96, display: "flex", flexDirection: "column", gap: mobil ? 12 : 14, color: "#fff" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ flex: "none", width: mobil ? 54 : 64, height: mobil ? 54 : 64, borderRadius: 18, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: mobil ? 19 : 22, fontWeight: 800, color: "#3F6E2A" }}>{profil.iniciala}</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <b style={{ fontSize: 18 }}>{profil.meno}</b>
            <span style={{ fontSize: 14, color: "#E6DFD2" }}>{profil.stitky[profil.stitky.length - 1]} · {mestaProfilu}</span>
          </span>
        </span>
        <b style={{ fontSize: mobil ? 33 : 54, lineHeight: 1.05, letterSpacing: "-.015em", textWrap: "balance" } as CSSProperties}>{profil.veta}</b>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {([[eur(vyzbierane), sk ? "vyzbierané spolu" : `vyzbierané ${kde}`], [String(skutky.length), tvar(skutky.length, ["skutok", "skutky", "skutkov"]).replace(/^\S+\s/, "")], [String(n), `${n === 1 ? "človek" : n >= 2 && n <= 4 ? "ľudia" : "ľudí"}${sk ? "" : ` z ${Z_MESTA[lok as Mesto]}`} ${n === 1 ? "pomohol" : n >= 2 && n <= 4 ? "pomohli" : "pomohlo"}`]] as [string, string][]).map(([v, t]) => (
            <span key={t} style={{ height: 40, padding: "0 16px", borderRadius: 20, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
              <b style={{ fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{v}</b><span style={{ fontSize: 13.5, color: "#E6DFD2" }}>{t}</span>
            </span>
          ))}
        </span>
      </div>
      <button type="button" onClick={() => setStitOtv(true)} aria-label={`Štít DEED+ CARE · ${nazovStitu(profil.stit)} · zobraziť podrobnosti`}
        style={{ position: "absolute", right: mobil ? 12 : 44, bottom: mobil ? undefined : 96, top: mobil ? 84 : undefined, width: mobil ? 96 : 140, height: mobil ? 116 : 170, padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ position: "absolute", inset: -10, borderRadius: "50%", background: "radial-gradient(circle,var(--kov2) 0%,rgba(0,0,0,0) 62%)", opacity: 0.55 }} />
        <StitCare stit={profil.stit} w={mobil ? 88 : 128} h={mobil ? 108 : 156} lesk tien="drop-shadow(0 10px 14px rgba(0,0,0,.45))" />
      </button>
      <span style={{ position: "absolute", left: 0, right: 0, bottom: mobil ? PAS + 70 : 30, display: "flex", justifyContent: "center", fontSize: 13.5, fontWeight: 700, color: "#E6DFD2" }}>Posuň ďalej · čo teraz {kde} potrebujú</span>
    </section>
  );

  const s2 = sekcia(1, <>
    {lab(`TERAZ ${kdeV} POTREBUJEME`)}
    {zb ? (
      <article style={{ position: "relative", flex: 1, minHeight: 0, borderRadius: mobil ? 24 : 28, overflow: "hidden", background: bg(zb.foto) }}>
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.15) 0%,rgba(10,8,5,0) 30%,rgba(10,8,5,.88) 100%)" }} />
        {(zb.konciDni != null || zb.stav === "dlhodoba") && <span style={{ position: "absolute", left: 20, top: 20, height: 32, padding: "0 14px", borderRadius: 16, background: zb.konciDni != null ? "#8E3B2F" : "rgba(10,8,5,.6)", color: "#fff", fontSize: 12.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center" }}>{zb.konciDni != null ? `KONČÍ O ${tvar(zb.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : "DLHODOBÁ"}</span>}
        <div style={{ position: "absolute", left: mobil ? 18 : 28, right: mobil ? 18 : 28, bottom: mobil ? 18 : 26, display: "flex", flexDirection: "column", gap: mobil ? 9 : 12, color: "#fff" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E6DFD2" }}>{zb.mesto}{zb.cast ? ` · ${zb.cast}` : ""}{zb.zodpoveda ? ` · za zbierku zodpovedá ${zb.zodpoveda}` : ""}</span>
          <b style={{ fontSize: mobil ? 27 : 40, lineHeight: 1.08 }}>{zb.nazov}</b>
          <span style={{ fontSize: mobil ? 15 : 17, lineHeight: 1.5, maxWidth: 640, color: "#F1EBDF" }}>{zb.popis}</span>
          {zb.ciel != null && <span style={{ display: "block", height: 10, borderRadius: 5, background: "rgba(255,255,255,.22)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#6E9F4E,#A9D18A)", transformOrigin: "0 50%", transform: `scaleX(${pct(zb.vyzbierane, zb.ciel) / 100})` }} /></span>}
          <span style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <b style={{ fontSize: 26, fontVariantNumeric: "tabular-nums" }}>{eur(zb.vyzbierane)}</b>
            <span style={{ fontSize: 15, color: "#E6DFD2" }}>{zb.ciel ? `z ${eur(zb.ciel)} · ` : ""}{zb.ludia} ľudí</span>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => onDetail(zb)} style={{ height: 54, padding: "0 24px", border: "none", borderRadius: 16, background: "#fff", cursor: "pointer", whiteSpace: "nowrap", fontSize: 16, fontWeight: 800, color: "#2F5E3A", width: mobil ? "100%" : undefined }}>Otvoriť zbierku a darovať ›</button>
          </span>
        </div>
      </article>
    ) : <span style={{ fontSize: 17, color: "var(--ink3)" }}>{kde.charAt(0).toUpperCase() + kde.slice(1)} teraz nič nepotrebujeme.</span>}
    {dalsie.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: mobil ? "nowrap" : "wrap", overflowX: mobil ? "auto" : undefined }}>
      <span style={{ flex: "none", fontSize: 14, color: "var(--ink3)" }}>Ďalšie {kde}:</span>
      {dalsie.map((d) => <button key={d.id} type="button" onClick={() => onDetail(d)} style={{ flex: "none", minHeight: 44, padding: "3px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}>
        <span style={{ height: 38, padding: "0 14px", borderRadius: 19, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", color: "var(--ink)" }}>{d.nazov}</span>
      </button>)}
    </span>}
  </>);

  const s3 = sekcia(2, <>
    {lab(`DÔKAZ · ${dokKde}`)}
    {dok && <button type="button" onClick={() => onDetail(dok)} style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "minmax(0,1fr) auto", borderRadius: mobil ? 24 : 28, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", padding: 0, cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
      <span style={{ position: "relative", minHeight: mobil ? 120 : undefined, background: bg(dok.foto) }}>
        <span style={{ position: "absolute", left: 18, bottom: 18, height: 34, padding: "0 14px", borderRadius: 17, background: "#2F5E3A", color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>DOLOŽENÉ · {tvar(dok.doklady ?? 0, ["DOKLAD", "DOKLADY", "DOKLADOV"])}
        </span>
      </span>
      <span style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "minmax(0,1fr) minmax(0,1.35fr)", gap: mobil ? 12 : 28, padding: mobil ? "16px 18px 18px" : "24px 28px 26px" }}>
        <span style={{ display: "flex", flexDirection: "column", gap: mobil ? 6 : 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>SĽÚBILI SME</span>
          <b style={{ fontSize: mobil ? 19 : 22, lineHeight: 1.25 }}>{dok.nazov}</b>
          {!mobil && <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{dok.popis}</span>}
          <b style={{ fontSize: 20, fontVariantNumeric: "tabular-nums", paddingTop: mobil ? 0 : 4 }}>{eur(dok.vyzbierane)}</b>
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: mobil ? 6 : 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--green)" }}>SPLNILI SME</span>
          <span style={{ fontSize: mobil ? 16 : 21, lineHeight: 1.45, color: "var(--ink)" }}>„{dok.spravaDarcom}“</span>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--green)" }}>Pozrieť doklady ›</span>
        </span>
      </span>
    </button>}
  </>);

  const s4 = sekcia(3, <>
    {lab("ĽUDIA, KTORÍ DALI")}
    <b style={{ fontSize: mobil ? 38 : 64, lineHeight: 1.02, letterSpacing: "-.02em", textWrap: "balance" } as CSSProperties}>{`${tvar(n, ["človek", "ľudia", "ľudí"])}${sk ? "" : ` ${kde}`} už ${n === 1 ? "pomohol" : n >= 2 && n <= 4 ? "pomohli" : "pomohlo"}`}</b>
    <span style={{ fontSize: mobil ? 15 : 17, color: "var(--ink2)" }}>Zoradené podľa času, nie podľa sumy. Každý si vybral, či ho uvidíte s menom.</span>
    {n > 0 && <div aria-live="polite" style={{ display: "flex", flexDirection: "column", borderRadius: 24, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "4px 16px" : "6px 22px", minHeight: 0, overflow: "hidden" }}>
      {darci.slice(0, mobil ? 4 : 6).map((d, i) => (
        <div key={`${d.id}-${i}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: mobil ? "11px 0" : "14px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", opacity: i === 0 ? liveOp : 1, transition: "opacity .35s ease" }}>
          <span style={{ flex: "none", width: 42, height: 42, borderRadius: 21, background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{d.iniciala}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: mobil ? 15 : 16, fontWeight: 800 }}>{d.meno} <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· {d.mesto}</span></span>
            <span style={{ fontSize: 14, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.naCo}</span>
          </span>
          {d.suma != null && <b style={{ flex: "none", fontSize: 16, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>+{eur(d.suma)}</b>}
          {!mobil && <span style={{ flex: "none", width: 86, textAlign: "right", fontSize: 13, color: "var(--ink3)" }}>{d.pred}</span>}
        </div>
      ))}
    </div>}
    <button type="button" onClick={naModul} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, fontWeight: 800, color: "var(--green)" }}>{mobil ? "Pridaj sa ›" : "Pridaj sa vpravo ›"}</button>
  </>);

  const s5 = sekcia(4, <>
    {lab(`OZNAMY A PRÁCA · ${kdeV}`)}
    <b style={{ fontSize: mobil ? 30 : 44, lineHeight: 1.08 }}>Príď medzi nás</b>
    {oz.map((o) => (
      <article key={o.id} style={{ display: "flex", gap: mobil ? 14 : 20, alignItems: mobil ? "flex-start" : "center", padding: mobil ? "14px 16px" : "20px 22px", borderRadius: 24, background: "var(--card)", border: "1px solid var(--cardBd)", flexWrap: mobil ? "wrap" : undefined }}>
        <span style={{ flex: "none", width: mobil ? 60 : 84, height: mobil ? 68 : 92, borderRadius: 18, background: o.dBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <b style={{ fontSize: mobil ? 25 : 34, lineHeight: 1 }}>{o.den}</b><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".06em" }}>{o.mes}</span>
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: mobil ? 4 : 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: o.stc }}>{o.st}</span>
          <b style={{ fontSize: mobil ? 17 : 21, lineHeight: 1.25 }}>{o.n}</b>
          <span style={{ fontSize: mobil ? 13.5 : 15, color: "var(--ink3)" }}>{o.s}</span>
        </span>
        {!mobil && <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <button type="button" style={{ height: 48, padding: "0 20px", borderRadius: 14, border: "1.5px solid var(--green)", background: "transparent", cursor: "pointer", whiteSpace: "nowrap", fontSize: 15, fontWeight: 800, color: "var(--green)" }}>{o.btn}</button>
          <span style={{ fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap" }}>{o.pocet}</span>
        </span>}
      </article>
    ))}
    {!oz.length && <span style={{ fontSize: 17, color: "var(--ink3)" }}>{kde.charAt(0).toUpperCase() + kde.slice(1)} teraz nič nechystáme.</span>}
  </>);

  const s6 = sekcia(5, <>
    <b style={{ fontSize: mobil ? 40 : 64, lineHeight: 1.02, letterSpacing: "-.02em" }}>Presvedčili ťa?</b>
    <span style={{ fontSize: mobil ? 16 : 18, lineHeight: 1.5, color: "var(--ink2)", maxWidth: 620 }}>Ak áno, vyber {mobil ? "nižšie" : "vpravo"}, ako blízko chceš vidieť. Ak nie, žiadny problém, {kde} pomáhajú aj iní.</span>
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "minmax(0,1fr) minmax(0,1fr)", gap: 14, maxWidth: 760 }}>
      <button type="button" onClick={naModul} style={{ height: mobil ? 84 : 96, padding: "0 24px", border: "none", borderRadius: 22, background: "linear-gradient(135deg,#4B7A35,#6E9F4E)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 4, textAlign: "left" }}>
        <b style={{ fontSize: 20, color: "#fff" }}>Áno, podporím</b><span style={{ fontSize: 14, color: "#DCEBCF" }}>{mobil ? "otvorí platbu" : "otvorí platbu vpravo"}</span>
      </button>
      <button type="button" style={{ height: mobil ? 84 : 96, padding: "0 24px", borderRadius: 22, border: "1.5px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 4, textAlign: "left" }}>
        <b style={{ fontSize: 20, color: "var(--ink)" }}>{profil.typ === "tvorca" ? "Ďalší tvorca" : profil.typ === "firma" ? "Ďalšia firma" : "Ďalšia charita"} {kde} ›</b>
      </button>
    </div>
    <span style={{ display: "flex", flexWrap: "wrap", gap: mobil ? 8 : 18, paddingTop: 12, fontSize: 14.5, color: "var(--ink3)", flexDirection: mobil ? "column" : "row" }}>
      <span>IČO {profil.ico}</span><span>Transparentný účet {profil.ucet}</span>
    </span>
  </>, { justifyContent: "center", gap: mobil ? 16 : 22 });

  // ================= ovládanie =================
  const horna = (
    <div style={{ position: "absolute", left: mobil ? 12 : 24, right: mobil ? 12 : 24, top: mobil ? 14 : 20, zIndex: 5, display: "flex", alignItems: "center", gap: mobil ? 8 : 10, pointerEvents: "none" }}>
      <button type="button" onClick={onBack} aria-label="Späť" style={{ pointerEvents: "auto", height: 44, padding: mobil ? "0 12px 0 8px" : "0 16px 0 10px", border: "none", borderRadius: 14, background: "rgba(10,8,5,.55)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 800, color: "#fff", flex: "none" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť
      </button>
      <span style={{ pointerEvents: "auto" }}><LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} sidlo={profil.mesto} /></span>
      <span style={{ flex: 1 }} />
      <button type="button" aria-label="Zdieľať · QR" style={{ pointerEvents: "auto", height: 44, width: mobil ? 44 : undefined, padding: mobil ? 0 : "0 16px", border: "none", borderRadius: 14, background: "rgba(10,8,5,.55)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", flex: "none" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14" /></svg>{!mobil && "Zdieľať · QR"}
      </button>
      {!mobil && <button type="button" aria-pressed={sled} onClick={() => setSled((x) => !x)} style={{ pointerEvents: "auto", height: 44, padding: "0 20px", borderRadius: 14, border: "1.5px solid #fff", cursor: "pointer", fontSize: 14.5, fontWeight: 800, background: sled ? "rgba(10,8,5,.55)" : "#fff", color: sled ? "#fff" : "#1D211B", flex: "none" }}>{sled ? "Sledujete" : "Sledovať"}</button>}
    </div>
  );
  const bodky = (
    <div style={{ position: "absolute", right: mobil ? 4 : 14, top: "50%", zIndex: 5, transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: mobil ? 0 : 6 }}>
      {BODY.map((t, i) => {
        const on = bod === i;
        return (
          <button key={t} type="button" onClick={() => skoc(i)} aria-label={t} aria-current={on ? "true" : undefined} style={{ width: 44, height: mobil ? 38 : 34, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: on ? "var(--acc)" : "transparent", border: `2px solid ${on ? "var(--acc)" : "rgba(200,190,170,.7)"}`, transform: `scale(${on ? 1.3 : 1})`, transition: "transform .2s ease" }} />
          </button>
        );
      })}
    </div>
  );
  const obrazovky = (
    <div ref={scRef} onScroll={onSc} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: mobil ? DOK : 0, overflowY: "auto", scrollSnapType: "y mandatory" }}>
      {s1}{s2}{s3}{s4}{s5}{s6}
    </div>
  );
  const okno = stitOtv && <StitOkno p={profil} onClose={() => setStitOtv(false)} />;

  // ================= MOBIL =================
  if (mobil) return (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      {obrazovky}
      {horna}
      {bodky}
      <button type="button" onClick={otvorHarok} aria-haspopup="dialog"
        style={{ position: "absolute", left: 12, right: 12, bottom: DOK + 8, zIndex: 6, height: PAS - 8, borderRadius: 18, border: "none", background: "linear-gradient(135deg,#4B7A35,#6E9F4E)", boxShadow: "0 10px 24px rgba(40,80,30,.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16, fontWeight: 800, color: "#fff" }}>
        Podporiť · Celá činnosť
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
      </button>
      {harok && <PortalVp stit={profil.stit}>
        <div onClick={zavriHarok} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,8,5,.6)", opacity: harokVidno ? 1 : 0, transition: "opacity .28s ease" }} />
        <div role="dialog" aria-label="Podporiť" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 61, maxHeight: "90%", display: "flex", flexDirection: "column", borderRadius: "28px 28px 0 0", background: "var(--panel)", boxShadow: "0 -20px 50px rgba(0,0,0,.35)", transform: `translateY(${harokVidno ? 0 : 100}%)`, transition: "transform .28s ease", overflow: "hidden" }}>
          <span style={{ display: "block", flex: "none", height: "var(--mH)", background: "var(--metal)" }} />
          <span style={{ flex: "none", display: "flex", alignItems: "center", padding: "8px 8px 0 16px" }}>
            <span style={{ flex: 1, display: "flex", justifyContent: "center", paddingLeft: 44 }}><span style={{ width: 40, height: 4, borderRadius: 2, background: "var(--track)" }} /></span>
            <button type="button" onClick={zavriHarok} aria-label="Zavrieť" style={{ width: 44, height: 44, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink2)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </span>
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 16px 28px" }}>
            <ModulSektory profil={profil} lok={lok} domace={domace} onZbierky={() => { zavriHarok(); skoc(1); }} />
          </div>
        </div>
      </PortalVp>}
      {okno}
    </div>
  );

  // ================= PC =================
  return (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", display: "flex", overflow: "hidden" }}>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        {obrazovky}
        {horna}
        {bodky}
      </div>
      <aside ref={modRef} style={{ width: 460, flex: "none", overflowY: "auto", background: "var(--panel)", borderLeft: "1px solid var(--accLine)", display: "flex", flexDirection: "column" }}>
        <span style={{ display: "block", flex: "none", height: "var(--mH)", background: "var(--metal)" }} />
        <div style={{ padding: "22px 22px 26px" }}><ModulSektory profil={profil} lok={lok} domace={domace} onZbierky={() => skoc(1)} /></div>
      </aside>
      {okno}
    </div>
  );
}
