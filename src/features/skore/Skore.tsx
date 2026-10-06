// ============================================================
// MODUL AI SKÓRE (test) — REÁLNE hodnotenie skutkov Opusom
// DEED_AI_Hodnotenie_Backend_DEV.md v1 §5 (flow UI) + §6 (kalibrácia)
// ------------------------------------------------------------
// 1. user zadá opis + miesto + dôkazy → POST /api/score
// 2. „doplnit“ → otázky, odpovede sa pripoja k opisu, druhé kolo (max 1)
// 3. „ok“ → náhľad učesanej karty + skóre/pásmo → user POTVRDÍ
// 4. „zamietnut“ → neutrálna hláška, bez návodu čo opraviť
// Kalibrácia (Martin): tabuľka behov z /api/score-log + export CSV.
// ============================================================
import { useRef, useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { ModulHlavicka, Button, Input, Switch, Card, toast, obalSiroky, useLayout, IkonaFoto, IkonaKriz, IkonaGraf, IkonaFajka } from "@/shared";
import { spracujFotku } from "@/lib/obrazok";
import { useSession } from "@/lib/session";
import type { WideProps } from "@/types";
import { ohodnot, nacitajLog, stiahniCsv, ScoreChyba, type ScoreOdpoved, type LogRiadok } from "./api";

const MAX_FOTIEK = 3;
const PASMA_POPIS: Record<number, string> = {
  0: "pod prahom — len karma (profil, nie feed)",
  1: "1 riadok — drobná pomoc",
  2: "2 riadky — bežná pomoc",
  3: "3 riadky — špička bežných skutkov",
  4: "4 riadky — krízový režim",
};

type Faza =
  | { krok: "form" }
  | { krok: "doplnit"; otazky: string[] }
  | { krok: "nahlad"; vysledok: ScoreOdpoved }
  | { krok: "zamietnute" };

export default function Skore({ wide }: WideProps) {
  const { desktop } = useLayout();
  const session = useSession();
  const userId = session && "ucet_id" in session ? String(session.ucet_id) : "demo";

  const [tab, setTab] = useState<"test" | "kalibracia">("test");

  // ---- formulár ----
  const [opis, setOpis] = useState("");
  const [miesto, setMiesto] = useState("");
  const [anonymne, setAnonymne] = useState(false);
  const [fotky, setFotky] = useState<string[]>([]);
  const [maVideo, setMaVideo] = useState(false);
  const [posielam, setPosielam] = useState(false);
  const [faza, setFaza] = useState<Faza>({ krok: "form" });
  const [odpovede, setOdpovede] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pridajFotky(files: FileList | null) {
    if (!files) return;
    const nove: string[] = [];
    for (const f of Array.from(files).slice(0, MAX_FOTIEK - fotky.length)) {
      try {
        // bez orezu, dlhšia strana 1568 px (viac Opus nevyužije), JPEG — doplnok §1
        nove.push(await spracujFotku(f, { pomer: null, maxSirka: 1568 }));
      } catch (e) {
        toast(e instanceof Error ? e.message : "Fotku sa nepodarilo spracovať.");
      }
    }
    if (nove.length) setFotky((s) => [...s, ...nove].slice(0, MAX_FOTIEK));
  }

  async function odosli(kolo: 1 | 2, finalnyOpis: string) {
    setPosielam(true);
    try {
      const v = await ohodnot({ opis: finalnyOpis, miesto, fotky, maVideo, anonymne, userId, kolo });
      if (v.verdikt === "doplnit") {
        setOpis(finalnyOpis); // odpovede na otázky sa budú pripájať k tomuto opisu
        setOdpovede((v.otazky ?? []).map(() => ""));
        setFaza({ krok: "doplnit", otazky: v.otazky ?? [] });
      } else if (v.verdikt === "ok") {
        setFaza({ krok: "nahlad", vysledok: v });
      } else {
        setFaza({ krok: "zamietnute" });
      }
    } catch (e) {
      toast(e instanceof ScoreChyba ? e.message : "Hodnotenie sa nepodarilo, skús znova.");
    } finally {
      setPosielam(false);
    }
  }

  function reset() {
    setOpis(""); setMiesto(""); setAnonymne(false); setFotky([]); setMaVideo(false);
    setOdpovede([]); setFaza({ krok: "form" });
  }

  // odpovede sa PRIPOJA k pôvodnému opisu (doplnok §6) — stateless druhé kolo
  function odosliDoplnenie(otazky: string[]) {
    const doplnenie = otazky
      .map((q, i) => (odpovede[i]?.trim() ? `${q} → ${odpovede[i].trim()}` : null))
      .filter(Boolean)
      .join("\n");
    void odosli(2, `${opis}\n--- Doplnenie: ${doplnenie || "(bez odpovede)"}`);
  }

  const sekcia = (
    <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: SPACE.md }}>
      {/* prepínač Test / Kalibrácia */}
      <div style={{ display: "flex", gap: SPACE.xs }}>
        {(["test", "kalibracia"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{ flex: 1, padding: "10px 0", borderRadius: RADIUS.sm, border: `1px solid ${tab === t ? "transparent" : C.line}`, fontWeight: 800, fontSize: 13, fontFamily: "inherit", cursor: "pointer", background: tab === t ? "var(--page-grad)" : "transparent", color: tab === t ? C.text : C.textSec }}>
            {t === "test" ? "Testovať skutok" : "Kalibrácia"}
          </button>
        ))}
      </div>

      {tab === "test" && faza.krok === "form" && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Opíš svoj skutok</div>
            <Input multiline minH={120} value={opis} onChange={setOpis} maxLength={8000}
              placeholder="Vlastnými slovami — preklepy nevadia. Simulované dôkazy píš do textu (napr. „prikladám QR akcie“)." ariaLabel="Opis skutku" />
            <Input value={miesto} onChange={setMiesto} placeholder="Kde sa to stalo (mesto, miesto)" ariaLabel="Miesto" />

            {/* dôkazy — max 3 fotky, zmenšené na 1568 px (doplnok §1) */}
            <div style={{ display: "flex", gap: SPACE.xs, flexWrap: "wrap", alignItems: "center" }}>
              {fotky.map((f, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={f} alt={`dôkaz ${i + 1}`} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: RADIUS.sm, border: `1px solid ${C.line}` }} />
                  <button type="button" aria-label="Odstrániť fotku" onClick={() => setFotky((s) => s.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, border: "none", background: C.red, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IkonaKriz size={12} color="#fff" />
                  </button>
                </div>
              ))}
              {fotky.length < MAX_FOTIEK && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ width: 72, height: 72, borderRadius: RADIUS.sm, border: `1.5px dashed ${C.line}`, background: "transparent", color: C.textTer, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 10, fontFamily: "inherit" }}>
                  <IkonaFoto size={18} color={C.textTer} /> Fotka
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
                onChange={(e) => { void pridajFotky(e.target.files); e.target.value = ""; }} />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, fontSize: 13, color: C.textSec }}>
              <Switch on={maVideo} onChange={setMaVideo} ariaLabel="Mám video" />
              Mám video (v teste sa neanalyzuje — posúdi sa ručne)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, fontSize: 13, color: C.textSec }}>
              <Switch on={anonymne} onChange={setAnonymne} ariaLabel="Zverejniť anonymne" />
              Zverejniť anonymne (skryť pred feedom)
            </label>

            <Button full disabled={posielam || !opis.trim()} onClick={() => void odosli(1, opis)}>
              {posielam ? "Hodnotím…" : "Odoslať na hodnotenie"}
            </Button>
          </div>
        </Card>
      )}

      {tab === "test" && faza.krok === "doplnit" && (
        <Card accent="var(--a-info)">
          <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Ešte pár otázok</div>
            <div style={{ fontSize: 12.5, color: C.textSec }}>Skladačka dáva zmysel, len chýba dielik — odpovede sa pripoja k opisu.</div>
            {faza.otazky.map((q, i) => (
              <div key={i}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{q}</div>
                <Input value={odpovede[i] ?? ""} onChange={(v) => setOdpovede((s) => s.map((x, j) => (j === i ? v : x)))} placeholder="Tvoja odpoveď" ariaLabel={`Odpoveď ${i + 1}`} />
              </div>
            ))}
            <div style={{ display: "flex", gap: SPACE.xs }}>
              <Button variant="ghost" onClick={reset}>Zrušiť</Button>
              <Button disabled={posielam} onClick={() => odosliDoplnenie(faza.otazky)}>
                {posielam ? "Hodnotím…" : "Odoslať doplnenie"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {tab === "test" && faza.krok === "nahlad" && <Nahlad v={faza.vysledok} onPotvrd={() => { toast("Skutok zverejnený (test)."); reset(); }} onZahod={reset} />}

      {tab === "test" && faza.krok === "zamietnute" && (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm, alignItems: "flex-start" }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Tentoraz to nevyšlo</div>
            {/* neutrálna hláška — ŽIADEN návod čo opraviť (spec v1 §5) */}
            <div style={{ fontSize: 13, color: C.textSec }}>Skutok sa nepodarilo overiť, nezverejníme ho.</div>
            <Button variant="ghost" onClick={reset}>Späť na formulár</Button>
          </div>
        </Card>
      )}

      {tab === "kalibracia" && <Kalibracia />}
    </div>
  );

  return (
    <div>
      <ModulHlavicka title="AI Skóre" slogan="Testovací modul — reálne hodnotenie Opusom (kalibrácia kotiev)" />
      {obalSiroky(sekcia, { wide, desktop })}
    </div>
  );
}

