// ============================================================
// MODUL CHARITA — mock dáta (port z DEED_Charita_Prototyp_v1.html)
// hlavná zbierka + feed metadáta + adresár charít & OZ + index hľadania
// ============================================================
import { U, AV } from "@/theme";
import type {
  Zbierka,
  CharitaFeedItem,
  AdresarSekcia,
  HladanieZaznam,
} from "@/types";

// ---- hlavná zbierka (detail) ----
export const ZBIERKA: Zbierka = {
  nazov: "Rodina Kováčová", lok: "Trenčín · Zámostie", karma: "Silver",
  pribeh: "V noci nám zhorel dom, ostali sme bez strechy s dvomi deťmi. Potrebujeme provizórne bývanie a základné veci.",
  suma: 1430, ciel: 2200, ludia: 38, avatar: AV(47),
  fotky: ["/img/dom.jpg", U("photo-1516567832553-66232148f74c")],
};

export const ZOFIA_FOTKY: string[] = [U("photo-1471864190281-a93a3070b6de"), U("photo-1584308666744-24d5c474f2ae")];

// ---- feed metadáta pre Feed algoritmus (Časť B) ----
// Karty feedu sú samostatné komponenty (dizajn ostáva nedotknutý). Tu k nim
// pripájame len engine polia (skóre/geo/čas/podpora) + `comp` = ktorý komponent
// vyrenderovať. pripravFeed ich filtruje podľa okruhu a zoradí; `karta()` ich
// premapuje späť na pôvodné komponenty. Distinct `kat` ⇒ frekvenčný strop ich
// neposkladá do jednej skupiny.
export const FEED_ITEMS: CharitaFeedItem[] = [
  { id: "urgent",   comp: "urgent",   typ: "ziadost", modul: "charity", kat: "Pomoc",    skore: 9,   typSituacie: "kriza",  lat: 48.892, lng: 18.020, dni: 0, podpora: 38 },
  { id: "top",      comp: "top",      typ: "charita", modul: "charity", kat: "Zdravie",  skore: 8,   typSituacie: "normal", narodne: true, lat: 48.700, lng: 19.000, dni: 1, podpora: 30 },
  { id: "mala",     comp: "mala",     typ: "charita", modul: "charity", kat: "Zdravie2", skore: 6,   typSituacie: "normal", lat: 48.905, lng: 18.030, dni: 1, podpora: 8 },
  { id: "zapoj",    comp: "zapoj",    typ: "skutok",  modul: "charity", kat: "Priroda",  skore: 5,   typSituacie: "normal", lat: 48.905, lng: 18.030, dni: 0, podpora: 7 },
  { id: "material", comp: "material", typ: "skutok",  modul: "charity", kat: "Komunita", skore: 4,   typSituacie: "normal", lat: 48.875, lng: 18.030, dni: 2, podpora: 5 },

  // dátovo riadené karty (comp: "data") — reálne lokálne charity z okolia Trenčína
  // KARTA 55 · E: zbierka so zverejneným príbehom (Svetlo pomoci) → odkaz „Celý príbeh na stránke Svetlo pomoci ›"
  { id: "strecha-svetlo", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", skore: 7, typSituacie: "normal", lat: 48.889, lng: 18.050, dni: 0, podpora: 148,
    nazov: "Strecha pre rodinu Horváthovú", lok: "Trenčín · Zlatovce", overena: true, tag: "Rodiny",
    popis: "V noci im zhorela strecha nad hlavou. Dve deti, babka a zima pred dverami. Chýba krytina.",
    vyzbierane: 8420, ciel: 12000, fotky: ["/img/dom-strecha.jpg"], pribehZbierky: "z-strecha-horvath", orgNazov: "Svetlo pomoci",
    konciDni: 9, dorovnanie: { ini: "PD", text: "Pekáreň Dobrota pridá 1 : 1" }, zFirmy: 2060 },
  { id: "hospic", comp: "data", typ: "charita", modul: "charity", kat: "Zdravie", skore: 6.5, typSituacie: "normal", lat: 48.895, lng: 18.047, dni: 0, podpora: 34,
    nazov: "Hospic Pod Brezinou", lok: "Trenčín · centrum", overena: true, badgeL: "🕊 PALIATÍVA", tag: "Zdravie",
    popis: "Zbierka na polohovacie lôžka pre paliatívne oddelenie. Dôstojnosť do poslednej chvíle.",
    vyzbierane: 2380, ciel: 6000, fotky: [U("photo-1576091160399-112ba8d25d1d")] },
  { id: "labka", comp: "data", typ: "charita", modul: "charity", kat: "Komunita", skore: 5.5, typSituacie: "normal", lat: 48.870, lng: 18.062, dni: 1, podpora: 28,
    nazov: "OZ Túlavá labka", lok: "Trenčín · okraj", overena: true, badgeL: "🐾 ÚTULOK", tag: "Zvieratá",
    popis: "Krmivo a deky pre 40 psov a mačiek na zimu. Pomôže aj materiálny dar.",
    vyzbierane: 540, ciel: 1200, fotky: [U("photo-1450778869180-41d0601e046e")] },
  { id: "charitatn", comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", skore: 6, typSituacie: "normal", lat: 48.894, lng: 18.046, dni: 0, podpora: 41,
    nazov: "OZ Otvorené dvere Trenčín", lok: "Trenčín · centrum", overena: true, badgeL: "🍲 NÚDZA", tag: "Sociálne",
    popis: "Nízkoprahová jedáleň vydáva denne 120 teplých obedov ľuďom bez domova. Pred zimou chýbajú zásoby.",
    vyzbierane: 940, ciel: 2500, fotky: [U("photo-1628428799437-d886d7d2e9b2")] },
];

