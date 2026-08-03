// ============================================================
// DEED · Číselník záujmov v2 (Pozvánky/Záujmy v1.1 §5)
// Dve vetvy: APPKA (téma žije v mechanikách — ponuka/žiadosť/workshop/skutok —
// a automaticky funguje AJ pre oznamy) a POZVÁNKY (len oznamy/pozvánky, „(P)").
// Šport ako divák = zrkadlo hráčskeho stromu (mirror) — organizátorov tag
// „futbalový turnaj" zasiahne hráčov aj divákov.
// Položky = skupiny stromu (2. úroveň) s ukážkou leaf tagov v zátvorke.
// Povýšenie vlastného tagu na oficiálny = nová configVersion číselníka
// v Admin — Ladenie, BEZ release appky (mock: lokálna konštanta).
// VEDOME CHÝBA (§5D): akvaristika/chovateľstvo, zberateľstvo, autá ako hobby,
// poľovníctvo, kemping — len cez vlastný tag; povyšujú sa dopytom, nie dopredu.
// ============================================================

export const CISELNIK_V2_VERZIA = 2;

export interface CiselnikSkupina {
  nazov: string;
  /** "app" = vetva APPKA (mechaniky + oznamy) · "invite" = len oznamy/pozvánky (P) */
  vetva: "app" | "invite";
  polozky: { hodnota: string }[];
}

const p = (...hodnoty: string[]) => hodnoty.map((hodnota) => ({ hodnota }));

export const CISELNIK_V2: CiselnikSkupina[] = [
  // ---- 5A. vetva APPKA (6 oblastí) ----
  { nazov: "🏃 Šport", vetva: "app", polozky: p(
    "Kolektívne (futbal, hokej, basketbal, volejbal…)",
    "Raketové (tenis, bedminton, squash, padel…)",
    "Vytrvalostné (beh, trail, triatlon, cyklistika…)",
    "Vodné (plávanie, kajak, surfing, potápanie…)",
    "Zimné (lyže, snowboard, bežky, korčuľovanie…)",
    "Sila a fitness (posilňovanie, crossfit…)",
    "Bojové (box, MMA, karate, judo, BJJ…)",
    "Outdoor a hory (turistika, lezenie, rybárstvo…)",
    "Precízne a mentálne (joga, golf, jazdectvo, šach…)",
    "Tanec a pohyb (tanec, zumba, gymnastika, parkour…)",
  ) },
  { nazov: "🎵 Hudba", vetva: "app", polozky: p(
    "Hrám / učím sa (klavír, gitara, spev, DJ-ing…)",
  ) },
  { nazov: "🎨 Umenie", vetva: "app", polozky: p(
    "Výtvarné (maľba, kresba, grafika, street art…)",
    "Priestorové a remeslá (keramika, šperk, ručné práce…)",
    "Fotografia a film (portrét, dokument, animácia…)",
    "Scénické (divadlo, balet, stand-up…)",
    "Literatúra (písanie, poézia, knižné kluby…)",
    "Dizajn (grafický, móda, interiér, kaligrafia…)",
  ) },
  { nazov: "📚 Učenie", vetva: "app", polozky: p(
    "Jazyky (AJ, NJ, ŠJ, znaková reč…)",
    "IT a technológie (programovanie, dáta/AI, robotika…)",
    "Financie a právo (investovanie, dane, podnikanie…)",
    "Remeslá a praktické (stolárstvo, varenie, opravy…)",
    "Soft skills (komunikácia, líderstvo…)",
    "Veda (matematika, astronómia, história…)",
    "Doučovanie (školáci, maturita, skúšky…)",
    "Technické hobby (modelárstvo, rádioamatérstvo…)",
    "Hry (doskové hry, videohry, hlavolamy…)",
  ) },
  { nazov: "🧘 Zdravie", vetva: "app", polozky: p(
    "Výživa (zdravé stravovanie, športová výživa…)",
    "Telo (mobilita, regenerácia, spánok…)",
    "Duševné (meditácia, mindfulness, journaling…)",
    "Prevencia (prvá pomoc, darovanie krvi…)",
    "Závislosti (fajčenie, alkohol, podpora…)",
    "Skupiny (seniori, deti, ženské/mužské zdravie…)",
  ) },
  { nazov: "🌿 Eko", vetva: "app", polozky: p(
    "Akcie (výsadba, zber odpadu, čistenie riek…)",
    "Životný štýl (recyklácia, zero waste, lokálne…)",
    "Zvieratá (útulky, včelárstvo, búdky…)",
    "Udržateľnosť (energia, doprava, voda…)",
    "Pestovanie (eko záhrada, permakultúra, bylinky…)",
  ) },

  // ---- 5B. pozvánkový strom (len oznamy) ----
  { nazov: "🎵 Hudba — koncerty a festivaly", vetva: "invite", polozky: p(
    "Rock / metal / punk / indie",
    "Pop / R&B / funk",
    "Rap / trap",
    "Elektronická (techno, house, DnB…)",
    "Tradičná (folklór, dychovka, country, folk…)",
    "Jazz / blues / gospel",
    "Klasická (vážna, opera, organ…)",
    "World (reggae, latino, balkán…)",
    "Festivaly multižánrové",
  ) },
  { nazov: "🎭 Divadlo a scéna", vetva: "invite", polozky: p(
    "Činohra (dráma, komédia)",
    "Muzikál / opereta",
    "Tanec (balet, súčasný, folklórne súbory)",
    "Pre deti (bábkové, rozprávky)",
    "Zábava (stand-up, improvizácia)",
    "Alternatíva (performance, pouličné)",
  ) },
  { nazov: "🖼️ Výstavy a galérie", vetva: "invite", polozky: p(
    "Výtvarné umenie", "Fotografia", "Dizajn", "Múzeá", "Vernisáže",
  ) },
  { nazov: "🎬 Film", vetva: "invite", polozky: p(
    "Kino klub / premietania", "Letné kino", "Filmové festivaly", "Dokumenty s besedou",
  ) },
  { nazov: "📖 Literatúra", vetva: "invite", polozky: p(
    "Besedy s autormi", "Čítačky", "Knižné veľtrhy",
  ) },
  { nazov: "🎓 Prednášky a objavovanie", vetva: "invite", polozky: p(
    "Veda a technika", "História", "Cestovateľské", "Tech meetupy",
    "Príroda s odborníkom (hubárske, vtáčie vychádzky…)",
  ) },
  { nazov: "🏘️ Mesto a komunita", vetva: "invite", polozky: p(
    "Farmárske a remeselné trhy", "Jarmoky a hody", "Food festivaly",
    "Dni mesta / štvrte", "Susedské akcie",
  ) },
  { nazov: "👨‍👩‍👧 Rodina a deti", vetva: "invite", polozky: p(
    "Podujatia pre deti", "Rodinné festivaly", "Tábory a krúžky (zápisy)",
  ) },
  // 5C — zrkadlo športového stromu + divácke navyše (mirror na hráčske položky)
  { nazov: "🏟️ Šport ako divák", vetva: "invite", polozky: p(
    "Zápasy domácich klubov (futbal, hokej, basketbal…)",
    "Turnaje a mítingy (tenis, atletika, plávanie…)",
    "Bojové galavečery (box, MMA)",
    "Motorizmus (rally, motokros — len divácky)",
    "Verejné akcie s účasťou (mestské behy, cyklojazdy…)",
    "Zimné (hokej, lyžiarske preteky, krasokorčuľovanie)",
    "E-šport turnaje",
  ) },
];

