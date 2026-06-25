import { useState, useEffect } from "react";
import { C, U, inp, GRAD, GRAD_ZELENY } from "../theme";
import { Foto, FotoPrispevku, MiniFotky, Modal, Video, ModulHlavicka, Hlavicka, PodporaSekcia, PlatbaModal, HladanieModal, Toast, Oslava, useGaleria, useScrollHore, useMotiv, StatRiadok, MoniBar, FeedStlpce, SekcieBar, Lupa, Zvon, Zdielanie, IkonaSipVlavo, IkonaMoznosti, IkonaUlozit, IkonaFajka, OkruhVyber, QrModal } from "../shared";
import { pripravFeed, FEED_CFG } from "../lib/feed";
import { usePouzivatel } from "../lib/pouzivatel";
import { zobrazVelkost } from "../lib/cardSize";
import { RetazDobraSheet } from "../RetazDobra";
import { Zvoncek } from "../Notifikacie";
import { CudziProfil } from "../CudziProfil";

// zostav subjekt cudzieho profilu z položky feedu (autor → org/charita alebo osoba)
const autorSubjekt = (it) => it.zdroj === "Charity"
  ? { typ: "org", meno: it.autor, emoji: it.emoji, lok: it.lok, level: it.charLevel || "Gold" }
  : { typ: "osoba", meno: it.autor, level: it.karma || "Silver" };

// poloha usera (MVP mock — Trenčín, Sihoť). Neskôr z GPS/profilu.
const USER_LOK = { lat: 48.894, lng: 18.044 };

/*
  ============================================================
  MODUL DOMOV (DEED Good) — port z deed_prototype.html
  feed skutkov → detail (podpora, QR, overenie komunitou)
  → overujem/namietam → ＋ pridať skutok (AI náhľad)
  ============================================================
*/

// ---- kategórie ----
const KAT = {
  Komunita: { c: "#5BA8F0", bg: "#10233a", bg2: "#1d3f63", bd: "#2A5E8E" },
  Priroda: { c: "#3DD68C", bg: "#0f2417", bg2: "#1c4029", bd: "#2E7D52", label: "Príroda" },
  Zdravie: { c: "#3DD6CE", bg: "#0d2422", bg2: "#163f3a", bd: "#2E9E9E" },
  Ucenie: { c: "#A98BF0", bg: "#1a1430", bg2: "#2c2350", bd: "#7A5BD8", label: "Učenie" },
  Pomoc: { c: "#F2706F", bg: "#2a1414", bg2: "#451f1f", bd: "#7A3030" },
};
const katLabel = (k) => KAT[k].label || k;

