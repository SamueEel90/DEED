import { useState } from "react";
import { C, GRAD, glassTmavy } from "@/theme";
import { IkonaDomov, IkonaSrdceLine, IkonaCharita, IkonaKompas, IkonaMapa, IkonaPohar, IkonaOsoba, IkonaPenazenka } from "@/shared";
import { pressable } from "@/components/pressable";

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
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 10, zIndex: 40, display: "flex", justifyContent: "center", padding: "0 10px" }}>
      <div style={{
        width: "100%", maxWidth: wide ? 620 : "none",
        display: "flex", alignItems: "stretch", borderRadius: 26, padding: "9px 6px",
        ...glassTmavy(24, .62),
        boxShadow: "0 16px 44px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)",
      }}>
        {taby.map((id) => <Tab key={id} m={modul(id)} on={aktivny === id} onClick={() => onModul(id)} />)}
      </div>
    </div>
  );
}

function Tab({ m, on, onClick }: { m?: Modul; on: boolean; onClick: () => void }) {
  return (
    <div {...pressable(onClick, m?.nazov)} aria-current={on ? "page" : undefined} className="dock-tab" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: "4px 0 3px" }}>
      <div className="dock-icon" style={{
        width: 50, height: 32, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
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
export function ViacSheet({ taby, setTaby, aktivny, onModul, onPenazenka, onClose, moduly = VSETKY_MODULY }: {
  taby: string[];
  setTaby: (taby: string[]) => void;
  aktivny: string;
  onModul: (id: string) => void;
  onPenazenka?: () => void;
  onClose: () => void;
  moduly?: Modul[];
}) {
  const [uprava, setUprava] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

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
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", zIndex: 70, animation: "fadeUp .2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxHeight: "85%", overflowY: "auto", ...glassTmavy(26, .82), borderBottom: "none", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: "6px 16px 18px", boxShadow: "0 -18px 60px rgba(0,0,0,.5)" }}>
        <div style={{ width: 42, height: 4, borderRadius: 3, background: "rgba(var(--glass-rgb),.22)", margin: "10px auto 14px" }} />
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>Moduly</span>
          <span onClick={() => setUprava(!uprava)} style={{
            marginLeft: "auto", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: 18, padding: "6px 14px",
            background: uprava ? GRAD : "rgba(255,255,255,.05)",
            border: uprava ? "1px solid transparent" : "1px solid rgba(116,166,255,.4)",
            color: uprava ? "#fff" : C.blueL,
            boxShadow: uprava ? "0 6px 18px rgba(99,134,255,.35)" : "none",
          }}>
            {uprava ? "✓ Hotovo" : "✎ Upraviť menu"}
          </span>
        </div>

        {uprava && (
          <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.45, marginBottom: 12, background: "rgba(91,155,255,.07)", border: "1px solid rgba(91,155,255,.22)", borderRadius: 12, padding: "9px 12px" }}>
            Pripni si do spodného menu max {MAX_TABOV} moduly. Šípkami ⌃⌄ meníš poradie. Ukladá sa automaticky.
          </div>
        )}

        {/* Peňaženka — 1. položka v menu (súkromie: cudzí nevidí zostatok na hlavnej obrazovke) */}
        {!uprava && onPenazenka && (
          <div onClick={onPenazenka} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(91,168,240,.08)", border: "1px solid rgba(91,168,240,.3)", borderRadius: 15, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(91,168,240,.16)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", color: "var(--a-info)" }}><IkonaPenazenka size={20} color="var(--a-info)" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Peňaženka <span style={{ fontSize: 9, fontWeight: 700, color: "var(--a-info)", border: "1px solid rgba(91,168,240,.4)", background: "rgba(91,168,240,.1)", borderRadius: 10, padding: "1px 7px", marginLeft: 4 }}>súkromné</span></div>
              <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>Zostatok DEED · poslať / prijať / kúpiť</div>
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
              style={{ display: "flex", alignItems: "center", gap: 12,
                background: zvyrazneny ? "rgba(91,155,255,.1)" : "rgba(255,255,255,.04)",
                border: `1px solid ${zvyrazneny ? "rgba(116,166,255,.45)" : C.line}`,
                boxShadow: zvyrazneny ? "0 0 18px rgba(91,155,255,.12)" : "none",
                borderRadius: 15, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(var(--glass-rgb),.07)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flex: "0 0 auto" }}>{m.ikona}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{m.nazov} {pripnuty && <span style={{ fontSize: 9, fontWeight: 700, color: C.greenL, border: "1px solid rgba(92,230,184,.35)", background: "rgba(92,230,184,.08)", borderRadius: 10, padding: "1px 7px", marginLeft: 4 }}>v menu{uprava ? ` · ${poradie + 1}.` : ""}</span>}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>{m.popis}</div>
              </div>
              {uprava ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }} onClick={(e) => e.stopPropagation()}>
                  {pripnuty && (
                    <>
                      <SipkaBtn aktivna={poradie > 0} onClick={() => posun(m.id, -1)}>⌃</SipkaBtn>
                      <SipkaBtn aktivna={poradie < taby.length - 1} onClick={() => posun(m.id, 1)}>⌄</SipkaBtn>
                    </>
                  )}
                  <span onClick={() => prepni(m.id)} style={{ fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: 14, padding: "6px 11px", border: `1px solid ${pripnuty ? "rgba(242,112,111,.45)" : "rgba(116,166,255,.45)"}`, color: pripnuty ? "#F2A2A2" : C.blueL, background: pripnuty ? "rgba(242,112,111,.08)" : "rgba(91,155,255,.08)" }}>
                    {pripnuty ? "odopnúť" : "＋ pripnúť"}
                  </span>
                </div>
              ) : (
                <span style={{ color: C.textTer, fontSize: 15 }}>›</span>
              )}
            </div>
          );
        })}

        {hint && <div style={{ fontSize: 11.5, color: "#F2A2A2", textAlign: "center", marginTop: 4 }}>{hint}</div>}
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
