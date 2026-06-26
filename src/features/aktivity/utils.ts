// ============================================================
// MODUL AKTIVITY — pomocné funkcie (perzistencia + odvodené dáta)
// Bez JSX → čistý .ts. Logika 1:1 prenesená z pôvodného Aktivity.jsx.
// ============================================================
import { DOM, KARMA_ORDER, SKORE_VELKOST, TYP_ENGINE, MODUL_ENGINE } from "./domeny";
import { BIOS, GEO_LOK, type AktItem } from "./mock";

// ---- perzistencia (localStorage) ----
export const LS = {
  posts: "deed.aktivity.posts.v1",     // používateľom vytvorené príspevky
  likes: "deed.aktivity.likes.v1",     // { [id]: true }
  votes: "deed.aktivity.votes.v1",     // { [id]: "ok" | "no" }
  deltas: "deed.aktivity.deltas.v1",   // { [id]: { raised, helpers, support } }
  follows: "deed.aktivity.follows.v1", // { [meno]: true }
};
export function load<T>(key: string, fallback: T): T {
  try { const v = JSON.parse(localStorage.getItem(key) as string); return v == null ? fallback : v; }
  catch { return fallback; }
}
export function save(key: string, val: any) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

// ---- geo / čas helpery (pre Feed engine) ----
export function geoZLok(loc = "") {
  for (const k in GEO_LOK) if (loc.includes(k)) return GEO_LOK[k];
  return { lat: 48.894, lng: 18.044 }; // default — Trenčín centrum
}
export function dniZCasu(t = "") {
  const m = String(t).match(/(\d+)\s*d/);
  return m ? +m[1] : 0; // "1 d" → 1; "2 h"/"teraz"/rozvrhy workshopov ("streda 18:00") → 0
}

// SEED_ITEMS aj používateľské príspevky majú vlastný slovník (type/size/loc/time).
// Engine potrebuje typ/skore/geo/dni/podpora — odvodíme ich tu (MVP mock; neskôr
// reálne skóre z AI + GPS). `size`/`type` NEMENÍME, aby ostali pôvodné karty.
export function obohatit(it: AktItem): AktItem {
  return {
    ...it,
    typ: TYP_ENGINE[it.type] || "skutok",
    modul: MODUL_ENGINE[it.type] || "good",
    kat: it.dom, typSituacie: "normal",
    overene: !!it.verified, // engine číta `overene` (hustota B.10); seed má `verified`
    narodne: /online/i.test(it.loc || ""), // online (workshopy) nie sú viazané na okruh
    skore: it.skore ?? SKORE_VELKOST[it.size as string] ?? 3,
    ...geoZLok(it.loc),
    dni: dniZCasu(it.time),
    podpora: it.likes ? Math.round(it.likes / 3) : (it.helpers || 0),
  };
}

// ---- vytvorenie nového príspevku zo sprievodcu ＋ Pridať ----
let _seq = 0;
export interface NovyPostSpec { kind: string; d: string; text?: string; talent?: boolean; free?: boolean; }
export function vytvorPost({ kind, d, text, talent, free }: NovyPostSpec): AktItem {
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

// ---- odvodenie profilu osoby z jej príspevkov ----
export function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
export function osoba(name: string, items: AktItem[]) {
  const mine = items.filter((it) => it.author === name);
  const first = mine[0] || ({} as AktItem);
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
