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
import "@/styles/platba.css";

const TRIDSAT_DNI = 30 * 24 * 3600 * 1000;
const Ik = ({ d, s = 18, w = 2 }: { d: string; s?: number; w?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const hlavne = { flex: "none", minHeight: 40, padding: "0 12px", borderRadius: 11, border: "none", boxShadow: "none", background: "var(--gGrad)", color: "#fff", fontSize: 13.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" } as const;

const pred = (t: number) => {
  const h = Math.max(0, Math.round((Date.now() - t) / 3600000));
  if (h < 1) return "pred chvíľou";
  if (h < 24) return `pred ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "včera" : `pred ${d} dňami`;
};

/** Rozpracovaný skutok — len keď existuje koncept mladší ako 30 dní */
export function RozpracovanySkutok() {
  useZmenySkutkov();
  const k = koncept();
  const [zahodit, setZahodit] = useState(false);
  if (!k || Date.now() - k.ulozene > TRIDSAT_DNI) return null;
  const chyba = !k.nazov.trim() ? "názov" : cistyText(k.popis).length < 10 ? "popis" : !k.oblast ? "oblasť" : !k.miesto.trim() ? "miesto" : "odoslanie";
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--card)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", color: "var(--gold)" }}>ROZPRACOVANÝ SKUTOK</span>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.nazov.trim() || "Skutok bez názvu"}</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>uložené {pred(k.ulozene)} · chýba {chyba}</span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 2, flex: "none" }}>
          <button type="button" onClick={() => otvorPridatSkutok({ koncept: true })} style={hlavne}>Dokončiť</button>
          <button type="button" onClick={() => setZahodit(true)} style={{ minHeight: 32, border: "none", background: "none", boxShadow: "none", fontSize: 12.5, fontWeight: 700, color: "var(--ink3)", cursor: "pointer", fontFamily: "inherit" }}>Zahodiť</button>
        </span>
      </div>
      {zahodit && (
        <Harok onClose={() => setZahodit(false)} zatvorText="Zrušiť" hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>Zahodiť rozpracovaný skutok?</span>}
          paticka={<button type="button" onClick={() => { ulozKoncept(null); setZahodit(false); toast("Rozpracovaný skutok zahodený"); }} style={{ flex: 1, minHeight: 52, borderRadius: 16, border: "none", boxShadow: "none", background: "var(--sek-r)", color: "#fff", fontSize: 15.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>Zahodiť</button>}>
          <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>„{k.nazov.trim() || "Skutok bez názvu"}" sa vymaže. Späť ho už nevrátiš.</div>
        </Harok>)}
    </>
  );
}

/** Prvé kroky — nový účet; kroky sa odškrtnú samé podľa skutočnosti, po splnení všetkých troch karta zmizne */
export function PrveKroky({ naZaujmy, naPriatelia }: { naZaujmy: () => void; naPriatelia: () => void }) {
  useZmenySkutkov();
  const { zaujmy } = usePersonalizacia();
  const { mamPriatela } = usePriatelia();
  const kroky: [string, string, string, boolean, () => void][] = [
    ["zaujmy", "Vyber si záujmy", "podľa nich ti skladáme nástenku", zaujmy.length > 0, naZaujmy],
    ["skutok", "Pridaj prvý skutok", "aj malý sa počíta", mojeSkutky().length > 0, () => otvorPridatSkutok({})],
    ["priatelia", "Nájdi priateľov", "uvidíš, kam idú", !!mamPriatela, naPriatelia],
  ];
  const n = kroky.filter((k) => k[3]).length;
  if (n === 3) return null;
  return (
    <section aria-label="Prvé kroky" style={{ borderRadius: 20, background: "var(--gSoft)", border: "1px solid var(--gBd)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}><h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Prvé kroky</h2><span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gInk)" }}>{n} z 3</span></div>
      <div aria-hidden="true" style={{ height: 6, borderRadius: 3, background: "var(--card)", overflow: "hidden" }}><div style={{ height: "100%", background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${n / 3})`, transition: "transform .4s ease" }} /></div>
      {kroky.map(([id, t, s, hotovo, tuk]) => (
        <button key={id} type="button" onClick={tuk} aria-label={`${t}${hotovo ? ", hotovo" : ""}`}
          style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "6px 10px", borderRadius: 14, border: "none", boxShadow: "none", background: hotovo ? "transparent" : "var(--card)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
          <span style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${hotovo ? "var(--green)" : "var(--gBd)"}`, background: hotovo ? "var(--green)" : "transparent", color: "#fff" }}>{hotovo && <Ik d="M20 6 9 17l-5-5" s={14} w={3} />}</span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: hotovo ? "var(--ink3)" : "var(--ink)" }}>{t}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{hotovo ? "hotovo" : s}</span></span>
          {!hotovo && <span style={{ display: "flex", color: "var(--gInk)" }}><Ik d="M9 6l6 6-6 6" s={16} w={2.4} /></span>}
        </button>))}
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink2)" }}>{n === 2 ? "Posledný krok a karta zmizne." : "Po splnení všetkých troch krokov karta zmizne."}</div>
    </section>
  );
}

// ukážkové poďakovania (v produkcii: odkaz príjemcu po dare a pri skutku)
const POD: { i: string; bg: string; q: string; k: string }[] = [
  { i: "JN", bg: "var(--gSoft)", q: "„Ďakujem, že si ma vozil na dialýzu. Bez teba by som to nezvládol.“", k: "Ján N. · za skutok Odvoz na dialýzu · 18. 9." },
  { i: "TL", bg: "var(--goldBg)", q: "„Vďaka tebe mali psy celú zimu teplé búdy.“", k: "Útulok Túlavá labka · za dar · 2. 9." },
  { i: "MK", bg: "var(--bSoft)", q: "„Pán Martin, matematiku som dal na jednotku.“", k: "Matej, 13 rokov · za doučovanie · 18. 7." },
  { i: "RP", bg: "var(--btn)", q: "„Ďakujeme za pomoc po povodni.“", k: "Rodina P. · za dar · 6. 6." },
];
const POD_SPOLU = 12;

/** Poďakovania pre teba — 2 najnovšie + Všetky poďakovania (vidí len vlastník) */
export function Podakovania({ ukazka }: { ukazka: boolean }) {
  const [vsetky, setVsetky] = useState(false);
  if (!ukazka) return null; // nový účet poďakovania ešte nemá
  return (
    <section aria-label="Poďakovania pre teba" style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "16px 14px 6px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, paddingBottom: 6 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Poďakovania pre teba</h2><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{POD_SPOLU} poďakovaní</span></div>
      {POD.slice(0, vsetky ? POD.length : 2).map((p, j) => (
        <button key={p.k} type="button" onClick={() => toast("Detail skutku alebo daru príde so serverom")}
          style={{ display: "flex", gap: 12, padding: "12px 0", border: "none", borderTop: j ? "1px solid var(--cardBd)" : "none", background: "none", boxShadow: "none", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", cursor: "pointer" }}>
          <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: "50%", background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12.5, flex: "none" }}>{p.i}</span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14.5, lineHeight: 1.5 }}>{p.q}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 3 }}>{p.k}</span></span>
        </button>))}
      <button type="button" onClick={() => setVsetky(!vsetky)} aria-expanded={vsetky} style={{ alignSelf: "flex-start", minHeight: 44, border: "none", background: "none", boxShadow: "none", padding: 0, fontSize: 14, fontWeight: 700, color: "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>{vsetky ? "Menej" : "Všetky poďakovania"}</button>
    </section>
  );
}
