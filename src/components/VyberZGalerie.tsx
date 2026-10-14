// BLOK B 232 · „Vybrať z galérie farnosti ›" (Správa farnosti) a „Vybrať z mojich fotiek" (veriaci).
// Mriežka už nahratých fotiek, ťuk = vybrať, viac naraz. Vybrané idú ďalej do GaleriaEditor (poradie, výrez, popis).
// Zdroj dáva kontext: SpravaFarnosti = galéria farnosti, FarnikPridava = moje fotky.
// OPRAVY 254: okno má dve záložky — Moje fotky (zdroj z kontextu) · Verejné fotky (bod 254: náš výber + fotobanky cez /api/fotky,
// vybrané uloží server k nám cez /api/fotky/uloz; fotobanky hľadá len správca stránky, ostatní vidia náš výber).
// Bez kontextu je len záložka Verejné fotky. Verejná fotka = ilustračná (súhlas ľudí na fotkách sa nepýta, štítok sa neukazuje).
import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { PanelVerejnychFotiek, klucFotky } from "./VerejneFotky";
import { ulozFotku, type VerejnaFotka } from "@/lib/verejneFotky";
/** adresy vybraných verejných fotiek — volajúci podľa toho označí fotku ako ilustračnú */
const verejneVybrane = new Set<string>();
export const jeVerejnaFotka = (src: string) => verejneVybrane.has(src);

export interface ZdrojFotiek {
  /** text tlačidla */ tlacidlo: string;
  /** nadpis okna */ nadpis: string;
  /** keď ešte nič nie je */ prazdne: string;
  fotky: () => string[];
}
export const ZdrojFotiekKontext = createContext<ZdrojFotiek | null>(null);
export const useZdrojFotiek = () => useContext(ZdrojFotiekKontext);

export const zdrojFarnosti = (fotky: () => string[]): ZdrojFotiek => ({
  tlacidlo: "Vybrať z galérie farnosti ›", nadpis: "Galéria farnosti",
  prazdne: "Farnosť zatiaľ nemá nahraté žiadne fotky. Fotky z profilu, oznamov, zbierok, brigád a stretnutí sa tu ukážu samé.", fotky,
});
export const zdrojMoje = (fotky: () => string[]): ZdrojFotiek => ({
  tlacidlo: "Vybrať z mojich fotiek", nadpis: "Moje fotky",
  prazdne: "Zatiaľ tu nemáte žiadne fotky. Fotky, ktoré pridáte na stránku farnosti alebo k skutkom, sa tu ukážu samé.", fotky,
});

const fotiek = (n: number) => (n === 1 ? "1 fotku" : n >= 2 && n <= 4 ? `${n} fotky` : `${n} fotiek`);

/** tlačidlo vedľa „Pridať fotky" — otvorí okno s mriežkou (Moje fotky · Verejné fotky) */
export function TlacidloGalerie({ zdroj, vybrane, zostava, onVyber, style }: {
  zdroj: ZdrojFotiek | null; /** čo už je pridané (ukáže sa ako pridané) */ vybrane: string[];
  /** koľko sa ešte zmestí */ zostava: number; onVyber: (src: string[]) => void; style?: CSSProperties;
}) {
  const [otv, setOtv] = useState(false);
  return <>
    <button type="button" onClick={() => setOtv(true)} disabled={zostava <= 0} style={{ minHeight: 48, padding: "0 16px", borderRadius: 14, border: "1.5px solid var(--gBd)", background: "var(--gSoft)", color: "var(--gInk)", cursor: zostava > 0 ? "pointer" : "default", opacity: zostava > 0 ? 1 : 0.45, fontFamily: "inherit", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...style }}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d="M4 5h16v14H4zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M20 15l-5-5L5 19" /></svg>
      {zdroj ? zdroj.tlacidlo : "Vybrať z verejných fotiek ›"}
    </button>
    {otv && <OknoGalerie zdroj={zdroj} vybrane={vybrane} zostava={zostava} onZavri={() => setOtv(false)} onVyber={(l) => { setOtv(false); if (l.length) onVyber(l); }} />}
  </>;
}

