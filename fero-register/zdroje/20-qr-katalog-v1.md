# Zdroj 20 · QR Katalóg využití v1 (júl 2026) — extrakt z docx

DEED QR System — katalóg využití
všetky použitia QR podľa typu subjektu · s priradením modulu
verzia 1 · júl 2026 · Martin & Fero · referenčný katalóg
1. Fyzické osoby (bežný user)
2. Tvorcovia (YouTuberi, influenceri, autori)
3. B2B firmy
4. Charity a neziskové organizácie
5. Športové organizácie a kluby
6. Kultúrne organizácie a umelci
7. Zdravotníctvo (Health)
8. Inštitúcie, obce a školy (Gov)
— koniec katalógu —
Legenda typov QR: 
Statický = nemenný odkaz na interné ID (profil, prípad, entita) · Rotujúci = TOTP proof-of-presence (15s) · Zlúčený = profil + % + cieľ (reťaz/honorár) · Odznak = statický fyzický + shift-binding · Identity = rotujúci preukaz (30s)
Režimy rotujúceho: prahový (60 % — event/workshop) · presný čas (VTO) · milestón counter (méta)
Použitie | Ako funguje | Typ QR | Modul
Preukaz dôveryhodnosti | Overenie identity člena — karma, skutky, členstvo; 2 režimy (všeobecný/dôverný) | Identity (30s) | Core
Prijímanie DEED | Osobný platobný QR / DEED link (deed.good/@meno) — dary, poďakovania, sprepitné | Statický | Core
Zdieľanie skutku | QR skutku na siete/video — odkaz na živý detail (3 výstupy: sken/kopírovať/zdieľať) | Statický | Core
Reťaz dobra po skutku | Po významnom skutku: % z príjmu ide ďalej na žiadosť (D+R) | Zlúčený | Core
Zdieľanie žiadosti o pomoc | Žiadateľ zdieľa svoju Help žiadosť (plagát, siete) | Statický | Help
Vzájomná identifikácia pri službe | Objednaná služba (opatrovníčka): sken ukáže „priradená k akcii #123“ — obe strany | Identity + akcia | Help
Poďakovanie po záchrane | Zachránený pošle DEED pomocníkovi cez QR/link po vyriešení núdze | Statický | SOS
Pridanie priateľa | Sken osobného QR → prepojenie kontaktov (Telegram štýl) | Statický | Core
Účasť na akciách | Sken rotujúceho QR organizátora — dôkaz prítomnosti (workshop, čistenie, kurz) | Rotujúci | Aktivity
Detský účet — dohľad | Rodičovský QR viaže detský účet (gaming points → DEED pri 18) | Statický | Kids
Použitie | Ako funguje | Typ QR | Modul
Honorár — 100 % mne | Platobný QR pod videom/knihou — všetky dary tvorcovi | Statický | Core / Art
Honorár s reťazou | % z každého daru fans ide na žiadosť (5–100 %, zamknuté); badge „X % ide Y“ | Zlúčený | Core / Art
Odomknutie obsahu (gating) | Dar ≥ prah → prístupový kód na platený obsah (unlisted video) | Zlúčený + prah | Art / Payment
Badge „už daroval X“ | Verejné zobrazenie vlastného daru zbierke (opt-in; DEED = overené on-chain) | Badge nad QR | Core
Kniha QR | QR v knihe — tipy autorovi + reťaz na charitu | Statický/zlúčený | Core / Art
Live widget do streamu | Overlay so živou sumou zbierky (OBS/stream) — suma tiká s darmi | Widget (embed) | Event / Art
Busking / pouličné umenie | QR na stojane — tip umelcovi na mieste | Statický | Art
Použitie | Ako funguje | Typ QR | Modul
Centrálny firemný QR | Identita firmy (IČO) — „overená firma XY“, profil, aktivity | Statický | Registrácie
Pobočkové QR | Každá filiálka/prevádzka vlastný QR (Lidl Trenčín pod Lidl SK) | Statický | Registrácie
Odznak zamestnanca | Zákazník chváli/daruje konkrétnemu zamestnancovi; firma vidí agregát bez súm | Odznak (binding) | B2B Bonus
VTO — platené dobrovoľníctvo | Príchod/odchod QR → presný odpracovaný čas → mzda + ESG dôkaz (S1) | Rotujúci (presný čas) | VTO
Firemné wellness akcie | Účasť na skupinovom cvičení/zdravotnom programe | Rotujúci (prahový) | Zdravie
Školenia zamestnancov | Vstup + výstup + % účasti → certifikát absolvovania | Rotujúci (prahový) | Aktivity/Learn
Peer recognition | Zamestnanec ocení kolegu DEED darom (10/50/100) | Statický (platobný) | Engagement
DEED Profi vizitka | Profesionálny profil lektora/odborníka s overením | Statický | Aktivity
Firemný event s darmi | Event Engine: dary, split, žreb, live display na akcii | Rotujúci + platobný | Event
Export dochádzky | Overená dochádzka z QR skenov → PDF/API pre ESG/audit | — (výstup) | VTO / B2B
Použitie | Ako funguje | Typ QR | Modul
Centrálny QR charity | Identita charity (IČO) — profil, badge, dôveryhodnosť; na webe charity | Statický | Charita
Pobočkové QR | Regionálne pobočky/sektory charity (Žilina, Trenčín…) | Statický | Charita
Prípadový QR (zbierka) | 1 QR = 1 zbierka; plagát, leták, siete; živý stav (suma, progres) | Statický | Charita
Dobrovoľnícke výzvy | Príchod/odchod dobrovoľníka → overené hodiny | Rotujúci | Charita
Pravidelná podpora | QR/ID pre recurring dar (žiadosť / segment / celá charita) | Statický | Charita
Zbierkový event so splitom | Verejná akcia: dar sa delí (napr. 50 % prípad + 50 % program) | Platobný + split | Event
Badge na web charity | Klik na badge → DEED profil charity (dôvera + akvizícia; nahrádza externé pečate) | Statický (badge) | Charita
Vecné dary / balíčky | QR balíčka pomoci — darca vidí čo obsahuje a komu ide | Statický | Charita
Použitie | Ako funguje | Typ QR | Modul
Preteky / závody | Registrácia + účasť pretekárov aj divákov (check-in) | Rotujúci | Šport / Event
Verejná športová akcia | Dar na výzvu moderátora (lode, beh) + žreb + VIP za prah | Platobný + split | Event
Sponzorský milestón | Pri méte (3000 divákov) sponzor uvoľní sumu — counter cez vstupné skeny | Rotujúci (milestón) | Event
Klubové tréningy detí | Dochádzka detí na tréningu — rodič vidí účasť | Rotujúci | Šport / Kids
Športovec — honorár reťaz | % z odmien/výhier ide na žiadosť (verejný záväzok) | Zlúčený | Šport / Core
Fanúšikovský dar | Dar klubu/športovcovi cez QR na drese, štadióne, sieťach | Statický | Šport
Športové workshopy / tábory | Vstup+výstup+% → certifikát/potvrdenie | Rotujúci (prahový) | Šport / Aktivity
Charitatívny zápas/beh | Event so splitom: štartovné/dary → časť charite | Platobný + split | Event / Charita
Použitie | Ako funguje | Typ QR | Modul
Koncert / vystúpenie | Tip QR na pódiu — dar umelcovi počas/po vystúpení | Statický | Art
Honorár split umelca | % z honoráru/tipov ide charite („50 % z hodiny jogy hospicu“) | Zlúčený | Art / Core
Výstavy / galérie | Účasť na výstave, vernisáži — kultúrny skutok | Rotujúci | Art / Aktivity
Art workshopy | Vstup+výstup → certifikát účasti | Rotujúci (prahový) | Art / Aktivity
Kniha / publikácia | QR v knihe — tip autorovi, reťaz na dobro | Statický/zlúčený | Core / Art
Kultúrny event s divákmi | Dary počas akcie, milestóny, live display | Platobný + rotujúci | Event
Divadlo / festival check-in | Počítanie účasti, benefičné predstavenia so splitom | Rotujúci + split | Event / Art
Použitie | Ako funguje | Typ QR | Modul
Odznak sestry / lekára | Pacient/rodina chváli a ďakuje konkrétnemu zdravotníkovi; dar cez shift-binding | Odznak (binding) | Zdravotníctvo Bonus
Hierarchia nemocnice | Zamestnanec → zmena → oddelenie → nemocnica; agregát pochvál pre vedenie | Odznak + hierarchia | Zdravotníctvo Bonus
Dar oddeleniu / nemocnici | Zbierka na prístroj (inkubátor) — prípadový QR | Statický | Charita
Zdravotné workshopy | Prevencia, prvá pomoc, osveta — účasť s certifikátom | Rotujúci (prahový) | Zdravie / Aktivity
Skupinové cvičenia / rehabilitácie | Dochádzka na program (aj firemný wellness) | Rotujúci | Zdravie
Darcovstvo krvi / registre | Účasť na odbere ako overený skutok | Rotujúci | Zdravie / Core
Pomoc po úraze | Help žiadosť (odvoz na rehabilitácie) — zdieľateľný QR | Statický | Help
Použitie | Ako funguje | Typ QR | Modul
Verejné podujatia obce | Účasť na komunitnej akcii, zhromaždení | Rotujúci | Gov
Komunitné brigády | Čistenie, úprava verejných priestorov — overená účasť | Rotujúci | Gov / Eko
Eko akcie v teréne | Čistenie prírody, výsadba — offline režim (les bez signálu) | Rotujúci + offline | Eko
Školské akcie | Účasť žiakov/rodičov na podujatí školy | Rotujúci | Gov / Kids
Mestský event so zbierkou | Obec organizuje benefičnú akciu (Event Engine) | Platobný + rotujúci | Event / Gov
Poznámka k modulom: Aktivity = strešný MVP modul (Šport · Art · Learn · Eko); po MVP sa rozdelí na samostatné moduly. Event Engine a Payment Engine sú platformové vrstvy — obsluhujú všetky moduly. Zdravie (Health&Body) a Gov sú post-MVP moduly.
Jeden engine, všetky použitia: celý katalóg beží na 5 mechanických skupinách QR (statický · rotujúci · zlúčený · odznak · identity) — nové use-casy = nová konfigurácia, nie nový kód.