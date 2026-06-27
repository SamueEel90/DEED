import type { Notifikacia, NotifKategoria, VypnuteMapa } from "@/types";

// kategórie: Moje skutky · Peňaženka/Reťaz · Sledované · Sociálne · Od DEED
// col = theme-aware earthy akcent (var --a-*), nie napevno svetlé hexy (tie v svetlom režime zmiznú)
export const NOTIFY: Notifikacia[] = [
  { id: 1, kat: "skutky",    ic: "✓", col: "var(--a-green)",  titul: "Skutok vyhodnotený",            text: "+130 DEED · významný (3 riadky vo feede)", cas: "teraz", nove: true },
  { id: 2, kat: "skutky",    ic: "❤", col: "var(--a-danger)", titul: "Jana N. podporila tvoj skutok", text: "+50 DEED", cas: "8 min", nove: true },
  { id: 3, kat: "penazenka", ic: "♻", col: "var(--a-green)",  titul: "Reťaz dobra odoslaná",          text: "39 DEED → Rodina po povodni", cas: "1 h" },
  { id: 4, kat: "penazenka", ic: "⭐", col: "var(--a-gold)",   titul: "Súhrn podpory",                 text: "1 240 mikro-podpor spojených · +124 DEED", cas: "2 h", agg: true },
  { id: 5, kat: "sledovane", ic: "🏥", col: "var(--a-info)",   titul: "Detská nemocnica — nová kampaň", text: "Sledované · zbierka na inkubátor", cas: "5 h" },
  { id: 6, kat: "sledovane", ic: "🏃", col: "var(--a-clay)",   titul: "Pripomienka: Beh pre zdravie",  text: "Zajtra 09:00 · si prihlásený", cas: "6 h" },
  { id: 7, kat: "socialne",  ic: "👤", col: "var(--a-plum)",   titul: "Peter chce byť tvoj priateľ",   text: "Žiadosť o priateľstvo", cas: "1 d" },
  { id: 8, kat: "deed",      ic: "✦", col: "var(--a-teal)",   titul: "Oznam od DEED",                 text: "Nová funkcia: Reťaz dobra", cas: "2 d" },
  { id: 9,  kat: "skutky",    ic: "✓", col: "var(--a-green)",  titul: "Skutok overený komunitou",       text: "Tvoj skutok potvrdili 3 susedia", cas: "20 min", nove: true },
  { id: 10, kat: "skutky",    ic: "❤", col: "var(--a-danger)", titul: "Lukáš H. podporil tvoj skutok",  text: "+30 DEED", cas: "40 min", nove: true },
  { id: 11, kat: "sledovane", ic: "🌳", col: "var(--a-green)",  titul: "EkoTím Juh pridal nový skutok",   text: "Sledované · čistenie brehu Váhu", cas: "1 h" },
  { id: 12, kat: "sledovane", ic: "☕", col: "var(--a-info)",   titul: "Klub seniorov Sihoť — nová akcia", text: "Spoločenský večer · piatok 18:30", cas: "2 h" },
  { id: 13, kat: "penazenka", ic: "💎", col: "var(--a-gold)",   titul: "Prijatý DEED",                   text: "Eva K. ti poslala 40 DEED", cas: "3 h" },
  { id: 14, kat: "socialne",  ic: "👥", col: "var(--a-plum)",   titul: "Zuzana P. ťa začala sledovať",   text: "Nový sledujúci", cas: "4 h" },
  { id: 15, kat: "skutky",    ic: "⚠", col: "var(--a-clay)",   titul: "Námietka k skutku",              text: "Skutok #120018 čaká na doplnenie dôkazu", cas: "6 h" },
  { id: 16, kat: "sledovane", ic: "🌼", col: "var(--a-info)",   titul: "Liga proti rakovine — Deň narcisov", text: "Sledované · zajtra verejná zbierka", cas: "8 h" },
  { id: 17, kat: "penazenka", ic: "♻", col: "var(--a-green)",  titul: "Reťaz dobra prijatá",            text: "Dostal si 24 DEED z reťaze dobra", cas: "1 d" },
  { id: 18, kat: "deed",      ic: "✦", col: "var(--a-teal)",   titul: "Nová úroveň karmy!",             text: "Dosiahol si Gold · L7", cas: "2 d" },
];

export const KATEGORIE: NotifKategoria[] = [
  { hl: "MOJE SKUTKY",       polozky: ["Vyhodnotenie skutku", "Overenie / námietka", "Niekto ma podporil"] },
  { hl: "PEŇAŽENKA / REŤAZ", polozky: ["Prijatý DEED", "Reťaz dobra odoslaná"] },
  { hl: "SLEDOVANÉ",         polozky: ["Nová kampaň / akcia", "Pripomienky akcií"] },
  { hl: "SOCIÁLNE",          polozky: ["Žiadosti o priateľstvo", "Správy"] },
  { hl: "OD DEED",           polozky: ["Oznamy a novinky"] },
];

export const VYPNUTE_DEF: VypnuteMapa = { "Oznamy a novinky": true }; // default off (§8: Od DEED ticho)
