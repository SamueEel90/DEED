import { useState, useEffect } from "react";
import { C, U, inp, GRAD, GRAD_ZELENY } from "../theme";
import { Foto, FotoPrispevku, MiniFotky, Modal, Video, ModulHlavicka, Hlavicka, PodporaSekcia, Toast, Oslava, useGaleria, useScrollHore, Rebricky, StatRiadok, MoniBar, FeedStlpce, SekcieBar, Lupa, Zvon } from "../shared";

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
    autor: "Mária H.", pfp: "#3A8DD6", ini: "M", karma: "Gold", lok: "Trenčín · Sihoť", cas: "práve teraz", num: 120051,
    titul: "Spravila som veľký nákup pani Helene (84) — sama už ťažké tašky neunesie.",
    popis: "Pani Helena z vedľajšieho vchodu je po operácii bedrového kĺbu a do obchodu sa sama nedostane. Spísali sme zoznam, nakúpila som a doniesla jej to až do bytu. Celý nákup je natočený ako dôkaz — pozri video.",
    emoji: "🛒", suma: 64, lajky: 47, vyznam: "Overený skutok",
    video: "/video/nakup.mp4",
    fotky: [U("photo-1542838132-92c53300491e"), U("photo-1556909114-f6e7ad7d3136")] },

  { id: 1, typ: "skutok", velkost: "big", kat: "Komunita", media: "video", overene: true,
    autor: "Dobrovoľní hasiči TN", pfp: "#3A8DD6", ini: "H", karma: "Gold", lok: "Trenčín · Sihoť", cas: "2 h", num: 120042,
    titul: "Celú noc sme hľadali nezvestného dôchodcu — našli sme ho.",
    popis: "O 23:00 nahlásili nezvestného 78-ročného pána. Prehľadávali sme les pri Váhu do rána. Našli sme ho prechladnutého, ale živého.",
    emoji: "🚒", suma: 177, lajky: 23, vyznam: "Výnimočný skutok",
    fotky: [U("photo-1519681393784-d120267933ba"), U("photo-1441974231531-c6227db76b6e"), U("photo-1448375240586-882707db888b")] },

  { id: 2, typ: "skutok", velkost: "med", kat: "Priroda", media: "foto",
    autor: "EkoTím Juh", pfp: "#2E7D52", ini: "E", karma: "Silver", lok: "Trenčín · Juh", cas: "5 h", num: 120038,
    titul: "Vyčistili sme čiernu skládku pri potoku — 14 vriec odpadu.",
    popis: "Partia 6 ľudí. Za sobotné dopoludnie sme vyniesli 14 vriec odpadu, ktoré tam roky niekto vyhadzoval.",
    emoji: "🌿", suma: 84, lajky: 31,
    fotky: [U("photo-1542601906990-b4d3fb778b09"), U("photo-1470071459604-3b5ec3a7fe05")] },

  { id: 3, typ: "ziadost", velkost: "req", kat: "Pomoc", zdroj: "Help", topovane: true,
    autor: "Rodina Kováčová", pfp: "#7A3030", ini: "R", lok: "Trenčín · tvoja štvrť", cas: "1 h", num: 120044,
    titul: "Po povodni nám zatopilo pivnicu — hľadáme pomoc",
    popis: "Voda nám zničila kotol a nábytok v suteréne. Sami to nezvládneme. Prosíme o pomoc s odpratávaním v sobotu a o príspevok na nový kotol.",
    ciel: 2400, vyzbierane: 1450, emoji: "⚠", pomocnici: 12,
    fotky: ["/img/dom.jpg", U("photo-1500382017468-9049fed747ef")] },

  { id: 4, typ: "charita", velkost: "med", kat: "Komunita", zdroj: "Charity", overene: true, charLevel: "Gold",
    autor: "Detská nemocnica – nadácia", pfp: "#3A8DD6", ini: "D", lok: "Bratislava", cas: "3 h", num: 120031,
    titul: "Zbierka na nový inkubátor pre novorodenecké oddelenie",
    popis: "Overená charita. Vyzbierané prostriedky idú výhradne na kúpu inkubátora. Doklady o použití zverejníme na profile.",
    ciel: 18000, vyzbierane: 11200, emoji: "🏥", suma: 0, lajky: 204,
    fotky: [U("photo-1584308666744-24d5c474f2ae"), U("photo-1579684385127-1ef15d508118")] },

  { id: 5, typ: "skutok", velkost: "small", kat: "Zdravie", media: "foto",
    autor: "Martin K.", pfp: "#3DD6CE", ini: "M", karma: "Gold", lok: "Trenčín", cas: "1 d", num: 120020,
    titul: "Odviezol som suseda na dialýzu", popis: "Sused nemá auto a MHD mu to komplikuje. Vozím ho 3× týždenne.",
    emoji: "🚗", suma: 30, lajky: 12 },

  { id: 6, typ: "skutok", velkost: "small", kat: "Ucenie", media: "kreslene",
    autor: "Lucia B.", pfp: "#A98BF0", ini: "L", karma: "Bronze", lok: "Trenčín · Noviny", cas: "1 d", num: 120018,
    titul: "Doučujem deti angličtinu zadarmo", popis: "Každý štvrtok poobede pre deti z okolia, ktoré si platené doučovanie nemôžu dovoliť.",
    emoji: "📚", suma: 45, lajky: 28 },

  { id: 7, typ: "charita", velkost: "small", kat: "Komunita", zdroj: "Charity", overene: true, charLevel: "Silver",
    autor: "Lidl pomáha – nadácia", pfp: "#5BA8F0", ini: "L", lok: "celá SR", cas: "1 d", num: 120015,
    titul: "Firma zdvojnásobí každý dar zamestnanca", popis: "Daruj €50, Lidl pridá ďalších €50. Matching kampaň na detské ihriská.",
    emoji: "🤝", suma: 0, lajky: 156 },

  { id: 8, typ: "skutok", velkost: "small", kat: "Zdravie", media: "kreslene",
    autor: "Anonym", pfp: "#2E9E9E", ini: "A", karma: "Silver", lok: "Trenčín", cas: "2 d", num: 120009,
    titul: "Daroval krv po výzve nemocnice", popis: "Nemocnica hlásila kritický nedostatok 0-. Išiel som hneď ráno.",
    emoji: "🩸", suma: 50, lajky: 41 },

  { id: 9, typ: "ziadost", velkost: "small", kat: "Pomoc", zdroj: "Help",
    autor: "Jozef M.", pfp: "#7A3030", ini: "J", lok: "Trenčín · Zámostie", cas: "2 d", num: 120005,
    titul: "Po úraze sa neviem dostať na rehabilitácie", popis: "Potrebujem odvoz na rehabilitácie 2× týždenne, kým sa nezotavím.",
    ciel: 0, vyzbierane: 0, emoji: "🦽", pomocnici: 3, otvorenaPodpora: true },

  { id: 10, typ: "skutok", velkost: "small", kat: "Komunita", media: "foto",
    autor: "Tomáš R.", pfp: "#5BA8F0", ini: "T", karma: "Gold", lok: "Trenčín · Sihoť", cas: "2 d", num: 119998,
    titul: "Naučil som babičku volať cez videohovor", popis: "Aby mohla vidieť vnúčatá v zahraničí. Trvalo to hodinu, ale zvládla to.",
    emoji: "📱", suma: 20, lajky: 18 },

  { id: 11, typ: "skutok", velkost: "med", kat: "Priroda", media: "foto",
    autor: "Cyklo Trenčín", pfp: "#2E7D52", ini: "C", karma: "Silver", lok: "Trenčín → Nemšová", cas: "3 d", num: 119980,
    titul: "Mesiac do práce na bicykli namiesto auta — 240 km", popis: "Nahradil som auto bicyklom. Ušetrené CO2 sa pripočítava do eko skutkov.",
    emoji: "🚲", suma: 62, lajky: 22,
    fotky: [U("photo-1517649763962-0c623066013b"), U("photo-1476514525535-07fb3b4ae5f1")] },
];

