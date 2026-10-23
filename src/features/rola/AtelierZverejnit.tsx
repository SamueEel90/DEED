// ============================================================
// OPRAVY 469 · Ateliér → Zverejniť: okno nad stránkou „Zverejniť zmeny?“ so zoznamom zmien.
// Výber V noci o 2:00 (odporúčame, prepne server 0153) alebo Hneď; potvrdenie podržaním 1,5 s, krátky ťuk = nápoveda.
// Výsledok na tom istom mieste: o 2:00 = zlaté „Zmení sa … ✓“ + Zmeniť hneď · Zrušiť zmenu;
// hneď = zelené „Zverejnené ✓“ + Vrátiť späť na {starý} · ešte 7 dní; Hotovo · späť do Nastavení.
// ============================================================
import { useEffect, useState, type CSSProperties } from "react";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { kedy2, najblizsie2, naplanujKoncept, nazovVzhladu, sledujuciStranky, useSpatAtelieru, vratSpat, zmenyKonceptu, zverejniHned, type KonceptAtelieru } from "@/lib/atelier";
import type { Rozlozenie } from "@/lib/rozlozenieFarnosti";
import type { Usporiadanie } from "@/lib/usporiadanieStranky";

const ZLATA = "#C9A24A";
type Stav = "vyber" | "plan" | "hotovo";
const dni = (iso: string) => { const n = Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / 864e5)); return `${n} ${n === 1 ? "deň" : n < 5 ? "dni" : "dní"}`; };