// ---- mock feed skutkov ----
const POLOZKY = [
  { id: 12, typ: "skutok", velkost: "big", kat: "Komunita", media: "video", overene: true,
    skore: 7.5, typSituacie: "normal", modul: "good", lat: 48.905, lng: 18.030, dni: 0, podpora: 18,
    autor: "Mária H.", pfp: "#3A8DD6", ini: "M", karma: "Gold", lok: "Trenčín · Sihoť", cas: "práve teraz", num: 120051,
    titul: "Spravila som veľký nákup pani Helene (84) — sama už ťažké tašky neunesie.",
    popis: "Pani Helena z vedľajšieho vchodu je po operácii bedrového kĺbu a do obchodu sa sama nedostane. Spísali sme zoznam, nakúpila som a doniesla jej to až do bytu. Celý nákup je natočený ako dôkaz — pozri video.",
    emoji: "🛒", suma: 64, lajky: 47, vyznam: "Overený skutok",
    video: "/video/nakup.mp4",
    fotky: [U("photo-1542838132-92c53300491e"), U("photo-1556909114-f6e7ad7d3136")] },

  { id: 1, typ: "skutok", velkost: "big", kat: "Komunita", media: "video", overene: true,
    skore: 8.5, typSituacie: "normal", modul: "good", lat: 48.905, lng: 18.030, dni: 0, podpora: 14,
    autor: "Dobrovoľní hasiči TN", pfp: "#3A8DD6", ini: "H", karma: "Gold", lok: "Trenčín · Sihoť", cas: "2 h", num: 120042,
    titul: "Celú noc sme hľadali nezvestného dôchodcu — našli sme ho.",
    popis: "O 23:00 nahlásili nezvestného 78-ročného pána. Prehľadávali sme les pri Váhu do rána. Našli sme ho prechladnutého, ale živého.",
    emoji: "🚒", suma: 177, lajky: 23, vyznam: "Výnimočný skutok",
    fotky: [U("photo-1519681393784-d120267933ba"), U("photo-1441974231531-c6227db76b6e"), U("photo-1448375240586-882707db888b")] },

  { id: 2, typ: "skutok", velkost: "med", kat: "Priroda", media: "foto",
    skore: 4.5, typSituacie: "normal", modul: "good", lat: 48.875, lng: 18.030, dni: 0, podpora: 11,
    autor: "EkoTím Juh", pfp: "#2E7D52", ini: "E", karma: "Silver", lok: "Trenčín · Juh", cas: "5 h", num: 120038,
    titul: "Vyčistili sme čiernu skládku pri potoku — 14 vriec odpadu.",
    popis: "Partia 6 ľudí. Za sobotné dopoludnie sme vyniesli 14 vriec odpadu, ktoré tam roky niekto vyhadzoval.",
    emoji: "🌿", suma: 84, lajky: 31,
    fotky: [U("photo-1542601906990-b4d3fb778b09"), U("photo-1470071459604-3b5ec3a7fe05")] },

  { id: 3, typ: "ziadost", velkost: "req", kat: "Pomoc", zdroj: "Help", topovane: true,
    skore: 9, typSituacie: "normal", modul: "help", lat: 48.903, lng: 18.033, dni: 0, podpora: 12,
    autor: "Rodina Kováčová", pfp: "#7A3030", ini: "R", lok: "Trenčín · tvoja štvrť", cas: "1 h", num: 120044,
    titul: "Po povodni nám zatopilo pivnicu — hľadáme pomoc",
    popis: "Voda nám zničila kotol a nábytok v suteréne. Sami to nezvládneme. Prosíme o pomoc s odpratávaním v sobotu a o príspevok na nový kotol.",
    ciel: 2400, vyzbierane: 1450, emoji: "⚠", pomocnici: 12,
    fotky: ["/img/dom.jpg", U("photo-1500382017468-9049fed747ef")] },

  { id: 4, typ: "charita", velkost: "med", kat: "Komunita", zdroj: "Charity", overene: true, charLevel: "Gold",
    skore: 8, typSituacie: "normal", modul: "charity", narodne: true, lat: 48.146, lng: 17.107, dni: 0, podpora: 40,
    autor: "Detská nemocnica – nadácia", pfp: "#3A8DD6", ini: "D", lok: "Bratislava", cas: "3 h", num: 120031,
    titul: "Zbierka na nový inkubátor pre novorodenecké oddelenie",
    popis: "Overená charita. Vyzbierané prostriedky idú výhradne na kúpu inkubátora. Doklady o použití zverejníme na profile.",
    ciel: 18000, vyzbierane: 11200, emoji: "🏥", suma: 0, lajky: 204,
    fotky: [U("photo-1584308666744-24d5c474f2ae"), U("photo-1579684385127-1ef15d508118")] },

  { id: 5, typ: "skutok", velkost: "small", kat: "Zdravie", media: "foto",
    skore: 2.5, typSituacie: "normal", modul: "good", lat: 48.894, lng: 18.044, dni: 1, podpora: 4,
    autor: "Martin K.", pfp: "#3DD6CE", ini: "M", karma: "Gold", lok: "Trenčín", cas: "1 d", num: 120020,
    titul: "Odviezol som suseda na dialýzu", popis: "Sused nemá auto a MHD mu to komplikuje. Vozím ho 3× týždenne.",
    emoji: "🚗", suma: 30, lajky: 12 },

  { id: 6, typ: "skutok", velkost: "small", kat: "Ucenie", media: "kreslene",
    skore: 2.0, typSituacie: "normal", modul: "good", lat: 48.882, lng: 18.060, dni: 1, podpora: 9,
    autor: "Lucia B.", pfp: "#A98BF0", ini: "L", karma: "Bronze", lok: "Trenčín · Noviny", cas: "1 d", num: 120018,
    titul: "Doučujem deti angličtinu zadarmo", popis: "Každý štvrtok poobede pre deti z okolia, ktoré si platené doučovanie nemôžu dovoliť.",
    emoji: "📚", suma: 45, lajky: 28 },

  { id: 7, typ: "charita", velkost: "small", kat: "Komunita", zdroj: "Charity", overene: true, charLevel: "Silver",
    skore: 5, typSituacie: "normal", modul: "charity", narodne: true, lat: 48.700, lng: 19.700, dni: 1, podpora: 30,
    autor: "Lidl pomáha – nadácia", pfp: "#5BA8F0", ini: "L", lok: "celá SR", cas: "1 d", num: 120015,
    titul: "Firma zdvojnásobí každý dar zamestnanca", popis: "Daruj €50, Lidl pridá ďalších €50. Matching kampaň na detské ihriská.",
    emoji: "🤝", suma: 0, lajky: 156 },

  { id: 8, typ: "skutok", velkost: "small", kat: "Zdravie", media: "kreslene",
    skore: 2.8, typSituacie: "normal", modul: "good", lat: 48.894, lng: 18.044, dni: 2, podpora: 13,
    autor: "Anonym", pfp: "#2E9E9E", ini: "A", karma: "Silver", lok: "Trenčín", cas: "2 d", num: 120009,
    titul: "Daroval krv po výzve nemocnice", popis: "Nemocnica hlásila kritický nedostatok 0-. Išiel som hneď ráno.",
    emoji: "🩸", suma: 50, lajky: 41 },

  { id: 9, typ: "ziadost", velkost: "small", kat: "Pomoc", zdroj: "Help",
    skore: 4, typSituacie: "normal", modul: "help", lat: 48.892, lng: 18.020, dni: 2, podpora: 3,
    autor: "Jozef M.", pfp: "#7A3030", ini: "J", lok: "Trenčín · Zámostie", cas: "2 d", num: 120005,
    titul: "Po úraze sa neviem dostať na rehabilitácie", popis: "Potrebujem odvoz na rehabilitácie 2× týždenne, kým sa nezotavím.",
    ciel: 0, vyzbierane: 0, emoji: "🦽", pomocnici: 3, otvorenaPodpora: true },

  { id: 10, typ: "skutok", velkost: "small", kat: "Komunita", media: "foto",
    skore: 1.6, typSituacie: "normal", modul: "good", lat: 48.905, lng: 18.030, dni: 2, podpora: 6,
    autor: "Tomáš R.", pfp: "#5BA8F0", ini: "T", karma: "Gold", lok: "Trenčín · Sihoť", cas: "2 d", num: 119998,
    titul: "Naučil som babičku volať cez videohovor", popis: "Aby mohla vidieť vnúčatá v zahraničí. Trvalo to hodinu, ale zvládla to.",
    emoji: "📱", suma: 20, lajky: 18 },

  { id: 11, typ: "skutok", velkost: "med", kat: "Priroda", media: "foto",
    skore: 4.0, typSituacie: "normal", modul: "good", lat: 48.920, lng: 18.100, dni: 3, podpora: 7,
    autor: "Cyklo Trenčín", pfp: "#2E7D52", ini: "C", karma: "Silver", lok: "Trenčín → Nemšová", cas: "3 d", num: 119980,
    titul: "Mesiac do práce na bicykli namiesto auta — 240 km", popis: "Nahradil som auto bicyklom. Ušetrené CO2 sa pripočítava do eko skutkov.",
    emoji: "🚲", suma: 62, lajky: 22,
    fotky: [U("photo-1517649763962-0c623066013b"), U("photo-1476514525535-07fb3b4ae5f1")] },
];

const heroGrad = (kat) => `linear-gradient(160deg, ${KAT[kat].bg}, ${KAT[kat].bg2})`;
// hex → priesvitné rgba (akcentové tinty fungujúce v tmavom aj svetlom režime)
const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
// jednotný „glass" odznak na médiu karty
const mediaBadge = (extra) => ({ position: "absolute", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 9, background: "rgba(8,11,18,.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.14)", color: "#fff", pointerEvents: "none", ...extra });

// ---- NÁSTENKA — udalosti v okolí ----
const SRC_COL = { Komunita: "#A98BF0", Mesto: "#7FC2EF", Partner: "#C264D8" };
const EVENTS = [
  { id: "e1", top: true, when: "ŠTV 18:00", title: "Mentálny tréning — bezplatný stream", who: "Coach Peter", src: "Komunita", kat: "Ucenie",
    desc: "Online stream o zvládaní stresu a sústredení. Pre všetkých so záujmom o šport a psychiku. Bezplatné, stačí sa prihlásiť.", place: "Online · stream", cap: "neobmedzené" },
  { id: "e2", top: true, when: "PIA 20:00", title: "Rocková noc v klube", who: "Music Club", src: "Partner", kat: "Komunita",
    desc: "Živá kapela, lokálni interpreti. B2B partner pozýva členov komunity so záujmom o rock. Vstup so zľavou cez DEED.", place: "Music Club, Trenčín", cap: "120 miest" },
  { id: "e3", top: true, when: "SO 09:00", title: "Beh pre zdravie", who: "Mesto Trenčín", src: "Mesto", kat: "Zdravie",
    desc: "Charitatívny beh mestom. Štartovné ide na detské ihriská. Trasy 5 a 10 km.", place: "Mierové námestie", cap: "500 bežcov" },
  { id: "e4", when: "SO 10:00", title: "Čistenie brehu Váhu", who: "Mesto Trenčín", src: "Mesto", kat: "Priroda",
    desc: "Dobrovoľnícka akcia — vyzbierame odpad pri rieke. Vrecia a rukavice zabezpečené. Vo tvojej štvrti.", place: "Breh Váhu, Sihoť", cap: "40 ľudí" },
  { id: "e5", when: "NE 15:00", title: "Joga v parku", who: "Coach Eva", src: "Komunita", kat: "Zdravie",
    desc: "Otvorená hodina jogy pre začiatočníkov. Prines si podložku. Pri dobrom počasí.", place: "Mestský park", cap: "25 miest" },
  { id: "e6", when: "UT 17:30", title: "Doučovanie matematiky", who: "Coach Ján", src: "Komunita", kat: "Ucenie",
    desc: "Doučovanie pre žiakov 2. stupňa. Bezplatné, organizované cez komunitu.", place: "Komunitné centrum", cap: "15 detí" },
  { id: "e7", when: "ST 19:00", title: "Diskusia o ekológii mesta", who: "Mesto Trenčín", src: "Mesto", kat: "Priroda",
    desc: "Verejná diskusia o zeleni a triedení odpadu v meste. Príď povedať svoj názor.", place: "Mestský úrad", cap: "80 miest" },
  { id: "e8", when: "PIA 16:00", title: "Workshop fotografie", who: "Coach Lucia", src: "Komunita", kat: "Zdravie",
    desc: "Základy mobilnej fotografie. Vezmi si telefón. Platený workshop (cez DEED/EUR).", place: "Ateliér, centrum", cap: "12 miest" },
];

