-- ============================================================
-- 0168 · OPRAVY 526 (Martin 23. 10.) · cieľ zbierky nie je strop, je to spúšťač uzavretia
-- ------------------------------------------------------------
--  · Dar sa vždy pripíše celý tej zbierke, na ktorú smeroval (aj keď suma preskočí cieľ). Nič sa nedelí ani nepresmeruje
--    (tak to server robil aj doteraz).
--  · Nový stĺpec zbierka.auto_uzavriet (predvolene true) = prepínač „Po naplnení cieľa zbierku automaticky uzavrieť“.
--    Pri zakladaní ho appka pošle v nastavení (autoUzavriet), neskôr ho správca mení cez zbierka_auto_uzavriet.
--  · Po pripísaní daru (keď platba dostane zbierku alebo zmení stav): zbierka stránky s cieľom, so zapnutým prepínačom, aktívna,
--    so sumou ≥ cieľ → stav 'ukoncena' (dary sa zastavia, 0068 zapíše koniec = začne lehota na dokladovanie),
--    v zbierka_sprava stav ukončená · dôvod „Cieľ je splnený“ · autoUzavreta, správcom príde upozornenie.
--    Poďakovanie darcom server nepíše, správca poďakuje sám.
--  · Centrálna, sektorové (typ hlavna/sektor) a zbierky bez cieľa sa neuzatvárajú. Reťaz tvorcu (retaz_posun) sa posúva
--    pri sume ≥ cieľ vždy, nezávisle od prepínača (bez zmeny).
--  · Ostrá brána (neskôr): platba vzniknutá pred uzavretím sa pripíše celá zbierke, na ktorú smerovala.
-- Spúšťa sa po 0167. Idempotentné.
-- ============================================================
begin;

alter table public.zbierka add column if not exists auto_uzavriet boolean not null default true;

-- pri založení: hodnota z nastavenia, ktoré appka posiela
create or replace function public.zbierka_auto_z_nastavenia() returns trigger
  language plpgsql as $$
begin
  if jsonb_typeof(new.nastavenie->'autoUzavriet') = 'boolean' then new.auto_uzavriet := (new.nastavenie->>'autoUzavriet')::boolean; end if;
  return new;
end $$;
drop trigger if exists zbierka_auto_z_nastavenia on public.zbierka;
create trigger zbierka_auto_z_nastavenia before insert on public.zbierka for each row execute function public.zbierka_auto_z_nastavenia();

-- kto dostane upozornenie: štatutári charity (0160) a farár farnosti
create or replace function public.spravcovia_na_oznam(p_stranka text) returns setof uuid
  language sql stable security definer set search_path = public as $$
  select x from public.statutari_stranky(p_stranka) x
  union
  select f.ucet from public.stranka_farar f where f.stranka = p_stranka and f.ucet is not null
$$;
revoke all on function public.spravcovia_na_oznam(text) from public, anon, authenticated;

-- uzavrie zbierku, keď je naplnená (vráti true, keď ju práve uzavrela)
create or replace function public.zbierka_skus_uzavriet(p_zbierka text) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
declare v_z public.zbierka; v_suma numeric; v_u uuid;
begin
  select * into v_z from public.zbierka where id = p_zbierka for update;
  if not found or v_z.stav <> 'aktivna' or not v_z.auto_uzavriet or v_z.stranka is null
     or coalesce(v_z.ciel, 0) <= 0 or coalesce(v_z.typ, '') in ('hlavna', 'sektor') then
    return false;
  end if;
  v_suma := public.retaz_vyzbierane(p_zbierka);
  if v_suma < v_z.ciel then return false; end if;
  update public.zbierka set stav = 'ukoncena' where id = p_zbierka;
  update public.zbierka_sprava
     set data = data || jsonb_build_object('stav', 'ukoncena', 'ukoncena', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                           'dovodUkoncenia', 'Cieľ je splnený', 'autoUzavreta', true)
   where zbierka = p_zbierka and coalesce(data->>'stav', 'aktivna') = 'aktivna';
  for v_u in select public.spravcovia_na_oznam(v_z.stranka) loop
    insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    values (v_u, 'penazenka', 'eur',
            left('Zbierka ' || v_z.nazov || ' je naplnená a uzavretá', 200),
            left('Vyzbierané ' || replace(to_char(v_suma, 'FM9999999990.00'), '.', ',') || ' € z cieľa ' || replace(to_char(v_z.ciel, 'FM9999999990'), '.', ',')
                 || ' €. Dary sa zastavili a beží lehota na dokladovanie. Darcom poďakujte v Správe zbierky.', 300),
            null, exists (select 1 from public.push_odber p where p.ucet_id = v_u));
  end loop;
  return true;
