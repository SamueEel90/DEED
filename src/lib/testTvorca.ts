// KARTA 47 · testovacie dáta stránky tvorcu (Martin Konaľ) a stránky streamu na zbierku.
// 1 : 1 podľa prototypov „Tvorca - Martin Konal" a „Stream - QR na zbierku". Prázdny zoznam = sekcia sa neukáže.
// Na serveri: obsah tvorcu zadá tvorca v Správe, stream a súčty počíta server (parameter s v odkaze).
import type { TestSektor } from "./testProfily";

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=70`;

export interface TvorcaStream {
  id: string;
  /** zbierka, pre ktorú vysiela (kľúč do STREAM_ZBIERKY) */
  zbierka: string;
  platforma: string;
  divaci: number;
  nahlad: string;
  suma: number;
  ludia: number;
}
export interface TvorcaData {
  avatar: string;
  mesto: string;
  sledujuci: number;
  cisla: [string, string][];
  /** NAŽIVO — len keď práve vysiela */
  naZivo?: TvorcaStream;
  streamy: { n: string; d: string; dl: string; s: string; foto: string }[];
  iskry: { st: string; n: string; m: string; foto: string; vyzva?: boolean }[];
  rady: { druh: string; n: string; o: string; cta: string; foto: string }[];
  yt: { n: string; dl: string; kde: string; foto: string }[];
  siete: string[];
  platene: { id: string; druh: string; n: string; o: string; cena: number; foto: string }[];
  skolenie?: { n: string; o: string; kedy: string; kde: string; cena: number; miesta: string };
  zbierky: { n: string; v: number; ciel: number; kto: string; foto: string }[];
  akcie: { d: string; m: string; n: string; s: string }[];
  /** podpora tvorcu = náš platobný modul bez dorovnania */
  podpora: TestSektor;
  podporaPocet: number;
  odkazZbierky: string;
}

export const TVORCA_DATA: TvorcaData = {
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=70",
  mesto: "Trenčín",
  sledujuci: 1204,
  cisla: [["1 204", "sledujúcich"], ["38", "Iskier"], ["2 140 €", "poslal na zbierky"]],
  naZivo: { id: "s-magdalena-0310", zbierka: "magdalena", platforma: "YouTube", divaci: 1340, nahlad: U("photo-1511671782779-c97d3d27a1d4"), suma: 312, ludia: 41 },
  streamy: [
    { n: "Husle pre Emku · benefičný stream", d: "21. 9.", dl: "2:05:30", s: "+1 480 €", foto: U("photo-1501386761578-eac5c94b800a") },
    { n: "Zvuk pre nocľaháreň", d: "30. 8.", dl: "1:18:12", s: "+640 €", foto: U("photo-1598488035139-bdbb2231ce04") },
  ],
  iskry: [
    { st: "TALENT", n: "Hotel California na jednej strune", m: "3 120 iskier · 0:44", foto: U("photo-1510915361894-db8b60106cb1") },
    { st: "VEDOMOSTI", n: "Prečo ti piští mikrofón", m: "1 840 iskier · 0:39", foto: U("photo-1598488035139-bdbb2231ce04") },
    { st: "VÝZVA", n: "Husle pre Emku", m: "640 € z 900 €", foto: U("photo-1501386761578-eac5c94b800a"), vyzva: true },
    { st: "TALENT", n: "Koncert na Ostrove", m: "980 iskier · 0:31", foto: U("photo-1501281668745-f7f57925c3b4") },
  ],
  rady: [
    { druh: "ČLÁNOK", n: "Prvá gitara do 150 €", o: "Na čo sa pozrieť v obchode a čo neriešiť.", cta: "Čítať · 4 min", foto: U("photo-1510915361894-db8b60106cb1") },
    { druh: "VIDEO", n: "Ladenie bez ladičky", o: "Za 2 minúty, len podľa ucha.", cta: "Pozrieť · 2:10", foto: U("photo-1511671782779-c97d3d27a1d4") },
    { druh: "ČLÁNOK", n: "Ako nahrať pieseň na mobil", o: "Tri triky, ktoré znejú ako štúdio.", cta: "Čítať · 6 min", foto: U("photo-1598488035139-bdbb2231ce04") },
  ],
  yt: [
    { n: "Celý koncert na Ostrove 2026", dl: "1:12:40", kde: "YouTube", foto: U("photo-1501281668745-f7f57925c3b4") },
    { n: "Ako som postavil domáce štúdio za 600 €", dl: "24:15", kde: "YouTube", foto: U("photo-1598488035139-bdbb2231ce04") },
  ],
  siete: ["YouTube", "Spotify", "Instagram", "Bandcamp"],
  platene: [
    { id: "pl-mix", druh: "KURZ · 6 VIDEÍ", n: "Miešanie zvuku pre začiatočníkov", o: "Od mikrofónu po hotovú nahrávku doma.", cena: 9, foto: U("photo-1598488035139-bdbb2231ce04") },
    { id: "pl-koncert", druh: "ČLÁNOK · 12 MIN", n: "Ako ozvučiť malý koncert za 200 €", o: "Zoznam vecí, zapojenie a chyby, ktoré som robil.", cena: 3, foto: U("photo-1501386761578-eac5c94b800a") },
    { id: "pl-taborak", druh: "NOTY A AKORDY", n: "10 piesní pre táborák", o: "Akordy, rytmus a video ku každej.", cena: 5, foto: U("photo-1510915361894-db8b60106cb1") },
  ],
  skolenie: { n: "Zvuk na akcii: od kábla po mix", o: "Dve hodiny naživo. Ukážem celé zapojenie a odpoviem na otázky.", kedy: "sobota 18. 10. · 10:00 – 12:00", kde: "online · odkaz príde v appke", cena: 15, miesta: "12 z 20 miest" },
  zbierky: [
    { n: "Husle pre Emku", v: 640, ciel: 900, kto: "ZUŠ Trenčín", foto: U("photo-1501386761578-eac5c94b800a") },
    { n: "Zvuková technika pre nocľaháreň", v: 420, ciel: 1200, kto: "Svetlo pomoci o.z.", foto: U("photo-1598488035139-bdbb2231ce04") },
  ],
  akcie: [
    { d: "11.", m: "OKT", n: "Benefičný koncert pre Emku", s: "Klub Lúč, Trenčín · 19:00 · vstupné ide na zbierku" },
    { d: "25.", m: "OKT", n: "Hranie v nemocnici", s: "FN Trenčín, detské oddelenie" },
  ],
  podpora: {
    id: "tvorca-martin-podpora", nazov: "Martin Konaľ · tvorca", druh: "centralna", foto: U("photo-1511671782779-c97d3d27a1d4"),
    vyzbierane: 1860, darcovia: 214, mesta: {} as TestSektor["mesta"],
    kam: "Martin posiela 20 % z podpory na zbierku Husle pre Emku. Neposiela to sám, DEED+ to oddelí automaticky pri každej platbe. Doteraz 412 €, naposledy 1. 10. V zozname darcov zbierky je to riadok Martin Konaľ · z podpory fanúšikov.",
    tipy: [[3, "fanúšik · všetky platené rady odomknuté"], [5, "najčastejšie · + noty ku každej Iskre"], [10, "mecenáš · + miesto na každom školení"]],
    mesacne: 86,
  },
  podporaPocet: 86,
  odkazZbierky: "Husle pre Emku",
};

// ---------------- stránka streamu: deed.sk/z/{zbierka}?s={stream} ----------------
export interface StreamZbierkaData {
  id: string;
  nazov: string;
  /** „pre koho" (Záznam streamu pre Magdalénu) */
  komu: string;
  stitok: string;
  pribeh: string;
  foto: string;
  vyzbierane: number;
  ciel: number;
  ludia: number;
  charita: string;
  charitaSkratka: string;
  /** modul platby (dlaždice, sumy, darcovia) */
  modul: TestSektor;
}
export interface StreamData {
  id: string;
  /** kľúč zbierky (deed.sk/z/{zbierka}) */
  zbierka: string;
  tvorca: string;
  tvorcaKratko: string;
  platforma: string;
  divaci: number;
  datum: string;
  dlzka: string;
  nahlad: string;
  /** počas vysielania */
  suma: number; ludia: number;
  /** po skončení */
  sumaKoniec: number; ludiaKoniec: number;
  /** nové dary počas vysielania (striedajú sa každé 4 s) */
  live: [string, string][];
}

export const STREAM_ZBIERKY: Record<string, StreamZbierkaData> = {
  magdalena: {
    id: "zb-zrak-magdalena", nazov: "Zrak pre Magdalénu", komu: "Magdalénu", stitok: "BRATISLAVA · ZDRAVIE",
    pribeh: "Magdaléna (19) od narodenia nevidí na ľavé oko a pravé jej slabne. Operácia v Prahe jej môže zrak zachrániť, poisťovňa ju neplatí. Chýba 6 200 €. Termín je 12. novembra.",
    foto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=70",
    vyzbierane: 6480, ciel: 12400, ludia: 266, charita: "Nadácia Svetlo pre oči", charitaSkratka: "NS",
    modul: { id: "zb-zrak-magdalena", nazov: "Zrak pre Magdalénu", druh: "sektor", foto: "", vyzbierane: 6480, darcovia: 266, mesta: {} as TestSektor["mesta"] },
  },
};

export const STREAMY: Record<string, StreamData> = {
  "s-magdalena-0310": {
    id: "s-magdalena-0310", zbierka: "magdalena", tvorca: "Martin Konaľ", tvorcaKratko: "Martin", platforma: "YouTube", divaci: 1340, datum: "3. 10.", dlzka: "1:42:10",
    nahlad: U("photo-1511671782779-c97d3d27a1d4"), suma: 312, ludia: 41, sumaKoniec: 1120, ludiaKoniec: 138,
    live: [["+10 €", "Lucia B. · práve teraz"], ["+5 €", "Anonymný darca · pred 1 min"], ["+25 €", "Tomáš K. · pred 2 min"]],
  },
};
