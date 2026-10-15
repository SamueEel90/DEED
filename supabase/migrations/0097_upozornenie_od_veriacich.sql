-- ============================================================
-- 0097 · OPRAVY 315 — upozornenie farárovi o príspevku od veriaceho (naostro, doteraz PLACEBO)
-- ------------------------------------------------------------
-- 1. notifikacia.odkaz — kam vedie ťuk na upozornenie v zvončeku (appka ho číta, nikdy mŕtve upozornenie):
--      odv:{stranka}:{prispevok}   farár → Správa → Od veriacich, príspevok zvýraznený
-- 2. Spúšťač na naboz_stav, oblasť „odfarnikov“ (id = stránka, data = pole príspevkov od veriacich):
--      nový príspevok, ktorý čaká na schválenie (stav „caka“)  → „Čaká na vaše schválenie ›“
--      nový príspevok zverejnený rovno                         → „Nový príspevok od veriacich ›“
--      nový úmysel na omšu                                     → „Nový úmysel na omšu ›“
--      príspevok niekto nahlásil (pribudol v „nahlasili“)      → „Nahlásený príspevok ›“
--    Komu: správcovia stránky (vlastník stránky a štatutári organizácie), nie ten, kto zapisuje.
--    Len keď farár má zapnuté „Upozorniť ma na nový príspevok“ (naboz_stav „odfnast“.upozornit, predvolené áno).
--    Push ide ako pri farnosti (notifikacia.push, keď má účet zariadenie; /api/push z 0088b).
--    Každá vec najviac raz (pripomienka_odoslana, zdroj „odv:…“) — opätovný zápis poľa z iného zariadenia nič nepošle.
-- ============================================================
begin;

alter table public.notifikacia add column if not exists odkaz text;
alter table public.notifikacia drop constraint if exists notifikacia_odkaz_ok;
alter table public.notifikacia add constraint notifikacia_odkaz_ok check (odkaz is null or length(odkaz) < 300);

-- správcovia stránky: vlastník + štatutári (osoby) organizácie, ktorej stránka patrí
create or replace function public.spravcovia_stranky(p_stranka text) returns table (ucet_id uuid)
  language sql stable security definer set search_path = public as $$
  select s.ucet_id from public.stranka s where s.id = p_stranka and s.ucet_id is not null
  union
  select t.osoba_ucet_id from public.stranka s join public.statutar t on t.org_ucet_id = s.ucet_id where s.id = p_stranka
$$;
revoke all on function public.spravcovia_stranky(text) from public;

create or replace function public.upoz_od_veriacich() returns trigger
  language plpgsql security definer set search_path = public as $$
declare e jsonb; o jsonb; v_old jsonb := case when tg_op = 'UPDATE' then old.data end; v_ja uuid := public.moj_ucet();
  v_titul text; v_ikona text; v_zdroj text; v_druh text; v_text text; v_nahl int; v_nahl_o int; u uuid;
begin
  if coalesce((select s.data->>'upozornit' from public.naboz_stav s where s.oblast = 'odfnast' and s.id = new.id), 'true') = 'false' then return new; end if;
  for e in select x from jsonb_array_elements(case when jsonb_typeof(new.data) = 'array' then new.data else '[]'::jsonb end) x loop
    if coalesce(e->>'id', '') = '' then continue; end if;
    o := (select x from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) x where x->>'id' = e->>'id' limit 1);
    v_nahl := case when jsonb_typeof(e->'nahlasili') = 'array' then jsonb_array_length(e->'nahlasili') when e->>'nahl' ~ '^\d{1,6}$' then (e->>'nahl')::int else 0 end;
    v_titul := null;
    if o is null then
      if coalesce(e->>'osobne', '') = 'true' then continue; end if; -- zapísal farár sám
      if e->>'k' = 'umysel' then v_titul := 'Nový úmysel na omšu ›'; v_ikona := 'srd';
      elsif e->>'stav' = 'caka' then v_titul := 'Čaká na vaše schválenie ›'; v_ikona := 'otaz';
      elsif e->>'stav' is null then v_titul := 'Nový príspevok od veriacich ›'; v_ikona := 'lud';
      end if;
      v_zdroj := 'odv:' || new.id || ':' || (e->>'id');
    else
      v_nahl_o := case when jsonb_typeof(o->'nahlasili') = 'array' then jsonb_array_length(o->'nahlasili') when o->>'nahl' ~ '^\d{1,6}$' then (o->>'nahl')::int else 0 end;
      if v_nahl > v_nahl_o then v_titul := 'Nahlásený príspevok ›'; v_ikona := 'namiet'; v_zdroj := 'odv:' || new.id || ':' || (e->>'id') || ':n' || v_nahl; end if;
    end if;
    if v_titul is null then continue; end if;
    insert into public.pripomienka_odoslana (zdroj) values (v_zdroj) on conflict do nothing;
    if not found then continue; end if;
    v_druh := case e->>'k' when 'parte' then 'Parte' when 'svadba' then 'Svadobné oznámenie' when 'ine' then 'Oznámenie' when 'oznam' then 'Oznam'
      when 'udalost' then 'Udalosť' when 'umysel' then 'Úmysel' when 'fotky' then 'Fotky z akcie' when 'modlitba' then 'Prosba o modlitbu' else 'Príspevok' end;
    v_text := v_druh || ': ' || coalesce(nullif(trim(e->>'t'), ''), 'bez názvu') || coalesce(' · ' || nullif(trim(e->>'kto'), ''), '');
    for u in select distinct x.ucet_id from public.spravcovia_stranky(new.id) x where x.ucet_id is distinct from v_ja loop
      insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
      values (u, 'socialne', v_ikona, v_titul, left(v_text, 500), 'odv:' || new.id || ':' || (e->>'id'),
              exists (select 1 from public.push_odber p where p.ucet_id = u));
    end loop;
  end loop;
  return new;
exception when others then
  raise warning 'upoz_od_veriacich: %', sqlerrm; -- upozornenie nesmie zablokovať príspevok
  return new;
end $$;
drop trigger if exists upoz_od_veriacich on public.naboz_stav;
create trigger upoz_od_veriacich after insert or update of data on public.naboz_stav
  for each row when (new.oblast = 'odfarnikov') execute function public.upoz_od_veriacich();

commit;
