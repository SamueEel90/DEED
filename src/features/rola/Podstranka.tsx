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
import { NahladKarty } from "./KartaZbierky";
import { nacitajProfil, useZmenyProfilov, CENTRALNA_ID } from "./vlastneZbierky";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import type { Kanal } from "@/types";
import { SUBJEKTY, ZASLUZENA } from "./mock";
import { segmentyCharity } from "./registracia";
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
  const taby = [{ key: "vsetko", label: "Všetko", polozky: mojeTaby.flatMap((t) => t.polozky) }, ...mojeTaby];
  const [tab, setTab] = useState("vsetko");
  const [sledujem, setSledujem] = useState(false);
  const [onas] = useState(() => nacitajOnas(pozicia) ?? s.onas); // text zo správy (editor), inak pôvodný
  const [rozbalena, setRozbalena] = useState<string | null>(null);
  const [profilZiad, setProfilZiad] = useState<string | null>(null);
  const [qrZbierka, setQrZbierka] = useState<{ id: string; nazov: string } | null>(null);
  // pravidelná podpora = funkcia zbierky (charita od programu ZBIERKA/T1), len pre registrovaných darcov
  const [pravidelna, setPravidelna] = useState<{ id: string | null; nazov: string } | null>(null);
  const maPravidelnu = pozicia === "charita" && tier >= 1;
  const [zvoncek, setZvoncek] = useState(false);
  const [qr, setQr] = useState(false);
  const [menu, setMenu] = useState(false);
  const [nahlasit, setNahlasit] = useState(false);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  useZmenyDarov(); // prekreslí sumy po každom dare
  const registrovany = ja.typ !== "pasivny";
  const centr = sucetDarov(CENTRALNA_ID);
  useZmenyProfilov();
  const logoOrg = nacitajLogo(pozicia) ?? s.foto;
  const profilCentralnej = nacitajProfil(CENTRALNA_ID) ?? { nazov: `${s.nazov} — celá organizácia`, popis: "" };
  const [platbaRef, setPlatbaRef] = useState<{ id: string; komu: string } | null>(null);
  // zápis daru → zoznam darcov + súčty (registrovaný so zvoleným menom, inak anonym)
  const daruj = (refId: string, suma: number, kanal: "psp" | "sepa" | "deed", volba?: VolbaDaru, komu?: string) => {
    pridajDar({ refId, suma, kanal, registrovany, volba });
    toast(`Ďakujeme za dar ${suma.toLocaleString("sk", { maximumFractionDigits: 2 })} ${kanal === "deed" ? "EURC" : "€"}${komu ? ` · ${komu}` : ""}`);
  };
  const terminalOn = pozicia === "tvorca" && nacitajTerminal();
  const aktTab = taby.find((t) => t.key === tab) ?? taby[0];

  const zdielajProfil = () => void zdielaj({ titul: s.nazov, text: s.nazov, url: aktualnaUrl() }, toast);
  const skopirujOdkaz = async () => {
    try { await navigator.clipboard.writeText(aktualnaUrl()); toast("Odkaz skopírovaný"); } catch { zdielajProfil(); }
  };

  const labels = Object.fromEntries(taby.map((t) => [t.key, t.label])) as Record<string, string>;
  const badges = Object.fromEntries(taby.map((t) => [t.key, t.polozky.length])) as Record<string, number>;

  // ---- bloky obsahu (zdieľané mobil/desktop) ----
  // centrálna zbierka organizácie (pre seba) — charita ju má od prvého plateného programu T1.
  // ZADARMO = len jedna aktívna zbierka PRE NIEKOHO, nie pre seba.
  // na profile je len spustená centrálna zbierka (spúšťa sa v správe); krypto dary podľa rozhodnutia charity
  const kryptoOrg = pozicia !== "charita" || nacitajKryptoOrg("charita");
  const sady = nacitajSady(pozicia); // rýchle sumy, ktoré si subjekt vybral
  const sumy = { sumyEur: SADY_EUR[sady.eur].sumy, sumyEurc: SADY_EURC[sady.eurc].sumy };
  const podporaBlok = pozicia === "charita" && tier >= 1 && nacitajCentralnu("charita") && (
    <div style={{ marginBottom: SPACE.gutter }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, marginBottom: SPACE.xs }}>CENTRÁLNA ZBIERKA ORGANIZÁCIE</div>
      {/* karta sa správa ako každá iná zbierka — platobný modul až po kliknutí */}
      <div {...pressable(() => setRozbalena(rozbalena === CENTRALNA_ID ? null : CENTRALNA_ID), profilCentralnej.nazov)}
        style={{ cursor: "pointer", marginBottom: rozbalena === CENTRALNA_ID ? SPACE.sm : 0 }}>
        <NahladKarty profil={profilCentralnej} logo={logoOrg} vyzbierane={centr.suma} dolozene={0} ludia={centr.pocet}
          sipka={rozbalena === CENTRALNA_ID ? "otvorena" : "zavreta"} />
      </div>
      {rozbalena === CENTRALNA_ID && (<>
      <PlatobnyModul zbalene krypto={kryptoOrg ? "EURC" : "nie"} {...sumy}
        onShare={zdielajProfil}
        upvotes={0} onUpvote={() => undefined}
        onPodpor={(d: number) => daruj("z-centralna", d * 0.01, "deed", undefined, s.nazov)}
        onDarEur={(sm, v) => daruj("z-centralna", sm, "sepa", v, s.nazov)}
        onDarKrypto={(v, vol) => daruj("z-centralna", v, "deed", vol, s.nazov)}
        onKanal={(k: string) => { setPlatbaRef({ id: "z-centralna", komu: s.nazov }); setPlatba(k as Kanal); }}
        oblubene={{ refId: `rola-${s.nazov}`, typ: pozicia, modul: "charity", nazov: s.nazov, lok: s.lok }} toast={toast}
        opakovana={maPravidelnu ? { popis: "Mesačne · len pre registrovaných · kedykoľvek zrušíš", onClick: () => setPravidelna({ id: "z-centralna", nazov: "Centrálna zbierka organizácie" }) } : undefined}
        qr={{ label: "QR tejto zbierky", popis: "Sken → dar za 2 kliky · zdieľanie", onClick: () => setQr(true) }} />
      <ZoznamDarcov refId="z-centralna" celkom={centr.pocet} style={{ marginTop: SPACE.sm }} skrytSumy={pozicia === "charita" && !nacitajViditelnost("charita").sumyDarov} />
      </>)}
    </div>
  );

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

  const obsahBlok = (
    <>
      <TabyProfil options={taby.map((t) => t.key)} labels={labels} badges={badges} value={tab} onChange={setTab} ariaLabel="Obsah profilu" />
      {aktTab.polozky.length === 0 ? (
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
    </>
  );

  // na tablete/PC sa detail otvorí v okne nad mriežkou — karty sa nerozhadzujú
  const vybrana = siroke && rozbalena
    ? (tab === "vsetko" ? mojeTaby : [aktTab]).flatMap((g) => g.polozky.map((p, i) => zbaluj(p, p.zbierkaId ?? `${g.key}-${i}`))).find((x) => x.kluc === rozbalena)
    : undefined;
  const oknoDetailu = vybrana && (
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
          <BtnIkonka label="QR kód profilu" onClick={() => setQr(true)}><IkonaQr size={16} /></BtnIkonka>
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
        segmenty={segmentyCharity()} onClose={() => setPravidelna(null)} toast={toast} />}
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
