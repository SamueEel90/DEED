-- ============================================================
-- 0085b · Zvyšok localStorage do DB (zdieľané veci; osobné idú do moje_data 0084b)
-- ------------------------------------------------------------
-- 1. aktivita_pocty  — prírastky Aktivít (vyzbierané, pomocníci, podpory) pre všetkých; zápis len cez RPC +1
-- 2. vyzva / vyzva_ucastnik — výzvy tvorcu: vyhlási správca stránky, účastníkov zapisuje server
--    (vyzva_zapis_cin, jeden človek najviac raz), žreb raz a navždy (vyzva_zreb, až po uzávierke)
-- 3. zariadenie_uctu — prihlásené zariadenia účtu (najviac 5, len vlastník)
-- 4. overlay_stav    — snímka počítadla do streamu; píše tvorca, číta aj OBS bez prihlásenia
-- 5. firma_obsah     — čo firma pripravila zamestnancom (benefity, oznamy, akcie, odmeny, VTO)
-- 6. moje_stranky()  — stránky, ktoré prihlásený spravuje (Moje stránky / Konáš ako)
-- ============================================================
begin;

-- ---------- 1 · Aktivity: prírastky ----------
create table if not exists public.aktivita_pocty (
  id        text primary key check (length(id) between 1 and 80),
  raised    numeric(14,2) not null default 0 check (raised >= 0),
  helpers   int not null default 0 check (helpers >= 0),
  support   int not null default 0 check (support >= 0),
  upravene  timestamptz not null default now()
);
alter table public.aktivita_pocty enable row level security;
drop policy if exists citaj on public.aktivita_pocty;
create policy citaj on public.aktivita_pocty for select to anon, authenticated using (true);
revoke all on table public.aktivita_pocty from anon, authenticated;
grant select on public.aktivita_pocty to anon, authenticated;

-- podpora aktivity: +1 podpora, pri prípade aj +1 pomocník a suma (nad cieľ nepustí appka; server strop 10 000 / klik)
create or replace function public.aktivita_podpora(p_id text, p_suma numeric default 0, p_pripad boolean default false)
  returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v public.aktivita_pocty;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_suma < 0 or p_suma > 10000 then raise exception 'zla suma' using errcode = '22023'; end if;
  insert into public.aktivita_pocty as a (id, raised, helpers, support)
       values (p_id, case when p_pripad then p_suma else 0 end, case when p_pripad then 1 else 0 end, 1)
  on conflict (id) do update set raised = a.raised + excluded.raised, helpers = a.helpers + excluded.helpers,
                                 support = a.support + 1, upravene = now()
  returning * into v;
  return jsonb_build_object('id', v.id, 'raised', v.raised, 'helpers', v.helpers, 'support', v.support);
end $$;
revoke all on function public.aktivita_podpora(text,numeric,boolean) from public;
grant execute on function public.aktivita_podpora(text,numeric,boolean) to authenticated, service_role;

