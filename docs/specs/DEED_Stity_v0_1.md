# DEED — Štíty (vizuálny systém karmy)

**v0.1 · 18. 7. 2026 · Martin & Fero · interný dokument**
**Súvisí s:** DEED_Karma_System v1.2 · DEED_Role_Panely_Sprava v0.1 (+ PATCH 1)
**Princíp:** „Postavené na skutkoch, nie na rečiach."

---

## 1 · Základné pravidlo

Badge/level sa zobrazuje **výlučne ako ŠTÍT + textový popis**. NIKDY progress bar, percentá, „chýba X %", odpočet na ďalší stupeň — žiadny spoiler. Level-up je prekvapenie.

- Platí GLOBÁLNE: user, charita, tvorca, firma. Všetci začínajú Bronze.
- Dôvod: progress bar k statusu = gamifikačná páka na farming skutkov pre percentá. Keď nikto nevidí vzorec ani postup, štít sa nedá optimalizovať — jediná stratégia je robiť dobro a čakať.

## 2 · Rodina štítov — 5 levelov

Bronze · Silver · Gold · Platinum · Legend (prahy per Karma System v1.2 §4).

**Dve triedy tej istej rodiny (rovnaká silueta, rovnaké kovy):**

| Trieda | Vzhľad | Použitie |
|---|---|---|
| **Hlavná karma** | ornamentálny štít (bohaté gravírovanie po celej ploche) | hlavný status — hero na profile, reveal video, tlač |
| **Modulová karma** | hladký štít + gravírovaný SYMBOL modulu | modulové levely a tituly |

Hierarchia čitateľná bez čítania: bohatý = hlavný, hladký so znakom = špecialista modulu. Hladká plocha = symbol prežije aj malé rozlíšenie (avatar ~40 px), v ornamente by zanikol.

## 3 · Symboly modulov (gravírované do hladkého štítu)

Antický/heraldický duch, jednofarebná razba kovom štítu (Gold = zlatý reliéf, Silver = strieborný...). Žiadna farba navyše.

**MVP (6):**

| Modul | Symbol |
|---|---|
| Help | podané ruky |
| Charita | srdce v dlani |
| Šport (Aktivity) | diskobolos (antický atlét s diskom) |
| Art (Aktivity) | lýra |
| Learn (Aktivity) | sova (Aténa) |
| Eco (Aktivity) | vavrínová vetva / dub |

**Fáza 2 (návrhy, potvrdiť pri module):** Health = Asklépiova palica (JEDEN had na palici — POZOR: nie kaduceus/dva hady = obchod; nie váhy = spravodlivosť) · Gov = váhy · SOS = maják / záchranné lano · Kids = klíčiaci výhonok.

**Bez symbolu:** Core/hlavná karma (čistý ornamentálny štít — nad modulmi) · **Náboženstvo (modul bez karmy → bez štítu aj symbolu).**

Umiestnenie symbolu: gravírovanie na ploche štítu — jeden symbol, alebo dva menšie zrkadlovo po stranách (heraldicky čisté, drží symetriu). Rozhodne sa pri grafike, obe cesty povolené.

## 4 · Tituly = text, nie grafika

Modulový titul („Hrdina srdca", „Strážca prírody"...) sa NEkreslí — je to TEXT pod/pri štíte: *Legend štít + „Hrdina srdca · Help"*. Olympijský princíp: medaila rovnaká, disciplína gravírovaná. Tituly per Karma System v1.2 §8.

## 5 · Doživotné badge — iné objekty

Záchranca života, Senior Hero, Once a Legend, Renta hrdina, Super/Community Hero, Svedok dobra (6 ks) = medaily/piny, NIE štíty. MVP: textový chip. Grafika post-MVP, až budú prví držitelia.

## 6 · Level-up moment

- Pri povýšení sa prehrá **reveal animácia** (badge video ~20 s, vždy skippable) — personalizovaná s menom usera, zdieľateľná von (soc. siete).
- Jediný moment, kedy DEED sám vyrába obsah pre sociálne siete: človek, čo sa nechváli, dostane hotovú vec na pochválenie — organická reklama s overeným statusom.
- Videá per LEVEL (nie per modul): 4 ks (Silver → Legend; Bronze má každý od štartu). Legend hotový. Meno = textový overlay na šablónu, nie nový render.
- Ďalšie nápady (zdieľacie formáty, „iné kokotiny") = zásobník, vymyslí sa.
- Kód: hook `on_badge_levelup` (viď PATCH 1).

## 7 · Výroba a technika

- **Assety:** 5 ornamentálnych štítov (hotové) + 5 hladkých štítov (vytiahnuť z koša) + 6 symbolov MVP (jednofarebné PNG/SVG s priehľadnosťou).
- **Kompozícia programovo:** symbol sa skladá na hladký štít v kóde → kombinácie zadarmo. Nový modul fázy 2 = 1 nový symbol, nie 5 nových štítov.
- **Dve veľkostné verzie:** veľký štít (profil, video, tlač) s plným detailom · malý štít (feed, avatar) zjednodušený — detail gravírovania sa v malom stráca, počítať s tým v exportoch.
- **Konzistencia rodiny (záväzné):** hladké aj ornamentálne štíty zdieľajú rovnakú siluetu a rovnaké kovy per level — jedna rodina, dve triedy. Rozpoznateľnosť > variácie.

## 8 · Tri testy

**Pred-Test 20:** zadanie jasné — vizuálny systém k existujúcej karme, žiadna zmena mechaniky. ✅ GO.

**Test 20:** Red Flags: #10 Reverzibilita +2 (čisto vizuálna vrstva) · #11 Etika +2 (odstraňuje gamifikačnú páku) → ✅ Zelená. Critical +14/+24 ✅ (filozofia +2, tech +2, GDPR 0, MiCA 0, anti-greenwashing +2, single-person −1). Important +18/+24 ✅ (náklady +2 — 16 assetov namiesto 60+, PR +2 — zdieľateľný level-up, akvizícia +2). → **GO.**

**Tech Test:** MD + docx vygenerované a validované. ✅

---
*— Fero · v0.1 · 18. 7. 2026 · „Sme prvá platforma, na ktorej rozhodujú skutky a nie reči." —*
