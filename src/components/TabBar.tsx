import { otvorPomoc } from "@/features/profil/Pomoc";
import { useState } from "react";
import { C, GRAD, glassTmavy, SPACE, RADIUS } from "@/theme";
import { IkonaDomov, IkonaSrdceLine, IkonaCharita, IkonaKompas, IkonaMapa, IkonaPohar, IkonaOsoba, IkonaPenazenka, IkonaPlus, IkonaSlnko, IkonaMesiac, IkonaInstitucia, IkonaGraf } from "@/shared";
import { pressable } from "@/components/pressable";
import { Sheet } from "@/components/sheet";
import { Hmat } from "@/components/ui";
import { toast } from "@/components/toast";
import { signOut } from "@/lib/auth";
import { useInstall } from "@/lib/pwa";
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
  { id: "good",    nazov: "Domov",   ikona: <IkonaDomov />,    popis: "Feed skutkov v okolí" },
  { id: "help",    nazov: "Help",    ikona: <IkonaSrdceLine />, popis: "Crowdfunding pre ľudí v núdzi" },
  { id: "charita", nazov: "Charita", ikona: <IkonaCharita />,  popis: "Zbierky, dobrovoľníctvo, adresár OZ" },
  { id: "nabozenstvo", nazov: "Viera", ikona: <IkonaInstitucia />, popis: "Adresár kostolov a farností · registrované cirkvi SR" },
  { id: "vyzva",   nazov: "Aktivity", ikona: <IkonaKompas />,  popis: "Skutky, talenty, workshopy a pomoc v okolí" },
  { id: "mapa",    nazov: "Mapa",    ikona: <IkonaMapa />,     popis: "Pomoc a skutky v okolí" },
  { id: "top",     nazov: "Top",     ikona: <IkonaPohar />,    popis: "Rebríčky darcov a hrdinov" },
  { id: "skore",   nazov: "AI Skóre", ikona: <IkonaGraf />,    popis: "Test hodnotenia skutkov — reálny Opus (kalibrácia)" },
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
    <nav aria-label="Hlavné moduly" style={{ position: "absolute", left: 0, right: 0, bottom: "calc(10px + env(safe-area-inset-bottom, 0px))", zIndex: 40, display: "flex", justifyContent: "center", padding: `0 ${SPACE.sm}px` }}>
      <div style={{
        width: "100%", maxWidth: wide ? 620 : "none",
        display: "flex", alignItems: "stretch", borderRadius: RADIUS.xl, padding: `${SPACE.xs}px ${SPACE.xxs}px`,
        ...glassTmavy(24, .62),
        boxShadow: "0 16px 44px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)",
      }}>
        {taby.map((id) => <Tab key={id} m={modul(id)} on={aktivny === id} onClick={() => onModul(id)} />)}
      </div>
    </nav>
  );
}

// ---- PLÁVAJÚCE „+ Pridať" — sticky primárna akcia aktuálnej stránky, nad spodným dokom ----
// (predtým bolo „Pridať" v hornej sekcii skratiek; teraz je dole ako jeden výrazný FAB)
export function PridatFAB({ akcia, wide, desktop }: { akcia: StrankaAkcia; wide?: boolean; desktop?: boolean }) {
  // pasívny divák-darca nesmie tvoriť → klik otvorí upgrade panel namiesto add-screenu
  const { gate } = useTvorbaGate();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: desktop ? 28 : "calc(100px + env(safe-area-inset-bottom, 0px))", zIndex: 41, display: "flex", justifyContent: "center", padding: `0 ${SPACE.lg}px`, pointerEvents: "none" }}>
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
        background: on ? "linear-gradient(135deg, color-mix(in srgb, var(--a-green) 30%, transparent), color-mix(in srgb, var(--a-teal) 24%, transparent))" : "transparent",
        border: on ? "1px solid color-mix(in srgb, var(--a-green) 40%, transparent)" : "1px solid transparent",
        boxShadow: on ? "0 4px 16px color-mix(in srgb, var(--a-green) 35%, transparent)" : "none",
        color: on ? C.text : C.textSec,
      }}>{m?.ikona}</div>
      <span style={{ fontSize: 11.5, fontWeight: on ? 800 : 600, color: on ? C.greenL : C.textSec, letterSpacing: ".01em", transition: "color .25s ease" }}>{m?.nazov}</span>
    </div>
  );
}

