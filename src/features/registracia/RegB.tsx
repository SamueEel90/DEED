// KARTA 44 · stavebnice registrácie 1b (osoba aj charita) — 1 : 1 podľa prototypu „Registracia - navrhy.dc.html", stĺpec 1b.
// Obrazovka = hlava (Späť + kapitoly) · obsah (vstup .35 s) · päta (zelené tlačidlo 58 px + druhá voľba 44 px).
// Svetlúšik: veľký so žiarou (Vitaj, Hotovo s radosťou a iskrami) alebo bublina (najviac 3 na registráciu).
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { USE_SUPABASE } from "@/lib/supabase";
import "@/styles/platba.css";
import "@/styles/registracia.css";

/** server len so Supabase; v mock režime krátke čakanie, nech tok vyzerá rovnako */
export const naServeri = USE_SUPABASE;
export const pockaj = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const vibruj = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* iOS */ } };
export const U = (id: string) => `url('https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70') center/cover no-repeat #8a8170`;

export const IK = {
  osoba: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  org: "M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 10h1M15 10h1",
  doklad: "M3 6h18v12H3zM7 10h4M7 14h6M15 10h2v4h-2z",
  tvar: "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3",
  subor: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h4",
  karta: "M3 6h18v12H3zM3 10h18",
  karta2: "M3 6h18v12H3zM3 10h18M7 15h4",
};
const fajka = (c: string, w = 18, s = 2.6) => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>;
const zamok = (c: string, w: number, s: number) => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

export type Kapitola = { t: string; podiel: number; teraz: boolean };
/** kapitoly hore: hotové = plný pruh, aktuálna = (hotové kroky + ½) / počet */
export function kapitoly(def: [string, string[]][], krok: string): Kapitola[] {
  const vsetky = def.flatMap(([, k]) => k);
  const i = vsetky.indexOf(krok);
  return def.map(([t, k]) => {
    const idx = k.map((x) => vsetky.indexOf(x));
    const hotove = i < 0 ? idx.length : idx.filter((x) => x < i).length, teraz = idx.includes(i);
    return { t, podiel: teraz ? (hotove + 0.5) / idx.length : hotove / idx.length, teraz };
  });
}

