// KARTA 20 · Nastavenia appky — všetko o appke, nič o profile (fotky, režim profilu a Ochrana osoby sú v Upraviť profil).
// Poradie: Vzhľad · Prístupnosť · Oznámenia · Poloha · Bezpečnosť · Súkromie a údaje · Účet · Pomoc · [Odhlásiť sa].
import { DeedZnacka } from "@/components/DeedZnacka";
import { useState } from "react";
import { useMotiv, type Tema } from "@/components/context";
import { useNastaveniaAppky, zmenNastavenia, type Okruh } from "@/lib/nastaveniaAppky";
import { potvrditTuknutim, nastavPotvrditTuknutim } from "@/features/zbierka/Platba";
import { signOut } from "@/lib/auth";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { IntroPruvodca } from "@/components/intro";
import { JazykObrazovka, StiahnutUdajeObrazovka } from "./JazykUdaje";
import { CasteOtazky, NapisatPodpore, NahlasitProblem, VERZIA_APPKY } from "./Pomoc";
import { ZrusitUcet } from "./ZrusitUcet";
import { PotvrditPlatbuHarok, OkruhHarok, PrihlaseneZariadenia, EmailTelefonHeslo, ZablokovaniLudia, Suhlasy, DetailSuhlasu, hranicaText } from "./Bezpecnost24";
import { zariadenia, useZmenyZariadeni } from "@/lib/zariadenia";
import { zablokovani, useZmenyBlokovania } from "@/lib/blokovanie";
import { NastSekcia as Sekcia, NastRiadok as Riadok, IkonaSek, IK } from "./nastUi";
import "@/styles/platba.css";

const OKRUH: Record<Okruh, string> = { stvrt: "Štvrť", mesto: "Mesto", slovensko: "Slovensko" };

