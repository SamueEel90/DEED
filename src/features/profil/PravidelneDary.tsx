// ============================================================
// OPRAVY 352 (odpovede 18. 10.) · Profil → Pravidelné dary: komu · suma · ako často · od kedy,
// pri každom Podržte · zrušiť (1,5 s) → na mieste „Zrušené ✓ · ďalší mesiac sa nestrhne“. Server 0109.
// ============================================================
import { useEffect, useState } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { mojePravidelne, zrusPravidelny, type PravidelnyDar, type PeriodaPP } from "@/lib/pravidelnaPodpora";
import { sumaEur } from "@/lib/suma";
import "@/styles/platba.css";

const SLOVO: Record<PeriodaPP, string> = { tyzdenne: "týždenne", mesacne: "mesačne", rocne: "ročne" };
const DALSI: Record<PeriodaPP, string> = { tyzdenne: "ďalší týždeň", mesacne: "ďalší mesiac", rocne: "ďalší rok" };
const karta = { borderRadius: 18, background: "var(--d-card, var(--card))", border: "1px solid var(--d-cardBd, var(--cardBd))", padding: 16 } as const;
const datum = (t: number) => { const d = new Date(t); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };

function Riadok({ d }: { d: PravidelnyDar }) {
  const [st, setSt] = useState<{ busy?: boolean; ok?: boolean; e?: string; hint?: boolean } | null>(null);
  const zrus = async () => {
    if (st?.busy || st?.ok) return;
    setSt({ busy: true });
    const e = await zrusPravidelny(d);
    setSt(e ? { e } : { ok: true });
  };
  const suma = d.mena === "EURC" ? `${d.suma.toLocaleString("sk-SK")} EURC` : sumaEur(d.suma);
  return (
    <div style={{ ...karta, display: "flex", flexDirection: "column", gap: 10, opacity: st?.ok ? 0.85 : 1 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <b style={{ fontSize: 16 }}>{d.komu}</b>
        <span style={{ fontSize: 14, color: "var(--ink2)" }}>{suma} · {SLOVO[d.perioda]} · od {datum(d.od)}</span>
      </div>
      {st?.ok
        ? <span role="status" style={{ minHeight: 44, display: "flex", alignItems: "center", fontSize: 15, fontWeight: 800, color: "var(--gInk, var(--green))" }}>Zrušené ✓ · {DALSI[d.perioda]} sa nestrhne</span>
        : <>
          <PodrzTlacidlo label={st?.busy ? "Ruším …" : st?.e ? `${st.e} · Skúsiť znova` : "Podržte · zrušiť"} farba="zlata" trvanie={1500} disabled={!!st?.busy}
            onConfirm={() => void zrus()} onHint={() => setSt((x) => ({ ...(x ?? {}), hint: true }))} />
          {st?.hint && !st.e && <span style={{ fontSize: 13, color: "var(--ink3)" }}>Podržte tlačidlo 1,5 sekundy.</span>}
        </>}
    </div>);
}

export function PravidelneDary({ onBack, desktop }: { onBack: () => void; desktop?: boolean }) {
  const [zoznam, setZoznam] = useState<PravidelnyDar[] | { e: string } | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => { let ziva = true; void mojePravidelne().then((v) => { if (ziva) setZoznam(v); }); return () => { ziva = false; }; }, [n]);
  return (
    <div className="deed-platba" style={{ padding: "0 16px 30px", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        {!desktop && <SpatTlacidlo onClick={onBack} />}
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Pravidelné dary</h1>
      </div>
      {zoznam == null ? <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Načítavam …</span>
        : "e" in zoznam ? <div role="alert" style={{ ...karta, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#A34A2A" }}>{zoznam.e}</span>
            <button type="button" onClick={() => { setZoznam(null); setN((x) => x + 1); }} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800 }}>Skúsiť znova</button>
          </div>
        : zoznam.length === 0 ? <div style={{ ...karta, fontSize: 15, color: "var(--ink2)" }}>Zatiaľ žiadne pravidelné dary.</div>
        : zoznam.map((d) => <Riadok key={d.id} d={d} />)}
    </div>);
}
