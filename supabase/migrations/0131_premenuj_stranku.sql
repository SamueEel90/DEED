-- ============================================================
-- 0131 · OPRAVY 414 (charita) — nový názov stránky zo „upraviť (test)“ v Údajoch z registra
-- ------------------------------------------------------------
-- premenuj_stranku(stránka, názov): zapíše stranka.nazov (Moje stránky, Správa, verejný profil majú jeden názov).
-- Smie správca s plnými právami (plne_prava — vlastník, štatutár, farár) alebo pracovník charity s právom „nastavenia“ (0129).
-- Tabuľka stranka nemá politiku na update — zmena len cez túto funkciu.
-- ============================================================
begin;

create or replace function public.premenuj_stranku(p_stranka text, p_nazov text) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_n text := left(trim(coalesce(p_nazov, '')), 120);
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if v_n = '' then raise exception 'prazdne' using errcode = '22023'; end if;
  if not (coalesce(public.plne_prava(p_stranka), false)
          or (public.spravujem_stranku(p_stranka) and public.smie_v_stranke(p_stranka, 'nastavenia') and exists (select 1 from public.stranka where id = p_stranka and typ = 'charita'))) then
    raise exception 'nie_spravca' using errcode = '42501';
  end if;
  update public.stranka set nazov = v_n where id = p_stranka;
  if not found then raise exception 'stranka_neexistuje' using errcode = 'P0002'; end if;
end $$;
revoke all on function public.premenuj_stranku(text, text) from public, anon;
grant execute on function public.premenuj_stranku(text, text) to authenticated;

commit;
