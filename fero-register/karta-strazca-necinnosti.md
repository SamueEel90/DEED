# Karta: strážca nečinnosti vypnúť v testovacej verzii (Martin 22. 10.)

`src/features/bezpecnost/StrazcaNecinnosti.tsx` (OPRAVY 466): v TESTOVACEJ verzii strážcu úplne vypnúť — kód ostáva, len sa neaktivuje (rovnaký mechanizmus ako ostatné DEV prepínače, `TESTOVACIA`/`VITE_TEST`). V ostrej verzii beží ako doteraz (PC, 15 min, odpočet 60 s). Dôvod: kým nejde o reálne peniaze, odhlasovanie pri testovaní len zavadzia.

Pozn.: na mobile sa teraz nič nerieši — appka tam beží len ako pripnutý Chrome, takže odhlasovanie aj tam je zatiaľ v poriadku; detekcia zariadenia sa preverí až pri ostrej verzii.

Odpoveď: hotové · odchýlky · otázky.
