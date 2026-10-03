// KARTA 43 · bod 133 — návrh Kronika (charita), 1 : 1 podľa prototypu „Verejny profil charity PC v3 Kronika".
// PC: vľavo vizitka charity (400 px, titulka, štít, Podporiť, modul, Naživo, fakty), v strede kronika
// Teraz → roky s lepkavým hľadaním a filtrom, vpravo pás rokov (84 px, skáče a svieti podľa posunu).
// Mobil (karta 43 §5): titulka 220 px + logo, štít vpravo dole na titulke → meno, veta, štítky → modul →
// Naživo → pás dorovnania → lepkavá lišta (hľadanie, filtre, rady rokov) → Teraz → roky na časovej osi.
// Dáta len z testProfily.ts. Ľavé menu appky (PC) aj dok (mobil) ostávajú — profil je vnútri appky.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { eur, pct, tvar, vLokalite, type Lokalita, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { DOK, LokalitaPrepinac, MESIACE, StitCare, StitOkno, kovText, nazovStitu, norm, useDomaceMesto, useMobil } from "./casti";
import { ModulSektory } from "./ModulSektory";

type Typ = "zb" | "sk" | "is" | "oz" | "pr";
const FILTRE: [string, Typ | null][] = [["Všetko", null], ["Zbierky", "zb"], ["Skutky", "sk"], ["Iskry", "is"], ["Oznamy", "oz"], ["Práca", "pr"]];
const GRAD = "linear-gradient(135deg,#4B7A35,#6E9F4E)";
const PRUH = "linear-gradient(90deg,#4B7A35,#8DB866)";
const bg = (f: string) => `url('${f}') center/cover no-repeat #3a3530`;
const dokladov = (n: number) => tvar(n, ["DOKLAD", "DOKLADY", "DOKLADOV"]);

/** záznam časovej osi kroniky */
interface Pol { id: string; typ: "zb" | "sk" | "is" | "oz"; d: string; m: string; rok: number; nazov: string; s: string; q?: string; dok?: string; foto: string; zbierka?: TestZbierka }
/** oznam alebo ponuka práce v „Teraz" */
interface Ozn { id: string; typ: "oz" | "pr"; den: string; mes: string; dBg: string; st: string; stc: string; n: string; s: string; btn: string; pocet: string }

const poradieDatumu = (m: string, d: string) => MESIACE.indexOf(m) * 100 + (parseInt(d, 10) || 0);

