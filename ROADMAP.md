# DEED — Roadmap na produkčnú úroveň

> Cieľ: posunúť appku z **investorského prototypu** (preview mód, mock dáta, demo identita)
> na **reálnu, profesionálnu aplikáciu**, ktorá vyzerá a správa sa ako hotový produkt.
> KYC/KYB a externí vendori (SMS) **zatiaľ ostávajú mockovaní** — nie sú súčasťou tohto cieľa.

**Zvolený smer (rozhodnutia z 2026-06-25):**
1. **Plný TypeScript** — migrácia celého projektu na TS.
2. **Najprv štruktúra + vzhľad** — čistá architektúra a vyladené UI na mock dátach; reálne Supabase dáta napájame modul po module až potom.
3. **Admin / investorský pitch — úplne odstrániť** (vrátane prepínača zariadení).

---

## Princípy

- **Vyzerá ako reálna appka** — žiadne „demo", „preview", „investor" prvky v UI. Appka vypĺňa obrazovku a je responzívna (mobil = 1 stĺpec, tablet/desktop = viac stĺpcov, centrovaný stĺpec do ~1180 px).
- **Jeden zdroj pravdy pre dáta** — komponenty nečítajú mock polia priamo; všetko ide cez **repozitár vrstvu** (`data/repos`), ktorá má dnes mock implementáciu a zajtra Supabase. Výmena = jeden súbor, nie 8 modulov.
- **Každý zoznam/detail má 4 stavy** — `loading` (skeleton), `empty`, `error`, `data`. Žiadny „prázdny flash".
- **Typovaná doména** — `Skutok`, `Ziadost`, `Zbierka`, `Charita`, `Pouzivatel`, `Notifikacia` … definované raz v `types/domain.ts`.
- **Malé súbory** — `shared.jsx` (1186 r.) sa rozpadne na komponenty/ikony/utility. Cieľ: žiadny súbor > ~400 r.
- **Konzistentný dizajn-systém** — tokeny (farby, spacing, radius, tieň, motion) na jednom mieste; komponenty ich len konzumujú.

---

## Fázy

### Fáza 0 — „Reálna appka" (shell cleanup) ✅ *hotovo*
Najmenší krok s najväčším vizuálnym dopadom. Robí sa ešte v JS, lebo odstraňuje kód, ktorý by sme inak zbytočne migrovali.

- [x] Odstrániť `DeviceToggle` + `DevicePreview` z `App.jsx` → appka beží na celú obrazovku, responzívne.
- [x] Odstrániť modul **Admin** (investorský pitch + rekurzívny náhľad zariadení): `moduly/Admin.jsx`, položka v `VSETKY_MODULY`, route a import.
- [x] Vyčistiť `preview` prop z `Screens` (existoval len kvôli Admin náhľadu).
- [x] `index.html` — titulok bez „Investor Demo".
- **Hotovo, keď:** appka sa otvorí rovno do feedu (alebo registrácie), na desktope je to centrovaný responzívny stĺpec, nikde nie je prepínač zariadení ani admin/pitch.

### Fáza 1 — TypeScript + štruktúra kódu ✅ *hotovo*
Založiť produkčnú kostru, na ktorej stojí všetko ostatné.

- [x] TS toolchain: `tsconfig.json`, `@types/*`, `vite-env.d.ts`, alias `@/` (vite + tsconfig), `typecheck` skript, `build` = `tsc --noEmit && vite build`.
- [x] Doménové typy: `types/feed.ts`, `types/user.ts`, `types/index.ts` (~140 typov, odvodené z mock dát).
- [x] Spine v TS: `theme.ts`, `lib/{supabase,session,cardSize,feed,db}.ts`, `lib/pouzivatel.tsx`.
- [x] Rozbiť `shared.jsx` (1187 r. → barrel): `components/{icons,context,visual,feedback,media,layout,qr,platba,hladanie}.tsx` + `lib/{ui,qr}.ts` + `components/index.ts`. `shared.tsx` = tenký barrel (drží staré importy).
- [x] Presun modulov/obrazoviek/registrácie do `features/` + konverzia `.jsx → .tsx` + extrakcia mockov do `features/<x>/mock.ts`.
- [x] `App.jsx → app/App.tsx`, prepojiť `@/features/*`, zmazať staré súbory (vrátane mŕtveho `Placeholder`).
- [x] Adverzný review (každý súbor vs git originál) → žiadne reálne regresie.
- **Hotovo:** `tsc --noEmit` 0 chýb, build zelený, dev server beží, žiadny `.jsx`, štruktúra zodpovedá cieľu.

