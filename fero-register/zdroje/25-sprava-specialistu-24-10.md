# Zdroj 25 · Správa špecialistu (kontrola kódu) 24. 10. — stav po opravách 1–13

# Správa pre strážcu projektu (Fero) · kontrola kódu 24. 10. 2026 — stav po opravách

**Kto:** Claude (kontrola kódu), na pokyn Martina. **Čo:** 13 opráv z auditu 24. 10. (R1–R3, R7, N1–N4, N7–N10) + 3 doplnky, ktoré Martin rozhodol počas dňa (opravy 11–13).
**Kde:** repo DEED na Martinovom disku, 13 vetiev `oprava-1-r1-n9` … `oprava-13-prehlad-server`, poskladané za sebou, každá = jeden commit. **Nič nie je pushnuté ani nasadené.** Zabraté migrácie **0176–0188**, ďalší kóder od **0189**.

## Dodržané pravidlá
1. Jedna oprava = jedna vetva = jeden commit; nič nepushnuté bez Martina. Výnimka s Martinovým súhlasom: opravy 2–13 pripravené vopred (stacked), nasadzujú sa postupne, až po Martinovom teste predchádzajúcej.
2. Žiadna pushnutá migrácia sa nemenila. Zmeny počas dňa (limit anonymov, anonymný autor) sú v nepushnutých migráciách 0176 a 0182 — čísla ostali.
3. Nič nad rámec dohody: každý bod nižšie má Martinovo „choď“. Kde sa dohoda rozchádzala s kódom (dorovnanie, anonym, limit), bola STOP + otázka, nie vlastný výklad.
4. Testovacia pokladňa: platba sa potvrdí v tej istej transakcii, Martinovo testovanie nezmenené (test `platba_pending_test.sql` to kontroluje).
5. R4, R6, localStorage, R8 — nechytané.

## Čo sa zmenilo (vecne)

| # | audit | čo platí po oprave | migrácia |
|---|---|---|---|
| 1 | R1 + N9 | Dar kartou/SEPA vzniká ako `pending` bez pohybov; peniaze v ledgeri až po potvrdení rúrou (`/api/platba-webhook`, tajomstvo). DeeD a testovacia pokladňa hneď. Limit neprihlásených: 30 nepotvrdených / hod / IP (Martin 24. 10.). Expirácia karta 1 h, SEPA 7 dní. | 0176 |
| 2 | N1 | Dorovnanie firmy sa pripíše len k potvrdenej platbe (spúšťač na `platba`), nie na slovo appky. Kurz DeeD/€ na serveri (`server_konfig`). | 0177 |
| 3 | N2 | Dar na zbierku dostane vždy jej autor — príjemcu určí server, appka ho nemôže presmerovať. | 0178 |
| 4 | N4 | Overenie telefónu/e-mailu, typ účtu, stav registrácie, auth_id — zapisuje len server (strážca nad `ucet`). | 0179 |
| 5 | N3 | Štartovací kredit 1 240 DeeD, dobitie a sken na akcii len pre overený `aktivny` účet; kredit raz. Limit AI skóre: neoverený = ako bez prihlásenia. | 0180 |
| 6 | R2 + R3 | `ostry_start()` — jeden krok: vypne testovaciu pokladňu, OTP/KYC/KYB mock, testovacie stránky a firmy, testovacie väzby; vráti správu a zoznam otvorených zápisových politík (má byť prázdny). Test prejde každú poistku. | 0181 |
| 7 | N7 | Meno a iniciála autora príspevku zo servera (pravidlo zobrazenia z profilu); odznak, topované, význam, krízový režim len server. **Príspevok bez mena sa nezaloží** — anonymne sa dá len darovať (Martin 24. 10.). | 0182 |
| 8 | N8 | AI skóre sa pripne len k behu, ktorý spustil autor skutku (a nie je starší ako 24 h); cudzí beh = skóre 0. | 0183 |
| 9 | N10 | `v_vyzbierane` číta z tabuľky `zbierka_sucet`, ktorú plní spúšťač na `pohyb` (prepočet len daného prípadu). `v_zbierka_vyzbierane` (omše, reťaz) bez zmeny — závisí od času. | 0184 |
| 10 | R7 | `/api/push` POST len s `x-cron-token`; cron ho berie z Vault tajomstva. | 0185 |
| 11 | — | Dorovnanie, dva režimy úhrady (Martin): karta cez nás = beží hneď + oznam charite; SEPA = čaká na potvrdenie príjmu charitou, žiadny 48 h automat. Úhradu určí server z kanála. Charita vidí len dorovnania svojej stránky. | 0186 |
| 12 | — | Zbierka charity s termínom (krátkodobá 30 dní, dlhodobá 3/6/12 mes.) skončí po termíne sama (cron); bez termínu, hlavná/sektorová, farnosť — ručne. Reťaz sa posunie. | 0187 |
| 13 | — | Prehľad stránky: Reťaz dobra a Dorovnávané zbierky zo servera (doteraz ukážka z prototypu). | 0188 |

