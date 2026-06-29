// ============================================================
// MODUL TOP — rebríčky (mock dáta)
// Kurátorské poradia konsolidované zo všetkých modulov. Engine/chrome
// (ikona, farba, nadpis) ostáva v Top.tsx; tu sú len `polozky` per kategória,
// kľúčované, aby ich repo (mock | Supabase) vedel vymeniť kategória po kategórii.
// Vo Fáze C sa `darcovia`/`hrdinovia`/`charity` nahradia ŽIVÝM agregátom z DB;
// `aktivity`/`b2b` ostávajú kurátorské do Fázy F (Aktivity) / dát o firmách.
// ============================================================
import type { RebricekPolozka, GoodPolozka } from "@/types";
import { POLOZKY } from "@/features/good/mock";

/** Kľúče kategórií rebríčka (poradie zobrazenia rieši CATS v Top.tsx). */
export type RebricekKluc = "b2b" | "darcovia" | "hrdinovia" | "aktivity" | "charity";

/**
 * MOCK „Top príspevky" — najvýznamnejšie SKUTKY (nie ľudia) z Domov feedu.
 * Zoradené podľa skóre významnosti (tie-break: topované → podpora) — presne
 * to, čo `topSupabase.prispevky()` robí nad DB. Slúži ako fallback, keď nie je
 * Supabase (alebo DB vráti prázdno), aby sekcia v Top nikdy nebola prázdna.
 */
export const topPrispevky = (limit = 12): GoodPolozka[] =>
  [...POLOZKY]
    .filter((p) => p.typ === "skutok")
    .sort(
      (a, b) =>
        (b.skore ?? 0) - (a.skore ?? 0) ||
        Number(!!b.topovane) - Number(!!a.topovane) ||
        (b.podpora ?? 0) - (a.podpora ?? 0),
    )
    .slice(0, limit);

