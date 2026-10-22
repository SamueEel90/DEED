# Simulácia peňazí: generátor darov + nezávislá kontrola (Martinov nápad, 22. 10. 2026)

*Stav: surová myšlienka, zapísaná na Martinov pokyn. Realizácia až keď budú dotvorení všetci akteri (charita, firma, tvorca, user, hosť, farnosť).*

## Čo to je

Dva nástroje nad testovacou DB:

1. **Generátor darov (klikací alg):** simuluje dary cez appku/server ako skutoční useri — rôzne prípady reťazenia, donovania, dorovnania a ich kombinácie.
2. **Nezávislá kontrola:** NIE druhá vetva toho istého kódu (zdieľala by tú istú chybu). Počíta od nuly z ledgera a overuje invarianty:
   - súčet podielov = dar, do centu; žiadny cent sa nestratí ani nezdvojí
   - každý pohyb zapísaný práve raz
   - štatistiky userov, tvorcov, firiem a charít sedia so súčtom pohybov
   - zaokrúhľovanie podľa zapísaného pravidla (sirotský riadok, Zadanie 2)

## Kombinácie, ktoré musí pokryť

- reťaz na zbierke dorovnávanej firmou (dorovnanie hlavnej vs. dorovnanie verzie u tvorcu — 2 rôzne prípady, Martin 22. 10.)
- viac reťazí (až 20) + viac firiem naraz
- mikro dar 0,10 € cez 5 % split
- vrátenie zvyšku firme (doklad D-)
- dar hosťa neskôr pripísaný registráciou (DAR-XXXX-XXXX)

## Predpoklad: zaokrúhľovanie na papier PRED písaním simulácie

Kontrola porovnáva proti pravidlu — pravidlo „komu padne zvyšková stotina" musí byť rozhodnuté, nie objavené testom. Potvrdiť, že sirotský riadok platí aj pre kaskádu reťazí a dorovnanie.

## Stotinový fond (Martin 22. 10.)

- Verejný fond, kam idú VŠETKY stotiny mimo delenia (stály adresát sirotského riadku). Na konci roka sa venuje na niečo dobré.
- Rieši zaokrúhľovanie deterministicky + príbeh „v DEED sa nestratí ani stotina".
- OTVORENÉ: čí je to účet (DEED peniaze nedrží — nesmie to byť účet platformy; kandidáti: oddelená centrálna zbierka DEED+, alebo priebežný tok na účet vybranej charity) · kto vyberá, na čo sa venuje (Martin vs. hlasovanie komunity).

## Načo to je

- Nahrádza hľadanie množstva testovacích ľudí — kombinácie vygeneruje stroj.
- **Podklad pre PSP:** keď si vyberieme poskytovateľa platieb, ukážeme výsledky testov a odchýlky — z našej strany čisté čísla, zvyšok integrácie na nich.
- Beh v CI vedľa „čistej DB z migrácií" = trvalá poistka, nie jednorazový test.
