-- ============================================================
-- 0049 · Zadanie 4 · 4.3 — RLS so skutočnými pravidlami (koniec test_all_access)
-- ------------------------------------------------------------
-- Pravidlá:
--   · osobné údaje (ucet, profil, zobrazenie, lokalita, záujmy, súhlasy, sledovanie): len vlastník
--   · údaje organizácie: jej správcovia (statutar → moj_ucet); verejný profil charity čítajú všetci
--   · verejný obsah (prispevok, udalost, adresár, QR, odznaky, číselníky): SELECT pre všetkých,
--     zápis len vlastník (prispevok) alebo len server (RPC)
--   · peniaze (platba, split, escrow, pravidelné, podpora): čítať len zúčastnený, zapisuje len server
--   · organizačný účet vzniká len cez rpc zaloz_organizaciu; stránku len overený účet (zaloz_stranku)
--   · v_zostatok, v_vypis = security_invoker (neobchádzajú RLS)
-- Rozhodovanie „smiem" = security definer funkcie (bez rekurzie RLS).
-- ============================================================
begin;

-- ---------- kto som / koho spravujem ----------
create or replace function public.spravujem_ucet(p uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select p is not null and public.moj_ucet() is not null
     and (p = public.moj_ucet()
          or exists (select 1 from public.statutar t where t.org_ucet_id = p and t.osoba_ucet_id = public.moj_ucet()))
$$;
grant execute on function public.spravujem_ucet(uuid) to anon, authenticated;

-- ---------- preč so skúšobným „všetko pre všetkých" ----------
do $$ declare r record; begin
  for r in select tablename from pg_policies where schemaname = 'public' and policyname = 'test_all_access' loop
    execute format('drop policy test_all_access on public.%I', r.tablename);
  end loop;
end $$;

-- ---------- verejné čítanie, zápis len server ----------
do $$ declare t text; begin
  foreach t in array array['adresar_charita','cis_segmenty','cis_zaujmy','udalost','pocitadla','odznak','qr_split','qr_split_ciel','retazec_qr','qr_kod'] loop
    execute format('drop policy if exists verejne_citat on public.%I', t);
    execute format('create policy verejne_citat on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
-- statické QR objektu si appka zakladá sama (kanonický slug objektu)
drop policy if exists static_zalozit on public.qr_kod;
create policy static_zalozit on public.qr_kod for insert to authenticated with check (typ = 'static');

-- ---------- osobné údaje: len vlastník ----------
do $$ declare t text; begin
  foreach t in array array['profil','zobrazenie','lokalita','zaujmy','sledovanie'] loop
    execute format('drop policy if exists vlastnik on public.%I', t);
    execute format('create policy vlastnik on public.%I for all to authenticated using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet())', t);
  end loop;
end $$;
drop policy if exists vlastnik_citat on public.suhlasy;
create policy vlastnik_citat on public.suhlasy for select to authenticated using (ucet_id = public.moj_ucet());
drop policy if exists vlastnik_zapisat on public.suhlasy;
create policy vlastnik_zapisat on public.suhlasy for insert to authenticated with check (ucet_id = public.moj_ucet());

-- oznámenia: hromadné (ucet_id NULL) + moje; prečítanie len vlastných
drop policy if exists citat on public.notifikacia;
create policy citat on public.notifikacia for select to anon, authenticated using (ucet_id is null or ucet_id = public.moj_ucet());
drop policy if exists precitat on public.notifikacia;
create policy precitat on public.notifikacia for update to authenticated using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());

-- ---------- účet ----------
drop policy if exists citat on public.ucet;
create policy citat on public.ucet for select to authenticated
  using (auth_id = auth.uid() or public.spravujem_ucet(id) or typ = 'system');
drop policy if exists zalozit_vlastny on public.ucet;
create policy zalozit_vlastny on public.ucet for insert to authenticated
  with check (auth_id = auth.uid() and typ in ('pasivny', 'aktivny') and system_kluc is null);
drop policy if exists upravit on public.ucet;
create policy upravit on public.ucet for update to authenticated
  using (auth_id = auth.uid() or public.spravujem_ucet(id))
  with check ((auth_id = auth.uid() or public.spravujem_ucet(id)) and typ <> 'system' and system_kluc is null);

-- organizačný účet + prvý správca naraz (inak by nový účet nemal nikoho, kto ho smie spravovať)
create or replace function public.zaloz_organizaciu(p_typ text default 'charita') returns public.ucet
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.ja_prihlaseny(); v_row public.ucet;
begin
  if coalesce(p_typ, 'charita') not in ('charita', 'firma') then raise exception 'zly_typ' using errcode = '22023'; end if;
  insert into public.ucet (typ, telefon_overeny, email_overeny, stav_registracie)
    values (coalesce(p_typ, 'charita'), false, false, 'kyb') returning * into v_row;
  insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values (v_row.id, v_ja, 'správca (registroval)');
  return v_row;
end $$;
revoke all on function public.zaloz_organizaciu(text) from public, anon;
grant execute on function public.zaloz_organizaciu(text) to authenticated;

-- stránku zakladá len overený účet (dokončená registrácia + overený telefón alebo e-mail), vždy pre seba
create or replace function public.zaloz_stranku(p_id text, p_typ text, p_nazov text) returns public.stranka
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.ja_prihlaseny(); v_org uuid; v_row public.stranka;
begin
  if not exists (select 1 from public.ucet where id = v_ja and stav_registracie = 'hotovo' and (telefon_overeny or email_overeny)) then
    raise exception 'Stránku môže založiť len overený účet.' using errcode = '42501', detail = 'neovereny_ucet';
  end if;
  if exists (select 1 from public.stranka where id = p_id) then raise exception 'stranka_existuje' using errcode = '23505'; end if;
  if p_typ = 'tvorca' then
    v_org := v_ja;
  else
    insert into public.ucet (typ, stav_registracie) values (case when p_typ = 'firma' then 'firma' else 'charita' end, 'stranka')
      returning id into v_org;
    insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values (v_org, v_ja, 'hlavny');
  end if;
  insert into public.stranka (id, ucet_id, typ, nazov) values (p_id, v_org, p_typ, p_nazov) returning * into v_row;
  return v_row;
end $$;
revoke all on function public.zaloz_stranku(text, text, text) from public, anon;
grant execute on function public.zaloz_stranku(text, text, text) to authenticated;

-- ---------- organizácia: správcovia ----------
do $$ declare t text; c text; begin
  for t, c in select * from (values ('organizacia','ucet_id'), ('pobocka','centrala_ucet_id')) v(t, c) loop
    execute format('drop policy if exists spravca on public.%I', t);
    execute format('create policy spravca on public.%I for all to authenticated using (public.spravujem_ucet(%I)) with check (public.spravujem_ucet(%I))', t, c, c);
  end loop;
  foreach t in array array['profil_charity','segmenty','dobrovolnictvo'] loop
    execute format('drop policy if exists verejne_citat on public.%I', t);
    execute format('create policy verejne_citat on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists spravca_pisat on public.%I', t);
    execute format('create policy spravca_pisat on public.%I for insert to authenticated with check (public.spravujem_ucet(org_ucet_id))', t);
    execute format('drop policy if exists spravca_menit on public.%I', t);
    execute format('create policy spravca_menit on public.%I for update to authenticated using (public.spravujem_ucet(org_ucet_id)) with check (public.spravujem_ucet(org_ucet_id))', t);
    execute format('drop policy if exists spravca_zmazat on public.%I', t);
    execute format('create policy spravca_zmazat on public.%I for delete to authenticated using (public.spravujem_ucet(org_ucet_id))', t);
  end loop;
end $$;
drop policy if exists citat on public.statutar;
create policy citat on public.statutar for select to authenticated using (osoba_ucet_id = public.moj_ucet() or public.spravujem_ucet(org_ucet_id));
drop policy if exists spravca_pisat on public.statutar;
create policy spravca_pisat on public.statutar for insert to authenticated with check (public.spravujem_ucet(org_ucet_id));
drop policy if exists spravca_menit on public.statutar;
create policy spravca_menit on public.statutar for update to authenticated using (public.spravujem_ucet(org_ucet_id)) with check (public.spravujem_ucet(org_ucet_id));
drop policy if exists spravca_zmazat on public.statutar;
create policy spravca_zmazat on public.statutar for delete to authenticated using (public.spravujem_ucet(org_ucet_id));
-- balík: platený program appka nenastaví — zapísať smie len „free"
drop policy if exists spravca_citat on public.balik;
create policy spravca_citat on public.balik for select to authenticated using (public.spravujem_ucet(org_ucet_id));
drop policy if exists spravca_free on public.balik;
create policy spravca_free on public.balik for insert to authenticated with check (public.spravujem_ucet(org_ucet_id) and plan = 'free');
drop policy if exists spravca_free_menit on public.balik;
create policy spravca_free_menit on public.balik for update to authenticated
  using (public.spravujem_ucet(org_ucet_id) and plan = 'free') with check (public.spravujem_ucet(org_ucet_id) and plan = 'free');

-- ---------- príspevky: verejné čítanie, zápis autor (alebo správca organizácie-autora) ----------
create or replace function public.prispevok_autor_zo_session() returns trigger
  language plpgsql as $$
begin
  if public.zapis_klienta() and new.autor_ucet_id is null then new.autor_ucet_id := public.moj_ucet(); end if;
  return new;
end $$;
drop trigger if exists prispevok_autor_zo_session on public.prispevok;
create trigger prispevok_autor_zo_session before insert on public.prispevok for each row execute function public.prispevok_autor_zo_session();
drop policy if exists verejne_citat on public.prispevok;
create policy verejne_citat on public.prispevok for select to anon, authenticated using (true);
drop policy if exists autor_pisat on public.prispevok;
create policy autor_pisat on public.prispevok for insert to authenticated with check (public.spravujem_ucet(autor_ucet_id));
drop policy if exists autor_menit on public.prispevok;
create policy autor_menit on public.prispevok for update to authenticated using (public.spravujem_ucet(autor_ucet_id)) with check (public.spravujem_ucet(autor_ucet_id));
drop policy if exists autor_zmazat on public.prispevok;
create policy autor_zmazat on public.prispevok for delete to authenticated using (public.spravujem_ucet(autor_ucet_id));

-- ---------- peniaze: čítať len zúčastnený, zapisuje len server ----------
create or replace function public.vidim_platbu(p_platba uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platba pl where pl.id = p_platba
                   and (public.spravujem_ucet(pl.odosielatel) or public.spravujem_ucet(pl.prijemca_ucet)))
      or exists (select 1 from public.pohyb p where p.platba_id = p_platba
                   and (public.spravujem_ucet(p.ucet_debet) or public.spravujem_ucet(p.ucet_kredit)))
$$;
grant execute on function public.vidim_platbu(uuid) to authenticated;
drop policy if exists zucastneny on public.platba;
create policy zucastneny on public.platba for select to authenticated using (public.vidim_platbu(id));
drop policy if exists zucastneny on public.platba_split;
create policy zucastneny on public.platba_split for select to authenticated using (public.spravujem_ucet(prijemca) or public.vidim_platbu(platba_id));
drop policy if exists sponzor on public.escrow;
create policy sponzor on public.escrow for select to authenticated using (public.spravujem_ucet(sponzor));
drop policy if exists darca_alebo_charita on public.opakovana_platba;
create policy darca_alebo_charita on public.opakovana_platba for select to authenticated
  using (darca = public.moj_ucet() or public.spravujem_ucet(charita_ucet));
drop policy if exists vlastnik on public.podpora;
create policy vlastnik on public.podpora for select to authenticated using (ucet_id = public.moj_ucet());
-- platba_batch, scan_log: žiadna politika = appka nevidí nič (len server)

-- ---------- odznaky, dochádzka ----------
drop policy if exists zucastneny on public.badge_bind;
create policy zucastneny on public.badge_bind for select to authenticated
  using (employee_id = public.moj_ucet() or exists (select 1 from public.odznak o where o.id = badge_id and public.spravujem_ucet(o.org_ucet_id)));
drop policy if exists zucastneny on public.pochvala;
create policy zucastneny on public.pochvala for select to authenticated
  using (employee_id = public.moj_ucet() or zakaznik_ucet = public.moj_ucet()
         or exists (select 1 from public.odznak o where o.id = badge_id and public.spravujem_ucet(o.org_ucet_id)));
drop policy if exists vlastnik on public.dochadzka;
create policy vlastnik on public.dochadzka for select to authenticated using (user_id = public.moj_ucet());

-- ---------- pohľady peňaženky cez RLS volajúceho ----------
alter view public.v_zostatok set (security_invoker = true);
alter view public.v_vypis set (security_invoker = true);

commit;
