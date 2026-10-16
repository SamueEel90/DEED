-- ============================================================
-- 0100 · OPRAVY 320 — Vecná zbierka farnosti (zbierka vecí, bez peňazí a bez platobného modulu)
-- ------------------------------------------------------------
-- Zbierka samotná = prvok poľa v naboz_stav, oblasť „vecne“ (id = stránka), ako ostatný obsah stránky farnosti.
-- Dar = riadok vecny_dar: darca (účet, len prihlásený), meno podľa nastavenia darov, približná hodnota (len pre
--   informáciu, nič sa neplatí — žiadny pohyb peňazí, ledger sa nemení), čas.
-- vecny_dar_zapis(stránka, zbierka, meno, hodnota) — zapíše dar; zbierka musí existovať a bežať; hodnota len keď
--   farár hodnotu ukazuje (ukazHodnotu), inak sa uloží bez nej.
-- vecne_dary(stránka, zbierka) — verejný súhrn: počet darov, počet ľudí, hodnota spolu (len pri ukazHodnotu)
--   a posledných 200 darcov (meno, hodnota pri ukazHodnotu, čas). Účty darcov sa nikdy nevracajú.
-- ============================================================
begin;

create table if not exists public.vecny_dar (
  id         bigserial primary key,
  stranka    text not null,
  zbierka    text not null,
  ucet_id    uuid not null references public.ucet(id) on delete cascade,
  meno       text not null,
  hodnota    numeric(10,2),
  vytvorene  timestamptz not null default now(),
  constraint vecny_dar_meno_ok check (length(meno) between 1 and 120),
  constraint vecny_dar_hodnota_ok check (hodnota is null or (hodnota > 0 and hodnota <= 100000))
);
create index if not exists vecny_dar_zbierka on public.vecny_dar (stranka, zbierka, vytvorene desc);
alter table public.vecny_dar enable row level security;
drop policy if exists vecny_dar_moje on public.vecny_dar;
create policy vecny_dar_moje on public.vecny_dar for select to authenticated using (ucet_id = public.moj_ucet());
revoke all on public.vecny_dar from anon;
revoke insert, update, delete on public.vecny_dar from authenticated;
grant select on public.vecny_dar to authenticated;

-- zbierka z poľa „vecne“ stránky
create or replace function public.vecna_zbierka(p_stranka text, p_zbierka text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select x from public.naboz_stav s, jsonb_array_elements(case when jsonb_typeof(s.data) = 'array' then s.data else '[]'::jsonb end) x
  where s.oblast = 'vecne' and s.id = p_stranka and x->>'id' = p_zbierka limit 1
$$;

create or replace function public.vecny_dar_zapis(p_stranka text, p_zbierka text, p_meno text, p_hodnota numeric) returns bigint
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); z jsonb; v_id bigint; v_meno text := left(trim(coalesce(p_meno, '')), 120);
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  z := public.vecna_zbierka(p_stranka, p_zbierka);
  if z is null then raise exception 'zbierka_neexistuje' using errcode = 'P0002'; end if;
  if coalesce(z->>'stav', 'aktivna') <> 'aktivna' then raise exception 'zbierka_ukoncena' using errcode = '22023'; end if;
  if v_meno = '' then v_meno := 'Bohu známy veriaci'; end if;
  insert into public.vecny_dar (stranka, zbierka, ucet_id, meno, hodnota)
  values (p_stranka, p_zbierka, v_ja, v_meno,
          case when coalesce(z->>'ukazHodnotu', 'false') = 'true' and p_hodnota > 0 and p_hodnota <= 100000 then round(p_hodnota, 2) end)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.vecne_dary(p_stranka text, p_zbierka text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare z jsonb := public.vecna_zbierka(p_stranka, p_zbierka); v_ukaz boolean;
begin
  if z is null then return null; end if;
  v_ukaz := coalesce(z->>'ukazHodnotu', 'false') = 'true';
  return jsonb_build_object(
    'pocet', (select count(*) from public.vecny_dar d where d.stranka = p_stranka and d.zbierka = p_zbierka),
    'ludi', (select count(distinct d.ucet_id) from public.vecny_dar d where d.stranka = p_stranka and d.zbierka = p_zbierka),
    'spolu', case when v_ukaz then (select coalesce(sum(d.hodnota), 0) from public.vecny_dar d where d.stranka = p_stranka and d.zbierka = p_zbierka) end,
    'darcovia', (select coalesce(jsonb_agg(jsonb_build_object('meno', q.meno, 'hodnota', case when v_ukaz then q.hodnota end, 'cas', q.vytvorene) order by q.vytvorene desc, q.id desc), '[]'::jsonb)
                 from (select d.id, d.meno, d.hodnota, d.vytvorene from public.vecny_dar d where d.stranka = p_stranka and d.zbierka = p_zbierka order by d.vytvorene desc, d.id desc limit 200) q));
end $$;

revoke all on function public.vecna_zbierka(text, text), public.vecny_dar_zapis(text, text, text, numeric), public.vecne_dary(text, text) from public;
grant execute on function public.vecny_dar_zapis(text, text, text, numeric) to authenticated;
grant execute on function public.vecne_dary(text, text) to anon, authenticated;

commit;