// ---- adresár charít & OZ (vzorka z 50) ----
export const ADRESAR: AdresarSekcia[] = [
  { sekcia: "Zdravie & pacienti", chipy: ["Zdravie"], polozky: [
    ["NP", "Nádej pacientom", "Onkopacienti · celé SR", "Legend", "💶 🙋"],
    ["MT", "Motýlik", "Detský hospic · SR", "Gold", "💶"],
    ["TP", "Tichý pomocník", "Rodiny s vážnou chorobou · SR", "Gold", "💶"],
    ["ML", "Malý lúč", "Deti s rakovinou · Košice", "Silver", "💶 📦"],
    ["FDZ", "Fórum duševného zdravia", "Psychické zdravie · SR", "Silver", "💶 🙋"],
    ["NOC", "Nadácia Onkocentrum", "Onkológia · Bratislava", "Gold", "💶"],
  ]},
  { sekcia: "Deti & mládež", chipy: ["Deti"], polozky: [
    ["ND", "Náruč deťom", "Deti v náhradnej starostlivosti · SR", "Gold", "💶 🙋"],
    ["DD", "Detské domovčeky", "Opustené deti · SR", "Gold", "💶 🙋"],
    ["KT", "Kvet talentu", "Talentované rómske deti · SR", "Silver", "💶"],
    ["DKL", "Detská krízová linka", "Krízová linka pre deti · SR", "Gold", "💶 🙋"],
    ["FD", "Fond pre deti SR", "Ohrozené deti · SR", "Silver", "💶"],
  ]},
  { sekcia: "Zvieratá", chipy: ["Zvieratá"], polozky: [
    ["ZA", "Zvieracia archa", "Útulky · SR", "Gold", "💶 🙋 📦"],
    ["TL", "OZ Túlavá labka", "Záchrana psov a mačiek · Trenčín", "Silver", "💶 📦"],
    ["ZP", "OZ Zvierací prístav", "Týrané zvieratá · Bardejov", "Bronze", "💶 📦"],
    ["OPZ", "Ochranca práv zvierat", "Práva zvierat · SR", "Silver", "💶 🙋"],
  ]},
  { sekcia: "Príroda & ekológia", chipy: ["Príroda"], polozky: [
    ["EK", "EkoStráž", "Klíma, lesy · SR", "Silver", "💶 🙋"],
    ["ST", "Stromosvet", "Výsadba stromov · SR", "Bronze", "💶 🙋"],
    ["FDP", "Fond divokej prírody", "Ochrana prírody · SR", "Silver", "💶"],
    ["BIO", "Biotop SK", "Ochrana biotopov · SR", "Bronze", "💶 🙋"],
  ]},
  { sekcia: "Sociálne & humanitárna", chipy: ["Sociálne", "Humanitárna"], polozky: [
    ["PS", "Prístrešie SK", "Ľudia bez domova · Bratislava", "Silver", "💶 📦 🙋"],
    ["UT", "OZ Útočisko", "Ľudia bez domova · Bratislava", "Silver", "💶 🙋"],
    ["KPS", "Katolícka pomoc SR", "Núdza, humanitárna · SR", "Gold", "💶 📦 🙋"],
    ["PBH", "Pomoc bez hraníc", "Humanitárna a rozvojová · SR", "Gold", "💶"],
    ["HSS", "Humanitárna služba SR", "Humanitárna, krv · SR", "Gold", "💶 🙋"],
    ["VK", "OZ Vlastný krok (Krok)", "Ľudia bez domova · BA", "Silver", "💶 📦"],
    ["DSS", "Deti sveta SK", "Deti vo svete · SR", "Gold", "💶"],
  ]},
  { sekcia: "Nevidiaci & hendikep", chipy: ["Sociálne"], polozky: [
    ["SN", "Spolok nevidiacich SR", "Zrakovo postihnutí · SR", "Gold", "💶 🙋"],
    ["SVN", "Svetlonos n.o.", "Hluchoslepí · Bratislava", "Bronze", "💶 🙋"],
    ["SDS", "Spolok dystrofikov SR", "Telesne postihnutí · SR", "Silver", "💶 🙋"],
  ]},
  { sekcia: "Seniori & rodina", chipy: ["Sociálne", "Seniori"], polozky: [
    ["KS", "Klub seniorov Sihoť", "Aktivity pre osamelých seniorov · Trenčín", "Silver", "🙋 📦"],
    ["RD", "OZ Rodinka", "Pomoc rodinám v núdzi · Trenčín", "Bronze", "💶 📦"],
    ["BP", "Bezpečný prah", "Týrané ženy a deti · BA", "Silver", "💶 🙋"],
  ]},
  { sekcia: "Trenčín a okolie", chipy: ["Trenčín", "Sociálne"], polozky: [
    ["HPB", "Hospic Pod Brezinou", "Paliatívna starostlivosť · Trenčín", "Gold", "💶 🙋"],
    ["HSS-TN", "Humanitárna služba — Trenčín", "Prvá pomoc, humanitárna · Trenčín", "Gold", "💶 🙋 📦"],
    ["OD", "OZ Otvorené dvere Trenčín", "Núdza, jedáleň, nocľaháreň · Trenčín", "Gold", "💶 📦 🙋"],
    ["UPV", "Útulok Pri Váhu", "Opustené zvieratá · Trenčín", "Silver", "💶 📦"],
    ["MCL", "Materské centrum Lienka", "Rodiny s deťmi · Trenčín", "Silver", "🙋 📦"],
    ["SN-TN", "Spolok nevidiacich — Trenčín", "Zrakovo postihnutí · Trenčín", "Silver", "💶 🙋"],
    ["NAD", "OZ Nádych", "Onkologickí pacienti · Trenčín", "Bronze", "💶 🙋"],
    ["HPO", "Hospic Podhorie", "Paliatívna starostlivosť · Bánovce n. B.", "Silver", "💶 🙋"],
  ]},
];

