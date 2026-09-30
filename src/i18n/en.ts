// KARTA 31 · angličtina (termíny len zo slovníka karty 31). Po obrazovkách v i18n/en/*.ts.
import type { Slovnik } from "./typy";
import { spolocne } from "./en/spolocne";
import { profil } from "./en/profil";
import { penazenka } from "./en/penazenka";
import { karma } from "./en/karma";
import { skutky } from "./en/skutky";
import { nastavenia } from "./en/nastavenia";
import { pomoc } from "./en/pomoc";
export const en: Slovnik = { ...spolocne, ...profil, ...penazenka, ...karma, ...skutky, ...nastavenia, ...pomoc };
