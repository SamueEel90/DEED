// ============================================================
// Balík 8 C · Reťaz dobra na stránkach (prototyp Retaz dobra v2 - zmluva, kroky 5 až 7) a Testovanie.
//  5 · stránka zbierky: blok „Podporujú reťazou · N“ — jeden riadok = jeden subjekt so svojou reťazou, len pri zbierke,
//      ktorá je v reťazi práve na rade; prázdny blok sa neukáže.
//  6 · pás Vyzbierané: podiel z reťaze = zelená s pásikmi (poradie firmy → reťaze → ľudia), pod pásom riadok
//      „X posiela N % zo svojich darov · Reťaz dobra · tvorca · zatiaľ N € · Pozri profil ›“.
//  7 · stránka tvorcu: „Teraz podporujem reťazou“ (len bežiaca) · „Ukončené v mojej reťazi“ (výsledok + darcovia cez môj QR).
// 10 · Testovanie (len testovací režim): každá akcia ukáže výsledok pod tlačidlom a zmení pás, rad aj stránky ako naostro.
// ============================================================
import { useState, type CSSProperties } from "react";
import { usePodporaRetazou, useRetazTvorcu, useDarcoviaCezQr, testDar, testRad, testOznamy, testOdznova, nastavVypadokTest, vypadokTestZapnuty,
  useZmenyRetaze, inicialy, type PodporaRetazou, type Strana, type ZbierkaTvorcu, type OznamOrganizatorovi } from "@/lib/retaz";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { ZnakStrany, StitStrany } from "./StranaZmluvy";

