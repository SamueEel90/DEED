-- ============================================================
-- 0088b · KARTA 63 (Odkazy 7 §2) — doručenie upozornení z farnosti: zvonček + push
-- ------------------------------------------------------------
-- Appka pri každej veci ukladá upoz: true/false (0087 + JSON). Tu ich server premení na upozornenia:
-- 1. upozornenie_farnosti — čo farnosť zverejnila s „Upozorniť sledujúcich“ (zdroj = kľúč, nič sa nepošle dvakrát).
--    Vzniká spúšťačmi: naboz_prispevok (oznam, udalosť, parte, oznámenie: data.oz.upoz),
--    naboz_stav (brigády „brigady“, Deti a mládež „deti“: položka.upoz; zmena omše „kalendar“: odpovede = „ano“),
--    zbierka (nastavenie.farnost.upoz).
-- 2. Komu: sledujúci farnosti (moje_farnosti, domovská aj sledovaná) a sledujúci kostola (moje_kostoly)
--    so zapnutým blokom; kostol dostane len vec pre celú farnosť alebo pre svoj kostol (miesta).
-- 3. Kedy: zrušená/zmenená omša a parte hneď. Ostatné do denného súhrnu (upozornenie_cakajuce → raz denne
--    jedna správa „3 novinky z Farnosti Trenčín“), ak používateľ nemá moje_data deed.farnostiSuhrn = false.
-- 4. Prihláseným na udalosť, brigádu alebo stretnutie ide deň vopred pripomienka (rsvp + reakcie „ucast“).
-- 5. Push: push_odber (zariadenia používateľa), notifikacia.push = treba poslať; /api/push (Vercel) pošle
--    a nastaví push_odoslane. Kopne ho pg_net z pg_cron raz za minútu, len keď niečo čaká.
-- E-maily z farnosti veriacim sa NEPOSIELAJÚ (Martin 13. 10.).
-- ============================================================
begin;

-- ---------- 1 · fronta a čakajúce na súhrn (len server, žiadne granty) ----------
create table if not exists public.upozornenie_farnosti (
  id        bigint generated always as identity primary key,
  stranka   text not null references public.stranka (id) on delete cascade,
  blok      text not null check (public.bloky_ok(array[blok])),
  miesta    text[],                                   -- null = celá farnosť
  text      text not null,
  hned      boolean not null default false,
  zdroj     text not null unique,
  autor     uuid,
  prijemcov int not null default 0,
  vytvorene timestamptz not null default now()
);
create index if not exists upozornenie_farnosti_stranka on public.upozornenie_farnosti (stranka, vytvorene desc);
alter table public.upozornenie_farnosti enable row level security;
revoke all on table public.upozornenie_farnosti from anon, authenticated;

create table if not exists public.upozornenie_cakajuce (
  ucet_id     uuid not null references public.ucet (id) on delete cascade,
  upozornenie bigint not null references public.upozornenie_farnosti (id) on delete cascade,
  primary key (ucet_id, upozornenie)
);
alter table public.upozornenie_cakajuce enable row level security;
revoke all on table public.upozornenie_cakajuce from anon, authenticated;

create table if not exists public.pripomienka_odoslana (
  zdroj text primary key,
  cas   timestamptz not null default now()
);
alter table public.pripomienka_odoslana enable row level security;
revoke all on table public.pripomienka_odoslana from anon, authenticated;

-- ---------- 5a · push odbery + značka pri notifikácii ----------
create table if not exists public.push_odber (
  id        bigint generated always as identity primary key,
  ucet_id   uuid not null default public.moj_ucet() references public.ucet (id) on delete cascade,
  endpoint  text not null unique check (endpoint ~ '^https://' and length(endpoint) < 1000),
  p256dh    text not null check (length(p256dh) < 200),
  auth      text not null check (length(auth) < 100),
  pridane   timestamptz not null default now()
);
create index if not exists push_odber_ucet on public.push_odber (ucet_id);
alter table public.push_odber enable row level security;
drop policy if exists push_citat on public.push_odber;
create policy push_citat on public.push_odber for select to authenticated using (ucet_id = public.moj_ucet());
drop policy if exists push_zmazat on public.push_odber;
create policy push_zmazat on public.push_odber for delete to authenticated using (ucet_id = public.moj_ucet());
revoke all on table public.push_odber from anon, authenticated;
grant select, delete on table public.push_odber to authenticated;

