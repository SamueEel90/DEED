// <ZbierkaModul> — JEDEN komponent pre detail zbierky + platbu na všetkých miestach (karta 01).
// Zatiaľ len kostra: pripojené položky sú rámy v pevnom poradí. Vzhľad každej položky
// prichádza postupne s kartami 02–15. Odpojené položky sa nevykresľujú vôbec.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type React from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Switch } from "@/shared";
import { pressable } from "@/components/pressable";
import { jeNeregistrovany, nastavNeregistrovany, darujemAkoFirma, nastavDarcuFirmu, sledujDarcu } from "@/lib/devDarca";
import { pridajDar } from "@/lib/darcovia";
import { dorovnanieNaDar, dorovnanieKDaru, useZmenyDorovnani } from "@/lib/dorovnanie";
import { MIESTA, NAZVY, POLOZKY, pripojene, type Miesto, type Kontext, type Hodnota } from "./nastavenie";
import { Hlavicka, Galeria, NadpisText, type Medium } from "./Vrch";
import { PoleOrganizacie, type OrgPole } from "./Pole";
import { KartaStavu } from "./KartaStavu";
import { RychleSumyEur, DeedDlazdice, VlastnaSuma, DaryVKrypte, type OtvorPlatbu } from "./Sumy";
import { toast } from "@/components/toast";
import { PlatobneOkno, potvrditTuknutim, nastavPotvrditTuknutim } from "./Platba";
import type { KanalPlatby } from "./Sumy";
import { ZdielatRiadok, PravidelnaRiadok, OblubenePodporit, ZapojitFirmuRiadok, RetazRiadok, KartaDorovnava, Darcovia } from "./Riadky";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import { firmaAkoDarca } from "@/lib/podpory";
import { RecurringSheet } from "@/components/recurring";
import { SplitQrSheet } from "@/components/splitqr";
import { NoveDorovnanieSheet } from "@/features/rola/Dorovnanie";
import { STUPNE, nastavDevTempo, useDevTempo, type Stupen } from "./tempoStupen";
import type { TempoRezim } from "./Tempo";
import type { StavKroku } from "@/lib/cesta";
import "@/styles/platba.css";

export type ZbierkaData = {
  id: string; nazov: string; popis?: string;
  cislo?: number;      // verejné číslo zbierky (#47 821) — len keď ho zbierka má
  overena?: boolean;
  media?: Medium[];    // poradie volí autor (predvolene video prvé)
  organizacia?: OrgPole; // kto za zbierku zodpovedá / kto ju overil (karta 03)
  vyzbierane?: number;   // základ mimo živých darov (karta 04)
  ciel?: number;         // bez cieľa → míľniky
  ludia?: number;
  rychleSumy?: number[];  // € dlaždice — sadu volí charita v nastaveniach zbierky (predvolene 10 / 25 / 50)
};

// ---- DEV simulácia (len lokálne, v produkcii miesto a stav dodá appka) ----
const KLUC_DEV = "deed.dev.zbierkaModul";
type DevStav = { miesto: Miesto; maCiel: boolean; dorovnanie: boolean; split: boolean; tempoSilna: boolean };
const DEV_CIEL = 2200;
const DEV_ZAKLAD: DevStav = { miesto: "charita", maCiel: true, dorovnanie: false, split: false, tempoSilna: false };
function nacitajDev(): DevStav {
  try { const s = localStorage.getItem(KLUC_DEV); return s ? { ...DEV_ZAKLAD, ...JSON.parse(s) } : DEV_ZAKLAD; } catch { return DEV_ZAKLAD; }
}
function ulozDev(v: DevStav) { try { localStorage.setItem(KLUC_DEV, JSON.stringify(v)); } catch { /* LS */ } }

