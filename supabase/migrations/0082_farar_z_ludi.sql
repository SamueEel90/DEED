-- ============================================================
-- 0082 · OPRAVY 222 (Martin 13. 10.) — farár sa berie z Ľudia → Farár farnosti, nikto nič ručne neukladá.
-- 0081 zapisovala farára len cez nastav_farara pri uložení v Ľudia. Odteraz:
-- 1. Trigger na nastavenia_stranky (kľúč „duch“ = Farár farnosti v Ľudia):
--    som = 0 („Som farár“) → farár = duch.ucet (účet farára); kým ho appka nepošle, ostáva doterajší farár, inak ten, kto ukladá.
--    som = 1 („Vypĺňam za farára“, farár bez účtu) → farnosť farára s účtom nemá.
--    Iného farára (preloženie) smie zapísať len majiteľ stránky; inak sa farár nezmení. duch.ucet sa vždy zarovná na skutočného farára.
-- 2. Naplnenie z existujúcich Ľudí: som = 0 → duch.ucet, inak účet, ktorý nastavenia naposledy uložil (upravil).
-- ============================================================
begin;

create or replace function public.nastavenia_farar() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_d jsonb := new.data->'duch'; v_s public.stranka; v_ja uuid := public.moj_ucet(); v_f uuid; v_u uuid;
begin
  if v_d is null or jsonb_typeof(v_d) <> 'object' then return new; end if;
  if tg_op = 'UPDATE' and old.data->'duch' is not distinct from v_d then return new; end if;
  select * into v_s from public.stranka where id = new.stranka;
  if not found or v_s.typ <> 'farnost' then return new; end if;
  select ucet into v_f from public.stranka_farar where stranka = new.stranka;
  if v_d->>'som' = '1' then
    delete from public.stranka_farar where stranka = new.stranka;
    new.data := jsonb_set(new.data, '{duch}', v_d - 'ucet');
    return new;
  end if;
  if v_d->>'som' is distinct from '0' then return new; end if;
  if v_d->>'ucet' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_u := (v_d->>'ucet')::uuid; end if;
  if v_u is not null and not exists (select 1 from public.ucet where id = v_u) then v_u := null; end if;
  v_u := coalesce(v_u, v_f, v_ja);
  -- preloženie: iného farára zapíše len majiteľ stránky (alebo server bez prihláseného); prvého farára aj ten, kto ním je
  if v_f is distinct from v_u and v_ja is not null and v_ja is distinct from v_s.ucet_id and not (v_f is null and v_u = v_ja) then
    v_u := v_f;
  end if;
  if v_u is null then
    new.data := jsonb_set(new.data, '{duch}', v_d - 'ucet');
    return new;
  end if;
  insert into public.stranka_farar (stranka, ucet) values (new.stranka, v_u)
    on conflict (stranka) do update set ucet = excluded.ucet, od = now() where public.stranka_farar.ucet is distinct from excluded.ucet;
  new.data := jsonb_set(new.data, '{duch,ucet}', to_jsonb(v_u::text));
  return new;
end $$;
revoke all on function public.nastavenia_farar() from public;

drop trigger if exists nastavenia_farar on public.nastavenia_stranky;
create trigger nastavenia_farar before insert or update on public.nastavenia_stranky
  for each row execute function public.nastavenia_farar();

-- naplnenie z Ľudí, ktoré už sú uložené
insert into public.stranka_farar (stranka, ucet)
select n.stranka, x.u
  from public.nastavenia_stranky n
  join public.stranka s on s.id = n.stranka and s.typ = 'farnost'
  cross join lateral (select coalesce(case when n.data->'duch'->>'ucet' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                                           then (n.data->'duch'->>'ucet')::uuid end, n.upravil) as u) x
 where n.data->'duch'->>'som' = '0' and x.u is not null and exists (select 1 from public.ucet where id = x.u)
on conflict (stranka) do nothing;

update public.nastavenia_stranky n set data = jsonb_set(n.data, '{duch,ucet}', to_jsonb(f.ucet::text))
  from public.stranka_farar f
 where f.stranka = n.stranka and n.data->'duch'->>'som' = '0' and n.data->'duch'->>'ucet' is distinct from f.ucet::text;

commit;