export function Nastavenia20({ onBack, onNotif, onUpravProfil, desktop }: { onBack: () => void; onNotif: () => void; onUpravProfil?: () => void; desktop?: boolean }) {
  const { tema, nastavTemu } = useMotiv();
  const n = useNastaveniaAppky();
  const [tuk, setTuk] = useState(potvrditTuknutim);
  const [harok, setHarok] = useState<null | "okruh" | "platba" | "zrusit" | "uvod">(null);
  const [detail, setDetail] = useState<null | "pod" | "ud">(null); // OPRAVY 34: detail súhlasu (karta 24 · 2f)
  const [obr, setObr] = useState<null | "zariadenia" | "kontakt" | "blokovani" | "suhlasy" | "jazyk" | "udaje" | "faq" | "podpora" | "problem">(null); // obrazovky sprava (karta 24)
  useZmenyZariadeni(); useZmenyBlokovania();

  const pismo = (d: number) => zmenNastavenia({ pismo: Math.min(150, Math.max(90, n.pismo + d)) });
  const pasik = (i: number) => 90 + i * 10 <= n.pismo;

  return (
    <div className="deed-platba" style={{ padding: "0 16px 30px", display: "flex", flexDirection: "column", gap: 14, color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        {!desktop && <SpatTlacidlo onClick={onBack} />}
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Nastavenia</h1>
      </div>

      <Sekcia nadpis="VZHĽAD" k="b">
        <div style={{ padding: "12px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 44 }}>
            <IkonaSek d={IK.moon} />
            <span style={{ fontSize: 16, fontWeight: 700 }} id="tema-nadpis">Téma</span>
          </div>
          <div role="radiogroup" aria-labelledby="tema-nadpis" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: 4, marginTop: 12, borderRadius: 14, background: "var(--seg)" }}>
            {([["svetla", "Svetlá"], ["tmava", "Tmavá"], ["system", "Podľa telefónu"]] as [Tema, string][]).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={tema === k} onClick={() => nastavTemu(k)} className={tema === k ? "seg-on" : undefined}
                style={{ minHeight: 44, padding: "4px 6px", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", lineHeight: 1.2, ...(tema === k ? {} : { background: "transparent", color: "var(--d-ink3, var(--ink3))", boxShadow: "none" }) }}>{l}</button>))}
          </div>
        </div>
        <Riadok d={IK.globe} t="Jazyk" hodnota={n.jazyk} onClick={() => setObr("jazyk")} />
      </Sekcia>

      <Sekcia nadpis="PRÍSTUPNOSŤ" k="g">
        <div style={{ padding: "12px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 44 }}>
            <IkonaSek d={IK.type} />
            <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Veľkosť písma</span>
            <span aria-live="polite" style={{ fontSize: 15, fontWeight: 800, color: "var(--sek-g)", fontVariantNumeric: "tabular-nums" }}>{n.pismo} %</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, paddingLeft: 52 }}>
            <button type="button" onClick={() => pismo(-10)} disabled={n.pismo <= 90} aria-label="Zmenšiť písmo" style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: "var(--btn)", fontSize: 13, fontWeight: 800, color: "var(--ink)", cursor: "pointer", opacity: n.pismo <= 90 ? .4 : 1, fontFamily: "inherit", flex: "none" }}>A</button>
            <div aria-hidden="true" style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
              {Array.from({ length: 7 }, (_, i) => <span key={i} style={{ height: 6, borderRadius: 3, background: pasik(i) ? "var(--sek-g)" : "var(--d-trackOff, var(--track))" }} />)}
            </div>
            <button type="button" onClick={() => pismo(10)} disabled={n.pismo >= 150} aria-label="Zväčšiť písmo" style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: "var(--btn)", fontSize: 20, fontWeight: 800, color: "var(--ink)", cursor: "pointer", opacity: n.pismo >= 150 ? .4 : 1, fontFamily: "inherit", flex: "none" }}>A</button>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--d-ink3, var(--ink3))", marginTop: 8, paddingLeft: 52 }}>Pridáva sa k veľkosti písma v telefóne.</div>
        </div>
        <Riadok d={IK.spark} t="Obmedziť animácie" s="bez letov, iskier a pulzovania" prepinac={n.obmedzAnim} onClick={() => zmenNastavenia({ obmedzAnim: !n.obmedzAnim })} />
        <Riadok d={IK.vib} t="Vibrácie" s="pri potvrdení a po dare" prepinac={n.vibracie} onClick={() => zmenNastavenia({ vibracie: !n.vibracie })} />
        <Riadok d={IK.cc} t="Titulky vo videách" s="vždy zapnuté" prepinac={n.titulky} onClick={() => zmenNastavenia({ titulky: !n.titulky })} />
        <Riadok d={IK.tap} t="Potvrdzovať ťuknutím" s="namiesto podržania, pri platbe dvakrát ťukni" prepinac={tuk} onClick={() => { nastavPotvrditTuknutim(!tuk); setTuk(!tuk); }} />
      </Sekcia>

      <Sekcia nadpis="OZNÁMENIA" k="o">
        <Riadok prvy d={IK.bell} t="Čo chceš dostávať" s="dary, pozvánky, priatelia, zbierky" onClick={onNotif} />
        <Riadok d={IK.clock} t="Tichý čas" s={`${n.tichyOd} – ${n.tichyDo}, okrem SOS`} prepinac={n.tichyCas} onClick={() => zmenNastavenia({ tichyCas: !n.tichyCas })} />
      </Sekcia>

      <Sekcia nadpis="POLOHA" k="r">
        <Riadok prvy d={IK.pin} t="Poloha telefónu" s="na skutky a pomoc v okolí" prepinac={n.poloha} onClick={() => zmenNastavenia({ poloha: !n.poloha })} />
        <Riadok d={IK.ring} t="Predvolený okruh" s={n.odPolohy ? "podľa toho, kde práve si" : undefined} hodnota={OKRUH[n.okruh]} onClick={() => setHarok("okruh")} />
      </Sekcia>

      <Sekcia nadpis="BEZPEČNOSŤ" k="b">
        <Riadok prvy d={IK.finger} t="Prihlásenie tvárou alebo odtlačkom" prepinac={n.biometria} onClick={() => zmenNastavenia({ biometria: !n.biometria })} />
        <Riadok d={IK.shield} t="Potvrdiť platbu nad" s="tvárou, odtlačkom alebo PIN" hodnota={<b style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{hranicaText(n.hranicaPlatby)}</b>} onClick={() => setHarok("platba")} />
        <Riadok d={IK.phone} t="Prihlásené zariadenia" hodnota={String(zariadenia().length)} onClick={() => setObr("zariadenia")} />
        <Riadok d={IK.mail} t="E-mail, telefón a heslo" onClick={() => setObr("kontakt")} />
      </Sekcia>

      <Sekcia nadpis="SÚKROMIE A ÚDAJE" k="b">
        <Riadok prvy d={IK.users} t="Hľadať priateľov v kontaktoch" s="čísla sa neukladajú, len ich odtlačok" prepinac={n.kontakty} onClick={() => zmenNastavenia({ kontakty: !n.kontakty })} />
        <Riadok d={IK.block} t="Zablokovaní ľudia" hodnota={String(zablokovani().length)} onClick={() => setObr("blokovani")} />
        <Riadok d={IK.file} t="Súhlasy" onClick={() => setObr("suhlasy")} />
        <Riadok d={IK.download} t="Stiahnuť moje údaje" s="všetko o tebe v jednom súbore" onClick={() => setObr("udaje")} />
      </Sekcia>

      <Sekcia nadpis="ÚČET" k="b">
        <Riadok prvy d={IK.trash} t="Zrušiť účet" onClick={() => setHarok("zrusit")} />
      </Sekcia>

      <Sekcia nadpis="POMOC" k="g">
        <Riadok prvy d={IK.play} t="Prehrať úvod" onClick={() => setHarok("uvod")} />
        <Riadok d={IK.bulb} t="Ukážky pre začiatok" s="inšpirácia v prázdnych zoznamoch, len pre teba" prepinac={n.ukazky} onClick={() => zmenNastavenia({ ukazky: !n.ukazky })} />
        <Riadok d={IK.help} t="Časté otázky" onClick={() => setObr("faq")} />
        <Riadok d={IK.chat} t="Napísať podpore" onClick={() => setObr("podpora")} />
        <Riadok d={IK.flag} t="Nahlásiť problém" onClick={() => setObr("problem")} />
        <Riadok d={IK.file} t="Podmienky používania" onClick={() => setDetail("pod")} />
        <Riadok d={IK.lock} t="Ochrana súkromia" onClick={() => setDetail("ud")} />
      </Sekcia>

      <button type="button" onClick={() => { toast("Odhlásené"); void signOut(); }} style={{ minHeight: 54, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 16, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>Odhlásiť sa</button>
      <div style={{ fontSize: 12.5, color: "var(--ink3)", textAlign: "center" }}><DeedZnacka /> · verzia {VERZIA_APPKY}</div>

      {harok === "okruh" && <OkruhHarok onClose={() => setHarok(null)} onZmenitMiesto={() => { setHarok(null); onUpravProfil?.(); }} />}
      {harok === "platba" && <PotvrditPlatbuHarok onClose={() => setHarok(null)} />}
      {obr === "zariadenia" && <PrihlaseneZariadenia onBack={() => setObr(null)} />}
      {obr === "kontakt" && <EmailTelefonHeslo onBack={() => setObr(null)} />}
      {obr === "blokovani" && <ZablokovaniLudia onBack={() => setObr(null)} />}
      {obr === "suhlasy" && <Suhlasy onBack={() => setObr(null)} />}
      {obr === "jazyk" && <JazykObrazovka onBack={() => setObr(null)} />}
      {obr === "udaje" && <StiahnutUdajeObrazovka onBack={() => setObr(null)} />}
      {obr === "faq" && <CasteOtazky onBack={() => setObr(null)} onPodpora={() => setObr("podpora")} />}
      {obr === "podpora" && <NapisatPodpore onBack={() => setObr(null)} />}
      {obr === "problem" && <NahlasitProblem onBack={() => setObr(null)} />}
      {detail && <DetailSuhlasu typ={detail} onBack={() => setDetail(null)} />}
      {harok === "zrusit" && <ZrusitUcet onClose={() => setHarok(null)} />}
      {harok === "uvod" && <IntroPruvodca onClose={() => setHarok(null)} />}
    </div>
  );
}
