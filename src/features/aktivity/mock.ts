// ============================================================
// MODUL AKTIVITY — mock dáta (seed obsah, nástenka, biá, geo)
// Čisté dáta bez JSX. Hodnoty 1:1 prenesené z pôvodného Aktivity.jsx,
// rozšírené o reálne fotky (Unsplash) + geo-rozptyl pre testovanie okruhu.
// ============================================================
import { U } from "@/theme";

// poloha usera (MVP mock — Trenčín, rovnaká ako v ostatných feedoch)
export const USER_LOK = { lat: 48.894, lng: 18.044 };

// ---- foto paleta (overené Unsplash ID; fallback na emoji je automatický) ----
const PH = {
  cyklo: [U("photo-1517649763962-0c623066013b"), U("photo-1476514525535-07fb3b4ae5f1")],
  eko: [U("photo-1542601906990-b4d3fb778b09"), U("photo-1470071459604-3b5ec3a7fe05")],
  les: [U("photo-1441974231531-c6227db76b6e"), U("photo-1448375240586-882707db888b")],
  med: [U("photo-1576091160399-112ba8d25d1d"), U("photo-1584308666744-24d5c474f2ae")],
  senior: [U("photo-1542838132-92c53300491e"), U("photo-1556909114-f6e7ad7d3136")],
  ucenie: [U("photo-1509228468518-180dd4864904")],
  zviera: [U("photo-1450778869180-41d0601e046e")],
  hudba: [U("photo-1501386761578-eac5c94b800a")],
  joga: [U("photo-1506126613408-eca07ce68773")],
  kniha: [U("photo-1507842217343-583bb7270b66")],
  voda: [U("photo-1500382017468-9049fed747ef")],
};

// jedna položka feedu (skutok | talent | workshop | help | case).
// Migračné odľahčené typovanie — voliteľné polia spoločné pre rôzne typy kariet.
export interface AktItem {
  id: number;
  dom: string;
  type: string;
  size?: string;
  media?: string;
  verified?: boolean;
  emoji: string;
  author: string;
  ini: string;
  pfp: string;
  karma?: string;
  loc?: string;
  time?: string;
  num: number;
  likes?: number;
  title: string;
  importance?: string;
  desc?: string;
  price?: string;
  priceTxt?: string;
  seats?: number;
  rating?: string;
  profi?: boolean;
  b2b?: boolean;
  helpers?: number;
  source?: string;
  goal?: number;
  raised?: number;
  drr?: number;
  mine?: boolean;
  skore?: number;
  supportCount?: number;
  fotky?: string[];
  [key: string]: any;
}

