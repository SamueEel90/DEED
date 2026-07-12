import { useMemo, useState } from "react";
import { SPACE, RADIUS, SIRKA } from "@/theme";
import { BackHeader, Switch, SegTabs, useLayout } from "@/shared";
import { pressable } from "@/components/pressable";
import { N, Chip } from "./ui";
import { nacitajStav, ulozStav } from "./stav";
import {
  generujOmse, isoDatum, CASY, OMSA_LABEL, KAT_FARBA, KAT_LABEL, KAL_UDALOSTI,
  PREDVYPLNENY_ROZVRH, PRAZDNY_ROZVRH,
  type RozvrhOmsi, type DennaOmsa, type OmsaTyp, type MassInstance, type Farnost,
} from "./mock";

/*
  ============================================================
  KALENDÁR + ROZVRH OMŠÍ (§ Kalendár/Rozvrh) — len farár.
  Farár nastaví rozvrh RAZ → systém auto-generuje omše a ich zbierky na mesiac.
  Ručne rieši len výnimky: odškrtnutie (zruší deň), pridanie mimoriadnej, zmena času,
  sviatky (predškrtnuté). Zbierka ku každej omši (toggle) — evidencia per zbierka,
  zúčtovanie dávkovo (jeden payout). Settlement € na farský účet, close 23:59.
  ============================================================
*/

const DNI = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
const MESIACE = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];
const OMSA_TYPY: OmsaTyp[] = ["ranna", "vecerna", "velka"];

type Vyhlad = "kalendar" | "rozvrh";

