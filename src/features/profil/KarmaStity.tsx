// KARTA 26 · Karma a štíty (vidí len vlastník) — nahrádza „Karma a úrovne".
// Hlavný štít s lichotkou · karma (len číslo, bez percent a pruhov) · štíty podľa oblastí (Vyvesiť, max 5, poradie ťahaním)
// · moje úspechy · ako funguje karma · záver. Nesmie sa: percentá, pruhy, „do ďalšieho stupňa", porovnanie s inými, emoji.
import { useEffect, useRef, useState } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { StitObr, StitZoom, type StitLevel } from "@/components/stit";
import { nazovStitu, OBLASTI_USER, MA_ASSET, MOJE_STITY, MOJ_HLAVNY, KARMA_MESIAC, MOJE_USPECHY, LICHOTKY, MAX_VYVESENE, PORADIE, ZISKANE_DNA, ZAUJEM_OBLAST, prepniVyvesenie, zoradVyvesene, useVyvesene, type Oblast } from "@/lib/stityOblasti";
import { Harok } from "@/features/zbierka/Zdielat";
import { usePouzivatel } from "@/lib/pouzivatel";
import { mojeSkutky } from "@/lib/mojeSkutky";
import { MOJA_KARMA } from "./mock";
import { useT } from "@/i18n";
import "@/styles/platba.css";

