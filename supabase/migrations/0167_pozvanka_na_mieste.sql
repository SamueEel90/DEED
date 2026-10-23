-- ============================================================
-- 0167 · OPRAVY 524 (balík 49, Soňa) · Pridať pracovníka · „Je pri vás“ — QR na mieste (charita aj farnosť)
-- ------------------------------------------------------------
-- Správca pri „Áno, má účet · Je pri vás“ ukáže na obrazovke QR, ktorý sa mení každých 15 s.
-- Pracovník ho naskenuje v DEED+ (prihlásený), uvidí „{organizácia} vás pridáva do Správy“ (kto pridáva, čo bude smieť)
-- a podrží Prijať. U správcu sa hneď ukáže „{meno} je v Správe ✓“. Na e-mail nechodí nič.
--
-- Riadok v nastavenia_stranky.data->'ludia' (zapisuje správca, ako ostatné pozvánky):
--   { id, r, p?, prava?, caka: "miesto", dos: ms (QR relácia platí 10 min), tajne: hex, od: { meno, f } }
-- QR = /pozvanka/<stránka>/<id>?t=<token>, token = prvých 10 hex z HMAC-SHA256(kľúč = tajne, správa = číslo 15 s okna).
-- Server prijme token aktuálneho a predchádzajúceho okna (najviac 30 s starý). Odfotený QR neskôr neplatí.
--
--   1. pozvanka_miesto(stránka, id, token) — pri platnom tokene viaže pozvánku na účet, ktorý skenuje
--      (k = jeho e-mail, m = meno z profilu), a vráti, čo appka ukáže. Pozvánku viazanú na iný účet nepustí.
--   2. pozvanka (0125) — nová verzia: pri „miesto“ aj „vyprsala“; navyše vracia prava a od.
--   3. pozvanka_odpoved (0125) — nová verzia: „miesto“ prijme len účet, na ktorý je viazaná, kým platí.
-- Práva má až po Prijať (uroven_stranky / smie_v_stranke počítajú len caka = false). Spúšťa sa po 0166. Idempotentné.
-- ============================================================
begin;

create or replace function public.pozvanka_token(p_tajne text, p_okno bigint) returns text
  language sql immutable set search_path = public, extensions as $$
  select left(encode(hmac(convert_to(p_okno::text, 'UTF8'), convert_to(p_tajne, 'UTF8'), 'sha256'), 'hex'), 10)
$$;
revoke all on function public.pozvanka_token(text, bigint) from public, anon, authenticated;

-- riadok pozvánky v zozname „ludia“
create or replace function public.pozvanka_riadok(p_stranka text, p_id text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select x from public.nastavenia_stranky n,
         jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) x
   where n.stranka = p_stranka and x->>'id' = p_id limit 1
$$;
revoke all on function public.pozvanka_riadok(text, text) from public, anon, authenticated;

