-- ============================================================
-- 0084 · OPRAVY 234 + odpovede k Bloku A (Martin 13. 10.)
-- 1. Meno darcu: pri platbe darca vyberie „Meno z profilu“ alebo „Bez mena“. platba_zobrazenie (0061) dá bez voľby
--    zobrazenie 4 (bez mena) a meno zmaže — preto meno a zobrazenie zapíše až tento obal po vzniku platby.
--    Bez prihlásenia meno nikdy (neregistrovaný je vždy bez mena).
-- 2. Platba naoko v testovacom režime (TESTOVACIA): p_test = true → dar sa zapíše do zbierky ako testovací
--    (pohyby testovaci = true, platba meta.testovaci = true). Len kým je zapnutá testovacia pokladňa.
--    Pohyb je nemenný, príznak sa preto nastaví pri vložení (trigger číta premennú transakcie deed.testovaci).
-- Appka volá zbierka_dar_volba namiesto zbierka_dar (zbierka_dar ostáva, telo daru je jej).
-- ============================================================
begin;

create or replace function public.pohyb_testovaci() returns trigger
  language plpgsql as $$
begin
  if coalesce(current_setting('deed.testovaci', true), '') = '1' then new.testovaci := true; end if;
  return new;
end $$;
drop trigger if exists pohyb_testovaci on public.pohyb;
create trigger pohyb_testovaci before insert on public.pohyb
  for each row execute function public.pohyb_testovaci();

create or replace function public.zbierka_dar_volba(p_zbierka text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_meno_darcu text default null, p_stranka text default null, p_nazov text default null, p_zdroj text default null, p_test boolean default false)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_r jsonb; v_ja uuid := public.moj_ucet(); v_meno text := nullif(left(trim(coalesce(p_meno_darcu, '')), 80), '');
begin
  if p_test then
    if not coalesce((select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna'), false) then
      raise exception 'Testovacia platba je vypnutá.' using errcode = '42501', detail = 'test_vypnuty';
    end if;
    perform set_config('deed.testovaci', '1', true);
  end if;
  v_r := public.zbierka_dar(p_zbierka, p_idem, p_suma, p_mena, p_kanal, null, p_stranka, p_nazov, p_zdroj);
  perform set_config('deed.testovaci', '0', true);
  update public.platba
     set odosielatel_text = case when v_ja is not null and odosielatel = v_ja then v_meno else null end,
         zobrazenie = case when v_ja is not null and odosielatel = v_ja and v_meno is not null then 1 else 4 end,
         meta = case when p_test then coalesce(meta, '{}'::jsonb) || jsonb_build_object('testovaci', true) else meta end
   where id = (v_r->>'platba_id')::uuid;
  return v_r || jsonb_build_object('testovaci', p_test);
end $$;
revoke all on function public.zbierka_dar_volba(text,text,numeric,text,text,text,text,text,text,boolean) from public;
grant execute on function public.zbierka_dar_volba(text,text,numeric,text,text,text,text,text,text,boolean) to anon, authenticated, service_role;

commit;
