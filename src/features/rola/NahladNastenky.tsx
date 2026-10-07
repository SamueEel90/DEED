// ============================================================
// KARTA 56H §6 — „Pozrieť celú verejnú stránku ›" (Správa farnosti → Oznamy).
// Náhľad Nástenky cez Správu: hlavička (logo alebo iniciály, názov) · PRÍĎ (udalosti s fotkou alebo plagátom,
// dátum, text, Zúčastním sa / Prihlásiť sa) · Oznamy farnosti (dátum, štítok, zmena omše červeno ako ZMENA PROGRAMU)
// · Sväté omše (tento týždeň, dnes zvýraznený) · Farský úrad (adresa, telefóny, e-maily z uloženého Upraviť profil).
// Ukazuje sa len to, čo farár zverejnil. Iné vzhľady (Kronika, Moderné) neskôr.
// Celá obrazovka (PC, tablet, mobil): prekryje aj lištu appky, pevný pruh hore „‹ Späť do Správy",
// Späť aj Esc vráti presne tam, odkiaľ sa otvoril (aj posun). Len na pozretie — nič sa tu nedá zmeniť.
// ============================================================
import { useEffect, useLayoutEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { ProfilStranky } from "@/lib/profilStranky";
import { useKalendar, kostolKal, iso, DNI_K, dniTyzdna, omseDna, polozkyDna, druhPolozky, minuty } from "@/lib/kalendarFarnosti";
import { vlastnePrispevky, type VieraFeedItem } from "@/features/viera/mock";
import { stitokOznamu } from "./OmseKalendar";

const INK = "#1D211B", INK2 = "#4A4C43", INK3 = "#5B5D53", LINKA = "#CFC8BA", ZELENA = "#4B7A35", CERVENA = "#8E3B2F";
const nadpisSekcie: CSSProperties = { fontSize: 14, fontWeight: 800, letterSpacing: ".12em", color: INK3 };
const iniciy = (m: string) => m.split(/\s+/).filter((w) => w.length > 1).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "F";
const DNI = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];
const datumUd = (x: VieraFeedItem) => {
  if (!x.datum) return "";
  const [y, m, d] = x.datum.split("-").map(Number); const dt = new Date(y, m - 1, d);
  return [`${DNI[dt.getDay()]} ${d}. ${m}.`, x.udalost?.cas, x.udalost?.miesto].filter(Boolean).join(" · ").toLocaleUpperCase("sk-SK");
};
const dnesIso = () => iso(new Date());

