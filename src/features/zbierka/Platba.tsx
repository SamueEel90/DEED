// KARTA 07 · Platobné okno — Suma → Spôsob → Zhrnutie → Podrž a zaplať → Spracovanie → (Hotovo = karta 09).
// Hárok nad detailom (mobil zdola, tablet 640 px na stred, PC 560 px na stred). Bez blur. Platba sa do cesty Späť nezapisuje.
import { usePoplatok } from "@/lib/poplatky";
import { DeedZnacka } from "@/components/DeedZnacka";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLayout, useAktivacia } from "@/components/context";
import { usePouzivatel } from "@/lib/pouzivatel";
import { nacitajPredvolbu, ulozPredvolbu, useSektorDarcu, menoBezMena, volbaBezMena, jeViera, useUkazSumy, type VerziaIdentity, type VolbaDaru, type JaIdentita } from "@/lib/darcovia";
import PodrzTlacidlo from "./PodrzTlacidlo";
import { TESTOVACIA } from "@/lib/testovacia";
import { MIN_DAR_EUR, KARTA_OD_EUR } from "./nastavenie";
import type { KanalPlatby } from "./Sumy";
import { PodakovaniePoDare } from "./AnimovaneKomponenty";
import { hlaskaPoDare } from "./hlasky";
import { milnikyPre } from "./KartaStavu";
import { sumaEur } from "@/lib/suma";

export type SposobEur = "karta" | "sepa";
/** meno: čo darca vybral do zoznamu darcov (0084 ho zapíše k daru); bez mena = undefined */
export type VysledokPlatby = { kanal: KanalPlatby; sposob?: SposobEur; suma: number; eur: number; darDeed: number; volba?: VolbaDaru; meno?: string };

/** voľby mena v platbe — všade rovnaké (ako v profile), líši sa len text bez mena (Viera „Bohu známy veriaci / darca“) */
export function volbyMena(ja: JaIdentita & { nick?: string | null }, bezMena: string): [VerziaIdentity, string][] {
  const meno = ja.meno || "Darca", priezv = ja.priezvisko || "", cele = `${meno} ${priezv}`.trim();
  return [[2, `${meno}${priezv ? ` ${priezv[0]}.` : ""}`], [1, cele], ...(ja.mesto ? [[5, `${cele}, ${ja.mesto}`] as [VerziaIdentity, string]] : []),
    ...(ja.nick ? [[3, ja.nick] as [VerziaIdentity, string]] : []), [4, bezMena]];
}

// ---- OPRAVY 304: rýchle sumy = podržať a zaplatené, naposledy použitým spôsobom ----
const KLUC_SPOSOB = "deed.platba.sposob";
/** spôsob pre rýchly dar: pod 5 € vždy SEPA, inak naposledy použitý (pri prvom dare SEPA) */
export function sposobRychly(suma: number): SposobEur {
  if (suma < KARTA_OD_EUR) return "sepa";
  try { return localStorage.getItem(KLUC_SPOSOB) === "karta" ? "karta" : "sepa"; } catch { return "sepa"; }
}
const ulozSposob = (s?: SposobEur) => { if (s) try { localStorage.setItem(KLUC_SPOSOB, s); } catch { /* LS */ } };
/** meno do zoznamu darcov podľa predvoľby (Darujete ako) */
export function useMenoPredvolby(): (volba: VolbaDaru) => string | undefined {
  const ja = usePouzivatel(); const sektor = useSektorDarcu();
  return (volba) => (volba.verzia !== 4 ? volbyMena(ja, volbaBezMena(sektor)).find(([v]) => v === volba.verzia)?.[1] : undefined);
}
/** rýchly dar registrovaného: bez okna, meno z „Darujete ako“, spôsob naposledy použitý */
export function useRychlyDar(): (suma: number) => VysledokPlatby {
  const menoZ = useMenoPredvolby();
  return (suma) => { const volba = nacitajPredvolbu(), sposob = sposobRychly(suma); ulozSposob(sposob); return { kanal: "eur", sposob, suma, eur: suma, darDeed: 0, volba, meno: menoZ(volba) }; };
}

const DAR_PRE_NAS = 3; // € — dobrovoľný dar platforme (prototyp)
const KLUC_TUK = "deed.platba.potvrditTuknutim";
export const potvrditTuknutim = () => { try { return localStorage.getItem(KLUC_TUK) === "1"; } catch { return false; } };
export const nastavPotvrditTuknutim = (v: boolean) => { try { localStorage.setItem(KLUC_TUK, v ? "1" : "0"); } catch { /* LS */ } };

const e2 = (n: number) => `${sumaEur(n)}`;
const eK = (n: number) => `${sumaEur(n)}`;
const jednotka = (k: KanalPlatby) => (k === "eur" ? "€" : k === "deed" ? "DeeD" : "EURC");
const vSume = (n: number, k: KanalPlatby) => (k === "eur" ? eK(n) : `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} ${jednotka(k)}`);

