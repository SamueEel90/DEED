-- ============================================================
-- 0113 · OPRAVY 364 — zbierka s overovateľom: príjemca potvrdí rozdelenie bez kódu
-- ------------------------------------------------------------
-- Príjemca je prihlásený vo svojej appke, kód bol zbytočný a ľudia ho nevedeli nájsť (bol v zvončeku).
--   ovp_kod(id, rozdelenie)  — farár „Poslať na potvrdenie“: otvorí okno na potvrdenie 5 min (kod_do), kód sa už netvorí.
--                              Upozornenie do zvončeka ostáva (ťuk otvorí obrazovku potvrdenia), bez kódu.
--   ovp_suhlas(lístok)        — príjemca podrží a potvrdí; len prijemca = moj_ucet a okno platí, inak okno_vyprsalo.
--   ovp_suhlas(lístok, kód)   — staré volanie (appka pred aktualizáciou): kód sa ignoruje, ide tým istým overením.
--   ovp_nahlad                — navyše 'caka' (okno platí) a 'vyprsalo' (okno skončilo bez potvrdenia).
-- Tabuľka sa nemení (stĺpec kod ostáva prázdny).
-- ============================================================
begin;

create or replace function public.ovp_kod(p_id uuid, p_rozdelenie text) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare o public.overenie_prijemcu; v_nazov text;
begin
  select * into o from public.overenie_prijemcu where id = p_id for update;
  if not found or not public.spravujem_stranku(o.stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if o.prijemca is null then raise exception 'bez_prijemcu' using errcode = 'P0002'; end if;
  if o.zbierka is not null then raise exception 'uz_pouzite' using errcode = '23505'; end if;
  update public.overenie_prijemcu set kod = null, kod_do = now() + interval '5 minutes', suhlas = null,
    rozdelenie = left(nullif(trim(coalesce(p_rozdelenie, '')), ''), 400), listok_do = greatest(listok_do, now() + interval '15 minutes')
    where id = p_id;
  select nazov into v_nazov from public.stranka where id = o.stranka;
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    values (o.prijemca, 'socialne', 'srd', left('Potvrďte rozdelenie zbierky · ' || coalesce(v_nazov, 'farnosť'), 200),
      'Ťuknite a podržaním potvrďte rozdelenie zbierky. Platí 5 minút.', 'ovp:' || o.stranka || ':' || o.listok,
      exists (select 1 from public.push_odber p where p.ucet_id = o.prijemca));
end $$;

create or replace function public.ovp_suhlas(p_listok text) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare o public.overenie_prijemcu; v_ja uuid := public.moj_ucet();
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select * into o from public.overenie_prijemcu where listok = p_listok and prijemca = v_ja for update;
  if not found then raise exception 'kod_neplati' using errcode = 'P0002'; end if;
  if o.suhlas is not null then return; end if;
  if o.kod_do is null or o.kod_do <= now() then raise exception 'okno_vyprsalo' using errcode = '22023'; end if;
  update public.overenie_prijemcu set suhlas = now() where id = o.id;
end $$;

create or replace function public.ovp_suhlas(p_listok text, p_kod text) returns void
  language sql volatile security definer set search_path = public as $$
  select public.ovp_suhlas(p_listok)
$$;

create or replace function public.ovp_nahlad(p_listok text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare o public.overenie_prijemcu; v_ja uuid := public.moj_ucet(); v_moj boolean;
begin
  select * into o from public.overenie_prijemcu where listok = p_listok;
  if not found or not (o.listok_do > now() or (v_ja is not null and o.prijemca = v_ja)) then
    raise exception 'kod_neplati' using errcode = 'P0002';
  end if;
  v_moj := v_ja is not null and o.prijemca = v_ja;
  return jsonb_build_object(
    'stranka', o.stranka, 'nazov', (select nazov from public.stranka where id = o.stranka), 'druh', o.druh,
    'potvrdene', o.potvrdene is not null, 'ja', v_moj, 'iny', o.prijemca is not null and o.prijemca is distinct from v_ja,
    'caka', v_moj and coalesce(o.kod_do > now(), false) and o.suhlas is null,
    'kod_caka', v_moj and coalesce(o.kod_do > now(), false) and o.suhlas is null,
    'vyprsalo', v_moj and o.kod_do is not null and o.kod_do <= now() and o.suhlas is null,
    'rozdelenie', case when v_moj then o.rozdelenie end,
    'suhlas', o.suhlas is not null, 'zbierka', o.zbierka);
end $$;

revoke all on function public.ovp_suhlas(text) from public, anon;
revoke all on function public.ovp_suhlas(text, text) from public, anon;
grant execute on function public.ovp_suhlas(text), public.ovp_suhlas(text, text) to authenticated;

commit;
