// ============================================================
// OPRAVY 320 · Vecná zbierka na stránke farnosti: (E) detail · (D) darca naskenoval QR → „Darovali ste?“ ·
// (D2) poďakovanie od organizátora na tom istom mieste. Bez platobného modulu. Bez prihlásenia sa zapísať nedá.
// ============================================================
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FormatovanyText } from "@/components/formattext";
import { ChybaPriTlacidle } from "@/components/ChybaPriTlacidle";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { usePouzivatel } from "@/lib/pouzivatel";
import { nacitajPredvolbu, ulozPredvolbu, useSektorDarcu, volbaBezMena, relCas, type VerziaIdentity } from "@/lib/darcovia";
import { volbyMena } from "@/features/zbierka/Platba";
import { useZamokVrstvy } from "@/lib/zamokVrstvy";
import { TlZbalit } from "./zbalit";
import { cistyText } from "@/features/rola/obsahZbierky";
import { fotoVecnej, doKedyText, usePrehladDarov, zapisDar, type VecnaZbierka } from "@/lib/vecnaZbierka";

const INK = "var(--nf-ink)", INK2 = "var(--nf-ink2)", INK3 = "var(--nf-ink3)", KARTA = "var(--nf-karta)", PAPIER = "var(--nf-papier)", LINKA = "var(--nf-linka)";
const ZLATA_STITOK = "#E2C27A", ZELENA_TL = "#4B7A35";
export const STITOK_VECNEJ = "VECNÁ ZBIERKA";
const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const ludiT = (n: number) => `${n} ${n === 1 ? "človek daroval" : n < 5 ? "ľudia darovali" : "ľudí darovalo"}`;
export interface Organizator { meno: string; logo: string | null; inicialy: string }