> **Pozn. k strictnosti:** počas migrácie je `noImplicitAny` vypnuté (inak by stovky triviálnych
> callback parametrov blokovali štruktúrnu zmenu). `strictNullChecks` je zapnuté. Plný `strict`
> (re-zapnutie `noImplicitAny` + dotypovanie) je dedikovaná úloha vo **Fáze 5**.

### Fáza 2 — Dátová vrstva (repository pattern) ✅ *hotovo*
Pripraviť čistý švík medzi UI a dátami — bez reálnych volaní, ešte na mocku.

- [x] Repozitár `src/data/repo.ts` — rozhranie `Repo` (good/help/charita/aktivity/notifikacie/retaz/fun/profil) + `mockRepo` impl + aktívny `repo` (selektor mock|supabase pripravený).
- [x] **TanStack Query** zavedený: `src/app/QueryProvider.tsx` (staleTime, retry) zapojený v `App`.
- [x] Dátové hooky `src/data/hooks.ts` + barrel `@/data` (`useGoodFeed`, `useCharitaAdresar`, `useNotifikacie`, `useProfil*`, …).
- [x] Migrácia 8 modulov na hooky (19 hook-volaní); žiadny modul nečíta dátové mock pole priamo (ostáva len konfigurácia: farby, domény, mapa-štatistiky, formulárové voľby).
- **Hotovo:** `tsc` + build zelené, dev beží; výmena mocku za Supabase = jeden súbor (`repo.ts`).

> **Pozn.:** loading/error stavy zatiaľ bez UI (mock je instantný, default `= []`/guard). Skeletony a error-handling sú náplň **Fázy 3**.

### Fáza 3 — UI polish & produkčné detaily *(prebieha — senior-level, po vlnách)*
Doladiť to, čo robí appku „hotovou". Realizované po samostatne nasaditeľných vlnách (každá `tsc`+build zelená → commit → Vercel). Moderné knižnice: **motion** (Framer), **vaul**, **sonner**, **@radix-ui**, **@tanstack/react-virtual** — bespoke vzhľad zachovaný.

