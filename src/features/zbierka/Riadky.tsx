// Riadky detailu zbierky: Zdieľať · QR + Páči sa mi (karta 00/06), karta 12 (pravidelná podpora,
// obľúbené + Podporiť DEED+, zapojiť firmu, reťaz dobra), karta 10 (darcovia), karta 11 (karta Dorovnáva pre darcu).
import { DeedZnacka } from "@/components/DeedZnacka";
import { useState, type CSSProperties, type ReactNode } from "react";
import { usePersonalizacia } from "@/lib/personalizacia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useDarcovia, identitaDarcu, relCas, DARCOVIA_CFG, type DarRiadok } from "@/lib/darcovia";
import { vycerpane, zostatok, type Dorovnanie } from "@/lib/dorovnanie";
import type { Oblubeny } from "@/types";

const eK = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
const riadkove: CSSProperties = { height: 50, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" };
const male: CSSProperties = { height: 44, borderRadius: 14, background: "transparent", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 14, fontWeight: 700, color: "var(--ink2)", cursor: "pointer", fontFamily: "inherit" };

// ---------------- Zdieľať · QR + Páči sa mi ----------------
export function ZdielatRiadok({ onZdielat, paciSa = 0 }: { onZdielat: () => void; paciSa?: number }) {
  const [paci, setPaci] = useState(false);
  const pocet = paciSa + (paci ? 1 : 0);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 2 }}>
      <button type="button" className="zb-karta" onClick={onZdielat} style={riadkove}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>Zdieľať · QR
      </button>
      <button type="button" className="zb-karta" onClick={() => setPaci(!paci)} aria-pressed={paci}
        style={{ ...riadkove, background: paci ? "var(--gSoft)" : "var(--card)", border: `1px solid ${paci ? "var(--gBd)" : "var(--cardBd)"}`, color: paci ? "var(--gInk)" : "var(--ink)", transition: "background .25s ease, color .25s ease, transform .15s ease" }}>
        <svg key={String(paci)} className={paci ? "zb-hviezda" : undefined} width="19" height="19" viewBox="0 0 24 24" fill={paci ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3zm0 0l4-7a2.5 2.5 0 0 1 2.5 2.5V9h5.2a2 2 0 0 1 2 2.3l-1.3 8A2 2 0 0 1 17.4 21H7" /></svg>
        <span>Páči sa mi · <span style={{ fontVariantNumeric: "tabular-nums" }}>{pocet.toLocaleString("sk-SK")}</span></span>
      </button>
    </div>
  );
}