// OPRAVY 234 (prototyp Platobny modul charita a viera): neregistrovaný vidí „Čo získaš registráciou" (20 výhod, mení sa každé 3,4 s)
const VYHODY: [string, string, string][] = [
  ["Tvoj status a stopa", "Svetlúšik — tvoj prvý dobrý skutok", "Dostaneš ho hneď pri registrácii, sprevádza ťa appkou."],
  ["Tvoj status a stopa", "Karma a štít od prvého dňa", "Počítajú sa odo dňa registrácie. Štít rastie od Bronzového po Legendu a nedá sa kúpiť."],
  ["Tvoj status a stopa", "Meno pri dare", "Vyberieš si, ako ťa svet uvidí: celé meno, iniciála, prezývka, s mestom či bez."],
  ["Tvoj status a stopa", "Doklad o každom dare", "Celá história v Môj DEED+: čo podporuješ, poďakovania, vyúčtovania."],
  ["Peniaze a výhody", "Platíš na jeden klik", "Kartu ani SEPA účet nevypĺňaš pri každom dare znova, údaje máš bezpečne uložené."],
  ["Peniaze a výhody", "Kryptopeňaženka zadarmo", "Pre DEED+ a mikrodary, bez zriaďovania a poplatkov."],
  ["Peniaze a výhody", "Môžeš peniaze aj prijímať", "Vlastná zbierka či žiadosť, osobná QR vizitka, prepitné na smene."],
  ["Peniaze a výhody", "Prepojenie s účtom tvojej firmy", "Firemné benefity: odmeny za skutky v daňovom limite, firemné akcie a programy pre zamestnancov."],
  ["Peniaze a výhody", "Zaujímavé ponuky zdarma", "Veci a služby, ktoré firmy rozdávajú ako dobrý skutok. Súťaží o ne len registrovaný."],
  ["Peniaze a výhody", "Zľava za status v prevádzkach", "Naskenuješ QR na mieste a uplatníš, ak chceš."],
  ["Peniaze a výhody", "Podpora tvorcov a reťaz dobra", "Mikrodary v DeeD, kde euro dorazí ako euro."],
  ["Tvoje okolie", "Feed tvojho okolia", "Skutky, pomoc a zbierky z tvojej štvrte; sleduješ, koho chceš, vrátane farnosti či zboru."],
  ["Tvoje okolie", "Nástenka a pozvánky podľa záujmov", "Koncerty, trhy, prednášky; vyberáš si, kam ťa smú pozvať."],
  ["Tvoje okolie", "Dobrovoľníctvo s overenou dochádzkou", "Tvoja účasť na brigáde či akcii je dokázaná QR kódom, nie sľubom."],
  ["Tvoje okolie", "Ponuky dobrovoľníckej činnosti z okolia", "Keď niekto blízko potrebuje ruky, dozvieš sa to."],
  ["Tvoje okolie", "Pripomienky a kalendár", "Akcia, na ktorú ideš, ti nezmizne."],
  ["Tvoj hlas a príležitosti", "Hodnotenie spokojnosti v podnikoch", "Názor môže dať len registrovaný, preto má tvoje hodnotenie váhu."],
  ["Tvoj hlas a príležitosti", "„Mám záujem“ na brigády a prácu", "Jedným klikom, štít ako referencia: skutky namiesto životopisu."],
  ["Tvoj hlas a príležitosti", "Potvrdenie účasti jedným klikom", "Na pozvánkach sa meno doplní samo."],
  ["Tvoj hlas a príležitosti", "Pochvaly, ktoré si nesieš so sebou", "Zmeníš zamestnanie, povesť ide s tebou."],
];
const cisla = (v: string) => v.replace(/\D/g, "");
/** čo chýba v údajoch platby neregistrovaného (karta: číslo, platnosť, CVC; SEPA: IBAN, majiteľ) */
function chybaUdajov(sepa: boolean, u: UdajePlatby): string[] {
  const m: string[] = [];
  if (sepa) {
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(u.iban.replace(/\s/g, "").toUpperCase())) m.push("iban");
    if (u.majitel.trim().length < 3) m.push("majitel");
  } else {
    if (cisla(u.cislo).length < 15) m.push("cislo");
    const e = cisla(u.platnost); if (e.length !== 4 || +e.slice(0, 2) < 1 || +e.slice(0, 2) > 12) m.push("platnost");
    if (cisla(u.cvc).length < 3) m.push("cvc");
  }
  return m;
}
type UdajePlatby = { cislo: string; platnost: string; cvc: string; iban: string; majitel: string };

type Krok = "suma" | "sposob" | "zhrnutie" | "spracovanie" | "hotovo" | /** OPRAVY 385: hosť po dare */ "lakacka";
/** stav zbierky tesne pred darom — pre poďakovanie a hlášku (karta 09) */
export type PredDarom = { vyzbierane: number; ciel: number | null; pocetDarov: number; darovDnes: number };

