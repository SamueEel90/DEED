// ============================================================
// MODUL AKTIVITY — mock dáta (seed obsah, nástenka, biá, geo)
// Čisté dáta bez JSX. Hodnoty 1:1 prenesené z pôvodného Aktivity.jsx.
// ============================================================

// poloha usera (MVP mock — Trenčín, rovnaká ako v ostatných feedoch)
export const USER_LOK = { lat: 48.894, lng: 18.044 };

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
  [key: string]: any;
}

// ---- DÁTA (type: skutok | talent | workshop | help | case) ----
export const SEED_ITEMS: AktItem[] = [
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

  { id: 15, dom: "zdravie", type: "skutok", size: "med", media: "foto", emoji: "🏊",
    author: "Klub Delfín", ini: "D", pfp: "#E98AAD", karma: "Silver", loc: "Trenčín · Sihoť", time: "8 h", num: 140025, likes: 36,
    title: "Plávanie pre deti so zdravotným znevýhodnením — zadarmo",
    desc: "Každú sobotu prenajímame dráhu a učíme deti plávať. Voda im dáva slobodu, akú inde nezažijú." },
  { id: 16, dom: "learn", type: "workshop", size: "med", price: "paid", emoji: "📊",
    author: "Marek T.", ini: "M", pfp: "#46C2A0", karma: "Silver", loc: "Trenčín / online", time: "štvrtok 18:00", num: 140020, seats: 6, priceTxt: "30 €", rating: "4.8", profi: true,
    title: "Excel pre prácu — 3 praktické večery",
    desc: "Od tabuliek po kontingenčné tabuľky a grafy. Praktické príklady z reálnej práce. Audit cez 3 QR." },
  { id: 17, dom: "sport", type: "skutok", size: "small", media: "foto", emoji: "🤸",
    author: "Peter K.", ini: "P", pfp: "#5BA8F0", karma: "Silver", loc: "Trenčín · centrum", time: "1 d", num: 140015, likes: 23,
    title: "Ranná rozcvička pre seniorov v parku — každý deň o 7:00",
    desc: "Pomalé tempo, dýchanie a strečing. Pohyb a spoločnosť pre každý vek. Pridať sa môže ktokoľvek." },
  { id: 18, dom: "art", type: "talent", size: "big", media: "video", emoji: "🕺",
    author: "Crew TN", ini: "C", pfp: "#7A5BD8", karma: "Silver", loc: "Trenčín", time: "1 d", num: 140010, likes: 94,
    title: "Ukáž svoj talent — pouličný tanec našej crew", importance: "Talent",
    desc: "60 sekúnd naživo na námestí. Ak sa páči, hoďte ⭐ — ocenenie ide na kostýmy pre detský oddiel." },
  { id: 19, dom: "eko", type: "workshop", size: "med", price: "free", emoji: "♻️",
    author: "Zelený Trenčín", ini: "Z", pfp: "#2E7D52", karma: "Silver", loc: "Trenčín · KC Aktivity", time: "sobota 09:00", num: 140005, seats: 10, priceTxt: "zdarma", rating: "4.6", profi: false,
    title: "Ako kompostovať v paneláku — komunitný workshop",
    desc: "Vermikompostér krok po kroku. Materiál a žížaly zabezpečené. Voľný komunitný obsah." },
  { id: 20, dom: "zdravie", type: "workshop", size: "med", price: "paid", emoji: "🚑",
    author: "MUDr. Hraško", ini: "H", pfp: "#E98AAD", karma: "Gold", loc: "Trenčín / online", time: "streda 16:00", num: 139995, seats: 14, priceTxt: "firemné", rating: "5.0", profi: true, b2b: true,
    title: "Prvá pomoc na pracovisku (B2B)",
    desc: "Praktický nácvik resuscitácie a ošetrenia úrazov. Audit-grade dochádzka (3 QR) = doklad pre BOZP. Lektor – lekár." },
  { id: 21, dom: "learn", type: "skutok", size: "small", media: "kreslene", emoji: "📲",
    author: "Tomáš R.", ini: "T", pfp: "#5BA8F0", karma: "Gold", loc: "Trenčín · Sihoť", time: "2 d", num: 139985, likes: 21,
    title: "Učím seniorov bezpečne používať mobilné bankovníctvo",
    desc: "Aby ich nikto neokradol cez podvodné SMS. Trpezlivo, krok po kroku, u nich doma." },
  { id: 22, dom: "sport", type: "help", size: "req", emoji: "🏃",
    author: "Zuzana P.", ini: "Z", pfp: "#7A3030", loc: "Trenčín · Noviny", time: "2 d", num: 139975, helpers: 3,
    title: "Hľadám parťáka na ranný beh pred prácou",
    desc: "Bežím o 6:00, tempo 6:00/km, okolo Váhu. Vo dvojici sa lepšie vstáva. Skôr vytrvalostne, nie preteky." },
  { id: 23, dom: "art", type: "workshop", size: "med", price: "paid", emoji: "🏺",
    author: "Eva M.", ini: "E", pfp: "#A98BF0", karma: "Silver", loc: "Trenčín · centrum", time: "nedeľa 15:00", num: 139965, seats: 8, priceTxt: "20 €", rating: "4.9", profi: true,
    title: "Keramika pre začiatočníkov — práca na kruhu",
    desc: "Vyskúšaj si točenie na hrnčiarskom kruhu. Hlina a výpal v cene. Odnesieš si vlastný hrnček." },
  { id: 24, dom: "eko", type: "talent", size: "small", media: "video", emoji: "🧵",
    author: "Šijacia dielňa", ini: "Š", pfp: "#2E7D52", karma: "Bronze", loc: "Trenčín · Juh", time: "3 d", num: 139955, likes: 19,
    title: "Ukáž talent — taška zo starého trička za 10 minút",
    desc: "Bez šitia, len nožnice. Menej odpadu, viac nápadov. Krátke návodové video." },
  { id: 25, dom: "zdravie", type: "case", size: "med", source: "Charity", verified: true, emoji: "🧘",
    author: "Coach Eva", ini: "E", pfp: "#E98AAD", loc: "Trenčín · Mestský park", time: "3 d", num: 139945, likes: 47,
    goal: 1500, raised: 640, helpers: 28, drr: 50,
    title: "Benefičná joga za detský hospic Plamienok — 50 % darov",
    desc: "Otvorená hodina jogy v parku. Polovica z každého daru ide hospicu Plamienok. Overené na chaine." },
  { id: 26, dom: "learn", type: "workshop", size: "med", price: "paid", emoji: "💶",
    author: "Ing. Tomáš L.", ini: "T", pfp: "#46C2A0", karma: "Gold", loc: "online", time: "utorok 19:00", num: 139935, seats: 12, priceTxt: "35 €", rating: "4.9", profi: true,
    title: "Základy investovania pre mladých — bez balastu",
    desc: "Ako začať s malými sumami, čo je index a prečo nie je sporenie pod vankúšom plán. Online cez QR." },
];

