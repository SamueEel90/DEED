// ============================================================
// MÔJ ZAMESTNÁVATEĽ (v profile človeka) — druhá strana väzby.
// Buď prijmeš pozvánku od firmy, alebo si o pripojenie požiadaš sám.
// Odpojiť sa dá kedykoľvek a bez vysvetľovania.
//
// Prečo to človek vôbec chce: firma dorovnáva dary SVOJICH ľudí — bez väzby
// mu jeho dar nikto nezdvojnásobí. Nič iné firme tým nedáva.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet, tint } from "@/shared";
import { pressable } from "@/components/pressable";
import { FIRMY_ADRESAR } from "./mock";
import { poziadaj, potvrd, odmietni, odpoj, useVazbaOsoby } from "@/lib/zamestnanci";

const karta: CSSProperties = {
  background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
  padding: SPACE.sm, marginBottom: SPACE.xs,
};
const btnHlavny: CSSProperties = {
  width: "100%", height: 46, borderRadius: RADIUS.sm, border: "none", cursor: "pointer",
  fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: "var(--a-green)", color: "#fff",
};
const datum = (ms: number) => new Date(ms).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });

export function MojZamestnavatelSheet({ osoba, toast, onClose }: {
  osoba: string; toast: (m: string) => void; onClose: () => void;
}) {
  const vazba = useVazbaOsoby(osoba);
  const [hladam, setHladam] = useState(false);

  const uvod = (
    <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 2, lineHeight: 1.45, marginBottom: SPACE.sm }}>
      Pripojenie je dobrovoľné a kedykoľvek ho zrušíš. Firme tým nedávaš prístup k ničomu —
      slúži len na to, aby vedela dorovnať dary svojich ľudí.
    </div>
  );

  // 1) firma ma pozvala — čaká sa na mňa
  if (vazba?.stav === "pozvany") return (
    <Sheet onClose={onClose} label="Zamestnávateľ">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🏢 Pozvánka od firmy</div>
      {uvod}
      <div style={{ ...karta, background: tint("var(--a-gold)", .1), border: `1px solid ${tint("var(--a-gold)", .35)}` }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{vazba.firma}</div>
        <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 2 }}>pozvala ťa {datum(vazba.kedy)}</div>
      </div>
      <button style={btnHlavny} onClick={() => { potvrd(vazba.firma, osoba); toast(`Pripojený k ${vazba.firma}`); }}>Prijať pozvánku</button>
      <div {...pressable(() => { odmietni(vazba.firma, osoba); toast("Pozvánka odmietnutá"); }, "Odmietnuť")}
        style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0`, cursor: "pointer" }}>
        Odmietnuť
      </div>
    </Sheet>
  );

  // 2) požiadal som a čakám na firmu
  if (vazba?.stav === "ziadost") return (
    <Sheet onClose={onClose} label="Zamestnávateľ">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🏢 Čaká sa na firmu</div>
      {uvod}
      <div style={karta}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{vazba.firma}</div>
        <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 2 }}>požiadal si {datum(vazba.kedy)} · firma to ešte nepotvrdila</div>
      </div>
      <div {...pressable(() => { odpoj(vazba.firma, osoba); toast("Žiadosť stiahnutá"); }, "Stiahnuť žiadosť")}
        style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0`, cursor: "pointer" }}>
        Stiahnuť žiadosť
      </div>
    </Sheet>
  );

  // 3) som pripojený
  if (vazba?.stav === "potvrdeny") return (
    <Sheet onClose={onClose} label="Zamestnávateľ">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🏢 Môj zamestnávateľ</div>
      {uvod}
      <div style={{ ...karta, background: tint("var(--a-green)", .09), border: `1px solid ${tint("var(--a-green)", .35)}` }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{vazba.firma}</div>
        <div style={{ fontSize: 11.5, color: C.textSec, marginTop: 2 }}>pripojený od {datum(vazba.potvrdene ?? vazba.kedy)}</div>
      </div>
      <div style={{ fontSize: 11.5, color: C.textTer, lineHeight: 1.5, marginBottom: SPACE.sm }}>
        Keď daruješ do zbierky, ktorú tvoja firma podporuje, tvoj dar sa jej ráta a môže ho dorovnať.
      </div>
      <div {...pressable(() => { odpoj(vazba.firma, osoba); toast("Odpojené — doterajšie dorovnania ostávajú"); }, "Odpojiť sa")}
        style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0`, cursor: "pointer" }}>
        Odpojiť sa od firmy
      </div>
    </Sheet>
  );

  // 4) nič — buď hľadám firmu, alebo len vysvetlenie
  return (
    <Sheet onClose={onClose} label="Zamestnávateľ">
      <div style={{ fontSize: 16, fontWeight: 800 }}>🏢 Zamestnávateľ</div>
      {uvod}
      {!hladam ? (
        <>
          <div style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.55, marginBottom: SPACE.sm }}>
            Zatiaľ nie si pripojený k žiadnej firme. Pripojenie vznikne dvoma spôsobmi:
            firma ti pošle pozvánku, alebo o to požiadaš ty a firma to potvrdí.
          </div>
          <button style={btnHlavny} onClick={() => setHladam(true)}>Požiadať o pripojenie</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec, marginBottom: SPACE.xs }}>Vyber firmu</div>
          {FIRMY_ADRESAR.map((f) => (
            <div key={f.nazov} {...pressable(() => { poziadaj(f.nazov, osoba); toast(`Žiadosť odoslaná — ${f.nazov} ju musí potvrdiť`); }, f.nazov)}
              style={{ ...karta, display: "flex", alignItems: "center", gap: SPACE.sm, cursor: "pointer" }}>
              <span style={{ width: 32, height: 32, borderRadius: RADIUS.xs, flex: "none", display: "grid", placeItems: "center",
                background: tint("var(--a-info)", .16), color: "var(--a-info)", fontSize: 11, fontWeight: 800 }}>{f.iniciacky}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.nazov}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 1 }}>{f.odvetvie} · {f.mesto}</div>
              </div>
              <span style={{ flex: "none", fontSize: 11.5, fontWeight: 800, color: "var(--a-info)" }}>Požiadať ›</span>
            </div>
          ))}
          <div {...pressable(() => setHladam(false), "Späť")}
            style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0`, cursor: "pointer" }}>Späť</div>
        </>
      )}
    </Sheet>
  );
}
