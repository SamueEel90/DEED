// ============================================================
// SPRAVOVAŤ ZBIERKU (správa charity) — jedno okno pre celý život zbierky:
// aktívna → lehota dokladovania, správy darcom, predĺžiť, topovať, ukončiť
// ukončená → dokladovanie podľa pásma (povinné minimum + navyše = karma)
// Pravidlá a čísla: lib/zbierkaSprava.ts (SPRAVA_ZBIERKY_CFG, PASMA_DOKLADOV).
// ============================================================
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, MoniBar, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { spracujFotku } from "@/lib/obrazok";
import { nacitajDoklad, jePdf, otvorDoklad } from "@/lib/doklad";
import { ulozVideo, jeVideo, VIDEO_CFG } from "@/lib/videoUloz";
import { MediaNahlad } from "./DokazBlok";
import { sucetDarov, useZmenyDarov } from "@/lib/darcovia";
import { ZBIERKY, predvolenyStav } from "@/lib/zbierky";
import {
  SPRAVA_ZBIERKY_CFG as CFG, PASMA_DOKLADOV, POZIADAVKA_TEXT, DRUHY_DOKLADU, OVERENY_SKEN,
  nacitajStav, ulozStav, pasmoPre, sumaDokladov, splnene, navyse, percentoDolozenia, fazaDokladovania, dniDo, pridajDni,
  type StavZbierky, type Lehota, type DruhDokladu, type PolozkaDokladu,
} from "@/lib/zbierkaSprava";
import { FLAGS, TIER_LABEL, type Tier } from "./stav";
import { pridajOznamDarcom } from "@/lib/oznamyDarcom";
import { OznamDarcoviSheet } from "@/features/notifikacie/OznamDarcovi";
import type { OrgZbierka } from "./mock";

const ZELENA = "var(--a-green)";
const eur = (n: number) => `${n.toLocaleString("sk")} €`;
const datum = (iso: string) => (isNaN(Date.parse(iso)) ? iso : new Date(iso).toLocaleDateString("sk"));