// ---- náhľad učesanej karty + rozpad skóre (poistka: user potvrdí pred zverejnením) ----
function Nahlad({ v, onPotvrd, onZahod }: { v: ScoreOdpoved; onPotvrd: () => void; onZahod: () => void }) {
  const riadok = (label: string, hodnota: React.ReactNode, pozn?: string | null) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: SPACE.sm, fontSize: 12.5 }}>
      <span style={{ color: C.textSec, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ textAlign: "right" }}>{hodnota}{pozn ? <div style={{ color: C.textTer, fontSize: 11.5 }}>{pozn}</div> : null}</span>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACE.md }}>
      <Card accent="var(--a-green)">
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.textTer, letterSpacing: 0.4, display: "flex", alignItems: "center", gap: 8 }}>
            NÁHĽAD KARTY PRE FEED
            {v.mock && <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(230,160,40,.16)", color: "var(--a-gold, #b8860b)", fontWeight: 800 }}>MOCK simulácia — bez Opusa</span>}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5 }}>{v.ucesanyText}</div>
          <div style={{ display: "flex", gap: SPACE.xs, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--page-grad)", fontWeight: 800, fontSize: 13 }}>Skóre {v.skore}</span>
            <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${C.line}`, fontSize: 12, color: C.textSec }}>Pásmo {v.pasmo} · {PASMA_POPIS[v.pasmo ?? 0]}</span>
            {v.krizovyRezim && <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(220,60,60,.12)", color: C.red, fontSize: 12, fontWeight: 800 }}>Krízový režim</span>}
            {v.injectionFlag && <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(220,60,60,.12)", color: C.red, fontSize: 12, fontWeight: 800 }}>⚑ injection</span>}
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.textTer, letterSpacing: 0.4 }}>ROZPAD HODNOTENIA (kalibračný pohľad)</div>
          {riadok("Typ", v.typ ?? "—")}
          {riadok("Dopad", String(v.dopad ?? "—"), v.dopadZdovodnenie)}
          {riadok("Náročnosť", String(v.narocnost ?? "—"), v.narocnostZdovodnenie)}
          {riadok("Nezištnosť", `×${v.nezistnost ?? "—"}`)}
          {riadok("Kredibilita", `×${v.kredibilita ?? "—"}`, (v.kredibilitaSignaly ?? []).join(" · ") || null)}
          {riadok("Config", v.configVersion)}
        </div>
      </Card>

      <div style={{ display: "flex", gap: SPACE.xs }}>
        <Button variant="ghost" onClick={onZahod}>Zahodiť</Button>
        <Button variant="green" onClick={onPotvrd}><IkonaFajka size={16} color="#fff" /> Potvrdiť a zverejniť</Button>
      </div>
    </div>
  );
}

// ---- kalibrácia (Martin): tabuľka behov + CSV export (spec v1 §6) ----
function Kalibracia() {
  // Zadanie 5 · 5.1: admin token len v pamäti tejto obrazovky (localStorage by cez XSS unikol); starý záznam sa zmaže
  const [token, setToken] = useState<string>(() => { try { localStorage.removeItem("deed.skore.admintoken"); } catch { /* private mode */ } return ""; });
  const [behy, setBehy] = useState<LogRiadok[] | null>(null);
  const [nacitavam, setNacitavam] = useState(false);

  async function nacitaj() {
    setNacitavam(true);
    try { setBehy(await nacitajLog(token)); }
    catch (e) { toast(e instanceof Error ? e.message : "Log sa nepodarilo načítať."); }
    finally { setNacitavam(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACE.md }}>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
          <div style={{ fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}><IkonaGraf size={16} /> Kalibračný log</div>
          <Input type="password" value={token} onChange={setToken} placeholder="Admin token" ariaLabel="Admin token" />
          <div style={{ display: "flex", gap: SPACE.xs }}>
            <Button disabled={nacitavam || !token} onClick={() => void nacitaj()}>{nacitavam ? "Načítavam…" : "Načítať behy"}</Button>
            <Button variant="ghost" disabled={!token} onClick={() => void stiahniCsv(token).catch((e) => toast(e.message))}>Export CSV</Button>
          </div>
        </div>
      </Card>

      {behy && (
        <Card pad={0}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11.5, minWidth: 760 }}>
              <thead>
                <tr style={{ textAlign: "left", color: C.textTer }}>
                  {["čas", "opis", "verdikt", "D", "N", "kred.", "skóre", "pásmo", "flagy", "config", "ms"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", borderBottom: `1px solid ${C.line}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {behy.map((r) => (
                  <tr key={r.runId}>
                    <td style={{ padding: "6px 10px", whiteSpace: "nowrap", color: C.textSec }}>{new Date(r.ts).toLocaleString("sk-SK")}</td>
                    <td style={{ padding: "6px 10px", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.opis}>{r.opis}</td>
                    <td style={{ padding: "6px 10px", fontWeight: 700 }}>{r.verdikt}{r.kolo > 1 ? ` (${r.kolo}. kolo)` : ""}</td>
                    <td style={{ padding: "6px 10px" }}>{r.dopad}</td>
                    <td style={{ padding: "6px 10px" }}>{r.narocnost}</td>
                    <td style={{ padding: "6px 10px" }}>{r.kredibilita}</td>
                    <td style={{ padding: "6px 10px", fontWeight: 800 }}>{r.skore}</td>
                    <td style={{ padding: "6px 10px" }}>{r.pasmo}</td>
                    <td style={{ padding: "6px 10px", color: C.red }}>{[r.injectionFlag && "⚑inj", r.parseError && "⚠parse", r.krizovyRezim && "kríza"].filter(Boolean).join(" ")}</td>
                    <td style={{ padding: "6px 10px", color: C.textTer, whiteSpace: "nowrap" }}>{r.configVersion}</td>
                    <td style={{ padding: "6px 10px", color: C.textTer }}>{r.trvanieMs}</td>
                  </tr>
                ))}
                {behy.length === 0 && <tr><td colSpan={11} style={{ padding: 16, color: C.textTer }}>Zatiaľ žiadne behy.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
