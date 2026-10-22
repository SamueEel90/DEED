-- ============================================================
-- 0160 · OPRAVY 502 (balík 44, Soňa 23. 10.) — výplaty pracovníka charity: štatutár o každej vie.
-- Výplata = prevod peňazí z hlavného účtu charity na účet zbierky (zbierka_vklad, 0083), smie ho právo „penazenka_vyplaty“ (0129).
-- Keď prevod založí pracovník (nie štatutár / vlastník), dostane každý štatutár upozornenie: kto, koľko, kedy, na akú zbierku.
-- Štatutár = účet charity (vlastník stránky), osobné účty štatutárov organizácie (statutar) a prijatí „Štatutár“ zo zoznamu „ludia“.
-- Kto prevod založil, upozornenie nedostane. Farnosť sa nemení (tam vkladá len farár).
-- ============================================================
begin;

create or replace function public.statutari_stranky(p_stranka text) returns setof uuid
  language sql stable security definer set search_path = public as $$
  select s.ucet_id from public.stranka s where s.id = p_stranka and s.ucet_id is not null
  union
  select t.osoba_ucet_id from public.stranka s join public.statutar t on t.org_ucet_id = s.ucet_id
   where s.id = p_stranka and t.osoba_ucet_id is not null
  union
  select u.id from public.nastavenia_stranky n
    cross join lateral jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) x
    join auth.users a on coalesce(a.email, '') <> '' and lower(a.email) = lower(trim(x->>'k'))
    join public.ucet u on u.auth_id = a.id
   where n.stranka = p_stranka and x->>'r' = 'Štatutár' and (x->'caka' is null or x->'caka' = 'false'::jsonb)
$$;
revoke all on function public.statutari_stranky(text) from public, anon, authenticated;

create or replace function public.vyplata_oznam() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_s public.stranka; v_kto text; v_zb text; v_mail text; v_ucet uuid;
begin
  select * into v_s from public.stranka where id = new.stranka;
  if not found or v_s.typ <> 'charita' or new.vytvoril is null then return new; end if;
  if new.vytvoril in (select public.statutari_stranky(new.stranka)) then return new; end if; -- štatutár sám sebe nepíše
  select lower(a.email) into v_mail from public.ucet u join auth.users a on a.id = u.auth_id where u.id = new.vytvoril;
  select coalesce(nullif(trim(concat_ws(' ', p.meno, p.priezvisko)), ''), nullif(v_mail, ''), 'Pracovník') into v_kto
    from (select 1) d left join public.profil p on p.ucet_id = new.vytvoril;
  select nazov into v_zb from public.zbierka where id = new.zbierka;
  for v_ucet in select x from public.statutari_stranky(new.stranka) x where x is distinct from new.vytvoril loop
    insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    values (v_ucet, 'penazenka', 'eur',
            left(v_kto || ' posiela ' || replace(to_char(new.suma, 'FM9999999990.00'), '.', ',') || ' € z účtu charity', 200),
            left('Na účet zbierky ' || coalesce(v_zb, '') || ' · ' || to_char(new.vytvorene at time zone 'Europe/Bratislava', 'FMDD. FMMM. YYYY HH24:MI'), 300),
            null,
            exists (select 1 from public.push_odber p where p.ucet_id = v_ucet));
  end loop;
  return new;
end $$;
revoke all on function public.vyplata_oznam() from public;

drop trigger if exists vyplata_oznam on public.zbierka_vklad;
create trigger vyplata_oznam after insert on public.zbierka_vklad
  for each row execute function public.vyplata_oznam();

commit;