/** okno Vybrať fotku · OPRAVY 258: aj Editor oznámení (jedna fotka) */
export function OknoGalerie({ zdroj, vybrane, zostava, onZavri, onVyber }: { zdroj: ZdrojFotiek | null; vybrane: string[]; zostava: number; onZavri: () => void; onVyber: (l: string[]) => void }) {
  const moje = useMemo(() => (zdroj ? zdroj.fotky() : []), [zdroj]);
  const [tab, setTab] = useState<"moje" | "verejne">(zdroj ? "moje" : "verejne");
  const fotky = moje;
  const [vyb, setVyb] = useState<string[]>([]);
  const [vybV, setVybV] = useState<VerejnaFotka[]>([]); // bod 254: vybrané verejné fotky (server ich uloží k nám pri Pridať)
  const [uklada, setUklada] = useState(false);
  const [chybaUl, setChybaUl] = useState("");
  const [plne, setPlne] = useState(false);
  const spolu = vyb.length + vybV.length;
  const uz = useMemo(() => new Set(vybrane), [vybrane]);
  const [uzke, setUzke] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onZavri(); } };
    const rs = () => setUzke(window.innerWidth < 700);
    window.addEventListener("keydown", esc, true); window.addEventListener("resize", rs);
    return () => { window.removeEventListener("keydown", esc, true); window.removeEventListener("resize", rs); };
  }, [onZavri]);
  const tukni = (src: string) => {
    if (uz.has(src)) return;
    if (vyb.includes(src)) { setVyb(vyb.filter((x) => x !== src)); setPlne(false); return; }
    if (spolu >= zostava) { setPlne(true); return; }
    setVyb([...vyb, src]);
  };
  const tukniV = (f: VerejnaFotka) => {
    const k = klucFotky(f);
    if (vybV.some((x) => klucFotky(x) === k)) { setVybV(vybV.filter((x) => klucFotky(x) !== k)); setPlne(false); return; }
    if (spolu >= zostava) { setPlne(true); return; }
    setVybV([...vybV, f]);
  };
  // Pridať: verejné fotky najprv uloží server k nám (Unsplash ostane ich adresa); verejná = ilustračná (jeVerejnaFotka)
  const pridaj = async () => {
    setUklada(true); setChybaUl("");
    try {
      const ulozene: string[] = [];
      for (const f of vybV) ulozene.push((await ulozFotku(f)).url);
      ulozene.forEach((u) => verejneVybrane.add(u));
      onVyber([...vyb, ...ulozene]);
    } catch (e) { setChybaUl((e as Error).message); setUklada(false); }
  };
  const tl: CSSProperties = { height: 52, padding: "0 20px", borderRadius: 14, border: "none", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" };
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Vybrať fotku" onClick={onZavri} className="sc-tokeny"
      style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", position: "fixed", inset: 0, zIndex: 1400, background: "rgba(20,18,14,.55)", display: "flex", alignItems: uzke ? "flex-end" : "center", justifyContent: "center", padding: uzke ? 0 : 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: uzke ? "100%" : "min(760px, 100%)", maxHeight: uzke ? "90vh" : "86vh", background: "var(--card)", color: "var(--ink)", borderRadius: uzke ? "22px 22px 0 0" : 22, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 18px 50px rgba(0,0,0,.25)" }}>
        <div style={{ padding: "18px 20px 10px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <b style={{ fontSize: 18 }}>Vybrať fotku</b>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink3)" }}>Ťuknite na fotky, ktoré chcete pridať. Môžete aj viac naraz, najviac {fotiek(zostava)}.</span>
          </div>
          <button type="button" onClick={onZavri} aria-label="Zavrieť" style={{ flex: "none", width: 44, height: 44, borderRadius: "50%", border: "none", background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <div role="tablist" aria-label="Odkiaľ fotky" style={{ display: "flex", gap: 4, margin: "4px 20px 8px", padding: 4, borderRadius: 14, background: "var(--btn)" }}>
          {([...(zdroj ? [["moje", "Moje fotky"]] : []), ["verejne", "Verejné fotky"]] as [("moje" | "verejne"), string][]).map(([k, t]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ flex: 1, minHeight: 44, border: "none", borderRadius: 11, background: tab === k ? "var(--card)" : "transparent", color: tab === k ? "var(--ink)" : "var(--ink3)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>{t}</button>))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 20px 16px" }}>
          {tab === "verejne" ? <PanelVerejnychFotiek uzke={uzke} vyb={vybV.map(klucFotky)} onTukni={tukniV} /> : fotky.length === 0
            ? <p style={{ margin: "18px 0", fontSize: 15, lineHeight: 1.5, color: "var(--ink2)" }}>{zdroj?.prazdne}</p>
            : <div style={{ display: "grid", gridTemplateColumns: `repeat(${uzke ? 3 : 4}, minmax(0,1fr))`, gap: 8 }}>
              {fotky.map((src, i) => {
                const n = vyb.indexOf(src), pridana = uz.has(src);
                return (
                  <button key={src} type="button" onClick={() => tukni(src)} aria-pressed={n >= 0} disabled={pridana} aria-label={pridana ? `Fotka ${i + 1}, už je pridaná` : `Fotka ${i + 1}`}
                    style={{ position: "relative", aspectRatio: "1 / 1", padding: 0, border: "none", borderRadius: 12, overflow: "hidden", background: "#1D211B", cursor: pridana ? "default" : "pointer", boxShadow: n >= 0 ? "0 0 0 3px var(--green)" : "none" }}>
                    <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: pridana ? 0.4 : n >= 0 ? 0.85 : 1 }} />
                    {n >= 0 && <span style={{ position: "absolute", right: 6, top: 6, width: 28, height: 28, borderRadius: "50%", background: "var(--green)", color: "#fff", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n + 1}</span>}
                    {pridana && <span style={{ position: "absolute", left: 6, bottom: 6, height: 22, padding: "0 8px", borderRadius: 11, background: "rgba(20,18,14,.7)", color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center" }}>Už pridaná</span>}
                  </button>);
              })}
            </div>}
          {chybaUl && <p role="alert" style={{ margin: "12px 0 0", fontSize: 13.5, fontWeight: 700, color: "#A34A2A" }}>{chybaUl}</p>}
          {plne && <p role="alert" style={{ margin: "12px 0 0", fontSize: 13.5, fontWeight: 700, color: "#A34A2A" }}>Viac sa nezmestí. Najprv zrušte inú vybranú fotku.</p>}
        </div>
        <div style={{ padding: "12px 20px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--cardBd)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onZavri} style={{ ...tl, background: "var(--btn)", color: "var(--ink)" }}>Zrušiť</button>
          <button type="button" onClick={() => void pridaj()} disabled={!spolu || uklada} style={{ ...tl, flex: uzke ? 1 : undefined, background: "var(--green)", color: "#fff", opacity: spolu && !uklada ? 1 : 0.45, cursor: spolu && !uklada ? "pointer" : "default" }}>{uklada ? "Ukladám…" : spolu ? `Pridať ${fotiek(spolu)}` : "Pridať"}</button>
        </div>
      </div>
    </div>, document.body);
}

/** OPRAVY 254: vybratá fotka z okna Vybrať fotku → súbor, ide tou istou cestou ako nahratá (výrez, kontrola rozmerov) */
export async function fotkaNaSubor(src: string): Promise<File> {
  const b = await (await fetch(src)).blob();
  return new File([b], "fotka.jpg", { type: b.type || "image/jpeg" });
}