-- ---------- 2 · Výzvy tvorcu ----------
create table if not exists public.vyzva (
  id          text primary key default ('vz-' || replace(gen_random_uuid()::text, '-', '')),
  stranka     text not null references public.stranka (id) on delete cascade,
  tvorca      text not null,                       -- kľúč tvorcu v appke (QR „cez môj QR")
  tvorca_nazov text,
  nazov       text not null check (length(nazov) between 3 and 120),
  podmienka   jsonb not null,                      -- { typ: dar|darNad|skutok|cezMojQr, min?, druh?, ciel? }
  odmena      jsonb not null,                      -- { typ: kazdemu|zreb, popis, pocet? }
  od          timestamptz not null,
  do_         timestamptz not null,
  stav        text not null default 'beziaca' check (stav in ('beziaca', 'uzavreta', 'vyzrebovana', 'zrusena')),
  zreb        jsonb,                               -- { blok, hash, vyherci[], kedy } — raz a navždy
  vytvoril    uuid default public.moj_ucet() references public.ucet (id) on delete set null,
  vytvorena   timestamptz not null default now(),
  check (do_ > od),
  check (podmienka->>'typ' in ('dar', 'darNad', 'skutok', 'cezMojQr')),
  check (odmena->>'typ' in ('kazdemu', 'zreb'))
);
create index if not exists vyzva_tvorca_idx on public.vyzva (tvorca);

create table if not exists public.vyzva_ucastnik (
  vyzva   text not null references public.vyzva (id) on delete cascade,
  osoba   text not null check (length(btrim(osoba)) between 1 and 120),
  ucet_id uuid references public.ucet (id) on delete set null,
  dokaz   text not null,
  kedy    timestamptz not null default now()
);
create unique index if not exists vyzva_ucastnik_raz on public.vyzva_ucastnik (vyzva, lower(btrim(osoba)));

alter table public.vyzva enable row level security;
alter table public.vyzva_ucastnik enable row level security;
drop policy if exists citaj on public.vyzva;
create policy citaj on public.vyzva for select to anon, authenticated using (true);
drop policy if exists vyhlas on public.vyzva;
create policy vyhlas on public.vyzva for insert to authenticated
  with check (public.spravujem_stranku(stranka) and stav = 'beziaca' and zreb is null);
drop policy if exists citaj on public.vyzva_ucastnik;
create policy citaj on public.vyzva_ucastnik for select to anon, authenticated using (true);
revoke all on table public.vyzva, public.vyzva_ucastnik from anon, authenticated;
grant select on public.vyzva, public.vyzva_ucastnik to anon, authenticated;
grant insert on public.vyzva to authenticated;

-- zrušiť / uzavrieť smie len správca; po žrebe sa nemení nič
create or replace function public.vyzva_stav(p_id text, p_stav text) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v public.vyzva;
begin
  select * into v from public.vyzva where id = p_id for update;
  if not found then raise exception 'vyzva neexistuje' using errcode = 'P0002'; end if;
  if not public.spravujem_stranku(v.stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if p_stav not in ('uzavreta', 'zrusena') then raise exception 'zly stav' using errcode = '22023'; end if;
  if v.zreb is not null then raise exception 'uz_vyzrebovana' using errcode = '22023'; end if;
  update public.vyzva set stav = p_stav where id = p_id;
end $$;
revoke all on function public.vyzva_stav(text,text) from public;
grant execute on function public.vyzva_stav(text,text) to authenticated, service_role;

-- čin → zápis do všetkých bežiacich výziev, ktorým vyhovuje (logika = lib/vyzvy splna())
create or replace function public.vyzva_zapis_cin(p_osoba text, p_suma numeric default null, p_ciel text default null,
                                                  p_druh text default null, p_cez text default null)
  returns text[] language plpgsql volatile security definer set search_path = public as $$
declare v public.vyzva; p jsonb; ok boolean; out text[] := '{}'; n int;
begin
  if coalesce(btrim(p_osoba), '') = '' then return out; end if;
  for v in select * from public.vyzva where stav = 'beziaca' and now() between od and do_ loop
    p := v.podmienka;
    ok := coalesce(p->>'ciel', '') = '' or p->>'ciel' = p_ciel;
    if ok then ok := case p->>'typ'
      when 'dar'      then coalesce(p_suma, 0) > 0
      when 'darNad'   then coalesce(p_suma, 0) >= coalesce((p->>'min')::numeric, 0)
      when 'skutok'   then p_druh is not null and (coalesce(p->>'druh', '') = '' or p->>'druh' = p_druh)
      when 'cezMojQr' then p_cez is not null and p_cez = v.tvorca and coalesce(p_suma, 0) > 0
      else false end;
    end if;
    if ok then
      insert into public.vyzva_ucastnik (vyzva, osoba, ucet_id, dokaz)
           values (v.id, btrim(p_osoba), public.moj_ucet(),
                   case when p_druh is not null then 'skutok:' || p_druh else 'dar:' || coalesce(p_suma, 0) end)
      on conflict do nothing;
      get diagnostics n = row_count;
      if n > 0 then out := out || v.id; end if;
    end if;
  end loop;
  return out;
end $$;
revoke all on function public.vyzva_zapis_cin(text,numeric,text,text,text) from public;
grant execute on function public.vyzva_zapis_cin(text,numeric,text,text,text) to anon, authenticated, service_role;

-- žreb: len správca, len po uzávierke, len raz; výhercovia musia byť z účastníkov
create or replace function public.vyzva_zreb(p_id text, p_blok bigint, p_hash text, p_vyherci text[]) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v public.vyzva; z jsonb;
begin
  select * into v from public.vyzva where id = p_id for update;
  if not found then raise exception 'vyzva neexistuje' using errcode = 'P0002'; end if;
  if not public.spravujem_stranku(v.stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if v.zreb is not null then return v.zreb; end if;
  if v.stav = 'zrusena' or now() <= v.do_ then raise exception 'pred_uzavierkou' using errcode = '22023'; end if;
  if exists (select 1 from unnest(p_vyherci) x where not exists
              (select 1 from public.vyzva_ucastnik u where u.vyzva = p_id and u.osoba = x)) then
    raise exception 'vyherca mimo ucastnikov' using errcode = '22023';
  end if;
  z := jsonb_build_object('blok', p_blok, 'hash', p_hash, 'vyherci', to_jsonb(p_vyherci),
                          'kedy', (extract(epoch from now()) * 1000)::bigint);
  update public.vyzva set stav = 'vyzrebovana', zreb = z where id = p_id;
  return z;
end $$;
revoke all on function public.vyzva_zreb(text,bigint,text,text[]) from public;
grant execute on function public.vyzva_zreb(text,bigint,text,text[]) to authenticated, service_role;

-- ---------- 3 · Prihlásené zariadenia ----------
create table if not exists public.zariadenie_uctu (
  ucet_id    uuid not null default public.moj_ucet() references public.ucet (id) on delete cascade,
  device_id  text not null check (length(device_id) between 8 and 80),
  nazov      text not null check (length(nazov) <= 80),
  typ        text not null check (typ in ('telefon', 'pocitac')),
  mesto      text not null default '' check (length(mesto) <= 80),
  potvrdene  text check (length(potvrdene) <= 80),
  prve       timestamptz not null default now(),
  posledne   timestamptz not null default now(),
  primary key (ucet_id, device_id)
);
alter table public.zariadenie_uctu enable row level security;
drop policy if exists vlastnik on public.zariadenie_uctu;
create policy vlastnik on public.zariadenie_uctu for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());
revoke all on table public.zariadenie_uctu from anon, authenticated;
grant select, insert, update, delete on public.zariadenie_uctu to authenticated;

create or replace function public.zariadenie_limit() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.zariadenie_uctu where ucet_id = new.ucet_id) >= 5 then
    raise exception 'Najviac 5 prihlásených zariadení.' using errcode = '23514', detail = 'limit_zariadeni';
  end if;
  return new;
end $$;
drop trigger if exists zariadenie_limit on public.zariadenie_uctu;
create trigger zariadenie_limit before insert on public.zariadenie_uctu
  for each row execute function public.zariadenie_limit();

-- ---------- 4 · Počítadlo do streamu ----------
create table if not exists public.overlay_stav (
  split_id  text primary key check (length(split_id) between 1 and 80),
  ucet_id   uuid not null default public.moj_ucet() references public.ucet (id) on delete cascade,
  stav      jsonb not null,                        -- { nazov, vyzbierane, ciel, poslednyDarca?, poslednaSuma? } — len verejné polia
  upravene  timestamptz not null default now()
);
alter table public.overlay_stav enable row level security;
drop policy if exists citaj on public.overlay_stav;
create policy citaj on public.overlay_stav for select to anon, authenticated using (true);
drop policy if exists vlastnik on public.overlay_stav;
create policy vlastnik on public.overlay_stav for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());
revoke all on table public.overlay_stav from anon, authenticated;
grant select on public.overlay_stav to anon, authenticated;
grant insert, update, delete on public.overlay_stav to authenticated;
drop trigger if exists overlay_stav_cas on public.overlay_stav;
create trigger overlay_stav_cas before update on public.overlay_stav
  for each row execute function public.moje_skutky_cas();

