// ============================================================
// Registrácia farnosti (testovacia verzia pre testera) — z osobného účtu, bez IČO kroku charity.
// Vedomá výnimka LEN pre testovaciu verziu (Martin 21. 10.): dohoda „bez overeného účtu sa nikto nezaregistruje“ platí v ostrej verzii.
// Cirkev (jediný číselník lib/mojeFarnosti) → názov + obec → hlavný kostol → IBAN voliteľný („Overiť neskôr v Správe“)
// → Zhrnutie (Podržte a založte farnosť) → Hotovo → Správa farnosti naplnená údajmi z registrácie.
// Server: zaloz_farnost (0154) — stránka typu farnosť, zakladateľ = Farár, adresár (cirkev, obec), prvé miesto = kostol.
// Bez databázy (testovacia verzia v prehliadači) sa farnosť uloží len v tomto prehliadači.
// Ostrá verzia (IBAN povinný, IČO z registra, platca ≠ vlastník) príde samostatne.
// ============================================================
import { useState } from "react";
import * as db from "@/lib/db";
import { CIRKVI, RODINY_CIRKVI, nastavCirkevFarnosti } from "@/lib/mojeFarnosti";
import { nastavAko, otvorSpravuPoRegistracii, cakajRegistraciuOrg, nacitajStrankyUctu, ulozNovuStranku, strankaFarnosti } from "@/lib/mojeStranky";
import { pridajLokalnuStranku, zapisCasRegistracie } from "@/lib/aktivnaCharita";
import { ulozTypStranky } from "@/features/rola/stav";
import { ulozStav } from "@/features/viera/stav";
import { ibanPlatny } from "@/features/rola/OverenieUctu";
import { nacitajNastavenia, zapisNastavenie } from "@/lib/nastaveniaStranky";
import type { Miesto } from "@/lib/miestaFarnosti";
import { Obrazovka, Nadpis, Svetlo, Bublina, Pole, Volby, Odomknute, kapitoly, naServeri, pockaj, vibruj } from "./RegB";
import { ulozKrok } from "./OsobaB";

type Krok = "cirkev" | "zaklad" | "kostol" | "ucet" | "suhrn" | "hotovo";
const PORADIE: Krok[] = ["cirkev", "zaklad", "kostol", "ucet", "suhrn", "hotovo"];
const KAP: [string, Krok[]][] = [["Farnosť", ["cirkev", "zaklad"]], ["Kostol", ["kostol"]], ["Účet", ["ucet", "suhrn"]]];
const pekny = (s: string) => s.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();

