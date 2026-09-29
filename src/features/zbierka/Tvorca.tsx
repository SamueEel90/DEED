// KARTA 13 · Zbierka cez tvorcu — „Kam ide tvoj dar" (zbierka + tmavá karta tvorcu) a malá karta „Celá zbierka".
// Počet sledovateľov ani karma sa nezobrazujú. Odkazy na obsah mení tvorca kedykoľvek (nie sú súčasťou zapečatenia).
import { useState } from "react";
import { useDarcovia } from "@/lib/darcovia";
import { StityRad } from "@/components/stit";
import { stityOblastiSubjektu } from "@/lib/stityOblasti";
import type { StitUroven } from "./Pole";

export type TvorcaData = {
  id: string;
  meno: string;            // „Marek Tvorí"
  menoAkuzativ: string;    // „Vyzbierané cez Mareka", „DARCOVIA CEZ MAREKA"
  menoDativ: string;       // „50 % ide Marekovi"
  foto?: string;
  platformy: string[];     // z jeho odkazov: ["Twitch", "YouTube"]
  nazivo?: boolean;        // práve vysiela
  podielZbierke: number;   // 5–100 % z každého daru ide zbierke (zapečatené)
  veta?: string;
  odkazy?: { druh: "nazivo" | "zaznam"; platforma: string; url: string }[];
  stit: StitUroven;
};

const eK = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;

export function KamIdeDar({ nazovZbierky, fotoZbierky, tvorca, onStrankaTvorcu }: { nazovZbierky: string; fotoZbierky?: string; tvorca: TvorcaData; onStrankaTvorcu?: () => void }) {
  const [otv, setOtv] = useState(false);
  return (
    <div style={{ margin: "0 0 12px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      <div style={{ padding: "12px 14px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 800, letterSpacing: ".07em", color: "var(--ink3)" }}>
        <span>KAM IDE TVOJ DAR</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, letterSpacing: 0, fontWeight: 700, fontSize: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>zapečatené
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px" }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, flex: "none", background: fotoZbierky ? `url(${fotoZbierky}) center/cover` : "var(--gSoft)" }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nazovZbierky}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>táto zbierka</span>
        </span>
        <span style={{ flex: "none", fontSize: 18, fontWeight: 800, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{tvorca.podielZbierke} %</span>
      </div>
      <div className="zb-tvorca" style={{ margin: "4px 10px 10px", borderRadius: 16, color: "#F1ECE1", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", paddingRight: 10 }}>
        <button type="button" onClick={() => setOtv(!otv)} aria-expanded={otv}
          style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, padding: 12, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", textAlign: "left", color: "inherit", fontFamily: "inherit" }}>
          <span style={{ position: "relative", flex: "none", width: 60, height: 60 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", padding: 2.5, background: "linear-gradient(135deg,#B8452F,#E08A3C)" }}>
              <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "2px solid #1D211B", background: tvorca.foto ? `#2B3640 url(${tvorca.foto}) center/cover` : "#2B3640" }} />
            </span>
            {tvorca.nazivo && <span style={{ position: "absolute", left: "50%", bottom: -6, transform: "translateX(-50%)", padding: "1px 6px", borderRadius: 5, background: "#B8452F", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", whiteSpace: "nowrap" }}>NAŽIVO</span>}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{tvorca.meno}</span>
            <span style={{ display: "block", marginTop: 3, fontSize: 12.5, color: "rgba(241,236,225,.72)" }}>{["tvorca", ...tvorca.platformy].join(" · ")}</span>
            <span style={{ display: "inline-flex", marginTop: 6, padding: "3px 8px", borderRadius: 8, background: "rgba(143,182,212,.16)", color: "#BFD6E8", fontSize: 12, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{100 - tvorca.podielZbierke} % ide {tvorca.menoDativ}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F1ECE1" strokeWidth="2.4" strokeLinecap="round" style={{ flex: "none", transform: `rotate(${otv ? 180 : 0}deg)`, transition: "transform .3s ease" }}><path d="M6 9l6 6 6-6" /></svg>
        </button>
          <span style={{ flex: "none", color: "#F1ECE1" }}><StityRad variant="pole" hlavny={tvorca.stit} oblasti={stityOblastiSubjektu(tvorca.meno, tvorca.stit)} meno={tvorca.meno} velkost={36} /></span>
        </div>
        {otv && (
          <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: "rgba(241,236,225,.82)", animation: "zbFsIn .2s ease both" }}>
            {tvorca.veta && <div>{tvorca.veta}</div>}
            {(tvorca.odkazy ?? []).map((o, i) => (
              <a key={i} href={o.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "0 12px", borderRadius: 12, background: "rgba(241,236,225,.08)", textDecoration: "none" }}>
                {o.druh === "nazivo" ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E0553A", flex: "none" }} />
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(241,236,225,.7)"><path d="M7 4.5v15l12-7.5z" /></svg>}
                <span style={{ flex: 1, fontWeight: 700, color: "#F1ECE1" }}>{o.druh === "nazivo" ? "Naživo" : "Záznam"} · {o.platforma}</span>
                <span style={{ fontWeight: 800, color: "#BFD6E8" }}>Pozrieť ›</span>
              </a>
            ))}
            {onStrankaTvorcu && <button type="button" onClick={onStrankaTvorcu} style={{ alignSelf: "flex-start", padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#BFD6E8" }}>Otvoriť stránku tvorcu ›</button>}
          </div>
        )}
      </div>
    </div>
  );
}

/** malá karta „Celá zbierka" pod kartou stavu cez tvorcu */
export function CelaZbierka({ refId, zaklad, ciel, ludiaZaklad }: { refId: string; zaklad: number; ciel?: number | null; ludiaZaklad: number }) {
  const dary = useDarcovia(refId);
  const suma = zaklad + dary.reduce((a, r) => a + r.suma, 0);
  const ludia = ludiaZaklad + dary.length;
  const riadok = { display: "flex", alignItems: "center", gap: 10, margin: "-4px 0 12px", padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", fontSize: 12.5, fontVariantNumeric: "tabular-nums" } as const;
  if (ciel && ciel > 0) {
    const p = Math.min(1, suma / ciel);
    return (
      <div style={riadok}>
        <span style={{ flex: "none", fontWeight: 700, color: "var(--ink3)" }}>Celá zbierka</span>
        <div style={{ position: "relative", flex: 1, height: 5, borderRadius: 5, background: "var(--track)", overflow: "hidden" }}>
          <div className="zb-pruh" style={{ position: "absolute", inset: 0, background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${p})` }} />
        </div>
        <span style={{ flex: "none", fontWeight: 800 }}>{eK(suma)} z {eK(ciel)}</span>
        <span style={{ flex: "none", fontWeight: 800, color: "var(--green)" }}>{Math.floor((suma / ciel) * 100)} %</span>
      </div>
    );
  }
  const ludiaTxt = ludia === 1 ? "1 človek pomohol" : ludia >= 2 && ludia <= 4 ? `${ludia} ľudia pomohli` : `${ludia} ľudí pomohlo`;
  return (
    <div style={riadok}>
      <span style={{ flex: "none", fontWeight: 700, color: "var(--ink3)" }}>Celá zbierka</span>
      <span style={{ flex: 1, fontWeight: 800, color: "var(--green)" }}>{eK(suma)}</span>
      <span style={{ flex: "none", fontWeight: 700, color: "var(--ink3)" }}>bez cieľa · {ludiaTxt}</span>
    </div>
  );
}
