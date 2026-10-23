-- ============================================================
-- 0165 · OPRAVY 516 (Martin 23. 10.) · charita v programe Zadarmo
--  1) Jedna zbierka naraz: centrálna ALEBO zbierka pre niekoho. Kto chce viac, kúpi P1 (5 zbierok).
--     · nová zbierka stránky (zbierka.typ nie 'hlavna'/'sektor') sa nezaloží, keď už beží iná aktívna zbierka
--       alebo je spustená centrálna (profil_stranky.centralna->>'spustena');
--     · centrálna sa nespustí (prvé zapísanie spustena), keď beží aktívna zbierka.
--     Chyba 42501, správa 'zadarmo_jedna_zbierka'.
--  2) Žiadna pravidelná podpora (ani centrálna, ani zbierka pre niekoho): pravidelna_zapni odmietne
--     charitu s programom 0 — 'zadarmo_bez_pravidelnej' (42501). Ostatné typy stránok (farnosť…) bez zmeny.
-- Program = program_stranky() (0137; bez riadku v stranka_program = 0). Platí len pre stranka.typ = 'charita'.
-- Existujúce zbierky sa nemenia, kontrola je len pri založení / spustení. Platí pre zápisy z appky (rola authenticated,
-- aj cez RPC so security definer — ako 0162); server, seed a testy (postgres, service_role) ju obídu. Spúšťa sa po 0164. Idempotentné.
-- ============================================================
begin;

create or replace function public.zadarmo_charita(p_stranka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stranka s where s.id = p_stranka and s.typ = 'charita')
     and public.program_stranky(p_stranka) = 0
$$;
revoke all on function public.zadarmo_charita(text) from public, anon, authenticated;

create or replace function public.zadarmo_bezi_zbierka(p_stranka text, p_okrem text default null) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.zbierka z where z.stranka = p_stranka and z.stav = 'aktivna'
                  and coalesce(z.typ, '') not in ('hlavna', 'sektor') and z.id is distinct from p_okrem)
$$;
revoke all on function public.zadarmo_bezi_zbierka(text, text) from public, anon, authenticated;

-- 1a) nová zbierka stránky
create or replace function public.zadarmo_jedna_zbierka() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('role', true), '') not in ('authenticated', 'anon') then return new; end if;
  if new.stranka is null or coalesce(new.typ, '') in ('hlavna', 'sektor') or new.stav <> 'aktivna' then return new; end if;
  if not public.zadarmo_charita(new.stranka) then return new; end if;
  if public.zadarmo_bezi_zbierka(new.stranka, new.id)
     or exists (select 1 from public.profil_stranky p where p.stranka = new.stranka and p.centralna->>'spustena' is not null) then
    raise exception 'zadarmo_jedna_zbierka' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists zadarmo_jedna_zbierka on public.zbierka;
create trigger zadarmo_jedna_zbierka before insert on public.zbierka for each row execute function public.zadarmo_jedna_zbierka();

-- 1b) spustenie centrálnej
create or replace function public.zadarmo_jedna_centralna() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('role', true), '') not in ('authenticated', 'anon') then return new; end if;
  if new.centralna->>'spustena' is null then return new; end if;
  if tg_op = 'UPDATE' and old.centralna->>'spustena' is not null then return new; end if;
  if public.zadarmo_charita(new.stranka) and public.zadarmo_bezi_zbierka(new.stranka) then
    raise exception 'zadarmo_jedna_zbierka' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists zadarmo_jedna_centralna on public.profil_stranky;
create trigger zadarmo_jedna_centralna before insert or update of centralna on public.profil_stranky for each row execute function public.zadarmo_jedna_centralna();

-- 2) pravidelná podpora (0109 + kontrola programu)
create or replace function public.pravidelna_zapni(p_zbierka text, p_suma numeric, p_mena text, p_perioda text) returns uuid
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_stranka text; v_id uuid;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_suma is null or p_suma <= 0 or p_suma > 100000 then raise exception 'neplatna_suma' using errcode = '22023'; end if;
  v_stranka := case when position(':' in coalesce(p_zbierka, '')) > 0 then split_part(p_zbierka, ':', 1)
                    else (select z.stranka from public.zbierka z where z.id = p_zbierka) end;
  if v_stranka is null or not exists (select 1 from public.stranka where id = v_stranka) then
    raise exception 'zbierka_neexistuje' using errcode = 'P0002';
  end if;
  if public.zadarmo_charita(v_stranka) then raise exception 'zadarmo_bez_pravidelnej' using errcode = '42501'; end if;
  insert into public.pravidelna_podpora (ucet_id, stranka, zbierka, suma, mena, perioda)
    values (v_ja, v_stranka, p_zbierka, round(p_suma, 2), p_mena, p_perioda) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.pravidelna_zapni(text, numeric, text, text) from public;
grant execute on function public.pravidelna_zapni(text, numeric, text, text) to authenticated;

commit;
