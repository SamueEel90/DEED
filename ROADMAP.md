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
- **Žiadne placebo po prerábke** — modul v hĺbkovom spracovaní sa vyčistí od placeba: napojiť na DB alebo vyhodiť; čo zámerne ostáva ukážkové, má `// PLACEBO — karta X` a v UI „pripravujeme“, nie falošný úspech. Súpis nižšie: [Inventúra placeba](#inventúra-placeba-7-10-2026).

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
- **TODO (Zadanie 1 · Blok 1, migrácia `0035_identita.sql`):** registrácia organizácie/firmy musí volať `rpc zaloz_stranku(p_id, p_typ, p_nazov)` — patrí do karty, ktorá spustí vznik stránok z registrácie (miesto: `src/lib/db.ts` pri `vytvorUcet`). Dovtedy stránky stoja na testovacích org. účtoch z 0035.
- **Karty Fázy 4 z inventúry localStorage (Zadanie 3, Martin 6. 10. 2026)** — každá ako samostatná karta, obchodný stav ide z localStorage do DB (zoznam kľúčov: `docs/localstorage.md`, časť C):
  1. **Podpory firiem** (`deed.podpory`, `deed.rola.nazov.b2b`) — čo firma podporila, sumy z ledgera (pohyby z účtu firmy).
  2. **Pravidelné dary** (`deed.pravidelne`) — `opakovana_platba` (0016).
  3. **Moje skutky s karmou** (`deed.moje.skutky`) — `prispevok`; skóre a karma už zapisuje server (0039).
  4. **Dochádzka** (`deed.akcia`) — `dochadzka` / TOTP (0015).
  5. **Registrované organizácie** (`deed.mojeStranky`, `deed.reg.org`) — `stranka` + `zaloz_stranku` (0035).
  6. **Moja firma — oznamy a návrhy akcií** (`deed.mojaFirma`) — vybavené oznamy firmy zamestnancovi a návrhy firemných akcií do DB (Martin 6. 10.).
  7. **Verejné pohľady bez security definer** — `v_vyzbierane`, `v_top_darcovia`, `prispevok_feed`, `profil_stranky_verejny` prerobiť na serverové funkcie, aby `get_advisors` = 0 (Martin 6. 10.; dovtedy vracajú len verejné stĺpce).
  8. **Voľba darcu pri QR splite** — dar cez QR split zatiaľ ide ako anonymný (predvoľba, 0061); doplniť výber zobrazenia ako pri bežnom dare (Martin 6. 10.).
  9. **Profily podľa mena → ID a čísla** — deep linky profilov cez ID + verejné čísla U-/C- namiesto mena (Blok 1, Martin 6. 10.).
- **Karty Fázy 4 zo Zadania 5 (hygiena, Martin 6. 10. 2026):**
  1. **Stránkovanie Help, Charita, Aktivity + Top hrdinovia z ledgera** — ostatné feedy cez `feed_stranka` (0063) ako Domov (dnes len strop 50); Top hrdinovia počítať z ledgera, nie načítaním všetkých skutkov Domova.
  2. **Editor príbehu zbierky → Storage** — fotky v `pribeh_zbierky` cez `bezDataUrl` ako ostatné (0064 ho zatiaľ nepokrýva).
  3. **Hlavný balík pod 2 MB** — ďalšie delenie (lazy moduly `features/rola`, `verejny-profil`, `zbierka`, `profil`); potom vrátiť `maximumFileSizeToCacheInBytes` vo `vite.config.ts` na predvolené 2 MiB.
- **Hotovo, keď:** appka beží na reálnych dátach prihláseného používateľa, mock už len ako fallback pre vývoj.

### Fáza 5 — Produkčná pripravenosť
Z appky spraviť nasaditeľný produkt.

- [x] **Auth (email/heslo):** reálny Supabase Auth ako identitná vrstva. Migrácia `0012` (`ucet.auth_id` → `auth.users`). `lib/auth.ts` (signUp/signIn/signOut/**resolveSession** reconciliation/**subscribeAuth**). AuthPage robí reálny signUp/signInWithPassword (busy/chyba). Onboarding je **auth-first** (OsobaFlow/CharitaFlow preskočia telefón-OTP+PIN, vytvoria `auth_id`-naviazaný `ucet`; pasívny tiež dostane reálny ucet). App **auth-boot gate** (splash → resolveSession → app / resume onboarding / login; stale session sa čistí). Logout = `supabase.auth.signOut()`+`clearSession`. Demo/hosť zachované. Živo overené (signup→ucet link→lookup OK). **⚠ Vyžaduje dashboard krok: Authentication → Email → vypnúť „Confirm email" pre dev** (inak signup nevráti session). *Pozn.: starý telefón tok bez prihlásenia (RegKit, `ucet_s_telefonom`) zrušený 6. 10. 2026 (0060) — registrácia je len auth-first.*
- **RLS & bezpečnosť (ĎALŠIE KOLO):** nahradiť 25× `test_all_access (using true)` owner-only politikami: `ucet` `using (auth_id = auth.uid())`, child tabuľky cez `ucet_id in (select id from ucet where auth_id = auth.uid())`, obsah (prispevok/udalost/adresar_charita…) public SELECT. Po RLS znova zapnúť „Confirm email" a presunúť tvorbu `ucet` server-side. Audit `get_advisors` (dnes hlási očakávaných 25 warnings).
- [x] **Kvalita — tooling:** ESLint 10 (flat config) + Prettier + `tsc --noEmit`
  a lint v CI (`.github/workflows/ci.yml`, `npm run verify`). Odstránený mŕtvy kód
  (47 nepoužitých symbolov).
- [x] **Kvalita — smoke test:** `scripts/smoke.mjs` (Playwright) otvorí každý
  modul aj detail príspevku v prehliadači a spadne na chybe v konzole. Beží
  v CI aj cez `npm run verify`.
- **Kvalita — unit testy:** Vitest + React Testing Library. Zatiaľ neexistujú;
  zvyšok sa overuje manuálne (`.claude/skills/verify/SKILL.md`).
- **Lint backlog (193 warningov, 0 errorov — stav 6. 10. 2026):** 77× `@typescript-eslint/no-explicit-any`
  (hranice k Supabase/3rd-party, vyrieši sa so sprísnením `noImplicitAny` vo Fáze 5), 0× `no-unused-vars`
  a ~116× React-Compiler pravidlá z `eslint-plugin-react-hooks` v7
  (`refs`, `set-state-in-effect`, `purity`, `static-components`) — samostatný krok s vizuálnym QA. Dnes `warn`;
  číslo sa má s každou zmenou znižovať. Po dočistení prepnúť na `error` v `eslint.config.js`.
- **Výkon:** code-splitting modulov (lazy import), rozpočet na bundle, optimalizácia obrázkov/CDN.
- **Observabilita:** error tracking (napr. Sentry), základná analytika.
- **PWA / mobilný shell:** manifest, offline-friendly app shell, install prompt.
- *(Mimo rozsahu teraz: reálne KYC/KYB a SMS brána — ostávajú mock.)*

---

## Inventúra placeba (7. 10. 2026)

Jednorazový súpis všetkého, čo v appke len vyzerá, že funguje: **218 miest**. Placebo = tvrdí výsledok („Uložené“, „Odoslané“, „Zaplatené“), ale nič nezapíše na server, alebo len do localStorage či pamäte, hoci výsledok má vidieť niekto iný. Nie je placebo: poctivé „pripravujeme“, navigácia, kopírovanie, zdieľanie, testovacie panely za `TESTOVACIA`.
Pravidlo: modul v hĺbkovom spracovaní sa vyčistí (napojiť na DB alebo vyhodiť), zvyšok dostane `// PLACEBO — karta X` a v UI „pripravujeme“. Riadok sa zo súpisu maže, keď je vyriešený.

| Oblasť | Miest |
|---|---:|
| Správa stránok (charita, firma, tvorca, farnosť) — `src/features/rola` | 63 |
| Viera — `src/features/viera` (vyčistí sa s Farnosťou v3) | 35 |
| Profil, skutky, registrácia, Iskry, reťaz, oznámenia — `src/features/…` | 69 |
| Moduly feedov, verejné profily, zbierky, platby, spoločné komponenty | 51 |
| **Spolu** | **218** |

Najčastejšie vzory: falošná platba (`setTimeout` + náhodné ID transakcie, dar len v pamäti); „Sledovať“, „Zvonček“, „Páči sa“ len v `useState`; „odoslané / poslali sme“ bez odoslania (podpora, pozvánky, upozornenia darcom); ukážkové čísla pre každého (karma, štatistiky, zoznam darcov); overovacie kódy, ktoré prijmú hocijakých 6 číslic; DEV tlačidlá za `FLAGS.dev_tier_switcher`, ktoré vidí každý.

### Správa stránok (charita, firma, tvorca, farnosť) — `src/features/rola` · 63

| Súbor:riadok | Obrazovka | Prvok | Čo tvrdí | Čo reálne robí |
|---|---|---|---|---|
| NastaveniaCharity.tsx:252 | Nastavenia → Správcovia | Pridať správcu | „Oznámenie sme mu poslali“ | Iba pridá riadok do nastavení, nikomu nič nepríde |
| NastaveniaCharity.tsx:287 | Nastavenia → Správcovia | Poslať znova | „Pozvánku sme poslali znova“ | Iba toast, nič nevolá |
| NastaveniaCharity.tsx:253-258,325-326 | Nastavenia → Správcovia | Vytvoriť pozvánku / Zdieľať / Kopírovať | Pozvánka platí 48 h | Odkaz /pozvanka/id nemá trasu ani záznam na serveri |
| NastaveniaCharity.tsx:385 | Nastavenia → Údaje organizácie | Načítať znova z registra | „Údaje sme načítali z registra“ | Iba toast, register sa nevolá |
| NastaveniaCharity.tsx:374,382 | Nastavenia → Údaje organizácie | Blok Z registra | Overené údaje (IČO, sídlo, štatutár) | Natvrdo zapísané konštanty |
| NastaveniaCharity.tsx:208-227 | Nastavenia → Správa účtov | Transparentné účty zbierok | Účty vašich zbierok | 3 vymyslené účty natvrdo |
| NastaveniaCharity.tsx:475,505 | Nastavenia → Program | Potvrdiť zmenu | „Program X platí od dnes“ | Tier iba v localStorage, žiadna platba ani faktúra |
| NastaveniaCharity.tsx:558-561 | Nastavenia → Faktúry | Zoznam faktúr | Vystavené faktúry za program | 3 vymyslené faktúry podľa tieru |
| NastaveniaCharity.tsx:587,605,608 | Nastavenia → Zariadenia | Odhlásiť / Odhlásiť všetky ostatné | „Zariadenie je odhlásené“ | Zariadenia vymyslené, len sa zmaže riadok |
| NastaveniaCharity.tsx:662-667,694 | Nastavenia → Stiahnuť údaje | Pripraviť súbor / Stiahnuť | Pripravíme súbor, pošleme e-mail | Falošný 2,5 s priebeh, žiadny súbor |
| NastaveniaCharity.tsx:755 | Nastavenia → Napísať podpore | Odoslať | „Správu sme dostali, odpovieme do 1 dňa“ | Uloží sa len do nastavení stránky, podpore nič |
| NastaveniaCharity.tsx:810 | Nastavenia → Zrušiť stránku | Naozaj zrušiť stránku | „Stránka je zrušená“ | Iba toast, nič sa nezruší |
| NastaveniaCharity.tsx:86-141,620-646 | Nastavenia → Oznámenia, Súhlasy | Prepínače | Nastaví, čo príde | Uloží sa do DB, ale nič to nečíta |
| NastaveniaCharity.tsx:156,181,191 | Nastavenia → Dary v € / EURC | Sada súm, EURC áno/nie | Nastavenie príjmu darov | Len localStorage |
| SpravaStranky.tsx:1397 | Správa → Nastavenia | Tichý čas 22:00 – 7:00 | Prepínač tichého času | Len useState |
| SpravaStranky.tsx:193-198,753,886 | Správa → Prehľad | Čísla (vyzbierané, dary, sledujúci) | Živé štatistiky | Natvrdo (146 €, 1 204…) |
| SpravaStranky.tsx:200-204,976,981,1070 | Správa → Treba vybaviť | Pripomenúť / Nahrať / Potvrdiť | Úlohy charity | Vymyslené úlohy, tlačidlá „Pripravujeme“ |
| SpravaStranky.tsx:206-212,225-230,1302 | Správa → Bežiace / Moje zbierky | Karty zbierok | Vaše zbierky so sumami | Ukážkové zbierky pre každú charitu |
| SpravaStranky.tsx:1013-1034 | Správa → Prehľad | Reťaz dobra, Dorovnávané zbierky | 640 €, Pekáreň Dobrota 620 € | Natvrdo mock |
| SpravaStranky.tsx:1355 | Správa → Peňaženka | Prišlo / Čaká / Vyplatené | Stav peňazí | Natvrdo „0 €“ |
| SpravaZbierky.tsx:524-533 + PlatbaOrganizacie.tsx:24-31 | Správa zbierky | Podrž a zaplať (predĺženie, topovanie) | „Zaplatené… faktúra“ | Falošné držanie, faktúra v pamäti, stav v localStorage |
| SpravaZbierky.tsx:96-106 | Spravovať zbierku (firemný) | Predĺžiť / Topovať | „Zaplatené / Topované“ | Rovnaká falošná platba |
| SpravaZbierky.tsx:535-551,110 | Správa zbierky | Podrž a ukonči zbierku | Darcom pošleme výsledok | Len localStorage |
| SpravaZbierky.tsx:854-857 | Správa zbierky → Doklady | Odoslať na overenie | „DEED+ skontroluje do 2 dní“ | Len dátum v localStorage |
| SpravaZbierky.tsx:845,850 | Správa zbierky → Doklady | Pridať položku / Priložiť doklad | Doklad uložený na overenie | Len localStorage |
| SpravaZbierky.tsx:247,919 | Správa zbierky → Doklady | Poslať zdôvodnenie | „Zdôvodnenie sme poslali“ | Len localStorage |
| SpravaZbierky.tsx:635,801 | Správa zbierky (dlhodobá) | Poslať žiadosť (zmena účelu) | Žiadosť na schválenie | Len localStorage |
| SpravaZbierky.tsx:644,697 | Správa zbierky | Stiahnuť z feedu | Zbierka stiahnutá z feedu | Len localStorage |
| SpravaZbierky.tsx:304-307 | Spravovať zbierku | Zverejniť dokladovanie | „Všetkým darcom išlo oznámenie“, +karma | Oznam v localStorage, karma sa nepripíše |
| SpravaCentralnej.tsx:126 | Centrálna zbierka | Odoslať žiadosť (zmena účtu) | „Žiadosť sme poslali“ | Len pamäť relácie |
| SpravaCentralnej.tsx:72,156,177,196 | Centrálna → sektory | Pridať / premenovať / zmazať sektor | Sektor uložený | Len pamäť relácie |
| SpravaCentralnej.tsx:178 | Centrálna zbierka | Zavrieť zbierku | Zbierka je zavretá | Len pamäť relácie |
| NovyOznam.tsx:216,420 | Oznamy | Uložiť / Áno, zrušiť | „Prihláseným pošleme správu“ | Oznam v DB, správu nikto nepošle |
| NovyOznam.tsx:219 | Oznamy | Zverejniť nad limit | „Verejný oznam nad limit · 20 €“ | Nič sa neúčtuje |
| NovyOznam.tsx:433-434 | Oznamy → nastavenia | Pripomienka deň pred / Správa pri zmene | Automatické správy | Len pamäť |
| PribehEditor.tsx:69-71 | Správa zbierky → Príbeh | Pridať zápis | „Darcovia dostali upozornenie“ | Zápis v DB, upozornenie len localStorage |
| spravaCasti.tsx:197 | Správa zbierky → Štatistiky | Stiahnuť prehľad (CSV) | „CSV pripraví server“ | Len toast |
| SkutkyCharity.tsx:69,76 | Správa → Skutky | Uložiť úpravu / Stiahnuť | Skutok upravený / stiahnutý | Len localStorage a cache |
| MojDeedFiremny.tsx:404,527 | Môj DEED+ firemný → Paywall | Aktivovať T1–T4 | „T2 aktivovaný“ | Tier v localStorage, bez platby |
| MojDeedFiremny.tsx:491-507 | Môj DEED+ firemný → Prehľad | „Dnes prišlo“ | Živý tok darov | Math.random každé 4 s |
| MojDeedFiremny.tsx:223 + obsah.ts:93 | Môj DEED+ firemný / Podstránka | Štatistiky, celý subjekt | Údaje organizácie | Mock SUBJEKTY |
| MojDeedFiremny.tsx:167 | Môj DEED+ firemný → Prehľad | Riadky blokov | Otvorí detail | Len toast |
| MojDeedFiremny.tsx:563 | Zbierky organizácie | + Vytvoriť zbierku | „Zbierka vytvorená ako koncept“ | Len localStorage |
| MojDeedFiremny.tsx:612 | Tvorca → Príspevky | Prepínač príspevkov | Tlačidlo podpory na profile | Len localStorage, tlačidlo vedie na toast |
| MojDeedFiremny.tsx:637-641 | Adresár firiem | Riadok firmy | Otvorí profil firmy | Mock firmy, len toast |
| MojDeedFiremny.tsx:385-396 + UpravProfil.tsx:151 | Upraviť profil (firemný) | Uložiť | „Profil uložený“ | Logo, cover, tel., e-mail len localStorage |
| CentralnaZbierka.tsx:59 | Centrálna zbierka | Spustiť | „Spustená — je na vašom profile“ | Len localStorage |
| SektoroveZbierky.tsx:54,56,79,83 | Sektorové zbierky | Pridať sektor / Spustiť | Sektor pridaný, zbierka spustená | Len localStorage |
| NastrojeCharity.tsx:83 | Iskry / Video | Zverejniť video | „Video zverejnené · 10 € (demo platba)“ | localStorage + IndexedDB, bez platby |
| NastrojeCharity.tsx:177 | Prehľad darcov | Poslať poďakovanie | „Poďakovanie odoslané darcom“ | Len localStorage |
| NastrojeCharity.tsx:284 | Viditeľnosť súm | Prepínače | „Uložené — platí na verejnom profile“ | Len tento prehliadač |
| Inzeraty.tsx:183,186,374,378,380 | Inzeráty | Zverejniť / Obsadené / Zmazať | Ponuka na profile, záujemcom sa poďakujeme | Len localStorage |
| Inzeraty.tsx:455,462 | Inzerát (verejný) | Mám záujem / Zrušiť | „Organizácia sa ozve“ | Len localStorage, organizácia nič nedostane |
| Vyzvy.tsx:81 | Výzvy tvorcu | Vyžrebovať | Vyžrebovaní výhercovia | Len localStorage |
| NaseZbierky.tsx:265-266 | Naše zbierky (firma) | Stiahnuť / Vrátiť na stránku | „Stiahnuté zo stránky“ | Len localStorage |
| NaseZbierky.tsx:175-179,275 | Naše zbierky (firma) | Uhradiť (doliatie) | Platba doliatia | Simulovaná platba, do DB len strop |
| Podstranka.tsx:273,283 | Verejný profil | Dar cez modul | „Ďakujeme za dar“ | Dar v pamäti, bez platby |
| Podstranka.tsx:769,775 | Verejný profil | Sledovať / Zvonček | „Sleduješ“, „Upozornenia zapnuté“ | Len useState |
| Podstranka.tsx:436,556,746 | Verejný profil | Prehrať video / detail / Podporiť tvorcu | Prehrá, otvorí, podporí | Len toast |
| SpravaFarnosti.tsx:42,50,90,162,318 | Správa farnosti | Čísla, zbierky, Treba vybaviť, peňaženka | Údaje farnosti | Mock pre každú farnosť |
| OverenieUctu.tsx:37 | Nová zbierka → overenie účtu | DEV simulovať overenie | Účet overený | Za FLAGS (vždy true) — vidí každý |
| SpravaZbierky.tsx:143,679,767,788 | Správa zbierky | DEV prepínače (vyzbierané, stav, 90 dní, Schváliť) | Testovacie | Za FLAGS.dev_tier_switcher — vidí každý |
| NovyOznam.tsx:410 | Oznamy | DEV simulovať účasť | Pridá prihláseného | Za FLAGS — vidí každý, píše vymyslené mená do DB |

### Viera — `src/features/viera` (vyčistí sa s Farnosťou v3) · 35

| Súbor:riadok | Obrazovka | Prvok | Čo tvrdí | Čo reálne robí |
|---|---|---|---|---|
| viera/Viera.tsx:69-70 | Viera domov | Domovská / sledované farnosti | Tvoja domovská a sledované | Natvrdo v useState, po reloade späť |
| viera/Viera.tsx:99,118 + ui.tsx:241 | Profil farnosti / Adresár | Áno, potvrdiť (A9) | „Domovská cirkev nastavená (súhlas A9)“ | Len useState, súhlas sa neukladá |
| viera/Viera.tsx:79,469,924; FarskyProfil.tsx:204 | Adresár, karta, profil | Srdce / + Sledovať | Sleduješ farnosť | Len pamäť |
| viera/Viera.tsx:219,431; FarskyProfil.tsx:197 | Moja farnosť / profil | Účet farára, Spravovať farnosť | Režim farára | Hocikto prepne, rola sa neoveruje |
| viera/mock.ts:374 + Viera.tsx:215-217,480 | Moja farnosť, karty | Sledujúci, vyzbierané, „0,4 km“ | Reálne štatistiky | Natvrdo, vzdialenosť sa nepočíta |
| viera/Viera.tsx:478,910,968 | Adresár, karty | Odznak Overená farnosť | Farnosť je overená | Pri každej farnosti bez podmienky |
| viera/mock.ts:125 | Feed farnosti, profil | Príspevky (FEED_ITEMS) | Príspevky farnosti | Mock |
| viera/Viera.tsx:139 | Viera hľadanie | Výsledok bez zhody | „Otváram…“ | Nič neotvorí |
| viera/Viera.tsx:800-805 | Sprievodca výberom | Zapnúť GPS | „Poloha zistená — Trenčín“ | Súradnice zahodí, vždy Trenčín |
| viera/Viera.tsx:520-526 | Detail udalosti | Pripomeň | „Pripomenieme ti deň udalosti“ | localStorage + setTimeout, pri zavretej appke nepríde |
| viera/Viera.tsx:543; FarskyProfil.tsx:103,243 | Detail zbierky / profil | Rýchle DeeD sumy | „Ďakujeme za X DeeD“ | Bez platby, dar v pamäti |
| viera/Viera.tsx:544,694; FarskyProfil.tsx:104,347 | Detail / profil | Platba → Hotovo | „Odoslané X € · farnosť“ | Simulácia, dar v pamäti |
| viera/Viera.tsx:637; FarskyProfil.tsx:57,149,227 | Detail / profil | Vyzbierané, darov spolu | Vyzbieraná suma | Mock + prírastky relácie |
| viera/Viera.tsx:589 + mock.ts:752 | Parte | Kondolencia | „Kondolencia odoslaná“ | Len toast |
| viera/Viera.tsx:643,672; FarskyProfil.tsx:242 | Detail / profil | Srdiečko / Modlím sa | Reakcia | Lokálny toggle |
| viera/ui.tsx:185-189 (Viera.tsx:606) | Detail Help prípadu | Overujem / Namietam | „Námietka odoslaná“ | Len useState |
| viera/Viera.tsx:685; FarskyProfil.tsx:414 | Detail / Moderácia | Zmazať príspevok (farár) | „Autor dostane upozornenie“ | Zmaže, upozornenie neodíde |
| viera/Viera.tsx:729-770 | Pridať zbierku (parte) | 6-miestny kód → Prepojiť | Kandidát „KYC ✓“, handshake | Kandidát vymyslený, kód sa neoveruje |
| viera/FarskyProfil.tsx:151 | Profil farnosti | S nami 2 roky, Skutky | Údaje farnosti | Natvrdo / počet zbierok |
| viera/FarskyProfil.tsx:226 | Prehľad farnosti | sledujúcich | Počet sledujúcich | Mock |
| viera/FarskyProfil.tsx:211 | Profil farnosti | Zvonček | „Upozornenia zapnuté“ | Len useState |
| viera/FarskyProfil.tsx:209,247,251,274,352 → components/qr.tsx:39 | Profil farnosti | QR na dar, QR na tlač, Zdieľať | Donačný QR farnosti | Natvrdo deed.app/s/120042 |
| viera/FarskyProfil.tsx:382 + Kalendar.tsx:245 | Správa farnosti / Rozvrh | Viditeľnosť súm zbierok | Mení, čo vidia návštevníci | Uloží sa, nič to nečíta |
| viera/FarskyProfil.tsx:580 | Upraviť profil | Prístup k Správe farnosti | Deleguje správu | Uloží príznak, bez vplyvu |
| viera/FarskyProfil.tsx:341 | Profil farnosti | Doklady o použití zverejňujeme | Doklady k dispozícii | Statický text |
| viera/Pridat.tsx:133 + UserOznamy.tsx:303 | Pridať oznam (farník) | Zaplatiť X € a publikovať | „Zaplatené X €“ | Žiadna platba |
| viera/Pridat.tsx:138,421 | Pridať → neregistrovaní | Otvoriť Help sprievodcu | „Otváram Help sprievodcu“ | Len zavrie hárok |
| viera/Pridat.tsx:497-501 | Zbierka pre registrovaných | Kód príjemcu | „KYC ✓, padne notifikácia“ | Meno vymyslené |
| viera/Pridat.tsx:478 | Formulár | Priložiť foto/video, Skenovať QR | „Príloha nahraná / QR naskenované“ | Zapíše „✓“, nič viac |
| viera/Pridat.tsx:390-394 | Zmenový oznam | Poslať push notifikáciu | Push farníkom | Hodnota sa nepoužije |
| viera/Pridat.tsx:382-386 | Oznam farára | Moja tvár v hlavičke | Fotka farára | Len ikona |
| viera/Pridat.tsx:371-378 | Zbierky farnosti | Naviazať na udalosť | Zbierka pri udalosti | Len text do popisu |
| viera/Pridat.tsx:47-48,516 | Zbierky farnosti | Publikovať zbierku, IBAN overenie | Overený IBAN, € na farský účet | Príspevok s cieľom, IBAN obyčajný text |
| viera/Kalendar.tsx:86,240 | Rozvrh omší | Uložiť a vygenerovať, Zbierka ku každej omši | „Omše a zbierky vygenerované“ | Rozvrh uložený, zbierky nevzniknú |
| viera/mock.ts:706 + Kalendar.tsx:60 | Kalendár | Udalosti | Udalosti farnosti | Rovnaký mock pri každej farnosti |

### Profil, skutky, registrácia, Iskry, reťaz, oznámenia — `src/features/…` · 69

| Súbor:riadok | Obrazovka | Prvok | Čo tvrdí | Čo reálne robí |
|---|---|---|---|---|
| lib/mojeSkutky.ts (MojeSkutky21, Pruhy) | Moje skutky | celé (denník, ohlásenie, Začínam) | Skutky uložené k účtu | Len localStorage (karta Fázy 4 č. 3) |
| profil/ProfilHlavny.tsx:229-256,280,299 | Môj profil | karma, skutky, dlaždice, pohyby | Reálne čísla používateľa | Natvrdo 2480 karmy, 48 skutkov, 1240 DeeD pre každého |
| profil/Statistiky.tsx:26,41-44,155; CestaDaru.tsx | Štatistiky / Cesta daru | celá obrazovka, Zdieľať môj rok | Moje štatistiky | Mock STATISTIKY, MOJA_CESTA |
| profil/KarmaStity.tsx:48,91 | Karma a štíty | Vyvesiť štít | Štít vidia ostatní | Len localStorage |
| profil/Penazenka18.tsx:49-50,82-84,113,120 | Peňaženka | Visa 4242, IBAN, Coinbase, EURC, Darované | Moje karty a zostatky | Natvrdo |
| profil/Penazenka18.tsx:155-159,176 | Peňaženka → Dobiť | Zaplatiť X € | „Dobité“ | Bez platby; EURC len v pamäti |
| profil/Penazenka18.tsx:62-69 | Peňaženka → Výpisy | PDF výpis mesiaca | Výpis za mesiac | Mock pohyby, každý mesiac rovnaké |
| profil/Bezpecnost24.tsx:79; Nastavenia20.tsx:92 | Potvrdiť platbu / Tvár | Uložiť, prepínač biometrie | Platby nad sumu sa potvrdia | Nikde v platbe nepoužité |
| profil/Bezpecnost24.tsx:179-180; lib/zariadenia.ts | Prihlásené zariadenia | Odhlásiť / všetky ostatné | Zariadenie odhlásené | Mock zoznam v localStorage, session ostáva |
| profil/Bezpecnost24.tsx:227-228; registracia/AuthPage.tsx:79,94 | Prihlásenie z nového zariadenia | Poslať znova / Potvrdiť | Kód poslaný a overený | Nič neodošle, prijme hocijakých 6 číslic |
| profil/Bezpecnost24.tsx:294-337 | E-mail, telefón, heslo | Overiť / Poslať kód / Potvrdiť | Zmenené, zariadenia odhlásené | Hocijakých 6 číslic, len localStorage, heslo sa nemení |
| profil/Bezpecnost24.tsx:357; lib/blokovanie.ts | Zablokovaní ľudia | Odblokovať / zoznam | Blok platí v celej appke | Demo zoznam v localStorage |
| profil/Bezpecnost24.tsx:396-398,428 | Súhlasy | Prepínače nepovinných súhlasov | Súhlas zaznamenaný | Len localStorage, dátum natvrdo |
| profil/JazykUdaje.tsx:196-199 | Stiahnuť údaje | Overiť tvárou | Overenie identity | setTimeout 700 ms |
| profil/JazykUdaje.tsx:131-145 | Stiahnuť údaje | Pripraviť / Stiahnuť | PDF/ZIP, odkaz na 7 dní | Falošný priebeh, JSON z localStorage |
| profil/Pomoc.tsx:99-106,83 | Napísať podpore | Odoslať | „Správa odoslaná“ | Len localStorage |
| profil/Pomoc.tsx:197-201 | Nahlásiť problém | Odoslať, príloha | „Pozrieme sa“ | Nič neodošle |
| profil/ZrusitUcet.tsx:53-56 | Zrušiť účet | Vybrať peniaze / Ponúknuť správu | Výber zadaný | Len toast |
| profil/ZrusitUcet.tsx:59-63,105 | Zrušiť účet → overenie | Tvár / SMS / Kľúč | Overené, SMS poslaná | setTimeout, hocijakých 6 číslic |
| profil/ZrusitUcet.tsx:65-69,74 | Zrušiť účet | Zrušiť účet | Účet uspaný, príde e-mail | Len odhlásenie |
| profil/UpravOsobnyProfil.tsx:63-69 | Upraviť profil | Uložiť | „Profil uložený“ | Adresa, o mne, súkromie len localStorage (rebríček v DB) |
| profil/UpravOsobnyProfil.tsx:158; lib/fotoentity.ts | Upraviť profil | Titulná fotka | „Titulná fotka uložená“ | Len localStorage |
| profil/MojQr.tsx:29-33,101; Zamestnavatel.tsx:357 | Môj QR / Pracovný QR | Rotujúci QR | Snímka neplatí | Hash v klientovi, server neoveruje |
| profil/Priatelia.tsx:36-52 | Priatelia | zoznam, Kam idú, Sledujem | Moji priatelia | Mock pre každého |
| profil/Priatelia.tsx:90,118 | Priatelia → žiadosť | Prijať / Odmietnuť | „Peter K. je tvoj priateľ“ | Mock, lokálny príznak |
| profil/Priatelia.tsx:140 | Kam idú priatelia | Pridať sa | Pozvánka do kalendára | Len localStorage |
| profil/Priatelia.tsx:199-203 | Priateľ → menu | Odobrať / Zablokovať | Zablokovaný | Len useState |
| profil/Priatelia.tsx:250,359 | Pridať priateľa | Pridať / Sledovať / Poslať žiadosť | „Žiadosť poslaná“ | Nič neodošle |
| profil/Priatelia.tsx:267,271-272 | Z kontaktov | Povoliť prístup | Tvoje kontakty v DEED+ | Natvrdo 3 osoby a „41“ |
| profil/Zamestnavatel.tsx:206 | Zamestnávateľ → oznámenia | Áno (stále tu pracuješ) | „Overené“ | Len localStorage |
| profil/Zamestnavatel.tsx:321; skutok/PridatSkutok.tsx:627 | Navrhnúť firemnú akciu | Poslať návrh firme | „Návrh sme poslali“ | Len localStorage (karta Fázy 4 č. 6) |
| profil/Zamestnavatel.tsx:128,181-188; lib/mojaFirma.ts | Zamestnávateľ | Nájdi firmu, oznamy, odmeny, VTO | Údaje mojej firmy | Mock |
| skutok/PridatSkutok.tsx:273-279,678-690 | Pridať skutok → opis | „AI číta… / text je v poriadku“, Návrh od AI | Kontroluje AI | Regex na vulgarizmy, lokálne formátovanie |
| skutok/PridatSkutok.tsx:321-326 | Pridať skutok → dôkazy | Požiadať o potvrdenie | Obdarovaný potvrdí | Odkaz /potvrd/{id} appka nespracuje |
| skutok/PridatSkutok.tsx:330-342 | Skupinový skutok | Pozvať / Pozvať kolegov | Účastník sa pridá | Odkaz nefunguje |
| skutok/PridatSkutok.tsx:317-320 | Pridať skutok → dôkazy | Pridať doklad | Doklad priložený | Len názov súboru |
| skutok/PridatSkutok.tsx:445-447,940 | Ohlásený skutok | Pridať (plán) | Ohlásenie vo feede | Len localStorage |
| skutok/PridatSkutok.tsx:924,980-982 | Skutok ako dar | Hotovo | Odmeny idú na zbierku | Feed nemá zbierku, lokálny záznam |
| skutok/PridatSkutok.tsx:485-490,999 | Hotovo → Reťaz dobra | Zapečatiť reťaz | „Reťaz zapečatená“ | Len localStorage |
| skutok/PridatSkutok.tsx:900-906,966-969 | Hotovo → QR skutku | QR / Zdieľať | Kto naskenuje, pošle príspevok | /s/{id} appka nespracuje |
| skutok/Akcia.tsx:62-70,164 | Osobná akcia | Sken QR účastníka | Overený skenom | Server neoveruje |
| skutok/Akcia.tsx:107-110,174 | Akcia za charitu | Odobrať dobrovoľníka | Stratí karmu | Len lokálny stav |
| registracia/OsobaB.tsx:155-159,255-256 | Registrácia → Platba | Overiť kartu | Karta overená 0 € | Čaká 900 ms |
| registracia/OsobaB.tsx:173-179 | Registrácia → Doklad a selfie | Spustiť overenie | Didit doklad a selfie | Žiadna kamera, animácia |
| registracia/OsobaB.tsx:111-115,237 | Registrácia → SMS | Poslať kód | Kód príde SMS | Demo: server vráti kód, vyplní sa sám |
| registracia/OsobaB.tsx:145,247 | Registrácia → Heslo | Odomykať tvárou | Face ID | Len príznak |
| registracia/CharitaB.tsx:51-56,126; lib/db.ts:82 | Registrácia charity → IČO | Áno, to sme my | Údaje z registra | Vymyslené údaje |
| registracia/CharitaB.tsx:67-70 | Registrácia charity → Štatutár | Registrujem za štatutára | „Pošleme pozvánku“ | Nič sa nepošle |
| registracia/CharitaB.tsx:73,138 | Registrácia charity → Stanovy | Nahrať stanovy | Stanovy overené | Len názov súboru |
| registracia/CharitaB.tsx:94-96 | Registrácia charity → Hotovo | Do Správy organizácie | Spravuješ novú organizáciu | Demo stránka „svetlo“ |
| iskry/Iskry.tsx:226-229 | Iskry → dar | Rýchla suma | Dar odoslaný | Bez platby, len v pamäti |
| iskry/Iskry.tsx:288,291,447; lib/iskry.ts:151-157 | Iskry | Iskra / Sledovať / Overujem | Páči sa, sledujem | Len v pamäti |
| iskry/Iskry.tsx:471; lib/iskry.ts:160 | Iskry → Namietam | Odoslať námietku | „Námietku sme prijali“ | Len v pamäti |
| iskry/PridatIskru.tsx:166-173 | Pridať Iskru (Zbierky) | Zverejniť | Iskra zverejnená | Blob URL v pamäti |
| cudzi-profil/CudziProfil.tsx:246-250 | Kampaň organizácie | Podporiť DeeD | „Ďakujeme za X DeeD“ | Lokálne počítadlo |
| cudzi-profil/CudziProfil.tsx:190,196 | Profil organizácie | Sledovať / Zvonček | Upozornenia na kampane | localStorage / useState |
| cudzi-profil/CudziProfil.tsx:354,372 | Profil osoby | Pridať priateľa / Správa | „Žiadosť odoslaná“ | Lokálny stav / toast |
| cudzi-profil/CudziProfil.tsx:217 | Profil organizácie | QR kód profilu | QR tohto profilu | Natvrdo „detska-nemocnica“ |
| cudzi-profil/orgy.ts; CudziProfil.tsx:345,376 | Cudzí profil | kampane, spoloční priatelia | Údaje subjektu | Mock |
| cudzi-profil/CudziProfil.tsx:226-228 | Cudzí profil | Zmeniť fotky | „Fotka uložená“ | FOTO_TEST_REZIM: hocikto, len localStorage |
| retaz/RetazDobra.tsx:43,58-66 | Reťaz dobra | Potvrdiť (% sa zafixuje) | Reťaz zamknutá | Chyba sa prehltne, ukáže úspech |
| retaz/RetazDobra.tsx:168 | Reťaz → hotovo | Zdieľať skutok + QR | „QR zdieľané“ | Len toast |
| retaz/RetazDobra.tsx:128; MojaRetaz.tsx:261 | Reťaz → výber | Naskenovať QR | Sken | Len toast |
| retaz/MojaRetaz.tsx:31,54-58,205 | Moja reťaz | Zverejniť | „Reťaz zverejnená · zamknutá“ | Len useState |
| retaz/RetazPodstranka.tsx:22,36-38,130 | Podstránka reťaze | Poslať sumu | Dar odoslaný | Mock reťaz, falošná platba |
| notifikacie/Notifikacie.tsx:116-119 | Oznámenia | Bol som pri tom / Nebol / Prijať | Potvrdené, ste priatelia | Len toast |
| notifikacie/Notifikacie.tsx:193-262 | Nastavenia oznámení | Prepínače, strop, Nerušiť | Oznámenia sa riadia nastavením | Uložené, nikde sa nečítajú |
| notifikacie/Notifikacie.tsx:79-81 | Oznámenia → Zamestnávateľ | Oznámenia od firmy | Správy od firmy | Mock |
| fun/FunZona.tsx:23,59 | Fun zóna | 😂 +1 | Pridá pobavenie | Len toast, obsah mock |

### Moduly feedov, verejné profily, zbierky, platby, spoločné komponenty · 51

| Súbor:riadok | Obrazovka | Prvok | Čo tvrdí | Čo reálne robí |
|---|---|---|---|---|
| domov/Domov.tsx:216; help/Help.tsx:189; charita/Charita.tsx:277 | Menu ☰ | Ukáž svoj talent | Otvorí talent kanál | Len toast |
| domov/Domov.tsx:223; aktivity/Aktivity.tsx:285; charita/Charita.tsx:320 | Riadok štatistík | „9 480“, „12 840 za mesiac“ | Mesačné štatistiky | Natvrdo |
| charita/Charita.tsx:286; aktivity/Aktivity.tsx:267; top/Top.tsx:72 | Hlavička modulu | Karma „Gold“, „Silver“ | Karma používateľa | Natvrdo |
| domov/Domov.tsx:531,535,541 | Správa mojej zbierky | Podať vyúčtovanie, Odoslať darcom | „Odoslané na kontrolu / darcom“ | Uloží do DB, nikomu nič neodíde |
| domov/Domov.tsx:925 | Overenie skutku | Overujem / Podávam námietku | „Preverí AI + overenie“ | Len toast, text a fotky sa zahodia |
| domov/Domov.tsx:1175 | Detail udalosti (aj Help, Charita) | Zúčastním sa | „Prihlásené“, QR vstupenka | Len toast |
| domov/Domov.tsx:818; help/Help.tsx:385,394; aktivity/Aktivity.tsx:482,579; components/platba.tsx:365 | Detaily | Páči sa ti to | Like započítaný | Lokálny toggle, Help natvrdo 140 |
| help/Help.tsx:171 | Help feed | Pás živých darov | „Niekto práve poslal X“ | Mock každé 3,5 s |
| help/Help.tsx:317,323 | Detail žiadosti | DeeD sumy / platba | „Odoslané · záznam 0x…“ | Náhodný hash, dar v pamäti |
| help/Help.tsx:751 | Žiadosť v zastúpení | Overiť účet (micro-deposit) | „Účet overený“ | Len príznak |
| help/HelpKit.tsx:99,107-133 | Finančná žiadosť | Kontroly „OK“, AI poznámka | KYC/limit/AI kontrola | Vždy prejde |
| components/layout.tsx:154 (Help.tsx:863) | Žiadosť krok 4 | ＋ doložiť | Nahranie dokladu | Bez onClick |
| help/Help.tsx:766,793 | Cez Charitu | Nájsť vhodné charity | Charity v okolí | Mock zoznam |
| help/Help.tsx:103,149 | Po zverejnení s rozdelením | Split QR autora | Tvoj QR reťaze | Pri chybe DB demo odkaz |
| charita/Charita.tsx:294 | Charita feed | Pás | „Nádej pacientom práve dostala 100 DeeD“ | Natvrdo |
| charita/Charita.tsx:386-410 | Charita feed | Karty zbierok (Kováčová, Motýlik…) | Živé zbierky, „Nordika pridala 500 €“ | Natvrdo |
| charita/Charita.tsx:442-444 | Charita → Pridať | Dobrovoľníctvo, Iná pomoc, Dôkaz | Otvorí sprievodcu | Len toast |
| charita/Charita.tsx:206 | Charita hľadanie | Výsledok | Otvorí položku | Len toast |
| aktivity/Aktivity.tsx:142-155,483 | Detail skutku/akcie | DeeD sumy | „Tvoja podpora letí…“ | Bez platby |
| aktivity/Aktivity.tsx:157,449,494,498 | Detail skutku | Overujem / Namietam + počty | „Preverí AI“ | Lokálne; počty zo vzorca |
| aktivity/Aktivity.tsx:279 | Aktivity feed | Pás | „Cyklo TN práve dostal 100 DeeD“ | Natvrdo |
| aktivity/Aktivity.tsx:548,554 | Detail workshopu | Prihlásiť sa / a zaplatiť | „Prihlásené (a zaplatené)“ | Len oslava, platba simulovaná |
| aktivity/Aktivity.tsx:575 | Hľadám pomoc | Môžem pomôcť | „Otvorili sme chat“ | Žiadny chat |
| aktivity/Aktivity.tsx:580,587 | Hľadám pomoc | DeeD sumy / platba | „Ďakujeme / Odoslané“ | Len toast |
| aktivity/Aktivity.tsx:664-672,708 | Pridať workshop / žiadosť | Vytvoriť, Zverejniť | Vo feede, AI kontrola | Len localStorage, bez AI |
| aktivity/Aktivity.tsx:544,739,798 | Workshop / Nástenka / profil | Ďalšie workshopy, udalosť, Správa | Otvorí obsah | Len toast, mock EVENTS |
| aktivity/Aktivity.tsx:137,795 | Profil osoby | + Sledovať | Sleduješ osobu | Lokálny stav |
| aktivity/Aktivity.tsx:808,810 + lib/fotoentity.ts:17 | Profil osoby | Zmena fotiek | „Fotka uložená“ | Len localStorage, FOTO_TEST_REZIM = true |
| mapa/Mapa.tsx:144 | Mapa | Zapnúť (GPS) | „Poloha zapnutá“ | Polohu nezisťuje |
| mapa/Mapa.tsx:205 | Mapa | Použiť rádius | „Rádius nastavený“ | Len toast |
| verejny-profil/VerejnyProfil.tsx:42 | Verejné profily (charita, firma, tvorca, farnosť) | Celé obrazovky | Profil subjektu | Dáta z lib/testProfily |
| verejny-profil/Kronika.tsx:89; StrankaFirmy.tsx:39; charitaCasti.tsx:31; StreamZbierka.tsx:40 | Verejné profily | Pás „Naživo“ | Posledný dar práve teraz | Točí testovacie mená |
| verejny-profil/StrankaTvorcu.tsx:193,215 + ObsahTvorcu.tsx:82 | Stránka tvorcu | Podrž, zaplať a odomkni | Nákup | Mimo testu nič |
| verejny-profil/StrankaTvorcu.tsx:60 | Stránka tvorcu | Sledovať · N | Sleduješ tvorcu | Lokálny toggle, počet mock |
| verejny-profil/casti.tsx:136 | Štít profilu | Ako sa štít získava | Odkaz na vysvetlenie | Nič |
| zbierka/ZbierkaModul.tsx:75,110 | Detail zbierky | Cieľ zbierky | „z 2 200 €“ | Bez cieľa doplní DEV cieľ aj mimo testu |
| zbierka/Platba.tsx:74-77 | Platobné okno zbierky | Podrž a zaplať | „Overujem kartu… / Posielam“ | setTimeout 1,8 s, dar v pamäti |
| zbierka/Platba.tsx:303-309 | Platobné okno | Visa •••• 4242 / Zmeniť | Uložená karta | Natvrdo, Zmeniť = toast |
| zbierka/Platba.tsx:231 | Poďakovanie po dare | Registrovať | Registrácia s pripísaním daru | Len toast |
| zbierka/Sumy.tsx:68 | Detail zbierky | DeeD dlaždice | „Klik a hneď odíde“ | Animácia, dar v pamäti |
| zbierka/PodporitDeed.tsx:16 | Podporiť DEED | DeeD / € dlaždice | „Ďakujeme, podpora DEED“ | Nič |
| zbierka/PravidelnaHarok.tsx:103-114 | Pravidelná podpora | Potvrdiť | „Hotovo“, „podporuje N ľudí“ | Hosť len localStorage, chyba DB sa zahodí |
| zbierka/RetazDobra.tsx:152 + lib/retaz.ts:50 | Reťaz dobra | Podrž a zapečať | Reťaz zapečatená | Len localStorage |
| zbierka/DorovnanieFirmy.tsx:75 | Dorovnanie firmy | Uhradiť rozpočet | Rozpočet uhradený | setTimeout, bez platby (pečať v DB) |
| zbierka/Riadky.tsx:26 | Detail zbierky | Páči sa mi | Like | Lokálny toggle |
| components/platba.tsx:33,153-164,229,249 | Platobné okno (všade) | Podrž a zaplať | ID transakcie, hash, karta, zostatok | setTimeout 1,8 s, náhodné TX, zostatok 1240 natvrdo |
| components/platobnymodul.tsx:151 | Dary v krypte | EURC suma | „Ďakujeme za dar X EURC“ | Bez handlera len toast |
| components/podporadeed.tsx:44-46,99,105 | Podporiť DEED+ | 50/100/300 DeeD, € | „Ďakujeme za podporu“ | Bez platby |
| lib/darcovia.ts:89-112 (zoznamdarcov.tsx) | Zoznam darcov (všade) | Posledné dary | Skutoční darcovia | 7 vymyslených darcov ku každej zbierke |
| components/splitqr.tsx:84 | Split QR | Vytvoriť QR reťaze | „QR vytvorený, % zafixované“ | Pri chybe DB aj tak úspech + demo odkaz |
| components/hladanie.tsx:21,77,107 | Hľadanie (všetky moduly) | Subjekty, Posledné | Výsledky, história | Mock, bez onSubjekt len toast |

---

## Štruktúra priečinkov

> Pôvodný plán z 2026-06-25 počítal s priečinkami ako `app/Router.tsx`,
> `components/icons/`, `data/repos/` či `theme/`. Reálne sa postavila plochšia
> štruktúra (`components/*.tsx`, `data/*.supabase.ts`, `theme.ts` + `tokens.ts`)
> a navigácia sa vyriešila bez routera cez `lib/urlnav.ts`.
> **Aktuálnu mapu kódu má [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** —
> tento plán sa už nepoužíva a bol odstránený, aby neposielal hľadať
> neexistujúce súbory.

---

## Stav na štarte (2026-06-25)

> Historický snímok pri štarte migrácie. **Aktuálny stav projektu je
> v [README.md → Stav projektu](README.md#stav-projektu).**

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
