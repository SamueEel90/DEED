import { useState } from "react";
import { C, SPACE, RADIUS, SIRKA } from "@/theme";
import {
  BackHeader, PodporaSekcia, PlatbaModal, ProgresBox, QrModal, Stit, naStitLevel, tint,
  Zdielanie, Zvon, Srdce, useLayout, obalSiroky,
  EntityHero, BtnAkcia, BtnIkonka, KontextMenu, TabyProfil, MenuSkupina, KontaktPolozka, DvaStlpce,
  IkonaMoznosti, IkonaQr, IkonaVlajka, IkonaPin, IkonaObalka, IkonaOdkaz,
} from "@/shared";
import { pressable } from "@/components/pressable";
import { usePouzivatel } from "@/lib/pouzivatel";
import { NahlasitSheet } from "@/components/nahlasit";
import { qrUrl } from "@/lib/qr";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import type { Kanal } from "@/types";
import { SUBJEKTY, ZASLUZENA } from "./mock";
import { nacitajTerminal, type Pozicia } from "./stav";

/*
  ============================================================
  VEREJNÁ PODSTRÁNKA SUBJEKTU — vlastník vidí tú istú stránku ako cudzí.
  Vzor business profilov: hero (cover→avatar→meno→štatistiky→akcie) →
  taby obsahu → o nás → kontakt. Poloha kasičky podľa účelu subjektu:
  charita zbiera → podpora hore · tvorca/firma → terminál/nič dole.
  Sekundárne akcie (zdieľať / QR / nahlásiť) žijú v ⋯ menu.
  ============================================================
*/

export function Podstranka({ pozicia, logo, toast, onBack }: {
  pozicia: Pozicia; logo: string | null; toast: (m: string) => void; onBack: () => void;
}) {
  const { desktop } = useLayout();
  const ja = usePouzivatel();
  const s = SUBJEKTY[pozicia];
  const stit = naStitLevel(ZASLUZENA[pozicia].badge);
  // tvorca vystupuje pod profilovou fotkou osoby, charita/B2B pod logom subjektu
  const avatarSrc = (pozicia === "tvorca" ? ja.foto : logo) ?? s.foto;
  // „Všetko" — virtuálny tab navrchu (pred Kampane/Skutky/Talent…): zoskupí položky zo všetkých sekcií
  const taby = [{ key: "vsetko", label: "Všetko", polozky: s.taby.flatMap((t) => t.polozky) }, ...s.taby];
  const [tab, setTab] = useState("vsetko");
  const [sledujem, setSledujem] = useState(false);
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
  const podporaBlok = pozicia === "charita" && (
    <div style={{ marginBottom: SPACE.gutter }}>
      <SekciaLabel>PODPORA ORGANIZÁCIE</SekciaLabel>
      <div style={{ marginBottom: SPACE.sm }}><ProgresBox suma={suma} ciel={12000} ludia={ludia} /></div>
      <PodporaSekcia
        onShare={zdielajProfil}
        upvotes={ludia} onUpvote={() => toast("❤")}
        onPodpor={(d: number) => { setSuma((x) => x + d * 0.01); setLudia((l) => l + 1); toast(`Ďakujeme za ${d} DEED pre ${s.nazov}`); }}
        onSms={() => { setLudia((l) => l + 1); toast("SMS podpora"); }}
        onKanal={(k: string) => setPlatba(k as Kanal)} />
    </div>
  );

  const obsahBlok = (
    <>
      <TabyProfil options={taby.map((t) => t.key)} labels={labels} badges={badges} value={tab} onChange={setTab} ariaLabel="Obsah profilu" />
      {aktTab.polozky.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.textTer, textAlign: "center", padding: SPACE.lg }}>Zatiaľ žiadny obsah.</div>
      ) : aktTab.polozky.map((p, i) => (
        <div key={i} {...pressable(() => toast(`${p.titul} — detail`), p.titul)}
          style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface, border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, cursor: "pointer" }}>
          <span style={{ width: 40, height: 40, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: "rgba(var(--glass-rgb),.06)" }}>{p.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.titul}</div>
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>{p.popis}</div>
          </div>
          <span style={{ color: C.textTer, fontSize: 15 }}>›</span>
        </div>
      ))}
    </>
  );

  const oNasBlok = (
    <>
      <MenuSkupina nadpis="O NÁS">
        <div style={{ padding: SPACE.gutter, fontSize: 13.5, lineHeight: 1.55, color: C.textSec }}>{s.onas}</div>
      </MenuSkupina>
      <MenuSkupina nadpis="DÔVERA">
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: SPACE.gutter }}>
          <Stit level={stit} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{stit}</div>
            <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.4 }}>Štít je zaslúžený za overené skutky — nedá sa kúpiť.</div>
          </div>
          <span {...pressable(() => setQr(true), "QR profilu")} style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "var(--a-info)", border: `1px solid ${tint("var(--a-info)", .38)}`, background: tint("var(--a-info)", .1), borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, cursor: "pointer" }}>
            <IkonaQr size={13} /> QR profilu
          </span>
        </div>
      </MenuSkupina>
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
        cover={s.cover}
        coverEl={<span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, opacity: .45 }}>{s.emoji}</span>}
        meno={s.nazov} overene={s.overena} overeneLabel="Overený subjekt — identita potvrdená"
        podtitul={<span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><IkonaPin size={11} color={C.textTer} /> {s.lok}</span>}
        vpravo={<Stit level={stit} size={38} />}
        stats={s.cisla.map(([hodnota, label], i) => ({ hodnota, label, farba: i === 2 ? "var(--a-gold)" : undefined }))}
        akcie={<>
          <BtnAkcia variant={sledujem ? "secondary" : "primary"} ariaPressed={sledujem}
            onClick={() => { setSledujem((v) => !v); toast(sledujem ? `Prestal si sledovať ${s.nazov}` : `Sleduješ ${s.nazov}`); }}>
            <Srdce size={14} filled={sledujem} color={sledujem ? "var(--a-green)" : "#fff"} /> {sledujem ? "Sledované" : "Sledovať"}
          </BtnAkcia>
          <BtnAkcia variant="secondary" onClick={zdielajProfil}><Zdielanie size={14} /> Zdieľať</BtnAkcia>
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
        onDone={(d: number) => { setSuma((x) => x + d * (platba === "EUR" ? 1 : 0.01)); setLudia((l) => l + 1); toast(`Odoslané ${platba === "EUR" ? d + " €" : d + " DEED"} · ${s.nazov}`); }} />}
      {qr && <QrModal typ="skutok" titul={`QR — ${s.nazov}`} popis="Profil subjektu — QR aj embed odznak na vlastný web"
        odkaz={qrUrl("handle", s.nazov.toLowerCase().replace(/[^a-z0-9]+/g, "-"))} onClose={() => setQr(false)} toast={toast} />}
    </div>
  );
}

function SekciaLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: C.textTer, marginBottom: SPACE.xs }}>{children}</div>;
}
