-- ============================================================
-- 0117 · OPRAVY 375 — správa farára veriacemu pri úmysle naozaj príde
-- ------------------------------------------------------------
-- Doteraz „Poslať správu“ zapísalo text len k úmyslu, veriaci nedostal nič.
-- umysel_sprava(stránka, id, text) — len správca: uloží správu k úmyslu (sprava: { text, cas }) a autorovi
-- pošle upozornenie do zvončeka (+ push): „Správa od farnosti · {názov}“, text správy, odkaz um:<stránka>:<id>
-- (ťuk otvorí jeho úmysel). Úmysel zapísaný osobne (bez autora) upozornenie nedostane.
-- ============================================================
begin;

create or replace function public.umysel_sprava(p_stranka text, p_id text, p_text text) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
declare r public.odfarnikov_umysly; v_text text := left(nullif(trim(coalesce(p_text, '')), ''), 500); v_nazov text;
begin
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if v_text is null then raise exception 'prazdna_sprava' using errcode = '22023'; end if;
  select * into r from public.odfarnikov_umysly where stranka = p_stranka and id = p_id for update;
  if not found then raise exception 'umysel_neexistuje' using errcode = 'P0002'; end if;
  update public.odfarnikov_umysly
     set data = data || jsonb_build_object('sprava', jsonb_build_object('text', v_text, 'cas', (extract(epoch from now()) * 1000)::bigint)), upravene = now()
   where stranka = p_stranka and id = p_id;
  if r.autor is null then return false; end if;
  select nazov into v_nazov from public.stranka where id = p_stranka;
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
  values (r.autor, 'socialne', 'srd', left('Správa od farnosti · ' || coalesce(v_nazov, 'farnosť'), 200), v_text, 'um:' || p_stranka || ':' || p_id,
          exists (select 1 from public.push_odber p where p.ucet_id = r.autor));
  return true;
end $$;
revoke all on function public.umysel_sprava(text, text, text) from public, anon;
grant execute on function public.umysel_sprava(text, text, text) to authenticated;

commit;
