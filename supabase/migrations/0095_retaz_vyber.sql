-- ============================================================
-- 0095 · OPRAVY 295 (1) — okno Reťaze dobra ponúka len skutočné zbierky z databázy, ktoré do reťaze smú
-- ------------------------------------------------------------
-- Rovnaké pravidlá ako retaz_zapecat (0093/0094): aktívna a zapečatená zbierka alebo zbierka stránky v module
-- (hlavná / sektorová), nie zvončeková omša (-zv-), nie súkromná zbierka s príjemcom (rodina, pohreb).
-- Ukážkové zbierky z katalógu appky v databáze nie sú, preto sa vo výbere neukážu (nie až chyba pri zapečatení).
-- „moja“ = zbierku organizuje môj účet alebo stránka, ktorú spravujem (appka ju z výberu vynechá).
-- ============================================================
begin;

create or replace function public.retaz_zbierky(p_limit int default 200) returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'vytvorene' desc), '[]'::jsonb) from (
    select jsonb_build_object('id', z.id, 'nazov', z.nazov, 'ciel', z.ciel, 'vyzbierane', public.retaz_vyzbierane(z.id),
             'stranka', z.stranka, 'typ', s.typ, 'vytvorene', z.vytvorene,
             'org', coalesce(s.nazov, (select nullif(trim(concat_ws(' ', pr.meno, pr.priezvisko)), '') from public.profil pr where pr.ucet_id = z.ucet_id), z.nazov),
             'moja', coalesce(z.ucet_id = public.moj_ucet(), false) or (z.stranka is not null and public.spravujem_stranku(z.stranka))) as x
      from public.zbierka z left join public.stranka s on s.id = z.stranka
     where z.stav = 'aktivna'
       and (z.zapecatena is not null or coalesce(z.typ, '') in ('hlavna', 'sektor'))
       and z.id not like '%-zv-%'
       and not exists (select 1 from public.zbierka_podiel p where p.zbierka = z.id and p.druh = 'prijemca')
     order by z.vytvorene desc
     limit greatest(1, least(coalesce(p_limit, 200), 500))
  ) y
$$;
revoke all on function public.retaz_zbierky(int) from public;
grant execute on function public.retaz_zbierky(int) to anon, authenticated, service_role;

commit;
