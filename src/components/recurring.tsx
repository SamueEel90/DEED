import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { C, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useUpgrade } from "@/components/context";
import { useRecurringCreate } from "@/data";
import { Sheet } from "@/components/sheet";
import { IkonaOpakovat, IkonaFajka } from "@/components/icons";

// ============================================================
// PRAVIDELNÁ PODPORA (Fáza 4) — LEN charita (Help ju nikdy nemá).
// 3 voľby (táto žiadosť / segment / celá charita) + DVOJITÉ potvrdenie (záväzok).
// Voľba „táto žiadosť" sa OKAMŽITE zastaví pri ukončení zbierky (server trigger).
// Zapisuje cez recurring_create (opakovana_platba). Zrušiteľná kedykoľvek (Peňaženka).
// ============================================================
type Rozsah = "request" | "segment" | "charita";
type Perioda = "tyzdenne" | "mesacne" | "rocne";

const periodaTxt = (p: Perioda) => (p === "tyzdenne" ? "týždeň" : p === "rocne" ? "rok" : "mesiac");

export function RecurringSheet({ nazov, caseId, charitaUcet, onClose, toast }: { nazov?: ReactNode; caseId?: string | null; charitaUcet?: string | null; onClose?: () => void; toast?: (t: string) => void }) {
  const { ucetId, demo } = usePouzivatel();
  const upgrade = useUpgrade();
  const rec = useRecurringCreate();
  const [krok, setKrok] = useState<"nastav" | "potvrd">("nastav");
  const [rozsah, setRozsah] = useState<Rozsah>(caseId ? "request" : "charita");
  const [suma, setSuma] = useState(10);
  const [perioda, setPerioda] = useState<Perioda>("mesacne");
  const [mena, setMena] = useState<"EUR" | "DEED">("EUR");

  const volby: { id: Rozsah; t: string; d: string }[] = [
    ...(caseId ? [{ id: "request" as const, t: "Táto žiadosť", d: "Skončí, keď zbierka skončí — okamžite a s notifikáciou." }] : []),
    { id: "segment", t: "Segment (téma)", d: "Charita rozdelí podľa vlastného kľúča." },
    { id: "charita", t: "Celá charita", d: "Paušál na chod a najnaliehavejšie potreby." },
  ];

  async function potvrd() {
    if (!ucetId || demo) { onClose?.(); upgrade(); return; }  // recurring = registrovaný darca
    try {
      await rec.mutateAsync({
        rozsah, darca: ucetId, suma, mena, perioda,
        caseId: rozsah === "request" ? (caseId ?? null) : null,
        charitaUcet: charitaUcet ?? null,
        viazaneNaZbierku: rozsah === "request",
      });
      toast?.(`Pravidelná podpora nastavená · ${suma} ${mena} / ${periodaTxt(perioda)}`);
      onClose?.();
    } catch {
      toast?.("Nepodarilo sa nastaviť — skús znova.");
    }
  }

  const btn = (ok: boolean, grad = false): CSSProperties => ({ width: "100%", padding: `${SPACE.sm}px 0`, borderRadius: RADIUS.md, border: "none", fontWeight: 700, fontSize: 15, cursor: ok ? "pointer" : "not-allowed", fontFamily: "inherit", background: ok ? (grad ? GRAD_ZELENY : C.surface2) : "rgba(var(--glass-rgb),.06)", color: ok ? (grad ? "#fff" : C.text) : C.textTer, marginTop: SPACE.gutter });
  const chip = (active: boolean): CSSProperties => ({ flex: 1, padding: `${SPACE.xs}px 0`, borderRadius: RADIUS.sm, border: `1px solid ${active ? C.green : C.line}`, background: active ? tint(C.green, .1) : C.surface2, color: active ? C.green : C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" });

  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.gutter }}>
        <span style={{ width: 36, height: 36, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint("var(--a-info)", .16) }}><IkonaOpakovat size={18} color="var(--a-info)" /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Pravidelná podpora</div>
          <div style={{ fontSize: 11.5, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nazov ? <>pre {nazov}</> : "charita"} · zrušiteľná kedykoľvek</div>
        </div>
      </div>

      {krok === "nastav" ? (<>
        <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.xs}px 0 ${SPACE.xs}px` }}>ČO PODPORÍŠ</div>
        {volby.map((v) => (
          <button key={v.id} onClick={() => setRozsah(v.id)} style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: SPACE.sm, textAlign: "left", padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.xs, borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", background: rozsah === v.id ? tint(C.green, .08) : C.surface2, border: `1px solid ${rozsah === v.id ? C.green : C.line}`, color: C.text }}>
            <span style={{ width: 18, height: 18, marginTop: 1, borderRadius: RADIUS.round, flex: "none", border: `2px solid ${rozsah === v.id ? C.green : C.line}`, background: rozsah === v.id ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{rozsah === v.id && <IkonaFajka size={11} color="#fff" />}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{v.t}</span>
              <span style={{ display: "block", fontSize: 11.5, color: C.textTer, marginTop: SPACE.xxs }}>{v.d}</span>
            </span>
          </button>
        ))}

        <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>SUMA</div>
        <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
          {[5, 10, 20, 50].map((c) => <button key={c} onClick={() => setSuma(c)} style={chip(suma === c)}>{c}</button>)}
        </div>
        <div style={{ display: "flex", gap: SPACE.xs }}>
          <button onClick={() => setMena("EUR")} style={chip(mena === "EUR")}>€ EUR</button>
          <button onClick={() => setMena("DEED")} style={chip(mena === "DEED")}>DEED</button>
        </div>

        <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: `${SPACE.md}px 0 ${SPACE.xs}px` }}>AKO ČASTO</div>
        <div style={{ display: "flex", gap: SPACE.xs }}>
          {(["tyzdenne", "mesacne", "rocne"] as Perioda[]).map((p) => <button key={p} onClick={() => setPerioda(p)} style={chip(perioda === p)}>{periodaTxt(p)}</button>)}
        </div>

        <button onClick={() => setKrok("potvrd")} style={btn(true, true)}>Pokračovať</button>
      </>) : (<>
        {/* DVOJITÉ potvrdenie — záväzok */}
        <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
          <Riadok k="Suma" v={`${suma} ${mena}`} />
          <Riadok k="Perióda" v={`každý ${periodaTxt(perioda)}`} />
          <Riadok k="Cieľ" v={volby.find((x) => x.id === rozsah)?.t} />
          {rozsah === "request" && <Riadok k="Pozn." v="zastaví sa pri ukončení zbierky" />}
        </div>
        <div style={{ fontSize: 11.5, color: C.textTer, marginTop: SPACE.sm, lineHeight: 1.5 }}>
          Toto je <b style={{ color: C.text }}>záväzok</b> — platba odíde každý {periodaTxt(perioda)}, kým ju nezrušíš. Zrušiť ju vieš kedykoľvek v Peňaženke.
        </div>
        <button disabled={rec.isPending} onClick={potvrd} style={btn(!rec.isPending, true)}>{rec.isPending ? "Nastavujem…" : "Potvrdiť záväzok"}</button>
        <button onClick={() => setKrok("nastav")} style={{ ...btn(true), background: "rgba(var(--glass-rgb),.06)", color: C.textSec, marginTop: SPACE.sm }}>Späť</button>
      </>)}
    </Sheet>
  );
}

function Riadok({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: SPACE.sm, padding: `${SPACE.xs}px 0`, fontSize: 12.5, borderBottom: `1px solid ${C.line2}` }}>
      <span style={{ color: C.textTer, flex: "none" }}>{k}</span>
      <span style={{ fontWeight: 600, color: C.text, textAlign: "right" }}>{v}</span>
    </div>
  );
}
