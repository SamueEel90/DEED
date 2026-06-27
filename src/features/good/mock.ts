// ============================================================
// MODUL DOMOV (DEED Good) — MOCK dáta
// Čisté dátové polia presunuté z Good.jsx (žiadne JSX → .ts).
// KAT = farby kategórií, POLOZKY = feed skutkov, EVENTS = nástenka.
// ============================================================
import { U } from "@/theme";
import { tint } from "@/lib/ui";
import type { GoodPolozka, KategoriaKonfig, Kategoria, Udalost, UdalostZdroj } from "@/types";

// ---- kategórie — earthy hue + theme-aware tinty (bg/bg2/bd z hue, fungujú v oboch režimoch) ----
const kk = (c: string, label?: string): KategoriaKonfig => ({ c, bg: tint(c, .12), bg2: tint(c, .2), bd: tint(c, .34), label });
export const KAT: Record<Kategoria, KategoriaKonfig> = {
  Komunita: kk("var(--a-info)"),
  Priroda: kk("var(--a-green)", "Príroda"),
  Zdravie: kk("var(--a-teal)"),
  Ucenie: kk("var(--a-plum)", "Učenie"),
  Pomoc: kk("var(--a-danger)"),
  // Zdravie2 doplnené v module Charita; v Good sa nepoužíva.
  Zdravie2: kk("var(--a-teal)"),
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

  { id: 13, typ: "skutok", velkost: "med", kat: "Komunita", media: "foto", overene: true,
    skore: 5.5, typSituacie: "normal", modul: "good", lat: 48.905, lng: 18.030, dni: 0, podpora: 16,
    autor: "Klub seniorov Sihoť", pfp: "#3A8DD6", ini: "K", karma: "Silver", lok: "Trenčín · Sihoť", cas: "3 h", num: 120048,
    titul: "Zorganizovali sme popoludnie pre osamelých seniorov — prišlo 40 ľudí.",
    popis: "Káva, harmonika a spoločnosť. Mnohí z nich nemajú s kým prehodiť slovo aj týždne. Najbližšie sa stretneme o dva týždne, pridať sa môže ktokoľvek.",
    emoji: "☕", suma: 38, lajky: 33,
    fotky: [U("photo-1542838132-92c53300491e"), U("photo-1556909114-f6e7ad7d3136")] },

  { id: 14, typ: "skutok", velkost: "small", kat: "Priroda", media: "foto",
    skore: 4.0, typSituacie: "normal", modul: "good", lat: 48.902, lng: 18.038, dni: 1, podpora: 9,
    autor: "Skauti Trenčín", pfp: "#2E7D52", ini: "S", karma: "Silver", lok: "Trenčín · Pod Sokolicami", cas: "1 d", num: 120036,
    titul: "Postavili sme hmyzí hotel a vtáčie búdky v parku.", popis: "Oddiel 12 detí. Učíme sa, že o prírodu sa treba starať, nielen ju obdivovať.",
    emoji: "🐝", suma: 28, lajky: 24,
    fotky: [U("photo-1470071459604-3b5ec3a7fe05")] },

  { id: 15, typ: "skutok", velkost: "small", kat: "Zdravie", media: "kreslene",
    skore: 3.0, typSituacie: "normal", modul: "good", lat: 48.882, lng: 18.060, dni: 1, podpora: 7,
    autor: "Zuzana P.", pfp: "#3DD6CE", ini: "Z", karma: "Silver", lok: "Trenčín · Noviny", cas: "1 d", num: 120033,
    titul: "Sprevádzam nevidiacu susedu na nákupy a k lekárovi.", popis: "Dvakrát do týždňa. Bez sprievodu sa von prakticky nedostane.",
    emoji: "🦯", suma: 22, lajky: 19 },

  { id: 16, typ: "skutok", velkost: "med", kat: "Ucenie", media: "foto",
    skore: 3.5, typSituacie: "normal", modul: "good", lat: 48.875, lng: 18.030, dni: 2, podpora: 11,
    autor: "Veronika S.", pfp: "#A98BF0", ini: "V", karma: "Bronze", lok: "Trenčín · Juh", cas: "2 d", num: 120024,
    titul: "Vediem bezplatný krúžok robotiky pre deti z Juhu.", popis: "Každý utorok. Stavebnice a notebooky nám zapožičala miestna firma. Deti zbožňujú, keď ich robot prvýkrát poslúchne.",
    emoji: "🤖", suma: 34, lajky: 27,
    fotky: [U("photo-1509228468518-180dd4864904")] },

  { id: 17, typ: "skutok", velkost: "med", kat: "Komunita", media: "foto", overene: true,
    skore: 4.5, typSituacie: "normal", modul: "good", lat: 48.894, lng: 18.044, dni: 0, podpora: 13,
    autor: "Materské centrum Lienka", pfp: "#5BA8F0", ini: "M", karma: "Silver", lok: "Trenčín · centrum", cas: "6 h", num: 120040,
    titul: "Burza detského oblečenia — všetko zadarmo pre rodiny v núdzi.", popis: "Mamičky doniesli, čo deti prerástli. Za sobotu si odnieslo veci 60 rodín. Čo zostalo, ide do útulku.",
    emoji: "🧸", suma: 30, lajky: 41,
    fotky: [U("photo-1556909114-f6e7ad7d3136")] },

  { id: 18, typ: "ziadost", velkost: "small", kat: "Pomoc", zdroj: "Help",
    skore: 5, typSituacie: "normal", modul: "help", lat: 48.892, lng: 18.020, dni: 1, podpora: 8,
    autor: "Karol M.", pfp: "#7A3030", ini: "K", lok: "Trenčín · Zámostie", cas: "1 d", num: 120030,
    titul: "Po strate práce nemáme na školské pomôcky pre deti", popis: "Dve deti idú do školy, na zošity, tašky a topánky nám už nezvýšilo. Pomôže akýkoľvek príspevok.",
    ciel: 600, vyzbierane: 210, emoji: "🎒", pomocnici: 8 },

  { id: 19, typ: "skutok", velkost: "small", kat: "Priroda", media: "kreslene",
    skore: 2.5, typSituacie: "normal", modul: "good", lat: 48.910, lng: 18.078, dni: 3, podpora: 5,
    autor: "Daniel K.", pfp: "#2E7D52", ini: "D", karma: "Bronze", lok: "Trenčín → Nemšová", cas: "3 d", num: 119990,
    titul: "Cestou z práce zbieram odpad na cyklotrase — dnes 8 vriec.", popis: "Spravil som si z toho zvyk. Keď ide každý okolo a nič, nezmení sa nič.",
    emoji: "🚮", suma: 18, lajky: 14 },

  { id: 20, typ: "skutok", velkost: "small", kat: "Zdravie", media: "foto", overene: true,
    skore: 4.0, typSituacie: "normal", modul: "good", lat: 48.894, lng: 18.044, dni: 2, podpora: 10,
    autor: "MUDr. Hraško", pfp: "#3DD6CE", ini: "H", karma: "Gold", lok: "Trenčín · centrum", cas: "2 d", num: 120022,
    titul: "Bezplatná poradňa o prevencii cukrovky pre seniorov.", popis: "Odmeral som tlak a cukor 50 ľuďom, viacerých som poslal k lekárovi včas. Prevencia zachráni viac než liečba.",
    emoji: "🩺", suma: 26, lajky: 22,
    fotky: [U("photo-1576091160399-112ba8d25d1d")] },

  { id: 21, typ: "skutok", velkost: "small", kat: "Komunita", media: "foto",
    skore: 3.0, typSituacie: "normal", modul: "good", lat: 48.888, lng: 18.052, dni: 4, podpora: 6,
    autor: "Ondrej V.", pfp: "#5BA8F0", ini: "O", karma: "Bronze", lok: "Trenčín · Dlhé Hony", cas: "4 d", num: 119975,
    titul: "Opravil som rozbité lavičky a hojdačku na ihrisku.", popis: "Nikto to neriešil mesiace. Materiál ma stál pár eur, deti majú zase kde sa hrať.",
    emoji: "🔧", suma: 20, lajky: 16,
    fotky: [U("photo-1448375240586-882707db888b")] },

  { id: 22, typ: "skutok", velkost: "small", kat: "Ucenie", media: "kreslene",
    skore: 3.5, typSituacie: "normal", modul: "good", lat: 48.882, lng: 18.060, dni: 3, podpora: 8,
    autor: "Čitateľský klub Noviny", pfp: "#A98BF0", ini: "Č", karma: "Silver", lok: "Trenčín · Noviny", cas: "3 d", num: 119985,
    titul: "Predčítame deťom na detskom oddelení nemocnice.", popis: "Každú nedeľu. Pre dieťa v nemocnici je príbeh únik aj liek zároveň.",
    emoji: "📖", suma: 24, lajky: 29 },

  { id: 23, typ: "ziadost", velkost: "req", kat: "Pomoc", zdroj: "Help", topovane: true,
    skore: 6, typSituacie: "normal", modul: "help", lat: 48.905, lng: 18.030, dni: 0, podpora: 9,
    autor: "Pani Oľga (78)", pfp: "#7A3030", ini: "O", lok: "Trenčín · Sihoť", cas: "4 h", num: 120042,
    titul: "Po smrti manžela sama — neviem zaplatiť kúrenie na zimu",
    popis: "Z dôchodku mi po liekoch nezostáva na drevo a uhlie. Bojím sa zimy. Privítam pomoc či dobrú radu, kam sa obrátiť.",
    ciel: 500, vyzbierane: 180, emoji: "🔥", pomocnici: 9,
    fotky: [U("photo-1500382017468-9049fed747ef")] },

  { id: 24, typ: "skutok", velkost: "small", kat: "Priroda", media: "foto",
    skore: 4.0, typSituacie: "normal", modul: "good", lat: 48.875, lng: 18.030, dni: 5, podpora: 7,
    autor: "Včelári Trenčín", pfp: "#2E7D52", ini: "V", karma: "Silver", lok: "Trenčín · Juh", cas: "5 d", num: 119968,
    titul: "Osadili sme úle na komunitnej záhrade — med pôjde seniorom.", popis: "Opeľovače pomôžu celej štvrti a med z prvého vytočenia rozdáme klubu dôchodcov.",
    emoji: "🍯", suma: 30, lajky: 21,
    fotky: [U("photo-1441974231531-c6227db76b6e")] },

  { id: 25, typ: "skutok", velkost: "small", kat: "Zdravie", media: "kreslene",
    skore: 3.5, typSituacie: "normal", modul: "good", lat: 48.892, lng: 18.020, dni: 6, podpora: 12,
    autor: "Lukáš H.", pfp: "#3DD6CE", ini: "L", karma: "Gold", lok: "Trenčín · Zámostie", cas: "6 d", num: 119960,
    titul: "Daroval som plazmu už 20-krát tento rok.", popis: "Trvá to hodinu a niekomu to zachráni život. Lepšie investovaný čas si neviem predstaviť.",
    emoji: "🩸", suma: 40, lajky: 35 },

  { id: 26, typ: "skutok", velkost: "med", kat: "Komunita", media: "foto", overene: true,
    skore: 6, typSituacie: "normal", modul: "good", lat: 48.894, lng: 18.044, dni: 0, podpora: 17,
    autor: "Jana N.", pfp: "#3A8DD6", ini: "J", karma: "Gold", lok: "Trenčín · centrum", cas: "1 h", num: 120050,
    titul: "Uvarili sme teplé obedy pre ľudí bez domova — 120 porcií.", popis: "S partiou dobrovoľníkov každý piatok. Teplé jedlo a chvíľa, keď sa na nich niekto pozrie ako na človeka.",
    emoji: "🍲", suma: 52, lajky: 64,
    fotky: [U("photo-1542838132-92c53300491e"), U("photo-1556909114-f6e7ad7d3136")] },

  { id: 27, typ: "charita", velkost: "med", kat: "Zdravie", zdroj: "Charity", overene: true, charLevel: "Gold",
    skore: 7, typSituacie: "normal", modul: "charity", narodne: true, lat: 48.146, lng: 17.107, dni: 1, podpora: 60,
    autor: "Liga proti rakovine", pfp: "#C264D8", ini: "L", lok: "celá SR", cas: "1 d", num: 120012,
    titul: "Deň narcisov — verejná zbierka na pomoc onkologickým pacientom", popis: "Overená zbierka. Výnos ide na psychologickú a sociálnu pomoc rodinám pacientov. Pripni si narcis.",
    ciel: 50000, vyzbierane: 31800, emoji: "🌼", suma: 0, lajky: 312 },

  { id: 28, typ: "skutok", velkost: "small", kat: "Ucenie", media: "foto",
    skore: 3.0, typSituacie: "normal", modul: "good", lat: 48.888, lng: 18.052, dni: 7, podpora: 6,
    autor: "Eva K.", pfp: "#A98BF0", ini: "E", karma: "Gold", lok: "Trenčín · Dlhé Hony", cas: "7 d", num: 119955,
    titul: "Mentorujem stredoškolákov pri výbere povolania.", popis: "Pomáham im spísať životopis a pripraviť sa na pohovor. Prvá práca vie naštartovať celý život.",
    emoji: "🎯", suma: 22, lajky: 18,
    fotky: [U("photo-1509228468518-180dd4864904")] },
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
  { id: "e9", when: "ŠTV 17:00", title: "Burza detského oblečenia — zadarmo", who: "MC Lienka", src: "Komunita", kat: "Komunita",
    desc: "Prines, čo deti prerástli, a vyber si, čo potrebuješ. Všetko zadarmo. Rodiny v núdzi prednostne.", place: "Materské centrum, centrum", cap: "otvorené" },
  { id: "e10", top: true, when: "SO 14:00", title: "Deň narcisov — verejná zbierka", who: "Liga proti rakovine", src: "Partner", kat: "Zdravie",
    desc: "Pripni si narcis a podpor onkologických pacientov. Dobrovoľníci v uliciach celého mesta.", place: "Mierové námestie a okolie", cap: "celé mesto" },
  { id: "e11", when: "NE 10:00", title: "Predčítanie deťom v nemocnici", who: "Čitateľský klub", src: "Komunita", kat: "Ucenie",
    desc: "Hľadáme dobrovoľníkov, ktorí prídu predčítať deťom na detskom oddelení. Stačí dobrý hlas a trpezlivosť.", place: "Nemocnica, detské oddelenie", cap: "8 dobrovoľníkov" },
  { id: "e12", when: "UT 16:00", title: "Krúžok robotiky pre deti", who: "Veronika S.", src: "Komunita", kat: "Ucenie",
    desc: "Bezplatný krúžok pre deti z Juhu. Stavebnice zabezpečené. Vhodné pre 8–13 rokov.", place: "KC Juh", cap: "12 detí" },
  { id: "e13", when: "ST 18:00", title: "Darovanie krvi — mobilný odber", who: "NTS Trenčín", src: "Mesto", kat: "Zdravie",
    desc: "Mobilná transfúzna stanica. Kritický nedostatok 0−. Prvodarcovia vítaní, stačí občiansky.", place: "Mestský úrad", cap: "bez objednania" },
  { id: "e14", when: "SO 08:00", title: "Komunitná záhrada — sadíme spolu", who: "EkoTím Juh", src: "Komunita", kat: "Priroda",
    desc: "Spoločná výsadba zeleniny a byliniek. Úroda sa rozdelí medzi seniorov zo štvrte. Náradie máme.", place: "Komunitná záhrada, Juh", cap: "30 ľudí" },
  { id: "e15", when: "PIA 18:30", title: "Spoločenský večer klubu seniorov", who: "Klub seniorov Sihoť", src: "Komunita", kat: "Komunita",
    desc: "Káva, harmonika a spoločnosť pre osamelých seniorov. Odvoz pre menej pohyblivých zabezpečíme.", place: "KC Sihoť", cap: "50 miest" },
  { id: "e16", top: true, when: "NE 16:00", title: "Benefičný koncert za rodinu Kováčovú", who: "Tlupa", src: "Partner", kat: "Komunita",
    desc: "Lokálne kapely hrajú pre rodinu, ktorej zhorel dom. Celý výťažok ide priamo im.", place: "KC Aktivity", cap: "200 miest" },
];
