// KARTA 06 E · Podporiť DEED — 50 / 100 / 300 DEED (registrovaný) a 1 / 3 / 5 € — klik a hneď odíde → poďakovanie od DEED.
// Bez „Dar pre nás", bez zoznamu darcov. V € je najmenej 1 € (SEPA).
import { useState } from "react";
import { usePouzivatel } from "@/lib/pouzivatel";
import { Harok } from "./Zdielat";
import { Svetlusik } from "./Svetlusik";
import { NadpisSekcie } from "./Sumy";
import { vibruj } from "./animacie";

const eur2 = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function Obsah({ registrovany, onHotovo }: { registrovany: boolean; onHotovo?: () => void }) {
  const ja = usePouzivatel();
  const [hotovo, setHotovo] = useState<string | null>(null);
  const posli = (txt: string) => { vibruj(8); setHotovo(txt); };
  if (hotovo) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "8px 0 4px", animation: "zbFsIn .3s ease both" }}>
      <Svetlusik size={112} />
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{registrovany && ja.meno ? `Ďakujeme, ${ja.meno}.` : "Ďakujeme."}</div>
      <div style={{ fontSize: 15, color: "var(--ink2)", lineHeight: 1.45 }}>Vďaka tebe ostáva DEED zadarmo pre všetkých.</div>
      <div style={{ fontSize: 13, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>Podpora DEED · {hotovo}</div>
      {onHotovo && <button type="button" onClick={onHotovo} style={{ width: "100%", height: 54, marginTop: 8, borderRadius: 16, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Hotovo</button>}
    </div>
  );
  const dlazdica = { position: "relative", height: 66, borderRadius: 16, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, color: "var(--ink)", fontFamily: "inherit", padding: 0 } as const;
  return (
    <>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>DEED je zadarmo pre všetkých. Ak chceš, môžeš prispieť na chod platformy. Príjemcom zbierok to nič neuberie.</div>
      {registrovany && <>
        <NadpisSekcie text="V DEED" doplnok="klik a hneď odíde" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[50, 100, 300].map((d) => (
            <button key={d} type="button" className="zb-dlazdica" onClick={() => posli(`${d} DEED`)}
              style={{ ...dlazdica, background: d === 100 ? "var(--bCard)" : "var(--card)", border: `1px solid ${d === 100 ? "var(--bBd)" : "var(--cardBd)"}` }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: d === 100 ? "var(--blue)" : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{d} <span style={{ fontSize: 11.5, fontWeight: 700 }}>DEED</span></span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink3)" }}>≈ {eur2(d / 100)}</span>
            </button>
          ))}
        </div>
      </>}
      <NadpisSekcie text="V EURÁCH" doplnok="klik a hneď odíde" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[1, 3, 5].map((e, i) => (
          <button key={e} type="button" className="zb-dlazdica" onClick={() => posli(`${e} €`)}
            style={{ ...dlazdica, background: ["var(--card)", "var(--t2)", "var(--t3)"][i], border: `1px solid ${["var(--cardBd)", "var(--t2Bd)", "var(--t3Bd)"][i]}` }}>
            <span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{e} <span style={{ fontSize: 13, fontWeight: 700 }}>€</span></span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>{e < 3 ? "SEPA" : "SEPA · karta"}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink3)", textAlign: "center" }}>Bankový prevod · SEPA · bez poplatku · do 1 prac. dňa</div>
    </>
  );
}

/** hárok (z tlačidla „Podporiť DEED") */
export function PodporitDeedHarok({ registrovany, onClose }: { registrovany: boolean; onClose: () => void }) {
  return (
    <Harok onClose={onClose} hlavicka={<>
      <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--green)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, flex: "none" }}>D</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>Podporiť DEED</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>dobrovoľne · na chod platformy</span>
      </span>
    </>}>
      <Obsah registrovany={registrovany} onHotovo={onClose} />
    </Harok>
  );
}

/** ten istý obsah priamo na mieste `podporitDeed` (DEV náhľad miesta) */
export function PodporitDeedObsah({ registrovany }: { registrovany: boolean }) {
  return <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 12 }}><Obsah registrovany={registrovany} /></div>;
}
