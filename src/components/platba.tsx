import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { C, GRAD, GRAD_ZELENY } from "@/theme";
import { tint } from "@/lib/ui";
import { useMotiv } from "@/components/context";
import { Sheet } from "@/components/sheet";
import { IkonaStit, IkonaFajka, Zdielanie, Palec } from "@/components/icons";

// ============================================================
// SIMULÁCIA PLATBY — EUR (karta · platobná brána) / DEED (peňaženka · chain)
// realistický tok: suma → detaily → spracovanie → potvrdenie (doklad)
// ============================================================
const PLATBA_ZOSTATOK = 1240; // DEED zostatok v peňaženke (demo)
export function PlatbaModal({ kanal, komu, onClose, onDone }: { kanal?: string; komu?: ReactNode; onClose?: () => void; onDone?: (suma: number) => void }) {
  const jeEur = kanal === "EUR";
  const [krok, setKrok] = useState("suma"); // suma | detaily | spracovanie | hotovo
  const [suma, setSuma] = useState("");
  const [karta, setKarta] = useState({ cislo: "", exp: "", cvc: "" });
  const [res, setRes] = useState<{ id: string; hash: string; cas: string } | null>(null);
  const sumaNum = Number(suma) || 0;
  const poplatok = jeEur ? Math.round((sumaNum * 0.014 + 0.15) * 100) / 100 : 0;
  const spolu = Math.round((sumaNum + poplatok) * 100) / 100;
  const malo = !jeEur && sumaNum > PLATBA_ZOSTATOK;

  const inpS: CSSProperties = { width: "100%", padding: "12px 13px", borderRadius: 12, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 16, outline: "none", fontFamily: "inherit" };
  const btnP = (ok: boolean, grad = GRAD): CSSProperties => ({ width: "100%", padding: "13px 0", borderRadius: 14, border: "none", fontWeight: 700, fontSize: 15, cursor: ok ? "pointer" : "not-allowed", fontFamily: "inherit", background: ok ? grad : "rgba(var(--glass-rgb),.06)", color: ok ? "#fff" : C.textTer, boxShadow: ok ? "0 8px 26px rgba(99,134,255,.32)" : "none", marginTop: 14 });
  const chips = jeEur ? [5, 10, 20, 50] : [50, 100, 200, 500];
  const fmtCislo = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})(?=.)/g, "$1 ");
  const fmtExp = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; };
  const kartaOk = karta.cislo.replace(/\s/g, "").length === 16 && karta.exp.length === 5 && karta.cvc.length >= 3;

  function zaplatit() {
    setKrok("spracovanie");
    setTimeout(() => {
      setRes({
        id: "TX-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        hash: "0x" + Math.random().toString(16).slice(2, 10) + "…" + Math.random().toString(16).slice(2, 6),
        cas: new Date().toLocaleString("sk"),
      });
      setKrok("hotovo");
    }, 1800);
  }

  const Riadok = ({ k, v, accent }: { k: ReactNode; v: ReactNode; accent?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", fontSize: 12.5, borderBottom: `1px solid ${C.line2}` }}>
      <span style={{ color: C.textTer, flex: "none" }}>{k}</span>
      <span style={{ fontWeight: 600, color: accent || C.text, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );

  return (
    <Sheet onClose={onClose} dismissible={krok !== "spracovanie"}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: jeEur ? "rgba(91,155,255,.14)" : "rgba(67,224,200,.14)", color: jeEur ? C.blueL : C.teal, fontWeight: 800, fontSize: 14 }}>{jeEur ? "€" : "D⁺"}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{jeEur ? "Platba kartou" : "Platba z peňaženky"}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{jeEur ? "EUR · platobná brána" : "DEED · wallet → wallet"}{komu ? ` · pre ${komu}` : ""}</div>
        </div>
      </div>

      {krok === "suma" && (<>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input autoFocus type="number" inputMode="decimal" placeholder="0" value={suma} onChange={(e) => setSuma(e.target.value)} style={{ ...inpS, fontSize: 26, fontWeight: 800, textAlign: "center", padding: "16px 54px" }} />
          <span style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", fontWeight: 800, color: C.textTer }}>{jeEur ? "€" : "DEED"}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {chips.map((c) => <button key={c} onClick={() => setSuma(String(c))} style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: `1px solid ${C.line}`, background: "rgba(var(--glass-rgb),.05)", color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{c}</button>)}
        </div>
        {!jeEur && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 10 }}>Zostatok v peňaženke: <b style={{ color: C.text }}>{PLATBA_ZOSTATOK.toLocaleString("sk")} DEED</b></div>}
        {malo && <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>Nedostatok DEED v peňaženke.</div>}
        <button disabled={sumaNum <= 0 || malo} onClick={() => setKrok("detaily")} style={btnP(sumaNum > 0 && !malo)}>Pokračovať</button>
      </>)}

      {krok === "detaily" && jeEur && (<>
        <input autoFocus inputMode="numeric" placeholder="Číslo karty" value={karta.cislo} onChange={(e) => setKarta({ ...karta, cislo: fmtCislo(e.target.value) })} style={{ ...inpS, marginBottom: 10, letterSpacing: ".06em" }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <input inputMode="numeric" placeholder="MM/RR" value={karta.exp} onChange={(e) => setKarta({ ...karta, exp: fmtExp(e.target.value) })} style={{ ...inpS, flex: 1 }} />
          <input inputMode="numeric" placeholder="CVC" value={karta.cvc} onChange={(e) => setKarta({ ...karta, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} style={{ ...inpS, flex: 1 }} />
        </div>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "4px 12px 8px" }}>
          <Riadok k="Suma" v={`${sumaNum.toFixed(2)} €`} />
          <Riadok k="Poplatok (1,4 % + 0,15 €)" v={`${poplatok.toFixed(2)} €`} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, fontSize: 14, fontWeight: 800 }}><span>Spolu</span><span>{spolu.toFixed(2)} €</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: C.textTer, marginTop: 10, lineHeight: 1.4 }}><IkonaStit size={13} color={C.green} /> Zabezpečené · 3‑D Secure · test 4242 4242 4242 4242</div>
        <button disabled={!kartaOk} onClick={zaplatit} style={btnP(kartaOk)}>Zaplatiť {spolu.toFixed(2)} €</button>
      </>)}

      {krok === "detaily" && !jeEur && (<>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "4px 12px 8px" }}>
          <Riadok k="Suma" v={`${sumaNum.toLocaleString("sk")} DEED`} />
          <Riadok k="Poplatok" v="0 DEED" accent={C.green} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, fontSize: 13.5, fontWeight: 700 }}><span>Zostatok po platbe</span><span>{(PLATBA_ZOSTATOK - sumaNum).toLocaleString("sk")} DEED</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: C.textTer, marginTop: 10, lineHeight: 1.4 }}><IkonaStit size={13} color={C.teal} /> Wallet → wallet · okamžite · podpis na chaine</div>
        <button onClick={zaplatit} style={btnP(true, GRAD_ZELENY)}>Potvrdiť platbu</button>
      </>)}

      {krok === "spracovanie" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15, padding: "26px 0 30px" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", border: "3px solid rgba(var(--glass-rgb),.14)", borderTopColor: jeEur ? C.blueL : C.teal, animation: "tocenie .8s linear infinite" }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>Spracúva sa platba…</div>
          <div style={{ fontSize: 11.5, color: C.textTer, textAlign: "center" }}>{jeEur ? "Overujem kartu cez platobnú bránu" : "Podpisujem transakciu na chaine"}</div>
        </div>
      )}

      {krok === "hotovo" && res && (<>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "4px 0 14px" }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(46,200,140,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}><IkonaFajka size={28} color="#2BD49B" /></div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Platba úspešná</div>
          <div style={{ fontSize: 12.5, color: C.textSec }}>{jeEur ? `${spolu.toFixed(2)} €` : `${sumaNum.toLocaleString("sk")} DEED`}{komu ? ` → ${komu}` : ""}</div>
        </div>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: 12, padding: "4px 12px 8px" }}>
          <Riadok k="Kanál" v={jeEur ? "Karta (EUR)" : "Peňaženka (DEED)"} />
          {jeEur && <Riadok k="Poplatok" v={`${poplatok.toFixed(2)} €`} />}
          <Riadok k="ID transakcie" v={res.id} />
          <Riadok k="⛓ Hash" v={res.hash} accent={C.blueL} />
          <Riadok k="Dátum" v={res.cas} />
        </div>
        <button onClick={() => { onDone?.(sumaNum); onClose?.(); }} style={btnP(true, GRAD_ZELENY)}>Hotovo</button>
      </>)}
    </Sheet>
  );
}

