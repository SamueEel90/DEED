# DEED — Konsolidovaná analýza, vízia a plán zlepšení

> **Dátum:** 2026-07-08 · **Zdroje:** všetky MD/DOCX špecifikácie v repe (Help ×3, QR ×2, Payment Engine, Náboženstvo ×5, backend-content-design, qr-system), ROADMAP.md, reálny stav kódu (`src/`, ~104 TS/TSX súborov, ~20 000 riadkov) a DB (21 migrácií, ~40 tabuliek).
> **Ako používať:** sekcie 1–2 = čo DEED je a čo už stojí. Sekcia 3 = audit s dôkazmi (file:line). Sekcie 4–5 = konkrétne kroky — každá **vlna** je samostatne zadateľná úloha. Sekcia 6 = odporúčané poradie.

---

## 1 · Vízia produktu

### 1.1 Čo je DEED

Slovenská **„platforma dobra"** — sociálna appka pre dobré skutky, darcovstvo a vzájomnú pomoc. DNA celej platformy: **„Skutky, nie reči."** Je to zámerný anti-Facebook: **nikde nie sú komentáre** (železné pravidlo), len štruktúrované akcie — palec/srdiečko · zdieľať · zúčastním sa · prispieť · Overujem/Namietam. Žiadna voľná diskusia → žiadne vojny v komentároch.

### 1.2 Pre koho

