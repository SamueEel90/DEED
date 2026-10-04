// OPRAVY 139 · Kronika v6 — platobný modul pri centrálnej zbierke a sektoroch = časti nášho ZbierkaModul,
// v poradí podľa prototypu „Platobny modul profil" (= Platba - dorovnanie firmy v2):
// KartaStavu bez cieľa · KartaDorovnava + „daruješ 20 € → …" · Zdieľať · QR + Páči sa mi · DROBNÁ PODPORA ·
// DARY V EURÁCH · VLASTNÁ SUMA · DARY V KRYPTE · Pravidelná podpora · MESAČNE TO ZNAMENÁ (tipy, KARTA 46 pod ňou) ·
// Sledovať + Podporiť DEED · Reťaz dobra · „Kam treba najviac…" · Darcovia. refId = centrálna / sektorová zbierka.
// Nad modulom zväčšený náhľad dlaždice („POSIELAŠ DO · …", ikona i), modul sa prefarbí podľa poradia (data-hier).
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { jeNeregistrovany, sledujDarcu } from "@/lib/devDarca";
import { pridajDar, darcoviaPre } from "@/lib/darcovia";
import { dorovnanieNaDar, dorovnanieKDaru, useZmenyDorovnani } from "@/lib/dorovnanie";
import type { TestProfil, TestSektor } from "@/lib/testProfily";
import { KartaStavu } from "@/features/zbierka/KartaStavu";
import { RychleSumyEur, DeedDlazdice, VlastnaSuma, DaryVKrypte, type OtvorPlatbu, type KanalPlatby } from "@/features/zbierka/Sumy";
import { PlatobneOkno } from "@/features/zbierka/Platba";
import { ZdielatRiadok, PravidelnaRiadok, OblubenePodporit, RetazRiadok, KartaDorovnava, Darcovia } from "@/features/zbierka/Riadky";
import { ZdielatHarok } from "@/features/zbierka/Zdielat";
import { PravidelnaHarok } from "@/features/zbierka/PravidelnaHarok";
import { PodporitDeedHarok } from "@/features/zbierka/PodporitDeed";
import { RetazDobraHarok } from "@/features/zbierka/RetazDobra";
import { SvetlusikInfo, SvetlusikKarta } from "@/components/SvetlusikInfo";
import "@/styles/platba.css";
import "@/styles/animacie.css";

const bg = (f: string) => `url('${f}') center/cover no-repeat #3a3530`;
const eurT = (n: number) => `${n.toLocaleString("sk-SK")} €`;