// ===================== MODUL =====================
export default function ModulGood({ wide, otvorModul }) {
  const [screen, setScreen] = useState("home"); // home | detail | verify | add | board | event | cudzi
  const [aktId, setAktId] = useState(null);
  const [aktEvent, setAktEvent] = useState(null);
  const [aktSubjekt, setAktSubjekt] = useState(null); // cudzí profil (§6)
  const [predtym, setPredtym] = useState("home");     // kam sa vrátiť z cudzieho profilu
  const [verifyMode, setVerifyMode] = useState("ok");
  const [hlaska, setHlaska] = useState(null);
  const [oslava, setOslava] = useState(null); // {suma, komu}
  const [hladaj, setHladaj] = useState(false);

  const otvorProfil = (subjekt, odkial = "home") => { setAktSubjekt(subjekt); setPredtym(odkial); setScreen("cudzi"); };

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);

  const toast = (m) => { setHlaska(m); setTimeout(() => setHlaska((x) => (x === m ? null : x)), 2300); };
  const oslavuj = (suma, komu) => { setOslava({ suma, komu }); setTimeout(() => setOslava(null), 1900); };
  const obal = (el) => wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el;

  const akt = POLOZKY.find((x) => x.id === aktId);

  return (
    <div style={{ minHeight: "100%" }}>
      {screen === "home" && (
        <Home wide={wide} toast={toast} otvorModul={otvorModul}
          onDetail={(id) => { setAktId(id); setScreen("detail"); }}
          onHladaj={() => setHladaj(true)}
          onBoard={() => setScreen("board")}
          onAdd={() => setScreen("add")} />
      )}
      {screen === "cudzi" && aktSubjekt && obal(
        <CudziProfil subjekt={aktSubjekt} toast={toast} onBack={() => setScreen(predtym)} />
      )}
      {screen === "board" && obal(
        <GoodBoard onBack={() => setScreen("home")} onEvent={(id) => { setAktEvent(id); setScreen("event"); }} toast={toast} />
      )}
      {screen === "event" && obal(
        <GoodEvent id={aktEvent} onBack={() => setScreen("board")} toast={toast} oslavuj={oslavuj} />
      )}
      {screen === "detail" && akt && obal(
        <GoodDetail it={akt} toast={toast} oslavuj={oslavuj}
          onBack={() => setScreen("home")}
          onAutor={() => otvorProfil(autorSubjekt(akt), "detail")}
          onVerify={(mode) => { setVerifyMode(mode); setScreen("verify"); }} />
      )}
      {screen === "verify" && akt && obal(
        <GoodVerify it={akt} mode={verifyMode} toast={toast} onBack={() => setScreen("detail")} />
      )}
      {screen === "add" && obal(
        <GoodAdd toast={toast} oslavuj={oslavuj} onDone={() => setScreen("home")} />
      )}

      {/* oslava — jednotný celebration overlay (aura prsteň = podpis značky) */}
      {oslava && (
        <Oslava
          emoji={oslava.suma >= 100 ? "🎊" : oslava.suma >= 50 ? "⭐" : "😊"}
          title={oslava.suma >= 100 ? "Skvelé! Veľká podpora!" : "Ďakujeme!"}
          text={<>Tvoja podpora <b style={{ color: C.greenL }}>{oslava.suma} DEED</b> letí k {oslava.komu}. Reťaz dobra pokračuje.</>}
          onClose={() => setOslava(null)}
        />
      )}

      {hladaj && (
        <HladanieModal akcent="#5BA8F0" placeholder="Hľadať skutky, žiadosti, ľudí…"
          data={POLOZKY.map((it) => ({
            id: it.id, titul: it.titul, podtitul: `${it.autor} · ${it.lok}`, kat: it.kat, emoji: it.emoji,
            tag: it.typ === "ziadost" ? "Žiadosť" : it.typ === "charita" ? "Charita" : katLabel(it.kat),
          }))}
          onPick={(id) => { setAktId(id); setScreen("detail"); }}
          toast={toast} defaultFilter="Všetko"
          onClose={() => setHladaj(false)} />
      )}

      {hlaska && <Toast text={hlaska} />}
    </div>
  );
}

