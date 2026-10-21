-- ============================================================
-- 0152 · oprava 0146: trigger stiahnutia skutku len pri UPDATE (nie pri INSERT)
-- ------------------------------------------------------------
-- Pushnutá 0146 spúšťa trigger aj pri INSERT a pri vložení už stiahnutého skutku zmaže príspevok feedu.
-- Tým padá test 0141 (feed_skutok_stranky_test: „stiahnutý skutok bez stránky“) → CI „čistá DB z migrácií“ červené od 20. 10.
-- Stiahnutie je vždy zmena existujúceho skutku (aj upsert z klienta je update), INSERT sa ho netýka.
-- ============================================================
begin;

create or replace function public.skutok_stranky_stiahnutie() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.stiahnuty is not null and old.stiahnuty is null and coalesce(new.data->>'prispevokId', '') ~ '^[0-9a-f-]{36}$' then
    delete from public.prispevok where id = (new.data->>'prispevokId')::uuid and typ = 'skutok';
  end if;
  return new;
end $$;
revoke all on function public.skutok_stranky_stiahnutie() from public, anon, authenticated;

drop trigger if exists skutok_stranky_stiahnutie on public.skutok_stranky;
create trigger skutok_stranky_stiahnutie after update of stiahnuty on public.skutok_stranky
  for each row execute function public.skutok_stranky_stiahnutie();

commit;
