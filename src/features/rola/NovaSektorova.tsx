// ============================================================
// Balík 48 · 515 · 516 · 520 — Nová sektorová zbierka charity (vlastná obrazovka, centrálna sa tu neukazuje).
// Prototyp „Sektorova zbierka charity - cela cesta“ kroky 3 a 4: 1. Oblasť (len podskupiny zo stanov charity, bežiace sivé
// „· už beží“, vybratá s ×, Zrušiť výber) → 2. Názov · Text · Fotky · Transparentný účet sektora → kontrola
// → Podržte a spustite → na tom istom mieste „Sektorová zbierka {oblasť} beží ✓“. Kým nebeží, nikto ju nevidí.
// Koncept drží appka v pamäti relácie (na serveri vzniká až spustením). Zrušiť = koncept preč.
// ============================================================
import { useRef, useState } from "react";
import { cistyText } from "@/lib/richtext";
import type { MediumZbierky } from "@/lib/novaZbierka";
import { prazdnaCentralna } from "@/lib/centralnaZbierka";
import { useSektory, useOblastiCharity, spustiSektor, SEKTORY_MAX } from "@/lib/sektoryCharity";
import { nazovZPodskupiny } from "@/lib/sekcieCharity";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { TextovePolia, GaleriaEditor } from "./obsahZbierky";
import { overIban, formatujIban } from "./segmenty";
import { kartaK, nadpisK, textK, drobneK, obrysK, zelenyK } from "./spravaCasti";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { ChybaPriTlacidle } from "@/components/ChybaPriTlacidle";

interface Koncept { oblast: string | null; nazov: string; nazovVlastny: boolean; popis: string; popis2: string; media: MediumZbierky[]; iban: string }
const prazdny = (): Koncept => ({ oblast: null, nazov: "", nazovVlastny: false, popis: "", popis2: "", media: [], iban: "" });
const koncepty = new Map<string, Koncept>();
type Pole = "nazov" | "text" | "foto" | "ucet";

const FAJKA = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;

