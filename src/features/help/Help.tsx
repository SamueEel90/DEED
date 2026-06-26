import { useState, useEffect } from "react";
import { C, pasmo, inp, infoBox, btn, GRAD_ZELENY, glassTmavy } from "@/theme";
import { Foto, Avatar, FotoPrispevku, MiniFotky, Hlavicka, ModulHlavicka, PodporaSekcia, PlatbaModal, HladanieModal, Otazka, Vyber, vyberBox, NavBtns, Suhrn, DokladRow, toast, useGaleria, useScrollHore, Ticker, StatRiadok, MoniBar, FeedStlpce, SekcieBar, OkruhVyber, Lupa, Zdielanie, IkonaSpat, IkonaVlajka, IkonaFoto, FeedSkeleton, EmptyState, ErrorState, ScreenSwitch } from "@/shared";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { pripravFeed, FEED_CFG } from "@/lib/feed";
import type { HelpFeedItem } from "@/types";
import { useHelpFeed } from "@/data";
import { USER_LOK, ZIVE_DARY } from "./mock";

/*
  ============================================================
  MODUL HELP — crowdfunding pre ľudí v núdzi
  feed → detail → podpora · ＋ Pridať → Ponúkam / Dopytujem
  ============================================================
*/

// ===================== MODUL =====================
export default function ModulHelp({ wide }: { wide?: boolean }) {
  const { data: MOCK_FEED = [] } = useHelpFeed();
  const [screen, setScreen] = useState("feed"); // feed | detail | add | offer | request
  const [aktDetail, setAktDetail] = useState<any>(null);
  const [hladaj, setHladaj] = useState(false);
  const otvorZ = (z: any) => { setAktDetail(z); setScreen("detail"); };

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);

  // na tablete/desktope sa detailové obrazovky vycentrujú do čitateľnej šírky
  const obal = (el: React.ReactNode) => wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el;

  return (
    <div style={{ minHeight: "100%" }}>
      <ScreenSwitch k={screen}>
      {screen === "feed" && <Feed wide={wide} toast={toast} onDetail={otvorZ} onHladaj={() => setHladaj(true)} onAdd={() => setScreen("add")} />}
      {screen === "detail" && obal(<Detail z={aktDetail} onBack={() => setScreen("feed")} />)}
      {screen === "add" && obal(<Add onBack={() => setScreen("feed")} onOffer={() => setScreen("offer")} onRequest={() => setScreen("request")} />)}
      {screen === "offer" && obal(<OfferFlow onDone={() => setScreen("feed")} />)}
      {screen === "request" && obal(<RequestFlow onDone={() => setScreen("feed")} />)}
      </ScreenSwitch>

      {hladaj && (
        <HladanieModal akcent="var(--a-danger)" placeholder="Hľadať žiadosti, ponuky, ľudí…"
          data={MOCK_FEED.map((z) => ({
            id: z.id, titul: z.nazov, podtitul: z.pribeh, kat: z.lok, emoji: z.ikona,
            tag: z.typ === "ziadost" ? "Žiadosť" : z.typ === "ponuka" ? "Ponuka" : "Charita",
          }))}
          onPick={(id: number | string) => { const z = MOCK_FEED.find((x) => x.id === id); if (!z) return; z.typ === "ziadost" ? otvorZ(z) : toast(`${z.nazov} — ${z.typ === "ponuka" ? "ponuka pomoci" : "charita"}`); }}
          toast={toast} defaultFilter="Žiadosti Help"
          onClose={() => setHladaj(false)} />
      )}
    </div>
  );
}

