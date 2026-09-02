# Dokumentácia DEED

## Začni tu

| Dokument | Kedy ho potrebuješ |
| --- | --- |
| [../README.md](../README.md) | Prvé spustenie, príkazy, env premenné, stav projektu |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Mapa kódu — dátový tok, routing, dizajnový systém, kam čo patrí |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Konvencie, štýl kódu, čo overiť pred pushom |
| [../ROADMAP.md](../ROADMAP.md) | Čo je hotové a čo ďalej |

## Prevádzka

| Dokument | Obsah |
| --- | --- |
| [AI_SKORE_SETUP.md](AI_SKORE_SETUP.md) | Nasadenie modulu AI Skóre — env premenné, Supabase log, kalibrácia. **Dôvod, prečo musí repo ostať privátne.** |

## Špecifikácie (`specs/`)

Podklady, na ktoré sa priamo odvoláva kód v komentároch. Názvy súborov
nemeň — komentáre citujú ich sekcie (napr. „DEED_Stity §6").

| Dokument | Čo popisuje | Kde v kóde |
| --- | --- | --- |
| [specs/DEED_Stity_v0_1.md](specs/DEED_Stity_v0_1.md) | Vizuálny systém štítov (karma). Badge = štít + text, nikdy progres | `components/stit.tsx`, `features/profil/` |
| [specs/DEED_Role_Panely_Sprava_v0_1.md](specs/DEED_Role_Panely_Sprava_v0_1.md) | Rolové panely — Charita · Tvorca · B2B, „Môj DEED firemný" | `features/rola/` |
| [specs/DEED_Role_Panely_PATCH_2.md](specs/DEED_Role_Panely_PATCH_2.md) | Doplnok k rolovým panelom — usporiadanie firemnej obrazovky | `features/rola/MojDeedFiremny.tsx` |
| [specs/qr-system.md](specs/qr-system.md) | QR katalóg, deep-linky, split QR | `lib/qr.ts`, `components/qr.tsx`, `components/splitqr.tsx` |
| [specs/retaz-fronta.md](specs/retaz-fronta.md) | Reťaz dobra — fronta tvorcu, routing príspevkov | `features/retaz/fronta.ts` |
| [specs/backend-content-design.md](specs/backend-content-design.md) | Návrh obsahovej domény v DB | `supabase/migrations/0003_content_domain.sql` |

## Biznis a právne podklady (`business/`)

Nie sú potrebné na vývoj, ale vysvetľujú, prečo je časť funkcionality
zámerne simulovaná.

| Dokument | Obsah |
| --- | --- |
| [business/DEED_Pravna_Analyza_ZHRNUTIE_v1.md](business/DEED_Pravna_Analyza_ZHRNUTIE_v1.md) | Právne limity platieb a zbierok — prečo peniaze netečú cez DEED |
| [business/DEED_Prevadzka_Naklady_a_Pravna_Analyza_v1.md](business/DEED_Prevadzka_Naklady_a_Pravna_Analyza_v1.md) | Podrobný TCO model a rozpočet prevádzky |
