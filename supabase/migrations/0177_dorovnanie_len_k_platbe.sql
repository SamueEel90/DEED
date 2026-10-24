-- ============================================================
-- 0177 · Kontrola 24. 10. · N1 — dorovnanie firmy vzniká LEN k potvrdenej platbe (server), nikdy na zavolanie z appky
-- ------------------------------------------------------------
-- Doteraz: rpc dorovnanie_dar(ciel, dar, …) mohol zavolať ktokoľvek (aj anonym) s ľubovoľnou sumou a bez platby.
-- Opakovaným volaním sa dal vyčerpať celý rozpočet firmy do zbierky — peniaze firmy tiekli bez daru.
-- Teraz:
--   1. dorovnanie_k_platbe(platba): dorovnanie vzniká zo settled platby na zbierku (platba.zbierka), idem = platba.id
--      (jedna platba = najviac jedno dorovnanie). Pravidlá 1 : 1 z dorovnanie_dar (0046): bežiace dorovnanie na cieli,
--      tvorcovské má prednosť (reťaz = platba.meta.retaz), len_zamestnanci podľa darcu platby, pomer, strop daru,
--      zostatok, vyčerpanie. Dar v DeeD sa prepočíta kurzom zo server_konfig (100 DeeD = 1 €, Martin 20. 10.).
--      Preskočí: dar od firmy (účet typu firma — dorovnanie by dorovnávalo samo seba), stránku farnosti
--      (Viera je samostatný svet, lib/darcovia.ts), platbu bez zbierky.
--   2. Spúšťa ho spúšťač na platbe (po 0176: pri zmene stavu na settled a pri priradení zbierky) — testovacia
--      verzia (potvrdené hneď) aj ostrý režim (potvrdené rúrou) idú tou istou cestou.
--   3. dorovnanie_dar z appky: už nič nezapisuje. Ostáva len na ČÍTANIE — vráti, čo server k poslednej
--      platbe volajúceho na tento cieľ zapísal (appka ukáže „firma pridala"). Anonym (bez účtu) dostane 0.
-- Spúšťa sa po 0176. Idempotentné.
-- ============================================================
begin;

-- ---------- 0 · kurz DeeD ↔ € na serveri (jedna hodnota, tá istá ako v appke: lib/kurz.ts) ----------
create table if not exists public.server_konfig (
  kluc     text primary key,
  hodnota  numeric not null,
  popis    text
);
alter table public.server_konfig enable row level security;
drop policy if exists citaj on public.server_konfig;
create policy citaj on public.server_konfig for select to anon, authenticated using (true);
insert into public.server_konfig (kluc, hodnota, popis) values ('kurz_deed_za_eur', 100, '100 DeeD = 1 € (Martin 20. 10. 2026; appka: lib/kurz.ts)')
  on conflict (kluc) do nothing;

-- ---------- 1 · dorovnanie k potvrdenej platbe (server) ----------
create or replace function public.dorovnanie_k_platbe(p_platba uuid) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare
  pl public.platba; d public.dorovnanie; v_dar numeric; v_suma numeric; v_pohyb bigint; v_kurz numeric;
  v_darca uuid; v_cez_tvorcu text; v_typ_darcu text; v_typ_stranky text;
begin
  select * into pl from public.platba where id = p_platba;
  if not found or pl.stav <> 'settled' or pl.zbierka is null then return jsonb_build_object('dorovnane', 0); end if;
  -- jedna platba = najviac jedno dorovnanie
  if exists (select 1 from public.dorovnanie_zaznam z where z.idem = pl.id::text) then
    return (select jsonb_build_object('dorovnane', z.dorovnane, 'firma', x.firma_nazov, 'id', x.id)
              from public.dorovnanie_zaznam z join public.dorovnanie x on x.id = z.dorovnanie_id where z.idem = pl.id::text limit 1);
  end if;
  v_darca := pl.odosielatel;
  -- dar od firmy sa nedorovnáva (inak by dorovnanie dorovnávalo samo seba)
  if v_darca is not null then
    select typ into v_typ_darcu from public.ucet where id = v_darca;
    if v_typ_darcu = 'firma' then return jsonb_build_object('dorovnane', 0); end if;
  end if;
  -- Viera je samostatný svet: zbierky farnosti firmy nedorovnávajú
  select s.typ into v_typ_stranky from public.zbierka z join public.stranka s on s.id = z.stranka where z.id = pl.zbierka;
  if v_typ_stranky = 'farnost' then return jsonb_build_object('dorovnane', 0); end if;
  -- suma daru v € (DeeD kurzom)
  if pl.mena = 'EUR' then v_dar := pl.suma;
  else
    select hodnota into v_kurz from public.server_konfig where kluc = 'kurz_deed_za_eur';
    v_dar := round(pl.suma / coalesce(v_kurz, 100), 2);
  end if;
  if coalesce(v_dar, 0) <= 0 then return jsonb_build_object('dorovnane', 0); end if;
  v_cez_tvorcu := pl.meta->>'retaz';

  perform public.dorovnania_obnov();
  -- tvorcovské má prednosť (firma platí za dosah toho tvorcu), potom verejné — 1 : 1 z dorovnanie_dar (0046)
  select * into d from public.dorovnanie x
   where x.ciel = pl.zbierka and public.dorovnanie_bezi(x)
     and ((v_cez_tvorcu is not null and x.len_tvorca = v_cez_tvorcu) or x.len_tvorca is null)
   order by (x.len_tvorca is not null) desc, x.zapecatene
   limit 1 for update;
  if not found then return jsonb_build_object('dorovnane', 0); end if;
  if d.len_zamestnanci and (v_darca is null or not public.je_zamestnanec(d.firma_ucet, v_darca)) then return jsonb_build_object('dorovnane', 0); end if;
  v_suma := least(round(v_dar * d.pomer, 2), coalesce(d.strop_daru, 1e12), public.dorovnanie_zostatok(d.id));
  if v_suma <= 0 then return jsonb_build_object('dorovnane', 0); end if;
  v_pohyb := public.dorovnanie_presun(d.id, v_suma, false);
  insert into public.dorovnanie_zaznam (dorovnanie_id, dar, dorovnane, darca, darca_ucet, pohyb_id, idem)
    values (d.id, round(v_dar, 2), v_suma, nullif(trim(pl.odosielatel_text), ''), v_darca, v_pohyb, pl.id::text);
  if public.dorovnanie_zostatok(d.id) <= 0 then
    update public.dorovnanie set stav = 'vycerpane', ukoncene = now() where id = d.id;
  end if;
  return jsonb_build_object('dorovnane', v_suma, 'firma', d.firma_nazov, 'id', d.id);
end $$;
revoke all on function public.dorovnanie_k_platbe(uuid) from public, anon, authenticated;
grant execute on function public.dorovnanie_k_platbe(uuid) to service_role;

-- ---------- 2 · spúšťač: settled platba so zbierkou → dorovnanie (raz) ----------
create or replace function public.platba_dorovnaj() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.stav = 'settled' and new.zbierka is not null then perform public.dorovnanie_k_platbe(new.id); end if;
  return null;
end $$;
revoke all on function public.platba_dorovnaj() from public;
drop trigger if exists platba_dorovnaj on public.platba;
create trigger platba_dorovnaj after insert or update of zbierka, stav on public.platba
  for each row execute function public.platba_dorovnaj();

-- ---------- 3 · dorovnanie_dar z appky = len čítanie toho, čo server zapísal ----------
create or replace function public.dorovnanie_dar(p_ciel text, p_dar numeric, p_cez_tvorcu text default null, p_idem text default null, p_darca text default null)
  returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); r record;
begin
  if v_ja is null then return jsonb_build_object('dorovnane', 0); end if;
  select z.dorovnane, d.firma_nazov, d.id into r
    from public.platba pl
    join public.dorovnanie_zaznam z on z.idem = pl.id::text
    join public.dorovnanie d on d.id = z.dorovnanie_id
   where pl.odosielatel = v_ja and (pl.zbierka = p_ciel or d.ciel = p_ciel) and pl.cas > now() - interval '10 minutes'
   order by pl.cas desc limit 1;
  if not found then return jsonb_build_object('dorovnane', 0); end if;
  return jsonb_build_object('dorovnane', r.dorovnane, 'firma', r.firma_nazov, 'id', r.id);
end $$;
-- práva ostávajú (anon, authenticated) — funkcia už nič nezapisuje

commit;
