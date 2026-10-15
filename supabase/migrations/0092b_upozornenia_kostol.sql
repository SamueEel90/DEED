-- ============================================================
-- 0092b · Odkazy 9 §3 — upozornenia pri brigáde a stretnutí s konkrétnym kostolom (OPRAVY 287)
-- ------------------------------------------------------------
-- Brigáda (oblasť „brigady“) a stretnutie (oblasť „deti“) majú pole kostol: „*“ celá farnosť · id kostola · „~“ iné miesto.
-- Konkrétny kostol → sledujúci farnosti + sledujúci tohto kostola; „*“, „~“ a bez poľa → všetci sledujúci farnosti
-- (ako oznam pre celú farnosť). Zmena kostola pri úprave = „Upravené“.
-- Zmena omše: názov z 0091 (zvoncek_nazov_druhu) — Ranná / Večerná / Hlavná a pridané druhy (Detská, Školská …, OPRAVY 283).
-- Mení sa len funkcia spúšťača upoz_zo_stavu (0088b), tabuľky ani spúšťač nie.
-- ============================================================
begin;

create or replace function public.upoz_zo_stavu() returns trigger
  language plpgsql security definer set search_path = public as $$
declare e jsonb; o jsonb; v_mi text[]; k text; kv jsonb; kl text; kval jsonb; v_dat text; v_kod int; v_posun text; v_zrus boolean; v_naz text; v_kostol text; v_text text;
  v_old jsonb := case when tg_op = 'UPDATE' then old.data end;
begin
  if new.oblast in ('brigady', 'deti') then
    for e in select x from jsonb_array_elements(case when jsonb_typeof(new.data) = 'array' then new.data else '[]'::jsonb end) x loop
      if coalesce(e->>'upoz', '') <> 'true' or coalesce(e->>'id', '') = '' then continue; end if;
      v_mi := case when coalesce(e->>'kostol', '') not in ('', '*', '~') then array[e->>'kostol'] end;
      o := (select x from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) x where x->>'id' = e->>'id' limit 1);
      if o is null then
        v_text := case when new.oblast = 'brigady' then 'Nová brigáda: ' else 'Nové stretnutie: ' end || coalesce(nullif(trim(e->>'t'), ''), 'bez názvu');
        perform public.upozorni_farnost(new.id, case when new.oblast = 'brigady' then 'po' else 'de' end, v_mi, v_text, false, new.oblast || ':' || new.id || ':' || (e->>'id'));
      elsif (o->>'t', o->>'dat', o->>'cas', o->>'kde', o->>'kostol') is distinct from (e->>'t', e->>'dat', e->>'cas', e->>'kde', e->>'kostol') then
        perform public.upozorni_farnost(new.id, case when new.oblast = 'brigady' then 'po' else 'de' end, v_mi, 'Upravené: ' || coalesce(nullif(trim(e->>'t'), ''), 'bez názvu'), false,
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
        v_naz := lower(public.zvoncek_nazov_druhu(kv, v_kod / 10)); -- 0091: ranná / večerná / hlavná / pridaný druh (OPRAVY 283)
        select x->>'nazov' into v_kostol from public.naboz_stav s, jsonb_array_elements(case when jsonb_typeof(s.data) = 'array' then s.data else '[]'::jsonb end) x
          where s.oblast = 'miesta' and s.id = new.id and x->>'id' = k and (case when jsonb_typeof(s.data) = 'array' then jsonb_array_length(s.data) else 0 end) > 1 limit 1;
        v_text := case when v_zrus then 'Zrušená ' || v_naz || ' ' else 'Zmena: ' || v_naz || ' ' end
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

commit;