// ===================== FEED =====================
function Feed({ wide, toast, onDetail, onHladaj, onAdd }: { wide?: boolean; toast: (m: string) => void; onDetail: (z: any) => void; onHladaj: () => void; onAdd: () => void }) {
  const { data: MOCK_FEED = [], isLoading, isError, refetch } = useHelpFeed();
  // živý ticker darov
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 3500);
    return () => clearInterval(t);
  }, []);
  const dar = ZIVE_DARY[tick % ZIVE_DARY.length];

  // zvolený rádius — Feed algoritmus (Časť B): filter podľa okruhu + adaptívny
  // prah + zoradenie. Ponuky/žiadosti si nechávajú vlastný `velkost` (iný slovník
  // než engine), preto NEpremapúvame zobrazVelkost — len filter + poradie.
  const [radius, setRadius] = useState<string>("stvrt");
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const feed = pripravFeed(MOCK_FEED as any, { ...USER_LOK, radius } as any);

  const karta = (z: any) => <FeedCard key={z.id} z={z} wide={wide} onClick={() => z.typ === "ziadost" && onDetail(z)} />;
  const jeZiadost = (z: any) => z.typ === "ziadost" || z.typ === "charity";

  return (
    <div style={{ paddingBottom: 14 }}>
      {/* header — jednotná hlavička (logo D⁺ + názov) */}
      <ModulHlavicka title="Help" karma="Pomoc · Silver" right={
        <>
          <span onClick={onHladaj} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={C.textSec} /></span>
          <Zvoncek color={C.textSec} toast={toast} />
        </>
      } />

      {/* živý ticker */}
      <Ticker key={tick}><b style={{ color: C.text }}>{dar.kto}</b> práve poslal <b style={{ color: C.greenL }}>{dar.co}</b> → {dar.komu}</Ticker>

      {/* jednotná sekcia skratiek */}
      <SekcieBar onTalent={() => toast("Ukáž svoj talent (demo)")} onBoard={() => toast("Nástenka (demo)")} onAdd={onAdd} />

      {/* štatistický riadok — počet vo zvolenom okruhu + výber okruhu */}
      <StatRiadok stat={`V okruhu ${feed.length} · Mesiac 8 421`}
        okruh={FEED_CFG.radiusy[radius].krat} onOkruh={() => setVyberOkruh(true)} />

      {/* karty — na tablete/PC: ponúkajú vľavo, hľadajú vpravo (zoradené algoritmom) */}
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <FeedSkeleton count={4} />
      ) : feed.length === 0 ? (
        <EmptyState emoji="🙏" title="Žiadne žiadosti v okruhu" text="V tomto okruhu zatiaľ nie sú dosť významné žiadosti. Skús menší okruh." />
      ) : (
        <FeedStlpce wide={wide} padding="4px 8px"
          labelSkutky="Ponúkajú pomoc" labelZiadosti="Hľadajú pomoc"
          jednoStlpec={feed.map(karta)}
          skutky={feed.filter((z) => !jeZiadost(z)).map(karta)}
          ziadosti={feed.filter(jeZiadost).map(karta)}
        />
      )}

      {vyberOkruh && <OkruhVyber radius={radius} akcent="var(--a-danger)"
        onPick={(r: any) => { setRadius(r); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}

function FeedCard({ z, wide, onClick }: { z: any; wide?: boolean; onClick: () => void }) {
  if (z.typ === "ziadost") {
    const velka = z.velkost === "velka";
    const bleed = !wide && velka; // hero žiadosť edge-to-edge na mobile
    return (
      <div onClick={onClick} className="good-card" style={{ margin: wide ? 0 : (velka ? "0 -8px 12px" : "12px 13px"), border: bleed ? "none" : `1px solid ${z.sponzor ? "rgba(240,199,90,.32)" : "rgba(242,112,111,.26)"}`, borderBottom: bleed ? `1px solid ${C.line2}` : undefined, borderRadius: bleed ? 0 : 17, overflow: "hidden", background: z.sponzor ? "rgba(240,199,90,.05)" : "rgba(242,112,111,.05)", cursor: "pointer" }}>
        {velka && (
          <div style={{ position: "relative" }}>
            <FotoPrispevku fotky={z.fotky} emoji={z.ikona} h={120} disableGaleria />
            <span style={{ position: "absolute", top: 8, left: 8, background: z.sponzor ? C.gold : C.red, color: z.sponzor ? "#1A1408" : "#fff", fontSize: 9, fontWeight: "bold", borderRadius: 20, padding: "2px 8px", pointerEvents: "none" }}>
              ŽIADOSŤ · {z.sponzor ? "D++" : "D+"}
            </span>
            {z.sponzor && (
              <span style={{ position: "absolute", top: 8, right: 8, background: "#fff", color: "#0B3D91", fontSize: 9, fontWeight: "bold", borderRadius: 6, padding: "3px 7px", pointerEvents: "none" }}>
                🛡 {z.sponzor.meno} · {z.sponzor.suma} €
              </span>
            )}
          </div>
        )}
        <div style={{ display: "flex" }}>
          {!velka && <FotoPrispevku fotky={z.fotky} emoji={z.ikona} h={92} w={78} disableGaleria />}
          <div style={{ padding: "11px 14px 13px", flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: "bold" }}>{z.nazov}
              {z.overeny && <span style={{ fontSize: 11, color: C.greenL, border: `1px solid rgba(127,203,160,.4)`, borderRadius: 20, padding: "2px 8px", marginLeft: 6 }}>overená</span>}
            </div>
            <div style={{ fontSize: 13.5, color: C.textSec, margin: "6px 0 9px", lineHeight: 1.5 }}>{z.pribeh.length > 70 ? z.pribeh.slice(0, 70) + "…" : z.pribeh}</div>
            <MoniBar vyzbierane={z.suma} ciel={z.ciel} mini />
          </div>
        </div>
      </div>
    );
  }
  if (z.typ === "ponuka") {
    const velka = z.velkost === "stredna";
    return (
      <div style={{ margin: wide ? 0 : "11px 13px", border: `1px solid rgba(139,124,255,.28)`, borderLeft: velka ? `1px solid rgba(139,124,255,.28)` : `3px solid ${C.purple}`, borderRadius: velka ? 17 : 12, background: "rgba(139,124,255,.06)", padding: velka ? 0 : "9px 13px", overflow: "hidden", display: "flex", alignItems: velka ? "stretch" : "center" }}>
        {velka ? (
          <>
            <FotoPrispevku fotky={z.fotky} emoji={z.ikona} h={80} w={74} style={{ minHeight: 80, height: "100%" }} />
            <div style={{ padding: "10px 12px" }}>
              <span style={{ fontSize: 15, fontWeight: "bold" }}>{z.nazov}</span>
              {z.odbornik && <span style={{ fontSize: 11, color: C.purple, border: `1px solid rgba(175,169,236,.4)`, borderRadius: 20, padding: "2px 8px", marginLeft: 4 }}>✓ odborník</span>}
              <div style={{ fontSize: 13, color: C.textSec, margin: "5px 0", lineHeight: 1.45 }}>{z.pribeh}</div>
              <div style={{ fontSize: 11.5, color: C.textTer }}>{z.lok}</div>
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 38, height: 38, lineHeight: "38px", textAlign: "center", borderRadius: 7, background: "rgba(139,124,255,.16)", color: "var(--a-plum)", fontSize: 17, flex: "0 0 auto" }}>{z.ikona}</div>
            <div style={{ marginLeft: 10 }}>
              <div style={{ fontSize: 14.5 }}><b>{z.nazov}</b> <span style={{ fontSize: 11, color: C.textTer }}>ponuka</span></div>
              <div style={{ fontSize: 13, color: C.textSec }}>{z.pribeh} · {z.lok}</div>
            </div>
          </>
        )}
      </div>
    );
  }
  // charity
  return (
    <div style={{ margin: wide ? 0 : "11px 13px", border: `1px solid rgba(91,155,255,.28)`, borderRadius: 13, background: z.sponzor ? "rgba(91,155,255,.07)" : "rgba(255,255,255,.04)", padding: "10px 13px", display: "flex", alignItems: "center", gap: 10 }}>
      {z.fotky ? (
        <FotoPrispevku fotky={z.fotky} emoji={z.ikona} h={38} w={38} radius={7} />
      ) : (
        <div style={{ width: z.sponzor ? 36 : 30, height: z.sponzor ? 36 : 30, lineHeight: z.sponzor ? "36px" : "30px", textAlign: "center", borderRadius: 9, background: z.sponzor ? "#fff" : "rgba(91,155,255,.12)", color: z.sponzor ? C.blue : "#A9C8F0", fontSize: z.sponzor ? 10 : 9, fontWeight: "bold", flex: "0 0 auto" }}>{z.ikona}</div>
      )}
      <div>
        <div style={{ fontSize: z.sponzor ? 14.5 : 13.5 }}><b>{z.nazov}</b> {z.sponzor ? <span style={{ fontSize: 11, color: C.greenL, border: `1px solid rgba(127,203,160,.4)`, borderRadius: 10, padding: "2px 8px" }}>sponzorované</span> : <span style={{ fontSize: 11, color: C.textTer }}>hľadá pomoc</span>}</div>
        <div style={{ fontSize: 12.5, color: C.textSec, marginTop: 3 }}>{z.pribeh}</div>
      </div>
    </div>
  );
}

