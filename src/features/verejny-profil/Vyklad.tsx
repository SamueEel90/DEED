// KARTA 43 · bod 133 — návrh Výklad (v2, firma), 1 : 1 podľa prototypu „Verejny profil charity PC v2".
// PC: titulka 440 px (fotka, meno 46 px, štítky, štít 150 × 180 vpravo dole), kovová čiara, Naživo v riadku,
// lepkavé záložky, sekcie pod sebou (Zbierky · Oznamy · Sľúbili a splnili · Iskry · Skutky · História · O nás)
// a vpravo lepkavý stĺpec 380 px. Na mieste zelenej karty centrálnej zbierky je modul centrálna + 3 sektory
// (karta 43 §3). Mobil (karta 43 §5): titulka + štít → meno → Pomáhame v → modul → Naživo → lepkavé záložky.
// Dáta len z testProfily.ts, prázdna sekcia sa neukáže.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { eur, pct, tvar, vLokalite, type Lokalita, type Mesto, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { DOK, LokalitaPrepinac, MESIACE, StitCare, StitOkno, nazovStitu, useDomaceMesto, useMobil } from "./casti";
import { PodporaProfilu } from "./PodporaProfilu";

const GRAD = "linear-gradient(135deg,#4B7A35,#6E9F4E)";
const PRUH = "linear-gradient(90deg,#4B7A35,#8DB866)";
const bg = (f: string) => `url('${f}') center/cover no-repeat #3a3530`;
const poradie = (m: string, d: string) => MESIACE.indexOf(m) * 100 + (parseInt(d, 10) || 0);
/** „Pekáreň Dobrota dorovnáva 1 : 1 · ešte 1 380 €" → [„Pekáreň Dobrota", „dorovnáva 1 : 1 · ešte 1 380 €"] */
const rozdelFirmu = (t: string): [string, string] => { const m = t.match(/^(.+?) ((?:pridá|dorovnáva|zdvojnásobí).*)$/); return m ? [m[1], m[2]] : ["", t]; };
const MESTA: Mesto[] = ["Trenčín", "Prešov", "Bratislava"];

type Kotva = "zb" | "oz" | "do" | "is" | "sk" | "hi" | "on";