// ===================== HOME / FEED =====================
function Home({ wide, toast, otvorModul, onDetail, onHladaj, onBoard, onAdd }) {
  // zvolený rádius — Časť B: mení, ČO a v akom poradí sa vo feede zobrazí
  const [radius, setRadius] = useState("stvrt");
  const [vyberOkruh, setVyberOkruh] = useState(false);
  const ja = usePouzivatel();
  const user = { ...USER_LOK, radius };

  // FEED ALGORITMUS (Časť B): životnosť → rádius + adaptívny prah →
  // frekvenčný strop → zoradenie. Veľkosť karty (Časť A) cez zobrazVelkost.
  // Lacné: pracuje len s uloženým skóre, žiadne AI. (Neskôr: GET /feed na backende.)
  const feed = pripravFeed(POLOZKY, user).map((it) => ({ ...it, velkost: zobrazVelkost(it) }));
  const karta = (it) => <GoodKarta key={it.id} it={it} wide={wide} onDetail={() => onDetail(it.id)} />;

  return (
    <div style={{ paddingBottom: 14 }}>
      {/* header — jednotná hlavička (logo D⁺ + názov + hľadanie/upozornenia + profil) */}
      <ModulHlavicka title="Domov" karma={ja.demo ? "Gold · L7 · celková" : `${ja.tier} · celková`}
        right={
          <>
            <span onClick={onHladaj} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={C.textSec} /></span>
            <Zvoncek color={C.textSec} toast={toast} />
            <div onClick={() => otvorModul && otvorModul("profil")} title={ja.tier} style={{ width: 34, height: 34, borderRadius: "50%", background: ja.tint, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff", cursor: "pointer", flex: "0 0 auto", boxShadow: "0 0 0 2px rgba(240,199,90,.8), 0 0 12px rgba(240,199,90,.35)" }}>{ja.iniciala}</div>
          </>
        } />

      {/* jednotná sekcia skratiek */}
      <SekcieBar onTalent={() => toast("Ukáž svoj talent — TikTok kanál (demo)")} onBoard={onBoard} onAdd={onAdd} />

      {/* štatistický riadok — počet vo zvolenom okruhu + klikateľný výber okruhu */}
      <StatRiadok stat={`V okruhu ${feed.length} skutkov · Mesiac 9 480`} miesto={ja.mesto}
        okruh={FEED_CFG.radiusy[radius].krat} onOkruh={() => setVyberOkruh(true)} />

      {/* feed — na tablete/PC: skutky vľavo, žiadosti vpravo (už zoradené algoritmom) */}
      {feed.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: C.textTer, fontSize: 13 }}>
          V tomto okruhu zatiaľ nie sú dosť významné skutky. Skús menší okruh.
        </div>
      ) : (
        <FeedStlpce wide={wide}
          labelSkutky="Skutky" labelZiadosti="Žiadosti & charita"
          jednoStlpec={feed.map(karta)}
          skutky={feed.filter((it) => it.typ === "skutok").map(karta)}
          ziadosti={feed.filter((it) => it.typ !== "skutok").map(karta)}
        />
      )}

      {vyberOkruh && <OkruhVyber radius={radius}
        onPick={(r) => { setRadius(r); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}


function ZdrojTag({ it }) {
  if (it.zdroj === "Help") return <span style={{ display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: "rgba(242,112,111,.12)", color: "#F2706F" }}>Help · žiadosť</span>;
  if (it.zdroj === "Charity") return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, color: "#E7C766", background: "rgba(231,199,102,.13)", padding: "2px 7px", borderRadius: 6 }}>✓ Charita {it.charLevel || ""}</span>;
  return <span style={{ display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: tint(KAT[it.kat].c, .14), color: KAT[it.kat].c }}>{katLabel(it.kat)}</span>;
}

function GoodKarta({ it, wide, onDetail }) {
  const { svetly } = useMotiv();
  const mb = wide ? 0 : 12;
  // VEĽKÁ — profi karta (autor hore · médium v rámčeku/full-bleed · titul)
  if (it.velkost === "big") {
    const kat = KAT[it.kat];
    const overCol = svetly ? "#0F8A5E" : "#5CE6B8";
    const mediaH = wide ? 172 : 232;
    return (
      <div onClick={onDetail} className="good-card" style={{
        background: C.surface2,
        border: wide ? `1px solid ${C.line}` : "none",
        borderBottom: `1px solid ${wide ? C.line : C.line2}`,
        borderRadius: wide ? 18 : 0,
        marginLeft: wide ? 0 : -16, marginRight: wide ? 0 : -16,
        marginBottom: wide ? 0 : 10,
        overflow: "hidden", cursor: "pointer",
      }}>
        {/* autor */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 10px" }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", background: it.pfp, boxShadow: `0 3px 10px ${tint(kat.c, .3)}` }}>{it.ini}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.autor}</span>
              {it.overene && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, flex: "none", fontSize: 10, fontWeight: 700, color: overCol, background: "rgba(61,214,140,.14)", padding: "2px 7px", borderRadius: 7 }}><IkonaFajka size={11} color={overCol} /> overené</span>}
            </div>
            <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.lok} · č. {it.num.toLocaleString("sk")}</div>
          </div>
          <span style={{ fontSize: 11.5, color: C.textTer, flex: "none" }}>{it.cas}</span>
        </div>
        {/* médium */}
        <div style={{ position: "relative", height: mediaH, margin: wide ? "0 10px" : 0, borderRadius: wide ? 14 : 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.kat) }}>
          {it.video
            ? <Video src={it.video} poster={it.fotky?.[0]} h={mediaH} badge={false} />
            : it.fotky?.length
              ? <FotoPrispevku fotky={it.fotky} emoji={it.emoji} h={mediaH} disableGaleria />
              : <div style={{ fontSize: 46 }}>{it.emoji}</div>}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,.34), transparent 42%)", pointerEvents: "none" }} />
          {it.vyznam && <span style={mediaBadge({ top: 10, left: 10, color: "#F4D684" })}>★ {it.vyznam}</span>}
          {it.media === "video" && <span style={mediaBadge({ top: 10, right: 10 })}>▶ video</span>}
          <span style={mediaBadge({ bottom: 10, left: 10, color: kat.c })}><span style={{ width: 6, height: 6, borderRadius: "50%", background: kat.c }} /> {katLabel(it.kat)}</span>
        </div>
        {/* titul */}
        <div style={{ padding: "12px 14px 14px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.36, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.titul}</div>
        </div>
      </div>
    );
  }
  // ŽIADOSŤ
  if (it.velkost === "req") {
    return (
      <div onClick={onDetail} style={{ background: "rgba(242,112,111,.06)", border: "1px solid rgba(242,112,111,.32)", borderRadius: 17, marginBottom: mb, padding: 14, display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
        {it.fotky?.length
          ? <FotoPrispevku fotky={it.fotky} emoji={it.emoji} h={64} w={64} radius={11} disableGaleria />
          : <div style={{ width: 64, height: 64, borderRadius: 11, background: "rgba(242,112,111,.12)", border: "1px solid #7A3030", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#F2706F", flex: "none" }}>{it.emoji}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: C.red }}>{it.titul}</div>
            {it.topovane && <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: "rgba(242,112,111,.12)", color: C.red, marginLeft: "auto", flex: "none" }}>Topované</span>}
          </div>
          <div style={{ fontSize: 12.5, color: C.textSec, marginTop: 6 }}>{it.autor} · {it.lok}</div>
          {it.ciel ? (
            <div style={{ marginTop: 8 }}><MoniBar vyzbierane={it.vyzbierane} ciel={it.ciel} ludia={it.pomocnici} mini /></div>
          ) : (
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 6 }}>{it.pomocnici} ľudí sa zapojilo · otvorená podpora</div>
          )}
        </div>
      </div>
    );
  }
  // STREDNÁ
  if (it.velkost === "med") {
    const jeCharita = it.typ === "charita";
    return (
      <div onClick={onDetail} style={{ background: C.surface2, border: `1px solid ${jeCharita ? "#2A5E8E" : C.line}`, borderRadius: 16, marginBottom: mb, padding: 12, display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
        {it.fotky?.length
          ? <FotoPrispevku fotky={it.fotky} emoji={it.emoji} h={80} w={96} radius={11} disableGaleria />
          : <div style={{ width: 96, height: 80, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: heroGrad(it.kat) }}>{it.media === "kreslene" ? "✎" : it.emoji}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.35 }}>{it.titul}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: C.textSec }}>{it.autor}</span>
            <ZdrojTag it={it} />
          </div>
          {jeCharita && (<div style={{ marginTop: 6 }}><MoniBar vyzbierane={it.vyzbierane} ciel={it.ciel} mini /></div>)}
        </div>
        <span style={{ fontSize: 10, color: C.textTer, flex: "none" }}>{it.cas}</span>
      </div>
    );
  }
  // MALÝ RIADOK
  const jeZiadost = it.typ === "ziadost";
  const jeCharita = it.typ === "charita";
  const col = jeZiadost ? "#F2706F" : jeCharita ? "#5BA8F0" : KAT[it.kat].c;
  const bg = tint(col, .15);
  const ic = it.media === "kreslene" ? "✎" : jeZiadost ? "!" : jeCharita ? "✓" : "▦";
  return (
    <div onClick={onDetail} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${jeZiadost ? "rgba(242,112,111,.35)" : C.line2}`, borderRadius: 14, marginBottom: wide ? 0 : 8, cursor: "pointer" }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flex: "none", background: bg, color: col, border: `1px solid ${jeZiadost ? "#7A3030" : KAT[it.kat].bd}` }}>{ic}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", marginRight: 6, background: col }} />{it.titul}
        </div>
        <div style={{ fontSize: 11.5, color: C.textTer, marginTop: 3 }}>{it.autor} · {jeZiadost ? "žiadosť" : jeCharita ? "charita" : katLabel(it.kat)}{it.karma ? " · " + it.karma : ""}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={{ fontSize: 12, color: C.textTer }}>{it.cas}</div>
        <div style={{ color: "#5A606E", fontSize: 16 }}>›</div>
      </div>
    </div>
  );
}

// ===================== DETAIL =====================
function GoodDetail({ it, toast, oslavuj, onBack, onVerify, onAutor }) {
  const [platba, setPlatba] = useState(null); // "EUR" | "DEED"
  const [qr, setQr] = useState(false);        // QR skutku (§10) — 3 výstupy
  const otvorGaleriu = useGaleria();
  const jeZiadost = it.typ === "ziadost", jeCharita = it.typ === "charita";
  const maProgres = (jeZiadost && it.ciel) || jeCharita;
  const pct = maProgres ? Math.round(it.vyzbierane / it.ciel * 100) : 0;

  function podpor(suma) {
    toast(`Ďakujeme za ${suma} DEED pre ${it.autor}`);
    oslavuj(suma, it.autor);
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* hero */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.kat), ...(it.video ? {} : { height: 150 }) }}>
        {it.video
          ? <Video src={it.video} poster={it.fotky?.[0]} h={220} badge={false} />
          : it.fotky?.length
            ? <Foto src={it.fotky[0]} emoji={it.emoji} h={150} style={{ position: "absolute", inset: 0 }} onClick={() => otvorGaleriu(it.fotky, 0)} />
            : <div style={{ fontSize: 52 }}>{it.media === "kreslene" ? "✎" : it.emoji}</div>}
        <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, cursor: "pointer", zIndex: 2 }}><IkonaSipVlavo size={20} color="#fff" /></div>
        <div onClick={() => toast("⋯ možnosti")} style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", zIndex: 2 }}><IkonaMoznosti size={18} color="#fff" /></div>
        <span style={{ position: "absolute", bottom: 12, left: 14, pointerEvents: "none" }}><ZdrojTag it={it} /></span>
        {it.fotky?.length > 1 && <span style={{ position: "absolute", bottom: 12, right: 14, background: "rgba(0,0,0,.6)", borderRadius: 12, padding: "3px 9px", fontSize: 10, color: "#fff", pointerEvents: "none" }}>⧉ {it.fotky.length} · klikni na foto</span>}
      </div>
      <MiniFotky fotky={it.fotky} />

      <div style={{ padding: "14px 18px" }}>
        <div onClick={onAutor} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", background: it.pfp, flex: "none" }}>{it.ini}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{it.autor} <span style={{ fontSize: 11, color: C.textTer, fontWeight: 500 }}>›</span></div>
            <div style={{ fontSize: 12.5, color: C.textTer }}>{it.lok} · č. {it.num.toLocaleString("sk")}</div>
          </div>
          {it.overene && <span style={{ marginLeft: "auto", fontSize: 11, color: "#5CE6B8", background: "rgba(61,214,140,.13)", padding: "3px 9px", borderRadius: 8 }}>overené</span>}
        </div>
        <div style={{ marginTop: 12, fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{it.titul}</div>
        <p style={{ color: C.textSec, fontSize: 14.5, lineHeight: 1.6, marginTop: 9 }}>{it.popis}</p>

        {maProgres && (
          <div style={{ textAlign: "center", padding: 12, background: C.surface2, border: "1px solid rgba(116,166,255,.35)", borderRadius: 14, marginTop: 6 }}>
            <b style={{ fontSize: 22, color: "#5BA8F0" }}>{it.vyzbierane.toLocaleString("sk")} €</b> <span style={{ color: C.textSec }}>z {it.ciel.toLocaleString("sk")} € ({pct}%)</span>
            <div style={{ height: 6, background: "rgba(var(--glass-rgb),.12)", borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99 }} />
            </div>
          </div>
        )}

        <PodporaSekcia
          onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
          upvotes={Math.floor((it.lajky || 0) / 3)} onUpvote={() => toast("Páči sa ti to")}
          onPodpor={(s) => podpor(s)} onSms={() => toast("SMS podpora (euro/operátor)")}
          onKanal={(k) => setPlatba(k)} />

        {/* QR skutku (§10) — klik otvorí univerzálny QR s 3 výstupmi */}
        <div onClick={() => setQr(true)} style={{ display: "flex", alignItems: "center", gap: 14, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, marginTop: 14, cursor: "pointer" }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: "#fff", flex: "none", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridTemplateRows: "repeat(5,1fr)", gap: 1, padding: 5 }}>
            {[...Array(25)].map((_, k) => <i key={k} style={{ background: (k * 7 + 3) % 3 ? "#0B0C0F" : "transparent", borderRadius: 1 }} />)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5 }}>QR tohto skutku</div>
            <div style={{ fontSize: 12, color: C.textTer }}>Skenovať · kopírovať · zdieľať</div>
          </div>
          <div style={{ marginLeft: "auto", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 11, padding: "9px 15px", borderRadius: 11, cursor: "pointer", boxShadow: "0 5px 16px rgba(99,134,255,.32)" }}>Otvoriť QR</div>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: C.textTer, marginTop: 16 }}>Bol si pri tom? Komunita preveruje skutky.</div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <VerifyBtn ok onClick={() => onVerify("ok")} />
          <VerifyBtn onClick={() => onVerify("no")} />
        </div>
      </div>

      {/* simulácia platby (EUR karta / DEED peňaženka) */}
      {platba && <PlatbaModal kanal={platba} komu={it.autor} onClose={() => setPlatba(null)}
        onDone={(s) => { toast(`Odoslané ${platba === "EUR" ? s + " €" : s + " DEED"} · ${it.autor}`); oslavuj(s, it.autor); }} />}

      {/* univerzálny QR skutku (§10) — typ „skutok", 3 výstupy */}
      {qr && <QrModal typ="skutok" titul={`QR skutku č. ${it.num.toLocaleString("sk")}`} popis={it.titul.slice(0, 38) + "…"}
        odkaz={`https://deed.app/s/${it.num}`} onClose={() => setQr(false)} toast={toast} />}
    </div>
  );
}