export function FarnostB({ prihlaseny, onSpat, onHotovo }: { prihlaseny: { meno: string; ucetId?: string }; onSpat: () => void; onHotovo?: () => void }) {
  const [krok, setKrok] = useState<Krok>("cirkev");
  const [nazov, setNazov] = useState(""), [obec, setObec] = useState("");
  const [cirkev, setCirkev] = useState<string | null>(null);
  const [kostol, setKostol] = useState("");
  const [iban, setIban] = useState(""), [bezUctu, setBezUctu] = useState(false);
  const [busy, setBusy] = useState(false), [chyba, setChyba] = useState("");
  const [id, setId] = useState<string | null>(null);

  const ides = (k: Krok) => { setChyba(""); setKrok(k); };
  const spat = () => { const i = PORADIE.indexOf(krok); if (i <= 0) onSpat(); else ides(PORADIE[i - 1]); };
  const ibanOk = ibanPlatny(iban);
  const cirkevN = CIRKVI.find((c) => c[0] === cirkev)?.[1] ?? "";

  const zaloz = async () => {
    if (busy || !cirkev) return;
    setBusy(true); setChyba("");
    const ucet = bezUctu || !ibanOk ? null : iban.replace(/\s/g, "").toUpperCase();
    try {
      let nove: string;
      if (naServeri && prihlaseny.ucetId) nove = await db.zalozFarnost({ nazov: nazov.trim(), obec: obec.trim(), cirkev, kostol: kostol.trim(), iban: ucet });
      else {
        // testovacia verzia bez databázy: farnosť len v tomto prehliadači
        await pockaj(450);
        nove = `fa-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        pridajLokalnuStranku({ k: nove, n: nazov.trim(), typ: "farnost" });
        const m: Miesto = { id: "0", druh: "farsky", nazov: kostol.trim(), adresa: obec.trim(), media: [], popis: "", historia: "", vytvorene: new Date().toISOString() };
        ulozStav("miesta", nove, [m]);
        await nastavCirkevFarnosti(nove, cirkev);
        if (ucet) { await nacitajNastavenia(nove); zapisNastavenie("ucetFarnosti", ucet); }
      }
      setId(nove); vibruj([10, 50, 14, 50, 20]); ulozKrok(null); ides("hotovo");
    } catch (e) {
      const k = (e as { code?: string })?.code;
      setChyba(k === "28000" ? "Najprv sa prihláste do svojho účtu, potom farnosť pridáte." : "Farnosť sa nepodarilo založiť. Skontrolujte pripojenie a skúste to znova.");
    } finally { setBusy(false); }
  };
  const koniec = () => {
    if (!id) return;
    ulozTypStranky("farnost");
    zapisCasRegistracie(id);
    if (naServeri && prihlaseny.ucetId) void nacitajStrankyUctu();
    nastavAko(id);
    ulozNovuStranku(strankaFarnosti(id, nazov.trim()));
    cakajRegistraciuOrg(false);
    otvorSpravuPoRegistracii("prehlad");
    onHotovo?.();
  };

  const kap = krok !== "hotovo" ? kapitoly(KAP, krok) : null;
  const zak = { kluc: krok, spat: krok === "hotovo" ? undefined : spat, kap, ctaBusy: busy };
  const chybaEl = chyba && <Bublina>{chyba}</Bublina>;

  switch (krok) {
    case "zaklad": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={() => ides("kostol")} ctaOff={nazov.trim().length < 3 || obec.trim().length < 2}>
        <Nadpis kicker="FARNOSŤ" t="Ako sa volá vaša farnosť?" sub="Názov aj obec uvidia veriaci v Adresári. Neskôr ich zmeníte v Správe." />
        <Pole label="Názov farnosti" value={nazov} onChange={(v) => setNazov(v.slice(0, 120))} ok={nazov.trim().length >= 3} placeholder="Farnosť sv. Martina" autoComplete="off" />
        <Pole label="Obec" value={obec} onChange={(v) => setObec(v.slice(0, 80))} ok={obec.trim().length >= 2} placeholder="Obec alebo mesto" autoComplete="address-level2" />
      </Obrazovka>);
    case "cirkev": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={() => ides("zaklad")} ctaOff={!cirkev}>
        <Nadpis kicker="FARNOSŤ" t="Ku ktorej cirkvi patríte?" sub="Podľa nej appka volí slová, napríklad farár, kazateľ alebo dozorca." />
        {RODINY_CIRKVI.map((r, ri) => { const L = CIRKVI.filter((c) => c[3] === ri); return (
          <div key={r} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{r}</span>
            <Volby volby={L.map(([, n, popis]) => ({ t: n, s: popis }))} vybrane={L.findIndex((c) => c[0] === cirkev)} onVyber={(i) => setCirkev(L[i][0])} />
          </div>); })}
      </Obrazovka>);
    case "kostol": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={() => ides("ucet")} ctaOff={kostol.trim().length < 2}>
        <Nadpis kicker="KOSTOL" t="Hlavný kostol" sub="Na neho sa viaže kalendár omší a zvončeková zbierka. Ďalšie kostoly a filiálky pridáte v Správe." />
        <Pole label="Názov kostola" value={kostol} onChange={(v) => setKostol(v.slice(0, 80))} ok={kostol.trim().length >= 2} placeholder="Kostol sv. Martina" autoComplete="off" />
      </Obrazovka>);
    case "ucet": return (
      <Obrazovka {...zak} cta="Pokračovať" onCta={() => { setBezUctu(false); ides("suhrn"); }} ctaOff={!ibanOk} alt="Overiť neskôr v Správe" onAlt={() => { setBezUctu(true); ides("suhrn"); }}>
        <Nadpis kicker="ÚČET" t="Účet farnosti na dary" sub="Môžete ho zadať teraz alebo neskôr. Overenie 0,01 € s kódom spravíte v Správe, kým ho nespravíte, zbierka nebeží naostro." />
        <Pole label="IBAN farnosti" value={iban} onChange={(v) => setIban(v.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 29))} ok={ibanOk} placeholder="SK.. .... .... .... .... ...." autoComplete="off"
          hint={iban && !ibanOk ? "Slovenský IBAN má 24 znakov a začína SK." : undefined} />
        <Bublina>Testovacia verzia: žiadne skutočné peniaze, overenie účtu môžete preskočiť.</Bublina>
      </Obrazovka>);
    case "suhrn": return (
      <Obrazovka {...zak} podrz cta="Podržte a založte farnosť" onCta={() => { void zaloz(); }}>
        <Nadpis kicker="ZHRNUTIE" t="Skontrolujte údaje" sub="Všetko zmeníte aj neskôr v Správe farnosti." />
        <dl style={{ margin: 0, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "4px 16px" }}>
          {([["Cirkev", cirkevN], ["Farnosť", nazov.trim()], ["Obec", obec.trim()], ["Hlavný kostol", kostol.trim()], ["Účet", !bezUctu && ibanOk ? `${pekny(iban)} · neoverený` : "zadáte v Správe"], ["Vaša rola", "Farár · hlavný správca"]] as [string, string][]).map(([k, v], i) => (
            <div key={k} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <dt style={{ flex: "none", width: 104, fontSize: 13.5, color: "var(--ink3)" }}>{k}</dt><dd style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 800, overflowWrap: "anywhere" }}>{v}</dd></div>))}
        </dl>
        {chybaEl}
      </Obrazovka>);
    case "hotovo": return (
      <Obrazovka {...zak} cta="Do Správy farnosti" onCta={koniec}>
        <Svetlo vyska={200} radost />
        <Nadpis stred t={`${nazov.trim()} je v DEED+`} sub="Ste farár a hlavný správca. Pozrite si Správu, nastavte omše a pozvite ľudí." />
        <Odomknute polozky={["Stránka farnosti a Adresár", "Omše, oznamy a zbierky", !bezUctu && ibanOk ? "Overiť účet farnosti v Správe" : "Účet farnosti zadáte v Správe"]} />
      </Obrazovka>);
  }
}
