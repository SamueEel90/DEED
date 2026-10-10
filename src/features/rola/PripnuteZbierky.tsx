// ============================================================
// OPRAVY 187 · KARTA 61 §4 — Správa farnosti → Zbierky: pripnúť zbierku iného subjektu (prototyp Pripnute zbierky.dc.html).
// Výber: hľadanie vo všetkých zverejnených zbierkach DEED (Všetky · Charita · Help) → Pripnúť.
// Zoznam „Pripnuté zbierky iných“: cez vašu stránku X € · spolu Y €, len Podržte · odopnúť.
// ============================================================
import { useEffect, useState } from "react";
import { hladajZbierky, pripni, odopni, usePripnute, useCezStranku, type ZbierkaNaPripnutie } from "@/lib/pripnuteZbierky";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";

const eur = (n: number) => `${Math.round(n).toLocaleString("sk-SK")} €`;
const bez = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const chipPripnutej = (z: Pick<ZbierkaNaPripnutie, "zdroj" | "kto" | "ukazkova">) => (z.ukazkova ? "UKÁŽKA · " : "") + (z.zdroj === "charita" ? `ZBIERKA CHARITY · ${z.kto.toUpperCase()}` : `HELP · ${z.kto.toUpperCase()}`);
export const farbaPripnutej = (z: Pick<ZbierkaNaPripnutie, "zdroj">) => (z.zdroj === "charita" ? "#2F7A78" : "#8A6A1F");

const chipSt = (c: string): React.CSSProperties => ({ alignSelf: "flex-start", maxWidth: "100%", padding: "3px 9px", borderRadius: 8, background: c, color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });

/** výber zbierky na pripnutie (na mieste výberu „Akú zbierku pridávate?“) */
export function PripnutieVyber({ strankaId, mobil, onSpat, onHotovo }: { strankaId: string; mobil: boolean; onSpat: () => void; onHotovo: (t: string) => void }) {
  const [vsetky, setVsetky] = useState<ZbierkaNaPripnutie[] | null>(null);
  const [q, setQ] = useState(""), [zd, setZd] = useState(0);
  const pin = usePripnute(strankaId);
  useEffect(() => { let ziva = true; void hladajZbierky().then((l) => { if (ziva) setVsetky(l); }); return () => { ziva = false; }; }, []);
  const qq = bez(q.trim());
  const L = (vsetky ?? []).filter((x) => (zd === 0 || (zd === 1 ? x.zdroj === "charita" : x.zdroj === "help")) && (!qq || bez(`${x.nazov} ${x.kto}`).includes(qq)));
  return (
    <section style={{ flex: "none", borderRadius: 22, background: "var(--card)", border: "2px solid var(--green)", padding: mobil ? "14px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <button type="button" onClick={onSpat} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)" }}>‹ Späť na výber zbierky</button>
      <b style={{ fontSize: 19 }}>Pripnúť zbierku na vašu stránku</b>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Vyberte zverejnenú zbierku v DEED. Peniaze idú priamo tomu, kto zbierku vedie. Vy ju len ukazujete veriacim a môžete ju kedykoľvek odopnúť.</span>
      <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 60))} placeholder="Hľadať zbierku alebo organizáciu" aria-label="Hľadať zbierku"
        style={{ height: 50, padding: "0 14px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15.5, color: "var(--ink)", outline: "none" }} />
      <div role="radiogroup" aria-label="Zdroj" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["Všetky", "Charita", "Help"].map((t, i) => { const on = zd === i; return (
          <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setZd(i)} style={{ minHeight: 44, padding: "0 16px", borderRadius: 22, border: on ? "2px solid var(--ink)" : "1.5px solid var(--cardBd)", background: on ? "var(--ink)" : "transparent", color: on ? "var(--bg)" : "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800 }}>{t}</button>); })}
      </div>
      {vsetky === null ? <span style={{ fontSize: 14, color: "var(--ink3)" }}>Načítavam zbierky…</span>
        : !L.length ? <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Nič sme nenašli. Skúste iné slovo.</span>
        : L.map((x) => { const ma = pin.some((p) => p.id === x.id); return (
          <div key={x.id} style={{ borderRadius: 16, border: ma ? "2px solid #4B7A35" : "1px solid var(--cardBd)", background: "var(--field)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: mobil ? "wrap" : "nowrap" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={chipSt(farbaPripnutej(x))}>{chipPripnutej(x)}</span>
              <b style={{ fontSize: 15.5 }}>{x.nazov}</b>
              <span style={{ fontSize: 13, color: "var(--ink3)" }}>{eur(x.vyzbierane)}{x.ciel ? ` z ${eur(x.ciel)}` : ""} · peniaze idú: {x.kto}</span>
            </span>
            <button type="button" aria-disabled={ma} onClick={() => { if (ma) return; void pripni(strankaId, x).then(() => onHotovo(`Pripnuté ✓ ${x.nazov} je na stránke farnosti v Zbierkach farnosti.`), (e: Error) => onHotovo(e.message)); }}
              style={{ flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 12, border: ma ? "1.5px solid #4B7A35" : "none", background: ma ? "transparent" : "#4B7A35", color: ma ? "var(--gInk)" : "#fff", cursor: ma ? "default" : "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800 }}>{ma ? "Pripnutá ✓" : "Pripnúť"}</button>
          </div>); })}
      <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>Na stránke farnosti sa ukáže celá zbierka aj jej celková suma. Darcov so sumou uvidíte len tých, ktorí darovali cez vašu stránku.</span>
    </section>);
}

function RiadokPripnutej({ z, strankaId, prvy, hlas }: { z: ZbierkaNaPripnutie; strankaId: string; prvy: boolean; hlas: (t: string) => void }) {
  const c = useCezStranku(z.id, strankaId);
  return (
    <div style={{ padding: "12px 0", borderTop: prvy ? "none" : "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={chipSt(farbaPripnutej(z))}>{chipPripnutej(z)}</span>
      <b style={{ fontSize: 15 }}>{z.nazov}</b>
      <span style={{ fontSize: 13, color: "var(--ink3)" }}>cez vašu stránku: {eur(c.suma)} · spolu {eur(z.vyzbierane)}</span>
      <DrzTlacidlo ms={1200} styl={{ alignSelf: "flex-start", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid #A34A2A", background: "transparent", color: "#A34A2A", fontSize: 14, fontWeight: 800 }}
        onHotovo={() => { void odopni(strankaId, z.id).then(() => hlas(`Odopnuté ✓ ${z.nazov} už na vašej stránke nie je. Zbierka beží ďalej u ${z.kto}.`), (e: Error) => hlas(e.message)); }}>Podržte · odopnúť</DrzTlacidlo>
    </div>);
}

/** zoznam pripnutých zbierok v Správe → Zbierky */
export function PripnuteZoznam({ strankaId, mobil, hlas }: { strankaId: string; mobil: boolean; hlas: (t: string) => void }) {
  const pin = usePripnute(strankaId);
  if (!pin.length) return null;
  return (<>
    <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" }}>PRIPNUTÉ ZBIERKY INÝCH</span>
    <section style={{ borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "4px 14px" : "6px 20px" }}>
      {pin.map((z, i) => <RiadokPripnutej key={z.id} z={z} strankaId={strankaId} prvy={!i} hlas={hlas} />)}
    </section>
    <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Tieto zbierky nespravujete, môžete ich len odopnúť zo stránky. Keď zbierka skončí, zo stránky zmizne sama.</span>
  </>);
}
