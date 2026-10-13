-- ============================================================
-- 0080 · OPRAVY 222 — farnosť prispeje na cudziu zbierku (ako organizácia v module charity, Prispievatelia).
-- 1. platba.darca_stranka: dar poslala stránka (farnosť), nie človek. Pohyb je bežný dar cez zbierka_dar
--    (SEPA alebo karta farnosti), meno darcu = názov farnosti.
-- 2. zbierka_dar_farnosti(): zapíše dar len správca tej farnosti a len na cudziu zbierku (aj zbierku rodiny na jej stránke); telo daru = zbierka_dar 1 : 1.
--    Kto smie (len farár, nie kaplán ani správca), zatiaľ stráži appka — role v Ľudia server ešte nepozná (karta 61 §1).
-- 3. stranka_prispela(): čím farnosť prispela (Zbierky farnosti „Prispeli sme" a Peňaženka → Výpisy).
-- 4. zbierka_prispievatelia(): ktoré stránky prispeli na zbierku a koľko (pás a riadok v module).
--    Pri zbierke rodiny bez súm (len „Prispela aj Farnosť …").
-- ============================================================
begin;

alter table public.platba add column if not exists darca_stranka text references public.stranka (id) on delete set null;
create index if not exists platba_darca_stranka_idx on public.platba (darca_stranka) where darca_stranka is not null;

create or replace function public.zbierka_dar_farnosti(p_zbierka text, p_idem text, p_suma numeric, p_mena text, p_kanal text, p_farnost text)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ja uuid := public.moj_ucet(); v_s public.stranka; v_z public.zbierka; v_r jsonb;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_kanal not in ('fiat', 'sepa') then
    raise exception 'Farnosť prispieva prevodom alebo kartou.' using errcode = '22023', detail = 'zly_kanal';
  end if;
  select * into v_s from public.stranka where id = p_farnost;
  if not found or v_s.typ <> 'farnost' then
    raise exception 'Stránka nie je farnosť.' using errcode = '22023', detail = 'nie_farnost';
  end if;
  if not public.spravujem_stranku(p_farnost) then
    raise exception 'Za farnosť môže prispieť len jej správa.' using errcode = '42501', detail = 'nie_spravca';
  end if;
  select * into v_z from public.zbierka where id = p_zbierka;
  -- vlastná zbierka farnosti (peniaze by sa vrátili farnosti); zbierka rodiny s príjemcom je cudzia
  if found and v_z.stranka = p_farnost and not exists (select 1 from public.zbierka_podiel where zbierka = p_zbierka and druh = 'prijemca') then
    raise exception 'Na vlastnú zbierku farnosť neprispieva.' using errcode = '22023', detail = 'vlastna_zbierka';
  end if;
  v_r := public.zbierka_dar(p_zbierka, p_idem, p_suma, p_mena, p_kanal, v_s.nazov, null, null, null);
  update public.platba set darca_stranka = p_farnost where id = (v_r->>'platba_id')::uuid and darca_stranka is null;
  return v_r || jsonb_build_object('farnost', p_farnost);
end $$;
revoke all on function public.zbierka_dar_farnosti(text,text,numeric,text,text,text) from public;
grant execute on function public.zbierka_dar_farnosti(text,text,numeric,text,text,text) to authenticated, service_role;

create or replace function public.stranka_prispela(p_stranka text, p_limit int default 50) returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'cas' desc), '[]'::jsonb) from (
    select jsonb_build_object('platba', pl.id, 'zbierka', pl.zbierka, 'nazov', z.nazov, 'kto', coalesce(s.nazov, z.nazov),
             'suma', pl.suma, 'mena', pl.mena, 'kanal', pl.kanal, 'cas', pl.cas, 'vs', pl.verejne_cislo,
             'rodina', coalesce(z.nastavenie->'farnost'->>'druh', '') in ('pohreb', 'svadba', 'ine')) as x
      from public.platba pl join public.zbierka z on z.id = pl.zbierka left join public.stranka s on s.id = z.stranka
     where pl.darca_stranka = p_stranka and pl.stav not in ('failed', 'refunded') and exists (select 1 from public.pohyb po where po.platba_id = pl.id)
     order by pl.cas desc limit greatest(1, least(p_limit, 200))) t;
$$;
revoke all on function public.stranka_prispela(text,int) from public;
grant execute on function public.stranka_prispela(text,int) to anon, authenticated, service_role;

create or replace function public.zbierka_prispievatelia(p_zbierka text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('stranka', t.stranka, 'meno', t.meno,
           'suma', case when t.rodina then null else t.suma end) order by t.suma desc), '[]'::jsonb)
    from (select pl.darca_stranka as stranka, s.nazov as meno, sum(pl.suma) as suma,
                 coalesce(z.nastavenie->'farnost'->>'druh', '') in ('pohreb', 'svadba', 'ine') as rodina
            from public.platba pl join public.stranka s on s.id = pl.darca_stranka join public.zbierka z on z.id = pl.zbierka
           where pl.zbierka = p_zbierka and pl.darca_stranka is not null and pl.mena = 'EUR' and pl.stav not in ('failed', 'refunded') and exists (select 1 from public.pohyb po where po.platba_id = pl.id)
           group by pl.darca_stranka, s.nazov, z.nastavenie) t;
$$;
revoke all on function public.zbierka_prispievatelia(text) from public;
grant execute on function public.zbierka_prispievatelia(text) to anon, authenticated, service_role;

commit;
