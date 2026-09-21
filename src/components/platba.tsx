import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { C, GRAD, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { navrhniTip, SEPA_SPLIT_POPLATOK } from "@/lib/poplatky";
import { useUpgrade } from "@/components/context";
import { usePouzivatel } from "@/lib/pouzivatel";
import { Sheet } from "@/components/sheet";
import { IkonaStit, IkonaFajka, Zdielanie, Palec, Srdce } from "@/components/icons";
import { VolbaDarcovstva } from "@/components/zoznamdarcov";
import { nacitajPredvolbu, ulozPredvolbu, type VolbaDaru } from "@/lib/darcovia";

// ============================================================
// SIMULÁCIA PLATBY — EUR (karta · platobná brána) / DEED (peňaženka · chain)
// realistický tok: suma → detaily → spracovanie → potvrdenie (doklad)
// ============================================================
const PLATBA_ZOSTATOK = 1240; // DEED zostatok v peňaženke (demo)

// „Dar pre nás" — dobrovoľný príspevok na chod DEED (Zeffy model): NIKDY predzaškrtnutý,
// navrhneme sumu, neaktivujeme za usera. Jednotný vo všetkých kanáloch platobného modulu.
function DarPreNas({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-pressed={on} style={{ width: "100%", display: "flex", alignItems: "center", gap: SPACE.sm, textAlign: "left", marginTop: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", background: on ? tint(C.green, .08) : C.surface2, border: `1px solid ${on ? C.green : C.line}`, color: C.text }}>
      <span style={{ width: 20, height: 20, flex: "none", borderRadius: RADIUS.xs, border: `2px solid ${on ? C.green : C.line}`, background: on ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <IkonaFajka size={12} color="#fff" />}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>Dar pre nás — chod DEED · {label}</span>
        <span style={{ display: "block", fontSize: 11, color: C.textTer, marginTop: 1 }}>Dobrovoľné · ide platforme, nie príjemcovi · môžeš zrušiť</span>
      </span>
    </button>
  );
}
export function PlatbaModal({ kanal, komu, suma: sumaInit, lenSepa = false, split = false, onClose, onDone }: { kanal?: string; komu?: ReactNode; suma?: number; lenSepa?: boolean; split?: boolean; onClose?: () => void; onDone?: (suma: number, volba?: VolbaDaru) => void }) {
  const jeEur = kanal === "EUR";
  const jed = kanal === "EURC" ? "EURC" : "DEED"; // krypto jednotka: EURC pri charite a Viere, inak DEED
  const [krok, setKrok] = useState("suma"); // suma | metoda | detaily | spracovanie | hotovo
  // zoznam darcov: voľba identity per dar — posledná voľba je predvoľba (spec §2)
  const [volba, setVolba] = useState<VolbaDaru>(nacitajPredvolbu);
  const [metoda, setMetoda] = useState<"karta" | "sepa">(lenSepa ? "sepa" : "karta"); // EUR: spôsob platby; drobné sumy len SEPA
  const [suma, setSuma] = useState(sumaInit && sumaInit > 0 ? String(sumaInit) : ""); // predvyplnená (napr. cena workshopu)
  const [karta, setKarta] = useState({ cislo: "", exp: "", cvc: "" });
  const [sepa, setSepa] = useState({ iban: "", meno: "" });
  const [res, setRes] = useState<{ id: string; hash: string; cas: string } | null>(null);
  const [tip, setTip] = useState(false);           // „Dar pre nás" — dobrovoľný, NIKDY predzaškrtnutý
  const sumaNum = Number(suma) || 0;
  const jeSepa = jeEur && metoda === "sepa";
  // SEPA = 0 % marža (Zeffy model) · karta: 1,4 % + 0,15 € · DEED: 0
  // „Dar pre nás" (chod DEED) — vo VŠETKÝCH kanáloch, jednotky = mena kanála
  const tipSuma = navrhniTip(sumaNum);
  // SEPA: priama zadarmo, splitovaná s poplatkom partnera
  const poplatok = !jeEur ? 0 : jeSepa ? (split ? SEPA_SPLIT_POPLATOK : 0) : Math.round((sumaNum * 0.014 + 0.15) * 100) / 100;
  const tipAplik = tip ? tipSuma : 0;
  const spolu = Math.round((sumaNum + poplatok + tipAplik) * 100) / 100;
  const malo = !jeEur && spolu > PLATBA_ZOSTATOK;
  const tipLabel = jeEur ? `${tipSuma.toFixed(2)} €` : `${tipSuma.toLocaleString("sk")} ${jed}`;

  const inpS: CSSProperties = { width: "100%", padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 16, outline: "none", fontFamily: "inherit" };
  const btnP = (ok: boolean, grad = GRAD): CSSProperties => ({ width: "100%", padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.md, border: "none", fontWeight: 700, fontSize: 15, cursor: ok ? "pointer" : "not-allowed", fontFamily: "inherit", background: ok ? grad : "rgba(var(--glass-rgb),.06)", color: ok ? "#fff" : C.textTer, boxShadow: ok ? "0 8px 26px color-mix(in srgb, var(--a-green) 32%, transparent)" : "none", marginTop: SPACE.gutter });
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
    ulozPredvolbu(volba); // posledná voľba identity sa pamätá ako predvoľba
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
        <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: jeEur ? "color-mix(in srgb, var(--a-info) 14%, transparent)" : "color-mix(in srgb, var(--a-teal) 14%, transparent)", color: jeEur ? C.blueL : C.teal, fontWeight: 800, fontSize: 14 }}>{jeEur ? "€" : "D⁺"}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{jeEur ? "Platba v eurách" : "Platba z peňaženky"}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{jeEur ? (jeSepa ? "EUR · SEPA prevod" : "EUR · karta / prevod") : `${jed} · wallet → wallet`}{komu ? ` · pre ${komu}` : ""}</div>
        </div>
      </div>

      {krok === "suma" && (<>
        {/* veľký, vždy viditeľný display sumy — žiadna systémová klávesnica (na mobile neprekrýva sheet) */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: SPACE.xs, padding: `${SPACE.xs}px 0 ${SPACE.gutter}px`, minHeight: 50 }}>
          <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: ".5px", color: suma ? C.text : C.textTer }}>{suma || "0"}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.textTer }}>{jeEur ? "€" : jed}</span>
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
        {!jeEur && <div style={{ fontSize: 11.5, color: C.textTer, marginTop: SPACE.sm }}>Zostatok v peňaženke: <b style={{ color: C.text }}>{PLATBA_ZOSTATOK.toLocaleString("sk")} {jed}</b></div>}
        {malo && <div style={{ fontSize: 12, color: C.red, marginTop: SPACE.xs }}>Nedostatok {jed} v peňaženke.</div>}
        <button disabled={sumaNum <= 0 || malo} onClick={() => setKrok(jeEur && !lenSepa ? "metoda" : "detaily")} style={btnP(sumaNum > 0 && !malo)}>Pokračovať</button>
      </>)}

      {/* EUR: výber spôsobu platby — karta alebo SEPA prevod */}
      {krok === "metoda" && jeEur && (<>
        <div style={{ fontSize: 12.5, color: C.textTer, margin: `${SPACE.xxs}px 0 ${SPACE.sm}px` }}>Vyber spôsob platby pre {sumaNum.toFixed(2)} €</div>
        {[
          { id: "karta" as const, ic: "💳", t: "Platobná karta", d: "Visa · Mastercard · okamžite · 3‑D Secure", fee: `poplatok 1,4 % + 0,15 €` },
          { id: "sepa" as const, ic: "🏦", t: "Bankový prevod (SEPA)", d: "IBAN · pripísanie do 1 prac. dňa", fee: split ? `poplatok ${SEPA_SPLIT_POPLATOK.toLocaleString("sk", { minimumFractionDigits: 2 })} € (split)` : "bez poplatku" },
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

      {/* zoznam darcov — ako sa darca ukáže (jedným klikom, pamätá sa) */}
      {krok === "detaily" && <VolbaDarcovstva volba={volba} onZmena={setVolba} sumaEur={jeEur ? sumaNum : sumaNum * 0.01} />}

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
          {tipAplik > 0 && <Riadok k="Dar pre nás (chod DEED)" v={`${tipSuma.toFixed(2)} €`} accent={C.green} />}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: SPACE.xs, fontSize: 14, fontWeight: 800 }}><span>Spolu</span><span>{spolu.toFixed(2)} €</span></div>
        </div>
        {tipSuma > 0 && <DarPreNas on={tip} label={tipLabel} onToggle={() => setTip((v) => !v)} />}
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
          {split && <Riadok k="Poplatok partnera (split)" v={`${poplatok.toFixed(2)} €`} />}
          {tipAplik > 0 && <Riadok k="Dar pre nás (chod DEED)" v={`${tipSuma.toFixed(2)} €`} accent={C.green} />}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: SPACE.xs, fontSize: 14, fontWeight: 800 }}><span>Spolu</span><span>{spolu.toFixed(2)} €</span></div>
        </div>
        {tipSuma > 0 && <DarPreNas on={tip} label={tipLabel} onToggle={() => setTip((v) => !v)} />}
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontSize: 11, color: C.textTer, marginTop: SPACE.sm, lineHeight: 1.4 }}><IkonaStit size={13} color={C.green} /> Bankový prevod · SEPA · charita dostane celý dar · pripísanie do 1 prac. dňa</div>
        <button disabled={!sepaOk} onClick={zaplatit} style={btnP(sepaOk)}>Odoslať prevod {spolu.toFixed(2)} €</button>
      </>)}

      {krok === "detaily" && !jeEur && (<>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px ${SPACE.xs}px` }}>
          <Riadok k="Suma" v={`${sumaNum.toLocaleString("sk")} ${jed}`} />
          <Riadok k="Poplatok" v={`0 ${jed}`} accent={C.green} />
          {tipAplik > 0 && <Riadok k="Dar pre nás (chod DEED)" v={`${tipSuma.toLocaleString("sk")} ${jed}`} accent={C.green} />}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: SPACE.xs, fontSize: 13.5, fontWeight: 700 }}><span>Zostatok po platbe</span><span>{(PLATBA_ZOSTATOK - spolu).toLocaleString("sk")} {jed}</span></div>
        </div>
        {tipSuma > 0 && <DarPreNas on={tip} label={tipLabel} onToggle={() => setTip((v) => !v)} />}
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
          <div style={{ fontSize: 12.5, color: C.textSec }}>{jeEur ? `${spolu.toFixed(2)} €` : `${spolu.toLocaleString("sk")} ${jed}`}{komu ? ` → ${komu}` : ""}</div>
        </div>
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xxs}px ${SPACE.sm}px ${SPACE.xs}px` }}>
          <Riadok k="Kanál" v={jeEur ? (jeSepa ? "SEPA prevod (EUR)" : "Karta (EUR)") : `Peňaženka (${jed})`} />
          {jeEur && <Riadok k="Poplatok" v={`${poplatok.toFixed(2)} €`} />}
          {tipAplik > 0 && <Riadok k="Dar pre nás (chod DEED)" v={tipLabel} accent={C.green} />}
          <Riadok k={jeSepa ? "Referencia prevodu" : "ID transakcie"} v={res.id} />
          {!jeSepa && <Riadok k="⛓ Hash" v={res.hash} accent={C.blueL} />}
          <Riadok k="Dátum" v={res.cas} />
        </div>
        <button onClick={() => { onDone?.(sumaNum, volba); onClose?.(); }} style={btnP(true, GRAD_ZELENY)}>Hotovo</button>
      </>)}
    </Sheet>
  );
}

