-- ============================================================
-- 0166 · OPRAVY 525 · číselník cirkví podľa fero-register/cirkvi-oslovenia.md (9cc647f), Martin 23. 10.
--  · ženský tvar (oslovenie_zena, 0164) len kde cirkev ženy ordinuje: ECAV a RKCr „sestra farárka“,
--    ECM „sestra kazateľka“, CČSH „pani farárka“ (už 0164). BJB, CB, CASD, ACS, KZ bez ženského tvaru.
--  · opravy: ACS = Pastor / pastora / „brat pastor“; KZ = Starší zboru / staršieho zboru / „brat“.
--  · malé spoločenstvá (LDS, JS, NAC, SKC, BS): duchovný správca · spoločenstvo · miesto stretnutí, bez oslovenia
--    (zmena len pri SKC — miesto bolo kostol).
-- Pohlavie sa v DB neukladá. Vlastné oslovenie z profilu duchovného (Ľudia farnosti) má v appke prednosť.
-- Spúšťa sa po 0165. Idempotentné.
-- ============================================================
begin;

update public.cirkev set oslovenie_zena = 'sestra farárka' where kod in ('ECAV', 'RKCr');
update public.cirkev set oslovenie_zena = 'sestra kazateľka' where kod = 'ECM';
update public.cirkev set oslovenie_zena = null where kod in ('BJB', 'CB', 'CASD', 'ACS', 'KZ', 'RKC', 'GKC', 'PC', 'ÚZŽNO', 'LDS', 'JS', 'NAC', 'SKC', 'BS');

update public.cirkev set titul = 'Pastor', titul_2p = 'pastora', oslovenie = 'brat pastor' where kod = 'ACS';
update public.cirkev set titul = 'Starší zboru', titul_2p = 'staršieho zboru', oslovenie = 'brat' where kod = 'KZ';

update public.cirkev set titul = 'Duchovný správca', titul_2p = 'duchovného správcu', oslovenie = null,
       jednotka = 'spoločenstvo', vasa = 'Vaše spoločenstvo', miesto = 'miesto stretnutí', miesto_a = 'miesto stretnutí'
 where kod in ('LDS', 'JS', 'NAC', 'SKC', 'BS');

commit;