const eur = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}\u00A0€`;
const datum = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
const nadpis: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" };
/** pásiky reťaze — každý ďalší tvorca svetlejší */
export const pasikyRetaze = (i: number) => {
  const [a, b] = [["#3F6E2C", "#79A657"], ["#5C8A45", "#9DC27E"], ["#7FA866", "#BDD9A6"]][Math.min(i, 2)];
  return `repeating-linear-gradient(135deg, ${a} 0 6px, ${b} 6px 12px)`;
};
const stranaZ = (p: PodporaRetazou): Strana => p.robi ?? { druh: "osoba", meno: p.meno, iniciala: inicialy(p.meno), stit: "Bronze" };
const druhText = (s: Strana) => s.druh === "tvorca" ? "tvorca" : s.druh === "firma" ? "firma" : s.druh === "farnost" ? "farnosť" : s.druh === "charita" ? "organizácia" : "používateľ";

/** úsek pásu z reťazí (poradie: firmy → reťaze → ľudia) */
export function useUsekyRetaze(refId: string): { suma: number; useky: { suma: number; farba: string }[] } {
  const L = usePodporaRetazou(refId).filter((p) => p.poslane > 0);
  return { suma: L.reduce((a, p) => a + p.poslane, 0), useky: L.map((p, i) => ({ suma: p.poslane, farba: pasikyRetaze(i) })) };
}

/** 6 · riadky pod pásom: „Martin Konaľ posiela 25 % zo svojich darov · Reťaz dobra · tvorca · zatiaľ 10 € · Pozri profil ›“ */
export function PrispievateliaRetazou({ refId }: { refId: string }) {
  const L = usePodporaRetazou(refId).filter((p) => p.poslane > 0 || p.bezi);
  if (!L.length) return null;
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
    {L.map((p, i) => {
      const s = stranaZ(p);
      const obsah = <>
        <span aria-hidden="true" style={{ flex: "none", width: 36, height: 36, borderRadius: 10, background: pasikyRetaze(i), border: "1px solid var(--gBd)" }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }}>
          <b style={{ fontSize: 14, color: "var(--ink)" }}>{p.meno} posiela {p.pct}{"\u00A0"}% zo svojich darov</b>
          <span style={{ fontSize: 12.5, color: "var(--ink2)" }}>Reťaz dobra · {druhText(s)} · zatiaľ {eur(p.poslane)}</span>
        </span>
        {p.stranka && <span style={{ flex: "none", whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>Pozri profil ›</span>}
      </>;
      const st: CSSProperties = { display: "flex", alignItems: "center", gap: 10, minHeight: 56, padding: "10px 12px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
      return p.stranka
        ? <button key={p.retaz} type="button" onClick={() => otvorVerejnyProfil(p.stranka!)} style={{ ...st, cursor: "pointer", boxShadow: "none" }}>{obsah}</button>
        : <div key={p.retaz} role="note" style={st}>{obsah}</div>;
    })}
  </div>;
}

/** 5 · „PODPORUJÚ REŤAZOU · N“ — len zbierka, ktorá je v reťazi práve na rade; prázdny blok sa neukáže */
export function PodporujuRetazou({ zbierkaId }: { zbierkaId: string }) {
  const L = usePodporaRetazou(zbierkaId).filter((p) => p.bezi);
  if (!L.length) return null;
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
    <span style={nadpis}>PODPORUJÚ REŤAZOU · {L.length}</span>
    {L.map((p) => {
      const s = stranaZ(p);
      const pod = s.pod ?? [s.mesto, s.overeny ? "overený pri registrácii" : ""].filter(Boolean).join(" · ");
      const obsah = <>
        <ZnakStrany s={s} size={44} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
          <b style={{ fontSize: 15 }}>{p.meno}</b>
          {pod && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{pod}</span>}
          <span style={{ fontSize: 13, color: "var(--ink2)" }}>posiela {p.pct}{"\u00A0"}% zo svojich darov{p.stranka && <b style={{ color: "var(--green)" }}> · Pozri profil ›</b>}</span>
        </span>
        <span style={{ flex: "none", lineHeight: 0 }}><StitStrany s={s} h={36} /></span>
      </>;
      const st: CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", fontFamily: "inherit", color: "var(--ink)", width: "100%", boxSizing: "border-box" };
      return p.stranka
        ? <button key={p.retaz} type="button" onClick={() => otvorVerejnyProfil(p.stranka!)} style={{ ...st, cursor: "pointer", boxShadow: "none" }}>{obsah}</button>
        : <div key={p.retaz} style={st}>{obsah}</div>;
    })}
  </div>;
}

/** 7 · stránka tvorcu: bežiaca zbierka a ukončené v mojej reťazi */
export function RetazNaStrankeTvorcu({ stranka, meno, onBezi, onUkoncena }: { stranka: string | null; meno: string;
  onBezi: (z: ZbierkaTvorcu) => void; onUkoncena: (z: ZbierkaTvorcu) => void }) {
  const r = useRetazTvorcu(stranka, meno);
  const [vsetci, setVsetci] = useState<string | null>(null);
  if (!r) return null;
  const b = r.zbierky.find((z) => z.stav === "bezi");
  const konc = r.zbierky.filter((z) => z.stav === "naplnena" || z.stav === "skoncila").sort((x, y) => y.kedy - x.kedy);
  if (!b && !konc.length) return null;
  const karta: CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", fontFamily: "inherit", color: "var(--ink)", textAlign: "left", width: "100%", boxSizing: "border-box", cursor: "pointer", boxShadow: "none" };
  const znak = (z: ZbierkaTvorcu) => z.strana ?? { druh: "charita" as const, meno: z.org || z.nazov, iniciala: inicialy(z.org || z.nazov), stit: "Bronze" };
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {b && <>
      <span style={nadpis}>TERAZ PODPORUJEM REŤAZOU</span>
      <button type="button" onClick={() => onBezi(b)} style={karta}>
        <ZnakStrany s={znak(b)} size={44} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 15.5 }}>{b.nazov}</b>
          <span style={{ fontSize: 13, color: "var(--ink2)" }}>{b.org} · posielam {b.pct}{"\u00A0"}%</span>
          <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{b.ciel ? `${eur(b.vyzbierane)} z ${eur(b.ciel)}` : eur(b.vyzbierane)} · beží</span>
          {b.ciel ? <span style={{ height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden", marginTop: 4 }}><span style={{ display: "block", height: "100%", width: `${Math.min(100, (b.vyzbierane / b.ciel) * 100)}%`, background: "var(--green)" }} /></span> : null}
        </span>
        <span style={{ flex: "none", lineHeight: 0 }}><StitStrany s={znak(b)} h={34} /></span>
      </button>
    </>}
    {konc.length > 0 && <>
      <span style={{ ...nadpis, marginTop: b ? 6 : 0 }}>UKONČENÉ V MOJEJ REŤAZI</span>
      {konc.map((z) => <UkoncenaVRetazi key={z.zbierkaId} retaz={r.id} z={z} znak={znak(z)} karta={karta} vsetci={vsetci === z.zbierkaId}
        onVsetci={() => setVsetci((v) => (v === z.zbierkaId ? null : z.zbierkaId))} onOtvor={() => onUkoncena(z)} />)}
    </>}
  </div>;
}

function UkoncenaVRetazi({ retaz, z, znak, karta, vsetci, onVsetci, onOtvor }: { retaz: string; z: ZbierkaTvorcu; znak: Strana; karta: CSSProperties; vsetci: boolean; onVsetci: () => void; onOtvor: () => void }) {
  const d = useDarcoviaCezQr(retaz, z.zbierkaId);
  const dary = vsetci ? d.dary : d.dary.slice(0, 3);
  return <div style={{ display: "flex", flexDirection: "column", gap: 0, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", overflow: "hidden" }}>
    <button type="button" onClick={onOtvor} style={{ ...karta, border: "none", borderRadius: 0 }}>
      <ZnakStrany s={znak} size={44} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <b style={{ fontSize: 15.5 }}>{z.nazov}</b>
        <span style={{ fontSize: 13, color: "var(--ink2)" }}>{z.org} · {z.stav === "naplnena" ? "naplnená" : "skončila"}{z.kedy ? ` ${datum(z.kedy)}` : ""}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>Cez moju reťaz poslané {eur(z.poslane)} · {z.pct}{"\u00A0"}%</span>
      </span>
      <span style={{ flex: "none", lineHeight: 0 }}><StitStrany s={znak} h={34} /></span>
    </button>
    {d.pocet > 0 && <div style={{ display: "flex", flexDirection: "column", padding: "4px 14px 10px", borderTop: "1px solid var(--cardBd)" }}>
      <span style={{ ...nadpis, padding: "8px 0 4px" }}>DARCOVIA CEZ MÔJ QR · {d.pocet}</span>
      {dary.map((x, i) => <span key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 14 }}>
        <span style={{ color: "var(--ink2)" }}>{x.meno ?? "Anonymný darca"}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{eur(x.suma)}</b></span>)}
      {d.pocet > 3 && <button type="button" onClick={onVsetci} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>
        {vsetci ? "Menej ›" : `Všetci darcovia (${d.pocet}) ›`}</button>}
    </div>}
  </div>;
}

// ---------------- 10 · Testovanie (len testovací režim) ----------------
type Akcia = "dar" | "naplnena" | "uzavreli" | "siet" | "oznamy" | "odznova";
export function TestovanieRetaze({ onOdznova }: { onOdznova: () => void }) {
  useZmenyRetaze();
  const [vys, setVys] = useState<{ a: Akcia; t: string } | null>(null);
  const [oz, setOz] = useState<OznamOrganizatorovi[] | null>(null);
  const [bezi, setBezi] = useState<Akcia | null>(null);
  const siet = vypadokTestZapnuty();
  const spusti = async (a: Akcia, f: () => Promise<string> | string) => {
    if (bezi) return;
    setBezi(a); setOz(null);
    try { setVys({ a, t: await f() }); } catch { setVys({ a, t: "Akcia sa nepodarila." }); }
    setBezi(null);
  };
  const tl = (a: Akcia, text: string, f: () => Promise<string> | string) => <div key={a} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <button type="button" disabled={!!bezi} onClick={() => void spusti(a, f)}
      style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, textAlign: "left", cursor: bezi ? "default" : "pointer", boxShadow: "none" }}>
      {bezi === a ? "Chvíľu…" : text}</button>
    {vys?.a === a && <span role="status" style={{ padding: "8px 12px", borderRadius: 10, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 13.5, lineHeight: 1.45, color: "var(--gInk)", fontWeight: 700 }}>{vys.t}</span>}
    {a === "oznamy" && oz && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {oz.length === 0 && <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Zatiaľ žiadne oznámenia.</span>}
      {oz.map((o, i) => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink3)" }}>{o.komu} · {o.titul}</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.45 }}>{o.text}</span>
      </div>)}
    </div>}
  </div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px", borderRadius: 18, border: "1.5px dashed var(--cardBd)", background: "var(--bg)" }}>
    <span style={{ ...nadpis, color: "var(--a-danger, #B4432F)" }}>TESTOVANIE · len v testovacom režime</span>
    <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)" }}>Testovacie dary sú v účtovníctve označené a do ostrých súm nejdú.</span>
    {tl("dar", "Simulovať dar 10 € na QR reťaze", () => testDar(10))}
    {tl("naplnena", "Bežiaca zbierka sa naplnila", () => testRad("naplnena"))}
    {tl("uzavreli", "Ďalšiu v rade uzavreli", () => testRad("uzavreli"))}
    {tl("siet", siet ? "Zapnúť sieť pri zapečatení" : "Vypnúť sieť pri zapečatení", () => {
      nastavVypadokTest(!siet);
      return siet ? "Sieť je zapnutá. Zapečatenie prejde." : "Sieť je vypnutá. Ďalšie zapečatenie ukáže Neuložilo sa · Skúsiť znova.";
    })}
    {tl("oznamy", "Ukázať oznámenia organizátorov", async () => {
      const o = await testOznamy();
      if (typeof o === "string") return o;
      setOz(o);
      return o.length ? `Organizátori dostali ${o.length} ${o.length === 1 ? "oznámenie" : o.length < 5 ? "oznámenia" : "oznámení"}.` : "Zatiaľ žiadne oznámenia.";
    })}
    {tl("odznova", "Začať odznova", () => { testOdznova(); onOdznova(); return "Reťaz skončila. Nastavte novú."; })}
  </div>;
}

