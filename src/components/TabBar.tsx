import { useState } from "react";
import { C, GRAD, glassTmavy, SPACE, RADIUS } from "@/theme";
import { IkonaDomov, IkonaSrdceLine, IkonaCharita, IkonaKompas, IkonaMapa, IkonaPohar, IkonaOsoba, IkonaPenazenka, IkonaPlus, IkonaSlnko, IkonaMesiac } from "@/shared";
import { pressable } from "@/components/pressable";
import { useTvorbaGate } from "@/components/upgrade";
import { useMotiv } from "@/components/context";
import type { ReactNode } from "react";
import type { StrankaAkcia } from "@/components/context";

/*
  ============================================================
  DEED Aura — MODULÁRNE SPODNÉ MENU (plávajúci glass dock)
  - registr modulov, max 5 pripnutých tabov + "Viac"
  - výber/poradie tabov si user upraví v sheet-e, uloží sa do localStorage
  ============================================================
*/

export type Modul = {
  id: string;
  nazov: string;
  ikona: React.ReactNode;
  popis: string;
};

export const VSETKY_MODULY: Modul[] = [
  { id: "good",    nazov: "Domov",   ikona: <IkonaDomov />,    popis: "Feed skutkov — DEED Good" },
  { id: "help",    nazov: "Help",    ikona: <IkonaSrdceLine />, popis: "Crowdfunding pre ľudí v núdzi" },
  { id: "charita", nazov: "Charita", ikona: <IkonaCharita />,  popis: "Zbierky, dobrovoľníctvo, adresár OZ" },
  { id: "vyzva",   nazov: "Aktivity", ikona: <IkonaKompas />,  popis: "Skutky, talenty, workshopy a pomoc v okolí" },
  { id: "mapa",    nazov: "Mapa",    ikona: <IkonaMapa />,     popis: "Pomoc a skutky v okolí" },
  { id: "top",     nazov: "Top",     ikona: <IkonaPohar />,    popis: "Rebríčky darcov a hrdinov" },
  { id: "profil",  nazov: "Profil",  ikona: <IkonaOsoba />,    popis: "Karma, peňaženka, nastavenia" },
];

const DEFAULT_TABY = ["good", "vyzva", "help", "charita", "profil"];
const KLUC = "deed.taby.v2";
export const MAX_TABOV = 5;

export function nacitajTaby(): string[] {
  try {
    const ulozene = JSON.parse(localStorage.getItem(KLUC) ?? "null");
    if (Array.isArray(ulozene) && ulozene.length &&
        ulozene.every((id) => VSETKY_MODULY.some((m) => m.id === id))) {
      return ulozene.slice(0, MAX_TABOV);
    }
  } catch { /* prvé spustenie / poškodené dáta */ }
  return DEFAULT_TABY;
}

export function ulozTaby(taby: string[]) {
  try { localStorage.setItem(KLUC, JSON.stringify(taby)); } catch { /* napr. private mode */ }
}

const modul = (id: string) => VSETKY_MODULY.find((m) => m.id === id);

// ---- PLÁVAJÚCI GLASS DOCK ----
// „Viac" sa presunulo do hamburger menu (☰) vľavo hore v hlavičke modulu
export function TabBar({ taby, aktivny, onModul, wide }: {
  taby: string[];
  aktivny: string;
  onModul: (id: string) => void;
  wide?: boolean;
}) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, zIndex: 40, display: "flex", justifyContent: "center", padding: `0 ${SPACE.sm}px` }}>
      <div style={{
        width: "100%", maxWidth: wide ? 620 : "none",
        display: "flex", alignItems: "stretch", borderRadius: RADIUS.xl, padding: `${SPACE.xs}px ${SPACE.xxs}px`,
        ...glassTmavy(24, .62),
        boxShadow: "0 16px 44px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)",
      }}>
        {taby.map((id) => <Tab key={id} m={modul(id)} on={aktivny === id} onClick={() => onModul(id)} />)}
      </div>
    </div>
  );
}