// ---- geo lokality (pre Feed engine) ----
export const GEO_LOK: Record<string, { lat: number; lng: number }> = {
  "Nemšová": { lat: 48.910, lng: 18.078 }, "Juh": { lat: 48.875, lng: 18.030 },
  "Sihoť": { lat: 48.905, lng: 18.030 }, "Zámostie": { lat: 48.892, lng: 18.020 },
  "Noviny": { lat: 48.882, lng: 18.060 }, "centrum": { lat: 48.894, lng: 18.044 },
  "Dlhé Hony": { lat: 48.888, lng: 18.052 }, "Pod Sokolicami": { lat: 48.902, lng: 18.038 },
  "Opatová": { lat: 48.918, lng: 18.046 }, "Mestský park": { lat: 48.896, lng: 18.041 },
};

// ---- NÁSTENKA (udalosti) ----
export const EVENTS: Record<string, string[][]> = {
  sport: [["SO", "09:00", "Benefičný beh pre Julku", "Mesto Trenčín · Sihoť"], ["NE", "10:00", "Cyklo výlet komunity", "Trenčín → Nemšová"], ["PO", "07:00", "Ranná rozcvička pre seniorov", "Mestský park"], ["ST", "18:00", "Plávanie pre deti — Klub Delfín", "Plaváreň Sihoť"]],
  art: [["PI", "19:00", "Koncert Tlupa — za Mareka", "KC Aktivity"], ["SO", "17:00", "Výstava mladých umelcov", "Galéria mesta"], ["NE", "15:00", "Keramika na kruhu", "Ateliér, centrum"], ["ŠT", "18:30", "Pouličný tanec — Crew TN", "Mierové námestie"]],
  learn: [["UT", "17:00", "Workshop: prvá pomoc", "online"], ["ŠT", "18:00", "Doučovanie matematiky", "Knižnica TN"], ["UT", "19:00", "Základy investovania", "online"], ["ST", "16:00", "Mobilné bankovníctvo pre seniorov", "KC Sihoť"]],
  eko: [["SO", "09:00", "Jarná výsadba stromov", "Park Sihoť"], ["NE", "08:00", "Čistenie brehu Váhu", "Nábrežie"], ["SO", "09:00", "Kompostovanie v paneláku", "KC Aktivity"], ["SO", "08:00", "Komunitná záhrada — sadenie", "Záhrada Juh"]],
  zdravie: [["UT", "17:00", "Stres management (firemné)", "online"], ["ŠT", "16:00", "Darovanie krvi — mobilná", "NTS Trenčín"], ["ST", "16:00", "Prvá pomoc na pracovisku", "online"], ["NE", "15:00", "Benefičná joga za Plamienok", "Mestský park"]],
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
};
