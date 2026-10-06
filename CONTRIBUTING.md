# Ako pracovať v tomto repe

Krátko: pred pushom `npm run verify`, drž sa existujúcich vzorov, farby ber
z tokenov. Zvyšok je detail.

Ak si tu prvýkrát, prečítaj [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — má
mapu kódu a sekciu „Kam čo patrí".

---

## Pracovný postup

```bash
git switch -c feat/nazov-zmeny
# … práca …
npm run verify                 # typecheck + lint + build
git commit
```

`npm run verify` je to isté, čo beží v CI. Keď prejde lokálne, prejde aj tam.

### Commit správy

Používame [Conventional Commits](https://www.conventionalcommits.org/) v slovenčine:

```
feat(profil): titulná fotka zvlášť od profilovej
fix(fotky): titulná fotka 16:9 aj v profile
refactor(platby): odstránenie SMS ako kanálu príspevku
docs: presun špecifikácií do docs/
chore(lint): ESLint 10 + Prettier
```

Typy: `feat`, `fix`, `refactor`, `docs`, `chore`, `ci`, `perf`, `style`.
Scope = modul alebo oblasť (`good`, `help`, `charita`, `viera`, `platby`, `qr`, `profil`…).

V tele commitu píš **prečo**, nie čo — „čo" je vidieť z diffu.

---

## Jazyk kódu

Projekt je celý po slovensky — názvy premenných, funkcií, komponentov, typov
aj komentárov. Nemiešaj angličtinu, aj keď je to zvyk.

```tsx
// takto
export function ZoznamDarcov({ zbierka, onZavri }: ZoznamDarcovProps) { }
const vyzbierane = darcovia.reduce((s, d) => s + d.suma, 0);

// nie takto
export function DonorList({ collection, onClose }: DonorListProps) { }
```

Diakritika v identifikátoroch sa nepoužíva (`prispevok`, nie `príspevok`),
v komentároch a UI textoch áno.

---

## Štýl kódu

### Formátovanie

Prettier je nakonfigurovaný ([.prettierrc.json](.prettierrc.json)), ale
codebase **nie je** hromadne preformátovaný — reformát 29 000 riadkov by
zahodil git blame. Preto:

- Nový súbor → pokojne `npx prettier --write <súbor>`.
- Existujúci súbor → **neformátuj celý**, len píš v štýle okolia. Inak sa
  v diffe stratí skutočná zmena.
- `npm run format:check` zámerne nie je v CI.

### Štýlovanie UI

Appka štýluje cez inline `style={{}}` s tokenmi z `@/theme`. Žiadny Tailwind
ani CSS moduly — je to zámer, nie nedokončená migrácia.

```tsx
// takto — tokeny, theme-aware farby
<div style={{ padding: SPACE.sm, borderRadius: RADIUS.md, background: C.surface2, border: `1px solid ${C.line}` }}>

// nie takto — rozbije svetlý motív a rozchádza sa so škálou
<div style={{ padding: 13, borderRadius: 14, background: "rgba(255,255,255,.07)", border: "1px solid #222" }}>
```

Pravidlo, ktoré platí bez výnimky: **žiadna farba natvrdo.** Štruktúrne farby
sa medzi svetlým a tmavým motívom prepínajú cez CSS premenné. Hardcoded
`#fff` alebo `rgba(255,255,255,…)` funguje v tmavom a rozbije svetlý.

### Používaj, čo už existuje

Pred novým komponentom sa pozri do tabuľky v
[ARCHITECTURE §6](docs/ARCHITECTURE.md#6-zdieľané-komponenty). Najčastejšie
zbytočne prepisované veci:

- platobná sekcia → `<PlatobnyModul>` (nie `PodporaSekcia` priamo)
- bottom sheet → `Sheet`
- stavy zoznamu → `FeedSkeleton` / `EmptyState` / `ErrorState`
- karma badge → `<Stit>`, **nikdy** progress bar ani percentá

### Dáta

Komponent nikdy nečíta mock pole priamo ani nevolá `supabase.from(...)`.
Vždy cez hook z `@/data`. Detaily v [ARCHITECTURE §3](docs/ARCHITECTURE.md#3-dátová-vrstva--jediný-švík).

### Migrácie

Pred založením novej migrácie vždy `git pull` a číslo ber až po ňom (najvyššie číslo v `supabase/migrations/` + 1).
Pushnutá migrácia sa nikdy nemení — každá zmena je nová migrácia. Čistú DB zo všetkých migrácií overíš
`bash scripts/db-z-migracii.sh` (beží aj v CI a spadne na kolízii čísel).

### Navigácia

Každý sheet, detail a overlay, ktorý sa dá zavrieť, musí registrovať vrstvu:

```tsx
useVrstva(otvorene, () => setOtvorene(false));
```

Bez toho hardvérové Back na Androide nezavrie overlay, ale vyhodí
používateľa z appky.

---

## Lint

`npm run lint` musí prejsť bez **errorov**. Warningy sú tolerované — dnes
ich je ~142 a sú dvoch druhov:

1. **`@typescript-eslint/no-explicit-any`** (~96) — `any` na hraniciach
   k Supabase a 3rd-party. Nepridávaj nové, existujúce sa uprace postupne.
2. **React-Compiler pravidlá** (`static-components`, `set-state-in-effect`,
   `refs`, `purity`) — odporúčania na výkon z `eslint-plugin-react-hooks` v7.
   Nie sú to chyby v bežiacej appke.

Nové warningy nepridávaj. Keď ich číslo klesne na nulu, prepni príslušné
pravidlá v [eslint.config.js](eslint.config.js) na `error`.

`// eslint-disable-next-line` používaj len s komentárom prečo.

---

## Čo overiť pred pushom

Unit testy neexistujú. `npm run verify` spustí typecheck, lint, build a smoke
test (ten otvorí moduly a detaily v skutočnom prehliadači) — zvyšok je manuálny:

- [ ] `npm run verify` prejde
- [ ] Svetlý **aj** tmavý motív (prepínač je v menu „Viac" a v Profile)
- [ ] Mobilná šírka (~390 px) aj desktop (~1280 px)
- [ ] Hardvérové Back zatvorí overlay, nie appku
- [ ] Ak si sa dotkol dát: skús to s `VITE_USE_MOCK=1` aj `=0`

Podrobný postup vrátane headless Chrome je v
[.claude/skills/verify/SKILL.md](.claude/skills/verify/SKILL.md).

### Smoke test

[scripts/smoke.mjs](scripts/smoke.mjs) je jediná automatická kontrola
správania. Otvorí každý modul cez `/m/<id>`, klikne do detailu príspevku
a overí, že sa vykreslil platobný modul a že nič nevyhodilo chybu do konzoly.

Jednorazovo si stiahni prehliadač: `npx playwright install chromium`.

Keď pridávaš **nový modul**, dopíš jeho ID do poľa `MODULY` v tom skripte —
inak ho CI nikdy neotvorí.

---

## Na čo si dať pozor

Veci, ktoré vyzerajú ako chyba, ale sú zámer:

| Vyzerá zvláštne | Prečo to tak je |
| --- | --- |
| Modul `nabozenstvo`, priečinok `viera/`, v UI „Viera" | Premenovanie len v UI; ID a DB kľúče (`naboz_*`) by potrebovali migráciu |
| `shared.tsx` má 3 riadky | Tenký barrel, drží staré importy `@/shared` funkčné |
| `noImplicitAny: false` | Historický kompromis z JS → TS migrácie |
| Inline štýly všade | Zámer — jeden zdroj pravdy pre motív |
| Chýbajúca migrácia `0006` | Číslovanie má medzery, poradie je podľa čísla |
| `.env.local` nie je v repe | Správne — je negitovaný, šablóna je `.env.example` |

**Repozitár musí ostať privátny** — `api/_lib/prompt.ts` a
`api/_lib/scoring-config.json` obsahujú produkčný prompt a kalibračné
parametre AI hodnotenia.

**RLS politiky sú otvorené (`using (true)`) a takto sa nesmie ísť do
produkcie.** Kým je v DB testovací obsah, je to v poriadku; pred prvým reálnym
používateľom to treba prerobiť. Vysvetlenie je v
[README → Bezpečnosť](README.md#bezpečnosť--čítaj-pred-prvým-reálnym-používateľom).