export function NahladNastenky({ strankaId, meno, profil, mobil, onSpat }: { strankaId: string; meno: string; profil: ProfilStranky | null; mobil: boolean; onSpat: () => void }) {
  const kal = useKalendar(strankaId);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onSpat(); };
    window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
  }, [onSpat]);
  // pod náhľadom sa nič nehýbe; po zatvorení sa vráti posun stránky aj fokus na tlačidlo, ktoré náhľad otvorilo
  useLayoutEffect(() => {
    const spat = document.activeElement as HTMLElement | null;
    const posuny: [Element, number][] = [];
    for (let e: Element | null = spat; e; e = e.parentElement) if (e.scrollTop) posuny.push([e, e.scrollTop]);
    if (document.scrollingElement) posuny.push([document.scrollingElement, document.scrollingElement.scrollTop]);
    const ov = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ov; posuny.forEach(([e, t]) => { e.scrollTop = t; }); spat?.focus?.({ preventScroll: true }); };
  }, []);
  const zoznam = vlastnePrispevky(strankaId);
  const udalosti = zoznam.filter((x) => x.ntyp === "udalost");
  const ine = zoznam.filter((x) => x.ntyp !== "udalost");
  const dnes = dnesIso();
  // len omše (z rozvrhu bez zrušených + omše pridané v úprave dňa), podľa „Čo uvidia ľudia"
  const kk = kostolKal(strankaId), VJ = kal.verejne;
  const omse = dniTyzdna(0).map((d, i) => {
    const casy = VJ.omse ? [...omseDna(kk, d).filter((o) => !o.zrusena).map((o) => o.t), ...polozkyDna(kk, d).filter((p) => druhPolozky(p.typ).kat === "omse").map((p) => p.t)] : [];
    return { key: iso(d), k: `${DNI_K[i]} ${d.getDate()}.`, dnes: iso(d) === dnes, casy: casy.sort((a, b) => minuty(a) - minuty(b)).join(", ") || "—" };
  });
  const k = profil?.kontakt;
  const kontakt = k ? [k.adresaVerejna.trim() || k.sidlo.trim(), ...k.telefony.map((t) => t.cislo.trim()), ...k.emaily.map((e) => e.adresa.trim())].filter(Boolean) : [];
  const pad = mobil ? "24px 18px" : "36px 56px";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Verejná stránka" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#14110B", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: mobil ? "10px 12px" : "12px 24px", background: "#14110B", borderBottom: "1px solid #2E2A22" }}>
        <button type="button" onClick={onSpat} autoFocus style={{ flex: "none", minHeight: 48, padding: "0 18px", border: "none", borderRadius: 12, background: ZELENA, cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff", boxShadow: "none" }}>‹ Späť do Správy</button>
        <span style={{ minWidth: 0, fontSize: 14, fontWeight: 700, color: "#E8E1D3" }}>Takto vašu stránku vidia farníci</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: mobil ? 0 : 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ background: "#F4F1EA", color: INK, borderRadius: mobil ? 0 : 16, overflow: "hidden", fontFamily: "'Plus Jakarta Sans',-apple-system,'Segoe UI',sans-serif" }}>
          <div style={{ padding: mobil ? "28px 18px 20px" : "40px 56px 28px", display: "flex", alignItems: "center", gap: 18, borderBottom: `1px solid ${LINKA}` }}>
            {profil?.logo
              ? <img src={profil.logo} alt="" style={{ width: 72, height: 72, flex: "none", borderRadius: profil.tvar === "kruh" ? "50%" : 18, objectFit: "cover", background: "#fff" }} />
              : <span style={{ width: 72, height: 72, flex: "none", borderRadius: 18, background: "#E4DFD5", color: ZELENA, fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{(profil?.bezLoga && profil.inicialy?.trim().toUpperCase()) || iniciy(meno)}</span>}
            <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <b style={{ fontSize: mobil ? 28 : 38, lineHeight: 1.05, letterSpacing: "-.02em" }}>{meno}</b>
              <span style={{ fontSize: 16, color: INK3 }}>Farnosť</span>
            </span>
          </div>

          {udalosti.length > 0 && (
            <div style={{ padding: pad, display: "flex", flexDirection: "column", gap: 18, borderBottom: `1px solid ${LINKA}` }}>
              <span style={nadpisSekcie}>PRÍĎ</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(320px,100%),1fr))", gap: 16 }}>
                {udalosti.map((u) => { const f = u.fotky?.[0]; const text = u.udalost ? u.udalost.text : u.popis; return (
                  <div key={u.id} style={{ borderRadius: 20, overflow: "hidden", background: "#FBF9F4", border: `1px solid ${LINKA}`, display: "flex", flexDirection: "column" }}>
                    {f && u.plagat
                      ? <img src={f} alt="Plagát" style={{ display: "block", width: "100%", height: "auto", maxHeight: 640, objectFit: "contain", background: "#E4DFD5" }} />
                      : <div role={f ? "img" : undefined} aria-label={f ? "Fotka" : undefined} style={{ aspectRatio: "16 / 9", background: f ? `url('${f}') center/cover no-repeat #E4DFD5` : "#E4DFD5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {!f && <span style={{ width: 64, height: 64, borderRadius: 16, background: "#fff", color: ZELENA, fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{iniciy(meno)}</span>}
                      </div>}
                    <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".08em", color: "#8A6A1F" }}>{datumUd(u)}</span>
                      <b style={{ fontSize: 20, lineHeight: 1.25 }}>{u.nazov}</b>
                      {text && <span style={{ fontSize: 16, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line" }}>{text}</span>}
                      {u.rsvp && <span style={{ alignSelf: "flex-start", marginTop: 6, minHeight: 46, padding: "0 18px", borderRadius: 12, background: ZELENA, color: "#fff", fontSize: 15.5, fontWeight: 800, display: "flex", alignItems: "center" }}>{u.udalost?.zavazne ? "Prihlásiť sa" : "Zúčastním sa"}</span>}
                    </div>
                  </div>); })}
              </div>
            </div>)}

          <div style={{ padding: mobil ? "28px 18px 36px" : "40px 56px 56px", borderTop: `4px solid ${INK}`, display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)", gap: mobil ? 32 : 40, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={nadpisSekcie}>OZNAMY FARNOSTI</span>
              {ine.map((x) => { const st = stitokOznamu(x), zm = st === "ZMENA OMŠE", d = new Date(x.vytvorene ?? 0); const text = x.ntyp === "oznam" && !x.ukat && x.tag === "Oznam" ? x.popis : ""; return (
                <div key={x.id} style={{ display: "flex", gap: 16, padding: "14px 0", borderTop: `1px solid ${LINKA}` }}>
                  <span style={{ width: 80, flex: "none", fontSize: 16, fontWeight: 800, color: zm ? CERVENA : INK }}>{d.getDate()}. {d.getMonth() + 1}.</span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: ".12em", color: zm ? CERVENA : INK3 }}>{zm ? "ZMENA PROGRAMU" : st}</span>
                    <b style={{ fontSize: 18 }}>{x.nazov}</b>
                    {text && <span style={{ fontSize: 16.5, lineHeight: 1.5, color: INK2, whiteSpace: "pre-line" }}>{text}</span>}
                  </span>
                </div>); })}
              {!ine.length && <span style={{ padding: "14px 0", borderTop: `1px solid ${LINKA}`, fontSize: 16, color: INK3 }}>Zatiaľ žiadne oznamy.</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={nadpisSekcie}>SVÄTÉ OMŠE</span>
              <div style={{ display: "flex", flexDirection: "column", fontSize: 16.5 }}>
                {omse.map((d) => (
                  <span key={d.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", margin: "1px -12px", borderRadius: 10, background: d.dnes ? "#14110B" : "transparent", color: d.dnes ? "#fff" : INK }}>
                    <span>{d.k}{d.dnes ? " · dnes" : ""}</span>
                    <b style={{ textAlign: "right" }}>{d.casy}</b>
                  </span>))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={nadpisSekcie}>FARSKÝ ÚRAD</span>
              <span style={{ fontSize: 16.5, lineHeight: 1.6, color: INK2 }}>{kontakt.length ? kontakt.join(" · ") : "Adresu a kontakt doplníte v Upraviť profil."}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body);
}
