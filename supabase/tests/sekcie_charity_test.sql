-- ============================================================
-- Test 0170 — číselník sekcií charity a oblasť sektorovej zbierky len z podskupín charity.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000170a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000170a01','7e57c000-0000-0000-0000-000000170a01','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t170-a','7e57c100-0000-0000-0000-000000170a01','charita','Útulok 170',true);
insert into public.stranka_program (stranka, tier) values ('t170-a', 1);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create function public.t170_chyba(p_sql text) returns text language plpgsql security definer set search_path = public as $$
begin execute p_sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function public.t170_chyba(text) to authenticated;

insert into t select 'číselník: 12 aktívnych sekcií', (select count(distinct sektor) from public.cis_segmenty where aktivny) = 12;
insert into t select 'číselník: 60 aktívnych podskupín', (select count(*) from public.cis_segmenty where aktivny) = 60;
insert into t select 'číselník: staré položky vypnuté', not exists (select 1 from public.cis_segmenty where aktivny and sektor = 'Sociálne');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000170a01', false);
insert into t select 'bez podskupín: oblasť z číselníka prejde', public.t170_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t170a','t170-a','osamelí seniori','Seniori')$$) = 'ok';
insert into t select 'bez podskupín: vymyslená oblasť neprejde', public.t170_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t170b','t170-a','niečo iné','X')$$) = 'oblast_mimo_stanov';
reset role;
insert into public.segmenty (org_ucet_id, sektor, pod_segment) values ('7e57c100-0000-0000-0000-000000170a01', 'Zvieratá', 'útulky'), ('7e57c100-0000-0000-0000-000000170a01', 'Zvieratá', 'kastračné programy');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000170a01', false);
insert into t select 's podskupinami: vlastná podskupina prejde', public.t170_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t170c','t170-a','Útulky','Útulky')$$) = 'ok';
insert into t select 's podskupinami: cudzia podskupina neprejde', public.t170_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t170d','t170-a','nepočujúci','Nepočujúci')$$) = 'oblast_mimo_stanov';
insert into t select 's podskupinami: zmena oblasti na cudziu neprejde', public.t170_chyba($$update public.sektor_stranky set oblast = 'nepočujúci' where id = 'sek-t170c'$$) = 'oblast_mimo_stanov';
insert into t select 's podskupinami: úprava textu starého sektora prejde', public.t170_chyba($$update public.sektor_stranky set nazov = 'Seniori 2' where id = 'sek-t170a'$$) = 'ok';
reset role;
insert into t select 'server (postgres) obíde kontrolu', (select public.t170_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t170e','t170-a','hocičo','Server')$$)) = 'ok';

select ok, c from t order by ok, c;
rollback;
