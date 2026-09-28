// KARTA 14 · Reťaz dobra — tvorca nastaví rad zbierok a percentá (5–100 %, po 5), zhrnutie, podrž a zapečať, beží.
// Beží vždy len jedna zbierka; po zapečatení sa nedá meniť nič. Centrálny QR tvorcu sa nikde neukazuje —
// len QR bežiacej dvojice tvorca + zbierka.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePouzivatel } from "@/lib/pouzivatel";
import { DeedQr } from "@/components/deedqr";
import { ohlasZbierku, nacitajRetaz, zapecatRetaz, zrusRetaz, beziaca, verejneBeziace, zbierkaVRetazi, zaokruhliPct, useZmenyRetaze, type StavVRetazi, type ZbierkaVRetazi } from "@/lib/retaz";
import { Harok } from "./Zdielat";
import PodrzTlacidlo from "./PodrzTlacidlo";
import { potvrditTuknutim } from "./Platba";

type Krok = "nastavenie" | "vyber" | "zhrnutie" | "bezi";
type VRade = { zbierkaId: string; pct: number };

const eW = (n: number) => `${Math.round(n).toLocaleString("sk-SK")} €`;
const e2 = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* bez vibrácie */ } };
const karta: CSSProperties = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" };
const nadpis: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)" };
const cielTxt = (z: ZbierkaVRetazi) => (z.ciel ? `${eW(z.vyzbierane)} z ${eW(z.ciel)}` : `${eW(z.vyzbierane)} · bez cieľa`);

const STAV: Record<StavVRetazi | "rad", [string, string, string]> = {
  bezi: ["Beží teraz", "var(--gSoft)", "var(--gInk)"], caka: ["Čaká", "var(--track)", "var(--ink2)"], rad: ["Čaká", "var(--track)", "var(--ink2)"],
  naplnena: ["Naplnená", "var(--bSoft)", "var(--blue)"], skoncila: ["Skončila", "var(--bSoft)", "var(--blue)"], preskocena: ["Preskočená", "var(--track)", "var(--ink3)"],
};
const Stitok = ({ t, bg, ink }: { t: string; bg: string; ink: string }) =>
  <span style={{ display: "inline-block", marginTop: 6, padding: "3px 8px", borderRadius: 8, background: bg, color: ink, fontSize: 11.5, fontWeight: 700 }}>{t}</span>;
