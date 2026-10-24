// ============================================================
// SPRAVOVAŤ ZBIERKU (správa charity) — jedno okno pre celý život zbierky:
// aktívna → lehota dokladovania, správy darcom, predĺžiť, topovať, ukončiť
// ukončená → dokladovanie podľa pásma (povinné minimum + navyše = karma)
// Pravidlá a čísla: lib/zbierkaSprava.ts (SPRAVA_ZBIERKY_CFG, PASMA_DOKLADOV).
// ============================================================
import { QrZalozka } from "./QrNastroje";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { SvetlusikKarta } from "@/components/SvetlusikInfo";
import { odkazQrZbierky } from "@/features/verejny-profil/otvor";
import { Emo, IkonaOko } from "@/components/icons";
import { kartaVolby, FajkaVolby } from "@/components/Volby";
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
import { cistyText, sanitizujHtml } from "@/lib/richtext";
import { ZBIERKY, predvolenyStav } from "@/lib/zbierky";
import {
  SPRAVA_ZBIERKY_CFG as CFG, PASMA_DOKLADOV, POZIADAVKA_TEXT, DRUHY_DOKLADU, OVERENY_SKEN,
  nacitajStav, ulozStav, pasmoPre, sumaDokladov, splnene, navyse, percentoDolozenia, fazaDokladovania, dniDo, pridajDni, upozornenie90, UPOZORNENIE_90_TEXT, kdeJeDlhodoba,
  LEHOTA_TEXT, type StavZbierky, type Lehota, type DruhDokladu, type PolozkaDokladu, type ObsahZbierky,
} from "@/lib/zbierkaSprava";
import { identitaDarcu, relCas, zobrazenaSuma, useSektorDarcu } from "@/lib/darcovia";
import { beziaceDorovnanieNaCiel, zostatok } from "@/lib/dorovnanie";
import { cisloObjektu } from "@/lib/cisloObjektu";
import { hlavnyUcetOrg } from "./NastaveniaCharity";
import { kartaK, nadpisK, textK, obrysK, zelenyK, SpatZbierky, UkladaSa, DorovnaniePas, Taby, CislaKarta, AkoDarovat, Zapecatene, QrKarta, Statistiky, type DataStatistik } from "./spravaCasti";
import { KONFIG, TIER_LABEL, type Tier } from "./stav";
import { pridajOznamDarcom } from "@/lib/oznamyDarcom";
import { OznamDarcoviSheet } from "@/features/notifikacie/OznamDarcovi";
import type { OrgZbierka } from "./mock";
import { TextovePolia, GaleriaEditor } from "./obsahZbierky";
import { ZapecatenyText, ZapecateneFotky } from "./ZapecatenyObsah";
import { nastavAutoUzavriet, ukonciZbierku, obnovZbierku, type MediumZbierky } from "@/lib/novaZbierka";
import { KartaAutoUzavriet } from "./AutoUzavriet";
import type { FakturaOrg } from "@/lib/fakturyOrg";
import { PlatbaOrganizacie, Zaplatene } from "./PlatbaOrganizacie";
import { PribehEditor } from "./PribehEditor";
import { sumaEur } from "@/lib/suma";