// ---- PLÁVAJÚCE „+ Pridať" — sticky primárna akcia aktuálnej stránky, nad spodným dokom ----
// (predtým bolo „Pridať" v hornej sekcii skratiek; teraz je dole ako jeden výrazný FAB)
export function PridatFAB({ akcia, wide, desktop }: { akcia: StrankaAkcia; wide?: boolean; desktop?: boolean }) {
  // pasívny divák-darca nesmie tvoriť → klik otvorí upgrade panel namiesto add-screenu
  const { gate } = useTvorbaGate();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: desktop ? 28 : 100, zIndex: 41, display: "flex", justifyContent: "center", padding: `0 ${SPACE.lg}px`, pointerEvents: "none" }}>
      <div style={{ width: "100%", maxWidth: desktop ? "none" : wide ? 620 : "none", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={gate(akcia.onClick)} aria-label={akcia.label} title={akcia.label} style={{
          pointerEvents: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 58, height: 58,
          borderRadius: RADIUS.round, border: "none", cursor: "pointer", color: "#fff",
          background: GRAD, boxShadow: "0 12px 30px rgba(78,122,62,.5), inset 0 1px 0 rgba(255,255,255,.28)", transition: "transform .15s ease",
        }}>
          <IkonaPlus size={26} color="#fff" />
        </button>
      </div>
    </div>
  );
}

function Tab({ m, on, onClick }: { m?: Modul; on: boolean; onClick: () => void }) {
  return (
    <div {...pressable(onClick, m?.nazov)} aria-current={on ? "page" : undefined} className="dock-tab" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.xxs, cursor: "pointer", padding: `${SPACE.xxs}px 0 ${SPACE.xxs}px` }}>
      <div className="dock-icon" style={{
        width: 50, height: 32, borderRadius: RADIUS.md, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 21, lineHeight: 1, transition: "transform .25s cubic-bezier(.34,1.56,.64,1), background .25s ease, box-shadow .25s ease, filter .25s ease",
        background: on ? "linear-gradient(135deg, rgba(91,155,255,.32), rgba(139,124,255,.26))" : "transparent",
        border: on ? "1px solid rgba(116,166,255,.4)" : "1px solid transparent",
        boxShadow: on ? "0 4px 16px rgba(91,124,255,.35)" : "none",
        color: on ? C.text : C.textSec,
      }}>{m?.ikona}</div>
      <span style={{ fontSize: 11.5, fontWeight: on ? 800 : 600, color: on ? C.blueL : C.textSec, letterSpacing: ".01em", transition: "color .25s ease" }}>{m?.nazov}</span>
    </div>
  );
}

