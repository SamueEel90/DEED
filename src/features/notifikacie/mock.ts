import type { Notifikacia, NotifKategoria } from "@/types";

// KARTA 23 · Oznámenia — ukážkový zoznam (kým nie je Supabase). Agregácia je povinná:
// malé dary vždy v jednom súhrne, nikdy 1 oznam za každý dar.
export const NOTIFY: Notifikacia[] = [
  { id: 1, kat: "skutky", den: "Dnes", cas: "teraz", ikona: "ok", ton: "g", titul: "Skutok zverejnený vo feede štvrte", text: "Pitný režim pre susedu · +48 karmy", nove: true },
  { id: 2, kat: "skutky", den: "Dnes", cas: "12 min", ikona: "otaz", ton: "b", titul: "AI sa pýta na tvoj skutok", text: "Pomoc na brigáde v parku · 2 otázky, bez nich ho nezverejníme", nove: true, akcie: ["odpovedat"],
    skutok: { nazov: "Pomoc na brigáde v parku", popis: "<p>Pomohol som na brigáde v parku, hrabali sme lístie a zbierali odpadky.</p>", otazky: ["Koľko vriec alebo akú plochu ste vyčistili?", "Bol si sám, alebo s ďalšími?"] } },
  { id: 3, kat: "skupina", den: "Dnes", cas: "40 min", ikona: "lud", ton: "g", titul: "Tomáš B. ťa pridal do skutku", text: "Vyčistili sme breh potoka · potvrď, že si bol pri tom", nove: true, akcie: ["bol", "nebol"] },
  { id: 4, kat: "penaze", den: "Dnes", cas: "1 h", ikona: "sum", ton: "gold", titul: "Súhrn podpory", text: "38 ľudí ti poslalo odmenu za skutok · spolu 1 240 DEED", agg: true },
  { id: 5, kat: "zbierky", den: "Dnes", cas: "2 h", ikona: "ciel", ton: "gold", titul: "Tvoja hlavná zbierka je naplnená", text: "Zbierka pre Sárku · odmeny teraz idú na ďalšiu v poradí", nove: true },
  { id: 6, kat: "skupina", den: "Včera", cas: "18:40", ikona: "kal", ton: "b", titul: "O hodinu začína tvoj ohlásený skutok", text: "Čistenie brehu Váhu · nezabudni zapnúť GPS", akcie: ["otvorit"] },
  { id: 7, kat: "skutky", den: "Včera", cas: "15:20", ikona: "stit", ton: "g", titul: "Suseda potvrdila tvoj skutok", text: "Pani Anna: Áno, pomohol mi · najsilnejší dôkaz" },
  { id: 8, kat: "zbierky", den: "Včera", cas: "11:05", ikona: "dok", ton: "g", titul: "Charita Nitra doložila tvoj dar", text: "Po požiari bez strechy · pozri, na čo išli peniaze" },
  { id: 9, kat: "penaze", den: "Včera", cas: "9:30", ikona: "ret", ton: "g", titul: "Reťaz dobra odoslaná", text: "12,00 € z odmien išlo na Útulok Túlavá labka" },
  { id: 10, kat: "skutky", den: "27. 9.", cas: "20:14", ikona: "namiet", ton: "gold", titul: "Niekto namieta tvoj skutok", text: "Upratanie parku · komunita posúdi dôkazy, nemusíš nič robiť" },
  { id: 11, kat: "ludia", den: "27. 9.", cas: "17:02", ikona: "lud", ton: "b", titul: "Peter K. chce byť tvoj priateľ", text: "Máte 3 spoločných priateľov", akcie: ["prijat", "neskor"] },
  { id: 12, kat: "deed", den: "26. 9.", cas: "10:00", ikona: "deed", ton: "b", titul: "Nové v DEED: skutok ako dar", text: "Pomôž zbierke skutkom, aj bez peňazí" },
];

/** kategórie a položky nastavení (V appke · Na displej) — presne podľa prototypu */
export const KATEGORIE: (NotifKategoria & { popisy: string[] })[] = [
  { hl: "MOJE SKUTKY", polozky: ["Zverejnenie a hodnotenie", "Otázky od AI", "Overenie a námietka", "Potvrdenie od obdarovaného", "Rozpísaný a ohlásený skutok", "Pravidelný skutok"],
    popisy: ["aj zamietnutie", "aby skutok nezostal visieť", "aj keď je vyriešená", "", "pripomienka, kým nevyprší", "pripomienka v deň skutku"] },
  { hl: "SKUPINA A AKCIE", polozky: ["Pridal ťa do skutku", "Pomocník potvrdil alebo odmietol", "Pripomienka akcie", "Pozvánky na akcie"],
    popisy: ["potvrdiť, že si bol pri tom", "", "deň vopred a 1 h pred", "podľa tvojich záujmov"] },
  { hl: "PENIAZE A PLATBY", polozky: ["Platba prebehla alebo zlyhala", "Pravidelná podpora", "Odmena za skutok", "Súhrn malých darov", "Reťaz dobra", "Firemný benefit"],
    popisy: ["", "3 dni pred stiahnutím, zlyhaná karta, koniec", "nad 100 DEED alebo v eurách", "raz denne", "odoslaná aj prijatá", ""] },
  { hl: "ZBIERKY", polozky: ["Dar na moju zbierku", "Moja zbierka je na rade", "Tvorca pridal moju zbierku", "Zbierka naplnená alebo uzavretá", "Doklad a novinky od zbierky", "Dorovnanie firmy sa minulo", "Nová zbierka v okolí"],
    popisy: ["malé dary v súhrne", "aj s platným QR", "", "", "", "", ""] },
  { hl: "ĽUDIA A PROFIL", polozky: ["Žiadosti o priateľstvo", "Správy", "Nový štít", "Niekto ťa overil cez QR"], popisy: ["", "", "", ""] },
  { hl: "OD DEED", polozky: ["Oznamy a novinky"], popisy: [""] },
];

/** predvolene Na displej vypnuté (v appke áno) */
export const NA_DISPLEJ_VYP = ["Súhrn malých darov", "Nová zbierka v okolí", "Oznamy a novinky"];