function SekciaLabel({ children }) {
  return <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "18px 0 9px" }}>{children}</div>;
}
function FixBtn({ w, h, e, v, eCol, bg, bd, col, onClick }) {
  return (
    <div onClick={onClick} style={{ width: w, height: h, borderRadius: 10, background: bg || C.surface2, border: `1px solid ${bd || C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: col || "#5BA8F0", fontWeight: 700 }}>
      <span style={{ fontSize: 17, color: eCol }}>{e}</span><span style={{ fontSize: 11, marginTop: 3 }}>{v}</span>
    </div>
  );
}
function VerifyBtn({ ok, onClick }) {
  const { svetly } = useMotiv();
  const accent = ok ? "#1FBF8F" : "#E0524B";
  const titleCol = svetly ? accent : (ok ? "#5CE6B8" : "#F68C8B");
  return (
    <div onClick={onClick} style={{ flex: 1, height: 62, borderRadius: 13, display: "flex", alignItems: "center", gap: 10, paddingLeft: 16, cursor: "pointer",
      background: ok ? "rgba(46,200,140,.12)" : "rgba(242,112,111,.12)", border: `1px solid ${ok ? "rgba(46,125,82,.55)" : "rgba(122,48,48,.55)"}` }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, background: ok ? "rgba(46,200,140,.2)" : "rgba(242,112,111,.2)", color: accent }}>{ok ? "✓" : "✕"}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.1, color: titleCol }}>{ok ? "Overujem" : "Namietam"}</div>
        <div style={{ fontSize: 11.5, color: C.textTer }}>skutok</div>
      </div>
    </div>
  );
}

// ===================== OVERENIE / NÁMIETKA =====================
function GoodVerify({ it, mode, toast, onBack }) {
  const ok = mode === "ok";
  return (
    <div style={{ paddingBottom: 24 }}>
      <Hlavicka title={ok ? "Overujem skutok" : "Námietka k skutku"} onBack={onBack} titleColor={ok ? "#3DD68C" : "#F2706F"} />
      <div style={{ padding: "4px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, fontSize: 13 }}>
          <div><b>{it.autor}</b><div style={{ fontSize: 12, color: C.textTer }}>{it.titul.slice(0, 30)}… · č. {it.num.toLocaleString("sk")}</div></div>
        </div>
        <div style={{ background: ok ? "#0f2417" : "#2a1414", border: `1px solid ${ok ? "#2E7D52" : "#7A3030"}`, borderRadius: 12, padding: 14, marginTop: 14, fontSize: 12, lineHeight: 1.4, color: ok ? "#C2E6D4" : "#F0B0AC" }}>
          {ok ? "Potvrdzujem, že som bol pri tom a skutok sa naozaj stal. Nepravdivé overenie môže mať následky." : "Námietka sa preveruje. Falošná námietka v zlej viere = rovnaká sankcia ako podvod."} <span style={{ fontSize: 11, color: C.textTer }}>[právna veta]</span>
        </div>
        <SekciaLabel>{ok ? "Doplň (nepovinné)" : "Vysvetli dôvod námietky · povinné"}</SekciaLabel>
        <textarea rows={3} placeholder={ok ? "Bol som tam, videl som to…" : "Napríklad: bol som tam o hodinu neskôr a…"} style={inp(70)} />
        <SekciaLabel>Foto/video (nepovinné — zvýši dôveryhodnosť)</SekciaLabel>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {[0, 1, 2].map((k) => (
            <div key={k} onClick={() => toast("📷 Pridať")} style={{ width: 64, height: 64, border: `1px dashed ${C.line}`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#4A4F57", cursor: "pointer" }}>+</div>
          ))}
        </div>
        <button onClick={() => { toast(ok ? "Ďakujeme — tvoje overenie dvíha dôveryhodnosť skutku" : "Námietka odoslaná — preverí ju AI + overenie"); setTimeout(onBack, 400); }}
          style={{ width: "100%", height: 50, borderRadius: 12, border: `1px solid ${ok ? "#2E7D52" : "#7A3030"}`, background: ok ? "#0f2417" : "#2a1414", color: ok ? "#cfeede" : "#F0B0AC", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18 }}>
          {ok ? "✓ Overujem skutok" : "✕ Podávam námietku"}
        </button>
      </div>
    </div>
  );
}

// ===================== PRIDAŤ SKUTOK =====================
function GoodAdd({ toast, oslavuj, onDone }) {
  const [krok, setKrok] = useState("vyber"); // vyber | solo | nahlad | vyhodnotene
  const [text, setText] = useState("");
  const [miesto, setMiesto] = useState("");        // kde sa skutok stal — zaradenie do regiónu/feedu (nie dôkaz pravdy)
  const [kontrola, setKontrola] = useState(false); // medzistav: „AI kontroluje skutok…"
  const [aiNavrh, setAiNavrh] = useState("");      // editovateľný AI návrh textu (krok náhľad)
  const [suhlas, setSuhlas] = useState(false);     // povinné potvrdenie pravdivosti skutku
  const [retaz, setRetaz] = useState(false);       // Reťaz dobra — Cesta A (po vyhodnotení významného)
  const ODMENA = 130;                              // DEED odmena za významný skutok (placeholder)
  const mozePokracovat = miesto.trim().length > 0; // miesto je povinné

  // medzistav po „Pokračovať": krátky loading, neskôr sem príde reálne AI overenie
  useEffect(() => {
    if (!kontrola) return;
    const t = setTimeout(() => { setKontrola(false); setKrok("nahlad"); }, 1500);
    return () => clearTimeout(t);
  }, [kontrola]);

  // späť: počas kontroly ju najprv zruš, inak normálna navigácia medzi krokmi
  const nazad = () => {
    if (kontrola) return setKontrola(false);
    if (krok === "vyber") return onDone();
    if (krok === "vyhodnotene") return setKrok("nahlad");
    setKrok(krok === "nahlad" ? "solo" : "vyber");
  };

  const aiText = () => {
    const raw = text.trim() || "Pomohol som susede vyniesť nákup do tretieho poschodia.";
    let s = raw.charAt(0).toUpperCase() + raw.slice(1);
    if (!/[.!?]$/.test(s)) s += ".";
    return s;
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <Hlavicka title={krok === "vyber" ? "Pridať skutok" : krok === "solo" ? "Opíš svoj skutok" : krok === "vyhodnotene" ? "Skutok vyhodnotený" : "Skontroluj a potvrď"}
        onBack={nazad} />

      <div style={{ padding: 18 }}>
        {krok === "vyber" && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>Ako si pomohol?</h2>
            <p style={{ color: C.textSec, fontSize: 13 }}>Vyber, či si skutok urobil sám, alebo vo viacerých.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <div onClick={() => setKrok("solo")} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 16, padding: "24px 14px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 34 }}>🙋</div><div style={{ fontWeight: 700, marginTop: 10 }}>Sólo</div><div style={{ fontSize: 11, color: C.textTer, marginTop: 4 }}>urobil som to sám</div>
              </div>
              <div onClick={() => toast("Komunitný — scan QR účastníkov (demo)")} style={{ flex: 1, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 16, padding: "24px 14px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 34 }}>👥</div><div style={{ fontWeight: 700, marginTop: 10 }}>Komunitný</div><div style={{ fontSize: 11, color: C.textTer, marginTop: 4 }}>boli sme viacerí</div>
              </div>
            </div>
            <div style={{ padding: "14px 0", fontSize: 11, color: C.textTer, lineHeight: 1.5 }}>Žiadosti o pomoc sa vytvárajú v module Help. Tu pridávaš len skutky, ktoré si vykonal.</div>
          </>
        )}

        {krok === "solo" && !kontrola && (
          <>
            <p style={{ color: C.textSec, fontSize: 13 }}>Napíš vlastnými slovami, čo si urobil. AI to upraví a navrhne kategóriu.</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Napr.: pomohol som susede vyniesť nákup do tretieho poschodia…" style={{ ...inp(90), marginTop: 8 }} />

            {/* kde sa skutok stal — povinné, slúži na zaradenie do regiónu/feedu */}
            <div style={{ fontSize: 12, color: C.textTer, lineHeight: 1.5, margin: "16px 0 8px" }}>Kde sa skutok stal — pomôže zaradiť ho do správneho okolia.</div>
            <input value={miesto} onChange={(e) => setMiesto(e.target.value)} placeholder="Mesto / obec / miesto" style={inp(50)} />

            <SekciaLabel>Dôkaz — foto/video (ide len do AI overenia)</SekciaLabel>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {[0, 1].map((k) => (
                <div key={k} onClick={() => toast("📷 Pridať dôkaz")} style={{ width: 64, height: 64, border: `1px dashed ${C.line}`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#4A4F57", cursor: "pointer" }}>+</div>
              ))}
            </div>
            <button onClick={() => { if (!mozePokracovat) return; setAiNavrh(aiText()); setSuhlas(false); setKontrola(true); }} disabled={!mozePokracovat}
              style={{ width: "100%", height: 50, borderRadius: 14, background: GRAD, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: mozePokracovat ? "pointer" : "not-allowed", marginTop: 18, boxShadow: "0 8px 26px rgba(99,134,255,.32)", opacity: mozePokracovat ? 1 : .5, transition: "opacity .2s ease" }}>
              Pokračovať
            </button>
          </>
        )}

        {krok === "solo" && kontrola && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "64px 18px", textAlign: "center", animation: "fadeUp .25s ease" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.line}`, borderTopColor: "#8B7CFF", animation: "tocenie .8s linear infinite" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>AI kontroluje skutok…</div>
            <div style={{ fontSize: 12.5, color: C.textTer, maxWidth: 250, lineHeight: 1.5 }}>Chvíľu strpenia — overujeme tvoj popis.</div>
          </div>
        )}

        {krok === "nahlad" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b style={{ color: "#1FBF8F", fontSize: 13 }}>✦ AI návrh textu</b>
              <span style={{ fontSize: 11, color: C.textTer }}>· môžeš ho upraviť</span>
            </div>
            {/* editovateľný AI návrh — používateľ má posledné slovo */}
            <textarea value={aiNavrh} onChange={(e) => setAiNavrh(e.target.value)} rows={3}
              style={{ ...inp(90), marginTop: 8, background: "rgba(61,214,140,.10)", border: "1px solid rgba(46,125,82,.45)" }} />
            <div style={{ fontSize: 11, color: C.textTer, marginTop: 8 }}>Kategória: Komunita · navrhnutá AI</div>
            <p style={{ fontSize: 11, color: C.textTer, marginTop: 14 }}>Vidíš, ako sa skutok zobrazí. Máš posledné slovo — text vyššie môžeš upraviť.</p>

            {/* potvrdenie pravdivosti — povinné zaškrtnutie pred pridaním */}
            <div onClick={() => setSuhlas((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(242,112,111,.1)", border: `1px solid ${suhlas ? "rgba(31,191,143,.55)" : "rgba(122,48,48,.4)"}`, borderRadius: 12, padding: 14, marginTop: 14, fontSize: 12.5, lineHeight: 1.45, color: C.textSec, cursor: "pointer", transition: "border-color .2s ease" }}>
              <div style={{ width: 26, height: 26, flex: "0 0 auto", borderRadius: 8, border: `2px solid ${suhlas ? "#1FBF8F" : C.textTer}`, background: suhlas ? "#1FBF8F" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 800, transition: "all .15s ease" }}>{suhlas ? "✓" : ""}</div>
              <span>Skutok je pravdivý a súhlasím s náhľadom. Klamstvo = zrušenie + sankcia.</span>
            </div>

            <button onClick={() => { if (!suhlas) return; setKrok("vyhodnotene"); }} disabled={!suhlas}
              style={{ width: "100%", height: 50, borderRadius: 14, background: GRAD_ZELENY, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: suhlas ? "pointer" : "not-allowed", marginTop: 18, boxShadow: "0 8px 26px rgba(31,191,143,.32)", opacity: suhlas ? 1 : .5, transition: "opacity .2s ease" }}>
              Súhlasím a pridať skutok
            </button>
          </>
        )}

        {/* CESTA A — po vyhodnotení významného skutku: ponuka Reťaze dobra (§9) */}
        {krok === "vyhodnotene" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 0 14px" }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(31,191,143,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}><IkonaFajka size={28} color="#2BD49B" /></div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Skutok schválený</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#F4D684", background: "rgba(240,199,90,.12)", border: "1px solid rgba(240,199,90,.3)", padding: "4px 11px", borderRadius: 20 }}>★ Vyhodnotený ako VÝZNAMNÝ · 3 riadky vo feede</div>
            </div>

            <div style={{ textAlign: "center", background: "rgba(91,155,255,.07)", border: "1px solid rgba(91,155,255,.28)", borderRadius: 16, padding: "16px 14px" }}>
              <div style={{ fontSize: 12, color: C.textSec }}>Pridelená odmena</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#5BA8F0", marginTop: 2 }}>+{ODMENA} <span style={{ fontSize: 15 }}>DEED</span></div>
            </div>

            <p style={{ textAlign: "center", fontSize: 13.5, color: C.textSec, lineHeight: 1.5, marginTop: 16 }}>Chceš celú odmenu sebe, alebo sa <b style={{ color: "#2BD49B" }}>podeliť</b> v Reťazi dobra?</p>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => { toast(`Skutok pridaný! +${ODMENA} DEED — celé tebe`); oslavuj(ODMENA, "teba"); setTimeout(onDone, 700); }}
                style={{ flex: 1, height: 50, borderRadius: 14, border: `1px solid ${C.line}`, background: "rgba(var(--glass-rgb),.05)", color: C.text, fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>Celé mne</button>
              <button onClick={() => setRetaz(true)}
                style={{ flex: 1.2, height: 50, borderRadius: 14, border: "none", background: GRAD_ZELENY, color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 26px rgba(31,191,143,.32)" }}>♻ Podeliť sa</button>
            </div>
            <div style={{ fontSize: 11, color: C.textTer, lineHeight: 1.5, marginTop: 14, textAlign: "center" }}>Ponuka Reťaze sa zobrazí len pri významných skutkoch (3–4 riadky). Pri menších ju spustíš ručne v <b>Profil → Moje skutky</b>.</div>
          </>
        )}
      </div>

      {/* Reťaz dobra — Cesta A (§9): nastav % + vyber žiadosť → QR D+R */}
      {retaz && (
        <RetazDobraSheet odmena={ODMENA} mode="skutok" titulOdkaz="Tvoj skutok"
          onClose={() => setRetaz(false)}
          onDone={({ pct, ziadost }) => { oslavuj(ODMENA, ziadost?.nazov || "reťaz dobra"); setTimeout(onDone, 700); }}
          toast={toast} />
      )}
    </div>
  );
}

// ===================== NÁSTENKA (board) =====================
function GoodBoard({ onBack, onEvent, toast }) {
  const [filter, setFilter] = useState("Všetko");
  const tops = EVENTS.filter((e) => e.top);
  const list = EVENTS.filter((e) => filter === "Všetko" || e.src === filter || (filter === "Šport" && e.kat === "Zdravie"));
  const chipy = ["Všetko", "Šport", "Komunita", "Mesto", "Partner"];

  return (
    <div style={{ paddingBottom: 24 }}>
      <Hlavicka title="Nástenka" onBack={onBack} right={<span style={{ color: C.textTer, fontSize: 16 }}>▦</span>} />

      {/* topované */}
      <SekciaLabel><span style={{ color: C.gold }}>TOPOVANÉ · odporúčané</span></SekciaLabel>
      <div style={{ display: "flex", gap: 10, padding: "0 16px 8px", overflowX: "auto" }}>
        {tops.map((e) => (
          <div key={e.id} onClick={() => onEvent(e.id)} style={{ minWidth: 152, flex: "0 0 auto", background: C.surface2, border: "1px solid rgba(231,199,102,.3)", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
            <div style={{ height: 64, background: heroGrad(e.kat), display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: C.gold }}>★</span>
              <span style={{ fontSize: 18, color: KAT[e.kat].c }}>▶</span>
            </div>
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: KAT[e.kat].c }}>{e.when}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
              <div style={{ fontSize: 9, color: C.textTer, marginTop: 2 }}>{e.who}</div>
            </div>
          </div>
        ))}
      </div>

      {/* filtre */}
      <div style={{ display: "flex", gap: 8, padding: "6px 16px 8px", overflowX: "auto" }}>
        {chipy.map((f) => {
          const on = filter === f;
          return <div key={f} onClick={() => setFilter(f)} style={{ flex: "0 0 auto", padding: "7px 14px", borderRadius: 13, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", background: on ? "rgba(91,155,255,.12)" : C.surface2, border: `1px solid ${on ? "rgba(116,166,255,.4)" : C.line}`, color: on ? "#7FC2EF" : C.textSec, fontWeight: on ? 700 : 500 }}>{f}</div>;
        })}
      </div>

      {/* všetky udalosti */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 18px 0" }}>
        <SekciaLabel>VŠETKY UDALOSTI</SekciaLabel>
        <span style={{ fontSize: 11, color: C.textTer }}>{EVENTS.length * 18} v okolí</span>
      </div>
      <div style={{ padding: "0 16px" }}>
        {list.map((e) => (
          <div key={e.id} onClick={() => onEvent(e.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(var(--glass-rgb),.04)", border: `1px solid ${C.line2}`, borderRadius: 12, padding: "11px 12px", marginBottom: 8, cursor: "pointer" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: SRC_COL[e.src], flex: "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
              <div style={{ fontSize: 12, color: C.textTer, marginTop: 3 }}>{e.who} · {e.src}</div>
            </div>
            <div style={{ textAlign: "right", flex: "none" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: SRC_COL[e.src] }}>{e.when}</div>
              <div style={{ color: "#5A606E", fontSize: 16 }}>›</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== DETAIL UDALOSTI =====================
function GoodEvent({ id, onBack, toast, oslavuj }) {
  const e = EVENTS.find((x) => x.id === id);
  if (!e) return null;
  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ height: 150, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(e.kat) }}>
        <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, cursor: "pointer", zIndex: 2 }}><IkonaSipVlavo size={20} color="#fff" /></div>
        <div style={{ fontSize: 46, color: KAT[e.kat].c }}>▶</div>
        <span style={{ position: "absolute", bottom: 12, left: 14, fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: "rgba(0,0,0,.6)", color: SRC_COL[e.src], pointerEvents: "none" }}>{e.src}</span>
      </div>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{e.title}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.textSec }}>🗓 {e.when}</span>
          <span style={{ fontSize: 12, color: C.textSec }}>📍 {e.place}</span>
          <span style={{ fontSize: 12, color: C.textSec }}>👥 {e.cap}</span>
        </div>
        <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.55, marginTop: 12 }}>{e.desc}</p>

        <div style={{ background: "rgba(91,155,255,.07)", border: "1px solid rgba(91,155,255,.22)", borderRadius: 13, padding: "11px 13px", marginTop: 12, fontSize: 12, color: C.blueL, lineHeight: 1.5 }}>
          Po prihlásení dostaneš pripomienku a QR vstupenku. Účasť sa pripíše do tvojich aktivít a karmy.
        </div>

        <button onClick={() => { toast(`Prihlásené na: ${e.title}`); oslavuj(20, "komunitu"); }}
          style={{ width: "100%", height: 50, borderRadius: 12, background: GRAD, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18, boxShadow: "0 8px 26px rgba(99,134,255,.32)" }}>
          Zúčastním sa
        </button>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <div onClick={() => toast("Zdieľané")} style={{ flex: 1, height: 46, borderRadius: 11, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Zdielanie size={15} color={C.textSec} /> Zdieľať</div>
          <div onClick={() => toast("Uložené na neskôr")} style={{ flex: 1, height: 46, borderRadius: 11, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}><IkonaUlozit size={15} color={C.textSec} /> Uložiť</div>
        </div>
      </div>
    </div>
  );
}

