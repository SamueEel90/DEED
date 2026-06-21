import { useState, useMemo, useEffect } from "react";
import { ModulHlavicka, Hlavicka, PodporaSekcia, PlatbaModal, HladanieModal, Toast, Oslava, useMotiv, useScrollHore, Ticker, Rebricky, StatRiadok, FeedStlpce, SekcieBar, OkruhVyber, Lupa, Zvon, IkonaSipVlavo, IkonaMoznosti, Zdielanie, IkonaUlozit, IkonaFoto, IkonaPlus, IkonaPlay } from "../shared";
import { C, GRAD, GRAD_ZELENY } from "../theme";
import { pripravFeed, FEED_CFG } from "../lib/feed";

// poloha usera (MVP mock — Trenčín, rovnaká ako v ostatných feedoch)
const USER_LOK = { lat: 48.894, lng: 18.044 };

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

// ---- lokálna paleta (z prototypu) — theme-aware (tmavý aj svetlý režim) ----
// „Bg“ tóny sú priesvitné akcentové tinty → fungujú v oboch režimoch (nie napevno tmavé)
const A = {
  surface: "rgba(var(--glass-rgb),.05)", surface2: "rgba(var(--glass-rgb),.075)", line: "rgba(var(--glass-rgb),.10)", line2: "rgba(var(--glass-rgb),.06)",
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
  blue: "#5BA8F0", blueBg: "rgba(91,168,240,.14)", blueBd: "rgba(42,94,142,.55)",
  green: "#3DD68C", greenBg: "rgba(61,214,140,.13)", greenBd: "rgba(46,125,82,.55)",
  red: "#F2706F", redBg: "rgba(242,112,111,.12)", redBd: "rgba(122,48,48,.6)",
  purple: "#A98BF0", purpleBg: "rgba(169,139,240,.15)", purpleBd: "rgba(122,91,216,.5)",
  gold: "#E7C766", goldBg: "rgba(231,199,102,.13)", orange: "#F0A85E",
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
const ORDER = ["zdravie", "learn", "sport", "eko", "art"]; // mix = automatický režim, bez tlačidla

// minimalistické doménové ikony (line SVG, jednofarebné — currentColor)
function DI({ children }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>{children}</svg>;
}
const DOM_IKONA = {
  zdravie: <DI><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /></DI>,
  learn: <DI><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5" /></DI>,
  sport: <DI><circle cx="12" cy="8" r="6" /><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1" /></DI>,
  eko: <DI><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6" /></DI>,
  art: <DI><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" /><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" /></DI>,
};

// hex → priesvitné rgba (akcentové tinty fungujúce v tmavom aj svetlom režime)
function tint(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

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
const SEED_ITEMS = [
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

// ---- obohatenie pre Feed algoritmus (Časť B) ----
// SEED_ITEMS aj používateľské príspevky majú vlastný slovník (type/size/loc/time).
// Engine potrebuje typ/skore/geo/dni/podpora — odvodíme ich tu (MVP mock; neskôr
// reálne skóre z AI + GPS). `size`/`type` NEMENÍME, aby ostali pôvodné karty.
const GEO_LOK = {
  "Nemšová": { lat: 48.910, lng: 18.078 }, "Juh": { lat: 48.875, lng: 18.030 },
  "Sihoť": { lat: 48.905, lng: 18.030 }, "Zámostie": { lat: 48.892, lng: 18.020 },
  "Noviny": { lat: 48.882, lng: 18.060 },
};
function geoZLok(loc = "") {
  for (const k in GEO_LOK) if (loc.includes(k)) return GEO_LOK[k];
  return { lat: 48.894, lng: 18.044 }; // default — Trenčín centrum
}
function dniZCasu(t = "") {
  const m = String(t).match(/(\d+)\s*d/);
  return m ? +m[1] : 0; // "1 d" → 1; "2 h"/"teraz"/rozvrhy workshopov ("streda 18:00") → 0
}
const SKORE_VELKOST = { big: 7.5, med: 4.5, small: 2.0, req: 4.0 };
// type → engine typ (skutok/ziadost/charita) + modul (pre frekvenčný strop)
const TYP_ENGINE = { help: "ziadost", case: "charita" };
const MODUL_ENGINE = { help: "help", workshop: "workshop", case: "charity" };
function obohatit(it) {
  return {
    ...it,
    typ: TYP_ENGINE[it.type] || "skutok",
    modul: MODUL_ENGINE[it.type] || "good",
    kat: it.dom, typSituacie: "normal",
    overene: !!it.verified, // engine číta `overene` (hustota B.10); seed má `verified`
    narodne: /online/i.test(it.loc || ""), // online (workshopy) nie sú viazané na okruh
    skore: it.skore ?? SKORE_VELKOST[it.size] ?? 3,
    ...geoZLok(it.loc),
    dni: dniZCasu(it.time),
    podpora: it.likes ? Math.round(it.likes / 3) : (it.helpers || 0),
  };
}

// ---- NÁSTENKA (udalosti) ----
const EVENTS = {
  sport: [["SO", "09:00", "Benefičný beh pre Julku", "Mesto Trenčín · Sihoť"], ["NE", "10:00", "Cyklo výlet komunity", "Trenčín → Nemšová"]],
  art: [["PI", "19:00", "Koncert Tlupa — za Mareka", "KC Aktivity"], ["SO", "17:00", "Výstava mladých umelcov", "Galéria mesta"]],
  learn: [["UT", "17:00", "Workshop: prvá pomoc", "online"], ["ŠT", "18:00", "Doučovanie matematiky", "Knižnica TN"]],
  eko: [["SO", "09:00", "Jarná výsadba stromov", "Park Sihoť"], ["NE", "08:00", "Čistenie brehu Váhu", "Nábrežie"]],
  zdravie: [["UT", "17:00", "Stres management (firemné)", "online"], ["ŠT", "16:00", "Darovanie krvi — mobilná", "NTS Trenčín"]],
  mix: [["PI", "19:00", "Koncert Tlupa — za Mareka", "KC Aktivity"], ["SO", "09:00", "Jarná výsadba stromov", "Park Sihoť"], ["UT", "17:00", "Stres management (firemné)", "online"], ["NE", "08:00", "Čistenie brehu Váhu", "Nábrežie"]],
};

// ---- perzistencia (localStorage) ----
const LS = {
  posts: "deed.aktivity.posts.v1",     // používateľom vytvorené príspevky
  likes: "deed.aktivity.likes.v1",     // { [id]: true }
  votes: "deed.aktivity.votes.v1",     // { [id]: "ok" | "no" }
  deltas: "deed.aktivity.deltas.v1",   // { [id]: { raised, helpers, support } }
  follows: "deed.aktivity.follows.v1", // { [meno]: true }
};
function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
  catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

// ---- vytvorenie nového príspevku zo sprievodcu ＋ Pridať ----
let _seq = 0;
function vytvorPost({ kind, d, text, talent, free }) {
  const a = DOM[d];
  const id = 90000 + Date.now() % 100000 + (_seq++); // stabilne unikátne v rámci sedenia
  const t = (text || "").trim();
  const base = {
    id, dom: d, author: "Ty", ini: "TY", pfp: a.c, karma: "Nováčik",
    loc: "Trenčín · tu", time: "teraz", num: 140211 + (id % 1000), mine: true,
  };
  if (kind === "skolenie") {
    return { ...base, type: "workshop", size: "med", price: free ? "free" : "paid",
      priceTxt: free ? "zdarma" : "25 €", seats: 8, rating: "—", profi: false, emoji: a.ic,
      title: t || "Nový workshop", desc: t || "Workshop, ktorý si práve vytvoril(a)." };
  }
  if (kind === "help") {
    return { ...base, type: "help", size: "req", helpers: 0, emoji: a.ic,
      title: t || "Hľadám pomoc", desc: t || "Žiadosť o pomoc, ktorú si práve zverejnil(a)." };
  }
  // skutok / talent
  return { ...base, type: talent ? "talent" : "skutok", size: talent ? "big" : "med",
    media: talent ? "video" : "foto", emoji: a.ic, likes: 0, verified: false,
    importance: talent ? "Talent" : "Tvoj skutok",
    title: t || (talent ? "Môj talent" : "Môj nový skutok"),
    desc: t || "Príspevok, ktorý si práve pridal(a). AI ho ohodnotí a zaradí." };
}

// ---- PROFILY ĽUDÍ ----
// krátke bio pre známych autorov (ostatní dostanú odvodený popis)
const BIOS = {
  "Cyklo Trenčín": "Komunita cyklistov v Trenčíne. Jazdíme do práce aj za dobrom — každý kilometer sa ráta.",
  "EkoTím Juh": "Dobrovoľnícky eko tím z trenčianskeho Juhu. Čistíme, sadíme, separujeme.",
  "Tlupa": "Lokálna kapela. Hudbou pomáhame — výťažok z koncertov ide tým, čo to potrebujú.",
  "Martin K.": "Pravidelný darca krvi a dobrovoľník. Keď nemocnica zavolá, idem.",
  "Anna K.": "Lektorka programovania. Učím od nuly, trpezlivo a prakticky.",
  "Eva M.": "Akvarelistka a komunitná tvorkyňa. Vediem voľné workshopy pre začiatočníkov.",
  "Mgr. Nováková": "Psychologička so zameraním na prevenciu vyhorenia. Školím firmy aj jednotlivcov.",
  "Lucia B.": "Doučujem deti angličtinu zadarmo. Vzdelanie má byť dostupné každému.",
  "Peter K.": "Organizujem ranné behy pre seniorov. Pohyb a spoločnosť pre každý vek.",
  "Zelený Trenčín": "Mestská eko iniciatíva. Kompostovanie, výsadba, osveta.",
};
const KARMA_ORDER = { "Nováčik": 0, Bronze: 1, Silver: 2, Gold: 3 };
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function osoba(name, items) {
  const mine = items.filter((it) => it.author === name);
  const first = mine[0] || {};
  let karma = "Nováčik";
  mine.forEach((it) => { if (it.karma && KARMA_ORDER[it.karma] > (KARMA_ORDER[karma] ?? 0)) karma = it.karma; });
  const domains = [...new Set(mine.map((it) => it.dom).filter(Boolean))];
  const h = hashStr(name);
  const isMe = name === "Ty";
  return {
    name, isMe,
    ini: first.ini || name.replace(/[^A-Za-zÀ-ž]/g, "").slice(0, 1).toUpperCase() || "?",
    pfp: first.pfp || (domains[0] ? DOM[domains[0]].c : "#3A8DD6"),
    karma, domains,
    verified: mine.some((it) => it.verified),
    profi: mine.some((it) => it.profi),
    loc: (first.loc || "Trenčín").split(" · ")[0],
    bio: BIOS[name] || (isMe ? "To si ty — tvoje skutky, talenty a žiadosti na jednom mieste." : "Člen komunity DEED. Koná dobro vo svojom okolí."),
    followers: isMe ? 0 : 40 + (h % 920),
    following: isMe ? 0 : 12 + (h % 130),
    skutky: mine.length,
    items: mine,
  };
}

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
  if (it.type === "talent") return <Chip bg={tint(a.c, .14)} c={a.c}>▶ Talent · {a.label}</Chip>;
  if (it.source === "Charity") return <Chip bg={A.goldBg} c={A.gold}>✓ Charita · {a.label}</Chip>;
  return <Chip bg={tint(a.c, .14)} c={a.c}>{a.ic} {a.label}</Chip>;
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
  const [screen, setScreen] = useState("home"); // home | detail | add | board | profile
  const [aktId, setAktId] = useState(null);
  const [profilMeno, setProfilMeno] = useState(null); // otvorený profil osoby
  const [hlaska, setHlaska] = useState(null);
  const [celeb, setCeleb] = useState(null);
  const [hladaj, setHladaj] = useState(false);
  const [add, setAdd] = useState(null); // null = menu | { kind, d }

  // perzistentný stav (localStorage)
  const [posts, setPosts] = useState(() => load(LS.posts, []));   // používateľské príspevky
  const [liked, setLiked] = useState(() => load(LS.likes, {}));   // { id: true }
  const [votes, setVotes] = useState(() => load(LS.votes, {}));   // { id: "ok"|"no" }
  const [deltas, setDeltas] = useState(() => load(LS.deltas, {})); // { id: { raised, helpers, support } }
  const [follows, setFollows] = useState(() => load(LS.follows, {})); // { meno: true }
  const [tick, setTick] = useState(null); // posledná akcia → live ticker

  useEffect(() => save(LS.posts, posts), [posts]);
  useEffect(() => save(LS.likes, liked), [liked]);
  useEffect(() => save(LS.votes, votes), [votes]);
  useEffect(() => save(LS.deltas, deltas), [deltas]);
  useEffect(() => save(LS.follows, follows), [follows]);

  const toast = (m) => { setHlaska(m); setTimeout(() => setHlaska((x) => (x === m ? null : x)), 2200); };
  const celebrate = (title, text) => { setCeleb({ title, text }); setTimeout(() => setCeleb((c) => (c && c.title === title ? null : c)), 2200); };
  const obal = (el) => (wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el);

  const { svetly } = useMotiv();

  // odvodený zoznam: používateľské príspevky navrch + seed, s aplikovanými deltami
  // (podpora) a obohatené o polia pre Feed algoritmus (typ/skore/geo/dni/podpora).
  const items = useMemo(() => [...posts, ...SEED_ITEMS].map((it) => {
    const d = deltas[it.id];
    const sd = d ? {
      ...it,
      raised: (it.raised || 0) + (d.raised || 0),
      helpers: (it.helpers || 0) + (d.helpers || 0),
      supportCount: d.support || 0,
    } : it;
    return obohatit(sd);
  }), [posts, deltas]);

  const akt = items.find((x) => x.id === aktId);
  // aktívny accent: detail → doména položky · add → predvolená · inak vybraná doména
  const accentDom = screen === "detail" && akt ? akt.dom : screen === "add" ? (dom === "mix" ? "sport" : dom) : dom;
  const acc = DOM[accentDom];

  function pickDom(d) {
    setDom((c) => (c === d ? "mix" : d)); // klik na aktívnu doménu = späť na Mix
    setView("all");
  }
  function pickView(v) { setView((x) => (x === v ? "all" : v)); }
  function open(id) { setAktId(id); setScreen("detail"); }
  function openPerson(name) { if (!name) return; setProfilMeno(name); setScreen("profile"); }
  function home() { setScreen("home"); }

  // pri prepnutí obrazovky (napr. otvorenie detailu) odscrolluj appku hore
  const scrollHore = useScrollHore();
  useEffect(() => { scrollHore(); }, [screen]);

  function like(id) { setLiked((l) => ({ ...l, [id]: !l[id] })); }
  function toggleFollow(name) {
    setFollows((f) => ({ ...f, [name]: !f[name] }));
    setTick({ who: "Ty", what: (follows[name] ? "prestal(a) sledovať" : "práve začal(a) sledovať"), to: name });
  }

  function support(amt, komu, it) {
    if (it && it.type === "case") {
      setDeltas((dd) => {
        const cur = dd[it.id] || {};
        const room = Math.max(0, (it.goal || 0) - (it.raised || 0)); // it.raised už obsahuje predošlé delty
        const add = Math.max(0, Math.min(amt, room));               // nepresiahne cieľ
        return { ...dd, [it.id]: { raised: (cur.raised || 0) + add, helpers: (cur.helpers || 0) + 1, support: (cur.support || 0) + 1 } };
      });
    } else if (it) {
      setDeltas((dd) => { const cur = dd[it.id] || {}; return { ...dd, [it.id]: { ...cur, support: (cur.support || 0) + 1 } }; });
    }
    setTick({ who: "Ty", what: `práve podporil(a) ${amt} DEED →`, to: komu });
    celebrate(amt >= 100 ? "Skvelé! Veľká podpora!" : "Ďakujeme!", `Tvoja podpora ${amt} DEED letí k ${komu}. Reťaz dobra pokračuje.`);
  }

  function vote(id, kind) {
    setVotes((v) => {
      if (v[id]) return v; // už hlasoval — žiadna zmena
      return { ...v, [id]: kind };
    });
  }

  function createPost(spec) {
    const post = vytvorPost(spec);
    setPosts((p) => [post, ...p]);
    setTick({ who: "Ty", what: post.type === "help" ? "práve zverejnil(a) žiadosť" : post.type === "workshop" ? "práve vytvoril(a) workshop" : "práve pridal(a) skutok", to: "" });
    setView("all"); // nový post sa zobrazí navrchu feedu (Mix aj jeho doména)
    return post;
  }

  return (
    <div style={{
      minHeight: "100%", position: "relative", color: A.txt,
      background: svetly ? "var(--c-bg)" : acc.tint, transition: "background .4s ease",
      ["--acc"]: acc.c, ["--accBg"]: tint(acc.c, .15), ["--accBd"]: tint(acc.c, .5),
    }}>
      {screen === "home" && <Home {...{ items, dom, view, pickDom, pickView, toast, open, openPerson, setScreen, tick, wide, onHladaj: () => setHladaj(true) }} />}
      {screen === "detail" && akt && obal(<Detail {...{ it: akt, liked, like, support, votes, vote, toast, celebrate, home, openPerson, setScreen }} />)}
      {screen === "add" && obal(<Add {...{ dom, add, setAdd, toast, celebrate, home, createPost }} />)}
      {screen === "board" && obal(<Board {...{ dom, toast, home }} />)}
      {screen === "profile" && profilMeno && obal(<OsobaProfil {...{ name: profilMeno, items, follows, toggleFollow, onOpen: open, toast, home }} />)}

      {hladaj && (
        <HladanieModal akcent={acc.c} placeholder="Hľadať aktivity, workshopy, lektorov…"
          data={items.map((it) => ({
            id: it.id, titul: it.title, podtitul: `${it.author} · ${it.loc || DOM[it.dom].label}`, kat: DOM[it.dom].label, emoji: it.emoji,
            tag: it.type === "talent" ? "Talent" : it.type === "workshop" ? "Workshop" : it.type === "help" ? "Žiadosť" : DOM[it.dom].label,
          }))}
          onPick={(id) => open(id)}
          onClose={() => setHladaj(false)} />
      )}

      {hlaska && <Toast text={hlaska} />}

      {celeb && <Oslava title={celeb.title} text={celeb.text} onClose={() => setCeleb(null)} />}
    </div>
  );
}

// ===================== HOME =====================
function Home({ items, dom, view, pickDom, pickView, toast, open, openPerson, setScreen, tick, wide, onHladaj }) {
  // zvolený rádius — Feed algoritmus (Časť B)
  const [radius, setRadius] = useState("stvrt");
  const [vyberOkruh, setVyberOkruh] = useState(false);

  // 1) UI predfilter (doména + sub-záložka) — to engine nerieši
  const list = items.filter((it) => {
    if (dom !== "mix" && it.dom !== dom) return false;
    if (view === "talent") return it.type === "talent";
    if (view === "workshop") return it.type === "workshop";
    if (view === "help") return it.type === "help";
    return true;
  });

  // 2) Feed algoritmus na seed obsah; vlastné čerstvé príspevky držíme navrchu
  //    (optimistické UI — používateľ hneď vidí, čo pridal, mimo prahu okruhu).
  const feed = [
    ...list.filter((it) => it.mine),
    ...pripravFeed(list.filter((it) => !it.mine), { ...USER_LOK, radius }),
  ];

  const sub = (on) => ({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 11, fontSize: 12, fontWeight: 600, cursor: "pointer", background: on ? "var(--accBg)" : A.surface, border: `1px solid ${on ? "var(--accBd)" : A.line2}`, color: on ? "var(--acc)" : A.txt2 });

  // dvojstĺpcový feed (skutky vľavo / žiadosti vpravo) iba v zmiešanom zobrazení na tablete/PC
  const dva = wide && view === "all";
  const feedCard = (it) => {
    if (it.type === "workshop") return <WCard key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
    if (it.type === "help") return <ReqCard key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
    if (it.type === "case" || it.size === "med") return <MedCard key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
    if (it.size === "big") return <BigCard key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
    return <SmallRow key={it.id} it={it} wide={dva} onOpen={open} onPerson={openPerson} />;
  };

  return (
    <div style={{ paddingBottom: 14 }}>
      {/* header — jednotná hlavička (logo D⁺ + názov) */}
      <ModulHlavicka title="Aktivity"
        right={
          <>
            <span onClick={onHladaj} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Lupa size={20} color={A.txt2} /></span>
            <span onClick={() => toast("Upozornenia (demo)")} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}><Zvon size={20} color={A.txt2} /></span>
          </>
        } />

      {/* live ticker — odráža poslednú reálnu akciu */}
      <Ticker>
        {tick
          ? <>{tick.who} <b style={{ color: C.greenL }}>{tick.what}</b>{tick.to ? ` ${tick.to}` : ""}</>
          : <>Cyklo TN <b style={{ color: C.greenL }}>práve dostal 100 DEED</b> → Marek</>}
      </Ticker>

      {/* jednotná sekcia skratiek */}
      <SekcieBar talentActive={view === "talent"} onTalent={() => pickView("talent")} onBoard={() => setScreen("board")} onAdd={() => setScreen("add")} />

      {/* jednotný rebríček ocenení (kontextový podľa domény) */}
      <Rebricky ocenenia={LEADERS[dom].map((l) => ({ ic: l[0], label: l[1], name: l[2], col: l[4], onClick: () => openPerson(l[2]) }))} />

      {/* štatistický riadok — počet vo zvolenom okruhu + výber okruhu */}
      <StatRiadok stat={`V okruhu ${feed.length} aktivít · Mesiac 9 480`}
        okruh={FEED_CFG.radiusy[radius].krat} onOkruh={() => setVyberOkruh(true)} />

      {/* prepínač domén */}
      <div style={{ padding: "2px 12px 8px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 7, minWidth: "max-content", padding: "0 4px" }}>
          {ORDER.map((d) => {
            const a = DOM[d]; const on = dom === d;
            return (
              <div key={d} onClick={() => pickDom(d)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 62, height: 54, borderRadius: 14, cursor: "pointer", flex: "none", transition: ".18s", transform: on ? "translateY(-1px)" : "none", background: on ? tint(a.c, .15) : A.surface2, border: `1px solid ${on ? tint(a.c, .5) : A.line}` }}>
                <div style={{ color: on ? a.c : A.txt2, display: "flex" }}>{DOM_IKONA[d]}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: on ? a.c : A.txt2 }}>{a.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* sub sekcie */}
      <div style={{ display: "flex", gap: 8, padding: "2px 16px 12px", borderBottom: `1px solid ${A.line}`, marginBottom: 4 }}>
        <div onClick={() => pickView("workshop")} style={sub(view === "workshop")}><span style={{ fontSize: 13 }}>🎓</span>Workshopy</div>
        <div onClick={() => pickView("help")} style={sub(view === "help")}><span style={{ fontSize: 13 }}>❓</span>Hľadám pomoc</div>
        <div onClick={() => toast("Market — predaj diel/náradia, fáza 2")} style={sub(false)}><span style={{ fontSize: 13 }}>🛒</span>Market<span style={{ fontSize: 8, background: A.goldBg, color: A.gold, padding: "1px 5px", borderRadius: 5, marginLeft: 2 }}>čoskoro</span></div>
      </div>

      {/* feed — na tablete/PC: skutky & aktivity vľavo, žiadosti o pomoc vpravo */}
      {!feed.length ? (
        <div style={{ textAlign: "center", color: A.txt3, fontSize: 12, padding: "40px 20px", lineHeight: 1.6 }}>V tomto okruhu zatiaľ nič nie je.<br />Skús menší okruh, inú doménu alebo pridaj príspevok cez ＋ Pridať.</div>
      ) : (
        <FeedStlpce wide={dva}
          labelSkutky="Skutky & aktivity" labelZiadosti="Hľadajú pomoc"
          jednoStlpec={feed.map(feedCard)}
          skutky={feed.filter((it) => it.type !== "help").map(feedCard)}
          ziadosti={feed.filter((it) => it.type === "help").map(feedCard)} />
      )}

      {vyberOkruh && <OkruhVyber radius={radius} akcent={DOM[dom].c}
        onPick={(r) => { setRadius(r); setVyberOkruh(false); }}
        onClose={() => setVyberOkruh(false)} />}
    </div>
  );
}

// ---- karty ----
const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
function BigCard({ it, wide, onOpen, onPerson }) {
  return (
    <div onClick={() => onOpen(it.id)} className="good-card" style={{ ...cardS, marginBottom: wide ? 0 : 12, ...(wide ? {} : { margin: "0 -16px 12px", borderRadius: 0, border: "none", borderBottom: `1px solid ${A.line2}` }) }}>
      <div style={{ height: 148, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.dom) }}>
        <span style={badge("l")}>★ {it.importance || DOM[it.dom].label}</span>
        {it.media === "video" && <span style={badge("r")}>▶ video</span>}
        {it.media === "video" ? <Play /> : <div style={{ fontSize: 50 }}>{it.emoji}</div>}
        <div style={{ position: "absolute", bottom: 12, left: 12 }}><DomTag it={it} /></div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={rowTopS}>
          <div onClick={stop(() => onPerson(it.author))} style={{ ...pfpS(it.pfp), cursor: "pointer" }}>{it.ini}</div>
          <div onClick={stop(() => onPerson(it.author))} style={{ ...nameS, cursor: "pointer" }}>{it.author}</div>
          {it.verified && <span style={verifS}>overené</span>}
          <span style={timeS}>{it.time}</span>
        </div>
        <div style={{ fontSize: 10.5, color: A.txt3, marginLeft: 42, marginBottom: 8 }}>{it.loc} · č. {it.num.toLocaleString("sk")}</div>
        <div style={titleS}>{it.title}</div>
      </div>
    </div>
  );
}
function MedCard({ it, wide, onOpen, onPerson }) {
  const a = DOM[it.dom]; const isCase = it.type === "case";
  return (
    <div onClick={() => onOpen(it.id)} style={{ ...cardS, marginBottom: wide ? 0 : 12, display: "flex", padding: 12, gap: 12, alignItems: "flex-start", border: `1px solid ${isCase ? a.bd : A.line}` }}>
      <div style={{ width: 96, height: 80, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: heroGrad(it.dom) }}>{it.media === "kreslene" ? "✎" : it.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{it.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span onClick={stop(() => onPerson(it.author))} style={{ fontSize: 12.5, color: A.txt2, cursor: "pointer", fontWeight: 600 }}>{it.author}</span>
          <DomTag it={it} />
          {isCase && <ProgressMini it={it} />}
        </div>
      </div>
      <span style={timeS}>{it.time}</span>
    </div>
  );
}
function WCard({ it, wide, onOpen, onPerson }) {
  const free = it.price === "free";
  return (
    <div onClick={() => onOpen(it.id)} style={{ ...cardS, marginBottom: wide ? 0 : 12, display: "flex", padding: 12, gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 96, height: 80, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: heroGrad(it.dom) }}>{it.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Wb bg={free ? A.greenBg : A.goldBg} c={free ? A.green : A.gold}>{free ? "ZADARMO" : it.priceTxt}</Wb>
          {it.b2b && <Wb bg={A.blueBg} c={A.blue}>B2B · audit</Wb>}
          {it.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, marginTop: 6 }}>{it.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <span onClick={stop(() => onPerson(it.author))} style={{ fontSize: 12, color: A.txt2, cursor: "pointer", fontWeight: 600 }}>{it.author}</span>
          <span style={{ fontSize: 12, color: A.txt3 }}>· {it.loc}</span>
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
  const pct = Math.round(it.raised / it.goal * 100);
  return (
    <div style={{ width: "100%", marginTop: 6 }}>
      <div style={{ height: 6, background: "rgba(var(--glass-rgb),.12)", borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99 }} /></div>
      <div style={{ fontSize: 9, color: A.txt3, marginTop: 3 }}>{it.raised.toLocaleString("sk")} € z {it.goal.toLocaleString("sk")} € · {pct}% · D++R {it.drr}%</div>
    </div>
  );
}
function ReqCard({ it, wide, onOpen, onPerson }) {
  return (
    <div onClick={() => onOpen(it.id)} style={{ ...cardS, marginBottom: wide ? 0 : 12, border: `1px solid ${A.redBd}`, background: A.redBg }}>
      <div style={{ display: "flex", padding: 14, gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 64, height: 64, borderRadius: 11, background: "rgba(242,112,111,.16)", border: `1px solid ${A.redBd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "var(--acc)", flex: "none" }}>{it.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: "var(--acc)" }}>{it.title}</div>
          <div style={{ fontSize: 12.5, color: A.txt2, marginTop: 6 }}><span onClick={stop(() => onPerson(it.author))} style={{ cursor: "pointer", fontWeight: 600 }}>{it.author}</span> · {it.loc}</div>
          <div style={{ fontSize: 11.5, color: A.txt3, marginTop: 6 }}>❓ Hľadám pomoc · {it.helpers} sa zapojilo</div>
        </div>
      </div>
    </div>
  );
}
function SmallRow({ it, wide, onOpen, onPerson }) {
  const a = DOM[it.dom];
  const ic = it.type === "talent" ? "▶" : it.media === "kreslene" ? "✎" : "▦";
  return (
    <div onClick={() => onOpen(it.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: A.surface, border: `1px solid ${A.line2}`, borderRadius: 12, marginBottom: wide ? 0 : 8, cursor: "pointer" }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flex: "none", background: a.bg, color: a.c, border: `1px solid ${a.bd}` }}>{ic}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", marginRight: 6, background: a.c }} />{it.title}</div>
        <div style={{ fontSize: 11.5, color: A.txt3, marginTop: 3 }}><span onClick={stop(() => onPerson(it.author))} style={{ cursor: "pointer", fontWeight: 600, color: A.txt2 }}>{it.author}</span> · {a.label}{it.karma ? " · " + it.karma : ""}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={timeS}>{it.time}</div>
        <div style={{ color: "#4A4F57", fontSize: 14 }}>›</div>
      </div>
    </div>
  );
}

// ===================== DETAIL =====================
// jednotná hlavička pod-obrazoviek (rovnaká ako vo zvyšku appky)
function BackBar({ title, onBack }) {
  return <Hlavicka title={title} onBack={onBack} />;
}
function DetailHero({ it, onBack, children }) {
  return (
    <div style={{ height: 150, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: heroGrad(it.dom) }}>
      <div onClick={onBack} style={{ position: "absolute", top: 14, left: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", zIndex: 2 }}><IkonaSipVlavo size={20} color="#fff" /></div>
      <div style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", zIndex: 2 }}><IkonaMoznosti size={18} color="#fff" /></div>
      {children}
    </div>
  );
}
const qrCells = () => [...Array(25)].map((_, k) => <i key={k} style={{ background: (k * 7 + 3) % 3 ? "#0B0C0F" : "transparent", borderRadius: 1 }} />);

function Detail({ it, liked, like, support, votes, vote, toast, celebrate, home, openPerson }) {
  if (it.type === "workshop") return <WorkshopDetail it={it} toast={toast} celebrate={celebrate} home={home} openPerson={openPerson} />;
  if (it.type === "help") return <HelpDetail it={it} toast={toast} celebrate={celebrate} home={home} openPerson={openPerson} />;
  return <DeedDetail it={it} liked={liked} like={like} support={support} votes={votes} vote={vote} toast={toast} home={home} openPerson={openPerson} />;
}

function DeedDetail({ it, support, votes, vote, toast, home, openPerson }) {
  const a = DOM[it.dom];
  const [platba, setPlatba] = useState(null); // "EUR" | "DEED"
  const isTalent = it.type === "talent", isCase = it.type === "case";
  const pct = isCase ? Math.min(100, Math.round(it.raised / it.goal * 100)) : 0;
  const supLabel = isTalent ? "OCEŇ TVORCU — klik a hneď odíde" : isCase ? "PRIDAJ SA K MAREKOVI" : "DROBNÁ PODPORA — klik a hneď odíde";
  // overovanie skutku — základ + tvoj hlas
  const myVote = votes[it.id];
  const okCount = (it.mine ? 0 : 4 + ((it.id * 3) % 9)) + (myVote === "ok" ? 1 : 0);
  const noCount = (it.mine ? 0 : (it.id * 2) % 3) + (myVote === "no" ? 1 : 0);

  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero it={it} onBack={home}>
        {it.media === "video" ? <Play big /> : <div style={{ fontSize: 52 }}>{it.emoji}</div>}
        <div style={{ position: "absolute", bottom: 12, left: 14 }}><DomTag it={it} /></div>
      </DetailHero>
      <div style={{ padding: "14px 18px" }}>
        <div onClick={() => openPerson(it.author)} style={{ ...rowTopS, cursor: "pointer" }}>
          <div style={pfpS(it.pfp)}>{it.ini}</div>
          <div>
            <div style={{ ...nameS, display: "flex", alignItems: "center", gap: 6 }}>{it.author} <span style={{ color: "#4A4F57", fontSize: 13 }}>›</span></div>
            <div style={{ fontSize: 12, color: A.txt3 }}>{it.loc} · č. {it.num.toLocaleString("sk")}</div>
          </div>
          {it.verified && <span style={{ ...verifS, marginLeft: "auto" }}>overené</span>}
        </div>
        <div style={{ ...titleS, marginTop: 10, fontSize: 14 }}>{it.title}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 9, color: A.txt2 }}>{it.desc}</p>

        {isCase && (
          <div style={{ textAlign: "center", padding: 12, background: A.surface2, border: `1px solid ${a.bd}`, borderRadius: 12, marginTop: 6 }}>
            <b style={{ fontSize: 22, color: a.c }}>{it.raised.toLocaleString("sk")} €</b> <span style={{ color: A.txt2 }}>z {it.goal.toLocaleString("sk")} € ({pct}%)</span>
            <div style={{ height: 6, background: "rgba(var(--glass-rgb),.12)", borderRadius: 99, marginTop: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: 99, transition: "width .4s ease" }} /></div>
            <div style={{ fontSize: 10, color: A.gold, marginTop: 8, fontWeight: 700 }}>D++R · {it.drr}% z tvojho daru ide Marekovi · overené</div>
            {it.supportCount > 0 && <div style={{ fontSize: 10.5, color: A.green, marginTop: 6, fontWeight: 700 }}>✓ Ty si prispel(a) {it.supportCount}× · ďakujeme</div>}
          </div>
        )}

        <PodporaSekcia
          onShare={() => toast("Zdieľať: odkaz skopírovaný · siete")}
          upvotes={Math.floor((it.likes || 0) / 3)} onUpvote={() => toast("Páči sa ti to")}
          onPodpor={(s) => support(s, it.author, it)} onSms={() => toast("SMS podpora (euro/operátor)")}
          onKanal={(k) => setPlatba(k)} supLabel={supLabel} />

        <div style={{ display: "flex", alignItems: "center", gap: 14, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 14, padding: 12, marginTop: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 8, background: "#fff", flex: "none", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridTemplateRows: "repeat(5,1fr)", gap: 1, padding: 5 }}>{qrCells()}</div>
          <div><div style={{ fontWeight: 700, fontSize: 12.5 }}>QR {isCase ? "tejto akcie" : isTalent ? "tohto talentu" : "tohto skutku"}</div><div style={{ fontSize: 12, color: A.txt3 }}>Zväčšiť a zdieľať na siete</div></div>
          <div onClick={() => toast("Zdieľať: YouTube · IG · TikTok · kopírovať")} style={{ marginLeft: "auto", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 11, padding: "9px 15px", borderRadius: 11, cursor: "pointer", boxShadow: "0 5px 16px rgba(99,134,255,.32)" }}>Zdieľať</div>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: A.txt3, marginTop: 16 }}>
          {myVote ? (myVote === "ok" ? "Označil(a) si tento skutok ako overený. Ďakujeme." : "Podal(a) si námietku — preverí ju AI + komunita.") : "Bol si pri tom? Komunita preveruje skutky."}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <Vbtn ok count={okCount} mine={myVote === "ok"} dim={myVote === "no"} onClick={() => {
            if (myVote) return toast("Už si hlasoval(a) o tomto skutku");
            vote(it.id, "ok"); toast("Ďakujeme — tvoje overenie dvíha dôveryhodnosť");
          }} />
          <Vbtn count={noCount} mine={myVote === "no"} dim={myVote === "ok"} onClick={() => {
            if (myVote) return toast("Už si hlasoval(a) o tomto skutku");
            vote(it.id, "no"); toast("Námietka odoslaná — preverí ju AI + overenie");
          }} />
        </div>
      </div>
      {platba && <PlatbaModal kanal={platba} komu={it.author} onClose={() => setPlatba(null)}
        onDone={(s) => support(s, it.author, it)} />}
    </div>
  );
}

function WorkshopDetail({ it, toast, celebrate, home, openPerson }) {
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

        <div onClick={() => openPerson(it.author)} style={{ display: "flex", alignItems: "center", gap: 10, background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 13, padding: 12, marginTop: 14, cursor: "pointer" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#fff", flex: "none", background: it.pfp }}>{it.ini}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>{it.author} {it.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}</div>
            <div style={{ fontSize: 12, color: A.txt3 }}>{it.karma || "lektor"} · ★ {it.rating} hodnotenie · otvoriť profil</div>
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
        <div style={{ textAlign: "center", padding: "14px 18px 0", fontSize: 11, color: A.txt3 }}>{free ? "Zadarmo · základné prihlásenie." : "Platba cez EUR/DEED · " + it.priceTxt}</div>
      </div>
    </div>
  );
}

function HelpDetail({ it, toast, celebrate, home, openPerson }) {
  const a = DOM[it.dom];
  return (
    <div style={{ paddingBottom: 24 }}>
      <DetailHero it={it} onBack={home}>
        <div style={{ fontSize: 52 }}>{it.emoji}</div>
        <div style={{ position: "absolute", bottom: 12, left: 14 }}><Chip bg={tint(a.c, .14)} c={a.c}>❓ Hľadám pomoc · {a.label}</Chip></div>
      </DetailHero>
      <div style={{ padding: "14px 18px" }}>
        <div onClick={() => openPerson(it.author)} style={{ ...rowTopS, cursor: "pointer" }}>
          <div style={pfpS(it.pfp)}>{it.ini}</div>
          <div><div style={{ ...nameS, display: "flex", alignItems: "center", gap: 6 }}>{it.author} <span style={{ color: "#4A4F57", fontSize: 13 }}>›</span></div><div style={{ fontSize: 12, color: A.txt3 }}>{it.loc} · č. {it.num.toLocaleString("sk")}</div></div>
        </div>
        <div style={{ ...titleS, marginTop: 10, fontSize: 14 }}>{it.title}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 9, color: A.txt2 }}>{it.desc}</p>
        <InfoBox>{it.helpers} ľudí sa už zapojilo. Po prijatí sa otvorí chat, dohodnete sa. Po dokončení: hodnotenie + tip + reťaz dobra.</InfoBox>
        <Btn green onClick={() => { celebrate("Ozval si sa!", `Otvorili sme chat s ${it.author}. Dohodnite si detaily.`); setTimeout(home, 1700); }}>✋ Môžem pomôcť</Btn>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <Cbtn ic={<Zdielanie size={14} color={A.txt} />} t="Zdieľať" s="pošli ďalej" onClick={() => toast("Zdieľané")} />
          <Cbtn ic={<IkonaUlozit size={14} color={A.txt} />} t="Uložiť" s="na neskôr" onClick={() => toast("Uložené")} />
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
function Cbtn({ ic, t, s, tCol, active, onClick }) {
  return (
    <div onClick={onClick} style={{ flex: 1, height: 50, borderRadius: 11, background: active ? "var(--accBg)" : A.surface2, border: `${active ? 2 : 1}px solid ${active ? "var(--accBd)" : A.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .12s ease" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: tCol || A.txt, display: "flex", alignItems: "center", gap: 6 }}>{ic}{t}</div><div style={{ fontSize: 8.5, color: A.txt3, marginTop: 2 }}>{s}</div>
    </div>
  );
}
function Dr({ b, t }) {
  return <div style={{ flex: 1, textAlign: "center", background: A.surface, border: `1px solid ${A.line}`, borderRadius: 11, padding: "11px 4px" }}><b style={{ fontSize: 14 }}>{b}</b><div style={{ fontSize: 9, color: A.txt3, marginTop: 2 }}>{t}</div></div>;
}
function Vbtn({ ok, count = 0, mine, dim, onClick }) {
  return (
    <div onClick={onClick} style={{ flex: 1, height: 62, borderRadius: 13, display: "flex", alignItems: "center", gap: 10, paddingLeft: 16, cursor: "pointer", opacity: dim ? 0.5 : 1, background: ok ? A.greenBg : A.redBg, border: `${mine ? 2 : 1}px solid ${ok ? A.greenBd : A.redBd}`, transition: "opacity .15s ease" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, background: ok ? "rgba(31,191,143,.22)" : "rgba(242,112,111,.22)", color: ok ? A.green : A.red }}>{ok ? "✓" : "✕"}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1, color: ok ? A.green : A.red }}>{mine ? (ok ? "Overené ✓" : "Namietané") : (ok ? "Overujem" : "Namietam")}</div>
        <div style={{ fontSize: 9.5, color: A.txt3 }}>{count} {ok ? "overení" : "námietok"}</div>
      </div>
    </div>
  );
}
// primárne CTA — rovnaký aurora/zelený gradient ako vo zvyšku appky
function Btn({ children, green, onClick }) {
  const base = { width: "100%", height: 50, borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 15.5, cursor: "pointer", marginTop: 18, fontFamily: "inherit", border: "none", transition: "transform .12s ease, box-shadow .25s ease" };
  const styl = green
    ? { ...base, background: GRAD_ZELENY, boxShadow: "0 8px 26px rgba(31,191,143,.32), inset 0 1px 0 rgba(255,255,255,.25)" }
    : { ...base, background: GRAD, boxShadow: "0 8px 26px rgba(99,134,255,.32), inset 0 1px 0 rgba(255,255,255,.25)" };
  return <button onClick={onClick} style={styl}>{children}</button>;
}

// ===================== ＋ PRIDAŤ =====================
function Add({ dom, add, setAdd, toast, celebrate, home, createPost }) {
  const d = dom === "mix" ? "sport" : dom;
  const a = DOM[d];
  const pill = (extra) => ({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 9, marginBottom: 6, background: a.bg, color: a.c, border: `1px solid ${a.bd}`, ...extra });

  if (add) return <AddForm kind={add.kind} d={d} a={a} pill={pill} setAdd={setAdd} toast={toast} celebrate={celebrate} home={home} createPost={createPost} />;

  return (
    <div style={{ paddingBottom: 20 }}>
      <BackBar title="Pridať" onBack={home} />
      <div style={{ padding: 18 }}>
        <div style={pill()}>{a.ic} doména: {a.label} {dom === "mix" ? "(predvolené — zmeň na Domove)" : "(predvyplnené)"}</div>
        <h2 style={{ fontSize: 18, margin: "4px 0" }}>Čo chceš pridať?</h2>
        <div style={{ fontSize: 12, color: A.txt3 }}>Predvyplníme doménu, aby si klikal čo najmenej.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          <Ch ic="✅" t="Pridať skutok" s="spravil som niečo dobré (zabehol, zasadil, pomohol, vytvoril)" onClick={() => setAdd({ kind: "skutok", d })} />
          <Ch ic="🎓" t="Pridať školenie / workshop" s="ponúkam pomoc — učím, vediem, školím" onClick={() => setAdd({ kind: "skolenie", d })} />
          <Ch ic="❓" t="Hľadám pomoc" s="potrebujem mentora, parťáka, dobrovoľníkov" onClick={() => setAdd({ kind: "help", d })} />
        </div>
        <div style={{ padding: "14px 0", fontSize: 11, color: A.txt3, lineHeight: 1.5 }}>Talent (ukáž sa) pridáš tiež cez „Pridať skutok" → typ Talent. Video 45 s (do 1 min), KYC, automatický vodoznak + QR, AI moderácia.</div>
      </div>
    </div>
  );
}

function AddForm({ kind, d, a, pill, setAdd, toast, celebrate, home, createPost }) {
  const isTalentable = kind === "skutok", isSkol = kind === "skolenie";
  const [text, setText] = useState("");
  const [talent, setTalent] = useState(false); // skutok: false = skutok, true = talent
  const [free, setFree] = useState(true);      // školenie: true = zadarmo
  const [checks, setChecks] = useState({ a: false, b: false });
  const tg = (k) => setChecks((c) => ({ ...c, [k]: !c[k] }));

  const titles = { skutok: "Nový skutok", skolenie: "Nové školenie", help: "Hľadám pomoc" };
  const fieldlbl = { fontSize: 11, fontWeight: 700, color: A.txt2, marginTop: 14 };
  const inp = { width: "100%", background: A.surface2, border: `1px solid ${A.line}`, borderRadius: 12, padding: 14, color: A.txt, fontSize: 14, fontFamily: "inherit", resize: "none", marginTop: 8, outline: "none" };

  function submit() {
    if (!text.trim()) return toast(isSkol ? "Najprv zadaj názov workshopu" : kind === "help" ? "Najprv napíš, čo hľadáš" : "Najprv opíš svoj skutok");
    if (isTalentable && !checks.a) return toast("Potvrď prvé vyhlásenie");
    if (isTalentable && talent && !checks.b) return toast("Pri talente potvrď súhlas s vodoznakom");
    if (isSkol && (!checks.a || !checks.b)) return toast("Potvrď obe vyhlásenia (zodpovednosť + oprávnenie školiť)");

    createPost({ kind, d, text, talent: isTalentable && talent, free: isSkol && free });
    const ttl = kind === "skutok" ? (talent ? "Talent pridaný!" : "Skutok pridaný!") : isSkol ? "Workshop vytvorený!" : "Žiadosť zverejnená!";
    const body = kind === "help" ? "Tvoja žiadosť je navrchu feedu. Keď sa niekto ozve, otvorí sa chat."
      : isSkol ? "Workshop sa práve zobrazil vo feede aj na Nástenke."
      : "Práve sa zobrazil navrchu feedu. Ďakujeme, že konáš.";
    celebrate(ttl, body);
    setTimeout(home, 1500);
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <BackBar title={titles[kind]} onBack={() => setAdd(null)} />
      <div style={{ padding: "6px 18px 18px" }}>
        <div style={pill()}>{a.ic} {a.label}</div>

        {isTalentable && (<>
          <div style={fieldlbl}>Typ</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Cbtn t="Skutok" s="popis + foto" active={!talent} onClick={() => setTalent(false)} />
            <Cbtn t="Talent ▶" s="45 s video" tCol={a.c} active={talent} onClick={() => setTalent(true)} />
          </div>
        </>)}

        <div style={fieldlbl}>{isSkol ? "Názov workshopu" : kind === "help" ? "Čo hľadáš" : "Popis skutku"}</div>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={isSkol ? "napr. Akvarel pre začiatočníkov" : kind === "help" ? "napr. Hľadám parťáka na beh..." : "napr. Vyčistili sme breh Váhu..."} style={inp} />

        {isSkol && (<>
          <div style={fieldlbl}>Cena</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Cbtn t="Zadarmo" s="bez auditu" tCol={A.green} active={free} onClick={() => setFree(true)} />
            <Cbtn t="Platené" s="3 QR + KYC" tCol={A.gold} active={!free} onClick={() => setFree(false)} />
          </div>
        </>)}

        <div style={fieldlbl}>Foto / video</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Mslot onClick={() => toast("Nahrať (demo)")}><IkonaPlus size={22} /></Mslot>
          <Mslot onClick={() => toast("Nahrať (demo)")}><IkonaFoto size={22} /></Mslot>
          {isTalentable && talent && <Mslot onClick={() => toast("Video — vodoznak sa pridá automaticky")}><IkonaPlay size={20} /></Mslot>}
        </div>

        <div style={{ background: A.greenBg, border: `1px solid ${A.greenBd}`, borderRadius: 12, padding: 14, marginTop: 14, fontSize: 13, lineHeight: 1.4 }}>🤖 <b>AI pomôže</b> — z popisu navrhne kategóriu, dôležitosť a skontroluje obsah. Pri talente: automatický vodoznak + QR, anti-deepfake.</div>

        {(isTalentable || isSkol) && (<>
          <div style={fieldlbl}>Potvrdenie</div>
          <Check on={checks.a} onClick={() => tg("a")}>Som to ja alebo blízka osoba s jej súhlasom, zodpovedám za obsah.</Check>
          {isTalentable && talent && <Check on={checks.b} onClick={() => tg("b")}>Súhlasím s logom / vodoznakom DEED na videu.</Check>}
          {isSkol && <Check on={checks.b} onClick={() => tg("b")}>Čestne vyhlasujem, že mám oprávnenie toto školiť (vzdelanie/skúška/certifikát) a doklady viem predložiť k auditu.</Check>}
        </>)}

        <Btn onClick={submit}>{kind === "help" ? "Zverejniť žiadosť" : isSkol ? "Vytvoriť workshop" : "Pridať skutok"}</Btn>
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

// ===================== PROFIL OSOBY =====================
function OsobaProfil({ name, items, follows, toggleFollow, onOpen, toast, home }) {
  const p = osoba(name, items);
  const sledujem = !!follows[name];
  const acc = p.domains[0] ? DOM[p.domains[0]] : DOM.mix;
  const followers = p.followers + (sledujem ? 1 : 0);

  const stat = (b, t) => (
    <div style={{ flex: 1, textAlign: "center", background: A.surface, border: `1px solid ${A.line}`, borderRadius: 12, padding: "11px 4px" }}>
      <b style={{ fontSize: 16 }}>{b}</b><div style={{ fontSize: 9.5, color: A.txt3, marginTop: 2 }}>{t}</div>
    </div>
  );
  const karmaCol = { Gold: A.gold, Silver: "#C9D2DE", Bronze: "#CD8B5E", "Nováčik": A.txt3 }[p.karma] || A.txt3;

  return (
    <div style={{ paddingBottom: 24 }}>
      <BackBar title="Profil" onBack={home} />

      {/* hero */}
      <div style={{ padding: "4px 18px 0", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28, color: "#fff", background: p.pfp, border: `2px solid ${acc.c}` }}>{p.ini}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 19, fontWeight: 800 }}>{p.name}</span>
            {p.verified && <span style={verifS}>overené</span>}
            {p.profi && <Wb bg={A.purpleBg} c={A.purple}>PROFI</Wb>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, fontSize: 12.5, color: A.txt3 }}>
            <span style={{ color: karmaCol, fontWeight: 700 }}>◆ {p.karma}</span>
            <span>· 📍 {p.loc}</span>
          </div>
        </div>
      </div>

      {/* bio */}
      <p style={{ padding: "12px 18px 0", margin: 0, fontSize: 14, lineHeight: 1.55, color: A.txt2 }}>{p.bio}</p>

      {/* akcie */}
      <div style={{ display: "flex", gap: 10, padding: "14px 18px 0" }}>
        {p.isMe ? (
          <button onClick={() => toast("Toto je tvoj profil — uprav ho v záložke Profil")} style={{ flex: 1, height: 46, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: A.surface2, border: `1px solid ${A.line}`, color: A.txt }}>To si ty ✦</button>
        ) : (
          <button onClick={() => toggleFollow(name)} style={{ flex: 1, height: 46, borderRadius: 12, fontWeight: 800, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", transition: "all .15s ease", background: sledujem ? A.surface2 : acc.c, border: `1px solid ${sledujem ? A.line : acc.c}`, color: sledujem ? A.txt : "#08131A" }}>
            {sledujem ? "✓ Sledujem" : "+ Sledovať"}
          </button>
        )}
        <button onClick={() => toast(p.isMe ? "Tvoj profil" : `Správa pre ${p.name} (demo)`)} style={{ flex: 1, height: 46, borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: A.surface2, border: `1px solid ${A.line}`, color: A.txt }}>✉ Správa</button>
      </div>

      {/* štatistiky */}
      <div style={{ display: "flex", gap: 8, padding: "14px 18px 0" }}>
        {stat(p.skutky, "skutkov")}
        {stat(followers.toLocaleString("sk"), "sledovateľov")}
        {stat(p.following, "sleduje")}
        {stat(p.domains.length, "oblastí")}
      </div>

      {/* domény */}
      {p.domains.length > 0 && (
        <div style={{ padding: "16px 18px 0" }}>
          <div style={secLbl}>AKTÍVNY V OBLASTIACH</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {p.domains.map((d) => { const a = DOM[d]; return <Chip key={d} bg={tint(a.c, .14)} c={a.c}>{a.ic} {a.label}</Chip>; })}
          </div>
        </div>
      )}

      {/* príspevky */}
      <div style={{ padding: "16px 18px 0" }}>
        <div style={secLbl}>PRÍSPEVKY ({p.items.length})</div>
        {p.items.length === 0 ? (
          <div style={{ textAlign: "center", color: A.txt3, fontSize: 12, padding: "24px 10px", lineHeight: 1.6 }}>Zatiaľ žiadne príspevky.</div>
        ) : p.items.map((it) => {
          const a = DOM[it.dom];
          const lbl = it.type === "talent" ? "Talent" : it.type === "workshop" ? "Workshop" : it.type === "help" ? "Hľadá pomoc" : it.type === "case" ? "Akcia" : "Skutok";
          return (
            <div key={it.id} onClick={() => onOpen(it.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: A.surface, border: `1px solid ${A.line2}`, borderRadius: 12, marginBottom: 8, cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flex: "none", background: a.bg, border: `1px solid ${a.bd}` }}>{it.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                <div style={{ fontSize: 11, color: A.txt3, marginTop: 2 }}><span style={{ color: a.c, fontWeight: 700 }}>{lbl}</span> · {a.label} · {it.time}</div>
              </div>
              <span style={{ color: "#4A4F57", fontSize: 14 }}>›</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "8px 18px 0", fontSize: 11, color: A.txt3, lineHeight: 1.5 }}>
        {p.verified ? "Overený člen — totožnosť/aktivita potvrdená komunitou (KYC)." : "Skutky a karma sú verejné a overené komunitou. Sledovaním uvidíš nové príspevky tejto osoby."}
      </div>
    </div>
  );
}
