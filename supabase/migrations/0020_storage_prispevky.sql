-- ============================================================
-- DEED · Storage — bucket na fotky príspevkov  [Fáza 5]
-- ------------------------------------------------------------
-- Verejný bucket `prispevky` (obsah je verejný). Čítanie: ktokoľvek.
-- Zápis/úprava/mazanie: len prihlásený (aj anonymné konto) do priečinka
-- pomenovaného svojím auth.uid() → `<auth.uid()>/<súbor>`. Owner-only.
-- Idempotentné (on conflict / drop policy if exists).
-- ============================================================

insert into storage.buckets (id, name, public)
  values ('prispevky', 'prispevky', true)
  on conflict (id) do nothing;

do $$
begin
  -- čítanie: verejné (fotky príspevkov vidno vo feede)
  drop policy if exists prispevky_read on storage.objects;
  create policy prispevky_read on storage.objects
    for select to public
    using (bucket_id = 'prispevky');

  -- nahrávanie: prihlásený do SVOJHO priečinka (prvý segment cesty = auth.uid())
  drop policy if exists prispevky_write on storage.objects;
  create policy prispevky_write on storage.objects
    for insert to authenticated
    with check (bucket_id = 'prispevky' and (storage.foldername(name))[1] = auth.uid()::text);

  -- úprava vlastných
  drop policy if exists prispevky_update on storage.objects;
  create policy prispevky_update on storage.objects
    for update to authenticated
    using (bucket_id = 'prispevky' and (storage.foldername(name))[1] = auth.uid()::text);

  -- mazanie vlastných
  drop policy if exists prispevky_delete on storage.objects;
  create policy prispevky_delete on storage.objects
    for delete to authenticated
    using (bucket_id = 'prispevky' and (storage.foldername(name))[1] = auth.uid()::text);
end $$;