export function Vyklad({ profil, onDetail, onBack }: { profil: TestProfil; onDetail: (z: TestZbierka) => void; onBack: () => void }) {
  const mobil = useMobil();
  const domace = useDomaceMesto(profil);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [sled, setSled] = useState(false);
  const [stitOtv, setStitOtv] = useState(false);
  const [kotva, setKotva] = useState<Kotva>("zb");
  const [ozF, setOzF] = useState(0);
  const [hRok, setHRok] = useState(0);
  const [live, setLive] = useState(0);
  const [liveOp, setLiveOp] = useState(1);
  const scRef = useRef<HTMLDivElement | null>(null);
  const tabRef = useRef<HTMLDivElement | null>(null);
  const rf = useRef<Partial<Record<Kotva, HTMLElement | null>>>({});
  const stit = profil.stit.toLowerCase();

  // ---- dáta podľa mesta ----
  const zbierky = vLokalite(profil.zbierky, lok, domace);
  const bezice = zbierky.filter((z) => z.stav !== "ukoncena");
  const dolozene = zbierky.filter((z) => z.stav === "ukoncena" && z.spravaDarcom);
  const skutky = vLokalite(profil.skutky, lok, domace);
  const oznamy = vLokalite(profil.oznamy, lok, domace);
  const praca = vLokalite(profil.praca, lok, domace);
  const darcovia = lok === "Celé Slovensko" ? profil.darcovia : profil.darcovia.filter((d) => d.mesto === lok);
  const dnes = darcovia.reduce((s, d) => s + (d.suma ?? 0), 0);

  useEffect(() => {
    let t2: number | undefined;
    const t = window.setInterval(() => { setLiveOp(0); t2 = window.setTimeout(() => { setLive((x) => x + 1); setLiveOp(1); }, 320); }, 5000);
    return () => { window.clearInterval(t); window.clearTimeout(t2); };
  }, []);
  const ld = darcovia.length ? darcovia[live % darcovia.length] : null;

  // oznamy a práca (filter Všetko · Pomoc a akcie · Práca)
  const vsetkyOz = [
    ...oznamy.map((o) => ({ id: o.id, pr: false, k: poradie(o.mesiac, o.den), den: o.den, mes: o.mesiac, dBg: o.druh === "vyzva" ? "#8E3B2F" : o.druh === "akcia" ? "#2F5E3A" : "#876712", st: o.stitok, stc: o.druh === "vyzva" ? "var(--red)" : o.druh === "akcia" ? "var(--green)" : "var(--gold)", n: o.nadpis, s: o.text, btn: o.tlacidlo, pocet: o.pod })),
    ...praca.map((p) => ({ id: p.id, pr: true, k: poradie(p.mesiac, p.den), den: p.den, mes: p.mesiac, dBg: "#3D6B8E", st: `HĽADÁME · ${p.druh === "brigadnik" ? "BRIGÁDNIK" : "ZAMESTNANEC"}`, stc: "var(--blue)", n: p.nazov, s: p.text, btn: "Mám záujem", pocet: p.pod })),
  ].sort((a, b) => a.k - b.k);
  const ozVid = vsetkyOz.filter((o) => ozF === 0 || (ozF === 1 ? !o.pr : o.pr));

  // história po rokoch: ukončené zbierky + skutky s dátumom + záznamy kroniky
  const histPol = [
    ...zbierky.filter((z) => z.stav === "ukoncena" && z.rok).map((z) => ({ id: z.id, zb: true, rok: z.rok!, d: z.d!, m: z.m!, n: z.nazov, s: `${eur(z.vyzbierane)} · od ${z.ludia} darcov`, kon: z.skoncila ?? `${parseInt(z.d!, 10)}. ${MESIACE.indexOf(z.m!) + 1}.`, q: z.spravaDarcom, foto: z.foto, chip: "", chipC: "" })),
    ...skutky.filter((s) => s.rok).map((s) => ({ id: s.id, zb: false, rok: s.rok!, d: s.d!, m: s.m!, n: s.nazov, s: s.popis, kon: "", q: undefined as string | undefined, foto: s.foto, chip: "SKUTOK", chipC: "var(--green)" })),
    ...vLokalite(profil.kronika ?? [], lok, domace).map((k) => ({ id: k.id, zb: k.typ === "zb", rok: k.rok, d: k.d, m: k.m, n: k.nazov, s: k.s, kon: `${parseInt(k.d, 10)}. ${MESIACE.indexOf(k.m) + 1}.`, q: k.q, foto: k.foto, chip: k.typ === "is" ? "ISKRA" : k.typ === "oz" ? "AKCIA" : "SKUTOK", chipC: k.typ === "is" ? "var(--gold)" : k.typ === "oz" ? "var(--blue)" : "var(--green)" })),
  ].sort((a, b) => b.rok - a.rok || poradie(b.m, b.d) - poradie(a.m, a.d));
  const roky = profil.roky ?? [...new Set(histPol.map((p) => p.rok))].sort((a, b) => b - a).map((rok) => ({ rok, nZaz: histPol.filter((p) => p.rok === rok).length, sum: [] as [string, string][] }));
  const rok = roky[Math.min(hRok, roky.length - 1)];
  const rokZb = rok ? histPol.filter((p) => p.rok === rok.rok && p.zb) : [];
  const rokSk = rok ? histPol.filter((p) => p.rok === rok.rok && !p.zb) : [];

  const KOTVY: [Kotva, string, boolean][] = ([
    ["zb", "Zbierky", bezice.length > 0], ["oz", "Oznamy", vsetkyOz.length > 0], ["do", "Sľúbili a splnili", dolozene.length > 0],
    ["is", "Iskry", false], ["sk", "Skutky", skutky.length > 0], ["hi", "História", histPol.length > 0], ["on", "O nás", true],
  ] as [Kotva, string, boolean][]).filter(([, , ma]) => ma);
  const skoc = (k: Kotva) => {
    setKotva(k);
    const c = scRef.current, el = rf.current[k]; if (!c || !el) return;
    const top = el.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop - (tabRef.current?.offsetHeight ?? 52) - 18;
    c.scrollTo({ top, behavior: "smooth" });
  };

  // ================= časti =================
  const nadpis = (lab: string, t: string, prava?: ReactNode) => (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: mobil ? "wrap" : undefined }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: mobil ? "60%" : undefined }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>{lab}</span>
        <b style={{ fontSize: mobil ? 23 : 28, lineHeight: 1.15 }}>{t}</b>
      </span>
      {prava}
    </div>
  );
  const odkaz = (t: string) => <span style={{ flex: "none", whiteSpace: "nowrap", fontSize: 14, fontWeight: 800, color: "var(--green)" }}>{t}</span>;
  const tlacStit = (w: number, h: number, sw: number, sh: number, style: CSSProperties) => (
    <button type="button" onClick={() => setStitOtv(true)} aria-label={`Štít DEED+ CARE · ${nazovStitu(profil.stit)} · zobraziť podrobnosti`}
      style={{ position: "absolute", width: w, height: h, padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
      <span style={{ position: "absolute", inset: -10, borderRadius: "50%", background: "radial-gradient(circle,var(--kov2) 0%,rgba(0,0,0,0) 62%)", opacity: 0.55 }} />
      <StitCare stit={profil.stit} w={sw} h={sh} lesk tien="drop-shadow(0 10px 14px rgba(0,0,0,.45))" />
    </button>
  );
  const pomahameV = (sklo: boolean) => (
    <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: sklo ? "#F3EEE4" : "var(--ink3)" }}>Pomáhame v</span>
      {MESTA.map((m) => {
        const on = lok === m;
        return (
          <button key={m} type="button" aria-pressed={on} onClick={() => setLok(on ? "Celé Slovensko" : m)} style={{ minHeight: 44, padding: "7px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <span style={{ height: 30, padding: "0 12px", borderRadius: 15, display: "flex", alignItems: "center", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
              ...(sklo
                ? { background: on ? "#fff" : "rgba(255,255,255,.16)", border: `1px solid ${on ? "#fff" : "rgba(255,255,255,.28)"}`, color: on ? "#1D211B" : "#fff" }
                : { background: on ? "var(--gSoft)" : "var(--card)", border: `1px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink2)" }) }}>{m}</span>
          </button>
        );
      })}
    </span>
  );
  const cipy = (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 2 }}>
      {profil.stitky.map((c) => <span key={c} style={{ height: 30, padding: "0 12px", borderRadius: 15, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.28)", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{c}</span>)}
    </span>
  );
  const hornaLista = (
    <div style={{ position: "absolute", left: mobil ? 14 : 24, right: mobil ? 14 : 24, top: mobil ? 14 : 22, display: "flex", alignItems: "center", gap: 10 }}>
      <button type="button" onClick={onBack} aria-label="Späť" style={{ height: 44, padding: mobil ? "0 12px 0 8px" : "0 16px 0 10px", border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 800, color: "#fff", flex: "none" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť
      </button>
      <LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} sidlo={profil.mesto} />
      <span style={{ flex: 1 }} />
      <button type="button" aria-label="Zdieľať · QR" style={{ height: 44, width: mobil ? 44 : undefined, padding: mobil ? 0 : "0 16px", border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", flex: "none" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14" /></svg>{!mobil && "Zdieľať · QR"}
      </button>
      {!mobil && <button type="button" aria-pressed={sled} onClick={() => setSled((x) => !x)} style={{ height: 44, padding: "0 22px", borderRadius: 14, cursor: "pointer", fontSize: 14.5, fontWeight: 800, border: "1.5px solid #fff", background: sled ? "rgba(10,8,5,.5)" : "#fff", color: sled ? "#fff" : "#1D211B", flex: "none" }}>{sled ? "Sledujete" : "Sledovať"}</button>}
    </div>
  );
  const logo = (v: number) => <span style={{ flex: "none", width: v, height: v, borderRadius: v > 80 ? 26 : 20, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: v > 80 ? 30 : 24, fontWeight: 800, color: "#3F6E2A", boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}>{profil.iniciala}</span>;
  const nazivo = (
    <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "12px 14px" : "12px 18px", display: "flex", alignItems: mobil ? "flex-start" : "center", flexDirection: mobil ? "column" : "row", gap: mobil ? 6 : 16, minHeight: 58 }}>
      <span style={{ display: "flex", alignItems: "center", gap: mobil ? 10 : 16, width: mobil ? "100%" : undefined }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)" }} /><b style={{ fontSize: 12.5, letterSpacing: ".08em", color: "var(--green)" }}>NAŽIVO</b></span>
        <b style={{ flex: mobil ? 1 : "none", fontSize: mobil ? 15 : 16, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>Dnes {eur(dnes)} od {tvar(darcovia.length, ["človeka", "ľudí", "ľudí"])}</b>
        {mobil && <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--green)", flex: "none", whiteSpace: "nowrap" }}>Darcovia ›</span>}
      </span>
      {!mobil && <span style={{ width: 1, height: 26, background: "var(--cardBd)" }} />}
      {ld && <span aria-live="polite" style={{ flex: 1, minWidth: 0, maxWidth: "100%", display: "flex", alignItems: "center", gap: 10, opacity: liveOp, transition: "opacity .3s" }}>
        {ld.suma != null && <b style={{ flex: "none", fontSize: 15, color: "var(--gInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>+{eur(ld.suma)}</b>}
        <span style={{ flex: "none", fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>{ld.meno}</span>
        <span style={{ fontSize: 14, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ld.naCo} · {ld.pred}</span>
      </span>}
      {!mobil && <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--green)", flex: "none", whiteSpace: "nowrap" }}>Darcovia ›</span>}
    </div>
  );
  const modul = (
    <section style={{ position: "relative", borderRadius: 24, overflow: "hidden", background: "var(--panel)", border: "1px solid var(--cardBd)" }}>
      <span style={{ display: "block", height: "var(--mH)", background: "var(--metal)" }} />
      <div style={{ padding: mobil ? 16 : 22 }}><div style={{ display: "flex", flexDirection: "column", gap: 12 }}><PodporaProfilu profil={profil} lok={lok} domace={domace} rez={mobil ? "mob" : "pc"} /></div></div>
    </section>
  );

  // ---- sekcie ----
  const velka = bezice[0];
  const male = bezice.slice(1);
  const dorovnanieBox = (t: string) => {
    const [firma, zvysok] = rozdelFirmu(t);
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", color: "var(--gold)" }} aria-hidden="true"><path d="M4 21V7l8-4 8 4v14M9 21v-5h6v5" /></svg>
        <span style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--ink)" }}>{firma && <b>{firma}</b>} {zvysok}</span>
      </span>
    );
  };
  const secZb = bezice.length > 0 && (
    <section ref={(el) => { rf.current.zb = el; }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {nadpis("TERAZ POTREBUJEME", "Bežiace zbierky", odkaz(`Všetky ${bezice.length} ›`))}
      <button type="button" onClick={() => onDetail(velka)} style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "minmax(0,1.1fr) minmax(0,1fr)", borderRadius: 24, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", padding: 0, cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
        <span style={{ position: "relative", minHeight: mobil ? 210 : 330, background: bg(velka.foto) }}>
          {velka.konciDni != null && <span style={{ position: "absolute", left: 14, top: 14, height: 30, padding: "0 12px", borderRadius: 15, background: "#8E3B2F", color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>KONČÍ O {tvar(velka.konciDni, ["DEŇ", "DNI", "DNÍ"])}</span>}
        </span>
        <span style={{ padding: mobil ? "18px 18px 20px" : "24px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
          <b style={{ fontSize: mobil ? 21 : 24, lineHeight: 1.2 }}>{velka.nazov}</b>
          <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>{velka.popis}</span>
          {velka.ciel != null && <span style={{ display: "block", height: 9, borderRadius: 5, background: "var(--track)", overflow: "hidden", marginTop: 4 }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 5, background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${pct(velka.vyzbierane, velka.ciel) / 100})` }} /></span>}
          <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums", flexWrap: "wrap" }}><b style={{ fontSize: 22 }}>{eur(velka.vyzbierane)}</b><span style={{ fontSize: 14, color: "var(--ink3)" }}>{velka.ciel ? `z ${eur(velka.ciel)} · ` : ""}{velka.ludia} ľudí</span></span>
          {velka.dorovnanie && dorovnanieBox(velka.dorovnanie)}
          <span style={{ flex: 1 }} />
          <span style={{ alignSelf: mobil ? "stretch" : "flex-start", height: 50, padding: "0 26px", borderRadius: 15, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>Pozrieť a podporiť</span>
        </span>
      </button>
      {male.length > 0 && <div style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 16 }}>
        {male.map((z) => (
          <button key={z.id} type="button" onClick={() => onDetail(z)} style={{ borderRadius: 22, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", padding: 0, cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
            <span style={{ position: "relative", height: 170, width: "100%", background: bg(z.foto) }}>
              <span style={{ position: "absolute", left: 12, top: 12, height: 28, padding: "0 11px", borderRadius: 14, background: "rgba(10,8,5,.6)", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center" }}>
                {z.stav === "dlhodoba" ? "DLHODOBÁ" : z.konciDni != null ? `KONČÍ O ${tvar(z.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : z.mesto.toLocaleUpperCase("sk-SK")}
              </span>
            </span>
            <span style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              <b style={{ fontSize: 17, lineHeight: 1.3 }}>{z.nazov}</b>
              {z.ciel != null && <span style={{ display: "block", height: 7, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 4, background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${pct(z.vyzbierane, z.ciel) / 100})` }} /></span>}
              <span style={{ display: "flex", alignItems: "baseline", gap: 6, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}><b style={{ fontSize: 17 }}>{eur(z.vyzbierane)}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{z.ciel ? `z ${eur(z.ciel)} · ` : "od "}{z.ludia} ľudí</span></span>
              {z.dorovnanie && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{z.dorovnanie}</span>}
            </span>
          </button>
        ))}
      </div>}
    </section>
  );
  const ozFiltre = [`Všetko · ${vsetkyOz.length}`, `Pomoc a akcie · ${vsetkyOz.filter((o) => !o.pr).length}`, `Práca · ${vsetkyOz.filter((o) => o.pr).length}`];
  const secOz = vsetkyOz.length > 0 && (
    <section ref={(el) => { rf.current.oz = el; }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {nadpis("OZNAMY", "Príď medzi nás", <div style={{ display: "flex", gap: 6, overflowX: "auto", maxWidth: "100%" }}>
        {ozFiltre.map((t, i) => {
          const on = ozF === i;
          return <button key={t} type="button" aria-pressed={on} onClick={() => setOzF(i)} style={{ flex: "none", minHeight: 44, padding: "3px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <span style={{ height: 38, padding: "0 14px", borderRadius: 19, border: `1px solid ${on ? "var(--ink)" : "var(--cardBd)"}`, background: on ? "var(--ink)" : "transparent", display: "flex", alignItems: "center", whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 800, color: on ? "var(--bg)" : "var(--ink2)" }}>{t}</span>
          </button>;
        })}
      </div>)}
      <div style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 16 }}>
        {ozVid.map((o) => (
          <article key={o.id} style={{ display: "flex", gap: mobil ? 14 : 18, padding: mobil ? 16 : 20, borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
            <span style={{ flex: "none", width: mobil ? 64 : 76, height: mobil ? 74 : 86, borderRadius: 18, background: o.dBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <b style={{ fontSize: mobil ? 27 : 32, lineHeight: 1 }}>{o.den}</b><span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".06em" }}>{o.mes}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: o.stc }}>{o.st}</span>
              <b style={{ fontSize: mobil ? 16.5 : 18, lineHeight: 1.25 }}>{o.n}</b>
              <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{o.s}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6, flexWrap: "wrap" }}>
                <button type="button" style={{ height: 44, padding: "0 18px", borderRadius: 13, border: "1.5px solid var(--green)", background: "transparent", cursor: "pointer", whiteSpace: "nowrap", fontSize: 14, fontWeight: 800, color: "var(--green)" }}>{o.btn}</button>
                <span style={{ fontSize: 13, color: "var(--ink3)" }}>{o.pocet}</span>
              </span>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
  const papiere = (
    <>{[1, 2, 3].map((i) => (
      <span key={i} aria-hidden="true" style={{ width: 38, height: 48, borderRadius: 5, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 4, padding: "8px 6px" }}>
        <span style={{ height: 3, borderRadius: 2, background: "var(--track)" }} /><span style={{ height: 3, width: "70%", borderRadius: 2, background: "var(--track)" }} /><span style={{ height: 3, width: "85%", borderRadius: 2, background: "var(--track)" }} />
      </span>
    ))}</>
  );
  const secDo = dolozene.length > 0 && (
    <section ref={(el) => { rf.current.do = el; }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {nadpis("DÔKAZ, NIE SĽUB", "Sľúbili sme. Splnili sme.", odkaz(`${dolozene.length === 1 ? "Doložená" : `Všetkých ${dolozene.length} doložených`} ›`))}
      {dolozene.map((d) => (
        <button key={d.id} type="button" onClick={() => onDetail(d)} style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "300px minmax(0,1fr)", borderRadius: 24, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", padding: 0, cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
          <span style={{ position: "relative", minHeight: mobil ? 190 : 260, background: bg(d.foto) }}>
            <span style={{ position: "absolute", left: 14, bottom: 14, height: 30, padding: "0 12px", borderRadius: 15, background: "#2F5E3A", color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>DOLOŽENÉ · {tvar(d.doklady ?? 0, ["DOKLAD", "DOKLADY", "DOKLADOV"])}
            </span>
          </span>
          <span style={{ padding: mobil ? "18px" : "22px 26px", display: "grid", gridTemplateColumns: mobil ? "1fr" : "minmax(0,1fr) minmax(0,1.3fr)", gap: mobil ? 16 : 24 }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>SĽÚBILI SME</span>
              <b style={{ fontSize: 19, lineHeight: 1.25 }}>{d.nazov}</b>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{d.popis}</span>
              <b style={{ fontSize: 20, fontVariantNumeric: "tabular-nums", paddingTop: 4 }}>{eur(d.vyzbierane)}</b>
              <span style={{ fontSize: 13, color: "var(--ink3)" }}>od {d.ludia} darcov{d.skoncila ? ` · skončila ${d.skoncila}${d.rok ? ` ${d.rok}` : ""}` : ""}</span>
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 10, ...(mobil ? { paddingTop: 14, borderTop: "2px solid var(--accLine)" } : { paddingLeft: 24, borderLeft: "2px solid var(--accLine)" }) }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--green)" }}>SPLNILI SME</span>
              <span style={{ fontSize: 17, lineHeight: 1.55, color: "var(--ink)" }}>„{d.spravaDarcom}“</span>
              <span style={{ flex: 1 }} />
              <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{papiere}<span style={{ whiteSpace: "nowrap", fontSize: 14, fontWeight: 800, color: "var(--green)", paddingLeft: 6 }}>Pozrieť doklady ›</span></span>
            </span>
          </span>
        </button>
      ))}
    </section>
  );
  const skVid = skutky.slice(0, 3);
  const secSk = skutky.length > 0 && (
    <section ref={(el) => { rf.current.sk = el; }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {nadpis("SKUTKY", "Takto sme pomohli", odkaz(`Všetkých ${skutky.length} ›`))}
      <div style={{ display: mobil ? "flex" : "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14, overflowX: mobil ? "auto" : undefined, margin: mobil ? "0 -16px" : undefined, padding: mobil ? "0 16px" : undefined }}>
        {skVid.map((k) => (
          <article key={k.id} style={{ position: "relative", flex: mobil ? "0 0 78%" : undefined, height: 250, borderRadius: 22, overflow: "hidden", background: bg(k.foto) }}>
            <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,.82))" }} />
            <span style={{ position: "absolute", left: 16, right: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 5, color: "#fff" }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: "#CFE3BC" }}>{k.kedy.toLocaleUpperCase("sk-SK")}</span>
              <b style={{ fontSize: 17, lineHeight: 1.3 }}>{k.nazov}</b>
              <span style={{ fontSize: 13, color: "#EDE7DA" }}>{k.popis}</span>
            </span>
          </article>
        ))}
      </div>
    </section>
  );
  const secHi = histPol.length > 0 && rok && (
    <section ref={(el) => { rf.current.hi = el; }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {nadpis("HISTÓRIA", "Čo sme urobili rok po roku", roky.length > 1 ? <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        {roky.map((r, i) => { const on = i === hRok; return <button key={r.rok} type="button" aria-pressed={on} onClick={() => setHRok(i)} style={{ height: 44, padding: "0 16px", border: "none", borderRadius: 10, background: on ? "var(--bg)" : "transparent", cursor: "pointer", fontSize: 14.5, fontWeight: on ? 800 : 700, color: on ? "var(--ink)" : "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{r.rok}</button>; })}
      </div> : <b style={{ fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{rok.rok}</b>)}
      {rok.sum.length > 0 && <div style={{ display: "grid", gridTemplateColumns: mobil ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)", overflow: "hidden" }}>
        {rok.sum.map(([v, t], i) => <span key={t} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "16px 20px", borderLeft: i && !(mobil && i === 2) ? "1px solid var(--cardBd)" : "none", borderTop: mobil && i > 1 ? "1px solid var(--cardBd)" : "none" }}><b style={{ fontSize: 24, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{t}</span></span>)}
      </div>}
      <div style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "minmax(0,1.15fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        {rokZb.length > 0 && <div style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "6px 18px 8px", display: "flex", flexDirection: "column" }}>
          <span style={{ padding: "12px 0 8px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>UKONČENÉ ZBIERKY</span>
          {rokZb.map((z) => (
            <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: "1px solid var(--cardBd)" }}>
              <span style={{ flex: "none", width: 60, height: 60, borderRadius: 14, background: bg(z.foto) }} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 15.5, lineHeight: 1.3 }}>{z.n}</b><span style={{ fontSize: 13, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{z.s} · skončila {z.kon}</span></span>
              <span style={{ flex: "none", height: 28, padding: "0 10px", borderRadius: 14, background: z.q ? "#2F5E3A" : "var(--btn)", color: z.q ? "#fff" : "var(--ink2)", fontSize: 11.5, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{z.q ? "DOLOŽENÉ" : "SPRÁVA SA PÍŠE"}</span>
            </div>
          ))}
        </div>}
        {rokSk.length > 0 && <div style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "6px 18px 8px", display: "flex", flexDirection: "column" }}>
          <span style={{ padding: "12px 0 8px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>SKUTKY, ISKRY A AKCIE</span>
          {rokSk.map((k) => (
            <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderTop: "1px solid var(--cardBd)" }}>
              <span style={{ flex: "none", width: 44, display: "flex", flexDirection: "column", alignItems: "center" }}><b style={{ fontSize: 18, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{k.d}</b><span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: "var(--ink3)" }}>{k.m}</span></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: k.chipC }}>{k.chip}</span><b style={{ fontSize: 15, lineHeight: 1.3 }}>{k.n}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{k.s}</span></span>
            </div>
          ))}
        </div>}
      </div>
      <button type="button" style={{ alignSelf: "flex-start", height: 46, padding: "0 20px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>Celý rok {rok.rok} · {tvar(rok.nZaz, ["záznam", "záznamy", "záznamov"])} ›</button>
    </section>
  );
  const fakty = ([["Sídlo", profil.sidlo], ["IČO", profil.ico], ["Transparentný účet", profil.ucet], ["Kontakt", profil.kontakt]] as [string, string][]);
  const secOn = (
    <section ref={(el) => { rf.current.on = el; }} style={{ display: "grid", gridTemplateColumns: mobil ? "1fr" : "minmax(0,1.3fr) minmax(0,1fr)", gap: 24, padding: mobil ? 20 : 28, borderRadius: 24, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>O NÁS</span>
        <b style={{ fontSize: 24, lineHeight: 1.2 }}>{profil.onas?.nadpis ?? profil.meno}</b>
        <span style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--ink2)" }}>{profil.onas?.text ?? profil.veta}</span>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
          {(profil.onas?.oblasti ?? profil.sektory.map((x) => x.nazov)).map((o) => <span key={o} style={{ height: 32, padding: "0 14px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--field)", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>{o}</span>)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", ...(mobil ? { borderTop: "1px solid var(--cardBd)", paddingTop: 8 } : { borderLeft: "1px solid var(--cardBd)", paddingLeft: 24 }) }}>
        {fakty.map(([k, v], i) => <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}><span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>{k}</span><span style={{ fontSize: 14.5, fontWeight: 700, wordBreak: "break-word" }}>{v}</span></div>)}
      </div>
    </section>
  );
  const zalozky = (
    <div ref={tabRef} style={{ position: "sticky", top: 0, zIndex: 7, marginTop: 18, background: "var(--bg)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: mobil ? "0 8px" : "0 32px", display: "flex", gap: 4, borderBottom: "1px solid var(--cardBd)", overflowX: "auto" }}>
        {KOTVY.map(([k, t]) => {
          const on = kotva === k;
          return <button key={k} type="button" aria-current={on ? "true" : undefined} onClick={() => skoc(k)} style={{ flex: "none", height: 52, padding: mobil ? "0 12px" : "0 16px", border: "none", borderBottom: `3px solid ${on ? "var(--acc)" : "transparent"}`, background: "transparent", cursor: "pointer", whiteSpace: "nowrap", fontSize: 15, fontWeight: on ? 800 : 600, color: on ? "var(--ink)" : "var(--ink3)" }}>{t}</button>;
        })}
      </div>
    </div>
  );
  const sekcie = <>{secZb}{secOz}{secDo}{secSk}{secHi}{secOn}</>;
  const okno = stitOtv && <StitOkno p={profil} onClose={() => setStitOtv(false)} />;

  // ================= MOBIL =================
  if (mobil) return (
    <div ref={scRef} className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ position: "relative", height: 330, borderRadius: 24, background: bg(profil.titulka), boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: 24, background: "linear-gradient(180deg,rgba(10,8,5,.45) 0%,rgba(10,8,5,0) 28%,rgba(10,8,5,0) 40%,rgba(10,8,5,.85) 100%)" }} />
          {hornaLista}
          <div style={{ position: "absolute", left: 18, right: 110, bottom: 20, display: "flex", flexDirection: "column", gap: 10, color: "#fff" }}>
            {logo(68)}
            <b style={{ fontSize: 28, lineHeight: 1.08, letterSpacing: "-.01em" }}>{profil.meno}</b>
          </div>
          {tlacStit(104, 124, 96, 116, { right: 12, bottom: -36 })}
        </div>
        <div style={{ height: "var(--mH)", margin: "16px 4px 0", borderRadius: 3, background: "var(--metal)" }} />
      </div>
      <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 16, lineHeight: 1.5, color: "var(--ink2)", paddingRight: 70 }}>{profil.veta}</span>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{profil.stitky.map((c) => <span key={c} style={{ height: 30, padding: "0 12px", borderRadius: 15, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 700, color: "var(--ink2)", whiteSpace: "nowrap" }}>{c}</span>)}</span>
        {pomahameV(false)}
        <button type="button" aria-pressed={sled} onClick={() => setSled((x) => !x)} style={{ height: 46, borderRadius: 14, border: "1.5px solid var(--cardBd)", background: sled ? "var(--gSoft)" : "transparent", cursor: "pointer", fontSize: 15, fontWeight: 800, color: sled ? "var(--gInk)" : "var(--ink)" }}>{sled ? "Sledujete" : "Sledovať"}</button>
        {modul}
        {nazivo}
      </div>
      {zalozky}
      <div style={{ padding: "22px 16px 0", display: "flex", flexDirection: "column", gap: 44 }}>{sekcie}</div>
      <div style={{ height: DOK + 24 }} />
      {okno}
    </div>
  );

  // ================= PC =================
  return (
    <div ref={scRef} className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 32px 0" }}>
        <div style={{ position: "relative", height: 440, borderRadius: 28, background: bg(profil.titulka), boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: 28, background: "linear-gradient(180deg,rgba(10,8,5,.45) 0%,rgba(10,8,5,0) 28%,rgba(10,8,5,0) 45%,rgba(10,8,5,.82) 100%)" }} />
          {hornaLista}
          <div style={{ position: "absolute", left: 36, right: 220, bottom: 34, display: "flex", alignItems: "flex-end", gap: 22 }}>
            {logo(96)}
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8, color: "#fff" }}>
              <b style={{ fontSize: 46, lineHeight: 1.05, letterSpacing: "-.01em" }}>{profil.meno}</b>
              <span style={{ fontSize: 17, lineHeight: 1.45, maxWidth: 620, color: "#F3EEE4" }}>{profil.veta}</span>
              {cipy}
              {pomahameV(true)}
            </span>
          </div>
          {tlacStit(150, 180, 140, 170, { right: 40, bottom: -52 })}
        </div>
        <div style={{ height: "var(--mH)", margin: "18px 0 0", borderRadius: 3, background: "var(--metal)" }} />
        <div style={{ marginTop: 16 }}>{nazivo}</div>
      </div>
      {zalozky}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "26px 32px 70px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 380px", gap: 32, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 56, minWidth: 0 }}>{sekcie}</div>
        <aside style={{ position: "sticky", top: 74, maxHeight: "calc(100dvh - 90px)", overflowY: "auto", borderRadius: 24, display: "flex", flexDirection: "column", gap: 16 }}>{modul}</aside>
      </div>
      {okno}
    </div>
  );
}