function Okno({ label, onZavri, spatText = "‹ Späť na stránku farnosti", children }: { label: string; onZavri: () => void; spatText?: string; children: ReactNode }) {
  useZamokVrstvy();
  return createPortal(<div role="dialog" aria-modal="true" aria-label={label} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--nf-bg)", color: INK, overflowY: "auto", overscrollBehavior: "contain", padding: "calc(12px + env(safe-area-inset-top, 0px)) 12px 32px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
    <div style={{ width: "100%", maxWidth: 560 }}><button type="button" autoFocus onClick={onZavri} style={{ minHeight: 48, padding: "0 18px", border: "none", borderRadius: 14, background: ZELENA_TL, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800 }}>{spatText}</button></div>
    <div style={{ width: "100%", maxWidth: 560, borderRadius: 24, background: PAPIER, border: `1px solid ${LINKA}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>{children}</div>
  </div>, document.body);
}
function Logo({ o, s }: { o: Organizator; s: number }) {
  return o.logo ? <span aria-hidden="true" style={{ flex: "none", width: s, height: s, borderRadius: 10, background: `url("${o.logo}") center/cover no-repeat #fff` }} />
    : <span aria-hidden="true" style={{ flex: "none", width: s, height: s, borderRadius: 10, background: "#E9E2D2", color: "#5A4E36", fontSize: s * 0.36, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{o.inicialy}</span>;
}
function Hlava({ z }: { z: VecnaZbierka }) {
  const f = fotoVecnej(z);
  return <div style={{ position: "relative", height: f ? 190 : 64, flex: "none", background: f ? `url("${f}") center/cover no-repeat #2B2620` : KARTA }}>
    <span style={{ position: "absolute", left: 16, bottom: 12, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", background: ZLATA_STITOK, color: "#14110B", padding: "4px 10px", borderRadius: 8 }}>{z.stav === "aktivna" ? STITOK_VECNEJ : `${STITOK_VECNEJ} · UKONČENÁ`}</span>
  </div>;
}

/** (E) detail vecnej zbierky na stránke */
export function VecnaDetail({ strankaId, z, onZavri }: { strankaId: string; z: VecnaZbierka; onZavri: () => void }) {
  const pr = usePrehladDarov(strankaId, z);
  const [viac, setViac] = useState(false), [vsetci, setVsetci] = useState(false), [dakViac, setDakViac] = useState(false);
  const riadok = [z.co, z.kde, z.doKedy ? `do ${doKedyText(z.doKedy, false)}` : "", z.organizuje ? `organizuje ${z.organizuje}` : ""].filter(Boolean).join(" · ");
  const ukaz = z.ukazHodnotu && pr.spolu != null && pr.spolu > 0;
  const pct = ukaz && z.ciel ? Math.min(100, Math.round((pr.spolu! / z.ciel) * 100)) : 0;
  const dak = z.stav === "ukoncena" && z.podakovanie?.ulozene && !z.podakovanie.zmazane ? z.podakovanie : null;
  const darcovia = vsetci ? pr.darcovia : pr.darcovia.slice(0, 5);
  return <Okno label={z.nazov} onZavri={onZavri}>
    <Hlava z={z} />
    <div data-zbal="" style={{ padding: "18px 18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      <b style={{ fontSize: 23, lineHeight: 1.2, overflowWrap: "anywhere" }}>{z.nazov}</b>
      {riadok && <span style={{ fontSize: 15, lineHeight: 1.45, color: INK2 }}>{riadok}</span>}
      {dak && <div style={{ padding: "14px 16px", borderRadius: 16, background: "var(--nf-gSoft)", border: "1.5px solid var(--nf-gBd)", display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--nf-gInk)" }}>ĎAKUJEME</span>
        <FormatovanyText text={dak.popis} style={{ fontSize: 16, lineHeight: 1.55 }} />
        {cistyText(dak.popis2) && (dakViac ? <><FormatovanyText text={dak.popis2} style={{ fontSize: 16, lineHeight: 1.55 }} /><TlZbalit onZbal={() => setDakViac(false)} /></>
          : <button type="button" onClick={() => setDakViac(true)} aria-expanded={false} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "var(--nf-gInk)" }}>… viac</button>)}
        {dak.media.filter((m) => m.typ === "foto").length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 6 }}>{dak.media.filter((m) => m.typ === "foto").slice(0, 8).map((m) => <img key={m.id} src={m.src} alt={m.popis ?? ""} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, display: "block" }} />)}</div>}
      </div>}
      <FormatovanyText text={z.popis} style={{ fontSize: 16.5, lineHeight: 1.55, color: INK }} />
      {cistyText(z.popis2) && (viac ? <><FormatovanyText text={z.popis2} style={{ fontSize: 16.5, lineHeight: 1.55, color: INK }} /><TlZbalit onZbal={() => setViac(false)} /></>
        : <button type="button" onClick={() => setViac(true)} aria-expanded={false} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "var(--nf-gInk)" }}>… viac</button>)}
      {/* OPRAVY 247: bez darcov sa súhrn ani zoznam neukáže */}
      {pr.pocet > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ukaz && <span style={{ fontSize: 22, fontWeight: 800 }}>asi {eur(pr.spolu!)}{z.ciel ? <span style={{ fontSize: 16, fontWeight: 700, color: INK3 }}> z {eur(z.ciel)}</span> : null}</span>}
        {ukaz && z.ciel ? <span role="img" aria-label={`${pct} % z cieľa`} style={{ display: "block", height: 10, borderRadius: 5, background: KARTA, overflow: "hidden" }}><span style={{ display: "block", width: `${pct}%`, height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#C9A24A,#E2C27A)" }} /></span> : null}
        <span style={{ fontSize: 15.5, fontWeight: 700, color: INK2 }}>{ludiT(pr.ludi)}</span>
      </div>}
      {z.stav === "aktivna" && <span style={{ fontSize: 15, lineHeight: 1.5, color: INK2, padding: "12px 14px", borderRadius: 14, background: KARTA }}>Darujete? Vec vhoďte do krabice a naskenujte QR na plagáte.</span>}
      {pr.pocet > 0 && <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: INK3, paddingBottom: 4 }}>DARCOVIA · {pr.ludi}</span>
        {darcovia.map((d, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 46, borderTop: i ? `1px solid ${LINKA}` : "none" }}>
          <b style={{ flex: 1, minWidth: 0, fontSize: 15.5, overflowWrap: "anywhere" }}>{d.meno}</b>
          {d.hodnota != null && <span style={{ fontSize: 15, fontWeight: 800 }}>{eur(d.hodnota)}</span>}
          <span style={{ fontSize: 13.5, color: INK3 }}>{relCas(d.cas)}</span></div>)}
        {pr.darcovia.length > 5 && (vsetci ? <TlZbalit onZbal={() => setVsetci(false)} />
          : <button type="button" onClick={() => setVsetci(true)} aria-expanded={false} style={{ alignSelf: "flex-start", minHeight: 48, padding: "0 16px", marginTop: 6, borderRadius: 14, border: `1.5px solid ${LINKA}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: INK }}>Všetci darcovia ({pr.darcovia.length}) ›</button>)}
      </div>}
    </div>
  </Okno>;
}

/** (D) darca naskenoval QR · (D2) poďakovanie od organizátora na tom istom mieste */
export function VecnaDarca({ strankaId, z, org, onZavri, onPozriet, onPrihlasit }: { strankaId: string; z: VecnaZbierka; org: Organizator; onZavri: () => void; onPozriet: () => void; /** OPRAVY 320 doplnok: neprihlásený → prihlásenie, potom späť na zápis */ onPrihlasit: () => void }) {
  const ja = usePouzivatel(), sektor = useSektorDarcu(), reg = ja.typ !== "pasivny";
  const moznosti = useMemo(() => volbyMena(ja, volbaBezMena(sektor)), [ja, sektor]);
  const [volba, setVolba] = useState(nacitajPredvolbu);
  const [menit, setMenit] = useState(false);
  const meno = moznosti.find(([v]) => v === volba.verzia)?.[1] ?? volbaBezMena(sektor);
  const [hod, setHod] = useState<number | "ina" | null>(null);
  const [ina, setIna] = useState("");
  const [uklada, setUklada] = useState(false), [chyba, setChyba] = useState(""), [hotovo, setHotovo] = useState(false);
  const hodnota = hod === "ina" ? (Number(ina.replace(",", ".")) || null) : hod;
  const vyber = (v: VerziaIdentity) => { const n = { ...volba, verzia: v }; setVolba(n); ulozPredvolbu(n); setMenit(false); };
  const zapis = async () => {
    if (uklada) return; setUklada(true); setChyba("");
    const e = await zapisDar(strankaId, z, meno, z.ukazHodnotu ? hodnota : null);
    setUklada(false);
    if (e) setChyba(e); else setHotovo(true);
  };
  const chip = (on: boolean): CSSProperties => ({ minHeight: 52, borderRadius: 12, border: on ? "none" : `1.5px solid ${LINKA}`, background: on ? ZELENA_TL : "transparent", color: on ? "#fff" : INK, cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800 });
  const skoncila = z.stav !== "aktivna";
  return <Okno label={z.nazov} onZavri={onZavri}>
    {!hotovo && <Hlava z={z} />}
    <div style={{ padding: "18px 18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      {hotovo ? <>
        <div role="status" style={{ padding: 16, borderRadius: 16, background: "var(--nf-gSoft)", border: "1.5px solid var(--nf-gBd)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Logo o={org} s={44} /><b style={{ fontSize: 17, lineHeight: 1.3 }}>{org.meno} ďakuje za dar</b></div>
          <span style={{ fontSize: 15.5, lineHeight: 1.5, color: INK }}>{volba.verzia === 4 ? "Pán Boh zaplať." : `Pán Boh zaplať, ${meno}.`} Zapísali sme vás medzi darcov zbierky {z.nazov}.</span>
        </div>
        <button type="button" onClick={onPozriet} style={{ minHeight: 56, borderRadius: 16, border: "1.5px solid var(--nf-gBd)", background: "transparent", color: "var(--nf-gInk)", cursor: "pointer", fontFamily: "inherit", fontSize: 16.5, fontWeight: 800 }}>Pozrieť zbierku ›</button>
      </> : <>
        <b style={{ fontSize: 22, lineHeight: 1.2, overflowWrap: "anywhere" }}>{z.nazov}</b>
        <span style={{ fontSize: 15, color: INK2 }}>{[org.meno, z.doKedy ? `do ${doKedyText(z.doKedy, false)}` : ""].filter(Boolean).join(" · ")}</span>
        {skoncila ? <span role="status" style={{ padding: "12px 14px", borderRadius: 14, background: KARTA, fontSize: 15.5, fontWeight: 700, lineHeight: 1.45 }}>Táto zbierka už skončila. Ďakujeme všetkým, ktorí darovali.</span> : <>
        <b style={{ fontSize: 18 }}>Darovali ste?</b>
        {z.ukazHodnotu && reg && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: INK2 }}>Približná hodnota daru <span style={{ fontWeight: 500 }}>· nepovinné</span></span>
          <div role="radiogroup" aria-label="Približná hodnota daru" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
            {([5, 10, 20] as const).map((n) => <button key={n} type="button" role="radio" aria-checked={hod === n} onClick={() => setHod(hod === n ? null : n)} style={chip(hod === n)}>{n} €</button>)}
            <button type="button" role="radio" aria-checked={hod === "ina"} onClick={() => setHod(hod === "ina" ? null : "ina")} style={{ ...chip(hod === "ina"), fontSize: 15 }}>Iná</button>
          </div>
          {hod === "ina" && <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input autoFocus inputMode="decimal" value={ina} maxLength={6} onChange={(e) => setIna(e.target.value.replace(/[^\d,.]/g, ""))} aria-label="Iná hodnota v eurách" placeholder="napr. 15" style={{ flex: 1, minHeight: 52, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${LINKA}`, background: PAPIER, color: INK, fontFamily: "inherit", fontSize: 17, fontWeight: 700, boxSizing: "border-box" }} /><b style={{ fontSize: 17 }}>€</b></label>}
          <span style={{ fontSize: 13.5, color: INK3 }}>Nemusíte. Len pre informáciu, nič neplatíte.</span>
        </div>}
        {reg ? <>
          <button type="button" onClick={() => setMenit((x) => !x)} aria-expanded={menit} style={{ minHeight: 52, padding: "0 14px", borderRadius: 14, border: `1.5px solid ${LINKA}`, background: "transparent", color: INK, cursor: "pointer", fontFamily: "inherit", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textAlign: "left" }}>
            <span>Zapíšete sa ako <b>{meno}</b></span><span style={{ flex: "none", color: "var(--nf-gInk)", fontWeight: 800 }}>{menit ? "Zbaliť ⌃" : "Zmeniť ›"}</span></button>
          {menit && <div role="radiogroup" aria-label="Ako sa zapíšete" style={{ display: "flex", flexDirection: "column", gap: 6 }}>{moznosti.map(([v, t]) => <button key={v} type="button" role="radio" aria-checked={v === volba.verzia} onClick={() => vyber(v)} style={{ ...chip(v === volba.verzia), textAlign: "left", padding: "0 14px", fontSize: 15.5 }}>{t}</button>)}</div>}
          {/* OPRAVY 335: chyba priamo nad tlačidlom (na mobile aj okno) */}
          <ChybaPriTlacidle text={chyba || null} uklada={uklada} onZnova={() => { void zapis(); }} nadpis="Nezapísalo sa" />
          <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={uklada ? "Zapisujem…" : "Podržte · daroval som"} trvanie={1000} disabled={uklada} onConfirm={() => { void zapis(); }} /></div>
        </> : <>
          <span role="status" style={{ padding: "12px 14px", borderRadius: 14, background: KARTA, fontSize: 15, lineHeight: 1.5, color: INK }}>Bez prihlásenia sa zapísať nedá. Po prihlásení sa vrátite sem a zapíšete sa.</span>
          <button type="button" onClick={onPrihlasit} style={{ minHeight: 56, border: "none", borderRadius: 16, background: ZELENA_TL, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 16.5, fontWeight: 800 }}>Prihlásiť sa</button>
        </>}
        </>}
      </>}
    </div>
  </Okno>;
}
