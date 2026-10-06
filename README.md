# DEED

[![CI](https://github.com/SamueEel90/DEED/actions/workflows/ci.yml/badge.svg)](https://github.com/SamueEel90/DEED/actions/workflows/ci.yml)

Platforma dobra — dobré skutky, darcovstvo a vzájomná pomoc. React SPA (PWA)
so Supabase backendom a serverless funkciami na Verceli.

**Stack:** React 18 · TypeScript · Vite 5 · Supabase · TanStack Query · PWA

> **Repozitár musí ostať privátny.** `api/_lib/prompt.ts` obsahuje produkčný
> SYSTEM prompt pre AI hodnotenie skutkov a `api/_lib/scoring-config.json`
> jeho kalibračné parametre. Mechanika je verejná, parametre nie —
> viď [docs/AI_SKORE_SETUP.md](docs/AI_SKORE_SETUP.md).

---

## Rýchly štart

```bash
npm ci
cp .env.example .env.local     # a nastav VITE_USE_MOCK=1 (viď nižšie)
npm run dev                    # http://localhost:5173
```

Na prvé spustenie **netreba Supabase** — s `VITE_USE_MOCK=1` beží celá appka
na mock dátach z `src/features/*/mock.ts`. Žiadna sieť, žiadne CORS chyby.

Node ≥ 20.19 (verzia je v `.nvmrc`; `nvm use` si ju vezme sám).

---

## Príkazy

| Príkaz | Čo robí |
| --- | --- |
| `npm run dev` | Dev server s HMR (port 5173) |
| `npm run build` | `tsc --noEmit` + produkčný build do `dist/` |
| `npm run preview` | Servíruje `dist/` (port 4173) |
| `npm run typecheck` | Len TypeScript kontrola |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint s automatickými opravami |
| `npm run format` | Prettier — naformátuje súbory |
| `npm run format:check` | Prettier — len skontroluje |
| `npm run smoke` | Build + smoke test v prehliadači |
| **`npm run verify`** | **typecheck + lint + build + smoke — spusti pred každým pushom** |

`npm run verify` je presne to, čo beží v CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)).

Smoke test potrebuje jednorazovo stiahnuť prehliadač:

```bash
npx playwright install chromium
```

Otvorí každý modul aj detail príspevku v skutočnom Chromiu a spadne, keď sa
niečo nevykreslí alebo vyhodí chybu do konzoly. Chytí presne tú triedu
regresií, ktorú typecheck prejde — odstránený prop, zlý import v lazy chunku,
chyba v efekte.

---

## Premenné prostredia

Frontend číta `VITE_*` premenné z `.env.local` (negitované, šablóna je
v [.env.example](.env.example)).

| Premenná | Načo |
| --- | --- |
| `VITE_SUPABASE_URL` | URL Supabase projektu |
| `VITE_SUPABASE_ANON_KEY` | Anon (public) kľúč |
| `VITE_USE_MOCK` | `1` = appka ide 100 % na mock dátach, Supabase sa vôbec nevolá |

**Ako to spolu funguje** ([src/lib/supabase.ts](src/lib/supabase.ts)):

- Chýba URL alebo kľúč → `supabase === null`, appka beží ďalej na mocku.
- `VITE_USE_MOCK=1` → to isté, ale vynútene (aj keď je backend nakonfigurovaný).
- Oboje splnené a `VITE_USE_MOCK=0` → živá DB.

Vďaka tomu appka nikdy nespadne na nedostupnom backende, len stratí perzistenciu.

Serverless funkcie v `api/` majú vlastné premenné (`ANTHROPIC_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SCORING_ADMIN_TOKEN`) — nastavujú sa vo Verceli,
zoznam je v [docs/AI_SKORE_SETUP.md](docs/AI_SKORE_SETUP.md).

---

## Čo je v repe

```
src/
  main.tsx              vstupný bod — PWA init, pripomienky, render
  app/App.tsx           shell: routing modulov, providery, layout, lazy chunky
  components/           zdieľané UI (~48 súborov, barrel v index.ts)
  features/<modul>/     obrazovky modulov + ich mock dáta
  data/                 dátová vrstva — repo.ts (rozhranie) + hooks.ts (React Query)
  lib/                  logika bez UI — auth, qr, feed, urlnav, personalizácia…
  types/                doménové typy
  theme.ts, tokens.ts   dizajnový systém (farby + škály)
api/                    Vercel serverless funkcie (AI hodnotenie skutkov)
supabase/migrations/    SQL migrácie (26 súborov, 0001–0023 + doplnky)
scripts/                seed skripty + dev plugin pre /api
docs/                   architektúra, špecifikácie, biznis podklady
```

Podrobná mapa kódu vrátane dátového toku a konvencií:
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Moduly