export function NovaSektorova({ strankaId, mobil, toast, onZbierky }: { strankaId: string; mobil: boolean; toast: (m: string) => void; onZbierky: () => void }) {
  const [k, setK0] = useState<Koncept>(() => koncepty.get(strankaId) ?? prazdny());
  const setK = (f: (x: Koncept) => Koncept) => setK0((x) => { const n = f(x); koncepty.set(strankaId, n); return n; });
  const ponuka = useOblastiCharity(strankaId);
  const sektory = useSektory(strankaId);
  const bezi = (p: string) => sektory.some((s) => s.stanovy.toLowerCase() === p.toLowerCase());
  const [spusteny, setSpusteny] = useState<string | null>(null);
  const [ukl, setUkl] = useState(false), [chyba, setChyba] = useState<string | null>(null);
  const rNazov = useRef<HTMLDivElement>(null), rText = useRef<HTMLDivElement>(null), rFoto = useRef<HTMLDivElement>(null), rUcet = useRef<HTMLDivElement>(null);
  const choDo = (r: Pole) => { const el = { nazov: rNazov, text: rText, foto: rFoto, ucet: rUcet }[r].current; el?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const ph = mobil;

  const vyber = (p: string) => setK((x) => ({ ...x, oblast: x.oblast === p ? null : p, nazov: x.nazovVlastny ? x.nazov : x.oblast === p ? "" : nazovZPodskupiny(p) }));
  const zrusVyber = () => setK((x) => ({ ...x, oblast: null, nazov: x.nazovVlastny ? x.nazov : "" }));
  const iban = overIban(k.iban);
  const kontrola: [string, boolean, Pole][] = [
    ["Názov", k.nazov.trim().length > 0, "nazov"],
    ["Text", cistyText(k.popis).length > 0, "text"],
    ["Titulná fotka", k.media.some((m) => m.typ === "foto"), "foto"],
    ["Transparentný účet", !!iban, "ucet"],
  ];
  const mozeSpustit = !!k.oblast && kontrola.every(([, ok]) => ok);
  const plno = sektory.length >= SEKTORY_MAX;

  const spusti = async () => {
    if (!k.oblast || !mozeSpustit || ukl) return;
    setUkl(true); setChyba(null);
    const r = await spustiSektor(strankaId, { oblast: k.oblast, nazov: k.nazov, iban: iban!, obsah: { ...prazdnaCentralna(), popis: k.popis, popis2: k.popis2, media: k.media } });
    setUkl(false);
    if ("chyba" in r) { setChyba(r.chyba); return; }
    koncepty.delete(strankaId);
    setSpusteny(k.oblast);
  };
  const zrus = () => { koncepty.delete(strankaId); setK0(prazdny()); toast("Rozpracovaná sektorová zbierka je zrušená."); onZbierky(); };

  const hlava = (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button type="button" onClick={onZbierky} style={{ alignSelf: "flex-start", minHeight: 44, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>‹ Späť na Zbierky</button>
      <b style={{ fontSize: ph ? 24 : 28, color: "var(--ink)" }}>Nová sektorová zbierka</b>
      {!spusteny && <span style={{ fontSize: 14, color: "var(--ink3)" }}>Rozpracovaná · zatiaľ ju nikto nevidí</span>}
    </div>);

  if (spusteny) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      {hlava}
      <section style={{ ...kartaK, background: "var(--gSoft)", border: "1.5px solid var(--gBd)" }}>
        <b style={{ fontSize: 18, color: "var(--gInk)" }}>Sektorová zbierka {nazovZPodskupiny(spusteny)} beží ✓</b>
        <span style={textK}>Je na vašej stránke v bloku Podporte nás. Na Domov sa neukazuje.</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => otvorVerejnyProfil(strankaId, { zoSpravy: true })} style={obrysK}>Pozrieť na stránke</button>
          <button type="button" onClick={onZbierky} style={zelenyK}>Hotovo · späť do Zbierok</button>
        </div>
      </section>
    </div>);

  const cip = (p: string) => {
    const on = k.oblast === p, b = bezi(p);
    return <button key={p} type="button" aria-pressed={on} aria-disabled={b || undefined} onClick={() => { if (!b) vyber(p); }}
      style={{ minHeight: 44, padding: "0 14px", borderRadius: 22, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: b ? "default" : "pointer", opacity: b ? 0.55 : 1, fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink)", boxShadow: "none", display: "flex", alignItems: "center", gap: 6, textAlign: "left" }}>
      {on && FAJKA}{nazovZPodskupiny(p)}{b && <span style={{ fontWeight: 600, color: "var(--ink3)" }}>· už beží</span>}{on && <span aria-hidden="true" style={{ marginLeft: 4, fontSize: 17, lineHeight: 1 }}>×</span>}
    </button>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      {hlava}
      {plno && <section style={kartaK}><span style={textK}>Máte {sektory.length} z {SEKTORY_MAX} sektorových zbierok. Novú pridáte, keď niektorú ukončíte.</span></section>}
      <section style={kartaK}>
        <span style={nadpisK}>1. Oblasť</span>
        <span style={textK}>Vyberáte z oblastí, ktoré máte v stanovách.</span>
        {ponuka.map((s) => (
          <div key={s.nazov} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{s.nazov.toLocaleUpperCase("sk-SK")}</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{s.podskupiny.map(cip)}</div>
          </div>))}
        {k.oblast && <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
          <span style={{ flex: "1 1 240px", fontSize: 14, lineHeight: 1.45, color: "var(--gInk)" }}>Vybraté: <b>{nazovZPodskupiny(k.oblast)}</b>. Ukliklo sa? Ťuknite na inú oblasť, alebo výber zrušte.</span>
          <button type="button" onClick={zrusVyber} style={{ ...obrysK, minHeight: 44 }}>Zrušiť výber</button>
        </div>}
      </section>

      {k.oblast && <section style={kartaK}>
        <span style={nadpisK}>2. Obsah</span>
        <div ref={rNazov} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>Názov</span>
          <input value={k.nazov} maxLength={30} onChange={(e) => { const v = e.target.value; setK((x) => ({ ...x, nazov: v, nazovVlastny: true })); }} aria-label="Názov sektorovej zbierky"
            style={{ height: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} />
          <span style={drobneK}>Najviac 30 znakov. Takto ho uvidia ľudia na vašej stránke.</span>
        </div>
        <div ref={rText}><TextovePolia popis={k.popis} popis2={k.popis2} onPopis={(h) => setK((x) => ({ ...x, popis: h }))} onPopis2={(h) => setK((x) => ({ ...x, popis2: h }))} ph={ph}
          popisHlavneho="Napíšte, na čo v tejto oblasti idú peniaze. Toto ľudia uvidia hneď." /></div>
        <div ref={rFoto}><GaleriaEditor media={k.media} onMedia={(m) => setK((x) => ({ ...x, media: m }))} ph={ph} nadpis="Fotky" kdeHlavne="na vašom profile" dovetok=" Prvá fotka je titulná. Fotky môžete meniť aj po spustení." /></div>
        <div ref={rUcet} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>Transparentný účet sektora</span>
          <input value={k.iban} onChange={(e) => { const v = formatujIban(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24)); setK((x) => ({ ...x, iban: v })); }} placeholder="SK00 0000 0000 0000 0000 0000" aria-label="Transparentný účet sektora (IBAN)"
            style={{ height: 48, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${k.iban && !iban ? "#C9826B" : "var(--cardBd)"}`, background: "var(--field)", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} />
          <span style={drobneK}>{k.iban && !iban ? "Skontrolujte číslo účtu." : "Vlastný transparentný účet tejto oblasti, nie hlavný účet organizácie."}</span>
        </div>
      </section>}

      {k.oblast && <section style={kartaK}>
        <span style={nadpisK}>Spustiť sektorovú zbierku</span>
        {kontrola.map(([t, ok, r]) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 36 }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{t}</span>
            {ok ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>{FAJKA}hotové</span>
              : <button type="button" onClick={() => choDo(r)} style={{ minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#A34A2A", boxShadow: "none" }}>chýba · doplniť ›</button>}
          </div>))}
        <ChybaPriTlacidle text={chyba} uklada={ukl} onZnova={() => void spusti()} nadpis="Zbierka sa nespustila" />
        {mozeSpustit && !plno ? <span style={{ maxWidth: mobil ? "none" : 360 }}><PodrzTlacidlo label={ukl ? "Spúšťa sa…" : "Podržte a spustite"} trvanie={1500} onConfirm={() => void spusti()} /></span>
          : <span style={textK}>{plno ? "Novú sektorovú zbierku spustíte, keď niektorú ukončíte." : "Keď doplníte, čo chýba, objaví sa tu tlačidlo."}</span>}
        <button type="button" onClick={zrus} style={obrysK}>Zrušiť</button>
      </section>}
    </div>);
}
