// KARTA 29 · Priatelia — záložky Priatelia | Sledujem | Podporujem, žiadosti, Kam idú tvoji priatelia (+ Pridať sa),
// moji priatelia so štítom, Pridať priateľa (4 cesty), hárok Čo o mne vidia priatelia. Anonymný profil = len meno.
// Priateľ = vzájomný súhlas · Sledovanie = jednostranné · Podporujem = pravidelné dary. Údaje sú zatiaľ ukážkové.
import { sZnackou } from "@/components/DeedZnacka";
import { useEffect, useRef, useState } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { StitObr, type StitLevel } from "@/components/stit";
import type { IScannerControls } from "@zxing/browser";
import { DeedQr } from "@/components/deedqr";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { Harok } from "@/features/zbierka/Zdielat";
import { useTvorbaGate } from "@/shared";
import { useOsobnyProfil } from "@/lib/osobnyProfil";
import { usePriatelia, prepniVidia, prepniIdem, oznacPriatela, type VidiaPriatelia } from "@/lib/priatelia";
import { bezDiakritiky } from "./JazykUdaje";
import { Prepinac } from "./nastUi";
import { useT, tTeraz, type T, type Param } from "@/i18n";
import { usePrekladObsahu } from "@/i18n/obsah";
import "@/styles/platba.css";

export type PriateliaTab = "priatelia" | "sledujem" | "podporujem";

