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
import { JazykObrazovka, StiahnutUdajeObrazovka, JazykNazov, JazykLista } from "./JazykUdaje";
import { CasteOtazky, NapisatPodpore, NahlasitProblem, VERZIA_APPKY } from "./Pomoc";
import { ZrusitUcet } from "./ZrusitUcet";
import { PotvrditPlatbuHarok, OkruhHarok, PrihlaseneZariadenia, EmailTelefonHeslo, ZablokovaniLudia, Suhlasy, DetailSuhlasu, hranicaText } from "./Bezpecnost24";
import { zariadenia, useZmenyZariadeni } from "@/lib/zariadenia";
import { zablokovani, useZmenyBlokovania } from "@/lib/blokovanie";
import { NastSekcia as Sekcia, NastRiadok as Riadok, IkonaSek, IK } from "./nastUi";
import { useT } from "@/i18n";
import "@/styles/platba.css";

const OKRUH: Record<Okruh, string> = { stvrt: "nastavenia.okruh.stvrt", mesto: "nastavenia.okruh.mesto", slovensko: "nastavenia.okruh.slovensko" };

export function Nastavenia20({ onBack, onNotif, onUpravProfil, desktop }: { onBack: () => void; onNotif: () => void; onUpravProfil?: () => void; desktop?: boolean }) {
  const { tema, nastavTemu } = useMotiv();
  const t = useT();
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
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{t("nastavenia.titul")}</h1>
      </div>

      <Sekcia nadpis={t("nastavenia.sek.vzhlad")} k="b">
        <div style={{ padding: "12px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 44 }}>
            <IkonaSek d={IK.moon} />
            <span style={{ fontSize: 16, fontWeight: 700 }} id="tema-nadpis">{t("nastavenia.tema")}</span>
          </div>
          <div role="radiogroup" aria-labelledby="tema-nadpis" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: 4, marginTop: 12, borderRadius: 14, background: "var(--seg)" }}>
            {([["svetla", t("nastavenia.tema.svetla")], ["tmava", t("nastavenia.tema.tmava")], ["system", t("nastavenia.tema.system")]] as [Tema, string][]).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={tema === k} onClick={() => nastavTemu(k)} className={tema === k ? "seg-on" : undefined}
                style={{ minHeight: 44, padding: "4px 6px", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", lineHeight: 1.2, ...(tema === k ? {} : { background: "transparent", color: "var(--d-ink3, var(--ink3))", boxShadow: "none" }) }}>{l}</button>))}
          </div>
        </div>
        <Riadok d={IK.globe} t={<JazykNazov jazyk={n.jazyk} />} hodnota={n.jazyk} onClick={() => setObr("jazyk")} />
      </Sekcia>

      <Sekcia nadpis={t("nastavenia.sek.pristupnost")} k="g">
        <div style={{ padding: "12px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 44 }}>
            <IkonaSek d={IK.type} />
            <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{t("nastavenia.pismo")}</span>
            <span aria-live="polite" style={{ fontSize: 15, fontWeight: 800, color: "var(--sek-g)", fontVariantNumeric: "tabular-nums" }}>{t("nastavenia.pct", { n: n.pismo })}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, paddingLeft: 52 }}>
            <button type="button" onClick={() => pismo(-10)} disabled={n.pismo <= 90} aria-label={t("nastavenia.pismoMensie")} style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: "var(--btn)", fontSize: 13, fontWeight: 800, color: "var(--ink)", cursor: "pointer", opacity: n.pismo <= 90 ? .4 : 1, fontFamily: "inherit", flex: "none" }}>A</button>
            <div aria-hidden="true" style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
              {Array.from({ length: 7 }, (_, i) => <span key={i} style={{ height: 6, borderRadius: 3, background: pasik(i) ? "var(--sek-g)" : "var(--d-trackOff, var(--track))" }} />)}
            </div>
            <button type="button" onClick={() => pismo(10)} disabled={n.pismo >= 150} aria-label={t("nastavenia.pismoVacsie")} style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: "var(--btn)", fontSize: 20, fontWeight: 800, color: "var(--ink)", cursor: "pointer", opacity: n.pismo >= 150 ? .4 : 1, fontFamily: "inherit", flex: "none" }}>A</button>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--d-ink3, var(--ink3))", marginTop: 8, paddingLeft: 52 }}>{t("nastavenia.pismoPozn")}</div>
        </div>
        <Riadok d={IK.spark} t={t("nastavenia.anim")} s={t("nastavenia.animS")} prepinac={n.obmedzAnim} onClick={() => zmenNastavenia({ obmedzAnim: !n.obmedzAnim })} />
        <Riadok d={IK.vib} t={t("nastavenia.vib")} s={t("nastavenia.vibS")} prepinac={n.vibracie} onClick={() => zmenNastavenia({ vibracie: !n.vibracie })} />
        <Riadok d={IK.cc} t={t("nastavenia.titulky")} s={t("nastavenia.titulkyS")} prepinac={n.titulky} onClick={() => zmenNastavenia({ titulky: !n.titulky })} />
        <Riadok d={IK.tap} t={t("nastavenia.tuk")} s={t("nastavenia.tukS")} prepinac={tuk} onClick={() => { nastavPotvrditTuknutim(!tuk); setTuk(!tuk); }} />
      </Sekcia>

      <Sekcia nadpis={t("nastavenia.sek.oznamenia")} k="o">
        <Riadok prvy d={IK.bell} t={t("nastavenia.notif")} s={t("nastavenia.notifS")} onClick={onNotif} />
        <Riadok d={IK.clock} t={t("nastavenia.ticho")} s={t("nastavenia.tichoS", { od: n.tichyOd, do: n.tichyDo })} prepinac={n.tichyCas} onClick={() => zmenNastavenia({ tichyCas: !n.tichyCas })} />
      </Sekcia>

      <Sekcia nadpis={t("nastavenia.sek.poloha")} k="r">
        <Riadok prvy d={IK.pin} t={t("nastavenia.poloha")} s={t("nastavenia.polohaS")} prepinac={n.poloha} onClick={() => zmenNastavenia({ poloha: !n.poloha })} />
        <Riadok d={IK.ring} t={t("nastavenia.okruh")} s={n.odPolohy ? t("nastavenia.okruhS") : undefined} hodnota={t(OKRUH[n.okruh])} onClick={() => setHarok("okruh")} />
      </Sekcia>

      <Sekcia nadpis={t("nastavenia.sek.bezpecnost")} k="b">
        <Riadok prvy d={IK.finger} t={t("nastavenia.bio")} prepinac={n.biometria} onClick={() => zmenNastavenia({ biometria: !n.biometria })} />
        <Riadok d={IK.shield} t={t("nastavenia.platba")} s={t("nastavenia.platbaS")} hodnota={<b style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{hranicaText(n.hranicaPlatby)}</b>} onClick={() => setHarok("platba")} />
        <Riadok d={IK.phone} t={t("nastavenia.zariadenia")} hodnota={t.cislo(zariadenia().length)} onClick={() => setObr("zariadenia")} />
        <Riadok d={IK.mail} t={t("nastavenia.kontakt")} onClick={() => setObr("kontakt")} />
      </Sekcia>

      <Sekcia nadpis={t("nastavenia.sek.sukromie")} k="b">
        <Riadok prvy d={IK.users} t={t("nastavenia.kontakty")} s={t("nastavenia.kontaktyS")} prepinac={n.kontakty} onClick={() => zmenNastavenia({ kontakty: !n.kontakty })} />
        <Riadok d={IK.block} t={t("nastavenia.blokovani")} hodnota={t.cislo(zablokovani().length)} onClick={() => setObr("blokovani")} />
        <Riadok d={IK.file} t={t("nastavenia.suhlasy")} onClick={() => setObr("suhlasy")} />
        <Riadok d={IK.download} t={t("nastavenia.udaje")} s={t("nastavenia.udajeS")} onClick={() => setObr("udaje")} />
      </Sekcia>

      <Sekcia nadpis={t("nastavenia.sek.ucet")} k="b">
        <Riadok prvy d={IK.trash} t={t("nastavenia.zrusit")} onClick={() => setHarok("zrusit")} />
      </Sekcia>

      <Sekcia nadpis={t("nastavenia.sek.pomoc")} k="g">
        <Riadok prvy d={IK.play} t={t("nastavenia.uvod")} onClick={() => setHarok("uvod")} />
        <Riadok d={IK.bulb} t={t("nastavenia.ukazky")} s={t("nastavenia.ukazkyS")} prepinac={n.ukazky} onClick={() => zmenNastavenia({ ukazky: !n.ukazky })} />
        <Riadok d={IK.help} t={t("nastavenia.faq")} onClick={() => setObr("faq")} />
        <Riadok d={IK.chat} t={t("nastavenia.podpora")} onClick={() => setObr("podpora")} />
        <Riadok d={IK.flag} t={t("nastavenia.problem")} onClick={() => setObr("problem")} />
        <Riadok d={IK.file} t={t("nastavenia.podmienky")} onClick={() => setDetail("pod")} />
        <Riadok d={IK.lock} t={t("nastavenia.sukromie")} onClick={() => setDetail("ud")} />
      </Sekcia>

      <button type="button" onClick={() => { toast(t("nastavenia.odhlasene")); void signOut(); }} style={{ minHeight: 54, borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--btn)", fontSize: 16, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}>{t("nastavenia.odhlasit")}</button>
      <div style={{ fontSize: 12.5, color: "var(--ink3)", textAlign: "center" }}><DeedZnacka /> · {t("nastavenia.verzia", { v: VERZIA_APPKY })}</div>

      {harok === "okruh" && <OkruhHarok onClose={() => setHarok(null)} onZmenitMiesto={() => { setHarok(null); onUpravProfil?.(); }} />}
      {harok === "platba" && <PotvrditPlatbuHarok onClose={() => setHarok(null)} />}
      {obr === "zariadenia" && <PrihlaseneZariadenia onBack={() => setObr(null)} />}
      {obr === "kontakt" && <EmailTelefonHeslo onBack={() => setObr(null)} />}
      {obr === "blokovani" && <ZablokovaniLudia onBack={() => setObr(null)} />}
      {obr === "suhlasy" && <Suhlasy onBack={() => setObr(null)} />}
      {obr === "jazyk" && <JazykObrazovka onBack={() => setObr(null)} />}
      <JazykLista />
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
