import { useState } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { BackHeader, SegTabs, PodporaSekcia, PlatbaModal, ProgresBox, QrModal, Stit, naStitLevel, tint, Zdielanie, Zvon, Srdce } from "@/shared";
import { pressable } from "@/components/pressable";
import { qrUrl } from "@/lib/qr";
import { zdielaj, aktualnaUrl } from "@/lib/zdielanie";
import type { Kanal } from "@/types";
import { SUBJEKTY, ZASLUZENA } from "./mock";
import { nacitajTerminal, type Pozicia } from "./stav";

/*
  ============================================================
  VEREJNÁ PODSTRÁNKA SUBJEKTU — PATCH 2 §3. Rola = verejná funkcia,
  podstránka je VŽDY verejná; vlastník vidí TÚ ISTÚ stránku ako cudzí
  (správa žije inline na entity obrazovke, nie tu — jeden zdroj pravdy).

  Fixné poradie blokov (user sa nesmie strácať):
   1 hero · 2 štatistiky (3 čísla) · 3 sledovať+zvonček · 4 taby obsahu
   · 5 o nás · 6 badge vysvetlivka + QR/embed · 7 kontakt
  Jediná povolená odchýlka = poloha kasičky podľa účelu subjektu:
   charita/farnosť zbiera → podpora HORE pri štatistikách
   tvorca/firma nezbiera pre seba → terminál/nič DOLE
  ============================================================
*/

const P = {
  card: "rgba(var(--glass-rgb),.045)", line: "rgba(var(--glass-rgb),.08)",
  blue: "var(--a-info)", blueBg: tint("var(--a-info)", .1), blueEdge: tint("var(--a-info)", .38),
  green: "var(--a-green)", greenBg: tint("var(--a-green)", .1), greenEdge: tint("var(--a-green)", .34),
  gold: "var(--a-gold)", goldBg: tint("var(--a-gold)", .1), goldEdge: tint("var(--a-gold)", .34),
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
};

