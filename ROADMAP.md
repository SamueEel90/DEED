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

### Fáza 2 — Dátová vrstva (repository pattern)
Pripraviť čistý švík medzi UI a dátami — bez reálnych volaní, ešte na mocku.

- Definovať repozitár rozhrania: `FeedRepo`, `CharitaRepo`, `ProfilRepo`, `TopRepo`, `NotifRepo`, `AktivityRepo`.
- Mock implementácie (dnešné dáta) za rozhraním + selektor podľa env (`data/index.ts`).
- Zaviesť **TanStack Query** (cache, `loading/error/refetch`, optimistic updates) ako jednotný spôsob čítania dát v moduloch.
- **Hotovo, keď:** žiadny modul neimportuje mock pole priamo; všetko ide cez hook nad repozitárom.

### Fáza 3 — UI polish & produkčné detaily
Doladiť to, čo robí appku „hotovou".

- **Stavy:** skeletony, prázdne stavy, error stavy + retry pre každý zoznam a detail.
- **Dizajn-systém:** spacing/typografická škála, jednotné radiusy/tiene, motion tokeny; audit konzistencie naprieč modulmi.
- **Prístupnosť:** focus management, `aria-*`, klávesnica (modály, lightbox), kontrast v svetlom aj tmavom režime.
- **Mikro-interakcie:** prechody, haptika tlačidiel, plynulé otváranie detailov, lazy-load obrázkov.
- **Responzivita:** doladiť viacstĺpcové feedy na tablete/desktope.
- **Hotovo, keď:** klikanie appkou pôsobí ako hotový produkt — žiadne skoky, prázdne biele plochy ani nekonzistentné odsadenia.

### Fáza 4 — Reálne dáta (Supabase), modul po module
Vymeniť mock repozitáre za Supabase — bez zásahu do UI.

- Rozšíriť schému: `skutok`, `ziadost`, `zbierka`, `charita`/adresár, `rebricek`, `notifikacia`, `penazenka/transakcia`, geo-stĺpce pre rádius.
- Implementovať Supabase repozitáre (`*.supabase.ts`), prepnúť selektor; realtime tam, kde dáva zmysel (notifikácie, tickery).
- Seed reálnych/realistických dát + RLS politiky pre čítanie.
- Poradie napájania: **Good → Charita → Top → Profil/Peňaženka → Notifikácie → Aktivity → Help → Mapa**.
- **Hotovo, keď:** appka beží na reálnych dátach prihláseného používateľa, mock už len ako fallback pre vývoj.

### Fáza 5 — Produkčná pripravenosť
Z appky spraviť nasaditeľný produkt.

- **Auth:** nahradiť mock `session.js` reálnym Supabase Auth (telefón/email), zachovať demo režim len pre vývoj.
- **RLS & bezpečnosť:** kompletné politiky, audit `get_advisors`.
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