/** celá obrazovka registrácie */
export function Obrazovka({ kluc, spat, kap, cta, onCta, ctaOff, ctaBusy, alt, onAlt, children }: {
  kluc: string; spat?: () => void; kap?: Kapitola[] | null;
  cta: string; onCta: () => void; ctaOff?: boolean; ctaBusy?: boolean; alt?: string; onAlt?: () => void; children: ReactNode;
}) {
  const scr = useRef<HTMLDivElement>(null);
  useEffect(() => { scr.current?.scrollTo(0, 0); }, [kluc]);
  const hlava = !!spat;
  const off = ctaOff || ctaBusy;
  return (
    <div className="deed-platba deed-reg" style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--ink)" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", width: "100%", maxWidth: 480, margin: "0 auto" }}>
        {hlava && (
          <div style={{ flex: "none", padding: "max(10px, env(safe-area-inset-top)) 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={spat} aria-label="Späť" style={{ flex: "none", width: 44, height: 44, border: "none", borderRadius: 22, background: "var(--card)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>
            {kap && (
              <div style={{ flex: 1, display: "flex", gap: 6 }} aria-label={`Kapitola ${kap.find((k) => k.teraz)?.t ?? ""}`}>
                {kap.map((k) => (
                  <span key={k.t} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ display: "block", height: 5, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${k.podiel})`, transition: "transform .35s ease" }} /></span>
                    <span style={{ fontSize: 11.5, fontWeight: k.teraz ? 800 : 600, color: k.teraz ? "var(--ink)" : "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.t}</span>
                  </span>))}
              </div>)}
          </div>)}
        <div ref={scr} style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
          <div key={kluc} className="rg-vstup" style={{ padding: hlava ? "6px 22px 24px" : "max(16px, env(safe-area-inset-top)) 22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
        </div>
        <div style={{ flex: "none", padding: "12px 22px max(26px, env(safe-area-inset-bottom))", background: "var(--bg)", borderTop: `1px solid ${hlava ? "var(--cardBd)" : "transparent"}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <button type="button" onClick={onCta} disabled={off} aria-busy={ctaBusy || undefined}
            style={{ height: 58, border: "none", borderRadius: 18, background: "var(--gGrad)", cursor: off ? "not-allowed" : "pointer", fontSize: 17, fontWeight: 800, color: "#fff", boxShadow: off ? "none" : "0 10px 24px rgba(75,122,53,.28)", opacity: ctaOff && !ctaBusy ? 0.45 : 1, transition: "opacity .2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit" }}>
            {ctaBusy && <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 9, border: "2.5px solid rgba(255,255,255,.4)", borderTopColor: "#fff", animation: "rgToc .8s linear infinite" }} />}{cta}</button>
          {alt && <button type="button" onClick={onAlt} style={{ height: 44, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, color: "var(--ink2)", fontFamily: "inherit" }}>{alt}</button>}
        </div>
      </div>
    </div>
  );
}

export function Nadpis({ t, sub, kicker, velky, stred }: { t: ReactNode; sub?: ReactNode; kicker?: string; velky?: boolean; stred?: boolean }) {
  return (<>
    {kicker && <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--green)" }}>{kicker}</span>}
    <span style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: stred ? "center" : "left" }}>
      <b role="heading" aria-level={1} style={{ fontSize: velky ? 30 : 26, lineHeight: 1.15, letterSpacing: "-.01em", textWrap: "balance" } as CSSProperties}>{t}</b>
      {sub && <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)", textWrap: "pretty" } as CSSProperties}>{sub}</span>}
    </span>
  </>);
}

/** veľký Svetlúšik so žiarou · radost = skáče a lietajú iskry */
export function Svetlo({ vyska, radost }: { vyska: number; radost?: boolean }) {
  const iskry: [number, number, string][] = [[-70, -40, "0s"], [70, -50, ".3s"], [-90, 20, ".6s"], [90, 10, ".9s"], [-40, 60, "1.2s"], [50, 55, "1.5s"]];
  return (
    <div aria-hidden="true" style={{ position: "relative", height: vyska, margin: "0 -22px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ position: "absolute", left: "50%", top: "50%", width: 240, height: 240, margin: "-120px 0 0 -120px", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,231,163,.75) 0%,rgba(246,183,60,.28) 38%,rgba(246,183,60,0) 70%)", animation: "rgGlow 3.2s ease-in-out infinite" }} />
      {radost && iskry.map(([x, y, d], i) => <span key={i} style={{ position: "absolute", left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, width: 16, height: 16, borderRadius: "50%", background: "radial-gradient(circle,#FFE7A3,rgba(246,183,60,0) 70%)", animation: `rgSpark 1.8s ease-out ${d} infinite both` }} />)}
      <span style={{ position: "relative", width: 92, height: 92, overflow: "hidden", animation: radost ? "rgJoy 2.6s cubic-bezier(.3,0,.3,1) infinite" : "rgHover 4.5s ease-in-out infinite" }}>
        <span className="rg-sprite" style={{ position: "absolute", left: 0, top: 0, width: 920, height: 92, background: "url('/svetlusik-let.png') 0 0/100% 100% no-repeat" }} />
      </span>
    </div>
  );
}

/** bublina Svetlúšika (sprievodca, najviac 3 na registráciu) */
export function Bublina({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", animation: "rgBub .45s cubic-bezier(.2,.8,.2,1) .35s both" }}>
      <span aria-hidden="true" style={{ position: "relative", flex: "none", width: 52, height: 52, marginBottom: -4, animation: "rgHover 3.6s ease-in-out infinite" }}>
        <span style={{ position: "absolute", left: -14, top: -14, width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,231,163,.8) 0%,rgba(246,183,60,0) 65%)" }} />
        <span style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <span className="rg-sprite" style={{ position: "absolute", left: 0, top: 0, width: 520, height: 52, background: "url('/svetlusik-let.png') 0 0/100% 100% no-repeat" }} /></span>
      </span>
      <div style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: "18px 18px 18px 6px", background: "var(--field)", border: "1px solid var(--goldBd)", boxShadow: "0 6px 16px rgba(120,100,40,.1)", display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--gold)" }}>SVETLÚŠIK</span>
        <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink)" }}>{children}</span>
      </div>
    </div>
  );
}