export function Kronika({ profil, onDetail, onBack }: { profil: TestProfil; onDetail: (z: TestZbierka) => void; onBack: () => void }) {
  const mobil = useMobil();
  const domace = useDomaceMesto(profil);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [q, setQ] = useState("");
  const [f, setF] = useState(0);
  const [akt, setAkt] = useState("teraz");
  const [sled, setSled] = useState(false);
  const [stitOtv, setStitOtv] = useState(false);
  const [live, setLive] = useState(0);
  const [liveOp, setLiveOp] = useState(1);
  const scRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const modulRef = useRef<HTMLDivElement | null>(null);
  const rf = useRef<Record<string, HTMLElement | null>>({});
  const stit = profil.stit.toLowerCase();

  // ---- dáta podľa mesta ----
  const zbierky = vLokalite(profil.zbierky, lok, domace);
  const bezice = zbierky.filter((z) => z.stav !== "ukoncena");
  const oznamy = vLokalite(profil.oznamy, lok, domace);
  const praca = vLokalite(profil.praca, lok, domace);
  const darcovia = lok === "Celé Slovensko" ? profil.darcovia : profil.darcovia.filter((d) => d.mesto === lok);
  const dnes = darcovia.reduce((s, d) => s + (d.suma ?? 0), 0);

  // Naživo: posledný dar sa strieda každých 5 s (prechod cez opacity)
  useEffect(() => {
    let t2: number | undefined;
    const t = window.setInterval(() => { setLiveOp(0); t2 = window.setTimeout(() => { setLive((x) => x + 1); setLiveOp(1); }, 320); }, 5000);
    return () => { window.clearInterval(t); window.clearTimeout(t2); };
  }, []);
  const ld = darcovia.length ? darcovia[live % darcovia.length] : null;

  // ---- filter a hľadanie naprieč všetkými rokmi ----
  const qn = norm(q).trim();
  const ok = (typ: Typ, txt: string, rok: string) => (f === 0 || FILTRE[f][1] === typ) && (!qn || norm(txt).includes(qn) || qn === rok);

  const terazZb = bezice.filter((z) => ok("zb", `${z.nazov} ${z.popis}`, "teraz"));
  const velka = terazZb[0];
  const male = terazZb.slice(1);
  const terazOz: Ozn[] = [
    ...oznamy.map((o): Ozn & { k: number } => ({
      id: o.id, typ: "oz", den: o.den, mes: o.mesiac, k: poradieDatumu(o.mesiac, o.den),
      dBg: o.druh === "vyzva" ? "#8E3B2F" : o.druh === "akcia" ? "#2F5E3A" : "#876712",
      st: o.stitok, stc: o.druh === "vyzva" ? "var(--red)" : o.druh === "akcia" ? "var(--green)" : "var(--gold)",
      n: o.nadpis, s: o.text, btn: o.tlacidlo, pocet: o.pod,
    })),
    ...praca.map((p): Ozn & { k: number } => ({
      id: p.id, typ: "pr", den: p.den, mes: p.mesiac, k: poradieDatumu(p.mesiac, p.den), dBg: "#3D6B8E",
      st: `HĽADÁME · ${p.druh === "brigadnik" ? "BRIGÁDNIK" : "ZAMESTNANEC"}`, stc: "var(--blue)",
      n: p.nazov, s: p.text, btn: "Mám záujem", pocet: p.pod,
    })),
  ].sort((a, b) => a.k - b.k).filter((o) => ok(o.typ, `${o.n} ${o.s} ${o.st}`, "teraz"));
  const terazPrazdne = !terazZb.length && !terazOz.length;

  // ---- časová os: skutky a ukončené zbierky s dátumom + história kroniky ----
  const vsetkyPol: Pol[] = [
    ...vLokalite(profil.skutky, lok, domace).filter((s) => s.rok).map((s): Pol => ({ id: s.id, typ: "sk", d: s.d!, m: s.m!, rok: s.rok!, nazov: s.nazov, s: `${s.popis}${s.dobrovolnici ? ` · ${s.dobrovolnici} dobrovoľníkov` : ""}`, foto: s.foto })),
    ...zbierky.filter((z) => z.stav === "ukoncena" && z.rok).map((z): Pol => ({ id: z.id, typ: "zb", d: z.d!, m: z.m!, rok: z.rok!, nazov: z.nazov, s: `${eur(z.vyzbierane)} · od ${z.ludia} darcov`, q: z.spravaDarcom, dok: z.doklady ? dokladov(z.doklady) : undefined, foto: z.foto, zbierka: z })),
    ...vLokalite(profil.kronika ?? [], lok, domace).map((k): Pol => ({ ...k })),
  ].sort((a, b) => b.rok - a.rok || poradieDatumu(b.m, b.d) - poradieDatumu(a.m, a.d));
  const roky = (profil.roky ?? [...new Set(vsetkyPol.map((p) => p.rok))].sort((a, b) => b - a).map((rok) => ({ rok, nZaz: vsetkyPol.filter((p) => p.rok === rok).length, sum: [] as [string, string][] })));
  const kapitoly = roky.map((r) => {
    const t = String(r.rok);
    const vid = vsetkyPol.filter((p) => p.rok === r.rok && ok(p.typ, `${p.nazov} ${p.s} ${p.q ?? ""}`, t));
    return { ...r, t, vid };
  });
  const KL = ["teraz", ...kapitoly.map((k) => k.t)];
  const ai = KL.indexOf(akt);

  // ---- posun: pás rokov svieti podľa polohy, ťuk skočí na rok ----
  const onSc = () => {
    const c = scRef.current; if (!c) return;
    const bar = barRef.current?.offsetHeight ?? 0;
    let a = "teraz";
    for (const k of KL) { const el = rf.current[k]; if (el && el.offsetTop - bar - 60 <= c.scrollTop) a = k; }
    if (c.scrollTop + c.clientHeight >= c.scrollHeight - 4) a = KL[KL.length - 1];
    if (a !== akt) setAkt(a);
  };
  const skoc = (k: string) => {
    const c = scRef.current, el = rf.current[k]; if (!c || !el) return;
    const bar = barRef.current?.offsetHeight ?? 0;
    c.scrollTo({ top: !mobil && k === "teraz" ? 0 : el.offsetTop - bar - 12, behavior: "smooth" });
  };
  const naModul = () => modulRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ================= časti =================
  const hornaLista = (
    <div style={{ position: "absolute", left: 16, right: 16, top: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" onClick={onBack} aria-label="Späť" style={{ height: 44, padding: "0 14px 0 8px", border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 800, color: "#fff", flex: "none" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť
      </button>
      <LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} sidlo={profil.mesto} />
      <span style={{ flex: 1 }} />
      <button type="button" aria-label="Zdieľať · QR" style={{ width: 44, height: 44, flex: "none", border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14" /></svg>
      </button>
    </div>
  );
  const kovCiara = <span style={{ display: "block", flex: "none", height: "var(--mH)", background: "var(--metal)" }} />;
  const logo = <span style={{ flex: "none", width: 92, height: 92, borderRadius: 26, background: "#fff", border: "3px solid var(--panel)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: "#3F6E2A", boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}>{profil.iniciala}</span>;
  const stitTlacidlo = (w: number, h: number, sw: number, sh: number, style?: CSSProperties) => (
    <button type="button" onClick={() => setStitOtv(true)} aria-label={`Štít DEED+ CARE · ${nazovStitu(profil.stit)} · zobraziť podrobnosti`}
      style={{ position: "relative", width: w, height: h, padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
      <span style={{ position: "absolute", inset: -6, borderRadius: "50%", background: "radial-gradient(circle,var(--kov2) 0%,rgba(0,0,0,0) 62%)", opacity: 0.5 }} />
      <StitCare stit={profil.stit} w={sw} h={sh} lesk />
    </button>
  );
  const menoVeta = (
    <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <b style={{ fontSize: mobil ? 26 : 30, lineHeight: 1.1, letterSpacing: "-.01em" }}>{profil.meno}</b>
      <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{profil.veta}</span>
    </span>
  );
  const cipy = (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {profil.stitky.map((c) => <span key={c} style={{ height: 30, padding: "0 12px", borderRadius: 15, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 700, color: "var(--ink2)", whiteSpace: "nowrap" }}>{c}</span>)}
    </span>
  );
  const stitPruh = (
    <button type="button" onClick={() => setStitOtv(true)} style={{ height: 44, padding: "0 14px", borderRadius: 14, border: "1px solid var(--cuBd)", background: "var(--cuBg)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "var(--cuInk)" }}>
      <span style={{ flex: 1, textAlign: "left" }}>Štít CARE · {nazovStitu(profil.stit)} · {profil.stitCisla[0][0]} doložené</span><span aria-hidden="true">›</span>
    </button>
  );
  const sledovat = (
    <button type="button" aria-pressed={sled} onClick={() => setSled((x) => !x)} style={{ height: 46, borderRadius: 14, border: "1.5px solid var(--cardBd)", background: sled ? "var(--gSoft)" : "transparent", cursor: "pointer", fontSize: 15, fontWeight: 800, color: sled ? "var(--gInk)" : "var(--ink)" }}>{sled ? "Sledujete" : "Sledovať"}</button>
  );
  const nazivo = (
    <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)" }} />
        <b style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--green)" }}>NAŽIVO</b>
        <span style={{ flex: 1 }} />
        <b style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>Dnes {eur(dnes)} od {tvar(darcovia.length, ["človeka", "ľudí", "ľudí"])}</b>
      </span>
      {ld && <span aria-live="polite" style={{ display: "flex", alignItems: "baseline", gap: 8, opacity: liveOp, transition: "opacity .3s", minWidth: 0 }}>
        {ld.suma != null && <b style={{ flex: "none", fontSize: 14, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>+{eur(ld.suma)}</b>}
        <span style={{ flex: "none", fontSize: 14, fontWeight: 700 }}>{ld.meno}</span>
        <span style={{ fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ld.naCo} · {ld.pred}</span>
      </span>}
    </div>
  );
  const dorovnanie = profil.dorovnaniePas && (
    <div style={{ borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
      <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, background: "var(--field)", border: "1px solid var(--goldBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gold)" }}>{profil.dorovnaniePas.ini}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <b style={{ fontSize: 14, lineHeight: 1.3 }}>{profil.dorovnaniePas.nadpis}</b>
        <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{profil.dorovnaniePas.text}</span>
      </span>
    </div>
  );
  const odZaciatku = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>OD ZAČIATKU · {profil.odRoku}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {profil.cisla.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 19, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t}</span></span>)}
      </div>
    </div>
  );
  const fakty = (
    <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--cardBd)", paddingTop: 4 }}>
      {([["Sídlo", profil.sidlo], ["IČO", profil.ico], ["Transparentný účet", profil.ucet], ["Kontakt", profil.kontakt]] as [string, string][]).map(([k, v], i) => (
        <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "9px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>{k}</span>
          <span style={{ fontSize: 14, fontWeight: 700, wordBreak: "break-word" }}>{v}</span>
        </div>
      ))}
    </div>
  );
  const modul = <div ref={modulRef} style={{ scrollMarginTop: 16 }}><ModulSektory profil={profil} lok={lok} domace={domace} onZbierky={() => skoc("teraz")} /></div>;

  // lepkavá lišta: hľadanie + filtre (+ na mobile rady rokov)
  const tlacFiltra = (t: string, i: number) => {
    const on = f === i;
    return (
      <button key={t} type="button" aria-pressed={on} onClick={() => setF(i)} style={{ flex: "none", minHeight: 44, padding: "4px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}>
        <span style={{ height: 36, padding: "0 14px", borderRadius: 18, border: `1px solid ${on ? "var(--ink)" : "var(--cardBd)"}`, background: on ? "var(--ink)" : "transparent", display: "flex", alignItems: "center", whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 800, color: on ? "var(--bg)" : "var(--ink2)" }}>{t}</span>
      </button>
    );
  };
  const radRokov = (
    <div role="navigation" aria-label="Roky kroniky" style={{ display: "flex", overflowX: "auto", margin: "0 -16px", padding: "0 16px" }}>
      {KL.map((k, i) => {
        const on = akt === k;
        return (
          <button key={k} type="button" aria-current={on ? "true" : undefined} onClick={() => skoc(k)} style={{ position: "relative", flex: "none", minWidth: 72, height: 56, border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {i > 0 && <span style={{ position: "absolute", right: "50%", top: 15, width: "100%", height: 2, background: "var(--accLine)" }} />}
            <span style={{ position: "relative", width: 14, height: 14, borderRadius: "50%", background: i <= ai ? "var(--acc)" : "var(--bg)", border: "2.5px solid var(--acc)", transform: `scale(${on ? 1.25 : 1})`, transition: "transform .2s ease, background .2s ease" }} />
            <span style={{ fontSize: 13.5, fontWeight: on ? 800 : 600, color: on ? "var(--ink)" : "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{i ? k : "Teraz"}</span>
          </button>
        );
      })}
    </div>
  );
  const lista = (
    <div ref={barRef} style={{ position: "sticky", top: 0, zIndex: 6, background: "var(--bg)", borderBottom: "1px solid var(--cardBd)", padding: mobil ? "12px 16px 4px" : "14px 32px", display: "flex", flexDirection: "column", gap: mobil ? 6 : 10 }}>
      <span style={{ position: "relative", display: "block" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ position: "absolute", left: 14, top: 14, color: "var(--ink3)" }}><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať v kronike: zbierka, skutok, rok" aria-label="Hľadať v kronike"
          style={{ width: "100%", height: 46, padding: "0 44px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none" }} />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Vymazať" style={{ position: "absolute", right: 1, top: 1, width: 44, height: 44, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink2)" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></span>
        </button>}
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: mobil ? "nowrap" : "wrap", overflowX: mobil ? "auto" : undefined, margin: mobil ? "0 -16px" : undefined, padding: mobil ? "0 16px" : undefined }}>{FILTRE.map(([t], i) => tlacFiltra(t, i))}</div>
      {mobil && radRokov}
    </div>
  );

  // ---- Teraz ----
  const velkaKarta = velka && (
    <article style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "minmax(0,1fr) minmax(0,1.1fr)", borderRadius: 24, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      <span style={{ position: "relative", minHeight: mobil ? 200 : 300, background: bg(velka.foto) }}>
        {velka.konciDni != null && <span style={{ position: "absolute", left: 14, top: 14, height: 30, padding: "0 12px", borderRadius: 15, background: "#8E3B2F", color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>KONČÍ O {tvar(velka.konciDni, ["DEŇ", "DNI", "DNÍ"])}</span>}
      </span>
      <div style={{ padding: mobil ? "18px 18px 20px" : "22px 24px", display: "flex", flexDirection: "column", gap: 11 }}>
        <b style={{ fontSize: mobil ? 21 : 23, lineHeight: 1.2 }}>{velka.nazov}</b>
        <span style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>{velka.popis}</span>
        {velka.ciel != null && <span style={{ display: "block", height: 9, borderRadius: 5, background: "var(--track)", overflow: "hidden", marginTop: 2 }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 5, background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${pct(velka.vyzbierane, velka.ciel) / 100})` }} /></span>}
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums", flexWrap: "wrap" }}><b style={{ fontSize: 21 }}>{eur(velka.vyzbierane)}</b><span style={{ fontSize: 14, color: "var(--ink3)" }}>{velka.ciel ? `z ${eur(velka.ciel)} · ` : ""}{velka.ludia} ľudí</span></span>
        {velka.dorovnanie && <span style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--gold)", fontWeight: 700 }}>{velka.dorovnanie}</span>}
        <span style={{ flex: 1 }} />
        <button type="button" onClick={() => onDetail(velka)} style={{ alignSelf: mobil ? "stretch" : "flex-start", height: 50, padding: "0 24px", border: "none", borderRadius: 15, background: GRAD, cursor: "pointer", whiteSpace: "nowrap", fontSize: 16, fontWeight: 800, color: "#fff" }}>Pozrieť a podporiť</button>
      </div>
    </article>
  );
  const maleKarty = male.length > 0 && (
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "repeat(2,minmax(0,1fr))", gap: mobil ? 10 : 16 }}>
      {male.map((z) => (
        <button key={z.id} type="button" onClick={() => onDetail(z)} style={{ display: "flex", gap: 14, alignItems: "center", padding: 12, borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
          <span style={{ flex: "none", width: 96, height: 96, borderRadius: 16, background: bg(z.foto) }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{z.stav === "dlhodoba" ? "DLHODOBÁ" : z.konciDni != null ? `KONČÍ O ${tvar(z.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : (z.cast ? `${z.mesto} · ${z.cast}` : z.mesto).toLocaleUpperCase("sk-SK")}</span>
            <b style={{ fontSize: 16, lineHeight: 1.3 }}>{z.nazov}</b>
            {z.ciel != null && <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${pct(z.vyzbierane, z.ciel) / 100})` }} /></span>}
            <span style={{ fontSize: 13, color: "var(--ink3)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}><b style={{ color: "var(--ink)", fontSize: 14.5 }}>{eur(z.vyzbierane)}</b> {z.ciel ? `z ${eur(z.ciel)}` : `od ${z.ludia} ľudí`}</span>
          </span>
        </button>
      ))}
    </div>
  );
  const oznamyBlok = terazOz.length > 0 && <>
    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: 8 }}>OZNAMY A PRÁCA</span>
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 14 }}>
      {terazOz.map((o) => (
        <article key={o.id} style={{ display: "flex", gap: mobil ? 14 : 16, padding: mobil ? 16 : 18, borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
          <span style={{ flex: "none", width: mobil ? 60 : 68, height: mobil ? 70 : 78, borderRadius: 16, background: o.dBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <b style={{ fontSize: mobil ? 25 : 28, lineHeight: 1 }}>{o.den}</b><span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em" }}>{o.mes}</span>
          </span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: o.stc }}>{o.st}</span>
            <b style={{ fontSize: 16.5, lineHeight: 1.25 }}>{o.n}</b>
            <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{o.s}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 6 }}>
              <button type="button" style={{ height: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--green)", background: "transparent", cursor: "pointer", whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>{o.btn}</button>
              <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{o.pocet}</span>
            </span>
          </span>
        </article>
      ))}
    </div>
  </>;
  const teraz = (
    <section ref={(el) => { rf.current.teraz = el; }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: mobil ? 12 : 18, flexWrap: "wrap" }}>
        <b style={{ fontSize: mobil ? 52 : 72, lineHeight: 1, letterSpacing: "-.02em", ...kovText }}>Teraz</b>
        <span style={{ fontSize: mobil ? 14 : 16, color: "var(--ink2)" }}>{tvar(bezice.length, ["zbierka", "zbierky", "zbierok"])} · {tvar(oznamy.length, ["oznam", "oznamy", "oznamov"])} · {tvar(praca.length, ["ponuka práce", "ponuky práce", "ponúk práce"])}</span>
      </div>
      {velkaKarta}
      {maleKarty}
      {oznamyBlok}
      {terazPrazdne && <span style={{ fontSize: 15, color: "var(--ink3)" }}>Teraz tu nič také nie je. Pozri nižšie do rokov.</span>}
    </section>
  );

  // ---- roky na časovej osi ----
  const dSt = mobil ? 44 : 52;
  const polozka = (p: Pol) => p.typ === "zb" ? (
    <button type="button" onClick={() => p.zbierka && onDetail(p.zbierka)} style={{ width: "100%", display: "grid", gridTemplateColumns: mobil ? "1fr" : "190px minmax(0,1fr)", borderRadius: 20, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", padding: 0, cursor: p.zbierka ? "pointer" : "default", textAlign: "left", color: "var(--ink)" }}>
      <span style={{ minHeight: mobil ? 140 : 180, background: bg(p.foto) }} />
      <div style={{ padding: mobil ? "14px 16px" : "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", whiteSpace: "nowrap" }}>UKONČENÁ ZBIERKA</span>
          {p.dok && <span style={{ height: 26, padding: "0 10px", borderRadius: 13, background: p.q ? "#2F5E3A" : "var(--btn)", color: p.q ? "#fff" : "var(--ink2)", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{p.q ? `DOLOŽENÉ · ${p.dok}` : p.dok}</span>}
        </span>
        <b style={{ fontSize: mobil ? 17 : 19, lineHeight: 1.25 }}>{p.nazov}</b>
        <span style={{ fontSize: 14, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{p.s}</span>
        {p.q && <span style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "var(--green)" }}>SPLNILI SME</span>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)" }}>„{p.q}“</span>
        </span>}
        <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>{p.q ? "Správa a doklady ›" : "Priebežné doklady ›"}</span>
      </div>
    </button>
  ) : (
    <article style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      {p.typ === "is"
        ? <span style={{ flex: "none", width: 54, height: 72, borderRadius: 12, background: bg(p.foto), display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.9)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#1D211B" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span></span>
        : <span style={{ flex: "none", width: 72, height: 72, borderRadius: 14, background: bg(p.foto) }} />}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: p.typ === "is" ? "var(--gold)" : p.typ === "oz" ? "var(--blue)" : "var(--green)" }}>{p.typ === "is" ? "ISKRA" : p.typ === "oz" ? "AKCIA" : "SKUTOK"}</span>
        <b style={{ fontSize: 16, lineHeight: 1.3 }}>{p.nazov}</b>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{p.s}</span>
      </span>
    </article>
  );
  const kapitolyEl = kapitoly.map((k) => (
    <section key={k.t} ref={(el) => { rf.current[k.t] = el; }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: mobil ? 14 : 28, flexWrap: "wrap" }}>
        <b style={{ fontSize: mobil ? 60 : 88, lineHeight: 0.9, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums", ...kovText }}>{k.t}</b>
        {k.sum.length > 0 && <div style={{ flex: 1, minWidth: mobil ? "100%" : 360, display: "grid", gridTemplateColumns: mobil ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 10, paddingBottom: 6 }}>
          {k.sum.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 20, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t}</span></span>)}
        </div>}
      </div>
      <span style={{ display: "block", height: "var(--mH)", borderRadius: 3, background: "var(--metal)", opacity: 0.7 }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {k.vid.map((p) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: `${dSt}px 20px minmax(0,1fr)`, columnGap: mobil ? 10 : 14 }}>
            <span style={{ paddingTop: 20, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <b style={{ fontSize: mobil ? 18 : 20, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{p.d}</b>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{p.m}</span>
            </span>
            <span style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <span style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: "var(--accLine)" }} />
              <span style={{ position: "relative", marginTop: 26, width: 12, height: 12, borderRadius: "50%", background: "var(--bg)", border: "2.5px solid var(--acc)" }} />
            </span>
            <div style={{ padding: "8px 0", minWidth: 0 }}>{polozka(p)}</div>
          </div>
        ))}
        {!k.vid.length && <span style={{ fontSize: 15, color: "var(--ink3)", padding: `4px 0 0 ${dSt + 34}px` }}>V roku {k.t} nič také nie je.</span>}
      </div>
      <button type="button" style={{ alignSelf: "flex-start", marginLeft: dSt + 34, height: 46, padding: "0 20px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>Celý rok {k.t} · {k.nZaz} záznamov ›</button>
    </section>
  ));

  const okno = stitOtv && <StitOkno p={profil} onClose={() => setStitOtv(false)} />;

  // ================= MOBIL =================
  if (mobil) return (
    <div ref={scRef} onScroll={onSc} className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ position: "relative", height: 220, background: bg(profil.titulka) }}>
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.45) 0%,rgba(10,8,5,0) 40%,rgba(10,8,5,.35) 100%)" }} />
        {hornaLista}
        {stitTlacidlo(96, 112, 84, 104, { position: "absolute", right: 12, bottom: -22, zIndex: 2 })}
      </div>
      {kovCiara}
      <div style={{ padding: "0 16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ marginTop: -46, position: "relative", zIndex: 1 }}>{logo}</div>
        {menoVeta}
        {cipy}
        {sledovat}
        {modul}
        {nazivo}
        {dorovnanie}
      </div>
      {lista}
      <div style={{ padding: "22px 16px 0", display: "flex", flexDirection: "column", gap: 44 }}>
        {teraz}
        {kapitolyEl}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{odZaciatku}{fakty}</div>
      </div>
      <div style={{ height: DOK + 24 }} />
      {okno}
    </div>
  );

  // ================= PC =================
  return (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", display: "flex", overflow: "hidden" }}>
      <aside style={{ width: 400, flex: "none", overflowY: "auto", background: "var(--panel)", borderRight: "1px solid var(--accLine)", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", flex: "none", height: 230, background: bg(profil.titulka) }}>
          <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.45) 0%,rgba(10,8,5,0) 40%,rgba(10,8,5,.35) 100%)" }} />
          {hornaLista}
        </div>
        {kovCiara}
        <div style={{ position: "relative", padding: "0 24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -48 }}>
            {logo}
            {stitTlacidlo(112, 132, 104, 128, { marginTop: -30 })}
          </div>
          {menoVeta}
          {cipy}
          {stitPruh}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" onClick={naModul} style={{ height: 56, border: "none", borderRadius: 16, background: GRAD, cursor: "pointer", fontSize: 17, fontWeight: 800, color: "#fff", boxShadow: "0 10px 24px rgba(40,80,30,.3)" }}>Podporiť</button>
            {sledovat}
          </div>
          {modul}
          {nazivo}
          {dorovnanie}
          {odZaciatku}
          {fakty}
        </div>
      </aside>

      <main ref={scRef} onScroll={onSc} style={{ position: "relative", flex: 1, minWidth: 0, overflowY: "auto" }}>
        {lista}
        <div style={{ padding: "28px 32px 120px", display: "flex", flexDirection: "column", gap: 56 }}>
          {teraz}
          {kapitolyEl}
        </div>
      </main>

      <nav aria-label="Roky kroniky" style={{ width: 84, flex: "none", borderLeft: "1px solid var(--cardBd)", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {KL.map((k, i) => {
          const on = akt === k;
          return (
            <button key={k} type="button" onClick={() => skoc(k)} aria-current={on ? "true" : undefined} style={{ position: "relative", width: 84, height: 92, border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingBottom: 10 }}>
              <span style={{ position: "absolute", left: 41, top: 0, height: 46, width: 2, background: "var(--accLine)", opacity: i ? 1 : 0 }} />
              <span style={{ position: "relative", width: 14, height: 14, borderRadius: "50%", background: i <= ai ? "var(--acc)" : "var(--bg)", border: "2.5px solid var(--acc)", transform: `scale(${on ? 1.25 : 1})`, transition: "transform .2s ease, background .2s ease" }} />
              <span style={{ fontSize: 13.5, fontWeight: on ? 800 : 600, color: on ? "var(--ink)" : "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{i ? k : "Teraz"}</span>
            </button>
          );
        })}
      </nav>
      {okno}
    </div>
  );
}
