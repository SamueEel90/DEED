import { U, AV } from "@/theme";
import type { HelpFeedItem, ZivyDar } from "@/types";

// poloha usera (MVP mock — Trenčín, rovnaká ako v ostatných feedoch)
export const USER_LOK = { lat: 48.894, lng: 18.044 };

// ---- MOCK FEED ----
export const MOCK_FEED: HelpFeedItem[] = [
  { id: 7, typ: "ziadost", nazov: "Marek B.", overeny: true, karma: "Gold", lok: "Trenčín · Juh",
    skore: 8, typSituacie: "normal", modul: "help", kat: "Zdravie", lat: 48.875, lng: 18.030, dni: 0, podpora: 52,
    pribeh: "Po operácii chrbtice potrebujem rehabilitácie, ktoré poisťovňa neprepláca. Chcem sa vrátiť do práce a k deťom.",
    suma: 1250, ciel: 1800, ludia: 52, ikona: "🦴", velkost: "velka",
    fotky: ["/img/chrbtica.jpg", U("photo-1576091160399-112ba8d25d1d"), U("photo-1584308666744-24d5c474f2ae"), U("photo-1579684385127-1ef15d508118")],
    avatar: AV(68),
    sponzor: { meno: "LIDL", suma: 500 } },
  { id: 1, typ: "ziadost", nazov: "Rodina Kováčová", overeny: true, karma: "Silver", lok: "Trenčín · Zámostie",
    skore: 9, typSituacie: "kriza", modul: "help", kat: "Pomoc", lat: 48.892, lng: 18.020, dni: 0, podpora: 38,
    pribeh: "V noci nám zhorel dom, ostali sme bez strechy s dvomi deťmi. Potrebujeme provizórne bývanie a základné veci.",
    suma: 1430, ciel: 2200, ludia: 38, ikona: "🔥", velkost: "velka",
    fotky: ["/img/dom.jpg", U("photo-1542856391-010fb87dcfed"), U("photo-1500382017468-9049fed747ef")],
    avatar: AV(47) },
  { id: 2, typ: "ponuka", nazov: "Mgr. Lucia D.", odbornik: true, lok: "Centrum · online",
    skore: 4, typSituacie: "normal", modul: "help", kat: "Ucenie", narodne: true, lat: 48.894, lng: 18.044, dni: 0, podpora: 5,
    pribeh: "Doučím matematiku a fyziku, 8 rokov praxe, certifikát doložený.", ikona: "🎓", velkost: "stredna",
    fotky: [U("photo-1509228468518-180dd4864904")] },
  { id: 3, typ: "charity", nazov: "Charita XY", sponzor: true,
    skore: 6, typSituacie: "normal", modul: "charity", kat: "Priroda", lat: 48.890, lng: 18.050, dni: 0, podpora: 20,
    pribeh: "Hľadá 10 dobrovoľníkov · výsadba stromov · sobota Brezina", ikona: "XY",
    fotky: [U("photo-1542601906990-b4d3fb778b09"), U("photo-1441974231531-c6227db76b6e")] },
  { id: 4, typ: "ponuka", nazov: "Jozef K.", odbornik: false, lok: "Juh",
    skore: 2.5, typSituacie: "normal", modul: "help", kat: "Komunita", lat: 48.875, lng: 18.030, dni: 1, podpora: 3,
    pribeh: "Pomôžem so sťahovaním cez víkend.", ikona: "🧰", velkost: "riadok" },
  { id: 5, typ: "ziadost", nazov: "Žofia K.", overeny: true, karma: "Bronze", lok: "Trenčín · Sihoť",
    skore: 5, typSituacie: "normal", modul: "help", kat: "Zdravie", lat: 48.905, lng: 18.030, dni: 1, podpora: 14,
    pribeh: "Po úraze tri mesiace bez príjmu, potrebujem na nájom a lieky.", suma: 520, ciel: 800, ludia: 14,
    ikona: "🩺", velkost: "stredna",
    fotky: [U("photo-1584308666744-24d5c474f2ae"), U("photo-1471864190281-a93a3070b6de")], avatar: AV(12) },
  { id: 6, typ: "charity", nazov: "Zelená plus", sponzor: false,
    skore: 4, typSituacie: "normal", modul: "charity", kat: "Komunita", lat: 48.882, lng: 18.060, dni: 2, podpora: 6,
    pribeh: "Triedenie šatstva pre útulok · streda", ikona: "ZP" },
];

// ---- ŽIVÝ TICKER DAROV (mock) ----
export const ZIVE_DARY: ZivyDar[] = [
  { kto: "Anna M.", co: "5 €", komu: "Rodina Kováčová" },
  { kto: "Peter V.", co: "💎 50 DEED", komu: "Marek B." },
  { kto: "LIDL", co: "500 € · D++", komu: "Marek B." },
  { kto: "Ján H.", co: "10 €", komu: "Žofia K." },
  { kto: "Eva K.", co: "🔥 100 DEED", komu: "Rodina Kováčová" },
  { kto: "Mária T.", co: "SMS dar 2 €", komu: "Žofia K." },
];
