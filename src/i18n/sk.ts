// KARTA 31 · slovenčina = zdroj textov (bez zmeny znenia). Po obrazovkách v i18n/sk/*.ts.
import type { Slovnik } from "./typy";
import { spolocne } from "./sk/spolocne";
import { profil } from "./sk/profil";
import { penazenka } from "./sk/penazenka";
import { karma } from "./sk/karma";
import { skutky } from "./sk/skutky";
import { nastavenia } from "./sk/nastavenia";
import { pomoc } from "./sk/pomoc";
export const sk: Slovnik = { ...spolocne, ...profil, ...penazenka, ...karma, ...skutky, ...nastavenia, ...pomoc };