export function Kalendar({ farnost, onBack, onPridat, toast }: { farnost: Farnost; onBack: () => void; onPridat?: () => void; toast: (m: string) => void }) {
  const dnes = useMemo(() => new Date(), []);
  const [vyhlad, setVyhlad] = useState<Vyhlad>("kalendar");
  // rozvrh + override vrstva sú perzistované per farnost.id (mock, localStorage)
  const [rozvrh, setRozvrh] = useState<RozvrhOmsi>(() => nacitajStav("rozvrh", farnost.id, PREDVYPLNENY_ROZVRH));
  const [rok, setRok] = useState(dnes.getFullYear());
  const [mesiac, setMesiac] = useState(dnes.getMonth());
  const [vybranyDen, setVybranyDen] = useState<string | null>(null);

  // override vrstva (výnimky) — vzor ostáva nedotknutý pre ostatné týždne
  const [zrusene, setZrusene] = useState<Set<string>>(() => new Set(nacitajStav<string[]>("zrusene", farnost.id, [])));
  const [casy, setCasy] = useState<Record<string, string>>(() => nacitajStav("casy", farnost.id, {}));
  const [pridane, setPridane] = useState<Record<string, DennaOmsa[]>>(() => nacitajStav("pridane", farnost.id, {}));

  const generovane = useMemo(() => generujOmse(rok, mesiac, rozvrh), [rok, mesiac, rozvrh]);

  // efektívne omše dňa (auto/feast bez zrušených + override časov + manuálne pridané)
  function omseDna(iso: string): MassInstance[] {
    const zaklad = generovane
      .filter((m) => m.dateISO === iso && !zrusene.has(m.id))
      .map((m) => ({ ...m, time: casy[m.id] ?? m.time }));
    const man = (pridane[iso] ?? []).map((o, i): MassInstance => ({ id: `${iso}-man${i}`, dateISO: iso, time: o.time, type: o.type, source: "manual", status: "active" }));
    return [...zaklad, ...man].sort((a, b) => a.time.localeCompare(b.time));
  }
  const udalostiDna = (iso: string) => KAL_UDALOSTI.filter((u) => iso === isoDatum(new Date(rok, mesiac, u.den)));

  function prevMesiac() { const d = new Date(rok, mesiac - 1, 1); setRok(d.getFullYear()); setMesiac(d.getMonth()); }
  function nextMesiac() { const d = new Date(rok, mesiac + 1, 1); setRok(d.getFullYear()); setMesiac(d.getMonth()); }

  // mriežka Po–Ne
  const offset = (new Date(rok, mesiac, 1).getDay() + 6) % 7;
  const pocetDni = new Date(rok, mesiac + 1, 0).getDate();
  const bunky: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: pocetDni }, (_, i) => i + 1)];
  const dnesIso = isoDatum(dnes);

  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <BackHeader onBack={onBack} title="Kalendár & rozvrh">
        <span style={{ fontSize: 12, color: N.txt2, marginLeft: SPACE.xs }}>⛪ {farnost.skratka}</span>
      </BackHeader>

      <div style={{ padding: `${SPACE.sm}px ${SPACE.md}px 0` }}>
        <SegTabs options={["Kalendár", "Rozvrh omší"]} value={vyhlad === "kalendar" ? "Kalendár" : "Rozvrh omší"}
          onChange={(l: string) => setVyhlad(l === "Kalendár" ? "kalendar" : "rozvrh")} ariaLabel="Kalendár alebo rozvrh"
          style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.md }}
          render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />
      </div>

      {vyhlad === "rozvrh" ? (
        <RozvrhSetup rozvrh={rozvrh} onRozvrh={setRozvrh}
          onUlozit={() => { ulozStav("rozvrh", farnost.id, rozvrh); toast("Rozvrh uložený — omše a zbierky vygenerované na mesiac dopredu"); setVyhlad("kalendar"); }}
          toast={toast} />
      ) : (
        <div style={{ padding: `0 ${SPACE.md}px` }}>
          {/* navigácia mesiaca */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: SPACE.sm }}>
            <span {...pressable(prevMesiac, "Predošlý mesiac")} style={navBtn}>‹</span>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{MESIACE[mesiac]} {rok}</div>
            <span {...pressable(nextMesiac, "Ďalší mesiac")} style={navBtn}>›</span>
          </div>

          {/* hlavička dní */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
            {DNI.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: N.txt3 }}>{d}</div>)}
          </div>

          {/* mriežka */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {bunky.map((d, i) => {
              if (d == null) return <div key={`x${i}`} />;
              const iso = isoDatum(new Date(rok, mesiac, d));
              const omse = omseDna(iso);
              const uds = udalostiDna(iso);
              const sviatok = omse.find((m) => m.source === "feast");
              const jeDnes = iso === dnesIso;
              return (
                <div key={iso} {...pressable(() => setVybranyDen(iso), `Deň ${d}`)}
                  style={{ minHeight: 62, borderRadius: RADIUS.sm, border: `1px solid ${jeDnes ? N.indEdge : N.line}`, background: jeDnes ? N.indBg : sviatok ? N.goldBg : N.card, padding: 3, cursor: "pointer", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: jeDnes ? 800 : 600, color: jeDnes ? N.ind : N.txt2 }}>{d}</span>
                    {sviatok && <span style={{ fontSize: 8, color: N.gold }}>✦</span>}
                  </div>
                  {omse.slice(0, 2).map((m) => (
                    <div key={m.id} style={{ fontSize: 8.5, fontWeight: 600, color: m.source === "feast" ? N.gold : N.green, lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.time}</div>
                  ))}
                  {omse.length > 2 && <div style={{ fontSize: 8, color: N.txt3 }}>+{omse.length - 2}</div>}
                  {uds.length > 0 && (
                    <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
                      {uds.map((u, j) => <span key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: KAT_FARBA[u.kat] }} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* legenda */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.sm, marginTop: SPACE.sm, fontSize: 10.5, color: N.txt3 }}>
            <Legenda col={N.green} t="omša" /><Legenda col={N.gold} t="sviatok" />
            <Legenda col={KAT_FARBA.svadba} t="svadba/pohreb" /><Legenda col={KAT_FARBA.put} t="púť/akcia/brigáda" />
          </div>
          <div style={{ fontSize: 10.5, color: N.txt3, textAlign: "center", marginTop: SPACE.sm }}>
            Klik na deň → zaškrtávacie polia omší. Odškrtnutie zruší len ten deň, vzor ostáva. {rozvrh.generateCollectionPerMass ? "Zbierka ku každej omši." : "Jedna denná zbierka."}
          </div>
        </div>
      )}

      {vybranyDen && (
        <DenDetail iso={vybranyDen} omse={omseDna(vybranyDen)} udalosti={udalostiDna(vybranyDen)}
          perMass={rozvrh.generateCollectionPerMass}
          onZrus={(id) => setZrusene((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); ulozStav("zrusene", farnost.id, [...n]); return n; })}
          zrusene={zrusene}
          onCas={(id, t) => setCasy((c) => { const n = { ...c, [id]: t }; ulozStav("casy", farnost.id, n); return n; })}
          onPridaj={(o) => setPridane((p) => { const n = { ...p, [vybranyDen]: [...(p[vybranyDen] ?? []), o] }; ulozStav("pridane", farnost.id, n); return n; })}
          onInaUdalost={onPridat ? () => { setVybranyDen(null); onPridat(); } : undefined}
          onZatvor={() => setVybranyDen(null)} toast={toast} />
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: RADIUS.round, border: `1px solid ${N.line}`, background: N.card, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: N.txt2 };
function Legenda({ col, t }: { col: string; t: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />{t}</span>;
}

// ===================== ROZVRH — SETUP =====================
function RozvrhSetup({ rozvrh, onRozvrh, onUlozit, toast }: { rozvrh: RozvrhOmsi; onRozvrh: (r: RozvrhOmsi) => void; onUlozit: () => void; toast: (m: string) => void }) {
  const nastavCas = (typ: "ranna" | "vecerna" | "velka", cas: string) => onRozvrh({ ...rozvrh, defaultTimes: { ...rozvrh.defaultTimes, [typ]: cas } });
  const denMa = (dow: number, typ: OmsaTyp) => rozvrh.weeklyPattern.find((p) => p.dayOfWeek === dow)?.masses.some((m) => m.type === typ) ?? false;
  const prepniDen = (dow: number, typ: OmsaTyp) => {
    onRozvrh({
      ...rozvrh,
      weeklyPattern: rozvrh.weeklyPattern.map((p) => {
        if (p.dayOfWeek !== dow) return p;
        const ma = p.masses.some((m) => m.type === typ);
        return { ...p, masses: ma ? p.masses.filter((m) => m.type !== typ) : [...p.masses, { type: typ, time: rozvrh.defaultTimes[typ as "ranna" | "vecerna" | "velka"] }] };
      }),
    });
  };
  // poradie Po–Ne (JS getDay: 0=ne … 6=so)
  const poradie = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div style={{ padding: `0 ${SPACE.md}px` }}>
      {/* 3.1 predvolené časy */}
      <SekNadpis>1 · Predvolené časy (nastav raz)</SekNadpis>
      <div style={{ display: "grid", gap: SPACE.sm }}>
        {(["ranna", "vecerna", "velka"] as const).map((typ) => (
          <div key={typ} style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
            <span style={{ flex: 1, fontSize: 13, color: N.txt2 }}>{OMSA_LABEL[typ]}</span>
            <SegTabs options={CASY[typ]} value={rozvrh.defaultTimes[typ]} onChange={(c: string) => nastavCas(typ, c)} ariaLabel={`Čas ${OMSA_LABEL[typ]}`}
              style={{ display: "flex", gap: 4 }} render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />
          </div>
        ))}
      </div>

      {/* 3.2 týždenný vzor */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: `${SPACE.gutter}px 0 ${SPACE.sm}px` }}>
        <SekNadpis noMargin>2 · Týždenný vzor (opakuje sa)</SekNadpis>
        <span {...pressable(() => { onRozvrh(PREDVYPLNENY_ROZVRH); toast("Predvyplnený bežný rozvrh"); }, "Predvyplniť")}
          style={{ fontSize: 11.5, fontWeight: 700, color: N.ind, cursor: "pointer" }}>↺ predvyplniť</span>
      </div>
      <div style={{ display: "grid", gap: SPACE.xs }}>
        {poradie.map((dow) => (
          <div key={dow} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
            <span style={{ width: 26, fontSize: 12, fontWeight: 700, color: dow === 0 ? N.gold : N.txt2 }}>{DNI[(dow + 6) % 7]}</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {OMSA_TYPY.map((typ) => {
                const on = denMa(dow, typ);
                return (
                  <span key={typ} {...pressable(() => prepniDen(dow, typ), `${OMSA_LABEL[typ]} ${DNI[(dow + 6) % 7]}`)}
                    style={{ fontSize: 11, padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: 99, cursor: "pointer", background: on ? N.green : N.card, color: on ? "#fff" : N.txt3, fontWeight: on ? 700 : 400, border: `1px solid ${on ? N.green : N.line}` }}>
                    {on ? "✓ " : ""}{typ === "ranna" ? "ranná" : typ === "vecerna" ? "večerná" : "veľká"}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* granularita zbierky + viditeľnosť */}
      <SekNadpis>3 · Zbierky</SekNadpis>
      <label style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.line}`, borderRadius: RADIUS.sm, padding: SPACE.gutter, fontSize: 13, color: N.txt2 }}>
        <Switch on={rozvrh.generateCollectionPerMass} onChange={(v) => onRozvrh({ ...rozvrh, generateCollectionPerMass: v })} ariaLabel="Zbierka ku každej omši" />
        <span>Zbierka ku každej omši <span style={{ color: N.txt3 }}>(vypni = jedna denná „dnešné omše")</span></span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginTop: SPACE.sm }}>
        <span style={{ fontSize: 13, color: N.txt2, flex: "none" }}>Viditeľnosť súm</span>
        <SegTabs options={["zobraziť", "skryť", "len farár"]}
          value={rozvrh.viditelnostSumy === "zobrazit" ? "zobraziť" : rozvrh.viditelnostSumy === "skryt" ? "skryť" : "len farár"}
          onChange={(l: string) => onRozvrh({ ...rozvrh, viditelnostSumy: l === "zobraziť" ? "zobrazit" : l === "skryť" ? "skryt" : "len-farar" })}
          ariaLabel="Viditeľnosť súm" style={{ display: "flex", gap: 4 }} render={(c: string, on: boolean) => <Chip on={on}>{c}</Chip>} />
      </div>
      <div style={{ fontSize: 10.5, color: N.txt3, marginTop: SPACE.sm, lineHeight: 1.5 }}>
        Evidencia = per zbierka (vlastný sumár). Zúčtovanie = dávkovo (jeden payout na farnosť). Settlement € na farský účet, close 23:59. Poplatok sa platí raz z dávky → mikro dary sú možné.
      </div>

      <button onClick={onUlozit} style={{ width: "100%", marginTop: SPACE.gutter, height: 50, border: "none", borderRadius: RADIUS.md, background: N.green, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", cursor: "pointer" }}>
        Uložiť a vygenerovať omše
      </button>
      <div style={{ fontSize: 10, color: N.txt3, textAlign: "center", padding: `${SPACE.sm}px 0` }}>Zvláda mesto 3×/deň aj dedinu 2×/týždeň — obaja nastavia len raz. Nové obdobie sa dogeneruje priebežne.</div>
    </div>
  );
}
function SekNadpis({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: N.txt3, letterSpacing: ".04em", margin: noMargin ? 0 : `${SPACE.gutter}px 0 ${SPACE.sm}px` }}>{children}</div>;
}

// ===================== DEŇ — DETAIL (zaškrtávacie polia) =====================
function DenDetail({ iso, omse, udalosti, perMass, onZrus, zrusene, onCas, onPridaj, onInaUdalost, onZatvor, toast }: {
  iso: string; omse: MassInstance[]; udalosti: { kat: any; nazov: string; cas?: string }[]; perMass: boolean;
  zrusene: Set<string>; onZrus: (id: string) => void; onCas: (id: string, t: string) => void;
  onPridaj: (o: DennaOmsa) => void; onInaUdalost?: () => void; onZatvor: () => void; toast: (m: string) => void;
}) {
  const { desktop } = useLayout();
  // desktop: obsah necháme na čitateľnú šírku a vycentrujeme (inak by sa riadky
  // roztiahli cez celú plochu — čas by odletel k pravému okraju, tlačidlá by boli obrie)
  const cap: React.CSSProperties = desktop ? { maxWidth: SIRKA.citanie, margin: "0 auto", width: "100%" } : {};
  const d = new Date(iso + "T00:00:00");
  const nadpis = `${d.getDate()}. ${MESIACE[d.getMonth()]} ${d.getFullYear()}`;
  const denNazov = DNI[(d.getDay() + 6) % 7];
  const sviatok = omse.find((m) => m.source === "feast")?.sviatok;

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(var(--panel-rgb),.94)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", zIndex: 50, display: "flex", flexDirection: "column", animation: "fadeUp .2s ease" }}>
      <div style={{ padding: SPACE.md, borderBottom: `1px solid ${N.line}` }}>
        <div style={{ ...cap, display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <span onClick={onZatvor} style={{ display: "flex", color: N.txt2, cursor: "pointer", fontSize: 20 }}>✕</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{denNazov} · {nadpis}</div>
            {sviatok && <div style={{ fontSize: 11.5, color: N.gold, fontWeight: 700 }}>✦ {sviatok}</div>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: SPACE.md }}>
       <div style={cap}>
        <div style={{ fontSize: 11, fontWeight: 800, color: N.txt3, letterSpacing: ".04em", marginBottom: SPACE.sm }}>OMŠE ({perMass ? "zbierka ku každej" : "spoločná denná zbierka"})</div>
        {omse.length === 0 && <div style={{ fontSize: 12.5, color: N.txt3, padding: `${SPACE.sm}px 0` }}>V tento deň nie je z rozvrhu žiadna omša.</div>}
        {omse.map((m) => {
          const off = zrusene.has(m.id);
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${off ? N.line : m.source === "feast" ? N.goldEdge : N.greenEdge}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, opacity: off ? .5 : 1 }}>
              <span {...pressable(() => onZrus(m.id), off ? "Zapnúť omšu" : "Zrušiť omšu")}
                style={{ width: 22, height: 22, flex: "none", borderRadius: RADIUS.xs, border: `2px solid ${off ? N.txt3 : N.green}`, background: off ? "transparent" : N.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer" }}>{off ? "" : "✓"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, textDecoration: off ? "line-through" : "none" }}>{OMSA_LABEL[m.type]}</div>
                <div style={{ fontSize: 10.5, color: N.txt3 }}>{m.source === "feast" ? "sviatok · predškrtnuté" : m.source === "manual" ? "mimoriadna" : "z rozvrhu"}{perMass ? " · auto omšová zbierka" : ""}</div>
              </div>
              <input type="time" value={m.time} disabled={off} onChange={(e) => onCas(m.id, e.target.value)}
                style={{ background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${N.line}`, borderRadius: RADIUS.xs, color: N.txt, fontSize: 13, padding: `${SPACE.xxs}px ${SPACE.xs}px`, fontFamily: "inherit" }} />
            </div>
          );
        })}

        {udalosti.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, color: N.txt3, letterSpacing: ".04em", margin: `${SPACE.gutter}px 0 ${SPACE.sm}px` }}>UDALOSTI</div>
            {udalosti.map((u, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: N.card, border: `1px solid ${N.line}`, borderLeft: `3px solid ${KAT_FARBA[u.kat as keyof typeof KAT_FARBA]}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{u.nazov}</div>
                  <div style={{ fontSize: 10.5, color: N.txt3 }}>{KAT_LABEL[u.kat as keyof typeof KAT_LABEL]}{u.cas ? ` · ${u.cas}` : ""}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* pridanie mimoriadnej / inej udalosti */}
        <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.gutter }}>
          <button onClick={() => { onPridaj({ type: "mimoriadna", time: "18:00" }); toast("Mimoriadna omša pridaná · 18:00 (uprav čas)"); }}
            style={{ flex: 1, height: 44, border: `1px dashed ${N.greenEdge}`, background: N.greenBg, color: N.green, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>+ mimoriadna omša</button>
          <button onClick={onInaUdalost ?? (() => toast("Iná udalosť → strom pridania (Sviatok · Púť · Akcia · Svadba · Pohreb · Brigáda · Oznam)"))}
            style={{ flex: 1, height: 44, border: `1px dashed ${N.indEdge}`, background: N.indBg, color: N.ind, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>+ iná udalosť</button>
        </div>
        <div style={{ fontSize: 10, color: N.txt3, textAlign: "center", padding: `${SPACE.sm}px 0` }}>Odškrtnutie zruší omšu len pre tento deň (override) — vzor pre ostatné týždne ostáva.</div>
       </div>
      </div>
    </div>
  );
}