-- uloží odber tohto zariadenia (endpoint je jedinečný: pri prihlásení iného účtu prejde naň)
create or replace function public.uloz_push_odber(p_endpoint text, p_p256dh text, p_auth text) returns boolean
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet();
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  insert into public.push_odber (ucet_id, endpoint, p256dh, auth) values (v_ja, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set ucet_id = v_ja, p256dh = excluded.p256dh, auth = excluded.auth, pridane = now();
  -- najviac 10 zariadení na účet (najstaršie preč)
  delete from public.push_odber where ucet_id = v_ja and id not in (select id from public.push_odber where ucet_id = v_ja order by pridane desc limit 10);
  return true;
end $$;
revoke all on function public.uloz_push_odber(text, text, text) from public;
grant execute on function public.uloz_push_odber(text, text, text) to authenticated, service_role;

alter table public.notifikacia add column if not exists push boolean not null default false;
alter table public.notifikacia add column if not exists push_odoslane timestamptz;
create index if not exists notifikacia_push_caka on public.notifikacia (cas) where push and push_odoslane is null;

-- zvonček (+ push, keď má účet zariadenie)
create or replace function public.notifikuj_ucet(p_ucet uuid, p_titul text, p_text text, p_ikona text default 'kal') returns void
  language sql security definer set search_path = public as $$
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, push)
  values (p_ucet, 'sledovane', p_ikona, left(p_titul, 200), left(p_text, 500), exists (select 1 from public.push_odber o where o.ucet_id = p_ucet));
$$;
revoke all on function public.notifikuj_ucet(uuid, text, text, text) from public;

-- ---------- 2+3 · rozoslanie ----------
-- súhrn: chýba alebo true = súhrn, false = jednotlivo
create or replace function public.chce_suhrn(p_ucet uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select not (d.data = 'false'::jsonb or d.data = '"false"'::jsonb) from public.moje_data d where d.ucet_id = p_ucet and d.kluc = 'deed.farnostiSuhrn'), true);
$$;
revoke all on function public.chce_suhrn(uuid) from public;

create or replace function public.upozorni_farnost(p_stranka text, p_blok text, p_miesta text[], p_text text, p_hned boolean, p_zdroj text) returns int
  language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_naz text; v_autor uuid := public.moj_ucet(); v_n int := 0; r record;
begin
  select nazov into v_naz from public.stranka where id = p_stranka;
  if v_naz is null or coalesce(trim(p_text), '') = '' or not public.bloky_ok(array[p_blok]) then return 0; end if;
  insert into public.upozornenie_farnosti (stranka, blok, miesta, text, hned, zdroj, autor)
  values (p_stranka, p_blok, nullif(p_miesta, array[]::text[]), left(trim(p_text), 300), p_hned, p_zdroj, v_autor)
  on conflict (zdroj) do nothing returning id into v_id;
  if v_id is null then return 0; end if;
  for r in
    select distinct x.u from (
      select f.ucet_id u from public.moje_farnosti f where f.stranka = p_stranka and p_blok = any (f.bloky)
      union
      select k.ucet_id from public.moje_kostoly k where k.stranka = p_stranka and p_blok = any (k.bloky)
        and (p_miesta is null or cardinality(p_miesta) = 0 or k.miesto = any (p_miesta))
    ) x where x.u is distinct from v_autor
  loop
    if p_hned or not public.chce_suhrn(r.u) then perform public.notifikuj_ucet(r.u, v_naz, left(trim(p_text), 300), case when p_blok = 'sp' then 'srd' else 'kal' end);
    else insert into public.upozornenie_cakajuce (ucet_id, upozornenie) values (r.u, v_id) on conflict do nothing;
    end if;
    v_n := v_n + 1;
  end loop;
  update public.upozornenie_farnosti set prijemcov = v_n where id = v_id;
  return v_n;
end $$;
revoke all on function public.upozorni_farnost(text, text, text[], text, boolean, text) from public;
grant execute on function public.upozorni_farnost(text, text, text[], text, boolean, text) to service_role;

-- pomocné: jsonb pole textov → text[] (iné tvary = null)
create or replace function public.jsonb_texty(p jsonb) returns text[] language sql immutable as $$
  select case when jsonb_typeof(p) = 'array' then array(select jsonb_array_elements_text(p)) end
