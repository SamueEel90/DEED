# Architektúra

Mapa kódu pre niekoho, kto repo vidí prvýkrát. Ak hľadáš „kam mám dať nový
kód", odpoveď je skoro vždy v sekcii [Kam čo patrí](#kam-čo-patrí).

Stack: **React 18 + TypeScript + Vite 5 + Supabase + TanStack Query**, PWA cez
`vite-plugin-pwa`, hosting Vercel. Alias `@/` → `src/`.

---

## 1. Štart aplikácie

```
index.html
 └─ src/main.tsx          initPwa() · naplanujPripomienky() · render
     └─ src/app/App.tsx   shell
```

`App.tsx` je jediná „veľká" obrazovka. Robí štyri veci:

1. **Providery** — `QueryProvider`, `PouzivatelProvider`, `PersonalizaciaProvider`,
   `LokalitaProvider` plus kontexty pre galériu, scroll, motív, layout, toasty.
2. **Routing modulov** — stav `modul` (`"good" | "help" | …`) synchronizovaný
   s URL cez `lib/urlnav`.
3. **Lazy loading** — každý modul je `lazy(() => import(...))`, čiže vlastný
   chunk. Initial bundle = shell + prvý modul.
4. **Chrome appky** — `TabBar` (mobil), `Sidebar` (desktop), `PridatFAB`,
   pull-to-refresh, intro sprievodca, upgrade panel.

Moduly dostávajú z App-ky minimum propov — `wide` (desktop layout),
`otvorModul` (prepnutie na iný modul) a prípadne deep-link cieľ.

---

## 2. Navigácia — prečo tu nie je react-router

[`src/lib/urlnav.ts`](../src/lib/urlnav.ts) rieši navigáciu ~200 riadkami
namiesto knižnice, lebo appka má len **dve úrovne**:

| Úroveň | URL | Správanie |
| --- | --- | --- |
| **Modul** | `/m/{id}` | Prepnutie pushne históriu → Back/Forward prepína moduly |
| **Vrstva** | bez URL | Detail, sheet, galéria. Otvorenie pushne „sentinel" záznam; Back zatvorí **najvrchnejšiu** vrstvu, nie appku (Android vzor) |

Jeden globálny `popstate` listener koordinuje obe; vrstvy majú prednosť.
Zatvorenie vrstvy cez UI (✕ / šípka / swipe) sentinel z histórie potichu
odstráni, aby v nej nezostávali diery.

Vrstvu registruješ hookom `useVrstva(otvorene, zatvor)`. Každý sheet a detail,
ktorý sa dá zavrieť, ho má mať — inak Back vyhodí používateľa z appky.

Deep-linky (`/s/…`, `/c/…`, `/r/…`) číta [`lib/deeplink.ts`](../src/lib/deeplink.ts)
a mapuje ich na modul + detail.

---

## 3. Dátová vrstva — jediný švík

Toto je najdôležitejšia konvencia v projekte.

```
komponent
   ↓  useGoodFeed()              ← @/data (hooks.ts, TanStack Query)
   ↓  repo.good.feed()           ← @/data/repo.ts (rozhranie Repo)
   ↓
   ├─ mock:     features/good/mock.ts
   └─ Supabase: data/good.supabase.ts
```

**Pravidlá:**

- Komponent **nikdy** neimportuje mock pole priamo ani nevolá `supabase.from(...)`.
  Vždy hook z `@/data`.
- Prepnutie mock ↔ živá DB sa deje **len** v [`src/data/repo.ts`](../src/data/repo.ts).
  Moduly sa nemenia.
- Query kľúče sú centrálne v objekte `qk` v [`data/hooks.ts`](../src/data/hooks.ts).
  Nová query = nový kľúč tam, nie inline string — inak sa nedá invalidovať.

**Čo je dnes reálne napojené:** registrácia, osobné funkcie (správy, nahlásenia,
RSVP, obľúbené, peňaženka), príspevky modulu Viera, AI skóre. Zvyšok beží
na mocku.

