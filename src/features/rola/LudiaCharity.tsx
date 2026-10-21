// ============================================================
// OPRAVY 404 · Ľudia v správe charity (prototyp „Ludia charity - pracovnici.dc.html“).
// Štatutár smie všetko. Pracovníkom vyberie, čo smú: Všetko okrem peňazí · Len obsah · Vybrať sám (8 prepínačov).
// Pozvaný dostane oznámenie v appke (0125), práva má až po Prijať. Server stráži práva podľa zoznamu (0129).
// Úložisko: nastavenia_stranky, kľúč „ludia“ (ako Ľudia farnosti) — riadok { id, n, k: e-mail, r: "Pracovník", caka, p, prava }.
// Pracovník s právom „Pridávať pracovníkov“ mení ostatných pracovníkov, nie seba (0129 ludia_zmena_citliva).
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { citajNastavenie, maNastavenie, zapisNastavenie, useZmenyNastaveni } from "@/lib/nastaveniaStranky";
import { PRAVA, PREDVOLBY, PRACOVNIK, predvolbaZ, smieText, useMojEmail, useMojePrava, type Pravo, type Predvolba } from "@/lib/pravaPracovnika";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";
import { KartaNastavenia, IK_PRIDAT_CLOVEKA } from "@/features/rola/KartaNastavenia";

type Caka = boolean | "odkaz" | "odmietol";
type Clovek = { id: number; n?: string; k: string; r: string; caka?: Caka; p?: string; prava?: Pravo[] };

