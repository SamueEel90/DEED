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

  { id: 8, typ: "ziadost", nazov: "Rodina Horváthová", overeny: true, karma: "Bronze", lok: "Trenčín · Zámostie",
    skore: 6, typSituacie: "normal", modul: "help", kat: "Pomoc", lat: 48.892, lng: 18.020, dni: 0, podpora: 11,
    pribeh: "Samoživiteľka s tromi deťmi — pokazila sa nám práčka a na novú nemám. Pranie pre päť ľudí ručne už nestíham.",
    suma: 120, ciel: 350, ludia: 11, ikona: "🧺", velkost: "stredna", avatar: AV(31) },

  { id: 9, typ: "ponuka", nazov: "Ing. Tomáš L.", odbornik: true, lok: "Centrum · online",
    skore: 4, typSituacie: "normal", modul: "help", kat: "Komunita", narodne: true, lat: 48.894, lng: 18.044, dni: 0, podpora: 6,
    pribeh: "Daňové a účtovné poradenstvo zadarmo pre seniorov a samoživiteľov. 15 rokov prax, pomôžem s priznaním aj odvolaním.",
    ikona: "🧾", velkost: "stredna" },

  { id: 10, typ: "ziadost", nazov: "Štefan B. (71)", overeny: true, karma: "Silver", lok: "Trenčín · Sihoť",
    skore: 5.5, typSituacie: "normal", modul: "help", kat: "Zdravie", lat: 48.905, lng: 18.030, dni: 0, podpora: 14,
    pribeh: "Chodím na onkológiu do Bratislavy raz týždenne. Vlakom je to s mojím stavom veľmi ťažké, hľadám spolujazdu alebo odvoz.",
    ikona: "🚙", velkost: "stredna", avatar: AV(52) },

  { id: 11, typ: "ponuka", nazov: "Peter H. — murár", odbornik: true, lok: "Juh",
    skore: 3.5, typSituacie: "normal", modul: "help", kat: "Komunita", lat: 48.875, lng: 18.030, dni: 1, podpora: 4,
    pribeh: "Zadarmo opravím drobnosti seniorom — kvapkajúci kohútik, uvoľnená zásuvka, zaseknuté dvere. Stačí zavolať.",
    ikona: "🧰", velkost: "riadok" },

  { id: 12, typ: "ziadost", nazov: "Mladá rodina K.", overeny: true, karma: "Bronze", lok: "Trenčín · Noviny",
    skore: 7, typSituacie: "normal", modul: "help", kat: "Zdravie", lat: 48.882, lng: 18.060, dni: 0, podpora: 27,
    pribeh: "Dvojičky sa nám narodili predčasne. Potrebujeme špeciálne zdravotnícke pomôcky a monitor dychu, ktoré poisťovňa nehradí.",
    suma: 760, ciel: 2000, ludia: 27, ikona: "👶", velkost: "velka", avatar: AV(45),
    fotky: [U("photo-1584308666744-24d5c474f2ae"), U("photo-1579684385127-1ef15d508118")] },

  { id: 13, typ: "ponuka", nazov: "Lucia — kaderníčka", odbornik: true, lok: "Dlhé Hony",
    skore: 3, typSituacie: "normal", modul: "help", kat: "Zdravie", lat: 48.888, lng: 18.052, dni: 1, podpora: 5,
    pribeh: "Imobilným a seniorom ostrihám vlasy priamo doma, zadarmo. Maličkosť, ktorá vie veľmi potešiť.",
    ikona: "✂️", velkost: "riadok" },

  { id: 14, typ: "ponuka", nazov: "Mária V. — učiteľka", odbornik: true, lok: "online",
    skore: 4, typSituacie: "normal", modul: "help", kat: "Ucenie", narodne: true, lat: 48.894, lng: 18.044, dni: 1, podpora: 7,
    pribeh: "Doučím slovenčinu a matematiku deťom, ktoré si platené doučovanie nemôžu dovoliť. Online aj naživo v knižnici.",
    ikona: "📕", velkost: "stredna" },

  { id: 15, typ: "ziadost", nazov: "Jozef P. (vozičkár)", overeny: true, karma: "Silver", lok: "Trenčín · Zámostie",
    skore: 5, typSituacie: "normal", modul: "help", kat: "Pomoc", lat: 48.892, lng: 18.020, dni: 2, podpora: 16,
    pribeh: "Do vchodu sa bez rampy nedostanem sám. Hľadám pomoc s vybudovaním bezbariérovej rampy a príspevok na materiál.",
    suma: 540, ciel: 900, ludia: 16, ikona: "♿", velkost: "stredna", avatar: AV(60) },

  { id: 16, typ: "ponuka", nazov: "Roman — automechanik", odbornik: true, lok: "Juh",
    skore: 3, typSituacie: "normal", modul: "help", kat: "Komunita", lat: 48.875, lng: 18.030, dni: 2, podpora: 4,
    pribeh: "Pred zimou skontrolujem auto zadarmo samoživiteľkám — brzdy, svetlá, kvapaliny, gumy. Bezpečnosť detí je dôležitá.",
    ikona: "🔧", velkost: "riadok" },

  { id: 17, typ: "ziadost", nazov: "Útulok Túlavá labka", overeny: true, karma: "Silver", lok: "Trenčín · okraj",
    skore: 4.5, typSituacie: "normal", modul: "help", kat: "Komunita", lat: 48.870, lng: 18.060, dni: 1, podpora: 22,
    pribeh: "Na zimu nám chýba krmivo a deky pre 40 psov a mačiek. Privítame aj materiálnu pomoc či venčiarov-dobrovoľníkov.",
    suma: 180, ciel: 600, ludia: 22, ikona: "🐾", velkost: "stredna",
    fotky: [U("photo-1450778869180-41d0601e046e")] },

  { id: 18, typ: "ponuka", nazov: "Mgr. Eva R. — psychológ", odbornik: true, lok: "online",
    skore: 5, typSituacie: "normal", modul: "help", kat: "Zdravie", narodne: true, lat: 48.894, lng: 18.044, dni: 0, podpora: 9,
    pribeh: "Bezplatné krízové konzultácie pre mladých v ťažkej situácii. Diskrétne, online, bez čakačky. Niekedy stačí, že vás niekto vypočuje.",
    ikona: "🧠", velkost: "stredna" },
];

