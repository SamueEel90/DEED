# Fronta rizík na odstránenie (Fero, 24. 10. 2026)
Zlúčené: zdroj 26 (Paliho overené riziká) + vypis-rizik-spiace-funkcie.md (Ferove spiace funkcie) + zdroj 23/25 (audit). Odstraňuje sa postupne, jedna zmena naraz, keď kóder nemá inú prácu. Po každej oprave odškrtnúť s dátumom.

## TOP — hneď po oprave 15 (poradie)
1. **E3 · zmenená nasadená migrácia 0180** (commit 7f49dc3 na vetve oprava-5-n3) — NESMIE sa spojiť; zmena ak treba = nová migrácia. Vybaviť so špecialistom okamžite, je to porušenie základného pravidla.
2. **A2 · pomocník stránky zmení IBAN sektora** (overené; oprava 15 nerieši) — politika spravca_all pustí aj pomocníka, iban_overeny zapisuje appka. IBAN + iban_overeny len rola s penazenka_vyplaty / server.
3. **B1 · plné práva podľa nepotvrdeného e-mailu** — ÚLOHA PRE SAMA: overiť v Supabase, že „Confirm email" je ZAPNUTÉ. Potom doplniť kontrolu email_confirmed_at aj do uroven_stranky()/smie_v_stranke() (obrana v hĺbke).
4. **C1 · škodlivý kód v odkaze na video farnosti** (overené vykreslenie) — pri zobrazení kontrolovať http(s) ako pri textoch (NastenkaFarnosti ~1459, VypocujSi).
5. **Oprava 16 · spiace funkcie s grantami** (Ferov výpis): escrow_create (anon!), escrow_uvolni/vrat, penazenka_dobit, plne_prava, retaz_test, badge_create + 9 cron funkcií len service_role + kategória B (akcie, pobočky, B2B…). Nemaže sa, len zamyká.

## ĎALŠIE V RADE
6. D1 · fotky profilov mení každý prihlásený — vedomý test režim, ALE ostry_start() túto politiku nenájde (hľadá len doslovné true) → rozšíriť ostry_start/test poistiek, nech ju chytí.
7. D2 · pomocník zmaže stav farnosti a sektory — mazacie politiky len pre vyššiu rolu.
8. E1 · zbierka_vklad_potvrd: prihlásený bez DEED účtu potvrdí cudzí prevod — doplniť kontrolu.
9. E2 · stav_registracie='hotovo' si anonym zapíše sám — strážca (súvisí s 0179).
10. C2 · bucket prispevky bez limitu typu/veľkosti — limity ako Iskry (0034).
11. A3 · karta/CVC vo vlastnom formulári (Platba.tsx) — PRED napojením brány prerobiť na formulár brány. Checklist pred ostrou.

## Rieši už bežiaca oprava 15 (nezdvojovať)
A1 (dorovnanie_financuj/presun), B2 (notifikuj_ucet a upoz_*).

## Odložené rozhodnutím Martina (test režim; sprísni sa pred ostrou)
Štít dôvery dev prepínač · registrácia/overenie/karma sprísnenie. (Escrow NIE JE odložený — je v bode 5.)

## Checklist pred ostrou — doplnené z rizík
A3 (karta cez bránu) · D1 politika fotiek · B1 potvrdenie e-mailu overené · C2 limity bucketu.