// ============================================================
// JEDNOTNÁ SEKCIA PODPORY (ZADARMO · DROBNÁ PODPORA · VLASTNÁ SUMA)
// rovnaký dizajn naprieč Domov / Help / Charita / Aktivity
// ============================================================
function PSLabel({ children }: { children?: ReactNode }) {
  return <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "18px 0 9px" }}>{children}</div>;
}
const psPill = (active?: boolean): CSSProperties => ({
  flex: 1, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
  fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit", transition: "all .15s ease",
  background: active ? "rgba(242,112,111,.10)" : C.surface2,
  border: `1px solid ${active ? "rgba(242,112,111,.5)" : C.line}`,
  color: active ? "#F2706F" : C.text,
});
// 1 DEED ≈ 0,01 € (ilustračne) — zobrazí sa pod hodnotou
const eurZaDeed = (a: number) => (a * 0.01).toLocaleString("sk", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
// stupňované zvýraznenie pevných súm: 0 = najjemnejšie (10) · 1 = stredné (50) · 2 = najvýraznejšie (100)
const psFix = (tier = 0, col = "#74A6FF"): CSSProperties => {
  const t = [
    { bg: C.surface2, bd: C.line, sh: "none" },
    { bg: tint(col, .09), bd: tint(col, .4), sh: "none" },
    { bg: "rgba(240,168,94,.16)", bd: "rgba(240,168,94,.65)", sh: "0 6px 20px rgba(240,168,94,.28)" },
  ][tier];
  return {
    flex: tier === 2 ? 1.18 : 1, minHeight: 64, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "transform .12s ease",
    background: t.bg, border: `1px solid ${t.bd}`, boxShadow: t.sh, color: C.text,
  };
};
const psKanal: CSSProperties = {
  flex: 1, minHeight: 56, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit", background: C.surface2, border: `1px solid ${C.line}`, color: C.text,
};

export function PodporaSekcia({ onShare, upvotes = 0, onUpvote, onPodpor, onSms, onKanal, accent = "#74A6FF", supLabel = "DROBNÁ PODPORA — klik a hneď odíde" }: { onShare?: () => void; upvotes?: number; onUpvote?: () => void; onPodpor: (a: number) => void; onSms?: () => void; onKanal: (k: string) => void; accent?: string; supLabel?: ReactNode }) {
  const { svetly } = useMotiv();
  const goldTxt = svetly ? "#8A6B0E" : C.gold; // v svetlom režime tmavšia zlatá (čitateľnosť)
  const fix = [
    { e: "★", v: "10", col: accent, a: 10, tier: 0 },
    { e: "◆", v: "50", col: accent, a: 50, tier: 1 },
    { e: "🔥", v: "100", col: "#F0A85E", a: 100, tier: 2 },
  ];
  return (
    <div>
      <PSLabel>ZADARMO</PSLabel>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onShare} style={{ ...psPill(false), color: C.text }}>
          <Zdielanie size={18} color={C.textSec} /> Zdieľať
        </button>
        <button onClick={onUpvote} style={{ ...psPill(false), color: C.text }}>
          <Palec size={18} color={C.textSec} /> {upvotes}
        </button>
      </div>

      <PSLabel>{supLabel}</PSLabel>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        {fix.map((b) => (
          <button key={b.v} onClick={() => onPodpor(b.a)} style={psFix(b.tier, b.col)}>
            <span style={{ fontSize: b.tier === 2 ? 22 : 20, color: b.col, lineHeight: 1 }}>{b.e}</span>
            <span style={{ fontSize: b.tier === 2 ? 14 : 13, marginTop: 4 }}>{b.v} <span style={{ fontSize: 9, fontWeight: 700, color: C.textTer, letterSpacing: ".3px" }}>DEED</span></span>
            <span style={{ fontSize: 9.5, color: C.textTer, marginTop: 2 }}>≈ {eurZaDeed(b.a)}</span>
          </button>
        ))}
        <div style={{ width: 1, alignSelf: "stretch", borderLeft: `1px dashed ${C.line}`, margin: "3px 3px" }} />
        <button onClick={onSms} style={{ ...psFix(0), flex: 0.85, background: svetly ? "rgba(240,199,90,.16)" : "rgba(240,199,90,.08)", borderColor: svetly ? "rgba(180,140,20,.5)" : "rgba(240,199,90,.35)" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: goldTxt }}>SMS</span>
          <span style={{ fontSize: 13, marginTop: 3, color: goldTxt }}>€</span>
        </button>
      </div>

      <PSLabel>VLASTNÁ SUMA — vyber kanál</PSLabel>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onKanal("EUR")} style={psKanal}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>€ EUR</span>
        </button>
        <button onClick={() => onKanal("DEED")} style={psKanal}>
          <span style={{ fontWeight: 800, fontSize: 15, color: accent }}>DEED</span>
        </button>
      </div>
    </div>
  );
}
