// ============================================================
// DEED · Verejná podstránka tvorcu (po skene QR) — §5.3
// VŽDY PRÁVE JEDNA aktívna zbierka: názov, progres, „tvorca dáva X %".
// Pod ňou HISTÓRIA (naplnené — nemenný záznam). V momente naplnenia sa
// stránka ŽIVO prehodí na ďalšiu vo fronte („Cieľ naplnený! Teraz: B").
// Darca vždy vidí, komu presne jeho dar ide — aj tesne po prepnutí (§6.6).
// ============================================================
import { useState } from "react";
import { C, GRAD, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { Sheet, PlatbaModal, IkonaFajka } from "@/shared";
import { aktivnaPolozka, jeNaplnena, smerujDar, type CreatorChain } from "./fronta";
import { mockPublishedChain, FALLBACK_KANDIDATI } from "./mock";

const GREEN = "var(--a-green)";
const datumSk = (iso?: string) => { if (!iso) return ""; try { return new Date(iso).toLocaleDateString("sk", { day: "numeric", month: "short" }); } catch { return ""; } };

export function RetazPodstranka({ chain: chainProp, tvorca = "Tvorca", onClose, toast }: {
  chain?: CreatorChain; tvorca?: string; onClose?: () => void; toast?: (m: string) => void;
}) {
  const [chain, setChain] = useState<CreatorChain>(() => chainProp ?? mockPublishedChain());
  const [platba, setPlatba] = useState<string | null>(null);
  const [prave, setPrave] = useState<{ nazov: string } | null>(null); // „práve naplnené" flash

  const aktiv = aktivnaPolozka(chain);
  const historia = [...chain.queue].filter((it) => it.status === "filled").sort((a, b) => (a.filledAt || "").localeCompare(b.filledAt || ""));

  // dar → routing (dorovnanie + prehod aktívnej). Darca vždy vidí komu ide.
  const posli = (suma: number) => {
    const r = smerujDar(chain, suma, { fallbackKandidati: FALLBACK_KANDIDATI });
    setChain(r.chain);
    const zavrete = r.rozdelenia.filter((x) => x.naplnila);
    if (zavrete.length) {
      setPrave({ nazov: zavrete[zavrete.length - 1].nazov });
      toast?.(`Ďakujeme! Cieľ naplnený${r.prehodenaNa ? ` → teraz podporujeme: ${r.prehodenaNa.nazov}` : ""}`);
    } else {
      toast?.(`Ďakujeme! ${r.retazoPodiel} z tvojho daru ide → ${aktiv?.nazov ?? "zbierka"}`);
    }
  };

  return (
    <>
      <Sheet onClose={onClose} label="Verejná podstránka tvorcu">
        {/* hlavička tvorcu */}
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.gutter }}>
          <span style={{ width: 40, height: 40, borderRadius: RADIUS.round, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: GRAD, color: "#fff", fontSize: 18, fontWeight: 800 }}>🎬</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{tvorca}</div>
            <div style={{ fontSize: 11.5, color: C.textTer }}>Reťaz dobra · % z honoráru ide zbierke</div>
          </div>
          <span style={{ marginLeft: "auto", flex: "none", fontSize: 10, fontWeight: 800, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, background: tint(GREEN, .16), color: GREEN }}>✓ OVERENÝ QR</span>
        </div>

        {/* práve naplnené — živý prehod */}
        {prave && (
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: tint(GREEN, .1), border: `1px solid ${tint(GREEN, .4)}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm }}>
            <IkonaFajka size={18} color={GREEN} />
            <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.4 }}>Cieľ naplnený: {prave.nazov}!{aktiv ? <><br /><span style={{ color: C.textSec, fontWeight: 600 }}>Teraz podporujeme ďalšiu vo fronte.</span></> : ""}</div>
          </div>
        )}

        {/* AKTÍVNA zbierka — vždy práve jedna */}
        {aktiv ? (() => {
          const pct = Math.min(100, Math.round((aktiv.vyzbierane / aktiv.ciel) * 100));
          return (
            <div style={{ background: tint(GREEN, .06), border: `1px solid ${tint(GREEN, .3)}`, borderRadius: RADIUS.lg, padding: SPACE.gutter }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: GREEN, fontWeight: 800, marginBottom: SPACE.xs }}>▸ TERAZ PODPORUJEŠ</div>
              <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
                <span style={{ width: 44, height: 44, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: tint(aktiv.col || GREEN, .15) }}>{aktiv.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800, lineHeight: 1.25 }}>{aktiv.nazov}</div>
                  <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 1 }}>{aktiv.zdroj} · {aktiv.lok}</div>
                </div>
              </div>

              {/* tvorca dáva X % */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: SPACE.xs, marginTop: SPACE.sm, background: GRAD_ZELENY, color: "#fff", borderRadius: 999, padding: `${SPACE.xxs}px ${SPACE.gutter}px`, fontSize: 12.5, fontWeight: 800 }}>
                🎬 {tvorca} dáva {aktiv.percent}% z honoráru
              </div>

              {/* progress */}
              <div style={{ height: 10, borderRadius: 999, background: "rgba(var(--glass-rgb),.12)", overflow: "hidden", marginTop: SPACE.sm }}>
                <div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 999, transition: "width .5s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: SPACE.xxs }}>
                <span style={{ fontWeight: 800, color: GREEN }}>{aktiv.vyzbierane.toLocaleString("sk")}</span>
                <span style={{ color: C.textTer }}>z {aktiv.ciel.toLocaleString("sk")} ({pct}%)</span>
              </div>

              {/* prispieť */}
              <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.gutter }}>
                {[50, 100, 400].map((s) => (
                  <button key={s} onClick={() => posli(s)} style={{ flex: 1, height: 46, borderRadius: RADIUS.sm, border: "none", background: GRAD_ZELENY, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
                ))}
                <button onClick={() => setPlatba("EUR")} style={{ flex: "none", width: 52, height: 46, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>€</button>
              </div>
              <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xs, textAlign: "center", lineHeight: 1.4 }}>
                Dar smeruje na túto <b>jednu</b> zbierku. Ak sa cieľ naplní, zvyšok tvojho podielu tečie ďalšej vo fronte — nič neostane v prázdne.
              </div>
            </div>
          );
        })() : (
          <div style={{ textAlign: "center", padding: `${SPACE.lg}px ${SPACE.md}px`, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: RADIUS.lg }}>
            <div style={{ fontSize: 28 }}>🎉</div>
            <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: SPACE.xs }}>Celá reťaz naplnená!</div>
            <div style={{ fontSize: 12, color: C.textTer, marginTop: SPACE.xxs, lineHeight: 1.5 }}>Všetky zbierky tvorcu dosiahli cieľ. Ďalšie dary systém doparuje overenej zbierke alebo do community poolu.</div>
          </div>
        )}

        {/* HISTÓRIA — naplnené (nemenný záznam) */}
        {historia.length > 0 && (
          <>
            <div style={{ fontSize: 11, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.gutter}px 0 ${SPACE.xs}px` }}>HISTÓRIA — NAPLNENÉ (NEMENNÝ ZÁZNAM)</div>
            {historia.map((it) => (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.gutter}px`, marginBottom: SPACE.xs }}>
                <IkonaFajka size={15} color={GREEN} />
                <span style={{ fontSize: 18, flex: "none" }}>{it.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.nazov}</div>
                  <div style={{ fontSize: 10.5, color: C.textTer }}>{it.percent}% z honoráru · {it.ciel.toLocaleString("sk")}{it.filledAt ? ` · ${datumSk(it.filledAt)}` : ""}</div>
                </div>
                <span style={{ flex: "none", fontSize: 10.5, fontWeight: 800, color: GREEN }}>✓ naplnené</span>
              </div>
            ))}
          </>
        )}
      </Sheet>

      {platba && <PlatbaModal kanal={platba} komu={aktiv?.nazov || "aktívna zbierka"} onClose={() => setPlatba(null)} onDone={(s: number) => posli(s)} />}
    </>
  );
}
