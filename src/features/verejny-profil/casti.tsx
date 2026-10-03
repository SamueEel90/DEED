// KARTA 43 · spoločné časti troch verejných profilov (Kronika · Výklad · Pirát).
// Farby z tokenov správy charity (.sc-tokeny + data-stit) — tie isté ako v prototypoch.
// Len transform/opacity, ťukacie plochy od 44 px, žiadne emoji, slovenský formát čísel.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { pressable } from "@/components/pressable";
import { StitObr } from "@/components/stit";
import type { StitLevel } from "@/components/stit";
import { LOKALITY, eur, pct, type Lokalita, type Mesto, type TestOznam, type TestPraca, type TestProfil, type TestSkutok, type TestZbierka } from "@/lib/testProfily";
import { useLokalita } from "@/lib/lokalita";

export const MOBIL = "(max-width: 759px)";
export function useMobil(): boolean {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBIL).matches);
  useEffect(() => {
    const q = window.matchMedia(MOBIL), f = () => setM(q.matches);
    q.addEventListener("change", f); return () => q.removeEventListener("change", f);
  }, []);
  return m;
}

/** mesto človeka: ak appka hlási jedno z troch miest, profil sa otvorí v ňom, inak v meste profilu */
export function useDomaceMesto(profil: TestProfil): Mesto {
  const { mesto } = useLokalita();
  return (["Trenčín", "Prešov", "Bratislava"] as Mesto[]).find((m) => m === mesto) ?? profil.mesto;
}

export const karta: CSSProperties = { background: "var(--card)", border: "1px solid var(--cardBd)", borderRadius: 16 };
export const nadpisSekcie: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink4)", textTransform: "uppercase" };

