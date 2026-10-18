-- ============================================================
-- 0118 · OPRAVY 379 — rozdelenie zbierky (zbierka_podiel) nie je celé verejné
-- ------------------------------------------------------------
-- 0065 dala verejne_citat (using true): aj neprihlásený prečítal podiel overovateľa (farnosti), čo appka verejne neukazuje.
-- Teraz verejne len to, čo darca vidí: keď sa rodina podelila (riadok „podelene“), príjemca a podelené stránky s %.
-- Podiel overovateľa a rozdelenie bez podelenia číta len správca stránky zbierky a príjemca.
-- Serverové funkcie (security definer: zapečatenie, Moja zbierka, ukončenie, ledger) sa nemenia.
-- ============================================================
begin;

create or replace function public.zbierka_ma_podelene(p_zbierka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.zbierka_podiel p where p.zbierka = p_zbierka and p.druh = 'podelene')
$$;
-- správca stránky zbierky alebo jej príjemca
create or replace function public.zbierka_vidim_rozdelenie(p_zbierka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select public.moj_ucet() is not null and (
    exists (select 1 from public.zbierka z where z.id = p_zbierka and z.stranka is not null and public.spravujem_stranku(z.stranka))
    or exists (select 1 from public.zbierka_podiel p where p.zbierka = p_zbierka and p.druh = 'prijemca' and p.ucet = public.moj_ucet()))
$$;
revoke all on function public.zbierka_ma_podelene(text), public.zbierka_vidim_rozdelenie(text) from public;
grant execute on function public.zbierka_ma_podelene(text) to anon, authenticated;
grant execute on function public.zbierka_vidim_rozdelenie(text) to authenticated;

drop policy if exists verejne_citat on public.zbierka_podiel;
drop policy if exists podiel_citat_verejne on public.zbierka_podiel;
drop policy if exists podiel_citat_spravca on public.zbierka_podiel;
create policy podiel_citat_verejne on public.zbierka_podiel for select to anon, authenticated
  using (druh <> 'overovatel' and public.zbierka_ma_podelene(zbierka));
create policy podiel_citat_spravca on public.zbierka_podiel for select to authenticated
  using (ucet = public.moj_ucet() or public.zbierka_vidim_rozdelenie(zbierka));

commit;
