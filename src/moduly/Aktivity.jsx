import { useState } from "react";
import { ModulHlavicka, useMotiv } from "../shared";

/*
  ============================================================
  MODUL AKTIVITY — port testovacieho prototypu „DEED Aktivity"
  (nahrádza pôvodný placeholder „Výzva")
  ------------------------------------------------------------
  Domény (Šport/Art/Learn/Eko/Zdravie) + Mix · feed skutkov,
  talentov, workshopov, žiadostí a charitatívnych akcií (D++R)
  → detail (skutok/talent/case · workshop · help) · ＋ Pridať
  sprievodca · Nástenka. Vlastná farebná identita per doména.
  ============================================================
*/

// ---- lokálna paleta (z prototypu) ----
const A = {
  surface: "rgba(var(--glass-rgb),.05)", surface2: "rgba(var(--glass-rgb),.075)", line: "rgba(var(--glass-rgb),.10)", line2: "rgba(var(--glass-rgb),.06)",
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
  blue: "#5BA8F0", blueBg: "#13243a", blueBd: "#2A5E8E",
  green: "#3DD68C", greenBg: "#0f2417", greenBd: "#2E7D52",
  red: "#F2706F", redBg: "#2a1414", redBd: "#7A3030",
  purple: "#A98BF0", purpleBg: "#1a1430", purpleBd: "#7A5BD8",
  gold: "#E7C766", goldBg: "#2A1F10", orange: "#F0A85E",
};

// ---- DOMÉNY ----
const DOM = {
  mix:     { label: "Mix",     ic: "◆",  c: "#3DD6CE", bg: "#0d2422", bd: "#2E9E9E", tint: "#0B0C0F" },
  sport:   { label: "Šport",   ic: "🏃", c: "#5BA8F0", bg: "#13243a", bd: "#2A5E8E", tint: "#080d15" },
  art:     { label: "Art",     ic: "🎨", c: "#A98BF0", bg: "#1a1430", bd: "#7A5BD8", tint: "#0e0a18" },
  learn:   { label: "Learn",   ic: "📚", c: "#46C2A0", bg: "#0d2620", bd: "#2E8E72", tint: "#081512" },
  eko:     { label: "Eko",     ic: "🌳", c: "#5BD06E", bg: "#0f2417", bd: "#2E7D52", tint: "#0a130c" },
  zdravie: { label: "Zdravie", ic: "❤️", c: "#E98AAD", bg: "#2a1620", bd: "#8E4A63", tint: "#150a0f" },
};
const ORDER = ["sport", "art", "learn", "eko", "zdravie"]; // mix = automatický režim, bez tlačidla

// ---- kontextové rebríčky domény ----
const LEADERS = {
  mix:     [["★", "TOP HRDINA", "Jana N.", "#33220F", A.orange], ["◆", "TOP AKTIVITA", "Cyklo TN", "#0d2422", "#3DD6CE"], ["♛", "TOP DARCA", "Lukáš H.", "#33290F", A.gold]],
  sport:   [["🚲", "TOP CYKLISTA", "Cyklo TN", "#13243a", A.blue], ["🏃", "TOP BEŽEC", "Peter K.", "#13243a", A.blue], ["🏆", "TOP KLUB", "AŠK Sihoť", "#13243a", A.blue]],
  art:     [["🎵", "TOP HUDOBNÍK", "Tlupa", "#1a1430", A.purple], ["🎨", "TOP UMELEC", "Eva M.", "#1a1430", A.purple], ["🎭", "TOP TVORCA", "Divadlo", "#1a1430", A.purple]],
  learn:   [["🎓", "TOP LEKTOR", "Anna K.", "#0d2620", "#46C2A0"], ["📚", "TOP ŠKOLITEĽ", "IT Akad.", "#0d2620", "#46C2A0"], ["🌍", "TOP JAZYKY", "Lingua", "#0d2620", "#46C2A0"]],
  eko:     [["🌳", "TOP SADIČ", "EkoTím Juh", "#0f2417", A.green], ["♻️", "TOP ZBER", "ČistýVáh", "#0f2417", A.green], ["🐝", "TOP BIODIV.", "Včelári", "#0f2417", A.green]],
  zdravie: [["🩸", "TOP DARCA KRVI", "Martin K.", "#2a1620", "#E98AAD"], ["🧠", "TOP LEKTOR", "Mgr. Nová", "#2a1620", "#E98AAD"], ["🥗", "TOP VÝŽIVA", "FitPoradca", "#2a1620", "#E98AAD"]],
};