// ---------------- karta 12 ----------------
function Riadok({ ikona, ikonaBg, ikonaFarba, nadpis, nadpisFarba, popis, vpravo, bg, bd, onClick }: {
  ikona: ReactNode; ikonaBg: string; ikonaFarba: string; nadpis: string; nadpisFarba: string; popis: string; vpravo: ReactNode; bg: string; bd: string; onClick: () => void;
}) {
  return (
    <button type="button" className="zb-karta" onClick={onClick}
      style={{ marginTop: 10, width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, background: bg, border: `1px solid ${bd}`, textAlign: "left", cursor: "pointer", color: "var(--ink)", fontFamily: "inherit" }}>
      <span style={{ width: 44, height: 44, borderRadius: 12, background: ikonaBg, color: ikonaFarba, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{ikona}</span>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800, color: nadpisFarba }}>{nadpis}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 1 }}>{popis}</span></span>
      {vpravo}
    </button>
  );
}
export function PravidelnaRiadok({ registrovany, onClick }: { registrovany: boolean; onClick: () => void }) {
  return <Riadok onClick={onClick} bg="var(--gCard)" bd="var(--gBd)" ikonaBg="var(--gSoft)" ikonaFarba="var(--green)" nadpisFarba="var(--green)" nadpis="Pravidelná podpora"
    popis={registrovany ? "Mesačne · kartou alebo prevodom · kedykoľvek zrušíš" : "Mesačne · vyplníš platobné údaje · kedykoľvek zrušíš"}
    ikona={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" /></svg>}
    vpravo={<span style={{ flex: "none", padding: "9px 14px", borderRadius: 12, background: "var(--hcF, #4B7A35)", color: "#fff", fontSize: 13.5, fontWeight: 800 }}>Nastaviť</span>} />;
}
export function OblubenePodporit({ polozka, onPodporit }: { polozka: Oblubeny; onPodporit: () => void }) {
  const { jeOblubene, toggleOblubene } = usePersonalizacia();
  const on = jeOblubene(polozka.refId);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
      <button type="button" className="zb-karta" onClick={() => toggleOblubene(polozka)} aria-pressed={on} style={{ ...male, color: on ? "var(--gold)" : "var(--ink2)" }}>
        <svg key={String(on)} className={on ? "zb-hviezda" : undefined} width="16" height="16" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>
        {on ? "Sleduješ" : "Sledovať"}
      </button>
      <button type="button" className="zb-karta" onClick={onPodporit} style={{ ...male, color: "var(--green)" }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, background: "var(--green)", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>D</span>
        Podporiť <DeedZnacka />
      </button>
    </div>
  );
}
export function ZapojitFirmuRiadok({ firma, onClick }: { firma: string; onClick: () => void }) {
  return <Riadok onClick={onClick} bg="var(--goldBg)" bd="var(--goldBd)" ikonaBg="var(--bg)" ikonaFarba="var(--gold)" nadpisFarba="var(--gold)" nadpis="Zapojiť firmu do dorovnania"
    popis={`${firma} · vidíš len ty, lebo máš IČO`}
    ikona={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3" /></svg>}
    vpravo={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>} />;
}
export function RetazRiadok({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="zb-karta" onClick={onClick}
      style={{ marginTop: 12, width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", textAlign: "left", cursor: "pointer", color: "var(--ink)", fontFamily: "inherit" }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gSoft)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: "var(--green)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>Reťaz dobra</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>rozdeľ platbu medzi seba a charity</span></span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--green)" }}>Nastaviť ›</span>
    </button>
  );
}

// ---------------- karta 11 · karta Dorovnáva (pohľad darcu) ----------------
const pomerText = (p: number) => p === 1 ? "rovnakú sumu" : p === 0.5 ? "polovicu sumy" : p === 2 ? "dvojnásobok" : p === 5 ? "päťnásobok" : `${p}× sumu`;
export function KartaDorovnava({ d, logo }: { d: Dorovnanie; logo?: string }) {
  const [otvorene, setOtvorene] = useState(false);
  const minute = vycerpane(d), ostava = zostatok(d);
  const datum = new Date(d.do).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
  return (
    <div style={{ margin: "0 0 12px", borderRadius: 20, background: "var(--goldBg)", border: "1px solid var(--goldBd)", overflow: "hidden" }}>
      <button type="button" onClick={() => setOtvorene(!otvorene)} aria-expanded={otvorene}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 10px", border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
        {logo || d.firmaLogo
          ? <span style={{ width: 48, height: 48, borderRadius: 12, flex: "none", background: `url(${logo || d.firmaLogo}) center/cover no-repeat` }} />
          : <span style={{ width: 48, height: 48, borderRadius: 12, flex: "none", background: "var(--bg)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3" /></svg></span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".07em", color: "var(--gold)" }}>DOROVNÁVA</span>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{d.firma}</span>
          <span style={{ display: "block", fontSize: 13, color: "var(--ink2)" }}>k tvojmu daru pridá <b style={{ color: "var(--gold)" }}>{pomerText(d.pomer)}</b></span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${otvorene ? 180 : 0}deg)`, transition: "transform .3s ease", flex: "none" }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>
          <span>minuté {eK(minute)}</span><span>ostáva {eK(ostava)} z {eK(d.strop)}</span>
        </div>
        <div style={{ height: 6, borderRadius: 6, background: "var(--track)", overflow: "hidden", marginTop: 6 }}>
          <div className="zb-pruh" style={{ height: "100%", background: "var(--goldGrad)", transformOrigin: "0 50%", transform: `scaleX(${d.strop ? Math.min(1, minute / d.strop) : 0})` }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--ink3)" }}>{d.doVycerpania ? "dorovnáva, kým sa neminie rozpočet" : `dorovnáva do ${datum}`}{d.stropDaru ? ` · najviac ${eK(d.stropDaru)} k jednému daru` : ""}</div>
        {otvorene && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--goldBd)", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)", animation: "zbFsIn .2s ease both" }}>
            Je to dar firmy, nie sponzoring. Peniaze sú už na účte charity a čerpajú sa s každým darom.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- karta 10 · darcovia ----------------
type Par = { darca: DarRiadok; firma?: DarRiadok };
function spojPary(r: DarRiadok[]): Par[] {
  // dorovnanie sa zapíše hneď za darom (je v zozname nad ním) → firma ide VŽDY pod darcu ako jeho pár
  const out: Par[] = [];
  for (let i = 0; i < r.length; i++) {
    const x = r[i];
    if (x.firma && r[i + 1] && !r[i + 1].firma) { out.push({ darca: r[i + 1], firma: x }); i++; }
    else if (!x.firma) out.push({ darca: x });
  }
  return out;
}
const sumaVZozname = (r: DarRiadok) => (r.firma || (r.registrovany && r.zobrazSumu)) && r.suma > DARCOVIA_CFG.prahSumy ? eK(r.suma) : null;

export function Darcovia({ refId, nadpis = "DARCOVIA", cezTvorcu, bezDorovnania, skoncena }: { refId: string; nadpis?: string; cezTvorcu?: string; /** KARTA 46 · modul bez dorovnania firmy: bez zlatých riadkov firmy */ bezDorovnania?: boolean; /** ukončená zbierka: bez „rastie naživo" */ skoncena?: boolean }) {
  const vsetky = useDarcovia(refId);
  const dary = cezTvorcu ? vsetky.filter((r) => r.cezTvorcu === cezTvorcu) : vsetky;
  const ja = usePouzivatel();
  const [vsetci, setVsetci] = useState(false);
  const pary = spojPary(dary).map((p) => (bezDorovnania ? { ...p, firma: undefined } : p));
  const zobraz = vsetci ? pary : pary.slice(0, 10);
  return (
    <div style={{ marginTop: 12, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "14px 16px 6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)" }}>{nadpis}</span>
        {!skoncena && <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--green)" }}>
          <span className="zb-pulz" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />rastie naživo
        </span>}
      </div>
      {pary.length === 0 && <div style={{ fontSize: 13.5, color: "var(--ink3)", padding: "12px 0" }}>Zatiaľ tu nie je žiadny dar.</div>}
      {zobraz.map(({ darca, firma }, i) => (
        <div key={darca.id} className={i === 0 ? "zb-novy-riadok" : undefined} style={{ borderTop: "1px solid var(--cardBd)", padding: "10px 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{identitaDarcu(darca, ja)}</span>
            {sumaVZozname(darca) && <span style={{ fontSize: 14.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{sumaVZozname(darca)}</span>}
            <span style={{ width: 70, textAlign: "right", fontSize: 12, color: "var(--ink4)", flex: "none" }}>{relCas(darca.cas)}</span>
          </div>
          {firma && (
            <div style={{ display: "flex", gap: 8, marginTop: 3, paddingLeft: 14, fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>
              <span style={{ flex: 1 }}>+ {firma.firma}</span>
              {darca.suma > DARCOVIA_CFG.prahSumy && <span style={{ fontVariantNumeric: "tabular-nums" }}>{eK(firma.suma)}</span>}
              <span style={{ width: 70, flex: "none" }} />
            </div>
          )}
        </div>
      ))}
      {pary.length > 10 && (
        <button type="button" onClick={() => setVsetci(!vsetci)}
          style={{ width: "100%", height: 46, margin: "6px 0 10px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--bg)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)" }}>
          {vsetci ? "Zbaliť" : `Zobraziť všetkých ${pary.length}`}
        </button>
      )}
    </div>
  );
}
