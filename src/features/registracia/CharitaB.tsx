// KARTA 44 · registrácia charity 1b — z osobného účtu (Martin 4. 10.): jeden telefón = jeden osobný účet,
// organizácia je stránka, ktorú osoba spravuje (Konáš ako). Telefón, heslo ani selfie sa tu už nerobia.
// Účet → Plán → IČO (register, nemeniteľné) → Štatutár (porovnanie s overeným účtom / pozvánka) → Stanovy (povinné)
// → Profil (veta, IBAN s overením 0,01 €, sektory) → Možnosti → Náhľad (Bronzový štít) → Hotovo.
// Programy len Zadarmo · Zbierka · Akcia · Kampaň (vyberá sa v Správe → Program a predplatné).
import { useRef, useState } from "react";
import * as db from "@/lib/db";
import { nastavAko, otvorSpravuPoRegistracii, cakajRegistraciuOrg } from "@/lib/mojeStranky";
import { ulozIbanOrg, ulozTypStranky } from "@/features/rola/stav";
import { overIban } from "@/features/rola/segmenty";
import type { RegistrIcoVysledok } from "@/types";
import { Obrazovka, Nadpis, Svetlo, Bublina, Pole, Volby, Prepinace, Cipy, KycKarty, PlanKapitol, Register, Odomknute, kapitoly, naServeri, pockaj, vibruj, IK, U } from "./RegB";
import { ulozKrok } from "./OsobaB";

export type KrokOrg = "ucet" | "plan" | "ico" | "statutar" | "stanovy" | "profil" | "moznosti" | "nahlad" | "hotovo";
const PORADIE: KrokOrg[] = ["ucet", "plan", "ico", "statutar", "stanovy", "profil", "moznosti", "nahlad", "hotovo"];
const KAP: [string, KrokOrg[]][] = [["Organizácia", ["ico"]], ["Overenie", ["statutar", "stanovy"]], ["Profil", ["profil", "moznosti", "nahlad"]]];
const SEKTORY = ["Sociálne", "Deti", "Zdravie", "Seniori"];
const datum = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? iso : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
const inicialy = (n: string) => n.replace(/\b(o\.\s?z\.|n\.\s?o\.|s\.\s?r\.\s?o\.)/gi, "").trim().split(/\s+/).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join("");

