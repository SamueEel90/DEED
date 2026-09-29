// KARTA 26 · Karma a štíty (vidí len vlastník) — nahrádza „Karma a úrovne".
// Hlavný štít s lichotkou · karma (len číslo, bez percent a pruhov) · štíty podľa oblastí (Vyvesiť, max 5, poradie ťahaním)
// · moje úspechy · ako funguje karma · záver. Nesmie sa: percentá, pruhy, „do ďalšieho stupňa", porovnanie s inými, emoji.
import { useEffect, useRef, useState } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { StitObr, StitZoom, type StitLevel } from "@/components/stit";
import { STIT_SK, OBLASTI_USER, MA_ASSET, MOJE_STITY, MOJ_HLAVNY, KARMA_MESIAC, MOJE_USPECHY, LICHOTKY, MAX_VYVESENE, prepniVyvesenie, zoradVyvesene, useVyvesene, type Oblast } from "@/lib/stityOblasti";
import { MOJA_KARMA } from "./mock";
import "@/styles/platba.css";

const AKO: [string, string][] = [
  ["Jedna hlavná karma", "Máš jednu hlavnú karmu a jeden hlavný štít. Je nad všetkým. Štíty v oblastiach ukazujú, v čom si dobrý, a všetky sa započítavajú do hlavného štítu."],
  ["Každý je dobrý v niečom inom", "Niekoho baví šport, iného príroda, učenie alebo pomoc ľuďom. Pomôcť môžeš vedomosťami, skúsenosťami, odbornou radou, silnými rukami alebo len chuťou. Začni tým, čo ťa baví. Možno neskôr skúsiš aj niečo iné."],
  ["Malé skutky sa počítajú", "Karmu si môžeš budovať aj drobnými skutkami a pritom rozvíjať svoje schopnosti. Aj prvý beh alebo prečítaná kniha má svoje miesto v tvojom denníku."],
  ["Aj dar je skutok", "Keď podporíš oblasť finančne, započíta sa ti to tiež. Rovnakou mierou ako čas a ruky, nie viac. Karma rastie zo skutkov, peniaze nie sú skratka."],
  ["Rovnaké pravidlá pre každého", "Pravidlá sú rovnaké pre každého človeka na planéte, ktorý sa k nám pridá. Rovnaké platia aj pre firmy, malé aj veľké. Malá firma, ktorá pomáha aktívne a vytrvalo, môže predbehnúť veľkú."],
  ["Keď sa pravidlá zmenia", "Meniť ich budeme len vtedy, ak by sa výpočet karmy ukázal ako chybný, napríklad keby bol niektorý štít nedosiahnuteľný alebo príliš ľahký. O každej zmene dostaneš správu vopred."],
  ["Výšku karmy nemožno reklamovať", "Karmu určuje systém podľa rovnakých kritérií pre všetkých. Niekedy sa to môže zdať nespravodlivé. Ak sa to stane tebe, vopred sa ospravedlňujeme."],
];
const lbl = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "0 2px 8px" } as const;
const karta = { borderRadius: 18, background: "var(--d-card, var(--card))", border: "1px solid var(--d-cardBd, var(--cardBd))" } as const;
const Ik = ({ d, s = 18, w = 2.2 }: { d: string; s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export function KarmaStity({ onBack, desktop }: { onBack: () => void; desktop?: boolean }) {
  const hlavny = MOJ_HLAVNY;
  const li = LICHOTKY[hlavny];
  const [i, setI] = useState(0);
  const [liOp, setLiOp] = useState(1);
  const [ak, setAk] = useState<number | null>(null);
  const [zoom, setZoom] = useState<null | { level: StitLevel; oblast?: Oblast; nazov?: string; popis?: string }>(null);
  const vy = useVyvesene();
  const moje = new Map(MOJE_STITY.map((s) => [s.oblast, s.level]));

  // lichotka sa strieda každých 6 s (opacity 0,5 s)
  useEffect(() => {
    let t: number | undefined;
    const ti = window.setInterval(() => { setLiOp(0); t = window.setTimeout(() => { setI((x) => (x + 1) % li.length); setLiOp(1); }, 500); }, 6000);
    return () => { window.clearInterval(ti); window.clearTimeout(t); };
  }, [li.length]);

  const vyves = (o: Oblast) => { if (!prepniVyvesenie(o)) toast(`Vyvesiť môžeš najviac ${MAX_VYVESENE} štítov`); };

  return (
    <div className="deed-platba" style={{ padding: "0 16px 34px", display: "flex", flexDirection: "column", gap: 18, color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        {!desktop && <SpatTlacidlo onClick={onBack} />}
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Karma a štíty</h1>
      </div>

      {/* 1 · hlavný štít */}
      <div style={{ position: "relative", borderRadius: 26, background: "var(--goldBg)", border: "1px solid var(--sek-oBd, var(--goldBd))", padding: "20px 18px 18px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, overflow: "hidden" }}>
        <button type="button" onClick={() => setZoom({ level: hlavny, nazov: STIT_SK[hlavny], popis: li[i] })} aria-label={`Zväčšiť ${STIT_SK[hlavny]} štít`}
          style={{ position: "relative", width: 150, height: 172, border: "none", background: "none", padding: 0, cursor: "zoom-in", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span aria-hidden="true" className="pf-ziara" style={{ position: "absolute", left: "50%", top: "50%", width: 230, height: 230, margin: "-115px 0 0 -115px", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,231,163,.9) 0%,rgba(246,183,60,.28) 40%,rgba(246,183,60,0) 70%)" }} />
          <span style={{ position: "relative" }}><StitObr level={hlavny} h={172} /></span>
        </button>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--sek-o, var(--gold))" }}>HLAVNÝ ŠTÍT</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.01em", color: "var(--d-ink, var(--ink))" }}>{STIT_SK[hlavny]}</div>
        <div aria-live="polite" style={{ minHeight: 44, fontSize: 14.5, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))", maxWidth: 290, opacity: liOp, transition: "opacity .5s ease" }}>{li[i]}</div>
      </div>

      {/* 2 · karma — len číslo, vidí ju len vlastník */}
      <div style={{ ...karta, display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d="M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></span>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>Tvoja karma · vidíš ju len ty</span><span style={{ display: "block", fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{MOJA_KARMA.toLocaleString("sk-SK")}</span></span>
        <span style={{ flex: "none", textAlign: "right" }}><span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>+{KARMA_MESIAC}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>tento mesiac</span></span>
      </div>

      {/* 3 · štíty podľa oblastí */}
      <div>
        <div style={lbl}>ŠTÍTY PODĽA OBLASTÍ</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {OBLASTI_USER.map((o) => {
            const lv = moje.get(o), pripravuje = !MA_ASSET[o], ma = !!lv && !pripravuje, v = vy.includes(o);
            return (
              <div key={o} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 6px 10px", borderRadius: 16, background: ma ? "var(--d-card, var(--card))" : "var(--field)", border: "1px solid var(--d-cardBd, var(--cardBd))" }}>
                <button type="button" disabled={!ma} onClick={() => ma && setZoom({ level: lv!, oblast: o, popis: "Zaslúžený skutkami v tejto oblasti. Započítava sa do hlavného štítu." })}
                  aria-label={ma ? `${o}, ${STIT_SK[lv!]} štít, zväčšiť` : `${o}, ${pripravuje ? "štít pripravujeme" : "bez štítu"}`}
                  style={{ position: "relative", width: 56, height: 64, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", padding: 0, cursor: ma ? "zoom-in" : "default" }}>
                  {ma ? <StitObr level={lv!} oblast={o} h={62} lazy /> : <>
                    <span aria-hidden="true" style={{ opacity: 0.18, lineHeight: 0 }}><StitObr level={lv ?? "Bronze"} oblast={MA_ASSET[o] ? o : undefined} h={60} lazy /></span>
                    <span aria-hidden="true" style={{ position: "absolute", inset: "4px 8px", border: "2px dashed var(--chkBd)", borderRadius: "10px 10px 22px 22px" }} /></>}
                </button>
                <span style={{ fontSize: 13.5, fontWeight: 800 }}>{o}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: ma ? "var(--gInk)" : "var(--ink3)", textAlign: "center", lineHeight: 1.3 }}>{pripravuje ? "štít pripravujeme" : ma ? STIT_SK[lv!] : "zatiaľ bez štítu"}</span>
                {ma && <button type="button" role="switch" aria-checked={v} aria-label={`Vyvesiť na profile: ${o}`} onClick={() => vyves(o)}
                  style={{ marginTop: 4, minHeight: 30, padding: "3px 10px", borderRadius: 9, fontSize: 11.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", background: v ? "var(--gSoft)" : "transparent", color: v ? "var(--gInk)" : "var(--ink3)", border: `1px solid ${v ? "var(--gBd)" : "var(--cardBd)"}`, boxShadow: "none" }}>{v ? "Vyvesený" : "Vyvesiť"}</button>}
              </div>);
          })}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)", marginTop: 8, padding: "0 2px" }}>Každý štít v oblasti sa započíta do tvojho hlavného štítu. Vyvesené štíty uvidia ostatní na tvojom profile, najviac {MAX_VYVESENE}. <b style={{ color: "var(--ink2)" }}>Vyvesené: {vy.length} z {MAX_VYVESENE}</b></div>
        {vy.length > 1 && <PoradieVyvesenych vy={vy} moje={moje} />}
      </div>

      {/* 4 · moje úspechy */}
      <div>
        <div style={lbl}>MOJE ÚSPECHY</div>
        <div style={{ ...karta, padding: "4px 14px" }}>
          {MOJE_USPECHY.map((u, k) => (
            <div key={u.t} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: k ? "1px solid var(--d-sep, var(--cardBd))" : "none" }}>
              <span style={{ width: 36, height: 42, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><StitObr level={u.level} oblast={u.oblast} h={40} lazy /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{u.t}</span><span style={{ display: "block", fontSize: 13, lineHeight: 1.45, color: "var(--ink2)", marginTop: 1 }}>{u.s}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)", marginTop: 3 }}>{u.d}</span></span>
            </div>))}
        </div>
      </div>

      {/* 5 · ako funguje karma */}
      <div>
        <div style={lbl}>AKO FUNGUJE KARMA</div>
        <div style={{ ...karta, padding: "0 14px" }}>
          {AKO.map(([t, txt], k) => { const o = ak === k; return (
            <div key={t} style={{ borderTop: k ? "1px solid var(--d-sep, var(--cardBd))" : "none" }}>
              <button type="button" onClick={() => setAk(o ? null : k)} aria-expanded={o} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 56, padding: "6px 0", border: "none", background: "none", boxShadow: "none", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{t}</span>
                <span style={{ display: "flex", color: "var(--ink3)", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d="M6 9l6 6 6-6" s={16} w={2.4} /></span>
              </button>
              {o && <div className="pf-rise" style={{ padding: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "var(--ink2)" }}>{txt}</div>}
            </div>); })}
        </div>
      </div>

      {/* 6 · záver */}
      <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink2)", textAlign: "center", padding: "6px 12px 0" }}>Hľadali sme spravodlivosť. Či sa nám to podarilo, ukáže čas.</div>

      {zoom && <StitZoom level={zoom.level} oblast={zoom.oblast} nazov={zoom.nazov} popis={zoom.popis} onClose={() => setZoom(null)} />}
    </div>
  );
}

/** poradie vyvesených štítov — ťahaním (myš aj prst), klávesnicou šípkami */
function PoradieVyvesenych({ vy, moje }: { vy: Oblast[]; moje: Map<Oblast, StitLevel> }) {
  const [tah, setTah] = useState<{ o: Oblast; x0: number; dx: number } | null>(null);
  const rad = useRef<HTMLDivElement>(null);
  const SIRKA = 60;
  const presun = (o: Oblast, kam: number) => { const bez = vy.filter((x) => x !== o); const k = Math.max(0, Math.min(bez.length, kam)); zoradVyvesene([...bez.slice(0, k), o, ...bez.slice(k)]); };
  const koniec = () => {
    if (!tah) return;
    const od = vy.indexOf(tah.o);
    presun(tah.o, od + Math.round(tah.dx / SIRKA));
    setTah(null);
  };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...lbl, paddingBottom: 6 }} id="poradie-nadpis">PORADIE NA PROFILE</div>
      <div ref={rad} role="list" aria-labelledby="poradie-nadpis" style={{ display: "flex", gap: 0, padding: "10px 8px", borderRadius: 16, background: "var(--field)", border: "1px dashed var(--d-cardBd, var(--cardBd))", touchAction: "pan-y" }}>
        {vy.map((o, k) => { const lv = moje.get(o); const t = tah?.o === o; return (
          <div key={o} role="listitem" tabIndex={0} aria-label={`${o}, ${k + 1}. miesto. Posuň šípkami doľava a doprava.`}
            onKeyDown={(e) => { if (e.key === "ArrowLeft") { e.preventDefault(); presun(o, k - 1); } if (e.key === "ArrowRight") { e.preventDefault(); presun(o, k + 1); } }}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setTah({ o, x0: e.clientX, dx: 0 }); }}
            onPointerMove={(e) => { if (tah?.o === o) setTah({ ...tah, dx: e.clientX - tah.x0 }); }}
            onPointerUp={koniec} onPointerCancel={() => setTah(null)}
            style={{ width: SIRKA, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: t ? "grabbing" : "grab", transform: t ? `translateX(${tah!.dx}px) scale(1.08)` : "none", transition: t ? "none" : "transform .2s ease", zIndex: t ? 2 : 1, position: "relative", touchAction: "none", userSelect: "none" }}>
            {lv && <StitObr level={lv} oblast={o} h={44} tien />}
            <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--ink2)" }}>{o}</span>
          </div>); })}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6, padding: "0 2px" }}>Chyť štít a posuň ho. Prvé 3 sa ukážu aj pri tvojich zbierkach.</div>
    </div>
  );
}
