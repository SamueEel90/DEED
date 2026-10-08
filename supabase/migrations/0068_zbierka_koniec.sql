-- ============================================================
-- 0068 · KARTA 57 A.8 — čas ukončenia zbierky (archív v Správe farnosti)
-- zbierka.koniec = čas servera, keď zbierka prestala byť aktívna (ukončená / zrušená / vyúčtovaná).
-- Nastavuje ho len trigger; klient ho nemôže zapísať ani zmeniť. Pri návrate na „aktivna" sa vymaže.
-- ============================================================

alter table public.zbierka add column if not exists koniec timestamptz;
-- doterajšie ukončené zbierky (pred triggerom): najlepší odhad = posledná úprava
update public.zbierka set koniec = upravene where stav <> 'aktivna' and koniec is null;

create or replace function public.zbierka_koniec_cas()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.stav = 'aktivna' then
    new.koniec := null;
  elsif tg_op = 'INSERT' then
    new.koniec := now();
  elsif old.stav = 'aktivna' then
    new.koniec := now();
  else
    new.koniec := old.koniec;
  end if;
  return new;
end;
$$;

drop trigger if exists zbierka_koniec on public.zbierka;
create trigger zbierka_koniec
  before insert or update on public.zbierka
  for each row execute function public.zbierka_koniec_cas();

