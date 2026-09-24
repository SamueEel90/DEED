// ============================================================
// ZAMESTNANCI (správa firmy) — kto je k firme pripojený a kto čaká.
// Väzba je vždy obojstranná: firma pozve a človek prijme, alebo človek
// požiada a firma potvrdí. Preto sú tu dva zoznamy — „čaká na vás"
// a „pripojení" — a nie jeden zoznam, do ktorého firma sype mená.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { pozvi, potvrd, odmietni, odpoj, useVazbyFirmy, type Vazba } from "@/lib/zamestnanci";
import { usePouzivatel } from "@/lib/pouzivatel";

const karta: CSSProperties = {
  background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
  padding: SPACE.sm, marginBottom: SPACE.xs,
};
const vstup: CSSProperties = {
  width: "100%", padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm,
  background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`,
  color: C.text, fontSize: 16, outline: "none", fontFamily: "inherit",
};
const btnHlavny: CSSProperties = {
  width: "100%", height: 46, borderRadius: RADIUS.sm, border: "none", cursor: "pointer",
  fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: "var(--a-green)", color: "#fff",
};
const akcia = (farba: string): CSSProperties => ({ fontSize: 11.5, fontWeight: 800, color: farba, cursor: "pointer" });
const datum = (ms: number) => new Date(ms).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric" });

export function ZamestnanciSheet({ firma, toast, onClose }: {
  firma: string; toast: (m: string) => void; onClose: () => void;
}) {
  const ja = usePouzivatel();
  const vazby = useVazbyFirmy(firma);
  const [meno, setMeno] = useState("");

  const cakaju = vazby.filter((x) => x.stav === "ziadost" || x.stav === "pozvany");
  const pripojeni = vazby.filter((x) => x.stav === "potvrdeny");
  const uzavrete = vazby.filter((x) => x.stav === "odmietnuty" || x.stav === "odpojeny");

  const riadok = (x: Vazba) => {
    const cakaNaNas = x.stav === "ziadost";
    const cakaNaNeho = x.stav === "pozvany";
    return (
      <div key={x.osoba} style={karta}>
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
          <span style={{ width: 32, height: 32, borderRadius: "50%", flex: "none", display: "grid", placeItems: "center",
            background: tint("var(--a-info)", .16), color: "var(--a-info)", fontSize: 13, fontWeight: 800 }}>
            {x.osoba.trim()[0]?.toUpperCase() ?? "?"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.osoba}</div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>
              {cakaNaNas ? `požiadal o pripojenie · ${datum(x.kedy)}`
                : cakaNaNeho ? `pozvánka odoslaná · ${datum(x.kedy)} · čaká sa na neho`
                : x.stav === "potvrdeny" ? `pripojený od ${datum(x.potvrdene ?? x.kedy)}`
                : x.stav === "odmietnuty" ? `odmietnuté · ${datum(x.ukoncene ?? x.kedy)}`
                : `odpojený · ${datum(x.ukoncene ?? x.kedy)}`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: SPACE.sm, marginTop: SPACE.xs }}>
          {cakaNaNas && (<>
            <span {...pressable(() => { potvrd(firma, x.osoba); toast(`${x.osoba} je pripojený`); }, "Potvrdiť")}
              style={akcia("var(--a-green)")}>✓ Potvrdiť</span>
            <span {...pressable(() => { odmietni(firma, x.osoba); toast("Žiadosť odmietnutá"); }, "Odmietnuť")}
              style={{ ...akcia(C.textTer), marginLeft: "auto" }}>Odmietnuť</span>
          </>)}
          {cakaNaNeho && (
            <span {...pressable(() => { odmietni(firma, x.osoba); toast("Pozvánka zrušená"); }, "Zrušiť pozvánku")}
              style={{ ...akcia(C.textTer), marginLeft: "auto" }}>Zrušiť pozvánku</span>
          )}
          {x.stav === "potvrdeny" && (
            <span {...pressable(() => { odpoj(firma, x.osoba); toast(`${x.osoba} odpojený — doterajšie dorovnania ostávajú`); }, "Odpojiť")}
              style={{ ...akcia(C.textTer), marginLeft: "auto" }}>Odpojiť</span>
          )}
          {(x.stav === "odmietnuty" || x.stav === "odpojeny") && (
            <span {...pressable(() => { pozvi(firma, x.osoba); toast(`Pozvánka pre ${x.osoba} odoslaná`); }, "Pozvať znova")}
              style={{ ...akcia("var(--a-info)"), marginLeft: "auto" }}>Pozvať znova</span>
          )}
        </div>
      </div>
    );
  };

  const nadpis = (t: string) => (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: C.textTer, margin: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>{t}</div>
  );

  return (
    <Sheet onClose={onClose} label="Zamestnanci" pisanie>
      <div style={{ fontSize: 16, fontWeight: 800 }}>👥 Zamestnanci</div>
      <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
        Pripojenie je vždy obojstranné a dobrovoľné — buď pozvete vy a človek prijme, alebo požiada on a potvrdíte ho.
        Vidíte len to, čo dá do vašich zbierok; kam daruje inde, sa vás netýka.
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: 4 }}>Pozvať zamestnanca</div>
      <input value={meno} onChange={(e) => setMeno(e.target.value)} placeholder="Meno a priezvisko" style={{ ...vstup, marginBottom: 4 }} />
      <div style={{ fontSize: 10.5, color: C.textTer, lineHeight: 1.45, marginBottom: SPACE.xs }}>
        V prototype sa pozvánka páruje podľa presného mena v DEED. (Ostro to pôjde cez e-mail alebo firemný QR.)
        {" "}
        <span {...pressable(() => setMeno(ja.celeMeno), "Pozvať seba")}
          style={{ fontWeight: 800, color: "var(--a-info)", cursor: "pointer" }}>Pozvať seba ({ja.celeMeno})</span>
      </div>
      <button style={{ ...btnHlavny, opacity: meno.trim().length < 3 ? .45 : 1, marginBottom: SPACE.sm }}
        onClick={() => {
          if (meno.trim().length < 3) { toast("Zadajte meno zamestnanca"); return; }
          pozvi(firma, meno.trim());
          toast(`Pozvánka pre ${meno.trim()} odoslaná — platí, až keď ju prijme`);
          setMeno("");
        }}>Poslať pozvánku</button>

      {cakaju.length > 0 && (<>{nadpis("ČAKÁ")}{cakaju.map(riadok)}</>)}
      {pripojeni.length > 0 && (<>{nadpis(`PRIPOJENÍ (${pripojeni.length})`)}{pripojeni.map(riadok)}</>)}
      {uzavrete.length > 0 && (<>{nadpis("UKONČENÉ")}{uzavrete.map(riadok)}</>)}

      {!vazby.length && (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg, lineHeight: 1.5 }}>
          Zatiaľ nikoho nemáte pripojeného.<br />Pošlite pozvánku, alebo nech vás ľudia nájdu sami zo svojho profilu.
        </div>
      )}
    </Sheet>
  );
}
