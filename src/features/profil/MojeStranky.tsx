// OPRAVY 75 · Moje stránky (nad štítom), Konáš ako, Režim prezentácie, DEV simulácia (len testovacia verzia).
// Nahrádza „Môj DEED+ firemný" v module Charita. Horná lišta dostane v strede 2 tlačidlá (KonasAkoLista).
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/toast";
import { useLayout } from "@/components/context";
import { usePouzivatel } from "@/lib/pouzivatel";
import { UKAZKOVE_STRANKY, useMojeStranky, nastavAko, prepniPrezentaciu, TESTOVACIA, type Stranka } from "@/lib/mojeStranky";
import { DevSimulacia } from "@/features/rola/MojDeedFiremny";
import "@/styles/platba.css";

const IK_PREZ = "M3 4h18v12H3zM8 20h8M12 16v4";
const Ik = ({ d, s = 16, w = 2 }: { d: string; s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

/** stránky prihláseného usera (ukážka: demo účet; tvorca = jeho vlastné meno) */
export function useStranky(): Stranka[] {
  const ja = usePouzivatel();
  if (!ja.demo) return [];
  const ini = `${(ja.meno || "?")[0]}${(ja.priezvisko || "")[0] ?? ""}`.toUpperCase();
  return UKAZKOVE_STRANKY.map((s) => (s.typ === "tvorca" ? { ...s, n: ja.celeMeno || s.n, i: ini } : s));
}

/** modrý pás režimu prezentácie */
export function PasPrezentacie() {
  const { prezentacia } = useMojeStranky();
  if (!prezentacia) return null;
  return (
    <div role="status" className="deed-platba" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 10px 14px", borderRadius: 14, background: "var(--blue)", color: "#fff" }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>Režim prezentácie · vidíš profil ako bežný user. Role, správa stránok a DEV sú skryté.</span>
      <button type="button" onClick={prepniPrezentaciu} style={{ flex: "none", minHeight: 40, padding: "0 12px", borderRadius: 11, border: "none", boxShadow: "none", background: "#fff", color: "var(--blue)", fontSize: 13.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>Ukončiť</button>
    </div>
  );
}

/** Moje stránky + Konáš ako + DEV (v režime prezentácie sa nekreslí) */
export function MojeStranky({ naSpravovat }: { naSpravovat: (s: Stranka) => void }) {
  const st = useMojeStranky();
  const stranky = useStranky();
  if (st.prezentacia) return <PasPrezentacie />;
  if (!stranky.length) return (
    <button type="button" onClick={() => toast("Pridanie stránky príde s registráciou charity, firmy a tvorcu")} className="deed-platba"
      style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "10px 14px", borderRadius: 16, border: "1px dashed var(--cardBd)", background: "transparent", boxShadow: "none", color: "var(--ink2)", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
      <span style={{ flex: 1 }}>Spravuješ charitu, firmu alebo tvoríš? Pridaj stránku</span><span aria-hidden="true" style={{ color: "var(--green)", fontWeight: 800 }}>+</span>
    </button>);
  const cur = stranky.find((s) => s.k === st.ako);
  return (
    <div className="deed-platba" style={{ display: "flex", flexDirection: "column", gap: 12, color: "var(--ink)" }}>
      <section aria-label="Moje stránky" style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Moje stránky</h2><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>stránky, ktoré spravuješ</span></div>
        {stranky.map((p) => (
          <button key={p.k} type="button" onClick={() => naSpravovat(p)} aria-label={`${p.n}, ${p.typ}, ${p.rola}. Spravovať`}
            style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--field)", boxShadow: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: p.bg, color: p.c, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13.5, flex: "none" }}>{p.i}</span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{p.n}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{p.typ} · {p.rola}</span></span>
              <span style={{ flex: "none", fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>Spravovať ›</span>
            </span>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{p.info.map((x) => <span key={x} style={{ padding: "3px 9px", borderRadius: 9, fontSize: 12, fontWeight: 700, background: "var(--card)", border: "1px solid var(--cardBd)", color: "var(--ink2)" }}>{x}</span>)}</span>
          </button>))}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>KONÁŠ AKO</span>
          <div role="radiogroup" aria-label="Konáš ako" style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
            {[{ k: "ja", n: "Ja" }, ...stranky].map((a) => { const on = st.ako === a.k; return (
              <button key={a.k} type="button" role="radio" aria-checked={on} onClick={() => nastavAko(a.k)} className={on ? "seg-on" : undefined}
                style={{ flex: "1 1 auto", minHeight: 40, padding: "0 10px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", ...(on ? {} : { background: "transparent", color: "var(--ink3)", boxShadow: "none" }) }}>{a.n}</button>); })}
          </div>
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>{cur ? `Dary, príspevky a skutky pôjdu pod menom ${cur.n}. Hore v lište to uvidíš vždy.` : "Daruješ, píšeš a pridávaš skutky osobne, pod svojím menom."}</span>
          <button type="button" onClick={() => toast("Pridanie stránky príde s registráciou charity, firmy a tvorcu")} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px dashed var(--gBd)", background: "transparent", boxShadow: "none", color: "var(--green)", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>+ Pridať stránku</button>
        </div>
      </section>
      {TESTOVACIA && <DevSimulacia />}
    </div>
  );
}

/** stred hornej lišty: [Prezentácia] + [Ja · osobne ▾] (tablet/PC), na mobile jedno tlačidlo s menu. Appkové menu sa nemení. */
export function KonasAkoLista() {
  const { desktop, wide } = useLayout();
  const st = useMojeStranky();
  const stranky = useStranky();
  const ja = usePouzivatel();
  const [otv, setOtv] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!otv) return;
    const k = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOtv(false); };
    window.addEventListener("mousedown", k); window.addEventListener("keydown", k);
    return () => { window.removeEventListener("mousedown", k); window.removeEventListener("keydown", k); };
  }, [otv]);
  if (!stranky.length) return null;
  const velke = desktop || wide;
  const cur = st.prezentacia ? undefined : stranky.find((s) => s.k === st.ako);
  const ini = `${(ja.meno || "?")[0]}${(ja.priezvisko || "")[0] ?? ""}`.toUpperCase();
  const tText = st.prezentacia ? "Prezentácia" : cur ? `ako ${cur.n}` : "Ja · osobne";
  const tIni = st.prezentacia ? "P" : cur ? cur.i : ini;
  const tBg = st.prezentacia ? "var(--bSoft)" : cur ? cur.bg : "var(--card)", tC = st.prezentacia ? "var(--blue)" : cur ? cur.c : "var(--ink)";
  const zoznam = [{ k: "ja", i: ini, n: "Ja · osobne", s: ja.celeMeno, bg: "var(--gSoft)", c: "var(--gInk)" }, ...stranky.map((p) => ({ k: p.k, i: p.i, n: p.n, s: `${p.typ} · ${p.rola}`, bg: p.bg, c: p.c }))];
  return (
    <div ref={ref} className="deed-platba" style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, color: "var(--ink)" }}>
      {velke && (
        <button type="button" onClick={prepniPrezentaciu} aria-pressed={st.prezentacia}
          style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 40, padding: "0 12px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, boxShadow: "none", background: st.prezentacia ? "var(--blue)" : "var(--card)", border: `1px solid ${st.prezentacia ? "var(--blue)" : "var(--cardBd)"}`, color: st.prezentacia ? "#fff" : "var(--ink2)" }}>
          <Ik d={IK_PREZ} />{st.prezentacia ? "Ukončiť prezentáciu" : "Prezentácia"}</button>)}
      <button type="button" onClick={() => setOtv(!otv)} aria-haspopup="menu" aria-expanded={otv} aria-label={`Konáš ako: ${tText}`}
        style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 40, maxWidth: velke ? 240 : 150, padding: "0 10px 0 4px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, boxShadow: "none", background: tBg, border: "1px solid var(--cardBd)", color: tC }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--field)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 800, flex: "none" }}>{tIni}</span>
        {velke && <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tText}</span>}
        <Ik d="M6 9l6 6 6-6" s={14} w={2.6} /></button>
      {otv && (
        <div role="menu" style={{ position: "absolute", top: "calc(100% + 8px)", right: velke ? 0 : "auto", left: velke ? "auto" : "50%", transform: velke ? "none" : "translateX(-50%)", zIndex: 60, width: 280, padding: 8, borderRadius: 18, background: "var(--sheet, var(--card))", border: "1px solid var(--cardBd)", boxShadow: "0 16px 40px rgba(0,0,0,.2)" }}>
          <div style={{ padding: "6px 8px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>KONÁŠ AKO</div>
          {zoznam.map((o) => { const on = !st.prezentacia && st.ako === o.k; return (
            <button key={o.k} type="button" role="menuitemradio" aria-checked={on} onClick={() => { nastavAko(o.k); setOtv(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 50, padding: "6px 8px", borderRadius: 12, border: "none", boxShadow: "none", background: on ? "var(--gSoft)" : "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: o.bg, color: o.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flex: "none" }}>{o.i}</span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{o.n}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>{o.s}</span></span>
            </button>); })}
          <div style={{ height: 1, background: "var(--cardBd)", margin: "6px 4px" }} />
          <button type="button" role="menuitem" onClick={() => { prepniPrezentaciu(); setOtv(false); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 50, padding: "6px 8px", borderRadius: 12, border: "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--bSoft)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK_PREZ} s={17} /></span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{st.prezentacia ? "Ukončiť prezentáciu" : "Režim prezentácie"}</span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>skryje role, správu a DEV · vidíš sa ako bežný user</span></span>
          </button>
        </div>)}
    </div>
  );
}
