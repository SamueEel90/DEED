# Zdroj 24 · Odovzdávka Paľo 24. 10. → nový Paľo (verbatim) + poznámky Fera

## Poznámky Fera (prelustrované proti registru 24. 10.)
- Odovzdávka sedí s registrom; model účtov, 1:1, podržanie, stav repa OK.
- OPRAVIŤ pred odovzdaním: percentá presne (reťaz min 5 %, KROK 5, max 100; split QR MIMO Viery min 5 %, vo Viere povolená aj 0).
- OPRAVIŤ: checklist pred ostrou zlúčiť — pokladňa → zmaz_testovacie → trial + ostry_start() test poistiek + reálne overenie účtu sektora + počítadlo pravidelných darcov.
- Postup výmeny (Martin): špecialista dodá správu so zmenami → nový Paľo si kód najprv prelustruje sám, prečíta správu a nové MD, až potom zadanie.
- Nové platné: svadobná a Oslava a iné dostávajú jubilejný (teplý) text správy po ukončení; iný text pre svadbu = nové zadanie.

# Odovzdávka · Paľo (kóder) · 24. 10. 2026 → nový Paľo od 25. 10.

Si Paľo, kóder DEEDproject (React + TypeScript + Supabase) pre Martina Štofika. Martin zadáva, Soňa kreslí prototypy a píše balíky, Fero vedie register dohôd (`fero-register/REGISTER.md`), Samuel spúšťa migrácie a nasadzuje. Odpovedáš Martinovi krátko po slovensky v tvare **hotové · odchýlky · otázky**.

---

## 1. Pravidlá bez výnimiek

- **Kľúč service_role neposielaj.**
- **Pushnutá migrácia sa nikdy nemení, každá zmena = nová migrácia.**
- **Migráciu pošli Samuelovi, sám ju nespúšťaj.** (Pošle ju Martin, ty ju zapíšeš do „Odkazy pre Samuela“.)
- **Čo sa počíta, existuje ako pohyb.** Žiadne číslo, ktoré nemá záznam na serveri.
- **Na skutočnej stránke nič vymyslené.** Ukazujeme len to, čo je. Keď nič, tak nič, a nič nesľubujeme.
- **Pri „potom“ STOP.** „Teraz nerobíme“ = nešahať.
- **Dohodnuté sa berie 1 : 1.** Keď je niečo overené a funkčné (napr. centrálna zbierka farnosti), použi presne ten vzor. Žiadne improvizácie, kým zadanie nežiada inak. (Martin 24. 10.)
- **Nič sa neukladá samo.** Len cez „Podržte a uložte“ (balík 48 bod 0b). Samoukladanie raz spôsobilo prázdnu sektorovú aj centrálnu zbierku.
- Zmeny dát v produkcii len s výslovným OK od Martina.
- V UI žiadne emoji ani angličtina. Každú zmenu over na PC, 375 px a v tmavom režime.
- Jedna zmena naraz. Žiadne nevyžiadané návrhy.
- Keď je DB job v CI červený, žiadne nové migrácie.

### Samostatné pravidlo · účty charity (Martin 24. 10.)
**Charita nie je farnosť.**
- **Farnosť:** jeden účet, všetko ide na hlavnú zbierku.
- **Charita:** centrálna zbierka má centrálny účet. **Každá ďalšia zbierka (sektorová aj bežná) môže mať vlastný transparentný účet** od tvorby. Nič sa nezlieva.
- Nikdy nestavaj charitu na farskom vzore „všetko na jeden účet“. Migrácia 0174 sa týka **len** zbierky `<stránka>:hlavna` (centrálna): zavrie ju pri ukončení, otvorí pri novej centrálnej. Overené v kóde (OPRAVY 536, commit 9a244ee).

### Tri mechanizmy percent (nikdy nemiešať)
- Reťaz tvorcu: minimum 5 %.
- Overovateľ súkromnej zbierky (pohrebná, jubilejná): najviac 3 % a 100 €, bez minima.
- Split vo Viere: 0 %.

---

## 2. Stav repozitára (24. 10., 2:30)

