-- ============================================================
-- 0105 · OPRAVY 339 — nahlásený príspevok: farár „V poriadku · ponechať“
-- ------------------------------------------------------------
-- Appka pri ponechaní vymaže v príspevku „nahlasili“ a zapíše „ponechane“: { cas, nahlasili: [kto nahlásil] }.
-- Náhrada upoz_od_veriacich (0097 / 0099):
--   1. kto príspevok nahlásil, dostane upozornenie „Farár príspevok skontroloval a ponechal“
--      — len keď zapisuje správca stránky a len účty, ktoré boli v „nahlasili“ pred zápisom (nikto iný sa nedá podstrčiť);
--      odkaz prisp:{stránka}:{príspevok} (otvorí príspevok na stránke). Posiela sa vždy, nastavenie farára „upozornit“ sa ho netýka.
--   2. nové nahlásenie po ponechaní znova upozorní farára (zdroj nesie čas ponechania, predtým by sa „n1“ už neposlal).
-- Ostatné správanie bez zmeny.
-- ============================================================
begin;

create or replace function public.upoz_od_veriacich() returns trigger
  language plpgsql security definer set search_path = public as $$
declare e jsonb; o jsonb; v_old jsonb := case when tg_op = 'UPDATE' then old.data end; v_ja uuid := public.moj_ucet();
  v_titul text; v_ikona text; v_zdroj text; v_druh text; v_text text; v_nahl int; v_nahl_o int; u uuid;
  v_upoz boolean; v_spravca boolean; k text;
begin
  v_upoz := coalesce((select s.data->>'upozornit' from public.naboz_stav s where s.oblast = 'odfnast' and s.id = new.id), 'true') <> 'false';
  v_spravca := v_ja is not null and exists (select 1 from public.spravcovia_stranky(new.id) x where x.ucet_id = v_ja);
  for e in select x from jsonb_array_elements(case when jsonb_typeof(new.data) = 'array' then new.data else '[]'::jsonb end) x loop
    if coalesce(e->>'id', '') = '' then continue; end if;
    o := (select x from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) x where x->>'id' = e->>'id' limit 1);
    v_druh := case e->>'k' when 'parte' then 'Parte' when 'svadba' then 'Svadobné oznámenie' when 'ine' then 'Oznámenie' when 'oznam' then 'Oznam'
      when 'udalost' then 'Udalosť' when 'umysel' then 'Úmysel' when 'fotky' then 'Fotky z akcie' when 'modlitba' then 'Prosba o modlitbu' else 'Príspevok' end;

    -- 1 · ponechané farárom → správa tým, kto nahlásili
    if o is not null and v_spravca and jsonb_typeof(e->'ponechane') = 'object'
       and (e->'ponechane'->>'cas') is distinct from (o->'ponechane'->>'cas') and jsonb_typeof(o->'nahlasili') = 'array' then
      for k in select jsonb_array_elements_text(o->'nahlasili') loop
        if k !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then continue; end if;
        u := k::uuid;
        if u = v_ja or not exists (select 1 from public.ucet where id = u) then continue; end if;
        insert into public.pripomienka_odoslana (zdroj) values ('odvp:' || new.id || ':' || (e->>'id') || ':' || (e->'ponechane'->>'cas') || ':' || k) on conflict do nothing;
        if not found then continue; end if;
        insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
        values (u, 'socialne', 'lud', 'Farár príspevok skontroloval a ponechal',
                left(v_druh || ': ' || coalesce(nullif(trim(e->>'t'), ''), 'bez názvu'), 500), 'prisp:' || new.id || ':' || (e->>'id'),
                exists (select 1 from public.push_odber p where p.ucet_id = u));
      end loop;
    end if;

    if not v_upoz then continue; end if;
    v_nahl := case when jsonb_typeof(e->'nahlasili') = 'array' then jsonb_array_length(e->'nahlasili') when e->>'nahl' ~ '^\d{1,6}$' then (e->>'nahl')::int else 0 end;
    v_titul := null;
    if o is null then
      if coalesce(e->>'osobne', '') = 'true' then continue; end if;
      if e ? 'rozhodnute' then continue; end if; -- OPRAVY 330: zverejnený po schválení
      if e->>'k' = 'umysel' then v_titul := 'Nový úmysel na omšu ›'; v_ikona := 'srd';
      elsif e->>'stav' is null then v_titul := 'Nový príspevok od veriacich ›'; v_ikona := 'lud';
      end if;
      v_zdroj := 'odv:' || new.id || ':' || (e->>'id');
    else
      v_nahl_o := case when jsonb_typeof(o->'nahlasili') = 'array' then jsonb_array_length(o->'nahlasili') when o->>'nahl' ~ '^\d{1,6}$' then (o->>'nahl')::int else 0 end;
      if v_nahl > v_nahl_o then
        v_titul := 'Nahlásený príspevok ›'; v_ikona := 'namiet';
        v_zdroj := 'odv:' || new.id || ':' || (e->>'id') || ':n' || v_nahl || coalesce(':p' || (e->'ponechane'->>'cas'), '');
      end if;
    end if;
    if v_titul is null then continue; end if;
    insert into public.pripomienka_odoslana (zdroj) values (v_zdroj) on conflict do nothing;
    if not found then continue; end if;
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

commit;