// ---- ukážka oznamu pri prvom zakliknutí témy (raz za session, §1) ----
// mock podľa zakliknutej oblasti; fallback = generická akcia
export const UKAZKA_OZNAMU: Record<string, string> = {
  "🏃 Šport": "🏃 Beh — Večerný beh parkom · Trenčín · streda 18:00 — pozýva Bežecký klub TN",
  "🎵 Hudba": "🎸 Koncert — Rocková noc v klube · Trenčín · piatok 20:00 — pozýva Music Club",
  "🎵 Hudba — koncerty a festivaly": "🎸 Koncert — Rocková noc v klube · Trenčín · piatok 20:00 — pozýva Music Club",
  "🎨 Umenie": "🎨 Workshop — Keramika pre začiatočníkov · Trenčín · sobota 10:00 — pozýva Ateliér Hlina",
  "📚 Učenie": "📚 Kurz — Základy programovania · Trenčín · utorok 17:30 — pozýva IT Klub",
  "🧘 Zdravie": "🧘 Joga v parku — ranné cvičenie · Trenčín · nedeľa 8:00 — pozýva Zdravé mesto",
  "🌿 Eko": "🌿 Brigáda — Čistenie brehu Váhu · Trenčín · sobota 9:00 — pozýva EkoTím Juh",
  "🎭 Divadlo a scéna": "🎭 Stand-up — Večer improvizácie · Trenčín · štvrtok 19:00 — pozýva Klub Lúč",
  "🏟️ Šport ako divák": "🏒 Hokej — Dukla vs. Nitra · Trenčín · piatok 18:00 — pozýva HK Dukla",
};
export const UKAZKA_OZNAMU_FALLBACK =
  "📣 Akcia z okolia — presne podľa tvojich tém · vždy z tvojho okolia";

// ---- SEKCIE — prepínače modulov (krok A registrácie, default všetko zapnuté) ----
export interface SekciaModul { id: string; label: string; emoji: string; desc: string }
export const SEKCIE_MODULY: SekciaModul[] = [
  { id: "help", label: "Pomoc", emoji: "🆘", desc: "Dopyty a ponuky pomoci v okolí." },
  { id: "charita", label: "Charita", emoji: "💛", desc: "Zbierky, dobrovoľníctvo, materiálna pomoc." },
  { id: "aktivity", label: "Aktivity", emoji: "🏃", desc: "Skutky a aktivity komunity." },
  { id: "nabozenstvo", label: "Viera", emoji: "⛪", desc: "Farnosti a cirkvi, oznamy a rozvrhy." },
  { id: "vyzvy", label: "Výzvy", emoji: "🏆", desc: "Komunitné výzvy a súťaže." },
];