const AKO: [string, string][] = [1, 2, 3, 4, 5, 6, 7].map((k) => [`karma.ako.${k}.t`, `karma.ako.${k}.s`]);
const lbl = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "0 2px 8px" } as const;
const karta = { borderRadius: 18, background: "var(--d-card, var(--card))", border: "1px solid var(--d-cardBd, var(--cardBd))" } as const;
const Ik = ({ d, s = 18, w = 2.2 }: { d: string; s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

/** nezískaný štít = stlmený náhľad skutočného obrázka (karta 26, doplnok 29. 9.) */
const NAHLAD = { opacity: 0.45, filter: "grayscale(.75)", lineHeight: 0 } as const;
const VITAJ = ["karma.vitaj"];

export function KarmaStity({ onBack, desktop, naSkutky }: { onBack: () => void; desktop?: boolean; naSkutky?: (o: Oblast) => void }) {
  const t = useT();
  const ja = usePouzivatel();
  const novy = !ja.demo; // nový účet: hlavný Bronzový od registrácie, oblasti zamknuté (mock údaje len v ukážke)
  const hlavny: StitLevel = novy ? "Bronze" : MOJ_HLAVNY;
  const li = (novy ? VITAJ : LICHOTKY[hlavny]).map((k) => t(k));
  const [det, setDet] = useState<Oblast | null>(null);
  const [i, setI] = useState(0);
  const [liOp, setLiOp] = useState(1);
  const [ak, setAk] = useState<number | null>(null);
  const [zoom, setZoom] = useState<null | { level: StitLevel; oblast?: Oblast; nazov?: string; popis?: string }>(null);
  const vy = useVyvesene();
  const moje = new Map<Oblast, StitLevel>(novy ? [] : MOJE_STITY.map((s) => [s.oblast, s.level]));

  // lichotka sa strieda každých 6 s (opacity 0,5 s)
  useEffect(() => {
    let to: number | undefined;
    if (li.length < 2) return;
    const ti = window.setInterval(() => { setLiOp(0); to = window.setTimeout(() => { setI((x) => (x + 1) % li.length); setLiOp(1); }, 500); }, 6000);
    return () => { window.clearInterval(ti); window.clearTimeout(to); };
  }, [li.length]);

  const vyves = (o: Oblast) => { if (!prepniVyvesenie(o)) toast(t("karma.vyvesitMax", { n: MAX_VYVESENE })); };

  return (
    <div className="deed-platba" style={{ padding: "0 16px 34px", display: "flex", flexDirection: "column", gap: 18, color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        {!desktop && <SpatTlacidlo onClick={onBack} />}
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{t("karma.titul")}</h1>
      </div>

      {/* 1 · hlavný štít */}
      <div style={{ position: "relative", borderRadius: 26, background: "var(--goldBg)", border: "1px solid var(--sek-oBd, var(--goldBd))", padding: "20px 18px 18px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, overflow: "hidden" }}>
        <button type="button" onClick={() => setZoom({ level: hlavny, nazov: nazovStitu(hlavny, t), popis: li[i] })} aria-label={t("karma.zvacsitStit", { uroven: nazovStitu(hlavny, t) })}
          style={{ position: "relative", width: 150, height: 172, border: "none", background: "none", boxShadow: "none", padding: 0, cursor: "zoom-in", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span aria-hidden="true" className="pf-ziara" style={{ position: "absolute", left: "50%", top: "50%", width: 230, height: 230, margin: "-115px 0 0 -115px", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,231,163,.9) 0%,rgba(246,183,60,.28) 40%,rgba(246,183,60,0) 70%)" }} />
          <span style={{ position: "relative" }}><StitObr level={hlavny} h={172} /></span>
        </button>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--sek-o, var(--gold))" }}>{t("karma.hlavnyStit")}</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.01em", color: "var(--d-ink, var(--ink))" }}>{nazovStitu(hlavny, t)}</div>
        <div aria-live="polite" style={{ minHeight: 44, fontSize: 14.5, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))", maxWidth: 290, opacity: liOp, transition: "opacity .5s ease" }}>{li[i]}</div>
      </div>

      {/* 2 · karma — len číslo, vidí ju len vlastník */}
      <div style={{ ...karta, display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d="M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></span>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{t("karma.tvojaKarma")}</span><span style={{ display: "block", fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{t.cislo(novy ? 0 : MOJA_KARMA)}</span></span>
        <span style={{ flex: "none", textAlign: "right" }}><span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{novy ? "—" : `+${t.cislo(KARMA_MESIAC)}`}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>{t("karma.tentoMesiac")}</span></span>
      </div>

      {/* 3 · štíty podľa oblastí */}
      <div>
        <div style={lbl}>{t("karma.stityOblasti")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {OBLASTI_USER.map((o) => {
            const lv = moje.get(o), pripravuje = !MA_ASSET[o], ma = !!lv && !pripravuje, v = vy.includes(o);
            return (
              <div key={o} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 6px 10px", borderRadius: 16, background: ma ? "var(--d-card, var(--card))" : "var(--field)", border: "1px solid var(--d-cardBd, var(--cardBd))" }}>
                <button type="button" disabled={pripravuje} onClick={() => setDet(o)}
                  aria-label={pripravuje ? t("karma.ariaPripravujeme", { o }) : ma ? t("karma.ariaMa", { o, uroven: nazovStitu(lv!, t) }) : t("karma.ariaBez", { o })}
                  style={{ position: "relative", width: 56, height: 64, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", boxShadow: "none", padding: 0, cursor: pripravuje ? "default" : "pointer" }}>
                  {ma ? <StitObr level={lv!} oblast={o} h={62} lazy /> : <span aria-hidden="true" style={NAHLAD}><StitObr level="Bronze" oblast={MA_ASSET[o] ? o : undefined} h={62} lazy /></span>}
                </button>
                <span style={{ fontSize: 13.5, fontWeight: 800 }}>{o}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: ma ? "var(--gInk)" : "var(--ink3)", textAlign: "center", lineHeight: 1.3 }}>{pripravuje ? t("karma.pripravujeme") : ma ? nazovStitu(lv!, t) : t("karma.trochaSnahy")}</span>
                {ma && <button type="button" role="switch" aria-checked={v} aria-label={t("karma.ariaVyvesit", { o })} onClick={() => vyves(o)}
                  style={{ marginTop: 4, minHeight: 30, padding: "3px 10px", borderRadius: 9, fontSize: 11.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", background: v ? "var(--gSoft)" : "transparent", color: v ? "var(--gInk)" : "var(--ink3)", border: `1px solid ${v ? "var(--gBd)" : "var(--cardBd)"}`, boxShadow: "none" }}>{v ? t("karma.vyveseny") : t("karma.vyvesit")}</button>}
              </div>);
          })}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)", marginTop: 8, padding: "0 2px" }}>{t("karma.oblastiInfo", { n: MAX_VYVESENE })} <b style={{ color: "var(--ink2)" }}>{t("karma.vyveseneZ", { n: vy.length, max: MAX_VYVESENE })}</b></div>
        {vy.length > 1 && <PoradieVyvesenych vy={vy} moje={moje} />}
      </div>

      {/* 4 · moje úspechy (nový účet ich ešte nemá) */}
      {!novy && <div>
        <div style={lbl}>{t("karma.mojeUspechy")}</div>
        <div style={{ ...karta, padding: "4px 14px" }}>
          {MOJE_USPECHY.map((u, k) => (
            <div key={u.t} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: k ? "1px solid var(--d-sep, var(--cardBd))" : "none" }}>
              <span style={{ width: 36, height: 42, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><StitObr level={u.level} oblast={u.oblast} h={40} lazy /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{t(u.t)}</span><span style={{ display: "block", fontSize: 13, lineHeight: 1.45, color: "var(--ink2)", marginTop: 1 }}>{t(u.s)}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)", marginTop: 3 }}>{t.datum(u.d, true)}</span></span>
            </div>))}
        </div>
      </div>}

      {/* 5 · ako funguje karma */}
      <div>
        <div style={lbl}>{t("karma.akoFunguje")}</div>
        <div style={{ ...karta, padding: "0 14px" }}>
          {AKO.map(([kt, kx], k) => { const o = ak === k; return (
            <div key={kt} style={{ borderTop: k ? "1px solid var(--d-sep, var(--cardBd))" : "none" }}>
              <button type="button" onClick={() => setAk(o ? null : k)} aria-expanded={o} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 56, padding: "6px 0", border: "none", background: "none", boxShadow: "none", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{t(kt)}</span>
                <span style={{ display: "flex", color: "var(--ink3)", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d="M6 9l6 6 6-6" s={16} w={2.4} /></span>
              </button>
              {o && <div className="pf-rise" style={{ padding: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "var(--ink2)" }}>{t(kx)}</div>}
            </div>); })}
        </div>
      </div>

      {/* 6 · záver */}
      <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink2)", textAlign: "center", padding: "6px 12px 0" }}>{t("karma.zaver")}</div>

      {det && <DetailOblasti o={det} lv={moje.get(det)} onClose={() => setDet(null)} naZoom={(l) => setZoom({ level: l, oblast: det, nazov: `${nazovStitu(l, t)} · ${det}`, popis: t("karma.zoomPopis", { datum: ZISKANE_DNA[l] !== undefined ? t.datum(ZISKANE_DNA[l]!, true) : "" }) })}
        naSkutky={naSkutky ? () => { setDet(null); naSkutky(det); } : undefined} />}
      {zoom && <StitZoom level={zoom.level} oblast={zoom.oblast} nazov={zoom.nazov} popis={zoom.popis} onClose={() => setZoom(null)} />}
    </div>
  );
}

/** detail oblasti — rebrík 5 stupňov, skutky v oblasti. Bez percent a „chýba N". */
function DetailOblasti({ o, lv, onClose, naZoom, naSkutky }: { o: Oblast; lv?: StitLevel; onClose: () => void; naZoom: (l: StitLevel) => void; naSkutky?: () => void }) {
  const idx = lv ? PORADIE.indexOf(lv) : -1;
  const skutky = mojeSkutky().filter((x) => ZAUJEM_OBLAST[x.oblast] === o).slice(0, 3);
  const t = useT();
  const dat = (d: number) => t.datum(d);
  const zisk = (l: StitLevel) => (ZISKANE_DNA[l] !== undefined ? t.datum(ZISKANE_DNA[l]!, true) : "");
  return (
    <Harok onClose={onClose} zatvorText={t("sp.zavriet")} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{t("karma.stityOblast", { o })}</span>}>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{lv ? t("karma.detailMa", { o, uroven: t.jazyk === "sk" ? nazovStitu(lv, t).toLowerCase() : nazovStitu(lv, t) }) : t("karma.detailBez", { o })}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PORADIE.map((l, i) => {
          const ma = i <= idx, ter = i === idx;
          const pod = ma ? t("karma.ziskany", { datum: zisk(l) }).trim() : l === "Bronze" ? t("karma.bronzTvoj") : i === idx + 1 ? t("karma.dalsiStupen") : t("karma.cakaTa");
          const obsah = (<>
            <span aria-hidden="true" style={{ width: 48, height: 56, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", ...(ma ? { lineHeight: 0 } : { ...NAHLAD, opacity: 0.5 }) }}><StitObr level={l} oblast={o} h={56} lazy /></span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800, color: ma ? "var(--ink)" : "var(--ink3)" }}>{nazovStitu(l, t)}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 1 }}>{pod}</span></span>
            {ter && <span style={{ flex: "none", padding: "3px 9px", borderRadius: 9, fontSize: 11.5, fontWeight: 800, background: "var(--gSoft)", color: "var(--gInk)", border: "1px solid var(--gBd)" }}>{t("karma.teraz")}</span>}
          </>);
          const st = { display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderRadius: 16, background: ter ? "var(--gSoft)" : ma ? "var(--card)" : "var(--field)", border: `1.5px solid ${ter ? "var(--gBd)" : "var(--cardBd)"}`, color: "var(--ink)" } as const;
          return ma
            ? <button key={l} type="button" onClick={() => naZoom(l)} aria-label={t("stit.zvacsit", { label: t("stit.nazovOblast", { uroven: nazovStitu(l, t), oblast: o }) })} style={{ ...st, width: "100%", textAlign: "left", fontFamily: "inherit", cursor: "zoom-in", boxShadow: "none" }}>{obsah}</button>
            : <div key={l} style={st}>{obsah}</div>;
        })}
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", marginTop: 2 }}>{t("karma.skutkyOblast")}</div>
      <div style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>
        {skutky.length === 0 && <div style={{ minHeight: 52, display: "flex", alignItems: "center", fontSize: 14, color: "var(--ink3)" }}>{t("karma.ziadnySkutok")}</div>}
        {skutky.map((k, i) => (
          <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.nazov}</span>
            <span style={{ flex: "none", fontSize: 12, color: "var(--ink4, var(--ink3))" }}>{dat(k.datum)}</span>
          </div>))}
        {skutky.length > 0 && naSkutky && <button type="button" onClick={naSkutky} style={{ width: "100%", minHeight: 48, border: "none", borderTop: "1px solid var(--cardBd)", background: "none", boxShadow: "none", textAlign: "left", fontSize: 14, fontWeight: 800, color: "var(--green)", fontFamily: "inherit", cursor: "pointer" }}>{t("karma.vsetkySkutky", { o })}</button>}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>{t("karma.dalsiStupenInfo")}</div>
    </Harok>
  );
}

/** poradie vyvesených štítov — ťahaním (myš aj prst), klávesnicou šípkami. OPRAVY 69: cieľ podľa skutočných pozícií + živý náhľad */
function PoradieVyvesenych({ vy, moje }: { vy: Oblast[]; moje: Map<Oblast, StitLevel> }) {
  const [tah, setTah] = useState<{ o: Oblast; from: number; to: number; x0: number; dx: number; rects: DOMRect[] } | null>(null);
  const el = useRef<(HTMLDivElement | null)[]>([]);
  const t = useT();
  const SIRKA = 60;
  const presun = (o: Oblast, kam: number) => { const bez = vy.filter((x) => x !== o); const k = Math.max(0, Math.min(bez.length, kam)); zoradVyvesene([...bez.slice(0, k), o, ...bez.slice(k)]); };
  const pohyb = (e: React.PointerEvent) => {
    if (!tah) return;
    const dx = e.clientX - tah.x0, r = tah.rects[tah.from], mid = r.left + r.width / 2 + dx;
    let to = 0; tah.rects.forEach((q, k) => { if (k !== tah.from && q.left + q.width / 2 < mid) to++; });
    setTah({ ...tah, dx, to });
  };
  const koniec = () => { if (tah && tah.to !== tah.from) { presun(tah.o, tah.to); navigator.vibrate?.(8); } setTah(null); };
  const posun = (k: number) => {
    if (!tah || k === tah.from) return 0;
    const w = tah.rects[tah.from].width;
    if (tah.from < tah.to && k > tah.from && k <= tah.to) return -w;
    if (tah.from > tah.to && k >= tah.to && k < tah.from) return w;
    return 0;
  };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...lbl, paddingBottom: 6 }} id="poradie-nadpis">{t("karma.poradie")}</div>
      <div role="list" aria-labelledby="poradie-nadpis" style={{ display: "flex", gap: 0, padding: "10px 8px", borderRadius: 16, background: "var(--field)", border: "1px dashed var(--d-cardBd, var(--cardBd))", touchAction: "pan-y" }}>
        {vy.map((o, k) => { const lv = moje.get(o); const ta = tah?.o === o; return (
          <div key={o} ref={(x) => { el.current[k] = x; }} role="listitem" tabIndex={0} aria-label={t("karma.poradieAria", { o, n: k + 1 })}
            onKeyDown={(e) => { if (e.key === "ArrowLeft") { e.preventDefault(); presun(o, k - 1); } if (e.key === "ArrowRight") { e.preventDefault(); presun(o, k + 1); } }}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setTah({ o, from: k, to: k, x0: e.clientX, dx: 0, rects: el.current.slice(0, vy.length).map((r) => r!.getBoundingClientRect()) }); }}
            onPointerMove={pohyb} onPointerUp={koniec} onPointerCancel={() => setTah(null)}
            style={{ width: SIRKA, minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: ta ? "grabbing" : "grab", transform: ta ? `translateX(${tah!.dx}px) scale(1.08)` : `translateX(${posun(k)}px)`, transition: ta ? "none" : "transform .18s ease", zIndex: ta ? 2 : 1, position: "relative", touchAction: "none", userSelect: "none" }}>
            {lv && <StitObr level={lv} oblast={o} h={44} tien />}
            <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--ink2)" }}>{o}</span>
          </div>); })}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 6, padding: "0 2px" }}>{t("karma.poradieInfo")}</div>
    </div>
  );
}