- [x] **Stavy:** `components/states.tsx` (Skeleton/FeedSkeleton/SkeletonRiadky/EmptyState/ErrorState+retry/Spinner) v 6 dátových moduloch. Mock latencia 320 ms.
- [x] **Wave 1 — Foundation:** dizajn-tokeny `src/tokens.ts` (SPACE/RADIUS/TYPE/SHADOW/MOTION); knižnice; nové komponenty `motion`/`sheet`/`pressable`/`toast`; App providers (LazyMotion + MotionConfig reducedMotion + DeedToaster + portal seam).
- [x] **Wave 2 — Sheety + prechody:** `Modal`→`<Sheet>` (Vaul, drag-to-dismiss + výstupná animácia + focus-trap) na 7 call-sites; `<ScreenSwitch>` crossfade prechody obrazoviek v 5 moduloch.
- [x] **Wave 3 — Prístupnosť:** `pressable()` (role/tabIndex/Enter+Space/aria) na dock, hlavičky, chipy, OkruhVyber, Vyber; Lightbox focus-restore + aria + klávesnica; press feedback (`:active` opacity).
- [x] **Wave 4 — Toast + hľadanie:** sonner globálny `toast()` namiesto duplikovaného stavu v 9 súboroch; `useDeferredValue` debounce hľadania.
- [x] **Wave 5a — Code-splitting:** `React.lazy` 7 modulov + Suspense; vendor chunky (react/motion/tanstack) v `vite.config`. Initial load = shell + prvý modul.
- [x] **Mikro-interakcie (časť):** lazy-load obrázkov (`loading="lazy"`), výstupné animácie sheetov, `whileTap`.
- [x] **Wave 6 — A11y segmenty & klávesnica:** zdieľaný `SegTabs` (radiogroup + roving tabindex + šípky/Home/End, bespoke vzhľad cez render-prop) nasadený na single-select selektory (Charita filter, cudzí profil sekcie+stav, Good nástenka filter). Toggle-off selektory (Aktivity doména/sub-taby) + header search + Notifikácie (riadky, prepínače `role="switch"`, zvonček) sprístupnené cez `pressable`. Feed-karty už klávesnicovo (Good/Charita `pressable`).
- [x] **Wave 7 — Responzivita + a11y dotiahnutie:** FunZona na tablete/PC centrovaný čitateľný stĺpec (`obalSiroky` 560/640) namiesto full-bleed; akcie FunZona/RetazDobra (výber žiadosti `aria-pressed`, QR-scan) klávesnicovo; Notifikácie overlay `Escape`-to-close. (Profil/Top/CudziProfil už capujú šírku na desktope; feedy Good/Help/Charita/Aktivity sú viacstĺpcové cez `FeedStlpce`/`FeedGrid` — responzivita hotová.)
- [x] **Wave 8 — HladanieModal a11y:** filter-chipy (8 typov) → `SegTabs`; výsledky, posledné hľadania a akcie (zrušiť/vymazať) cez `pressable`; `Escape`-to-close.
- [x] **Wave 9 — Kontrast audit (WCAG AA):** vypočítané pomery zo všetkých text/akcent tokenov (light+dark). Tmavý celý prechádza; svetlý opravený — `textTer` #7C7361→#716959 (4.6:1) + akcenty green/clay/gold/teal/plum stmavené hue-zachovávajúco na ≥4.55:1 ako text (info/danger už prešli). Gradienty/brand fill bez zmeny (biely text prechádza).
- **Fokus-viditeľnosť** (`:focus-visible` prstenec `var(--a-green)` + `prefers-reduced-motion` + press feedback) je v `index.css` od skôr; toast a11y rieši **sonner** (aria-live region). Tickery zámerne nie sú live (ambient — `aria-live` by bol rušivý).
- [x] **Wave 5b — Token sweep:** (1/2) retire rogue `SEG_BG` (7 bright hardcoded rgba → `tint(var(--a-*),.16)`, theme-aware). (2/2) adopcia `SPACE`/`RADIUS` tokenov v 26 legacy moduloch cez workflow (per-súbor transform → adverzný verify), **striktné ≤2px** pravidlo (väčšie skoky ponechané ako literál). `TYPE` (font hierarchia/weighty) a `SHADOW` (viditeľné elevácie) zámerne vynechané; palety `K`/`A` **ponechané** (theme-aware, viď pamäť). 854/854 riadkov 1:1, tsc+build zelené. *Pozn.: ≤2px posuny — odporúčaný screenshot-diff (autorský zámer).* `TYPE`/`SHADOW` adopcia ostáva budúca úloha s vizuálnym QA.
- [x] **Wave 5c — Virtualizácia:** zdieľaný `VirtualList` (`@tanstack/react-virtual`) — **threshold-aktivovaný** (pod 60 položkami bežný render = dnešné malé zoznamy nezmenené/nulové riziko; nad prahom virtualizuje s dynamickým meraním). Nasadený na dva reálne rastúce flat feedy: Notifikácie + HladanieModal výsledky. Adresár (grouped) + Profil zoznamy (page-scroll) zámerne vynechané (iný vzor, bounded dáta).
- **Hotovo:** klikanie appkou pôsobí ako hotový produkt — viacstĺpcové feedy, capnuté čítacie obrazovky, klávesnica naprieč selektormi/overlaymi, WCAG AA kontrast, token-konzistentné spacing/radius, virtualizácia pripravená na rast dát. **Fáza 3 kompletná** (zvyšok TYPE/SHADOW adopcie = budúce s vizuálnym QA).

### Fáza 4 — Reálne dáta (Supabase), modul po module
Vymeniť mock repozitáre za Supabase — bez zásahu do UI.

- Rozšíriť schému: `skutok`, `ziadost`, `zbierka`, `charita`/adresár, `rebricek`, `notifikacia`, `penazenka/transakcia`, geo-stĺpce pre rádius.
- Implementovať Supabase repozitáre (`*.supabase.ts`), prepnúť selektor; realtime tam, kde dáva zmysel (notifikácie, tickery).
- Seed reálnych/realistických dát + RLS politiky pre čítanie.
- Poradie napájania: **Good → Charita → Top → Profil/Peňaženka → Notifikácie → Aktivity → Help → Mapa**.
- **Hotovo, keď:** appka beží na reálnych dátach prihláseného používateľa, mock už len ako fallback pre vývoj.

### Fáza 5 — Produkčná pripravenosť
Z appky spraviť nasaditeľný produkt.