const heroGrad = (kat) => `linear-gradient(160deg, ${KAT[kat].bg}, ${KAT[kat].bg2})`;
// hex → priesvitné rgba (akcentové tinty fungujúce v tmavom aj svetlom režime)
const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

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
  const [screen, setScreen] = useState("home"); // home | detail | verify | add | board | event
  const [aktId, setAktId] = useState(null);
  const [aktEvent, setAktEvent] = useState(null);
  const [verifyMode, setVerifyMode] = useState("ok");
  const [hlaska, setHlaska] = useState(null);
  const [oslava, setOslava] = useState(null); // {suma, komu}

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
          onBoard={() => setScreen("board")}
          onAdd={() => setScreen("add")} />
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

      {hlaska && <Toast text={hlaska} />}
    </div>
  );
}

// ===================== HOME / FEED =====================
function Home({ wide, toast, otvorModul, onDetail, onBoard, onAdd }) {
  return (
    <div style={{ paddingBottom: 14 }}>
      {/* header — jednotná hlavička (logo D⁺ + názov + hľadanie/upozornenia + profil) */}
      <ModulHlavicka title="Domov"
        right={
          <>
            <span onClick={() => toast("Vyhľadávanie — skutky, žiadosti, ľudia (demo)")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={C.textSec} /></span>
            <span onClick={() => toast("Upozornenia — žiadne nové (demo)")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Zvon size={20} color={C.textSec} /></span>
            <div onClick={() => otvorModul && otvorModul("profil")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#3A8DD6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff", boxShadow: "0 0 0 2px rgba(240,199,90,.75), 0 0 14px rgba(240,199,90,.4)" }}>M</div>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: C.gold }}>Gold</div>
            </div>
          </>
        } />

      {/* jednotná sekcia skratiek */}
      <SekcieBar onTalent={() => toast("Ukáž svoj talent — TikTok kanál (demo)")} onBoard={onBoard} onAdd={onAdd} />

      {/* jednotný rebríček ocenení */}
      <Rebricky
        ocenenia={[
          { ic: "▼", col: "#5BA8F0", label: "PARTNER", name: "Kaufland", onClick: () => toast("Rebríček: Top B2B partner") },
          { ic: "♛", col: "#E7C766", label: "DARCA", name: "Lukáš H.", onClick: () => toast("Rebríček: Top darca") },
          { ic: "★", col: "#F0A85E", label: "HRDINA", name: "Jana N.", onClick: () => toast("Rebríček: Top hrdina") },
          { ic: "☺", col: "#E7C766", label: "FUN", name: "AI omyly", onClick: () => toast("Fun zóna — AI omyly (demo)") },
        ]}
        ludia={[{ ini: "M", name: "Mária", col: "#5BA8F0" }, { ini: "P", name: "Peter", col: "#5BA8F0" }]}
      />

      {/* jednotný štatistický riadok (dnes + okruh) — pod rebríčkom */}
      <StatRiadok stat="Dnes 312 skutkov · Mesiac 9 480" onOkruh={() => toast("Mapa — nastavenie okruhu (demo)")} />

      {/* feed — na tablete/PC: skutky vľavo, žiadosti vpravo */}
      <FeedStlpce wide={wide}
        labelSkutky="Skutky" labelZiadosti="Žiadosti & charita"
        jednoStlpec={POLOZKY.map((it) => <GoodKarta key={it.id} it={it} wide={wide} onDetail={() => onDetail(it.id)} />)}
        skutky={POLOZKY.filter((it) => it.typ === "skutok").map((it) => <GoodKarta key={it.id} it={it} wide={wide} onDetail={() => onDetail(it.id)} />)}
        ziadosti={POLOZKY.filter((it) => it.typ !== "skutok").map((it) => <GoodKarta key={it.id} it={it} wide={wide} onDetail={() => onDetail(it.id)} />)}
      />
    </div>
  );
}

function ZdrojTag({ it }) {
  if (it.zdroj === "Help") return <span style={{ display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: "rgba(242,112,111,.12)", color: "#F2706F" }}>Help · žiadosť</span>;
  if (it.zdroj === "Charity") return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, color: "#E7C766", background: "rgba(231,199,102,.13)", padding: "2px 7px", borderRadius: 6 }}>✓ Charita {it.charLevel || ""}</span>;
  return <span style={{ display: "inline-flex", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: tint(KAT[it.kat].c, .14), color: KAT[it.kat].c }}>{katLabel(it.kat)}</span>;
}

function GoodKarta({ it, wide, onDetail }) {
  const mb = wide ? 0 : 12;
  // VEĽKÁ
  if (it.velkost === "big") {
    return (
      <div onClick={onDetail} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 16, marginBottom: mb, overflow: "hidden", cursor: "pointer" }}>
        <div style={{ height: 148, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.kat) }}>
          {it.video
            ? <Video src={it.video} poster={it.fotky?.[0]} h={148} badge={false} />
            : it.fotky?.length
              ? <FotoPrispevku fotky={it.fotky} emoji={it.emoji} h={148} disableGaleria />
              : <div style={{ fontSize: 44 }}>{it.emoji}</div>}
          <span style={{ position: "absolute", top: 12, left: 12, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 7, background: "rgba(0,0,0,.6)", color: "#E7C766", pointerEvents: "none" }}>★ {it.vyznam}</span>
          {it.media === "video" && <span style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 7, background: "rgba(0,0,0,.6)", color: "#fff", pointerEvents: "none" }}>▶ video</span>}
          <span style={{ position: "absolute", bottom: 12, left: 12, pointerEvents: "none" }}><ZdrojTag it={it} /></span>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", background: it.pfp }}>{it.ini}</div>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{it.autor}</div>
            {it.overene && <span style={{ fontSize: 11, color: "#5CE6B8", background: "rgba(61,214,140,.13)", padding: "3px 9px", borderRadius: 8 }}>overené</span>}
            <span style={{ marginLeft: "auto", fontSize: 12, color: C.textTer }}>{it.cas}</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.textTer, marginLeft: 48, marginBottom: 8 }}>{it.lok} · skutok č. {it.num.toLocaleString("sk")}</div>
          <div style={{ fontSize: 16.5, fontWeight: 700, lineHeight: 1.4 }}>{it.titul}</div>
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
function GoodDetail({ it, toast, oslavuj, onBack, onVerify }) {
  const [potvrd, setPotvrd] = useState(null); // {kanal, suma}
  const otvorGaleriu = useGaleria();
  const jeZiadost = it.typ === "ziadost", jeCharita = it.typ === "charita";
  const maProgres = (jeZiadost && it.ciel) || jeCharita;
  const pct = maProgres ? Math.round(it.vyzbierane / it.ciel * 100) : 0;

  function podpor(suma) {
    toast(`Ďakujeme za ${suma} DEED pre ${it.autor}`);
    oslavuj(suma, it.autor);
  }
  function potvrdVlastnu() {
    toast(`Odoslané ${potvrd.suma} ${potvrd.kanal === "EUR" ? "€" : "DEED"} · ${it.autor}`);
    oslavuj(parseInt(potvrd.suma) || 10, it.autor);
    setPotvrd(null);
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
        <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, cursor: "pointer", zIndex: 2 }}>‹</div>
        <div onClick={() => toast("⋯ možnosti")} style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, cursor: "pointer", zIndex: 2 }}>⋯</div>
        <span style={{ position: "absolute", bottom: 12, left: 14, pointerEvents: "none" }}><ZdrojTag it={it} /></span>
        {it.fotky?.length > 1 && <span style={{ position: "absolute", bottom: 12, right: 14, background: "rgba(0,0,0,.6)", borderRadius: 12, padding: "3px 9px", fontSize: 10, color: "#fff", pointerEvents: "none" }}>⧉ {it.fotky.length} · klikni na foto</span>}
      </div>
      <MiniFotky fotky={it.fotky} />

      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", background: it.pfp, flex: "none" }}>{it.ini}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{it.autor}</div>
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
          onKanal={(k) => setPotvrd({ kanal: k, suma: "" })} />

        {/* QR */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, marginTop: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: "#fff", flex: "none", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridTemplateRows: "repeat(5,1fr)", gap: 1, padding: 5 }}>
            {[...Array(25)].map((_, k) => <i key={k} style={{ background: (k * 7 + 3) % 3 ? "#0B0C0F" : "transparent", borderRadius: 1 }} />)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5 }}>QR tohto skutku</div>
            <div style={{ fontSize: 12, color: C.textTer }}>Zväčšiť a zdieľať na siete</div>
          </div>
          <div onClick={() => toast("Zdieľať: YouTube · IG · siete · kopírovať")} style={{ marginLeft: "auto", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 11, padding: "9px 15px", borderRadius: 11, cursor: "pointer", boxShadow: "0 5px 16px rgba(99,134,255,.32)" }}>Zdieľať</div>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: C.textTer, marginTop: 16 }}>Bol si pri tom? Komunita preveruje skutky.</div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <VerifyBtn ok onClick={() => onVerify("ok")} />
          <VerifyBtn onClick={() => onVerify("no")} />
        </div>
      </div>

      {/* potvrdenie vlastnej sumy */}
      {potvrd && (
        <Modal onClose={() => setPotvrd(null)}>
          <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 10 }}>Vlastná suma — {potvrd.kanal}</div>
          <input autoFocus type="number" placeholder={potvrd.kanal === "EUR" ? "suma v €" : "počet DEED"} value={potvrd.suma}
            onChange={(e) => setPotvrd({ ...potvrd, suma: e.target.value })}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 12, background: "rgba(0,0,0,.3)", border: `1px solid ${C.line}`, color: C.text, fontSize: 16, marginBottom: 12, outline: "none" }} />
          <div style={{ fontSize: 12, color: C.textTer, marginBottom: 14 }}>Skontroluj sumu pred odoslaním (proti preklepu).</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setPotvrd(null)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", background: "transparent", color: C.textSec, border: `1px solid ${C.line}` }}>Späť</button>
            <button onClick={potvrdVlastnu} disabled={!potvrd.suma} style={{ flex: 1, padding: "12px 0", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: potvrd.suma ? "pointer" : "not-allowed", background: potvrd.suma ? GRAD : "rgba(255,255,255,.05)", color: potvrd.suma ? "#fff" : C.textTer, border: "none", boxShadow: potvrd.suma ? "0 8px 26px rgba(99,134,255,.32)" : "none" }}>Potvrdiť a odoslať</button>
          </div>
        </Modal>
      )}
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
  return (
    <div onClick={onClick} style={{ flex: 1, height: 62, borderRadius: 13, display: "flex", alignItems: "center", gap: 10, paddingLeft: 16, cursor: "pointer", background: ok ? "#0f2417" : "#2a1414", border: `1px solid ${ok ? "#2E7D52" : "#7A3030"}` }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, background: ok ? "#143D2A" : "#3D1A1A", color: ok ? "#3DD68C" : "#F2706F" }}>{ok ? "✓" : "✕"}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.1, color: ok ? "#5CE6B8" : "#F68C8B" }}>{ok ? "Overujem" : "Namietam"}</div>
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
  const [krok, setKrok] = useState("vyber"); // vyber | solo | nahlad
  const [text, setText] = useState("");

  const aiText = () => {
    const raw = text.trim() || "Pomohol som susede vyniesť nákup do tretieho poschodia.";
    let s = raw.charAt(0).toUpperCase() + raw.slice(1);
    if (!/[.!?]$/.test(s)) s += ".";
    return s;
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <Hlavicka title={krok === "vyber" ? "Pridať skutok" : krok === "solo" ? "Opíš svoj skutok" : "Skontroluj a potvrď"}
        onBack={() => krok === "vyber" ? onDone() : setKrok(krok === "nahlad" ? "solo" : "vyber")} />

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

        {krok === "solo" && (
          <>
            <p style={{ color: C.textSec, fontSize: 13 }}>Napíš vlastnými slovami, čo si urobil. AI to upraví a navrhne kategóriu.</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Napr.: pomohol som susede vyniesť nákup do tretieho poschodia…" style={{ ...inp(90), marginTop: 8 }} />
            <SekciaLabel>Dôkaz — foto/video (ide len do AI overenia)</SekciaLabel>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {[0, 1].map((k) => (
                <div key={k} onClick={() => toast("📷 Pridať dôkaz")} style={{ width: 64, height: 64, border: `1px dashed ${C.line}`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#4A4F57", cursor: "pointer" }}>+</div>
              ))}
            </div>
            <button onClick={() => setKrok("nahlad")} style={{ width: "100%", height: 50, borderRadius: 14, background: GRAD, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18, boxShadow: "0 8px 26px rgba(99,134,255,.32)" }}>Pokračovať na náhľad</button>
          </>
        )}

        {krok === "nahlad" && (
          <>
            <div style={{ background: "rgba(61,214,140,.12)", border: "1px solid rgba(46,125,82,.45)", borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.4, color: C.text }}>
              <b style={{ color: "#1FBF8F" }}>✦ AI návrh textu</b><br /><br />„{aiText()}“<br /><br />
              <span style={{ fontSize: 11, color: C.textTer }}>Kategória: Komunita · navrhnutá AI</span>
            </div>
            <p style={{ fontSize: 11, color: C.textTer, marginTop: 14 }}>Vidíš, ako sa skutok zobrazí. Máš posledné slovo — môžeš upraviť text.</p>
            <div style={{ background: "rgba(242,112,111,.1)", border: "1px solid rgba(122,48,48,.4)", borderRadius: 12, padding: 12, marginTop: 14, fontSize: 12, color: C.textSec }}>☐ Skutok je pravdivý a súhlasím s náhľadom. Klamstvo = zrušenie + sankcia.</div>
            <button onClick={() => { toast("Skutok pridaný! +X DEED · karma rastie"); oslavuj(40, "teba"); setTimeout(onDone, 600); }}
              style={{ width: "100%", height: 50, borderRadius: 14, background: GRAD_ZELENY, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18, boxShadow: "0 8px 26px rgba(31,191,143,.32)" }}>
              Súhlasím a pridať skutok
            </button>
          </>
        )}
      </div>
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
        <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, cursor: "pointer", zIndex: 2 }}>‹</div>
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
          <div onClick={() => toast("Zdieľané")} style={{ flex: 1, height: 46, borderRadius: 11, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>↗ Zdieľať</div>
          <div onClick={() => toast("Uložené na neskôr")} style={{ flex: 1, height: 46, borderRadius: 11, background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>☆ Uložiť</div>
        </div>
      </div>
    </div>
  );
}
