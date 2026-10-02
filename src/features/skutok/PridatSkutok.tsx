// KARTA 21 (+ 22) · Pridať skutok — JEDEN komponent pre celú appku (Domov ＋, Good, Moje skutky,
// Aktivity, Charita, Môj QR, detail zbierky, oznam „AI sa pýta"). Otvára sa cez otvorPridatSkutok().
// 6 krokov: Sám / So skupinou (→ bežný / skutok ako dar) · Opíš · AI kontroluje · Ešte pár otázok · Náhľad · Hotovo.
// AI = existujúce ohodnot() (POST /api/score, verdikt ok / doplnit / zamietnut) — backend sa nemení.
import { TESTOVACIA } from "@/lib/testovacia";
import { DeedZnacka } from "@/components/DeedZnacka";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useLayout } from "@/components/context";
import { RichTextInput } from "@/components/richtext";
import { DeedQr, stiahniDeedQr } from "@/components/deedqr";
import { toast } from "@/components/toast";
import { Svetlusik } from "@/features/zbierka/Svetlusik";
import { vibruj } from "@/features/zbierka/animacie";
import { ohodnot, ScoreChyba, type ScoreOdpoved } from "@/features/skore/api";
import { spracujFotku } from "@/lib/obrazok";
import { useLokalita } from "@/lib/lokalita";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useSession } from "@/lib/session";
import { cisloZbierky, najdiZbierku } from "@/lib/zbierky";
import { verejneBeziace } from "@/lib/retaz";
import { profilZPamate, nacitajProfil, uvodZPamate, nacitajUvod, potvrdUvod } from "@/lib/profilStranky";
import { OBLASTI, normalizuj, pridajSkutok, upravSkutok, koncept as nacitajKoncept, ulozKoncept, nastavOhlasenie, ohlasenie as aktOhlasenie,
  konceptOrg, ulozKonceptOrg, pridajSkutokOrg,
  type Oblast, type ZbierkaVolba, type Ucastnik, type MojSkutok } from "@/lib/mojeSkutky";
import { otvorAkciu } from "@/lib/akcia";
import { useVazbyOsoby } from "@/lib/zamestnanci";
import { useNastaveniaAppky } from "@/lib/nastaveniaAppky";
import { navrhniAkciu, VOLBA_VETA, type FirmaVolba } from "@/lib/mojaFirma";
import { VolbaFirma } from "@/features/profil/Zamestnavatel";
import { qk, repo } from "@/data";
import type { GoodPolozka } from "@/types";
import { usePridatSkutok, zavriPridatSkutok, type PridatParams } from "./otvor";
import { zastavDiktovanie } from "@/lib/diktovanie";
import "@/styles/platba.css";

/** karma za bod skóre z AI (placeholder — presné pravidlo určí kalibrácia) */
const KARMA_ZA_BOD = 10;
const MAX_FOTIEK_AI = 3; // backend berie max 3 obrázky

