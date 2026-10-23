# Scenár pre Soňu: sprievodca prvým príchodom farára do Správy farnosti

*Fero, 23. 10. 2026. Kostra podľa skutočného kódu (SpravaFarnosti.tsx — Prvé kroky) a dohôd. Soňa kreslí JEDEN sprievodca so zástupkami zo číselníka cirkví: {oslovenie} (pán farár / pán kazateľ / pán rabín / duchovný otec…), {jednotka} (farnosť / zbor / obec), {bohosluzba} (svätá omša / bohoslužba / služby Božie). Texty hovoria len o funkciách appky, nikdy o viere. V prototype prepínač cirkví (RKC / ECAV / rabín) na kontrolu dĺžok slov.*

## Kedy sa sprievodca spustí

Prvý príchod do Správy po registrácii (stránka prázdna). Nie je to vrstva cez celú obrazovku — je to séria kariet „Prvé kroky" hore v Prehľade, ktoré sa odškrtávajú; farár môže kedykoľvek odísť a vrátiť sa, nič sa nestratí. Preskočiť sa dá všetko okrem overenia účtu (bez neho nejdú peniaze).

## Krok 0 · Privítanie (jedna karta, nie obrazovka)

„Vitajte, {oslovenie}. Vaša {jednotka} má stránku — poďme ju spolu naplniť. Štyri kroky, asi 10 minút." Pod tým 4 kroky s fajkami: Profil · Účet · Hlavná zbierka · {bohosluzba}. Svetlúšik vzor, žiadne výkričníky.

## Krok 1 · Dokončiť profil (go: profil)

1. „Takto vás uvidia ľudia" — ťuk na **Verejný profil** (vľavo hore) ukáže prázdnu stránku s vysvetlením „Zatiaľ ju nikto nevidí".
2. Späť v Správe → **Upraviť profil**: logo (alebo monogram, kým logo nie je — nikdy prázdny biely chip), titulná fotka, text **O nás** (1000 zn., „…viac"), kontakt. Percento úplnosti: logo+titulka+O nás+kontakt po 25 %.
3. Autosave — „Uložené ✓" až po serveri; ‹ Späť presne o krok.

## Krok 2 · Overiť účet {jednotky} (go: ucty)

IBAN → kód → „Pošlite 0,01 € s týmto kódom z účtu {jednotky}" → Čaká na platbu / Overený ✓. Veta prečo: „Dary idú priamo na váš účet, DEED+ ich nedrží." Farár sa o overení dozvedá TU, pri prvom príchode — nie až pri zapečatení (bod 340). V testovacej verzii krok preskočiteľný („Overiť neskôr").

## Krok 3 · Spustiť hlavnú zbierku (go: zbierky)

1. Bez hlavnej sa nedá založiť žiadna iná — veta v karte.
2. Formulár: názov (max 40 zn., prázdny = „Hlavná zbierka"), text, titulná fotka; kontrola Názov · Text · Fotka pred spustením.
3. **Spustiť podržaním 1,5 s** → zelená karta „Hlavná zbierka beží" + ďalší krok (QR plagát).

## Krok 4 · Zadať {bohosluzba} a rozvrh (go: omse)

Časy per kostol (prvý kostol je z registrácie), týždenný/mesačný režim. Hneď po zadaní veta: „Ku každej {bohosluzbe} sa darcom otvorí zvonček — nastavíte ho pri hlavnej zbierke."

## Po štyroch krokoch — karta „Hotovo"

„Stránka žije. Čo ďalej (kedykoľvek):" tri tiché odkazy: **Oznam** (prvý oznam veriacim) · **QR plagát** (vytlačiť na nástenku, PDF vektor v ráme DEED) · **Vzhľad stránky** (Ateliér, 4 vzhľady). Nič z toho nie je povinné, karta sa dá zavrieť.

## Vetvenia podľa číselníka (jediné dve)

- **Dozorca**: krok „Pozvať dozorcu" sa ukáže LEN cirkvám, ktoré ho majú v configu (evanjelici). QR pozvánka s časovou platnosťou.
- Cirkev bez vlastných titulov → predvolené „duchovný správca / spoločenstvo". Žiadna cirkev nie je druhá kategória.

## Pravidlá, ktoré sprievodca nesmie porušiť

Prázdny prvý príchod (žiadne ukážkové dáta) · hit ≥44 px, text ≥16 px · bez emoji a výkričníkov · záväzné akcie podržaním · rozpísané sa nestratí · hlášky vzor Svetlúšik · „veriaci", nikdy „farník" · test hlúposti: zvládne to 70-ročný farár na fare s pomalým internetom.

*Odpoveď Soni: návrh obrazoviek + zoznam zástupiek, ktoré použila.*
