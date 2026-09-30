// OPRAVY 70 · karty na hlavnej obrazovke profilu (vidí len vlastník):
// Rozpracovaný skutok (uložený koncept z Pridať skutok, 30 dní) · Prvé kroky (nový účet, kým nesplní všetky 3)
// · Poďakovania pre teba (odkazy od ľudí a organizácií, ktorým pomohol).
import { useState } from "react";
import { Harok } from "@/features/zbierka/Zdielat";
import { toast } from "@/components/toast";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { koncept, ulozKoncept, mojeSkutky, useZmenySkutkov } from "@/lib/mojeSkutky";
import { cistyText } from "@/lib/richtext";
import { usePersonalizacia } from "@/lib/personalizacia";
import { usePriatelia } from "@/lib/priatelia";
import { useT, type T } from "@/i18n";
import { usePrekladObsahu, maPreklad } from "@/i18n/obsah";
import "@/styles/platba.css";

const TRIDSAT_DNI = 30 * 24 * 3600 * 1000;
const Ik = ({ d, s = 18, w = 2 }: { d: string; s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const hlavne = { flex: "none", minHeight: 40, padding: "0 12px", borderRadius: 11, border: "none", boxShadow: "none", background: "var(--gGrad)", color: "#fff", fontSize: 13.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" } as const;

const pred = (tr: T, t: number) => {
  const h = Math.max(0, Math.round((Date.now() - t) / 3600000));
  if (h < 1) return tr("karty.pred.chvila");
  if (h < 24) return tr("karty.pred.h", { n: h });
  const d = Math.round(h / 24);
  return d === 1 ? tr("karty.pred.vcera") : tr("karty.pred.dni", { n: d });
};

/** Rozpracovaný skutok — len keď existuje koncept mladší ako 30 dní */
export function RozpracovanySkutok() {
  const t = useT();
  useZmenySkutkov();
  const k = koncept();
  const [zahodit, setZahodit] = useState(false);
  const pr = usePrekladObsahu(); // 79b · názov konceptu, ak ho vieme preložiť
  if (!k || Date.now() - k.ulozene > TRIDSAT_DNI) return null;
  const chyba = t(`karty.chyba.${!k.nazov.trim() ? "nazov" : cistyText(k.popis).length < 10 ? "popis" : !k.oblast ? "oblast" : !k.miesto.trim() ? "miesto" : "odoslanie"}`);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--card)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--gold)" }}>{t("karty.rozpracovany")}</span>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.nazov.trim() ? pr.p(k.nazov.trim()) : t("karty.bezNazvu")}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{t("karty.ulozene", { kedy: pred(t, k.ulozene), co: chyba })}</span>
          {maPreklad(k.nazov.trim(), t) && pr.odkaz}
        </span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 2, flex: "none" }}>
          <button type="button" onClick={() => otvorPridatSkutok({ koncept: true })} style={hlavne}>{t("karty.dokoncit")}</button>
          <button type="button" onClick={() => setZahodit(true)} style={{ minHeight: 32, border: "none", background: "none", boxShadow: "none", fontSize: 12.5, fontWeight: 700, color: "var(--ink3)", cursor: "pointer", fontFamily: "inherit" }}>{t("karty.zahodit")}</button>
        </span>
      </div>
      {zahodit && (
        <Harok onClose={() => setZahodit(false)} zatvorText={t("sp.zrusit")} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{t("karty.zahoditOtazka")}</span>}
          paticka={<button type="button" onClick={() => { ulozKoncept(null); setZahodit(false); toast(t("karty.zahodene")); }} style={{ flex: 1, minHeight: 52, borderRadius: 16, border: "none", boxShadow: "none", background: "var(--sek-r)", color: "#fff", fontSize: 15.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>{t("karty.zahodit")}</button>}>
          <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>{t("karty.vymaze", { nazov: k.nazov.trim() || t("karty.bezNazvu") })}</div>
        </Harok>)}
    </>
  );
}

