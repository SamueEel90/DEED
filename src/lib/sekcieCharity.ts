// ============================================================
// Sekcie a odvetvia charity (Martin 23. 10., dokument „Sekcie a odvetvia — Charita, OZ a Spolky“, stav 14. 9. 2026).
// Sekcia = hlavná trieda, podskupiny = oblasti zo stanov. Charita ich vyberá v registrácii (krok Stanovy, povinné,
// overí ich DEED+ raz so stanovami). Z vybraných podskupín sa zakladá sektorová zbierka; slúžia aj na triedenie podľa záujmu.
// Ten istý zoznam je na serveri v cis_segmenty (migrácia 0170) — pri zmene upraviť oba.
// ============================================================

export interface SekciaCharity { nazov: string; podskupiny: string[] }

export const SEKCIE_CHARITY: SekciaCharity[] = [
  { nazov: "Zdravie a pacienti", podskupiny: ["onkologické pacientske organizácie", "hospice a paliatívna starostlivosť", "vzácne a chronické choroby", "duševné zdravie a krízové linky", "darcovstvo krvi, kostnej drene a orgánov", "zdravotnícke prístroje a rehabilitácia", "prevencia a prvá pomoc"] },
  { nazov: "Deti a mládež", podskupiny: ["detské domovy a náhradná rodinná starostlivosť", "opustené a ohrozené deti", "krízové linky pre deti", "štipendiá a doučovanie pre deti zo slabších rodín", "tábory, kluby, skauti"] },
  { nazov: "Zvieratá", podskupiny: ["útulky", "záchrana týraných zvierat", "kastračné programy", "záchranné stanice pre voľne žijúce zvieratá", "ochrana práv zvierat"] },
  { nazov: "Príroda a ekológia", podskupiny: ["výsadba a obnova krajiny", "čistenie riek, lesov a brehov", "ochrana biotopov a druhov", "odpady a klíma", "environmentálna osveta"] },
  { nazov: "Nevidiaci a hendikep", podskupiny: ["nevidiaci a slabozrakí", "nepočujúci", "telesné postihnutie", "mentálne a kombinované postihnutie", "autizmus", "chránené dielne", "bezbariérovosť"] },
  { nazov: "Seniori a rodina", podskupiny: ["osamelí seniori", "opatrovateľská a domáca starostlivosť", "denné stacionáre", "rodiny v núdzi", "jednorodičia", "podpora pestúnov"] },
  { nazov: "Záchrana", podskupiny: ["dobrovoľné hasičské zbory", "horská záchranná služba", "vodná záchrana", "kynologické záchranné brigády", "civilná ochrana"] },
  { nazov: "Ľudia v núdzi", podskupiny: ["ľudia bez domova a nocľahárne", "potravinová pomoc", "chudoba a zadlženosť", "závislosti a resocializácia", "ľudia po výkone trestu", "obete násilia a krízové centrá", "menšiny a integrácia"] },
  { nazov: "Humanitárna pomoc", podskupiny: ["prírodné katastrofy", "vojnové konflikty a utečenci", "rozvojová pomoc v zahraničí"] },
  { nazov: "Naše okolie", podskupiny: ["obnova ihrísk, parkov a lavičiek", "chodníky a zastávky", "komunitné záhrady", "susedské a skrášľovacie iniciatívy"] },
  { nazov: "Nadácie a fondy", podskupiny: ["nadácie", "firemné nadácie", "mestské fondy"] },
  // Martin 23. 10.: „pridaj všetko“ — sekcia z otvorených bodov dokumentu (Liga za ľudské práva, Via Iuris, Transparency)
  { nazov: "Advokácia a právna pomoc", podskupiny: ["ľudské práva", "právna pomoc", "transparentnosť a protikorupcia"] },
];

/** podskupina → sekcia */
export const sekciaPodskupiny = (p: string): string | null => SEKCIE_CHARITY.find((s) => s.podskupiny.includes(p))?.nazov ?? null;
/** názov sektora z podskupiny (veľké písmeno, najviac 30 znakov) */
export const nazovZPodskupiny = (p: string): string => { const t = p.charAt(0).toUpperCase() + p.slice(1); return t.length > 30 ? t.slice(0, 29).trimEnd() + "…" : t; };
