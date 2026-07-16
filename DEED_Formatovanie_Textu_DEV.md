# DEED Formátovanie textov + médiá profilu — DEV špecifikácia v1

*Podklad pre kódovanie. Nahlásené chyby: (A) naformátovaný text sa po uložení zlial do jednej machule, (B) foto k profilu ide len cez URL a nefunguje dobre. Napísal Fero, 14. 7. 2026.*

# ČASŤ A — Texty

---

## 0 · Problém

Dlhšie texty (opis zbierky/žiadosti, oznamy, event) strácajú pri uložení alebo zobrazení odseky a konce riadkov. Užívateľ napíše štruktúrovaný text, appka ukáže jeden blok.

## 1 · Okamžitá oprava (krok 1 — hneď)

**Zachovať konce riadkov.** Nikde v pipeline (uloženie → DB → render) sa nesmú zahadzovať `\n`. Pri renderi: `\n\n` = nový odsek, `\n` = zalomenie riadku (CSS `white-space: pre-wrap` alebo prevod na `<p>`/`<br>`). Toto samo o sebe zabije 80 % problému.

## 2 · Ľahký editor (krok 2)

Pre polia s dlhším textom jednoduchý rich-text editor — LEN základ:

- tučné, kurzíva
- nadpis (jedna úroveň)
- odrážkový a číslovaný zoznam
- odkaz

Nič viac. Žiadne farby, fonty, tabuľky — texty musia vyzerať jednotne s dizajnom appky. Hotové knižnice: TipTap / Quill / ProseMirror (nech si Samo vyberie, čo sedí do stacku).

## 3 · Vkladanie z Wordu (kľúčová požiadavka)

Užívateľ si text pripraví vo Worde, skopíruje, vloží — **štruktúra musí prežiť**:

- paste handler zachytí HTML zo schránky
- prežije: odseky, zalomenia, tučné/kurzíva, zoznamy, nadpisy
- zahodí sa: fonty, farby, veľkosti, štýly, obrázky, tabuľky, všetok Word-balast (mso-* triedy, span smetie)

## 4 · Ukladanie a bezpečnosť

- Ukladať ako **sanitizované HTML s whitelistom tagov** (`p, br, strong, em, h3, ul, ol, li, a`) alebo Markdown — jedno z toho, konzistentne všade.
- Sanitizácia na SERVERI, nie len vo frontende (XSS — žiadny script, style, iframe, on* atribúty).
- Odkazy: automaticky `rel="noopener nofollow"`, otvárať mimo appky s upozornením.
- Limit dĺžky poľa podľa typu (config).

## 5 · Kde všade nasadiť

Opis zbierky/žiadosti (Help/Charita) · oznamy farnosti (Náboženstvo) · opis eventu · opis výzvy (Challenge) · dlhší text profilu organizácie. Krátke polia (nadpisy, mená) ostávajú čistý text bez formátovania.

## 6 · Akceptačné kritériá

1. Text s 3 odsekmi uložený a znovu otvorený = stále 3 odseky.
2. Copy-paste z Wordu (odseky + tučné + odrážky) → štruktúra prežije, fonty a farby nie.
3. Vloženie `<script>` alebo on* atribútu → server ho zahodí, v DB nikdy nepristane.
4. Rovnaký text vyzerá rovnako v appke aj na webe (jeden render).
5. Staré texty v DB (machule) sa zobrazia bez rozbitia — migrácia nie je nutná, len nové ukladanie.

# ČASŤ B — Fotky a videá k profilu

## 7 · Problém

Foto k profilu (cover, avatar) sa dá vložiť len cez URL — bežný správca farnosti nemá kde hostovať obrázok, URL cesta je pre neho nepoužiteľná.

## 8 · Upload obrázkov

- **Nahratie zo zariadenia** — mobil: galéria/fotoaparát, desktop: výber súboru + drag & drop. URL pole ostáva ako doplnok, nie jediná cesta.
- Prijať: jpg, png, webp, **heic** (iPhone fotí do heic — musí prejsť!). Limit veľkosti config (štart 10 MB).
- Server VŽDY re-enkóduje (webp/jpg) a vyrobí veľkosti: avatar, cover, náhľad. Re-enkódovanie zároveň zabije prípadný škodlivý obsah — kontrolovať typ podľa OBSAHU súboru, nie prípony.
- **Strip EXIF** — hlavne GPS (súkromie: fotka z fary nesie súradnice bytu).
- Orez v appke pri nahratí: cover na pomer dizajnu, avatar štvorec.

## 9 · Video

- Fáza 1: **len embed odkazom** YouTube/Vimeo — farnosti už YT kanály majú (Snina live prenosy), nič nehostujeme, žiadne náklady. Vloží odkaz, appka ukáže prehrávateľné video.
- Natívny upload videa: POTOM (hosting/streaming = peniaze, teraz nie).

## 10 · Akceptačné kritériá (médiá)

1. Správca na mobile odfotí kostol a do minúty ho má ako cover — bez URL.
2. Heic z iPhonu prejde a zobrazí sa všade.
3. Z nahranej fotky zmizne EXIF/GPS (kontrola stiahnutého súboru).
4. Súbor s falošnou príponou server odmietne.
5. YouTube odkaz sa zobrazí ako prehrávateľné video v profile.
6. Pôvodná URL cesta stále funguje.

*— Fero, 14. 7. 2026 · v1 · pre Sama —*
