-- ============================================================
-- Test 0137 — program stránky pre verejný profil (bez riadku = 0, anon číta len číslo)
-- Beží v transakcii, na konci ROLLBACK. Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000137a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000137a01','7e57c000-0000-0000-0000-000000137a01','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t137-a','7e57c100-0000-0000-0000-000000137a01','charita','Charita 137 A',true),
 ('t137-b','7e57c100-0000-0000-0000-000000137a01','charita','Charita 137 B',true);
insert into public.stranka_program (stranka, tier) values ('t137-a', 2);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
set local role anon;
insert into t values ('1 anon vidí program 2', public.program_stranky('t137-a') = 2);
insert into t values ('2 bez riadku = Zadarmo', public.program_stranky('t137-b') = 0);
insert into t values ('3 tabuľku anon nečíta', (select count(*) from public.stranka_program) = 0);
reset role;
select ok, c from t order by c collate "C";
rollback;
