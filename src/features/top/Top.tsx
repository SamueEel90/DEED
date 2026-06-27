import { useState } from "react";
import { C } from "@/theme";
import { ModulHlavicka, toast, useScrollHore, useLayout, obalSiroky, IkonaStit, IkonaKorunka, IkonaHviezda, IkonaUsmev, IkonaKompas, IkonaInstitucia } from "@/shared";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { CudziProfil } from "@/features/cudzi-profil/CudziProfil";
import { FunZona } from "@/features/fun/FunZona";
import type { RebricekKategoria, RebricekRozsah, Subjekt, WideProps } from "@/types";

/*
  ============================================================
  MODUL TOP (§14) — rebríčky darcov, hrdinov a B2B partnerov
  ============================================================
  Zjednotené rebríčky z celej platformy (predtým roztrúsené po
  feedoch Domov/Help/Charita/Aktivity). Štvrť · mesto · celé SR.
  Klik na osobu → cudzí profil (§6). FUN → Fun zóna (§13.2).
  ============================================================
*/

// rozsahy rebríčka
const ROZSAHY: RebricekRozsah[] = ["Štvrť", "Mesto", "Celá SR"];

// kategórie ocenení (konsolidované zo všetkých modulov)
const KATEGORIE: RebricekKategoria[] = [
  {
    hl: "B2B PARTNERI", ic: <IkonaStit />, col: "var(--a-info)",
    polozky: [
      { meno: "Kaufland", info: "12 400 € · ESG report", subjekt: { typ: "org", meno: "Kaufland", emoji: "🏢", lok: "Firma · ESG partner", level: "Gold" } },
      { meno: "Lidl", info: "9 800 € · matching", subjekt: { typ: "org", meno: "Lidl pomáha — nadácia", emoji: "🏢", lok: "Firma · matching kampaň", level: "Gold" } },
      { meno: "Tesco", info: "7 200 € · grantový program", subjekt: { typ: "org", meno: "Tesco", emoji: "🏢", lok: "Firma · grantový program", level: "Gold" } },
      { meno: "O2 Slovensko", info: "5 400 € · zamestnanecká zbierka", subjekt: { typ: "org", meno: "O2 Slovensko", emoji: "🏢", lok: "Firma · zamestnanecké 2 %", level: "Silver" } },
      { meno: "Leoni Slovakia", info: "4 600 € · firemné dobrovoľníctvo", subjekt: { typ: "org", meno: "Leoni Slovakia", emoji: "🏭", lok: "Zamestnávateľ · Trenčín", level: "Silver" } },
      { meno: "Vetropack Nemšová", info: "materiál a sklo pre projekty", subjekt: { typ: "org", meno: "Vetropack Nemšová", emoji: "🏭", lok: "Sklárne · Nemšová", level: "Silver" } },
      { meno: "Pekáreň U Janka", info: "denne pečivo do útulku", subjekt: { typ: "org", meno: "Pekáreň U Janka", emoji: "🥨", lok: "Lokálny partner · Trenčín", level: "Silver" } },
      { meno: "Slovnaft", info: "3 100 € · doprava pomoci", subjekt: { typ: "org", meno: "Slovnaft", emoji: "🏢", lok: "Firma · logistika pomoci", level: "Bronze" } },
    ],
  },
  {
    hl: "TOP DARCOVIA", ic: <IkonaKorunka />, col: "var(--a-gold)",
    polozky: [
      { meno: "Lukáš H.", info: "1 850 DEED tento mesiac", subjekt: { typ: "osoba", meno: "Lukáš H.", level: "Gold" } },
      { meno: "Eva K.", info: "1 420 DEED", subjekt: { typ: "osoba", meno: "Eva K.", level: "Gold" } },
      { meno: "Martin K.", info: "1 050 DEED · darca krvi", subjekt: { typ: "osoba", meno: "Martin K.", level: "Gold" } },
      { meno: "Zuzana P.", info: "880 DEED", subjekt: { typ: "osoba", meno: "Zuzana P.", level: "Silver" } },
      { meno: "Tomáš R.", info: "640 DEED", subjekt: { typ: "osoba", meno: "Tomáš R.", level: "Gold" } },
      { meno: "Anonym", info: "510 DEED · potichu", subjekt: { typ: "osoba", meno: "Anonym", level: "Silver" } },
    ],
  },
  {
    hl: "TOP HRDINOVIA", ic: <IkonaHviezda />, col: "var(--a-clay)",
    polozky: [
      { meno: "Jana N.", info: "23 overených skutkov", subjekt: { typ: "osoba", meno: "Jana N.", level: "Gold", stav: "tvorca" } },
      { meno: "Ján H.", info: "18 overených skutkov", subjekt: { typ: "osoba", meno: "Ján H.", level: "Silver" } },
      { meno: "Mária H.", info: "16 overených skutkov", subjekt: { typ: "osoba", meno: "Mária H.", level: "Gold", stav: "tvorca" } },
      { meno: "Dobrovoľní hasiči TN", info: "12 zásahov pre komunitu", subjekt: { typ: "org", meno: "Dobrovoľní hasiči TN", emoji: "🚒", lok: "Komunita · Trenčín", level: "Gold", stav: "tvorca" } },
      { meno: "MUDr. Hraško", info: "9 bezplatných poradní", subjekt: { typ: "osoba", meno: "MUDr. Hraško", level: "Gold", stav: "tvorca" } },
      { meno: "Klub seniorov Sihoť", info: "10 akcií pre seniorov", subjekt: { typ: "org", meno: "Klub seniorov Sihoť", emoji: "☕", lok: "Komunita · Sihoť", level: "Silver", stav: "tvorca" } },
    ],
  },
  {
    hl: "TOP AKTIVITY", ic: <IkonaKompas />, col: "var(--a-teal)",
    polozky: [
      { meno: "Cyklo TN", info: "240 km pre dobro", subjekt: { typ: "osoba", meno: "Cyklo TN", level: "Silver", stav: "tvorca" } },
      { meno: "EkoTím Juh", info: "14 vriec odpadu", subjekt: { typ: "osoba", meno: "EkoTím Juh", level: "Silver", stav: "tvorca" } },
      { meno: "Tlupa", info: "koncert za Mareka", subjekt: { typ: "osoba", meno: "Tlupa", level: "Silver", stav: "tvorca" } },
      { meno: "Crew TN", info: "pouličný tanec pre detský oddiel", subjekt: { typ: "osoba", meno: "Crew TN", level: "Silver", stav: "tvorca" } },
      { meno: "Zelený Trenčín", info: "30 vysadených stromov", subjekt: { typ: "osoba", meno: "Zelený Trenčín", level: "Silver", stav: "tvorca" } },
      { meno: "Klub Delfín", info: "plávanie pre deti", subjekt: { typ: "osoba", meno: "Klub Delfín", level: "Silver", stav: "tvorca" } },
    ],
  },
  {
    hl: "TOP CHARITY", ic: <IkonaInstitucia />, col: "var(--a-plum)",
    polozky: [
      { meno: "Liga proti rakovine", info: "Gold · celá SR", subjekt: { typ: "org", meno: "Liga proti rakovine", emoji: "🎗", lok: "Overená charita · celá SR", level: "Gold" } },
      { meno: "Plamienok", info: "Gold · BA", subjekt: { typ: "org", meno: "Plamienok", emoji: "🕊", lok: "Overená charita · Bratislava", level: "Gold" } },
      { meno: "Dobrý anjel", info: "Gold · celá SR", subjekt: { typ: "org", meno: "Dobrý anjel", emoji: "😇", lok: "Rodiny s vážnou chorobou · SR", level: "Gold" } },
      { meno: "Úsmev ako dar", info: "Gold · celá SR", subjekt: { typ: "org", meno: "Úsmev ako dar", emoji: "🧒", lok: "Deti v náhradnej starostlivosti · SR", level: "Gold" } },
      { meno: "Sloboda zvierat", info: "Gold · útulky SR", subjekt: { typ: "org", meno: "Sloboda zvierat", emoji: "🐾", lok: "Útulky · celá SR", level: "Gold" } },
      { meno: "Depaul Slovensko", info: "Silver · Bratislava", subjekt: { typ: "org", meno: "Depaul Slovensko", emoji: "🏠", lok: "Ľudia bez domova · BA", level: "Silver" } },
    ],
  },
];

