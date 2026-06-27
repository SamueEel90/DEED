# DEED — Backend obsahovej domény (návrh)

> Cieľ: postupne **sfunkčniť appku na reálnych dátach**, modul po module, bez
> prepisovania UI. Identita/registrácia backend už existuje (0001/0002, živá DB
> `wnxisnglzrahculmqqfz`). Tu navrhujeme **obsahovú doménu** (feed, podpory,
> notifikácie…), ktorá je dnes ešte mock cez `src/data/repo.ts`.

## 1. Kde sme

| Vrstva | Stav |
|---|---|
| Identita/registrácia (`ucet`, `profil`, `zaujmy`, `lokalita`, `dar`, `organizacia`…) | ✅ v DB (19 tabuliek), wired end-to-end (`lib/db.ts`) |
| **Obsah** (skutky, žiadosti, zbierky, aktivity, podpory, notifikácie, rebríčky, peňaženka) | ❌ len mock cez `repo.ts` → toto navrhujeme |
| Švík `repo.ts` + hooky `data/hooks.ts` (TanStack Query) | ✅ pripravené (selektor mock\|supabase) |
| Algoritmus `lib/feed.ts` (okruh/prah/zoradenie) | ✅ čistá logika, ostáva **client-side** |

## 2. Princípy návrhu (potvrdené)

1. **Jadrová `prispevok`** — jedna tabuľka pre skutok/žiadosť/zbierku/talent/workshop/case. Engine polia = stĺpce (indexovateľné), modulové detaily v `data jsonb`.
2. **Feed ostáva client-side** — DB vráti kandidátov (geo-ohraničených, živých), `pripravFeed` beží ako dnes. Do SQL/RPC sa prenesie až pri škále.
3. **`ucet.id` = autor/vlastník** (FK). Seed dáta bez účtu → `autor_ucet_id NULL` + denormalizovaný `autor_nazov`.
4. **Modul po module** — prepíname cez per-modul selektor v `repo.ts`; mock ostáva fallback.
5. **Čítanie verejné, zápis neskôr** — RLS SELECT public; zápisy sa zamknú na Supabase Auth (Fáza 5). Dovtedy seed + demo identita.

## 3. Schéma — draft migrácia `0003_content_domain.sql`

6 tabuliek (+ indexy + RLS). Detail v migrácii; prehľad:

| Tabuľka | Účel | Pozn. |
|---|---|---|
| `prispevok` | jadro feedu | geo+skóre+typ stĺpce, `data jsonb` na extra |
| `udalost` | nástenka / akcie v okolí | Good/Aktivity EVENTS |
| `podpora` | „Čo podporujem" + dar na príspevok | doplnok k `dar` (pasívne) |
| `sledovanie` | koho sledujem (afinita) | dnes localStorage |
| `notifikacia` | per-user oznámenia | realtime kandidát |
| `adresar_charita` | adresár charít & OZ | `org_ucet_id?` link na registrovanú org |

**Odvodené (neskôr, SQL views/RPC — nie nové dáta):** rebríček (Top), karma, zostatok peňaženky → agregáty z `prispevok`/`podpora`.

## 4. Mapovanie `prispevok` ↔ dnešný mock

Repo mapper (`*.supabase.ts`) prevedie riadok na modulový tvar (`GoodPolozka`/`HelpFeedItem`/`CharitaFeedItem`/`AktivitaItem`). Spoločné polia 1:1, modulové z `data`:

| mock pole | stĺpec |
|---|---|
| `id`/`num` | `id` / `cislo` |
| `autor`/`nazov`/`author` | `autor_nazov` (+`autor_ini`,`autor_pfp`,`autor_karma`) |
| `typ` / `type` | `typ` |
| `kat` / `dom` | `kat` |
| `titul`/`title` / `popis`/`desc`/`pribeh` | `titul` / `popis` |
| `fotky`/`video`/`media` | `media jsonb` |
| `lat`/`lng`/`lok`/`loc` | `lat`/`lng`/`lok` |
| `skore`,`typSituacie`,`narodne`,`overene`,`topovane` | rovnomenné stĺpce |
| `ciel`/`goal`, `vyzbierane`/`raised`, `pomocnici`/`helpers` | `ciel`/`vyzbierane`/`pomocnici` |
| `seats,priceTxt,rating,profi,b2b,charLevel,comp,badgeL,tag,drr,source,size,sponzor,odbornik` | `data jsonb` |

> Aktivity má EN slovník (title/desc/dom) — mapper ho preloží na stĺpce; karty ostávajú nedotknuté.

## 5. Repo-swap architektúra

`src/data/repo.ts` dnes: `repo = mockRepo`. Po fázach:

```ts
// per-modul selektor počas migrácie (env flag na modul)
export const repo: Repo = {
  good:      USE.good      ? goodSupabase      : mockRepo.good,
  charita:   USE.charita   ? charitaSupabase   : mockRepo.charita,
  // …ostatné zatiaľ mock
};
```

`*.supabase.ts` repo = Supabase select → mapper na modulový typ. UI/hooky sa **nemenia**.

## 6. Fázový plán (poradie z ROADMAP)

Pôvodne: **Good → Charita → Top → Profil/Peňaženka → …**. **Top (C) a Profil/Peňaženka (D) sme prehodili** — živý „Top Darcovia" potrebuje reálny tok podpôr, ktorý vzniká až v D. Takže **A → B → D → C → …**.