end $$;
revoke all on function public.zbierka_skus_uzavriet(text) from public, anon, authenticated;

-- po dare: kontrola hneď, keď má platba zbierku (zbierka_dar aj retaz_dar ju zapíšu UPDATE-om po pohyboch daru)
-- a pri zmene stavu platby (ostrá brána: pripísanie neskôr)
create or replace function public.platba_skus_uzavriet() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.zbierka is not null then perform public.zbierka_skus_uzavriet(new.zbierka); end if;
  return null;
end $$;
revoke all on function public.platba_skus_uzavriet() from public;
drop trigger if exists platba_skus_uzavriet on public.platba;
create trigger platba_skus_uzavriet after insert or update of zbierka, stav on public.platba
  for each row execute function public.platba_skus_uzavriet();

-- reťaz (0094): naplnená zbierka je „naplnena“, aj keď ju server medzitým uzavrel — cieľ sa kontroluje pred stavom
create or replace function public.retaz_posun(p_retaz text, p_oznam boolean default true) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare p record; v_z public.zbierka; v_r public.retaz;
begin
  select * into v_r from public.retaz where id = p_retaz for update;
  if not found then raise exception 'Reťaz neexistuje.' using errcode = 'P0002', detail = 'retaz_neexistuje'; end if;
  if v_r.ukoncena is null then
    for p in select * from public.retaz_polozka where retaz = p_retaz and stav in ('bezi', 'caka') order by poradie loop
      select * into v_z from public.zbierka where id = p.zbierka;
      if v_z.ciel is not null and v_z.ciel > 0 and public.retaz_vyzbierane(p.zbierka) >= v_z.ciel then
        update public.retaz_polozka set stav = 'naplnena', zmena = now() where retaz = p_retaz and poradie = p.poradie;
        continue;
      end if;
      if v_z.stav <> 'aktivna' then
        update public.retaz_polozka set stav = case when p.stav = 'bezi' then 'skoncila' else 'preskocena' end, zmena = now()
         where retaz = p_retaz and poradie = p.poradie;
        continue;
      end if;
      if p.stav = 'caka' then
        update public.retaz_polozka set stav = 'bezi', zmena = now() where retaz = p_retaz and poradie = p.poradie;
        if p_oznam then
          perform public.retaz_posli(p_retaz, p.ucet, p.zbierka, 'Ste na rade',
            v_r.meno || ' teraz posiela ' || p.pct || ' % z každého daru na vašu zbierku ' || v_z.nazov || '.');
        end if;
      end if;
      exit;
    end loop;
  end if;
  return public.retaz_stav(p_retaz);
end $$;
revoke all on function public.retaz_posun(text, boolean) from public, anon, authenticated;

-- prepínač v Správe zbierky (zapnutie pri už naplnenej zbierke ju hneď uzavrie)
create or replace function public.zbierka_auto_uzavriet(p_id text, p_zapnute boolean) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_z public.zbierka; v_uzavreta boolean := false;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select * into v_z from public.zbierka where id = p_id for update;
  if not found then raise exception 'zbierka_neexistuje' using errcode = 'P0002'; end if;
  if not (v_z.ucet_id = public.moj_ucet() or (v_z.stranka is not null and public.spravujem_stranku(v_z.stranka))) then
    raise exception 'nemate_povolene' using errcode = '42501';
  end if;
  if coalesce(v_z.ciel, 0) <= 0 or coalesce(v_z.typ, '') in ('hlavna', 'sektor') then raise exception 'bez_ciela' using errcode = '22023'; end if;
  update public.zbierka set auto_uzavriet = coalesce(p_zapnute, true) where id = p_id;
  if coalesce(p_zapnute, true) then v_uzavreta := public.zbierka_skus_uzavriet(p_id); end if;
  return jsonb_build_object('autoUzavriet', coalesce(p_zapnute, true), 'uzavreta', v_uzavreta);
end $$;
revoke all on function public.zbierka_auto_uzavriet(text, boolean) from public, anon;
grant execute on function public.zbierka_auto_uzavriet(text, boolean) to authenticated;

commit;