export function ZbierkaModul({ zbierka, miesto: miestoProp, onBack, spatNazov, onZavriet, zoStrankyOrg, onOtvorOrg, stav, onStav }: {
  zbierka: ZbierkaData; miesto?: Miesto; onBack: () => void;
  spatNazov?: string; onZavriet?: () => void;
  /** predošlý krok cesty je stránka tej istej organizácie → pole sa skryje */
  zoStrankyOrg?: boolean;
  onOtvorOrg?: () => void;
  /** rozbalené časti — uložené v kroku cesty, aby ich Späť obnovil */
  stav?: StavKroku; onStav?: (zmena: StavKroku) => void;
}) {
  const [stavLok, setStavLok] = useState<StavKroku>({});
  const st = stav ?? stavLok;
  const zmenStav = (z: StavKroku) => { setStavLok((x) => ({ ...x, ...z })); onStav?.(z); };
  const [dev, setDevRaw] = useState<DevStav>(nacitajDev);
  const setDev = (z: Partial<DevStav>) => setDevRaw((d) => { const n = { ...d, ...z }; ulozDev(n); return n; });
  const [registrovany, setRegistrovany] = useState(() => !jeNeregistrovany());
  const [ico, setIco] = useState(darujemAkoFirma);
  useEffect(() => sledujDarcu(() => { setRegistrovany(!jeNeregistrovany()); setIco(darujemAkoFirma()); }), []);

  const miesto = miestoProp ?? dev.miesto;
  // DEV: prepínač cieľa — zapnutý = skutočný cieľ, a keď ho zbierka nemá, ukážkový 2 200 €; vypnutý = bez cieľa
  const realnyCiel = zbierka.ciel != null && zbierka.ciel > 0 ? zbierka.ciel : null;
  const ciel = dev.maCiel ? (realnyCiel ?? DEV_CIEL) : null;
  const maCiel = ciel != null;
  // dorovnanie = skutočný stav (rovnaký zdroj, ktorý dorovná aj dar) — nie DEV prepínač
  useZmenyDorovnani();
  const dorovnanie = dorovnanieNaDar(zbierka.id);
  const k: Kontext = { registrovany, ico, maCiel, dorovnanieAktivne: !!dorovnanie, split: dev.split, tempoSilna: true /* viditeľnosť rieši TempoDarov (karta 05) */ };
  const tempoRezim = POLOZKY[miesto].tempo as TempoRezim;
  // karta 07 — platobné okno (so sumou rovno na Spôsob, bez sumy od kroku Suma)
  const [platba, setPlatba] = useState<{ kanal: KanalPlatby; suma?: number } | null>(null);
  const otvorPlatbu: OtvorPlatbu = (p) => setPlatba(p);
  // hárky z karty 12 (zatiaľ pôvodné hárky appky — nový vzhľad príde s ich kartami)
  const [harok, setHarok] = useState<"pravidelna" | "firma" | "retaz" | null>(null);
  const polozky = pripojene(miesto, k);

  return (
    <div className="deed-platba" style={{ minHeight: "100%", background: "var(--bg)", color: "var(--ink)", paddingBottom: SPACE.lg }}>
      <DevPanel dev={dev} setDev={setDev} miestoPevne={!!miestoProp} registrovany={registrovany} ico={ico}
        cielInfo={realnyCiel ? undefined : `ukážkový ${DEV_CIEL.toLocaleString("sk-SK")} €`} dorovnava={dorovnanie?.firma}
        onDar={(suma) => pridajDar({ refId: zbierka.id, suma, kanal: "psp", registrovany })} />

      {/* karta 02 — hlavička, galéria, nadpis a text (všade okrem hárku Podporiť DEED) */}
      {miesto !== "podporitDeed" && (
        <div style={{ padding: "4px 16px 0" }}>
          <Hlavicka cisloZbierky={zbierka.cislo} overena={zbierka.overena} onBack={onBack} spatNazov={spatNazov} onZavriet={onZavriet} />
          <Galeria media={zbierka.media ?? []} />
          <NadpisText nazov={zbierka.nazov} text={zbierka.popis} otvoreny={st.text as boolean | undefined} onOtvoreny={(v) => zmenStav({ text: v })} />
        </div>
      )}
      {miesto === "podporitDeed" && (
        <Ram nazov="Hárok Podporiť DEED"><span {...pressable(onBack, "Zavrieť")} style={{ cursor: "pointer", fontWeight: 700 }}>✕ Zavrieť</span></Ram>
      )}

      {platba && (
        <PlatobneOkno kanal={platba.kanal} suma={platba.suma} nazov={zbierka.nazov} registrovany={registrovany}
          bonus={dorovnanie ? (sm) => dorovnanieKDaru(dorovnanie, sm) : undefined} firma={dorovnanie?.firma}
          onClose={() => setPlatba(null)}
          onHotovo={(v) => {
            pridajDar({ refId: zbierka.id, suma: v.eur, kanal: v.kanal === "eur" ? (v.sposob === "sepa" ? "sepa" : "psp") : "deed", registrovany, volba: v.volba });
            setPlatba(null);
            toast("Dar odoslaný · poďakovanie (Svetlúšik a hláška) príde s kartou 09");
          }} />
      )}

      {harok === "pravidelna" && <RecurringSheet nazov={zbierka.nazov} caseId={zbierka.id} onClose={() => setHarok(null)} toast={toast} />}
      {harok === "firma" && <NoveDorovnanieSheet entita="charita" cielId={zbierka.id} cielNazov={zbierka.nazov} toast={toast} onClose={() => setHarok(null)} />}
      {harok === "retaz" && <SplitQrSheet titul={zbierka.nazov} caseId={zbierka.id} onClose={() => setHarok(null)} toast={toast} />}

      {/* pripojené položky — vždy rovnaké poradie, odpojené chýbajú úplne */}
      {polozky.map((p) => {
        // karta 03 — pole charity / overovateľa (skryté, keď si prišiel zo stránky tej istej organizácie)
        if (p.kluc === "poleZodpoveda") {
          if (!zbierka.organizacia || zoStrankyOrg) return null;
          const org: OrgPole = { ...zbierka.organizacia, typ: miesto === "sukromna" ? "overovatel" : "charita" };
          return (
            <div key={p.kluc} style={{ padding: "0 16px" }}>
              <PoleOrganizacie org={org} nadpis={String(p.hodnota)} otvorene={!!st.pole}
                onPrepni={() => zmenStav({ pole: !st.pole })} onOtvorStranku={onOtvorOrg} />
            </div>
          );
        }
        // karta 04 — karta stavu celej zbierky (míľniky sú jej súčasť; pri tvorcovi karta 13)
        if (p.kluc === "kartaStavu" && p.hodnota === "cela") {
          return (
            <div key={p.kluc} style={{ padding: "0 16px" }}>
              <KartaStavu refId={zbierka.id} zaklad={zbierka.vyzbierane ?? 0} ciel={ciel} ludiaZaklad={zbierka.ludia ?? 0} tempo={tempoRezim} />
            </div>
          );
        }
        if (p.kluc === "milniky" || p.kluc === "tempo") return null; // súčasť karty stavu
        // karta 06 — rýchle sumy + vlastná suma (vlastná suma je hneď pod nimi)
        if (p.kluc === "rychleSumy" && p.hodnota !== "podporitDeed") {
          const naDeed = p.hodnota === "deed";
          const vlastnaEur = polozky.some((x) => x.kluc === "vlastnaEur") || (miesto === "deed" && registrovany);
          return (
            <div key={p.kluc} style={{ padding: "0 16px" }}>
              {naDeed
                ? <DeedDlazdice refId={zbierka.id} registrovany={registrovany} />
                : <RychleSumyEur sumy={p.hodnota === "eurDrobne" ? [1, 3, 5] : zbierka.rychleSumy ?? [10, 25, 50]}
                    doplnok={p.hodnota === "eurDrobne" || miesto === "sukromna" ? undefined : "sumy si volí charita"}
                    kDaru={dorovnanie ? (sm) => dorovnanieKDaru(dorovnanie, sm) : undefined} otvor={otvorPlatbu} />}
              <VlastnaSuma eur={vlastnaEur} deed={miesto === "deed" && registrovany} otvor={otvorPlatbu}
                firma={dorovnanie ? `${dorovnanie.firma} ${dorovnanie.pomer === 1 ? "zdvojnásobí" : "dorovná"}` : undefined} />
            </div>
          );
        }
        if (p.kluc === "vlastnaEur") return null; // vykreslená spolu s rýchlymi sumami
        const obal = (el: React.ReactNode) => <div key={p.kluc} style={{ padding: "0 16px" }}>{el}</div>;
        if (p.kluc === "zdielat") return obal(<ZdielatRiadok onZdielat={() => void zdielaj({ titul: zbierka.nazov, text: zbierka.nazov, url: aktualnaUrl() }, toast)} />);
        if (p.kluc === "dorovnanie" && dorovnanie) return obal(<>
          <KartaDorovnava d={dorovnanie} />
          {dorovnanieKDaru(dorovnanie, 20) > 0 && <div style={{ margin: "-4px 0 12px", textAlign: "center", fontSize: 13.5, fontWeight: 700, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>
            daruješ 20 € → k príjemcovi ide {(20 + dorovnanieKDaru(dorovnanie, 20)).toLocaleString("sk-SK")} €</div>}
        </>);
        if (p.kluc === "pravidelna") return obal(<PravidelnaRiadok registrovany={registrovany} onClick={() => setHarok("pravidelna")} />);
        if (p.kluc === "oblubene") return obal(<OblubenePodporit polozka={{ refId: zbierka.id, typ: "charita", modul: "charity", nazov: zbierka.nazov, ciel: zbierka.ciel }}
          onPodporit={() => toast("Hárok Podporiť DEED — príde s kartou 06 E")} />);
        if (p.kluc === "zapojitFirmu") return obal(<ZapojitFirmuRiadok firma={firmaAkoDarca() ?? "Vaša firma"} onClick={() => setHarok("firma")} />);
        if (p.kluc === "retazNastavit") return obal(<RetazRiadok onClick={() => setHarok("retaz")} />);
        if (p.kluc === "darcovia") return obal(<Darcovia refId={zbierka.id} />);
        if (p.kluc === "krypto") return <div key={p.kluc} style={{ padding: "0 16px" }}><DaryVKrypte refId={zbierka.id} otvor={otvorPlatbu} /></div>;
        return <Ram key={p.kluc} nazov={NAZVY[p.kluc]} hodnota={p.hodnota} />;
      })}
    </div>
  );
}

function Ram({ nazov, hodnota, children }: { nazov: string; hodnota?: Hodnota; children?: ReactNode }) {
  return (
    <div style={{ margin: `0 ${SPACE.md}px ${SPACE.xs}px`, padding: `${SPACE.sm}px ${SPACE.gutter}px`, borderRadius: RADIUS.sm, border: `1px dashed ${C.line}`, background: C.surface }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: SPACE.xs }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.textSec }}>{nazov}</span>
        {typeof hodnota === "string" && <span style={{ fontSize: 11, color: C.textTer }}>· {hodnota}</span>}
      </div>
      {children && <div style={{ marginTop: SPACE.xs, fontSize: 13 }}>{children}</div>}
    </div>
  );
}

