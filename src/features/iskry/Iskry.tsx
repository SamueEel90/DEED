// ============================================================
// KARTA 41 · Iskry — centrálny prúd (časť 1). Prototyp: „Iskra centralna mobil".
// Videá do 45 s na celú výšku, posun hore / dole (scroll-snap, vždy jedno celé, hrá len viditeľné).
// Druh: Všetko · Talent · Vedomosti · Šport · Zábava · Skutky. Filter oblastí pripravený, skrytý.
// Pravý stĺpec: Darcovia · Iskra (= páči sa mi) · Darovať · Zdieľať. Dvojitý ťuk = Iskra (len zapne).
// Darovať: mikro dar EURC / DeeD, SEPA, karta, vlastná suma — rýchly dar 1 ťukom len prihlásený
// s uloženou platbou, inak bežné platobné okno. Overujem / Namietam len prihlásený.
// Živý pás (jeden pre celý prúd) + let daru so Svetlúšikmi (DarLet z odovzdania, naraz 1 let).
// Pridať Iskru tu nie je — príde v časti 2.
// ============================================================
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { DeedZnacka, sZnackou } from "@/components/DeedZnacka";
import { toast } from "@/components/toast";
import { TESTOVACIA } from "@/lib/testovacia";
import { jeNeregistrovany, sledujDarcu } from "@/lib/devDarca";
import { darcoviaPre, sucetDarov, pridajDar, pridajCudziDarMock, identitaDarcu, zobrazenaSuma, relCas, useZmenyDarov, type DarRiadok, type KanalDaru } from "@/lib/darcovia";
import {
  ISKRY_CFG, iskryVsetky, odkazIskry, DOVODY_NAMIETKY, refIskry, useZmenyIskier, pocetIskier, mojaIskra, prepniIskru, zapniIskru,
  sledujemAutora, prepniSledovanie, overujemIskru, prepniOverenie, namietkaIskry, podajNamietku, type Iskra,
} from "@/lib/iskry";
import { PlatobneOkno } from "@/features/zbierka/Platba";
import type { KanalPlatby } from "@/features/zbierka/Sumy";
import { useIskryOtvorene, zavriIskry, startIskry, zabudniStartIskry } from "./otvor";
import { Harok as SpolocnyHarok } from "@/features/zbierka/Zdielat";
import { DeedQr, stiahniDeedQr } from "@/components/deedqr";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { kopiruj } from "@/lib/zdielanie";
import { DarLet, useDarRad, darHlavne, darKam, type Dar, type PolohaLetu } from "./DarLet";

const ZLATA = "#F6C453";
/** čitateľnosť na svetlom videu: tieň pod všetkým bielym textom a číslami */
const TIEN = "0 1px 3px rgba(0,0,0,.7)";
/** mierka ovládania podľa výšky videa (844 = telefón) */
const mierkaZ = (vyska: number) => Math.min(1.6, Math.max(1, Math.round((vyska / 844) * 100) / 100));
/** hlavička (názov, druhy, pás) sa zväčšuje celá naraz; pravý stĺpec a blok autora násobia mierkou každý rozmer (k) */
const VRSTVA: CSSProperties = { zoom: "var(--isk-m, 1)" } as CSSProperties;
const IK = {
  darcovia: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M16 5.5a3 3 0 0 1 0 5.5M18 15c1.6.6 2.6 2.4 3 5",
  iskra: "M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z",
  dar: "M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z",
  zdielat: "M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14",
  spat: "M15 18l-6-6 6-6", celaOn: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5", celaOff: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5", hraj: "M8 5l12 7-12 7z", hore: "M6 15l6-6 6 6", dole: "M6 9l6 6 6-6",
};
const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const cis = (n: number) => n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const polnoc = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** meno v páse len so súhlasom (verzia identity), inak „anonymne"; suma len keď ju darca dovolil */
const menoRiadku = (r: DarRiadok) => (r.firma ? r.firma : r.registrovany && r.verzia !== 4 ? identitaDarcu(r).split(" · ")[0] : null);
const darZRiadku = (r: DarRiadok, v: Iskra): Dar => ({ suma: r.registrovany && !r.zobrazSumu && !r.firma ? 0 : r.suma, meno: menoRiadku(r), zbierka: v.zbierka?.nazov, autor: v.autor });

const Ik = ({ d, s = 24, w = 2, fill = "none", c = "#fff" }: { d: string; s?: number; w?: number; fill?: string; c?: string }) =>
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
/** kľúč letu — jeden let = jeden objekt daru z radu */
const idLetu = new WeakMap<Dar, number>(); let dalsiLet = 1;
const kluc = (d: Dar) => { let k = idLetu.get(d); if (!k) { k = dalsiLet++; idLetu.set(d, k); } return k; };

export function IskryHost() {
  const otv = useIskryOtvorene();
  if (!otv) return null;
  return <IskryPrud />;
}