create or replace function public.pozvanka_vystup(p_stranka text, c jsonb, p_stav text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object('stranka', p_stranka, 'nazov', (select nazov from public.stranka where id = p_stranka),
                            'typ', (select typ from public.stranka where id = p_stranka),
                            'r', c->>'r', 'p', c->>'p', 'prava', c->'prava', 'od', c->'od', 'stav', p_stav)
$$;
revoke all on function public.pozvanka_vystup(text, jsonb, text) from public, anon, authenticated;

-- 1 · sken QR na mieste
create or replace function public.pozvanka_miesto(p_stranka text, p_id text, p_t text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_mail text; v_meno text; c jsonb; v_l jsonb; v_okno bigint := floor(extract(epoch from now()) / 15)::bigint;
        v_teraz bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select lower(email) into v_mail from auth.users where id = auth.uid();
  if coalesce(v_mail, '') = '' then raise exception 'bez_emailu' using errcode = '22023'; end if;
  c := public.pozvanka_riadok(p_stranka, p_id);
  if c is null then raise exception 'pozvanka_neexistuje' using errcode = 'P0002'; end if;
  if c->'caka' is null or c->'caka' = 'false'::jsonb then
    if lower(trim(coalesce(c->>'k', ''))) = v_mail then return public.pozvanka_vystup(p_stranka, c, 'prijal'); end if;
    raise exception 'pozvanka_neplati' using errcode = '22023';
  end if;
  if c->'caka' <> '"miesto"'::jsonb then raise exception 'pozvanka_neplati' using errcode = '22023'; end if;
  if not ((c->>'dos') ~ '^\d+$') or (c->>'dos')::bigint < v_teraz then raise exception 'vyprsala' using errcode = '22023'; end if;
  if coalesce(c->>'k', '') like '%@%' then
    -- už viazaná: tomu istému účtu ju ukážeme znova, inému nie
    if lower(trim(c->>'k')) = v_mail then return public.pozvanka_vystup(p_stranka, c, 'caka'); end if;
    raise exception 'pozvanka_neplati' using errcode = '22023';
  end if;
  if coalesce(p_t, '') = '' or coalesce(c->>'tajne', '') = ''
     or p_t not in (public.pozvanka_token(c->>'tajne', v_okno), public.pozvanka_token(c->>'tajne', v_okno - 1)) then
    raise exception 'qr_neplatny' using errcode = '22023';
  end if;
  -- ten istý človek už v Správe je?
  select data->'ludia' into v_l from public.nastavenia_stranky where stranka = p_stranka for update;
  if exists (select 1 from jsonb_array_elements(v_l) x where x->>'id' <> p_id and lower(trim(coalesce(x->>'k', ''))) = v_mail) then
    raise exception 'uz_v_sprave' using errcode = '22023';
  end if;
  select nullif(trim(concat_ws(' ', nullif(trim(p.meno), ''), nullif(trim(p.priezvisko), ''))), '') into v_meno
    from public.profil p where p.ucet_id = public.moj_ucet();
  c := c || jsonb_build_object('k', v_mail, 'm', coalesce(v_meno, v_mail));
  perform set_config('deed.pozvanka', p_stranka, true);
  update public.nastavenia_stranky
     set data = jsonb_set(data, '{ludia}', (select jsonb_agg(case when x->>'id' = p_id then c else x end) from jsonb_array_elements(v_l) x))
   where stranka = p_stranka;
  perform set_config('deed.pozvanka', '', true);
  return public.pozvanka_vystup(p_stranka, c, 'caka');
end $$;
revoke all on function public.pozvanka_miesto(text, text, text) from public, anon;
grant execute on function public.pozvanka_miesto(text, text, text) to authenticated;

-- 2 · čo vidí pozvaný (0125 + „miesto“, prava, od)
create or replace function public.pozvanka(p_stranka text, p_id text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare c jsonb; v_mail text; v_stav text; v_teraz bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select lower(email) into v_mail from auth.users where id = auth.uid();
  c := public.pozvanka_riadok(p_stranka, p_id);
  if c is null then raise exception 'pozvanka_neexistuje' using errcode = 'P0002'; end if;
  if c->'caka' = '"odkaz"'::jsonb then
    v_stav := case when (c->>'dos') ~ '^\d+$' and (c->>'dos')::bigint < v_teraz then 'vyprsala' else 'caka' end;
  elsif lower(trim(coalesce(c->>'k', ''))) <> coalesce(v_mail, '') then
    raise exception 'pozvanka_neexistuje' using errcode = 'P0002'; -- cudziu pozvánku neukážeme
  elsif c->'caka' = '"miesto"'::jsonb then
    v_stav := case when not ((c->>'dos') ~ '^\d+$') or (c->>'dos')::bigint < v_teraz then 'vyprsala' else 'caka' end;
  elsif c->'caka' = 'true'::jsonb then v_stav := 'caka';
  elsif c->'caka' = '"odmietol"'::jsonb then v_stav := 'odmietol';
  elsif c->'caka' is null or c->'caka' = 'false'::jsonb then v_stav := 'prijal';
  else v_stav := 'caka';
  end if;
  return public.pozvanka_vystup(p_stranka, c, v_stav);
end $$;
revoke all on function public.pozvanka(text, text) from public, anon;
grant execute on function public.pozvanka(text, text) to authenticated;

-- 3 · Prijať / Odmietnuť (0125 + „miesto“)
create or replace function public.pozvanka_odpoved(p_stranka text, p_id text, p_prijat boolean) returns text
  language plpgsql volatile security definer set search_path = public as $$
declare v_mail text; v_l jsonb; c jsonb; v_nove jsonb; v_teraz bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select lower(email) into v_mail from auth.users where id = auth.uid();
  if coalesce(v_mail, '') = '' then raise exception 'bez_emailu' using errcode = '22023'; end if;
  select data->'ludia' into v_l from public.nastavenia_stranky where stranka = p_stranka for update;
  select x into c from jsonb_array_elements(case when jsonb_typeof(v_l) = 'array' then v_l else '[]'::jsonb end) x where x->>'id' = p_id limit 1;
  if c is null then raise exception 'pozvanka_neexistuje' using errcode = 'P0002'; end if;
  if c->'caka' = '"odkaz"'::jsonb then
    if (c->>'dos') ~ '^\d+$' and (c->>'dos')::bigint < v_teraz then raise exception 'vyprsala' using errcode = '22023'; end if;
    v_nove := c || jsonb_build_object('k', v_mail);
  elsif c->'caka' = '"miesto"'::jsonb and lower(trim(coalesce(c->>'k', ''))) = v_mail then
    if not ((c->>'dos') ~ '^\d+$') or (c->>'dos')::bigint < v_teraz then raise exception 'vyprsala' using errcode = '22023'; end if;
    v_nove := c - 'tajne';
  elsif c->'caka' = 'true'::jsonb and lower(trim(coalesce(c->>'k', ''))) = v_mail then
    v_nove := c;
  else
    raise exception 'pozvanka_neplati' using errcode = '22023';
  end if;
  v_nove := v_nove || case when p_prijat then jsonb_build_object('caka', false, 'prijal', v_teraz) else jsonb_build_object('caka', 'odmietol') end;
  perform set_config('deed.pozvanka', p_stranka, true);
  update public.nastavenia_stranky
     set data = jsonb_set(data, '{ludia}', (select jsonb_agg(case when x->>'id' = p_id then v_nove else x end) from jsonb_array_elements(v_l) x))
   where stranka = p_stranka;
  perform set_config('deed.pozvanka', '', true);
  return case when p_prijat then 'prijal' else 'odmietol' end;
end $$;
revoke all on function public.pozvanka_odpoved(text, text, boolean) from public, anon;
grant execute on function public.pozvanka_odpoved(text, text, boolean) to authenticated;

commit;
