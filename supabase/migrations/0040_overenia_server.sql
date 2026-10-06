-- ============================================================
-- 0040 · Zadanie 3 · 3.2 — overenia zapisuje LEN server (aj v mock režime)
-- ------------------------------------------------------------
-- SMS kód vzniká na serveri (otp_posli). V mock režime server vráti pevný testovací kód 123456,
-- ostrý režim kód pošle vendor a nevráti ho. Overenie kódu (otp_over) a zápis telefon_overeny
-- (ucet_s_telefonom, zapis_overeny_telefon) robí len server. KYC „sedí" a KYB „overená" zapisuje
-- len kyc_spusti / kyb_spusti — dnes mock vendor, pri napojení sa mení len vendor, nie logika.
-- Klient: telefon_overeny nezmení (trigger), do kyc/kyb nezapíše (RLS len na čítanie + trigger).
-- ============================================================
begin;

-- ---------- prepínače servera (mock vendori) ----------
create table if not exists public.server_prepinac (kluc text primary key, zapnute boolean not null);
insert into public.server_prepinac values ('otp_mock', true), ('kyc_mock', true), ('kyb_mock', true) on conflict (kluc) do nothing;
alter table public.server_prepinac enable row level security;

-- zápis „zo servera" = vnútri našej security definer funkcie (príznak platí len do konca transakcie)
create or replace function public.zapis_klienta() returns boolean
  language sql stable as $$
  select coalesce(current_setting('role', true), '') in ('anon', 'authenticated')
     and coalesce(current_setting('deed.server_zapis', true), '') <> '1'
$$;
create or replace function public.server_zapis() returns void
  language sql volatile as $$ select set_config('deed.server_zapis', '1', true) $$;
revoke all on function public.server_zapis() from public, anon, authenticated;

-- ---------- SMS kód ----------
create table if not exists public.otp_kod (
  id         uuid primary key default gen_random_uuid(),
  telefon    text not null,
  kod        text not null,
  vytvorene  timestamptz not null default now(),
  pokusy     int not null default 0,
  overene_at timestamptz
);
create index if not exists otp_kod_tel_idx on public.otp_kod (telefon, vytvorene desc);
alter table public.otp_kod enable row level security;            -- bez politík: klient nevidí nič

create or replace function public.norm_telefon(p text) returns text
  language sql immutable as $$ select regexp_replace(coalesce(p, ''), '[^0-9+]', '', 'g') $$;