const input: CSSProperties = { width: "100%", boxSizing: "border-box", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" };
const btnHlavny: CSSProperties = { width: "100%", height: 46, borderRadius: RADIUS.sm, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: ZELENA, color: "#06281d" };
const btnDruhy: CSSProperties = { width: "100%", height: 42, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, background: "transparent", color: C.textSec };

function Karta({ nadpis, popis, children }: { nadpis: string; popis?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{nadpis}</div>
      {popis && <div style={{ fontSize: 11.5, color: C.textTer, lineHeight: 1.45, marginTop: 2, marginBottom: SPACE.xs }}>{popis}</div>}
      <div style={{ marginTop: popis ? 0 : SPACE.xs }}>{children}</div>
    </div>
  );
}
function Cip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <span {...pressable(onClick, String(children))} aria-pressed={on}
      style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: on ? 800 : 600, padding: `${SPACE.xs}px ${SPACE.xxs}px`, borderRadius: RADIUS.pill, cursor: "pointer", background: on ? tint(ZELENA, .12) : C.surface, border: `1px solid ${on ? tint(ZELENA, .45) : C.line}`, color: on ? ZELENA : C.textSec }}>{children}</span>
  );
}
function Zelene({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, background: tint(ZELENA, .08), border: `1px solid ${tint(ZELENA, .3)}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>{children}</div>;
}

export function SpravaZbierkySheet({ z, tier, toast, onPaywall, onClose }: {
  z: OrgZbierka; tier: Tier; toast: (m: string) => void;
  onPaywall: (tierMin: Tier, nazov: string, dovod: string) => void; onClose: () => void;
}) {
  const [teraz] = useState(() => Date.now());
  const [s, setS] = useState<StavZbierky>(() => {
    const ulozeny = nacitajStav(z.id);
    if (ulozeny) return ulozeny;
    const raw = ZBIERKY.find((x) => x.id === z.id);
    if (raw) return predvolenyStav(raw, teraz);
    return { stav: z.stav, koniec: pridajDni(teraz, CFG.dlzkaDni), predlzenia: 0, lehota: "30", text: "", fotky: [], doklady: [], spravy: [] };
  });
  // prvé otvorenie: zapamätaj stav (koniec zbierky sa nesmie pri každom otvorení posúvať)
  useEffect(() => { if (!nacitajStav(z.id)) ulozStav(z.id, s); }, [z.id, s]);
  const zmen = (patch: Partial<StavZbierky>) => { const n = { ...s, ...patch }; setS(n); ulozStav(z.id, n); };

  useZmenyDarov();
  const vyzbierane = s.simVyzbierane ?? z.vyzbierane + sucetDarov(z.id).suma;
  const aktivna = s.stav === "aktivna";
  const [potvrdUkoncit, setPotvrdUkoncit] = useState(false);
  const [platba, setPlatba] = useState<null | { druh: "predlzenie" } | { druh: "top"; kluc: string }>(null);
  const [sprava, setSprava] = useState("");

  const dalsiePredlzenie = CFG.predlzenia[s.predlzenia];
  const topAktivny = s.top && dniDo(s.top.do, teraz) > 0 ? s.top : null;

  const zaplat = () => {
    if (!platba) return;
    if (platba.druh === "predlzenie" && dalsiePredlzenie) {
      zmen({ koniec: pridajDni(s.koniec, dalsiePredlzenie.dni), predlzenia: s.predlzenia + 1 });
      toast(`Zbierka predĺžená o ${dalsiePredlzenie.dni} dní · ${eur(dalsiePredlzenie.cena)} (demo platba)`);
    }
    if (platba.druh === "top") {
      const t = CFG.topovanie.find((x) => x.kluc === platba.kluc)!;
      zmen({ top: { uroven: t.nazov, do: pridajDni(teraz, CFG.topovanieDni) } });
      toast(`Topovanie ${t.nazov} na ${CFG.topovanieDni} dní · ${eur(t.cena)} (demo platba)`);
    }
    setPlatba(null);
  };

  const ukonci = () => { zmen({ stav: "ukoncena", ukoncena: new Date().toISOString() }); setPotvrdUkoncit(false); toast("Zbierka ukončená — beží lehota na dokladovanie"); };
  const poslatSpravu = () => {
    if (sprava.trim().length < 10) { toast("Napíš aspoň krátku vetu"); return; }
    zmen({ spravy: [...s.spravy, { text: sprava.trim(), datum: new Date().toISOString() }] });
    pridajOznamDarcom({ zbierkaId: z.id, typ: "sprava", text: sprava.trim() });
    setSprava(""); toast("Správa odoslaná všetkým darcom — pozri Oznámenia 🔔");
  };

  return (
    <Sheet onClose={onClose} label={`Spravovať — ${z.nazov}`}>
      {/* hlavička */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs }}>
        <span style={{ width: 40, height: 40, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: "rgba(var(--glass-rgb),.06)" }}>{z.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{z.nazov}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>
            {aktivna ? `končí o ${Math.max(0, dniDo(s.koniec, teraz))} dní · ${datum(s.koniec)}` : `ukončená ${datum(s.ukoncena ?? s.koniec)}`}
            {topAktivny && ` · ⬆ topované: ${topAktivny.uroven}`}
          </div>
        </div>
        <span style={{ flex: "none", fontSize: 10.5, fontWeight: 800, color: aktivna ? ZELENA : "var(--a-info)", background: tint(aktivna ? ZELENA : "var(--a-info)", .14), borderRadius: RADIUS.xs, padding: `${SPACE.xxs}px ${SPACE.xs}px` }}>{aktivna ? "Aktívna" : "Ukončená"}</span>
      </div>
      <div style={{ marginBottom: SPACE.xxs }}><MoniBar vyzbierane={vyzbierane} ciel={z.ciel} mini /></div>
      <div style={{ fontSize: 12, fontWeight: 700, color: ZELENA, marginBottom: SPACE.sm }}>Doložené použitie: {percentoDolozenia(s, vyzbierane)} %</div>

      {FLAGS.dev_tier_switcher && (
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, flexWrap: "wrap", fontSize: 10.5, color: C.textTer, marginBottom: SPACE.sm }}>
          <b>DEV · vyzbierané:</b>
          {[undefined, 80, 300, 1000, 3000, 8000].map((v) => (
            <span key={String(v)} {...pressable(() => zmen({ simVyzbierane: v }), `sim ${v ?? "skutočné"}`)}
              style={{ cursor: "pointer", padding: "2px 8px", borderRadius: RADIUS.pill, border: `1px solid ${s.simVyzbierane === v ? ZELENA : C.line}`, color: s.simVyzbierane === v ? ZELENA : C.textTer }}>{v === undefined ? "skutočné" : eur(v)}</span>
          ))}
        </div>
      )}

      {aktivna ? (
        <>
          <Karta nadpis="Lehota na dokladovanie" popis="Kedy doložíš, na čo peniaze išli. Darcovia to vidia pri zbierke.">
            <div style={{ display: "flex", gap: SPACE.xs }}>
              {([["30", "30 dní po skončení"], ["priebezne", "Priebežne"], ["60", "Do 60 dní"]] as [Lehota, string][]).map(([k, l]) => (
                <Cip key={k} on={s.lehota === k} onClick={() => zmen({ lehota: k })}>{l}</Cip>
              ))}
            </div>
            {s.lehota === "60" && (
              <textarea defaultValue={s.zdovodnenie60 ?? ""} onBlur={(e) => zmen({ zdovodnenie60: e.target.value })} rows={2}
                placeholder="Prečo potrebuješ 60 dní? (napr. faktúra od dodávateľa príde až po montáži)" style={{ ...input, marginTop: SPACE.xs, resize: "vertical" }} />
            )}
          </Karta>

          <Karta nadpis={`Správa pre darcov (${s.spravy.length}/${CFG.maxSprav})`} popis="Krátka novinka počas zbierky — príde všetkým darcom.">
            {s.spravy.map((m, i) => (
              <div key={i} style={{ fontSize: 12.5, padding: `${SPACE.xxs}px 0`, borderBottom: `1px solid ${C.line}` }}>
                <span style={{ color: C.textTer, fontSize: 10.5 }}>{datum(m.datum)} · </span>{m.text}
              </div>
            ))}
            {s.spravy.length < CFG.maxSprav && (
              <>
                <textarea value={sprava} onChange={(e) => setSprava(e.target.value)} rows={2} placeholder="Napr. Práčku sme už objednali, ďakujeme!" style={{ ...input, marginTop: SPACE.xs, resize: "vertical" }} />
                <button onClick={poslatSpravu} style={{ ...btnDruhy, marginTop: SPACE.xs, color: ZELENA, borderColor: tint(ZELENA, .4) }}>Poslať darcom</button>
              </>
            )}
          </Karta>

          <Karta nadpis="Predĺžiť zbierku" popis="Predĺženie je platené, aby sa nenaťahovali zbierky, ktoré už nežijú. Na dlhodobú pomoc slúžia segmenty charity.">
            {dalsiePredlzenie ? (
              platba?.druh === "predlzenie" ? (
                <div style={{ display: "flex", gap: SPACE.xs }}>
                  <button onClick={zaplat} style={btnHlavny}>Zaplatiť {eur(dalsiePredlzenie.cena)}</button>
                  <button onClick={() => setPlatba(null)} style={{ ...btnDruhy, width: 110 }}>Späť</button>
                </div>
              ) : (
                <button onClick={() => setPlatba({ druh: "predlzenie" })} style={{ ...btnDruhy, color: ZELENA, borderColor: tint(ZELENA, .4) }}>
                  +{dalsiePredlzenie.dni} dní za {eur(dalsiePredlzenie.cena)}
                </button>
              )
            ) : (
              <div style={{ fontSize: 12, color: C.textSec }}>Zbierka už bola predĺžená {CFG.predlzenia.length}×, ďalej sa nedá.</div>
            )}
            {s.predlzenia > 0 && <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xxs }}>predĺžené {s.predlzenia}×</div>}
          </Karta>

          <Karta nadpis="Topovať" popis={`Lepšia pozícia vo výpise na ${CFG.topovanieDni} dní. Je to len jedno z kritérií radenia popri blízkosti, overení a urgentnosti.`}>
            {tier < CFG.topovanieOdTieru ? (
              <button onClick={() => onPaywall(CFG.topovanieOdTieru as Tier, "Topovanie zbierky", "Topovanie je súčasťou platených programov.")}
                style={{ ...btnDruhy, color: "var(--a-gold)", borderColor: tint("var(--a-gold)", .4) }}>🔒 Od programu {TIER_LABEL.charita[CFG.topovanieOdTieru]}</button>
            ) : topAktivny ? (
              <div style={{ fontSize: 12.5, color: ZELENA, fontWeight: 700 }}>⬆ {topAktivny.uroven} · do {datum(topAktivny.do)}</div>
            ) : (
              <div style={{ display: "flex", gap: SPACE.xs }}>
                {CFG.topovanie.map((t) => (
                  platba?.druh === "top" && platba.kluc === t.kluc
                    ? <button key={t.kluc} onClick={zaplat} style={{ ...btnHlavny, flex: 1, height: 52, fontSize: 12.5 }}>Zaplatiť {eur(t.cena)}</button>
                    : <button key={t.kluc} onClick={() => setPlatba({ druh: "top", kluc: t.kluc })} style={{ ...btnDruhy, flex: 1, height: 52, fontSize: 12.5 }}>
                        <div style={{ fontWeight: 800, color: C.text }}>{t.nazov}</div><div style={{ fontSize: 11 }}>{eur(t.cena)} / týždeň</div>
                      </button>
                ))}
              </div>
            )}
          </Karta>

          <Karta nadpis="Dokladovať priebežne" popis="Doklady môžeš pridávať už počas zbierky — darcovia vidia, že to žije.">
            <Dokladovanie zbierkaId={z.id} s={s} zmen={zmen} vyzbierane={vyzbierane} toast={toast} aktivna />
          </Karta>

          {potvrdUkoncit ? (
            <div style={{ display: "flex", gap: SPACE.xs }}>
              <button onClick={ukonci} style={{ ...btnHlavny, background: "var(--a-info)", color: "#fff" }}>Áno, ukončiť zbierku</button>
              <button onClick={() => setPotvrdUkoncit(false)} style={{ ...btnDruhy, width: 110 }}>Späť</button>
            </div>
          ) : (
            <button onClick={() => setPotvrdUkoncit(true)} style={btnDruhy}>Ukončiť zbierku</button>
          )}
        </>
      ) : (
        <>
          <StavDokladovania s={s} vyzbierane={vyzbierane} teraz={teraz} zmen={zmen} toast={toast} />
          <Dokladovanie zbierkaId={z.id} s={s} zmen={zmen} vyzbierane={vyzbierane} toast={toast} />
        </>
      )}
    </Sheet>
  );
}

// ---- stav lehoty po ukončení (vždy zelené / neutrálne, fakty) ----
function StavDokladovania({ s, vyzbierane, teraz, zmen, toast }: {
  s: StavZbierky; vyzbierane: number; teraz: number; zmen: (p: Partial<StavZbierky>) => void; toast: (m: string) => void;
}) {
  const { faza, dni } = fazaDokladovania(s, vyzbierane, teraz);
  const [zdov, setZdov] = useState("");
  const text = {
    dolozene: "✓ Zbierka je doložená. Ďakujeme — takto rastie dôvera darcov.",
    lehota: `Na doloženie ti zostáva ${dni} ${dni === 1 ? "deň" : dni < 5 ? "dni" : "dní"}.`,
    vyzva: `Lehota uplynula. Dolož prosím do ${dni} ${dni === 1 ? "dňa" : "dní"} — inak sa zbierka zobrazí v zozname nedoložených.`,
    caka: "Na profile sa pri zbierke zobrazuje „čaká na doklady“. Keď doložíš, stav sa hneď zmení.",
    zdovodnene: "Zdôvodnenie sme prijali — posudzuje ho DEED. Kým rozhodneme, doklady môžeš stále doplniť.",
  }[faza];
  return (
    <>
      <Zelene>{text}</Zelene>
      {(faza === "vyzva" || faza === "caka") && (
        <div style={{ marginBottom: SPACE.sm }}>
          <textarea value={zdov} onChange={(e) => setZdov(e.target.value)} rows={2} placeholder="Nemáme doklady, pretože…" style={{ ...input, resize: "vertical" }} />
          <button onClick={() => { if (zdov.trim().length < 20) { toast("Napíš zdôvodnenie aspoň jednou vetou"); return; } zmen({ zdovodnenieBezDokladov: zdov.trim() }); toast("Zdôvodnenie odoslané — posúdi ho DEED"); }}
            style={{ ...btnDruhy, marginTop: SPACE.xs }}>Poslať zdôvodnenie</button>
        </div>
      )}
    </>
  );
}

// ---- dokladovanie: povinné podľa pásma + navyše ----
function Dokladovanie({ zbierkaId, s, zmen, vyzbierane, toast, aktivna }: {
  zbierkaId: string; s: StavZbierky; zmen: (p: Partial<StavZbierky>) => void; vyzbierane: number; toast: (m: string) => void; aktivna?: boolean;
}) {
  const pas = PASMA_DOKLADOV[pasmoPre(vyzbierane)];
  const hotovo = pas.povinne.every((p) => splnene(p, s, vyzbierane));
  const pct = percentoDolozenia(s, vyzbierane);
  const n = navyse(s, vyzbierane);
  const [druh, setDruh] = useState<DruhDokladu>("Bloček");
  const [nazov, setNazov] = useState("");
  const [dodavatel, setDodavatel] = useState("");
  const [suma, setSuma] = useState("");
  const [sken, setSken] = useState<string | undefined>();
  const [nahlad, setNahlad] = useState(false);

  const pridajFotky = async (files: FileList | null) => {
    if (!files) return;
    const nove = [...s.fotky];
    for (const f of Array.from(files)) {
      try {
        const src = f.type.startsWith("video/") ? await ulozVideo(f) : await spracujFotku(f, { pomer: 4 / 3, maxSirka: 1200 });
        nove.push({ src, popis: "PO" });
      }
      catch (e) { toast((e as Error).message); }
    }
    zmen({ fotky: nove });
  };
  const nacitajSken = async (files: FileList | null) => {
    const f = files?.[0]; if (!f) return;
    try { setSken(await nacitajDoklad(f)); } catch (e) { toast((e as Error).message); }
  };
  /** doklad dodatočne k položke, ktorá ho ešte nemá */
  const priloz = async (id: string, files: FileList | null) => {
    const f = files?.[0]; if (!f) return;
    try {
      const u = await nacitajDoklad(f);
      zmen({ doklady: s.doklady.map((d) => (d.id === id ? { ...d, foto: u } : d)) });
      toast("Doklad priložený");
    } catch (e) { toast((e as Error).message); }
  };
  const pridajPolozku = () => {
    const sum = Number(suma.replace(",", "."));
    if (!nazov.trim()) { toast("Napíš, čo sa kúpilo alebo na čo išli peniaze"); return; }
    if (!sum || sum <= 0) { toast("Zadaj sumu v €"); return; }
    const p: PolozkaDokladu = { id: `d${Date.now()}`, druh, nazov: nazov.trim(), dodavatel: dodavatel.trim(), suma: sum, datum: new Date().toISOString(), ...(sken ? { foto: sken } : {}) };
    zmen({ doklady: [...s.doklady, p] });
    setNazov(""); setDodavatel(""); setSuma(""); setSken(undefined);
  };
  const zverejni = () => {
    if (!aktivna && !hotovo) { toast("Najprv doplň povinné minimum pre toto pásmo"); return; }
    zmen({ zverejnene: new Date().toISOString() });
    pridajOznamDarcom({ zbierkaId, typ: "dolozene" });
    toast(s.zverejnene ? "Aktualizované — darcovia dostali oznámenie 🔔" : "Zverejnené — všetkým darcom išlo oznámenie s poďakovaním 🔔");
  };

  return (
    <div>
      {/* doložené použitie — to, čo vidí darca pri zbierke */}
      <div style={{ background: tint(ZELENA, .08), border: `1px solid ${tint(ZELENA, .3)}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>Doložené použitie</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: ZELENA }}>{pct} %</span>
        </div>
        <div style={{ height: 8, background: "rgba(var(--glass-rgb),.12)", borderRadius: 4, overflow: "hidden", margin: `${SPACE.xxs}px 0` }}>
          <div style={{ height: "100%", width: `${pct}%`, background: ZELENA, transition: "width .3s ease" }} />
        </div>
        <div style={{ fontSize: 11, color: C.textSec, lineHeight: 1.45 }}>
          {eur(sumaDokladov(s, true))} z {eur(vyzbierane)} má priložený doklad. Darcovia vidia pri zbierke „doložené {pct} %“. Položka bez dokladu sa nepočíta.
        </div>
      </div>

      {/* pásmo + povinné minimum */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>
        <div style={{ fontSize: 12, color: C.textSec, marginBottom: SPACE.xs }}>
          Vyzbierané <b style={{ color: C.text }}>{eur(vyzbierane)}</b> → pásmo <b style={{ color: C.text }}>{pas.label}</b>. Povinné minimum:
        </div>
        {pas.povinne.map((p) => {
          const ok = splnene(p, s, vyzbierane);
          return (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontSize: 12.5, padding: "3px 0", color: ok ? C.text : C.textSec }}>
              <span style={{ width: 18, height: 18, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: ok ? ZELENA : "transparent", border: `1.5px solid ${ok ? ZELENA : C.line}`, color: "#06281d" }}>{ok ? "✓" : ""}</span>
              {POZIADAVKA_TEXT[p]}
            </div>
          );
        })}
        {n > 0 && <div style={{ fontSize: 11.5, color: ZELENA, fontWeight: 700, marginTop: SPACE.xxs }}>★ Navyše doložené: {n}× → +{n * CFG.karmaNavyse} karmy</div>}
      </div>

      {/* text */}
      <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", marginBottom: SPACE.xxs }}>NA ČO IŠLI PENIAZE</div>
      <textarea defaultValue={s.text} onBlur={(e) => zmen({ text: e.target.value })} rows={3}
        placeholder="Napr. Kúpili sme práčku a chladničku, v utorok ich doviezli pani Anne domov." style={{ ...input, resize: "vertical", marginBottom: SPACE.sm }} />

      {/* fotky použitia */}
      <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", marginBottom: SPACE.xxs }}>FOTKY A VIDEO — AKO SME POMOHLI</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SPACE.xxs, marginBottom: SPACE.sm }}>
        {s.fotky.map((f, i) => (
          <div key={i} style={{ position: "relative", borderRadius: RADIUS.xs, overflow: "hidden", aspectRatio: "4/3" }}>
            <MediaNahlad src={f.src} popis={f.popis} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {jeVideo(f.src) && <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontSize: 18, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.6)", pointerEvents: "none" }}>▶</span>}
            <span {...pressable(() => zmen({ fotky: s.fotky.map((x, j) => (j === i ? { ...x, popis: x.popis === "PRED" ? "PO" : "PRED" } : x)) }), "PRED/PO")}
              style={{ position: "absolute", left: 3, top: 3, fontSize: 9.5, fontWeight: 800, color: "#fff", background: f.popis === "PRED" ? "rgba(0,0,0,.65)" : ZELENA, borderRadius: 4, padding: "1px 5px", cursor: "pointer" }}>{f.popis}</span>
            <span {...pressable(() => zmen({ fotky: s.fotky.filter((_, j) => j !== i) }), "Odstrániť fotku")}
              style={{ position: "absolute", right: 3, top: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>×</span>
          </div>
        ))}
        <label style={{ aspectRatio: "4/3", borderRadius: RADIUS.xs, border: `1.5px dashed ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.textSec, cursor: "pointer" }}>
          + Foto / video
          <input type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { void pridajFotky(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      <div style={{ fontSize: 10.5, color: C.textTer, marginTop: -SPACE.xs, marginBottom: SPACE.sm }}>Video najviac {VIDEO_CFG.maxSekund} s. Ťukni na štítok PRED/PO a prepni ho.</div>

      {/* položky + doklady */}
      <div style={{ fontSize: 12, fontWeight: 800, color: C.textTer, letterSpacing: ".04em", marginBottom: SPACE.xxs }}>ROZPIS A DOKLADY</div>
      {s.doklady.map((d) => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, marginBottom: SPACE.xxs }}>
          {jePdf(d.foto)
            ? <span {...pressable(() => void otvorDoklad(d.foto!), "Otvoriť PDF")} style={{ width: 32, height: 32, flex: "none", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 800, color: "#fff", background: "#c0392b", cursor: "pointer" }}>PDF</span>
            : d.foto && d.foto !== OVERENY_SKEN
            ? <img src={d.foto} alt="doklad" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, flex: "none" }} />
            : <span style={{ fontSize: 16, flex: "none" }}>{d.foto ? "📄" : "✏️"}</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.nazov}</div>
            <div style={{ fontSize: 10.5, color: C.textTer }}>{d.druh}{d.dodavatel ? ` · ${d.dodavatel}` : ""}{d.foto ? " · s dokladom" : ""}</div>
            {!d.foto && (
              <label style={{ display: "inline-block", marginTop: 2, fontSize: 11, fontWeight: 800, color: ZELENA, cursor: "pointer" }}>
                📎 Priložiť doklad (foto alebo PDF)
                <input type="file" accept="image/*,application/pdf,.pdf" hidden onChange={(e) => { void priloz(d.id, e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
          <span style={{ flex: "none", fontSize: 12.5, fontWeight: 800, color: ZELENA }}>{eur(d.suma)}</span>
          <span {...pressable(() => zmen({ doklady: s.doklady.filter((x) => x.id !== d.id) }), "Odstrániť položku")} style={{ flex: "none", color: C.textTer, cursor: "pointer", fontSize: 15 }}>×</span>
        </div>
      ))}
      <div style={{ background: C.surface, border: `1px dashed ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginTop: SPACE.xs, marginBottom: SPACE.sm }}>
        <div style={{ display: "flex", gap: SPACE.xxs, marginBottom: SPACE.xs, flexWrap: "wrap" }}>
          {DRUHY_DOKLADU.map((d) => <Cip key={d} on={druh === d} onClick={() => setDruh(d)}>{d === "Potvrdenie o prevzatí" ? "Potvrdenie" : d}</Cip>)}
        </div>
        <input value={nazov} onChange={(e) => setNazov(e.target.value)} placeholder="Čo sa kúpilo (napr. práčka Whirlpool)" style={{ ...input, marginBottom: SPACE.xs }} />
        <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.xs }}>
          <input value={dodavatel} onChange={(e) => setDodavatel(e.target.value)} placeholder="Predajca / dodávateľ" style={{ ...input, flex: 1 }} />
          <input value={suma} onChange={(e) => setSuma(e.target.value)} placeholder="€" inputMode="decimal" style={{ ...input, width: 80, flex: "none", textAlign: "right" }} />
        </div>
        <div style={{ display: "flex", gap: SPACE.xs }}>
          <label style={{ ...btnDruhy, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", color: sken ? ZELENA : C.textSec, borderColor: sken ? tint(ZELENA, .45) : C.line }}>
            {sken ? (jePdf(sken) ? "✓ PDF priložené" : "✓ Foto priložené") : "📎 Doklad (foto/PDF)"}
            <input type="file" accept="image/*,application/pdf,.pdf" hidden onChange={(e) => { void nacitajSken(e.target.files); e.target.value = ""; }} />
          </label>
          <button onClick={pridajPolozku} style={{ ...btnHlavny, flex: 1, height: 42 }}>Pridať položku</button>
        </div>
        <div style={{ fontSize: 10.5, color: C.textTer, marginTop: SPACE.xxs }}>Osobné údaje príjemcu (meno, adresa) na doklade pred odfotením zakry.</div>
      </div>

      <Zelene>Všetkým darcom príde správa o vašom dokladovaní s opätovným poďakovaním za dar.</Zelene>
      <button onClick={() => setNahlad(true)} style={{ ...btnDruhy, marginBottom: SPACE.xs }}>👁 Náhľad — čo uvidí darca</button>
      {nahlad && <OznamDarcoviSheet zbierkaId={zbierkaId} typ="dolozene" nahladStav={s} onClose={() => setNahlad(false)} />}
      <button onClick={zverejni} style={{ ...btnHlavny, opacity: !aktivna && !hotovo ? .55 : 1 }}>
        {s.zverejnene ? "Aktualizovať a poslať darcom" : aktivna ? "Zverejniť priebežne a poslať darcom" : "Zverejniť a poslať darcom"}
      </button>
    </div>
  );
}
