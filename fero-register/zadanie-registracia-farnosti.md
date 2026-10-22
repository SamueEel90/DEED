# Zadanie: registrácia farnosti (testovacia verzia pre testera)

*Cieľ: skutočný farár-tester si vie sám založiť farnosť z userského účtu a prejsť celú Správu. Bez overenia účtu, bez reálnych peňazí. POZOR: dohoda znie „bez overeného účtu sa nikto nezaregistruje, nič nepreskakujeme" (zdroj 06) — toto je vedomá výnimka LEN pre testovaciu verziu, rozhodol Martin 21. 10. Ostrá verzia (IBAN povinný, IČO + štatutár, platca ≠ vlastník) príde ako samostatný bod neskôr — teraz NErobiť.*

## Bod 1 — Pridanie farnosti z osobného účtu

1. V registrácii organizácie (CharitaB vetva) pribudne voľba typu: **Charita/OZ** alebo **Farnosť**. Farnosť ide vlastnou krátkou cestou (nie IČO krok charity).
2. Kroky farnosti podľa cieľového toku (zdroj 06): **výber cirkvi** (jeden číselník — zjednotiť viera/mock.ts a lib/mojeFarnosti.ts na JEDEN zdroj, druhý zmazať; číselník je konfigurácia, nie kód) → **názov + obec** → **hlavný kostol** → **IBAN voliteľný**, overenie 0,01 € sa v testovacej verzii preskakuje tlačidlom „Overiť neskôr v Správe" (účet ostáva neoverený). Krok IČO + štatutár patrí do ostrej verzie, teraz sa vynecháva.
3. Dokončenie uloží stránku typu `farnost`, zakladateľ = **Farár** (hlavný správca), a otvorí Správu farnosti naplnenú údajmi z registrácie (názov, obec, cirkev, kostol, neoverený účet).

## Akceptačné kritériá

- Nový user: registrácia osoby → z účtu „Pridať organizáciu" → Farnosť → hotovo, celé bez overenia IBAN a bez platby.
- Vybraná cirkev sa zobrazí v Správa → Cirkev farnosti aj v Adresári cirkví; tituly/oslovenia sa ťahajú z DB tabuľky `cirkev` podľa vybranej cirkvi (dozorca len kde patrí).
- Kostol z registrácie je prvé miesto farnosti (Kostoly a miesta), zvonček sa viaže naň.
- Neoverený účet: Správa ukazuje „Overiť účet farnosti" ako doteraz; žiadna reálna platba nikde.
- UI podľa dohôd: záväzné akcie podržaním, ‹ Späť o krok, hlášky vzor Svetlúšik, bez emoji.

*Odpoveď: hotové · odchýlky · otázky.*