$$;
-- 1 novinka · 2–4 novinky · 5+ noviniek
create or replace function public.novinky_sk(n int) returns text language sql immutable as $$
  select n || case when n = 1 then ' novinka' when n between 2 and 4 then ' novinky' else ' noviniek' end
$$;
-- „Farnosť Trenčín“ → „Farnosti Trenčín“ (z …)
create or replace function public.farnost_gen(p text) returns text language sql immutable as $$
  select regexp_replace(p, '^Farnosť\M', 'Farnosti')
$$;

-- ---------- spúšťač: príspevky farnosti (oznam, udalosť, parte, oznámenie) ----------
create or replace function public.upoz_z_prispevku() returns trigger
  language plpgsql security definer set search_path = public as $$
declare d jsonb := new.data; oz jsonb := new.data->'oz'; v_dr int; v_blok text; v_miesta text[]; v_druh text; v_zdroj text;
begin
  if coalesce(oz->>'upoz', '') <> 'true' then return new; end if;
  if tg_op = 'UPDATE' and old.data->'oz'->>'upoz' = 'true'
     and old.data->>'nazov' is not distinct from d->>'nazov' and old.data->>'popis' is not distinct from d->>'popis'
     and old.data->>'datum' is not distinct from d->>'datum' and old.data->'udalost' is not distinct from d->'udalost' then
    return new; -- nič podstatné sa nezmenilo (reakcie, opätovný zápis z iného zariadenia …)
  end if;
  v_dr := case when oz->>'dr' ~ '^[0-2]$' then (oz->>'dr')::int else 0 end;
  v_blok := case v_dr when 0 then 'oz' when 1 then 'pr' else case when d->>'ukat' = 'pohreb' or jsonb_typeof(d->'smutocny') = 'object' then 'sp' else 'te' end end;
  v_miesta := coalesce(public.jsonb_texty(oz->'mi'), case when coalesce(oz->>'kk', '') <> '' then array[oz->>'kk'] end);
  if tg_op = 'INSERT' then
    v_druh := case v_blok when 'oz' then 'Nový oznam' when 'pr' then 'Pozvánka' when 'sp' then 'Parte' else 'Oznámenie' end;
    v_zdroj := 'p:' || new.id;
  else
    v_druh := 'Upravené';
    v_zdroj := 'p:' || new.id || ':u:' || to_char(now(), 'YYYYMMDDHH24MI');
  end if;
  perform public.upozorni_farnost(new.farnost_id, v_blok, v_miesta, v_druh || ': ' || coalesce(nullif(trim(d->>'nazov'), ''), 'bez názvu'),
    tg_op = 'INSERT' and v_blok = 'sp', v_zdroj);
  return new;
exception when others then
  raise warning 'upoz_z_prispevku: %', sqlerrm; -- upozornenie nesmie zablokovať zverejnenie
  return new;
end $$;
drop trigger if exists upoz_z_prispevku on public.naboz_prispevok;
create trigger upoz_z_prispevku after insert or update of data on public.naboz_prispevok
  for each row execute function public.upoz_z_prispevku();

-- ---------- spúšťač: stav farnosti (brigády, Deti a mládež, zmena omše) ----------
create or replace function public.upoz_zo_stavu() returns trigger
  language plpgsql security definer set search_path = public as $$
declare e jsonb; o jsonb; k text; kv jsonb; kl text; kval jsonb; v_dat text; v_kod int; v_posun text; v_zrus boolean; v_naz text; v_kostol text; v_text text;
  v_old jsonb := case when tg_op = 'UPDATE' then old.data end;
