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
  fotky: [U("photo-1542856391-010fb87dcfed"), "/img/dom.jpg", U("photo-1500382017468-9049fed747ef")],
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
];

// ---- adresár charít & OZ (vzorka z 50) ----
export const ADRESAR: AdresarSekcia[] = [
  { sekcia: "Zdravie & pacienti", chipy: ["Zdravie"], polozky: [
    ["LR", "Liga proti rakovine", "Onkopacienti · celé SR", "Legend", "💶 🙋"],
    ["PL", "Plamienok", "Detský hospic · SR", "Gold", "💶"],
    ["DA", "Dobrý anjel", "Rodiny s vážnou chorobou · SR", "Gold", "💶"],
    ["SP", "Svetielko pomoci", "Deti s rakovinou · Košice", "Silver", "💶 📦"],
    ["LDZ", "Liga za duševné zdravie", "Psychické zdravie · SR", "Silver", "💶 🙋"],
    ["NOÚ", "Nadácia NOÚ", "Onkológia · Bratislava", "Gold", "💶"],
  ]},
  { sekcia: "Deti & mládež", chipy: ["Deti"], polozky: [
    ["ÚD", "Úsmev ako dar", "Deti v náhradnej starostlivosti · SR", "Gold", "💶 🙋"],
    ["SOS", "SOS detské dedinky", "Opustené deti · SR", "Gold", "💶 🙋"],
    ["DM", "Divé maky", "Talentované rómske deti · SR", "Silver", "💶"],
    ["LDI", "Linka detskej istoty", "Krízová linka pre deti · SR", "Gold", "💶 🙋"],
    ["DF", "Detský fond SR", "Ohrozené deti · SR", "Silver", "💶"],
  ]},
  { sekcia: "Zvieratá", chipy: ["Zvieratá"], polozky: [
    ["SZ", "Sloboda zvierat", "Útulky · SR", "Gold", "💶 🙋 📦"],
    ["TL", "OZ Túlavá labka", "Záchrana psov a mačiek · Trenčín", "Silver", "💶 📦"],
    ["DŠ", "OZ Druhá šanca", "Týrané zvieratá · Bardejov", "Bronze", "💶 📦"],
    ["ZH", "Zvierací ombudsman", "Práva zvierat · SR", "Silver", "💶 🙋"],
  ]},
  { sekcia: "Príroda & ekológia", chipy: ["Príroda"], polozky: [
    ["GP", "Greenpeace Slovensko", "Klíma, lesy · SR", "Silver", "💶 🙋"],
    ["ST", "Stromosvet", "Výsadba stromov · SR", "Bronze", "💶 🙋"],
    ["WWF", "WWF Slovensko", "Ochrana prírody · SR", "Silver", "💶"],
    ["DPH", "DAPHNE", "Ochrana biotopov · SR", "Bronze", "💶 🙋"],
  ]},
  { sekcia: "Sociálne & humanitárna", chipy: ["Sociálne", "Humanitárna"], polozky: [
    ["DP", "Depaul Slovensko", "Ľudia bez domova · Bratislava", "Silver", "💶 📦 🙋"],
    ["VG", "Vagus", "Ľudia bez domova · Bratislava", "Silver", "💶 🙋"],
    ["SKCH", "Slovenská katolícka charita", "Núdza, humanitárna · SR", "Gold", "💶 📦 🙋"],
    ["ČvO", "Človek v ohrození", "Humanitárna a rozvojová · SR", "Gold", "💶"],
    ["SČK", "Slovenský Červený kríž", "Humanitárna, krv · SR", "Gold", "💶 🙋"],
    ["PP", "Proti prúdu (Nota bene)", "Ľudia bez domova · BA", "Silver", "💶 📦"],
    ["UNI", "UNICEF Slovensko", "Deti vo svete · SR", "Gold", "💶"],
  ]},
  { sekcia: "Nevidiaci & hendikep", chipy: ["Sociálne"], polozky: [
    ["ÚN", "Únia nevidiacich a slabozrakých", "Zrakovo postihnutí · SR", "Gold", "💶 🙋"],
    ["MJ", "Maják n.o.", "Hluchoslepí · Bratislava", "Bronze", "💶 🙋"],
    ["OMD", "Org. muskulárnych dystrofikov", "Telesne postihnutí · SR", "Silver", "💶 🙋"],
  ]},
  { sekcia: "Seniori & rodina", chipy: ["Sociálne", "Seniori"], polozky: [
    ["KS", "Klub seniorov Sihoť", "Aktivity pre osamelých seniorov · Trenčín", "Silver", "🙋 📦"],
    ["RD", "OZ Rodinka", "Pomoc rodinám v núdzi · Trenčín", "Bronze", "💶 📦"],
    ["BR", "Brána do života", "Týrané ženy a deti · BA", "Silver", "💶 🙋"],
  ]},
];

// ---- index pre vyhľadávanie (zbierky vo feede + celý adresár) ----
export const HLADAJ_DATA: HladanieZaznam[] = [
  { id: "rodina", titul: "Rodina Kováčová", podtitul: "V noci nám zhorel dom… · Trenčín · Zámostie", kat: "Urgentné", emoji: "🔥", tag: "Urgentné" },
  { id: "plamienok", titul: "Plamienok", podtitul: "Detský hospic — mobilná paliatívna starostlivosť", kat: "Zdravie", emoji: "⭐", tag: "Zbierka" },
  { id: "zofia", titul: "Žofia K.", podtitul: "Po úraze tri mesiace bez príjmu, potrebujem na lieky.", kat: "Zdravie", emoji: "🩺", tag: "Zbierka" },
  { id: "stromosvet", titul: "Stromosvet", podtitul: "Hľadá 10 dobrovoľníkov · výsadba stromov · sobota, Brezina", kat: "Príroda", emoji: "🌳", tag: "Dobrovoľníctvo" },
  { id: "zelena", titul: "Zelená plus", podtitul: "Triedenie a zber šatstva pre útulok · streda, Juh", kat: "Materiál", emoji: "👕", tag: "Materiál" },
  ...ADRESAR.flatMap((s) => s.polozky.map((p) => ({ id: "adr-" + p[1], titul: p[1], podtitul: p[2], kat: s.sekcia, emoji: "🏛", tag: p[3] }))),
];
