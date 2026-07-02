-- ============================================================
-- DEED · QR Split — zoznam mojich QR aj podľa owner_text (demo)   [Fáza 6]
-- ------------------------------------------------------------
-- Demo identita nemá auth ucet_id (ako „Čo podporujem" číta podľa mena) →
-- qr_split_list filtruje podľa owner_ucet_id (reálny účet) ALEBO owner_text (demo).
-- ============================================================
drop function if exists public.qr_split_list(uuid);
create or replace function public.qr_split_list(p_owner uuid, p_owner_text text default null)
returns jsonb
language sql stable security definer set search_path = public, extensions as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'slug', q.slug, 'zdroj', q.zdroj, 'mena', q.mena,
      'owner_podiel', q.owner_podiel, 'case_id', q.case_id, 'vytvorene', q.vytvorene,
      'titul', (select coalesce(p.titul, p.autor_nazov, 'Prispevok') from public.prispevok p where p.id = q.case_id),
      'emoji', (select p.emoji from public.prispevok p where p.id = q.case_id),
      'org_odoslane', (select coalesce(t.org_total,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'owner_odoslane', (select coalesce(t.owner_total,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'pocet', (select coalesce(t.pocet,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'ciele', (select coalesce(jsonb_agg(jsonb_build_object('prijemca_text', c.prijemca_text, 'podiel', c.podiel) order by c.id), '[]'::jsonb)
                from public.qr_split_ciel c where c.qr_split_id = q.id)
    ) order by q.vytvorene desc), '[]'::jsonb)
  from public.qr_split q
  where (p_owner is not null and q.owner_ucet_id = p_owner)
     or (p_owner is null and p_owner_text is not null and q.owner_text = p_owner_text);
$fn$;
grant execute on function public.qr_split_list(uuid, text) to anon, authenticated;