// ---- index pre vyhľadávanie (zbierky vo feede + celý adresár) ----
export const HLADAJ_DATA: HladanieZaznam[] = [
  { id: "rodina", titul: "Rodina Kováčová", podtitul: "V noci nám zhorel dom… · Trenčín · Zámostie", kat: "Urgentné", emoji: "🔥", tag: "Urgentné" },
  { id: "motylik", titul: "Motýlik", podtitul: "Detský hospic — mobilná paliatívna starostlivosť", kat: "Zdravie", emoji: "⭐", tag: "Zbierka" },
  { id: "zofia", titul: "Žofia K.", podtitul: "Po úraze tri mesiace bez príjmu, potrebujem na lieky.", kat: "Zdravie", emoji: "🩺", tag: "Zbierka" },
  { id: "stromosvet", titul: "Stromosvet", podtitul: "Hľadá 10 dobrovoľníkov · výsadba stromov · sobota, Brezina", kat: "Príroda", emoji: "🌳", tag: "Dobrovoľníctvo" },
  { id: "zelena", titul: "Zelená plus", podtitul: "Triedenie a zber šatstva pre útulok · streda, Juh", kat: "Materiál", emoji: "👕", tag: "Materiál" },
  ...ADRESAR.flatMap((s) => s.polozky.map((p) => ({ id: "adr-" + p[1], titul: p[1], podtitul: p[2], kat: s.sekcia, emoji: "🏛", tag: p[3] }))),
];
