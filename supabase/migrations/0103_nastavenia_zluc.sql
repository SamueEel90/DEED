-- ============================================================
-- 0103 · OPRAVY 336 — nastavenia stránky sa ukladajú po kľúčoch, nie celé naraz
-- Nastavenia stránky (0050) sú jeden jsonb { "<kľúč>": hodnota } — Ľudia (farár „duch“, „ludia“),
-- Upozornenia, Nastavenia charity… Appka doteraz zapisovala CELÝ objekt. Zariadenie so starou alebo
-- ešte nenačítanou kópiou tak prepísalo kľúče, ktoré nemenilo (farár v Ľuďoch zmizol).
-- nastavenia_zapis(stránka, {kľúč: hodnota, …}) zlúči len poslané kľúče do uloženého objektu, ostatné nechá.
-- Práva ako 0050: len správca stránky (security invoker → RLS spravca_pisat / spravca_upravit).
-- Spúšťa sa po 0102.
-- ============================================================
begin;

create or replace function public.nastavenia_zapis(p_stranka text, p_data jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'zle_data' using errcode = '22023'; end if;
  insert into public.nastavenia_stranky as n (stranka, data) values (p_stranka, p_data)
  on conflict (stranka) do update set data = n.data || excluded.data;
end;
$$;
revoke all on function public.nastavenia_zapis(text, jsonb) from public;
grant execute on function public.nastavenia_zapis(text, jsonb) to authenticated, service_role;

commit;
