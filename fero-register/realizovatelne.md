# Mapa realizovateľnosti — nápady z papiera vs. to, čo už v appke stojí

*Vedie Fero od 23. 10. 2026. Úloha: pri každej kontrole kódu prejsť papierové nápady a upozorniť, keď sa niektorý stane lacným — „stačí pridať X a Y a napojí sa". Netlačí sa nič do roboty — len sa hlási príležitosť, rozhoduje Martin.*

## NA DOSAH (chýba 1–2 kúsky)

1. **Stotinový fond** (nápad 22. 10.): ledger už má sirotské pravidlo a 0157 fixuje podiely na pohybe na cent. CHÝBA: (a) stály adresát sirotských riadkov = fond, (b) riadok fondu v module. Napojiteľné hneď po dokončení delenia reťazí.
2. **Badge dôvery na weby charít** (rešerš bod 15): StitNaWeb v kóde UŽ JE. CHÝBA: (a) napojiť úroveň na org karmu (keď bude kalibrovaná), (b) klik → DEED profil. Polovica hotová skôr, než sa zadala.
3. **Challenge vrstva** (handover bod 16): zbierka už má číslo, cieľ, sumu a stav. CHÝBA: (a) strojovo čitateľný koncový bod (číslo+cieľ+suma+splnené), (b) kaskáda cieľ 1 → cieľ 2 — a kaskáda sa PRÁVE stavia pre reťaze. Po dokončení reťazí je Challenge z väčšej časti zadarmo.
4. **Tvorca-výzva** (benefit za overený skutok, napr. darovanie krvi): overovanie skutkov beží, školenie s QR prezenčkou a osvedčením je na stránke tvorcu navrhnuté. CHÝBA: (a) väzba doložený skutok → benefit tvorcu, (b) zoznam uplatnení. Mechanika, ktorú nemá nikto — a stojí na hotových kusoch.

4b. **Benefičný stôl** (zásobník Ferka 1, zdroje/17): akcie so vstupným/zbierkou, event QR a splity v appke stoja. CHÝBA: jedna hlavička v typoch akcií + texty. Najlacnejší nový produkt v celom zásobníku — na dosah, keď prídu Aktivity/akcie na rad.

## STREDNÁ VZDIALENOSŤ (chýba viac, ale základ stojí)

5. **Vecné dary — plný tok** (rešerš 7): rotujúci QR (TOTP, proof-of-presence, 0015) existuje, tabuľka vecny_dar existuje, vecná zbierka je typ. CHÝBA: zberné miesto + položky, výber položky organizátorom, potvrdzovací sken, oceňovanie. Fáza 2–3 podľa plánu — ale QR základ netreba stavať.
6. **VTO (platené hodiny)**: meranie prítomnosti cez TOTP QR existuje; väzba zamestnanec↔firma navrhnutá. CHÝBA: hodinový účet, povolené zoznamy, report. Fáza B2B.
6b. **Dobrovoľnícka vrstva akcií** (zásobník 2): výzva o ruky + event QR dochádzka + karma existujú (brigády) — CHÝBA: pripnutie roly POMOCNÍK k akcii. S Aktivitami.
6c. **Večera s osobnosťou** (zásobník 4): zbierka s cieľom + vstupenka + QR účasť + split — všetko stojí alebo sa práve stavia s reťazami. CHÝBA: zlepenec do jedného toku + prevádzka ako miesto. Fixná cena po tvorcovskej vrstve; DRAŽBA až po Dagmar.

7. **Dve čísla pre firmu (audit-grade)**: každý dar už nesie typ a viditeľnosť. CHÝBA: váhy auditovateľnosti per typ + výstup. Stavia na ledgri, ktorý už je nemenný — predpoklad splnený.

## ĎALEKO (základ ešte nestojí)

- DEED Match (DPIA najprv) · nemocnica · zdravotnícky bonus · samosprávy · Otvorená stolička (zásobník 3 — vedome čaká, kým si ju trh vypýta sám).

*Pravidlo: keď sa položka posunie o kategóriu vyššie, poviem to Martinovi sám, v jednej vete, s tým, čo presne chýba.*