// ---- DÁTA (type: skutok | talent | workshop | help | case) ----
const ITEMS = [
  { id: 1, dom: "sport", type: "skutok", size: "big", media: "video", verified: true, emoji: "🚲",
    author: "Cyklo Trenčín", ini: "C", pfp: "#3A8DD6", karma: "Gold", loc: "Trenčín → Nemšová", time: "2 h", num: 140210, likes: 42,
    title: "Mesiac do práce na bicykli namiesto auta — 240 km", importance: "Výnimočný skutok",
    desc: "Nahradil som auto bicyklom celý mesiac. Ušetrené CO2 sa pripočíta do eko skutkov, keď spustíme napojenie na merače." },
  { id: 2, dom: "eko", type: "skutok", size: "med", media: "foto", emoji: "🌿",
    author: "EkoTím Juh", ini: "E", pfp: "#2E7D52", karma: "Silver", loc: "Trenčín · Juh", time: "4 h", num: 140188, likes: 31,
    title: "Vyčistili sme čiernu skládku pri potoku — 14 vriec",
    desc: "Partia 6 ľudí. Za sobotné dopoludnie sme vyniesli 14 vriec odpadu, ktorý tam roky niekto vyhadzoval. Foto + GPS overené." },
  { id: 3, dom: "art", type: "talent", size: "big", media: "video", emoji: "🎵",
    author: "Tlupa", ini: "T", pfp: "#7A5BD8", karma: "Silver", loc: "Trenčín", time: "5 h", num: 140177, likes: 88,
    title: "Ukáž svoj talent — akustická verzia našej novej skladby", importance: "Talent",
    desc: "45 sekúnd naživo, jeden záber. Ak sa páči, hoďte ⭐ — ocenenie ide priamo nám za to, že sme to natočili a zdieľali." },
  { id: 4, dom: "zdravie", type: "skutok", size: "med", media: "kreslene", emoji: "🩸",
    author: "Martin K.", ini: "M", pfp: "#E98AAD", karma: "Gold", loc: "Trenčín", time: "6 h", num: 140165, likes: 41,
    title: "Daroval krv po výzve nemocnice (0− kritický nedostatok)",
    desc: "Nemocnica hlásila kritický nedostatok 0−. Išiel som hneď ráno. Prvodarcom rastie karma viac." },
  { id: 5, dom: "learn", type: "workshop", size: "med", price: "paid", emoji: "🐍",
    author: "Anna K.", ini: "A", pfp: "#46C2A0", karma: "Gold", loc: "online", time: "streda 18:00", num: 140150, seats: 4, priceTxt: "25 €", rating: "4.9", profi: true,
    title: "Python pre začiatočníkov — 4 lekcie",
    desc: "Od nuly k prvému programu. Online cez náš QR (3 QR: štart / 60 % / koniec). Pre úplných začiatočníkov." },
  { id: 6, dom: "art", type: "workshop", size: "med", price: "free", emoji: "🎨",
    author: "Eva M.", ini: "E", pfp: "#A98BF0", karma: "Silver", loc: "Trenčín · KC Aktivity", time: "sobota 10:00", num: 140140, seats: 8, priceTxt: "zdarma", rating: "4.7", profi: false,
    title: "Akvarel pre začiatočníkov — komunitný workshop",
    desc: "Voľný komunitný workshop. Prines si len chuť. Materiál zabezpečený. Bez auditu — voľný obsah." },
  { id: 7, dom: "zdravie", type: "workshop", size: "med", price: "paid", emoji: "🧠",
    author: "Mgr. Nováková", ini: "N", pfp: "#E98AAD", karma: "Gold", loc: "Trenčín / online", time: "utorok 17:00", num: 140130, seats: 12, priceTxt: "firemné", rating: "5.0", profi: true, b2b: true,
    title: "Stres management a prevencia vyhorenia (B2B)",
    desc: "Firemné školenie pre zamestnancov. Audit-grade dochádzka (3 QR povinné) = doklad pre ESRS S1. Lektor s licenciou." },
  { id: 8, dom: "sport", type: "help", size: "req", emoji: "🚴",
    author: "Jano P.", ini: "J", pfp: "#7A3030", loc: "Trenčín · Zámostie", time: "1 d", num: 140120, helpers: 4,
    title: "Hľadám parťáka na bicyklovanie cez víkendy",
    desc: "Začínam s cyklistikou, hľadám niekoho na spoločné víkendové vyjazdy. Skôr pomalšie tempo, 30–50 km." },
  { id: 9, dom: "eko", type: "help", size: "req", emoji: "🌱",
    author: "Komunita Sihoť", ini: "K", pfp: "#7A3030", loc: "Trenčín · Sihoť", time: "1 d", num: 140110, helpers: 9,
    title: "Hľadáme 10 dobrovoľníkov na jarnú výsadbu stromov",
    desc: "Sobota dopoludnia, výsadba 30 stromčekov v parku. Náradie zabezpečené, treba ruky a chuť." },
  { id: 10, dom: "art", type: "case", size: "med", source: "Charity", verified: true, emoji: "🎸",
    author: "Tlupa (kapela)", ini: "T", pfp: "#7A5BD8", loc: "Trenčín", time: "1 d", num: 140100, likes: 60,
    goal: 2200, raised: 1430, helpers: 38, drr: 60,
    title: "Koncert za slepého Mareka z TN — 60 % z darov ide jemu",
    desc: "My ako kapela sme dali prvých 1000 €. Ak sa vám koncert páčil, pridajte sa — 60 % z každého daru ide priamo Marekovi. Overené na chaine." },
  { id: 11, dom: "learn", type: "skutok", size: "small", media: "kreslene", emoji: "📚",
    author: "Lucia B.", ini: "L", pfp: "#46C2A0", karma: "Bronze", loc: "Trenčín · Noviny", time: "1 d", num: 140090, likes: 28,
    title: "Doučujem deti angličtinu zadarmo", desc: "Každý štvrtok pre deti z okolia, ktoré si platené doučovanie nemôžu dovoliť." },
  { id: 12, dom: "sport", type: "skutok", size: "small", media: "foto", emoji: "🏃",
    author: "Peter K.", ini: "P", pfp: "#5BA8F0", karma: "Silver", loc: "Trenčín", time: "2 d", num: 140070, likes: 19,
    title: "Zorganizoval som ranný beh pre seniorov", desc: "Každú stredu o 7:00. Pomalé tempo, hlavne pohyb a spoločnosť." },
  { id: 13, dom: "zdravie", type: "help", size: "small", emoji: "🧘",
    author: "Mária H.", ini: "M", pfp: "#7A3030", loc: "Trenčín", time: "2 d", num: 140050, helpers: 2,
    title: "Hľadám sprievod na cvičenie pre seniorku", desc: "Mama potrebuje sprievod na rehabilitačné cvičenie 2× týždenne." },
  { id: 14, dom: "eko", type: "talent", size: "small", media: "video", emoji: "🌍",
    author: "Zelený Trenčín", ini: "Z", pfp: "#2E7D52", karma: "Silver", loc: "Trenčín", time: "3 d", num: 140030, likes: 17,
    title: "Ukáž talent — ako spraviť kompost na balkóne", desc: "Krátke video ako začať kompostovať aj v paneláku." },
];

// ---- NÁSTENKA (udalosti) ----
const EVENTS = {
  sport: [["SO", "09:00", "Benefičný beh pre Julku", "Mesto Trenčín · Sihoť"], ["NE", "10:00", "Cyklo výlet komunity", "Trenčín → Nemšová"]],
  art: [["PI", "19:00", "Koncert Tlupa — za Mareka", "KC Aktivity"], ["SO", "17:00", "Výstava mladých umelcov", "Galéria mesta"]],
  learn: [["UT", "17:00", "Workshop: prvá pomoc", "online"], ["ŠT", "18:00", "Doučovanie matematiky", "Knižnica TN"]],
  eko: [["SO", "09:00", "Jarná výsadba stromov", "Park Sihoť"], ["NE", "08:00", "Čistenie brehu Váhu", "Nábrežie"]],
  zdravie: [["UT", "17:00", "Stres management (firemné)", "online"], ["ŠT", "16:00", "Darovanie krvi — mobilná", "NTS Trenčín"]],
  mix: [["PI", "19:00", "Koncert Tlupa — za Mareka", "KC Aktivity"], ["SO", "09:00", "Jarná výsadba stromov", "Park Sihoť"], ["UT", "17:00", "Stres management (firemné)", "online"], ["NE", "08:00", "Čistenie brehu Váhu", "Nábrežie"]],
};