// ===================== DETAIL ŽIADOSTI =====================
function Detail({ z, onBack }: { z: any; onBack: () => void }) {
  const [platba, setPlatba] = useState<string | null>(null); // "EUR" | "DEED"
  const [suma, setSuma] = useState(z.suma);
  const [ludia, setLudia] = useState(z.ludia);
  const otvorGaleriu = useGaleria();

  const hash = () => "0x" + Math.random().toString(16).slice(2, 8) + "…" + Math.random().toString(16).slice(2, 6);

  function posliPevne(hodnota: number, kanal: string) {
    setSuma((s: number) => s + (kanal === "SMS" ? 1 : hodnota * 0.01)); // DEED ~0,01€ ilustračne
    setLudia((l: number) => l + 1);
    toast(`Odoslané: ${hodnota} ${kanal} · ⛓ ${hash()}`);
  }
  function platbaHotova(s: number) {
    setSuma((x: number) => x + s * (platba === "EUR" ? 1 : 0.01));
    setLudia((l: number) => l + 1);
    toast(`Odoslané: ${platba === "EUR" ? s + " €" : s + " DEED"} · ⛓ ${hash()}`);
  }

  const pct = Math.min(100, Math.round(suma / z.ciel * 100));

  return (
    <div style={{ paddingBottom: 30 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", ...glassTmavy(18, .55), borderLeft: "none", borderRight: "none", borderTop: "none" }}>
        <span onClick={onBack} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSec, cursor: "pointer", flex: "0 0 auto" }}><IkonaSpat size={17} color={C.textSec} /></span>
        <span style={{ fontSize: 13, fontWeight: "bold", color: C.blueL, background: "rgba(91,155,255,.12)", border: `1px solid rgba(91,155,255,.3)`, borderRadius: 9, padding: "3px 10px" }}>#47 821</span>
        <span style={{ fontSize: 11, fontWeight: "bold", color: z.sponzor ? C.gold : C.blueL }}>{z.sponzor ? "D++" : "D+"}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14, color: C.textTer }}><Zdielanie size={17} color={C.textTer} /><IkonaVlajka size={16} color={C.textTer} /></span>
      </div>

      {/* hero foto — klik = celá obrazovka, swipe medzi fotkami */}
      <div style={{ position: "relative" }}>
        <Foto src={z.fotky && z.fotky[0]} emoji="🖼" h={175} onClick={() => z.fotky?.length && otvorGaleriu(z.fotky, 0)} />
        <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.55)", borderRadius: 20, padding: "4px 10px", fontSize: 10, color: "var(--a-green)", pointerEvents: "none", display: "inline-flex", alignItems: "center", gap: 5 }}><IkonaFoto size={12} color="var(--a-green)" /> foto z prípadu</span>
        {z.fotky?.length > 1 && <span style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.6)", borderRadius: 12, padding: "3px 9px", fontSize: 10, color: "#fff", pointerEvents: "none" }}>⧉ {z.fotky.length} · klikni na foto</span>}
      </div>
      <MiniFotky fotky={z.fotky} />

      {/* meta */}
      <div style={{ padding: "13px 14px", borderBottom: `1px solid ${C.line2}`, display: "flex", gap: 11, alignItems: "center" }}>
        <Avatar src={z.avatar} emoji="👤" size={46} border={`1px solid rgba(127,203,160,.5)`} />
        <div>
          <div style={{ fontSize: 16, fontWeight: "bold" }}>{z.nazov} {z.overeny && <span style={{ fontSize: 9, color: C.greenL, border: `1px solid rgba(127,203,160,.4)`, borderRadius: 20, padding: "1px 6px" }}>overená</span>}</div>
          <div style={{ marginTop: 4 }}><span style={{ fontSize: 9, fontWeight: 700, background: "rgba(240,199,90,.12)", border: "1px solid rgba(240,199,90,.3)", color: C.gold, borderRadius: 10, padding: "2px 7px" }}>⭐ {z.karma}</span> <span style={{ fontSize: 11, color: C.textTer }}>📍 {z.lok} · 1 deň</span></div>
        </div>
      </div>

      {/* pribeh */}
      <div style={{ padding: "14px 16px 10px", fontSize: 14, lineHeight: 1.5, color: C.text }}>{z.pribeh}</div>

      {/* D++ sponzor */}
      {z.sponzor && (
        <div style={{ margin: "0 14px 12px", background: "rgba(224,169,61,.08)", border: `1px solid rgba(224,169,61,.35)`, borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: "#fff", color: "#0B3D91", fontSize: 10, fontWeight: "bold", borderRadius: 6, padding: "5px 8px" }}>{z.sponzor.meno}</span>
          <div style={{ fontSize: 11.5, color: C.textSec, lineHeight: 1.4 }}>
            <b>{z.sponzor.meno} pomohol sumou {z.sponzor.suma} €</b> · D++ sponzor žiadosti<br />
            <span style={{ color: C.textTer }}>transparentná suma · ⛓ blockchain dôkaz · ESG dopad (ESRS S3)</span>
          </div>
        </div>
      )}

      {/* progres */}
      <div style={{ margin: "0 14px 16px", background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div><span style={{ fontSize: 26, fontWeight: "bold" }}>{Math.round(suma)} €</span> <span style={{ fontSize: 13, color: C.textTer }}>z {z.ciel} €</span></div>
          <span style={{ fontSize: 16, fontWeight: "bold", color: C.greenL }}>{pct} %</span>
        </div>
        <div style={{ position: "relative", height: 12, borderRadius: 7, background: "rgba(var(--glass-rgb),.1)", margin: "11px 0 9px", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 7, transition: "width .6s ease", boxShadow: "0 0 14px rgba(43,212,155,.5)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
          <span style={{ color: C.textSec }}>👥 {ludia} ľudí pomohlo</span>
          <span style={{ color: C.greenL }}>● rastie live</span>
        </div>
      </div>

      {/* jednotná sekcia podpory */}
      <div style={{ padding: "0 14px 14px" }}>
        <PodporaSekcia
          onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
          upvotes={140} onUpvote={() => toast("Palec hore")}
          onPodpor={(s: number) => posliPevne(s, "DEED")} onSms={() => posliPevne(1, "SMS")}
          onKanal={(k: string) => setPlatba(k)} />
      </div>

      {/* simulácia platby (EUR karta / DEED peňaženka) */}
      {platba && <PlatbaModal kanal={platba} komu={z.nazov} onClose={() => setPlatba(null)} onDone={platbaHotova} />}
    </div>
  );
}

function Pevne({ emoji, val, w, bg, bd, col, onClick }: { emoji: string; val: string; w: number; bg: string; bd: string; col: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ width: w, textAlign: "center", borderRadius: 9, background: bg, border: `1px solid ${bd}`, padding: "9px 0", cursor: "pointer" }}>
      <div style={{ fontSize: 15 }}>{emoji}</div>
      <div style={{ fontSize: 11, fontWeight: "bold", color: col }}>{val}</div>
    </div>
  );
}

