# Zdroj 19 · QR Katalóg v2 (8. 7. 2026) — extrakt z DEED_QR_Katalog_v2.docx

Uložené 23. 10. pri kontrole systémových vecí. Originál docx má Martin.

DEEDproject
DEED QR System — katalóg využití v2
Všetky použitia QR podľa typu subjektu · s priradením modulu · referenčný katalóg
v2.0 · 8. júl 2026 · Martin & Fero · NAHRÁDZA v1 · technický základ: DEED_QR_System_v1.1 (TOTP, Identity Card, balíčkové tiers, doplnenia z kontroly jún)
0 · Železné bezpečnostné pravidlá (platia pre KAŽDÝ QR)
1. PLATBA EXISTUJE LEN V SYSTÉME: sken vždy vedie na overenú podstránku príjemcu/zbierky (meno + badge + progres) — platba sa páruje výhradne tam. Mimo našich stránok sa nič nespáruje.
2. PRELEPENÝ QR = SAMOVRAŽEDNÝ ÚTOK: buď vedie mimo systém (nespáruje sa nič), alebo na overený účet podvodníka, ktorý sa musel KYC-núť vlastným dokladom — non-custody tok vedie políciu priamo k nemu. Podvod s podpisom páchateľa.
3. QR NIKDY NEAUTORIZUJE — LEN IDENTIFIKUJE. Každé prepojenie účtov/rolí potvrdí dotknutý účet vo svojej appke (push: „Farnosť X ťa pridáva ako príjemcu zbierky, split 97/3 — potvrdiť?“). Verejný share QR len otvára profil — nikdy nespúšťa platbu ani merge.
4. ROTUJÚCE QR: screenshot je mŕtvy po pár sekundách (TOTP, anti-relay). Odhlasovací QR neexistuje pred dosiahnutím % účasti.
5. KAŽDÝ QR má 3 výstupy: Skenovať / Kopírovať odkaz / Zdieľať (rieši prácu na jednom telefóne).
6. PRIHLÁSENÝ PROFIL = DÔKAZ PRAVOSTI: sken QR vedie registrovaného usera do appky/na prihlásenie — na prípade pristane VO SVOJOM PROFILE (vidí svoj avatar, meno, karmu). Falošná kópia stránky nikdy nezobrazí tvoj prihlásený profil — chýbajúci profil = falzifikát — platí sa VÝHRADNE prihlásený. NEREGISTROVANÝ hosť platí na vlastné riziko — edukujeme: over doménu, najlepšie sa registruj. 7. Technické detaily QR sa externe NEPUBLIKUJÚ (anti-fraud). 8. DEED ZA ÚČASŤ NEJDE Z NÁŠHO POOLU — platforma vydáva len DÔKAZ účasti (dochádzka/certifikát/karma); odmenu dáva organizátor. Podvod s dochádzkou tak nečerpá platformu — riziko nesie organizátor. Anti-fraud úmerný hodnote: 1 sken = 1 device; GPS vrstva až pri reálnom výskyte podvodov (v1.1 §6).
1 · Fyzické osoby (bežný user)
2 · Tvorcovia (YouTuberi, influenceri, autori)
3 · B2B firmy
4 · Charity a neziskové organizácie
5 · Športové organizácie a kluby
6 · Kultúrne organizácie a umelci
7 · Zdravotníctvo (Health)
8 · Inštitúcie, obce a školy (Gov)
9 · Cirkvi a farnosti (NOVÉ v2 — ten istý engine, nové použitie)
DVE ŽELEZNÉ PRAVIDLÁ SEKCIE (Martin, 8. 7.): (1) Všetky farské QR a zbierky sú viazané na INŠTITÚCIU (KYB právnická osoba), nie na farára — výmena či odchod farára nemení QR na dverách ani bežiace zbierky; mení sa len správca (KYB re-claim + potvrdenie v appke). (2) Pohrebné, svadobné a omšové zbierky bežia cez FARSKÝ účet a zverejňujú sa na PROFILE FARNOSTI — sú to komunitné zbierky farského úradu, NEJDÚ do verejného Core ani Help feedu. Engine je vždy Help/Charita (platby, split, escrow), feed je len farský.
DEEDproject — QR Katalóg v2.0. Martin & Fero, 8. 7. 2026. Archivovať: Katalóg v1. Zmeny v2: sekcia 0 (železné pravidlá), sekcia 9 (cirkvi), offline odkaz, rozhodnutie „QR identifikuje — appka autorizuje“ (ruší consent-QR koncept z pohrebných rozhodnutí — oznámiť Opusovi).
| LEGENDA — 5 mechanických skupín QR (celý katalóg beží na nich; nové use-casy = konfigurácia, nie kód):
Statický = nemenný odkaz na interné ID (profil, prípad, entita) · Rotujúci = TOTP proof-of-presence (~15 s; režimy: prahový 60 % / presný čas VTO / milestón counter) · Zlúčený = profil + % + cieľ (reťaz/honorár/split) · Odznak = statický fyzický + shift-binding · Identity = rotujúci preukaz (~30 s; offline: Identity 24 h token (v1.1 §2.3), akčný QR store-and-forward (v1.1 §6.6)).