Prepínač je `USE_SUPABASE` v [`lib/supabase.ts`](../src/lib/supabase.ts) — je
`true`, len ak sú nastavené kľúče **a zároveň** `VITE_USE_MOCK` nie je zapnuté.
Keď je `false`, `supabase` je `null` a všetky `supabase?.` guardy sa stanú no-op.

---

## 4. Dizajnový systém

| Súbor | Obsah |
| --- | --- |
| [`src/index.css`](../src/index.css) | CSS premenné pre motív — `:root` = svetlý, `html.dark` = tmavý |
| [`src/theme.ts`](../src/theme.ts) | `C` (farby cez `var(--c-*)`), gradienty, `inp`, `btn`, glass štýly |
| [`src/tokens.ts`](../src/tokens.ts) | `SPACE`, `RADIUS`, `TYPE`, `SHADOW`, `MOTION` — re-exportované z `@/theme` |

**Svetlý motív je primárny.** Paleta je „warm earthy" — teplý sand papier,
espresso text, tlmené zemité akcenty. Tmavý je sekundárny (`html.dark`).

Kritické pravidlo: **nikdy nepíš farbu natvrdo.** Štruktúrne farby (pozadie,
povrchy, linky, text) sa medzi motívmi prepínajú; hardcoded `#fff` alebo
`rgba(255,255,255,.1)` rozbije svetlý režim. Používaj `C.*` a `rgba(var(--glass-rgb), …)`.

Akcenty (`--a-green`, `--a-info`, …) sú theme-aware — v svetlom sú stmavené
na WCAG AA kontrast, v tmavom rozjasnené.

---

## 5. Anatómia modulu

Každý modul v `src/features/<modul>/` má rovnaký tvar:

```
features/good/
  Good.tsx        default export = obrazovka modulu (screen switch vnútri)
  mock.ts         mock dáta pre dátovú vrstvu
  utils.ts        pomocné funkcie špecifické pre modul (voliteľné)
```

Vnútri modulu sa medzi obrazovkami (feed → detail → pod-obrazovka) prepína
lokálnym stavom `screen` a komponentom `ScreenSwitch`, nie routerom.

**Detail príspevku je vždy jeden stĺpec** vo všetkých moduloch — rovnaká
anatómia. Dvojstĺpcový layout (`DvaStlpce`) je vyhradený pre profily entít
(farnosť, charita, firemný profil).

---

## 6. Zdieľané komponenty

`src/components/` (46 súborov) sa exportuje cez barrel `components/index.ts`.
`src/shared.tsx` je tenký re-export nad ním (`export * from "@/components"`),
takže `@/shared` aj `@/components` vedú na to isté. Moduly importujú z `@/shared`.

Pred písaním nového UI sa pozri, či už neexistuje:

| Potrebuješ | Použi |
| --- | --- |
| Platobná sekcia (sumy, QR, reťaz, obľúbené) | `<PlatobnyModul>` — **nie** `PodporaSekcia` priamo |
| Hlavička modulu / detailu | `ModulHlavicka`, `BackHeader`, `Hlavicka` |
| Bottom sheet | `Sheet` (vaul) — už rieši desktop cap na šírku čítania |
| Feed karta, mriežka, stĺpce | `FeedCard`, `FeedGrid`, `FeedStlpce` |
| Stavy zoznamu | `FeedSkeleton`, `EmptyState`, `ErrorState` |
| Foto, video, galéria | `Foto`, `FotoPrispevku`, `Video`, `MiniFotky`, `useGaleria` |
| QR | `QrModal`, `SplitQrSheet` |
| Štít / karma badge | `<Stit>` — **nikdy** progress bar ani percentá |
| Toast, oslava | `toast()`, `Oslava` |

Dve pravidlá, ktoré sa ľahko porušia:

- **Štíty nemajú progres.** Badge = štít + text, nikdy percentá ani bar.
- **Overlaye mimo `obal`** treba capnúť na `SIRKA.citanie` a vycentrovať,
  inak sa na desktope roztiahnu cez celú plochu. Zdieľaný `Sheet` to už rieši.

---

## 7. Serverless API