// ---------------- lokalita: „Si v Prešove ⌄" ----------------
export function LokalitaPrepinac({ lok, onLok, domace }: { lok: Lokalita; onLok: (l: Lokalita) => void; domace: Mesto }) {
  const [otv, setOtv] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!otv) return;
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOtv(false); };
    document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f);
  }, [otv]);
  const text = lok === "Celé Slovensko" ? "Celé Slovensko" : `Si v ${vMeste(lok)}`;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button {...pressable()} onClick={() => setOtv((o) => !o)} aria-expanded={otv}
        style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        <IkonaPin />
        {text}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ transform: `rotate(${otv ? 180 : 0}deg)`, transition: "transform .3s ease" }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {otv && (
        <div role="menu" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 40, minWidth: 200, padding: 6, borderRadius: 14, background: "var(--panel)", border: "1px solid var(--cardBd)", boxShadow: "0 18px 40px rgba(0,0,0,.25)" }}>
          {[domace, ...LOKALITY.filter((l) => l !== domace)].map((l) => (
            <button key={l} {...pressable()} role="menuitem" onClick={() => { onLok(l); setOtv(false); }}
              style={{ display: "block", width: "100%", minHeight: 44, textAlign: "left", padding: "0 12px", borderRadius: 10, border: "none", background: l === lok ? "var(--gSoft)" : "transparent", color: l === lok ? "var(--gInk)" : "var(--ink)", fontSize: 14, fontWeight: l === lok ? 800 : 600, cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
/** „Prešov" → „Prešove" (len tri testovacie mestá) */
export const vMeste = (m: Mesto): string => ({ "Trenčín": "Trenčíne", "Prešov": "Prešove", "Bratislava": "Bratislave" })[m];

export function IkonaPin() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>;
}
export function IkonaSipka({ smer = "vpravo" }: { smer?: "vpravo" | "vlavo" }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={smer === "vpravo" ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} /></svg>;
}
export function IkonaZdielat() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3m0 0 4 4m-4-4L8 7" /><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" /></svg>;
}
export function IkonaHladat() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}

// ---------------- pruh postupu ----------------
export function Pruh({ vyzbierane, ciel, vyska = 6 }: { vyzbierane: number; ciel?: number; vyska?: number }) {
  const p = pct(vyzbierane, ciel);
  return (
    <div style={{ height: vyska, borderRadius: 999, background: "var(--track)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${ciel ? p : 100}%`, borderRadius: 999, background: "var(--green)", transformOrigin: "left center" }} />
    </div>
  );
}

// ---------------- karta zbierky ----------------
export function ZbierkaKarta({ z, velka, onOtvor, podMnou }: { z: TestZbierka; velka?: boolean; onOtvor?: () => void; podMnou?: ReactNode }) {
  return (
    <div style={{ ...karta, overflow: "hidden" }}>
      <div style={{ display: velka ? "grid" : "block", gridTemplateColumns: velka ? "minmax(0,1fr) minmax(0,1.1fr)" : undefined }}>
        {velka && <div style={{ position: "relative", minHeight: 200, background: `center/cover no-repeat url("${z.foto}")` }}>
          {z.konciDni != null && <Stitok text={`KONČÍ O ${z.konciDni} DNÍ`} silny />}
        </div>}
        <div style={{ padding: velka ? 20 : 14, display: "grid", gap: 8 }}>
          {!velka && <div style={nadpisSekcie}>{z.stav === "dlhodoba" ? "Dlhodobá" : z.stav === "ukoncena" ? `Doložené · ${z.doklady ?? 0} doklady` : z.konciDni != null ? `Končí o ${z.konciDni} dní` : z.mesto}</div>}
          <div style={{ fontSize: velka ? 22 : 15, fontWeight: 800, lineHeight: 1.25, color: "var(--ink)" }}>{z.nazov}</div>
          {velka && <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{z.popis}</div>}
          <div style={{ display: "grid", gap: 6 }}>
            <Pruh vyzbierane={z.vyzbierane} ciel={z.ciel} />
            <div style={{ fontSize: velka ? 15 : 13, color: "var(--ink2)" }}>
              <b style={{ color: "var(--ink)", fontSize: velka ? 19 : 15 }}>{eur(z.vyzbierane)}</b>
              {z.ciel ? ` z ${eur(z.ciel)}` : " zatiaľ"} · {z.ludia} ľudí
            </div>
          </div>
          {z.dorovnanie && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{z.dorovnanie}</div>}
          {z.spravaDarcom && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink2)", fontStyle: "italic" }}>„{z.spravaDarcom}"</div>}
          {onOtvor && <button {...pressable()} onClick={onOtvor}
            style={{ minHeight: 44, borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            Pozrieť a podporiť
          </button>}
          {podMnou}
        </div>
      </div>
    </div>
  );
}

export function Stitok({ text, silny }: { text: string; silny?: boolean }) {
  return <span style={{ position: "absolute", top: 12, left: 12, padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: ".05em", background: silny ? "rgba(20,17,11,.8)" : "var(--card)", color: silny ? "#F4EFE4" : "var(--ink2)" }}>{text}</span>;
}

// ---------------- karta skutku ----------------
export function SkutokKarta({ s, podMnou }: { s: TestSkutok; podMnou?: ReactNode }) {
  return (
    <div style={{ ...karta, overflow: "hidden", display: "grid", gap: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "92px minmax(0,1fr)", gap: 12, padding: 12, alignItems: "center" }}>
        <div style={{ height: 72, borderRadius: 12, background: `center/cover no-repeat url("${s.foto}")` }} />
        <div style={{ display: "grid", gap: 4 }}>
          <div style={nadpisSekcie}>{s.kedy} · {s.mesto}</div>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, color: "var(--ink)" }}>{s.nazov}</div>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>{s.popis}{s.dobrovolnici ? ` · ${s.dobrovolnici} dobrovoľníkov` : ""}</div>
        </div>
      </div>
      {podMnou && <div style={{ padding: "0 12px 12px" }}>{podMnou}</div>}
    </div>
  );
}

// ---------------- oznam a práca ----------------
export function OznamRiadok({ o }: { o: TestOznam }) {
  return (
    <div style={{ ...karta, display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 12, padding: 14, alignItems: "start" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{o.den}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink4)" }}>{o.mesiac}</div>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ ...nadpisSekcie, color: o.druh === "vyzva" ? "var(--green)" : "var(--ink4)" }}>{o.stitok}</div>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, color: "var(--ink)" }}>{o.nadpis}</div>
        <div style={{ fontSize: 13, color: "var(--ink3)" }}>{o.text}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button {...pressable()} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--gBd)", background: "var(--gSoft)", color: "var(--gInk)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{o.tlacidlo}</button>
          <span style={{ fontSize: 13, color: "var(--ink4)" }}>{o.pod}</span>
        </div>
      </div>
    </div>
  );
}

export function PracaRiadok({ p }: { p: TestPraca }) {
  return (
    <div style={{ ...karta, display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 12, padding: 14, alignItems: "start" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{p.den}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink4)" }}>{p.mesiac}</div>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={nadpisSekcie}>Hľadáme · {p.druh === "brigadnik" ? "brigádnik" : "zamestnanec"}</div>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, color: "var(--ink)" }}>{p.nazov}</div>
        <div style={{ fontSize: 13, color: "var(--ink3)" }}>{p.text}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button {...pressable()} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Mám záujem</button>
          <span style={{ fontSize: 13, color: "var(--ink4)" }}>{p.pod}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------- naživo ----------------
export function NazivoBlok({ profil, lok, domace }: { profil: TestProfil; lok: Lokalita; domace: Mesto }) {
  const mesto = lok === "Celé Slovensko" ? null : lok;
  const d = profil.darcovia.filter((x) => !mesto || x.mesto === mesto);
  const prvy = d[0] ?? profil.darcovia[0];
  const dnes = d.reduce((s, x) => s + (x.suma ?? 0), 0);
  return (
    <div style={{ ...karta, padding: 14, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--green)" }} />
        <span style={{ ...nadpisSekcie, color: "var(--green)" }}>Naživo</span>
        <b style={{ fontSize: 14, color: "var(--ink)" }}>Dnes {eur(dnes)} od {d.length || profil.darcovia.length} ľudí</b>
      </div>
      {prvy && <div style={{ fontSize: 13, color: "var(--ink2)" }}>
        {prvy.suma != null && <b style={{ color: "var(--green)" }}>+{eur(prvy.suma)} </b>}
        <b style={{ color: "var(--ink)" }}>{prvy.meno}</b> · {prvy.naCo} · {prvy.pred}
      </div>}
      <div style={{ fontSize: 12, color: "var(--ink4)" }}>Zoradené podľa času, nie podľa sumy.</div>
      {lok === "Celé Slovensko" && <div style={{ fontSize: 12, color: "var(--ink4)" }}>Najskôr {domace}, potom ostatné mestá.</div>}
    </div>
  );
}

// ---------------- overenie (vždy) ----------------
export function Overenie({ p }: { p: TestProfil }) {
  const riadky: [string, string][] = [["Sídlo", p.sidlo], ["IČO", p.ico], ["Transparentný účet", p.ucet], ["Kontakt", p.kontakt]];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {riadky.map(([k, v]) => (
        <div key={k} style={{ display: "grid", gap: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink4)" }}>{k}</div>
          <div style={{ fontSize: 13, color: "var(--ink2)", wordBreak: "break-word" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------- okno štítu ----------------
export function StitOkno({ p, onClose }: { p: TestProfil; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(10,9,6,.72)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...karta, width: "min(360px, 100%)", padding: 22, display: "grid", gap: 14, justifyItems: "center", textAlign: "center" }}>
        <StitObr level={p.stit as StitLevel} h={120} tien />
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink4)" }}>ŠTÍT DEED+ CARE</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>{nazovStitu(p.stit)}</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>Úroveň dôvery. Rastie s tým, ako organizácia dokladá, na čo išli peniaze.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%" }}>
          {p.stitCisla.map(([h, t]) => (
            <div key={t}><div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>{h}</div><div style={{ fontSize: 11, color: "var(--ink4)" }}>{t}</div></div>
          ))}
        </div>
        <button {...pressable()} onClick={onClose} style={{ minHeight: 44, width: "100%", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Zavrieť</button>
      </div>
    </div>
  );
}
export const nazovStitu = (s: string): string => ({ Bronze: "Bronzový", Silver: "Strieborný", Gold: "Zlatý", Platinum: "Platinový", Legend: "Legenda" })[s] ?? s;

// ---------------- prevod testovacej zbierky na ZbierkaData (detail) ----------------
import type { ZbierkaData } from "@/features/zbierka/ZbierkaModul";
export function naZbierkaData(z: TestZbierka, profil: TestProfil): ZbierkaData {
  return {
    id: z.id, nazov: z.nazov, popis: z.popis, overena: true,
    media: [{ typ: "foto", src: z.foto }],
    vyzbierane: z.vyzbierane, ciel: z.ciel, ludia: z.ludia,
    organizacia: {
      meno: z.zodpoveda ?? profil.meno, typ: "charita", mesto: z.mesto,
      veta: profil.veta, cisla: [], stit: (profil.stit as StitLevel),
    },
  };
}