// ---------- drobné UI ----------
const P = {
  lbl: { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" } as CSSProperties,
  pole: { height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, color: "var(--ink)", outline: "none", fontFamily: "inherit", width: "100%", minWidth: 0 } as CSSProperties,
  hlavne: { width: "100%", height: 56, borderRadius: 18, border: "none", fontSize: 17, fontWeight: 800, color: "#fff", cursor: "pointer", background: "var(--gGrad)", fontFamily: "inherit", transition: "opacity .2s ease" } as CSSProperties,
  karta: { borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" } as CSSProperties,
  maly: { fontSize: 12, lineHeight: 1.45, color: "var(--ink4)" } as CSSProperties,
};
const Ik = ({ d, s = 18, w = 2 }: { d: string; s?: number; w?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>);
const IK = {
  fajka: "M20 6 9 17l-5-5", plus: "M12 5v14M5 12h14", kriz: "M6 6l12 12M18 6L6 18", sipka: "M9 6l6 6-6 6", lupa: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  ai: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z", zamok: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  sam: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  skupina: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  sken: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16",
  dar: "M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z",
  poslat: "M22 2L11 13M22 2l-7 20-4-9-9-4z", mic: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3",
  poloha: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  potvrdil: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M16 11l2 2 4-4",
  retaz: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  ceruzka: "M4 20h4L19 9l-4-4L4 16z",
};

function Zaskrt({ on, onClick, children, zarovnaj = "center" }: { on: boolean; onClick: () => void; children: ReactNode; zarovnaj?: "center" | "flex-start" }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick}
      style={{ display: "flex", alignItems: zarovnaj, gap: 12, minHeight: 48, padding: "10px 14px", borderRadius: 14, background: "var(--card)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", width: "100%" }}>
      <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 7, flex: "none", border: `2px solid ${on ? "var(--green)" : "var(--chkBd)"}`, background: on ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginTop: zarovnaj === "flex-start" ? 1 : 0 }}>
        {on && <Ik d={IK.fajka} s={13} w={3} />}</span>
      <span style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{children}</span>
    </button>
  );
}
const Cip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" aria-pressed={on} onClick={onClick} style={{ display: "flex", alignItems: "center", minHeight: 44, padding: "0 14px", borderRadius: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink2)" }}>{children}</button>);
const Poznamka = ({ farba, children }: { farba: "gold" | "blue" | "green"; children: ReactNode }) => {
  const f = { gold: ["var(--goldBg)", "var(--goldBd)"], blue: ["var(--bSoft)", "var(--bBd)"], green: ["var(--gSoft)", "var(--gBd)"] }[farba];
  return <div style={{ padding: "10px 12px", borderRadius: 13, background: f[0], border: `1px solid ${f[1]}`, fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>{children}</div>;
};

// ---------- text ----------
const cistyText = (html: string) => { const d = document.createElement("div"); d.innerHTML = html; return (d.textContent || "").replace(/\s+/g, " ").trim(); };
const VULGAR = /hovn|nasr|kokot|pič|jeb|srač|debil|kurv|chuj|zmrd/i;
/** názov od AI: max 50 znakov, vždy celé slová */
function nazovZTextu(t: string): string {
  const v = t.split(/[.!?\n]/)[0].trim().replace(/[,;:]$/, "");
  if (v.length <= 50) return v ? v[0].toUpperCase() + v.slice(1) : "Môj skutok";
  const x = v.slice(0, 51).replace(/\s+\S*$/, "");
  return x[0].toUpperCase() + x.slice(1);
}
/** „Ukáž, ako to upraví AI" — len úprava textu (nie hodnotenie). Zachová značky HTML, opraví len text. */
function upravHtml(html: string): string {
  const d = document.createElement("div");
  d.innerHTML = html;
  const bloky = Array.from(d.querySelectorAll("p, li, h3")) as HTMLElement[];
  (bloky.length ? bloky : [d]).forEach((b) => {
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
    const uzly: Text[] = [];
    while (w.nextNode()) uzly.push(w.currentNode as Text);
    uzly.forEach((u) => { u.data = u.data.replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").replace(/!+/g, "."); });
    const prvy = uzly.find((u) => u.data.trim());
    if (prvy) prvy.data = prvy.data.replace(/^(\s*)(\S)/, (_, s, c) => s + c.toUpperCase());
    const posl = [...uzly].reverse().find((u) => u.data.trim());
    if (posl && b.tagName !== "H3" && b.tagName !== "LI" && !/[.?…]\s*$/.test(posl.data)) posl.data = posl.data.replace(/\s*$/, ".");
  });
  return d.innerHTML;
}
const OBL_SLOVA: [Oblast, RegExp][] = [
  ["Zvieratá", /pes|psy|psík|mačk|útul|zvier/i], ["Príroda", /čist|smet|odpad|potok|park|les|breh|strom|sadil|príro/i],
  ["Šport", /beh|behal|bicyk|\bkm\b|cvič|futbal|turnaj|šport/i], ["Hudba", /hral|spiev|gitar|koncert|hudb/i],
  ["Umenie", /maľ|kresl|divadl|výstav|umen/i], ["Učenie", /kniha|knihu|učil|douč|kurz|jazyk|čítal|predčít/i],
  ["Zdravie", /krv|plazm|lekár|zdrav|nemocn|dialýz/i], ["Viera", /kostol|fara|omš|modlit/i], ["Komunita", /brigád|komunit|ihrisk|lavič/i],
];
const navrhniOblast = (t: string): Oblast => OBL_SLOVA.find(([, r]) => r.test(t))?.[0] ?? "Pomoc";
const KAT: Partial<Record<Oblast, GoodPolozka["kat"]>> = { Príroda: "Priroda", Zdravie: "Zdravie", Učenie: "Ucenie", Pomoc: "Pomoc" };
const teraz = () => Date.now();

// ---------- zbierky na výber ----------
function zbierky(): ZbierkaVolba[] {
  return verejneBeziace().map((z) => ({ id: z.id, nazov: z.nazov, org: z.org, cislo: cisloZbierky(z.id) }));
}

type Media = { src: string; video: boolean; sek?: number };

// OPRAVY 121 · skutok za charitu: limity ako pri zbierke (karta 37)
const ORG_RIADKY = 12, ORG_ZNAKY = 1500, ORG_NAZOV = 80, ORG_FOTIEK = 8, ORG_VIDEO_S = 45;
const ORG_NASTROJE = ["bold", "italic", "insertUnorderedList", "diktovat"];
/** Pravidlá obsahu (kod/pravidla-obsahu-charity.md · Fotky a videá + Dôstojnosť) */
const PRAVIDLA_ORG: [string, string][] = [
  ["Súhlas zobrazených ľudí.", "Každá rozpoznateľná osoba na zábere súhlasila so zverejnením. Súhlas si uchovávate vy, pri spore ho máte vedieť predložiť."],
  ["Deti len so súhlasom rodiča alebo zákonného zástupcu.", "Bez neho dieťa nefotíte, alebo mu zakryjete tvár."],
  ["Vlastné zábery.", "Fotky a videá sú vaše alebo máte právo ich použiť. Žiadne obrázky z internetu, žiadne cudzie zábery vydávané za vlastnú činnosť."],
  ["Súkromie prijímateľa.", "Nezverejňujte adresu, EČV, čísla dokladov ani iné údaje, podľa ktorých sa dá nájsť byt alebo dom človeka v núdzi. Polohové údaje z fotiek čistíme automaticky, ale text a záber strážite vy."],
  ["Držte mieru.", "Fotka má ukazovať pomoc a výsledok, nie nešťastie v najhoršej chvíli."],
  ["Dôstojnosť.", "Človek, ktorému pomáhate, nie je rekvizita. Ak si želá anonymitu, dostane ju. Zdravotný stav a podrobnosti o rodine len v rozsahu, s ktorým výslovne súhlasil."],
];
const PRED_ZVEREJNENIM = ["Píšete to tak, ako sa to naozaj stalo.", "Ľudia na fotkách o tom vedia a súhlasia, deti len so súhlasom rodiča.", "Žiadna politika, žiadna reklama. Toto je miesto pre skutky.", "Príbeh nech rozpráva pomoc, nie nešťastie."];
const dlzkaVidea = (src: string) => new Promise<number>((ok) => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => ok(v.duration || 0); v.onerror = () => ok(-1); v.src = src; });
const fmtSek = (x: number) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, "0")}`;
type Vysledok = { verdikt: "ok"; odp: ScoreOdpoved } | { verdikt: "zamietnut" } | null;

// =====================================================================
export function PridatSkutokHost() {
  const p = usePridatSkutok();
  if (!p) return null;
  return <PridatSkutok key={JSON.stringify(p)} {...p} onClose={zavriPridatSkutok} />;
}

export function PridatSkutok(pr: PridatParams & { onClose: () => void }) {
  const { wide, desktop } = useLayout();
  const ja = usePouzivatel();
  const lok = useLokalita();
  const session = useSession();
  const qc = useQueryClient();
  const userId = session && "ucet_id" in session ? String(session.ucet_id) : "demo";
  // OPRAVY 121: skutok za charitu — tá istá kostra, mení sa len to, čo je v bode 121 (o = vykanie)
  const org = !!pr.organizacia;
  const stranka = pr.strankaId ?? pr.autor ?? "charita";
  const o = (ty: string, vy: string) => (org ? vy : ty);
  const [orgLogo, setOrgLogo] = useState<string | null>(() => (org ? profilZPamate(stranka).ulozeny?.logo ?? null : null));
  const [uvodOn, setUvodOn] = useState(() => org && !uvodZPamate(stranka, "skutok"));
  useEffect(() => {
    if (!org) return;
    let ziva = true;
    void nacitajProfil(stranka).then((z) => { if (ziva) setOrgLogo(z.ulozeny?.logo ?? null); });
    void nacitajUvod(stranka).then((u) => { if (ziva) setUvodOn(!u.skutok); });
    return () => { ziva = false; };
  }, [org, stranka]);
  const [po2Org, setPo2Org] = useState("");
  const [riadky, setRiadky] = useState(0);
  const [zn1, setZn1] = useState(0);
  const [zn2, setZn2] = useState(0);
  const [prvOrg, setPrvOrg] = useState(false);
  const [chybaMed, setChybaMed] = useState("");
  // OPRAVY 122 (2): pred zverejnením charita vyberie, kam pôjdu peniaze — po zverejnení zapečatené
  const [kam, setKam] = useState<null | "centralna" | "ina" | "bez">(null);
  const [inaZ, setInaZ] = useState<ZbierkaVolba | null>(null);
  const [kamQ, setKamQ] = useState("");
  const [otv, setOtv] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setOtv(true)); return () => cancelAnimationFrame(r); }, []);

  const predZbierka = pr.zbierka ? (() => { const z = najdiZbierku(pr.zbierka!); return z ? [{ id: z.id, nazov: z.nazov, org: z.ziadatel.meno, cislo: cisloZbierky(z.id) }] : []; })() : [];
  const ohl = pr.dokoncit ? aktOhlasenie() : null;

  // krok 1
  const [kr, setKr] = useState<1 | 2 | 3 | 4 | 5 | 6>(pr.dokoncit || pr.zAkcie || pr.otazky ? (pr.otazky ? 4 : 2) : 1);
  const [k1, setK1] = useState<"typ" | "skupina" | "dar">(pr.start === "skupina" ? "skupina" : pr.start === "solo" || pr.zbierka ? "dar" : "typ");
  const [cesta, setCesta] = useState<"s" | "a" | "b">(pr.zAkcie ? "b" : ohl?.sk ? "b" : "s");
  const [dar, setDar] = useState(!!pr.zbierka || !!ohl?.dar.length || !!pr.zAkcie?.dar?.length);
  const [darZ, setDarZ] = useState<ZbierkaVolba[]>(predZbierka.length ? predZbierka : ohl?.dar ?? pr.zAkcie?.dar ?? []);
  const [darQ, setDarQ] = useState("");
  const [kon, setKon] = useState(() => (org ? konceptOrg(stranka) : nacitajKoncept()));
  // krok 2
  const [plan, setPlan] = useState(false);
  const [planKedy, setPlanKedy] = useState("");
  const [planLink, setPlanLink] = useState("");
  const [nz0, setNz0] = useState(ohl?.nazov ?? pr.skutok?.nazov ?? "");
  const [po, setPo] = useState(ohl?.popis ?? pr.skutok?.popis ?? "");
  const [prav, setPrav] = useState(false);
  const [pvF, setPvF] = useState("každý týždeň");
  const [aiSt, setAiSt] = useState<null | "beh" | "ok" | "zle">(ohl || pr.skutok ? "ok" : null);
  const [aiC, setAiC] = useState(false);
  const [aiU, setAiU] = useState(false);
  const [pred, setPred] = useState<string | null>(null);
  const [poF, setPoF] = useState<string | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [dok, setDok] = useState<{ nazov: string; subor: string }[]>([]);
  const [potv, setPotv] = useState<null | "caka" | "ok">(null);
  const [su, setSu] = useState(false);
  const [uc, setUc] = useState<Ucastnik[]>(pr.zAkcie ? pr.zAkcie.ucastnici.map((meno) => ({ meno, overeny: true })) : []);
  const [kde, setKde] = useState(pr.zAkcie?.miesto || lok.mesto);
  const [kedy, setKedy] = useState(pr.zAkcie?.trvanie || "Dnes");
  const [oblast, setOblast] = useState<Oblast | null>(pr.oblast ?? null);
  // AI
  const [otazky, setOtazky] = useState<string[]>(pr.otazky ?? []);
  const [odp, setOdp] = useState<string[]>(() => (pr.otazky ?? []).map(() => ""));
  const [kolo, setKolo] = useState<1 | 2>(1);
  const [vysl, setVysl] = useState<Vysledok>(null);
  const [nz, setNz] = useState(pr.skutok?.nazov ?? "");
  const [po2, setPo2] = useState(() => (pr.skutok ? cistyText(pr.skutok.popis) : ""));
  const [pravda, setPravda] = useState(false);
  // karta 21 · 11: riadok Firma (len prepojený so zamestnávateľom; firemná akcia je vždy s menom, riadok sa neukáže)
  const nast = useNastaveniaAppky();
  const mojeFirmy = useVazbyOsoby(ja.celeMeno).filter((v) => v.stav === "potvrdeny").map((v) => v.firma);
  const [firmaV, setFirmaV] = useState<FirmaVolba>(nast.firmaPredvolba);
  // hotovo
  const [id] = useState(() => `m${teraz()}`);
  const [rz, setRz] = useState<{ open: boolean; z: ZbierkaVolba | null; v: number; hot: boolean }>({ open: false, z: null, v: 20, hot: false });
  const [qrSkop, setQrSkop] = useState(false);
  // hárky
  const [zo, setZo] = useState(false);
  const [prv, setPrv] = useState(false);

  const fotoRef = useRef<HTMLInputElement>(null);
  const predRef = useRef<HTMLInputElement>(null);
  const poRef = useRef<HTMLInputElement>(null);
  const dokRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const liveT = useRef<number>(0);

  const text = useMemo(() => cistyText(po), [po]);
  const maMedia = media.length > 0 || !!pred || !!poF;
  const dokaz = maMedia || dok.length > 0 || potv === "ok";
  const citlive = maMedia && /chor|nemocn|dieť|deti|bezdomov|nehod|pohreb/i.test(text);
  const sk = cesta !== "s";
  const rozpisane = !!(text || nz0.trim());

  // ---- zavretie ----
  const zavri = () => { setOtv(false); zastavDiktovanie(); setTimeout(pr.onClose, 280); }; // OPRAVY 125: Zavrieť vždy, diktovanie hneď abort
  const skusZavriet = () => { if (kr >= 2 && kr <= 5 && rozpisane) return setZo(true); zavri(); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { if (zo) setZo(false); else if (prv) setPrv(false); else if (prvOrg) setPrvOrg(false); else skusZavriet(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  const ulozAkoKoncept = () => {
    const k = { sk, plan, nazov: nz0, popis: po, miesto: kde, kedy: plan ? planKedy : kedy, oblast, dar: dar ? darZ : [], ucastnici: uc, ulozene: teraz(), ...(org ? { popis2: po2Org } : {}) };
    if (org) ulozKonceptOrg(stranka, k); else ulozKoncept(k);
    setZo(false); zavri();
  };
  const pokracujKoncept = () => {
    if (!kon) return;
    setCesta(kon.sk ? "b" : "s"); setPlan(kon.plan); setNz0(kon.nazov); setPo(kon.popis); setKde(kon.miesto);
    if (kon.plan) setPlanKedy(kon.kedy); else setKedy(kon.kedy);
    setOblast(kon.oblast); setDar(kon.dar.length > 0); setDarZ(kon.dar); setUc(kon.ucastnici);
    setAiSt(cistyText(kon.popis).length > 10 ? "ok" : null);
    if (org) { setPo2Org(kon.popis2 ?? ""); ulozKonceptOrg(stranka, null); } else ulozKoncept(null);
    setKon(null); setKr(2);
  };

  // profil → Rozpracovaný skutok → Dokončiť: rovno pokračovať v koncepte
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (pr.koncept && kon) pokracujKoncept(); }, []);

  // ---- živá kontrola textu pod poľom ----
  const zmenPo = (html: string) => {
    if (html === po) return; // blur editora pošle ten istý text — kontrolu nespúšťať znova
    setPo(html); setAiC(false); setAiU(false);
    const t = cistyText(html);
    window.clearTimeout(liveT.current);
    if (t.length > 10) { setAiSt("beh"); liveT.current = window.setTimeout(() => setAiSt(VULGAR.test(t) ? "zle" : "ok"), 900); }
    else setAiSt(null);
  };
  const aiNavrhNazov = nz0.trim() ? nz0.trim()[0].toUpperCase() + nz0.trim().slice(1) : nazovZTextu(text);


  // ---- dôkazy ----
  const nacitajObr = async (f: File) => (f.type.startsWith("video/") ? { src: URL.createObjectURL(f), video: true } : { src: await spracujFotku(f, { pomer: null, maxSirka: 1568 }), video: false });
  const pridajMedia = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files).slice(0, 7 - media.length)) {
      try { const m = await nacitajObr(f); setMedia((s) => [...s, m].slice(0, 7)); } catch (e) { toast(e instanceof Error ? e.message : "Súbor sa nepodarilo načítať."); }
    }
  };
  // OPRAVY 121: skutok za charitu — najviac 8 fotiek a 1 video do 45 s (ako pri zbierke)
  const pridajMediaOrg = async (files: FileList | null) => {
    if (!files) return;
    setChybaMed("");
    let fot = media.filter((m) => !m.video).length, vid = media.some((m) => m.video);
    const nove: Media[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith("video/")) {
        if (vid) { setChybaMed("Video môže byť len jedno. Najprv odstráňte to, ktoré tam je."); continue; }
        const src = URL.createObjectURL(f); const d = await dlzkaVidea(src);
        if (d < 0) { setChybaMed("Toto video sa nedá otvoriť. Skúste iný súbor."); continue; }
        if (d > ORG_VIDEO_S + 0.5) { setChybaMed(`Video má ${fmtSek(d)}. Najviac je 45 sekúnd, skráťte ho v telefóne a skúste znova.`); continue; }
        nove.push({ src, video: true, sek: d }); vid = true;
      } else {
        if (fot >= ORG_FOTIEK) { setChybaMed(`Pridali sme ${ORG_FOTIEK - media.filter((m) => !m.video).length}. Najviac je 8 fotiek.`); break; }
        try { nove.push({ src: await spracujFotku(f, { pomer: null, maxSirka: 1568 }), video: false }); fot++; } catch (e) { setChybaMed(e instanceof Error ? e.message : "Súbor sa nepodarilo načítať."); }
      }
    }
    if (nove.length) setMedia((m) => [...m, ...nove]);
  };
  const posunMedia = (i: number, kam: -1 | 1) => setMedia((m) => { const j = i + kam; if (j < 0 || j >= m.length) return m; const n = [...m]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const pridajPP = async (k: "pred" | "po", files: FileList | null) => {
    const f = files?.[0]; if (!f) return;
    try { const m = await spracujFotku(f, { pomer: null, maxSirka: 1568 }); (k === "pred" ? setPred : setPoF)(m); } catch (e) { toast(e instanceof Error ? e.message : "Fotku sa nepodarilo načítať."); }
  };
  const pridajDoklad = (files: FileList | null) => {
    const f = files?.[0]; if (!f) return;
    setDok((d) => [...d, { nazov: f.name.replace(/\.[^.]+$/, ""), subor: f.name }]);
  };
  const poziadajPotvrdenie = async () => {
    const url = `https://deed.sk/potvrd/${id}`;
    if (typeof navigator.share === "function") { try { await navigator.share({ title: "Potvrď, že som ti pomohol", url }); } catch { /* zrušené */ } }
    else { try { await navigator.clipboard.writeText(url); toast("Odkaz na potvrdenie skopírovaný"); } catch { /* bez schránky */ } }
    setPotv("caka");
  };

  // ---- skupina B ----
  const ucN = uc.length ? `${uc.length + 1} spolu s ${org ? "vami" : "tebou"}` : "";
  const pozvi = async () => {
    const url = `https://deed.sk/skutok/${id}/pridaj-sa`;
    if (typeof navigator.share === "function") { try { await navigator.share({ title: "Bol si pri tom? Potvrď v DEED+", url }); } catch { return; } }
    else { try { await navigator.clipboard.writeText(url); toast("Pozvánka skopírovaná"); } catch { /* bez schránky */ } }
    setUc((u) => [...u, { meno: `Pozvánka ${u.filter((x) => !x.overeny).length + 1}`, overeny: false }]);
  };
  // pozvánka kolegom vyzerá rovnako ako každá iná (aj od šéfa) — žiadne „povinné"
  const pozviKolegov = async () => {
    const url = `https://deed.sk/skutok/${id}/pridaj-sa`;
    if (typeof navigator.share === "function") { try { await navigator.share({ title: "Bol si pri tom? Potvrď v DEED+", url }); } catch { return; } }
    else { try { await navigator.clipboard.writeText(url); toast("Pozvánka pre kolegov skopírovaná"); } catch { /* bez schránky */ } }
    setUc((u) => [...u, { meno: `Kolega ${u.filter((x) => !x.overeny).length + 1}`, overeny: false }]);
  };
  const DEMO_MENA = ["Lucia H.", "Tomáš B.", "Jana N.", "Peťo K.", "Mária S.", "Ondrej V.", "Katka L.", "Miro D."];
  const naskenuj = () => {
    // skener QR „Na akciu" — overenie tokenu robí server; v DEV pribudne ukážkový účastník
    if (!TESTOVACIA) { toast("Skener účastníkov pribudne s napojením na server."); return; }
    const n = DEMO_MENA.find((m) => !uc.some((u) => u.meno === m));
    if (n) { setUc((u) => [...u, { meno: n, overeny: true }]); vibruj(8); }
  };

  // ---- AI hodnotenie ----
  // kontext pre hodnotenie ide za oddeľovač — do učesaného textu nepatrí
  const opisPreAi = (zaklad: string) => {
    const r = [zaklad, "--- Kontext pre hodnotenie:"];
    if (plan) r.push(`Ohlásený skutok, kedy: ${planKedy || "neuvedené"}.${planLink ? ` Odkaz na prenos: ${planLink}` : ""}`);
    if (prav) r.push(`Robí to pravidelne: ${pvF}.`);
    if (pred || poF) r.push(`Priložené fotky pred a po.`);
    if (dok.length) r.push(`Doklady: ${dok.map((d) => d.nazov || d.subor).join(", ")}.`);
    if (potv === "ok") r.push("Obdarovaný skutok potvrdil v appke.");
    if (sk) r.push(`Skupinový skutok, ${uc.filter((u) => u.overeny).length + 1} overených účastníkov${pr.zAkcie ? `, organizovaná akcia (${pr.zAkcie.trvanie})` : ""}.`);
    if (dar) r.push(`Skutok ako dar pre zbierku ${darZ[0]?.nazov ?? ""}.`);
    return r.length > 2 ? r.join("\n") : zaklad;
  };
  const fotkyPreAi = () => [pred, poF, ...media.filter((m) => !m.video).map((m) => m.src)].filter((x): x is string => !!x).slice(0, MAX_FOTIEK_AI);
  const hodnot = async (k: 1 | 2, opis: string) => {
    setKr(3);
    const od = teraz();
    try {
      const v = await ohodnot({ opis, miesto: kde, fotky: fotkyPreAi(), maVideo: media.some((m) => m.video), anonymne: false, userId, kolo: k });
      await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (teraz() - od)))); // Svetlúšik aspoň chvíľu
      const t = (v.ucesanyText ?? "").split(/\n?---/)[0].trim() || aiText();
      setPo2(t); setNz(aiNavrhNazov.length ? aiNavrhNazov : nazovZTextu(t));
      if (!oblast) setOblast(navrhniOblast(`${text} ${t}`));
      if (v.verdikt === "zamietnut") { setVysl({ verdikt: "zamietnut" }); setOtazky([]); }
      else if (v.verdikt === "doplnit" && k === 1) { setOtazky(v.otazky ?? []); setOdp((v.otazky ?? []).map(() => "")); setVysl(null); }
      else { setOtazky([]); setVysl({ verdikt: "ok", odp: v.verdikt === "ok" ? v : { ...v, pasmo: 0 } }); }
      setKolo(k); setKr(4);
    } catch (e) {
      toast(e instanceof ScoreChyba ? e.message : "Hodnotenie sa nepodarilo, skús znova.");
      setKr(2);
    }
  };
  const aiText = () => cistyText(upravHtml(po));
  // OPRAVY 121: bez AI — chyba kroku nad Pokračovať (texty z prototypu Novy skutok PC)
  const chybaOrg = !nz0.trim() ? "Doplňte názov skutku" : !text ? "Napíšte, čo ste urobili" : riadky > ORG_RIADKY ? "Skráťte text na 12 riadkov" : maMedia && !su ? "Potvrďte súhlas ľudí na fotkách a videách" : "";
  const k2Ok = org ? !chybaOrg : text.length > 10 && (!maMedia || su) && aiSt === "ok" && (!dar || dokaz || plan);
  const k2Dalej = () => {
    if (!k2Ok) return;
    if (org) { setNz(nz0.trim()); setPo2(po); if (!oblast) setOblast("Pomoc"); setKr(4); return; }
    void hodnot(1, opisPreAi(cistyText(aiU ? po : upravHtml(po))));
  };
  const k4Dalej = () => {
    if (vysl?.verdikt === "zamietnut") return;
    if (otazky.length) {
      const dopl = otazky.map((q, i) => (odp[i]?.trim() ? `${q} → ${odp[i].trim()}` : null)).filter(Boolean).join("\n");
      void hodnot(2, `${opisPreAi(text)}\n--- Doplnenie: ${dopl || "(bez odpovede)"}`);
      return;
    }
    setPravda(false); setKr(5);
  };

  // ---- zverejnenie ----
  const odpAi = vysl?.verdikt === "ok" ? vysl.odp : null;
  const pasmo = odpAi?.pasmo ?? 0;
  const doFeedu = !plan && pasmo >= 1 && dokaz;
  const karma = odpAi?.skore != null ? Math.max(1, Math.round(odpAi.skore * KARMA_ZA_BOD)) : 3;
  const kamOk = kam === "bez" || (kam === "centralna" && !!pr.centralna) || (kam === "ina" && !!inaZ);
  const zverejni = () => {
    if (!pravda) return;
    if (org) {
      if (!kamOk) return;
      // OPRAVY 121: navonok autor charita, vnútri meno organizátora; bez karmy; ide ľuďom v lokalite charity a na jej profil
      const fotky = media.filter((m) => !m.video).map((m) => m.src);
      const popisHtml = po + (cistyText(po2Org) ? po2Org : "");
      const kamZ = kam === "centralna" ? pr.centralna ?? null : kam === "ina" ? inaZ : null;
      pridajSkutokOrg(stranka, {
        id, nazov: nz, popis: popisHtml, oblast: oblast ?? "Pomoc", miesto: kde, datum: teraz(), stav: "ok", karma: null,
        det: "Ľuďom vo vašej lokalite a na váš profil.", fotky, ucastnici: sk ? uc.filter((u) => u.overeny).map((u) => u.meno) : undefined,
        dar: kamZ ? [kamZ] : undefined, peniaze: kam ?? "bez", za: pr.autor, vytvoril: ja.celeMeno || undefined, zaznam: pr.zAkcie?.zaznam, seria: prav ? pvF : undefined,
      });
      const it: GoodPolozka = {
        id: teraz(), typ: "skutok", velkost: "med", kat: KAT[oblast ?? "Pomoc"] ?? "Komunita", autor: pr.autor || "Charita", num: 0, emoji: "",
        fotky: fotky.length ? fotky : orgLogo ? [orgLogo] : [], titul: nz, popis: cistyText(popisHtml), lok: kde, overene: true, skore: 0, typSituacie: "normal", modul: "good", dni: 0, podpora: 0, lat: lok.lat, lng: lok.lng,
      } as GoodPolozka;
      qc.setQueryData<GoodPolozka[]>(qk.good.feed, (old = []) => [it, ...old]);
      repo.good.vytvor(it, ja.ucetId).then((nid) => { if (nid) qc.invalidateQueries({ queryKey: qk.good.feed }); }).catch(() => {});
      vibruj([10, 40, 10]);
      setKr(6); return;
    }
    if (plan) {
      nastavOhlasenie({ id, nazov: nz, popis: po2, kedy: planKedy, odkaz: planLink, stav: "plan", dar: dar ? darZ : [], sk });
      setKr(6); return;
    }
    const fotky = [poF, pred, ...media.filter((m) => !m.video).map((m) => m.src)].filter((x): x is string => !!x);
    const s: MojSkutok = {
      id, nazov: nz, popis: `<p>${po2.replace(/[<>&]/g, "")}</p>`, oblast: oblast ?? "Pomoc", miesto: kde, datum: teraz(),
      stav: doFeedu ? "ok" : "ja", karma: doFeedu ? karma : Math.min(karma, 5),
      det: doFeedu ? "Overila AI. Skutok je vo feede tvojej štvrte. Overenia od susedov mu pridávajú dôveru." : "AI: ostáva v tvojom denníku.",
      fotky, osobny: !doFeedu, ucastnici: sk ? uc.filter((u) => u.overeny).map((u) => u.meno) : undefined, dar: dar ? darZ : undefined,
      seria: prav ? pvF : undefined, retaz: ohl?.retaz, firma: mojeFirmy.length ? firmaV : undefined,
    };
    pridajSkutok(s);
    if (ohl) nastavOhlasenie(null);
    if (doFeedu) {
      const it: GoodPolozka = {
        id: teraz(), typ: "skutok", velkost: pasmo >= 3 ? "big" : "medium", kat: KAT[s.oblast] ?? "Komunita", autor: pr.autor || ja.celeMeno || "Ty", num: 0, emoji: "",
        fotky, titul: nz, popis: po2, lok: kde, overene: true, skore: odpAi?.skore ?? 0, typSituacie: "normal", modul: "good", dni: 0, podpora: 0, lat: lok.lat, lng: lok.lng,
      } as GoodPolozka;
      qc.setQueryData<GoodPolozka[]>(qk.good.feed, (old = []) => [it, ...old]);
      repo.good.vytvor(it, ja.ucetId).then((nid) => { if (nid) qc.invalidateQueries({ queryKey: qk.good.feed }); }).catch(() => {});
    }
    vibruj([10, 40, 10]);
    setKr(6);
  };
  const zapecat = () => {
    if (!rz.z) return;
    const o = aktOhlasenie();
    if (plan && o) nastavOhlasenie({ ...o, retaz: { zbierka: rz.z, pct: rz.v } }); // ohlásený skutok: reťaz prejde na hotový skutok
    else upravSkutok(id, { retaz: { zbierka: rz.z, pct: rz.v } });
    setRz((r) => ({ ...r, hot: true }));
  };

  // ---- krok Späť ----
  const krTit = ["Pridať skutok", o("Opíš skutok", "Opíšte skutok"), "Chvíľku", org ? "Kam pôjdu peniaze" : vysl?.verdikt === "zamietnut" ? "Hodnotenie" : "Ešte pár otázok", "Náhľad", "Hotovo"][kr - 1];
  const spat = () => {
    if (kr === 1) { if (k1 === "dar" && !pr.zbierka && pr.start !== "solo") return setK1(cesta === "s" ? "typ" : "skupina"); if (k1 === "skupina" && pr.start !== "skupina") return setK1("typ"); return zavri(); }
    if (kr === 6) return zavri();
    if (kr === 2) return rozpisane ? setZo(true) : setKr(1);
    if (kr === 3) return;
    if (org) return setKr(kr === 5 ? 4 : 2); // bez AI: Náhľad → Kam pôjdu peniaze → opis
    setKr(kr === 4 ? 2 : 4);
  };
  const spatT = kr === 1 && k1 === "typ" ? "Zavrieť" : kr === 6 ? "Zavrieť" : kr === 1 && ((k1 === "dar" && (pr.zbierka || pr.start === "solo")) || (k1 === "skupina" && pr.start === "skupina")) ? "Zavrieť" : "Späť";

  // ---- výber zbierok (skutok ako dar) ----
  const vsetkyZ = useMemo(() => zbierky(), []);
  const q = normalizuj(darQ);
  const viditelne = useMemo(() => {
    const vybr = darZ.map((z) => z.id);
    const zhoda = (z: ZbierkaVolba) => normalizuj(z.nazov).includes(q) || normalizuj(z.org).includes(q) || normalizuj(z.cislo).includes(q);
    const ostatne = vsetkyZ.filter((z) => !vybr.includes(z.id) && (q ? zhoda(z) : true));
    return [...darZ, ...(q ? ostatne : ostatne.slice(0, Math.max(0, 3 - darZ.length)))];
  }, [vsetkyZ, darZ, q]);
  const prepniZ = (z: ZbierkaVolba) => setDarZ((s) => (s.some((x) => x.id === z.id) ? s.filter((x) => x.id !== z.id) : [...s, z]));
  const krDBlok = dar && !darZ.length;
  const krDDalej = () => {
    if (krDBlok) return;
    if (cesta === "a") { zavri(); otvorAkciu(dar ? darZ : undefined, org ? { stranka, nazov: pr.autor || "Charita", organizator: ja.celeMeno || "", typ: "prichod" } : undefined); return; }
    setKr(2);
  };

  // ======================= RENDER =======================
  const telo = (deti: ReactNode, paticka?: ReactNode) => (<>
    <div key={`${kr}-${k1}`} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}><div style={{ padding: "10px 18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>{deti}</div></div>
    {paticka && <div style={{ flex: "none", padding: "12px 18px max(22px, env(safe-area-inset-bottom))", borderTop: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 8, background: "var(--sheet)" }}>{paticka}</div>}
  </>);

  const volbaKarta = (n: string, s: string, ic: string, onClick: () => void, bg = "var(--gSoft)", c = "var(--green)") => (
    <button type="button" key={n} onClick={onClick} style={{ ...P.karta, display: "flex", alignItems: "center", gap: 14, minHeight: 88, padding: "14px 16px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", width: "100%" }}>
      <span style={{ width: 48, height: 48, borderRadius: 14, background: bg, color: c, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={ic} s={22} /></span>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16.5, fontWeight: 800 }}>{n}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)", marginTop: 3, lineHeight: 1.4 }}>{s}</span></span>
      <span style={{ color: "var(--ink3)", display: "flex" }}><Ik d={IK.sipka} s={16} w={2.4} /></span>
    </button>);
  const spatNaVyber = (onClick: () => void) => <button type="button" onClick={onClick} style={{ alignSelf: "flex-start", border: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "var(--ink3)", cursor: "pointer", padding: "12px 0", fontFamily: "inherit" }}>‹ Späť na výber</button>;

  let obsah: ReactNode;
  if (kr === 1) {
    obsah = telo(<>
      {kon && k1 === "typ" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--gold)" }}>ROZPÍSANÝ SKUTOK</span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(kon.nazov || cistyText(kon.popis) || "Bez názvu").slice(0, 60)}</span></span>
          <button type="button" onClick={pokracujKoncept} style={{ flex: "none", height: 44, padding: "0 14px", borderRadius: 12, border: "none", background: "var(--ink)", color: "var(--bg)", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Pokračovať</button>
        </div>)}
      {k1 === "typ" && <>
        {volbaKarta("Sám", o("Urobil som niečo dobré, pre niekoho alebo pre seba.", "Urobili ste niečo dobré pre niekoho."), IK.sam, () => { setCesta("s"); if (org) setKr(2); else setK1("dar"); })}
        {volbaKarta("So skupinou", o("Spoločná akcia, brigáda alebo zbierka. Pridáš aj ostatných.", "Spoločná akcia, brigáda alebo zbierka. Pridáte aj ostatných."), IK.skupina, () => setK1("skupina"))}
      </>}
      {k1 === "skupina" && <>
        <div style={{ fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.5 }}>Ako ste to robili?</div>
        {volbaKarta("Akcia práve začína", o("Naskenuješ účastníkov na mieste a spustíš čas. Všetci sú hneď overení.", "Dobrovoľníci na mieste naskenujú QR charity. Všetci sú hneď overení."), IK.sken, () => { setCesta("a"); if (org) { zavri(); otvorAkciu(undefined, { stranka, nazov: pr.autor || "Charita", organizator: ja.celeMeno || "", typ: "prichod" }); } else setK1("dar"); })}
        {volbaKarta("Už sme pomohli", o("Opíšeš skutok a pridáš pomocníkov skenom alebo pozvánkou.", "Opíšete skutok a pridáte pomocníkov skenom alebo pozvánkou."), IK.skupina, () => { setCesta("b"); if (org) setKr(2); else setK1("dar"); }, "var(--bSoft)", "var(--blue)")}
        {pr.start !== "skupina" && spatNaVyber(() => setK1("typ"))}
      </>}
      {k1 === "dar" && <>
        <div style={{ fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.5 }}>{o("Je to bežný skutok, alebo ho robíš pre zbierku?", "Je to bežný skutok, alebo ho robíte pre zbierku?")}</div>
        <div style={{ borderRadius: 20, background: dar ? "var(--card)" : "var(--field)", border: `1.5px solid ${dar ? "var(--goldBd)" : "var(--cardBd)"}`, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" role="switch" aria-checked={dar} onClick={() => setDar(!dar)} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", border: "none", background: "transparent", padding: 0, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            <span style={{ width: 44, height: 44, borderRadius: 13, background: "var(--goldBg)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.dar} s={21} /></span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>Skutok ako dar</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)", marginTop: 2, lineHeight: 1.4 }}>{o("Nemáš peniaze na dar? Pomôž skutkom. Všetky odmeny pôjdu na zbierku.", "Pomôžte skutkom. Všetky odmeny pôjdu na zbierku.")}</span></span>
            <span aria-hidden="true" style={{ width: 48, height: 28, borderRadius: 14, background: dar ? "var(--green)" : "var(--chkBd)", position: "relative", flex: "none", transition: "background .2s ease" }}><span style={{ position: "absolute", top: 3, left: 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transform: dar ? "translateX(20px)" : "none", transition: "transform .2s ease" }} /></span>
          </button>
          {dar && <div className="pf-rise" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={P.lbl}>PRE KTORÚ ZBIERKU</div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, height: 48, padding: "0 12px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", color: "var(--ink3)" }}>
              <Ik d={IK.lupa} s={18} />
              <input value={darQ} onChange={(e) => setDarQ(e.target.value)} placeholder="Názov alebo číslo zbierky" aria-label="Hľadať zbierku" style={{ flex: 1, minWidth: 0, height: 44, border: "none", background: "transparent", fontSize: 16, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
            </label>
            {q && !viditelne.length && <div style={{ padding: "8px 2px", fontSize: 13, color: "var(--ink3)" }}>{o("Nič sme nenašli. Skús iný názov alebo číslo, napr. 47 821.", "Nič sme nenašli. Skúste iný názov alebo číslo, napr. 47 821.")}</div>}
            {viditelne.map((z) => { const i = darZ.findIndex((x) => x.id === z.id), c = i >= 0; return (
              <button type="button" role="checkbox" aria-checked={c} key={z.id} onClick={() => prepniZ(z)} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "6px 12px", borderRadius: 13, cursor: "pointer", background: c ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${c ? "var(--gBd)" : "var(--cardBd)"}`, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 7, flex: "none", border: `2px solid ${c ? "var(--green)" : "var(--chkBd)"}`, background: c ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{c && <Ik d={IK.fajka} s={13} w={3} />}</span>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{z.nazov}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}><span style={{ whiteSpace: "nowrap" }}>#{z.cislo}</span> · {z.org}</span></span>
                {c && <span style={{ flex: "none", padding: "3px 8px", borderRadius: 8, background: i === 0 ? "var(--goldBg)" : "var(--card)", color: i === 0 ? "var(--gold)" : "var(--ink3)", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{i === 0 ? "hlavná" : `${i + 1}. v poradí`}</span>}
              </button>); })}
            <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{!darZ.length ? o("Vyber hlavnú zbierku. Ďalšie môžeš pridať do poradia.", "Vyberte hlavnú zbierku. Ďalšie môžete pridať do poradia.") : o("100 % odmien ide na hlavnú zbierku. Vybrať môžeš aj ďalšie, pôjdu na rad, keď sa hlavná naplní. Po zapečatení sa nedá zmeniť.", "100 % odmien ide na hlavnú zbierku. Vybrať môžete aj ďalšie, pôjdu na rad, keď sa hlavná naplní. Po zapečatení sa nedá zmeniť.")}</div>
            {darZ.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>
              <b style={{ color: "var(--ink)" }}>Ako fungujú ďalšie zbierky</b>
              <span>{o("Prvá je tvoja hlavná. Ak bude mať tvoj skutok veľký ohlas a hlavná zbierka sa naplní, odmeny pôjdu na ďalšiu v poradí. Pridať ich môžeš koľko chceš.", "Prvá je vaša hlavná. Ak bude mať váš skutok veľký ohlas a hlavná zbierka sa naplní, odmeny pôjdu na ďalšiu v poradí. Pridať ich môžete koľko chcete.")}</span>
              <span>{o("Ak sa hlavná nenaplní, nič sa nedeje. Nikto nevidí, že máš nastavené ďalšie zbierky.", "Ak sa hlavná nenaplní, nič sa nedeje. Nikto nevidí, že máte nastavené ďalšie zbierky.")}</span>
              <span>{o("Prepnutie urobí systém sám, nemusíš nič nastavovať. Na QR skutku vždy uvidíš, pre ktorú zbierku sa práve zbiera, a keď sa hlavná naplní, dáme ti vedieť.", "Prepnutie urobí systém sám, nemusíte nič nastavovať. Na QR skutku vždy uvidíte, pre ktorú zbierku sa práve zbiera, a keď sa hlavná naplní, dáme vám vedieť.")}</span>
            </div>}
          </div>}
        </div>
        {!pr.zbierka && pr.start !== "solo" && spatNaVyber(() => setK1(cesta === "s" ? "typ" : "skupina"))}
      </>}
    </>, k1 === "dar" ? <button type="button" onClick={krDDalej} aria-disabled={krDBlok} style={{ ...P.hlavne, opacity: krDBlok ? 0.45 : 1 }}>{dar ? "Pokračovať so zbierkou" : "Pokračovať"}</button> : undefined);
  } else if (kr === 2) {
    const pp = ([["Pred", pred, predRef, "linear-gradient(135deg,#C9C4B8,#9C968A)"], ["Po", poF, poRef, "linear-gradient(135deg,#B9C7CF,#7E97A8)"]] as const);
    obsah = telo(<>
      {org && uvodOn && <div className="pf-rise" style={{ borderRadius: 18, background: "var(--gSoft)", border: "1px solid var(--gBd)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 19, fontWeight: 800 }}>Veríme vám</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>Vaše skutky ani zbierky nekontroluje umelá inteligencia. Ako organizácia za svoj obsah zodpovedáte sami a my veríme, že píšete pravdu.</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>Preto sú u nás tresty za klamstvo a podvod prísne a bez výnimiek. Nepravdivý obsah stiahneme, zbierky pozastavíme a pri podvode organizácia stratí overenie aj účet.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
          <button type="button" onClick={() => { setUvodOn(false); void potvrdUvod(stranka, "skutok"); }} style={{ height: 48, padding: "0 24px", borderRadius: 14, border: "none", background: "var(--green)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Rozumiem</button>
          <button type="button" onClick={() => setPrvOrg(true)} style={{ height: 44, border: "none", background: "transparent", padding: 0, color: "var(--green)", fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Pravidlá obsahu ›</button>
        </div>
      </div>}
      {!org && <div role="radiogroup" aria-label="Stav skutku" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
        {([["Už som to urobil", false], ["Chystám sa to urobiť", true]] as const).map(([t, v]) => (
          <button type="button" role="radio" aria-checked={plan === v} key={t} onClick={() => setPlan(v)} disabled={!!ohl && v}
            style={{ height: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", background: plan === v ? "var(--card)" : "transparent", color: plan === v ? "var(--ink)" : "var(--ink3)", opacity: ohl && v ? 0.45 : 1 }}>{t}</button>))}
      </div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 13, background: "var(--card)", border: "1px solid var(--cardBd)", fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>
        <span style={{ color: "var(--green)", display: "flex", flex: "none" }}><Ik d={IK.zamok} /></span><span>{o("Nič sa nezverejní, kým na konci neuvidíš náhľad a neťukneš ", "Nič sa nezverejní, kým na konci neuvidíte náhľad a neťuknete ")}<b style={{ color: "var(--ink)" }}>Pridať skutok</b>.</span>
      </div>

      {sk && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><span style={P.lbl}>{o("SPOLU SO MNOU BOLI", "DOBROVOĽNÍCI")}</span><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{ucN}</span></div>
        <div style={{ ...P.karta, borderRadius: 16, padding: "2px 12px" }}>
          {uc.map((u, i) => (
            <div key={u.meno} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800, flex: "none" }}>{u.overeny ? u.meno.split(" ").map((x) => x[0]).join("").slice(0, 2) : "?"}</span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{u.meno}</span><span style={{ display: "block", fontSize: 12.5, color: u.overeny ? "var(--gInk)" : "var(--gold)" }}>{u.overeny ? (org ? "pripojený skenom QR charity" : "overený skenom") : "čaká na potvrdenie"}</span></span>
              <button type="button" onClick={() => setUc((x) => x.filter((y) => y.meno !== u.meno))} aria-label={`Odstrániť ${u.meno}`} style={{ width: 44, height: 44, border: "none", borderRadius: 10, background: "transparent", color: "var(--ink3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.kriz} s={16} /></button>
            </div>))}
          {!uc.length && <div style={{ padding: "14px 0", fontSize: 13.5, color: "var(--ink3)" }}>{o("Zatiaľ nikto. Pridaj ľudí, ktorí pomáhali s tebou.", "Zatiaľ nikto. Pridajte ľudí, ktorí pomáhali s vami.")}</div>}
        </div>
        {!pr.zAkcie ? <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" onClick={naskenuj} style={{ height: 46, borderRadius: 13, border: "1px solid var(--gBd)", background: "var(--gSoft)", fontSize: 14, fontWeight: 700, color: "var(--gInk)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "inherit" }}><Ik d={IK.sken} s={16} />Naskenovať</button>
            <button type="button" onClick={pozvi} style={{ height: 46, borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 14, fontWeight: 700, color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "inherit" }}><Ik d={IK.poslat} s={16} />Poslať pozvánku</button>
          </div>
          <div style={P.maly}>{o("Pomocníkov pridáš", "Pomocníkov pridáte")} do 2 hodín po skutku. Kto dostane pozvánku, musí potvrdiť, že bol pri tom. Každý potom môže pridať aj svoje fotky.</div>
          {mojeFirmy.length > 0 && !org && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" onClick={pozviKolegov} style={{ minHeight: 46, padding: "4px 8px", borderRadius: 13, border: "1px solid var(--sek-oBd)", background: "var(--goldBg)", fontSize: 13.5, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.25 }}>Pozvať kolegov z firmy</button>
            <button type="button" onClick={() => { navrhniAkciu(mojeFirmy[0], { t: nz0.trim() || "Spoločný skutok s kolegami", kedy: new Date().toISOString().slice(0, 10) }); toast(`Návrh sme poslali firme ${mojeFirmy[0]}`); }} style={{ minHeight: 46, padding: "4px 8px", borderRadius: 13, border: "1.5px dashed var(--sek-gBd)", background: "transparent", fontSize: 13.5, fontWeight: 700, color: "var(--sek-g)", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.25 }}>Navrhnúť firme ako firemnú akciu</button>
          </div>}
        </> : <div style={P.maly}>{org ? "Dobrovoľníci sa pripojili skenom QR charity na mieste. Čas a miesto sú vyplnené z akcie. Skutok aj karmu dostanú do svojho denníka." : "Účastníci z akcie sú overení skenom na mieste. Čas a miesto sú vyplnené z akcie. Každý dostane odkaz a môže pridať svoje fotky k spoločnému skutku."}</div>}
        {org && uc.length > 0 && <div style={P.maly}>V texte môžete spomenúť ľudí, ktorí sa pripojili, napr. „Peter K. a Jana boli s nami“. Mená sú v tvare, aký si sami nastavili.</div>}
      </div>}

      {org ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}><span style={{ fontSize: 21, fontWeight: 800 }}>Čo ste urobili</span><span style={{ fontSize: 14, color: "var(--ink3)" }}>Komu ste pomohli a ako. Pár viet stačí.</span></div>
        <span style={{ fontSize: 15, fontWeight: 800, marginTop: 6 }}>Názov skutku</span>
        <input value={nz0} onChange={(e) => setNz0(e.target.value.slice(0, ORG_NAZOV))} maxLength={ORG_NAZOV} placeholder="Napríklad: Teplé jedlo pre 300 ľudí" aria-label="Názov skutku" style={P.pole} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}><span>Krátko a jasne: komu a čo.</span><span style={{ flex: "none", fontVariantNumeric: "tabular-nums" }}>{nz0.length} / {ORG_NAZOV}</span></div>
        <span style={{ fontSize: 15, fontWeight: 800, marginTop: 8 }}>Text</span>
        <span style={{ fontSize: 13, color: "var(--ink2)", marginTop: -4 }}>Toto ľudia uvidia hneď pod fotkou. Najviac 12 riadkov.</span>
        <RichTextInput vzhlad="sprava" value={po} onChange={(h) => setPo(h)} nastroje={ORG_NASTROJE} minH={130} chybaRam={riadky > ORG_RIADKY}
          ariaLabel="Text skutku" tvrdyLimit={Math.max(0, ORG_ZNAKY - zn2)} onRiadky={setRiadky} onZnaky={setZn1} />
        {(() => { const f = riadky > ORG_RIADKY ? "#A34A2A" : riadky > 9 ? "#8A5A2B" : "var(--green)"; return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--track, var(--seg))", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: "100%", borderRadius: 3, background: f, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, riadky / ORG_RIADKY)})`, transition: "transform .3s ease" }} /></span>
            <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: f }}>{riadky} z {ORG_RIADKY} riadkov</span>
          </div>); })()}
        {riadky > ORG_RIADKY && <span style={{ fontSize: 13, fontWeight: 700, color: "#A34A2A", lineHeight: 1.45 }}>Text je dlhší ako 12 riadkov. Skráťte ho, alebo časť presuňte nižšie do „Viac o skutku“.</span>}
        <span style={{ fontSize: 15, fontWeight: 800, marginTop: 8 }}>Viac o skutku <span style={{ fontWeight: 500, color: "var(--ink3)" }}>— nepovinné</span></span>
        <span style={{ fontSize: 13, color: "var(--ink2)", marginTop: -4 }}>Ukáže sa po ťuknutí na „… viac“. Sem patria podrobnosti, poďakovanie, kto pomáhal.</span>
        <RichTextInput vzhlad="sprava" value={po2Org} onChange={setPo2Org} nastroje={ORG_NASTROJE} minH={110}
          ariaLabel="Viac o skutku" tvrdyLimit={Math.max(0, ORG_ZNAKY - zn1)} onZnaky={setZn2} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink3)", lineHeight: 1.45 }}>Text z Wordu, Facebooku či Instagramu si tučné, kurzívu aj odrážky ponechá.</span>
          <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{(zn1 + zn2).toLocaleString("sk-SK")} / 1 500</span>
        </div>
        {/* OPRAVY 122 (1): „Robíme to pravidelne" ostáva, séria patrí stránke charity ("Chystáme sa" je skryté) */}
        <Zaskrt on={prav} onClick={() => setPrav(!prav)}><b style={{ color: "var(--ink)" }}>Robíme to pravidelne</b></Zaskrt>
        {prav && <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["každý týždeň", "každý mesiac", "inak"].map((t) => <Cip key={t} on={pvF === t} onClick={() => setPvF(t)}>{t}</Cip>)}</div>
          <div style={P.maly}>Nabudúce netreba písať celý text, stačí fotka. Na profile charity sa to spojí do série.</div>
        </>}
      </div> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={P.lbl}>{plan ? "ČO SA CHYSTÁŠ UROBIŤ" : "ČO SI UROBIL"}</div>
        <input value={nz0} onChange={(e) => setNz0(e.target.value)} maxLength={70} placeholder="Názov, napr. Pitný režim pre susedu (nepovinné)" aria-label="Názov skutku" style={P.pole} />
        <RichTextInput value={po} onChange={zmenPo} minH={130} ariaLabel="Opis skutku"
          placeholder={plan ? "Opíš, čo sa chystáš urobiť a prečo. Píš ako vieš, AI ti text upraví do najlepšej podoby." : "Opíš, čo si urobil, pre koho a prečo. Píš ako vieš, AI ti text upraví do najlepšej podoby."} />
        <div style={P.maly}>Text môžeš vložiť aj z Wordu alebo inej appky. Tučné, nadpisy, odrážky a odkazy ostanú, ostatné formátovanie sa zjednotí so vzhľadom <DeedZnacka />.</div>
        {!plan && !ohl && <>
          <Zaskrt on={prav} onClick={() => setPrav(!prav)}><b style={{ color: "var(--ink)" }}>Robím to pravidelne</b></Zaskrt>
          {prav && <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["každý týždeň", "každý mesiac", "inak"].map((t) => <Cip key={t} on={pvF === t} onClick={() => setPvF(t)}>{t}</Cip>)}</div>
            <div style={P.maly}>Nabudúce netreba písať celý text, stačí fotka a potvrdenie. V denníku sa to spojí do série.</div>
          </>}
        </>}
        <div aria-live="polite">{aiSt && (
          <div className="pf-rise" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 13, background: aiSt === "zle" ? "var(--goldBg)" : aiSt === "ok" ? "var(--gSoft)" : "var(--bSoft)", border: `1px solid ${aiSt === "zle" ? "var(--goldBd)" : aiSt === "ok" ? "var(--gBd)" : "var(--bBd)"}` }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, flex: "none", background: "var(--field)", color: aiSt === "zle" ? "var(--gold)" : aiSt === "ok" ? "var(--gInk)" : "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.ai} s={14} w={2.2} /></span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}><b style={{ color: aiSt === "zle" ? "var(--gold)" : aiSt === "ok" ? "var(--gInk)" : "var(--blue)" }}>{aiSt === "zle" ? "AI: takýto text nepridáme." : aiSt === "ok" ? (aiU ? "AI: text je upravený." : "AI: text je v poriadku.") : "AI číta…"}</b>{" "}
              {aiSt === "zle" ? "Obsahuje vulgarizmy alebo ponižuje človeka. Napíš, čo si urobil dobré." : aiSt === "ok" ? (aiU ? "Použil si návrh od AI." : "Ťukni Ukáž, ako to upraví AI, a uvidíš návrh.") : ""}</span>
          </div>)}</div>
        <button type="button" onClick={() => { if (aiSt === "ok") setAiC(true); }} aria-disabled={aiSt !== "ok"}
          style={{ alignSelf: "flex-start", flex: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 7, height: 44, padding: "0 16px", borderRadius: 13, border: "1px solid var(--bBd)", background: "var(--bSoft)", fontSize: 14.5, fontWeight: 700, color: "var(--blue)", cursor: "pointer", opacity: aiSt === "ok" ? 1 : 0.45, fontFamily: "inherit" }}><Ik d={IK.ai} s={16} />Ukáž, ako to upraví AI</button>
        {aiC && aiSt === "ok" && (
          <div className="pf-rise" style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--bBd)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--blue)" }}>NÁVRH OD AI · TAKTO TO BUDE VYZERAŤ</div>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{aiNavrhNazov}</div>
            <div className="ftext" style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }} dangerouslySetInnerHTML={{ __html: upravHtml(po) }} />
            <div style={{ fontSize: 12, color: "var(--ink4)" }}>Opravené: veľké písmeno, bodka, medzery · bez výkričníkov{nz0.trim() ? "" : " · doplnený názov"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button type="button" onClick={() => setAiC(false)} style={{ height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 14, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>Nechať môj</button>
              <button type="button" onClick={() => { setNz0(aiNavrhNazov); setPo(upravHtml(po)); setAiC(false); setAiU(true); }} style={{ height: 44, borderRadius: 12, border: "none", background: "var(--blue)", fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Použiť návrh</button>
            </div>
          </div>)}
      </div>}

      {org ? <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}><span style={{ fontSize: 21, fontWeight: 800 }}>Fotky a video</span><span style={{ fontSize: 14, color: "var(--ink3)" }}>Skutočné fotky človeka alebo miesta, komu pomáhate. Tvár a hlas presvedčia viac než text.</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}><span style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>Fotky a video skutku</span><span style={{ flex: "none" }}>{media.filter((m) => !m.video).length} / 8 fotiek · {(() => { const v = media.find((m) => m.video); return v ? `1 video ${fmtSek(v.sek ?? 0)}` : "bez videa"; })()}</span></div>
        {media.length > 0 && <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", gap: 8 }}>
          {media.map((m, i) => (
            <span key={m.src} style={{ aspectRatio: "4 / 3", borderRadius: 12, position: "relative", overflow: "hidden", background: "var(--seg)", border: i === 0 ? "2px solid var(--green)" : "1px solid var(--cardBd)" }}>
              {m.video ? <video src={m.src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={m.src} alt={`Fotka ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              {i === 0 && <span style={{ position: "absolute", left: 6, top: 6, padding: "2px 7px", borderRadius: 7, background: "var(--green)", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".05em" }}>HLAVNÉ</span>}
              {m.video && <span style={{ position: "absolute", left: 6, bottom: 5, fontSize: 11, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>VIDEO · {fmtSek(m.sek ?? 0)}</span>}
              <span style={{ position: "absolute", right: 4, bottom: 4, display: "flex", gap: 4 }}>
                {i > 0 && <button type="button" onClick={() => posunMedia(i, -1)} aria-label="Posunúť dopredu" style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: "rgba(29,33,27,.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d="M15 18l-6-6 6-6" s={15} w={2.4} /></button>}
                {i < media.length - 1 && <button type="button" onClick={() => posunMedia(i, 1)} aria-label="Posunúť dozadu" style={{ width: 32, height: 32, borderRadius: 9, border: "none", background: "rgba(29,33,27,.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={IK.sipka} s={15} w={2.4} /></button>}
              </span>
              <button type="button" onClick={() => setMedia((x) => x.filter((_, j) => j !== i))} aria-label={`Odstrániť ${m.video ? "video" : "fotku"} ${i + 1}`} style={{ position: "absolute", top: 2, right: 2, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(29,33,27,.6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Ik d={IK.kriz} s={13} /></button>
            </span>))}
        </div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" onClick={() => fotoRef.current?.click()} disabled={media.filter((m) => !m.video).length >= ORG_FOTIEK} style={{ minHeight: 64, padding: "8px 10px", borderRadius: 14, border: "1.5px dashed var(--gBd)", background: "transparent", color: "var(--green)", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, opacity: media.filter((m) => !m.video).length >= ORG_FOTIEK ? 0.45 : 1 }}><b style={{ fontSize: 14.5 }}>Pridať fotky</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>aj viac naraz</span></button>
          <button type="button" onClick={() => vidRef.current?.click()} disabled={media.some((m) => m.video)} style={{ minHeight: 64, padding: "8px 10px", borderRadius: 14, border: "1.5px dashed var(--gBd)", background: "transparent", color: "var(--green)", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, opacity: media.some((m) => m.video) ? 0.45 : 1 }}><b style={{ fontSize: 14.5 }}>Pridať video</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>nepovinné · jedno, do 45 s</span></button>
        </div>
        <input ref={fotoRef} type="file" accept="image/*" multiple hidden onChange={(e) => { void pridajMediaOrg(e.target.files); e.target.value = ""; }} />
        <input ref={vidRef} type="file" accept="video/*" hidden onChange={(e) => { void pridajMediaOrg(e.target.files); e.target.value = ""; }} />
        {chybaMed && <div role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "#A34A2A", lineHeight: 1.45 }}>{chybaMed}</div>}
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>Prvé je hlavné.</b> To ľudia uvidia ako prvé na vašom profile aj tam, kde pôsobíte. Poradie zmeníte šípkami. Fotky a video môžete pridávať aj neskôr.</div>
        <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>Fotka nie je povinná.</b> Niekedy je lepšie nefotiť, napríklad človeka v ťažkej chvíli. Ak žiadnu nepridáte, pri skutku sa ukáže vaše logo.</div>
        {maMedia && <>
          <Zaskrt on={su} onClick={() => setSu(!su)} zarovnaj="flex-start">Na fotkách a videách mám súhlas zobrazených osôb, pri deťoch súhlas zákonného zástupcu. Zábery sú moje alebo mám právo ich použiť.</Zaskrt>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>Súhlas si uchovávate vy, pri spore ho máte vedieť predložiť. Nezverejňujte adresu, EČV ani doklady. Polohu z fotiek čistíme automaticky.{" "}
            <button type="button" onClick={() => setPrvOrg(true)} style={{ border: "none", background: "transparent", padding: "10px 0", color: "var(--green)", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Pravidlá obsahu ›</button></div>
        </>}
      </div> : plan ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={P.lbl}>KEDY</div>
        <input value={planKedy} onChange={(e) => setPlanKedy(e.target.value)} placeholder="napr. sobota 4. 10., 10:00" aria-label="Kedy" style={P.pole} />
        <div style={{ ...P.lbl, marginTop: 6 }}>ODKAZ NA PRENOS <span style={{ fontWeight: 600, letterSpacing: 0 }}>· nepovinné</span></div>
        <input value={planLink} onChange={(e) => setPlanLink(e.target.value)} inputMode="url" placeholder="YouTube, Twitch alebo Facebook" aria-label="Odkaz na prenos" style={P.pole} />
        <Poznamka farba="gold">Skutok sa zobrazí ako <b style={{ color: "var(--ink)" }}>pripravuje sa</b>. Dôkazy pridáš, keď ho dokončíš. Po ťuknutí Začínam musíš mať zapnuté GPS. Pri skutku ako dar idú príspevky rovno na zbierku už teraz.</Poznamka>
      </div> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={P.lbl}>DÔKAZY</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {pp.map(([t, v, ref, g]) => (
            <button type="button" key={t} onClick={() => ref.current?.click()} aria-label={`Fotka ${t.toLowerCase()}`}
              style={{ height: 92, borderRadius: 14, border: v ? "1.5px solid transparent" : "1.5px dashed var(--gBd)", background: v ? `center/cover no-repeat url(${v}), ${g}` : "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: v ? "#fff" : "var(--green)", cursor: "pointer", fontSize: 13.5, fontWeight: 800, fontFamily: "inherit", textShadow: v ? "0 1px 3px rgba(0,0,0,.6)" : "none" }}>
              {t}<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>{v ? "pridané" : "pridaj fotku"}</span></button>))}
        </div>
        <input ref={predRef} type="file" accept="image/*" hidden onChange={(e) => { void pridajPP("pred", e.target.files); e.target.value = ""; }} />
        <input ref={poRef} type="file" accept="image/*" hidden onChange={(e) => { void pridajPP("po", e.target.files); e.target.value = ""; }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {media.map((m, i) => (
            <span key={i} style={{ aspectRatio: "1", borderRadius: 12, position: "relative", overflow: "hidden", background: "var(--seg)" }}>
              {m.video ? <video src={m.src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={m.src} alt={`Fotka ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              {m.video && <span style={{ position: "absolute", left: 6, bottom: 5, fontSize: 11, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>video</span>}
              <button type="button" onClick={() => setMedia((s) => s.filter((_, j) => j !== i))} aria-label={`Odstrániť ${m.video ? "video" : "fotku"} ${i + 1}`} style={{ position: "absolute", top: 2, right: 2, width: 28, height: 28, borderRadius: "50%", border: "none", background: "rgba(29,33,27,.6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Ik d={IK.kriz} s={13} /></button>
            </span>))}
          {media.length < 7 && <button type="button" onClick={() => fotoRef.current?.click()} aria-label="Pridať fotku alebo video" style={{ aspectRatio: "1", borderRadius: 12, border: "1.5px dashed var(--gBd)", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "var(--green)", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}><Ik d={IK.plus} s={20} />Foto, video</button>}
        </div>
        <input ref={fotoRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { void pridajMedia(e.target.files); e.target.value = ""; }} />
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 13, background: "var(--bSoft)", border: "1px solid var(--bBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>
          <span style={{ color: "var(--blue)", display: "flex", flex: "none", marginTop: 1 }}><Ik d={IK.poloha} /></span><span>Foť a natáčaj <b style={{ color: "var(--ink)" }}>so zapnutou polohou</b>. AI tak overí, že fotky sú z miesta skutku, a skutok má väčšiu šancu na feed.</span></div>
        {maMedia && <>
          <Zaskrt on={su} onClick={() => setSu(!su)} zarovnaj="flex-start">Mám súhlas ľudí na fotkách a videu so zverejnením.</Zaskrt>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>Fotky posúdi AI. Silné fotky so súhlasom ľudí zverejníme, dobrý skutok si zaslúži, aby ho videli. Ak by fotka mohla niekoho ponížiť, ostane len ako dôkaz a skutok ukážeme kreslenou verziou.{" "}
            <button type="button" onClick={() => setPrv(true)} style={{ border: "none", background: "transparent", padding: "10px 0", color: "var(--green)", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Pravidlá fotiek ›</button></div>
        </>}
        {dok.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 13, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
            <span aria-hidden="true" style={{ width: 34, height: 40, borderRadius: 6, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "var(--blue)", flex: "none" }}>{/\.pdf$/i.test(d.subor) ? "PDF" : "FOTO"}</span>
            <input value={d.nazov} onChange={(e) => setDok((x) => x.map((y, j) => (j === i ? { ...y, nazov: e.target.value } : y)))} placeholder="Názov dokladu, napr. Blok z Kauflandu" aria-label="Názov dokladu" style={{ ...P.pole, height: 44, fontSize: 15 }} />
            <button type="button" onClick={() => setDok((x) => x.filter((_, j) => j !== i))} aria-label="Odstrániť doklad" style={{ width: 44, height: 44, border: "none", background: "transparent", color: "var(--ink3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.kriz} s={16} /></button>
          </div>))}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 56, padding: "6px 12px", borderRadius: 13, background: "var(--card)", border: `1.5px solid ${potv === "ok" ? "var(--gBd)" : "var(--cardBd)"}` }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.potvrdil} s={17} /></span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{potv === "ok" ? "Potvrdil ten, komu si pomohol" : "Potvrdenie od toho, komu si pomohol"}</span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{potv === "ok" ? "najsilnejší dôkaz" : potv === "caka" ? "čaká na potvrdenie · odkaz odoslaný" : "naskenuje tvoj QR alebo ťukne na odkaz"}</span></span>
          {potv !== "ok" && <button type="button" onClick={potv === "caka" && TESTOVACIA ? () => setPotv("ok") : poziadajPotvrdenie} style={{ flex: "none", height: 40, padding: "0 12px", borderRadius: 10, border: "1px solid var(--gBd)", background: "var(--gSoft)", fontSize: 13.5, fontWeight: 700, color: "var(--gInk)", cursor: "pointer", fontFamily: "inherit" }}>{potv === "caka" && TESTOVACIA ? "Simulovať" : potv === "caka" ? "Poslať znova" : "Požiadať"}</button>}
        </div>
        <button type="button" onClick={() => dokRef.current?.click()} style={{ height: 46, borderRadius: 13, border: "1.5px dashed var(--gBd)", background: "transparent", fontSize: 14, fontWeight: 700, color: "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>+ Pridať doklad (PDF, blok, potvrdenie)</button>
        <input ref={dokRef} type="file" accept="application/pdf,image/*" hidden onChange={(e) => { pridajDoklad(e.target.files); e.target.value = ""; }} />
        <Poznamka farba="gold">{dar && !dokaz ? "Skutok ako dar potrebuje fotku alebo doklad. Bez nich ostane v denníku a odmeny na zbierku neprídu." : dokaz ? "Dobre. Čím viac dôkazov (fotka pred a po, doklad), tým skôr ide skutok do feedu." : "Bez fotky alebo dokladu ostane skutok v tvojom denníku. Na feed pridaj fotku pred a po alebo doklad."}</Poznamka>
      </div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={P.lbl}>KDE A KEDY</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 120px", gap: 8 }}>
          <input value={kde} onChange={(e) => setKde(e.target.value)} aria-label="Kde" style={P.pole} />
          <input value={plan ? planKedy || "—" : kedy} onChange={(e) => (plan ? setPlanKedy : setKedy)(e.target.value)} aria-label="Kedy" style={P.pole} />
        </div>
      </div>
    </>, <>
      {org && chybaOrg ? <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: "var(--gold)" }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)" }} />{chybaOrg}</div>
        : <div style={{ fontSize: 13, color: "var(--ink3)", textAlign: "center" }}>{o("Ďalej ukážeme náhľad. Zverejníš až potom.", "Ďalej ukážeme náhľad. Zverejníte až potom.")}</div>}
      <button type="button" onClick={k2Dalej} aria-disabled={!k2Ok} style={{ ...P.hlavne, opacity: k2Ok ? 1 : 0.45 }}>Pokračovať na náhľad</button>
    </>);
  } else if (kr === 3) {
    obsah = <div role="status" aria-live="polite" style={{ flex: 1, minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", padding: "0 30px" }}>
      <Svetlusik size={76} />
      <div style={{ fontSize: 20, fontWeight: 800 }}>AI kontroluje skutok</div>
      <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Upravuje text, kontroluje fotky a doklady a navrhne oblasť.</div>
    </div>;
  } else if (kr === 4 && !org) {
    const zle = vysl?.verdikt === "zamietnut";
    obsah = telo(zle ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 16, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Tentoraz to nevyšlo</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Skutok sa nepodarilo overiť, nezverejníme ho.</div>
        <button type="button" onClick={() => setKr(2)} style={{ alignSelf: "flex-start", height: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Späť na opis</button>
      </div>) : <>
      {otazky.length ? (
        <div style={{ ...P.karta, borderRadius: 16, border: "1px solid var(--bBd)", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--bSoft)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.ai} s={15} w={2.2} /></span>
            <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Skutok dáva zmysel, len chýba dielik. Odpovede sa pripoja k opisu.</span></div>
          {otazky.map((t, i) => (
            <label key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t}</span>
              <input value={odp[i] ?? ""} onChange={(e) => setOdp((o) => { const n = [...o]; n[i] = e.target.value; return n; })} placeholder="Tvoja odpoveď" style={{ ...P.pole, height: 46 }} />
            </label>))}
        </div>) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 14, fontWeight: 700, color: "var(--gInk)" }}><Ik d={IK.fajka} s={18} w={2.6} />AI nemá ďalšie otázky, skutok je jasný.</div>)}
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--blue)" }}>NÁVRH OD AI · TEXT MÔŽEŠ EŠTE UPRAVIŤ</div>
      <input value={nz} onChange={(e) => setNz(e.target.value.slice(0, 70))} aria-label="Názov skutku" style={{ ...P.pole, height: 52, fontSize: 17, fontWeight: 800 }} />
      <textarea value={po2} onChange={(e) => setPo2(e.target.value)} rows={5} aria-label="Text skutku" style={{ padding: "12px 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, lineHeight: 1.5, color: "var(--ink)", outline: "none", fontFamily: "inherit", resize: "none" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={P.lbl}>OBLASŤ · NAVRHLA AI</div>
        <div role="radiogroup" aria-label="Oblasť" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{OBLASTI.map((n) => <Cip key={n} on={oblast === n} onClick={() => setOblast(n)}>{n}</Cip>)}</div>
      </div>
    </>, !zle ? <button type="button" onClick={k4Dalej} style={P.hlavne}>{otazky.length && kolo === 1 ? "Odoslať odpovede" : "Pozrieť náhľad"}</button> : undefined);
  } else if (kr === 4 && org) {
    // OPRAVY 122 (2): krok pred Náhľadom — kam pôjdu peniaze za skutok (3 voľby, bez voľby sa nedá pokračovať)
    obsah = telo(<>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 21, fontWeight: 800 }}>Kam pôjdu peniaze za tento skutok</span></div>
      <div style={{ ...P.karta, borderRadius: 18, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>Pri zbierke ide 100 % na ňu, vaša charita si nenechá nič. QR skutku vedie na ten istý platobný modul. Po zverejnení je voľba zapečatená.</span>
        <div role="radiogroup" aria-label="Kam pôjdu peniaze" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {([["centralna", "Na našu centrálnu zbierku · celá organizácia", pr.centralna ? pr.centralna.nazov : "Centrálnu zbierku zatiaľ nemáte."], ["ina", "Na zbierku inej charity", inaZ ? `${inaZ.nazov} · ${inaZ.org}` : "Vyberiete zbierku podľa názvu alebo čísla."], ["bez", "Bez platobného modulu", "Skutok len ukazuje, čo ste urobili. Peniaze sa pri ňom nezbierajú."]] as const).map(([k, t, x]) => {
            const c = kam === k, vyp = k === "centralna" && !pr.centralna; return (
            <button type="button" role="radio" aria-checked={c} aria-disabled={vyp} key={k} onClick={() => { if (!vyp) setKam(k); }} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 12px", borderRadius: 13, cursor: vyp ? "default" : "pointer", opacity: vyp ? 0.55 : 1, background: c ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${c ? "var(--gBd)" : "var(--cardBd)"}`, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
              <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", border: `2px solid ${c ? "var(--green)" : "var(--chkBd)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", opacity: c ? 1 : 0 }} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)" }}>{x}</span></span>
            </button>); })}
        </div>
        {kam === "ina" && <div className="pf-rise" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, height: 48, padding: "0 12px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", color: "var(--ink3)" }}>
            <Ik d={IK.lupa} s={18} />
            <input value={kamQ} onChange={(e) => setKamQ(e.target.value)} placeholder="Názov alebo číslo zbierky" aria-label="Hľadať zbierku inej charity" style={{ flex: 1, minWidth: 0, height: 44, border: "none", background: "transparent", fontSize: 16, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
          </label>
          {(() => { const qq = normalizuj(kamQ); const l = vsetkyZ.filter((z) => z.org !== pr.autor && (!qq || normalizuj(z.nazov).includes(qq) || normalizuj(z.org).includes(qq) || normalizuj(z.cislo).includes(qq))).slice(0, qq ? 8 : 3);
            return l.length ? l.map((z) => { const c = inaZ?.id === z.id; return (
              <button type="button" role="radio" aria-checked={c} key={z.id} onClick={() => setInaZ(z)} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "6px 12px", borderRadius: 13, cursor: "pointer", background: c ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${c ? "var(--gBd)" : "var(--cardBd)"}`, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{z.nazov}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}><span style={{ whiteSpace: "nowrap" }}>#{z.cislo}</span> · {z.org}</span></span>
                {c && <span style={{ color: "var(--green)", display: "flex" }}><Ik d={IK.fajka} s={18} w={2.6} /></span>}
              </button>); }) : <div style={{ padding: "8px 2px", fontSize: 13, color: "var(--ink3)" }}>Nič sme nenašli. Skúste iný názov alebo číslo, napr. 47 821.</div>; })()}
        </div>}
      </div>
    </>, <>
      {!kamOk && <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: "var(--gold)" }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)" }} />{kam === "ina" ? "Vyberte zbierku inej charity" : "Vyberte, kam pôjdu peniaze"}</div>}
      <button type="button" onClick={() => { if (kamOk) { setPravda(false); setKr(5); } }} aria-disabled={!kamOk} style={{ ...P.hlavne, opacity: kamOk ? 1 : 0.45 }}>Pokračovať na náhľad</button>
    </>);
  } else if (kr === 5 && org) {
    // OPRAVY 121 · Náhľad skutku za charitu: autor = charita (logo, názov), Kam pôjde, Pred zverejnením si overte
    const foto = media.find((m) => !m.video)?.src;
    const ini = (pr.autor || "Charita").split(/\s+/).map((x) => x[0]).join("").slice(0, 2).toUpperCase();
    const logoEl = (sz: number, r: number) => orgLogo
      ? <img src={orgLogo} alt="" style={{ width: sz, height: sz, borderRadius: r, objectFit: "cover", background: "#fff", border: "1px solid var(--gBd)", flex: "none" }} />
      : <span aria-hidden="true" style={{ width: sz, height: sz, borderRadius: r, background: sz > 60 ? "#fff" : "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.33, fontWeight: 800, color: "var(--gInk)", flex: "none" }}>{ini}</span>;
    const viac = !!cistyText(po2Org);
    obsah = telo(<>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 21, fontWeight: 800 }}>Náhľad</span><span style={{ fontSize: 14, color: "var(--ink3)" }}>Takto skutok uvidia ľudia vo vašej lokalite a na vašom profile.</span></div>
      <div style={{ ...P.karta, borderRadius: 22, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
          {logoEl(40, 20)}
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 15 }}>{pr.autor || "Charita"}</b><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{kde} · teraz</span></span>
          <span style={{ padding: "4px 10px", borderRadius: 9, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 12.5, fontWeight: 800, color: "var(--gInk)", whiteSpace: "nowrap" }}>{oblast ?? "Pomoc"}</span>
        </div>
        {(kam === "centralna" && pr.centralna || kam === "ina" && inaZ) && <div style={{ margin: "-2px 16px 10px", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 13, fontWeight: 700 }}><span style={{ color: "var(--gold)", display: "flex" }}><Ik d={IK.dar} s={16} /></span>Príspevky idú na zbierku · {(kam === "centralna" ? pr.centralna : inaZ)?.nazov}</div>}
        <span role="img" aria-label={foto ? "Hlavná fotka" : "Logo charity"} style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "16 / 9", background: foto ? `center/cover no-repeat url(${foto})` : "var(--gSoft)" }}>{!foto && logoEl(120, 30)}</span>
        <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <b style={{ fontSize: 18, lineHeight: 1.3 }}>{nz}</b>
          <div className="ftext" style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }} dangerouslySetInnerHTML={{ __html: po2 }} />
          {viac && <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--green)" }}>… viac</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 16, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--ink3)" }}>KAM PÔJDE</span>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800, marginTop: 2 }}>Ľuďom vo vašej lokalite a na váš profil</span>
          <span style={{ display: "block", fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", marginTop: 2 }}>10 dní ho uvidia ľudia tam, kde pôsobíte. Keď ho podporia, ostane o 5 dní dlhšie. Potom ostane na vašom profile, kým ho nezmažete. Ak chcete, aby bol vidno dlhšie, môžete ho topovať.</span></span>
      </div>
      <div style={{ ...P.karta, borderRadius: 18, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <b style={{ fontSize: 16 }}>Pred zverejnením si overte</b>
        {PRED_ZVEREJNENIM.map((t) => <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}><span style={{ color: "var(--green)", display: "flex", flex: "none", marginTop: 2 }}><Ik d={IK.fajka} s={18} w={2.6} /></span><span>{t}</span></div>)}
      </div>
      <Zaskrt on={pravda} onClick={() => setPravda(!pravda)} zarovnaj="flex-start">Obsah je pravdivý a súhlasím s náhľadom.</Zaskrt>
    </>, <>
      {!pravda && <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: "var(--gold)" }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)" }} />Potvrďte, že skutok je pravdivý</div>}
      <button type="button" onClick={zverejni} aria-disabled={!pravda || !kamOk} style={{ ...P.hlavne, opacity: pravda && kamOk ? 1 : 0.45 }}>Pridať skutok</button>
      <button type="button" onClick={() => setZo(true)} style={{ height: 44, border: "none", background: "transparent", color: "var(--ink3)", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Zahodiť</button>
    </>);
  } else if (kr === 6 && org) {
    obsah = telo(<div className="pf-rise" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "10px 12px", textAlign: "center" }}>
      <Svetlusik size={84} />
      <div style={{ fontSize: 24, fontWeight: 800 }}>Skutok je zverejnený</div>
      <div style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>„{nz}“ teraz uvidia ľudia vo vašej lokalite aj na vašom profile.</div>
      {(() => { const z = kam === "centralna" ? pr.centralna : kam === "ina" ? inaZ : null; const url = `https://deed.sk/s/${id}`; return <>
        {z && <div style={{ alignSelf: "stretch", textAlign: "left", borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: 14, fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>100 % príspevkov ide na {z.nazov}.</b> Zapečatené, nedá sa zmeniť.</div>}
        <div style={{ alignSelf: "stretch", textAlign: "left", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: 14, display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ flex: "none" }}><DeedQr data={url} size={132} /></span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 15.5, fontWeight: 800 }}>QR tohto skutku</span>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{z ? "Kto ho naskenuje, pošle príspevok rovno na zbierku." : "Kto ho naskenuje, otvorí skutok vašej charity."}</span>
            <span style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={async () => { if (typeof navigator.share === "function") { try { await navigator.share({ title: nz, url }); } catch { /* zrušené */ } return; } try { await navigator.clipboard.writeText(url); } catch { /* bez schránky */ } setQrSkop(true); setTimeout(() => setQrSkop(false), 1600); }} style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{qrSkop ? "Skopírované" : "Zdieľať"}</button>
              <button type="button" onClick={() => void stiahniDeedQr({ data: url, variant: "svetly", nazov: nz || "skutok" })} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Uložiť</button>
            </span>
          </span>
        </div>
      </>; })()}
    </div>, <button type="button" onClick={zavri} style={{ width: "100%", height: 54, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 16, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>Hotovo</button>);
  } else if (kr === 5) {
    const foto = poF || pred || media.find((m) => !m.video)?.src;
    obsah = telo(<>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--blue)" }}>NÁHĽAD · TAKTO HO UVIDIA OSTATNÍ</div>
      <div style={{ ...P.karta, borderRadius: 22, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
          <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: "50%", padding: 2, background: "linear-gradient(135deg,#E2C174,#A8842A)", flex: "none" }}><span style={{ display: "flex", width: "100%", height: "100%", borderRadius: "50%", background: "var(--gSoft)", border: "2px solid var(--card)", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "var(--gInk)" }}>{(pr.autor || ja.celeMeno || "Ty").split(" ").map((x) => x[0]).join("").slice(0, 2)}</span></span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{pr.autor || (ja.celeMeno ? ja.celeMeno.replace(/^(\S+)\s+(\S).*$/, "$1 $2.") : "Ty")}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{kde} · {plan ? planKedy : kedy}</span></span>
          <span style={{ padding: "4px 10px", borderRadius: 9, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 12.5, fontWeight: 800, color: "var(--gInk)", whiteSpace: "nowrap" }}>{oblast ?? "Pomoc"}</span>
        </div>
        {dar && darZ[0] && <div style={{ margin: "-2px 14px 10px", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, background: "var(--goldBg)", border: "1px solid var(--goldBd)", fontSize: 13, fontWeight: 700 }}><span style={{ color: "var(--gold)", display: "flex" }}><Ik d={IK.dar} s={16} /></span>Skutok ako dar · {darZ[0].nazov}</div>}
        {plan && <div style={{ margin: "0 14px 10px", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, background: "#1D211B", color: "#F1ECE1", fontSize: 12.5, fontWeight: 800, letterSpacing: ".04em" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E0B85A" }} />PRIPRAVUJE SA · {planKedy}</div>}
        {foto && <div style={{ height: 190, position: "relative", background: citlive ? "linear-gradient(135deg,#F6F3EC,#DCE2E4)" : `center/cover no-repeat url(${foto})` }}>
          <span style={{ position: "absolute", right: 10, bottom: 10, padding: "3px 9px", borderRadius: 8, background: "rgba(29,33,27,.6)", color: "#F1ECE1", fontSize: 12, fontWeight: 700 }}>{citlive ? "kreslená verzia" : media.length + (pred ? 1 : 0) + (poF ? 1 : 0) > 1 ? `1 / ${media.length + (pred ? 1 : 0) + (poF ? 1 : 0)}` : "fotka"}</span></div>}
        <div style={{ padding: "12px 14px 14px" }}>
          <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>{nz}</div>
          <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)", marginTop: 6 }}>{po2}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: doFeedu || plan ? "var(--gSoft)" : "var(--goldBg)", border: `1px solid ${doFeedu || plan ? "var(--gBd)" : "var(--goldBd)"}` }}>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--ink3)" }}>KAM PÔJDE</span>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800, marginTop: 2 }}>{plan ? "Feed tvojej štvrte · pripravuje sa" : doFeedu ? "Feed tvojej štvrte" : "Môj denník"}</span>
          <span style={{ display: "block", fontSize: 13, color: "var(--ink2)", marginTop: 2 }}>{plan ? "ohlásenie vo feede, dôkazy pridáš po dokončení" : doFeedu ? (dar ? "skutok ako dar má vo feede výraznejšie miesto" : "miesto vo feede závisí od toho, koľko skutkov práve pribúda") : "bez dôkazu ostáva len u teba"}</span></span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "var(--gInk)", flex: "none", whiteSpace: "nowrap" }}>{plan ? "karma po dokončení" : `+${doFeedu ? karma : Math.min(karma, 5)} karmy`}</span>
      </div>
      {citlive && <div style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--bSoft)", border: "1px solid var(--bBd)" }}>
        <span style={{ width: 56, height: 56, borderRadius: 12, flex: "none", background: "linear-gradient(135deg,#F6F3EC,#DCE2E4)", border: "1px solid var(--bBd)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--blue)" }}><Ik d={IK.ceruzka} s={26} w={1.8} /></span>
        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>Citlivá situácia, fotky posúdila AI.</b> Máš súhlas ľudí a fotky nikoho neponižujú, preto ich zverejníme. Keby ponižovali, ukázali by sme kreslenú verziu.</span>
      </div>}
      {mojeFirmy.length > 0 && !plan && <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--sek-oBd)" }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--ink3)" }} id="firma-riadok">FIRMA · {mojeFirmy.join(", ").toUpperCase()}</span>
        <VolbaFirma v={firmaV} set={setFirmaV} labelId="firma-riadok" />
        <span aria-live="polite" style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>{firmaV === "meno" ? "Firma uvidí tento skutok a tvoje meno a môže ťa odmeniť." : VOLBA_VETA[firmaV]}</span>
      </div>}
      <Zaskrt on={pravda} onClick={() => setPravda(!pravda)} zarovnaj="flex-start">Skutok je pravdivý a súhlasím s náhľadom.</Zaskrt>
    </>, <>
      <button type="button" onClick={zverejni} aria-disabled={!pravda} style={{ ...P.hlavne, opacity: pravda ? 1 : 0.45 }}>Pridať skutok</button>
      <button type="button" onClick={() => setZo(true)} style={{ height: 44, border: "none", background: "transparent", color: "var(--ink3)", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Zahodiť</button>
    </>);
  } else {
    // ---- HOTOVO ----
    const nasZbierky = vsetkyZ.slice(0, 3);
    const n = uc.filter((u) => u.overeny).length + 1;
    const f = (x: number) => x.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const rzTxt = !rz.z ? "Vyber zbierku." : sk
      ? (rz.v === 100 ? `Celá odmena ide na ${rz.z.nazov}.` : `Z každej odmeny 10\u00a0€ pôjde ${f(rz.v / 10)}\u00a0€ na ${rz.z.nazov}, zvyšok ${f((100 - rz.v) / 10)}\u00a0€ sa rozdelí rovnako medzi ${n} účastníkov (${f((100 - rz.v) / 10 / n)}\u00a0€ každému).`)
      : (rz.v === 100 ? `Celú odmenu posúvaš na ${rz.z.nazov}, tebe neostane nič.` : `Z každej odmeny 10\u00a0€ pôjde ${f(rz.v / 10)}\u00a0€ na ${rz.z.nazov} a ${f((100 - rz.v) / 10)}\u00a0€ ostane tebe.`);
    const url = `https://deed.sk/s/${ohl?.id ?? id}`;
    const zapec = rz.hot && rz.z ? { pct: rz.v } : ohl?.retaz ? { pct: ohl.retaz.pct } : null;
    const delenie = zapec ? `${zapec.pct} % na zbierku` : null;
    const qrText = dar && darZ.length ? "Kto ho naskenuje, pošle príspevok rovno na zbierku." : zapec ? "Kto ho naskenuje, pošle odmenu. Rozdelí sa podľa zapečatenej reťaze." : "Kto ho naskenuje, otvorí tvoj skutok a môže ti poslať odmenu.";
    const zdielajQr = async () => {
      if (typeof navigator.share === "function") { try { await navigator.share({ title: nz, url }); return; } catch { return; } }
      try { await navigator.clipboard.writeText(url); } catch { /* bez schránky */ }
      setQrSkop(true); setTimeout(() => setQrSkop(false), 1600);
    };
    const qrPripraveny = (!dar || darZ.length > 0) && (!rz.open || rz.hot);
    obsah = telo(<div className="pf-rise" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "10px 12px", textAlign: "center" }}>
      <Svetlusik size={84} />
      <div style={{ fontSize: 24, fontWeight: 800 }}>{plan ? "Skutok je ohlásený" : `+${doFeedu ? karma : Math.min(karma, 5)} karmy`}</div>
      <div style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>{plan ? "Skutok je ohlásený. Keď začneš, ťukni Začínam dole v Moje skutky. Po skončení pridáš dôkazy." : doFeedu ? "Skutok je vo feede tvojej štvrte. Overenia od susedov mu pridávajú dôveru." : "Skutok je v tvojom denníku. Aj malé skutky sa počítajú."}</div>
      {dar && darZ.length > 0 ? (
        <div style={{ alignSelf: "stretch", textAlign: "left", borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: 14, fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>
          <b style={{ color: "var(--ink)" }}>Skutok ako dar.</b> Všetky odmeny od ľudí idú na {darZ[0].nazov}{darZ.length > 1 ? `, po jej naplnení na ďalšie v poradí (${darZ.length - 1})` : ""}. Zapečatené, nedá sa zmeniť.</div>
      ) : !ohl?.retaz && (
        <div style={{ alignSelf: "stretch", textAlign: "left", borderRadius: 18, background: "var(--card)", border: "1px solid var(--gBd)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 34, height: 34, borderRadius: 10, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.retaz} /></span><span style={{ fontSize: 16, fontWeight: 800 }}>Reťaz dobra</span></div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{sk ? "Keď vám ľudia za tento skutok pošlú odmenu, časť alebo celú ju môžete posunúť na zbierku v DEED+. Reťaz nastavuješ ty za celú skupinu, ostatní ju uvidia v ozname." : "Keď ti ľudia za tento skutok pošlú odmenu, časť alebo celú ju môžeš posunúť na zbierku v DEED+. Funguje to ako zbierka tvorcu, tvorcom si teraz ty."} <b style={{ color: "var(--ink)" }}>Nastaviť sa dá len teraz a po zapečatení sa výška delenia už nedá zmeniť.</b></div>
          {!rz.open && !rz.hot && <button type="button" onClick={() => setRz((r) => ({ ...r, open: true }))} style={{ height: 48, borderRadius: 14, border: "none", background: "var(--gGrad)", fontSize: 15, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Nastaviť reťaz dobra</button>}
          {rz.open && !rz.hot && <div className="pf-rise" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div role="radiogroup" aria-label="Zbierka pre reťaz" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {nasZbierky.map((z) => { const c = rz.z?.id === z.id; return (
                <button type="button" role="radio" aria-checked={c} key={z.id} onClick={() => setRz((r) => ({ ...r, z }))} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "8px 12px", borderRadius: 13, cursor: "pointer", background: c ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${c ? "var(--gBd)" : "var(--cardBd)"}`, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
                  <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: "50%", flex: "none", border: `2px solid ${c ? "var(--green)" : "var(--chkBd)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", opacity: c ? 1 : 0 }} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{z.nazov}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{z.org}</span></span>
                </button>); })}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 4 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink3)" }}>Na zbierku pôjde</span><span style={{ fontSize: 18, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{rz.v}&nbsp;%</span></div>
            <input type="range" min={5} max={100} step={5} value={rz.v} onChange={(e) => setRz((r) => ({ ...r, v: Math.max(5, Math.round(+e.target.value / 5) * 5) }))} aria-label="Koľko percent z odmien pôjde na zbierku" style={{ width: "100%", accentColor: "#4E7D37", height: 44 }} />
            <div style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.45 }}>{rzTxt}</div>
            <button type="button" onClick={zapecat} aria-disabled={!rz.z} style={{ height: 48, borderRadius: 14, border: "none", background: "var(--gGrad)", fontSize: 15, fontWeight: 800, color: "#fff", cursor: "pointer", opacity: rz.z ? 1 : 0.45, fontFamily: "inherit" }}>Zapečatiť reťaz</button>
          </div>}
          {rz.hot && rz.z && <div role="status" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14.5, fontWeight: 700, color: "var(--gInk)" }}><Ik d={IK.fajka} s={18} w={2.6} />Reťaz zapečatená · {rz.v}&nbsp;% z odmien ide na {rz.z.nazov}</div>}
        </div>)}
      {qrPripraveny && <div style={{ alignSelf: "stretch", textAlign: "left", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: 14, display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ flex: "none" }}><DeedQr data={url} size={132} retaz={!!zapec} delenie={delenie} /></span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 15.5, fontWeight: 800 }}>QR tohto skutku</span>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{qrText}</span>
          <span style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={zdielajQr} style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{qrSkop ? "Skopírované" : "Zdieľať"}</button>
            <button type="button" onClick={() => void stiahniDeedQr({ data: url, retaz: !!zapec, delenie, variant: "svetly", nazov: nz || "skutok" })} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Uložiť</button>
          </span>
        </span>
      </div>}
    </div>, <button type="button" onClick={zavri} style={{ width: "100%", height: 54, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 16, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>Hotovo</button>);
  }

  const panel: CSSProperties = wide
    ? { position: "relative", width: desktop ? 560 : 640, maxWidth: "calc(100vw - 32px)", height: "min(820px, calc(100vh / var(--pismo, 1) - 48px))", borderRadius: 28, transform: otv ? "none" : "translateY(24px)", opacity: otv ? 1 : 0 }
    : { position: "absolute", left: 0, right: 0, bottom: 0, top: "max(54px, env(safe-area-inset-top))", borderRadius: "28px 28px 0 0", transform: otv ? "none" : "translateY(105%)" };

  return createPortal(
    <div className="deed-platba" role="dialog" aria-modal="true" aria-label={krTit} style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div onClick={skusZavriet} style={{ position: "absolute", inset: 0, background: "var(--scrim)", opacity: otv ? 1 : 0, transition: "opacity .3s ease" }} />
      <div style={{ ...panel, background: "var(--sheet)", color: "var(--ink)", display: "flex", flexDirection: "column", overflow: "hidden", transition: "transform .42s cubic-bezier(.2,.8,.2,1), opacity .3s ease" }}>
        <div style={{ flex: "none", padding: "10px 18px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          {!wide && <span aria-hidden="true" style={{ width: 40, height: 5, borderRadius: 3, background: "var(--handle)" }} />}
          <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{krTit}</h2>
            {kr !== 3 && <button type="button" onClick={spat} style={{ border: "none", background: "transparent", fontSize: 15, fontWeight: 700, color: "var(--ink3)", cursor: "pointer", padding: "10px 0 10px 12px", minHeight: 44, fontFamily: "inherit" }}>{spatT}</button>}
          </div>
          {(() => { const kroky = org ? [1, 2, 4, 5, 6] : [1, 2, 3, 4, 5, 6]; const n = kroky.filter((i) => i <= kr).length; return ( // OPRAVY 121: bez AI 4 kroky
          <div aria-label={`Krok ${n} z ${kroky.length}`} role="progressbar" aria-valuemin={1} aria-valuemax={kroky.length} aria-valuenow={n} style={{ alignSelf: "stretch", display: "grid", gridTemplateColumns: `repeat(${kroky.length},1fr)`, gap: 4 }}>
            {kroky.map((i) => <span key={i} style={{ height: 4, borderRadius: 2, background: i <= kr ? "var(--green)" : "var(--pillBd)", transition: "background .3s ease" }} />)}
          </div>); })()}
        </div>
        {obsah}

        {/* Zavrieť rozpísaný skutok? */}
        {zo && <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "flex-end" }}>
          <div onClick={() => setZo(false)} style={{ position: "absolute", inset: 0, background: "var(--scrim)" }} />
          <div role="alertdialog" aria-label="Zavrieť rozpísaný skutok?" className="pf-rise" style={{ position: "relative", width: "100%", borderRadius: "28px 28px 0 0", background: "var(--sheet)", padding: "22px 20px max(28px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 19, fontWeight: 800 }}>Zavrieť rozpísaný skutok?</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{o("Ulož ho ako koncept a dokončíš ho neskôr. Nič sa nezverejní.", "Uložte ho ako koncept a dokončíte ho neskôr. Nič sa nezverejní.")}</div>
            <button type="button" onClick={ulozAkoKoncept} style={{ ...P.hlavne, height: 54, borderRadius: 16, fontSize: 16 }}>Uložiť ako koncept</button>
            <button type="button" onClick={() => { setZo(false); zavri(); }} style={{ height: 50, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Zahodiť</button>
            <button type="button" onClick={() => setZo(false)} style={{ height: 44, border: "none", background: "transparent", color: "var(--ink3)", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Pokračovať v písaní</button>
          </div>
        </div>}

        {/* OPRAVY 121: Pravidlá obsahu (charita) */}
        {prvOrg && <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "flex-end" }}>
          <div onClick={() => setPrvOrg(false)} style={{ position: "absolute", inset: 0, background: "var(--scrim)" }} />
          <div role="dialog" aria-label="Pravidlá obsahu" className="pf-rise" style={{ position: "relative", width: "100%", maxHeight: "92%", overflowY: "auto", borderRadius: "28px 28px 0 0", background: "var(--sheet)", padding: "18px 20px max(28px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Fotky a videá</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Zverejnením fotky alebo videa potvrdzujete, že na to máte právo.</div>
            {PRAVIDLA_ORG.map(([t, x]) => (
              <div key={t} style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}><span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flex: "none", marginTop: 8 }} /><span><b style={{ color: "var(--ink)" }}>{t}</b> {x}</span></div>))}
            <button type="button" onClick={() => setPrvOrg(false)} style={{ ...P.hlavne, height: 54, borderRadius: 16, fontSize: 16, marginTop: 6 }}>Rozumiem</button>
          </div>
        </div>}

        {/* Pravidlá fotiek a videí */}
        {prv && <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "flex-end" }}>
          <div onClick={() => setPrv(false)} style={{ position: "absolute", inset: 0, background: "var(--scrim)" }} />
          <div role="dialog" aria-label="Pravidlá fotiek a videí" className="pf-rise" style={{ position: "relative", width: "100%", maxHeight: "92%", overflowY: "auto", borderRadius: "28px 28px 0 0", background: "var(--sheet)", padding: "18px 20px max(28px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Pravidlá fotiek a videí</div>
            {[["Súhlas.", "Zverejňuj len ľudí, ktorí s tým súhlasia. Za súhlas zodpovedáš ty."], ["Deti.", "Tváre detí bez súhlasu rodiča nezverejníme, AI ich rozmaže alebo skutok ukáže kreslene."], ["Dôstojnosť.", "Fotky človeka v núdzi, v chorobe alebo po nehode zverejníme len so súhlasom a ak ho neponižujú. Silný skutok si zaslúži, aby ho videli."], ["Kreslená verzia.", "Ak by fotka mohla niekoho ponížiť, ostane len ako dôkaz a skutok ukážeme kreslenou verziou alebo kresleným videom."], ["Bez osobných údajov.", "Na fotkách nesmú byť čitateľné adresy, EČV, doklady ani čísla."], ["Právo nezverejniť.", "DEED+ môže ktorúkoľvek fotku nezverejniť. Skutok a karma tým neutrpia."]].map(([t, s]) => (
              <div key={t} style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}><span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flex: "none", marginTop: 8 }} /><span><b style={{ color: "var(--ink)" }}>{t}</b> {s}</span></div>))}
            <button type="button" onClick={() => setPrv(false)} style={{ ...P.hlavne, height: 54, borderRadius: 16, fontSize: 16, marginTop: 6 }}>Rozumiem</button>
          </div>
        </div>}
      </div>
    </div>,
    document.body,
  );
}


