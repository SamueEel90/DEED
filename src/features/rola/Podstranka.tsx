import { Fragment, useState } from "react";
import { C, SPACE, RADIUS, SIRKA } from "@/theme";
import {
  BackHeader, PlatobnyModul, PlatbaModal, ProgresBox, QrModal, Stit, naStitLevel, tint,
  Zdielanie, Zvon, Srdce, useLayout, obalSiroky,
  EntityHero, BtnAkcia, BtnIkonka, KontextMenu, TabyProfil, MenuSkupina, KontaktPolozka, DvaStlpce, StatRad,
  IkonaMoznosti, IkonaQr, IkonaVlajka, IkonaPin, IkonaObalka, IkonaOdkaz,
} from "@/shared";
import { pressable } from "@/components/pressable";
import { usePouzivatel } from "@/lib/pouzivatel";
import { klucEntity, useFotkyEntity } from "@/lib/fotoentity";
import { NahlasitSheet } from "@/components/nahlasit";
import { qrUrl } from "@/lib/qr";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import type { Kanal } from "@/types";
import { SUBJEKTY, ZASLUZENA } from "./mock";
import { najdiZbierku, kryptoZbierky, type Dokaz } from "@/lib/zbierky";
import { nacitajTerminal, nacitajOnas, type Pozicia, type Tier } from "./stav";
import { FormatovanyText } from "@/components/formattext";
import { cistyText } from "@/lib/richtext";

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

const eur = (n: number) => n.toLocaleString("sk", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";

/** Dôkaz pomoci — fotky pred/po a doklady s sumou. Klik na doklad ukáže jeho náhľad. */
function DokazBlok({ dokaz, vyzbierane }: { dokaz: Dokaz; vyzbierane?: number }) {
  const [otvoreny, setOtvoreny] = useState<number | null>(null);
  const spolu = dokaz.doklady.reduce((a, d) => a + d.suma, 0);
  return (
    <div style={{ marginBottom: SPACE.sm }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, marginBottom: SPACE.xs }}>DÔKAZ — TAKTO SME POMOHLI</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${dokaz.fotky.length}, 1fr)`, gap: SPACE.xs, marginBottom: SPACE.sm }}>
        {dokaz.fotky.map((f) => (
          <div key={f.src} style={{ position: "relative", borderRadius: RADIUS.sm, overflow: "hidden" }}>
            <img src={f.src} alt={f.popis} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
            <span style={{ position: "absolute", left: 6, top: 6, fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: "#fff", background: f.popis === "PRED" ? "rgba(0,0,0,.65)" : "var(--a-green)", borderRadius: RADIUS.xs, padding: "2px 7px" }}>{f.popis}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.5, marginBottom: SPACE.sm }}>{dokaz.text}</div>
      <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, overflow: "hidden" }}>
        {dokaz.doklady.map((d, i) => (
          <div key={d.cislo} style={{ borderBottom: `1px solid ${C.line}` }}>
            <div {...pressable(() => setOtvoreny(otvoreny === i ? null : i), `${d.druh} ${d.nazov}`)}
              style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px`, cursor: "pointer" }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{d.nazov}</div>
                <div style={{ fontSize: 11, color: C.textTer }}>{d.druh} · {d.dodavatel}</div>
              </div>
              <span style={{ flex: "none", fontSize: 14, fontWeight: 800 }}>{eur(d.suma)}</span>
              <span style={{ color: C.textTer, fontSize: 14, transform: otvoreny === i ? "rotate(90deg)" : "none" }}>›</span>
            </div>
            {otvoreny === i && (
              <div style={{ margin: `0 ${SPACE.gutter}px ${SPACE.sm}px`, background: "#fff", color: "#222", borderRadius: RADIUS.xs, padding: SPACE.gutter, fontSize: 12, lineHeight: 1.6, boxShadow: "0 1px 6px rgba(0,0,0,.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, marginBottom: 6 }}><span>{d.druh.toUpperCase()}</span><span>{d.cislo}</span></div>
                <div>Dodávateľ: <b>{d.dodavatel}</b></div>
                <div>Odberateľ: <b>Svetlo pomoci o.z.</b></div>
                <div>Dátum: {d.datum}</div>
                <div style={{ borderTop: "1px dashed #bbb", margin: "6px 0", paddingTop: 6, display: "flex", justifyContent: "space-between" }}><span>{d.nazov}</span><b>{eur(d.suma)}</b></div>
                <div style={{ color: "#1a7f37", fontWeight: 700 }}>✓ Uhradené zo zbierky · overené DEED</div>
              </div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: `${SPACE.sm}px ${SPACE.gutter}px`, fontSize: 14, fontWeight: 800 }}>
          <span>Spolu doložené</span>
          <span style={{ color: "var(--a-green)" }}>{eur(spolu)}{vyzbierane ? ` z ${eur(vyzbierane)}` : ""}</span>
        </div>
      </div>
    </div>
  );
}

