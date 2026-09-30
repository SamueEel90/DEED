// Tmavé pruhy nad tlačidlom Pridať skutok (Moje skutky aj Domov):
// „Akcia beží · 1:12:04 · 8 účastníkov" (karta 22) a ohlásený skutok „Pripravuje sa / Práve prebieha" (karta 21 bod 12).
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "@/components/toast";
import { useAkcia, otvorAkciu, cas } from "@/lib/akcia";
import { ohlasenie, nastavOhlasenie, useZmenySkutkov } from "@/lib/mojeSkutky";
import { otvorPridatSkutok } from "./otvor";

const Sipka = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F1ECE1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;

function Pruh({ children, onClick, label }: { children: ReactNode; onClick?: () => void; label?: string }) {
  const st = { display: "flex", alignItems: "center", gap: 12, minHeight: 60, width: "100%", padding: "8px 8px 8px 14px", borderRadius: 18, background: "#1D211B", color: "#F1ECE1", boxShadow: "0 10px 24px rgba(30,28,20,.3)", pointerEvents: "auto" as const, border: "none", textAlign: "left" as const, fontFamily: "inherit" };
  return onClick ? <button type="button" onClick={onClick} aria-label={label} style={{ ...st, cursor: "pointer" }}>{children}</button> : <div style={st}>{children}</div>;
}

export function PruhySkutkov() {
  useZmenySkutkov();
  const ak = useAkcia();
  const ohl = ohlasenie();
  const [, tik] = useState(0);
  useEffect(() => { if (ak?.stav !== "bezi" || ak.otvorena) return; const t = setInterval(() => tik((x) => x + 1), 1000); return () => clearInterval(t); }, [ak?.stav, ak?.otvorena]);
  const zacinam = () => {
    if (!ohl) return;
    if (ohl.sk) { otvorAkciu(ohl.dar); return; }
    if (!navigator.geolocation) { toast("Bez polohy akciu nespustíš. Zapni ju v nastaveniach telefónu."); return; }
    navigator.geolocation.getCurrentPosition(() => nastavOhlasenie({ ...ohl, stav: "bezi" }), () => toast("Bez polohy akciu nespustíš. Zapni ju v nastaveniach telefónu."), { timeout: 10000 });
  };
  const bod = (c: string) => <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", background: c, flex: "none" }} />;
  return <>
    {ak && !ak.otvorena && (() => {
      const t = ak.stav === "bezi" && ak.start ? `Akcia beží · ${cas(Math.floor((Date.now() - ak.start) / 1000))}` : "Akcia sa pripravuje";
      return <Pruh onClick={() => otvorAkciu()} label={`${t}, ${ak.uc.length + 1} účastníkov, otvoriť detail`}>
        {bod("#8DB866")}
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{t}</span>
          <span style={{ display: "block", fontSize: 13, color: "rgba(241,236,225,.72)" }}>{ak.uc.length + 1} účastníkov · ťukni pre detail</span></span>
        <span style={{ display: "flex", paddingRight: 6 }}><Sipka /></span>
      </Pruh>;
    })()}
    {ohl && !ak && <Pruh>
      {bod(ohl.stav === "bezi" ? "#8DB866" : "#E0B85A")}
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ohl.stav === "bezi" ? `Práve prebieha · ${ohl.nazov}` : `Pripravuje sa · ${ohl.kedy}`}</span>
        <span style={{ display: "block", fontSize: 13, color: "rgba(241,236,225,.72)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ohl.stav === "bezi" ? "Keď skončíš, pridaj dôkazy" : ohl.nazov}</span></span>
      <button type="button" onClick={ohl.stav === "bezi" ? () => otvorPridatSkutok({ dokoncit: true, start: ohl.sk ? "skupina" : "solo" }) : zacinam} style={{ flex: "none", height: 44, padding: "0 14px", borderRadius: 13, border: "none", background: "linear-gradient(90deg,#4B7A35,#8DB866)", color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{ohl.stav === "bezi" ? "Dokončiť" : "Začínam"}</button>
    </Pruh>}
  </>;
}