const ZELENA = "#4B7A35", CERV = "#A34A2A";
const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const pole: CSSProperties = { height: 52, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15.5, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const kick: CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", paddingTop: 4 };
const hlaskaSt: CSSProperties = { display: "block", padding: "10px 12px", borderRadius: 12, background: "var(--gSoft)", border: `1.5px solid ${ZELENA}`, fontSize: 14, fontWeight: 700, color: "var(--gInk)" };
const odkazSt: CSSProperties = { alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", color: ZELENA, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };
const okMail = (m: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.trim());

export function LudiaCharity({ mobil }: { mobil: boolean }) {
  useZmenyNastaveni();
  const mojeP = useMojePrava(), mojMail = useMojEmail();
  const jaStatutar = mojeP === null, smiemPridavat = jaStatutar || mojeP.includes("pridavat");
  const L = (maNastavenie("ludia") ? citajNastavenie("ludia") : []) as Clovek[];
  const ulozL = (a: Clovek[]) => zapisNastavenie("ludia", a);
  const prac = L.filter((x) => x.r === PRACOVNIK);

  const [form, setForm] = useState<null | "nove" | number>(null);
  const [mail, setMail] = useState("");
  const [popis, setPopis] = useState("");
  const [pred, setPred] = useState<Predvolba | null>(null);
  const [prava, setPrava] = useState<Pravo[]>([]);
  const [hl, setHl] = useState<{ id: string; t: string } | null>(null);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const hlas = (id: string, t: string) => { window.clearTimeout(tm.current); setHl({ id, t }); tm.current = window.setTimeout(() => setHl(null), 3500); };

  const jeVy = (x: Clovek) => !!mojMail && (x.k ?? "").trim().toLowerCase() === mojMail;
  const otvorNovy = () => { setForm("nove"); setMail(""); setPopis(""); setPred(null); setPrava([]); setHl(null); };
  const otvorUpr = (x: Clovek) => { const p = x.prava ?? []; setForm(x.id); setPopis(x.p ?? ""); setPred(predvolbaZ(p)); setPrava([...p]); setHl(null); };
  const upr = typeof form === "number" ? prac.find((y) => y.id === form) : undefined;
  const jeNovy = form === "nove";

  const potvrd = () => {
    if (jeNovy) {
      if (!okMail(mail) || !pred) return;
      const m = mail.trim().toLowerCase();
      if (L.some((y) => (y.k ?? "").trim().toLowerCase() === m)) { hlas("form", "Tento e-mail už je v zozname"); return; }
      const id = Date.now();
      ulozL([...L, { id, n: "", k: m, r: PRACOVNIK, caka: true, p: popis.trim() || undefined, prava }]);
      setForm(null);
      hlas(String(id), "Pozvaný ✓ Príde mu oznámenie v appke. Keď ťukne Prijať, môže začať.");
    } else if (upr) {
      ulozL(L.map((y) => (y.id === upr.id ? { ...y, p: popis.trim() || undefined, prava } : y)));
      setForm(null);
      hlas(String(upr.id), `Uložené ✓ ${smieText(prava)}`);
    }
  };
  const odober = () => { if (!upr) return; ulozL(L.filter((y) => y.id !== upr.id)); setForm(null); hlas("zoz", `Odobratý ✓ ${upr.n || upr.k}`); };
  const pozvatZnova = () => { if (!upr) return; ulozL(L.map((y) => (y.id === upr.id ? { ...y, caka: true } : y))); setForm(null); hlas(String(upr.id), "Pozvaný znova ✓ Príde mu oznámenie v appke."); };

  const sirka: CSSProperties = { maxWidth: 560, width: "100%", display: "flex", flexDirection: "column", gap: 14, alignSelf: mobil ? "stretch" : "flex-start" };

  // ---------- formulár: pridať pracovníka / čo smie ----------
  if (form !== null && (jeNovy || upr)) {
    const okM = okMail(mail), ok = jeNovy ? okM && !!pred : true;
    const potvrdT = jeNovy ? (!okM ? "Najprv napíšte jeho e-mail" : !pred ? "Vyberte, čo smie" : `Pozvať · ${smieText(prava)}`) : "Uložiť";
    return (
      <div style={sirka}>
        <button type="button" onClick={() => setForm(null)} style={odkazSt}>‹ Späť na zoznam</button>
        <span style={{ fontSize: 24, fontWeight: 800 }}>{jeNovy ? "Pridať pracovníka" : "Čo smie"}</span>
        <div style={{ ...karta, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {jeNovy && <>
            <span style={{ fontSize: 16, fontWeight: 800 }}>1. Kto to je</span>
            <input value={mail} onChange={(e) => setMail(e.target.value.slice(0, 80))} type="email" placeholder="jeho e-mail v DEED+" aria-label="E-mail" style={pole} />
          </>}
          {upr && <span style={{ fontSize: 16, fontWeight: 800, overflowWrap: "anywhere" }}>{(upr.n || upr.k) + (upr.p ? ` · ${upr.p}` : "")}</span>}
          <input value={popis} onChange={(e) => setPopis(e.target.value.slice(0, 40))} placeholder="Popis, napr. referentka, účtovníčka (nepovinné)" aria-label="Popis" style={pole} />
          <span style={{ fontSize: 16, fontWeight: 800, paddingTop: 4 }}>{jeNovy ? "2. Čo smie" : "Čo smie"}</span>
          <div role="radiogroup" aria-label="Čo smie" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PREDVOLBY.map(([k, t, s, set]) => { const on = pred === k; return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => { setPred(k); if (k !== "vlastne") setPrava([...set]); }}
                style={{ minHeight: 60, padding: "10px 14px", borderRadius: 14, border: on ? `2px solid ${ZELENA}` : "1.5px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
                <span aria-hidden="true" style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", border: on ? "none" : "2px solid #B8B1A3", background: on ? ZELENA : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{on ? "✓" : ""}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>{t}</b><span style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--ink2)" }}>{s}</span></span>
              </button>); })}
          </div>
          {pred === "vlastne" && <div style={{ borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--field)", padding: "2px 14px" }}>
            {PRAVA.map(([k, t, s], i) => { const on = prava.includes(k); return (
              <button key={k} type="button" role="switch" aria-checked={on} onClick={() => setPrava((a) => (on ? a.filter((x) => x !== k) : [...a, k]))}
                style={{ width: "100%", minHeight: 56, padding: "8px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span></span>
                <span aria-hidden="true" style={{ width: 50, height: 30, flex: "none", borderRadius: 15, background: on ? ZELENA : "#CFC8BA", position: "relative", transition: "background .2s" }}>
                  <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transform: on ? "translateX(20px)" : "none", transition: "transform .2s" }} /></span>
              </button>); })}
          </div>}
          <button type="button" onClick={potvrd} aria-disabled={!ok}
            style={{ minHeight: 56, borderRadius: 14, border: "none", background: ok ? ZELENA : "var(--btn)", color: ok ? "#fff" : "var(--ink2)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: ok ? "pointer" : "default", boxShadow: "none" }}>{potvrdT}</button>
          {hl?.id === "form" && <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: CERV }}>{hl.t}</span>}
          {jeNovy && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Príde mu oznámenie v appke. Keď ťukne Prijať, uvidí len to, čo ste mu zapli. Zmeniť to môžete kedykoľvek.</span>}
          {upr?.caka === "odmietol" && <button type="button" onClick={pozvatZnova} style={{ minHeight: 48, borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Pozvať znova</button>}
          {upr && <DrzTlacidlo ms={1200} onHotovo={odober} styl={{ minHeight: 48, borderRadius: 12, border: `1.5px solid ${CERV}`, background: "transparent", color: CERV, fontSize: 15, fontWeight: 800 }}>
            {upr.caka && upr.caka !== "odmietol" ? "Podržte · zrušiť pozvánku" : "Podržte · odobrať"}</DrzTlacidlo>}
        </div>
      </div>);
  }

  // ---------- zoznam ----------
  type Riadok = { id: string; n: string; ini: string; sub: string; stitok?: string; zly?: boolean; ty?: boolean; x?: Clovek };
  const riadky: Riadok[] = [
    ...(jaStatutar ? [{ id: "ja", n: "Vy", ini: "V", sub: "Štatutár · smie všetko", ty: true }] : []),
    ...prac.map((x): Riadok => ({ id: String(x.id), n: (x.n || x.k) + (jeVy(x) ? " · vy" : ""), ini: (x.n || x.k || "?").trim().charAt(0).toUpperCase() || "?",
      sub: (x.p ? `${x.p} · ` : "") + smieText(x.prava ?? []), x,
      stitok: x.caka === "odmietol" ? "Odmietol" : x.caka ? "Pozvaný · čaká" : undefined, zly: x.caka === "odmietol" })),
  ];
  return (
    <div style={sirka}>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Štatutár smie všetko. Pracovníkom vyberiete, čo smú. Ostatné uvidia zamknuté.</span>
      <span style={kick}>KTO SPRAVUJE STRÁNKU</span>
      <div style={{ ...karta, padding: "4px 16px" }}>
        {riadky.map((s, i) => {
          const mozem = smiemPridavat && !!s.x && !jeVy(s.x);
          return (
            <div key={s.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
                <span aria-hidden="true" style={{ width: 44, height: 44, flex: "none", borderRadius: "50%", background: s.ty ? "var(--gSoft)" : "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>{s.ini}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><b style={{ fontSize: 16, overflowWrap: "anywhere" }}>{s.n}</b>
                    {s.stitok && <span style={{ padding: "2px 8px", borderRadius: 8, background: s.zly ? "#F6E3DC" : "var(--warnBg, #F3EEDF)", border: `1px solid ${s.zly ? CERV : "#C9A24A"}`, fontSize: 12, fontWeight: 800, color: s.zly ? CERV : "var(--gold, #6B5418)" }}>{s.stitok}</span>}</span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{s.sub}</span>
                </span>
                {mozem && <button type="button" onClick={() => otvorUpr(s.x!)} style={{ flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)", cursor: "pointer", boxShadow: "none" }}>Upraviť ›</button>}
              </div>
              {hl?.id === s.id && <span role="status" style={{ ...hlaskaSt, marginBottom: 12 }}>{hl.t}</span>}
            </div>);
        })}
      </div>
      {hl?.id === "zoz" && <span role="status" style={hlaskaSt}>{hl.t}</span>}
      {smiemPridavat && <KartaNastavenia nadpis="Pridať človeka do správy" stav="Nemusíte. Stránku zvládnete spravovať aj sám." tlacidlo="Pridať" ikona={IK_PRIDAT_CLOVEKA} mobil={mobil} onClick={otvorNovy} />}
      {smiemPridavat && <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Štatutár musí ostať aspoň jeden. Pri zmene štatutára dajte rolu nástupcovi, potom sa môžete odobrať. Odobrať treba podržať.</span>}
    </div>);
}

/** počet ľudí v správe charity (štatutár + pracovníci) — riadok v Nastaveniach */
export const pocetLudiCharity = () => 1 + ((maNastavenie("ludia") ? citajNastavenie("ludia") : []) as Clovek[]).filter((x) => x.r === PRACOVNIK).length;
