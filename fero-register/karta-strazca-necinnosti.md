# Karta: strážca nečinnosti vypnúť v testovacej verzii (Martin 22. 10.)

1. `src/features/bezpecnost/StrazcaNecinnosti.tsx` (OPRAVY 466): v TESTOVACEJ verzii strážcu úplne vypnúť — kód ostáva, len sa neaktivuje (rovnaký mechanizmus ako ostatné DEV prepínače, `TESTOVACIA`/`VITE_TEST`). V ostrej verzii beží ako doteraz (PC, 15 min, odpočet 60 s). Dôvod: kým nejde o reálne peniaze, odhlasovanie pri testovaní len zavadzia.
2. CHYBA na preverenie: Martina to odhlasuje VŠADE, aj na mobile — podľa dohody má strážca bežať LEN na počítači (`nazovZariadenia().typ === "pocitac"`). Preveriť, prečo mobil padá do vetvy „pocitac" (pravdepodobne detekcia zariadenia), a opraviť.

Odpoveď: hotové · odchýlky · otázky.
