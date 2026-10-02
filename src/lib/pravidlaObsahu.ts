// ============================================================
// Dôvera a súhlasy charity — JEDEN zdroj textov pre skutok za charitu (OPRAVY 121)
// aj pre novú zbierku (karta 37 · bod 8). Nekopírovať, meniť len tu.
// Zdroj: kod/pravidla-obsahu-charity.md + prototypy Pridat skutok / Nova zbierka PC.
// ============================================================

/** karta „Veríme vám" — ukáže sa raz, pred prvým skutkom alebo prvou zbierkou (úložisko profilStranky · uvod) */
export const VERIME_VAM = {
  nadpis: "Veríme vám",
  odseky: [
    "Vaše skutky ani zbierky nekontroluje umelá inteligencia. Ako organizácia za svoj obsah zodpovedáte sami a my veríme, že píšete pravdu.",
    "Preto sú u nás tresty za klamstvo a podvod prísne a bez výnimiek. Nepravdivý obsah stiahneme, zbierky pozastavíme a pri podvode organizácia stratí overenie aj účet.",
  ],
} as const;

/** Pravidlá obsahu (Fotky a videá + Dôstojnosť) — 6 bodov */
export const PRAVIDLA_NADPIS = "Fotky a videá";
export const PRAVIDLA_UVOD = "Zverejnením fotky alebo videa potvrdzujete, že na to máte právo.";
export const PRAVIDLA_ORG: [string, string][] = [
  ["Súhlas zobrazených ľudí.", "Každá rozpoznateľná osoba na zábere súhlasila so zverejnením. Súhlas si uchovávate vy, pri spore ho máte vedieť predložiť."],
  ["Deti len so súhlasom rodiča alebo zákonného zástupcu.", "Bez neho dieťa nefotíte, alebo mu zakryjete tvár."],
  ["Vlastné zábery.", "Fotky a videá sú vaše alebo máte právo ich použiť. Žiadne obrázky z internetu, žiadne cudzie zábery vydávané za vlastnú činnosť."],
  ["Súkromie prijímateľa.", "Nezverejňujte adresu, EČV, čísla dokladov ani iné údaje, podľa ktorých sa dá nájsť byt alebo dom človeka v núdzi. Polohové údaje z fotiek čistíme automaticky, ale text a záber strážite vy."],
  ["Držte mieru.", "Fotka má ukazovať pomoc a výsledok, nie nešťastie v najhoršej chvíli."],
  ["Dôstojnosť.", "Človek, ktorému pomáhate, nie je rekvizita. Ak si želá anonymitu, dostane ju. Zdravotný stav a podrobnosti o rodine len v rozsahu, s ktorým výslovne súhlasil."],
];

/** zaškrtnutie súhlasu pri fotkách a videách + veta pod ním */
export const SUHLAS_FOTKY = "Na fotkách a videách mám súhlas zobrazených osôb, pri deťoch súhlas zákonného zástupcu. Zábery sú moje alebo mám právo ich použiť.";
export const SUHLAS_POZNAMKA = "Súhlas si uchovávate vy, pri spore ho máte vedieť predložiť. Nezverejňujte adresu, EČV ani doklady. Polohu z fotiek čistíme automaticky.";
export const SUHLAS_CHYBA = "Potvrďte súhlas ľudí na fotkách a videách";

/** skutok za charitu · krok Náhľad */
export const PRED_ZVEREJNENIM = ["Píšete to tak, ako sa to naozaj stalo.", "Ľudia na fotkách o tom vedia a súhlasia, deti len so súhlasom rodiča.", "Žiadna politika, žiadna reklama. Toto je miesto pre skutky.", "Príbeh nech rozpráva pomoc, nie nešťastie."];
/** nová zbierka · krok 6 Kontrola */
export const PRED_SPUSTENIM_NADPIS = "Pred spustením si overte";
export const PRED_SPUSTENIM = ["Píšete to tak, ako to naozaj je.", "Ľudia na fotkách o tom vedia a súhlasia, deti len so súhlasom rodiča.", "Žiadna politika, žiadna reklama. Toto je miesto pre pomoc.", "Príbeh nech rozpráva pomoc, nie nešťastie."];
export const PRAVDIVA_ZBIERKA = "Obsah je pravdivý. Skontroloval som údaje so zámkom a viem, že po spustení sa nedajú zmeniť.";