// ============================================================
// JEDNOTNÁ SEKCIA PODPORY (ZADARMO · DROBNÁ PODPORA · VLASTNÁ SUMA)
// rovnaký dizajn naprieč Domov / Help / Charita / Aktivity
// ============================================================
/** nadpis zbaliteľnej sekcie platobného modulu (Dary v eurách / v krypte) */
function Rozbal({ otvorene, onClick, children }: { otvorene: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-expanded={otvorene}
      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", padding: 0, margin: `${SPACE.md}px 0 ${SPACE.xs}px`, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, letterSpacing: ".4px", fontWeight: 800, color: otvorene ? C.text : C.textSec }}>
      <span>{children}</span>
      <span style={{ fontSize: 14, transform: otvorene ? "rotate(90deg)" : "none", transition: "transform .15s ease" }}>›</span>
    </button>
  );
}

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
// sumové chipy — čistá typografia (žiadne emoji); `top` = najčastejšia voľba zvýraznená akcentom
const psSuma = (top: boolean, col = "var(--a-info)"): CSSProperties => ({
  position: "relative", flex: 1, minHeight: 58, borderRadius: RADIUS.md,
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "border-color .15s ease, background .15s ease",
  background: top ? tint(col, .1) : C.surface2,
  border: `1px solid ${top ? tint(col, .5) : C.line}`,
  color: C.text, overflow: "visible",
});
const psTag = (col: string): CSSProperties => ({
  position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
  fontSize: 8, fontWeight: 800, letterSpacing: ".06em", whiteSpace: "nowrap",
  color: "#fff", background: col, borderRadius: RADIUS.pill, padding: "2px 7px",
  boxShadow: "0 2px 6px rgba(0,0,0,.22)", pointerEvents: "none",
});
const psKanal: CSSProperties = {
  flex: 1, minHeight: 56, borderRadius: RADIUS.md, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit", background: C.surface2, border: `1px solid ${C.line}`, color: C.text,
};

