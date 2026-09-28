// KARTA 06 · Rýchle sumy v €, DEED dlaždice (mikrodar), vlastná suma, dary v krypte.
// Mikrodar = klik a hneď odíde (bez okna peňaženky): svetielko letí k sume zbierky, po 0,65 s suma narastie, dlaždica 1,6 s „Odoslané".
import { useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { MikrodarDlazdica } from "./AnimovaneKomponenty";
import { pridajDar } from "@/lib/darcovia";
import { KARTA_OD_EUR } from "./nastavenie";

export type KanalPlatby = "eur" | "deed" | "eurc";
/** otvorenie platobného okna (karta 07): so sumou → rovno krok Spôsob, bez sumy → krok Suma */
export type OtvorPlatbu = (p: { kanal: KanalPlatby; suma?: number }) => void;

const eurTxt = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const cislo = (n: number) => n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const EUR_FARBY: [string, string][] = [["var(--card)", "var(--cardBd)"], ["var(--t2)", "var(--t2Bd)"], ["var(--t3)", "var(--t3Bd)"]];

// ---- spoločné kúsky ----
export function NadpisSekcie({ text, doplnok }: { text: string; doplnok?: string }) {
  return (
    <div style={{ margin: "20px 2px 10px", fontSize: 12.5, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)" }}>
      {text}{doplnok && <span style={{ fontWeight: 600, letterSpacing: 0 }}> — {doplnok}</span>}
    </div>
  );
}
const mriezka: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 };
const dlazdica = (bg: string, bd: string): CSSProperties => ({ position: "relative", height: 66, borderRadius: 16, background: bg, border: `1px solid ${bd}`, cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, color: "var(--ink)", fontFamily: "inherit", padding: 0 });


/** mikrodar — hotová dlaždica dizajnéra (AnimovaneKomponenty.tsx): svetielko letí na koniec pruhu, potom sa dar zapíše a suma naskočí */
export type MikroCiel = { root: RefObject<HTMLElement>; ciel: RefObject<HTMLElement> };
function useBlok() {
  const [blok, setBlok] = useState(false);
  return { blok, zacni: () => { setBlok(true); setTimeout(() => setBlok(false), 1600); } };
}

// ---------------- A · rýchle sumy v € ----------------
export function RychleSumyEur({ sumy, doplnok, kDaru, otvor }: { sumy: number[]; doplnok?: string; kDaru?: (s: number) => number; otvor: OtvorPlatbu }) {
  return (
    <>
      <NadpisSekcie text="DARY V EURÁCH" doplnok={doplnok} />
      <div style={mriezka}>
        {sumy.slice(0, 3).map((s, i) => {
          const [bg, bd] = EUR_FARBY[i];
          const bonus = kDaru?.(s) ?? 0;
          const popis = bonus > 0 ? `→ ${eurTxt(s + bonus)}` : s < KARTA_OD_EUR ? "SEPA" : "SEPA · karta";
          return (
            <button key={s} type="button" className="zb-dlazdica" onClick={() => otvor({ kanal: "eur", suma: s })} style={dlazdica(bg, bd)}>
              <span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{cislo(s)} <span style={{ fontSize: 13, fontWeight: 700 }}>€</span></span>
              <span style={{ fontSize: 12, fontWeight: 700, color: bonus > 0 ? "var(--gold)" : "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{popis}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------------- B · DEED dlaždice (mikrodar) ----------------
const DEED_SUMY = [10, 50, 100];
export function DeedDlazdice({ refId, registrovany, mikro, cezTvorcu }: { refId: string; registrovany: boolean; mikro: MikroCiel; cezTvorcu?: string }) {
  const { blok, zacni } = useBlok();
  return (
    <>
      <NadpisSekcie text="DROBNÁ PODPORA" doplnok="klik a hneď odíde" />
      <div style={mriezka}>
        {DEED_SUMY.map((d) => (
          <MikrodarDlazdica key={d} suma={d} jednotka="DEED" eur={d / 100} najcastejsie={d === 100} root={mikro.root} ciel={mikro.ciel}
            blokovane={blok} onOdoslane={zacni} onDoleteli={(eur) => pridajDar({ refId, suma: eur, kanal: "deed", registrovany, cezTvorcu })} />
        ))}
      </div>
    </>
  );
}

// ---------------- C · vlastná suma ----------------
function KartaVlastna({ nadpis, popis, extra, modra, onClick, flex }: { nadpis: string; popis: string; extra?: ReactNode; modra?: boolean; onClick: () => void; flex: number }) {
  return (
    <button type="button" className="zb-karta" onClick={onClick}
      style={{ flex, minWidth: 0, padding: "14px 14px 12px", borderRadius: 18, background: modra ? "var(--card)" : "var(--field)", border: modra ? "1px solid var(--cardBd)" : "1.5px solid var(--gBd)",
        textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 3, fontFamily: "inherit" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800, color: modra ? "var(--blue)" : "var(--ink)" }}>
        {nadpis}
        <svg style={{ marginLeft: "auto" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={modra ? "var(--blue)" : "var(--green)"} strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink3)" }}>{popis}</span>
      {extra}
    </button>
  );
}
export function VlastnaSuma({ eur, deed, firma, otvor }: { eur: boolean; deed: boolean; firma?: string; otvor: OtvorPlatbu }) {
  // firma = hotový text riadku dorovnania („Pekáreň Dobrota zdvojnásobí")
  if (!eur && !deed) return null;
  return (
    <>
      <NadpisSekcie text="VLASTNÁ SUMA" />
      <div style={{ display: "flex", gap: 10 }}>
        {eur && <KartaVlastna flex={1.25} nadpis="Vlastná suma v €" popis="karta alebo prevod" onClick={() => otvor({ kanal: "eur" })}
          extra={firma ? <span style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{firma}</span> : undefined} />}
        {deed && <KartaVlastna flex={1} modra nadpis="DEED" popis="z peňaženky" onClick={() => otvor({ kanal: "deed" })} />}
      </div>
    </>
  );
}

// ---------------- D · dary v krypte (EURC) ----------------
const EURC_SUMY = [0.1, 0.5, 1];
const KLUC_KRYPTO = "deed.zbierka.kryptoOtvorene";
export function DaryVKrypte({ refId, otvor, mikro, cezTvorcu }: { refId: string; otvor: OtvorPlatbu; mikro: MikroCiel; cezTvorcu?: string }) {
  const [otvorene, setOtvorene] = useState(() => { try { return localStorage.getItem(KLUC_KRYPTO) !== "0"; } catch { return true; } });
  const prepni = () => { const v = !otvorene; setOtvorene(v); try { localStorage.setItem(KLUC_KRYPTO, v ? "1" : "0"); } catch { /* LS */ } };
  const { blok, zacni } = useBlok(); // krypto má len registrovaný
  return (
    <>
      <button type="button" onClick={prepni} aria-expanded={otvorene}
        style={{ width: "100%", margin: "20px 0 10px", padding: "4px 2px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "none", background: "transparent", boxShadow: "none",
          cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)" }}>
        <span>DARY V KRYPTE</span>
        <svg style={{ transform: `rotate(${otvorene ? 180 : 0}deg)`, transition: "transform .3s ease" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {otvorene && (
        <>
          <div style={{ margin: "-4px 2px 8px", fontSize: 12.5, fontWeight: 600, color: "var(--ink3)" }}>klik a hneď odíde</div>
          <div style={mriezka}>
            {EURC_SUMY.map((v) => (
              <MikrodarDlazdica key={v} suma={cislo(v)} jednotka="EURC" eur={v} najcastejsie={v === 1} root={mikro.root} ciel={mikro.ciel}
                blokovane={blok} onOdoslane={zacni} onDoleteli={(eur) => pridajDar({ refId, suma: eur, kanal: "deed", registrovany: true, cezTvorcu })} />
            ))}
          </div>
          <button type="button" className="zb-karta" onClick={() => otvor({ kanal: "eurc" })}
            style={{ width: "100%", height: 56, marginTop: 10, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "var(--blue)" }}>
            Vlastná suma v EURC
          </button>
        </>
      )}
    </>
  );
}