// ---- SHEET: VŠETKY MODULY + ÚPRAVA MENU ----
export function ViacSheet({ taby, setTaby, aktivny, onModul, onPenazenka, onAko, onClose, moduly = VSETKY_MODULY, strankaAkcie, strankaFiltre }: {
  taby: string[];
  setTaby: (taby: string[]) => void;
  aktivny: string;
  onModul: (id: string) => void;
  onPenazenka?: () => void;
  /** otvorí sprievodcu „Ako DEED funguje" */
  onAko?: () => void;
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
    // TOP sheet cez Vaul (focus-trap + Escape + drag-to-dismiss + ARIA dialog) — zhodný smer s notifikačným panelom
    <Sheet direction="top" onClose={onClose} label="Moduly a menu">
        <div style={{ display: "flex", alignItems: "center", marginBottom: SPACE.sm }}>
          <span style={{ fontSize: 17, fontWeight: 800 }}>Moduly</span>
          <span {...pressable(() => setUprava(!uprava), uprava ? "Hotovo — ukončiť úpravu menu" : "Upraviť menu")} style={{
            marginLeft: "auto", fontSize: 12, fontWeight: 700, cursor: "pointer", borderRadius: RADIUS.md, padding: `${SPACE.xxs}px ${SPACE.gutter}px`,
            background: uprava ? GRAD : "rgba(var(--glass-rgb),.05)",
            border: uprava ? "1px solid transparent" : "1px solid color-mix(in srgb, var(--a-info) 40%, transparent)",
            color: uprava ? "#fff" : C.blueL,
            boxShadow: uprava ? "0 6px 18px color-mix(in srgb, var(--a-green) 35%, transparent)" : "none",
          }}>
            {uprava ? "✓ Hotovo" : "✎ Upraviť menu"}
          </span>
        </div>

        {uprava && (
          <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.45, marginBottom: SPACE.sm, background: "color-mix(in srgb, var(--a-info) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--a-info) 22%, transparent)", borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px` }}>
            Pripni si do spodného menu max {MAX_TABOV} moduly. Šípkami ⌃⌄ meníš poradie. Ukladá sa automaticky.
          </div>
        )}

        {/* NA TEJTO STRÁNKE — kontextové prepínače (domény, sub-záložky) + akcie (Ukáž talent, Nástenka…) */}
        {!uprava && (strankaFiltre || (strankaAkcie && strankaAkcie.length > 0)) && (
          <div style={{ marginBottom: SPACE.sm }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: `${SPACE.xxs}px ${SPACE.xxs}px ${SPACE.xs}px` }}>NA TEJTO STRÁNKE</div>
            {strankaFiltre && <div style={{ marginBottom: strankaAkcie && strankaAkcie.length ? 10 : 0 }}>{strankaFiltre}</div>}
            {(strankaAkcie || []).map((a) => (
              <div key={a.id} {...pressable(() => { a.onClick(); onClose(); }, a.label)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
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
          <div {...pressable(onPenazenka, "Peňaženka — zostatok DEED, poslať / prijať / kúpiť")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "color-mix(in srgb, var(--a-info) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--a-info) 30%, transparent)", borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
            <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: "color-mix(in srgb, var(--a-info) 16%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", color: "var(--a-info)" }}><IkonaPenazenka size={20} color="var(--a-info)" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Peňaženka <span style={{ fontSize: 9, fontWeight: 700, color: "var(--a-info)", border: "1px solid color-mix(in srgb, var(--a-info) 40%, transparent)", background: "color-mix(in srgb, var(--a-info) 10%, transparent)", borderRadius: RADIUS.sm, padding: "1px 7px", marginLeft: SPACE.xxs }}>súkromné</span></div>
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
              {...(uprava ? {} : pressable(() => onModul(m.id), `${m.nazov} — ${m.popis}`))}
              style={{ display: "flex", alignItems: "center", gap: SPACE.sm,
                background: zvyrazneny ? "color-mix(in srgb, var(--a-info) 10%, transparent)" : "rgba(var(--glass-rgb),.04)",
                border: `1px solid ${zvyrazneny ? "color-mix(in srgb, var(--a-info) 45%, transparent)" : C.line}`,
                boxShadow: zvyrazneny ? "0 0 18px color-mix(in srgb, var(--a-info) 12%, transparent)" : "none",
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
                      <SipkaBtn aktivna={poradie > 0} onClick={() => posun(m.id, -1)} label={`Posunúť ${m.nazov} vyššie`}>⌃</SipkaBtn>
                      <SipkaBtn aktivna={poradie < taby.length - 1} onClick={() => posun(m.id, 1)} label={`Posunúť ${m.nazov} nižšie`}>⌄</SipkaBtn>
                    </>
                  )}
                  <span {...pressable(() => prepni(m.id), `${pripnuty ? "Odopnúť" : "Pripnúť"} ${m.nazov}`)} style={{ position: "relative", fontSize: 11, fontWeight: 700, cursor: "pointer", borderRadius: RADIUS.md, padding: `${SPACE.xxs}px ${SPACE.sm}px`, border: `1px solid ${pripnuty ? "rgba(242,112,111,.45)" : "color-mix(in srgb, var(--a-info) 45%, transparent)"}`, color: pripnuty ? "#F2A2A2" : C.blueL, background: pripnuty ? "rgba(242,112,111,.08)" : "color-mix(in srgb, var(--a-info) 8%, transparent)" }}>
                    <Hmat o={7} />
                    {pripnuty ? "odopnúť" : "＋ pripnúť"}
                  </span>
                </div>
              ) : (
                <span style={{ color: C.textTer, fontSize: 15 }}>›</span>
              )}
            </div>
          );
        })}

        {/* POMOC — Časté otázky (OPRAVY 51) · sprievodca „Ako DEED funguje" · inštalácia na plochu */}
        {!uprava && (
          <>
            <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: `${SPACE.gutter}px ${SPACE.xxs}px ${SPACE.xs}px` }}>POMOC</div>
            <div {...pressable(() => { onClose(); otvorPomoc(); }, "Pomoc — časté otázky")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginBottom: SPACE.xs, cursor: "pointer" }}>
              <span aria-hidden style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: "color-mix(in srgb, var(--a-green) 12%, transparent)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", color: "var(--a-green)" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.7-2.5 2.2-2.5 3.8M12 17h.01" /></svg></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Pomoc</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>časté otázky, napísať podpore</div>
              </div>
              <span style={{ color: C.textTer, fontSize: 15 }}>›</span>
            </div>
          </>
        )}
        {!uprava && onAko && (
          <>
            <div {...pressable(onAko, "Ako DEED funguje — krátky sprievodca")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, cursor: "pointer" }}>
              <span aria-hidden style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: "color-mix(in srgb, var(--a-green) 12%, transparent)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flex: "0 0 auto" }}>🌱</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Ako DEED funguje</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>Skutky bez komentárov · okruh · karma a overovanie</div>
              </div>
              <span style={{ color: C.textTer, fontSize: 15 }}>›</span>
            </div>
            <InstallRiadok />
          </>
        )}

        {/* VZHĽAD — prepínač svetlého/tmavého režimu (presunutý sem z hlavičky/sidebaru) */}
        {!uprava && (
          <>
            <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: `${SPACE.gutter}px ${SPACE.xxs}px ${SPACE.xs}px` }}>VZHĽAD</div>
            <div {...pressable(prepniRezim, svetly ? "Prepnúť na tmavý režim" : "Prepnúť na svetlý režim")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, cursor: "pointer" }}>
              <span style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.07)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", color: C.textSec }}>{svetly ? <IkonaMesiac size={19} color={C.textSec} /> : <IkonaSlnko size={19} color={C.textSec} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Režim zobrazenia</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>{svetly ? "Svetlý — ťukni pre tmavý" : "Tmavý — ťukni pre svetlý"}</div>
              </div>
              <span style={{ flex: "0 0 auto", fontSize: 11.5, fontWeight: 700, color: C.blueL, border: "1px solid color-mix(in srgb, var(--a-info) 45%, transparent)", background: "color-mix(in srgb, var(--a-info) 8%, transparent)", borderRadius: RADIUS.md, padding: `${SPACE.xxs}px ${SPACE.sm}px` }}>{svetly ? "Tmavý" : "Svetlý"}</span>
            </div>
          </>
        )}

        {/* ÚČET — odhlásenie (úplne dole v menu) */}
        {!uprava && (
          <>
            <div style={{ fontSize: 10.5, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: `${SPACE.gutter}px ${SPACE.xxs}px ${SPACE.xs}px` }}>ÚČET</div>
            <button onClick={() => { toast("Odhlásené"); onClose(); void signOut(); }} style={{ width: "100%", height: 46, borderRadius: RADIUS.md, border: "1px solid rgba(242,112,111,.4)", background: "rgba(242,112,111,.08)", color: "var(--a-danger)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              Odhlásiť sa
            </button>
          </>
        )}

        {hint && <div role="status" style={{ fontSize: 11.5, color: "#F2A2A2", textAlign: "center", marginTop: SPACE.xxs }}>{hint}</div>}
    </Sheet>
  );
}

// ---- „Pridať na plochu" — install prompt (Android/desktop) alebo iOS návod ----
function InstallRiadok() {
  const { dostupny, ios, instaluj } = useInstall();
  if (!dostupny && !ios) return null; // už nainštalované / prehliadač nepodporuje
  const klik = dostupny
    ? instaluj
    : () => toast("iPhone/iPad: v Safari ťukni Zdieľať (□↑) a vyber Pridať na plochu.");
  return (
    <div {...pressable(klik, "Pridať DEED na plochu")} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.sm}px`, marginTop: SPACE.xs, cursor: "pointer" }}>
      <span aria-hidden style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: "color-mix(in srgb, var(--a-info) 12%, transparent)", border: `1px solid ${C.line2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flex: "0 0 auto" }}>📲</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Pridať na plochu</div>
        <div style={{ fontSize: 11, color: C.textTer, marginTop: SPACE.xxs }}>{dostupny ? "Nainštaluj DEED ako appku — rýchly štart z plochy" : "Návod pre iPhone/iPad (Safari)"}</div>
      </div>
      <span style={{ color: C.textTer, fontSize: 15 }}>›</span>
    </div>
  );
}

function SipkaBtn({ aktivna, onClick, label, children }: { aktivna: boolean; onClick: () => void; label?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={aktivna ? onClick : undefined} disabled={!aktivna} aria-label={label}
      style={{ position: "relative", width: 28, height: 28, borderRadius: 9, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: "inherit", padding: 0, cursor: aktivna ? "pointer" : "default", color: aktivna ? C.text : C.textTer, background: "rgba(var(--glass-rgb),.06)" }}>
      {aktivna && <Hmat o={8} />}
      {children}
    </button>
  );
}