// ===================== ADD — rázcestník =====================
function Add({ onBack, onOffer, onRequest }: { onBack: () => void; onOffer: () => void; onRequest: () => void }) {
  return (
    <div>
      <Hlavicka title="Pridať" onBack={onBack} />
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 15, color: C.textSec, marginBottom: 18 }}>Čo chceš spraviť?</div>
        <BigChoice emoji="🤝" title="PONÚKAM" desc="Dám svoj čas, schopnosť alebo vec — pomôžem niekomu." col={C.purple} onClick={onOffer} />
        <BigChoice emoji="🙋" title="DOPYTUJEM" desc="Niečo potrebujem — ľudskú pomoc alebo finančnú podporu." col={C.blueL} onClick={onRequest} />
      </div>
    </div>
  );
}

function BigChoice({ emoji, title, desc, col, onClick }: { emoji: string; title: string; desc: string; col: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ border: `1px solid ${col}55`, background: `${col}14`, borderRadius: 16, padding: 18, marginBottom: 14, cursor: "pointer" }}>
      <div style={{ fontSize: 30 }}>{emoji}</div>
      <div style={{ fontSize: 18, fontWeight: "bold", color: col, marginTop: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.textSec, marginTop: 4, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

// ===================== PONÚKAM — flow =====================
function OfferFlow({ onDone }: { onDone: () => void }) {
  const [krok, setKrok] = useState(1);
  const [typ, setTyp] = useState<string | null>(null);
  const [uroven, setUroven] = useState<string | null>(null);
  const [popis, setPopis] = useState("");

  return (
    <div>
      <Hlavicka title="Ponúkam pomoc" onBack={onDone} step={krok} total={3} />
      <div style={{ padding: 18 }}>
        {krok === 1 && (
          <>
            <Otazka>Čo ponúkaš?</Otazka>
            {[["🎓", "Schopnosť / znalosť", "doučím, naučím, poradím, opravím"], ["⏱", "Čas / ruky", "sťahovanie, výpomoc, postrážim"], ["📦", "Vec", "darujem nábytok, oblečenie, náradie"]].map((t, i) => (
              <Vyber key={i} emoji={t[0]} title={t[1]} desc={t[2]} active={typ === t[1]} onClick={() => { setTyp(t[1]); setKrok(2); }} />
            ))}
          </>
        )}
        {krok === 2 && (
          <>
            <Otazka>Detail ponuky</Otazka>
            <textarea value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="Čo presne ponúkaš, kde a kedy? Napr. „Doučím matematiku ZŠ/SŠ, víkendy, online alebo u mňa.“"
              style={inp(90)} />
            <Otazka>Si v tom amatér alebo odborník?</Otazka>
            <Vyber emoji="🙂" title="Amatér" desc="Pomôžem ako viem — ide live takmer hneď." active={uroven === "amater"} onClick={() => setUroven("amater")} />
            <Vyber emoji="🎖" title="Odborník" desc="Doložím podklady (certifikát, web, prax) → vyšší vstupný status, zvyšok dvíha komunita." active={uroven === "odbornik"} onClick={() => setUroven("odbornik")} />
            <NavBtns onBack={() => setKrok(1)} onNext={() => setKrok(3)} canNext={!!(popis && uroven)} />
          </>
        )}
        {krok === 3 && (
          <>
            <Otazka>Zhrnutie</Otazka>
            <Suhrn rows={[["Typ", typ], ["Úroveň", uroven === "odbornik" ? "Odborník (doloží podklady)" : "Amatér"], ["Popis", popis]]} />
            {uroven === "odbornik" && <div style={infoBox}>Odborník: pred zverejnením doložíš podklady. AI z nich určí vstupný status karmy v odbore.</div>}
            <button onClick={onDone} style={{ ...btn("primary"), width: "100%", marginTop: 14 }}>Zverejniť ponuku</button>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== DOPYTUJEM — flow =====================
function RequestFlow({ onDone }: { onDone: () => void }) {
  const [vetva, setVetva] = useState<string | null>(null); // 'ludska' | 'peniaze'
  const [krok, setKrok] = useState(0);
  const [preKoho, setPreKoho] = useState<string | null>(null);
  const [popis, setPopis] = useState("");
  const [suma, setSuma] = useState("");
  const [suhlas, setSuhlas] = useState(false);
  const [retaz, setRetaz] = useState("necham");

  const sumaNum = Number(suma || 0);
  const p = sumaNum ? pasmo(sumaNum) : null;

  // VÝBER VETVY
  if (!vetva) {
    return (
      <div>
        <Hlavicka title="Dopytujem" onBack={onDone} />
        <div style={{ padding: 18 }}>
          <Otazka>Akú pomoc potrebuješ?</Otazka>
          <Vyber emoji="🧑‍🤝‍🧑" title="Ľudská pomoc" desc="Odvoz, sťahovanie, doučovanie, spoločníčka… (nefinančné)" onClick={() => { setVetva("ludska"); setKrok(1); }} />
          <Vyber emoji="💶" title="Finančná pomoc" desc="Potrebujem peniaze v núdzi." onClick={() => { setVetva("peniaze"); setKrok(0); }} />
        </div>
      </div>
    );
  }

  // ĽUDSKÁ POMOC (zjednodušený tok – zrkadlo ponuky)
  if (vetva === "ludska") {
    return (
      <div>
        <Hlavicka title="Ľudská pomoc" onBack={() => setVetva(null)} />
        <div style={{ padding: 18 }}>
          <Otazka>Opíš, s čím potrebuješ pomôcť</Otazka>
          <textarea value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="Napr. „Potrebujem odviezť k lekárovi v stredu ráno, Sihoť → nemocnica.“" style={inp(100)} />
          <div style={infoBox}>AI posúdi relevanciu (či to nevyrieši bežná cesta) a navrhne kategóriu. Po zverejnení sa ti ozve niekto z okolia → chat → dohoda → QR na mieste.</div>
          <button onClick={onDone} disabled={!popis} style={{ ...btn(popis ? "primary" : "disabled"), width: "100%", marginTop: 14 }}>Zverejniť dopyt</button>
        </div>
      </div>
    );
  }

  // FINANČNÁ POMOC — wizard
  const steps = ["Podmienky", "Pre koho", "Opis", "Suma", "Doklady", "Foto", "Kanál", "Potvrdenie"];
  return (
    <div>
      <Hlavicka title="Finančná pomoc" onBack={() => krok === 0 ? setVetva(null) : setKrok(krok - 1)} step={krok + 1} total={steps.length} />
      <div style={{ padding: 18 }}>

        {krok === 0 && (
          <>
            <Otazka>Podmienky — prečítaj a potvrď</Otazka>
            <div style={{ ...infoBox, lineHeight: 1.5 }}>
              • Uvedené informácie musia byť <b>pravdivé</b>. Klamstvo = ban (10 rokov / doživotne) a možné právne kroky.<br /><br />
              • <b>Nepreplácame</b> žiadne náklady (notár, doklady atď.).<br /><br />
              • Žiadosť po vyhodnotení <b>nemusí byť schválená</b> (nemáš na zverejnenie nárok).<br /><br />
              • Posúdenie do <b>48 h</b>; pri pochybnosti môžeme žiadať ďalšie doklady.
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={suhlas} onChange={(e) => setSuhlas(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 13 }}>Rozumiem a súhlasím so všetkými podmienkami.</span>
            </label>
            <button onClick={() => setKrok(1)} disabled={!suhlas} style={{ ...btn(suhlas ? "primary" : "disabled"), width: "100%", marginTop: 16 }}>Pokračovať</button>
          </>
        )}

        {krok === 1 && (
          <>
            <Otazka>Pre koho je žiadosť?</Otazka>
            <Vyber emoji="🙋" title="Pre seba" desc="KYC + môj účet." active={preKoho === "seba"} onClick={() => { setPreKoho("seba"); setKrok(2); }} />
            <Vyber emoji="👥" title="Pre iného" desc="Príjemca má účet u nás (alebo prijmem za neho, verejne uvedené)." active={preKoho === "iny"} onClick={() => { setPreKoho("iny"); setKrok(2); }} />
            <Vyber emoji="🏛" title="Cez Charitu" desc="Vysoká suma / príjemca bez účtu → zastreší partnerská charita." active={preKoho === "charita"} onClick={() => { setPreKoho("charita"); setKrok(2); }} />
          </>
        )}

        {krok === 2 && (
          <>
            <Otazka>Opíš svoj problém vlastnými slovami</Otazka>
            <textarea value={popis} onChange={(e) => setPopis(e.target.value)} placeholder="Prečo si sa do situácie dostal, čo presne vyrieši požadovaná suma, prečo to nezvládneš inak." style={inp(130)} />
            <div style={infoBox}>AI z opisu odporučí kategóriu a pomôže s formuláciou. Pri nezmysle alebo vnútornom rozpore požiada o doplnenie.</div>
            <NavBtns onBack={() => setKrok(1)} onNext={() => setKrok(3)} canNext={popis.length > 15} />
          </>
        )}

        {krok === 3 && (
          <>
            <Otazka>Odhadovaná výška pomoci</Otazka>
            <input type="number" value={suma} onChange={(e) => setSuma(e.target.value)} placeholder="suma v €" style={{ ...inp(0), height: "auto", padding: "12px", fontSize: 18 }} />
            {p && <div style={{ ...infoBox, borderColor: p.blok ? "rgba(226,87,75,.4)" : "rgba(93,155,232,.4)", background: p.blok ? C.redBg : "rgba(93,155,232,.08)", color: p.blok ? C.red : C.blueL }}>{p.text}</div>}
            <NavBtns onBack={() => setKrok(2)} onNext={() => setKrok(4)} canNext={sumaNum >= 100} />
          </>
        )}

        {krok === 4 && (
          <>
            <Otazka>Doklady k tvrdeniam</Otazka>
            <div style={infoBox}>AI rozloží tvoj príbeh na tvrdenia a požiada doklad ku každému (napr. úmrtný list, lekárska správa, exekučný príkaz). <b>Citlivé doklady idú len do overenia — nikdy do feedu.</b></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <DokladRow text="Lekárska správa" />
              <DokladRow text="Doklad o príjme / nájme" />
            </div>
            <NavBtns onBack={() => setKrok(3)} onNext={() => setKrok(5)} canNext={true} />
          </>
        )}

        {krok === 5 && (
          <>
            <Otazka>Foto / video k prípadu (verejné)</Otazka>
            <div style={{ height: 120, border: `1px dashed ${C.line}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: C.textTer, fontSize: 13, cursor: "pointer" }}>＋ Pridať foto alebo video</div>
            <div style={infoBox}>Foto prípadu = vyššia dôvera a väčší dosah. Bez fota = nižšia dôvera, lokálny dosah. Osobné foto (tvár) = najvyššia dôvera. Oddelené od dokladov.</div>
            <NavBtns onBack={() => setKrok(4)} onNext={() => setKrok(6)} canNext={true} />
          </>
        )}

        {krok === 6 && (
          <>
            <Otazka>Ako chceš prijímať podporu?</Otazka>
            {["DEED (wallet)", "EUR (euro na účet)", "SMS"].map((k, i) => (
              <div key={i} style={{ ...vyberBox(false), display: "flex", justifyContent: "space-between" }}>
                <span>{k}</span><span style={{ fontSize: 11, color: C.textTer }}>poplatok vopred</span>
              </div>
            ))}
            {sumaNum > 2400 && (
              <>
                <Otazka>Nad 2400 € — reťaz dobra</Otazka>
                <div style={infoBox}>Suma nad 2400 €/rok podlieha dani z príjmu. Môžeš ju zdaniť, alebo prebytok poslať ďalšiemu.</div>
                <Vyber emoji="🧾" title="Zdaním sám" desc="Prebytok si nechám, zdaním v priznaní." active={retaz === "zdanim"} onClick={() => setRetaz("zdanim")} />
                <Vyber emoji="🔗" title="Reťaz dobra" desc="Prebytok nad 2400 € pošlem ďalšiemu (sektor vyberiem teraz alebo pri naplnení)." active={retaz === "retaz"} onClick={() => setRetaz("retaz")} />
              </>
            )}
            <NavBtns onBack={() => setKrok(5)} onNext={() => setKrok(7)} canNext={true} />
          </>
        )}

        {krok === 7 && (
          <>
            <Otazka>Potvrdenie</Otazka>
            <Suhrn rows={[
              ["Pre koho", preKoho === "seba" ? "Pre seba" : preKoho === "iny" ? "Pre iného" : "Cez Charitu"],
              ["Suma", `${sumaNum} € (pásmo ${p?.kod})`],
              ["Opis", popis.slice(0, 60) + (popis.length > 60 ? "…" : "")],
            ]} />
            <div style={{ ...infoBox, marginTop: 10 }}>Potvrdzujem, že informácie sú pravdivé a doklady pravé. Rozumiem dôsledkom klamstva.</div>
            <button onClick={onDone} style={{ ...btn("primary"), width: "100%", marginTop: 14 }}>Vytvoriť žiadosť</button>
            <div style={{ textAlign: "center", fontSize: 11, color: C.textTer, marginTop: 8 }}>Po vytvorení: posúdenie do 48 h → schválené → live.</div>
          </>
        )}
      </div>
    </div>
  );
}