- iMac `/Users/Solarprojekt/Documents/DEED`, vetva **`platby-modul`**. V shelli na Macu je to `$HOME/mnt/DEED`.
- Posledné commity: **a0d552c OPRAVY 538**, **6a62267 OPRAVY 537**. Oba **čakajú na push**. Device shell vie commitnúť, nevie pushnúť. Push robí Martin (`git push`).
- Kontroly na a0d552c:
  - typecheck 0 chýb,
  - eslint 0 chýb (255 starých upozornení),
  - smoke prešiel,
  - čistá DB 0001 až 0175 a všetky DB testy OK.
- Pracovná kópia v kontajneri bola zhodná s Macom (md5 `src` aj `supabase`).
- **Posledná migrácia: 0175.** Ďalšia bude 0176.
- **Posledné OPRAVY: 538.** Ďalšie 539. Pozor: Soňa čísluje balíky podľa svojho zoznamu. Ak číslo z balíka už je použité, povedz to Martinovi (534 už bolo použité, preto Oznamy dostali 538).
- **Odkazy pre Samuela** (projektové dokumenty `claude/Odkazy_pre_Samuela_NN.md`):
  - 66: 0167 až 0170,
  - 67: 0171 až 0175 (doplnené o 0175),
  - ďalší bude 68.
  Samuelova prosba: odkazy spájať do väčších balíkov.

---

## 3. Ako pracujem (postup)

1. **Pracovná kópia v kontajneri.** Edituj tam, nie priamo na Macu.
   - Nový kontajner: naklonuj repo (`martinstofiktn-web/DEED`, vetva `platby-modul`) a urob `npm ci`. Najprv nech Martin pushne 537 a 538.
   - Potom porovnaj s Macom, napr. md5 všetkých súborov v `src` a `supabase` na oboch stranách.
2. **Kontroly pred commitom:**
   - `timeout 290 npx tsc --noEmit -p .`
   - `npx eslint <súbory>` (0 chýb).
   - Smoke: najprv vždy nový build, potom `scripts/smoke.mjs`. V kontajneri treba odrezať externé požiadavky cez `ctx.route`. Môj skript je v prílohe A.
   - DB: `PGHOST=localhost PGPORT=5433 PGUSER=postgres bash scripts/db-z-migracii.sh`. Postaví čistú DB `deed_ci` zo všetkých migrácií a pustí `supabase/tests/*.sql`.
   - Lokálny Postgres 16:
     - dáta v `/tmp/pgdeed`, port 5433,
     - spadnutý server znova spustíš: `rm -f /tmp/pgdeed/postmaster.pid; su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdeed -o '-p 5433' -l /tmp/pgdeed.log start"`,
     - v novom kontajneri najprv `initdb`.
3. **Prenos na Mac:**
   - skopíruj súbory do `/mnt/user-data/outputs/...` (príloha A, `stage.py`),
   - potom `device_commit_files` s `force: true` na `/Users/Solarprojekt/Documents/DEED/<cesta>`.
4. **Commit na Macu:** `bash $HOME/c.sh "OPRAVY NNN · …" "telo" súbory…`. Skript pridá Co-Authored-By a Claude-Session a odpratá zaseknuté `.git/*.lock`. **Riadok Claude-Session v `~/c.sh` prepíš na svoju reláciu.**
5. **Mazanie súborov na Macu** treba povoliť (`device_request_delete_permission`). Inak presuň do `_to_delete/`.
6. **Vizuálna kontrola:**
   - mock server `VITE_USE_MOCK=1 npx vite --port 5174 --strictPort` + Playwright (Chromium je predinštalovaný),
   - sedenie demo: `localStorage['deed.session']={demo:true}`, `deed.intro.v1=1`,
   - modul otvoríš z prehliadača: `import(u('/src/...'))`, kde `u` hľadá URL v `performance.getEntriesByType('resource')`,
   - užitočné: `zalozTestovaciuCharitu()` (`lib/testovaciaCharita.ts`), `otvorSpravuNa({stranka})` (`lib/mojeStranky.ts`), `ulozTiery({charita:N})` (`features/rola/stav.ts`), `nastavRozlozenie('farnost','moderne')` (`lib/rozlozenieFarnosti.ts`), `pridajPrispevok` (`features/viera/mock.ts`, oznamy farnosti).

