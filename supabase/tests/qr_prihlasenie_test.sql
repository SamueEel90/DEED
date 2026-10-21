-- Test 0149 — prihlásenie PC cez QR. ROLLBACK na konci, každý riadok ok = t.
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000149a01', 'farar@test.sk'), ('7e57c000-0000-0000-0000-000000149b01', null);
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000149a01','7e57c000-0000-0000-0000-000000149a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000149b01','7e57c000-0000-0000-0000-000000149b01','aktivny','hotovo');
-- server (service role) založí QR pre PC
insert into public.qr_prihlasenie (token, tajomstvo_hash, zariadenie, ip, mesto) values
 ('tok-149-aaaaaaaaaaaaaaaaaaaa', 'hash-a', 'Windows · Chrome', '1.2.3.4', 'Trenčín'),
 ('tok-149-bbbbbbbbbbbbbbbbbbbb', 'hash-b', 'Mac · Safari', '1.2.3.5', 'Nitra'),
 ('tok-149-cccccccccccccccccccc', 'hash-c', 'Windows · Edge', '1.2.3.6', null);
update public.qr_prihlasenie set plati_do = now() - interval '1 second' where token = 'tok-149-cccccccccccccccccccc';
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- PC sa pýta, kým mobil nepotvrdí
insert into t select 'PC: čaká', public.qr_prihlasenie_pouzi('tok-149-aaaaaaaaaaaaaaaaaaaa', 'hash-a')->>'stav' = 'caka';
insert into t select 'cudzie tajomstvo nič', public.qr_prihlasenie_pouzi('tok-149-aaaaaaaaaaaaaaaaaaaa', 'zle')->>'stav' = 'nenajdene';

set role authenticated;
-- mobil bez e-mailu (anonymná relácia) nespracuje
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000149b01', false);
do $$ begin perform public.qr_prihlasenie_info('tok-149-aaaaaaaaaaaaaaaaaaaa'); insert into t values ('bez prihlásenia: Najprv sa prihláste', false);
exception when others then insert into t values ('bez prihlásenia: Najprv sa prihláste', sqlerrm = 'Najprv sa prihláste v mobile.'); end $$;
-- prihlásený mobil vidí zariadenie a mesto
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000149a01', false);
insert into t select 'mobil vidí zariadenie a mesto', (select x->>'zariadenie' = 'Windows · Chrome' and x->>'mesto' = 'Trenčín' and (x->>'plati')::boolean from (select public.qr_prihlasenie_info('tok-149-aaaaaaaaaaaaaaaaaaaa') x) y);
insert into t select 'po 2 min neplatí', not (public.qr_prihlasenie_info('tok-149-cccccccccccccccccccc')->>'plati')::boolean;
do $$ begin perform public.qr_prihlasenie_potvrd('tok-149-cccccccccccccccccccc'); insert into t values ('potvrdiť vypršaný nejde', false);
exception when others then insert into t values ('potvrdiť vypršaný nejde', sqlerrm like 'QR už neplatí%'); end $$;
insert into t select 'potvrdí', public.qr_prihlasenie_potvrd('tok-149-aaaaaaaaaaaaaaaaaaaa');
insert into t select 'zruší druhý', public.qr_prihlasenie_zrus('tok-149-bbbbbbbbbbbbbbbbbbbb');
do $$ begin perform public.qr_prihlasenie_pouzi('tok-149-aaaaaaaaaaaaaaaaaaaa', 'hash-a'); insert into t values ('mobil nemôže sám použiť', false);
exception when others then insert into t values ('mobil nemôže sám použiť', true); end $$;
do $$ begin perform count(*) from public.qr_prihlasenie; insert into t values ('tabuľka nie je čitateľná', false);
exception when others then insert into t values ('tabuľka nie je čitateľná', true); end $$;
reset role;

insert into t select 'PC: potvrdené + e-mail', (select x->>'stav' = 'potvrdene' and x->>'email' = 'farar@test.sk' from (select public.qr_prihlasenie_pouzi('tok-149-aaaaaaaaaaaaaaaaaaaa', 'hash-a') x) y);
insert into t select 'PC: druhýkrát už nie (jednorazový)', public.qr_prihlasenie_pouzi('tok-149-aaaaaaaaaaaaaaaaaaaa', 'hash-a')->>'stav' = 'pouzite';
insert into t select 'PC: zrušené', public.qr_prihlasenie_pouzi('tok-149-bbbbbbbbbbbbbbbbbbbb', 'hash-b')->>'stav' = 'zrusene';
insert into t select 'PC: vypršal', public.qr_prihlasenie_pouzi('tok-149-cccccccccccccccccccc', 'hash-c')->>'stav' = 'vyprsal';
select ok, c from t order by ok, c;
rollback;
