// KARTA 43 · návrh Pirát (v4, tvorca). Rozhodni sa za 30 sekúnd: 6 obrazoviek na celú
// výšku, každá jedna vec (tvár · čo teraz potrebujú · dôkaz · ľudia · oznamy a práca · koniec).
// Posúva sa po jednej (scroll-snap), bodky vpravo. Vpravo jediný platobný modul (PC);
// na mobile pás „Podporiť · Celá činnosť ⌄" nad dolnou lištou → hárok 2×2 + platba.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { pressable } from "@/components/pressable";
import { StitObr } from "@/components/stit";
import type { StitLevel } from "@/components/stit";
import { eur, vLokalite, type Lokalita, type Mesto, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import {
  IkonaSipka, IkonaZdielat, LokalitaPrepinac, Overenie, Pruh, StitOkno, karta, nadpisSekcie,
  useDomaceMesto, useMobil, vMeste,
} from "./casti";
import { ModulSektory } from "./ModulSektory";

export function Pirat({ profil, onDetail, onBack }: {
  profil: TestProfil; onDetail: (z: TestZbierka) => void; onBack: () => void;
}) {
  const mobil = useMobil();
  const domace = useDomaceMesto(profil);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [stit, setStit] = useState(false);
  const [harok, setHarok] = useState(false);
  const scRef = useRef<HTMLDivElement>(null);
  const [krok, setKrok] = useState(0);

  const zbierky = vLokalite(profil.zbierky, lok, domace).filter((z) => z.stav !== "ukoncena");
  const dolozene = vLokalite(profil.zbierky, lok, domace).filter((z) => z.stav === "ukoncena");
  const skutky = vLokalite(profil.skutky, lok, domace);
  const oznamy = vLokalite(profil.oznamy, lok, domace);
  const praca = vLokalite(profil.praca, lok, domace);
  const darcovia = lok === "Celé Slovensko" ? profil.darcovia : profil.darcovia.filter((d) => d.mesto === lok);
  const mestoText = vMeste(lok === "Celé Slovensko" ? domace : lok);

  const obr = [
    <ObrTvar key="tvar" profil={profil} lok={lok} mestoText={mestoText} />,
    <ObrPotreby key="potreby" zbierky={zbierky} mestoText={mestoText} onDetail={onDetail} />,
    <ObrDokaz key="dokaz" dolozene={dolozene} mestoText={mestoText} />,
    <ObrLudia key="ludia" darcovia={darcovia} mestoText={mestoText} onPodpor={() => (mobil ? setHarok(true) : null)} />,
    <ObrOznamy key="oznamy" oznamy={oznamy} praca={praca} mestoText={mestoText} />,
    <ObrKoniec key="koniec" profil={profil} mestoText={mestoText} onPodpor={() => (mobil ? setHarok(true) : null)} />,
  ];

  useEffect(() => {
    const el = scRef.current; if (!el) return;
    const f = () => { const h = el.clientHeight || 1; setKrok(Math.round(el.scrollTop / h)); };
    el.addEventListener("scroll", f, { passive: true }); return () => el.removeEventListener("scroll", f);
  }, []);
  const chodNa = (i: number) => { const el = scRef.current; if (el) el.scrollTo({ top: i * el.clientHeight, behavior: "smooth" }); };

  return (
    <div className="sc-tokeny" data-stit={profil.stit.toLowerCase()} style={{ position: "absolute", inset: 0, background: "var(--bg)", color: "var(--ink)", display: "flex" }}>
      {/* ľavý stĺpec — 6 obrazoviek */}
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        {/* horné ovládanie */}
        <div style={{ position: "absolute", top: 14, left: 14, right: 14, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, pointerEvents: "none" }}>
          <div style={{ display: "flex", gap: 10, pointerEvents: "auto" }}>
            <button {...pressable()} onClick={onBack} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><IkonaSipka smer="vlavo" />Späť</button>
            <LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} />
          </div>
          <button {...pressable()} style={{ pointerEvents: "auto", minHeight: 44, display: "flex", alignItems: "center", gap: 7, padding: "0 14px", borderRadius: 999, background: "var(--card)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><IkonaZdielat />Zdieľať · QR</button>
        </div>

        <div ref={scRef} style={{ height: "100%", overflowY: "auto", scrollSnapType: "y mandatory", scrollBehavior: "smooth" }}>
          {obr.map((o, i) => (
            <section key={i} style={{ height: "100%", minHeight: "100%", scrollSnapAlign: "start", padding: mobil ? "64px 16px 96px" : "72px 40px 40px", display: "grid", alignContent: "center", overflowY: "auto" }}>
              <div style={{ width: "100%", maxWidth: 680, margin: "0 auto" }}>{o}</div>
            </section>
          ))}
        </div>

        {/* bodky vpravo */}
        <div style={{ position: "absolute", top: "50%", right: mobil ? 10 : 18, transform: "translateY(-50%)", zIndex: 30, display: "grid", gap: 10 }}>
          {obr.map((_, i) => (
            <button key={i} {...pressable()} onClick={() => chodNa(i)} aria-label={`Obrazovka ${i + 1}`}
              style={{ width: 10, height: 10, padding: 0, borderRadius: 999, border: "none", cursor: "pointer", background: krok === i ? "var(--green)" : "var(--track)", transform: `scale(${krok === i ? 1.3 : 1})`, transition: "transform .2s ease, background .2s ease" }} />
          ))}
        </div>

        {/* mobil: pás Podporiť nad dolnou lištou */}
        {mobil && (
          <button {...pressable()} onClick={() => setHarok(true)}
            style={{ position: "absolute", left: 14, right: 14, bottom: 16, zIndex: 30, minHeight: 52, borderRadius: 16, border: "none", background: "var(--green)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            Podporiť · Celá činnosť
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        )}
      </div>

      {/* pravý stĺpec — jediný platobný modul (PC) */}
      {!mobil && (
        <div style={{ width: 440, flexShrink: 0, borderLeft: "1px solid var(--cardBd)", background: "var(--panel)", overflowY: "auto", padding: 18 }}>
          <ModulSektory profil={profil} lok={lok} domace={domace} />
          {zbierky[0] && (
            <button {...pressable()} onClick={() => onDetail(zbierky[0])} style={{ marginTop: 14, width: "100%", minHeight: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink2)", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Chceš vidieť každý doklad? Vyber konkrétnu zbierku ›</button>
          )}
        </div>
      )}

      {/* mobil: hárok zdola s dlaždicami + platbou */}
      {mobil && harok && (
        <div onClick={() => setHarok(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,9,6,.55)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "88%", overflowY: "auto", background: "var(--bg)", borderRadius: "22px 22px 0 0", padding: 16 }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--track)", margin: "0 auto 12px" }} />
            <ModulSektory profil={profil} lok={lok} domace={domace} />
            <button {...pressable()} onClick={() => setHarok(false)} style={{ marginTop: 12, width: "100%", minHeight: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Zavrieť</button>
          </div>
        </div>
      )}

      {stit && <StitOkno p={profil} onClose={() => setStit(false)} />}
    </div>
  );
}

// ---- obrazovka 1 · tvár ----
function ObrTvar({ profil, lok, mestoText }: { profil: TestProfil; lok: Lokalita; mestoText: string }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ height: 240, borderRadius: 20, background: `center/cover no-repeat url("${profil.centralna.foto}")`, position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: 14, padding: "6px 12px", borderRadius: 999, background: "rgba(20,17,11,.75)", color: "#F4EFE4", fontSize: 11, fontWeight: 800, letterSpacing: ".05em" }}>ISKRA · {profil.skutky[0]?.nazov} · 0:38</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", display: "grid", placeItems: "center", fontSize: 18, fontWeight: 800 }}>{profil.iniciala}</div>
        <div><div style={{ fontSize: 18, fontWeight: 800 }}>{profil.meno}</div><div style={{ fontSize: 12.5, color: "var(--ink3)" }}>{profil.stitky[2]} · {mestoText}</div></div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>{profil.veta}</div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {profil.cisla.map(([h, t]) => <div key={t}><div style={{ fontSize: 22, fontWeight: 800 }}>{h}</div><div style={{ fontSize: 12, color: "var(--ink4)" }}>{t}</div></div>)}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink4)" }}>Posuň ďalej · čo teraz v {mestoText} potrebujú</div>
    </div>
  );
}

// ---- obrazovka 2 · čo teraz potrebujú ----
function ObrPotreby({ zbierky, mestoText, onDetail }: { zbierky: TestZbierka[]; mestoText: string; onDetail: (z: TestZbierka) => void }) {
  const prva = zbierky[0];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={nadpisSekcie}>Teraz v {mestoText} potrebujeme</div>
      {prva ? (
        <div style={{ ...karta, overflow: "hidden" }}>
          <div style={{ height: 180, background: `center/cover no-repeat url("${prva.foto}")`, position: "relative" }}>
            {prva.konciDni != null && <span style={{ position: "absolute", left: 12, top: 12, padding: "6px 10px", borderRadius: 999, background: "rgba(20,17,11,.8)", color: "#F4EFE4", fontSize: 11, fontWeight: 800 }}>KONČÍ O {prva.konciDni} DNÍ</span>}
          </div>
          <div style={{ padding: 18, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink4)" }}>{mestoText}{prva.cast ? ` · ${prva.cast}` : ""}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{prva.nazov}</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{prva.popis}</div>
            <Pruh vyzbierane={prva.vyzbierane} ciel={prva.ciel} />
            <div style={{ fontSize: 14, color: "var(--ink2)" }}><b style={{ color: "var(--ink)", fontSize: 18 }}>{eur(prva.vyzbierane)}</b>{prva.ciel ? ` z ${eur(prva.ciel)}` : ""} · {prva.ludia} ľudí</div>
            <button {...pressable()} onClick={() => onDetail(prva)} style={{ minHeight: 44, borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Otvoriť zbierku a darovať ›</button>
          </div>
        </div>
      ) : <Prazdne mestoText={mestoText} />}
      {zbierky.length > 1 && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink4)" }}>Ďalšie v {mestoText}:</div>
          {zbierky.slice(1).map((z) => (
            <button key={z.id} {...pressable()} onClick={() => onDetail(z)} style={{ textAlign: "left", minHeight: 44, padding: "10px 14px", borderRadius: 12, background: "var(--card)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              {z.nazov}<IkonaSipka />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- obrazovka 3 · dôkaz ----
function ObrDokaz({ dolozene, mestoText }: { dolozene: TestZbierka[]; mestoText: string }) {
  const z = dolozene[0];
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={nadpisSekcie}>Dôkaz · v {mestoText}</div>
      {z ? (
        <div style={{ ...karta, padding: 20, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--green)" }}>DOLOŽENÉ · {z.doklady ?? 0} DOKLADOV</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink4)" }}>SĽÚBILI SME</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{z.nazov}</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{z.popis}</div>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>{eur(z.vyzbierane)} · od {z.ludia} ľudí · skončila {z.skoncila}</div>
          {z.spravaDarcom && <><div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink4)", marginTop: 4 }}>SPLNILI SME</div>
            <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink)", fontStyle: "italic" }}>„{z.spravaDarcom}"</div></>}
          <button {...pressable()} style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Pozrieť doklady ›</button>
        </div>
      ) : <Prazdne mestoText={mestoText} />}
    </div>
  );
}

// ---- obrazovka 4 · ľudia, ktorí dali ----
function ObrLudia({ darcovia, mestoText, onPodpor }: { darcovia: TestProfil["darcovia"]; mestoText: string; onPodpor: () => void }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={nadpisSekcie}>Ľudia, ktorí dali</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{darcovia.length} ľudí z {mestoText} už pomohlo</div>
      <div style={{ fontSize: 13, color: "var(--ink3)" }}>Zoradené podľa času, nie podľa sumy. Každý si vybral, či ho uvidíš s menom.</div>
      <div style={{ display: "grid", gap: 8 }}>
        {darcovia.map((d) => (
          <div key={d.id} style={{ ...karta, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: "var(--field)", border: "1px solid var(--cardBd)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800 }}>{d.iniciala}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{d.meno} · {d.mesto}</div><div style={{ fontSize: 12, color: "var(--ink4)" }}>{d.naCo}</div></div>
            <div style={{ textAlign: "right" }}>{d.suma != null && <div style={{ fontSize: 14, fontWeight: 800, color: "var(--green)" }}>+{eur(d.suma)}</div>}<div style={{ fontSize: 11, color: "var(--ink4)" }}>{d.pred}</div></div>
          </div>
        ))}
      </div>
      <button {...pressable()} onClick={onPodpor} style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--gBd)", background: "var(--gSoft)", color: "var(--gInk)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Pridaj sa ›</button>
    </div>
  );
}

// ---- obrazovka 5 · oznamy a práca ----
function ObrOznamy({ oznamy, praca, mestoText }: { oznamy: TestProfil["oznamy"]; praca: TestProfil["praca"]; mestoText: string }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={nadpisSekcie}>Oznamy a práca · v {mestoText}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Príď medzi nás</div>
      {oznamy.map((o) => (
        <div key={o.id} style={{ ...karta, display: "grid", gridTemplateColumns: "48px 1fr", gap: 12, padding: 14 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800 }}>{o.den}</div><div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink4)" }}>{o.mesiac}</div></div>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: o.druh === "vyzva" ? "var(--green)" : "var(--ink4)" }}>{o.stitok}</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{o.nadpis}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>{o.text}</div>
          </div>
        </div>
      ))}
      {praca.map((p) => (
        <div key={p.id} style={{ ...karta, display: "grid", gridTemplateColumns: "48px 1fr", gap: 12, padding: 14 }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800 }}>{p.den}</div><div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink4)" }}>{p.mesiac}</div></div>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink4)" }}>HĽADÁME · {p.druh === "brigadnik" ? "BRIGÁDNIK" : "ZAMESTNANEC"}</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{p.nazov}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>{p.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- obrazovka 6 · koniec ----
function ObrKoniec({ profil, mestoText, onPodpor }: { profil: TestProfil; mestoText: string; onPodpor: () => void }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>Presvedčili ťa?</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>Ak áno, vyber{window.matchMedia("(max-width: 759px)").matches ? " nižšie" : " vpravo"}, ako blízko chceš vidieť. Ak nie, žiadny problém, v {mestoText} pomáhajú aj iní.</div>
      <button {...pressable()} onClick={onPodpor} style={{ minHeight: 48, borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Áno, podporím</button>
      <button {...pressable()} style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Ďalšia charita v {mestoText} ›</button>
      <div style={{ ...karta, padding: 16 }}><Overenie p={profil} /></div>
    </div>
  );
}

function Prazdne({ mestoText }: { mestoText: string }) {
  return <div style={{ ...karta, padding: 18, fontSize: 13, color: "var(--ink4)", textAlign: "center" }}>V {mestoText} tu zatiaľ nič nie je.</div>;
}
