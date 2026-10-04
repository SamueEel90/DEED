// KARTA 47 · stránka tvorcu (Martin Konaľ) 1 : 1 podľa „Tvorca - Martin Konal.dc.html" (nahrádza Piráta Martina).
// PC (≥ 1200): obsah vľavo, vpravo lepkavý stĺpec 400 px (Podporiť Martina zbalený + online školenie).
// Mobil a tablet: pod sebou, Sledovať pod titulkou, dole zelený pás „Podporiť Martina ⌃" → hárok zdola s modulom.
// Poradie: Titulka · čísla · NAŽIVO (len keď vysiela) · MINULÉ STREAMY · MOJE ISKRY · RADY ZADARMO · DLHŠIE VIDEÁ A INDE
// · UČÍM · ONLINE ŠKOLENIE · POMÁHAM CEZ CHARITY · KONCERTY A AKCIE. Podpora = náš modul bez dorovnania (ModulPlatby).
// Prázdna sekcia sa neukáže. Cudzí prehrávač sa nenačíta, kým človek neťukne.
// Zaplatiť a odomknúť / prihlásiť sa (do 50 €): pod položkou sa rozbalí NakupPanel. Kým nie je platba na serveri,
// podržanie odomkne len v testovacej verzii. Okno na dary sa na nákup nepoužíva.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { TestProfil } from "@/lib/testProfily";
import { TVORCA_DATA, STREAM_ZBIERKY } from "@/lib/testTvorca";
import { otvorIskry } from "@/features/iskry/otvor";
import { DOK, PortalVp } from "./casti";
import { TESTOVACIA } from "@/lib/testovacia";
import { ModulPlatby } from "./ModulProfilu";
import { Citacka, NAKUP_MAX, NakupPanel, OdchodHarok, Prehravac } from "./ObsahTvorcu";
import { PRUH, useVsetkyNaKonci } from "./charitaCasti";