export function PodporaSekcia({ onShare, upvotes = 0, onUpvote, onPodpor, onKanal, accent = "var(--a-info)", supLabel = "DROBNÁ PODPORA — klik a hneď odíde", reakcia = "palec", bezDaru = false, zbalene = false, komu, onDarEur, onDarKrypto, krypto = "EURC", poEurach, kryptoOtvorene = false }: { onShare?: () => void; upvotes?: number; onUpvote?: () => void; onPodpor: (a: number) => void; onKanal: (k: string) => void; accent?: string; supLabel?: ReactNode; reakcia?: "palec" | "srdce"; bezDaru?: boolean; zbalene?: boolean; komu?: ReactNode; onDarEur?: (suma: number) => void; onDarKrypto?: (eurc: number) => void; krypto?: "EURC" | "DEED" | "nie";
  /** riadky vložené medzi dary v eurách a dary v krypte (pravidelná podpora, Obľúbené + Podporiť DEED) */
  poEurach?: ReactNode;
  /** dary v krypte rozbalené hneď (napr. náhľad v správe, aby bolo vidno, čo zmizne) */
  kryptoOtvorene?: boolean }) {
  // pasívny prispieva len v EUR; DEED (peňaženka) vyžaduje účet → výzva na registráciu
  const { mozeDeed } = usePouzivatel();
  const upgrade = useUpgrade();
  // lajk: lokálny toggle + počítadlo (onUpvote = side-effect len pri lajknutí)
  const [liked, setLiked] = useState(false);
  const lajkov = upvotes + (liked ? 1 : 0);
  const toggleLike = () => setLiked((v) => { const n = !v; if (n) onUpvote?.(); return n; });
  const deedAkcia = (akcia: () => void) => () => (mozeDeed ? akcia() : upgrade());
  const fix = [
    { v: 10, top: false },
    { v: 50, top: false },
    { v: 100, top: true }, // najčastejšia voľba — akcentové zvýraznenie namiesto ikonky
  ];
  // charita + farnosť: dary v eurách a v krypte sú zbalené, otvárajú sa klikom na nadpis
  const [otvEur, setOtvEur] = useState(true); // eurá otvorené hneď
  const [otvKrypto, setOtvKrypto] = useState(kryptoOtvorene);
  const [rychlyEur, setRychlyEur] = useState<number | null>(null);
  const rychleEur = [1, 3, 5]; // drobné — len SEPA (pevný poplatok karty by ich zožral)
  const odtienEur = [0, .10, .20]; // 1 € sivá, 3 € jemná červená, 5 € silnejšia — suma graduje
  const rychleKrypto = [0.1, 0.5, 1]; // mikrodary v EURC
  return (
    <div>
      <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.sm }}>
        <button onClick={onShare} style={{ ...psPill(false), color: C.text }}>
          <Zdielanie size={18} color={C.textSec} /> Zdieľať
        </button>
        <button onClick={toggleLike} aria-pressed={liked} style={{ ...psPill(liked), color: liked ? "var(--a-danger)" : C.text }}>
          {reakcia === "srdce"
            ? <Srdce size={18} filled={liked} color={liked ? "var(--a-danger)" : C.textSec} />
            : <Palec size={18} color={liked ? "var(--a-danger)" : C.textSec} />} {lajkov}
        </button>
      </div>

      {bezDaru ? null : zbalene ? (<>
        {/* DARY V EURÁCH — drobné sumy len SEPA, vlastná suma karta aj SEPA */}
        <Rozbal otvorene={otvEur} onClick={() => setOtvEur((v) => !v)}>DARY V EURÁCH</Rozbal>
        {otvEur && (<>
          <div style={{ display: "flex", gap: SPACE.xs, alignItems: "stretch" }}>
            {rychleEur.map((v, i) => (
              <button key={v} onClick={() => setRychlyEur(v)}
                style={odtienEur[i] ? { ...psSuma(false, accent), background: tint("var(--a-danger)", odtienEur[i]), border: `1px solid ${tint("var(--a-danger)", odtienEur[i] + .18)}` } : psSuma(false, accent)}>
                <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: C.text }}>
                  {v}<span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, marginLeft: 3 }}>€</span>
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.textTer, marginTop: 4 }}>SEPA</span>
              </button>
            ))}
          </div>
          <button onClick={() => onKanal("EUR")} style={{ ...psKanal, width: "100%", marginTop: SPACE.xs }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Vlastná suma v €</span>
          </button>
        </>)}

        {poEurach}

        {/* DARY V KRYPTE — EURC (charita, Viera) alebo DEED (ostatní); „nie" = príjemca krypto neberie */}
        {krypto !== "nie" && <Rozbal otvorene={otvKrypto} onClick={() => setOtvKrypto((v) => !v)}>DARY V KRYPTE</Rozbal>}
        {krypto === "DEED" && otvKrypto && (<>
          <div style={{ display: "flex", gap: SPACE.xs, alignItems: "stretch", paddingTop: 8 }}>
            {fix.map((b) => (
              <button key={b.v} onClick={deedAkcia(() => onPodpor(b.v))} style={psSuma(b.top, accent)}>
                {b.top && <span style={psTag(accent)}>NAJČASTEJŠIE</span>}
                <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: b.top ? accent : C.text }}>
                  {b.v}<span style={{ fontSize: 9, fontWeight: 700, color: C.textTer, marginLeft: 3, letterSpacing: ".04em" }}>DEED</span>
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.textTer, marginTop: 4 }}>≈ {eurZaDeed(b.v)}</span>
              </button>
            ))}
          </div>
          <button onClick={deedAkcia(() => onKanal("DEED"))} style={{ ...psKanal, width: "100%", marginTop: SPACE.xs }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: accent }}>Vlastná suma v DEED</span>
          </button>
        </>)}
        {krypto === "EURC" && otvKrypto && (<>
          <div style={{ display: "flex", gap: SPACE.xs, alignItems: "stretch", paddingTop: 8 }}>
            {rychleKrypto.map((v, i) => (
              <button key={v} onClick={deedAkcia(() => onDarKrypto?.(v))} style={psSuma(i === 2, accent)}>
                {i === 2 && <span style={psTag(accent)}>NAJČASTEJŠIE</span>}
                <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: i === 2 ? accent : C.text }}>
                  {v.toLocaleString("sk", { minimumFractionDigits: v < 1 ? 2 : 0 })}<span style={{ fontSize: 9, fontWeight: 700, color: C.textTer, marginLeft: 3, letterSpacing: ".04em" }}>EURC</span>
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.textTer, marginTop: 4 }}>= {v.toLocaleString("sk", { minimumFractionDigits: 2 })} €</span>
              </button>
            ))}
          </div>
          <button onClick={deedAkcia(() => onKanal("EURC"))} style={{ ...psKanal, width: "100%", marginTop: SPACE.xs }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: accent }}>Vlastná suma v EURC</span>
          </button>
        </>)}

        {rychlyEur != null && (
          <PlatbaModal kanal="EUR" komu={komu} suma={rychlyEur} lenSepa
            onClose={() => setRychlyEur(null)}
            onDone={(sm) => { setRychlyEur(null); onDarEur?.(sm); }} />
        )}
      </>) : (<>
      <PSLabel>{supLabel}</PSLabel>
      <div style={{ display: "flex", gap: SPACE.xs, alignItems: "stretch", paddingTop: 8 }}>
        {fix.map((b) => (
          <button key={b.v} onClick={deedAkcia(() => onPodpor(b.v))} style={psSuma(b.top, accent)}>
            {b.top && <span style={psTag(accent)}>NAJČASTEJŠIE</span>}
            <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: b.top ? accent : C.text }}>
              {b.v}<span style={{ fontSize: 9, fontWeight: 700, color: C.textTer, marginLeft: 3, letterSpacing: ".04em" }}>DEED</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.textTer, marginTop: 4 }}>≈ {eurZaDeed(b.v)}</span>
          </button>
        ))}
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
      </>)}
    </div>
  );
}
