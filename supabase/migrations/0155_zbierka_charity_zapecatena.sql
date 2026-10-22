-- ============================================================
-- 0155 · OPRAVY 473 · Zbierka charity po spustení = zapečatená (PRAVIDLA-APPKY „Zbierka charity po spustení“)
-- ------------------------------------------------------------
-- Pri zbierkach stránok typu charita sa po spustení:
--   · text pre darcov (nastavenie.popis, popis2) už nemení — len DOPLNENIA: nastavenie.doplnenia = [{datum, text}],
--     pribúdajú na koniec, uložené sa nedajú prepísať ani zmazať
--   · fotky a video (nastavenie.media) len pridávajú na koniec — pôvodné sa nedajú zmazať ani preusporiadať
-- Kým zbierka nemá ani jeden dar: oprav_zbierku(…) nahradí celú zbierku opravenou kópiou (to isté id, Z-číslo/VS a QR).
-- Ostatné zbierky (farnosť, …) ostávajú podľa 0041. Spúšťa sa po 0154.
-- ============================================================
begin;

/** b je pole, ktoré začína celým poľom a (nič sa nezmazalo ani neprehodilo) */
create or replace function public.jsonb_zacina(a jsonb, b jsonb) returns boolean language sql immutable as $$
  select coalesce(jsonb_typeof(b), 'array') = 'array'
     and jsonb_array_length(coalesce(b, '[]'::jsonb)) >= jsonb_array_length(coalesce(a, '[]'::jsonb))
     and coalesce((select jsonb_agg(e order by i) from jsonb_array_elements(coalesce(b, '[]'::jsonb)) with ordinality t(e, i)
                    where i <= jsonb_array_length(coalesce(a, '[]'::jsonb))), '[]'::jsonb) = coalesce(a, '[]'::jsonb)
$$;

create or replace function public.zbierka_pecat() returns trigger
  language plpgsql as $$
declare v_volne text[] := array['popis', 'popis2', 'media', 'sada', 'eurc', 'sadaE', 'doplnenia'];
        n jsonb; o jsonb; d jsonb;
begin
  if old.zapecatena is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then
    raise exception 'Zapečatenú zbierku nemožno zmazať.' using errcode = '42501', detail = 'zapecatene';
  end if;
  -- 473 (3): oprava pred prvým darom (len cez oprav_zbierku, príznak platí v tej transakcii)
  if current_setting('deed.oprava_zbierky', true) = old.id then
    if new.id is distinct from old.id or new.stranka is distinct from old.stranka or new.modul is distinct from old.modul or new.vs is distinct from old.vs then
      raise exception 'Oprava nemení číslo zbierky ani stránku.' using errcode = '42501', detail = 'zapecatene';
    end if;
    return new;
  end if;
  if new.zapecatena is distinct from old.zapecatena
     or new.nazov is distinct from old.nazov
     or new.ciel is distinct from old.ciel
     or new.stranka is distinct from old.stranka
     or new.modul is distinct from old.modul
     or new.typ is distinct from old.typ
     or (coalesce(new.nastavenie, '{}'::jsonb) - v_volne) is distinct from (coalesce(old.nastavenie, '{}'::jsonb) - v_volne) then
    raise exception 'Zbierka je zapečatená — tento údaj sa už nedá zmeniť.' using errcode = '42501', detail = 'zapecatene';
  end if;
  -- 473: zbierka charity — text zapečatený, doplnenia a fotky len pribúdajú
  if exists (select 1 from public.stranka s where s.id = old.stranka and s.typ = 'charita') then
    n := coalesce(new.nastavenie, '{}'::jsonb); o := coalesce(old.nastavenie, '{}'::jsonb);
    if n->'popis' is distinct from o->'popis' or n->'popis2' is distinct from o->'popis2' then
      raise exception 'Text zbierky je zapečatený pri spustení. Doplniť ho môžete novým riadkom.' using errcode = '42501', detail = 'zapecatene_text';
    end if;
    if not public.jsonb_zacina(o->'media', n->'media') then
      raise exception 'Pôvodné fotky a video sa nedajú zmazať ani preusporiadať, nové sa pridávajú na koniec.' using errcode = '42501', detail = 'zapecatene_media';
    end if;
    if not public.jsonb_zacina(o->'doplnenia', n->'doplnenia') then
      raise exception 'Uložené doplnenie sa nedá prepísať ani zmazať.' using errcode = '42501', detail = 'zapecatene_doplnenie';
    end if;
    for d in select e from jsonb_array_elements(coalesce(n->'doplnenia', '[]'::jsonb)) with ordinality t(e, i)
             where i > jsonb_array_length(coalesce(o->'doplnenia', '[]'::jsonb)) loop
      if length(trim(coalesce(d->>'text', ''))) = 0 or length(d->>'text') > 1000 or (d->>'datum') is null then
        raise exception 'Doplnenie potrebuje text (najviac 1 000 znakov) a dátum.' using errcode = '22023', detail = 'zle_doplnenie';
      end if;
    end loop;
  end if;
  return new;
end $$;

-- 473 (3): Zrušiť a opraviť — kým zbierka nemá dar, správca ju nahradí opravenou kópiou (to isté id, VS a QR)
create or replace function public.oprav_zbierku(p_zbierka text, p_nazov text, p_ciel numeric, p_nastavenie jsonb) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v public.zbierka;
begin
  select * into v from public.zbierka where id = p_zbierka for update;
  if v.id is null then raise exception 'nenajdena' using errcode = 'P0002'; end if;
  if v.stranka is null or not public.spravujem_stranku(v.stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if v.stav <> 'aktivna' then raise exception 'Ukončenú zbierku nemožno opraviť.' using errcode = '42501', detail = 'neaktivna'; end if;
  if exists (select 1 from public.platba pl join public.pohyb po on po.platba_id = pl.id where pl.zbierka = p_zbierka and po.typ = 'dar') then
    raise exception 'Zbierka už má dar — opraviť ju nemožno. Ukončite ju a založte novú.' using errcode = '42501', detail = 'ma_dar';
  end if;
  if p_nastavenie is null or jsonb_typeof(p_nastavenie) <> 'object' or length(trim(coalesce(p_nazov, ''))) = 0 then
    raise exception 'zle_data' using errcode = '22023';
  end if;
  perform set_config('deed.oprava_zbierky', p_zbierka, true);
  update public.zbierka set nazov = left(trim(p_nazov), 120), ciel = p_ciel,
         nastavenie = p_nastavenie - 'vs' - 'stav' - 'koniec' - 'doplnenia', zapecatena = now()
   where id = p_zbierka;
  perform set_config('deed.oprava_zbierky', '', true);
end $$;
revoke all on function public.oprav_zbierku(text, text, numeric, jsonb) from public, anon;
grant execute on function public.oprav_zbierku(text, text, numeric, jsonb) to authenticated;

commit;
