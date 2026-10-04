// ============================================================
// SPRAVOVAŤ ZBIERKU (správa charity) — jedno okno pre celý život zbierky:
// aktívna → lehota dokladovania, správy darcom, predĺžiť, topovať, ukončiť
// ukončená → dokladovanie podľa pásma (povinné minimum + navyše = karma)
// Pravidlá a čísla: lib/zbierkaSprava.ts (SPRAVA_ZBIERKY_CFG, PASMA_DOKLADOV).
// ============================================================
import { Emo, IkonaOko } from "@/components/icons";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, MoniBar, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { spracujFotku } from "@/lib/obrazok";
import { nacitajDoklad, jePdf, otvorDoklad } from "@/lib/doklad";
import { ulozVideo, jeVideo, VIDEO_CFG } from "@/lib/videoUloz";
import { MediaNahlad } from "./DokazBlok";
import { sucetDarov, useZmenyDarov, darcoviaPre } from "@/lib/darcovia";
import { RichTextInput } from "@/components/richtext";
import { cistyText } from "@/lib/richtext";
import { ZBIERKY, predvolenyStav } from "@/lib/zbierky";
import {
  SPRAVA_ZBIERKY_CFG as CFG, PASMA_DOKLADOV, POZIADAVKA_TEXT, DRUHY_DOKLADU, OVERENY_SKEN,
  nacitajStav, ulozStav, pasmoPre, sumaDokladov, splnene, navyse, percentoDolozenia, fazaDokladovania, dniDo, pridajDni, upozornenie90, UPOZORNENIE_90_TEXT, UPOZORNENIE_DNI, kdeJeDlhodoba,
  LEHOTA_TEXT, type StavZbierky, type Lehota, type DruhDokladu, type PolozkaDokladu,
} from "@/lib/zbierkaSprava";
import { FLAGS, KONFIG, TIER_LABEL, type Tier } from "./stav";
import { pridajOznamDarcom } from "@/lib/oznamyDarcom";
import { OznamDarcoviSheet } from "@/features/notifikacie/OznamDarcovi";
import type { OrgZbierka } from "./mock";
import { TextovePolia, GaleriaEditor } from "./obsahZbierky";
import type { MediumZbierky } from "@/lib/novaZbierka";

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
  const [podakovanie, setPodakovanie] = useState<null | { karma: number }>(null);

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


  return (
    <Sheet onClose={onClose} label={`Spravovať — ${z.nazov}`}>
      {podakovanie ? (
        <div style={{ textAlign: "center", padding: `${SPACE.md}px 0 ${SPACE.sm}px` }}>
          <div style={{ fontSize: 44, lineHeight: 1, color: "var(--a-green)" }}><Emo e="💚" /></div>
          <div style={{ fontSize: 21, fontWeight: 800, marginTop: SPACE.sm }}>Ďakujeme za doloženie!</div>
          <div style={{ fontSize: 13.5, color: C.textSec, lineHeight: 1.5, margin: `${SPACE.xs}px 0 ${SPACE.sm}px` }}>
            Všetkým darcom zbierky „{z.nazov}“ išlo oznámenie s tvojím dokladovaním a s poďakovaním za ich dar. Takto rastie dôvera k vašej organizácii.
          </div>
          <div style={{ display: "inline-block", fontSize: 13, fontWeight: 800, color: ZELENA, background: tint(ZELENA, .12), border: `1px solid ${tint(ZELENA, .35)}`, borderRadius: RADIUS.pill, padding: `${SPACE.xxs}px ${SPACE.sm}px`, marginBottom: SPACE.md }}>
            ✓ Doložené {percentoDolozenia(s, vyzbierane)} % použitia{podakovanie.karma > 0 ? ` · +${podakovanie.karma} karmy za dôkaz navyše` : ""}
          </div>
          <button onClick={onClose} style={btnHlavny}>Hotovo</button>
        </div>
      ) : (<>
      {/* hlavička */}
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.xs }}>
        <span style={{ width: 40, height: 40, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: "rgba(var(--glass-rgb),.06)" }}><Emo e={z.emoji} /></span>
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

          {/* OPRAVY 110: novinky darcom počas zbierky zrušené — charita píše darcom len 2× (výsledok, na čo išli peniaze), fáza B */}

          <Karta nadpis="Predĺžiť zbierku" popis={CFG.predlzenia.map((p, i) => `${i === 0 ? "Predĺženie" : "potom"} o ${p.dni} dní za ${eur(p.cena)}`).join(", ") + "."}>
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
            <Dokladovanie zbierkaId={z.id} s={s} zmen={zmen} vyzbierane={vyzbierane} toast={toast} aktivna onZverejnene={(k) => setPodakovanie({ karma: k })} />
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
          <Dokladovanie zbierkaId={z.id} s={s} zmen={zmen} vyzbierane={vyzbierane} toast={toast} onZverejnene={(k) => setPodakovanie({ karma: k })} />
        </>
      )}
      <button onClick={onClose} style={{ ...btnDruhy, marginTop: SPACE.sm }}>Zavrieť bez zverejnenia</button>
      </>)}
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
    zdovodnene: "Zdôvodnenie sme prijali — posudzuje ho DEED+. Kým rozhodneme, doklady môžeš stále doplniť.",
  }[faza];
  return (
    <>
      <Zelene>{text}</Zelene>
      {(faza === "vyzva" || faza === "caka") && (
        <div style={{ marginBottom: SPACE.sm }}>
          <textarea value={zdov} onChange={(e) => setZdov(e.target.value)} rows={2} placeholder="Nemáme doklady, pretože…" style={{ ...input, resize: "vertical" }} />
          <button onClick={() => { if (zdov.trim().length < 20) { toast("Napíš zdôvodnenie aspoň jednou vetou"); return; } zmen({ zdovodnenieBezDokladov: zdov.trim() }); toast("Zdôvodnenie odoslané — posúdi ho DEED+"); }}
            style={{ ...btnDruhy, marginTop: SPACE.xs }}>Poslať zdôvodnenie</button>
        </div>
      )}
    </>
  );
}