### Pasce, na ktoré som narazil
- Po HMR zmene modulu načítaj stránku znova, inak `import(u(...))` vráti inú inštanciu modulu. Najistejšie je reštartovať vite.
- `pkill` v shelli kontajnera vráti 144 (zabije aj svoj shell). Spúšťaj ho samostatne.
- Trasa `x:Názov` v Správe: nová vetva musí byť **pred** všeobecnou vetvou `x:` (Pripravujeme), inak ju zachytí.
- DB testy:
  - trigger 0068 vždy prepíše `zbierka.koniec`; v teste ho obíď cez `set session_replication_role = replica`,
  - RLS testuj cez **security invoker** pomocnú funkciu, lebo definer obíde RLS a test prejde falošne,
  - `ucet.typ` je len `pasivny | aktivny | charita | firma | system`.
- `PodrzTlacidlo` má farby `zelena | zlata | cervena | bordova | piet` a props `obrys` a `vyska`.

---

## 4. Mapa kódu (charita a súkromné zbierky)

- **Správa charity:** `features/rola/SpravaCharity.tsx`.
  - Centrálna: `SpravaCentralnej.tsx`, `CentralnaZbierka.tsx`.
  - Zbierky: `SpravaZbierky.tsx`, `NaseZbierky.tsx`.
  - Sektory: `SektoroveZbierky.tsx`, `NovaSektorova.tsx`.
  - Program: Program screen v Správe.
- **Knižnice:**
  - `lib/sektoryCharity.ts` (server 0169),
  - `lib/sekcieCharity.ts` (číselník 0170),
  - `lib/programStranky.ts` (`useProgramStranky`, `usePozvana`, 0173),
  - `lib/pozrietAko.ts` („Pozrieť ako“ len nadol, len na zariadení),
  - `lib/novaZbierka.ts` (`ukonciZbierku`, `obnovZbierku`, `KONFIG.limitZbierokCharity`).
- **Registrácia charity:** `features/registracia/CharitaB.tsx` (krok Stanovy, povinné sekcie a podskupiny) a `RegB.tsx` (`SekcieVyber`).
- **Verejný profil:** `features/verejny-profil/VerejnyProfil.tsx`.
  - Charita: centrálna a spustené sektory, „PODPORTE NÁS“, QR ukončenej zbierky → „Zbierka skončila · ďakujeme“.
  - Farnosť: `NastenkaFarnosti.tsx` obsahuje všetky vzhľady (Nástenka, Kronika, Moderné, Konzervatívny).
- **Súkromná zbierka (pohrebná / svadobná / iné):**
  - druh je v `zbierka.nastavenie->'farnost'->>'druh'`,
  - vlastník = `zbierka_podiel` s `druh = 'prijemca'`,
  - správa po ukončení: `features/notifikacie/SpravaPoUkonceni.tsx` + 0175, odkaz upozornenia `kon:<druh>:<zbierka>`.
- **Upozornenia:**
  - tabuľka `notifikacia`, `kat` ∈ skutky, penazenka, sledovane, socialne, deed,
  - ťuk na upozornenie: `naOdkaz` v `features/notifikacie/Notifikacie.tsx`, regex prefixov `odv|prisp|nezv|vz|ovp|str|um|poz|pzs|kon`.
- **Cron na serveri:** `cron.schedule` obalený `if exists (select 1 from pg_namespace where nspname = 'cron')`. Vzor je 0153, ďalší príklad 0175.

---

## 5. Čo som urobil 24. 10. (OPRAVY 527 až 538)

| OPRAVY | Commit | Čo |
|---|---|---|
| 528 | 009d24d | Svetlo pomoci odstránené (Help karta, `public/svetlo`, skripty, výnimky vercel/vite) |
| 529 | 40adf86 | Testovacie prepínače pri charite len Štít; program charity vždy zo servera |
| 530 | 6b0e30b | 0169 `sektor_stranky`; sektory na serveri |
| 531 | e06211d | 0170 číselník sekcií (12 sekcií, 60 podskupín); registrácia: rozbaľovacie sekcie, povinné |
| 532 | a026cb1 | Profil charity: centrálna + spustené sektory, „PODPORTE NÁS“ |
| 533 | 64f3739 | Nová sektorová zbierka (obrazovka) |
| 534 | e991ad1 | Ukončenie a zmazanie centrálnej a sektora, Vrátiť späť 15 min, archív, limit zbierok; 0171, 0172 |
| 535 | f449819 | Balík 50: Pozrieť ako, Program, texty cieľa; 0173 pozvaná charita |
| 536 | 9a244ee | 0174: ručné ukončenie aj centrálna zastavia dary na serveri; QR „Zbierka skončila“; názov sektora len cez Podržte a uložte |
| 537 | 6a62267 | Balík 51: správa po ukončení súkromnej zbierky; 0175 |
| 538 | a0d552c | Balík 51 (534): Oznamy farnosti na mobile |