export function AtelierZverejnit({ strankaId, koncept, naostro, uspNaostro, onSpat, onHotovo }: { strankaId: string; koncept: KonceptAtelieru | null;
  naostro: Rozlozenie; uspNaostro: Usporiadanie; /** späť na Moja stránka */ onSpat: () => void; /** Hotovo · späť do Nastavení */ onHotovo: () => void }) {
  const [stav, setStav] = useState<Stav>(koncept?.naplanovane ? "plan" : koncept ? "vyber" : "hotovo");
  const [kedy, setKedy] = useState<"noc" | "hned">("noc");
  const [n, setN] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [chyba, setChyba] = useState("");
  const [bezi, setBezi] = useState(false);
  const [zmeny] = useState(() => (koncept ? zmenyKonceptu(koncept, naostro, uspNaostro) : []));
  const spat = useSpatAtelieru();
  useEffect(() => { let z = true; void sledujuciStranky(strankaId).then((x) => { if (z) setN(x); }); return () => { z = false; }; }, [strankaId]);

  const hned = async () => {
    if (!koncept || bezi) return;
    setBezi(true); setChyba("");
    const e = await zverejniHned(strankaId, koncept, naostro, uspNaostro);
    setBezi(false);
    if (e) setChyba(e); else setStav("hotovo");
  };
  const potvrd = () => { setHint(false); if (kedy === "hned") void hned(); else if (koncept) { naplanujKoncept(koncept, najblizsie2().toISOString()); setStav("plan"); } };
  const vrat = async () => { if (!spat || bezi) return; setBezi(true); setChyba(""); const e = await vratSpat(strankaId, spat); setBezi(false); if (e) setChyba(e); else onHotovo(); };

  const volba = (on: boolean): CSSProperties => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, minHeight: 64, padding: "10px 14px", borderRadius: 14,
    border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--card)", color: "var(--ink)", fontFamily: "inherit", textAlign: "left", cursor: "pointer" });
  const tlac: CSSProperties = { minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };
  const vysledok = (zlate: boolean): CSSProperties => ({ padding: "16px 18px", borderRadius: 16, fontSize: 17, fontWeight: 800, lineHeight: 1.4,
    background: zlate ? "var(--goldBg)" : "var(--gSoft)", border: `1.5px solid ${zlate ? ZLATA : "var(--gBd)"}`, color: zlate ? "var(--gold)" : "var(--gInk)" });

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "rgba(20,17,11,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div role="dialog" aria-modal="true" aria-label="Zverejniť vzhľad" style={{ width: "min(560px, 100%)", maxHeight: "100%", overflowY: "auto", boxSizing: "border-box", borderRadius: 24, background: "var(--bg)", border: "1px solid var(--cardBd)", padding: 24, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
        {stav === "vyber" && koncept && <>
          <b style={{ fontSize: 24 }}>Zverejniť vzhľad?</b>
          <ul style={{ margin: 0, padding: "12px 16px 12px 34px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 6, fontSize: 15.5, lineHeight: 1.45 }}>
            {zmeny.map((z) => <li key={z}>{z}</li>)}
          </ul>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{n ? `Vašu stránku sleduje ${n} ${n === 1 ? "človek" : n < 5 ? "ľudia" : "ľudí"}. ` : ""}V noci to vyruší najmenej.</span>
          <div role="radiogroup" aria-label="Kedy zverejniť" style={{ display: "flex", gap: 10 }}>
            <button type="button" role="radio" aria-checked={kedy === "noc"} onClick={() => { setKedy("noc"); setHint(false); }} style={volba(kedy === "noc")}><b style={{ fontSize: 16 }}>V noci o 2:00</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>odporúčame</span></button>
            <button type="button" role="radio" aria-checked={kedy === "hned"} onClick={() => { setKedy("hned"); setHint(false); }} style={volba(kedy === "hned")}><b style={{ fontSize: 16 }}>Hneď</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>ľudia to uvidia hneď</span></button>
          </div>
          {hint && <span role="status" style={{ fontSize: 14, fontWeight: 800, color: "var(--gold)" }}>Podržte tlačidlo, kým sa nenaplní.</span>}
          {chyba && <span role="alert" style={{ fontSize: 14.5, fontWeight: 800, color: "#B3261E" }}>{chyba}</span>}
          <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}>
            <PodrzTlacidlo label={bezi ? "Zverejňuje sa…" : kedy === "noc" ? "Podržte a zverejnite o 2:00" : "Podržte a zverejnite hneď"} trvanie={1500} disabled={bezi} onHint={() => setHint(true)} onConfirm={potvrd} />
          </div>
          <span style={{ fontSize: 13.5, color: "var(--ink3)", textAlign: "center" }}>{kedy === "noc" ? "Od 2:00 to uvidia všetci." : "Od tejto chvíle to uvidia všetci."}</span>
          <button type="button" onClick={onSpat} style={{ ...tlac, alignSelf: "center" }}>Ešte nie · späť na stránku</button>
        </>}

        {stav === "plan" && <>
          <div role="status" style={vysledok(true)}>Zmení sa {kedy2(koncept?.naplanovane ?? najblizsie2().toISOString())} ✓</div>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>Dovtedy ľudia vidia vašu doterajšiu stránku ({nazovVzhladu(naostro)}). V ateliéri môžete ďalej skúšať, o 2:00 sa zverejní posledná verzia.</span>
          {chyba && <span role="alert" style={{ fontSize: 14.5, fontWeight: 800, color: "#B3261E" }}>{chyba}</span>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" disabled={bezi} onClick={() => void hned()} style={{ ...tlac, background: "#4B7A35", border: "none", color: "#fff" }}>{bezi ? "Zverejňuje sa…" : "Zmeniť hneď"}</button>
            <button type="button" onClick={() => { if (koncept) naplanujKoncept(koncept, null); onSpat(); }} style={tlac}>Zrušiť zmenu</button>
          </div>
          <button type="button" onClick={onHotovo} style={{ ...tlac, alignSelf: "flex-start" }}>Hotovo · späť do Nastavení</button>
        </>}

        {stav === "hotovo" && <>
          <div role="status" style={vysledok(false)}>Zverejnené ✓</div>
          {chyba && <span role="alert" style={{ fontSize: 14.5, fontWeight: 800, color: "#B3261E" }}>{chyba}</span>}
          {spat && <button type="button" disabled={bezi} onClick={() => void vrat()} style={{ ...tlac, alignSelf: "flex-start" }}>Vrátiť späť na {nazovVzhladu(spat.rozlozenie)} · ešte {dni(spat.do)}</button>}
          <button type="button" onClick={onHotovo} style={{ ...tlac, alignSelf: "flex-start", background: "#4B7A35", border: "none", color: "#fff" }}>Hotovo · späť do Nastavení</button>
        </>}
      </div>
    </div>);
}