const ZELENA = "var(--a-green)";
const eur = (n: number) => `${sumaEur(n)}`;
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
  const vyzbierane = z.vyzbierane + sucetDarov(z.id).suma;
  const aktivna = s.stav === "aktivna";
  const [potvrdUkoncit, setPotvrdUkoncit] = useState(false);
  const [platba, setPlatba] = useState<null | { druh: "predlzenie" } | { druh: "top"; kluc: string }>(null);
  const [podakovanie, setPodakovanie] = useState<null | { karma: number }>(null);

  const dalsiePredlzenie = CFG.predlzenia[s.predlzenia];
  const topAktivny = s.top && dniDo(s.top.do, teraz) > 0 ? s.top : null;

  const zaplat = (fa: FakturaOrg) => {
    if (!platba) return;
    if (platba.druh === "predlzenie" && dalsiePredlzenie) {
      zmen({ koniec: pridajDni(s.koniec, dalsiePredlzenie.dni), predlzenia: s.predlzenia + 1 });
      toast(`Zaplatené: predĺžené o ${dalsiePredlzenie.dni} dní · faktúra FA ${fa.cislo}`);
    }
    if (platba.druh === "top") {
      const t = CFG.topovanie.find((x) => x.kluc === platba.kluc)!;
      zmen({ top: { uroven: t.nazov, do: pridajDni(teraz, CFG.topovanieDni) } });
      toast(`Topované: ${t.nazov} na ${CFG.topovanieDni} dní · faktúra FA ${fa.cislo}`);
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

      {aktivna ? (
        <>
          <Karta nadpis="Lehota na dokladovanie" popis="Kedy doložíš, na čo peniaze išli. Darcovia to vidia pri zbierke.">
            <div style={{ display: "flex", gap: SPACE.xs }}>
              {([["30", "30 dní po skončení"], ["priebezne", "Priebežne"], ["60", "Do 60 dní"]] as [Lehota, string][]).map(([k, l]) => (
                <Cip key={k} on={s.lehota === k} onClick={() => zmen({ lehota: k })}>{l}</Cip>
              ))}
            </div>
            {s.lehota === "60" && (
              <RichTextInput value={s.zdovodnenie60 ?? ""} onChange={(h) => zmen({ zdovodnenie60: h })} minH={70} ariaLabel="Zdôvodnenie" nastroje={["bold", "italic", "insertUnorderedList", "diktovat"]}
                placeholder="Prečo potrebuješ 60 dní? (napr. faktúra od dodávateľa príde až po montáži)" />
            )}
          </Karta>

          {/* OPRAVY 110: novinky darcom počas zbierky zrušené — charita píše darcom len 2× (výsledok, na čo išli peniaze), fáza B */}

          <Karta nadpis="Predĺžiť zbierku" popis={CFG.predlzenia.map((p, i) => `${i === 0 ? "Predĺženie" : "potom"} o ${p.dni} dní za ${eur(p.cena)}`).join(", ") + "."}>
            {dalsiePredlzenie ? (
              platba?.druh === "predlzenie" ? (
                <PlatbaOrganizacie co={`Predĺžiť na Domove o ${dalsiePredlzenie.dni} dní`} cena={dalsiePredlzenie.cena} onZaplatene={(fa) => zaplat(fa)} onZrus={() => setPlatba(null)} />
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
              <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs }}>
              <div style={{ display: "flex", gap: SPACE.xs }}>
                {CFG.topovanie.map((t) => { const on = platba?.druh === "top" && platba.kluc === t.kluc; return (
                  <button key={t.kluc} onClick={() => setPlatba({ druh: "top", kluc: t.kluc })} aria-pressed={on} style={{ ...btnDruhy, flex: 1, height: 52, fontSize: 12.5, ...(on ? { border: "2px solid var(--green)" } : {}) }}>
                    <div style={{ fontWeight: 800, color: C.text }}>{t.nazov}</div><div style={{ fontSize: 11 }}>{eur(t.cena)} / týždeň</div>
                  </button>); })}
              </div>
              {platba?.druh === "top" && (() => { const t = CFG.topovanie.find((x) => x.kluc === platba.kluc)!; return <PlatbaOrganizacie co={`Topovať · ${t.nazov} · ${CFG.topovanieDni} dní`} cena={t.cena} onZaplatene={(fa) => zaplat(fa)} onZrus={() => setPlatba(null)} />; })()}
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
          <RichTextInput value={zdov} onChange={setZdov} minH={70} placeholder="Nemáme doklady, pretože…" ariaLabel="Zdôvodnenie" nastroje={["bold", "italic", "insertUnorderedList", "diktovat"]} />
          <button onClick={() => { if (cistyText(zdov).length < 20) { toast("Napíš zdôvodnenie aspoň jednou vetou"); return; } zmen({ zdovodnenieBezDokladov: zdov }); toast("Zdôvodnenie odoslané — posúdi ho DEED+"); }}
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
      <RichTextInput value={s.text} onChange={(h) => zmen({ text: h })} minH={90} ariaLabel="Na čo išli peniaze" nastroje={["bold", "italic", "insertUnorderedList", "diktovat"]}
        placeholder="Napr. Kúpili sme práčku a chladničku, v utorok ich doviezli pani Anne domov." />

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
// Beží (predĺženie na Domove, topovanie, doklady, ukončiť) · Skončila (Podarilo sa, feed, doložiť) · Doklady.
// Texty z prototypu Sprava charity PC → Zbierky → Spravovať, vykanie, bez emoji.
// ============================================================
/** zbierka, ktorú správa otvorila (mock riadok alebo spustená zbierka) */
export interface ZbierkaNaSpravu {
  id: string; nazov: string; bg: string; ciel: number; vyzbierane: number; darcovia: number;
  /** centrálna, sektorová alebo dlhodobá — predĺženie na Domove sa neukáže */
  bezPredlzenia?: boolean;
  lehota?: Lehota; lehotaText?: string;
  /** deň začiatku (ISO) a koľko dní ešte beží (mock) */
  zaciatok?: string; zostavaDni?: number; ukoncena?: boolean;
  /** KARTA 37 · bod 7: dlhodobá zbierka (od P1) — po 90 dňoch bez doloženia upozornenie */
  dlha?: boolean;
  /** KARTA 39: dĺžka dlhodobej (mesiace) a zapečatený účel */
  mesiace?: number; ucel?: string;
  /** KARTA 48: obsah zo spustenia (text, galéria, sumy), účet, odkaz, verejné číslo (VS) a organizácia */
  popis?: string; popis2?: string; media?: MediumZbierky[]; sada?: number; eurc?: boolean; sadaE?: number;
  ucet?: string; slug?: string; vs?: string; organizacia?: string; mesto?: string;
  /** OPRAVY 455 (0): stránka charity — príbeh sa ukladá k nej (bez nej ho server odmietol) */ stranka?: string;
  /** OPRAVY 526: prepínač „Po naplnení cieľa automaticky uzavrieť“ (server 0168) */ autoUzavriet?: boolean;
  /** uloží zmenený obsah späť do spustenej zbierky */
  onObsah?: (o: ObsahZbierky) => void;
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

const maskUcet = (u: string) => { const x = u.replace(/\s/g, ""); return x.length > 12 ? `${x.slice(0, 4)} ${x.slice(4, 8)} •• ${x.slice(-4)}` : u; };
const inic = (t: string) => t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function SpravaZbierky({ z, mobil, onZbierky, toast, onUdaje, onDorovnanie, tier = 0, bezDokladov, startTab, onTlacQr, onOpravit }: {
  /** OPRAVY 473 (3): Zrušiť a opraviť › — kópia zbierky na úpravu (len kým nemá dar) */ onOpravit?: () => void; z: ZbierkaNaSpravu; mobil: boolean; onZbierky: () => void; toast: (m: string) => void; onUdaje?: () => void; onDorovnanie?: () => void; tier?: number;
  /** OPRAVY 453: otvoriť rovno na záložke (QR po návrate z QR nástrojov) · Tlačiť › */ startTab?: number; onTlacQr?: (id: string) => void;
  /** KARTA 50: farnosť nič nedokladá — bez záložky Doklady, lehoty a „doložené"; výsledok napíše v ohláškach */ bezDokladov?: boolean }) {
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
  const kde = z.dlha ? kdeJeDlhodoba({ zaciatok: s.zaciatok ?? s.koniec, dary30: darcoviaPre(z.id).filter((d) => Date.now() - d.cas < KONFIG.dlhodoba.prah.dni * DEN_MS).length, vytiahnute: s.vytiahnute, teraz: Math.max(teraz, Date.now()), cfg: KONFIG.dlhodoba }) : null;
  const zmenDoklady = (patch: Partial<StavZbierky>) => {
    const novy = !!patch.doklady && patch.doklady.length > s.doklady.length;
    if (kde && s.stav === "aktivna" && novy && kde.mozeVytiahnut) { zmen({ ...patch, vytiahnute: new Date().toISOString() }); toast(`Zbierka je na ${KONFIG.dlhodoba.horeHodin} hodín hore na Domove`); }
    else zmen(patch);
  };
  const vyzbierane = z.vyzbierane + darov.suma;
  // OPRAVY 526 (0168): server zbierku uzavrel sám (cieľ naplnený) → aj Správa ju ukáže ukončenú (bez Vrátiť späť a bez výsledku darcom)
  useEffect(() => { if (z.ukoncena && s.stav === "aktivna") zmen({ stav: "ukoncena", ukoncena: new Date().toISOString(), ...(z.ciel > 0 && vyzbierane >= z.ciel ? { dovodUkoncenia: "Cieľ je splnený", autoUzavreta: true } : {}) }); }, [z.ukoncena]); // eslint-disable-line react-hooks/exhaustive-deps
  const darcov = z.darcovia + darov.pocet;
  const [tab, setTab] = useState(startTab ?? 0);
  const [conf, setConf] = useState(false);
  const aktivna = s.stav === "aktivna";
  const zac = s.zaciatok ?? pridajDni(s.koniec, -CFG.dlzkaDni);
  const vFeede = Math.max(0, dniDo(s.koniec, teraz));
  const topAktivny = s.top && dniDo(s.top.do, teraz) > 0 ? s.top : null;
  const lehT = z.lehotaText ?? LEHOTA_TEXT[s.lehota];

  // ---- obsah: text pre darcov, galéria, rýchle sumy — ukladá sa samo 600 ms po zmene ----
  const [ob, setOb] = useState<ObsahZbierky>(() => s.obsah ?? { popis: z.popis ?? "", popis2: z.popis2 ?? "", media: z.media ?? [], sada: z.sada ?? 1, eurc: z.eurc ?? true, sadaE: z.sadaE ?? 0 });
  const prvy = useRef(true);
  useEffect(() => { if (prvy.current) { prvy.current = false; return; } const t = window.setTimeout(() => { zmen({ obsah: ob }); z.onObsah?.(ob); }, 600); return () => window.clearTimeout(t); }, [ob]); // eslint-disable-line react-hooks/exhaustive-deps
  const zmenOb = (p: Partial<ObsahZbierky>) => setOb((x) => ({ ...x, ...p }));

  // ---- platby organizácie (5. 10. · C): výber → zhrnutie → Podrž a zaplať → potvrdenie s faktúrou ----
  const [topSel, setTopSel] = useState<string | null>(null);
  const [predSel, setPredSel] = useState(false);
  const [hotovo, setHotovo] = useState<{ T?: { text: string; fa: FakturaOrg }; P?: { text: string; fa: FakturaOrg } }>({});
  const predlz = (fa: FakturaOrg) => {
    const p = CFG.predlzenia[s.predlzenia]; if (!p) return;
    zmen({ koniec: pridajDni(s.koniec, p.dni), predlzenia: s.predlzenia + 1 });
    setPredSel(false); setHotovo((h) => ({ ...h, P: { text: `Zaplatené: predĺžené o ${p.dni} dní`, fa } }));
  };
  const topuj = (kluc: string, fa: FakturaOrg) => {
    const t = CFG.topovanie.find((x) => x.kluc === kluc)!;
    zmen({ top: { uroven: t.nazov, do: pridajDni(teraz, CFG.topovanieDni) } });
    setTopSel(null); setHotovo((h) => ({ ...h, T: { text: `Topované: ${t.nazov} na ${CFG.topovanieDni} dní`, fa } }));
  };
  // 5. 10. · ukončenie: hárok (prečo, čo sa stane, podrž 1,5 s) → 15 minút sa dá vrátiť, výsledok darcom odíde až potom
  const ukonci = (dovod: string, iny: string, podakovanie: string) => {
    const kedy = new Date().toISOString();
    pasVidel.current = false;
    zmen({ stav: "ukoncena", ukoncena: kedy, vratitDo: new Date(Date.now() + VRATIT_MIN * 60000).toISOString(), dovodUkoncenia: dovod, dovodIny: iny.trim() || undefined,
      podakovanieDarcom: cistyText(podakovanie).trim() ? podakovanie : undefined, vysledokPoslany: undefined }); setConf(false);
    // Martin 24. 10.: ukončená = ukončená aj na serveri (dary sa zastavia), ako vo farnosti (ukonci_zbierku)
    if (z.stranka && /^zb-/.test(z.id)) void ukonciZbierku(z.stranka, z.id).catch((e: unknown) => toast(e instanceof Error ? e.message : "Zbierku sa nepodarilo ukončiť na serveri."));
  };
  const pasVidel = useRef(false); // pás „Zbierka je ukončená" sa po ukončení raz posunie do obrazovky
  const vratit = async () => {
    // 0174: server zbierku znova otvorí (do 15 minút); keď to nejde, Správa ju neotvorí ani v appke
    if (z.stranka && /^zb-/.test(z.id)) { try { await obnovZbierku(z.stranka, z.id); } catch (e) { toast(e instanceof Error ? e.message : "Zbierku sa nepodarilo vrátiť."); return; } }
    zmen({ stav: "aktivna", ukoncena: undefined, vratitDo: undefined, dovodUkoncenia: undefined, dovodIny: undefined, podakovanieDarcom: undefined });
  };
  // KARTA 38 · bod 4: výsledok darcom posiela systém sám (1. z 2 správ) — po uplynutí 15 minút na vrátenie
  const [, tik] = useState(0);
  useEffect(() => {
    if (s.stav !== "ukoncena" || !s.vratitDo || s.vysledokPoslany) return;
    const zostava = Date.parse(s.vratitDo) - Date.now();
    const posli = () => { pridajOznamDarcom({ zbierkaId: z.id, typ: "vysledok", text: s.podakovanieDarcom ?? `Vyzbierali sme spolu ${eur(vyzbierane)} od ${darcov} darcov. Ďakujeme.` }); /* OPRAVY 459 (1): poďakovanie charity, inak výsledok */ zmen({ vysledokPoslany: new Date().toISOString(), vratitDo: undefined }); };
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
        <button type="button" onClick={() => void vratit()} style={{ height: 46, padding: "0 18px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#1D211B" }}>Vrátiť späť</button>
      </div>);
  })();

  // ---- hlavička: stav, názov, suma ----
  const denZ = Math.min(CFG.dlzkaDni, Math.max(1, Math.ceil(((s.ukoncena ? Date.parse(s.ukoncena) : teraz) - Date.parse(zac)) / DEN_MS)));
  const stavS = aktivna ? (z.dlha ? `beží ešte ${dniT(Math.max(0, dniDo(s.koniec, teraz)))}` : `končí o ${dniT(vFeede)}`) + (topAktivny ? ` · topované: ${topAktivny.uroven}` : "")
    : `skončila ${dnes(s.ukoncena ?? s.koniec)}, ${denZ}. deň z ${CFG.dlzkaDni}${bezDokladov ? "" : ` · lehota na doklady ${lehT}`}`;
  const foto = ob.media.find((m) => m.typ === "foto")?.src;
  const hlavicka = (
    <div style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "14px 16px" : "16px 20px", display: "flex", alignItems: "center", gap: mobil ? 12 : 16, flexWrap: "wrap" }}>
      <span style={{ position: "relative", overflow: "hidden", flex: "none", width: 64, height: 64, borderRadius: 16, background: foto ? "var(--track)" : z.bg }}>{foto && <img src={foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}</span>
      <span style={{ flex: 1, minWidth: mobil ? 0 : 200, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ height: 24, padding: "0 10px", borderRadius: 12, background: aktivna ? "#4B7A35" : "#5B5D53", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center" }}>{aktivna ? "BEŽÍ" : "UKONČENÁ"}</span>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{stavS}</span>
        </span>
        <b style={{ fontSize: mobil ? 18 : 21, lineHeight: 1.25 }}>{z.nazov}</b>
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: mobil ? "flex-start" : "flex-end", width: mobil ? "100%" : undefined }}>
        <b style={{ fontSize: 24, fontVariantNumeric: "tabular-nums" }}>{eur(vyzbierane)}</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{z.ciel ? `z ${eur(z.ciel)} · ` : ""}{darcov} darcov</span>
      </span>
    </div>);
  // pás dorovnania (firma dorovnáva dary ľudí)
  const dor = beziaceDorovnanieNaCiel(z.id);
  const dorPas = dor ? <DorovnaniePas ini={inic(dor.firma)} firma={dor.firma} pomer={`1 : ${dor.pomer}`} pod={`ešte ${eur(zostatok(dor))}${dor.doVycerpania ? " · do vyčerpania" : ` · do ${dnes(new Date(dor.do).toISOString())}`}`} onClick={onDorovnanie} />
    : null;

  // ---- karty záložky Nastavenie ----
  const sektor = useSektorDarcu();
  const realneDary: [string, string, string][] = darcoviaPre(z.id).slice(0, 3).map((d) => [identitaDarcu(d, undefined, sektor), relCas(d.cas), zobrazenaSuma(d) ?? ""]);
  const dary = realneDary; // OPRAVY 442: na skutočnej stránke nič vymyslené
  const pctC = z.ciel ? Math.round(vyzbierane / z.ciel * 100) : 0;
  const stavKarta = <CislaKarta nadpis="Stav zbierky" dary={dary} cisla={[
    [eur(vyzbierane), z.ciel ? `z ${eur(z.ciel)} · ${pctC} %` : "vyzbierané"], [String(darcov), "darcov"],
    aktivna ? [dniT(z.dlha ? Math.max(0, dniDo(s.koniec, teraz)) : vFeede), "do konca"] : ["skončila", dnes(s.ukoncena ?? s.koniec)]]} />;
  // OPRAVY 473: zbierka charity po spustení — text a fotky zapečatené, len doplnenia a nové fotky na koniec
  const textKarta = !bezDokladov ? <ZapecatenyText z={z} mobil={mobil} /> : (
    <section style={kartaK}>
      <span style={nadpisK}>Text pre darcov</span>
      <TextovePolia popis={ob.popis} popis2={ob.popis2} onPopis={(h) => zmenOb({ popis: h })} onPopis2={(h) => zmenOb({ popis2: h })} ph={mobil} popisHlavneho="Toto ľudia uvidia pri zbierke hneď. Najviac 12 riadkov." />
    </section>);
  const galeria = !bezDokladov ? <ZapecateneFotky z={z} mobil={mobil} /> : <GaleriaEditor media={ob.media} onMedia={(m) => zmenOb({ media: m })} ph={mobil} nadpis="Fotky a video" popisNapoveda="Popis (nepovinné), napríklad Pred opravou" dovetok="" />;
  const dalsie = CFG.predlzenia[s.predlzenia];
  const maxFeed = CFG.dlzkaDni + CFG.predlzenia.reduce((a, p) => a + p.dni, 0);
  const predlzenie = aktivna && !z.bezPredlzenia && <section style={kartaK}>
    <span style={nadpisK}>Predĺženie na Domove</span>
    <span style={textK}>{CFG.dlzkaDni} dní na Domove je v cene, ostáva {dniT(vFeede)}. Na profile zbierka beží aj bez predĺženia. Predlžuje sa vždy o {CFG.predlzenia[0].dni} dní, zaplatíte v ďalšom kroku.</span>
    {s.predlzenia > 0 && <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gInk)" }}>Zaplatené: +{CFG.predlzenia.slice(0, s.predlzenia).reduce((a, p) => a + p.dni, 0)} dní na Domove{dalsie ? "" : ` · viac sa nedá, najviac ${maxFeed} dní`}</span>}
    {dalsie && <button type="button" onClick={() => setPredSel(true)} aria-pressed={predSel} style={{ minHeight: 64, padding: "0 36px 0 18px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "var(--ink)", textAlign: "left", ...kartaVolby(predSel) }}>
      <FajkaVolby on={predSel} />
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
        <b style={{ fontSize: 15.5 }}>{s.predlzenia ? `Ďalších +${dalsie.dni} dní` : `+${dalsie.dni} dní`}</b>
        <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{CFG.predlzenia[s.predlzenia + 1] ? `ďalšie predĺženie bude za ${eur(CFG.predlzenia[s.predlzenia + 1].cena)}` : "posledné možné predĺženie"}</span>
      </span>
      <b style={{ fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{eur(dalsie.cena)}</b>
    </button>}
    {dalsie && predSel && <PlatbaOrganizacie co={`Predĺžiť na Domove o ${dalsie.dni} dní`} cena={dalsie.cena} onZaplatene={predlz} onZrus={() => setPredSel(false)} onUdaje={onUdaje} />}
    {hotovo.P && !predSel && <Zaplatene text={hotovo.P.text} fa={hotovo.P.fa} />}
  </section>;
  const topovat = aktivna && <section style={kartaK}>
    <span style={nadpisK}>Topovať</span>
    <span style={textK}>Na {CFG.topovanieDni} dní bude zbierka vyššie na Domove. Vyberte, kde. Zaplatíte až v ďalšom kroku.</span>
    <div role="radiogroup" aria-label="Kde topovať" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {CFG.topovanie.map((t) => { const on = topAktivny ? topAktivny.uroven === t.nazov : topSel === t.kluc; const dis = !!topAktivny; return (
        <button key={t.kluc} type="button" role="radio" aria-checked={on} aria-disabled={dis || undefined} onClick={() => { if (!dis) setTopSel(t.kluc); }} style={{ minHeight: 64, padding: 8, borderRadius: 14, cursor: dis ? "default" : "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "var(--ink)", opacity: dis && !on ? 0.5 : 1, ...kartaVolby(on) }}>
          <FajkaVolby on={on} />
          <b style={{ fontSize: 15 }}>{t.nazov}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{eur(t.cena)} · {CFG.topovanieDni} dní</span>
        </button>); })}
    </div>
    {topSel && !topAktivny && (() => { const t = CFG.topovanie.find((x) => x.kluc === topSel)!; return <PlatbaOrganizacie co={`Topovať · ${t.nazov} · ${CFG.topovanieDni} dní`} cena={t.cena} onZaplatene={(fa) => topuj(t.kluc, fa)} onZrus={() => setTopSel(null)} onUdaje={onUdaje} />; })()}
    {hotovo.T ? <Zaplatene text={hotovo.T.text} fa={hotovo.T.fa} />
      : topAktivny && <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gInk)" }}>Topované: {topAktivny.uroven} na {CFG.topovanieDni} dní · do {dnes(topAktivny.do)}</span>}
  </section>;
  const upoz = aktivna && z.dlha && upozornenie90(s, zac, Math.max(teraz, Date.now()));
  const dlhaKarty = aktivna && <>
    {kde && <KdeJeTeraz kde={kde} dary30={darcoviaPre(z.id).filter((d) => Date.now() - d.cas < KONFIG.dlhodoba.prah.dni * DEN_MS).length} onDolozit={() => setTab(1)} />}
    {z.dlha && <ZmenaUcelu ucel={z.ucel} zmena={s.zmenaUcelu} onZiadost={(ucel, zdovodnenie) => zmen({ zmenaUcelu: { ucel, zdovodnenie, podana: new Date().toISOString() } })} />}
  </>;
  const koniecPodakovania = pridajDni(zac, CFG.podakovanieDni);
  const dniPodakovania = dniDo(koniecPodakovania, teraz);
  const voFeede = !s.stiahnuta && dniPodakovania > 0;
  const feedPodakovanie = !aktivna && <section style={kartaK}>
    <span style={nadpisK}>{voFeede ? `Na Domove ešte ${dniT(dniPodakovania)} ako poďakovanie` : "Stiahnutá z Domova"}</span>
    <span style={textK}>{voFeede ? "Zbierka skončila skôr, preto ostane na Domove do konca svojich 30 dní s nápisom Podarilo sa. Darcovia aj zbierka sú vidno. Stiahnuť ju môžete kedykoľvek." : "Zbierka je už len na vašom profile."}</span>
    {voFeede && <button type="button" onClick={() => zmen({ stiahnuta: new Date().toISOString() })} style={obrysK}>Stiahnuť z Domova</button>}
  </section>;
  const ako = <AkoDarovat sada={ob.sada} eurc={ob.eurc} sadaE={ob.sadaE} onZmena={zmenOb} bezi={aktivna} />;
  const zap = <Zapecatene riadky={[["Cieľ", z.ciel ? eur(z.ciel) : "bez cieľa"], ["Účel", z.ucel ?? "—"], ["Účet", maskUcet(z.ucet ?? hlavnyUcetOrg())], ...(bezDokladov ? [] : [["Lehota na doklady", z.lehotaText ?? (s.lehota === "30" ? "30 dní po skončení" : lehT)] as [string, string]])]}>
    {onOpravit && aktivna && darcov === 0 && <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--cardBd)" }}>
      <span style={textK}>Zbierka zatiaľ nemá žiadny dar. Môžete ju zrušiť a opraviť celú. Z-číslo a QR ostanú rovnaké.</span>
      <button type="button" onClick={onOpravit} style={obrysK}>Zrušiť a opraviť ›</button>
    </div>}
  </Zapecatene>;
  // OPRAVY 358: ten istý QR ako v QR nástrojoch — /z/{id} (adresa sa hľadá podľa id zbierky, nie podľa názvu)
  const qr = <QrKarta nazov={z.nazov} slug={z.id} odkaz={odkazQrZbierky(z.id)} cislo={cisloObjektu("Z", z.id, z.vs)} organizacia={z.organizacia} toast={toast} />;
  const vlavo = <>{stavKarta}{textKarta}{galeria}</>;
  // OPRAVY 526: zbierka s cieľom — prepínač automatického uzavretia (zmena hneď na serveri; zapnutie pri naplnenej ju uzavrie)
  const autoKarta = aktivna && z.ciel > 0 && !!z.stranka && <KartaAutoUzavriet key={`auto-${z.id}`} zapnute={z.autoUzavriet ?? true} styl={kartaK} uloz={async (v) => {
    const r = await nastavAutoUzavriet(z.stranka, z.id, v);
    if ("chyba" in r) return r.chyba;
    if (r.uzavreta) zmen({ stav: "ukoncena", ukoncena: new Date().toISOString(), dovodUkoncenia: "Cieľ je splnený", autoUzavreta: true });
    return null; }} />;
  const autoPas = !aktivna && s.autoUzavreta && <section role="status" style={{ ...kartaK, background: "var(--gSoft)", border: "2px solid var(--green)" }}>
    <span style={{ ...nadpisK, color: "var(--gInk)" }}>Zbierka sa naplnila a uzavrela sama</span>
    <span style={textK}>Suma dosiahla cieľ, dary sa zastavili a beží lehota na dokladovanie. Darcom poďakujte sami.</span>
  </section>;
  const vpravo = <>{autoPas}{predlzenie}{topovat}{dlhaKarty}{feedPodakovanie}{ako}{autoKarta}{zap}{qr}</>;
  const stlpce = (l: ReactNode, p: ReactNode, sl = "minmax(0,1.3fr) minmax(0,1fr)") => mobil
    ? <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{l}{p}</div>
    : <div style={{ display: "grid", gridTemplateColumns: sl, gap: 16, alignItems: "start" }}><div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{l}</div><div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{p}</div></div>;

  // ---- Štatistiky: zatiaľ testovacie čísla podľa prototypu, inak z darov ----
  const stat: DataStatistik = {
    // OPRAVY 442 doplnok 3: dary po dňoch zo skutočných darov (posledných 10 dní), bez čísel, ktoré appka nepozná
    obdobie: `od ${dnes(zac).replace(/ \d{4}$/, "")}`, od: dnes(zac).replace(/ \d{4}$/, ""),
    dni: Array.from({ length: 10 }, (_, i) => { const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - (9 - i)); const d1 = d0.getTime() + DEN_MS; return darcoviaPre(z.id).filter((r) => r.cas >= d0.getTime() && r.cas < d1).length; }),
    // OPRAVY 484 (b): odkiaľ prišli peniaze — skutky, reťaze a firmy zo skutočných darov, zvyšok priamo
    cez: (() => {
      const dary = darcoviaPre(z.id);
      const sk = dary.filter((r) => r.cezSkutok).reduce((a, r) => a + r.suma, 0);
      const nSk = new Set(dary.filter((r) => r.cezSkutok).map((r) => r.cezSkutokId ?? r.cezSkutok)).size;
      const rt = dary.filter((r) => !r.cezSkutok && r.cezTvorcu?.startsWith("rt-")).reduce((a, r) => a + r.suma, 0);
      const fi = dary.filter((r) => r.firma).reduce((a, r) => a + r.suma, 0);
      const l: [string, number, string][] = [["Priamo na zbierke", Math.max(0, vyzbierane - sk - rt - fi), "Domov a profil"]];
      if (sk > 0) l.push(["Zo skutkov", sk, nSk === 1 ? "1 skutok" : `${nSk} ${nSk < 5 ? "skutky" : "skutkov"}`]);
      if (rt > 0) l.push(["Cez reťaz dobra", rt, "časť pre zbierku"]);
      if (fi > 0) l.push(["Firmy", fi, "dorovnanie a príspevky"]);
      return l.sort((x, y) => y[1] - x[1]);
    })(), split: [],
    darcovia: [[String(darcov), "darcov"], ...(() => { const f = new Set(darcoviaPre(z.id).filter((r) => r.firma).map((r) => r.firma)).size; return f ? [[String(f), f === 1 ? "firma" : "firmy"] as [string, string]] : []; })()], dary: realneDary,
  };
  const { faza, dni } = fazaDokladovania(s, vyzbierane, Math.max(teraz, Date.now()));
  const ukoncenie = aktivna ? <section style={kartaK}>
      <span style={nadpisK}>Ukončiť zbierku</span>
      <span style={textK}>Ukončiť môžete kedykoľvek, napríklad keď je cieľ splnený. Dary sa potom zastavia.</span>
      <button type="button" onClick={() => setConf(true)} style={obrysK}>Ukončiť zbierku…</button>
    </section>
    : bezDokladov ? <section style={{ ...kartaK, gap: 8 }}>
        <span style={nadpisK}>Zbierka je ukončená</span>
        <span style={textK}>Výsledok napíšte veriacim v ohláškach.</span>
      </section>
    : <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section style={{ ...kartaK, gap: 8 }}>
        <span style={nadpisK}>Zbierka je ukončená</span>
        <span style={textK}>{faza === "dolozene" ? `Doložené použitie: ${percentoDolozenia(s, vyzbierane)} %.` : faza === "lehota" ? `Lehota na doklady beží ešte ${dniT(dni)}. Doklady pridáte v záložke Doklady.` : faza === "vyzva" ? `Lehota uplynula. Doložte, prosím, do ${dniT(dni)}, inak sa pri zbierke ukáže „čaká na doklady“.` : "Pri zbierke sa na profile ukazuje „čaká na doklady“. Doklady pridáte v záložke Doklady."}</span>
        {faza !== "dolozene" && <button type="button" onClick={() => setTab(1)} style={obrysK}>Doklady</button>}
      </section>
    </div>;


  return (<>
    <SpatZbierky onClick={onZbierky} />
    <UkladaSa />
    {vratitPas}
    {hlavicka}
    {dorPas}
    {upoz && <section role="status" style={{ ...kartaK, background: "var(--goldBg)", border: "1.5px solid var(--goldBd)" }}>
      <span style={{ ...textK, fontSize: 15, color: "var(--ink)" }}>{UPOZORNENIE_90_TEXT}</span>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setTab(1)} style={tlZ}>Doložiť</button>
        <button type="button" onClick={() => zmen({ upozornenie90Zavrete: new Date().toISOString() })} style={tlO}>Teraz nie</button>
      </div>
    </section>}
    <Taby akt={tab} onTab={setTab} skryte={bezDokladov ? [1] : []} pribeh qr={!!z.stranka} />
    {tab === 0 && stlpce(vlavo, vpravo)}
    {tab === 1 && !bezDokladov && <DokladyCharity zbierkaId={z.id} s={s} zmen={zmenDoklady} vyzbierane={vyzbierane} teraz={teraz} mobil={mobil} toast={toast} onHotovo={() => setTab(0)} />}
    {tab === 2 && <Statistiky d={stat} tier={tier} mobil={mobil} toast={toast} />}
    {tab === 3 && ukoncenie}
    {tab === 4 && <PribehEditor z={z} mobil={mobil} toast={toast} />}
    {/* OPRAVY 453: záložka QR aj pri bežnej zbierke charity (ako centrálna a farnosť) */}
    {tab === 5 && z.stranka && <QrZalozka strankaId={z.stranka} meno={z.organizacia ?? ""} id={z.id} mobil={mobil} charita onTlac={onTlacQr} />}
    {conf && <UkoncitHarok mobil={mobil} vyzbierane={vyzbierane} darcov={darcov} ciel={z.ciel} lehota={bezDokladov ? null : lehT} onUkonci={ukonci} onZavri={() => setConf(false)} />}
  </>);
}

const VRATIT_MIN = 15;
const DOVODY_UKONCENIA = ["Cieľ je splnený", "Už to nepotrebujeme", "Iný dôvod"];
/** 5. 10. · hárok „Ukončiť zbierku?" (PC v strede, mobil zdola): Prečo končíte → Poďakovanie → Čo sa stane → Podrž a ukonči (1,5 s) · Nechať bežať
 *  OPRAVY 459: „Cieľ je splnený“ len pri vyzbieranom ≥ cieľ · „Iný dôvod“ krátke pole (len DEED) · jediné poďakovanie darcom s náhľadom */
function UkoncitHarok({ mobil, vyzbierane, darcov, ciel, lehota, onUkonci, onZavri }: { mobil: boolean; vyzbierane: number; darcov: number; ciel?: number; lehota: string | null; onUkonci: (dovod: string, iny: string, podakovanie: string) => void; onZavri: () => void }) {
  const [vidno, setVidno] = useState(false);
  const dovody = DOVODY_UKONCENIA.filter((d) => d !== "Cieľ je splnený" || (!!ciel && vyzbierane >= ciel));
  const [dovod, setDovod] = useState<string | null>(null);
  const [iny, setIny] = useState("");
  const [dak, setDak] = useState(`<p>Ďakujeme. Vyzbierali sme spolu ${eur(vyzbierane)} od ${darcov} ${darcov === 1 ? "darcu" : "darcov"}. Čo bude ďalej, uvidíte na stránke zbierky.</p>`);
  const [drz, setDrz] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setVidno(true))); return () => { cancelAnimationFrame(r); window.clearTimeout(tm.current); }; }, []);
  const zavri = () => { setVidno(false); window.setTimeout(onZavri, 260); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  const zacni = () => { if (dovod == null) return; setDrz(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => { setDrz(false); onUkonci(dovod, dovod === "Iný dôvod" ? iny : "", dak); }, 1500); };
  const pusti = () => { window.clearTimeout(tm.current); setDrz(false); };
  const sekcia: CSSProperties = { fontSize: 14, fontWeight: 800, color: "var(--ink3)", letterSpacing: ".04em" };
  const karta: CSSProperties = { position: "fixed", zIndex: 91, background: "var(--bg)", color: "var(--ink)", boxShadow: "0 30px 80px rgba(0,0,0,.45)", padding: 22, display: "flex", flexDirection: "column", gap: 14, maxHeight: "92vh", overflowY: "auto" };
  return createPortal(
    <div className="sprava-charity" style={{ background: "transparent", minHeight: 0 }}>
      <div onClick={zavri} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(10,8,5,.6)", opacity: vidno ? 1 : 0, transition: "opacity .25s ease" }} />
      <div role="dialog" aria-modal="true" aria-label="Ukončiť zbierku" style={mobil
        ? { ...karta, left: 0, right: 0, bottom: 0, borderRadius: "26px 26px 0 0", paddingBottom: "max(24px, env(safe-area-inset-bottom))", transform: `translateY(${vidno ? "0%" : "105%"})`, transition: "transform .32s cubic-bezier(.2,.8,.2,1)" }
        : { ...karta, left: "50%", top: "50%", width: "min(560px, calc(100% - 32px))", borderRadius: 26, opacity: vidno ? 1 : 0, transform: `translate(-50%, -50%) scale(${vidno ? 1 : 0.94})`, transition: "opacity .25s ease, transform .3s ease" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <b style={{ fontSize: 21 }}>Ukončiť zbierku?</b>
        <span style={sekcia}>PREČO KONČÍTE</span>
        <div role="radiogroup" aria-label="Prečo končíte" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dovody.map((t) => { const on = dovod === t; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setDovod(t)} style={{ minHeight: 50, padding: "0 16px", borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: 15.5, fontWeight: 700, color: "var(--ink)" }}>{t}</button>); })}
        </div>
        {dovod === "Iný dôvod" && <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input value={iny} onChange={(e) => setIny(e.target.value.slice(0, 200))} placeholder="Krátko, prečo končíte (nepovinné)" aria-label="Iný dôvod"
            style={{ height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", fontSize: 16, fontFamily: "inherit" }} />
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>Vidí to len DEED, darcovia nie.</span>
        </label>}
        <TextovePolia popis={dak} popis2="" onPopis={setDak} onPopis2={() => {}} ph={mobil} bezPokracovania
          nadpis1="Poďakovanie darcom · nepovinné" popis1="Jediné poďakovanie zbierky. Darcom odíde o 15 minút spolu s výsledkom. Môžete ho prepísať." />
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink3)" }}>Takto to dostane darca</span>
        <div style={{ padding: 14, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 16 }}>Novinka zo zbierky</b>
          {cistyText(dak).trim()
            ? <div className="ftext" style={{ fontSize: 14.5, lineHeight: 1.55, padding: 12, borderRadius: 8, borderLeft: "3px solid var(--green)", background: "var(--gSoft)" }} dangerouslySetInnerHTML={{ __html: sanitizujHtml(dak) }} />
            : <div style={{ fontSize: 14.5, lineHeight: 1.55, padding: 12, borderRadius: 8, borderLeft: "3px solid var(--green)", background: "var(--gSoft)" }}>Vyzbierali sme spolu {eur(vyzbierane)} od {darcov} {darcov === 1 ? "darcu" : "darcov"}. Ďakujeme.</div>}
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>Ďakujeme, že pomáhaš.</span>
        </div>
        <span style={sekcia}>ČO SA STANE</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>
          <span>· Dary sa zastavia. Vyzbierali ste <b style={{ color: "var(--ink)" }}>{eur(vyzbierane)}</b> od {darcov} darcov.</span>
          <span>· Darcom pošleme výsledok aj poďakovanie o {VRATIT_MIN} minút. Dovtedy to môžete vrátiť.</span>
          {lehota && <span>· Začne plynúť lehota na doklady: {lehota}.</span>}
        </div>
        <button type="button" aria-disabled={dovod == null} onPointerDown={(e) => { if (dovod == null) return; e.currentTarget.setPointerCapture(e.pointerId); zacni(); }} onPointerUp={pusti} onPointerCancel={pusti}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") pusti(); }} onContextMenu={(e) => e.preventDefault()}
          style={{ position: "relative", height: 58, border: "none", borderRadius: 16, background: dovod == null ? "var(--btn)" : "#7A3A2C", overflow: "hidden", cursor: dovod == null ? "default" : "pointer", touchAction: "none", userSelect: "none", fontFamily: "inherit" } as CSSProperties}>
          <span style={{ position: "absolute", inset: 0, background: "#A34A2A", transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? "1.5s" : ".2s"} linear` }} />
          <span style={{ position: "relative", fontSize: 16, fontWeight: 800, color: dovod == null ? "var(--ink3)" : "#fff" }}>Podrž a ukonči zbierku</span>
        </button>
        {dovod == null && <SvetlusikKarta chyba>Vyberte, prečo končíte.</SvetlusikKarta>}
        <button type="button" onClick={zavri} style={{ height: 44, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink3)" }}>Nechať bežať</button>
        </div>
      </div>
    </div>, document.body);
}

// ---- KARTA 39 · bod 1: Kde je zbierka teraz (dlhodobá) ----
function KdeJeTeraz({ kde, dary30, onDolozit }: { kde: ReturnType<typeof kdeJeDlhodoba>; dary30: number; onDolozit: () => void }) {
  const K = KONFIG.dlhodoba;
  const dar = (n: number) => `${n} ${n === 1 ? "dar" : n >= 2 && n <= 4 ? "dary" : "darov"}`;
  const miestoT = { velka: `Na Domove ako veľká karta, prvých ${K.velkaDni} dní.`, hore: `Na Domove hore ako veľká karta, ${K.horeHodin} hodín po doložení.`, mala: "Na Domove ako malá karta.", profil: "Len na vašom profile, na Domove teraz nie je." }[kde.miesto];
  const zivaT = kde.ziva ? `Zbierka je živá: ${dar(dary30)} za posledných ${K.prah.dni} dní, treba aspoň ${K.prah.dary}.` : `Zbierka nie je živá: ${dar(dary30)} za posledných ${K.prah.dni} dní, treba aspoň ${K.prah.dary}.`;
  const vytT = kde.dalsieVytiahnutie ? `Priebežne doložiť a dostať sa na ${K.horeHodin} hodín hore môžete znova od ${dnes(kde.dalsieVytiahnutie)}.` : `Priebežne doložiť a dostať sa na ${K.horeHodin} hodín hore môžete teraz.`;
  return (
    <section style={kartaS}>
      <span style={nadpisS}>Kde je zbierka teraz</span>
      <span style={textS}><b style={{ color: "var(--ink)" }}>{miestoT}</b> {zivaT} {vytT}</span>
      <button type="button" onClick={onDolozit} style={tlO}>Priebežne doložiť</button>
    </section>);
}

// ---- KARTA 39 · bod 1: Požiadať o zmenu účelu (len dlhodobá) ----
function ZmenaUcelu({ ucel, zmena, onZiadost }: { ucel?: string; zmena?: StavZbierky["zmenaUcelu"]; onZiadost: (ucel: string, zdovodnenie: string) => void }) {
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
export function DokladyCharity({ s, zmen, vyzbierane, teraz, mobil, toast, nepovinne, onHotovo }: {
  zbierkaId: string; s: StavZbierky; zmen: (p: Partial<StavZbierky>) => void; vyzbierane: number; teraz: number; mobil: boolean; toast: (m: string) => void; nepovinne?: boolean;
  /** OPRAVY 456 (5): „Hotovo · späť na zbierku“ */ onHotovo?: () => void;
}) {
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
  const [druh, setDruh] = useState<DruhDokladu>("Bloček");
  const [chyba, setChyba] = useState("");
  const [nazov, setNazov] = useState("");
  const [dodavatel, setDodavatel] = useState("");
  const [suma, setSuma] = useState("");
  const [sken, setSken] = useState<{ strany: string[]; subor: string } | undefined>();
  const [nahrava, setNahrava] = useState(false);
  const [nadZonou, setNadZonou] = useState(false);
  // OPRAVY 456 (2): viac strán naraz (PDF, JPG, PNG, HEIC); pretiahnutý súbor sa nahrá, neotvorí v prehliadači
  const nahrajSubory = async (l: File[]) => {
    if (!l.length) return;
    setNahrava(true); setChyba("");
    try { const strany: string[] = []; for (const f of l.slice(0, 10)) strany.push(await nacitajDoklad(f)); setSken({ strany, subor: l.length > 1 ? `${l[0].name} a ďalšie (${l.length})` : l[0].name }); }
    catch (e) { setChyba((e as Error).message || "Súbor sa nepodarilo načítať. Skúste PDF alebo JPG."); }
    setNahrava(false);
  };
  const [zdov, setZdov] = useState("");
  const { faza, dni } = fazaDokladovania(s, vyzbierane, Math.max(teraz, Date.now()));
  const ukoncena = s.stav === "ukoncena";

  const pridajPolozku = () => {
    const sum = Number(suma.replace(/\s/g, "").replace(",", "."));
    // KARTA 48: chyby slovom priamo vo formulári, príloha (foto alebo PDF) je povinná
    if (!nazov.trim()) { setChyba("Napíšte, čo sa kúpilo."); return; }
    if (!sum || sum <= 0) { setChyba("Zadajte sumu v eurách."); return; }
    if (!sken) { setChyba("Priložte doklad (PDF alebo fotku). Bez neho sa položka nepočíta."); return; }
    zmen({ doklady: [...s.doklady, { id: `d${Date.now()}`, druh, nazov: nazov.trim(), dodavatel: dodavatel.trim(), suma: sum, datum: new Date().toISOString(), foto: sken.strany[0], ...(sken.strany.length > 1 ? { strany: sken.strany.slice(1) } : {}), subor: sken.subor }] });
    setNazov(""); setDodavatel(""); setSuma(""); setSken(undefined); setChyba(""); setForm(false);
  };
  const priloz = async (id: string, files: FileList | null) => {
    const f = files?.[0]; if (!f) return;
    try { const u = await nacitajDoklad(f); zmen({ doklady: s.doklady.map((d) => (d.id === id ? { ...d, foto: u } : d)) }); } catch (e) { toast((e as Error).message); }
  };
  // KARTA 48: doklady sa nezverejňujú — overuje ich DEED+ (do 48 hodín), na profile je len „Overené DEED+".
  // Druhú a poslednú správu darcom pošle server, keď DEED+ doklady overí.
  // OPRAVY 456 (5): odoslané sa pamätá pri každej položke (staré odoslanie celé naraz platí pre položky pridané dovtedy)
  const odoslanaPol = (d: PolozkaDokladu) => d.odoslane ?? (s.odoslaneNaOverenie && d.datum <= s.odoslaneNaOverenie ? s.odoslaneNaOverenie : undefined);
  const nove = s.doklady.filter((d) => !!d.foto && (!odoslanaPol(d) || !!d.vratene));
  const odoslat = () => {
    if (!nove.length) return;
    const kedy = new Date().toISOString();
    zmen({ odoslaneNaOverenie: kedy, zverejnene: s.zverejnene ?? kedy, doklady: s.doklady.map((d) => (nove.some((x) => x.id === d.id) ? { ...d, odoslane: kedy, vratene: undefined } : d)) });
  };
  const sumaVsetkych = s.doklady.reduce((a, d) => a + d.suma, 0);
  const cakaju = s.doklady.some((d) => odoslanaPol(d) && !d.overene && !d.vratene && !d.zamietnute);
  const stavPol = (d: PolozkaDokladu): [string, string, string] => d.overene ? ["Overené ✓", "var(--gSoft)", "var(--gInk)"] : d.zamietnute ? ["Zamietnuté", "#F3DAD3", "#8E2F1E"]
    : d.vratene ? [`Vrátené · ${d.vratene}`, "#F6E7C9", "#7A5212"] : odoslanaPol(d) ? ["Čaká na overenie", "var(--btn)", "var(--ink2)"] : ["Neodoslané", "var(--btn)", "var(--ink3)"];
  const mesiac = new Date().toISOString().slice(0, 7);
  const tentoMes = s.doklady.filter((d) => d.datum.slice(0, 7) === mesiac);
  const zona = (
    <div onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (!nadZonou) setNadZonou(true); }} onDragLeave={() => setNadZonou(false)}
      onDrop={(e) => { e.preventDefault(); setNadZonou(false); void nahrajSubory(Array.from(e.dataTransfer.files ?? [])); }}
      style={{ borderRadius: 14, border: `2px dashed ${nadZonou ? "var(--green)" : "var(--gBd)"}`, background: nadZonou ? "var(--gSoft)" : "transparent", padding: 12 }}>
      {sken ? <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {jePdf(sken.strany[0])
            ? <object data={sken.strany[0]} type="application/pdf" aria-label="Náhľad prvej strany" style={{ width: 64, height: 84, flex: "none", borderRadius: 8, background: "#fff", pointerEvents: "none" }}><span style={{ display: "flex", width: 64, height: 84, alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#7A3A2C" }}>PDF</span></object>
            : <img src={sken.strany[0]} alt="Náhľad prvej strany" style={{ width: 64, height: 84, flex: "none", borderRadius: 8, objectFit: "cover", background: "#fff" }} />}
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 14, overflowWrap: "anywhere" }}>{sken.subor}</b>
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>{sken.strany.length} {sken.strany.length === 1 ? "strana" : sken.strany.length < 5 ? "strany" : "strán"}</span>
          </span>
          <label style={{ ...tlO, display: "inline-flex", alignItems: "center", flex: "none" }}>Zmeniť
            <input type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/heic,image/heif,.heic,.heif" multiple hidden onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ""; void nahrajSubory(l); }} /></label>
        </div>
        : <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: 92, justifyContent: "center", cursor: "pointer", textAlign: "center" }}>
          <b style={{ fontSize: 15, color: "var(--green)" }}>{nahrava ? "Nahráva sa…" : "Pretiahnite sem doklad alebo ťuknite"}</b>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>PDF, JPG, PNG alebo HEIC · aj viac strán naraz</span>
          <input type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/heic,image/heif,.heic,.heif" multiple hidden onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ""; void nahrajSubory(l); }} />
        </label>}
    </div>);
  const doklady = (
    <section style={kartaS}>
      <span style={nadpisS}>Doklady na kontrolu</span>
      <span style={textS}>Súkromné, vidí ich len DEED+.</span>
      <SvetlusikKarta><span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <b>Doklad musí byť čitateľný:</b><span>celá strana, ostrý, nie rozmazaný ani vyblednutý, bez odlesku. Najlepšie PDF z účtovníctva alebo sken.</span>
        <span>· Nečitateľný doklad nemusí byť uznaný.</span><span>· Doklady posúdime do 48 hodín.</span>
        <span>· Pošlite všetko, aj citlivé údaje (mená, rodné čísla, lekárske správy). Doklady nikde nezverejníme, slúžia len na overenie.</span>
      </span></SvetlusikKarta>
      <SvetlusikKarta chyba><span><b>Falošný alebo upravený doklad = podvod.</b> Pri pokuse alebo dokázanom podvode charita stratí štít a hodnotenie, zbierky sa zastavia a stránka môže byť pozastavená dočasne alebo natrvalo.</span></SvetlusikKarta>
      {s.doklady.map((d, i) => { const [st, bg, c] = stavPol(d); return (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          {d.foto && d.foto !== OVERENY_SKEN && !jePdf(d.foto)
            ? <img src={d.foto} alt="" style={{ width: 40, height: 40, flex: "none", borderRadius: 10, objectFit: "cover" }} />
            : <button type="button" onClick={jePdf(d.foto) ? () => void otvorDoklad(d.foto!) : undefined} aria-label={jePdf(d.foto) ? "Otvoriť doklad" : "Doklad"} style={{ width: 40, height: 40, flex: "none", border: "none", borderRadius: 10, background: "var(--btn)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: jePdf(d.foto) ? "pointer" : "default" }}><IkS d={IKS.dok} s={18} /></button>}
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14.5 }}>{d.nazov}</b>
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>{d.druh}{d.dodavatel ? ` · ${d.dodavatel}` : ""}{d.strany?.length ? ` · ${d.strany.length + 1} strany` : ""}</span>
            {d.subor && <span style={{ fontSize: 12.5, color: "var(--ink3)", overflowWrap: "anywhere" }}>{d.subor}</span>}{/* Martin 20. 10.: pri PDF aj názov súboru */}
            {d.foto && <span style={{ alignSelf: "flex-start", marginTop: 4, minHeight: 22, padding: "2px 8px", borderRadius: 11, background: bg, color: c, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center" }}>{st}</span>}
            {!d.foto && <label style={{ display: "inline-flex", alignItems: "center", minHeight: 32, fontSize: 13, fontWeight: 800, color: "var(--green)", cursor: "pointer" }}>Priložiť doklad<input type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/heic,image/heif,.heic,.heif" hidden onChange={(e) => { void priloz(d.id, e.target.files); e.target.value = ""; }} /></label>}
          </span>
          <b style={{ flex: "none", fontSize: 15, color: "var(--green)" }}>{eur(d.suma)}</b>
          {!d.overene && <button type="button" onClick={() => zmazPolozku(d.id)} aria-label={`Odstrániť ${d.nazov}`} style={{ flex: "none", width: 36, height: 36, border: "none", background: "transparent", color: "var(--ink3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IkS d={IKS.kos} s={16} /></button>}
        </div>); })}
      {zmazane && <div role="status" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14, background: "#1D211B", color: "#fff" }}>
        <span style={{ flex: 1, fontSize: 14 }}>Položka odstránená</span>
        <button type="button" onClick={vratPolozku} style={{ height: 44, padding: "0 14px", border: "none", borderRadius: 12, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#1D211B" }}>Vrátiť</button>
      </div>}
      {form ? <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 14, background: "var(--field)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{DRUHY_DOKLADU.map((x) => { const on = x === druh; return <button key={x} type="button" aria-pressed={on} onClick={() => setDruh(x)} style={{ minHeight: 40, padding: "0 12px", borderRadius: 12, border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--card)", color: on ? "var(--gInk)" : "var(--ink2)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700 }}>{x}</button>; })}</div>
        <input value={nazov} onChange={(e) => setNazov(e.target.value)} placeholder="Čo sa kúpilo, napríklad strešná krytina" aria-label="Položka" style={poleS} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 120px", gap: 10 }}>
          <input value={dodavatel} onChange={(e) => setDodavatel(e.target.value)} placeholder="Dodávateľ" aria-label="Dodávateľ" style={poleS} />
          <input value={suma} onChange={(e) => setSuma(e.target.value)} placeholder="€" inputMode="decimal" aria-label="Suma v eurách" style={{ ...poleS, textAlign: "right" }} />
        </div>
        {zona}
        {chyba && <SvetlusikKarta chyba>{chyba}</SvetlusikKarta>}
        <div style={{ display: "flex", gap: 10 }}><button type="button" onClick={() => { setForm(false); setChyba(""); setSken(undefined); }} style={tlO}>Zrušiť</button><button type="button" onClick={pridajPolozku} style={{ ...zelenyK, alignSelf: "flex-start" }}>Pridať položku</button></div>
      </div> : <button type="button" onClick={() => setForm(true)} style={tlO}>+ Pridať položku s dokladom</button>}
    </section>);
  const vlavo = (<div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
    {/* OPRAVY 456 (1): navrchu Doklady na kontrolu, pod tým Fotky výsledku, pod tým Na čo išli peniaze */}
    {doklady}
    <GaleriaEditor media={media} onMedia={naMedia} ph={mobil} bezVerejnych bezHlavnej nadpis={nepovinne ? "Fotky a video k dokladom" : "Fotky výsledku"} popisNapoveda="Popis (nepovinné), napríklad Po oprave"
      dovetok=""><span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink2)" }}>Tieto fotky uvidia všetci. Doklady sem nedávajte.</span></GaleriaEditor>
    <section style={kartaS}>
      <span style={nadpisS}>Na čo išli peniaze</span>
      <TextovePolia popis={text} popis2={text2} onPopis={setText} onPopis2={setText2} ph={mobil}
        popisHlavneho="Toto darcovia uvidia hneď. Najviac 12 riadkov." />
    </section>
  </div>);
  const vpravo = (<div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
    {nepovinne ? <section style={kartaS}>
      <span style={nadpisS}>Doložené tento mesiac · overenie DEED+</span>
      <b style={{ fontSize: 24, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{eur(tentoMes.reduce((a, d) => a + d.suma, 0))} · {tentoMes.length} {tentoMes.length === 1 ? "doklad" : tentoMes.length >= 2 && tentoMes.length <= 4 ? "doklady" : "dokladov"}</b>
      <span style={textS}>Doklady vidí len DEED+. Skontrolujeme ich do 48 hodín. Na profile sa ukáže len „Doložené · overené DEED+“ a suma, nikdy samotné doklady.</span>
    </section> : <section style={kartaS}>
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><span style={nadpisS}>Doložené použitie</span><b style={{ fontSize: 24, color: "var(--green)" }}>{pct >= 100 ? "doložené všetko" : `${pct} %`}</b></span>
      <span style={{ display: "block", height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: "100%", background: "var(--green)", transformOrigin: "left", transform: `scaleX(${pct / 100})`, transition: "transform .5s ease" }} /></span>
      {cakaju && <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink2)" }}>Odoslané · čaká na overenie</span>}
      {vyzbierane > 0 && sumaVsetkych > vyzbierane && <span style={textS}>Doklady sú o {eur(sumaVsetkych - vyzbierane)} vyššie ako vyzbierané. Zvyšok ste založili zo svojho, zbierka beží ďalej.</span>}
      <span style={textS}>Rátajú sa len doklady overené DEED+. Darcovia vidia pri zbierke len „doložené {pct} % · overené DEED+“, samotné doklady nie.</span>
    </section>}
    {!nepovinne && ukoncena && (faza === "vyzva" || faza === "caka") && <section style={kartaS}>
      <span style={nadpisS}>Nemáte doklady?</span>
      <span style={textS}>{faza === "vyzva" ? `Lehota uplynula. Doložte, prosím, do ${dniT(dni)}, alebo napíšte zdôvodnenie.` : "Pri zbierke sa ukazuje „čaká na doklady“. Doložte, alebo napíšte zdôvodnenie."}</span>
      <RichTextInput vzhlad="sprava" value={zdov} onChange={setZdov} minH={90} placeholder="Nemáme doklady, pretože…" ariaLabel="Zdôvodnenie" nastroje={["bold", "italic", "insertUnorderedList", "diktovat"]} />
      <button type="button" onClick={() => { if (cistyText(zdov).length < 20) { toast("Napíšte zdôvodnenie aspoň jednou vetou."); return; } zmen({ zdovodnenieBezDokladov: zdov }); toast("Zdôvodnenie sme poslali. Posúdi ho DEED+."); }} style={tlO}>Poslať zdôvodnenie</button>
    </section>}
    {/* OPRAVY 456 (5): po odoslaní sa zmení celá karta, tlačidlo sa vráti, keď pribudnú nové položky */}
    {nove.length ? <section style={kartaS}>
        <span style={textS}>{s.doklady.some((d) => odoslanaPol(d)) ? `Pribudli nové položky: ${nove.length}.` : "Keď máte doklady pripravené, pošlite ich DEED+ na overenie."}</span>
        <PodrzTlacidlo label={s.doklady.some((d) => odoslanaPol(d)) ? `Podržte · Odoslať ${nove.length} ${nove.length === 1 ? "novú položku" : nove.length < 5 ? "nové položky" : "nových položiek"}` : "Podržte · Odoslať na overenie"} trvanie={1500} onConfirm={odoslat} />
      </section>
      : cakaju ? <section role="status" style={{ ...kartaS, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
        <b style={{ fontSize: 17, color: "var(--gInk)" }}>Odoslané ✓ · čaká na overenie</b>
        <span style={textS}>DEED+ skontroluje do 48 hodín. Dáme vám vedieť.</span>
      </section>
      : !s.doklady.length ? <SvetlusikKarta>Najprv pridajte aspoň jednu položku s dokladom.</SvetlusikKarta> : null}
    {onHotovo && <button type="button" onClick={onHotovo} style={{ ...tlO, alignSelf: "stretch" }}>Hotovo · späť na zbierku</button>}
  </div>);
  return <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>{vlavo}{vpravo}</div>;
}