ROZHODNUTÉ 8. 7.: ŽIADNA šiesta skupina „consent“ — prepojenia (pohrebný split, splnomocnenie, odovzdanie farnosti, viazanie detského účtu) sa robia existujúcim osobným/entitným QR + POTVRDENÍM V APPKE dotknutého účtu. QR identifikuje, appka autorizuje.
| Použitie | Ako funguje | Typ QR | Modul
| Preukaz dôveryhodnosti | overenie identity člena — karma, skutky, členstvo; 2 režimy (všeobecný/dôverný); offline 24 h token | Identity (30 s) | Core
| Prijímanie DEED | osobný platobný QR / deed.good/@meno — dary, poďakovania, sprepitné | Statický | Core
| Zdieľanie skutku | QR skutku na siete/video — odkaz na živý detail | Statický | Core
| Reťaz dobra po skutku | po významnom skutku: % z príjmu ide ďalej na žiadosť (D+R) | Zlúčený | Core
| Zdieľanie žiadosti o pomoc | žiadateľ zdieľa Help žiadosť (plagát, siete) | Statický | Help
| Vzájomná identifikácia pri službe | objednaná služba: sken ukáže „priradená k akcii #123“ — obe strany | Identity + akcia | Help
| Poďakovanie po záchrane | zachránený pošle DEED pomocníkovi po vyriešení | Statický | SOS
| Pridanie priateľa | sken osobného QR → žiadosť o priateľstvo (nikdy neotvára profil/skutky) | Statický | Core
| Účasť na akciách | sken rotujúceho QR organizátora — dôkaz prítomnosti | Rotujúci | Aktivity
| Detský účet — dohľad | rodičovský QR identifikuje väzbu; potvrdenie v appke rodiča (pravidlo 3) | Statický + potvrdenie | Kids
| Použitie | Ako funguje | Typ QR | Modul
| Honorár — 100 % mne | platobný QR pod videom/knihou | Statický | Core/Art
| Honorár s reťazou + FRONTA | VŽDY práve JEDNA aktívna zbierka na QR (viac naraz = chaos pre darcu — zrušené); po naplnení sa QR/podstránka auto-prehodí na ďalšiu vo fronte; % per zbierka (krok 5 %, min 5 %, 0 % = QR sa nevygeneruje); badge = nemenný záznam faktu (detail: Retaz_Fronta_Overflow_DEV v2) | Zlúčený | Core/Art
| Odomknutie obsahu (gating) | dar ≥ prah → prístupový kód na platený obsah | Zlúčený + prah | Art/Payment
| Badge „už daroval X“ | verejné zobrazenie vlastného daru (opt-in; on-chain overené) | Badge nad QR | Core
| Kniha QR | QR v knihe — tipy autorovi + reťaz na charitu | Statický/zlúčený | Core/Art
| Live widget do streamu | overlay so živou sumou zbierky (OBS) | Widget (embed) | Event/Art
| Busking / pouličné umenie | QR na stojane — tip umelcovi na mieste | Statický | Art
| Použitie | Ako funguje | Typ QR | Modul
| Centrálny firemný QR | identita firmy (IČO) — profil, aktivity | Statický | Registrácie
| Pobočkové QR | každá filiálka vlastný QR (Lidl Trenčín pod Lidl SK) | Statický | Registrácie
| Odznak zamestnanca | zákazník chváli/daruje konkrétnemu zamestnancovi; firma vidí agregát bez súm | Odznak (binding) | B2B Bonus
| VTO — platené dobrovoľníctvo | príchod/odchod QR → presný čas → mzda + ESG dôkaz (S1) | Rotujúci (presný čas) | VTO
| Firemné wellness akcie | účasť na skupinovom cvičení/programe | Rotujúci (prahový) | Zdravie
| Školenia zamestnancov | vstup + výstup + % účasti → certifikát | Rotujúci (prahový) | Aktivity/Learn
| Peer recognition | zamestnanec ocení kolegu DEED darom | Statický (platobný) | Engagement
| DEED Profi vizitka | profesionálny profil lektora/odborníka | Statický | Aktivity
| Firemný event s darmi | Event Engine: dary, split, žreb, live display | Rotujúci + platobný | Event
| Export dochádzky | overená dochádzka zo skenov → PDF/API pre audit | — (výstup) | VTO/B2B
| Použitie | Ako funguje | Typ QR | Modul
| Centrálny QR charity | identita charity (IČO) — profil, badge, dôvera; na webe | Statický | Charita
| Pobočkové QR | regionálne pobočky/sektory | Statický | Charita
| Prípadový QR (zbierka) | 1 QR = 1 zbierka; plagát, leták; živý stav | Statický | Charita
| Dobrovoľnícke výzvy | príchod/odchod dobrovoľníka → overené hodiny | Rotujúci | Charita
| Pravidelná podpora | QR pre recurring dar (žiadosť/segment/charita) | Statický | Charita
| Zbierkový event so splitom | verejná akcia: dar sa delí (50 % prípad + 50 % program) | Platobný + split | Event
| Badge na web charity | klik → DEED profil charity (nahrádza externé pečate) | Statický (badge) | Charita
| Vecné dary / balíčky | QR balíčka — darca vidí obsah a komu ide | Statický | Charita
| Spomienková zbierka (Memory) | Kondolenzspende „namiesto kvetov“: hospic/domov/charita s väzbou na zosnulého vytvorí spomienkovú udalosť; QR na parte; príjemca VŽDY živý subjekt; mimo karmy/DEED; dôstojný tón; PRO/ENTERPRISE (detail: QR_System_Memory_Charita_v1) | Statický (prípadový) | Charita/Zdrav.
| Použitie | Ako funguje | Typ QR | Modul
| Preteky / závody | registrácia + check-in pretekárov aj divákov | Rotujúci | Šport/Event
| Verejná športová akcia | dar na výzvu moderátora + žreb + VIP za prah | Platobný + split | Event
| Sponzorský milestón | pri méte (3 000 divákov) sponzor uvoľní sumu — counter | Rotujúci (milestón) | Event
| Klubové tréningy detí | dochádzka detí — rodič vidí účasť | Rotujúci | Šport/Kids
| Športovec — honorár reťaz | % z odmien/výhier na žiadosť (verejný záväzok) | Zlúčený | Šport/Core
| Fanúšikovský dar | dar klubu/športovcovi (dres, štadión, siete) | Statický | Šport
| Workshopy / tábory | vstup + výstup + % → certifikát | Rotujúci (prahový) | Šport/Aktivity
| Charitatívny zápas/beh | event so splitom: štartovné/dary → časť charite | Platobný + split | Event/Charita
| Použitie | Ako funguje | Typ QR | Modul
| Koncert / vystúpenie | tip QR na pódiu | Statický | Art
| Honorár split umelca | % z honoráru/tipov ide charite | Zlúčený | Art/Core
| Výstavy / galérie | účasť na výstave — kultúrny skutok | Rotujúci | Art/Aktivity
| Art workshopy | vstup + výstup → certifikát | Rotujúci (prahový) | Art/Aktivity
| Kniha / publikácia | QR v knihe — tip autorovi, reťaz na dobro | Statický/zlúčený | Core/Art
| Kultúrny event | dary počas akcie, milestóny, live display | Platobný + rotujúci | Event
| Divadlo / festival | počítanie účasti, benefičné predstavenia so splitom | Rotujúci + split | Event/Art
| Použitie | Ako funguje | Typ QR | Modul
| Odznak sestry / lekára | pacient/rodina ďakuje konkrétnemu zdravotníkovi; shift-binding | Odznak (binding) | Zdrav. Bonus
| Hierarchia nemocnice | zamestnanec → zmena → oddelenie → nemocnica; agregát pochvál | Odznak + hierarchia | Zdrav. Bonus
| Dar oddeleniu / nemocnici | zbierka na prístroj — prípadový QR | Statický | Charita
| Zdravotné workshopy | prevencia, prvá pomoc — účasť s certifikátom | Rotujúci (prahový) | Zdravie/Aktivity
| Skupinové cvičenia | dochádzka na program (aj firemný wellness) | Rotujúci | Zdravie
| Darcovstvo krvi | účasť na odbere ako overený skutok | Rotujúci | Zdravie/Core
| Pomoc po úraze | Help žiadosť (odvoz na rehabilitácie) | Statický | Help
| Použitie | Ako funguje | Typ QR | Modul
| Verejné podujatia obce | účasť na komunitnej akcii | Rotujúci | Gov
| Komunitné brigády | čistenie, úprava priestorov — overená účasť | Rotujúci | Gov/Eko
| Eko akcie v teréne | les bez signálu — offline store-and-forward: podpísaný token (kód+čas+GPS), odošle pri signáli (v1.1 §6.6) | Rotujúci + offline | Eko
| Školské akcie | účasť žiakov/rodičov | Rotujúci | Gov/Kids
| Mestský event so zbierkou | obec organizuje benefičnú akciu | Platobný + rotujúci | Event/Gov
| Použitie | Ako funguje | Typ QR | Modul
| Donačný QR farnosti | na kostole/pokladničke/nástenke → overená podstránka farnosti → dar za 2 kliky. NAHRÁDZA TERMINÁL — kľúčový akvizičný hook (tlačí farár z panelu) | Statický | Náboženstvo/Charita
| Zbierka per omša / akcia | auto-generovaná z rozvrhu omší; otvorí sa pred akciou, zavrie o polnoci; evidencia per zbierka, settlement dávkovo | Statický | Náboženstvo
| Účelová kampaň (strecha, kúrenie) | 1 QR = 1 kampaň s progress barom; viac súbežných | Statický | Náboženstvo/Charita
| Pohrebný / svadobný split | farnosť (KYB) vytvorí zbierku na FARSKOM účte; pozostalý zdieľa SVOJ osobný QR → farár naskenuje pri tvorbe → príjemca potvrdí v appke → split % zafixovaný; predĺžené okno ~týždeň; viditeľné IBA na profile farnosti | Statický osobný + zlúčený + potvrdenie | farský feed
| Brigáda / dobrovoľníctvo | event QR → účastník dostane KARMU (proof-of-presence); karma ide ľuďom, farnosť je mimo karmy | Rotujúci (prahový) | Náboženstvo/Aktivity
| Zdieľací QR profilu | šírenie profilu farnosti (user) — len otvára, nikdy neplatí | Statický (share) | Náboženstvo
| Odovzdanie správy farnosti | nový štatutár: KYB re-claim + potvrdenie v appke (pravidlo 3) — žiadne zdieľané heslá | Identity + potvrdenie | Registrácie
| Historický kostol — vstup za milodar | návštevník uhradí milodar → kód otvorí dvere; overený a dohľadateľný user (budúca etapa) | Statický + kód | Náboženstvo
| Poznámka k modulom: Aktivity = strešný MVP modul (Šport · Art · Learn · Eko); po MVP sa rozdelí. Event Engine a Payment Engine = platformové vrstvy pre všetky moduly. Zdravie a Gov = post-MVP. Cirkevný rail = € (EURC technicky, v UI „€ kredit“) — viď Modul Náboženstvo.

Jeden engine, všetky použitia: celý katalóg beží na 5 mechanických skupinách — nové use-casy = nová konfigurácia, nie nový kód.