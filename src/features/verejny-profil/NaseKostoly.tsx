// ============================================================
// KARTA 62 · stránka farnosti: blok „Naše kostoly“ (len pri 2+ miestach) a podstránka miesta
// (prototypy „Nase kostoly PC.dc.html“ 1a/1b a „Nase kostoly mobil tablet.dc.html“ 1a/1b/1c).
// Karta: fotka, druh, názov, 1 veta, Najbližšia omša, Viac o kostole ›. PC a tablet 3 vedľa seba, mobil posúvané do strany.
// Podstránka: fotka + ‹ Späť na Farnosť …, omše v tomto kostole, história (viac ›), fotky, najbližšie akcie tu,
// zbierka farnosti na toto miesto (peniaze idú na účet farnosti), adresa + Navigovať ›. Žiadne platby na podstránke.
// ============================================================
import { useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useKalendar, kostolKal, omseDna, polozkyDna, druhPolozky, iso, dvt, DNI_K, minuty, pekny, type KalKostol } from "@/lib/kalendarFarnosti";
import { nazovDruhu, type Miesto } from "@/lib/miestaFarnosti";
import { cistyText } from "@/lib/richtext";
import { useZamokVrstvy } from "@/lib/zamokVrstvy";
import { Datum } from "./NastenkaFarnosti";

const KARTA = "var(--nf-karta)", INK = "var(--nf-ink)", INK2 = "var(--nf-ink2)", INK3 = "var(--nf-ink3)", LINKA = "var(--nf-linka)", PAPIER = "var(--nf-papier)";
const kicker = (c = INK3): CSSProperties => ({ fontSize: 14, fontWeight: 800, letterSpacing: ".12em", color: c });
const titulna = (m: Miesto) => m.media.find((x) => x.typ === "foto")?.src;
const POZADIE_BEZ_FOTKY = "linear-gradient(160deg,#A9A290,#5F584A)";

/** omše miesta na najbližších n dní (od dnes), bez zrušených */
export function omseMiesta(k: KalKostol, dni = 7, od = new Date()): { d: Date; t: string[] }[] {
  const out: { d: Date; t: string[] }[] = [];
  for (let i = 0; i < dni; i++) {
    const d = new Date(od.getFullYear(), od.getMonth(), od.getDate() + i);
    const t = omseDna(k, d).filter((o) => !o.zrusena).map((o) => o.t).filter((x) => x && x !== "—").sort((a, b) => minuty(a) - minuty(b));
    if (t.length) out.push({ d, t });
  }
  return out;
}
/** „Ne 9:00“ alebo „dnes 18:00“ — najbližšia omša od teraz (14 dní dopredu) */
export function najblizsiaOmsa(k: KalKostol, teraz = new Date()): string {
  const dnes = iso(teraz), min = teraz.getHours() * 60 + teraz.getMinutes();
  for (const { d, t } of omseMiesta(k, 14, teraz)) {
    const dalsie = iso(d) === dnes ? t.filter((x) => minuty(x) >= min) : t;
    if (dalsie.length) return `${iso(d) === dnes ? "dnes" : DNI_K[dvt(d)]} ${pekny(dalsie[0])}`;
  }
  return "";
}
/** najbližšie akcie v tomto kostole (položky kalendára mimo omší, 21 dní) */
function akcieMiesta(k: KalKostol, teraz = new Date()) {
  const out: { d: Date; t: string; n: string }[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(teraz.getFullYear(), teraz.getMonth(), teraz.getDate() + i);
    for (const p of polozkyDna(k, d)) { const x = druhPolozky(p.typ); if (x.kat === "omse" || x.kat === "umysel") continue; out.push({ d, t: p.t, n: p.m.trim() || x.nazov }); }
  }
  return out.slice(0, 4);
}