create or replace function public.otp_posli(p_telefon text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_tel text := public.norm_telefon(p_telefon); v_mock boolean; v_kod text;
begin
  if v_tel !~ '^\+4219[0-9]{8}$' then raise exception 'Zlé telefónne číslo.' using errcode = '22023', detail = 'zly_telefon'; end if;
  if (select count(*) from public.otp_kod where telefon = v_tel and vytvorene > now() - interval '10 minutes') >= 3 then
    raise exception 'Poslali sme už 3 kódy. Ďalší pošleme o pár minút.' using errcode = '54000', detail = 'otp_limit';
  end if;
  select zapnute into v_mock from public.server_prepinac where kluc = 'otp_mock';
  v_kod := case when v_mock then '123456' else lpad(floor(random() * 1000000)::int::text, 6, '0') end;
  insert into public.otp_kod (telefon, kod) values (v_tel, v_kod);
  -- ostrý režim: tu sa kód odovzdá SMS vendorovi a NEVRACIA sa
  return case when v_mock then jsonb_build_object('demo', true, 'kod', v_kod) else jsonb_build_object('demo', false) end;
end $$;

-- overí kód (max 5 pokusov, platnosť 10 min); chybný kód vráti false a pokus sa zaráta
create or replace function public.otp_over(p_telefon text, p_kod text) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
declare v_tel text := public.norm_telefon(p_telefon); r public.otp_kod;
begin
  select * into r from public.otp_kod
   where telefon = v_tel and overene_at is null and vytvorene > now() - interval '10 minutes'
   order by vytvorene desc limit 1 for update;
  if not found then raise exception 'Kód vypršal. Pošli si nový.' using errcode = '22023', detail = 'otp_vyprsal'; end if;
  if r.pokusy >= 5 then raise exception 'Priveľa pokusov. Pošli si nový kód.' using errcode = '54000', detail = 'otp_pokusy'; end if;
  if r.kod <> coalesce(p_kod, '') then
    update public.otp_kod set pokusy = pokusy + 1 where id = r.id;
    return false;
  end if;
  update public.otp_kod set overene_at = now() where id = r.id;
  return true;
end $$;

create or replace function public.telefon_je_overeny(p_tel text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.otp_kod where telefon = public.norm_telefon(p_tel) and overene_at > now() - interval '30 minutes')
$$;

-- registrácia telefónom (bez prihlásenia): účet vznikne len s overeným telefónom
create or replace function public.ucet_s_telefonom(p_typ text, p_telefon text, p_email text default null)
  returns table (id uuid, typ text, poradove_cislo bigint, stav_registracie text)
  language plpgsql volatile security definer set search_path = public as $$
declare v_tel text := public.norm_telefon(p_telefon);
begin
  if not public.telefon_je_overeny(v_tel) then
    raise exception 'Telefón nie je overený.' using errcode = '42501', detail = 'telefon_neovereny';
  end if;
  if coalesce(p_typ, 'aktivny') not in ('pasivny', 'aktivny', 'charita', 'firma') then raise exception 'zly_typ' using errcode = '22023'; end if;
  perform public.server_zapis();
  return query
    insert into public.ucet as u (typ, telefon, telefon_overeny, email, email_overeny, stav_registracie)
    values (coalesce(p_typ, 'aktivny'), v_tel, true, p_email, p_email is not null, 'zabezpecenie')
    returning u.id, u.typ, u.poradove_cislo, u.stav_registracie;
end $$;

-- prihlásený človek si zapíše overený telefón (1 telefón = 1 účet drží unique ucet.telefon)
create or replace function public.zapis_overeny_telefon(p_telefon text) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_tel text := public.norm_telefon(p_telefon);
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.telefon_je_overeny(v_tel) then
    raise exception 'Telefón nie je overený.' using errcode = '42501', detail = 'telefon_neovereny';
  end if;
  perform public.server_zapis();
  update public.ucet set telefon = v_tel, telefon_overeny = true, aktualizovane = now() where id = v_ja;
end $$;

-- klient telefon_overeny nenastaví ani nezmení; zmena čísla = neoverené
create or replace function public.ucet_strazca_overeni() returns trigger
  language plpgsql as $$
begin
  if not public.zapis_klienta() then return new; end if;
  if tg_op = 'INSERT' then
    new.telefon_overeny := false;
  else
    new.telefon_overeny := old.telefon_overeny and new.telefon is not distinct from old.telefon;
  end if;
  return new;
end $$;
drop trigger if exists ucet_strazca_overeni on public.ucet;
create trigger ucet_strazca_overeni before insert or update on public.ucet
  for each row execute function public.ucet_strazca_overeni();

-- ---------- KYC / KYB: len server ----------
create or replace function public.len_server() returns trigger
  language plpgsql as $$
begin
  if public.zapis_klienta() then
    raise exception 'Tento údaj zapisuje len server.' using errcode = '42501', detail = 'len_server';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists kyc_len_server on public.kyc;
create trigger kyc_len_server before insert or update or delete on public.kyc for each row execute function public.len_server();
drop trigger if exists kyb_len_server on public.kyb;
create trigger kyb_len_server before insert or update or delete on public.kyb for each row execute function public.len_server();

drop policy if exists test_all_access on public.kyc;
drop policy if exists test_all_access on public.kyb;
drop policy if exists moje on public.kyc;
create policy moje on public.kyc for select to authenticated using (ucet_id = public.moj_ucet());
drop policy if exists spravcu on public.kyb;
create policy spravcu on public.kyb for select to authenticated
  using (exists (select 1 from public.statutar t where t.org_ucet_id = kyb.org_ucet_id and t.osoba_ucet_id = public.moj_ucet()));
revoke insert, update, delete on public.kyc, public.kyb from anon, authenticated;

create or replace function public.kyc_spusti(p_sposob text default 'nove') returns text
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_mock boolean; v_vysl text;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select zapnute into v_mock from public.server_prepinac where kluc = 'kyc_mock';
  if not v_mock then raise exception 'KYC vendor nie je napojený.' using errcode = '0A000', detail = 'kyc_vendor'; end if;
  v_vysl := 'sedi';                                                   -- mock vendor: vždy sedí
  perform public.server_zapis();
  insert into public.kyc (ucet_id, vendor, vysledok, sposob) values (v_ja, 'mock', v_vysl, coalesce(p_sposob, 'nove'));
  return v_vysl;
end $$;

create or replace function public.kyb_spusti(p_org uuid, p_stanovy text default null) returns text
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_mock boolean;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not exists (select 1 from public.statutar t where t.org_ucet_id = p_org and t.osoba_ucet_id = v_ja) then
    raise exception 'cudzia_organizacia' using errcode = '42501';
  end if;
  select zapnute into v_mock from public.server_prepinac where kluc = 'kyb_mock';
  if not v_mock then raise exception 'KYB vendor nie je napojený.' using errcode = '0A000', detail = 'kyb_vendor'; end if;
  perform public.server_zapis();
  insert into public.kyb (org_ucet_id, vendor, vysledok, stanovy_ref, aml) values (p_org, 'mock', 'overena', p_stanovy, 'clean');
  return 'overena';
end $$;

revoke all on function public.otp_posli(text), public.otp_over(text, text), public.ucet_s_telefonom(text, text, text),
  public.zapis_overeny_telefon(text), public.kyc_spusti(text), public.kyb_spusti(uuid, text), public.telefon_je_overeny(text) from public;
grant execute on function public.otp_posli(text), public.otp_over(text, text), public.ucet_s_telefonom(text, text, text) to anon, authenticated;
grant execute on function public.zapis_overeny_telefon(text), public.kyc_spusti(text), public.kyb_spusti(uuid, text) to authenticated;

commit;
