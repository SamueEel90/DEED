// KARTA 29 · Priatelia — záložky Priatelia | Sledujem | Podporujem, žiadosti, Kam idú tvoji priatelia (+ Pridať sa),
// moji priatelia so štítom, Pridať priateľa (4 cesty), hárok Čo o mne vidia priatelia. Anonymný profil = len meno.
// Priateľ = vzájomný súhlas · Sledovanie = jednostranné · Podporujem = pravidelné dary. Údaje sú zatiaľ ukážkové.
import { DeedZnacka } from "@/components/DeedZnacka";
import { useEffect, useRef, useState } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { StitObr, type StitLevel } from "@/components/stit";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { DeedQr } from "@/components/deedqr";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { Harok } from "@/features/zbierka/Zdielat";
import { useTvorbaGate } from "@/shared";
import { useOsobnyProfil } from "@/lib/osobnyProfil";
import { usePriatelia, prepniVidia, prepniIdem, oznacPriatela, type VidiaPriatelia } from "@/lib/priatelia";
import { bezDiakritiky } from "./JazykUdaje";
import { Prepinac } from "./nastUi";
import "@/styles/platba.css";

export type PriateliaTab = "priatelia" | "sledujem" | "podporujem";

const lbl = { fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "0 2px 8px" } as const;
const karta = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" } as const;
const pozn = { fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" } as const;
const AV: Record<string, string> = { g: "var(--gSoft)", b: "var(--bSoft)", o: "var(--goldBg)", n: "var(--btn)" };

type Akcia = { id: string; d: string; m: string; typ: string; tbg: string; tc: string; t: string; s: string; av: [string, string][]; kto: string };
const KAM: Akcia[] = [
  { id: "a1", d: "4", m: "OKT", typ: "Dobrovoľníctvo", tbg: "var(--gSoft)", tc: "var(--gInk)", t: "Sobota pre útulok", s: "Túlavá labka · 9:00 – 13:00", av: [["JN", "g"], ["TB", "b"]], kto: "Jana a Tomáš idú" },
  { id: "a2", d: "6", m: "OKT", typ: "Kultúra", tbg: "var(--bSoft)", tc: "var(--blue)", t: "Benefičný koncert Vlnobitie", s: "Kino Hviezda · 19:00", av: [["LH", "o"]], kto: "Lucia ide" },
  { id: "a3", d: "9", m: "OKT", typ: "Posedenie", tbg: "var(--goldBg)", tc: "var(--gold)", t: "Večera pre dobrovoľníkov", s: "Reštaurácia Lanius · 18:30", av: [["JN", "g"], ["PM", "n"], ["TB", "b"]], kto: "Jana, Paľo a Tomáš idú" },
  { id: "a4", d: "12", m: "OKT", typ: "Akcia v meste", tbg: "var(--gSoft)", tc: "var(--gInk)", t: "Sadenie stromov na Sihoti", s: "zraz pri moste · 10:00", av: [["PM", "n"]], kto: "Paľo ide" },
];
type Priatel = { id: string; i: string; bg: string; n: string; s: string; stit: StitLevel | null };
const PRIATELIA: Priatel[] = [
  { id: "jn", i: "JN", bg: "g", n: "Jana Novotná", s: "Trenčín · ide na 2 akcie", stit: "Gold" },
  { id: "tb", i: "TB", bg: "b", n: "Tomáš B.", s: "Trenčín · posledný skutok včera", stit: "Silver" },
  { id: "lh", i: "LH", bg: "o", n: "Lucia H.", s: "Trnava · ide na koncert", stit: "Bronze" },
  { id: "vl", i: "VL", bg: "n", n: "Vlk", s: "anonymný profil · nezdieľa aktivitu", stit: null },
  { id: "pm", i: "PM", bg: "n", n: "Paľo M.", s: "Nemšová · 12 skutkov tento rok", stit: "Silver" },
];
const CELKOM = 24; // ukážka: v zozname je len prvých 5
const SLEDUJEM = [{ i: "MT", bg: "b", n: "Marek Tvorí", s: "tvorca · Bratislava" }, { i: "OZ", bg: "g", n: "OZ Motýlik", s: "charita · Trenčín" }];
const PODPORUJEM = [{ i: "CN", bg: "g", n: "Charita Nitra", s: "mesačne od 1. 3. 2026" }];
type Okno = "kontakty" | "hladat" | "pozvanka" | "sken";
const MENU: [string, string, boolean][] = [
  ["Zobraziť profil", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", false],
  ["Pozvať na akciu", "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", false],
  ["Poslať DeeD ako poďakovanie", "M7 17L17 7M9 7h8v8", false],
  ["Odobrať z priateľov", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 11h6", false],
  ["Zablokovať", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8", true],
];
const PRIDAT: { k: Okno; t: string; s: string; d: string }[] = [
  { k: "kontakty", t: "Z kontaktov", s: "známi, čo už majú DEED+", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6" },
  { k: "hladat", t: "Hľadať", s: "len verejné profily", d: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3" },
  { k: "pozvanka", t: "Pozvánka", s: "odkaz alebo QR aj pre tých bez DEED+", d: "M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.1" },
  { k: "sken", t: "Naskenovať QR", s: "pri stretnutí, fotoaparátom", d: "M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10" },
];
const VIDIA: [keyof VidiaPriatelia, string, string][] = [["kam", "Kam idem", "akcie, dobrovoľníctvo, kultúra, posedenia"], ["skutky", "Moje skutky", "overené skutky, nie denník"], ["stity", "Moje štíty", "hlavný štít a vyvesené štíty"]];

const avatar = (i: string, bg: string, r: number | string = "50%", size = 42) => (
  <span aria-hidden="true" style={{ width: size, height: size, borderRadius: r, background: AV[bg], color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size < 30 ? 9.5 : 14, flex: "none" }}>{i}</span>);
const hlavne = { flex: "none", minHeight: 44, padding: "0 12px", borderRadius: 12, border: "none", boxShadow: "none", background: "var(--gGrad)", color: "#fff", fontSize: 13.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" } as const;
const vedlajsie = { ...hlavne, background: "var(--btn)", border: "1px solid var(--cardBd)", color: "var(--ink2)", fontWeight: 700 } as const;

export function Priatelia({ onBack, desktop, tab: tab0 = "priatelia" }: { onBack: () => void; desktop?: boolean; tab?: PriateliaTab }) {
  const { gate } = useTvorbaGate(); // pridávanie priateľa = iniciovanie vzťahu
  const st = usePriatelia();
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

  const vybav = (ok: boolean) => { setZiadost(false); if (ok) oznacPriatela(); toast(ok ? "Peter K. je tvoj priateľ" : "Žiadosť odmietnutá"); };
  const pridat = (k: Okno) => setOkno(k);
  const q = bezDiakritiky(hladaj.trim());
  const zoznam = PRIATELIA.filter((p) => !odobrani.includes(p.id) && (!q || bezDiakritiky(p.n).includes(q)));

  return (
    <div className="deed-platba" style={{ padding: "0 16px 34px", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
          {!desktop && <SpatTlacidlo onClick={onBack} />}
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>Priatelia</h1>
          <button type="button" onClick={() => setVid(true)} aria-label="Čo o mne vidia priatelia" style={{ marginLeft: "auto", width: 44, height: 44, borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg></button>
        </div>
        <div role="tablist" aria-label="Priatelia" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
          {([["priatelia", "Priatelia"], ["sledujem", "Sledujem"], ["podporujem", "Podporujem"]] as const).map(([k, t]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={tab === k ? "seg-on" : undefined}
              style={{ minHeight: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", ...(tab === k ? {} : { background: "transparent", color: "var(--ink3)", boxShadow: "none" }) }}>{t}</button>))}
        </div>
      </div>

      {tab === "priatelia" && (<>
        {ziadost && (
          <section>
            <h2 style={{ ...lbl, margin: 0 }}>ŽIADOSTI</h2>
            <div style={{ ...karta, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
              {avatar("PK", "b")}
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>Peter K.</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", whiteSpace: "nowrap" }}>3 spoloční priatelia</span></span>
              <button type="button" onClick={gate(() => vybav(true))} style={hlavne}>Prijať</button>
              <button type="button" onClick={() => vybav(false)} style={vedlajsie}>Odmietnuť</button>
            </div>
          </section>)}

        <section>
          <h2 style={{ ...lbl, margin: 0 }}>KAM IDÚ TVOJI PRIATELIA</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {KAM.map((k) => {
              const on = st.idem.includes(k.id);
              return (
                <div key={k.id} style={{ ...karta, display: "flex", gap: 12, padding: "12px 14px" }}>
                  <span style={{ width: 46, flex: "none", textAlign: "center", paddingTop: 2 }}><span style={{ display: "block", fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{k.d}</span><span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>{k.m}</span></span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span><span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 800, background: k.tbg, color: k.tc }}>{k.typ}</span></span>
                    <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{k.t}</span>
                    <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{k.s}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ display: "flex", flex: "none" }}>{k.av.map(([i, bg], j) => <span key={i} style={{ marginLeft: j ? -6 : 0, borderRadius: "50%", border: "2px solid var(--card)", display: "flex" }}>{avatar(i, bg, "50%", 22)}</span>)}</span>
                      <span style={{ minWidth: 0, fontSize: 12.5, color: "var(--ink2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.kto}</span>
                    </span>
                  </span>
                  <button type="button" aria-pressed={on} onClick={() => { prepniIdem(k.id); toast(on ? "Už nejdeš" : "Prihlásený · pozvánka ide do kalendára"); }}
                    style={{ ...hlavne, alignSelf: "center", minWidth: 96, ...(on ? { background: "var(--gSoft)", border: "1.5px solid var(--gBd)", color: "var(--gInk)" } : {}) }}>{on ? "Idem" : "Pridať sa"}</button>
                </div>);
            })}
          </div>
          <div style={{ ...pozn, marginTop: 8, padding: "0 2px" }}>Vidíš len to, čo ti priatelia dovolili. Keď sa pridáš, dostaneš pozvánku do kalendára.</div>
        </section>

        <section>
          <h2 style={{ ...lbl, margin: 0 }}>MOJI PRIATELIA · {CELKOM - odobrani.length}</h2>
          <input value={hladaj} onChange={(e) => setHladaj(e.target.value)} placeholder="Hľadať medzi priateľmi" aria-label="Hľadať medzi priateľmi"
            style={{ width: "100%", boxSizing: "border-box", height: 46, padding: "0 14px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 15, color: "var(--ink)", outline: "none", marginBottom: 8, fontFamily: "inherit" }} />
          <div style={{ ...karta, padding: "0 14px" }}>
            {zoznam.length === 0 && <div style={{ ...pozn, padding: "18px 0" }}>Nikoho sme nenašli.</div>}
            {zoznam.map((p, k) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, borderTop: k ? "1px solid var(--cardBd)" : "none" }}>
                {avatar(p.i, p.bg)}
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{p.n}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{p.s}</span></span>
                {p.stit && <span aria-label={`hlavný štít`} style={{ flex: "none", lineHeight: 0 }}><StitObr level={p.stit} h={30} lazy /></span>}
                <button type="button" aria-label={`Možnosti · ${p.n}`} onClick={() => setMenu(p)} style={{ width: 40, height: 44, border: "none", background: "none", boxShadow: "none", cursor: "pointer", color: "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button>
              </div>))}
          </div>
        </section>

        <section>
          <h2 style={{ ...lbl, margin: 0 }}>PRIDAŤ PRIATEĽA</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PRIDAT.map((c) => (
              <button key={c.k} type="button" onClick={gate(() => pridat(c.k))} style={{ ...karta, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 14, cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
                <span style={{ width: 36, height: 36, borderRadius: 11, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={c.d} /></svg></span>
                <span><span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{c.t}</span><span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "var(--ink3)", marginTop: 2 }}>{c.s}</span></span>
              </button>))}
          </div>
        </section>
      </>)}

      {tab !== "priatelia" && (<>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink2)" }}>{tab === "sledujem" ? "Sledovanie je jednostranné. Vidíš ich skutky a zbierky, oni nemusia sledovať teba." : "Pravidelné dary, ktoré posielaš. Zrušíš ich kedykoľvek."}</div>
        <div style={{ ...karta, padding: "0 14px" }}>
          {(tab === "sledujem" ? SLEDUJEM : PODPORUJEM).map((p, k) => (
            <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, borderTop: k ? "1px solid var(--cardBd)" : "none" }}>
              {avatar(p.i, p.bg, 12)}
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{p.n}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{p.s}</span></span>
              {tab === "sledujem"
                ? <span style={{ flex: "none", fontSize: 13, fontWeight: 700, color: "var(--green)" }}>Sledujem</span>
                : <button type="button" onClick={() => toast("Úprava pravidelného daru príde so serverom")} style={{ flex: "none", minHeight: 44, padding: "0 4px", border: "none", background: "none", boxShadow: "none", fontSize: 13.5, fontWeight: 800, color: "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>Upraviť</button>}
            </div>))}
        </div>
      </>)}

      {menu && (
        <Harok onClose={() => setMenu(null)} zatvorText="Zavrieť" hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{menu.n}</span>}>
          <div style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>
            {MENU.map(([t, d, cerv], i) => (
              <button key={t} type="button" onClick={() => {
                const m = menu;
                if (i === 0) toast("Profil priateľa sa otvorí so serverom");
                else if (i === 1) toast("Vyber akciu, na ktorú ho pozveš");
                else if (i === 2) toast("Poslanie DeeD priateľovi príde s peňaženkou");
                else if (i === 3) { setOdobrani((o) => [...o, m.id]); toast(`${m.n} už nie je tvoj priateľ. Nedostane o tom správu.`); }
                else { setOdobrani((o) => [...o, m.id]); toast(`${m.n} je zablokovaný. Nájdeš ho v Nastaveniach.`); }
                setMenu(null);
              }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 54, border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "none", boxShadow: "none", textAlign: "left", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", color: cerv ? "var(--sek-r)" : "var(--ink)" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
                <span style={{ flex: 1 }}>{t}</span></button>))}
          </div>
        </Harok>)}

      {vid && (
        <Harok onClose={() => setVid(false)} zatvorText="Hotovo" hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>Čo o mne vidia priatelia</span>}>
          <div style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>
            {VIDIA.map(([k, t, s], i) => {
              const on = !anonym && st.vidia[k];
              return (
                <button key={k} type="button" role="switch" aria-checked={on} aria-disabled={anonym} onClick={() => { if (!anonym) prepniVidia(k); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 62, padding: "8px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "none", boxShadow: "none", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", cursor: anonym ? "default" : "pointer", opacity: anonym ? 0.5 : 1 }}>
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t}</span><span style={{ display: "block", fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)" }}>{s}</span></span>
                  <Prepinac on={on} />
                </button>);
            })}
          </div>
          {anonym && <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink2)" }}>Pri anonymnom profile priatelia vidia len tvoje meno.</div>}
          <div style={{ padding: "10px 12px", borderRadius: 13, background: "var(--field)", border: "1px solid var(--cardBd)", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink2)" }}>Karmu, peňaženku ani sumy darov priatelia nevidia nikdy. Pri anonymnom profile vidia len meno, ktoré používaš pri daroch.</div>
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
type Osoba = { k: string; i: string; bg: string; n: string; s: string; priatel?: boolean; sledovat?: boolean };

function RiadokOsoby({ o, i, odoslane, posli }: { o: Osoba; i: number; odoslane: string[]; posli: (k: string) => void }) {
  const st = odoslane.includes(o.k), zel = st || o.priatel;
  const t = o.priatel ? "Priateľ" : o.sledovat ? (st ? "Sledujem" : "Sledovať") : st ? "Poslané" : "Pridať";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 62, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
      {avatar(o.i, o.bg, "50%", 40)}
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{o.n}</span><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{o.s}</span></span>
      <button type="button" disabled={o.priatel} aria-pressed={st} onClick={() => { if (!st) { posli(o.k); toast(o.sledovat ? `Sleduješ ${o.n}` : "Žiadosť poslaná"); } }}
        style={{ ...hlavne, ...(zel ? { background: "var(--gSoft)", border: "1.5px solid var(--gBd)", color: "var(--gInk)" } : {}), cursor: o.priatel ? "default" : "pointer" }}>{t}</button>
    </div>);
}

const KONTAKTY: Osoba[] = [
  { k: "k1", i: "JK", bg: "g", n: "Janka Kováčová", s: "v kontaktoch ako Janka" },
  { k: "k2", i: "RB", bg: "b", n: "Rasťo B.", s: "v kontaktoch ako Rasťo práca" },
  { k: "k3", i: "JN", bg: "g", n: "Jana Novotná", s: "už je tvoj priateľ", priatel: true },
];
function ZKontaktov({ odoslane, posli, naPozvanku, onClose }: { odoslane: string[]; posli: (k: string) => void; naPozvanku: () => void; onClose: () => void }) {
  const nast = useNastaveniaAppky();
  return (
    <Harok onClose={onClose} zatvorText="Zavrieť" hlavicka={nadpisH("Z kontaktov")}>
      {!nast.kontakty ? (<>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink2)" }}>Nájdeme známych z tvojich kontaktov, ktorí už majú <DeedZnacka />. Čísla neukladáme, porovnávame len ich zašifrovaný odtlačok.</div>
        <button type="button" onClick={() => zmenNastavenia({ kontakty: true })} style={velke}>Povoliť prístup ku kontaktom</button>
        <div style={pozn}>Prístup zrušíš kedykoľvek v Nastaveniach, Súkromie a údaje.</div>
      </>) : (<>
        <div style={nad}>MAJÚ <DeedZnacka /> · {KONTAKTY.length}</div>
        <div style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>{KONTAKTY.map((o, i) => <RiadokOsoby key={o.k} o={o} i={i} odoslane={odoslane} posli={posli} />)}</div>
        <div style={{ ...nad, marginTop: 4 }}>EŠTE NEMAJÚ <DeedZnacka /> · 41</div>
        <button type="button" onClick={naPozvanku} style={{ minHeight: 50, borderRadius: 15, border: "1.5px dashed var(--gBd)", background: "transparent", boxShadow: "none", fontSize: 15, fontWeight: 700, color: "var(--green)", fontFamily: "inherit", cursor: "pointer" }}>Poslať im pozvánku</button>
      </>)}
    </Harok>);
}

const VEREJNE: Osoba[] = [
  { k: "hJK", i: "JK", bg: "g", n: "Janka Kováčová", s: "Trenčín · 3 spoloční" },
  { k: "hMT", i: "MT", bg: "b", n: "Marek Tvorí", s: "tvorca · Bratislava", sledovat: true },
  { k: "hJN", i: "JN", bg: "g", n: "Jana Novotná", s: "Trenčín · priateľ", priatel: true },
  { k: "hOZ", i: "OZ", bg: "o", n: "OZ Motýlik", s: "charita · Trenčín", sledovat: true },
];
function HladatLudi({ odoslane, posli, onClose }: { odoslane: string[]; posli: (k: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const n = bezDiakritiky(q.trim());
  const z = VEREJNE.filter((o) => !n || bezDiakritiky(`${o.n} ${o.s}`).includes(n));
  return (
    <Harok onClose={onClose} zatvorText="Zavrieť" hlavicka={nadpisH("Hľadať ľudí")}>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Meno, prezývka alebo mesto" aria-label="Hľadať ľudí"
        style={{ height: 50, padding: "0 14px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
      <div style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>
        {z.map((o, i) => <RiadokOsoby key={o.k} o={o} i={i} odoslane={odoslane} posli={posli} />)}
        {z.length === 0 && <div style={{ padding: "16px 0", fontSize: 14, color: "var(--ink3)" }}>Nikoho sme nenašli.</div>}
      </div>
      <div style={pozn}>Nájdeš len verejné profily. Ľudí s anonymným profilom pridáš len cez ich QR alebo pozvánku.</div>
    </Harok>);
}

function Pozvanka({ onClose }: { onClose: () => void }) {
  const ja = usePouzivatel();
  const [kop, setKop] = useState(false);
  const handle = (ja.nick || `${ja.meno}-${(ja.priezvisko || "")[0] ?? ""}`).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ja";
  const odkaz = `deed.sk/p/${handle}`;
  const kopiruj = async () => { try { await navigator.clipboard.writeText(`https://${odkaz}`); setKop(true); } catch { toast("Odkaz sa nepodarilo skopírovať"); } };
  const zdielaj = async () => {
    const d = { title: "Pozvánka do DEED+", text: `${ja.celeMeno || "Priateľ"} ťa pozýva do DEED+.`, url: `https://${odkaz}` };
    if (navigator.share) { try { await navigator.share(d); } catch { /* zrušené */ } } else void kopiruj();
  };
  return (
    <Harok onClose={onClose} zatvorText="Zavrieť" hlavicka={nadpisH("Pozvánka")}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 16, borderRadius: 18, background: "#fff", border: "1px solid var(--cardBd)" }}>
        <DeedQr data={`https://${odkaz}`} bezOdznaku size={200} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#1D211B" }}>{ja.celeMeno}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 14px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{odkaz}</span>
        <button type="button" onClick={kopiruj} style={{ ...vedlajsie, color: "var(--ink)" }}>{kop ? "Skopírované" : "Kopírovať"}</button>
      </div>
      <button type="button" onClick={zdielaj} style={velke}>Zdieľať pozvánku</button>
      <div style={pozn}>Kto <DeedZnacka /> ešte nemá, dostane pozvánku do appky. Po registrácii ti príde jeho žiadosť o priateľstvo.</div>
    </Harok>);
}

/** fotoaparát → QR priateľa (pozvánka deed.sk/p/<meno>) → karta osoby → Poslať žiadosť */
function SkenQr({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [kamera, setKamera] = useState<"caka" | "ide" | "nie">("caka");
  const [osoba, setOsoba] = useState<string | null>(null);
  const [poslane, setPoslane] = useState(false);
  useEffect(() => {
    let zrus = false, ctrl: IScannerControls | null = null;
    new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video.current ?? undefined, (r, _e, c) => {
      ctrl = c; if (zrus || !r) return;
      const m = /deed\.sk\/p\/([a-z0-9-]+)/i.exec(r.getText());
      if (!m) { toast("To nie je QR priateľa"); return; }
      c.stop(); setOsoba(m[1].split("-").filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join(" "));
    }).then((c) => { ctrl = c; if (zrus) c.stop(); else setKamera("ide"); }).catch(() => { if (!zrus) setKamera("nie"); });
    return () => { zrus = true; try { ctrl?.stop(); } catch { /* už zastavené */ } };
  }, []);
  const ini = osoba ? osoba.split(" ").map((x) => x[0]).join("").slice(0, 2) : "";
  return (
    <Harok onClose={onClose} zatvorText="Zavrieť" hlavicka={nadpisH("Naskenovať QR")}>
      <div style={{ position: "relative", height: 300, borderRadius: 20, overflow: "hidden", background: "#1D211B" }}>
        <video ref={video} muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: osoba ? 0.35 : 1 }} />
        <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: 24, width: 190, height: 190, marginLeft: -95, borderRadius: 22, border: "3px solid rgba(255,255,255,.85)" }} />
        <span style={{ position: "absolute", left: 16, right: 16, bottom: 16, textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(241,236,225,.9)" }}>
          {osoba ? "QR načítaný" : kamera === "nie" ? "Fotoaparát nie je dostupný. Povoľ ho v nastaveniach prehliadača." : kamera === "caka" ? "Zapínam fotoaparát" : "Namier na QR priateľa"}</span>
      </div>
      {osoba && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
          <span style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flex: "none" }}>{ini}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800 }}>{osoba}</span>
          <button type="button" disabled={poslane} onClick={() => { setPoslane(true); oznacPriatela(); toast("Žiadosť poslaná"); }} style={{ ...hlavne, ...(poslane ? { background: "var(--card)", color: "var(--gInk)", border: "1.5px solid var(--gBd)" } : {}) }}>{poslane ? "Žiadosť poslaná" : "Poslať žiadosť"}</button>
        </div>)}
      <div style={pozn}>Namier na QR priateľa v jeho Môj QR. Priateľstvo platí, až keď ho potvrdí aj on.</div>
    </Harok>);
}
