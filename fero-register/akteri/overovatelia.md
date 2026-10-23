# AKTÉR/SEKCIA: Overovatelia (pohrebná a overované zbierky)

*Fero, založené 23. 10. na Martinov pokyn. Patria sem: fara · pohrebníctvo · matrika · reštika · hotel · event agentúra. Viaže sa na pohrebný tok, rozety/vsádzky a vlastné delenie overovateľa.*

## A · DOHODNUTÝ ZÁKLAD

- **Dva druhy overovateľa:** *overovateľ-dar* = cirkev (podiel v splite, dobrovoľný 0–3 %) · *overovateľ-služba* = firma/inštitúcia (3 %, strop 100 €, vypínacia poistka, faktúra).
- **Kto smie:** pohrebná služba, hotel, reštaurácia = firma (B2B partner); matrika, obecný úrad = nový typ stránky „inštitúcia". Overuje ich DEED pri onboardingu (KYB + zmluva). Poradie pri pohrebe: pohrebníctvo > fara > matrika.
- **Delenie:** žiadny výplatný stroj — rozdelenie sa pri zapečatení zmení na split-config, každý dar tvorí podiely ledgera na cent (príjemca / overovateľ / podelené); non-custody, smerovanie robí rúra/PSP. Zapečatiť sa nedá, kým KAŽDÝ príjemca podielu nemá overený účet.
- **Pohrebný tok:** QR overovateľa 15 s → parte → rozdelenie 0–3 % max 100 € (bežec 0,5 %) → kód pozostalému 5 min → zapečatenie; zbierka do 7 dní po pohrebe; rozety/vsádzky (prah 30 €, tiery 30/50/100/200, cena ≤5 € z daru), uzávierka vsadiek 3 h pred pohrebom; farba piety; sumy nikdy.
- **Editor vsádzky:** jednosúborový HTML nástroj — rozhodnutia o funkciách a právach kvetinárka vs. zákazník hotové (deed-vsadka-editor); kvetinárky = B2B partner s tlačiarňou (click/MPS).

## B · NEŽIJE V APPKE — STRÁŽIŤ

| Čo | Stav | Vážnosť |
|---|---|---|
| **Editor vsádzky v appke** | existuje len ako samostatný HTML v artifacts — do pohrebného toku NEzakomponovaný (Martin 23. 10.) | **vysoká — zapojiť do toku rozety pri pohrebnej zbierke** |
| **Sekcia/onboarding Overovatelia** | typ stránky „inštitúcia" neexistuje; KYB + zmluva onboarding nie je; výber overovateľa v toku mock | **vysoká — vlastná sekcia (fara·pohrebníctvo·matrika·reštika·hotel·event agentúra)** |
| Delenie overovateľa v ledgri (split-config podiel služby 3 %) | pravidlo zo 7. 10., nasadenie overiť (viaže sa na 0157 delenie) | vysoká — ďalšie delenie popri reťazi |
| Vypínacia poistka + faktúra overovateľa-služby | nie je | stredná |
| Tlačiareň/rozety u kvetinárky (hardvér, click) | B2B mimo appky, pripravené | vedome |

## C · OTVORENÉ

- Event agentúra a hotel — rovnaké podmienky ako pohrebníctvo (3 %/100 €), alebo vlastné? Nerozhodnuté.
- Kedy sa Overovatelia zaraďujú do registrácie typov (karta 36 má „inštitúciu" ako nový typ — doplniť?).