export function Podstranka({ pozicia, logo, toast, onBack }: {
  pozicia: Pozicia; logo: string | null; toast: (m: string) => void; onBack: () => void;
}) {
  const s = SUBJEKTY[pozicia];
  const stit = naStitLevel(ZASLUZENA[pozicia].badge);
  const [tab, setTab] = useState(s.taby[0].key);
  const [sledujem, setSledujem] = useState(false);
  const [zvoncek, setZvoncek] = useState(false);
  const [qr, setQr] = useState(false);
  const [platba, setPlatba] = useState<Kanal | null>(null);
  const [suma, setSuma] = useState(8600);   // mock — všeobecná podpora charity
  const [ludia, setLudia] = useState(214);
  const terminalOn = pozicia === "tvorca" && nacitajTerminal();
  const aktTab = s.taby.find((t) => t.key === tab) ?? s.taby[0];

  return (
    <div style={{ paddingBottom: SPACE.lg, color: P.txt }}>
      <BackHeader onBack={onBack} right={
        <span {...pressable(() => void zdielaj({ titul: s.nazov, text: s.nazov, url: aktualnaUrl() }, toast), "Zdieľať podstránku")} style={{ display: "flex", cursor: "pointer" }}><Zdielanie size={17} color={P.txt2} /></span>
      }>
        <span style={{ fontSize: 12, color: P.txt2 }}>verejná podstránka</span>
      </BackHeader>
      <div style={{ height: SPACE.sm }} />

      {/* 1 · HERO — cover + logo v krúžku, meno, overená, štít (BEZ progresu), lokalita */}
      <div style={{ padding: `0 ${SPACE.md}px` }}>
        <div style={{ position: "relative", height: 120, borderRadius: RADIUS.md, overflow: "hidden", background: `linear-gradient(135deg, ${tint("var(--a-info)", .25)}, ${tint("var(--a-plum)", .18)} 60%, ${tint("var(--a-gold)", .2)})` }}>
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, opacity: .5 }}>{s.emoji}</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: SPACE.sm, marginTop: -26, padding: `0 ${SPACE.sm}px` }}>
          <span style={{ width: 64, height: 64, borderRadius: "50%", flex: "none", overflow: "hidden", border: `3px solid ${C.surface}`, background: C.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }}>
            {logo ? <img src={logo} alt={s.nazov} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (pozicia === "tvorca" ? s.emoji : s.iniciacky)}
          </span>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
            <div style={{ fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: SPACE.xs, flexWrap: "wrap" }}>
              {s.nazov}
              {s.overena && <span style={{ fontSize: 10, fontWeight: 800, color: P.green, background: P.greenBg, border: `1px solid ${P.greenEdge}`, padding: `1px ${SPACE.xs}px`, borderRadius: RADIUS.xs }}>✓ overená</span>}
            </div>
            <div style={{ fontSize: 11.5, color: P.txt2, marginTop: 2 }}>📍 {s.lok}</div>
          </div>
          <Stit level={stit} size={40} />
        </div>
      </div>

      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px 0` }}>
        {/* 2 · ŠTATISTIKY — 3 čísla per rola */}
        <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.sm }}>
          {s.cisla.map(([hodnota, label], i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", background: P.card, border: `1px solid ${P.line}`, borderRadius: RADIUS.sm, padding: `${SPACE.sm}px ${SPACE.xxs}px` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: i === 2 ? P.gold : P.txt }}>{hodnota}</div>
              <div style={{ fontSize: 9.5, color: P.txt3, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* 3 · SLEDOVAŤ + ZVONČEK */}
        <div style={{ display: "flex", gap: SPACE.sm, marginBottom: SPACE.gutter }}>
          <button onClick={() => { setSledujem((v) => !v); toast(sledujem ? `Prestal si sledovať ${s.nazov}` : `Sleduješ ${s.nazov}`); }}
            style={{ flex: 1, height: 42, border: `1px solid ${sledujem ? P.greenEdge : P.blueEdge}`, background: sledujem ? P.greenBg : P.blueBg, color: sledujem ? P.green : P.blue, borderRadius: RADIUS.sm, fontWeight: 700, fontSize: 13.5, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs }}>
            <Srdce size={15} filled={sledujem} color={sledujem ? P.green : P.blue} /> {sledujem ? "Sledované" : "Sledovať"}
          </button>
          <button onClick={() => { setZvoncek((v) => !v); toast(zvoncek ? "Upozornenia vypnuté" : "Upozornenia na novinky zapnuté"); }}
            aria-pressed={zvoncek} title="Upozornenia"
            style={{ width: 46, height: 42, border: `1px solid ${zvoncek ? P.goldEdge : P.line}`, background: zvoncek ? P.goldBg : P.card, borderRadius: RADIUS.sm, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zvon size={17} color={zvoncek ? P.gold : P.txt2} />
          </button>
        </div>

        {/* 4a · KASIČKA HORE — len subjekt, ktorý zbiera (charita/farnosť) */}
        {pozicia === "charita" && (
          <div style={{ marginBottom: SPACE.gutter }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: P.txt3, letterSpacing: ".04em", marginBottom: SPACE.xs }}>VŠEOBECNÁ PODPORA ORGANIZÁCIE</div>
            <div style={{ marginBottom: SPACE.sm }}><ProgresBox suma={suma} ciel={12000} ludia={ludia} /></div>
            <PodporaSekcia
              onShare={() => void zdielaj({ titul: s.nazov, text: s.nazov, url: aktualnaUrl() }, toast)}
              upvotes={ludia} onUpvote={() => toast("❤")}
              onPodpor={(d: number) => { setSuma((x) => x + d * 0.01); setLudia((l) => l + 1); toast(`Ďakujeme za ${d} DEED pre ${s.nazov}`); }}
              onSms={() => { setLudia((l) => l + 1); toast("SMS podpora"); }}
              onKanal={(k: string) => setPlatba(k as Kanal)} />
          </div>
        )}

        {/* 4 · TABY OBSAHU per rola */}
        <SegTabs
          options={s.taby.map((t) => t.key)}
          value={tab}
          onChange={setTab}
          ariaLabel="Obsah podstránky"
          style={{ display: "flex", gap: SPACE.xxs, padding: SPACE.xxs, borderRadius: RADIUS.md, background: C.surface2, border: `1px solid ${P.line}`, marginBottom: SPACE.sm }}
          render={(k, on) => (
            <span style={{ flex: 1, height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: RADIUS.sm, cursor: "pointer", fontSize: 12.5, fontWeight: on ? 800 : 600, background: on ? P.blueBg : "transparent", border: `1px solid ${on ? P.blueEdge : "transparent"}`, color: on ? P.blue : P.txt2, whiteSpace: "nowrap" }}>
              {s.taby.find((t) => t.key === k)?.label}
            </span>
          )}
        />
        {aktTab.polozky.map((p, i) => (
          <div key={i} {...pressable(() => toast(`${p.titul} — detail (demo)`), p.titul)}
            style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: C.surface2, border: `1px solid ${P.line}`, borderRadius: RADIUS.sm, padding: SPACE.sm, marginBottom: SPACE.xs, cursor: "pointer" }}>
            <span style={{ width: 36, height: 36, borderRadius: RADIUS.xs, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: "rgba(var(--glass-rgb),.06)" }}>{p.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.titul}</div>
              <div style={{ fontSize: 11, color: P.txt3, marginTop: 2 }}>{p.popis}</div>
            </div>
            <span style={{ color: P.txt3, fontSize: 15 }}>›</span>
          </div>
        ))}

        {/* 5 · O NÁS */}
        <div style={{ fontSize: 10.5, fontWeight: 800, color: P.txt3, letterSpacing: ".04em", margin: `${SPACE.gutter}px 0 ${SPACE.xs}px` }}>O NÁS</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: P.txt2, marginBottom: SPACE.gutter }}>{s.onas}</div>

        {/* 6 · BADGE VYSVETLIVKA + QR/EMBED — vysvetlivka patrí na verejnú stránku (PATCH 2 §7) */}
        <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, background: P.card, border: `1px solid ${P.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter, marginBottom: SPACE.sm }}>
          <Stit level={stit} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{stit}</div>
            <div style={{ fontSize: 11, color: P.txt3, lineHeight: 1.4 }}>Štít je zaslúžený karmou za overené skutky — nedá sa kúpiť.</div>
          </div>
          <span {...pressable(() => setQr(true), "QR profilu")} style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: P.blue, border: `1px solid ${P.blueEdge}`, background: P.blueBg, borderRadius: RADIUS.sm, padding: `${SPACE.xs}px ${SPACE.sm}px`, cursor: "pointer" }}>▦ QR / embed</span>
        </div>

        {/* 7 · KONTAKT */}
        <div style={{ fontSize: 10.5, fontWeight: 800, color: P.txt3, letterSpacing: ".04em", margin: `${SPACE.gutter}px 0 ${SPACE.xs}px` }}>KONTAKT</div>
        <div style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter, fontSize: 12.5, color: P.txt2, lineHeight: 1.7, marginBottom: SPACE.gutter }}>
          📍 {s.kontakt.adresa}<br />✉️ {s.kontakt.email}<br />📞 {s.kontakt.tel}{s.kontakt.web && <><br />🌐 {s.kontakt.web}</>}
        </div>

        {/* 4b · KASIČKA DOLE — tvorca/firma nezbiera pre seba („skutky hore, kasička dole") */}
        {pozicia === "tvorca" && (
          terminalOn ? (
            <div {...pressable(() => toast("Terminál (Transak) — priamy príspevok tvorcovi (demo)"), "Podporiť tvorcu")}
              style={{ border: `2px solid ${P.greenEdge}`, background: P.greenBg, borderRadius: RADIUS.sm, padding: SPACE.gutter, textAlign: "center", fontSize: 14, fontWeight: 700, color: P.green, cursor: "pointer" }}>
              💳 Podporiť tvorcu — terminál (Transak)
            </div>
          ) : (
            <div style={{ fontSize: 10.5, color: P.txt3, textAlign: "center" }}>Terminál je vypnutý — tvorca ho zapína v správe podstránky.</div>
          )
        )}
      </div>

      {platba && <PlatbaModal kanal={platba} komu={s.nazov} onClose={() => setPlatba(null)}
        onDone={(d: number) => { setSuma((x) => x + d * (platba === "EUR" ? 1 : 0.01)); setLudia((l) => l + 1); toast(`Odoslané ${platba === "EUR" ? d + " €" : d + " DEED"} · ${s.nazov}`); }} />}
      {qr && <QrModal typ="skutok" titul={`QR — ${s.nazov}`} popis="Profil subjektu · QR aj HTML embed badge na vlastný web (klik → DEED profil, backlink)"
        odkaz={qrUrl("handle", s.nazov.toLowerCase().replace(/[^a-z0-9]+/g, "-"))} onClose={() => setQr(false)} toast={toast} />}
    </div>
  );
}
