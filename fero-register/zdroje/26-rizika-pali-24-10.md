# Zdroj 26 · Overené riziká (Pali, kontrola) 24. 10. — verbatim

# Overené riziká · Paľo (kontrola) · 24. 10. 2026

**Kód:** `platby-modul` = `master` = `60381de` (opravy 1–13 nasadené, migrácie 0001–0188).
**Kde som skúšal:** vlastná čistá databáza zo všetkých 198 migrácií, s rovnakými automatickými právami ako na Supabase. Skúšky prešli 101/101, typecheck 0 chýb, build a smoke OK. Na skutočnom DEED2 som nič nemenil ani nespúšťal.

**Overené** = útok som spustil a prešiel. **Z kódu** = vyčítané z kódu, nespustené.
**Oprava 15** = plán špecialistu: zamknúť automatický prístup zvonku k interným funkciám.

---

## A · Krádež peňazí

### A1 · Peniaze bez platby cez dorovnanie — overené · rieši oprava 15
- **Čo:** `dorovnanie_financuj` a `dorovnanie_presun` (0046) môže zavolať ktokoľvek, aj neprihlásený. Pri vypnutej testovacej pokladni vzniklo 10 000 € a presunuli sa príjemcovi.
- **Príčina:** v migrácii je len `revoke … from public`, chýba odobratie od `anon` a `authenticated`. Na Supabase to automatický prístup nezruší.

### A2 · Pomocník stránky zmení bankový účet sektora — overené · oprava 15 NErieši
- **Čo:** dobrovoľník s právom len `obsah` (bez `penazenka_vyplaty`) prepíše `sektor_stranky.iban` bežiaceho sektora na svoj a sám nastaví `iban_overeny`.
- **Príčina:** politika `sektor_stranky.spravca_all` = `spravujem_stranku()`, ktorá je pravda aj pre pomocníka. Spúšťač `sektor_stranky_kontrola` IBAN nestráži a `iban_overeny` zapisuje appka.
- **Útok zvonku:** stačí ukradnúť heslo jedného dobrovoľníka.

### A3 · Číslo karty a CVC zadávané v našom formulári — z kódu · pred napojením brány
- **Čo:** `features/zbierka/Platba.tsx` pýta číslo karty, platnosť a CVC vo vlastných poliach appky. Dnes ich nikam neposiela, ide len o ukážku.
- **Riziko:** keď sa napojí skutočná brána, kartu musí zadávať formulár brány. Inak každá diera v appke (pozri C1) znamená ukradnuté karty.

---

## B · Krádež identity

### B1 · Plné práva k stránke podľa nepotvrdeného e-mailu — overené v DB · treba overiť nastavenie Supabase
- **Čo:** `uroven_stranky()` a `smie_v_stranke()` priraďujú rolu podľa `auth.users.email`, ale nekontrolujú `email_confirmed_at`. Účet s nepotvrdeným e-mailom štatutára dostal `farar` (plné práva).
- **Naostro to bráni len** nastavenie Supabase „Confirm email“. Appka počíta s oboma režimami (`lib/auth.ts` signUp).
- **Ak je vypnuté:** ktokoľvek sa zaregistruje na e-mail farára alebo štatutára a prevezme stránku aj s bankovým účtom.
- **Treba od Samuela:** overiť v Supabase, že potvrdenie e-mailu je zapnuté.

### B2 · Falošné upozornenia komukoľvek — overené · rieši oprava 15
- **Čo:** `notifikuj_ucet` (0088b) zavolá aj neprihlásený a pošle upozornenie aj push na ľubovoľný účet s ľubovoľným textom, napríklad „Váš účet je zablokovaný, zadajte PIN“.
- **Príčina:** rovnaká ako A1.

---

## C · Škodlivý kód

### C1 · Odkaz na video farnosti sa pri zobrazení nekontroluje — overené vykreslenie · oprava 15 NErieši
- **Čo:** odkaz kontroluje len obrazovka pri zadaní (`odkazOk` v `PrihovorKarta.tsx`). Uložený je v `naboz_stav` a správca alebo pomocník ho môže zapísať aj priamo do tabuľky. Pri zobrazení (`NastenkaFarnosti.tsx` riadok cca 1459, `VypocujSi.tsx`) ide nekontrolovaný do `href`.
- **Overené:** React 18.3 vykreslí `href="javascript:…"` bez zmeny.
- **Dopad:** s ukradnutým heslom správcu farnosti útočník zapíše namiesto odkazu kód. Každému návštevníkovi, ktorý ťukne „Pozrieť“, prevezme reláciu, teda účet.
- **Čo drží:** texty a oznamy čistí `sanitizujHtml` a odkazy v nich povoľuje len `http(s)`.