Appka je poskladaná z modulov, ktoré si používateľ dáva do spodného menu
(max 5, zvyšok cez „Viac"). Definícia je v [src/components/TabBar.tsx](src/components/TabBar.tsx).

| ID v kóde | Názov v UI | Obsah |
| --- | --- | --- |
| `good` | Domov | Feed dobrých skutkov |
| `help` | Help | Crowdfunding pre ľudí v núdzi |
| `charita` | Charita | Zbierky, dobrovoľníctvo, adresár OZ |
| `nabozenstvo` | Viera | Adresár kostolov a farností, cirkevné zbierky |
| `vyzva` | Aktivity | Skutky, talenty, workshopy v okolí |
| `mapa` | Mapa | Pomoc a skutky v okolí (Leaflet) |
| `top` | Top | Rebríčky darcov a hrdinov |
| `skore` | AI Skóre | Testovací modul hodnotenia skutkov (reálny Opus) |
| `profil` | Profil | Karma, peňaženka, nastavenia |

> **Pozor na `nabozenstvo`.** Modul bol premenovaný na „Viera" len v UI —
> ID modulu, kľúče v DB (`naboz_*`) aj priečinok `src/features/viera/` ostali.
> Nepremenúvaj ich bez migrácie.

---

## Nasadenie

Hosting je Vercel ([vercel.json](vercel.json)): SPA rewrite na `index.html`,
funkcie v `api/**` s `maxDuration` 60 s.

- **Frontend** — `npm run build` → `dist/`.
- **Migrácie** — `supabase/migrations/` sa aplikujú v poradí. Číslo v názve
  je poradie, nie dátum.
- **Env premenné** — nastav vo Vercel → Settings → Environment Variables
  (`VITE_*` pre build, ostatné pre funkcie).

---

## Bezpečnosť — čítaj pred prvým reálnym používateľom

**RLS politiky sú zámerne otvorené a takto sa nesmie ísť do produkcie.**

Databáza má dnes v 10 migráciách politiky typu `test_all_access using (true)`,
teda každý riadok je čitateľný aj zapisovateľný pre kohokoľvek.

Prečo je to problém: `VITE_SUPABASE_ANON_KEY` je **verejný kľúč** — ide
v každom frontend bundle a ktokoľvek si ho vie prečítať zo zdrojáku nasadenej
appky. To je v poriadku len vtedy, keď prístup obmedzuje RLS. Kým je v DB len
testovací obsah, nič sa nedeje. V momente, keď pribudne prvý reálny
používateľ, je to únik osobných údajov.

Čo treba spraviť pred ostrou prevádzkou:

- nahradiť `test_all_access` owner-only politikami (`ucet` cez
  `auth_id = auth.uid()`, child tabuľky cez `ucet_id in (select id from ucet …)`,
  obsah verejný len na `SELECT`),
- znova zapnúť „Confirm email" v Supabase → Authentication (pre dev bol vypnutý),
- presunúť tvorbu `ucet` na server,
- prejsť `get_advisors` (dnes hlási očakávaných 25 warningov).

Podrobnosti sú vo Fáze 5 v [ROADMAP.md](ROADMAP.md).

Ďalšie dve veci, na ktoré netreba zabudnúť:

- **`SUPABASE_SERVICE_ROLE_KEY` obchádza RLS úplne.** Patrí len do premenných
  serverless funkcií, nikdy nie do `VITE_*` a nikdy nie do frontendu.
- **Repozitár musí ostať privátny** kvôli `api/_lib/prompt.ts`
  a `api/_lib/scoring-config.json`.

---

## Stav projektu

Appka je **funkčný produktový prototyp**, nie hotový produkt. Konkrétne:

- **Dáta sú prevažne mock.** Napojené na Supabase sú registrácia, osobné
  funkcie (správy, RSVP, obľúbené, peňaženka), príspevky Viery a AI skóre.
  Zvyšok modulov beží na `features/*/mock.ts` — švík na výmenu je jediný
  súbor [src/data/repo.ts](src/data/repo.ts).
- **Platby sú simulované.** Žiadny reálny platobný provider, peniaze cez
  DEED netečú. Právne dôvody sú v
  [docs/business/DEED_Pravna_Analyza_ZHRNUTIE_v1.md](docs/business/DEED_Pravna_Analyza_ZHRNUTIE_v1.md).
- **KYC/KYB a SMS vendori sú mockovaní.**
- **Žiadne unit testy.** Jediná automatická kontrola správania je smoke test
  (`npm run smoke`) — overí, že sa moduly a detaily vykreslia bez chýb.
  Všetko ostatné sa overuje manuálne, postup je
  v [.claude/skills/verify/SKILL.md](.claude/skills/verify/SKILL.md).
- **199 lint warningov** (stav 6. 10. 2026, 0 errorov) — prevažne `any` na hraniciach k Supabase a nové
  React-Compiler odporúčania. Nie sú to chyby v bežiacej appke; rozpis
  a plán je v [ROADMAP.md](ROADMAP.md). Číslo sa má s každou zmenou znižovať, nie rásť.

Plán ďalších krokov: [ROADMAP.md](ROADMAP.md).

---

## Ako prispievať

Konvencie, štýl kódu a pracovný postup: **[CONTRIBUTING.md](CONTRIBUTING.md)**.