const lbl = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "0 2px 8px" } as const;
const karta = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" } as const;
const pozn = { fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" } as const;
const AV: Record<string, string> = { g: "var(--gSoft)", b: "var(--bSoft)", o: "var(--goldBg)", n: "var(--btn)" };
/** text z prekladu: [kľúč, parametre] */
type Txt = [string, Param?];
const tx = (t: T, [k, p]: Txt) => t(k, p);
/** „Jana a Tomáš idú" — mená sa neprekladajú, spojka a sloveso áno */
const idu = (t: T, m: string[]) => (m.length === 1 ? t("priatelia.ide1", { a: m[0] }) : m.length === 2 ? t("priatelia.ide2", { a: m[0], b: m[1] }) : t("priatelia.ide3", { a: m[0], b: m[1], c: m[2] }));

type Akcia = { id: string; d: string; m: number; typ: string; tbg: string; tc: string; t: string; s: string; av: [string, string][]; kto: string[] };
const KAM: Akcia[] = [
  { id: "a1", d: "4", m: 9, typ: "priatelia.typ.dobrovolnictvo", tbg: "var(--gSoft)", tc: "var(--gInk)", t: "Sobota pre útulok", s: "Túlavá labka · 9:00 – 13:00", av: [["JN", "g"], ["TB", "b"]], kto: ["Jana", "Tomáš"] },
  { id: "a2", d: "6", m: 9, typ: "priatelia.typ.kultura", tbg: "var(--bSoft)", tc: "var(--blue)", t: "Benefičný koncert Vlnobitie", s: "Kino Hviezda · 19:00", av: [["LH", "o"]], kto: ["Lucia"] },
  { id: "a3", d: "9", m: 9, typ: "priatelia.typ.posedenie", tbg: "var(--goldBg)", tc: "var(--gold)", t: "Večera pre dobrovoľníkov", s: "Reštaurácia Lanius · 18:30", av: [["JN", "g"], ["PM", "n"], ["TB", "b"]], kto: ["Jana", "Paľo", "Tomáš"] },
  { id: "a4", d: "12", m: 9, typ: "priatelia.typ.akciaVMeste", tbg: "var(--gSoft)", tc: "var(--gInk)", t: "Sadenie stromov na Sihoti", s: "zraz pri moste · 10:00", av: [["PM", "n"]], kto: ["Paľo"] },
];
type Priatel = { id: string; i: string; bg: string; n: string; s: Txt; stit: StitLevel | null };
const PRIATELIA: Priatel[] = [
  { id: "jn", i: "JN", bg: "g", n: "Jana Novotná", s: ["priatelia.st.ideNaAkcie", { mesto: "Trenčín", n: 2 }], stit: "Gold" },
  { id: "tb", i: "TB", bg: "b", n: "Tomáš B.", s: ["priatelia.st.poslednyVcera", { mesto: "Trenčín" }], stit: "Silver" },
  { id: "lh", i: "LH", bg: "o", n: "Lucia H.", s: ["priatelia.st.ideNaKoncert", { mesto: "Trnava" }], stit: "Bronze" },
  { id: "vl", i: "VL", bg: "n", n: "Vlk", s: ["priatelia.st.anonymny"], stit: null },
  { id: "pm", i: "PM", bg: "n", n: "Paľo M.", s: ["priatelia.st.skutkovRok", { mesto: "Nemšová", n: 12 }], stit: "Silver" },
];
const CELKOM = 24; // ukážka: v zozname je len prvých 5
const SLEDUJEM: { i: string; bg: string; n: string; s: Txt }[] = [{ i: "MT", bg: "b", n: "Marek Tvorí", s: ["priatelia.st.tvorca", { mesto: "Bratislava" }] }, { i: "OZ", bg: "g", n: "OZ Motýlik", s: ["priatelia.st.charita", { mesto: "Trenčín" }] }];
const PODPORUJEM: { i: string; bg: string; n: string; s: Txt; od?: Date }[] = [{ i: "CN", bg: "g", n: "Charita Nitra", s: ["priatelia.st.mesacneOd"], od: new Date(2026, 2, 1) }];
type Okno = "kontakty" | "hladat" | "pozvanka" | "sken";
const MENU: [string, string, boolean][] = [
  ["priatelia.menu.profil", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", false],
  ["priatelia.menu.pozvat", "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", false],
  ["priatelia.menu.poslatDeed", "M7 17L17 7M9 7h8v8", false],
  ["priatelia.menu.odobrat", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 11h6", false],
  ["priatelia.menu.zablokovat", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8", true],
];
const PRIDAT: { k: Okno; t: string; s: string; d: string }[] = [
  { k: "kontakty", t: "priatelia.cesta.kontakty", s: "priatelia.cesta.kontaktyS", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6" },
  { k: "hladat", t: "priatelia.cesta.hladat", s: "priatelia.cesta.hladatS", d: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3" },
  { k: "pozvanka", t: "priatelia.cesta.pozvanka", s: "priatelia.cesta.pozvankaS", d: "M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.1" },
  { k: "sken", t: "priatelia.cesta.sken", s: "priatelia.cesta.skenS", d: "M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10" },
];
const VIDIA: [keyof VidiaPriatelia, string, string][] = [["kam", "priatelia.vidia.kam", "priatelia.vidia.kamS"], ["skutky", "priatelia.vidia.skutky", "priatelia.vidia.skutkyS"], ["stity", "priatelia.vidia.stity", "priatelia.vidia.stityS"]];

const avatar = (i: string, bg: string, r: number | string = "50%", size = 42) => (
  <span aria-hidden="true" style={{ width: size, height: size, borderRadius: r, background: AV[bg], color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size < 30 ? 9.5 : 14, flex: "none" }}>{i}</span>);
const hlavne = { flex: "none", minHeight: 44, padding: "0 12px", borderRadius: 12, border: "none", boxShadow: "none", background: "var(--gGrad)", color: "#fff", fontSize: 13.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" } as const;
const vedlajsie = { ...hlavne, background: "var(--btn)", border: "1px solid var(--cardBd)", color: "var(--ink2)", fontWeight: 700 } as const;

export function Priatelia({ onBack, desktop, tab: tab0 = "priatelia" }: { onBack: () => void; desktop?: boolean; tab?: PriateliaTab }) {
  const { gate } = useTvorbaGate(); // pridávanie priateľa = iniciovanie vzťahu
  const t = useT();
  const st = usePriatelia();
  const pr = usePrekladObsahu(); // 79b · obsah akcií priateľov
  const anonym = !useOsobnyProfil().verejny;
  const [tab, setTab] = useState<PriateliaTab>(tab0);
  const [ziadost, setZiadost] = useState(true);
  const [hladaj, setHladaj] = useState("");
  const [odobrani, setOdobrani] = useState<string[]>([]);
  const [menu, setMenu] = useState<Priatel | null>(null);
  const [vid, setVid] = useState(false);
  const [okno, setOkno] = useState<Okno | null>(null);
  const [odoslane, setOdoslane] = useState<string[]>([]); // Pridať → Poslané, Sledovať → Sledujem (lokálne)
  const posli = (k: string) => { oznacPriatela(); setOdoslane((o) => (o.includes(k) ? o : [...o, k])); };

  const vybav = (ok: boolean) => { setZiadost(false); if (ok) oznacPriatela(); toast(ok ? t("priatelia.jeTvojPriatel", { meno: "Peter K." }) : t("priatelia.ziadostOdmietnuta")); };
  const pridat = (k: Okno) => setOkno(k);
  const q = bezDiakritiky(hladaj.trim());
  const zoznam = PRIATELIA.filter((p) => !odobrani.includes(p.id) && (!q || bezDiakritiky(p.n).includes(q)));

  return (
    <div className="deed-platba" style={{ padding: "0 16px 34px", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
          {!desktop && <SpatTlacidlo onClick={onBack} />}
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{t("priatelia.titul")}</h1>
          <button type="button" onClick={() => setVid(true)} aria-label={t("priatelia.coVidia")} style={{ marginLeft: "auto", width: 44, height: 44, borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg></button>
        </div>
        <div role="tablist" aria-label={t("priatelia.titul")} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
          {([["priatelia", "priatelia.tab.priatelia"], ["sledujem", "priatelia.tab.sledujem"], ["podporujem", "priatelia.tab.podporujem"]] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={tab === k ? "seg-on" : undefined}
              style={{ minHeight: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", ...(tab === k ? {} : { background: "transparent", color: "var(--ink3)", boxShadow: "none" }) }}>{t(l)}</button>))}
        </div>
      </div>

      {tab === "priatelia" && (<>
        {ziadost && (
          <section>
            <h2 style={{ ...lbl, margin: 0 }}>{t("priatelia.ziadosti")}</h2>
            <div style={{ ...karta, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
              {avatar("PK", "b")}
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>Peter K.</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", whiteSpace: "nowrap" }}>{t("priatelia.spolocniPriatelia", { n: 3 })}</span></span>
              <button type="button" onClick={gate(() => vybav(true))} style={hlavne}>{t("priatelia.prijat")}</button>
              <button type="button" onClick={() => vybav(false)} style={vedlajsie}>{t("priatelia.odmietnut")}</button>
            </div>
          </section>)}

        <section>
          <h2 style={{ ...lbl, margin: 0 }}>{t("priatelia.kamIdu")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {KAM.map((k) => {
              const on = st.idem.includes(k.id);
              return (
                <div key={k.id} style={{ ...karta, display: "flex", gap: 12, padding: "12px 14px" }}>
                  <span style={{ width: 46, flex: "none", textAlign: "center", paddingTop: 2 }}><span style={{ display: "block", fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{k.d}</span><span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>{t.mesiac(k.m, true).replace(/\.$/, "").toUpperCase()}</span></span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span><span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 800, background: k.tbg, color: k.tc }}>{t(k.typ)}</span></span>
                    <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{pr.p(k.t)}</span>
                    <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{pr.p(k.s)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ display: "flex", flex: "none" }}>{k.av.map(([i, bg], j) => <span key={i} style={{ marginLeft: j ? -6 : 0, borderRadius: "50%", border: "2px solid var(--card)", display: "flex" }}>{avatar(i, bg, "50%", 22)}</span>)}</span>
                      <span style={{ minWidth: 0, fontSize: 12.5, color: "var(--ink2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{idu(t, k.kto)}</span>
                    </span>
                  </span>
                  <button type="button" aria-pressed={on} onClick={() => { prepniIdem(k.id); toast(on ? t("priatelia.uzNejdes") : t("priatelia.prihlaseny")); }}
                    style={{ ...hlavne, alignSelf: "center", minWidth: 96, ...(on ? { background: "var(--gSoft)", border: "1.5px solid var(--gBd)", color: "var(--gInk)" } : {}) }}>{on ? t("priatelia.idem") : t("priatelia.pridatSa")}</button>
                </div>);
            })}
          </div>
          <div style={{ ...pozn, marginTop: 8, padding: "0 2px" }}>{t("priatelia.kamPozn")}</div>
          {pr.odkaz}
        </section>

        <section>
          <h2 style={{ ...lbl, margin: 0 }}>{t("priatelia.mojiPriatelia", { n: CELKOM - odobrani.length })}</h2>
          <input value={hladaj} onChange={(e) => setHladaj(e.target.value)} placeholder={t("priatelia.hladatMedzi")} aria-label={t("priatelia.hladatMedzi")}
            style={{ width: "100%", boxSizing: "border-box", height: 46, padding: "0 14px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 15, color: "var(--ink)", outline: "none", marginBottom: 8, fontFamily: "inherit" }} />
          <div style={{ ...karta, padding: "0 14px" }}>
            {zoznam.length === 0 && <div style={{ ...pozn, padding: "18px 0" }}>{t("priatelia.nikoho")}</div>}
            {zoznam.map((p, k) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, borderTop: k ? "1px solid var(--cardBd)" : "none" }}>
                {avatar(p.i, p.bg)}
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{p.n}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{tx(t, p.s)}</span></span>
                {p.stit && <span aria-label={t("priatelia.hlavnyStit")} style={{ flex: "none", lineHeight: 0 }}><StitObr level={p.stit} h={30} lazy /></span>}
                <button type="button" aria-label={t("priatelia.moznosti", { meno: p.n })} onClick={() => setMenu(p)} style={{ width: 40, height: 44, border: "none", background: "none", boxShadow: "none", cursor: "pointer", color: "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button>
              </div>))}
          </div>
        </section>

        <section>
          <h2 style={{ ...lbl, margin: 0 }}>{t("priatelia.pridatPriatela")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PRIDAT.map((c) => (
              <button key={c.k} type="button" onClick={gate(() => pridat(c.k))} style={{ ...karta, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 14, cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
                <span style={{ width: 36, height: 36, borderRadius: 11, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={c.d} /></svg></span>
                <span><span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{t(c.t)}</span><span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "var(--ink3)", marginTop: 2 }}>{t(c.s)}</span></span>
              </button>))}
          </div>
        </section>
      </>)}

      {tab !== "priatelia" && (<>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink2)" }}>{tab === "sledujem" ? t("priatelia.sledujemInfo") : t("priatelia.podporujemInfo")}</div>
        <div style={{ ...karta, padding: "0 14px" }}>
          {(tab === "sledujem" ? SLEDUJEM : PODPORUJEM).map((p: { i: string; bg: string; n: string; s: Txt; od?: Date }, k) => (
            <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, borderTop: k ? "1px solid var(--cardBd)" : "none" }}>
              {avatar(p.i, p.bg, 12)}
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{p.n}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{p.od ? t(p.s[0], { datum: t.datum(p.od, true) }) : tx(t, p.s)}</span></span>
              {tab === "sledujem"
                ? <span style={{ flex: "none", fontSize: 13, fontWeight: 700, color: "var(--green)" }}>{t("priatelia.sledujem")}</span>
                : <button type="button" onClick={() => toast(t("priatelia.upravaDaru"))} style={{ flex: "none", minHeight: 44, padding: "0 4px", border: "none", background: "none", boxShadow: "none", fontSize: 13.5, fontWeight: 800, color: "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>{t("priatelia.upravit")}</button>}
            </div>))}
        </div>
      </>)}

      {menu && (
        <Harok onClose={() => setMenu(null)} zatvorText={t("priatelia.zavriet")} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{menu.n}</span>}>
          <div style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>
            {MENU.map(([l, d, cerv], i) => (
              <button key={l} type="button" onClick={() => {
                const m = menu;
                if (i === 0) toast(t("priatelia.toast.profil"));
                else if (i === 1) toast(t("priatelia.toast.pozvat"));
                else if (i === 2) toast(t("priatelia.toast.poslatDeed"));
                else if (i === 3) { setOdobrani((o) => [...o, m.id]); toast(t("priatelia.toast.odobrany", { meno: m.n })); }
                else { setOdobrani((o) => [...o, m.id]); toast(t("priatelia.toast.zablokovany", { meno: m.n })); }
                setMenu(null);
              }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 54, border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "none", boxShadow: "none", textAlign: "left", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", color: cerv ? "var(--sek-r)" : "var(--ink)" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
                <span style={{ flex: 1 }}>{t(l)}</span></button>))}
          </div>
        </Harok>)}

      {vid && (
        <Harok onClose={() => setVid(false)} zatvorText={t("priatelia.hotovo")} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{t("priatelia.coVidia")}</span>}>
          <div style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>
            {VIDIA.map(([k, l, s], i) => {
              const on = !anonym && st.vidia[k];
              return (
                <button key={k} type="button" role="switch" aria-checked={on} aria-disabled={anonym} onClick={() => { if (!anonym) prepniVidia(k); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 62, padding: "8px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "none", boxShadow: "none", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", cursor: anonym ? "default" : "pointer", opacity: anonym ? 0.5 : 1 }}>
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t(l)}</span><span style={{ display: "block", fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)" }}>{t(s)}</span></span>
                  <Prepinac on={on} />
                </button>);
            })}
          </div>
          {anonym && <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>{t("priatelia.anonymLenMeno")}</div>}
          <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink2)" }}>{t("priatelia.nikdyNevidia")}</div>
        </Harok>)}

      {okno === "kontakty" && <ZKontaktov odoslane={odoslane} posli={posli} naPozvanku={() => setOkno("pozvanka")} onClose={() => setOkno(null)} />}
      {okno === "hladat" && <HladatLudi odoslane={odoslane} posli={posli} onClose={() => setOkno(null)} />}
      {okno === "pozvanka" && <Pozvanka onClose={() => setOkno(null)} />}
      {okno === "sken" && <SkenQr onClose={() => setOkno(null)} />}
    </div>
  );
}

// ===================== 4 cesty Pridať priateľa (doplnok karty 29) =====================
const nadpisH = (t: string) => <span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{t}</span>;
const nad = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" } as const;
const velke = { minHeight: 54, borderRadius: 16, border: "none", boxShadow: "none", background: "var(--gGrad)", color: "#fff", fontSize: 16, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" } as const;
type Osoba = { k: string; i: string; bg: string; n: string; s: Txt; priatel?: boolean; sledovat?: boolean };

function RiadokOsoby({ o, i, odoslane, posli }: { o: Osoba; i: number; odoslane: string[]; posli: (k: string) => void }) {
  const t = useT();
  const st = odoslane.includes(o.k), zel = st || o.priatel;
  const l = t(o.priatel ? "priatelia.stav.priatel" : o.sledovat ? (st ? "priatelia.stav.sledujem" : "priatelia.stav.sledovat") : st ? "priatelia.stav.poslane" : "priatelia.stav.pridat");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 62, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
      {avatar(o.i, o.bg, "50%", 40)}
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{o.n}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{tx(t, o.s)}</span></span>
      <button type="button" disabled={o.priatel} aria-pressed={st} onClick={() => { if (!st) { posli(o.k); toast(o.sledovat ? t("priatelia.sledujes", { meno: o.n }) : t("priatelia.ziadostPoslana")); } }}
        style={{ ...hlavne, ...(zel ? { background: "var(--gSoft)", border: "1.5px solid var(--gBd)", color: "var(--gInk)" } : {}), cursor: o.priatel ? "default" : "pointer" }}>{l}</button>
    </div>);
}

const KONTAKTY: Osoba[] = [
  { k: "k1", i: "JK", bg: "g", n: "Janka Kováčová", s: ["priatelia.st.vKontaktoch", { meno: "Janka" }] },
  { k: "k2", i: "RB", bg: "b", n: "Rasťo B.", s: ["priatelia.st.vKontaktoch", { meno: "Rasťo práca" }] },
  { k: "k3", i: "JN", bg: "g", n: "Jana Novotná", s: ["priatelia.st.uzPriatel"], priatel: true },
];
function ZKontaktov({ odoslane, posli, naPozvanku, onClose }: { odoslane: string[]; posli: (k: string) => void; naPozvanku: () => void; onClose: () => void }) {
  const nast = useNastaveniaAppky();
  const t = useT();
  return (
    <Harok onClose={onClose} zatvorText={t("priatelia.zavriet")} hlavicka={nadpisH(t("priatelia.cesta.kontakty"))}>
      {!nast.kontakty ? (<>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>{t("priatelia.kontakty.info")}</div>
        <button type="button" onClick={() => zmenNastavenia({ kontakty: true })} style={velke}>{t("priatelia.kontakty.povolit")}</button>
        <div style={pozn}>{t("priatelia.kontakty.zrusit")}</div>
      </>) : (<>
        <div style={nad}>{sZnackou(t("priatelia.kontakty.maju", { n: KONTAKTY.length }))}</div>
        <div style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>{KONTAKTY.map((o, i) => <RiadokOsoby key={o.k} o={o} i={i} odoslane={odoslane} posli={posli} />)}</div>
        <div style={{ ...nad, marginTop: 4 }}>{sZnackou(t("priatelia.kontakty.nemaju", { n: 41 }))}</div>
        <button type="button" onClick={naPozvanku} style={{ minHeight: 50, borderRadius: 15, border: "1.5px dashed var(--gBd)", background: "transparent", boxShadow: "none", fontSize: 15, fontWeight: 700, color: "var(--green)", fontFamily: "inherit", cursor: "pointer" }}>{t("priatelia.kontakty.poslatPozvanku")}</button>
      </>)}
    </Harok>);
}

const VEREJNE: Osoba[] = [
  { k: "hJK", i: "JK", bg: "g", n: "Janka Kováčová", s: ["priatelia.st.spolocni", { mesto: "Trenčín", n: 3 }] },
  { k: "hMT", i: "MT", bg: "b", n: "Marek Tvorí", s: ["priatelia.st.tvorca", { mesto: "Bratislava" }], sledovat: true },
  { k: "hJN", i: "JN", bg: "g", n: "Jana Novotná", s: ["priatelia.st.priatel", { mesto: "Trenčín" }], priatel: true },
  { k: "hOZ", i: "OZ", bg: "o", n: "OZ Motýlik", s: ["priatelia.st.charita", { mesto: "Trenčín" }], sledovat: true },
];
function HladatLudi({ odoslane, posli, onClose }: { odoslane: string[]; posli: (k: string) => void; onClose: () => void }) {
  const t = useT();
  const [q, setQ] = useState("");
  const n = bezDiakritiky(q.trim());
  const z = VEREJNE.filter((o) => !n || bezDiakritiky(`${o.n} ${tx(t, o.s)}`).includes(n));
  return (
    <Harok onClose={onClose} zatvorText={t("priatelia.zavriet")} hlavicka={nadpisH(t("priatelia.hladatLudi"))}>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("priatelia.hladatPole")} aria-label={t("priatelia.hladatLudi")}
        style={{ height: 50, padding: "0 14px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
      <div style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>
        {z.map((o, i) => <RiadokOsoby key={o.k} o={o} i={i} odoslane={odoslane} posli={posli} />)}
        {z.length === 0 && <div style={{ padding: "16px 0", fontSize: 14, color: "var(--ink3)" }}>{t("priatelia.nikoho")}</div>}
      </div>
      <div style={pozn}>{t("priatelia.hladatPozn")}</div>
    </Harok>);
}

function Pozvanka({ onClose }: { onClose: () => void }) {
  const ja = usePouzivatel();
  const t = useT();
  const [kop, setKop] = useState(false);
  const handle = (ja.nick || `${ja.meno}-${(ja.priezvisko || "")[0] ?? ""}`).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ja";
  const odkaz = `deed.sk/p/${handle}`;
  const kopiruj = async () => { try { await navigator.clipboard.writeText(`https://${odkaz}`); setKop(true); } catch { toast(tTeraz()("priatelia.odkazChyba")); } };
  const zdielaj = async () => {
    const tn = tTeraz();
    const d = { title: tn("priatelia.pozvankaTitul"), text: tn("priatelia.pozvankaText", { meno: ja.celeMeno || tn("priatelia.priatel") }), url: `https://${odkaz}` };
    if (navigator.share) { try { await navigator.share(d); } catch { /* zrušené */ } } else void kopiruj();
  };
  return (
    <Harok onClose={onClose} zatvorText={t("priatelia.zavriet")} hlavicka={nadpisH(t("priatelia.pozvanka"))}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 16, borderRadius: 18, background: "#fff", border: "1px solid var(--cardBd)" }}>
        <DeedQr data={`https://${odkaz}`} bezOdznaku size={200} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1D211B" }}>{ja.celeMeno}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 14px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{odkaz}</span>
        <button type="button" onClick={kopiruj} style={{ ...vedlajsie, color: "var(--ink)" }}>{kop ? t("priatelia.skopirovane") : t("priatelia.kopirovat")}</button>
      </div>
      <button type="button" onClick={zdielaj} style={velke}>{t("priatelia.zdielatPozvanku")}</button>
      <div style={pozn}>{t("priatelia.pozvankaPozn")}</div>
    </Harok>);
}

/** fotoaparát → QR priateľa (pozvánka deed.sk/p/<meno>) → karta osoby → Poslať žiadosť */
function SkenQr({ onClose }: { onClose: () => void }) {
  const t = useT();
  const video = useRef<HTMLVideoElement | null>(null);
  const [kamera, setKamera] = useState<"caka" | "ide" | "nie">("caka");
  const [osoba, setOsoba] = useState<string | null>(null);
  const [poslane, setPoslane] = useState(false);
  useEffect(() => {
    let zrus = false, ctrl: IScannerControls | null = null;
    // @zxing sa načíta až s kamerou (Zadanie 5 · 5.6 — nie v hlavnom balíku)
    import("@zxing/browser").then(({ BrowserQRCodeReader }) => new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video.current ?? undefined, (r, _e, c) => {
      ctrl = c; if (zrus || !r) return;
      const m = /deed\.sk\/p\/([a-z0-9-]+)/i.exec(r.getText());
      if (!m) { toast(tTeraz()("priatelia.sken.nieQr")); return; }
      c.stop(); setOsoba(m[1].split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" "));
    })).then((c) => { ctrl = c; if (zrus) c.stop(); else setKamera("ide"); }).catch(() => { if (!zrus) setKamera("nie"); });
    return () => { zrus = true; try { ctrl?.stop(); } catch { /* už zastavené */ } };
  }, []);
  const ini = osoba ? osoba.split(" ").map((x) => x[0]).join("").slice(0, 2) : "";
  return (
    <Harok onClose={onClose} zatvorText={t("priatelia.zavriet")} hlavicka={nadpisH(t("priatelia.sken.titul"))}>
      <div style={{ position: "relative", height: 300, borderRadius: 20, overflow: "hidden", background: "#1D211B" }}>
        <video ref={video} muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: osoba ? 0.35 : 1 }} />
        <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: 24, width: 190, height: 190, marginLeft: -95, borderRadius: 22, border: "3px solid rgba(255,255,255,.85)" }} />
        <span style={{ position: "absolute", left: 16, right: 16, bottom: 16, textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(241,236,225,.9)" }}>
          {osoba ? t("priatelia.sken.nacitany") : kamera === "nie" ? t("priatelia.sken.nedostupny") : kamera === "caka" ? t("priatelia.sken.zapinam") : t("priatelia.sken.namier")}</span>
      </div>
      {osoba && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
          <span style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flex: "none" }}>{ini}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800 }}>{osoba}</span>
          <button type="button" disabled={poslane} onClick={() => { setPoslane(true); oznacPriatela(); toast(t("priatelia.ziadostPoslana")); }} style={{ ...hlavne, ...(poslane ? { background: "var(--card)", color: "var(--gInk)", border: "1.5px solid var(--gBd)" } : {}) }}>{poslane ? t("priatelia.ziadostPoslana") : t("priatelia.sken.poslat")}</button>
        </div>)}
      <div style={pozn}>{t("priatelia.sken.pozn")}</div>
    </Harok>);
}
