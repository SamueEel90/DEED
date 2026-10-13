# MAPA · čo zo Správy ide kam na verejnú stránku farnosti

Živá stránka: `src/features/verejny-profil/NastenkaFarnosti.tsx` (prototyp Farnost nastenka - zivo.dc.html). Farnosť má zatiaľ len Nástenku (OPRAVY 202). Prázdny blok sa nezobrazí vôbec (ani nadpis), na mobile, tablete aj PC.

## Poradie blokov (OPRAVY 221, Martin 13. 10.) — rovnaké na mobile, tablete aj PC

1. **Titulka** — logo, meno, príhovor jedna veta + „viac ›", pod tým Moja farnosť / Sledovať · Omše a kalendár (PC bez tlačidla Omše a kalendár)
2. **Zbierky farnosti** — hlavná, zvončeková, ďalšie, zbierky rodiny „Iné", pripnuté zbierky (mobil malé riadky)
3. **Oznamy farnosti** — len Krátky oznam a Zmena programu (OPRAVY 215, 216)
4. **Vypočuj si**
5. **Modli sa s nami**
6. **Pomôž**
7. **Príď a zaži s nami**
8. **Teš sa s nami** — tvar podľa druhu (OPRAVY 205)
9. **Spomíname** — medailóny (OPRAVY 205)
10. **Od veriacich**
11. **Deti a mládež** (OPRAVY 211)
12. **Päta: Tento týždeň vo farnosti + Farský úrad** (OPRAVY 220, 221)

| Zo Správy / od veriacich | Úložisko | Blok |
|---|---|---|
| Hlavná zbierka (+ riadok zvončeka v darcoch) | deed-hlavna-zbierka | Zbierky farnosti |
| Zvončeková zbierka · Ďalšie zbierky · zbierka rodiny „Iné" | deed-zvoncekova-zbierka, deed-farnost-zbierky | Zbierky farnosti |
| Pripnutá zbierka iného subjektu | deed-farnost-pripnute | Zbierky farnosti |
| Krátky oznam · zmena programu (farár) | deed-farnost-oznamy (OZNAM, ZMENA OMŠE) | Oznamy farnosti |
| Príhovor farára · NAŽIVO | deed-farnost-iskra, deed-farnost-live | titulka + Vypočuj si |
| Prosba o modlitbu | deed-od-farnikov (modlitba) | Modli sa s nami |
| Brigáda · služba pri omši | brigady | Pomôž |
| Udalosť (farár aj veriaci) · Fotky z akcie | deed-farnost-oznamy (UDALOSŤ), deed-od-farnikov (udalost, fotky) | Príď a zaži s nami |
| Svadba · jubileum · blahoželanie (Iné) · svadobná zbierka rodiny | deed-farnost-oznamy (SVADBA, JUBILEUM, OZNÁMENIE), deed-od-farnikov (svadba, ine), deed-farnost-zbierky (svadba) | Teš sa s nami |
| Parte (farár, veriaci) · pohrebná zbierka rodiny | deed-farnost-oznamy (PARTE), deed-od-farnikov (parte), deed-farnost-zbierky (pohreb) | Spomíname |
| Krátky oznam veriaceho | deed-od-farnikov (oznam) | Od veriacich |
| Stretnutie · tábor (Správa → Ľudia → DETI A MLÁDEŽ) | deti | Deti a mládež |
| Omše · udalosti kalendára (všetko zaškrtnuté v Čo uvidia ľudia) | deed-farnost-omse, kalendar | Tento týždeň vo farnosti |
| Adresa, telefón, e-mail | deed-upravit-profil-farnost | Farský úrad |
| Duchovný (Ľudia → Farár farnosti) | profil_stranky.ulozeny.duchovny | riadok autora pri všetkom zo Správy |
| Úmysel na omšu | deed-umysly-farnar | nikam · len farárovi |