// ---- DEV panel — miesto a stav zbierky/darcu (v produkcii sa nezobrazuje) ----
function DevPanel({ dev, setDev, miestoPevne, registrovany, ico, cielInfo, onDar, dorovnava }: {
  dev: DevStav; setDev: (z: Partial<DevStav>) => void; miestoPevne: boolean; registrovany: boolean; ico: boolean;
  cielInfo?: string; onDar: (suma: number) => void; dorovnava?: string;
}) {
  // predvolene zbalený, nech detail vyzerá ako v appke; stav sa pamätá
  const [skryty, setSkrytyRaw] = useState(() => { try { return localStorage.getItem("deed.dev.zbierkaPanel") !== "1"; } catch { return true; } });
  const setSkryty = (v: boolean) => { setSkrytyRaw(v); try { localStorage.setItem("deed.dev.zbierkaPanel", v ? "0" : "1"); } catch { /* LS */ } };
  const tempo = useDevTempo();
  const [tuk, setTuk] = useState(potvrditTuknutim);
  const chip = (on: boolean): CSSProperties => ({ padding: `${SPACE.xxs}px ${SPACE.sm}px`, borderRadius: RADIUS.pill, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${on ? "var(--a-info)" : C.line}`, background: on ? C.surface2 : "transparent", color: on ? C.text : C.textSec });
  const riadok = (label: string, on: boolean, zmen: (v: boolean) => void) => (
    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xxs}px 0` }}>
      <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{label}</div>
      <Switch on={on} onChange={zmen} ariaLabel={label} />
    </div>
  );
  return (
    <div style={{ margin: SPACE.md, padding: SPACE.sm, borderRadius: RADIUS.sm, border: "1px dashed var(--a-plum)", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "var(--a-plum)", letterSpacing: ".04em" }}>DEV</span>
        <span style={{ flex: 1, fontWeight: 700, color: C.textSec }}>Nový detail zbierky — miesto a stav</span>
        <span {...pressable(() => setSkryty(!skryty), skryty ? "Ukázať" : "Skryť")} style={{ color: C.textTer, cursor: "pointer" }}>{skryty ? "ukázať" : "skryť"}</span>
      </div>
      {!skryty && (
        <>
          {!miestoPevne && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xxs, margin: `${SPACE.sm}px 0` }}>
              {MIESTA.map((m) => <span key={m.kluc} {...pressable(() => setDev({ miesto: m.kluc }), m.nazov)} style={chip(dev.miesto === m.kluc)}>{m.nazov}</span>)}
            </div>
          )}
          {riadok(`Zbierka má cieľ${cielInfo ? ` (${cielInfo})` : ""}`, dev.maCiel, (v) => setDev({ maCiel: v }))}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: SPACE.xxs, padding: `${SPACE.xxs}px 0` }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>Simulovať dar</span>
            {[3, 25, 150, 1000].map((s) => <span key={s} {...pressable(() => onDar(s), `Simulovať dar ${s} €`)} style={chip(false)}>+{s.toLocaleString("sk-SK")} €</span>)}
          </div>
          <div style={{ padding: `${SPACE.xxs}px 0`, fontSize: 12, fontWeight: 700 }}>
            Dorovnanie firmy: {dorovnava ? <span style={{ color: "var(--a-gold)" }}>beží · {dorovnava}</span> : <span style={{ color: C.textTer }}>nebeží</span>}
            <div style={{ fontSize: 10.5, fontWeight: 400, color: C.textTer }}>skutočný stav zbierky · zapína ho firma cez „Zapojiť firmu do dorovnania"</div>
          </div>
          {dev.miesto === "sukromna" && riadok("Súkromnú splitol tvorca", dev.split, (v) => setDev({ split: v }))}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: SPACE.xxs, padding: `${SPACE.xxs}px 0` }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>Tempo darov (výpočet ešte nie je)</span>
            {STUPNE.map((n, i) => <span key={n} {...pressable(() => nastavDevTempo(i as Stupen), n)} style={chip(tempo === i)}>{n}</span>)}
          </div>
          {riadok("Potvrdiť platbu ťuknutím (namiesto podržania)", tuk, (v) => { nastavPotvrditTuknutim(v); setTuk(v); })}
          {riadok("Darca registrovaný", registrovany, (v) => nastavNeregistrovany(!v))}
          {riadok("Darca má IČO", ico, (v) => nastavDarcuFirmu(v))}
        </>
      )}
    </div>
  );
}