// ---- spoločné štýly ----
const cardS = { background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 16, marginBottom: 12, overflow: "hidden", cursor: "pointer" };
const rowTopS = { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 };
const pfpS = (bg) => ({ width: 36, height: 36, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff", background: bg });
const nameS = { fontWeight: 700, fontSize: 15.5 };
const timeS = { marginLeft: "auto", fontSize: 12, color: A.txt3 };
const titleS = { fontSize: 16, fontWeight: 700, lineHeight: 1.4 };
const verifS = { fontSize: 11, color: A.green, background: A.greenBg, padding: "3px 9px", borderRadius: 8 };
const heroGrad = (d) => `linear-gradient(160deg, ${DOM[d].bg} 0%, #0a0c11 100%)`;
const secLbl = { fontSize: 11.5, letterSpacing: ".4px", color: A.txt3, fontWeight: 700, margin: "18px 0 9px" };

function Chip({ bg, c, children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 7, background: bg, color: c }}>{children}</span>;
}
function DomTag({ it }) {
  const a = DOM[it.dom];
  if (it.type === "talent") return <Chip bg={a.bg} c={a.c}>▶ Talent · {a.label}</Chip>;
  if (it.source === "Charity") return <Chip bg={A.goldBg} c={A.gold}>✓ Charita · {a.label}</Chip>;
  return <Chip bg={a.bg} c={a.c}>{a.ic} {a.label}</Chip>;
}
function Play({ big }) {
  const s = big ? 58 : 54;
  return <span style={{ width: s, height: s, borderRadius: "50%", background: "rgba(255,255,255,.16)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", border: "1px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", paddingLeft: 4 }}>▶</span>;
}
function badge(side) {
  return { position: "absolute", top: 12, [side === "l" ? "left" : "right"]: 12, fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 7, background: "rgba(0,0,0,.6)", color: side === "l" ? A.gold : "#fff", display: "flex", alignItems: "center", gap: 4, pointerEvents: "none" };
}

// ===================== MODUL =====================
export default function ModulAktivity({ wide }) {
  const [dom, setDom] = useState("mix");
  const [view, setView] = useState("all"); // all | talent | workshop | help
  const [screen, setScreen] = useState("home"); // home | detail | add | board
  const [aktId, setAktId] = useState(null);
  const [liked, setLiked] = useState({});
  const [hlaska, setHlaska] = useState(null);
  const [celeb, setCeleb] = useState(null);
  const [add, setAdd] = useState(null); // null = menu | { kind, d }
  const [checks, setChecks] = useState({ a: false, b: false });

  const toast = (m) => { setHlaska(m); setTimeout(() => setHlaska((x) => (x === m ? null : x)), 2200); };
  const celebrate = (title, text) => { setCeleb({ title, text }); setTimeout(() => setCeleb((c) => (c && c.title === title ? null : c)), 2200); };
  const obal = (el) => (wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el);

  const { svetly } = useMotiv();
  const akt = ITEMS.find((x) => x.id === aktId);
  // aktívny accent: detail → doména položky · add → predvolená · inak vybraná doména
  const accentDom = screen === "detail" && akt ? akt.dom : screen === "add" ? (dom === "mix" ? "sport" : dom) : dom;
  const acc = DOM[accentDom];

  function pickDom(d) {
    setDom((c) => (c === d ? "mix" : d)); // klik na aktívnu doménu = späť na Mix
    setView("all");
  }
  function pickView(v) { setView((x) => (x === v ? "all" : v)); }
  function open(id) { setAktId(id); setScreen("detail"); }
  function home() { setScreen("home"); }
  function like(id, base) { setLiked((l) => ({ ...l, [id]: !l[id] })); }
  function support(amt, komu) {
    celebrate(amt >= 100 ? "Skvelé! Veľká podpora!" : "Ďakujeme!", `Tvoja podpora ${amt} DEED letí k ${komu}. Reťaz dobra pokračuje.`);
  }

  return (
    <div style={{
      minHeight: "100%", position: "relative", color: A.txt,
      background: svetly ? "var(--c-bg)" : acc.tint, transition: "background .4s ease",
      ["--acc"]: acc.c, ["--accBg"]: acc.bg, ["--accBd"]: acc.bd,
    }}>
      {screen === "home" && <Home {...{ dom, view, pickDom, pickView, toast, open, setScreen, wide }} />}
      {screen === "detail" && akt && obal(<Detail {...{ it: akt, liked, like, support, toast, celebrate, home, setScreen }} />)}
      {screen === "add" && obal(<Add {...{ dom, add, setAdd, checks, setChecks, toast, celebrate, home }} />)}
      {screen === "board" && obal(<Board {...{ dom, toast, home }} />)}

      {hlaska && (
        <div style={{ position: "fixed", bottom: 96, left: "50%", transform: "translateX(-50%)", background: "#1a2b22", border: `1px solid ${A.greenBd}`, color: "#cfeede", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 120, textAlign: "center", maxWidth: "90%", boxShadow: "0 10px 30px rgba(0,0,0,.5)", animation: "fadeUp .25s ease" }}>{hlaska}</div>
      )}

      {celeb && (
        <div onClick={() => setCeleb(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, zIndex: 200, animation: "fadeUp .2s ease", padding: 20 }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: A.greenBg, border: `3px solid ${A.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54 }}>🎉</div>
          <h2 style={{ color: "#fff", fontSize: 20, margin: 0 }}>{celeb.title}</h2>
          <p style={{ color: A.txt2, fontSize: 14, textAlign: "center", margin: 0, lineHeight: 1.5, maxWidth: 320 }}>{celeb.text}</p>
        </div>
      )}
    </div>
  );
}

// ===================== HOME =====================
function Home({ dom, view, pickDom, pickView, toast, open, setScreen }) {
  const list = ITEMS.filter((it) => {
    if (dom !== "mix" && it.dom !== dom) return false;
    if (view === "talent") return it.type === "talent";
    if (view === "workshop") return it.type === "workshop";
    if (view === "help") return it.type === "help";
    return true;
  });
  const acc = DOM[dom];

  const sec = (on) => ({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, height: 44, borderRadius: 13, fontSize: 13, fontWeight: 600, cursor: "pointer", background: on ? "var(--accBg)" : A.surface2, border: `1px solid ${on ? "var(--accBd)" : A.line}`, color: on ? "#e7eef0" : A.txt });
  const sub = (on) => ({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 11, fontSize: 12, fontWeight: 600, cursor: "pointer", background: on ? "var(--accBg)" : A.surface, border: `1px solid ${on ? "var(--accBd)" : A.line2}`, color: on ? "#e7eef0" : A.txt2 });

  return (
    <div style={{ paddingBottom: 14 }}>
      {/* header — jednotná hlavička (logo D⁺ + názov) */}
      <ModulHlavicka title="Aktivity" onMenu={() => toast("☰ Menu: moduly + Mapa + nastavenia")}
        right={<span style={{ color: A.txt2, fontSize: 19 }} onClick={() => toast("Hľadať aktivity, workshopy, lektorov…")}>🔍&nbsp;&nbsp;🔔</span>} />

      {/* live ticker */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12, color: A.txt2, borderTop: `.5px solid ${A.line}`, borderBottom: `.5px solid ${A.line}`, background: A.surface2 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: A.green, flex: "none", animation: "pulse 1.6s infinite" }} />
        <span>Cyklo TN <b style={{ color: A.green }}>práve dostal 100 DEED</b> → Marek</span>
      </div>

      {/* top sekcie */}
      <div style={{ display: "flex", gap: 8, padding: "8px 16px 10px" }}>
        <div onClick={() => pickView("talent")} style={sec(view === "talent")}><span style={{ fontSize: 15 }}>▶</span>Talent</div>
        <div onClick={() => setScreen("board")} style={sec(false)}><span style={{ fontSize: 15, color: "#7E9BF0" }}>▣</span>Nástenka</div>
        <div onClick={() => setScreen("add")} style={{ ...sec(false), background: "var(--accBg)", borderColor: "var(--accBd)", color: "#cfeee9" }}><span style={{ fontSize: 15 }}>＋</span>Pridať</div>
      </div>

      {/* leaders */}
      <div style={{ display: "flex", gap: 6, padding: "0 16px 10px", overflowX: "auto" }}>
        {LEADERS[dom].map((l, i) => (
          <div key={i} onClick={() => toast(`Rebríček: ${l[1]} — ${l[2]}`)} style={{ minWidth: 92, background: A.surface, border: `1px solid ${A.line}`, borderRadius: 13, padding: "9px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", flex: "0 0 auto" }}>
            <div style={{ width: 30, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: l[3], color: l[4] }}>{l[0]}</div>
            <div style={{ fontSize: 7, letterSpacing: ".4px", color: A.txt3, fontWeight: 700, textAlign: "center" }}>{l[1]}</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, textAlign: "center" }}>{l[2]}</div>
          </div>
        ))}
      </div>

      {/* stats + lokalita */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 18px 10px", fontSize: 12, color: A.txt3 }}>
        <span>Dnes 312 aktivít · Mesiac 9 480</span><span style={{ color: A.txt2 }}>◉ Sihoť · Trenčín</span>
      </div>

      {/* prepínač domén */}
      <div style={{ padding: "2px 12px 8px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 7, minWidth: "max-content", padding: "0 4px" }}>
          {ORDER.map((d) => {
            const a = DOM[d]; const on = dom === d;
            return (
              <div key={d} onClick={() => pickDom(d)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, minWidth: 62, height: 54, borderRadius: 14, cursor: "pointer", flex: "none", transition: ".18s", transform: on ? "translateY(-1px)" : "none", background: on ? a.bg : A.surface2, border: `1px solid ${on ? a.bd : A.line}` }}>
                <div style={{ fontSize: 18, lineHeight: 1 }}>{a.ic}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: on ? a.c : A.txt2 }}>{a.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* sub sekcie */}
      <div style={{ display: "flex", gap: 8, padding: "2px 16px 10px" }}>
        <div onClick={() => pickView("workshop")} style={sub(view === "workshop")}><span style={{ fontSize: 13 }}>🎓</span>Workshopy</div>
        <div onClick={() => pickView("help")} style={sub(view === "help")}><span style={{ fontSize: 13 }}>❓</span>Hľadám pomoc</div>
        <div onClick={() => toast("Market — predaj diel/náradia, fáza 2")} style={sub(false)}><span style={{ fontSize: 13 }}>🛒</span>Market<span style={{ fontSize: 8, background: A.goldBg, color: A.gold, padding: "1px 5px", borderRadius: 5, marginLeft: 2 }}>čoskoro</span></div>
      </div>

      {/* feed */}
      <div style={{ padding: "0 16px" }}>
        {!list.length ? (
          <div style={{ textAlign: "center", color: A.txt3, fontSize: 12, padding: "40px 20px", lineHeight: 1.6 }}>Tu zatiaľ nič nie je.<br />Skús inú doménu alebo pridaj prvý príspevok cez ＋ Pridať.</div>
        ) : list.map((it) => {
          if (it.type === "workshop") return <WCard key={it.id} it={it} onOpen={open} />;
          if (it.type === "help") return <ReqCard key={it.id} it={it} onOpen={open} />;
          if (it.type === "case" || it.size === "med") return <MedCard key={it.id} it={it} onOpen={open} />;
          if (it.size === "big") return <BigCard key={it.id} it={it} onOpen={open} />;
          return <SmallRow key={it.id} it={it} onOpen={open} />;
        })}
      </div>
    </div>
  );
}

// ---- karty ----
function BigCard({ it, onOpen }) {
  return (
    <div onClick={() => onOpen(it.id)} style={cardS}>
      <div style={{ height: 148, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.dom) }}>
        <span style={badge("l")}>★ {it.importance || DOM[it.dom].label}</span>
        {it.media === "video" && <span style={badge("r")}>▶ video</span>}
        {it.media === "video" ? <Play /> : <div style={{ fontSize: 50 }}>{it.emoji}</div>}
        <div style={{ position: "absolute", bottom: 12, left: 12 }}><DomTag it={it} /></div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={rowTopS}>
          <div style={pfpS(it.pfp)}>{it.ini}</div>
          <div style={nameS}>{it.author}</div>
          {it.verified && <span style={verifS}>overené</span>}
          <span style={timeS}>{it.time}</span>
        </div>
        <div style={{ fontSize: 10.5, color: A.txt3, marginLeft: 42, marginBottom: 8 }}>{it.loc} · č. {it.num.toLocaleString("sk")}</div>
        <div style={titleS}>{it.title}</div>
      </div>
    </div>
  );
}
function MedCard({ it, onOpen }) {
  const a = DOM[it.dom]; const isCase = it.type === "case";
  return (
    <div onClick={() => onOpen(it.id)} style={{ ...cardS, display: "flex", padding: 12, gap: 12, alignItems: "flex-start", border: `1px solid ${isCase ? a.bd : A.line}` }}>
      <div style={{ width: 96, height: 80, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: heroGrad(it.dom) }}>{it.media === "kreslene" ? "✎" : it.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{it.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: A.txt2 }}>{it.author}</span>
          <DomTag it={it} />
          {isCase && <ProgressMini it={it} />}
        </div>
      </div>
      <span style={timeS}>{it.time}</span>
    </div>
  );
}
function WCard({ it, onOpen }) {
  const free = it.price === "free";
  return (
    <div onClick={() => onOpen(it.id)} style={{ ...cardS, display: "flex", padding: 12, gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 96, height: 80, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: heroGrad(it.dom) }}>{it.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Wb bg={free ? A.greenBg : A.goldBg} c={free ? A.green : A.gold}>{free ? "ZADARMO" : it.priceTxt}</Wb>
          {it.b2b && <Wb bg={A.blueBg} c={A.blue}>B2B · audit</Wb>}
          {it.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, marginTop: 6 }}>{it.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: A.txt2 }}>{it.author} · {it.loc}</span>
          <span style={{ fontSize: 11.5, color: A.txt3 }}>★ {it.rating} · {it.seats} miest</span>
        </div>
      </div>
      <span style={{ ...timeS, fontSize: 9 }}>{it.time}</span>
    </div>
  );
}
function Wb({ bg, c, children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: bg, color: c }}>{children}</span>;
}
function ProgressMini({ it }) {
  const pct = Math.round(it.raised / it.goal * 100); const a = DOM[it.dom];
  return (
    <div style={{ width: "100%", marginTop: 6 }}>
      <div style={{ height: 5, background: "#1F2731", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: a.c }} /></div>
      <div style={{ fontSize: 9, color: A.txt3, marginTop: 3 }}>{it.raised.toLocaleString("sk")} € z {it.goal.toLocaleString("sk")} € · {pct}% · D++R {it.drr}%</div>
    </div>
  );
}
function ReqCard({ it, onOpen }) {
  return (
    <div onClick={() => onOpen(it.id)} style={{ ...cardS, border: `1px solid ${A.redBd}`, background: "#1c1314" }}>
      <div style={{ display: "flex", padding: 14, gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 64, height: 64, borderRadius: 11, background: A.redBg, border: `1px solid ${A.redBd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "var(--acc)", flex: "none" }}>{it.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: "var(--acc)" }}>{it.title}</div>
          <div style={{ fontSize: 12.5, color: "#D2CACA", marginTop: 6 }}>{it.author} · {it.loc}</div>
          <div style={{ fontSize: 11.5, color: A.txt3, marginTop: 6 }}>❓ Hľadám pomoc · {it.helpers} sa zapojilo</div>
        </div>
      </div>
    </div>
  );
}
function SmallRow({ it, onOpen }) {
  const a = DOM[it.dom];
  const ic = it.type === "talent" ? "▶" : it.media === "kreslene" ? "✎" : "▦";
  return (
    <div onClick={() => onOpen(it.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: A.surface, border: `1px solid ${A.line2}`, borderRadius: 12, marginBottom: 8, cursor: "pointer" }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flex: "none", background: a.bg, color: a.c, border: `1px solid ${a.bd}` }}>{ic}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", marginRight: 6, background: a.c }} />{it.title}</div>
        <div style={{ fontSize: 11.5, color: A.txt3, marginTop: 3 }}>{it.author} · {a.label}{it.karma ? " · " + it.karma : ""}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={timeS}>{it.time}</div>
        <div style={{ color: "#4A4F57", fontSize: 14 }}>›</div>
      </div>
    </div>
  );
}

// ===================== DETAIL =====================
function BackBar({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 8px" }}>
      <div onClick={onBack} style={{ width: 30, height: 30, borderRadius: "50%", background: A.surface2, border: `1px solid ${A.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>‹</div>
      <h3 style={{ fontSize: 15, margin: 0 }}>{title}</h3>
    </div>
  );
}
function DetailHero({ it, onBack, children }) {
  return (
    <div style={{ height: 150, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.dom) }}>
      <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, cursor: "pointer", zIndex: 2 }}>‹</div>
      <div style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, zIndex: 2 }}>⋯</div>
      {children}
    </div>
  );
}
const qrCells = () => [...Array(25)].map((_, k) => <i key={k} style={{ background: (k * 7 + 3) % 3 ? "#0B0C0F" : "transparent", borderRadius: 1 }} />);

function Detail({ it, liked, like, support, toast, celebrate, home }) {
  if (it.type === "workshop") return <WorkshopDetail it={it} toast={toast} celebrate={celebrate} home={home} />;
  if (it.type === "help") return <HelpDetail it={it} toast={toast} celebrate={celebrate} home={home} />;
  return <DeedDetail it={it} liked={liked} like={like} support={support} toast={toast} home={home} />;
}

function DeedDetail({ it, liked, like, support, toast, home }) {
  const a = DOM[it.dom];
  const isTalent = it.type === "talent", isCase = it.type === "case";
  const pct = isCase ? Math.round(it.raised / it.goal * 100) : 0;
  const lk = !!liked[it.id];
  const supLabel = isTalent ? "OCEŇ TVORCU — klik a hneď odíde" : isCase ? "PRIDAJ SA K MAREKOVI" : "DROBNÁ PODPORA — klik a hneď odíde";

  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero it={it} onBack={home}>
        {it.media === "video" ? <Play big /> : <div style={{ fontSize: 52 }}>{it.emoji}</div>}
        <div style={{ position: "absolute", bottom: 12, left: 14 }}><DomTag it={it} /></div>
      </DetailHero>
      <div style={{ padding: "14px 18px" }}>
        <div style={rowTopS}>
          <div style={pfpS(it.pfp)}>{it.ini}</div>
          <div>
            <div style={nameS}>{it.author}</div>
            <div style={{ fontSize: 12, color: A.txt3 }}>{it.loc} · č. {it.num.toLocaleString("sk")}</div>
          </div>
          {it.verified && <span style={{ ...verifS, marginLeft: "auto" }}>overené</span>}
        </div>
        <div style={{ ...titleS, marginTop: 10, fontSize: 14 }}>{it.title}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 9, color: A.txt2 }}>{it.desc}</p>

        {isCase && (
          <div style={{ textAlign: "center", padding: 12, background: A.surface2, border: `1px solid ${a.bd}`, borderRadius: 12, marginTop: 6 }}>
            <b style={{ fontSize: 22, color: a.c }}>{it.raised.toLocaleString("sk")} €</b> <span style={{ color: A.txt2 }}>z {it.goal.toLocaleString("sk")} € ({pct}%)</span>
            <div style={{ height: 6, background: "#1F2731", borderRadius: 3, marginTop: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: a.c }} /></div>
            <div style={{ fontSize: 10, color: A.gold, marginTop: 8, fontWeight: 700 }}>D++R · {it.drr}% z tvojho daru ide Marekovi · overené</div>
          </div>
        )}
        {isTalent && <InfoBox><b style={{ color: A.txt }}>Ocenenie ide priamo tvorcovi</b> — za to, že to natočil a zdieľal. Pri talente niet charity %, je to o ňom. (Video má náš vodoznak + QR, overené.)</InfoBox>}

        <div style={secLbl}>ZADARMO</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div onClick={() => like(it.id, it.likes)} style={{ flex: 1, height: 44, borderRadius: 11, background: A.surface2, border: `1px solid ${lk ? A.redBd : A.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700, cursor: "pointer", color: lk ? A.red : A.txt, fontSize: 14 }}>♥ {(it.likes || 0) + (lk ? 1 : 0)}</div>
          <div onClick={() => toast("👍 Páči sa")} style={{ flex: 1, height: 44, borderRadius: 11, background: A.surface2, border: `1px solid ${A.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>↑ {Math.floor((it.likes || 0) / 3)}</div>
        </div>

        <div style={secLbl}>{supLabel}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <Fx w={52} h={48} e="★" v="10" onClick={() => support(10, it.author)} />
          <Fx w={58} h={56} e="◆" v="50" onClick={() => support(50, it.author)} />
          <Fx w={64} h={64} e="🔥" v="100" eCol={A.orange} onClick={() => support(100, it.author)} />
          <div style={{ width: 1, alignSelf: "stretch", borderLeft: "1px dashed #3A3F47", margin: "0 4px" }} />
          <Fx w={62} h={64} e="SMS" v="€" bg="#1A1410" bd="#5A4A2A" col={A.gold} onClick={() => toast("SMS podpora (euro/operátor)")} />
        </div>

        <div style={secLbl}>VLASTNÁ SUMA — vyber kanál</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Cbtn t="€ FIAT" s="euro · procesor" onClick={() => toast("Vlastná suma — FIAT (demo)")} />
          <Cbtn t="DEED" s="wallet → wallet" tCol="var(--acc)" onClick={() => toast("Vlastná suma — DEED (demo)")} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 14, padding: 12, marginTop: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: "#fff", flex: "none", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridTemplateRows: "repeat(5,1fr)", gap: 1, padding: 5 }}>{qrCells()}</div>
          <div><div style={{ fontWeight: 700, fontSize: 12.5 }}>QR {isCase ? "tejto akcie" : isTalent ? "tohto talentu" : "tohto skutku"}</div><div style={{ fontSize: 12, color: A.txt3 }}>Zväčšiť a zdieľať na siete</div></div>
          <div onClick={() => toast("Zdieľať: YouTube · IG · TikTok · kopírovať")} style={{ marginLeft: "auto", background: "var(--accBg)", border: "1px solid var(--accBd)", color: "#cfe6fb", fontWeight: 700, fontSize: 11, padding: "8px 14px", borderRadius: 9, cursor: "pointer" }}>Zdieľať</div>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: A.txt3, marginTop: 16 }}>Bol si pri tom? Komunita preveruje skutky.</div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <Vbtn ok onClick={() => toast("Ďakujeme — tvoje overenie dvíha dôveryhodnosť")} />
          <Vbtn onClick={() => toast("Námietka odoslaná — preverí ju AI + overenie")} />
        </div>
      </div>
    </div>
  );
}

function WorkshopDetail({ it, toast, celebrate, home }) {
  const free = it.price === "free";
  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero it={it} onBack={home}>
        <div style={{ fontSize: 52 }}>{it.emoji}</div>
        <div style={{ position: "absolute", bottom: 12, left: 14, display: "flex", gap: 6 }}>
          <Wb bg={free ? A.greenBg : A.goldBg} c={free ? A.green : A.gold}>{free ? "ZADARMO" : it.priceTxt}</Wb>
          {it.b2b && <Wb bg={A.blueBg} c={A.blue}>B2B · audit S1</Wb>}
        </div>
      </DetailHero>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ ...titleS, fontSize: 15 }}>{it.title}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 9, color: A.txt2 }}>{it.desc}</p>

        <div onClick={() => toast("Profil lektora (demo)")} style={{ display: "flex", alignItems: "center", gap: 10, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 13, padding: 12, marginTop: 14, cursor: "pointer" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#fff", flex: "none", background: it.pfp }}>{it.ini}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>{it.author} {it.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}</div>
            <div style={{ fontSize: 12, color: A.txt3 }}>{it.karma || "lektor"} · ★ {it.rating} hodnotenie</div>
          </div>
          <span style={{ color: "#4A4F57" }}>›</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Dr b={it.time.split(" ")[0] || "—"} t="termín" />
          <Dr b={it.loc.includes("online") ? "online" : "naživo"} t="forma" />
          <Dr b={it.seats} t="voľných miest" />
        </div>

        <InfoBox>{!free
          ? <><b style={{ color: A.txt }}>3 QR dochádzka</b> — štart / 60 % / koniec. {it.b2b ? "Povinné = audit dôkaz pre firmu (ESRS S1). Zamestnanec má priradenú firmu, účasť sa jej započíta." : "Pri platenom = overená účasť + karma."} Lektor a platený účastník = KYC.</>
          : "Voľný komunitný workshop — bez 3 QR a bez auditu (obsah/kvalitu nepoznáme). Pozeraj čo ťa zaujíma."}</InfoBox>

        {it.profi && (<><div style={secLbl}>ĎALŠIE OD LEKTORA</div>
          <div onClick={() => toast("Ďalšie workshopy lektora (demo)")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: A.surface, border: `1px solid ${A.line}`, borderRadius: 12, padding: 14, fontSize: 13, cursor: "pointer" }}><span>📚 Ďalšie 2 workshopy · profil</span><span style={{ color: "#4A4F57" }}>›</span></div></>)}

        <Btn onClick={() => { celebrate(free ? "Prihlásené!" : "Prihlásené a zaplatené!", free ? "Uvidíme sa na workshope. Pri štarte naskenuj QR." : "Pri štarte naskenuj QR (3 QR: štart/60%/koniec)."); setTimeout(home, 1700); }}>{free ? "Prihlásiť sa" : "Prihlásiť a zaplatiť · " + it.priceTxt}</Btn>
        <div style={{ textAlign: "center", padding: "14px 18px 0", fontSize: 11, color: A.txt3 }}>{free ? "Zadarmo · základné prihlásenie." : "Platba cez FIAT/DEED · " + it.priceTxt}</div>
      </div>
    </div>
  );
}

function HelpDetail({ it, toast, celebrate, home }) {
  const a = DOM[it.dom];
  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero it={it} onBack={home}>
        <div style={{ fontSize: 52 }}>{it.emoji}</div>
        <div style={{ position: "absolute", bottom: 12, left: 14 }}><Chip bg={a.bg} c={a.c}>❓ Hľadám pomoc · {a.label}</Chip></div>
      </DetailHero>
      <div style={{ padding: "14px 18px" }}>
        <div style={rowTopS}>
          <div style={pfpS(it.pfp)}>{it.ini}</div>
          <div><div style={nameS}>{it.author}</div><div style={{ fontSize: 12, color: A.txt3 }}>{it.loc} · č. {it.num.toLocaleString("sk")}</div></div>
        </div>
        <div style={{ ...titleS, marginTop: 10, fontSize: 14 }}>{it.title}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 9, color: A.txt2 }}>{it.desc}</p>
        <InfoBox>{it.helpers} ľudí sa už zapojilo. Po prijatí sa otvorí chat, dohodnete sa. Po dokončení: hodnotenie + tip + reťaz dobra.</InfoBox>
        <Btn green onClick={() => { celebrate("Ozval si sa!", `Otvorili sme chat s ${it.author}. Dohodnite si detaily.`); setTimeout(home, 1700); }}>✋ Môžem pomôcť</Btn>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Cbtn t="↗ Zdieľať" s="pošli ďalej" onClick={() => toast("Zdieľané")} />
          <Cbtn t="☆ Uložiť" s="na neskôr" onClick={() => toast("Uložené")} />
        </div>
      </div>
    </div>
  );
}

// ---- detail helpery ----
function InfoBox({ children }) {
  return <div style={{ background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 12, padding: 13, marginTop: 14, fontSize: 11.5, color: A.txt2, lineHeight: 1.5 }}>{children}</div>;
}
function Fx({ w, h, e, v, eCol, bg, bd, col, onClick }) {
  return (
    <div onClick={onClick} style={{ width: w, height: h, borderRadius: 10, background: bg || A.surface2, border: `1px solid ${bd || A.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: col || A.blue, fontWeight: 700 }}>
      <span style={{ fontSize: 17, color: eCol }}>{e}</span><span style={{ fontSize: 11, marginTop: 3 }}>{v}</span>
    </div>
  );
}
function Cbtn({ t, s, tCol, onClick }) {
  return (
    <div onClick={onClick} style={{ flex: 1, height: 50, borderRadius: 11, background: A.surface2, border: `1px solid ${A.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: tCol || A.txt }}>{t}</div><div style={{ fontSize: 8.5, color: A.txt3, marginTop: 2 }}>{s}</div>
    </div>
  );
}
function Dr({ b, t }) {
  return <div style={{ flex: 1, textAlign: "center", background: A.surface, border: `1px solid ${A.line}`, borderRadius: 11, padding: "11px 4px" }}><b style={{ fontSize: 14 }}>{b}</b><div style={{ fontSize: 9, color: A.txt3, marginTop: 2 }}>{t}</div></div>;
}
function Vbtn({ ok, onClick }) {
  return (
    <div onClick={onClick} style={{ flex: 1, height: 62, borderRadius: 13, display: "flex", alignItems: "center", gap: 10, paddingLeft: 16, cursor: "pointer", background: ok ? A.greenBg : A.redBg, border: `1px solid ${ok ? A.greenBd : A.redBd}` }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, background: ok ? "#143D2A" : "#3D1A1A", color: ok ? A.green : A.red }}>{ok ? "✓" : "✕"}</div>
      <div><div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1, color: ok ? A.green : A.red }}>{ok ? "Overujem" : "Namietam"}</div><div style={{ fontSize: 9.5, color: A.txt3 }}>skutok</div></div>
    </div>
  );
}
function Btn({ children, green, onClick }) {
  return <button onClick={onClick} style={{ width: "100%", height: 50, borderRadius: 12, background: green ? A.greenBg : "var(--accBg)", border: `1px solid ${green ? A.greenBd : "var(--accBd)"}`, color: green ? "#cfeede" : "#e7eef0", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18, fontFamily: "inherit" }}>{children}</button>;
}

// ===================== ＋ PRIDAŤ =====================
function Add({ dom, add, setAdd, checks, setChecks, toast, celebrate, home }) {
  const d = dom === "mix" ? "sport" : dom;
  const a = DOM[d];
  const pill = (extra) => ({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 9, marginBottom: 6, background: a.bg, color: a.c, border: `1px solid ${a.bd}`, ...extra });

  if (!add) {
    return (
      <div style={{ paddingBottom: 20 }}>
        <BackBar title="Pridať" onBack={home} />
        <div style={{ padding: 18 }}>
          <div style={pill()}>{a.ic} doména: {a.label} {dom === "mix" ? "(predvolené — zmeň na Domove)" : "(predvyplnené)"}</div>
          <h2 style={{ fontSize: 18, margin: "4px 0" }}>Čo chceš pridať?</h2>
          <div style={{ fontSize: 12, color: A.txt3 }}>Predvyplníme doménu, aby si klikal čo najmenej.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            <Ch ic="✅" t="Pridať skutok" s="spravil som niečo dobré (zabehol, zasadil, pomohol, vytvoril)" onClick={() => { setChecks({ a: false, b: false }); setAdd({ kind: "skutok", d }); }} />
            <Ch ic="🎓" t="Pridať školenie / workshop" s="ponúkam pomoc — učím, vediem, školím" onClick={() => { setChecks({ a: false, b: false }); setAdd({ kind: "skolenie", d }); }} />
            <Ch ic="❓" t="Hľadám pomoc" s="potrebujem mentora, parťáka, dobrovoľníkov" onClick={() => { setChecks({ a: false, b: false }); setAdd({ kind: "help", d }); }} />
          </div>
          <div style={{ padding: "14px 0", fontSize: 11, color: A.txt3, lineHeight: 1.5 }}>Talent (ukáž sa) pridáš tiež cez „Pridať skutok" → typ Talent. Video 45 s (do 1 min), KYC, automatický vodoznak + QR, AI moderácia.</div>
        </div>
      </div>
    );
  }

  const { kind } = add;
  const isTalentable = kind === "skutok", isSkol = kind === "skolenie";
  const titles = { skutok: "Nový skutok", skolenie: "Nové školenie", help: "Hľadám pomoc" };
  const fieldlbl = { fontSize: 11, fontWeight: 700, color: A.txt2, marginTop: 14 };
  const inp = { width: "100%", background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 12, padding: 14, color: A.txt, fontSize: 14, fontFamily: "inherit", resize: "none", marginTop: 8, outline: "none" };
  const tg = (k) => setChecks((c) => ({ ...c, [k]: !c[k] }));

  return (
    <div style={{ paddingBottom: 20 }}>
      <BackBar title={titles[kind]} onBack={() => setAdd(null)} />
      <div style={{ padding: "6px 18px 18px" }}>
        <div style={pill()}>{a.ic} {a.label}</div>

        {isTalentable && (<>
          <div style={fieldlbl}>Typ</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Cbtn t="Skutok" s="popis + foto" onClick={() => toast("Typ: bežný skutok")} />
            <Cbtn t="Talent ▶" s="45 s video" tCol={a.c} onClick={() => toast("Typ: Talent video")} />
          </div>
        </>)}

        <div style={fieldlbl}>{isSkol ? "Názov workshopu" : kind === "help" ? "Čo hľadáš" : "Popis skutku"}</div>
        <textarea rows={3} placeholder={isSkol ? "napr. Akvarel pre začiatočníkov" : kind === "help" ? "napr. Hľadám parťáka na beh..." : "napr. Vyčistili sme breh Váhu..."} style={inp} />

        {isSkol && (<>
          <div style={fieldlbl}>Cena</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Cbtn t="Zadarmo" s="bez auditu" tCol={A.green} onClick={() => toast("Zadarmo — bez auditu, bez 3 QR")} />
            <Cbtn t="Platené" s="3 QR + KYC" tCol={A.gold} onClick={() => toast("Platené — 3 QR + KYC")} />
          </div>
        </>)}

        <div style={fieldlbl}>Foto / video</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Mslot onClick={() => toast("Nahrať (demo)")}>＋</Mslot>
          <Mslot onClick={() => toast("Nahrať (demo)")}>📷</Mslot>
          {isTalentable && <Mslot onClick={() => toast("Video — vodoznak sa pridá automaticky")}>▶</Mslot>}
        </div>

        <div style={{ background: A.greenBg, border: `1px solid ${A.greenBd}`, borderRadius: 12, padding: 14, marginTop: 14, fontSize: 13, lineHeight: 1.4 }}>🤖 <b>AI pomôže</b> — z popisu navrhne kategóriu, dôležitosť a skontroluje obsah. Pri talente: automatický vodoznak + QR, anti-deepfake.</div>

        {(isTalentable || isSkol) && (<>
          <div style={fieldlbl}>Potvrdenie</div>
          <Check on={checks.a} onClick={() => tg("a")}>Som to ja alebo blízka osoba s jej súhlasom, zodpovedám za obsah.</Check>
          {isTalentable && <Check on={checks.b} onClick={() => tg("b")}>Súhlasím s logom / vodoznakom DEED na videu.</Check>}
          {isSkol && <Check on={checks.b} onClick={() => tg("b")}>Čestne vyhlasujem, že mám oprávnenie toto školiť (vzdelanie/skúška/certifikát) a doklady viem predložiť k auditu.</Check>}
        </>)}

        <Btn onClick={() => {
          if (kind === "skutok") celebrate("Skutok pridaný!", "AI ho ohodnotí a zaradí. Ďakujeme, že konáš.");
          else if (kind === "skolenie") celebrate("Workshop vytvorený!", "Po overení ho ľudia uvidia vo feede a na nástenke.");
          else celebrate("Žiadosť zverejnená!", "Keď sa niekto ozve, otvorí sa chat. Veľa šťastia.");
          setTimeout(home, 1700);
        }}>{kind === "help" ? "Zverejniť žiadosť" : isSkol ? "Vytvoriť workshop" : "Pridať skutok"}</Btn>
        <div style={{ textAlign: "center", padding: "14px 0 0", fontSize: 11, color: A.txt3 }}>Pred zverejnením prejde AI kontrolou. {isSkol ? "Lektor = KYC." : ""}</div>
      </div>
    </div>
  );
}
function Ch({ ic, t, s, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 16, padding: "18px 16px", cursor: "pointer" }}>
      <div style={{ fontSize: 28, width: 40, textAlign: "center" }}>{ic}</div>
      <div><div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div><div style={{ fontSize: 11, color: A.txt3, marginTop: 3 }}>{s}</div></div>
    </div>
  );
}
function Mslot({ children, onClick }) {
  return <div onClick={onClick} style={{ width: 64, height: 64, border: `1px dashed ${A.line}`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#4A4F57", cursor: "pointer" }}>{children}</div>;
}
function Check({ on, onClick, children }) {
  return (
    <div onClick={onClick} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: A.surface2, border: `1px solid ${on ? A.greenBd : A.line}`, borderRadius: 11, padding: 12, marginTop: 10, fontSize: 11.5, color: A.txt2, lineHeight: 1.4, cursor: "pointer" }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: `1px solid ${on ? A.greenBd : A.line}`, background: on ? A.greenBg : "transparent", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: A.green }}>{on ? "✓" : ""}</div>
      <div>{children}</div>
    </div>
  );
}

// ===================== NÁSTENKA =====================
function Board({ dom, toast, home }) {
  const a = DOM[dom];
  const list = EVENTS[dom] || EVENTS.mix;
  return (
    <div style={{ paddingBottom: 20 }}>
      <BackBar title="Nástenka" onBack={home} />
      <div style={{ padding: "0 18px 6px", fontSize: 11, color: A.txt3, lineHeight: 1.5 }}>Udalosti vo tvojom okolí · {dom === "mix" ? "všetky domény" : a.label}</div>
      {list.map((e, i) => (
        <div key={i} onClick={() => toast(`Udalosť: ${e[2]}`)} style={{ display: "flex", gap: 12, alignItems: "center", background: A.surface, border: `1px solid ${A.line}`, borderRadius: 13, padding: 12, margin: "0 16px 8px", cursor: "pointer" }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: "none", background: a.bg, color: a.c, border: `1px solid ${a.bd}` }}>
            <div style={{ fontSize: 9, fontWeight: 700 }}>{e[0]}</div><div style={{ fontSize: 11, fontWeight: 700 }}>{e[1]}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{e[2]}</div>
            <div style={{ fontSize: 11, color: A.txt3, marginTop: 2 }}>📍 {e[3]}</div>
          </div>
          <span style={{ color: "#4A4F57", fontSize: 14 }}>›</span>
        </div>
      ))}
      <div style={{ padding: "14px 18px", fontSize: 11, color: A.txt3, lineHeight: 1.5, textAlign: "center" }}>Klikni na doménu na Domove a Nástenka ukáže udalosti danej oblasti.</div>
    </div>
  );
}