const PC = "(min-width: 1200px)";
function usePc() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia(PC).matches);
  useEffect(() => { const q = window.matchMedia(PC), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}
const bgU = (u: string, poz = "center") => `url('${u}') ${poz}/cover no-repeat #3a3530`;
const eurT = (n: number) => `${n.toLocaleString("sk-SK")} €`;
const tlTmave: CSSProperties = { height: 44, border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" };
const tlBez: CSSProperties = { border: "none", padding: 0, background: "transparent", boxShadow: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "inherit" };
const karta: CSSProperties = { background: "var(--card)", border: "1px solid var(--cardBd)" };
const Hraj = ({ w = 64, h = 46, r = 14, s = 20, a = 0.75 }: { w?: number; h?: number; r?: number; s?: number; a?: number }) => (
  <span style={{ position: "absolute", left: "50%", top: "50%", width: w, height: h, margin: `${-h / 2}px 0 0 ${-w / 2}px`, borderRadius: r, background: `rgba(10,8,5,${a})`, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width={s} height={s} viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
);

function Nadpis({ t, s }: { t: string; s?: string }) {
  return <span style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", paddingTop: 12 }}><b style={{ fontSize: 12, letterSpacing: ".1em", color: "var(--acc)" }}>{t}</b>{s && <span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span>}</span>;
}

export function StrankaTvorcu({ profil, onBack, onStream }: { profil: TestProfil; onBack: () => void; onStream: (streamId: string) => void }) {
  const pc = usePc();
  const d = TVORCA_DATA;
  const stit = profil.stit.toLowerCase();
  const krstne = profil.meno.split(" ")[0];
  const [sled, setSled] = useState(false);
  const [odom, setOdom] = useState<Record<string, boolean>>({});
  const [prih, setPrih] = useState(false);
  /** otvorená platba pod položkou (id obsahu alebo „skolenie") — nákup do 50 €, nie dar */
  const [platba, setPlatba] = useState<string | null>(null);
  const [pod, setPod] = useState(false);
  // KARTA 47 · obsah: čítačka / náš prehrávač (stránka ostáva pod nimi skrytá, Späť vráti na to isté miesto) · hárok pred odchodom von
  const [obsah, setObsah] = useState<{ druh: "citacka" | "video"; nadpis: string; foto?: string } | null>(null);
  const [von, setVon] = useState<{ kam: string; url: string } | null>(null);
  const [sh, setSh] = useState(false), [shVidno, setShVidno] = useState(false);
  const otvorHarok = () => { setSh(true); requestAnimationFrame(() => requestAnimationFrame(() => setShVidno(true))); };
  const zavriHarok = () => { setShVidno(false); window.setTimeout(() => setSh(false), 320); };
  useEffect(() => { if (!sh) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavriHarok(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [sh]);

  const sledTl = (
    <button type="button" onClick={() => setSled((x) => !x)} aria-pressed={sled}
      style={{ height: 46, padding: "0 18px", borderRadius: 14, border: sled ? "none" : "1.5px solid rgba(255,255,255,.6)", background: sled ? "#F6C453" : "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, color: sled ? "#1D211B" : "#fff", whiteSpace: "nowrap", boxShadow: "none", fontFamily: "inherit" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={sled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>
      {sled ? "Sleduješ" : `Sledovať · ${d.sledujuci.toLocaleString("sk-SK")}`}
    </button>
  );

  const titulka = (
    <div style={{ position: "relative", height: pc ? 340 : 300, background: bgU(profil.titulka) }}>
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.45) 0%,rgba(10,8,5,.05) 35%,rgba(10,8,5,.9) 100%)" }} />
      <div style={{ position: "absolute", left: pc ? 32 : 12, right: pc ? 32 : 12, top: pc ? 20 : "max(12px, env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={onBack} aria-label="Späť" style={{ ...tlTmave, padding: "0 14px 0 8px", gap: 4, fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "inherit" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť</button>
        <span style={{ flex: 1 }} />
        <button type="button" aria-label="Zdieľať · QR" style={{ ...tlTmave, width: 44 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14" /></svg></button>
      </div>
      <div style={{ position: "absolute", left: pc ? 32 : 16, right: pc ? 32 : 12, bottom: pc ? 26 : 14, display: "flex", alignItems: "flex-end", gap: pc ? 20 : 12 }}>
        {pc && <span style={{ flex: "none", width: 104, height: 104, borderRadius: 52, background: `url('${d.avatar}') center/cover`, border: "4px solid #fff", boxShadow: "0 10px 30px rgba(0,0,0,.4)" }} />}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6, color: "#fff" }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "#F6D77A" }}>TVORCA · {d.mesto.toLocaleUpperCase("sk-SK")}</span>
          <b style={{ fontSize: pc ? 46 : 30, lineHeight: 1.05, letterSpacing: "-.02em" }}>{profil.meno}</b>
          <span style={{ fontSize: pc ? 17 : 14, lineHeight: 1.45, opacity: 0.92 }}>{profil.veta}</span>
        </span>
        {pc && sledTl}
      </div>
    </div>
  );

  const cisla = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, padding: "12px 16px", borderRadius: 18, ...karta }}>
      {d.cisla.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 19, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>{t}</span></span>)}
    </div>
  );

  const z = d.naZivo, zz = z ? STREAM_ZBIERKY[z.zbierka] : undefined;
  const naZivo = z && zz && (
    <article style={{ borderRadius: 22, overflow: "hidden", background: "#1D211B", color: "#fff", display: pc ? "grid" : "flex", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", flexDirection: "column" }}>
      <button type="button" onClick={() => onStream(z.id)} aria-label={`Pozrieť stream · ${zz.nazov}`} style={{ ...tlBez, position: "relative", display: "block", width: "100%", ...(pc ? { minHeight: 230 } : { aspectRatio: "16/9" }), background: `url('${z.nahlad}') center/cover #111` }}>
        <span style={{ position: "absolute", inset: 0, background: "rgba(10,8,5,.3)" }} />
        <span style={{ position: "absolute", left: 12, top: 12, height: 26, padding: "0 10px", borderRadius: 13, background: "#E5483A", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", animation: "vpPulz 1.2s ease infinite" }} />NAŽIVO · {z.divaci.toLocaleString("sk-SK")}</span>
        <Hraj />
      </button>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "#F6D77A" }}>VYSIELAM PRE ZBIERKU</span>
        <b style={{ fontSize: 20, lineHeight: 1.2 }}>{zz.nazov}</b>
        <span style={{ fontSize: 13, opacity: 0.8 }}>Za zbierku zodpovedá {zz.charita}</span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums" }}><b style={{ fontSize: 26, whiteSpace: "nowrap" }}>{eurT(z.suma)}</b><span style={{ fontSize: 13.5, opacity: 0.8, whiteSpace: "nowrap" }}>počas streamu · {z.ludia} ľudí</span></span>
        <button type="button" onClick={() => onStream(z.id)} style={{ height: 48, border: "none", borderRadius: 14, background: PRUH, cursor: "pointer", fontSize: 15.5, fontWeight: 800, color: "#fff", boxShadow: "none", fontFamily: "inherit" }}>Pozrieť a darovať</button>
      </div>
    </article>
  );

  const streamy = d.streamy.length > 0 && <>
    <span style={{ display: "flex", alignItems: "baseline", gap: 10, paddingTop: 6 }}><b style={{ fontSize: 12, letterSpacing: ".1em", color: "var(--acc)" }}>MINULÉ STREAMY</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>čo vyzbierali</span></span>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {d.streamy.map((x) => (
        <div key={x.n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 16, ...karta }}>
          <span style={{ flex: "none", width: 64, height: 40, borderRadius: 8, background: bgU(x.foto) }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14.5, lineHeight: 1.25 }}>{x.n}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{x.d} · záznam {x.dl}</span></span>
          <b style={{ flex: "none", fontSize: 14.5, color: "var(--gInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{x.s}</b>
        </div>))}
    </div>
  </>;

  const [iw, ih] = pc ? [150, 266] : [120, 214];
  const [radIskier, vsetkyIskry] = useVsetkyNaKonci(122, d.iskry.length);
  const iskry = d.iskry.length > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>MOJE ISKRY</span>
      <div ref={radIskier} style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        {d.iskry.map((v) => (
          <button key={v.n} type="button" onClick={() => otvorIskry()} aria-label={`Iskra · ${v.n}`} style={{ ...tlBez, position: "relative", flex: "none", width: iw, height: ih, borderRadius: 18, overflow: "hidden", background: bgU(v.foto) }}>
            <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 50%,rgba(0,0,0,.85) 100%)" }} />
            <span style={{ position: "absolute", left: 8, top: 8, height: 24, padding: "0 9px", borderRadius: 12, background: v.vyzva ? "#4B7A35" : "rgba(0,0,0,.55)", color: "#fff", fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{v.st}</span>
            <span style={{ position: "absolute", left: "50%", top: "42%", width: 40, height: 40, margin: "-20px 0 0 -20px", borderRadius: "50%", background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
            <span style={{ position: "absolute", left: 10, right: 10, bottom: 10, display: "flex", flexDirection: "column", gap: 2, color: "#fff" }}><b style={{ fontSize: 13.5, lineHeight: 1.25 }}>{v.n}</b><span style={{ fontSize: 11.5, opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>{v.m}</span></span>
          </button>))}
        {vsetkyIskry && <button type="button" onClick={() => otvorIskry()} style={{ ...tlBez, flex: "none", width: 112, height: ih, borderRadius: 18, border: "1.5px dashed var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 10, fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>Všetky Iskry {krstne}a ›</button>}
      </div>
    </div>
  );

  const rady = d.rady.length > 0 && <>
    <Nadpis t="RADY ZADARMO" s={pc ? "čítaj a pozeraj hneď" : undefined} />
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${pc ? 3 : 1},minmax(0,1fr))`, gap: 12 }}>
      {d.rady.map((r) => (
        <button key={r.n} type="button" onClick={() => setObsah({ druh: r.druh === "VIDEO" ? "video" : "citacka", nadpis: r.n, foto: r.foto })} style={{ ...tlBez, borderRadius: 20, overflow: "hidden", ...karta, display: "flex", flexDirection: "column", color: "var(--ink)" }}>
          <span style={{ position: "relative", display: "block", width: "100%", height: pc ? 120 : 150, background: bgU(r.foto) }}>
            <span style={{ position: "absolute", left: 10, top: 10, height: 24, padding: "0 9px", borderRadius: 12, background: "#fff", color: "#1D211B", fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center" }}>ZADARMO · {r.druh}</span>
          </span>
          <span style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5 }}>
            <b style={{ fontSize: 15.5, lineHeight: 1.3 }}>{r.n}</b><span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{r.o}</span><span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--green)" }}>{r.cta} ›</span>
          </span>
        </button>))}
    </div>
  </>;

  const yt = (d.yt.length > 0 || d.siete.length > 0) && <>
    <Nadpis t="DLHŠIE VIDEÁ A INDE" s="otvorí sa až po ťuku" />
    {d.yt.length > 0 && <div style={{ display: "grid", gridTemplateColumns: `repeat(${pc ? 2 : 1},minmax(0,1fr))`, gap: 12 }}>
      {d.yt.map((v) => (
        <button key={v.n} type="button" onClick={() => setVon({ kam: v.kde, url: v.url })} style={{ ...tlBez, borderRadius: 20, overflow: "hidden", ...karta, color: "var(--ink)", display: "block" }}>
          <span style={{ position: "relative", display: "block", width: "100%", aspectRatio: "16/9", background: bgU(v.foto) }}>
            <Hraj w={56} h={40} r={12} s={18} a={0.7} />
            <span style={{ position: "absolute", right: 8, bottom: 8, height: 22, padding: "0 7px", borderRadius: 6, background: "rgba(10,8,5,.75)", color: "#fff", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", fontVariantNumeric: "tabular-nums" }}>{v.dl}</span>
          </span>
          <span style={{ padding: "10px 14px 12px", display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 15, lineHeight: 1.3 }}>{v.n}</b><span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--green)" }}>Pozrieť na {v.kde} ›</span></span>
        </button>))}
    </div>}
    {d.siete.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {d.siete.map((s) => <button key={s.n} type="button" onClick={() => setVon({ kam: s.n, url: s.url })} style={{ ...tlBez, height: 44, padding: "0 16px", borderRadius: 22, ...karta, display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>{s.n} <span style={{ color: "var(--ink3)" }}>↗</span></button>)}
    </div>}
    <span style={{ fontSize: 12, lineHeight: 1.45, color: "var(--ink3)" }}>Odkazy vedú von z DEED+. Video sa načíta až po ťuku, dovtedy cudzia stránka nič nevie.</span>
  </>;

  const platene = d.platene.length > 0 && <>
    <Nadpis t="UČÍM" s="odomkneš hneď po zaplatení" />
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {d.platene.map((x) => {
        const on = !!odom[x.id], pl = platba === x.id;
        return (<div key={x.id} style={{ display: "flex", flexDirection: "column" }}>
          <article style={{ display: "flex", gap: 14, alignItems: "center", padding: 12, borderRadius: 20, background: "var(--card)", border: on ? "1.5px solid var(--gBd)" : pl ? "1px solid var(--goldBd)" : "1px solid var(--cardBd)" }}>
            <span style={{ position: "relative", flex: "none", width: 84, height: 84, borderRadius: 16, background: bgU(x.foto), overflow: "hidden" }}>
              {!on && <span style={{ position: "absolute", inset: 0, background: "rgba(10,8,5,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></span>}
            </span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--gold)" }}>{x.druh}</span>
              <b style={{ fontSize: 15.5, lineHeight: 1.3 }}>{x.n}</b>
              <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{x.o}</span>
              <button type="button" onClick={() => { if (on) setObsah({ druh: "citacka", nadpis: x.n, foto: x.foto }); else if (!pl && x.cena <= NAKUP_MAX) setPlatba(x.id); }}
                style={{ alignSelf: "flex-start", marginTop: 4, height: 44, padding: "0 14px", borderRadius: 12, border: on ? "1px solid var(--gBd)" : "1.5px solid var(--gold)", background: on ? "var(--gSoft)" : "transparent", cursor: "pointer", fontSize: 13.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--gold)", whiteSpace: "nowrap", boxShadow: "none", fontFamily: "inherit" }}>
                {on ? "Odomknuté · otvoriť" : pl ? "Platba otvorená" : `Zaplatiť a odomknúť · ${x.cena} €`}
              </button>
            </span>
          </article>
          {pl && <NakupPanel cena={x.cena} drzText="Podrž, zaplať a odomkni" onZrus={() => setPlatba(null)} onHotovo={() => { setPlatba(null); if (TESTOVACIA) setOdom((o) => ({ ...o, [x.id]: true })); }} />}
        </div>);
      })}
    </div>
  </>;

  const s = d.skolenie;
  const plSkol = platba === "skolenie";
  const skolenie = s && (<div style={{ display: "flex", flexDirection: "column" }}>
    <article style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: "linear-gradient(160deg,#2F5E3A 0%,#4B7A35 100%)", color: "#fff", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><span style={{ height: 26, padding: "0 10px", borderRadius: 13, background: "#fff", color: "#2F5E3A", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center" }}>ONLINE ŠKOLENIE</span><span style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.9 }}>{s.miesta}</span></span>
      <b style={{ fontSize: 22, lineHeight: 1.2 }}>{s.n}</b>
      <span style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.92 }}>{s.o}</span>
      <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "4px 12px", fontSize: 13.5, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.22)", borderBottom: "1px solid rgba(255,255,255,.22)" }}>
        <span style={{ opacity: 0.75 }}>Kedy</span><b>{s.kedy}</b><span style={{ opacity: 0.75 }}>Kde</span><b>{s.kde}</b><span style={{ opacity: 0.75 }}>Cena</span><b>{eurT(s.cena)}</b>
      </div>
      <span style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,.12)" }}>
        <svg style={{ flex: "none" }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2M18 14h2v2M14 18v2h6" /></svg>
        <span style={{ fontSize: 13, lineHeight: 1.45 }}>Na začiatku naskenuješ QR. Potvrdí, že si bol, a dostaneš osvedčenie a karmu.</span>
      </span>
      <button type="button" onClick={() => { if (!prih && !plSkol && s.cena <= NAKUP_MAX) setPlatba("skolenie"); }} style={{ height: 50, border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontSize: 15.5, fontWeight: 800, color: "#2F5E3A", boxShadow: "none", fontFamily: "inherit" }}>{prih ? "Prihlásený · QR dostaneš v deň školenia" : plSkol ? "Platba otvorená" : `Zaplatiť a prihlásiť sa · ${eurT(s.cena)}`}</button>
    </article>
    {plSkol && <NakupPanel cena={s.cena} drzText="Podrž, zaplať a prihlás sa" onZrus={() => setPlatba(null)} onHotovo={() => { setPlatba(null); if (TESTOVACIA) setPrih(true); }} />}
  </div>);

  const charity = d.zbierky.length > 0 && <>
    <Nadpis t="POMÁHAM CEZ CHARITY" />
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {d.zbierky.map((x) => (
        <article key={x.n} style={{ display: "flex", gap: 12, alignItems: "center", padding: 10, borderRadius: 18, ...karta }}>
          <span style={{ flex: "none", width: 80, height: 80, borderRadius: 14, background: bgU(x.foto) }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            <b style={{ fontSize: 15, lineHeight: 1.25 }}>{x.n}</b>
            <span style={{ display: "block", height: 5, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, x.v / x.ciel)})` }} /></span>
            <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}><b style={{ color: "var(--ink)", fontSize: 14 }}>{eurT(x.v)}</b> z {eurT(x.ciel)}</span>
            <span style={{ fontSize: 12, color: "var(--ink3)" }}>Za zbierku zodpovedá <b style={{ color: "var(--ink2)" }}>{x.kto}</b></span>
          </span>
        </article>))}
    </div>
  </>;

  const akcie = d.akcie.length > 0 && <>
    <Nadpis t="KONCERTY A AKCIE" />
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {d.akcie.map((a) => (
        <div key={a.n} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 16, ...karta }}>
          <span style={{ flex: "none", width: 52, height: 60, borderRadius: 12, background: "#1D211B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}><b style={{ fontSize: 20, lineHeight: 1 }}>{a.d}</b><span style={{ fontSize: 10.5, fontWeight: 800 }}>{a.m}</span></span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{a.n}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{a.s}</span></span>
        </div>))}
    </div>
  </>;

  const modul = <ModulPlatby profil={profil} sektor={d.podpora} dorovnanie={false} nazov={d.podpora.nazov}
    uvidisOdkaz={{ text: `Pozrieť v zbierke ${d.odkazZbierky}` }} />;
  const ludiaPod = `${d.podporaPocet.toLocaleString("sk-SK")} ľudí už podporuje`;
  const kov = <span style={{ display: "block", height: "var(--mH)", background: "var(--metal)" }} />;

  const strankaPc = pc && (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto" }}>
      {titulka}{kov}
      <div style={{ padding: "22px 32px 120px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 400px", gap: 32, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          {cisla}{naZivo}{streamy}{iskry}{rady}{yt}{platene}{charity}{akcie}
        </div>
        <aside style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button type="button" onClick={() => setPod((x) => !x)} aria-expanded={pod}
              style={{ width: "100%", minHeight: 72, padding: "12px 12px 12px 16px", borderRadius: 20, border: "1.5px solid var(--gBd)", background: "var(--gSoft)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, color: "var(--ink)", boxShadow: "none", fontFamily: "inherit" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 18 }}>Podporiť {krstne}a</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>mesačne alebo jednorazovo · {ludiaPod}</span></span>
              <span style={{ flex: "none", width: 36, height: 36, borderRadius: 18, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ transform: `rotate(${pod ? 180 : 0}deg)`, transition: "transform .25s ease" }}><path d="M6 9l6 6 6-6" /></svg></span>
            </button>
            {pod && <>
              {modul}
              <button type="button" onClick={() => setPod(false)} style={{ height: 44, border: "none", background: "transparent", cursor: "pointer", fontSize: 13.5, fontWeight: 800, color: "var(--ink3)", boxShadow: "none", fontFamily: "inherit" }}>Zbaliť ⌃</button>
            </>}
          </div>
          {skolenie}
        </aside>
      </div>
    </div>
  );

  const strankaM = !pc && (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" } as CSSProperties}>
        {titulka}{kov}
        <div style={{ padding: `14px 16px ${DOK + 90}px`, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10 }}>{sledTl}</div>
          {cisla}{naZivo}{streamy}{iskry}{rady}{yt}{platene}
          {skolenie && <><Nadpis t="ONLINE ŠKOLENIE" />{skolenie}</>}
          {charity}{akcie}
        </div>
      </div>
      <button type="button" onClick={otvorHarok}
        style={{ position: "absolute", left: 14, right: 14, bottom: DOK + 12, zIndex: 20, height: 54, border: "none", borderRadius: 18, background: "linear-gradient(90deg,#4B7A35,#8DB866)", boxShadow: "0 10px 26px rgba(0,0,0,.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "inherit" }}>
        Podporiť {krstne}a<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
      </button>
      {sh && <Harok stit={profil.stit} nadpis={`Podporiť ${krstne}a`} vidno={shVidno} onClose={zavriHarok}>{modul}</Harok>}
    </div>
  );

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div aria-hidden={!!obsah} style={obsah ? { position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none" } : { height: "100%" }}>{strankaPc || strankaM}</div>
      {obsah && <div className="vp sc-tokeny" data-stit={stit} style={{ position: "absolute", inset: 0 }}>
        {obsah.druh === "video"
          ? <Prehravac pc={pc} nadpis={obsah.nadpis} autor={profil.meno} onBack={() => setObsah(null)} />
          : <Citacka pc={pc} nadpis={obsah.nadpis} autor={profil.meno} foto={obsah.foto} onBack={() => setObsah(null)} />}
      </div>}
      {von && <OdchodHarok pc={pc} stit={profil.stit} kam={von.kam} url={von.url} onClose={() => setVon(null)} />}
    </div>
  );
}

/** hárok zdola (86 % výšky) — mobil */
function Harok({ stit, nadpis, vidno, onClose, children }: { stit: string; nadpis: string; vidno: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <PortalVp stit={stit}>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,8,5,.55)", opacity: vidno ? 1 : 0, transition: "opacity .25s ease" }} />
      <div role="dialog" aria-label={nadpis} style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 61, height: "86%", borderRadius: "26px 26px 0 0", background: "var(--bg)", color: "var(--ink)", boxShadow: "0 -20px 50px rgba(0,0,0,.4)", transform: `translateY(${vidno ? "0%" : "105%"})`, transition: "transform .32s cubic-bezier(.2,.8,.2,1)", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: "none", display: "flex", alignItems: "center", padding: "8px 8px 4px 18px" }}>
          <b style={{ flex: 1, fontSize: 17 }}>{nadpis}</b>
          <button type="button" onClick={onClose} aria-label="Zavrieť" style={{ width: 44, height: 44, border: "none", borderRadius: 22, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", boxShadow: "none" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "6px 16px 40px" } as CSSProperties}>{children}</div>
      </div>
    </PortalVp>
  );
}
