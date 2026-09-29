// ============================================================
// PODPORIŤ DEED — tlačidlo + sheet na podporu samotnej platformy.
// Žije v detailoch vedľa „Obľúbené" (rozdelený riadok pol na pol):
// <div flex gap> <OblubeneBtn flex:1/> <PodporitDeed flex:1/> </div>
// Dar ide organizácii DEED (prevádzka platformy) — transparentne,
// cez rovnaký platobný tok ako všetky ostatné dary (PlatbaModal).
// ============================================================
import { DeedZnacka } from "@/components/DeedZnacka";
import { useState, type CSSProperties } from "react";
import { C, GRAD, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { Sheet } from "@/components/sheet";
import { PlatbaModal } from "@/components/platba";
import { Znacka } from "@/components/znacka";
import { pridajDar } from "@/lib/darcovia";
import { usePouzivatel } from "@/lib/pouzivatel";
import type { Kanal } from "@/types";

const DAR_REF = "deed-platforma"; // spoločný kľúč darov pre platformu
const vlastna: CSSProperties = { width: "100%", height: 46, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: C.surface2, color: C.text, fontWeight: 700, fontSize: 13.5, fontFamily: "inherit", cursor: "pointer" };

export function PodporitDeed({ toast, style }: { toast?: (m: string) => void; style?: CSSProperties }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        height: 48, borderRadius: RADIUS.md, display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs,
        fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        background: tint("var(--a-green)", .09), border: `1px solid ${tint("var(--a-green)", .38)}`, color: "var(--a-green)",
        transition: "background .15s ease", ...style,
      }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, background: GRAD, color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>D</span>
        Podporiť <DeedZnacka />
      </button>
      {open && <PodporitDeedSheet toast={toast} onClose={() => setOpen(false)} />}
    </>
  );
}

function PodporitDeedSheet({ toast, onClose }: { toast?: (m: string) => void; onClose: () => void }) {
  const [platba, setPlatba] = useState<Kanal | null>(null);
  const [eurRychly, setEurRychly] = useState<number | null>(null); // 0,50 / 1 / 3 € — len SEPA
  const ja = usePouzivatel();
  const dar = (deed: number) => {
    pridajDar({ refId: DAR_REF, suma: deed * 0.01, kanal: "deed", registrovany: ja.typ !== "pasivny" });
    toast?.(`Ďakujeme za podporu platformy — ${deed}\u00a0DEED`);
    onClose();
  };
  return (
    <>
      <Sheet onClose={onClose} label="Podporiť DEED+">
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
          <Znacka size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Podpor <DeedZnacka /> — platformu dobra</div>
            <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2 }}>nezisková prevádzka · bez reklám · bez predaja dát</div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.55, marginBottom: SPACE.md }}>
          <DeedZnacka /> neberie percentá z darov — beží z dobrovoľnej podpory ľudí, ktorým dáva zmysel.
          Tvoj príspevok platí servery, vývoj a overovanie zbierok. Použitie prostriedkov zverejňujeme.
        </div>
        <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
          {[50, 100, 300].map((v) => (
            <button key={v} onClick={() => dar(v)} style={{
              flex: 1, minHeight: 54, borderRadius: RADIUS.md, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
              background: v === 100 ? tint("var(--a-green)", .1) : C.surface2,
              border: `1px solid ${v === 100 ? tint("var(--a-green)", .5) : C.line}`, color: C.text,
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: v === 100 ? "var(--a-green)" : C.text }}>{v}<span style={{ fontSize: 9, fontWeight: 700, color: C.textTer, marginLeft: 3 }}>DeeD</span></span>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.textTer, marginTop: 3 }}>≈ {(v * 0.01).toLocaleString("sk", { minimumFractionDigits: 2 })} €</span>
            </button>
          ))}
        </div>
        <button onClick={() => setPlatba("DEED")} style={vlastna}>Vlastná suma v DeeD</button>

        {/* to isté v eurách — drobné sumy len SEPA, vlastná suma karta aj SEPA */}
        <div style={{ display: "flex", gap: SPACE.xs, margin: `${SPACE.md}px 0 ${SPACE.sm}px` }}>
          {[0.5, 1, 3].map((v) => (
            <button key={v} onClick={() => setEurRychly(v)} style={{
              flex: 1, minHeight: 54, borderRadius: RADIUS.md, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
              background: v === 1 ? tint("var(--a-green)", .1) : C.surface2,
              border: `1px solid ${v === 1 ? tint("var(--a-green)", .5) : C.line}`, color: C.text,
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: v === 1 ? "var(--a-green)" : C.text }}>{v.toLocaleString("sk", { minimumFractionDigits: v < 1 ? 2 : 0 })}<span style={{ fontSize: 10, fontWeight: 700, color: C.textTer, marginLeft: 3 }}>€</span></span>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.textTer, marginTop: 3 }}>SEPA</span>
            </button>
          ))}
        </div>
        <button onClick={() => setPlatba("EUR")} style={vlastna}>Vlastná suma v €</button>
        <div style={{ fontSize: 10.5, color: C.textTer, textAlign: "center", marginTop: SPACE.sm }}>Ďakujeme — vďaka podpore ostáva <DeedZnacka /> zadarmo pre všetkých.</div>
      </Sheet>
      {platba && <PlatbaModal kanal={platba} komu="DEED+ — platforma dobra" onClose={() => setPlatba(null)}
        onDone={(s: number) => {
          const deed = platba === "DEED";
          pridajDar({ refId: DAR_REF, suma: deed ? s * 0.01 : s, kanal: deed ? "deed" : "psp", registrovany: ja.typ !== "pasivny" });
          toast?.(`Ďakujeme za podporu platformy — ${s} ${deed ? "DeeD" : "€"}`);
          onClose();
        }} />}
      {eurRychly != null && <PlatbaModal kanal="EUR" suma={eurRychly} lenSepa komu="DEED+ — platforma dobra" onClose={() => setEurRychly(null)}
        onDone={(s: number) => {
          pridajDar({ refId: DAR_REF, suma: s, kanal: "psp", registrovany: ja.typ !== "pasivny" });
          toast?.(`Ďakujeme za podporu platformy — ${s} €`);
          onClose();
        }} />}
    </>
  );
}