begin
  if new.oblast in ('brigady', 'deti') then
    for e in select x from jsonb_array_elements(case when jsonb_typeof(new.data) = 'array' then new.data else '[]'::jsonb end) x loop
      if coalesce(e->>'upoz', '') <> 'true' or coalesce(e->>'id', '') = '' then continue; end if;
      o := (select x from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) x where x->>'id' = e->>'id' limit 1);
      if o is null then
        v_text := case when new.oblast = 'brigady' then 'Nová brigáda: ' else 'Nové stretnutie: ' end || coalesce(nullif(trim(e->>'t'), ''), 'bez názvu');
        perform public.upozorni_farnost(new.id, case when new.oblast = 'brigady' then 'po' else 'de' end, null, v_text, false, new.oblast || ':' || new.id || ':' || (e->>'id'));
      elsif (o->>'t', o->>'dat', o->>'cas', o->>'kde') is distinct from (e->>'t', e->>'dat', e->>'cas', e->>'kde') then
        perform public.upozorni_farnost(new.id, case when new.oblast = 'brigady' then 'po' else 'de' end, null, 'Upravené: ' || coalesce(nullif(trim(e->>'t'), ''), 'bez názvu'), false,
          new.oblast || ':' || new.id || ':' || (e->>'id') || ':u:' || to_char(now(), 'YYYYMMDDHH24MI'));
      end if;
    end loop;
  elsif new.oblast = 'kalendar' and jsonb_typeof(new.data->'kostoly') = 'object' then
    for k, kv in select * from jsonb_each(new.data->'kostoly') loop
      if jsonb_typeof(kv->'odpovede') <> 'object' then continue; end if;
      for kl, kval in select * from jsonb_each(kv->'odpovede') loop
        if kval <> '"ano"'::jsonb or v_old->'kostoly'->k->'odpovede'->kl = '"ano"'::jsonb then continue; end if;
        v_dat := split_part(kl, '|', 1);
        if v_dat !~ '^\d{4}-\d{2}-\d{2}$' or split_part(kl, '|', 2) !~ '^\d{1,3}$' then continue; end if;
        v_kod := split_part(kl, '|', 2)::int;
        v_zrus := coalesce(kv->'zrus'->v_dat @> to_jsonb(v_kod), false);
        v_posun := kv->'posun'->v_dat->>v_kod::text;
        if not v_zrus and v_posun is null then continue; end if;
        v_naz := case v_kod / 10 when 0 then 'ranná' when 1 then 'večerná' when 2 then 'veľká' else '' end;
        select x->>'nazov' into v_kostol from public.naboz_stav s, jsonb_array_elements(case when jsonb_typeof(s.data) = 'array' then s.data else '[]'::jsonb end) x
          where s.oblast = 'miesta' and s.id = new.id and x->>'id' = k and (case when jsonb_typeof(s.data) = 'array' then jsonb_array_length(s.data) else 0 end) > 1 limit 1;
        v_text := case when v_zrus then 'Zrušená ' || v_naz || ' omša ' else 'Zmena: ' || v_naz || ' omša ' end
          || to_char(v_dat::date, 'FMDD. FMMM.') || case when v_zrus then '' else ' bude o ' || v_posun end
          || coalesce(' · ' || v_kostol, '');
        perform public.upozorni_farnost(new.id, 'om', array[k], replace(v_text, '  ', ' '), true,
          'om:' || new.id || ':' || k || ':' || kl || ':' || coalesce(v_posun, 'z'));
      end loop;
    end loop;
  end if;
  return new;
exception when others then
  raise warning 'upoz_zo_stavu: %', sqlerrm;
  return new;
end $$;
drop trigger if exists upoz_zo_stavu on public.naboz_stav;
create trigger upoz_zo_stavu after insert or update of data on public.naboz_stav
  for each row when (new.oblast in ('brigady', 'deti', 'kalendar')) execute function public.upoz_zo_stavu();

-- ---------- spúšťač: nová zbierka farnosti ----------
create or replace function public.upoz_zo_zbierky() returns trigger
  language plpgsql security definer set search_path = public as $$
declare f jsonb := new.nastavenie->'farnost';
begin
  if new.stranka is null or coalesce(f->>'upoz', '') <> 'true' then return new; end if;
  perform public.upozorni_farnost(new.stranka, 'zb', case when coalesce(f->>'miesto', '') <> '' then array[f->>'miesto'] end,
    'Nová zbierka: ' || coalesce(nullif(trim(new.nazov), ''), 'zbierka'), false, 'zb:' || new.id);
  return new;
exception when others then
  raise warning 'upoz_zo_zbierky: %', sqlerrm;
  return new;
end $$;
drop trigger if exists upoz_zo_zbierky on public.zbierka;
create trigger upoz_zo_zbierky after insert on public.zbierka
  for each row execute function public.upoz_zo_zbierky();