### C2 · Úložisko fotiek príspevkov bez limitu typu a veľkosti — z kódu
- **Čo:** verejný bucket `prispevky` (0020) nemá obmedzený typ súboru ani veľkosť. Každý prihlásený tam nahrá hocijaký súbor a ten visí na verejnej adrese. Iskry limity majú (0034), toto nie.
- **Nevyskúšané:** úložisko Supabase tu nemám.

---

## D · Znefunkčnenie a sabotáž

### D1 · Fotky profilov mení a maže každý prihlásený — z kódu · testovací režim, ktorý ostrý štart nenájde
- **Čo:** politika `foto_entity.foto_test_zapis` (0079b) = `moj_ucet() is not null`. Ktokoľvek prihlásený zmení alebo zmaže logo a titulnú fotku ktorejkoľvek charity či farnosti, napríklad podvrhne obrázok „pošlite peniaze na tento účet“.
- **Je to vedomý testovací režim** („pred launchom zúžiť“).
- **Problém:** `ostry_start()` (0181) hľadá len politiky s podmienkou doslova `true`. Túto nenájde, takže by ostala otvorená aj naostro.

### D2 · Pomocník farnosti zmaže celý stav farnosti a sektory — z kódu
- **Čo:** mazacie politiky `naboz_stav`, `naboz_prispevok` a `sektor_stranky` stoja na `spravujem_stranku()`, ktorá je pravda aj pre pomocníka. Jeden ukradnutý účet dobrovoľníka teda zmaže omše, kalendár aj sektory.

---

## E · Menšie nálezy (pri oprave sa oplatí pribrať)

- **E1 · `zbierka_vklad_potvrd` (0083), overené:** podmienka `if v_ja is not null and …` sa preskočí, keď prihlásený ešte nemá účet v DEED. Takýto človek označí cudzí čakajúci prevod „vlastných peňazí“ ako potvrdený. Peniaze vďaka oprave 1 nevzniknú, platba ostane `pending`, ale prevod svieti ako prijatý. Pri zapnutej testovacej pokladni vzniknú hneď.
- **E2 · `stav_registracie = 'hotovo'`, overené:** anonymný účet si ho zapíše sám. `ovp_potvrd` ho berie ako dokončenú registráciu, takže sa človek môže stať príjemcom pohrebnej zbierky bez mena a telefónu. Riziko znižuje to, že musí byť osobne pri farárovi.
- **E3 · oprava 5 na GitHube:** dodatočný commit `7f49dc3` na vetve `oprava-5-n3` mení už nasadenú migráciu 0180. Nie je spojený s `platby-modul`. Nesmie sa spojiť; ak je zmena potrebná, má ísť ako nová migrácia.

---

## Odložené rozhodnutím Martina (24. 10., testovací režim)

Zapísané len pre úplnosť, teraz sa neriešia:
- `escrow_create` a `escrow_uvolni`: prihlásený vyrobí 1 000 000 € a pripíše ich na skutok. Overené. Escrow sa podľa Martina nepoužíva.
- Štít dôvery si charita nastaví sama (`nastavenia_stranky.verejne.stit`). Overené. Ide o dev prepínač.
- Registrácia, overenie a karma sa budú sprísňovať pred ostrou verziou.

---

## Čo drží (skúšal som, nedalo sa)

- Priamy zápis do tabuliek: všetky majú RLS, žiadna zápisová politika nemá podmienku `true`.
- Zmena overenia telefónu, e-mailu a typu účtu: strážca 0179 drží.
- Čítanie cudzích údajov: darcovia, mená detí (0119), úmysly (0116), účastníci akcií.
- Rebríček rešpektuje anonymných aj skrytých darcov.
- `/api/platba-webhook` a `/api/push` bez tajomstva odmietnu.
- Pozvánka do správy: QR token sa mení každých 15 s. Zmenu ľudí v správe stráži `nastavenia_len_farar`.
- Prihlásenie cez QR a limity pri SMS kódoch.
- Ukladanie fotiek z fotobanky: len správca.

## Zhrnutie pre plán opráv

| | Riziko | Overené | V oprave 15 |
|---|---|---|---|
| A1 | peniaze cez dorovnanie | áno | áno |
| A2 | pomocník mení IBAN sektora | áno | **nie** |
| A3 | karta v našom formulári | z kódu | nie (pred bránou) |
| B1 | práva podľa nepotvrdeného e-mailu | áno (DB) | **nie**, Samuel overí nastavenie |
| B2 | falošné upozornenia | áno | áno |
| C1 | kód v odkaze na video | áno (vykreslenie) | **nie** |
| C2 | úložisko bez limitov | z kódu | nie |
| D1 | fotky profilov, ostrý štart ich nenájde | z kódu | **nie** |
| D2 | pomocník zmaže farnosť | z kódu | nie |
| E1 | potvrdenie cudzieho prevodu | áno | nie |
| E2 | registrácia „hotovo“ sám | áno | nie |
| E3 | zmena nasadenej 0180 | áno | — |
