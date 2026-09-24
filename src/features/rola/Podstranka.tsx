import { Fragment, useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS, SIRKA } from "@/theme";
import {
  BackHeader, PlatobnyModul, PlatbaModal, ProgresBox, QrModal, Stit, naStitLevel, tint,
  Zdielanie, Zvon, Srdce, useLayout, obalSiroky, Sheet,
  EntityHero, BtnAkcia, BtnIkonka, KontextMenu, TabyProfil, StatRad,
  IkonaMoznosti, IkonaQr, IkonaVlajka, IkonaPin, IkonaOdkaz,
} from "@/shared";
import { pressable } from "@/components/pressable";
import { usePouzivatel } from "@/lib/pouzivatel";
import { klucEntity, useFotkyEntity } from "@/lib/fotoentity";
import { NahlasitSheet } from "@/components/nahlasit";
import { qrUrl } from "@/lib/qr";
import { RecurringSheet } from "@/components/recurring";
import { SADY_EUR, SADY_EURC } from "@/lib/sadyDarov";
import { nastavCiste, sucetDarov, useZmenyDarov, pridajDar, type VolbaDaru } from "@/lib/darcovia";
import { ZoznamDarcov } from "@/components/zoznamdarcov";
import { NahladKarty, GaleriaZbierky } from "./KartaZbierky";
import { OznamKarta } from "./Oznamy";
import { InzeratKarta, MamZaujem } from "./Inzeraty";
import { DorovnaniePas, NoveDorovnanieSheet } from "./Dorovnanie";
import { beziaceDorovnanie, dorovnanieKDaru, zapisDar as zapisDorovnanie, useZmenyDorovnani } from "@/lib/dorovnanie";
import { verejneOznamy, useZmenyOznamov } from "@/lib/oznamy";
import { nacitajProfil, useZmenyProfilov, CENTRALNA_ID, VLASTNA_ZBIERKA_CFG, type ProfilZbierky } from "./vlastneZbierky";
import { useSegmenty } from "./segmenty";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import type { Kanal } from "@/types";
import { SUBJEKTY, ZASLUZENA } from "./mock";
import type { Dokaz } from "@/lib/zbierky";
import { najdiZbierku, kryptoZbierky, odznakZbierky } from "@/lib/zbierky";
import { DokazBlok, MediaNahlad } from "./DokazBlok";
import { nacitajViditelnost, nacitajTerminal, nacitajKryptoOrg, nacitajCentralnu, nacitajSady, nacitajOnas, nacitajTvarLoga, nacitajZdrojAvatara, nacitajLogo, type Pozicia, type Tier } from "./stav";
import { OnasKratky } from "./OnasKratky";
import { KontaktBlok, nacitajKontakt } from "./kontakt";
import { verejneTaby, cislaSubjektu } from "./obsah";

/*
  ============================================================
  VEREJNÁ PODSTRÁNKA SUBJEKTU — vlastník vidí tú istú stránku ako cudzí.
  Vzor business profilov: hero (cover→avatar→meno→štatistiky→akcie) →
  taby obsahu → o nás → kontakt. Poloha kasičky podľa účelu subjektu:
  charita zbiera → podpora hore · tvorca/firma → terminál/nič dole.
  Sekundárne akcie (zdieľať / QR / nahlásiť) žijú v ⋯ menu.
  ============================================================
*/

/** výrazný štítok ukončenej zbierky — má udrieť do očí */
function UkoncenaPill() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: "#fff", background: "var(--a-green)", borderRadius: RADIUS.pill, padding: `2px ${SPACE.xs + 2}px`, marginBottom: 4 }}>
      ✓ UKONČENÁ · CIEĽ SPLNENÝ
    </span>
  );
}


/** Dôkaz pomoci — fotky pred/po a doklady s sumou. Klik na doklad ukáže jeho náhľad. */
// ukážka klientovi: zbierky 3 vzorových profilov a centrálna zbierka začínajú bez vymyslených darov
nastavCiste([
  ...Object.values(SUBJEKTY).flatMap((x) => x.taby.flatMap((t) => t.polozky.map((p) => p.zbierkaId).filter((id): id is string => !!id))),
  "z-centralna",
]);
/** zbierka so živými číslami: základ + skutočné (simulované) dary */
function ziva<T extends { id: string; vyzbierane: number; darcovia: number }>(z: T): T {
  const d = sucetDarov(z.id);
  return { ...z, vyzbierane: z.vyzbierane + d.suma, darcovia: z.darcovia + d.pocet };
}