`api/` sú Vercel funkcie (nie súčasť Vite buildu). V dev-e ich obsluhuje
[`scripts/apiDevPlugin.ts`](../scripts/apiDevPlugin.ts), takže `npm run dev`
ich má tiež.

| Endpoint | Čo robí |
| --- | --- |
| `POST /api/score` | AI hodnotenie skutku cez Anthropic Opus |
| `GET /api/score-log` | Kalibračná tabuľka behov (+ `?format=csv`) |

Prompt a kalibračné čísla žijú **len na backende** (`api/_lib/prompt.ts`,
`api/_lib/scoring-config.json`) a sú dôvod, prečo musí repo ostať privátne.
Detaily: [AI_SKORE_SETUP.md](AI_SKORE_SETUP.md).

Bez `ANTHROPIC_API_KEY` beží hodnotenie v mock režime — appka funguje ďalej.

---

## 8. Databáza

`supabase/migrations/` — 59 migrácií (stav 6. 10. 2026, posledná `0059`), aplikujú sa
v poradí podľa názvu súboru (číslo je poradie, nie dátum; číslovanie má medzery —
`0024`, `0051`, `0052` neexistujú, `0038` je rezervovaná — a doplnkové migrácie typu `0014c`, `0018b`).
Pokrývajú registráciu, obsahovú doménu, QR systém, payment engine, escrow, badge/chain,
osobné funkcie, storage príspevkov, zbierky, scoring log, identitu, ledger, overenia,
poplatky, väzby zamestnancov a dorovnanie.

- **Pravidlo:** pushnutá migrácia sa nikdy nemení, každá zmena = nová migrácia.
- **CI** (`.github/workflows/ci.yml`, job `db`) postaví čistú Postgres DB zo všetkých
  migrácií v poradí (`scripts/db-z-migracii.sh`) a pustí DB testy zo `supabase/tests/`.
  Spadne aj na kolízii čísel (dve migrácie s rovnakým číslom).
- Minimálne prostredie Supabase pre CI (roly, `auth`, `storage`) je v
  `supabase/ci/supabase_stub.sql` — v ostrej Supabase sa nespúšťa.
- Lokálne: `PGHOST=… PGUSER=… bash scripts/db-z-migracii.sh` (Postgres 16 s `pg_cron`).

---

## 9. Kam čo patrí

| Pridávaš | Kam |
| --- | --- |
| Novú obrazovku v existujúcom module | `features/<modul>/` + vetva v `ScreenSwitch` |
| Nový modul | `features/<novy>/`, lazy import + vetva v `App.tsx`, položka vo `VSETKY_MODULY` |
| UI použiteľné vo viac moduloch | `components/` + export v `components/index.ts` |
| Logiku bez UI (výpočet, formát, storage) | `lib/` |
| Nové čítanie/zápis dát | metóda do `Repo` v `data/repo.ts` + hook v `data/hooks.ts` |
| Farbu, spacing, radius | `theme.ts` / `tokens.ts` — nikdy inline hodnotu |
| Doménový typ | `types/` |
| Zmenu DB schémy | nová migrácia v `supabase/migrations/` |

---

## 10. Známe kompromisy

Aby si nestrácal čas hľadaním, či je to zámer alebo chyba:

- **Modul `nabozenstvo` sa v UI volá „Viera".** ID modulu, DB kľúče (`naboz_*`)
  aj priečinok `features/viera/` ostali z pôvodného názvu. Premenovanie by
  vyžadovalo migráciu.
- **`shared.tsx` je len tenký barrel** nad `components/index.ts`. Existuje,
  aby staré importy `@/shared` fungovali.
- **Inline štýly namiesto CSS/tailwindu.** Celá appka štýluje cez `style={{}}`
  s tokenmi z `@/theme`. Je to zámer (jeden zdroj pravdy pre motív), nie
  nedokončená migrácia.
- **Žiadne testy.** Overuje sa manuálne cez build + preview + headless Chrome —
  postup v `.claude/skills/verify/SKILL.md`.
- **`noImplicitAny: false`** v `tsconfig.json`. Preto ~96 `any` warningov
  z ESLintu. Sprísnenie je v ROADMAP-e.