// ---- SHEET: VŠETKY MODULY + ÚPRAVA MENU ----
export function ViacSheet({ taby, setTaby, aktivny, onModul, onPenazenka, onClose, moduly = VSETKY_MODULY, strankaAkcie, strankaFiltre }: {
  taby: string[];
  setTaby: (taby: string[]) => void;
  aktivny: string;
  onModul: (id: string) => void;
  onPenazenka?: () => void;
  onClose: () => void;
  moduly?: Modul[];
  strankaAkcie?: StrankaAkcia[];
  strankaFiltre?: ReactNode;
}) {
  const [uprava, setUprava] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const { svetly, prepni: prepniRezim } = useMotiv();

  function prepni(id: string) {
    if (taby.includes(id)) {
      if (taby.length === 1) { setHint("V menu musí ostať aspoň 1 modul."); return; }
      setTaby(taby.filter((t) => t !== id));
    } else {
      if (taby.length >= MAX_TABOV) { setHint(`Max ${MAX_TABOV} moduly v menu — najprv jeden odopni.`); return; }
      setTaby([...taby, id]);
    }
    setHint(null);
  }

  function posun(id: string, smer: number) {
    const i = taby.indexOf(id);
    const j = i + smer;
    if (i < 0 || j < 0 || j >= taby.length) return;
    const nove = [...taby];
    [nove[i], nove[j]] = [nove[j], nove[i]];
    setTaby(nove);
  }

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", zIndex: 70, animation: "fadeUp .2s ease" }}>
      {/* TOP sheet — rozbalí sa zhora (zhodne s notifikačným panelom) */}
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "88%", overflowY: "auto", ...glassTmavy(26, .82), borderTop: "none", borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl, padding: `${SPACE.gutter}px ${SPACE.md}px ${SPACE.md}px`, boxShadow: "0 18px 60px rgba(0,0,0,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: SPACE.sm }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>Moduly</span>
          <span onClick={() => setUprava(!uprava)} style={{
            marginLeft: "auto", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: RADIUS.md, padding: `${SPACE.xxs}px ${SPACE.gutter}px`,
            background: uprava ? GRAD : "rgba(255,255,255,.05)",
            border: uprava ? "1px solid transparent" : "1px solid rgba(116,166,255,.4)",
            color: uprava ? "#fff" : C.blueL,
            boxShadow: uprava ? "0 6px 18px rgba(99,134,255,.35)" : "none",
          }}>
            {uprava ? "✓ Hotovo" : "✎ Upraviť menu"}
          </span>
        </div>

        {uprava && (
          <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.45, marginBottom: SPACE.sm, background: "rgba(91,155,255,.07)", border: "1px solid rgba(91,155,255,.22)", borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px` }}>
            Pripni si do spodného menu max {MAX_TABOV} moduly. Šípkami ⌃⌄ meníš poradie. Ukladá sa automaticky.
          </div>
        )}

        {/* NA TEJTO STRÁNKE — kontextové prepínače (domény, sub-záložky) + akcie (Ukáž talent, Nástenka…) */}
        {!uprava && (strankaFiltre || (strankaAkcie && strankaAkcie.length > 0)) && (
          <div style={{ marginBottom: SPACE.sm }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: `${SPACE.xxs}px ${SPACE.xxs}px ${SPACE.xs}px` }}>NA TEJTO STRÁNKE</div>
            {strankaFiltre && <div style={{ marginBottom: strankaAkcie && strankaAkcie.length ? 10 : 0 }}>{strankaFiltre}</div>}
            {(strankaAkcie || []).map((a) => (
              <div key={a.id} onClick={() => { a.onClick(); onClose(); }} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
                <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: "rgba(78,122,62,.12)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", color: "var(--a-green)" }}>{a.ikona}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.label}</div>
                  {a.popis && <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>{a.popis}</div>}
                </div>
                <span style={{ color: C.textTer, fontSize: 15 }}>›</span>
              </div>
            ))}
          </div>
        )}

        {/* Peňaženka — 1. položka v menu (súkromie: cudzí nevidí zostatok na hlavnej obrazovke) */}
        {!uprava && onPenazenka && (
          <div onClick={onPenazenka} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(91,168,240,.08)", border: "1px solid rgba(91,168,240,.3)", borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
            <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: "rgba(91,168,240,.16)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", color: "var(--a-info)" }}><IkonaPenazenka size={20} color="var(--a-info)" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Peňaženka <span style={{ fontSize: 9, fontWeight: 700, color: "var(--a-info)", border: "1px solid rgba(91,168,240,.4)", background: "rgba(91,168,240,.1)", borderRadius: RADIUS.sm, padding: "1px 7px", marginLeft: SPACE.xxs }}>súkromné</span></div>
              <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>Zostatok DEED · poslať / prijať / kúpiť</div>
            </div>
            <span style={{ color: C.textTer, fontSize: 15 }}>›</span>
          </div>
        )}

        {moduly.map((m) => {
          const pripnuty = taby.includes(m.id);
          const poradie = taby.indexOf(m.id);
          const zvyrazneny = aktivny === m.id && !uprava;
          return (
            <div key={m.id}
              onClick={() => !uprava && onModul(m.id)}
              style={{ display: "flex", alignItems: "center", gap: SPACE.sm,
                background: zvyrazneny ? "rgba(91,155,255,.1)" : "rgba(255,255,255,.04)",
                border: `1px solid ${zvyrazneny ? "rgba(116,166,255,.45)" : C.line}`,
                boxShadow: zvyrazneny ? "0 0 18px rgba(91,155,255,.12)" : "none",
                borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
              <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.07)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flex: "0 0 auto" }}>{m.ikona}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{m.nazov} {pripnuty && <span style={{ fontSize: 9, fontWeight: 700, color: C.greenL, border: "1px solid rgba(92,230,184,.35)", background: "rgba(92,230,184,.08)", borderRadius: RADIUS.sm, padding: "1px 7px", marginLeft: SPACE.xxs }}>v menu{uprava ? ` · ${poradie + 1}.` : ""}</span>}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>{m.popis}</div>
              </div>
              {uprava ? (
                <div style={{ display: "flex", alignItems: "center", gap: SPACE.xxs, flex: "0 0 auto" }} onClick={(e) => e.stopPropagation()}>
                  {pripnuty && (
                    <>
                      <SipkaBtn aktivna={poradie > 0} onClick={() => posun(m.id, -1)}>⌃</SipkaBtn>
                      <SipkaBtn aktivna={poradie < taby.length - 1} onClick={() => posun(m.id, 1)}>⌄</SipkaBtn>
                    </>
                  )}
                  <span onClick={() => prepni(m.id)} style={{ fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: RADIUS.md, padding: `${SPACE.xxs}px ${SPACE.sm}px`, border: `1px solid ${pripnuty ? "rgba(242,112,111,.45)" : "rgba(116,166,255,.45)"}`, color: pripnuty ? "#F2A2A2" : C.blueL, background: pripnuty ? "rgba(242,112,111,.08)" : "rgba(91,155,255,.08)" }}>
                    {pripnuty ? "odopnúť" : "＋ pripnúť"}
                  </span>
                </div>
              ) : (
                <span style={{ color: C.textTer, fontSize: 15 }}>›</span>
              )}
            </div>
          );
        })}

        {/* VZHĽAD — prepínač svetlého/tmavého režimu (presunutý sem z hlavičky/sidebaru) */}
        {!uprava && (
          <>
            <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: `${SPACE.gutter}px ${SPACE.xxs}px ${SPACE.xs}px` }}>VZHĽAD</div>
            <div onClick={prepniRezim} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, cursor: "pointer" }}>
              <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.07)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", color: C.textSec }}>{svetly ? <IkonaMesiac size={19} color={C.textSec} /> : <IkonaSlnko size={19} color={C.textSec} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Režim zobrazenia</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>{svetly ? "Svetlý — ťukni pre tmavý" : "Tmavý — ťukni pre svetlý"}</div>
              </div>
              <span style={{ flex: "0 0 auto", fontSize: 11.5, fontWeight: 700, color: C.blueL, border: "1px solid rgba(116,166,255,.45)", background: "rgba(91,155,255,.08)", borderRadius: RADIUS.md, padding: `${SPACE.xxs}px ${SPACE.sm}px` }}>{svetly ? "Tmavý" : "Svetlý"}</span>
            </div>
          </>
        )}

        {hint && <div style={{ fontSize: 11.5, color: "#F2A2A2", textAlign: "center", marginTop: SPACE.xxs }}>{hint}</div>}
      </div>
    </div>
  );
}

function SipkaBtn({ aktivna, onClick, children }: { aktivna: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <span onClick={aktivna ? onClick : undefined}
      style={{ width: 28, height: 28, borderRadius: 9, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: aktivna ? "pointer" : "default", color: aktivna ? C.text : C.textTer, background: "rgba(var(--glass-rgb),.06)" }}>
      {children}
    </span>
  );
}