- [x] **Auth (email/heslo):** reálny Supabase Auth ako identitná vrstva. Migrácia `0012` (`ucet.auth_id` → `auth.users`). `lib/auth.ts` (signUp/signIn/signOut/**resolveSession** reconciliation/**subscribeAuth**). AuthPage robí reálny signUp/signInWithPassword (busy/chyba). Onboarding je **auth-first** (OsobaFlow/CharitaFlow preskočia telefón-OTP+PIN, vytvoria `auth_id`-naviazaný `ucet`; pasívny tiež dostane reálny ucet). App **auth-boot gate** (splash → resolveSession → app / resume onboarding / login; stale session sa čistí). Logout = `supabase.auth.signOut()`+`clearSession`. Demo/hosť zachované. Živo overené (signup→ucet link→lookup OK). **⚠ Vyžaduje dashboard krok: Authentication → Email → vypnúť „Confirm email" pre dev** (inak signup nevráti session). *Pozn.: upgrade-overlay `start="aktivny"` ostáva zatiaľ legacy telefón tok — follow-up.*
- **RLS & bezpečnosť (ĎALŠIE KOLO):** nahradiť 25× `test_all_access (using true)` owner-only politikami: `ucet` `using (auth_id = auth.uid())`, child tabuľky cez `ucet_id in (select id from ucet where auth_id = auth.uid())`, obsah (prispevok/udalost/adresar_charita…) public SELECT. Po RLS znova zapnúť „Confirm email" a presunúť tvorbu `ucet` server-side. Audit `get_advisors` (dnes hlási očakávaných 25 warnings).
- **Kvalita:** ESLint + Prettier, `tsc --noEmit` a testy (Vitest + React Testing Library) v CI.
- **Výkon:** code-splitting modulov (lazy import), rozpočet na bundle, optimalizácia obrázkov/CDN.
- **Observabilita:** error tracking (napr. Sentry), základná analytika.
- **PWA / mobilný shell:** manifest, offline-friendly app shell, install prompt.
- *(Mimo rozsahu teraz: reálne KYC/KYB a SMS brána — ostávajú mock.)*

---

## Cieľová štruktúra priečinkov

```
src/
  main.tsx
  app/
    App.tsx                 # shell: pozadie, motív, layout (bez device preview)
    Router.tsx              # prepínanie modulov (neskôr príp. react-router)
    providers/              # Motiv, Pouzivatel, Galeria, Scroll, Viac
  components/               # zdieľané „dumb" UI
    icons/                  # ~60 SVG ikon + index.ts
    media/                  # Foto, Avatar, Video, Lightbox, MiniFotky
    feedback/               # Toast, Oslava, Modal
    layout/                 # Hlavicka, ModulHlavicka, FeedStlpce, OkruhVyber
    qr/                     # QrVizual, QrModal
    platba/                 # PlatbaModal (rozdelený)
    hladanie/               # HladanieModal
  features/
    good/ help/ charita/ aktivity/ profil/ mapa/ top/
    notifikacie/ retazdobra/ funzona/ cudziprofil/
    registracia/            # Registracia, OsobaFlow, CharitaFlow, RegKit
       └─ <modul>/: index.tsx, components/, mock.ts, types.ts
  lib/                      # supabase, session, qr, feed, cardSize, format
  data/
    repos/                  # *.repo.ts (interface), *.mock.ts, *.supabase.ts
    index.ts                # selektor mock/supabase podľa env
  theme/                    # tokens.ts, glass.ts, theme.css
  types/                    # domain.ts, db.ts (generované Supabase typy)
```

---

## Stav na štarte (2026-06-25)

| Oblasť | Zdroj dát | Zrelosť |
|---|---|---|
| Registrácia (Osoba + Charita) | Supabase (vendori mock) | ~90 % |
| Algoritmy `feed.ts`, `cardSize.ts` | čistá logika, bez IO | hotové |
| Moduly Good / Help / Charita / Aktivity / Profil / Top | mock (hardcoded) | UI hotové, dáta cold |
| Sociálne obrazovky (CudziProfil, Notifikacie, RetazDobra, FunZona) | mock | prototyp |
| Mapa | mock | prototyp |
| TabBar + ViacSheet | localStorage | hotové |
| `shared.jsx` | — | monolit 1186 r. (na rozbitie) |
| Admin / investor pitch | mock | **na odstránenie** |

---

*Tento súbor je živý — odškrtávame úlohy a posúvame fázy ako postupujeme.*