/** KARTA 41 · bod 8: rozhoduje ovládanie, nie šírka — PC s myšou; všetko dotykové = celá obrazovka */
const MQ_PC_ISKRY = "(hover: hover) and (pointer: fine)";
function usePcIskry() {
  const [pc, setPc] = useState(() => window.matchMedia(MQ_PC_ISKRY).matches);
  useEffect(() => { const m = window.matchMedia(MQ_PC_ISKRY), f = () => setPc(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return pc;
}
/** appka zväčšuje celé rozhranie (zoom na html podľa veľkosti písma) — v Iskrách to vraciame na 1 */
const bezZoomu = () => 1 / (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pismo")) || 1);

type Sheet = null | { typ: "dar" | "darcovia" | "namietka" | "zdielat"; v: Iskra };
/** odkaz Iskry — otvorí prúd na tomto videu */

function IskryPrud() {
  useZmenyIskier(); useZmenyDarov();
  const [registrovany, setRegistrovany] = useState(() => !jeNeregistrovany());
  useEffect(() => sledujDarcu(() => setRegistrovany(!jeNeregistrovany())), []);
  const [druh, setDruh] = useState(0);
  const [oblast, setOblast] = useState(3); // pripravené (Krajina = celé Slovensko), skryté kým nie je obsah
  // odkaz /iskra/{id}: prúd začne na tomto videu
  const [startId] = useState(() => startIskry());
  useEffect(() => { zabudniStartIskry(); }, []);
  const [idx, setIdx] = useState(() => Math.max(0, startId ? iskryVsetky().findIndex((x) => x.id === startId) : 0));
  const [profil, setProfil] = useState<Iskra | null>(null);
  const [qrVelky, setQrVelky] = useState<Iskra | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [platba, setPlatba] = useState<{ v: Iskra; kanal: KanalPlatby; suma?: number } | null>(null);
  const [dva, setDva] = useState<{ id: string; x: number; y: number; k: number } | null>(null);
  const [tick, setTick] = useState(0);
  const [prepis, setPrepis] = useState<{ hl: string; kam: string; k: number } | null>(null);
  const root = useRef<HTMLDivElement>(null), sc = useRef<HTMLDivElement>(null), pasRef = useRef<HTMLDivElement>(null);
  const darBtn = useRef<Record<string, HTMLButtonElement | null>>({});
  const videa = useRef<Record<string, HTMLVideoElement | null>>({});
  const posledny = useRef<{ id: string; t: number; x: number; y: number } | null>(null);

  const pc = usePcIskry();
  // PC: Celá obrazovka (Fullscreen API) — tlačidlo vpravo hore aj kláves F; Esc / F / ťuk = späť
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [cela, setCela] = useState(() => !!document.fullscreenElement);
  useEffect(() => { const f = () => setCela(!!document.fullscreenElement); document.addEventListener("fullscreenchange", f); return () => { document.removeEventListener("fullscreenchange", f); if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); }; }, []);
  const prepniCelu = () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); else void dialogRef.current?.requestFullscreen?.().catch(() => undefined); };
  // po bokoch rozmazaná kópia videa — len keď video nevypĺňa celú šírku (tablet, PC)
  const bgVideo = useRef<HTMLVideoElement | null>(null);
  const [boky, setBoky] = useState(false);
  useLayoutEffect(() => {
    const o = dialogRef.current, r = root.current; if (!o || !r) return;
    const f = () => setBoky(o.clientWidth - r.offsetWidth > 8); f();
    const ro = new ResizeObserver(f); ro.observe(o); ro.observe(r); return () => ro.disconnect();
  }, []);
  // popis najviac 2 riadky, ťuk rozbalí; spodný blok nesiaha vyššie ako tlačidlo Darcovia (meria sa výška pravého stĺpca)
  const [rozbaleny, setRozbaleny] = useState<string | null>(null);
  useEffect(() => { setRozbaleny(null); }, [idx, druh]);
  // „… viac" len pri popise, ktorý sa do 2 riadkov nezmestí
  const popisRef = useRef<Record<string, HTMLSpanElement | null>>({});
  const [dlhe, setDlhe] = useState<Set<string>>(() => new Set());
  const stlpecRef = useRef<HTMLDivElement | null>(null);
  const hlavRef = useRef<HTMLDivElement | null>(null);
  // druhy videí: vodorovný posun, pri okraji, kde ešte niečo je, stmavnutie (maska)
  const druhyRef = useRef<HTMLDivElement | null>(null);
  const [okraje, setOkraje] = useState({ l: false, p: false });
  const merajOkraje = () => { const el = druhyRef.current; if (!el) return; const l = el.scrollLeft > 2, p = el.scrollLeft + el.clientWidth < el.scrollWidth - 2; setOkraje((o) => (o.l === l && o.p === p ? o : { l, p })); };
  useLayoutEffect(() => { merajOkraje(); const el = druhyRef.current; if (!el) return; const ro = new ResizeObserver(merajOkraje); ro.observe(el); return () => ro.disconnect(); }, []);
  const [miesto, setMiesto] = useState({ stlpec: 316, volne: 9999, video: 844 });
  // ovládanie rastie s videom: mierka = výška videa / 844, najmenej 1, najviac 1,6 (telefón = 1) — jedna premenná --isk-m
  const [mierka, setMierka] = useState(1);
  useLayoutEffect(() => {
    const st = stlpecRef.current, hl = hlavRef.current, r = root.current; if (!st || !hl || !r) return;
    // pri nízkej obrazovke ani pod hlavičku (názov, druhy, živý pás)
    const f = () => { const m = mierkaZ(r.clientHeight); setMierka(m); setMiesto({ stlpec: st.offsetHeight, volne: r.clientHeight - hl.getBoundingClientRect().height - (28 + 10) * m, video: r.clientHeight }); };
    f(); const ro = new ResizeObserver(f); [st, hl, r].forEach((e) => ro.observe(e)); return () => ro.disconnect();
  }, [druh, mierka]);
  useLayoutEffect(() => { const el = sc.current; if (el && idx > 0) el.scrollTop = idx * el.clientHeight; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const list = iskryVsetky().filter((v) => druh === 0 || v.druh === druh);
  const akt = list[Math.min(idx, list.length - 1)];
  useLayoutEffect(() => {
    const n = new Set<string>();
    Object.entries(popisRef.current).forEach(([id, el]) => { if (el && el.scrollHeight > el.clientHeight + 1) n.add(id); });
    setDlhe((o) => (o.size === n.size && [...n].every((x) => o.has(x)) ? o : n));
  }, [druh, mierka, miesto.video, rozbaleny]);

  // Esc = zavrieť (PC), zablokovať posun stránky pod prúdom
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (profilRef.current) setProfil(null); else if (sheet) setSheet(null); else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); else zavriIskry(); }
      else if ((e.key === "f" || e.key === "F") && pcRef.current && !sheet && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) prepniCeluRef.current();
      else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !sheet) { e.preventDefault(); posunRef.current(e.key === "ArrowDown" ? 1 : -1); }
    };
    window.addEventListener("keydown", k);
    const pred = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = pred; };
  }, [sheet]);
  // hrá len viditeľné video
  // hrá len viditeľné video (stlmené, samo); ostatné stoja. Appka v pozadí → stop.
  const [viditelna, setViditelna] = useState(() => document.visibilityState === "visible");
  useEffect(() => { const f = () => setViditelna(document.visibilityState === "visible"); document.addEventListener("visibilitychange", f); return () => document.removeEventListener("visibilitychange", f); }, []);
  useEffect(() => {
    Object.entries(videa.current).forEach(([id, el]) => {
      if (!el) return;
      if (akt && id === akt.id && !sheet && !profil && viditelna) { el.muted = true; void el.play().catch(() => { /* autoplay zablokovaný — ostane poster */ }); }
      else el.pause();
    });
    const b = bgVideo.current;
    if (b) { if (boky && akt?.src && !sheet && !profil && viditelna) { b.muted = true; void b.play().catch(() => undefined); } else b.pause(); }
  }, [akt, sheet, profil, viditelna, boky]);
  useEffect(() => () => { Object.values(videa.current).forEach((el) => el?.pause()); }, []);

  // ---- živý pás: dnes v Iskrách + dary v rade (každý 5 s) ----
  const od = polnoc();
  const dnes = iskryVsetky().flatMap((v) => darcoviaPre(refIskry(v)).filter((r) => r.cas >= od).map((r) => ({ r, v }))).sort((a, b) => b.r.cas - a.r.cas);
  const dnesSuma = dnes.reduce((a, x) => a + x.r.suma, 0);
  useEffect(() => { const t = window.setInterval(() => setTick((x) => x + 1), ISKRY_CFG.pasMs); return () => window.clearInterval(t); }, []);
  useEffect(() => { if (!prepis) return; const t = window.setTimeout(() => setPrepis(null), ISKRY_CFG.pasMs); return () => window.clearTimeout(t); }, [prepis]);
  const vRade = dnes.slice(0, 8);
  const pasDar = vRade.length ? vRade[tick % vRade.length] : null;
  const ukazPas = (hl: string, kam: string) => setPrepis({ hl, kam, k: Date.now() });
  const { aktualny, pridaj, pridajMoj, dalsi } = useDarRad((n) => ukazPas(`+${n} ${n >= 5 ? "darov" : "dary"} za minútu`, "Iskry"));

  /** šípky (tlačidlá na PC aj klávesnica): o jedno video hore / dole */
  const posun = (o: 1 | -1) => { const el = sc.current; if (!el) return; const i = Math.max(0, Math.min(list.length - 1, Math.round(el.scrollTop / Math.max(1, el.clientHeight)) + o)); el.scrollTo({ top: i * el.clientHeight, behavior: "smooth" }); };
  const posunRef = useRef(posun); posunRef.current = posun; // eslint-disable-line react-hooks/refs
  const pcRef = useRef(pc); pcRef.current = pc; // eslint-disable-line react-hooks/refs
  const profilRef = useRef(profil); profilRef.current = profil; // eslint-disable-line react-hooks/refs
  const prepniCeluRef = useRef(prepniCelu); prepniCeluRef.current = prepniCelu; // eslint-disable-line react-hooks/refs
  const skoc = (id: string) => {
    let i = list.findIndex((x) => x.id === id);
    if (i < 0) { setDruh(0); i = iskryVsetky().findIndex((x) => x.id === id); }
    window.setTimeout(() => { const el = sc.current; if (el) el.scrollTo({ top: i * el.clientHeight, behavior: "smooth" }); }, 30);
  };

  // poloha letu podľa skutočného rozloženia (DarLet ráta s 390 × 844 — na PC a tablete inak)
  const meraj = (): PolohaLetu | undefined => {
    const r = root.current?.getBoundingClientRect(), b = akt ? darBtn.current[akt.id]?.getBoundingClientRect() : undefined, p = pasRef.current?.getBoundingClientRect();
    if (!r || !b) return undefined;
    const start = { right: r.right - b.left + 8, bottom: r.bottom - (b.top + b.height / 2) - 25 };
    if (!p) return { start };
    const px = p.left - r.left + p.width / 2, py = p.top - r.top + p.height / 2;
    const x0 = r.width - start.right - 75, y0 = r.height - start.bottom - 18;
    return { start, ciel: { x: px - x0, y: py - y0 }, iskry: { left: px, top: py } };
  };

  // ---- dary ----
  const kanalDaru = (k: KanalPlatby, sposob?: "karta" | "sepa"): KanalDaru => (k === "eur" ? (sposob === "sepa" ? "sepa" : "psp") : "deed");
  const zaplatene = (v: Iskra, eurHodnota: number, kanal: KanalDaru) => {
    pridajDar({ refId: refIskry(v), suma: eurHodnota, kanal, registrovany });
    pridajMoj({ suma: eurHodnota, zbierka: v.zbierka?.nazov, autor: v.autor });
  };
  /** rýchla suma: prihlásený s uloženou platbou = 1 ťuk, inak bežné okno platby */
  const rychly = (v: Iskra, kanal: KanalPlatby, suma: number, sposob?: "karta" | "sepa") => {
    setSheet(null);
    if (registrovany) zaplatene(v, kanal === "deed" ? suma / 100 : suma, kanalDaru(kanal, sposob));
    else setPlatba({ v, kanal, suma });
  };
  const simuluj = () => {
    if (!akt) return;
    const sumy = [0.5, 1, 3, 5, 10, 20], s = sumy[Math.floor(Math.random() * sumy.length)];
    const r = pridajCudziDarMock(refIskry(akt), s, Math.random() < 0.3);
    pridaj(darZRiadku(r, akt));
  };

  // ---- dvojitý ťuk = Iskra (len zapne), zlatá iskra v mieste prsta 0,8 s ----
  const tuk = (e: RPointerEvent<HTMLDivElement>, v: Iskra) => {
    if ((e.target as HTMLElement).closest("button") || rozbaleny) return; // pri rozbalenom popise dvojitý ťuk nefunguje
    const r = e.currentTarget.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, t = Date.now();
    const p = posledny.current;
    if (p && p.id === v.id && t - p.t < 320 && Math.hypot(p.x - x, p.y - y) < 40) { zapniIskru(v.id); setDva({ id: v.id, x, y, k: t }); posledny.current = null; }
    else posledny.current = { id: v.id, t, x, y };
  };
  useEffect(() => { if (!dva) return; const t = window.setTimeout(() => setDva(null), 800); return () => window.clearTimeout(t); }, [dva]);

  const k = (n: number) => n * mierka; // pravý stĺpec a blok autora: každý rozmer × mierka
  const kruh = (on?: boolean, zelene?: boolean): CSSProperties => ({ width: k(50), height: k(50), borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    background: zelene ? "#4B7A35" : on ? "rgba(246,196,83,.25)" : "rgba(0,0,0,.45)", boxShadow: on ? `0 0 0 2px ${ZLATA}` : "none" });
  const stlpecBtn: CSSProperties = { border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: k(4), color: "#fff", padding: 0, fontFamily: "inherit", minWidth: Math.max(44, k(56)) };
  const cislo: CSSProperties = { fontSize: k(12.5), fontWeight: 800 };

  const poloha = aktualny ? meraj() : undefined; // eslint-disable-line react-hooks/refs

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Iskry" onClick={(e) => { if (pc && e.target === e.currentTarget) zavriIskry(); }}
      style={{ position: "fixed", inset: 0, zIndex: 140, zoom: bezZoomu(), background: "#0E0F0C", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "'Plus Jakarta Sans', sans-serif" } as CSSProperties}>
      {/* po bokoch rozmazaná kópia aktuálneho videa (nie čierne pásy) */}
      {boky && akt && <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: akt.bg, filter: "blur(40px)", transform: "scale(1.2)" }} />
        {akt.src && <video key={akt.id} ref={bgVideo} src={akt.src} muted loop playsInline preload="auto" onLoadedData={(e) => { e.currentTarget.style.opacity = "1"; }} onError={(e) => { e.currentTarget.style.opacity = "0"; }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px)", transform: "scale(1.2)", opacity: 0, transition: "opacity .25s ease" }} />}
        <div style={{ position: "absolute", inset: 0, background: "rgba(14,15,12,.45)" }} />
      </div>}
      {/* video 9 : 16 — telefón cez celú šírku, tablet a PC v strede; PC: výška okna − 48 px, rohy 20 */}
      <div style={{ position: "relative", height: pc && !cela ? "calc(100% - 48px)" : "100%", aspectRatio: "9 / 16", maxWidth: "100%" }}>
      <div ref={root} style={{ ["--isk-m" as string]: mierka, position: "absolute", inset: 0, overflow: "hidden", background: "#0E0F0C", borderRadius: pc && !cela ? 20 : 0, boxShadow: pc && !cela ? "0 24px 60px rgba(0,0,0,.5)" : "none", textShadow: TIEN }}>
        {/* ---------- prúd ---------- */}
        <div ref={sc} className="isk-scroll" onScroll={(e) => { const el = e.currentTarget; const i = Math.round(el.scrollTop / Math.max(1, el.clientHeight)); if (i !== idx) setIdx(i); }}
          style={{ position: "absolute", inset: 0, overflowY: "auto", scrollSnapType: "y mandatory", scrollbarWidth: "none", overscrollBehavior: "contain" }}>
          {list.map((v, i) => {
            const zap = mojaIskra(v.id), sled = sledujemAutora(v.autor), pocetD = sucetDarov(refIskry(v)).pocet;
            return (
              <div key={v.id} onPointerUp={(e) => tuk(e, v)} style={{ position: "relative", height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always", background: v.bg, overflow: "hidden", userSelect: "none", touchAction: "pan-y" }}>
                {/* pozadie (v.bg) je poster, kým sa video načíta; video sa ukáže až s prvým snímkom, chýbajúci súbor = ostane poster */}
                {v.src && <video ref={(el) => { videa.current[v.id] = el; if (el) { el.muted = true; el.defaultMuted = true; } }} src={v.src} muted loop playsInline preload={Math.abs(i - idx) <= 1 ? "auto" : "metadata"}
                  onLoadedData={(e) => { e.currentTarget.style.opacity = "1"; }} onError={(e) => { e.currentTarget.style.opacity = "0"; }}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0, transition: "opacity .25s ease", pointerEvents: "none" }} />}
                <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 28%,rgba(0,0,0,0) 50%,rgba(0,0,0,.85) 100%)", pointerEvents: "none" }} />
                {/* vodoznak: DEED+ ako v appke + meno autora (pri zdieľaní von sa vypáli do videa — server) */}
                <span aria-hidden="true" style={{ position: "absolute", left: 14, top: "33%", display: "flex", flexDirection: "column", gap: 1, opacity: 0.85, textShadow: TIEN, pointerEvents: "none", color: "#fff" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: "#8CC653" }}><DeedZnacka /></span>
                  <span style={{ fontSize: 10.5, fontWeight: 700 }}>{v.autor}</span>
                </span>
                {i !== idx && <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "44%", width: 72, height: 72, margin: "-36px 0 0 -36px", borderRadius: "50%", background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.hraj} s={28} fill="#fff" w={0} /></span>}
                {dva?.id === v.id && <svg key={dva.k} width="96" height="96" viewBox="0 0 24 24" aria-hidden="true" className="isk-dva" style={{ position: "absolute", left: dva.x - 48, top: dva.y - 48, zIndex: 4, pointerEvents: "none", filter: "drop-shadow(0 0 12px rgba(246,196,83,.9))" }}><path d={IK.iskra} fill={ZLATA} /></svg>}

                {/* pravý stĺpec */}
                <div ref={i === 0 ? stlpecRef : undefined} style={{ position: "absolute", right: k(12), bottom: `calc(${k(150)}px + env(safe-area-inset-bottom, 0px))`, display: "flex", flexDirection: "column", alignItems: "center", gap: k(12) }}>
                  <button type="button" aria-label={`Darcovia, ${pocetD}`} onClick={() => setSheet({ typ: "darcovia", v })} style={stlpecBtn}><span style={kruh()}><Ik d={IK.darcovia} s={k(24)} /></span><span style={cislo}>{cis(pocetD)}</span></button>
                  <button type="button" aria-label="Iskra" aria-pressed={zap} onClick={() => prepniIskru(v.id)} style={stlpecBtn}><span style={kruh(zap)}><Ik d={IK.iskra} s={k(26)} w={1.6} c={ZLATA} fill={zap ? ZLATA : "none"} /></span><span style={cislo}>{cis(pocetIskier(v))}</span></button>
                  {!v.bezDarov && <button type="button" ref={(el) => { darBtn.current[v.id] = el; }} onClick={() => setSheet({ typ: "dar", v })} style={stlpecBtn}><span style={kruh(false, true)}><Ik d={IK.dar} s={k(24)} w={2.2} /></span><span style={cislo}>Darovať</span></button>}
                  <button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); setSheet({ typ: "zdielat", v }); }} style={stlpecBtn}><span style={kruh()}><Ik d={IK.zdielat} s={k(22)} w={2.2} /></span><span style={cislo}>Zdieľať</span></button>
                </div>

                {/* autor, popis, zbierka (bez pruhu) — najvyššie po vrch tlačidla Darcovia (150 − 28 + výška stĺpca − 10 px medzera);
                    pri nízkej obrazovke sa skracuje popis, autor a karta zbierky ostávajú celé */}
                <div style={{ position: "absolute", left: k(14), right: k(78), bottom: `calc(${k(28)}px + env(safe-area-inset-bottom, 0px))`, maxHeight: Math.min(miesto.stlpec + k(150 - 28 - 10), miesto.volne), display: "flex", flexDirection: "column", gap: k(10), color: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: k(10), flex: "none" }}>
                    {/* ťuk na logo alebo meno = profil autora */}
                    <button type="button" aria-label={`Profil: ${v.autor}`} onClick={() => setProfil(v)} style={{ flex: 1, minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", gap: k(10), padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "#fff", textAlign: "left" }}>
                      <span style={{ width: k(42), height: k(42), flex: "none", borderRadius: v.org ? k(12) : "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: k(14), fontWeight: 800, color: "#3F6E2A", textShadow: "none" }}>{v.ini}</span>
                      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: k(2) }}>
                        <b style={{ fontSize: k(15.5), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.autor}</b>
                        <span style={{ fontSize: k(12.5), opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.kto}</span>
                      </span>
                    </button>
                    <button type="button" aria-pressed={sled} onClick={() => prepniSledovanie(v.autor)} style={{ flex: "none", minHeight: Math.max(44, k(44)), padding: `${k(6)}px 0`, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center" }}>
                      <span style={{ whiteSpace: "nowrap", height: k(32), display: "flex", alignItems: "center", padding: `0 ${k(12)}px`, borderRadius: k(16), border: "1.5px solid #fff", background: sled ? "transparent" : "#fff", fontSize: k(12.5), fontWeight: 800, color: sled ? "#fff" : "#1D211B", textShadow: sled ? TIEN : "none" }}>{sled ? "Sledujete" : "Sledovať"}</span></button>
                  </div>
                  {/* popis: 2 riadky + „… viac"; ťuk rozbalí celý (tmavé pozadie, najviac 45 % výšky videa, ďalej posúvanie), ďalší ťuk zbalí */}
                  {rozbaleny === v.id
                    ? <button type="button" aria-expanded="true" onClick={() => setRozbaleny(null)}
                        style={{ flex: "0 1 auto", minHeight: 44, maxHeight: miesto.video * 0.45, overflowY: "auto", overscrollBehavior: "contain", padding: `${k(10)}px ${k(12)}px`, borderRadius: k(14), border: "none", background: "rgba(0,0,0,.6)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: k(14.5), lineHeight: 1.45, color: "#fff", whiteSpace: "pre-line" }}>{v.popis}</button>
                    : <button type="button" aria-expanded={dlhe.has(v.id) ? "false" : undefined} onClick={() => { if (dlhe.has(v.id)) setRozbaleny(v.id); }}
                        style={{ flex: "0 1 auto", minHeight: 44, maxHeight: `${2 * 1.45}em`, display: "flex", overflow: "hidden", padding: 0, border: "none", background: "transparent", cursor: dlhe.has(v.id) ? "pointer" : "default", textAlign: "left", fontFamily: "inherit", fontSize: k(14.5), lineHeight: 1.45, color: "#fff" }}>
                        <span ref={(el) => { popisRef.current[v.id] = el; }} style={{ display: "block", overflow: "hidden" }}>
                          {dlhe.has(v.id) && <><span aria-hidden="true" style={{ float: "right", height: "calc(100% - 1.45em)" }} />
                            <span style={{ float: "right", clear: "both", fontWeight: 800 }}>… viac</span></>}
                          {v.popis}
                        </span>
                      </button>}
                  {v.zbierka && <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: k(4), padding: `${k(10)}px ${k(12)}px`, borderRadius: k(14), background: "rgba(0,0,0,.45)", border: "1px solid rgba(255,255,255,.18)" }}>
                    <span style={{ fontSize: k(12.5), opacity: 0.85 }}>{v.zbierka.pozn}</span><b style={{ fontSize: k(14) }}>{v.zbierka.nazov}</b>
                  </div>}
                </div>
              </div>);
          })}
        </div>

        {/* ---------- let daru (naraz 1) ---------- */}
        {aktualny && <DarLet key={kluc(aktualny)} dar={aktualny} poloha={poloha} onPas={(d) => ukazPas(darHlavne(d), darKam(d))} onKoniec={dalsi} />}

        {/* ---------- hlavička: názov, (oblasti), druh, živý pás ---------- */}
        <div ref={hlavRef} style={{ ...VRSTVA, position: "absolute", left: 0, right: 0, top: 0, padding: "max(14px, env(safe-area-inset-top)) 14px 10px", display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
            <button type="button" onClick={zavriIskry} aria-label="Späť" style={{ width: 44, height: 44, marginLeft: -10, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.spat} s={24} w={2.4} /></button>
            <b style={{ flex: 1, fontSize: 20, color: "#fff" }}>Iskry</b>
            {TESTOVACIA && <button type="button" onClick={simuluj} style={{ minHeight: 32, padding: "0 10px", borderRadius: 10, border: "1px dashed rgba(255,255,255,.5)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>Cudzí dar (DEV)</button>}
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>{list.length ? `${Math.min(idx, list.length - 1) + 1} / ${list.length}` : ""}</span>
            {pc && <button type="button" onClick={prepniCelu} aria-label={cela ? "Zavrieť celú obrazovku" : "Celá obrazovka"} title={cela ? "Zavrieť celú obrazovku (F)" : "Celá obrazovka (F)"} style={{ width: 44, height: 44, marginRight: -8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", filter: "drop-shadow(0 1px 3px rgba(0,0,0,.7))" }}><Ik d={cela ? IK.celaOff : IK.celaOn} s={22} w={2.2} /></button>}
          </div>
          {ISKRY_CFG.zobrazOblasti && <div role="tablist" aria-label="Oblasť" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "rgba(0,0,0,.4)", pointerEvents: "auto" }}>
            {ISKRY_CFG.oblasti.map((t, i) => <button key={t} type="button" role="tab" aria-selected={oblast === i} onClick={() => setOblast(i)} style={{ flex: 1, height: 34, border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: oblast === i ? 800 : 600, background: oblast === i ? "#fff" : "transparent", color: oblast === i ? "#1D211B" : "#fff" }}>{t}</button>)}
          </div>}
          <div ref={druhyRef} onScroll={merajOkraje} className="isk-scroll" role="tablist" aria-label="Druh" style={{ display: "flex", gap: 6, margin: "-6px 0", overflowX: "auto", scrollbarWidth: "none", pointerEvents: "auto",
            ...(okraje.p ? (() => { const m = "linear-gradient(90deg, #000 calc(100% - 24px), transparent 100%)"; return { maskImage: m, WebkitMaskImage: m }; })() : {}) }}>
            {ISKRY_CFG.druhy.map((t, i) => <button key={t} type="button" role="tab" aria-selected={druh === i} onClick={(e) => { setDruh(i); setIdx(0); sc.current?.scrollTo({ top: 0 }); e.currentTarget.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" }); }}
              style={{ flex: "none", minHeight: 44, padding: "6px 0", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center" }}>
              <span style={{ whiteSpace: "nowrap", height: 32, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 16, border: "1px solid rgba(255,255,255,.4)", fontSize: 12.5, fontWeight: druh === i ? 800 : 600, background: druh === i ? "rgba(255,255,255,.9)" : "rgba(0,0,0,.3)", color: druh === i ? "#1D211B" : "#fff", textShadow: druh === i ? "none" : TIEN }}>{t}</span></button>)}
          </div>
          {(pasDar || prepis) && <div ref={pasRef} role="button" tabIndex={0} aria-label="Dary v Iskrách" onClick={() => { if (pasDar && !prepis) skoc(pasDar.v.id); }} onKeyDown={(e) => { if (e.key === "Enter" && pasDar) skoc(pasDar.v.id); }}
            style={{ pointerEvents: "auto", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 14, background: "rgba(14,15,12,.6)", border: "1px solid rgba(255,255,255,.16)", color: "#fff" }}>
            <span style={{ flex: "none", display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", opacity: 0.8, whiteSpace: "nowrap", marginBottom: 2 }}>DNES V ISKRÁCH</span>
              <b style={{ fontSize: 17, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{eur(Math.round(dnesSuma))}</b>
            </span>
            <span style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.2)" }} />
            <span key={prepis ? prepis.k : `t${tick}`} className="isk-pas" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
              <b style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prepis ? prepis.hl : pasDar ? darHlavne(darZRiadku(pasDar.r, pasDar.v)) : ""}</b>
              <span style={{ fontSize: 12, opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prepis ? prepis.kam : pasDar ? `${darKam(darZRiadku(pasDar.r, pasDar.v))} · ${relCas(pasDar.r.cas)}` : ""}</span>
            </span>
          </div>}
          {/* KARTA 41b · QR Iskry pod pásom: malý, inverzný, ~35 %; ťuk = QR na celú obrazovku + Kopírovať odkaz */}
          {akt && <button type="button" onClick={() => setQrVelky(akt)} aria-label="QR tejto Iskry" style={{ pointerEvents: "auto", alignSelf: "flex-end", minWidth: 44, minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", opacity: 0.35, lineHeight: 0 }}>
            <DeedQr data={odkazIskry(akt.id)} odznak={akt.org ? "D++" : "D+"} retaz={akt.retazPct != null} variant="inverzny" size={52} /></button>}
        </div>

        {/* ---------- okná zdola ---------- */}
        {sheet?.typ === "darcovia" && <Harok onClose={() => setSheet(null)}><DarcoviaObsah v={sheet.v} /></Harok>}
        {sheet?.typ === "dar" && <Harok onClose={() => setSheet(null)}>
          <DarovatObsah v={sheet.v} registrovany={registrovany} onRychly={(k, s, sp) => rychly(sheet.v, k, s, sp)} onVlastna={() => { setSheet(null); setPlatba({ v: sheet.v, kanal: "eur" }); }} onNamietam={() => setSheet({ typ: "namietka", v: sheet.v })} />
        </Harok>}
        {sheet?.typ === "namietka" && <Harok onClose={() => setSheet(null)}><NamietkaObsah v={sheet.v} onHotovo={() => setSheet(null)} /></Harok>}
        {qrVelky && <div role="dialog" aria-modal="true" aria-label="QR tejto Iskry" onClick={() => setQrVelky(null)} style={{ position: "absolute", inset: 0, zIndex: 45, background: "rgba(14,15,12,.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16, textShadow: "none", cursor: "zoom-out" }}>
          <span style={{ background: "#fff", padding: 14, borderRadius: 22, lineHeight: 0 }}><DeedQr data={odkazIskry(qrVelky.id)} odznak={qrVelky.org ? "D++" : "D+"} retaz={qrVelky.retazPct != null} size={Math.min(320, Math.round((root.current?.clientWidth ?? 360) * 0.75))} /></span>
          <b style={{ color: "#fff", fontSize: 15 }}>{qrVelky.autor}</b>
          <span style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); void kopiruj(odkazIskry(qrVelky.id), toast); }} style={{ minHeight: 48, padding: "0 20px", borderRadius: 14, border: "none", background: "#fff", color: "#1D211B", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Kopírovať odkaz</button>
            <button type="button" onClick={() => setQrVelky(null)} style={{ minHeight: 48, padding: "0 20px", borderRadius: 14, border: "1.5px solid rgba(255,255,255,.5)", background: "transparent", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Zavrieť</button>
          </span>
        </div>}
        {/* profil autora (ťuk na meno alebo logo) — Späť vráti do prúdu na to isté video */}
        {profil && <div style={{ position: "absolute", inset: 0, zIndex: 40, overflowY: "auto", background: "var(--c-bg, #F1ECE1)", color: "var(--ink, #1D211B)", textShadow: "none", zoom: 1 / bezZoomu() } as CSSProperties}>
          <CudziProfil subjekt={profil.org ? { typ: "org", meno: profil.autor, lok: profil.kto.split(" · ").pop() } : { typ: "osoba", meno: profil.autor }} toast={toast} onBack={() => setProfil(null)} />
        </div>}
      </div>

      {/* PC: šípky mimo videa, 24 px od jeho pravého okraja (aj klávesy hore / dole) */}
      {pc && <div style={{ position: "absolute", left: "calc(100% + 24px)", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 12 }}>
        {([["hore", -1, "Predchádzajúce video"], ["dole", 1, "Ďalšie video"]] as const).map(([d, o, t]) => { const off = o < 0 ? idx <= 0 : idx >= list.length - 1; return (
          <button key={d} type="button" aria-label={t} disabled={off} onClick={() => posun(o)} style={{ width: 52, height: 52, borderRadius: "50%", border: "1px solid rgba(255,255,255,.22)", background: "rgba(0,0,0,.45)", cursor: off ? "default" : "pointer", opacity: off ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK[d]} s={26} w={2.4} /></button>); })}
      </div>}
      </div>

      {sheet?.typ === "zdielat" && <ZdielatIskru v={sheet.v} onClose={() => setSheet(null)} />}

      {platba && (() => { const s = sucetDarov(refIskry(platba.v)); return (
        <PlatobneOkno kanal={platba.kanal} suma={platba.suma} nazov={platba.v.zbierka?.nazov ?? platba.v.autor} registrovany={registrovany}
          pred={{ vyzbierane: s.suma, ciel: null, pocetDarov: s.pocet, darovDnes: 0 }} onClose={() => setPlatba(null)}
          onHotovo={(r) => { const v = platba.v; zaplatene(v, r.eur, kanalDaru(r.kanal, r.sposob)); }} />); })()}
    </div>);
}

// ---------- hárok zdola (vo vnútri prúdu) ----------
function Harok({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end", textShadow: "none" }}>
      <div onClick={(e) => e.stopPropagation()} className="pf-rise" style={{ width: "100%", maxHeight: "86%", overflowY: "auto", borderRadius: "26px 26px 0 0", background: "#EFEAE1", color: "#1D211B", padding: "16px 18px max(30px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 14 }}>
        <span aria-hidden="true" style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 3, background: "#CFC9BC" }} />
        {children}
      </div>
    </div>);
}
const lbl: CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: ".04em", color: "#5B5D53" };
const sumaBtn: CSSProperties = { flex: 1, minHeight: 52, borderRadius: 14, border: "1.5px solid #D9D3C7", background: "#E4DFD5", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#1D211B" };

function DarovatObsah({ v, registrovany, onRychly, onVlastna, onNamietam }: { v: Iskra; registrovany: boolean;
  onRychly: (k: KanalPlatby, suma: number, sposob?: "karta" | "sepa") => void; onVlastna: () => void; onNamietam: () => void }) {
  const [mena, setMena] = useState<"c" | "d">("c");
  const over = overujemIskru(v.id), nam = namietkaIskry(v.id);
  const rad = (t: string, polozky: { t: string; on: () => void }[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{t && <span style={lbl}>{t}</span>}
      <div style={{ display: "flex", gap: 8 }}>{polozky.map((p) => <button key={p.t} type="button" onClick={p.on} style={sumaBtn}>{p.t}</button>)}</div></div>);
  return (<>
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 18 }}>Darovať · {v.autor}</b><span style={{ fontSize: 13, color: "#5B5D53" }}>{v.zbierka ? `Ide na zbierku: ${v.zbierka.nazov}` : "Ide autorovi videa"}</span></span>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ ...lbl, flex: 1 }}>MIKRO DAR</span>
        <span role="radiogroup" aria-label="Mena mikro daru" style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: "#DCD8CF" }}>
          {([["EURC", "c"], ["DeeD", "d"]] as const).map(([t, k]) => <button key={k} type="button" role="radio" aria-checked={mena === k} onClick={() => setMena(k)} style={{ minHeight: 32, padding: "0 12px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: mena === k ? 800 : 600, background: mena === k ? "#F6F3EC" : "transparent", color: "#1D211B" }}>{t}</button>)}
        </span></span>
      {rad("", mena === "c" ? ISKRY_CFG.mikroEurc.map((s) => ({ t: `${cis(s)} EURC`, on: () => onRychly("eurc", s) })) : ISKRY_CFG.mikroDeed.map((s) => ({ t: `${s} DeeD`, on: () => onRychly("deed", s) })))}
    </div>
    {rad("SEPA PREVOD", ISKRY_CFG.sepa.map((s) => ({ t: eur(s), on: () => onRychly("eur", s, "sepa") })))}
    {rad("KARTA", ISKRY_CFG.karta.map((s) => ({ t: eur(s), on: () => onRychly("eur", s, "karta") })))}
    <button type="button" onClick={onVlastna} style={{ minHeight: 48, borderRadius: 14, border: "1.5px solid #CFC9BC", background: "#F6F3EC", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#1D211B" }}>Vlastná suma</button>
    {registrovany && <div style={{ display: "flex", gap: 8 }}>
      <button type="button" aria-pressed={over} onClick={() => prepniOverenie(v.id)} style={{ flex: 1, minHeight: 48, borderRadius: 14, border: "1.5px solid #A9C08F", background: over ? "#C9D9B8" : "#DCE3D0", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#3F6E2A" }}>{over ? "Overujete" : "Overujem"}</button>
      <button type="button" onClick={onNamietam} disabled={!!nam} style={{ flex: 1, minHeight: 48, borderRadius: 14, border: "1.5px solid #D9B4AE", background: "#F3E1DE", cursor: nam ? "default" : "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#8E3B2F", opacity: nam ? 0.6 : 1 }}>{nam ? "Namietané" : "Namietam"}</button>
    </div>}
    <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "#85867B" }}>{registrovany ? "Rýchla suma zaplatí jedným ťukom uloženou platbou. " : ""}Darovať môže ktokoľvek. Overiť alebo namietať môžu len prihlásení.</span>
    {/* split a dorovnanie pri Iskre príde neskôr — zatiaľ len text */}
    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 10, borderTop: "1px solid #D9D3C7", fontSize: 13.5, fontWeight: 800, color: "#4E7D37" }}>
      <span>Firma? Dorovnať dary pri tomto videu ›</span><span>Pridať video do Reťaze dobra ›</span>
    </div>
  </>);
}

function NamietkaObsah({ v, onHotovo }: { v: Iskra; onHotovo: () => void }) {
  const [d, setD] = useState<number | null>(null);
  const [t, setT] = useState("");
  const ok = d != null && t.trim().length >= ISKRY_CFG.namietkaMinZnakov;
  return (<>
    <b style={{ fontSize: 18 }}>Prečo namietate</b>
    <div role="radiogroup" aria-label="Dôvod námietky" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {DOVODY_NAMIETKY.map((x, i) => { const on = d === i; return (
        <button key={x} type="button" role="radio" aria-checked={on} onClick={() => setD(i)} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "10px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", fontSize: 14.5, fontWeight: 700, color: "#1D211B", background: on ? "#F3E1DE" : "#F6F3EC", border: `1.5px solid ${on ? "#D9B4AE" : "#D9D3C7"}` }}>
          <span style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", border: `2px solid ${on ? "#8E3B2F" : "#9C978B"}`, background: on ? "#8E3B2F" : "transparent" }} /><span style={{ flex: 1 }}>{x}</span></button>); })}
    </div>
    <textarea value={t} onChange={(e) => setT(e.target.value)} aria-label="Zdôvodnenie námietky" placeholder="Popíšte, čo nesedí (povinné, aspoň 20 znakov)" style={{ minHeight: 96, padding: "12px 14px", borderRadius: 14, border: "1.5px solid #CFC9BC", background: "#F6F3EC", fontFamily: "inherit", fontSize: 15, lineHeight: 1.45, resize: "none", color: "#1D211B", outline: "none" }} />
    <span style={{ fontSize: 12, lineHeight: 1.45, color: "#85867B" }}>{sZnackou("Námietku posúdi DEED+. Video sa medzitým ďalej neposúva. Za vedome nepravdivé námietky hrozí zákaz namietať.")}</span>
    <button type="button" aria-disabled={!ok} onClick={() => { if (!ok) return; podajNamietku(v.id, DOVODY_NAMIETKY[d!], t.trim()); toast("Námietku sme prijali."); onHotovo(); }}
      style={{ minHeight: 50, border: "none", borderRadius: 14, cursor: ok ? "pointer" : "default", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", background: "#8E3B2F", opacity: ok ? 1 : 0.4 }}>Odoslať námietku</button>
  </>);
}

function DarcoviaObsah({ v }: { v: Iskra }) {
  const riadky = darcoviaPre(refIskry(v));
  return (<>
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 18 }}>Darcovia · {riadky.length}</b><span style={{ fontSize: 13, color: "#5B5D53" }}>Mená len tých, ktorí ich dovolili ukázať.</span></span>
    {riadky.map((r) => { const m = identitaDarcu(r), s = zobrazenaSuma(r); return (
      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid #D9D3C7" }}>
        <span style={{ width: 38, height: 38, flex: "none", borderRadius: "50%", background: "#DCE3D0", color: "#3F6E2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{m === "Anonym" || m === "Anonymný darca" ? "?" : m.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14.5 }}>{m}</b><span style={{ fontSize: 12.5, color: "#5B5D53" }}>{relCas(r.cas)}</span></span>
        {s && <b style={{ fontSize: 14.5, color: "#3F6E2A" }}>{s}</b>}
      </div>); })}
  </>);
}

// ---------- KARTA 41 · Zdieľať Iskru — náš hárok zdola (ten istý diel ako zdieľanie v appke) ----------
// QR tejto Iskry (zväčšiť, stiahnuť) · Kopírovať odkaz · Stiahnuť video s vodoznakom (server) · Ďalšie možnosti (systémové zdieľanie).
// TODO (server): video s vypáleným vodoznakom DEED+ a menom autora.
export function ZdielatIskru({ v, onClose }: { v: Iskra; onClose: () => void }) {
  const url = odkazIskry(v.id);
  const [velky, setVelky] = useState(false);
  const male: CSSProperties = { minHeight: 44, padding: "0 12px", borderRadius: 12, background: "var(--bg)", border: "1px solid var(--cardBd)", color: "var(--ink)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const riadok: CSSProperties = { minHeight: 48, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)" };
  const dalsie = async () => {
    if (typeof navigator.share === "function") { try { await navigator.share({ title: `${v.autor} · Iskra`, text: v.popis, url }); } catch { /* zrušené */ } }
    else void kopiruj(url, toast);
  };
  return (<>
    <SpolocnyHarok onClose={onClose} hlavicka={<>
      <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--bSoft)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.zdielat} s={22} w={2} c="currentColor" /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>Zdieľať Iskru</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.autor}</span>
      </span>
    </>}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 12, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        <button type="button" onClick={() => setVelky(true)} aria-label="Zväčšiť QR" style={{ background: "#fff", padding: 8, borderRadius: 12, flex: "none", lineHeight: 0, border: "none", cursor: "zoom-in" }}><DeedQr data={url} odznak={v.org ? "D++" : "D+"} retaz={v.retazPct != null} size={132} /></button>
        <span style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <b style={{ fontSize: 15 }}>QR tejto Iskry</b>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>Kto ho naskenuje, otvorí toto video a môže hneď darovať.</span>
          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setVelky(true)} style={male}>Zväčšiť</button>
            <button type="button" onClick={() => void stiahniDeedQr({ data: url, odznak: v.org ? "D++" : "D+", retaz: v.retazPct != null, variant: "svetly", nazov: `iskra-${v.id}` })} style={male}>Stiahnuť</button>
          </span>
        </span>
      </div>
      <button type="button" onClick={() => void kopiruj(url, toast)} style={riadok}>Kopírovať odkaz</button>
      <button type="button" onClick={() => toast("Video s vodoznakom zatiaľ nie je pripravené.")} style={riadok}>{sZnackou("Stiahnuť video s vodoznakom DEED+")}</button>
      <button type="button" onClick={() => void dalsie()} style={{ ...riadok, border: "none", background: "var(--gGrad)", color: "#fff" }}>Ďalšie možnosti</button>
    </SpolocnyHarok>
    {velky && createPortal(<div role="dialog" aria-modal="true" aria-label="QR tejto Iskry" onClick={() => setVelky(false)} style={{ position: "fixed", inset: 0, zIndex: 160, background: "rgba(14,15,12,.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 16, cursor: "zoom-out" }}>
      <span style={{ background: "#fff", padding: 16, borderRadius: 24, lineHeight: 0 }}><DeedQr data={url} size={Math.min(420, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.7))} /></span>
      <button type="button" onClick={() => setVelky(false)} style={{ minHeight: 48, padding: "0 26px", borderRadius: 14, border: "none", background: "#fff", color: "#1D211B", fontSize: 15.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Zavrieť</button>
    </div>, document.body)}
  </>);
}
