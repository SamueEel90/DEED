// ============================================================
// Správa charity → Obsah → Skutky (Takto sme pomohli). Zoznam zverejnených skutkov charity,
// najnovšie hore. OPRAVY 436: ťuk na celú kartu = úprava, zmazanie podržaním (1,5 s). Hore „Pridať skutok" = ten istý skutok za charitu
// ako v Nástrojoch (otvorPridatSkutok cez SpravaStranky). Ako pri Zbierkach: zoznam + Nová zbierka.
// ============================================================
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/data";
import type { GoodPolozka } from "@/types";
import { RichTextInput } from "@/components/richtext";
import { cistyText } from "@/lib/richtext";
import { skutkyOrgSpravy, upravSkutokOrg, useZmenySkutkov, type MojSkutok } from "@/lib/mojeSkutky";
import { upravSkutokVoFeede, zmazSkutokZFeedu, nacitajSkutkyStranky, useZmenySkutkovStranky } from "@/lib/skutkyStranky";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 };
const tlZ: CSSProperties = { minHeight: 48, padding: "0 20px", border: "none", borderRadius: 14, background: "var(--green)", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8, flex: "none" };
const tlO: CSSProperties = { minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink2)" };
const poleS: CSSProperties = { minHeight: 48, padding: "0 14px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const datum = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
const plus = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;

export function SkutkyCharity({ strankaId, mobil, onPridat }: { strankaId: string; mobil: boolean; onPridat: () => void }) {
  useZmenySkutkov(); useZmenySkutkovStranky();
  // OPRAVY 443 (1): ten istý zoznam ako na stránke charity (server), nie len z tohto zariadenia
  useEffect(() => { void nacitajSkutkyStranky(strankaId); }, [strankaId]);
  // OPRAVY 436: zmazaný skutok ostane na mieste ako zelená hláška „Skutok je zmazaný“ (do odchodu z obrazovky)
  const [zmazane, setZmazane] = useState<Map<string, MojSkutok>>(() => new Map());
  const zoznam = [...skutkyOrgSpravy(strankaId).filter((x) => !zmazane.has(x.id)), ...zmazane.values()].sort((a, b) => b.datum - a.datum);
  const pridat = <button type="button" onClick={onPridat} style={tlZ}>{plus}Pridať skutok</button>;

  if (!zoznam.length) return (
    <section style={{ ...karta, alignItems: "center", textAlign: "center", padding: mobil ? "32px 20px" : "44px 24px" }}>
      <b style={{ fontSize: 18, color: "var(--ink)" }}>Zatiaľ žiadny skutok</b>
      {pridat}
    </section>);

  return (<>
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ flex: 1, fontSize: 14, color: "var(--ink3)" }}>Zverejnené · {zoznam.filter((x) => !x.stiahnuty).length}</span>
      {pridat}
    </div>
    {zoznam.map((s) => s.stiahnuty
      ? <section key={s.id} role="status" style={{ ...karta, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}><b style={{ fontSize: 15.5, color: "var(--gInk)" }}>Skutok je zmazaný</b></section>
      : <Riadok key={s.id} s={s} strankaId={strankaId} mobil={mobil} onZmazany={() => setZmazane((m) => new Map(m).set(s.id, { ...s, stiahnuty: new Date().toISOString() }))} />)}
  </>);
}