/** pokojná poznámka so zámkom (napr. v platbe, kde Svetlúšik nehovorí) */
export function Poznamka({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 16, background: "var(--gSoft)" }}>
      <span style={{ flex: "none", marginTop: 1, display: "flex" }}>{zamok("var(--gInk)", 18, 2.2)}</span>
      <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink)" }}>{children}</span>
    </div>
  );
}

/** textové pole v štýle prototypu (54 px, predvoľba, fajka, nápoveda) */
export function Pole({ label, value, onChange, pred, ok, hint, chyba, ...inp }: {
  label: string; value: string; onChange: (v: string) => void; pred?: string; ok?: boolean; hint?: ReactNode; chyba?: string | null;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>{label}</span>
      <span style={{ minHeight: 54, padding: "0 16px", borderRadius: 16, background: "var(--field)", border: `1.5px solid ${chyba ? "#B8452F" : ok ? "var(--gBd)" : "var(--cardBd)"}`, display: "flex", alignItems: "center", gap: 10 }}>
        {pred && <span style={{ flex: "none", paddingRight: 10, borderRight: "1px solid var(--cardBd)", fontSize: 16.5, fontWeight: 700, color: "var(--ink)" }}>{pred}</span>}
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...inp}
          style={{ flex: 1, minWidth: 0, height: 52, border: "none", outline: "none", background: "transparent", fontSize: 16.5, fontWeight: 700, color: "var(--ink)", fontFamily: "inherit", padding: 0 }} />
        {ok && fajka("var(--green)")}
      </span>
      {chyba ? <span role="alert" style={{ fontSize: 12.5, lineHeight: 1.4, fontWeight: 700, color: "#B8452F" }}>{chyba}</span>
        : hint && <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)" }}>{hint}</span>}
    </label>
  );
}

/** šesť políčok na kód z SMS (jedno skryté pole pod nimi, autofill one-time-code) */
export function KodPolia({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ position: "relative" }} onClick={() => ref.current?.focus()}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} style={{ height: 60, borderRadius: 14, background: "var(--field)", border: `1.5px solid ${value[i] ? "var(--gBd)" : i === value.length ? "var(--green)" : "var(--cardBd)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value[i] ?? ""}</span>))}
      </div>
      <input ref={ref} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Kód z SMS"
        style={{ position: "absolute", inset: 0, opacity: 0, fontSize: 16, width: "100%", height: "100%", border: "none", cursor: "pointer" }} />
    </div>
  );
}

export type Volba = { t: string; s?: string; ik?: string; off?: boolean };
/** výberové karty s rádiom */
export function Volby({ volby, vybrane, onVyber }: { volby: Volba[]; vybrane: number; onVyber: (i: number) => void }) {
  return (
    <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {volby.map((o, j) => {
        const on = j === vybrane;
        return (
          <button key={o.t} type="button" role="radio" aria-checked={on} aria-disabled={o.off || undefined} onClick={() => { if (!o.off) { vibruj(5); onVyber(j); } }}
            style={{ minHeight: 64, padding: "12px 14px", borderRadius: 18, background: on ? "var(--field)" : "var(--card)", border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", cursor: o.off ? "default" : "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left", color: "var(--ink)", opacity: o.off ? 0.5 : 1, fontFamily: "inherit" }}>
            {o.ik && <span style={{ flex: "none", width: 44, height: 44, borderRadius: 14, background: on ? "var(--green)" : "var(--panel)", color: on ? "#fff" : "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={o.ik} /></svg></span>}
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 16 }}>{o.t}</b>
              {o.s && <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{o.s}</span>}
            </span>
            <span style={{ flex: "none", width: 24, height: 24, borderRadius: 12, border: `2px solid ${on ? "var(--green)" : "var(--ink4)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: "var(--green)", transform: `scale(${on ? 1 : 0})`, transition: "transform .2s ease" }} /></span>
          </button>);
      })}
    </div>
  );
}