/** Prvé kroky — nový účet; kroky sa odškrtnú samé podľa skutočnosti, po splnení všetkých troch karta zmizne */
export function PrveKroky({ naZaujmy, naPriatelia }: { naZaujmy: () => void; naPriatelia: () => void }) {
  const tr = useT();
  useZmenySkutkov();
  const { zaujmy } = usePersonalizacia();
  const { mamPriatela } = usePriatelia();
  const kroky: [string, string, string, boolean, () => void][] = [
    ["zaujmy", tr("karty.kroky.zaujmy"), tr("karty.kroky.zaujmy.s"), zaujmy.length > 0, naZaujmy],
    ["skutok", tr("karty.kroky.skutok"), tr("karty.kroky.skutok.s"), mojeSkutky().length > 0, () => otvorPridatSkutok({})],
    ["priatelia", tr("karty.kroky.priatelia"), tr("karty.kroky.priatelia.s"), !!mamPriatela, naPriatelia],
  ];
  const n = kroky.filter((k) => k[3]).length;
  if (n === 3) return null;
  return (
    <section aria-label={tr("karty.kroky.titul")} style={{ borderRadius: 20, background: "var(--gSoft)", border: "1px solid var(--gBd)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}><h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{tr("karty.kroky.titul")}</h2><span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gInk)" }}>{tr("karty.kroky.zTroch", { n })}</span></div>
      <div aria-hidden="true" style={{ height: 6, borderRadius: 3, background: "var(--card)", overflow: "hidden" }}><div style={{ height: "100%", background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${n / 3})`, transition: "transform .4s ease" }} /></div>
      {kroky.map(([id, t, s, hotovo, tuk]) => (
        <button key={id} type="button" onClick={tuk} aria-label={`${t}${hotovo ? tr("karty.kroky.hotovoAria") : ""}`}
          style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "6px 10px", borderRadius: 14, border: "none", boxShadow: "none", background: hotovo ? "transparent" : "var(--card)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
          <span style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${hotovo ? "var(--green)" : "var(--gBd)"}`, background: hotovo ? "var(--green)" : "transparent", color: "#fff" }}>{hotovo && <Ik d="M20 6 9 17l-5-5" s={14} w={3} />}</span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: hotovo ? "var(--ink3)" : "var(--ink)" }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{hotovo ? tr("karty.kroky.hotovo") : s}</span></span>
          {!hotovo && <span style={{ display: "flex", color: "var(--gInk)" }}><Ik d="M9 6l6 6-6 6" s={16} w={2.4} /></span>}
        </button>))}
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink2)" }}>{n === 2 ? tr("karty.kroky.posledny") : tr("karty.kroky.vsetky")}</div>
    </section>
  );
}

// ukážkové poďakovania (v produkcii: odkaz príjemcu po dare a pri skutku)
const POD: { i: string; bg: string; q: string; kto: string; vek?: number; za: "zaSkutok" | "zaDar" | "zaDoucovanie"; co?: string; d: Date }[] = [
  { i: "JN", bg: "var(--gSoft)", q: "„Ďakujem, že si ma vozil na dialýzu. Bez teba by som to nezvládol.“", kto: "Ján N.", za: "zaSkutok", co: "Odvoz na dialýzu", d: new Date(2026, 8, 18) },
  { i: "TL", bg: "var(--goldBg)", q: "„Vďaka tebe mali psy celú zimu teplé búdy.“", kto: "Útulok Túlavá labka", za: "zaDar", d: new Date(2026, 8, 2) },
  { i: "MK", bg: "var(--bSoft)", q: "„Pán Martin, matematiku som dal na jednotku.“", kto: "Matej", vek: 13, za: "zaDoucovanie", d: new Date(2026, 6, 18) },
  { i: "RP", bg: "var(--btn)", q: "„Ďakujeme za pomoc po povodni.“", kto: "Rodina P.", za: "zaDar", d: new Date(2026, 5, 6) },
];
const POD_SPOLU = 12;

/** Poďakovania pre teba — 2 najnovšie + Všetky poďakovania (vidí len vlastník) */
export function Podakovania({ ukazka }: { ukazka: boolean }) {
  const t = useT();
  const [vsetky, setVsetky] = useState(false);
  const pr = usePrekladObsahu(); // 79b · citáty a názvy skutkov
  if (!ukazka) return null; // nový účet poďakovania ešte nemá
  return (
    <section aria-label={t("karty.pod.titul")} style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "16px 14px 6px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, paddingBottom: 6 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t("karty.pod.titul")}</h2><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t("karty.pod.pocet", { n: POD_SPOLU })}</span></div>
      {POD.slice(0, vsetky ? POD.length : 2).map((p, j) => (
        <button key={p.i} type="button" onClick={() => toast(t("karty.pod.detail"))}
          style={{ display: "flex", gap: 12, padding: "12px 0", border: "none", borderTop: j ? "1px solid var(--cardBd)" : "none", background: "none", boxShadow: "none", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", cursor: "pointer" }}>
          <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: "50%", background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12.5, flex: "none" }}>{p.i}</span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, lineHeight: 1.5 }}>{pr.p(p.q)}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 3 }}>{p.vek ? t("karty.pod.vek", { meno: p.kto, n: p.vek }) : pr.p(p.kto)} · {t(`karty.pod.${p.za}`, p.co ? { co: pr.p(p.co) } : undefined)} · {t.datum(p.d)}</span></span>
        </button>))}
      <button type="button" onClick={() => setVsetky(!vsetky)} aria-expanded={vsetky} style={{ alignSelf: "flex-start", minHeight: 44, border: "none", background: "none", boxShadow: "none", padding: 0, fontSize: 14, fontWeight: 700, color: "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>{vsetky ? t("sp.menej") : t("karty.pod.vsetky")}</button>
      {pr.odkaz}
    </section>
  );
}
