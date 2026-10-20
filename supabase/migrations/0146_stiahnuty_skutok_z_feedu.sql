-- ============================================================
-- 0146 · stiahnutý skutok charity zmizne aj z feedu Domov (Top dnes)
-- ------------------------------------------------------------
-- Doteraz príspevok feedu mazal len klient (zmazSkutokZFeedu) a len keď skutok poznal id príspevku.
-- Skutky zverejnené starou verziou id nemali → po stiahnutí ostali vo feede ako siroty (afffaf, bxbxc, Mirka, 20. 10.).
-- Teraz to robí server pri stiahnutí: príspevok s id zo skutku (data.prispevokId) sa zmaže.
-- ============================================================
begin;

create or replace function public.skutok_stranky_stiahnutie() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.stiahnuty is not null and (tg_op = 'INSERT' or old.stiahnuty is null) and coalesce(new.data->>'prispevokId', '') ~ '^[0-9a-f-]{36}$' then
    delete from public.prispevok where id = (new.data->>'prispevokId')::uuid and typ = 'skutok';
  end if;
  return new;
end $$;
revoke all on function public.skutok_stranky_stiahnutie() from public, anon, authenticated;

drop trigger if exists skutok_stranky_stiahnutie on public.skutok_stranky;
create trigger skutok_stranky_stiahnutie after insert or update of stiahnuty on public.skutok_stranky
  for each row execute function public.skutok_stranky_stiahnutie();

commit;