-- ---------- 3 · denný súhrn ----------
create or replace function public.upozornenia_suhrn_tick() returns int
  language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select c.ucet_id, count(*)::int pocet, count(distinct f.stranka)::int farnosti, min(s.nazov) nazov,
           (array_agg(f.text order by f.vytvorene desc))[1:3] texty, array_agg(f.id) idcka
      from public.upozornenie_cakajuce c
      join public.upozornenie_farnosti f on f.id = c.upozornenie
      join public.stranka s on s.id = f.stranka
     group by c.ucet_id
  loop
    perform public.notifikuj_ucet(r.ucet_id,
      public.novinky_sk(r.pocet) || ' z ' || case when r.farnosti = 1 then public.farnost_gen(r.nazov) else r.farnosti || ' farností' end,
      array_to_string(r.texty, ' · ') || case when r.pocet > 3 then ' …' else '' end);
    delete from public.upozornenie_cakajuce where ucet_id = r.ucet_id and upozornenie = any (r.idcka);
    n := n + 1;
  end loop;
  delete from public.upozornenie_farnosti where vytvorene < now() - interval '90 days';
  delete from public.pripomienka_odoslana where cas < now() - interval '30 days';
  return n;
end $$;
revoke all on function public.upozornenia_suhrn_tick() from public;
grant execute on function public.upozornenia_suhrn_tick() to service_role;

-- ---------- 4 · pripomienka deň vopred prihláseným ----------
create or replace function public.pripomienky_udalosti_tick() returns int
  language plpgsql security definer set search_path = public as $$
declare v_zajtra text := to_char((now() at time zone 'Europe/Bratislava')::date + 1, 'YYYY-MM-DD'); r record; u uuid; n int := 0;
begin
  for r in
    -- udalosti farnosti (príspevky) s upozornením
    select p.farnost_id stranka, p.id ref, coalesce(p.data->>'nazov', 'Udalosť') nazov, p.data->'udalost'->>'cas' cas
      from public.naboz_prispevok p
     where p.data->>'ntyp' = 'udalost' and p.data->'oz'->>'upoz' = 'true' and left(p.data->>'datum', 10) = v_zajtra
    union all
    -- brigády a stretnutia (položky v stave farnosti)
    select s.id, x->>'id', coalesce(x->>'t', 'Stretnutie'), x->>'cas'
      from public.naboz_stav s, jsonb_array_elements(case when jsonb_typeof(s.data) = 'array' then s.data else '[]'::jsonb end) x
     where s.oblast in ('brigady', 'deti') and x->>'upoz' = 'true' and coalesce(x->>'pz', '0') <> '0' and left(x->>'dat', 10) = v_zajtra
  loop
    for u in
      select distinct q.u from (
        select v.ucet_id u from public.rsvp v where v.ref_id = r.ref
        union
        select uc.id from public.naboz_stav rs, jsonb_array_elements_text(case when jsonb_typeof(rs.data->r.ref->'ucast') = 'array' then rs.data->r.ref->'ucast' else '[]'::jsonb end) k
          join public.ucet uc on k ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and uc.id = k::uuid
         where rs.oblast = 'reakcie' and rs.id = r.stranka
      ) q
    loop
      insert into public.pripomienka_odoslana (zdroj) values ('r:' || r.ref || ':' || v_zajtra || ':' || u) on conflict do nothing;
      if found then
        perform public.notifikuj_ucet(u, 'Zajtra: ' || r.nazov, coalesce('o ' || nullif(trim(r.cas), '') || ' · ', '') || coalesce((select nazov from public.stranka where id = r.stranka), ''));
        n := n + 1;
      end if;
    end loop;
  end loop;
  return n;
end $$;
revoke all on function public.pripomienky_udalosti_tick() from public;
grant execute on function public.pripomienky_udalosti_tick() to service_role;

-- ---------- 5b · plán: súhrn a pripomienky raz denne (16:00 UTC = 18:00 v lete, 17:00 v zime), push kop raz za minútu ----------
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_net';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('deed-farnosti-suhrn', '0 16 * * *', 'select public.pripomienky_udalosti_tick(); select public.upozornenia_suhrn_tick();');
    if exists (select 1 from pg_namespace where nspname = 'net') then
      perform cron.schedule('deed-push-kop', '* * * * *', $c$
        select net.http_post(url := 'https://deed-help.vercel.app/api/push', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb)
         where exists (select 1 from public.notifikacia where push and push_odoslane is null and cas > now() - interval '1 day')$c$);
    end if;
  end if;
end $$;

commit;