export const REBRICKY_MOCK: Record<RebricekKluc, RebricekPolozka[]> = {
  b2b: [
    { meno: "Kaufland", info: "12 400 € · ESG report", subjekt: { typ: "org", meno: "Kaufland", emoji: "🏢", lok: "Firma · ESG partner", level: "Gold" } },
    { meno: "Lidl", info: "9 800 € · matching", subjekt: { typ: "org", meno: "Lidl pomáha — nadácia", emoji: "🏢", lok: "Firma · matching kampaň", level: "Gold" } },
    { meno: "Tesco", info: "7 200 € · grantový program", subjekt: { typ: "org", meno: "Tesco", emoji: "🏢", lok: "Firma · grantový program", level: "Gold" } },
    { meno: "O2 Slovensko", info: "5 400 € · zamestnanecká zbierka", subjekt: { typ: "org", meno: "O2 Slovensko", emoji: "🏢", lok: "Firma · zamestnanecké 2 %", level: "Silver" } },
    { meno: "Leoni Slovakia", info: "4 600 € · firemné dobrovoľníctvo", subjekt: { typ: "org", meno: "Leoni Slovakia", emoji: "🏭", lok: "Zamestnávateľ · Trenčín", level: "Silver" } },
    { meno: "Vetropack Nemšová", info: "materiál a sklo pre projekty", subjekt: { typ: "org", meno: "Vetropack Nemšová", emoji: "🏭", lok: "Sklárne · Nemšová", level: "Silver" } },
    { meno: "Pekáreň U Janka", info: "denne pečivo do útulku", subjekt: { typ: "org", meno: "Pekáreň U Janka", emoji: "🥨", lok: "Lokálny partner · Trenčín", level: "Silver" } },
    { meno: "Slovnaft", info: "3 100 € · doprava pomoci", subjekt: { typ: "org", meno: "Slovnaft", emoji: "🏢", lok: "Firma · logistika pomoci", level: "Bronze" } },
  ],
  darcovia: [
    { meno: "Lukáš H.", info: "1 850 DEED tento mesiac", subjekt: { typ: "osoba", meno: "Lukáš H.", level: "Gold" } },
    { meno: "Eva K.", info: "1 420 DEED", subjekt: { typ: "osoba", meno: "Eva K.", level: "Gold" } },
    { meno: "Martin K.", info: "1 050 DEED · darca krvi", subjekt: { typ: "osoba", meno: "Martin K.", level: "Gold" } },
    { meno: "Zuzana P.", info: "880 DEED", subjekt: { typ: "osoba", meno: "Zuzana P.", level: "Silver" } },
    { meno: "Tomáš R.", info: "640 DEED", subjekt: { typ: "osoba", meno: "Tomáš R.", level: "Gold" } },
    { meno: "Anonym", info: "510 DEED · potichu", subjekt: { typ: "osoba", meno: "Anonym", level: "Silver" } },
  ],
  // geo (lat/lng) = reprezentatívna poloha pre filter podľa okruhu (Štvrť ~5 km / Mesto ~15 km).
  // Bez geo (MUDr. Hraško) = celoslovenský → vždy v rebríčku. Anker = USER_LOK (48.894, 18.044).
  hrdinovia: [
    { meno: "Jana N.", info: "23 overených skutkov", subjekt: { typ: "osoba", meno: "Jana N.", level: "Gold", stav: "tvorca" }, lat: 48.905, lng: 18.030 },
    { meno: "Ján H.", info: "18 overených skutkov", subjekt: { typ: "osoba", meno: "Ján H.", level: "Silver" }, lat: 48.850, lng: 18.100 },
    { meno: "Mária H.", info: "16 overených skutkov", subjekt: { typ: "osoba", meno: "Mária H.", level: "Gold", stav: "tvorca" }, lat: 48.900, lng: 18.040 },
    { meno: "Dobrovoľní hasiči TN", info: "12 zásahov pre komunitu", subjekt: { typ: "org", meno: "Dobrovoľní hasiči TN", emoji: "🚒", lok: "Komunita · Trenčín", level: "Gold", stav: "tvorca" }, lat: 48.894, lng: 18.044 },
    { meno: "MUDr. Hraško", info: "9 bezplatných poradní", subjekt: { typ: "osoba", meno: "MUDr. Hraško", level: "Gold", stav: "tvorca" } },
    { meno: "Klub seniorov Sihoť", info: "10 akcií pre seniorov", subjekt: { typ: "org", meno: "Klub seniorov Sihoť", emoji: "☕", lok: "Komunita · Sihoť", level: "Silver", stav: "tvorca" }, lat: 48.906, lng: 18.028 },
  ],
  aktivity: [
    { meno: "Cyklo TN", info: "240 km pre dobro", subjekt: { typ: "osoba", meno: "Cyklo TN", level: "Silver", stav: "tvorca" } },
    { meno: "EkoTím Juh", info: "14 vriec odpadu", subjekt: { typ: "osoba", meno: "EkoTím Juh", level: "Silver", stav: "tvorca" } },
    { meno: "Tlupa", info: "koncert za Mareka", subjekt: { typ: "osoba", meno: "Tlupa", level: "Silver", stav: "tvorca" } },
    { meno: "Crew TN", info: "pouličný tanec pre detský oddiel", subjekt: { typ: "osoba", meno: "Crew TN", level: "Silver", stav: "tvorca" } },
    { meno: "Zelený Trenčín", info: "30 vysadených stromov", subjekt: { typ: "osoba", meno: "Zelený Trenčín", level: "Silver", stav: "tvorca" } },
    { meno: "Klub Delfín", info: "plávanie pre deti", subjekt: { typ: "osoba", meno: "Klub Delfín", level: "Silver", stav: "tvorca" } },
  ],
  charity: [
    { meno: "Liga proti rakovine", info: "Gold · celá SR", subjekt: { typ: "org", meno: "Liga proti rakovine", emoji: "🎗", lok: "Overená charita · celá SR", level: "Gold" } },
    { meno: "Plamienok", info: "Gold · BA", subjekt: { typ: "org", meno: "Plamienok", emoji: "🕊", lok: "Overená charita · Bratislava", level: "Gold" } },
    { meno: "Dobrý anjel", info: "Gold · celá SR", subjekt: { typ: "org", meno: "Dobrý anjel", emoji: "😇", lok: "Rodiny s vážnou chorobou · SR", level: "Gold" } },
    { meno: "Úsmev ako dar", info: "Gold · celá SR", subjekt: { typ: "org", meno: "Úsmev ako dar", emoji: "🧒", lok: "Deti v náhradnej starostlivosti · SR", level: "Gold" } },
    { meno: "Sloboda zvierat", info: "Gold · útulky SR", subjekt: { typ: "org", meno: "Sloboda zvierat", emoji: "🐾", lok: "Útulky · celá SR", level: "Gold" } },
    { meno: "Depaul Slovensko", info: "Silver · Bratislava", subjekt: { typ: "org", meno: "Depaul Slovensko", emoji: "🏠", lok: "Ľudia bez domova · BA", level: "Silver" } },
  ],
};
