-- ============================================================
-- 0071 · Iskra druhu Zbierky (video k vlastnej zbierke: výzva / priebeh / ďakujeme / ďakujeme firme)
-- ------------------------------------------------------------
-- Appka ho mala len v relácii (server poznal druh 1–5 bez väzby na zbierku) → video videl len autor
-- do reloadu. Teraz: druh 6 + stĺpec zb { typ, stitok, stranka, zbierkaId, firma? }.
-- iskra_zverejni je 1:1 ako v 0035, navyše zapíše zb. Kvóta a správca stránky platia rovnako.
-- ============================================================
begin;

alter table public.iskra drop constraint if exists iskra_druh_check;
alter table public.iskra add constraint iskra_druh_check check (druh between 1 and 6);
alter table public.iskra add column if not exists zb jsonb check (zb is null or jsonb_typeof(zb) = 'object');

create or replace function public.iskra_zverejni(p jsonb) returns public.iskra
  language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();                 -- len kvôli priečinku súboru v Storage
  v_ucet    uuid := public.zaisti_ucet();       -- väzba dát = účet
  v_video   text := p->>'video';
  v_plagat  text := nullif(p->>'plagat', '');
  v_stranka text := nullif(p->>'stranka', '');
  v_len     boolean := coalesce((p->>'len_stranka')::boolean, false) and v_stranka is not null;
  v_tier    smallint := 0;
  v_od      timestamptz := date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava';
  v_pouzite int;
  v_nad     boolean := false;
  v_riadok  public.iskra;
begin
  if v_uid is null or v_ucet is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if v_video is null or split_part(v_video, '/', 1) <> v_uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'iskry' and name = v_video) then
    raise exception 'video_chyba' using errcode = '22023';
  end if;
  if v_plagat is not null and (split_part(v_plagat, '/', 1) <> v_uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'iskry' and name = v_plagat)) then
    v_plagat := null;
  end if;

  if v_stranka is not null then
    if not public.spravujem_stranku(v_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
    perform pg_advisory_xact_lock(hashtext('iskra_kvota:' || v_stranka));
    insert into public.stranka_program (stranka, tier) values (v_stranka, 0) on conflict (stranka) do nothing;
    select tier into v_tier from public.stranka_program where stranka = v_stranka for update;
    if not v_len then
      select count(*) into v_pouzite from public.iskra
        where stranka = v_stranka and not len_stranka and zverejnene >= v_od;
      v_nad := v_pouzite >= public.iskry_limit(v_tier);
    end if;
  end if;

  insert into public.iskra (autor_ucet, stranka, druh, autor, kto, ini, popis, video, plagat, dlzka_s,
                            zbierka, zb, bez_darov, retaz_pct, len_stranka, nad_kvotu)
  values (v_ucet, v_stranka, (p->>'druh')::smallint, p->>'autor', coalesce(p->>'kto', ''), coalesce(p->>'ini', ''),
          p->>'popis', v_video, v_plagat, nullif(p->>'dlzka_s', '')::numeric,
          case when jsonb_typeof(p->'zbierka') = 'object' then p->'zbierka' end,
          case when jsonb_typeof(p->'zb') = 'object' then p->'zb' end,
          coalesce((p->>'bez_darov')::boolean, false), nullif(p->>'retaz_pct', '')::smallint, v_len, v_nad)
  returning * into v_riadok;

  if v_nad then
    insert into public.iskra_poplatok (stranka, iskra_id, mesiac, suma_eur, vytvoril_ucet)
      values (v_stranka, v_riadok.id, to_char(now() at time zone 'Europe/Bratislava', 'YYYY-MM'), 10, v_ucet);
  end if;
  return v_riadok;
end $$;

commit;
