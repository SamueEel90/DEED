-- ============================================================
-- Test 0145 — akcia za charitu naostro (OPRAVY 446)
-- Beží v transakcii, na konci ROLLBACK. Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000145c01'), ('7e57c000-0000-0000-0000-000000145d01'), ('7e57c000-0000-0000-0000-000000145e01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000145c01','7e57c000-0000-0000-0000-000000145c01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000145d01','7e57c000-0000-0000-0000-000000145d01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000145e01','7e57c000-0000-0000-0000-000000145e01','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-000000145d01','Mária','Šimková'), ('7e57c100-0000-0000-0000-000000145e01','Ján','Novák');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create temp table k(kod text, tok text);
grant all on k to public;
\set A '\'a1450000-0000-0000-0000-000000000001\''

-- organizátor založí akciu a ukáže QR charity
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000145c01', false);
select public.event_secret_create(:A, 15, 'threshold', 'Pod korunami');
insert into k (tok) select public.event_token(:A);
-- Mária ukáže Môj QR
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000145d01', false);
update k set kod = public.moj_qr_kod()->>'kod';
-- organizátor ju naskenuje
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000145c01', false);
insert into t select 'sken pridá Máriu Š.', public.akcia_pridaj_skenom(:A, (select kod from k))->>'meno' = 'Mária Š.';
insert into t select 'druhý sken nič nezdvojí', public.akcia_pridaj_skenom(:A, (select kod from k))->>'meno' = 'Mária Š.';
do $$ begin perform public.akcia_pridaj_skenom('a1450000-0000-0000-0000-000000000001', regexp_replace((select kod from k), '.{4}$', 'abcd')); insert into t values ('falošný kód neprejde', false);
exception when others then insert into t values ('falošný kód neprejde', sqlerrm like 'Kód neplatí%'); end $$;
reset role;
insert into t select 'Mária dostala upozornenie', (select count(*) = 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000145d01' and titul = 'Si na akcii Pod korunami ✓');

-- Ján naskenuje QR charity (aj pred prihlásením vidí názov)
set role anon;
insert into t select 'info pred prihlásením', (public.akcia_info((select tok from k))->>'nazov') = 'Pod korunami';
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000145e01', false);
insert into t select 'Ján sa pripojí', (public.akcia_pripoj((select tok from k)))->>'nove' = 'true';
insert into t select 'info: Ján je na akcii', (public.akcia_info((select tok from k))->>'som')::boolean;
do $$ begin perform public.akcia_pripoj('DEED1.a1450000-0000-0000-0000-000000000001.1.abcdabcdabcdabcd'); insert into t values ('falošný QR charity neprejde', false);
exception when others then insert into t values ('falošný QR charity neprejde', sqlerrm like 'Kód už neplatí%'); end $$;
-- cudzí nevidí zoznam a nemôže skenovať
insert into t select 'cudzí nevidí účastníkov', not exists (select 1 from public.akcia_ucastnici(:A));
do $$ begin perform public.akcia_pridaj_skenom('a1450000-0000-0000-0000-000000000001', (select kod from k)); insert into t values ('cudzí neskenuje', false);
exception when others then insert into t values ('cudzí neskenuje', true); end $$;
-- organizátor vidí oboch, odoberie Jána
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000145c01', false);
insert into t select 'organizátor vidí 2 účastníkov', (select count(*) = 2 from public.akcia_ucastnici(:A));
insert into t select 'odobratie Jána', public.akcia_odober(:A, '7e57c100-0000-0000-0000-000000145e01');
insert into t select 'ostala Mária', (select array_agg(meno) = array['Mária Š.'] from public.akcia_ucastnici(:A));
-- starý kód (5 okien = 75 s) neplatí
reset role;
create temp table k3 as select (select 'DEED1.' || event_id || '.' || c || '.' || left(encode(extensions.hmac(convert_to(event_id::text || '.' || c::text,'UTF8'), secret, 'sha256'), 'hex'), 16)
  from public.event_secret, lateral (select floor(extract(epoch from now()) / 15)::bigint - 5 as c) x where event_id = :A) as tok;
grant all on k3 to public;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000145e01', false);
do $$ begin perform public.akcia_pripoj((select tok from k3)); insert into t values ('kód starší ako minúta neplatí', false);
exception when others then insert into t values ('kód starší ako minúta neplatí', sqlerrm like 'Kód už neplatí%'); end $$;
-- po ukončení sa nepripojí nik
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000145c01', false);
select public.event_ukonci(:A);
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000145e01', false);
do $$ begin perform public.akcia_pripoj((select tok from k)); insert into t values ('po ukončení sa nepripojí', false);
exception when others then insert into t values ('po ukončení sa nepripojí', sqlerrm like 'Akcia už skončila%'); end $$;
reset role;

select ok, c from t order by ok, c;
rollback;