-- ---------- 5 · Moja firma (obsah pre zamestnancov) ----------
create table if not exists public.firma_obsah (
  firma     text primary key,                      -- kluc firmy z registra lib/firma („firma-pekaren")
  stranka   text references public.stranka (id) on delete set null,   -- kto ho smie meniť
  data      jsonb not null default '{}'::jsonb,    -- FirmaData: benefity, oznamy, akcie, odmeny, vto
  upravene  timestamptz not null default now()
);
alter table public.firma_obsah enable row level security;
drop policy if exists citaj on public.firma_obsah;
create policy citaj on public.firma_obsah for select to authenticated using (true);
drop policy if exists spravca on public.firma_obsah;
create policy spravca on public.firma_obsah for update to authenticated
  using (stranka is not null and public.spravujem_stranku(stranka)) with check (stranka is not null and public.spravujem_stranku(stranka));
revoke all on table public.firma_obsah from anon, authenticated;
grant select, update on public.firma_obsah to authenticated;
drop trigger if exists firma_obsah_cas on public.firma_obsah;
create trigger firma_obsah_cas before update on public.firma_obsah
  for each row execute function public.moje_skutky_cas();
drop trigger if exists bez_data_url on public.firma_obsah;
create trigger bez_data_url before insert or update on public.firma_obsah
  for each row execute function public.bez_data_url();

-- počiatočný obsah = doterajší mock (lib/mojaFirma DATA); kľúč = kluc firmy z registra lib/firma
insert into public.firma_obsah (firma, stranka, data) values
  ($f$firma-pekaren$f$, (select id from public.stranka where id = $f$pekaren$f$), $f${"benefity":[{"t":"Sobota pre útulok","s":"firemná akcia · 4. 10. · prihlásených 12","detail":"Firma pozýva zamestnancov na spoločnú sobotu v útulku Túlavá labka. Účasť potvrdíš pracovným QR na mieste, hodiny sa ti započítajú do firemných hodín."},{"t":"Deň dobrovoľníctva","s":"jeden platený deň v roku na skutok","detail":"Jeden pracovný deň v roku môžeš venovať skutku. Termín si dohodneš s vedúcim."}],"oznamy":[{"id":"pd-kontrola","typ":"kontrola","t":"Stále pracuješ v Pekárni Dobrota?","s":"overujeme raz ročne"},{"id":"pd-benefit","typ":"benefit","t":"Nový benefit: permanentka na plaváreň","s":"pred 2 dňami"},{"id":"pd-akcia","typ":"akcia","t":"Nová firemná akcia: sadenie stromov","s":"sobota 18. 10."}],"akcie":[{"d":4,"m":"OKT","t":"Sobota pre útulok","s":"firemná akcia · VTO · 9:00 – 13:00","stitok":"prihlásený","typ":"akcia"},{"d":9,"m":"OKT","t":"BOZP školenie","s":"povinné · zasadačka · 10:00","stitok":"povinné","typ":"skolenie"},{"d":11,"m":"OKT","t":"Ranná smena","s":"predajňa Námestie · 6:00 – 14:00","stitok":"potvrdené","typ":"smena"}],"odmeny":[{"za":"Za pomoc pri povodni v Bošáci","hodnota":"+300 DeeD","kedy":"14. 9.","zdroj":"skutok s menom","vdaka":"„Ďakujeme, že si reprezentoval celú pekáreň.“ — vedenie"},{"za":"Za firemnú brigádu v útulku","hodnota":"deň voľna","kedy":"20. 8.","zdroj":"firemná akcia","vdaka":"„Vďaka tebe sme mali najviac dobrovoľníkov v meste.“"}],"vto":{"rok":2026,"spolu":40,"vyuzite":12,"obnovi":"1. 1. 2027","prihlasene":[{"d":4,"m":"OKT","t":"Sobota pre útulok","s":"Túlavá labka · 9:00 – 13:00"},{"d":12,"m":"OKT","t":"Čítanie deťom v nemocnici","s":"Detské oddelenie · 15:00 – 17:00"}],"historia":[{"t":"Venčenie psov","s":"Túlavá labka · 20. 9.","h":5.5,"stav":"vyplatené"},{"t":"Detský tábor, 2 dni","s":"OZ Motýlik · 6. – 7. 9.","h":4.5,"stav":"schválené firmou"},{"t":"Súkromné miesto","s":"oblasť Deti · 30. 8.","h":2,"stav":"čaká na schválenie"}],"oblasti":["Deti","Zvieratá"],"sukromne":1}}$f$::jsonb),
  ($f$firma-kaviaren$f$, null, $f${"benefity":[{"t":"Káva zadarmo po skutku","s":"raz týždenne po potvrdenom skutku","detail":"Po potvrdenom skutku s menom dostaneš kávu zadarmo. Platí raz týždenne."}],"oznamy":[{"id":"kh-benefit","typ":"benefit","t":"Nový benefit: káva zadarmo po skutku","s":"včera"}],"akcie":[{"d":6,"m":"OKT","t":"Večerná smena","s":"kaviareň · 16:00 – 22:00","stitok":"potvrdené","typ":"smena"}],"odmeny":[]}$f$::jsonb)
on conflict (firma) do nothing;

-- ---------- 6 · Moje stránky ----------
create or replace function public.moje_stranky() returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nazov', s.nazov, 'typ', s.typ) order by s.nazov), '[]'::jsonb)
    from public.stranka s
   where public.moj_ucet() is not null
     and (s.ucet_id = public.moj_ucet()
          or exists (select 1 from public.statutar t where t.org_ucet_id = s.ucet_id and t.osoba_ucet_id = public.moj_ucet()));
$$;
revoke all on function public.moje_stranky() from public;
grant execute on function public.moje_stranky() to authenticated, service_role;

commit;
