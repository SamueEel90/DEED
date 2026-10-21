// ============================================================
// OPRAVY 468 · Ateliér → Moja stránka (skúšobný režim). Farárova skutočná stránka v zvolenom vzhľade, dá sa posúvať.
// Hore zlatý pás: Skúšobný režim · vzhľad, veta, počet zmien, Zverejniť zmeny ›.
// Dole: Vzhľad (čipy, menia len koncept) · Poradie blokov (bočný panel, logika z UsporiadatStranku) · Pozrieť na: Počítač · Tablet · Mobil.
// Koncept = len vzhľad a rozloženie, ukladá sa hneď na server (lib/atelier); obsah je spoločný.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ROZLOZENIA, type Rozlozenie } from "@/lib/rozlozenieFarnosti";
import { BLOKY_STRANKY, PREMENOVAT, NAZOV_MAX, nadpisBloku, mozeVedla, normalizuj, type BlokStranky, type Usporiadanie } from "@/lib/usporiadanieStranky";
import { kedy2, nazovVzhladu, ulozKonceptAtelieru, zmenyKonceptu, type KonceptAtelieru } from "@/lib/atelier";
import { NastenkaFarnosti } from "@/features/verejny-profil/NastenkaFarnosti";
import { LayoutContext } from "@/components/context";
import type { ProfilStranky } from "@/lib/profilStranky";

const ZLATA = "#C9A24A";
const M = Object.fromEntries(BLOKY_STRANKY.map((b) => [b.id, b])) as Record<BlokStranky, (typeof BLOKY_STRANKY)[number]>;
type Zariadenie = "pc" | "tablet" | "mobil";
const ZARIADENIA: [Zariadenie, string, number | null, { wide: boolean; desktop: boolean }][] = [
  ["pc", "Počítač", null, { wide: true, desktop: true }], ["tablet", "Tablet", 820, { wide: true, desktop: false }], ["mobil", "Mobil", 390, { wide: false, desktop: false }],
];

