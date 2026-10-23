// ============================================================
// 0158 · Prístupové kódy testovacej verzie — len tím DEED (Viac → TÍM DEED → Prístupové kódy).
// Vytvoriť kód (test / pilot, komu) · zoznam kódov: komu, druh, použitý kým · oprava omylu: prepnúť stránke test ⇄ pilot.
// Druh z kódu nevidno, pozná ho len server a tento zoznam.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { nacitajKody, vytvorKod, nastavRezim, type KodRiadok, type RezimStranky } from "@/lib/pristupoveKody";

const DRUH_T: Record<RezimStranky, string> = { test: "TEST", pilot: "PILOT" };
const datum = (iso: string) => new Date(iso).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
const tl = { minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)" } as const;

function Cip({ druh }: { druh: RezimStranky }) {
  const p = druh === "pilot";
  return <span style={{ flex: "none", padding: "3px 9px", borderRadius: 9, fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em",
    background: p ? "var(--gSoft)" : "var(--goldBg)", border: `1px solid ${p ? "var(--gBd)" : "var(--goldBd)"}`, color: p ? "var(--gInk)" : "var(--gold)" }}>{DRUH_T[druh]}</span>;
}

export function PristupoveKody({ onZavri }: { onZavri: () => void }) {
  const [riadky, setRiadky] = useState<KodRiadok[] | null>(null);
  const [chyba, setChyba] = useState("");
  const [druh, setDruh] = useState<RezimStranky>("test");
  const [komu, setKomu] = useState("");
  const [busy, setBusy] = useState(false);
  const [novy, setNovy] = useState<{ kod: string; druh: RezimStranky; komu: string } | null>(null);
  const [skop, setSkop] = useState(false);

  const nacitaj = useCallback(() => {
    nacitajKody().then((r) => { setRiadky(r); setChyba(""); }, (e: unknown) => setChyba(e instanceof Error ? e.message : "Zoznam sa nepodarilo načítať."));
  }, []);
  useEffect(() => { nacitaj(); }, [nacitaj]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);

  const vytvor = async () => {
    if (busy) return;
    setBusy(true); setChyba(""); setSkop(false);
    try { const kod = await vytvorKod(druh, komu); setNovy({ kod, druh, komu: komu.trim() }); setKomu(""); nacitaj(); }
    catch (e) { setChyba(e instanceof Error ? e.message : "Kód sa nepodarilo vytvoriť."); }
    finally { setBusy(false); }
  };
  const kopiruj = (kod: string) => { void navigator.clipboard?.writeText(kod).then(() => setSkop(novy?.kod === kod), () => undefined); };
  const prepni = async (r: KodRiadok) => {
    if (!r.stranka || !r.rezim || busy) return;
    setBusy(true); setChyba("");
    try { await nastavRezim(r.stranka, r.rezim === "pilot" ? "test" : "pilot"); nacitaj(); }
    catch (e) { setChyba(e instanceof Error ? e.message : "Nepodarilo sa."); }
    finally { setBusy(false); }
  };

  return createPortal(
    <div className="sc-tokeny" role="dialog" aria-modal="true" aria-label="Prístupové kódy" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "calc(10px + env(safe-area-inset-top, 0px)) 16px 10px", borderBottom: "1px solid var(--cardBd)" }}>
        <button type="button" onClick={onZavri} style={tl}>‹ Späť</button>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 18 }}>Prístupové kódy</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>len pre tím DEED · platia do ostrého štartu</span></span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "14px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
          <section style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <b style={{ fontSize: 16 }}>Nový kód</b>
            <div role="radiogroup" aria-label="Druh kódu" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)", alignSelf: "flex-start" }}>
              {(["test", "pilot"] as RezimStranky[]).map((d) => { const on = druh === d; return (
                <button key={d} type="button" role="radio" aria-checked={on} onClick={() => setDruh(d)} style={{ minHeight: 44, padding: "0 16px", border: "none", borderRadius: 9, background: on ? "var(--green)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: on ? "#fff" : "var(--ink3)" }}>{d === "test" ? "Test" : "Pilot"}</button>); })}
            </div>
            <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{druh === "test" ? "Po teste sa stránka zmaže celá." : "Po teste ostane vzhľad stránky, profil, texty, fotky, nástenka a príspevky. Zbierky, platby a reťaze sa zmažú."}</span>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>Komu (len pre vás)</span>
              <input value={komu} onChange={(e) => setKomu(e.target.value.slice(0, 120))} placeholder="napríklad Evanjelický farár, Trenčín" autoComplete="off"
                style={{ minHeight: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontSize: 16, fontFamily: "inherit", color: "var(--ink)" }} />
            </label>
            <button type="button" onClick={() => { void vytvor(); }} disabled={busy} style={{ minHeight: 50, border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", cursor: busy ? "default" : "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, opacity: busy ? 0.6 : 1 }}>Vytvoriť kód</button>
            {novy && <div style={{ borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--gBd)", padding: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Cip druh={novy.druh} /><span style={{ fontSize: 13, color: "var(--ink3)" }}>{novy.komu || "bez mena"}</span></span>
                <b style={{ fontSize: 26, letterSpacing: ".08em", fontVariantNumeric: "tabular-nums" }}>{novy.kod}</b>
              </span>
              <button type="button" onClick={() => kopiruj(novy.kod)} style={tl}>{skop ? "Skopírované ✓" : "Kopírovať"}</button>
            </div>}
          </section>
          {chyba && <span role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--goldBg)", border: "1.5px solid var(--goldBd)", fontSize: 14.5, fontWeight: 800 }}>{chyba}</span>}
          {!riadky && !chyba && <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Načítavam…</span>}
          {riadky && !riadky.length && <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Zatiaľ žiadne kódy.</span>}
          {riadky && riadky.length > 0 && <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <b style={{ fontSize: 16, padding: "4px 2px 0" }}>Vydané kódy · {riadky.length}</b>
            {riadky.map((r) => (
              <div key={r.kod} style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ fontSize: 16, letterSpacing: ".06em", fontVariantNumeric: "tabular-nums" }}>{r.kod}</b><Cip druh={r.druh} />
                    {r.rezim && r.rezim !== r.druh && <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink2)" }}>→ stránka teraz <Cip druh={r.rezim} /></span>}
                  </span>
                  <span style={{ fontSize: 13.5, color: "var(--ink2)", overflowWrap: "anywhere" }}>{r.komu || "bez mena"} · vytvorený {datum(r.vytvoreny)}</span>
                  <span style={{ fontSize: 13.5, color: "var(--ink3)", overflowWrap: "anywhere" }}>{r.pouzity ? `použitý ${datum(r.pouzity)} · ${r.nazov ?? "stránka zmazaná"}` : "nepoužitý"}</span>
                </span>
                {r.stranka && r.rezim && <button type="button" onClick={() => { void prepni(r); }} disabled={busy} style={{ ...tl, opacity: busy ? 0.6 : 1 }}>{r.rezim === "pilot" ? "Zmeniť na test" : "Zmeniť na pilot"}</button>}
                {!r.pouzity && <button type="button" onClick={() => kopiruj(r.kod)} style={tl}>Kopírovať</button>}
              </div>))}
          </section>}
        </div>
      </div>
    </div>, document.body);
}