---

## 6. Otvorené a vedome nedokončené

- **„Pozrieť ako“** je len v appke na zariadení. Server má vždy skutočný program (rozhodnuté).
- **Rozpracovaná sektorová zbierka** (pred „Podržte a spustite“) je len v pamäti modulu. Po obnovení stránky sa stratí.
- **Overenie účtu sektora** kontroluje len tvar IBAN. Overenie účtu stránky 0,01 € je na serveri len napoly: chýba spárovanie platby z banky. Je v checkliste pred ostrou.
- **„0 ľudí dáva mesačne“ pri centrálnej** je napevno 0. Pred ostrou počítať alebo skryť (checklist).
- **Dar DEED+ v správe po ukončení** sa správa ako dnešné „Podporiť DEED+“ v module zbierky: po podržaní poďakuje, ale nezapíše platbu. Rovnako je to všade v appke. Keď bude platobný tok pre DEED+, napojí sa tu aj tam naraz (`features/zbierka/PodporitDeed.tsx`, `SpravaPoUkonceni.tsx`).
- **Svadobná zbierka** dostane jubilejnú (teplú) správu, rovnako ako „Oslava a iné“. Balík pozná len pohrebnú a jubilejnú. Ak Martin chce svadbe iný text, je to nové zadanie.
- **Oznamy v Konzervatívnom vzhľade** na mobile už mali dátum nad nadpisom v jednom riadku, len vo formáte „24. 10. · OZNAM“. Nemenil som ho.
- **Checklist pred ostrou** (register, 23. 10.):
  1. vypnúť testovaciu pokladňu,
  2. `zmaz_testovacie` (0157, dvojkrok s Martinovým áno),
  3. zapnúť skúšobnú dobu naostro.
- **Pekná adresa reťaze** `/r/{meno}-{zbierka}` pred ostrou (balík 43). Teraz nerobiť.
- **Tester charity:** po spustení 0173 nastaví Samuel SQL-om z odkazu 67 (`pozvana_mesiacov = 6`). Stránku testera doplní Martin.

---

## 7. Naostro vs. len v appke (charita a farnosť)

Stav kódu 24. 10. „Len v appke“ znamená pamäť, localStorage alebo simuláciu bez zápisu na server. V `supabase/` nie sú edge funkcie, takže párovanie bankových platieb ani faktúry na serveri zatiaľ nikde nie sú.