export function CharitaB({ prihlaseny, onSpat, onPrihlasit, onBezUctu, onHotovo, toast }: {
  /** prihlásená osoba (z nej sa organizácia pridáva) — null = najprv prihlásenie alebo registrácia osoby */
  prihlaseny: { meno: string; ucetId?: string } | null;
  onSpat: () => void; onPrihlasit: () => void; onBezUctu: () => void; onHotovo?: () => void; toast: (t: string) => void;
}) {
  const [krok, setKrok] = useState<KrokOrg>("ucet");
  const [busy, setBusy] = useState(false);
  const [volbaUctu, setVolbaUctu] = useState(0);
  const [org, setOrg] = useState<{ id: string } | null>(null);
  const [ico, setIco] = useState(""), [reg, setReg] = useState<RegistrIcoVysledok | null>(null), [hladam, setHladam] = useState(false);
  const [jaStatutar, setJaStatutar] = useState(0);
  const [stanovy, setStanovy] = useState<File | null>(null);
  const subor = useRef<HTMLInputElement>(null);
  const [veta, setVeta] = useState(""), [iban, setIban] = useState(""), [sektory, setSektory] = useState<string[]>(SEKTORY.slice(0, 2));
  const [moz, setMoz] = useState([true, false]);

  const nazov = reg?.nazov ?? "";
  const statutar = prihlaseny?.meno ?? ""; // DEMO register: štatutár = prihlásená osoba (ostrý register vráti meno z ORSR / registra MV)

  const ides = (k: KrokOrg) => { setKrok(k); if (k !== "hotovo" && PORADIE.indexOf(k) > 1) ulozKrok({ typ: "org", krok: k }); };
  const spat = () => { const i = PORADIE.indexOf(krok); if (i <= 0) onSpat(); else ides(PORADIE[i - 1]); };
  const server = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { if (naServeri && prihlaseny?.ucetId) await fn(); else await pockaj(450); return true; }
    catch (e: any) { toast("Chyba: " + (e?.message || e)); return false; }
    finally { setBusy(false); }
  };

  // IČO: po 8 čísliciach sa hneď pýtame registra
  const zmenIco = async (v: string) => {
    const c = v.replace(/\D/g, "").slice(0, 8);
    setIco(c.replace(/(\d{2})(\d{3})(\d{0,3})/, "$1 $2 $3").trim()); setReg(null);
    if (c.length !== 8) return;
    setHladam(true);
    try { setReg(await db.najdiIco(c)); } catch (e: any) { toast("Register neodpovedá: " + (e?.message || e)); }
    finally { setHladam(false); }
  };
  const potvrdIco = async () => {
    if (!reg) return;
    if (await server(async () => {
      const o = org ?? await db.vytvorOrganizaciuPodOsobou(prihlaseny!.ucetId!);
      setOrg(o);
      await db.ulozOrganizaciu(o.id, { ico: reg.ico, nazov: reg.nazov, sidlo: reg.sidlo, datum_vzniku: reg.datum_vzniku, pravna_forma: reg.pravna_forma, z_registra: true });
    })) ides("statutar");
  };
  const potvrdStatutara = async () => {
    if (await server(() => db.prepojStatutara(org!.id, jaStatutar === 0 ? prihlaseny!.ucetId! : null, jaStatutar === 0 ? "štatutár (register)" : "štatutár (pozvánka)"))) {
      if (jaStatutar === 1) toast("Štatutárovi pošleme pozvánku. Vy ste správca.");
      ides("stanovy");
    }
  };
  const overStanovy = async () => { if (await server(() => db.spustiKyb(org!.id, { stanovyRef: stanovy?.name ?? null }))) { vibruj(8); ides("profil"); } };

  const ibanCisty = overIban(iban);
  const profilOk = veta.trim().length > 5 && !!ibanCisty && sektory.length > 0;
  const ulozProfil = async () => {
    ulozIbanOrg("charita", ibanCisty!); // správa charity ho ukáže pri centrálnej zbierke (overenie 0,01 € beží tam)
    if (await server(async () => {
      await db.ulozProfilCharity(org!.id, { misia: veta.trim(), web: null, siete: [], uplnost: 60 });
      await db.ulozOrganizaciu(org!.id, { bankovy_ucet: ibanCisty });
      await db.ulozSegmenty(org!.id, sektory.map((s) => ({ sektor: s, pod_segment: null, vlastny: false })));
    })) ides("moznosti");
  };
  const ulozMoznosti = async () => {
    if (await server(async () => {
      await db.ulozDobrovolnictvo(org!.id, { zaujem: moz[0], typ: [] });
      await db.ulozSuhlas(prihlaseny!.ucetId!, "cestne_vyhlasenie_org", true, org!.id);
    })) ides("nahlad");
  };
  const zverejni = async () => {
    if (await server(async () => { await db.ulozBalik(org!.id, "free"); await db.dokonciRegistraciu(org!.id); })) { vibruj([10, 50, 14, 50, 20]); ulozKrok(null); ides("hotovo"); }
  };
  const koniec = (ciel: "prehlad" | "program") => {
    ulozTypStranky("charita");
    nastavAko("svetlo"); // Konáš ako = nová organizácia (zoznam stránok je zatiaľ ukážkový, v produkcii príde z rolí účtu)
    cakajRegistraciuOrg(false);
    otvorSpravuPoRegistracii(ciel);
    onHotovo?.();
  };

  const kap = PORADIE.indexOf(krok) >= PORADIE.indexOf("ico") && krok !== "hotovo" ? kapitoly(KAP, krok) : null;
  const zak = { kluc: krok, spat: krok === "hotovo" ? undefined : spat, kap, ctaBusy: busy };

  switch (krok) {
    case "ucet": {
      const volby = prihlaseny
        ? [{ t: `Prihlásený · ${prihlaseny.meno}`, s: "účet je overený" }]
        : [{ t: "Prihlásiť sa", s: "e-mail a heslo vášho osobného účtu" }, { t: "Ešte nemám účet", s: "najprv krátka registrácia osoby (4 min), potom sem" }];
      const dalej = () => { if (prihlaseny) ides("plan"); else if (volbaUctu === 0) { cakajRegistraciuOrg(true); onPrihlasit(); } else onBezUctu(); };
      return (
        <Obrazovka {...zak} cta={prihlaseny ? `Pokračovať ako ${prihlaseny.meno.split(" ")[0]}` : "Pokračovať"} onCta={dalej}>
          <Nadpis kicker="ÚČET" t="Organizáciu pridáte z vlastného účtu" sub="Jeden človek, jeden účet. Z neho spravujete seba aj všetky organizácie a firmy. Prepínate v Konáš ako." />
          <Volby volby={volby} vybrane={prihlaseny ? 0 : volbaUctu} onVyber={setVolbaUctu} />
        </Obrazovka>);
    }
    case "plan": return (
      <Obrazovka {...zak} cta="Začať" onCta={() => ides("ico")}>
        <Nadpis t="Tri kroky, asi 4 minúty" sub="Pripravte si IČO a stanovy. Telefón, heslo ani selfie už nerobíte, máte ich v účte." />
        <PlanKapitol kap={[{ t: "Organizácia", s: "IČO, zvyšok doplníme z registra", cas: "1 min" }, { t: "Overenie", s: "štatutár z registra a stanovy", cas: "1 min" }, { t: "Profil", s: "čo robíte a účet na dary", cas: "2 min" }]} />
      </Obrazovka>);
    case "ico": return (
      <Obrazovka {...zak} cta="Áno, to sme my" onCta={potvrdIco} ctaOff={!reg} alt={reg ? "Nie, zadať iné IČO" : undefined} onAlt={() => { setIco(""); setReg(null); }}>
        <Nadpis kicker="ORGANIZÁCIA" t="Je to vaša organizácia?" sub="Stačilo IČO. Údaje z registra sa meniť nedajú." />
        <Pole label="IČO" value={ico} onChange={zmenIco} ok={!!reg} hint={hladam ? "Hľadám v registri…" : undefined} inputMode="numeric" autoComplete="off" placeholder="12 345 678" />
        {reg && <Register riadky={[["Názov", reg.nazov], ["Sídlo", reg.sidlo], ["Vznik", datum(reg.datum_vzniku)], ["Štatutár", statutar]]} />}
      </Obrazovka>);
    case "statutar": return (
      <Obrazovka {...zak} cta="Potvrdiť" onCta={potvrdStatutara}>
        <Nadpis kicker="OVERENIE" t={`Ste ${statutar}?`} sub="Za organizáciu smie konať len štatutár z registra. Porovnáme ho s vaším overeným účtom." />
        <Volby volby={[{ t: "Áno, som štatutár", s: "meno a dátum narodenia sedia s registrom" }, { t: "Nie, registrujem za štatutára", s: "Pošleme mu pozvánku. Vy budete správca." }]} vybrane={jaStatutar} onVyber={setJaStatutar} />
        <Bublina>Nové selfie netreba. Overili ste sa pri svojom účte.</Bublina>
      </Obrazovka>);
    case "stanovy": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={overStanovy} ctaOff={!stanovy}>
        <Nadpis kicker="OVERENIE" t="Stanovy" sub="Podľa nich hneď ponúkneme sektory, ktoré smiete otvoriť." />
        <KycKarty karty={[{ t: stanovy ? "Stanovy nahrané" : "Nahrať stanovy", s: stanovy ? stanovy.name : "PDF alebo fotka", ik: IK.subor }]} hotove={[!!stanovy]} onTap={() => subor.current?.click()} />
        <input ref={subor} type="file" accept="application/pdf,image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; if (f.size > 20 * 1024 * 1024) { toast("Súbor je väčší ako 20 MB."); return; } setStanovy(f); vibruj(8); }} />
        <Bublina>Stanovy vidí len DEED+. Darcovia vidia iba to, že sú overené.</Bublina>
      </Obrazovka>);
    case "profil": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={ulozProfil} ctaOff={!profilOk}>
        <Nadpis kicker="PROFIL" t="Čo robíte" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Pole label="Jedna veta pre darcov" value={veta} onChange={(v) => setVeta(v.slice(0, 140))} ok={veta.trim().length > 5} placeholder="Varíme, opravujeme, sprevádzame…" autoComplete="off" />
          <Pole label="Účet na dary (IBAN)" value={iban} onChange={(v) => setIban(v.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 34))} ok={!!ibanCisty} hint="Pošleme 0,01 € s kódom, ním účet potvrdíte." placeholder="SK12 0900 0000 0051 2345 4521" autoComplete="off" />
        </div>
        <Cipy cipy={SEKTORY} vybrane={sektory} onPrepni={(t) => setSektory((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))} />
      </Obrazovka>);
    case "moznosti": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={ulozMoznosti} ctaOff={!moz[1]}>
        <Nadpis kicker="PROFIL" t="Čo ešte ponúkate" />
        <Prepinace prep={[{ t: "Prijímame dobrovoľníkov", s: "Ukážeme vás ľuďom a firmám, ktoré chcú pomáhať." }, { t: "Údaje sú pravdivé", s: jaStatutar === 0 ? "Konám za organizáciu ako štatutár." : "Konám za organizáciu so súhlasom štatutára." }]}
          stav={moz} onPrepni={(i) => setMoz((m) => m.map((v, j) => (j === i ? !v : v)))} />
      </Obrazovka>);
    case "nahlad": return (
      <Obrazovka {...zak} cta="Zverejniť profil" onCta={zverejni}>
        <Nadpis kicker="PROFIL" t="Takto vás uvidia darcovia" />
        <div style={{ borderRadius: 22, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)" }}>
          <span style={{ display: "block", height: 110, background: U("photo-1542601906990-b4d3fb778b09") }} />
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -32 }}>
              <span style={{ width: 64, height: 64, borderRadius: 18, background: "#fff", border: "3px solid var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#3F6E2A" }}>{inicialy(nazov)}</span>
              <img src="/odznaky/care/bronze.png" alt="Štít DEED+ CARE · Bronzový" style={{ width: 58, height: 70, marginTop: -20, objectFit: "contain", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.35))" }} />
            </div>
            <b style={{ fontSize: 19 }}>{nazov}</b>
            <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{veta}</span>
          </div>
        </div>
        <Bublina>Začínate s Bronzovým štítom. Rastie s vašimi činmi a aktivitou. Logo a fotky pridáte v Správe.</Bublina>
      </Obrazovka>);
    case "hotovo": return (
      <Obrazovka {...zak} cta="Do Správy organizácie" onCta={() => koniec("prehlad")} alt="Program a predplatné" onAlt={() => koniec("program")}>
        <Svetlo vyska={200} radost />
        <Nadpis stred t={`${nazov} je v DEED+`} sub={jaStatutar === 0 ? "Organizácia aj štatutár sú overení. Prvú zbierku máte zadarmo." : "Organizácia je overená, štatutár dostal pozvánku. Prvú zbierku máte zadarmo."} />
        <Odomknute polozky={["Prvá zbierka zadarmo", "Skutky a Iskry za organizáciu", "Profil v adresári"]} />
      </Obrazovka>);
  }
}