/** náhľad dlaždice nad modulom + modul + Zbaliť */
export function ModulProfilu({ profil, sektor, poradie, mestoV, onZbal, dorovnanie = true, uvidisOdkaz, typ: typP, typ2: typ2P, info: infoP, meno }: {
  profil: TestProfil; sektor: TestSektor; poradie: number;
  /** „v Trenčíne" → „Trenčíne" (pre vetu „Minulý mesiac v …") */
  mestoV: string;
  onZbal: () => void;
  /** KARTA 46 · false = skryť všetko o dorovnaní firmy (firma nedorovnáva vlastný fond) */
  dorovnanie?: boolean;
  /** KARTA 46 · odkaz pod zelenou vetou („Pozrieť v zbierke … ›") */
  uvidisOdkaz?: { text: string; onClick?: () => void };
  /** texty náhľadu (firma: „FOND DOBROTY", vlastné vysvetlenie Svetlúšika) */
  typ?: string; typ2?: string; info?: string;
  /** meno pod názvom náhľadu (firma: krátke meno bez s.r.o.) */
  meno?: string;
}) {
  const [info, setInfo] = useState(false);
  const sek = poradie > 0;
  const typ = typP ?? (sek ? `SEKTOR ${poradie}` : "CENTRÁLNA ZBIERKA");
  const typ2 = typ2P ?? (sek ? "peniaze idú len na túto tému" : "celá činnosť, použijú ich, kde treba najviac");
  const infoText = infoP ?? (sek
    ? "Sektorová zbierka je na jednu tému, ktorú charita robí dlhodobo. Nemá cieľ ani koniec. Dokladovanie je dobrovoľné, ale peniaze idú len na túto tému. Ak chceš vidieť každý doklad, vyber konkrétnu zbierku."
    : "Centrálna zbierka je na chod celej organizácie. Dokladovanie je dobrovoľné a peniaze sa použijú tam, kde treba najviac. Ak chceš vidieť každý doklad, vyber konkrétnu zbierku alebo sektor.");
  return (
    <div data-hier={String(poradie)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ borderRadius: 22, overflow: "hidden", border: "2px solid var(--hc)", background: "var(--card)" }}>
        <div style={{ position: "relative", height: 150, background: bg(sektor.foto) }}>
          <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.25) 0%,rgba(10,8,5,0) 45%)" }} />
          <span style={{ position: "absolute", left: 12, top: 12, height: 28, padding: "0 12px", borderRadius: 14, background: "var(--hcF)", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>POSIELAŠ DO · {typ}</span>
        </div>
        <div style={{ padding: "12px 8px 14px 16px", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <b style={{ fontSize: 20, lineHeight: 1.2 }}>{sektor.nazov}</b>
            <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{meno ?? profil.meno} · {typ2}</span>
          </span>
          <SvetlusikInfo otv={info} onPrepni={() => setInfo((x) => !x)} />
        </div>
        {info && <SvetlusikKarta style={{ margin: "0 12px 12px" }}>{infoText}</SvetlusikKarta>}
      </div>
      <Modul profil={profil} sektor={sektor} mestoV={mestoV} sDorovnanim={dorovnanie} uvidisOdkaz={uvidisOdkaz} />
      <button type="button" onClick={onZbal} style={{ height: 44, border: "none", background: "transparent", cursor: "pointer", fontSize: 13.5, fontWeight: 800, color: "var(--ink3)" }}>Zbaliť ⌃</button>
    </div>
  );
}

/** KARTA 47 · samotný platobný modul bez náhľadu dlaždice a bez Zbaliť (tvorca: podpora v stĺpci / hárku, stream: hneď otvorený).
 *  nazov = názov platby (inak „{sektor} · {profil}"). */
export function ModulPlatby(p: { profil: TestProfil; sektor: TestSektor; mestoV?: string; dorovnanie?: boolean; uvidisOdkaz?: { text: string; onClick?: () => void }; nazov?: string }) {
  return <Modul profil={p.profil} sektor={p.sektor} mestoV={p.mestoV ?? ""} sDorovnanim={p.dorovnanie ?? true} uvidisOdkaz={p.uvidisOdkaz} nazovPlatby={p.nazov} />;
}

function Modul({ profil, sektor, mestoV, sDorovnanim, uvidisOdkaz, nazovPlatby }: { profil: TestProfil; sektor: TestSektor; mestoV: string; sDorovnanim: boolean; uvidisOdkaz?: { text: string; onClick?: () => void }; nazovPlatby?: string }) {
  const refId = sektor.id;
  const rootRef = useRef<HTMLDivElement>(null), koniecPruhu = useRef<HTMLDivElement>(null);
  const mikro = { root: rootRef, ciel: koniecPruhu };
  const [registrovany, setRegistrovany] = useState(() => !jeNeregistrovany());
  useEffect(() => sledujDarcu(() => setRegistrovany(!jeNeregistrovany())), []);
  useZmenyDorovnani();
  const dorovnanie = sDorovnanim ? dorovnanieNaDar(refId) : null;
  const zaklad = sektor.mesiac ?? sektor.vyzbierane;
  const kam = sektor.druh === "centralna" ? "celej činnosti" : `sektora ${sektor.nazov}`;
  const nazov = nazovPlatby ?? `${sektor.nazov} · ${profil.meno}`;

  const [platba, setPlatba] = useState<{ kanal: KanalPlatby; suma?: number } | null>(null);
  const stav = () => {
    const dary = darcoviaPre(refId), dnes = new Date(); dnes.setHours(0, 0, 0, 0);
    return { vyzbierane: zaklad + dary.reduce((a, r) => a + r.suma, 0), ciel: null, pocetDarov: sektor.darcovia + dary.length, darovDnes: dary.filter((r) => r.cas >= dnes.getTime()).length };
  };
  const [pred, setPred] = useState(stav);
  const otvor: OtvorPlatbu = (p) => { setPred(stav()); setPlatba(p); };
  const [harok, setHarok] = useState<null | "pravidelna" | "zdielat" | "podporit" | "retaz">(null);
  const [tipSuma, setTipSuma] = useState<number | undefined>(undefined);
  const k20 = dorovnanie ? dorovnanieKDaru(dorovnanie, 20) : 0;
  const veta = sektor.kam?.replace("{m}", mestoV);

  return (
    <div ref={rootRef} style={{ position: "relative", display: "flex", flexDirection: "column", color: "var(--ink)" }}>
      <KartaStavu refId={refId} zaklad={zaklad} ciel={null} ludiaZaklad={sektor.darcovia} koniecPruhu={koniecPruhu} />
      {dorovnanie && <div style={{ marginTop: 12 }}>
        <KartaDorovnava d={dorovnanie} />
        {k20 > 0 && <div style={{ margin: "-4px 0 0", textAlign: "center", fontSize: 13.5, fontWeight: 700, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>daruješ 20 € → do {kam} ide {eurT(20 + k20)}</div>}
      </div>}
      <div style={{ marginTop: 12 }}><ZdielatRiadok onZdielat={() => setHarok("zdielat")} /></div>
      <DeedDlazdice refId={refId} registrovany={registrovany} mikro={mikro} />
      <RychleSumyEur sumy={[10, 25, 45]} doplnok="sumy si volí charita" kDaru={dorovnanie ? (s) => dorovnanieKDaru(dorovnanie, s) : undefined} otvor={otvor} />
      <VlastnaSuma eur deed={registrovany} otvor={otvor} firma={dorovnanie ? `${dorovnanie.firma} ${dorovnanie.pomer === 1 ? "zdvojnásobí" : "dorovná"}` : undefined} />
      <DaryVKrypte refId={refId} otvor={otvor} mikro={mikro} />
      <PravidelnaRiadok registrovany={registrovany} onClick={() => { setTipSuma(undefined); setHarok("pravidelna"); }} />
      {!!sektor.tipy?.length && <>
        <div style={{ margin: "12px 2px 8px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, fontSize: 12.5, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)" }}>
          <span>MESAČNE TO ZNAMENÁ</span>
          {sektor.mesacne != null && <span style={{ fontWeight: 600, letterSpacing: 0, color: "var(--green)" }}>{sektor.mesacne.toLocaleString("sk-SK")} {sektor.mesacne === 1 ? "človek podporuje" : sektor.mesacne >= 2 && sektor.mesacne <= 4 ? "ľudia podporujú" : "ľudí podporuje"} mesačne</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sektor.tipy.map(([v, t]) => (
            <button key={v} type="button" className="zb-karta" onClick={() => { setTipSuma(v); setHarok("pravidelna"); }}
              style={{ minHeight: 52, padding: "8px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--gBd)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
              <b style={{ flex: "none", minWidth: 76, fontSize: 17, fontVariantNumeric: "tabular-nums" }}>{v} € <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>/ mes.</span></b>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.35, color: "var(--ink2)" }}>{t}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>))}
        </div>
      </>}
      <OblubenePodporit polozka={{ refId, typ: "charita", modul: "charity", nazov }} onPodporit={() => setHarok("podporit")} />
      <RetazRiadok onClick={() => setHarok("retaz")} />
      {veta && <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 18, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 14, lineHeight: 1.5, color: "var(--ink)", textWrap: "pretty" } as CSSProperties}>{veta}
        {uvidisOdkaz && <button type="button" onClick={uvidisOdkaz.onClick} style={{ display: "block", minHeight: 44, margin: "-6px 0 -12px", padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", textAlign: "left", fontSize: 13.5, fontWeight: 800, color: "var(--green)", fontFamily: "inherit" }}>{uvidisOdkaz.text} ›</button>}
      </div>}
      <div style={{ marginTop: 14 }}><Darcovia refId={refId} bezDorovnania={!sDorovnanim} /></div>

      {platba && <PlatobneOkno kanal={platba.kanal} suma={platba.suma} nazov={nazov} registrovany={registrovany} pred={pred}
        bonus={dorovnanie ? (s) => dorovnanieKDaru(dorovnanie, s) : undefined} firma={dorovnanie?.firma}
        onClose={() => setPlatba(null)}
        onHotovo={(v) => pridajDar({ refId, suma: v.eur, kanal: v.kanal === "eur" ? (v.sposob === "sepa" ? "sepa" : "psp") : "deed", registrovany, volba: v.volba })} />}
      {harok === "pravidelna" && <PravidelnaHarok refId={refId} nazov={nazov} registrovany={registrovany} zbierka={false} suma={tipSuma} onClose={() => setHarok(null)} />}
      {harok === "zdielat" && <ZdielatHarok id={refId} nazov={nazov} organizacia={profil.meno} obrazok={sektor.foto} onClose={() => setHarok(null)} />}
      {harok === "podporit" && <PodporitDeedHarok registrovany={registrovany} onClose={() => setHarok(null)} />}
      {harok === "retaz" && <RetazDobraHarok zbierka={{ id: refId, nazov, org: profil.meno, ciel: null, vyzbierane: zaklad }} onClose={() => setHarok(null)} />}
    </div>
  );
}
