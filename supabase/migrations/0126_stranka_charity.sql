-- ============================================================
-- 0126 · OPRAVY 402 — každá registrácia charity = nová samostatná stránka s vlastným id
-- ------------------------------------------------------------
-- Registrácia (CharitaB) zakladala organizačný účet (zaloz_organizaciu, 0055), ale stránku nie — Správa bežala
-- na testovacej stránke „svetlo“ a každá nová charita ju prepísala.
-- zaloz_stranku_organizacie(org, názov): pre organizáciu, ktorú prihlásený spravuje (štatutár), založí jej stránku
-- s novým id („ch-…“). Jedna organizácia = jedna stránka; druhé volanie vráti tú istú (opakovaný krok registrácie).
-- ============================================================
begin;

create or replace function public.zaloz_stranku_organizacie(p_org uuid, p_nazov text) returns text
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.ja_prihlaseny(); v_id text; v_typ text;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not exists (select 1 from public.statutar where org_ucet_id = p_org and osoba_ucet_id = v_ja) then
    raise exception 'nie_spravca' using errcode = '42501';
  end if;
  select typ into v_typ from public.ucet where id = p_org;
  if v_typ is null or v_typ not in ('charita', 'firma') then raise exception 'zly_typ' using errcode = '22023'; end if;
  select id into v_id from public.stranka where ucet_id = p_org order by id limit 1;
  if v_id is not null then
    update public.stranka set nazov = coalesce(nullif(trim(p_nazov), ''), nazov) where id = v_id;
    return v_id;
  end if;
  v_id := 'ch-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into public.stranka (id, ucet_id, typ, nazov, testovacia)
  values (v_id, p_org, case when v_typ = 'firma' then 'firma' else 'charita' end, left(coalesce(nullif(trim(p_nazov), ''), 'Nová organizácia'), 120), false);
  return v_id;
end $$;
revoke all on function public.zaloz_stranku_organizacie(uuid, text) from public, anon;
grant execute on function public.zaloz_stranku_organizacie(uuid, text) to authenticated;

commit;
