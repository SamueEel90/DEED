// ============================================================
// OPRAVY 408 · Správa charity → Ľudia → Pracovné ponuky (od P1).
// Engine ako Inzeraty.tsx (oznam_subjektu, kategória „inzerat“, záujemcovia, Obsadené, limit 1 / 5 / bez limitu,
// kontakty sa po zavretí zmažú), vzhľad a postup ako Brigády (BrigadyFarnosti.tsx): formulár na mieste,
// vedľa živý náhľad plagátu „Hľadáme ľudí“, Podržte a zverejnite, zelená hláška, zmazať podržaním.
// Navyše oproti brigáde: úväzok, mzda, uzávierka, ako sa prihlásiť, čo priložiť, dokument (PDF), záujemcovia.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { kartaVolby, FajkaVolby } from "@/components/Volby";
import { RichTextInput } from "@/components/richtext";
import { FormatovanyText } from "@/components/formattext";
import { PracaKarta } from "@/components/PracaKarta";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";
import { RamFormulara, ZahoditRozpisane, useRamPisania } from "@/components/RamPisania";
import { cistyText } from "@/lib/richtext";
import { ulozPrilohu, zmazPrilohu, PRILOHA_CFG } from "@/lib/prilohy";
import {
  INZERAT_CFG, OZNAM_CFG, useOznamy, zmenOznamy, beziaceInzeraty, limitInzeratov, dniDoKonca, type Oznam, type PonukaDetail,
} from "@/lib/oznamy";
import { TextovePolia } from "./obsahZbierky";