export default function ModulTop({ wide }: WideProps) {
  const [screen, setScreen] = useState<"top" | "fun" | "profil">("top"); // top | fun | profil
  const [subjekt, setSubjekt] = useState<Subjekt | null>(null);
  const [rozsah, setRozsah] = useState<RebricekRozsah>("Štvrť");

  const scrollHore = useScrollHore();
  const { desktop } = useLayout();
  const obal = (el: React.ReactNode) => obalSiroky(el, { wide, desktop, max: 620, maxDesktop: 1320 });
  const otvorProfil = (s: Subjekt) => { setSubjekt(s); setScreen("profil"); scrollHore(); };

  if (screen === "fun") return <div style={{ minHeight: "100%" }}>{obal(<FunZona onBack={() => setScreen("top")} toast={toast} />)}</div>;
  if (screen === "profil" && subjekt) return <div style={{ minHeight: "100%" }}>{obal(<CudziProfil subjekt={subjekt as any} toast={toast} onBack={() => setScreen("top")} />)}</div>;

  return (
    <div style={{ minHeight: "100%", paddingBottom: 14 }}>
      <ModulHlavicka title="Top" karma="Gold" right={<Zvoncek color={C.textSec} toast={toast} />} />
      {obal(
        <div style={{ padding: "12px 16px" }}>
          {/* rozsah rebríčka */}
          <div style={{ display: "flex", gap: 7, marginBottom: 6 }}>
            {ROZSAHY.map((r) => {
              const on = rozsah === r;
              return <span key={r} onClick={() => setRozsah(r)} style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 11, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: "pointer",
                background: on ? "rgba(91,155,255,.16)" : C.surface2, border: `1px solid ${on ? "rgba(116,166,255,.5)" : C.line}`, color: on ? "var(--a-info)" : C.textSec }}>{r}</span>;
            })}
          </div>

          {/* FUN zóna — vedľa rebríčka lídrov (§13.2) */}
          <div onClick={() => setScreen("fun")} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(240,199,90,.08)", border: "1px solid rgba(240,199,90,.3)", borderRadius: 14, padding: "12px 14px", margin: "10px 0 4px", cursor: "pointer" }}>
            <span style={{ width: 40, height: 40, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "rgba(240,199,90,.16)" }}>😄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Fun zóna · AI omyly</div>
              <div style={{ fontSize: 11.5, color: C.textTer }}>Najväčšie prešľapy AI v hodnotení</div>
            </div>
            <span style={{ color: C.textTer, fontSize: 16 }}>›</span>
          </div>

          {/* rebríčky po kategóriách — na desktope mriežka (všetkých 5 naraz) */}
          <div style={desktop ? { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0 22px", alignItems: "start" } : undefined}>
          {KATEGORIE.map((kat) => (
            <div key={kat.hl}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 8px" }}>
                <span style={{ display: "flex", color: kat.col }}>{kat.ic as React.ReactNode}</span>
                <span style={{ fontSize: 11, letterSpacing: ".4px", color: C.textTer, fontWeight: 700 }}>{kat.hl}</span>
              </div>
              {kat.polozky.map((p, i) => (
                <div key={p.meno} onClick={() => otvorProfil(p.subjekt)} style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }}>
                  <span style={{ width: 26, fontSize: 14, fontWeight: 800, color: i === 0 ? kat.col : C.textTer, textAlign: "center", flex: "none" }}>{i + 1}.</span>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff", background: kat.col }}>{p.subjekt.emoji || p.meno[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{p.meno}</div>
                    <div style={{ fontSize: 11.5, color: C.textTer }}>{p.info}</div>
                  </div>
                  {i === 0 && <span style={{ flex: "none", fontSize: 16 }}>🏆</span>}
                </div>
              ))}
            </div>
          ))}
          </div>

          <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: 18 }}>Karma sa nedá kúpiť — len zaslúžiť konaním. Rebríčky sú verejné; súkromné osoby v nich nefigurujú.</div>
        </div>
      )}
    </div>
  );
}