export function PlatobneOkno({ kanal, suma: sumaStart, nazov, registrovany, bonus, firma, pred, onHotovo, onClose, bezMilnikov }: {
  pred: PredDarom;
  /** OPRAVY 388: zvončeková — po dare bez pruhu a míľnika */ bezMilnikov?: boolean;
  kanal: KanalPlatby; suma?: number; nazov: string; registrovany: boolean;
  bonus?: (eur: number) => number;   // dorovnanie firmy k daru (len €)
  firma?: string;
  onHotovo: (v: VysledokPlatby) => void; onClose: () => void;
}) {
  const { wide, desktop } = useLayout();
  const sektor = useSektorDarcu();
  const eur = kanal === "eur";
  const [text, setText] = useState(sumaStart ? String(sumaStart).replace(".", ",") : "");
  const suma = Number(text.replace(",", ".")) || 0;
  // OPRAVY 304: pod 5 € sa krok Spôsob preskočí (len SEPA)
  const [krok, setKrok] = useState<Krok>(sumaStart ? (eur && sumaStart >= KARTA_OD_EUR ? "sposob" : "zhrnutie") : "suma");
  const [sposob, setSposob] = useState<SposobEur | undefined>(eur && sumaStart && sumaStart < KARTA_OD_EUR ? "sepa" : undefined);
  const [darDeed, setDarDeed] = useState(false);
  const [nap, setNap] = useState(false); // nápoveda „Podrž tlačidlo…"
  const [volba, setVolba] = useState<VolbaDaru>(nacitajPredvolbu);
  const [otvorene, setOtvorene] = useState(false);
  // OPRAVY 234: platba naoko — neregistrovaný vypĺňa kartu alebo IBAN (nikam sa neposielajú, kým nie je platobná brána)
  const [ud, setUd] = useState<UdajePlatby>({ cislo: "", platnost: "", cvc: "", iban: "", majitel: "" });
  const [chybaPl, setChybaPl] = useState(false);
  const [vyh, setVyh] = useState(0), [vyhOtv, setVyhOtv] = useState(false);
  const [doklad, setDoklad] = useState(false);
  const [cas] = useState(() => new Date());
  useEffect(() => { const r = requestAnimationFrame(() => setOtvorene(true)); return () => cancelAnimationFrame(r); }, []);

  const kroky: Krok[] = eur && !(suma > 0 && suma < KARTA_OD_EUR) ? ["suma", "sposob", "zhrnutie"] : ["suma", "zhrnutie"];
  const pod1 = eur && suma > 0 && suma < MIN_DAR_EUR;
  const mozeDalej = suma > 0 && !pod1;
  const eurHodnota = eur ? suma : kanal === "deed" ? suma / 100 : suma;
  // Zadanie 3 · 3.4: poplatok si appka pýta od servera (ten istý výpočet strhne platba) — platí ho darca navrch
  const pop = usePoplatok(eur && sposob ? (sposob === "karta" ? "fiat" : "sepa") : null, suma);
  const poplatok = pop.poplatok;
  const dar = eur && darDeed ? DAR_PRE_NAS : 0;
  const spolu = Math.round((suma + poplatok + dar) * 100) / 100;
  const dorovna = eur && bonus ? bonus(suma) : 0;

  const ja = usePouzivatel();
  const aktivacia = useAktivacia();
  const registrovat = () => { setOtvorene(false); setTimeout(() => { onClose(); setTimeout(() => aktivacia("aktivny"), 60); }, 250); }; // až po zavretí okna (Späť histórie by zavrel registráciu)
  const chyba = eur && !registrovany && krok === "zhrnutie" ? chybaUdajov(sposob === "sepa", ud) : [];
  const udajeOk = chyba.length === 0;
  useEffect(() => {
    if (registrovany || krok !== "zhrnutie" || !eur) return;
    const t = window.setInterval(() => setVyh((i) => (i + 1) % VYHODY.length), 3400);
    return () => window.clearInterval(t);
  }, [registrovany, krok, eur]);
  const zatvor = () => { if (krok !== "spracovanie") { setOtvorene(false); setTimeout(onClose, 250); } };
  const dalej = () => {
    if (!mozeDalej) return;
    if (krok === "suma") { if (eur && suma < KARTA_OD_EUR) { setSposob("sepa"); setKrok("zhrnutie"); } else setKrok(eur ? "sposob" : "zhrnutie"); }
  };
  const spat = () => { const i = kroky.indexOf(krok as Krok); if (i > 0) setKrok(kroky[i - 1]); else zatvor(); };
  const zaplat = () => {
    if (registrovany) { ulozPredvolbu(volba); ulozSposob(sposob); }
    const meno = registrovany && volba.verzia !== 4 ? volbyMena(ja, volbaBezMena(sektor)).find(([v]) => v === volba.verzia)?.[1] : undefined;
    setKrok("spracovanie");
    setTimeout(() => { onHotovo({ kanal, sposob, suma, eur: eurHodnota, darDeed: dar, volba: registrovany ? volba : undefined, meno }); setKrok("hotovo"); }, 1800);
  };

  // klávesnica (PC): čísla, čiarka, Backspace, Enter = ďalej, Esc = zavrieť
  const pridajZnak = (z: string) => setText((t) => {
    if (z === "⌫") return t.slice(0, -1);
    if (z === ",") return !eur && kanal === "deed" ? t : t.includes(",") ? t : (t || "0") + ",";
    const n = (t === "0" ? "" : t) + z;
    const [, des] = n.split(",");
    if (des && des.length > 2) return t;
    return n.length > 7 ? t : n;
  });
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { zatvor(); return; }
      if (krok !== "suma") return;
      if (/^[0-9]$/.test(e.key)) pridajZnak(e.key);
      else if (e.key === "," || e.key === ".") pridajZnak(",");
      else if (e.key === "Backspace") pridajZnak("⌫");
      else if (e.key === "Enter") dalej();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const hlavicka = (
    <div style={{ flex: "none", padding: wide ? "18px 18px 0" : "10px 18px 0" }}>
      {!wide && <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--handle)", margin: "0 auto 12px" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--bSoft)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: eur ? 19 : 13, fontWeight: 800, flex: "none" }}>{eur ? "€" : jednotka(kanal)}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>{eur ? "Platba v eurách" : kanal === "deed" ? "Platba v DeeD" : "Platba v EURC"}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eur ? "EUR · karta / prevod" : `${nazov} · z peňaženky`}</span>
        </span>
        {krok !== "spracovanie" && (
          <button type="button" onClick={zatvor} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "var(--btn)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>
      {krok !== "spracovanie" && krok !== "hotovo" && krok !== "lakacka" && (
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {kroky.map((k, i) => {
            const ai = kroky.indexOf(krok), hotovy = i <= ai;
            return (
              <button key={k} type="button" onClick={() => { if (i < ai) setKrok(k); }}
                style={{ flex: 1, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: i < ai ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 5, textAlign: "left", fontFamily: "inherit" }}>
                <span style={{ height: 3, borderRadius: 3, background: hotovy ? "var(--green)" : "var(--track)", transition: "background .3s ease" }} />
                <span style={{ fontSize: 12, fontWeight: i === ai ? 800 : 600, color: i === ai ? "var(--ink)" : hotovy ? "var(--green)" : "var(--ink4)" }}>{k === "suma" ? "Suma" : k === "sposob" ? "Spôsob" : "Zhrnutie"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  let obsah: ReactNode, pata: ReactNode = null;
  if (krok === "suma") {
    const plus = kanal === "deed" ? [50, 100, 500] : [5, 10, 25];
    const klavesy = ["1", "2", "3", "4", "5", "6", "7", "8", "9", kanal === "deed" ? "" : ",", "0", "⌫"];
    obsah = (
      <>
        <div style={{ textAlign: "center", paddingTop: 10 }}>
          <span style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>{text || "0"}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "var(--ink3)", marginLeft: 6 }}>{jednotka(kanal)}</span>
        </div>
        {pod1 && <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--ink3)" }}>Najmenší dar v eurách je 1 €.</div>}
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {plus.map((p) => (
            <button key={p} type="button" onClick={() => setText(String(Math.round((suma + p) * 100) / 100).replace(".", ","))}
              style={{ padding: "8px 16px", borderRadius: 99, border: "1px solid var(--fieldBd)", background: "var(--key)", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "var(--ink)", fontFamily: "inherit" }}>+{p}</button>
          ))}
        </div>
        {!desktop && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, marginTop: "auto" }}>
            {klavesy.map((k, i) => k ? (
              <button key={i} type="button" className="zb-kl" onClick={() => pridajZnak(k)} aria-label={k === "⌫" ? "Zmazať" : k}
                style={{ height: 52, borderRadius: 14, border: "none", background: "var(--key)", fontSize: 22, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>{k}</button>
            ) : <span key={i} />)}
          </div>
        )}
        {desktop && <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--ink3)" }}>Sumu napíš z klávesnice · Enter pokračuje · Esc zavrie</div>}
      </>
    );
    pata = <HlavneTlacidlo disabled={!mozeDalej} onClick={dalej}>Ďalej</HlavneTlacidlo>;
  } else if (krok === "sposob") {
    const kartaNie = suma < KARTA_OD_EUR;
    obsah = (
      <>
        <div style={{ fontSize: 14, color: "var(--ink2)" }}>Vyber spôsob platby pre <b style={{ fontVariantNumeric: "tabular-nums" }}>{eK(suma)}</b></div>
        <MoznostSposobu disabled={kartaNie} onClick={() => { setSposob("karta"); setKrok("zhrnutie"); }} ikona={IKONA_KARTA}
          nadpis="Platobná karta" popis="Visa · Mastercard · okamžite · 3-D Secure · poplatok 1,4 % + 0,15 €" />
        {kartaNie && <div style={{ marginTop: -6, fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)", padding: "0 4px" }}>Kartou sa dá platiť od {KARTA_OD_EUR} €.</div>}
        <MoznostSposobu onClick={() => { setSposob("sepa"); setKrok("zhrnutie"); }} ikona={IKONA_BANKA}
          nadpis="Bankový prevod (SEPA)" popis="pripísanie do 1 prac. dňa · bez poplatku" />
      </>
    );
    pata = <SekundarneTlacidlo onClick={spat}>Späť</SekundarneTlacidlo>;
  } else if (krok === "zhrnutie") {
    obsah = (
      <>
        {dorovna > 0 && (
          <div style={{ padding: "13px 15px", borderRadius: 16, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>Tvojich {eK(suma)} → zbierka dostane <span style={{ color: "var(--gold)" }}>{eK(suma + dorovna)}</span></div>
            <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 2, lineHeight: 1.4 }}>{firma} k tvojmu daru pridá {eK(dorovna)} zo svojej vyčlenenej sumy.</div>
          </div>
        )}
        {registrovany
          ? <Identita volba={volba} setVolba={setVolba} eur={eurHodnota} />
          : <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
              <span style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--track)", color: "var(--ink4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flex: "none" }}>?</span>
              <span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>V zozname darcov sa zobrazíš ako</span><span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{menoBezMena(sektor)}</span></span>
            </div>}
        {eur && !registrovany && <div style={{ padding: 14, borderRadius: 16, background: "var(--gCard)", border: "1px solid var(--gBd)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", color: "var(--gInk)" }}>ČO ZÍSKAŠ REGISTRÁCIOU</div>
          <div key={vyh} className="zb-novy" style={{ display: "flex", alignItems: "flex-start", gap: 10, minHeight: 62 }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800, lineHeight: 1.3 }}>{VYHODY[vyh][1]}</span><span style={{ display: "block", marginTop: 2, fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{VYHODY[vyh][2]}</span></span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)", fontVariantNumeric: "tabular-nums", flex: "none", marginTop: 3 }}>{vyh + 1} / {VYHODY.length}</span>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, fontWeight: 600 }}>Darovať môžeš aj bez registrácie. Všetky výhody appky však využiješ až s ňou, bez nej to technicky nejde.</div>
          <button type="button" onClick={() => setVyhOtv(!vyhOtv)} style={{ alignSelf: "flex-start", padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "var(--green)" }}>{vyhOtv ? "Skryť zoznam" : `Pozrieť všetkých ${VYHODY.length} výhod`}</button>
          {vyhOtv && <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4, borderTop: "1px solid var(--gBd)" }}>
            {[...new Set(VYHODY.map((v) => v[0]))].map((g) => <div key={g} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", color: "var(--gInk)" }}>{g.toLocaleUpperCase("sk-SK")}</div>
              {VYHODY.filter((v) => v[0] === g).map((v) => <div key={v[1]} style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}><b style={{ color: "var(--ink)" }}>{v[1]}</b> · {v[2]}</div>)}
            </div>)}
          </div>}
        </div>}
        <RiadokPlatby kanal={kanal} sposob={sposob} registrovany={registrovany} />
        {eur && !registrovany && (sposob === "sepa" ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={ud.iban} placeholder="IBAN" autoComplete="off" aria-label="IBAN" onChange={(e) => setUd({ ...ud, iban: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 34).replace(/(.{4})(?=.)/g, "$1 ") })}
              style={{ ...{ height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", fontSize: 15.5, color: "var(--ink)", outline: "none", fontFamily: "inherit", fontVariantNumeric: "tabular-nums", minWidth: 0, width: "100%", boxSizing: "border-box" }, textTransform: "uppercase", border: `1.5px solid ${chybaPl && chyba.includes("iban") ? "#A34A2A" : "var(--fieldBd)"}` }} />
            <input value={ud.majitel} placeholder="Meno majiteľa účtu" autoComplete="name" aria-label="Meno majiteľa účtu" onChange={(e) => setUd({ ...ud, majitel: e.target.value.slice(0, 60) })}
              style={{ ...{ height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", fontSize: 15.5, color: "var(--ink)", outline: "none", fontFamily: "inherit", fontVariantNumeric: "tabular-nums", minWidth: 0, width: "100%", boxSizing: "border-box" }, border: `1.5px solid ${chybaPl && chyba.includes("majitel") ? "#A34A2A" : "var(--fieldBd)"}` }} />
            <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)" }}>Podržaním povolíš jednorazové inkaso tejto sumy z tvojho účtu.</div>
          </div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={ud.cislo} placeholder="Číslo karty" inputMode="numeric" autoComplete="cc-number" aria-label="Číslo karty" onChange={(e) => setUd({ ...ud, cislo: cisla(e.target.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ") })}
              style={{ ...{ height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", fontSize: 15.5, color: "var(--ink)", outline: "none", fontFamily: "inherit", fontVariantNumeric: "tabular-nums", minWidth: 0, width: "100%", boxSizing: "border-box" }, border: `1.5px solid ${chybaPl && chyba.includes("cislo") ? "#A34A2A" : "var(--fieldBd)"}` }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input value={ud.platnost} placeholder="MM / RR" inputMode="numeric" autoComplete="cc-exp" aria-label="Platnosť karty" onChange={(e) => { const v = cisla(e.target.value).slice(0, 4); setUd({ ...ud, platnost: v.length > 2 ? `${v.slice(0, 2)} / ${v.slice(2)}` : v }); }}
                style={{ ...{ height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", fontSize: 15.5, color: "var(--ink)", outline: "none", fontFamily: "inherit", fontVariantNumeric: "tabular-nums", minWidth: 0, width: "100%", boxSizing: "border-box" }, border: `1.5px solid ${chybaPl && chyba.includes("platnost") ? "#A34A2A" : "var(--fieldBd)"}` }} />
              <input value={ud.cvc} placeholder="CVC" inputMode="numeric" autoComplete="cc-csc" aria-label="CVC" onChange={(e) => setUd({ ...ud, cvc: cisla(e.target.value).slice(0, 4) })}
                style={{ ...{ height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", fontSize: 15.5, color: "var(--ink)", outline: "none", fontFamily: "inherit", fontVariantNumeric: "tabular-nums", minWidth: 0, width: "100%", boxSizing: "border-box" }, border: `1.5px solid ${chybaPl && chyba.includes("cvc") ? "#A34A2A" : "var(--fieldBd)"}` }} />
            </div>
          </div>)}
        {chybaPl && chyba.length > 0 && <div style={{ marginTop: -2, fontSize: 13, lineHeight: 1.45, color: "#A34A2A", fontWeight: 600 }}>{sposob === "sepa" ? "Doplň IBAN a meno majiteľa účtu. Bez nich platba neodíde." : "Doplň číslo karty, platnosť a CVC. Bez nich platba neodíde."}</div>}
        <div style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "4px 16px" }}>
          <Riadok l="Suma" v={eur ? e2(suma) : vSume(suma, kanal)} />
          {poplatok > 0 && <Riadok l={`Poplatok (${pop.popis})`} v={e2(poplatok)} />}
          {eur && (
            <div onClick={() => setDarDeed(!darDeed)} role="checkbox" aria-checked={darDeed} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--cardBd)", cursor: "pointer" }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${darDeed ? "var(--green)" : "var(--chkBd)"}`, background: darDeed ? "var(--green)" : "transparent", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                {darDeed && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
              <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>Dar pre nás — chod <DeedZnacka /></span><span style={{ display: "block", fontSize: 12, color: "var(--ink3)" }}>dobrovoľné · ide platforme, nie príjemcovi</span></span>
              <span style={{ fontSize: 14.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: darDeed ? "var(--ink)" : "var(--ink4)" }}>{e2(DAR_PRE_NAS)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "13px 0 11px", fontSize: 16.5, fontWeight: 800 }}><span>Spolu</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{eur ? e2(spolu) : vSume(suma, kanal)}</span></div>
        </div>
        {nap && <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 13, fontWeight: 600, color: "var(--gInk)" }}>Podrž tlačidlo, kým sa nenaplní.</div>}
        {sposob === "karta" && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink3)", padding: "0 4px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" /></svg>Zabezpečené cez 3-D Secure</div>}
      </>
    );
    const label = `${potvrditTuknutim() ? "Zaplatiť" : "Podrž a zaplať"} ${eur ? e2(spolu) : vSume(suma, kanal)}`;
    // prototyp: v zhrnutí len hlavné tlačidlo (späť cez kroky hore); kým chýbajú údaje, je vyblednuté a ukáže, čo doplniť
    pata = !udajeOk
      ? <button type="button" onClick={() => setChybaPl(true)} style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", opacity: .45, fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }}>{label}</button>
      : potvrditTuknutim()
        ? <HlavneTlacidlo onClick={zaplat}>{label}</HlavneTlacidlo>
        : <PodrzTlacidlo label={label} onConfirm={zaplat} onHint={() => setNap(true)} />;
  } else if (krok === "hotovo") {
    // karta 09 — poďakovanie (hotový komponent dizajnéra): Svetlúšik, roj do pruhu, hláška
    const po = pred.vyzbierane + eurHodnota + dorovna;
    const G = pred.ciel;
    const m0 = milnikyPre(pred.vyzbierane), m1 = milnikyPre(po);
    obsah = (
      <PodakovaniePoDare meno={ja.meno} registrovany={registrovany} eur={eurHodnota} sumaTxt={vSume(suma, kanal)}
        dorovnanieTxt={dorovna > 0 ? eK(dorovna) : undefined} firma={firma}
        predPct={G ? Math.min(1, pred.vyzbierane / G) : pred.vyzbierane / m0.dalsi} poPct={G ? Math.min(1, po / G) : Math.min(1, po / m1.dalsi)}
        poTxt={G ? `${eK(po)} z ${eK(G)}` : `Vyzbierané ${eK(po)}`} poPctTxt={G ? `${Math.floor((po / G) * 100)} %` : bezMilnikov ? "" : `ďalší míľnik ${eK(m1.dalsi)}`} bezPruhu={!G && bezMilnikov}
        hlaska={hlaskaPoDare({ vyzbierane: pred.vyzbierane, ciel: G, pocetDarov: pred.pocetDarov, darovDnes: pred.darovDnes }, { eur: eurHodnota, dorovnanie: dorovna, registrovany })}
        onRegistrovat={registrovat} onHotovo={registrovany ? zatvor : () => setKrok("lakacka")}
        podNadpisom="Tvoj dar odišiel priamo príjemcovi."
        doklad={<div style={{ borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
          <div role="button" tabIndex={0} onClick={() => setDoklad(!doklad)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}><span>Doklad</span><span style={{ color: "var(--ink3)" }}>{doklad ? "Skryť" : "Zobraziť ›"}</span></div>
          {doklad && <div style={{ padding: "0 16px 8px" }}>
            {([["Kanál", !eur ? `Peňaženka ${jednotka(kanal)}` : sposob === "sepa" ? "Bankový prevod (SEPA)" : "Karta (EUR)"], ["Dar", eur ? e2(suma) : vSume(suma, kanal)],
              ...(dorovna > 0 ? [[`${firma ?? "Firma"} dorovnala`, e2(dorovna)]] : []), ...(poplatok > 0 ? [["Poplatok", e2(poplatok)]] : []), ...(dar > 0 ? [["Dar pre chod DEED+", e2(dar)]] : []),
              // PLACEBO — OPRAVY 234: ID transakcie / VS dodá platobná brána; v testovacom režime ukážka
              ...(TESTOVACIA ? [[sposob === "sepa" ? "Referencia" : "ID transakcie", sposob === "sepa" ? "VS · test" : "TX · test"]] : []),
              ["Dátum", `${cas.getDate()}. ${cas.getMonth() + 1}. ${cas.getFullYear()} ${cas.getHours()}:${String(cas.getMinutes()).padStart(2, "0")}`]] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--cardBd)", fontSize: 13.5 }}><span style={{ color: "var(--ink3)" }}>{k}</span><span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{v}</span></div>))}
          </div>}
        </div>} />
    );
  } else if (krok === "lakacka") {
    // OPRAVY 385: hosť po dare — čo získa registráciou (bez nátlaku, Teraz nie zavrie)
    obsah = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 2px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>Zaregistrujete sa?</div>
        <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>Vaše dary uvidíte na jednom mieste a v zozname darcov môžete byť menom. Farnosti môžete sledovať a dostávať ich oznamy.</div>
      </div>
    );
    pata = <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><HlavneTlacidlo onClick={registrovat}>Zaregistrovať sa</HlavneTlacidlo><SekundarneTlacidlo onClick={zatvor}>Teraz nie</SekundarneTlacidlo></div>;
  } else {
    obsah = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, textAlign: "center", minHeight: 320 }}>
        <span aria-hidden="true" className="zb-kruh" style={{ width: 120, height: 120, borderRadius: "50%", border: "3px solid var(--track)", borderTopColor: "transparent", borderLeftColor: "#E0B048", boxSizing: "border-box" }} />
        <div style={{ fontSize: 17, fontWeight: 700 }}>{!eur ? `Posielam ${jednotka(kanal)} príjemcovi` : sposob === "sepa" ? "Posielam prevod príjemcovi" : "Overujem kartu cez platobnú bránu"}</div>
        <div style={{ fontSize: 13.5, color: "var(--ink3)" }}>Neprerušuj to, trvá to pár sekúnd.</div>
      </div>
    );
  }

  const sirka = desktop ? 560 : wide ? 640 : undefined;
  const okno: CSSProperties = wide
    ? { position: "relative", width: sirka, maxWidth: "calc(100vw - 32px)", maxHeight: "min(760px, calc(100vh / var(--pismo, 1) - 48px))", borderRadius: 28,
        transform: otvorene ? "none" : "translateY(24px)", opacity: otvorene ? 1 : 0 }
    : { position: "absolute", left: 0, right: 0, bottom: 0, height: krok === "hotovo" || krok === "lakacka" ? undefined : "88%", maxHeight: "92%", borderRadius: "28px 28px 0 0", transform: otvorene ? "none" : "translateY(105%)" }; // mobil zdola, tablet/PC v strede

  return createPortal(
    <div className="deed-platba" role="dialog" aria-modal="true" aria-label="Platba"
      // OPRAVY 209/234: platba nad oknami stránky farnosti (detail zbierky, parte = 1000–1100), inak by sa otvorila pod nimi
      style={{ position: "fixed", inset: 0, zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div onClick={zatvor} style={{ position: "absolute", inset: 0, background: "var(--scrim)", opacity: otvorene ? 1 : 0, transition: "opacity .32s ease" }} />
      <div style={{ ...okno, background: "var(--sheet)", color: "var(--ink)", display: "flex", flexDirection: "column", overflow: "hidden",
        transition: "transform .32s cubic-bezier(.2,.8,.2,1), opacity .32s ease" }}>
        {hlavicka}
        <div key={krok} className="zb-krok" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>{obsah}</div>
        {pata && <div style={{ flex: "none", padding: "10px 18px max(18px, env(safe-area-inset-bottom))" }}>{pata}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------------- kúsky ----------------
const IKONA_KARTA = <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /></svg>;
const IKONA_BANKA = <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" /></svg>;
const IKONA_PENAZENKA = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h2M3 9h15a3 3 0 0 0 3-3" /></svg>;

function HlavneTlacidlo({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: disabled ? "default" : "pointer", opacity: disabled ? .45 : 1, fontFamily: "inherit", fontVariantNumeric: "tabular-nums" }}>
      {children}
    </button>
  );
}
function SekundarneTlacidlo({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: "var(--btn)", color: "var(--ink)", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>;
}
function MoznostSposobu({ ikona, nadpis, popis, onClick, disabled }: { ikona: ReactNode; nadpis: string; popis: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="zb-karta" onClick={onClick} disabled={disabled}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", textAlign: "left", cursor: disabled ? "default" : "pointer", opacity: disabled ? .45 : 1, fontFamily: "inherit", color: "var(--ink)" }}>
      {ikona}
      <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{nadpis}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>{popis}</span></span>
      <span style={{ fontSize: 18, color: "var(--ink4)" }}>›</span>
    </button>
  );
}
function Riadok({ l, v }: { l: string; v: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", fontSize: 14.5, borderBottom: "1px solid var(--cardBd)" }}><span style={{ color: "var(--ink2)" }}>{l}</span><span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</span></div>;
}
/** uložený spôsob platby registrovaného (DEV: ukážka z prototypu, kým nie je platobná brána) */
function RiadokPlatby({ kanal, sposob, registrovany }: { kanal: KanalPlatby; sposob?: SposobEur; registrovany: boolean }) {
  if (kanal !== "eur") return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, background: "var(--gCard)", border: "1px solid var(--gBd)" }}>
      {IKONA_PENAZENKA}<span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>Peňaženka {jednotka(kanal)}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>bez poplatku · hneď</span></span>
    </div>
  );
  if (!registrovany) return null; // neregistrovaný vypĺňa kartu / IBAN — karta 08
  const karta = sposob === "karta";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, background: "var(--gCard)", border: "1px solid var(--gBd)" }}>
      {karta ? IKONA_KARTA : IKONA_BANKA}
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>{karta ? "Visa •••• 4242" : "SK31 •••• 4421"}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{karta ? "Uložená karta · platnosť 08/28" : "Uložený účet · pripísanie do 1 prac. dňa"}</span>
      </span>
      <span style={{ color: "var(--green)", fontWeight: 800 }}>✓</span>
    </div>
  );
}
/** OPRAVY 304: „Darujete ako: Martin Konaľ ⌄“ vedľa Zdieľať · QR — ťuk = tie isté čipy ako v Zhrnutí, voľba sa pamätá pre ďalšie dary.
 *  Vracia tlačidlo (polovica radu) a pod ním panel s čipmi na celú šírku radu. */
export function DarujeteAko({ styl, host }: { styl: CSSProperties; /** OPRAVY 385: hosť — len bez mena */ host?: boolean }) {
  const ja = usePouzivatel();
  const sektor = useSektorDarcu();
  const bezMena = volbaBezMena(sektor);
  const moznosti = useMemo(() => (host ? [[4, bezMena]] as [VerziaIdentity, string][] : volbyMena(ja, bezMena)), [ja, bezMena, host]);
  const [volba0, setVolba] = useState<VolbaDaru>(nacitajPredvolbu);
  const volba = host ? { ...volba0, verzia: 4 as VerziaIdentity } : volba0;
  const [otv, setOtv] = useState(false);
  const [ok, setOk] = useState(false);
  const meno = volba.verzia === 4 ? menoBezMena(sektor) : moznosti.find(([v]) => v === volba.verzia)?.[1] ?? bezMena;
  const vyber = (v: VerziaIdentity) => { const n = { ...volba, verzia: v }; setVolba(n); ulozPredvolbu(n); setOtv(false); setOk(true); window.setTimeout(() => setOk(false), 1800); };
  return (<>
    <button type="button" className="zb-karta" onClick={() => setOtv((x) => !x)} aria-expanded={otv} style={{ ...styl, gap: 6, padding: "0 10px" }}>
      {ok ? <span role="status" style={{ minWidth: 0, color: "var(--gInk)" }}>Uložené ✓</span>
        : <span style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2, textAlign: "left" }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink3)" }}>Darujete ako</span>
          <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14.5 }}>{meno}</span></span>}
      <span aria-hidden="true" style={{ flex: "none", transform: otv ? "rotate(180deg)" : "none", transition: "transform .2s" }}>⌄</span>
    </button>
    {otv && <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8, padding: "12px 12px 10px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)" }}>V ZOZNAME DARCOV SA UKÁŽETE AKO</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {moznosti.map(([v, l]) => { const on = v === volba.verzia; return (
          <button key={v} type="button" onClick={() => vyber(v)} aria-pressed={on}
            style={{ minHeight: 40, padding: "8px 14px", borderRadius: 99, border: `1.5px solid ${on ? "var(--gBd)" : "var(--pillBd)"}`, background: on ? "var(--gSoft)" : "transparent", color: on ? "var(--gInk)" : "var(--ink2)", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>); })}
      </div>
      <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{host ? "Menom môžete darovať po registrácii." : "Platí pre ďalšie dary, kým to nezmeníte."}</span>
    </div>}
  </>);
}

/** „V ZOZNAME DARCOV SA UKÁŽEŠ AKO" + „Zobraziť sumu" (do 2 € sa suma nezobrazí nikdy) */
export function Identita({ volba, setVolba, eur }: { volba: VolbaDaru; setVolba: (v: VolbaDaru) => void; eur: number }) {
  const ja = usePouzivatel();
  const sektor = useSektorDarcu();
  const viera = jeViera(sektor), ukazSumy = useUkazSumy();
  const bezMena = volbaBezMena(sektor);
  const moznosti = useMemo(() => volbyMena(ja, bezMena), [ja, bezMena]);
  const zvolena = (v: VerziaIdentity) => v === volba.verzia;
  const vybrane = volba.verzia === 4 ? menoBezMena(sektor) : moznosti.find(([v]) => zvolena(v))?.[1] ?? bezMena;
  const nad2 = eur > 2;
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)", marginTop: 2 }}>V ZOZNAME DARCOV SA UKÁŽEŠ AKO</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -18px", padding: "0 18px 2px", scrollbarWidth: "none" }}>
        {moznosti.map(([v, l]) => {
          const on = zvolena(v);
          return <button key={v} type="button" onClick={() => setVolba({ ...volba, verzia: v })}
            style={{ flex: "none", padding: "9px 14px", borderRadius: 99, border: `1.5px solid ${on ? "var(--gBd)" : "var(--pillBd)"}`, background: on ? "var(--gSoft)" : "transparent", color: on ? "var(--gInk)" : "var(--ink2)", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>{l}</button>;
        })}
      </div>
      {/* Viera: sumy pri darcoch rozhoduje farár (súkromné zbierky nikdy) — darca vidí len, ako sa ukáže */}
      {!ukazSumy || viera ? <div style={{ fontSize: 13, color: "var(--ink3)" }}>V zozname: <b style={{ color: "var(--ink)" }}>{vybrane}</b></div>
      : nad2 ? (
        <div onClick={() => setVolba({ ...volba, zobrazSumu: !volba.zobrazSumu })} role="switch" aria-checked={volba.zobrazSumu}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer" }}>
          <span style={{ position: "relative", width: 44, height: 26, borderRadius: 99, background: volba.zobrazSumu ? "var(--green)" : "var(--track)", flex: "none", transition: "background .25s ease" }}>
            <span style={{ position: "absolute", top: 3, left: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transform: `translateX(${volba.zobrazSumu ? 18 : 0}px)`, transition: "transform .3s cubic-bezier(.3,1.4,.5,1)" }} />
          </span>
          <span><span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>Zobraziť sumu daru</span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>v zozname: {vybrane}{volba.zobrazSumu ? ` · ${eK(eur)}` : ""}</span></span>
        </div>
      ) : <div style={{ fontSize: 12.5, color: "var(--ink3)" }}>Pri daroch do 2 € sa suma v zozname nezobrazuje.</div>}
    </>
  );
}