| Segment | Čo v DEED robí |
|---|---|
| Bežní ľudia | darujú aj žiadajú o pomoc (peer-to-peer, finančná aj „ľudská" — odvoz, doučovanie, opatera) |
| Dobrovoľníci | prepínač „dobrovoľníčim" + tagy schopností, brigády, VTO |
| Charity / OZ | zbierky, recurring podpora, fiškálny sponzor, adresár |
| Cirkvi a farnosti | modul Náboženstvo — donation-first farské profily, omšové zbierky, QR na kostole |
| Firmy / B2B | odznaky zamestnancov (shift-binding), firemné dobrovoľníctvo, agregát pochvál |
| Influenceri / tvorcovia | Split QR (honorár ↔ charita), Reťaz dobra |
| Nezbankovaní / globálny tok | mikro-dary cez DEED token (0,1–0,5 €), gasless |

### 1.3 Hodnotová propozícia

1. **Dôvera a transparentnosť** — „systém je tvoj svedok": jednotný výpis na cent, doklady o použití, verejná tvár žiadateľa = sociálna kontrola.
2. **Friction by design** — trenie aj dosah rastú so sumou (pásma 100–500 / 500–1000 / 1000–2400 / 2400+ €); dosah sa **zaslúži** (doklady alebo 3 komunitné overenia), nekupuje.
3. **Mikro-dary ekonomicky možné** — DEED token na Base L2 (ERC-4337, gasless) + batch zúčtovanie 24 h; dar 0,1 € má zmysel, do 0,5 € s **0 % maržou**.
4. **Anti-fraud vrstvene** — KYC/KYB + AI sito + komunitné Overujem/Namietam + escrow + prísny režim pri zraniteľných.
5. **Non-custody** — platforma sa peňazí nikdy nedotkne (žiadna PI licencia); FIAT cez procesor, veľké sumy cez fiškálneho sponzora, cirkvi vždy € (off-ramp).
6. **Karma = úroveň, nie číslo** (Bronze→Legend) a patrí **ľuďom, nie inštitúciám** — organizácie majú len badge „overená".

### 1.4 Architektonický princíp: jeden engine, viac šošoviek

Nový modul = konfigurácia/kópia nad zdieľanými vrstvami, nie nový vývoj:

| Zdieľaná vrstva | Kde žije | Konzumujú |
|---|---|---|
| Payment Engine (platba/batch/split/escrow/recurring/poplatky) | DB `0014`–`0018b` + [src/lib/poplatky.ts](src/lib/poplatky.ts), [src/data/platby.supabase.ts](src/data/platby.supabase.ts) | všetky moduly cez `PlatbaModal` |
| QR systém (odkazové + rotujúce TOTP + split + badge) | DB `0013/0015/0017/0018` + [src/lib/qr.ts](src/lib/qr.ts), [src/data/qr.supabase.ts](src/data/qr.supabase.ts) | Good, Help, Charita, Náboženstvo, Profil, Reťaz |
| Feed logika (rádius, hustota, frequency cap, veľkosť karty) | [src/lib/feed.ts](src/lib/feed.ts), [src/lib/cardSize.ts](src/lib/cardSize.ts) | Good, Help, Charita, Aktivity |
| Overujem/Namietam (komunitná pravosť) | per-modul UI, pravidlo z Help špeky | Good, Help, Náboženstvo (len Help prípady) |
| Profil / peňaženka / karma | features/profil + `v_vypis`/`v_zostatok` | všetky |
| Reťaz dobra / Split | [src/components/splitqr.tsx](src/components/splitqr.tsx), `qr_split*` RPC | Good, Charita, Náboženstvo, Retaz |

**Moduly-šošovky:** Good (domov — skutky) · Help (P2P pomoc, dopyt/ponuka) · Charita (zbierky + adresár) · Aktivity (Šport/Art/Learn/Eko/Zdravie) · Náboženstvo (adresár cirkví SR + farnosti, opt-in, mimo karmy, €-only) · Top (rebríčky) · Mapa · Notifikácie · Reťaz dobra · Fun zóna · Cudzí profil · Registrácia (Osoba/Charita, auth-first).

Ďalšie prierezové pravidlá vízie: mäkké steny (default vidíš svoje, hľadanie nájde všetko), obsahová hranica ČO (verejné moduly) vs PREČO (Náboženstvo), interné ID = kotva auditu, ochutnávka daru do 10 € bez registrácie, SEPA 0 % + dobrovoľný nikdy-nepredzaškrtnutý tip (Zeffy model).

---

## 2 · Aktuálny stav — čo je postavené

### 2.1 Tech stack

React 18.3 · TypeScript (strict, ale `noImplicitAny:false`) · Vite 5.4 · TanStack Query 5 + Virtual 3 · Supabase JS 2.45 (Auth + PostgREST + Realtime) · motion 12 (LazyMotion) · vaul (sheety) · sonner (toasty) · Radix (tabs, tooltip — tooltip zatiaľ nepoužitý) · Leaflet (mapa bez API kľúča) · qrcode + zxing (generovanie/skenovanie QR). Nasadenie: Vercel (SPA rewrite). Prepínač `VITE_USE_MOCK` = celá appka beží offline na mockoch.

### 2.2 Architektúra frontendu

- **Repo seam** — [src/data/repo.ts](src/data/repo.ts): rozhranie `Repo` + mock impl + per-modul selektor mock|supabase. UI nikdy nečíta mock polia priamo; hooky v [src/data/hooks.ts](src/data/hooks.ts). Najlepšie navrhnutá časť appky.
- **Zdieľané komponenty** — [src/components/](src/components/): `FeedCard` (jednotná IG karta všetkých feedov), `Sheet` (Vaul, focus-trap), `pressable()`, `SegTabs`, `VirtualList` (threshold 60), `states.tsx` (Skeleton/Empty/Error+retry), UI kit (`Button/Input/Switch/BackHeader/ProgresBox`), `PlatbaModal`+`PodporaSekcia`, `QrModal`/`SplitQrSheet`, `PullToRefresh`, `SwipeBack`, ~45 SVG ikon.
- **Dizajn systém** — CSS vars v [src/index.css](src/index.css) (svetlý = primárny, `.dark` na `<html>`), akcenty `--a-*` ladené na WCAG AA v oboch módoch, tokeny `SPACE/RADIUS/TYPE/SIRKA` v [src/tokens.ts](src/tokens.ts). Štýly = 100 % inline objekty (žiadne CSS moduly).
- **Navigácia** — bez routera: `useState<ModulId>` v [src/app/App.tsx:127](src/app/App.tsx#L127), plávajúci dock `TabBar` (max 5 pripnutých modulov), „Viac" sheet, na desktope `Sidebar`. Sub-navigácia per modul = lokálny `screen` string + `ScreenSwitch`/`SwipeBack`. Deep-linky `/c /@ /o /r /split /badge /chain` rieši [src/lib/deeplink.ts](src/lib/deeplink.ts) pri boote.
- **Auth** — reálny Supabase Auth (email/heslo), auth-first onboarding, pasívny vstup bez účtu (ephemeral), demo vstup; boot gate splash → `resolveSession()`.

### 2.3 Stav modulov

| Modul | Dáta | Zrelosť / poznámka |
|---|---|---|
| Good (domov) | Supabase | feed+detail+add wizard; `Good.tsx` **1054 r.** — najväčší monolit |
| Help | Supabase | v3 tvorba dopyt/ponuka z 3 DOCX hotová (pásma, prísny režim, escrow chips — mock mechaniky) |
| Charita | Supabase | feed + adresár + recurring (reálne RPC) + Split QR |
| Aktivity | Supabase | 5 domén, feed+detail+add+nástenka |
| Top | Supabase | živé rebríčky z toku podpôr |
| Notifikácie | Supabase + realtime | zvonček všade, kategórie, tiché hodiny |
| Mapa | Supabase | Leaflet, haversine počty; **bez loading/error stavov** |
| Profil | mix | identita reálna; peňaženka/karma = display placeholdery (`v_vypis`/`v_zostatok` hooky pripravené) |
| Náboženstvo | **mock** | v1.2 + delta (adresár-first, farský profil, kalendár omší, „+" strom); **mimo repo seamu** |
| Registrácia | Supabase | OsobaFlow/CharitaFlow 8 krokov, vendori (SMS/KYC/KYB) mock |
| Reťaz dobra / Moje QR | mix | chain/split QR reálne RPC; žiadosti mock |
| Cudzí profil, Fun zóna | mock | prototypy |

### 2.4 Backend (Supabase, projekt `wnxisnglzrahculmqqfz`)

- **Identita** `0001–0002` (19 tabuliek: ucet, profil, organizacia, kyc…, číselníky 47 záujmov / 91 segmentov) + **auth link** `0012`.
- **Obsah** `0003–0011`: `prispevok` (univerzálny skutok/žiadosť/zbierka…), `udalost`, `podpora` (event-log), `sledovanie`, `notifikacia` (realtime), `adresar_charita` + seedy generované z mockov ([scripts/](scripts/)).
- **Payment Engine** `0014*`: `platba` = system-of-record, batch 24 h (pg_cron 02:00), split, escrow, recurring (len charity, cron 03:00), poplatky server-side, views `v_vypis`/`v_zostatok`.
- **QR** `0013/0015/0017/0018*`: `qr_kod` resolver, TOTP dochádzka (HMAC, anti-replay), odznaky + pochvaly (k-anonymita, cron unbind 04:00), `qr_split` (N príjemcov, % fixné pri vzniku).
- **Zámerne mock** (per ROADMAP — nie je predmetom zlepšení): reálne KYC/KYB (Didit), SMS brána, blockchain settlement, AI hodnotenie žiadostí. RLS = 25× test-only `using(true)` — vedomý dlh Fázy 5.

---

## 3 · Audit — senior FE / aplikačný inžinier

**Celkový verdikt:** appka má **výborné základy** — čistý repo seam, jednotný kartový systém, premyslené a11y primitívy (pressable, SegTabs, Vaul, states, reduced-motion, AA kontrast), code-splitting, netriviálny reálny platobný backend. Problém nie je kvalita primitívov, ale **neúplný rollout** naprieč obrazovkami a **chýbajúce prierezové vrstvy**: URL navigácia, PWA, sémantické HTML (landmarks/formuláre), testy a lint. Presne tam smerujú vlny v sekcii 4.

Priority: **P0** = blokuje reálnych používateľov / zásadná strata dôvery · **P1** = výrazný dopad na UX/a11y · **P2** = kvalita/robustnosť · **P3** = kozmetika/dlh.

### 3.1 Pochopiteľnosť & UX pre end usera

| P | Zistenie | Dôkaz |
|---|---|---|
| **P0** | **Žiadne URL/história.** Prepínanie modulov je `useState` — browser Back appku opustí, refresh vždy pristane na Good, obrazovku nejde poslať linkom (okrem QR deep-linkov). Na webe to láme základné očakávania. | [src/app/App.tsx:127](src/app/App.tsx#L127) |
| **P1** | **3 z 8 modulov sú na mobile neviditeľné** — default dock má 5 tabov (good, vyzva, help, charita, profil); Mapa, Náboženstvo a Top existujú len vo „Viac" sheete, o ktorom nový user nevie. | [src/components/TabBar.tsx:25,36](src/components/TabBar.tsx#L25) |
| **P1** | **Žiadne prvé-spustenie vedenie** — po registrácii user padne do feedu bez vysvetlenia karmy, pásiem, okruhov, Overujem/Namietam. `@radix-ui/react-tooltip` je v závislostiach, ale nikde nepoužitý → v appke nie je jediný tooltip. | package.json vs `grep` 0 hitov |
| **P1** | **Mŕtvy koniec: „Zabudnuté heslo?"** — len toast „pripravujeme". Reálny user s dorobeným účtom sa nevie vrátiť dnu. | [src/features/registracia/AuthPage.tsx:130](src/features/registracia/AuthPage.tsx#L130) |
| **P2** | **Mapa nemá loading/error/empty stav** — pri pomalej sieti ticho ukazuje nuly; `states.tsx` existuje, len tu nie je nasadený. | [src/features/mapa/Mapa.tsx:65-72](src/features/mapa/Mapa.tsx#L65) |
| **P2** | Bez stavov sú aj CudziProfil, RetazDobra, MojeQrKody, FunZona (mock je instantný, ale po napojení na DB „prázdny flash"). | grep `states` |
| **P3** | Deep-link pristane na module, nie na presnom detaile položky. | [src/lib/deeplink.ts](src/lib/deeplink.ts) |

Silné stránky: 4-stavový vzor (loading/empty/error+retry/data) v 6 moduloch je vzorový ([src/features/good/Good.tsx:217-232](src/features/good/Good.tsx#L217)); jazyk konzistentne slovenský; inline validácie vo formulároch registrácie; PullToRefresh + infinite batching zadarmo pre všetky feedy.

### 3.2 Prístupnosť

| P | Zistenie | Dôkaz |
|---|---|---|
| **P0** | **Hlavný navigačný sheet „Viac" nie je dialóg** — obyčajný `<div onClick=close>`: žiadny `role="dialog"`, focus-trap, Escape; vnútri ~10 klikacích divov/spanov bez klávesnice (Upraviť menu, akcie stránky, Peňaženka, šípky poradia). Klávesnicový/SR user sa k 3 skrytým modulom nedostane vôbec. | [src/components/TabBar.tsx:152-264](src/components/TabBar.tsx#L152) |
| **P0** | **Žiadne `<form>`/`<label htmlFor>`/Enter-submit v celej appke** (grep: 0 hitov) — login aj 8-kroková registrácia sa nedá odoslať Enterom, popisky polí nie sú asociované (screen reader číta len placeholder). | [src/features/registracia/AuthPage.tsx:192](src/features/registracia/AuthPage.tsx#L192) |
| **P1** | **Rollout `pressable()` neúplný:** ~81 použití v 23 súboroch vs ~350 `onClick` v 41 súboroch; ≥95 raw klikacích divov — najviac Profil (16), platba.tsx (16), Good (14), Charita (11), Aktivity (11), TabBar (7), CudziProfil (4, žiadny pressable). | grep naprieč `src/` |
| **P1** | **FeedCard = neplatné vnorené interaktívne prvky** — celá karta je `pressable` (role=button), ale avatar a meno autora vnútri majú vlastný raw `onClick` (myš-only): button v buttone, klávesnicou sa na profil autora nedá dostať. | [src/components/feedcard.tsx:107,121,125](src/components/feedcard.tsx#L107) |
| **P1** | **Žiadne landmarks ani `<h1>`** — app shell nemá `<main>/<nav>/<header>`; jediný modul s landmarkmi je Profil. Vizuálne nadpisy sú štýlované divy → SR navigácia po nadpisoch/regiónoch nefunguje. | [src/app/App.tsx](src/app/App.tsx), grep `<h1` = 0 |
| **P1** | **Obsahové obrázky bez alt** — jediný `<img>` v appke má natvrdo `alt=""`; všetky fotky zbierok/skutkov/kostolov sú pre SR neviditeľné. | [src/components/media.tsx:28](src/components/media.tsx#L28) |
| **P2** | Notifikačný overlay: Escape má, ale bez focus-trapu/role/focus-restore (priznané v komentári). | [src/features/notifikacie/Notifikacie.tsx:60](src/features/notifikacie/Notifikacie.tsx#L60) |
| **P2** | `autocomplete` len na AuthPage — telefón, meno, adresa, IBAN v registrácii/Help bez neho. | [src/features/registracia/RegKit.tsx:300](src/features/registracia/RegKit.tsx#L300) |

Silné stránky: `SegTabs` (radiogroup + roving tabindex + šípky), `Switch`/`role=switch`, Lightbox (dialog + focus-restore + klávesnica), `:focus-visible` prstenec, `prefers-reduced-motion` v CSS aj MotionConfig, sonner aria-live, Vaul focus-trap — **primitívy sú hotové, treba ich len dotiahnuť všade**.

### 3.3 Responzivita & mobil

| P | Zistenie | Dôkaz |
|---|---|---|
| **P1** | **Safe-area ignorovaná** — `viewport-fit=cover` je zapnuté, ale `env(safe-area-inset-*)` používa jediné miesto (Sheet). Plávajúci dock (`bottom:10`) a FAB kolidujú s iOS home indicatorom. | [src/components/TabBar.tsx:66,85](src/components/TabBar.tsx#L66), [src/components/sheet.tsx:81](src/components/sheet.tsx#L81) |
| **P1** | **Dotykové ciele pod 44 px (WCAG 2.5.5):** Switch 40×23, notif Toggle 42×25, šípky poradia 28×28, BackChip 32×32, Lightbox zatvoriť 36×36, pager dots 7 px. | [src/components/ui.tsx:64,76](src/components/ui.tsx#L64), [src/components/TabBar.tsx:264](src/components/TabBar.tsx#L264), [src/components/media.tsx:176,211](src/components/media.tsx#L176) |
| **P2** | **Resize listener bez throttlingu** — `setState` na každý resize event re-renderuje App + všetkých ~30 konzumentov `useLayout()` počas ťahania okna. | [src/app/App.tsx:59-63](src/app/App.tsx#L59) |
| **P2** | Layout 100 % závislý na JS breakpointoch (žiadne CSS `@media` pre layout) — do prvého výpočtu JS je stĺpec zlý; `wide` sa duplicitne posiela propom aj kontextom. | [src/app/App.tsx:81-82](src/app/App.tsx#L81) |

Silné stránky: centrovaný stĺpec 560/1180 (`SIRKA` tokeny), viacstĺpcové feedy `FeedGrid`/`FeedStlpce`, desktop side-nav (Sidebar + ProfilDesktop + Náboženstvo 2-panel), `100dvh` fallback, 16px inputy proti iOS zoomu, responzívny `srcSet` na fotkách.

### 3.4 Výkon

| P | Zistenie | Dôkaz |
|---|---|---|
| **P2** | **Žiadny `React.memo`** v celej appke; feed karty sa re-renderujú pod 10+ vnorenými providermi — znásobené unthrottled resizom. | grep `React.memo` = 0; [src/app/App.tsx:101-120](src/app/App.tsx#L101) |
| **P2** | **Virtualizácia obchádza viacstĺpcové feedy** — `VirtualList` beží len na 1-stĺpcových zoznamoch (notifikácie, hľadanie, single feed); desktop `FeedGrid cols=3` a `FeedStlpce` renderujú všetky karty. | [src/features/good/Good.tsx:224](src/features/good/Good.tsx#L224) |
| **P2** | **Content fotky z Unsplash CDN** — externá závislosť pre celý vizuálny obsah (offline/perf/privacy); srcSet aspoň je. | [src/theme.ts:83](src/theme.ts#L83) |
| **P3** | Mŕtva závislosť `@radix-ui/react-tooltip`; osirelé `eslint-disable` direktívy bez nainštalovaného ESLintu. | package.json |

Silné stránky: všetkých 7+ modulov lazy + Suspense, vendor chunky (react/motion/data), LazyMotion strict, zxing skener lazy, `loading="lazy"` obrázky, `useDeferredValue` hľadanie, TanStack Query cache + retry s backoffom.

### 3.5 Kvalita kódu & infra

| P | Zistenie | Dôkaz |
|---|---|---|
| **P1** | **Nula testov, nula lintu, nula CI** — jediná brána je `tsc --noEmit` v builde. Pri ~20 000 riadkoch a reálnych platbách je to najväčšie inžinierske riziko. | package.json |
| **P2** | **8 monolitov > 590 riadkov** (Good 1054, CharitaFlow 889, Help 856, Aktivity 845, OsobaFlow 763, Nabozenstvo 668, Charita 638, Profil 593) — ROADMAP cieľ „žiadny súbor > ~400 r." neplatí pre moduly. | `wc -l` |
| **P2** | `noImplicitAny:false` (vedomý kompromis migrácie, Fáza 5 ho má vrátiť). | tsconfig.json |
| **P2** | **Náboženstvo obchádza repo seam** — jediný modul čítajúci mock priamo; najväčší mock (572 r.). Pri napájaní na DB by sa musel prepisovať UI kód. | [src/features/nabozenstvo/](src/features/nabozenstvo/) |
| **P3** | Duplicitný `tint` v CudziProfil (hex-only, láme CSS-var farby) vs kanonický v [src/lib/ui.ts](src/lib/ui.ts). | [src/features/cudzi-profil/CudziProfil.tsx:25](src/features/cudzi-profil/CudziProfil.tsx#L25) |
| **P3** | Provider pyramída (10+ vnorených kontextov v App/Screens) — funkčné, ale sťažuje čítanie a širí re-rendery. | [src/app/App.tsx](src/app/App.tsx) |

### 3.6 Bezpečnosť (vedome odložená — ROADMAP Fáza 5, tu len evidencia)

25× test-only RLS `using(true)` · client-side SHA-256 PIN (demo) · „Confirm email" vypnuté pre dev · tvorba `ucet` client-side. **Nie je predmetom tohto plánu** — je to samostatné kolo popísané v ROADMAP Fáza 5 (owner-only politiky, server-side ucet, re-enable confirm). Pripomienka: urobiť **pred** akýmkoľvek verejným pilotom.

---

## 4 · Plán zlepšení — vlny

Každá vlna = samostatne zadateľná, nasaditeľná úloha (tsc + build zelené → commit). Náročnosť: **S** < ½ dňa · **M** ~1 deň · **L** viac dní. Všade platí: používať existujúce primitívy (`Sheet`, `pressable`, `SegTabs`, `states.tsx`, `Button/Switch`, `VirtualList`, `SPACE/RADIUS/SIRKA` tokeny) a pravidlá témy (var(--a-*), žiadne hardcoded hexy).

### Vlna 1 — Quick wins: prístupnosť + mobil *(najvyšší dopad / najnižšie riziko)* ✅ **HOTOVÉ 2026-07-09**

> **Stav realizácie:** všetkých 10 krokov implementovaných, `tsc` + `build` zelené. Poznámky:
> 1.1 `Sheet` rozšírený o `direction="top"` + `label` (Vaul top-drawer) — ViacSheet naň preklopený, všetky položky `pressable`, šípky = reálne buttony; 1.5 zavedený zdieľaný `<Hmat>` (ui.tsx — neviditeľný ≥44px hit-area expander) nasadený na Switch/Toggle/BackChip/šípky/Lightbox ✕ a bodky/☰ menu; 1.8 alt pokrýva **všetky feed karty** cez `FeedCard`→`FotoPrispevku`→`Foto alt` — detailové heroes per-modul = drobný follow-up; 1.9 Mapa dostala aj `SegTabs` na úrovne okruhu + aria-label posuvníka. Manuálne QA (čítačka, reálne iOS safe-area) odporúčané pri najbližšom teste na zariadení.

| # | Krok | Kde | Náročnosť |
|---|---|---|---|
| 1.1 | „Viac" prepnúť na `<Sheet>` (Vaul už je v appke — focus-trap, Escape, drag-dismiss zadarmo); vnútorné položky cez `pressable`/`Button`; šípky poradia = reálne buttony ≥44 px | [src/components/TabBar.tsx](src/components/TabBar.tsx) | M |
| 1.2 | Notifikačný overlay: `role="dialog" aria-modal`, focus-trap + focus-restore (vzor: Lightbox v [media.tsx](src/components/media.tsx)) | [src/features/notifikacie/Notifikacie.tsx](src/features/notifikacie/Notifikacie.tsx) | S |
| 1.3 | Landmarks: `<header>` v `ModulHlavicka`, `<nav>` v TabBar/Sidebar, `<main>` okolo obsahu modulu v Screens; názov modulu renderovať ako `<h1>` (štýl nechať) | [src/app/App.tsx](src/app/App.tsx), [src/components/layout.tsx](src/components/layout.tsx) | S |
| 1.4 | Safe-area: dock `bottom: calc(10px + env(safe-area-inset-bottom))`, FAB analogicky | [src/components/TabBar.tsx:66,85](src/components/TabBar.tsx#L66) | S |
| 1.5 | Dotykové ciele ≥44 px hit-area (padding/pseudo-element, vizuál nemeniť): Switch, Toggle, BackChip, šípky, Lightbox ovládanie | [src/components/ui.tsx](src/components/ui.tsx), [media.tsx](src/components/media.tsx) | S |
| 1.6 | Formuláre: `<form onSubmit>` + `<label htmlFor>` + `autocomplete` (email, current/new-password, tel, name, address) v AuthPage + RegKit + Help IBAN krok → Enter-submit funguje | [AuthPage.tsx](src/features/registracia/AuthPage.tsx), [RegKit.tsx](src/features/registracia/RegKit.tsx) | M |
| 1.7 | FeedCard: avatar/meno autora spraviť fokusovateľné (pressable + stopPropagation), zrušiť button-v-buttone sémantiku (kartu nechať ako klikací kontajner s `role="link"` alebo vnútorné open-target) | [src/components/feedcard.tsx:107-126](src/components/feedcard.tsx#L107) | S |
| 1.8 | `Foto`/`FotoPrispevku` dostane `alt` prop; feedy/detaily posielajú zmysluplný alt (názov príspevku), avatary `alt=""` (dekoratívne) | [src/components/media.tsx](src/components/media.tsx) + call-sites | M |
| 1.9 | Mapa: `FeedSkeleton`/`ErrorState` z [states.tsx](src/components/states.tsx) | [src/features/mapa/Mapa.tsx](src/features/mapa/Mapa.tsx) | S |
| 1.10 | `useOkno`: rAF-throttle resize handleru | [src/app/App.tsx:54-65](src/app/App.tsx#L54) | S |

**Hotovo keď:** „Viac" a Notifikácie sa dajú celé obslúžiť klávesnicou (Tab/Escape) a čítačkou; login/registrácia idú odoslať Enterom; axe/Lighthouse a11y bez critical; dock nekoliduje s home indicatorom; Mapa má stavy.

### Vlna 2 — Navigácia & pochopiteľnosť ✅ **HOTOVÉ 2026-07-09**

> **Stav realizácie:** všetkých 6 krokov implementovaných, `tsc` + `build` zelené. Ako to je postavené:
> **2.1** nová vrstva [src/lib/urlnav.ts](src/lib/urlnav.ts) — `/m/{modul}` URL sync (push pri prepnutí, popstate, refresh restore) + `useVrstva()` hook: každá pod-obrazovka/overlay je „vrstva histórie", browser **Back zatvára najvrchnejšiu vrstvu** namiesto opustenia appky. Zapojené: 7 modulov (Good/Help/Charita/Aktivity/Náboženstvo/Top/Profil — Back vracia na koreň modulu), ViacSheet, notifikácie, Lightbox, upgrade/aktivácia, badge/split sheety, intro. *Vedomé v1 zjednodušenia:* refresh na pod-obrazovke obnoví len modul (nie detail); Back z hlbšej pod-obrazovky (verify) ide na koreň, nie o krok; pri prepnutí modulu ponad otvorený detail ostane v histórii 1 osirelý záznam (extra Back).
> **2.2** [src/components/intro.tsx](src/components/intro.tsx) — 3-kartový sprievodca (skutky bez komentárov · okruh a 8 modulov · dôvera/karma/non-custody) pri prvom spustení (flag `deed.intro.v1`) + položka **„Ako DEED funguje"** vo Viac (sekcia POMOC). **2.3** zelená bodka na ☰ kým user prvýkrát neotvorí Viac (`deed.viac.videne`). **2.4** reálny reset hesla: `resetHeslo`/`zmenHeslo`/`subscribeRecovery` v [auth.ts](src/lib/auth.ts), „Zabudnuté heslo?" posiela email, recovery odkaz otvorí obrazovku `NoveHeslo` (vyžaduje Supabase email šablóny; v mock režime slovenská hláška). **2.5** [tooltip.tsx](src/components/tooltip.tsx) (`TipProvider` v App + `Tip`) nasadený na karma badge (AvatarUroven) a Overujem/Namietam (Good) — ďalšie miesta pribúdajú priebežne. **2.6** deep-link `/c/{slug}` otvorí priamo **detail** skutku v Good (plumbing v App `dlDetail` → prop `otvorId`); handle/org/event zatiaľ len modul (rovnaký vzor na rozšírenie).

| # | Krok | Kde | Náročnosť |
|---|---|---|---|
| 2.1 | **URL synchronizácia**: ľahká vlastná vrstva nad existujúcim stavom (bez react-routeru): `/m/{modul}` push pri prepnutí, `popstate` → setModul; detaily modulov pushnú `/m/{modul}/{screen}/{id}` a Back ich zavrie. Refresh obnoví modul z URL. (Deep-link infra `/c /@ /r …` už existuje — zjednotiť do jedného resolvera.) | [src/app/App.tsx](src/app/App.tsx), [src/lib/deeplink.ts](src/lib/deeplink.ts) | L |
| 2.2 | **Prvé spustenie**: 3-kartový intro (Skutky nie reči · Ako funguje podpora/okruh · Karma a overovanie) po prvej registrácii + `localStorage` flag; do „Viac" položka „Ako DEED funguje" (natrvalo dostupné) | nový `src/components/intro.tsx` | M |
| 2.3 | **Objaviteľnosť modulov**: pri prvom otvorení hint na „Viac" (badge s počtom nepripnutých modulov); prípadne 6. slot docku = ikona Viac s bodkou | [TabBar.tsx](src/components/TabBar.tsx) | S |
| 2.4 | **Zabudnuté heslo** reálne: `supabase.auth.resetPasswordForEmail` + obrazovka nastavenia nového hesla (redirect route) | [src/lib/auth.ts](src/lib/auth.ts), [AuthPage.tsx](src/features/registracia/AuthPage.tsx) | M |
| 2.5 | Tooltipy tam, kde je žargón: karma badge, pásma sumy, escrow chips, Overujem/Namietam (dep @radix-ui/react-tooltip už je nainštalovaná) | wrapper v [src/components/](src/components/) | M |
| 2.6 | Deep-link → presný detail (resolver vráti modul + id; modul otvorí detail) — nadväzuje na 2.1 | [deeplink.ts](src/lib/deeplink.ts) + moduly | M |

**Hotovo keď:** browser Back/Forward funguje (modul aj detail), refresh drží obrazovku, každý ekran má URL; nový user dostane intro a vie nájsť všetkých 8 modulov; reset hesla prejde end-to-end.

### Vlna 3 — PWA & inštalovateľnosť ✅ **HOTOVÉ 2026-07-09**

> **Stav realizácie:** všetky 3 kroky, `tsc` + `build` zelené, preview smoke-test OK (manifest/sw/ikony 200, SPA fallback na `/m/*` funguje).
> **3.1** ikony vygenerované zo značky D⁺ na GRAD gradiente (`public/icons/`: 192, 512, maskable-512, apple-touch-180 + `favicon.svg`); manifest definovaný vo [vite.config.ts](vite.config.ts) (VitePWA — name/short_name/standalone/lang sk, background `#F1ECE1`); [index.html](index.html) má theme-color (App ho prepisuje pri prepnutí motívu na `#F1ECE1`/`#14110B`), apple-touch-icon, favicon, description, mobile-web-app metas.
> **3.2** service worker (vite-plugin-pwa/generateSW): precache shellu (~1.9 MB, 32 súborov), runtime cache — Unsplash fotky CacheFirst (80/30 d), CARTO dlaždice CacheFirst (120/14 d), Google Fonts SWR, Supabase REST NetworkFirst (timeout 4 s → offline posledná kópia); auth/realtime sa necachujú. Update = sonner toast „Nová verzia… [Obnoviť]" ([src/lib/pwa.ts](src/lib/pwa.ts) `initPwa()` z main.tsx, v dev no-op).
> **3.3** „Pridať na plochu" v menu Viac → POMOC (`InstallRiadok` v TabBar + `useInstall()` hook — beforeinstallprompt store; iOS Safari bez promptu dostane návod Zdieľať → Pridať na plochu). *Pozn.: umiestnené vo Viac (viditeľnejšie než Profil — jedno miesto so sprievodcom).* Vercel statické súbory obsluhuje pred rewritom — sw/manifest/ikony fungujú bez zmeny vercel.json. Lighthouse installable audit odporúčam spustiť po nasadení na Vercel (vyžaduje HTTPS origin).

| # | Krok | Kde | Náročnosť |
|---|---|---|---|
| 3.1 | `manifest.webmanifest` (name, ikony 192/512 + maskable, theme_color z `--c-bg`, display standalone) + favicon + apple-touch-icon + `<meta theme-color>` (light/dark varianty) | [index.html](index.html), `public/` | M |
| 3.2 | Service worker cez `vite-plugin-pwa`: precache shell/assets, obrázky cache-first s limitom, API network-first; update prompt cez sonner | [vite.config.ts](vite.config.ts) | M |
| 3.3 | Install prompt: zachytiť `beforeinstallprompt`, ponúknuť v Profile („Pridať na plochu") | [Profil.tsx](src/features/profil/Profil.tsx) | S |

**Hotovo keď:** Lighthouse PWA installable; appka sa dá pridať na plochu (Android/iOS), shell sa otvorí offline s mock dátami; správny theme-color v oboch témach.

### Vlna 4 — Výkon ✅ **HOTOVÉ 2026-07-09**

> **Stav realizácie:** všetky 4 kroky, `tsc` + `build` zelené.
> **4.4** `LayoutContext` už nenesie `w` (nikto ho nečítal) — hodnota `{wide, desktop}` je memoizovaná a mení sa **len pri preklopení breakpointu**; resize medzi breakpointami nere-renderuje ~30 konzumentov `useLayout()` (spolu s rAF throttlom z Vlny 1 je ťahanie okna lacné).
> **4.1** `memo` na 5 kartových mapperoch (GoodKarta/HelpKarta/CharitaKarta/AktCard/KostolKarta) s novým komparátorom `rovnakeOkremFunkcii` ([src/lib/ui.ts](src/lib/ui.ts)) — porovnáva všetky props identitou **okrem funkcií** (inline onClick closures zachytávajú stabilné settery → stará closure je ekvivalentná). React-query structural sharing drží identity položiek → karta sa re-renderuje len keď sa zmenia JEJ dáta. *Odchýlka:* `FeedCard` samotný memo nemá — mapper-level memo pokrýva celý jeho podstrom a shallow-compare na inline objektoch (autor/media) by aj tak vždy zlyhal.
> **4.2** `FeedStlpce` viacstĺpcový: **per-stĺpec `VirtualList`** nad prahom 60 položiek (pod prahom render 1:1 ako doteraz; medzery vo virtualizovanom režime rieši paddingBottom obalu). `FeedGrid` (CSS multicol masonry sa okienkovať nedá — poradie skladá prehliadač) dostal **`content-visibility:auto` + `contain-intrinsic-size`** na kartách + existujúce dávkovanie — mimoobrazovkové karty prehliadač nerendruje.
> **4.3** `Foto`/`FotoPrispevku` majú `prednost` prop: `loading=eager` + `fetchpriority=high` + **LQIP blur placeholder** (32px rozmazaná verzia ako background — žiadny biely flash). Nasadené na 5 detailových heroes (Good/Help/Charita/Náboženstvo/Aktivity) spolu s `alt` textami (dočistenie follow-upu z Vlny 1). Self-host fotiek na Supabase Storage ostáva budúca úloha (viazaná na reálny obsah).

| # | Krok | Kde | Náročnosť |
|---|---|---|---|
| 4.1 | `React.memo` na `FeedCard` + kartové mappery modulov (props sú dátové objekty — dodať stabilné callbacky) | [feedcard.tsx](src/components/feedcard.tsx) + moduly | M |
| 4.2 | Virtualizovať viacstĺpcové feedy: `FeedGrid`/`FeedStlpce` cez `useWindowVirtualizer` s `lanes`, alebo per-stĺpec `VirtualList` (threshold ako dnes) | [layout.tsx](src/components/layout.tsx) | L |
| 4.3 | Obrázky: `fetchpriority="high"` pre hero, LQIP/blur placeholder, audit veľkostí; plán postupného self-hostu kritických fotiek (Supabase Storage) | [media.tsx](src/components/media.tsx) | M |
| 4.4 | Rozdeliť `LayoutContext` (wide/desktop — mení sa zriedka) od surových rozmerov okna (w/h — mení sa často), aby resize nerenderoval všetko | [App.tsx](src/app/App.tsx), [context.tsx](src/components/context.tsx) | M |

**Hotovo keď:** ťahanie okna nespôsobuje kaskádu re-renderov (React DevTools profiler), 500-položkový feed skroluje 60 fps aj v 3 stĺpcoch, LCP feedu sa nezhorší.

### Vlna 5 — Kvalita & udržateľnosť

| # | Krok | Kde | Náročnosť |
|---|---|---|---|
| 5.1 | ESLint (typescript-eslint + react-hooks + jsx-a11y) + Prettier; opraviť/odstrániť osirelé disable direktívy | root | M |
| 5.2 | Vitest + React Testing Library; prvé testy na čistú logiku: [lib/feed.ts](src/lib/feed.ts), [lib/poplatky.ts](src/lib/poplatky.ts), [lib/cardSize.ts](src/lib/cardSize.ts), `pressable`, `SegTabs` | `src/**/*.test.ts` | M |
| 5.3 | GitHub Actions CI: typecheck + lint + test + build na push/PR | `.github/workflows/` | S |
| 5.4 | Rozbiť monolity ≥ 590 r. na `Feed/Detail/Add` podsúbory (vzor: [features/nabozenstvo/](src/features/nabozenstvo/) — root + FarskyProfil + Kalendar + Pridat + ui); poradie: Good → Help → Aktivity → Charita → Profil → registračné flowy | features/* | L |
| 5.5 | Náboženstvo → repo seam: `nabozenstvo` vetva v [repo.ts](src/data/repo.ts) + hooky (mock impl dnes, Supabase zajtra bez zmeny UI) | [repo.ts](src/data/repo.ts), features/nabozenstvo | M |
| 5.6 | Zapnúť `noImplicitAny` + dotypovať; zmazať duplicitný `tint` (CudziProfil → `lib/ui`); odstrániť mŕtvu tooltip dep (ak ju nevyužije vlna 2.5) | tsconfig, [CudziProfil.tsx](src/features/cudzi-profil/CudziProfil.tsx) | L |

**Hotovo keď:** CI zelená brána na každý push; žiadny súbor > ~400 r. v features; `noImplicitAny` zapnuté; Náboženstvo číta cez hooky.

### Vlna 6 — Bezpečnosť & produkcia *(= ROADMAP Fáza 5 — tu len pripomenutie poradia)*

Owner-only RLS (25 politík) → server-side tvorba `ucet` → re-enable „Confirm email" → Sentry + základná analytika. **Podmienka pred verejným pilotom; nezaraďovať za PWA/push, ak sa pilot blíži.**

---

## 5 · Návrhy nových funkcií

### 5.1 Dokončenie vízie — backend už existuje, chýba UI

| Návrh | Hodnota pre usera | Náročnosť | Závislosti |
|---|---|---|---|
| **Peňaženka naživo**: reálny zostatok (`v_zostatok`) + výpis (`v_vypis`) v Profile, export CSV/PDF („jednotný výpis na cent" — priamo z vízie) | dôvera, prehľad darov | M | hooky `useVypis`/`useZostatok` už existujú |
| **Deep-link na presný detail** + zdieľateľné URL (viď 2.1/2.6) | virál, „pozri túto zbierku" | M | vlna 2 |
| **SplitLanding platba** cez `PlatbaModal` → `qr_split_pay` (dnes mock tlačidlo) | funkčný influencer QR | S | — |
| **Escrow UI** (držané/uvoľnené/refund pre Learn/Event) | transparentnosť podmienených darov | M | RPC `escrow_*` hotové |
| **B2B domov pre odznaky** (BadgeSheet dnes len cez deep-link): sekcia vo firme/profile so zoznamom odznakov + agregátom pochvál | firemný segment | M | RPC `badge_*` hotové |
| **Offline statický QR token 24 h** (Identity Card fallback zo špeky §10) | funguje bez signálu | M | TOTP infra hotová |
| **Wallet funding model** (kúpa/vklad DEED — mock rails) + gating platby podľa reálneho zostatku | uzavretie platobnej slučky | L | rozhodnutie o mock on-ramp |

### 5.2 Nové nápady (senior FE)

| Návrh | Hodnota | Náročnosť | Poznámka |
|---|---|---|---|
| **Web Share API** na kartách/detailoch/QR („Zdieľať" dnes kopíruje/nič) | native share sheet na mobile = virál | S | fallback: clipboard + toast |
| **Systémová téma** — default `prefers-color-scheme`, manuálny override ostáva | očakávané správanie | S | pozor na no-flash boot (inline script) |
| **„Ako DEED funguje"** — statická sekcia (karma, pásma, overovanie, non-custody, žiadne komentáre) dostupná z Viac + intro | pochopiteľnosť = konverzia | M | obsah zo špecifikácií, sekcia 1 tohto dokumentu |
| **Vizualizácia karma postupu** — progress do ďalšej úrovne na Profile (Bronze→Legend) | motivácia, jasnosť | S–M | reálny karma model je samostatná DB úloha; zatiaľ z placeholder dát |
| **ICS export / „pridať do kalendára"** pre udalosti a omše (Náboženstvo/Aktivity) | návratnosť userov | S | čistý FE (blob download) |
| **Push notifikácie** (Web Push po vlne 3; notifikačné kategórie + quiet hours už existujú) | retencia | L | vyžaduje SW + server kľúče |
| **OG share-card obrázky** pre zbierky (pekný náhľad pri zdieľaní linku) | virál mimo appky | M | potrebuje URL z vlny 2; edge funkcia alebo statický generátor |
| **Onboarding checklist** „Prvé kroky" (nastav okruh · sleduj charitu · podpor skutok · pripni moduly) s odškrtávaním | aktivácia nových userov | M | localStorage/personalizácia |
| **Nastavenie veľkosti písma** (a11y; škálovanie cez CSS var multiplikátor) | prístupnosť starších userov — kľúčový segment darcov | M | tokeny TYPE to uľahčia |
| **Týždenný digest** notifikácií (súhrn podpôr/nových zbierok v okruhu) | návratnosť bez spamu | L | po reálnom notif. toku |

### 5.3 Čo vedome NErobíme (drží sa ROADMAP)

Reálne KYC/KYB (Didit), reálna SMS brána, reálny blockchain settlement, AI hodnotenie žiadostí, react-native/mobilné appky — ostávajú mock/mimo rozsah, kým sa nerozhodne ostré spustenie (právne body → Dagmar). Komentáre sa nepridávajú nikdy (železné pravidlo vízie).

---

## 6 · Odporúčané poradie a mapovanie na ROADMAP

### 6.1 Matica dopad × náročnosť

| Priorita | Balík | Prečo prvé |
|---|---|---|
| 1 | **Vlna 1** (a11y + mobil quick wins) | najväčší dopad na reálnych userov za ~1–2 dni, nulové riziko regresu, využíva hotové primitívy |
| 2 | **Vlna 2** (URL + onboarding + reset hesla) | láme najväčšie „toto nie je hotový produkt" signály; odomyká zdieľateľnosť a OG karty |
| 3 | **Vlna 3** (PWA) | inštalovateľnosť + offline = mobilná dôveryhodnosť; predpoklad push notifikácií |
| 4 | **Vlna 5.1–5.3** (lint + testy + CI) | poistka pred ďalším rastom — ideálne zaradiť už súbežne s vlnami 2–3 |
| 5 | **Vlna 4** (výkon) | viditeľné pri raste dát; virtualizácia gridov pred reálnym obsahom |
| 6 | **Vlna 5.4–5.6** (monolity, repo seam Náboženstva, strict TS) | udržateľnosť; robiť postupne popri feature práci |
| 7 | **Vlna 6** (bezpečnosť = Fáza 5) | **nutná pred verejným pilotom** — zaradiť hneď, ako sa pilot naplánuje |

Nové funkcie (sekcia 5) sa vkladajú podľa hodnoty: quick wins **Web Share, systémová téma, ICS, SplitLanding platba** sa zmestia do vĺn 1–3; **peňaženka naživo + escrow UI + B2B odznaky** = samostatný balík „dokončenie platobnej slučky"; **push + digest** až po PWA.

### 6.2 Nadväznosť na ROADMAP.md

- Fázy 0–3 (shell, TS, dátová vrstva, UI polish) — hotové; tento dokument na ne nadväzuje.
- Fáza 4 (reálne dáta) — hotová pre 8 modulov; **zvyšok**: Náboženstvo (po 5.5), CudziProfil/Retaz žiadosti/Fun, karma/peňaženka model (event-sourced — samostatná DB úloha).
- Fáza 5 (produkčná pripravenosť) — vlny 3, 5 a 6 ju napĺňajú: PWA ✓, kvalita/CI ✓, observabilita + RLS ✓; navyše tento plán dopĺňa to, čo v nej chýbalo: URL navigáciu, onboarding a dokončenie a11y rolloutu.

---

*Živý dokument — pri realizácii odškrtávať kroky priamo tu (vzor ROADMAP.md). Každú vlnu možno zadať samostatne („sprav Vlnu 1 z DEED_ANALYZA_A_PLAN_ZLEPSENI.md").*
