// KARTA 44 · registrácia osoby 1b: Plán → Telefón → Kód z SMS → Heslo a odomknutie → Platba → Údaje → Doklad a selfie
// → Ako ťa uvidia → Záujmy → Ešte dve potvrdenia → Hotovo („Do môjho profilu").
// Telefón + SMS sa nikdy nepreskočí. KYC hneď v registrácii, karta a IBAN pred overením (kto odpadne, nestojí nás Didit).
// Kapitoly hore: Účet · Overenie · Ty. Svetlúšik má 3 bubliny: Platba (prečo karta), Overenie, Záujmy.
import { useEffect, useRef, useState } from "react";
import { setSession } from "@/lib/session";
import { signUp } from "@/lib/auth";
import * as db from "@/lib/db";
import { ulozZaujmy as ulozZaujmyLokalne, zaujemZOblasti } from "@/lib/personalizaciaStore";
import { otvorProfilPoRegistracii, cakajRegistraciuOrg } from "@/lib/mojeStranky";
import { overIban } from "@/features/rola/segmenty";
import type { Zaujem } from "@/types";
import { Obrazovka, Nadpis, Svetlo, Bublina, Pole, KodPolia, Volby, Prepinace, Cipy, KycKarty, PlanKapitol, Odomknute, kapitoly, naServeri, pockaj, vibruj, IK, clenCislo } from "./RegB";

export type KrokOsoby = "plan" | "telefon" | "kod" | "heslo" | "platba" | "udaje" | "overenie" | "zobrazenie" | "zaujmy" | "vyhlasenie" | "hotovo";
const PORADIE: KrokOsoby[] = ["plan", "telefon", "kod", "heslo", "platba", "udaje", "overenie", "zobrazenie", "zaujmy", "vyhlasenie", "hotovo"];
const KAP: [string, KrokOsoby[]][] = [["Účet", ["telefon", "kod", "heslo", "platba"]], ["Overenie", ["udaje", "overenie"]], ["Ty", ["zobrazenie", "zaujmy"]]];

/** priebežné ukladanie: rozrobený krok (len číslo kroku, žiadne osobné údaje) */
const KLUC_KROK = "deed.reg.krok";
export function ulozenyKrok(): { typ: "osoba" | "org"; krok: string } | null { try { return JSON.parse(localStorage.getItem(KLUC_KROK) || "null"); } catch { return null; } }
export function ulozKrok(v: { typ: "osoba" | "org"; krok: string } | null) { try { if (v) localStorage.setItem(KLUC_KROK, JSON.stringify(v)); else localStorage.removeItem(KLUC_KROK); } catch { /* LS */ } }

/** stav z DB (aj starý tok) → krok 1b. Pred účtom (telefón, kód, heslo) sa obnoviť nedá — začína sa telefónom. */
export function krokZoStavu(stav?: string | null): KrokOsoby | null {
  const s = stav ?? "";
  if ((PORADIE as string[]).includes(s) && !["plan", "kod", "heslo", "hotovo"].includes(s)) return s as KrokOsoby;
  if (s === "kyc" || s === "foto") return "overenie";
  if (s === "vyhlasenie") return "vyhlasenie";
  return null;
}

const ZOBR: [string, (m: string, p: string) => string, string][] = [
  ["Celé meno", (m, p) => `${m} ${p}`.trim(), "cele"], ["Meno a iniciála", (m, p) => `${m} ${p.charAt(0)}.`.trim(), "iniciala"],
  ["Prezývka", () => "", "nick"], ["Len mesto", () => "", "mesto"], ["Anonymne", () => "Anonymný darca", "anonym"],
];
// prototyp: Ľudia, Šport, Zdravie, Kultúra prvé, nič vopred vybrané → oblasti katalógu záujmov (profil ich číta)
const ZAUJMY: [string, string, string?][] = [["Ľudia", "Komunita"], ["Šport", "Sport"], ["Zdravie", "Zdravie"], ["Kultúra", "Art"], ["Deti", "Komunita", "Deti a mládež"], ["Seniori", "Komunita", "Seniori"], ["Zvieratá", "Zvierata"], ["Príroda", "Priroda"], ["Hudba", "Hudba"], ["Učenie", "Ucenie"]];
/** „Niekto z Trenčína / Žiliny / Zvolena"; iné koncovky (Košice, Piešťany) → „Niekto z mesta Košice" */
const zMesta = (m: string) => (/a$/i.test(m) ? `z ${m.slice(0, -1)}y` : /[bcčdďfghjklĺľmnňprŕsštťvzž]$/i.test(m) ? `z ${m}a` : `z mesta ${m}`);