| # | Fáza | Obsah | „Hotovo, keď" |
|---|---|---|---|
| A ✅ | **Good** | migrácia `prispevok`+`udalost` (0003), seed z mocku (0004), `good.supabase.ts`, prepnutý Domov | Domov beží na DB; okruh/feed funguje (filter client-side) |
| B ✅ | **Charita** | seed charita feedu + `adresar_charita` (0005), `charita.supabase.ts` (feed/adresar/zbierka) | Charita feed + adresár + zbierka z DB |
| D ✅ | **Profil/Peňaženka** | `podpora` ako event-log + `darca_nazov` (0006), seed darov (0007), DB vrstva v `personalizaciaStore` (`nacitajPodporyDB`/`pridajPodporuDB`), „Čo podporujem" + „Darované spolu" z DB | osobný prehľad (Čo podporujem) z DB; demo ephemerálne, reálny účet perzistuje |
| C ✅ | **Top** | `top.supabase.ts` — živý agregát: Darcovia z `podpora`, Hrdinovia z `prispevok`, Charity z `adresar_charita`; Aktivity/B2B kurátorské do času F. `Top.tsx` refaktor (CATS chrome + `useTopRebricky`) | rebríčky z DB (živé kde sú dáta, fallback na mock) |
| E ✅ | **Notifikácie** | seed broadcast `notifikacia` (0008) + `notifikacie.supabase.ts`; realtime (publikácia `supabase_realtime` + `useNotifikacieRealtime` → invaliduje na INSERT) | oznámenia z DB, live (INSERT sa prejaví bez refreshu) |
| F ✅ | **Aktivity** | seed 34 aktivít (0009, diskriminátor `data.akt=true`), `aktivity.supabase.ts` (EN mapper, id z `data.id`); `good.feed`+`top` vylučujú `data->>akt`. Engine (typ/skore/geo/dni) dopočíta klient cez `obohatit()` | Aktivity feed z DB, bez regresie Domov/Top |
| G ✅ | **Help** | seed 26 help príspevkov (0010, diskriminátor `data.help=true`), `help.supabase.ts` (SK mapper, `suma←vyzbierane`/`ludia←pomocnici`, `sponzor` z `data`); `good.feed`+`top` vylučujú `data->>help`. Help typ `charity` round-trip cez `data.typ` (stĺpec CHECK-safe `charita`) | Help feed z DB, bez regresie Domov/Top |
| H ✅ | **Mapa** | reálna mapa (Leaflet + OpenStreetMap/CARTO, bez API kľúča), body z DB (`prispevok` + `udalost`), počty v okruhu haversine na klientovi; geo doplnené udalostiam (0011). `mapa.supabase.ts` + `useMapaBody` | Mapa zobrazuje reálne body Trenčína, počty v okruhu z DB |

## 7. Seed

Seed sa **vygeneruje z existujúceho mocku** (jeden skript prejde `POLOZKY`/`MOCK_FEED`/`FEED_ITEMS`/`SEED_ITEMS`/… a spraví INSERTy s mapovaním z bodu 4), nech DB presne zodpovedá dnešnému UI. Spustí sa raz po migrácii (node skript cez Vite SSR → `0004_good_seed.sql`, `0005_charita_seed.sql`, … aplikované cez MCP/service role).

**Discriminátor Domov vs. Charita.** Domov (`good.feed`) agreguje `POLOZKY`; Charita má vlastný kurátorský feed (`FEED_ITEMS`) s bespoke `comp` kartami. Oba žijú v `prispevok`, líšia ich `data.comp`:
- Charita-page riadok = `data->>'comp' is not null` → `charita.feed()` ich berie, `good.feed()` vylučuje.
- Bespoke karty (`urgent/top/mala/zapoj/material`) nesú len engine polia (skóre/geo/dni) — obsah je v komponente; `comp:"data"` karty nesú reálny obsah. `ZBIERKA` (detail) je v `data.zbierka` urgent riadku. Adresár: `adresar_charita` + `chipy text[]` (sekciový filter), zoskupenie podľa `sekcia` v `poradí`.

## 8. Otvorené body (na neskôr)

- **Model karmy/peňaženky/skóre** — zatiaľ display placeholdery; reálny event-sourced model (transakcie → zostatok, skutky → karma) je samostatná úloha.
- **Reálne skóre** príspevkov z AI + GPS (dnes ručné v seede).
- **Write-auth + produkčné RLS** — Fáza 5 (Supabase Auth).
- **Realtime** — zapnúť pri `notifikacia` a tickeroch.

---

*Stav: Fázy A (Good) + B (Charita) + D (Profil/podpora) + C (Top) + E (Notifikácie) + F (Aktivity) + G (Help) HOTOVÉ a aplikované na živej test DB `wnxisnglzrahculmqqfz` (migrácie 0003–0010). Domov, Charita, „Čo podporujem"/„Darované spolu", Top rebríčky, Notifikácie, Aktivity a Help čítajú z DB (fallback na mock/localStorage bez `.env.local`). Top je živý agregát (Darcovia/Hrdinovia/Charity), B2B kurátorské. Notifikácie bežia z DB + realtime (INSERT do `notifikacia` sa prejaví bez refreshu). Aktivity (34) a Help (26) bežia z DB s diskriminátormi `data.akt` / `data.help` — `good.feed`+`top` ich vylučujú, bez regresie Domov/Top (Domov 43, hrdinovia-pool 31, prispevok spolu 111). Mapa (Fáza H) je reálna (Leaflet + OpenStreetMap/CARTO, bez API kľúča): body z DB (`prispevok` + `udalost`, 15/16 udalostí geo, online bez geo), počty v okruhu sa rátajú haversine na klientovi (štvrť 1–5 km, mesto/okres/kraj/krajina z `FEED_CFG`). **Všetky fázy A–H hotové.** Otvorené: Fáza 5 (Supabase Auth + produkčné RLS), reálne skóre/karma.*
