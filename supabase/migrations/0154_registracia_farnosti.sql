-- ============================================================
-- 0154 · Registrácia farnosti (testovacia verzia pre testera)
-- zaloz_farnost(názov, obec, cirkev, kostol, iban): prihlásený človek si z vlastného účtu založí farnosť.
--   · organizačný účet (ucet typ 'charita' ako pri zaloz_stranku, 0055) + štatutár = zakladateľ
--   · stránka typu 'farnost' (id „fa-…“), zakladateľ = Farár (stranka_farar) → plné práva v Správe
--   · farnost_adresar: cirkev (kód z tabuľky cirkev) a obec — Adresár a Cirkev farnosti v Správe
--   · prvé miesto farnosti = hlavný kostol z registrácie (naboz_stav 'miesta', id „0“ = kľúč kostola v kalendári)
--   · IBAN voliteľný → nastavenia_stranky.data.ucetFarnosti, neoverený (overenie 0,01 € v Správe)
-- Ostrá verzia (IBAN povinný, IČO z registra, platca ≠ vlastník) príde samostatne. Spúšťa sa po 0153.
-- ============================================================
begin;

create or replace function public.zaloz_farnost(p_nazov text, p_obec text, p_cirkev text, p_kostol text, p_iban text default null)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  v_ja uuid := public.ja_prihlaseny(); v_org uuid; v_id text;
  v_nazov text := trim(coalesce(p_nazov, '')); v_obec text := trim(coalesce(p_obec, ''));
  v_kostol text := trim(coalesce(p_kostol, '')); v_iban text := upper(replace(coalesce(p_iban, ''), ' ', ''));
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if length(v_nazov) < 3 or length(v_nazov) > 120 then raise exception 'zly_nazov' using errcode = '22023'; end if;
  if length(v_obec) < 2 or length(v_obec) > 80 then raise exception 'zla_obec' using errcode = '22023'; end if;
  if length(v_kostol) < 2 or length(v_kostol) > 80 then raise exception 'zly_kostol' using errcode = '22023'; end if;
  if not exists (select 1 from public.cirkev where kod = p_cirkev) then raise exception 'zla_cirkev' using errcode = '22023'; end if;
  if v_iban <> '' and v_iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' then raise exception 'zly_iban' using errcode = '22023'; end if;

  insert into public.ucet (typ, stav_registracie) values ('charita', 'stranka') returning id into v_org;
  insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values (v_org, v_ja, 'farár (registroval)');
  v_id := 'fa-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values (v_id, v_org, 'farnost', v_nazov, false);
  insert into public.stranka_farar (stranka, ucet) values (v_id, v_ja) on conflict (stranka) do update set ucet = excluded.ucet, od = now();
  -- riadok adresára vznikol triggerom farnost_adresar_nova (0076)
  insert into public.farnost_adresar (stranka, cirkev, obec) values (v_id, p_cirkev, v_obec)
    on conflict (stranka) do update set cirkev = excluded.cirkev, obec = excluded.obec;
  insert into public.naboz_stav (oblast, id, data) values ('miesta', v_id, jsonb_build_array(jsonb_build_object(
    'id', '0', 'druh', 'farsky', 'nazov', v_kostol, 'adresa', v_obec, 'media', '[]'::jsonb, 'popis', '', 'historia', '', 'vytvorene', now())))
    on conflict (oblast, id) do update set data = excluded.data, upravene = now();
  if v_iban <> '' then
    insert into public.nastavenia_stranky (stranka, data) values (v_id, jsonb_build_object('ucetFarnosti', v_iban))
      on conflict (stranka) do update set data = public.nastavenia_stranky.data || excluded.data;
  end if;
  return v_id;
end $$;
revoke all on function public.zaloz_farnost(text, text, text, text, text) from public, anon;
grant execute on function public.zaloz_farnost(text, text, text, text, text) to authenticated;

commit;