// ---- ŽIVÝ TICKER DAROV (mock) ----
export const ZIVE_DARY: ZivyDar[] = [
  { kto: "Anna M.", co: "5 €", komu: "Rodina Kováčová" },
  { kto: "Peter V.", co: "💎 50 DEED", komu: "Marek B." },
  { kto: "LIDL", co: "500 € · D++", komu: "Marek B." },
  { kto: "Ján H.", co: "10 €", komu: "Žofia K." },
  { kto: "Eva K.", co: "🔥 100 DEED", komu: "Rodina Kováčová" },
  { kto: "Mária T.", co: "SMS dar 2 €", komu: "Žofia K." },
  { kto: "Lukáš H.", co: "20 €", komu: "Mladá rodina K." },
  { kto: "Kaufland", co: "300 € · matching", komu: "Mladá rodina K." },
  { kto: "Zuzana P.", co: "💎 30 DEED", komu: "Štefan B. (71)" },
  { kto: "Anonym", co: "15 €", komu: "Rodina Horváthová" },
  { kto: "Tomáš R.", co: "SMS dar 2 €", komu: "Jozef P. (vozičkár)" },
  { kto: "Mesto Trenčín", co: "🔥 200 DEED", komu: "Útulok Túlavá labka" },
  { kto: "Eva K.", co: "10 €", komu: "Pani Oľga (78)" },
  { kto: "Jana N.", co: "💎 40 DEED", komu: "Karol M." },
];