| Funkcia | Stav | Kde |
|---|---|---|
| Spustenie sektorovej zbierky | naostro (0169) | `lib/sektoryCharity.ts` |
| Rozpracovaná sektorová (koncept) | len v appke, po obnovení stránky preč | `rola/NovaSektorova.tsx` |
| Overenie účtu sektora | len tvar IBAN | `NovaSektorova.tsx` |
| Overenie účtu stránky (0,01 € s kódom) | polovične: žiadosť a kód idú na server (0031), spárovanie platby z banky chýba | `lib/overenieUctu.ts` |
| „Pozrieť ako“ | len v appke (rozhodnuté) | `lib/pozrietAko.ts` |
| Podporiť DEED+ (aj v správe po ukončení) | len v appke, len poďakovanie | `zbierka/PodporitDeed.tsx`, `notifikacie/SpravaPoUkonceni.tsx` |
| „Ľudí dáva mesačne“ (centrálna, sektory) | napevno 0; suma za mesiac je skutočná z ledgera | `SpravaStranky.tsx`, `lib/sektoryCharity.ts` |
| Faktúry DEED+ | len v pamäti | `lib/fakturyOrg.ts` |
| Platba predplatného farnosti | „zaplatené“ sa zapíše na server, ale platba aj faktúra sú simulované | `lib/predplatneFarnosti.ts` |
| Z-čísla / VS objektov | testovacie číslo z id, kým server nepridelí VS | `lib/cisloObjektu.ts` |
| Adresár charít (modul Charita) | naostro (stránky typu charita) | `data/charita.supabase.ts` |
| Help „Cez Charitu“ | ukážkový zoznam | `help/mock.ts` |
| Video charity nad limit | video naostro, platba 10 € simulovaná | `rola/NastrojeCharity.tsx` |
| Úradné údaje v päte farnosti (IČO, DIČ, IBAN, správca) | len v appke, predvyplnené | `lib/uradneUdaje.ts` |
| Verejné testovacie profily (charita, firma, tvorca) | len v appke | `lib/testProfily.ts` |
| Iskry: páči sa mi, sledovanie, námietky | len v relácii; samotné Iskry a videá naostro | `lib/iskry.ts` |
| Prepínače tier a rola, štít, „nová charita“ | len v testovacej verzii | `rola/stav.ts` |
| Zvončeková zbierka | naostro (0091, 0096); panel „Ďalšia omša (test)“ len v teste | `rola/SpravaZvoncek.tsx` |
| Viera stav (omše, kalendár, brigády, miesta, upozornenia, príhovor, sektory) | naostro (`naboz_stav`) | `features/viera/stav.ts` |
| Oznamy farnosti | naostro (`naboz_prispevok`) | `viera/prispevkyDB.ts` |
| Oznamy, inzeráty, ponuky charity | naostro (0073b) | `lib/oznamy.ts` |
| Správa zbierky (doklady, predĺženie, správy) | naostro (0083b) | `lib/zbierkaSprava.ts` |
| Nastavenia charity, segmenty, kontakt, videá, sumy, usporiadanie | naostro (0050, 0070b) | `rola/NastaveniaCharity.tsx`, `lib/usporiadanieStranky.ts` |
| Ateliér vzhľadu charity | naostro (0161) | `lib/atelierCharity.ts` |
| Pozvánka do správy | naostro (0125, 0167) | `lib/pozvankaSpravy.ts` |
| Naživo / Od začiatku na profile charity | naostro z ledgera | `lib/nazivoCharity.ts` |
| Limit zbierok, program, pozvaná charita, ukončenie, správa po ukončení | naostro (0172 až 0175) | `lib/novaZbierka.ts`, `lib/programStranky.ts` |

---

## Príloha A · pomocné skripty z kontajnera

`stage.py`: skopíruje súbory z pracovnej kópie do outputs a vypíše JSON pre `device_commit_files`.
```python
import sys,os,shutil,json
d=sys.argv[1]; F=sys.argv[2:]
A='<cesta k pracovnej kópii>/'
out=[]
for f in F:
    t=f'/mnt/user-data/outputs/{d}/{f}'; os.makedirs(os.path.dirname(t),exist_ok=True); shutil.copy(A+f,t)
    out.append({'stagedPath':t,'devicePath':'/Users/Solarprojekt/Documents/DEED/'+f})
print(json.dumps(out))
```

`sm.sh`: smoke vždy nad čerstvým buildom (pustiť v pracovnej kópii).
```bash
VITE_USE_MOCK=1 timeout 600 npx vite build > /tmp/build.log 2>&1 || { echo "BUILD ZLYHAL"; tail -5 /tmp/build.log; exit 1; }
python3 - <<'PY'
s=open('scripts/smoke.mjs').read()
a="const ctx = await browser.newContext({ viewport: VIEWPORT });"
s=s.replace(a,a+"\nawait ctx.route(/^https?:\\/\\/(?!localhost)/, (r) => r.fulfill({ status: 200, contentType: r.request().resourceType()==='stylesheet'?'text/css':'application/json', body: r.request().resourceType()==='stylesheet'?'':'[]' }));",1)
open('scripts/zz_smoke.mjs','w').write(s)
PY
timeout 400 node scripts/zz_smoke.mjs 2>&1 | grep -E "ZLE|SMOKE|Smoke"; rm -f scripts/zz_smoke.mjs
```

`~/c.sh` na Macu (už existuje): `bash $HOME/c.sh "správa" "telo" súbory…`. Prepíš v ňom riadok Claude-Session.

`ed.py`: náhrada textu, ktorá spadne, ak sa starý text nenájde presne raz.
```python
def ed(p, pairs, imp=None):
    s=open(p).read()
    for a,b in pairs:
        assert s.count(a)==1,(p,a[:70],s.count(a)); s=s.replace(a,b)
    if imp:
        a,b=imp; assert s.count(a)==1,(p,a[:50]); s=s.replace(a,a+b)
    open(p,'w').write(s)
```

---

Keď sa stratíš, Martin sa môže spýtať aj mňa. Drž sa registra a prototypov 1 : 1, pýtaj sa skôr, než si niečo domyslíš.