const ZELENA = "#4B7A35", CERV = "#A34A2A";
const DEN = 86400000;
const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const pole: CSSProperties = { height: 48, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" };
const kick: CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" };
const hlaskaSt: CSSProperties = { padding: "10px 14px", borderRadius: 12, background: "var(--gSoft)", border: `1.5px solid ${ZELENA}`, fontSize: 14, fontWeight: 700, color: "var(--gInk)" };
const chybaSt: CSSProperties = { padding: "10px 14px", borderRadius: 12, background: "rgba(163,74,42,.08)", border: `1.5px solid ${CERV}`, fontSize: 14, fontWeight: 700, color: CERV };
const obrys: CSSProperties = { minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" };
const pozn: CSSProperties = { fontSize: 13, color: "var(--ink3)", lineHeight: 1.45 };

const naDatum = (ms?: number) => (ms ? new Date(ms).toISOString().slice(0, 10) : "");
const zDatumu = (s: string) => (s ? new Date(`${s}T00:00:00`).getTime() : undefined);
const kratko = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const tvar = (n: number, t: [string, string, string]) => `${n} ${n === 1 ? t[0] : n > 1 && n < 5 ? t[1] : t[2]}`;

/** pracovná ponuka → plagát „Hľadáme ľudí“ (ten istý vo verejnom profile aj v náhľade) */
export function pracaZPonuky(o: Pick<Oznam, "id" | "nadpis" | "text" | "ponuka" | "zaujemcovia">) {
  const p = o.ponuka ?? {}, n = (o.zaujemcovia ?? []).length;
  return {
    id: o.id, nazov: o.nadpis, stitok: p.uvazok?.trim().toLocaleUpperCase("sk-SK") || undefined,
    pod: p.uzavierka ? `prihlásiť sa do ${kratko(p.uzavierka)}` : undefined,
    opis: cistyText(o.text).trim() || undefined, kde: p.miesto?.trim() || undefined, kedy: p.nastup?.trim() ? `nástup ${p.nastup.trim()}` : undefined,
    odmena: p.mzda?.trim() || undefined, tretiRiadok: "Mzda", zaujem: n ? `${tvar(n, ["človek už má", "ľudia už majú", "ľudí už má"])} záujem` : undefined,
  };
}

type Form = { t: string; nastup: string; kde: string; txt: string; uvazok: string; mzda: string; uzav: string; cezDeed: boolean; email: string; adresa: string; doklady: string; priloha?: string; prilohaNazov?: string; dni: number };
const prazdny = (): Form => ({ t: "", nastup: "", kde: "", txt: "", uvazok: "", mzda: "", uzav: "", cezDeed: true, email: "", adresa: "", doklady: "", dni: INZERAT_CFG.platnostDni });
const zOznamu = (o: Oznam): Form => { const p = o.ponuka ?? {}; return { t: o.nadpis, nastup: p.nastup ?? "", kde: p.miesto ?? "", txt: o.text, uvazok: p.uvazok ?? "", mzda: p.mzda ?? "", uzav: naDatum(p.uzavierka), cezDeed: p.cezDeed ?? true, email: p.email ?? "", adresa: p.adresa ?? "", doklady: p.doklady ?? "", priloha: p.priloha, prilohaNazov: p.prilohaNazov, dni: o.platnostDni }; };

function Zaujemcovia({ o, onSpat }: { o: Oznam; onSpat: () => void }) {
  const ludia = o.zaujemcovia ?? [];
  return (
    <section style={{ ...karta, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <button type="button" onClick={onSpat} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)" }}>‹ Späť na pracovné ponuky</button>
      <b style={{ fontSize: 19 }}>Záujemcovia</b>
      <span style={{ fontSize: 14, color: "var(--ink3)" }}>{o.nadpis}</span>
      {ludia.length === 0 ? <span style={pozn}>Zatiaľ sa nikto neozval. Ponuku vidia ľudia na vašej stránke v bloku Hľadáme ľudí.</span>
        : ludia.map((z, i) => (
          <div key={z.id} style={{ padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ fontSize: 15.5 }}>{z.meno}</b>
            <span style={{ fontSize: 14, color: "var(--ink2)" }}>{[z.telefon, z.email].filter(Boolean).join(" · ") || "kontakt neuviedol"}</span>
            {z.poznamka && <FormatovanyText text={z.poznamka} style={{ fontSize: 14, color: "var(--ink2)", lineHeight: 1.45 }} />}
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>ozval sa {new Date(z.kedy).toLocaleDateString("sk-SK")}</span>
          </div>))}
      <span style={pozn}>Kontakty záujemcov sa {INZERAT_CFG.dniDoZmazaniaKontaktov} dní po zavretí ponuky zmažú.</span>
    </section>);
}

export function PonukyPrace({ strankaId, tier, mobil }: { strankaId: string; tier: number; mobil: boolean }) {
  const entita = `stranka:${strankaId}`;
  const L = useOznamy(entita, "inzerat");
  const [teraz] = useState(() => Date.now());
  const [on, setOn] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [zaujem, setZaujem] = useState<string | null>(null);
  const [f, setFf] = useState<Form>(prazdny);
  const [kluc, setKluc] = useState(0);
  const [hl, setHl] = useState<{ t: string; chyba?: boolean } | null>(null);
  const [chybaPdf, setChybaPdf] = useState("");
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const hlas = (t: string, chyba?: boolean) => { window.clearTimeout(tm.current); setHl({ t, chyba }); if (!chyba) tm.current = window.setTimeout(() => setHl(null), 4000); };
  const setF = (p: Partial<Form>) => setFf((q) => ({ ...q, ...p }));
  const ram = useRamPisania();

  const limit = limitInzeratov(tier);
  const bezi = beziaceInzeraty(entita, teraz).filter((o) => o.id !== edit);
  const plne = !edit && bezi.length >= limit;
  const dlzka = cistyText(f.txt).length;
  const ch = [!f.t.trim() && "koho hľadáte", dlzka > OZNAM_CFG.maxTextPonuky && "kratší text",
    !f.cezDeed && !f.email.trim() && !f.adresa.trim() && "ako sa prihlásiť"].filter(Boolean) as string[];
  const ponuka = (): PonukaDetail => ({ miesto: f.kde.trim() || undefined, uvazok: f.uvazok.trim() || undefined, nastup: f.nastup.trim() || undefined, mzda: f.mzda.trim() || undefined,
    uzavierka: zDatumu(f.uzav), cezDeed: f.cezDeed, email: f.email.trim() || undefined, adresa: f.adresa.trim() || undefined, doklady: cistyText(f.doklady).trim() ? f.doklady : undefined,
    priloha: f.priloha, prilohaNazov: f.prilohaNazov });

  const otvor = (o?: Oznam) => { setEdit(o?.id ?? null); setFf(o ? zOznamu(o) : prazdny()); setKluc((k) => k + 1); setChybaPdf(""); setHl(null); setOn(true); };
  const spat = () => { setOn(false); setEdit(null); };
  const zverejni = async () => {
    if (ch.length || plne) return;
    const t = f.t.trim().slice(0, OZNAM_CFG.maxNadpis);
    const ok = await zmenOznamy(entita, (v) => edit
      ? v.map((o) => (o.id === edit ? { ...o, nadpis: t, text: f.txt, platnostDni: f.dni, ponuka: ponuka(), upravene: Date.now() } : o))
      : [{ id: `oz-${Date.now()}`, entita, kategoria: "inzerat", nadpis: t, text: f.txt, platnostDni: f.dni, vytvorene: Date.now(), ponuka: ponuka() }, ...v]);
    if (!ok) { hlas("Neuložilo sa · skúste znova", true); return; }
    setOn(false); setEdit(null);
    hlas(`${edit ? "Zmeny sú uložené ✓" : "Zverejnené ✓"} ${t} je na stránke v bloku Hľadáme ľudí.`);
  };
  const akcia = async (fn: (v: Oznam[]) => Oznam[], ok: string) => { const v = await zmenOznamy(entita, fn); hlas(v ? ok : "Neuložilo sa · skúste znova", !v); };

  const otv = zaujem ? L.find((o) => o.id === zaujem) : null;
  if (otv) return <Zaujemcovia o={otv} onSpat={() => setZaujem(null)} />;

  const nahlad = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={kick}>NÁHĽAD · TAKTO TO BUDE V BLOKU HĽADÁME ĽUDÍ</span>
      <PracaKarta j={pracaZPonuky({ id: "nahlad", nadpis: f.t.trim() || "Koho hľadáte", text: f.txt, ponuka: ponuka() })} />
    </div>);

  const polia = <>
    <label style={lab}>Koho hľadáte<input value={f.t} onChange={(e) => setF({ t: e.target.value.slice(0, OZNAM_CFG.maxNadpis) })} placeholder="napr. Sociálna pracovníčka do denného centra" style={pole} /></label>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
      <label style={lab}>Nástup<input value={f.nastup} onChange={(e) => setF({ nastup: e.target.value.slice(0, 40) })} placeholder="napr. ihneď, 1. 12." style={pole} /></label>
      <label style={lab}>Miesto<input value={f.kde} onChange={(e) => setF({ kde: e.target.value.slice(0, 60) })} placeholder="napr. Trenčín, Hviezdoslavova 5" style={pole} /></label>
    </div>
    <TextovePolia key={kluc} popis={f.txt} popis2="" onPopis={(h) => setF({ txt: h })} onPopis2={() => {}} ph={mobil} bezPokracovania
      popisHlavneho="Čo bude robiť, čo požadujete, čo ponúkate." placeholder="napr. Práca s klientmi denného centra, sprevádzanie na úrady. Požadujeme vzdelanie v sociálnej práci." />
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
      <label style={lab}>Úväzok<input value={f.uvazok} onChange={(e) => setF({ uvazok: e.target.value.slice(0, 30) })} placeholder="napr. plný, polovičný, brigáda" style={pole} /></label>
      <label style={lab}>Mzda · nepovinné<input value={f.mzda} onChange={(e) => setF({ mzda: e.target.value.slice(0, 40) })} placeholder="napr. od 1 100 € mesačne" style={pole} /></label>
    </div>
    <label style={lab}>Uzávierka prihlášok · nepovinné<input type="date" value={f.uzav} onChange={(e) => setF({ uzav: e.target.value })} style={{ ...pole, maxWidth: 220 }} /></label>
    <span style={{ ...pozn, marginTop: -6 }}>Po uzávierke ponuka zíde zo stránky sama.</span>

    <span style={lab}>Ako sa prihlásiť</span>
    <button type="button" role="checkbox" aria-checked={f.cezDeed} onClick={() => setF({ cezDeed: !f.cezDeed })}
      style={{ minHeight: 56, padding: "8px 36px 8px 14px", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", ...kartaVolby(f.cezDeed) }}>
      <FajkaVolby on={f.cezDeed} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>Mám záujem · cez DEED+</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>človek ťukne, vy uvidíte meno a kontakt</span></span>
    </button>
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
      <label style={lab}>Žiadosť e-mailom · nepovinné<input value={f.email} inputMode="email" onChange={(e) => setF({ email: e.target.value.slice(0, 120) })} placeholder="napr. prace@charita.sk" style={pole} /></label>
      <label style={lab}>Žiadosť poštou · nepovinné<input value={f.adresa} onChange={(e) => setF({ adresa: e.target.value.slice(0, 120) })} placeholder="ulica, PSČ, mesto" style={pole} /></label>
    </div>
    <span style={lab}>Čo priložiť · nepovinné</span>
    <RichTextInput value={f.doklady} onChange={(h) => setF({ doklady: h })} minH={80} tvrdyLimit={500} maxZnakov={500}
      placeholder="napr. životopis, doklad o vzdelaní, čestné vyhlásenie" ariaLabel="Čo priložiť" nastroje={["bold", "italic", "insertUnorderedList", "diktovat"]} />
    <span style={lab}>Dokument výberového konania · PDF, nepovinné</span>
    {f.priloha
      ? <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, overflowWrap: "anywhere" }}>{f.prilohaNazov || "Dokument (PDF)"}</span>
          <button type="button" onClick={() => { void zmazPrilohu(f.priloha); setF({ priloha: undefined, prilohaNazov: undefined }); }} style={obrys}>Odstrániť</button>
        </span>
      : <label style={{ ...obrys, alignSelf: "flex-start", display: "flex", alignItems: "center" }}>+ Pridať PDF (do {PRILOHA_CFG.maxMB} MB)
          <input type="file" accept="application/pdf" hidden onChange={(e) => {
            const s = e.target.files?.[0]; e.target.value = ""; if (!s) return; setChybaPdf("");
            void ulozPrilohu(s).then((ref) => setF({ priloha: ref, prilohaNazov: s.name })).catch((err: Error) => setChybaPdf(err.message));
          }} /></label>}
    {chybaPdf && <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: CERV }}>{chybaPdf}</span>}
    <span style={lab}>Ako dlho má byť na stránke</span>
    <div role="radiogroup" aria-label="Ako dlho má byť na stránke" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {INZERAT_CFG.platnosti.map((d) => { const a = f.dni === d; return <button key={d} type="button" role="radio" aria-checked={a} onClick={() => setF({ dni: d })} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: a ? `2px solid ${ZELENA}` : "1px solid var(--cardBd)", background: a ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>{d} dní</button>; })}
    </div>
    {!edit && (f.t.trim() || dlzka > 0) && <ZahoditRozpisane onZahodit={spat} />}
  </>;
  const dole = <>
    {plne && <span style={{ fontSize: 14, fontWeight: 700, color: CERV }}>Vo vašom programe {limit === 1 ? "môže byť naraz na stránke jedna ponuka" : `môže byť naraz na stránke ${limit} ponúk`}. Najprv niektorú zavrite.</span>}
    {ch.length > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: CERV }}>Ešte chýba: {ch.join(", ")}.</span>}
    {hl?.chyba && <span role="alert" style={chybaSt}>{hl.t}</span>}
    {ch.length || plne ? <span style={{ minHeight: 52, borderRadius: 14, background: "var(--btn)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15.5, fontWeight: 800 }}>{edit ? "Podržte a uložte zmeny" : "Podržte a zverejnite"}</span>
      : <DrzTlacidlo ms={1500} plnenie="rgba(255,255,255,.3)" styl={{ minHeight: 52, borderRadius: 14, border: "none", background: ZELENA, color: "#fff", fontSize: 15.5, fontWeight: 800 }} onHotovo={() => void zverejni()}>{edit ? "Podržte a uložte zmeny" : "Podržte a zverejnite"}</DrzTlacidlo>}
  </>;
  if (on && ram) return <RamFormulara nazov={edit ? "Úprava ponuky" : "Nová pracovná ponuka"} onSpat={spat} nahlad={nahlad} dole={dole}>{polia}</RamFormulara>;
  if (on) return (
    <section style={{ ...karta, padding: mobil ? "14px 14px" : "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <button type="button" onClick={spat} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)" }}>‹ Späť na pracovné ponuky</button>
      <b style={{ fontSize: 19 }}>{edit ? "Upravujete ponuku" : "Nová pracovná ponuka"}</b>
      <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1.3fr) minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>{polia}{dole}</div>
        {nahlad}
      </div>
    </section>);

  const vsetkyBezi = beziaceInzeraty(entita, teraz);
  const riadok = (o: Oznam, i: number) => {
    const b = vsetkyBezi.some((x) => x.id === o.id), n = (o.zaujemcovia ?? []).length;
    const stav = b ? `na stránke ešte ${tvar(dniDoKonca(o, teraz), ["deň", "dni", "dní"])}` : o.obsadene ? "OBSADENÉ · na stránke nie je" : "SKONČILA · na stránke nie je";
    return (
      <div key={o.id} style={{ padding: "14px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", display: "flex", flexDirection: "column", gap: 6 }}>
        <b style={{ fontSize: 15.5 }}>{o.nadpis}</b>
        <span style={{ fontSize: 13, color: b ? "var(--ink3)" : CERV, fontWeight: b ? 500 : 700 }}>{[stav, o.ponuka?.uzavierka ? `uzávierka ${kratko(o.ponuka.uzavierka)}` : "", n ? tvar(n, ["záujemca", "záujemcovia", "záujemcov"]) : ""].filter(Boolean).join(" · ")}</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setZaujem(o.id)} style={obrys}>Záujemcovia ({n})</button>
          <button type="button" onClick={() => otvor(o)} style={obrys}>Upraviť</button>
          {b ? <button type="button" onClick={() => void akcia((v) => v.map((x) => (x.id === o.id ? { ...x, obsadene: Date.now() } : x)), `Obsadené ✓ ${o.nadpis} už na stránke nie je.`)} style={obrys}>Obsadené · zavrieť</button>
            : <button type="button" disabled={vsetkyBezi.length >= limit} onClick={() => void akcia((v) => v.map((x) => (x.id === o.id ? { ...x, obsadene: undefined, vytvorene: Date.now(), ponuka: x.ponuka && x.ponuka.uzavierka && x.ponuka.uzavierka + DEN < Date.now() ? { ...x.ponuka, uzavierka: undefined } : x.ponuka } : x)), `Zverejnené ✓ ${o.nadpis} je zase na stránke.`)} style={{ ...obrys, opacity: vsetkyBezi.length >= limit ? 0.5 : 1 }}>Pustiť znova</button>}
          <DrzTlacidlo ms={1200} styl={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${CERV}`, background: "transparent", color: CERV, fontSize: 14, fontWeight: 800 }}
            onHotovo={() => void akcia((v) => v.filter((x) => x.id !== o.id), `Ponuka zmazaná ✓ ${o.nadpis}`)}>Podržte · zmazať</DrzTlacidlo>
        </div>
      </div>);
  };
  const zoradene = [...L].sort((a, b) => Number(vsetkyBezi.some((x) => x.id === b.id)) - Number(vsetkyBezi.some((x) => x.id === a.id)) || b.vytvorene - a.vytvorene);
  return (<>
    <span style={kick}>PRACOVNÉ PONUKY</span>
    <section style={{ ...karta, padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Hľadáte zamestnanca, brigádnika alebo pomoc za mzdu? Na stránke charity sa ukáže v bloku <b>Hľadáme ľudí</b> s tlačidlom Mám záujem.</span>
      <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{limit >= 9999 ? "Na stránke môže byť naraz neobmedzene ponúk" : `Na stránke ${limit === 1 ? "môže byť naraz 1 ponuka" : `môže byť naraz ${limit} ponúk`}`} · teraz {vsetkyBezi.length}</span>
      <button type="button" onClick={() => otvor()} disabled={vsetkyBezi.length >= limit} style={{ alignSelf: "flex-start", minHeight: 50, padding: "0 20px", border: "none", borderRadius: 14, background: ZELENA, color: "#fff", cursor: vsetkyBezi.length >= limit ? "default" : "pointer", opacity: vsetkyBezi.length >= limit ? 0.5 : 1, fontFamily: "inherit", fontSize: 15.5, fontWeight: 800 }}>+ Vytvoriť ponuku</button>
      {vsetkyBezi.length >= limit && <span style={pozn}>Ďalšiu ponuku pridáte, keď niektorú zavriete (Obsadené).</span>}
      {hl && (hl.chyba ? <span role="alert" style={chybaSt}>{hl.t}</span> : <span role="status" style={hlaskaSt}>{hl.t}</span>)}
      {zoradene.length > 0 && <div style={{ display: "flex", flexDirection: "column" }}>{zoradene.map(riadok)}</div>}
    </section>
  </>);
}
