// OPRAVY 139 / 141 · jedna podpora na všetkých verejných profiloch (Kronika, Výklad, Pirát):
// „TIPY NA PRAVIDELNÝ DAR" → 4 dlaždice (centrálna + 3 sektory, farba podľa poradia) → ťuk rozbalí pod nimi
// náš platobný modul (ModulProfilu). 5. 10.: po výbere sa ostatné dlaždice skryjú, Zbaliť ⌃ vráti všetky 4.
import { useRef, useState } from "react";
import { eur, tvar, jeFarnost, type Lokalita, type Mesto, type TestProfil, type TestSektor, type TestZbierka } from "@/lib/testProfily";
import { vMeste } from "./casti";
import { ModulProfilu } from "./ModulProfilu";
import { useOtvorHlavnuZQr } from "./otvor";

const bg = (f: string) => `url('${f}') center/cover no-repeat #3a3530`;
export type RezPodpory = "pc" | "tab" | "mob";
/** 5. 10. · čo je vybraté na darovanie: index dlaždice (0 centrálna, 1–3 sektory) alebo konkrétna zbierka (PC Pirát / Výklad) */
export type Vyber = number | TestZbierka | null;

/** konkrétna zbierka v náhľade „Posielaš do …" — neutrálny rám (data-hier="z"), modul ako pri sektore */
export function zbierkaAkoSektor(z: TestZbierka): TestSektor {
  return { id: z.id, nazov: z.nazov, druh: "sektor", foto: z.foto, galeria: z.galeria, vyzbierane: z.vyzbierane, darcovia: z.ludia, mesta: {} as TestSektor["mesta"] };
}
export function ModulZbierky({ profil, z, onZbal }: { profil: TestProfil; z: TestZbierka; onZbal: () => void }) {
  const kedy = z.stav === "dlhodoba" ? "dlhodobá" : z.konciDni != null ? `končí o ${tvar(z.konciDni, ["deň", "dni", "dní"])}` : null;
  return <ModulProfilu key={z.id} profil={profil} sektor={zbierkaAkoSektor(z)} poradie={0} hier="z" mestoV="" onZbal={onZbal}
    typ={`ZBIERKA · ${z.mesto.toLocaleUpperCase("sk-SK")}`} typ2={["jeden prípad", kedy, jeFarnost(profil) ? null : "doložené do 30 dní"].filter(Boolean).join(" · ")}
    info={jeFarnost(profil) ? "Zbierka farnosti má jeden účel. Ako to dopadlo, farnosť napíše v ohláškach." : "Konkrétna zbierka má cieľ a koniec. Charita doloží každý doklad do 30 dní po skončení a uvidíš ho tu."}
    dorovnanie={!jeFarnost(profil)}
    meno={z.zodpoveda ?? profil.meno} />;
}

export function PodporaProfilu({ profil, lok, domace, rez, stlpce = rez === "tab" ? 4 : 2, nadpis = "TIPY NA PRAVIDELNÝ DAR", vyska, mod: modP, onMod }: {
  profil: TestProfil; lok: Lokalita; domace: Mesto; rez: RezPodpory;
  /** počet dlaždíc v rade (tablet 4, inak 2) */
  stlpce?: number;
  /** KARTA 45 · Výklad mobil: „DAROVAŤ · TIPY NA PRAVIDELNÝ DAR" */
  nadpis?: string;
  /** výška dlaždice (Výklad PC 118, mobil 104) */
  vyska?: number;
  /** KARTA 45 · Pirát: otvorený modul riadi rodič (ťuk na „Darovať na celú činnosť" / sektor) */
  mod?: Vyber; onMod?: (i: Vyber) => void;
}) {
  const [modVl, setModVl] = useState<Vyber>(null);
  const mod = onMod ? (modP ?? null) : modVl;
  const setMod = (i: Vyber) => (onMod ? onMod(i) : setModVl(i));
  useOtvorHlavnuZQr(profil.k, jeFarnost(profil), () => setMod(0)); // OPRAVY 162
  const nadpisRef = useRef<HTMLSpanElement | null>(null);
  const sk = lok === "Celé Slovensko";
  const mestoV = sk ? "celom Slovensku" : vMeste(lok);
  const sektory: TestSektor[] = [profil.centralna, ...profil.sektory].slice(0, 4);
  const zbal = () => {
    setMod(null);
    requestAnimationFrame(() => nadpisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const modul = mod != null && typeof mod === "object" ? <ModulZbierky profil={profil} z={mod} onZbal={zbal} />
    : typeof mod === "number" && sektory[mod] && <ModulProfilu key={sektory[mod].id} profil={profil} sektor={sektory[mod]} poradie={mod} mestoV={mestoV} onZbal={zbal}
      typ={sektory[mod].typ} typ2={sektory[mod].typ2} info={sektory[mod].info} hlavna={jeFarnost(profil) && !mod} dorovnanie={!jeFarnost(profil)} />;
  return (
    <>
      <span ref={nadpisRef} style={{ scrollMarginTop: 56, fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: rez === "mob" ? 6 : 4 }}>{nadpis}{nadpis === "TIPY NA PRAVIDELNÝ DAR" && <> <span style={{ fontWeight: 600, letterSpacing: 0, color: "var(--ink3)" }}>· aj jednorazovo, zrušíš kedykoľvek</span></>}</span>
      {mod == null && <div style={{ display: "grid", gridTemplateColumns: `repeat(${stlpce},minmax(0,1fr))`, gap: rez === "mob" ? 8 : 10 }}>
        {sektory.map((d, i) => {
          const on = mod === i;
          const sumaT = d.dlazdicaText ?? (d.mesiac != null ? `${eur(d.mesiac)} tento mesiac` : d.mesta[sk ? domace : (lok as Mesto)]?.dlazdica);
          return (
            <button key={d.id} type="button" onClick={() => setMod(on ? null : i)} aria-expanded={on}
              style={{ position: "relative", height: vyska ?? (rez === "tab" ? 136 : rez === "mob" ? 108 : 124), padding: 0, borderRadius: rez === "mob" ? 16 : 18, border: on ? `3px solid var(--h${i})` : `1.5px solid var(--h${i})`, background: bg(d.foto), overflow: "hidden", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, background: `var(--h${i})`, zIndex: 1 }} />
              <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,rgba(10,8,5,0) ${rez === "mob" ? 20 : 25}%,rgba(10,8,5,${rez === "pc" ? ".82" : ".85"}) 100%)` }} />
              <span style={{ position: "relative", padding: rez === "mob" ? "9px 11px" : "10px 12px", display: "flex", flexDirection: "column", gap: rez === "mob" ? 1 : 2, color: "#fff" }}>
                <span style={{ fontSize: rez === "mob" ? 10 : 10.5, fontWeight: 800, letterSpacing: ".08em", opacity: 0.85 }}>{d.stitok ?? (i ? `SEKTOR ${i}` : "CENTRÁLNA")}</span>
                <b style={{ fontSize: rez === "tab" ? 15 : rez === "mob" ? 14.5 : 15.5, lineHeight: 1.2 }}>{d.nazov}</b>
                <span style={{ fontSize: rez === "pc" ? 12.5 : 12, fontVariantNumeric: "tabular-nums", opacity: 0.9 }}>{sumaT}</span>
              </span>
            </button>);
        })}
      </div>}
      {modul && (rez === "tab" ? <div style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}>{modul}</div> : modul)}
    </>
  );
}
