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
];

export const KATEGORIE: NotifKategoria[] = [
  { hl: "MOJE SKUTKY",       polozky: ["Vyhodnotenie skutku", "Overenie / námietka", "Niekto ma podporil"] },
  { hl: "PEŇAŽENKA / REŤAZ", polozky: ["Prijatý DEED", "Reťaz dobra odoslaná"] },
  { hl: "SLEDOVANÉ",         polozky: ["Nová kampaň / akcia", "Pripomienky akcií"] },
  { hl: "SOCIÁLNE",          polozky: ["Žiadosti o priateľstvo", "Správy"] },
  { hl: "OD DEED",           polozky: ["Oznamy a novinky"] },
];

export const VYPNUTE_DEF: VypnuteMapa = { "Oznamy a novinky": true }; // default off (§8: Od DEED ticho)
