// ============================================================
// MODUL DOMOV (DEED Good) — MOCK dáta
// Čisté dátové polia presunuté z Good.jsx (žiadne JSX → .ts).
// KAT = farby kategórií, POLOZKY = feed skutkov, EVENTS = nástenka.
// ============================================================
import { U } from "@/theme";
import type { GoodPolozka, KategoriaKonfig, Kategoria, Udalost, UdalostZdroj } from "@/types";

// ---- kategórie ----
export const KAT: Record<Kategoria, KategoriaKonfig> = {
  Komunita: { c: "#5BA8F0", bg: "#10233a", bg2: "#1d3f63", bd: "#2A5E8E" },
  Priroda: { c: "#3DD68C", bg: "#0f2417", bg2: "#1c4029", bd: "#2E7D52", label: "Príroda" },
  Zdravie: { c: "#3DD6CE", bg: "#0d2422", bg2: "#163f3a", bd: "#2E9E9E" },
  Ucenie: { c: "#A98BF0", bg: "#1a1430", bg2: "#2c2350", bd: "#7A5BD8", label: "Učenie" },
  Pomoc: { c: "#F2706F", bg: "#2a1414", bg2: "#451f1f", bd: "#7A3030" },
  // Zdravie2 doplnené v module Charita; v Good sa nepoužíva.
  Zdravie2: { c: "#3DD6CE", bg: "#0d2422", bg2: "#163f3a", bd: "#2E9E9E" },
};

// ---- mock feed skutkov ----
export const POLOZKY: GoodPolozka[] = [
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

// ---- NÁSTENKA — udalosti v okolí ----
export const SRC_COL: Record<UdalostZdroj, string> = { Komunita: "#A98BF0", Mesto: "#7FC2EF", Partner: "#C264D8" };

export const EVENTS: Udalost[] = [
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
