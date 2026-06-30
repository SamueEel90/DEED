import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { C, GRAD, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { navrhniTip } from "@/lib/poplatky";
import { useMotiv, useUpgrade } from "@/components/context";
import { usePouzivatel } from "@/lib/pouzivatel";
import { Sheet } from "@/components/sheet";
import { IkonaStit, IkonaFajka, Zdielanie, Palec } from "@/components/icons";

// ============================================================
// SIMULÁCIA PLATBY — EUR (karta · platobná brána) / DEED (peňaženka · chain)
// realistický tok: suma → detaily → spracovanie → potvrdenie (doklad)
// ============================================================
const PLATBA_ZOSTATOK = 1240; // DEED zostatok v peňaženke (demo)
export function PlatbaModal({ kanal, komu, onClose, onDone }: { kanal?: string; komu?: ReactNode; onClose?: () => void; onDone?: (suma: number) => void }) {
  const jeEur = kanal === "EUR";
  const [krok, setKrok] = useState("suma"); // suma | metoda | detaily | spracovanie | hotovo
  const [metoda, setMetoda] = useState<"karta" | "sepa">("karta"); // EUR: spôsob platby
  const [suma, setSuma] = useState("");
  const [karta, setKarta] = useState({ cislo: "", exp: "", cvc: "" });
  const [sepa, setSepa] = useState({ iban: "", meno: "" });
  const [res, setRes] = useState<{ id: string; hash: string; cas: string } | null>(null);
  const [tip, setTip] = useState(false);           // SEPA dobrovoľný tip — NIKDY predzaškrtnutý
  const sumaNum = Number(suma) || 0;
  const jeSepa = jeEur && metoda === "sepa";
  // SEPA = 0 % marža (Zeffy model) + voliteľný tip · karta: 1,4 % + 0,15 € · DEED: 0
  const tipSuma = jeSepa ? navrhniTip(sumaNum) : 0;
  const poplatok = !jeEur ? 0 : jeSepa ? 0 : Math.round((sumaNum * 0.014 + 0.15) * 100) / 100;
  const tipAplik = jeSepa && tip ? tipSuma : 0;
  const spolu = Math.round((sumaNum + poplatok + tipAplik) * 100) / 100;
  const malo = !jeEur && sumaNum > PLATBA_ZOSTATOK;

  const inpS: CSSProperties = { width: "100%", padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 16, outline: "none", fontFamily: "inherit" };
  const btnP = (ok: boolean, grad = GRAD): CSSProperties => ({ width: "100%", padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.md, border: "none", fontWeight: 700, fontSize: 15, cursor: ok ? "pointer" : "not-allowed", fontFamily: "inherit", background: ok ? grad : "rgba(var(--glass-rgb),.06)", color: ok ? "#fff" : C.textTer, boxShadow: ok ? "0 8px 26px rgba(99,134,255,.32)" : "none", marginTop: SPACE.gutter });
  const chips = jeEur ? [5, 10, 20, 50] : [50, 100, 200, 500];
  const fmtCislo = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})(?=.)/g, "$1 ");
  const fmtExp = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; };
  const fmtIban = (v: string) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 34).replace(/(.{4})(?=.)/g, "$1 ");
  const kartaOk = karta.cislo.replace(/\s/g, "").length === 16 && karta.exp.length === 5 && karta.cvc.length >= 3;
  const ibanClean = sepa.iban.replace(/\s/g, "");
  const sepaOk = ibanClean.length >= 15 && sepa.meno.trim().length >= 3;

  // vlastná numerická klávesnica — hodnota je VŽDY viditeľná hore, žiadna systémová
  // klávesnica (na mobile prekrývala spodný sheet a sumu nebolo vidno pri zadávaní).
  function stlac(key: string) {
    if (!key) return;
    setSuma((s) => {
      if (key === "⌫") return s.slice(0, -1);
      if (key === ".") return s.includes(".") || s === "" ? s : s + ".";
      let next = s + key;
      const [cele, des] = next.split(".");
      if (des && des.length > 2) return s;                 // max 2 desatinné
      if ((cele || "").replace(/^0+/, "").length > 6) return s; // rozumný strop
      if (next.length > 1 && next[0] === "0" && next[1] !== ".") next = next.replace(/^0+/, "");
      return next;
    });
  }

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
    <div style={{ display: "flex", justifyContent: "space-between", gap: SPACE.sm, padding: `${SPACE.xs}px 0`, fontSize: 12.5, borderBottom: `1px solid ${C.line2}` }}>
      <span style={{ color: C.textTer, flex: "none" }}>{k}</span>
      <span style={{ fontWeight: 600, color: accent || C.text, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );

  return (
    <Sheet onClose={onClose} dismissible={krok !== "spracovanie"}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.gutter }}>
        <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: jeEur ? "rgba(91,155,255,.14)" : "rgba(67,224,200,.14)", color: jeEur ? C.blueL : C.teal, fontWeight: 800, fontSize: 14 }}>{jeEur ? "€" : "D⁺"}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{jeEur ? "Platba v eurách" : "Platba z peňaženky"}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{jeEur ? (jeSepa ? "EUR · SEPA prevod" : "EUR · karta / prevod") : "DEED · wallet → wallet"}{komu ? ` · pre ${komu}` : ""}</div>
        </div>
      </div>

      {krok === "suma" && (<>
        {/* veľký, vždy viditeľný display sumy — žiadna systémová klávesnica (na mobile neprekrýva sheet) */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: SPACE.xs, padding: `${SPACE.xs}px 0 ${SPACE.gutter}px`, minHeight: 50 }}>
          <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: ".5px", color: suma ? C.text : C.textTer }}>{suma || "0"}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.textTer }}>{jeEur ? "€" : "DEED"}</span>
        </div>
        <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
          {chips.map((c) => <button key={c} onClick={() => setSuma(String(c))} style={{ flex: 1, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, border: `1px solid ${sumaNum === c ? C.green : C.line}`, background: sumaNum === c ? tint(C.green, .1) : "rgba(var(--glass-rgb),.05)", color: sumaNum === c ? C.green : C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{c}</button>)}
        </div>
        {/* vlastná numerická klávesnica */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: SPACE.xs }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", jeEur ? "." : "", "0", "⌫"].map((kk, i) => (
            <button key={i} disabled={!kk} onClick={() => stlac(kk)} style={{ height: 50, borderRadius: RADIUS.sm, border: `1px solid ${kk ? C.line : "transparent"}`, background: kk ? C.surface2 : "transparent", color: C.text, fontSize: kk === "⌫" ? 19 : 22, fontWeight: 700, cursor: kk ? "pointer" : "default", fontFamily: "inherit", userSelect: "none" }}>{kk}</button>
          ))}
        </div>
        {!jeEur && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: SPACE.sm }}>Zostatok v peňaženke: <b style={{ color: C.text }}>{PLATBA_ZOSTATOK.toLocaleString("sk")} DEED</b></div>}
        {malo && <div style={{ fontSize: 12, color: C.red, marginTop: SPACE.xs }}>Nedostatok DEED v peňaženke.</div>}
        <button disabled={sumaNum <= 0 || malo} onClick={() => setKrok(jeEur ? "metoda" : "detaily")} style={btnP(sumaNum > 0 && !malo)}>Pokračovať</button>
      </>)}

      {/* EUR: výber spôsobu platby — karta alebo SEPA prevod */}
      {krok === "metoda" && jeEur && (<>
        <div style={{ fontSize: 12.5, color: C.textTer, margin: `${SPACE.xxs}px 0 ${SPACE.sm}px` }}>Vyber spôsob platby pre {sumaNum.toFixed(2)} €</div>
        {[
          { id: "karta" as const, ic: "💳", t: "Platobná karta", d: "Visa · Mastercard · okamžite · 3‑D Secure", fee: `poplatok 1,4 % + 0,15 €` },
          { id: "sepa" as const, ic: "🏦", t: "Bankový prevod (SEPA)", d: "IBAN · pripísanie do 1 prac. dňa", fee: "poplatok 0,35 €" },
        ].map((m) => (
          <button key={m.id} onClick={() => { setMetoda(m.id); setKrok("detaily"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: SPACE.sm, textAlign: "left", padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm, borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", background: C.surface2, border: `1px solid ${C.line}`, color: C.text }}>
            <span style={{ fontSize: 22, flex: "none" }}>{m.ic}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{m.t}</span>
              <span style={{ display: "block", fontSize: 11.5, color: C.textTer, marginTop: SPACE.xxs }}>{m.d} · {m.fee}</span>
            </span>
            <span style={{ color: C.textTer, fontSize: 18, flex: "none" }}>›</span>
          </button>
        ))}
        <button onClick={() => setKrok("suma")} style={{ ...btnP(false), background: "rgba(var(--glass-rgb),.06)", color: C.textSec, cursor: "pointer" }}>Späť</button>
      </>)}

      {/* EUR · KARTA */}
      {krok === "detaily" && jeEur && !jeSepa && (<>
        <input autoFocus inputMode="numeric" placeholder="Číslo karty" value={karta.cislo} onChange={(e) => setKarta({ ...karta, cislo: fmtCislo(e.target.value) })} style={{ ...inpS, marginBottom: SPACE.sm, letterSpacing: ".06em" }} />
        <div style={{ display: "flex", gap: SPACE.sm, marginBottom: SPACE.sm }}>
          <input inputMode="numeric" placeholder="MM/RR" value={karta.exp} onChange={(e) => setKarta({ ...karta, exp: fmtExp(e.target.value) })} style={{ ...inpS, flex: 1 }} />
          <input inputMode="numeric" placeholder="CVC" value={karta.cvc} onChange={(e) => setKarta({ ...karta, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} style={{ ...inpS, flex: 1 }} />
        </div>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px ${SPACE.xs}px` }}>
          <Riadok k="Suma" v={`${sumaNum.toFixed(2)} €`} />
          <Riadok k="Poplatok (1,4 % + 0,15 €)" v={`${poplatok.toFixed(2)} €`} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: SPACE.xs, fontSize: 14, fontWeight: 800 }}><span>Spolu</span><span>{spolu.toFixed(2)} €</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontSize: 11, color: C.textTer, marginTop: SPACE.sm, lineHeight: 1.4 }}><IkonaStit size={13} color={C.green} /> Zabezpečené · 3‑D Secure · test 4242 4242 4242 4242</div>
        <button disabled={!kartaOk} onClick={zaplatit} style={btnP(kartaOk)}>Zaplatiť {spolu.toFixed(2)} €</button>
      </>)}

      {/* EUR · SEPA prevod */}
      {krok === "detaily" && jeSepa && (<>
        <input autoFocus placeholder="IBAN (napr. SK89 0000 0000 0000 0000 0000)" value={sepa.iban} onChange={(e) => setSepa({ ...sepa, iban: fmtIban(e.target.value) })} style={{ ...inpS, marginBottom: SPACE.sm, letterSpacing: ".04em", fontSize: 15 }} />
        <input placeholder="Meno majiteľa účtu" value={sepa.meno} onChange={(e) => setSepa({ ...sepa, meno: e.target.value })} style={{ ...inpS, marginBottom: SPACE.sm }} />
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px ${SPACE.xs}px` }}>
          <Riadok k="Dar charite" v={`${sumaNum.toFixed(2)} €`} />
          <Riadok k="Marža DEED" v="0 € · neberieme nič" accent={C.green} />
          {tipAplik > 0 && <Riadok k="Dobrovoľný tip (chod DEED)" v={`${tipSuma.toFixed(2)} €`} />}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: SPACE.xs, fontSize: 14, fontWeight: 800 }}><span>Spolu</span><span>{spolu.toFixed(2)} €</span></div>
        </div>
        {/* dobrovoľný tip — Zeffy model: NIKDY predzaškrtnutý, navrhneme sumu, neaktivujeme za usera */}
        {tipSuma > 0 && (
          <button onClick={() => setTip((v) => !v)} aria-pressed={tip} style={{ width: "100%", display: "flex", alignItems: "center", gap: SPACE.sm, textAlign: "left", marginTop: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", background: tip ? tint(C.green, .08) : C.surface2, border: `1px solid ${tip ? C.green : C.line}`, color: C.text }}>
            <span style={{ width: 20, height: 20, flex: "none", borderRadius: RADIUS.xs, border: `2px solid ${tip ? C.green : C.line}`, background: tip ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{tip && <IkonaFajka size={12} color="#fff" />}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>Prispieť na chod DEED — {tipSuma.toFixed(2)} €</span>
              <span style={{ display: "block", fontSize: 11, color: C.textTer, marginTop: 1 }}>Dobrovoľné · ide platforme, nie charite · môžeš zrušiť</span>
            </span>
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontSize: 11, color: C.textTer, marginTop: SPACE.sm, lineHeight: 1.4 }}><IkonaStit size={13} color={C.green} /> Bankový prevod · SEPA · charita dostane celý dar · pripísanie do 1 prac. dňa</div>
        <button disabled={!sepaOk} onClick={zaplatit} style={btnP(sepaOk)}>Odoslať prevod {spolu.toFixed(2)} €</button>
      </>)}

      {krok === "detaily" && !jeEur && (<>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px ${SPACE.xs}px` }}>
          <Riadok k="Suma" v={`${sumaNum.toLocaleString("sk")} DEED`} />
          <Riadok k="Poplatok" v="0 DEED" accent={C.green} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: SPACE.xs, fontSize: 13.5, fontWeight: 700 }}><span>Zostatok po platbe</span><span>{(PLATBA_ZOSTATOK - sumaNum).toLocaleString("sk")} DEED</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontSize: 11, color: C.textTer, marginTop: SPACE.sm, lineHeight: 1.4 }}><IkonaStit size={13} color={C.teal} /> Wallet → wallet · okamžite · podpis na chaine</div>
        <button onClick={zaplatit} style={btnP(true, GRAD_ZELENY)}>Potvrdiť platbu</button>
      </>)}

      {krok === "spracovanie" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.md, padding: `${SPACE.xl}px 0 ${SPACE.xl}px` }}>
          <div style={{ width: 46, height: 46, borderRadius: RADIUS.round, border: "3px solid rgba(var(--glass-rgb),.14)", borderTopColor: jeEur ? C.blueL : C.teal, animation: "tocenie .8s linear infinite" }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>{jeSepa ? "Odosiela sa prevod…" : "Spracúva sa platba…"}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, textAlign: "center" }}>{jeEur ? (jeSepa ? "Pripravujem SEPA prevod" : "Overujem kartu cez platobnú bránu") : "Podpisujem transakciu na chaine"}</div>
        </div>
      )}

      {krok === "hotovo" && res && (<>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.xs, padding: `${SPACE.xxs}px 0 ${SPACE.gutter}px` }}>
          <div style={{ width: 54, height: 54, borderRadius: RADIUS.round, background: "rgba(46,200,140,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}><IkonaFajka size={28} color="var(--a-green)" /></div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{jeSepa ? "Prevod odoslaný" : "Platba úspešná"}</div>
          <div style={{ fontSize: 12.5, color: C.textSec }}>{jeEur ? `${spolu.toFixed(2)} €` : `${sumaNum.toLocaleString("sk")} DEED`}{komu ? ` → ${komu}` : ""}</div>
        </div>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px ${SPACE.xs}px` }}>
          <Riadok k="Kanál" v={jeEur ? (jeSepa ? "SEPA prevod (EUR)" : "Karta (EUR)") : "Peňaženka (DEED)"} />
          {jeEur && <Riadok k="Poplatok" v={`${poplatok.toFixed(2)} €`} />}
          {tipAplik > 0 && <Riadok k="Tip platforme" v={`${tipSuma.toFixed(2)} €`} accent={C.green} />}
          <Riadok k={jeSepa ? "Referencia prevodu" : "ID transakcie"} v={res.id} />
          {!jeSepa && <Riadok k="⛓ Hash" v={res.hash} accent={C.blueL} />}
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
  return <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>{children}</div>;
}
const psPill = (active?: boolean): CSSProperties => ({
  flex: 1, height: 48, borderRadius: RADIUS.md, display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs,
  fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "inherit", transition: "all .15s ease",
  background: active ? "rgba(242,112,111,.10)" : C.surface2,
  border: `1px solid ${active ? "rgba(242,112,111,.5)" : C.line}`,
  color: active ? "var(--a-danger)" : C.text,
});
// 1 DEED ≈ 0,01 € (ilustračne) — zobrazí sa pod hodnotou
const eurZaDeed = (a: number) => (a * 0.01).toLocaleString("sk", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
// stupňované zvýraznenie pevných súm: 0 = najjemnejšie (10) · 1 = stredné (50) · 2 = najvýraznejšie (100)
const psFix = (tier = 0, col = "var(--a-info)"): CSSProperties => {
  const t = [
    { bg: C.surface2, bd: C.line, sh: "none" },
    { bg: tint(col, .09), bd: tint(col, .4), sh: "none" },
    { bg: "rgba(240,168,94,.16)", bd: "rgba(240,168,94,.65)", sh: "0 6px 20px rgba(240,168,94,.28)" },
  ][tier];
  return {
    flex: tier === 2 ? 1.18 : 1, minHeight: 64, borderRadius: RADIUS.md, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "transform .12s ease",
    background: t.bg, border: `1px solid ${t.bd}`, boxShadow: t.sh, color: C.text,
  };
};
const psKanal: CSSProperties = {
  flex: 1, minHeight: 56, borderRadius: RADIUS.md, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit", background: C.surface2, border: `1px solid ${C.line}`, color: C.text,
};

export function PodporaSekcia({ onShare, upvotes = 0, onUpvote, onPodpor, onSms, onKanal, accent = "var(--a-info)", supLabel = "DROBNÁ PODPORA — klik a hneď odíde" }: { onShare?: () => void; upvotes?: number; onUpvote?: () => void; onPodpor: (a: number) => void; onSms?: () => void; onKanal: (k: string) => void; accent?: string; supLabel?: ReactNode }) {
  const { svetly } = useMotiv();
  // pasívny prispieva len EUR + SMS; DEED (peňaženka) vyžaduje účet → výzva na registráciu
  const { mozeDeed } = usePouzivatel();
  const upgrade = useUpgrade();
  // lajk: lokálny toggle + počítadlo (onUpvote = side-effect len pri lajknutí)
  const [liked, setLiked] = useState(false);
  const lajkov = upvotes + (liked ? 1 : 0);
  const toggleLike = () => setLiked((v) => { const n = !v; if (n) onUpvote?.(); return n; });
  const deedAkcia = (akcia: () => void) => () => (mozeDeed ? akcia() : upgrade());
  const goldTxt = svetly ? "#8A6B0E" : C.gold; // v svetlom režime tmavšia zlatá (čitateľnosť)
  const fix = [
    { e: "★", v: "10", col: accent, a: 10, tier: 0 },
    { e: "◆", v: "50", col: accent, a: 50, tier: 1 },
    { e: "🔥", v: "100", col: "var(--a-clay)", a: 100, tier: 2 },
  ];
  return (
    <div>
      <PSLabel>ZADARMO</PSLabel>
      <div style={{ display: "flex", gap: SPACE.sm }}>
        <button onClick={onShare} style={{ ...psPill(false), color: C.text }}>
          <Zdielanie size={18} color={C.textSec} /> Zdieľať
        </button>
        <button onClick={toggleLike} aria-pressed={liked} style={{ ...psPill(liked), color: liked ? "var(--a-danger)" : C.text }}>
          <Palec size={18} color={liked ? "var(--a-danger)" : C.textSec} /> {lajkov}
        </button>
      </div>

      <PSLabel>{supLabel}</PSLabel>
      <div style={{ display: "flex", gap: SPACE.xs, alignItems: "stretch" }}>
        {fix.map((b) => (
          <button key={b.v} onClick={deedAkcia(() => onPodpor(b.a))} style={psFix(b.tier, b.col)}>
            <span style={{ fontSize: b.tier === 2 ? 22 : 20, color: b.col, lineHeight: 1 }}>{b.e}</span>
            <span style={{ fontSize: b.tier === 2 ? 14 : 13, marginTop: SPACE.xxs }}>{b.v} <span style={{ fontSize: 9, fontWeight: 700, color: C.textTer, letterSpacing: ".3px" }}>DEED</span></span>
            <span style={{ fontSize: 9.5, color: C.textTer, marginTop: SPACE.xxs }}>≈ {eurZaDeed(b.a)}</span>
          </button>
        ))}
        <div style={{ width: 1, alignSelf: "stretch", borderLeft: `1px dashed ${C.line}`, margin: `${SPACE.xxs}px ${SPACE.xxs}px` }} />
        <button onClick={onSms} style={{ ...psFix(0), flex: 0.85, background: svetly ? "rgba(240,199,90,.16)" : "rgba(240,199,90,.08)", borderColor: svetly ? "rgba(180,140,20,.5)" : "rgba(240,199,90,.35)" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: goldTxt }}>SMS</span>
          <span style={{ fontSize: 13, marginTop: SPACE.xxs, color: goldTxt }}>€</span>
        </button>
      </div>

      <PSLabel>VLASTNÁ SUMA — vyber kanál</PSLabel>
      <div style={{ display: "flex", gap: SPACE.sm }}>
        <button onClick={() => onKanal("EUR")} style={psKanal}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>€ EUR</span>
        </button>
        <button onClick={deedAkcia(() => onKanal("DEED"))} style={psKanal}>
          <span style={{ fontWeight: 800, fontSize: 15, color: accent }}>DEED</span>
        </button>
      </div>
    </div>
  );
}
