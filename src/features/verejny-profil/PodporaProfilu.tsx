// OPRAVY 139 / 141 · jedna podpora na všetkých verejných profiloch (Kronika, Výklad, Pirát):
// „TIPY NA PRAVIDELNÝ DAR" → 4 dlaždice (centrálna + 3 sektory, farba podľa poradia) → ťuk rozbalí pod nimi
// náš platobný modul (ModulProfilu). Zbaliť ⌃ zatvorí modul a vráti stránku na dlaždice.
import { useRef, useState } from "react";
import { eur, type Lokalita, type Mesto, type TestProfil, type TestSektor } from "@/lib/testProfily";
import { vMeste } from "./casti";
import { ModulProfilu } from "./ModulProfilu";

const bg = (f: string) => `url('${f}') center/cover no-repeat #3a3530`;
export type RezPodpory = "pc" | "tab" | "mob";

export function PodporaProfilu({ profil, lok, domace, rez, stlpce = rez === "tab" ? 4 : 2, nadpis = "TIPY NA PRAVIDELNÝ DAR", vyska, mod: modP, onMod }: {
  profil: TestProfil; lok: Lokalita; domace: Mesto; rez: RezPodpory;
  /** počet dlaždíc v rade (tablet 4, inak 2) */
  stlpce?: number;
  /** KARTA 45 · Výklad mobil: „DAROVAŤ · TIPY NA PRAVIDELNÝ DAR" */
  nadpis?: string;
  /** výška dlaždice (Výklad PC 118, mobil 104) */
  vyska?: number;
  /** KARTA 45 · Pirát: otvorený modul riadi rodič (ťuk na „Darovať na celú činnosť" / sektor) */
  mod?: number | null; onMod?: (i: number | null) => void;
}) {
  const [modVl, setModVl] = useState<number | null>(null);
  const mod = onMod ? (modP ?? null) : modVl;
  const setMod = (i: number | null) => (onMod ? onMod(i) : setModVl(i));
  const nadpisRef = useRef<HTMLSpanElement | null>(null);
  const sk = lok === "Celé Slovensko";
  const mestoV = sk ? "celom Slovensku" : vMeste(lok);
  const sektory: TestSektor[] = [profil.centralna, ...profil.sektory].slice(0, 4);
  const zbal = () => {
    setMod(null);
    requestAnimationFrame(() => nadpisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const modul = mod != null && sektory[mod] && <ModulProfilu key={sektory[mod].id} profil={profil} sektor={sektory[mod]} poradie={mod} mestoV={mestoV} onZbal={zbal} />;
  return (
    <>
      <span ref={nadpisRef} style={{ scrollMarginTop: 56, fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: rez === "mob" ? 6 : 4 }}>{nadpis}{nadpis === "TIPY NA PRAVIDELNÝ DAR" && <> <span style={{ fontWeight: 600, letterSpacing: 0, color: "var(--ink3)" }}>· aj jednorazovo, zrušíš kedykoľvek</span></>}</span>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${stlpce},minmax(0,1fr))`, gap: rez === "mob" ? 8 : 10 }}>
        {sektory.map((d, i) => {
          const on = mod === i;
          const sumaT = d.mesiac != null ? `${eur(d.mesiac)} tento mesiac` : d.mesta[sk ? domace : (lok as Mesto)]?.dlazdica;
          return (
            <button key={d.id} type="button" onClick={() => setMod(on ? null : i)} aria-expanded={on}
              style={{ position: "relative", height: vyska ?? (rez === "tab" ? 136 : rez === "mob" ? 108 : 124), padding: 0, borderRadius: rez === "mob" ? 16 : 18, border: on ? `3px solid var(--h${i})` : `1.5px solid var(--h${i})`, background: bg(d.foto), overflow: "hidden", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, background: `var(--h${i})`, zIndex: 1 }} />
              <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,rgba(10,8,5,0) ${rez === "mob" ? 20 : 25}%,rgba(10,8,5,${rez === "pc" ? ".82" : ".85"}) 100%)` }} />
              <span style={{ position: "relative", padding: rez === "mob" ? "9px 11px" : "10px 12px", display: "flex", flexDirection: "column", gap: rez === "mob" ? 1 : 2, color: "#fff" }}>
                <span style={{ fontSize: rez === "mob" ? 10 : 10.5, fontWeight: 800, letterSpacing: ".08em", opacity: 0.85 }}>{i ? `SEKTOR ${i}` : "CENTRÁLNA"}</span>
                <b style={{ fontSize: rez === "tab" ? 15 : rez === "mob" ? 14.5 : 15.5, lineHeight: 1.2 }}>{d.nazov}</b>
                <span style={{ fontSize: rez === "pc" ? 12.5 : 12, fontVariantNumeric: "tabular-nums", opacity: 0.9 }}>{sumaT}</span>
              </span>
            </button>);
        })}
      </div>
      {modul && (rez === "tab" ? <div style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}>{modul}</div> : modul)}
    </>
  );
}