// ---- dokladovanie: povinné podľa pásma + navyše ----
function Dokladovanie({ zbierkaId, s, zmen, vyzbierane, toast, aktivna, onZverejnene }: {
  zbierkaId: string; s: StavZbierky; onZverejnene: (karma: number) => void; zmen: (p: Partial<StavZbierky>) => void; vyzbierane: number; toast: (m: string) => void; aktivna?: boolean;
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
    onZverejnene(n * CFG.karmaNavyse);
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
      <button onClick={() => setNahlad(true)} style={{ ...btnDruhy, marginBottom: SPACE.xs, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><IkonaOko size={16} /> Náhľad — čo uvidí darca</button>
      {nahlad && <OznamDarcoviSheet zbierkaId={zbierkaId} typ="dolozene" nahladStav={s} onClose={() => setNahlad(false)} />}
      <button onClick={zverejni} style={{ ...btnHlavny, opacity: !aktivna && !hotovo ? .55 : 1 }}>
        {s.zverejnene ? "Aktualizovať a poslať darcom" : aktivna ? "Zverejniť priebežne a poslať darcom" : "Zverejniť a poslať darcom"}
      </button>
    </div>
  );
}

// ============================================================
// KARTA 38 · OPRAVY 123 — Správa zbierky charity (obsahová časť správy, nie hárok; mobil celá obrazovka).
// Logika zo starého okna ostáva (lib/zbierkaSprava: stav, pásma, fázy, výpočty), nový je vzhľad:
// Beží (predĺženie vo feede, topovanie, doklady, ukončiť) · Skončila (Podarilo sa, feed, doložiť) · Doklady.
// Texty z prototypu Sprava charity PC → Zbierky → Spravovať, vykanie, bez emoji.
// ============================================================
/** zbierka, ktorú správa otvorila (mock riadok alebo spustená zbierka) */
export interface ZbierkaNaSpravu {
  id: string; nazov: string; bg: string; ciel: number; vyzbierane: number; darcovia: number;
  /** centrálna, sektorová alebo dlhodobá — predĺženie vo feede sa neukáže */
  bezPredlzenia?: boolean;
  lehota?: Lehota; lehotaText?: string;
  /** deň začiatku (ISO) a koľko dní ešte beží (mock) */
  zaciatok?: string; zostavaDni?: number; ukoncena?: boolean;
  /** KARTA 37 · bod 7: dlhodobá zbierka (od P1) — po 90 dňoch bez doloženia upozornenie */
  dlha?: boolean;
  /** KARTA 39: dĺžka dlhodobej (mesiace) a zapečatený účel */
  mesiace?: number; ucel?: string;
}
const IKS = {
  fajka: "M5 12l5 5 9-10", dok: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6", kos: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
};
const IkS = ({ d, s = 18, c = "currentColor", w = 2 }: { d: string; s?: number; c?: string; w?: number }) =>
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d={d} /></svg>;
const kartaS: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 };
const nadpisS: CSSProperties = { fontSize: 17, fontWeight: 800, color: "var(--ink)" };
const textS: CSSProperties = { fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" };
const tlZ: CSSProperties = { height: 48, padding: "0 20px", border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff", alignSelf: "flex-start" };
const tlO: CSSProperties = { height: 48, padding: "0 20px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)", alignSelf: "flex-start" };
const poleS: CSSProperties = { padding: "12px 14px", borderRadius: 14, border: "1.5px solid #CFC9BC", background: "var(--field)", fontFamily: "inherit", fontSize: 15, lineHeight: 1.5, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const dnes = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
const dniT = (n: number) => `${n} ${n === 1 ? "deň" : n >= 2 && n <= 4 ? "dni" : "dní"}`;
const DEN_MS = 86400000;

export function SpravaZbierky({ z, mobil, onZbierky, toast }: { z: ZbierkaNaSpravu; mobil: boolean; onZbierky: () => void; toast: (m: string) => void }) {
  const [teraz] = useState(() => Date.now());
  const [s, setS] = useState<StavZbierky>(() => {
    const u = nacitajStav(z.id);
    if (u) return u;
    const zac = z.zaciatok ?? pridajDni(teraz, -(CFG.dlzkaDni - (z.zostavaDni ?? CFG.dlzkaDni)));
    const koniec = z.dlha && z.mesiace ? (() => { const d = new Date(zac); d.setMonth(d.getMonth() + z.mesiace!); return d.toISOString(); })() : pridajDni(zac, CFG.dlzkaDni);
    return { stav: z.ukoncena ? "ukoncena" : "aktivna", zaciatok: zac, koniec, ...(z.ukoncena ? { ukoncena: pridajDni(teraz, -1) } : {}), predlzenia: 0, lehota: z.lehota ?? "30", text: "", fotky: [], doklady: [], spravy: [] };
  });
  useEffect(() => { if (!nacitajStav(z.id)) ulozStav(z.id, s); }, [z.id, s]);
  const zmen = (patch: Partial<StavZbierky>) => { setS((x) => { const n = { ...x, ...patch }; ulozStav(z.id, n); return n; }); };
  useZmenyDarov();
  const darov = sucetDarov(z.id);
  // KARTA 39 · bod 1: dlhodobá — pridaný doklad počas zbierky ju vytiahne hore na 24 h, najviac raz za 30 dní (doklad navyše sa pridá vždy)
  const kde = z.dlha ? kdeJeDlhodoba({ zaciatok: s.zaciatok ?? s.koniec, dary30: s.simDary30 ?? darcoviaPre(z.id).filter((d) => Date.now() - d.cas < KONFIG.dlhodoba.prah.dni * DEN_MS).length, vytiahnute: s.vytiahnute, teraz: Math.max(teraz, Date.now()), cfg: KONFIG.dlhodoba }) : null;
  const zmenDoklady = (patch: Partial<StavZbierky>) => {
    const novy = !!patch.doklady && patch.doklady.length > s.doklady.length;
    if (kde && s.stav === "aktivna" && novy && kde.mozeVytiahnut) { zmen({ ...patch, vytiahnute: new Date().toISOString() }); toast(`Zbierka je na ${KONFIG.dlhodoba.horeHodin} hodín hore vo feede`); }
    else zmen(patch);
  };
  const vyzbierane = s.simVyzbierane ?? z.vyzbierane + darov.suma;
  const darcov = z.darcovia + darov.pocet;
  const [pohlad, setPohlad] = useState<"stav" | "doklady">("stav");
  const [conf, setConf] = useState(false);
  const aktivna = s.stav === "aktivna";
  const zac = s.zaciatok ?? pridajDni(s.koniec, -CFG.dlzkaDni);
  const vFeede = Math.max(0, dniDo(s.koniec, teraz));
  const topAktivny = s.top && dniDo(s.top.do, teraz) > 0 ? s.top : null;
  const lehT = z.lehotaText ?? LEHOTA_TEXT[s.lehota];

  // ---- akcie (logika zo starého okna) ----
  const predlz = () => {
    const p = CFG.predlzenia[s.predlzenia]; if (!p) return;
    zmen({ koniec: pridajDni(s.koniec, p.dni), predlzenia: s.predlzenia + 1 });
    toast(`Zbierka je vo feede o ${p.dni} dní dlhšie · ${eur(p.cena)}`);
  };
  const topuj = (kluc: string) => {
    const t = CFG.topovanie.find((x) => x.kluc === kluc)!;
    zmen({ top: { uroven: t.nazov, do: pridajDni(teraz, CFG.topovanieDni) } });
    toast(`Topované: ${t.nazov} na ${CFG.topovanieDni} dní · ${eur(t.cena)}`);
  };
  // 5. 10. · ukončenie: hárok (prečo, čo sa stane, podrž 1,5 s) → 15 minút sa dá vrátiť, výsledok darcom odíde až potom
  const ukonci = (dovod: string) => {
    const kedy = new Date().toISOString();
    pasVidel.current = false;
    zmen({ stav: "ukoncena", ukoncena: kedy, vratitDo: new Date(Date.now() + VRATIT_MIN * 60000).toISOString(), dovodUkoncenia: dovod, vysledokPoslany: undefined }); setConf(false);
  };
  const pasVidel = useRef(false); // pás „Zbierka je ukončená" sa po ukončení raz posunie do obrazovky
  const vratit = () => zmen({ stav: "aktivna", ukoncena: undefined, vratitDo: undefined, dovodUkoncenia: undefined });
  // KARTA 38 · bod 4: výsledok darcom posiela systém sám (1. z 2 správ) — po uplynutí 15 minút na vrátenie
  const [, tik] = useState(0);
  useEffect(() => {
    if (s.stav !== "ukoncena" || !s.vratitDo || s.vysledokPoslany) return;
    const zostava = Date.parse(s.vratitDo) - Date.now();
    const posli = () => { pridajOznamDarcom({ zbierkaId: z.id, typ: "vysledok", text: `Vyzbierali ste ${eur(vyzbierane)} od ${darcov} darcov. Ďakujeme.` }); zmen({ vysledokPoslany: new Date().toISOString(), vratitDo: undefined }); };
    if (zostava <= 0) { posli(); return; }
    const t = window.setTimeout(posli, zostava); const t2 = window.setInterval(() => tik((x) => x + 1), 30000);
    return () => { window.clearTimeout(t); window.clearInterval(t2); };
  }, [s.stav, s.vratitDo, s.vysledokPoslany]); // eslint-disable-line react-hooks/exhaustive-deps
  const vratitPas = s.stav === "ukoncena" && s.vratitDo && !s.vysledokPoslany && Date.parse(s.vratitDo) > Date.now() && (() => {
    const d = new Date(s.vratitDo!); const hod = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
    return (
      <div role="status" ref={(el) => { if (el && !pasVidel.current) { pasVidel.current = true; el.scrollIntoView({ behavior: "smooth", block: "center" }); } }} style={{ borderRadius: 18, background: "#1D211B", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 15.5 }}>Zbierka je ukončená</b>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Výsledok pošleme {darcov} darcom o {VRATIT_MIN} minút ({hod}). Dovtedy to môžete vrátiť.</span>
        </span>
        <button type="button" onClick={vratit} style={{ height: 46, padding: "0 18px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#1D211B" }}>Vrátiť späť</button>
      </div>);
  })();

  // ---- hlavička (všetky stavy) ----
  const denZ = Math.min(CFG.dlzkaDni, Math.max(1, Math.ceil(((s.ukoncena ? Date.parse(s.ukoncena) : teraz) - Date.parse(zac)) / DEN_MS)));
  const meta = aktivna && z.dlha ? `Dlhodobá · beží ešte ${dniT(Math.max(0, dniDo(s.koniec, teraz)))}${topAktivny ? ` · topované: ${topAktivny.uroven}` : ""}`
    : aktivna ? `Vo feede ešte ${dniT(vFeede)}${topAktivny ? ` · topované: ${topAktivny.uroven}` : ""}` : `Skončila ${dnes(s.ukoncena ?? s.koniec)}, ${denZ}. deň z ${CFG.dlzkaDni}`;
  const hlavicka = (
    <section style={{ ...kartaS, flexDirection: mobil ? "column" : "row", alignItems: mobil ? "stretch" : "center", gap: 18 }}>
      <span style={{ width: mobil ? "100%" : 132, aspectRatio: "16 / 10", flex: "none", borderRadius: 14, background: z.bg }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><b style={{ fontSize: mobil ? 19 : 21, color: "var(--ink)" }}>{z.nazov}</b>
          <span style={{ padding: "3px 10px", borderRadius: 9, background: aktivna ? "var(--gSoft)" : "var(--btn)", border: `1px solid ${aktivna ? "var(--gBd)" : "var(--cardBd)"}`, fontSize: 12.5, fontWeight: 800, color: aktivna ? "var(--gInk)" : "var(--ink2)" }}>{aktivna ? "Beží" : "Skončila"}</span></span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 24, color: "var(--green)" }}>{eur(vyzbierane)}</b><span style={{ fontSize: 14, color: "var(--ink3)" }}>{z.ciel ? `z ${eur(z.ciel)} · ` : ""}{darcov} darcov</span></span>
        <span style={{ display: "block", height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: "100%", background: "var(--green)", transformOrigin: "left", transform: `scaleX(${z.ciel ? Math.min(1, vyzbierane / z.ciel) : vyzbierane ? 1 : 0})`, transition: "transform .5s ease" }} /></span>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{meta}</span>
      </span>
    </section>);

  // DEV: stav zbierky na test (ako prepínač v prototype)
  const devTaby = FLAGS.dev_tier_switcher && (
    <div role="tablist" aria-label="Stav zbierky (test)" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "var(--btn)" }}>
      {([["bezi", "Beží"], ["skoncila", "Skončila"], ["doklady", "Doklady"]] as const).map(([k, t]) => { const on = k === "doklady" ? pohlad === "doklady" : pohlad === "stav" && (k === "bezi") === aktivna; return (
        <button key={k} role="tab" aria-selected={on} onClick={() => { if (k === "doklady") setPohlad("doklady"); else { setPohlad("stav"); zmen(k === "bezi" ? { stav: "aktivna", ukoncena: undefined } : { stav: "ukoncena", ukoncena: s.ukoncena ?? new Date().toISOString(), vysledokPoslany: s.vysledokPoslany ?? new Date().toISOString() }); } }}
          style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: on ? 800 : 700, background: on ? "var(--seg)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)" }}>{t}</button>); })}
    </div>);
  const vrch = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button type="button" onClick={pohlad === "doklady" ? () => setPohlad("stav") : onZbierky} style={{ minHeight: 44, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)" }}>‹ {pohlad === "doklady" ? "Späť na zbierku" : "Zbierky"}</button>
      <span style={{ flex: 1 }} />{FLAGS.dev_tier_switcher && z.dlha && aktivna && <button type="button" onClick={() => zmen({ zaciatok: pridajDni(zac, -UPOZORNENIE_DNI), doklady: s.doklady.map((d) => ({ ...d, datum: pridajDni(d.datum, -UPOZORNENIE_DNI) })), ...(s.upozornenie90Zavrete ? { upozornenie90Zavrete: pridajDni(s.upozornenie90Zavrete, -UPOZORNENIE_DNI) } : {}) })} style={{ height: 36, padding: "0 12px", borderRadius: 10, border: "1px dashed var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>Posunúť o 90 dní (DEV)</button>}{devTaby}
    </div>);
  const dva = (deti: ReactNode, sl = "repeat(2,minmax(0,1fr))") => <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : sl, gap: 16, alignItems: "start" }}>{deti}</div>;

  if (pohlad === "doklady") return (<>{vrch}{vratitPas}{hlavicka}<DokladyCharity zbierkaId={z.id} s={s} zmen={zmenDoklady} vyzbierane={vyzbierane} teraz={teraz} mobil={mobil} toast={toast} /></>);

  if (aktivna) {
    const dalsie = CFG.predlzenia[s.predlzenia];
    const maxFeed = CFG.dlzkaDni + CFG.predlzenia.reduce((a, p) => a + p.dni, 0);
    const upoz = z.dlha && upozornenie90(s, zac, Math.max(teraz, Date.now()));
    return (<>{vrch}{hlavicka}
      {upoz && <section role="status" style={{ ...kartaS, background: "var(--goldBg)", border: "1.5px solid var(--goldBd)" }}>
        <span style={{ ...textS, fontSize: 15, color: "var(--ink)" }}>{UPOZORNENIE_90_TEXT}</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setPohlad("doklady")} style={tlZ}>Doložiť</button>
          <button type="button" onClick={() => zmen({ upozornenie90Zavrete: new Date().toISOString() })} style={tlO}>Teraz nie</button>
        </div>
      </section>}
      {dva(<>
      {kde && <KdeJeTeraz kde={kde} dary30={s.simDary30 ?? darcoviaPre(z.id).filter((d) => Date.now() - d.cas < KONFIG.dlhodoba.prah.dni * DEN_MS).length} simDary={s.simDary30} onSim={(n) => zmen({ simDary30: n })} onDolozit={() => setPohlad("doklady")} />}
      {z.dlha && <ZmenaUcelu ucel={z.ucel} zmena={s.zmenaUcelu} onZiadost={(ucel, zdovodnenie) => zmen({ zmenaUcelu: { ucel, zdovodnenie, podana: new Date().toISOString() } })}
        onSchval={() => { const zm = s.zmenaUcelu!; pridajOznamDarcom({ zbierkaId: z.id, typ: "sprava", text: `Zbierka „${z.nazov}“ mení účel na: ${zm.ucel}. ${cistyText(zm.zdovodnenie)}` }); zmen({ zmenaUcelu: { ...zm, schvalena: new Date().toISOString() } }); }} />}
      {!z.bezPredlzenia && <section style={kartaS}>
        <span style={nadpisS}>Predĺženie vo feede</span>
        <span style={textS}>30 dní vo feede je v cene. Na vašom profile zbierka beží aj bez predĺženia. Predĺženie platíte len vtedy, keď chcete, aby ju ľudia videli vo feede dlhšie.</span>
        {CFG.predlzenia.map((p, i) => { const zapl = i < s.predlzenia; return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "0 14px", borderRadius: 12, background: zapl ? "var(--gSoft)" : "var(--field)", border: `1px solid ${zapl ? "var(--gBd)" : "transparent"}`, opacity: i <= s.predlzenia ? 1 : 0.5 }}>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{i === 0 ? `+${p.dni} dní` : `ďalších +${p.dni} dní`}</span>
            <span style={{ fontSize: 14.5, fontWeight: 800, color: zapl ? "var(--gInk)" : "var(--ink)" }}>{zapl ? "zaplatené" : eur(p.cena)}</span>
          </div>); })}
        {dalsie ? <button type="button" onClick={predlz} style={tlZ}>Predĺžiť o {dalsie.dni} dní · {eur(dalsie.cena)}</button>
          : <span style={textS}>Zbierka je vo feede najdlhšie, ako sa dá, {maxFeed} dní.</span>}
      </section>}
      <section style={kartaS}>
        <span style={nadpisS}>Topovať</span>
        <span style={textS}>Na {CFG.topovanieDni} dní bude zbierka vyššie vo feede. Je to len jedno z kritérií popri blízkosti a overení.</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {CFG.topovanie.map((t) => { const on = topAktivny?.uroven === t.nazov; return (
            <button key={t.kluc} type="button" onClick={() => topuj(t.kluc)} disabled={!!topAktivny && !on} aria-pressed={on} style={{ minHeight: 64, padding: 8, borderRadius: 14, cursor: topAktivny ? "default" : "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--green)" : "transparent"}`, color: "var(--ink)", opacity: topAktivny && !on ? 0.5 : 1 }}>
              <b style={{ fontSize: 15 }}>{t.nazov}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{eur(t.cena)} · {CFG.topovanieDni} dní</span>
            </button>); })}
        </div>
        {topAktivny && <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gInk)" }}>Topované: {topAktivny.uroven} na {CFG.topovanieDni} dní · {eur(CFG.topovanie.find((t) => t.nazov === topAktivny.uroven)?.cena ?? 0)} · do {dnes(topAktivny.do)}</span>}
      </section>
      <section style={kartaS}>
        <span style={nadpisS}>Doklady</span>
        <span style={textS}>Lehota je zapečatená: <b style={{ color: "var(--ink)" }}>{lehT}</b>. Doklady môžete pridávať aj teraz, počas zbierky.</span>
        <button type="button" onClick={() => setPohlad("doklady")} style={tlO}>Pridať doklad</button>
      </section>
      <section style={kartaS}>
        <span style={nadpisS}>Ukončiť zbierku</span>
        <span style={textS}>Ukončiť môžete kedykoľvek, napríklad keď je cieľ splnený. Dary sa potom zastavia.</span>
        <button type="button" onClick={() => setConf(true)} style={tlO}>Ukončiť zbierku…</button>
      </section>
      {conf && <UkoncitHarok mobil={mobil} vyzbierane={vyzbierane} darcov={darcov} lehota={lehT} onUkonci={ukonci} onZavri={() => setConf(false)} />}
    </>)}</>);
  }

  // ---- SKONČILA ----
  const koniecPodakovania = pridajDni(zac, CFG.podakovanieDni);
  const dniPodakovania = dniDo(koniecPodakovania, teraz);
  const voFeede = !s.stiahnuta && dniPodakovania > 0;
  const { faza, dni } = fazaDokladovania(s, vyzbierane, Math.max(teraz, Date.now()));
  return (<>{vrch}{vratitPas}{hlavicka}
    {!vratitPas && <section style={{ ...kartaS, background: "var(--gSoft)", border: "1.5px solid var(--gBd)", gap: 6 }}>
      <span style={{ fontSize: 21, fontWeight: 800, color: "var(--ink)" }}>Podarilo sa</span>
      <span style={textS}>Výsledok sme poslali všetkým darcom {dnes(s.vysledokPoslany ?? s.ukoncena ?? s.koniec)}: vyzbierali ste {eur(vyzbierane)} od {darcov} darcov.</span>
    </section>}
    {dva(<>
      <section style={kartaS}>
        <span style={nadpisS}>{voFeede ? `Vo feede ešte ${dniT(dniPodakovania)} ako poďakovanie` : "Stiahnutá z feedu"}</span>
        <span style={textS}>{voFeede ? "Zbierka skončila skôr, preto ostane vo feede do konca svojich 30 dní s nápisom Podarilo sa. Darcovia aj zbierka sú vidno. Stiahnuť ju môžete kedykoľvek." : "Zbierka je už len na vašom profile."}</span>
        {voFeede && <button type="button" onClick={() => zmen({ stiahnuta: new Date().toISOString() })} style={tlO}>Stiahnuť z feedu</button>}
      </section>
      {faza === "dolozene" ? <section style={kartaS}>
        <span style={nadpisS}>Doložené</span>
        <span style={textS}>Doložené použitie: <b style={{ color: "var(--green)" }}>{percentoDolozenia(s, vyzbierane)} %</b>. Darcom išla druhá a posledná správa.</span>
        <button type="button" onClick={() => setPohlad("doklady")} style={tlO}>Pozrieť doklady</button>
      </section> : <section style={kartaS}>
        <span style={nadpisS}>Doložte, na čo išli peniaze</span>
        <span style={textS}>{faza === "lehota" ? <>Zostáva <b style={{ color: "var(--ink)" }}>{dniT(dni)}</b>. Keď doložíte, darcom pôjde druhá a posledná správa.</>
          : faza === "vyzva" ? `Lehota uplynula. Doložte, prosím, do ${dniT(dni)}, inak sa pri zbierke ukáže „čaká na doklady“.`
          : faza === "caka" ? "Pri zbierke sa na profile ukazuje „čaká na doklady“. Keď doložíte, zmení sa to hneď."
          : "Zdôvodnenie sme prijali, posudzuje ho DEED+. Doklady môžete stále doplniť."}</span>
        <button type="button" onClick={() => setPohlad("doklady")} style={tlZ}>Doložiť použitie</button>
      </section>}
    </>)}
  </>);
}

const VRATIT_MIN = 15;
const DOVODY_UKONCENIA = ["Cieľ je splnený", "Už to nepotrebujeme", "Iný dôvod"];
/** 5. 10. · hárok „Ukončiť zbierku?" (PC v strede, mobil zdola): Prečo končíte → Čo sa stane → Podrž a ukonči (1,5 s) · Nechať bežať */
function UkoncitHarok({ mobil, vyzbierane, darcov, lehota, onUkonci, onZavri }: { mobil: boolean; vyzbierane: number; darcov: number; lehota: string; onUkonci: (dovod: string) => void; onZavri: () => void }) {
  const [vidno, setVidno] = useState(false);
  const [dovod, setDovod] = useState<number | null>(null);
  const [drz, setDrz] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setVidno(true))); return () => { cancelAnimationFrame(r); window.clearTimeout(tm.current); }; }, []);
  const zavri = () => { setVidno(false); window.setTimeout(onZavri, 260); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  const zacni = () => { if (dovod == null) return; setDrz(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => { setDrz(false); onUkonci(DOVODY_UKONCENIA[dovod]); }, 1500); };
  const pusti = () => { window.clearTimeout(tm.current); setDrz(false); };
  const sekcia: CSSProperties = { fontSize: 14, fontWeight: 800, color: "var(--ink3)", letterSpacing: ".04em" };
  const karta: CSSProperties = { position: "fixed", zIndex: 91, background: "var(--bg)", color: "var(--ink)", boxShadow: "0 30px 80px rgba(0,0,0,.45)", padding: 22, display: "flex", flexDirection: "column", gap: 14, maxHeight: "92vh", overflowY: "auto" };
  return createPortal(
    <div className="sprava-charity" style={{ background: "transparent", minHeight: 0 }}>
      <div onClick={zavri} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(10,8,5,.6)", opacity: vidno ? 1 : 0, transition: "opacity .25s ease" }} />
      <div role="dialog" aria-modal="true" aria-label="Ukončiť zbierku" style={mobil
        ? { ...karta, left: 0, right: 0, bottom: 0, borderRadius: "26px 26px 0 0", paddingBottom: "max(24px, env(safe-area-inset-bottom))", transform: `translateY(${vidno ? "0%" : "105%"})`, transition: "transform .32s cubic-bezier(.2,.8,.2,1)" }
        : { ...karta, left: "50%", top: "50%", width: "min(520px, calc(100% - 32px))", borderRadius: 26, opacity: vidno ? 1 : 0, transform: `translate(-50%, -50%) scale(${vidno ? 1 : 0.94})`, transition: "opacity .25s ease, transform .3s ease" }}>
        <b style={{ fontSize: 21 }}>Ukončiť zbierku?</b>
        <span style={sekcia}>PREČO KONČÍTE</span>
        <div role="radiogroup" aria-label="Prečo končíte" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DOVODY_UKONCENIA.map((t, i) => { const on = dovod === i; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setDovod(i)} style={{ minHeight: 50, padding: "0 16px", borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>{t}</button>); })}
        </div>
        <span style={sekcia}>ČO SA STANE</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>
          <span>· Dary sa zastavia. Vyzbierali ste <b style={{ color: "var(--ink)" }}>{eur(vyzbierane)}</b> od {darcov} darcov.</span>
          <span>· Darcom pošleme výsledok o {VRATIT_MIN} minút. Dovtedy to môžete vrátiť.</span>
          <span>· Začne plynúť lehota na doklady: {lehota}.</span>
        </div>
        <button type="button" aria-disabled={dovod == null} onPointerDown={zacni} onPointerUp={pusti} onPointerLeave={pusti} onPointerCancel={pusti}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") pusti(); }} onContextMenu={(e) => e.preventDefault()}
          style={{ position: "relative", height: 58, border: "none", borderRadius: 16, background: "#7A3A2C", overflow: "hidden", cursor: dovod == null ? "default" : "pointer", touchAction: "none", userSelect: "none", opacity: dovod == null ? 0.45 : 1, fontFamily: "inherit" } as CSSProperties}>
          <span style={{ position: "absolute", inset: 0, background: "#A34A2A", transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? "1.5s" : ".2s"} linear` }} />
          <span style={{ position: "relative", fontSize: 16, fontWeight: 800, color: "#fff" }}>Podrž a ukonči zbierku</span>
        </button>
        <button type="button" onClick={zavri} style={{ height: 44, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink3)" }}>Nechať bežať</button>
      </div>
    </div>, document.body);
}

// ---- KARTA 39 · bod 1: Kde je zbierka teraz (dlhodobá) ----
function KdeJeTeraz({ kde, dary30, simDary, onSim, onDolozit }: { kde: ReturnType<typeof kdeJeDlhodoba>; dary30: number; simDary?: number; onSim: (n: number | undefined) => void; onDolozit: () => void }) {
  const K = KONFIG.dlhodoba;
  const dar = (n: number) => `${n} ${n === 1 ? "dar" : n >= 2 && n <= 4 ? "dary" : "darov"}`;
  const miestoT = { velka: `Vo feede ako veľká karta, prvých ${K.velkaDni} dní.`, hore: `Vo feede hore ako veľká karta, ${K.horeHodin} hodín po doložení.`, mala: "Vo feede ako malá karta.", profil: "Len na vašom profile, vo feede teraz nie je." }[kde.miesto];
  const zivaT = kde.ziva ? `Zbierka je živá: ${dar(dary30)} za posledných ${K.prah.dni} dní, treba aspoň ${K.prah.dary}.` : `Zbierka nie je živá: ${dar(dary30)} za posledných ${K.prah.dni} dní, treba aspoň ${K.prah.dary}.`;
  const vytT = kde.dalsieVytiahnutie ? `Priebežne doložiť a dostať sa na ${K.horeHodin} hodín hore môžete znova od ${dnes(kde.dalsieVytiahnutie)}.` : `Priebežne doložiť a dostať sa na ${K.horeHodin} hodín hore môžete teraz.`;
  return (
    <section style={kartaS}>
      <span style={nadpisS}>Kde je zbierka teraz</span>
      <span style={textS}><b style={{ color: "var(--ink)" }}>{miestoT}</b> {zivaT} {vytT}</span>
      <button type="button" onClick={onDolozit} style={tlO}>Priebežne doložiť</button>
      {FLAGS.dev_tier_switcher && <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12.5, color: "var(--ink3)" }}>
        <span>DEV · darov za 30 dní:</span>
        {[undefined, 0, 2, 5].map((n) => <button key={String(n)} type="button" onClick={() => onSim(n)} style={{ minHeight: 32, padding: "0 10px", borderRadius: 9, border: `1px dashed ${simDary === n ? "var(--green)" : "var(--cardBd)"}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--ink2)" }}>{n == null ? "skutočné" : n}</button>)}
      </div>}
    </section>);
}

// ---- KARTA 39 · bod 1: Požiadať o zmenu účelu (len dlhodobá) ----
function ZmenaUcelu({ ucel, zmena, onZiadost, onSchval }: { ucel?: string; zmena?: StavZbierky["zmenaUcelu"]; onZiadost: (ucel: string, zdovodnenie: string) => void; onSchval: () => void }) {
  const [form, setForm] = useState(false);
  const [novy, setNovy] = useState("");
  const [zd, setZd] = useState("");
  const chyba = !novy.trim() ? "Napíšte nový účel" : !cistyText(zd) ? "Napíšte zdôvodnenie" : "";
  const [skus, setSkus] = useState(false);
  return (
    <section style={kartaS}>
      <span style={nadpisS}>Účel zbierky</span>
      {ucel && <span style={textS}>Zapečatený účel: <b style={{ color: "var(--ink)" }}>{zmena?.schvalena ? zmena.ucel : ucel}</b></span>}
      {zmena && !zmena.schvalena ? <>
        <span style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 9, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>Čaká na schválenie</span>
        <span style={textS}>Nový účel: <b style={{ color: "var(--ink)" }}>{zmena.ucel}</b>. Žiadosť ste poslali {dnes(zmena.podana)}. Po schválení pošleme správu všetkým darcom skôr, než sa peniaze použijú inak.</span>
        {FLAGS.dev_tier_switcher && <button type="button" onClick={onSchval} style={{ ...tlO, height: 40, fontSize: 13.5, borderStyle: "dashed" }}>Schváliť (DEV)</button>}
      </> : zmena?.schvalena ? <span style={textS}>Zmenu účelu schválil DEED+ {dnes(zmena.schvalena)}. Všetci darcovia dostali správu.</span>
      : !form ? <>
        <span style={textS}>Ak potrebujete peniaze použiť na niečo iné, požiadajte o zmenu. Po schválení dostanú správu všetci darcovia.</span>
        <button type="button" onClick={() => setForm(true)} style={tlO}>Požiadať o zmenu účelu</button>
      </> : <>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><b style={{ fontSize: 14.5, color: "var(--ink)" }}>Nový účel</b>
          <input value={novy} onChange={(e) => setNovy(e.target.value.slice(0, 80))} placeholder="Napíšte, na čo pôjdu peniaze" aria-label="Nový účel" style={poleS} /></label>
        <b style={{ fontSize: 14.5, color: "var(--ink)" }}>Zdôvodnenie</b>
        <RichTextInput vzhlad="sprava" value={zd} onChange={setZd} minH={110} ariaLabel="Zdôvodnenie" nastroje={["bold", "italic", "insertUnorderedList", "diktovat"]} />
        {skus && chyba && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "#A34A2A" }}>{chyba}</span>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setForm(false)} style={tlO}>Zrušiť</button>
          <button type="button" onClick={() => { setSkus(true); if (!chyba) { onZiadost(novy.trim(), zd); setForm(false); } }} style={tlZ}>Poslať žiadosť</button>
        </div>
      </>}
    </section>);
}

// ---- Doklady (2 stĺpce: vľavo obsah, vpravo stav) ----
/** KARTA 39 · bod 3: `nepovinne` = centrálna zbierka — dokladovanie dobrovoľné, bez povinného minima a lehoty */
export function DokladyCharity({ zbierkaId, s, zmen, vyzbierane, teraz, mobil, toast, nepovinne }: {
  zbierkaId: string; s: StavZbierky; zmen: (p: Partial<StavZbierky>) => void; vyzbierane: number; teraz: number; mobil: boolean; toast: (m: string) => void; nepovinne?: boolean;
}) {
  const pasI = pasmoPre(vyzbierane), pas = PASMA_DOKLADOV[pasI];
  const hotovo = nepovinne ? (s.doklady.length > 0 || !!s.text.trim() || s.fotky.length > 0) : pas.povinne.every((p) => splnene(p, s, vyzbierane));
  const pct = percentoDolozenia(s, vyzbierane);
  // 5. 10. · jeden textový editor (TextovePolia) a jedna galéria (GaleriaEditor) ako všade, bez PRED / PO
  const [text, setText] = useState(s.text);
  const [text2, setText2] = useState(s.text2 ?? "");
  useEffect(() => { const t = window.setTimeout(() => { if (text !== s.text || text2 !== (s.text2 ?? "")) zmen({ text, text2 }); }, 600); return () => window.clearTimeout(t); }, [text, text2]); // eslint-disable-line react-hooks/exhaustive-deps
  const media: MediumZbierky[] = s.fotky.map((f, i) => ({ id: i + 1, typ: f.typ ?? (jeVideo(f.src) ? "video" : "foto"), src: f.src, sek: f.sek, popis: f.popis === "PRED" || f.popis === "PO" ? "" : f.popis }));
  const naMedia = (m: MediumZbierky[]) => zmen({ fotky: m.map((x) => ({ src: x.src, popis: x.popis ?? "", typ: x.typ, sek: x.sek })) });
  const [form, setForm] = useState(false);
  // 5. 10. · zmazanie položky: pás „Položka odstránená · Vrátiť" na 5 s
  const [zmazane, setZmazane] = useState<PolozkaDokladu[] | null>(null);
  const zmazTm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(zmazTm.current), []);
  const zmazPolozku = (id: string) => {
    setZmazane(s.doklady); zmen({ doklady: s.doklady.filter((x) => x.id !== id) });
    window.clearTimeout(zmazTm.current); zmazTm.current = window.setTimeout(() => setZmazane(null), 5000);
  };
  const vratPolozku = () => { window.clearTimeout(zmazTm.current); if (zmazane) zmen({ doklady: zmazane }); setZmazane(null); };
  const [druh, setDruh] = useState<DruhDokladu>("Faktúra");
  const [nazov, setNazov] = useState("");
  const [dodavatel, setDodavatel] = useState("");
  const [suma, setSuma] = useState("");
  const [sken, setSken] = useState<string | undefined>();
  const [zdov, setZdov] = useState("");
  const { faza, dni } = fazaDokladovania(s, vyzbierane, Math.max(teraz, Date.now()));
  const ukoncena = s.stav === "ukoncena";

  const pridajPolozku = () => {
    const sum = Number(suma.replace(/\s/g, "").replace(",", "."));
    if (!nazov.trim()) { toast("Napíšte, čo sa kúpilo alebo na čo išli peniaze."); return; }
    if (!sum || sum <= 0) { toast("Zadajte sumu v eurách."); return; }
    zmen({ doklady: [...s.doklady, { id: `d${Date.now()}`, druh, nazov: nazov.trim(), dodavatel: dodavatel.trim(), suma: sum, datum: new Date().toISOString(), ...(sken ? { foto: sken } : {}) }] });
    setNazov(""); setDodavatel(""); setSuma(""); setSken(undefined); setForm(false);
  };
  const priloz = async (id: string, files: FileList | null) => {
    const f = files?.[0]; if (!f) return;
    try { const u = await nacitajDoklad(f); zmen({ doklady: s.doklady.map((d) => (d.id === id ? { ...d, foto: u } : d)) }); } catch (e) { toast((e as Error).message); }
  };
  const zverejni = () => {
    if (!hotovo) return;
    zmen({ zverejnene: new Date().toISOString() });
    if (nepovinne) { toast("Zverejnené. Darcovia to uvidia pri zbierke."); return; }
    pridajOznamDarcom({ zbierkaId, typ: "dolozene" }); // 2. a posledná správa darcom
    toast("Zverejnené. Darcom išla druhá a posledná správa.");
  };
  const vlavo = (<div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
    <section style={kartaS}>
      <span style={nadpisS}>Na čo išli peniaze</span>
      <TextovePolia popis={text} popis2={text2} onPopis={setText} onPopis2={setText2} ph={mobil}
        popisHlavneho="Toto darcovia uvidia hneď. Najviac 12 riadkov." />
    </section>
    <GaleriaEditor media={media} onMedia={naMedia} ph={mobil} nadpis="Fotky a video, ako ste pomohli" popisNapoveda="Napríklad: Pred opravou, Po oprave"
      dovetok=" Doklady môžete pridávať aj neskôr." />
    <section style={kartaS}>
      <span style={nadpisS}>Rozpis a doklady</span>
      {s.doklady.map((d, i) => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          {d.foto && d.foto !== OVERENY_SKEN && !jePdf(d.foto)
            ? <img src={d.foto} alt="" style={{ width: 40, height: 40, flex: "none", borderRadius: 10, objectFit: "cover" }} />
            : <button type="button" onClick={jePdf(d.foto) ? () => void otvorDoklad(d.foto!) : undefined} aria-label={jePdf(d.foto) ? "Otvoriť doklad" : "Doklad"} style={{ width: 40, height: 40, flex: "none", border: "none", borderRadius: 10, background: "var(--btn)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: jePdf(d.foto) ? "pointer" : "default" }}><IkS d={IKS.dok} s={18} /></button>}
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{d.nazov}</b>
            <span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{d.druh}{d.dodavatel ? ` · ${d.dodavatel}` : ""}</span>
            {!d.foto && <label style={{ display: "inline-flex", alignItems: "center", minHeight: 32, fontSize: 13, fontWeight: 800, color: "var(--green)", cursor: "pointer" }}>Priložiť doklad<input type="file" accept="image/*,application/pdf,.pdf" hidden onChange={(e) => { void priloz(d.id, e.target.files); e.target.value = ""; }} /></label>}</span>
          <b style={{ flex: "none", fontSize: 15, color: "var(--green)" }}>{eur(d.suma)}</b>
          <button type="button" onClick={() => zmazPolozku(d.id)} aria-label={`Odstrániť ${d.nazov}`} style={{ flex: "none", width: 36, height: 36, border: "none", background: "transparent", color: "var(--ink3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IkS d={IKS.kos} s={16} /></button>
        </div>))}
      {zmazane && <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: "#1D211B", color: "#fff" }}>
        <span style={{ flex: 1, fontSize: 14 }}>Položka odstránená</span>
        <button type="button" onClick={vratPolozku} style={{ height: 44, padding: "0 14px", border: "none", borderRadius: 12, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#1D211B" }}>Vrátiť</button>
      </div>}
      {form ? <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 14, background: "var(--field)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{DRUHY_DOKLADU.map((x) => { const on = x === druh; return <button key={x} type="button" aria-pressed={on} onClick={() => setDruh(x)} style={{ minHeight: 40, padding: "0 12px", borderRadius: 12, border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "transparent", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink2)", cursor: "pointer" }}>{x}</button>; })}</div>
        <input value={nazov} onChange={(e) => setNazov(e.target.value)} placeholder="Čo sa kúpilo, napríklad strešná krytina" aria-label="Položka" style={poleS} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 120px", gap: 10 }}>
          <input value={dodavatel} onChange={(e) => setDodavatel(e.target.value)} placeholder="Dodávateľ" aria-label="Dodávateľ" style={poleS} />
          <input value={suma} onChange={(e) => setSuma(e.target.value)} placeholder="€" inputMode="decimal" aria-label="Suma v eurách" style={{ ...poleS, textAlign: "right" }} />
        </div>
        <label style={{ ...tlO, display: "flex", alignItems: "center", gap: 8, alignSelf: "stretch", justifyContent: "center", color: sken ? "var(--gInk)" : "var(--ink2)", borderColor: sken ? "var(--gBd)" : "var(--cardBd)" }}>
          {sken ? <><IkS d={IKS.fajka} s={16} w={2.6} />{jePdf(sken) ? "PDF priložené" : "Fotka dokladu priložená"}</> : "Priložiť doklad (foto alebo PDF)"}
          <input type="file" accept="image/*,application/pdf,.pdf" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { try { setSken(await nacitajDoklad(f)); } catch (er) { toast((er as Error).message); } } }} />
        </label>
        <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Osobné údaje príjemcu (meno, adresu) na doklade pred odfotením zakryte.</span>
        <div style={{ display: "flex", gap: 10 }}><button type="button" onClick={() => setForm(false)} style={tlO}>Zrušiť</button><button type="button" onClick={pridajPolozku} style={tlZ}>Pridať položku</button></div>
      </div> : <button type="button" onClick={() => setForm(true)} style={tlO}>+ Pridať položku s dokladom</button>}
    </section>
  </div>);
  const vpravo = (<div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
    <section style={kartaS}>
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><span style={nadpisS}>Doložené použitie</span><b style={{ fontSize: 24, color: "var(--green)" }}>{pct} %</b></span>
      <span style={{ display: "block", height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: "100%", background: "var(--green)", transformOrigin: "left", transform: `scaleX(${pct / 100})`, transition: "transform .5s ease" }} /></span>
      <span style={textS}>Darcovia vidia pri zbierke „doložené {pct} %“. Položka bez dokladu sa nepočíta.</span>
    </section>
    {!nepovinne && <section style={kartaS}>
      <span style={nadpisS}>Povinné minimum · {pas.label}</span>
      {pas.povinne.map((p) => { const ok = splnene(p, s, vyzbierane); return (
        <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ink2)" }}>
          <span style={{ width: 22, height: 22, flex: "none", borderRadius: "50%", border: `2px solid ${ok ? "var(--green)" : "#BDB6A8"}`, background: ok ? "var(--green)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{ok && <IkS d={IKS.fajka} s={13} w={3} />}</span>{POZIADAVKA_TEXT[p]}
        </div>); })}
    </section>}
    {!nepovinne && ukoncena && (faza === "vyzva" || faza === "caka") && <section style={kartaS}>
      <span style={nadpisS}>Nemáte doklady?</span>
      <span style={textS}>{faza === "vyzva" ? `Lehota uplynula. Doložte, prosím, do ${dniT(dni)}, alebo napíšte zdôvodnenie.` : "Pri zbierke sa ukazuje „čaká na doklady“. Doložte, alebo napíšte zdôvodnenie."}</span>
      <textarea value={zdov} onChange={(e) => setZdov(e.target.value)} rows={2} placeholder="Nemáme doklady, pretože…" aria-label="Zdôvodnenie" style={{ ...poleS, resize: "vertical" }} />
      <button type="button" onClick={() => { if (zdov.trim().length < 20) { toast("Napíšte zdôvodnenie aspoň jednou vetou."); return; } zmen({ zdovodnenieBezDokladov: zdov.trim() }); toast("Zdôvodnenie sme poslali. Posúdi ho DEED+."); }} style={tlO}>Poslať zdôvodnenie</button>
    </section>}
    <button type="button" onClick={zverejni} aria-disabled={!hotovo} style={{ ...tlZ, alignSelf: "stretch", opacity: hotovo ? 1 : 0.5, cursor: hotovo ? "pointer" : "default" }}>{nepovinne ? (s.zverejnene ? "Aktualizovať" : "Zverejniť") : s.zverejnene ? "Aktualizovať a poslať darcom" : "Zverejniť a poslať darcom"}</button>
    <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{s.zverejnene ? `Zverejnené ${dnes(s.zverejnene)}.` : nepovinne ? "Nepovinné. Darcovia uvidia pri zbierke, na čo išli peniaze." : hotovo ? "Darcom pôjde druhá a posledná správa: na čo išli peniaze." : "Najprv doplňte povinné minimum. Darcom potom pôjde druhá a posledná správa."}</span>
    {FLAGS.dev_tier_switcher && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "var(--ink3)" }}>
      <b>DEV · vyzbierané:</b>
      {[undefined, 80, 300, 1000, 3000, 8000].map((v) => <button key={String(v)} type="button" onClick={() => zmen({ simVyzbierane: v })} style={{ minHeight: 32, padding: "0 10px", borderRadius: 16, border: `1px solid ${s.simVyzbierane === v ? "var(--green)" : "var(--cardBd)"}`, background: "transparent", fontFamily: "inherit", fontSize: 12, color: s.simVyzbierane === v ? "var(--green)" : "var(--ink3)", cursor: "pointer" }}>{v === undefined ? "skutočné" : eur(v)}</button>)}
    </div>}
  </div>);
  return <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1.3fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>{vlavo}{vpravo}</div>;
}