export function Podstranka({ pozicia, tier = 0, logo, toast, onBack }: {
  pozicia: Pozicia; tier?: Tier; logo: string | null; toast: (m: string) => void; onBack: () => void;
}) {
  const { desktop } = useLayout();
  const ja = usePouzivatel();
  const s = SUBJEKTY[pozicia];
  const stit = naStitLevel(ZASLUZENA[pozicia].badge);
  // tvorca vystupuje pod profilovou fotkou osoby, charita/B2B pod logom subjektu
  const avatarSrc = (pozicia === "tvorca" ? ja.foto : logo) ?? s.foto;
  const [fotky] = useFotkyEntity(klucEntity("rola", pozicia)); // titulná fotka zo správy roly
  const coverSrc = fotky.cover ?? s.cover;
  // „Všetko" — virtuálny tab navrchu (pred Kampane/Skutky/Talent…): zoskupí položky zo všetkých sekcií
  // verejný profil ukáže len to, čo má entita v aktuálnom programe (`odTieru`, bez neho = ZADARMO)
  // Zbierky = len aktívne. Ukončená zbierka sa presunie do Skutkov ako jedna karta s dôkazom.
  const ukoncena = (p: { zbierkaId?: string }) => !!p.zbierkaId && najdiZbierku(p.zbierkaId)?.stav === "ukoncena";
  const presunute = s.taby.find((t) => t.key === "zbierky")?.polozky.filter(ukoncena) ?? [];
  const mojeTaby = s.taby
    .filter((t) => (t.odTieru ?? 0) <= tier)
    .map((t) => ({ ...t, polozky: (
      t.key === "zbierky" ? t.polozky.filter((p) => !ukoncena(p))
      : t.key === "skutky" ? [...presunute, ...t.polozky]
      : t.polozky
    ).filter((p) => (p.odTieru ?? 0) <= tier) }));
  const taby = [{ key: "vsetko", label: "Všetko", polozky: mojeTaby.flatMap((t) => t.polozky) }, ...mojeTaby];
  const [tab, setTab] = useState("vsetko");
  const [sledujem, setSledujem] = useState(false);
  const [onasViac, setOnasViac] = useState(false);
  const [onas] = useState(() => nacitajOnas(pozicia) ?? s.onas); // text zo správy (editor), inak pôvodný
  const [rozbalena, setRozbalena] = useState<string | null>(null);
  const [profilZiad, setProfilZiad] = useState<string | null>(null);
  const [qrZbierka, setQrZbierka] = useState<{ id: string; nazov: string } | null>(null);
  const [zvoncek, setZvoncek] = useState(false);
  const [qr, setQr] = useState(false);
  const [menu, setMenu] = useState(false);
  const [nahlasit, setNahlasit] = useState(false);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  const [suma, setSuma] = useState(8600);   // mock — všeobecná podpora charity
  const [ludia, setLudia] = useState(214);
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
  const podporaBlok = pozicia === "charita" && tier >= 1 && (
    <div style={{ marginBottom: SPACE.gutter }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, marginBottom: SPACE.xs }}>CENTRÁLNA ZBIERKA ORGANIZÁCIE</div>
      <div style={{ marginBottom: SPACE.sm }}><ProgresBox suma={suma} ciel={12000} ludia={ludia} /></div>
      <PlatobnyModul zbalene
        onShare={zdielajProfil}
        upvotes={ludia} onUpvote={() => toast("❤")}
        onPodpor={(d: number) => { setSuma((x) => x + d * 0.01); setLudia((l) => l + 1); toast(`Ďakujeme za ${d} DEED pre ${s.nazov}`); }}
        onKanal={(k: string) => setPlatba(k as Kanal)}
        oblubene={{ refId: `rola-${s.nazov}`, typ: pozicia, modul: "charity", nazov: s.nazov, lok: s.lok }} toast={toast}
        qr={{ label: "QR tejto zbierky", popis: "Sken → dar za 2 kliky · zdieľanie", onClick: () => setQr(true) }} />
    </div>
  );

  const obsahBlok = (
    <>
      <TabyProfil options={taby.map((t) => t.key)} labels={labels} badges={badges} value={tab} onChange={setTab} ariaLabel="Obsah profilu" />
      {aktTab.polozky.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg }}>Zatiaľ žiadny obsah.</div>
      ) : (tab === "vsetko" ? mojeTaby : [aktTab]).map((g) => (
        <Fragment key={g.key}>
          {/* vo Všetko odsek podľa druhu: Zbierky → Skutky → Akcie */}
          {tab === "vsetko" && g.polozky.length > 0 && (
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: `${SPACE.gutter}px 0 ${SPACE.xs}px` }}>{g.label}</div>
          )}
          {g.polozky.map((p, i) => {
        const z = p.zbierkaId ? najdiZbierku(p.zbierkaId) : undefined;
        const kluc = p.zbierkaId ?? `${g.key}-${i}`; // unikátny aj naprieč odsekmi vo Všetko
        const otvorena = rozbalena === kluc;
        // skutok s dôkazom (fotky pred/po + doklady) sa tiež rozbalí
        const dokaz = p.dokaz ?? (p.dokazZbierky ? najdiZbierku(p.dokazZbierky)?.dokaz : undefined);
        const titul = z?.nazov || p.titul;
        const popis = z ? [p.popis, z.komu].filter(Boolean).join(" · ") : p.popis;
        return (
          <div key={kluc} style={{ background: C.surface, border: `1px solid ${otvorena ? tint("var(--a-info)", .38) : C.line}`, borderRadius: RADIUS.sm, marginBottom: SPACE.xs, overflow: "hidden" }}>
            <div {...pressable(() => (z || dokaz || p.video ? setRozbalena(otvorena ? null : kluc) : toast(`${titul} — detail`)), titul)}
              style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: SPACE.sm, cursor: "pointer" }}>
              {/* úvodná fotka zbierky — tá istá, akú vidíš v samotnej zbierke */}
              <span style={{ width: 44, height: 44, borderRadius: RADIUS.xs, flex: "none", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: "rgba(var(--glass-rgb),.06)" }}>
                {z ? <img src={z.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : p.video ? (
                    <span style={{ position: "relative", width: "100%", height: "100%", display: "block" }}>
                      <img src={p.video.nahlad} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.28)", color: "#fff", fontSize: 16 }}>▶</span>
                    </span>
                  ) : p.emoji}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {z?.stav === "ukoncena" && <UkoncenaPill />}
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{titul}</div>
                <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>{popis}</div>
                {!z && p.video && <div style={{ fontSize: 11, fontWeight: 700, color: C.textSec, marginTop: 3 }}>▶ video · {p.video.dlzka}</div>}
                {!z && dokaz && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--a-green)", marginTop: 3 }}>📷 {dokaz.fotky.length} fotky · 📄 {dokaz.doklady.length} doklady</div>}
                {z && (
                  <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: 5 }}>
                    <span style={{ flex: 1, height: 4, borderRadius: 3, background: "rgba(var(--glass-rgb),.12)", overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round(z.vyzbierane / z.ciel * 100))}%`, background: z.stav === "ukoncena" ? "var(--a-info)" : "var(--a-green)" }} />
                    </span>
                    <span style={{ flex: "none", fontSize: 10.5, fontWeight: 700, color: C.textTer }}>{z.vyzbierane.toLocaleString("sk")} / {z.ciel.toLocaleString("sk")} €</span>
                  </div>
                )}
              </div>
              {p.split != null && (
                <span style={{ flex: "none", fontSize: 11, fontWeight: 800, color: "var(--a-gold)", background: tint("var(--a-gold)", .14), borderRadius: RADIUS.xs, padding: `2px ${SPACE.xs}px` }}>{p.split} %</span>
              )}
              <span style={{ color: C.textTer, fontSize: 15, flex: "none", transform: otvorena ? "rotate(90deg)" : "none", transition: "transform .18s ease" }}>›</span>
            </div>

            {/* rozbalené video — prehrávač + väzba na zbierku */}
            {otvorena && !z && p.video && (
              <div style={{ padding: `0 ${SPACE.sm}px ${SPACE.sm}px` }}>
                <div {...pressable(() => toast(`▶ ${p.titul}`), "Prehrať video")}
                  style={{ position: "relative", borderRadius: RADIUS.sm, overflow: "hidden", cursor: "pointer", marginBottom: SPACE.sm }}>
                  <img src={p.video.nahlad} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.25)" }}>
                    <span style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 4 }}>▶</span>
                  </span>
                  <span style={{ position: "absolute", right: 8, bottom: 8, fontSize: 11.5, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,.65)", borderRadius: RADIUS.xs, padding: "1px 6px" }}>{p.video.dlzka}</span>
                </div>
                {p.video.zbierkaId && najdiZbierku(p.video.zbierkaId) && (
                  <div style={{ fontSize: 12.5, color: C.textSec, marginBottom: SPACE.xs }}>
                    Video k zbierke: <b style={{ color: C.text }}>{najdiZbierku(p.video.zbierkaId)!.nazov}</b>
                  </div>
                )}
                <div {...pressable(() => setRozbalena(null), "Zmenšiť")}
                  style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0 0`, cursor: "pointer" }}>Zmenšiť ▲</div>
              </div>
            )}

            {/* rozbalený skutok — dôkaz, že sme pomohli */}
            {otvorena && !z && dokaz && (
              <div style={{ padding: `0 ${SPACE.sm}px ${SPACE.sm}px` }}>
                <DokazBlok dokaz={dokaz} vyzbierane={p.dokazZbierky ? najdiZbierku(p.dokazZbierky)?.vyzbierane : undefined} />
                <div {...pressable(() => setRozbalena(null), "Zmenšiť")}
                  style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0 0`, cursor: "pointer" }}>Zmenšiť ▲</div>
              </div>
            )}

            {/* rozbalená zbierka — celá tu, profil ostáva pod ňou; druhý klik zbalí */}
            {otvorena && z && (
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
                  <PlatobnyModul zbalene krypto={kryptoZbierky(z)}
                    onShare={zdielajProfil}
                    upvotes={z.darcovia} onUpvote={() => toast("❤")}
                    onPodpor={(d: number) => toast(`Ďakujeme za ${d} DEED pre ${z.komu}`)}
                    onKanal={(k: string) => setPlatba(k as Kanal)}
                    oblubene={{ refId: z.id, typ: "zbierka", modul: "charity", nazov: z.nazov, lok: z.lok }} toast={toast}
                    qr={{ label: "QR tejto zbierky", popis: "Skenovať · kopírovať · zdieľať", onClick: () => setQrZbierka({ id: z.id, nazov: z.nazov }) }} />
                ) : (
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
                <div {...pressable(() => { setRozbalena(null); setProfilZiad(null); }, "Zmenšiť")}
                  style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: C.textTer, padding: `${SPACE.sm}px 0 0`, cursor: "pointer" }}>Zmenšiť ▲</div>
              </div>
            )}
          </div>
        );
      })}
        </Fragment>
      ))}
    </>
  );

  // O nás priamo pod hlavičkou — 2–3 riadky, zvyšok na „viac“
  const oNasKratky = (
    <div style={{ fontSize: 13, lineHeight: 1.5, color: C.textSec }}>
      <div style={onasViac ? undefined : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        <FormatovanyText text={onas} />
      </div>
      {cistyText(onas).length > 140 && (
        <span {...pressable(() => setOnasViac((v) => !v), onasViac ? "Zbaliť" : "Zobraziť viac")}
          style={{ display: "inline-block", marginTop: 2, fontSize: 12.5, fontWeight: 700, color: "var(--a-info)", cursor: "pointer" }}>
          {onasViac ? "menej" : "viac"}
        </span>
      )}
    </div>
  );

  const oNasBlok = (
    <>
      <MenuSkupina nadpis="KONTAKT">
        <KontaktPolozka ikona={<IkonaPin size={15} />} label="Adresa" hodnota={s.kontakt.adresa} />
        <KontaktPolozka ikona={<IkonaObalka size={15} />} label="E-mail" hodnota={s.kontakt.email} href={`mailto:${s.kontakt.email}`} />
        <KontaktPolozka ikona={<span style={{ fontSize: 13 }}>📞</span>} label="Telefón" hodnota={s.kontakt.tel} href={`tel:${s.kontakt.tel.replace(/\s/g, "")}`} />
        {s.kontakt.web
          ? <KontaktPolozka ikona={<IkonaOdkaz size={15} />} label="Web" hodnota={s.kontakt.web} href={`https://${s.kontakt.web}`} posledna />
          : null}
      </MenuSkupina>
    </>
  );

  const terminalBlok = pozicia === "tvorca" && terminalOn && (
    <div {...pressable(() => toast("Priamy príspevok tvorcovi"), "Podporiť tvorcu")}
      style={{ border: `1px solid ${tint("var(--a-green)", .34)}`, background: tint("var(--a-green)", .1), borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 700, color: "var(--a-green)", cursor: "pointer", marginBottom: SPACE.gutter }}>
      Podporiť tvorcu
    </div>
  );

  const telo = (
    <div style={{ padding: `0 ${SPACE.md}px` }}>
      <EntityHero
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
        stats={(tier === 0 && s.cislaZadarmo ? s.cislaZadarmo : s.cisla).map(([hodnota, label]) => ({ hodnota, label }))}
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
      {desktop ? (
        <DvaStlpce
          hlavny={<>{podporaBlok}{obsahBlok}{terminalBlok}</>}
          bok={oNasBlok}
        />
      ) : (
        <>{podporaBlok}{obsahBlok}{oNasBlok}{terminalBlok}</>
      )}
    </div>
  );

  return (
    <div style={{ paddingBottom: SPACE.lg, color: C.text }}>
      <BackHeader onBack={onBack}>
        <span style={{ fontSize: 12, color: C.textSec }}>{s.nazov}</span>
      </BackHeader>
      <div style={{ height: SPACE.sm }} />
      {obalSiroky(telo, { desktop, maxDesktop: SIRKA.citanie })}

      {menu && (
        <KontextMenu onClose={() => setMenu(false)} polozky={[
          { ikona: <Zdielanie size={17} />, label: "Zdieľať profil", onClick: zdielajProfil },
          { ikona: <IkonaOdkaz size={17} />, label: "Kopírovať odkaz", onClick: () => void skopirujOdkaz() },
          { ikona: <IkonaQr size={17} />, label: "QR kód a embed", popis: "Na tlač alebo vlastný web", onClick: () => setQr(true) },
          { ikona: <IkonaVlajka size={16} />, label: "Nahlásiť profil", danger: true, onClick: () => setNahlasit(true) },
        ]} />
      )}
      {nahlasit && <NahlasitSheet co={`Profil · ${s.nazov}`} refId={`rola-${pozicia}`} modul="rola" onClose={() => setNahlasit(false)} toast={toast} />}
      {platba && <PlatbaModal kanal={platba} komu={s.nazov} onClose={() => setPlatba(null)}
        onDone={(d: number) => { setSuma((x) => x + d * (platba === "DEED" ? 0.01 : 1)); setLudia((l) => l + 1); toast(`Odoslané ${platba === "EUR" ? d + " €" : platba === "EURC" ? d + " EURC" : d + " DEED"} · ${s.nazov}`); }} />}
      {qrZbierka && <QrModal typ="skutok" titul={`QR — ${qrZbierka.nazov}`} popis="Sken otvorí túto zbierku — daj ho na web, do správy alebo na plagát"
        odkaz={qrUrl("case", qrZbierka.id)} onClose={() => setQrZbierka(null)} toast={toast} />}
      {qr && <QrModal typ="skutok" titul={`QR — ${s.nazov}`} popis="Profil subjektu — QR aj embed odznak na vlastný web"
        odkaz={qrUrl("handle", s.nazov.toLowerCase().replace(/[^a-z0-9]+/g, "-"))} onClose={() => setQr(false)} toast={toast} />}
    </div>
  );
}

function SekciaLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, marginBottom: SPACE.xs }}>{children}</div>;
}