export function Podstranka({ pozicia, tier = 0, logo, toast, onBack }: {
  pozicia: Pozicia; tier?: Tier; logo: string | null; toast: (m: string) => void; onBack: () => void;
}) {
  const { wide, desktop } = useLayout();
  const siroke = wide || desktop;   // tablet a PC → mriežka kariet ako vo feede
  const ja = usePouzivatel();
  const s = SUBJEKTY[pozicia];
  const stit = naStitLevel(ZASLUZENA[pozicia].badge);
  // tvorca vystupuje pod profilovou fotkou osoby, charita/B2B pod logom subjektu
  const fotoOsoby = pozicia === "tvorca" && nacitajZdrojAvatara(pozicia) === "foto"; // tvorca: fotka alebo logo značky
  const avatarSrc = (fotoOsoby ? ja.foto : logo) ?? s.foto;
  const [fotky] = useFotkyEntity(klucEntity("rola", pozicia)); // titulná fotka zo správy roly
  const coverSrc = fotky.cover ?? s.cover;
  // „Všetko" — virtuálny tab navrchu (pred Kampane/Skutky/Talent…): zoskupí položky zo všetkých sekcií
  // len to, čo má entita v aktuálnom programe — ten istý výpočet ako prehľad v správe
  const mojeTaby = verejneTaby(pozicia, tier);
  // sektorové zbierky (AKCIA) — vlastná záložka, nie stĺp veľkých kariet nad profilom
  const sektory = useSegmenty();
  useZmenyProfilov();
  useZmenyOznamov();
  const oznamy = tier >= 1 ? verejneOznamy(pozicia) : [];
  const ponuky = tier >= 1 ? verejneOznamy(pozicia, "inzerat") : [];
  // ponuky bývajú v tej istej záložke ako oznamy — sú platené, tak idú nad ne
  // (pripnutý oznam si prvé miesto drží, to si charita zvolila sama)
  const naste = [...oznamy.filter((o) => o.pripnute), ...ponuky, ...oznamy.filter((o) => !o.pripnute)];
  const sektoroveZbierky = pozicia === "charita" && tier >= VLASTNA_ZBIERKA_CFG.sektoroveOdTieru
    ? sektory.flatMap((sg) => {
        const profil = sg.zbierkaId ? nacitajProfil(sg.zbierkaId) : null;
        return profil ? [{ id: sg.zbierkaId!, nazov: sg.nazov, profil }] : [];
      })
    : [];
  const taby = [
    { key: "vsetko", label: "Všetko", polozky: mojeTaby.flatMap((t) => t.polozky) },
    ...(naste.length ? [{ key: "oznamy", label: ponuky.length ? "Oznamy a ponuky" : "Oznamy", polozky: [] as typeof mojeTaby[number]["polozky"] }] : []),
    ...mojeTaby,
    ...(sektoroveZbierky.length ? [{ key: "sektory", label: "Sektory", polozky: [] as typeof mojeTaby[number]["polozky"] }] : []),
  ];
  const [tab, setTab] = useState("vsetko");
  const [sledujem, setSledujem] = useState(false);
  const [onas] = useState(() => nacitajOnas(pozicia) ?? s.onas); // text zo správy (editor), inak pôvodný
  const [rozbalena, setRozbalena] = useState<string | null>(null);
  const [otvorenyOznam, setOtvorenyOznam] = useState<string | null>(null);   // klik na oznam otvorí len ten jeden
  useZmenyDorovnani();                                                        // bežec sa má prekresliť, keď firma dorovná
  const [noveDorovnanie, setNoveDorovnanie] = useState<string | null>(null);  // firma vstupuje do zbierky
  const [profilZiad, setProfilZiad] = useState<string | null>(null);
  const [zbalenaCentralna, setZbalenaCentralna] = useState(false);
  const [qrZbierka, setQrZbierka] = useState<{ id: string; nazov: string } | null>(null);
  // pravidelná podpora = funkcia zbierky (charita od programu ZBIERKA/T1), len pre registrovaných darcov
  const [pravidelna, setPravidelna] = useState<{ id: string | null; nazov: string; sektor?: string } | null>(null);
  const maPravidelnu = pozicia === "charita" && tier >= 1;
  const maCentralnu = pozicia === "charita" && tier >= 1 && nacitajCentralnu("charita");
  /** kam idú peniaze podľa zvoleného rozsahu pravidelnej podpory */
  const cielPravidelnej = (rozsah: string, segment: string | null): string => {
    if (rozsah === "segment" && segment) return sektoroveZbierky.find((z) => z.nazov === segment)?.id ?? CENTRALNA_ID;
    if (rozsah === "charita") return CENTRALNA_ID;
    return pravidelna?.id ?? CENTRALNA_ID;
  };
  const [zvoncek, setZvoncek] = useState(false);
  const [qr, setQr] = useState(false);
  const [menu, setMenu] = useState(false);
  const [nahlasit, setNahlasit] = useState(false);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  useZmenyDarov(); // prekreslí sumy po každom dare
  const registrovany = ja.typ !== "pasivny";
  const logoOrg = nacitajLogo(pozicia) ?? s.foto;
  const profilCentralnej = nacitajProfil(CENTRALNA_ID) ?? { nazov: `${s.nazov} — celá organizácia`, popis: "" };
  const [platbaRef, setPlatbaRef] = useState<{ id: string; komu: string } | null>(null);
  // zápis daru → zoznam darcov + súčty (registrovaný so zvoleným menom, inak anonym)
  const daruj = (refId: string, suma: number, kanal: "psp" | "sepa" | "deed", volba?: VolbaDaru, komu?: string) => {
    pridajDar({ refId, suma, kanal, registrovany, volba });
    // firma dorovná ten istý dar — zapíše sa jej to zo stropu a darca to hneď vidí.
    // Dorovnaná suma ide do zbierky ako samostatný dar (zoznam darcov ju zatiaľ
    // ukáže bez mena firmy — identita firmy v zozname je ďalší krok).
    const dv = beziaceDorovnanie(pozicia, refId);
    const dorovnane = dv ? zapisDorovnanie(pozicia, dv.id, suma) : 0;
    if (dorovnane > 0) {
      pridajDar({ refId, suma: dorovnane, kanal, registrovany: true, volba: { verzia: 4, zobrazSumu: true } });
      toast(`Ďakujeme za ${suma.toFixed(2)} € — firma pridala ${dorovnane.toFixed(2)} €, k príjemcovi ide ${(suma + dorovnane).toFixed(2)} €`);
      return;
    }
    toast(`Ďakujeme za dar ${suma.toLocaleString("sk", { maximumFractionDigits: 2 })} ${kanal === "deed" ? "EURC" : "€"}${komu ? ` · ${komu}` : ""}`);
  };
  const terminalOn = pozicia === "tvorca" && nacitajTerminal();
  const aktTab = taby.find((t) => t.key === tab) ?? taby[0];

  const zdielajProfil = () => void zdielaj({ titul: s.nazov, text: s.nazov, url: aktualnaUrl() }, toast);
  const skopirujOdkaz = async () => {
    try { await navigator.clipboard.writeText(aktualnaUrl()); toast("Odkaz skopírovaný"); } catch { zdielajProfil(); }
  };

  const labels = Object.fromEntries(taby.map((t) => [t.key, t.label])) as Record<string, string>;
  const badges = Object.fromEntries(taby.map((t) => [t.key, t.key === "sektory" ? sektoroveZbierky.length : t.key === "oznamy" ? naste.length : t.polozky.length])) as Record<string, number>;

  // ---- bloky obsahu (zdieľané mobil/desktop) ----
  // centrálna zbierka organizácie (pre seba) — charita ju má od prvého plateného programu T1.
  // ZADARMO = len jedna aktívna zbierka PRE NIEKOHO, nie pre seba.
  // na profile je len spustená centrálna zbierka (spúšťa sa v správe); krypto dary podľa rozhodnutia charity
  const kryptoOrg = pozicia !== "charita" || nacitajKryptoOrg("charita");
  const sady = nacitajSady(pozicia); // rýchle sumy, ktoré si subjekt vybral
  const sumy = { sumyEur: SADY_EUR[sady.eur].sumy, sumyEurc: SADY_EURC[sady.eurc].sumy };
  // ---- vlastné zbierky organizácie (centrálna + sektorové) ----
  // Charita zbiera na svoju overenú činnosť (D+): karta s fotkou a míľnikmi,
  // platobný modul až po kliknutí — rovnako ako pri ostatných zbierkach.
  const obsahVlastnej = (id: string, profil: ProfilZbierky) => {
    const dary = sucetDarov(id);
    const dorovnanie = beziaceDorovnanie(pozicia, id);
    return (
      <>
        {dorovnanie && (
          <div style={{ marginBottom: SPACE.sm }}>
            <DorovnaniePas d={dorovnanie} />
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--a-gold)", textAlign: "center", marginTop: SPACE.xxs }}>
              daruješ 20 € → k príjemcovi ide {20 + dorovnanieKDaru(dorovnanie, 20)} €
            </div>
          </div>
        )}
        <PlatobnyModul zbalene krypto={kryptoOrg ? "EURC" : "nie"} {...sumy}
          onShare={zdielajProfil}
          upvotes={0} onUpvote={() => undefined}
          onPodpor={(d: number) => daruj(id, d * 0.01, "deed", undefined, s.nazov)}
          onDarEur={(sm, v) => daruj(id, sm, "sepa", v, s.nazov)}
          onDarKrypto={(v, vol) => daruj(id, v, "deed", vol, s.nazov)}
          onKanal={(k: string) => { setPlatbaRef({ id, komu: s.nazov }); setPlatba(k as Kanal); }}
          oblubene={{ refId: id, typ: "zbierka", modul: "charity", nazov: profil.nazov, lok: s.lok }} toast={toast}
          opakovana={maPravidelnu ? { popis: "Mesačne · len pre registrovaných · kedykoľvek zrušíš", onClick: () => setPravidelna({ id: id === CENTRALNA_ID ? "z-centralna" : id, nazov: profil.nazov, sektor: sektoroveZbierky.find((z) => z.id === id)?.nazov }) } : undefined}
          dorovnanie={dorovnanie
            ? { label: `Dorovnáva ${dorovnanie.firma}`, popis: "Jedna zbierka, jedno dorovnanie · ďalšia firma sa môže pridať, keď toto skončí", cta: "Obsadené",
                onClick: () => toast(`Túto zbierku už dorovnáva ${dorovnanie.firma} — ďalšia firma sa môže pridať, keď sa jej strop minie alebo sa dorovnanie skončí`) }
            : { onClick: () => setNoveDorovnanie(id) }}
          qr={{ label: "QR tejto zbierky", popis: "Sken → dar za 2 kliky · zdieľanie", onClick: () => (id === CENTRALNA_ID ? setQr(true) : setQrZbierka({ id, nazov: profil.nazov })) }} />
        <GaleriaZbierky profil={profil} />
        <ZoznamDarcov refId={id} celkom={dary.pocet} style={{ marginTop: SPACE.sm }} skrytSumy={pozicia === "charita" && !nacitajViditelnost("charita").sumyDarov} />
      </>
    );
  };
  const kartaVlastnej = (id: string, profil: ProfilZbierky, otvorena: boolean) => {
    const dary = sucetDarov(id);
    return (
      <div {...pressable(() => setRozbalena(otvorena ? null : id), profil.nazov)} style={{ cursor: "pointer" }}>
        <NahladKarty profil={profil} logo={logoOrg} vyzbierane={dary.suma} dolozene={0} ludia={dary.pocet}
          dobrovolne sipka={otvorena ? "otvorena" : "zavreta"} />
      </div>
    );
  };

  // centrálna zbierka — jediná karta nad záložkami, dá sa zbaliť
  const podporaBlok = maCentralnu ? (
    <div id="deed-centralna" style={{ marginBottom: SPACE.gutter }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginBottom: SPACE.xs }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: C.textTer }}>CENTRÁLNA ZBIERKA ORGANIZÁCIE</div>
        <span {...pressable(() => { setZbalenaCentralna(!zbalenaCentralna); if (!zbalenaCentralna && rozbalena === CENTRALNA_ID) setRozbalena(null); }, zbalenaCentralna ? "Rozbaliť" : "Zbaliť")}
          style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: C.textSec, cursor: "pointer" }}>
          {zbalenaCentralna ? "Rozbaliť ▾" : "Zbaliť ▴"}
        </span>
      </div>
      {zbalenaCentralna ? (
        <div {...pressable(() => setZbalenaCentralna(false), profilCentralnej.nazov)}
          style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, cursor: "pointer" }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profilCentralnej.nazov}</div>
          <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: "var(--a-green)" }}>{Math.round(sucetDarov(CENTRALNA_ID).suma).toLocaleString("sk")} €</span>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: rozbalena === CENTRALNA_ID ? SPACE.sm : 0 }}>{kartaVlastnej(CENTRALNA_ID, profilCentralnej, rozbalena === CENTRALNA_ID)}</div>
          {rozbalena === CENTRALNA_ID && obsahVlastnej(CENTRALNA_ID, profilCentralnej)}
        </>
      )}
      {/* ďalšie zbierky tej istej organizácie — darcovi musí byť hneď jasné, že je to zase ona */}
      {sektoroveZbierky.length > 0 && (
        <div style={{ marginTop: SPACE.sm, background: tint("var(--a-green)", .06), border: `1px solid ${tint("var(--a-green)", .28)}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
          <div {...pressable(() => setTab("sektory"), "Ďalšie zbierky organizácie")}
            style={{ display: "flex", alignItems: "center", gap: SPACE.xs, cursor: "pointer", marginBottom: SPACE.xs }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 800, color: C.text }}>Ďalšie zbierky organizácie — podľa činnosti</span>
            <span style={{ flex: "none", fontSize: 12, fontWeight: 800, color: "var(--a-green)" }}>Zobraziť {sektoroveZbierky.length} ›</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xxs }}>
            {sektoroveZbierky.map((z) => (
              <span key={z.id} {...pressable(() => setTab("sektory"), `Sektor ${z.nazov}`)}
                style={{ fontSize: 12, fontWeight: 700, color: "var(--a-green)", background: C.surface, border: `1px solid ${tint("var(--a-green)", .35)}`, borderRadius: RADIUS.pill, padding: `3px ${SPACE.sm}px`, cursor: "pointer" }}>
                {z.nazov}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : null;

  // detail položky (zbierka · skutok s dôkazom · video) — na mobile sa rozbalí
  // v riadku, na tablete/PC sa otvorí v okne nad mriežkou kariet
  type Pol = (typeof taby)[number]["polozky"][number];
  const zavriDetail = () => { setRozbalena(null); setProfilZiad(null); };
  type Zbierka = NonNullable<ReturnType<typeof najdiZbierku>>;
  const detailPolozky = (p: Pol, z: Zbierka | undefined, dokaz: Dokaz | undefined) => (
    <>
            {/* rozbalené video — prehrávač + väzba na zbierku */}
            {!z && p.video && (
              <div style={{ padding: `0 ${SPACE.sm}px ${SPACE.sm}px` }}>
                {p.video.src ? (
                  <div style={{ borderRadius: RADIUS.sm, overflow: "hidden", marginBottom: SPACE.sm }}>
                    <MediaNahlad src={p.video.src} popis={p.titul} ovladanie style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }} />
                  </div>
                ) : (
                <div {...pressable(() => toast(`▶ ${p.titul}`), "Prehrať video")}
                  style={{ position: "relative", borderRadius: RADIUS.sm, overflow: "hidden", cursor: "pointer", marginBottom: SPACE.sm }}>
                  <img src={p.video.nahlad} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.25)" }}>
                    <span style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 4 }}>▶</span>
                  </span>
                  <span style={{ position: "absolute", right: 8, bottom: 8, fontSize: 11.5, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,.65)", borderRadius: RADIUS.xs, padding: "1px 6px" }}>{p.video.dlzka}</span>
                </div>
                )}
                {p.video.zbierkaId && najdiZbierku(p.video.zbierkaId) && (
                  <div style={{ fontSize: 12.5, color: C.textSec, marginBottom: SPACE.xs }}>
                    Video k zbierke: <b style={{ color: C.text }}>{najdiZbierku(p.video.zbierkaId)!.nazov}</b>
                  </div>
                )}
                <div {...pressable(() => zavriDetail(), "Zmenšiť")}
                  style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0 0`, cursor: "pointer" }}>Zmenšiť ▲</div>
              </div>
            )}

            {/* rozbalený skutok — dôkaz, že sme pomohli */}
            {!z && dokaz && (
              <div style={{ padding: `0 ${SPACE.sm}px ${SPACE.sm}px` }}>
                <DokazBlok dokaz={dokaz} vyzbierane={p.dokazZbierky ? najdiZbierku(p.dokazZbierky)?.vyzbierane : undefined} />
                <div {...pressable(() => zavriDetail(), "Zmenšiť")}
                  style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0 0`, cursor: "pointer" }}>Zmenšiť ▲</div>
              </div>
            )}

            {/* rozbalená zbierka — celá tu, profil ostáva pod ňou; druhý klik zbalí */}
            {z && (
              <div style={{ padding: `0 ${SPACE.sm}px ${SPACE.sm}px` }}>
                {/* fotka menšia (21:9) — hlavná je správa, nie obrázok */}
                <div style={{ borderRadius: RADIUS.sm, overflow: "hidden", marginBottom: SPACE.sm }}>
                  <img src={z.foto} alt="" style={{ width: "100%", aspectRatio: "21/9", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.5, marginBottom: SPACE.sm }}>{z.popis}</div>

                {/* žiadateľ — kto zbiera. Klik otvorí jeho profil NAD platbou: nič nezakryje, len odsunie nižšie */}
                <div {...pressable(() => setProfilZiad(profilZiad === z.id ? null : z.id), `Profil — ${z.ziadatel.meno}`)}
                  style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface2, border: `1px solid ${profilZiad === z.id ? tint("var(--a-info)", .4) : C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm, cursor: "pointer" }}>
                  <img src={z.ziadatel.foto} alt="" style={{ width: 40, height: 40, borderRadius: z.ziadatel.typ === "org" ? RADIUS.xs : "50%", objectFit: "cover", flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", color: C.textTer }}>ŽIADATEĽ</div>
                    <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z.ziadatel.meno}</span>
                      {z.ziadatel.overeny && <span style={{ color: "var(--a-info)", fontSize: 13 }}>✓</span>}
                    </div>
                  </div>
                  <Stit level={naStitLevel(z.ziadatel.level)} size={30} />
                  <span style={{ flex: "none", fontSize: 12, fontWeight: 700, color: "var(--a-info)" }}>{profilZiad === z.id ? "Zavrieť" : "Profil"}</span>
                </div>

                {profilZiad === z.id && (
                  <div style={{ background: C.surface2, border: `1px solid ${tint("var(--a-info)", .3)}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.sm }}>
                    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.sm }}>
                      <img src={z.ziadatel.foto} alt="" style={{ width: 56, height: 56, borderRadius: z.ziadatel.typ === "org" ? RADIUS.sm : "50%", objectFit: "cover", flex: "none" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{z.ziadatel.meno} {z.ziadatel.overeny && <span style={{ color: "var(--a-info)", fontSize: 14 }}>✓</span>}</div>
                        <div style={{ fontSize: 12, color: C.textTer, marginTop: 2 }}>{z.ziadatel.lok} · {z.ziadatel.typ === "org" ? "organizácia" : "overená osoba"}</div>
                      </div>
                      <Stit level={naStitLevel(z.ziadatel.level)} size={52} detail subjekt={z.ziadatel.meno} />
                    </div>
                    <div style={{ fontSize: 13.5, color: C.textSec, lineHeight: 1.5, marginBottom: SPACE.sm }}>{z.ziadatel.onas}</div>
                    <div style={{ marginBottom: SPACE.sm }}><StatRad kompakt stats={[
                      { hodnota: z.ziadatel.vyzbierane, label: "Vyzbierané" },
                      { hodnota: z.ziadatel.skutky, label: "Skutky" },
                      { hodnota: z.ziadatel.snami, label: "S nami" },
                    ]} /></div>
                    <div {...pressable(() => setProfilZiad(null), "Zavrieť profil")}
                      style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: C.textSec, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px 0`, cursor: "pointer" }}>Zavrieť profil ▲</div>
                  </div>
                )}
                {/* split tvorcu — vizuálne, nič sa nečíta: kto si koľko necháva, koľko ide ďalej */}
                {p.split != null && (
                  <div style={{ marginBottom: SPACE.sm }}>
                    <SekciaLabel>{s.nazov.toUpperCase()} — ZVYŠOK</SekciaLabel>
                    <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, background: tint("var(--a-green)", .06), border: `1px solid ${tint("var(--a-green)", .3)}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm }}>
                      <span style={{ fontSize: 15 }}>🎬</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nazov}</span>
                      <span style={{ flex: "none", fontSize: 20, fontWeight: 800, color: "var(--a-green)" }}>{100 - p.split} %</span>
                    </div>
                    <SekciaLabel>IDE ĎALEJ — KOMU KOĽKO</SekciaLabel>
                    <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginBottom: SPACE.xs }}>
                        <span style={{ fontSize: 14 }}>📌</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z.komu}</span>
                        <span style={{ flex: "none", fontSize: 9.5, fontWeight: 800, letterSpacing: ".04em", color: "var(--a-green)", background: tint("var(--a-green)", .14), borderRadius: RADIUS.pill, padding: `2px ${SPACE.xs}px` }}>TÁTO ZBIERKA</span>
                        <span style={{ flex: "none", fontSize: 18, fontWeight: 800, color: "var(--a-green)" }}>{p.split} %</span>
                      </div>
                      <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(var(--glass-rgb),.12)" }}>
                        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${p.split}%`, borderRadius: 4, background: "var(--a-green)" }} />
                        <span style={{ position: "absolute", top: "50%", left: `${p.split}%`, width: 14, height: 14, borderRadius: "50%", background: "var(--a-green)", border: "2px solid var(--c-bg)", transform: "translate(-50%, -50%)" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: SPACE.sm }}><ProgresBox suma={z.vyzbierane} ciel={z.ciel} ludia={z.darcovia} live={z.stav === "aktivna"} /></div>
                {z.stav === "aktivna" ? (
                  <PlatobnyModul zbalene krypto={kryptoOrg ? kryptoZbierky(z) : "nie"} {...sumy}
                    onShare={zdielajProfil}
                    upvotes={0} onUpvote={() => undefined}
                    onPodpor={(d: number) => daruj(z.id, d * 0.01, "deed", undefined, z.komu)}
                    onDarEur={(sm, v) => daruj(z.id, sm, "sepa", v, z.komu)}
                    onDarKrypto={(v, vol) => daruj(z.id, v, "deed", vol, z.komu)}
                    onKanal={(k: string) => { setPlatbaRef({ id: z.id, komu: z.komu }); setPlatba(k as Kanal); }}
                    oblubene={{ refId: z.id, typ: "zbierka", modul: "charity", nazov: z.nazov, lok: z.lok }} toast={toast}
                    opakovana={maPravidelnu ? { popis: "Mesačne · len pre registrovaných · kedykoľvek zrušíš", onClick: () => setPravidelna({ id: z.id, nazov: z.nazov }) } : undefined}
                    qr={{ label: "QR tejto zbierky", popis: "Skenovať · kopírovať · zdieľať", onClick: () => setQrZbierka({ id: z.id, nazov: z.nazov }) }} />
                ) : null}
                {z.stav === "aktivna" && <ZoznamDarcov refId={z.id} celkom={z.darcovia} style={{ marginTop: SPACE.sm }} skrytSumy={pozicia === "charita" && !nacitajViditelnost("charita").sumyDarov} />}
                {z.stav === "aktivna" ? null : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: "var(--a-green)", color: "#fff", borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, marginBottom: SPACE.sm }}>
                      <span style={{ fontSize: 24, lineHeight: 1 }}>✓</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: ".03em" }}>ZBIERKA UKONČENÁ — CIEĽ SPLNENÝ</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, opacity: .92 }}>{z.vyzbierane.toLocaleString("sk")} € od {z.darcovia} darcov{z.dokaz ? " · doložené dokladmi nižšie" : ""}</div>
                      </div>
                    </div>
                    {z.dokaz && <DokazBlok dokaz={z.dokaz} vyzbierane={z.vyzbierane} />}
                  </>
                )}
                <div {...pressable(() => { zavriDetail(); }, "Zmenšiť")}
                  style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0 0`, cursor: "pointer" }}>Zmenšiť ▲</div>
              </div>
            )}
    </>
  );

  // položka profilu s dopočítanými dátami — rovnaké pre riadok aj kartu
  const zbaluj = (p: Pol, kluc: string) => {
    const z0 = p.zbierkaId ? najdiZbierku(p.zbierkaId) : undefined;
    const z = z0 ? ziva(z0) : undefined;
    const dokaz = p.dokaz ?? (p.dokazZbierky ? najdiZbierku(p.dokazZbierky)?.dokaz : undefined);
    return { p, kluc, z, dokaz, titul: z?.nazov || p.titul, popis: z ? [p.popis, z.komu].filter(Boolean).join(" · ") : p.popis, klik: !!(z || dokaz || p.video) };
  };
  type Zbalena = ReturnType<typeof zbaluj>;
  const otvor = (x: Zbalena) => (x.klik ? setRozbalena(rozbalena === x.kluc ? null : x.kluc) : toast(`${x.titul} — detail`));

  // miniatúra položky (zbierka · video · emoji) — v riadku 44 px, v karte 16:9
  const Miniatura = ({ x, velka }: { x: Zbalena; velka?: boolean }) => {
    const { z, p } = x;
    const obal: CSSProperties = velka
      ? { width: "100%", aspectRatio: "16 / 9", display: "block", position: "relative", background: "rgba(var(--glass-rgb),.06)", overflow: "hidden" }
      : { width: 44, height: 44, borderRadius: RADIUS.xs, flex: "none", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: "rgba(var(--glass-rgb),.06)" };
    const media: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
    return (
      <span style={obal}>
        {z ? <img src={z.foto} alt="" style={media} />
          : p.video ? (
            <span style={{ position: "relative", width: "100%", height: "100%", display: "block" }}>
              {p.video.src ? <MediaNahlad src={p.video.src} popis={p.titul} style={media} />
                : <img src={p.video.nahlad} alt="" style={media} />}
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.28)", color: "#fff", fontSize: velka ? 30 : 16 }}>▶</span>
            </span>
          ) : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: velka ? 40 : 19 }}>{p.emoji}</span>}
      </span>
    );
  };

  // podtitulok podľa druhu položky (stav zbierky · video · dôkazy)
  const StavPolozky = ({ x }: { x: Zbalena }) => {
    const { z, p, dokaz } = x;
    if (z) return (
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: 5 }}>
        <span style={{ flex: 1, height: 4, borderRadius: 3, background: "rgba(var(--glass-rgb),.12)", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round(z.vyzbierane / z.ciel * 100))}%`, background: z.stav === "ukoncena" ? "var(--a-info)" : "var(--a-green)" }} />
        </span>
        <span style={{ flex: "none", fontSize: 10.5, fontWeight: 700, color: C.textTer }}>{z.vyzbierane.toLocaleString("sk")} / {z.ciel.toLocaleString("sk")} €</span>
      </div>
    );
    if (p.video) return <div style={{ fontSize: 11, fontWeight: 700, color: C.textSec, marginTop: 3 }}>▶ video · {p.video.dlzka}</div>;
    if (dokaz) return <div style={{ fontSize: 11, fontWeight: 700, color: "var(--a-green)", marginTop: 3 }}>📷 {dokaz.fotky.length} fotky · 📄 {dokaz.doklady.length} doklady</div>;
    return null;
  };

  // MOBIL — riadok s rozbalením pod ním
  const riadokPolozky = (x: Zbalena) => {
    const otvorena = rozbalena === x.kluc;
    return (
      <div key={x.kluc} style={{ background: C.surface, border: `1px solid ${otvorena ? tint("var(--a-info)", .38) : C.line}`, borderRadius: RADIUS.sm, marginBottom: SPACE.xs, overflow: "hidden" }}>
        <div {...pressable(() => otvor(x), x.titul)} style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: SPACE.sm, cursor: "pointer" }}>
          <Miniatura x={x} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {x.z?.stav === "ukoncena" && <UkoncenaPill />}
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{x.titul}</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{x.popis}</div>
            <StavPolozky x={x} />
          </div>
          {x.p.split != null && (
            <span style={{ flex: "none", fontSize: 11, fontWeight: 800, color: "var(--a-gold)", background: tint("var(--a-gold)", .14), borderRadius: RADIUS.xs, padding: `2px ${SPACE.xs}px` }}>{x.p.split} %</span>
          )}
          <span style={{ color: C.textTer, fontSize: 15, flex: "none", transform: otvorena ? "rotate(90deg)" : "none", transition: "transform .18s ease" }}>›</span>
        </div>
        {otvorena && detailPolozky(x.p, x.z, x.dokaz)}
      </div>
    );
  };

  // TABLET / PC — karta do mriežky (fotka hore, ako vo feede)
  const kartaPolozky = (x: Zbalena) => (
    <div key={x.kluc} {...pressable(() => otvor(x), x.titul)}
      style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative" }}>
        <Miniatura x={x} velka />
        {x.p.split != null && (
          <span style={{ position: "absolute", right: SPACE.xs, top: SPACE.xs, fontSize: 11, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,.6)", borderRadius: RADIUS.pill, padding: `2px ${SPACE.xs}px` }}>{x.p.split} %</span>
        )}
      </div>
      <div style={{ padding: SPACE.sm, display: "flex", flexDirection: "column", flex: 1 }}>
        {x.z?.stav === "ukoncena" && <UkoncenaPill />}
        <div style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.3 }}>{x.titul}</div>
        {x.popis && <div style={{ fontSize: 12.5, color: C.textSec, lineHeight: 1.45, marginTop: 3 }}>{x.popis}</div>}
        <div style={{ marginTop: "auto" }}><StavPolozky x={x} /></div>
      </div>
    </div>
  );

  // najnovší oznam nad záložkami — inak ho v rade ôsmich tabov nikto nenájde
  const naOznam = (id: string) => {
    setOtvorenyOznam(id);
    setTab("oznamy");
    setTimeout(() => document.getElementById("deed-obsah")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const oznamPas = naste.length > 0 && (
    <div style={{ marginBottom: SPACE.sm }}>
      {naste.map((o) => {
        const ponuka = o.kategoria === "inzerat";
        const akcent = ponuka ? "var(--a-gold)" : "var(--a-info)";
        return (
        <div key={o.id} {...pressable(() => naOznam(o.id), `${ponuka ? "Pracovná ponuka" : "Oznam"}: ${o.nadpis}`)}
          style={{ display: "flex", alignItems: "center", gap: SPACE.xs, cursor: "pointer", marginBottom: SPACE.xxs,
            background: tint(akcent, ponuka ? .12 : .07), border: `1px solid ${tint(akcent, ponuka ? .45 : .28)}`, borderRadius: RADIUS.sm, padding: SPACE.sm }}>
          <span style={{ flex: "none", fontSize: 15 }}>{ponuka ? "💼" : o.pripnute ? "📌" : "📣"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", color: ponuka ? akcent : C.textTer }}>{ponuka ? "PRACOVNÁ PONUKA" : "OZNAM"}</div>
            <div style={{ fontSize: ponuka ? 14.5 : 13.5, fontWeight: ponuka ? 800 : 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.nadpis}</div>
          </div>
          <span style={{ flex: "none", fontSize: 12, fontWeight: 800, color: akcent }}>{ponuka ? "Mám záujem ›" : "Čítať ›"}</span>
        </div>
        );
      })}
    </div>
  );

  const otvoreny = otvorenyOznam ? naste.find((o) => o.id === otvorenyOznam) ?? null : null;
  const btnProfil: CSSProperties = { minWidth: 160, height: 44, padding: `0 ${SPACE.md}px`, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, background: "transparent", color: C.textSec, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13.5 };

  const obsahBlok = (
    <div id="deed-obsah">
      {oznamPas}
      <TabyProfil options={taby.map((t) => t.key)} labels={labels} badges={badges} value={tab}
        onChange={(t) => { setTab(t); setOtvorenyOznam(null); }} ariaLabel="Obsah profilu" />
      {tab === "oznamy" ? (<>
        {/* čítam ten oznam, ktorý som otvoril — nie všetky naraz; každý má vlastný riadok */}
        <div>
          {(otvoreny ? [otvoreny] : naste).map((o) => (
            <div key={o.id} style={{ marginBottom: SPACE.sm }}>
              {o.kategoria === "inzerat"
                ? <InzeratKarta o={o} autor={s.nazov} logo={logoOrg} deti={<MamZaujem entita={pozicia} inzerat={o} toast={toast} />} />
                : <OznamKarta o={o} autor={s.nazov} logo={logoOrg} />}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: SPACE.sm, justifyContent: "center", marginTop: SPACE.md, flexWrap: "wrap" }}>
          {otvoreny && naste.length > 1 && (
            <button type="button" onClick={() => setOtvorenyOznam(null)} style={btnProfil}>Zobraziť všetko ({naste.length})</button>
          )}
          {/* z oznamov musí viesť cesta von — inak sa človek vie vrátiť len cez „Všetko" */}
          <button type="button" onClick={onBack} style={btnProfil}>Zavrieť</button>
        </div>
      </>) : tab === "sektory" ? (
        <div style={siroke ? { display: "grid", gridTemplateColumns: `repeat(${desktop ? 3 : 2}, minmax(0,1fr))`, gap: SPACE.sm, alignItems: "start" } : undefined}>
          {sektoroveZbierky.map((z) => (
            <div key={z.id} id={`deed-sektor-${z.id}`} style={{ marginBottom: siroke ? 0 : SPACE.sm }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: C.textTer, marginBottom: 4 }}>{z.nazov.toUpperCase()}</div>
              {kartaVlastnej(z.id, z.profil, rozbalena === z.id)}
              {/* na širokej ploche sa detail otvorí v okne — mriežka sa nerozhádže */}
              {rozbalena === z.id && !siroke && <div style={{ marginTop: SPACE.sm }}>{obsahVlastnej(z.id, z.profil)}</div>}
            </div>
          ))}
        </div>
      ) : aktTab.polozky.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg }}>Zatiaľ žiadny obsah.</div>
      ) : (tab === "vsetko" ? mojeTaby : [aktTab]).map((g) => {
        const polozky = g.polozky.map((p, i) => zbaluj(p, p.zbierkaId ?? `${g.key}-${i}`));
        return (
          <Fragment key={g.key}>
            {/* vo Všetko odsek podľa druhu: Zbierky → Skutky → Akcie */}
            {tab === "vsetko" && polozky.length > 0 && (
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: `${SPACE.gutter}px 0 ${SPACE.xs}px` }}>{g.label}</div>
            )}
            {siroke
              ? <div style={{ display: "grid", gridTemplateColumns: `repeat(${desktop ? 3 : 2}, minmax(0,1fr))`, gap: SPACE.sm, alignItems: "stretch" }}>
                  {polozky.map(kartaPolozky)}
                </div>
              : polozky.map(riadokPolozky)}
          </Fragment>
        );
      })}
    </div>
  );

  // na tablete/PC sa detail otvorí v okne nad mriežkou — karty sa nerozhadzujú
  const vybrana = siroke && rozbalena
    ? (tab === "vsetko" ? mojeTaby : [aktTab]).flatMap((g) => g.polozky.map((p, i) => zbaluj(p, p.zbierkaId ?? `${g.key}-${i}`))).find((x) => x.kluc === rozbalena)
    : undefined;
  const vlastnaVybrana = siroke && rozbalena ? sektoroveZbierky.find((z) => z.id === rozbalena) : undefined;
  const oknoDetailu = vlastnaVybrana ? (
    <Sheet onClose={zavriDetail} label={vlastnaVybrana.profil.nazov}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", color: C.textTer }}>{vlastnaVybrana.nazov.toUpperCase()}</div>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: SPACE.xs }}>{vlastnaVybrana.profil.nazov}</div>
      {obsahVlastnej(vlastnaVybrana.id, vlastnaVybrana.profil)}
    </Sheet>
  ) : vybrana && (
    <Sheet onClose={zavriDetail} label={vybrana.titul}>
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: SPACE.xs }}>{vybrana.titul}</div>
      {detailPolozky(vybrana.p, vybrana.z, vybrana.dokaz)}
    </Sheet>
  );

  // O nás priamo pod hlavičkou — 2–3 riadky, zvyšok na „viac“
  const oNasKratky = <OnasKratky text={onas} />;

  const oNasBlok = <KontaktBlok k={nacitajKontakt(pozicia)} vodorovne={siroke} />;

  const terminalBlok = pozicia === "tvorca" && terminalOn && (
    <div {...pressable(() => toast("Priamy príspevok tvorcovi"), "Podporiť tvorcu")}
      style={{ border: `1px solid ${tint("var(--a-green)", .34)}`, background: tint("var(--a-green)", .1), borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 700, color: "var(--a-green)", cursor: "pointer", marginBottom: SPACE.gutter }}>
      Podporiť tvorcu
    </div>
  );

  const telo = (
    <div style={{ padding: `0 ${SPACE.md}px` }}>
      <EntityHero avatarTvar={fotoOsoby ? "kruh" : nacitajTvarLoga(pozicia)}
        avatar={avatarSrc ? <img src={avatarSrc} alt={s.nazov} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (pozicia === "tvorca" ? s.emoji : s.iniciacky)}
        cover={coverSrc}
        coverEl={<span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, opacity: .45 }}>{s.emoji}</span>}
        meno={s.nazov} overene={s.overena} overeneLabel="Overený subjekt — identita potvrdená"
        podtitul={<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IkonaPin size={11} color={C.textTer} /> {s.lok}</span>}
        vpravo={
          <div style={{ textAlign: "center" }} title="Štít sa zaslúži skutkami — nedá sa kúpiť">
            <Stit level={stit} size={desktop ? 88 : 64} detail subjekt={s.nazov} />
          </div>
        }
        podMenom={oNasKratky}
        stats={cislaSubjektu(pozicia, tier).map(([hodnota, label]) => ({ hodnota, label }))}
        akcie={<>
          <BtnAkcia variant={sledujem ? "secondary" : "primary"} ariaPressed={sledujem}
            onClick={() => { setSledujem((v) => !v); toast(sledujem ? `Prestal si sledovať ${s.nazov}` : `Sleduješ ${s.nazov}`); }}>
            <Srdce size={14} filled={sledujem} color={sledujem ? "var(--a-green)" : "#fff"} /> {sledujem ? "Sledované" : "Sledovať"}
          </BtnAkcia>
          <BtnAkcia variant="secondary" onClick={zdielajProfil}><Zdielanie size={14} /> Zdieľať</BtnAkcia>
          <BtnIkonka label="QR kód profilu" text="QR" onClick={() => setQr(true)}><IkonaQr size={18} /></BtnIkonka>
          <BtnIkonka label={zvoncek ? "Vypnúť upozornenia" : "Zapnúť upozornenia"} aktivne={zvoncek} farba="var(--a-gold)"
            onClick={() => { setZvoncek((v) => !v); toast(zvoncek ? "Upozornenia vypnuté" : "Upozornenia zapnuté"); }}>
            <Zvon size={16} />
          </BtnIkonka>
          <BtnIkonka label="Ďalšie možnosti" onClick={() => setMenu(true)}><IkonaMoznosti size={16} /></BtnIkonka>
        </>}
      />
      <div style={{ height: SPACE.gutter }} />
      {/* kontakt je dole aj na PC — hore patrí to, čo charita robí, nie telefónne číslo */}
      <>{podporaBlok}{obsahBlok}{terminalBlok}{oNasBlok}</>
    </div>
  );

  return (
    <div style={{ paddingBottom: SPACE.lg, color: C.text }}>
      <BackHeader onBack={onBack}>
        <span style={{ fontSize: 12, color: C.textSec }}>{s.nazov}</span>
      </BackHeader>
      <div style={{ height: SPACE.sm }} />
      {obalSiroky(telo, { desktop, maxDesktop: SIRKA.plocha })}

      {menu && (
        <KontextMenu onClose={() => setMenu(false)} polozky={[
          { ikona: <Zdielanie size={17} />, label: "Zdieľať profil", onClick: zdielajProfil },
          { ikona: <IkonaOdkaz size={17} />, label: "Kopírovať odkaz", onClick: () => void skopirujOdkaz() },
          { ikona: <IkonaQr size={17} />, label: "QR kód a embed", popis: "Na tlač alebo vlastný web", onClick: () => setQr(true) },
          { ikona: <IkonaVlajka size={16} />, label: "Nahlásiť profil", danger: true, onClick: () => setNahlasit(true) },
        ]} />
      )}
      {oknoDetailu}
      {nahlasit && <NahlasitSheet co={`Profil · ${s.nazov}`} refId={`rola-${pozicia}`} modul="rola" onClose={() => setNahlasit(false)} toast={toast} />}
      {platba && <PlatbaModal kanal={platba} komu={platbaRef?.komu ?? s.nazov} onClose={() => { setPlatba(null); setPlatbaRef(null); }}
        onDone={(d: number, v?: VolbaDaru) => daruj(platbaRef?.id ?? "z-centralna", platba === "DEED" ? d * 0.01 : d, platba === "EUR" ? "psp" : "deed", v, platbaRef?.komu ?? s.nazov)} />}
      {pravidelna && <RecurringSheet nazov={pravidelna.nazov}
        // centrálna zbierka = celá organizácia → nedá sa doložiť per dar, preto bez voľby „Táto zbierka"
        caseId={pravidelna.id === "z-centralna" ? null : pravidelna.id}
        // pravidelná podpora je od T1 celá: zbierka → táto zbierka / segment / celá charita,
        // centrálna zbierka → segment / celá organizácia
        // rozsah je daný tým, odkiaľ darca klikol: centrálna → celá organizácia,
        // sektorová → ten sektor, bežná zbierka → táto zbierka + centrálna
        sektor={pravidelna.sektor}
        // sektor ako voľba má zmysel LEN keď má vlastnú zbierku a účet (AKCIA) —
        // inak by dary padli na hlavný účet a nedalo by sa k nim nič doložiť
        segmenty={pravidelna.sektor || !sektoroveZbierky.length ? null : sektoroveZbierky.map((z) => z.nazov)}
        // „celá organizácia" = centrálna zbierka → ponúkame ju, len keď charita spustenú má
        bezCelej={!!pravidelna.sektor || !maCentralnu}
        // prvá platba záväzku sa objaví v zozname darcov cieľovej zbierky
        onDar={(su, _me, vo, rozsah, segment) => daruj(cielPravidelnej(rozsah, segment), su, "sepa", vo, s.nazov)}
        // po poďakovaní vedieme darcu tam, kam peniaze idú — centrálna alebo zbierka sektora
        onCiel={(rozsah, segment) => {
          const ciel = cielPravidelnej(rozsah, segment);
          if (rozsah === "request") return undefined;   // darca už na tej zbierke je
          const sekt = sektoroveZbierky.find((z) => z.id === ciel);
          if (rozsah === "charita" && !maCentralnu) return undefined;
          return {
            label: sekt ? "Zobraziť zbierku sektora" : "Zobraziť centrálnu zbierku",
            onClick: () => {
              // na tablete/PC sa detail otvorí v okne — scrollovať pod ním by okno odsunulo mimo obrazovku
              const skoc = (id: string) => { if (!siroke) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 140); };
              if (sekt) { setTab("sektory"); setRozbalena(sekt.id); skoc("deed-sektor-" + sekt.id); return; }
              setZbalenaCentralna(false); setRozbalena(CENTRALNA_ID); setTab("vsetko"); skoc("deed-centralna");
            },
          };
        }}
        onClose={() => setPravidelna(null)} toast={toast} />}
      {noveDorovnanie && (
        <NoveDorovnanieSheet entita={pozicia} cielId={noveDorovnanie} toast={toast} onClose={() => setNoveDorovnanie(null)} />
      )}
      {qrZbierka && <QrModal odznak={odznakZbierky(qrZbierka.id)} typ="skutok" titul={`QR — ${qrZbierka.nazov}`} popis="Sken otvorí túto zbierku — daj ho na web, do správy alebo na plagát"
        odkaz={qrUrl("case", qrZbierka.id)} onClose={() => setQrZbierka(null)} toast={toast} />}
      {qr && <QrModal typ="skutok" titul={`QR — ${s.nazov}`} popis="Profil subjektu — QR aj embed odznak na vlastný web"
        odkaz={qrUrl("handle", s.nazov.toLowerCase().replace(/[^a-z0-9]+/g, "-"))} onClose={() => setQr(false)} toast={toast} />}
    </div>
  );
}

function SekciaLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, marginBottom: SPACE.xs }}>{children}</div>;
}