export function AtelierMoja({ strankaId, meno, profil, koncept, naostro, uspNaostro, onZverejnit }: { strankaId: string; meno: string; profil: ProfilStranky | null;
  koncept: KonceptAtelieru; naostro: Rozlozenie; uspNaostro: Usporiadanie; onZverejnit: () => void }) {
  const [u, setU] = useState<Usporiadanie>(() => normalizuj(koncept.usporiadanie));
  const [panel, setPanel] = useState(false);
  const [zar, setZar] = useState<Zariadenie>("pc");
  const [otv, setOtv] = useState<BlokStranky | null>(null);
  // poradie, skrytie, názvy: koncept sa zapíše chvíľu po poslednej zmene (písanie názvu nezapisuje každé písmeno)
  const posl = useRef(JSON.stringify(normalizuj(koncept.usporiadanie)));
  useEffect(() => {
    const j = JSON.stringify(u); if (j === posl.current) return;
    const t = window.setTimeout(() => { posl.current = j; ulozKonceptAtelieru({ rozlozenie: koncept.rozlozenie, usporiadanie: u, naplanovane: koncept.naplanovane }); }, 500);
    return () => window.clearTimeout(t);
  }, [u, koncept.rozlozenie, koncept.naplanovane]);
  const vzhlad = (k: Rozlozenie) => { posl.current = JSON.stringify(u); ulozKonceptAtelieru({ rozlozenie: k, usporiadanie: u, naplanovane: koncept.naplanovane }); };
  const zmeny = zmenyKonceptu({ ...koncept, usporiadanie: u }, naostro, uspNaostro);

  const L = u.poradie, n = L.length;
  const presun = (i: number, j: number) => { if (j < 0 || j >= n) return; const o = L.slice(); [o[i], o[j]] = [o[j], o[i]]; setU({ ...u, poradie: o }); };
  const skry = (k: BlokStranky, on: boolean) => setU({ ...u, skryte: on ? [...u.skryte.filter((x) => x !== k), k] : u.skryte.filter((x) => x !== k) });
  const vedla = (k: BlokStranky, on: boolean) => setU({ ...u, vedla: on ? [...u.vedla.filter((x) => x !== k), k] : u.vedla.filter((x) => x !== k) });
  const premenuj = (k: BlokStranky, t: string) => { const z = { ...u.nazvy }; if (t) z[k] = t.slice(0, NAZOV_MAX); else delete z[k]; setU({ ...u, nazvy: z }); };

  const [, , sirka, layout] = ZARIADENIA.find((z) => z[0] === zar)!;
  const cip = (on: boolean): CSSProperties => ({ minHeight: 40, padding: "0 14px", borderRadius: 20, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--card)",
    color: on ? "var(--gInk)" : "var(--ink)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" });
  const sipka = (on: boolean): CSSProperties => ({ flex: "none", width: 44, height: 44, borderRadius: 11, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)", fontSize: 18, cursor: on ? "pointer" : "default", opacity: on ? 1 : 0.35, fontFamily: "inherit" });
  const volba = (a: boolean): CSSProperties => ({ minHeight: 40, minWidth: 56, padding: "0 12px", border: "none", background: a ? "#4B7A35" : "transparent", color: a ? "#fff" : "var(--ink)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" });

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div role="status" style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "12px 24px", background: "#2A2214", borderBottom: `2px solid ${ZLATA}`, color: "#F3EBDD" }}>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <b style={{ fontSize: 16 }}>Skúšobný režim · {nazovVzhladu(koncept.rozlozenie)}</b>
          <span style={{ fontSize: 13.5, color: "#D9D2C4" }}>Ľudia vidia vašu doterajšiu stránku ({nazovVzhladu(naostro)}). Toto vidíte len vy.</span>
        </span>
        <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 14, fontWeight: 800, color: zmeny.length ? ZLATA : "#D9D2C4" }}>
          {zmeny.length ? `${zmeny.length} ${zmeny.length === 1 ? "zmena" : zmeny.length < 5 ? "zmeny" : "zmien"}` : "Bez zmien"}
          {koncept.naplanovane && <span style={{ fontSize: 12.5, color: "#D9D2C4" }}>zverejní sa {kedy2(koncept.naplanovane)}</span>}</span>
        <button type="button" onClick={onZverejnit} disabled={!zmeny.length}
          style={{ flex: "none", minHeight: 46, padding: "0 18px", borderRadius: 12, border: "none", background: "#4B7A35", color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: zmeny.length ? "pointer" : "default", opacity: zmeny.length ? 1 : 0.45 }}>Zverejniť zmeny ›</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", background: sirka ? "var(--btn)" : "transparent", padding: sirka ? "24px 16px 40px" : 0 }}>
          <div style={sirka ? { width: sirka, maxWidth: "100%", margin: "0 auto", borderRadius: 24, overflow: "hidden", border: "8px solid #1D211B", boxShadow: "0 12px 40px rgba(0,0,0,.25)", background: "var(--bg)" } : undefined}>
            <LayoutContext.Provider value={layout}>
              <NastenkaFarnosti bezVidenych strankaId={strankaId} meno={meno} profil={profil} stit="Silver" atelier={{ rozlozenie: koncept.rozlozenie, usporiadanie: u }} />
            </LayoutContext.Provider>
          </div>
        </div>

        {panel && <aside aria-label="Poradie blokov" style={{ flex: "none", width: 400, overflowY: "auto", borderLeft: "1px solid var(--cardBd)", background: "var(--bg)", padding: "18px 16px 30px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <b style={{ flex: 1, fontSize: 19 }}>Poradie blokov</b>
            <button type="button" onClick={() => setPanel(false)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Zavrieť</button>
          </span>
          <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink3)" }}>Šípkami zmeníte poradie. Ťuknite na názov a môžete blok skryť alebo premenovať. Platí pre všetky vzhľady.</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 50, padding: "8px 14px", borderRadius: 12, background: "var(--btn)", color: "var(--ink3)" }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em" }}>VŽDY PRVÁ</span><b style={{ fontSize: 15 }}>Titulka</b></div>
          {L.map((k, i) => {
            const skryty = u.skryte.includes(k), nm = nadpisBloku(u, k, M[k].t), o = otv === k;
            return (
              <div key={k} style={{ display: "flex", flexDirection: "column", borderRadius: 12, background: skryty ? "var(--btn)" : "var(--card)", border: o ? "2px solid var(--green)" : "1px solid var(--cardBd)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 56, padding: "6px 8px 6px 12px" }}>
                  <button type="button" aria-expanded={o} onClick={() => setOtv(o ? null : k)} style={{ flex: 1, minWidth: 0, minHeight: 44, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 1, padding: 0, border: "none", background: "transparent", color: "var(--ink)", fontFamily: "inherit", textAlign: "left", cursor: "pointer", opacity: skryty ? 0.55 : 1 }}>
                    <b style={{ fontSize: 15, overflowWrap: "anywhere" }}>{nm} <span aria-hidden="true" style={{ color: "var(--ink3)" }}>{o ? "⌃" : "›"}</span></b>
                    {skryty && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>skryté na stránke</span>}
                  </button>
                  <button type="button" onClick={() => presun(i, i - 1)} aria-label={`Posunúť hore: ${nm}`} disabled={i === 0} style={sipka(i > 0)}>↑</button>
                  <button type="button" onClick={() => presun(i, i + 1)} aria-label={`Posunúť dole: ${nm}`} disabled={i === n - 1} style={sipka(i < n - 1)}>↓</button>
                </div>
                {o && <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "2px 12px 14px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ flex: 1, fontSize: 14 }}>Skryť zo stránky</b>
                    <span role="radiogroup" aria-label={`Skryť zo stránky: ${nm}`} style={{ display: "flex", border: "1.5px solid var(--cardBd)", borderRadius: 12, overflow: "hidden" }}>
                      {([["Áno", true], ["Nie", false]] as [string, boolean][]).map(([t, v]) => <button key={t} type="button" role="radio" aria-checked={skryty === v} onClick={() => skry(k, v)} style={volba(skryty === v)}>{t}</button>)}</span></span>
                  {i > 0 && mozeVedla(k) && mozeVedla(L[i - 1]) && <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14 }}>Vedľa predošlého</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Moderné a Klasika na počítači</span></span>
                    <span role="radiogroup" aria-label={`Vedľa predošlého: ${nm}`} style={{ display: "flex", border: "1.5px solid var(--cardBd)", borderRadius: 12, overflow: "hidden" }}>
                      {([["Áno", true], ["Nie", false]] as [string, boolean][]).map(([t, v]) => { const a = u.vedla.includes(k) === v; return <button key={t} type="button" role="radio" aria-checked={a} onClick={() => vedla(k, v)} style={volba(a)}>{t}</button>; })}</span></span>}
                  {PREMENOVAT[k] && <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><b style={{ fontSize: 14 }}>Názov bloku</b>
                    <input value={u.nazvy[k] ?? M[k].t} onChange={(e) => premenuj(k, e.target.value === M[k].t ? "" : e.target.value)} maxLength={NAZOV_MAX}
                      style={{ minHeight: 46, padding: "0 12px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} />
                    <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)" }}>Sem stále pôjde: {PREMENOVAT[k]}. Pôvodný názov: {M[k].t}.</span></label>}
                </div>}
              </div>);
          })}
        </aside>}
      </div>

      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "10px 24px", borderTop: "1px solid var(--cardBd)", background: "var(--card)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 14 }}>Vzhľad:</b>
          {ROZLOZENIA.map((r) => <button key={r.k} type="button" aria-pressed={r.k === koncept.rozlozenie} onClick={() => vzhlad(r.k)} style={cip(r.k === koncept.rozlozenie)}>{r.t}</button>)}</span>
        <button type="button" aria-expanded={panel} onClick={() => setPanel(!panel)} style={cip(panel)}>Poradie blokov</button>
        <span role="radiogroup" aria-label="Pozrieť na" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: 14 }}>Pozrieť na:</b>
          {ZARIADENIA.map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={zar === k} onClick={() => setZar(k)} style={cip(zar === k)}>{t}</button>)}</span>
      </div>
    </div>);
}