const Cislo = ({ n, prve }: { n: number; prve: boolean }) =>
  <span style={{ width: 26, height: 26, borderRadius: "50%", background: prve ? "var(--green)" : "var(--track)", color: prve ? "#fff" : "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flex: "none", marginTop: 2 }}>{n}</span>;
const Pruh = ({ z }: { z: ZbierkaVRetazi }) => z.ciel ? (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <div style={{ height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}>
      <div className="zb-pruh" style={{ height: "100%", background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, z.vyzbierane / z.ciel)})` }} />
    </div>
    <div style={{ fontSize: 12, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{cielTxt(z)}</div>
  </div>) : null;
const Ikonka = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const Info = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.45, color: "var(--ink2)" }}>
    <svg style={{ flex: "none", marginTop: 1, color: "var(--ink3)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg><span>{children}</span>
  </div>);
const Tlacidlo = ({ label, onClick, druhe, disabled }: { label: string; onClick: () => void; druhe?: boolean; disabled?: boolean }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    style={{ height: 54, padding: "0 18px", borderRadius: 16, border: druhe ? "none" : "none", background: druhe ? "var(--btn)" : "var(--green)", color: druhe ? "var(--ink)" : "#fff", fontSize: 16, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .4 : 1, fontFamily: "inherit" }}>{label}</button>);

export function RetazDobraHarok({ zbierka, onClose }: { zbierka: { id: string; nazov: string; org?: string; ciel?: number | null; vyzbierane?: number }; onClose: () => void }) {
  const zbierkaId = zbierka.id;
  // zbierka, z ktorej sa reťaz otvára, je v rade prvá (aj keď nie je v katalógu)
  useState(() => ohlasZbierku(zbierka.id, { nazov: zbierka.nazov, org: zbierka.org ?? "", ciel: zbierka.ciel ?? null, zaklad: zbierka.vyzbierane ?? 0 }));
  useZmenyRetaze();
  const ja = usePouzivatel();
  const meno = `${ja.meno || "Ty"}${ja.priezvisko ? ` ${ja.priezvisko[0].toUpperCase()}.` : ""}`;
  const retaz = nacitajRetaz();
  const [krok, setKrok] = useState<Krok>(() => (nacitajRetaz() ? "bezi" : "nastavenie"));
  const [rad, setRad] = useState<VRade[]>(() => (zbierkaVRetazi(zbierkaId)?.aktivna ? [{ zbierkaId, pct: 25 }] : []));
  const [hladaj, setHladaj] = useState("");
  const podrz = !potvrditTuknutim();
  const obalRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const sc = obalRef.current?.parentElement; if (sc) sc.scrollTop = 0; }, [krok]);

  const z = (id: string) => zbierkaVRetazi(id);
  const nastavPct = (i: number, v: number) => {
    const pct = zaokruhliPct(v);
    if (pct !== rad[i].pct) buzz(6);
    setRad((r) => r.map((x, j) => (j === i ? { ...x, pct } : x)));
  };
  const posun = (i: number, d: number) => setRad((r) => { const q = [...r], j = i + d; if (j < 0 || j >= q.length) return r; [q[i], q[j]] = [q[j], q[i]]; return q; });
  const stitokDarcu = (pct: number, id: string | null) => (id ? `${pct} % → ${z(id)?.nazov ?? ""}` : `100 % → ${meno}`);

  let obsah: ReactNode, titul = "Reťaz dobra", pod = "Nastav rad zbierok a percentá";
  if (krok === "nastavenie") {
    obsah = (
      <>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Z každého daru, ktorý dostaneš, pošleš časť zbierke. Zbierky idú v rade za sebou: ďalšia začne, až keď sa predošlá naplní alebo skončí.</div>
        {rad.map((x, i) => {
          const zb = z(x.zbierkaId);
          if (!zb) return null;
          const [, bg, ink] = STAV[i === 0 ? "bezi" : "rad"];
          const bezTerminu = !zb.ciel && i < rad.length - 1;
          return (
            <div key={x.zbierkaId} style={{ ...karta, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Cislo n={i + 1} prve={i === 0} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{zb.nazov}</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 1 }}>{zb.org}</span>
                  <Stitok t={i === 0 ? "Beží hneď po zapečatení" : `Čaká · začne po ${z(rad[i - 1].zbierkaId)?.nazov ?? ""}`} bg={bg} ink={ink} />
                </span>
                <span style={{ display: "flex", flex: "none", color: "var(--ink2)" }}>
                  {[[-1, "Posunúť vyššie", "m6 15 6-6 6 6", i === 0], [1, "Posunúť nižšie", "m6 9 6 6 6-6", i === rad.length - 1]].map(([d, l, p, off]) => (
                    <button key={l as string} type="button" aria-label={l as string} onClick={() => posun(i, d as number)}
                      style={{ width: 40, height: 44, border: "none", background: "transparent", cursor: "pointer", color: "inherit", opacity: off ? .3 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Ikonka d={p as string} /></button>))}
                  <button type="button" aria-label="Odobrať" onClick={() => setRad((r) => r.filter((_, j) => j !== i))}
                    style={{ width: 40, height: 44, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ikonka d="M18 6 6 18M6 6l12 12" /></button>
                </span>
              </div>
              <Pruh z={zb} />
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>Pošleš zbierke</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{x.pct} %</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {[10, 25, 50, 100].map((p) => { const on = x.pct === p; return (
                  <button key={p} type="button" onClick={() => nastavPct(i, p)} style={{ height: 44, borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--fieldBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", color: on ? "var(--gInk)" : "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{p} %</button>); })}
              </div>
              <input type="range" min={5} max={100} step={5} value={x.pct} aria-label="Percento pre zbierku" onChange={(e) => nastavPct(i, +e.target.value)} style={{ width: "100%", height: 28, margin: 0, accentColor: "var(--green)" }} />
              <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--fieldBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>
                Z daru 10 € pôjde <b style={{ color: "var(--ink)" }}>{e2(x.pct / 10)}</b> zbierke a <b style={{ color: "var(--ink)" }}>{e2(10 - x.pct / 10)}</b> tebe.
              </div>
              {bezTerminu && <Info>Nemá cieľ ani termín. Zbierky za ňou začnú, až keď ju majiteľ uzavrie.</Info>}
            </div>
          );
        })}
        {rad.length === 0 && <div style={{ padding: 16, borderRadius: 18, border: "1.5px dashed var(--fieldBd)", fontSize: 14, lineHeight: 1.5, color: "var(--ink3)", textAlign: "center" }}>Rad je prázdny. Pridaj aspoň jednu zbierku.</div>}
        <button type="button" onClick={() => setKrok("vyber")} style={{ height: 50, borderRadius: 14, border: "1.5px dashed var(--gBd)", background: "transparent", color: "var(--gInk)", fontSize: 14.5, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
          <Ikonka d="M12 5v14M5 12h14" />Pridať zbierku do radu</button>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Keď sa skončia všetky zbierky v rade, z každého daru ide 100 % tebe. Zbierka, ktorú medzitým uzavrú, sa preskočí.</div>
        <Tlacidlo label="Pokračovať na zhrnutie" disabled={!rad.length} onClick={() => setKrok("zhrnutie")} />
      </>
    );
  } else if (krok === "vyber") {
    titul = "Pridať zbierku"; pod = "Verejné zbierky, ktoré práve bežia";
    const v = rad.map((x) => x.zbierkaId), q = hladaj.trim().toLowerCase();
    const zoznam = verejneBeziace().filter((x) => !v.includes(x.id) && (!q || x.nazov.toLowerCase().includes(q)));
    obsah = (
      <>
        <input value={hladaj} onChange={(e) => setHladaj(e.target.value)} placeholder="Hľadať zbierku" aria-label="Hľadať zbierku"
          style={{ height: 48, padding: "0 14px", borderRadius: 13, border: "1.5px solid var(--fieldBd)", background: "var(--field)", fontSize: 15, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
        {zoznam.map((x) => (
          <button key={x.id} type="button" onClick={() => { setRad((r) => [...r, { zbierkaId: x.id, pct: 25 }]); setHladaj(""); setKrok("nastavenie"); }}
            style={{ ...karta, borderRadius: 16, textAlign: "left", padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "var(--ink)", fontFamily: "inherit" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{x.nazov}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>{x.org} · {cielTxt(x)}</span>
            </span>
            <span style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ikonka d="M12 5v14M5 12h14" /></span>
          </button>))}
        {zoznam.length === 0 && <div style={{ fontSize: 14, color: "var(--ink3)", textAlign: "center", padding: 16 }}>Nič sme nenašli.</div>}
        <Tlacidlo label="Späť" druhe onClick={() => setKrok("nastavenie")} />
      </>
    );
  } else if (krok === "zhrnutie") {
    titul = "Zhrnutie reťaze"; pod = "Skontroluj pred zapečatením";
    const zapecatTeraz = () => { buzz([10, 40, 18]); zapecatRetaz(rad); setKrok("bezi"); };
    obsah = (
      <>
        <div style={nadpis}>TAKTO TO UVIDÍ DARCA POD QR</div>
        <div style={{ alignSelf: "center", padding: "10px 18px", borderRadius: 999, background: "#1D211B", color: "#F1ECE1", fontSize: 15, fontWeight: 800 }}>{stitokDarcu(rad[0]?.pct ?? 100, rad[0]?.zbierkaId ?? null)}</div>
        <div style={{ ...nadpis, marginTop: 6 }}>RAD ZBIEROK</div>
        {rad.map((x, i) => (
          <div key={x.zbierkaId} style={{ ...karta, borderRadius: 16, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
            <Cislo n={i + 1} prve={i === 0} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{z(x.zbierkaId)?.nazov}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{i === 0 ? "beží hneď po zapečatení" : `začne po ${z(rad[i - 1].zbierkaId)?.nazov ?? ""}`}</span>
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{x.pct} %</span>
          </div>))}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, border: "1.5px dashed var(--fieldBd)" }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--ink2)" }}>Potom ty</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ink2)" }}>100 %</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>Majiteľ každej zbierky dostane oznámenie, že si ho zaradil do reťaze, a môže to zdieľať.</div>
        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <Tlacidlo label="Späť" druhe onClick={() => setKrok("nastavenie")} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {podrz ? <PodrzTlacidlo label="Podrž a zapečať" onConfirm={zapecatTeraz} /> : <Tlacidlo label="Zapečatiť" onClick={zapecatTeraz} />}
          </div>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)", textAlign: "center" }}>Po zapečatení sa reťaz nedá meniť. Vždy si môžeš vytvoriť novú.</div>
      </>
    );
  } else if (retaz) {
    titul = "Tvoja reťaz beží"; pod = "Darcovia vidia, kam ide ich dar";
    const b = beziaca(retaz);
    const idx = b ? retaz.polozky.indexOf(b) : retaz.polozky.length;
    obsah = (
      <>
        <div style={{ ...karta, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "18px 14px" }}>
          {/* QR bežiacej dvojice tvorca + zbierka (centrálny QR tvorcu sa nezobrazuje) */}
          <span style={{ background: "#fff", padding: 10, borderRadius: 16, lineHeight: 0 }}>
            <DeedQr data={`https://deed.sk/r/${retaz.id}${b ? `/${b.zbierkaId}` : ""}`} odznak="D++" retaz size={180} />
          </span>
          <div style={{ padding: "9px 16px", borderRadius: 999, background: "#1D211B", color: "#F1ECE1", fontSize: 14.5, fontWeight: 800, textAlign: "center" }}>{stitokDarcu(b?.pct ?? 100, b?.zbierkaId ?? null)}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>Dostal si {e2(retaz.dostal)} · zbierkam poslané {e2(retaz.poslane)}</div>
        </div>
        <div style={nadpis}>RAD ZBIEROK</div>
        {retaz.polozky.map((x, i) => {
          const zb = z(x.zbierkaId);
          const [t, bg, ink] = STAV[x.stav];
          const koniec = x.stav === "naplnena" || x.stav === "skoncila" || x.stav === "preskocena";
          return (
            <div key={x.zbierkaId} style={{ ...karta, borderRadius: 16, border: `1px solid ${x.stav === "bezi" ? "var(--gBd)" : "var(--cardBd)"}`, opacity: koniec ? .7 : 1, display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{zb?.nazov ?? x.zbierkaId}</span>
                  <Stitok t={x.stav === "caka" ? `Čaká · ${i - idx}. v rade` : t} bg={bg} ink={ink} />
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{x.pct} %</span>
              </div>
              {zb && <Pruh z={zb} />}
            </div>);
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink3)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>Zapečatené · nedá sa meniť
        </div>
        <button type="button" onClick={() => { zrusRetaz(); setKrok("nastavenie"); }}
          style={{ height: 54, borderRadius: 16, border: "1.5px solid var(--gBd)", background: "transparent", color: "var(--gInk)", fontSize: 15.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Vytvoriť novú reťaz</button>
      </>
    );
  }

  const hlavicka = (
    <>
      <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>{titul}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{pod}</span>
      </span>
    </>
  );
  return <Harok onClose={onClose} hlavicka={hlavicka}><div ref={obalRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>{obsah}</div></Harok>;
}