/** blok Naše kostoly — posledný blok pred pätou */
export function NaseKostolyBlok({ strankaId, miesta, siroka, pc, onMiesto, styl, nadpis }: { strankaId: string; miesta: Miesto[]; siroka: boolean; pc: boolean; onMiesto: (m: Miesto) => void; styl: CSSProperties; nadpis: (n: string, p: string) => ReactNode }) {
  useKalendar(strankaId);
  return (
    <div data-blok="kostoly" style={styl}>
      {nadpis("Naše kostoly", siroka ? `${miesta.length === 2 ? "Dve miesta" : miesta.length === 3 ? "Tri miesta" : `${miesta.length} miest`}, jedna farnosť. Ťuknite na kostol a uvidíte omše a akcie len v ňom.` : "Ťuknite na kostol, uvidíte omše len v ňom.")}
      <div style={siroka
        ? { flex: "999 1 520px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: pc ? 20 : 14 }
        : { flex: "1 1 100%", minWidth: 0, display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", margin: "0 calc(-1 * clamp(20px,5vw,72px))", padding: "0 clamp(20px,5vw,72px) 6px", overscrollBehaviorX: "contain" }}>
        {miesta.map((m) => <KartaMiesta key={m.id} m={m} k={kostolKal(strankaId, m.id)} siroka={siroka} onTap={() => onMiesto(m)} />)}
      </div>
    </div>);
}

function KartaMiesta({ m, k, siroka, onTap }: { m: Miesto; k: KalKostol; siroka: boolean; onTap: () => void }) {
  const f = titulna(m), om = najblizsiaOmsa(k);
  return (
    <button type="button" onClick={onTap} aria-label={`${m.nazov} · viac o kostole`}
      style={{ flex: siroka ? undefined : "0 0 78%", scrollSnapAlign: "start", minWidth: 0, textAlign: "left", padding: 0, border: "none", borderRadius: 20, overflow: "hidden", background: KARTA, color: INK, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column" }}>
      <span style={{ display: "block", aspectRatio: "16 / 10", background: f ? `center/cover no-repeat url('${f}')` : POZADIE_BEZ_FOTKY }} />
      <span style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "#8A6A1F" }}>{nazovDruhu(m.druh).toLocaleUpperCase("sk-SK")}</span>
        <b style={{ fontSize: 19, lineHeight: 1.2, letterSpacing: "-.01em" }}>{m.nazov}</b>
        {m.popis && siroka && <span style={{ fontSize: 15, lineHeight: 1.45, color: INK2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.popis}</span>}
        {om && <span style={{ fontSize: 14.5, color: INK2 }}>Najbližšia omša: <b style={{ color: INK }}>{om}</b></span>}
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--nf-gInk)", paddingTop: 4 }}>Viac o kostole ›</span>
      </span>
    </button>);
}

export interface ZbierkaNaMiesto { id: string; nazov: string; onTap: () => void }

/** podstránka miesta — plná vrstva, zatvára sa cez ‹ Späť */
export function PodstrankaMiesta({ m, strankaId, menoFarnosti, siroka, zbierky, onKalendar, onZavri, sledovat, linia }: {
  m: Miesto; strankaId: string; menoFarnosti: string; siroka: boolean; zbierky: ZbierkaNaMiesto[]; /** OPRAVY 243: farba línií stránky */ linia: string;
  onKalendar: () => void; onZavri: () => void; /** KARTA 62: „Sledovať tento kostol“ */ sledovat?: ReactNode;
}) {
  useZamokVrstvy();
  useKalendar(strankaId);
  const k = kostolKal(strankaId, m.id), f = titulna(m);
  const omse = omseMiesta(k, 7), akcie = akcieMiesta(k);
  const hist = cistyText(m.historia || "").trim();
  const [histOtv, setHistOtv] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const fotky = m.media.filter((x) => x.typ === "foto");
  const sekcia = (t: string, deti: ReactNode) => <section style={{ display: "flex", flexDirection: "column", gap: 10 }}><span style={kicker()}>{t}</span>{deti}</section>;
  const tl: CSSProperties = { alignSelf: "flex-start", minHeight: 46, padding: "0 18px", borderRadius: 12, border: `1.5px solid ${LINKA}`, background: PAPIER, color: INK, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };
  const mapa = m.adresa.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.adresa.trim())}` : "";
  const omseEl = sekcia("OMŠE V TOMTO KOSTOLE", <>
    {omse.length ? omse.map(({ d, t }) => <div key={iso(d)} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "8px 0", borderTop: `1px solid ${LINKA}` }}>
      <span style={{ flex: "0 0 92px", fontSize: 15, color: INK2 }}>{DNI_K[dvt(d)]} {d.getDate()}. {d.getMonth() + 1}.</span>
      <b style={{ fontSize: 16.5, fontVariantNumeric: "tabular-nums" }}>{t.map(pekny).join(" · ")}</b></div>)
      : <span style={{ fontSize: 15.5, color: INK3 }}>Tento týždeň tu nie je žiadna omša.</span>}
    <button type="button" onClick={onKalendar} style={tl}>Celý kalendár farnosti ›</button>
  </>);
  const histEl = hist && <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 16.5, lineHeight: 1.6, color: INK2, whiteSpace: "pre-line", ...(histOtv ? {} : { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}>{hist}</span>
    {!histOtv && hist.length > 220 && <button type="button" onClick={() => setHistOtv(true)} style={{ alignSelf: "flex-start", padding: 0, border: "none", background: "transparent", color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, cursor: "pointer" }}>viac ›</button>}
  </section>;
  const akcieEl = akcie.length > 0 && sekcia(siroka ? "NAJBLIŽŠIE AKCIE V TOMTO KOSTOLE" : "NAJBLIŽŠIE AKCIE TU", akcie.map((a, i) => (
    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", borderRadius: 14, background: KARTA }}>
      <Datum d={a.d} /><span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><span style={{ ...kicker(), fontSize: 12.5 }}>{["NEDEĽA", "PONDELOK", "UTOROK", "STREDA", "ŠTVRTOK", "PIATOK", "SOBOTA"][a.d.getDay()]} {pekny(a.t)}</span><b style={{ fontSize: 16.5 }}>{a.n}</b></span>
    </div>)));
  const zbEl = zbierky.length > 0 && sekcia("ZBIERKA FARNOSTI · NA TENTO KOSTOL", zbierky.map((z) => (
    <button key={z.id} type="button" onClick={z.onTap} style={{ textAlign: "left", padding: "14px 16px", borderRadius: 16, border: "none", borderLeft: "6px solid #2F7A78", background: KARTA, color: INK, fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}>
      <b style={{ fontSize: 17 }}>{z.nazov} ›</b><span style={{ fontSize: 14, color: INK3 }}>peniaze idú na účet farnosti</span>
    </button>)));
  const fotkyEl = fotky.length > 1 && sekcia("FOTKY", <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 8 }}>
    {fotky.map((x) => <button key={x.id} type="button" onClick={() => setFoto(x.src)} aria-label={x.popis || "Fotka na celú obrazovku"} style={{ border: "none", padding: 0, borderRadius: 12, overflow: "hidden", aspectRatio: "1", cursor: "zoom-in" }}><img src={x.src} alt={x.popis ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></button>)}
  </div>);
  const adresaEl = m.adresa.trim() && sekcia("ADRESA", <>
    <span style={{ fontSize: 16.5, lineHeight: 1.5, color: INK2 }}>{m.adresa}</span>
    {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" style={{ ...tl, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Navigovať ›</a>}
  </>);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={m.nazov} className="nastenka-farnosti" style={{ position: "fixed", inset: 0, zIndex: 1000, overflowY: "auto", overscrollBehavior: "contain", background: "var(--c-bg)", color: INK, fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", background: "var(--nf-bg)", minHeight: "100%" }}>
        <div style={{ position: "relative", aspectRatio: siroka ? "21 / 8" : "4 / 3", background: f ? `center/cover no-repeat url('${f}')` : POZADIE_BEZ_FOTKY }}>
          <button type="button" onClick={onZavri} autoFocus style={siroka
            ? { position: "absolute", top: 24, left: 24, minHeight: 48, padding: "0 18px", border: "none", borderRadius: 14, background: "rgba(255,255,255,.92)", color: "#14110B", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }
            : { position: "absolute", top: "calc(10px + env(safe-area-inset-top, 0px))", left: 12, minHeight: 40, padding: "0 12px", border: "none", borderRadius: 20, background: "rgba(20,17,11,.55)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>‹ Späť na {menoFarnosti}</button>
        </div>
        <div style={{ height: 12, background: linia, boxShadow: "0 4px 14px rgba(0,0,0,.18)" }} aria-hidden="true" />
        <div style={{ padding: siroka ? "32px clamp(20px,5vw,56px) 56px" : "20px 20px 48px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={kicker("#8A6A1F")}>{nazovDruhu(m.druh).toLocaleUpperCase("sk-SK")}{siroka ? ` · ${menoFarnosti.toLocaleUpperCase("sk-SK")}` : ""}</span>
            <b style={{ fontSize: "clamp(30px,4vw,48px)", lineHeight: 1.05, letterSpacing: "-.03em" }}>{m.nazov}</b>
            {sledovat}
          </div>
          {siroka
            ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 40, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>{histEl}{akcieEl}{zbEl}{fotkyEl}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>{omseEl}{adresaEl}</div>
              </div>
            : <>{omseEl}{histEl}{akcieEl}{zbEl}{fotkyEl}{adresaEl}</>}
        </div>
      </div>
      {foto && <div role="dialog" aria-modal="true" aria-label="Fotka" onClick={() => setFoto(null)} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "#0E0C08", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
        <img src={foto} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        <button type="button" onClick={() => setFoto(null)} style={{ position: "absolute", top: 16, right: 16, minHeight: 44, padding: "0 16px", border: "none", borderRadius: 12, background: "#fff", color: "#111", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>× Zavrieť</button>
      </div>}
    </div>, document.body);
}

