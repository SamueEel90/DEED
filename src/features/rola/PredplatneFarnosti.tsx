// ============================================================
// KARTA 61 §3 — Predplatné farnosti (prototyp Predplatne farnosti.dc.html):
// PredplatnePas = stav hore v Prehľade (a v Nastaveniach), PredplatneFarnosti = Predplatné a platba (3 kroky).
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useZmenyNastaveni, citajNastavenie, maNastavenie, zapisNastavenie } from "@/lib/nastaveniaStranky";
import { predplatne, ulozPredplatne, stavPredplatneho, koniecSkusobneho, cenaMiest, dniText, dniDo, datumText, DEN, GRACE_DNI, CENA_HLAVNY, CENA_FIL1, CENA_FIL } from "@/lib/predplatneFarnosti";
import { vystavFakturu } from "@/lib/fakturyOrg";
import { vlastnePrispevky } from "@/features/viera/mock";
import { kostolKal } from "@/lib/kalendarFarnosti";
import { TESTOVACIA } from "@/lib/testovacia";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";

const ZELENA = "#4B7A35", CERV = "#A34A2A";
const eur = (n: number) => `${n.toLocaleString("sk-SK")} €`;
const teraz = () => Date.now();
const kick: CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" };
const karta: CSSProperties = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" };
const pole: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const obrys: CSSProperties = { flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" };
const hlaskaSt: CSSProperties = { padding: "10px 14px", borderRadius: 12, background: "var(--gSoft)", border: `1.5px solid ${ZELENA}`, fontSize: 14, fontWeight: 700, color: "var(--gInk)" };

type Duch = { fil?: string[] };
const filialky = (): string[] => ((maNastavenie("duch") ? citajNastavenie("duch") : {}) as Duch).fil ?? [];

/** 2 mesiace sa začnú počítať pri prvom zverejnení (oznam alebo omše) */
function useStart(strankaId: string) {
  useZmenyNastaveni();
  const p = predplatne();
  const zverejnene = !p.start && (vlastnePrispevky(strankaId).length > 0 || kostolKal(strankaId).casyOk);
  useEffect(() => { if (zverejnene) ulozPredplatne({ start: teraz() }); }, [zverejnene]);
}

/** stav predplatného — Prehľad hore a Nastavenia */
export function PredplatnePas({ strankaId, mobil, onOtvor }: { strankaId: string; mobil: boolean; onOtvor: () => void }) {
  useStart(strankaId);
  const p = predplatne(), now = teraz(), st = stavPredplatneho(p, now), k = koniecSkusobneho(p);
  const dni = dniDo(k, now), mes = cenaMiest(1 + filialky().length);
  const pct = p.start && k > p.start ? Math.min(100, Math.round(((now - p.start) / (k - p.start)) * 100)) : 0;
  const tl = (t: string, plne = false) => <button type="button" onClick={onOtvor} style={plne ? { ...obrys, border: "none", background: ZELENA, color: "#fff" } : obrys}>{t}</button>;
  const ram = (bg: string, bd: string, deti: React.ReactNode) => <section style={{ borderRadius: mobil ? 18 : 22, background: bg, border: `2px solid ${bd}`, padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>{deti}</section>;
  const riadok = (t: React.ReactNode, s: React.ReactNode, b: React.ReactNode) => <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><span style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16 }}>{t}</b><span style={{ fontSize: 13.5, color: "var(--ink2)" }}>{s}</span></span>{b}</div>;
  if (st === "nezverejnene") return ram("var(--card)", "var(--cardBd)", riadok("2 mesiace zadarmo vás čakajú", "Začnú sa počítať, až keď zverejníte prvý oznam alebo omše. Dovtedy si všetko pokojne pripravte.", tl("Cena a filiálky ›")));
  if (st === "skusobne") return ram("var(--card)", "var(--cardBd)", <>
    {riadok(`Zadarmo ešte ${dniText(dni)}`, `do ${datumText(k)} · potom ${eur(mes)} mesačne`, tl("Pozrieť platbu ›"))}
    <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--btn)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${pct}%`, background: ZELENA }} /></span>
  </>);
  if (st === "konci") return ram("var(--goldBg)", "#C9A24A", <>
    {riadok(`Zadarmo ešte ${dniText(dni)} · do ${datumText(k)}`, "Potom ostane na stránke zadarmo len kontakt a časy omší. Oznamy, zbierky, parte a Správa sa zastavia, kým nezaplatíte. Nič sa nezmaže.", tl("Vybrať platbu ›", true))}
  </>);
  if (st === "skoncilo") return ram("#F6E4DE", CERV, riadok(`Skúšobné 2 mesiace skončili ${datumText(k)}`, "Veriaci na stránke vidia kontakt a časy omší. Oznamy, úmysly, nové zbierky, parte a úpravy stránky sú zastavené. Nič sa nezmazalo, po zaplatení bude všetko presne ako predtým. Bežiace zbierky sa dokončia a peniaze idú farnosti.", tl("Zaplatiť a pokračovať ›", true)));
  if (st === "aktivne") return ram("var(--card)", "var(--cardBd)", riadok(<>Predplatné aktívne <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· {p.rocne ? "ročne" : "mesačne"} · zaplatené do {datumText(p.plateneDo!)}</span></>, "", tl("Platba ›")));
  if (st === "zaNasPlati") return ram("var(--card)", "var(--cardBd)", riadok(<>Predplatné za vás platí {p.platca!.meno} <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· vy nič neplatíte</span></>, "", tl("Podrobnosti ›")));
  const gDo = (p.platca!.prestal ?? now) + GRACE_DNI * DEN, gDni = dniDo(gDo, now);
  return ram("var(--goldBg)", "#C9A24A", riadok(`${p.platca!.meno} za vás prestala platiť`, `Nič sa nedeje hneď. Stránka beží ďalej ešte ${dniText(gDni)}, do ${datumText(gDo)}. Dovtedy môžete platbu prevziať vy, alebo sa dohodnite s platcom.`,
    <button type="button" onClick={() => { ulozPredplatne({ platca: undefined }); onOtvor(); }} style={{ ...obrys, border: "none", background: ZELENA, color: "#fff" }}>Prevziať platbu ›</button>));
}

/** Predplatné a platba (Nastavenia → Predplatné farnosti) */
export function PredplatneFarnosti({ strankaId, meno, mobil, onUdaje }: { strankaId: string; meno: string; mobil: boolean; onUdaje: () => void }) {
  useZmenyNastaveni();
  const p = predplatne(), fil = filialky(), za = p.za ?? [];
  const [vyb, setVyb] = useState(0), [filIn, setFilIn] = useState(""), [zaIn, setZaIn] = useState("");
  const [hl, setHl] = useState<string | null>(null);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const hlas = (t: string) => { window.clearTimeout(tm.current); setHl(t); tm.current = window.setTimeout(() => setHl(null), 4500); };
  const ulozFil = (l: string[]) => zapisNastavenie("duch", { ...((maNastavenie("duch") ? citajNastavenie("duch") : {}) as object), fil: l });

  const nM = 1 + fil.length, mes = cenaMiest(nM), zaOk = za.filter((z) => z.ok);
  const mesSpolu = mes + zaOk.length * CENA_HLAVNY, prvyRok = !p.zaplatene;
  const k = vyb === 1 ? (prvyRok ? 12 : 10) : 1;
  const spolu = `${eur(mesSpolu * k)}${vyb === 1 ? " / rok" : " / mesiac"}`;
  const ud = (maNastavenie("ud") ? citajNastavenie("ud") : null) as { fmail?: string; adr?: string; dic?: string } | null;
  const maUdaje = !!ud?.fmail && /^\S+@\S+\.\S+$/.test(ud.fmail) && !!ud.adr?.trim();
  const zaplat = () => {
    if (!maUdaje) return;
    const now = teraz(), base = Math.max(now, koniecSkusobneho(p) || now, p.plateneDo ?? 0), d = new Date(base); d.setMonth(d.getMonth() + (vyb === 1 ? 12 : 1));
    vystavFakturu({ co: `Predplatné farnosti · ${vyb === 1 ? "ročne" : "mesačne"}`, suma: mesSpolu * k, sposob: "Karta farnosti", odberatel: { nazov: meno, ico: "", adresa: ud!.adr!.trim(), dic: ud!.dic || undefined, email: ud!.fmail! } });
    ulozPredplatne({ start: p.start ?? now, plateneDo: d.getTime(), rocne: vyb === 1, zaplatene: true });
    hlas("Zaplatené ✓ Faktúra príde na e-mail. Všetko beží ďalej.");
  };
  const riad = (i: number, t: string, s: string, c: string, x?: React.ReactNode) => (
    <div key={t + i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "6px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
      <b style={{ flex: "none", fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{c}</b>{x}
    </div>);
  return (<>
    <PredplatnePas strankaId={strankaId} mobil={mobil} onOtvor={() => document.getElementById("pred-platba")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
    {hl && <span role="status" style={hlaskaSt}>{hl}</span>}
    <span style={kick}>1 · MIESTA VAŠEJ FARNOSTI</span>
    <section style={{ ...karta, padding: "0 16px" }}>
      {riad(0, "Hlavný kostol", "vaša farnosť", `${CENA_HLAVNY} €`)}
      {fil.map((f, i) => riad(i + 1, f, "filiálka", `+${i === 0 ? CENA_FIL1 : CENA_FIL} €`,
        <button type="button" aria-label={`Odobrať ${f}`} onClick={() => ulozFil(fil.filter((_, j) => j !== i))} style={{ width: 44, height: 44, border: "none", background: "transparent", cursor: "pointer", fontSize: 20, color: "var(--ink3)" }}>×</button>))}
      <div style={{ display: "flex", gap: 8, padding: "10px 0 12px", borderTop: "1px solid var(--cardBd)" }}>
        <input value={filIn} onChange={(e) => setFilIn(e.target.value.slice(0, 40))} placeholder="názov filiálky" aria-label="Názov filiálky" style={pole} />
        <button type="button" onClick={() => { const t = filIn.trim(); if (!t) return; ulozFil([...fil, t]); setFilIn(""); hlas(`Filiálka pridaná ✓ ${t} · cena ${eur(cenaMiest(nM + 1))} mesačne`); }} style={obrys}>Pridať</button>
      </div>
    </section>
    <span style={{ fontSize: 13, color: "var(--ink3)" }}>Filiálka = kostol s vlastnou podstránkou. Prvé miesto {CENA_HLAVNY} €, druhé +{CENA_FIL1} €, každé ďalšie +{CENA_FIL} € mesačne.</span>

    <span style={kick}>2 · PLATÍTE AJ ZA INÉ FARNOSTI · NEPOVINNÉ</span>
    <section style={{ ...karta, padding: "0 16px" }}>
      {za.map((z, i) => (
        <div key={z.t + i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minHeight: 56, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{z.t}</b><span style={{ fontSize: 13, fontWeight: 700, color: z.ok ? "var(--gInk)" : "#6B4E12" }}>{z.ok ? "potvrdili · platíte vy" : "čaká na ich potvrdenie"}</span></span>
          <b style={{ fontSize: 15 }}>{z.ok ? `${CENA_HLAVNY} €` : "—"}</b>
          {!z.ok && TESTOVACIA && <button type="button" onClick={() => { ulozPredplatne({ za: za.map((y, j) => (j === i ? { ...y, ok: true } : y)) }); hlas(`${z.t} potvrdila ✓ Od ďalšej faktúry platíte aj za ňu.`); }} style={{ ...obrys, borderStyle: "dashed" }}>Ukážka: potvrdili ›</button>}
          <DrzTlacidlo ms={1200} styl={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${CERV}`, background: "transparent", color: CERV, fontSize: 14, fontWeight: 800 }}
            onHotovo={() => { ulozPredplatne({ za: za.filter((_, j) => j !== i) }); hlas(`Už neplatíte za ${z.t}. Dostanú upozornenie a mesiac na prevzatie platby.`); }}>Podržte · prestať platiť</DrzTlacidlo>
        </div>))}
      <div style={{ display: "flex", gap: 8, padding: "10px 0 12px", borderTop: za.length ? "1px solid var(--cardBd)" : "none" }}>
        <input value={zaIn} onChange={(e) => setZaIn(e.target.value.slice(0, 60))} placeholder="názov farnosti" aria-label="Názov farnosti, za ktorú platíte" style={pole} />
        <button type="button" onClick={() => { const t = zaIn.trim(); if (!t) return; ulozPredplatne({ za: [...za, { t, ok: false }] }); setZaIn(""); hlas(`Žiadosť odoslaná ✓ ${t} ju musí potvrdiť vo svojej Správe.`); }} style={obrys}>Ponúknuť</button>
      </div>
    </section>
    <span style={{ fontSize: 13, color: "var(--ink3)" }}>Malá farnosť dostane žiadosť a musí ju potvrdiť. Ostáva jej vlastná správa aj farár, vy len platíte. Keď prestanete, majú mesiac na prevzatie platby.</span>

    <span id="pred-platba" style={{ ...kick, scrollMarginTop: 80 }}>3 · AKO CHCETE PLATIŤ</span>
    <div role="radiogroup" aria-label="Ako chcete platiť" style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
      {([["Mesačne", `${eur(mesSpolu)} / mesiac`, "Platíte každý mesiac, zrušiť môžete kedykoľvek."], ["Ročne", `${eur(prvyRok ? mesSpolu * 12 : mesSpolu * 10)} / rok`, prvyRok ? "Jedna faktúra na rok. Prvé 2 mesiace zadarmo ste už dostali, prvý rok je plná suma." : "2 mesiace zadarmo pri ročnej platbe. Jedna faktúra na rok."]] as const).map(([t, c, s], i) => { const on = vyb === i; return (
        <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setVyb(i)} style={{ minHeight: 84, padding: "12px 14px", borderRadius: 16, border: on ? `2px solid ${ZELENA}` : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
          <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 16 }}>{t}</b><b style={{ fontSize: 16 }}>{c}</b></span>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{s}</span>
        </button>); })}
    </div>
    <span style={kick}>NA FAKTÚRE</span>
    <section style={{ ...karta, padding: "0 16px" }}>
      {riad(0, `Vaša farnosť · ${nM === 1 ? "1 kostol" : `${nM} miesta`}`, "", eur(mes * k))}
      {zaOk.map((z, i) => riad(i + 1, z.t, "", eur(CENA_HLAVNY * k)))}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--cardBd)" }}><b style={{ fontSize: 16 }}>Spolu</b><b style={{ fontSize: 18 }}>{spolu}</b></div>
    </section>
    {maUdaje ? <DrzTlacidlo ms={1500} plnenie="rgba(255,255,255,.3)" styl={{ minHeight: 56, borderRadius: 14, border: "none", background: ZELENA, color: "#fff", fontSize: 16, fontWeight: 800 }} onHotovo={zaplat}>{`Podržte a zaplaťte · ${spolu}`}</DrzTlacidlo>
      : <button type="button" onClick={onUdaje} style={{ minHeight: 56, borderRadius: 14, border: "2px solid #C9A24A", background: "var(--goldBg)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "var(--ink)" }}>Najprv doplňte fakturačné údaje ›</button>}
    <span style={{ fontSize: 13, color: "var(--ink3)" }}>Jedna faktúra na e-mail farnosti. Cena je za miesta, nie za ľudí.</span>
  </>);
}
