// ============================================================
// DEED · ZBIERKY — jeden zoznam, jedna pravda.
// Zbierka žije TU. Feed, adresár aj profily entít z nej len čítajú,
// takže názov, fotka aj suma sú všade rovnaké a klik vedie na to isté.
// Položka na profile nesie ID zbierky, nikdy vlastnú kópiu textu.
// ============================================================

export type ZbierkaStav = "aktivna" | "ukoncena";

export interface Zbierka {
  id: string;
  /** názov zbierky — jediný zdroj pre kartu, feed aj profil */
  nazov: string;
  /** komu peniaze idú (príjemca), nie kto zbiera */
  komu: string;
  popis: string;
  /** úvodná fotka — tá istá v zbierke aj na profile entity */
  foto: string;
  emoji: string;
  ciel: number;
  vyzbierane: number;
  darcovia: number;
  lok: string;
  stav: ZbierkaStav;
}

const U = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=70&auto=format&fit=crop`;

export const ZBIERKY: Zbierka[] = [
  {
    id: "z-kovacova",
    nazov: "Rodina Kováčová — strecha po požiari",
    komu: "Rodina Kováčová",
    popis: "V noci nám zhorel dom, ostali sme bez strechy s dvomi deťmi. Potrebujeme pomoc.",
    foto: U("photo-1518709766631-a6a7f45921c3"),
    emoji: "🔥",
    ciel: 2200, vyzbierane: 1430, darcovia: 86,
    lok: "Trenčín · Zámostie", stav: "aktivna",
  },
  {
    id: "z-motylik",
    nazov: "Motýlik — rehabilitácia pre Sárku",
    komu: "OZ Motýlik",
    popis: "Pravidelná rehabilitácia pre Sárku. Každý mesiac, celý rok.",
    foto: U("photo-1559027615-cd4628902d4a"),
    emoji: "⭐",
    ciel: 4800, vyzbierane: 3120, darcovia: 214,
    lok: "Trenčín", stav: "aktivna",
  },
  {
    id: "z-hospic",
    nazov: "Polohovacie lôžka pre paliatívne oddelenie",
    komu: "Hospic Pod Brezinou",
    popis: "Staré lôžka dosluhujú. Zbierame na šesť polohovacích pre paliatívne oddelenie.",
    foto: U("photo-1586773860418-d37222d8fce3"),
    emoji: "🕊",
    ciel: 6000, vyzbierane: 2380, darcovia: 133,
    lok: "Trenčín · centrum", stav: "aktivna",
  },
  {
    id: "z-labka",
    nazov: "Krmivo a deky pre útulok na zimu",
    komu: "OZ Túlavá labka",
    popis: "Krmivo a deky pre 40 psov a mačiek na zimu. Pomôže aj materiálny dar.",
    foto: U("photo-1450778869180-41d0601e046e"),
    emoji: "🐾",
    ciel: 1200, vyzbierane: 540, darcovia: 61,
    lok: "Trenčín · okraj", stav: "aktivna",
  },
  {
    id: "z-hospic-auto",
    nazov: "Auto pre mobilný hospic",
    komu: "Svetlo pomoci o.z.",
    popis: "Sestry chodia za pacientmi domov. Bez auta to nejde.",
    foto: U("photo-1494976388531-d1058494cdd8"),
    emoji: "🚗",
    ciel: 12000, vyzbierane: 8600, darcovia: 214,
    lok: "Trenčianský kraj", stav: "aktivna",
  },
  {
    id: "z-noclaharen",
    nazov: "Zimná nocľaháreň — vybavenie",
    komu: "OZ Otvorené dvere Trenčín",
    popis: "Postele, deky a práčka do zimnej nocľahárne.",
    foto: U("photo-1528747045269-390fe33c19f2"),
    emoji: "🛏",
    ciel: 4000, vyzbierane: 4000, darcovia: 178,
    lok: "Trenčín · centrum", stav: "ukoncena",
  },
];

/** dolná hranica splitu tvorcu — pod 5 % sa reťaz nastaviť nedá */
export const SPLIT_MIN = 5;

export const najdiZbierku = (id: string): Zbierka | undefined => ZBIERKY.find((z) => z.id === id);

/** Odkaz na zbierku z profilu entity. Text sa neduplikuje — ťahá sa zo ZBIERKY.
 *  `split` = percento, ktoré tvorca posiela zo svojho honoráru do tejto zbierky. */
export interface OdkazNaZbierku {
  zbierkaId: string;
  /** čo o tom hovorí profil entity — napr. „500 € · overená podpora" */
  poznamka?: string;
  /** tvorca: jeho fixné % do tejto zbierky. MINIMUM 5 % — menej sa nastaviť nedá
   *  (zdieľanie sa odmeňuje: QR so zdieľaním od 5 % je zadarmo a bez limitu). */
  split?: number;
}