function Riadok({ s, strankaId, mobil, onZmazany }: { s: MojSkutok; strankaId: string; mobil: boolean; onZmazany: () => void }) {
  const [uprava, setUprava] = useState(false);
  const [uklada, setUklada] = useState(false), [chyba, setChyba] = useState<string | null>(null); // OPRAVY 443 (1)
  const [nazov, setNazov] = useState(s.nazov);
  const [popis, setPopis] = useState(s.popis);
  const foto = s.fotky[0];
  // feed: úprava a stiahnutie hneď aj v okolí (v appke); TODO server: úprava / skrytie položky v DB
  const qc = useQueryClient();
  const vofeede = (f: (x: GoodPolozka) => GoodPolozka | null) => { if (s.feedId == null) return; qc.setQueriesData<GoodPolozka[]>({ queryKey: qk.good.feed }, (old = []) => old.flatMap((x) => (x.id === s.feedId ? (f(x) ? [f(x)!] : []) : [x]))); };
  const ok = nazov.trim().length > 0 && cistyText(popis).length > 0;
  const zmaz = () => { void upravSkutokOrg(strankaId, s.id, { stiahnuty: new Date().toISOString() }).then((e) => { if (e) { setChyba(e); return; } vofeede(() => null); void zmazSkutokZFeedu(s.prispevokId); onZmazany(); }); };
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const obsah: ReactNode = (<>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexDirection: mobil ? "column" : "row" }}>
        <span style={{ width: mobil ? "100%" : 132, aspectRatio: "16 / 10", flex: "none", borderRadius: 14, background: foto ? `url('${foto}') center/cover no-repeat var(--track)` : s.grad ?? "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)" }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <b style={{ fontSize: 16.5, color: "var(--ink)" }}>{s.nazov}</b>
            {s.upraveny && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>upravené</span>}
          </span>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{datum(s.datum)}{s.miesto ? ` · ${s.miesto}` : ""}</span>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cistyText(s.popis)}</span>
        </span>
      </div>
  </>);
  if (uprava) return (
    <section style={karta}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexDirection: mobil ? "column" : "row" }}>
        <span style={{ width: mobil ? "100%" : 132, aspectRatio: "16 / 10", flex: "none", borderRadius: 14, background: foto ? `url('${foto}') center/cover no-repeat var(--track)` : s.grad ?? "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)" }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <b style={{ fontSize: 16.5, color: "var(--ink)" }}>{s.nazov}</b>
            {s.upraveny && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>upravené</span>}
          </span>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{datum(s.datum)}{s.miesto ? ` · ${s.miesto}` : ""}</span>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cistyText(s.popis)}</span>
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 14, background: "var(--field)" }}>
        <input value={nazov} onChange={(e) => setNazov(e.target.value.slice(0, 80))} aria-label="Nadpis skutku" style={poleS} />
        <RichTextInput vzhlad="sprava" value={popis} onChange={setPopis} minH={120} ariaLabel="Text skutku" nastroje={["bold", "italic", "insertUnorderedList", "diktovat"]} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { setNazov(s.nazov); setPopis(s.popis); setUprava(false); }} style={tlO}>Zrušiť</button>
          <button type="button" aria-disabled={!ok} onClick={() => { if (!ok || uklada) return; setUklada(true); setChyba(null); void upravSkutokOrg(strankaId, s.id, { nazov: nazov.trim(), popis, upraveny: new Date().toISOString() }).then((e) => { setUklada(false); if (e) { setChyba(e); return; } void upravSkutokVoFeede(s.prispevokId, { titul: nazov.trim(), popis: cistyText(popis) }); vofeede((x) => ({ ...x, titul: nazov.trim(), popis: cistyText(popis) })); setUprava(false); }); }} style={{ ...tlZ, opacity: ok ? 1 : 0.5 }}>{uklada ? "Ukladá sa…" : "Uložiť"}</button>
        </div>
        {chyba && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cRed, #A34A2A)" }}>{chyba}</span>}
      </div>
    </section>);
  // OPRAVY 436: ťuk na celú kartu = úprava (bez tlačidla Upraviť); zmazanie podržaním s vetou, čo sa stane
  return (
    <section role="button" tabIndex={0} aria-label={`Upraviť skutok: ${s.nazov}`} onClick={() => setUprava(true)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setUprava(true); } }} style={{ ...karta, cursor: "pointer" }}>
      {obsah}
      <div onClick={stop} onKeyDown={stop} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13.5, color: "var(--ink3)", textAlign: "center" }}>Zmizne zo stránky aj z feedu.</span>
        <PodrzTlacidlo farba="cervena" trvanie={1500} label="Podržte a zmažte skutok" onConfirm={zmaz} />
      </div>
    </section>);
}
