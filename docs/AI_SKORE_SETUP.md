# AI Skóre — nasadenie a prevádzka testovacieho modulu

*Implementácia DEED_AI_Hodnotenie_Backend_DEV.md (v1) + Doplnok v1.1 + SCORING_PROMPT.md + scoring-config.json.*

## Čo kde žije

| Súbor | Čo to je |
| --- | --- |
| `api/_lib/scoring-config.json` | **Všetky čísla a kotvy** — Martin ladí LEN tu. Každá zmena = nová `configVersion` + zápis do changelogu. |
| `api/_lib/prompt.ts` | SYSTEM prompt (šablóna s `{{...}}`) + skladanie z configu. **DÔVERNÉ — repo musí ostať privátne.** |
| `api/_lib/opus.ts` | Volanie Anthropic API (pinovaný model, retry, opravné JSON kolo). |
| `api/_lib/vypocet.ts` | Validácia výstupu Opusa + dopočet skóre a pásma (Opus skóre nikdy nepočíta). |
| `api/_lib/log.ts` | Kalibračný log do Supabase (append-only) + fotky do Storage + denný strop. |
| `api/score.ts` | `POST /api/score` — hlavný endpoint (Vercel serverless, maxDuration 60 s). |
| `api/score-log.ts` | `GET /api/score-log` — admin tabuľka behov + `?format=csv` export. |
| `supabase/migrations/0023_scoring_log.sql` | Tabuľka `scoring_log` (RLS bez policies) + privátny bucket `scoring-dokazy`. |
| `src/features/skore/` | Testovací modul v appke (formulár → doplnit/ok/zamietnut flow + kalibračná tabuľka). Modul „AI Skóre“ v menu Viac. |

## Env premenné (Vercel → Settings → Environment Variables)

| Premenná | Načo |
| --- | --- |
| `ANTHROPIC_API_KEY` | Martinov Anthropic kľúč. NIKDY v repe/frontende/logu. |
| `SUPABASE_URL` | URL Supabase projektu (rovnaká ako `VITE_SUPABASE_URL`). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role kľúč — log + fotky + denný strop. Len backend. |
| `SCORING_ADMIN_TOKEN` | Ľubovoľný tajný reťazec — chráni `/api/score-log` (Martin ho zadá v tabe Kalibrácia). |

Bez `ANTHROPIC_API_KEY` vráti `/api/score` hlášku „nedostupné“. Bez Supabase kľúčov endpoint funguje, ale log a denný strop sú vypnuté (len na lokálny vývoj).

## Kroky nasadenia

1. Aplikovať migráciu `0023_scoring_log.sql` (Supabase SQL editor / CLI).
2. Nastaviť 4 env premenné vo Verceli (Production + Preview).
3. Deploy — `vercel.json` už má `maxDuration: 60` pre `api/**` a rewrite vynecháva `/api/`.
4. Lokálny vývoj: `vite dev` **neservuje** `/api` — použi `vercel dev` (s `.env.local` s tými istými premennými).

## MOCK režim (test bez API kľúča)

Bez `ANTHROPIC_API_KEY` sa lokálne (dev/preview) zapne **simulátor** (`api/_lib/mock.ts`): deterministické heuristiky zrkadlia pravidlá promptu (tri vetvy skladačky, kotvy, kredibilita/nezištnosť z configu), takže celý flow — formulár → otázky → náhľad → skóre/pásmo → log — funguje hneď. Poznávacie znaky: badge „MOCK simulácia“ v náhľade, `configVersion` s príponou `+MOCK` v logu, `mock: true` v response.

- Zapnutie: automaticky lokálne bez kľúča, alebo explicitne `SCORING_MOCK=1` (aj s kľúčom — šetrí kredit pri ladení UI).
- **V produkcii bez kľúča sa NIKDY nemockuje** — vráti sa „nedostupné“ (falošné skóre nesmie ujsť do ostrého behu).
- `/api` beží aj v `npm run dev` a `npm run preview` (plugin `scripts/apiDevPlugin.ts` — netreba `vercel dev`); bez Supabase sa loguje do pamäte procesu (kalibračná tabuľka funguje, po reštarte sa vyčistí), lokálny admin token je `dev`.
- Overené headless testom (14 kontrol ✓): doplnit → 2. kolo → ok, zamietnut pri rozpore, injection flag + vyčistený učesaný text, skóre 4.6/1.2/3.6 presne podľa vzorca, pásmo 4 len z krízy, kalibračná tabuľka + CSV.
- Mock je len lešenie na overenie flowu — kalibrácia kotiev má zmysel až s reálnym Opusom.

## Rozhodnutia mimo spec (dôvody)

- **`temperature: 0` sa modelu `claude-opus-4-8` NEPOSIELA.** Opus 4.7+ sampling parametre odstránil — request s `temperature` vráti HTTP 400. Config hodnota ostáva a poslala by sa len starším modelom (`opus.ts → modelBerieTemperature`). Determinizmus: thinking sa neposiela (na 4.8 je bez neho), prompt zamknutý; akceptačné kritérium 1 (±1 tolerancia) sa overuje opakovanými behmi.
- **Log = Supabase tabuľka** (nie Vercel Blob/KV): už je v projekte, append-only, CSV export triviálny, admin pohľad číta cez service role. Denný strop = COUNT dnešných riadkov (netreba KV počítadlo).
- **Limit tela requestu:** Vercel funkcie berú max ~4,5 MB body. Frontend zmenšuje fotky na 1568 px JPEG (~0,2–0,6 MB/ks), takže 3 fotky sa zmestia s rezervou; 4 MB/súbor limit zo spec ostáva ako serverová poistka.

## Akceptačné kritériá (spec v1 §7) — ako overiť

1. **Determinizmus:** ten istý skutok 3× → rovnaké D/N, skóre ±1. (Over po dodaní API kľúča.)
2. **„Vytiahol topiaceho, len text“ → 4 → pásmo 2:** matematika overená unit smoke testom (10×0,8+10×0,2)×1×0,4 = 4 → 2 riadky ✓.
3. **Hrubý rozpor → zamietnuté BEZ otázok:** prompt KROK 1a; UI zobrazí neutrálnu hlášku bez návodu.
4. **Injection:** prompt BEZPEČNOSŤ → `injectionFlag` v logu aj v kalibračnej tabuľke (⚑inj).
5. **Config bez kódu:** zmena čísla v `scoring-config.json` + nová `configVersion` → prompt aj výpočet ju hneď použijú; každý log riadok nesie `config_version`.
6. **Kľúč/prompt sa nedajú vytiahnuť:** kľúč len v env; prompt a config sa nikdy nevracajú v response; `scoring_log` má RLS bez policies; bucket je privátny.

## Druhé kolo („doplnit“)

Odpovede sa pripoja k opisu ako `--- Doplnenie: otázka → odpoveď`, fotky sa pošlú znova (stateless), `kolo: 2`. Ak model povie „doplnit“ aj v 2. kole, backend prepne na „zamietnut — nedoplnené“ (`otazky.max_kola` v configu).

## Čo v teste vedome NIE JE (spec v1 §8)

DEED výplaty a limity · DB kaskáda (Haiku→Sonnet) · feed algoritmus a adaptívny prah · darová krivka · B2B hodnotenie · strojové čítanie EXIF · analýza videa (video sa len ohlási do promptu).