Vypustené: N11 (Top, mapa) — podľa Martina placebo.

## Rozhodnutia Martina z 24. 10. (zapísané, platia ako dohoda)
- Kto chce do feedu zbierku / skutok, nemôže byť anonymný; neregistrovaný a anonymný môžu len darovať. Výnimka „cez charitu“ (charita overí a zastreší) v kóde neexistuje — je to nová funkcia, nerobená.
- Príjemca daru = zbierka alebo skutok; limit neprihlásených je na IP, nie na príjemcu.
- SMS platby sa nepoužívajú.
- Štartovací kredit: len do ostrej verzie (prepínač pokladne), potom žiadny.
- Zbierka s termínom skončí sama; bez termínu ručne. Tvorca reťaze musí vedieť reťaz ukončiť kedykoľvek — **doplniť pri správe tvorcu** (tlačidlo „Ukončiť reťaz“; dnes len cez „Vytvoriť novú reťaz“).

## Čo ostáva otvorené (mimo zadania, hlásené)
- `escrow_create` a `dorovnanie_financuj` v EUR vznikajú hneď (bez rúry) — platí aj pre platbu firmy kartou pri dorovnaní. Naostro napojiť rovnako ako dary (0176).
- Zlyhané/expirované platby ostávajú ako riadky `failed` (nerátajú sa, nemažú sa).
- „Cez charitu“ (anonymný núdzny pod záštitou charity) — len mock zoznam charít v Help, bez DB.
- Stránka tvorcu — len základ.
- R4 (PIN na serveri), R6 (balík), localStorage → DB, R8 (čistenie repa) — čakajú na rozhodnutie.

## Ako sa to overovalo
Syntaktická kontrola každej migrácie a testu (parser Postgresu), kompilácia appky (TypeScript bez chýb). Skutočný beh DB testov urobí CI pri pushi každej vetvy (`scripts/db-z-migracii.sh` + `supabase/tests/*.sql`). Preto poradie: jedna vetva → zelené CI → Martinov test → ďalšia.

## Krížová kontrola — na čo sa pozrieť
1. Oprava 1: `platba_zapis` — `v_hned := p_kanal = 'deed' or je_testovaci()`; testovacia pokladňa potvrdí inline (`platba_potvrd(..., 'testovacia_pokladna')`).
2. Oprava 3: `platba_create` s `p_case_id` → príjemca = autor prípadu; `p_prijemca_ucet`/split s prípadom = chyba `prijemca_z_pripadu`.
3. Oprava 7: trigger `prispevok_zz_autor_servera` je **invoker** (nie definer) — `current_user` rozlíši appku od serverových funkcií; beží po `prispevok_autor_zo_session` (poradie podľa mena).
4. Oprava 11: `dorovnanie_zapecat` — `uhrada` z `kanal` (sepa → mimo), karta → `stav='aktivne'` hneď; `dorovnania_obnov()` je prázdna (automat zrušený), cron odhlásený.
5. Oprava 12: `zbierka_termin(z)` — len `nastavenie->>'typ'` kratka/dlha; `modul='nabozenstvo'`, hlavna/sektor, omše = null.