/** prepínače (switch) */
export function Prepinace({ prep, stav, onPrepni }: { prep: { t: string; s?: string }[]; stav: boolean[]; onPrepni: (i: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {prep.map((o, j) => {
        const on = !!stav[j];
        return (
          <button key={o.t} type="button" role="switch" aria-checked={on} onClick={() => { vibruj(5); onPrepni(j); }}
            style={{ minHeight: 64, padding: "12px 14px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: 15.5, lineHeight: 1.3 }}>{o.t}</b>
              {o.s && <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{o.s}</span>}
            </span>
            <span style={{ flex: "none", position: "relative", width: 50, height: 30, borderRadius: 15, background: on ? "var(--green)" : "var(--track)", transition: "background .2s ease" }}>
              <span style={{ position: "absolute", left: 3, top: 3, width: 24, height: 24, borderRadius: 12, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transform: `translateX(${on ? 20 : 0}px)`, transition: "transform .2s ease" }} /></span>
          </button>);
      })}
    </div>
  );
}

/** čipy (záujmy, sektory) */
export function Cipy({ cipy, vybrane, onPrepni }: { cipy: string[]; vybrane: string[]; onPrepni: (t: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {cipy.map((t) => {
        const on = vybrane.includes(t);
        return (
          <button key={t} type="button" aria-pressed={on} onClick={() => { vibruj(5); onPrepni(t); }}
            style={{ minHeight: 44, padding: "0 16px", borderRadius: 22, background: on ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 700, color: on ? "var(--gInk)" : "var(--ink2)", fontFamily: "inherit" }}>{t}</button>);
      })}
    </div>
  );
}

/** karty overenia (doklad, selfie, stanovy) — hotovo = fajka */
export function KycKarty({ karty, hotove, onTap }: { karty: { t: string; s: string; ik: string }[]; hotove?: boolean[]; onTap?: (i: number) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {karty.map((k, i) => {
        const ok = !!hotove?.[i];
        const obsah = (<>
          <span style={{ flex: "none", width: 64, height: 64, borderRadius: 16, background: ok ? "var(--gSoft)" : "var(--panel)", border: `1.5px ${ok ? "solid var(--gBd)" : "dashed var(--ink4)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: ok ? "var(--gInk)" : "var(--ink2)" }}>
            {ok ? fajka("var(--green)", 28, 2.4) : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={k.ik} /></svg>}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <b style={{ fontSize: 16 }}>{k.t}</b>
            <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink3)", overflowWrap: "anywhere" }}>{k.s}</span>
          </span></>);
        const st: CSSProperties = { display: "flex", gap: 14, alignItems: "center", padding: 14, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" };
        return onTap ? <button key={k.t} type="button" onClick={() => onTap(i)} style={{ ...st, cursor: "pointer" }}>{obsah}</button> : <div key={k.t} style={st}>{obsah}</div>;
      })}
    </div>
  );
}

/** plán: tri kapitoly s časom */
export function PlanKapitol({ kap }: { kap: { t: string; s: string; cas: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {kap.map((k, i) => (
        <div key={k.t} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 16px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
          <span style={{ flex: "none", width: 40, height: 40, borderRadius: 20, background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>{i + 1}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16 }}>{k.t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{k.s}</span></span>
          <span style={{ flex: "none", fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>{k.cas}</span>
        </div>))}
    </div>
  );
}

/** údaje z registra (nemeniteľné, zámok) */
export function Register({ riadky }: { riadky: [string, string][] }) {
  return (
    <div style={{ borderRadius: 20, background: "var(--card)", border: "1.5px solid var(--gBd)", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", background: "var(--gSoft)", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 800, color: "var(--gInk)" }}>{fajka("currentColor", 16, 2.4)}Našli sme v registri</div>
      <div style={{ padding: "6px 16px 12px", display: "flex", flexDirection: "column" }}>
        {riadky.map(([k, v], j) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: j ? "1px solid var(--cardBd)" : "none" }}>
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>{k}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, textAlign: "right" }}>{v}{zamok("var(--ink4)", 13, 2.2)}</span>
          </div>))}
      </div>
    </div>
  );
}

/** Hotovo: čo sa odomklo */
export function Odomknute({ polozky }: { polozky: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      {polozky.map((t, j) => <span key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: j ? "1px solid var(--cardBd)" : "none", fontSize: 15, fontWeight: 600 }}>{fajka("var(--green)")}{t}</span>)}
    </div>
  );
}

/** poradové číslo člena po slovensky: 1 248 */
export const clenCislo = (n: number) => n.toLocaleString("sk-SK").replace(/\s/g, " ");