// ---- DÁTA (type: skutok | talent | workshop | help | case) ----
export const SEED_ITEMS: AktItem[] = [
  { id: 1, dom: "sport", type: "skutok", size: "big", media: "video", verified: true, emoji: "🚲",
    author: "Cyklo Trenčín", ini: "C", pfp: "#3A8DD6", karma: "Gold", loc: "Trenčín → Nemšová", time: "2 h", num: 140210, likes: 42, fotky: PH.cyklo,
    title: "Mesiac do práce na bicykli namiesto auta — 240 km", importance: "Výnimočný skutok",
    desc: "Nahradil som auto bicyklom celý mesiac. Ušetrené CO2 sa pripočíta do eko skutkov, keď spustíme napojenie na merače." },
  { id: 2, dom: "eko", type: "skutok", size: "med", media: "foto", emoji: "🌿",
    author: "EkoTím Juh", ini: "E", pfp: "#2E7D52", karma: "Silver", loc: "Trenčín · Juh", time: "4 h", num: 140188, likes: 31, fotky: PH.eko,
    title: "Vyčistili sme čiernu skládku pri potoku — 14 vriec",
    desc: "Partia 6 ľudí. Za sobotné dopoludnie sme vyniesli 14 vriec odpadu, ktorý tam roky niekto vyhadzoval. Foto + GPS overené." },
  { id: 3, dom: "art", type: "talent", size: "big", media: "video", emoji: "🎵",
    author: "Tlupa", ini: "T", pfp: "#7A5BD8", karma: "Silver", loc: "Trenčín", time: "5 h", num: 140177, likes: 88, fotky: PH.hudba,
    title: "Ukáž svoj talent — akustická verzia našej novej skladby", importance: "Talent",
    desc: "45 sekúnd naživo, jeden záber. Ak sa páči, hoďte ⭐ — ocenenie ide priamo nám za to, že sme to natočili a zdieľali." },
  { id: 4, dom: "zdravie", type: "skutok", size: "med", media: "foto", emoji: "🩸",
    author: "Martin K.", ini: "M", pfp: "#E98AAD", karma: "Gold", loc: "Trenčín", time: "6 h", num: 140165, likes: 41, fotky: PH.med,
    title: "Daroval krv po výzve nemocnice (0− kritický nedostatok)",
    desc: "Nemocnica hlásila kritický nedostatok 0−. Išiel som hneď ráno. Prvodarcom rastie karma viac." },
  { id: 5, dom: "learn", type: "workshop", size: "med", price: "paid", emoji: "🐍", fotky: PH.ucenie,
    author: "Anna K.", ini: "A", pfp: "#46C2A0", karma: "Gold", loc: "online", time: "streda 18:00", num: 140150, seats: 4, priceTxt: "25 €", rating: "4.9", profi: true,
    title: "Python pre začiatočníkov — 4 lekcie",
    desc: "Od nuly k prvému programu. Online cez náš QR (3 QR: štart / 60 % / koniec). Pre úplných začiatočníkov." },
  { id: 6, dom: "art", type: "workshop", size: "med", price: "free", emoji: "🎨", fotky: [U("photo-1513364776144-60967b0f800f")],
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
  { id: 10, dom: "art", type: "case", size: "med", source: "Charity", verified: true, emoji: "🎸", fotky: PH.hudba,
    author: "Tlupa (kapela)", ini: "T", pfp: "#7A5BD8", loc: "Trenčín", time: "1 d", num: 140100, likes: 60,
    goal: 2200, raised: 1430, helpers: 38, drr: 60,
    title: "Koncert za slepého Mareka z TN — 60 % z darov ide jemu",
    desc: "My ako kapela sme dali prvých 1000 €. Ak sa vám koncert páčil, pridajte sa — 60 % z každého daru ide priamo Marekovi. Overené na chaine." },
  { id: 11, dom: "learn", type: "skutok", size: "small", media: "foto", emoji: "📚", fotky: PH.kniha,
    author: "Lucia B.", ini: "L", pfp: "#46C2A0", karma: "Bronze", loc: "Trenčín · Noviny", time: "1 d", num: 140090, likes: 28,
    title: "Doučujem deti angličtinu zadarmo", desc: "Každý štvrtok pre deti z okolia, ktoré si platené doučovanie nemôžu dovoliť." },
  { id: 12, dom: "sport", type: "skutok", size: "small", media: "foto", emoji: "🏃", fotky: PH.cyklo,
    author: "Peter K.", ini: "P", pfp: "#5BA8F0", karma: "Silver", loc: "Trenčín", time: "2 d", num: 140070, likes: 19,
    title: "Zorganizoval som ranný beh pre seniorov", desc: "Každú stredu o 7:00. Pomalé tempo, hlavne pohyb a spoločnosť." },
  { id: 13, dom: "zdravie", type: "help", size: "small", emoji: "🧘",
    author: "Mária H.", ini: "M", pfp: "#7A3030", loc: "Trenčín", time: "2 d", num: 140050, helpers: 2,
    title: "Hľadám sprievod na cvičenie pre seniorku", desc: "Mama potrebuje sprievod na rehabilitačné cvičenie 2× týždenne." },
  { id: 14, dom: "eko", type: "talent", size: "small", media: "video", emoji: "🌍", fotky: PH.eko,
    author: "Zelený Trenčín", ini: "Z", pfp: "#2E7D52", karma: "Silver", loc: "Trenčín", time: "3 d", num: 140030, likes: 17,
    title: "Ukáž talent — ako spraviť kompost na balkóne", desc: "Krátke video ako začať kompostovať aj v paneláku." },

  { id: 15, dom: "zdravie", type: "skutok", size: "med", media: "foto", emoji: "🏊",
    author: "Klub Delfín", ini: "D", pfp: "#E98AAD", karma: "Silver", loc: "Trenčín · Sihoť", time: "8 h", num: 140025, likes: 36, fotky: PH.voda,
    title: "Plávanie pre deti so zdravotným znevýhodnením — zadarmo",
    desc: "Každú sobotu prenajímame dráhu a učíme deti plávať. Voda im dáva slobodu, akú inde nezažijú." },
  { id: 16, dom: "learn", type: "workshop", size: "med", price: "paid", emoji: "📊", fotky: PH.ucenie,
    author: "Marek T.", ini: "M", pfp: "#46C2A0", karma: "Silver", loc: "Trenčín / online", time: "štvrtok 18:00", num: 140020, seats: 6, priceTxt: "30 €", rating: "4.8", profi: true,
    title: "Excel pre prácu — 3 praktické večery",
    desc: "Od tabuliek po kontingenčné tabuľky a grafy. Praktické príklady z reálnej práce. Audit cez 3 QR." },
  { id: 17, dom: "sport", type: "skutok", size: "small", media: "foto", emoji: "🤸",
    author: "Peter K.", ini: "P", pfp: "#5BA8F0", karma: "Silver", loc: "Trenčín · centrum", time: "1 d", num: 140015, likes: 23, fotky: PH.senior,
    title: "Ranná rozcvička pre seniorov v parku — každý deň o 7:00",
    desc: "Pomalé tempo, dýchanie a strečing. Pohyb a spoločnosť pre každý vek. Pridať sa môže ktokoľvek." },
  { id: 18, dom: "art", type: "talent", size: "big", media: "video", emoji: "🕺",
    author: "Crew TN", ini: "C", pfp: "#7A5BD8", karma: "Silver", loc: "Trenčín", time: "1 d", num: 140010, likes: 94, fotky: PH.hudba,
    title: "Ukáž svoj talent — pouličný tanec našej crew", importance: "Talent",
    desc: "60 sekúnd naživo na námestí. Ak sa páči, hoďte ⭐ — ocenenie ide na kostýmy pre detský oddiel." },
  { id: 19, dom: "eko", type: "workshop", size: "med", price: "free", emoji: "♻️", fotky: PH.eko,
    author: "Zelený Trenčín", ini: "Z", pfp: "#2E7D52", karma: "Silver", loc: "Trenčín · KC Aktivity", time: "sobota 09:00", num: 140005, seats: 10, priceTxt: "zdarma", rating: "4.6", profi: false,
    title: "Ako kompostovať v paneláku — komunitný workshop",
    desc: "Vermikompostér krok po kroku. Materiál a žížaly zabezpečené. Voľný komunitný obsah." },
  { id: 20, dom: "zdravie", type: "workshop", size: "med", price: "paid", emoji: "🚑", fotky: PH.med,
    author: "MUDr. Hraško", ini: "H", pfp: "#E98AAD", karma: "Gold", loc: "Trenčín / online", time: "streda 16:00", num: 139995, seats: 14, priceTxt: "firemné", rating: "5.0", profi: true, b2b: true,
    title: "Prvá pomoc na pracovisku (B2B)",
    desc: "Praktický nácvik resuscitácie a ošetrenia úrazov. Audit-grade dochádzka (3 QR) = doklad pre BOZP. Lektor – lekár." },
  { id: 21, dom: "learn", type: "skutok", size: "small", media: "foto", emoji: "📲", fotky: PH.senior,
    author: "Tomáš R.", ini: "T", pfp: "#5BA8F0", karma: "Gold", loc: "Trenčín · Sihoť", time: "2 d", num: 139985, likes: 21,
    title: "Učím seniorov bezpečne používať mobilné bankovníctvo",
    desc: "Aby ich nikto neokradol cez podvodné SMS. Trpezlivo, krok po kroku, u nich doma." },
  { id: 22, dom: "sport", type: "help", size: "req", emoji: "🏃",
    author: "Zuzana P.", ini: "Z", pfp: "#7A3030", loc: "Trenčín · Noviny", time: "2 d", num: 139975, helpers: 3,
    title: "Hľadám parťáka na ranný beh pred prácou",
    desc: "Bežím o 6:00, tempo 6:00/km, okolo Váhu. Vo dvojici sa lepšie vstáva. Skôr vytrvalostne, nie preteky." },
  { id: 23, dom: "art", type: "workshop", size: "med", price: "paid", emoji: "🏺", fotky: [U("photo-1565193566173-7a0ee3dbe261")],
    author: "Eva M.", ini: "E", pfp: "#A98BF0", karma: "Silver", loc: "Trenčín · centrum", time: "nedeľa 15:00", num: 139965, seats: 8, priceTxt: "20 €", rating: "4.9", profi: true,
    title: "Keramika pre začiatočníkov — práca na kruhu",
    desc: "Vyskúšaj si točenie na hrnčiarskom kruhu. Hlina a výpal v cene. Odnesieš si vlastný hrnček." },
  { id: 24, dom: "eko", type: "talent", size: "small", media: "video", emoji: "🧵", fotky: PH.les,
    author: "Šijacia dielňa", ini: "Š", pfp: "#2E7D52", karma: "Bronze", loc: "Trenčín · Juh", time: "3 d", num: 139955, likes: 19,
    title: "Ukáž talent — taška zo starého trička za 10 minút",
    desc: "Bez šitia, len nožnice. Menej odpadu, viac nápadov. Krátke návodové video." },
  { id: 25, dom: "zdravie", type: "case", size: "med", source: "Charity", verified: true, emoji: "🧘", fotky: PH.joga,
    author: "Coach Eva", ini: "E", pfp: "#E98AAD", loc: "Trenčín · Mestský park", time: "3 d", num: 139945, likes: 47,
    goal: 1500, raised: 640, helpers: 28, drr: 50,
    title: "Benefičná joga za detský hospic Plamienok — 50 % darov",
    desc: "Otvorená hodina jogy v parku. Polovica z každého daru ide hospicu Plamienok. Overené na chaine." },
  { id: 26, dom: "learn", type: "workshop", size: "med", price: "paid", emoji: "💶", fotky: PH.ucenie,
    author: "Ing. Tomáš L.", ini: "T", pfp: "#46C2A0", karma: "Gold", loc: "online", time: "utorok 19:00", num: 139935, seats: 12, priceTxt: "35 €", rating: "4.9", profi: true,
    title: "Základy investovania pre mladých — bez balastu",
    desc: "Ako začať s malými sumami, čo je index a prečo nie je sporenie pod vankúšom plán. Online cez QR." },

  // ---- GEO-ROZPTYL (mesto / okres / kraj) — na testovanie okruhu vo feede ----
  // mesto (~6–13 km): vyšší skóre, aby prešli prahom mesta
  { id: 27, dom: "zdravie", type: "skutok", size: "med", media: "foto", verified: true, emoji: "💧", skore: 5.5,
    author: "Kúpele Trenčianske Teplice", ini: "K", pfp: "#E98AAD", karma: "Silver", loc: "Trenčianske Teplice", time: "7 h", num: 140160, likes: 38, fotky: PH.joga,
    title: "Bezplatné kúpeľné dopoludnie pre opatrovateľov seniorov",
    desc: "Tí, čo sa starajú o blízkych, si zaslúžia oddych. Pozvali sme 40 opatrovateľov na vodoliečbu a masáž zadarmo." },
  { id: 28, dom: "sport", type: "skutok", size: "med", media: "foto", emoji: "⚽", skore: 5.0,
    author: "MŠK Dubnica", ini: "D", pfp: "#3A8DD6", karma: "Silver", loc: "Dubnica n. Váhom", time: "1 d", num: 140080, likes: 44, fotky: PH.cyklo,
    title: "Futbalový krúžok zadarmo pre deti zo sociálne slabších rodín",
    desc: "Dres, lopta aj tréner zadarmo. 30 detí, ktoré by si klub inak nemohli dovoliť. Šport drží partiu spolu." },
  { id: 29, dom: "eko", type: "help", size: "req", emoji: "🌳", skore: 4.5,
    author: "OZ Soblahovčan", ini: "S", pfp: "#7A3030", loc: "Soblahov", time: "2 d", num: 140060, helpers: 6,
    title: "Hľadáme dobrovoľníkov na obnovu náučného chodníka",
    desc: "Vyčistiť, osadiť tabule a lavičky na chodníku pod Ostrým vrchom. Sobota, náradie máme. Treba ruky." },

  // okres (~15–30 km): skóre ≥ 6
  { id: 30, dom: "learn", type: "workshop", size: "med", price: "free", emoji: "📖", skore: 6.5, fotky: PH.kniha,
    author: "CVČ Nové Mesto", ini: "C", pfp: "#46C2A0", karma: "Silver", loc: "Nové Mesto n. Váhom", time: "sobota 14:00", num: 139920, seats: 16, priceTxt: "zdarma", rating: "4.7", profi: false,
    title: "Bezplatný kurz finančnej gramotnosti pre mladých",
    desc: "Rozpočet, sporenie, podvody na internete. Pre stredoškolákov z okresu. Komunitný obsah CVČ." },
  { id: 31, dom: "zdravie", type: "help", size: "req", emoji: "🏥", skore: 6.5,
    author: "Hospic Bánovce", ini: "H", pfp: "#7A3030", loc: "Bánovce n. Bebravou", time: "1 d", num: 139910, helpers: 12,
    title: "Hľadáme dobrovoľníkov k pacientom v paliatívnej starostlivosti",
    desc: "Stačí prísť, posedieť, prečítať. Pre nevyliečiteľne chorých je prítomnosť človeka tým najcennejším." },
  { id: 32, dom: "eko", type: "skutok", size: "med", media: "foto", verified: true, emoji: "🦫", skore: 6.0,
    author: "Dobrovoľníci Ilava", ini: "I", pfp: "#2E7D52", karma: "Silver", loc: "Ilava", time: "2 d", num: 139900, likes: 27, fotky: PH.les,
    title: "Vyčistili sme breh Váhu — odniesli sme 22 vriec a starú pneumatiku",
    desc: "Partia 14 ľudí z okresu. Rieka nie je smetisko. Foto + GPS overené, odpad odviezli technické služby." },

  // kraj (~40–65 km): skóre ≥ 6.5
  { id: 33, dom: "art", type: "talent", size: "big", media: "video", emoji: "💃", skore: 7.0, fotky: PH.hudba,
    author: "Tanečná škola Prievidza", ini: "P", pfp: "#7A5BD8", karma: "Gold", loc: "Prievidza", time: "1 d", num: 139890, likes: 120,
    title: "Ukáž svoj talent — choreografia nášho detského súboru",
    desc: "60 sekúnd naživo. Ocenenia idú na štartovné na majstrovstvá pre deti, ktoré by inak nešli." },
  { id: 34, dom: "zdravie", type: "case", size: "med", source: "Charity", verified: true, emoji: "🐕", skore: 7.0, fotky: PH.zviera,
    author: "Mestský útulok Považská", ini: "Ú", pfp: "#E98AAD", loc: "Považská Bystrica", time: "2 d", num: 139880, likes: 71,
    goal: 3000, raised: 1240, helpers: 52, drr: 70,
    title: "Zbierka na zateplenie kotercov pred zimou — 70 % darov útulku",
    desc: "60 psov a mačiek čaká zima v nezateplených kotercoch. 70 % z každého daru ide priamo na materiál. Overené na chaine." },
];

// ---- geo lokality (pre Feed engine) ----
// Pozn.: geoZLok() matchuje PRVÝ kľúč, ktorého podreťazec je v `loc` (poradie = poradie vloženia).
// Nové vzdialené mestá majú `loc` BEZ blízkych kľúčov (napr. bez „centrum"), aby nedošlo ku kolízii.
export const GEO_LOK: Record<string, { lat: number; lng: number }> = {
  // Trenčín — štvrte (≤ 5 km)
  "Nemšová": { lat: 48.910, lng: 18.078 }, "Juh": { lat: 48.875, lng: 18.030 },
  "Sihoť": { lat: 48.905, lng: 18.030 }, "Zámostie": { lat: 48.892, lng: 18.020 },
  "Noviny": { lat: 48.882, lng: 18.060 }, "centrum": { lat: 48.894, lng: 18.044 },
  "Dlhé Hony": { lat: 48.888, lng: 18.052 }, "Pod Sokolicami": { lat: 48.902, lng: 18.038 },
  "Opatová": { lat: 48.918, lng: 18.046 }, "Mestský park": { lat: 48.896, lng: 18.041 },
  // mesto (~6–13 km)
  "Teplice": { lat: 48.905, lng: 18.165 }, "Soblahov": { lat: 48.848, lng: 18.090 },
  "Turná": { lat: 48.842, lng: 18.080 }, "Drietoma": { lat: 48.872, lng: 17.945 },
  "Skalka": { lat: 48.928, lng: 18.010 }, "Dubnica": { lat: 48.961, lng: 18.190 },
  // okres (~15–33 km)
  "Beckov": { lat: 48.792, lng: 17.900 }, "Nové Mesto": { lat: 48.757, lng: 17.832 },
  "Stará Turá": { lat: 48.776, lng: 17.696 }, "Bánovce": { lat: 48.720, lng: 18.258 },
  "Ilava": { lat: 48.997, lng: 18.234 }, "Púchov": { lat: 49.123, lng: 18.328 },
  "Piešťany": { lat: 48.591, lng: 17.827 },
  // kraj (~40–65 km)
  "Považská": { lat: 49.118, lng: 18.428 }, "Prievidza": { lat: 48.774, lng: 18.627 },
  "Partizánske": { lat: 48.629, lng: 18.380 }, "Topoľčany": { lat: 48.557, lng: 18.166 },
  "Žilina": { lat: 49.223, lng: 18.740 },
};

// ---- NÁSTENKA (udalosti) ----
export const EVENTS: Record<string, string[][]> = {
  sport: [["SO", "09:00", "Benefičný beh pre Julku", "Mesto Trenčín · Sihoť"], ["NE", "10:00", "Cyklo výlet komunity", "Trenčín → Nemšová"], ["PO", "07:00", "Ranná rozcvička pre seniorov", "Mestský park"], ["ST", "18:00", "Plávanie pre deti — Klub Delfín", "Plaváreň Sihoť"], ["SO", "10:00", "Futbalový turnaj detí", "MŠK Dubnica"]],
  art: [["PI", "19:00", "Koncert Tlupa — za Mareka", "KC Aktivity"], ["SO", "17:00", "Výstava mladých umelcov", "Galéria M. A. Bazovského"], ["NE", "15:00", "Keramika na kruhu", "Ateliér, centrum"], ["ŠT", "18:30", "Pouličný tanec — Crew TN", "Mierové námestie"], ["PI", "20:00", "Tanečné vystúpenie súboru", "Prievidza"]],
  learn: [["UT", "17:00", "Workshop: prvá pomoc", "online"], ["ŠT", "18:00", "Doučovanie matematiky", "Knižnica M. Rešetku"], ["UT", "19:00", "Základy investovania", "online"], ["ST", "16:00", "Mobilné bankovníctvo pre seniorov", "KC Sihoť"], ["SO", "14:00", "Finančná gramotnosť", "CVČ Nové Mesto"]],
  eko: [["SO", "09:00", "Jarná výsadba stromov", "Park Sihoť"], ["NE", "08:00", "Čistenie brehu Váhu", "Nábrežie"], ["SO", "09:00", "Kompostovanie v paneláku", "KC Aktivity"], ["SO", "08:00", "Komunitná záhrada — sadenie", "Záhrada Juh"], ["SO", "09:00", "Obnova náučného chodníka", "Soblahov"]],
  zdravie: [["UT", "17:00", "Stres management (firemné)", "online"], ["ŠT", "16:00", "Darovanie krvi — mobilná", "NTS Trenčín"], ["ST", "16:00", "Prvá pomoc na pracovisku", "online"], ["NE", "15:00", "Benefičná joga za Plamienok", "Mestský park"], ["SO", "09:00", "Kúpeľné dopoludnie pre opatrovateľov", "Trenčianske Teplice"]],
  mix: [["PI", "19:00", "Koncert Tlupa — za Mareka", "KC Aktivity"], ["SO", "09:00", "Jarná výsadba stromov", "Park Sihoť"], ["UT", "17:00", "Stres management (firemné)", "online"], ["NE", "08:00", "Čistenie brehu Váhu", "Nábrežie"], ["PO", "07:00", "Ranná rozcvička pre seniorov", "Mestský park"], ["NE", "15:00", "Benefičná joga za Plamienok", "Mestský park"]],
};

// ---- PROFILY ĽUDÍ ----
// krátke bio pre známych autorov (ostatní dostanú odvodený popis)
export const BIOS: Record<string, string> = {
  "Cyklo Trenčín": "Komunita cyklistov v Trenčíne. Jazdíme do práce aj za dobrom — každý kilometer sa ráta.",
  "EkoTím Juh": "Dobrovoľnícky eko tím z trenčianskeho Juhu. Čistíme, sadíme, separujeme.",
  "Tlupa": "Lokálna kapela. Hudbou pomáhame — výťažok z koncertov ide tým, čo to potrebujú.",
  "Martin K.": "Pravidelný darca krvi a dobrovoľník. Keď nemocnica zavolá, idem.",
  "Anna K.": "Lektorka programovania. Učím od nuly, trpezlivo a prakticky.",
  "Eva M.": "Akvarelistka a keramikárka. Vediem voľné workshopy pre začiatočníkov.",
  "Mgr. Nováková": "Psychologička so zameraním na prevenciu vyhorenia. Školím firmy aj jednotlivcov.",
  "Lucia B.": "Doučujem deti angličtinu zadarmo. Vzdelanie má byť dostupné každému.",
  "Peter K.": "Organizujem ranné behy a rozcvičky pre seniorov. Pohyb a spoločnosť pre každý vek.",
  "Zelený Trenčín": "Mestská eko iniciatíva. Kompostovanie, výsadba, osveta.",
  "Klub Delfín": "Plavecký klub pre deti so zdravotným znevýhodnením. Voda im dáva slobodu.",
  "Marek T.": "Dátový analytik. Učím Excel prakticky — tak, ako ho naozaj treba v práci.",
  "Crew TN": "Pouličná tanečná crew. Tancom zbierame na kostýmy pre detský oddiel.",
  "MUDr. Hraško": "Lekár a školiteľ prvej pomoci. Prevencia a pokoj v kríze sa dajú naučiť.",
  "Tomáš R.": "Pomáham seniorom s technikou. Aby ich nikto neokradol cez podvodné SMS.",
  "Zuzana P.": "Bežkyňa a dobrovoľníčka. Sprevádzam susedov, ktorí to sami nezvládnu.",
  "Šijacia dielňa": "Komunitná dielňa. Z odpadu robíme veci, ktoré ešte poslúžia.",
  "Coach Eva": "Lektorka jogy. Spájam pohyb s pomocou — časť z hodín ide na dobro.",
  "Ing. Tomáš L.": "Ekonóm. Učím mladých základy financií, zrozumiteľne a bez balastu.",
  "Kúpele Trenčianske Teplice": "Historické kúpele. Časť kapacít venujeme tým, čo sa starajú o druhých.",
  "MŠK Dubnica": "Mestský športový klub. Šport má byť dostupný každému dieťaťu.",
  "OZ Soblahovčan": "Občianske združenie zo Soblahova. Staráme sa o chodníky, prírodu a komunitu.",
  "CVČ Nové Mesto": "Centrum voľného času. Vzdelávame deti a mládež aj mimo školy.",
  "Hospic Bánovce": "Paliatívna starostlivosť o nevyliečiteľne chorých. Dôstojnosť do poslednej chvíle.",
  "Dobrovoľníci Ilava": "Partia dobrovoľníkov z Ilavy. Čistíme rieku, sadíme, pomáhame.",
  "Tanečná škola Prievidza": "Tanečná škola pre deti a mládež. Talent otvára dvere, aj keď chýbajú peniaze.",
  "Mestský útulok Považská": "Útulok pre opustené zvieratá. Hľadáme im domov a darcov na prevádzku.",
};