type Ucet = { id: string; poradove_cislo?: number | string | null };

export function OsobaB({ start = "plan", onSpat, onHotovo, authId: authIdVst, email: emailVst, preOrg, toast }: {
  start?: KrokOsoby; onSpat: () => void; onHotovo?: () => void; authId?: string | null; email?: string | null;
  /** registrácia osoby pred pridaním organizácie → Hotovo pokračuje k organizácii */
  preOrg?: boolean; toast: (t: string) => void;
}) {
  const [krok, setKrok] = useState<KrokOsoby>(start);
  const [ucet, setUcet] = useState<Ucet | null>(null);
  const [authId, setAuthId] = useState<string | null>(authIdVst ?? null);
  const [busy, setBusy] = useState(false);
  // údaje držané len v pamäti počas toku
  const [tel, setTel] = useState(""), [kod, setKod] = useState(""), [odpocet, setOdpocet] = useState(0);
  const posielania = useRef<number[]>([]);
  const [email, setEmail] = useState(emailVst ?? ""), [heslo, setHeslo] = useState(""), [tvar, setTvar] = useState(true), [pin, setPin] = useState("");
  const [chyba, setChyba] = useState<string | null>(null);
  const [platba, setPlatba] = useState(0), [iban, setIban] = useState("");
  const [menoCele, setMenoCele] = useState(""), [rok, setRok] = useState(""), [mesto, setMesto] = useState("");
  const [kyc, setKyc] = useState([false, false]);
  const [zobr, setZobr] = useState(1), [nick, setNick] = useState("");
  const [zaujmy, setZaujmy] = useState<string[]>([]);
  const [potvrd, setPotvrd] = useState([false, false]);
  const [clen, setClen] = useState<number>(1248);

  const [meno = "", ...zvysok] = menoCele.trim().split(/\s+/);
  const priezvisko = zvysok.join(" ");

  // existujúci auth user bez dokončenej registrácie (návrat) → účet načítať (idempotentné na auth_id)
  useEffect(() => {
    if (!authIdVst || !naServeri) return;
    db.vytvorUcetAuth({ authId: authIdVst, typ: "aktivny", email: emailVst ?? null, stav: "telefon" }).then((u) => setUcet(u)).catch((e) => toast("Chyba: " + (e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // odpočet pre opätovné poslanie SMS
  useEffect(() => { if (odpocet <= 0) return; const t = window.setTimeout(() => setOdpocet((s) => s - 1), 1000); return () => clearTimeout(t); }, [odpocet]);

  const ides = (k: KrokOsoby) => {
    setChyba(null); setKrok(k);
    // priebežné ukladanie: po vzniku účtu (od platby) sa krok pamätá lokálne aj v DB
    if (PORADIE.indexOf(k) >= PORADIE.indexOf("platba") && k !== "hotovo") {
      ulozKrok({ typ: "osoba", krok: k });
      if (naServeri && ucet) db.ulozStav(ucet.id, k).catch(() => { /* best-effort */ });
    }
  };
  const spat = () => {
    const i = PORADIE.indexOf(krok);
    if (i <= 0 || (krok === "telefon" && start === "telefon")) { onSpat(); return; }
    // po vzniku účtu sa na telefón/kód/heslo nevraciame
    const pred = PORADIE[i - 1];
    if (ucet && (pred === "heslo" || pred === "kod")) return;
    setKrok(pred === "kod" ? "telefon" : pred);
  };
  const server = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { if (naServeri) await fn(); else await pockaj(450); return true; }
    catch (e: any) { toast("Chyba: " + (e?.message || e)); return false; }
    finally { setBusy(false); }
  };

  // ---- Telefón: neviditeľná kontrola človeka a limity SMS sú na serveri (Samuel); tu len UX poistka 3 kódy / 10 min
  const telCislo = tel.replace(/\D/g, "");
  const telOk = /^9\d{8}$/.test(telCislo);
  const posliKod = async () => {
    const teraz = Date.now();
    posielania.current = posielania.current.filter((t) => teraz - t < 10 * 60000);
    if (posielania.current.length >= 3) { setChyba("Poslali sme už 3 kódy. Ďalší pošleme o pár minút."); return; }
    setBusy(true);
    try {
      const r = await db.posliOtp("+421" + telCislo);
      posielania.current.push(teraz);
      setKod(""); setOdpocet(60); ides("kod");
      // DEMO: SMS neodchádza — testovací kód poslal server a „vyplní sa sám" ako pri skutočnej SMS
      if (r.kod) { const k = r.kod; window.setTimeout(() => setKod(k), 900); }
    } catch (e: any) { toast("Chyba pri odoslaní SMS: " + (e?.message || e)); }
    finally { setBusy(false); }
  };
  const overKod = async () => {
    // Zadanie 3 · 3.2: kód overuje server
    let ok: boolean;
    try { ok = await db.overOtp("+421" + telCislo, kod); } catch (e) { setChyba(e instanceof Error ? e.message : "Kód sa nepodarilo overiť."); return; }
    if (!ok) { setChyba("Kód nesedí. Skontroluj SMS."); return; }
    vibruj(8);
    // návrat existujúceho auth usera: heslo už má → telefón zapíš a pokračuj platbou
    if (ucet) { void (naServeri ? db.ulozOverenyTelefon(ucet.id, "+421" + telCislo).catch(() => { /* best-effort */ }) : null); ides("platba"); return; }
    ides("heslo");
  };

  // ---- Heslo: e-mail + heslo (nové zariadenie) a odomykanie tvárou alebo PIN-om (vždy jedno z nich)
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const hesloOk = heslo.length >= 8, pinOk = tvar || /^\d{4}$/.test(pin);
  const vytvorUcet = async () => {
    setBusy(true); setChyba(null);
    try {
      if (naServeri) {
        let id = authId;
        if (!id) {
          const r = await signUp(email, heslo);
          if (!r.ok || !r.authId) { setChyba(r.chyba ?? "Registrácia zlyhala."); return; }
          id = r.authId; setAuthId(id);
        }
        const u = await db.vytvorUcetAuth({ authId: id, typ: "aktivny", email: email.trim(), stav: "platba" });
        await db.ulozOverenyTelefon(u.id, "+421" + telCislo);
        await db.nastavZabezpecenie(u.id, { pin: tvar ? undefined : pin, biometria: tvar });
        setUcet(u);
        if (u.poradove_cislo != null) setClen(Number(u.poradove_cislo));
      } else { await pockaj(500); setUcet({ id: "" }); }
      ides("platba");
    } catch (e: any) { toast("Chyba: " + (e?.message || e)); }
    finally { setBusy(false); }
  };

  // ---- Platba: karta sa len overí platbou 0 € (platobná brána ešte nie je → simulácia), IBAN na výplaty
  const ibanOk = !!overIban(iban);
  const overKartu = async () => { setBusy(true); await pockaj(900); setBusy(false); vibruj(8); ides("udaje"); };

  // ---- Údaje
  const rokN = Number(rok), rokOk = /^\d{4}$/.test(rok) && rokN >= 1900 && rokN <= new Date().getFullYear() - 15;
  const udajeOk = !!meno && !!priezvisko && rokOk && mesto.trim().length > 1;
  const ulozUdaje = async () => {
    if (await server(async () => {
      await db.ulozProfil(ucet!.id, { meno, priezvisko, rok_narodenia: rokN, mesto: mesto.trim(), krajina: "Slovensko", profilovka_url: null });
      await db.ulozLokalitu(ucet!.id, { mesto: mesto.trim(), region: mesto.trim(), zdroj: "manual" });
    })) ides("overenie");
  };

  // ---- Doklad a selfie (Didit, zatiaľ simulácia)
  const overTotoznost = async () => {
    setBusy(true);
    try {
      if (naServeri) { const r = await db.spustiKyc(ucet!.id, "nove"); if (r?.vysledok !== "sedi") { setChyba("Overenie neprešlo. Skús to znova."); return; } }
      else await pockaj(700);
      setKyc([true, false]); await pockaj(450); setKyc([true, true]); await pockaj(500);
      vibruj([8, 40, 12]); ides("zobrazenie");
    } catch (e: any) { toast("Chyba: " + (e?.message || e)); }
    finally { setBusy(false); }
  };

  // ---- Zobrazenie
  const zobrTexty = ZOBR.map(([t, f, r]) => ({ t, s: r === "nick" ? (nick.trim() || "Vymysli si ju") : r === "mesto" ? `Niekto ${zMesta(mesto.trim() || "Trenčín")}` : f(meno ?? "", priezvisko) || t }));
  const nahlad = zobrTexty[zobr].s;
  const inic = ZOBR[zobr][2] === "anonym" ? "A" : ZOBR[zobr][2] === "mesto" ? (mesto.trim().slice(0, 2).toUpperCase() || "M") : ZOBR[zobr][2] === "nick" ? (nick.trim().charAt(0).toUpperCase() || "?") : `${(meno ?? "").charAt(0)}${priezvisko.charAt(0)}`.toUpperCase();
  const zobrOk = ZOBR[zobr][2] !== "nick" || nick.trim().length > 1;
  const ulozZobrazenie = async () => { if (await server(() => db.ulozZobrazenie(ucet!.id, { rezim: ZOBR[zobr][2], nick: ZOBR[zobr][2] === "nick" ? nick.trim() : null }))) ides("zaujmy"); };

  // ---- Záujmy (aspoň tri) → personalizácia appky aj DB
  const ulozZaujmy = async () => {
    const zs: Zaujem[] = [];
    for (const t of zaujmy) {
      const [, oblast, pod] = ZAUJMY.find((z) => z[0] === t)!;
      if (pod) zs.push({ oblast, pod_polozka: pod, vlastny: false }); else if (!zs.some((z) => z.oblast === oblast && z.pod_polozka === "*")) zs.push(zaujemZOblasti(oblast));
    }
    ulozZaujmyLokalne(zs);
    if (await server(() => db.ulozZaujmy(ucet!.id, zs.map((z) => ({ oblast: z.oblast, pod_polozka: z.pod_polozka, vlastny: false }))))) ides("vyhlasenie");
  };

  // ---- Ešte dve potvrdenia → koniec
  const dokonci = async () => {
    if (await server(async () => {
      await db.ulozSuhlas(ucet!.id, "cestne_vyhlasenie", true);
      await db.ulozSuhlas(ucet!.id, "briefing", true);
      await db.dokonciRegistraciu(ucet!.id);
    })) { ulozKrok(null); vibruj([10, 50, 14, 50, 20]); ides("hotovo"); }
  };
  const doProfilu = () => {
    if (preOrg) cakajRegistraciuOrg(true); else otvorProfilPoRegistracii();
    setSession({ ucet_id: ucet?.id || undefined, typ: "aktivny", poradove_cislo: clen, meno: meno ?? "" });
    onHotovo?.();
  };

  const kap = PORADIE.indexOf(krok) >= PORADIE.indexOf("telefon") && krok !== "hotovo" ? kapitoly(KAP, krok) : null;
  const zak = { kluc: krok, spat: krok === "hotovo" ? undefined : spat, kap, ctaBusy: busy };

  switch (krok) {
    case "plan": return (
      <Obrazovka {...zak} cta="Začať" onCta={() => ides("telefon")}>
        <Nadpis t="Tri kroky, asi 4 minúty" sub="Môžeš kedykoľvek odísť, uložíme, kde si skončil." />
        <PlanKapitol kap={[{ t: "Účet", s: "telefón, heslo, karta a účet", cas: "2 min" }, { t: "Overenie", s: "doklad a selfie", cas: "1 min" }, { t: "Ty", s: "ako ťa uvidia a čo ťa zaujíma", cas: "1 min" }]} />
      </Obrazovka>);
    case "telefon": return (
      <Obrazovka {...zak} cta="Poslať kód" onCta={posliKod} ctaOff={!telOk}>
        <Nadpis kicker="ÚČET" t="Tvoje telefónne číslo" sub="Je to kľúč k účtu. Pošleme naň kód a cez neho ťa nájdu aj pozvánky." />
        <Pole label="Mobil" pred="+421" value={tel} onChange={(v) => { setChyba(null); setTel(v.replace(/[^\d ]/g, "").slice(0, 11)); }} ok={telOk} chyba={chyba}
          type="tel" inputMode="tel" autoComplete="tel-national" placeholder="912 345 678" onKeyDown={(e) => e.key === "Enter" && telOk && posliKod()} />
      </Obrazovka>);
    case "kod": return (
      <Obrazovka {...zak} cta="Overiť" onCta={overKod} ctaOff={kod.length !== 6}>
        <Nadpis kicker="ÚČET" t="Prepíš kód z SMS" sub={`Poslali sme ho na +421 ${telCislo.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}.`} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <KodPolia value={kod} onChange={(v) => { setChyba(null); setKod(v); }} />
          {chyba ? <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "#B8452F" }}>{chyba}</span>
            : <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Kód sa vyplní sám, keď príde SMS. {odpocet > 0 ? `Poslať znova o 0:${String(odpocet).padStart(2, "0")}` : <button type="button" onClick={posliKod} style={{ border: "none", background: "none", padding: "12px 0", margin: "-12px 0", fontSize: 13.5, fontWeight: 800, color: "var(--gInk)", cursor: "pointer", fontFamily: "inherit" }}>Poslať znova</button>}</span>}
        </div>
      </Obrazovka>);
    case "heslo": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={vytvorUcet} ctaOff={!emailOk || !hesloOk || !pinOk}>
        <Nadpis kicker="ÚČET" t="Heslo a odomknutie" sub="E-mail a heslo na nové zariadenie. Tu stačí tvár." />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Pole label="E-mail" value={email} onChange={(v) => { setChyba(null); setEmail(v); }} ok={emailOk} chyba={chyba} type="email" inputMode="email" autoComplete="email" placeholder="meno@email.sk" />
          <Pole label="Heslo" value={heslo} onChange={setHeslo} ok={hesloOk} hint="Aspoň 8 znakov." type="password" autoComplete="new-password" />
        </div>
        <Prepinace prep={[{ t: "Odomykať tvárou", s: "Face ID na tomto telefóne" }]} stav={[tvar]} onPrepni={() => setTvar((v) => !v)} />
        {!tvar && <Pole label="PIN (4 číslice)" value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))} ok={pinOk} hint="Bez tváre sa do appky vrátiš PIN-om." type="password" inputMode="numeric" autoComplete="off" />}
      </Obrazovka>);
    case "platba": return (
      <Obrazovka {...zak} cta="Overiť kartu a pokračovať" onCta={overKartu} ctaOff={!ibanOk}>
        <Nadpis kicker="PLATBA" t="Ako budeš dávať a dostávať" sub="Teraz nič neplatíš. Kartu len overíme a pri dare už nič nevypĺňaš." />
        <Pole label="Číslo účtu (IBAN)" value={iban} onChange={(v) => setIban(v.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 34))} ok={ibanOk}
          hint="Sem ti pošleme peniaze z Help, výplatu z peňaženky alebo vrátenie daru." placeholder="SK31 1100 0000 0026 1234 5678" autoComplete="off" />
        <Volby volby={[{ t: "Apple Pay", s: "karta z telefónu, jedným dotykom", ik: IK.karta }, { t: "Iná karta", s: "číslo karty, platnosť a CVC", ik: IK.karta2 }]} vybrane={platba} onVyber={setPlatba} />
        <Bublina>Teraz ti nič nestrhneme. Kartu overíme platbou 0 € a jej údaje vidí len banka, nie DEED+.</Bublina>
      </Obrazovka>);
    case "udaje": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={ulozUdaje} ctaOff={!udajeOk}>
        <Nadpis kicker="OVERENIE" t="Ako sa voláš" sub="Tak ako v doklade. Hneď to porovnáme." />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Pole label="Meno a priezvisko" value={menoCele} onChange={setMenoCele} ok={!!meno && !!priezvisko} autoComplete="name" placeholder="Martin Konaľ" />
          <Pole label="Rok narodenia" value={rok} onChange={(v) => setRok(v.replace(/\D/g, "").slice(0, 4))} ok={rokOk} inputMode="numeric" autoComplete="bday-year" placeholder="1984" />
          <Pole label="Mesto" value={mesto} onChange={setMesto} ok={mesto.trim().length > 1} hint="Ulicu pridáš, len ak budeš žiadať o pomoc v Help." autoComplete="address-level2" placeholder="Trenčín" />
        </div>
      </Obrazovka>);
    case "overenie": return (
      <Obrazovka {...zak} cta="Spustiť overenie" onCta={overTotoznost}>
        <Nadpis kicker="OVERENIE" t="Doklad a selfie" sub="Asi minúta. Potom máš peňaženku, DeeD a Help." />
        <KycKarty karty={[{ t: "Odfoť doklad", s: "Rámik ťa navedie", ik: IK.doklad }, { t: "Selfie", s: "Pozri do kamery a otoč hlavu", ik: IK.tvar }]} hotove={kyc} />
        {chyba && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "#B8452F" }}>{chyba}</span>}
        <Bublina>Neboj sa, doklad nikto z DEED+ neuvidí. Overenie robí Didit a nám povie len áno alebo nie.</Bublina>
      </Obrazovka>);
    case "zobrazenie": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={ulozZobrazenie} ctaOff={!zobrOk}>
        <Nadpis kicker="TY" t="Ako ťa uvidia" sub="Pri dare, skutku aj v zozname darcov. Zmeníš pri každom dare." />
        <Volby volby={zobrTexty} vybrane={zobr} onVyber={setZobr} />
        {ZOBR[zobr][2] === "nick" && <Pole label="Prezývka" value={nick} onChange={(v) => setNick(v.slice(0, 24))} ok={nick.trim().length > 1} placeholder="Martinko" autoComplete="nickname" />}
        <div style={{ borderRadius: 18, background: "var(--panel)", border: "1px dashed var(--cardBd)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>TAKTO ŤA UVIDIA PRI DARE</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "none", width: 38, height: 38, borderRadius: 19, background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{inic}</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15 }}>{nahlad}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Strecha pre rodinu Horváthovú · pred 1 min</span></span>
            <b style={{ fontSize: 15, color: "var(--green)" }}>10 €</b>
          </span>
        </div>
      </Obrazovka>);
    case "zaujmy": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={ulozZaujmy} ctaOff={zaujmy.length < 3}>
        <Nadpis kicker="TY" t="Kam ťa smieme pozvať" sub="Vyber aspoň tri. Podľa toho ti ukážeme veci z okolia." />
        <Cipy cipy={ZAUJMY.map((z) => z[0])} vybrane={zaujmy} onPrepni={(t) => setZaujmy((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))} />
        <Bublina>Vyber to čím skôr. V appke je veľa rôzneho obsahu a ja chcem, aby sa k tebe dostalo hlavne to, čo ťa naozaj zaujíma. Zmeniť to môžeš kedykoľvek: Môj profil, potom Nastavenia a Záujmy.</Bublina>
      </Obrazovka>);
    case "vyhlasenie": return (
      <Obrazovka {...zak} cta="Dokončiť registráciu" onCta={dokonci} ctaOff={!potvrd[0] || !potvrd[1]}>
        <Nadpis kicker="TY" t="Ešte dve potvrdenia" />
        <Prepinace prep={[{ t: "Údaje sú pravdivé", s: "Pri vedome falošných údajoch účet zrušíme." }, { t: "Rozumiem, ako chrániť účet", s: "DEED+ účet je tvoja identita. Nikomu nedávaj PIN ani kód z SMS." }]}
          stav={potvrd} onPrepni={(i) => setPotvrd((p) => p.map((v, j) => (j === i ? !v : v)))} />
      </Obrazovka>);
    case "hotovo": return (
      <Obrazovka {...zak} cta={preOrg ? "Pokračovať k organizácii" : "Do môjho profilu"} onCta={doProfilu}>
        <Svetlo vyska={200} radost />
        <Nadpis stred t={`Vitaj${meno ? `, ${meno}` : ""}. Si ${clenCislo(clen)}. člen DEED+`} sub="Účet je overený. V profile si pridaj fotku a pozri, čo si môžeš nastaviť." />
        <Odomknute polozky={["Darovať a robiť skutky", "Peňaženka a DeeD", "Žiadosť o pomoc v Help"]} />
      </Obrazovka>);
  }
}
